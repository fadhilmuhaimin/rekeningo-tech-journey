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

// DenganRentan menyalakan satu mode rentan untuk rekaman halaman masalah (keputusan 148). Tahap 2 belum punya
// mode; lab masalah M9 sampai M16 menambahkannya di sini dan di cmd/api/main.go.
func (s Server) DenganRentan(mode string) Server { s.rentan = mode; return s }

// --8<-- [start:rute]
// Rute Tahap 2. Endpoint Tahap 1 tetap dengan kontrak yang sama (app 1.0 dan 1.1); yang baru: /kiriman,
// kursor di riwayat, /jurnal/{id}/pembalik, /tutup-buku. /koreksi diganti jurnal pembalik (410).
func (s Server) Rute() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /login", s.login)
	mux.HandleFunc("POST /logout", s.wajibLogin(s.logout))
	mux.HandleFunc("GET /akun/{id}", s.wajibLogin(s.lihatAkun))
	mux.HandleFunc("POST /topup", s.wajibLogin(s.topup))
	mux.HandleFunc("POST /koreksi", s.wajibLogin(s.koreksi))
	mux.HandleFunc("POST /transfers", s.wajibLogin(s.bayar))
	mux.HandleFunc("GET /transfers/{id}", s.wajibLogin(s.lihatTransaksi))
	mux.HandleFunc("POST /kiriman", s.wajibLogin(s.kirim))
	mux.HandleFunc("GET /akun/{id}/riwayat", s.wajibLogin(s.riwayat))
	mux.HandleFunc("GET /warung", s.wajibLogin(s.cariWarung))
	mux.HandleFunc("GET /warung/{id}/laporan", s.wajibLogin(s.laporan))
	mux.HandleFunc("POST /jurnal/{id}/pembalik", s.wajibLogin(s.pembalik))
	mux.HandleFunc("GET /tutup-buku", s.wajibLogin(s.tutupBuku))
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

// tidakDitemukan: satu bentuk 404 untuk semua sumber daya (akun, transaksi, warung, jurnal).
func tidakDitemukan(w http.ResponseWriter, apa string) {
	tulisProblem(w, Problem{Type: "/problems/tidak-ditemukan", Title: apa + " tidak ditemukan", Status: 404})
}

// --8<-- [start:peta-error]
// petaError memetakan error aturan uang dari service ke status code. Error lain jadi 500.
func (s Server) petaError(w http.ResponseWriter, err error, dilarang string) {
	var errV service.ErrValidasi
	var errCSV service.ErrCSV
	switch {
	case errors.As(err, &errV):
		tulisProblem(w, Problem{Type: "/problems/validasi", Title: "Input tidak memenuhi aturan", Status: 422,
			Errors: []map[string]string{{"field": errV.Field, "pesan": errV.Pesan}}})
	case errors.As(err, &errCSV):
		tulisProblem(w, Problem{Type: "/problems/csv-ditolak", Title: "CSV ditolak; tidak ada saldo yang berubah",
			Status: 422, Errors: errCSV.Kesalahan})
	case errors.Is(err, service.ErrSaldoKurang):
		tulisProblem(w, Problem{Type: "/problems/saldo-kurang", Title: "Saldo tidak cukup", Status: 422})
	case errors.Is(err, service.ErrBatasHarian):
		tulisProblem(w, Problem{Type: "/problems/batas-harian", Title: "Batas kiriman hari ini terlewati", Status: 422,
			Detail: "Kiriman ke rekan paling banyak Rp500.000 per hari, dihitung sejak pukul 00.00 WIB."})
	case errors.Is(err, service.ErrBatasWarung):
		tulisProblem(w, Problem{Type: "/problems/batas-warung", Title: "Saldo warung melewati batas", Status: 422})
	case errors.Is(err, service.ErrSudahDibalik):
		tulisProblem(w, Problem{Type: "/problems/sudah-dibalik", Title: "Jurnal ini sudah pernah dibalik", Status: 409})
	case errors.Is(err, service.ErrDilarang):
		tulisProblem(w, Problem{Type: "/problems/dilarang", Title: dilarang, Status: 403})
	case errors.Is(err, service.ErrTidakDitemukan):
		tidakDitemukan(w, "Data")
	default:
		s.errorInternal(w, err)
	}
}

