package handler

import (
	"errors"
	"net/http"
	"strconv"

	"lab/apit4/internal/objek"
	"lab/apit4/internal/service"
)

// pasangBackOffice: back office tim risk (hanya akun jenis risk), audit log, dan impor katalog merchant (M36, M38,
// ADR 38, ADR 41, ADR 43). Cek peran ada di service; handler hanya membaca input dan memetakan galat.
func (s Server) pasangBackOffice(mux *http.ServeMux) {
	mux.HandleFunc("GET /bo/akun/{id}", s.wajibLogin(s.boLihatAkun))
	mux.HandleFunc("POST /bo/akun/{id}/bekukan", s.wajibLogin(s.boBekukan))
	mux.HandleFunc("POST /bo/akun/{id}/buka", s.wajibLogin(s.boBuka))
	mux.HandleFunc("POST /bo/akun/{id}/batas-harian", s.wajibLogin(s.boBatasHarian))
	mux.HandleFunc("GET /bo/verifikasi/{id}", s.wajibLogin(s.boLihatVerifikasi))
	mux.HandleFunc("GET /bo/verifikasi/{id}/berkas/{bagian}", s.wajibLogin(s.boBerkas))
	mux.HandleFunc("POST /bo/merchant/{id}/setujui", s.wajibLogin(s.boSetujuiMerchant))
	mux.HandleFunc("POST /bo/merchant/{id}/tolak", s.wajibLogin(s.boTolakMerchant))
	mux.HandleFunc("POST /bo/flag/kartu", s.wajibLogin(s.boFlagKartu))
	mux.HandleFunc("GET /bo/audit/verifikasi", s.wajibLogin(s.boAuditVerifikasi))
	mux.HandleFunc("POST /merchant/katalog/impor", s.wajibLogin(s.imporKatalog))
}

const dilaranganBO = "Hanya akun tim risk yang boleh memakai back office"

// petaBO memetakan galat back office dan impor katalog; yang lain jatuh ke petaError.
func (s Server) petaBO(w http.ResponseWriter, err error, dilarang string) {
	switch {
	case errors.Is(err, service.ErrDibekukan):
		tulisProblem(w, Problem{Type: "/problems/akun-dibekukan", Title: "Akun ini dibekukan", Status: 403})
	case errors.Is(err, service.ErrButuhPersetujuan):
		tulisProblem(w, Problem{Type: "/problems/butuh-persetujuan", Title: "Aksi ini butuh persetujuan petugas risk kedua",
			Status: 403, Detail: "Kirim token sesi app petugas risk lain di header X-Penyetuju-Token."})
	case errors.Is(err, service.ErrSudahDiputuskan):
		tulisProblem(w, Problem{Type: "/problems/sudah-diputuskan", Title: "Pengajuan ini sudah diputuskan", Status: 409})
	case errors.Is(err, service.ErrStatusSama):
		tulisProblem(w, Problem{Type: "/problems/status-sama", Title: "Akun sudah berstatus seperti itu", Status: 409})
	case errors.Is(err, service.ErrBerkasRusak):
		tulisProblem(w, Problem{Type: "/problems/berkas-rusak", Title: "Berkas tidak lolos pemeriksaan checksum", Status: 500})
	case errors.Is(err, service.ErrBerkasDihapus):
		tulisProblem(w, Problem{Type: "/problems/berkas-dihapus", Title: "Berkas sudah dihapus menurut masa simpan", Status: 410})
	case errors.Is(err, service.ErrObjekTidakDipasang), errors.Is(err, service.ErrFlagTidakDipasang):
		tulisProblem(w, Problem{Type: "/problems/tidak-dipasang", Title: "Komponen ini tidak dipasang di server ini", Status: 503})
	case errors.Is(err, objek.ErrTidakAda):
		tidakDitemukan(w, "Berkas")
	default:
		s.petaError(w, err, dilarang)
	}
}

func (s Server) boLihatAkun(w http.ResponseWriter, r *http.Request) {
	id, ok := idDariPath(r)
	if !ok {
		tidakDitemukan(w, "Akun")
		return
	}
	a, err := s.svc.LihatAkunBO(r.Context(), peminta(r), id)
	if errors.Is(err, service.ErrTidakDitemukan) {
		tidakDitemukan(w, "Akun")
		return
	}
	if err != nil {
		s.petaBO(w, err, dilaranganBO)
		return
	}
	tulisJSON(w, 200, a)
}

