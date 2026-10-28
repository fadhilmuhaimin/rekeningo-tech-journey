package service

import (
	"context"
	"database/sql"
	"errors"
	"sync"
	"testing"
	"time"
)

// Tes sisi ledger untuk hold kartu (ADR 42 dan ADR 37, lab t4-kartu) dengan PostgreSQL sungguhan: Idempotency-Key =
// id_penerbit, hold sebagai jurnal kartu_tahan, pemeriksaan sesudah lock, lock_timeout, dan batas umur key. Lama
// menunggu lock bergantung mesin, jadi diperiksa sebagai batas.

func svcLedgerKartu(t *testing.T, d Dep) (Service, *sql.DB) {
	t.Helper()
	svc, db := siapkan(t)
	return svc.DenganT4(d), db
}

func jurnalTahanUntuk(t *testing.T, db *sql.DB, id string) int64 {
	t.Helper()
	return hitungKartu(t, db, `SELECT count(*) FROM jurnal WHERE jenis = 'kartu_tahan' AND keterangan = $1`, "Dana tertahan otorisasi kartu "+id)
}

func TestLedgerTahanKartuMenahanDanaSekaliPerKey(t *testing.T) {
	svc, db := svcLedgerKartu(t, Dep{})
	akun := pemakaiBaru(t, db, "terverifikasi", 100_000)
	tertahanAwal := saldoSistem(t, db, "dana_tertahan")
	id := idOtorisasi()

	h, err := svc.LedgerTahanKartu(context.Background(), id, id, akun, 80_000)
	if err != nil || h.Ulang || h.Jurnal <= 0 {
		t.Fatalf("hold pertama: %+v, %v", h, err)
	}
	if s := saldo(t, db, akun); s != 20_000 {
		t.Fatalf("saldo pemilik %d, harus 20000", s)
	}
	if s := saldoSistem(t, db, "dana_tertahan") - tertahanAwal; s != 80_000 {
		t.Fatalf("dana_tertahan naik %d, harus 80000", s)
	}
	var ikat sql.NullInt64
	var status string
	if err := db.QueryRow(`SELECT status, jurnal_id FROM kunci_idempotensi WHERE kunci = $1`, id).Scan(&status, &ikat); err != nil {
		t.Fatal(err)
	}
	if status != "selesai" || !ikat.Valid || ikat.Int64 != h.Jurnal {
		t.Fatalf("key %q jurnal %v; harus selesai dan terikat ke jurnal %d", status, ikat, h.Jurnal)
	}

	h2, err := svc.LedgerTahanKartu(context.Background(), id, id, akun, 80_000)
	if err != nil || !h2.Ulang || h2.Jurnal != h.Jurnal {
		t.Fatalf("ulangan: %+v, %v; harus Ulang dengan jurnal %d", h2, err, h.Jurnal)
	}
	if n := jurnalTahanUntuk(t, db, id); n != 1 {
		t.Fatalf("%d jurnal kartu_tahan untuk satu key, harus 1", n)
	}
	if s := saldo(t, db, akun); s != 20_000 {
		t.Fatalf("saldo sesudah ulangan %d, harus tetap 20000", s)
	}
}

func TestLedgerTahanKartuSerentakKeySamaSatuHold(t *testing.T) {
	svc, db := svcLedgerKartu(t, Dep{})
	akun := pemakaiBaru(t, db, "terverifikasi", 100_000)
	id := idOtorisasi()
	const n = 6
	hasil := make([]HasilKredit, n)
	galat := make([]error, n)
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			hasil[i], galat[i] = svc.LedgerTahanKartu(context.Background(), id, id, akun, 30_000)
		}()
	}
	wg.Wait()
	baru := 0
	for i := range hasil {
		if galat[i] != nil {
			t.Fatalf("panggilan %d: %v", i, galat[i])
		}
		if !hasil[i].Ulang {
			baru++
		}
		if hasil[i].Jurnal != hasil[0].Jurnal {
			t.Fatalf("jurnal berbeda: %d lawan %d", hasil[i].Jurnal, hasil[0].Jurnal)
		}
	}
	if baru != 1 || jurnalTahanUntuk(t, db, id) != 1 {
		t.Fatalf("%d jawaban baru dan %d jurnal; harus satu dan satu", baru, jurnalTahanUntuk(t, db, id))
	}
	if s := saldo(t, db, akun); s != 70_000 {
		t.Fatalf("saldo %d, harus 70000 (satu hold Rp30.000)", s)
	}
}

