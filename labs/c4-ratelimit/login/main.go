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
//   koneksi        ambil dari alamat koneksi (RemoteAddr). Aman: client tidak bisa memalsukannya.
//   xff-mentah     percaya X-Forwarded-For dari client mana pun (CELAH; lihat rekaman bagian E).
//   proxy          percaya X-Forwarded-For HANYA bila request membawa penanda proxy tepercaya
//                  (X-Lab-Proxy), yang di produksi hanya dipasang oleh reverse proxy yang kita kelola.
// X-Lab-IP adalah IP client yang ditiru lab (berperan sebagai isi X-Forwarded-For).
package main

import (
	"bufio"
	"context"
	"crypto/sha256"
	"crypto/subtle"
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
	ambangAkun     = 5               // gagal berturut sebelum akun dikunci
	kunciDasar     = 60 * time.Second // durasi kunci pertama
	kunciMaksTingkat = 5             // kunci maksimum = kunciDasar << 5 = 32 menit
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
	if err1 != nil || err2 != nil {
		return false
	}
	ulang := argon2.IDKey([]byte(password), salt, t, m, p, uint32(len(tag)))
	return subtle.ConstantTimeCompare(ulang, tag) == 1
}

// --8<-- [end:hash]

// hashPalsu dipakai saat email tidak terdaftar, supaya waktu respons mirip password salah.
var hashPalsu = enkodeHash("bukan-password-siapa-pun", []byte("saltpalsulab0000"))

// saltLab membuat salt deterministik dari id akun, HANYA untuk lab supaya rekaman identik tiap run.
// Di produksi salt wajib acak (crypto/rand); lihat komentar seed.
func saltLab(id int64, versi string) []byte {
	s := sha256.Sum256([]byte(fmt.Sprintf("c4-login-salt:%d:%s", id, versi)))
	return s[:saltPanjang]
}

// ==== blocklist password bocor ====

var daftarBocor = map[string]bool{}

func muatBocor(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	s := bufio.NewScanner(f)
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
	db        *pgxpool.Pool
	mode      string // "per-akun" atau "dua-lapis"
	ipSumber  string // "koneksi", "xff-mentah", "proxy"
	perIP     *pembatas
	perAkun   *pembatas
}

