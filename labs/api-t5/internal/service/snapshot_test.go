package service

import (
	"context"
	"database/sql"
	"errors"
	"sort"
	"testing"
	"time"

	"lab/apit5/internal/repo"
)

// Tes snapshot saldo (lab t5-partisi, M43): saldo akhir bulan per buku, dan pemeriksaan cache dari snapshot terakhir.
// Posting lama ditulis dengan `dibuat` eksplisit di tahun yang berbeda tiap tes (partisi `posting_sebelum` menampung
// semua bulan sebelum bulan berjalan), supaya snapshot satu tes tidak memengaruhi tes lain di schema yang sama.

func snapBuku(t *testing.T, db *sql.DB, akun int64) int64 {
	t.Helper()
	var id int64
	if err := db.QueryRow(`SELECT id FROM buku WHERE akun_id = $1 AND jenis = 'karyawan'`, akun).Scan(&id); err != nil {
		t.Fatal(err)
	}
	return id
}

func snapBukuJenis(t *testing.T, db *sql.DB, akun int64, jenis string) int64 {
	t.Helper()
	var id int64
	if err := db.QueryRow(`SELECT id FROM buku WHERE akun_id = $1 AND jenis = $2`, akun, jenis).Scan(&id); err != nil {
		t.Fatal(err)
	}
	return id
}

// snapJurnal menulis satu jurnal bayar seimbang bertanggal `waktu` (RFC 3339) lewat koneksi tes, lalu menyesuaikan
// saldo_cache kedua buku seperti CatatJurnal, supaya CekCache biasa tetap cocok.
func snapJurnal(t *testing.T, db *sql.DB, dari, ke, jumlah int64, waktu string) {
	t.Helper()
	tx, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback()
	var j int64
	if err := tx.QueryRow(`INSERT INTO jurnal (jenis, keterangan, dibuat_oleh, dibuat)
		VALUES ('bayar', 'tes snapshot', 1, $1::timestamptz) RETURNING id`, waktu).Scan(&j); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(`INSERT INTO posting (jurnal_id, buku_id, jumlah, dibuat)
		VALUES ($1, $2, $3, $5::timestamptz), ($1, $4, $6, $5::timestamptz)`, j, dari, -jumlah, ke, waktu, jumlah); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(`UPDATE buku SET saldo_cache = saldo_cache - $2 WHERE id = $1`, dari, jumlah); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(`UPDATE buku SET saldo_cache = saldo_cache + $2 WHERE id = $1`, ke, jumlah); err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}
}

func snapRow(t *testing.T, db *sql.DB, buku int64, periode string) (saldo, n int64) {
	t.Helper()
	if err := db.QueryRow(`SELECT saldo, jumlah_posting FROM snapshot_saldo WHERE buku_id = $1 AND periode = $2::date`, buku, periode).
		Scan(&saldo, &n); err != nil {
		t.Fatalf("snapshot buku %d periode %s: %v", buku, periode, err)
	}
	return saldo, n
}

func snapWIB(t *testing.T, tanggal string) time.Time {
	t.Helper()
	x, err := time.ParseInLocation("2006-01-02", tanggal, WIB)
	if err != nil {
		t.Fatal(err)
	}
	return x
}

func snapSelisih(beda []repo.SelisihCache, buku int64) (int64, bool) {
	for _, b := range beda {
		if b.BukuID == buku {
			return b.Cache - b.Posting, true
		}
	}
	return 0, false
}

