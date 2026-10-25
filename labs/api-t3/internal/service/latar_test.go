package service

// Tes M21 (keputusan 965): panic di goroutine latar. Tanpa database dan tanpa jaringan.

import (
	"errors"
	"os"
	"os/exec"
	"strings"
	"testing"
	"time"

	"lab/apit3/internal/repo"
)

// Versi benar: panic di goroutine latar ditangkap, pekerjaan berikutnya tetap jalan, proses tetap hidup.
func TestLatarMenangkapPanic(t *testing.T) {
	var s Service
	selesai := make(chan string, 2)
	s.Latar("uji", func() { panic("laporan rusak") })
	s.Latar("sesudahnya", func() { selesai <- "jalan" })
	select {
	case <-selesai:
	case <-time.After(5 * time.Second):
		t.Fatal("pekerjaan sesudah panic tidak jalan")
	}
}

// --8<-- [start:tes-latar-rentan]
// Mode rentan: panic yang sama di goroutine latar mengakhiri SELURUH proses dengan exit 2. Tes ini menjalankan
// ulang dirinya sendiri sebagai proses anak, karena panic yang tidak ditangkap tidak bisa diperiksa dari dalam
// proses yang sama.
func TestLatarRentanMematikanProses(t *testing.T) {
	if os.Getenv("LATAR_RENTAN_ANAK") == "1" {
		s := Service{rentan: RentanEksporPanic}
		s.Latar("uji", func() { panic("laporan rusak") })
		time.Sleep(10 * time.Second) // proses harus sudah mati sebelum ini selesai
		os.Exit(0)
	}
	cmd := exec.Command(os.Args[0], "-test.run=^TestLatarRentanMematikanProses$")
	cmd.Env = append(os.Environ(), "LATAR_RENTAN_ANAK=1")
	keluar, err := cmd.CombinedOutput()
	var ee *exec.ExitError
	if !errors.As(err, &ee) || ee.ExitCode() != 2 {
		t.Fatalf("proses anak harus keluar dengan kode 2, dapat %v\n%s", err, keluar)
	}
	if !strings.Contains(string(keluar), "panic: laporan rusak") {
		t.Fatalf("keluaran tidak memuat panic:\n%s", keluar)
	}
}

// --8<-- [end:tes-latar-rentan]

func TestRingkasanEksporLaporanKosong(t *testing.T) {
	if got := ringkasanEkspor(418, nil); got != "ekspor warung 418: laporan kosong" {
		t.Fatalf("laporan kosong: %q", got)
	}
	baris := []repo.BarisLaporan{{Tanggal: "2026-10-01", Transaksi: 2, Total: 30000}, {Tanggal: "2026-10-02", Transaksi: 5, Total: 80000}}
	want := "ekspor warung 418: 2 hari, tersibuk 2026-10-02 dengan 5 transaksi"
	if got := ringkasanEkspor(418, baris); got != want {
		t.Fatalf("got %q, want %q", got, want)
	}
}

// Versi pertama mengira laporan tidak pernah kosong: kasus yang sama memicu panic index out of range.
func TestRingkasanEksporRentanPanikDiLaporanKosong(t *testing.T) {
	defer func() {
		r := recover()
		if r == nil || !strings.Contains(r.(error).Error(), "index out of range [0] with length 0") {
			t.Fatalf("ingin panic index out of range, dapat %v", r)
		}
	}()
	ringkasanEksporRentan(418, nil)
}
