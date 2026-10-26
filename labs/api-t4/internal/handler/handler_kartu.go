package handler

import (
	"errors"
	"net/http"

	"lab/apit4/internal/service"
)

// Kartu virtual (Tahap 4, M37, ADR 42). Tiga rute pertama dipakai app pemilik kartu (login); tiga rute /penerbit/*
// dipanggil penerbit kartu dengan header X-Penerbit-Kunci dan tanpa sesi.
func (s Server) pasangKartu(mux *http.ServeMux) {
	mux.HandleFunc("POST /kartu", s.wajibLogin(s.terbitkanKartu))
	mux.HandleFunc("GET /kartu", s.wajibLogin(s.daftarKartu))
	mux.HandleFunc("POST /kartu/{id}/bekukan", s.wajibLogin(s.ubahStatusKartu("dibekukan")))
	mux.HandleFunc("POST /kartu/{id}/buka", s.wajibLogin(s.ubahStatusKartu("aktif")))
	mux.HandleFunc("POST /penerbit/otorisasi", s.dariPenerbit(s.otorisasiKartu))
	mux.HandleFunc("POST /penerbit/clearing", s.dariPenerbit(s.clearingKartu))
	mux.HandleFunc("POST /penerbit/reversal", s.dariPenerbit(s.reversalKartu))
}

// petaKartu memetakan error kartu. False: bukan error kartu, dilanjutkan ke petaError.
func (s Server) petaKartu(w http.ResponseWriter, err error) bool {
	switch {
	case errors.Is(err, service.ErrButuhVerifikasi):
		tulisProblem(w, Problem{Type: "/problems/butuh-verifikasi", Title: "Kartu virtual butuh akun terverifikasi", Status: 403})
	case errors.Is(err, service.ErrDibekukan):
		tulisProblem(w, Problem{Type: "/problems/akun-dibekukan", Title: "Akun dibekukan", Status: 403})
	case errors.Is(err, service.ErrKartuTidakAda):
		tidakDitemukan(w, "Kartu")
	case errors.Is(err, service.ErrKartuStatus):
		tulisProblem(w, Problem{Type: "/problems/kartu-status", Title: "Kartu tidak dalam status yang bisa diubah", Status: 409})
	case errors.Is(err, service.ErrKartuPenerbit):
		tulisProblem(w, Problem{Type: "/problems/penerbit-tidak-tersedia", Title: "Penerbit kartu tidak tersedia; tidak ada kartu yang dibuat",
			Status: 502, Detail: "Coba lagi nanti."})
	case errors.Is(err, service.ErrOtorisasiTidakAda):
		tulisProblem(w, Problem{Type: "/problems/otorisasi-tidak-ditemukan", Title: "Otorisasi tidak ditemukan", Status: 404})
	case errors.Is(err, service.ErrOtorisasiStatus):
		tulisProblem(w, Problem{Type: "/problems/otorisasi-status", Title: "Otorisasi tidak dalam status yang bisa diproses", Status: 409})
	case errors.Is(err, service.ErrOtorisasiBeda):
		tulisProblem(w, Problem{Type: "/problems/id-penerbit-dipakai", Title: "id_penerbit sudah dipakai untuk otorisasi lain", Status: 409})
	default:
		return false
	}
	return true
}

func (s Server) galatKartu(w http.ResponseWriter, err error, dilarang string) {
	if s.petaKartu(w, err) {
		return
	}
	s.petaError(w, err, dilarang)
}

// POST /kartu: terbitkan satu kartu virtual. 201 dengan empat digit terakhir; nomor penuh tidak ada di Rekeningo.
func (s Server) terbitkanKartu(w http.ResponseWriter, r *http.Request) {
	k, err := s.svc.TerbitkanKartu(r.Context(), peminta(r))
	if err != nil {
		s.galatKartu(w, err, "Hanya karyawan dan pemakai yang boleh memegang kartu")
		return
	}
	tulisJSON(w, http.StatusCreated, k)
}

// GET /kartu: kartu milik sendiri.
func (s Server) daftarKartu(w http.ResponseWriter, r *http.Request) {
	daftar, err := s.svc.DaftarKartu(r.Context(), peminta(r))
	if err != nil {
		s.errorInternal(w, err)
		return
	}
	tulisJSON(w, http.StatusOK, map[string]any{"kartu": daftar})
}

