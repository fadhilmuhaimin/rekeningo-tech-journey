// Command proxykeluar adalah proxy keluar bertetap untuk lab t4-infra (M34, ADR 39): semua panggilan Rekeningo ke
// vendor yang menuntut daftar alamat lewat satu proxy, jadi vendor melihat satu alamat sumber (alamat proxy) berapa pun
// alamat host aplikasinya. Hanya HTTP biasa (bentuk absolut `GET http://host/path`); CONNECT untuk HTTPS tidak dipasang
// (Tidak dijalankan di lab: vendor tiruan tidak memakai TLS).
//
// Proxy ini sengaja kecil dan kaku:
//   - hanya meneruskan ke tujuan yang didaftarkan lewat -tujuan (host:port); tujuan lain dijawab 403. Proxy yang
//     meneruskan ke mana saja membuka jaringan dalam bagi siapa pun yang bisa menjangkaunya (lihat lab t4-ssrf);
//   - tidak menambahkan X-Forwarded-For atau header lain tentang alamat asal: vendor memeriksa alamat peer TCP, dan
//     proxy yang membocorkan alamat host asal ke vendor tidak menambah apa-apa selain isi log vendor;
//   - tidak memakai proxy lain (Transport.Proxy kosong), supaya HTTP_PROXY di lingkungannya sendiri tidak membuat
//     lingkaran;
//   - tidak mencatat isi permintaan.
package main

import (
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"strings"
	"time"
)

func main() {
	alamat := flag.String("addr", "0.0.0.0:3128", "alamat proxy")
	tujuan := flag.String("tujuan", "", "tujuan yang boleh diteruskan, dipisah koma, bentuk host:port (wajib)")
	flag.Parse()
	h, err := baru(strings.Split(*tujuan, ","))
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("proxykeluar mendengar di %s", *alamat)
	log.Fatal((&http.Server{Addr: *alamat, Handler: h, ReadHeaderTimeout: 5 * time.Second}).ListenAndServe())
}

// hopByHop: header yang berlaku per koneksi, tidak diteruskan (RFC 9110 bagian 7.6.1) ditambah Proxy-Connection.
var hopByHop = []string{"Connection", "Proxy-Connection", "Keep-Alive", "Proxy-Authenticate", "Proxy-Authorization", "Te", "Trailer", "Transfer-Encoding", "Upgrade"}

type proxy struct {
	tujuan map[string]bool
	tr     *http.Transport
}

// baru membuat handler. Daftar tujuan kosong adalah galat: proxy tanpa daftar akan meneruskan ke mana saja.
func baru(tujuan []string) (http.Handler, error) {
	p := &proxy{tujuan: map[string]bool{}, tr: &http.Transport{Proxy: nil, ResponseHeaderTimeout: 10 * time.Second}}
	for _, t := range tujuan {
		if t = strings.TrimSpace(t); t != "" {
			p.tujuan[strings.ToLower(t)] = true
		}
	}
	if len(p.tujuan) == 0 {
		return nil, fmt.Errorf("-tujuan wajib diisi: proxy tanpa daftar tujuan meneruskan ke mana saja")
	}
	return p, nil
}

func (p *proxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodConnect {
		http.Error(w, "CONNECT tidak dipasang di lab ini", http.StatusNotImplemented)
		return
	}
	if !r.URL.IsAbs() { // permintaan langsung ke proxy, bukan lewat proxy
		if r.URL.Path == "/healthz" {
			io.WriteString(w, "ok")
			return
		}
		http.NotFound(w, r)
		return
	}
	if r.URL.Scheme != "http" {
		http.Error(w, "hanya http", http.StatusBadRequest)
		return
	}
	host := strings.ToLower(r.URL.Host)
	if _, _, err := net.SplitHostPort(host); err != nil {
		host += ":80"
	}
	if !p.tujuan[host] {
		http.Error(w, "tujuan tidak terdaftar", http.StatusForbidden)
		return
	}
	keluar := r.Clone(r.Context())
	keluar.RequestURI = ""
	keluar.Header = r.Header.Clone()
	for _, k := range hopByHop {
		keluar.Header.Del(k)
	}
	keluar.Header.Del("X-Forwarded-For") // tidak meneruskan klaim alamat dari client; proxy tidak menulis yang baru
	resp, err := p.tr.RoundTrip(keluar)
	if err != nil {
		http.Error(w, "tujuan tidak menjawab", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()
	for k, v := range resp.Header {
		for _, x := range v {
			w.Header().Add(k, x)
		}
	}
	for _, k := range hopByHop {
		w.Header().Del(k)
	}
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}
