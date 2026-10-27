package handler

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"lab/apit4/internal/service"
)

// pasangQR: merchant luar dan QR (ADR 40). Semua endpoint butuh login; pembayaran QR bisa dikirim ulang dengan
// Idempotency-Key seperti POST /transfers.
func (s Server) pasangQR(mux *http.ServeMux) {
	mux.HandleFunc("POST /qr", s.wajibLogin(s.buatQR))
	mux.HandleFunc("GET /qr/{id}", s.wajibLogin(s.lihatQR))
	mux.HandleFunc("POST /qr/{id}/bayar", s.wajibLogin(s.idempoten(s.bayarQR)))
	mux.HandleFunc("POST /qr/{id}/laporkan", s.wajibLogin(s.laporkanQR))
}

// petaQR memetakan error milik QR, lalu menyerahkan sisanya ke petaError. Error yang sama bisa berbeda artinya di
// endpoint lain, jadi pemetaan ini tidak ditaruh di petaError.
func (s Server) petaQR(w http.ResponseWriter, err error, dilarang string) {
	switch {
	case errors.Is(err, service.ErrQRTerpakai):
		tulisProblem(w, Problem{Type: "/problems/qr-terpakai", Title: "QR dinamis ini sudah dibayar", Status: 409})
	case errors.Is(err, service.ErrQRKedaluwarsa):
		tulisProblem(w, Problem{Type: "/problems/qr-kedaluwarsa", Title: "QR ini sudah kedaluwarsa", Status: 410,
			Detail: "Minta merchant menampilkan QR yang baru."})
	case errors.Is(err, service.ErrDibekukan):
		tulisProblem(w, Problem{Type: "/problems/akun-dibekukan", Title: "Akun dibekukan", Status: 403})
	case errors.Is(err, service.ErrButuhVerifikasi):
		tulisProblem(w, Problem{Type: "/problems/butuh-verifikasi", Title: "Akun harus terverifikasi dulu", Status: 403})
	case errors.Is(err, service.ErrTidakDitemukan):
		tidakDitemukan(w, "QR")
	default:
		s.petaError(w, err, dilarang)
	}
}

// POST /qr  body JSON: jenis (statis atau dinamis), nominal (hanya dinamis). Hanya merchant terverifikasi.
func (s Server) buatQR(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Jenis   *string `json:"jenis"`
		Nominal *int64  `json:"nominal"`
	}
	if !baca(w, r, &in) {
		return
	}
	if p := wajibAda([]string{"jenis"}, in.Jenis != nil); p != nil {
		tulisProblem(w, *p)
		return
	}
	q, err := s.svc.BuatQR(r.Context(), peminta(r), *in.Jenis, in.Nominal)
	if err != nil {
		s.petaQR(w, err, "Hanya merchant yang boleh membuat QR")
		return
	}
	w.Header().Set("Location", "/qr/"+q.ID)
	tulisJSON(w, 201, q)
}

// GET /qr/{id}: layar konfirmasi dengan nama merchant terverifikasi.
func (s Server) lihatQR(w http.ResponseWriter, r *http.Request) {
	k, err := s.svc.LihatQR(r.Context(), r.PathValue("id"))
	if err != nil {
		s.petaQR(w, err, "")
		return
	}
	tulisJSON(w, 200, k)
}

// POST /qr/{id}/bayar  body JSON (boleh kosong untuk QR dinamis): nominal.
func (s Server) bayarQR(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Nominal *int64 `json:"nominal"`
	}
	isi, err := io.ReadAll(http.MaxBytesReader(w, r.Body, MaksBodyJSON))
	if err != nil {
		tulisProblem(w, Problem{Type: "/problems/json-rusak", Title: "Body tidak terbaca", Status: 400})
		return
	}
	if len(strings.TrimSpace(string(isi))) > 0 {
		if p := bacaJSON(strings.NewReader(string(isi)), &in); p != nil {
			tulisProblem(w, *p)
			return
		}
	}
	h, err := s.svc.BayarQR(r.Context(), peminta(r), r.PathValue("id"), in.Nominal)
	if err != nil {
		s.petaQR(w, err, "Hanya karyawan dan pemakai yang bisa membayar QR")
		return
	}
	w.Header().Set("Location", fmt.Sprintf("/transfers/%d", h.ID))
	tulisJSON(w, 201, h)
}

// POST /qr/{id}/laporkan  body JSON: alasan. Membekukan merchant pemilik QR sampai tim risk memeriksa.
func (s Server) laporkanQR(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Alasan *string `json:"alasan"`
	}
	if !baca(w, r, &in) {
		return
	}
	if p := wajibAda([]string{"alasan"}, in.Alasan != nil); p != nil {
		tulisProblem(w, *p)
		return
	}
	if err := s.svc.LaporkanQR(r.Context(), peminta(r), r.PathValue("id"), *in.Alasan); err != nil {
		s.petaQR(w, err, "")
		return
	}
	tulisJSON(w, 202, map[string]string{"status": "merchant dibekukan sementara"})
}
