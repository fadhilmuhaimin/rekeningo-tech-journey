package service

import (
	"context"

	"lab/apit4/internal/repo"
)

// RentanLogBiasa (M38, lab t4-audit): back office yang mencatat aksinya di tabel log biasa (audit_biasa), tanpa rantai
// hash. Semua aksi yang sama berjalan dan tercatat; yang hilang adalah kemampuan memeriksa apakah catatannya pernah diubah.
const RentanLogBiasa = "bo-log-biasa"

// Audit menulis satu baris audit log berantai di transaction tx (ADR 43). Dipanggil di dalam aksi yang dicatat,
// sebelum COMMIT. Mode rentan bo-tanpa-audit (M38, back office versi pertama) tidak menulis apa pun; mode bo-log-biasa
// menulis ke tabel log biasa tanpa hash.
func (s Service) Audit(ctx context.Context, tx repo.Tx, pelaku int64, peran, aksi, objek, alasan string, penyetuju *int64) error {
	if s.rentan == RentanTanpaAudit {
		return nil
	}
	if s.rentan == RentanLogBiasa {
		_, err := tx.TulisAuditBiasa(ctx, s.kini(), pelaku, peran, aksi, objek, alasan, penyetuju)
		return err
	}
	_, err := tx.TulisAudit(ctx, s.kini(), pelaku, peran, aksi, objek, alasan, penyetuju)
	return err
}
