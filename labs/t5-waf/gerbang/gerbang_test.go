package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// Tes rantai gerbang: toko dan WAF palsu, hulu httptest, Redis sungguhan (TEST_REDIS_ADDR; TES_REDIS_WAJIB=1 gagal
// keras bila kosong). WAF sungguhan diuji di waf_test.go.

type tokoPalsu map[string]Mitra // sidik -> mitra

func (t tokoPalsu) CariKunci(_ context.Context, sidik string) (Mitra, bool, error) {
	m, ok := t[sidik]
	return m, ok, nil
}

type wafPalsu struct {
	blokirBila string // body atau jalur yang memuat teks ini diblokir
	galat      error
}

func (w wafPalsu) Periksa(r *http.Request, body []byte) (Keputusan, error) {
	if w.galat != nil {
		return Keputusan{}, w.galat
	}
	if w.blokirBila != "" && (strings.Contains(string(body), w.blokirBila) || strings.Contains(r.URL.String(), w.blokirBila)) {
		return Keputusan{Blokir: true, Status: 403, Aturan: []int{942100, 949110}}, nil
	}
	return Keputusan{}, nil
}

type lingkungan struct {
	t         *testing.T
	g         *Gerbang
	srv       *httptest.Server
	hulu      *httptest.Server
	dipanggil atomic.Int64
	kepala    atomic.Value // http.Header dari panggilan hulu terakhir
	tahan     chan struct{}
	jam       atomic.Int64
}

const (
	kunciA, kunciB, kunciC = "kunci-mitra-a", "kunci-mitra-b", "kunci-mitra-c"
	rahasiaA, rahasiaB     = "rahasia-a", "rahasia-b"
	rahasiaHuluTes         = "rahasia-hulu-tes"
)

func redisTes(t *testing.T) string {
	t.Helper()
	a := os.Getenv("TEST_REDIS_ADDR")
	if a == "" {
		if os.Getenv("TES_REDIS_WAJIB") == "1" {
			t.Fatal("TES_REDIS_WAJIB=1 tetapi TEST_REDIS_ADDR kosong")
		}
		t.Skip("TEST_REDIS_ADDR kosong: tes ini butuh Redis")
	}
	return a
}

func siapkan(t *testing.T, waf Pemeriksa, rentan ...string) *lingkungan {
	t.Helper()
	l := &lingkungan{t: t}
	l.hulu = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		l.dipanggil.Add(1)
		l.kepala.Store(r.Header.Clone())
		if l.tahan != nil && r.Header.Get(HeaderMitra) == "1" { // hanya mitra A ditahan di hulu
			<-l.tahan
		}
		io.WriteString(w, "ok")
	}))
	t.Cleanup(l.hulu.Close)
	u, _ := url.Parse(l.hulu.URL)
	modes := map[string]bool{}
	for _, m := range rentan {
		modes[m] = true
	}
	awalan := fmt.Sprintf("t5waf-tes-%d-%d:", time.Now().UnixNano(), os.Getpid())
	batas := BuatPembatas(redisTes(t), awalan, 20)
	t.Cleanup(func() { batas.Tutup() })
	l.jam.Store(1_800_000_000_000)
	batas.Jam = l.jam.Load
	l.g = &Gerbang{WAF: waf, Rahasia: map[int64]string{1: rahasiaA, 2: rahasiaB, 3: "rahasia-c"}, Batas: batas, Hulu: u,
		RahasiaHulu: rahasiaHuluTes, Rentan: modes, Toleransi: 5 * time.Minute, MaksBody: 1024, GagalMaks: 5,
		Sekarang: func() time.Time { return time.Unix(1_800_000_000, 0) }}
	l.g.Toko = tokoPalsu{
		SidikKunci(kunciA): {ID: 1, Nama: "A", Status: "aktif", KuotaPerDetik: 100},
		SidikKunci(kunciB): {ID: 2, Nama: "B", Status: "aktif", KuotaPerDetik: 100},
		SidikKunci(kunciC): {ID: 3, Nama: "C", Status: "dibekukan", KuotaPerDetik: 100},
	}
	l.g.Siap()
	l.srv = httptest.NewServer(l.g)
	t.Cleanup(l.srv.Close)
	return l
}

