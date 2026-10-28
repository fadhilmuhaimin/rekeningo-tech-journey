//go:build t4ssrf

package unduh

// Tes lab t4-ssrf yang berjalan di host: batas ADR 41 diperiksa dari dua sisi (https dan sertifikat, redirect, 2 MiB,
// 3 detik, tipe isi dari byte, pesan galat) dan kelas alamat yang tidak tertangkap IsPrivate. Semua server hanya
// mendengar di 127.0.0.1, sertifikat https dibuat di jalan (tidak dipasang ke store sistem), dan tidak ada permintaan
// ke alamat di luar mesin. Keluaran yang dicetak (fmt.Printf) adalah rekaman lab; run.py membandingkannya dengan yang
// di-commit. Waktu hanya diperiksa sebagai batas, tidak dicetak.
//
// Dijalankan: go test -tags t4ssrf -run 'TestSSRFBatas|TestSSRFKelas' ./internal/unduh

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"errors"
	"fmt"
	"io"
	"log"
	"math/big"
	"net"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"strconv"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

// ringkasHasil memendekkan hasil satu unduhan menjadi satu frasa tetap untuk rekaman. Pesan versi rentan tidak
// dipotong: isi respons yang ikut di pesan itulah yang direkam.
func ringkasHasil(g Gambar, err error) string {
	switch {
	case err == nil:
		return fmt.Sprintf("diterima (%s, %d byte)", g.Tipe, g.Ukuran)
	case errors.Is(err, ErrTujuan), errors.Is(err, ErrBukanGambar), errors.Is(err, ErrTerlaluBesar), errors.Is(err, ErrTidakMenjawab), errors.Is(err, ErrGagal):
		return "ditolak (" + err.Error() + ")"
	}
	return "galat: " + err.Error()
}

// sertifikatLab membuat sertifikat https sementara untuk 127.0.0.1 (ECDSA P-256, berlaku satu jam) di memori. Tidak
// ditulis ke berkas dan tidak dipasang di mana pun; hanya kumpulan akar milik tes yang mempercayainya.
func sertifikatLab(t *testing.T) (tls.Certificate, *x509.CertPool) {
	t.Helper()
	kunci, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	pola := &x509.Certificate{
		SerialNumber:          big.NewInt(1),
		Subject:               pkix.Name{CommonName: "t4-ssrf lab"},
		NotBefore:             time.Now().Add(-time.Minute),
		NotAfter:              time.Now().Add(time.Hour),
		KeyUsage:              x509.KeyUsageDigitalSignature | x509.KeyUsageCertSign,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		IsCA:                  true,
		IPAddresses:           []net.IP{net.ParseIP("127.0.0.1")},
	}
	der, err := x509.CreateCertificate(rand.Reader, pola, pola, &kunci.PublicKey, kunci)
	if err != nil {
		t.Fatal(err)
	}
	leaf, err := x509.ParseCertificate(der)
	if err != nil {
		t.Fatal(err)
	}
	pool := x509.NewCertPool()
	pool.AddCert(leaf)
	return tls.Certificate{Certificate: [][]byte{der}, PrivateKey: kunci, Leaf: leaf}, pool
}

func serverTLSLab(t *testing.T, h http.Handler) (*serverUji, *x509.CertPool) {
	t.Helper()
	cert, pool := sertifikatLab(t)
	s := &serverUji{}
	s.Server = httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		s.kena.Add(1)
		h.ServeHTTP(w, r)
	}))
	s.Server.TLS = &tls.Config{Certificates: []tls.Certificate{cert}}
	s.Server.Config.ErrorLog = log.New(io.Discard, "", 0) // jabat tangan yang gagal karena sertifikat asing tidak dicetak
	s.Server.StartTLS()
	t.Cleanup(s.Close)
	return s, pool
}

// ---------- (e) hanya https ----------

func TestSSRFBatasHanyaHTTPSDenganSertifikatDibuatLab(t *testing.T) {
	fmt.Println("\n## https saja: skema http ditolak sebelum permintaan, https dengan sertifikat yang dipercaya diterima, sertifikat asing ditolak")
	biasa := mulaiServer(t, false, ruteUmum())
	g, err := Aturan{IzinkanLoopback: true}.Unduh(context.Background(), biasa.URL+"/gambar.png")
	fmt.Printf("%-52s %s; permintaan sampai: %d\n", "http://<loopback>/gambar.png (bawaan)", ringkasHasil(g, err), biasa.kena.Load())
	if !errors.Is(err, ErrTujuan) || biasa.kena.Load() != 0 {
		t.Fatalf("http tanpa izin: %v, permintaan %d", err, biasa.kena.Load())
	}

	aman, pool := serverTLSLab(t, ruteUmum())
	g, err = Aturan{IzinkanLoopback: true, TLSConfig: &tls.Config{RootCAs: pool}}.Unduh(context.Background(), aman.URL+"/gambar.png")
	fmt.Printf("%-52s %s; permintaan sampai: %d\n", "https://<loopback>/gambar.png (sertifikat dipercaya)", ringkasHasil(g, err), aman.kena.Load())
	if err != nil || g.Tipe != "image/png" || aman.kena.Load() != 1 {
		t.Fatalf("https sah: %+v %v permintaan %d", g, err, aman.kena.Load())
	}

	asing, _ := serverTLSLab(t, ruteUmum())
	g, err = Aturan{IzinkanLoopback: true}.Unduh(context.Background(), asing.URL+"/gambar.png")
	fmt.Printf("%-52s %s; permintaan sampai: %d\n", "https://<loopback>/gambar.png (sertifikat asing)", ringkasHasil(g, err), asing.kena.Load())
	if !errors.Is(err, ErrGagal) || asing.kena.Load() != 0 {
		t.Fatalf("sertifikat asing: %v permintaan %d", err, asing.kena.Load())
	}
	if strings.Contains(err.Error(), "x509") || strings.Contains(err.Error(), "certificate") {
		t.Fatalf("pesan galat memuat rincian sertifikat: %q", err)
	}
}

