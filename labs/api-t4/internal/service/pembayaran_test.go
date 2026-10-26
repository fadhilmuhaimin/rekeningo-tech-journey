package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"lab/apit4/internal/gateway"
	"lab/apit4/internal/repo"
)

// Tes top-up dari bank (M29, M30, ADR 34, ADR 35) dengan PostgreSQL sungguhan, memakai siapkan, qrAkun, isiSaldo,
// dan saldo dari db_test.go dan qr_test.go. Gateway adalah server httptest: tiruan lokal, bukan layanan sungguhan.

// gwTes adalah gateway tiruan di dalam tes: perilakunya diatur per tes, dan permintaan yang diterimanya dicatat.
type gwTes struct {
	srv        *httptest.Server
	mu         sync.Mutex
	mode       string // "", "503", "tidur"
	tidur      time.Duration
	kunci      []string                 // Idempotency-Key permintaan POST /orders
	status     map[string]gateway.Order // order_id -> keadaan
	settlement []gateway.BarisSettlement
	masuk      chan struct{} // diisi saat POST /orders tiba (untuk tes yang perlu tahu panggilan sedang berjalan)
}

func gatewayTes(t *testing.T) *gwTes {
	t.Helper()
	g := &gwTes{status: map[string]gateway.Order{}, masuk: make(chan struct{}, 8)}
	g.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		g.mu.Lock()
		mode, tidur := g.mode, g.tidur
		g.mu.Unlock()
		select {
		case g.masuk <- struct{}{}:
		default:
		}
		switch mode {
		case "503":
			http.Error(w, "mati", http.StatusServiceUnavailable)
			return
		case "tidur":
			select {
			case <-time.After(tidur):
			case <-r.Context().Done():
			}
		}
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/orders":
			var in struct {
				OrderID string `json:"order_id"`
				Jumlah  int64  `json:"jumlah"`
			}
			json.NewDecoder(r.Body).Decode(&in)
			g.mu.Lock()
			g.kunci = append(g.kunci, r.Header.Get("Idempotency-Key"))
			o := gateway.Order{OrderID: in.OrderID, Jumlah: in.Jumlah, Status: "pending", TujuanBayar: "88" + strings.Repeat("1", 14)}
			g.status[in.OrderID] = o
			g.mu.Unlock()
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(o)
		case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/orders/"):
			g.mu.Lock()
			o, ok := g.status[strings.TrimPrefix(r.URL.Path, "/orders/")]
			g.mu.Unlock()
			if !ok {
				http.NotFound(w, r)
				return
			}
			json.NewEncoder(w).Encode(o)
		case r.Method == http.MethodGet && r.URL.Path == "/settlement":
			g.mu.Lock()
			b := append([]gateway.BarisSettlement(nil), g.settlement...)
			g.mu.Unlock()
			json.NewEncoder(w).Encode(map[string]any{"baris": b})
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(g.srv.Close)
	return g
}

func (g *gwTes) atur(mode string, tidur time.Duration) {
	g.mu.Lock()
	g.mode, g.tidur = mode, tidur
	g.mu.Unlock()
}

func (g *gwTes) tandai(order string, status string, jumlah int64) {
	g.mu.Lock()
	g.status[order] = gateway.Order{OrderID: order, Jumlah: jumlah, Status: status}
	g.mu.Unlock()
}

const rahasiaTes, rahasiaLamaTes = "rahasia-tes-1", "rahasia-tes-0"

// svcT4 membuat Service dengan gateway tiruan, dua rahasia webhook (yang pertama dipakai, yang kedua masa tumpang
// tindih), dan penyimpanan objek kosong. jam nil = waktu sungguhan.
func svcT4(t *testing.T, svc Service, g *gwTes, lapis ...string) Service {
	t.Helper()
	dep := Dep{RahasiaWebhook: []string{rahasiaTes, rahasiaLamaTes}, TanpaLapis: map[string]bool{}}
	if g != nil {
		dep.Gateway = gateway.Baru(g.srv.URL, 400*time.Millisecond)
	}
	for _, l := range lapis {
		dep.TanpaLapis[l] = true
	}
	return svc.DenganT4(dep)
}

var urutOrder int

func orderBaru() string {
	urutOrder++
	return fmt.Sprintf("TB-tes%04d%s", urutOrder, acakHex(4))
}

// topupSiap menulis satu baris topup_bank menunggu untuk akun, tanpa lewat gateway.
func topupSiap(t *testing.T, db *sql.DB, akun, jumlah int64) (int64, string) {
	t.Helper()
	order := orderBaru()
	id, err := repo.Baru(db).BuatTopupBank(context.Background(), akun, order, jumlah, time.Now().Add(UmurTopupBank))
	if err != nil {
		t.Fatal(err)
	}
	return id, order
}

// kabarSah menandatangani dan mengirim satu kabar ke TerimaWebhook pada waktu `kini`.
func kabarSah(svc Service, kini time.Time, eventID, order, status string, jumlah int64) (HasilWebhook, error) {
	body, _ := json.Marshal(KabarGateway{EventID: eventID, OrderID: order, Status: status, Jumlah: jumlah})
	ts := kini.Unix()
	return svc.TerimaWebhook(context.Background(), body, fmt.Sprint(ts), TandaTangan(rahasiaTes, ts, body))
}

