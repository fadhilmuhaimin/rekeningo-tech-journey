package objek

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"
)

// Contoh bertanda tangan dari dokumentasi AWS S3 ("Authenticating Requests: Using Query Parameters (AWS Signature
// Version 4)", dibuka 2026-10-27): kunci akses dan rahasia contoh milik dokumentasi, bukan kredensial. Signature
// harus persis nilai dokumen; ini satu-satunya pembanding di luar kode kita untuk rumus penandatanganan.
func TestTandaiURLCocokDenganContohDokumentasiAWS(t *testing.T) {
	got := tandaiURL("https", "examplebucket.s3.amazonaws.com", "/test.txt", "GET",
		"AKIAIOSFODNN7EXAMPLE", "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", "us-east-1",
		time.Date(2013, 5, 24, 0, 0, 0, 0, time.UTC), 86400*time.Second, nil)
	const harus = "https://examplebucket.s3.amazonaws.com/test.txt?" +
		"X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request" +
		"&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host" +
		"&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404"
	if got != harus {
		t.Fatalf("URL bertanda tangan:\n dapat  %s\n harus %s", got, harus)
	}
}

// s3Palsu adalah penyimpanan objek S3 minimal di memori yang memeriksa tanda tangan dan masa berlaku seperti yang
// dilakukan penyimpanan sungguhan (SeaweedFS di lab t4-storage): hitung ulang dari permintaan, tolak yang beda
// (403) dan yang kedaluwarsa (403). Jamnya sendiri, terpisah dari jam penanda tangan.
type s3Palsu struct {
	mu      sync.Mutex
	objek   map[string][]byte
	jam     time.Time
	kunci   string
	rahasia string
	ditolak []string
}

func baruPalsu(t *testing.T, jam time.Time) (*s3Palsu, S3, *time.Time) {
	t.Helper()
	p := &s3Palsu{objek: map[string][]byte{}, jam: jam, kunci: "kunci-uji", rahasia: "rahasia-uji"}
	srv := httptest.NewServer(p)
	t.Cleanup(srv.Close)
	jamPenanda := jam
	s := S3{Endpoint: srv.URL, Bucket: "bkt", Kunci: p.kunci, Rahasia: p.rahasia, Jam: func() time.Time { return jamPenanda }}
	return p, s, &jamPenanda
}

func (p *s3Palsu) tolak(w http.ResponseWriter, alasan string) {
	p.mu.Lock()
	p.ditolak = append(p.ditolak, alasan)
	p.mu.Unlock()
	http.Error(w, alasan, http.StatusForbidden)
}