// ---------- (e) redirect dimatikan ----------

func TestSSRFBatasRedirectTidakDiikutiUntukSemuaKode(t *testing.T) {
	fmt.Println("\n## redirect dimatikan: tiap kode 3xx ditolak dan server tujuan redirect tidak tersentuh")
	dalam := mulaiServer(t, false, ruteUmum())
	for _, kode := range []int{301, 302, 303, 307, 308} {
		sebelum := dalam.kena.Load()
		luar := mulaiServer(t, false, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.Redirect(w, r, dalam.URL+"/gambar.png", kode)
		}))
		g, err := lokal().Unduh(context.Background(), luar.URL+"/gambar.png")
		fmt.Printf("redirect %d ke server lain: %s; server pertama disentuh: %d, server tujuan redirect disentuh: %d\n",
			kode, ringkasHasil(g, err), luar.kena.Load(), dalam.kena.Load()-sebelum)
		if !errors.Is(err, ErrTujuan) || dalam.kena.Load() != sebelum || luar.kena.Load() != 1 {
			t.Fatalf("redirect %d: %v, dalam %d, luar %d", kode, err, dalam.kena.Load()-sebelum, luar.kena.Load())
		}
	}
}

// ---------- (e) 2 MiB: dua sisi batas ----------

func TestSSRFBatasUkuranDuaMiBDariDuaSisi(t *testing.T) {
	fmt.Println("\n## batas 2 MiB: tepat di batas diterima, satu byte di atasnya ditolak, dengan Content-Length dan tanpa (chunked), dan aliran tanpa akhir dipotong")
	if BatasUkuran != 2<<20 {
		t.Fatalf("BatasUkuran %d, ingin 2 MiB", BatasUkuran)
	}
	// Dengan Content-Length yang diisi handler. Tanpa header itu, server Go menjawab chunked bila isinya lebih dari
	// buffernya, jadi tes harus menyebutnya sendiri supaya label di rekaman benar.
	denganPanjang := func(n int) *serverUji {
		return mulaiServer(t, false, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Length", strconv.Itoa(n))
			w.Write(isiPNG(n))
		}))
	}
	chunked := func(n int) *serverUji {
		return mulaiServer(t, false, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Write(isiPNG(1024))
			w.(http.Flusher).Flush() // sesudah Flush tanpa Content-Length, jawaban chunked
			w.Write(make([]byte, n-1024))
		}))
	}
	uji := func(s *serverUji) (Gambar, error) {
		return lokal(func(a *Aturan) { a.Waktu = 10 * time.Second }).Unduh(context.Background(), s.URL+"/")
	}
	kasus := []struct {
		label   string
		s       *serverUji
		terima  bool
		panjang int64 // Content-Length yang diterima client; -1 berarti tanpa Content-Length
	}{
		{"2.097.152 byte (tepat 2 MiB), dengan Content-Length", denganPanjang(BatasUkuran), true, BatasUkuran},
		{"2.097.153 byte (2 MiB + 1), dengan Content-Length", denganPanjang(BatasUkuran + 1), false, BatasUkuran + 1},
		{"2.097.152 byte (tepat 2 MiB), chunked", chunked(BatasUkuran), true, -1},
		{"2.097.153 byte (2 MiB + 1), chunked", chunked(BatasUkuran + 1), false, -1},
		{"3 MiB, chunked", chunked(3 << 20), false, -1},
	}
	for _, k := range kasus {
		// Label "dengan Content-Length" dan "chunked" dibuktikan dari header yang sungguh diterima client.
		if r, err := http.Get(k.s.URL + "/"); err != nil {
			t.Fatal(err)
		} else {
			r.Body.Close()
			if r.ContentLength != k.panjang {
				t.Fatalf("%s: Content-Length yang diterima %d, ingin %d", k.label, r.ContentLength, k.panjang)
			}
		}
		g, err := uji(k.s)
		fmt.Printf("%-52s %s\n", k.label, ringkasHasil(g, err))
		if k.terima && (err != nil || g.Ukuran != BatasUkuran) {
			t.Errorf("%s: %+v %v, ingin diterima", k.label, g, err)
		}
		if !k.terima && !errors.Is(err, ErrTerlaluBesar) {
			t.Errorf("%s: %v, ingin ErrTerlaluBesar", k.label, err)
		}
	}
	// Server yang menjanjikan 1 GiB: ditolak dari header, sebelum isi dibaca.
	sg := mulaiServer(t, false, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Length", "1073741824")
		w.Write(isiPNG(512))
		w.(http.Flusher).Flush()
		<-r.Context().Done()
	}))
	mulai := time.Now()
	g, err := lokal(func(a *Aturan) { a.Waktu = 2 * time.Second }).Unduh(context.Background(), sg.URL+"/")
	fmt.Printf("%-52s %s; ditolak sebelum isi dibaca (kurang dari 1 detik): %v\n", "Content-Length 1 GiB (isi tidak pernah selesai)",
		ringkasHasil(g, err), time.Since(mulai) < time.Second)
	if !errors.Is(err, ErrTerlaluBesar) || time.Since(mulai) >= time.Second {
		t.Fatalf("1 GiB: %v sesudah %s", err, time.Since(mulai))
	}
	// Aliran tanpa akhir: dipotong di batas ukuran, bukan menunggu sampai batas waktu.
	tanpaAkhir := mulaiServer(t, false, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write(isiPNG(1024))
		w.(http.Flusher).Flush()
		potongan := make([]byte, 64<<10)
		for r.Context().Err() == nil {
			if _, err := w.Write(potongan); err != nil {
				return
			}
			w.(http.Flusher).Flush()
		}
	}))
	g, err = lokal(func(a *Aturan) { a.Waktu = 2 * time.Second }).Unduh(context.Background(), tanpaAkhir.URL+"/")
	fmt.Printf("%-52s %s\n", "aliran tanpa akhir", ringkasHasil(g, err))
	if !errors.Is(err, ErrTerlaluBesar) {
		t.Fatalf("aliran tanpa akhir: %v", err)
	}
}

