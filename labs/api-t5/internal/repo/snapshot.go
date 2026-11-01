package repo

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// Snapshot saldo (lab t5-partisi, M43). Tabel `snapshot_saldo` menyimpan saldo akhir tiap bulan per buku. Pemeriksaan
// malam membaca snapshot terakhir dan posting sesudahnya, bukan seluruh posting sejak awal. Snapshot hanya benar
// untuk bulan yang sudah ditutup: posting yang kemudian ditulis dengan `dibuat` di bulan itu tidak ikut terhitung dan
// terlihat sebagai selisih oleh CekCacheSnapshot.

var (
	// ErrBulanBelumSelesai: snapshot hanya untuk bulan yang batas akhirnya (00.00 WIB tanggal 1 bulan berikutnya) sudah lewat.
	ErrBulanBelumSelesai = errors.New("bulan belum selesai")
	// ErrPeriodeBukanAwalBulan: periode snapshot adalah tanggal 1.
	ErrPeriodeBukanAwalBulan = errors.New("periode bukan tanggal 1")
	// ErrTanpaSnapshot: pemeriksaan dari snapshot butuh minimal satu snapshot.
	ErrTanpaSnapshot = errors.New("belum ada snapshot saldo")
)

var wibRepo = time.FixedZone("WIB", 7*3600)

// BatasBulan: awal dan akhir (eksklusif) satu bulan kalender menurut waktu WIB.
func BatasBulan(periode time.Time) (dari, ke time.Time) {
	p := periode.In(wibRepo)
	dari = time.Date(p.Year(), p.Month(), 1, 0, 0, 0, 0, wibRepo)
	return dari, dari.AddDate(0, 1, 0)
}

// --8<-- [start:buat-snapshot]
// BuatSnapshot menulis saldo akhir bulan `periode` (tanggal 1) untuk setiap buku. Bila snapshot bulan sebelumnya ada,
// saldo = saldo itu + posting bulan ini; bila belum ada, saldo = jumlah semua posting sampai akhir bulan ini (sekali,
// untuk memulai rantai). `jumlah_posting` adalah banyak posting sampai akhir bulan itu. Baris yang sudah ada tidak
// ditimpa (ON CONFLICT DO NOTHING), jadi menjalankannya ulang aman. Mengembalikan jumlah baris yang ditulis.
func (r Repo) BuatSnapshot(ctx context.Context, periode, sekarang time.Time) (int64, error) {
	dari, ke := BatasBulan(periode)
	if !periode.In(wibRepo).Equal(dari) {
		return 0, ErrPeriodeBukanAwalBulan
	}
	if ke.After(sekarang) {
		return 0, ErrBulanBelumSelesai
	}
	tanggal := dari.Format("2006-01-02")
	var adaSebelumnya bool
	if err := r.db.QueryRowContext(ctx, `
		SELECT EXISTS (SELECT 1 FROM snapshot_saldo WHERE periode = ($1::date - interval '1 month')::date)`, tanggal).
		Scan(&adaSebelumnya); err != nil {
		return 0, err
	}
	// Tanpa snapshot sebelumnya, bulan ini dihitung dari semua posting sebelum `ke`; dengan snapshot, hanya dari bulan ini.
	batasBawah := dari
	if !adaSebelumnya {
		batasBawah = time.Time{}
	}
	hasil, err := r.db.ExecContext(ctx, `
		WITH sebelum AS (
		  SELECT buku_id, saldo, jumlah_posting FROM snapshot_saldo WHERE periode = ($1::date - interval '1 month')::date
		), bulan AS (
		  SELECT buku_id, sum(jumlah) AS saldo, count(*) AS n FROM posting
		  WHERE dibuat >= $2::timestamptz AND dibuat < $3::timestamptz GROUP BY buku_id
		)
		INSERT INTO snapshot_saldo (buku_id, periode, saldo, jumlah_posting)
		SELECT b.id, $1::date, coalesce(s.saldo, 0) + coalesce(m.saldo, 0), coalesce(s.jumlah_posting, 0) + coalesce(m.n, 0)
		FROM buku b LEFT JOIN sebelum s ON s.buku_id = b.id LEFT JOIN bulan m ON m.buku_id = b.id
		ON CONFLICT (buku_id, periode) DO NOTHING`, tanggal, batasBawah, ke)
	if err != nil {
		return 0, err
	}
	return hasil.RowsAffected()
}

// --8<-- [end:buat-snapshot]

// --8<-- [start:cek-cache-snapshot]
// CekCacheSnapshot membandingkan saldo_cache setiap buku dengan saldo snapshot + posting sesudah snapshot itu.
// periode nil = snapshot terakhir. Buku tanpa baris snapshot di periode itu (dibuat sesudahnya) dihitung dari posting
// sesudah batas saja. Mengembalikan periode yang dipakai (tanggal 1).
func (r Repo) CekCacheSnapshot(ctx context.Context, periode *time.Time) (dipakai time.Time, diperiksa int, beda []SelisihCache, err error) {
	var tanggal sql.NullString
	if periode != nil {
		tanggal = sql.NullString{String: periode.In(wibRepo).Format("2006-01-02"), Valid: true}
	} else if err = r.db.QueryRowContext(ctx, `SELECT max(periode)::text FROM snapshot_saldo`).Scan(&tanggal); err != nil {
		return time.Time{}, 0, nil, err
	}
	if !tanggal.Valid {
		return time.Time{}, 0, nil, ErrTanpaSnapshot
	}
	dipakai, err = time.ParseInLocation("2006-01-02", tanggal.String, wibRepo)
	if err != nil {
		return time.Time{}, 0, nil, err
	}
	_, ke := BatasBulan(dipakai)
	rows, err := r.db.QueryContext(ctx, `
		SELECT b.id, b.jenis, coalesce(a.nama, ''), b.saldo_cache, coalesce(s.saldo, 0) + coalesce(sum(p.jumlah), 0)
		FROM buku b LEFT JOIN akun a ON a.id = b.akun_id
		LEFT JOIN snapshot_saldo s ON s.buku_id = b.id AND s.periode = $1::date
		LEFT JOIN posting p ON p.buku_id = b.id AND p.dibuat >= $2::timestamptz
		GROUP BY b.id, a.nama, s.saldo
		ORDER BY b.id`, tanggal.String, ke)
	if err != nil {
		return time.Time{}, 0, nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var s SelisihCache
		if err := rows.Scan(&s.BukuID, &s.Jenis, &s.Nama, &s.Cache, &s.Posting); err != nil {
			return time.Time{}, 0, nil, err
		}
		diperiksa++
		if s.Cache != s.Posting {
			beda = append(beda, s)
		}
	}
	return dipakai, diperiksa, beda, rows.Err()
}

// --8<-- [end:cek-cache-snapshot]
