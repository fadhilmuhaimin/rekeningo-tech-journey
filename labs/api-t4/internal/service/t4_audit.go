package service

import (
	"context"

	"lab/apit4/internal/repo"
)

// Audit menulis satu baris audit log berantai di transaction tx (ADR 43). Dipanggil di dalam aksi yang dicatat,
// sebelum COMMIT. Mode rentan bo-tanpa-audit (M38, back office versi pertama) tidak menulis apa pun.
func (s Service) Audit(ctx context.Context, tx repo.Tx, pelaku int64, peran, aksi, objek, alasan string, penyetuju *int64) error {
	if s.rentan == RentanTanpaAudit {
		return nil
	}
	_, err := tx.TulisAudit(ctx, s.kini(), pelaku, peran, aksi, objek, alasan, penyetuju)
	return err
}
