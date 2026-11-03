package jangkar

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

var (
	c1 = strings.Repeat("a1", 32)
	c2 = strings.Repeat("b2", 32)
)

func TestHanyaBertambah(t *testing.T) {
	p := filepath.Join(t.TempDir(), "jangkar.jsonl")
	if err := Catat(p, "2026-04-01", c1); err != nil {
		t.Fatal(err)
	}
	awal, _ := os.ReadFile(p)
	if err := Catat(p, "2026-05-01", c2); err != nil {
		t.Fatal(err)
	}
	akhir, _ := os.ReadFile(p)
	if !strings.HasPrefix(string(akhir), string(awal)) || strings.Count(string(akhir), "\n") != 2 {
		t.Fatalf("baris lama harus tetap di depan dan berkas hanya bertambah:\n%s", akhir)
	}
	if st, _ := os.Stat(p); st.Mode().Perm() != 0o600 {
		t.Fatalf("izin %v, harus 0600", st.Mode().Perm())
	}
}

func TestPeriodeSamaChecksumBeda(t *testing.T) {
	p := filepath.Join(t.TempDir(), "jangkar.jsonl")
	if err := Catat(p, "2026-04-01", c1); err != nil {
		t.Fatal(err)
	}
	if err := Catat(p, "2026-04-01", c1); err != nil {
		t.Fatalf("catat ulang yang sama harus lolos: %v", err)
	}
	if b, _ := os.ReadFile(p); strings.Count(string(b), "\n") != 1 {
		t.Fatal("catat ulang yang sama menambah baris")
	}
	if err := Catat(p, "2026-04-01", c2); !errors.Is(err, ErrBeda) {
		t.Fatalf("checksum lain harus ErrBeda, dapat %v", err)
	}
	if b, _ := os.ReadFile(p); strings.Contains(string(b), c2) {
		t.Fatal("checksum yang ditolak tertulis di berkas")
	}
}

func TestMasukanTidakSah(t *testing.T) {
	p := filepath.Join(t.TempDir(), "jangkar.jsonl")
	for _, c := range []struct{ per, sum string }{
		{"2026-04-02", c1}, {"2026-4-01", c1}, {"2026-04-01", "abc"}, {"2026-04-01", strings.ToUpper(c1)}, {"", ""},
	} {
		if err := Catat(p, c.per, c.sum); err == nil {
			t.Errorf("%q %q harus ditolak", c.per, c.sum)
		}
	}
	if _, err := os.Stat(p); err == nil {
		t.Fatal("masukan tidak sah membuat berkas")
	}
}

func TestBarisRusakMembuatBacaGagal(t *testing.T) {
	p := filepath.Join(t.TempDir(), "jangkar.jsonl")
	for nama, isi := range map[string]string{
		"bukan JSON":     "rusak\n",
		"kolom asing":    `{"periode":"2026-04-01","checksum":"` + c1 + `","dicatat":"x","lain":1}` + "\n",
		"checksum rusak": `{"periode":"2026-04-01","checksum":"zz","dicatat":"x"}` + "\n",
	} {
		os.WriteFile(p, []byte(isi), 0o600)
		if _, err := Baca(p); err == nil {
			t.Errorf("%s: pembacaan harus gagal, bukan dilewati diam-diam", nama)
		}
		if err := Catat(p, "2026-05-01", c2); err == nil {
			t.Errorf("%s: Catat di atas berkas rusak harus gagal", nama)
		}
	}
}

func TestBerkasBelumAda(t *testing.T) {
	semua, err := Baca(filepath.Join(t.TempDir(), "tidak-ada.jsonl"))
	if err != nil || len(semua) != 0 {
		t.Fatalf("berkas yang belum ada berarti belum ada jangkar: %v %v", semua, err)
	}
}
