package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"

	"lab/apit4/internal/repo"
)

// Tes API ledger untuk service pembayaran (ADR 37, lab t4-modul): satu jurnal per Idempotency-Key, batas yang
// dijaga sesudah lock, dan umur key. PostgreSQL sungguhan lewat siapkan dari db_test.go.

func kunciOrder() string { return "TB-" + acakHex(8) }

func jurnalUntukKey(t *testing.T, db *sql.DB, order string) int {
	t.Helper()
	var n int
	if err := db.QueryRow(`SELECT count(*) FROM jurnal WHERE jenis = 'topup_bank' AND keterangan = $1`, "Top-up bank "+order).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func outboxUntukJurnal(t *testing.T, db *sql.DB, jurnal int64) int {
	t.Helper()
	var n int
	if err := db.QueryRow(`SELECT count(*) FROM outbox WHERE jurnal_id = $1`, jurnal).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func TestLedgerKreditTopupSatuJurnalPerKey(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	a, _ := akunBaru(t, db, "karyawan", 50_000)
	order := kunciOrder()
	h1, err := svc.LedgerKreditTopup(ctx, order, order, a, 200_000)
	if err != nil || h1.Ulang || h1.Jurnal == 0 {
		t.Fatalf("panggilan pertama: %+v, %v", h1, err)
	}
	h2, err := svc.LedgerKreditTopup(ctx, order, order, a, 200_000)
	if err != nil || !h2.Ulang || h2.Jurnal != h1.Jurnal {
		t.Fatalf("panggilan kedua: %+v, %v; ingin ulang dengan jurnal %d", h2, err, h1.Jurnal)
	}
	if n := jurnalUntukKey(t, db, order); n != 1 {
		t.Fatalf("jurnal untuk key: %d, ingin 1", n)
	}
	if s := saldo(t, db, a); s != 250_000 {
		t.Fatalf("saldo %d, ingin 250000: kredit hanya sekali", s)
	}
	if n := outboxUntukJurnal(t, db, h1.Jurnal); n != 1 {
		t.Fatalf("baris outbox untuk jurnal: %d, ingin 1 (satu transaction dengan jurnal)", n)
	}
	// Isi baris outbox menentukan notifikasi ke penerima: jenis, kelas uang (ADR 23), penerima, dan jumlah di pesan.
	var jenis string
	var kelas int
	var penerima int64
	var muatan []byte
	if err := db.QueryRow(`SELECT jenis, kelas, akun_id, payload FROM outbox WHERE jurnal_id = $1`, h1.Jurnal).Scan(&jenis, &kelas, &penerima, &muatan); err != nil {
		t.Fatal(err)
	}
	var isi struct {
		Nominal int64  `json:"nominal"`
		Dari    string `json:"dari"`
		Jurnal  int64  `json:"jurnal"`
	}
	if err := json.Unmarshal(muatan, &isi); err != nil {
		t.Fatal(err)
	}
	if jenis != "topup" || kelas != repo.KelasUang || penerima != a || isi.Nominal != 200_000 || isi.Dari != "Bank" || isi.Jurnal != h1.Jurnal {
		t.Fatalf("outbox: jenis %q kelas %d penerima %d muatan %+v; ingin topup, kelas uang, akun %d, Rp200000 dari Bank, jurnal %d",
			jenis, kelas, penerima, isi, a, h1.Jurnal)
	}
}

// Buku akun dikunci sebelum batas tingkat diperiksa (ADR 13, M9). Transaction lain memegang lock baris buku dan
// menambah saldo; kredit menunggu di lock dan sesudah lock dilepas membaca saldo yang baru, jadi batas tingkat
// memakai saldo yang benar. Tanpa FOR UPDATE kredit tetap menunggu (UPDATE saldo menunggu baris yang sama) tetapi
// batasnya sudah diperiksa terhadap saldo lama, dan jurnal menembus batas. Tes membaca pg_stat_activity (difilter
// application_name tes ini) sampai ada backend yang menunggu Lock, bukan menunggu jeda tetap.
func TestLedgerMenungguLockBukuAkunLaluMemakaiSaldoTerbaru(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	a, _ := akunBaru(t, db, "karyawan", 0)
	if _, err := db.Exec(`UPDATE akun SET tingkat = 'belum' WHERE id = $1`, a); err != nil { // batas saldo Rp1.000.000
		t.Fatal(err)
	}
	pemegang, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { pemegang.Rollback() })
	if _, err := pemegang.Exec(`UPDATE buku SET saldo_cache = saldo_cache + 900000 WHERE akun_id = $1`, a); err != nil {
		t.Fatal(err)
	}
	order := kunciOrder()
	selesai := make(chan error, 1)
	go func() {
		_, err := svc.LedgerKreditTopup(ctx, order, order, a, 200_000)
		selesai <- err
	}()
	batas := time.After(10 * time.Second)
	for menunggu := false; !menunggu; {
		select {
		case err := <-selesai:
			t.Fatalf("kredit selesai (%v) padahal transaction lain memegang lock buku akun", err)
		case <-batas:
			t.Fatal("tidak ada backend yang menunggu lock dalam 10 detik")
		default:
		}
		var n int
		if err := db.QueryRow(`SELECT count(*) FROM pg_stat_activity WHERE application_name = $1 AND wait_event_type = 'Lock' AND pid <> pg_backend_pid()`, appTes).Scan(&n); err != nil {
			t.Fatal(err)
		}
		if menunggu = n > 0; !menunggu {
			time.Sleep(10 * time.Millisecond)
		}
	}
	if err := pemegang.Commit(); err != nil {
		t.Fatal(err)
	}
	select {
	case err := <-selesai:
		if !errors.Is(err, ErrBatasTingkat) {
			t.Fatalf("kredit sesudah lock dilepas: %v; ingin ErrBatasTingkat (saldo 900000 + 200000 melewati Rp1.000.000)", err)
		}
	case <-time.After(10 * time.Second):
		t.Fatal("kredit tidak selesai sesudah lock dilepas")
	}
	if n := jurnalUntukKey(t, db, order); n != 0 {
		t.Fatalf("jurnal %d, ingin 0: permintaan yang melewati batas tidak menulis jurnal", n)
	}
}

// Umur key tepat 24 jam dengan jam yang dibekukan: sedetik sebelumnya key masih menahan, tepat pada 24 jam key habis.
func TestLedgerKeyHabisTepatPada24Jam(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	a, _ := akunBaru(t, db, "karyawan", 0)
	order := kunciOrder()
	t0 := time.Now()
	pukul := func(selisih time.Duration) Service { return svc.DenganJam(func() time.Time { return t0.Add(selisih) }) }
	if _, err := pukul(0).LedgerKreditTopup(ctx, order, order, a, 100_000); err != nil {
		t.Fatal(err)
	}
	if h, err := pukul(UmurKunciLedger-time.Second).LedgerKreditTopup(ctx, order, order, a, 100_000); err != nil || !h.Ulang {
		t.Fatalf("sedetik sebelum 24 jam: %+v, %v; ingin ulang", h, err)
	}
	if h, err := pukul(UmurKunciLedger).LedgerKreditTopup(ctx, order, order, a, 100_000); err != nil || h.Ulang {
		t.Fatalf("tepat 24 jam: %+v, %v; ingin jurnal baru (key habis pada 24 jam)", h, err)
	}
}

func TestLedgerKreditTopupSerentakSatuJurnal(t *testing.T) {
	svc, db := siapkan(t)
	a, _ := akunBaru(t, db, "karyawan", 0)
	order := kunciOrder()
	const n = 8
	var wg sync.WaitGroup
	var mu sync.Mutex
	jurnal := map[int64]int{}
	baru, ulang := 0, 0
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			h, err := svc.LedgerKreditTopup(context.Background(), order, order, a, 100_000)
			mu.Lock()
			defer mu.Unlock()
			if err != nil {
				t.Errorf("panggilan serentak: %v", err)
				return
			}
			jurnal[h.Jurnal]++
			if h.Ulang {
				ulang++
			} else {
				baru++
			}
		}()
	}
	wg.Wait()
	if len(jurnal) != 1 || baru != 1 || ulang != n-1 {
		t.Fatalf("jurnal %v, baru %d, ulang %d: ingin satu jurnal, satu baru, %d ulang", jurnal, baru, ulang, n-1)
	}
	if got := jurnalUntukKey(t, db, order); got != 1 || saldo(t, db, a) != 100_000 {
		t.Fatalf("jurnal %d, saldo %d: ingin 1 dan 100000", got, saldo(t, db, a))
	}
}

