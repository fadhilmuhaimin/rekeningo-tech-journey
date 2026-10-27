package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"

	"lab/apit4/internal/service"
)

// File identitas lewat presigned PUT (ADR 38, lab t4-storage). Dua langkah: minta URL, lalu ajukan sesudah mengunggah.
func (s Server) pasangBerkas(mux *http.ServeMux) {
	mux.HandleFunc("POST /verifikasi/unggahan", s.wajibLogin(s.mintaUnggahan))
	mux.HandleFunc("POST /verifikasi/terunggah", s.wajibLogin(s.ajukanTerunggah))
}

// petaBerkas: galat khusus alur unggah; yang lain jatuh ke petaTopup.
func (s Server) petaBerkas(w http.ResponseWriter, err error, dilarang string) {
	if errors.Is(err, service.ErrPresignTidakAda) {
		tulisProblem(w, Problem{Type: "/problems/tidak-dipasang", Title: "Penyimpanan objek di server ini tidak membuat URL unggah", Status: 503})
		return
	}
	s.petaTopup(w, err, dilarang)
}

// POST /verifikasi/unggahan {ukuran_kartu?, ukuran_swafoto?}: 201 dengan dua kunci dan dua URL PUT. URL adalah bearer
// token, jadi jawabannya tidak boleh disimpan perantara (Cache-Control: no-store).
func (s Server) mintaUnggahan(w http.ResponseWriter, r *http.Request) {
	var in struct {
		UkuranKartu   int64 `json:"ukuran_kartu"`
		UkuranSwafoto int64 `json:"ukuran_swafoto"`
	}
	r.Body = http.MaxBytesReader(w, r.Body, 1024)
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil && !errors.Is(err, io.EOF) { // body kosong = tanpa ukuran
		tulisProblem(w, Problem{Type: "/problems/json-rusak", Title: "Body bukan JSON yang valid", Status: 400})
		return
	}
	u, err := s.svc.MintaUnggahan(r.Context(), peminta(r), in.UkuranKartu, in.UkuranSwafoto)
	if err != nil {
		s.petaBerkas(w, err, "Hanya pemakai dan merchant yang mengajukan verifikasi")
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	tulisJSON(w, 201, u)
}

// POST /verifikasi/terunggah: 202 seperti POST /verifikasi. Kunci dan checksum dari app adalah klaim; server memeriksa
// objeknya di penyimpanan (ukuran, tipe, checksum hitungan sendiri) sebelum pengajuan ditulis. Nomor identitas
// diperiksa bentuknya lalu dibuang: tidak disimpan, tidak masuk log, tidak diulang di jawaban galat.
func (s Server) ajukanTerunggah(w http.ResponseWriter, r *http.Request) {
	if !s.batasAlamat(w, r, "verifikasi") {
		return
	}
	var in struct {
		KunciKartu      string `json:"kunci_kartu"`
		KunciSwafoto    string `json:"kunci_swafoto"`
		ChecksumKartu   string `json:"checksum_kartu"`
		ChecksumSwafoto string `json:"checksum_swafoto"`
		NomorIdentitas  any    `json:"nomor_identitas"` // any: nilai bertipe salah tidak dikutip oleh pesan galat JSON
	}
	r.Body = http.MaxBytesReader(w, r.Body, 4096)
	if p := bacaJSON(r.Body, &in); p != nil {
		tulisProblem(w, *p)
		return
	}
	nomor, _ := in.NomorIdentitas.(string)
	v, err := s.svc.AjukanVerifikasiTerunggah(r.Context(), peminta(r), service.BerkasTerunggah{
		KunciKartu: in.KunciKartu, KunciSwafoto: in.KunciSwafoto, ChecksumKartu: in.ChecksumKartu,
		ChecksumSwafoto: in.ChecksumSwafoto, NomorIdentitas: nomor})
	if err != nil {
		s.petaBerkas(w, err, "Hanya pemakai dan merchant yang mengajukan verifikasi")
		return
	}
	w.Header().Set("Location", fmt.Sprintf("/verifikasi/%d", v.ID))
	tulisJSON(w, 202, v)
}
