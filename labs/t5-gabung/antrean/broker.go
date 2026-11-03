// Paket antrean: broker antrean tiruan lokal untuk peraga lab t5-gabung, dan klien kecilnya. Broker menyimpan pesan di
// memori (satu channel per topik), tanpa persistensi, tanpa konfirmasi penerimaan, dan tanpa urutan antar topik.
// Ia BUKAN produk antrean: yang dipinjam dari produk nyata hanya bentuk panggilannya (kirim satu pesan, ambil satu pesan).
package antrean

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// KapasitasTopik adalah jumlah pesan yang boleh menunggu per topik. Penuh dijawab 503, bukan menunggu tanpa batas.
const KapasitasTopik = 1024

// Metrik adalah hitungan sisi broker. Hanya panggilan yang membawa pesan yang dihitung per transaksi; ambil yang
// habis waktu tanpa pesan (AmbilKosong) bergantung pada waktu tunggu dan tidak dipakai untuk menghitung.
type Metrik struct {
	Publikasi   int64 `json:"publikasi"`
	AmbilBerisi int64 `json:"ambil_berisi"`
	AmbilKosong int64 `json:"ambil_kosong"`
	ByteMasuk   int64 `json:"byte_masuk"`  // isi pesan yang diterima dari pengirim
	ByteKeluar  int64 `json:"byte_keluar"` // isi pesan yang diserahkan ke penerima
	Tertinggal  int64 `json:"tertinggal"`  // pesan yang masih menunggu di semua topik
}

// Broker adalah server antrean.
type Broker struct {
	mu      sync.Mutex
	topik   map[string]chan []byte
	hopNs   atomic.Int64
	pub     atomic.Int64
	berisi  atomic.Int64
	kosong  atomic.Int64
	bMasuk  atomic.Int64
	bKeluar atomic.Int64
}

// NewBroker membuat broker kosong tanpa jeda buatan.
func NewBroker() *Broker { return &Broker{topik: map[string]chan []byte{}} }

func (b *Broker) saluran(nama string) chan []byte {
	b.mu.Lock()
	defer b.mu.Unlock()
	c, ok := b.topik[nama]
	if !ok {
		c = make(chan []byte, KapasitasTopik)
		b.topik[nama] = c
	}
	return c
}

// AturJeda mengatur jeda buatan per panggilan yang membawa pesan dan mengosongkan hitungan. Jeda memerankan waktu
// tempuh satu panggilan antar host; lab tidak mengukur jaringan antar host.
func (b *Broker) AturJeda(d time.Duration) {
	b.hopNs.Store(int64(d))
	b.pub.Store(0)
	b.berisi.Store(0)
	b.kosong.Store(0)
	b.bMasuk.Store(0)
	b.bKeluar.Store(0)
}

// Metrik mengembalikan hitungan sekarang.
func (b *Broker) Metrik() Metrik {
	var tertinggal int64
	b.mu.Lock()
	for _, c := range b.topik {
		tertinggal += int64(len(c))
	}
	b.mu.Unlock()
	return Metrik{
		Publikasi: b.pub.Load(), AmbilBerisi: b.berisi.Load(), AmbilKosong: b.kosong.Load(),
		ByteMasuk: b.bMasuk.Load(), ByteKeluar: b.bKeluar.Load(), Tertinggal: tertinggal,
	}
}

func (b *Broker) jeda() {
	if d := time.Duration(b.hopNs.Load()); d > 0 {
		time.Sleep(d) // time.Sleep tidak pernah kembali sebelum d lewat
	}
}

// Handler memasang rute: POST /publikasi/{topik}, GET /ambil/{topik}?tunggu_ms=N, GET /metrik, POST /atur?hop_ms=N.
func (b *Broker) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /publikasi/{topik}", func(w http.ResponseWriter, r *http.Request) {
		isi, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		if err != nil {
			http.Error(w, "isi tidak terbaca", http.StatusBadRequest)
			return
		}
		b.jeda() // pesan butuh satu waktu tempuh untuk sampai ke broker, baru terlihat penerima
		select {
		case b.saluran(r.PathValue("topik")) <- isi:
			b.pub.Add(1)
			b.bMasuk.Add(int64(len(isi)))
			w.WriteHeader(http.StatusNoContent)
		default:
			http.Error(w, "topik penuh", http.StatusServiceUnavailable)
		}
	})
	mux.HandleFunc("GET /ambil/{topik}", func(w http.ResponseWriter, r *http.Request) {
		tunggu := 500 * time.Millisecond
		if v, err := strconv.Atoi(r.URL.Query().Get("tunggu_ms")); err == nil && v > 0 {
			tunggu = time.Duration(v) * time.Millisecond
		}
		timer := time.NewTimer(tunggu)
		defer timer.Stop()
		select {
		case isi := <-b.saluran(r.PathValue("topik")):
			b.jeda() // pesan butuh satu waktu tempuh untuk sampai ke penerima
			b.berisi.Add(1)
			b.bKeluar.Add(int64(len(isi)))
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write(isi)
		case <-timer.C:
			b.kosong.Add(1)
			w.WriteHeader(http.StatusNoContent)
		case <-r.Context().Done():
		}
	})
	mux.HandleFunc("GET /metrik", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(b.Metrik())
	})
	mux.HandleFunc("POST /atur", func(w http.ResponseWriter, r *http.Request) {
		ms, err := strconv.Atoi(strings.TrimSpace(r.URL.Query().Get("hop_ms")))
		if err != nil || ms < 0 || ms > 1000 {
			http.Error(w, "hop_ms harus 0 sampai 1000", http.StatusBadRequest)
			return
		}
		b.AturJeda(time.Duration(ms) * time.Millisecond)
		w.WriteHeader(http.StatusNoContent)
	})
	return mux
}
