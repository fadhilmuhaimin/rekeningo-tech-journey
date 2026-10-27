package unduh

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"image"
	"image/png"
	"net"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

var pngKecil = func() []byte {
	var b bytes.Buffer
	if err := png.Encode(&b, image.NewRGBA(image.Rect(0, 0, 1, 1))); err != nil {
		panic(err)
	}
	return b.Bytes()
}()

const jsonDalam = `{"layanan":"penyimpanan-internal","kunci_akses":"rahasia-lab"}`

// server uji: menghitung berapa permintaan yang sampai, supaya "ditolak" dibuktikan dengan nol permintaan, bukan
// hanya dengan galat.
type serverUji struct {
	*httptest.Server
	kena atomic.Int64
}

func mulaiServer(t *testing.T, tls bool, h http.Handler) *serverUji {
	t.Helper()
	s := &serverUji{}
	bungkus := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		s.kena.Add(1)
		h.ServeHTTP(w, r)
	})
	if tls {
		s.Server = httptest.NewTLSServer(bungkus)
	} else {
		s.Server = httptest.NewServer(bungkus)
	}
	t.Cleanup(s.Close)
	return s
}

func port(s *serverUji) string { _, p, _ := net.SplitHostPort(s.Listener.Addr().String()); return p }

// isiPNG: tanda tangan PNG diikuti nol sampai n byte. DetectContentType hanya melihat 8 byte pertama.
func isiPNG(n int) []byte {
	b := make([]byte, n)
	copy(b, pngKecil[:8])
	return b
}

func ruteUmum() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/gambar.png", func(w http.ResponseWriter, r *http.Request) { w.Write(pngKecil) })
	mux.HandleFunc("/dalam", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(jsonDalam))
	})
	mux.HandleFunc("/html", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("<html><body>bukan gambar</body></html>"))
	})
	mux.HandleFunc("/svg", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/svg+xml")
		w.Write([]byte(`<svg xmlns="http://www.w3.org/2000/svg"></svg>`))
	})
	mux.HandleFunc("/hilang", func(w http.ResponseWriter, r *http.Request) { http.NotFound(w, r) })
	mux.HandleFunc("/lambat", func(w http.ResponseWriter, r *http.Request) {
		select {
		case <-time.After(3 * time.Second):
		case <-r.Context().Done():
		}
		w.Write(pngKecil)
	})
	// Ukuran persis di batas, satu byte di atas batas (Content-Length diketahui), dan 3 MiB tanpa Content-Length.
	mux.HandleFunc("/tepat", func(w http.ResponseWriter, r *http.Request) { w.Write(isiPNG(BatasUkuran)) })
	mux.HandleFunc("/lebih", func(w http.ResponseWriter, r *http.Request) { w.Write(isiPNG(BatasUkuran + 1)) })
	mux.HandleFunc("/mengalir", func(w http.ResponseWriter, r *http.Request) {
		w.Write(isiPNG(1024))
		w.(http.Flusher).Flush() // Flush lebih dulu: respons chunked, tidak ada Content-Length
		w.Write(make([]byte, 3<<20))
	})
	return mux
}

func lokal(extra ...func(*Aturan)) Aturan {
	a := Aturan{IzinkanHTTP: true, IzinkanLoopback: true, Waktu: 2 * time.Second}
	for _, f := range extra {
		f(&a)
	}
	return a
}

func TestAmanMenerimaGambarSahDariServerTLS(t *testing.T) {
	s := mulaiServer(t, true, ruteUmum())
	pool := x509.NewCertPool()
	pool.AddCert(s.Certificate())
	a := Aturan{IzinkanLoopback: true, TLSConfig: &tls.Config{RootCAs: pool}}
	g, err := a.Unduh(context.Background(), s.URL+"/gambar.png")
	if err != nil {
		t.Fatalf("gambar sah dari server TLS: %v", err)
	}
	if g.Tipe != "image/png" || g.Ukuran != len(pngKecil) {
		t.Fatalf("pratinjau %+v, ingin image/png %d byte", g, len(pngKecil))
	}
}

