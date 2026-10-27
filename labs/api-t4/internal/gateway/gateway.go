// Package gateway adalah client ke gateway pembayaran bank (tiruan lokal: cmd/tiruan -peran gateway). Semua
// panggilan lewat klien.Baru dengan timeout 3 detik (ADR 22, ADR 36); yang mengubah keadaan membawa
// Idempotency-Key = order_id.
package gateway

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"lab/apit4/internal/klien"
)

var (
	// ErrTidakPasti: timeout atau koneksi putus sesudah permintaan terkirim. Order mungkin sudah dibuat di gateway.
	ErrTidakPasti = errors.New("gateway tidak menjawab: hasil tidak diketahui")
	// ErrDitolak: gateway menjawab bukan 2xx, atau koneksi tidak pernah terbentuk. Order dianggap tidak dibuat.
	ErrDitolak = errors.New("gateway menolak atau tidak terjangkau")
	// ErrTidakAda: gateway menjawab 404 untuk order itu.
	ErrTidakAda = errors.New("order tidak ada di gateway")
)

type Klien struct {
	url  string
	http *http.Client
}

func Baru(alamat string, timeout time.Duration) *Klien {
	return &Klien{url: alamat, http: klien.Baru(timeout)}
}

// Order adalah keadaan satu order di gateway.
type Order struct {
	OrderID     string `json:"order_id"`
	Jumlah      int64  `json:"jumlah"`
	Status      string `json:"status"` // pending, settlement, expire, failure
	TujuanBayar string `json:"tujuan_bayar"`
}

func (k *Klien) kirim(ctx context.Context, method, path, kunci string, body any) (int, []byte, error) {
	var r io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		r = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, k.url+path, r)
	if err != nil {
		return 0, nil, err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if kunci != "" {
		req.Header.Set("Idempotency-Key", kunci)
	}
	resp, err := k.http.Do(req)
	if err != nil {
		switch {
		case klien.TidakTerhubung(err):
			return 0, nil, fmt.Errorf("%w: %v", ErrDitolak, err)
		case klien.Terlambat(err):
			return 0, nil, fmt.Errorf("%w: %v", ErrTidakPasti, err)
		}
		return 0, nil, fmt.Errorf("%w: %v", ErrTidakPasti, err) // putus di tengah jawaban: tidak diketahui
	}
	defer resp.Body.Close()
	isi, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return resp.StatusCode, nil, fmt.Errorf("%w: %v", ErrTidakPasti, err)
	}
	return resp.StatusCode, isi, nil
}

// BuatOrder membuat satu order di gateway. Idempotency-Key = orderID: mengulang panggilan yang sama tidak membuat
// order kedua di gateway.
func (k *Klien) BuatOrder(ctx context.Context, orderID string, jumlah int64, kedaluwarsa time.Time) (Order, error) {
	s, isi, err := k.kirim(ctx, http.MethodPost, "/orders", orderID, map[string]any{
		"order_id": orderID, "jumlah": jumlah, "kedaluwarsa": kedaluwarsa.UTC().Format(time.RFC3339)})
	if err != nil {
		return Order{}, err
	}
	if s != http.StatusCreated && s != http.StatusOK {
		return Order{}, fmt.Errorf("%w: status %d", ErrDitolak, s)
	}
	var o Order
	if err := json.Unmarshal(isi, &o); err != nil || o.OrderID != orderID {
		return Order{}, fmt.Errorf("%w: jawaban tidak terbaca", ErrTidakPasti)
	}
	return o, nil
}

// Status menanyakan keadaan order ke gateway.
func (k *Klien) Status(ctx context.Context, orderID string) (Order, error) {
	s, isi, err := k.kirim(ctx, http.MethodGet, "/orders/"+url.PathEscape(orderID), "", nil)
	if err != nil {
		return Order{}, err
	}
	switch {
	case s == http.StatusNotFound:
		return Order{}, ErrTidakAda
	case s != http.StatusOK:
		return Order{}, fmt.Errorf("%w: status %d", ErrDitolak, s)
	}
	var o Order
	if err := json.Unmarshal(isi, &o); err != nil {
		return Order{}, fmt.Errorf("%w: jawaban tidak terbaca", ErrTidakPasti)
	}
	return o, nil
}

// BarisSettlement adalah satu baris laporan settlement harian gateway.
type BarisSettlement struct {
	OrderID string `json:"order_id"`
	Jumlah  int64  `json:"jumlah"`
}

// Settlement mengambil laporan settlement satu tanggal (YYYY-MM-DD): order yang dibayar pada tanggal itu.
func (k *Klien) Settlement(ctx context.Context, tanggal string) ([]BarisSettlement, error) {
	s, isi, err := k.kirim(ctx, http.MethodGet, "/settlement?tanggal="+url.QueryEscape(tanggal), "", nil)
	if err != nil {
		return nil, err
	}
	if s != http.StatusOK {
		return nil, fmt.Errorf("%w: status %d", ErrDitolak, s)
	}
	var h struct {
		Baris []BarisSettlement `json:"baris"`
	}
	if err := json.Unmarshal(isi, &h); err != nil {
		return nil, fmt.Errorf("%w: laporan tidak terbaca", ErrTidakPasti)
	}
	return h.Baris, nil
}
