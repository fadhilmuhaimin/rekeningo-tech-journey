package handler

import (
	"errors"
	"fmt"
	"io"
	"net/http"

	"lab/apit4/internal/service"
)

// Endpoint Tahap 4 untuk pendaftaran, top-up dari bank, webhook gateway, dan verifikasi identitas (naskah 3, 3b).
// Aturan uang ada di service; handler hanya mengurai, memetakan status code, dan memasang batas laju per alamat.

const (
	// MaksWebhook: body webhook paling besar 64 KB. Isi kabar gateway puluhan byte.
	MaksWebhook = 64 << 10
	// MaksBodyVerifikasi: dua file 1 MiB dalam base64 (4/3) ditambah JSON.
	MaksBodyVerifikasi = 3 << 20
)

func (s Server) pasangPembayaran(mux *http.ServeMux) {
	mux.HandleFunc("POST /daftar", s.daftar)
	mux.HandleFunc("POST /topup-bank", s.wajibLogin(s.buatTopupBank))
	mux.HandleFunc("GET /topup-bank/{id}", s.wajibLogin(s.lihatTopupBank))
	mux.HandleFunc("POST /webhooks/pembayaran", s.webhookPembayaran)
	mux.HandleFunc("POST /verifikasi", s.wajibLogin(s.ajukanVerifikasi))
	mux.HandleFunc("GET /verifikasi/{id}", s.wajibLogin(s.lihatVerifikasi))
}

// batasAlamat memasang batas laju per alamat (service.AmbangEndpointIP) untuk satu endpoint. False: 429 sudah ditulis.
func (s Server) batasAlamat(w http.ResponseWriter, r *http.Request, nama string) bool {
	if err := s.svc.BatasAlamat(nama, clientIP(r)); err != nil {
		var l service.ErrTerlaluSering
		if errors.As(err, &l) {
			terlaluSering(w, l, "Terlalu banyak permintaan dari alamat ini")
			return false
		}
		s.errorInternal(w, err)
		return false
	}
	return true
}

// batasAkun membungkus handler dengan batas laju per akun untuk endpoint yang belum punya (ambang di
// service.AmbangEndpoint). Dipasang sesudah wajibLogin, sebelum idempoten: kiriman ulang dengan key yang sama tetap
// memakai satu token, sama seperti permintaan baru.
func (s Server) batasAkun(nama string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := s.svc.BatasAkun(nama, peminta(r)); err != nil {
			var l service.ErrTerlaluSering
			if errors.As(err, &l) {
				terlaluSering(w, l, "Terlalu banyak permintaan dari akun ini")
				return
			}
			s.errorInternal(w, err)
			return
		}
		next(w, r)
	}
}

// petaPembayaran memetakan error Tahap 4 ke status; false bila errornya bukan milik kelompok ini.
func (s Server) petaPembayaran(w http.ResponseWriter, err error) bool {
	var lambat service.ErrTerlaluSering
	switch {
	case errors.As(err, &lambat):
		terlaluSering(w, lambat, "Terlalu banyak permintaan dari akun ini")
	case errors.Is(err, service.ErrDibekukan):
		tulisProblem(w, Problem{Type: "/problems/akun-dibekukan", Title: "Akun dibekukan", Status: 403,
			Detail: "Hubungi tim risk lewat layanan pelanggan."})
	case errors.Is(err, service.ErrButuhVerifikasi):
		tulisProblem(w, Problem{Type: "/problems/butuh-verifikasi", Title: "Fitur ini butuh akun terverifikasi", Status: 403,
			Detail: "Ajukan verifikasi identitas lewat POST /verifikasi."})
	case errors.Is(err, service.ErrBatasTingkat):
		tulisProblem(w, Problem{Type: "/problems/batas-saldo-tingkat", Title: "Saldo akan melewati batas tingkat akun", Status: 422,
			Detail: "Saldo paling banyak Rp1.000.000 untuk akun belum terverifikasi dan Rp10.000.000 untuk akun terverifikasi."})
	case errors.Is(err, service.ErrEmailTerpakai):
		tulisProblem(w, Problem{Type: "/problems/email-terpakai", Title: "Email sudah terdaftar", Status: 409})
	case errors.Is(err, service.ErrSudahTerverifikasi):
		tulisProblem(w, Problem{Type: "/problems/sudah-terverifikasi", Title: "Akun sudah terverifikasi", Status: 409})
	case errors.Is(err, service.ErrVerifikasiBerjalan):
		tulisProblem(w, Problem{Type: "/problems/verifikasi-berjalan", Title: "Pengajuan sebelumnya belum selesai", Status: 409})
	case errors.Is(err, service.ErrGatewayTidakAda), errors.Is(err, service.ErrLayananTidakAda):
		tulisProblem(w, Problem{Type: "/problems/layanan-tidak-tersedia", Title: "Layanan pendukung tidak tersedia", Status: 503})
	default:
		return false
	}
	return true
}

