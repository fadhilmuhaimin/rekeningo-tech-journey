// Program dasbor adalah dasbor kecil Wulan untuk warung (M25, plan/CERITA-TAHAP-3.md bagian 4), di atas schema
// yang sama dengan labs/api-t3 (tahap3; dibuat dan diisi lewat labs/api-t3/dasar_t3.py, tanpa migrasi sendiri).
// Satu binary, lima sumbu mode lewat flag, independen satu sama lain:
//
//	-escape rentan     keterangan jurnal ditampilkan lewat innerHTML tanpa escape (M25)
//	-csp mati          tanpa header Content-Security-Policy (bawaan: nonce per respons, R3-19)
//	-cookie rentan     cookie sesi bernama "sesi" tanpa HttpOnly dan tanpa awalan __Host- (bawaan: __Host-sesi + HttpOnly)
//	-samesite none     cookie SameSite=None;Secure, bisa dikirim lintas situs (bawaan: SameSite=Lax)
//	-token tidak       endpoint ubah menu tidak memeriksa token CSRF, Origin, atau Sec-Fetch-Site (bawaan: ketiganya diperiksa, R3-19)
//
// -samesite dan -token sengaja dipisah (bukan satu nilai "csrf" berjenjang): SameSite=Lax saja sudah menahan
// permintaan lintas situs sebelum pernah sampai ke pemeriksaan token (run.py skenario B dan csrf.txt bagian B),
// jadi mengukur token/Origin/Sec-Fetch-Site secara terpisah butuh kombinasi SameSite=None + token wajib (skenario D).
//
// Server ini hanya boleh mendengar di loopback atau *.localhost (internal/pagar), sama dengan labs/t3-mitm.
package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"html"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"golang.org/x/crypto/bcrypt"

	"lab/t3dasbor/internal/pagar"
)

type sesi struct {
	AkunID   int64
	Nama     string
	CsrfHash string
}

type server struct {
	db       *sql.DB
	escape   string // "" aman | "rentan"
	csp      string // "" aktif | "mati"
	cookie   string // "" aman | "rentan"
	samesite string // "" Lax | "none" None;Secure
	token    string // "" wajib (Origin+Sec-Fetch-Site+token) | "tidak"

	mu   sync.Mutex
	sesi map[string]sesi
}

func tokenAcak() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		log.Fatalf("GAGAL: acak token: %v", err)
	}
	return hex.EncodeToString(b)
}

func hashToken(t string) string {
	h := sha256.Sum256([]byte(t))
	return hex.EncodeToString(h[:])
}

const namaCookieAman = "__Host-sesi"
const namaCookieRentan = "sesi"

func (s *server) namaCookie() string {
	if s.cookie == "rentan" {
		return namaCookieRentan
	}
	return namaCookieAman
}

// aturCookie menulis Set-Cookie sesi. SameSite dan Secure ditentukan sumbu -samesite (RFC 6265bis §4.1.2.7: cookie
// SameSite=None wajib Secure, kalau tidak browser membuang cookie itu seluruhnya); HttpOnly dan awalan __Host-
// ditentukan sumbu -cookie, independen dari -samesite dan -token.
func (s *server) aturCookie(w http.ResponseWriter, token string, sampai time.Time) {
	sameSite, secure := http.SameSiteLaxMode, s.cookie != "rentan"
	if s.samesite == "none" {
		sameSite, secure = http.SameSiteNoneMode, true
	}
	http.SetCookie(w, &http.Cookie{
		Name: s.namaCookie(), Value: token, Path: "/", Expires: sampai,
		HttpOnly: s.cookie != "rentan", Secure: secure, SameSite: sameSite,
	})
}

func (s *server) hapusCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{Name: s.namaCookie(), Value: "", Path: "/", MaxAge: -1,
		HttpOnly: s.cookie != "rentan", Secure: s.cookie != "rentan", SameSite: http.SameSiteLaxMode})
}