func TestLedgerKunciHarusSamaDenganOrderDanDipakaiSatuPermintaan(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	a, _ := akunBaru(t, db, "karyawan", 0)
	b, _ := akunBaru(t, db, "karyawan", 0)
	order := kunciOrder()
	var ev ErrValidasi
	if _, err := svc.LedgerKreditTopup(ctx, "kunci-lain", order, a, 100_000); !errors.As(err, &ev) {
		t.Fatalf("key bukan order_id: ingin ErrValidasi, dapat %v", err)
	}
	if _, err := svc.LedgerKreditTopup(ctx, order, order, a, 100_000); err != nil {
		t.Fatal(err)
	}
	for nama, c := range map[string]struct{ akun, jumlah int64 }{"jumlah beda": {a, 100_001}, "akun beda": {b, 100_000}} {
		if _, err := svc.LedgerKreditTopup(ctx, order, order, c.akun, c.jumlah); !errors.Is(err, ErrKunciBentrok) {
			t.Fatalf("%s dengan key yang sama: ingin ErrKunciBentrok, dapat %v", nama, err)
		}
	}
	if n := jurnalUntukKey(t, db, order); n != 1 || saldo(t, db, b) != 0 {
		t.Fatalf("jurnal %d, saldo B %d: permintaan yang ditolak tidak menulis apa pun", n, saldo(t, db, b))
	}
}

