// Package service adalah lapisan logika bisnis: aturan Rekeningo. Tidak tahu HTTP, tidak menulis SQL.
package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"golang.org/x/crypto/bcrypt"

	"lab/apit3/internal/push"
	"lab/apit3/internal/repo"
)

var (
	ErrLoginGagal     = errors.New("email atau password salah")
	ErrSesiTidakSah   = errors.New("sesi tidak ada atau sudah kedaluwarsa")
	ErrTidakDitemukan = errors.New("tidak ditemukan")
	// ErrWajibGanti: password benar, tapi masih password sementara (M16). Belum ada token sampai diganti.
	ErrWajibGanti = errors.New("password sementara wajib diganti")
)

type Service struct {
	repo     repo.Repo
	umurSesi time.Duration
	kini     func() time.Time
	// Lapis per akun rate limit (lab-api-t2a, keputusan 645). Lapis per IP ada di handler, karena IP urusan HTTP.
	loginAkun *Pembatas // key: email
	kirimAkun *Pembatas // key: akun pengirim
	// Hanya untuk mode rentan push-dalam-tx (M18): client push dan nama mode. Versi benar tidak memanggil
	// jaringan di dalam transaction (ADR 22), jadi kedua field ini kosong.
	push   push.Klien
	rentan string
}

func Baru(r repo.Repo, umurSesi time.Duration) Service {
	return Service{repo: r, umurSesi: umurSesi, kini: time.Now,
		loginAkun: PembatasBaru(AmbangLoginAkun[0], AmbangLoginAkun[1]),
		kirimAkun: PembatasBaru(AmbangKirimAkun[0], AmbangKirimAkun[1])}
}

// DenganRentan menyalakan mode rentan service (RentanPushDalamTx) dengan client push yang dipakainya.
func (s Service) DenganRentan(mode string, k push.Klien) Service {
	s.rentan, s.push = mode, k
	return s
}

// DenganJam mengganti sumber waktu (flag -jam-lab: waktu dibekukan supaya rekaman bucket bisa diulang identik).
func (s Service) DenganJam(kini func() time.Time) Service { s.kini = kini; return s }

// Kini: waktu yang sama dengan yang dipakai service, untuk lapis per IP di handler.
func (s Service) Kini() time.Time { return s.kini() }

// hashPalsu dipakai saat email tidak terdaftar, supaya waktu respons sama dengan password salah.
var hashPalsu, _ = bcrypt.GenerateFromPassword([]byte("bukan-password-siapa-pun"), bcrypt.DefaultCost)

// --8<-- [start:ambang-kunci]
// Kunci per akun di database (M16, pola labs/c4-ratelimit/login keputusan 545, 550). NIST SP 800-63B-4
// bagian 3.2.2 membatasi paling banyak 100 gagal berturut; lab memakai ambang yang lebih ketat, sama dengan c4.
const (
	ambangGagal      = 5                // gagal berturut sebelum akun dikunci
	kunciDasar       = 60 * time.Second // kunci pertama
	kunciMaksTingkat = 5                // kunci terlama 60 detik << 5 = 32 menit
)

// durasiKunci: kunci bertahap, dua kali lebih lama untuk setiap gagal sesudah ambang.
func durasiKunci(gagal int) time.Duration {
	tingkat := min(max(gagal-ambangGagal, 0), kunciMaksTingkat)
	return kunciDasar << uint(tingkat)
}

// --8<-- [end:ambang-kunci]

// --8<-- [start:login]
// periksaMasuk menjalankan semua pengaman sebelum password dianggap benar. Dipakai Login dan GantiPassword,
// jadi endpoint yang memeriksa password lama tidak bisa dipakai menebak tanpa batas (keputusan 550 butir 1).
func (s Service) periksaMasuk(ctx context.Context, email, password string) (repo.AkunMasuk, error) {
	kini := s.kini()
	if ok, tunggu := s.loginAkun.Izinkan(strings.ToLower(email), kini); !ok {
		return repo.AkunMasuk{}, ErrTerlaluSering{Lapis: "akun", Tunggu: tunggu}
	}
	a, err := s.repo.AkunLewatEmail(ctx, email)
	if errors.Is(err, repo.ErrTidakAda) {
		_ = bcrypt.CompareHashAndPassword(hashPalsu, []byte(password)) // waktu sama dengan password salah
		return a, ErrLoginGagal
	}
	if err != nil {
		return a, err
	}
	// Percobaan dicatat sebelum bcrypt, dengan baris akun dikunci: penghitung naik, dan percobaan yang sampai ambang
	// langsung memasang kunci. Tebakan bersamaan menunggu lock baris lalu melihat kunci itu, jadi hanya satu yang
	// dinilai bcrypt (keputusan 718). Password yang ternyata benar menghapus penghitung dan kunci itu lagi.
	terkunci := false
	err = s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		gagal, sampai, err := tx.PercobaanLogin(ctx, a.ID)
		if err != nil {
			return err
		}
		if sampai != nil && sampai.After(kini) {
			terkunci = true
			return nil
		}
		var kunci *time.Time
		if gagal++; gagal >= ambangGagal {
			k := kini.Add(durasiKunci(gagal))
			kunci = &k
		}
		return tx.CatatPercobaanLogin(ctx, a.ID, gagal, kunci)
	})
	if err != nil {
		return a, err // gagal mencatat = 500, bukan percobaan gratis
	}
	// Akun terkunci dijawab sama dengan password salah, termasuk waktu hash: jawaban "terkunci" memberi tahu
	// penebak bahwa email itu terdaftar (OWASP ASVS 5.0.0 6.3.8).
	if terkunci {
		_ = bcrypt.CompareHashAndPassword(hashPalsu, []byte(password))
		return a, ErrLoginGagal
	}
	if bcrypt.CompareHashAndPassword([]byte(a.PasswordHash), []byte(password)) != nil {
		return a, ErrLoginGagal
	}
	return a, s.repo.ResetGagalLogin(ctx, a.ID)
}

