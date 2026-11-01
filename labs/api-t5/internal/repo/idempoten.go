package repo

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// HasilKlaim adalah putusan klaim satu Idempotency-Key (ADR 14, jalur opsional Tahap 3: lab-t3-offline).
type HasilKlaim int

const (
	KlaimBaru     HasilKlaim = iota // pemanggil memegang key ini: kerjakan, lalu SelesaiKunci atau LepasKunci
	KlaimUlang                      // key selesai dan permintaannya sama: kirim respons tersimpan
	KlaimBeda                       // key dipakai untuk permintaan lain, atau milik akun lain
	KlaimBerjalan                   // permintaan lain dengan key ini belum selesai
)

// --8<-- [start:klaim-kunci]
// KlaimKunci mencatat key di kunci_idempotensi dalam satu perintah. Key yang belum ada, atau yang sudah lewat
// `kedaluwarsa` pada waktu `kini`, menjadi milik pemanggil (KlaimBaru): key kedaluwarsa diperlakukan sebagai belum
// pernah ada, tanpa job pembersih. Key yang masih berlaku tidak diubah; baris itu dibaca untuk menentukan
// KlaimUlang (selesai, hash sama, akun sama), KlaimBeda (hash atau akun lain), atau KlaimBerjalan (status diproses).
// Tersimpan dikembalikan hanya untuk KlaimUlang.
func (r Repo) KlaimKunci(ctx context.Context, kunci string, akun int64, hash string, kini, kedaluwarsa time.Time) (HasilKlaim, []byte, error) {
	h, err := r.db.ExecContext(ctx, `
		INSERT INTO kunci_idempotensi (kunci, akun_id, hash_permintaan, status, kedaluwarsa)
		VALUES ($1, $2, $3, 'diproses', $5)
		ON CONFLICT (kunci) DO UPDATE
		   SET akun_id = EXCLUDED.akun_id, hash_permintaan = EXCLUDED.hash_permintaan, status = 'diproses',
		       respons = NULL, jurnal_id = NULL, kedaluwarsa = EXCLUDED.kedaluwarsa
		 WHERE kunci_idempotensi.kedaluwarsa <= $4`, kunci, akun, hash, kini, kedaluwarsa)
	if err != nil {
		return 0, nil, err
	}
	if n, _ := h.RowsAffected(); n == 1 {
		return KlaimBaru, nil, nil
	}
	var pemilik int64
	var hashAda, status string
	var respons []byte
	err = r.db.QueryRowContext(ctx, `
		SELECT akun_id, hash_permintaan, status, respons FROM kunci_idempotensi WHERE kunci = $1`, kunci).
		Scan(&pemilik, &hashAda, &status, &respons)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil, errors.New("key hilang di antara dua perintah: ulangi permintaan")
	}
	if err != nil {
		return 0, nil, err
	}
	switch {
	case pemilik != akun || hashAda != hash:
		return KlaimBeda, nil, nil // respons milik permintaan lain tidak pernah dikirim
	case status == "selesai":
		return KlaimUlang, respons, nil
	default:
		return KlaimBerjalan, nil, nil
	}
}

// --8<-- [end:klaim-kunci]

// SelesaiKunci menyimpan respons untuk key yang sedang diproses; hanya baris berstatus diproses yang berubah.
func (r Repo) SelesaiKunci(ctx context.Context, kunci string, respons []byte) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE kunci_idempotensi SET status = 'selesai', respons = $2::jsonb WHERE kunci = $1 AND status = 'diproses'`,
		kunci, string(respons))
	return err
}

// LepasKunci membuang key yang masih diproses: permintaan gagal karena kesalahan server (5xx), tidak ada respons
// yang layak diulang, jadi ulangan boleh mengerjakannya dari awal.
func (r Repo) LepasKunci(ctx context.Context, kunci string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM kunci_idempotensi WHERE kunci = $1 AND status = 'diproses'`, kunci)
	return err
}

// TimpaStok mengganti stok satu produk milik warung TANPA memeriksa versi, lalu menaikkan versi. Ini perilaku
// endpoint stok sebelum ADR 29 (mode rentan stok-timpa, M24): siapa pun yang terakhir mengirim menang.
func (r Repo) TimpaStok(ctx context.Context, id, akun int64, stok int) (StokProduk, error) {
	var h StokProduk
	err := r.db.QueryRowContext(ctx, `
		UPDATE produk SET stok = $3, versi = versi + 1, diubah = now()
		WHERE id = $1 AND akun_id = $2 RETURNING id, harga, stok, versi`, id, akun, stok).
		Scan(&h.ID, &h.Harga, &h.Stok, &h.Versi)
	if errors.Is(err, sql.ErrNoRows) {
		return h, ErrTidakAda
	}
	return h, err
}
