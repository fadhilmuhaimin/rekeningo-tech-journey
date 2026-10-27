package rahasia_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"lab/apit4/internal/rahasia"
)

// Pembaca secret (lab t4-infra, ADR 35 dan ADR 39): token dikirim, dokumen {sekarang, lama} dibaca, masa tumpang tindih,
// dan perilaku saat secret manager gagal (memakai pembacaan terakhir, menghitung kegagalan, tidak membocorkan isi).

type bao struct {
	mu     sync.Mutex
	kode   int
	isi    string
	token  string
	dibaca int
}

func baoUji(t *testing.T, isi string) (*bao, *httptest.Server) {
	t.Helper()
	b := &bao{kode: 200, isi: isi}
	s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b.mu.Lock()
		defer b.mu.Unlock()
		b.dibaca++
		b.token = r.Header.Get("X-Vault-Token")
		if r.URL.Path != "/v1/secret/data/pembayaran/webhook" || r.Method != "GET" {
			http.NotFound(w, r)
			return
		}
		w.WriteHeader(b.kode)
		fmt.Fprint(w, b.isi)
	}))
	t.Cleanup(s.Close)
	return b, s
}

func dok(versi int, sekarang, lama string) string {
	d := map[string]string{"sekarang": sekarang}
	if lama != "" {
		d["lama"] = lama
	}
	j, _ := json.Marshal(map[string]any{"data": map[string]any{"data": d, "metadata": map[string]any{"version": versi}}})
	return string(j)
}

func (b *bao) atur(kode int, isi string) {
	b.mu.Lock()
	b.kode, b.isi = kode, isi
	b.mu.Unlock()
}

func pembaca(s *httptest.Server) *rahasia.Pembaca {
	return rahasia.Baru(s.URL+"/", "token-uji", "/secret/data/pembayaran/webhook/", time.Second)
}

func TestMuatMembacaDokumenKVv2DenganTokenDanUrutanSekarangLaluLama(t *testing.T) {
	b, s := baoUji(t, dok(2, "baru-xyz", "lama-abc"))
	p := pembaca(s)
	if err := p.Muat(context.Background()); err != nil {
		t.Fatal(err)
	}
	if got := strings.Join(p.Daftar(), ","); got != "baru-xyz,lama-abc" {
		t.Fatalf("daftar %q: yang pertama harus sekarang, lalu lama", got)
	}
	if b.token != "token-uji" {
		t.Fatalf("token tidak dikirim di X-Vault-Token: %q", b.token)
	}
	if st := p.Status(); st.Versi != 2 || st.Jumlah != 2 || st.Dibaca != 1 || st.Gagal != 0 {
		t.Fatalf("status %+v", st)
	}
}

func TestDokumenTanpaLamaHanyaSatuRahasiaDanLamaSamaDenganSekarangTidakGanda(t *testing.T) {
	b, s := baoUji(t, dok(1, "satu", ""))
	p := pembaca(s)
	p.Muat(context.Background())
	if got := p.Daftar(); len(got) != 1 || got[0] != "satu" {
		t.Fatalf("tanpa lama: %v", got)
	}
	b.atur(200, dok(2, "satu", "satu"))
	p.Muat(context.Background())
	if got := p.Daftar(); len(got) != 1 {
		t.Fatalf("lama sama dengan sekarang tidak boleh ganda: %v", got)
	}
}

