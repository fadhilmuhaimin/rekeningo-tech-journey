// Lab Tahap 3 · API bayar + worker, satu codebase, dua proses.
//
//	api -mode dalam-tx   : notifikasi dipanggil DI DALAM transaction (masalah Tahap 3)
//	api -mode outbox     : transaction hanya berisi query + tulis outbox; worker yang mengirim
//	api -worker          : proses worker yang membaca outbox
package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"sync"
	"sync/atomic"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

var (
	db     *sql.DB
	logger = slog.New(slog.NewJSONHandler(os.Stdout, nil))
	nomor  atomic.Int64
	notif  = &http.Client{Timeout: 5 * time.Second}
)

var urlNotif = "http://127.0.0.1:" + portLab(18090) + "/kirim"

// Rincian waktu satu request, ditulis ke log. Versi sederhana dari span di tracing (C2).
type Rincian struct{ TungguKoneksi, Query, Notifikasi time.Duration }

func ukur(d *time.Duration, mulai time.Time) { *d += time.Since(mulai) }

func kirimNotif(ctx context.Context, data []byte) error {
	req, _ := http.NewRequestWithContext(ctx, "POST", urlNotif, nil)
	res, err := notif.Do(req)
	if err != nil {
		return err
	}
	res.Body.Close()
	if res.StatusCode != 200 {
		return fmt.Errorf("notifikasi: status %d", res.StatusCode)
	}
	return nil
}