// Saldo kurang di-ROLLBACK: key tidak tertahan, jadi id yang sama bisa berhasil sesudah saldo cukup.
func TestLedgerTahanKartuSaldoKurangTidakMenahanKey(t *testing.T) {
	svc, db := svcLedgerKartu(t, Dep{})
	akun := pemakaiBaru(t, db, "terverifikasi", 50_000)
	id := idOtorisasi()
	if _, err := svc.LedgerTahanKartu(context.Background(), id, id, akun, 50_001); !errors.Is(err, ErrSaldoKurang) {
		t.Fatalf("saldo kurang satu rupiah: %v, harus ErrSaldoKurang", err)
	}
	if n := hitungKartu(t, db, `SELECT count(*) FROM kunci_idempotensi WHERE kunci = $1`, id); n != 0 {
		t.Fatalf("%d baris key sesudah penolakan, harus 0", n)
	}
	if n := jurnalTahanUntuk(t, db, id); n != 0 {
		t.Fatalf("%d jurnal sesudah penolakan, harus 0", n)
	}
	h, err := svc.LedgerTahanKartu(context.Background(), id, id, akun, 50_000) // tepat sama dengan saldo
	if err != nil || h.Ulang {
		t.Fatalf("saldo tepat: %+v, %v; harus berhasil", h, err)
	}
	if s := saldo(t, db, akun); s != 0 {
		t.Fatalf("saldo %d, harus 0", s)
	}
}

func TestLedgerTahanKartuAkunDibekukanDanTidakAda(t *testing.T) {
	svc, db := svcLedgerKartu(t, Dep{})
	akun := pemakaiBaru(t, db, "terverifikasi", 100_000)
	if _, err := db.Exec(`UPDATE akun SET status = 'dibekukan' WHERE id = $1`, akun); err != nil {
		t.Fatal(err)
	}
	id := idOtorisasi()
	if _, err := svc.LedgerTahanKartu(context.Background(), id, id, akun, 10_000); !errors.Is(err, ErrDibekukan) {
		t.Fatalf("akun dibekukan: %v, harus ErrDibekukan", err)
	}
	id2 := idOtorisasi()
	if _, err := svc.LedgerTahanKartu(context.Background(), id2, id2, 987_654_321, 10_000); !errors.Is(err, ErrTidakDitemukan) {
		t.Fatalf("akun tidak ada: %v, harus ErrTidakDitemukan", err)
	}
	if n := hitungKartu(t, db, `SELECT count(*) FROM kunci_idempotensi WHERE kunci IN ($1, $2)`, id, id2); n != 0 {
		t.Fatalf("%d baris key sesudah dua penolakan, harus 0", n)
	}
}

func TestLedgerTahanKartuKeyBentrokDanValidasi(t *testing.T) {
	svc, db := svcLedgerKartu(t, Dep{})
	akun := pemakaiBaru(t, db, "terverifikasi", 100_000)
	lain := pemakaiBaru(t, db, "terverifikasi", 100_000)
	id := idOtorisasi()
	if _, err := svc.LedgerTahanKartu(context.Background(), id, id, akun, 10_000); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.LedgerTahanKartu(context.Background(), id, id, akun, 10_001); !errors.Is(err, ErrKunciBentrok) {
		t.Fatalf("jumlah lain: %v, harus ErrKunciBentrok", err)
	}
	if _, err := svc.LedgerTahanKartu(context.Background(), id, id, lain, 10_000); !errors.Is(err, ErrKunciBentrok) {
		t.Fatalf("akun lain: %v, harus ErrKunciBentrok", err)
	}
	var v ErrValidasi
	for nama, f := range map[string]func() error{
		"key beda id": func() error { _, e := svc.LedgerTahanKartu(context.Background(), "x", "y", akun, 1); return e },
		"key kosong":  func() error { _, e := svc.LedgerTahanKartu(context.Background(), "", "", akun, 1); return e },
		"jumlah 0":    func() error { _, e := svc.LedgerTahanKartu(context.Background(), "z", "z", akun, 0); return e },
		"jumlah besar": func() error {
			_, e := svc.LedgerTahanKartu(context.Background(), "z", "z", akun, MaksJumlahKartu+1)
			return e
		},
		"id 65 karakter": func() error {
			g := string(make([]byte, 65))
			_, e := svc.LedgerTahanKartu(context.Background(), g, g, akun, 1)
			return e
		},
	} {
		if err := f(); !errors.As(err, &v) {
			t.Fatalf("%s: %v, harus ErrValidasi", nama, err)
		}
	}
	if n := hitungKartu(t, db, `SELECT count(*) FROM jurnal WHERE jenis = 'kartu_tahan' AND dibuat_oleh = $1`, akun); n != 1 {
		t.Fatalf("%d jurnal kartu_tahan untuk akun, harus 1", n)
	}
}

