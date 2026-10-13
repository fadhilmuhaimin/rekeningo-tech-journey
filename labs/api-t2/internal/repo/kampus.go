package repo

import "context"

// AkunBaru adalah satu akun kampus yang didaftarkan sebelum migrasi ke ledger (data lab, keputusan 413).
type AkunBaru struct {
	ID            int64
	Jenis         string
	Nama          string
	Email         string
	NomorKaryawan *string
	PasswordHash  string
}

// DaftarkanKampus menulis akun-akun baru dalam satu transaction. Dipanggil -seed-kampus sesudah expand:
// kolom Tahap 2 sudah ada, buku belum (dibuat migrasi 000012 untuk semua akun sekaligus).
func (r Repo) DaftarkanKampus(ctx context.Context, akun []AkunBaru) error {
	return r.DalamTx(ctx, func(t Tx) error {
		for _, a := range akun {
			if _, err := t.tx.ExecContext(ctx, `
				INSERT INTO akun (id, jenis, nama, email, password_hash, nomor_karyawan, wajib_ganti_password)
				VALUES ($1, $2, $3, $4, $5, $6, true)`,
				a.ID, a.Jenis, a.Nama, a.Email, a.PasswordHash, a.NomorKaryawan); err != nil {
				return err
			}
		}
		return nil
	})
}
