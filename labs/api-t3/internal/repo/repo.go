// Package repo adalah lapisan akses data: hanya SQL. Tidak tahu HTTP, tidak tahu aturan uang.
// Tahap 2: saldo dibaca dari buku.saldo_cache; uang hanya berpindah lewat jurnal dan posting (ledger.go).
// Tahap 3 (lab api-t3): outbox, perangkat, katalog, promo, dan operasi sinkron punya berkas sendiri.
package repo

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

type Akun struct {
	ID    int64  `json:"id"`
	Jenis string `json:"jenis"`
	Nama  string `json:"nama"`
	Saldo int64  `json:"saldo"` // buku.saldo_cache; 0 untuk akun tanpa buku (admin)
	// NomorKaryawan ditambah Tahap 2 (field baru, app lama mengabaikannya).
	NomorKaryawan *string `json:"nomor_karyawan,omitempty"`
	// KotaID ditambah Tahap 3 (migrasi 000015); kosong untuk admin dan sistem.
	KotaID *int64 `json:"kota_id,omitempty"`
}

var ErrTidakAda = errors.New("tidak ada")

type Repo struct{ db *sql.DB }

func Baru(db *sql.DB) Repo { return Repo{db: db} }

func (r Repo) Akun(ctx context.Context, id int64) (Akun, error) {
	var a Akun
	err := r.db.QueryRowContext(ctx, `
		SELECT a.id, a.jenis, a.nama, coalesce(b.saldo_cache, 0), a.nomor_karyawan, a.kota_id
		FROM akun a LEFT JOIN buku b ON b.akun_id = a.id
		WHERE a.id = $1`, id).
		Scan(&a.ID, &a.Jenis, &a.Nama, &a.Saldo, &a.NomorKaryawan, &a.KotaID)
	if errors.Is(err, sql.ErrNoRows) {
		return a, ErrTidakAda
	}
	return a, err
}

// AkunMasuk: kolom yang dibaca saat login. Kolom M16 (000009) dipakai sejak lab-api-t2a (keputusan 645).
// Kunci tidak dibaca di sini: PercobaanLogin membacanya dengan baris dikunci (keputusan 718).
type AkunMasuk struct {
	ID           int64
	Jenis        string
	PasswordHash string
	WajibGanti   bool
}

func (r Repo) AkunLewatEmail(ctx context.Context, email string) (AkunMasuk, error) {
	var a AkunMasuk
	err := r.db.QueryRowContext(ctx, `
		SELECT id, jenis, password_hash, wajib_ganti_password FROM akun WHERE email = $1`, email).
		Scan(&a.ID, &a.Jenis, &a.PasswordHash, &a.WajibGanti)
	if errors.Is(err, sql.ErrNoRows) {
		return a, ErrTidakAda
	}
	return a, err
}

// --8<-- [start:gagal-login]
// PercobaanLogin membaca penghitung gagal dan kunci dengan baris akun dikunci (FOR UPDATE). Percobaan lain untuk
// akun yang sama menunggu sampai transaction ini selesai, lalu membaca penghitung dan kunci yang baru, jadi
// tebakan bersamaan tidak bisa lewat ambang (keputusan 718).
func (t Tx) PercobaanLogin(ctx context.Context, id int64) (gagal int, terkunciSampai *time.Time, err error) {
	err = t.tx.QueryRowContext(ctx,
		`SELECT gagal_login, terkunci_sampai FROM akun WHERE id = $1 FOR UPDATE`, id).Scan(&gagal, &terkunciSampai)
	return gagal, terkunciSampai, err
}

// CatatPercobaanLogin menyimpan penghitung baru, dan kunci bila sampai ambang (nil = kunci lama tidak diubah).
func (t Tx) CatatPercobaanLogin(ctx context.Context, id int64, gagal int, kunciSampai *time.Time) error {
	_, err := t.tx.ExecContext(ctx,
		`UPDATE akun SET gagal_login = $2, terkunci_sampai = coalesce($3, terkunci_sampai) WHERE id = $1`,
		id, gagal, kunciSampai)
	return err
}

// ResetGagalLogin sesudah password benar: penghitung dan kunci yang dipasang percobaan ini dihapus.
func (r Repo) ResetGagalLogin(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, `UPDATE akun SET gagal_login = 0, terkunci_sampai = NULL
		WHERE id = $1 AND (gagal_login <> 0 OR terkunci_sampai IS NOT NULL)`, id)
	return err
}

