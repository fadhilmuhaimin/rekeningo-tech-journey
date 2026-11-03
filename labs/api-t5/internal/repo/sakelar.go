package repo

import (
	"context"
	"database/sql"
	"errors"
)

// Sakelar (lab t5-rollout, M49, ADR 55): satu flag bernama di tabel sakelar (migrasi 000025), dibaca semua pod.

// SakelarBaca membaca nilai satu sakelar. Baris yang tidak ada mengembalikan ErrTidakAda: sakelar yang belum pernah
// ditulis tidak dianggap menyala.
func (r Repo) SakelarBaca(ctx context.Context, nama string) (bool, error) {
	var nilai bool
	err := r.db.QueryRowContext(ctx, `SELECT nilai FROM sakelar WHERE nama = $1`, nama).Scan(&nilai)
	if errors.Is(err, sql.ErrNoRows) {
		return false, ErrTidakAda
	}
	return nilai, err
}

// SakelarSet menulis nilai satu sakelar dalam transaction pemanggil (bersama baris audit).
func (t Tx) SakelarSet(ctx context.Context, nama string, nilai bool, oleh int64) error {
	_, err := t.tx.ExecContext(ctx, `
		INSERT INTO sakelar (nama, nilai, diubah_oleh, diubah) VALUES ($1, $2, $3, now())
		ON CONFLICT (nama) DO UPDATE SET nilai = EXCLUDED.nilai, diubah_oleh = EXCLUDED.diubah_oleh, diubah = now()`,
		nama, nilai, oleh)
	return err
}
