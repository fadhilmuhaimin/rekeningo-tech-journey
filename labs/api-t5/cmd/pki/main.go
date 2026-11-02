// Membuat semua sertifikat lab t5-service di satu folder sementara: CA lab, sertifikat server ledger, sertifikat tiga
// service yang sah (pembayaran, notifikasi, cicilan), dan lima sertifikat yang sengaja salah untuk uji penolakan. Hanya
// lab: kunci privat ditulis dengan izin 0600 ke folder yang diberikan pemanggil (di lab, folder sementara di luar repo).
package main

import (
	"crypto/x509"
	"flag"
	"fmt"
	"log"
	"net"
	"time"

	"lab/apit5/internal/identitas"
	"lab/apit5/internal/pki"
)

func main() {
	folder := flag.String("dir", "", "folder tujuan (sudah ada, di luar repo)")
	flag.Parse()
	if *folder == "" {
		log.Fatal("-dir wajib")
	}
	kini := time.Now()
	jam := func(n float64) time.Time { return kini.Add(time.Duration(n * float64(time.Hour))) }
	tulis := func(nama, dariCA string, c *pki.CA, p pki.Pilihan) {
		s, k, err := c.Terbitkan(p)
		if err == nil {
			err = pki.Tulis(*folder, nama, s, k)
		}
		if err != nil {
			log.Fatalf("%s: %v", nama, err)
		}
		eku := "client"
		if p.EKU[0] == x509.ExtKeyUsageServerAuth {
			eku = "server"
		}
		masa := "sah"
		if p.Sampai.Before(kini) {
			masa = "kedaluwarsa"
		}
		san := "(tanpa SAN)"
		if len(p.DNS) > 0 {
			san = p.DNS[0]
		}
		fmt.Printf("%-15s CN=%-11s SAN=%-22s EKU=%-6s penerbit=%-6s %s\n", nama, p.CN, san, eku, dariCA, masa)
	}
	ca, err := pki.BuatCA("CA lab t5-service", jam(-1), jam(48))
	if err != nil {
		log.Fatal(err)
	}
	lain, err := pki.BuatCA("CA lain (tidak dipercaya ledger)", jam(-1), jam(48))
	if err != nil {
		log.Fatal(err)
	}
	if err := pki.Tulis(*folder, "ca", ca.PEM, nil); err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%-15s CN=%s (CA lab; sertifikat CA berlaku, kunci CA tidak ditulis)\n", "ca", ca.Sertifikat.Subject.CommonName)
	klien := []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth}
	san := func(n string) []string { return []string{n + "." + identitas.DomainBawaan} }
	tulis("ledger", "ca", ca, pki.Pilihan{CN: "ledger", DNS: san("ledger"), IP: []net.IP{net.IPv4(127, 0, 0, 1)},
		EKU: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}, Mulai: jam(-1), Sampai: jam(24)})
	for _, n := range []string{"pembayaran", "notifikasi", "cicilan"} {
		tulis(n, "ca", ca, pki.Pilihan{CN: n, DNS: san(n), EKU: klien, Mulai: jam(-1), Sampai: jam(24)})
	}
	// Lima sertifikat yang salah, masing-masing salah satu hal.
	tulis("kedaluwarsa", "ca", ca, pki.Pilihan{CN: "pembayaran", DNS: san("pembayaran"), EKU: klien, Mulai: jam(-48), Sampai: jam(-24)})
	tulis("dari-ca-lain", "ca-lain", lain, pki.Pilihan{CN: "pembayaran", DNS: san("pembayaran"), EKU: klien, Mulai: jam(-1), Sampai: jam(24)})
	tulis("hanya-server", "ca", ca, pki.Pilihan{CN: "pembayaran", DNS: san("pembayaran"),
		EKU: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}, Mulai: jam(-1), Sampai: jam(24)})
	tulis("tanpa-san", "ca", ca, pki.Pilihan{CN: "pembayaran", EKU: klien, Mulai: jam(-1), Sampai: jam(24)})
	tulis("cn-menyesatkan", "ca", ca, pki.Pilihan{CN: "pembayaran", DNS: san("notifikasi"), EKU: klien, Mulai: jam(-1), Sampai: jam(24)})
}