// --8<-- [end:gagal-login]

// GantiPassword menyimpan hash baru, mencabut wajib ganti, dan menghapus semua sesi akun itu dalam satu
// transaction: sesi yang dibuka dengan password lama (mungkin oleh orang lain) ikut berakhir.
func (r Repo) GantiPassword(ctx context.Context, id int64, hash string) error {
	return r.DalamTx(ctx, func(t Tx) error {
		if _, err := t.tx.ExecContext(ctx,
			`UPDATE akun SET password_hash = $2, wajib_ganti_password = false WHERE id = $1`, id, hash); err != nil {
			return err
		}
		_, err := t.tx.ExecContext(ctx, `DELETE FROM sesi WHERE akun_id = $1`, id)
		return err
	})
}

// --8<-- [start:sesi]
// SimpanSesi: jenis "app" (token Bearer) atau "web" (cookie, dengan hash token CSRF; migrasi 000016).
func (r Repo) SimpanSesi(ctx context.Context, tokenHash string, akunID int64, kedaluwarsa time.Time, jenis string, csrfHash *string) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO sesi (token_hash, akun_id, kedaluwarsa, jenis, csrf_hash) VALUES ($1, $2, $3, $4, $5)`,
		tokenHash, akunID, kedaluwarsa, jenis, csrfHash)
	return err
}

// Sesi adalah satu sesi yang masih berlaku.
type Sesi struct {
	AkunID   int64
	Jenis    string // "app" atau "web"
	CsrfHash string // kosong untuk sesi app
}

// SesiAktif mengembalikan sesi yang belum kedaluwarsa pada waktu kini. Akun yang wajib mengganti
// password tidak punya sesi aktif: sesi yang dibuka sebelum akun ditandai (migration 000014) ikut tidak berlaku.
func (r Repo) SesiAktif(ctx context.Context, tokenHash string, kini time.Time) (Sesi, error) {
	var x Sesi
	var csrf *string
	err := r.db.QueryRowContext(ctx, `
		SELECT s.akun_id, s.jenis, s.csrf_hash FROM sesi s JOIN akun a ON a.id = s.akun_id
		WHERE s.token_hash = $1 AND s.kedaluwarsa > $2 AND NOT a.wajib_ganti_password`, tokenHash, kini).
		Scan(&x.AkunID, &x.Jenis, &csrf)
	if errors.Is(err, sql.ErrNoRows) {
		return x, ErrTidakAda
	}
	if csrf != nil {
		x.CsrfHash = *csrf
	}
	return x, err
}

func (r Repo) HapusSesi(ctx context.Context, tokenHash string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM sesi WHERE token_hash = $1`, tokenHash)
	return err
}

// --8<-- [end:sesi]

// AkunLewatNomor: akun karyawan pemilik nomor karyawan, untuk transfer antar karyawan.
func (r Repo) AkunLewatNomor(ctx context.Context, nomor string) (Akun, error) {
	var a Akun
	err := r.db.QueryRowContext(ctx, `SELECT id, jenis, nama FROM akun WHERE nomor_karyawan = $1`, nomor).
		Scan(&a.ID, &a.Jenis, &a.Nama)
	if errors.Is(err, sql.ErrNoRows) {
		return a, ErrTidakAda
	}
	return a, err
}

// WarungRingkas adalah hasil pencarian warung yang aman dikirim ke app: hanya id dan nama.
type WarungRingkas struct {
	ID   int64  `json:"id"`
	Nama string `json:"nama"`
}

// --8<-- [start:cari-warung]
// CariWarung memakai parameter query ($1), jadi isi pencarian tidak pernah jadi bagian perintah SQL.
// Hanya akun warung, hanya kolom yang dibutuhkan layar.
func (r Repo) CariWarung(ctx context.Context, cari string) ([]WarungRingkas, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, nama FROM akun WHERE jenis = 'warung' AND nama ILIKE '%' || $1 || '%' ORDER BY id`, cari)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []WarungRingkas{}
	for rows.Next() {
		var w WarungRingkas
		if err := rows.Scan(&w.ID, &w.Nama); err != nil {
			return nil, err
		}
		out = append(out, w)
	}
	return out, rows.Err()
}

// --8<-- [end:cari-warung]