// Snapshot pertama menjumlah semua posting sampai akhir bulannya, yang berikutnya menambah satu bulan ke snapshot
// sebelumnya. Posting pukul 00.00 WIB tanggal 1 milik bulan itu, bukan bulan sebelumnya (batas bulan memakai WIB).
func TestBuatSnapshotMenjumlahBulanDanBulanSebelumnya(t *testing.T) {
	_, db := siapkan(t)
	r := repo.Baru(db)
	ctx := context.Background()
	a, _ := akunBaru(t, db, "karyawan", 100_000)
	b, _ := akunBaru(t, db, "karyawan", 100_000)
	ba, bb := snapBuku(t, db, a), snapBuku(t, db, b)
	snapJurnal(t, db, ba, bb, 3_000, "2017-12-15T10:00:00+07:00")  // sebelum snapshot pertama
	snapJurnal(t, db, ba, bb, 10_000, "2018-01-31T23:59:59+07:00") // Januari, detik terakhir
	snapJurnal(t, db, ba, bb, 7_000, "2018-02-01T00:00:00+07:00")  // Februari, detik pertama (31 Januari 17.00 UTC)
	snapJurnal(t, db, bb, ba, 2_000, "2018-02-15T12:00:00+07:00")
	sekarang := time.Now()
	if _, err := r.BuatSnapshot(ctx, snapWIB(t, "2018-01-01"), sekarang); err != nil {
		t.Fatal(err)
	}
	if s, n := snapRow(t, db, ba, "2018-01-01"); s != -13_000 || n != 2 {
		t.Fatalf("snapshot Januari buku A: saldo %d dari %d posting, ingin -13000 dari 2 (posting Desember ikut, posting 1 Februari 00.00 WIB tidak)", s, n)
	}
	if s, n := snapRow(t, db, bb, "2018-01-01"); s != 13_000 || n != 2 {
		t.Fatalf("snapshot Januari buku B: saldo %d dari %d posting, ingin 13000 dari 2", s, n)
	}
	if _, err := r.BuatSnapshot(ctx, snapWIB(t, "2018-02-01"), sekarang); err != nil {
		t.Fatal(err)
	}
	if s, n := snapRow(t, db, ba, "2018-02-01"); s != -18_000 || n != 4 {
		t.Fatalf("snapshot Februari buku A: saldo %d dari %d posting, ingin -18000 dari 4", s, n)
	}
	// Hitungan bebas: jumlah posting sampai akhir Februari menurut zona WIB, langsung dari tabel posting.
	var saldoLangsung, nLangsung int64
	if err := db.QueryRow(`SELECT sum(jumlah), count(*) FROM posting WHERE buku_id = $1 AND dibuat < '2018-03-01 00:00:00+07'`, ba).
		Scan(&saldoLangsung, &nLangsung); err != nil {
		t.Fatal(err)
	}
	if s, n := snapRow(t, db, ba, "2018-02-01"); s != saldoLangsung || n != nLangsung {
		t.Fatalf("snapshot Februari %d dari %d posting, hitungan langsung %d dari %d", s, n, saldoLangsung, nLangsung)
	}
}

// Menjalankan job lagi tidak menulis baris dan tidak mengubah baris yang ada, juga sesudah posting terlambat di bulan itu.
func TestBuatSnapshotIdempoten(t *testing.T) {
	_, db := siapkan(t)
	r := repo.Baru(db)
	ctx := context.Background()
	a, _ := akunBaru(t, db, "karyawan", 100_000)
	b, _ := akunBaru(t, db, "karyawan", 100_000)
	ba, bb := snapBuku(t, db, a), snapBuku(t, db, b)
	snapJurnal(t, db, ba, bb, 4_000, "2019-03-10T10:00:00+07:00")
	sekarang := time.Now()
	if n, err := r.BuatSnapshot(ctx, snapWIB(t, "2019-03-01"), sekarang); err != nil || n < 2 {
		t.Fatalf("snapshot pertama: %d baris, %v; ingin paling sedikit dua (buku A dan B)", n, err)
	}
	snapJurnal(t, db, ba, bb, 1_000, "2019-03-20T10:00:00+07:00") // terlambat: snapshot tidak berubah
	if n, err := r.BuatSnapshot(ctx, snapWIB(t, "2019-03-01"), sekarang); err != nil || n != 0 {
		t.Fatalf("snapshot kedua: %d baris, %v; ingin 0", n, err)
	}
	if s, n := snapRow(t, db, ba, "2019-03-01"); s != -4_000 || n != 1 {
		t.Fatalf("snapshot berubah sesudah dijalankan ulang: saldo %d dari %d posting, ingin -4000 dari 1", s, n)
	}
}

