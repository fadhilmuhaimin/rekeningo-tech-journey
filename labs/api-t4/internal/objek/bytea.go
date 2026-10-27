package objek

import (
	"context"
	"database/sql"
	_ "embed"
	"errors"
	"fmt"
)

// SkemaBytea adalah DDL tabel berkas_bytea (satu sumber: bytea.sql). Lab t4-storage dan tes menjalankannya sebagai
// pemilik schema; role aplikasi hanya perlu SELECT, INSERT, UPDATE, DELETE.
//
//go:embed bytea.sql
var SkemaBytea string

// Bytea menyimpan setiap objek sebagai satu baris di tabel berkas_bytea: versi pertama M33 ("ikut transaction dan
// ikut backup"). Dipakai hanya oleh mode rentan berkas-bytea. Penulisannya satu pernyataan sendiri, di luar
// transaction pengajuan verifikasi, seperti Dir dan S3: klaim "ikut transaction" tidak dibuktikan oleh tipe ini.
type Bytea struct{ DB *sql.DB }

func (b Bytea) Simpan(ctx context.Context, kunci string, isi []byte) error {
	if !kunciSah.MatchString(kunci) {
		return fmt.Errorf("kunci objek tidak sah: %q", kunci)
	}
	_, err := b.DB.ExecContext(ctx, `INSERT INTO berkas_bytea (kunci, isi) VALUES ($1, $2)
		ON CONFLICT (kunci) DO UPDATE SET isi = EXCLUDED.isi`, kunci, isi)
	return err
}

func (b Bytea) Baca(ctx context.Context, kunci string) ([]byte, error) {
	var isi []byte
	err := b.DB.QueryRowContext(ctx, `SELECT isi FROM berkas_bytea WHERE kunci = $1`, kunci).Scan(&isi)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrTidakAda
	}
	return isi, err
}

func (b Bytea) Hapus(ctx context.Context, kunci string) error {
	_, err := b.DB.ExecContext(ctx, `DELETE FROM berkas_bytea WHERE kunci = $1`, kunci)
	return err
}

func (b Bytea) Ukuran(ctx context.Context, kunci string) (int64, error) {
	var n int64
	err := b.DB.QueryRowContext(ctx, `SELECT octet_length(isi) FROM berkas_bytea WHERE kunci = $1`, kunci).Scan(&n)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, ErrTidakAda
	}
	return n, err
}
