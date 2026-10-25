package service

// Tes cache katalog (lab t3-cache, keputusan 968-969, ADR 28): cache-aside, hapus kunci sesudah COMMIT, tulis yang
// ditolak tidak menghapus, promo menghapus satu kota, dan harga yang ditagih tidak pernah dari cache. Terpisah dari
// db_test.go dan tahap3_test.go supaya nomor baris tes lama tidak bergeser.

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"lab/apit3/internal/cache"
)

// svcCache: Service dengan cache memori di atas database tes. Jam cache tetap, jadi TTL tidak lewat di tengah tes.
func svcCache(t *testing.T, urut string) (Service, *cache.Katalog, *sql.DB) {
	t.Helper()
	svc, db := siapkan(t)
	tetap := time.Date(2026, 10, 25, 11, 0, 0, 0, time.UTC)
	kc := &cache.Katalog{P: cache.BaruMemori(func() time.Time { return tetap }), Nama: "memori", TTL: 5 * time.Minute, Urut: urut}
	return svc.DenganCache(kc), kc, db
}

func hargaDiKatalog(t *testing.T, svc Service, kota, warung int64, produk int64) int64 {
	t.Helper()
	_, m, err := svc.Katalog(context.Background(), 0, &kota, &warung)
	if err != nil {
		t.Fatal(err)
	}
	for _, w := range m {
		for _, menu := range w.Menu {
			if menu.ID == produk {
				return menu.HargaEfektif
			}
		}
	}
	t.Fatalf("produk %d tidak ada di katalog", produk)
	return 0
}

func warungDanKota(t *testing.T, db *sql.DB, harga int64, stok int) (warung, kota, produk int64) {
	t.Helper()
	warung, _ = akunBaru(t, db, "warung", 0)
	kota = kotaBaru(t, db, warung)
	return warung, kota, produkBaru(t, db, warung, harga, stok)
}

// Pembacaan kedua tidak menyentuh database; ubah harga yang berhasil menghapus entri, jadi bacaan berikutnya baru.
func TestKatalogCacheHitLaluHapusSesudahUbah(t *testing.T) {
	svc, kc, db := svcCache(t, cache.HapusSesudah)
	w, kota, p := warungDanKota(t, db, 25_000, 5)
	for i := 0; i < 3; i++ {
		if h := hargaDiKatalog(t, svc, kota, w, p); h != 25_000 {
			t.Fatalf("bacaan %d: harga %d", i, h)
		}
	}
	if kc.DBBaca.Load() != 1 || kc.Hit.Load() != 2 {
		t.Fatalf("database %d kali, hit %d (ingin 1 dan 2)", kc.DBBaca.Load(), kc.Hit.Load())
	}
	harga := int64(28_000)
	if _, err := svc.UbahProduk(context.Background(), w, p, &harga, nil, 1); err != nil {
		t.Fatal(err)
	}
	if h := hargaDiKatalog(t, svc, kota, w, p); h != 28_000 || kc.DBBaca.Load() != 2 {
		t.Fatalf("sesudah ubah: harga %d, database %d kali (ingin 28000 dan 2)", h, kc.DBBaca.Load())
	}
}

// Tulis yang ditolak (versi basi) tidak menghapus entri; dengan urutan "selalu" (rentan) entri ikut hilang.
func TestKatalogCacheTulisDitolakTidakMenghapus(t *testing.T) {
	for _, c := range []struct {
		urut   string
		dbBaca int64
	}{{cache.HapusSesudah, 1}, {cache.HapusSelalu, 2}} {
		svc, kc, db := svcCache(t, c.urut)
		w, kota, p := warungDanKota(t, db, 25_000, 5)
		hargaDiKatalog(t, svc, kota, w, p)
		harga := int64(30_000)
		if _, err := svc.UbahProduk(context.Background(), w, p, &harga, nil, 9); err == nil { // versi 9: basi
			t.Fatalf("%s: ubah dengan versi salah harus ditolak", c.urut)
		}
		hargaDiKatalog(t, svc, kota, w, p)
		if kc.DBBaca.Load() != c.dbBaca {
			t.Fatalf("%s: database %d kali, ingin %d", c.urut, kc.DBBaca.Load(), c.dbBaca)
		}
	}
}

// Promo baru menghapus semua entri satu kota (seluruh kota dan tiap warung), kota lain tidak tersentuh.
func TestKatalogCachePromoMenghapusSatuKota(t *testing.T) {
	svc, kc, db := svcCache(t, cache.HapusSesudah)
	w, kota, p := warungDanKota(t, db, 20_000, 5)
	w2, kota2, p2 := warungDanKota(t, db, 20_000, 5)
	hr, _ := akunBaru(t, db, "hr", 0)
	if _, err := db.Exec(`UPDATE akun SET kota_id = $1 WHERE id = $2`, kota, hr); err != nil {
		t.Fatal(err)
	}
	hargaDiKatalog(t, svc, kota, w, p)
	hargaDiKatalog(t, svc, kota2, w2, p2)
	if _, _, err := svc.BuatPromo(context.Background(), hr, "Promo tes", 10, time.Now().Add(-time.Minute), time.Now().Add(time.Hour), false); err != nil {
		t.Fatal(err)
	}
	if h := hargaDiKatalog(t, svc, kota, w, p); h != 18_000 {
		t.Fatalf("kota promo: harga %d, ingin 18000", h)
	}
	if h := hargaDiKatalog(t, svc, kota2, w2, p2); h != 20_000 || kc.DBBaca.Load() != 3 {
		t.Fatalf("kota lain: harga %d, database %d kali (ingin 20000 dan 3: entri kota lain tetap hit)", h, kc.DBBaca.Load())
	}
}

// Katalog di cache menunjukkan Rp25.000, promo sudah berlaku: Pesan tetap menagih dari database (Rp22.500).
func TestPesanTidakMembacaCache(t *testing.T) {
	svc, kc, db := svcCache(t, cache.HapusSesudah)
	kosongkanAntrean(t, db)
	pembeli, _ := akunBaru(t, db, "karyawan", 100_000)
	w, _ := akunBaru(t, db, "warung", 0)
	kota := kotaBaru(t, db, pembeli, w)
	p := produkBaru(t, db, w, 25_000, 5)
	if h := hargaDiKatalog(t, svc, kota, w, p); h != 25_000 {
		t.Fatalf("harga di katalog %d", h)
	}
	hr, _ := akunBaru(t, db, "hr", 0)
	db.Exec(`INSERT INTO promo (kota_id, dibuat_oleh, judul, potongan_persen, mulai, selesai)
		VALUES ($1, $2, 'Promo tes', 10, now() - interval '1 minute', now() + interval '1 hour')`, kota, hr)
	if h := hargaDiKatalog(t, svc, kota, w, p); h != 25_000 || kc.DBBaca.Load() != 1 {
		t.Fatalf("promo ditulis langsung ke database tanpa hapus kunci: cache harus basi (harga %d, database %d kali)", h, kc.DBBaca.Load())
	}
	h, err := svc.Pesan(context.Background(), pembeli, p, 1, "")
	if err != nil || h.HargaSatuan != 22_500 || h.Nominal != 22_500 {
		t.Fatalf("pesan: %+v, %v (ingin Rp22.500 dari database)", h, err)
	}
	if s := saldo(t, db, pembeli); s != 100_000-22_500 {
		t.Fatalf("saldo %d: yang ditagih bukan harga cache", s)
	}
}
