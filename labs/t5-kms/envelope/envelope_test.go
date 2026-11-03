package envelope

import (
	"bytes"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// pembungkusLokal adalah KMS tiruan untuk tes unit: KEK di memori, pembungkusan AES-GCM, bentuk vault:v1:<base64>.
// Tes terhadap OpenBao sungguhan ada di bao/ (TES_KMS_WAJIB=1) dan di rekaman lab.
type pembungkusLokal struct {
	kek       []byte
	galatBuka error
}

func (p *pembungkusLokal) a() cipher.AEAD {
	b, _ := aes.NewCipher(p.kek)
	g, _ := cipher.NewGCMWithRandomNonce(b)
	return g
}

func (p *pembungkusLokal) BuatDataKey(context.Context) ([]byte, string, error) {
	dek := make([]byte, 32)
	rand.Read(dek)
	return dek, "vault:v1:" + base64.StdEncoding.EncodeToString(p.a().Seal(nil, nil, dek, nil)), nil
}

func (p *pembungkusLokal) Buka(_ context.Context, t string) ([]byte, error) {
	if p.galatBuka != nil {
		return nil, p.galatBuka
	}
	b, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(t, "vault:v1:"))
	if err != nil {
		return nil, err
	}
	return p.a().Open(nil, nil, b, nil)
}

func baru() *pembungkusLokal {
	k := make([]byte, 32)
	rand.Read(k)
	return &pembungkusLokal{kek: k}
}

func dekBaru() []byte {
	d := make([]byte, 32)
	rand.Read(d)
	return d
}

func TestBolakBalik(t *testing.T) {
	dek, teks := dekBaru(), []byte("id,jurnal_id,buku_id,jumlah\n1,1,2,1000\n")
	blob, err := Enkripsi(teks, dek, "2026-05-01")
	if err != nil {
		t.Fatal(err)
	}
	if len(blob) != len(teks)+28 {
		t.Fatalf("panjang %d, harus %d (nonce 12 + tag 16)", len(blob), len(teks)+28)
	}
	hasil, err := Dekripsi(blob, dek, "2026-05-01")
	if err != nil || !bytes.Equal(hasil, teks) {
		t.Fatalf("bolak-balik gagal: %v", err)
	}
}

// Satu byte diubah di posisi mana pun (nonce, ciphertext, tag) harus gagal dengan ErrAutentikasi, bukan galat lain.
func TestSatuByteBerubah(t *testing.T) {
	dek, teks := dekBaru(), bytes.Repeat([]byte("POSTING-RAHASIA-12345\n"), 100)
	blob, _ := Enkripsi(teks, dek, "2026-05-01")
	for i := range blob {
		ubah := bytes.Clone(blob)
		ubah[i] ^= 0x01
		if _, err := Dekripsi(ubah, dek, "2026-05-01"); !errors.Is(err, ErrAutentikasi) {
			t.Fatalf("byte %d dari %d diubah: harus ErrAutentikasi, dapat %v", i, len(blob), err)
		}
	}
}

func TestTerpotongDanDiperpanjang(t *testing.T) {
	dek := dekBaru()
	blob, _ := Enkripsi([]byte("isi arsip"), dek, "2026-05-01")
	kasus := map[string][]byte{
		"tanpa byte terakhir": blob[:len(blob)-1],
		"tanpa byte pertama":  blob[1:],
		"ditambah satu byte":  append(bytes.Clone(blob), 0),
		"hanya nonce":         blob[:12],
		"kosong":              {},
	}
	for nama, b := range kasus {
		if _, err := Dekripsi(b, dek, "2026-05-01"); !errors.Is(err, ErrAutentikasi) {
			t.Errorf("%s: harus ErrAutentikasi, dapat %v", nama, err)
		}
	}
}

func TestPeriodeLainAtauKunciSalah(t *testing.T) {
	dek := dekBaru()
	blob, _ := Enkripsi([]byte("isi arsip"), dek, "2026-05-01")
	if _, err := Dekripsi(blob, dek, "2026-04-01"); !errors.Is(err, ErrAutentikasi) {
		t.Errorf("periode lain: harus ErrAutentikasi, dapat %v", err)
	}
	if _, err := Dekripsi(blob, dekBaru(), "2026-05-01"); !errors.Is(err, ErrAutentikasi) {
		t.Errorf("data key lain: harus ErrAutentikasi, dapat %v", err)
	}
}

func TestPanjangDataKey(t *testing.T) {
	for _, n := range []int{0, 16, 24, 31, 33} {
		if _, err := Enkripsi([]byte("x"), make([]byte, n), "2026-05-01"); !errors.Is(err, ErrDataKey) {
			t.Errorf("%d byte: harus ErrDataKey, dapat %v", n, err)
		}
		if _, err := Dekripsi(make([]byte, 40), make([]byte, n), "2026-05-01"); !errors.Is(err, ErrDataKey) {
			t.Errorf("%d byte (dekripsi): harus ErrDataKey, dapat %v", n, err)
		}
	}
}

