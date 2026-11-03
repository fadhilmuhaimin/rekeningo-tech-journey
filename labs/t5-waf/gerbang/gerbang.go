package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Mitra adalah satu baris mitra_pos yang dikenali dari kunci API-nya.
type Mitra struct {
	ID            int64
	Nama          string
	Status        string
	KuotaPerDetik int
}

// Toko mencari mitra dari sidik kunci. ok = false berarti tidak ada baris dengan sidik itu.
type Toko interface {
	CariKunci(ctx context.Context, sidik string) (Mitra, bool, error)
}

// Pemeriksa adalah WAF; antarmuka supaya tes rantai bisa memasang WAF palsu.
type Pemeriksa interface {
	Periksa(r *http.Request, body []byte) (Keputusan, error)
}

// Mode rentan gerbang (flag -rentan, dipisah koma). Tiap mode mengembalikan satu perilaku versi pertama.
const (
	RentanKuotaBersama   = "kuota-bersama"         // satu bucket untuk semua mitra (M50 seperti terjadi)
	RentanTanpaWajibKey  = "tanpa-idempoten-wajib" // Idempotency-Key opsional seperti Tahap 4
	RentanWAFDeteksi     = "waf-deteksi"           // WAF hanya mencatat (dipasang di main.go), tidak memblokir
	HeaderKunci          = "X-Kunci-Api"
	HeaderWaktu          = "X-Waktu"
	HeaderTanda          = "X-Tanda-Tangan"
	HeaderMitra          = "X-Mitra-Id"
	HeaderRahasiaGerbang = "X-Gerbang-Rahasia"
	AwalanPOS            = "/pos/v1/"
)

type Gerbang struct {
	WAF         Pemeriksa
	Toko        Toko
	Rahasia     map[int64]string // rahasia tanda tangan per mitra, dari penyimpanan rahasia (bukan dari database)
	Batas       *Pembatas
	Hulu        *url.URL
	RahasiaHulu string // yang dibaca api-t5 untuk percaya bahwa permintaan datang dari gerbang
	Rentan      map[string]bool
	Toleransi   time.Duration
	MaksBody    int64
	GagalMaks   int64
	Tahan       time.Duration // hanya lab: jeda sesudah lolos kuota, sebelum diteruskan (hulu yang lambat)
	Sekarang    func() time.Time
	Lab         bool
	proxy       *httputil.ReverseProxy
}

// Siap membuat reverse proxy ke hulu. Dipanggil sekali sebelum melayani.
func (g *Gerbang) Siap() {
	if g.Sekarang == nil {
		g.Sekarang = time.Now
	}
	g.proxy = &httputil.ReverseProxy{
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.SetURL(g.Hulu)
			pr.SetXForwarded()
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			log.Printf("hulu gagal: %v", err)
			tolak(w, 502, "hulu-tidak-tersedia", "Layanan di belakang gerbang tidak menjawab")
		},
		Transport: &http.Transport{ResponseHeaderTimeout: 3 * time.Second, DialContext: (&net.Dialer{Timeout: time.Second}).DialContext,
			MaxIdleConnsPerHost: 64},
	}
}

type problem struct {
	Type   string `json:"type"`
	Title  string `json:"title"`
	Status int    `json:"status"`
}

func tolak(w http.ResponseWriter, status int, kode, judul string) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(problem{Type: "/problems/" + kode, Title: judul, Status: status})
}

func alamatIP(r *http.Request) string {
	h, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return h
}

func metodeUbah(m string) bool {
	return m == http.MethodPost || m == http.MethodPut || m == http.MethodPatch || m == http.MethodDelete
}