func (p *s3Palsu) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	stempel, err := time.Parse("20060102T150405Z", q.Get("X-Amz-Date"))
	umur, err2 := strconv.Atoi(q.Get("X-Amz-Expires"))
	if err != nil || err2 != nil || umur < 1 || umur > 604800 {
		http.Error(w, "parameter tanda tangan salah", http.StatusBadRequest)
		return
	}
	p.mu.Lock()
	sekarang := p.jam
	p.mu.Unlock()
	if sekarang.After(stempel.Add(time.Duration(umur) * time.Second)) {
		p.tolak(w, "Request has expired")
		return
	}
	header := map[string]string{}
	for _, n := range strings.Split(q.Get("X-Amz-SignedHeaders"), ";") {
		switch n {
		case "host":
		case "content-length":
			header[n] = strconv.FormatInt(r.ContentLength, 10)
		default:
			header[n] = r.Header.Get(n)
		}
	}
	cred := strings.Split(q.Get("X-Amz-Credential"), "/")
	if len(cred) != 5 || cred[0] != p.kunci {
		p.tolak(w, "kunci tidak dikenal")
		return
	}
	harus := tandaiURL("http", r.Host, r.URL.Path, r.Method, p.kunci, p.rahasia, cred[2], stempel, time.Duration(umur)*time.Second, header)
	u, _ := url.Parse(harus)
	if u.Query().Get("X-Amz-Signature") != q.Get("X-Amz-Signature") {
		p.tolak(w, "SignatureDoesNotMatch")
		return
	}
	nama := strings.TrimPrefix(r.URL.Path, "/")
	p.mu.Lock()
	defer p.mu.Unlock()
	switch r.Method {
	case http.MethodPut:
		b, _ := io.ReadAll(r.Body)
		if !strings.Contains(nama, "/") { // PUT bucket
			w.WriteHeader(http.StatusOK)
			return
		}
		p.objek[nama] = b
	case http.MethodGet, http.MethodHead:
		b, ada := p.objek[nama]
		if !ada {
			http.Error(w, "NoSuchKey", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Length", strconv.Itoa(len(b)))
		if r.Method == http.MethodGet {
			w.Write(b)
		}
	case http.MethodDelete:
		delete(p.objek, nama)
		w.WriteHeader(http.StatusNoContent)
	}
}

func put(t *testing.T, url string, isi []byte) int {
	t.Helper()
	req, _ := http.NewRequest(http.MethodPut, url, bytes.NewReader(isi))
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	return resp.StatusCode
}

func TestS3SimpanBacaUkuranHapus(t *testing.T) {
	_, s, _ := baruPalsu(t, time.Date(2026, 10, 27, 9, 0, 0, 0, time.UTC))
	ctx := context.Background()
	if err := s.PastikanBucket(ctx); err != nil {
		t.Fatal(err)
	}
	isi := []byte("isi-berkas-uji")
	if err := s.Simpan(ctx, "identitas/7/abc", isi); err != nil {
		t.Fatal(err)
	}
	if got, err := s.Baca(ctx, "identitas/7/abc"); err != nil || !bytes.Equal(got, isi) {
		t.Fatalf("Baca: %q, %v", got, err)
	}
	if n, err := s.Ukuran(ctx, "identitas/7/abc"); err != nil || n != int64(len(isi)) {
		t.Fatalf("Ukuran: %d, %v", n, err)
	}
	if err := s.Hapus(ctx, "identitas/7/abc"); err != nil {
		t.Fatal(err)
	}
	if err := s.Hapus(ctx, "identitas/7/abc"); err != nil {
		t.Fatalf("Hapus objek yang sudah tidak ada harus berhasil (idempoten): %v", err)
	}
	if _, err := s.Baca(ctx, "identitas/7/abc"); !errors.Is(err, ErrTidakAda) {
		t.Fatalf("Baca sesudah Hapus: %v, harus ErrTidakAda", err)
	}
	if _, err := s.Ukuran(ctx, "identitas/7/abc"); !errors.Is(err, ErrTidakAda) {
		t.Fatalf("Ukuran sesudah Hapus: %v, harus ErrTidakAda", err)
	}
}

func TestS3KunciTidakSahDitolakSebelumKeJaringan(t *testing.T) {
	p, s, _ := baruPalsu(t, time.Now())
	for _, k := range []string{"", "../x", "identitas//abc", "Identitas/abc", "identitas/a b", "/identitas/abc", "identitas/abc/"} {
		if err := s.Simpan(context.Background(), k, []byte("x")); err == nil {
			t.Errorf("kunci %q harus ditolak", k)
		}
		if _, err := s.PresignPUT(k, time.Minute, 0); err == nil {
			t.Errorf("PresignPUT kunci %q harus ditolak", k)
		}
	}
	if len(p.objek) != 0 {
		t.Fatalf("tidak boleh ada objek yang tertulis: %v", p.objek)
	}
}

// URL PUT dipakai oleh pemegang lain tanpa kredensial apa pun: berhasil sampai kedaluwarsa, ditolak sesudahnya.
func TestPresignPUTDipakaiPemegangLainSampaiKedaluwarsa(t *testing.T) {
	p, s, jam := baruPalsu(t, time.Date(2026, 10, 27, 9, 0, 0, 0, time.UTC))
	u, err := s.PresignPUT("identitas/7/abc", 5*time.Minute, 0)
	if err != nil {
		t.Fatal(err)
	}
	if got := put(t, u, []byte("pertama")); got != http.StatusOK {
		t.Fatalf("PUT di detik 0: status %d", got)
	}
	p.mu.Lock()
	p.jam = jam.Add(5 * time.Minute) // tepat di batas: belum kedaluwarsa
	p.mu.Unlock()
	if got := put(t, u, []byte("kedua")); got != http.StatusOK {
		t.Fatalf("PUT tepat 5 menit: status %d, harus 200 (batas termasuk)", got)
	}
	if string(p.objek["bkt/identitas/7/abc"]) != "kedua" {
		t.Fatalf("PUT ke kunci yang sama harus menimpa, objek: %q", p.objek["bkt/identitas/7/abc"])
	}
	p.mu.Lock()
	p.jam = jam.Add(5*time.Minute + time.Second)
	p.mu.Unlock()
	if got := put(t, u, []byte("ketiga")); got != http.StatusForbidden {
		t.Fatalf("PUT 5 menit 1 detik: status %d, harus 403", got)
	}
	if string(p.objek["bkt/identitas/7/abc"]) != "kedua" {
		t.Fatal("PUT yang kedaluwarsa tidak boleh mengubah objek")
	}
}

func TestPresignPUTUkuranDitandatanganMenolakPanjangLain(t *testing.T) {
	_, s, _ := baruPalsu(t, time.Now())
	u, err := s.PresignPUT("identitas/7/abc", time.Minute, 5)
	if err != nil {
		t.Fatal(err)
	}
	if got := put(t, u, []byte("12345")); got != http.StatusOK {
		t.Fatalf("panjang tepat: status %d", got)
	}
	if got := put(t, u, []byte("123456")); got != http.StatusForbidden {
		t.Fatalf("panjang lebih 1 byte: status %d, harus 403", got)
	}
	if got := put(t, u, []byte("1234")); got != http.StatusForbidden {
		t.Fatalf("panjang kurang 1 byte: status %d, harus 403", got)
	}
	// Tanpa ukuran, apa pun diterima: penyimpanan tidak membatasi.
	u2, _ := s.PresignPUT("identitas/7/def", time.Minute, 0)
	if got := put(t, u2, bytes.Repeat([]byte("x"), 100000)); got != http.StatusOK {
		t.Fatalf("tanpa ukuran, 100.000 byte: status %d", got)
	}
}

func TestPresignPUTKunciLainAtauMetodeLainDitolak(t *testing.T) {
	p, s, _ := baruPalsu(t, time.Now())
	u, _ := s.PresignPUT("identitas/7/abc", time.Minute, 0)
	lain := strings.Replace(u, "identitas/7/abc", "identitas/7/xyz", 1)
	if got := put(t, lain, []byte("x")); got != http.StatusForbidden {
		t.Fatalf("URL dengan kunci diganti: status %d, harus 403", got)
	}
	req, _ := http.NewRequest(http.MethodGet, u, nil) // URL PUT dipakai untuk GET
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("URL PUT dipakai GET: status %d, harus 403", resp.StatusCode)
	}
	if len(p.objek) != 0 {
		t.Fatalf("objek tertulis: %v", p.objek)
	}
}

