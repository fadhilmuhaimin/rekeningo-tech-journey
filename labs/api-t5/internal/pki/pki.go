// Package pki membuat CA lokal dan sertifikat service untuk lab t5-service (mTLS antar service). Hanya untuk lab:
// semua kunci dibuat saat dijalankan, ditulis ke folder sementara dengan izin 0600, dan tidak pernah masuk repo.
// Di produksi, penerbitan dan rotasi sertifikat dikerjakan sistem lain (naskah menyebut cert-manager); paket ini
// tidak menggantikannya.
package pki

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"errors"
	"math/big"
	"net"
	"os"
	"path/filepath"
	"time"
)

// CA: pasangan kunci dan sertifikat penerbit.
type CA struct {
	Sertifikat *x509.Certificate
	kunci      *ecdsa.PrivateKey
	PEM        []byte
}

// BuatCA membuat CA self-signed (ECDSA P-256) yang berlaku dari `mulai` sampai `sampai`.
func BuatCA(nama string, mulai, sampai time.Time) (*CA, error) {
	k, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, err
	}
	tpl := &x509.Certificate{
		SerialNumber:          nomorSeri(),
		Subject:               pkix.Name{CommonName: nama},
		NotBefore:             mulai,
		NotAfter:              sampai,
		IsCA:                  true,
		BasicConstraintsValid: true,
		KeyUsage:              x509.KeyUsageCertSign | x509.KeyUsageCRLSign,
	}
	der, err := x509.CreateCertificate(rand.Reader, tpl, tpl, &k.PublicKey, k)
	if err != nil {
		return nil, err
	}
	c, err := x509.ParseCertificate(der)
	if err != nil {
		return nil, err
	}
	return &CA{Sertifikat: c, kunci: k, PEM: pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})}, nil
}

// Pilihan: isi satu sertifikat. DNS kosong berarti tanpa SAN (dipakai untuk membuktikan bahwa identitas tidak dibaca dari CN).
type Pilihan struct {
	CN     string
	DNS    []string
	IP     []net.IP
	EKU    []x509.ExtKeyUsage
	Mulai  time.Time
	Sampai time.Time
}

// Terbitkan membuat kunci baru dan sertifikat yang ditandatangani CA ini. Mengembalikan PEM sertifikat dan PEM kunci privat.
func (c *CA) Terbitkan(p Pilihan) (sertifikat, kunci []byte, err error) {
	if len(p.EKU) == 0 {
		return nil, nil, errors.New("pki: EKU wajib diisi")
	}
	k, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, nil, err
	}
	tpl := &x509.Certificate{
		SerialNumber: nomorSeri(),
		Subject:      pkix.Name{CommonName: p.CN},
		DNSNames:     p.DNS,
		IPAddresses:  p.IP,
		NotBefore:    p.Mulai,
		NotAfter:     p.Sampai,
		KeyUsage:     x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  p.EKU,
	}
	der, err := x509.CreateCertificate(rand.Reader, tpl, c.Sertifikat, &k.PublicKey, c.kunci)
	if err != nil {
		return nil, nil, err
	}
	kd, err := x509.MarshalECPrivateKey(k)
	if err != nil {
		return nil, nil, err
	}
	return pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}),
		pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: kd}), nil
}

// Tulis menulis pasangan `<nama>.pem` dan `<nama>.key` ke folder; kunci privat berizin 0600.
func Tulis(folder, nama string, sertifikat, kunci []byte) error {
	if err := os.WriteFile(filepath.Join(folder, nama+".pem"), sertifikat, 0o644); err != nil {
		return err
	}
	if kunci == nil {
		return nil
	}
	return os.WriteFile(filepath.Join(folder, nama+".key"), kunci, 0o600)
}

func nomorSeri() *big.Int {
	n, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 62))
	if err != nil {
		panic(err)
	}
	return n.Add(n, big.NewInt(1))
}
