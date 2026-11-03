package main

import (
	"net"
	"net/http"
	"sync/atomic"
	"testing"
	"time"
)

func TestPersentilNearestRank(t *testing.T) {
	data := make([]int64, 100)
	for i := range data {
		data[i] = int64(i + 1) // 1..100
	}
	if got := persentil(data, 0.95); got != 95 {
		t.Errorf("p95 dari 1..100 harus 95, dapat %d", got)
	}
	if got := persentil(data, 0.50); got != 50 {
		t.Errorf("p50 dari 1..100 harus 50, dapat %d", got)
	}
	if got := persentil(data[:20], 0.95); got != 19 {
		t.Errorf("p95 dari 1..20 harus 19 (ceil(19)), dapat %d", got)
	}
	if got := persentil(data[:3], 0.95); got != 3 {
		t.Errorf("p95 dari 1..3 harus 3, dapat %d", got)
	}
	if got := persentil(nil, 0.95); got != 0 {
		t.Errorf("data kosong harus 0, dapat %d", got)
	}
}

// kirimUlangDial hanya boleh mengulang sambungan yang gagal dibuat. Sambungan yang sudah jadi lalu putus berarti permintaan
// mungkin sudah sampai; mengulangnya menggandakan transaksi dan menyembunyikan kegagalan nyata.
func TestKirimUlangDialTidakMengulangSesudahSambunganJadi(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	var diterima atomic.Int32
	go func() {
		for {
			c, err := ln.Accept()
			if err != nil {
				return
			}
			diterima.Add(1)
			// Baca permintaan dulu: http.Transport mengulang sendiri permintaan yang belum tertulis sama sekali saat sambungan putus,
			// dan itu membuat hitungan sambungan bergantung pada waktu. Sesudah permintaan terbaca, putusnya sambungan tidak diulang.
			_ = c.SetReadDeadline(time.Now().Add(2 * time.Second))
			_, _ = c.Read(make([]byte, 4096))
			if tc, ok := c.(*net.TCPConn); ok {
				_ = tc.SetLinger(0) // tutup dengan RST: client membaca "connection reset by peer", bukan kegagalan dial
			}
			_ = c.Close()
		}
	}()
	klien := &http.Client{Timeout: 5 * time.Second}
	if _, err := kirimUlangDial(klien, "http://"+ln.Addr().String()+"/skor", []byte("{}")); err == nil {
		t.Fatal("sambungan yang diputus server harus berujung galat")
	}
	if n := diterima.Load(); n != 1 {
		t.Errorf("server menerima sambungan %d kali, harus 1: permintaan tidak boleh diulang sesudah sambungan jadi", n)
	}
}

// Sambungan yang gagal dibuat (port belum mendengar) diulang, dan permintaan sampai tepat satu kali.
func TestKirimUlangDialMengulangSambunganYangGagalDibuat(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	alamat := ln.Addr().String()
	ln.Close() // port bebas dan tidak mendengar: dial pertama gagal
	var sampai atomic.Int32
	srv := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sampai.Add(1)
		w.WriteHeader(http.StatusOK)
	})}
	go func() {
		time.Sleep(1500 * time.Millisecond) // server baru mendengar sesudah percobaan pertama gagal
		l2, err := net.Listen("tcp", alamat)
		if err != nil {
			return
		}
		_ = srv.Serve(l2)
	}()
	defer srv.Close()
	resp, err := kirimUlangDial(&http.Client{Timeout: 5 * time.Second}, "http://"+alamat+"/skor", []byte("{}"))
	if err != nil {
		t.Fatalf("dial yang gagal harus diulang sampai server mendengar: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK || sampai.Load() != 1 {
		t.Errorf("status %d, permintaan sampai %d kali; harus 200 dan 1", resp.StatusCode, sampai.Load())
	}
}

// Angka yang dilaporkan penggerak beban sebagai p50, p95, dan maks harus persentil yang namanya tertulis, dari data yang diurutkan.
func TestRingkasLatensiMelaporkanP50P95DanMaks(t *testing.T) {
	lat := make([]int64, 100)
	for i := range lat {
		lat[i] = int64((i*37)%100 + 1) // 1..100 dalam urutan acak
	}
	if p50, p95, maks := ringkasLatensi(lat); p50 != 50 || p95 != 95 || maks != 100 {
		t.Errorf("dapat p50 %d, p95 %d, maks %d; harus 50, 95, 100", p50, p95, maks)
	}
}
