package lajur

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"testing"
	"testing/synctest"
	"time"

	"github.com/sony/gobreaker/v2"
)

// Tes breaker per vendor (ADR 36) di atas sony/gobreaker v2.4.0. Waktu diperankan dengan testing/synctest: di dalam
// gelembung, time.Now dan time.Sleep memakai jam palsu yang maju sendiri bila semua goroutine menunggu, jadi 60 detik
// "lewat" tanpa ditunggu dan batasnya bisa diperiksa sampai satu milidetik. Pustaka tidak punya jam yang bisa
// disuntikkan; gelembung ini satu-satunya cara memeriksa Timeout bawaan tanpa menunggu sungguhan.

var (
	errVendorMati = errors.New("503 vendor tidak tersedia")
	errDitolak    = errors.New("422 permintaan salah")
)

func salahPermintaan(err error) bool { return errors.Is(err, errDitolak) }

func baru(o Opsi) *Breaker {
	o.Catat = func(string, ...any) {}
	return Baru("verifikasi", o)
}

func gagal(b *Breaker) error  { return b.Jalankan(func() error { return errVendorMati }) }
func sukses(b *Breaker) error { return b.Jalankan(func() error { return nil }) }
func tolak(b *Breaker) error  { return b.Jalankan(func() error { return errDitolak }) }

// --8<-- [start:tes-bawaan]
// TestRekamanBreakerBawaan: Settings hanya berisi Name; ReadyToTrip, Timeout, MaxRequests, dan IsSuccessful bawaan
// pustaka. Baris t.Logf menjadi rekaman output/breaker.txt, jadi setiap angka di dalamnya diperiksa di baris
// berikutnya, bukan hanya dicetak.
func TestRekamanBreakerBawaan(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		b := baru(Opsi{})
		for i := 1; i <= 5; i++ {
			gagal(b)
			t.Logf("gagal berturut-turut ke-%d: status %s, hitungan gagal berturut-turut %d", i, b.Status(), b.Hitungan().ConsecutiveFailures)
			if b.Status() != Tertutup {
				t.Fatalf("gagal ke-%d: status %s, harus closed (membuka hanya sesudah lebih dari 5)", i, b.Status())
			}
		}
		gagal(b)
		t.Logf("gagal berturut-turut ke-6: status %s", b.Status())
		if b.Status() != Terbuka {
			t.Fatalf("gagal ke-6: status %s, harus open", b.Status())
		}
		dipanggil := false
		err := b.Jalankan(func() error { dipanggil = true; return nil })
		t.Logf("permintaan saat open: %v; vendor dipanggil: %t", err, dipanggil)
		if !errors.Is(err, gobreaker.ErrOpenState) || dipanggil || !Dijeda(err) {
			t.Fatalf("permintaan saat open harus ditolak tanpa memanggil vendor: %v, dipanggil %t", err, dipanggil)
		}

		time.Sleep(60*time.Second - time.Millisecond)
		t.Logf("sesudah 59,999 detik: status %s", b.Status())
		if b.Status() != Terbuka {
			t.Fatalf("59,999 detik: status %s, harus open", b.Status())
		}
		time.Sleep(2 * time.Millisecond)
		t.Logf("sesudah 60,001 detik: status %s", b.Status())
		if b.Status() != SetengahTerbuka {
			t.Fatalf("60,001 detik: status %s, harus half-open", b.Status())
		}

		// Satu permintaan lewat di half-open; yang kedua, selagi yang pertama berjalan, ditolak.
		mulai, selesai := make(chan struct{}), make(chan struct{})
		hasil := make(chan error, 1)
		go func() {
			hasil <- b.Jalankan(func() error { close(mulai); <-selesai; return nil })
		}()
		<-mulai
		kedua := b.Jalankan(func() error { return nil })
		t.Logf("half-open, permintaan pertama berjalan, permintaan kedua: %v", kedua)
		if !errors.Is(kedua, gobreaker.ErrTooManyRequests) || !Dijeda(kedua) {
			t.Fatalf("permintaan kedua di half-open harus ditolak: %v", kedua)
		}
		close(selesai)
		if err := <-hasil; err != nil {
			t.Fatal(err)
		}
		t.Logf("permintaan pertama sukses: status %s", b.Status())
		if b.Status() != Tertutup {
			t.Fatalf("sesudah sukses di half-open: status %s, harus closed", b.Status())
		}
	})
}

// --8<-- [end:tes-bawaan]

