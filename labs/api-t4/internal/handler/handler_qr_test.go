package handler

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"golang.org/x/crypto/bcrypt"

	"lab/apit4/internal/repo"
	"lab/apit4/internal/service"
)

// Tes HTTP QR (ADR 40): status code, bentuk Problem, dan Idempotency-Key pada pembayaran. Memakai server httptest
// dengan Server.Rute() yang sama dengan lab, login sungguhan, dan PostgreSQL schema tes (LAB_TES_SCHEMA).

const passwordQR = "sandi-tes-qr-lebih-dari-lima-belas"

type lingkunganQR struct {
	t     *testing.T
	url   string
	db    *sql.DB
	mu    sync.Mutex
	kini  time.Time
	token map[int64]string
}

func (l *lingkunganQR) jam() time.Time { l.mu.Lock(); defer l.mu.Unlock(); return l.kini }
func (l *lingkunganQR) maju(d time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.kini = l.kini.Add(d)
}

func siapkanQR(t *testing.T) *lingkunganQR {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		if os.Getenv("TES_DB_WAJIB") == "1" {
			t.Fatal("TES_DB_WAJIB=1 tetapi TEST_DATABASE_URL kosong")
		}
		t.Skip("TEST_DATABASE_URL kosong: tes ini butuh PostgreSQL")
	}
	db, err := sql.Open("pgx", url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	var nama, schema string
	if err := db.QueryRow("SELECT current_database(), coalesce(current_schema(), '')").Scan(&nama, &schema); err != nil {
		t.Fatal(err)
	}
	if nama != "lab" || schema != schemaTes() {
		t.Fatalf("%s/%s bukan database tes lab/%s", nama, schema, schemaTes())
	}
	l := &lingkunganQR{t: t, db: db, kini: time.Now().UTC().Truncate(time.Second), token: map[int64]string{}}
	svc := service.Baru(repo.Baru(db), time.Hour).DenganJam(l.jam)
	srv := httptest.NewServer(Baru(svc).Rute())
	t.Cleanup(srv.Close)
	l.url = srv.URL
	return l
}

// akun membuat akun beserta buku dan saldo, lalu login dan menyimpan tokennya.
func (l *lingkunganQR) akun(jenis, tingkat, status string, saldo int64) int64 {
	l.t.Helper()
	var id int64
	if err := l.db.QueryRow(`SELECT greatest(coalesce(max(id), 0), 100000) + 1 FROM akun`).Scan(&id); err != nil {
		l.t.Fatal(err)
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(passwordQR), bcrypt.MinCost)
	if err != nil {
		l.t.Fatal(err)
	}
	email := fmt.Sprintf("qr%d@publik.example", id)
	if _, err := l.db.Exec(`INSERT INTO akun (id, jenis, nama, email, password_hash, tingkat, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`, id, jenis, fmt.Sprintf("%s %d", jenis, id), email, string(hash), tingkat, status); err != nil {
		l.t.Fatal(err)
	}
	if _, err := l.db.Exec(`INSERT INTO buku (akun_id, jenis) VALUES ($1, $2)`, id, jenis); err != nil {
		l.t.Fatal(err)
	}
	if saldo > 0 {
		l.isiSaldo(id, saldo)
	}
	st, _, isi := l.kirim("POST", "/login", "", fmt.Sprintf(`{"email":%q,"password":%q}`, email, passwordQR))
	if st != 200 {
		l.t.Fatalf("login %s: status %d %v", email, st, isi)
	}
	l.token[id] = isi["token"].(string)
	return id
}

// isiSaldo: jurnal topup dari buku tunjangan, dua posting, saldo_cache ikut naik di transaction yang sama.
func (l *lingkunganQR) isiSaldo(akun, n int64) {
	l.t.Helper()
	r := repo.Baru(l.db)
	err := r.DalamTx(context.Background(), func(tx repo.Tx) error {
		tunjangan, err := tx.BukuSistem(context.Background(), "tunjangan")
		if err != nil {
			return err
		}
		buku, err := tx.KunciBukuAkun(context.Background(), akun)
		if err != nil {
			return err
		}
		_, err = tx.CatatJurnal(context.Background(), "topup", "isi saldo tes QR", 1, nil,
			[]repo.Posting{{BukuID: tunjangan, Jumlah: -n}, {BukuID: buku[akun].ID, Jumlah: n}})
		return err
	})
	if err != nil {
		l.t.Fatal(err)
	}
}

