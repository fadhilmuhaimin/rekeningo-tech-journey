// Package unduh mengunduh gambar dari URL milik merchant untuk pratinjau impor katalog (M36, ADR 41).
//
// Dua versi hidup berdampingan supaya lab t4-ssrf bisa merekam keduanya di server yang sama:
//
//   - Aman: versi benar. Hanya https, alamat tujuan diperiksa saat dial (net.Dialer.ControlContext), redirect tidak
//     diikuti, 2 MiB dan 3 detik, tipe isi dari byte, pesan galat tanpa isi respons.
//   - Rentan: versi pertama minggu 9 (mode -rentan unduh-rentan). Hanya deny-list string pada URL, semua redirect
//     diikuti, alamat hasil resolusi tidak diperiksa, dan pesan galat menampilkan awal isi respons.
//
// Gambar tidak disimpan: pemanggil hanya menerima tipe dan ukurannya untuk pratinjau.
package unduh

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"strings"
	"sync/atomic"
	"syscall"
	"time"

	"lab/apit4/internal/klien"
)

// Gambar adalah hasil pratinjau: tipe isi yang dideteksi dari byte, dan ukuran dalam byte.
type Gambar struct {
	Tipe   string `json:"tipe"`
	Ukuran int    `json:"ukuran"`
}

// Galat versi Aman. Pesannya sengaja generik: isi respons dan alamat hasil resolusi tidak ikut keluar, karena pesan
// galat sampai ke merchant (inti M36).
var (
	ErrTujuan        = errors.New("tujuan tidak diizinkan")
	ErrBukanGambar   = errors.New("bukan gambar")
	ErrTerlaluBesar  = errors.New("terlalu besar")
	ErrTidakMenjawab = errors.New("tidak menjawab")
	ErrGagal         = errors.New("gambar tidak bisa diunduh")
)

const (
	// BatasUkuran: gambar paling besar 2 MiB (ADR 41).
	BatasUkuran = 2 << 20
	// BatasWaktu: waktu total satu unduhan, termasuk resolusi nama, koneksi, dan pembacaan isi (ADR 41, ADR 22).
	BatasWaktu = 3 * time.Second
	// BatasHeader: header jawaban paling besar 64 KiB (Asumsi lab: header gambar yang sehat jauh di bawahnya).
	BatasHeader = 64 << 10
	// batasRentan: versi pertama hanya membatasi isi pada angka yang wajar, bukan pada kebutuhan gambar.
	batasRentan = 10 << 20
	// awalGalatRentan: berapa byte pertama isi respons yang ikut di pesan galat versi rentan.
	awalGalatRentan = 200
)

// IzinkanHTTPLab diisi flag lab -unduh-izinkan-http (cmd/api): tiruan lokal di container tidak punya TLS, jadi lab
// yang mengunduh dari tiruan itu membuka skema http. Kode produksi tidak menyalakannya.
var IzinkanHTTPLab atomic.Bool

// Aturan mengatur versi Aman. Nilai kosong adalah versi yang benar: hanya https, loopback ditolak, resolver sistem,
// 3 detik, 2 MiB. Isian lain hanya dipakai tes dan lab.
type Aturan struct {
	IzinkanHTTP bool // lab: skema http boleh
	// IzinkanLoopback: hanya tes. Alamat loopback tidak ditolak supaya server uji httptest bisa dijangkau; semua
	// kelas alamat lain tetap ditolak. Dinamai positif supaya nilai kosong adalah yang aman.
	IzinkanLoopback bool
	// Resolver mencari alamat sebuah nama. Dipanggil dua kali per unduhan (pemeriksaan awal dan saat dial), jadi tes
	// bisa menyuntik resolver yang menjawab alamat berbeda di antara keduanya (DNS rebinding). Bawaan: resolver sistem.
	Resolver  func(ctx context.Context, host string) ([]net.IPAddr, error)
	TLSConfig *tls.Config   // hanya tes: mempercayai sertifikat server uji
	Waktu     time.Duration // 0 = BatasWaktu
	MaksByte  int64         // 0 = BatasUkuran
}

// Aman mengunduh dengan Aturan bawaan (skema http hanya bila IzinkanHTTPLab menyala).
func Aman(ctx context.Context, alamat string) (Gambar, error) {
	return Aturan{IzinkanHTTP: IzinkanHTTPLab.Load()}.Unduh(ctx, alamat)
}

