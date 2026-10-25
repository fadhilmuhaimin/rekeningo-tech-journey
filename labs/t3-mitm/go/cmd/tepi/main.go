// tepi adalah server tepi tiruan di depan api-t3: mengakhiri TLS dengan sertifikat dari berkas, menambah header
// Strict-Transport-Security (RFC 6797), dan meneruskan ke api-t3 lewat HTTP biasa di localhost. Tugasnya sama dengan
// reverse proxy di depan API (Caddy, nginx), tanpa dependency. Hanya untuk lab: tidak ada sertifikat yang dibuat di sini.
//
//	tepi -tls ADDR -cert F -key F -hulu http://HOST:PORT [-http ADDR] [-log F] [-log-mentah] [-hsts-detik N]
//
// Log akses mencatat metode, path, dan status. Header Authorization dan Cookie ditulis "[disamarkan]" kecuali
// -log-mentah (varian rentan: log yang menyalin semua header), supaya lab bisa merekam bedanya.
// Port HTTP biasa (-http) hanya menjawab 301 ke https dan tidak pernah mengirim header HSTS: RFC 6797 bagian 7.2.
package main

import (
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"sync"

	"lab/t3mitm/internal/pagar"
)

type penulisLog struct {
	mu sync.Mutex
	f  *os.File
}

func (p *penulisLog) tulis(format string, a ...any) {
	if p.f == nil {
		return
	}
	p.mu.Lock()
	defer p.mu.Unlock()
	fmt.Fprintf(p.f, format+"\n", a...)
}

type catatStatus struct {
	http.ResponseWriter
	kode int
}

func (c *catatStatus) WriteHeader(k int) { c.kode = k; c.ResponseWriter.WriteHeader(k) }

// samarkan mengganti nilai header sensitif. Dibuat fungsi sendiri supaya tes bisa memutasinya.
func samarkan(nama, nilai string, mentah bool) string {
	if mentah {
		return nilai
	}
	switch strings.ToLower(nama) {
	case "authorization", "cookie", "proxy-authorization":
		return "[disamarkan]"
	}
	return nilai
}

func baris(r *http.Request, kode int, mentah bool) string {
	h := []string{}
	for _, nama := range []string{"Authorization", "Cookie"} {
		if v := r.Header.Get(nama); v != "" {
			h = append(h, nama+": "+samarkan(nama, v, mentah))
		}
	}
	return fmt.Sprintf("%s %s %d %s", r.Method, r.URL.Path, kode, strings.Join(h, "; "))
}

func main() {
	alamatTLS := flag.String("tls", "", "alamat HTTPS")
	alamatHTTP := flag.String("http", "", "alamat HTTP biasa (hanya mengalihkan ke https)")
	cert := flag.String("cert", "", "sertifikat server (PEM)")
	kunci := flag.String("key", "", "kunci server (PEM)")
	hulu := flag.String("hulu", "", "alamat api-t3 (skema://host:port)")
	berkasLog := flag.String("log", "", "berkas log akses")
	mentah := flag.Bool("log-mentah", false, "varian rentan: log menyalin Authorization dan Cookie")
	hsts := flag.Int("hsts-detik", 31536000, "max-age HSTS dalam detik; 0 = tanpa header")
	flag.Parse()
	if *alamatTLS == "" || *cert == "" || *kunci == "" || *hulu == "" {
		log.Fatal("GAGAL: -tls, -cert, -key, dan -hulu wajib")
	}
	u, err := url.Parse(*hulu)
	if err != nil {
		log.Fatal("GAGAL: -hulu: ", err)
	}
	for _, a := range []string{*alamatTLS, *alamatHTTP} {
		if a == "" {
			continue // -http boleh kosong
		}
		if err := pagar.Loopback(a); err != nil {
			log.Fatal("GAGAL: ", err)
		}
	}
	if err := pagar.Loopback(u.Host); err != nil {
		log.Fatal("GAGAL: -hulu: ", err)
	}
	pl := &penulisLog{}
	if *berkasLog != "" {
		pl.f, err = os.OpenFile(*berkasLog, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o600)
		if err != nil {
			log.Fatal("GAGAL: ", err)
		}
	}
	rp := httputil.NewSingleHostReverseProxy(u)
	utama := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if *hsts > 0 {
			// Dikirim di setiap jawaban lewat TLS, termasuk error (RFC 6797 bagian 7.1).
			w.Header().Set("Strict-Transport-Security", fmt.Sprintf("max-age=%d; includeSubDomains", *hsts))
		}
		c := &catatStatus{ResponseWriter: w, kode: 200}
		rp.ServeHTTP(c, r)
		pl.tulis("%s", baris(r, c.kode, *mentah))
	})
	if *alamatHTTP != "" {
		go func() {
			// Port HTTP: hanya 301 ke https, tanpa header Strict-Transport-Security.
			_, portTLS, _ := net.SplitHostPort(*alamatTLS)
			err := http.ListenAndServe(*alamatHTTP, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				host, _, e := net.SplitHostPort(r.Host)
				if e != nil {
					host = r.Host
				}
				http.Redirect(w, r, "https://"+net.JoinHostPort(host, portTLS)+r.URL.RequestURI(), http.StatusMovedPermanently)
			}))
			log.Fatal("http: ", err)
		}()
	}
	log.Printf("tepi mendengar di %s", *alamatTLS)
	log.Fatal(http.ListenAndServeTLS(*alamatTLS, *cert, *kunci, utama))
}
