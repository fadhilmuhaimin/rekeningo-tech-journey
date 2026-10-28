package main

import "database/sql"

// cariAkunAman memakai parameter: kasus tandingan, tidak ada temuan gosec.
func cariAkunAman(db *sql.DB, nomor string) (*sql.Rows, error) {
	return db.Query("SELECT id, nama FROM akun WHERE nomor_karyawan = $1", nomor)
}
