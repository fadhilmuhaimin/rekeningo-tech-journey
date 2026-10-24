// Lab e5-payload versi ledger (keputusan 818): server kecil yang mengirim riwayat seperti labs/api-t2, dalam tiga
// bentuk, dengan kompresi gzip lewat middleware. Hanya untuk lab: tanpa login, hanya halaman pertama, hanya localhost.
//
// Yang sama dengan api-t2: query repo.Riwayat, struct Riwayat, kursor `berikutnya`, tulisJSON (json.Encoder, jadi
// body diakhiri satu newline). Yang tidak ada di api-t2: ?bentuk=layar dan ?bentuk=penuh, middleware gzip (api-t2
// tidak mengompres), dan /lab/terima. Bentuk `api` tanpa ?bentuk adalah response api-t2 apa adanya.
package main

import (
	"compress/gzip"
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
	_ "time/tzdata" // zona waktu ikut di binary: hasil tidak bergantung pada TZ mesin

	_ "github.com/jackc/pgx/v5/stdlib"
)

type Repo struct{ db *sql.DB }

// ---- Salinan persis dari labs/api-t2 (run_ledger.py memeriksa tiap blok masih sama) ----

// labs/api-t2/internal/repo/riwayat.go
// Riwayat adalah satu posting di buku pemilik, dilihat dari pemiliknya.
type Riwayat struct {
	ID      int64     `json:"id"` // nomor jurnal; bayar dan transfer bisa dibuka di /transfers/{id}
	Jenis   string    `json:"jenis"`
	Arah    string    `json:"arah"` // "keluar" atau "masuk"
	Lawan   string    `json:"lawan"`
	Jumlah  int64     `json:"jumlah"`  // app 1.0
	Nominal int64     `json:"nominal"` // app 1.1 dan sesudahnya
	Waktu   time.Time `json:"waktu"`
	Posting int64     `json:"-"` // bagian kedua kursor
}

// Kursor menunjuk posting terakhir yang sudah dikirim: halaman berikutnya mulai sesudahnya (ADR 16, M12).
type Kursor struct {
	Dibuat  time.Time
	Posting int64
}

