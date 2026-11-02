package handler

import (
	"context"
	"crypto/subtle"
	"errors"
	"net/http"
	"strconv"
	"unicode/utf8"

	"lab/apit5/internal/service"
)

// API publik untuk mitra POS (lab t5-waf, ADR 56, M50). Rute ini hanya terdaftar bila server dijalankan dengan
// -pos-rahasia. Pintunya gerbang di tepi (labs/t5-waf/gerbang): WAF, kunci API, tanda tangan, kuota per mitra, dan
// Idempotency-Key wajib diperiksa di sana. Server ini hanya percaya pada permintaan yang membawa rahasia gerbang,
// dan memeriksa sendiri cakupannya: merchant di alamat harus milik mitra yang disebut gerbang.
func (s Server) pasangPOS(mux *http.ServeMux) {
	if s.posRahasia == "" {
		return
	}
	mux.HandleFunc("POST /pos/v1/merchant/{id}/qr", s.wajibMitra(s.idempoten(s.posBuatQR)))
	mux.HandleFunc("GET /pos/v1/merchant/{id}/qr/{qr}", s.wajibMitra(s.posLihatQR))
}

// DenganPOS memasang rahasia gerbang dan membuka rute POS. Rahasia kosong berarti rute POS tidak ada.
func (s Server) DenganPOS(rahasia string) Server { s.posRahasia = rahasia; return s }

// --8<-- [start:wajib-mitra]
// wajibMitra: permintaan harus membawa rahasia gerbang (perbandingan waktu tetap), id mitra dari gerbang, dan
// merchant di alamat harus milik mitra itu. Merchant milik mitra lain dijawab 404 yang sama dengan merchant yang tidak
// ada. Kepala X-Mitra-Id yang dikirim client dibuang gerbang dan diganti dengan id dari kunci API yang sah.
func (s Server) wajibMitra(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if subtle.ConstantTimeCompare([]byte(r.Header.Get("X-Gerbang-Rahasia")), []byte(s.posRahasia)) != 1 {
			tulisProblem(w, Problem{Type: "/problems/bukan-dari-gerbang", Title: "Permintaan harus lewat gerbang", Status: 401})
			return
		}
		mitra, err := strconv.ParseInt(r.Header.Get("X-Mitra-Id"), 10, 64)
		if err != nil || mitra <= 0 {
			tulisProblem(w, Problem{Type: "/problems/bukan-dari-gerbang", Title: "Permintaan harus lewat gerbang", Status: 401})
			return
		}
		merchant, ok := idDariPath(r)
		if !ok {
			tidakDitemukan(w, "Merchant")
			return
		}
		if s.rentan != service.RentanPosTanpaCakupan {
			milik, err := s.svc.MerchantMilikMitra(r.Context(), merchant, mitra)
			if err != nil {
				s.errorInternal(w, err)
				return
			}
			if !milik {
				tidakDitemukan(w, "Merchant")
				return
			}
		}
		next(w, r.WithContext(context.WithValue(r.Context(), kunciPeminta{}, merchant)))
	}
}

// --8<-- [end:wajib-mitra]

// POST /pos/v1/merchant/{id}/qr  body JSON: nominal (wajib, QR dinamis), referensi (opsional, paling banyak 100 karakter;
// dikembalikan apa adanya, tidak disimpan). Idempotency-Key membuat pengulangan dari kasir menghasilkan QR yang sama.
func (s Server) posBuatQR(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Nominal   *int64  `json:"nominal"`
		Referensi *string `json:"referensi"`
	}
	if !baca(w, r, &in) {
		return
	}
	if p := wajibAda([]string{"nominal"}, in.Nominal != nil); p != nil {
		tulisProblem(w, *p)
		return
	}
	if in.Referensi != nil && utf8.RuneCountInString(*in.Referensi) > 100 {
		tulisProblem(w, Problem{Type: "/problems/validasi", Title: "Data tidak memenuhi aturan", Status: 400,
			Errors: []map[string]string{{"field": "referensi", "pesan": "paling banyak 100 karakter"}}})
		return
	}
	q, err := s.svc.BuatQR(r.Context(), peminta(r), "dinamis", in.Nominal)
	if err != nil {
		s.petaQR(w, err, "Hanya merchant yang boleh membuat QR")
		return
	}
	w.Header().Set("Location", "/pos/v1/merchant/"+r.PathValue("id")+"/qr/"+q.ID)
	tulisJSON(w, 201, map[string]any{"id": q.ID, "jenis": q.Jenis, "nominal": q.Nominal,
		"berlaku_sampai": q.BerlakuSampai, "status": q.Status, "referensi": in.Referensi})
}

// GET /pos/v1/merchant/{id}/qr/{qr}: status pembayaran satu QR milik merchant ini.
func (s Server) posLihatQR(w http.ResponseWriter, r *http.Request) {
	q, status, err := s.svc.StatusQRPOS(r.Context(), peminta(r), r.PathValue("qr"))
	if errors.Is(err, service.ErrTidakDitemukan) {
		tidakDitemukan(w, "QR")
		return
	}
	if err != nil {
		s.errorInternal(w, err)
		return
	}
	tulisJSON(w, 200, map[string]any{"id": q.ID, "jenis": q.Jenis, "nominal": q.Nominal,
		"berlaku_sampai": q.BerlakuSampai, "status": status})
}