func TestLedgerDitolakDibekukanDanBatasTingkatTidakMenahanKey(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	a, _ := akunBaru(t, db, "karyawan", 0)
	order := kunciOrder()
	if _, err := db.Exec(`UPDATE akun SET status = 'dibekukan' WHERE id = $1`, a); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.LedgerKreditTopup(ctx, order, order, a, 100_000); !errors.Is(err, ErrDibekukan) {
		t.Fatalf("akun dibekukan: ingin ErrDibekukan, dapat %v", err)
	}
	if _, err := db.Exec(`UPDATE akun SET status = 'aktif', tingkat = 'belum' WHERE id = $1`, a); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.LedgerKreditTopup(ctx, order, order, a, 1_000_001); !errors.Is(err, ErrBatasTingkat) {
		t.Fatalf("melewati batas belum terverifikasi: ingin ErrBatasTingkat, dapat %v", err)
	}
	var key int
	db.QueryRow(`SELECT count(*) FROM kunci_idempotensi WHERE kunci = $1`, order).Scan(&key)
	if key != 0 {
		t.Fatalf("key tertahan sesudah penolakan: %d baris; penolakan di-ROLLBACK", key)
	}
	// Sesudah akun diaktifkan dan nominalnya sah, key yang sama berhasil.
	if h, err := svc.LedgerKreditTopup(ctx, order, order, a, 1_000_000); err != nil || h.Ulang {
		t.Fatalf("key yang sama sesudah penolakan: %+v, %v", h, err)
	}
}

// Ulangan sesudah kredit tidak ditolak oleh batas saldo yang sudah berisi kreditnya sendiri.
func TestLedgerUlanganTidakKenaBatasSaldo(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	a, _ := akunBaru(t, db, "karyawan", 0)
	if _, err := db.Exec(`UPDATE akun SET tingkat = 'belum' WHERE id = $1`, a); err != nil {
		t.Fatal(err)
	}
	order := kunciOrder()
	h1, err := svc.LedgerKreditTopup(ctx, order, order, a, 1_000_000)
	if err != nil {
		t.Fatal(err)
	}
	h2, err := svc.LedgerKreditTopup(ctx, order, order, a, 1_000_000)
	if err != nil || !h2.Ulang || h2.Jurnal != h1.Jurnal {
		t.Fatalf("ulangan di batas saldo: %+v, %v; ingin jurnal %d", h2, err, h1.Jurnal)
	}
}

func TestLedgerAkunTidakAda(t *testing.T) {
	svc, _ := siapkan(t)
	order := kunciOrder()
	if _, err := svc.LedgerKreditTopup(context.Background(), order, order, 987654321, 100_000); !errors.Is(err, ErrTidakDitemukan) {
		t.Fatalf("akun tidak ada: ingin ErrTidakDitemukan, dapat %v", err)
	}
}

func TestLedgerJumlahTidakSah(t *testing.T) {
	svc, db := siapkan(t)
	a, _ := akunBaru(t, db, "karyawan", 0)
	for nama, jumlah := range map[string]int64{"nol": 0, "negatif": -1, "lebih dari batas Rp5.000.000": MaksTopupBank + 1} {
		order := kunciOrder()
		var ev ErrValidasi
		if _, err := svc.LedgerKreditTopup(context.Background(), order, order, a, jumlah); !errors.As(err, &ev) {
			t.Fatalf("%s: ingin ErrValidasi, dapat %v", nama, err)
		}
	}
	order := kunciOrder()
	if _, err := svc.LedgerKreditTopup(context.Background(), order, order, a, MaksTopupBank); err != nil {
		t.Fatalf("tepat di batas Rp5.000.000: %v", err)
	}
}

// Batas pengaman: key hanya hidup 24 jam (ADR 14). Pada 23 jam key masih menahan; pada 25 jam key dianggap baru, dan
// hanya status topup_bank di service pembayaran yang menahan jurnal kedua. Tes ini mencatat batas itu, bukan memuji key.
func TestLedgerKeyHidup24JamLaluMenjurnalLagi(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	a, _ := akunBaru(t, db, "karyawan", 0)
	order := kunciOrder()
	if _, err := svc.LedgerKreditTopup(ctx, order, order, a, 100_000); err != nil {
		t.Fatal(err)
	}
	pukul := func(jam time.Duration) Service {
		return svc.DenganJam(func() time.Time { return time.Now().Add(jam * time.Hour) })
	}
	if h, err := pukul(23).LedgerKreditTopup(ctx, order, order, a, 100_000); err != nil || !h.Ulang {
		t.Fatalf("pada 23 jam: %+v, %v; ingin ulang (key masih hidup)", h, err)
	}
	h, err := pukul(25).LedgerKreditTopup(ctx, order, order, a, 100_000)
	if err != nil || h.Ulang {
		t.Fatalf("pada 25 jam: %+v, %v; ingin jurnal baru (key habis)", h, err)
	}
	if n := jurnalUntukKey(t, db, order); n != 2 {
		t.Fatalf("jurnal %d, ingin 2: sesudah 24 jam key tidak menahan lagi (%s)", n, fmt.Sprint("ADR 14"))
	}
}