func jumlahJurnalTopup(t *testing.T, db *sql.DB, order string) int {
	t.Helper()
	var n int
	if err := db.QueryRow(`SELECT count(*) FROM jurnal WHERE jenis = 'topup_bank' AND keterangan = $1`, "Top-up bank "+order).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func statusTopup(t *testing.T, db *sql.DB, id int64) string {
	t.Helper()
	var s string
	if err := db.QueryRow(`SELECT status FROM topup_bank WHERE id = $1`, id).Scan(&s); err != nil {
		t.Fatal(err)
	}
	return s
}

func hasilEvent(t *testing.T, db *sql.DB, event string) string {
	t.Helper()
	var s string
	if err := db.QueryRow(`SELECT hasil FROM webhook_event WHERE event_id = $1`, event).Scan(&s); err != nil {
		t.Fatalf("event %s: %v", event, err)
	}
	return s
}

func idEvent(t *testing.T, ket string) string {
	return fmt.Sprintf("evt-%s-%s", ket, acakHex(4))
}

// --- tanda tangan ---

func TestTandaTanganAtasByteMentah(t *testing.T) {
	svc := svcT4(t, Baru(repoKosong(), time.Hour), nil)
	kini := time.Now()
	body := []byte(`{"event_id":"e1","order_id":"o1","status":"settlement","jumlah":1000}`)
	ts := kini.Unix()
	sah := TandaTangan(rahasiaTes, ts, body)
	kasus := []struct {
		nama  string
		ts    int64
		tanda string
		body  []byte
		harus error
	}{
		{"sah", ts, sah, body, nil},
		{"rahasia lama (masa tumpang tindih rotasi)", ts, TandaTangan(rahasiaLamaTes, ts, body), body, nil},
		{"rahasia tidak dikenal", ts, TandaTangan("rahasia-lain", ts, body), body, ErrTandaTangan},
		{"isi diubah satu karakter", ts, sah, []byte(strings.Replace(string(body), "1000", "1001", 1)), ErrTandaTangan},
		{"JSON ditulis ulang dengan spasi lain", ts, sah, []byte(strings.Replace(string(body), ",", ", ", 1)), ErrTandaTangan},
		{"timestamp 4 menit lalu masih diterima", ts - 240, TandaTangan(rahasiaTes, ts-240, body), body, nil},
		{"timestamp 6 menit lalu ditolak", ts - 360, TandaTangan(rahasiaTes, ts-360, body), body, ErrTandaTangan},
		{"timestamp 6 menit di depan ditolak", ts + 360, TandaTangan(rahasiaTes, ts+360, body), body, ErrTandaTangan},
		{"tanda tangan atas timestamp lain", ts, TandaTangan(rahasiaTes, ts-1, body), body, ErrTandaTangan},
		{"tanda bukan heksadesimal", ts, "zzzz", body, ErrTandaTangan},
		{"tanda kosong", ts, "", body, ErrTandaTangan},
	}
	for _, k := range kasus {
		err := svc.PeriksaTandaTangan(fmt.Sprint(k.ts), k.tanda, k.body)
		if !errors.Is(err, k.harus) && (err != nil || k.harus != nil) {
			t.Errorf("%s: dapat %v, harus %v", k.nama, err, k.harus)
		}
	}
	if err := svc.PeriksaTandaTangan("bukan-angka", sah, body); !errors.Is(err, ErrTandaTangan) {
		t.Errorf("timestamp bukan angka: dapat %v", err)
	}
	tanpa := Baru(repoKosong(), time.Hour).DenganT4(Dep{})
	if err := tanpa.PeriksaTandaTangan(fmt.Sprint(ts), sah, body); !errors.Is(err, ErrTandaTangan) {
		t.Errorf("tanpa rahasia terpasang semua kiriman harus ditolak: %v", err)
	}
}

// --- webhook versi ADR 34 ---

func TestWebhookSatuKaliLaluUlang(t *testing.T) {
	svc, db := siapkan(t)
	svc = svcT4(t, svc, nil)
	budi := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 100_000)
	id, order := topupSiap(t, db, budi, 200_000)
	ev := idEvent(t, "a")
	h, err := kabarSah(svc, time.Now(), ev, order, "settlement", 200_000)
	if err != nil || h.Hasil != "diproses" || h.Jurnal == nil {
		t.Fatalf("kiriman pertama: %+v, %v", h, err)
	}
	if saldo(t, db, budi) != 300_000 || statusTopup(t, db, id) != "dibayar" {
		t.Fatalf("saldo %d, status %s", saldo(t, db, budi), statusTopup(t, db, id))
	}
	var jurnal int64
	var pos int
	db.QueryRow(`SELECT jurnal_id FROM topup_bank WHERE id = $1`, id).Scan(&jurnal)
	db.QueryRow(`SELECT count(*), 0 FROM posting WHERE jurnal_id = $1`, jurnal).Scan(&pos, new(int))
	if jurnal != *h.Jurnal || pos != 2 {
		t.Errorf("jurnal %d (terikat %d), %d posting", jurnal, *h.Jurnal, pos)
	}
	var n int
	db.QueryRow(`SELECT count(*) FROM outbox WHERE jurnal_id = $1 AND akun_id = $2 AND jenis = 'topup' AND tujuan = 'push'`, jurnal, budi).Scan(&n)
	if n != 1 {
		t.Errorf("baris outbox untuk jurnal top-up = %d, harus 1 (satu transaction dengan jurnal)", n)
	}
	h, err = kabarSah(svc, time.Now(), ev, order, "settlement", 200_000)
	if err != nil || h.Hasil != "ganda" {
		t.Errorf("event yang sama: %+v, %v", h, err)
	}
	if jumlahJurnalTopup(t, db, order) != 1 || saldo(t, db, budi) != 300_000 {
		t.Errorf("kiriman ulang menggandakan uang")
	}
}

