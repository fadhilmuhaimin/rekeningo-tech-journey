// Proses event streaming lab t5-fanout (ADR 51), satu binary dengan tiga peran:
//
//	-peran relay          meneruskan baris outbox bertujuan stream ke Kafka (pembayaran.tercatat, pengumuman.kirim)
//	-peran konsumen       anggota consumer group yang mengirim pengumuman ke penyedia push
//	-peran uji-pengirim   mengirim -jumlah pesan langsung ke penyedia push (tanpa Kafka) untuk mengukur c dan t
//
// Semua alamat tiruan lokal: Kafka satu broker KRaft di container, penyedia push cmd/pushkuota. DATABASE_URL dari
// lingkungan, seperti api-t5.
package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"math/rand/v2"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/twmb/franz-go/pkg/kgo"

	"lab/apit5/internal/notifid"
	"lab/apit5/internal/repo"
	"lab/apit5/internal/stream"
)

func main() {
	peran := flag.String("peran", "", "relay, konsumen, atau uji-pengirim")
	kafka := flag.String("kafka", "", "alamat broker Kafka, host:port (satu broker KRaft di container lab); wajib untuk relay dan konsumen")
	grup := flag.String("grup", "pengumuman-pengirim", "konsumen: nama consumer group")
	partisi := flag.Int("partisi", 6, "relay: jumlah rentang perangkat = jumlah partisi pengumuman.kirim")
	sekali := flag.Bool("sekali", false, "relay: teruskan semua yang siap, lalu keluar")
	pushURL := flag.String("push-url", "", "alamat penyedia push (tiruan lokal cmd/pushkuota); wajib")
	serentak := flag.Int("serentak", 4, "konsumen dan uji-pengirim: pengirim serentak per proses (c)")
	laju := flag.Float64("laju", 0, "konsumen: pesan per detik per proses; 0 = tanpa batas laju")
	dasar := flag.Duration("backoff", 100*time.Millisecond, "dasar backoff sesudah 429 (percobaan pertama; lalu dua kali lipat)")
	maks := flag.Duration("backoff-maks", 2*time.Second, "batas atas backoff")
	maksPercobaan := flag.Int("maks-percobaan", 200, "konsumen dan uji-pengirim: percobaan paling banyak untuk satu pesan sebelum menyerah")
	tanpaBackoff := flag.Bool("tanpa-backoff", false, "lab saja (mode rentan): ulang segera sesudah 429")
	idAcak := flag.Bool("id-acak", false, "lab saja (mode rentan): notifikasi_id baru di setiap pengiriman")
	hentiSetelah := flag.Int64("lab-henti-setelah", 0, "konsumen, lab saja: berhenti mendadak sesudah pengiriman ke-n, tanpa mencatat offset")
	hentiSebelumTandai := flag.Bool("lab-henti-sebelum-tandai", false, "relay, lab saja: berhenti mendadak sesudah Kafka menjawab, sebelum baris ditandai terkirim")
	sesi := flag.Duration("sesi", 6*time.Second, "konsumen: session timeout consumer group (6 detik = batas bawah bawaan broker)")
	jumlah := flag.Int("jumlah", 0, "uji-pengirim: jumlah pesan")
	flag.Parse()

	if *pushURL == "" || (*peran != "uji-pengirim" && *kafka == "") {
		log.Fatal("-push-url wajib, dan -kafka wajib untuk relay dan konsumen")
	}
	ctx, batal := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer batal()

	pengirim := stream.BaruPengirim(*pushURL, *serentak, *dasar, *maks)
	pengirim.TanpaBackoff = *tanpaBackoff
	pengirim.MaksPercobaan = *maksPercobaan
	pengirim.Laju = stream.BaruLaju(*laju)

	switch *peran {
	case "uji-pengirim":
		ujiPengirim(ctx, pengirim, *jumlah, *serentak)
		return
	case "relay", "konsumen":
	default:
		log.Fatalf("peran harus relay, konsumen, atau uji-pengirim, bukan %q", *peran)
	}

	db := bukaDB(os.Getenv("DATABASE_URL"), *peran)
	defer db.Close()
	switch *peran {
	case "relay":
		k, err := kgo.NewClient(kgo.SeedBrokers(*kafka), kgo.RecordPartitioner(stream.Partisioner{}), kgo.RequiredAcks(kgo.AllISRAcks()))
		if err != nil {
			log.Fatal(err)
		}
		defer k.Close()
		r := &stream.Relay{Repo: repo.Baru(db), DB: db, K: k, Partisi: *partisi, Klaim: 5 * time.Second, Selang: 100 * time.Millisecond,
			MaksPercobaan: 5, HentiSebelumTandai: *hentiSebelumTandai, Acak: rand.Float64}
		log.Printf("relay mulai (partisi pengumuman %d)", *partisi)
		if *sekali {
			n, err := r.Kuras(ctx)
			if err != nil {
				log.Fatal(err)
			}
			fmt.Printf("relay: diklaim %d\n", n)
			return
		}
		_ = r.Jalankan(ctx)
	case "konsumen":
		k, err := kgo.NewClient(kgo.SeedBrokers(*kafka), kgo.ConsumerGroup(*grup), kgo.ConsumeTopics(stream.TopikPengumuman),
			kgo.DisableAutoCommit(), kgo.BlockRebalanceOnPoll(), kgo.SessionTimeout(*sesi), kgo.HeartbeatInterval(*sesi/3),
			kgo.RebalanceTimeout(30*time.Second), kgo.Balancers(kgo.CooperativeStickyBalancer()),
			kgo.ConsumeResetOffset(kgo.NewOffset().AtStart()))
		if err != nil {
			log.Fatal(err)
		}
		c := &stream.Konsumen{DB: db, K: k, P: pengirim, Serentak: *serentak, HentiSetelah: *hentiSetelah, IDAcak: *idAcak}
		log.Printf("konsumen mulai (grup %s, serentak %d, laju %g, backoff %s sampai %s, tanpa backoff %t, id acak %t)", *grup, *serentak, *laju, *dasar, *maks, *tanpaBackoff, *idAcak)
		_ = c.Jalankan(ctx)
		k.Close()
		b, _ := json.Marshal(c.Ringkasan())
		fmt.Printf("ringkasan %s\n", b)
	}
}

