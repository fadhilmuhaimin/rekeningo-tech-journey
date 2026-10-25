package pki

import (
	"crypto/x509"
	"testing"
	"time"
)

func TestPinSPKIHanyaBergantungPadaKunci(t *testing.T) {
	now := time.Now()
	ca := BuatCA("CA uji", now)
	a, b := KunciBaru(), KunciBaru()
	a1 := ca.Daun(a, NamaDNS, NamaIP, now, HariDaun)
	a2 := ca.Daun(a, NamaDNS, NamaIP, now.Add(time.Hour), HariDaun) // penerbitan ulang dengan kunci yang sama
	b1 := ca.Daun(b, NamaDNS, NamaIP, now, HariDaun)
	if PinSPKI(a1) != PinSPKI(a2) {
		t.Fatal("kunci sama harus memberi pin SPKI sama")
	}
	if PinSertifikat(a1) == PinSertifikat(a2) {
		t.Fatal("penerbitan ulang harus mengubah hash sertifikat")
	}
	if PinSPKI(a1) == PinSPKI(b1) {
		t.Fatal("kunci beda harus memberi pin SPKI beda")
	}
}

func TestMasaBerlakuDaun200HariDanBatasVerifikasi(t *testing.T) {
	now := time.Now().Truncate(time.Second)
	ca := BuatCA("CA uji", now)
	d := ca.Daun(KunciBaru(), NamaDNS, NamaIP, now, HariDaun)
	if got := d.NotAfter.Sub(d.NotBefore); got != 200*24*time.Hour {
		t.Fatalf("masa berlaku %v", got)
	}
	akar := x509.NewCertPool()
	akar.AddCert(ca.Cert)
	cek := func(hari int) error {
		_, err := d.Verify(x509.VerifyOptions{Roots: akar, DNSName: "localhost", CurrentTime: now.Add(time.Duration(hari) * 24 * time.Hour)})
		return err
	}
	if err := cek(199); err != nil {
		t.Fatalf("hari ke-199 harus lolos: %v", err)
	}
	if err := cek(201); err == nil {
		t.Fatal("hari ke-201 harus kedaluwarsa")
	}
}

func TestMuatCABolakBalik(t *testing.T) {
	now := time.Now()
	ca := BuatCA("CA uji", now)
	k, err := PEMKunci(ca.Kunci)
	if err != nil {
		t.Fatal(err)
	}
	m, err := MuatCA(PEMSertifikat(ca.DER), k)
	if err != nil {
		t.Fatal(err)
	}
	if m.Cert.Subject.CommonName != "CA uji" {
		t.Fatal("CN tidak sama")
	}
}
