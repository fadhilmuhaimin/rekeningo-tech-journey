// Service ledger sebagai proses sendiri (lab t5-service, M47 dan ADR 53). Ia menjalankan dua rute ledger yang sudah
// ada di api-t5 (POST /ledger/jurnal-topup untuk jurnal topup_bank dan POST /ledger/kartu/tahan untuk kartu_tahan) dengan
// role database t5_ledger, bukan role t5_app milik proses api-t5.
//
// Versi benar: HTTPS dengan mTLS (RequireAndVerifyClientCert), identitas pemanggil dari SAN sertifikat, dan daftar jenis
// jurnal per identitas. Mode rentan `ledger-tanpa-identitas` (M47, versi pertama): HTTP biasa, tanpa sertifikat, tanpa
// identitas, tanpa daftar jenis jurnal; siapa pun yang bisa menjangkau port ini membuat jurnal dengan Idempotency-Key baru.
package main

import (
	"context"
	"database/sql"
	"errors"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"

	"lab/apit5/internal/handler"
	"lab/apit5/internal/identitas"
	"lab/apit5/internal/jejak"
	"lab/apit5/internal/repo"
	"lab/apit5/internal/service"
)

// rentanTanpaIdentitas: nama mode rentan M47.
const rentanTanpaIdentitas = "ledger-tanpa-identitas"

// Jenis jurnal yang ditulis tiap rute. run.py dan tes memeriksanya terhadap kolom jurnal.jenis di database.
const (
	JenisTopup = "topup_bank"
	JenisTahan = "kartu_tahan"
)

func main() {
	alamat := flag.String("addr", "127.0.0.1:"+portLab(18320), "alamat server")
	sert := flag.String("tls-cert", "", "berkas PEM sertifikat server")
	kunci := flag.String("tls-key", "", "berkas PEM kunci privat server")
	ca := flag.String("tls-ca", "", "berkas PEM CA penerbit sertifikat klien")
	domain := flag.String("domain", identitas.DomainBawaan, "domain SAN identitas service (<nama>.<domain>)")
	rentan := flag.String("rentan", "", "mode rentan: "+rentanTanpaIdentitas+" (M47)")
	otlp := flag.String("otlp", "", "alamat OTLP/HTTP Collector (host:port, tanpa TLS); kosong = tanpa trace")
	idUrut := flag.Bool("lab-id-urut", false, "lab saja: ID trace berurutan (supaya hasil sampling bisa diulang tepat)")
	pool := flag.Int("pool", 5, "batas koneksi database")
	lab := flag.Bool("lab", false, "lab saja: satu baris log per keputusan identitas dan per panggilan")
	flag.Parse()
	if *rentan != "" && *rentan != rentanTanpaIdentitas {
		log.Fatalf("mode rentan tidak dikenal: %s", *rentan)
	}
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		log.Fatal("DATABASE_URL kosong")
	}
	db, err := bukaDB(url, *pool)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	svc := service.Baru(repo.Baru(db), 8*time.Hour)

	ctx, batal := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer batal()
	var tutupJejak func(context.Context) error
	if *otlp != "" {
		if tutupJejak, err = jejak.Pasang(ctx, "ledger", *otlp, *idUrut); err != nil {
			log.Fatal(err)
		}
	}

	var catat func(string)
	if *lab {
		catat = func(s string) { log.Print(s) }
	}
	srv := &http.Server{Addr: *alamat}
	mux := rute(svc, *rentan == rentanTanpaIdentitas, identitas.IzinNaskah, *domain, *lab, catat, db.PingContext)
	if *rentan == rentanTanpaIdentitas {
		log.Printf("PERINGATAN: mode rentan %s menyala: tanpa TLS, tanpa identitas, tanpa daftar jenis jurnal", *rentan)
	} else {
		if *sert == "" || *kunci == "" || *ca == "" {
			log.Fatal("-tls-cert, -tls-key, dan -tls-ca wajib (kecuali mode rentan " + rentanTanpaIdentitas + ")")
		}
		caPEM, err := os.ReadFile(*ca)
		if err != nil {
			log.Fatal(err)
		}
		if srv.TLSConfig, err = identitas.ServerTLS(caPEM, *sert, *kunci); err != nil {
			log.Fatal(err)
		}
	}
	srv.Handler = mux
	if *otlp != "" {
		srv.Handler = otelhttp.NewHandler(mux, "ledger", otelhttp.WithSpanNameFormatter(func(_ string, r *http.Request) string {
			return r.Method + " " + r.URL.Path
		}))
	}
	log.Printf("ledger mendengar di %s (mTLS %t)", *alamat, *rentan == "")
	go func() {
		<-ctx.Done()
		c, b := context.WithTimeout(context.Background(), 5*time.Second)
		defer b()
		srv.Shutdown(c)
	}()
	if *rentan == rentanTanpaIdentitas {
		err = srv.ListenAndServe()
	} else {
		err = srv.ListenAndServeTLS("", "")
	}
	if !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
	if tutupJejak != nil {
		c, b := context.WithTimeout(context.Background(), 5*time.Second)
		defer b()
		tutupJejak(c)
	}
}

func bukaDB(url string, pool int) (*sql.DB, error) {
	cfg, err := pgx.ParseConfig(url)
	if err != nil {
		return nil, err
	}
	db := stdlib.OpenDB(*cfg)
	db.SetMaxOpenConns(pool)
	db.SetMaxIdleConns(pool)
	return db, nil
}

// rute memasang rute ledger. Versi benar: tiap rute dibungkus identitas.Wajib dengan jenis jurnal yang ditulisnya.
// Mode rentan (rentan=true): rute yang sama tanpa pembungkus, jadi siapa pun yang sampai ke port ini membuat jurnal.
func rute(svc service.Service, rentan bool, izin identitas.Izin, domain string, lab bool, catat func(string), ping func(context.Context) error) *http.ServeMux {
	topup, tahan := handler.JurnalTopup(svc, lab), handler.TahanKartu(svc, lab)
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		c, b := context.WithTimeout(r.Context(), time.Second)
		defer b()
		if ping(c) != nil {
			http.Error(w, "database tidak menjawab", http.StatusServiceUnavailable)
			return
		}
		fmt.Fprint(w, `{"status":"ok"}`)
	})
	if rentan {
		mux.HandleFunc("POST /ledger/jurnal-topup", topup)
		mux.HandleFunc("POST /ledger/kartu/tahan", tahan)
		return mux
	}
	// --8<-- [start:rute-identitas]
	mux.Handle("POST /ledger/jurnal-topup", identitas.Wajib(izin, domain, JenisTopup, topup, catat))
	mux.Handle("POST /ledger/kartu/tahan", identitas.Wajib(izin, domain, JenisTahan, tahan, catat))
	// --8<-- [end:rute-identitas]
	return mux
}