// --8<-- [end:peta-error]

func idDariPath(r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	return id, err == nil
}

func (s Server) lihatAkun(w http.ResponseWriter, r *http.Request) {
	id, ok := idDariPath(r)
	if !ok {
		tidakDitemukan(w, "Akun")
		return
	}
	a, err := s.svc.LihatAkun(r.Context(), peminta(r), id)
	if errors.Is(err, service.ErrTidakDitemukan) {
		tidakDitemukan(w, "Akun")
		return
	}
	if err != nil {
		s.errorInternal(w, err)
		return
	}
	tulisJSON(w, 200, a)
}

// GET /transfers/{id}: jurnal bayar atau transfer, alamat yang dikirim di header Location setelah 201.
func (s Server) lihatTransaksi(w http.ResponseWriter, r *http.Request) {
	id, ok := idDariPath(r)
	if !ok {
		tidakDitemukan(w, "Transaksi")
		return
	}
	t, err := s.svc.LihatTransaksi(r.Context(), peminta(r), id)
	if errors.Is(err, service.ErrTidakDitemukan) {
		tidakDitemukan(w, "Transaksi")
		return
	}
	if err != nil {
		s.errorInternal(w, err)
		return
	}
	tulisJSON(w, 200, t)
}

// GET /warung?cari=<teks>: cari warung menurut nama.
func (s Server) cariWarung(w http.ResponseWriter, r *http.Request) {
	hasil, err := s.svc.CariWarung(r.Context(), r.URL.Query().Get("cari"))
	if err != nil {
		s.errorInternal(w, err)
		return
	}
	tulisJSON(w, 200, map[string]any{"warung": hasil})
}

// MaksCSV: 1 MiB, sama dengan Tahap 1. File HR 1.000 akun berukuran ±14 KB.
const MaksCSV = 1 << 20

// --8<-- [start:topup]
// POST /topup?keterangan=...  body text/csv: nomor_karyawan,nominal (atau email,nominal dari Tahap 1)
// File lebih dari MaksCSV ditolak utuh (413). LimitReader di Tahap 1 memotong file diam-diam: baris terakhir
// yang terpotong bisa tetap angka yang sah, dan sisa file hilang tanpa pesan (keputusan 418).
func (s Server) topup(w http.ResponseWriter, r *http.Request) {
	isi, err := io.ReadAll(http.MaxBytesReader(w, r.Body, MaksCSV))
	var besar *http.MaxBytesError
	if errors.As(err, &besar) {
		tulisProblem(w, Problem{Type: "/problems/file-terlalu-besar", Title: "File CSV terlalu besar; tidak ada saldo yang berubah",
			Status: 413, Detail: fmt.Sprintf("Paling banyak %d byte per file.", MaksCSV)})
		return
	}
	if err != nil {
		tulisProblem(w, Problem{Type: "/problems/body-rusak", Title: "Body tidak terbaca", Status: 400})
		return
	}
	akun, total, err := s.svc.Topup(r.Context(), peminta(r), r.URL.Query().Get("keterangan"), string(isi))
	if err != nil {
		s.petaError(w, err, "Hanya admin tunjangan yang boleh top-up")
		return
	}
	tulisJSON(w, 200, map[string]any{"akun": akun, "total": total})
}

// --8<-- [end:topup]

// POST /koreksi: koreksi saldo satu sisi Tahap 1 tidak ada lagi (aturan Pak Hadi Tahap 2).
func (s Server) koreksi(w http.ResponseWriter, r *http.Request) {
	tulisProblem(w, Problem{Type: "/problems/diganti", Title: "Koreksi saldo diganti jurnal pembalik", Status: 410,
		Detail: "Pakai POST /jurnal/{id}/pembalik dengan alasan; saldo tidak diubah tanpa jurnal."})
}

// --8<-- [start:bayar]
// POST /transfers: bayar ke warung. Kontrak expand Tahap 1 (ADR 10): jumlah (app 1.0) atau nominal (app 1.1).
func (s Server) bayar(w http.ResponseWriter, r *http.Request) {
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
	id, saldo, err := s.svc.Bayar(r.Context(), peminta(r), *in.Ke, *in.Jumlah)
	if err != nil {
		s.petaError(w, err, "Hanya karyawan yang bisa membayar")
		return
	}
	w.Header().Set("Location", fmt.Sprintf("/transfers/%d", id))
	tulisJSON(w, 201, map[string]int64{"id": id, "saldo": saldo})
}

