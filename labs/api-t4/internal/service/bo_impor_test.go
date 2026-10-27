package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"lab/apit4/internal/push"
	"lab/apit4/internal/unduh"
)

// Tes impor katalog merchant (M36, ADR 41). Pengunduh diganti supaya jalur sukses dan lambat tidak bergantung pada
// jaringan; perilaku pengunduh sendiri diuji di internal/unduh.

func gantiPengunduh(t *testing.T, f func(ctx context.Context, rentan bool, alamat string) (unduh.Gambar, error)) {
	t.Helper()
	asli := pengunduh
	pengunduh = f
	t.Cleanup(func() { pengunduh = asli })
}

func produkMerchant(t *testing.T, db *sql.DB, akun int64, nama string) (harga int64, stok, versi int, gambar *string, ada bool) {
	t.Helper()
	err := db.QueryRow(`SELECT harga, stok, versi, gambar_url FROM produk WHERE akun_id = $1 AND nama = $2`, akun, nama).
		Scan(&harga, &stok, &versi, &gambar)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, 0, 0, nil, false
	}
	if err != nil {
		t.Fatal(err)
	}
	return harga, stok, versi, gambar, true
}

func TestImporKatalogUpsertDanPratinjauPerBaris(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	merchant := akunBO(t, db, "merchant", "terverifikasi", 0)
	var dipanggil sync.Map
	gantiPengunduh(t, func(ctx context.Context, rentan bool, alamat string) (unduh.Gambar, error) {
		dipanggil.Store(alamat, rentan)
		if strings.Contains(alamat, "gagal") {
			return unduh.Gambar{}, unduh.ErrTujuan
		}
		return unduh.Gambar{Tipe: "image/png", Ukuran: 70}, nil
	})
	hasil, err := svc.ImporKatalog(ctx, merchant, []BarisImpor{
		{Nama: "  Kopi susu ", Harga: 18_000, Stok: 40, GambarURL: "https://gambar.contoh/ok.png"},
		{Nama: "Teh tarik", Harga: 15_000, Stok: 10, GambarURL: "https://gambar.contoh/gagal.png"},
		{Nama: "Roti bakar", Harga: 12_000, Stok: 5},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(hasil) != 3 {
		t.Fatalf("hasil %d baris", len(hasil))
	}
	if hasil[0].Nama != "Kopi susu" || hasil[0].Pratinjau == nil || hasil[0].Pratinjau.Tipe != "image/png" || hasil[0].Galat != nil {
		t.Errorf("baris 1: %+v", hasil[0])
	}
	if hasil[1].Pratinjau != nil || hasil[1].Galat == nil || *hasil[1].Galat != unduh.ErrTujuan.Error() {
		t.Errorf("baris 2: %+v", hasil[1])
	}
	if hasil[2].Pratinjau != nil || hasil[2].Galat != nil {
		t.Errorf("baris 3 (tanpa URL): %+v", hasil[2])
	}
	if _, ada := dipanggil.Load(""); ada {
		t.Error("pengunduh dipanggil untuk baris tanpa URL")
	}
	// Galat satu gambar tidak membatalkan impor: ketiga produk tertulis, URL disimpan apa adanya.
	for nama, harga := range map[string]int64{"Kopi susu": 18_000, "Teh tarik": 15_000, "Roti bakar": 12_000} {
		h, _, v, g, ada := produkMerchant(t, db, merchant, nama)
		if !ada || h != harga || v != 1 {
			t.Errorf("%s: ada %v, harga %d, versi %d", nama, ada, h, v)
		}
		if nama == "Teh tarik" && (g == nil || *g != "https://gambar.contoh/gagal.png") {
			t.Errorf("gambar_url Teh tarik tidak disimpan apa adanya: %v", g)
		}
		if nama == "Roti bakar" && g != nil {
			t.Errorf("gambar_url Roti bakar %v, ingin kosong", *g)
		}
	}
	// Impor ulang: harga dan stok diganti, versi naik, jumlah baris tetap.
	if _, err := svc.ImporKatalog(ctx, merchant, []BarisImpor{{Nama: "Kopi susu", Harga: 20_000, Stok: 30}}); err != nil {
		t.Fatal(err)
	}
	h, s, v, g, _ := produkMerchant(t, db, merchant, "Kopi susu")
	if h != 20_000 || s != 30 || v != 2 || g != nil {
		t.Fatalf("sesudah impor ulang: harga %d stok %d versi %d gambar %v", h, s, v, g)
	}
	var n int
	db.QueryRow(`SELECT count(*) FROM produk WHERE akun_id = $1`, merchant).Scan(&n)
	if n != 3 {
		t.Fatalf("%d produk, ingin 3", n)
	}
}

func TestImporKatalogMemilihPengunduhSesuaiMode(t *testing.T) {
	svc, db := siapkan(t)
	merchant := akunBO(t, db, "merchant", "terverifikasi", 0)
	var rentanTerlihat atomic.Int64 // 1 = aman, 2 = rentan
	gantiPengunduh(t, func(ctx context.Context, rentan bool, alamat string) (unduh.Gambar, error) {
		if rentan {
			rentanTerlihat.Store(2)
		} else {
			rentanTerlihat.Store(1)
		}
		return unduh.Gambar{Tipe: "image/png", Ukuran: 1}, nil
	})
	baris := []BarisImpor{{Nama: "A", Harga: 1000, Stok: 1, GambarURL: "https://x.contoh/a.png"}}
	if _, err := svc.ImporKatalog(context.Background(), merchant, baris); err != nil || rentanTerlihat.Load() != 1 {
		t.Fatalf("mode benar: %v, pengunduh %d (ingin 1 = aman)", err, rentanTerlihat.Load())
	}
	for _, mode := range []string{RentanUnduhRentan, RentanWebhookV1, RentanTanpaAudit} {
		rentanTerlihat.Store(0)
		if _, err := svc.DenganRentan(mode, push.Klien{}).ImporKatalog(context.Background(), merchant, baris); err != nil {
			t.Fatal(err)
		}
		ingin := int64(1)
		if mode == RentanUnduhRentan {
			ingin = 2
		}
		if rentanTerlihat.Load() != ingin {
			t.Errorf("mode %s: pengunduh %d, ingin %d", mode, rentanTerlihat.Load(), ingin)
		}
	}
}

func TestImporKatalogHanyaMerchantTerverifikasiDanAktif(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	gantiPengunduh(t, func(context.Context, bool, string) (unduh.Gambar, error) {
		return unduh.Gambar{}, errors.New("tidak boleh dipanggil")
	})
	baris := []BarisImpor{{Nama: "A", Harga: 1000, Stok: 1}}
	for jenis, tingkat := range map[string]string{"pemakai": "terverifikasi", "karyawan": "terverifikasi", "warung": "terverifikasi", "merchant": "belum", "risk": "terverifikasi"} {
		akun := akunBO(t, db, jenis, tingkat, 0)
		if _, err := svc.ImporKatalog(ctx, akun, baris); !errors.Is(err, ErrDilarang) {
			t.Errorf("%s/%s: %v, ingin ErrDilarang", jenis, tingkat, err)
		}
		if _, _, _, _, ada := produkMerchant(t, db, akun, "A"); ada {
			t.Errorf("%s/%s: produk tertulis walau ditolak", jenis, tingkat)
		}
	}
	beku := akunBO(t, db, "merchant", "terverifikasi", 0)
	db.Exec(`UPDATE akun SET status = 'dibekukan' WHERE id = $1`, beku)
	if _, err := svc.ImporKatalog(ctx, beku, baris); !errors.Is(err, ErrDibekukan) {
		t.Errorf("merchant dibekukan: %v, ingin ErrDibekukan", err)
	}
}

// Input salah ditolak utuh sebelum ada yang ditulis: bukan sebagian.
func TestImporKatalogInputSalahDitolakUtuh(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	merchant := akunBO(t, db, "merchant", "terverifikasi", 0)
	gantiPengunduh(t, func(context.Context, bool, string) (unduh.Gambar, error) {
		return unduh.Gambar{}, errors.New("tidak boleh dipanggil")
	})
	banyak := make([]BarisImpor, MaksBarisImpor+1)
	for i := range banyak {
		banyak[i] = BarisImpor{Nama: fmt.Sprintf("Produk %d", i), Harga: 1000, Stok: 1}
	}
	for nama, baris := range map[string][]BarisImpor{
		"kosong":              nil,
		"lebih dari 50":       banyak,
		"harga nol":           {{Nama: "Bagus", Harga: 1000, Stok: 1}, {Nama: "Salah", Harga: 0, Stok: 1}},
		"stok negatif":        {{Nama: "Bagus", Harga: 1000, Stok: 1}, {Nama: "Salah", Harga: 1000, Stok: -1}},
		"nama kosong":         {{Nama: "Bagus", Harga: 1000, Stok: 1}, {Nama: "   ", Harga: 1000, Stok: 1}},
		"nama dobel":          {{Nama: "Bagus", Harga: 1000, Stok: 1}, {Nama: " Bagus ", Harga: 2000, Stok: 1}},
		"URL terlalu panjang": {{Nama: "Bagus", Harga: 1000, Stok: 1}, {Nama: "Salah", Harga: 1000, Stok: 1, GambarURL: "https://x.contoh/" + strings.Repeat("a", 2100)}},
	} {
		_, err := svc.ImporKatalog(ctx, merchant, baris)
		if !errors.As(err, new(ErrValidasi)) {
			t.Errorf("%s: %v, ingin ErrValidasi", nama, err)
		}
	}
	var n int
	db.QueryRow(`SELECT count(*) FROM produk WHERE akun_id = $1`, merchant).Scan(&n)
	if n != 0 {
		t.Fatalf("%d produk tertulis dari impor yang ditolak", n)
	}
	// Tepat 50 baris diterima.
	if _, err := svc.ImporKatalog(ctx, merchant, banyak[:MaksBarisImpor]); err != nil {
		t.Fatalf("tepat %d baris: %v", MaksBarisImpor, err)
	}
}

// Unduhan serentak paling banyak unduhSerentak: 50 gambar tidak membuka 50 koneksi sekaligus.
func TestImporKatalogMembatasiUnduhanSerentak(t *testing.T) {
	svc, db := siapkan(t)
	merchant := akunBO(t, db, "merchant", "terverifikasi", 0)
	var sekarang, puncak atomic.Int64
	gantiPengunduh(t, func(context.Context, bool, string) (unduh.Gambar, error) {
		n := sekarang.Add(1)
		for {
			p := puncak.Load()
			if n <= p || puncak.CompareAndSwap(p, n) {
				break
			}
		}
		time.Sleep(20 * time.Millisecond)
		sekarang.Add(-1)
		return unduh.Gambar{Tipe: "image/png", Ukuran: 1}, nil
	})
	baris := make([]BarisImpor, MaksBarisImpor)
	for i := range baris {
		baris[i] = BarisImpor{Nama: fmt.Sprintf("P%d", i), Harga: 1000, Stok: 1, GambarURL: fmt.Sprintf("https://x.contoh/%d.png", i)}
	}
	hasil, err := svc.ImporKatalog(context.Background(), merchant, baris)
	if err != nil {
		t.Fatal(err)
	}
	for i, h := range hasil {
		if h.Pratinjau == nil || h.Galat != nil {
			t.Fatalf("baris %d: %+v", i, h)
		}
	}
	if puncak.Load() > unduhSerentak || puncak.Load() < 2 {
		t.Fatalf("unduhan serentak puncak %d, ingin antara 2 dan %d", puncak.Load(), unduhSerentak)
	}
}

// Penulisan produk sudah COMMIT sebelum unduhan pertama dimulai: tidak ada panggilan jaringan di dalam transaction
// (ADR 22). Pengunduh membaca produk dari koneksi lain; kalau transaction masih terbuka, barisnya belum terlihat.
func TestImporKatalogProdukSudahCommitSebelumUnduhan(t *testing.T) {
	svc, db := siapkan(t)
	merchant := akunBO(t, db, "merchant", "terverifikasi", 0)
	terlihat := make(chan bool, 1)
	gantiPengunduh(t, func(context.Context, bool, string) (unduh.Gambar, error) {
		_, _, _, _, ada := produkMerchant(t, db, merchant, "Dilihat")
		select {
		case terlihat <- ada:
		default:
		}
		return unduh.Gambar{Tipe: "image/png", Ukuran: 1}, nil
	})
	if _, err := svc.ImporKatalog(context.Background(), merchant, []BarisImpor{{Nama: "Dilihat", Harga: 1000, Stok: 1, GambarURL: "https://x.contoh/a.png"}}); err != nil {
		t.Fatal(err)
	}
	if !<-terlihat {
		t.Fatal("produk belum terlihat dari koneksi lain saat unduhan berjalan: unduhan terjadi di dalam transaction")
	}
}
