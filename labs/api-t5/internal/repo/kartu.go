package repo

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

// Kartu virtual (Tahap 4, M37, ADR 42). Nomor kartu penuh tidak pernah masuk database atau lab ini: hanya token dari
// penerbit dan empat digit terakhir (Asumsi desain, naskah 3b).

// Kartu adalah satu kartu virtual milik satu akun.
type Kartu struct {
	ID          int64  `json:"id"`
	AkunID      int64  `json:"-"`
	Token       string `json:"-"`
	EmpatDigit  string `json:"empat_digit"`
	Status      string `json:"status"` // aktif, dibekukan, ditutup
	BatasHarian int64  `json:"batas_harian"`
}

// Otorisasi adalah satu persetujuan atau penolakan yang diberikan kepada penerbit, dikenali lewat id_penerbit.
type Otorisasi struct {
	ID              int64
	KartuID         int64
	IDPenerbit      string
	Jumlah          int64
	Status          string // ditahan, ditangkap, dibalik, kedaluwarsa, ditolak
	JurnalTahanID   *int64
	JurnalTangkapID *int64
	TahanSampai     *time.Time
}

const kolomKartu = `id, akun_id, token_penerbit, empat_digit, status, batas_harian`

func bacaKartu(row interface{ Scan(...any) error }) (Kartu, error) {
	var k Kartu
	err := row.Scan(&k.ID, &k.AkunID, &k.Token, &k.EmpatDigit, &k.Status, &k.BatasHarian)
	if errors.Is(err, sql.ErrNoRows) {
		return k, ErrTidakAda
	}
	return k, err
}

// BuatKartu menyimpan kartu yang baru diterbitkan penerbit. Token yang sama dua kali ditolak UNIQUE.
func (r Repo) BuatKartu(ctx context.Context, akun int64, token, empatDigit string) (Kartu, error) {
	return bacaKartu(r.db.QueryRowContext(ctx, `
		INSERT INTO kartu (akun_id, token_penerbit, empat_digit) VALUES ($1, $2, $3) RETURNING `+kolomKartu,
		akun, token, empatDigit))
}

// DaftarKartu: kartu milik satu akun menurut nomor.
func (r Repo) DaftarKartu(ctx context.Context, akun int64) ([]Kartu, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT `+kolomKartu+` FROM kartu WHERE akun_id = $1 ORDER BY id`, akun)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Kartu{}
	for rows.Next() {
		k, err := bacaKartu(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, k)
	}
	return out, rows.Err()
}

// KartuMilik: satu kartu, hanya bila milik akun itu. Kartu orang lain sama dengan kartu yang tidak ada.
func (r Repo) KartuMilik(ctx context.Context, id, akun int64) (Kartu, error) {
	return bacaKartu(r.db.QueryRowContext(ctx, `SELECT `+kolomKartu+` FROM kartu WHERE id = $1 AND akun_id = $2`, id, akun))
}

// UbahStatusKartu mengganti status kartu milik akun itu dan hanya dari salah satu status `dari`. Mengembalikan
// ErrTidakAda bila tidak ada baris yang cocok (bukan milik akun itu, atau status sekarang bukan salah satu `dari`).
func (r Repo) UbahStatusKartu(ctx context.Context, id, akun int64, dari []string, ke string) (Kartu, error) {
	return bacaKartu(r.db.QueryRowContext(ctx, `
		UPDATE kartu SET status = $4 WHERE id = $1 AND akun_id = $2 AND status = ANY($3) RETURNING `+kolomKartu,
		id, akun, dari, ke))
}

// OtorisasiLewatID membaca satu otorisasi menurut id dari penerbit (tanpa lock).
func (r Repo) OtorisasiLewatID(ctx context.Context, idPenerbit string) (Otorisasi, error) {
	return bacaOtorisasi(r.db.QueryRowContext(ctx, `SELECT `+kolomOtorisasi+` FROM otorisasi_kartu WHERE id_penerbit = $1`, idPenerbit))
}

// HoldKedaluwarsa: id_penerbit otorisasi yang masih menahan dana lewat batas `tahan_sampai`.
func (r Repo) HoldKedaluwarsa(ctx context.Context, kini time.Time) ([]string, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id_penerbit FROM otorisasi_kartu
		WHERE status = 'ditahan' AND jurnal_tahan_id IS NOT NULL AND tahan_sampai < $1 ORDER BY id`, kini)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

const kolomOtorisasi = `id, kartu_id, id_penerbit, jumlah, status, jurnal_tahan_id, jurnal_tangkap_id, tahan_sampai`

func bacaOtorisasi(row interface{ Scan(...any) error }) (Otorisasi, error) {
	var o Otorisasi
	err := row.Scan(&o.ID, &o.KartuID, &o.IDPenerbit, &o.Jumlah, &o.Status, &o.JurnalTahanID, &o.JurnalTangkapID, &o.TahanSampai)
	if errors.Is(err, sql.ErrNoRows) {
		return o, ErrTidakAda
	}
	return o, err
}

// KartuAtasToken membaca kartu menurut token dari penerbit (tanpa lock).
func (t Tx) KartuAtasToken(ctx context.Context, token string) (Kartu, error) {
	return bacaKartu(t.tx.QueryRowContext(ctx, `SELECT `+kolomKartu+` FROM kartu WHERE token_penerbit = $1`, token))
}