// Nilai kosong Aturan adalah versi benar: loopback ditolak walau server TLS-nya sah, dan permintaan tidak sampai.
func TestAmanLoopbackDitolakBawaan(t *testing.T) {
	s := mulaiServer(t, true, ruteUmum())
	pool := x509.NewCertPool()
	pool.AddCert(s.Certificate())
	_, err := Aturan{TLSConfig: &tls.Config{RootCAs: pool}}.Unduh(context.Background(), s.URL+"/gambar.png")
	if !errors.Is(err, ErrTujuan) || s.kena.Load() != 0 {
		t.Fatalf("loopback: galat %v, permintaan sampai %d kali; ingin ErrTujuan dan 0", err, s.kena.Load())
	}
}

func TestAmanSkemaHTTPDitolakBawaan(t *testing.T) {
	s := mulaiServer(t, false, ruteUmum())
	_, err := Aturan{IzinkanLoopback: true}.Unduh(context.Background(), s.URL+"/gambar.png")
	if !errors.Is(err, ErrTujuan) || s.kena.Load() != 0 {
		t.Fatalf("http tanpa izin: galat %v, permintaan %d; ingin ErrTujuan dan 0", err, s.kena.Load())
	}
	if _, err := lokal().Unduh(context.Background(), s.URL+"/gambar.png"); err != nil {
		t.Fatalf("http dengan izin lab: %v", err)
	}
	for _, u := range []string{"ftp://example.com/a.png", "file:///etc/passwd", "gopher://example.com/", "//example.com/a.png", "https://", "https://pengguna:sandi@example.com/a.png"} {
		if _, err := lokal().Unduh(context.Background(), u); !errors.Is(err, ErrTujuan) {
			t.Errorf("%q: galat %v, ingin ErrTujuan", u, err)
		}
	}
}

// Alamat literal di semua kelas terlarang, juga yang disembunyikan sebagai IPv4-mapped IPv6 atau awalan NAT64.
// Waktu pendek: bila satu alamat lolos, dial ke alamat tidak ada akan menggantung dan galatnya bukan ErrTujuan.
func TestAmanAlamatTerlarangDitolak(t *testing.T) {
	for _, u := range []string{
		"http://127.0.0.1:1/", "http://[::1]:1/", "http://10.0.0.5/", "http://172.16.0.1/", "http://192.168.1.1/",
		"http://169.254.169.254/latest/meta-data/", "http://[fd00::1]/", "http://[fe80::1]/", "http://0.0.0.0/", "http://[::]/",
		"http://224.0.0.1/", "http://100.64.0.1/", "http://198.18.0.1/",
		"http://[::ffff:127.0.0.1]/", "http://[::ffff:10.0.0.1]/", "http://[::ffff:169.254.169.254]/",
		"http://[::ffff:100.64.0.1]/",  // CGNAT bukan private: hanya cocok dengan daftar awalan bila Unmap dipakai
		"http://[64:ff9b::a9fe:a9fe]/", // NAT64 yang membawa 169.254.169.254
	} {
		_, err := Aturan{IzinkanHTTP: true, Waktu: 400 * time.Millisecond}.Unduh(context.Background(), u)
		if !errors.Is(err, ErrTujuan) {
			t.Errorf("%s: galat %v, ingin ErrTujuan", u, err)
		}
	}
}

func TestAmanNamaYangMenunjukKeAlamatDalamDitolak(t *testing.T) {
	r := func(ctx context.Context, host string) ([]net.IPAddr, error) {
		return []net.IPAddr{{IP: net.ParseIP("10.1.2.3")}}, nil
	}
	_, err := Aturan{IzinkanHTTP: true, Resolver: r}.Unduh(context.Background(), "http://layanan-dalam.contoh/a.png")
	if !errors.Is(err, ErrTujuan) {
		t.Fatalf("nama ke 10.1.2.3: galat %v, ingin ErrTujuan", err)
	}
}