func TestWebhookDuaEventSatuKejadianSatuJurnal(t *testing.T) {
	svc, db := siapkan(t)
	svc = svcT4(t, svc, nil)
	budi := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
	_, order := topupSiap(t, db, budi, 50_000)
	if h, err := kabarSah(svc, time.Now(), idEvent(t, "a"), order, "settlement", 50_000); err != nil || h.Hasil != "diproses" {
		t.Fatalf("%+v %v", h, err)
	}
	h, err := kabarSah(svc, time.Now(), idEvent(t, "b"), order, "settlement", 50_000)
	if err != nil || h.Hasil != "ganda" {
		t.Fatalf("event berbeda untuk kejadian yang sama: %+v, %v", h, err)
	}
	if jumlahJurnalTopup(t, db, order) != 1 || saldo(t, db, budi) != 50_000 {
		t.Error("event kedua menjurnal lagi")
	}
}

func TestWebhookLapisanPenahanJurnalKedua(t *testing.T) {
	// Tiga lapis menahan jurnal kedua untuk satu kejadian: kunci utama event_id (event yang sama), status top-up
	// (event berbeda), dan Idempotency-Key = order_id di ledger (24 jam). Tiap kasus mematikan lapis dan melihat siapa
	// yang tersisa. Event berbeda dipakai di semua kasus, karena event yang sama selalu ditahan kunci utama.
	jam := func(base time.Time) func() time.Time { return func() time.Time { return base } }
	kasus := []struct {
		nama   string
		lapis  []string
		jeda   time.Duration // waktu service untuk kiriman kedua, sesudah kiriman pertama
		sama   bool          // kiriman kedua memakai event_id yang sama dengan yang pertama
		jurnal int
	}{
		{"semua lapis menyala", nil, time.Minute, false, 1},
		{"hanya status dimatikan: kunci ledger menahan (key masih hidup)", []string{"status"}, time.Minute, false, 1},
		{"hanya kunci dimatikan: status menahan", []string{"kunci"}, time.Minute, false, 1},
		{"status dimatikan dan key sudah habis (25 jam): tidak ada yang menahan", []string{"status"}, 25 * time.Hour, false, 2},
		{"key sudah habis (25 jam), status menyala: status menahan", nil, 25 * time.Hour, false, 1},
		{"status dan kunci dimatikan, event berbeda: tidak ada yang menahan", []string{"status", "kunci"}, time.Minute, false, 2},
		{"status dan kunci dimatikan, event yang sama: kunci utama event_id menahan sendirian", []string{"status", "kunci"}, time.Minute, true, 1},
		{"status dan kunci dimatikan, event yang sama, key habis: kunci utama event_id tetap menahan", []string{"status", "kunci"}, 25 * time.Hour, true, 1},
	}
	for _, k := range kasus {
		t.Run(k.nama, func(t *testing.T) {
			svc0, db := siapkan(t)
			awal := time.Now()
			budi := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
			_, order := topupSiap(t, db, budi, 50_000)
			s1 := svcT4(t, svc0, nil, k.lapis...).DenganJam(jam(awal))
			ev1 := idEvent(t, "a")
			if h, err := kabarSah(s1, awal, ev1, order, "settlement", 50_000); err != nil || h.Hasil != "diproses" {
				t.Fatalf("kiriman pertama: %+v, %v", h, err)
			}
			s2 := svcT4(t, svc0, nil, k.lapis...).DenganJam(jam(awal.Add(k.jeda)))
			ev2 := idEvent(t, "b")
			if k.sama {
				ev2 = ev1
			}
			if _, err := kabarSah(s2, awal.Add(k.jeda), ev2, order, "settlement", 50_000); err != nil {
				t.Fatalf("kiriman kedua: %v", err)
			}
			if n := jumlahJurnalTopup(t, db, order); n != k.jurnal {
				t.Errorf("jurnal untuk satu kejadian = %d, harus %d", n, k.jurnal)
			}
			if saldo(t, db, budi) != int64(k.jurnal)*50_000 {
				t.Errorf("saldo %d", saldo(t, db, budi))
			}
		})
	}
}

func TestWebhookSerentakEventSamaDanEventBeda(t *testing.T) {
	for _, mode := range []string{"event yang sama", "event berbeda"} {
		t.Run(mode, func(t *testing.T) {
			svc, db := siapkan(t)
			svc = svcT4(t, svc, nil)
			budi := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
			_, order := topupSiap(t, db, budi, 50_000)
			const n = 8
			hasil := make([]string, n)
			var wg sync.WaitGroup
			ev := idEvent(t, "s")
			for i := 0; i < n; i++ {
				wg.Add(1)
				go func() {
					defer wg.Done()
					e := ev
					if mode == "event berbeda" {
						e = fmt.Sprintf("%s-%d", ev, i)
					}
					h, err := kabarSah(svc, time.Now(), e, order, "settlement", 50_000)
					if err != nil {
						hasil[i] = "galat: " + err.Error()
						return
					}
					hasil[i] = h.Hasil
				}()
			}
			wg.Wait()
			dihitung := map[string]int{}
			for _, h := range hasil {
				dihitung[h]++
			}
			if dihitung["diproses"] != 1 || dihitung["ganda"] != n-1 {
				t.Errorf("hasil %v, harus 1 diproses dan %d ganda", dihitung, n-1)
			}
			if jumlahJurnalTopup(t, db, order) != 1 || saldo(t, db, budi) != 50_000 {
				t.Errorf("jurnal %d, saldo %d", jumlahJurnalTopup(t, db, order), saldo(t, db, budi))
			}
		})
	}
}

