// Gerbang tiruan untuk mitra POS (lab t5-waf, ADR 56): Coraza v3.8.1 dengan OWASP CRS v4.30.0, kuota per mitra di Redis,
// kunci API dan HMAC-SHA256 bertimestamp per mitra, dan Idempotency-Key wajib untuk permintaan yang mengubah data.
// Hanya melayani alamat lokal di mesin lab; tidak ada target lain.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type tokoPG struct{ pool *pgxpool.Pool }

func (t tokoPG) CariKunci(ctx context.Context, sidik string) (Mitra, bool, error) {
	var m Mitra
	err := t.pool.QueryRow(ctx, `SELECT id, nama, status, kuota_per_detik FROM mitra_pos WHERE kunci_hash = $1`, sidik).
		Scan(&m.ID, &m.Nama, &m.Status, &m.KuotaPerDetik)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Mitra{}, false, nil
		}
		return Mitra{}, false, err
	}
	return m, true, nil
}

func main() {
	addr := flag.String("addr", "127.0.0.1:18330", "alamat dengar (hanya lokal)")
	hulu := flag.String("hulu", "", "alamat api-t5, mis. http://127.0.0.1:18310")
	crs := flag.String("crs", "crs", "folder CRS (waf.conf, crs-setup.conf, rules/)")
	rahasiaBerkas := flag.String("rahasia-berkas", "", "berkas JSON {mitra_id: rahasia tanda tangan} (penyimpanan rahasia tiruan)")
	rahasiaHulu := flag.String("rahasia-hulu", "", "rahasia yang dibaca api-t5 dari gerbang (-pos-rahasia)")
	redisAlamat := flag.String("redis", "127.0.0.1:56379", "alamat Redis")
	awalan := flag.String("awalan", "t5waf:", "awalan key Redis")
	berjalan := flag.Int("berjalan", 20, "permintaan berjalan per mitra (Asumsi)")
	gagalMaks := flag.Int64("gagal-maks", 5, "kunci salah per alamat per jendela sebelum dijawab 429")
	toleransi := flag.Duration("toleransi", 5*time.Minute, "toleransi timestamp tanda tangan (Asumsi, sama dengan ADR 34)")
	maksBody := flag.Int64("maks-body", 65536, "batas ukuran body dalam byte (Asumsi)")
	rentan := flag.String("rentan", "", "mode rentan, dipisah koma: kuota-bersama, tanpa-idempoten-wajib, waf-deteksi")
	lab := flag.Bool("lab", false, "endpoint /lab/* dan kepala X-Lab-Waf-Aturan (hanya lab)")
	labTahan := flag.Duration("lab-tahan", 0, "hanya lab: jeda sesudah lolos kuota sebelum diteruskan")
	labJamBeku := flag.Bool("lab-jam-beku", false, "hanya lab: jam bucket dibekukan dan dimajukan lewat POST /lab/jam")
	flag.Parse()

	if host, _, err := net.SplitHostPort(*addr); err != nil || (host != "127.0.0.1" && host != "::1" && host != "localhost") {
		log.Fatalf("gerbang lab hanya mendengar di alamat lokal, dapat %q", *addr)
	}
	if *hulu == "" || *rahasiaBerkas == "" || *rahasiaHulu == "" {
		log.Fatal("-hulu, -rahasia-berkas, dan -rahasia-hulu wajib")
	}
	u, err := url.Parse(*hulu)
	if err != nil || u.Scheme != "http" || (u.Hostname() != "127.0.0.1" && u.Hostname() != "localhost") {
		log.Fatalf("-hulu harus alamat lokal: %q", *hulu)
	}
	modes := map[string]bool{}
	for _, m := range strings.Split(*rentan, ",") {
		if m = strings.TrimSpace(m); m != "" {
			switch m {
			case RentanKuotaBersama, RentanTanpaWajibKey, RentanWAFDeteksi:
				modes[m] = true
			default:
				log.Fatalf("mode rentan tidak dikenal: %s", m)
			}
		}
	}
	mesin := "On"
	if modes[RentanWAFDeteksi] {
		mesin = "DetectionOnly"
	}
	waf, err := BukaWAF(*crs, mesin)
	if err != nil {
		log.Fatal(err)
	}
	var rahasia map[int64]string
	b, err := os.ReadFile(*rahasiaBerkas)
	if err != nil {
		log.Fatal(err)
	}
	var mentah map[string]string
	if err := json.Unmarshal(b, &mentah); err != nil {
		log.Fatal(err)
	}
	rahasia = map[int64]string{}
	for k, v := range mentah {
		id, err := strconv.ParseInt(k, 10, 64)
		if err != nil {
			log.Fatalf("id mitra tidak sah: %q", k)
		}
		rahasia[id] = v
	}
	pool, err := pgxpool.New(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}
	batas := BuatPembatas(*redisAlamat, *awalan, *berjalan)
	var jam atomic.Int64
	if *labJamBeku {
		jam.Store(1_800_000_000_000)
		batas.Jam = jam.Load
	}
	g := &Gerbang{WAF: waf, Toko: tokoPG{pool}, Rahasia: rahasia, Batas: batas, Hulu: u, RahasiaHulu: *rahasiaHulu,
		Rentan: modes, Toleransi: *toleransi, MaksBody: *maksBody, GagalMaks: *gagalMaks, Lab: *lab, Tahan: *labTahan}
	g.Siap()
	if len(modes) > 0 {
		log.Printf("PERINGATAN: mode rentan menyala: %s", *rentan)
	}

	mux := http.NewServeMux()
	if *lab {
		mux.HandleFunc("POST /lab/jam", func(w http.ResponseWriter, r *http.Request) {
			var in struct {
				MajuMs int64 `json:"maju_ms"`
			}
			if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.MajuMs < 0 || !*labJamBeku {
				http.Error(w, "butuh -lab-jam-beku dan maju_ms >= 0", 400)
				return
			}
			jam.Add(in.MajuMs)
			w.WriteHeader(204)
		})
	}
	mux.Handle("/", g)
	srv := &http.Server{Addr: *addr, Handler: mux, ReadHeaderTimeout: 3 * time.Second, ReadTimeout: 3 * time.Second,
		WriteTimeout: 10 * time.Second, IdleTimeout: 30 * time.Second, MaxHeaderBytes: 16 << 10}
	ln, err := net.Listen("tcp", *addr)
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("mendengar di %s (WAF %s, hulu %s)", *addr, mesin, *hulu)
	go func() {
		s := make(chan os.Signal, 1)
		signal.Notify(s, syscall.SIGTERM, syscall.SIGINT)
		<-s
		ctx, batal := context.WithTimeout(context.Background(), 5*time.Second)
		defer batal()
		_ = srv.Shutdown(ctx)
	}()
	if err := srv.Serve(ln); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
