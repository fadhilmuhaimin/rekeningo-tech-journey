package pembayaran_test

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"

	"lab/apit4/internal/gateway"
	"lab/apit4/internal/handler"
	"lab/apit4/internal/modul/ledger"
	"lab/apit4/internal/modul/pembayaran"
	"lab/apit4/internal/repo"
	"lab/apit4/internal/service"
)

// Tes modul pembayaran (ADR 37, lab t4-modul) dengan PostgreSQL sungguhan dan API ledger sungguhan (server
// httptest di atas service.Service): webhook dan job cek status bertemu di Idempotency-Key = order_id, dan proses
// yang mati di antara ledger dan transaction pembayaran pulih lewat kiriman ulang. Kematian proses sungguhan
// (SIGKILL) direkam lab t4-modul; tes ini menyuntikkan panic di titik yang sama.

const (
	rahasiaTes  = "rahasia-pembayaran-tes"
	kunciLedger = "kunci-layanan-pembayaran-tes"
)

// pengkreditHitung meneruskan ke ledger.Klien dan menghitung panggilannya.
type pengkreditHitung struct {
	dalam *ledger.Klien
	n     atomic.Int32
}

func (p *pengkreditHitung) KreditTopup(ctx context.Context, kunci string, r ledger.Permintaan) (ledger.Hasil, error) {
	p.n.Add(1)
	return p.dalam.KreditTopup(ctx, kunci, r)
}

// gwStub: gateway tiruan di dalam tes.
type gwStub struct {
	mu    sync.Mutex
	order map[string]gateway.Order
	galat error
	dicek int
}

func (g *gwStub) BuatOrder(_ context.Context, id string, jumlah int64, _ time.Time) (gateway.Order, error) {
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.galat != nil {
		return gateway.Order{}, g.galat
	}
	o := gateway.Order{OrderID: id, Jumlah: jumlah, Status: "pending", TujuanBayar: "88000"}
	g.order[id] = o
	return o, nil
}

func (g *gwStub) Status(_ context.Context, id string) (gateway.Order, error) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.dicek++
	o, ok := g.order[id]
	if !ok {
		return gateway.Order{}, gateway.ErrTidakAda
	}
	return o, nil
}

func (g *gwStub) bayar(id string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	o := g.order[id]
	o.Status = "settlement"
	g.order[id] = o
}

type lingkungan struct {
	db     *sql.DB
	p      *pembayaran.Service
	ledger *pengkreditHitung
	gw     *gwStub
	svc    service.Service
	srv    *httptest.Server
}

func siapkan(t *testing.T) *lingkungan {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		if os.Getenv("TES_DB_WAJIB") == "1" {
			t.Fatal("TES_DB_WAJIB=1 tetapi TEST_DATABASE_URL kosong")
		}
		t.Skip("TEST_DATABASE_URL kosong: tes ini butuh PostgreSQL")
	}
	db, err := sql.Open("pgx", url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	var nama, schema string
	db.QueryRow("SELECT current_database(), coalesce(current_schema(), '')").Scan(&nama, &schema)
	if want := os.Getenv("LAB_TES_SCHEMA"); nama != "lab" || (want != "" && schema != want) || (want == "" && schema != "tahap4_tes") {
		t.Fatalf("%s/%s bukan database tes", nama, schema)
	}
	svc := service.Baru(repo.Baru(db), time.Hour)
	mux := http.NewServeMux()
	handler.PasangLedger(mux, svc, kunciLedger)
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	l := &pengkreditHitung{dalam: ledger.Baru(srv.URL, kunciLedger, 3*time.Second)}
	gw := &gwStub{order: map[string]gateway.Order{}}
	return &lingkungan{db: db, ledger: l, gw: gw, svc: svc, srv: srv,
		p: &pembayaran.Service{DB: db, Ledger: l, Gateway: gw, Rahasia: []string{rahasiaTes}}}
}