// --8<-- [start:dalamtx]
// SALAH untuk Tahap 3: koneksi database dipegang selama menunggu layanan notifikasi.
func bayarDalamTx(ctx context.Context, akun int, jumlah int64, r *Rincian) error {
	t := time.Now()
	tx, err := db.BeginTx(ctx, nil) // meminjam satu koneksi dari pool
	ukur(&r.TungguKoneksi, t)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	t = time.Now()
	if _, err := tx.ExecContext(ctx, `UPDATE akun SET saldo = saldo - $1 WHERE id = $2 AND saldo >= $1`, jumlah, akun); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO pembayaran (akun_id, jumlah) VALUES ($1, $2)`, akun, jumlah); err != nil {
		return err
	}
	ukur(&r.Query, t)
	t = time.Now()
	err = kirimNotif(ctx, nil) // ±2 detik, koneksi tetap dipegang
	ukur(&r.Notifikasi, t)
	if err != nil {
		return err
	}
	return tx.Commit() // koneksi baru kembali ke pool di sini
}

// --8<-- [end:dalamtx]

// --8<-- [start:outbox]
// BENAR: transaction hanya berisi query. Notifikasi ditulis ke outbox di transaction yang sama.
func bayarOutbox(ctx context.Context, akun int, jumlah int64, r *Rincian) error {
	t := time.Now()
	tx, err := db.BeginTx(ctx, nil)
	ukur(&r.TungguKoneksi, t)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	defer ukur(&r.Query, time.Now())
	if _, err := tx.ExecContext(ctx, `UPDATE akun SET saldo = saldo - $1 WHERE id = $2 AND saldo >= $1`, jumlah, akun); err != nil {
		return err
	}
	var id int64
	if err := tx.QueryRowContext(ctx, `INSERT INTO pembayaran (akun_id, jumlah) VALUES ($1, $2) RETURNING id`, akun, jumlah).Scan(&id); err != nil {
		return err
	}
	data, _ := json.Marshal(map[string]any{"pembayaran_id": id, "akun_id": akun, "jumlah": jumlah})
	if _, err := tx.ExecContext(ctx, `INSERT INTO outbox (jenis, data) VALUES ('pembayaran_berhasil', $1)`, data); err != nil {
		return err
	}
	return tx.Commit()
}

// --8<-- [end:outbox]

func main() {
	mode := flag.String("mode", "dalam-tx", "dalam-tx | outbox")
	worker := flag.Bool("worker", false, "jalankan worker outbox, bukan API")
	flag.Parse()
	var err error
	db, err = sql.Open("pgx", os.Getenv("DATABASE_URL"))
	if err != nil {
		panic(err)
	}
	// --8<-- [start:pool]
	db.SetMaxOpenConns(10) // pool 10 koneksi, sama dengan bawaan node-postgres dan HikariCP
	db.SetMaxIdleConns(10)
	// --8<-- [end:pool]
	if *worker {
		jalankanWorker()
		return
	}
	bayar := bayarDalamTx
	if *mode == "outbox" {
		bayar = bayarOutbox
	}
	http.HandleFunc("POST /bayar", func(w http.ResponseWriter, r *http.Request) {
		id := nomor.Add(1)
		var in struct {
			Akun   int   `json:"akun_id"`
			Jumlah int64 `json:"jumlah"`
		}
		json.NewDecoder(r.Body).Decode(&in)
		mulai := time.Now()
		var rc Rincian
		err := bayar(r.Context(), in.Akun, in.Jumlah, &rc)
		durasi := time.Since(mulai)
		atribut := []any{"request_id", id, "mode", *mode, "durasi_ms", durasi.Milliseconds(),
			"tunggu_koneksi_ms", rc.TungguKoneksi.Milliseconds(), "query_ms", rc.Query.Milliseconds(),
			"notifikasi_ms", rc.Notifikasi.Milliseconds()}
		if err != nil {
			logger.Error("bayar gagal", append(atribut, "error", err.Error())...)
			http.Error(w, `{"error":"internal"}`, 500)
			return
		}
		logger.Info("bayar", atribut...)
		w.WriteHeader(201)
	})
	http.HandleFunc("GET /debug/pool", func(w http.ResponseWriter, r *http.Request) {
		s := db.Stats()
		json.NewEncoder(w).Encode(map[string]any{"maks_koneksi": s.MaxOpenConnections, "dipakai": s.InUse,
			"jumlah_menunggu": s.WaitCount, "total_waktu_menunggu_ms": s.WaitDuration.Milliseconds()})
	})
	logger.Info("api siap", "mode", *mode, "pool_maks", 10)
	if err := http.ListenAndServe("127.0.0.1:"+portLab(18083), nil); err != nil {
		panic(err)
	}
}

// --8<-- [start:worker]
// Worker: ambil pekerjaan dengan lease (coba_lagi digeser 30 detik), kirim di luar transaction,
// retry dengan backoff, dan pindahkan ke status gagal (dead-letter) setelah 3 percobaan.
func jalankanWorker() {
	ctx := context.Background()
	for {
		rows, err := db.QueryContext(ctx, `
			UPDATE outbox SET coba_lagi = now() + interval '30 seconds', percobaan = percobaan + 1
			WHERE id IN (SELECT id FROM outbox WHERE status = 'menunggu' AND coba_lagi <= now()
			             ORDER BY id LIMIT 20 FOR UPDATE SKIP LOCKED)
			RETURNING id, data, percobaan`)
		if err != nil {
			logger.Error("worker", "error", err.Error())
			time.Sleep(time.Second)
			continue
		}
		type tugas struct {
			id        int64
			data      []byte
			percobaan int
		}
		var daftar []tugas
		for rows.Next() {
			var t tugas
			rows.Scan(&t.id, &t.data, &t.percobaan)
			daftar = append(daftar, t)
		}
		rows.Close()
		var wg sync.WaitGroup
		for _, t := range daftar { // dikirim paralel: satu goroutine per pesan
			wg.Add(1)
			go func() {
				defer wg.Done()
				if err := kirimNotif(ctx, t.data); err != nil {
					if t.percobaan >= 3 {
						db.ExecContext(ctx, `UPDATE outbox SET status = 'gagal', error_akhir = $2 WHERE id = $1`, t.id, err.Error())
						logger.Warn("dead-letter", "outbox_id", t.id, "percobaan", t.percobaan, "error", err.Error())
						return
					}
					jeda := time.Duration(1<<t.percobaan) * time.Second // 2, 4 detik
					db.ExecContext(ctx, `UPDATE outbox SET coba_lagi = now() + $2::interval WHERE id = $1`, t.id, jeda.String())
					logger.Warn("retry", "outbox_id", t.id, "percobaan", t.percobaan, "coba_lagi_dalam", jeda.String(), "error", err.Error())
					return
				}
				db.ExecContext(ctx, `UPDATE outbox SET status = 'terkirim' WHERE id = $1`, t.id)
			}()
		}
		wg.Wait()
		if len(daftar) == 0 {
			time.Sleep(200 * time.Millisecond)
		}
	}
}

// --8<-- [end:worker]
