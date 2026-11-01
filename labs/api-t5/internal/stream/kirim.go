// Package stream adalah sisi event streaming lab t5-fanout (ADR 51): relay dari outbox ke Kafka, consumer group yang
// mengirim pengumuman, dan pengirim ke penyedia push dengan backoff dan jitter. Penyedia push di lab adalah tiruan lokal
// (cmd/pushkuota); Kafka satu broker KRaft di container.
package stream

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"lab/apit5/internal/klien"
	"lab/apit5/internal/worker"
)

// Hasil satu pengiriman yang selesai.
type Hasil int

const (
	Terkirim       Hasil = iota // penyedia menjawab 2xx
	TidakTerdaftar              // penyedia menjawab 404 atau 400: token itu tidak dipakai lagi
)

// ErrMenyerah: batas percobaan habis, setiap percobaan dijawab 429, 5xx, atau gagal jaringan.
var ErrMenyerah = errors.New("batas percobaan pengiriman habis")

// Laju membatasi berapa pesan per detik yang boleh dikirim bersama oleh satu proses. Tiap pemanggil memesan slot waktu
// berikutnya; slot yang sudah lewat tidak dikejar (tidak ada semburan sesudah jeda).
type Laju struct {
	mu        sync.Mutex
	selang    time.Duration
	berikut   time.Time
	kini      func() time.Time
	tidurSlot func(context.Context, time.Time)
}

// BaruLaju: perDetik 0 berarti tanpa batas.
func BaruLaju(perDetik float64) *Laju {
	l := &Laju{kini: time.Now}
	if perDetik > 0 {
		l.selang = time.Duration(float64(time.Second) / perDetik)
	}
	l.tidurSlot = func(ctx context.Context, t time.Time) { tidurSampai(ctx, t) }
	return l
}

// --8<-- [start:laju]
// Tunggu menahan pemanggil sampai slotnya tiba. Slot berjarak `selang`, jadi tiga pengirim serentak berbagi satu laju.
func (l *Laju) Tunggu(ctx context.Context) {
	if l == nil || l.selang == 0 {
		return
	}
	l.mu.Lock()
	sekarang := l.kini()
	if l.berikut.Before(sekarang) {
		l.berikut = sekarang
	}
	slot := l.berikut
	l.berikut = l.berikut.Add(l.selang)
	l.mu.Unlock()
	l.tidurSlot(ctx, slot)
}

// --8<-- [end:laju]

func tidurSampai(ctx context.Context, t time.Time) {
	d := time.Until(t)
	if d <= 0 {
		return
	}
	tidur(ctx, d)
}

func tidur(ctx context.Context, d time.Duration) {
	if d <= 0 {
		return
	}
	tm := time.NewTimer(d)
	defer tm.Stop()
	select {
	case <-ctx.Done():
	case <-tm.C:
	}
}

// Pengirim mengirim satu pesan ke penyedia push dan mengulang sampai diterima. Jawaban 429 dan gangguan sementara
// dijawab backoff eksponensial dengan jitter penuh (worker.Backoff, sama dengan worker push ADR 25); jawaban 404 dan 400
// menghentikan percobaan. Banyak goroutine boleh memakai satu Pengirim.
type Pengirim struct {
	URL           string
	HTTP          *http.Client
	Dasar, Maks   time.Duration
	MaksPercobaan int
	Acak          func() float64
	Tidur         func(context.Context, time.Duration)
	TanpaBackoff  bool  // lab saja: ulang segera sesudah gagal, tanpa menunggu (mode rentan, bandingan)
	Laju          *Laju // nil = tanpa batas laju

	percobaan, diterima, ditolak429, gagalLain, takTerdaftar atomic.Int64
	serentak, serentakMaks                                   atomic.Int64
	durasiNs, durasiN                                        atomic.Int64
	mu                                                       sync.Mutex
	tungguMaks                                               map[int]time.Duration // percobaan ke-k -> tunggu terpanjang
}

// BaruPengirim: client dari klien.BaruDenganTransport (timeout 3 detik, tanpa redirect; ADR 22) dengan transport yang cukup
// menampung `serentak` koneksi bersamaan.
func BaruPengirim(url string, serentak int, dasar, maks time.Duration) *Pengirim {
	tr := &http.Transport{MaxIdleConns: serentak * 2, MaxIdleConnsPerHost: serentak * 2, IdleConnTimeout: 30 * time.Second,
		DialContext: (&net.Dialer{Timeout: 3 * time.Second}).DialContext}
	return &Pengirim{URL: url, HTTP: klien.BaruDenganTransport(klien.BatasBawaan, tr),
		Dasar: dasar, Maks: maks, MaksPercobaan: 200, Acak: randFloat, Tidur: tidur, tungguMaks: map[int]time.Duration{}}
}