func (s Server) boLihatVerifikasi(w http.ResponseWriter, r *http.Request) {
	id, ok := idDariPath(r)
	if !ok {
		tidakDitemukan(w, "Verifikasi")
		return
	}
	v, err := s.svc.LihatVerifikasiBO(r.Context(), peminta(r), id)
	if errors.Is(err, service.ErrTidakDitemukan) {
		tidakDitemukan(w, "Verifikasi")
		return
	}
	if err != nil {
		s.petaBO(w, err, dilaranganBO)
		return
	}
	tulisJSON(w, 200, v)
}

// GET /bo/verifikasi/{id}/berkas/{kartu|swafoto}?alasan=...: isi file identitas. Alasan tertulis wajib dan baris audit
// ditulis sebelum isi dikirim. Isi tidak boleh disimpan cache atau ditafsirkan peramban.
func (s Server) boBerkas(w http.ResponseWriter, r *http.Request) {
	id, ok := idDariPath(r)
	if !ok {
		tidakDitemukan(w, "Berkas")
		return
	}
	isi, err := s.svc.BukaBerkas(r.Context(), peminta(r), id, r.PathValue("bagian"), r.URL.Query().Get("alasan"))
	if errors.Is(err, service.ErrTidakDitemukan) {
		tidakDitemukan(w, "Berkas")
		return
	}
	if err != nil {
		s.petaBO(w, err, dilaranganBO)
		return
	}
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", `attachment; filename="berkas-`+strconv.FormatInt(id, 10)+`.bin"`)
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Content-Length", strconv.Itoa(len(isi)))
	w.WriteHeader(200)
	w.Write(isi)
}

// alasanBO membaca body {alasan}; false bila sudah menulis jawaban.
func alasanBO(w http.ResponseWriter, r *http.Request) (string, bool) {
	var in struct {
		Alasan *string `json:"alasan"`
	}
	if !baca(w, r, &in) {
		return "", false
	}
	if p := wajibAda([]string{"alasan"}, in.Alasan != nil); p != nil {
		tulisProblem(w, *p)
		return "", false
	}
	return *in.Alasan, true
}