func TestBreakerHalfOpenGagalMembukaLagiSelama60Detik(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		b := baru(Opsi{})
		for i := 0; i < 6; i++ {
			gagal(b)
		}
		time.Sleep(60*time.Second + time.Millisecond)
		if b.Status() != SetengahTerbuka {
			t.Fatalf("status %s", b.Status())
		}
		gagal(b) // permintaan percobaan gagal
		t.Logf("permintaan percobaan di half-open gagal: status %s", b.Status())
		if b.Status() != Terbuka {
			t.Fatalf("half-open lalu gagal: status %s, harus open", b.Status())
		}
		time.Sleep(59 * time.Second)
		if b.Status() != Terbuka {
			t.Fatalf("59 detik sesudah membuka lagi: %s, harus masih open (60 detik dihitung dari kegagalan itu)", b.Status())
		}
		time.Sleep(2 * time.Second)
		if b.Status() != SetengahTerbuka {
			t.Fatalf("61 detik sesudah membuka lagi: %s", b.Status())
		}
	})
}

func TestBreakerSuksesMemutusGagalBerturutTurut(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		b := baru(Opsi{})
		for i := 0; i < 5; i++ {
			gagal(b)
		}
		sukses(b)
		for i := 0; i < 5; i++ {
			gagal(b)
		}
		if b.Status() != Tertutup {
			t.Fatalf("5 gagal, 1 sukses, 5 gagal: status %s, harus closed (yang dihitung gagal BERTURUT-turut)", b.Status())
		}
		gagal(b)
		if b.Status() != Terbuka {
			t.Fatalf("gagal ke-6 berturut-turut: status %s", b.Status())
		}
	})
}

// --8<-- [start:tes-4xx]
// TestRekamanBreaker4xx: bawaan pustaka menghitung semua error non-nil gagal, termasuk jawaban 4xx atas permintaan
// yang memang salah; IsSuccessful kustom (ADR 36) menghitungnya sukses, sehingga permintaan buruk tidak membuka breaker untuk
// semua pendaftar lain. Vendor yang benar-benar sakit tetap membukanya.
func TestRekamanBreaker4xx(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		bawaan := baru(Opsi{Bawaan: true, SalahPermintaan: salahPermintaan})
		for i := 0; i < 6; i++ {
			tolak(bawaan)
		}
		t.Logf("IsSuccessful bawaan pustaka, 6 jawaban 4xx berturut-turut: status %s", bawaan.Status())
		if bawaan.Status() != Terbuka {
			t.Fatalf("bawaan pustaka, 6 jawaban 4xx: status %s, harus open", bawaan.Status())
		}

		kustom := baru(Opsi{SalahPermintaan: salahPermintaan})
		for i := 0; i < 6; i++ {
			tolak(kustom)
		}
		t.Logf("IsSuccessful kustom (4xx sukses), 6 jawaban 4xx berturut-turut: status %s, gagal berturut-turut %d",
			kustom.Status(), kustom.Hitungan().ConsecutiveFailures)
		if kustom.Status() != Tertutup || kustom.Hitungan().ConsecutiveFailures != 0 {
			t.Fatalf("kustom, 6 jawaban 4xx: status %s, gagal berturut-turut %d", kustom.Status(), kustom.Hitungan().ConsecutiveFailures)
		}

		for i := 0; i < 5; i++ {
			gagal(kustom)
		}
		tolak(kustom) // jawaban 4xx di tengah kegagalan vendor memutus hitungan seperti sukses
		gagal(kustom)
		t.Logf("kustom, 5 gagal vendor, 1 jawaban 4xx, 1 gagal vendor: status %s", kustom.Status())
		if kustom.Status() != Tertutup {
			t.Fatalf("jawaban 4xx harus memutus gagal berturut-turut: status %s", kustom.Status())
		}
		for i := 0; i < 5; i++ {
			gagal(kustom)
		}
		t.Logf("kustom, 6 kegagalan vendor berturut-turut: status %s", kustom.Status())
		if kustom.Status() != Terbuka {
			t.Fatalf("kegagalan vendor tetap membuka breaker kustom: status %s", kustom.Status())
		}
	})
}

// --8<-- [end:tes-4xx]

func TestBreakerTimeoutDapatDiatur(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		b := baru(Opsi{Timeout: 3 * time.Second})
		for i := 0; i < 6; i++ {
			gagal(b)
		}
		time.Sleep(2900 * time.Millisecond)
		if b.Status() != Terbuka {
			t.Fatalf("2,9 detik: %s", b.Status())
		}
		time.Sleep(200 * time.Millisecond)
		if b.Status() != SetengahTerbuka {
			t.Fatalf("3,1 detik: %s", b.Status())
		}
	})
}

