// Lab API Tahap 4 · Rekeningo (fiktif), mengikuti plan/CERITA-TAHAP-4.md (lab-api-t4).
// api-t3 yang naik ke publik (top-up dari bank, verifikasi identitas, QR, kartu, back office). Di bawahnya api-t3: api-t2 yang naik ke enam kota: monolith yang sama, tiga lapisan (internal/handler, internal/service,
// internal/repo), satu PostgreSQL. Yang baru: pemberitahuan lewat outbox (ADR 23) dan worker di proses sendiri,
// katalog dan stok per kota, promo dari HR, sinkron offline, dasbor web. Satu binary, dua peran: `-peran api`
// melayani HTTP, `-peran worker` mengirim isi outbox ke layanan push (di lab: tiruan lokal cmd/pushpalsu).
package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"

	"lab/apit4/internal/cache"
	"lab/apit4/internal/gateway"
	"lab/apit4/internal/handler"
	"lab/apit4/internal/klien"
	"lab/apit4/internal/penerbit"
	"lab/apit4/internal/push"
	"lab/apit4/internal/redisbatas"
	"lab/apit4/internal/repo"
	"lab/apit4/internal/service"
	"lab/apit4/internal/verifikasi"
	"lab/apit4/internal/worker"
)

// rentanTanpaShutdown: deploy bergulir tanpa graceful shutdown (M21, deploy mematikan app).
const rentanTanpaShutdown = "tanpa-shutdown"

