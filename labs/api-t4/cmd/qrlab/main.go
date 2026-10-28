// Perintah qrlab: alat lab t4-qr untuk membangun, memeriksa, memalsukan, dan merusak payload QR (internal/qrpayload).
// Bukan bagian server: server api-t4 tidak membaca payload, hanya id QR (uuid). Pemindai dan pemalsu di lab ini adalah
// skrip yang memanggil perintah ini, bukan app dan bukan penyerang sungguhan.
//
//	qrlab buat  -jenis statis|dinamis -id UUID -nama NAMA -kota KOTA [-nominal N]
//	qrlab urai  PAYLOAD                      (exit 0 dan JSON bila lolos; "galat <kode>" dan exit 1 bila tidak)
//	qrlab ganti [-id UUID] [-nominal N] [-nama NAMA] [-kota KOTA] PAYLOAD   (CRC dihitung ulang tanpa kunci apa pun)
//	qrlab rusak -posisi N PAYLOAD            (satu karakter diganti, CRC tidak disentuh: salah baca)
//	qrlab crc   TEKS                         (CRC-16 empat karakter heksadesimal)
package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"

	"lab/apit4/internal/qrpayload"
)

func keluar(kode int, format string, a ...any) {
	fmt.Printf(format+"\n", a...)
	os.Exit(kode)
}

func namaGalat(err error) string {
	switch {
	case errors.Is(err, qrpayload.ErrCRC):
		return "crc"
	case errors.Is(err, qrpayload.ErrInisiasi):
		return "inisiasi"
	case errors.Is(err, qrpayload.ErrIsi):
		return "isi"
	default:
		return "bentuk"
	}
}

func main() {
	if len(os.Args) < 2 {
		keluar(2, "pakai: qrlab buat|urai|ganti|rusak|crc ...")
	}
	fs := flag.NewFlagSet(os.Args[1], flag.ExitOnError)
	jenis := fs.String("jenis", "", "statis atau dinamis")
	id := fs.String("id", "", "id QR (uuid)")
	nama := fs.String("nama", "", "nama merchant")
	kota := fs.String("kota", "", "kota merchant")
	nominal := fs.Int64("nominal", 0, "nominal (0 = tidak ada)")
	posisi := fs.Int("posisi", -1, "posisi karakter yang dirusak")
	fs.Parse(os.Args[2:])
	diisi := map[string]bool{}
	fs.Visit(func(f *flag.Flag) { diisi[f.Name] = true })

	switch os.Args[1] {
	case "buat":
		i := qrpayload.Isi{Jenis: *jenis, ID: *id, Nama: *nama, Kota: *kota}
		if *nominal != 0 {
			i.Nominal = nominal
		}
		p, err := qrpayload.Bangun(i)
		if err != nil {
			keluar(1, "galat %s: %v", namaGalat(err), err)
		}
		fmt.Println(p)
	case "urai":
		i, err := qrpayload.Urai(fs.Arg(0))
		if err != nil {
			keluar(1, "galat %s: %v", namaGalat(err), err)
		}
		b, _ := json.Marshal(i)
		fmt.Println(string(b))
	case "ganti":
		p, err := qrpayload.Ganti(fs.Arg(0), func(i *qrpayload.Isi) {
			if diisi["id"] {
				i.ID = *id
			}
			if diisi["nama"] {
				i.Nama = *nama
			}
			if diisi["kota"] {
				i.Kota = *kota
			}
			if diisi["nominal"] {
				i.Nominal = nominal
			}
		})
		if err != nil {
			keluar(1, "galat %s: %v", namaGalat(err), err)
		}
		fmt.Println(p)
	case "rusak":
		p := fs.Arg(0)
		if *posisi < 0 || *posisi >= len(p) {
			keluar(2, "posisi di luar payload")
		}
		pengganti := byte('0')
		if p[*posisi] == '0' {
			pengganti = '1'
		}
		fmt.Println(p[:*posisi] + string(pengganti) + p[*posisi+1:])
	case "crc":
		fmt.Printf("%04X\n", qrpayload.CRC16([]byte(fs.Arg(0))))
	default:
		keluar(2, "perintah tidak dikenal: %s", os.Args[1])
	}
}
