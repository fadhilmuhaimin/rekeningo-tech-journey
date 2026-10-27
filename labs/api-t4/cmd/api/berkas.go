package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	"lab/apit4/internal/objek"
	"lab/apit4/internal/repo"
	"lab/apit4/internal/service"
)

// pilihanObjek: setelan penyimpanan objek untuk file identitas (ADR 38, lab t4-storage).
type pilihanObjek struct {
	Dir      string        // -objek-dir: direktori lokal (bawaan)
	S3       string        // -objek-s3: endpoint S3 lokal; kunci akses dan rahasia dari OBJEK_S3_KUNCI dan OBJEK_S3_RAHASIA (data lab)
	Bucket   string        // -objek-bucket
	Presign  time.Duration // -objek-presign-umur; 0 = service.UmurPresign
	MaksBaca int64
	Bytea    bool // mode rentan berkas-bytea (M33 versi pertama)
	// PastikanBucket: server membuat bucket bila belum ada dan berhenti bila penyimpanan tidak menjawab. Job (mis.
	// retensi) tidak: job harus tetap berjalan saat penyimpanan mati dan melaporkan galat per file.
	PastikanBucket bool
}

// bukaObjek memilih penyimpanan: bytea (rentan) > S3 > direktori. Gagal keras bila S3 diminta tanpa kunci akses.
func bukaObjek(ctx context.Context, db *sql.DB, p pilihanObjek) objek.Penyimpan {
	switch {
	case p.Bytea:
		return objek.Bytea{DB: db}
	case p.S3 != "":
		kunci, rahasia := os.Getenv("OBJEK_S3_KUNCI"), os.Getenv("OBJEK_S3_RAHASIA")
		if kunci == "" || rahasia == "" {
			log.Fatal("-objek-s3 butuh OBJEK_S3_KUNCI dan OBJEK_S3_RAHASIA (data lab, bukan secret)")
		}
		s := objek.S3{Endpoint: p.S3, Bucket: p.Bucket, Kunci: kunci, Rahasia: rahasia, MaksBaca: p.MaksBaca}
		if p.PastikanBucket {
			if err := s.PastikanBucket(ctx); err != nil {
				log.Fatalf("bucket %s: %v", p.Bucket, err)
			}
		}
		return s
	}
	return objek.Dir{Akar: p.Dir}
}

// jalankanRetensi: job sekali jalan (ADR 38): hapus file identitas yang masa simpannya sudah sampai. sekarang
// (RFC 3339, lab saja) menggantikan waktu service supaya batas 30 hari bisa diperankan tanpa menunggu.
func jalankanRetensi(r repo.Repo, umurSesi time.Duration, dep service.Dep, sekarang string) int {
	svc := service.Baru(r, umurSesi).DenganT4(dep)
	if sekarang != "" {
		t, err := time.Parse(time.RFC3339, sekarang)
		if err != nil {
			log.Printf("-lab-sekarang: %v", err)
			return 2
		}
		svc = svc.DenganJam(func() time.Time { return t })
	}
	h, err := svc.HapusBerkasJatuhTempo(context.Background())
	if err != nil {
		log.Print(err)
		return 2
	}
	fmt.Printf("retensi identitas: diperiksa %d, dihapus %d, galat %d\n", h.Diperiksa, h.Dihapus, h.Galat)
	return 0
}
