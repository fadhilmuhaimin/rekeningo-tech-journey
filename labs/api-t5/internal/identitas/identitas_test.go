package identitas_test

import (
	"crypto/tls"
	"crypto/x509"
	"io"
	"log"
	"net"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"lab/apit5/internal/identitas"
	"lab/apit5/internal/klien"
	"lab/apit5/internal/pki"
)

// Tes mTLS dan otorisasi per pemanggil (M47, ADR 53) dengan sertifikat yang dibuat saat tes berjalan (internal/pki),
// ditulis ke t.TempDir dan tidak pernah masuk repo. Server tes memakai identitas.ServerTLS dan identitas.Wajib yang
// sama dengan ledger lab. Penolakan diperiksa dari JENIS galatnya (alert TLS dari server), bukan hanya "gagal", dan dari
// handler yang tidak pernah dipanggil.

// logServer menampung log kesalahan server tes (alasan penolakan handshake menurut server); aman dibaca dari goroutine lain.
type logServer struct {
	mu    sync.Mutex
	baris []string
}

func (l *logServer) Write(p []byte) (int, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.baris = append(l.baris, strings.TrimSpace(string(p)))
	return len(p), nil
}

func (l *logServer) semua() []string {
	l.mu.Lock()
	defer l.mu.Unlock()
	return append([]string(nil), l.baris...)
}

type bengkel struct {
	log      *logServer
	folder   string
	ca, lain *pki.CA
	server   *httptest.Server
	handler  atomic.Int64 // berapa kali handler terlindung dijalankan
	alamat   string
}

func (b *bengkel) tulis(t *testing.T, nama string, ca *pki.CA, p pki.Pilihan) {
	t.Helper()
	s, k, err := ca.Terbitkan(p)
	if err != nil {
		t.Fatal(err)
	}
	if err := pki.Tulis(b.folder, nama, s, k); err != nil {
		t.Fatal(err)
	}
}

func (b *bengkel) berkas(nama string) (string, string) {
	return filepath.Join(b.folder, nama+".pem"), filepath.Join(b.folder, nama+".key")
}

func siapkan(t *testing.T) *bengkel {
	t.Helper()
	b := &bengkel{folder: t.TempDir(), log: &logServer{}}
	kini := time.Now()
	jam := func(n int) time.Time { return kini.Add(time.Duration(n) * time.Hour) }
	var err error
	if b.ca, err = pki.BuatCA("CA tes", jam(-1), jam(24)); err != nil {
		t.Fatal(err)
	}
	if b.lain, err = pki.BuatCA("CA lain", jam(-1), jam(24)); err != nil {
		t.Fatal(err)
	}
	klien := []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth}
	server := []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}
	san := func(n string) []string { return []string{n + "." + identitas.DomainBawaan} }
	b.tulis(t, "ledger", b.ca, pki.Pilihan{CN: "ledger", DNS: san("ledger"), IP: []net.IP{net.IPv4(127, 0, 0, 1)}, EKU: server, Mulai: jam(-1), Sampai: jam(24)})
	for _, n := range []string{"pembayaran", "notifikasi", "cicilan"} {
		b.tulis(t, n, b.ca, pki.Pilihan{CN: n, DNS: san(n), EKU: klien, Mulai: jam(-1), Sampai: jam(24)})
	}
	b.tulis(t, "kedaluwarsa", b.ca, pki.Pilihan{CN: "pembayaran", DNS: san("pembayaran"), EKU: klien, Mulai: jam(-48), Sampai: jam(-24)})
	b.tulis(t, "dari-ca-lain", b.lain, pki.Pilihan{CN: "pembayaran", DNS: san("pembayaran"), EKU: klien, Mulai: jam(-1), Sampai: jam(24)})
	b.tulis(t, "hanya-server", b.ca, pki.Pilihan{CN: "pembayaran", DNS: san("pembayaran"), EKU: server, Mulai: jam(-1), Sampai: jam(24)})
	b.tulis(t, "tanpa-san", b.ca, pki.Pilihan{CN: "pembayaran", EKU: klien, Mulai: jam(-1), Sampai: jam(24)})
	b.tulis(t, "domain-lain", b.ca, pki.Pilihan{CN: "pembayaran", DNS: []string{"pembayaran.contoh.lain"}, EKU: klien, Mulai: jam(-1), Sampai: jam(24)})
	b.tulis(t, "tanpa-domain", b.ca, pki.Pilihan{CN: "pembayaran", DNS: []string{"pembayaran"}, EKU: klien, Mulai: jam(-1), Sampai: jam(24)})
	b.tulis(t, "dua-san", b.ca, pki.Pilihan{CN: "pembayaran", DNS: []string{"pembayaran." + identitas.DomainBawaan, "notifikasi." + identitas.DomainBawaan}, EKU: klien, Mulai: jam(-1), Sampai: jam(24)})
	b.tulis(t, "san-bersarang", b.ca, pki.Pilihan{CN: "pembayaran", DNS: []string{"pembayaran.sub." + identitas.DomainBawaan}, EKU: klien, Mulai: jam(-1), Sampai: jam(24)})
	b.tulis(t, "cn-menyesatkan", b.ca, pki.Pilihan{CN: "pembayaran", DNS: san("notifikasi"), EKU: klien, Mulai: jam(-1), Sampai: jam(24)})

	sert, kunci := b.berkas("ledger")
	cfg, err := identitas.ServerTLS(b.ca.PEM, sert, kunci)
	if err != nil {
		t.Fatal(err)
	}
	ok := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b.handler.Add(1)
		io.WriteString(w, "jurnal dibuat")
	})
	mux := http.NewServeMux()
	mux.Handle("POST /topup", identitas.Wajib(identitas.IzinNaskah, identitas.DomainBawaan, "topup_bank", ok, nil))
	mux.Handle("POST /tahan", identitas.Wajib(identitas.IzinNaskah, identitas.DomainBawaan, "kartu_tahan", ok, nil))
	b.server = httptest.NewUnstartedServer(mux)
	b.server.TLS = cfg
	b.server.Config.ErrorLog = log.New(b.log, "", 0)
	b.server.StartTLS()
	t.Cleanup(b.server.Close)
	b.alamat = strings.TrimPrefix(b.server.URL, "https://")
	return b
}

