package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"

	"lab/apit5/internal/repo"
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
	// Angsuran yang sudah dicatat (selesai) tidak dikompensasi lewat jalur ini, dan tidak ada jurnal pembalik yang tertinggal.
	akun2, _, selesai := siapkanCicilan(t, svc, db, 100_000)
	if _, err := svc.JalankanCicilan(ctx, besok(), OpsiCicilan{Jadwal: selesai}); err != nil || statusAngsuran(t, db, selesai, 1) != "dicatat" {
		t.Fatalf("angsuran yang diselesaikan: status %s, %v", statusAngsuran(t, db, selesai, 1), err)
	}
	if _, err := svc.KompensasiAngsuran(ctx, admin, selesai, 1, "angsuran sudah dicatat dan tidak dibatalkan"); err == nil {
		t.Fatal("angsuran berstatus dicatat tidak boleh dikompensasi")
	}
	if got := saldoBuku(t, db, akun2, "karyawan"); got != 90_000 || statusAngsuran(t, db, selesai, 1) != "dicatat" {
		t.Fatalf("sesudah kompensasi ditolak: saldo %d, status %s; ingin 90000 dan dicatat", got, statusAngsuran(t, db, selesai, 1))
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
	// Tabungan dikuras lewat jurnal lain (lewat repo, jadi saldo_cache ikut): kompensasi tidak lagi bisa dibayar dari buku itu.
	if err := repo.Baru(db).DalamTx(ctx, func(tx repo.Tx) error {
		tabungan, err := tx.BukuTabungan(ctx, a)
		if err != nil {
			return err
		}
		utama, err := tx.KunciBukuAkun(ctx, a)
		if err != nil {
			return err
		}
		_, err = tx.CatatJurnal(ctx, "transfer", "tabungan dipakai", a, nil,
			[]repo.Posting{{BukuID: tabungan.ID, Jumlah: -20_000}, {BukuID: utama[a].ID, Jumlah: 20_000}})
		return err
	}); err != nil {
		t.Fatal(err)
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

// Tinjauan t5-cicilan (keputusan 1653). Tes di bawah menutup mutan yang lolos dari tes pelaksana: peran selain admin,
// batas alasan 20 karakter, alasan berspasi, jurnal yang sudah dibalik lewat Balik, jurnal yang postingnya sudah dilepas,
// jatuh tempo tepat pada tanggal job, dan galat selain saldo kurang.

func galatValidasi(err error, field string) bool {
	var ev ErrValidasi
	return errors.As(err, &ev) && ev.Field == field
}

func TestKompensasiAngsuranPeranDanBatasAlasan(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	_, _, jadwal, _ := siapkanTerjurnal(t, svc, db, 100_000)
	admin, _ := akunBaru(t, db, "admin", 0)
	for _, peran := range []string{"karyawan", "warung"} {
		pemanggil, _ := akunBaru(t, db, peran, 0)
		if _, err := svc.KompensasiAngsuran(ctx, pemanggil, jadwal, 1, "alasan yang panjangnya sudah cukup"); !errors.Is(err, ErrDilarang) {
			t.Fatalf("akun %s: %v, ingin ErrDilarang", peran, err)
		}
	}
	for nama, alasan := range map[string]string{
		"19 karakter":                "abcdefghijklmnopqrs",
		"spasi di pinggir dipangkas": "     abcdefghijklmno     ",
	} {
		if _, err := svc.KompensasiAngsuran(ctx, admin, jadwal, 1, alasan); !galatValidasi(err, "alasan") {
			t.Fatalf("alasan %s: %v, ingin ErrValidasi pada field alasan", nama, err)
		}
	}
	if got := statusAngsuran(t, db, jadwal, 1); got != "terjurnal" {
		t.Fatalf("status sesudah semua penolakan %q, ingin tetap terjurnal", got)
	}
	if _, err := svc.KompensasiAngsuran(ctx, admin, jadwal, 1, "abcdefghijklmnopqrst"); err != nil { // tepat 20 karakter
		t.Fatalf("alasan 20 karakter: %v, ingin diterima", err)
	}
	if got := statusAngsuran(t, db, jadwal, 1); got != "gagal" {
		t.Fatalf("status sesudah kompensasi %q, ingin gagal", got)
	}
}

// Admin sudah membalik jurnal angsuran lewat jalur biasa (Balik): kompensasi tidak membuat pembalik kedua, dan jawabannya
// jurnal sudah dibalik (UNIQUE membalik_jurnal_id), bukan galat umum. Angsurannya tetap terjurnal.
func TestKompensasiAngsuranAtasJurnalYangSudahDibalikLewatBalik(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	akun, _, jadwal, jurnal := siapkanTerjurnal(t, svc, db, 100_000)
	admin, _ := akunBaru(t, db, "admin", 0)
	if _, err := svc.Balik(ctx, admin, jurnal, "jurnal angsuran dibalik lewat jalur biasa"); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.KompensasiAngsuran(ctx, admin, jadwal, 1, "kompensasi sesudah jurnal dibalik"); !errors.Is(err, ErrSudahDibalik) {
		t.Fatalf("kompensasi atas jurnal yang sudah dibalik: %v, ingin ErrSudahDibalik", err)
	}
	if got := statusAngsuran(t, db, jadwal, 1); got != "terjurnal" {
		t.Fatalf("status %q, ingin tetap terjurnal", got)
	}
	if n := hitungSQL(t, db, `SELECT count(*) FROM jurnal WHERE membalik_jurnal_id = $1`, jurnal); n != 1 {
		t.Fatalf("jurnal pembalik atas jurnal angsuran: %d, ingin tepat 1 (dari Balik)", n)
	}
	if got := saldoBuku(t, db, akun, "karyawan"); got != 100_000 {
		t.Fatalf("saldo %d, ingin 100000: uang kembali satu kali", got)
	}
}

// Jurnal angsuran yang postingnya sudah dilepas bersama partisinya (ADR 49): kompensasi menjawab ErrPostingDiarsip seperti
// Balik, bukan jurnal pembalik tanpa posting yang baru ditolak database saat COMMIT. Keadaannya dibuat dengan jurnal tanpa
// posting (session_replication_role = replica hanya untuk membuat keadaan itu, seperti TestBalikJurnalTanpaPostingDijawabDiarsip).
func TestKompensasiAngsuranJurnalTanpaPostingDijawabDiarsip(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	_, _, jadwal := siapkanCicilan(t, svc, db, 100_000)
	admin, _ := akunBaru(t, db, "admin", 0)
	tx, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`SET LOCAL session_replication_role = replica`); err != nil {
		t.Fatal(err)
	}
	var jurnal int64
	if err := tx.QueryRow(`INSERT INTO jurnal (jenis, keterangan, dibuat_oleh, dibuat)
		VALUES ('angsuran', 'tes jurnal angsuran yang postingnya sudah dilepas', 1, '2016-06-10T10:00:00+07:00'::timestamptz) RETURNING id`).Scan(&jurnal); err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { // jurnal tanpa posting melanggar invarian: jangan tinggalkan di schema tes
		if hapus, err := db.Begin(); err == nil {
			defer hapus.Rollback()
			if _, err := hapus.Exec(`SET LOCAL session_replication_role = replica`); err == nil {
				if _, err := hapus.Exec(`DELETE FROM jurnal WHERE id = $1`, jurnal); err == nil {
					hapus.Commit()
				}
			}
		}
	})
	if _, err := db.Exec(`UPDATE angsuran SET status = 'terjurnal', jurnal_id = $2 WHERE jadwal_id = $1 AND ke = 1`, jadwal, jurnal); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.KompensasiAngsuran(ctx, admin, jadwal, 1, "partisi posting bulan itu sudah dilepas"); !errors.Is(err, ErrPostingDiarsip) {
		t.Fatalf("kompensasi jurnal tanpa posting: %v, ingin ErrPostingDiarsip", err)
	}
	if got := statusAngsuran(t, db, jadwal, 1); got != "terjurnal" {
		t.Fatalf("status %q, ingin tetap terjurnal", got)
	}
	if n := hitungSQL(t, db, `SELECT count(*) FROM jurnal WHERE membalik_jurnal_id = $1`, jurnal); n != 0 {
		t.Fatalf("jurnal pembalik tertinggal: %d, ingin 0", n)
	}
}

