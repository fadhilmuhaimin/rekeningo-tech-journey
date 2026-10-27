package pembayaran

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"fmt"
	"io"
	"testing"
)

// Tes modul pembayaran dengan data tiruan, seperti tes tiap tim pada M32: tidak ada skema tim lain di sini, jadi
// tes ini lolos sebelum dan sesudah kolom akun.nama diganti nama. Driver tiruan membalas satu baris untuk perintah
// apa pun.

type driverTiruan struct{}

func (driverTiruan) Open(string) (driver.Conn, error) { return connTiruan{}, nil }

type connTiruan struct{}

func (connTiruan) Prepare(q string) (driver.Stmt, error) { return stmtTiruan{}, nil }
func (connTiruan) Close() error                          { return nil }
func (connTiruan) Begin() (driver.Tx, error)             { return nil, fmt.Errorf("tidak dipakai") }

type stmtTiruan struct{}

func (stmtTiruan) Close() error  { return nil }
func (stmtTiruan) NumInput() int { return -1 }
func (stmtTiruan) Exec(args []driver.Value) (driver.Result, error) {
	return nil, fmt.Errorf("tidak dipakai")
}
func (stmtTiruan) Query(args []driver.Value) (driver.Rows, error) { return &barisTiruan{}, nil }

type barisTiruan struct{ selesai bool }

func (b *barisTiruan) Columns() []string { return []string{"nama"} }
func (b *barisTiruan) Close() error      { return nil }
func (b *barisTiruan) Next(dest []driver.Value) error {
	if b.selesai {
		return io.EOF
	}
	b.selesai = true
	dest[0] = "Budi"
	return nil
}

func init() { sql.Register("modul-tiruan", driverTiruan{}) }

func TestTeksTopupLangsungDenganDataTiruanLolos(t *testing.T) {
	db, err := sql.Open("modul-tiruan", "")
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	teks, err := TeksTopupLangsung(context.Background(), db, 419, 200_000)
	if err != nil || teks != "Top-up Rp200000 masuk ke Budi" {
		t.Fatalf("teks %q, galat %v", teks, err)
	}
}

type namaTiruan struct{}

func (namaTiruan) NamaTampil(context.Context, int64) (string, error) { return "Budi", nil }

func TestTeksTopupLewatKontrakAkunDenganDataTiruan(t *testing.T) {
	teks, err := TeksTopup(context.Background(), namaTiruan{}, 419, 200_000)
	if err != nil || teks != "Top-up Rp200000 masuk ke Budi" {
		t.Fatalf("teks %q, galat %v", teks, err)
	}
}
