package main

import (
	"fmt"
	"io"
	"log"
	"testing"
	"time"

	"lab/apit4/internal/lajur"
	"lab/apit4/internal/repo"
	"lab/apit4/internal/verifikasi"
)

// Pemasangan flag -breaker, -breaker-timeout, dan -breaker-bawaan (ADR 36): mati secara bawaan, supaya worker tanpa
// flag itu berperilaku ADR 25 apa adanya dan rekaman api-t4 tidak berubah; hanya lajur verifikasi yang punya breaker;
// jawaban 4xx vendor dihitung sukses kecuali -breaker-bawaan memasang bawaan pustaka.
func TestBreakerLajurMatiBawaanDanHanyaUntukLajurVerifikasi(t *testing.T) {
	// Perpindahan status breaker dicatat lewat log bawaan; senyap di sini supaya tidak masuk rekaman testing.
	asal := log.Writer()
	log.SetOutput(io.Discard)
	defer log.SetOutput(asal)
	if m := breakerLajur(false, time.Second, true); m != nil {
		t.Fatalf("tanpa -breaker peta harus kosong, dapat %v", m)
	}
	m := breakerLajur(true, time.Second, false)
	if len(m) != 1 || m[repo.TujuanVerifikasi] == nil || m[repo.TujuanPush] != nil {
		t.Fatalf("breaker hanya untuk lajur %s: %v", repo.TujuanVerifikasi, m)
	}
	tolak := func(b *lajur.Breaker) {
		b.Jalankan(func() error { return fmt.Errorf("%w: status 422", verifikasi.ErrDitolakVendor) })
	}
	kustom := m[repo.TujuanVerifikasi]
	for i := 0; i < 6; i++ {
		tolak(kustom)
	}
	if kustom.Status() != lajur.Tertutup {
		t.Errorf("enam jawaban 4xx berturut-turut: status %s, harus closed (4xx dihitung sukses)", kustom.Status())
	}
	bawaan := breakerLajur(true, time.Minute, true)[repo.TujuanVerifikasi]
	for i := 0; i < 6; i++ {
		tolak(bawaan)
	}
	if bawaan.Status() != lajur.Terbuka {
		t.Errorf("-breaker-bawaan, enam jawaban 4xx berturut-turut: status %s, harus open (bawaan pustaka menghitungnya gagal)", bawaan.Status())
	}
	// -breaker-timeout: breaker yang terbuka kembali setengah terbuka sesudah timeout yang diberikan, bukan 60 detik bawaan.
	pendek := breakerLajur(true, 100*time.Millisecond, true)[repo.TujuanVerifikasi]
	for i := 0; i < 6; i++ {
		tolak(pendek)
	}
	time.Sleep(250 * time.Millisecond)
	if pendek.Status() != lajur.SetengahTerbuka {
		t.Errorf("sesudah 250 ms dengan -breaker-timeout 100ms: status %s, harus half-open", pendek.Status())
	}
}