// Snapshot hanya untuk tanggal 1 dan bulan yang sudah selesai: tepat pada batas akhir (00.00 WIB tanggal 1 berikutnya)
// boleh, sedetik sebelumnya tidak.
func TestBuatSnapshotMenolakBulanBelumSelesaiDanBukanAwalBulan(t *testing.T) {
	_, db := siapkan(t)
	r := repo.Baru(db)
	ctx := context.Background()
	awal := snapWIB(t, "2020-05-01")
	akhir := awal.AddDate(0, 1, 0)
	if _, err := r.BuatSnapshot(ctx, awal, akhir.Add(-time.Second)); !errors.Is(err, repo.ErrBulanBelumSelesai) {
		t.Fatalf("sedetik sebelum akhir bulan: %v, ingin ErrBulanBelumSelesai", err)
	}
	if _, err := r.BuatSnapshot(ctx, awal.AddDate(0, 0, 1), akhir.Add(time.Hour)); !errors.Is(err, repo.ErrPeriodeBukanAwalBulan) {
		t.Fatalf("tanggal 2: %v, ingin ErrPeriodeBukanAwalBulan", err)
	}
	if _, err := r.BuatSnapshot(ctx, awal, akhir); err != nil {
		t.Fatalf("tepat pada akhir bulan: %v, ingin berhasil", err)
	}
	mulaiBulanIni := time.Now().In(WIB)
	mulaiBulanIni = time.Date(mulaiBulanIni.Year(), mulaiBulanIni.Month(), 1, 0, 0, 0, 0, WIB)
	if _, err := r.BuatSnapshot(ctx, mulaiBulanIni, time.Now()); !errors.Is(err, repo.ErrBulanBelumSelesai) {
		t.Fatalf("bulan berjalan: %v, ingin ErrBulanBelumSelesai", err)
	}
}

// Pemeriksaan dari snapshot memberi jawaban yang sama dengan pemeriksaan semua posting untuk selisih cache yang nyata,
// dan menandai posting yang ditulis terlambat di bulan yang sudah di-snapshot (yang tidak terlihat oleh pemeriksaan penuh).
func TestCekCacheSnapshotSamaDenganCekCachePenuh(t *testing.T) {
	_, db := siapkan(t)
	r := repo.Baru(db)
	ctx := context.Background()
	a, _ := akunBaru(t, db, "karyawan", 100_000)
	b, _ := akunBaru(t, db, "karyawan", 100_000)
	ba, bb := snapBuku(t, db, a), snapBuku(t, db, b)
	// Tes ini sengaja merusak saldo_cache; dikembalikan dari posting supaya pemeriksaan di schema yang sama tidak ikut menandai buku ini.
	t.Cleanup(func() {
		db.Exec(`UPDATE buku SET saldo_cache = (SELECT coalesce(sum(jumlah), 0) FROM posting WHERE buku_id = buku.id) WHERE id IN ($1, $2)`, ba, bb)
	})
	snapJurnal(t, db, ba, bb, 6_000, "2021-01-12T09:00:00+07:00")
	snapJurnal(t, db, bb, ba, 1_500, "2021-02-12T09:00:00+07:00")
	sekarang := time.Now()
	for _, p := range []string{"2021-01-01", "2021-02-01"} {
		if _, err := r.BuatSnapshot(ctx, snapWIB(t, p), sekarang); err != nil {
			t.Fatal(err)
		}
	}
	feb := snapWIB(t, "2021-02-01")
	_, _, bedaSnap, err := r.CekCacheSnapshot(ctx, &feb)
	if err != nil {
		t.Fatal(err)
	}
	_, bedaPenuh, err := r.CekCache(ctx)
	if err != nil {
		t.Fatal(err)
	}
	for _, id := range []int64{ba, bb} {
		if _, ada := snapSelisih(bedaSnap, id); ada {
			t.Fatalf("buku %d konsisten, tetapi pemeriksaan dari snapshot menandainya", id)
		}
		if _, ada := snapSelisih(bedaPenuh, id); ada {
			t.Fatalf("buku %d konsisten, tetapi pemeriksaan penuh menandainya", id)
		}
	}
	// Cache ditulis tanpa posting (kode yang salah): kedua pemeriksaan melihat selisih yang sama.
	if _, err := db.Exec(`UPDATE buku SET saldo_cache = saldo_cache + 5000 WHERE id = $1`, ba); err != nil {
		t.Fatal(err)
	}
	_, _, bedaSnap, _ = r.CekCacheSnapshot(ctx, &feb)
	_, bedaPenuh, _ = r.CekCache(ctx)
	if s, ada := snapSelisih(bedaSnap, ba); !ada || s != 5000 {
		t.Fatalf("pemeriksaan dari snapshot: selisih buku A %d (ada %v), ingin 5000", s, ada)
	}
	if s, ada := snapSelisih(bedaPenuh, ba); !ada || s != 5000 {
		t.Fatalf("pemeriksaan penuh: selisih buku A %d (ada %v), ingin 5000", s, ada)
	}
	// Posting terlambat di bulan yang sudah di-snapshot, dengan cache yang ikut disesuaikan: cache dan posting konsisten
	// (pemeriksaan penuh diam), tetapi snapshot tidak memuatnya, jadi pemeriksaan dari snapshot menandai kedua buku.
	snapJurnal(t, db, ba, bb, 1_000, "2021-01-20T09:00:00+07:00")
	_, _, bedaSnap, _ = r.CekCacheSnapshot(ctx, &feb)
	_, bedaPenuh, _ = r.CekCache(ctx)
	if s, ada := snapSelisih(bedaSnap, bb); !ada || s != 1000 {
		t.Fatalf("posting terlambat: selisih buku B dari snapshot %d (ada %v), ingin 1000", s, ada)
	}
	if s, ada := snapSelisih(bedaSnap, ba); !ada || s != 4000 {
		t.Fatalf("posting terlambat: selisih buku A dari snapshot %d (ada %v), ingin 4000 (5000 - 1000)", s, ada)
	}
	if _, ada := snapSelisih(bedaPenuh, bb); ada {
		t.Fatal("pemeriksaan penuh menandai buku B padahal cache dan posting konsisten")
	}
	// Cache yang kurang dari posting (selisih negatif) juga terlihat oleh kedua pemeriksaan.
	if _, err := db.Exec(`UPDATE buku SET saldo_cache = saldo_cache - 9000 WHERE id = $1`, bb); err != nil {
		t.Fatal(err)
	}
	_, _, bedaSnap, _ = r.CekCacheSnapshot(ctx, &feb)
	_, bedaPenuh, _ = r.CekCache(ctx)
	if s, ada := snapSelisih(bedaSnap, bb); !ada || s != -8000 {
		t.Fatalf("selisih negatif dari snapshot: buku B %d (ada %v), ingin -8000 (1000 - 9000)", s, ada)
	}
	if s, ada := snapSelisih(bedaPenuh, bb); !ada || s != -9000 {
		t.Fatalf("selisih negatif pemeriksaan penuh: buku B %d (ada %v), ingin -9000", s, ada)
	}
}

