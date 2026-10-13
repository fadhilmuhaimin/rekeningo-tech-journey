// Lab c4-ratelimit/login · pengaman login untuk M16 (Tahap 2).
//
// Yang ditunjukkan lab ini, semuanya terhadap server lokal di 127.0.0.1 dengan data fiktif:
//   - hash password argon2id dengan parameter dari RFC 9106 dan OWASP (lihat PARAMETER_HASH);
//   - wajib ganti password saat login pertama (kolom akun.wajib_ganti_password dari api-t2 000009);
//   - kunci per akun di database (akun.gagal_login, akun.terkunci_sampai) dengan kunci bertahap;
//   - rate limit dua lapis di memori (per IP dan per akun), tanpa Redis (ADR 20);
//   - daftar password bocor fiktif dipakai sebagai blocklist dan sebagai wordlist penyerang.
//
// Server ini memakai jam tiruan yang disuntikkan lewat POST /lab/jam (hanya bila LAB_JAM=1),
// jadi rekaman tidak bergantung pada tidur sungguhan dan bisa diulang identik.
//
// IP client ditentukan oleh IP_SUMBER:
//
//	koneksi        ambil dari alamat koneksi (RemoteAddr). Aman: client tidak bisa memalsukannya.
//	xff-mentah     percaya X-Forwarded-For dari client mana pun (CELAH; lihat rekaman bagian E).
//	proxy          percaya X-Forwarded-For HANYA bila request datang dari reverse proxy kita. Di lab
//	               semua koneksi berasal dari 127.0.0.1, jadi proxy dikenali dari header X-Lab-Proxy
//	               berisi rahasia bersama PROXY_RAHASIA (acak per run, tidak pernah ditulis ke repo).
//	               Di produksi: percaya hanya bila alamat koneksi adalah alamat proxy kita.
//
// X-Lab-IP adalah IP client yang ditiru lab (berperan sebagai isi X-Forwarded-For).
// Header X-Lab-* dan endpoint /lab/* hanya untuk lab ini.
package main

import (
	"bufio"
	"context"
	"crypto/rand"
	"crypto/subtle"
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/argon2"
)

// --8<-- [start:parameter-hash]
// Parameter argon2id. RFC 9106 Section 4 menyebut dua pilihan: pertama t=1, p=4, m=2 GiB;
// kedua t=3, p=4, m=64 MiB "bila memori jauh lebih sedikit". Kita pakai pilihan kedua: satu VPS
// berbagi memori dengan PostgreSQL, jadi 2 GiB per hash tidak realistis. 64 MiB masih jauh di atas
// minimum OWASP (19 MiB, t=2, p=1). Salt 128-bit dan tag 256-bit mengikuti RFC 9106 Section 4.
// Sumber: RFC 9106 §4 (rfc-editor.org/rfc/rfc9106, 2021); OWASP Password Storage Cheat Sheet
// (cheatsheetseries.owasp.org, diakses 2026-10-14); golang.org/x/crypto/argon2 IDKey (v0.57.0).
const (
	hashWaktu   uint32 = 3     // t: jumlah iterasi (pass)
	hashMemori  uint32 = 65536 // m: KiB = 64 MiB
	hashUtas    uint8  = 4     // p: lanes
	hashPanjang uint32 = 32    // tag 256-bit
	saltPanjang        = 16    // 128-bit
)

// --8<-- [end:parameter-hash]

// --8<-- [start:ambang]
// Kunci per akun di database. OWASP Authentication Cheat Sheet: penghitung gagal melekat pada akun,
// bukan pada IP, dan durasi kunci boleh bertahap (menggandakan). NIST SP 800-63B §3.2.2 menyebut
// batas atas 100 percobaan gagal berturut per authenticator; kita pilih lebih ketat untuk lab.
const (
	ambangAkun       = 5                // gagal berturut sebelum akun dikunci
	kunciDasar       = 60 * time.Second // durasi kunci pertama
	kunciMaksTingkat = 5                // kunci maksimum = kunciDasar << 5 = 32 menit
)

// --8<-- [end:ambang]

// ==== jam tiruan ====

var jamMS atomic.Int64 // 0 = pakai time.Now()

func sekarang() time.Time {
	if ms := jamMS.Load(); ms != 0 {
		return time.UnixMilli(ms).UTC()
	}
	return time.Now().UTC()
}