// ---------- (e) 3 detik: dua sisi batas ----------

func TestSSRFBatasWaktuTigaDetik(t *testing.T) {
	fmt.Println("\n## batas 3 detik untuk seluruh unduhan: yang selesai di dalam batas diterima, yang menggantung atau menetes ditolak")
	if BatasWaktu != 3*time.Second {
		t.Fatalf("BatasWaktu %s, ingin 3 detik", BatasWaktu)
	}
	bawaan := Aturan{IzinkanHTTP: true, IzinkanLoopback: true} // Waktu 0 = BatasWaktu
	// Sisi dalam: menjawab sesudah 1 detik, masih di dalam batas.
	lambatSedikit := mulaiServer(t, false, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		select {
		case <-time.After(time.Second):
		case <-r.Context().Done():
		}
		w.Write(pngKecil)
	}))
	g, err := bawaan.Unduh(context.Background(), lambatSedikit.URL+"/")
	fmt.Printf("%-48s %s\n", "menjawab sesudah 1 detik (dalam batas)", ringkasHasil(g, err))
	if err != nil {
		t.Fatalf("1 detik: %v", err)
	}
	// Sisi luar: tidak pernah menjawab.
	menggantung := mulaiServer(t, false, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { <-r.Context().Done() }))
	mulai := time.Now()
	g, err = bawaan.Unduh(context.Background(), menggantung.URL+"/")
	lama := time.Since(mulai)
	fmt.Printf("%-48s %s; berhenti pada batas 3 detik (≥ 3 dan < 5 detik): %v\n", "tidak pernah menjawab", ringkasHasil(g, err), lama >= 3*time.Second && lama < 5*time.Second)
	if !errors.Is(err, ErrTidakMenjawab) || lama < 3*time.Second || lama >= 5*time.Second {
		t.Fatalf("menggantung: %v sesudah %s", err, lama)
	}
	// Sisi luar kedua: header cepat, isi menetes 1 byte tiap 100 ms tanpa akhir. Batas 3 detik berlaku untuk
	// seluruh unduhan, bukan per pembacaan.
	menetes := mulaiServer(t, false, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write(isiPNG(16))
		w.(http.Flusher).Flush()
		for r.Context().Err() == nil {
			time.Sleep(100 * time.Millisecond)
			if _, err := w.Write([]byte{0}); err != nil {
				return
			}
			w.(http.Flusher).Flush()
		}
	}))
	mulai = time.Now()
	g, err = bawaan.Unduh(context.Background(), menetes.URL+"/")
	lama = time.Since(mulai)
	fmt.Printf("%-48s %s; berhenti pada batas 3 detik (≥ 3 dan < 5 detik): %v\n", "isi menetes 1 byte per 100 milidetik", ringkasHasil(g, err), lama >= 3*time.Second && lama < 5*time.Second)
	if !errors.Is(err, ErrTidakMenjawab) || lama < 3*time.Second || lama >= 5*time.Second {
		t.Fatalf("menetes: %v sesudah %s", err, lama)
	}
}

// ---------- (e) tipe isi dari byte ----------

func TestSSRFBatasTipeIsiDariByteBukanHeader(t *testing.T) {
	fmt.Println("\n## tipe isi dari byte: header Content-Type tidak dipercaya")
	kasus := []struct {
		label, header string
		isi           []byte
		ingin         string
	}{
		{"header image/png, isi HTML", "image/png", []byte("<html><body>bukan gambar</body></html>"), "ditolak (bukan gambar)"},
		{"header image/png, isi JSON layanan dalam", "image/png", []byte(jsonDalam), "ditolak (bukan gambar)"},
		{"header text/html, isi PNG", "text/html", pngKecil, "diterima (image/png, " + fmt.Sprint(len(pngKecil)) + " byte)"},
		{"header image/svg+xml, isi SVG", "image/svg+xml", []byte(`<svg xmlns="http://www.w3.org/2000/svg"></svg>`), "ditolak (bukan gambar)"},
		{"header image/png, isi kosong", "image/png", nil, "ditolak (bukan gambar)"},
	}
	for _, k := range kasus {
		s := mulaiServer(t, false, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", k.header)
			w.Write(k.isi)
		}))
		g, err := lokal().Unduh(context.Background(), s.URL+"/")
		got := ringkasHasil(g, err)
		fmt.Printf("%-42s %s\n", k.label, got)
		if got != k.ingin {
			t.Errorf("%s: %s, ingin %s", k.label, got, k.ingin)
		}
	}
}