// --8<-- [start:kirim-ulang]
// Kirim mengulang sampai diterima. Notifikasi_id sama di semua percobaan, jadi penerima yang menyaringnya tidak
// menampilkan ulangan dua kali. Menunggu sesudah percobaan ke-k memakai worker.Backoff(k): acak antara 0 dan
// min(Maks, Dasar × 2^(k-1)).
func (p *Pengirim) Kirim(ctx context.Context, token, notifikasiID, judul, isi string) (Hasil, error) {
	body, _ := json.Marshal(map[string]string{"token": token, "notifikasi_id": notifikasiID, "judul": judul, "isi": isi})
	for k := 1; k <= p.MaksPercobaan; k++ {
		if ctx.Err() != nil {
			return 0, ctx.Err()
		}
		p.Laju.Tunggu(ctx)
		status, err := p.satuKali(ctx, body)
		switch {
		case err == nil && status/100 == 2:
			p.diterima.Add(1)
			return Terkirim, nil
		case err == nil && (status == http.StatusNotFound || status == http.StatusBadRequest):
			p.takTerdaftar.Add(1)
			return TidakTerdaftar, nil
		case err == nil && status == http.StatusTooManyRequests:
			p.ditolak429.Add(1)
		default:
			p.gagalLain.Add(1)
		}
		var tunggu time.Duration
		if !p.TanpaBackoff {
			tunggu = worker.Backoff(k, p.Dasar, p.Maks, p.Acak())
		}
		p.catatTunggu(k, tunggu)
		p.Tidur(ctx, tunggu)
	}
	return 0, ErrMenyerah
}

// --8<-- [end:kirim-ulang]

func (p *Pengirim) satuKali(ctx context.Context, body []byte) (int, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.URL+"/v1/pesan", bytes.NewReader(body))
	if err != nil {
		return 0, err
	}
	req.Header.Set("Content-Type", "application/json")
	p.percobaan.Add(1)
	n := p.serentak.Add(1)
	for {
		m := p.serentakMaks.Load()
		if n <= m || p.serentakMaks.CompareAndSwap(m, n) {
			break
		}
	}
	mulai := time.Now()
	resp, err := p.HTTP.Do(req)
	p.serentak.Add(-1)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, io.LimitReader(resp.Body, 1<<16))
	if resp.StatusCode/100 == 2 {
		p.durasiNs.Add(int64(time.Since(mulai)))
		p.durasiN.Add(1)
	}
	return resp.StatusCode, nil
}

func (p *Pengirim) catatTunggu(k int, d time.Duration) {
	p.mu.Lock()
	if d > p.tungguMaks[k] {
		p.tungguMaks[k] = d
	}
	p.mu.Unlock()
}

// Statistik adalah ringkasan satu Pengirim. TungguMaksMs[k-1] = tunggu terpanjang sesudah percobaan ke-k.
type Statistik struct {
	Percobaan      int64     `json:"percobaan"`
	Diterima       int64     `json:"diterima"`
	Ditolak429     int64     `json:"ditolak_429"`
	GagalLain      int64     `json:"gagal_lain"`
	TidakTerdaftar int64     `json:"tidak_terdaftar"`
	SerentakMaks   int64     `json:"serentak_maks"`
	TRataMs        float64   `json:"t_rata_ms"`
	TungguMaksMs   []float64 `json:"tunggu_maks_ms"`
}

func (p *Pengirim) Statistik() Statistik {
	s := Statistik{Percobaan: p.percobaan.Load(), Diterima: p.diterima.Load(), Ditolak429: p.ditolak429.Load(),
		GagalLain: p.gagalLain.Load(), TidakTerdaftar: p.takTerdaftar.Load(), SerentakMaks: p.serentakMaks.Load()}
	if n := p.durasiN.Load(); n > 0 {
		s.TRataMs = float64(p.durasiNs.Load()) / float64(n) / 1e6
	}
	p.mu.Lock()
	defer p.mu.Unlock()
	for k := 1; ; k++ {
		d, ok := p.tungguMaks[k]
		if !ok {
			break
		}
		s.TungguMaksMs = append(s.TungguMaksMs, float64(d)/float64(time.Millisecond))
	}
	return s
}

func (s Statistik) String() string {
	b, _ := json.Marshal(s)
	return fmt.Sprintf("%s", b)
}