type problem struct {
	Type    string `json:"type"`
	Title   string `json:"title"`
	Status  int    `json:"status"`
	Detail  string `json:"detail,omitempty"`
	Tunggu  int    `json:"retry_after,omitempty"`
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
		// Hanya percaya X-Lab-IP bila request datang lewat proxy tepercaya kita (penanda rahasia,
		// di lab cukup keberadaan header). Reverse proxy sungguhan yang menaruh X-Forwarded-For.
		if xff != "" && r.Header.Get("X-Lab-Proxy") == "tepercaya" {
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
func (s *server) login(w http.ResponseWriter, r *http.Request) {
	var in struct{ Email, Password string }
	if json.NewDecoder(r.Body).Decode(&in) != nil || in.Email == "" || in.Password == "" {
		tulisProblem(w, problem{Type: "/problems/body", Title: "Body harus JSON berisi email dan password", Status: 400})
		return
	}
	now := sekarang()
	ip := s.clientIP(r)

	// Lapis memori (hanya mode dua-lapis): dicek sebelum menyentuh database dan sebelum argon2id,
	// jadi banjir percobaan dari satu IP tidak memakai CPU hashing dan tidak sempat menebak.
	if s.mode == "dua-lapis" {
		if ok, tunggu := s.perIP.izinkan("ip:"+ip, now); !ok {
			tulisProblem(w, problem{Type: "/problems/rate-limit-ip", Title: "Terlalu banyak percobaan dari alamat ini",
				Status: 429, Tunggu: detik(tunggu)})
			return
		}
		if ok, tunggu := s.perAkun.izinkan("akun:"+in.Email, now); !ok {
			tulisProblem(w, problem{Type: "/problems/rate-limit-akun", Title: "Terlalu banyak percobaan untuk akun ini",
				Status: 429, Tunggu: detik(tunggu)})
			return
		}
	}

	a, err := s.akunLewatEmail(r.Context(), in.Email)
	if err != nil {
		// Email tidak terdaftar: tetap jalankan argon2id sekali supaya waktu respons mirip,
		// dan jawab 401 yang sama dengan password salah (jangan bantu penyerang membedakan).
		cocokHash(in.Password, hashPalsu)
		tulisProblem(w, problem{Type: "/problems/login-gagal", Title: "Email atau password salah", Status: 401})
		return
	}

	// Kunci per akun di database. Inilah yang membuat "akun Ani terkunci": bila ini satu-satunya
	// pertahanan, penyerang bisa mengunci akun orang lain dengan sengaja gagal (denial of service).
	if a.terkunci != nil && a.terkunci.After(now) {
		sisa := int(math.Ceil(a.terkunci.Sub(now).Seconds()))
		tulisProblem(w, problem{Type: "/problems/akun-terkunci", Title: "Akun terkunci sementara",
			Status: 423, Tunggu: sisa, Detail: "Coba lagi setelah " + strconv.Itoa(sisa) + " detik"})
		return
	}

	if !cocokHash(in.Password, a.hash) {
		gagal := a.gagal + 1
		if gagal >= ambangAkun {
			sampai := now.Add(durasiKunci(gagal))
			_, _ = s.db.Exec(r.Context(),
				`UPDATE akun SET gagal_login = $1, terkunci_sampai = $2 WHERE id = $3`, gagal, sampai, a.id)
		} else {
			_, _ = s.db.Exec(r.Context(), `UPDATE akun SET gagal_login = $1 WHERE id = $2`, gagal, a.id)
		}
		tulisProblem(w, problem{Type: "/problems/login-gagal", Title: "Email atau password salah", Status: 401})
		return
	}

	// Benar: reset penghitung dan kunci.
	_, _ = s.db.Exec(r.Context(), `UPDATE akun SET gagal_login = 0, terkunci_sampai = NULL WHERE id = $1`, a.id)
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
	if json.NewDecoder(r.Body).Decode(&in) != nil || in.Email == "" {
		tulisProblem(w, problem{Type: "/problems/body", Title: "Body tidak lengkap", Status: 400})
		return
	}
	a, err := s.akunLewatEmail(r.Context(), in.Email)
	if err != nil || !cocokHash(in.PasswordLama, a.hash) {
		tulisProblem(w, problem{Type: "/problems/login-gagal", Title: "Email atau password lama salah", Status: 401})
		return
	}
	// NIST SP 800-63B §3.1.1.2: password faktor tunggal minimal 15 karakter; cek lawan daftar bocor.
	if len([]rune(in.PasswordBaru)) < 15 {
		tulisProblem(w, problem{Type: "/problems/password-lemah", Title: "Password baru minimal 15 karakter", Status: 422})
		return
	}
	if daftarBocor[strings.ToLower(in.PasswordBaru)] {
		tulisProblem(w, problem{Type: "/problems/password-bocor",
			Title: "Password baru ada di daftar password yang pernah bocor; pilih yang lain", Status: 422})
		return
	}
	hash := enkodeHash(in.PasswordBaru, saltLab(a.id, "baru"))
	_, err = s.db.Exec(r.Context(),
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

func detik(d time.Duration) int {
	return int(math.Ceil(d.Seconds()))
}

func main() {
	ctx := context.Background()
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		log.Fatal("DATABASE_URL kosong")
	}
	bocor := os.Getenv("DAFTAR_BOCOR")
	if bocor == "" {
		bocor = "daftar-bocor.txt"
	}
	if err := muatBocor(bocor); err != nil {
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

	perIP := pembatasBaru(10, 10.0/60)   // 10 percobaan burst, isi ulang 10 per menit
	perAkun := pembatasBaru(5, 5.0/60)   // 5 percobaan burst per akun, isi ulang 5 per menit
	s := &server{
		db:       pool,
		mode:     getenvDefault("MODE", "dua-lapis"),
		ipSumber: getenvDefault("IP_SUMBER", "koneksi"),
		perIP:    perIP,
		perAkun:  perAkun,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("POST /login", s.login)
	mux.HandleFunc("POST /ganti-password", s.gantiPassword)
	if os.Getenv("LAB_JAM") == "1" {
		mux.HandleFunc("POST /lab/jam", s.labJam)
	}

	port := getenvDefault("PORT", "18170")
	log.Printf("c4-login mendengar di 127.0.0.1:%s (mode=%s ip_sumber=%s)", port, s.mode, s.ipSumber)
	log.Fatal(http.ListenAndServe("127.0.0.1:"+port, mux)) // port terpakai = gagal keras
}

func getenvDefault(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}
