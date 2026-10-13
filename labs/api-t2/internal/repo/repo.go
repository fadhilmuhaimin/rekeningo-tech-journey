// Package repo adalah lapisan akses data: hanya SQL. Tidak tahu HTTP, tidak tahu aturan uang.
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
	Saldo int64  `json:"saldo"`
}

var ErrTidakAda = errors.New("tidak ada")

type Repo struct{ db *sql.DB }

func Baru(db *sql.DB) Repo { return Repo{db: db} }

func (r Repo) Akun(ctx context.Context, id int64) (Akun, error) {
	var a Akun
	err := r.db.QueryRowContext(ctx, `SELECT id, jenis, nama, saldo FROM akun WHERE id = $1`, id).
		Scan(&a.ID, &a.Jenis, &a.Nama, &a.Saldo)
	if errors.Is(err, sql.ErrNoRows) {
		return a, ErrTidakAda
	}
	return a, err
}

func (r Repo) AkunLewatEmail(ctx context.Context, email string) (id int64, passwordHash string, err error) {
	err = r.db.QueryRowContext(ctx, `SELECT id, password_hash FROM akun WHERE email = $1`, email).Scan(&id, &passwordHash)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, "", ErrTidakAda
	}
	return id, passwordHash, err
}

// --8<-- [start:sesi]
func (r Repo) SimpanSesi(ctx context.Context, tokenHash string, akunID int64, kedaluwarsa time.Time) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO sesi (token_hash, akun_id, kedaluwarsa) VALUES ($1, $2, $3)`, tokenHash, akunID, kedaluwarsa)
	return err
}

// SesiAktif mengembalikan pemilik sesi yang belum kedaluwarsa pada waktu kini.
func (r Repo) SesiAktif(ctx context.Context, tokenHash string, kini time.Time) (int64, error) {
	var akunID int64
	err := r.db.QueryRowContext(ctx,
		`SELECT akun_id FROM sesi WHERE token_hash = $1 AND kedaluwarsa > $2`, tokenHash, kini).Scan(&akunID)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, ErrTidakAda
	}
	return akunID, err
}

func (r Repo) HapusSesi(ctx context.Context, tokenHash string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM sesi WHERE token_hash = $1`, tokenHash)
	return err
}

// --8<-- [end:sesi]

// SeedAkun dipakai -seed: isi data awal uji coba Gedung A.
func (r Repo) SeedAkun(ctx context.Context, a Akun, email, passwordHash string) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO akun (id, jenis, nama, email, password_hash, saldo) VALUES ($1, $2, $3, $4, $5, $6)`,
		a.ID, a.Jenis, a.Nama, email, passwordHash, a.Saldo)
	return err
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

// CariWarungRentanM3 menyambung string pencarian langsung ke SQL, dan mengambil semua kolom semua akun.
// Dua kesalahan sekaligus: SQL injection, dan response yang membocorkan saldo. Hanya dipakai mode -rentan m3.
func (r Repo) CariWarungRentanM3(ctx context.Context, cari string) ([]Akun, error) {
	q := "SELECT id, jenis, nama, saldo FROM akun WHERE nama LIKE '%" + cari + "%'"
	rows, err := r.db.QueryContext(ctx, q) //nolint:rowserrcheck // lab: rows.Err dicek di bawah
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Akun{}
	for rows.Next() {
		var a Akun
		if err := rows.Scan(&a.ID, &a.Jenis, &a.Nama, &a.Saldo); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}