// DNS rebinding: pemeriksaan awal melihat alamat publik, tetapi dial berikutnya menerima 127.0.0.1. Hanya
// pemeriksaan di ControlContext (pada alamat yang benar-benar di-dial) yang menolaknya; server tidak boleh disentuh.
func TestAmanDNSRebindingDitolakDiControlContext(t *testing.T) {
	s := mulaiServer(t, false, ruteUmum())
	var panggilan atomic.Int64
	r := func(ctx context.Context, host string) ([]net.IPAddr, error) {
		if panggilan.Add(1) == 1 {
			return []net.IPAddr{{IP: net.ParseIP("93.184.216.34")}}, nil // alamat publik pada pemeriksaan awal
		}
		return []net.IPAddr{{IP: net.ParseIP("127.0.0.1")}}, nil // jawaban kedua: loopback
	}
	_, err := Aturan{IzinkanHTTP: true, Resolver: r, Waktu: time.Second}.Unduh(context.Background(),
		"http://rebinding.contoh:"+port(s)+"/gambar.png")
	if !errors.Is(err, ErrTujuan) || s.kena.Load() != 0 {
		t.Fatalf("rebinding: galat %v, permintaan sampai %d kali; ingin ErrTujuan dan 0", err, s.kena.Load())
	}
	if panggilan.Load() < 2 {
		t.Fatalf("resolver dipanggil %d kali; tes ini butuh pemeriksaan awal dan resolusi saat dial", panggilan.Load())
	}
}

func TestAmanRedirectTidakDiikuti(t *testing.T) {
	dalam := mulaiServer(t, false, ruteUmum())
	luar := mulaiServer(t, false, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, dalam.URL+"/dalam", http.StatusFound)
	}))
	_, err := lokal().Unduh(context.Background(), luar.URL+"/gambar.png")
	if !errors.Is(err, ErrTujuan) {
		t.Fatalf("redirect: galat %v, ingin ErrTujuan", err)
	}
	if dalam.kena.Load() != 0 {
		t.Fatalf("server tujuan redirect disentuh %d kali; tidak boleh", dalam.kena.Load())
	}
}

func TestAmanBatasUkuran(t *testing.T) {
	s := mulaiServer(t, false, ruteUmum())
	g, err := lokal(func(a *Aturan) { a.Waktu = 10 * time.Second }).Unduh(context.Background(), s.URL+"/tepat")
	if err != nil || g.Ukuran != BatasUkuran {
		t.Fatalf("tepat 2 MiB: %+v, %v; ingin diterima", g, err)
	}
	for _, jalur := range []string{"/lebih", "/mengalir"} { // dengan dan tanpa Content-Length
		_, err := lokal(func(a *Aturan) { a.Waktu = 10 * time.Second }).Unduh(context.Background(), s.URL+jalur)
		if !errors.Is(err, ErrTerlaluBesar) {
			t.Errorf("%s: galat %v, ingin ErrTerlaluBesar", jalur, err)
		}
	}
}

func TestAmanLambatDiputusDiBatasWaktu(t *testing.T) {
	s := mulaiServer(t, false, ruteUmum())
	mulai := time.Now()
	_, err := lokal(func(a *Aturan) { a.Waktu = 300 * time.Millisecond }).Unduh(context.Background(), s.URL+"/lambat")
	if !errors.Is(err, ErrTidakMenjawab) || time.Since(mulai) > 2*time.Second {
		t.Fatalf("lambat: galat %v sesudah %s; ingin ErrTidakMenjawab dalam batas", err, time.Since(mulai))
	}
}

