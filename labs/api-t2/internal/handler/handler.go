// Package handler adalah lapisan HTTP: parsing JSON, sesi, status code, format error. Tidak ada aturan uang di sini.
package handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"lab/apit2/internal/service"
)

type Server struct {
	svc    service.Service
	rentan string // mode rentan lab (flag -rentan); kosong = versi benar
}

func Baru(svc service.Service) Server { return Server{svc: svc} }

// DenganRentan menyalakan satu mode rentan untuk rekaman halaman masalah (keputusan 148).
func (s Server) DenganRentan(mode string) Server { s.rentan = mode; return s }

// --8<-- [start:rute]
func (s Server) Rute() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /login", s.login)
	mux.HandleFunc("POST /logout", s.wajibLogin(s.logout))
	mux.HandleFunc("GET /akun/{id}", s.wajibLogin(s.lihatAkun))
	mux.HandleFunc("POST /topup", s.wajibLogin(s.topup))
	mux.HandleFunc("POST /koreksi", s.wajibLogin(s.koreksi))
	mux.HandleFunc("POST /transfers", s.wajibLogin(s.bayar))
	mux.HandleFunc("GET /transfers/{id}", s.wajibLogin(s.lihatTransaksi))
	mux.HandleFunc("GET /akun/{id}/riwayat", s.wajibLogin(s.riwayat))
	mux.HandleFunc("GET /warung", s.wajibLogin(s.cariWarung))
	mux.HandleFunc("GET /warung/{id}/laporan", s.wajibLogin(s.laporan))
	return mux
}

// --8<-- [end:rute]

// Problem adalah format error RFC 9457 (application/problem+json).
// --8<-- [start:problem]
// Problem adalah format error RFC 9457 (application/problem+json), sama untuk semua endpoint.
type Problem struct {
	Type   string `json:"type"`
	Title  string `json:"title"`
	Status int    `json:"status"`
	Detail string `json:"detail,omitempty"`
	// Errors adalah extension member (RFC 9457 bagian 3.2): daftar baris atau field yang salah.
	Errors any `json:"errors,omitempty"`
}

func tulisProblem(w http.ResponseWriter, p Problem) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(p.Status)
	json.NewEncoder(w).Encode(p)
}

func tulisJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// --8<-- [start:baca-json]
// bacaJSON membaca body sesuai kontrak (ADR 3). Tipe yang salah dijawab 400 dengan nama field-nya;
// field yang tidak dikenal dibiarkan, supaya app versi baru tidak ditolak server lama.
func bacaJSON(body io.Reader, v any) *Problem {
	err := json.NewDecoder(body).Decode(v)
	var errTipe *json.UnmarshalTypeError
	switch {
	case err == nil:
		return nil
	case errors.As(err, &errTipe):
		return &Problem{Type: "/problems/tipe-salah", Title: "Tipe field tidak sesuai kontrak", Status: 400,
			Errors: []map[string]string{{"field": errTipe.Field, "pesan": errTipe.Value + " bukan " + errTipe.Type.String()}}}
	default:
		return &Problem{Type: "/problems/json-rusak", Title: "Body bukan JSON yang valid", Status: 400}
	}
}

// wajibAda: field wajib yang tidak dikirim dijawab 400 dengan namanya, bukan dianggap 0.
func wajibAda(nama []string, ada ...bool) *Problem {
	var hilang []map[string]string
	for i, ok := range ada {
		if !ok {
			hilang = append(hilang, map[string]string{"field": nama[i], "pesan": "wajib diisi"})
		}
	}
	if hilang == nil {
		return nil
	}
	return &Problem{Type: "/problems/field-wajib", Title: "Field wajib tidak dikirim", Status: 400, Errors: hilang}
}

// --8<-- [end:baca-json]

func (s Server) errorInternal(w http.ResponseWriter, err error) {
	log.Printf("error internal: %v", err)
	tulisProblem(w, Problem{Type: "/problems/internal", Title: "Terjadi kesalahan di server", Status: 500})
}

// --8<-- [end:problem]

// --8<-- [start:login]
func (s Server) login(w http.ResponseWriter, r *http.Request) {
	var in struct{ Email, Password string }
	if json.NewDecoder(r.Body).Decode(&in) != nil || in.Email == "" || in.Password == "" {
		tulisProblem(w, Problem{Type: "/problems/json-rusak", Title: "Body harus JSON berisi email dan password", Status: 400})
		return
	}
	token, sampai, err := s.svc.Login(r.Context(), in.Email, in.Password)
	if errors.Is(err, service.ErrLoginGagal) {
		// Pesan sama untuk "email tidak terdaftar" dan "password salah": jangan bantu penebak.
		tulisProblem(w, Problem{Type: "/problems/login-gagal", Title: "Email atau password salah", Status: 401})
		return
	}
	if err != nil {
		s.errorInternal(w, err)
		return
	}
	tulisJSON(w, 200, map[string]any{"token": token, "kedaluwarsa_detik": int(time.Until(sampai).Round(time.Second).Seconds())})
}

// --8<-- [end:login]