// kirim mengirim satu permintaan dan membaca jawabannya sebagai JSON (map kosong bila body kosong).
func (l *lingkunganQR) kirim(method, path, token, body string, kepala ...string) (int, http.Header, map[string]any) {
	l.t.Helper()
	var r io.Reader
	if body != "" {
		r = strings.NewReader(body)
	}
	req, _ := http.NewRequest(method, l.url+path, r)
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	for i := 0; i+1 < len(kepala); i += 2 {
		req.Header.Set(kepala[i], kepala[i+1])
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		l.t.Fatal(err)
	}
	defer resp.Body.Close()
	isi, _ := io.ReadAll(resp.Body)
	var m map[string]any
	if len(isi) > 0 {
		if err := json.Unmarshal(isi, &m); err != nil {
			l.t.Fatalf("%s %s: jawaban bukan JSON: %q", method, path, isi)
		}
	}
	return resp.StatusCode, resp.Header, m
}

func (l *lingkunganQR) saldo(akun int64) int64 {
	l.t.Helper()
	var n int64
	if err := l.db.QueryRow(`SELECT saldo_cache FROM buku WHERE akun_id = $1`, akun).Scan(&n); err != nil {
		l.t.Fatal(err)
	}
	return n
}

func harapStatus(t *testing.T, apa string, st, ingin int, isi map[string]any, tipe string) {
	t.Helper()
	if st != ingin {
		t.Fatalf("%s: status %d (%v), ingin %d", apa, st, isi, ingin)
	}
	if tipe != "" && isi["type"] != tipe {
		t.Fatalf("%s: type %v, ingin %s", apa, isi["type"], tipe)
	}
}

func TestHandlerQRAlurDinamis(t *testing.T) {
	l := siapkanQR(t)
	merchant := l.akun("merchant", "terverifikasi", "aktif", 0)
	pembeli := l.akun("pemakai", "belum", "aktif", 100_000)
	tm, tp := l.token[merchant], l.token[pembeli]

	st, h, q := l.kirim("POST", "/qr", tm, `{"jenis":"dinamis","nominal":35000}`)
	harapStatus(t, "buat QR", st, 201, q, "")
	id, _ := q["id"].(string)
	if id == "" || h.Get("Location") != "/qr/"+id {
		t.Fatalf("buat QR: id %q, Location %q", id, h.Get("Location"))
	}
	// Konfirmasi: nama merchant dari tabel akun, QR terverifikasi.
	st, _, k := l.kirim("GET", "/qr/"+id, tp, "")
	harapStatus(t, "konfirmasi", st, 200, k, "")
	if k["merchant"].(map[string]any)["nama"] != fmt.Sprintf("merchant %d", merchant) || k["terverifikasi"] != true || k["nominal"] != float64(35000) {
		t.Fatalf("konfirmasi: %v", k)
	}
	// Body kosong sah untuk QR dinamis; Location menunjuk jurnal yang bisa dibaca pembayar.
	st, h, b := l.kirim("POST", "/qr/"+id+"/bayar", tp, "")
	harapStatus(t, "bayar", st, 201, b, "")
	if b["saldo"] != float64(65000) || !strings.HasPrefix(h.Get("Location"), "/transfers/") {
		t.Fatalf("bayar: %v Location %q", b, h.Get("Location"))
	}
	if st, _, t2 := l.kirim("GET", h.Get("Location"), tp, ""); st != 200 || t2["ke"] != float64(merchant) {
		t.Fatalf("GET %s: %d %v", h.Get("Location"), st, t2)
	}
	st, _, b = l.kirim("POST", "/qr/"+id+"/bayar", tp, `{"nominal":35000}`)
	harapStatus(t, "bayar kedua kali", st, 409, b, "/problems/qr-terpakai")
	// QR yang sudah dibayar tidak tampil lagi di konfirmasi.
	st, _, b = l.kirim("GET", "/qr/"+id, tp, "")
	harapStatus(t, "konfirmasi sesudah dibayar", st, 404, b, "/problems/tidak-ditemukan")
	if s := l.saldo(pembeli); s != 65_000 {
		t.Fatalf("saldo pembeli %d, ingin 65000", s)
	}
}