// ---------- (e) hanya status 200 dan hanya empat tipe gambar ----------

func TestSSRFBatasHanyaStatus200(t *testing.T) {
	fmt.Println("\n## hanya status 200 yang diterima: jawaban lain, juga 2xx yang membawa gambar sah, ditolak")
	for _, kode := range []int{201, 202, 203, 204, 206, 400, 401, 403, 404, 410, 429, 500, 503} {
		s := mulaiServer(t, false, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(kode)
			if kode != 204 {
				w.Write(pngKecil)
			}
		}))
		g, err := lokal().Unduh(context.Background(), s.URL+"/")
		fmt.Printf("status %d dengan isi PNG: %s\n", kode, ringkasHasil(g, err))
		if !errors.Is(err, ErrGagal) {
			t.Errorf("status %d: %v, ingin ErrGagal", kode, err)
		}
	}
}

func TestSSRFBatasHanyaEmpatTipeGambarYangDikenal(t *testing.T) {
	fmt.Println("\n## tipe yang diterima: PNG, JPEG, GIF, dan WebP menurut byte awal; tipe lain ditolak")
	webp := append([]byte("RIFF\x24\x00\x00\x00WEBPVP8 "), make([]byte, 28)...)
	kasus := []struct {
		label string
		isi   []byte
		ingin string
	}{
		{"PNG", pngKecil, "image/png"},
		{"JPEG", append([]byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 'J', 'F', 'I', 'F', 0x00}, make([]byte, 32)...), "image/jpeg"},
		{"GIF", append([]byte("GIF89a"), make([]byte, 32)...), "image/gif"},
		{"WebP", webp, "image/webp"},
		{"BMP", append([]byte("BM"), make([]byte, 32)...), ""},
		{"ICO", append([]byte{0, 0, 1, 0, 1, 0}, make([]byte, 32)...), ""},
		{"PDF", []byte("%PDF-1.4\n1 0 obj\n"), ""},
		{"ZIP", append([]byte("PK\x03\x04"), make([]byte, 32)...), ""},
		{"teks biasa", []byte("hanya teks biasa"), ""},
	}
	for _, k := range kasus {
		s := mulaiServer(t, false, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.Write(k.isi) }))
		g, err := lokal().Unduh(context.Background(), s.URL+"/")
		fmt.Printf("%-12s %s\n", k.label, ringkasHasil(g, err))
		if k.ingin == "" && !errors.Is(err, ErrBukanGambar) {
			t.Errorf("%s: %v, ingin ErrBukanGambar", k.label, err)
		}
		if k.ingin != "" && (err != nil || g.Tipe != k.ingin) {
			t.Errorf("%s: %+v %v, ingin %s", k.label, g, err, k.ingin)
		}
	}
}

// ---------- (f) bentuk nama IDNA ----------

// TestSSRFBatasBentukIDNATidakMelewatiFetcherAman: golang/go#80417 melaporkan bahwa client HTTP Go memetakan nama
// IDNA (angka dan titik lebar penuh) ke ASCII saat dial, sedangkan url.Hostname() tetap mengembalikan bentuk aslinya.
// Yang dijaga tes ini hanya hasilnya: URL ke server uji di 127.0.0.1 dengan bentuk itu ditolak dan nol permintaan
// sampai. Resolver buatan menjawab alamat publik untuk nama apa pun, jadi pemeriksaan awal tidak melihat apa-apa dan
// tidak ada permintaan DNS yang keluar dari mesin; yang tersisa untuk menolak adalah pemeriksaan di ControlContext
// pada alamat yang dihubungi client. Bila versi Go sesudahnya menolak host semacam itu lebih awal, hasilnya tetap
// ditolak; penyebabnya tidak dicetak.
func TestSSRFBatasBentukIDNATidakMelewatiFetcherAman(t *testing.T) {
	fmt.Println("\n## nama IDNA: URL dengan angka dan titik lebar penuh ke server uji di loopback ditolak versi aman tanpa permintaan sampai")
	s := mulaiServer(t, false, ruteUmum())
	for _, k := range []struct{ label, host string }{
		{"angka dan titik lebar penuh", "\uFF11\uFF12\uFF17\uFF0E\uFF10\uFF0E\uFF10\uFF0E\uFF11"},
		{"titik penuh ideografis", "127\u30020\u30020\u30021"},
	} {
		publik := func(ctx context.Context, host string) ([]net.IPAddr, error) {
			return []net.IPAddr{{IP: net.ParseIP("93.184.216.34")}}, nil // hanya dibaca pemeriksaan awal, tidak pernah dihubungi
		}
		_, err := Aturan{IzinkanHTTP: true, Resolver: publik, Waktu: time.Second}.Unduh(context.Background(), "http://"+k.host+":"+port(s)+"/gambar.png")
		fmt.Printf("%-30s ditolak: %v; permintaan sampai: %d\n", k.label, err != nil, s.kena.Load())
		if err == nil || s.kena.Load() != 0 {
			t.Fatalf("%s: galat %v, permintaan sampai %d", k.label, err, s.kena.Load())
		}
	}
}

// ---------- (e) masukan ekstrem: gagal tertutup ----------