func TestWebhookStatusHanyaMaju(t *testing.T) {
	svc, db := siapkan(t)
	svc = svcT4(t, svc, nil)
	budi := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
	// dibayar lalu pending: diparkir, status tetap dibayar.
	id, order := topupSiap(t, db, budi, 10_000)
	kabarSah(svc, time.Now(), idEvent(t, "a"), order, "settlement", 10_000)
	evMundur := idEvent(t, "b")
	h, _ := kabarSah(svc, time.Now(), evMundur, order, "pending", 10_000)
	if h.Hasil != "diparkir" || statusTopup(t, db, id) != "dibayar" || hasilEvent(t, db, evMundur) != "diparkir" {
		t.Errorf("pending sesudah dibayar: %+v, status %s", h, statusTopup(t, db, id))
	}
	// kedaluwarsa lalu settlement: tidak dikredit (status akhir).
	id2, order2 := topupSiap(t, db, budi, 10_000)
	kabarSah(svc, time.Now(), idEvent(t, "c"), order2, "expire", 10_000)
	if statusTopup(t, db, id2) != "kedaluwarsa" {
		t.Fatalf("status %s", statusTopup(t, db, id2))
	}
	h, _ = kabarSah(svc, time.Now(), idEvent(t, "d"), order2, "settlement", 10_000)
	if h.Hasil != "diparkir" || jumlahJurnalTopup(t, db, order2) != 0 {
		t.Errorf("settlement sesudah kedaluwarsa: %+v, jurnal %d", h, jumlahJurnalTopup(t, db, order2))
	}
	// pending pada top-up menunggu tidak mengubah apa pun; failure -> gagal.
	id3, order3 := topupSiap(t, db, budi, 10_000)
	if h, _ := kabarSah(svc, time.Now(), idEvent(t, "e"), order3, "pending", 10_000); h.Hasil != "diproses" || statusTopup(t, db, id3) != "menunggu" {
		t.Errorf("pending pada menunggu: %+v %s", h, statusTopup(t, db, id3))
	}
	kabarSah(svc, time.Now(), idEvent(t, "f"), order3, "failure", 10_000)
	if statusTopup(t, db, id3) != "gagal" {
		t.Errorf("failure: %s", statusTopup(t, db, id3))
	}
	// tidak_pasti + pending -> menunggu (gateway mengenal order itu).
	id4, order4 := topupSiap(t, db, budi, 10_000)
	db.Exec(`UPDATE topup_bank SET status = 'tidak_pasti' WHERE id = $1`, id4)
	kabarSah(svc, time.Now(), idEvent(t, "g"), order4, "pending", 10_000)
	if statusTopup(t, db, id4) != "menunggu" {
		t.Errorf("tidak_pasti + pending: %s", statusTopup(t, db, id4))
	}
}

func TestWebhookJumlahBedaOrderTakDikenalDanPalsu(t *testing.T) {
	svc, db := siapkan(t)
	svc = svcT4(t, svc, nil)
	budi := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
	id, order := topupSiap(t, db, budi, 10_000)
	ev := idEvent(t, "a")
	h, _ := kabarSah(svc, time.Now(), ev, order, "settlement", 99_000)
	if h.Hasil != "ditolak" || statusTopup(t, db, id) != "menunggu" || saldo(t, db, budi) != 0 {
		t.Errorf("jumlah di kabar berbeda dari order: %+v", h)
	}
	if hasilEvent(t, db, ev) != "ditolak" {
		t.Error("event tidak tercatat ditolak")
	}
	ev2 := idEvent(t, "b")
	if h, _ := kabarSah(svc, time.Now(), ev2, "TB-tidak-ada", "settlement", 10_000); h.Hasil != "ditolak" {
		t.Errorf("order tidak dikenal: %+v", h)
	}
	// kiriman palsu: tanda tangan salah tidak meninggalkan event atau jurnal.
	evPalsu := idEvent(t, "palsu")
	body, _ := json.Marshal(KabarGateway{EventID: evPalsu, OrderID: order, Status: "settlement", Jumlah: 10_000})
	ts := time.Now().Unix()
	if _, err := svc.TerimaWebhook(context.Background(), body, fmt.Sprint(ts), TandaTangan("rahasia-lain", ts, body)); !errors.Is(err, ErrTandaTangan) {
		t.Errorf("tanda tangan salah: %v", err)
	}
	var n int
	db.QueryRow(`SELECT count(*) FROM webhook_event WHERE event_id = $1`, evPalsu).Scan(&n)
	if n != 0 || jumlahJurnalTopup(t, db, order) != 0 {
		t.Error("kiriman palsu meninggalkan jejak")
	}
	// isi bukan JSON dan field wajib kosong: ErrValidasi, bukan 500.
	body = []byte("{")
	if _, err := svc.TerimaWebhook(context.Background(), body, fmt.Sprint(ts), TandaTangan(rahasiaTes, ts, body)); !errors.As(err, new(ErrValidasi)) {
		t.Errorf("JSON rusak: %v", err)
	}
	body = []byte(`{"event_id":"","order_id":"x","status":"settlement"}`)
	if _, err := svc.TerimaWebhook(context.Background(), body, fmt.Sprint(ts), TandaTangan(rahasiaTes, ts, body)); !errors.As(err, new(ErrValidasi)) {
		t.Errorf("event_id kosong: %v", err)
	}
	body = []byte(`{"event_id":"e","order_id":"x","status":"aneh"}`)
	if _, err := svc.TerimaWebhook(context.Background(), body, fmt.Sprint(ts), TandaTangan(rahasiaTes, ts, body)); !errors.As(err, new(ErrValidasi)) {
		t.Errorf("status tidak dikenal: %v", err)
	}
}

