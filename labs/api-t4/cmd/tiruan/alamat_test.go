package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// Daftar alamat sumber layanan verifikasi tiruan (lab t4-infra, M34). Yang diperiksa: alamat peer TCP, bukan header;
// daftar kosong menerima semua; hanya POST /verifikasi yang diperiksa.

func ip(t *testing.T, teks string) []string {
	t.Helper()
	p, err := parseIzin(teks)
	if err != nil {
		t.Fatal(err)
	}
	var s []string
	for _, x := range p {
		s = append(s, x.String())
	}
	return s
}

func TestParseIzin(t *testing.T) {
	if got := strings.Join(ip(t, "172.18.0.3, 10.0.0.0/8 ,,::ffff:192.168.1.5"), " "); got != "172.18.0.3/32 10.0.0.0/8 192.168.1.5/32" {
		t.Fatalf("parseIzin: %q", got)
	}
	if got := strings.Join(ip(t, "10.1.2.3/8"), " "); got != "10.0.0.0/8" {
		t.Fatalf("CIDR harus dimasker ke jaringannya: %q", got)
	}
	for _, buruk := range []string{"172.18.0", "abc", "10.0.0.1/33", "10.0.0.1 10.0.0.2"} {
		if _, err := parseIzin(buruk); err == nil {
			t.Errorf("%q harus ditolak", buruk)
		}
	}
	if p, err := parseIzin(""); err != nil || len(p) != 0 {
		t.Fatalf("daftar kosong: %v %v", p, err)
	}
}

func TestPeriksaDaftarKosongMenerimaSemuaDanDaftarIsiMenolakSisanya(t *testing.T) {
	d := daftarBaru()
	if !d.Periksa("203.0.113.9") {
		t.Fatal("daftar kosong harus menerima semua alamat")
	}
	izin, _ := parseIzin("172.18.0.3,10.5.0.0/16")
	d.Atur(izin)
	for alamat, ingin := range map[string]bool{"172.18.0.3": true, "172.18.0.4": false, "10.5.200.1": true, "10.6.0.1": false, "::ffff:172.18.0.3": true, "tidak-ip": false} {
		if got := d.Periksa(alamat); got != ingin {
			t.Errorf("Periksa(%s) = %t, ingin %t", alamat, got, ingin)
		}
	}
	r := d.Ringkas()
	if r.Diterima["172.18.0.3"] != 1 || r.Ditolak["172.18.0.4"] != 1 || r.Ditolak["tidak-ip"] != 1 {
		t.Fatalf("hitungan: %+v", r)
	}
	d.Ulang()
	if r := d.Ringkas(); len(r.Diterima) != 0 || len(r.Ditolak) != 0 || len(r.Izin) != 2 {
		t.Fatalf("Ulang menghapus hitungan saja: %+v", r)
	}
}

func TestSumberHanyaAlamatPeerBukanHeader(t *testing.T) {
	r := httptest.NewRequest("POST", "/verifikasi", nil)
	r.RemoteAddr = "172.18.0.9:51234"
	r.Header.Set("X-Forwarded-For", "172.18.0.3")
	r.Header.Set("X-Real-IP", "172.18.0.3")
	r.Header.Set("Forwarded", "for=172.18.0.3")
	if got := sumber(r); got != "172.18.0.9" {
		t.Fatalf("sumber = %q; header tidak boleh dipercaya", got)
	}
	r.RemoteAddr = "[::ffff:172.18.0.9]:80"
	if got := sumber(r); got != "172.18.0.9" {
		t.Fatalf("IPv4-mapped harus dilepas: %q", got)
	}
	r.RemoteAddr = "[2001:db8::1]:80"
	if got := sumber(r); got != "2001:db8::1" {
		t.Fatalf("IPv6: %q", got)
	}
}

func vendorUji(t *testing.T, izin string) (*verifikasi, http.Handler) {
	t.Helper()
	v := &verifikasi{objek: map[string]string{}, alamat: daftarBaru()}
	p, err := parseIzin(izin)
	if err != nil {
		t.Fatal(err)
	}
	v.alamat.Atur(p)
	return v, v.rute()
}

