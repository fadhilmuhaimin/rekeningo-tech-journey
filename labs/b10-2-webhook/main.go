// Lab B10.2 · menerima webhook pembayaran (format Standard Webhooks) dan outbox.
//
//	b102 api      :18120 POST /webhooks/pembayaran. MODE=naif: tanpa catatan event, saldo ditambah dari isi webhook
//	b102 worker   kirim isi outbox sekali jalan, lalu keluar
//
// Secret webhook di sini hanya untuk lab (di production: dari environment, lihat halaman deployment).
package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

var (
	db      *sql.DB
	rahasia = []byte("rahasia-webhook-lab")
)

func main() {
	log.SetFlags(0)
	var err error
	if db, err = sql.Open("pgx", os.Getenv("DATABASE_URL")); err != nil {
		log.Fatal(err)
	}
	map[string]func(){"api": api, "worker": worker}[os.Args[1]]()
}

// --8<-- [start:verifikasi]
// Signature = base64(HMAC-SHA256(secret, "webhook-id.webhook-timestamp.body")), header "v1,<signature>".
func sah(r *http.Request, body []byte) bool {
	id, ts := r.Header.Get("webhook-id"), r.Header.Get("webhook-timestamp")
	t, err := strconv.ParseInt(ts, 10, 64)
	if err != nil || time.Since(time.Unix(t, 0)).Abs() > 5*time.Minute { // tolak kiriman lama (replay)
		return false
	}
	m := hmac.New(sha256.New, rahasia)
	m.Write([]byte(id + "." + ts + "." + string(body)))
	harus := "v1," + base64.StdEncoding.EncodeToString(m.Sum(nil))
	return hmac.Equal([]byte(r.Header.Get("webhook-signature")), []byte(harus)) // perbandingan waktu-konstan
}

// --8<-- [end:verifikasi]

func api() {
	naif := os.Getenv("MODE") == "naif"
	http.HandleFunc("POST /webhooks/pembayaran", func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		id := r.Header.Get("webhook-id")
		if !sah(r, body) {
			log.Printf("api      %s → 401 signature atau timestamp tidak sah", id)
			w.WriteHeader(401)
			return
		}
		var ev struct {
			OrderID string `json:"order_id"`
			Status  string `json:"status"`
			Amount  int64  `json:"amount"`
		}
		if err := json.Unmarshal(body, &ev); err != nil || ev.Status != "paid" {
			w.WriteHeader(422)
			return
		}
		if naif {
			db.Exec(`UPDATE akun SET saldo = saldo + $1 WHERE id = 'budi'`, ev.Amount)
			db.Exec(`INSERT INTO outbox (jenis, data) VALUES ('topup_masuk', $1)`, `{"akun":"budi","jumlah":`+strconv.FormatInt(ev.Amount, 10)+`}`)
			log.Printf("api      %s → 200, saldo ditambah %d dari isi webhook (mode naif)", id, ev.Amount)
			return
		}
		hasil, err := proses(id, ev.OrderID)
		if err != nil {
			log.Printf("api      %s → 500 %v", id, err) // gateway akan mengirim ulang
			w.WriteHeader(500)
			return
		}
		log.Printf("api      %s → 200 %s", id, hasil)
	})
	log.Fatal(http.ListenAndServe("127.0.0.1:"+portLab(18120), nil))
}

// --8<-- [start:proses]
func proses(eventID, orderID string) (string, error) {
	tx, err := db.Begin()
	if err != nil {
		return "", err
	}
	defer tx.Rollback()
	res, err := tx.Exec(`INSERT INTO webhook_event (event_id) VALUES ($1) ON CONFLICT DO NOTHING`, eventID)
	if err != nil {
		return "", err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return "duplikat, sudah pernah diproses", tx.Commit()
	}
	var akun string
	var jumlah int64 // jumlah diambil dari data kita sendiri, bukan dari isi webhook
	err = tx.QueryRow(`UPDATE topup SET status = 'dibayar' WHERE id = $1 AND status = 'menunggu'
		RETURNING akun, jumlah`, orderID).Scan(&akun, &jumlah)
	if err != nil {
		return "", err
	}
	if _, err := tx.Exec(`UPDATE akun SET saldo = saldo + $1 WHERE id = $2`, jumlah, akun); err != nil {
		return "", err
	}
	data, _ := json.Marshal(map[string]any{"akun": akun, "jumlah": jumlah, "topup": orderID})
	if _, err := tx.Exec(`INSERT INTO outbox (jenis, data) VALUES ('topup_masuk', $1)`, data); err != nil {
		return "", err
	}
	return "diproses: saldo +" + strconv.FormatInt(jumlah, 10), tx.Commit()
}

// --8<-- [end:proses]

func worker() {
	tx, err := db.Begin()
	if err != nil {
		log.Fatal(err)
	}
	defer tx.Rollback()
	// Kunci baris yang diambil; worker lain melewatinya. Ditandai terkirim setelah dikirim, di transaction yang sama.
	rows, err := tx.Query(`SELECT id, data FROM outbox WHERE terkirim = false ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 10`)
	if err != nil {
		log.Fatal(err)
	}
	var ids []int64
	for rows.Next() {
		var id int64
		var data []byte
		if err := rows.Scan(&id, &data); err != nil {
			log.Fatal(err)
		}
		var d struct{ Jumlah int64 }
		json.Unmarshal(data, &d)
		log.Printf("worker   outbox #%d → push ke HP Budi: \"Top-up Rp%s berhasil\"", id, rupiah(d.Jumlah)) // pengiriman ditiru
		ids = append(ids, id)
	}
	rows.Close()
	for _, id := range ids {
		if _, err := tx.Exec(`UPDATE outbox SET terkirim = true WHERE id = $1`, id); err != nil {
			log.Fatal(err)
		}
	}
	if err := tx.Commit(); err != nil {
		log.Fatal(err)
	}
}

func rupiah(n int64) string {
	s := strconv.FormatInt(n, 10)
	var b strings.Builder
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			b.WriteByte('.')
		}
		b.WriteRune(c)
	}
	return b.String()
}
