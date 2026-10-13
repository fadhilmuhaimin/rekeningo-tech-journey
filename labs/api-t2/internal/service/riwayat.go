package service

import (
	"context"
	"time"

	"lab/apit2/internal/repo"
)

// Riwayat: hanya pemilik akun. Akun orang lain dijawab tidak ditemukan (sama dengan LihatAkun).
func (s Service) Riwayat(ctx context.Context, peminta, id int64) ([]repo.Riwayat, error) {
	if peminta != id {
		return nil, ErrTidakDitemukan
	}
	return s.repo.Riwayat(ctx, id)
}

// --8<-- [start:laporan]
// Laporan warung: hanya pemilik warung, rentang paling panjang 31 hari.
func (s Service) Laporan(ctx context.Context, peminta, warung int64, dari, sampai string) ([]repo.BarisLaporan, error) {
	if peminta != warung {
		return nil, ErrTidakDitemukan
	}
	d, err1 := time.Parse("2006-01-02", dari)
	t, err2 := time.Parse("2006-01-02", sampai)
	if err1 != nil || err2 != nil || t.Before(d) || t.Sub(d) > 30*24*time.Hour {
		return nil, ErrValidasi{"dari,sampai", "tanggal YYYY-MM-DD, sampai tidak sebelum dari, paling panjang 31 hari"}
	}
	return s.repo.Laporan(ctx, warung, dari, sampai)
}

// --8<-- [end:laporan]
