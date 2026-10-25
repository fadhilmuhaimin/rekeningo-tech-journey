package service

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"lab/apit3/internal/repo"
)

// Dua puluh perangkat mengirim operasi dari versi dasar yang sama pada saat yang sama: tepat satu diterapkan, sisanya
// konflik, dan stok akhir adalah nilai pemenang (ADR 29). Tanpa syarat versi semuanya "berhasil" dan yang terakhir menang.
func TestSinkronBersamaanSatuPemenang(t *testing.T) {
	s, db := siapkan(t)
	ctx := context.Background()
	warung, _ := akunBaru(t, db, "warung", 0)
	var produk int64
	if err := db.QueryRow(`INSERT INTO produk (akun_id, nama, harga, stok) VALUES ($1, 'Ayam geprek', 28000, 30) RETURNING id`, warung).Scan(&produk); err != nil {
		t.Fatal(err)
	}
	hp, err := s.DaftarkanPerangkat(ctx, warung, "android", fmt.Sprintf("hp-%d", time.Now().UnixNano()))
	if err != nil {
		t.Fatal(err)
	}
	var diterapkan, konflik atomic.Int32
	var menang atomic.Int64
	var wg sync.WaitGroup
	for i := 1; i <= 20; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			status, _, _, err := s.Sinkron(ctx, warung, repo.OperasiSinkron{
				Kunci: fmt.Sprintf("bersamaan-%d-%d", produk, i), Perangkat: hp, Produk: produk, Jenis: "stok",
				Nilai: int64(i), VersiDasar: 1, DibuatHP: time.Now()})
			if err != nil {
				t.Error(err)
				return
			}
			if status == "diterapkan" {
				diterapkan.Add(1)
				menang.Store(int64(i))
			} else {
				konflik.Add(1)
			}
		}(i)
	}
	wg.Wait()
	if diterapkan.Load() != 1 || konflik.Load() != 19 {
		t.Fatalf("20 operasi dari versi 1: %d diterapkan, %d konflik; harus 1 dan 19", diterapkan.Load(), konflik.Load())
	}
	var stok, versi int64
	if err := db.QueryRow(`SELECT stok, versi FROM produk WHERE id = $1`, produk).Scan(&stok, &versi); err != nil {
		t.Fatal(err)
	}
	if stok != menang.Load() || versi != 2 {
		t.Fatalf("stok %d versi %d; harus nilai pemenang %d dan versi 2", stok, versi, menang.Load())
	}
}

// Pengiriman ulang yang kuncinya sudah dikenal tidak menerapkan apa pun, juga bila dikirim bersamaan.
func TestSinkronKunciSamaBersamaanSekali(t *testing.T) {
	s, db := siapkan(t)
	ctx := context.Background()
	warung, _ := akunBaru(t, db, "warung", 0)
	var produk int64
	if err := db.QueryRow(`INSERT INTO produk (akun_id, nama, harga, stok) VALUES ($1, 'Mie ayam', 20000, 50) RETURNING id`, warung).Scan(&produk); err != nil {
		t.Fatal(err)
	}
	hp, err := s.DaftarkanPerangkat(ctx, warung, "android", fmt.Sprintf("hp-%d", time.Now().UnixNano()))
	if err != nil {
		t.Fatal(err)
	}
	op := repo.OperasiSinkron{Kunci: fmt.Sprintf("sama-%d", produk), Perangkat: hp, Produk: produk, Jenis: "stok", Nilai: 0, VersiDasar: 1, DibuatHP: time.Now()}
	var ulang, baru atomic.Int32
	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			status, _, u, err := s.Sinkron(ctx, warung, op)
			if err != nil || status != "diterapkan" {
				t.Errorf("status %q, err %v", status, err)
				return
			}
			if u {
				ulang.Add(1)
			} else {
				baru.Add(1)
			}
		}()
	}
	wg.Wait()
	var versi int64
	if err := db.QueryRow(`SELECT versi FROM produk WHERE id = $1`, produk).Scan(&versi); err != nil {
		t.Fatal(err)
	}
	if baru.Load() != 1 || ulang.Load() != 9 || versi != 2 {
		t.Fatalf("10 pengiriman satu kunci: %d baru, %d ulang, versi %d; harus 1, 9, 2", baru.Load(), ulang.Load(), versi)
	}
}