func (s *server) sesiDariRequest(r *http.Request) (sesi, bool) {
	c, err := r.Cookie(s.namaCookie())
	if err != nil || c.Value == "" {
		return sesi{}, false
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	x, ok := s.sesi[c.Value]
	return x, ok
}

const halamanLogin = `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><title>Masuk dasbor warung</title>
<style>body{font-family:system-ui,sans-serif;max-width:420px;margin:48px auto;color:#1a1a1a}
input{display:block;width:100%%;margin:4px 0 16px;padding:8px;box-sizing:border-box}
button{padding:8px 16px}.g{color:#b00020}</style></head>
<body><h1>Dasbor warung</h1>
%s
<form method="post" action="/login">
<label>Email<input name="email" type="email" required></label>
<label>Password<input name="password" type="password" required></label>
<button type="submit">Masuk</button>
</form></body></html>`

func (s *server) loginPage(w http.ResponseWriter, r *http.Request) {
	pesan := ""
	if r.URL.Query().Get("gagal") == "1" {
		pesan = `<p class="g">Email atau password salah.</p>`
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprintf(w, halamanLogin, pesan)
}

func (s *server) loginSubmit(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "form rusak", http.StatusBadRequest)
		return
	}
	email, password := r.FormValue("email"), r.FormValue("password")
	var id int64
	var nama, hash string
	err := s.db.QueryRowContext(r.Context(),
		`SELECT id, nama, password_hash FROM akun WHERE email = $1 AND jenis = 'warung'`, email).
		Scan(&id, &nama, &hash)
	if errors.Is(err, sql.ErrNoRows) || (err == nil && bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil) {
		http.Redirect(w, r, "/login?gagal=1", http.StatusSeeOther)
		return
	}
	if err != nil {
		http.Error(w, "gagal database", http.StatusInternalServerError)
		return
	}
	token, csrf := tokenAcak(), tokenAcak()
	sampai := time.Now().Add(8 * time.Hour)
	s.mu.Lock()
	s.sesi[token] = sesi{AkunID: id, Nama: nama, CsrfHash: hashToken(csrf)}
	s.mu.Unlock()
	s.aturCookie(w, token, sampai)
	// Token CSRF dikirim lewat query singkat sekali pakai di redirect, lalu disimpan halaman di variabel JS
	// (bukan localStorage): mirip pola api-t3 LoginWeb yang mengirim csrf di body JSON (internal/service/sesi.go).
	http.Redirect(w, r, "/dasbor?csrf="+csrf, http.StatusSeeOther)
}

func (s *server) logout(w http.ResponseWriter, r *http.Request) {
	if x, ok := s.sesiDariRequest(r); ok {
		s.mu.Lock()
		for tok, v := range s.sesi {
			if v == x {
				delete(s.sesi, tok)
			}
		}
		s.mu.Unlock()
	}
	s.hapusCookie(w)
	http.Redirect(w, r, "/login", http.StatusSeeOther)
}

type baris struct {
	ID         int64     `json:"id"`
	Jenis      string    `json:"jenis"`
	Nominal    int64     `json:"nominal"`
	Keterangan string    `json:"keterangan"`
	Waktu      time.Time `json:"waktu"`
}

// riwayat: uang masuk ke buku akun warung, sama persis dengan query RiwayatPenerimaan api-t3
// (labs/api-t3/internal/repo/katalog.go), supaya catatan M25 yang ditulis lewat api-t3 nyata di sini.
func (s *server) riwayat(ctx context.Context, akunID int64) ([]baris, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT j.id, j.jenis, p.jumlah, j.keterangan, p.dibuat
		FROM buku b JOIN posting p ON p.buku_id = b.id AND p.jumlah > 0 JOIN jurnal j ON j.id = p.jurnal_id
		WHERE b.akun_id = $1 ORDER BY p.dibuat DESC, p.id DESC LIMIT 20`, akunID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []baris{}
	for rows.Next() {
		var b baris
		if err := rows.Scan(&b.ID, &b.Jenis, &b.Nominal, &b.Keterangan, &b.Waktu); err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, rows.Err()
}

func (s *server) apiRiwayat(w http.ResponseWriter, r *http.Request) {
	x, ok := s.sesiDariRequest(r)
	if !ok {
		http.Error(w, `{"error":"belum login"}`, http.StatusUnauthorized)
		return
	}
	rows, err := s.riwayat(r.Context(), x.AkunID)
	if err != nil {
		http.Error(w, `{"error":"database"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rows) //nolint:errcheck
}

// Dua baris render yang dipertukarkan sesuai -escape: rentan menulis keterangan lewat innerHTML tanpa escape
// (M25), aman memakai textContent (tidak pernah ditafsir sebagai HTML, apa pun isinya).
const renderRentan = `b.innerHTML = row.jenis + ': Rp' + row.nominal + ' — ' + row.keterangan;`
const renderAman = `var kiri = document.createElement('span'); kiri.textContent = row.jenis + ': Rp' + row.nominal + ' — ';
      var ket = document.createElement('span'); ket.textContent = row.keterangan;
      b.appendChild(kiri); b.appendChild(ket);`

