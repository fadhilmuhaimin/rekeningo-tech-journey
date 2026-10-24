package main

// Tes key bucket per IP IPv6 /64 (keputusan 660).
// Pembantu (siapkanTes, serverTes, kirimLogin, ...) ada di pengaman_test.go.

import (
	"fmt"
	"net/http"
	"testing"
)

// Key bucket per IP: alamat IPv6 dalam satu prefix /64 berbagi key, IPv4 (juga yang ditulis sebagai IPv6) tidak
// berubah (keputusan 660).
func TestKunciAlamatIPv6PerPrefix(t *testing.T) {
	for alamat, ingin := range map[string]string{
		"192.0.2.7":                        "192.0.2.7",
		"::ffff:192.0.2.7":                 "192.0.2.7",
		"2001:db8:1:2::a":                  "2001:db8:1:2::/64",
		"2001:db8:1:2:ffff:ffff:ffff:ffff": "2001:db8:1:2::/64",
		"2001:db8:1:2:0:0:0:0":             "2001:db8:1:2::/64",
		"2001:DB8:1:2::A":                  "2001:db8:1:2::/64",
		"2001:db8:1:3::a":                  "2001:db8:1:3::/64",
		"fe80::1%en0":                      "fe80::/64",
		"bukan-alamat":                     "bukan-alamat",
		"":                                 "",
	} {
		if k := kunciAlamat(alamat); k != ingin {
			t.Errorf("kunciAlamat(%q) = %q, ingin %q", alamat, k, ingin)
		}
	}
}

// Lapis per IP lewat handler: 12 alamat berbeda dalam satu /64 memakai satu bucket (10 lolos, 2 ditolak 429),
// /64 lain punya bucket sendiri, dan IPv4 yang ditulis sebagai IPv6 berbagi bucket dengan IPv4-nya. Email tidak
// terdaftar berbeda per request, jadi lapis per akun tidak ikut campur.
func TestLapisIPMemakaiPrefixIPv6(t *testing.T) {
	db := siapkanTes(t)
	s := serverTes(db, "dua-lapis", "proxy")
	hitung := func(kode []int) map[int]int {
		m := map[int]int{}
		for _, k := range kode {
			m[k]++
		}
		return m
	}
	var kode []int
	for i := range 12 {
		ip := fmt.Sprintf("2001:db8:a:b:%x:%x:%x:%x", i+1, 0x10+i, 0x200+i, 0xf000+i) // 12 alamat, satu /64
		kode = append(kode, kirimLogin(s, fmt.Sprintf("tidak-ada-%d@lestari.example", i), "tebakan", ip).Code)
	}
	if got := hitung(kode); got[http.StatusUnauthorized] != 10 || got[http.StatusTooManyRequests] != 2 {
		t.Fatalf("12 alamat dalam satu /64: %v; ingin 10 x 401 dan 2 x 429", got)
	}
	if w := kirimLogin(s, "tidak-ada-x@lestari.example", "tebakan", "2001:db8:a:c::1"); w.Code != http.StatusUnauthorized {
		t.Fatalf("/64 lain: %d; ingin 401 (bucket sendiri)", w.Code)
	}
	kode = nil
	for i := range 12 { // IPv4 dan bentuk IPv6-nya bergantian: satu bucket
		ip := "203.0.113.9"
		if i%2 == 1 {
			ip = "::ffff:203.0.113.9"
		}
		kode = append(kode, kirimLogin(s, fmt.Sprintf("tidak-ada-v4-%d@lestari.example", i), "tebakan", ip).Code)
	}
	if got := hitung(kode); got[http.StatusUnauthorized] != 10 || got[http.StatusTooManyRequests] != 2 {
		t.Fatalf("IPv4 dan IPv4-mapped bergantian: %v; ingin 10 x 401 dan 2 x 429", got)
	}
}