func TestWebhookBatasSaldoTingkatSesudahLock(t *testing.T) {
	svc, db := siapkan(t)
	svc = svcT4(t, svc, nil)
	dina := qrAkun(t, db, "pemakai", "belum", "aktif", 900_000)
	id1, o1 := topupSiap(t, db, dina, 60_000)
	id2, o2 := topupSiap(t, db, dina, 60_000) // keduanya lolos cek awal (900.000 + 60.000)
	h1, _ := kabarSah(svc, time.Now(), idEvent(t, "a"), o1, "settlement", 60_000)
	h2, _ := kabarSah(svc, time.Now(), idEvent(t, "b"), o2, "settlement", 60_000)
	if h1.Hasil != "diproses" || h2.Hasil != "diparkir" {
		t.Fatalf("%+v %+v", h1, h2)
	}
	if statusTopup(t, db, id1) != "dibayar" || statusTopup(t, db, id2) != "menunggu" || saldo(t, db, dina) != 960_000 {
		t.Errorf("status %s/%s saldo %d", statusTopup(t, db, id1), statusTopup(t, db, id2), saldo(t, db, dina))
	}
	if jumlahJurnalTopup(t, db, o2) != 0 {
		t.Error("top-up yang melewati batas tetap dijurnal")
	}
	// tepat di batas lolos: 960.000 + 40.000 = 1.000.000.
	_, o3 := topupSiap(t, db, dina, 40_000)
	if h, _ := kabarSah(svc, time.Now(), idEvent(t, "c"), o3, "settlement", 40_000); h.Hasil != "diproses" || saldo(t, db, dina) != 1_000_000 {
		t.Errorf("tepat di batas: %+v saldo %d", h, saldo(t, db, dina))
	}
	// akun terverifikasi memakai batas Rp10.000.000.
	eko := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 9_900_000)
	_, o4 := topupSiap(t, db, eko, 100_000)
	_, o5 := topupSiap(t, db, eko, 1)
	if h, _ := kabarSah(svc, time.Now(), idEvent(t, "d"), o4, "settlement", 100_000); h.Hasil != "diproses" {
		t.Errorf("terverifikasi tepat di batas: %+v", h)
	}
	if h, _ := kabarSah(svc, time.Now(), idEvent(t, "e"), o5, "settlement", 1); h.Hasil != "diparkir" {
		t.Errorf("terverifikasi melewati batas satu rupiah: %+v", h)
	}
}

func TestWebhookAkunDibekukanDiparkir(t *testing.T) {
	svc, db := siapkan(t)
	svc = svcT4(t, svc, nil)
	a := qrAkun(t, db, "pemakai", "terverifikasi", "dibekukan", 0)
	id, order := topupSiap(t, db, a, 10_000)
	if h, _ := kabarSah(svc, time.Now(), idEvent(t, "a"), order, "settlement", 10_000); h.Hasil != "diparkir" || statusTopup(t, db, id) != "menunggu" || saldo(t, db, a) != 0 {
		t.Errorf("akun dibekukan: %+v", h)
	}
}

func TestWebhookEventDanJurnalSatuTransaction(t *testing.T) {
	svc, db := siapkan(t)
	svc = svcT4(t, svc, nil)
	// Akun tanpa buku: jurnal gagal di tengah transaction (posting tanpa buku). Event tidak boleh tertinggal.
	var id int64
	db.QueryRow(`SELECT greatest(coalesce(max(id), 0), 100000) + 1 FROM akun`).Scan(&id)
	if _, err := db.Exec(`INSERT INTO akun (id, jenis, nama, email, password_hash, tingkat) VALUES ($1, 'pemakai', 'Tanpa buku', $2, '!', 'terverifikasi')`,
		id, fmt.Sprintf("tb%d@publik.example", id)); err != nil {
		t.Fatal(err)
	}
	tid, order := topupSiap(t, db, id, 10_000)
	ev := idEvent(t, "a")
	if _, err := kabarSah(svc, time.Now(), ev, order, "settlement", 10_000); err == nil {
		t.Fatal("harus gagal: akun tanpa buku")
	}
	var n int
	db.QueryRow(`SELECT count(*) FROM webhook_event WHERE event_id = $1`, ev).Scan(&n)
	if n != 0 || statusTopup(t, db, tid) != "menunggu" || jumlahJurnalTopup(t, db, order) != 0 {
		t.Errorf("transaction yang gagal meninggalkan jejak: event %d, status %s", n, statusTopup(t, db, tid))
	}
	// sesudah buku dibuat, kiriman ulang dengan event yang sama diproses penuh (gateway mengulang kiriman yang 5xx).
	db.Exec(`INSERT INTO buku (akun_id, jenis) VALUES ($1, 'pemakai')`, id)
	if h, err := kabarSah(svc, time.Now(), ev, order, "settlement", 10_000); err != nil || h.Hasil != "diproses" {
		t.Errorf("kiriman ulang: %+v, %v", h, err)
	}
}