func TestPembacaanGagalMemakaiPembacaanTerakhirDanMenghitungKegagalan(t *testing.T) {
	b, s := baoUji(t, dok(1, "sekarang-1", "lama-1"))
	p := pembaca(s)
	if err := p.Muat(context.Background()); err != nil {
		t.Fatal(err)
	}
	for _, kasus := range []struct {
		kode int
		isi  string
	}{{403, `{"errors":["permission denied sekarang-1"]}`}, {404, `{"errors":[]}`}, {500, "x"}, {200, "bukan json"}, {200, dok(3, "", "lama-saja")}, {200, `{"data":null}`}} {
		b.atur(kasus.kode, kasus.isi)
		err := p.Muat(context.Background())
		if err == nil {
			t.Fatalf("%d %q harus galat", kasus.kode, kasus.isi)
		}
		if strings.Contains(err.Error(), "sekarang-1") || strings.Contains(err.Error(), "lama-1") {
			t.Fatalf("galat membocorkan isi jawaban atau rahasia: %v", err)
		}
		if got := strings.Join(p.Daftar(), ","); got != "sekarang-1,lama-1" {
			t.Fatalf("%d: pembacaan gagal harus mempertahankan daftar terakhir, dapat %q", kasus.kode, got)
		}
	}
	st := p.Status()
	if st.Gagal != 6 || st.GagalBeruntun != 6 || st.Dibaca != 1 || st.Versi != 1 {
		t.Fatalf("status %+v", st)
	}
	b.atur(200, dok(4, "sekarang-2", ""))
	if err := p.Muat(context.Background()); err != nil {
		t.Fatal(err)
	}
	if st := p.Status(); st.GagalBeruntun != 0 || st.Gagal != 6 || st.Versi != 4 || strings.Join(p.Daftar(), ",") != "sekarang-2" {
		t.Fatalf("sesudah pulih: %+v %v", st, p.Daftar())
	}
}

func TestPembacaTanpaPembacaanBerhasilTidakPunyaRahasia(t *testing.T) {
	_, s := baoUji(t, "")
	p := pembaca(s)
	if len(p.Daftar()) != 0 {
		t.Fatal("belum membaca apa pun: daftar harus kosong, bukan rahasia bawaan")
	}
}

func TestSecretManagerMatiBukanPanikDanDihitungGagal(t *testing.T) {
	_, s := baoUji(t, dok(1, "a", ""))
	p := pembaca(s)
	p.Muat(context.Background())
	s.Close()
	if err := p.Muat(context.Background()); err == nil {
		t.Fatal("server mati harus galat")
	}
	if got := p.Daftar(); len(got) != 1 || got[0] != "a" {
		t.Fatalf("daftar harus bertahan: %v", got)
	}
}

func TestJalanMembacaUlangBerkalaTanpaDeploy(t *testing.T) {
	b, s := baoUji(t, dok(1, "v1", ""))
	p := pembaca(s)
	p.Muat(context.Background())
	ctx, batal := context.WithCancel(context.Background())
	defer batal()
	go p.Jalan(ctx, 5*time.Millisecond)
	b.atur(200, dok(2, "v2", "v1"))
	menunggu(t, func() bool { return strings.Join(p.Daftar(), ",") == "v2,v1" }, "rotasi terbaca")
	b.atur(200, dok(3, "v2", ""))
	menunggu(t, func() bool { return strings.Join(p.Daftar(), ",") == "v2" }, "masa tumpang tindih berakhir")
	b.atur(500, "x")
	menunggu(t, func() bool { return p.Status().GagalBeruntun >= 2 }, "kegagalan beruntun terhitung")
	if got := strings.Join(p.Daftar(), ","); got != "v2" {
		t.Fatalf("saat gagal daftar harus bertahan: %q", got)
	}
}

func menunggu(t *testing.T, kondisi func() bool, apa string) {
	t.Helper()
	batas := time.Now().Add(5 * time.Second)
	for time.Now().Before(batas) {
		if kondisi() {
			return
		}
		time.Sleep(2 * time.Millisecond)
	}
	t.Fatalf("menunggu %s: lewat 5 detik", apa)
}

func TestSidikTidakMembukaNilaiDanDihitungDariSHA256(t *testing.T) {
	// SHA-256("abc") = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad (FIPS 180-2, contoh B.1).
	if got := rahasia.SidikPenuh("abc"); got != "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad" {
		t.Fatalf("SidikPenuh(abc) = %s", got)
	}
	if rahasia.Sidik("abc") != "ba7816bf" {
		t.Fatalf("Sidik = %s", rahasia.Sidik("abc"))
	}
	_, s := baoUji(t, dok(1, "rahasia-penuh-12345", ""))
	p := pembaca(s)
	p.Muat(context.Background())
	j, _ := json.Marshal(p.Status())
	if strings.Contains(string(j), "rahasia-penuh") {
		t.Fatalf("status membocorkan nilai: %s", j)
	}
}
