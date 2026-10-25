// Package pki membuat CA dan sertifikat lab t3-mitm. Semua kunci dibuat acak setiap kali lab jalan dan ditulis ke
// folder sementara di luar repo; tidak ada sertifikat atau kunci yang di-commit. Hanya stdlib Go.
package pki

import (
	"crypto"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/base64"
	"encoding/hex"
	"encoding/pem"
	"fmt"
	"math/big"
	"net"
	"time"
)

// HariDaun adalah masa berlaku sertifikat daun di lab: batas maksimum CA/B Forum SC-081v3 sejak 2026-03-15 (R3-18).
const HariDaun = 200

// Nama yang masuk SAN sertifikat server lab dan sertifikat tiruan.
var (
	NamaDNS = []string{"localhost"}
	NamaIP  = []net.IP{net.ParseIP("127.0.0.1"), net.ParseIP("::1")}
)

func serialAcak() *big.Int {
	n, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 100))
	if err != nil {
		panic(err)
	}
	return n
}

// KunciBaru membuat kunci ECDSA P-256 acak.
func KunciBaru() *ecdsa.PrivateKey {
	k, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		panic(err)
	}
	return k
}

// CA adalah otoritas sertifikat lab: sertifikat dan kuncinya.
type CA struct {
	Cert  *x509.Certificate
	Kunci *ecdsa.PrivateKey
	DER   []byte
}

// BuatCA membuat CA akar baru. Masa berlaku 10 tahun: lab tidak menguji kedaluwarsa CA.
func BuatCA(cn string, sekarang time.Time) CA {
	k := KunciBaru()
	tpl := &x509.Certificate{
		SerialNumber:          serialAcak(),
		Subject:               pkix.Name{CommonName: cn, Organization: []string{"Lab Rekeningo (bukan CA sungguhan)"}},
		NotBefore:             sekarang.Add(-time.Hour),
		NotAfter:              sekarang.Add(10 * 365 * 24 * time.Hour),
		IsCA:                  true,
		BasicConstraintsValid: true,
		KeyUsage:              x509.KeyUsageCertSign | x509.KeyUsageCRLSign,
	}
	der, err := x509.CreateCertificate(rand.Reader, tpl, tpl, &k.PublicKey, k)
	if err != nil {
		panic(err)
	}
	c, _ := x509.ParseCertificate(der)
	return CA{Cert: c, Kunci: k, DER: der}
}

// Daun menandatangani sertifikat server untuk kunci publik itu, berlaku `hari` hari mulai `mulai`.
func (ca CA) Daun(kunci crypto.Signer, nama []string, ip []net.IP, mulai time.Time, hari int) *x509.Certificate {
	tpl := &x509.Certificate{
		SerialNumber: serialAcak(),
		Subject:      pkix.Name{CommonName: nama[0]},
		DNSNames:     nama,
		IPAddresses:  ip,
		NotBefore:    mulai,
		NotAfter:     mulai.Add(time.Duration(hari) * 24 * time.Hour),
		KeyUsage:     x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
	}
	der, err := x509.CreateCertificate(rand.Reader, tpl, ca.Cert, kunci.Public(), ca.Kunci)
	if err != nil {
		panic(err)
	}
	c, err := x509.ParseCertificate(der)
	if err != nil {
		panic(err)
	}
	return c
}

// PinSPKI adalah pin yang dipakai Android Network Security Config dan HPKP: base64 dari SHA-256 atas
// SubjectPublicKeyInfo. Hanya bergantung pada kunci publik, jadi sama untuk dua sertifikat dengan kunci yang sama.
func PinSPKI(c *x509.Certificate) string {
	h := sha256.Sum256(c.RawSubjectPublicKeyInfo)
	return base64.StdEncoding.EncodeToString(h[:])
}

// PinSertifikat adalah SHA-256 (heksadesimal) atas seluruh sertifikat: berubah di setiap penerbitan ulang.
func PinSertifikat(c *x509.Certificate) string {
	h := sha256.Sum256(c.Raw)
	return hex.EncodeToString(h[:])
}

// PEMSertifikat menulis sertifikat dalam format PEM.
func PEMSertifikat(der []byte) []byte {
	return pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
}

// PEMKunci menulis kunci privat dalam format PKCS#8 PEM.
func PEMKunci(k *ecdsa.PrivateKey) ([]byte, error) {
	der, err := x509.MarshalPKCS8PrivateKey(k)
	if err != nil {
		return nil, fmt.Errorf("marshal kunci: %w", err)
	}
	return pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: der}), nil
}

// MuatCA membaca CA dari berkas PEM sertifikat dan kunci.
func MuatCA(pemCert, pemKunci []byte) (CA, error) {
	b, _ := pem.Decode(pemCert)
	if b == nil {
		return CA{}, fmt.Errorf("sertifikat CA bukan PEM")
	}
	c, err := x509.ParseCertificate(b.Bytes)
	if err != nil {
		return CA{}, err
	}
	kb, _ := pem.Decode(pemKunci)
	if kb == nil {
		return CA{}, fmt.Errorf("kunci CA bukan PEM")
	}
	kk, err := x509.ParsePKCS8PrivateKey(kb.Bytes)
	if err != nil {
		return CA{}, err
	}
	ek, ok := kk.(*ecdsa.PrivateKey)
	if !ok {
		return CA{}, fmt.Errorf("kunci CA bukan ECDSA")
	}
	return CA{Cert: c, Kunci: ek, DER: b.Bytes}, nil
}
