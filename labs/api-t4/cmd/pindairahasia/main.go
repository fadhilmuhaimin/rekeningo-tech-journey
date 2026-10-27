// Command pindairahasia mencari kunci produksi di berkas staging (lab t4-infra, M34, ADR 39): token berawalan kunci
// produksi, atau token yang SHA-256-nya ada di daftar sidik rahasia produksi. Keluaran memuat berkas, nomor baris, dan
// alasan; nilai kunci tidak pernah dicetak. Exit 1 bila ada temuan (juga baris yang tidak bisa dipindai), 0 bila bersih, 2 bila argumen atau berkas salah.
//
//	pindairahasia -awalan gw_live_ -sidik produksi.sidik staging/.env staging/konfigurasi.json
package main

import (
	"bufio"
	"flag"
	"fmt"
	"os"
	"strings"

	"lab/apit4/internal/rahasia"
)

func main() {
	awalan := flag.String("awalan", "", "awalan kunci produksi, mis. gw_live_")
	berkasSidik := flag.String("sidik", "", "berkas berisi satu SHA-256 heksadesimal penuh per baris (sidik rahasia produksi)")
	flag.Parse()
	if flag.NArg() == 0 || (*awalan == "" && *berkasSidik == "") {
		fmt.Fprintln(os.Stderr, "pemakaian: pindairahasia [-awalan x] [-sidik berkas] <berkas...>")
		os.Exit(2)
	}
	sidik := map[string]bool{}
	if *berkasSidik != "" {
		f, err := os.Open(*berkasSidik)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(2)
		}
		sc := bufio.NewScanner(f)
		for sc.Scan() {
			if s := strings.TrimSpace(sc.Text()); s != "" {
				sidik[s] = true
			}
		}
		f.Close()
		if err := sc.Err(); err != nil { // daftar sidik yang terpotong membuat aturan sidik diam-diam lebih lemah
			fmt.Fprintln(os.Stderr, err)
			os.Exit(2)
		}
	}
	ada := false
	for _, nama := range flag.Args() {
		isi, err := os.ReadFile(nama)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(2)
		}
		for _, t := range rahasia.Pindai(nama, isi, *awalan, sidik) {
			ada = true
			if t.Alasan == rahasia.AlasanTakTerbaca {
				fmt.Printf("%s:%d: baris tidak bisa dipindai (lebih panjang dari %d byte); sisa berkas tidak diperiksa\n", t.Berkas, t.Baris, rahasia.BatasBaris)
				continue
			}
			fmt.Printf("%s:%d: kunci produksi (%s)\n", t.Berkas, t.Baris, t.Alasan)
		}
	}
	if ada {
		os.Exit(1)
	}
}
