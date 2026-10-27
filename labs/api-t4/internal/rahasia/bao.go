// Package rahasia membaca secret dari secret manager saat runtime, dan memindai berkas untuk kunci produksi yang
// tersasar (lab t4-infra, M34 dan M30, ADR 35 dan ADR 39). Secret manager lab adalah OpenBao mode dev dengan mesin KV
// versi 2; hanya stdlib yang dipakai (tidak ada pustaka klien).
//
// Dokumen secret berbentuk {"sekarang": "...", "lama": "..."}. `sekarang` adalah rahasia yang dipakai penanda tangan
// mulai sekarang; `lama` (opsional) adalah yang sebelumnya dan masih diterima selama rotasi (masa tumpang tindih,
// ADR 35). Rotasi = operator menulis dokumen baru dengan `lama` = rahasia sebelumnya; mengakhiri rotasi = menulis
// dokumen tanpa `lama`. Service membacanya berkala, jadi tidak ada deploy di antaranya.
//
// Bila pembacaan gagal (secret manager mati, token dicabut, path hilang), Pembaca MEMAKAI pembacaan terakhir yang
// berhasil dan menghitung kegagalannya. Ini pilihan lab: service tidak ikut mati bersama secret manager, dengan
// akibat service tidak tahu bahwa secret sudah dicabut atau diganti selama pembacaan gagal. Menghitung kegagalan
// beruntun (Status.GagalBeruntun) adalah bahan alert.
package rahasia

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"lab/apit4/internal/klien"
)

// Pembaca memegang daftar rahasia terakhir yang berhasil dibaca.
type Pembaca struct {
	alamat, token, path string
	http                *http.Client

	mu       sync.RWMutex
	daftar   []string
	versi    int
	dibaca   int64
	gagal    int64
	beruntun int64
}

// Baru: alamat dasar secret manager ("http://127.0.0.1:8200"), token, dan path KV v2 lengkap
// ("secret/data/pembayaran/webhook"). batas adalah batas waktu satu pembacaan.
func Baru(alamat, token, path string, batas time.Duration) *Pembaca {
	return &Pembaca{alamat: strings.TrimRight(alamat, "/"), token: token, path: strings.Trim(path, "/"), http: klien.Baru(batas)}
}

// Muat membaca versi terbaru dokumen sekali. Pada galat, daftar lama tidak berubah.
func (p *Pembaca) Muat(ctx context.Context) error {
	daftar, versi, err := p.baca(ctx)
	p.mu.Lock()
	defer p.mu.Unlock()
	if err != nil {
		p.gagal++
		p.beruntun++
		return err
	}
	p.daftar, p.versi = daftar, versi
	p.dibaca++
	p.beruntun = 0
	return nil
}

func (p *Pembaca) baca(ctx context.Context) ([]string, int, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, p.alamat+"/v1/"+p.path, nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("X-Vault-Token", p.token)
	resp, err := p.http.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("secret manager tidak terjangkau: %w", err)
	}
	defer resp.Body.Close()
	isi, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, 0, fmt.Errorf("jawaban secret manager terpotong: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, 0, fmt.Errorf("secret manager menjawab %d", resp.StatusCode) // isi jawaban tidak disalin ke galat
	}
	return urai(isi)
}

// urai membaca jawaban KV v2: {"data": {"data": {"sekarang": ..., "lama": ...}, "metadata": {"version": n}}}.
func urai(isi []byte) ([]string, int, error) {
	var j struct {
		Data struct {
			Data struct {
				Sekarang string `json:"sekarang"`
				Lama     string `json:"lama"`
			} `json:"data"`
			Metadata struct {
				Version int `json:"version"`
			} `json:"metadata"`
		} `json:"data"`
	}
	if err := json.Unmarshal(isi, &j); err != nil {
		return nil, 0, errors.New("jawaban secret manager tidak terbaca")
	}
	d := j.Data.Data
	if d.Sekarang == "" {
		return nil, 0, errors.New("dokumen secret tanpa bidang sekarang")
	}
	daftar := []string{d.Sekarang}
	if d.Lama != "" && d.Lama != d.Sekarang {
		daftar = append(daftar, d.Lama)
	}
	return daftar, j.Data.Metadata.Version, nil
}

// Daftar: salinan rahasia yang berlaku sekarang; yang pertama dipakai penanda tangan, yang lain masa tumpang tindih.
func (p *Pembaca) Daftar() []string {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return append([]string(nil), p.daftar...)
}

// Jalan membaca ulang tiap `segar` sampai ctx selesai. Satu baris log setiap kali keadaan gagal/berhasil berubah.
func (p *Pembaca) Jalan(ctx context.Context, segar time.Duration) {
	t := time.NewTicker(segar)
	defer t.Stop()
	gagalSebelumnya := false
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			err := p.Muat(ctx)
			if (err != nil) != gagalSebelumnya {
				if err != nil {
					log.Printf("rahasia: pembacaan gagal, memakai pembacaan terakhir: %v", err)
				} else {
					log.Print("rahasia: pembacaan berhasil lagi")
				}
				gagalSebelumnya = err != nil
			}
		}
	}
}

// Status untuk endpoint lab dan alert. Sidik adalah delapan karakter pertama SHA-256 tiap rahasia: cukup untuk
// membedakan versi, tidak membuka nilainya.
type Status struct {
	Jumlah        int      `json:"jumlah"`
	Versi         int      `json:"versi"`
	Sidik         []string `json:"sidik"`
	Dibaca        int64    `json:"dibaca"`
	Gagal         int64    `json:"gagal"`
	GagalBeruntun int64    `json:"gagal_beruntun"`
}

func (p *Pembaca) Status() Status {
	p.mu.RLock()
	defer p.mu.RUnlock()
	s := Status{Jumlah: len(p.daftar), Versi: p.versi, Sidik: []string{}, Dibaca: p.dibaca, Gagal: p.gagal, GagalBeruntun: p.beruntun}
	for _, r := range p.daftar {
		s.Sidik = append(s.Sidik, Sidik(r))
	}
	return s
}

// SidikPenuh: SHA-256 heksadesimal penuh. Dipakai pemindai untuk mencocokkan nilai tanpa menyimpan nilainya.
func SidikPenuh(rahasia string) string {
	h := sha256.Sum256([]byte(rahasia))
	return hex.EncodeToString(h[:])
}

// Sidik: delapan karakter pertama SidikPenuh.
func Sidik(rahasia string) string { return SidikPenuh(rahasia)[:8] }