type kunciPeminta struct{}

// --8<-- [start:wajib-login]
// wajibLogin: setiap endpoint di belakangnya butuh sesi yang masih aktif.
func (s Server) wajibLogin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token, ada := tokenBearer(r)
		akunID, err := s.svc.Periksa(r.Context(), token)
		if !ada || errors.Is(err, service.ErrSesiTidakSah) {
			// RFC 6750 §3.1: request tanpa token Bearer tidak diberi kode error.
			// invalid_token hanya untuk token yang dikirim tapi tidak dikenal atau sesinya berakhir.
			tantangan := `Bearer`
			if ada {
				tantangan = `Bearer error="invalid_token"`
			}
			w.Header().Set("WWW-Authenticate", tantangan)
			tulisProblem(w, Problem{Type: "/problems/belum-login", Title: "Belum login atau sesi sudah berakhir", Status: 401})
			return
		}
		if err != nil {
			s.errorInternal(w, err)
			return
		}
		next(w, r.WithContext(context.WithValue(r.Context(), kunciPeminta{}, akunID)))
	}
}

// tokenBearer membaca token dari header Authorization. Nama skema tidak peka huruf
// (RFC 9110 §11.1), jadi "bearer" dan "BEARER" diterima sama dengan "Bearer".
func tokenBearer(r *http.Request) (string, bool) {
	skema, token, ada := strings.Cut(r.Header.Get("Authorization"), " ")
	if !ada || !strings.EqualFold(skema, "Bearer") {
		return "", false
	}
	return token, true
}

// --8<-- [end:wajib-login]

func peminta(r *http.Request) int64 { return r.Context().Value(kunciPeminta{}).(int64) }

func (s Server) logout(w http.ResponseWriter, r *http.Request) {
	token, _ := tokenBearer(r)
	if err := s.svc.Logout(r.Context(), token); err != nil {
		s.errorInternal(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s Server) lihatAkun(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		tulisProblem(w, Problem{Type: "/problems/tidak-ditemukan", Title: "Akun tidak ditemukan", Status: 404})
		return
	}
	lihat := s.svc.LihatAkun
	if s.rentan == "m5" {
		lihat = s.svc.LihatAkunM5
	}
	a, err := lihat(r.Context(), peminta(r), id)
	if errors.Is(err, service.ErrTidakDitemukan) {
		tulisProblem(w, Problem{Type: "/problems/tidak-ditemukan", Title: "Akun tidak ditemukan", Status: 404})
		return
	}
	if err != nil {
		s.errorInternal(w, err)
		return
	}
	tulisJSON(w, 200, a)
}

// GET /transfers/{id}: alamat yang dikirim di header Location setelah 201.
func (s Server) lihatTransaksi(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		tulisProblem(w, Problem{Type: "/problems/tidak-ditemukan", Title: "Transaksi tidak ditemukan", Status: 404})
		return
	}
	t, err := s.svc.LihatTransaksi(r.Context(), peminta(r), id)
	if errors.Is(err, service.ErrTidakDitemukan) {
		tulisProblem(w, Problem{Type: "/problems/tidak-ditemukan", Title: "Transaksi tidak ditemukan", Status: 404})
		return
	}
	if err != nil {
		s.errorInternal(w, err)
		return
	}
	tulisJSON(w, 200, t)
}

// --8<-- [start:cari-warung]
// GET /warung?cari=<teks>: cari warung menurut nama. Versi benar; mode rentan m3 di rentan.go.
func (s Server) cariWarung(w http.ResponseWriter, r *http.Request) {
	cari := r.URL.Query().Get("cari")
	if s.rentan == "m3" {
		s.cariWarungM3(w, r, cari)
		return
	}
	hasil, err := s.svc.CariWarung(r.Context(), cari)
	if err != nil {
		s.errorInternal(w, err)
		return
	}
	tulisJSON(w, 200, map[string]any{"warung": hasil})
}

// --8<-- [end:cari-warung]

// --8<-- [start:topup]
// POST /topup?keterangan=...  body text/csv: email,nominal
func (s Server) topup(w http.ResponseWriter, r *http.Request) {
	isi, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		tulisProblem(w, Problem{Type: "/problems/body-rusak", Title: "Body tidak terbaca", Status: 400})
		return
	}
	akun, total, err := s.svc.Topup(r.Context(), peminta(r), r.URL.Query().Get("keterangan"), string(isi))
	var errCSV service.ErrCSV
	switch {
	case errors.Is(err, service.ErrDilarang):
		tulisProblem(w, Problem{Type: "/problems/dilarang", Title: "Hanya admin tunjangan yang boleh top-up", Status: 403})
	case errors.As(err, &errCSV):
		tulisProblem(w, Problem{Type: "/problems/csv-ditolak", Title: "CSV ditolak; tidak ada saldo yang berubah",
			Status: 422, Errors: errCSV.Kesalahan})
	case err != nil:
		s.errorInternal(w, err)
	default:
		tulisJSON(w, 200, map[string]any{"akun": akun, "total": total})
	}
}

