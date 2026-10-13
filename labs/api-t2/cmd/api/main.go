// Lab API Tahap 1 · Rekeningo (fiktif), mengikuti plan/CERITA-TAHAP-1.md (keputusan 132).
// Satu monolith, tiga lapisan (internal/handler, internal/service, internal/repo), satu PostgreSQL.
package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"golang.org/x/crypto/bcrypt"

	"lab/apit2/internal/handler"
	"lab/apit2/internal/repo"
	"lab/apit2/internal/service"
)

func main() {
	seed := flag.Bool("seed", false, "isi data awal uji coba Gedung A, lalu keluar")
	alamat := flag.String("addr", "127.0.0.1:18083", "alamat server")
	umurSesi := flag.Duration("umur-sesi", 8*time.Hour, "masa berlaku sesi (asumsi: satu hari kerja)")
	rentan := flag.String("rentan", "", "mode rentan untuk rekaman halaman masalah: m1 (tanpa pemeriksaan jumlah), m2 (body sebelum kontrak), m3 (pencarian rentan injection), m4 (bayar tanpa transaction), m5 (lihat akun tanpa cek pemilik); kosong = versi benar")
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
	if *seed {
		if err := isiAwal(r); err != nil {
			log.Fatal(err)
		}
		return
	}
	srv := handler.Baru(service.Baru(r, *umurSesi))
	if *rentan != "" {
		if *rentan != "m1" && *rentan != "m2" && *rentan != "m3" && *rentan != "m4" && *rentan != "m5" {
			log.Fatalf("mode rentan tidak dikenal: %s", *rentan)
		}
		srv = srv.DenganRentan(*rentan)
		log.Printf("PERINGATAN: mode rentan %s menyala", *rentan)
	}
	log.Printf("api-t1 mendengar di %s", *alamat)
	log.Fatal(http.ListenAndServe(*alamat, srv.Rute()))
}

// isiAwal: 1 admin Keuangan, 100 karyawan Gedung A, 3 warung. Nomor akun berurutan menurut waktu daftar,
// jadi akun Dimas (417) bersebelahan dengan Warung Ani (418). Password di sini password sementara lab.
func isiAwal(r repo.Repo) error {
	ctx := context.Background()
	tambah := func(id int64, jenis, nama, email string) error {
		hash, err := bcrypt.GenerateFromPassword([]byte(fmt.Sprintf("sementara-%d", id)), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		return r.SeedAkun(ctx, repo.Akun{ID: id, Jenis: jenis, Nama: nama}, email, string(hash))
	}
	if err := tambah(400, "admin", "Admin Tunjangan", "admin.tunjangan@lestari.example"); err != nil {
		return err
	}
	karyawan := 0
	for id := int64(401); karyawan < 100; id++ {
		var err error
		switch id {
		case 417:
			err = tambah(id, "karyawan", "Dimas", "dimas@lestari.example")
		case 418:
			err = tambah(id, "warung", "Warung Ani", "warung.ani@lestari.example")
			karyawan-- // 418 warung, bukan karyawan
		case 419:
			err = tambah(id, "karyawan", "Budi", "budi@lestari.example")
		default:
			err = tambah(id, "karyawan", fmt.Sprintf("Karyawan %d", id), fmt.Sprintf("karyawan%d@lestari.example", id))
		}
		if err != nil {
			return err
		}
		karyawan++
	}
	if err := tambah(502, "warung", "Warung Sari", "warung.sari@lestari.example"); err != nil {
		return err
	}
	return tambah(503, "warung", "Warung Mie Pak Joko", "warung.joko@lestari.example")
}
