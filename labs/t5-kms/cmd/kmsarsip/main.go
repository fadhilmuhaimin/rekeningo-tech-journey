// Command kmsarsip: arsipkan, buka, rewrap, dan verifikasi file arsip partisi (ADR 57, lab t5-kms).
// OpenBao dari BAO_ADDR, BAO_TOKEN, dan BAO_KUNCI (nama kunci transit). Token tidak lewat argumen perintah.
// Keluar 0 bila berhasil, 2 bila pemeriksaan gagal (berkas diubah, ditolak KMS, jangkar tidak cocok), 1 bila salah pakai.
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"time"

	"lab/t5kms/bao"
	"lab/t5kms/envelope"
	"lab/t5kms/jangkar"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "kmsarsip: perintah: arsipkan | buka | rewrap | verifikasi")
		os.Exit(1)
	}
	ctx, batal := context.WithTimeout(context.Background(), 20*time.Second)
	defer batal()
	k := &bao.Klien{Alamat: os.Getenv("BAO_ADDR"), Token: os.Getenv("BAO_TOKEN"), Kunci: os.Getenv("BAO_KUNCI")}
	fs := flag.NewFlagSet(os.Args[1], flag.ExitOnError)
	sumber := fs.String("sumber", "", "berkas asal (teks biasa)")
	tujuan := fs.String("tujuan", "", "berkas terenkripsi (harus belum ada)")
	periode := fs.String("periode", "", "periode arsip, YYYY-MM-01")
	berkas := fs.String("berkas", "", "berkas terenkripsi")
	terbungkus := fs.String("terbungkus", "", "data key terbungkus")
	keluar := fs.String("keluar", "", "berkas hasil dekripsi (opsional)")
	jang := fs.String("jangkar", "", "berkas jangkar di luar database")
	checksumDB := fs.String("checksum-db", "", "checksum yang tercatat di arsip_partisi")
	_ = fs.Parse(os.Args[2:])

	switch os.Args[1] {
	case "arsipkan":
		h, err := envelope.Arsipkan(ctx, k, *sumber, *tujuan, *periode)
		berhenti(err)
		berhenti(jangkar.Catat(*jang, *periode, h.Checksum))
		b, _ := json.Marshal(h)
		fmt.Println(string(b))
	case "buka":
		teks, err := envelope.Buka(ctx, k, *berkas, *terbungkus, *periode)
		berhenti(err)
		if *keluar != "" {
			berhenti(os.WriteFile(*keluar, teks, 0o600))
		}
		fmt.Printf("terbuka: %d byte\n", len(teks))
	case "rewrap":
		baru, err := k.Rewrap(ctx, *terbungkus)
		berhenti(err)
		v, err := envelope.VersiKEK(baru)
		berhenti(err)
		b, _ := json.Marshal(map[string]any{"data_key_terbungkus": baru, "versi_kek": v})
		fmt.Println(string(b))
	case "verifikasi":
		isi, err := os.ReadFile(*berkas)
		berhenti(err)
		sekarang := envelope.Checksum(isi)
		status := func(ok bool) string {
			if ok {
				return "cocok"
			}
			return "beda"
		}
		j, ada, err := jangkar.Cari(*jang, *periode)
		berhenti(err)
		sj := "tidak-ada"
		if ada {
			sj = status(j.Checksum == sekarang)
		}
		sd := status(*checksumDB == sekarang)
		fmt.Printf("berkas-lawan-database=%s berkas-lawan-jangkar=%s database-lawan-jangkar=%s\n", sd, sj, func() string {
			if !ada {
				return "tidak-ada"
			}
			return status(j.Checksum == *checksumDB)
		}())
		if sd != "cocok" || sj != "cocok" {
			os.Exit(2)
		}
	default:
		fmt.Fprintln(os.Stderr, "kmsarsip: perintah tidak dikenal:", os.Args[1])
		os.Exit(1)
	}
}

func berhenti(err error) {
	if err != nil {
		fmt.Fprintln(os.Stderr, "kmsarsip:", err)
		os.Exit(2)
	}
}