// ==== rate limit di memori (token bucket) ====

// --8<-- [start:bucket]
type bucket struct {
	token    float64
	terakhir time.Time
}

type pembatas struct {
	mu        sync.Mutex
	kapasitas float64 // token maksimum (burst)
	perDetik  float64 // laju isi ulang
	bucket    map[string]*bucket
}

func pembatasBaru(kapasitas, perDetik float64) *pembatas {
	return &pembatas{kapasitas: kapasitas, perDetik: perDetik, bucket: map[string]*bucket{}}
}

// izinkan mengambil satu token dari bucket milik key. Bila kosong, kembalikan lama menunggu
// token berikutnya. Ini hidup di memori satu proses: restart mengosongkannya, dan dua instance
// punya bucket terpisah (ADR 20; batasnya ditunjukkan di rekaman bagian F).
func (p *pembatas) izinkan(key string, now time.Time) (bool, time.Duration) {
	p.mu.Lock()
	defer p.mu.Unlock()
	e, ada := p.bucket[key]
	if !ada {
		e = &bucket{token: p.kapasitas, terakhir: now}
		p.bucket[key] = e
	}
	e.token = math.Min(p.kapasitas, e.token+now.Sub(e.terakhir).Seconds()*p.perDetik)
	e.terakhir = now
	if e.token >= 1 {
		e.token--
		return true, 0
	}
	return false, time.Duration((1 - e.token) / p.perDetik * float64(time.Second))
}

// --8<-- [end:bucket]

// ==== hash password argon2id, format PHC ====

// --8<-- [start:hash]
func enkodeHash(password string, salt []byte) string {
	tag := argon2.IDKey([]byte(password), salt, hashWaktu, hashMemori, hashUtas, hashPanjang)
	b64 := base64.RawStdEncoding.EncodeToString
	return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, hashMemori, hashWaktu, hashUtas, b64(salt), b64(tag))
}

// cocokHash membandingkan password dengan hash tersimpan, waktu-konstan terhadap isi tag.
func cocokHash(password, hash string) bool {
	hitungHash.Add(1) // penghitung lab: membuktikan request yang ditolak rate limit tidak menjalankan argon2id
	bagian := strings.Split(hash, "$")
	if len(bagian) != 6 || bagian[1] != "argon2id" {
		return false
	}
	var m, t uint32
	var p uint8
	if _, err := fmt.Sscanf(bagian[3], "m=%d,t=%d,p=%d", &m, &t, &p); err != nil {
		return false
	}
	salt, err1 := base64.RawStdEncoding.DecodeString(bagian[4])
	tag, err2 := base64.RawStdEncoding.DecodeString(bagian[5])
	if err1 != nil || err2 != nil || p < 1 || len(tag) != int(hashPanjang) {
		return false
	}
	ulang := argon2.IDKey([]byte(password), salt, t, m, p, hashPanjang)
	return subtle.ConstantTimeCompare(ulang, tag) == 1
}

// --8<-- [end:hash]

// saltAcak membuat salt baru dari crypto/rand untuk setiap hash. Rekaman lab tetap identik karena
// tidak pernah mencetak hash; salt tetap atau diturunkan dari id akun tidak dipakai di mana pun.
func saltAcak() []byte {
	b := make([]byte, saltPanjang)
	if _, err := rand.Read(b); err != nil {
		log.Fatalf("crypto/rand: %v", err)
	}
	return b
}

// hashPalsu dipakai saat email tidak terdaftar atau akun terkunci, supaya waktu respons mirip
// password salah.
var hashPalsu = enkodeHash("bukan-password-siapa-pun", saltAcak())

// Penghitung untuk rekaman lab (GET /lab/hitung, hanya bila LAB_JAM=1).
var hitungHash, hitungQuery atomic.Int64

// ==== blocklist password bocor ====

// Daftar ikut di dalam binary (go:embed), jadi server tidak membaca path dari luar saat jalan.
//
//go:embed daftar-bocor.txt
var teksBocor string

var daftarBocor = map[string]bool{}

func muatBocor() error {
	s := bufio.NewScanner(strings.NewReader(teksBocor))
	for s.Scan() {
		baris := strings.TrimSpace(s.Text())
		if baris == "" || strings.HasPrefix(baris, "#") {
			continue
		}
		daftarBocor[strings.ToLower(baris)] = true
	}
	return s.Err()
}

