// Package penerbit adalah client ke penerbit kartu tiruan (kartu virtual, Tahap 4; tiruan lokal: cmd/penerbit).
// Rekeningo hanya memanggil penerbit untuk menerbitkan kartu; otorisasi, clearing, dan reversal datang dari arah
// sebaliknya: penerbit yang memanggil Rekeningo (ADR 22, ADR 42), jadi tidak ada panggilan keluar di dalam transaction.
package penerbit

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
	// ErrTidakPasti: timeout atau jawaban terpotong. Penerbit mungkin sudah menerbitkan kartu yang tidak kita ketahui.
	ErrTidakPasti = errors.New("penerbit tidak menjawab: hasil tidak diketahui")
	// ErrDitolak: koneksi tidak terbentuk, atau penerbit menjawab bukan 2xx.
	ErrDitolak = errors.New("penerbit menolak atau tidak terjangkau")
)

type Klien struct {
	url  string
	http *http.Client
}

func Baru(alamat string, timeout time.Duration) *Klien {
	return &Klien{url: alamat, http: klien.Baru(timeout)}
}

// Terbitkan meminta satu kartu baru. Idempotency-Key = kunci: kunci yang sama menghasilkan token yang sama, jadi
// pengulangan karena timeout tidak menerbitkan dua kartu.
func (k *Klien) Terbitkan(ctx context.Context, kunci string) (token, empatDigit string, err error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, k.url+"/kartu", bytes.NewReader([]byte(`{}`)))
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", kunci)
	resp, err := k.http.Do(req)
	if err != nil {
		if klien.TidakTerhubung(err) {
			return "", "", fmt.Errorf("%w: %v", ErrDitolak, err)
		}
		return "", "", fmt.Errorf("%w: %v", ErrTidakPasti, err)
	}
	defer resp.Body.Close()
	isi, err := io.ReadAll(io.LimitReader(resp.Body, 1<<16))
	if err != nil {
		return "", "", fmt.Errorf("%w: %v", ErrTidakPasti, err)
	}
	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("%w: status %d", ErrDitolak, resp.StatusCode)
	}
	var h struct {
		Token      string `json:"token"`
		EmpatDigit string `json:"empat_digit"`
	}
	if err := json.Unmarshal(isi, &h); err != nil || h.Token == "" || len(h.EmpatDigit) != 4 {
		return "", "", fmt.Errorf("%w: jawaban tidak terbaca", ErrTidakPasti)
	}
	return h.Token, h.EmpatDigit, nil
}