func main() {
	alamat := flag.String("addr", "127.0.0.1:"+portLab(18280), "alamat server")
	umurSesi := flag.Duration("umur-sesi", 8*time.Hour, "masa berlaku sesi (asumsi: satu hari kerja)")
	seed := flag.Bool("seed", false, "isi data awal Tahap 3 (enam kota, 10.000 karyawan, 60 warung; data lab) sebagai pemilik schema, lalu keluar")
	cekCache := flag.Bool("cek-cache", false, "bandingkan saldo_cache setiap buku dengan jumlah posting (job malam), lalu keluar")
	bersih := flag.Bool("bersih", false, "buang outbox selesai lebih dari 7 hari dan operasi sinkron lebih dari 14 hari, lalu keluar")
	peran := flag.String("peran", "api", "api atau worker")
	sekali := flag.Bool("sekali", false, "worker: kirim semua yang siap, lalu keluar")
	satuPutaran := flag.Bool("satu-putaran", false, "lab saja, dengan -sekali: hanya satu putaran (paling banyak -serentak baris), supaya jumlah percobaan per panggilan tetap")
	pool := flag.Int("pool", 10, "batas koneksi database per proses (database/sql tanpa batas bila tidak diatur; ADR 22)")
	pushURL := flag.String("push-url", "http://127.0.0.1:"+portLab(18281), "alamat layanan push (tiruan lokal)")
	pushBatas := flag.Duration("push-timeout", push.BatasBawaan, "batas waktu satu panggilan push (ADR 22); 0 = tanpa batas")
	idleTx := flag.Duration("idle-tx", 5*time.Second, "idle_in_transaction_session_timeout (ADR 22); 0 = mati")
	rentan := flag.String("rentan", "", "mode rentan: push-dalam-tx (M18), kursor (M19), ekspor-panic dan tanpa-shutdown (M21), stok-timpa (M24), urut-waktu (M27)")
	instance := flag.String("instance", "", "nama instance; dikirim di header X-Instance supaya lab bisa melihat instance mana yang menjawab")
	redisAlamat := flag.String("redis", "", "alamat Redis untuk batas login bersama antar instance (ADR 27); kosong = token bucket di memori proses (ADR 20)")
	redisBatas := flag.Duration("redis-timeout", 50*time.Millisecond, "batas waktu satu pemeriksaan ke Redis (ADR 27); 0 = bawaan go-redis (5 detik, 3 retry), hanya untuk rekaman perbandingan")
	klaim := flag.Duration("klaim", worker.Bawaan().Klaim, "worker: lama satu baris dipegang (ADR 24)")
	serentak := flag.Int("serentak", worker.Bawaan().Serentak, "worker: pengirim serentak (c)")
	selang := flag.Duration("selang", worker.Bawaan().Selang, "worker: jeda polling bila antrean kosong")
	maksPercobaan := flag.Int("maks-percobaan", worker.Bawaan().MaksPercobaan, "worker: sesudah ini baris masuk dead-letter (ADR 25)")
	dasarBackoff := flag.Duration("backoff", worker.Bawaan().DasarBackoff, "worker: dasar backoff sesudah percobaan pertama")
	henti := flag.Bool("lab-henti-sebelum-tandai", false, "lab saja: worker berhenti mendadak sesudah push berhasil, sebelum ditandai terkirim (M20)")
	lab := flag.Bool("lab", false, "lab saja: GET /lab/pool dan GET /lab/outbox")
	jamLab := flag.Bool("jam-lab", false, "lab saja: POST /lab/jam {\"ms\": ...} membekukan waktu service dan rate limit")
	katalogCache := flag.String("katalog-cache", "", "cache katalog: kosong (tanpa cache), memori, atau redis (lab t3-cache, ADR 28)")
	katalogTTL := flag.Duration("katalog-ttl", 0, "TTL entri katalog; 0 = bawaan mode (memori 5 menit, redis 60 detik)")
	katalogHapus := flag.String("katalog-hapus", cache.HapusSesudah, "urutan hapus kunci: sesudah (benar), sebelum COMMIT, atau selalu (juga saat tulis gagal); dua yang terakhir rentan")
	katalogRedis := flag.String("katalog-redis", "", "alamat Redis untuk -katalog-cache redis (tiruan lokal di container); terpisah dari -redis milik batas login")
	katalogRedisBatas := flag.Duration("katalog-redis-timeout", 50*time.Millisecond, "batas waktu Redis untuk cache katalog: dial, tulis, baca, dan antre di pool, masing-masing; go-redis tanpa retry")
	labGerbang := flag.String("lab-gerbang", "", "lab saja: gerbang yang menahan goroutine sampai POST /lab/gerbang/lepas, dipisah koma: commit, isi")
	// Tahap 4 (lab-api-t4): pihak ketiga tiruan, setelan lab, dan job sekali jalan.
	gatewayURL := flag.String("gateway-url", "http://127.0.0.1:"+portLab(18283), "alamat gateway pembayaran (tiruan lokal)")
	gatewayBatas := flag.Duration("gateway-timeout", klien.BatasBawaan, "batas waktu satu panggilan ke gateway (ADR 22, ADR 36)")
	verifikasiURL := flag.String("verifikasi-url", "http://127.0.0.1:"+portLab(18284), "alamat layanan verifikasi identitas (tiruan lokal)")
	verifikasiBatas := flag.Duration("verifikasi-timeout", klien.BatasBawaan, "batas waktu satu panggilan ke layanan verifikasi (ADR 36)")
	penerbitURL := flag.String("penerbit-url", "http://127.0.0.1:"+portLab(18285), "alamat penerbit kartu (tiruan lokal)")
	penerbitKunci := flag.String("penerbit-kunci", "", "rahasia bersama penerbit di header X-Penerbit-Kunci; kosong = /penerbit/* ditolak")
	kartuLockTimeout := flag.Duration("kartu-lock-timeout", 0, "lock_timeout otorisasi kartu di ledger (ADR 42); 0 = 1 detik")
	objekDir := flag.String("objek-dir", "", "direktori penyimpanan objek tiruan untuk file identitas; kosong = folder sementara api-t4-objek")
	rahasiaWebhook := flag.String("rahasia-webhook", "", "rahasia penanda tangan webhook gateway, dipisah koma: yang pertama dipakai sekarang, berikutnya masa tumpang tindih rotasi (ADR 35); kosong = semua webhook ditolak")
	jedaCekTulis := flag.Duration("lab-jeda-cek-tulis", 0, "lab saja: jeda di antara cek dan tulis pada webhook-cek-tulis dan kartu-tanpa-hold")
	tanpaLapis := flag.String("lab-tanpa-lapis", "", "lab saja: lapisan webhook ADR 34 yang dimatikan, dipisah koma: status, kunci")
	cekTopup := flag.Bool("cek-topup", false, "job: tanyakan ke gateway semua top-up yang menunggu lebih dari -cek-umur, lalu keluar (ADR 35)")
	cekUmur := flag.Duration("cek-umur", service.UmurCekStatus, "job -cek-topup: umur minimal top-up yang ditanyakan")
	rekon := flag.String("rekon", "", "job: rekonsiliasi laporan settlement gateway tanggal YYYY-MM-DD dengan ledger, catat insiden, lalu keluar (ADR 35)")
	koreksiRekon := flag.Bool("koreksi-rekon", false, "job: tutup insiden rekonsiliasi yang terbuka lewat jurnal normal (jurnal top-up atau pembalik), lalu keluar (ADR 35, ADR 19)")
	kedaluwarsaHold := flag.Bool("kedaluwarsa-hold", false, "job: balik dana kartu yang tertahan lewat tahan_sampai, lalu keluar (ADR 42)")
	tujuan := flag.String("tujuan", "", "worker: lajur yang diklaim, dipisah koma (push, verifikasi); kosong = semua lajur")
	breaker := flag.Bool("breaker", false, "worker: breaker per vendor di lajur verifikasi (ADR 36): lajur yang breakernya terbuka tidak diklaim; mati = ADR 25 apa adanya")
	breakerTimeout := flag.Duration("breaker-timeout", 0, "worker, dengan -breaker: lama breaker terbuka sebelum setengah terbuka; 0 = bawaan sony/gobreaker v2.4.0 (60 detik)")
	breakerBawaan := flag.Bool("breaker-bawaan", false, "lab saja, dengan -breaker: IsSuccessful bawaan pustaka (jawaban 4xx vendor dihitung gagal); bawaan lab: 4xx dihitung sukses (ADR 36)")
	objekS3 := flag.String("objek-s3", "", "endpoint penyimpanan objek S3 lokal untuk file identitas (lab t4-storage); kunci akses dan rahasia dari OBJEK_S3_KUNCI dan OBJEK_S3_RAHASIA; kosong = -objek-dir")
	objekBucket := flag.String("objek-bucket", "identitas", "bucket penyimpanan objek (-objek-s3)")
	objekPresign := flag.Duration("objek-presign-umur", 0, "umur URL PUT bertanda tangan untuk unggah file identitas (ADR 38); 0 = 5 menit (Asumsi); lab saja untuk umur pendek")
	retensi := flag.Bool("retensi-identitas", false, "job: hapus file identitas yang masa simpannya (hapus_pada) sudah sampai, lalu keluar (ADR 38)")
	labSekarang := flag.String("lab-sekarang", "", "lab saja, dengan -retensi-identitas: waktu service RFC 3339 (waktu maya)")
	unduhHTTP := flag.Bool("unduh-izinkan-http", false, "lab saja: fetcher gambar versi aman menerima skema http (tiruan lokal tidak punya TLS); produksi hanya https (ADR 41)")
	flag.Parse()

	// Mode rentan push-dalam-tx adalah versi pertama minggu 1: client tanpa batas waktu dan tanpa pengaman
	// idle-in-transaction. Flag yang diisi eksplisit tetap menang, supaya varian "timeout tetapi tetap di dalam
	// transaction" bisa direkam.
	diisi := map[string]bool{}
	flag.Visit(func(f *flag.Flag) { diisi[f.Name] = true })
	if *rentan == service.RentanPushDalamTx {
		if !diisi["push-timeout"] {
			*pushBatas = 0
		}
		if !diisi["idle-tx"] {
			*idleTx = 0
		}
	}
	switch *rentan {
	case "", service.RentanPushDalamTx, service.RentanEksporPanic, service.RentanStokTimpa, rentanTanpaShutdown, "kursor", "urut-waktu",
		service.RentanWebhookV1, service.RentanWebhookCekTulis, service.RentanKartuTanpaHold, service.RentanUnduhRentan, service.RentanTanpaAudit,
		service.RentanVerifikasiTanpaKey, service.RentanBerkasBytea:
	default:
		log.Fatalf("mode rentan tidak dikenal: %s", *rentan)
	}
	if *peran != "api" && *peran != "worker" {
		log.Fatalf("peran harus api atau worker, bukan %q", *peran)
	}
	if *pool < 1 {
		log.Fatal("pool minimal 1")
	}

	url := os.Getenv("DATABASE_URL")
	if url == "" {
		log.Fatal("DATABASE_URL kosong")
	}
	db, err := bukaDB(url, *pool, *idleTx, *peran)
	if err != nil {
		log.Fatal(err)
	}
	r := repo.Baru(db)
	switch {
	case *seed:
		if err := isiAwal(context.Background(), db); err != nil {
			log.Fatal(err)
		}
		return
	case *cekCache:
		os.Exit(jalankanCekCache(r))
	case *bersih:
		os.Exit(jalankanBersih(r))
	}
	dep := service.Dep{Gateway: gateway.Baru(*gatewayURL, *gatewayBatas), Vendor: verifikasi.Baru(*verifikasiURL, *verifikasiBatas),
		Penerbit: penerbit.Baru(*penerbitURL, klien.BatasBawaan), KunciPenerbit: *penerbitKunci, JedaCekTulis: *jedaCekTulis,
		LockTimeoutKartu: *kartuLockTimeout, KartuAktif: &atomic.Bool{}, TanpaLapis: map[string]bool{}}
	dep.KartuAktif.Store(true)
	if *objekDir == "" {
		*objekDir = os.TempDir() + "/api-t4-objek"
	}
	dep.Objek = bukaObjek(context.Background(), db, pilihanObjek{Dir: *objekDir, S3: *objekS3, Bucket: *objekBucket,
		MaksBaca: 4 * service.MaksBerkasIdentitas, Bytea: *rentan == service.RentanBerkasBytea})
	dep.UmurPresign = *objekPresign
	for _, s := range strings.Split(*rahasiaWebhook, ",") {
		if s = strings.TrimSpace(s); s != "" {
			dep.RahasiaWebhook = append(dep.RahasiaWebhook, s)
		}
	}
	for _, s := range strings.Split(*tanpaLapis, ",") {
		if s = strings.TrimSpace(s); s != "" {
			if s != "status" && s != "kunci" {
				log.Fatalf("-lab-tanpa-lapis: %q tidak dikenal (status, kunci)", s)
			}
			dep.TanpaLapis[s] = true
		}
	}
	if *retensi {
		os.Exit(jalankanRetensi(r, *umurSesi, dep, *labSekarang))
	}
	if *cekTopup || *rekon != "" || *kedaluwarsaHold || *koreksiRekon {
		os.Exit(jalankanJobT4(r, *umurSesi, dep, *rentan, *cekTopup, *cekUmur, *rekon, *kedaluwarsaHold, *koreksiRekon))
	}
	if *rentan != "" {
		log.Printf("PERINGATAN: mode rentan %s menyala", *rentan)
	}
	if *peran == "worker" {
		var lajurWorker []string
		for _, s := range strings.Split(*tujuan, ",") {
			if s = strings.TrimSpace(s); s != "" {
				lajurWorker = append(lajurWorker, s)
			}
		}
		jalankanWorker(r, db, *pushURL, *pushBatas, *sekali, *satuPutaran, *rentan, dep.Vendor, worker.Konfigurasi{
			Serentak: *serentak, Klaim: *klaim, Selang: *selang, MaksPercobaan: *maksPercobaan, DasarBackoff: *dasarBackoff,
			MaksBackoff: worker.Bawaan().MaksBackoff, UrutKelas: *rentan != "urut-waktu", Kursor: *rentan == "kursor",
			HentiSebelumTandai: *henti, Tujuan: lajurWorker, Breaker: breakerLajur(*breaker, *breakerTimeout, *breakerBawaan),
			KunciBaruTiapPercobaan: *rentan == service.RentanVerifikasiTanpaKey})
		return
	}

	svc := service.Baru(r, *umurSesi).DenganT4(dep).DenganUnduhHTTP(*unduhHTTP)
	var jamMS atomic.Int64 // 0 = waktu sungguhan
	jam := func() time.Time {
		if ms := jamMS.Load(); ms != 0 {
			return time.UnixMilli(ms)
		}
		return time.Now()
	}
	if *labGerbang != "" && *katalogCache == "" {
		log.Fatal("-lab-gerbang butuh -katalog-cache")
	}
	var kc *cache.Katalog
	if *katalogCache != "" {
		var err error
		if kc, err = bukaCacheKatalog(*katalogCache, *katalogTTL, *katalogHapus, *katalogRedis, *katalogRedisBatas, *labGerbang, *lab, jam); err != nil {
			log.Fatal(err)
		}
		svc = svc.DenganCache(kc)
		log.Printf("cache katalog: %s, TTL %s, hapus kunci %s", kc.Nama, kc.TTL, kc.Urut)
	}
	switch *rentan {
	case service.RentanPushDalamTx:
		svc = svc.DenganRentan(*rentan, push.Baru(*pushURL, *pushBatas))
	case service.RentanEksporPanic, service.RentanWebhookV1, service.RentanWebhookCekTulis, service.RentanKartuTanpaHold,
		service.RentanUnduhRentan, service.RentanTanpaAudit:
		svc = svc.DenganMode(*rentan)
	}
	// Batas login bersama (ADR 27): hitungan di Redis, jatuh ke bucket lokal bila Redis gagal atau lewat batas waktu.
	var batasIP, batasAkun *service.PembatasBersama
	if *redisAlamat != "" {
		k := redisbatas.Baru(*redisAlamat, *redisBatas)
		defer k.Tutup()
		batasIP = service.PembatasBersamaBaru(k, "rekeningo:rl:login:ip:", int(service.AmbangLoginIP[0]), service.JendelaLogin,
			*redisBatas, service.PembatasBaru(service.AmbangLoginIP[0], service.AmbangLoginIP[1]))
		batasAkun = service.PembatasBersamaBaru(k, "rekeningo:rl:login:akun:", int(service.AmbangLoginAkun[0]), service.JendelaLogin,
			*redisBatas, service.PembatasBaru(service.AmbangLoginAkun[0], service.AmbangLoginAkun[1]))
		svc = svc.DenganBatasLoginAkun(batasAkun)
	}
	if *jamLab {
		svc = svc.DenganJam(jam)
	}
	srvHandler := handler.Baru(svc).DenganRentan(*rentan)
	if batasIP != nil {
		srvHandler = srvHandler.DenganBatasLoginIP(batasIP)
	}
	rute := srvHandler.Rute()
	// Health check untuk proxy (ADR 26): 200 hanya bila database menjawab dalam 1 detik. Proses yang hidup tetapi
	// tidak bisa memakai database tidak boleh menerima request.
	rute.HandleFunc("GET /healthz", func(w http.ResponseWriter, req *http.Request) {
		ctx, batal := context.WithTimeout(req.Context(), time.Second)
		defer batal()
		if err := db.PingContext(ctx); err != nil {
			http.Error(w, "database tidak menjawab", http.StatusServiceUnavailable)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"status":"ok"}`)
	})
	if *jamLab {
		// Jam tiruan (pola labs/c4-ratelimit, keputusan 549): bucket tidak terisi di tengah rekaman, jadi status
		// dan Retry-After sama di setiap run. Hanya dengan flag; server biasa tidak punya endpoint ini.
		rute.HandleFunc("POST /lab/jam", func(w http.ResponseWriter, r *http.Request) {
			var in struct {
				Ms int64 `json:"ms"`
			}
			if json.NewDecoder(r.Body).Decode(&in) != nil {
				w.WriteHeader(http.StatusBadRequest)
				return
			}
			jamMS.Store(in.Ms)
			w.WriteHeader(http.StatusNoContent)
		})
	}
	if *lab {
		pasangEndpointLab(rute, db, r)
		pasangEndpointCache(rute, kc)
		pasangEndpointLabInstance(rute, db, svc, batasIP, batasAkun)
	}
	log.Printf("api-t4 mendengar di %s", *alamat)
	log.Printf("api-t4 siap: pool %d, push timeout %s, idle-tx %s", *pool, *pushBatas, *idleTx)
	var h http.Handler = rute
	if *instance != "" {
		nama := *instance
		h = http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			w.Header().Set("X-Instance", nama)
			rute.ServeHTTP(w, req)
		})
	}
	srv := &http.Server{Addr: *alamat, Handler: h}
	// Graceful shutdown (ADR 26): SIGTERM menutup listener dan menunggu request yang sedang jalan selesai. Mode
	// tanpa-shutdown (rekaman deploy bergulir) tidak memasangnya: tanpa signal.Notify, SIGTERM mengakhiri proses
	// seketika dan request yang sedang jalan putus.
	var shutdownSelesai chan struct{}
	if *rentan != rentanTanpaShutdown {
		shutdownSelesai = make(chan struct{})
		henti2 := make(chan os.Signal, 1)
		signal.Notify(henti2, syscall.SIGTERM, syscall.SIGINT)
		go func() {
			defer close(shutdownSelesai)
			<-henti2
			ctx, batal := context.WithTimeout(context.Background(), 10*time.Second)
			defer batal()
			if err := srv.Shutdown(ctx); err != nil {
				log.Printf("shutdown: %v", err)
			}
		}()
	}
	if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
	// ListenAndServe kembali SEGERA setelah Shutdown dimulai, bukan setelah selesai. Keluar dari main di sini akan
	// memutus request yang sedang jalan; dokumentasi http.Server.Shutdown: "Make sure the program doesn't exit and
	// waits instead for Shutdown to return."
	if shutdownSelesai != nil {
		<-shutdownSelesai
	}
	log.Print("api-t4 berhenti")
}

// --8<-- [start:buka-db]
// bukaDB membuka pool dengan batas yang ditulis di sini, bukan bawaan: database/sql tanpa SetMaxOpenConns membuka
// koneksi sebanyak yang diminta (api-t2 begitu), dan lawan batas 100 koneksi PostgreSQL dua instance dan worker
// harus muat (30 dari 100, naskah bagian 3). SetMaxIdleConns sama dengan batas: koneksi tidak dibuka dan ditutup
// terus saat beban naik turun. idle_in_transaction_session_timeout dikirim sebagai parameter koneksi: PostgreSQL
// memutus koneksi yang diam di dalam transaction lebih lama dari itu (ADR 22).
func bukaDB(url string, pool int, idleTx time.Duration, peran string) (*sql.DB, error) {
	cfg, err := pgx.ParseConfig(url)
	if err != nil {
		return nil, err
	}
	if cfg.RuntimeParams == nil {
		cfg.RuntimeParams = map[string]string{}
	}
	if idleTx > 0 {
		cfg.RuntimeParams["idle_in_transaction_session_timeout"] = strconv.FormatInt(idleTx.Milliseconds(), 10)
	}
	if peran == "worker" {
		cfg.RuntimeParams["application_name"] += "-worker"
	}
	db := stdlib.OpenDB(*cfg)
	db.SetMaxOpenConns(pool)
	db.SetMaxIdleConns(pool)
	return db, nil
}

// --8<-- [end:buka-db]

func jalankanWorker(r repo.Repo, db *sql.DB, pushURL string, batas time.Duration, sekali, satuPutaran bool, rentan string, vendor *verifikasi.Klien, cfg worker.Konfigurasi) {
	w := worker.Baru(r, push.Baru(pushURL, batas), cfg).DenganVerifikasi(vendor)
	log.Printf("worker mulai (serentak %d, klaim %s, push timeout %s, kelas %t, kursor %t)", cfg.Serentak, cfg.Klaim, batas,
		cfg.UrutKelas, cfg.Kursor)
	ctx, batal := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer batal()
	if sekali {
		kerja := w.Kuras
		if satuPutaran {
			kerja = w.Putaran
		}
		hasil, err := kerja(ctx)
		if err != nil {
			log.Fatal(err)
		}
		fmt.Println("worker: " + hasil.String())
		return
	}
	_ = rentan
	_ = db
	if err := w.Jalankan(ctx); err != nil {
		log.Fatal(err)
	}
	log.Print("worker berhenti")
}

// pasangEndpointLab: dua endpoint baca untuk rekaman. /lab/pool memperlihatkan batas pool dan koneksi yang terpakai
// (database/sql DBStats); /lab/outbox jumlah baris per status dan umur baris tertua yang masih menunggu.
func pasangEndpointLab(rute *http.ServeMux, db *sql.DB, r repo.Repo) {
	rute.HandleFunc("GET /lab/pool", func(w http.ResponseWriter, req *http.Request) {
		st := db.Stats()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]int{"maks": st.MaxOpenConnections, "terbuka": st.OpenConnections,
			"dipakai": st.InUse, "menganggur": st.Idle, "menunggu": int(st.WaitCount)})
	})
	rute.HandleFunc("GET /lab/outbox", func(w http.ResponseWriter, req *http.Request) {
		per, tertua, err := r.RingkasOutbox(req.Context())
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{"per_status": per, "tertua_detik": int(tertua)})
	})
}

// pasangEndpointLabInstance: endpoint lab untuk rekaman t3-instance. /lab/lambat menahan satu koneksi database selama
// ms milidetik (satu request yang sedang jalan saat deploy); /lab/panik memicu panic di goroutine handler atau di
// goroutine latar (M21); /lab/batas menunjukkan berapa pemeriksaan rate limit dijawab Redis dan berapa jatuh ke
// bucket lokal.
func pasangEndpointLabInstance(rute *http.ServeMux, db *sql.DB, svc service.Service, ip, akun *service.PembatasBersama) {
	rute.HandleFunc("GET /lab/lambat", func(w http.ResponseWriter, req *http.Request) {
		ms, err := strconv.Atoi(req.URL.Query().Get("ms"))
		if err != nil || ms < 0 || ms > 10_000 {
			http.Error(w, "ms harus 0 sampai 10000", http.StatusBadRequest)
			return
		}
		if _, err := db.ExecContext(req.Context(), "SELECT pg_sleep($1)", float64(ms)/1000); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"selesai":true}`)
	})
	rute.HandleFunc("GET /lab/panik", func(w http.ResponseWriter, req *http.Request) {
		switch req.URL.Query().Get("di") {
		case "handler":
			panic("uji panic di goroutine handler")
		case "latar":
			svc.Latar("uji", func() {
				time.Sleep(100 * time.Millisecond) // jawaban 202 sampai ke client sebelum proses mati
				panic("uji panic di goroutine latar")
			})
			w.WriteHeader(http.StatusAccepted)
		default:
			http.Error(w, "di harus handler atau latar", http.StatusBadRequest)
		}
	})
	rute.HandleFunc("GET /lab/batas", func(w http.ResponseWriter, req *http.Request) {
		out := map[string]any{"mode": "memori"}
		if ip != nil && akun != nil {
			b1, j1 := ip.Statistik()
			b2, j2 := akun.Statistik()
			out = map[string]any{"mode": "redis",
				"ip":   map[string]int64{"bersama": b1, "lokal": j1},
				"akun": map[string]int64{"bersama": b2, "lokal": j2}}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(out)
	})
}