const halamanDasbor = `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><title>Riwayat penerimaan</title>
<style%[1]s>body{font-family:system-ui,sans-serif;max-width:560px;margin:32px auto;color:#1a1a1a}
.baris{padding:8px 0;border-bottom:1px solid #ddd}form.menu{margin-top:24px;padding:12px;border:1px solid #ddd}
input{margin:0 8px 0 0}</style></head>
<body><h1>Riwayat penerimaan — %[2]s</h1>
<div id="daftar">(memuat…)</div>
<form class="menu" id="form-harga">
<label>Ubah harga Nasi goreng (produk 1): Rp<input name="harga" type="number" value="25000" required></label>
<button type="submit">Simpan</button> <span id="hasil-harga"></span>
</form>
<p><a href="/logout">Keluar</a></p>
<script%[1]s>
var csrf = %[3]s;
fetch('/api/riwayat', {credentials: 'same-origin'}).then(function(r){ return r.json(); }).then(function(rows){
  var c = document.getElementById('daftar');
  c.innerHTML = '';
  rows.forEach(function(row){
    var b = document.createElement('div');
    b.className = 'baris';
    %[4]s
    c.appendChild(b);
  });
  if (rows.length === 0) { c.textContent = '(belum ada penerimaan)'; }
});
document.getElementById('form-harga').addEventListener('submit', function(ev){
  ev.preventDefault();
  var harga = document.querySelector('[name=harga]').value;
  fetch('/api/menu/harga', {method: 'POST', credentials: 'same-origin',
    headers: {'Content-Type': 'application/json', 'X-CSRF-Token': csrf},
    body: JSON.stringify({produk_id: 1, harga: Number(harga)})}).then(function(r){
      document.getElementById('hasil-harga').textContent = r.ok ? 'tersimpan' : 'ditolak: ' + r.status;
    });
});
</script>
</body></html>`

