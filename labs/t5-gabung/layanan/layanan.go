// Paket layanan: dua cara menjalankan alur skor risiko yang sama.
//
// Versi satu proses (Satu): satu handler memanggil tiga pembacaan data lewat pemanggilan fungsi.
//
// Versi tiga proses (Masuk, Perangkat, Riwayat) dengan broker antrean di antaranya: tiap proses memegang satu data dan
// meneruskan pesan ke proses berikutnya lewat antrean. Satu transaksi melewati enam panggilan jaringan antar proses:
// masuk kirim, perangkat ambil, perangkat kirim, riwayat ambil, riwayat kirim, masuk ambil hasil.
//
// Hitungan panggilan per transaksi dibawa pesan itu sendiri (Pesan.Panggilan) dan bertambah di dua fungsi saja, kirim
// dan terima. Hitungan itu dicocokkan dengan hitungan klien tiap proses dan hitungan broker.
package layanan

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"lab/t5gabung/antrean"
	"lab/t5gabung/skor"
)

// Nama topik antrean.
const (
	TopikPerangkat = "perangkat"
	TopikRiwayat   = "riwayat"
	TopikHasil     = "hasil"
)

// TungguAmbil adalah lama satu panggilan ambil menunggu pesan sebelum menjawab kosong.
const TungguAmbil = 500 * time.Millisecond

// Jawaban adalah keluaran yang dilihat pemanggil (client).
type Jawaban struct {
	ID        string   `json:"id"`
	Skor      int      `json:"skor"`
	Keputusan string   `json:"keputusan"`
	Alasan    []string `json:"alasan"`
	Panggilan int      `json:"panggilan"` // panggilan jaringan antar proses yang dilalui transaksi ini
	Galat     string   `json:"galat,omitempty"`
}

// Pesan berjalan dari proses ke proses lewat antrean.
type Pesan struct {
	Permintaan skor.Permintaan      `json:"permintaan"`
	Akun       *skor.FiturAkun      `json:"akun,omitempty"`
	Perangkat  *skor.FiturPerangkat `json:"perangkat,omitempty"`
	Hasil      *skor.Hasil          `json:"hasil,omitempty"`
	Galat      string               `json:"galat,omitempty"`
	Panggilan  int                  `json:"panggilan"`
}

// Metrik adalah isi GET /metrik tiap proses.
type Metrik struct {
	Proses        string                `json:"proses"`
	Diproses      int64                 `json:"diproses"`
	TanpaPenunggu int64                 `json:"hasil_tanpa_penunggu"`
	Klien         antrean.HitunganKlien `json:"klien"`
}

// kirim menambah hitungan panggilan pesan lalu mengirimnya. Satu dari dua tempat hitungan bertambah.
func kirim(ctx context.Context, k *antrean.Klien, topik string, p *Pesan) error {
	p.Panggilan++
	isi, err := json.Marshal(p)
	if err != nil {
		return err
	}
	return k.Publikasi(ctx, topik, isi)
}

// terima mengambil satu pesan dan menambah hitungan panggilannya. Mengembalikan (nil, nil) bila antrean kosong.
func terima(ctx context.Context, k *antrean.Klien, topik string) (*Pesan, error) {
	isi, err := k.Ambil(ctx, topik, TungguAmbil)
	if err != nil || isi == nil {
		return nil, err
	}
	var p Pesan
	if err := json.Unmarshal(isi, &p); err != nil {
		return nil, err
	}
	p.Panggilan++
	return &p, nil
}

func tulisJSON(w http.ResponseWriter, kode int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(kode)
	_ = json.NewEncoder(w).Encode(v)
}

func bacaPermintaan(r *http.Request) (skor.Permintaan, error) {
	var p skor.Permintaan
	if err := json.NewDecoder(http.MaxBytesReader(nil, r.Body, 1<<16)).Decode(&p); err != nil {
		return p, err
	}
	if p.ID == "" {
		return p, errors.New("id kosong")
	}
	return p, nil
}

// ---------- versi satu proses ----------

// Satu menjalankan seluruh alur dalam satu proses.
type Satu struct {
	Toko     *skor.Toko
	diproses atomic.Int64
}