func (s Server) petaTopup(w http.ResponseWriter, err error, dilarang string) {
	if !s.petaPembayaran(w, err) {
		s.petaError(w, err, dilarang)
	}
}

// POST /daftar: pendaftaran sendiri. Alamat dibatasi 5 pendaftaran per jam (Asumsi lab).
func (s Server) daftar(w http.ResponseWriter, r *http.Request) {
	if !s.batasAlamat(w, r, "daftar") {
		return
	}
	var in struct {
		Jenis    string  `json:"jenis"`
		Nama     *string `json:"nama"`
		Email    *string `json:"email"`
		Password *string `json:"password"`
	}
	r.Body = http.MaxBytesReader(w, r.Body, 4096)
	if p := bacaJSON(r.Body, &in); p != nil {
		tulisProblem(w, *p)
		return
	}
	if p := wajibAda([]string{"nama", "email", "password"}, in.Nama != nil, in.Email != nil, in.Password != nil); p != nil {
		tulisProblem(w, *p)
		return
	}
	id, err := s.svc.Daftar(r.Context(), in.Jenis, *in.Nama, *in.Email, *in.Password)
	if err != nil {
		s.petaTopup(w, err, "")
		return
	}
	jenis := in.Jenis
	if jenis == "" {
		jenis = "pemakai"
	}
	w.Header().Set("Location", fmt.Sprintf("/akun/%d", id))
	tulisJSON(w, 201, map[string]any{"id": id, "jenis": jenis, "tingkat": "belum"})
}

// POST /topup-bank: 201 dengan tujuan bayar; 202 bila gateway tidak menjawab (status tidak_pasti); 502 bila gateway
// menolak atau tidak terjangkau (status gagal).
func (s Server) buatTopupBank(w http.ResponseWriter, r *http.Request) {
	if !s.batasAlamat(w, r, "topup-bank") {
		return
	}
	var in struct {
		Jumlah *int64 `json:"jumlah"`
	}
	if !baca(w, r, &in) {
		return
	}
	if p := wajibAda([]string{"jumlah"}, in.Jumlah != nil); p != nil {
		tulisProblem(w, *p)
		return
	}
	t, err := s.svc.BuatTopupBank(r.Context(), peminta(r), *in.Jumlah)
	switch {
	case errors.Is(err, service.ErrGatewayDitolak):
		tulisProblem(w, Problem{Type: "/problems/gateway-tidak-tersedia", Title: "Gateway tidak tersedia; top-up tidak dibuat", Status: 502,
			Detail: fmt.Sprintf("Top-up %d tercatat gagal. Coba lagi nanti; pembayaran dan transfer tidak terpengaruh.", t.ID)})
		return
	case err != nil:
		s.petaTopup(w, err, "Hanya karyawan dan pemakai yang boleh top-up dari bank")
		return
	}
	w.Header().Set("Location", fmt.Sprintf("/topup-bank/%d", t.ID))
	status := 201
	if t.Status == "tidak_pasti" {
		status = 202
	}
	tulisJSON(w, status, t)
}

