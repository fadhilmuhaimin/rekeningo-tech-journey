// Package klien adalah satu-satunya pembuat client HTTP untuk panggilan keluar (ADR 22, ADR 36): timeout selalu
// diisi, dan redirect tidak diikuti. Gateway, layanan verifikasi, penerbit kartu, dan layanan push tiruan memakainya.
package klien

import (
	"context"
	"errors"
	"net"
	"net/http"
	"time"
)

// BatasBawaan: batas waktu satu panggilan keluar (ADR 22). Tiga detik cukup bagi layanan yang sehat di lab.
const BatasBawaan = 3 * time.Second

// Baru membuat client dengan timeout dan tanpa redirect. timeout 0 berarti tanpa batas (hanya untuk rekaman
// perbandingan "tanpa timeout"; kode produksi tidak memanggilnya dengan 0).
func Baru(timeout time.Duration) *http.Client {
	return BaruDenganTransport(timeout, nil)
}

// BaruDenganTransport: client yang sama dengan transport sendiri (nil = bawaan). Fetcher gambar membutuhkannya untuk
// memeriksa alamat tujuan saat dial (ADR 41); timeout dan aturan redirect tetap dari satu tempat ini.
func BaruDenganTransport(timeout time.Duration, tr http.RoundTripper) *http.Client {
	return &http.Client{Timeout: timeout, Transport: tr,
		// --8<-- [start:tanpa-redirect]
		CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
		// --8<-- [end:tanpa-redirect]
	}
}

// Terlambat: error karena batas waktu, atau karena koneksi terputus sesudah permintaan terkirim. Hasil di sisi
// pihak ketiga tidak diketahui (bisa sudah dikerjakan), jadi pemanggil menandainya tidak pasti, bukan gagal.
func Terlambat(err error) bool {
	var ne net.Error
	return errors.Is(err, context.DeadlineExceeded) || (errors.As(err, &ne) && ne.Timeout())
}

// TidakTerhubung: koneksi tidak pernah terbentuk (ditolak). Permintaan belum sampai, jadi pasti belum dikerjakan.
func TidakTerhubung(err error) bool {
	var oe *net.OpError
	return errors.As(err, &oe) && oe.Op == "dial"
}
