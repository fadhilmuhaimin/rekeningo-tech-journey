package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"
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

// Batas pengaman: key hanya hidup 24 jam (ADR 14). Sesudah itu key yang sama dianggap baru, dan hanya status
// topup_bank di service pembayaran yang menahan jurnal kedua. Tes ini mencatat batas itu, bukan memuji key.
func TestLedgerKeyHabisSesudah24JamMenjurnalLagi(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	a, _ := akunBaru(t, db, "karyawan", 0)
	order := kunciOrder()
	if _, err := svc.LedgerKreditTopup(ctx, order, order, a, 100_000); err != nil {
		t.Fatal(err)
	}
	nanti := svc.DenganJam(func() time.Time { return time.Now().Add(UmurKunciLedger + time.Hour) })
	h, err := nanti.LedgerKreditTopup(ctx, order, order, a, 100_000)
	if err != nil || h.Ulang {
		t.Fatalf("key habis: %+v, %v; ingin jurnal baru", h, err)
	}
	if n := jurnalUntukKey(t, db, order); n != 2 {
		t.Fatalf("jurnal %d, ingin 2: sesudah 24 jam key tidak menahan lagi (%s)", n, fmt.Sprint("ADR 14"))
	}
}
