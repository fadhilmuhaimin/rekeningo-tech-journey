package service

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"lab/apit3/internal/repo"
)

// kunciTes: key unik per tes dan per run (key global di tabel, tes tidak menghapus barisnya).
func kunciTes(t *testing.T) string {
	t.Helper()
	return fmt.Sprintf("tes-%s-%d", t.Name(), time.Now().UnixNano())
}

func TestKlaimKunciBaruBerjalanUlangBeda(t *testing.T) {
	s, db := siapkan(t)
	ctx := context.Background()
	budi, _ := akunBaru(t, db, "karyawan", 0)
	lain, _ := akunBaru(t, db, "karyawan", 0)
	k := kunciTes(t)

	if p, _, err := s.KlaimKunci(ctx, k, budi, "hash-a"); err != nil || p != repo.KlaimBaru {
		t.Fatalf("key baru: putusan %v, err %v", p, err)
	}
	if p, _, _ := s.KlaimKunci(ctx, k, budi, "hash-a"); p != repo.KlaimBerjalan {
		t.Fatalf("key belum selesai: putusan %v, harus KlaimBerjalan", p)
	}
	if err := s.SelesaiKunci(ctx, k, []byte(`{"status":201,"isi":"x"}`)); err != nil {
		t.Fatal(err)
	}
	p, isi, _ := s.KlaimKunci(ctx, k, budi, "hash-a")
	if p != repo.KlaimUlang || len(isi) == 0 {
		t.Fatalf("key selesai, isi sama: putusan %v, respons %q", p, isi)
	}
	if p, isi, _ := s.KlaimKunci(ctx, k, budi, "hash-b"); p != repo.KlaimBeda || isi != nil {
		t.Fatalf("key sama, isi beda: putusan %v, respons %q: respons milik permintaan lain tidak boleh keluar", p, isi)
	}
	if p, isi, _ := s.KlaimKunci(ctx, k, lain, "hash-a"); p != repo.KlaimBeda || isi != nil {
		t.Fatalf("key milik akun lain: putusan %v, respons %q", p, isi)
	}
}

// Key hidup tepat 24 jam sejak dipakai pertama kali; sesudah itu diperlakukan belum pernah ada (ADR 14, M24).
func TestKunciKedaluwarsaSesudah24Jam(t *testing.T) {
	s, db := siapkan(t)
	ctx := context.Background()
	budi, _ := akunBaru(t, db, "karyawan", 0)
	k := kunciTes(t)
	t0 := time.Date(2026, 10, 23, 16, 50, 0, 0, time.UTC) // Jumat 16.50
	jam := t0
	s = s.DenganJam(func() time.Time { return jam })

	s.KlaimKunci(ctx, k, budi, "h")
	if err := s.SelesaiKunci(ctx, k, []byte(`{"status":201,"isi":"lama"}`)); err != nil {
		t.Fatal(err)
	}
	jam = t0.Add(24*time.Hour - time.Second) // angka tertulis, bukan UmurKunci: mengubah konstanta harus menggagalkan tes
	if p, _, _ := s.KlaimKunci(ctx, k, budi, "h"); p != repo.KlaimUlang {
		t.Fatalf("23 jam 59 menit 59 detik: putusan %v, harus KlaimUlang", p)
	}
	jam = t0.Add(24 * time.Hour)
	if p, isi, _ := s.KlaimKunci(ctx, k, budi, "h"); p != repo.KlaimBaru || isi != nil {
		t.Fatalf("tepat 24 jam: putusan %v, respons %q, harus KlaimBaru tanpa respons lama", p, isi)
	}
	// Setelah diklaim ulang, isi lama hilang: key baru berstatus diproses dengan masa 24 jam dari sekarang.
	jam = t0.Add(25 * time.Hour)
	if p, _, _ := s.KlaimKunci(ctx, k, budi, "h"); p != repo.KlaimBerjalan {
		t.Fatalf("klaim ulang: putusan %v, harus KlaimBerjalan", p)
	}
	// Key kedaluwarsa juga boleh dipakai isi lain atau akun lain: bukan lagi milik permintaan pertama.
	jam = t0.Add(72 * time.Hour)
	lain, _ := akunBaru(t, db, "karyawan", 0)
	if p, _, _ := s.KlaimKunci(ctx, k, lain, "h-lain"); p != repo.KlaimBaru {
		t.Fatalf("key kedaluwarsa, akun dan isi lain: putusan %v, harus KlaimBaru", p)
	}
}