func (s *server) dasborPage(w http.ResponseWriter, r *http.Request) {
	x, ok := s.sesiDariRequest(r)
	if !ok {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}
	render := renderAman
	if s.escape == "rentan" {
		render = renderRentan
	}
	nonceAttr, csrfJS := "", "null"
	if q := r.URL.Query().Get("csrf"); q != "" {
		csrfJS = strconv.Quote(q)
	}
	// Token tidak dikirim ulang lewat query sesudah /dasbor pertama; halaman nyata menyimpannya di sessionStorage
	// tab itu. Lab ini memakai variabel global sekali muat; cukup untuk merekam bahwa token dibutuhkan.
	if s.csp != "mati" {
		nonce := tokenAcak()[:32]
		nonceAttr = ` nonce="` + nonce + `"`
		w.Header().Set("Content-Security-Policy",
			"default-src 'none'; script-src 'nonce-"+nonce+"'; style-src 'nonce-"+nonce+"'; "+
				"connect-src 'self'; img-src 'self'; form-action 'self'; base-uri 'none'")
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprintf(w, halamanDasbor, nonceAttr, html.EscapeString(x.Nama), csrfJS, render)
}

// csrfSah memeriksa Sec-Fetch-Site, Origin, dan token CSRF, sama dengan labs/api-t3/internal/handler/handler_t3.go
// csrfSah (OWASP CSRF Prevention Cheat Sheet, R3-19). Dipanggil hanya saat -token bukan "tidak".
func (s *server) csrfSah(r *http.Request, x sesi) bool {
	if site := r.Header.Get("Sec-Fetch-Site"); site != "" && site != "same-origin" && site != "none" {
		return false
	}
	if o := r.Header.Get("Origin"); o != "" && o != "http://"+r.Host {
		return false
	}
	tok := r.Header.Get("X-CSRF-Token")
	return tok != "" && subtle.ConstantTimeCompare([]byte(hashToken(tok)), []byte(x.CsrfHash)) == 1
}

type ubahHargaIn struct {
	ProdukID int64 `json:"produk_id"`
	Harga    int64 `json:"harga"`
}

// apiUbahHarga adalah sasaran CSRF lab ini: "ubah menu" (PATCH /produk di api-t3, disederhanakan di sini jadi satu
// kolom harga). Gerbangnya sesuai -token (lihat komentar paket).
func (s *server) apiUbahHarga(w http.ResponseWriter, r *http.Request) {
	x, ok := s.sesiDariRequest(r)
	if !ok {
		http.Error(w, `{"error":"belum login"}`, http.StatusUnauthorized)
		return
	}
	if s.token != "tidak" && !s.csrfSah(r, x) {
		w.WriteHeader(http.StatusForbidden)
		fmt.Fprint(w, `{"error":"csrf"}`)
		return
	}
	var in ubahHargaIn
	ct := r.Header.Get("Content-Type")
	if strings.HasPrefix(ct, "application/json") {
		if json.NewDecoder(r.Body).Decode(&in) != nil {
			http.Error(w, `{"error":"json rusak"}`, http.StatusBadRequest)
			return
		}
	} else {
		if err := r.ParseForm(); err != nil {
			http.Error(w, `{"error":"form rusak"}`, http.StatusBadRequest)
			return
		}
		in.ProdukID, _ = strconv.ParseInt(r.FormValue("produk_id"), 10, 64)
		in.Harga, _ = strconv.ParseInt(r.FormValue("harga"), 10, 64)
	}
	if in.ProdukID <= 0 || in.Harga <= 0 {
		http.Error(w, `{"error":"produk_id dan harga wajib positif"}`, http.StatusUnprocessableEntity)
		return
	}
	res, err := s.db.ExecContext(r.Context(),
		`UPDATE produk SET harga = $1, versi = versi + 1, diubah = now() WHERE id = $2 AND akun_id = $3`,
		in.Harga, in.ProdukID, x.AkunID)
	if err != nil {
		http.Error(w, `{"error":"database"}`, http.StatusInternalServerError)
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		http.Error(w, `{"error":"produk bukan milik akun ini"}`, http.StatusForbidden)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprint(w, `{"ok":true}`)
}

func main() {
	alamat := flag.String("addr", "", "alamat server, wajib diisi (loopback atau *.localhost saja; run.py mengisi port_lab)")
	escape := flag.String("escape", "", "tampilan keterangan: \"\" (aman, textContent) | rentan (innerHTML, M25)")
	csp := flag.String("csp", "", "Content-Security-Policy: \"\" (aktif, nonce per respons) | mati")
	cookie := flag.String("cookie", "", "cookie sesi: \"\" (__Host-sesi, HttpOnly) | rentan (sesi, tanpa HttpOnly)")
	samesite := flag.String("samesite", "", "atribut SameSite cookie: \"\" (Lax) | none (None;Secure, bisa lintas situs)")
	token := flag.String("token", "", "token CSRF dan Origin/Sec-Fetch-Site di /api/menu/harga: \"\" (wajib) | tidak")
	flag.Parse()
	for _, v := range []string{*escape, *cookie} {
		if v != "" && v != "rentan" {
			log.Fatalf("GAGAL: nilai tidak dikenal %q (pilihan: \"\" atau rentan)", v)
		}
	}
	if *csp != "" && *csp != "mati" {
		log.Fatalf("GAGAL: -csp %q tidak dikenal (pilihan: \"\" atau mati)", *csp)
	}
	if *samesite != "" && *samesite != "none" {
		log.Fatalf("GAGAL: -samesite %q tidak dikenal (pilihan: \"\" atau none)", *samesite)
	}
	if *token != "" && *token != "tidak" {
		log.Fatalf("GAGAL: -token %q tidak dikenal (pilihan: \"\" atau tidak)", *token)
	}
	if *alamat == "" {
		log.Fatal("GAGAL: -addr wajib diisi")
	}
	if err := pagar.Loopback(*alamat); err != nil {
		log.Fatalf("GAGAL: %v", err)
	}
	dsn := strOrFatal("DATABASE_URL")
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("GAGAL: buka database: %v", err)
	}
	if err := db.Ping(); err != nil {
		log.Fatalf("GAGAL: sambung database: %v", err)
	}
	s := &server{db: db, escape: *escape, csp: *csp, cookie: *cookie, samesite: *samesite, token: *token, sesi: map[string]sesi{}}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /login", s.loginPage)
	mux.HandleFunc("POST /login", s.loginSubmit)
	mux.HandleFunc("GET /logout", s.logout)
	mux.HandleFunc("GET /dasbor", s.dasborPage)
	mux.HandleFunc("GET /api/riwayat", s.apiRiwayat)
	mux.HandleFunc("POST /api/menu/harga", s.apiUbahHarga)
	log.Printf("dasbor mendengar di %s (escape=%q csp=%q cookie=%q samesite=%q token=%q)", *alamat, *escape, *csp, *cookie, *samesite, *token)
	log.Fatal(http.ListenAndServe(*alamat, mux))
}

func strOrFatal(nama string) string {
	v := os.Getenv(nama)
	if v == "" {
		log.Fatalf("GAGAL: variabel %s wajib diisi", nama)
	}
	return v
}