// lock_timeout: buku pemilik dikunci transaction lain, dan hold menjawab ErrLedgerSibuk dalam batas waktu tanpa
// menulis jurnal atau menahan key. Sesudah lock lepas, id yang sama berhasil.
func TestLedgerTahanKartuLockTimeoutSibuk(t *testing.T) {
	svc, db := svcLedgerKartu(t, Dep{LockTimeoutKartu: 300 * time.Millisecond})
	akun := pemakaiBaru(t, db, "terverifikasi", 100_000)
	penahan, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { penahan.Rollback() }) // lock tidak boleh bocor ke tes berikutnya bila tes ini gagal di tengah
	if _, err := penahan.Exec(`SELECT id FROM buku WHERE akun_id = $1 FOR UPDATE`, akun); err != nil {
		t.Fatal(err)
	}
	lepas := time.AfterFunc(5*time.Second, func() { penahan.Rollback() })
	defer lepas.Stop()
	id := idOtorisasi()
	mulai := time.Now()
	_, err = svc.LedgerTahanKartu(context.Background(), id, id, akun, 10_000)
	lama := time.Since(mulai)
	if !errors.Is(err, ErrLedgerSibuk) {
		t.Fatalf("lock ditahan: %v, harus ErrLedgerSibuk", err)
	}
	if lama < 250*time.Millisecond || lama > 3*time.Second {
		t.Fatalf("jawaban sibuk butuh %s, harus kira-kira lock_timeout 300 ms dan jauh di bawah 3 detik", lama)
	}
	if n := hitungKartu(t, db, `SELECT count(*) FROM kunci_idempotensi WHERE kunci = $1`, id); n != 0 {
		t.Fatalf("%d baris key sesudah lock_timeout, harus 0", n)
	}
	penahan.Rollback()
	if _, err := svc.LedgerTahanKartu(context.Background(), id, id, akun, 10_000); err != nil {
		t.Fatalf("sesudah lock lepas: %v", err)
	}
}

// Dua otorisasi serentak dengan id berbeda, masing-masing di bawah saldo dan keduanya di atasnya: hanya satu yang
// menahan, yang kedua melihat saldo sesudah lock.
func TestLedgerTahanKartuDuaIDSerentakSatuSaldo(t *testing.T) {
	svc, db := svcLedgerKartu(t, Dep{})
	akun := pemakaiBaru(t, db, "terverifikasi", 100_000)
	id1, id2 := idOtorisasi(), idOtorisasi()
	galat := make([]error, 2)
	var wg sync.WaitGroup
	for i, id := range []string{id1, id2} {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, galat[i] = svc.LedgerTahanKartu(context.Background(), id, id, akun, 80_000)
		}()
	}
	wg.Wait()
	ok, kurang := 0, 0
	for _, e := range galat {
		switch {
		case e == nil:
			ok++
		case errors.Is(e, ErrSaldoKurang):
			kurang++
		default:
			t.Fatalf("galat tak terduga: %v", e)
		}
	}
	if ok != 1 || kurang != 1 {
		t.Fatalf("%d berhasil dan %d saldo kurang; harus satu dan satu", ok, kurang)
	}
	if s := saldo(t, db, akun); s != 20_000 {
		t.Fatalf("saldo %d, harus 20000", s)
	}
}

