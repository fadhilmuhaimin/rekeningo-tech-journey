package service

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"lab/apit2/internal/repo"
)

// --8<-- [start:unit]
// Unit test: aturan uang yang tidak butuh database. repo.Repo{} tidak punya koneksi, jadi kalau service
// menyentuh database sebelum memeriksa input, tes ini panic.
func TestBayarMenolakJumlahDiLuarBatas(t *testing.T) {
	svc := Baru(repo.Repo{}, 0)
	for _, jumlah := range []int64{-70000, 0, 200001} {
		t.Run(fmt.Sprint(jumlah), func(t *testing.T) {
			_, _, err := svc.Bayar(context.Background(), 419, 418, jumlah)
			var v ErrValidasi
			if !errors.As(err, &v) || v.Field != "jumlah" {
				t.Fatalf("Bayar(%d): ingin ErrValidasi field jumlah, dapat %v", jumlah, err)
			}
		})
	}
}

func TestKirimMenolakNominalBukanPositif(t *testing.T) {
	svc := Baru(repo.Repo{}, 0)
	for _, n := range []int64{-20000, 0} {
		_, err := svc.Kirim(context.Background(), 419, "K00504", n)
		var v ErrValidasi
		if !errors.As(err, &v) || v.Field != "nominal" {
			t.Fatalf("Kirim(%d): ingin ErrValidasi field nominal, dapat %v", n, err)
		}
	}
}

func TestBatasHarian(t *testing.T) {
	batas := int64(500_000)
	kasus := []struct {
		keluar, nominal int64
		batas           *int64
		lolos           bool
	}{
		{0, 500_000, &batas, true},        // tepat batas
		{499_999, 1, &batas, true},        // tepat batas
		{500_000, 1, &batas, false},       // lewat Rp1
		{0, 800_000, &batas, false},       // angka M14
		{1_000_000, 1_000_000, nil, true}, // buku tanpa batas
	}
	for _, k := range kasus {
		err := periksaBatas(k.keluar, k.nominal, k.batas)
		if (err == nil) != k.lolos || (err != nil && !errors.Is(err, ErrBatasHarian)) {
			t.Errorf("keluar %d + nominal %d: lolos %v, err %v", k.keluar, k.nominal, k.lolos, err)
		}
	}
}

func TestBacaCSV(t *testing.T) {
	kolom, baris, salah := bacaCSV("nomor_karyawan,nominal\nK00419,250000\nK00504,250.000\nK00419,250000\nK00600,0\n")
	if kolom != "nomor_karyawan" || len(baris) != 1 {
		t.Fatalf("kolom %q, %d baris lolos; ingin nomor_karyawan, 1", kolom, len(baris))
	}
	ingin := []KesalahanBaris{
		{3, "nominal", "harus angka rupiah tanpa titik"},
		{4, "nomor_karyawan", "sudah ada di baris 2"},
		{5, "nominal", "harus lebih dari 0 dan paling banyak 1000000"},
	}
	if fmt.Sprint(salah) != fmt.Sprint(ingin) {
		t.Fatalf("salah:\n %v\ningin:\n %v", salah, ingin)
	}
	if kolom, _, salah := bacaCSV("email,nominal\nbudi@lestari.example,250000\n"); kolom != "email" || salah != nil {
		t.Fatalf("header Tahap 1 harus tetap diterima: %q %v", kolom, salah)
	}
	if _, _, salah := bacaCSV("nama,nominal\nBudi,250000\n"); len(salah) != 1 || salah[0].Field != "header" {
		t.Fatalf("header lain harus ditolak: %v", salah)
	}
}

func TestKursorBolakBalik(t *testing.T) {
	k := repo.Kursor{Dibuat: time.UnixMicro(1_791_000_000_123_456), Posting: 4242}
	b, ok := bacaKursor(tulisKursor(k))
	if !ok || !b.Dibuat.Equal(k.Dibuat) || b.Posting != k.Posting {
		t.Fatalf("kursor berubah: %v -> %v", k, b)
	}
	for _, rusak := range []string{"halaman-2", "", "MTIz"} {
		if _, ok := bacaKursor(rusak); ok {
			t.Errorf("kursor %q harus ditolak", rusak)
		}
	}
}

// --8<-- [end:unit]
