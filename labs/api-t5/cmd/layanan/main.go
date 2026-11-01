// Service pemanggil ledger untuk lab t5-service: `-peran pembayaran` atau `-peran notifikasi`. Keduanya adalah proses
// yang sama dengan identitas berbeda (sertifikat berbeda); isinya hanya satu rute lab, POST /lab/ke-ledger, yang
// memanggil ledger lewat mTLS dengan sertifikat service itu dan membawa `traceparent` ke ledger. Hasil ledger
// diteruskan apa adanya (status dan isi). Service ini tidak membuka database.
//
// Di produksi pembayaran memanggil ledger dari webhook top-up dan dari otorisasi kartu (ADR 34, ADR 42), dan notifikasi tidak
// memanggil ledger sama sekali; rute lab ini hanya membiarkan skrip lab memerankan pemanggil itu.
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"flag"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"

	"lab/apit5/internal/identitas"
	"lab/apit5/internal/jejak"
	"lab/apit5/internal/klien"
)

type permintaan struct {
	Jalur  string `json:"jalur"` // topup atau kartu-tahan
	Key    string `json:"key"`   // Idempotency-Key; di ledger sama dengan order_id (topup) atau id_penerbit (kartu-tahan)
	AkunID int64  `json:"akun_id"`
	Jumlah int64  `json:"jumlah"`
}

func main() {
	peran := flag.String("peran", "", "pembayaran atau notifikasi")
	alamat := flag.String("addr", "", "alamat server (bawaan: host lokal, port dasar 18321 untuk pembayaran dan 18322 untuk notifikasi, ditambah LAB_PORT_OFFSET)")
	ledger := flag.String("ledger", "", "alamat dasar ledger: https://<host>:<port>")
	sert := flag.String("tls-cert", "", "berkas PEM sertifikat service ini")
	kunci := flag.String("tls-key", "", "berkas PEM kunci privat service ini")
	ca := flag.String("tls-ca", "", "berkas PEM CA yang menerbitkan sertifikat ledger")
	namaServer := flag.String("server-name", "ledger."+identitas.DomainBawaan, "nama sertifikat ledger yang diharapkan")
	otlp := flag.String("otlp", "", "alamat OTLP/HTTP Collector (host:port, tanpa TLS); kosong = tanpa trace")
	idUrut := flag.Bool("lab-id-urut", false, "lab saja: ID trace berurutan (supaya hasil sampling bisa diulang tepat)")
	flag.Parse()
	dasar := map[string]int{"pembayaran": 18321, "notifikasi": 18322}[*peran]
	if dasar == 0 {
		log.Fatalf("-peran harus pembayaran atau notifikasi, bukan %q", *peran)
	}
	if *alamat == "" {
		*alamat = "127.0.0.1:" + portLab(dasar)
	}
	if *ledger == "" {
		log.Fatal("-ledger wajib")
	}
	tr := http.DefaultTransport.(*http.Transport).Clone()
	if *sert != "" || *ca != "" {
		caPEM, err := os.ReadFile(*ca)
		if err != nil {
			log.Fatal(err)
		}
		if tr.TLSClientConfig, err = identitas.KlienTLS(caPEM, *sert, *kunci, *namaServer); err != nil {
			log.Fatal(err)
		}
	}
	ctx, batal := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer batal()
	var tutupJejak func(context.Context) error
	if *otlp != "" {
		var err error
		if tutupJejak, err = jejak.Pasang(ctx, *peran, *otlp, *idUrut); err != nil {
			log.Fatal(err)
		}
	}
	c := klien.BaruDenganTransport(klien.BatasBawaan, otelhttp.NewTransport(tr, otelhttp.WithSpanNameFormatter(func(_ string, r *http.Request) string {
		return r.Method + " " + r.URL.Path
	})))

	mux := http.NewServeMux()
	mux.HandleFunc("POST /lab/ke-ledger", func(w http.ResponseWriter, r *http.Request) {
		var in permintaan
		if json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&in) != nil || in.Key == "" {
			jawab(w, http.StatusBadRequest, []byte(`{"galat":"body-tidak-sah"}`))
			return
		}
		var jalan string
		var badan any
		switch in.Jalur {
		case "topup":
			jalan, badan = "/ledger/jurnal-topup", map[string]any{"order_id": in.Key, "akun_id": in.AkunID, "jumlah": in.Jumlah}
		case "kartu-tahan":
			jalan, badan = "/ledger/kartu/tahan", map[string]any{"id_penerbit": in.Key, "akun_id": in.AkunID, "jumlah": in.Jumlah}
		default:
			jawab(w, http.StatusBadRequest, []byte(`{"galat":"jalur-tidak-dikenal"}`))
			return
		}
		b, _ := json.Marshal(badan)
		req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, *ledger+jalan, bytes.NewReader(b))
		if err != nil {
			jawab(w, http.StatusInternalServerError, []byte(`{"galat":"permintaan"}`))
			return
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Idempotency-Key", in.Key)
		res, err := c.Do(req)
		if err != nil {
			g, _ := json.Marshal(map[string]string{"galat": identitas.KelasGalat(err)})
			jawab(w, http.StatusBadGateway, g)
			return
		}
		defer res.Body.Close()
		isi, _ := io.ReadAll(io.LimitReader(res.Body, 4<<10))
		jawab(w, res.StatusCode, isi)
	})
	srv := &http.Server{Addr: *alamat, Handler: otelhttp.NewHandler(mux, *peran, otelhttp.WithSpanNameFormatter(func(_ string, r *http.Request) string {
		return r.Method + " " + r.URL.Path
	}))}
	log.Printf("%s mendengar di %s", *peran, *alamat)
	go func() {
		<-ctx.Done()
		cc, b := context.WithTimeout(context.Background(), 5*time.Second)
		defer b()
		srv.Shutdown(cc)
	}()
	if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
	if tutupJejak != nil {
		cc, b := context.WithTimeout(context.Background(), 5*time.Second)
		defer b()
		tutupJejak(cc)
	}
}

func jawab(w http.ResponseWriter, status int, isi []byte) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write(isi)
}
