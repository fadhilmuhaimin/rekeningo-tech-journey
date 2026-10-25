// pki membuat CA dan sertifikat lab t3-mitm di folder sementara (dibuat acak setiap lab jalan, tidak di-commit).
//
//	pki -dir DIR          menulis ca-publik, ca-dimas, ca-staging, server-a, server-a2 (kunci A, terbit ulang),
//	                      server-b, server-c, staging (ditandatangani ca-staging), dan pins.json (pin SPKI dan
//	                      hash sertifikat)
//	pki -umur             menghitung masa berlaku sertifikat daun lab dan memverifikasi pada hari ke-199 dan ke-201
//	                      dengan jam tiruan (tidak menunggu)
package main

import (
	"crypto/ecdsa"
	"crypto/x509"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"lab/t3mitm/internal/pki"
)

func tulis(dir, nama string, isi []byte, mode os.FileMode) {
	if err := os.WriteFile(filepath.Join(dir, nama), isi, mode); err != nil {
		fmt.Fprintln(os.Stderr, "GAGAL:", err)
		os.Exit(1)
	}
}

func main() {
	dir := flag.String("dir", "", "folder keluaran (harus sudah ada)")
	umur := flag.Bool("umur", false, "hitung masa berlaku daun dan verifikasi dengan jam tiruan")
	flag.Parse()
	now := time.Now().Truncate(time.Second).Add(-5 * time.Minute)
	if *umur {
		hitungUmur(now)
		return
	}
	if *dir == "" {
		fmt.Fprintln(os.Stderr, "GAGAL: -dir wajib")
		os.Exit(2)
	}
	publik := pki.BuatCA("CA Lab Publik", now)
	dimas := pki.BuatCA("CA Dimas", now)
	staging := pki.BuatCA("CA Staging", now)
	for nama, ca := range map[string]pki.CA{"ca-publik": publik, "ca-dimas": dimas, "ca-staging": staging} {
		k, _ := pki.PEMKunci(ca.Kunci)
		tulis(*dir, nama+".pem", pki.PEMSertifikat(ca.DER), 0o644)
		tulis(*dir, nama+".key", k, 0o600)
	}
	kA, kB, kC, kS := pki.KunciBaru(), pki.KunciBaru(), pki.KunciBaru(), pki.KunciBaru()
	daun := map[string]*x509.Certificate{
		"server-a":  publik.Daun(kA, pki.NamaDNS, pki.NamaIP, now, pki.HariDaun),
		"server-a2": publik.Daun(kA, pki.NamaDNS, pki.NamaIP, now, pki.HariDaun), // terbit ulang, kunci A yang sama
		"server-b":  publik.Daun(kB, pki.NamaDNS, pki.NamaIP, now, pki.HariDaun),
		"server-c":  publik.Daun(kC, pki.NamaDNS, pki.NamaIP, now, pki.HariDaun),
		"staging":   staging.Daun(kS, pki.NamaDNS, pki.NamaIP, now, pki.HariDaun), // server staging: CA buatan sendiri
	}
	kunci := map[string]*ecdsa.PrivateKey{"server-a": kA, "server-a2": kA, "server-b": kB, "server-c": kC, "staging": kS}
	pins := map[string]string{}
	for nama, c := range daun {
		k, _ := pki.PEMKunci(kunci[nama])
		tulis(*dir, nama+".pem", pki.PEMSertifikat(c.Raw), 0o644)
		tulis(*dir, nama+".key", k, 0o600)
		pins["spki_"+nama] = pki.PinSPKI(c)
		pins["cert_"+nama] = pki.PinSertifikat(c)
	}
	j, _ := json.MarshalIndent(pins, "", "  ")
	tulis(*dir, "pins.json", j, 0o644)
}

func hitungUmur(now time.Time) {
	ca := pki.BuatCA("CA Lab Publik", now)
	d := ca.Daun(pki.KunciBaru(), pki.NamaDNS, pki.NamaIP, now, pki.HariDaun)
	akar := x509.NewCertPool()
	akar.AddCert(ca.Cert)
	fmt.Printf("masa_berlaku_hari=%d\n", int(d.NotAfter.Sub(d.NotBefore).Hours()/24))
	for _, hari := range []int{199, 201} {
		_, err := d.Verify(x509.VerifyOptions{Roots: akar, DNSName: "localhost", CurrentTime: now.Add(time.Duration(hari) * 24 * time.Hour)})
		hasil := "lolos"
		if err != nil {
			hasil = "ditolak: " + err.Error()
			if _, ok := err.(x509.CertificateInvalidError); ok {
				hasil = "ditolak: sertifikat kedaluwarsa"
			}
		}
		fmt.Printf("hari_ke_%d=%s\n", hari, hasil)
	}
}
