package redisbatas

// Tes dengan Redis sungguhan (R3-12, ADR 27, keputusan 965). TEST_REDIS_ADDR menunjuk Redis lab; tanpa itu tes
// dilewati, dan TES_REDIS_WAJIB=1 mengubah "dilewati" menjadi gagal (pola TES_DB_WAJIB di internal/service).

import (
	"context"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
)

func TestMain(m *testing.M) {
	if os.Getenv("TES_REDIS_WAJIB") == "1" && os.Getenv("TEST_REDIS_ADDR") == "" {
		fmt.Fprintln(os.Stderr, "TES_REDIS_WAJIB=1 tetapi TEST_REDIS_ADDR kosong: tes yang butuh Redis tidak boleh dilewati")
		os.Exit(1)
	}
	os.Exit(m.Run())
}

func siapkan(t *testing.T) (*Klien, *redis.Client, string) {
	t.Helper()
	alamat := os.Getenv("TEST_REDIS_ADDR")
	if alamat == "" {
		t.Skip("TEST_REDIS_ADDR kosong: tes ini butuh Redis")
	}
	k := Baru(alamat, 500*time.Millisecond)
	t.Cleanup(func() { k.Tutup() })
	langsung := redis.NewClient(&redis.Options{Addr: alamat})
	t.Cleanup(func() { langsung.Close() })
	key := fmt.Sprintf("tes:redisbatas:%s:%d", t.Name(), time.Now().UnixNano())
	t.Cleanup(func() { langsung.Del(context.Background(), key) })
	return k, langsung, key
}

// Seratus goroutine menaikkan satu key: hitungan akhir tepat 100, setiap hitungan muncul sekali, dan key punya
// masa berlaku (tidak bocor).
func TestNaikAtomikDanBermasaBerlaku(t *testing.T) {
	k, langsung, key := siapkan(t)
	var wg sync.WaitGroup
	var mu sync.Mutex
	lihat := map[int64]int{}
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			n, _, err := k.Naik(context.Background(), key, 60*time.Second)
			if err != nil {
				t.Error(err)
				return
			}
			mu.Lock()
			lihat[n]++
			mu.Unlock()
		}()
	}
	wg.Wait()
	for n := int64(1); n <= 100; n++ {
		if lihat[n] != 1 {
			t.Fatalf("hitungan %d muncul %d kali, harus sekali", n, lihat[n])
		}
	}
	ttl := langsung.PTTL(context.Background(), key).Val()
	if ttl <= 0 || ttl > 60*time.Second {
		t.Fatalf("PTTL %v: key harus punya masa berlaku sampai 60 detik", ttl)
	}
}

// Key yang sudah telanjur tanpa masa berlaku (INCR tanpa EXPIRE, pola 2 di dokumentasi) diperbaiki oleh skrip.
func TestNaikMemperbaikiKeyTanpaMasaBerlaku(t *testing.T) {
	k, langsung, key := siapkan(t)
	ctx := context.Background()
	langsung.Incr(ctx, key)
	if ttl := langsung.PTTL(ctx, key).Val(); ttl != -1 {
		t.Fatalf("prasyarat: INCR saja meninggalkan PTTL -1, dapat %v", ttl)
	}
	n, sisa, err := k.Naik(ctx, key, 60*time.Second)
	if err != nil || n != 2 || sisa <= 0 {
		t.Fatalf("n=%d sisa=%v err=%v: ingin 2 dengan masa berlaku terpasang", n, sisa, err)
	}
}

// Masa berlaku tidak diperpanjang oleh hitungan berikutnya: jendela tetap.
func TestJendelaTidakDiperpanjang(t *testing.T) {
	k, _, key := siapkan(t)
	ctx := context.Background()
	_, pertama, _ := k.Naik(ctx, key, 5*time.Second)
	time.Sleep(200 * time.Millisecond)
	_, kedua, _ := k.Naik(ctx, key, 5*time.Second)
	if kedua >= pertama {
		t.Fatalf("sisa jendela naik dari %v ke %v: INCR berikutnya tidak boleh memasang ulang EXPIRE", pertama, kedua)
	}
}

// Alamat yang tidak menjawab: galat cepat (batas waktu 50 ms, tanpa retry), bukan menunggu bawaan go-redis.
func TestAlamatMatiGagalCepat(t *testing.T) {
	k := Baru("127.0.0.1:1", 50*time.Millisecond) // port 1: tidak ada yang mendengarkan
	defer k.Tutup()
	mulai := time.Now()
	if _, _, err := k.Naik(context.Background(), "x", time.Minute); err == nil {
		t.Fatal("ingin galat")
	}
	if lama := time.Since(mulai); lama > 2*time.Second {
		t.Fatalf("galat setelah %v, ingin di bawah 2 detik", lama)
	}
}
