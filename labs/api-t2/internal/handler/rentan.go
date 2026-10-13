package handler

import (
	"encoding/json"
	"net/http"
)

// Mode rentan untuk halaman masalah Tahap 1 (keputusan 148, 155). Hanya aktif dengan flag -rentan.

// --8<-- [start:m2]
// bayarM2 adalah handler bayar minggu 1, sebelum kontrak: field yang tidak dikirim dianggap 0,
// dan semua error baca body dijawab sama, tanpa nama field.
func (s Server) bayarM2(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Ke     int64 `json:"ke"`
		Jumlah int64 `json:"jumlah"`
	}
	if json.NewDecoder(r.Body).Decode(&in) != nil {
		tulisProblem(w, Problem{Type: "/problems/json-rusak", Title: "Body bukan JSON yang valid", Status: 400})
		return
	}
	s.selesaikanBayar(w, r, in.Ke, in.Jumlah)
}

// --8<-- [end:m2]

// --8<-- [start:m3]
// cariWarungM3 menyambung teks pencarian ke SQL dan mengembalikan semua field semua akun (minggu 2 Raka).
func (s Server) cariWarungM3(w http.ResponseWriter, r *http.Request, cari string) {
	hasil, err := s.svc.CariWarungRentanM3(r.Context(), cari)
	if err != nil {
		// Pencarian dengan tanda kutip membuat SQL tidak valid; app menerima 500.
		s.errorInternal(w, err)
		return
	}
	tulisJSON(w, 200, map[string]any{"warung": hasil})
}

// --8<-- [end:m3]