// --8<-- [start:rantai]
// ServeHTTP menjalankan rantai pemeriksaan. Urutannya: batas body, WAF, rute, kunci API, kuota per mitra, tanda
// tangan, Idempotency-Key, lalu diteruskan. Kuota ada SEBELUM tanda tangan: mitra yang membanjiri gerbang dibatasi
// sebelum gerbang menghitung HMAC untuk tiap permintaannya, dan mitra lain tidak ikut terkena.
func (g *Gerbang) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	isi, err := io.ReadAll(http.MaxBytesReader(w, r.Body, g.MaksBody))
	if err != nil {
		var maks *http.MaxBytesError
		if errors.As(err, &maks) {
			tolak(w, 413, "body-terlalu-besar", "Body melebihi batas ukuran")
			return
		}
		tolak(w, 400, "body-tidak-terbaca", "Body tidak terbaca")
		return
	}
	r.Body = io.NopCloser(bytes.NewReader(isi))

	k, err := g.WAF.Periksa(r, isi)
	if err != nil { // gagal tertutup: WAF yang tidak bisa memeriksa tidak boleh meloloskan
		log.Printf("waf gagal: %v", err)
		tolak(w, 503, "waf-gagal", "Pemeriksaan permintaan tidak bisa dijalankan")
		return
	}
	if len(k.Aturan) > 0 {
		log.Printf("waf: aturan=%s blokir=%t", daftarID(k.Aturan), k.Blokir)
	}
	if g.Lab && len(k.Aturan) > 0 {
		w.Header().Set("X-Lab-Waf-Aturan", daftarID(k.Aturan))
	}
	if k.Blokir {
		tolak(w, k.Status, "diblokir-waf", "Permintaan diblokir")
		return
	}

	if !strings.HasPrefix(r.URL.Path, AwalanPOS) {
		tolak(w, 404, "tidak-ditemukan", "Alamat tidak dikenal")
		return
	}

	ip := alamatIP(r)
	kunci := r.Header.Get(HeaderKunci)
	mitra, ada, err := g.cari(ctx, kunci)
	if err != nil {
		log.Printf("toko gagal: %v", err)
		tolak(w, 503, "toko-tidak-tersedia", "Data mitra tidak terbaca")
		return
	}
	if !ada || mitra.Status != "aktif" {
		g.kunciGagal(ctx, w, ip)
		return
	}

	kuncikuota := strconv.FormatInt(mitra.ID, 10)
	if g.Rentan[RentanKuotaBersama] {
		kuncikuota = "bersama"
	}
	put, err := g.Batas.Masuk(ctx, kuncikuota, mitra.KuotaPerDetik)
	if err != nil { // kuota tidak bisa dihitung: tutup, bukan buka (gerbang ini melindungi platform dari M50)
		log.Printf("kuota gagal: %v", err)
		tolak(w, 503, "kuota-tidak-tersedia", "Kuota tidak bisa diperiksa")
		return
	}
	if !put.Boleh {
		w.Header().Set("Retry-After", strconv.FormatInt((put.TungguMs+999)/1000, 10))
		tolak(w, 429, put.Alasan, "Kuota mitra terlampaui")
		return
	}
	defer g.Batas.Keluar(kuncikuota)

	rahasia, ok := g.Rahasia[mitra.ID]
	if !ok {
		log.Printf("mitra %d tanpa rahasia tanda tangan", mitra.ID)
		tolak(w, 401, "tanda-tangan-salah", "Tanda tangan tidak cocok")
		return
	}
	switch err := PeriksaTanda(rahasia, g.Sekarang(), g.Toleransi, r.Header.Get(HeaderWaktu), r.Header.Get(HeaderTanda),
		r.Method, r.URL.RequestURI(), isi); {
	case errors.Is(err, ErrWaktu):
		tolak(w, 401, "waktu-di-luar-toleransi", "Timestamp di luar toleransi")
		return
	case err != nil:
		tolak(w, 401, "tanda-tangan-salah", "Tanda tangan tidak cocok")
		return
	}

	if metodeUbah(r.Method) && !g.Rentan[RentanTanpaWajibKey] && strings.TrimSpace(r.Header.Get("Idempotency-Key")) == "" {
		tolak(w, 400, "idempotency-key-wajib", "Idempotency-Key wajib untuk permintaan yang mengubah data")
		return
	}

	// Kepala identitas dibuat gerbang, tidak pernah dibawa dari client.
	for _, h := range []string{HeaderMitra, HeaderRahasiaGerbang, HeaderKunci, HeaderTanda, HeaderWaktu} {
		r.Header.Del(h)
	}
	for h := range r.Header {
		if strings.HasPrefix(strings.ToLower(h), "x-lab-") {
			r.Header.Del(h)
		}
	}
	r.Header.Set(HeaderMitra, strconv.FormatInt(mitra.ID, 10))
	r.Header.Set(HeaderRahasiaGerbang, g.RahasiaHulu)
	if g.Tahan > 0 {
		time.Sleep(g.Tahan)
	}
	g.proxy.ServeHTTP(w, r)
}

// --8<-- [end:rantai]

func (g *Gerbang) cari(ctx context.Context, kunci string) (Mitra, bool, error) {
	if strings.TrimSpace(kunci) == "" {
		return Mitra{}, false, nil
	}
	return g.Toko.CariKunci(ctx, SidikKunci(kunci))
}

// kunciGagal menjawab kunci yang tidak dikenal atau mitra yang dibekukan: 401 yang sama untuk keduanya. Kegagalan
// dihitung per alamat (ADR 27, enumerasi); sesudah GagalMaks kegagalan alamat itu dijawab 429. Hitungan hanya
// dipakai untuk kunci yang salah: kasir mitra yang sah di belakang alamat yang sama tidak ikut terhalang.
func (g *Gerbang) kunciGagal(ctx context.Context, w http.ResponseWriter, ip string) {
	n, err := g.Batas.SudahGagal(ctx, ip)
	if err != nil {
		log.Printf("hitungan gagal tidak terbaca: %v", err)
		tolak(w, 503, "kuota-tidak-tersedia", "Kuota tidak bisa diperiksa")
		return
	}
	if n >= g.GagalMaks {
		w.Header().Set("Retry-After", strconv.Itoa(int(g.Batas.JendelaGl/time.Second)))
		tolak(w, 429, "terlalu-banyak-percobaan-kunci", "Terlalu banyak kunci yang salah dari alamat ini")
		return
	}
	if _, err := g.Batas.Gagal(ctx, ip); err != nil {
		log.Printf("hitungan gagal tidak tertulis: %v", err)
		tolak(w, 503, "kuota-tidak-tersedia", "Kuota tidak bisa diperiksa")
		return
	}
	w.Header().Set("WWW-Authenticate", "X-Kunci-Api")
	tolak(w, 401, "kunci-tidak-sah", "Kunci API tidak sah")
}

func daftarID(ids []int) string {
	s := make([]string, len(ids))
	for i, id := range ids {
		s[i] = strconv.Itoa(id)
	}
	return strings.Join(s, ",")
}