// jalankanJobT4: job sekali jalan Tahap 4. Exit 0 bila selesai (insiden yang ditemukan bukan kegagalan job), 2 bila
// error. Satu proses, satu job.
func jalankanJobT4(r repo.Repo, umurSesi time.Duration, dep service.Dep, rentan string, cekTopup bool, cekUmur time.Duration, rekon string, kedaluwarsaHold, koreksiRekon bool) int {
	svc := service.Baru(r, umurSesi).DenganT4(dep).DenganMode(rentan)
	ctx := context.Background()
	switch {
	case cekTopup:
		h, err := svc.CekTopupBelumSelesai(ctx, cekUmur)
		if err != nil {
			log.Print(err)
			return 2
		}
		fmt.Printf("cek top-up: diperiksa %d, dikredit %d, selesai tanpa kredit %d, masih menunggu %d, galat %d\n",
			h.Diperiksa, h.Dikredit, h.Selesai, h.Tertunda, h.Galat)
	case rekon != "":
		h, err := svc.RekonHarian(ctx, rekon)
		if err != nil {
			log.Print(err)
			return 2
		}
		fmt.Printf("rekon %s: %d baris di laporan gateway; insiden baru: tidak_di_ledger %d, tidak_di_gateway %d, jumlah_beda %d\n",
			rekon, h.BarisGateway, h.TidakDiLedger, h.TidakDiGateway, h.JumlahBeda)
	case koreksiRekon:
		h, err := svc.KoreksiRekon(ctx)
		if err != nil {
			log.Print(err)
			return 2
		}
		fmt.Printf("koreksi rekon: diperiksa %d, dikoreksi lewat jurnal %d, selesai tanpa jurnal baru %d, tetap terbuka %d, galat %d\n",
			h.Diperiksa, h.Dikoreksi, h.SelesaiTanpaJurnal, h.Ditahan, h.Galat)
	case kedaluwarsaHold:
		diperiksa, dilepas, err := svc.KedaluwarsaHold(ctx)
		if err != nil {
			log.Print(err)
			return 2
		}
		fmt.Printf("hold kartu: diperiksa %d, dilepas %d\n", diperiksa, dilepas)
	}
	return 0
}

