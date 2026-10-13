package repo

import (
	"context"
	"fmt"
)

// AkunTujuan adalah akun yang ditemukan lewat email atau nomor karyawan, dengan bukunya.
type AkunTujuan struct {
	ID     int64
	Jenis  string
	BukuID int64 // 0 bila akun tidak punya buku
}

// AkunLewatKunci: akun untuk setiap email atau nomor karyawan (kolom "email" atau "nomor_karyawan"), satu query.
func (r Repo) AkunLewatKunci(ctx context.Context, kolom string, kunci []string) (map[string]AkunTujuan, error) {
	if kolom != "email" && kolom != "nomor_karyawan" {
		return nil, fmt.Errorf("kolom tidak dikenal: %s", kolom)
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT a.`+kolom+`, a.id, a.jenis, coalesce(b.id, 0)
		FROM akun a LEFT JOIN buku b ON b.akun_id = a.id
		WHERE a.`+kolom+` = ANY($1)`, kunci)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	hasil := map[string]AkunTujuan{}
	for rows.Next() {
		var k string
		var a AkunTujuan
		if err := rows.Scan(&k, &a.ID, &a.Jenis, &a.BukuID); err != nil {
			return nil, err
		}
		hasil[k] = a
	}
	return hasil, rows.Err()
}
