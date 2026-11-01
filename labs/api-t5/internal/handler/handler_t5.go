package handler

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"lab/apit5/internal/service"
)

// Endpoint Tahap 5 (lab-api-t5): laporan merchant dari primary (hanya mode laporan-primary, M40), pengumuman (M45), dan
// cicilan (M48). API untuk mitra POS (M50) belum ada di lab ini: tabel `mitra_pos` ada, kontraknya ada di openapi.yaml,
// dan implementasinya milik lab t5-waf.
func (s Server) pasangTahap5(mux *http.ServeMux) {
	if s.rentan == service.RentanLaporanPrimary { // M40: tanpa mode ini rutenya tidak ada
		mux.HandleFunc("GET /merchant/{id}/laporan/hari-ini", s.wajibLogin(s.laporanHariIni))
	}
	mux.HandleFunc("POST /pengumuman", s.wajibLogin(s.batasAkun("pengumuman", s.buatPengumuman)))
	mux.HandleFunc("POST /cicilan", s.wajibLogin(s.batasAkun("cicilan", s.buatCicilan)))
	mux.HandleFunc("GET /cicilan/{id}", s.wajibLogin(s.lihatCicilan))
}

// GET /merchant/{id}/laporan/hari-ini: uang masuk hari ini (WIB), dibaca dari primary. Hanya pemilik akun.
func (s Server) laporanHariIni(w http.ResponseWriter, r *http.Request) {
	id, ok := idDariPath(r)
	if !ok {
		tidakDitemukan(w, "Merchant")
		return
	}
	l, err := s.svc.LaporanHariIni(r.Context(), peminta(r), id)
	if errors.Is(err, service.ErrTidakDitemukan) {
		tidakDitemukan(w, "Merchant")
		return
	}
	if err != nil {
		s.petaError(w, err, "")
		return
	}
	tulisJSON(w, 200, l)
}

// POST /pengumuman  body JSON: judul. Hanya admin atau hr. 201 dengan id dan jumlah penerima saat dibuat.
func (s Server) buatPengumuman(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Judul *string `json:"judul"`
	}
	if !baca(w, r, &in) {
		return
	}
	if p := wajibAda([]string{"judul"}, in.Judul != nil); p != nil {
		tulisProblem(w, *p)
		return
	}
	id, n, err := s.svc.BuatPengumuman(r.Context(), peminta(r), *in.Judul)
	if err != nil {
		s.petaError(w, err, "Hanya akun admin atau hr yang boleh membuat pengumuman")
		return
	}
	tulisJSON(w, 201, map[string]any{"id": id, "jumlah_penerima": n})
}

// POST /cicilan  body JSON: jenis, merchant_akun_id (cicilan), jumlah_per_angsuran, jumlah_angsuran, hari_tagih, mulai.
func (s Server) buatCicilan(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Jenis     *string `json:"jenis"`
		Merchant  *int64  `json:"merchant_akun_id"`
		Per       *int64  `json:"jumlah_per_angsuran"`
		Angsuran  *int    `json:"jumlah_angsuran"`
		HariTagih *int    `json:"hari_tagih"`
		Mulai     *string `json:"mulai"`
	}
	if !baca(w, r, &in) {
		return
	}
	if p := wajibAda([]string{"jenis", "jumlah_per_angsuran", "jumlah_angsuran", "hari_tagih", "mulai"},
		in.Jenis != nil, in.Per != nil, in.Angsuran != nil, in.HariTagih != nil, in.Mulai != nil); p != nil {
		tulisProblem(w, *p)
		return
	}
	mulai, err := time.ParseInLocation("2006-01-02", *in.Mulai, service.WIB)
	if err != nil {
		s.petaError(w, service.ErrValidasi{Field: "mulai", Pesan: "tanggal YYYY-MM-DD"}, "")
		return
	}
	id, err := s.svc.BuatCicilan(r.Context(), peminta(r), *in.Jenis, in.Merchant, *in.Per, *in.Angsuran, *in.HariTagih, mulai)
	if err != nil {
		s.petaError(w, err, "Hanya karyawan atau pemakai yang boleh membuat jadwal cicilan")
		return
	}
	tulisJSON(w, 201, map[string]int64{"id": id})
}

// GET /cicilan/{id}: jadwal dan angsurannya. Hanya pemilik jadwal; yang lain dijawab tidak ditemukan.
func (s Server) lihatCicilan(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		tidakDitemukan(w, "Jadwal cicilan")
		return
	}
	j, a, err := s.svc.LihatCicilan(r.Context(), peminta(r), id)
	if errors.Is(err, service.ErrTidakDitemukan) {
		tidakDitemukan(w, "Jadwal cicilan")
		return
	}
	if err != nil {
		s.petaError(w, err, "")
		return
	}
	tulisJSON(w, 200, map[string]any{"jadwal": j, "angsuran": a})
}
