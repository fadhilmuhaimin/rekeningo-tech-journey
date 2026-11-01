// Package identitas adalah sisi mTLS dan otorisasi per pemanggil untuk lab t5-service (M47, ADR 53).
//
// Dua lapis, dengan jawaban berbeda: sertifikat yang tidak sah ditolak saat handshake (handler tidak pernah jalan),
// dan identitas yang sah tetapi tanpa izin untuk satu jenis jurnal dijawab 403 oleh handler. Identitas hanya dibaca
// dari SAN sertifikat yang sudah lolos verifikasi rantai, tidak dari CN dan tidak dari header.
package identitas

import (
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"regexp"
	"strings"
	"time"
)

// DomainBawaan: SAN identitas service berbentuk `<nama>.t5.lab` (domain lab, bukan domain nyata).
const DomainBawaan = "t5.lab"

// Izin memetakan identitas service ke jenis jurnal yang boleh dibuatnya di ledger.
type Izin map[string][]string

// IzinNaskah: tabel dari naskah Tahap 5 (ADR 53). `notifikasi` dan `akun` tidak boleh membuat jurnal. Beberapa jenis
// (kartu_tangkap, angsuran, tabungan, bayar) belum punya rute di ledger lab ini; daftarnya tetap lengkap supaya isinya
// bisa dibandingkan dengan jenis yang sah di database (tes dan run.py).
var IzinNaskah = Izin{
	"pembayaran": {"topup_bank", "kartu_tahan", "kartu_tangkap"},
	"cicilan":    {"angsuran", "tabungan"},
	"merchant":   {"bayar"},
	"notifikasi": {},
	"akun":       {},
}

// Boleh: apakah identitas itu punya izin untuk jenis jurnal itu. Identitas yang tidak ada di tabel tidak punya izin apa pun.
func (i Izin) Boleh(nama, jenis string) bool {
	for _, j := range i[nama] {
		if j == jenis {
			return true
		}
	}
	return false
}

var (
	ErrTanpaSertifikat = errors.New("tanpa sertifikat klien yang lolos verifikasi")
	ErrTanpaSAN        = errors.New("sertifikat tanpa tepat satu SAN DNS identitas")
)

var polaNama = regexp.MustCompile(`^[a-z][a-z0-9-]*$`)

// Nama membaca identitas pemanggil dari sertifikat daun rantai yang sudah diverifikasi server. PeerCertificates tidak
// dipakai: isinya belum tentu lolos verifikasi (mis. ClientAuth RequestClientCert). Identitas adalah satu-satunya SAN DNS
// berakhiran `.<domain>`; CN diabaikan.
func Nama(r *http.Request, domain string) (string, error) {
	if r.TLS == nil || len(r.TLS.VerifiedChains) == 0 || len(r.TLS.VerifiedChains[0]) == 0 {
		return "", ErrTanpaSertifikat
	}
	daun := r.TLS.VerifiedChains[0][0]
	var hasil []string
	for _, d := range daun.DNSNames {
		if n, ok := strings.CutSuffix(d, "."+domain); ok && polaNama.MatchString(n) {
			hasil = append(hasil, n)
		}
	}
	if len(hasil) != 1 {
		return "", ErrTanpaSAN
	}
	return hasil[0], nil
}

// Wajib membungkus handler satu rute yang membuat jurnal berjenis `jenis`. Tanpa identitas: 401. Identitas tanpa izin: 403.
// catat (boleh nil) dipanggil dengan satu baris per keputusan.
func Wajib(izin Izin, domain, jenis string, next http.Handler, catat func(string)) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nama, err := Nama(r, domain)
		if err != nil {
			if catat != nil {
				catat("identitas: ditolak (" + err.Error() + ")")
			}
			jawab(w, http.StatusUnauthorized, map[string]any{"alasan": "tanpa-identitas"})
			return
		}
		if !izin.Boleh(nama, jenis) {
			if catat != nil {
				catat(fmt.Sprintf("identitas: %s tidak boleh membuat jurnal %s", nama, jenis))
			}
			jawab(w, http.StatusForbidden, map[string]any{"alasan": "jenis-tidak-diizinkan", "identitas": nama, "jenis": jenis})
			return
		}
		if catat != nil {
			catat(fmt.Sprintf("identitas: %s boleh membuat jurnal %s", nama, jenis))
		}
		next.ServeHTTP(w, r)
	})
}