// kirim membuat permintaan bertanda tangan sah untuk mitra, lalu membiarkan pemanggil mengubahnya lewat ubah.
func (l *lingkungan) kirim(kunci, rahasia, method, uri, body string, ubah ...func(*http.Request)) *http.Response {
	l.t.Helper()
	r, _ := http.NewRequest(method, l.srv.URL+uri, strings.NewReader(body))
	ts := time.Unix(1_800_000_000, 0).Unix()
	r.Header.Set(HeaderKunci, kunci)
	r.Header.Set(HeaderWaktu, strconv.FormatInt(ts, 10))
	r.Header.Set(HeaderTanda, TandaTangan(rahasia, ts, method, uri, []byte(body)))
	if method == "POST" {
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("Idempotency-Key", `"00000000-0000-4000-8000-000000000001"`)
	}
	for _, u := range ubah {
		u(r)
	}
	resp, err := http.DefaultClient.Do(r)
	if err != nil {
		l.t.Fatal(err)
	}
	return resp
}

func status(r *http.Response) (int, string) {
	defer r.Body.Close()
	b, _ := io.ReadAll(r.Body)
	return r.StatusCode, string(b)
}

func (l *lingkungan) harus(r *http.Response, kode int, tipe string) {
	l.t.Helper()
	s, b := status(r)
	if s != kode || (tipe != "" && !strings.Contains(b, "/problems/"+tipe+`"`)) {
		l.t.Fatalf("status %d %s, harus %d %s", s, b, kode, tipe)
	}
}

const uriQR = "/pos/v1/merchant/30001/qr"

func TestGerbangMeneruskanDenganIdentitasDariGerbang(t *testing.T) {
	l := siapkan(t, wafPalsu{})
	// Client mencoba memalsukan kepala identitas: gerbang membuangnya dan memasang yang dari kunci API yang sah.
	r := l.kirim(kunciA, rahasiaA, "POST", uriQR, `{"nominal":25000}`, func(r *http.Request) {
		r.Header.Set(HeaderMitra, "2")
		r.Header.Set(HeaderRahasiaGerbang, "tebakan")
		r.Header.Set("X-Lab-Apa-Saja", "x")
	})
	if s, _ := status(r); s != 200 {
		t.Fatalf("status %d", s)
	}
	h := l.kepala.Load().(http.Header)
	if h.Get(HeaderMitra) != "1" || h.Get(HeaderRahasiaGerbang) != rahasiaHuluTes {
		t.Errorf("kepala identitas di hulu: mitra=%q rahasia=%q", h.Get(HeaderMitra), h.Get(HeaderRahasiaGerbang))
	}
	for _, k := range []string{HeaderKunci, HeaderTanda, HeaderWaktu, "X-Lab-Apa-Saja"} {
		if h.Get(k) != "" {
			t.Errorf("kepala %s ikut ke hulu: %q", k, h.Get(k))
		}
	}
	if h.Get("Idempotency-Key") == "" {
		t.Error("Idempotency-Key harus sampai ke hulu")
	}
}

func TestGerbangTandaTanganSalah(t *testing.T) {
	l := siapkan(t, wafPalsu{})
	ts := strconv.FormatInt(1_800_000_000, 10)
	l.harus(l.kirim(kunciA, "rahasia-lain", "POST", uriQR, `{"nominal":1}`), 401, "tanda-tangan-salah")
	l.harus(l.kirim(kunciA, rahasiaA, "POST", uriQR, `{"nominal":1}`, func(r *http.Request) {
		r.Body = io.NopCloser(strings.NewReader(`{"nominal":2}`)) // body diubah sesudah ditandatangani
		r.ContentLength = int64(len(`{"nominal":2}`))
	}), 401, "tanda-tangan-salah")
	l.harus(l.kirim(kunciA, rahasiaA, "POST", uriQR, `{"nominal":1}`, func(r *http.Request) { r.Header.Del(HeaderTanda) }), 401, "tanda-tangan-salah")
	// Tanda tangan mitra B tidak berlaku dengan kunci mitra A.
	l.harus(l.kirim(kunciA, rahasiaB, "POST", uriQR, `{"nominal":1}`), 401, "tanda-tangan-salah")
	for nama, w := range map[string]string{"lama": "1799999000", "depan": "1800001000", "kosong": "", "bukan angka": "x"} {
		r := l.kirim(kunciA, rahasiaA, "POST", uriQR, `{"nominal":1}`, func(r *http.Request) {
			r.Header.Set(HeaderWaktu, w)
			if w == "1799999000" || w == "1800001000" {
				n, _ := strconv.ParseInt(w, 10, 64)
				r.Header.Set(HeaderTanda, TandaTangan(rahasiaA, n, "POST", uriQR, []byte(`{"nominal":1}`)))
			}
		})
		_ = nama
		l.harus(r, 401, "waktu-di-luar-toleransi")
	}
	_ = ts
	if n := l.dipanggil.Load(); n != 0 {
		t.Fatalf("hulu dipanggil %d kali oleh permintaan yang ditolak", n)
	}
}