func TestKlaimKunciBersamaanSatuPemenang(t *testing.T) {
	s, db := siapkan(t)
	ctx := context.Background()
	budi, _ := akunBaru(t, db, "karyawan", 0)
	k := kunciTes(t)
	var baru, berjalan atomic.Int32
	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			p, _, err := s.KlaimKunci(ctx, k, budi, "h")
			if err != nil {
				t.Error(err)
				return
			}
			switch p {
			case repo.KlaimBaru:
				baru.Add(1)
			case repo.KlaimBerjalan:
				berjalan.Add(1)
			}
		}()
	}
	wg.Wait()
	if baru.Load() != 1 || berjalan.Load() != 19 {
		t.Fatalf("20 klaim bersamaan: %d baru, %d berjalan; harus 1 dan 19", baru.Load(), berjalan.Load())
	}
}

func TestLepasKunciMembukaKlaimBaru(t *testing.T) {
	s, db := siapkan(t)
	ctx := context.Background()
	budi, _ := akunBaru(t, db, "karyawan", 0)
	k := kunciTes(t)
	s.KlaimKunci(ctx, k, budi, "h")
	if err := s.LepasKunci(ctx, k); err != nil {
		t.Fatal(err)
	}
	if p, _, _ := s.KlaimKunci(ctx, k, budi, "h"); p != repo.KlaimBaru {
		t.Fatalf("sesudah dilepas: putusan %v, harus KlaimBaru", p)
	}
	// LepasKunci tidak membuang key yang sudah selesai: responsnya masih harus bisa diulang.
	s.SelesaiKunci(ctx, k, []byte(`{"status":201,"isi":"x"}`))
	s.LepasKunci(ctx, k)
	if p, _, _ := s.KlaimKunci(ctx, k, budi, "h"); p != repo.KlaimUlang {
		t.Fatalf("key selesai tidak boleh terlepas: putusan %v", p)
	}
}

func TestTimpaStokTanpaSyaratVersi(t *testing.T) {
	s, db := siapkan(t)
	ctx := context.Background()
	warung, _ := akunBaru(t, db, "warung", 0)
	var id int64
	if err := db.QueryRow(`INSERT INTO produk (akun_id, nama, harga, stok) VALUES ($1, 'Ayam geprek', 28000, 30) RETURNING id`, warung).Scan(&id); err != nil {
		t.Fatal(err)
	}
	if _, err := s.TimpaStok(ctx, warung, id, 0); err != nil {
		t.Fatal(err)
	}
	// Pengubah lain menaikkan stok; timpa berikutnya tidak peduli versi dan mengembalikan 0.
	if _, ok, err := s.repo.UbahProduk(ctx, id, warung, nil, ptr(30), 2); err != nil || !ok {
		t.Fatalf("ubah bersyarat versi 2: ok %v, err %v", ok, err)
	}
	h, err := s.TimpaStok(ctx, warung, id, 0)
	if err != nil || h.Stok != 0 || h.Versi != 4 {
		t.Fatalf("timpa: %+v, err %v; stok harus kembali 0 dan versi 4", h, err)
	}
	if _, err := s.TimpaStok(ctx, warung, id, -1); err == nil {
		t.Fatal("stok negatif harus ditolak")
	}
	lain, _ := akunBaru(t, db, "warung", 0)
	if _, err := s.TimpaStok(ctx, lain, id, 5); err == nil {
		t.Fatal("warung lain tidak boleh menimpa stok")
	}
}

func ptr(n int) *int { return &n }