// Snapshot pada periode sebelum posting pertama tidak menyembunyikan apa pun: batas bawah posting yang dibaca memakai
// `>=`, jadi posting tepat pada batas akhir bulan snapshot ikut terbaca dari tabel posting.
func TestCekCacheSnapshotMembacaPostingTepatDiBatas(t *testing.T) {
	_, db := siapkan(t)
	r := repo.Baru(db)
	ctx := context.Background()
	a, _ := akunBaru(t, db, "karyawan", 100_000)
	b, _ := akunBaru(t, db, "karyawan", 100_000)
	ba, bb := snapBuku(t, db, a), snapBuku(t, db, b)
	snapJurnal(t, db, ba, bb, 2_500, "2022-03-01T00:00:00+07:00") // tepat di batas akhir Februari
	if _, err := r.BuatSnapshot(ctx, snapWIB(t, "2022-02-01"), time.Now()); err != nil {
		t.Fatal(err)
	}
	feb := snapWIB(t, "2022-02-01")
	_, _, beda, err := r.CekCacheSnapshot(ctx, &feb)
	if err != nil {
		t.Fatal(err)
	}
	if _, ada := snapSelisih(beda, ba); ada {
		t.Fatal("posting tepat di batas akhir Februari tidak terbaca setelah snapshot Februari: ia milik Maret")
	}
	if s, n := snapRow(t, db, ba, "2022-02-01"); s != 0 || n != 0 {
		t.Fatalf("snapshot Februari memuat posting 1 Maret 00.00 WIB: saldo %d dari %d posting", s, n)
	}
}

