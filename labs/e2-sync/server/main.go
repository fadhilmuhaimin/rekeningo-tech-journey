// Lab E2 · server Go: stok dan harga Warung Ani, dengan endpoint sync untuk antrean offline app.
package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
)

var db *sql.DB

type produk struct {
	ID    string `json:"id"`
	Stok  int    `json:"stok"`
	Harga int64  `json:"harga"`
	Versi int    `json:"versi"`
}

func ambil(ctx context.Context, q interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
}, id string) (produk, error) {
	var p produk
	err := q.QueryRowContext(ctx, `SELECT id, stok, harga, versi FROM produk WHERE id = $1`, id).
		Scan(&p.ID, &p.Stok, &p.Harga, &p.Versi)
	return p, err
}

type op struct {
	OpID       string `json:"op_id"` // dibuat app saat Ani mengubah data, dipakai ulang saat retry
	Jenis      string `json:"jenis"` // "tambah_stok" atau "ubah_harga"
	Produk     string `json:"produk"`
	Jumlah     int    `json:"jumlah"`      // tambah_stok: selisih, bukan nilai akhir
	Harga      int64  `json:"harga"`       // ubah_harga: nilai baru
	VersiDasar int    `json:"versi_dasar"` // ubah_harga: versi yang dilihat app sebelum mengubah
}

func terapkan(ctx context.Context, o op) (map[string]any, error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	var lama []byte // op_id sudah pernah diterima: kembalikan hasil lama, jangan terapkan lagi
	if err := tx.QueryRowContext(ctx, `SELECT hasil FROM op_sync WHERE op_id = $1`, o.OpID).Scan(&lama); err == nil {
		h := map[string]any{}
		err := json.Unmarshal(lama, &h)
		h["ulang"] = true
		return h, err
	}
	// --8<-- [start:jenis]
	var res sql.Result
	switch o.Jenis {
	case "tambah_stok": // selisih: bisa digabung dengan perubahan lain, urutan tidak penting
		res, err = tx.ExecContext(ctx, `UPDATE produk SET stok = stok + $1 WHERE id = $2`, o.Jumlah, o.Produk)
	case "ubah_harga": // nilai akhir: hanya kalau belum ada yang mengubah sejak app terakhir melihat
		res, err = tx.ExecContext(ctx, `UPDATE produk SET harga = $1, versi = versi + 1
			WHERE id = $2 AND versi = $3`, o.Harga, o.Produk, o.VersiDasar)
	}
	if err != nil {
		return nil, err
	}
	h := map[string]any{"op_id": o.OpID, "status": "diterapkan"}
	if n, _ := res.RowsAffected(); n == 0 {
		h["status"] = "konflik"
	}
	// --8<-- [end:jenis]
	if h["server"], err = ambil(ctx, tx, o.Produk); err != nil {
		return nil, err
	}
	// Dua kiriman bersamaan dengan op_id sama: INSERT kedua melanggar PRIMARY KEY, transaction-nya batal.
	b, _ := json.Marshal(h)
	if _, err := tx.ExecContext(ctx, `INSERT INTO op_sync (op_id, hasil) VALUES ($1, $2)`, o.OpID, b); err != nil {
		return nil, err
	}
	return h, tx.Commit()
}

func kirim(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

func main() {
	var err error
	if db, err = sql.Open("pgx", os.Getenv("DATABASE_URL")); err != nil {
		log.Fatal(err)
	}
	log.SetFlags(0)

	http.HandleFunc("GET /produk/{id}", func(w http.ResponseWriter, r *http.Request) {
		p, err := ambil(r.Context(), db, r.PathValue("id"))
		if err != nil {
			kirim(w, 404, map[string]string{"title": "Produk tidak ada"})
			return
		}
		kirim(w, 200, p)
	})
	// Pesanan online dari pembeli lain: stok berkurang di server.
	http.HandleFunc("POST /pesanan", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Produk string `json:"produk"`
			Jumlah int    `json:"jumlah"`
		}
		json.NewDecoder(r.Body).Decode(&in)
		db.ExecContext(r.Context(), `UPDATE produk SET stok = stok - $1 WHERE id = $2`, in.Jumlah, in.Produk)
		p, _ := ambil(r.Context(), db, in.Produk)
		log.Printf("server   POST /pesanan %s -%d          → stok %d", in.Produk, in.Jumlah, p.Stok)
		kirim(w, 201, p)
	})
	// Versi naif: app mengirim nilai akhir stok. Yang terakhir menulis yang menang.
	http.HandleFunc("PUT /produk/{id}/stok", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Stok int `json:"stok"`
		}
		json.NewDecoder(r.Body).Decode(&in)
		db.ExecContext(r.Context(), `UPDATE produk SET stok = $1 WHERE id = $2`, in.Stok, r.PathValue("id"))
		p, _ := ambil(r.Context(), db, r.PathValue("id"))
		log.Printf("server   PUT /produk/%s/stok %d       → stok %d", p.ID, in.Stok, p.Stok)
		kirim(w, 200, p)
	})
	http.HandleFunc("POST /sync", func(w http.ResponseWriter, r *http.Request) {
		var ops []op
		if err := json.NewDecoder(r.Body).Decode(&ops); err != nil {
			kirim(w, 400, map[string]string{"title": "Body tidak valid"})
			return
		}
		hasil := []map[string]any{}
		for _, o := range ops {
			h, err := terapkan(r.Context(), o)
			if err != nil {
				kirim(w, 500, map[string]string{"title": "Gagal menerapkan operasi"})
				return
			}
			if h["ulang"] == true {
				log.Printf("server   POST /sync %s sudah pernah diterima → kirim hasil lama, tidak diterapkan lagi", o.OpID)
			} else {
				log.Printf("server   POST /sync %s %-11s → %v", o.OpID, o.Jenis, h["status"])
			}
			hasil = append(hasil, h)
		}
		kirim(w, 200, hasil)
	})
	log.Fatal(http.ListenAndServe("127.0.0.1:"+portLab(18096), nil))
}
