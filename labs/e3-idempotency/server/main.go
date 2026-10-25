// Lab E3 · server Go: POST /pembayaran dengan header Idempotency-Key.
// Flag -lambat-pertama: response pertama ditahan 1,5 detik SETELAH COMMIT,
// supaya client (timeout 1 detik) menyerah. Ini meniru "response hilang di jalan".
package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync/atomic"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

var db *sql.DB

// --8<-- [start:handler]
func bayar(ctx context.Context, key, akun, toko string, jumlah int64) (int, []byte, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return 0, nil, err
	}
	defer tx.Rollback()

	// 1. Catat key. Kalau key sudah ada, constraint unik membuat INSERT tidak menulis apa-apa.
	res, err := tx.ExecContext(ctx,
		`INSERT INTO idempotency_key (key, akun) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`, key, akun)
	if err != nil {
		return 0, nil, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		// 2a. Key lama: kembalikan response yang tersimpan, jangan bayar lagi.
		var code sql.NullInt64
		var body []byte
		if err := tx.QueryRowContext(ctx,
			`SELECT status_code, body FROM idempotency_key WHERE key = $1`, key).Scan(&code, &body); err != nil {
			return 0, nil, err
		}
		if !code.Valid {
			return http.StatusConflict, []byte(`{"error":"sedang_diproses"}`), nil
		}
		return int(code.Int64), body, nil
	}

	// 2b. Key baru: bayar, lalu simpan response di transaction yang sama.
	upd, err := tx.ExecContext(ctx,
		`UPDATE akun SET saldo = saldo - $1 WHERE id = $2 AND saldo >= $1`, jumlah, akun)
	if err != nil {
		return 0, nil, err
	}
	if n, _ := upd.RowsAffected(); n == 0 {
		return http.StatusUnprocessableEntity, []byte(`{"error":"saldo_kurang"}`), tx.Commit()
	}
	if _, err := tx.ExecContext(ctx, `UPDATE akun SET saldo = saldo + $1 WHERE id = $2`, jumlah, toko); err != nil {
		return 0, nil, err
	}
	var id, saldo int64
	if err := tx.QueryRowContext(ctx,
		`INSERT INTO pembayaran (akun, toko, jumlah) VALUES ($1, $2, $3) RETURNING id`, akun, toko, jumlah).Scan(&id); err != nil {
		return 0, nil, err
	}
	if err := tx.QueryRowContext(ctx, `SELECT saldo FROM akun WHERE id = $1`, akun).Scan(&saldo); err != nil {
		return 0, nil, err
	}
	body, _ := json.Marshal(map[string]int64{"id": id, "saldo": saldo})
	if _, err := tx.ExecContext(ctx,
		`UPDATE idempotency_key SET status_code = 201, body = $2 WHERE key = $1`, key, body); err != nil {
		return 0, nil, err
	}
	return http.StatusCreated, body, tx.Commit()
}

// --8<-- [end:handler]

func main() {
	lambat := flag.Bool("lambat-pertama", false, "tahan response pertama 1,5 detik setelah COMMIT")
	flag.Parse()
	var err error
	db, err = sql.Open("pgx", os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}
	var nomor atomic.Int64
	http.HandleFunc("POST /pembayaran", func(w http.ResponseWriter, r *http.Request) {
		n := nomor.Add(1)
		key := r.Header.Get("Idempotency-Key")
		var in struct {
			Toko   string `json:"toko"`
			Jumlah int64  `json:"jumlah"`
		}
		if key == "" || json.NewDecoder(r.Body).Decode(&in) != nil {
			http.Error(w, `{"error":"request_tidak_valid"}`, http.StatusBadRequest)
			return
		}
		// context.WithoutCancel: kalau client memutus koneksi, pekerjaan database tetap selesai.
		code, body, err := bayar(context.WithoutCancel(r.Context()), key, "budi", in.Toko, in.Jumlah)
		if err != nil {
			fmt.Printf("server  request #%d  key=%s  error: %v\n", n, key, err)
			http.Error(w, `{"error":"internal"}`, http.StatusInternalServerError)
			return
		}
		fmt.Printf("server  request #%d  key=%s  → %d %s\n", n, key, code, body)
		if *lambat && n == 1 {
			fmt.Printf("server  request #%d  sudah COMMIT, response ditahan 1,5 detik (meniru sinyal putus)\n", n)
			time.Sleep(1500 * time.Millisecond)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(code)
		w.Write(body)
	})
	log.Fatal(http.ListenAndServe("127.0.0.1:"+portLab(18080), nil))
}
