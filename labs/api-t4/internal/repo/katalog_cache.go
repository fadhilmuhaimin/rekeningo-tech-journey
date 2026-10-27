package repo

import (
	"context"
	"database/sql"
	"errors"
)

// UbahProdukTx sama dengan UbahProduk, tetapi UPDATE dan COMMIT dipisah: `sebelumCommit` dipanggil sesudah baris
// diubah dan sebelum COMMIT, hanya bila versi cocok. Dipakai lab t3-cache untuk menaruh hapus-kunci (urutan
// rentan) dan gerbang lab di celah itu. Galat dari `sebelumCommit` membatalkan perubahan.
func (r Repo) UbahProdukTx(ctx context.Context, id, akun int64, harga *int64, stok *int, versi int,
	sebelumCommit func(context.Context) error) (hasil StokProduk, ok bool, err error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return hasil, false, err
	}
	defer tx.Rollback()
	err = tx.QueryRowContext(ctx, `
		UPDATE produk SET harga = coalesce($3, harga), stok = coalesce($4, stok), versi = versi + 1, diubah = now()
		WHERE id = $1 AND akun_id = $2 AND versi = $5
		RETURNING id, harga, stok, versi`, id, akun, harga, stok, versi).Scan(&hasil.ID, &hasil.Harga, &hasil.Stok, &hasil.Versi)
	if err == nil {
		if sebelumCommit != nil {
			if err := sebelumCommit(ctx); err != nil {
				return StokProduk{}, false, err
			}
		}
		if err := tx.Commit(); err != nil {
			return StokProduk{}, false, err
		}
		return hasil, true, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return hasil, false, err
	}
	err = tx.QueryRowContext(ctx, `SELECT id, harga, stok, versi FROM produk WHERE id = $1 AND akun_id = $2`, id, akun).
		Scan(&hasil.ID, &hasil.Harga, &hasil.Stok, &hasil.Versi)
	if errors.Is(err, sql.ErrNoRows) {
		return hasil, false, ErrTidakAda
	}
	return hasil, false, err
}