// Key hidup 24 jam (ADR 14): sesudah itu id yang sama dianggap baru dan ledger menulis hold kedua. Yang menahannya
// hanya baris otorisasi_kartu di service pembayaran (UNIQUE id_penerbit), dan itu tidak ada bila proses mati di
// antara ledger dan baris. Batas di kedua sisi: 23 jam ulangan, 25 jam hold kedua.
func TestLedgerTahanKartuKeyHabisSesudah24Jam(t *testing.T) {
	svc, db := svcLedgerKartu(t, Dep{})
	akun := pemakaiBaru(t, db, "terverifikasi", 100_000)
	id := idOtorisasi()
	awal := time.Now()
	pada := func(d time.Duration) Service { return svc.DenganJam(func() time.Time { return awal.Add(d) }) }
	h1, err := pada(0).LedgerTahanKartu(context.Background(), id, id, akun, 10_000)
	if err != nil {
		t.Fatal(err)
	}
	h2, err := pada(23*time.Hour).LedgerTahanKartu(context.Background(), id, id, akun, 10_000)
	if err != nil || !h2.Ulang || h2.Jurnal != h1.Jurnal {
		t.Fatalf("pada 23 jam: %+v, %v; harus ulangan", h2, err)
	}
	h3, err := pada(25*time.Hour).LedgerTahanKartu(context.Background(), id, id, akun, 10_000)
	if err != nil || h3.Ulang || h3.Jurnal == h1.Jurnal {
		t.Fatalf("pada 25 jam: %+v, %v; harus hold kedua", h3, err)
	}
	if n := jurnalTahanUntuk(t, db, id); n != 2 {
		t.Fatalf("%d jurnal, harus 2 (key habis)", n)
	}
}

// buku sistem dana_tertahan adalah satu baris yang di-UPDATE oleh semua hold (CatatJurnal), jadi hold milik pemilik
// lain yang tidak berhubungan ikut menunggu bila baris itu dikunci transaction lain. lock_timeout menjawabnya sibuk.
func TestLedgerTahanKartuBukuDanaTertahanTerkunciMenolakSibuk(t *testing.T) {
	svc, db := svcLedgerKartu(t, Dep{LockTimeoutKartu: 300 * time.Millisecond})
	akun := pemakaiBaru(t, db, "terverifikasi", 100_000)
	penahan, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { penahan.Rollback() }) // lock tidak boleh bocor ke tes berikutnya bila tes ini gagal di tengah
	if _, err := penahan.Exec(`SELECT id FROM buku WHERE akun_id IS NULL AND jenis = 'dana_tertahan' FOR UPDATE`); err != nil {
		t.Fatal(err)
	}
	lepas := time.AfterFunc(5*time.Second, func() { penahan.Rollback() })
	defer lepas.Stop()
	id := idOtorisasi()
	mulai := time.Now()
	_, err = svc.LedgerTahanKartu(context.Background(), id, id, akun, 10_000)
	lama := time.Since(mulai)
	if !errors.Is(err, ErrLedgerSibuk) {
		t.Fatalf("buku dana_tertahan terkunci: %v, harus ErrLedgerSibuk", err)
	}
	if lama < 250*time.Millisecond || lama > 3*time.Second {
		t.Fatalf("jawaban sibuk butuh %s, harus kira-kira lock_timeout 300 ms", lama)
	}
	penahan.Rollback()
	if n := jurnalTahanUntuk(t, db, id); n != 0 {
		t.Fatalf("%d jurnal sesudah ROLLBACK karena lock_timeout, harus 0", n)
	}
	if s := saldo(t, db, akun); s != 100_000 {
		t.Fatalf("saldo %d, harus tetap 100000", s)
	}
}

