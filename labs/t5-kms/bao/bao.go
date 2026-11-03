// Package bao adalah klien kecil untuk mesin transit OpenBao (v2.7.2) lewat net/http, tanpa dependency.
// Hanya tiga panggilan: datakey/plaintext, decrypt, dan rewrap. Rotasi dan konfigurasi versi kunci dilakukan operator.
package bao

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Klien memanggil satu kunci transit.
type Klien struct {
	Alamat string // http://127.0.0.1:<port>
	Token  string
	Kunci  string // nama kunci transit (KEK)
	HTTP   *http.Client
}

// GalatBao adalah jawaban non-2xx dari OpenBao.
type GalatBao struct {
	Status int
	Pesan  []string
}

func (g *GalatBao) Error() string {
	return fmt.Sprintf("openbao menjawab %d: %s", g.Status, strings.Join(g.Pesan, "; "))
}

func (k *Klien) klien() *http.Client {
	if k.HTTP != nil {
		return k.HTTP
	}
	return &http.Client{Timeout: 5 * time.Second}
}

func (k *Klien) panggil(ctx context.Context, jalur string, badan any) (map[string]any, error) {
	b, _ := json.Marshal(badan)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(k.Alamat, "/")+"/v1/transit/"+jalur+"/"+url.PathEscape(k.Kunci), bytes.NewReader(b))
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-Vault-Token", k.Token)
	req.Header.Set("Content-Type", "application/json")
	res, err := k.klien().Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	isi, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	var j struct {
		Data   map[string]any `json:"data"`
		Errors []string       `json:"errors"`
	}
	_ = json.Unmarshal(isi, &j)
	if res.StatusCode < 200 || res.StatusCode > 299 {
		return nil, &GalatBao{Status: res.StatusCode, Pesan: j.Errors}
	}
	if j.Data == nil {
		return nil, fmt.Errorf("jawaban OpenBao tanpa data (status %d)", res.StatusCode)
	}
	return j.Data, nil
}

func teks(d map[string]any, kunci string) (string, error) {
	s, ok := d[kunci].(string)
	if !ok || s == "" {
		return "", fmt.Errorf("jawaban OpenBao tanpa %q", kunci)
	}
	return s, nil
}

// BuatDataKey meminta data key 256 bit baru: teks biasa untuk satu file dan bentuk terbungkus untuk disimpan.
func (k *Klien) BuatDataKey(ctx context.Context) ([]byte, string, error) {
	d, err := k.panggil(ctx, "datakey/plaintext", map[string]any{"bits": 256})
	if err != nil {
		return nil, "", err
	}
	p, err := teks(d, "plaintext")
	if err != nil {
		return nil, "", err
	}
	c, err := teks(d, "ciphertext")
	if err != nil {
		return nil, "", err
	}
	dek, err := base64.StdEncoding.DecodeString(p)
	if err != nil {
		return nil, "", err
	}
	if len(dek) != 32 {
		return nil, "", fmt.Errorf("data key %d byte, harus 32", len(dek))
	}
	return dek, c, nil
}

// Buka meminta OpenBao membuka data key terbungkus. KEK tidak pernah keluar dari OpenBao.
func (k *Klien) Buka(ctx context.Context, terbungkus string) ([]byte, error) {
	d, err := k.panggil(ctx, "decrypt", map[string]any{"ciphertext": terbungkus})
	if err != nil {
		return nil, err
	}
	p, err := teks(d, "plaintext")
	if err != nil {
		return nil, err
	}
	return base64.StdEncoding.DecodeString(p)
}

// Rewrap membungkus ulang data key terbungkus dengan versi KEK terbaru, tanpa menjawab teks biasanya.
func (k *Klien) Rewrap(ctx context.Context, terbungkus string) (string, error) {
	d, err := k.panggil(ctx, "rewrap", map[string]any{"ciphertext": terbungkus})
	if err != nil {
		return "", err
	}
	if _, ada := d["plaintext"]; ada {
		return "", fmt.Errorf("rewrap menjawab plaintext")
	}
	return teks(d, "ciphertext")
}