// TestSSRFBatasMasukanEkstremGagalTertutup memeriksa bahwa masukan yang terlalu besar atau terlalu panjang membuat
// fetcher menolak (gagal tertutup), bukan menerima atau menggantung: host dan path sangat panjang, header jawaban
// besar, rantai redirect panjang, dan jawaban DNS yang panjang dengan satu alamat terlarang di ujung.
func TestSSRFBatasMasukanEkstremGagalTertutup(t *testing.T) {
	fmt.Println("\n## masukan ekstrem: host dan path sangat panjang, header jawaban besar, rantai redirect, dan jawaban DNS panjang gagal tertutup")
	ctx := context.Background()
	tidakAda := func(ctx context.Context, host string) ([]net.IPAddr, error) {
		return nil, &net.DNSError{Err: "no such host", Name: "x", IsNotFound: true}
	}
	_, err := Aturan{IzinkanHTTP: true, Resolver: tidakAda, Waktu: time.Second}.Unduh(ctx, "http://"+strings.Repeat("a", 100000)+".contoh/a.png")
	fmt.Printf("%-52s ditolak: %v\n", "host 100.000 karakter", err != nil)
	if err == nil {
		t.Fatal("host 100.000 karakter diterima")
	}

	s := mulaiServer(t, false, ruteUmum())
	mulai := time.Now()
	_, err = lokal().Unduh(ctx, s.URL+"/"+strings.Repeat("a", 2<<20))
	fmt.Printf("%-52s ditolak: %v; selesai kurang dari 2 detik: %v\n", "path 2 MiB", err != nil, time.Since(mulai) < 2*time.Second)
	if err == nil || time.Since(mulai) >= 2*time.Second {
		t.Fatalf("path 2 MiB: galat %v sesudah %s", err, time.Since(mulai))
	}

	// Header jawaban: 32 KiB masih diterima, 128 KiB dan 11 MiB ditolak (BatasHeader 64 KiB).
	for _, k := range []struct {
		label  string
		n      int
		terima bool
	}{{"32 KiB", 32 << 10, true}, {"128 KiB", 128 << 10, false}, {"11 MiB", 11 << 20, false}} {
		h := mulaiServer(t, false, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("X-Besar", strings.Repeat("a", k.n))
			w.Write(pngKecil)
		}))
		g, err := lokal().Unduh(ctx, h.URL+"/")
		fmt.Printf("header jawaban %-37s %s\n", k.label, ringkasHasil(g, err))
		if k.terima && err != nil {
			t.Errorf("header %d byte: %v, ingin diterima", k.n, err)
		}
		if !k.terima && !errors.Is(err, ErrGagal) {
			t.Errorf("header %d byte: %v, ingin ErrGagal", k.n, err)
		}
	}

	// Rantai redirect: hanya langkah pertama yang tersentuh.
	var langkah atomic.Int64
	var rantai *serverUji
	rantai = mulaiServer(t, false, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		langkah.Add(1)
		http.Redirect(w, r, fmt.Sprintf("/rantai/%d", langkah.Load()), http.StatusFound)
	}))
	g, err := lokal().Unduh(ctx, rantai.URL+"/rantai/0")
	fmt.Printf("%-52s %s; langkah yang tersentuh: %d\n", "rantai redirect tanpa akhir", ringkasHasil(g, err), langkah.Load())
	if !errors.Is(err, ErrTujuan) || langkah.Load() != 1 {
		t.Fatalf("rantai redirect: %v, langkah %d", err, langkah.Load())
	}

	// Jawaban DNS panjang: 4.096 alamat yang boleh dijangkau (loopback, dibuka lewat IzinkanLoopback untuk tes) dan
	// satu alamat private di ujung menolak seluruh unduhan. Pemeriksaan yang berhenti di awal daftar (terpotong)
	// membiarkan client menyambung ke alamat pertama.
	dalamPanjang := mulaiServer(t, false, ruteUmum())
	panjang := func(ctx context.Context, host string) ([]net.IPAddr, error) {
		semua := make([]net.IPAddr, 0, 4097)
		for i := 0; i < 4096; i++ {
			semua = append(semua, net.IPAddr{IP: net.ParseIP("127.0.0.1")})
		}
		return append(semua, net.IPAddr{IP: net.ParseIP("10.0.0.1")}), nil
	}
	_, err = lokal(func(a *Aturan) { a.Resolver = panjang }).Unduh(ctx, "http://panjang.contoh:"+port(dalamPanjang)+"/gambar.png")
	fmt.Printf("%-52s %s; permintaan sampai: %d\n", "jawaban DNS 4.097 alamat, yang terakhir private", ringkasHasil(Gambar{}, err), dalamPanjang.kena.Load())
	if !errors.Is(err, ErrTujuan) || dalamPanjang.kena.Load() != 0 {
		t.Fatalf("jawaban DNS panjang: %v, permintaan %d", err, dalamPanjang.kena.Load())
	}
}

