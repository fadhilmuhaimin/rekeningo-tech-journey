package repo

import (
	"context"
	"fmt"
	"time"
)

// Riwayat adalah satu posting di buku pemilik, dilihat dari pemiliknya.
type Riwayat struct {
	ID      int64     `json:"id"` // nomor jurnal; bayar dan transfer bisa dibuka di /transfers/{id}
	Jenis   string    `json:"jenis"`
	Arah    string    `json:"arah"` // "keluar" atau "masuk"
	Lawan   string    `json:"lawan"`
	Jumlah  int64     `json:"jumlah"`  // app 1.0
	Nominal int64     `json:"nominal"` // app 1.1 dan sesudahnya
	Waktu   time.Time `json:"waktu"`
	Posting int64     `json:"-"` // bagian kedua kursor
}

// Kursor menunjuk posting terakhir yang sudah dikirim: halaman berikutnya mulai sesudahnya (ADR 16, M12).
type Kursor struct {
	Dibuat  time.Time
	Posting int64
}

// --8<-- [start:riwayat]
// Riwayat: posting satu akun, terbaru dulu, paling banyak batas baris. Urutannya (dibuat, id) menurun, dan
// halaman berikutnya dimulai sesudah kursor, bukan sesudah nomor halaman. Posting baru di atas tidak
// menggeser halaman yang sedang dibaca. Index posting_riwayat (buku_id, dibuat, id) melayani keduanya.
func (r Repo) Riwayat(ctx context.Context, akun int64, k *Kursor, batas int) ([]Riwayat, error) {
	q := `
		SELECT j.id, j.jenis, CASE WHEN p.jumlah < 0 THEN 'keluar' ELSE 'masuk' END,
		       coalesce(la.nama, CASE lb.jenis WHEN 'tunjangan' THEN 'Tunjangan makan' WHEN 'pembuka' THEN 'Saldo awal'
		                                       WHEN 'selisih' THEN 'Selisih v1' WHEN 'kas_pencairan' THEN 'Pencairan' END),
		       abs(p.jumlah), p.dibuat, p.id
		FROM buku b
		JOIN posting p ON p.buku_id = b.id
		JOIN jurnal j ON j.id = p.jurnal_id
		LEFT JOIN LATERAL (SELECT q.buku_id FROM posting q
		                   WHERE q.jurnal_id = p.jurnal_id AND q.buku_id <> p.buku_id ORDER BY q.id LIMIT 1) l ON true
		LEFT JOIN buku lb ON lb.id = l.buku_id
		LEFT JOIN akun la ON la.id = lb.akun_id
		WHERE b.akun_id = $1`
	arg := []any{akun}
	if k != nil {
		q += ` AND (p.dibuat, p.id) < ($2, $3)`
		arg = append(arg, k.Dibuat, k.Posting)
	}
	arg = append(arg, batas)
	q += fmt.Sprintf(` ORDER BY p.dibuat DESC, p.id DESC LIMIT $%d`, len(arg))
	rows, err := r.db.QueryContext(ctx, q, arg...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Riwayat{}
	for rows.Next() {
		var x Riwayat
		if err := rows.Scan(&x.ID, &x.Jenis, &x.Arah, &x.Lawan, &x.Jumlah, &x.Waktu, &x.Posting); err != nil {
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
// Laporan: jumlah dan total pembayaran masuk ke satu warung per hari (waktu Jakarta), dari posting jurnal bayar.
func (r Repo) Laporan(ctx context.Context, warung int64, dari, sampai string) ([]BarisLaporan, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT to_char(p.dibuat AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS tanggal, count(*), sum(p.jumlah)
		FROM buku b
		JOIN posting p ON p.buku_id = b.id AND p.jumlah > 0
		JOIN jurnal j ON j.id = p.jurnal_id AND j.jenis = 'bayar'
		WHERE b.akun_id = $1
		  AND (p.dibuat AT TIME ZONE 'Asia/Jakarta')::date BETWEEN $2::date AND $3::date
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
