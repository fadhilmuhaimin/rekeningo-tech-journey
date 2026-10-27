package verifikasi

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// Klasifikasi jawaban vendor (ADR 36): hanya 4xx yang berarti "permintaannya salah"; breaker menghitungnya sukses.
// 5xx, koneksi ditolak, timeout, dan jawaban aneh (3xx tanpa redirect) tetap kegagalan vendor.

func vendorKode(t *testing.T, kode int, isi string) *Klien {
	t.Helper()
	s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(kode)
		w.Write([]byte(isi))
	}))
	t.Cleanup(s.Close)
	return Baru(s.URL, time.Second)
}

func TestKlasifikasiJawabanVendor(t *testing.T) {
	kasus := []struct {
		kode          int
		isi           string
		wajibSalah    bool // SalahPermintaan
		tidakTersedia bool
		tidakPasti    bool
		ok            bool
	}{
		{kode: 200, isi: `{"referensi_vendor":"VND-1","status":"lulus"}`, ok: true},
		{kode: 201, isi: `{"referensi_vendor":"VND-1","status":"ditolak"}`, ok: true},
		{kode: 400, isi: "x", wajibSalah: true},
		{kode: 422, isi: "x", wajibSalah: true},
		{kode: 429, isi: "x", wajibSalah: true},
		{kode: 499, isi: "x", wajibSalah: true},
		{kode: 500, isi: "x", tidakTersedia: true},
		{kode: 503, isi: "x", tidakTersedia: true},
		{kode: 302, isi: "x"},                                      // redirect tidak diikuti: jawaban aneh, bukan permintaan salah
		{kode: 200, isi: `{"status":"mungkin"}`, tidakPasti: true}, // jawaban tidak terbaca
	}
	for _, k := range kasus {
		_, err := vendorKode(t, k.kode, k.isi).Verifikasi(context.Background(), Permintaan{Referensi: "1"})
		if (err == nil) != k.ok {
			t.Errorf("%d: err %v, ok harus %t", k.kode, err, k.ok)
		}
		if SalahPermintaan(err) != k.wajibSalah {
			t.Errorf("%d: SalahPermintaan %t, harus %t (%v)", k.kode, SalahPermintaan(err), k.wajibSalah, err)
		}
		if errors.Is(err, ErrTidakTersedia) != k.tidakTersedia || errors.Is(err, ErrTidakPasti) != k.tidakPasti {
			t.Errorf("%d: tidakTersedia %t, tidakPasti %t (%v)", k.kode, errors.Is(err, ErrTidakTersedia), errors.Is(err, ErrTidakPasti), err)
		}
	}
}

func TestIdempotencyKeyDariReferensiAtauKunciRentan(t *testing.T) {
	var kunci string
	s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		kunci = r.Header.Get("Idempotency-Key")
		w.Write([]byte(`{"referensi_vendor":"VND-1","status":"lulus"}`))
	}))
	defer s.Close()
	k := Baru(s.URL, time.Second)
	k.Verifikasi(context.Background(), Permintaan{Referensi: "42"})
	if kunci != "42" {
		t.Errorf("key %q, harus id pengajuan 42", kunci)
	}
	k.Verifikasi(context.Background(), Permintaan{Referensi: "42", Kunci: "acak-1"})
	if kunci != "acak-1" {
		t.Errorf("key %q, harus Kunci yang diisi (mode rentan)", kunci)
	}
}

func TestKoneksiDitolakTidakTersediaDanTimeoutTidakPasti(t *testing.T) {
	mati := httptest.NewServer(http.NotFoundHandler())
	alamat := mati.URL
	mati.Close()
	if _, err := Baru(alamat, time.Second).Verifikasi(context.Background(), Permintaan{Referensi: "1"}); !errors.Is(err, ErrTidakTersedia) || SalahPermintaan(err) {
		t.Errorf("koneksi ditolak: %v", err)
	}
	lambat := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { time.Sleep(300 * time.Millisecond) }))
	defer lambat.Close()
	if _, err := Baru(lambat.URL, 50*time.Millisecond).Verifikasi(context.Background(), Permintaan{Referensi: "1"}); !errors.Is(err, ErrTidakPasti) || SalahPermintaan(err) {
		t.Errorf("timeout: %v", err)
	}
}
