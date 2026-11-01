// Pemanggil satu kali untuk lab t5-service: memerankan pod uji, service dengan sertifikat tertentu, atau klien tanpa
// sertifikat. Mencetak satu baris: `status <kode> <isi>` untuk jawaban HTTP, `sonde: <hasil>` untuk -sonde (handshake saja),
// atau `galat: <kelas>` untuk galat TLS atau jaringan.
package main

import (
	"bytes"
	"crypto/tls"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"lab/apit5/internal/identitas"
	"lab/apit5/internal/klien"
)

type daftar []string

func (d *daftar) String() string     { return strings.Join(*d, ",") }
func (d *daftar) Set(s string) error { *d = append(*d, s); return nil }

func main() {
	alamat := flag.String("url", "", "alamat lengkap: https://<host>:<port>/ledger/jurnal-topup")
	ca := flag.String("ca", "", "berkas PEM CA untuk memverifikasi server (kosong = tanpa verifikasi server, hanya untuk HTTP biasa)")
	sert := flag.String("cert", "", "berkas PEM sertifikat klien (kosong = tanpa sertifikat)")
	kunci := flag.String("key", "", "berkas PEM kunci privat klien")
	namaServer := flag.String("server-name", "ledger."+identitas.DomainBawaan, "nama sertifikat server yang diharapkan")
	sonde := flag.Bool("sonde", false, "hanya handshake: lihat apakah server menolak sertifikat klien (tunggu alert paling lama 500 ms)")
	idem := flag.String("idempotency-key", "", "isi header Idempotency-Key")
	badan := flag.String("badan", "", "isi permintaan JSON (POST)")
	var kepala daftar
	flag.Var(&kepala, "header", "header tambahan `Nama: nilai` (boleh berulang)")
	flag.Parse()
	u, err := url.Parse(*alamat)
	if err != nil || u.Host == "" {
		log.Fatalf("-url tidak sah: %q", *alamat)
	}
	var cfgTLS *tls.Config
	if u.Scheme == "https" {
		caPEM, err := os.ReadFile(*ca)
		if err != nil {
			log.Fatal(err)
		}
		cfg, err := identitas.KlienTLS(caPEM, *sert, *kunci, *namaServer)
		if err != nil {
			log.Fatal(err)
		}
		cfgTLS = cfg
	}
	if *sonde {
		if cfgTLS == nil {
			log.Fatal("-sonde butuh https")
		}
		fmt.Println("sonde:", identitas.Sonde(u.Host, cfgTLS, 500*time.Millisecond))
		return
	}
	tr := &http.Transport{TLSClientConfig: cfgTLS}
	c := klien.BaruDenganTransport(klien.BatasBawaan, tr)
	metode, isi := http.MethodGet, io.Reader(nil)
	if *badan != "" {
		metode, isi = http.MethodPost, bytes.NewReader([]byte(*badan))
	}
	req, err := http.NewRequest(metode, *alamat, isi)
	if err != nil {
		log.Fatal(err)
	}
	if *badan != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	if *idem != "" {
		req.Header.Set("Idempotency-Key", *idem)
	}
	for _, h := range kepala {
		k, v, ok := strings.Cut(h, ":")
		if !ok {
			log.Fatalf("-header %q bukan `Nama: nilai`", h)
		}
		req.Header.Set(strings.TrimSpace(k), strings.TrimSpace(v))
	}
	res, err := c.Do(req)
	if err != nil {
		fmt.Println("galat:", identitas.KelasGalat(err))
		os.Exit(2)
	}
	defer res.Body.Close()
	b, _ := io.ReadAll(io.LimitReader(res.Body, 4<<10))
	fmt.Printf("status %d %s\n", res.StatusCode, strings.TrimSpace(string(b)))
}
