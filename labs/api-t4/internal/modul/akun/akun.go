// Package akun adalah antarmuka publik modul akun (ADR 37). Modul lain memanggil fungsi di sini, bukan membaca
// tabel akun: tabelnya milik schema dan role modul akun, SQL-nya di paket internal/data yang tidak bisa diimpor
// dari luar modul ini.
package akun

import (
	"context"
	"database/sql"

	"lab/apit4/internal/modul/akun/internal/data"
)

// Modul memegang koneksi dengan role modul akun. Pemanggil dari modul lain tidak pernah menerima koneksi ini.
type Modul struct{ DB *sql.DB }

// NamaTampil: nama yang ditampilkan untuk satu akun.
func (m Modul) NamaTampil(ctx context.Context, id int64) (string, error) {
	return data.Nama(ctx, m.DB, id)
}

// SkemaNama memberi tahu paket data versi skema yang dikenal (dipakai tes lab untuk memerankan PR tim Akun).
func SkemaNama(versi int) { data.Skema = versi }
