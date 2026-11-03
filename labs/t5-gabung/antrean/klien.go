package antrean

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sync/atomic"
	"time"
)

// HitunganKlien adalah hitungan sisi proses pemanggil: berapa panggilan yang membawa pesan, dan berapa byte isinya.
type HitunganKlien struct {
	Keluar     int64 `json:"keluar"`      // publikasi yang dijawab 204
	Masuk      int64 `json:"masuk"`       // ambil yang dijawab 200 dengan pesan
	ByteKeluar int64 `json:"byte_keluar"` // isi pesan yang dikirim
	ByteMasuk  int64 `json:"byte_masuk"`  // isi pesan yang diterima
}

// Klien memanggil broker. Semua panggilan antar proses lab lewat Klien, jadi hitungannya satu tempat.
type Klien struct {
	URL        string
	HTTP       *http.Client
	keluar     atomic.Int64
	masuk      atomic.Int64
	byteKeluar atomic.Int64
	byteMasuk  atomic.Int64
}

// NewKlien membuat klien dengan koneksi keep-alive (satu koneksi per pekerja, dipakai ulang).
func NewKlien(alamat string) *Klien {
	return &Klien{URL: alamat, HTTP: &http.Client{Transport: &http.Transport{
		MaxIdleConns: 64, MaxIdleConnsPerHost: 64, IdleConnTimeout: 30 * time.Second,
	}}}
}

// Publikasi mengirim satu pesan ke topik. Dihitung hanya bila broker menjawab 204.
func (k *Klien) Publikasi(ctx context.Context, topik string, isi []byte) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, k.URL+"/publikasi/"+url.PathEscape(topik), bytes.NewReader(isi))
	if err != nil {
		return err
	}
	resp, err := k.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, resp.Body)
	if resp.StatusCode != http.StatusNoContent {
		return fmt.Errorf("antrean: publikasi %s dijawab %d", topik, resp.StatusCode)
	}
	k.keluar.Add(1)
	k.byteKeluar.Add(int64(len(isi)))
	return nil
}

// Ambil mengambil satu pesan dari topik. Mengembalikan (nil, nil) bila tidak ada pesan sampai batas tunggu.
func (k *Klien) Ambil(ctx context.Context, topik string, tunggu time.Duration) ([]byte, error) {
	u := fmt.Sprintf("%s/ambil/%s?tunggu_ms=%d", k.URL, url.PathEscape(topik), tunggu.Milliseconds())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	resp, err := k.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	isi, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	switch resp.StatusCode {
	case http.StatusOK:
		k.masuk.Add(1)
		k.byteMasuk.Add(int64(len(isi)))
		return isi, nil
	case http.StatusNoContent:
		return nil, nil
	default:
		return nil, fmt.Errorf("antrean: ambil %s dijawab %d", topik, resp.StatusCode)
	}
}

// Hitungan mengembalikan hitungan sekarang.
func (k *Klien) Hitungan() HitunganKlien {
	return HitunganKlien{Keluar: k.keluar.Load(), Masuk: k.masuk.Load(), ByteKeluar: k.byteKeluar.Load(), ByteMasuk: k.byteMasuk.Load()}
}