func (l *lingkungan) akun(t *testing.T, tingkat string) int64 {
	t.Helper()
	var id int64
	l.db.QueryRow(`SELECT greatest(coalesce(max(id), 0), 300000) + 1 FROM akun`).Scan(&id)
	if _, err := l.db.Exec(`INSERT INTO akun (id, jenis, nama, email, password_hash, nomor_karyawan, tingkat) VALUES ($1, 'karyawan', $2, $3, '!', $4, $5)`,
		id, fmt.Sprintf("Bayar %d", id), fmt.Sprintf("bayar%d@lestari.example", id), fmt.Sprintf("P%d", id), tingkat); err != nil {
		t.Fatal(err)
	}
	if _, err := l.db.Exec(`INSERT INTO buku (akun_id, jenis, batas_harian) VALUES ($1, 'karyawan', 500000)`, id); err != nil {
		t.Fatal(err)
	}
	return id
}

var urut atomic.Int64

// topup membuat satu top-up lewat BuatTopup (gateway tiruan menerima order-nya).
func (l *lingkungan) topup(t *testing.T, akun, jumlah int64) string {
	t.Helper()
	order := fmt.Sprintf("TB-m%d-%d", time.Now().UnixNano(), urut.Add(1))
	if _, err := l.p.BuatTopup(t.Context(), order, akun, jumlah); err != nil {
		t.Fatal(err)
	}
	return order
}

func (l *lingkungan) kirim(event, order, status string, jumlah int64) (pembayaran.Hasil, error) {
	body, _ := json.Marshal(map[string]any{"event_id": event, "order_id": order, "status": status, "jumlah": jumlah})
	ts := time.Now().Unix()
	return l.p.TerimaWebhook(context.Background(), body, fmt.Sprint(ts), pembayaran.TandaTangan(rahasiaTes, ts, body))
}

func (l *lingkungan) jurnal(t *testing.T, order string) int {
	t.Helper()
	var n int
	l.db.QueryRow(`SELECT count(*) FROM jurnal WHERE jenis = 'topup_bank' AND keterangan = $1`, "Top-up bank "+order).Scan(&n)
	return n
}

func (l *lingkungan) saldo(t *testing.T, akun int64) int64 {
	t.Helper()
	var s int64
	l.db.QueryRow(`SELECT saldo_cache FROM buku WHERE akun_id = $1`, akun).Scan(&s)
	return s
}

func (l *lingkungan) status(t *testing.T, order string) string {
	t.Helper()
	tp, err := l.p.Topup(t.Context(), order)
	if err != nil {
		t.Fatal(err)
	}
	return tp.Status
}

func (l *lingkungan) event(t *testing.T, id string) (hasil string, ada bool) {
	t.Helper()
	err := l.db.QueryRow(`SELECT hasil FROM webhook_event WHERE event_id = $1`, id).Scan(&hasil)
	return hasil, err == nil
}

func event(l *lingkungan) string { return fmt.Sprintf("evt-%d", time.Now().UnixNano()+urut.Add(1)) }

// matiDi menjalankan f dengan titik gagal "sesudah-ledger" yang mengirim panic, lalu memulihkan panic itu: proses
// dianggap mati di titik itu (tanpa melanjutkan ke transaction pembayaran). Mengembalikan true bila titik tercapai.
func (l *lingkungan) matiDi(f func()) (mati bool) {
	l.p.TitikGagal = func(titik string) {
		if titik == "sesudah-ledger" {
			panic("proses mati")
		}
	}
	defer func() {
		l.p.TitikGagal = nil
		if r := recover(); r != nil {
			mati = true
		}
	}()
	f()
	return false
}

func TestWebhookSettlementSatuJurnalWalauDuaKiriman(t *testing.T) {
	l := siapkan(t)
	a := l.akun(t, "terverifikasi")
	order := l.topup(t, a, 200_000)
	e := event(l)
	h1, err := l.kirim(e, order, "settlement", 200_000)
	if err != nil || h1.Hasil != "diproses" || h1.Jurnal == nil {
		t.Fatalf("kiriman pertama: %+v, %v", h1, err)
	}
	if hasil, ada := l.event(t, e); !ada || hasil != "diproses" {
		t.Fatalf("event sesudah kiriman pertama: %q ada=%v, ingin diproses", hasil, ada)
	}
	h2, err := l.kirim(e, order, "settlement", 200_000)
	if err != nil || h2.Hasil != "ganda" {
		t.Fatalf("event yang sama lagi: %+v, %v; ingin ganda", h2, err)
	}
	if hasil, _ := l.event(t, e); hasil != "diproses" {
		t.Fatalf("event sesudah kiriman kedua: %q, ingin tetap diproses (kiriman ganda tidak menimpa catatannya)", hasil)
	}
	if l.jurnal(t, order) != 1 || l.saldo(t, a) != 200_000 || l.status(t, order) != "dibayar" {
		t.Fatalf("jurnal %d, saldo %d, status %s", l.jurnal(t, order), l.saldo(t, a), l.status(t, order))
	}
}