func TestPresignUmurDiLuarRentangDitolak(t *testing.T) {
	_, s, _ := baruPalsu(t, time.Now())
	for _, umur := range []time.Duration{0, time.Second - 1, -time.Minute, 604801 * time.Second, 8 * 24 * time.Hour} {
		if _, err := s.PresignPUT("identitas/7/abc", umur, 0); err == nil {
			t.Errorf("umur %s harus ditolak", umur)
		}
	}
	for _, umur := range []time.Duration{time.Second, 604800 * time.Second} {
		if _, err := s.PresignPUT("identitas/7/abc", umur, 0); err != nil {
			t.Errorf("umur %s harus diterima: %v", umur, err)
		}
	}
}

// Pesan galat tidak boleh memuat URL bertanda tangan: URL itu bearer token dan *url.Error menulisnya lengkap.
func TestGalatS3TidakMemuatTandaTanganAtauURL(t *testing.T) {
	srv := httptest.NewServer(http.NotFoundHandler())
	endpoint := srv.URL
	srv.Close() // koneksi ditolak
	s := S3{Endpoint: endpoint, Bucket: "bkt", Kunci: "kunci-uji", Rahasia: "rahasia-uji"}
	ctx := context.Background()
	_, e1 := s.Baca(ctx, "identitas/7/abc")
	e2 := s.Simpan(ctx, "identitas/7/abc", []byte("x"))
	_, e3 := s.Ukuran(ctx, "identitas/7/abc")
	e4 := s.Hapus(ctx, "identitas/7/abc")
	e5 := s.PastikanBucket(ctx)
	for i, err := range []error{e1, e2, e3, e4, e5} {
		if err == nil {
			t.Fatalf("galat %d: harus gagal karena koneksi ditolak", i)
		}
		for _, terlarang := range []string{"X-Amz", "Signature", "Credential", "kunci-uji", "http://", endpoint, "identitas/7/abc"} {
			if strings.Contains(err.Error(), terlarang) {
				t.Errorf("galat %d memuat %q: %v", i, terlarang, err)
			}
		}
	}
}