func (s Service) Login(ctx context.Context, email, password string) (token string, sampai time.Time, err error) {
	a, err := s.periksaMasuk(ctx, email, password)
	if err != nil {
		return "", time.Time{}, err
	}
	if a.WajibGanti {
		return "", time.Time{}, ErrWajibGanti
	}
	token, err = tokenAcak()
	if err != nil {
		return "", time.Time{}, err
	}
	sampai = s.kini().Add(s.umurSesi)
	return token, sampai, s.repo.SimpanSesi(ctx, hashToken(token), a.ID, sampai, "app", nil)
}

// tokenAcak: 256 bit dari CSPRNG, ditulis heksadesimal.
func tokenAcak() (string, error) {
	acak := make([]byte, 32)
	if _, err := rand.Read(acak); err != nil {
		return "", err
	}
	return hex.EncodeToString(acak), nil
}

// LoginWeb membuka sesi dasbor (jenis web): token sesi untuk cookie, dan token CSRF yang dikirim ke halaman.
// Database hanya menyimpan hash keduanya. Karyawan memakai app, bukan dasbor (403). Pengamannya sama dengan Login.
func (s Service) LoginWeb(ctx context.Context, email, password string) (token, csrf string, sampai time.Time, err error) {
	a, err := s.periksaMasuk(ctx, email, password)
	if err != nil {
		return "", "", time.Time{}, err
	}
	if a.WajibGanti {
		return "", "", time.Time{}, ErrWajibGanti
	}
	if a.Jenis != "warung" && a.Jenis != "hr" && a.Jenis != "admin" {
		return "", "", time.Time{}, ErrDilarang
	}
	if token, err = tokenAcak(); err != nil {
		return "", "", time.Time{}, err
	}
	if csrf, err = tokenAcak(); err != nil {
		return "", "", time.Time{}, err
	}
	sampai = s.kini().Add(s.umurSesi)
	h := hashToken(csrf)
	return token, csrf, sampai, s.repo.SimpanSesi(ctx, hashToken(token), a.ID, sampai, "web", &h)
}

// CsrfSah membandingkan token CSRF dari header dengan hash di sesi web, dalam waktu yang tidak bergantung isinya.
func CsrfSah(sesi repo.Sesi, dariHeader string) bool {
	return dariHeader != "" && subtle.ConstantTimeCompare([]byte(hashToken(dariHeader)), []byte(sesi.CsrfHash)) == 1
}

// --8<-- [end:login]

// --8<-- [start:ganti-password]
// GantiPassword: password lama melewati pengaman yang sama dengan Login. Password baru minimal 15 karakter
// (NIST SP 800-63B-4 bagian 3.1.1.2) dan paling banyak 72 byte, batas bcrypt (golang.org/x/crypto/bcrypt).
// Semua sesi akun itu dihapus, jadi app login lagi dengan password baru.
func (s Service) GantiPassword(ctx context.Context, email, lama, baru string) error {
	a, err := s.periksaMasuk(ctx, email, lama)
	if err != nil {
		return err
	}
	switch {
	case utf8.RuneCountInString(baru) < 15:
		return ErrValidasi{"password_baru", "minimal 15 karakter"}
	case len(baru) > 72:
		return ErrValidasi{"password_baru", "paling banyak 72 byte"}
	case baru == lama:
		return ErrValidasi{"password_baru", "harus berbeda dari password lama"}
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(baru), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return s.repo.GantiPassword(ctx, a.ID, string(hash))
}

// --8<-- [end:ganti-password]

// Periksa mengembalikan sesi pemilik token (akun, jenis app atau web, hash CSRF), atau ErrSesiTidakSah.
func (s Service) Periksa(ctx context.Context, token string) (repo.Sesi, error) {
	x, err := s.repo.SesiAktif(ctx, hashToken(token), s.kini())
	if errors.Is(err, repo.ErrTidakAda) {
		return repo.Sesi{}, ErrSesiTidakSah
	}
	return x, err
}

func (s Service) Logout(ctx context.Context, token string) error {
	return s.repo.HapusSesi(ctx, hashToken(token))
}

// Database hanya menyimpan hash token. Kalau isi tabel sesi bocor, token aslinya tidak ikut bocor.
func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}