// alamatKhusus: kelas alamat yang tidak boleh menjadi tujuan unduhan selain yang sudah dikenali netip
// (loopback, private termasuk fc00::/7, link-local, multicast, unspecified). Daftar ini menutup yang tidak
// tercakup IsPrivate: bagian "this network", CGNAT, protokol IETF, dokumentasi, benchmark, cadangan, dan
// awalan IPv6 yang membawa alamat IPv4 (NAT64 termasuk awalan lokal RFC 8215, 6to4, Teredo). golang/go#79925:
// IsPrivate saja tidak cukup. Baris IPv6 sesudah 100::/64 dicocokkan dengan registri alamat khusus IPv6 IANA
// (diakses 2026-10-28) oleh lab t4-ssrf: awalan NAT64 lokal, 100:0:0:1::/64, 2001::/23 (protokol IETF, memuat
// 2001::/32), dokumentasi 2001:db8::/32 dan 3fff::/20, SRv6 5f00::/16, serta dua blok usang (IPv4-compatible ::/96
// dan site-local fec0::/10) yang tidak dipakai host sungguhan.
var alamatKhusus = func() []netip.Prefix {
	var p []netip.Prefix
	for _, s := range []string{
		"0.0.0.0/8", "100.64.0.0/10", "192.0.0.0/24", "192.0.2.0/24", "198.18.0.0/15", "198.51.100.0/24",
		"203.0.113.0/24", "240.0.0.0/4", "64:ff9b::/96", "2002::/16", "2001::/32", "100::/64",
		"64:ff9b:1::/48", "100:0:0:1::/64", "2001::/23", "2001:db8::/32", "3fff::/20", "5f00::/16", "::/96", "fec0::/10",
	} {
		p = append(p, netip.MustParsePrefix(s))
	}
	return p
}()

// alamatDilarang: apakah alamat ini terlarang sebagai tujuan unduhan. Alamat IPv4-mapped (::ffff:a.b.c.d)
// diperlakukan sebagai IPv4-nya: tanpa Unmap, awalan IPv4 di daftar di atas tidak pernah cocok dengan bentuk itu.
func (a Aturan) alamatDilarang(ip netip.Addr) bool {
	ip = ip.Unmap()
	if ip.IsLoopback() {
		return !a.IzinkanLoopback
	}
	if ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsInterfaceLocalMulticast() ||
		ip.IsMulticast() || ip.IsUnspecified() {
		return true
	}
	for _, p := range alamatKhusus {
		if p.Contains(ip) {
			return true
		}
	}
	return false
}

func (a Aturan) cari(ctx context.Context, host string) ([]net.IPAddr, error) {
	if a.Resolver != nil {
		return a.Resolver(ctx, host)
	}
	return net.DefaultResolver.LookupIPAddr(ctx, host)
}