func TestWebhookDuaEventSatuKejadianSatuJurnal(t *testing.T) {
	l := siapkan(t)
	a := l.akun(t, "terverifikasi")
	order := l.topup(t, a, 100_000)
	if _, err := l.kirim(event(l), order, "settlement", 100_000); err != nil {
		t.Fatal(err)
	}
	panggilan := l.ledger.n.Load()
	h, err := l.kirim(event(l), order, "settlement", 100_000)
	if err != nil || h.Hasil != "ganda" {
		t.Fatalf("event berbeda untuk kejadian yang sama: %+v, %v", h, err)
	}
	if l.jurnal(t, order) != 1 || l.ledger.n.Load() != panggilan {
		t.Fatalf("jurnal %d, panggilan ke ledger %d -> %d: status dibayar menahan sebelum ledger dipanggil", l.jurnal(t, order), panggilan, l.ledger.n.Load())
	}
}

func TestWebhookSerentakEventSamaDanBeda(t *testing.T) {
	l := siapkan(t)
	a := l.akun(t, "terverifikasi")
	order := l.topup(t, a, 100_000)
	e := event(l)
	var wg sync.WaitGroup
	for i := 0; i < 6; i++ {
		ev := e
		if i%2 == 1 {
			ev = event(l) // event berbeda untuk kejadian yang sama
		}
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := l.kirim(ev, order, "settlement", 100_000); err != nil {
				t.Errorf("kiriman serentak: %v", err)
			}
		}()
	}
	wg.Wait()
	if l.jurnal(t, order) != 1 || l.saldo(t, a) != 100_000 || l.status(t, order) != "dibayar" {
		t.Fatalf("jurnal %d, saldo %d, status %s", l.jurnal(t, order), l.saldo(t, a), l.status(t, order))
	}
}

// Proses mati sesudah ledger menjurnal dan sebelum transaction pembayaran: kiriman ulang menghasilkan satu jurnal.
func TestMatiSesudahLedgerLaluKirimUlangSatuJurnal(t *testing.T) {
	l := siapkan(t)
	a := l.akun(t, "terverifikasi")
	order := l.topup(t, a, 200_000)
	e := event(l)
	if !l.matiDi(func() { l.kirim(e, order, "settlement", 200_000) }) {
		t.Fatal("titik gagal tidak tercapai")
	}
	if l.jurnal(t, order) != 1 || l.saldo(t, a) != 200_000 {
		t.Fatalf("sesudah mati: jurnal %d, saldo %d, ingin 1 dan 200000 (ledger sudah menjurnal)", l.jurnal(t, order), l.saldo(t, a))
	}
	if s := l.status(t, order); s != "menunggu" {
		t.Fatalf("status sesudah mati: %s, ingin menunggu (transaction pembayaran belum jalan)", s)
	}
	if _, ada := l.event(t, e); ada {
		t.Fatal("webhook_event tertulis padahal transaction pembayaran tidak jalan")
	}
	h, err := l.kirim(e, order, "settlement", 200_000) // gateway mengulang kiriman yang sama
	if err != nil || h.Hasil != "diproses" {
		t.Fatalf("kiriman ulang: %+v, %v", h, err)
	}
	if l.jurnal(t, order) != 1 || l.saldo(t, a) != 200_000 || l.status(t, order) != "dibayar" {
		t.Fatalf("sesudah kiriman ulang: jurnal %d, saldo %d, status %s", l.jurnal(t, order), l.saldo(t, a), l.status(t, order))
	}
	tp, _ := l.p.Topup(t.Context(), order)
	var j int64
	l.db.QueryRow(`SELECT id FROM jurnal WHERE keterangan = $1`, "Top-up bank "+order).Scan(&j)
	if tp.JurnalID == nil || *tp.JurnalID != j {
		t.Fatalf("topup_bank.jurnal_id %v, jurnal ledger %d: harus menunjuk jurnal yang sama", tp.JurnalID, j)
	}
}

