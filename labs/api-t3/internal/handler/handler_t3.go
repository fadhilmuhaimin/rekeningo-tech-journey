package handler

import (
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"lab/apit3/internal/repo"
	"lab/apit3/internal/service"
)

// MaksBodyJSON: body JSON endpoint Tahap 3 paling besar 64 KB.
const MaksBodyJSON = 64 << 10

func baca(w http.ResponseWriter, r *http.Request, v any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, MaksBodyJSON)
	if p := bacaJSON(r.Body, v); p != nil {
		tulisProblem(w, *p)
		return false
	}
	return true
}

func metodeUbah(m string) bool {
	return m == http.MethodPost || m == http.MethodPut || m == http.MethodPatch || m == http.MethodDelete
}

// --8<-- [start:csrf]
// csrfSah memeriksa tiga hal untuk permintaan ubah dari sesi web (OWASP CSRF Prevention Cheat Sheet, R3-19):
// Sec-Fetch-Site (bila ada) harus same-origin atau none, Origin (bila ada) harus asal yang sama dengan Host, dan
// header X-CSRF-Token harus cocok dengan hash di sesi. Cookie SameSite=Lax saja tidak menggantikan ketiganya.
func csrfSah(r *http.Request, sesi repo.Sesi) bool {
	if site := r.Header.Get("Sec-Fetch-Site"); site != "" && site != "same-origin" && site != "none" {
		return false
	}
	if o := r.Header.Get("Origin"); o != "" && o != "http://"+r.Host && o != "https://"+r.Host {
		return false
	}
	return service.CsrfSah(sesi, r.Header.Get("X-CSRF-Token"))
}

// --8<-- [end:csrf]

// POST /web/login: sesi dasbor. Token sesi hanya lewat cookie (HttpOnly, tidak terbaca JavaScript); token CSRF
// dikirim di body supaya halaman bisa memasangnya di header. Karyawan 403: karyawan memakai app.
func (s Server) loginWeb(w http.ResponseWriter, r *http.Request) {
	if !s.izinkanIP(w, r, s.loginIP, "Terlalu banyak percobaan dari alamat ini") {
		return
	}
	var in struct{ Email, Password string }
	r.Body = http.MaxBytesReader(w, r.Body, 4096)
	if json.NewDecoder(r.Body).Decode(&in) != nil || in.Email == "" || in.Password == "" {
		tulisProblem(w, Problem{Type: "/problems/json-rusak", Title: "Body harus JSON berisi email dan password", Status: 400})
		return
	}
	token, csrf, sampai, err := s.svc.LoginWeb(r.Context(), in.Email, in.Password)
	if !s.petaMasuk(w, err) {
		return
	}
	detik := int(time.Until(sampai).Round(time.Second).Seconds())
	http.SetCookie(w, &http.Cookie{Name: NamaCookieSesi, Value: token, Path: "/", MaxAge: detik, Secure: true,
		HttpOnly: true, SameSite: http.SameSiteLaxMode})
	tulisJSON(w, 200, map[string]any{"csrf": csrf, "kedaluwarsa_detik": detik})
}

// POST /perangkat: daftarkan token push HP ini untuk akun yang login.
func (s Server) perangkat(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Platform  *string `json:"platform"`
		TokenPush *string `json:"token_push"`
	}
	if !baca(w, r, &in) {
		return
	}
	if p := wajibAda([]string{"platform", "token_push"}, in.Platform != nil, in.TokenPush != nil); p != nil {
		tulisProblem(w, *p)
		return
	}
	id, err := s.svc.DaftarkanPerangkat(r.Context(), peminta(r), *in.Platform, *in.TokenPush)
	if err != nil {
		s.petaError(w, err, "")
		return
	}
	tulisJSON(w, 201, map[string]int64{"id": id})
}

func angkaOpsional(r *http.Request, nama string) (*int64, bool) {
	v := r.URL.Query().Get(nama)
	if v == "" {
		return nil, true
	}
	n, err := strconv.ParseInt(v, 10, 64)
	return &n, err == nil
}

