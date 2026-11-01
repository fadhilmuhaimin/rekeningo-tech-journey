package stream

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sync"
	"sync/atomic"

	"github.com/twmb/franz-go/pkg/kgo"

	"lab/apit5/internal/notifid"
)

// Konsumen membaca pengumuman.kirim dalam satu consumer group. Satu rekaman = satu rentang perangkat di satu partisi;
// consumer yang memegang partisi itu mengirim ke semua perangkat aktif di rentangnya, `Serentak` pesan sekaligus (c di
// naskah), lalu mencatat offset. Consumer yang mati di tengah rentang tidak mencatat offset, jadi consumer lain
// mengulang rentang itu dari awal: pengiriman ganda yang benar (at-least-once), dan id yang sama membuat penerima
// menyaringnya (notifid.Pengumuman).
type Konsumen struct {
	DB           *sql.DB
	K            *kgo.Client
	P            *Pengirim
	Serentak     int
	HentiSetelah int64 // lab saja: berhenti mendadak sesudah pengiriman ke-n, tanpa mencatat offset (consumer mati di tengah)
	IDAcak       bool  // lab saja (mode rentan -id-acak): id baru di setiap pengiriman, bukan id deterministik

	dikirim, dilewati, rekaman, menyerah atomic.Int64
}

// Pengumuman adalah isi satu rekaman pengumuman.kirim.
type Pengumuman struct {
	EventID      string `json:"event_id"`
	PengumumanID int64  `json:"pengumuman_id"`
	Judul        string `json:"judul"`
	Shard        int    `json:"shard"`
	JumlahShard  int    `json:"jumlah_shard"`
	Dari         int64  `json:"dari"`
	Sampai       int64  `json:"sampai"`
}

// Jalankan membaca satu rekaman sekali waktu sampai ctx dibatalkan. BlockRebalanceOnPoll menahan pembagian ulang
// partisi selama satu rekaman dikerjakan, jadi offset selalu dicatat oleh consumer yang masih memegang partisinya.
func (k *Konsumen) Jalankan(ctx context.Context) error {
	for ctx.Err() == nil {
		f := k.K.PollRecords(ctx, 1)
		if f.IsClientClosed() {
			return nil
		}
		f.EachError(func(t string, p int32, err error) {
			if ctx.Err() == nil {
				log.Printf("poll %s/%d: %v", t, p, err)
			}
		})
		f.EachRecord(func(r *kgo.Record) {
			if err := k.proses(ctx, r); err != nil {
				log.Printf("rekaman %s/%d offset %d tidak selesai: %v", r.Topic, r.Partition, r.Offset, err)
				return // offset tidak dicatat: rekaman dibaca lagi
			}
			if err := k.K.CommitRecords(context.WithoutCancel(ctx), r); err != nil {
				log.Printf("catat offset: %v", err)
			}
			k.rekaman.Add(1)
		})
		k.K.AllowRebalance()
	}
	return nil
}

type tujuan struct {
	id    int64
	token string
}

// --8<-- [start:konsumen-proses]
// proses mengirim pengumuman ke semua perangkat aktif di satu rentang, dibaca per 500 baris menurut nomor perangkat.
func (k *Konsumen) proses(ctx context.Context, r *kgo.Record) error {
	var p Pengumuman
	if err := json.Unmarshal(r.Value, &p); err != nil {
		return fmt.Errorf("isi rekaman: %w", err)
	}
	var sesudah int64
	if p.Dari > 0 {
		sesudah = p.Dari - 1
	}
	for {
		rows, err := k.DB.QueryContext(ctx, `
			SELECT id, token_push FROM perangkat WHERE aktif AND id > $1 AND id <= $2 ORDER BY id LIMIT 500`, sesudah, p.Sampai)
		if err != nil {
			return err
		}
		var batch []tujuan
		for rows.Next() {
			var t tujuan
			if err := rows.Scan(&t.id, &t.token); err != nil {
				rows.Close()
				return err
			}
			batch = append(batch, t)
		}
		if err := rows.Err(); err != nil {
			return err
		}
		rows.Close()
		if len(batch) == 0 {
			return nil
		}
		if err := k.kirimBatch(ctx, p, batch); err != nil {
			return err
		}
		sesudah = batch[len(batch)-1].id
	}
}

// --8<-- [end:konsumen-proses]

func (k *Konsumen) kirimBatch(ctx context.Context, p Pengumuman, batch []tujuan) error {
	ch := make(chan tujuan)
	var wg sync.WaitGroup
	var muGalat sync.Mutex
	var galat error // galat pertama; atomic.Value menolak dua jenis galat berbeda (panic), jadi pakai mutex
	for i := 0; i < k.Serentak; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for t := range ch {
				id := notifid.Pengumuman(p.PengumumanID, t.id)
				if k.IDAcak {
					id = notifid.AcakSebagaiPengumuman()
				}
				hasil, err := k.P.Kirim(ctx, t.token, id, p.Judul, "")
				switch {
				case err != nil:
					k.menyerah.Add(1)
					muGalat.Lock()
					if galat == nil {
						galat = err
					}
					muGalat.Unlock()
				case hasil == TidakTerdaftar:
					k.dilewati.Add(1)
					if _, e := k.DB.ExecContext(ctx, `UPDATE perangkat SET aktif = false WHERE id = $1`, t.id); e != nil {
						log.Printf("nonaktifkan perangkat %d: %v", t.id, e)
					}
				default:
					if n := k.dikirim.Add(1); k.HentiSetelah > 0 && n >= k.HentiSetelah {
						log.Printf("dihentikan sesudah %d pengiriman, tanpa mencatat offset (lab)", n)
						os.Exit(3)
					}
				}
			}
		}()
	}
	for _, t := range batch {
		if ctx.Err() != nil {
			break
		}
		ch <- t
	}
	close(ch)
	wg.Wait()
	if err := ctx.Err(); err != nil {
		return err
	}
	muGalat.Lock()
	defer muGalat.Unlock()
	return galat
}

// RingkasanKonsumen: hitungan satu consumer, dicetak saat berhenti.
type RingkasanKonsumen struct {
	Rekaman  int64     `json:"rekaman"`
	Dikirim  int64     `json:"dikirim"`
	Dilewati int64     `json:"dilewati"`
	Menyerah int64     `json:"menyerah"`
	Pengirim Statistik `json:"pengirim"`
}

func (k *Konsumen) Ringkasan() RingkasanKonsumen {
	return RingkasanKonsumen{Rekaman: k.rekaman.Load(), Dikirim: k.dikirim.Load(), Dilewati: k.dilewati.Load(),
		Menyerah: k.menyerah.Load(), Pengirim: k.P.Statistik()}
}