// Webhook mati di tengah, lalu job cek status (jalur lain) menjurnal dengan key yang sama: tetap satu jurnal.
func TestWebhookMatiLaluJobCekStatusSatuJurnal(t *testing.T) {
	l := siapkan(t)
	a := l.akun(t, "terverifikasi")
	order := l.topup(t, a, 150_000)
	l.gw.bayar(order)
	if !l.matiDi(func() { l.kirim(event(l), order, "settlement", 150_000) }) {
		t.Fatal("titik gagal tidak tercapai")
	}
	r, err := l.p.CekBelumSelesai(t.Context(), 0)
	if err != nil || r.Dikredit != 1 {
		t.Fatalf("job: %+v, %v; ingin satu top-up dikredit", r, err)
	}
	if l.jurnal(t, order) != 1 || l.saldo(t, a) != 150_000 || l.status(t, order) != "dibayar" {
		t.Fatalf("jurnal %d, saldo %d, status %s", l.jurnal(t, order), l.saldo(t, a), l.status(t, order))
	}
}

// Dua jalur serentak, key yang sama: webhook dan job cek status.
func TestWebhookDanJobCekStatusSerentakSatuJurnal(t *testing.T) {
	l := siapkan(t)
	a := l.akun(t, "terverifikasi")
	order := l.topup(t, a, 120_000)
	l.gw.bayar(order)
	var wg sync.WaitGroup
	wg.Add(2)
	go func() { defer wg.Done(); l.kirim(event(l), order, "settlement", 120_000) }()
	go func() { defer wg.Done(); l.p.CekStatus(context.Background(), order) }()
	wg.Wait()
	if l.jurnal(t, order) != 1 || l.saldo(t, a) != 120_000 || l.status(t, order) != "dibayar" {
		t.Fatalf("jurnal %d, saldo %d, status %s", l.jurnal(t, order), l.saldo(t, a), l.status(t, order))
	}
}

func TestJumlahDariBarisTopupBukanDariKabar(t *testing.T) {
	l := siapkan(t)
	a := l.akun(t, "terverifikasi")
	order := l.topup(t, a, 100_000)
	h, err := l.kirim(event(l), order, "settlement", 1_000_000) // isi kabar membengkak
	if err != nil || h.Hasil != "ditolak" {
		t.Fatalf("jumlah di kabar beda: %+v, %v; ingin ditolak", h, err)
	}
	if l.jurnal(t, order) != 0 || l.status(t, order) != "menunggu" || l.ledger.n.Load() != 0 {
		t.Fatalf("jurnal %d, status %s, panggilan ledger %d: kabar yang ditolak tidak menyentuh ledger", l.jurnal(t, order), l.status(t, order), l.ledger.n.Load())
	}
}