// GET /katalog?kota=<id>&warung=<id>: menu warung di satu kota (kota akun sendiri bila tidak disebut).
func (s Server) katalog(w http.ResponseWriter, r *http.Request) {
	kota, ok1 := angkaOpsional(r, "kota")
	warung, ok2 := angkaOpsional(r, "warung")
	if !ok1 || !ok2 {
		tulisProblem(w, Problem{Type: "/problems/validasi", Title: "kota dan warung berupa angka", Status: 422})
		return
	}
	k, m, err := s.svc.Katalog(r.Context(), peminta(r), kota, warung)
	if err != nil {
		s.petaError(w, err, "")
		return
	}
	tulisJSON(w, 200, map[string]any{"kota": k, "warung": m})
}

// POST /pesanan: bayar satu produk. Nominal dihitung server dari database; app tidak mengirimnya.
func (s Server) pesanan(w http.ResponseWriter, r *http.Request) {
	var in struct {
		ProdukID *int64 `json:"produk_id"`
		Porsi    *int   `json:"porsi"`
		Catatan  string `json:"catatan"`
	}
	if !baca(w, r, &in) {
		return
	}
	if p := wajibAda([]string{"produk_id", "porsi"}, in.ProdukID != nil, in.Porsi != nil); p != nil {
		tulisProblem(w, *p)
		return
	}
	h, err := s.svc.Pesan(r.Context(), peminta(r), *in.ProdukID, *in.Porsi, in.Catatan)
	if err != nil {
		s.petaError(w, err, "Hanya karyawan yang bisa memesan")
		return
	}
	w.Header().Set("Location", fmt.Sprintf("/transfers/%d", h.ID))
	tulisJSON(w, 201, h)
}

// PATCH /produk/{id}: ubah harga dan atau stok, bersyarat versi (ADR 29). 409 bila versi sudah berbeda.
func (s Server) ubahProduk(w http.ResponseWriter, r *http.Request) {
	id, ok := idDariPath(r)
	if !ok {
		tidakDitemukan(w, "Produk")
		return
	}
	var in struct {
		Harga *int64 `json:"harga"`
		Stok  *int   `json:"stok"`
		Versi *int   `json:"versi"`
	}
	if !baca(w, r, &in) {
		return
	}
	if p := wajibAda([]string{"versi"}, in.Versi != nil); p != nil {
		tulisProblem(w, *p)
		return
	}
	hasil, err := s.svc.UbahProduk(r.Context(), peminta(r), id, in.Harga, in.Stok, *in.Versi)
	if errors.Is(err, service.ErrTidakDitemukan) {
		tidakDitemukan(w, "Produk")
		return
	}
	if err != nil {
		s.petaError(w, err, "Hanya warung pemilik yang boleh mengubah produk")
		return
	}
	tulisJSON(w, 200, hasil)
}

// GET /promo?kota=<id>: promo yang belum selesai.
func (s Server) daftarPromo(w http.ResponseWriter, r *http.Request) {
	kota, ok := angkaOpsional(r, "kota")
	if !ok {
		tulisProblem(w, Problem{Type: "/problems/validasi", Title: "kota berupa angka", Status: 422})
		return
	}
	p, err := s.svc.DaftarPromo(r.Context(), peminta(r), kota)
	if err != nil {
		s.petaError(w, err, "")
		return
	}
	tulisJSON(w, 200, map[string]any{"promo": p})
}

// POST /promo: hanya akun hr, untuk kota hr itu. umumkan=true menulis satu pemberitahuan per karyawan kota itu.
func (s Server) buatPromo(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Judul          *string    `json:"judul"`
		PotonganPersen *int       `json:"potongan_persen"`
		Mulai          *time.Time `json:"mulai"`
		Selesai        *time.Time `json:"selesai"`
		Umumkan        bool       `json:"umumkan"`
	}
	if !baca(w, r, &in) {
		return
	}
	if p := wajibAda([]string{"judul", "potongan_persen", "mulai", "selesai"},
		in.Judul != nil, in.PotonganPersen != nil, in.Mulai != nil, in.Selesai != nil); p != nil {
		tulisProblem(w, *p)
		return
	}
	id, n, err := s.svc.BuatPromo(r.Context(), peminta(r), *in.Judul, *in.PotonganPersen, *in.Mulai, *in.Selesai, in.Umumkan)
	if err != nil {
		s.petaError(w, err, "Hanya akun hr yang boleh membuat promo")
		return
	}
	tulisJSON(w, 201, map[string]int64{"id": id, "diumumkan": n})
}