// Handler memasang POST /skor dan GET /metrik.
func (s *Satu) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /skor", func(w http.ResponseWriter, r *http.Request) {
		p, err := bacaPermintaan(r)
		if err != nil {
			tulisJSON(w, http.StatusBadRequest, Jawaban{Galat: err.Error()})
			return
		}
		pesan := &Pesan{Permintaan: p} // hitungan panggilan tetap 0: tidak ada kirim atau terima di versi ini
		h, err := s.Toko.Nilai(p)
		if err != nil {
			tulisJSON(w, http.StatusUnprocessableEntity, Jawaban{ID: p.ID, Galat: err.Error()})
			return
		}
		s.diproses.Add(1)
		tulisJSON(w, http.StatusOK, Jawaban{ID: p.ID, Skor: h.Skor, Keputusan: h.Keputusan, Alasan: h.Alasan, Panggilan: pesan.Panggilan})
	})
	mux.HandleFunc("GET /metrik", func(w http.ResponseWriter, r *http.Request) {
		tulisJSON(w, http.StatusOK, Metrik{Proses: "satu", Diproses: s.diproses.Load()})
	})
	return mux
}

// ---------- versi tiga proses ----------

// Masuk adalah proses pertama: menerima permintaan, membaca data akun, dan menunggu hasil dari antrean.
type Masuk struct {
	Klien       *antrean.Klien
	Akun        *skor.TokoAkun
	BatasTunggu time.Duration

	mu            sync.Mutex
	menunggu      map[string]chan *Pesan
	diproses      atomic.Int64
	tanpaPenunggu atomic.Int64
}

// NewMasuk membuat proses masuk.
func NewMasuk(k *antrean.Klien, a *skor.TokoAkun, batas time.Duration) *Masuk {
	return &Masuk{Klien: k, Akun: a, BatasTunggu: batas, menunggu: map[string]chan *Pesan{}}
}

// Handler memasang POST /skor dan GET /metrik.
func (m *Masuk) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /skor", func(w http.ResponseWriter, r *http.Request) {
		p, err := bacaPermintaan(r)
		if err != nil {
			tulisJSON(w, http.StatusBadRequest, Jawaban{Galat: err.Error()})
			return
		}
		fa, err := m.Akun.Cari(p.AkunID)
		if err != nil {
			tulisJSON(w, http.StatusUnprocessableEntity, Jawaban{ID: p.ID, Galat: err.Error()})
			return
		}
		ch := make(chan *Pesan, 1)
		m.mu.Lock()
		if _, ada := m.menunggu[p.ID]; ada {
			m.mu.Unlock()
			tulisJSON(w, http.StatusConflict, Jawaban{ID: p.ID, Galat: "id sedang diproses"})
			return
		}
		m.menunggu[p.ID] = ch
		m.mu.Unlock()
		defer func() {
			m.mu.Lock()
			delete(m.menunggu, p.ID)
			m.mu.Unlock()
		}()
		if err := kirim(r.Context(), m.Klien, TopikPerangkat, &Pesan{Permintaan: p, Akun: &fa}); err != nil {
			tulisJSON(w, http.StatusBadGateway, Jawaban{ID: p.ID, Galat: err.Error()})
			return
		}
		select {
		case hasil := <-ch:
			m.diproses.Add(1)
			if hasil.Galat != "" || hasil.Hasil == nil {
				tulisJSON(w, http.StatusUnprocessableEntity, Jawaban{ID: p.ID, Galat: hasil.Galat, Panggilan: hasil.Panggilan})
				return
			}
			tulisJSON(w, http.StatusOK, Jawaban{ID: p.ID, Skor: hasil.Hasil.Skor, Keputusan: hasil.Hasil.Keputusan,
				Alasan: hasil.Hasil.Alasan, Panggilan: hasil.Panggilan})
		case <-time.After(m.BatasTunggu):
			tulisJSON(w, http.StatusGatewayTimeout, Jawaban{ID: p.ID, Galat: "hasil tidak datang sampai batas tunggu"})
		case <-r.Context().Done():
		}
	})
	mux.HandleFunc("GET /metrik", func(w http.ResponseWriter, r *http.Request) {
		tulisJSON(w, http.StatusOK, Metrik{Proses: "masuk", Diproses: m.diproses.Load(), TanpaPenunggu: m.tanpaPenunggu.Load(), Klien: m.Klien.Hitungan()})
	})
	return mux
}