func TestNonceTidakPernahSama(t *testing.T) {
	dek, teks := dekBaru(), []byte("isi yang sama")
	lihat := map[string]bool{}
	for i := 0; i < 500; i++ {
		b, _ := Enkripsi(teks, dek, "2026-05-01")
		n := string(b[:12])
		if lihat[n] {
			t.Fatalf("nonce sama di enkripsi ke-%d", i)
		}
		lihat[n] = true
	}
}

func TestTeksBiasaTidakTerbaca(t *testing.T) {
	dek, teks := dekBaru(), bytes.Repeat([]byte("POSTING-RAHASIA-12345,1000\n"), 50)
	blob, _ := Enkripsi(teks, dek, "2026-05-01")
	if bytes.Contains(blob, []byte("POSTING-RAHASIA")) || bytes.Contains(blob, []byte("1000")) {
		t.Fatal("potongan teks biasa terlihat di berkas terenkripsi")
	}
}

func TestVersiKEK(t *testing.T) {
	ok := map[string]int{"vault:v1:AAAA": 1, "vault:v2:AAAA": 2, "vault:v10:AAAA": 10}
	for s, v := range ok {
		if n, err := VersiKEK(s); err != nil || n != v {
			t.Errorf("%q: dapat %d, %v; harus %d", s, n, err, v)
		}
	}
	for _, s := range []string{"", "vault:v0:AAAA", "vault:v-1:AAAA", "vault:x1:AAAA", "vault:v1:", "lain:v1:AAAA", "vault:v1", "vault:vx:AAAA"} {
		if _, err := VersiKEK(s); !errors.Is(err, ErrBentukTerbungkus) {
			t.Errorf("%q: harus ErrBentukTerbungkus, dapat %v", s, err)
		}
	}
}

func TestArsipkanDanBuka(t *testing.T) {
	d := t.TempDir()
	sumber := filepath.Join(d, "posting.csv")
	teks := bytes.Repeat([]byte("1,2,3,1000\n"), 1000)
	os.WriteFile(sumber, teks, 0o600)
	p := baru()
	tujuan := filepath.Join(d, "posting.enc")
	h, err := Arsipkan(context.Background(), p, sumber, tujuan, "2026-05-01")
	if err != nil {
		t.Fatal(err)
	}
	blob, _ := os.ReadFile(tujuan)
	if h.Checksum != Checksum(blob) || h.VersiKEK != 1 || h.UkuranAsli != len(teks) || h.UkuranTerenkripsi != len(blob) {
		t.Fatalf("hasil tidak sesuai berkas: %+v", h)
	}
	if st, _ := os.Stat(tujuan); st.Mode().Perm() != 0o600 {
		t.Fatalf("izin berkas %v, harus 0600", st.Mode().Perm())
	}
	if _, err := Arsipkan(context.Background(), p, sumber, tujuan, "2026-05-01"); !errors.Is(err, os.ErrExist) {
		t.Fatalf("tujuan yang sudah ada harus ditolak, dapat %v", err)
	}
	b, err := os.ReadFile(tujuan)
	if err != nil || !bytes.Equal(b, blob) {
		t.Fatal("berkas arsip yang sudah ada berubah")
	}
	hasil, err := Buka(context.Background(), p, tujuan, h.DataKeyTerbungkus, "2026-05-01")
	if err != nil || !bytes.Equal(hasil, teks) {
		t.Fatalf("buka gagal: %v", err)
	}
}

// Tanpa KMS (atau tanpa hak decrypt) tidak ada teks yang keluar, dan galatnya datang dari KMS, bukan dari GCM.
func TestBukaTanpaKMS(t *testing.T) {
	d := t.TempDir()
	sumber := filepath.Join(d, "a.csv")
	os.WriteFile(sumber, []byte("isi"), 0o600)
	p := baru()
	h, err := Arsipkan(context.Background(), p, sumber, filepath.Join(d, "a.enc"), "2026-05-01")
	if err != nil {
		t.Fatal(err)
	}
	p.galatBuka = fmt.Errorf("KMS tidak tersedia")
	teks, err := Buka(context.Background(), p, filepath.Join(d, "a.enc"), h.DataKeyTerbungkus, "2026-05-01")
	if teks != nil || err == nil || errors.Is(err, ErrAutentikasi) || !strings.Contains(err.Error(), "KMS tidak tersedia") {
		t.Fatalf("harus galat dari KMS tanpa teks: %q, %v", teks, err)
	}
}

func TestDuaFileDuaDataKey(t *testing.T) {
	d := t.TempDir()
	sumber := filepath.Join(d, "a.csv")
	os.WriteFile(sumber, []byte("isi"), 0o600)
	p := baru()
	a, _ := Arsipkan(context.Background(), p, sumber, filepath.Join(d, "a.enc"), "2026-04-01")
	b, _ := Arsipkan(context.Background(), p, sumber, filepath.Join(d, "b.enc"), "2026-05-01")
	if a.DataKeyTerbungkus == b.DataKeyTerbungkus {
		t.Fatal("dua file memakai data key terbungkus yang sama")
	}
	// Data key file lain tidak membuka file ini.
	if _, err := Buka(context.Background(), p, filepath.Join(d, "b.enc"), a.DataKeyTerbungkus, "2026-05-01"); !errors.Is(err, ErrAutentikasi) {
		t.Fatalf("data key file lain harus ErrAutentikasi, dapat %v", err)
	}
}
