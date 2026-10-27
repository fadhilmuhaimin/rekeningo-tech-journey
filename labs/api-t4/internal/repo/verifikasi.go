package repo

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// Verifikasi identitas (M31, M33, ADR 36, ADR 38). File ada di penyimpanan objek; tabel hanya menyimpan kunci
// objek dan checksum. Pekerjaan ke layanan verifikasi memakai baris outbox bertujuan `verifikasi` (ADR 24, 25).

type Verifikasi struct {
	ID              int64      `json:"id"`
	AkunID          int64      `json:"-"`
	Subjek          string     `json:"subjek"`
	Status          string     `json:"status"`
	TingkatDiminta  string     `json:"tingkat_diminta"`
	ReferensiVendor *string    `json:"-"`
	KunciKartu      string     `json:"-"`
	KunciSwafoto    string     `json:"-"`
	ChecksumKartu   string     `json:"checksum_kartu"`
	ChecksumSwafoto string     `json:"checksum_swafoto"`
	HapusPada       *time.Time `json:"hapus_pada,omitempty"`
	Diajukan        time.Time  `json:"diajukan"`
	Selesai         *time.Time `json:"selesai,omitempty"`
}

const kolomVerifikasi = `id, akun_id, subjek, status, tingkat_diminta, referensi_vendor, berkas_kartu_kunci, berkas_swafoto_kunci,
	checksum_kartu, checksum_swafoto, hapus_pada, diajukan, selesai`

func pindaiVerifikasi(row interface{ Scan(...any) error }) (Verifikasi, error) {
	var v Verifikasi
	err := row.Scan(&v.ID, &v.AkunID, &v.Subjek, &v.Status, &v.TingkatDiminta, &v.ReferensiVendor, &v.KunciKartu, &v.KunciSwafoto,
		&v.ChecksumKartu, &v.ChecksumSwafoto, &v.HapusPada, &v.Diajukan, &v.Selesai)
	if errors.Is(err, sql.ErrNoRows) {
		return v, ErrTidakAda
	}
	return v, err
}

func (r Repo) Verifikasi(ctx context.Context, id int64) (Verifikasi, error) {
	return pindaiVerifikasi(r.db.QueryRowContext(ctx, `SELECT `+kolomVerifikasi+` FROM verifikasi WHERE id = $1`, id))
}

// BuatVerifikasi menulis satu pengajuan. Indeks unik verifikasi_satu_berjalan menolak pengajuan kedua selagi
// yang pertama belum selesai (kesalahan 23505, dipetakan service).
func (t Tx) BuatVerifikasi(ctx context.Context, akun int64, subjek, kunciKartu, kunciSwafoto, ckKartu, ckSwafoto string) (int64, error) {
	var id int64
	err := t.tx.QueryRowContext(ctx, `
		INSERT INTO verifikasi (akun_id, subjek, berkas_kartu_kunci, berkas_swafoto_kunci, checksum_kartu, checksum_swafoto)
		VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, akun, subjek, kunciKartu, kunciSwafoto, ckKartu, ckSwafoto).Scan(&id)
	return id, err
}

// TulisOutboxVerifikasi menulis pekerjaan verifikasi di transaction yang sama dengan pengajuannya. Kelas 1: di
// belakang notifikasi uang (kelas 0) dan di depan promo (kelas 2), supaya pekerjaan verifikasi tidak menahan uang.
func (t Tx) TulisOutboxVerifikasi(ctx context.Context, akun int64, payload []byte) error {
	_, err := t.tx.ExecContext(ctx, `
		INSERT INTO outbox (akun_id, kelas, jenis, tujuan, payload) VALUES ($1, 1, 'verifikasi', 'verifikasi', $2)`, akun, payload)
	return err
}

// SelesaikanVerifikasi menutup pengajuan dengan hasil akhir dari layanan verifikasi (lulus atau ditolak). Hanya
// pengajuan yang masih berjalan yang berubah, jadi pekerjaan yang diulang tidak mengubah hasil. Hasil lulus
// menaikkan tingkat akun di transaction yang sama.
func (r Repo) SelesaikanVerifikasi(ctx context.Context, id int64, status, referensi string, kini time.Time) (bool, error) {
	var berubah bool
	err := r.DalamTx(ctx, func(t Tx) error {
		var akun int64
		err := t.tx.QueryRowContext(ctx, `
			UPDATE verifikasi SET status = $2, referensi_vendor = $3, selesai = $4,
			       hapus_pada = $4::timestamptz + interval '30 days'
			WHERE id = $1 AND status IN ('diajukan', 'tidak_pasti') RETURNING akun_id`, id, status, referensi, kini).Scan(&akun)
		if errors.Is(err, sql.ErrNoRows) {
			return nil
		}
		if err != nil {
			return err
		}
		berubah = true
		if status == "lulus" {
			_, err = t.tx.ExecContext(ctx, `UPDATE akun SET tingkat = 'terverifikasi' WHERE id = $1`, akun)
		}
		return err
	})
	return berubah, err
}

// TandaiVerifikasi mengubah status pengajuan yang masih berjalan tanpa menyelesaikannya (tidak_pasti saat timeout,
// gagal saat pekerjaan masuk dead-letter karena layanan verifikasi tidak tersedia).
func (r Repo) TandaiVerifikasi(ctx context.Context, id int64, status string, kini time.Time) error {
	if status == "gagal" {
		_, err := r.db.ExecContext(ctx, `UPDATE verifikasi SET status = 'gagal', selesai = $2
			WHERE id = $1 AND status IN ('diajukan', 'tidak_pasti')`, id, kini)
		return err
	}
	_, err := r.db.ExecContext(ctx, `UPDATE verifikasi SET status = $2 WHERE id = $1 AND status IN ('diajukan', 'tidak_pasti')`, id, status)
	return err
}

// BuatAkunPublik membuat akun yang mendaftar sendiri (pemakai atau merchant) dengan bukunya, di satu transaction.
// Nomor dari urutan akun_publik_id (migrasi 000020).
func (r Repo) BuatAkunPublik(ctx context.Context, jenis, nama, email, hash string) (int64, error) {
	var id int64
	err := r.DalamTx(ctx, func(t Tx) error {
		if err := t.tx.QueryRowContext(ctx, `SELECT nextval('akun_publik_id')`).Scan(&id); err != nil {
			return err
		}
		if _, err := t.tx.ExecContext(ctx, `
			INSERT INTO akun (id, jenis, nama, email, password_hash) VALUES ($1, $2, $3, $4, $5)`, id, jenis, nama, email, hash); err != nil {
			return err
		}
		var batasHarian *int64
		if jenis == "pemakai" {
			v := int64(500000)
			batasHarian = &v
		}
		_, err := t.tx.ExecContext(ctx, `INSERT INTO buku (akun_id, jenis, batas_harian) VALUES ($1, $2, $3)`, id, jenis, batasHarian)
		return err
	})
	return id, err
}