// ==== server ====

type server struct {
	db           *pgxpool.Pool
	mode         string // "per-akun" atau "dua-lapis"
	ipSumber     string // "koneksi", "xff-mentah", "proxy"
	proxyRahasia string // isi X-Lab-Proxy yang hanya diketahui proxy kita (mode proxy)
	perIP        *pembatas
	perAkun      *pembatas
}

type problem struct {
	Type   string `json:"type"`
	Title  string `json:"title"`
	Status int    `json:"status"`
	Detail string `json:"detail,omitempty"`
	Tunggu int    `json:"retry_after,omitempty"`
}

func tulis(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func tulisProblem(w http.ResponseWriter, p problem) {
	if p.Tunggu > 0 {
		w.Header().Set("Retry-After", strconv.Itoa(p.Tunggu))
	}
	tulis(w, p.Status, p)
}

// clientIP menentukan IP client sesuai IP_SUMBER. X-Lab-IP meniru isi X-Forwarded-For.
func (s *server) clientIP(r *http.Request) string {
	xff := r.Header.Get("X-Lab-IP")
	switch s.ipSumber {
	case "xff-mentah":
		// CELAH: percaya header dari client mana pun. Penyerang bisa menukar IP tiap request.
		if xff != "" {
			return xff
		}
	case "proxy":
		// Hanya percaya X-Lab-IP bila request datang lewat proxy kita: X-Lab-Proxy harus berisi
		// rahasia bersama, dibandingkan waktu-konstan. Nilai tebakan client diabaikan (rekaman bagian E).
		penanda := r.Header.Get("X-Lab-Proxy")
		if xff != "" && s.proxyRahasia != "" &&
			subtle.ConstantTimeCompare([]byte(penanda), []byte(s.proxyRahasia)) == 1 {
			return xff
		}
	}
	// "koneksi" dan fallback: alamat koneksi, tidak bisa dipalsukan client.
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

// durasiKunci menghitung lama kunci bertahap dari jumlah gagal berturut (menggandakan).
func durasiKunci(gagal int) time.Duration {
	tingkat := gagal - ambangAkun
	if tingkat < 0 {
		tingkat = 0
	}
	if tingkat > kunciMaksTingkat {
		tingkat = kunciMaksTingkat
	}
	return kunciDasar << uint(tingkat)
}

type akun struct {
	id       int64
	hash     string
	wajib    bool
	gagal    int
	terkunci *time.Time
}

func (s *server) akunLewatEmail(ctx context.Context, email string) (*akun, error) {
	hitungQuery.Add(1)
	var a akun
	err := s.db.QueryRow(ctx,
		`SELECT id, password_hash, wajib_ganti_password, gagal_login, terkunci_sampai
		   FROM akun WHERE email = $1`, email).
		Scan(&a.id, &a.hash, &a.wajib, &a.gagal, &a.terkunci)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

// --8<-- [start:login]
// periksaMasuk menjalankan semua pengaman sebelum password dianggap benar. Dipakai /login dan
// /ganti-password, jadi endpoint yang memeriksa password lama tidak bisa dipakai untuk menebak
// tanpa batas. Bila false, response sudah ditulis.
func (s *server) periksaMasuk(w http.ResponseWriter, r *http.Request, email, password string) (*akun, bool) {
	now := sekarang()
	ip := s.clientIP(r)

	// Lapis memori (hanya mode dua-lapis): dicek sebelum menyentuh database dan sebelum argon2id,
	// jadi banjir percobaan dari satu IP tidak memakai CPU hashing dan tidak sempat menebak.
	if s.mode == "dua-lapis" {
		if ok, tunggu := s.perIP.izinkan("ip:"+ip, now); !ok {
			tulisProblem(w, problem{Type: "/problems/rate-limit-ip", Title: "Terlalu banyak percobaan dari alamat ini",
				Status: 429, Tunggu: detik(tunggu)})
			return nil, false
		}
		if ok, tunggu := s.perAkun.izinkan("akun:"+email, now); !ok {
			tulisProblem(w, problem{Type: "/problems/rate-limit-akun", Title: "Terlalu banyak percobaan untuk akun ini",
				Status: 429, Tunggu: detik(tunggu)})
			return nil, false
		}
	}

	a, err := s.akunLewatEmail(r.Context(), email)
	if err != nil {
		// Email tidak terdaftar: tetap jalankan argon2id sekali supaya waktu respons mirip,
		// dan jawab 401 yang sama dengan password salah (jangan bantu penyerang membedakan).
		cocokHash(password, hashPalsu)
		tulisProblem(w, problem{Type: "/problems/login-gagal", Title: "Email atau password salah", Status: 401})
		return nil, false
	}

	// Kunci per akun di database. Inilah yang membuat "akun Ani terkunci": bila ini satu-satunya
	// pertahanan, penyerang bisa mengunci akun orang lain dengan sengaja gagal (denial of service).
	// Jawabannya sama dengan password salah, termasuk waktu hash: pesan "akun terkunci" akan memberi
	// tahu penyerang bahwa email itu terdaftar (OWASP Authentication Cheat Sheet, pesan error generik).
	if a.terkunci != nil && a.terkunci.After(now) {
		cocokHash(password, hashPalsu)
		tulisProblem(w, problem{Type: "/problems/login-gagal", Title: "Email atau password salah", Status: 401})
		return nil, false
	}

	if !cocokHash(password, a.hash) {
		if err := s.catatGagal(r.Context(), a.id, now); err != nil {
			// Gagal mencatat = tolak (fail closed), jangan diam-diam memberi percobaan gratis.
			tulisProblem(w, problem{Type: "/problems/internal", Title: "Gagal mencatat percobaan", Status: 500})
			return nil, false
		}
		tulisProblem(w, problem{Type: "/problems/login-gagal", Title: "Email atau password salah", Status: 401})
		return nil, false
	}

	// Benar: reset penghitung dan kunci.
	if _, err := s.db.Exec(r.Context(),
		`UPDATE akun SET gagal_login = 0, terkunci_sampai = NULL WHERE id = $1`, a.id); err != nil {
		tulisProblem(w, problem{Type: "/problems/internal", Title: "Gagal menyimpan", Status: 500})
		return nil, false
	}
	return a, true
}

// catatGagal menaikkan penghitung di database dalam satu UPDATE (bukan baca di Go lalu tulis), jadi
// percobaan yang datang bersamaan tidak saling menimpa dan ambang tidak bisa dilewati dengan paralel.
func (s *server) catatGagal(ctx context.Context, id int64, now time.Time) error {
	var gagal int
	if err := s.db.QueryRow(ctx,
		`UPDATE akun SET gagal_login = gagal_login + 1 WHERE id = $1 RETURNING gagal_login`, id).
		Scan(&gagal); err != nil {
		return err
	}
	if gagal < ambangAkun {
		return nil
	}
	// GREATEST: kunci yang lebih panjang dari percobaan bersamaan tidak tertimpa yang lebih pendek.
	_, err := s.db.Exec(ctx,
		`UPDATE akun SET terkunci_sampai = GREATEST(terkunci_sampai, $2) WHERE id = $1`,
		id, now.Add(durasiKunci(gagal)))
	return err
}

func (s *server) login(w http.ResponseWriter, r *http.Request) {
	var in struct{ Email, Password string }
	r.Body = http.MaxBytesReader(w, r.Body, 4096) // password raksasa tidak boleh sampai ke argon2id
	if json.NewDecoder(r.Body).Decode(&in) != nil || in.Email == "" || in.Password == "" {
		tulisProblem(w, problem{Type: "/problems/body", Title: "Body harus JSON berisi email dan password", Status: 400})
		return
	}
	a, ok := s.periksaMasuk(w, r, in.Email, in.Password)
	if !ok {
		return
	}
	if a.wajib {
		// Login diterima, tapi hanya boleh ganti password dulu (password pertama wajib diganti).
		tulis(w, 200, map[string]any{"ok": true, "wajib_ganti_password": true,
			"pesan": "Ganti password dulu sebelum memakai akun"})
		return
	}
	tulis(w, 200, map[string]any{"ok": true, "wajib_ganti_password": false})
}

// --8<-- [end:login]

// --8<-- [start:ganti-password]
func (s *server) gantiPassword(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email        string `json:"email"`
		PasswordLama string `json:"password_lama"`
		PasswordBaru string `json:"password_baru"`
	}
	r.Body = http.MaxBytesReader(w, r.Body, 4096)
	if json.NewDecoder(r.Body).Decode(&in) != nil || in.Email == "" || in.PasswordLama == "" {
		tulisProblem(w, problem{Type: "/problems/body", Title: "Body tidak lengkap", Status: 400})
		return
	}
	// Password lama melewati pengaman yang sama dengan /login (rate limit, kunci, penghitung gagal).
	a, ok := s.periksaMasuk(w, r, in.Email, in.PasswordLama)
	if !ok {
		return
	}
	// NIST SP 800-63B-4 §3.1.1.2: password faktor tunggal minimal 15 karakter; cek lawan daftar bocor.
	if len([]rune(in.PasswordBaru)) < 15 {
		tulisProblem(w, problem{Type: "/problems/password-lemah", Title: "Password baru minimal 15 karakter", Status: 422})
		return
	}
	if daftarBocor[strings.ToLower(in.PasswordBaru)] {
		tulisProblem(w, problem{Type: "/problems/password-bocor",
			Title: "Password baru ada di daftar password yang pernah bocor; pilih yang lain", Status: 422})
		return
	}
	hash := enkodeHash(in.PasswordBaru, saltAcak())
	_, err := s.db.Exec(r.Context(),
		`UPDATE akun SET password_hash = $1, wajib_ganti_password = false WHERE id = $2`, hash, a.id)
	if err != nil {
		tulisProblem(w, problem{Type: "/problems/internal", Title: "Gagal menyimpan", Status: 500})
		return
	}
	tulis(w, 200, map[string]any{"ok": true})
}

// --8<-- [end:ganti-password]

func (s *server) labJam(w http.ResponseWriter, r *http.Request) {
	var in struct{ Ms int64 }
	if json.NewDecoder(r.Body).Decode(&in) != nil {
		tulisProblem(w, problem{Type: "/problems/body", Title: "Body tidak valid", Status: 400})
		return
	}
	jamMS.Store(in.Ms)
	tulis(w, 200, map[string]any{"ok": true, "sekarang": sekarang().Format(time.RFC3339)})
}

func labHitung(w http.ResponseWriter, _ *http.Request) {
	tulis(w, 200, map[string]any{"argon2id": hitungHash.Load(), "query_akun": hitungQuery.Load()})
}

func detik(d time.Duration) int {
	return int(math.Ceil(d.Seconds()))
}

func main() {
	ctx := context.Background()
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		log.Fatal("DATABASE_URL kosong")
	}
	if err := muatBocor(); err != nil {
		log.Fatalf("muat daftar bocor: %v", err)
	}

	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		log.Fatalf("pool: %v", err)
	}
	defer pool.Close()

	if len(os.Args) > 1 && os.Args[1] == "-seed" {
		if err := seed(ctx, pool); err != nil {
			log.Fatalf("seed: %v", err)
		}
		fmt.Println("seed selesai")
		return
	}

	perIP := pembatasBaru(10, 10.0/60) // 10 percobaan burst, isi ulang 10 per menit
	perAkun := pembatasBaru(5, 5.0/60) // 5 percobaan burst per akun, isi ulang 5 per menit
	s := &server{
		db:           pool,
		mode:         getenvDefault("MODE", "dua-lapis"),
		ipSumber:     getenvDefault("IP_SUMBER", "koneksi"),
		proxyRahasia: os.Getenv("PROXY_RAHASIA"),
		perIP:        perIP,
		perAkun:      perAkun,
	}
	if s.ipSumber == "proxy" && len(s.proxyRahasia) < 32 {
		log.Fatal("IP_SUMBER=proxy butuh PROXY_RAHASIA acak minimal 32 karakter")
	}

	mux := http.NewServeMux()
	mux.HandleFunc("POST /login", s.login)
	mux.HandleFunc("POST /ganti-password", s.gantiPassword)
	if os.Getenv("LAB_JAM") == "1" {
		mux.HandleFunc("POST /lab/jam", s.labJam)
		mux.HandleFunc("GET /lab/hitung", labHitung)
	}

	port := getenvDefault("PORT", "18170")
	log.Printf("c4-login mendengar di 127.0.0.1:%s (mode=%s ip_sumber=%s)", port, s.mode, s.ipSumber)
	srv := &http.Server{
		Addr:              "127.0.0.1:" + port,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second, // client lambat tidak boleh menahan koneksi tanpa batas
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	log.Fatal(srv.ListenAndServe()) // port terpakai = gagal keras
}

func getenvDefault(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}