// TestSSRFBatasJawabanDNSDenganAlamatTerlarangDiUrutanKedua: satu jawaban DNS yang memuat alamat terlarang menolak
// seluruh unduhan walau alamat pertamanya boleh dijangkau. Pemeriksaan yang hanya melihat alamat pertama melewatkannya,
// dan client menyambung ke alamat pertama.
func TestSSRFBatasJawabanDNSDenganAlamatTerlarangDiUrutanKedua(t *testing.T) {
	fmt.Println("\n## jawaban DNS campuran: alamat terlarang di urutan kedua menolak seluruh unduhan")
	s := mulaiServer(t, false, ruteUmum())
	r := func(ctx context.Context, host string) ([]net.IPAddr, error) {
		return []net.IPAddr{{IP: net.ParseIP("127.0.0.1")}, {IP: net.ParseIP("10.0.0.1")}}, nil
	}
	_, err := lokal(func(a *Aturan) { a.Resolver = r }).Unduh(context.Background(), "http://terbalik.contoh:"+port(s)+"/gambar.png")
	fmt.Printf("alamat yang boleh dijangkau lebih dulu, private kedua: %s; permintaan sampai: %d\n", ringkasHasil(Gambar{}, err), s.kena.Load())
	if !errors.Is(err, ErrTujuan) || s.kena.Load() != 0 {
		t.Fatalf("jawaban campuran terbalik: %v, permintaan %d", err, s.kena.Load())
	}
}

// ---------- (e) pesan galat tanpa isi respons ----------

func TestSSRFBatasPesanGalatTanpaIsiResponsDanTanpaAlamat(t *testing.T) {
	fmt.Println("\n## pesan galat versi aman: tanpa isi respons, alamat, atau port; satu pesan untuk semua penolakan karena alamat")
	rahasia := []string{"penyimpanan-internal", "kunci-lab-bukan-rahasia", "rahasia-lab", "identitas"}
	isiBocor := `{"layanan":"penyimpanan-internal","kunci_akses":"kunci-lab-bukan-rahasia","bucket":["identitas"]}`
	kasus := []struct {
		label  string
		status int
		isi    string
	}{
		{"200 berisi JSON layanan dalam", 200, isiBocor},
		{"403 berisi JSON layanan dalam", 403, isiBocor},
		{"404 berisi JSON layanan dalam", 404, isiBocor},
		{"500 berisi JSON layanan dalam", 500, isiBocor},
	}
	for _, k := range kasus {
		s := mulaiServer(t, false, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(k.status)
			w.Write([]byte(k.isi))
		}))
		_, errAman := lokal().Unduh(context.Background(), s.URL+"/")
		fmt.Printf("%-34s pesan: %q\n", k.label, errAman.Error())
		for _, r := range rahasia {
			if strings.Contains(errAman.Error(), r) {
				t.Errorf("%s: pesan aman memuat %q: %q", k.label, r, errAman)
			}
		}
		if strings.Contains(errAman.Error(), port(s)) || strings.Contains(errAman.Error(), "127.0.0.1") {
			t.Errorf("%s: pesan aman memuat alamat atau port: %q", k.label, errAman)
		}
	}
	// Penolakan karena alamat: satu pesan untuk semua kelas literal, jadi pemanggil tidak memetakan jaringan dalam
	// dari perbedaan pesan (port terbuka lawan tertutup, private lawan link-local).
	buka := mulaiServer(t, false, ruteUmum())
	alamat := []string{
		"http://127.0.0.1:" + port(buka) + "/", "http://127.0.0.1:1/", "http://10.0.0.5:8080/", "http://169.254.77.7:8080/",
		"http://100.64.0.1:8080/", "http://[::1]:" + port(buka) + "/", "http://[fd00::5]:8080/", "http://0.0.0.0:" + port(buka) + "/",
	}
	pesan := map[string]int{}
	for _, a := range alamat {
		_, err := Aturan{IzinkanHTTP: true, Waktu: 500 * time.Millisecond}.Unduh(context.Background(), a)
		pesan[err.Error()]++
	}
	fmt.Printf("penolakan karena alamat literal: %d alamat (loopback terbuka dan tertutup, private, link-local, CGNAT, ULA, 0.0.0.0): %d pesan berbeda: %v\n",
		len(alamat), len(pesan), pesan)
	if len(pesan) != 1 || pesan[ErrTujuan.Error()] != len(alamat) {
		t.Fatalf("pesan penolakan alamat berbeda-beda: %v", pesan)
	}
	if buka.kena.Load() != 0 {
		t.Fatalf("server terbuka disentuh %d kali oleh unduhan yang ditolak", buka.kena.Load())
	}
	fmt.Printf("pesan galat versi aman yang mungkin: %d kalimat tetap; server uji disentuh oleh unduhan yang ditolak: 0\n", len(semuaPesanAman()))
}

// TestSSRFBatasPesanMembedakanNamaDikenalDariTidakDikenal mencatat batas ADR 41 yang belum tertutup: untuk alamat literal
// semua penolakan satu pesan (tes di atas), tetapi untuk nama, nama yang diselesaikan ke alamat terlarang dijawab
// "tujuan tidak diizinkan" sedangkan nama yang tidak ada dijawab "tidak menjawab". Pemanggil yang mengirim banyak nama
// bisa membedakan nama yang ada dari yang tidak ada. Resolver buatan, tanpa permintaan DNS yang keluar dari mesin.
// Tes ini menetapkan perilaku saat ini; bila pesannya kelak disamakan, tes ini yang diubah.
func TestSSRFBatasPesanMembedakanNamaDikenalDariTidakDikenal(t *testing.T) {
	fmt.Println("\n## batas yang belum tertutup: nama yang ada dan nama yang tidak ada dijawab dengan pesan berbeda")
	r := func(ctx context.Context, host string) ([]net.IPAddr, error) {
		if host == "nama-ada.contoh" {
			return []net.IPAddr{{IP: net.ParseIP("10.0.0.9")}}, nil // alamat private yang hanya dibaca, tidak pernah dihubungi
		}
		return nil, &net.DNSError{Err: "no such host", Name: host, IsNotFound: true}
	}
	_, ada := Aturan{IzinkanHTTP: true, Resolver: r, Waktu: time.Second}.Unduh(context.Background(), "http://nama-ada.contoh/a.png")
	_, tidakAda := Aturan{IzinkanHTTP: true, Resolver: r, Waktu: time.Second}.Unduh(context.Background(), "http://nama-tidak-ada.contoh/a.png")
	fmt.Printf("nama yang diselesaikan ke alamat private: %q\nnama yang tidak ada:                      %q\npesan sama: %v\n", ada.Error(), tidakAda.Error(), ada.Error() == tidakAda.Error())
	if !errors.Is(ada, ErrTujuan) || !errors.Is(tidakAda, ErrTidakMenjawab) {
		t.Fatalf("perilaku berubah: %v dan %v; perbarui tes, rekaman, dan README bila pesannya disamakan", ada, tidakAda)
	}
}

