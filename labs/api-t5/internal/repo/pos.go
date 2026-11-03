package repo

import (
	"context"
	"database/sql"
	"errors"
)

// MitraAkun membaca jenis akun dan mitra POS yang memilikinya (akun.mitra_pos_id; kosong = bukan merchant mitra).
// Dipakai API untuk mitra POS (lab t5-waf, ADR 56) memeriksa cakupan kunci: merchant di alamat harus milik mitra
// yang disebut gerbang.
func (r Repo) MitraAkun(ctx context.Context, akun int64) (mitra sql.NullInt64, jenis string, err error) {
	err = r.db.QueryRowContext(ctx, `SELECT mitra_pos_id, jenis FROM akun WHERE id = $1`, akun).Scan(&mitra, &jenis)
	if errors.Is(err, sql.ErrNoRows) {
		return mitra, jenis, ErrTidakAda
	}
	return mitra, jenis, err
}
