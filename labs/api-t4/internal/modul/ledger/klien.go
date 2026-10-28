// Package ledger adalah kontrak publik modul ledger bagi modul lain (ADR 37): tipe permintaan dan jawaban, dan
// client HTTP yang dipakai service pembayaran. Modul lain tidak membaca tabel ledger dan tidak mengimpor
// internal/repo atau internal/service; satu-satunya jalan uang bergerak adalah panggilan ini, dengan
// Idempotency-Key = order_id (ADR 34).
package ledger

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"lab/apit4/internal/klien"
)

// Permintaan: satu top-up bank yang sudah dibayar di gateway. Jumlah dan akun datang dari baris topup_bank
// service pembayaran, bukan dari isi kabar gateway.
type Permintaan struct {
	OrderID string `json:"order_id"`
	AkunID  int64  `json:"akun_id"`
	Jumlah  int64  `json:"jumlah"`
}

// Hasil: jurnal yang dihasilkan. Ulang=true bila key sudah punya jurnal (ledger tidak menulis jurnal baru).
type Hasil struct {
	Jurnal int64 `json:"jurnal"`
	Ulang  bool  `json:"ulang"`
}

var (
	// ErrTidakPasti: timeout, koneksi putus, atau 5xx. Ledger mungkin sudah menjurnal; pemanggil tidak menandai
	// apa pun dan mengulang dengan key yang sama.
	ErrTidakPasti = errors.New("ledger tidak menjawab: hasil tidak diketahui")
	// ErrDitolak: ledger menolak dengan alasan (akun dibekukan, batas tingkat, key dipakai permintaan lain).
	ErrDitolak = errors.New("ledger menolak permintaan")
	// ErrTidakSah: kunci layanan salah atau permintaan salah bentuk (galat pemrograman, bukan keadaan data).
	ErrTidakSah = errors.New("ledger menolak: kunci layanan atau bentuk permintaan")
	// ErrSibuk: ledger menjawab 503 dengan alasan "sibuk": lock buku tidak didapat dalam lock_timeout, jadi tidak ada
	// hold dan key tidak tertahan (hanya hold kartu; ADR 42). Pemanggil menolak otorisasi tanpa menunggu lebih lama.
	ErrSibuk = errors.New("ledger sibuk: lock buku tidak didapat dalam lock_timeout")
)

// PermintaanTahan: satu hold otorisasi kartu (ADR 42). Akun dan jumlah datang dari baris kartu dan permintaan
// penerbit di service pembayaran. Idempotency-Key = IDPenerbit.
type PermintaanTahan struct {
	IDPenerbit string `json:"id_penerbit"`
	AkunID     int64  `json:"akun_id"`
	Jumlah     int64  `json:"jumlah"`
}

// Penolakan membawa alasan dari ledger; errors.Is(err, ErrDitolak) benar.
type Penolakan struct{ Alasan string }

func (p Penolakan) Error() string        { return "ledger menolak: " + p.Alasan }
func (p Penolakan) Is(target error) bool { return target == ErrDitolak }

// Klien memanggil API ledger lewat klien.Baru: timeout selalu diisi dan redirect tidak diikuti (ADR 22, ADR 36).
type Klien struct {
	url   string
	kunci string
	http  *http.Client
}

func Baru(alamat, kunciLayanan string, timeout time.Duration) *Klien {
	return &Klien{url: alamat, kunci: kunciLayanan, http: klien.Baru(timeout)}
}

// KreditTopup meminta jurnal top-up. kunci adalah Idempotency-Key (= p.OrderID).
func (k *Klien) KreditTopup(ctx context.Context, kunci string, p Permintaan) (Hasil, error) {
	return k.kirim(ctx, "/ledger/jurnal-topup", kunci, p)
}

// TahanKartu meminta hold otorisasi kartu. kunci adalah Idempotency-Key (= p.IDPenerbit, ADR 42).
func (k *Klien) TahanKartu(ctx context.Context, kunci string, p PermintaanTahan) (Hasil, error) {
	return k.kirim(ctx, "/ledger/kartu/tahan", kunci, p)
}

func (k *Klien) kirim(ctx context.Context, path, kunci string, isiPermintaan any) (Hasil, error) {
	b, _ := json.Marshal(isiPermintaan)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, k.url+path, bytes.NewReader(b))
	if err != nil {
		return Hasil{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", kunci)
	req.Header.Set("X-Layanan-Kunci", k.kunci)
	resp, err := k.http.Do(req)
	if err != nil {
		return Hasil{}, fmt.Errorf("%w: %v", ErrTidakPasti, err) // timeout, ditolak koneksi, atau putus: ledger mungkin sudah menulis
	}
	defer resp.Body.Close()
	isi, err := io.ReadAll(io.LimitReader(resp.Body, 1<<16))
	if err != nil {
		return Hasil{}, fmt.Errorf("%w: %v", ErrTidakPasti, err)
	}
	switch {
	case resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated:
		var h Hasil
		if json.Unmarshal(isi, &h) != nil || h.Jurnal <= 0 {
			return Hasil{}, fmt.Errorf("%w: jawaban tidak terbaca", ErrTidakPasti)
		}
		return h, nil
	case resp.StatusCode == http.StatusUnprocessableEntity || resp.StatusCode == http.StatusNotFound:
		var a struct {
			Alasan string `json:"alasan"`
		}
		json.Unmarshal(isi, &a)
		return Hasil{}, Penolakan{Alasan: a.Alasan}
	case resp.StatusCode == http.StatusServiceUnavailable:
		var a struct {
			Alasan string `json:"alasan"`
		}
		if json.Unmarshal(isi, &a) == nil && a.Alasan == "sibuk" {
			return Hasil{}, ErrSibuk
		}
		return Hasil{}, fmt.Errorf("%w: status %d", ErrTidakPasti, resp.StatusCode)
	case resp.StatusCode >= 500:
		return Hasil{}, fmt.Errorf("%w: status %d", ErrTidakPasti, resp.StatusCode)
	}
	return Hasil{}, fmt.Errorf("%w: status %d", ErrTidakSah, resp.StatusCode)
}