func (b *bengkel) tls(t *testing.T, nama string) *tls.Config {
	t.Helper()
	var sert, kunci string
	if nama != "" {
		sert, kunci = b.berkas(nama)
	}
	cfg, err := identitas.KlienTLS(b.ca.PEM, sert, kunci, "ledger."+identitas.DomainBawaan)
	if err != nil {
		t.Fatal(err)
	}
	return cfg
}

func (b *bengkel) panggil(t *testing.T, nama, jalan string, kepala ...string) (int, string) {
	t.Helper()
	c := klien.BaruDenganTransport(klien.BatasBawaan, &http.Transport{TLSClientConfig: b.tls(t, nama)})
	req, _ := http.NewRequest("POST", "https://"+b.alamat+jalan, strings.NewReader("{}"))
	for i := 0; i+1 < len(kepala); i += 2 {
		req.Header.Set(kepala[i], kepala[i+1])
	}
	res, err := c.Do(req)
	if err != nil {
		t.Fatalf("panggilan %s %s: %v", nama, jalan, err)
	}
	defer res.Body.Close()
	isi, _ := io.ReadAll(res.Body)
	return res.StatusCode, strings.TrimSpace(string(isi))
}

func TestIdentitasBerizinMembuatJurnalJenisItu(t *testing.T) {
	b := siapkan(t)
	for _, jalan := range []string{"/topup", "/tahan"} {
		if s, isi := b.panggil(t, "pembayaran", jalan); s != 200 || isi != "jurnal dibuat" {
			t.Errorf("pembayaran %s: %d %q; pembayaran boleh topup_bank dan kartu_tahan", jalan, s, isi)
		}
	}
	if n := b.handler.Load(); n != 2 {
		t.Errorf("handler dijalankan %d kali, ingin 2", n)
	}
}

func TestSertifikatSahTanpaIzinJenisDijawab403(t *testing.T) {
	b := siapkan(t)
	for _, nama := range []string{"notifikasi", "cicilan"} {
		for _, jalan := range []string{"/topup", "/tahan"} {
			s, isi := b.panggil(t, nama, jalan)
			if s != http.StatusForbidden || !strings.Contains(isi, `"alasan":"jenis-tidak-diizinkan"`) || !strings.Contains(isi, `"identitas":"`+nama+`"`) {
				t.Errorf("%s %s: %d %s; ingin 403 jenis-tidak-diizinkan", nama, jalan, s, isi)
			}
		}
	}
	if n := b.handler.Load(); n != 0 {
		t.Errorf("handler dijalankan %d kali oleh identitas tanpa izin", n)
	}
}