// Unduh mengunduh satu gambar dengan semua pemeriksaan ADR 41.
func (a Aturan) Unduh(ctx context.Context, alamat string) (Gambar, error) {
	u, err := url.Parse(alamat)
	if err != nil || u.Host == "" || u.User != nil || u.Hostname() == "" {
		return Gambar{}, ErrTujuan
	}
	if u.Scheme != "https" && !(a.IzinkanHTTP && u.Scheme == "http") {
		return Gambar{}, ErrTujuan
	}
	waktu := a.Waktu
	if waktu == 0 {
		waktu = BatasWaktu
	}
	maks := a.MaksByte
	if maks == 0 {
		maks = BatasUkuran
	}
	ctx, batal := context.WithTimeout(ctx, waktu)
	defer batal()

	// Pemeriksaan awal: nama diselesaikan dan setiap alamat jawabannya diperiksa. Ini hanya penyaring cepat; yang
	// menentukan adalah pemeriksaan di ControlContext pada alamat yang benar-benar di-dial.
	host := u.Hostname()
	if ip, err := netip.ParseAddr(host); err == nil {
		if a.alamatDilarang(ip) {
			return Gambar{}, ErrTujuan
		}
	} else {
		semua, err := a.cari(ctx, host)
		if err != nil || len(semua) == 0 {
			return Gambar{}, ErrTidakMenjawab
		}
		for _, x := range semua {
			if ip, ok := netip.AddrFromSlice(x.IP); ok && a.alamatDilarang(ip) {
				return Gambar{}, ErrTujuan
			}
		}
	}

	dialer := &net.Dialer{
		Timeout: waktu,
		// --8<-- [start:control-context]
		// ControlContext berjalan sesudah alamat dipilih dan sebelum connect: yang diperiksa adalah alamat yang akan
		// benar-benar dihubungi, bukan alamat yang dijawab resolver pada pemeriksaan awal (DNS rebinding).
		ControlContext: func(_ context.Context, _, address string, _ syscall.RawConn) error {
			h, _, err := net.SplitHostPort(address)
			if err != nil {
				return ErrTujuan
			}
			ip, err := netip.ParseAddr(h)
			if err != nil || a.alamatDilarang(ip) {
				return ErrTujuan
			}
			return nil
		},
		// --8<-- [end:control-context]
	}
	tr := &http.Transport{
		Proxy:           nil, // HTTP_PROXY di lingkungan tidak boleh mengubah tujuan
		TLSClientConfig: a.TLSConfig,
		DialContext: func(ctx context.Context, network, address string) (net.Conn, error) {
			h, port, err := net.SplitHostPort(address)
			if err != nil {
				return nil, ErrTujuan
			}
			if _, err := netip.ParseAddr(h); err == nil {
				return dialer.DialContext(ctx, network, address)
			}
			semua, err := a.cari(ctx, h) // resolusi kedua: jawabannya bisa berbeda dari pemeriksaan awal
			if err != nil || len(semua) == 0 {
				return nil, ErrTidakMenjawab
			}
			var galat error
			for _, x := range semua {
				c, err := dialer.DialContext(ctx, network, net.JoinHostPort(x.IP.String(), port))
				if err == nil {
					return c, nil
				}
				galat = err
			}
			return nil, galat
		},
		DisableKeepAlives: true,
		// Batas 2 MiB berlaku untuk isi. Tanpa batas ini header jawaban boleh sampai 10 MB (bawaan Transport), dan
		// delapan unduhan serentak bisa menahan puluhan MB memori dari satu server yang sengaja mengirim header besar.
		MaxResponseHeaderBytes: BatasHeader,
	}
	c := klien.BaruDenganTransport(waktu, tr) // timeout dan aturan "redirect tidak diikuti" dari satu pembuat client
	defer tr.CloseIdleConnections()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return Gambar{}, ErrTujuan
	}
	resp, err := c.Do(req)
	if err != nil {
		return Gambar{}, galatAman(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 && resp.StatusCode < 400 {
		return Gambar{}, ErrTujuan // pengalihan tidak diikuti: tujuan barunya tidak pernah diperiksa
	}
	if resp.StatusCode != http.StatusOK {
		return Gambar{}, ErrGagal
	}
	if resp.ContentLength > maks {
		return Gambar{}, ErrTerlaluBesar
	}
	// --8<-- [start:batas-ukuran]
	isi, err := io.ReadAll(io.LimitReader(resp.Body, maks+1))
	if err != nil {
		return Gambar{}, galatAman(err)
	}
	if int64(len(isi)) > maks {
		return Gambar{}, ErrTerlaluBesar
	}
	// --8<-- [end:batas-ukuran]
	tipe := http.DetectContentType(isi)
	switch tipe {
	case "image/png", "image/jpeg", "image/gif", "image/webp":
		return Gambar{Tipe: tipe, Ukuran: len(isi)}, nil
	}
	return Gambar{}, ErrBukanGambar
}

// galatAman memetakan error transport ke satu dari galat generik; isinya tidak diteruskan.
func galatAman(err error) error {
	switch {
	case errors.Is(err, ErrTujuan):
		return ErrTujuan
	case errors.Is(err, context.DeadlineExceeded):
		return ErrTidakMenjawab
	}
	var ne net.Error
	if errors.As(err, &ne) && ne.Timeout() {
		return ErrTidakMenjawab
	}
	return ErrGagal
}

// Rentan adalah versi pertama minggu 9 (mode unduh-rentan, M36): deny-list string pada URL, tanpa pemeriksaan
// alamat hasil resolusi, semua redirect diikuti, dan pesan galat membawa awal isi respons.
func Rentan(ctx context.Context, alamat string) (Gambar, error) {
	// --8<-- [start:deny-list]
	if strings.Contains(alamat, "localhost") || strings.Contains(alamat, "127.0.0.1") {
		return Gambar{}, errors.New("alamat tidak diizinkan")
	}
	// --8<-- [end:deny-list]
	ctx, batal := context.WithTimeout(ctx, 10*time.Second)
	defer batal()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, alamat, nil)
	if err != nil {
		return Gambar{}, fmt.Errorf("alamat tidak valid: %v", err)
	}
	resp, err := (&http.Client{}).Do(req) // klien bawaan: redirect diikuti, skema http dan https
	if err != nil {
		return Gambar{}, fmt.Errorf("gagal mengunduh: %v", err)
	}
	defer resp.Body.Close()
	isi, err := io.ReadAll(io.LimitReader(resp.Body, batasRentan))
	if err != nil {
		return Gambar{}, fmt.Errorf("gagal membaca: %v", err)
	}
	tipe := http.DetectContentType(isi)
	if resp.StatusCode != http.StatusOK || !strings.HasPrefix(tipe, "image/") {
		awal := isi
		if len(awal) > awalGalatRentan {
			awal = awal[:awalGalatRentan]
		}
		// Isi respons ikut di pesan galat: yang diambil server atas nama merchant sampai ke merchant.
		return Gambar{}, fmt.Errorf("bukan gambar (status %d): %s", resp.StatusCode, awal)
	}
	return Gambar{Tipe: tipe, Ukuran: len(isi)}, nil
}
