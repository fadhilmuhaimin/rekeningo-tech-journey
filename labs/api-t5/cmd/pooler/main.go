// Pembuka koneksi untuk lab api-t5 (bagian `pooler`, M46, ADR 52): n client, masing-masing pgxpool dengan MaxConns
// koneksi, menahan koneksinya selama beberapa putaran query pendek. Dengan DSN langsung ke PostgreSQL, jumlah koneksi
// melewati max_connections dan sisanya ditolak dengan kode 53300. Dengan DSN ke PgBouncer (mode transaction), koneksi
// client murah dan yang terpasang ke PostgreSQL dibatasi default_pool_size.
//
// Keluaran: satu objek JSON di stdout. Jumlah koneksi yang berhasil bergantung pada koneksi lain di database, jadi lab
// (run.py) memeriksanya terhadap batas, tidak merekamnya sebagai nilai tunggal.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"log"
	"os"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	dsn := flag.String("dsn", "", "DSN client (langsung ke PostgreSQL atau lewat PgBouncer)")
	n := flag.Int("klien", 12, "jumlah client (instance) yang masing-masing punya pool")
	pool := flag.Int("pool", 10, "MaxConns tiap pool (bawaan service di lab ini: 10)")
	putaran := flag.Int("putaran", 20, "jumlah query SELECT 1 tiap koneksi, dengan jeda 50 ms di antaranya")
	flag.Parse()
	if *dsn == "" {
		log.Fatal("-dsn wajib")
	}
	var mu sync.Mutex
	galat := map[string]int{}
	berhasil, klienPenuh, querySelesai := 0, 0, 0
	var wg sync.WaitGroup
	for i := 0; i < *n; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			cfg, err := pgxpool.ParseConfig(*dsn)
			if err != nil {
				log.Fatal(err)
			}
			cfg.MaxConns, cfg.MinConns = int32(*pool), 0
			cfg.ConnConfig.ConnectTimeout = 10 * time.Second
			p, err := pgxpool.NewWithConfig(context.Background(), cfg)
			if err != nil {
				log.Fatal(err)
			}
			defer p.Close()
			var wgk sync.WaitGroup
			ok := 0
			var mk sync.Mutex
			for j := 0; j < *pool; j++ {
				wgk.Add(1)
				go func() {
					defer wgk.Done()
					ctx, batal := context.WithTimeout(context.Background(), 30*time.Second)
					defer batal()
					c, err := p.Acquire(ctx)
					if err != nil {
						kode := "lain"
						var pe *pgconn.PgError
						if errors.As(err, &pe) {
							kode = pe.Code
						}
						mu.Lock()
						galat[kode]++
						mu.Unlock()
						return
					}
					defer c.Release()
					mk.Lock()
					ok++
					mk.Unlock()
					for k := 0; k < *putaran; k++ {
						var x int
						if err := c.QueryRow(ctx, "SELECT 1").Scan(&x); err != nil {
							kode := "lain"
							var pe *pgconn.PgError
							if errors.As(err, &pe) {
								kode = pe.Code
							}
							mu.Lock()
							galat["query:"+kode]++
							mu.Unlock()
							return
						}
						mu.Lock()
						querySelesai++
						mu.Unlock()
						time.Sleep(50 * time.Millisecond)
					}
				}()
			}
			wgk.Wait()
			mu.Lock()
			berhasil += ok
			if ok == *pool {
				klienPenuh++
			}
			mu.Unlock()
		}()
	}
	wg.Wait()
	json.NewEncoder(os.Stdout).Encode(map[string]any{
		"klien": *n, "pool": *pool, "koneksi_diminta": *n * *pool, "koneksi_berhasil": berhasil,
		"klien_dengan_pool_penuh": klienPenuh, "galat": galat, "query_selesai": querySelesai,
	})
}