// --8<-- [end:bayar]

// --8<-- [start:kirim]
// POST /kiriman: kirim uang ke rekan lewat nomor karyawan (Tahap 2). Endpoint baru, jadi hanya nominal.
func (s Server) kirim(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Ke      *string `json:"ke_nomor_karyawan"`
		Nominal *int64  `json:"nominal"`
	}
	if p := bacaJSON(r.Body, &in); p != nil {
		tulisProblem(w, *p)
		return
	}
	if p := wajibAda([]string{"ke_nomor_karyawan", "nominal"}, in.Ke != nil, in.Nominal != nil); p != nil {
		tulisProblem(w, *p)
		return
	}
	h, err := s.svc.Kirim(r.Context(), peminta(r), *in.Ke, *in.Nominal)
	if err != nil {
		s.petaError(w, err, "Hanya karyawan yang bisa mengirim ke rekan")
		return
	}
	w.Header().Set("Location", fmt.Sprintf("/transfers/%d", h.ID))
	tulisJSON(w, 201, h)
}

// --8<-- [end:kirim]

// --8<-- [start:riwayat]
// GET /akun/{id}/riwayat?kursor=...&batas=...: tanpa kursor = halaman pertama (app lama tidak mengirimnya).
func (s Server) riwayat(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	q := r.URL.Query()
	daftar, berikutnya, err := s.svc.Riwayat(r.Context(), peminta(r), id, q.Get("kursor"), q.Get("batas"))
	if errors.Is(err, service.ErrTidakDitemukan) {
		tidakDitemukan(w, "Akun")
		return
	}
	if err != nil {
		s.petaError(w, err, "")
		return
	}
	var k *string
	if berikutnya != "" {
		k = &berikutnya
	}
	tulisJSON(w, 200, map[string]any{"riwayat": daftar, "berikutnya": k})
}

// --8<-- [end:riwayat]

func (s Server) laporan(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.ParseInt(r.PathValue("id"), 10, 64)
	q := r.URL.Query()
	baris, err := s.svc.Laporan(r.Context(), peminta(r), id, q.Get("dari"), q.Get("sampai"))
	if errors.Is(err, service.ErrTidakDitemukan) {
		tidakDitemukan(w, "Warung")
		return
	}
	if err != nil {
		s.petaError(w, err, "")
		return
	}
	tulisJSON(w, 200, map[string]any{"warung": id, "per_hari": baris})
}

// POST /jurnal/{id}/pembalik  body JSON: alasan. Hanya admin.
func (s Server) pembalik(w http.ResponseWriter, r *http.Request) {
	jurnal, ok := idDariPath(r)
	if !ok {
		tidakDitemukan(w, "Jurnal")
		return
	}
	var in struct {
		Alasan *string `json:"alasan"`
	}
	if p := bacaJSON(r.Body, &in); p != nil {
		tulisProblem(w, *p)
		return
	}
	if p := wajibAda([]string{"alasan"}, in.Alasan != nil); p != nil {
		tulisProblem(w, *p)
		return
	}
	id, err := s.svc.Balik(r.Context(), peminta(r), jurnal, *in.Alasan)
	if errors.Is(err, service.ErrTidakDitemukan) {
		tidakDitemukan(w, "Jurnal")
		return
	}
	if err != nil {
		s.petaError(w, err, "Hanya admin yang boleh membalik jurnal")
		return
	}
	tulisJSON(w, 201, map[string]int64{"id": id, "membalik": jurnal})
}

// GET /tutup-buku?periode=YYYY-MM: laporan bulanan untuk Keuangan. Hanya admin.
func (s Server) tutupBuku(w http.ResponseWriter, r *http.Request) {
	periode := r.URL.Query().Get("periode")
	buku, sistem, err := s.svc.TutupBuku(r.Context(), peminta(r), periode)
	if err != nil {
		s.petaError(w, err, "Hanya admin yang boleh membuka tutup buku")
		return
	}
	tulisJSON(w, 200, map[string]any{"periode": periode, "buku": buku, "sistem": sistem})
}
