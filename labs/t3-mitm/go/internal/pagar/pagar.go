// Package pagar menolak alamat di luar mesin ini. Lab t3-mitm menjalankan proxy yang membaca dan mengubah request,
// jadi program Go-nya hanya boleh mendengar di loopback dan hanya boleh meneruskan ke loopback (keputusan 979).
package pagar

import (
	"fmt"
	"net"
	"net/url"
	"strings"
)

// Loopback mengembalikan error bila host pada alamat bukan loopback. Alamat boleh "host:port" atau "host";
// hanya 127.0.0.0/8, ::1, dan nama "localhost" yang lolos. Host kosong (":18192") dan 0.0.0.0 berarti semua
// antarmuka, jadi ditolak.
func Loopback(alamat string) error {
	host := alamat
	if h, _, err := net.SplitHostPort(alamat); err == nil {
		host = h
	}
	host = strings.Trim(host, "[]")
	if strings.EqualFold(host, "localhost") {
		return nil
	}
	ip := net.ParseIP(host)
	if ip == nil || !ip.IsLoopback() {
		return fmt.Errorf("alamat %q bukan loopback: lab ini hanya untuk proses lokal di mesin ini", alamat)
	}
	return nil
}

// LoopbackURL memeriksa host pada URL (skema://host:port).
func LoopbackURL(raw string) error {
	u, err := url.Parse(raw)
	if err != nil {
		return err
	}
	return Loopback(u.Host)
}