// Bulan yang terlewat memutus rantai: snapshot Maret tanpa snapshot Februari tidak boleh memakai Januari sebagai pendahulu
// dan hanya menjumlah Maret. Ia menghitung ulang dari semua posting sampai akhir Maret, lalu April melanjutkan dari Maret.
func TestBuatSnapshotBulanTerlewatMenghitungUlangDariAwal(t *testing.T) {
	_, db := siapkan(t)
	r := repo.Baru(db)
	ctx := context.Background()
	a, _ := akunBaru(t, db, "karyawan", 100_000)
	b, _ := akunBaru(t, db, "karyawan", 100_000)
	ba, bb := snapBuku(t, db, a), snapBuku(t, db, b)
	snapJurnal(t, db, ba, bb, 3_000, "2024-01-10T10:00:00+07:00")
	snapJurnal(t, db, ba, bb, 4_000, "2024-02-10T10:00:00+07:00")
	snapJurnal(t, db, ba, bb, 5_000, "2024-03-10T10:00:00+07:00")
	snapJurnal(t, db, ba, bb, 6_000, "2024-04-10T10:00:00+07:00")
	sekarang := time.Now()
	if _, err := r.BuatSnapshot(ctx, snapWIB(t, "2024-01-01"), sekarang); err != nil {
		t.Fatal(err)
	}
	// Februari dilewati.
	if _, err := r.BuatSnapshot(ctx, snapWIB(t, "2024-03-01"), sekarang); err != nil {
		t.Fatal(err)
	}
	if s, n := snapRow(t, db, ba, "2024-03-01"); s != -12_000 || n != 3 {
		t.Fatalf("snapshot Maret buku A tanpa snapshot Februari: saldo %d dari %d posting, ingin -12000 dari 3 (Januari, Februari, Maret)", s, n)
	}
	if _, err := r.BuatSnapshot(ctx, snapWIB(t, "2024-04-01"), sekarang); err != nil {
		t.Fatal(err)
	}
	if s, n := snapRow(t, db, ba, "2024-04-01"); s != -18_000 || n != 4 {
		t.Fatalf("snapshot April buku A: saldo %d dari %d posting, ingin -18000 dari 4", s, n)
	}
}

// jumlah_posting menghitung posting, bukan jurnal: satu jurnal dengan dua posting ke buku yang sama menambah dua.
func TestBuatSnapshotJumlahPostingMenghitungPostingBukanJurnal(t *testing.T) {
	_, db := siapkan(t)
	r := repo.Baru(db)
	ctx := context.Background()
	a, _ := akunBaru(t, db, "karyawan", 100_000)
	w, _ := akunBaru(t, db, "warung", 0)
	ba, bw := snapBuku(t, db, a), snapBukuJenis(t, db, w, "warung")
	tx, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback()
	var j int64
	if err := tx.QueryRow(`INSERT INTO jurnal (jenis, keterangan, dibuat_oleh, dibuat)
		VALUES ('bayar', 'tes dua posting ke satu buku', 1, '2025-05-10T10:00:00+07:00'::timestamptz) RETURNING id`).Scan(&j); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(`INSERT INTO posting (jurnal_id, buku_id, jumlah, dibuat) VALUES
		($1, $2, -3000, '2025-05-10T10:00:00+07:00'::timestamptz), ($1, $3, 1000, '2025-05-10T10:00:00+07:00'::timestamptz),
		($1, $3, 2000, '2025-05-10T10:00:00+07:00'::timestamptz)`, j, ba, bw); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(`UPDATE buku SET saldo_cache = saldo_cache - 3000 WHERE id = $1`, ba); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(`UPDATE buku SET saldo_cache = saldo_cache + 3000 WHERE id = $1`, bw); err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}
	if _, err := r.BuatSnapshot(ctx, snapWIB(t, "2025-05-01"), time.Now()); err != nil {
		t.Fatal(err)
	}
	if s, n := snapRow(t, db, bw, "2025-05-01"); s != 3_000 || n != 2 {
		t.Fatalf("snapshot warung: saldo %d dari %d posting, ingin 3000 dari 2 (dua posting dalam satu jurnal)", s, n)
	}
}

// Buku yang dibuat sesudah snapshot tidak punya baris snapshot. Saldo awalnya 0, jadi pemeriksaan membandingkan saldo_cache
// dengan posting sesudah batas saja: buku yang konsisten tidak ditandai, cache yang rusak ditandai dengan selisih yang benar.
func TestCekCacheSnapshotBukuBaruTanpaBarisSnapshot(t *testing.T) {
	_, db := siapkan(t)
	r := repo.Baru(db)
	ctx := context.Background()
	if _, err := r.BuatSnapshot(ctx, snapWIB(t, "2023-01-01"), time.Now()); err != nil {
		t.Fatal(err)
	}
	a, _ := akunBaru(t, db, "karyawan", 100_000) // sesudah snapshot: tidak ada barisnya
	ba := snapBuku(t, db, a)
	var baris int
	if err := db.QueryRow(`SELECT count(*) FROM snapshot_saldo WHERE buku_id = $1`, ba).Scan(&baris); err != nil || baris != 0 {
		t.Fatalf("buku baru punya %d baris snapshot (%v), ingin 0", baris, err)
	}
	t.Cleanup(func() {
		db.Exec(`UPDATE buku SET saldo_cache = (SELECT coalesce(sum(jumlah), 0) FROM posting WHERE buku_id = buku.id) WHERE id = $1`, ba)
	})
	jan := snapWIB(t, "2023-01-01")
	_, _, beda, err := r.CekCacheSnapshot(ctx, &jan)
	if err != nil {
		t.Fatalf("buku tanpa baris snapshot menghentikan pemeriksaan: %v", err)
	}
	if _, ada := snapSelisih(beda, ba); ada {
		t.Fatal("buku baru yang konsisten ditandai oleh pemeriksaan dari snapshot")
	}
	if _, err := db.Exec(`UPDATE buku SET saldo_cache = saldo_cache + 700 WHERE id = $1`, ba); err != nil {
		t.Fatal(err)
	}
	_, _, beda, err = r.CekCacheSnapshot(ctx, &jan)
	if err != nil {
		t.Fatal(err)
	}
	if s, ada := snapSelisih(beda, ba); !ada || s != 700 {
		t.Fatalf("cache buku baru lebih 700: selisih %d (ada %v), ingin 700", s, ada)
	}
}

