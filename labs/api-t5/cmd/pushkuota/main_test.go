package main

import (
	"testing"
	"time"
)

// Kuota naskah: 600.000 per menit = 10.000 per detik. Jendela satu detik, waktu disuntik.
func TestJendelaKuotaSepuluhRibuPerDetik(t *testing.T) {
	j := Jendela{Kuota: 10000, Panjang: time.Second}
	t0 := time.Unix(1000, 0)
	for i := 1; i <= 10000; i++ {
		if !j.Coba(t0.Add(time.Duration(i) * time.Microsecond)) {
			t.Fatalf("pesan ke-%d ditolak padahal kuota 10.000", i)
		}
	}
	if j.Coba(t0.Add(20 * time.Millisecond)) {
		t.Fatal("pesan ke-10.001 dalam jendela yang sama diterima")
	}
	if j.Coba(t0.Add(999 * time.Millisecond)) {
		t.Fatal("pesan masih dalam jendela (999 ms) diterima")
	}
	if !j.Coba(t0.Add(1001 * time.Millisecond)) {
		t.Fatal("jendela baru tidak membuka kuota lagi")
	}
}

func TestJendelaTanpaBatas(t *testing.T) {
	j := Jendela{Kuota: 0, Panjang: time.Second}
	for i := 0; i < 50000; i++ {
		if !j.Coba(time.Unix(1, 0)) {
			t.Fatal("kuota 0 harus tanpa batas")
		}
	}
}

// Jawaban 429 tidak menghabiskan kuota: penolakan tidak dihitung, jadi jendela yang penuh tetap berisi kuota pesan.
func TestJendelaPenolakanTidakMenghabiskanKuota(t *testing.T) {
	j := Jendela{Kuota: 3, Panjang: time.Second}
	t0 := time.Unix(5, 0)
	for i := 0; i < 3; i++ {
		j.Coba(t0)
	}
	for i := 0; i < 100; i++ {
		if j.Coba(t0.Add(time.Millisecond)) {
			t.Fatal("pesan di atas kuota diterima")
		}
	}
	if j.hitung != 3 {
		t.Fatalf("hitungan %d sesudah penolakan, harus tetap 3", j.hitung)
	}
}