// Angsuran yang jatuh tempo tepat pada tanggal job ikut ditagih (batas inklusif: jatuh_tempo <= tanggal job).
func TestCicilanJatuhTempoTepatPadaTanggalJobIkutDitagih(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	akun, _ := akunBaru(t, db, "karyawan", 50_000)
	merchant, _ := akunBaru(t, db, "warung", 0)
	hariIni := awalHariWIB(time.Now())
	jadwal, err := svc.BuatCicilan(ctx, akun, "cicilan", &merchant, 10_000, 2, 15, hariIni)
	if err != nil {
		t.Fatal(err)
	}
	h, err := svc.JalankanCicilan(ctx, hariIni, OpsiCicilan{Jadwal: jadwal})
	if err != nil || h.Dibaca != 1 || h.Dicatat != 1 {
		t.Fatalf("jatuh tempo hari ini: %+v, %v; ingin dibaca 1 (ke-1) dan dicatat 1, ke-2 bulan depan tidak ikut", h, err)
	}
	if got := saldoBuku(t, db, akun, "karyawan"); got != 40_000 {
		t.Fatalf("saldo %d, ingin 40000", got)
	}
}

// Galat selain saldo kurang bukan alasan menandai angsuran gagal: job berhenti dengan galat, angsurannya tetap menunggu,
// dan tidak ada yang tertulis. Jadwal ke akun merchant tanpa buku ditulis langsung, karena BuatCicilan menolaknya; kolom
// merchant_akun_id adalah referensi tanpa constraint (Tahap 5). Satu angsuran rusak menghentikan seluruh putaran job.
func TestCicilanGalatSelainSaldoKurangTidakMenandaiGagal(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	akun, _ := akunBaru(t, db, "karyawan", 50_000)
	var jadwal int64
	if err := db.QueryRow(`INSERT INTO jadwal_cicilan (akun_id, jenis, merchant_akun_id, jumlah_per_angsuran, jumlah_angsuran, hari_tagih)
		VALUES ($1, 'cicilan', $2, 10000, 1, 15) RETURNING id`, akun, int64(1)<<40).Scan(&jadwal); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO angsuran (jadwal_id, ke, jatuh_tempo) VALUES ($1, 1, current_date - 1)`, jadwal); err != nil {
		t.Fatal(err)
	}
	h, err := svc.JalankanCicilan(ctx, besok(), OpsiCicilan{Jadwal: jadwal})
	if err == nil || kodePG(err) != "23503" {
		t.Fatalf("merchant tanpa buku: %+v, %v; ingin galat foreign key (23503), bukan saldo kurang", h, err)
	}
	if h.Gagal != 0 || statusAngsuran(t, db, jadwal, 1) != "menunggu" {
		t.Fatalf("hasil %+v, status %s; ingin gagal 0 dan tetap menunggu", h, statusAngsuran(t, db, jadwal, 1))
	}
	if n := hitungSQL(t, db, `SELECT count(*) FROM jurnal WHERE referensi = $1`, fmt.Sprintf("angsuran:%d:1", jadwal)); n != 0 {
		t.Fatalf("jurnal tertulis %d, ingin 0 (satu transaction dibatalkan)", n)
	}
	if got := saldoBuku(t, db, akun, "karyawan"); got != 50_000 {
		t.Fatalf("saldo %d, ingin 50000 tidak berubah", got)
	}
}

// Versi benar punya dua titik mati: sesudah jurnal ditulis (angsuran masih menunggu) dan sesudah angsuran ditandai
// terjurnal. Job yang mati di titik kedua meninggalkan satu jurnal dan angsuran terjurnal; putaran berikutnya hanya menandainya
// dicatat, tanpa jurnal baru dan tanpa mencari jurnalnya lagi.
func TestCicilanDihentikanSesudahTerjurnalDilanjutkanDariTerjurnal(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	akun, _, jadwal := siapkanCicilan(t, svc, db, 100_000)
	h, err := svc.JalankanCicilan(ctx, besok(), OpsiCicilan{BerhentiSetelahTerjurnal: 1, Jadwal: jadwal})
	if err != nil || !h.Dihentikan || h.Dijurnal != 1 || h.Dicatat != 0 {
		t.Fatalf("putaran yang berhenti sesudah terjurnal: %+v, %v; ingin dihentikan, 1 jurnal, belum dicatat", h, err)
	}
	if got := statusAngsuran(t, db, jadwal, 1); got != "terjurnal" {
		t.Fatalf("status sesudah mati %q, ingin terjurnal", got)
	}
	if n := hitungSQL(t, db, `SELECT count(*) FROM angsuran WHERE jadwal_id = $1 AND ke = 1 AND jurnal_id IS NOT NULL`, jadwal); n != 1 {
		t.Fatalf("angsuran terjurnal tanpa jurnal_id: ingin 1 yang terikat jurnal, dapat %d", n)
	}
	h, err = svc.JalankanCicilan(ctx, besok(), OpsiCicilan{Jadwal: jadwal})
	if err != nil || h.Dibaca != 1 || h.Dijurnal != 0 || h.JurnalAda != 0 || h.Dicatat != 1 {
		t.Fatalf("putaran ulang: %+v, %v; ingin dibaca 1, dicatat 1, tanpa jurnal baru dan tanpa mencari jurnal", h, err)
	}
	if got := saldoBuku(t, db, akun, "karyawan"); got != 90_000 {
		t.Fatalf("saldo %d, ingin 90000: satu angsuran", got)
	}
	if got := statusAngsuran(t, db, jadwal, 1); got != "dicatat" {
		t.Fatalf("status akhir %q, ingin dicatat", got)
	}
}
