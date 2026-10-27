package repo

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// QR (ADR 40, M35): satu baris per kode QR milik merchant. QR dinamis terikat ke nominal dan berlaku sebentar,
// dibayar sekali; QR statis tidak punya nominal atau masa berlaku dan dibayar berkali-kali. Isi QR di lab ini
// hanya id-nya: payload dengan CRC ada di lab t4-qr.

// QR adalah satu baris tabel qr.
type QR struct {
	ID            string     `json:"id"`
	AkunID        int64      `json:"-"`
	Jenis         string     `json:"jenis"`
	Nominal       *int64     `json:"nominal,omitempty"`
	BerlakuSampai *time.Time `json:"berlaku_sampai,omitempty"`
	Status        string     `json:"-"`
	JurnalID      *int64     `json:"-"`
}

// QRDenganMerchant adalah QR beserta keadaan akun merchant pemiliknya, dibaca dari tabel akun, bukan dari isi QR.
type QRDenganMerchant struct {
	QR
	MerchantNama    string
	MerchantKota    *string
	MerchantJenis   string
	MerchantTingkat string
	MerchantStatus  string
}

const kolomQR = `q.id, q.akun_id, q.jenis, q.nominal, q.berlaku_sampai, q.status, q.jurnal_id,
	a.nama, k.nama, a.jenis, a.tingkat, a.status`

func pindaiQR(row interface{ Scan(...any) error }) (QRDenganMerchant, error) {
	var x QRDenganMerchant
	err := row.Scan(&x.ID, &x.AkunID, &x.Jenis, &x.Nominal, &x.BerlakuSampai, &x.Status, &x.JurnalID,
		&x.MerchantNama, &x.MerchantKota, &x.MerchantJenis, &x.MerchantTingkat, &x.MerchantStatus)
	if errors.Is(err, sql.ErrNoRows) {
		return x, ErrTidakAda
	}
	return x, err
}

// BuatQR menulis satu QR baru. Constraint qr_dinamis_terikat menolak QR dinamis tanpa nominal atau masa berlaku
// dan QR statis dengan salah satunya.
func (r Repo) BuatQR(ctx context.Context, akun int64, jenis string, nominal *int64, berlakuSampai *time.Time) (QR, error) {
	q := QR{AkunID: akun, Jenis: jenis, Nominal: nominal, BerlakuSampai: berlakuSampai, Status: "aktif"}
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO qr (akun_id, jenis, nominal, berlaku_sampai) VALUES ($1, $2, $3, $4) RETURNING id`,
		akun, jenis, nominal, berlakuSampai).Scan(&q.ID)
	return q, err
}

// LihatQR membaca satu QR dan merchant pemiliknya tanpa kunci (layar konfirmasi).
func (r Repo) LihatQR(ctx context.Context, id string) (QRDenganMerchant, error) {
	return pindaiQR(r.db.QueryRowContext(ctx, `
		SELECT `+kolomQR+`
		FROM qr q JOIN akun a ON a.id = q.akun_id LEFT JOIN kota k ON k.id = a.kota_id
		WHERE q.id = $1`, id))
}

// --8<-- [start:kunci-qr]
// KunciQR membaca satu QR dengan barisnya dikunci (FOR UPDATE) sampai transaction selesai. Dua pembayaran bersamaan
// ke QR dinamis yang sama antre di sini; yang kedua membaca status yang sudah ditulis yang pertama. Urutan lock di
// semua jalur pembayaran QR sama: baris qr dulu, lalu buku menurut id (ADR 13).
func (t Tx) KunciQR(ctx context.Context, id string) (QRDenganMerchant, error) {
	return pindaiQR(t.tx.QueryRowContext(ctx, `
		SELECT `+kolomQR+`
		FROM qr q JOIN akun a ON a.id = q.akun_id LEFT JOIN kota k ON k.id = a.kota_id
		WHERE q.id = $1
		FOR UPDATE OF q`, id))
}

// --8<-- [end:kunci-qr]

// TandaiQRTerpakai mengikat QR dinamis ke jurnal pembayarannya. False berarti QR tidak lagi aktif: ada pembayaran
// lain yang lebih dulu, dan pemanggil membatalkan transaction-nya. Syarat status = 'aktif' adalah pengaman kedua
// sesudah KunciQR.
func (t Tx) TandaiQRTerpakai(ctx context.Context, id string, jurnal int64) (bool, error) {
	h, err := t.tx.ExecContext(ctx,
		`UPDATE qr SET status = 'terpakai', jurnal_id = $2 WHERE id = $1 AND status = 'aktif'`, id, jurnal)
	if err != nil {
		return false, err
	}
	n, _ := h.RowsAffected()
	return n == 1, nil
}

// TandaiQRKedaluwarsa menutup QR dinamis yang sudah lewat masa berlakunya.
func (t Tx) TandaiQRKedaluwarsa(ctx context.Context, id string) error {
	_, err := t.tx.ExecContext(ctx, `UPDATE qr SET status = 'kedaluwarsa' WHERE id = $1 AND status = 'aktif'`, id)
	return err
}

// BekukanAkun mengubah status akun aktif menjadi dibekukan. False bila akun itu sudah dibekukan.
func (t Tx) BekukanAkun(ctx context.Context, akun int64) (bool, error) {
	h, err := t.tx.ExecContext(ctx, `UPDATE akun SET status = 'dibekukan' WHERE id = $1 AND status = 'aktif'`, akun)
	if err != nil {
		return false, err
	}
	n, _ := h.RowsAffected()
	return n == 1, nil
}
