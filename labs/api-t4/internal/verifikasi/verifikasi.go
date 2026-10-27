// Package verifikasi adalah client ke layanan verifikasi identitas (tiruan lokal: cmd/tiruan -peran verifikasi).
// Satu fungsi pembuat client untuk semua panggilan keluar (klien.Baru, timeout 3 detik; ADR 22, ADR 36).
package verifikasi

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

var (
	// ErrTidakPasti: timeout atau jawaban terpotong. Vendor mungkin sudah memproses; hasilnya belum diketahui.
	ErrTidakPasti = errors.New("layanan verifikasi tidak menjawab: hasil tidak diketahui")
	// ErrTidakTersedia: koneksi ditolak atau vendor menjawab 5xx. Pekerjaan dicoba lagi nanti.
	ErrTidakTersedia = errors.New("layanan verifikasi tidak tersedia")
)

type Klien struct {
	url  string
	http *http.Client
}

func Baru(alamat string, timeout time.Duration) *Klien {
	return &Klien{url: alamat, http: klien.Baru(timeout)}
}

// Permintaan: yang dikirim ke vendor. Tiruan hanya melihat checksum dan ukuran, bukan isi file.
type Permintaan struct {
	Referensi       string `json:"referensi"` // id internal; juga Idempotency-Key
	ChecksumKartu   string `json:"checksum_kartu"`
	ChecksumSwafoto string `json:"checksum_swafoto"`
}

// Hasil: jawaban vendor. Status lulus atau ditolak; Referensi nomor di vendor.
type Hasil struct {
	Referensi string `json:"referensi_vendor"`
	Status    string `json:"status"`
}

// Verifikasi mengirim satu pengajuan. Key yang sama tidak membuat objek kedua di vendor.
func (k *Klien) Verifikasi(ctx context.Context, p Permintaan) (Hasil, error) {
	b, _ := json.Marshal(p)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, k.url+"/verifikasi", bytes.NewReader(b))
	if err != nil {
		return Hasil{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", p.Referensi)
	resp, err := k.http.Do(req)
	if err != nil {
		if klien.TidakTerhubung(err) {
			return Hasil{}, fmt.Errorf("%w: %v", ErrTidakTersedia, err)
		}
		return Hasil{}, fmt.Errorf("%w: %v", ErrTidakPasti, err)
	}
	defer resp.Body.Close()
	isi, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return Hasil{}, fmt.Errorf("%w: %v", ErrTidakPasti, err)
	}
	if resp.StatusCode >= 500 {
		return Hasil{}, fmt.Errorf("%w: status %d", ErrTidakTersedia, resp.StatusCode)
	}
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return Hasil{}, fmt.Errorf("vendor menolak permintaan: status %d", resp.StatusCode)
	}
	var h Hasil
	if err := json.Unmarshal(isi, &h); err != nil || (h.Status != "lulus" && h.Status != "ditolak") {
		return Hasil{}, fmt.Errorf("%w: jawaban tidak terbaca", ErrTidakPasti)
	}
	return h, nil
}