func TestGerbangKunciTidakSah(t *testing.T) {
	l := siapkan(t, wafPalsu{})
	l.harus(l.kirim("kunci-asal", rahasiaA, "GET", uriQR, ""), 401, "kunci-tidak-sah")
	l.harus(l.kirim(kunciC, "rahasia-c", "GET", uriQR, ""), 401, "kunci-tidak-sah") // mitra dibekukan: jawaban sama
	l.harus(l.kirim("", rahasiaA, "GET", uriQR, ""), 401, "kunci-tidak-sah")
	// Tiga kegagalan tercatat; dua lagi mencapai GagalMaks (5), yang keenam dijawab 429.
	l.harus(l.kirim("tebak-1", rahasiaA, "GET", uriQR, ""), 401, "kunci-tidak-sah")
	l.harus(l.kirim("tebak-2", rahasiaA, "GET", uriQR, ""), 401, "kunci-tidak-sah")
	l.harus(l.kirim("tebak-3", rahasiaA, "GET", uriQR, ""), 429, "terlalu-banyak-percobaan-kunci")
	// Kasir mitra yang sah di alamat yang sama tidak terhalang hitungan kegagalan.
	l.harus(l.kirim(kunciA, rahasiaA, "GET", uriQR, ""), 200, "")
	if n := l.dipanggil.Load(); n != 1 {
		t.Fatalf("hulu dipanggil %d kali, harus 1 (hanya kunci yang sah)", n)
	}
}