// Jenis pembayaran tidak pernah diterapkan lewat sinkron, apa pun nilai lainnya.
func TestSinkronMenolakPembayaran(t *testing.T) {
	s, db := siapkan(t)
	ctx := context.Background()
	warung, _ := akunBaru(t, db, "warung", 0)
	for _, jenis := range []string{"bayar", "transfer", "topup"} {
		_, _, _, err := s.Sinkron(ctx, warung, repo.OperasiSinkron{Kunci: "x-" + jenis, Perangkat: 1, Produk: 1, Jenis: jenis, Nilai: 1,
			VersiDasar: 1, DibuatHP: time.Now()})
		v, ok := err.(ErrValidasi)
		if !ok || v.Field != "jenis" || !strings.HasPrefix(v.Pesan, "pembayaran tidak pernah") {
			t.Errorf("jenis %s: err %v, harus penolakan pembayaran di field jenis", jenis, err)
		}
	}
}

// Queue paling lama 7 hari dihitung dari jam service; jam HP lebih dari sehari di depan ditolak.
func TestSinkronBatasUmurQueue(t *testing.T) {
	s, db := siapkan(t)
	ctx := context.Background()
	warung, _ := akunBaru(t, db, "warung", 0)
	var produk int64
	if err := db.QueryRow(`INSERT INTO produk (akun_id, nama, harga, stok) VALUES ($1, 'Bakso', 18000, 50) RETURNING id`, warung).Scan(&produk); err != nil {
		t.Fatal(err)
	}
	hp, _ := s.DaftarkanPerangkat(ctx, warung, "android", fmt.Sprintf("hp-%d", time.Now().UnixNano()))
	kini := time.Date(2026, 10, 26, 7, 0, 0, 0, time.UTC)
	s = s.DenganJam(func() time.Time { return kini })
	kirim := func(kunci string, dibuat time.Time) error {
		_, _, _, err := s.Sinkron(ctx, warung, repo.OperasiSinkron{Kunci: fmt.Sprintf("%s-%d", kunci, produk), Perangkat: hp,
			Produk: produk, Jenis: "stok", Nilai: 5, VersiDasar: 1, DibuatHP: dibuat})
		return err
	}
	if err := kirim("enam-hari", kini.Add(-MaksUmurOperasi+time.Hour)); err != nil {
		t.Fatalf("6 hari 23 jam harus diterima: %v", err)
	}
	if err := kirim("delapan-hari", kini.Add(-MaksUmurOperasi-time.Hour)); err == nil {
		t.Fatal("7 hari 1 jam harus ditolak")
	}
	if err := kirim("jam-salah", kini.Add(MaksJamSalah+time.Hour)); err == nil {
		t.Fatal("jam HP lebih dari sehari di depan harus ditolak")
	}
}

// PATCH /produk/{id}: UPDATE ... WHERE versi = ... dua puluh kali bersamaan dari versi yang sama. PostgreSQL READ COMMITTED
// mengevaluasi ulang WHERE pada versi baru baris sesudah menunggu (R3-92): tepat satu berhasil, sisanya mendapat keadaan terkini.
func TestUbahProdukBersamaanSatuPemenang(t *testing.T) {
	s, db := siapkan(t)
	ctx := context.Background()
	warung, _ := akunBaru(t, db, "warung", 0)
	var produk int64
	if err := db.QueryRow(`INSERT INTO produk (akun_id, nama, harga, stok) VALUES ($1, 'Soto ayam', 22000, 50) RETURNING id`, warung).Scan(&produk); err != nil {
		t.Fatal(err)
	}
	var ok, beda atomic.Int32
	var wg sync.WaitGroup
	for i := 1; i <= 20; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			stok := i
			_, err := s.UbahProduk(ctx, warung, produk, nil, &stok, 1)
			switch err.(type) {
			case nil:
				ok.Add(1)
			case ErrVersiBerbeda:
				beda.Add(1)
			default:
				t.Error(err)
			}
		}(i)
	}
	wg.Wait()
	if ok.Load() != 1 || beda.Load() != 19 {
		t.Fatalf("20 perubahan dari versi 1: %d berhasil, %d versi berbeda; harus 1 dan 19", ok.Load(), beda.Load())
	}
}