// labs/api-t2/internal/repo/riwayat.go, bagian riwayat
// Riwayat: posting satu akun, terbaru dulu, paling banyak batas baris. Urutannya (dibuat, id) menurun, dan
// halaman berikutnya dimulai sesudah kursor, bukan sesudah nomor halaman. Posting baru di atas tidak
// menggeser halaman yang sedang dibaca. Index posting_riwayat (buku_id, dibuat, id) melayani keduanya.
func (r Repo) Riwayat(ctx context.Context, akun int64, k *Kursor, batas int) ([]Riwayat, error) {
	q := `
		SELECT j.id, j.jenis, CASE WHEN p.jumlah < 0 THEN 'keluar' ELSE 'masuk' END,
		       coalesce(la.nama, CASE lb.jenis WHEN 'tunjangan' THEN 'Tunjangan makan' WHEN 'pembuka' THEN 'Saldo awal'
		                                       WHEN 'selisih' THEN 'Selisih v1' WHEN 'kas_pencairan' THEN 'Pencairan' END),
		       abs(p.jumlah), p.dibuat, p.id
		FROM buku b
		JOIN posting p ON p.buku_id = b.id
		JOIN jurnal j ON j.id = p.jurnal_id
		LEFT JOIN LATERAL (SELECT q.buku_id FROM posting q
		                   WHERE q.jurnal_id = p.jurnal_id AND q.buku_id <> p.buku_id ORDER BY q.id LIMIT 1) l ON true
		LEFT JOIN buku lb ON lb.id = l.buku_id
		LEFT JOIN akun la ON la.id = lb.akun_id
		WHERE b.akun_id = $1`
	arg := []any{akun}
	if k != nil {
		q += ` AND (p.dibuat, p.id) < ($2, $3)`
		arg = append(arg, k.Dibuat, k.Posting)
	}
	arg = append(arg, batas)
	q += fmt.Sprintf(` ORDER BY p.dibuat DESC, p.id DESC LIMIT $%d`, len(arg))
	rows, err := r.db.QueryContext(ctx, q, arg...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Riwayat{}
	for rows.Next() {
		var x Riwayat
		if err := rows.Scan(&x.ID, &x.Jenis, &x.Arah, &x.Lawan, &x.Jumlah, &x.Waktu, &x.Posting); err != nil {
			return nil, err
		}
		x.Nominal = x.Jumlah
		out = append(out, x)
	}
	return out, rows.Err()
}

// labs/api-t2/internal/service/riwayat.go, bagian kursor (repo.Kursor ditulis Kursor)
// Kursor dikirim ke app sebagai teks yang tidak perlu dipahami app: waktu posting (mikrodetik) dan nomornya.
func tulisKursor(k Kursor) string {
	return base64.RawURLEncoding.EncodeToString([]byte(strconv.FormatInt(k.Dibuat.UnixMicro(), 10) + "." +
		strconv.FormatInt(k.Posting, 10)))
}

func bacaKursor(s string) (*Kursor, bool) {
	b, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil {
		return nil, false
	}
	waktu, nomor, ok := strings.Cut(string(b), ".")
	us, err1 := strconv.ParseInt(waktu, 10, 64)
	id, err2 := strconv.ParseInt(nomor, 10, 64)
	if !ok || err1 != nil || err2 != nil || id <= 0 {
		return nil, false
	}
	return &Kursor{Dibuat: time.UnixMicro(us), Posting: id}, true
}

// labs/api-t2/internal/handler/handler.go
func tulisJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// ---- Bentuk pembanding (bukan api-t2) ----

// BarisLayar: yang dipakai baris di layar riwayat. `jumlah` hanya dibaca app 1.0 (labs/api-t2: kolom ganda sampai
// contract), jadi bentuk ini tidak bisa melayani app 1.0.
type BarisLayar struct {
	ID      int64     `json:"id"`
	Jenis   string    `json:"jenis"`
	Arah    string    `json:"arah"`
	Lawan   string    `json:"lawan"`
	Nominal int64     `json:"nominal"`
	Waktu   time.Time `json:"waktu"`
}

func layar(daftar []Riwayat) []BarisLayar {
	out := make([]BarisLayar, 0, len(daftar))
	for _, x := range daftar {
		out = append(out, BarisLayar{x.ID, x.Jenis, x.Arah, x.Lawan, x.Nominal, x.Waktu})
	}
	return out
}

// Bentuk penuh: semua kolom tabel yang disentuh query riwayat (SELECT * pada posting, jurnal, buku, akun), dikirim
// utuh. Ini bentuk yang keluar bila handler menyerialisasi model apa adanya.
type PenuhPosting struct {
	ID       int64     `json:"id"`
	JurnalID int64     `json:"jurnal_id"`
	BukuID   int64     `json:"buku_id"`
	Jumlah   int64     `json:"jumlah"`
	Dibuat   time.Time `json:"dibuat"`
}
type PenuhJurnal struct {
	ID               int64     `json:"id"`
	Jenis            string    `json:"jenis"`
	Keterangan       string    `json:"keterangan"`
	MembalikJurnalID *int64    `json:"membalik_jurnal_id"`
	DibuatOleh       int64     `json:"dibuat_oleh"`
	Dibuat           time.Time `json:"dibuat"`
}
type PenuhBuku struct {
	ID          int64  `json:"id"`
	AkunID      *int64 `json:"akun_id"`
	Jenis       string `json:"jenis"`
	SaldoCache  int64  `json:"saldo_cache"`
	BatasSaldo  *int64 `json:"batas_saldo"`
	BatasHarian *int64 `json:"batas_harian"`
	Versi       int    `json:"versi"`
}
type PenuhAkun struct {
	ID    int64  `json:"id"`
	Nama  string `json:"nama"`
	Email string `json:"email"`
	Peran string `json:"peran"`
}
type PenuhAkunNull struct {
	ID                 sql.NullInt64
	Nama, Email, Peran sql.NullString
}
type PenuhLawan struct {
	Posting PenuhPosting `json:"posting"`
	Buku    PenuhBuku    `json:"buku"`
	Akun    *PenuhAkun   `json:"akun"`
}
type BarisPenuh struct {
	Posting PenuhPosting `json:"posting"`
	Jurnal  PenuhJurnal  `json:"jurnal"`
	Lawan   PenuhLawan   `json:"lawan"`
}

func (r Repo) Penuh(ctx context.Context, akun int64, batas int) ([]BarisPenuh, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT p.id, p.jurnal_id, p.buku_id, p.jumlah, p.dibuat,
		       j.id, j.jenis, j.keterangan, j.membalik_jurnal_id, j.dibuat_oleh, j.dibuat,
		       q.id, q.jurnal_id, q.buku_id, q.jumlah, q.dibuat,
		       lb.id, lb.akun_id, lb.jenis, lb.saldo_cache, lb.batas_saldo, lb.batas_harian, lb.versi,
		       la.id, la.nama, la.email, la.peran
		FROM buku b
		JOIN posting p ON p.buku_id = b.id
		JOIN jurnal j ON j.id = p.jurnal_id
		LEFT JOIN LATERAL (SELECT q.* FROM posting q
		                   WHERE q.jurnal_id = p.jurnal_id AND q.buku_id <> p.buku_id ORDER BY q.id LIMIT 1) q ON true
		LEFT JOIN buku lb ON lb.id = q.buku_id
		LEFT JOIN akun la ON la.id = lb.akun_id
		WHERE b.akun_id = $1
		ORDER BY p.dibuat DESC, p.id DESC LIMIT $2`, akun, batas)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []BarisPenuh{}
	for rows.Next() {
		var x BarisPenuh
		var akun PenuhAkunNull // NULL bila lawannya buku sistem (tunjangan, kas pencairan, ...)
		if err := rows.Scan(&x.Posting.ID, &x.Posting.JurnalID, &x.Posting.BukuID, &x.Posting.Jumlah, &x.Posting.Dibuat,
			&x.Jurnal.ID, &x.Jurnal.Jenis, &x.Jurnal.Keterangan, &x.Jurnal.MembalikJurnalID, &x.Jurnal.DibuatOleh, &x.Jurnal.Dibuat,
			&x.Lawan.Posting.ID, &x.Lawan.Posting.JurnalID, &x.Lawan.Posting.BukuID, &x.Lawan.Posting.Jumlah, &x.Lawan.Posting.Dibuat,
			&x.Lawan.Buku.ID, &x.Lawan.Buku.AkunID, &x.Lawan.Buku.Jenis, &x.Lawan.Buku.SaldoCache,
			&x.Lawan.Buku.BatasSaldo, &x.Lawan.Buku.BatasHarian, &x.Lawan.Buku.Versi,
			&akun.ID, &akun.Nama, &akun.Email, &akun.Peran); err != nil {
			return nil, err
		}
		if akun.ID.Valid {
			x.Lawan.Akun = &PenuhAkun{akun.ID.Int64, akun.Nama.String, akun.Email.String, akun.Peran.String}
		}
		out = append(out, x)
	}
	return out, rows.Err()
}

// ---- Handler ----

const batasRiwayat = 20 // sama dengan service.BatasRiwayat di api-t2

func (r Repo) riwayat(w http.ResponseWriter, req *http.Request) {
	id, _ := strconv.ParseInt(req.PathValue("id"), 10, 64)
	q := req.URL.Query()
	n := batasRiwayat
	if b := q.Get("batas"); b != "" {
		var err error
		if n, err = strconv.Atoi(b); err != nil || n < 1 || n > 50 { // aturan service.Riwayat di api-t2
			http.Error(w, "batas: angka 1 sampai 50", http.StatusUnprocessableEntity)
			return
		}
	}
	var isi any
	var akhir *Kursor
	switch q.Get("bentuk") {
	case "", "api", "layar":
		daftar, err := r.Riwayat(req.Context(), id, nil, n)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if len(daftar) == n {
			akhir = &Kursor{Dibuat: daftar[n-1].Waktu, Posting: daftar[n-1].Posting}
		}
		isi = daftar
		if q.Get("bentuk") == "layar" {
			isi = layar(daftar)
		}
	case "penuh":
		daftar, err := r.Penuh(req.Context(), id, n)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if len(daftar) == n {
			akhir = &Kursor{Dibuat: daftar[n-1].Posting.Dibuat, Posting: daftar[n-1].Posting.ID}
		}
		isi = daftar
	default:
		http.Error(w, "bentuk: api, layar, atau penuh", http.StatusUnprocessableEntity)
		return
	}
	var k *string
	if akhir != nil {
		s := tulisKursor(*akhir)
		k = &s
	}
	tulisJSON(w, 200, map[string]any{"riwayat": isi, "berikutnya": k})
}

// ---- Kompresi: middleware, bukan bagian api-t2 ----

// bobot membaca parameter q= sebuah entri Accept-Encoding; tanpa q bobotnya 1 (RFC 9110 12.4.2).
func bobot(param string) float64 {
	if v, ok := strings.CutPrefix(strings.ToLower(strings.TrimSpace(param)), "q="); ok {
		if f, err := strconv.ParseFloat(strings.TrimSpace(v), 64); err == nil {
			return f
		}
	}
	return 1
}

// terimaGzip: aturan RFC 9110 12.5.3 untuk representasi yang bisa dikirim tanpa coding atau gzip.
// Tanpa field Accept-Encoding RFC mengizinkan coding apa saja; middleware ini memilih tanpa coding (pilihan server).
// gzip dikirim bila gzip tertulis dengan q > 0, atau "*" dengan q > 0 dan gzip tidak tertulis sendiri.
func terimaGzip(nilai string) bool {
	gzipQ, bintangQ := -1.0, -1.0
	for _, bagian := range strings.Split(nilai, ",") {
		kode, param, _ := strings.Cut(strings.TrimSpace(bagian), ";")
		switch strings.ToLower(strings.TrimSpace(kode)) {
		case "gzip":
			gzipQ = bobot(param)
		case "*":
			bintangQ = bobot(param)
		}
	}
	if gzipQ >= 0 {
		return gzipQ > 0
	}
	return bintangQ > 0
}

type tulisGzip struct {
	http.ResponseWriter
	gz *gzip.Writer
}

func (t tulisGzip) Write(b []byte) (int, error) { return t.gz.Write(b) }

func gzipJika(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Add("Vary", "Accept-Encoding") // RFC 9110 12.5.5: response bergantung pada field itu
		if !terimaGzip(r.Header.Get("Accept-Encoding")) {
			h.ServeHTTP(w, r)
			return
		}
		w.Header().Set("Content-Encoding", "gzip")
		gz := gzip.NewWriter(w) // level bawaan (DefaultCompression)
		defer gz.Close()
		h.ServeHTTP(tulisGzip{w, gz}, r)
	})
}

func main() {
	alamat := flag.String("addr", "127.0.0.1:18150", "alamat server")
	flag.Parse()
	wib, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		log.Fatal(err)
	}
	time.Local = wib // waktu di JSON ditulis +07:00, sama di setiap mesin
	db, err := sql.Open("pgx", os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}
	r := Repo{db}
	mux := http.NewServeMux()
	mux.Handle("GET /akun/{id}/riwayat", gzipJika(http.HandlerFunc(r.riwayat)))
	// Lab saja: apa yang diterima server dari client, untuk cek_riwayat.dart.
	mux.HandleFunc("GET /lab/terima", func(w http.ResponseWriter, req *http.Request) {
		v := req.Header.Get("Accept-Encoding")
		if v == "" {
			v = "(tidak ada)"
		}
		fmt.Fprint(w, v)
	})
	srv := &http.Server{Addr: *alamat, Handler: mux, ReadHeaderTimeout: 5 * time.Second} // gosec G114
	log.Fatal(srv.ListenAndServe())
}
