package repo

import (
	"context"
	"time"
)

// TulisAuditBiasa menambah satu baris di audit_biasa: log versi pertama (mode rentan bo-log-biasa, M38). Isinya sama
// dengan baris audit_log tanpa hash, jadi tidak ada cara memeriksa apakah baris itu pernah diubah. Tabelnya dibuat lab
// t4-audit dan tes (audit_biasa.sql), bukan migration.
func (t Tx) TulisAuditBiasa(ctx context.Context, waktu time.Time, pelaku int64, peran, aksi, objek, alasan string, penyetuju *int64) (int64, error) {
	var alasanSQL *string
	if alasan != "" {
		alasanSQL = &alasan
	}
	var id int64
	err := t.tx.QueryRowContext(ctx, `
		INSERT INTO audit_biasa (waktu, pelaku_id, peran, aksi, objek, alasan, penyetuju_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
		waktu.UTC().Truncate(time.Microsecond), pelaku, peran, aksi, objek, alasanSQL, penyetuju).Scan(&id)
	return id, err
}
