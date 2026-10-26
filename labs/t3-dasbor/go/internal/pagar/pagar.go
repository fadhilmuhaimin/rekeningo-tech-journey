// Package pagar menolak alamat di luar mesin ini. Dasbor dan "serangan" lab ini hanya boleh mendengar di
// loopback, sama dengan pola labs/t3-mitm/go/internal/pagar (keputusan 979).
package pagar

import (
	"fmt"
	"net"
	"net/url"
	"strings"
)

// Loopback mengembalikan error bila host pada alamat bukan loopback. Alamat boleh "host:port" atau "host";
// hanya 127.0.0.0/8, ::1, "localhost", dan setiap nama yang berakhiran ".localhost" yang lolos (RFC 6761 §6.3;
// browser memperlakukan keduanya sebagai alamat lokal, dan OS mesin ini me-resolve *.localhost ke 127.0.0.1
// tanpa DNS, dicek langsung dengan `python3 -c "import socket; socket.gethostbyname('x.localhost')"`).
// Host kosong (":18194") dan 0.0.0.0 berarti semua antarmuka, jadi ditolak.
func Loopback(alamat string) error {
	host := alamat
	if h, _, err := net.SplitHostPort(alamat); err == nil {
		host = h
	}
	host = strings.Trim(host, "[]")
	if host == "" {
		return fmt.Errorf("alamat %q tanpa host: lab ini hanya untuk proses lokal di mesin ini", alamat)
	}
	low := strings.ToLower(host)
	if low == "localhost" || strings.HasSuffix(low, ".localhost") {
		return nil
	}
	ip := net.ParseIP(host)
	if ip == nil || !ip.IsLoopback() {
		return fmt.Errorf("alamat %q bukan loopback: lab ini hanya untuk proses lokal di mesin ini", alamat)
	}
	return nil
}

// LoopbackURL memeriksa host pada URL (skema://host:port), sama dengan Loopback.
func LoopbackURL(raw string) error {
	u, err := url.Parse(raw)
	if err != nil {
		return err
	}
	return Loopback(u.Host)
}