// KartuStatusAkun: status dan jenis akun pemilik kartu, dibaca di transaction otorisasi.
func (t Tx) KartuStatusAkun(ctx context.Context, akun int64) (jenis, status string, err error) {
	err = t.tx.QueryRowContext(ctx, `SELECT jenis, status FROM akun WHERE id = $1`, akun).Scan(&jenis, &status)
	return jenis, status, err
}

// OtorisasiAtasID membaca satu otorisasi. kunci=true menguncinya (FOR UPDATE) sampai transaction selesai.
func (t Tx) OtorisasiAtasID(ctx context.Context, idPenerbit string, kunci bool) (Otorisasi, error) {
	q := `SELECT ` + kolomOtorisasi + ` FROM otorisasi_kartu WHERE id_penerbit = $1`
	if kunci {
		q += ` FOR UPDATE`
	}
	return bacaOtorisasi(t.tx.QueryRowContext(ctx, q, idPenerbit))
}

// BatasWaktuKunci memasang lock_timeout untuk transaction ini saja (SET LOCAL). Menunggu lock lebih lama dari ini
// gagal dengan SQLSTATE 55P03 (ADR 42: jawaban harus sampai sebelum tenggat penerbit).
func (t Tx) BatasWaktuKunci(ctx context.Context, d time.Duration) error {
	_, err := t.tx.ExecContext(ctx, `SELECT set_config('lock_timeout', $1, true)`, fmt.Sprintf("%dms", d.Milliseconds()))
	return err
}

// JumlahKartuHariIni: jumlah otorisasi kartu itu yang masih ditahan atau sudah ditangkap sejak pukul 00.00 WIB.
func (t Tx) JumlahKartuHariIni(ctx context.Context, kartu int64) (int64, error) {
	var n int64
	err := t.tx.QueryRowContext(ctx, `
		SELECT coalesce(sum(jumlah), 0) FROM otorisasi_kartu
		WHERE kartu_id = $1 AND status IN ('ditahan', 'ditangkap')
		  AND dibuat >= date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta'`, kartu).Scan(&n)
	return n, err
}

// BuatOtorisasi menulis satu baris otorisasi. jurnalTahan kosong pada penolakan dan pada mode rentan kartu-tanpa-hold.
func (t Tx) BuatOtorisasi(ctx context.Context, kartu int64, idPenerbit string, jumlah int64, status string, jurnalTahan *int64, tahanSampai *time.Time) (Otorisasi, error) {
	return bacaOtorisasi(t.tx.QueryRowContext(ctx, `
		INSERT INTO otorisasi_kartu (kartu_id, id_penerbit, jumlah, status, jurnal_tahan_id, tahan_sampai)
		VALUES ($1, $2, $3, $4, $5, $6) RETURNING `+kolomOtorisasi,
		kartu, idPenerbit, jumlah, status, jurnalTahan, tahanSampai))
}

// UbahOtorisasi memindahkan status satu otorisasi, hanya dari `dari`. Mengembalikan false bila status sekarang
// bukan `dari` (transaction lain sudah memindahkannya).
func (t Tx) UbahOtorisasi(ctx context.Context, id int64, dari, ke string, jurnalTangkap *int64) (bool, error) {
	h, err := t.tx.ExecContext(ctx, `
		UPDATE otorisasi_kartu SET status = $3, jurnal_tangkap_id = coalesce($4, jurnal_tangkap_id)
		WHERE id = $1 AND status = $2`, id, dari, ke, jurnalTangkap)
	if err != nil {
		return false, err
	}
	n, _ := h.RowsAffected()
	return n == 1, nil
}

// KartuPostingJurnal: posting satu jurnal menurut nomor, untuk membuat cermin pembalik di transaction yang sama.
func (t Tx) KartuPostingJurnal(ctx context.Context, jurnal int64) ([]Posting, error) {
	rows, err := t.tx.QueryContext(ctx, `SELECT buku_id, jumlah FROM posting WHERE jurnal_id = $1 ORDER BY id`, jurnal)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var p []Posting
	for rows.Next() {
		var x Posting
		if err := rows.Scan(&x.BukuID, &x.Jumlah); err != nil {
			return nil, err
		}
		p = append(p, x)
	}
	return p, rows.Err()
}

// KartuAtasToken: sama dengan Tx.KartuAtasToken, di luar transaction (mode rentan kartu-tanpa-hold tidak memakainya).
func (r Repo) KartuAtasToken(ctx context.Context, token string) (Kartu, error) {
	return bacaKartu(r.db.QueryRowContext(ctx, `SELECT `+kolomKartu+` FROM kartu WHERE token_penerbit = $1`, token))
}

// KartuAtasID membaca kartu menurut nomor di dalam transaction (clearing dan reversal mencari pemiliknya).
func (t Tx) KartuAtasID(ctx context.Context, id int64) (Kartu, error) {
	return bacaKartu(t.tx.QueryRowContext(ctx, `SELECT `+kolomKartu+` FROM kartu WHERE id = $1`, id))
}

// KartuKunciHidup: jurnal yang sudah diikat ke key ledger itu, bila key masih berlaku pada waktu kini. Dipakai
// otorisasi untuk menemukan hold yang sudah dijurnal tetapi barisnya belum tertulis (ADR 42, ADR 37).
func (t Tx) KartuKunciHidup(ctx context.Context, kunci string, kini time.Time) (*int64, error) {
	var j *int64
	err := t.tx.QueryRowContext(ctx, `
		SELECT jurnal_id FROM kunci_idempotensi WHERE kunci = $1 AND kedaluwarsa > $2 AND status = 'selesai'`,
		kunci, kini).Scan(&j)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return j, err
}
