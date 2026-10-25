package main

import (
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"testing"
	"time"

	"lab/t3mitm/internal/pki"
)

func TestUbahKirimanGantiNominalDanTujuan(t *testing.T) {
	asli := []byte(`{"ke_nomor_karyawan":"K00504","nominal":10000,"catatan":"patungan"}`)
	baru, berubah := ubahKiriman(asli, 150000, "K00417")
	if !berubah {
		t.Fatal("harus berubah")
	}
	var m map[string]any
	if err := json.Unmarshal(baru, &m); err != nil {
		t.Fatal(err)
	}
	if m["nominal"] != float64(150000) || m["ke_nomor_karyawan"] != "K00417" || m["catatan"] != "patungan" {
		t.Fatalf("hasil: %v", m)
	}
	if b, ok := ubahKiriman(asli, 0, ""); ok || string(b) != string(asli) {
		t.Fatal("tanpa aturan, body tidak boleh berubah")
	}
}

func TestSertifikatPalsuLolosVerifikasiHanyaDiCADimas(t *testing.T) {
	now := time.Now()
	dimas, publik := pki.BuatCA("CA Dimas", now), pki.BuatCA("CA Lab Publik", now)
	asli := publik.Daun(pki.KunciBaru(), pki.NamaDNS, pki.NamaIP, now.Add(-time.Minute), pki.HariDaun)
	p := &pemalsu{ca: dimas, cache: map[string]*tls.Certificate{}}
	c := p.untuk("localhost")
	palsu, _ := x509.ParseCertificate(c.Certificate[0])
	akarDimas, akarPublik := x509.NewCertPool(), x509.NewCertPool()
	akarDimas.AddCert(dimas.Cert)
	akarPublik.AddCert(publik.Cert)
	if _, err := palsu.Verify(x509.VerifyOptions{Roots: akarDimas, DNSName: "localhost"}); err != nil {
		t.Fatalf("lolos di CA Dimas: %v", err)
	}
	if _, err := palsu.Verify(x509.VerifyOptions{Roots: akarPublik, DNSName: "localhost"}); err == nil {
		t.Fatal("tidak boleh lolos di CA publik")
	}
	if pki.PinSPKI(palsu) == pki.PinSPKI(asli) {
		t.Fatal("pin SPKI palsu harus beda dari yang asli")
	}
}
