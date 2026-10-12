// Lab f2-review (1.39) · draf handler POST /transfers dari permintaan satu kalimat:
//
//	"Buatkan handler Go net/http untuk POST /transfers: karyawan membayar warung.
//	 Tabel akun(id, saldo) dan transaksi(dari, ke, jumlah)."
//
// ILUSTRASI: ditulis untuk lab, meniru kesalahan yang sudah muncul di Tahap 1,
// bukan rekaman keluaran satu model AI. Tabel dan kolom sama dengan api-t1 v1.
// Diperiksa go vet dan gosec, lalu diuji tes penerimaan (penerimaan_test.go).
package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
)

var db *sql.DB

// --8<-- [start:draf]
type permintaanBayar struct {
	Dari   int64 `json:"dari"`
	Ke     int64 `json:"ke"`
	Jumlah int64 `json:"jumlah"`
}

func bayar(w http.ResponseWriter, r *http.Request) {
	log.Printf("bayar: token %s", r.Header.Get("Authorization"))
	var p permintaanBayar
	json.NewDecoder(r.Body).Decode(&p)

	var saldo int64
	db.QueryRow("SELECT saldo FROM akun WHERE id = $1", p.Dari).Scan(&saldo)
	if saldo < p.Jumlah {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"error": "saldo tidak cukup"})
		return
	}
	db.Exec(fmt.Sprintf("UPDATE akun SET saldo = %d WHERE id = %d", saldo-p.Jumlah, p.Dari))
	db.Exec("UPDATE akun SET saldo = saldo + $1 WHERE id = $2", p.Jumlah, p.Ke)
	db.Exec("INSERT INTO transaksi (dari, ke, jumlah) VALUES ($1, $2, $3)", p.Dari, p.Ke, p.Jumlah)
	json.NewEncoder(w).Encode(map[string]any{"ok": true, "saldo": saldo - p.Jumlah})
}

// --8<-- [end:draf]

func main() {
	db, _ = sql.Open("pgx", os.Getenv("DATABASE_URL"))
	http.HandleFunc("POST /transfers", bayar)
	log.Fatal(http.ListenAndServe(":8080", nil))
}
