package repo

import (
	"context"
	"time"
)

type Riwayat struct {
	ID      int64     `json:"id"`
	Arah    string    `json:"arah"` // "keluar" atau "masuk"
	Lawan   string    `json:"lawan"`
	Jumlah  int64     `json:"jumlah"`
	Nominal int64     `json:"nominal"`
	Waktu   time.Time `json:"waktu"`
}

// --8<-- [start:riwayat]
// Riwayat: transaksi masuk dan keluar satu akun, terbaru dulu. Batas 20; pagination menyusul di Tahap 2.
func (r Repo) Riwayat(ctx context.Context, akun int64) ([]Riwayat, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT t.id, CASE WHEN t.dari = $1 THEN 'keluar' ELSE 'masuk' END,
		       a.nama, t.jumlah, t.dibuat
		FROM transaksi t
		JOIN akun a ON a.id = CASE WHEN t.dari = $1 THEN t.ke ELSE t.dari END
		WHERE t.dari = $1 OR t.ke = $1
		ORDER BY t.dibuat DESC, t.id DESC
		LIMIT 20`, akun)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Riwayat{}
	for rows.Next() {
		var x Riwayat
		if err := rows.Scan(&x.ID, &x.Arah, &x.Lawan, &x.Jumlah, &x.Waktu); err != nil {
			return nil, err
		}
		x.Nominal = x.Jumlah
		out = append(out, x)
	}
	return out, rows.Err()
}

// --8<-- [end:riwayat]

type BarisLaporan struct {
	Tanggal   string `json:"tanggal"`
	Transaksi int64  `json:"transaksi"`
	Total     int64  `json:"total"`
}

// --8<-- [start:laporan]
// Laporan: jumlah dan total pembayaran masuk ke satu warung, per hari (waktu Jakarta).
func (r Repo) Laporan(ctx context.Context, warung int64, dari, sampai string) ([]BarisLaporan, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT to_char(dibuat AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS tanggal,
		       count(*), sum(jumlah)
		FROM transaksi
		WHERE ke = $1
		  AND (dibuat AT TIME ZONE 'Asia/Jakarta')::date BETWEEN $2::date AND $3::date
		GROUP BY tanggal
		ORDER BY tanggal`, warung, dari, sampai)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []BarisLaporan{}
	for rows.Next() {
		var x BarisLaporan
		if err := rows.Scan(&x.Tanggal, &x.Transaksi, &x.Total); err != nil {
			return nil, err
		}
		out = append(out, x)
	}
	return out, rows.Err()
}

// --8<-- [end:laporan]