func TestGerbangIdempotencyKeyWajib(t *testing.T) {
	l := siapkan(t, wafPalsu{})
	tanpa := func(r *http.Request) { r.Header.Del("Idempotency-Key") }
	for _, m := range []string{"POST", "PUT", "PATCH", "DELETE"} {
		l.harus(l.kirim(kunciA, rahasiaA, m, uriQR, `{}`, tanpa), 400, "idempotency-key-wajib")
	}
	l.harus(l.kirim(kunciA, rahasiaA, "POST", uriQR, `{}`, func(r *http.Request) { r.Header.Set("Idempotency-Key", "  ") }), 400, "idempotency-key-wajib")
	l.harus(l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x", ""), 200, "")
	l.harus(l.kirim(kunciA, rahasiaA, "POST", uriQR, `{}`), 200, "")
	if n := l.dipanggil.Load(); n != 2 {
		t.Fatalf("hulu dipanggil %d kali, harus 2", n)
	}
}

func TestGerbangIdempotencyKeyOpsionalDiModeRentan(t *testing.T) {
	l := siapkan(t, wafPalsu{}, RentanTanpaWajibKey)
	l.harus(l.kirim(kunciA, rahasiaA, "POST", uriQR, `{}`, func(r *http.Request) { r.Header.Del("Idempotency-Key") }), 200, "")
}

// Satu mitra yang melewati 100 per detik mendapat 429; mitra lain tetap 200. Jam bucket dibekukan, jadi 100 permintaan
// pertama lolos persis dan yang ke-101 ditolak. Kapasitas bucket sama dengan lajunya (satu detik).
func TestGerbangKuotaPerMitra(t *testing.T) {
	l := siapkan(t, wafPalsu{})
	for i := 0; i < 100; i++ {
		if s, _ := status(l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x", "")); s != 200 {
			t.Fatalf("permintaan %d dari mitra A: %d", i+1, s)
		}
	}
	r := l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x", "")
	if r.Header.Get("Retry-After") != "1" {
		t.Errorf("Retry-After %q", r.Header.Get("Retry-After"))
	}
	l.harus(r, 429, "kuota-terlampaui")
	l.harus(l.kirim(kunciB, rahasiaB, "GET", uriQR+"/x", ""), 200, "")
	l.jam.Add(500) // setengah detik: 50 token terisi
	n := 0
	for i := 0; i < 60; i++ {
		if s, _ := status(l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x", "")); s == 200 {
			n++
		}
	}
	if n != 50 {
		t.Fatalf("sesudah 500 ms terisi %d token, harus 50", n)
	}
	l.jam.Add(10_000) // jauh lebih lama dari satu detik: bucket penuh, tidak lebih dari kapasitas
	n = 0
	for i := 0; i < 130; i++ {
		if s, _ := status(l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x", "")); s == 200 {
			n++
		}
	}
	if n != 100 {
		t.Fatalf("bucket penuh meloloskan %d, harus 100 (kapasitas)", n)
	}
}

// Mode rentan kuota-bersama (M50 seperti terjadi): satu bucket untuk semua mitra, jadi mitra A menghabiskannya dan
// mitra B ikut 429.
func TestGerbangKuotaBersamaDiModeRentan(t *testing.T) {
	l := siapkan(t, wafPalsu{}, RentanKuotaBersama)
	for i := 0; i < 100; i++ {
		status(l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x", ""))
	}
	l.harus(l.kirim(kunciB, rahasiaB, "GET", uriQR+"/x", ""), 429, "kuota-terlampaui")
}

// Permintaan berjalan: 20 bersamaan lolos, yang ke-21 dijawab 429, mitra lain tetap 200, dan slot kembali bebas
// sesudah hulu menjawab.
func TestGerbangBerjalanPerMitra(t *testing.T) {
	l := siapkan(t, wafPalsu{})
	l.tahan = make(chan struct{})
	var wg sync.WaitGroup
	hasil := make(chan int, 40)
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			s, _ := status(l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x", ""))
			hasil <- s
		}()
	}
	for l.dipanggil.Load() < 20 {
		time.Sleep(5 * time.Millisecond)
	}
	l.harus(l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x", ""), 429, "terlalu-banyak-berjalan")
	l.harus(l.kirim(kunciB, rahasiaB, "GET", uriQR+"/x", ""), 200, "")
	close(l.tahan)
	wg.Wait()
	close(hasil)
	n := 0
	for s := range hasil {
		if s == 200 {
			n++
		}
	}
	if n != 20 {
		t.Fatalf("%d dari 20 permintaan berjalan selesai 200", n)
	}
	l.harus(l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x", ""), 200, "") // slot dilepas
}

func TestGerbangWAF(t *testing.T) {
	l := siapkan(t, wafPalsu{blokirBila: "SERANG"})
	l.harus(l.kirim(kunciA, rahasiaA, "POST", uriQR, `{"referensi":"SERANG"}`), 403, "diblokir-waf")
	l.harus(l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x?q=SERANG", ""), 403, "diblokir-waf")
	if n := l.dipanggil.Load(); n != 0 {
		t.Fatalf("hulu dipanggil %d kali oleh permintaan yang diblokir WAF", n)
	}
	// WAF memeriksa sebelum kunci dikenali: permintaan tanpa kunci pun diblokir dengan 403, bukan 401.
	l.harus(l.kirim("", "", "POST", uriQR, `{"referensi":"SERANG"}`), 403, "diblokir-waf")
}

// WAF yang gagal memeriksa menolak permintaan (gagal tertutup), tidak meloloskannya.
func TestGerbangWAFGagalTertutup(t *testing.T) {
	l := siapkan(t, wafPalsu{galat: fmt.Errorf("rusak")})
	l.harus(l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x", ""), 503, "waf-gagal")
	if n := l.dipanggil.Load(); n != 0 {
		t.Fatalf("hulu dipanggil %d kali padahal WAF gagal", n)
	}
}

func TestGerbangRuteDanBatasBody(t *testing.T) {
	l := siapkan(t, wafPalsu{})
	l.harus(l.kirim(kunciA, rahasiaA, "GET", "/login", ""), 404, "tidak-ditemukan") // hanya /pos/v1/ yang diteruskan
	l.harus(l.kirim(kunciA, rahasiaA, "GET", "/akun/1", ""), 404, "tidak-ditemukan")
	besar := `{"referensi":"` + strings.Repeat("a", 2000) + `"}`
	l.harus(l.kirim(kunciA, rahasiaA, "POST", uriQR, besar), 413, "body-terlalu-besar")
	if n := l.dipanggil.Load(); n != 0 {
		t.Fatalf("hulu dipanggil %d kali", n)
	}
}

// Redis tidak terjangkau: kuota tidak bisa dihitung, jadi permintaan ditolak 503 (tutup), tidak diteruskan.
func TestGerbangRedisMati(t *testing.T) {
	l := siapkan(t, wafPalsu{})
	l.g.Batas = BuatPembatas("127.0.0.1:1", "x:", 20)
	l.harus(l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x", ""), 503, "kuota-tidak-tersedia")
	l.harus(l.kirim("kunci-asal", rahasiaA, "GET", uriQR+"/x", ""), 503, "kuota-tidak-tersedia")
	if n := l.dipanggil.Load(); n != 0 {
		t.Fatalf("hulu dipanggil %d kali padahal Redis mati", n)
	}
}

func TestGerbangHuluMati(t *testing.T) {
	l := siapkan(t, wafPalsu{})
	l.hulu.Close()
	l.harus(l.kirim(kunciA, rahasiaA, "GET", uriQR+"/x", ""), 502, "hulu-tidak-tersedia")
}
