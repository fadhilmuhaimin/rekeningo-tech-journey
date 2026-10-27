package klien_test

import (
	"io/fs"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"lab/apit4/internal/klien"
	"lab/apit4/internal/push"
)

// Tes satu pembuat client untuk semua panggilan keluar (ADR 22, ADR 36). Klaim negatif ("tidak ada client lain")
// dijaga dengan memindai sumber, bukan hanya mengandalkan bacaan: lingkupnya semua berkas .go di bawah internal/
// selain berkas tes.

// --8<-- [start:tes-satu-pembuat]
// clientLiar: pola yang membuat client HTTP di luar internal/klien. Tiga pola; tiap kemunculannya harus punya alasan
// tertulis di daftar `diizinkan`.
var clientLiar = []string{"http.Client{", "http.DefaultClient", "http.Get(", "http.Post(", "http.Head(", "http.PostForm("}

// diizinkan: satu-satunya kemunculan di luar klien.go. Fetcher versi rentan (M36) sengaja memakai client bawaan tanpa
// pemeriksaan: itulah yang direkam lab t4-ssrf. Versi aman memakai klien.BaruDenganTransport.
var diizinkan = map[string]int{
	"klien/klien.go": 1, // &http.Client{...} di BaruDenganTransport
	"unduh/unduh.go": 1, // (&http.Client{}).Do: versi rentan M36
}

func TestSatuPembuatClientUntukSemuaPanggilanKeluar(t *testing.T) {
	ditemukan := map[string]int{}
	err := filepath.WalkDir("..", func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return err
		}
		b, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel("..", path)
		for _, pola := range clientLiar {
			ditemukan[filepath.ToSlash(rel)] += strings.Count(string(b), pola)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	for rel, n := range ditemukan {
		if n != diizinkan[rel] {
			t.Errorf("%s membuat client HTTP %d kali, yang diizinkan %d: panggilan keluar harus lewat klien.Baru atau klien.BaruDenganTransport", rel, n, diizinkan[rel])
		}
	}
	for rel, n := range diizinkan {
		if ditemukan[rel] != n {
			t.Errorf("%s tidak lagi memuat pola yang diizinkan (%d): perbarui daftar", rel, n)
		}
	}
}

// --8<-- [end:tes-satu-pembuat]

func TestBatasWaktuBawaanTigaDetikDiSemuaPembuat(t *testing.T) {
	if klien.BatasBawaan != 3*time.Second || push.BatasBawaan != klien.BatasBawaan {
		t.Errorf("klien %s, push %s: ADR 22 menetapkan 3 detik untuk semua panggilan keluar", klien.BatasBawaan, push.BatasBawaan)
	}
	if c := klien.Baru(klien.BatasBawaan); c.Timeout != 3*time.Second {
		t.Errorf("Timeout client %s", c.Timeout)
	}
}

// Redirect tidak diikuti oleh client mana pun dari pembuat ini: jawaban 3xx dikembalikan apa adanya.
func TestClientTidakMengikutiRedirect(t *testing.T) {
	var sampai bool
	tujuan := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { sampai = true }))
	defer tujuan.Close()
	awal := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, tujuan.URL, http.StatusFound)
	}))
	defer awal.Close()
	for nama, c := range map[string]*http.Client{"Baru": klien.Baru(time.Second), "BaruDenganTransport": klien.BaruDenganTransport(time.Second, http.DefaultTransport)} {
		resp, err := c.Get(awal.URL)
		if err != nil {
			t.Fatalf("%s: %v", nama, err)
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusFound || sampai {
			t.Errorf("%s: status %d, tujuan redirect dihubungi %t", nama, resp.StatusCode, sampai)
		}
	}
}

func TestBatasNolMembuatClientTanpaBatasWaktuHanyaUntukRekamanPerbandingan(t *testing.T) {
	if klien.Baru(0).Timeout != 0 {
		t.Error("batas 0 harus tetap 0 (rekaman M18 membandingkan client tanpa batas)")
	}
}

// BaruDenganTransport memakai transport yang diberikan (fetcher gambar memerlukannya untuk memeriksa alamat saat dial).
type penghitung struct{ n int }

func (p *penghitung) RoundTrip(r *http.Request) (*http.Response, error) {
	p.n++
	return http.DefaultTransport.RoundTrip(r)
}

func TestBaruDenganTransportMemakaiTransportYangDiberikan(t *testing.T) {
	s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	defer s.Close()
	p := &penghitung{}
	resp, err := klien.BaruDenganTransport(time.Second, p).Get(s.URL)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if p.n != 1 {
		t.Errorf("transport dipakai %d kali, harus 1", p.n)
	}
}