func TestTandaTanganDanTimestamp(t *testing.T) {
	l := siapkan(t)
	a := l.akun(t, "terverifikasi")
	order := l.topup(t, a, 100_000)
	body, _ := json.Marshal(map[string]any{"event_id": event(l), "order_id": order, "status": "settlement", "jumlah": 100_000})
	now := time.Now().Unix()
	kasus := map[string]struct {
		ts    int64
		tanda string
	}{
		"tanda tangan atas rahasia lain": {now, pembayaran.TandaTangan("rahasia-lain", now, body)},
		"timestamp 6 menit lalu":         {now - 360, pembayaran.TandaTangan(rahasiaTes, now-360, body)},
		"timestamp 6 menit lagi":         {now + 360, pembayaran.TandaTangan(rahasiaTes, now+360, body)},
		"tanpa tanda tangan":             {now, ""},
	}
	for nama, c := range kasus {
		if _, err := l.p.TerimaWebhook(t.Context(), body, fmt.Sprint(c.ts), c.tanda); !errors.Is(err, pembayaran.ErrTandaTangan) {
			t.Fatalf("%s: ingin ErrTandaTangan, dapat %v", nama, err)
		}
	}
	// Tepat di dalam toleransi (4 menit): diterima.
	ts := now - 240
	if _, err := l.p.TerimaWebhook(t.Context(), body, fmt.Sprint(ts), pembayaran.TandaTangan(rahasiaTes, ts, body)); err != nil {
		t.Fatalf("timestamp 4 menit lalu: %v", err)
	}
	// Body diubah sesudah ditandatangani.
	body2, _ := json.Marshal(map[string]any{"event_id": event(l), "order_id": order, "status": "settlement", "jumlah": 900_000})
	if _, err := l.p.TerimaWebhook(t.Context(), body2, fmt.Sprint(now), pembayaran.TandaTangan(rahasiaTes, now, body)); !errors.Is(err, pembayaran.ErrTandaTangan) {
		t.Fatalf("body diubah: %v", err)
	}
	// Masa tumpang tindih rotasi: rahasia lama masih diterima selama masih terdaftar.
	l.p.Rahasia = []string{"rahasia-baru", rahasiaTes}
	body3, _ := json.Marshal(map[string]any{"event_id": event(l), "order_id": order, "status": "pending", "jumlah": 100_000})
	if _, err := l.p.TerimaWebhook(t.Context(), body3, fmt.Sprint(now), pembayaran.TandaTangan(rahasiaTes, now, body3)); err != nil {
		t.Fatalf("rahasia lama di masa tumpang tindih: %v", err)
	}
}

func TestStatusHanyaMaju(t *testing.T) {
	l := siapkan(t)
	a := l.akun(t, "terverifikasi")
	order := l.topup(t, a, 100_000)
	if _, err := l.kirim(event(l), order, "settlement", 100_000); err != nil {
		t.Fatal(err)
	}
	h, err := l.kirim(event(l), order, "pending", 100_000) // kabar menunggu datang sesudah dibayar
	if err != nil || h.Hasil != "diparkir" || l.status(t, order) != "dibayar" {
		t.Fatalf("pending sesudah dibayar: %+v, %v, status %s", h, err, l.status(t, order))
	}
	h, err = l.kirim(event(l), order, "expire", 100_000)
	if err != nil || h.Hasil != "diparkir" || l.status(t, order) != "dibayar" {
		t.Fatalf("expire sesudah dibayar: %+v, %v, status %s", h, err, l.status(t, order))
	}
}

func TestLedgerTidakPastiTidakMenandaiApaPun(t *testing.T) {
	l := siapkan(t)
	a := l.akun(t, "terverifikasi")
	order := l.topup(t, a, 100_000)
	mati := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { http.Error(w, "mati", 503) }))
	defer mati.Close()
	l.p.Ledger = ledger.Baru(mati.URL, kunciLedger, time.Second)
	e := event(l)
	if _, err := l.kirim(e, order, "settlement", 100_000); !errors.Is(err, ledger.ErrTidakPasti) {
		t.Fatalf("ledger 503: ingin ErrTidakPasti, dapat %v", err)
	}
	if _, ada := l.event(t, e); ada || l.status(t, order) != "menunggu" || l.jurnal(t, order) != 0 {
		t.Fatalf("event tercatat %v, status %s, jurnal %d: tidak ada yang boleh ditandai", ada, l.status(t, order), l.jurnal(t, order))
	}
	l.p.Ledger = l.ledger // ledger pulih; gateway mengulang
	if h, err := l.kirim(e, order, "settlement", 100_000); err != nil || h.Hasil != "diproses" {
		t.Fatalf("kiriman ulang sesudah ledger pulih: %+v, %v", h, err)
	}
}

func TestLedgerMenolakDiparkirTanpaMengubahStatus(t *testing.T) {
	l := siapkan(t)
	a := l.akun(t, "terverifikasi")
	order := l.topup(t, a, 100_000)
	l.db.Exec(`UPDATE akun SET status = 'dibekukan' WHERE id = $1`, a)
	e := event(l)
	h, err := l.kirim(e, order, "settlement", 100_000)
	if err != nil || h.Hasil != "diparkir" {
		t.Fatalf("akun dibekukan: %+v, %v; ingin diparkir", h, err)
	}
	if hasil, ada := l.event(t, e); !ada || hasil != "diparkir" || l.status(t, order) != "menunggu" || l.jurnal(t, order) != 0 {
		t.Fatalf("event %q ada=%v, status %s, jurnal %d", hasil, ada, l.status(t, order), l.jurnal(t, order))
	}
}

