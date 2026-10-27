// Package data adalah SQL modul akun. Compiler hanya mengizinkan paket di bawah internal/modul/akun/ mengimpornya
// (aturan direktori internal Go): modul lain tidak bisa memanggil SQL ini atau meniru isinya tanpa melewati paket
// akun.
package data

import (
	"context"
	"database/sql"
)

// Penanya dipenuhi *sql.DB dan *sql.Tx.
type Penanya interface {
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

// Skema: versi skema tabel akun yang dikenal kode ini. 1 = kolom nama; 2 = kolom nama_tampil (sesudah tim Akun
// mengganti nama kolom). PR tim Akun mengubah migration dan nilai ini bersama; di lab, tes memerankan PR itu.
var Skema = 1

// Nama membaca nama tampil satu akun. Kolom nama bukan bagian kontrak modul lain: hanya fungsi ini yang membacanya.
func Nama(ctx context.Context, q Penanya, id int64) (string, error) {
	query := `SELECT nama FROM akun WHERE id = $1`
	if Skema == 2 {
		query = `SELECT nama_tampil FROM akun WHERE id = $1`
	}
	var nama string
	err := q.QueryRowContext(ctx, query, id).Scan(&nama)
	return nama, err
}
