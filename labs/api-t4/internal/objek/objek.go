// Package objek adalah penyimpanan objek tiruan di direktori lokal untuk file identitas (ADR 38). Database hanya
// menyimpan kunci objek dan checksum. Penyimpanan objek sungguhan (S3 lokal, presigned URL) dibuktikan lab
// t4-storage; lab api-t4 tidak memakai presigned URL dan tidak menjalankan layanan penyimpanan.
package objek

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
)

var ErrTidakAda = errors.New("objek tidak ada")

// Penyimpan adalah yang dibutuhkan service: simpan, baca, hapus satu objek menurut kunci.
type Penyimpan interface {
	Simpan(ctx context.Context, kunci string, isi []byte) error
	Baca(ctx context.Context, kunci string) ([]byte, error)
	Hapus(ctx context.Context, kunci string) error
}

// Dir menyimpan setiap objek sebagai satu file di bawah Akar.
type Dir struct{ Akar string }

var kunciSah = regexp.MustCompile(`^[a-z0-9]+(/[a-z0-9_-]+)*$`)

func (d Dir) jalur(kunci string) (string, error) {
	if !kunciSah.MatchString(kunci) {
		return "", fmt.Errorf("kunci objek tidak sah: %q", kunci)
	}
	return filepath.Join(d.Akar, filepath.FromSlash(kunci)), nil
}

func (d Dir) Simpan(_ context.Context, kunci string, isi []byte) error {
	j, err := d.jalur(kunci)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(j), 0o700); err != nil {
		return err
	}
	return os.WriteFile(j, isi, 0o600)
}

func (d Dir) Baca(_ context.Context, kunci string) ([]byte, error) {
	j, err := d.jalur(kunci)
	if err != nil {
		return nil, err
	}
	b, err := os.ReadFile(j)
	if errors.Is(err, os.ErrNotExist) {
		return nil, ErrTidakAda
	}
	return b, err
}

func (d Dir) Hapus(_ context.Context, kunci string) error {
	j, err := d.jalur(kunci)
	if err != nil {
		return err
	}
	if err := os.Remove(j); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}
