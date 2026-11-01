package repo

import "context"

// BarisTutupBuku adalah satu buku dalam laporan tutup buku satu periode.
type BarisTutupBuku struct {
	Buku       int64  `json:"buku"`
	Jenis      string `json:"jenis"`
	Nama       string `json:"nama,omitempty"`
	SaldoAwal  int64  `json:"saldo_awal"`
	Masuk      int64  `json:"masuk"`
	Keluar     int64  `json:"keluar"`
	SaldoAkhir int64  `json:"saldo_akhir"`
	SaldoCache int64  `json:"saldo_cache"`
}

// RingkasanSistem: pemeriksaan seluruh jurnal yang dibuat di periode itu.
type RingkasanSistem struct {
	Jurnal           int64 `json:"jurnal"`
	TidakSeimbang    int64 `json:"jurnal_tidak_seimbang"`
	JumlahPosting    int64 `json:"jumlah_semua_posting"`
	JumlahSaldoAkhir int64 `json:"jumlah_semua_saldo_akhir"`
}

// --8<-- [start:tutup-buku]
// TutupBuku menghitung, untuk setiap buku, saldo awal (posting sebelum awal periode), uang masuk dan keluar
// selama periode, dan saldo akhir (posting sebelum akhir periode), semuanya dari posting. saldo_cache ikut
// dikirim sebagai sumber kedua: untuk periode yang masih berjalan, saldo akhir harus sama dengannya.
// periode = tanggal 1 bulan itu (YYYY-MM-01); batasnya pukul 00.00 WIB.
func (r Repo) TutupBuku(ctx context.Context, periode string) ([]BarisTutupBuku, RingkasanSistem, error) {
	var s RingkasanSistem
	rows, err := r.db.QueryContext(ctx, `
		WITH batas AS (
		  SELECT $1::date::timestamp AT TIME ZONE 'Asia/Jakarta' AS awal,
		         ($1::date + interval '1 month')::timestamp AT TIME ZONE 'Asia/Jakarta' AS akhir)
		SELECT b.id, b.jenis, coalesce(a.nama, ''),
		       coalesce(sum(p.jumlah) FILTER (WHERE p.dibuat < batas.awal), 0),
		       coalesce(sum(p.jumlah) FILTER (WHERE p.dibuat >= batas.awal AND p.dibuat < batas.akhir AND p.jumlah > 0), 0),
		       coalesce(-sum(p.jumlah) FILTER (WHERE p.dibuat >= batas.awal AND p.dibuat < batas.akhir AND p.jumlah < 0), 0),
		       coalesce(sum(p.jumlah) FILTER (WHERE p.dibuat < batas.akhir), 0),
		       b.saldo_cache
		FROM buku b CROSS JOIN batas
		LEFT JOIN akun a ON a.id = b.akun_id
		LEFT JOIN posting p ON p.buku_id = b.id
		GROUP BY b.id, a.nama, batas.awal, batas.akhir
		ORDER BY b.id`, periode)
	if err != nil {
		return nil, s, err
	}
	defer rows.Close()
	out := []BarisTutupBuku{}
	for rows.Next() {
		var x BarisTutupBuku
		if err := rows.Scan(&x.Buku, &x.Jenis, &x.Nama, &x.SaldoAwal, &x.Masuk, &x.Keluar, &x.SaldoAkhir, &x.SaldoCache); err != nil {
			return nil, s, err
		}
		s.JumlahSaldoAkhir += x.SaldoAkhir
		out = append(out, x)
	}
	if err := rows.Err(); err != nil {
		return nil, s, err
	}
	err = r.db.QueryRowContext(ctx, `
		WITH batas AS (
		  SELECT $1::date::timestamp AT TIME ZONE 'Asia/Jakarta' AS awal,
		         ($1::date + interval '1 month')::timestamp AT TIME ZONE 'Asia/Jakarta' AS akhir),
		per_jurnal AS (
		  SELECT j.id, count(p.id) AS n, coalesce(sum(p.jumlah), 0) AS jumlah
		  FROM jurnal j CROSS JOIN batas LEFT JOIN posting p ON p.jurnal_id = j.id
		  WHERE j.dibuat >= batas.awal AND j.dibuat < batas.akhir
		  GROUP BY j.id)
		SELECT count(*), count(*) FILTER (WHERE n < 2 OR jumlah <> 0), coalesce(sum(jumlah), 0) FROM per_jurnal`,
		periode).Scan(&s.Jurnal, &s.TidakSeimbang, &s.JumlahPosting)
	return out, s, err
}

// --8<-- [end:tutup-buku]