func TestAmanBukanGambarDanPesanTanpaIsi(t *testing.T) {
	s := mulaiServer(t, false, ruteUmum())
	for jalur, ingin := range map[string]error{"/dalam": ErrBukanGambar, "/html": ErrBukanGambar, "/svg": ErrBukanGambar, "/hilang": ErrGagal} {
		_, err := lokal().Unduh(context.Background(), s.URL+jalur)
		if !errors.Is(err, ingin) {
			t.Errorf("%s: galat %v, ingin %v", jalur, err, ingin)
		}
		if err != nil && (strings.Contains(err.Error(), "penyimpanan-internal") || strings.Contains(err.Error(), "rahasia")) {
			t.Errorf("%s: pesan galat membawa isi respons: %q", jalur, err)
		}
	}
}

// ---------- versi rentan ----------

// bentukLolos mencari bentuk penulisan alamat loopback yang dilewati deny-list string dan sungguh sampai ke
// server uji. Daftar kandidat ditulis tangan; hasilnya bergantung pada resolver platform (getaddrinfo menerima
// "127.1", "2130706433", dan "0x7f000001"; resolver Go murni tidak), jadi tes tidak menebak: ia mengukur.
func bentukLolos(t *testing.T, s *serverUji, jalur string) []string {
	t.Helper()
	p := port(s)
	var lolos []string
	for _, f := range []string{
		"http://127.1:%s", "http://0.0.0.0:%s", "http://2130706433:%s", "http://0x7f000001:%s",
		"http://LOCALHOST:%s", "http://127.0.0.2:%s", "http://127.000.000.001:%s", "http://0177.0.0.1:%s",
	} {
		sebelum := s.kena.Load()
		alamat := fmt.Sprintf(f, p) + jalur
		ctx, batal := context.WithTimeout(context.Background(), 300*time.Millisecond) // bentuk yang tidak ada di platform ini menggantung
		Rentan(ctx, alamat)
		batal()
		if s.kena.Load() > sebelum {
			lolos = append(lolos, alamat)
		}
	}
	return lolos
}

func TestRentanDenyListStringTidakMenyentuhServer(t *testing.T) {
	s := mulaiServer(t, false, ruteUmum())
	for _, u := range []string{"http://127.0.0.1:" + port(s) + "/dalam", "http://localhost:" + port(s) + "/dalam", "http://localhost.:" + port(s) + "/dalam"} {
		_, err := Rentan(context.Background(), u)
		if err == nil || !strings.Contains(err.Error(), "alamat tidak diizinkan") {
			t.Errorf("%s: galat %v, ingin alamat tidak diizinkan", u, err)
		}
	}
	if s.kena.Load() != 0 {
		t.Fatalf("deny-list string gagal menahan: server disentuh %d kali", s.kena.Load())
	}
}

// Deny-list string dilewati bentuk alamat lain, dan versi Aman menolak semuanya tanpa menyentuh server.
func TestRentanDenyListDilewatiBentukLainAmanMenolak(t *testing.T) {
	s := mulaiServer(t, false, ruteUmum())
	lolos := bentukLolos(t, s, "/dalam")
	if len(lolos) == 0 {
		t.Fatal("tidak satu pun bentuk alamat lolos deny-list dan sampai ke server uji; tes ini tidak membuktikan apa-apa")
	}
	t.Logf("bentuk yang lolos deny-list dan sampai ke server uji di platform ini: %v", lolos)
	sebelum := s.kena.Load()
	for _, alamat := range lolos {
		if _, err := (Aturan{IzinkanHTTP: true, Waktu: 500 * time.Millisecond}).Unduh(context.Background(), alamat); !errors.Is(err, ErrTujuan) {
			t.Errorf("Aman %s: galat %v, ingin ErrTujuan", alamat, err)
		}
	}
	if s.kena.Load() != sebelum {
		t.Fatalf("versi Aman menyentuh server uji %d kali", s.kena.Load()-sebelum)
	}
}