func jawab(w http.ResponseWriter, status int, isi map[string]any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(isi)
}

func kolam(caPEM []byte) (*x509.CertPool, error) {
	p := x509.NewCertPool()
	if !p.AppendCertsFromPEM(caPEM) {
		return nil, errors.New("identitas: PEM CA tidak berisi sertifikat")
	}
	return p, nil
}

// ServerTLS: server menuntut sertifikat klien dari CA ini (RequireAndVerifyClientCert) dan hanya menerima TLS 1.3.
// Sertifikat server dibaca ulang dari berkas tiap handshake, jadi penggantian berkas berlaku tanpa restart proses.
func ServerTLS(caPEM []byte, sertifikat, kunci string) (*tls.Config, error) {
	p, err := kolam(caPEM)
	if err != nil {
		return nil, err
	}
	// --8<-- [start:server-tls]
	return &tls.Config{
		MinVersion: tls.VersionTLS13,
		ClientAuth: tls.RequireAndVerifyClientCert,
		ClientCAs:  p,
		GetCertificate: func(*tls.ClientHelloInfo) (*tls.Certificate, error) {
			c, err := tls.LoadX509KeyPair(sertifikat, kunci)
			return &c, err
		},
	}, nil
	// --8<-- [end:server-tls]
}

// KlienTLS: client memverifikasi server terhadap CA ini dan nama `namaServer`, dan memberi sertifikatnya sendiri bila
// diminta. sertifikat kosong = client tanpa sertifikat (dipakai untuk membuktikan penolakan).
func KlienTLS(caPEM []byte, sertifikat, kunci, namaServer string) (*tls.Config, error) {
	p, err := kolam(caPEM)
	if err != nil {
		return nil, err
	}
	cfg := &tls.Config{MinVersion: tls.VersionTLS13, RootCAs: p, ServerName: namaServer}
	if sertifikat != "" {
		cfg.GetClientCertificate = func(*tls.CertificateRequestInfo) (*tls.Certificate, error) {
			c, err := tls.LoadX509KeyPair(sertifikat, kunci)
			return &c, err
		}
	}
	return cfg, nil
}

// Sonde membuka koneksi TLS, menyelesaikan handshake, lalu menunggu paling lama `tunggu` untuk melihat apakah server
// mengirim alert. Di TLS 1.3 client menganggap handshake selesai sebelum server menilai sertifikat klien, jadi
// penolakan baru terbaca pada pembacaan pertama. Client tidak mengirim apa pun sebelum membaca: data yang belum dibaca
// server bisa membuat penutupan koneksi menjadi RST yang menghapus alert. Hasil: "alert dari server: tls: ..." bila
// server menolak, "diterima" bila tidak ada alert sampai batas waktu, atau galat lain apa adanya.
func Sonde(alamat string, cfg *tls.Config, tunggu time.Duration) string {
	k, err := tls.Dial("tcp", alamat, cfg)
	if err != nil {
		return KelasGalat(err)
	}
	defer k.Close()
	k.SetReadDeadline(time.Now().Add(tunggu))
	var b [1]byte
	_, err = k.Read(b[:])
	var ne net.Error
	if errors.As(err, &ne) && ne.Timeout() {
		return "diterima"
	}
	return KelasGalat(err)
}

// KelasGalat membedakan galat TLS dari koneksi yang mati. Alert dari peer di koneksi TCP adalah *net.OpError dengan
// Op "remote error" (crypto/tls conn.go; tipe AlertError hanya untuk QUIC dan alert yang dikirim sendiri).
func KelasGalat(err error) string {
	var oe *net.OpError
	var cv *tls.CertificateVerificationError
	switch {
	case err == nil:
		return "tanpa galat"
	case errors.As(err, &cv):
		return "client menolak sertifikat server: " + cv.Unwrap().Error()
	case errors.As(err, &oe) && oe.Op == "remote error":
		return "alert dari server: " + oe.Err.Error()
	default:
		return "bukan galat TLS: " + err.Error()
	}
}
