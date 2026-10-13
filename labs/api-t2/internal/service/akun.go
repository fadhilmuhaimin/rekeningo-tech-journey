package service

import (
	"context"
	"errors"

	"lab/apit2/internal/repo"
)

// LihatAkun: hanya pemiliknya. Akun orang lain dijawab "tidak ditemukan", bukan "dilarang",
// supaya penanya tidak tahu akun itu ada.
func (s Service) LihatAkun(ctx context.Context, peminta, id int64) (repo.Akun, error) {
	if peminta != id {
		return repo.Akun{}, ErrTidakDitemukan
	}
	a, err := s.repo.Akun(ctx, id)
	if errors.Is(err, repo.ErrTidakAda) {
		return repo.Akun{}, ErrTidakDitemukan
	}
	return a, err
}

// LihatTransaksi: hanya pembayar atau penerimanya. Selain itu dijawab tidak ditemukan (sama dengan LihatAkun).
func (s Service) LihatTransaksi(ctx context.Context, peminta, id int64) (repo.Transaksi, error) {
	t, err := s.repo.Transaksi(ctx, id)
	if errors.Is(err, repo.ErrTidakAda) || (err == nil && peminta != t.Dari && peminta != t.Ke) {
		return repo.Transaksi{}, ErrTidakDitemukan
	}
	return t, err
}

// --8<-- [start:cari-warung]
// CariWarung: siapa pun yang login boleh mencari warung. Hasilnya hanya id dan nama warung.
func (s Service) CariWarung(ctx context.Context, cari string) ([]repo.WarungRingkas, error) {
	return s.repo.CariWarung(ctx, cari)
}

// --8<-- [end:cari-warung]
