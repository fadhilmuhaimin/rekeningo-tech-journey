// Lab API Tahap 2 · Rekeningo (fiktif), mengikuti plan/CERITA-TAHAP-2.md (keputusan 408).
// api-t1 yang naik ke ledger: monolith yang sama, tiga lapisan (internal/handler, internal/service, internal/repo),
// satu PostgreSQL. Uang hanya berpindah lewat jurnal dan posting; saldo = buku.saldo_cache, dicek ulang tiap malam.
package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"sync/atomic"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"golang.org/x/crypto/bcrypt"

	"lab/apit2/internal/handler"
	"lab/apit2/internal/repo"
	"lab/apit2/internal/service"
)

func main() {
	alamat := flag.String("addr", "127.0.0.1:18093", "alamat server")
	umurSesi := flag.Duration("umur-sesi", 8*time.Hour, "masa berlaku sesi (asumsi: satu hari kerja)")
	kampus := flag.Bool("seed-kampus", false, "daftarkan akun kampus pusat (data lab) sesudah expand, lalu keluar")
	cekCache := flag.Bool("cek-cache", false, "bandingkan saldo_cache setiap buku dengan jumlah posting (job malam), lalu keluar")
	rentan := flag.String("rentan", "", "mode rentan untuk rekaman halaman masalah; Tahap 2 belum punya mode")
	jamLab := flag.Bool("jam-lab", false, "lab saja: POST /lab/jam {\"ms\": ...} membekukan waktu service dan rate limit (rekaman pengaman.txt)")
	flag.Parse()

	url := os.Getenv("DATABASE_URL")
	if url == "" {
		log.Fatal("DATABASE_URL kosong")
	}
	db, err := sql.Open("pgx", url)
	if err != nil {
		log.Fatal(err)
	}
	r := repo.Baru(db)
	switch {
	case *kampus:
		if err := daftarkanKampus(r); err != nil {
			log.Fatal(err)
		}
		return
	case *cekCache:
		os.Exit(jalankanCekCache(r))
	}
	svc := service.Baru(r, *umurSesi)
	var jamMS atomic.Int64 // 0 = waktu sungguhan
	if *jamLab {
		svc = svc.DenganJam(func() time.Time {
			if ms := jamMS.Load(); ms != 0 {
				return time.UnixMilli(ms)
			}
			return time.Now()
		})
	}
	srv := handler.Baru(svc)
	if *rentan != "" {
		log.Fatalf("mode rentan tidak dikenal: %s", *rentan)
	}
	rute := srv.Rute()
	if *jamLab {
		// Jam tiruan (pola labs/c4-ratelimit, keputusan 549): bucket tidak terisi di tengah rekaman, jadi status
		// dan Retry-After sama di setiap run. Hanya dengan flag; server biasa tidak punya endpoint ini.
		rute.HandleFunc("POST /lab/jam", func(w http.ResponseWriter, r *http.Request) {
			var in struct {
				Ms int64 `json:"ms"`
			}
			if json.NewDecoder(r.Body).Decode(&in) != nil {
				w.WriteHeader(http.StatusBadRequest)
				return
			}
			jamMS.Store(in.Ms)
			w.WriteHeader(http.StatusNoContent)
		})
	}
	log.Printf("api-t2 mendengar di %s", *alamat)
	log.Fatal(http.ListenAndServe(*alamat, rute))
}

// --8<-- [start:cek-cache]
// jalankanCekCache: job malam (naskah 3b). Exit 1 bila ada buku yang saldo_cache-nya berbeda dari jumlah
// posting, supaya penjadwal (cron) bisa memberi tahu. Cache tidak diperbaiki otomatis: selisih berarti ada kode
// yang menulis cache tanpa posting, dan itu yang harus dicari.
func jalankanCekCache(r repo.Repo) int {
	n, beda, err := r.CekCache(context.Background())
	if err != nil {
		log.Print(err)
		return 2
	}
	for _, b := range beda {
		fmt.Printf("buku %d (%s %s): saldo_cache %d, jumlah posting %d, selisih %d\n",
			b.BukuID, b.Jenis, b.Nama, b.Cache, b.Posting, b.Cache-b.Posting)
	}
	fmt.Printf("cek cache: %d buku diperiksa, %d tidak cocok\n", n, len(beda))
	if len(beda) > 0 {
		return 1
	}
	return 0
}

// --8<-- [end:cek-cache]

// daftarkanKampus (data lab, keputusan 413): Citra (504), 9 warung baru (505-513), dan 899 karyawan (514-1412).
// Bersama 100 karyawan dan 3 warung Gedung A: 1.000 karyawan dan 12 warung (naskah Tahap 2, Latar).
// Password sementara sementara-<nomor akun>, wajib diganti saat login pertama: /login menjawab 403 sampai
// POST /ganti-password berhasil (lab-api-t2a, keputusan 647). Pola password sementara ini hanya data lab.
func daftarkanKampus(r repo.Repo) error {
	var akun []repo.AkunBaru
	tambah := func(id int64, jenis, nama, email string) {
		a := repo.AkunBaru{ID: id, Jenis: jenis, Nama: nama, Email: email}
		if jenis == "karyawan" {
			nomor := fmt.Sprintf("K%05d", id)
			a.NomorKaryawan = &nomor
		}
		akun = append(akun, a)
	}
	tambah(504, "karyawan", "Citra", "citra@lestari.example")
	for id := int64(505); id <= 513; id++ {
		tambah(id, "warung", fmt.Sprintf("Warung %d", id), fmt.Sprintf("warung%d@lestari.example", id))
	}
	for id := int64(514); id <= 1412; id++ {
		tambah(id, "karyawan", fmt.Sprintf("Karyawan %d", id), fmt.Sprintf("karyawan%d@lestari.example", id))
	}
	// bcrypt sengaja lambat (±50 ms per hash); 909 hash dibagi ke 8 goroutine.
	var wg sync.WaitGroup
	galat := make([]error, len(akun))
	kerja := make(chan int)
	for g := 0; g < 8; g++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range kerja {
				h, err := bcrypt.GenerateFromPassword([]byte(fmt.Sprintf("sementara-%d", akun[i].ID)), bcrypt.DefaultCost)
				akun[i].PasswordHash, galat[i] = string(h), err
			}
		}()
	}
	for i := range akun {
		kerja <- i
	}
	close(kerja)
	wg.Wait()
	for _, err := range galat {
		if err != nil {
			return err
		}
	}
	return r.DaftarkanKampus(context.Background(), akun)
}