func semuaPesanAman() []error {
	return []error{ErrTujuan, ErrBukanGambar, ErrTerlaluBesar, ErrTidakMenjawab, ErrGagal}
}

// ---------- (f) kelas alamat: IsPrivate tidak cukup ----------

// TestSSRFKelasAlamatIsPrivateTidakCukup mencetak, untuk tiap alamat, jawaban lima penanda bawaan Go dan keputusan
// fetcher. Isinya klasifikasi murni (tanpa jaringan): bagian yang benar-benar dihubungi ada di jaringan.txt.
func TestSSRFKelasAlamatIsPrivateTidakCukup(t *testing.T) {
	fmt.Println("\n## kelas alamat: yang tidak ditangkap IsPrivate dan penanda bawaan lain, dan keputusan fetcher aman")
	fmt.Printf("%-24s %-9s %-9s %-9s %-11s %-6s %s\n", "alamat", "IsPrivate", "IsLoopbk", "IsLinkLoc", "IsUnspecif", "aman", "keterangan")
	kelas := []struct{ alamat, ket string }{
		{"127.0.0.1", "loopback"},
		{"10.0.0.1", "private (RFC 1918)"},
		{"169.254.77.7", "link-local (alamat contoh lab, bukan alamat metadata)"},
		{"fd00::5", "ULA IPv6 (RFC 4193)"},
		{"100.64.0.1", "CGNAT (RFC 6598)"},
		{"0.0.0.0", "unspecified (0.0.0.0)"},
		{"::ffff:10.0.0.1", "IPv4-mapped ke private"},
		{"::ffff:100.64.0.1", "IPv4-mapped ke CGNAT"},
		{"64:ff9b::a00:1", "NAT64 (RFC 6052) membawa 10.0.0.1"},
		{"2002:a00:1::1", "6to4 (RFC 3056) membawa 10.0.0.1"},
		{"2001::1", "Teredo (RFC 4380)"},
		{"198.18.0.1", "benchmark (RFC 2544)"},
		{"64:ff9b:1::a00:1", "NAT64 awalan lokal (RFC 8215) membawa 10.0.0.1"},
		{"::a00:1", "IPv4-compatible (usang, RFC 4291) membawa 10.0.0.1"},
		{"2001:db8::1", "dokumentasi IPv6 (RFC 3849)"},
		{"fec0::1", "site-local (usang, RFC 3879)"},
		{"0.1.2.3", "\"this network\" 0.0.0.0/8 (RFC 791)"},
		{"192.0.0.9", "protokol IETF 192.0.0.0/24 (RFC 6890)"},
		{"192.0.2.7", "dokumentasi TEST-NET-1 (RFC 5737)"},
		{"198.51.100.7", "dokumentasi TEST-NET-2 (RFC 5737)"},
		{"203.0.113.7", "dokumentasi TEST-NET-3 (RFC 5737)"},
		{"240.0.0.1", "cadangan 240.0.0.0/4 (RFC 1112)"},
		{"100::5", "discard-only 100::/64 (RFC 6666)"},
		{"100:0:0:1::5", "dummy IPv6 prefix 100:0:0:1::/64 (RFC 9780)"},
		{"2001:2::5", "benchmarking IPv6 2001:2::/48 (RFC 5180)"},
		{"3fff::1", "dokumentasi IPv6 3fff::/20 (RFC 9637)"},
		{"5f00::5", "SRv6 SIDs 5f00::/16 (RFC 9602)"},
		{"198.19.255.254", "ujung atas benchmark 198.18.0.0/15 (RFC 2544)"},
		{"255.255.255.255", "limited broadcast (RFC 919)"},
		{"2002:c0a8:101::1", "6to4 membawa 192.168.1.1"},
		{"239.255.0.1", "multicast IPv4 di luar skop tautan"},
		{"ff0e::1", "multicast IPv6 skop global"},
		{"93.184.216.34", "alamat publik (kontrol: harus lolos)"},
		{"100.63.255.255", "tepat di bawah CGNAT (kontrol: harus lolos)"},
		{"100.128.0.1", "tepat di atas CGNAT (kontrol: harus lolos)"},
		{"2001:4860:4860::8888", "IPv6 publik di luar 2001::/23 (kontrol: harus lolos)"},
		{"2606:4700:4700::1111", "IPv6 publik (kontrol: harus lolos)"},
	}
	var tertangkapAman, lolosIsPrivate, kontrolN int
	a := Aturan{}
	for _, k := range kelas {
		ip := netip.MustParseAddr(k.alamat)
		ya := func(b bool) string {
			if b {
				return "ya"
			}
			return "tidak"
		}
		ditolak := a.alamatDilarang(ip)
		fmt.Printf("%-24s %-9s %-9s %-9s %-11s %-6s %s\n", k.alamat, ya(ip.IsPrivate()), ya(ip.IsLoopback()),
			ya(ip.IsLinkLocalUnicast()), ya(ip.IsUnspecified()), map[bool]string{true: "tolak", false: "lolos"}[ditolak], k.ket)
		kontrol := strings.Contains(k.ket, "kontrol")
		if !kontrol && !ditolak {
			t.Errorf("%s tidak ditolak fetcher aman", k.alamat)
		}
		if kontrol {
			kontrolN++
			if ditolak {
				t.Errorf("%s adalah alamat publik tetapi ditolak", k.alamat)
			}
		}
		if ditolak && !ip.IsPrivate() {
			lolosIsPrivate++
		}
		if ditolak {
			tertangkapAman++
		}
	}
	fmt.Printf("ditolak fetcher aman: %d dari %d alamat terlarang; dari itu %d lolos bila IsPrivate satu-satunya pemeriksaan\n", tertangkapAman, len(kelas)-kontrolN, lolosIsPrivate)
	if lolosIsPrivate < 5 {
		t.Fatalf("hanya %d alamat yang lolos IsPrivate padahal terlarang; tes ini tidak membuktikan IsPrivate tidak cukup", lolosIsPrivate)
	}
}

