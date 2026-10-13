package service

import (
	"context"
	"encoding/base64"
	"strconv"
	"strings"
	"time"

	"lab/apit2/internal/repo"
)

// BatasRiwayat: baris per halaman bila app tidak meminta (sama dengan Tahap 1, jadi app lama melihat 20 baris).
const BatasRiwayat = 20

// --8<-- [start:kursor]
// Kursor dikirim ke app sebagai teks yang tidak perlu dipahami app: waktu posting (mikrodetik) dan nomornya.
func tulisKursor(k repo.Kursor) string {
	return base64.RawURLEncoding.EncodeToString([]byte(strconv.FormatInt(k.Dibuat.UnixMicro(), 10) + "." +
		strconv.FormatInt(k.Posting, 10)))
}

func bacaKursor(s string) (*repo.Kursor, bool) {
	b, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil {
		return nil, false
	}
	waktu, nomor, ok := strings.Cut(string(b), ".")
	us, err1 := strconv.ParseInt(waktu, 10, 64)
	id, err2 := strconv.ParseInt(nomor, 10, 64)
	if !ok || err1 != nil || err2 != nil || id <= 0 {
		return nil, false
	}
	return &repo.Kursor{Dibuat: time.UnixMicro(us), Posting: id}, true
}

// --8<-- [end:kursor]

// Riwayat: hanya pemilik akun. Halaman berikutnya diminta dengan kursor dari halaman sebelumnya;
// berikutnya kosong berarti tidak ada baris lagi.
func (s Service) Riwayat(ctx context.Context, peminta, id int64, kursor, batas string) (daftar []repo.Riwayat, berikutnya string, err error) {
	if peminta != id {
		return nil, "", ErrTidakDitemukan
	}
	n := BatasRiwayat
	if batas != "" {
		if n, err = strconv.Atoi(batas); err != nil || n < 1 || n > 50 {
			return nil, "", ErrValidasi{"batas", "angka 1 sampai 50"}
		}
	}
	var k *repo.Kursor
	if kursor != "" {
		var ok bool
		if k, ok = bacaKursor(kursor); !ok {
			return nil, "", ErrValidasi{"kursor", "bukan kursor dari halaman sebelumnya"}
		}
	}
	daftar, err = s.repo.Riwayat(ctx, id, k, n)
	if err != nil || len(daftar) < n {
		return daftar, "", err
	}
	akhir := daftar[len(daftar)-1]
	return daftar, tulisKursor(repo.Kursor{Dibuat: akhir.Waktu, Posting: akhir.Posting}), nil
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