// lock_timeout berlaku per penantian lock, bukan per transaction (dokumentasi PostgreSQL: "applies separately to each
// lock acquisition attempt"). Dua penantian berurutan, masing-masing di bawah lock_timeout, membuat hold selesai lebih
// lama daripada lock_timeout tanpa galat: lock_timeout sendirian tidak menjamin jawaban sebelum tenggat penerbit.
func TestLedgerTahanKartuLockTimeoutBerlakuPerPenantianBukanPerTransaction(t *testing.T) {
	svc, db := svcLedgerKartu(t, Dep{LockTimeoutKartu: 500 * time.Millisecond})
	akun := pemakaiBaru(t, db, "terverifikasi", 100_000)
	kunciBuku := func(q string, args ...any) *sql.Tx {
		tx, err := db.Begin()
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { tx.Rollback() })
		if _, err := tx.Exec(q, args...); err != nil {
			t.Fatal(err)
		}
		return tx
	}
	a := kunciBuku(`SELECT id FROM buku WHERE akun_id = $1 FOR UPDATE`, akun)
	b := kunciBuku(`SELECT id FROM buku WHERE akun_id IS NULL AND jenis = 'dana_tertahan' FOR UPDATE`)
	// Pengaman bila tes gagal di tengah: kedua lock lepas sendiri.
	pengaman := time.AfterFunc(8*time.Second, func() { a.Rollback(); b.Rollback() })
	defer pengaman.Stop()
	time.AfterFunc(300*time.Millisecond, func() { a.Rollback() })
	time.AfterFunc(600*time.Millisecond, func() { b.Rollback() })
	id := idOtorisasi()
	mulai := time.Now()
	h, err := svc.LedgerTahanKartu(context.Background(), id, id, akun, 10_000)
	lama := time.Since(mulai)
	if err != nil || h.Ulang {
		t.Fatalf("dua penantian masing-masing 300 ms: %+v, %v; harus berhasil", h, err)
	}
	if lama < 500*time.Millisecond {
		t.Fatalf("selesai dalam %s; harus lebih dari lock_timeout 500 ms karena dua penantian berurutan", lama)
	}
}

// Dua otorisasi dengan id berbeda mengantre di lock buku pemilik yang dipegang transaction lain. Sesudah lock lepas,
// yang pertama menahan dan yang kedua membaca saldo SESUDAH lock, jadi ditolak saldo kurang. Tanpa FOR UPDATE keduanya
// sudah membaca saldo Rp100.000 sebelum menunggu, dan yang kedua baru gagal di database saat COMMIT (galat mentah).
// Sumber waktu hanya jumlah penunggu lock (disaring menurut application_name tes ini), bukan jeda tetap.
func TestLedgerTahanKartuDuaIDMengantreDiLockSaldoDibacaSesudahLock(t *testing.T) {
	svc, db := svcLedgerKartu(t, Dep{LockTimeoutKartu: 20 * time.Second})
	akun := pemakaiBaru(t, db, "terverifikasi", 100_000)
	penahan, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { penahan.Rollback() }) // lock tidak boleh bocor ke tes berikutnya bila tes ini gagal di tengah
	if _, err := penahan.Exec(`SELECT id FROM buku WHERE akun_id = $1 FOR UPDATE`, akun); err != nil {
		t.Fatal(err)
	}
	lepas := time.AfterFunc(30*time.Second, func() { penahan.Rollback() })
	defer lepas.Stop()
	penunggu := func() int64 {
		return hitungKartu(t, db, `SELECT count(*) FROM pg_stat_activity WHERE application_name = $1 AND wait_event_type = 'Lock'`, appTes)
	}
	galat := make([]error, 2)
	var wg sync.WaitGroup
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			id := idOtorisasi()
			_, galat[i] = svc.LedgerTahanKartu(context.Background(), id, id, akun, 80_000)
		}()
	}
	for mulai := time.Now(); penunggu() < 2; time.Sleep(10 * time.Millisecond) {
		if time.Since(mulai) > 10*time.Second {
			penahan.Rollback()
			t.Fatal("dua otorisasi tidak mengantre di lock dalam 10 detik")
		}
	}
	penahan.Rollback()
	wg.Wait()
	ok, kurang := 0, 0
	for _, e := range galat {
		switch {
		case e == nil:
			ok++
		case errors.Is(e, ErrSaldoKurang):
			kurang++
		default:
			t.Fatalf("galat tak terduga: %v (saldo harus dibaca sesudah lock)", e)
		}
	}
	if ok != 1 || kurang != 1 {
		t.Fatalf("%d berhasil dan %d saldo kurang; harus satu dan satu", ok, kurang)
	}
	if s := saldo(t, db, akun); s != 20_000 {
		t.Fatalf("saldo %d, harus 20000", s)
	}
}
