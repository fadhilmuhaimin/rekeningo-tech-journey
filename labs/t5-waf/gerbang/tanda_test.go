package main

import (
	"fmt"
	"testing"
	"time"
)

var sekarangTes = time.Unix(1_800_000_000, 0)

// Vektor tetap, dihitung di luar kode ini (python3 hmac.new(b"rahasia-tes", b"1800000000.POST./pos/v1/merchant/1/qr?a=1." + body, sha256)).
// Mengunci bentuk string yang ditandatangani: pemisah, urutan, dan isi.
const (
	vektorBody     = `{"nominal":25000}`
	vektorTandaSah = "b072595887c5310ff60f989eafb4d6ff6d4215dd701d2bf03f29df288cbe9f65"
)

func TestTandaTanganVektor(t *testing.T) {
	got := TandaTangan("rahasia-tes", 1_800_000_000, "POST", "/pos/v1/merchant/1/qr?a=1", []byte(vektorBody))
	if got != vektorTandaSah {
		t.Fatalf("tanda tangan %s, harus %s", got, vektorTandaSah)
	}
}

func TestPeriksaTanda(t *testing.T) {
	ts := sekarangTes.Unix()
	tanda := TandaTangan("rahasia-tes", ts, "POST", "/pos/v1/x?a=1", []byte("isi"))
	toleransi := 5 * time.Minute
	cek := func(rahasia string, waktu string, tanda, method, uri string, body string) error {
		return PeriksaTanda(rahasia, sekarangTes, toleransi, waktu, tanda, method, uri, []byte(body))
	}
	w := fmt.Sprint(ts)
	if err := cek("rahasia-tes", w, tanda, "POST", "/pos/v1/x?a=1", "isi"); err != nil {
		t.Fatalf("tanda tangan sah ditolak: %v", err)
	}
	salah := map[string]error{
		"rahasia lain": cek("rahasia-lain", w, tanda, "POST", "/pos/v1/x?a=1", "isi"),
		"body diubah":  cek("rahasia-tes", w, tanda, "POST", "/pos/v1/x?a=1", "isi!"),
		"method lain":  cek("rahasia-tes", w, tanda, "PUT", "/pos/v1/x?a=1", "isi"),
		"alamat lain":  cek("rahasia-tes", w, tanda, "POST", "/pos/v1/y?a=1", "isi"),
		"query lain":   cek("rahasia-tes", w, tanda, "POST", "/pos/v1/x?a=2", "isi"),
		"bukan hex":    cek("rahasia-tes", w, "zz", "POST", "/pos/v1/x?a=1", "isi"),
		"kosong":       cek("rahasia-tes", w, "", "POST", "/pos/v1/x?a=1", "isi"),
	}
	for nama, err := range salah {
		if err != ErrTanda {
			t.Errorf("%s: dapat %v, harus ErrTanda", nama, err)
		}
	}
	// Timestamp ikut ditandatangani: tanda tangan untuk ts lain tidak cocok walau ts yang dikirim masih dalam toleransi.
	if err := cek("rahasia-tes", fmt.Sprint(ts-10), tanda, "POST", "/pos/v1/x?a=1", "isi"); err != ErrTanda {
		t.Errorf("timestamp diganti tanpa tanda tangan baru: %v", err)
	}
}

func TestPeriksaTandaToleransi(t *testing.T) {
	toleransi := 5 * time.Minute
	for _, c := range []struct {
		geser time.Duration
		ok    bool
	}{{0, true}, {-299 * time.Second, true}, {-300 * time.Second, true}, {-301 * time.Second, false},
		{299 * time.Second, true}, {301 * time.Second, false}, {-24 * time.Hour, false}} {
		ts := sekarangTes.Add(c.geser).Unix()
		err := PeriksaTanda("r", sekarangTes, toleransi, fmt.Sprint(ts), TandaTangan("r", ts, "GET", "/p", nil), "GET", "/p", nil)
		if (err == nil) != c.ok || (err != nil && err != ErrWaktu) {
			t.Errorf("selisih %v: err %v, ok harus %v", c.geser, err, c.ok)
		}
	}
	for _, ts := range []string{"", "abc", "1.5", "-"} {
		if err := PeriksaTanda("r", sekarangTes, toleransi, ts, "00", "GET", "/p", nil); err != ErrWaktu {
			t.Errorf("timestamp %q: %v", ts, err)
		}
	}
}

func TestSidikKunci(t *testing.T) {
	// SHA-256 heksadesimal dari "abc" (vektor FIPS 180-4).
	if got := SidikKunci("abc"); got != "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad" {
		t.Fatalf("sidik %s", got)
	}
}
