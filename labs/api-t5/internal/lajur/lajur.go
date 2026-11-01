// Package lajur adalah breaker per vendor untuk lajur queue (ADR 36, lab t4-integrasi), di atas sony/gobreaker v2.4.0.
//
// Breaker membuka sesudah lebih dari 5 gagal berturut-turut (ReadyToTrip bawaan), tetap terbuka 60 detik (Timeout
// bawaan), lalu half-open: satu permintaan lewat (MaxRequests bawaan 1). Hasilnya menentukan nasib lajur: sukses
// menutup, gagal membuka lagi untuk 60 detik berikutnya. Worker membaca Status() sebelum mengklaim baris: lajur yang
// terbuka tidak diklaim sama sekali, jadi percobaan pekerjaan yang menunggu tidak bertambah (ADR 25 dan ADR 36).
//
// Hanya satu hal yang diatur lab ini dan berbeda dari bawaan pustaka: IsSuccessful. Bawaan pustaka menganggap setiap
// error non-nil gagal, termasuk jawaban 4xx vendor atas permintaan yang memang salah. Dengan Bawaan=false (benar,
// ADR 36) jawaban 4xx dihitung sukses bagi breaker; Bawaan=true memasang perilaku bawaan pustaka supaya lab bisa
// merekam akibatnya.
package lajur

import (
	"errors"
	"log"
	"time"

	"github.com/sony/gobreaker/v2"
)

// Status adalah keadaan breaker; nilainya dari pustaka.
type Status = gobreaker.State

const (
	Tertutup        = gobreaker.StateClosed
	SetengahTerbuka = gobreaker.StateHalfOpen
	Terbuka         = gobreaker.StateOpen
)

// Opsi: Timeout 0 memakai bawaan pustaka (60 detik). SalahPermintaan menandai error yang berasal dari permintaan
// yang salah (4xx), bukan dari vendor yang sakit; nil berarti tidak ada yang dianggap begitu.
type Opsi struct {
	Timeout         time.Duration
	Bawaan          bool // true: IsSuccessful bawaan pustaka (semua error non-nil gagal)
	SalahPermintaan func(error) bool
	Catat           func(format string, a ...any) // nil = log.Printf
}

// Breaker membungkus satu CircuitBreaker untuk satu vendor.
type Breaker struct {
	cb *gobreaker.CircuitBreaker[struct{}]
}

// --8<-- [start:baru]
// Baru membuat breaker untuk satu vendor. ReadyToTrip dan MaxRequests sengaja tidak diisi: yang dipakai bawaan
// pustaka (lebih dari 5 gagal berturut-turut; satu permintaan di half-open).
func Baru(nama string, o Opsi) *Breaker {
	catat := o.Catat
	if catat == nil {
		catat = log.Printf
	}
	st := gobreaker.Settings{
		Name:    nama,
		Timeout: o.Timeout,
		OnStateChange: func(nama string, dari, ke gobreaker.State) {
			catat("breaker %s: %s -> %s", nama, dari, ke)
		},
	}
	if !o.Bawaan && o.SalahPermintaan != nil {
		salah := o.SalahPermintaan
		st.IsSuccessful = func(err error) bool { return err == nil || salah(err) }
	}
	return &Breaker{cb: gobreaker.NewCircuitBreaker[struct{}](st)}
}

// --8<-- [end:baru]

// Status: keadaan sekarang. Dari Terbuka ke SetengahTerbuka berpindah secara malas, saat dibaca sesudah Timeout.
func (b *Breaker) Status() Status { return b.cb.State() }

// Jalankan menjalankan satu panggilan ke vendor bila breaker mengizinkan. Dijeda(err) benar bila panggilan tidak
// dijalankan sama sekali.
func (b *Breaker) Jalankan(f func() error) error {
	_, err := b.cb.Execute(func() (struct{}, error) { return struct{}{}, f() })
	return err
}

// Hitungan: salinan penghitung internal pustaka, untuk rekaman dan tes.
func (b *Breaker) Hitungan() gobreaker.Counts { return b.cb.Counts() }

// Dijeda: panggilan ditolak breaker (terbuka, atau half-open yang sudah punya satu permintaan berjalan); vendor tidak
// dihubungi, jadi tidak ada percobaan yang terjadi.
func Dijeda(err error) bool {
	return errors.Is(err, gobreaker.ErrOpenState) || errors.Is(err, gobreaker.ErrTooManyRequests)
}