// Pesan galat versi rentan membawa awal isi respons layanan dalam; versi Aman tidak (lihat TestAmanBukanGambar...).
func TestRentanPesanGalatMembocorkanIsiLayananDalam(t *testing.T) {
	s := mulaiServer(t, false, ruteUmum())
	lolos := bentukLolos(t, s, "/dalam")
	if len(lolos) == 0 {
		t.Skip("tidak ada bentuk alamat yang melewati deny-list di platform ini")
	}
	_, err := Rentan(context.Background(), lolos[0])
	if err == nil || !strings.Contains(err.Error(), "penyimpanan-internal") {
		t.Fatalf("galat %v, ingin memuat isi JSON layanan dalam", err)
	}
	if n := len(err.Error()); n > 400 {
		t.Fatalf("pesan galat %d byte; versi rentan hanya membawa 200 byte pertama isi", n)
	}
}

// Redirect dari alamat yang lolos deny-list ke 127.0.0.1 tidak diperiksa deny-list, jadi server dalam tersentuh.
func TestRentanMengikutiRedirectKeAlamatDalam(t *testing.T) {
	dalam := mulaiServer(t, false, ruteUmum())
	luar := mulaiServer(t, false, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "http://127.0.0.1:"+port(dalam)+"/dalam", http.StatusFound)
	}))
	lolos := bentukLolos(t, luar, "/gambar.png")
	if len(lolos) == 0 {
		t.Skip("tidak ada bentuk alamat yang melewati deny-list di platform ini")
	}
	sebelum := dalam.kena.Load()
	_, err := Rentan(context.Background(), lolos[0])
	if dalam.kena.Load() != sebelum+1 {
		t.Fatalf("server dalam disentuh %d kali lewat redirect; ingin 1", dalam.kena.Load()-sebelum)
	}
	if err == nil || !strings.Contains(err.Error(), "penyimpanan-internal") {
		t.Fatalf("galat %v, ingin memuat isi server dalam yang dicapai lewat redirect", err)
	}
}

func TestRentanGambarSahDiterima(t *testing.T) {
	s := mulaiServer(t, false, ruteUmum())
	lolos := bentukLolos(t, s, "/gambar.png")
	if len(lolos) == 0 {
		t.Skip("tidak ada bentuk alamat yang melewati deny-list di platform ini")
	}
	g, err := Rentan(context.Background(), lolos[0])
	if err != nil || g.Tipe != "image/png" {
		t.Fatalf("gambar sah lewat versi rentan: %+v, %v", g, err)
	}
}

func TestAlamatKhususTidakKosongDanValid(t *testing.T) {
	if len(alamatKhusus) < 10 {
		t.Fatalf("daftar alamat khusus hanya %d awalan", len(alamatKhusus))
	}
}

// ---------- tambahan dari uji mutasi ----------

// alamatDilarang diuji langsung, bukan hanya lewat unduhan: lapis ControlContext melihat alamat dalam bentuk
// dotted-quad dan menutupi kekurangan lapis pertama, jadi uji lewat unduhan saja tidak menangkap bentuk
// IPv4-mapped yang tidak dinormalkan.
func TestAlamatDilarangPerKelas(t *testing.T) {
	a := Aturan{}
	for _, s := range []string{
		"127.0.0.1", "127.9.9.9", "::1", "10.0.0.1", "172.16.5.5", "172.31.255.255", "192.168.0.1", "169.254.169.254",
		"fd00::1", "fc00::1", "fe80::1", "0.0.0.0", "::", "224.0.0.1", "ff02::1", "100.64.0.1", "100.127.255.254",
		"198.18.0.1", "240.0.0.1", "64:ff9b::a9fe:a9fe", "2002:a9fe:a9fe::1", "2001::1",
		"::ffff:127.0.0.1", "::ffff:10.0.0.1", "::ffff:169.254.169.254", "::ffff:100.64.0.1", "::ffff:198.18.0.1", "::ffff:240.0.0.1",
	} {
		if !a.alamatDilarang(netip.MustParseAddr(s)) {
			t.Errorf("%s tidak ditolak", s)
		}
	}
	for _, s := range []string{"93.184.216.34", "8.8.8.8", "1.1.1.1", "172.15.0.1", "172.32.0.1", "100.63.255.255", "100.128.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"} {
		if a.alamatDilarang(netip.MustParseAddr(s)) {
			t.Errorf("%s publik tetapi ditolak", s)
		}
	}
	if (Aturan{IzinkanLoopback: true}).alamatDilarang(netip.MustParseAddr("::ffff:127.0.0.1")) {
		t.Error("IzinkanLoopback tidak membuka loopback dalam bentuk IPv4-mapped")
	}
	if !(Aturan{IzinkanLoopback: true}).alamatDilarang(netip.MustParseAddr("10.0.0.1")) {
		t.Error("IzinkanLoopback ikut membuka alamat private")
	}
}

