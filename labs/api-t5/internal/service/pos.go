package service

import (
	"context"
	"errors"

	"lab/apit5/internal/repo"
)

// API untuk mitra POS (lab t5-waf, ADR 56, M50). Pintunya gerbang di tepi; service ini hanya menjawab pertanyaan
// cakupan dan status.

// RentanPosTanpaCakupan: merchant di alamat tidak diperiksa terhadap mitra yang disebut gerbang, jadi kunci
// satu mitra membuka merchant mitra lain (versi pertama, sebelum cakupan kunci).
const RentanPosTanpaCakupan = "pos-tanpa-cakupan"

// MerchantMilikMitra: akun itu ada, berjenis merchant, dan akun.mitra_pos_id sama dengan mitra.
func (s Service) MerchantMilikMitra(ctx context.Context, merchant, mitra int64) (bool, error) {
	m, jenis, err := s.repo.MitraAkun(ctx, merchant)
	if errors.Is(err, repo.ErrTidakAda) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return jenis == "merchant" && m.Valid && m.Int64 == mitra, nil
}

// StatusQRPOS adalah yang dibaca kasir: status QR milik merchant ini. QR milik merchant lain, atau id yang bukan
// UUID, dijawab ErrTidakDitemukan. QR dinamis yang masih aktif tetapi sudah lewat masa berlakunya dijawab kedaluwarsa.
func (s Service) StatusQRPOS(ctx context.Context, merchant int64, id string) (repo.QR, string, error) {
	if !polaUUID.MatchString(id) {
		return repo.QR{}, "", ErrTidakDitemukan
	}
	q, err := s.repo.LihatQR(ctx, id)
	if errors.Is(err, repo.ErrTidakAda) {
		return repo.QR{}, "", ErrTidakDitemukan
	}
	if err != nil {
		return repo.QR{}, "", err
	}
	if q.AkunID != merchant {
		return repo.QR{}, "", ErrTidakDitemukan
	}
	status := q.Status
	if status == "aktif" && q.BerlakuSampai != nil && !s.kini().Before(*q.BerlakuSampai) {
		status = "kedaluwarsa"
	}
	return q.QR, status, nil
}
