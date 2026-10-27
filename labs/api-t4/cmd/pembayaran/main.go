// Command pembayaran adalah service pembayaran yang dipisah dari monolith (ADR 37, lab t4-modul): webhook masuk dari
// gateway, top-up, dan job cek status. Ia terhubung ke database sebagai role pembayaran (hanya schema pembayaran) dan
// meminta jurnal ke ledger lewat API dengan Idempotency-Key = order_id.
package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"

	"lab/apit4/internal/gateway"
	"lab/apit4/internal/klien"
	"lab/apit4/internal/modul/ledger"
	"lab/apit4/internal/modul/pembayaran"
)

func main() {
	alamat := flag.String("addr", "127.0.0.1:"+portLab(18286), "alamat server")
	ledgerURL := flag.String("ledger-url", "http://127.0.0.1:"+portLab(18280), "alamat API ledger (monolith)")
	ledgerKunci := flag.String("ledger-kunci", "", "kunci layanan ke API ledger (X-Layanan-Kunci)")
	ledgerBatas := flag.Duration("ledger-timeout", klien.BatasBawaan, "batas waktu satu panggilan ke ledger (ADR 22, ADR 36)")
	gatewayURL := flag.String("gateway-url", "http://127.0.0.1:"+portLab(18283), "alamat gateway pembayaran (tiruan lokal)")
	gatewayBatas := flag.Duration("gateway-timeout", klien.BatasBawaan, "batas waktu satu panggilan ke gateway (ADR 22, ADR 36)")
	rahasia := flag.String("rahasia-webhook", "", "rahasia penanda tangan webhook, dipisah koma (yang pertama dipakai sekarang)")
	pool := flag.Int("pool", 5, "batas koneksi database (Asumsi naskah: 2 instance x 5)")
	cekTopup := flag.Bool("cek-topup", false, "job: tanyakan ke gateway semua top-up yang menunggu lebih dari -cek-umur, lalu keluar (ADR 35)")
	cekUmur := flag.Duration("cek-umur", 30*time.Minute, "job -cek-topup: umur minimal top-up yang ditanyakan (Asumsi: 30 menit)")
	lab := flag.Bool("lab", false, "lab saja: POST /lab/topup (akun tanpa autentikasi sesi; autentikasi ada di modul akun)")
	tahanSesudahLedger := flag.Bool("lab-tahan-sesudah-ledger", false, "lab saja: menahan proses sesudah ledger menjurnal dan sebelum transaction pembayaran sampai POST /lab/lepas, supaya jalur lain (job cek status) bisa datang ke ledger dengan key yang sama di antaranya; tanpa jeda waktu tetap")
	matiSesudahLedger := flag.Bool("lab-mati-sesudah-ledger", false, "lab saja: proses mengirim SIGKILL ke dirinya sendiri sesudah ledger menjurnal dan sebelum transaction pembayaran")
	flag.Parse()

	url := os.Getenv("DATABASE_URL")
	if url == "" {
		log.Fatal("DATABASE_URL kosong")
	}
	cfg, err := pgx.ParseConfig(url)
	if err != nil {
		log.Fatal(err)
	}
	db := stdlib.OpenDB(*cfg)
	db.SetMaxOpenConns(*pool)
	db.SetMaxIdleConns(*pool)
	defer db.Close()

	s := &pembayaran.Service{DB: db, Ledger: ledger.Baru(*ledgerURL, *ledgerKunci, *ledgerBatas),
		Gateway: gateway.Baru(*gatewayURL, *gatewayBatas)}
	for _, r := range strings.Split(*rahasia, ",") {
		if r = strings.TrimSpace(r); r != "" {
			s.Rahasia = append(s.Rahasia, r)
		}
	}
	if *matiSesudahLedger {
		s.TitikGagal = func(titik string) {
			if titik == "sesudah-ledger" {
				// Kematian sungguhan: tanpa defer, tanpa penutupan koneksi yang rapi, tanpa balasan ke gateway.
				syscall.Kill(os.Getpid(), syscall.SIGKILL)
				select {} // menunggu sinyal sampai
			}
		}
	}
	gerbang := make(chan struct{})
	var lepas sync.Once
	if *tahanSesudahLedger {
		s.TitikGagal = func(titik string) {
			if titik == "sesudah-ledger" {
				select {
				case <-gerbang:
				case <-time.After(time.Minute): // pengaman: lab yang lupa melepas tidak menggantung selamanya
				}
			}
		}
	}
	if *cekTopup {
		r, err := s.CekBelumSelesai(context.Background(), *cekUmur)
		fmt.Printf("cek top-up: diperiksa %d, dikredit %d, selesai %d, tertunda %d, galat %d\n", r.Diperiksa, r.Dikredit, r.Selesai, r.Tertunda, r.Galat)
		if err != nil {
			log.Fatal(err)
		}
		return
	}

	mux := http.NewServeMux()
	mux.HandleFunc("POST /webhooks/pembayaran", func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 64<<10))
		if err != nil {
			http.Error(w, "body terlalu besar", http.StatusRequestEntityTooLarge)
			return
		}
		h, err := s.TerimaWebhook(r.Context(), body, r.Header.Get("X-Gateway-Timestamp"), r.Header.Get("X-Gateway-Signature"))
		switch {
		case errors.Is(err, pembayaran.ErrTandaTangan):
			jawab(w, http.StatusUnauthorized, map[string]any{"hasil": "ditolak", "alasan": "tanda-tangan"})
		case errors.Is(err, pembayaran.ErrKabar):
			jawab(w, http.StatusBadRequest, map[string]any{"hasil": "ditolak", "alasan": "kabar-tidak-sah"})
		case err != nil:
			// Hasil tidak diketahui (ledger tidak menjawab, database gagal): bukan 2xx, jadi gateway mengulang.
			log.Printf("webhook: %v", err)
			jawab(w, http.StatusServiceUnavailable, map[string]any{"hasil": "gagal"})
		default:
			jawab(w, http.StatusOK, h)
		}
	})
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		ctx, batal := context.WithTimeout(r.Context(), time.Second)
		defer batal()
		if err := db.PingContext(ctx); err != nil {
			http.Error(w, "database tidak menjawab", http.StatusServiceUnavailable)
			return
		}
		jawab(w, http.StatusOK, map[string]any{"status": "ok"})
	})
	if *lab {
		mux.HandleFunc("POST /lab/topup", func(w http.ResponseWriter, r *http.Request) {
			var in struct {
				AkunID  int64  `json:"akun_id"`
				Jumlah  int64  `json:"jumlah"`
				OrderID string `json:"order_id"`
			}
			if json.NewDecoder(r.Body).Decode(&in) != nil || in.AkunID <= 0 || in.Jumlah <= 0 {
				http.Error(w, "body harus {akun_id, jumlah}", http.StatusBadRequest)
				return
			}
			if in.OrderID == "" {
				b := make([]byte, 8)
				rand.Read(b)
				in.OrderID = "TB-" + hex.EncodeToString(b)
			}
			t, err := s.BuatTopup(r.Context(), in.OrderID, in.AkunID, in.Jumlah)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			jawab(w, http.StatusCreated, map[string]any{"order_id": t.OrderID, "status": t.Status, "jumlah": t.Jumlah})
		})
		mux.HandleFunc("POST /lab/lepas", func(w http.ResponseWriter, r *http.Request) {
			lepas.Do(func() { close(gerbang) })
			w.WriteHeader(http.StatusNoContent)
		})
		mux.HandleFunc("GET /lab/topup/{order}", func(w http.ResponseWriter, r *http.Request) {
			t, err := s.Topup(r.Context(), r.PathValue("order"))
			if err != nil {
				http.NotFound(w, r)
				return
			}
			jawab(w, http.StatusOK, map[string]any{"order_id": t.OrderID, "status": t.Status, "jumlah": t.Jumlah, "jurnal_id": t.JurnalID})
		})
	}
	log.Printf("pembayaran mendengar di %s", *alamat)
	srv := &http.Server{Addr: *alamat, Handler: mux}
	henti := make(chan os.Signal, 1)
	signal.Notify(henti, syscall.SIGTERM, syscall.SIGINT)
	selesai := make(chan struct{})
	go func() {
		defer close(selesai)
		<-henti
		ctx, batal := context.WithTimeout(context.Background(), 10*time.Second)
		defer batal()
		srv.Shutdown(ctx)
	}()
	if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
	<-selesai
	log.Print("pembayaran berhenti")
}

func jawab(w http.ResponseWriter, status int, isi any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(isi)
}