func TestHandlerQRKedaluwarsaDanKesalahan(t *testing.T) {
	l := siapkanQR(t)
	merchant := l.akun("merchant", "terverifikasi", "aktif", 0)
	pemakai := l.akun("pemakai", "belum", "aktif", 300_000)
	tm, tp := l.token[merchant], l.token[pemakai]

	_, _, q := l.kirim("POST", "/qr", tm, `{"jenis":"dinamis","nominal":35000}`)
	id := q["id"].(string)
	l.maju(5*time.Minute + time.Second)
	st, _, b := l.kirim("POST", "/qr/"+id+"/bayar", tp, "")
	harapStatus(t, "bayar kedaluwarsa", st, 410, b, "/problems/qr-kedaluwarsa")

	// Merchant hanya merchant; pemakai tidak membuat QR; tanpa login 401; id bukan uuid 404; body rusak 400.
	st, _, b = l.kirim("POST", "/qr", tp, `{"jenis":"statis"}`)
	harapStatus(t, "pemakai membuat QR", st, 403, b, "/problems/dilarang")
	st, _, b = l.kirim("POST", "/qr", "", `{"jenis":"statis"}`)
	harapStatus(t, "tanpa login", st, 401, b, "/problems/belum-login")
	st, _, b = l.kirim("GET", "/qr/bukan-uuid", tp, "")
	harapStatus(t, "id bukan uuid", st, 404, b, "/problems/tidak-ditemukan")
	st, _, b = l.kirim("POST", "/qr", tm, `{"jenis":`)
	harapStatus(t, "body rusak", st, 400, b, "/problems/json-rusak")
	st, _, b = l.kirim("POST", "/qr", tm, `{}`)
	harapStatus(t, "jenis tidak dikirim", st, 400, b, "/problems/field-wajib")
	st, _, b = l.kirim("POST", "/qr", tm, `{"jenis":"dinamis"}`)
	harapStatus(t, "dinamis tanpa nominal", st, 422, b, "/problems/validasi")
	st, _, b = l.kirim("POST", "/qr", tm, `{"jenis":"dinamis","nominal":"35000"}`)
	harapStatus(t, "nominal bertipe string", st, 400, b, "/problems/tipe-salah")

	// QR statis: nominal wajib dan paling banyak Rp200.000.
	_, _, s := l.kirim("POST", "/qr", tm, `{"jenis":"statis"}`)
	sid := s["id"].(string)
	st, _, b = l.kirim("POST", "/qr/"+sid+"/bayar", tp, `{"nominal":200001}`)
	harapStatus(t, "statis di atas batas", st, 422, b, "/problems/validasi")
	st, _, b = l.kirim("POST", "/qr/"+sid+"/bayar", tp, "")
	harapStatus(t, "statis tanpa nominal", st, 422, b, "/problems/validasi")
	st, _, b = l.kirim("POST", "/qr/"+sid+"/bayar", tp, `{"nominal":200000}`)
	harapStatus(t, "statis tepat di batas", st, 201, b, "")
	// Saldo kurang: sisa 100.000, pembayaran 150.000 tidak cukup.
	st, _, b = l.kirim("POST", "/qr/"+sid+"/bayar", tp, `{"nominal":150000}`)
	harapStatus(t, "saldo kurang", st, 422, b, "/problems/saldo-kurang")
}