// ujiPengirim mengirim n pesan pengumuman ke token tiruan lewat `serentak` pengirim dan mencetak statistiknya: c dan t
// terukur oleh kode pengirim yang sama dengan konsumen.
func ujiPengirim(ctx context.Context, p *stream.Pengirim, n, serentak int) {
	if n <= 0 {
		log.Fatal("-jumlah harus lebih dari 0")
	}
	ch := make(chan int)
	selesai := make(chan struct{})
	for i := 0; i < serentak; i++ {
		go func() {
			defer func() { selesai <- struct{}{} }()
			for j := range ch {
				if _, err := p.Kirim(ctx, fmt.Sprintf("uji-%d", j), notifid.Pengumuman(1, int64(j)), "uji", ""); err != nil {
					log.Printf("kirim %d: %v", j, err)
				}
			}
		}()
	}
	mulai := time.Now()
	for j := 1; j <= n; j++ {
		ch <- j
	}
	close(ch)
	for i := 0; i < serentak; i++ {
		<-selesai
	}
	lama := time.Since(mulai)
	b, _ := json.Marshal(struct {
		Jumlah   int              `json:"jumlah"`
		LamaMs   float64          `json:"lama_ms"`
		PerDetik float64          `json:"per_detik"`
		Pengirim stream.Statistik `json:"pengirim"`
	}{n, float64(lama) / 1e6, float64(n) / lama.Seconds(), p.Statistik()})
	fmt.Printf("ringkasan %s\n", b)
}

// bukaDB: pool kecil (4 koneksi) seperti worker api-t5; setiap peran punya application_name sendiri.
func bukaDB(url, peran string) *sql.DB {
	cfg, err := pgx.ParseConfig(url)
	if err != nil {
		log.Fatal(err)
	}
	if cfg.RuntimeParams == nil {
		cfg.RuntimeParams = map[string]string{}
	}
	cfg.RuntimeParams["application_name"] += "-" + peran
	db := stdlib.OpenDB(*cfg)
	db.SetMaxOpenConns(4)
	db.SetMaxIdleConns(4)
	return db
}
