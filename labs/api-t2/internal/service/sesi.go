// Package service adalah lapisan logika bisnis: aturan Rekeningo. Tidak tahu HTTP, tidak menulis SQL.
package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"golang.org/x/crypto/bcrypt"

	"lab/apit2/internal/repo"
)

var (
	ErrLoginGagal     = errors.New("email atau password salah")
	ErrSesiTidakSah   = errors.New("sesi tidak ada atau sudah kedaluwarsa")
	ErrTidakDitemukan = errors.New("tidak ditemukan")
)

type Service struct {
	repo     repo.Repo
	umurSesi time.Duration
	kini     func() time.Time
}

func Baru(r repo.Repo, umurSesi time.Duration) Service {
	return Service{repo: r, umurSesi: umurSesi, kini: time.Now}
}

// hashPalsu dipakai saat email tidak terdaftar, supaya waktu respons sama dengan password salah.
var hashPalsu, _ = bcrypt.GenerateFromPassword([]byte("bukan-password-siapa-pun"), bcrypt.DefaultCost)

// --8<-- [start:login]
func (s Service) Login(ctx context.Context, email, password string) (token string, sampai time.Time, err error) {
	id, hash, err := s.repo.AkunLewatEmail(ctx, email)
	if errors.Is(err, repo.ErrTidakAda) {
		bcrypt.CompareHashAndPassword(hashPalsu, []byte(password)) // waktu sama dengan password salah
		return "", time.Time{}, ErrLoginGagal
	}
	if err != nil {
		return "", time.Time{}, err
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		return "", time.Time{}, ErrLoginGagal
	}
	acak := make([]byte, 32) // 256 bit dari CSPRNG
	if _, err := rand.Read(acak); err != nil {
		return "", time.Time{}, err
	}
	token = hex.EncodeToString(acak)
	sampai = s.kini().Add(s.umurSesi)
	return token, sampai, s.repo.SimpanSesi(ctx, hashToken(token), id, sampai)
}

// --8<-- [end:login]

// Periksa mengembalikan akun pemilik token, atau ErrSesiTidakSah.
func (s Service) Periksa(ctx context.Context, token string) (int64, error) {
	id, err := s.repo.SesiAktif(ctx, hashToken(token), s.kini())
	if errors.Is(err, repo.ErrTidakAda) {
		return 0, ErrSesiTidakSah
	}
	return id, err
}

func (s Service) Logout(ctx context.Context, token string) error {
	return s.repo.HapusSesi(ctx, hashToken(token))
}

// Database hanya menyimpan hash token. Kalau isi tabel sesi bocor, token aslinya tidak ikut bocor.
func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}