func TestHandlerQRBayarMemakaiIdempotencyKey(t *testing.T) {
	l := siapkanQR(t)
	merchant := l.akun("merchant", "terverifikasi", "aktif", 0)
	pembeli := l.akun("pemakai", "belum", "aktif", 100_000)
	_, _, s := l.kirim("POST", "/qr", l.token[merchant], `{"jenis":"statis"}`)
	sid := s["id"].(string)
	kunci := fmt.Sprintf(`"%08x-0aa0-4000-8000-%012x"`, time.Now().UnixNano()&0xffffffff, time.Now().UnixNano()&0xffffffffffff)

	st1, h1, b1 := l.kirim("POST", "/qr/"+sid+"/bayar", l.token[pembeli], `{"nominal":40000}`, "Idempotency-Key", kunci)
	st2, h2, b2 := l.kirim("POST", "/qr/"+sid+"/bayar", l.token[pembeli], `{"nominal":40000}`, "Idempotency-Key", kunci)
	if st1 != 201 || st2 != 201 || fmt.Sprint(b1) != fmt.Sprint(b2) || h1.Get("Location") != h2.Get("Location") {
		t.Fatalf("ulangan ber-key: %d %v %q lawan %d %v %q; harus respons yang sama", st1, b1, h1.Get("Location"), st2, b2, h2.Get("Location"))
	}
	if s := l.saldo(pembeli); s != 60_000 {
		t.Fatalf("saldo pembeli %d, ingin 60000: key yang sama tidak boleh memotong dua kali", s)
	}
	// Key yang sama dengan nominal lain: 422, tanpa uang bergerak.
	st, _, b := l.kirim("POST", "/qr/"+sid+"/bayar", l.token[pembeli], `{"nominal":50000}`, "Idempotency-Key", kunci)
	harapStatus(t, "key dipakai ulang", st, 422, b, "/problems/idempotency-key-dipakai-ulang")
	// Tanpa key, dua pembayaran identik adalah dua pembayaran (app lama tidak mengirim key).
	for i := 0; i < 2; i++ {
		if st, _, b := l.kirim("POST", "/qr/"+sid+"/bayar", l.token[pembeli], `{"nominal":10000}`); st != 201 {
			t.Fatalf("tanpa key: %d %v", st, b)
		}
	}
	if s := l.saldo(pembeli); s != 40_000 {
		t.Fatalf("saldo pembeli %d, ingin 40000", s)
	}
}

func TestHandlerQRLaporkan(t *testing.T) {
	l := siapkanQR(t)
	merchant := l.akun("merchant", "terverifikasi", "aktif", 0)
	pembeli := l.akun("pemakai", "belum", "aktif", 100_000)
	_, _, s := l.kirim("POST", "/qr", l.token[merchant], `{"jenis":"statis"}`)
	sid := s["id"].(string)

	st, _, b := l.kirim("POST", "/qr/"+sid+"/laporkan", l.token[pembeli], `{"alasan":"pendek"}`)
	harapStatus(t, "alasan pendek", st, 422, b, "/problems/validasi")
	st, _, b = l.kirim("POST", "/qr/"+sid+"/laporkan", l.token[pembeli], `{}`)
	harapStatus(t, "alasan tidak dikirim", st, 400, b, "/problems/field-wajib")
	st, _, b = l.kirim("POST", "/qr/"+sid+"/laporkan", l.token[pembeli], `{"alasan":"stiker ini ditempel di atas stiker toko yang asli"}`)
	harapStatus(t, "laporkan", st, 202, b, "")
	if b["status"] != "merchant dibekukan sementara" {
		t.Fatalf("laporkan: %v", b)
	}
	// Merchant yang dibekukan tidak bisa membuat QR baru dan QR lamanya tidak bisa dibayar.
	st, _, b = l.kirim("POST", "/qr", l.token[merchant], `{"jenis":"statis"}`)
	harapStatus(t, "QR baru oleh merchant dibekukan", st, 403, b, "/problems/akun-dibekukan")
	st, _, b = l.kirim("POST", "/qr/"+sid+"/bayar", l.token[pembeli], `{"nominal":10000}`)
	harapStatus(t, "bayar QR merchant dibekukan", st, 404, b, "/problems/tidak-ditemukan")
}
