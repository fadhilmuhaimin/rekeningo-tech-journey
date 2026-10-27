package service

import (
	"context"
	"encoding/json"
	"fmt"

	"lab/apit4/internal/cache"
	"lab/apit4/internal/repo"
)

// Cache katalog (lab t3-cache, keputusan 968, ADR 28). Hanya jawaban baca katalog yang di-cache. Pesan membaca harga
// dari database dan tidak menyentuh berkas ini. Tanpa cache (s.kc == nil) semua fungsi di sini jatuh ke jalur lama.

// kunciKatalog: satu kunci per kota dan per warung (atau "semua" untuk seluruh kota). Awalan `katalog:<kota>:` memuat
// semua kunci satu kota, dipakai untuk menghapus entri saat promo dibuat.
func kunciKatalog(kota int64, warung *int64) string {
	if warung == nil {
		return fmt.Sprintf("katalog:%d:semua", kota)
	}
	return fmt.Sprintf("katalog:%d:%d", kota, *warung)
}

// katalogDariCacheAtauDB: cache-aside. Hit tidak menyentuh database; miss membaca database lalu menyimpan JSON-nya.
func (s Service) katalogDariCacheAtauDB(ctx context.Context, kota int64, warung *int64) ([]repo.WarungMenu, error) {
	if s.kc == nil {
		return s.repo.Katalog(ctx, kota, warung)
	}
	b, err := s.kc.Baca(ctx, kunciKatalog(kota, warung), func(ctx context.Context) ([]byte, error) {
		m, err := s.repo.Katalog(ctx, kota, warung)
		if err != nil {
			return nil, err
		}
		return json.Marshal(m)
	})
	if err != nil {
		return nil, err
	}
	var m []repo.WarungMenu
	if err := json.Unmarshal(b, &m); err != nil {
		return nil, err
	}
	return m, nil
}

// hapusKatalogWarung membuang entri yang memuat menu satu warung: seluruh kota dan warung itu sendiri.
func (s Service) hapusKatalogWarung(ctx context.Context, kota, warung int64) {
	s.kc.HapusKunci(ctx, kunciKatalog(kota, nil), kunciKatalog(kota, &warung))
}

// ubahProdukDenganCache: UPDATE dan COMMIT dipisah supaya urutan hapus kunci terhadap COMMIT bisa dipilih.
//   - sesudah (benar): COMMIT dulu; kunci dihapus hanya bila perubahan berhasil. Tulis yang ditolak (versi berbeda,
//     galat database) tidak menghapus apa pun: galat backend bukan alasan membuang cache (R3-25).
//   - sebelum (rentan): kunci dihapus sebelum COMMIT. Pembaca yang masuk di celah itu membaca harga lama dari
//     database dan menyimpannya lagi.
//   - selalu (rentan): seperti sesudah, tetapi kunci juga dihapus saat tulis ditolak atau gagal.
func (s Service) ubahProdukDenganCache(ctx context.Context, warung int64, kota *int64, id int64, harga *int64, stok *int, versi int) (repo.StokProduk, bool, error) {
	if kota == nil { // warung tanpa kota tidak punya entri katalog
		return s.repo.UbahProduk(ctx, id, warung, harga, stok, versi)
	}
	hasil, ok, err := s.repo.UbahProdukTx(ctx, id, warung, harga, stok, versi, func(ctx context.Context) error {
		if s.kc.Urut == cache.HapusSebelum {
			s.hapusKatalogWarung(ctx, *kota, warung)
		}
		s.kc.Gerbang.Tahan(ctx, cache.GerbangCommit)
		return nil
	})
	switch {
	case ok && s.kc.Urut != cache.HapusSebelum:
		s.hapusKatalogWarung(ctx, *kota, warung)
	case !ok && s.kc.Urut == cache.HapusSelalu:
		s.hapusKatalogWarung(ctx, *kota, warung)
	}
	return hasil, ok, err
}

// hapusKatalogKota: promo baru mengubah harga efektif semua menu di kota itu.
func (s Service) hapusKatalogKota(ctx context.Context, kota int64) {
	if s.kc != nil {
		s.kc.HapusAwalan(ctx, fmt.Sprintf("katalog:%d:", kota))
	}
}
