package handler

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"regexp"
	"time"

	"lab/apit3/internal/repo"
	"lab/apit3/internal/service"
)

// Idempotency-Key opsional di POST /transfers, /kiriman, dan /pesanan (ADR 14, lab-t3-offline, keputusan 971).
// Tanpa header, perilaku sama dengan sebelumnya: app 1.0 dan 1.1 tidak mengirim key (kompatibilitas mundur, ADR 10).

// Header berisi String Structured Field (draft-ietf-httpapi-idempotency-key-header-08, RFC 9651; R2-17):
// nilai di antara tanda kutip. Rekeningo hanya menerima UUID di dalamnya, supaya key sulit ditebak.
var polaKunci = regexp.MustCompile(`^"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"$`)

func bacaKunci(h http.Header) (string, bool) {
	v := h.Values("Idempotency-Key")
	if len(v) != 1 {
		return "", false
	}
	m := polaKunci.FindStringSubmatch(v[0])
	if m == nil {
		return "", false
	}
	return m[1], true
}

// sidikJari: sha256 dari method, path, dan body. Body JSON dibaca ke bentuk tetap (urutan field dan spasi tidak
// berpengaruh), jadi ulangan dari app yang sama tidak dianggap permintaan lain; body non-JSON dipakai apa adanya.
func sidikJari(method, path string, body []byte) string {
	var v any
	if json.Unmarshal(body, &v) == nil {
		if b, err := json.Marshal(v); err == nil {
			body = b
		}
	}
	h := sha256.Sum256(append([]byte(method+" "+path+"\n"), body...))
	return hex.EncodeToString(h[:])
}

// tersimpan adalah respons yang diulang persis untuk key yang sama.
type tersimpan struct {
	Status int    `json:"status"`
	Jenis  string `json:"jenis,omitempty"`
	Lokasi string `json:"lokasi,omitempty"`
	Isi    string `json:"isi"`
}

// perekam meneruskan respons ke client sambil menyalin status dan isinya.
type perekam struct {
	http.ResponseWriter
	status int
	isi    bytes.Buffer
}

func (p *perekam) WriteHeader(kode int) {
	if p.status == 0 {
		p.status = kode
	}
	p.ResponseWriter.WriteHeader(kode)
}

func (p *perekam) Write(b []byte) (int, error) {
	if p.status == 0 {
		p.status = http.StatusOK
	}
	p.isi.Write(b)
	return p.ResponseWriter.Write(b)
}

func (p *perekam) Unwrap() http.ResponseWriter { return p.ResponseWriter }

// ctxTutup: penutupan key tidak ikut batal bila client sudah pergi (key yang tertinggal diproses menahan ulangan).
func ctxTutup(r *http.Request) (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.WithoutCancel(r.Context()), 5*time.Second)
}