func TestGalatStatusS3TidakMemuatURL(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { http.Error(w, "rusak "+r.URL.RawQuery, 500) }))
	defer srv.Close()
	s := S3{Endpoint: srv.URL, Bucket: "bkt", Kunci: "k", Rahasia: "r"}
	_, err := s.Baca(context.Background(), "identitas/7/abc")
	if err == nil || strings.Contains(err.Error(), "X-Amz") || strings.Contains(err.Error(), "rusak") || !strings.Contains(err.Error(), "500") {
		t.Fatalf("galat status: %v", err)
	}
}

func TestBacaMemakaiBatasUkuran(t *testing.T) {
	p, s, _ := baruPalsu(t, time.Now())
	ctx := context.Background()
	s.MaksBaca = 10
	p.objek["bkt/identitas/7/pas"] = bytes.Repeat([]byte("a"), 10)
	p.objek["bkt/identitas/7/lebih"] = bytes.Repeat([]byte("a"), 11)
	if b, err := s.Baca(ctx, "identitas/7/pas"); err != nil || len(b) != 10 {
		t.Fatalf("tepat di batas: %d byte, %v", len(b), err)
	}
	if _, err := s.Baca(ctx, "identitas/7/lebih"); !errors.Is(err, ErrTerlaluBesar) {
		t.Fatalf("satu byte di atas batas: %v, harus ErrTerlaluBesar", err)
	}
}

func TestBacaBatasUkuranTanpaContentLengthTetapDitegakkan(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Chunked: panjang tidak diumumkan, jadi hanya pembacaan terbatas yang melindungi memori.
		f := w.(http.Flusher)
		for i := 0; i < 5; i++ {
			w.Write(bytes.Repeat([]byte("a"), 4))
			f.Flush()
		}
	}))
	defer srv.Close()
	s := S3{Endpoint: srv.URL, Bucket: "bkt", Kunci: "k", Rahasia: "r", MaksBaca: 10}
	if _, err := s.Baca(context.Background(), "identitas/7/abc"); !errors.Is(err, ErrTerlaluBesar) {
		t.Fatalf("20 byte chunked dengan batas 10: %v, harus ErrTerlaluBesar", err)
	}
}

func TestEndpointTidakSahDitolak(t *testing.T) {
	for _, e := range []string{"", "127.0.0.1:9000", "ftp://x", "http://"} {
		s := S3{Endpoint: e, Bucket: "bkt", Kunci: "k", Rahasia: "r"}
		if _, err := s.PresignPUT("identitas/7/abc", time.Minute, 0); err == nil {
			t.Errorf("endpoint %q harus ditolak", e)
		}
	}
}