// TestSSRFKelasAlamatBerzonaSamaDenganTanpaZona: alamat IPv6 dengan zona ("%1", "%eth0") harus dijawab sama dengan alamat
// tanpa zona. netip.Prefix.Contains menjawab false untuk alamat berzona (dokumentasi paket netip), jadi zona yang tidak
// dibuang membuat seluruh daftar alamatKhusus tidak pernah cocok. URL seperti https://[2001:db8::1%251]/ membawa zona itu
// ke penyaring awal dan ke ControlContext, karena net/url dan netip.ParseAddr sama-sama menyimpannya. Klasifikasi murni:
// tes ini sengaja tidak memanggil Unduh dengan alamat terlarang, karena pada kode yang rusak panggilan itu akan menghubungi
// alamat tersebut.
func TestSSRFKelasAlamatBerzonaSamaDenganTanpaZona(t *testing.T) {
	fmt.Printf("\n## alamat IPv6 berzona: zona (\"%%1\", \"%%eth0\") tidak boleh mengubah keputusan, karena netip.Prefix.Contains tidak mencocokkan alamat berzona\n")
	prefiks := netip.MustParsePrefix("2001:db8::/32")
	fmt.Printf("netip.Prefix 2001:db8::/32 Contains 2001:db8::1: %v; Contains 2001:db8::1%%1: %v\n",
		prefiks.Contains(netip.MustParseAddr("2001:db8::1")), prefiks.Contains(netip.MustParseAddr("2001:db8::1%1")))
	if prefiks.Contains(netip.MustParseAddr("2001:db8::1%1")) {
		t.Fatal("netip.Prefix.Contains kini mencocokkan alamat berzona; alasan baris di alamatDilarang perlu ditinjau ulang")
	}
	kasus := []struct {
		alamat    string
		terlarang bool
	}{
		{"64:ff9b::a00:1", true}, {"64:ff9b:1::a00:1", true}, {"2002:a00:1::1", true}, {"2001::1", true}, {"::a00:1", true},
		{"2001:db8::1", true}, {"fec0::1", true}, {"100::5", true}, {"100:0:0:1::5", true}, {"2001:2::5", true},
		{"3fff::1", true}, {"5f00::5", true},
		{"fd00::5", true}, {"fe80::1", true}, {"::1", true}, {"::", true}, {"ff0e::1", true},
		{"::ffff:10.0.0.1", true}, {"::ffff:100.64.0.1", true},
		{"2001:4860:4860::8888", false}, {"2606:4700:4700::1111", false},
	}
	putusan := func(b bool) string { return map[bool]string{true: "tolak", false: "lolos"}[b] }
	a := Aturan{}
	fmt.Printf("%-24s %-11s %-9s %s\n", "alamat", "tanpa zona", "%1", "%eth0")
	var terlarang, ditolakBerzona, kontrol, kontrolLolos int
	for _, k := range kasus {
		tanpa := a.alamatDilarang(netip.MustParseAddr(k.alamat))
		satu := a.alamatDilarang(netip.MustParseAddr(k.alamat + "%1"))
		eth := a.alamatDilarang(netip.MustParseAddr(k.alamat + "%eth0"))
		fmt.Printf("%-24s %-11s %-9s %s\n", k.alamat, putusan(tanpa), putusan(satu), putusan(eth))
		if tanpa != k.terlarang || satu != k.terlarang || eth != k.terlarang {
			t.Errorf("%s: tanpa zona %v, %%1 %v, %%eth0 %v; ingin %v untuk ketiganya", k.alamat, tanpa, satu, eth, k.terlarang)
		}
		if k.terlarang {
			terlarang++
			if satu && eth {
				ditolakBerzona++
			}
		} else {
			kontrol++
			if !satu && !eth {
				kontrolLolos++
			}
		}
	}
	fmt.Printf("ditolak fetcher aman dengan zona: %d dari %d alamat terlarang; alamat publik berzona yang lolos: %d dari %d\n", ditolakBerzona, terlarang, kontrolLolos, kontrol)
}