// --8<-- [start:idempoten]
// idempoten membungkus handler ubah-data yang menerima Idempotency-Key. Urutannya: key baru atau kedaluwarsa
// dikerjakan lalu responsnya disimpan; key yang sudah selesai dengan isi sama dijawab dengan respons tersimpan
// tanpa mengerjakan apa pun; key yang sama dengan isi atau akun lain ditolak 422; key yang masih diproses 409.
//
// Kerja dan penyimpanan respons BUKAN satu transaction: server mati di antara COMMIT dan SelesaiKunci
// meninggalkan key berstatus diproses sampai kedaluwarsa, dan ulangan mendapat 409, tidak mengerjakan ulang
// (paling banyak sekali, tetapi hanya selama key berlaku: sesudah 24 jam key itu dikerjakan sebagai permintaan baru).
// 5xx melepas key, juga 5xx dari COMMIT yang hasilnya tidak diketahui. Rancangan yang menutup kedua celah itu ada di
// labs/e3-idempotency (output/ledger/mati-di-tengah.txt).
func (s Server) idempoten(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if len(r.Header.Values("Idempotency-Key")) == 0 {
			next(w, r)
			return
		}
		kunci, ok := bacaKunci(r.Header)
		if !ok {
			tulisProblem(w, Problem{Type: "/problems/idempotency-key", Status: 400,
				Title: "Idempotency-Key harus satu String berisi UUID"})
			return
		}
		isi, err := io.ReadAll(http.MaxBytesReader(w, r.Body, MaksBodyJSON))
		if err != nil {
			tulisProblem(w, Problem{Type: "/problems/json-rusak", Title: "Body tidak terbaca", Status: 400})
			return
		}
		r.Body = io.NopCloser(bytes.NewReader(isi))
		akun := peminta(r)
		putusan, simpanan, err := s.svc.KlaimKunci(r.Context(), kunci, akun, sidikJari(r.Method, r.URL.Path, isi))
		if err != nil {
			s.errorInternal(w, err)
			return
		}
		switch putusan {
		case repo.KlaimBeda:
			tulisProblem(w, Problem{Type: "/problems/idempotency-key-dipakai-ulang", Status: 422,
				Title: "Idempotency-Key sudah dipakai untuk permintaan lain"})
		case repo.KlaimBerjalan:
			tulisProblem(w, Problem{Type: "/problems/sedang-diproses", Status: 409,
				Title: "Permintaan dengan Idempotency-Key ini masih diproses"})
		case repo.KlaimUlang:
			var t tersimpan
			if err := json.Unmarshal(simpanan, &t); err != nil {
				s.errorInternal(w, err)
				return
			}
			if t.Jenis != "" {
				w.Header().Set("Content-Type", t.Jenis)
			}
			if t.Lokasi != "" {
				w.Header().Set("Location", t.Lokasi)
			}
			w.WriteHeader(t.Status)
			io.WriteString(w, t.Isi)
		default:
			rek := &perekam{ResponseWriter: w}
			ditutup := false
			defer func() {
				if !ditutup { // handler panik: net/http memulihkannya, tetapi key tidak boleh tertahan sampai kedaluwarsa
					ctx, batal := ctxTutup(r)
					defer batal()
					_ = s.svc.LepasKunci(ctx, kunci)
				}
			}()
			next(rek, r)
			ctx, batal := ctxTutup(r)
			defer batal()
			if rek.status == 0 || rek.status >= 500 || rek.status == http.StatusTooManyRequests {
				_ = s.svc.LepasKunci(ctx, kunci) // kegagalan sementara: ulangan mengerjakannya dari awal
				ditutup = true
				return
			}
			b, _ := json.Marshal(tersimpan{Status: rek.status, Jenis: w.Header().Get("Content-Type"),
				Lokasi: w.Header().Get("Location"), Isi: rek.isi.String()})
			if err := s.svc.SelesaiKunci(ctx, kunci, b); err != nil {
				log.Printf("simpan respons key %s gagal: %v", kunci, err)
			}
			ditutup = true
		}
	}
}

// --8<-- [end:idempoten]

// PUT /produk/{id}/stok (hanya mode rentan stok-timpa, M24): stok diganti tanpa syarat versi. Satu-satunya
// pengaman pengiriman ulang adalah Idempotency-Key 24 jam.
func (s Server) timpaStok(w http.ResponseWriter, r *http.Request) {
	id, ok := idDariPath(r)
	if !ok {
		tidakDitemukan(w, "Produk")
		return
	}
	var in struct {
		Stok *int `json:"stok"`
	}
	if !baca(w, r, &in) {
		return
	}
	if p := wajibAda([]string{"stok"}, in.Stok != nil); p != nil {
		tulisProblem(w, *p)
		return
	}
	h, err := s.svc.TimpaStok(r.Context(), peminta(r), id, *in.Stok)
	if errors.Is(err, service.ErrTidakDitemukan) {
		tidakDitemukan(w, "Produk")
		return
	}
	if err != nil {
		s.petaError(w, err, "Hanya warung pemilik yang boleh mengubah stok")
		return
	}
	tulisJSON(w, 200, h)
}