func jalankanBersih(r repo.Repo) int {
	ctx := context.Background()
	o, err := r.BersihkanOutbox(ctx, 7*24*time.Hour)
	if err != nil {
		log.Print(err)
		return 2
	}
	s, err := r.BersihkanOperasi(ctx, 14*24*time.Hour)
	if err != nil {
		log.Print(err)
		return 2
	}
	fmt.Printf("bersih: %d baris outbox selesai (lebih dari 7 hari), %d operasi sinkron (lebih dari 14 hari)\n", o, s)
	return 0
}

// --8<-- [start:cek-cache]
// jalankanCekCache: job malam (naskah 3b). Exit 1 bila ada buku yang saldo_cache-nya berbeda dari jumlah
// posting, supaya penjadwal (cron) bisa memberi tahu. Cache tidak diperbaiki otomatis: selisih berarti ada kode
// yang menulis cache tanpa posting, dan itu yang harus dicari.
func jalankanCekCache(r repo.Repo) int {
	n, beda, err := r.CekCache(context.Background())
	if err != nil {
		log.Print(err)
		return 2
	}
	for _, b := range beda {
		fmt.Printf("buku %d (%s %s): saldo_cache %d, jumlah posting %d, selisih %d\n",
			b.BukuID, b.Jenis, b.Nama, b.Cache, b.Posting, b.Cache-b.Posting)
	}
	fmt.Printf("cek cache: %d buku diperiksa, %d tidak cocok\n", n, len(beda))
	if len(beda) > 0 {
		return 1
	}
	return 0
}

// --8<-- [end:cek-cache]