func TestWebhookModeRentanV1MenjurnalDuaKali(t *testing.T) {
	svc0, db := siapkan(t)
	v1 := svc0.DenganMode(RentanWebhookV1).DenganT4(Dep{})
	budi := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
	id, order := topupSiap(t, db, budi, 200_000)
	body, _ := json.Marshal(KabarGateway{EventID: "evt-v1", OrderID: order, Status: "settlement", Jumlah: 200_000})
	for i := 0; i < 2; i++ { // tanpa tanda tangan sama sekali
		if h, err := v1.TerimaWebhook(context.Background(), body, "", ""); err != nil || h.Hasil != "diproses" {
			t.Fatalf("v1 kiriman %d: %+v %v", i, h, err)
		}
	}
	if jumlahJurnalTopup(t, db, order) != 2 || saldo(t, db, budi) != 400_000 {
		t.Errorf("v1 harus menjurnal dua kali: jurnal %d saldo %d", jumlahJurnalTopup(t, db, order), saldo(t, db, budi))
	}
	var n int
	db.QueryRow(`SELECT count(*) FROM webhook_event WHERE event_id = 'evt-v1'`).Scan(&n)
	if n != 0 {
		t.Error("v1 tidak punya tabel event")
	}
	body, _ = json.Marshal(KabarGateway{EventID: "evt-v1b", OrderID: order, Status: "pending", Jumlah: 200_000})
	v1.TerimaWebhook(context.Background(), body, "", "")
	if statusTopup(t, db, id) != "menunggu" {
		t.Errorf("v1 harus memundurkan status: %s", statusTopup(t, db, id))
	}
	// isi kabar dipercaya: jumlah palsu dikreditkan.
	_, o2 := topupSiap(t, db, budi, 10_000)
	body, _ = json.Marshal(KabarGateway{EventID: "evt-v1c", OrderID: o2, Status: "settlement", Jumlah: 777_000})
	v1.TerimaWebhook(context.Background(), body, "", "")
	if saldo(t, db, budi) != 400_000+777_000 {
		t.Errorf("v1 mempercayai jumlah di isi kabar: saldo %d", saldo(t, db, budi))
	}
}

func TestWebhookModeCekTulisLolosBersamaan(t *testing.T) {
	svc0, db := siapkan(t)
	for _, k := range []struct {
		mode   string
		jurnal int
	}{{RentanWebhookCekTulis, 2}, {"", 1}} {
		t.Run("mode "+k.mode, func(t *testing.T) {
			s := svc0.DenganT4(Dep{RahasiaWebhook: []string{rahasiaTes}, JedaCekTulis: 250 * time.Millisecond, TanpaLapis: map[string]bool{}})
			if k.mode != "" {
				s = s.DenganMode(k.mode)
			}
			budi := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
			_, order := topupSiap(t, db, budi, 50_000)
			ev := idEvent(t, "ct")
			var wg sync.WaitGroup
			for i := 0; i < 2; i++ {
				wg.Add(1)
				go func() { defer wg.Done(); kabarSah(s, time.Now(), ev, order, "settlement", 50_000) }()
			}
			wg.Wait()
			if n := jumlahJurnalTopup(t, db, order); n != k.jurnal {
				t.Errorf("dua kiriman bersamaan: %d jurnal, harus %d", n, k.jurnal)
			}
		})
	}
}

// --- membuat top-up lewat gateway ---

func TestBuatTopupBankGatewayTiruan(t *testing.T) {
	svc0, db := siapkan(t)
	g := gatewayTes(t)
	svc := svcT4(t, svc0, g)
	budi := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)

	tp, err := svc.BuatTopupBank(context.Background(), budi, 200_000)
	if err != nil || tp.Status != "menunggu" || tp.TujuanBayar == nil || !strings.HasPrefix(tp.OrderID, "TB-") {
		t.Fatalf("normal: %+v, %v", tp, err)
	}
	g.mu.Lock()
	kunci := append([]string(nil), g.kunci...)
	g.mu.Unlock()
	if len(kunci) != 1 || kunci[0] != tp.OrderID {
		t.Errorf("Idempotency-Key ke gateway = %v, harus order_id %s", kunci, tp.OrderID)
	}
	if saldo(t, db, budi) != 0 || jumlahJurnalTopup(t, db, tp.OrderID) != 0 {
		t.Error("membuat top-up tidak boleh menggerakkan uang")
	}

	g.atur("503", 0)
	tp, err = svc.BuatTopupBank(context.Background(), budi, 100_000)
	if !errors.Is(err, ErrGatewayDitolak) || tp.Status != "gagal" || tp.TujuanBayar != nil {
		t.Errorf("gateway 503: %+v, %v", tp, err)
	}

	g.atur("tidur", 3*time.Second)
	mulai := time.Now()
	tp, err = svc.BuatTopupBank(context.Background(), budi, 100_000)
	if err != nil || tp.Status != "tidak_pasti" {
		t.Errorf("timeout: %+v, %v (harus tidak_pasti tanpa error)", tp, err)
	}
	if time.Since(mulai) > 2*time.Second {
		t.Errorf("timeout 400 ms ditunggu %s", time.Since(mulai))
	}

	g.srv.Close() // koneksi ditolak: order tidak pernah sampai
	tp, err = svc.BuatTopupBank(context.Background(), budi, 100_000)
	if !errors.Is(err, ErrGatewayDitolak) || tp.Status != "gagal" {
		t.Errorf("gateway tidak terjangkau: %+v, %v", tp, err)
	}
}

