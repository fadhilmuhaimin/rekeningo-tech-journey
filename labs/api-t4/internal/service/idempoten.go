package service

import (
	"context"
	"errors"
	"time"

	"lab/apit4/internal/repo"
)

// UmurKunci: Idempotency-Key dikenali 24 jam sejak dipakai pertama kali (ADR 14). Sesudah itu key diperlakukan
// belum pernah ada: ulangan yang datang lebih lambat dikerjakan sebagai permintaan baru. Akhir pekan warung
// (62 jam) lebih panjang dari ini, itu sebabnya pembayaran tidak pernah offline (ADR 29, M24).
const UmurKunci = 24 * time.Hour

// RentanStokTimpa (M24): endpoint stok sebelum ADR 29. PUT /produk/{id}/stok menimpa stok tanpa memeriksa versi;
// satu-satunya pengaman terhadap pengiriman ulang adalah Idempotency-Key 24 jam.
const RentanStokTimpa = "stok-timpa"

// KlaimKunci memutuskan nasib satu permintaan ber-Idempotency-Key pada jam service. Hasil KlaimBaru artinya
// pemanggil wajib menutupnya dengan SelesaiKunci atau LepasKunci.
func (s Service) KlaimKunci(ctx context.Context, kunci string, akun int64, hash string) (repo.HasilKlaim, []byte, error) {
	kini := s.kini()
	return s.repo.KlaimKunci(ctx, kunci, akun, hash, kini, kini.Add(UmurKunci))
}

// SelesaiKunci menyimpan respons key yang baru dikerjakan.
func (s Service) SelesaiKunci(ctx context.Context, kunci string, respons []byte) error {
	return s.repo.SelesaiKunci(ctx, kunci, respons)
}

// LepasKunci membuang key yang gagal karena kesalahan server atau pembatas laju: ulangan mengerjakannya dari awal.
func (s Service) LepasKunci(ctx context.Context, kunci string) error {
	return s.repo.LepasKunci(ctx, kunci)
}

// TimpaStok (hanya mode rentan stok-timpa): ganti stok produk milik warung tanpa syarat versi.
func (s Service) TimpaStok(ctx context.Context, peminta, id int64, stok int) (repo.StokProduk, error) {
	a, err := s.repo.Akun(ctx, peminta)
	if err != nil {
		return repo.StokProduk{}, err
	}
	if a.Jenis != "warung" {
		return repo.StokProduk{}, ErrDilarang
	}
	if stok < 0 {
		return repo.StokProduk{}, ErrValidasi{"stok", "tidak boleh negatif"}
	}
	h, err := s.repo.TimpaStok(ctx, id, peminta, stok)
	if errors.Is(err, repo.ErrTidakAda) {
		return h, ErrTidakDitemukan
	}
	return h, err
}