// TestBreakerPanggilanDijedaTidakMenambahHitungan: permintaan yang ditolak breaker bukan percobaan; hitungan
// pustaka (Requests) tidak bertambah, jadi tidak mengubah apa pun pada keputusan membuka atau menutup.
func TestBreakerPanggilanDijedaTidakMenambahHitungan(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		b := baru(Opsi{})
		for i := 0; i < 6; i++ {
			gagal(b)
		}
		sebelum := b.Hitungan()
		for i := 0; i < 10; i++ {
			if err := gagal(b); !Dijeda(err) {
				t.Fatalf("saat open: %v", err)
			}
		}
		if b.Hitungan() != sebelum {
			t.Errorf("hitungan berubah oleh permintaan yang ditolak: %+v -> %+v", sebelum, b.Hitungan())
		}
	})
}

func TestDijedaHanyaUntukPenolakanBreaker(t *testing.T) {
	if Dijeda(errVendorMati) || Dijeda(nil) || Dijeda(context.DeadlineExceeded) {
		t.Error("error vendor atau timeout bukan penolakan breaker")
	}
	if !Dijeda(gobreaker.ErrOpenState) || !Dijeda(gobreaker.ErrTooManyRequests) {
		t.Error("penolakan open dan half-open harus dikenali")
	}
}

// TestBreakerLogPerubahanStatus: setiap perpindahan status dicatat satu baris; worker memakainya sebagai jejak
// kapan lajur dijeda dan dibuka lagi.
func TestBreakerLogPerubahanStatus(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		var baris []string
		b := Baru("verifikasi", Opsi{Catat: func(f string, a ...any) { baris = append(baris, fmt.Sprintf(f, a...)) }})
		for i := 0; i < 6; i++ {
			gagal(b)
		}
		time.Sleep(61 * time.Second)
		b.Status()
		sukses(b)
		want := []string{"breaker verifikasi: closed -> open", "breaker verifikasi: open -> half-open", "breaker verifikasi: half-open -> closed"}
		if len(baris) != 3 {
			t.Fatalf("baris log: %q", baris)
		}
		for i := range want {
			if baris[i] != want[i] {
				t.Errorf("baris %d = %q, harus %q", i, baris[i], want[i])
			}
		}
	})
}

// TestBreakerTanpaCatatMemakaiLog: tanpa Catat, perpindahan status dicatat lewat paket log standar (worker memakai ini).
func TestBreakerTanpaCatatMemakaiLog(t *testing.T) {
	log.SetOutput(io.Discard)
	defer log.SetOutput(os.Stderr)
	b := Baru("x", Opsi{})
	for i := 0; i < 6; i++ {
		gagal(b)
	}
	if b.Status() != Terbuka {
		t.Fatal(b.Status())
	}
}

// TestGobreakerV240IsExcluded: bukan kode lab ini. Pustaka v2.4.0 punya IsExcluded: error yang dikecualikan
// tidak dihitung sukses maupun gagal. Lab ini tidak memakainya; tes ini memastikan perilaku yang dikira
// ("hasil netral") memang ada di versi yang dipasang, bukan di versi lain.
func TestGobreakerV240IsExcluded(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		cb := gobreaker.NewCircuitBreaker[struct{}](gobreaker.Settings{Name: "x",
			IsExcluded: func(err error) bool { return errors.Is(err, context.Canceled) }})
		call := func(err error) { cb.Execute(func() (struct{}, error) { return struct{}{}, err }) }
		for i := 0; i < 5; i++ {
			call(errVendorMati)
		}
		call(context.Canceled)
		t.Logf("v2.4.0: 5 gagal, 1 error dikecualikan: gagal berturut-turut %d, dikecualikan %d, status %s",
			cb.Counts().ConsecutiveFailures, cb.Counts().TotalExclusions, cb.State())
		if c := cb.Counts(); c.ConsecutiveFailures != 5 || c.TotalExclusions != 1 || cb.State() != gobreaker.StateClosed {
			t.Fatalf("hitungan %+v", c)
		}
		call(errVendorMati)
		if cb.State() != gobreaker.StateOpen {
			t.Fatalf("gagal ke-6 sesudah error dikecualikan: %s", cb.State())
		}
	})
}
