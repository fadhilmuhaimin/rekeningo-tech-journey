package stream

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/twmb/franz-go/pkg/kgo"

	"lab/apit5/internal/repo"
	"lab/apit5/internal/worker"
)

// Topik event (naskah ADR 51).
const (
	TopikPembayaran = "pembayaran.tercatat"
	TopikPengumuman = "pengumuman.kirim"
)

// Relay meneruskan baris outbox bertujuan `stream` ke Kafka. Baris diklaim seperti worker push (FOR UPDATE SKIP LOCKED
// dan klaim_sampai, ADR 24), ditandai terkirim hanya sesudah broker menjawab semua rekaman, jadi relay yang mati di
// antaranya membuat rekaman yang sama ditulis dua kali: at-least-once, dan consumer menyaring event_id.
type Relay struct {
	Repo               repo.Repo
	DB                 *sql.DB
	K                  *kgo.Client
	Partisi            int // jumlah partisi pengumuman.kirim = jumlah rentang perangkat
	Klaim              time.Duration
	Selang             time.Duration
	MaksPercobaan      int
	HentiSebelumTandai bool // lab saja: berhenti mendadak sesudah broker menjawab, sebelum baris ditandai terkirim
	Acak               func() float64
}

// RentangShard: satu rentang nomor perangkat aktif, sama besar menurut jumlah baris (ntile).
type RentangShard struct {
	Shard     int   `json:"shard"`
	Dari      int64 `json:"dari"`
	Sampai    int64 `json:"sampai"`
	Perangkat int64 `json:"perangkat"`
}

// --8<-- [start:rencana-shard]
// RencanaShard membagi perangkat aktif ke `n` rentang nomor yang hampir sama banyak. Satu rentang menjadi satu rekaman
// di satu partisi, dan satu partisi dibaca satu consumer dalam satu consumer group.
func RencanaShard(ctx context.Context, db *sql.DB, n int) ([]RentangShard, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT shard, min(id), max(id), count(*)
		FROM (SELECT id, ntile($1) OVER (ORDER BY id) AS shard FROM perangkat WHERE aktif) d
		GROUP BY shard ORDER BY shard`, n)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []RentangShard
	for rows.Next() {
		var s RentangShard
		if err := rows.Scan(&s.Shard, &s.Dari, &s.Sampai, &s.Perangkat); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// --8<-- [end:rencana-shard]

// Putaran mengklaim sampai 50 baris stream dan meneruskannya. Mengembalikan jumlah baris yang diklaim.
func (r *Relay) Putaran(ctx context.Context) (int, error) {
	baris, err := r.Repo.KlaimOutboxTujuan(ctx, 50, r.Klaim, true, []string{repo.TujuanStream})
	if err != nil {
		return 0, err
	}
	for _, n := range baris {
		r.teruskan(ctx, n)
	}
	return len(baris), nil
}

// Kuras: putaran sampai tidak ada baris siap, lalu berhenti (`-sekali`).
func (r *Relay) Kuras(ctx context.Context) (int, error) {
	total := 0
	for {
		n, err := r.Putaran(ctx)
		total += n
		if err != nil || n == 0 {
			return total, err
		}
	}
}

// Jalankan berputar sampai ctx dibatalkan.
func (r *Relay) Jalankan(ctx context.Context) error {
	for ctx.Err() == nil {
		n, err := r.Putaran(context.WithoutCancel(ctx))
		if err != nil {
			log.Printf("relay: %v", err)
		}
		if err != nil || n == 0 {
			tidur(ctx, r.Selang)
		}
	}
	return nil
}

// --8<-- [start:relay-teruskan]
// teruskan menulis rekaman satu baris outbox ke Kafka. Baris `bayar` menjadi satu rekaman berkunci merchant (urutan
// per merchant terjaga karena satu kunci jatuh di satu partisi). Baris `pengumuman` menjadi satu rekaman per rentang
// perangkat, di partisi bernomor sama dengan rentangnya: satu baris outbox, bukan satu baris per penerima.
func (r *Relay) teruskan(ctx context.Context, n repo.Notifikasi) {
	recs, err := r.rekaman(ctx, n)
	if err == nil && len(recs) > 0 {
		err = r.K.ProduceSync(ctx, recs...).FirstErr()
	}
	if err != nil {
		mati := n.Percobaan >= r.MaksPercobaan
		tunggu := worker.Backoff(n.Percobaan, time.Second, 30*time.Second, r.Acak())
		log.Printf("outbox %d percobaan %d: %v", n.ID, n.Percobaan, err)
		if e := r.Repo.TundaOutbox(ctx, n.ID, tunggu, mati); e != nil {
			log.Printf("outbox %d: tunda: %v", n.ID, e)
		}
		return
	}
	if r.HentiSebelumTandai && len(recs) > 0 {
		log.Printf("outbox %d: dihentikan sebelum ditandai terkirim (lab)", n.ID)
		os.Exit(3)
	}
	status := "terkirim"
	if len(recs) == 0 {
		status = "dilewati"
	}
	if err := r.Repo.SelesaiOutbox(ctx, n.ID, status); err != nil {
		log.Printf("outbox %d: tandai %s: %v", n.ID, status, err) // klaim habis sendiri; rekaman ditulis lagi
	}
}

// --8<-- [end:relay-teruskan]

func (r *Relay) rekaman(ctx context.Context, n repo.Notifikasi) ([]*kgo.Record, error) {
	var isi map[string]any
	if err := json.Unmarshal(n.Payload, &isi); err != nil {
		return nil, fmt.Errorf("payload outbox %d: %w", n.ID, err)
	}
	isi["event_id"] = n.NotifikasiID
	switch n.Jenis {
	case "bayar":
		merchant, ok := isi["merchant"].(float64)
		if !ok {
			return nil, fmt.Errorf("payload outbox %d tanpa merchant", n.ID)
		}
		nilai, _ := json.Marshal(isi)
		return []*kgo.Record{{Topic: TopikPembayaran, Key: []byte(strconv.FormatInt(int64(merchant), 10)), Value: nilai}}, nil
	case "pengumuman":
		rencana, err := RencanaShard(ctx, r.DB, r.Partisi)
		if err != nil {
			return nil, err
		}
		var recs []*kgo.Record
		for _, s := range rencana {
			e := map[string]any{"event_id": n.NotifikasiID, "pengumuman_id": isi["pengumuman_id"], "judul": isi["judul"],
				"shard": s.Shard, "jumlah_shard": len(rencana), "dari": s.Dari, "sampai": s.Sampai}
			nilai, _ := json.Marshal(e)
			recs = append(recs, &kgo.Record{Topic: TopikPengumuman, Partition: int32(s.Shard - 1),
				Key: []byte("shard-" + strconv.Itoa(s.Shard)), Value: nilai})
		}
		return recs, nil
	}
	return nil, fmt.Errorf("outbox %d: jenis %q tidak dikenal relay", n.ID, n.Jenis)
}

// Partisioner: rekaman pengumuman memakai partisi yang ditulis relay (satu rentang satu partisi); topik lain
// memakai hash kunci, jadi kunci yang sama selalu jatuh di partisi yang sama.
type Partisioner struct{}

func (Partisioner) ForTopic(topik string) kgo.TopicPartitioner {
	if topik == TopikPengumuman {
		return kgo.ManualPartitioner().ForTopic(topik)
	}
	return kgo.StickyKeyPartitioner(nil).ForTopic(topik)
}