// Sertifikat yang tidak sah ditolak di handshake: server mengirim alert, handler tidak pernah jalan, dan galat di client
// adalah alert TLS dari server (bukan koneksi mati).
func TestSertifikatTidakSahDitolakSaatHandshake(t *testing.T) {
	b := siapkan(t)
	kasus := []struct{ nama, alert string }{
		{"", "certificate required"},
		{"dari-ca-lain", "unknown certificate authority"},
		{"kedaluwarsa", "expired certificate"},
		{"hanya-server", "bad certificate"},
	}
	for _, k := range kasus {
		hasil := identitas.Sonde(b.alamat, b.tls(t, k.nama), 2*time.Second)
		if want := "alert dari server: tls: " + k.alert; hasil != want {
			t.Errorf("sertifikat %q: %q, ingin %q", k.nama, hasil, want)
		}
	}
	if n := b.handler.Load(); n != 0 {
		t.Errorf("handler dijalankan %d kali oleh klien yang ditolak di handshake", n)
	}
	// Alasan menurut server, urut sama dengan sonde di atas. Ditunggu sampai tercatat: server menulis log di goroutine koneksinya.
	alasan := []string{"client didn't provide a certificate", "certificate signed by unknown authority",
		"certificate has expired or is not yet valid", "certificate specifies an incompatible key usage"}
	deadline := time.Now().Add(5 * time.Second)
	for len(b.log.semua()) < len(alasan) && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	for i, a := range alasan {
		if got := b.log.semua(); i >= len(got) || !strings.Contains(got[i], a) {
			t.Errorf("log server baris %d: %v, ingin memuat %q", i, got, a)
		}
	}
	if hasil := identitas.Sonde(b.alamat, b.tls(t, "pembayaran"), 300*time.Millisecond); hasil != "diterima" {
		t.Errorf("sertifikat sah: %q, ingin diterima (kontrol positif)", hasil)
	}
}

// Identitas hanya dari SAN: rantai sah tanpa SAN diterima handshake tetapi dijawab 401 oleh handler, dan CN yang
// menyebut "pembayaran" tidak memberi izin pembayaran bila SAN-nya notifikasi.
func TestIdentitasHanyaDariSANBukanCNAtauHeader(t *testing.T) {
	b := siapkan(t)
	if s, isi := b.panggil(t, "tanpa-san", "/topup"); s != 401 || !strings.Contains(isi, "tanpa-identitas") {
		t.Errorf("tanpa SAN: %d %s, ingin 401 tanpa-identitas", s, isi)
	}
	if s, isi := b.panggil(t, "cn-menyesatkan", "/topup"); s != 403 || !strings.Contains(isi, `"identitas":"notifikasi"`) {
		t.Errorf("CN pembayaran dengan SAN notifikasi: %d %s, ingin 403 sebagai notifikasi", s, isi)
	}
	if s, _ := b.panggil(t, "notifikasi", "/topup", "X-Layanan-Nama", "pembayaran", "X-Identitas", "pembayaran"); s != 403 {
		t.Errorf("header yang mengaku pembayaran: %d, ingin 403 (header tidak dipakai)", s)
	}
	if n := b.handler.Load(); n != 0 {
		t.Errorf("handler dijalankan %d kali", n)
	}
}

// Server menuntut sertifikat klien dan hanya TLS 1.3: kelonggaran sedikit saja akan mengubah tes di atas.
func TestServerTLSMenuntutSertifikatKlienDanTLS13(t *testing.T) {
	b := siapkan(t)
	sert, kunci := b.berkas("ledger")
	cfg, err := identitas.ServerTLS(b.ca.PEM, sert, kunci)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.ClientAuth != tls.RequireAndVerifyClientCert {
		t.Errorf("ClientAuth %v, ingin RequireAndVerifyClientCert", cfg.ClientAuth)
	}
	if cfg.MinVersion != tls.VersionTLS13 {
		t.Errorf("MinVersion %#x, ingin TLS 1.3", cfg.MinVersion)
	}
	// Klien TLS 1.2 ditolak dengan alert versi, bukan diterima.
	k12 := b.tls(t, "pembayaran")
	k12.MinVersion, k12.MaxVersion = tls.VersionTLS12, tls.VersionTLS12
	if hasil := identitas.Sonde(b.alamat, k12, 2*time.Second); !strings.HasPrefix(hasil, "alert dari server: tls: protocol version not supported") {
		t.Errorf("klien TLS 1.2: %q", hasil)
	}
}

func TestIzinNaskahMemuatEnamJenisTanpaTumpangTindih(t *testing.T) {
	semua := map[string]string{}
	for nama, jenis := range identitas.IzinNaskah {
		for _, j := range jenis {
			if lain, ada := semua[j]; ada {
				t.Errorf("jenis %s diizinkan untuk %s dan %s: satu jenis, satu pemilik", j, lain, nama)
			}
			semua[j] = nama
		}
	}
	if len(semua) != 6 {
		t.Errorf("tabel naskah memuat %d jenis, ingin 6 (3 pembayaran, 2 cicilan, 1 merchant)", len(semua))
	}
	for _, kosong := range []string{"notifikasi", "akun"} {
		if identitas.IzinNaskah.Boleh(kosong, "topup_bank") || len(identitas.IzinNaskah[kosong]) != 0 {
			t.Errorf("%s tidak boleh membuat jurnal apa pun", kosong)
		}
	}
	if identitas.IzinNaskah.Boleh("tidak-ada", "topup_bank") {
		t.Error("identitas yang tidak ada di tabel tidak boleh membuat jurnal")
	}
}