// POST /sinkron: satu operasi dari queue offline HP warung (stok atau harga), bersyarat versi (ADR 29).
// 200 diterapkan (atau pengiriman ulang yang sudah diterapkan), 409 konflik dengan keadaan terkini.
func (s Server) sinkron(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Kunci       *string    `json:"kunci"`
		PerangkatID *int64     `json:"perangkat_id"`
		ProdukID    *int64     `json:"produk_id"`
		Jenis       *string    `json:"jenis"`
		Nilai       *int64     `json:"nilai"`
		VersiDasar  *int       `json:"versi_dasar"`
		DibuatDiHP  *time.Time `json:"dibuat_di_hp"`
	}
	if !baca(w, r, &in) {
		return
	}
	if p := wajibAda([]string{"kunci", "perangkat_id", "produk_id", "jenis", "nilai", "versi_dasar", "dibuat_di_hp"},
		in.Kunci != nil, in.PerangkatID != nil, in.ProdukID != nil, in.Jenis != nil, in.Nilai != nil,
		in.VersiDasar != nil, in.DibuatDiHP != nil); p != nil {
		tulisProblem(w, *p)
		return
	}
	status, sekarang, ulang, err := s.svc.Sinkron(r.Context(), peminta(r), repo.OperasiSinkron{
		Kunci: *in.Kunci, Perangkat: *in.PerangkatID, Produk: *in.ProdukID, Jenis: *in.Jenis, Nilai: *in.Nilai,
		VersiDasar: *in.VersiDasar, DibuatHP: *in.DibuatDiHP})
	if errors.Is(err, service.ErrTidakDitemukan) {
		tidakDitemukan(w, "Produk")
		return
	}
	if err != nil {
		s.petaError(w, err, "Hanya warung yang boleh mengirim operasi sinkron")
		return
	}
	kode := http.StatusOK
	if status == "konflik" {
		kode = http.StatusConflict
	}
	tulisJSON(w, kode, map[string]any{"status": status, "ulang": ulang, "sekarang": sekarang})
}

// GET /warung/{id}/laporan.csv?dari=YYYY-MM-DD&sampai=YYYY-MM-DD: ekspor laporan harian untuk dasbor. Hanya angka
// dan tanggal, jadi tidak ada isi buatan user di dalam file (tidak ada CSV injection dari catatan). Pencatatan
// ringkasan ekspor jalan di latar (service.LaporanEkspor, M21).
func (s Server) laporanCSV(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	q := r.URL.Query()
	baris, err := s.svc.LaporanEkspor(r.Context(), peminta(r), id, q.Get("dari"), q.Get("sampai"))
	if errors.Is(err, service.ErrTidakDitemukan) {
		tidakDitemukan(w, "Warung")
		return
	}
	if err != nil {
		s.petaError(w, err, "")
		return
	}
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="laporan.csv"`)
	c := csv.NewWriter(w)
	c.Write([]string{"tanggal", "transaksi", "total"})
	for _, b := range baris {
		c.Write([]string{b.Tanggal, strconv.FormatInt(b.Transaksi, 10), strconv.FormatInt(b.Total, 10)})
	}
	c.Flush()
}

// GET /warung/{id}/penerimaan?batas=<n>: uang masuk ke warung, termasuk catatan dari pembayar.
func (s Server) penerimaan(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	batas := 20
	if v := r.URL.Query().Get("batas"); v != "" {
		var err error
		if batas, err = strconv.Atoi(v); err != nil {
			batas = 0
		}
	}
	p, err := s.svc.Penerimaan(r.Context(), peminta(r), id, batas)
	if errors.Is(err, service.ErrTidakDitemukan) {
		tidakDitemukan(w, "Warung")
		return
	}
	if err != nil {
		s.petaError(w, err, "")
		return
	}
	tulisJSON(w, 200, map[string]any{"warung": id, "penerimaan": p})
}
