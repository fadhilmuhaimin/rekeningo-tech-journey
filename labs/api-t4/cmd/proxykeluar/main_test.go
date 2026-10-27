package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

// Proxy keluar bertetap (lab t4-infra, M34, ADR 39): hanya tujuan terdaftar, tidak menambah klaim alamat, tidak
// meneruskan header per koneksi, tidak menerima CONNECT.

func tujuanUji(t *testing.T) (*httptest.Server, *http.Header) {
	t.Helper()
	var dilihat http.Header
	s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		dilihat = r.Header.Clone()
		io.WriteString(w, "dari-tujuan:"+r.URL.Path)
	}))
	t.Cleanup(s.Close)
	return s, &dilihat
}

func lewatProxy(t *testing.T, tujuan ...string) *http.Client {
	t.Helper()
	h, err := baru(tujuan)
	if err != nil {
		t.Fatal(err)
	}
	p := httptest.NewServer(h)
	t.Cleanup(p.Close)
	u, _ := url.Parse(p.URL)
	return &http.Client{Transport: &http.Transport{Proxy: http.ProxyURL(u)}}
}

func TestProxyTanpaDaftarTujuanDitolakSaatDibuat(t *testing.T) {
	for _, d := range [][]string{nil, {""}, {" ", ""}} {
		if _, err := baru(d); err == nil {
			t.Errorf("baru(%q) harus galat: proxy tanpa daftar meneruskan ke mana saja", d)
		}
	}
}

func TestProxyMeneruskanKeTujuanTerdaftarDanMenolakYangLain(t *testing.T) {
	ok, _ := tujuanUji(t)
	lain, _ := tujuanUji(t)
	c := lewatProxy(t, strings.TrimPrefix(ok.URL, "http://"))
	r, err := c.Get(ok.URL + "/halo")
	if err != nil {
		t.Fatal(err)
	}
	b, _ := io.ReadAll(r.Body)
	if r.StatusCode != 200 || string(b) != "dari-tujuan:/halo" {
		t.Fatalf("tujuan terdaftar: %d %s", r.StatusCode, b)
	}
	r, err = c.Get(lain.URL + "/halo")
	if err != nil {
		t.Fatal(err)
	}
	b, _ = io.ReadAll(r.Body)
	if r.StatusCode != http.StatusForbidden || strings.Contains(string(b), "dari-tujuan") {
		t.Fatalf("tujuan tak terdaftar harus 403 tanpa menyentuh tujuan: %d %s", r.StatusCode, b)
	}
}

func TestProxyTidakMenambahAtauMeneruskanKlaimAlamatDanHeaderKoneksi(t *testing.T) {
	ok, dilihat := tujuanUji(t)
	c := lewatProxy(t, strings.TrimPrefix(ok.URL, "http://"))
	req, _ := http.NewRequest("GET", ok.URL+"/x", nil)
	req.Header.Set("X-Forwarded-For", "172.18.0.3")
	req.Header.Set("Proxy-Authorization", "Basic abc")
	req.Header.Set("X-Lain", "tetap")
	r, err := c.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	r.Body.Close()
	h := *dilihat
	if h.Get("X-Forwarded-For") != "" || h.Get("Forwarded") != "" || h.Get("Via") != "" {
		t.Fatalf("proxy tidak boleh menulis atau meneruskan klaim alamat: %v", h)
	}
	if h.Get("Proxy-Authorization") != "" || h.Get("Proxy-Connection") != "" {
		t.Fatalf("header per koneksi diteruskan: %v", h)
	}
	if h.Get("X-Lain") != "tetap" {
		t.Fatalf("header biasa harus diteruskan: %v", h)
	}
}

func TestProxyMeneruskanMetodeDanBodyDanKodeStatus(t *testing.T) {
	var metode, isi string
	s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		metode, isi = r.Method, string(b)
		w.WriteHeader(http.StatusForbidden)
		io.WriteString(w, "ditolak-vendor")
	}))
	defer s.Close()
	c := lewatProxy(t, strings.TrimPrefix(s.URL, "http://"))
	r, err := c.Post(s.URL+"/verifikasi", "application/json", strings.NewReader(`{"a":1}`))
	if err != nil {
		t.Fatal(err)
	}
	b, _ := io.ReadAll(r.Body)
	if metode != "POST" || isi != `{"a":1}` || r.StatusCode != 403 || string(b) != "ditolak-vendor" {
		t.Fatalf("metode %s, isi %s, jawaban %d %s", metode, isi, r.StatusCode, b)
	}
}

func TestProxyConnectDanHttpsDitolakDanTujuanMatiJadi502(t *testing.T) {
	h, _ := baru([]string{"127.0.0.1:9"})
	for _, c := range []struct {
		metode, target string
		ingin          int
	}{{"CONNECT", "127.0.0.1:9", 501}, {"GET", "https://127.0.0.1:9/x", 400}, {"GET", "http://127.0.0.1:9/x", 502}} {
		r := httptest.NewRequest(c.metode, c.target, nil)
		if c.metode == "CONNECT" {
			r.URL = &url.URL{Host: c.target}
		}
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		if w.Code != c.ingin {
			t.Errorf("%s %s: %d, ingin %d", c.metode, c.target, w.Code, c.ingin)
		}
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "/healthz", nil))
	if w.Code != 200 || w.Body.String() != "ok" {
		t.Fatalf("healthz: %d %s", w.Code, w.Body)
	}
	w = httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "/lain", nil))
	if w.Code != 404 {
		t.Fatalf("permintaan langsung selain healthz: %d", w.Code)
	}
}

func TestProxyTujuanTanpaPortDianggapPort80(t *testing.T) {
	h, _ := baru([]string{"vendor:80"})
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "http://Vendor/x", nil))
	if w.Code == http.StatusForbidden {
		t.Fatalf("vendor tanpa port = vendor:80 harus lolos daftar (dan gagal 502 di jaringan uji): %d", w.Code)
	}
	w = httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "http://vendor:8284/x", nil))
	if w.Code != http.StatusForbidden {
		t.Fatalf("port lain harus 403: %d", w.Code)
	}
}