func TestBuatTopupBankAturan(t *testing.T) {
	svc0, db := siapkan(t)
	g := gatewayTes(t)
	svc := svcT4(t, svc0, g)
	ctx := context.Background()
	budi := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
	for _, j := range []int64{0, -5, MinTopupBank - 1, MaksTopupBank + 1} {
		if _, err := svc.BuatTopupBank(ctx, budi, j); !errors.As(err, new(ErrValidasi)) {
			t.Errorf("jumlah %d: %v", j, err)
		}
	}
	dina := qrAkun(t, db, "pemakai", "belum", "aktif", 900_000)
	if _, err := svc.BuatTopupBank(ctx, dina, 100_001); !errors.Is(err, ErrBatasTingkat) {
		t.Errorf("melewati batas belum terverifikasi: %v", err)
	}
	if _, err := svc.BuatTopupBank(ctx, dina, 100_000); err != nil {
		t.Errorf("tepat di batas: %v", err)
	}
	beku := qrAkun(t, db, "pemakai", "terverifikasi", "dibekukan", 0)
	if _, err := svc.BuatTopupBank(ctx, beku, 10_000); !errors.Is(err, ErrDibekukan) {
		t.Errorf("dibekukan: %v", err)
	}
	merchant := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	if _, err := svc.BuatTopupBank(ctx, merchant, 10_000); !errors.Is(err, ErrDilarang) {
		t.Errorf("merchant: %v", err)
	}
	if _, err := Baru(svc0.repo, time.Hour).BuatTopupBank(ctx, budi, 10_000); !errors.Is(err, ErrGatewayTidakAda) {
		t.Errorf("tanpa gateway: %v", err)
	}
	// batas laju per akun: 10 top-up, yang ke-11 ditolak (Asumsi lab, AmbangEndpoint).
	rajin := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
	var terakhir error
	for i := 0; i < 11; i++ {
		_, terakhir = svc.BuatTopupBank(ctx, rajin, 10_000)
	}
	var lambat ErrTerlaluSering
	if !errors.As(terakhir, &lambat) || lambat.Lapis != "akun" {
		t.Errorf("top-up ke-11: %v", terakhir)
	}
}

func TestBuatTopupBankTidakMenahanLockSelamaGatewayMenunggu(t *testing.T) {
	// ADR 22: panggilan jaringan tidak ada di dalam transaction. Selama gateway menggantung, pembayaran dan transfer
	// pemilik akun yang sama tetap berjalan, karena tidak ada lock buku yang dipegang top-up.
	svc0, db := siapkan(t)
	g := gatewayTes(t)
	g.atur("tidur", 1500*time.Millisecond)
	svc := svcT4(t, svc0, g)
	svc.t4.Gateway = gateway.Baru(g.srv.URL, 3*time.Second)
	karyawan, _ := akunBaru(t, db, "karyawan", 100_000)
	warung, _ := akunBaru(t, db, "warung", 0)
	selesai := make(chan struct{})
	go func() {
		defer close(selesai)
		svc.BuatTopupBank(context.Background(), karyawan, 50_000)
	}()
	<-g.masuk // panggilan ke gateway sedang berjalan
	mulai := time.Now()
	if _, _, err := svc.Bayar(context.Background(), karyawan, warung, 10_000, ""); err != nil {
		t.Fatalf("bayar saat gateway menggantung: %v", err)
	}
	if d := time.Since(mulai); d > time.Second {
		t.Errorf("bayar menunggu %s selama gateway menggantung", d)
	}
	var idle int
	db.QueryRow(`SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND state LIKE 'idle in transaction%'`).Scan(&idle)
	if idle != 0 {
		t.Errorf("%d koneksi idle in transaction selama gateway menggantung", idle)
	}
	<-selesai
}

// --- cek status dan rekonsiliasi ---

