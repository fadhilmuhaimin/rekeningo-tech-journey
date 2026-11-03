package antrean

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func pasang(t *testing.T) (*Broker, *Klien) {
	t.Helper()
	b := NewBroker()
	srv := httptest.NewServer(b.Handler())
	t.Cleanup(srv.Close)
	return b, NewKlien(srv.URL)
}

func TestUrutanPerTopikDanMetrik(t *testing.T) {
	b, k := pasang(t)
	ctx := context.Background()
	for _, isi := range []string{"satu", "dua", "tiga"} {
		if err := k.Publikasi(ctx, "a", []byte(isi)); err != nil {
			t.Fatal(err)
		}
	}
	if err := k.Publikasi(ctx, "b", []byte("lain")); err != nil {
		t.Fatal(err)
	}
	for _, harus := range []string{"satu", "dua", "tiga"} {
		got, err := k.Ambil(ctx, "a", time.Second)
		if err != nil || string(got) != harus {
			t.Fatalf("dapat %q %v, harus %q", got, err, harus)
		}
	}
	m := b.Metrik()
	if m.Publikasi != 4 || m.AmbilBerisi != 3 || m.Tertinggal != 1 || m.ByteMasuk != 4+3+4+4 || m.ByteKeluar != 4+3+4 {
		t.Errorf("metrik broker: %+v", m)
	}
	h := k.Hitungan()
	if h.Keluar != 4 || h.Masuk != 3 || h.ByteKeluar != 15 || h.ByteMasuk != 11 {
		t.Errorf("hitungan klien: %+v", h)
	}
}

func TestAmbilKosongBukanPanggilanBerisi(t *testing.T) {
	b, k := pasang(t)
	isi, err := k.Ambil(context.Background(), "kosong", 30*time.Millisecond)
	if err != nil || isi != nil {
		t.Fatalf("dapat %q %v, harus nil nil", isi, err)
	}
	if h := k.Hitungan(); h.Masuk != 0 {
		t.Errorf("ambil kosong tidak boleh dihitung: %+v", h)
	}
	if m := b.Metrik(); m.AmbilKosong != 1 || m.AmbilBerisi != 0 {
		t.Errorf("metrik: %+v", m)
	}
}

func TestJedaBuatanMenundaPublikasiDanAmbil(t *testing.T) {
	b, k := pasang(t)
	b.AturJeda(30 * time.Millisecond)
	ctx := context.Background()
	t0 := time.Now()
	if err := k.Publikasi(ctx, "a", []byte("x")); err != nil {
		t.Fatal(err)
	}
	if d := time.Since(t0); d < 30*time.Millisecond {
		t.Errorf("publikasi %v, harus paling cepat 30 ms", d)
	}
	t0 = time.Now()
	if _, err := k.Ambil(ctx, "a", time.Second); err != nil {
		t.Fatal(err)
	}
	if d := time.Since(t0); d < 30*time.Millisecond {
		t.Errorf("ambil %v, harus paling cepat 30 ms", d)
	}
}

func TestAturMengosongkanHitunganDanMenolakNilaiTakSah(t *testing.T) {
	b, k := pasang(t)
	_ = k.Publikasi(context.Background(), "a", []byte("x"))
	for _, q := range []string{"hop_ms=-1", "hop_ms=1001", "hop_ms=abc", ""} {
		resp, err := http.Post(k.URL+"/atur?"+q, "", nil)
		if err != nil {
			t.Fatal(err)
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusBadRequest {
			t.Errorf("%q dijawab %d, harus 400", q, resp.StatusCode)
		}
	}
	resp, _ := http.Post(k.URL+"/atur?hop_ms=0", "", nil)
	resp.Body.Close()
	if m := b.Metrik(); m.Publikasi != 0 || m.ByteMasuk != 0 {
		t.Errorf("hitungan harus kosong sesudah atur: %+v", m)
	}
}

func TestTopikPenuhDijawab503(t *testing.T) {
	_, k := pasang(t)
	ctx := context.Background()
	for i := 0; i < KapasitasTopik; i++ {
		if err := k.Publikasi(ctx, "p", []byte("x")); err != nil {
			t.Fatalf("pesan %d: %v", i, err)
		}
	}
	err := k.Publikasi(ctx, "p", []byte("x"))
	if err == nil || !strings.Contains(err.Error(), "503") {
		t.Fatalf("harus 503 saat penuh, dapat %v", err)
	}
	if h := k.Hitungan(); h.Keluar != KapasitasTopik {
		t.Errorf("publikasi yang ditolak tidak boleh dihitung: %+v", h)
	}
}