// --8<-- [end:topup]

// --8<-- [start:koreksi]
// POST /koreksi  body JSON: akun, jumlah, alasan (ADR 6)
func (s Server) koreksi(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Akun   *int64  `json:"akun"`
		Jumlah *int64  `json:"jumlah"`
		Alasan *string `json:"alasan"`
	}
	if p := bacaJSON(r.Body, &in); p != nil {
		tulisProblem(w, *p)
		return
	}
	if p := wajibAda([]string{"akun", "jumlah", "alasan"}, in.Akun != nil, in.Jumlah != nil, in.Alasan != nil); p != nil {
		tulisProblem(w, *p)
		return
	}
	id, saldo, err := s.svc.Koreksi(r.Context(), peminta(r), *in.Akun, *in.Jumlah, *in.Alasan)
	var errV service.ErrValidasi
	switch {
	case errors.Is(err, service.ErrDilarang):
		tulisProblem(w, Problem{Type: "/problems/dilarang", Title: "Hanya admin tunjangan yang boleh mengoreksi saldo", Status: 403})
	case errors.As(err, &errV):
		tulisProblem(w, Problem{Type: "/problems/validasi", Title: "Input tidak memenuhi aturan", Status: 422,
			Errors: []map[string]string{{"field": errV.Field, "pesan": errV.Pesan}}})
	case err != nil:
		s.errorInternal(w, err)
	default:
		tulisJSON(w, 201, map[string]int64{"id": id, "saldo": saldo})
	}
}

// --8<-- [end:koreksi]

// --8<-- [start:bayar]
func (s Server) bayar(w http.ResponseWriter, r *http.Request) {
	if s.rentan == "m2" {
		s.bayarM2(w, r)
		return
	}
	// Pointer: field yang tidak dikirim berbeda dari field yang dikirim 0 (ADR 3).
	var in struct {
		Ke      *int64 `json:"ke"`
		Jumlah  *int64 `json:"jumlah"`
		Nominal *int64 `json:"nominal"`
	}
	if p := bacaJSON(r.Body, &in); p != nil {
		tulisProblem(w, *p)
		return
	}
	if in.Jumlah == nil {
		in.Jumlah = in.Nominal
	}
	if p := wajibAda([]string{"ke", "jumlah"}, in.Ke != nil, in.Jumlah != nil); p != nil {
		tulisProblem(w, *p)
		return
	}
	s.selesaikanBayar(w, r, *in.Ke, *in.Jumlah)
}

// selesaikanBayar memanggil service dan memetakan hasilnya ke status code.
func (s Server) selesaikanBayar(w http.ResponseWriter, r *http.Request, ke, jumlah int64) {
	bayar := s.svc.Bayar
	if s.rentan == "m1" {
		bayar = s.svc.BayarM1
	}
	if s.rentan == "m4" {
		bayar = s.svc.BayarM4
	}
	id, saldo, err := bayar(r.Context(), peminta(r), ke, jumlah)
	var errV service.ErrValidasi
	switch {
	case errors.As(err, &errV):
		tulisProblem(w, Problem{Type: "/problems/validasi", Title: "Input tidak memenuhi aturan", Status: 422,
			Errors: []map[string]string{{"field": errV.Field, "pesan": errV.Pesan}}})
	case errors.Is(err, service.ErrSaldoKurang):
		tulisProblem(w, Problem{Type: "/problems/saldo-kurang", Title: "Saldo tidak cukup", Status: 422})
	case err != nil:
		s.errorInternal(w, err)
	default:
		w.Header().Set("Location", fmt.Sprintf("/transfers/%d", id))
		tulisJSON(w, 201, map[string]int64{"id": id, "saldo": saldo})
	}
}

// --8<-- [end:bayar]

func (s Server) riwayat(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	daftar, err := s.svc.Riwayat(r.Context(), peminta(r), id)
	if errors.Is(err, service.ErrTidakDitemukan) {
		tulisProblem(w, Problem{Type: "/problems/tidak-ditemukan", Title: "Akun tidak ditemukan", Status: 404})
		return
	}
	if err != nil {
		s.errorInternal(w, err)
		return
	}
	tulisJSON(w, 200, map[string]any{"riwayat": daftar})
}

func (s Server) laporan(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	q := r.URL.Query()
	baris, err := s.svc.Laporan(r.Context(), peminta(r), id, q.Get("dari"), q.Get("sampai"))
	var errV service.ErrValidasi
	switch {
	case errors.Is(err, service.ErrTidakDitemukan):
		tulisProblem(w, Problem{Type: "/problems/tidak-ditemukan", Title: "Warung tidak ditemukan", Status: 404})
	case errors.As(err, &errV):
		tulisProblem(w, Problem{Type: "/problems/validasi", Title: "Input tidak memenuhi aturan", Status: 422,
			Errors: []map[string]string{{"field": errV.Field, "pesan": errV.Pesan}}})
	case err != nil:
		s.errorInternal(w, err)
	default:
		tulisJSON(w, 200, map[string]any{"warung": id, "per_hari": baris})
	}
}