func TestOrderTidakDikenalDitolakDanDicatat(t *testing.T) {
	l := siapkan(t)
	e := event(l)
	h, err := l.kirim(e, "TB-tidak-ada", "settlement", 100_000)
	if err != nil || h.Hasil != "ditolak" {
		t.Fatalf("order tidak dikenal: %+v, %v", h, err)
	}
	if hasil, ada := l.event(t, e); !ada || hasil != "ditolak" {
		t.Fatalf("event %q ada=%v", hasil, ada)
	}
}

// Modul pembayaran tidak mengimpor internal/repo dan internal/service: kode uang hanya lewat API ledger.
func TestPembayaranTidakMengimporRepoDanService(t *testing.T) {
	out, err := exec.Command("go", "list", "-deps", "lab/apit4/internal/modul/pembayaran").CombinedOutput()
	if err != nil {
		t.Fatalf("go list: %v\n%s", err, out)
	}
	for _, larang := range []string{"lab/apit4/internal/repo", "lab/apit4/internal/service", "lab/apit4/internal/handler"} {
		for _, baris := range strings.Split(string(out), "\n") {
			if strings.TrimSpace(baris) == larang {
				t.Fatalf("modul pembayaran bergantung pada %s", larang)
			}
		}
	}
}

// Webhook sudah menjurnal; di tengah jeda sebelum transaction-nya, job cek status menyelesaikan top-up yang sama.
// Webhook yang tiba terlambat di transaction-nya menjawab ganda, bukan diproses, dan jurnalnya tetap satu.
func TestWebhookKalahDariJobDiTengahMenjawabGanda(t *testing.T) {
	l := siapkan(t)
	a := l.akun(t, "terverifikasi")
	order := l.topup(t, a, 100_000)
	l.gw.bayar(order)
	sudah := false
	l.p.TitikGagal = func(titik string) {
		if titik == "sesudah-ledger" && !sudah {
			sudah = true
			if h, err := l.p.CekStatus(context.Background(), order); err != nil || h.Hasil != "diproses" {
				t.Errorf("job di tengah jeda: %+v, %v", h, err)
			}
		}
	}
	h, err := l.kirim(event(l), order, "settlement", 100_000)
	l.p.TitikGagal = nil
	if err != nil || h.Hasil != "ganda" || h.Jurnal == nil {
		t.Fatalf("webhook yang kalah: %+v, %v; ingin ganda dengan jurnal", h, err)
	}
	if l.jurnal(t, order) != 1 || l.saldo(t, a) != 100_000 || l.status(t, order) != "dibayar" {
		t.Fatalf("jurnal %d, saldo %d, status %s", l.jurnal(t, order), l.saldo(t, a), l.status(t, order))
	}
}

// Job cek status hanya menanyakan top-up yang menunggu lebih lama dari umur: diperiksa dari dua sisi batas (29 lawan 31 menit).
func TestJobCekStatusUmurDariDuaSisi(t *testing.T) {
	l := siapkan(t)
	a := l.akun(t, "terverifikasi")
	order := l.topup(t, a, 100_000)
	l.gw.bayar(order)
	pukul := func(menit time.Duration) { l.p.Kini = func() time.Time { return time.Now().Add(menit * time.Minute) } }
	pukul(29)
	if _, err := l.p.CekBelumSelesai(t.Context(), 30*time.Minute); err != nil {
		t.Fatal(err)
	}
	if s := l.status(t, order); s != "menunggu" {
		t.Fatalf("pada umur 29 menit: status %s, ingin menunggu (belum ditanyakan)", s)
	}
	pukul(31)
	if _, err := l.p.CekBelumSelesai(t.Context(), 30*time.Minute); err != nil {
		t.Fatal(err)
	}
	if s := l.status(t, order); s != "dibayar" {
		t.Fatalf("pada umur 31 menit: status %s, ingin dibayar", s)
	}
	l.p.Kini = nil
}