func (s Server) boBekukan(w http.ResponseWriter, r *http.Request) {
	id, ok := idDariPath(r)
	if !ok {
		tidakDitemukan(w, "Akun")
		return
	}
	alasan, ok := alasanBO(w, r)
	if !ok {
		return
	}
	if err := s.svc.BekukanBO(r.Context(), peminta(r), id, alasan); err != nil {
		if errors.Is(err, service.ErrTidakDitemukan) {
			tidakDitemukan(w, "Akun")
			return
		}
		s.petaBO(w, err, dilaranganBO)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s Server) boBuka(w http.ResponseWriter, r *http.Request) {
	id, ok := idDariPath(r)
	if !ok {
		tidakDitemukan(w, "Akun")
		return
	}
	alasan, ok := alasanBO(w, r)
	if !ok {
		return
	}
	if err := s.svc.BukaBlokirBO(r.Context(), peminta(r), id, alasan, r.Header.Get("X-Penyetuju-Token")); err != nil {
		if errors.Is(err, service.ErrTidakDitemukan) {
			tidakDitemukan(w, "Akun")
			return
		}
		s.petaBO(w, err, dilaranganBO)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s Server) boBatasHarian(w http.ResponseWriter, r *http.Request) {
	id, ok := idDariPath(r)
	if !ok {
		tidakDitemukan(w, "Akun")
		return
	}
	var in struct {
		Nilai  *int64  `json:"nilai"`
		Alasan *string `json:"alasan"`
	}
	if !baca(w, r, &in) {
		return
	}
	if p := wajibAda([]string{"nilai", "alasan"}, in.Nilai != nil, in.Alasan != nil); p != nil {
		tulisProblem(w, *p)
		return
	}
	if err := s.svc.UbahBatasHarianBO(r.Context(), peminta(r), id, *in.Nilai, *in.Alasan, r.Header.Get("X-Penyetuju-Token")); err != nil {
		if errors.Is(err, service.ErrTidakDitemukan) {
			tidakDitemukan(w, "Akun")
			return
		}
		s.petaBO(w, err, dilaranganBO)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s Server) boSetujuiMerchant(w http.ResponseWriter, r *http.Request) { s.boPutuskan(w, r, true) }
func (s Server) boTolakMerchant(w http.ResponseWriter, r *http.Request)   { s.boPutuskan(w, r, false) }

func (s Server) boPutuskan(w http.ResponseWriter, r *http.Request, lulus bool) {
	id, ok := idDariPath(r)
	if !ok {
		tidakDitemukan(w, "Merchant")
		return
	}
	alasan, ok := alasanBO(w, r)
	if !ok {
		return
	}
	var err error
	if lulus {
		err = s.svc.SetujuiMerchantBO(r.Context(), peminta(r), id, alasan)
	} else {
		err = s.svc.TolakMerchantBO(r.Context(), peminta(r), id, alasan)
	}
	if errors.Is(err, service.ErrTidakDitemukan) {
		tidakDitemukan(w, "Pengajuan merchant")
		return
	}
	if err != nil {
		s.petaBO(w, err, dilaranganBO)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s Server) boFlagKartu(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Aktif  *bool   `json:"aktif"`
		Alasan *string `json:"alasan"`
	}
	if !baca(w, r, &in) {
		return
	}
	if p := wajibAda([]string{"aktif", "alasan"}, in.Aktif != nil, in.Alasan != nil); p != nil {
		tulisProblem(w, *p)
		return
	}
	if err := s.svc.SetKartuAktifBO(r.Context(), peminta(r), *in.Aktif, *in.Alasan); err != nil {
		s.petaBO(w, err, dilaranganBO)
		return
	}
	tulisJSON(w, 200, map[string]bool{"aktif": *in.Aktif})
}

// GET /bo/audit/verifikasi: 200 untuk rantai utuh maupun putus; yang putus menyebut baris pertama yang rusak.
func (s Server) boAuditVerifikasi(w http.ResponseWriter, r *http.Request) {
	h, err := s.svc.VerifikasiAuditBO(r.Context(), peminta(r))
	if err != nil {
		s.petaBO(w, err, dilaranganBO)
		return
	}
	out := map[string]any{"baris": h.Baris, "hash_terakhir": h.HashTerakhir, "utuh": h.RusakDiID == 0}
	if h.RusakDiID != 0 {
		out["rusak_di_id"] = h.RusakDiID
	}
	tulisJSON(w, 200, out)
}

// MaksBodyImpor: 50 baris dengan URL sampai 2.048 karakter muat dalam 256 KiB.
const MaksBodyImpor = 256 << 10

// POST /merchant/katalog/impor: produk dengan URL gambar; server mengunduh gambar untuk pratinjau (M36, ADR 41).
func (s Server) imporKatalog(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Produk []struct {
			Nama      *string `json:"nama"`
			Harga     *int64  `json:"harga"`
			Stok      *int    `json:"stok"`
			GambarURL string  `json:"gambar_url"`
		} `json:"produk"`
	}
	r.Body = http.MaxBytesReader(w, r.Body, MaksBodyImpor)
	if p := bacaJSON(r.Body, &in); p != nil {
		tulisProblem(w, *p)
		return
	}
	baris := make([]service.BarisImpor, len(in.Produk))
	for i, b := range in.Produk {
		pre := "produk[" + strconv.Itoa(i) + "]."
		if p := wajibAda([]string{pre + "nama", pre + "harga", pre + "stok"}, b.Nama != nil, b.Harga != nil, b.Stok != nil); p != nil {
			tulisProblem(w, *p)
			return
		}
		baris[i] = service.BarisImpor{Nama: *b.Nama, Harga: *b.Harga, Stok: *b.Stok, GambarURL: b.GambarURL}
	}
	hasil, err := s.svc.ImporKatalog(r.Context(), peminta(r), baris)
	if err != nil {
		s.petaBO(w, err, "Hanya merchant yang sudah terverifikasi yang boleh mengimpor katalog")
		return
	}
	tulisJSON(w, 200, map[string]any{"hasil": hasil})
}