func kirimDari(h http.Handler, dari, xff string) *httptest.ResponseRecorder {
	r := httptest.NewRequest("POST", "/verifikasi", strings.NewReader(`{"referensi":"1"}`))
	r.RemoteAddr = dari + ":4000"
	r.Header.Set("Idempotency-Key", "k1")
	if xff != "" {
		r.Header.Set("X-Forwarded-For", xff)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}

func TestVerifikasiMenolak403PadaAlamatTakTerdaftarTanpaMembuatObjek(t *testing.T) {
	v, h := vendorUji(t, "172.18.0.3")
	if w := kirimDari(h, "172.18.0.3", ""); w.Code != 200 {
		t.Fatalf("alamat terdaftar: %d %s", w.Code, w.Body)
	}
	w := kirimDari(h, "172.18.0.4", "172.18.0.3") // header yang diisi client tidak menolong
	if w.Code != http.StatusForbidden || !strings.Contains(w.Body.String(), "alamat sumber tidak terdaftar") {
		t.Fatalf("alamat baru: %d %s", w.Code, w.Body)
	}
	v.mu.Lock()
	objek, permintaan := len(v.objek), v.permintaan
	v.mu.Unlock()
	if objek != 1 || permintaan != 1 {
		t.Fatalf("permintaan yang ditolak tidak boleh diproses: objek %d, permintaan %d (ingin 1 dan 1)", objek, permintaan)
	}
	if r := v.alamat.Ringkas(); r.Diterima["172.18.0.3"] != 1 || r.Ditolak["172.18.0.4"] != 1 {
		t.Fatalf("hitungan: %+v", r)
	}
}

func TestVerifikasiTanpaDaftarMenerimaSemuaDanRuteLabTetapTerbuka(t *testing.T) {
	_, h := vendorUji(t, "")
	if w := kirimDari(h, "203.0.113.9", ""); w.Code != 200 {
		t.Fatalf("tanpa daftar: %d", w.Code)
	}
	_, h = vendorUji(t, "172.18.0.3")
	for _, rute := range []string{"GET /lab/alamat", "GET /lab/diterima", "GET /lab/statistik"} {
		p := strings.Fields(rute)
		r := httptest.NewRequest(p[0], p[1], nil)
		r.RemoteAddr = "203.0.113.9:1"
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		if w.Code != 200 {
			t.Errorf("%s dari alamat tak terdaftar: %d; rute lab tidak boleh diperiksa", rute, w.Code)
		}
	}
}

func TestIzinkanMenggantiDaftarLewatRuteLabDanUlangTidakMenghapusIzin(t *testing.T) {
	_, h := vendorUji(t, "")
	post := func(path, body string) int {
		r := httptest.NewRequest("POST", path, strings.NewReader(body))
		r.RemoteAddr = "203.0.113.9:1"
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		return w.Code
	}
	if c := post("/lab/izinkan", `{"alamat":["172.18.0.3"]}`); c != 204 {
		t.Fatalf("izinkan: %d", c)
	}
	if w := kirimDari(h, "172.18.0.4", ""); w.Code != 403 {
		t.Fatalf("sesudah izinkan, alamat lain harus 403: %d", w.Code)
	}
	if c := post("/lab/izinkan", `{"alamat":["bukan-ip"]}`); c != 400 {
		t.Fatalf("alamat salah harus 400: %d", c)
	}
	if w := kirimDari(h, "172.18.0.4", ""); w.Code != 403 {
		t.Fatalf("izinkan yang gagal tidak boleh mengosongkan daftar: %d", w.Code)
	}
	if c := post("/lab/reset", ""); c != 204 {
		t.Fatalf("reset: %d", c)
	}
	if w := kirimDari(h, "172.18.0.4", ""); w.Code != 403 {
		t.Fatalf("reset hanya menghapus hitungan; daftar izin tetap: %d", w.Code)
	}
	r := httptest.NewRequest("GET", "/lab/alamat", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	var j ringkasanAlamat
	b, _ := io.ReadAll(w.Body)
	if json.Unmarshal(b, &j) != nil || len(j.Izin) != 1 || j.Izin[0] != "172.18.0.3/32" || j.Ditolak["172.18.0.4"] != 1 {
		t.Fatalf("GET /lab/alamat: %s", b)
	}
}

func TestParseIzinIPv6TunggalHanyaSatuAlamatDanRingkasanDiurutkan(t *testing.T) {
	if got := strings.Join(ip(t, "2001:db8::1"), " "); got != "2001:db8::1/128" {
		t.Fatalf("IPv6 tunggal harus /128: %q", got)
	}
	d := daftarBaru()
	izin, _ := parseIzin("2001:db8::1,172.18.0.3,10.5.0.0/16")
	d.Atur(izin)
	if !d.Periksa("2001:db8::1") || d.Periksa("2001:db8::2") {
		t.Fatal("hanya alamat IPv6 yang terdaftar yang diterima")
	}
	if got := strings.Join(d.Ringkas().Izin, " "); got != "10.5.0.0/16 172.18.0.3/32 2001:db8::1/128" {
		t.Fatalf("ringkasan izin harus diurutkan: %q", got)
	}
	r := d.Ringkas()
	r.Diterima["bukan-milik-daftar"] = 99
	r.Ditolak["bukan-milik-daftar"] = 99
	if r := d.Ringkas(); r.Diterima["bukan-milik-daftar"] != 0 || r.Ditolak["bukan-milik-daftar"] != 0 {
		t.Fatal("Ringkas harus mengembalikan salinan hitungan")
	}
}

func TestIzinkanKeduaKaliMenggantiDaftarPertamaBukanMenambah(t *testing.T) {
	_, h := vendorUji(t, "")
	post := func(body string) int {
		r := httptest.NewRequest("POST", "/lab/izinkan", strings.NewReader(body))
		r.RemoteAddr = "203.0.113.9:1"
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		return w.Code
	}
	if c := post(`{"alamat":["172.18.0.3"]}`); c != 204 {
		t.Fatalf("izinkan pertama: %d", c)
	}
	if c := post(`{"alamat":["172.18.0.4"]}`); c != 204 {
		t.Fatalf("izinkan kedua: %d", c)
	}
	if w := kirimDari(h, "172.18.0.3", ""); w.Code != http.StatusForbidden {
		t.Fatalf("alamat dari daftar pertama harus ditolak sesudah daftar diganti: %d", w.Code)
	}
	if w := kirimDari(h, "172.18.0.4", ""); w.Code != 200 {
		t.Fatalf("alamat dari daftar kedua: %d", w.Code)
	}
}