func TestKelasGalatMembedakanAlertDariKoneksiMati(t *testing.T) {
	// Alamat yang tidak mendengar: galat dial, bukan alert TLS.
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	alamat := l.Addr().String()
	l.Close()
	cfg := &tls.Config{InsecureSkipVerify: true}
	if hasil := identitas.Sonde(alamat, cfg, 200*time.Millisecond); !strings.HasPrefix(hasil, "bukan galat TLS:") {
		t.Errorf("koneksi mati dibaca %q, ingin bukan galat TLS", hasil)
	}
}

// Identitas adalah tepat satu SAN DNS `<nama>.<domain>`: domain lain, dua SAN (tidak memilih yang pertama), dan nama
// bersarang ditolak oleh handler walaupun rantainya sah.
func TestSANYangBukanTepatSatuIdentitasDitolakHandler(t *testing.T) {
	b := siapkan(t)
	for _, nama := range []string{"domain-lain", "tanpa-domain", "dua-san", "san-bersarang"} {
		if s, isi := b.panggil(t, nama, "/topup"); s != 401 || !strings.Contains(isi, "tanpa-identitas") {
			t.Errorf("sertifikat %s: %d %s, ingin 401 tanpa-identitas", nama, s, isi)
		}
	}
	if n := b.handler.Load(); n != 0 {
		t.Errorf("handler dijalankan %d kali", n)
	}
}

// Sertifikat yang tidak terverifikasi tidak dibaca sebagai identitas: server yang hanya MEMINTA sertifikat (bukan
// memverifikasi) menerima handshake dengan sertifikat dari CA lain, dan handler tetap menjawab 401 karena
// VerifiedChains kosong. Tanpa pemeriksaan itu, pembayaran palsu akan lolos.
func TestSertifikatTakTerverifikasiTidakDipakaiSebagaiIdentitas(t *testing.T) {
	b := siapkan(t)
	sert, kunci := b.berkas("ledger")
	lemah, err := identitas.ServerTLS(b.ca.PEM, sert, kunci)
	if err != nil {
		t.Fatal(err)
	}
	lemah.ClientAuth = tls.RequestClientCert
	mux := http.NewServeMux()
	mux.Handle("POST /topup", identitas.Wajib(identitas.IzinNaskah, identitas.DomainBawaan, "topup_bank", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b.handler.Add(1)
	}), nil))
	srv := httptest.NewUnstartedServer(mux)
	srv.TLS = lemah
	srv.Config.ErrorLog = log.New(io.Discard, "", 0)
	srv.StartTLS()
	defer srv.Close()
	asli := b.alamat
	b.alamat = strings.TrimPrefix(srv.URL, "https://")
	defer func() { b.alamat = asli }()
	if s, isi := b.panggil(t, "dari-ca-lain", "/topup"); s != 401 || !strings.Contains(isi, "tanpa-identitas") {
		t.Errorf("sertifikat dari CA lain di server yang tidak memverifikasi: %d %s, ingin 401", s, isi)
	}
	if n := b.handler.Load(); n != 0 {
		t.Errorf("handler dijalankan %d kali oleh sertifikat yang tidak terverifikasi", n)
	}
}

// Client memverifikasi nama server: sertifikat ledger tidak dipakai untuk nama lain, walaupun alamat IP-nya cocok.
func TestKlienMenolakServerBernamaLain(t *testing.T) {
	b := siapkan(t)
	sert, kunci := b.berkas("pembayaran")
	cfg, err := identitas.KlienTLS(b.ca.PEM, sert, kunci, "lain."+identitas.DomainBawaan)
	if err != nil {
		t.Fatal(err)
	}
	_, err = klien.BaruDenganTransport(klien.BatasBawaan, &http.Transport{TLSClientConfig: cfg}).Post("https://"+b.alamat+"/topup", "application/json", strings.NewReader("{}"))
	if err == nil || !strings.HasPrefix(identitas.KelasGalat(err), "client menolak sertifikat server:") {
		t.Errorf("nama server lain: %v (%q), ingin ditolak client", err, identitas.KelasGalat(err))
	}
	if n := b.handler.Load(); n != 0 {
		t.Errorf("handler dijalankan %d kali", n)
	}
}
