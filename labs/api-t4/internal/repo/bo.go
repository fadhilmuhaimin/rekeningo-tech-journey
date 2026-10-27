package repo

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// Akses data back office tim risk (M38, ADR 43). Semua fungsi memakai Tx: aksi, pembacaan yang dicatat, dan baris
// audit-nya COMMIT atau ROLLBACK bersama. Aturan (siapa boleh, perlu alasan, perlu persetujuan) ada di service.

// AkunBO adalah ringkasan akun untuk tim risk. Tanpa email, password, atau nomor identitas.
type AkunBO struct {
	ID      int64  `json:"id"`
	Jenis   string `json:"jenis"`
	Nama    string `json:"nama"`
	Tingkat string `json:"tingkat"`
	Status  string `json:"status"`
	Saldo   int64  `json:"saldo"`
}

// AkunBO membaca satu akun dengan saldo buku-nya. ErrTidakAda bila akun tidak ada.
func (t Tx) AkunBO(ctx context.Context, id int64) (AkunBO, error) {
	var a AkunBO
	err := t.tx.QueryRowContext(ctx, `
		SELECT a.id, a.jenis, a.nama, a.tingkat, a.status, coalesce(b.saldo_cache, 0)
		FROM akun a LEFT JOIN buku b ON b.akun_id = a.id WHERE a.id = $1`, id).
		Scan(&a.ID, &a.Jenis, &a.Nama, &a.Tingkat, &a.Status, &a.Saldo)
	if errors.Is(err, sql.ErrNoRows) {
		return a, ErrTidakAda
	}
	return a, err
}

// JenisAkun: jenis satu akun, dibaca di dalam transaction. ErrTidakAda bila akun tidak ada.
func (t Tx) JenisAkun(ctx context.Context, id int64) (string, error) {
	var j string
	err := t.tx.QueryRowContext(ctx, `SELECT jenis FROM akun WHERE id = $1`, id).Scan(&j)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrTidakAda
	}
	return j, err
}

// UbahStatusAkun mengubah status dari `dari` ke `ke`. false bila akun tidak berstatus `dari` (sudah berubah, atau
// tidak ada): UPDATE bersyarat, jadi dua petugas yang membekukan akun yang sama bersamaan hanya satu yang berhasil.
func (t Tx) UbahStatusAkun(ctx context.Context, id int64, dari, ke string) (bool, error) {
	h, err := t.tx.ExecContext(ctx, `UPDATE akun SET status = $3 WHERE id = $1 AND status = $2`, id, dari, ke)
	if err != nil {
		return false, err
	}
	n, err := h.RowsAffected()
	return n == 1, err
}

// UbahBatasHarian mengganti batas transfer harian buku milik akun karyawan atau pemakai. false bila akun itu tidak
// punya buku berbatas harian (merchant, warung, sistem).
func (t Tx) UbahBatasHarian(ctx context.Context, akun, nilai int64) (bool, error) {
	h, err := t.tx.ExecContext(ctx,
		`UPDATE buku SET batas_harian = $2 WHERE akun_id = $1 AND jenis IN ('karyawan', 'pemakai')`, akun, nilai)
	if err != nil {
		return false, err
	}
	n, err := h.RowsAffected()
	return n == 1, err
}

// BarisVerifikasi adalah satu pengajuan verifikasi untuk dibaca tim risk. Kunci objek tidak ikut JSON: file dibuka
// lewat endpoint berkas yang menulis audit, bukan lewat kunci.
type BarisVerifikasi struct {
	ID              int64      `json:"id"`
	AkunID          int64      `json:"akun_id"`
	Subjek          string     `json:"subjek"`
	Status          string     `json:"status"`
	TingkatDiminta  string     `json:"tingkat_diminta"`
	ReferensiVendor *string    `json:"referensi_vendor"`
	ChecksumKartu   string     `json:"checksum_kartu"`
	ChecksumSwafoto string     `json:"checksum_swafoto"`
	HapusPada       *time.Time `json:"hapus_pada"`
	Diajukan        time.Time  `json:"diajukan"`
	Selesai         *time.Time `json:"selesai"`

	KunciKartu   string `json:"-"`
	KunciSwafoto string `json:"-"`
}

// Verifikasi membaca satu pengajuan menurut nomor. ErrTidakAda bila tidak ada.
func (t Tx) Verifikasi(ctx context.Context, id int64) (BarisVerifikasi, error) {
	var v BarisVerifikasi
	err := t.tx.QueryRowContext(ctx, `
		SELECT id, akun_id, subjek, status, tingkat_diminta, referensi_vendor, checksum_kartu, checksum_swafoto,
		       hapus_pada, diajukan, selesai, berkas_kartu_kunci, berkas_swafoto_kunci
		FROM verifikasi WHERE id = $1`, id).
		Scan(&v.ID, &v.AkunID, &v.Subjek, &v.Status, &v.TingkatDiminta, &v.ReferensiVendor, &v.ChecksumKartu,
			&v.ChecksumSwafoto, &v.HapusPada, &v.Diajukan, &v.Selesai, &v.KunciKartu, &v.KunciSwafoto)
	if errors.Is(err, sql.ErrNoRows) {
		return v, ErrTidakAda
	}
	return v, err
}

// VerifikasiMerchantTerakhir mengunci pengajuan merchant terbaru milik satu akun merchant (FOR UPDATE): dua
// petugas yang memutuskan pengajuan yang sama bersamaan diurutkan di sini, yang kedua membaca status yang sudah
// diputuskan. ErrTidakAda bila akun itu bukan merchant atau tidak pernah mengajukan.
func (t Tx) VerifikasiMerchantTerakhir(ctx context.Context, akun int64) (id int64, status string, err error) {
	err = t.tx.QueryRowContext(ctx, `
		SELECT v.id, v.status FROM verifikasi v JOIN akun a ON a.id = v.akun_id
		WHERE v.akun_id = $1 AND v.subjek = 'merchant' AND a.jenis = 'merchant'
		ORDER BY v.id DESC LIMIT 1 FOR UPDATE OF v`, akun).Scan(&id, &status)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, "", ErrTidakAda
	}
	return id, status, err
}

// PutuskanVerifikasi menutup satu pengajuan yang masih `diajukan`: status akhir, waktu selesai, dan kapan file
// identitasnya dihapus (retensi). false bila pengajuan itu sudah tidak berstatus diajukan.
func (t Tx) PutuskanVerifikasi(ctx context.Context, id int64, status string, selesai, hapusPada time.Time) (bool, error) {
	h, err := t.tx.ExecContext(ctx, `
		UPDATE verifikasi SET status = $2, selesai = $3, hapus_pada = $4 WHERE id = $1 AND status = 'diajukan'`,
		id, status, selesai, hapusPada)
	if err != nil {
		return false, err
	}
	n, err := h.RowsAffected()
	return n == 1, err
}

// NaikkanTingkat menetapkan akun terverifikasi. Hanya dipanggil bersama PutuskanVerifikasi(lulus).
func (t Tx) NaikkanTingkat(ctx context.Context, akun int64) error {
	_, err := t.tx.ExecContext(ctx, `UPDATE akun SET tingkat = 'terverifikasi' WHERE id = $1`, akun)
	return err
}
