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

// Tes lab t5-cicilan (M48, ADR 54): dua job cicilan yang berjalan serentak pada angsuran yang sama.

// tahanBukuSampaiDuaMenunggu mengunci buku kedua akun di satu transaction, menjalankan `jalan` dua kali serentak, menunggu
// sampai dua koneksi benar-benar menunggu lock (pg_stat_activity, bukan jeda tetap), lalu melepas kunci. Dua job itu
// sudah membaca daftar angsuran dan sudah melewati semua pemeriksaan yang tidak butuh lock: mereka berebut buku.
func tahanBukuSampaiDuaMenunggu(t *testing.T, db *sql.DB, akun, merchant int64, jalan func() (HasilCicilan, error)) [2]HasilCicilan {
	t.Helper()
	tahan, err := db.BeginTx(context.Background(), nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := tahan.Exec(`SELECT id FROM buku WHERE akun_id IN ($1, $2) AND jenis <> 'tabungan' ORDER BY id FOR UPDATE`, akun, merchant); err != nil {
		t.Fatal(err)
	}
	var hasil [2]HasilCicilan
	var galat [2]error
	var wg sync.WaitGroup
	for i := range hasil {
		wg.Add(1)
		go func() {
			defer wg.Done()
			hasil[i], galat[i] = jalan()
		}()
	}
	mulai := time.Now()
	for {
		var menunggu int64
		if err := db.QueryRow(`SELECT count(*) FROM pg_stat_activity WHERE application_name = $1 AND wait_event_type = 'Lock'`, appTes).Scan(&menunggu); err != nil {
			t.Fatal(err)
		}
		if menunggu >= 2 {
			break
		}
		if time.Since(mulai) > 20*time.Second {
			t.Fatalf("hanya %d koneksi menunggu lock sesudah 20 detik", menunggu)
		}
		time.Sleep(20 * time.Millisecond)
	}
	if err := tahan.Commit(); err != nil {
		t.Fatal(err)
	}
	wg.Wait()
	for i, e := range galat {
		if e != nil {
			t.Fatalf("job %d: %v", i, e)
		}
	}
	return hasil
}

// Saldo hanya cukup untuk satu angsuran. Dua job membaca daftar yang sama dan berebut buku. Yang kalah membaca saldo
// yang sudah berkurang: ia harus mengenali bahwa angsuran itu sudah dijurnal (referensi dibaca sesudah buku dikunci),
// bukan melaporkan saldo kurang dan menandai angsuran yang sudah dibayar sebagai gagal.
func TestCicilanDuaJobSerentakPeriksaReferensiSesudahKunciBuku(t *testing.T) {
	svc, db := siapkan(t)
	akun, merchant, jadwal := siapkanCicilan(t, svc, db, 10_000)
	h := tahanBukuSampaiDuaMenunggu(t, db, akun, merchant, func() (HasilCicilan, error) {
		return svc.JalankanCicilan(context.Background(), besok(), OpsiCicilan{Jadwal: jadwal})
	})
	baru, ada, gagal, dicatat := h[0].Dijurnal+h[1].Dijurnal, h[0].JurnalAda+h[1].JurnalAda, h[0].Gagal+h[1].Gagal, h[0].Dicatat+h[1].Dicatat
	if baru != 1 || ada != 1 || gagal != 0 {
		t.Fatalf("jurnal baru %d, jurnal sudah ada %d, gagal %d; ingin 1, 1, 0 (job yang kalah mengenali jurnal yang sudah ada)", baru, ada, gagal)
	}
	if dicatat < 1 {
		t.Fatalf("dicatat %d, ingin paling sedikit 1", dicatat)
	}
	if got := statusAngsuran(t, db, jadwal, 1); got != "dicatat" {
		t.Fatalf("status angsuran ke-1 %q, ingin dicatat", got)
	}
	if got := saldoBuku(t, db, akun, "karyawan"); got != 0 {
		t.Fatalf("saldo akun %d, ingin 0: tepat satu angsuran Rp10.000 terdebit", got)
	}
	if n := hitungSQL(t, db, `SELECT count(*) FROM jurnal WHERE referensi = $1`, fmt.Sprintf("angsuran:%d:1", jadwal)); n != 1 {
		t.Fatalf("jurnal dengan referensi angsuran ke-1: %d, ingin 1", n)
	}
}

// Mode rentan: dua job serentak dalam 24 jam tetap tidak menagih dua kali, karena Idempotency-Key diklaim atomik;
// job kedua melewati angsuran itu. Yang membuat M48 terjadi adalah kedaluwarsa key, bukan serentak.
func TestCicilanSatuJobRentanDuaJobSerentakDalam24JamTidakGanda(t *testing.T) {
	svc, db := siapkan(t)
	rentan := svc.DenganMode(RentanCicilanSatuJob)
	akun, _, jadwal := siapkanCicilan(t, rentan, db, 100_000)
	var wg sync.WaitGroup
	var hasil [2]HasilCicilan
	for i := range hasil {
		wg.Add(1)
		go func() {
			defer wg.Done()
			var err error
			if hasil[i], err = rentan.JalankanCicilan(context.Background(), besok(), OpsiCicilan{Jadwal: jadwal}); err != nil {
				t.Error(err)
			}
		}()
	}
	wg.Wait()
	if got := hasil[0].Dijurnal + hasil[1].Dijurnal; got != 1 {
		t.Fatalf("jurnal baru %d, ingin 1: key diklaim satu job saja", got)
	}
	if got := saldoBuku(t, db, akun, "karyawan"); got != 90_000 {
		t.Fatalf("saldo %d, ingin 90000", got)
	}
}

// siapkanTerjurnal: jadwal tiga angsuran Rp10.000, angsuran ke-1 sudah dijurnal dan berstatus `terjurnal` (job berhenti
// sesudah jurnal, lalu langkah terjurnal dipasang).
func siapkanTerjurnal(t *testing.T, svc Service, db *sql.DB, saldoAwal int64) (akun, merchant, jadwal, jurnal int64) {
	t.Helper()
	akun, merchant, jadwal = siapkanCicilan(t, svc, db, saldoAwal)
	if h, err := svc.JalankanCicilan(context.Background(), besok(), OpsiCicilan{BerhentiSetelahJurnal: 1, Jadwal: jadwal}); err != nil || !h.Dihentikan || h.Dijurnal != 1 {
		t.Fatalf("putaran yang berhenti: %+v, %v", h, err)
	}
	if err := db.QueryRow(`UPDATE angsuran SET status = 'terjurnal', jurnal_id = (SELECT id FROM jurnal WHERE referensi = $2)
		WHERE jadwal_id = $1 AND ke = 1 RETURNING jurnal_id`, jadwal, fmt.Sprintf("angsuran:%d:1", jadwal)).Scan(&jurnal); err != nil {
		t.Fatal(err)
	}
	return
}

// Kompensasi (ADR 54): angsuran terjurnal yang tidak bisa diselesaikan dibatalkan lewat jurnal pembalik. Saldo kembali,
// jurnal asal tidak berubah, angsuran `gagal`, dan kompensasi kedua ditolak.
func TestKompensasiAngsuranLewatJurnalPembalik(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	akun, merchant, jadwal, jurnal := siapkanTerjurnal(t, svc, db, 100_000)
	admin, _ := akunBaru(t, db, "admin", 0)
	if got := saldoBuku(t, db, akun, "karyawan"); got != 90_000 {
		t.Fatalf("saldo sebelum kompensasi %d, ingin 90000", got)
	}
	if _, err := svc.KompensasiAngsuran(ctx, akun, jadwal, 1, "angsuran tidak bisa diselesaikan"); !errors.Is(err, ErrDilarang) {
		t.Fatalf("bukan admin: %v, ingin ErrDilarang", err)
	}
	if _, err := svc.KompensasiAngsuran(ctx, admin, jadwal, 1, "pendek"); err == nil {
		t.Fatal("alasan kurang dari 20 karakter harus ditolak")
	}
	if _, err := svc.KompensasiAngsuran(ctx, admin, jadwal, 2, "angsuran ke-2 belum dijurnal sama sekali"); err == nil {
		t.Fatal("angsuran yang masih menunggu tidak dikompensasi")
	}
	balik, err := svc.KompensasiAngsuran(ctx, admin, jadwal, 1, "langkah akhir gagal permanen, uang dikembalikan")
	if err != nil {
		t.Fatal(err)
	}
	if got := saldoBuku(t, db, akun, "karyawan"); got != 100_000 {
		t.Fatalf("saldo sesudah kompensasi %d, ingin 100000", got)
	}
	if got := saldoBuku(t, db, merchant, "warung"); got != 0 {
		t.Fatalf("saldo merchant %d, ingin 0", got)
	}
	var jenisBalik string
	var membalik int64
	if err := db.QueryRow(`SELECT jenis, membalik_jurnal_id FROM jurnal WHERE id = $1`, balik).Scan(&jenisBalik, &membalik); err != nil || jenisBalik != "pembalik" || membalik != jurnal {
		t.Fatalf("jurnal pembalik: jenis %q, membalik %d, %v; ingin pembalik atas jurnal %d", jenisBalik, membalik, err, jurnal)
	}
	var status string
	var tanpaJurnal bool
	if err := db.QueryRow(`SELECT status, jurnal_id IS NULL FROM angsuran WHERE jadwal_id = $1 AND ke = 1`, jadwal).Scan(&status, &tanpaJurnal); err != nil || status != "gagal" || !tanpaJurnal {
		t.Fatalf("angsuran ke-1: status %q, tanpa jurnal %v, %v; ingin gagal tanpa jurnal_id", status, tanpaJurnal, err)
	}
	if n := hitungSQL(t, db, `SELECT count(*) FROM jurnal WHERE referensi = $1`, fmt.Sprintf("angsuran:%d:1", jadwal)); n != 1 {
		t.Fatalf("jurnal asal dengan referensi: %d, ingin 1 (tidak dihapus dan tidak diubah)", n)
	}
	if _, err := svc.KompensasiAngsuran(ctx, admin, jadwal, 1, "kompensasi kedua harus ditolak sistem"); err == nil {
		t.Fatal("kompensasi kedua atas angsuran yang sama harus ditolak")
	}
	if got := saldoBuku(t, db, akun, "karyawan"); got != 100_000 {
		t.Fatalf("saldo sesudah percobaan kedua %d, ingin tetap 100000", got)
	}
	// Job biasa tidak menagih angsuran gagal lagi.
	h, err := svc.JalankanCicilan(ctx, besok(), OpsiCicilan{Jadwal: jadwal})
	if err != nil || h.Dibaca != 0 || saldoBuku(t, db, akun, "karyawan") != 100_000 {
		t.Fatalf("job sesudah kompensasi: %+v, %v; ingin tidak ada yang dibaca", h, err)
	}
}

// Jurnal pembalik tidak boleh membuat saldo karyawan negatif, dan kompensasi yang ditolak tidak meninggalkan apa pun:
// status tetap `terjurnal` dan tidak ada jurnal pembalik (satu transaction).
func TestKompensasiAngsuranDitolakBilaSaldoKaryawanNegatif(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	// Tabungan: uang ada di buku tabungan akun itu sendiri; dikeluarkan dari sana, jurnal pembalik membuat tabungan negatif.
	a, _ := akunBaru(t, db, "karyawan", 50_000)
	jadwal, err := svc.BuatCicilan(ctx, a, "tabungan", nil, 20_000, 2, 10, awalHariWIB(time.Now()).AddDate(0, 0, -1))
	if err != nil {
		t.Fatal(err)
	}
	if h, err := svc.JalankanCicilan(ctx, besok(), OpsiCicilan{BerhentiSetelahJurnal: 1, Jadwal: jadwal}); err != nil || !h.Dihentikan {
		t.Fatalf("putaran yang berhenti: %+v, %v", h, err)
	}
	if _, err := db.Exec(`UPDATE angsuran SET status = 'terjurnal', jurnal_id = (SELECT id FROM jurnal WHERE referensi = $2)
		WHERE jadwal_id = $1 AND ke = 1`, jadwal, fmt.Sprintf("tabungan:%d:1", jadwal)); err != nil {
		t.Fatal(err)
	}
	// Tabungan dikuras lewat jurnal lain (diperankan langsung di database): kompensasi tidak lagi bisa dibayar dari buku itu.
	if _, err := db.Exec(`WITH t AS (SELECT id FROM buku WHERE akun_id = $1 AND jenis = 'tabungan'),
		k AS (SELECT id FROM buku WHERE akun_id = $1 AND jenis = 'karyawan'),
		j AS (INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('transfer', 'tabungan dipakai', $1) RETURNING id)
		INSERT INTO posting (jurnal_id, buku_id, jumlah) SELECT j.id, t.id, -20000 FROM j, t UNION ALL SELECT j.id, k.id, 20000 FROM j, k`, a); err != nil {
		t.Skipf("tabungan tidak bisa dikuras lewat SQL langsung di skema ini (%v); kasus saldo negatif dicakup tes lain", err)
	}
	admin, _ := akunBaru(t, db, "admin", 0)
	_, err = svc.KompensasiAngsuran(ctx, admin, jadwal, 1, "langkah akhir gagal permanen, tabungan dikuras")
	if kodePG(err) != "23514" || namaConstraint(err) != "saldo_karyawan_tidak_negatif" {
		t.Fatalf("kompensasi yang membuat buku tabungan negatif: %v; ingin ditolak constraint saldo_karyawan_tidak_negatif (23514)", err)
	}
	if got := statusAngsuran(t, db, jadwal, 1); got != "terjurnal" {
		t.Fatalf("status sesudah kompensasi ditolak %q, ingin tetap terjurnal", got)
	}
	if n := hitungSQL(t, db, `SELECT count(*) FROM jurnal WHERE jenis = 'pembalik' AND membalik_jurnal_id = (SELECT jurnal_id FROM angsuran WHERE jadwal_id = $1 AND ke = 1)`, jadwal); n != 0 {
		t.Fatalf("jurnal pembalik tertinggal: %d, ingin 0", n)
	}
}
