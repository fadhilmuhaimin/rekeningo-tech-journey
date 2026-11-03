// Package envelope mengenkripsi satu file arsip dengan satu data key (envelope encryption, ADR 57): AES-256-GCM dengan
// nonce acak 96 bit (crypto/cipher.NewGCMWithRandomNonce), dan data key dibungkus kunci pembungkus (KEK) di KMS.
// Satu file = satu pesan GCM di memori. File yang lebih besar dari memori butuh enkripsi berpotongan: tidak ditulis di sini.
package envelope

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
)

// UkuranDataKey adalah panjang data key: AES-256.
const UkuranDataKey = 32

var (
	// ErrAutentikasi: tag GCM tidak cocok. Berkas diubah, terpotong, atau diperpanjang, atau data key atau periode salah.
	ErrAutentikasi = errors.New("autentikasi GCM gagal")
	// ErrDataKey: data key bukan 32 byte.
	ErrDataKey = errors.New("data key harus 32 byte")
	// ErrBentukTerbungkus: data key terbungkus bukan bentuk vault:v<N>:<base64>.
	ErrBentukTerbungkus = errors.New("data key terbungkus bukan bentuk vault:v<N>:<base64>")
)

// Pembungkus adalah KMS: membuat data key baru (teks biasa dan bentuk terbungkus) dan membuka bentuk terbungkus.
type Pembungkus interface {
	BuatDataKey(ctx context.Context) (teksBiasa []byte, terbungkus string, err error)
	Buka(ctx context.Context, terbungkus string) ([]byte, error)
}

// Hasil adalah yang dicatat di arsip_partisi dan di jangkar.
type Hasil struct {
	Checksum          string `json:"checksum"`            // SHA-256 atas berkas terenkripsi, bisa diperiksa tanpa KMS
	DataKeyTerbungkus string `json:"data_key_terbungkus"` // vault:v<N>:...
	VersiKEK          int    `json:"versi_kek"`
	UkuranAsli        int    `json:"ukuran_asli"`
	UkuranTerenkripsi int    `json:"ukuran_terenkripsi"`
}

func aad(periode string) []byte { return []byte("rekeningo-arsip-v1:" + periode) }

func aead(dek []byte) (cipher.AEAD, error) {
	if len(dek) != UkuranDataKey {
		return nil, fmt.Errorf("%w (dapat %d byte)", ErrDataKey, len(dek))
	}
	blok, err := aes.NewCipher(dek)
	if err != nil {
		return nil, err
	}
	return cipher.NewGCMWithRandomNonce(blok)
}

// Enkripsi mengembalikan nonce (12 byte) || ciphertext || tag (16 byte), terikat ke periode lewat data tambahan GCM.
func Enkripsi(teks, dek []byte, periode string) ([]byte, error) {
	a, err := aead(dek)
	if err != nil {
		return nil, err
	}
	return a.Seal(nil, nil, teks, aad(periode)), nil
}

// Dekripsi membalik Enkripsi. Satu byte yang berubah di mana pun, atau periode lain, menghasilkan ErrAutentikasi.
func Dekripsi(blob, dek []byte, periode string) ([]byte, error) {
	a, err := aead(dek)
	if err != nil {
		return nil, err
	}
	teks, err := a.Open(nil, nil, blob, aad(periode))
	if err != nil {
		return nil, fmt.Errorf("%w (%v)", ErrAutentikasi, err)
	}
	return teks, nil
}

// VersiKEK membaca nomor versi dari bentuk vault:v<N>:<base64>.
func VersiKEK(terbungkus string) (int, error) {
	bagian := strings.SplitN(terbungkus, ":", 3)
	if len(bagian) != 3 || bagian[0] != "vault" || len(bagian[1]) < 2 || bagian[1][0] != 'v' || bagian[2] == "" {
		return 0, ErrBentukTerbungkus
	}
	n, err := strconv.Atoi(bagian[1][1:])
	if err != nil || n < 1 {
		return 0, ErrBentukTerbungkus
	}
	return n, nil
}

// Arsipkan mengenkripsi satu file ke tujuan baru (tujuan yang sudah ada ditolak: arsip hanya bertambah).
func Arsipkan(ctx context.Context, p Pembungkus, sumber, tujuan, periode string) (Hasil, error) {
	teks, err := os.ReadFile(sumber)
	if err != nil {
		return Hasil{}, err
	}
	dek, terbungkus, err := p.BuatDataKey(ctx)
	if err != nil {
		return Hasil{}, err
	}
	defer clear(dek)
	versi, err := VersiKEK(terbungkus)
	if err != nil {
		return Hasil{}, err
	}
	blob, err := Enkripsi(teks, dek, periode)
	if err != nil {
		return Hasil{}, err
	}
	f, err := os.OpenFile(tujuan, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		return Hasil{}, err
	}
	if _, err := f.Write(blob); err != nil {
		f.Close()
		return Hasil{}, err
	}
	if err := f.Close(); err != nil {
		return Hasil{}, err
	}
	return Hasil{Checksum: Checksum(blob), DataKeyTerbungkus: terbungkus, VersiKEK: versi, UkuranAsli: len(teks), UkuranTerenkripsi: len(blob)}, nil
}

// Buka membaca berkas terenkripsi, meminta KMS membuka data key terbungkusnya, dan mendekripsi.
func Buka(ctx context.Context, p Pembungkus, berkas, terbungkus, periode string) ([]byte, error) {
	blob, err := os.ReadFile(berkas)
	if err != nil {
		return nil, err
	}
	dek, err := p.Buka(ctx, terbungkus)
	if err != nil {
		return nil, err
	}
	defer clear(dek)
	return Dekripsi(blob, dek, periode)
}

// Checksum adalah SHA-256 heksadesimal.
func Checksum(b []byte) string {
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}