func (s Server) lihatTopupBank(w http.ResponseWriter, r *http.Request) {
	id, ok := idDariPath(r)
	if !ok {
		tidakDitemukan(w, "Top-up")
		return
	}
	t, err := s.svc.LihatTopupBank(r.Context(), peminta(r), id)
	if errors.Is(err, service.ErrTidakDitemukan) {
		tidakDitemukan(w, "Top-up")
		return
	}
	if err != nil {
		s.errorInternal(w, err)
		return
	}
	tulisJSON(w, 200, t)
}

// --8<-- [start:webhook]
// POST /webhooks/pembayaran: kabar dari gateway (klaim, bukan fakta; ADR 34). Tanpa login; yang membuktikan
// asalnya adalah tanda tangan atas byte mentah. Balasan 2xx hanya sesudah COMMIT: yang gagal (5xx) diulang gateway
// menurut jadwalnya. Tanda tangan yang salah dan timestamp yang kedaluwarsa dijawab sama: 401.
func (s Server) webhookPembayaran(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, MaksWebhook))
	if err != nil {
		tulisProblem(w, Problem{Type: "/problems/body-rusak", Title: "Body tidak terbaca atau terlalu besar", Status: 400})
		return
	}
	h, err := s.svc.TerimaWebhook(r.Context(), body, r.Header.Get("X-Gateway-Timestamp"), r.Header.Get("X-Gateway-Signature"))
	var errV service.ErrValidasi
	switch {
	case err == nil:
		tulisJSON(w, 200, h)
	case errors.Is(err, service.ErrTandaTangan):
		tulisProblem(w, Problem{Type: "/problems/tanda-tangan", Title: "Tanda tangan webhook tidak sah", Status: 401})
	case errors.As(err, &errV):
		tulisProblem(w, Problem{Type: "/problems/validasi", Title: "Kabar tidak memenuhi aturan", Status: 400,
			Errors: []map[string]string{{"field": errV.Field, "pesan": errV.Pesan}}})
	case errors.Is(err, service.ErrTidakDitemukan):
		tidakDitemukan(w, "Order")
	default:
		s.errorInternal(w, err)
	}
}

// --8<-- [end:webhook]

// POST /verifikasi: dua file (JSON, base64): berkas_kartu dan berkas_swafoto. 202: diterima, hasil menyusul lewat
// GET /verifikasi/{id}.
func (s Server) ajukanVerifikasi(w http.ResponseWriter, r *http.Request) {
	if !s.batasAlamat(w, r, "verifikasi") {
		return
	}
	var in struct {
		Kartu   []byte `json:"berkas_kartu"`
		Swafoto []byte `json:"berkas_swafoto"`
	}
	r.Body = http.MaxBytesReader(w, r.Body, MaksBodyVerifikasi)
	if p := bacaJSON(r.Body, &in); p != nil {
		tulisProblem(w, *p)
		return
	}
	v, err := s.svc.AjukanVerifikasi(r.Context(), peminta(r), in.Kartu, in.Swafoto)
	if err != nil {
		s.petaTopup(w, err, "Hanya pemakai dan merchant yang mengajukan verifikasi")
		return
	}
	w.Header().Set("Location", fmt.Sprintf("/verifikasi/%d", v.ID))
	tulisJSON(w, 202, v)
}

func (s Server) lihatVerifikasi(w http.ResponseWriter, r *http.Request) {
	id, ok := idDariPath(r)
	if !ok {
		tidakDitemukan(w, "Verifikasi")
		return
	}
	v, err := s.svc.LihatVerifikasi(r.Context(), peminta(r), id)
	if errors.Is(err, service.ErrTidakDitemukan) {
		tidakDitemukan(w, "Verifikasi")
		return
	}
	if err != nil {
		s.errorInternal(w, err)
		return
	}
	tulisJSON(w, 200, v)
}
