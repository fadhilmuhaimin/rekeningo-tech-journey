package pki

import (
	"crypto/x509"
	"encoding/pem"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestTerbitkanMenolakEKUKosongDanMemakaiCAPenerbit(t *testing.T) {
	kini := time.Now()
	ca, err := BuatCA("CA tes", kini.Add(-time.Hour), kini.Add(time.Hour))
	if err != nil {
		t.Fatal(err)
	}
	if _, _, err := ca.Terbitkan(Pilihan{CN: "x", Mulai: kini, Sampai: kini.Add(time.Hour)}); err == nil {
		t.Error("EKU kosong harus ditolak: sertifikat tanpa penggunaan tertulis bisa dipakai untuk apa saja")
	}
	s, k, err := ca.Terbitkan(Pilihan{CN: "x", DNS: []string{"x.t5.lab"}, EKU: []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth}, Mulai: kini.Add(-time.Hour), Sampai: kini.Add(time.Hour)})
	if err != nil || len(k) == 0 {
		t.Fatalf("terbitkan: %v", err)
	}
	blok, _ := pem.Decode(s)
	c, err := x509.ParseCertificate(blok.Bytes)
	if err != nil {
		t.Fatal(err)
	}
	pool := x509.NewCertPool()
	pool.AddCert(ca.Sertifikat)
	if _, err := c.Verify(x509.VerifyOptions{Roots: pool, KeyUsages: []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth}}); err != nil {
		t.Errorf("sertifikat tidak lolos verifikasi terhadap CA penerbitnya: %v", err)
	}
	if _, err := c.Verify(x509.VerifyOptions{Roots: pool, KeyUsages: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}}); err == nil {
		t.Error("sertifikat clientAuth tidak boleh lolos sebagai sertifikat server")
	}
}

func TestTulisMemberiIzinKetatUntukKunciPrivat(t *testing.T) {
	dir := t.TempDir()
	if err := Tulis(dir, "a", []byte("sert"), []byte("kunci")); err != nil {
		t.Fatal(err)
	}
	st, err := os.Stat(filepath.Join(dir, "a.key"))
	if err != nil {
		t.Fatal(err)
	}
	if st.Mode().Perm() != 0o600 {
		t.Errorf("izin kunci privat %o, ingin 600", st.Mode().Perm())
	}
	if err := Tulis(dir, "ca", []byte("sert"), nil); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(dir, "ca.key")); err == nil {
		t.Error("kunci nil tidak boleh menulis berkas .key")
	}
}