// JalankanHasil menjalankan pekerja yang mengambil hasil dari antrean dan menyerahkannya ke permintaan yang menunggu.
// Berhenti saat ctx selesai.
func (m *Masuk) JalankanHasil(ctx context.Context, pekerja int) {
	for i := 0; i < pekerja; i++ {
		go func() {
			for ctx.Err() == nil {
				p, err := terima(ctx, m.Klien, TopikHasil)
				if err != nil {
					jedaGalat(ctx, err)
					continue
				}
				if p == nil {
					continue
				}
				m.mu.Lock()
				ch, ada := m.menunggu[p.Permintaan.ID]
				m.mu.Unlock()
				if !ada {
					m.tanpaPenunggu.Add(1) // permintaan sudah habis waktu atau client pergi
					continue
				}
				ch <- p
			}
		}()
	}
}

// Tahap adalah satu proses perantara atau terakhir: ambil pesan, tambah satu bagian data, kirim ke antrean berikutnya.
type Tahap struct {
	Nama     string
	Klien    *antrean.Klien
	Dari     string
	Proses   func(*Pesan) // menambah fitur atau menghitung hasil; galat dicatat di Pesan.Galat
	Ke       string       // topik berikutnya bila tidak ada galat
	diproses atomic.Int64
}

// NewPerangkat membuat proses kedua: membaca data perangkat.
func NewPerangkat(k *antrean.Klien, t *skor.TokoPerangkat) *Tahap {
	return &Tahap{Nama: "perangkat", Klien: k, Dari: TopikPerangkat, Ke: TopikRiwayat, Proses: func(p *Pesan) {
		f, err := t.Cari(p.Permintaan.PerangkatID)
		if err != nil {
			p.Galat = "perangkat: " + err.Error()
			return
		}
		p.Perangkat = &f
	}}
}

// NewRiwayat membuat proses ketiga: membaca riwayat dan menghitung skor akhir.
func NewRiwayat(k *antrean.Klien, t *skor.TokoRiwayat) *Tahap {
	return &Tahap{Nama: "riwayat", Klien: k, Dari: TopikRiwayat, Ke: TopikHasil, Proses: func(p *Pesan) {
		f, err := t.Ringkas(p.Permintaan.AkunID)
		if err != nil {
			p.Galat = "riwayat: " + err.Error()
			return
		}
		if p.Akun == nil || p.Perangkat == nil {
			p.Galat = "riwayat: fitur akun atau perangkat tidak ada di pesan"
			return
		}
		h := skor.Hitung(*p.Akun, *p.Perangkat, f, p.Permintaan.NominalRupiah)
		p.Hasil = &h
	}}
}

// Jalankan menjalankan pekerja tahap ini. Pesan yang gagal diproses langsung dikirim ke topik hasil.
func (t *Tahap) Jalankan(ctx context.Context, pekerja int) {
	for i := 0; i < pekerja; i++ {
		go func() {
			for ctx.Err() == nil {
				p, err := terima(ctx, t.Klien, t.Dari)
				if err != nil {
					jedaGalat(ctx, err)
					continue
				}
				if p == nil {
					continue
				}
				t.Proses(p)
				ke := t.Ke
				if p.Galat != "" {
					ke = TopikHasil
				}
				if err := kirim(ctx, t.Klien, ke, p); err != nil {
					log.Printf("%s: kirim ke %s gagal: %v", t.Nama, ke, err)
					continue
				}
				t.diproses.Add(1)
			}
		}()
	}
}

// Handler memasang GET /metrik untuk proses tahap.
func (t *Tahap) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /metrik", func(w http.ResponseWriter, r *http.Request) {
		tulisJSON(w, http.StatusOK, Metrik{Proses: t.Nama, Diproses: t.diproses.Load(), Klien: t.Klien.Hitungan()})
	})
	return mux
}

func jedaGalat(ctx context.Context, err error) {
	if ctx.Err() != nil {
		return
	}
	log.Printf("antrean: %v", err)
	select {
	case <-ctx.Done():
	case <-time.After(100 * time.Millisecond):
	}
}