// POST /kartu/{id}/bekukan dan /buka: pemilik membekukan atau membuka kartunya dari app.
func (s Server) ubahStatusKartu(ke string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := idDariPath(r)
		if !ok {
			tidakDitemukan(w, "Kartu")
			return
		}
		k, err := s.svc.UbahStatusKartu(r.Context(), peminta(r), id, ke)
		if err != nil {
			s.galatKartu(w, err, "Hanya pemilik yang boleh mengubah kartu")
			return
		}
		tulisJSON(w, http.StatusOK, k)
	}
}

// dariPenerbit: header X-Penerbit-Kunci harus cocok dengan kunci server. Kunci server kosong menolak semua.
func (s Server) dariPenerbit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !s.svc.KunciPenerbitSah(r.Header.Get("X-Penerbit-Kunci")) {
			tulisProblem(w, Problem{Type: "/problems/kunci-penerbit", Title: "Kunci penerbit salah atau tidak ada", Status: 401})
			return
		}
		next(w, r)
	}
}

// POST /penerbit/otorisasi {id_penerbit, token, jumlah}: 200 dengan keputusan setuju atau tolak (alasan satu kata).
func (s Server) otorisasiKartu(w http.ResponseWriter, r *http.Request) {
	var in struct {
		IDPenerbit *string `json:"id_penerbit"`
		Token      *string `json:"token"`
		Jumlah     *int64  `json:"jumlah"`
	}
	if !baca(w, r, &in) {
		return
	}
	if p := wajibAda([]string{"id_penerbit", "token", "jumlah"}, in.IDPenerbit != nil, in.Token != nil, in.Jumlah != nil); p != nil {
		tulisProblem(w, *p)
		return
	}
	k, err := s.svc.Otorisasi(r.Context(), service.PermintaanOtorisasi{IDPenerbit: *in.IDPenerbit, Token: *in.Token, Jumlah: *in.Jumlah})
	if err != nil {
		s.galatKartu(w, err, "")
		return
	}
	tulisJSON(w, http.StatusOK, k)
}

// POST /penerbit/clearing {id_penerbit, jumlah}: penagihan. Saldo yang tidak cukup (otorisasi tanpa hold) 409.
func (s Server) clearingKartu(w http.ResponseWriter, r *http.Request) {
	var in struct {
		IDPenerbit *string `json:"id_penerbit"`
		Jumlah     *int64  `json:"jumlah"`
	}
	if !baca(w, r, &in) {
		return
	}
	if p := wajibAda([]string{"id_penerbit", "jumlah"}, in.IDPenerbit != nil, in.Jumlah != nil); p != nil {
		tulisProblem(w, *p)
		return
	}
	h, err := s.svc.Clearing(r.Context(), *in.IDPenerbit, *in.Jumlah)
	if errors.Is(err, service.ErrSaldoKurang) {
		tulisProblem(w, Problem{Type: "/problems/saldo-kurang", Title: "Saldo tidak cukup untuk menutup penagihan", Status: 409,
			Detail: "Otorisasi ini disetujui tanpa menahan dana; saldo pemilik sudah berkurang sejak itu."})
		return
	}
	if err != nil {
		s.galatKartu(w, err, "")
		return
	}
	tulisJSON(w, http.StatusOK, h)
}

// POST /penerbit/reversal {id_penerbit}: pembatalan otorisasi yang belum ditagih; diulang tetap 200.
func (s Server) reversalKartu(w http.ResponseWriter, r *http.Request) {
	var in struct {
		IDPenerbit *string `json:"id_penerbit"`
	}
	if !baca(w, r, &in) {
		return
	}
	if p := wajibAda([]string{"id_penerbit"}, in.IDPenerbit != nil); p != nil {
		tulisProblem(w, *p)
		return
	}
	h, err := s.svc.Reversal(r.Context(), *in.IDPenerbit)
	if err != nil {
		s.galatKartu(w, err, "")
		return
	}
	tulisJSON(w, http.StatusOK, h)
}