// Aliran tanpa akhir dipotong di batas ukuran: galatnya "terlalu besar", bukan menunggu sampai waktu habis.
// Tanpa pembatas baca, ReadAll terus membaca sampai batas waktu dan galatnya menjadi "tidak menjawab".
func TestAmanAliranTanpaAkhirDipotongDiBatasUkuran(t *testing.T) {
	var tertulis atomic.Int64
	s := mulaiServer(t, false, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write(isiPNG(1024))
		w.(http.Flusher).Flush()
		potongan := make([]byte, 64<<10)
		for r.Context().Err() == nil {
			n, err := w.Write(potongan)
			tertulis.Add(int64(n))
			if err != nil {
				return
			}
			w.(http.Flusher).Flush()
		}
	}))
	mulai := time.Now()
	_, err := lokal(func(a *Aturan) { a.Waktu = 2 * time.Second }).Unduh(context.Background(), s.URL+"/")
	if !errors.Is(err, ErrTerlaluBesar) {
		t.Fatalf("aliran tanpa akhir: galat %v sesudah %s, ingin ErrTerlaluBesar", err, time.Since(mulai))
	}
}

// Content-Length yang sudah melewati batas menolak sebelum isi dibaca: server yang menjanjikan 1 GiB tetapi
// berhenti menulis tidak membuat unduhan menggantung sampai batas waktu.
func TestAmanContentLengthBesarDitolakSebelumMembaca(t *testing.T) {
	s := mulaiServer(t, false, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Length", "1073741824")
		w.Write(isiPNG(512))
		w.(http.Flusher).Flush()
		<-r.Context().Done() // menjanjikan 1 GiB, mengirim 512 byte, lalu diam
	}))
	mulai := time.Now()
	_, err := lokal(func(a *Aturan) { a.Waktu = 2 * time.Second }).Unduh(context.Background(), s.URL+"/")
	if !errors.Is(err, ErrTerlaluBesar) || time.Since(mulai) > time.Second {
		t.Fatalf("Content-Length 1 GiB: galat %v sesudah %s; ingin ErrTerlaluBesar segera", err, time.Since(mulai))
	}
}

// Satu jawaban DNS yang memuat alamat terlarang menolak seluruh unduhan, walau alamat lain dalam jawaban itu boleh
// dijangkau. Tanpa pemeriksaan awal, dial melewati yang terlarang lalu tersambung ke yang boleh.
func TestAmanJawabanDNSCampuranDitolakUtuh(t *testing.T) {
	s := mulaiServer(t, false, ruteUmum())
	r := func(ctx context.Context, host string) ([]net.IPAddr, error) {
		return []net.IPAddr{{IP: net.ParseIP("10.0.0.1")}, {IP: net.ParseIP("127.0.0.1")}}, nil
	}
	_, err := lokal(func(a *Aturan) { a.Resolver = r }).Unduh(context.Background(), "http://campuran.contoh:"+port(s)+"/gambar.png")
	if !errors.Is(err, ErrTujuan) || s.kena.Load() != 0 {
		t.Fatalf("jawaban campuran: galat %v, permintaan sampai %d kali; ingin ErrTujuan dan 0", err, s.kena.Load())
	}
}