func TestCekTopupMenerapkanStatusGateway(t *testing.T) {
	svc0, db := siapkan(t)
	g := gatewayTes(t)
	svc := svcT4(t, svc0, g)
	ctx := context.Background()
	budi := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)

	id1, o1 := topupSiap(t, db, budi, 70_000)
	g.tandai(o1, "settlement", 70_000)
	if s, err := svc.CekTopup(ctx, id1); err != nil || s != "dibayar" || saldo(t, db, budi) != 70_000 {
		t.Fatalf("settlement: %s %v saldo %d", s, err, saldo(t, db, budi))
	}
	if s, _ := svc.CekTopup(ctx, id1); s != "dibayar" || jumlahJurnalTopup(t, db, o1) != 1 {
		t.Errorf("cek kedua: jurnal %d", jumlahJurnalTopup(t, db, o1))
	}
	id2, o2 := topupSiap(t, db, budi, 10_000)
	g.tandai(o2, "pending", 10_000)
	if s, err := svc.CekTopup(ctx, id2); err != nil || s != "menunggu" {
		t.Errorf("pending: %s %v", s, err)
	}
	id3, _ := topupSiap(t, db, budi, 10_000) // gateway tidak mengenalnya: tidak pernah dibuat
	db.Exec(`UPDATE topup_bank SET status = 'tidak_pasti' WHERE id = $1`, id3)
	if s, err := svc.CekTopup(ctx, id3); err != nil || s != "gagal" {
		t.Errorf("order tidak ada di gateway: %s %v", s, err)
	}
	id4, o4 := topupSiap(t, db, budi, 10_000)
	g.tandai(o4, "expire", 10_000)
	if s, _ := svc.CekTopup(ctx, id4); s != "kedaluwarsa" {
		t.Errorf("expire: %s", s)
	}
	id5, o5 := topupSiap(t, db, budi, 10_000)
	g.tandai(o5, "settlement", 10_000)
	g.atur("503", 0)
	if s, err := svc.CekTopup(ctx, id5); err == nil || s != "menunggu" {
		t.Errorf("gateway mati: %s, %v (status tidak berubah, error dilaporkan)", s, err)
	}
	g.atur("", 0)
	// job: hanya yang cukup tua; yang tersisa dari tes lain ikut diperiksa, jadi periksa lewat jumlah yang kita buat.
	idTua, oTua := topupSiap(t, db, budi, 10_000)
	idMuda, oMuda := topupSiap(t, db, budi, 10_000)
	db.Exec(`UPDATE topup_bank SET dibuat = now() - interval '2 hours' WHERE id = $1`, idTua)
	g.tandai(oTua, "settlement", 10_000)
	g.tandai(oMuda, "settlement", 10_000)
	if _, err := svc.CekTopupBelumSelesai(ctx, UmurCekStatus); err != nil {
		t.Fatal(err)
	}
	if statusTopup(t, db, idTua) != "dibayar" || statusTopup(t, db, idMuda) != "menunggu" {
		t.Errorf("job: tua %s, muda %s (umur minimal %s)", statusTopup(t, db, idTua), statusTopup(t, db, idMuda), UmurCekStatus)
	}
	_ = id5
}

func TestRekonHarianTigaJenisSelisih(t *testing.T) {
	svc0, db := siapkan(t)
	g := gatewayTes(t)
	svc := svcT4(t, svc0, g)
	ctx := context.Background()
	jkt, _ := time.LoadLocation("Asia/Jakarta")
	tgl := time.Now().In(jkt).Format("2006-01-02")
	budi := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
	bayar := func(jumlah int64) (int64, string) {
		id, o := topupSiap(t, db, budi, jumlah)
		if h, _ := kabarSah(svc, time.Now(), idEvent(t, "r"), o, "settlement", jumlah); h.Hasil != "diproses" {
			t.Fatalf("%+v", h)
		}
		return id, o
	}
	_, cocok := bayar(10_000)
	_, beda := bayar(20_000)
	_, hanyaLedger := bayar(40_000)
	idGW, hanyaGateway := topupSiap(t, db, budi, 15_000) // menunggu di ledger, settlement di gateway
	g.mu.Lock()
	g.settlement = []gateway.BarisSettlement{{OrderID: cocok, Jumlah: 10_000}, {OrderID: beda, Jumlah: 25_000}, {OrderID: hanyaGateway, Jumlah: 15_000}}
	g.mu.Unlock()
	h, err := svc.RekonHarian(ctx, tgl)
	if err != nil {
		t.Fatal(err)
	}
	if h.BarisGateway != 3 || h.TidakDiLedger < 1 || h.JumlahBeda < 1 || h.TidakDiGateway < 1 {
		t.Errorf("ringkasan %+v", h)
	}
	insiden := func(order string) (jenis string, selisih int64, ada bool) {
		err := db.QueryRow(`SELECT jenis, selisih FROM insiden_rekon WHERE order_id = $1 AND tanggal = $2::date`, order, tgl).Scan(&jenis, &selisih)
		return jenis, selisih, err == nil
	}
	if _, _, ada := insiden(cocok); ada {
		t.Error("order yang cocok tidak boleh jadi insiden")
	}
	if j, s, ada := insiden(beda); !ada || j != "jumlah_beda" || s != 5_000 {
		t.Errorf("jumlah beda: %s %d %v", j, s, ada)
	}
	if j, s, ada := insiden(hanyaGateway); !ada || j != "tidak_di_ledger" || s != 15_000 {
		t.Errorf("tidak di ledger: %s %d %v", j, s, ada)
	}
	if j, s, ada := insiden(hanyaLedger); !ada || j != "tidak_di_gateway" || s != -40_000 {
		t.Errorf("tidak di gateway: %s %d %v", j, s, ada)
	}
	var sebelum, sesudah [2]int64
	db.QueryRow(`SELECT count(*), coalesce(sum(jumlah), 0) FROM posting`).Scan(&sebelum[0], &sebelum[1])
	h2, _ := svc.RekonHarian(ctx, tgl)
	db.QueryRow(`SELECT count(*), coalesce(sum(jumlah), 0) FROM posting`).Scan(&sesudah[0], &sesudah[1])
	if h2.TidakDiLedger+h2.JumlahBeda+h2.TidakDiGateway != 0 || sebelum != sesudah {
		t.Errorf("rekonsiliasi kedua: %+v, posting %v -> %v (job tidak boleh menulis insiden atau posting lagi)", h2, sebelum, sesudah)
	}
	var topupID *int64
	db.QueryRow(`SELECT topup_id FROM insiden_rekon WHERE order_id = $1`, hanyaGateway).Scan(&topupID)
	if topupID == nil || *topupID != idGW {
		t.Errorf("insiden terikat ke top-up %v, harus %d", topupID, idGW)
	}
	if _, err := svc.RekonHarian(ctx, "kemarin"); !errors.As(err, new(ErrValidasi)) {
		t.Errorf("tanggal rusak: %v", err)
	}
}