// Jurnal yang postingnya sudah dilepas bersama partisinya tidak bisa dibalik: Balik menjawab ErrPostingDiarsip sebelum
// transaction dibuka, dan tidak ada jurnal pembalik yang tertinggal. Keadaannya dibuat dengan jurnal tanpa posting
// (session_replication_role = replica mematikan aturan jurnal seimbang untuk pemilik schema; hanya untuk membuat keadaan itu).
func TestBalikJurnalTanpaPostingDijawabDiarsip(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	admin, _ := akunBaru(t, db, "admin", 0)
	tx, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`SET LOCAL session_replication_role = replica`); err != nil {
		t.Fatal(err)
	}
	var id int64
	if err := tx.QueryRow(`INSERT INTO jurnal (jenis, keterangan, dibuat_oleh, dibuat)
		VALUES ('bayar', 'tes jurnal yang postingnya sudah dilepas', 1, '2016-06-10T10:00:00+07:00'::timestamptz) RETURNING id`).Scan(&id); err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Balik(ctx, admin, id, "partisi posting bulan itu sudah dilepas dan diarsipkan"); !errors.Is(err, ErrPostingDiarsip) {
		t.Fatalf("balik jurnal tanpa posting: ingin ErrPostingDiarsip, dapat %v", err)
	}
	var pembalik int
	if err := db.QueryRow(`SELECT count(*) FROM jurnal WHERE membalik_jurnal_id = $1`, id).Scan(&pembalik); err != nil || pembalik != 0 {
		t.Fatalf("jurnal pembalik tertinggal: %d (%v), ingin 0", pembalik, err)
	}
}

// Selisih dilaporkan menurut urutan id buku, supaya keluaran job malam sama dari malam ke malam (CLAUDE.md: urutan dibandingkan).
// Delapan buku dirusak sekaligus: urutan acak dari agregasi hash hampir pasti tidak naik.
func TestCekCacheSnapshotMelaporkanSelisihUrutNaik(t *testing.T) {
	_, db := siapkan(t)
	r := repo.Baru(db)
	ctx := context.Background()
	if _, err := r.BuatSnapshot(ctx, snapWIB(t, "2023-02-01"), time.Now()); err != nil {
		t.Fatal(err)
	}
	var ids []int64
	for i := 0; i < 8; i++ {
		a, _ := akunBaru(t, db, "karyawan", 10_000)
		ids = append(ids, snapBuku(t, db, a))
	}
	t.Cleanup(func() {
		for _, id := range ids {
			db.Exec(`UPDATE buku SET saldo_cache = (SELECT coalesce(sum(jumlah), 0) FROM posting WHERE buku_id = buku.id) WHERE id = $1`, id)
		}
	})
	for _, id := range ids {
		if _, err := db.Exec(`UPDATE buku SET saldo_cache = saldo_cache + 1 WHERE id = $1`, id); err != nil {
			t.Fatal(err)
		}
	}
	feb := snapWIB(t, "2023-02-01")
	_, _, beda, err := r.CekCacheSnapshot(ctx, &feb)
	if err != nil {
		t.Fatal(err)
	}
	ditandai := 0
	for _, id := range ids {
		if _, ada := snapSelisih(beda, id); ada {
			ditandai++
		}
	}
	if ditandai != len(ids) {
		t.Fatalf("%d dari %d buku yang cache-nya dirusak ditandai", ditandai, len(ids))
	}
	if !sort.SliceIsSorted(beda, func(i, j int) bool { return beda[i].BukuID < beda[j].BukuID }) {
		t.Fatal("selisih tidak urut naik menurut id buku")
	}
}
