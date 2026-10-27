package service

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"unicode/utf8"

	"lab/apit4/internal/repo"
	"lab/apit4/internal/unduh"
)

// Impor katalog merchant luar (naskah M36, ADR 41): merchant mengirim daftar produk dengan URL gambar, dan server
// mengunduh gambar itu untuk membuat pratinjau. Penulisan produk dilakukan lebih dulu dalam satu transaction dan
// COMMIT sebelum unduhan pertama: tidak ada panggilan jaringan di dalam transaction (ADR 22), dan satu gambar yang
// gagal tidak membatalkan impor.

// BarisImpor adalah satu produk di daftar impor.
type BarisImpor struct {
	Nama      string
	Harga     int64
	Stok      int
	GambarURL string
}

// HasilImpor: pratinjau gambar satu baris (nil bila tanpa URL atau gagal) dan galatnya (nil bila berhasil).
type HasilImpor struct {
	Nama      string        `json:"nama"`
	Pratinjau *unduh.Gambar `json:"pratinjau"`
	Galat     *string       `json:"galat"`
}

const (
	// MaksBarisImpor: satu impor paling banyak 50 produk (Asumsi lab).
	MaksBarisImpor = 50
	maksURLGambar  = 2048
	// unduhSerentak: unduhan gambar berjalan serentak paling banyak sebanyak ini. Tiap unduhan paling lama 3 detik,
	// jadi 50 gambar yang semuanya mati memakan ±19 detik dalam satu request (Hitungan: 50 ÷ 8 dibulatkan ke atas
	// = 7 gelombang × 3 detik, Asumsi bahwa tiap gambar menggantung sampai batas). Produksi memindahkannya ke queue;
	// itu Tidak dijalankan di lab ini.
	unduhSerentak = 8
)

// pengunduh adalah satu-satunya pintu unduhan gambar. Tes menggantinya supaya jalur sukses dan lambat tidak bergantung
// pada jaringan; mode rentan dipilih di sini, bukan di pemanggil.
var pengunduh = func(ctx context.Context, rentan bool, alamat string) (unduh.Gambar, error) {
	if rentan {
		return unduh.Rentan(ctx, alamat)
	}
	return unduh.Aman(ctx, alamat)
}

// DenganUnduhHTTP menyalakan skema http untuk unduhan versi Aman (flag lab -unduh-izinkan-http): tiruan lokal di
// container tidak punya TLS. Pengaturannya global (unduh.IzinkanHTTPLab); Service dikembalikan apa adanya supaya
// bisa dirantai di cmd/api.
func (s Service) DenganUnduhHTTP(izinkan bool) Service {
	unduh.IzinkanHTTPLab.Store(izinkan)
	return s
}

// ImporKatalog menulis semua produk (atau tidak satu pun), lalu mengunduh pratinjau gambarnya. Hanya merchant yang
// sudah terverifikasi dan aktif.
func (s Service) ImporKatalog(ctx context.Context, peminta int64, baris []BarisImpor) ([]HasilImpor, error) {
	a, err := s.repo.Akun(ctx, peminta)
	if err != nil {
		return nil, err
	}
	if a.Jenis != "merchant" || a.Tingkat != "terverifikasi" {
		return nil, ErrDilarang
	}
	if a.Status != "aktif" {
		return nil, ErrDibekukan
	}
	if err := s.BatasAkun("impor-katalog", peminta); err != nil {
		return nil, err
	}
	if len(baris) == 0 || len(baris) > MaksBarisImpor {
		return nil, ErrValidasi{"produk", fmt.Sprintf("1 sampai %d baris", MaksBarisImpor)}
	}
	ada := map[string]bool{}
	for i, b := range baris {
		nama := strings.TrimSpace(b.Nama)
		switch {
		case nama == "" || utf8.RuneCountInString(nama) > 100:
			return nil, ErrValidasi{fmt.Sprintf("produk[%d].nama", i), "wajib, paling banyak 100 karakter"}
		case b.Harga <= 0:
			return nil, ErrValidasi{fmt.Sprintf("produk[%d].harga", i), "harus lebih dari 0"}
		case b.Stok < 0:
			return nil, ErrValidasi{fmt.Sprintf("produk[%d].stok", i), "tidak boleh negatif"}
		case len(b.GambarURL) > maksURLGambar:
			return nil, ErrValidasi{fmt.Sprintf("produk[%d].gambar_url", i), fmt.Sprintf("paling banyak %d karakter", maksURLGambar)}
		case ada[nama]:
			return nil, ErrValidasi{fmt.Sprintf("produk[%d].nama", i), "dua kali di daftar yang sama"}
		}
		ada[nama] = true
		baris[i].Nama = nama
	}
	err = s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		for _, b := range baris {
			if err := tx.UpsertProdukImpor(ctx, peminta, b.Nama, b.Harga, b.Stok, b.GambarURL); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	hasil := make([]HasilImpor, len(baris))
	var wg sync.WaitGroup
	gerbang := make(chan struct{}, unduhSerentak)
	rentan := s.rentan == RentanUnduhRentan
	for i, b := range baris {
		hasil[i].Nama = b.Nama
		if b.GambarURL == "" {
			continue
		}
		wg.Add(1)
		gerbang <- struct{}{}
		go func() {
			defer wg.Done()
			defer func() { <-gerbang }()
			g, err := pengunduh(ctx, rentan, b.GambarURL)
			if err != nil {
				pesan := err.Error()
				hasil[i].Galat = &pesan
				return
			}
			hasil[i].Pratinjau = &g
		}()
	}
	wg.Wait()
	return hasil, nil
}
