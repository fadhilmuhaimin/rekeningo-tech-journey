// Lab f2-review (1.39) · tes penerimaan dari spesifikasi 1.39, dijalankan ke draf satu kalimat.
// Satu tes = satu aturan atau sifat wajib di spesifikasi. Database PostgreSQL sungguhan dari
// TEST_DATABASE_URL (1.32); tanpa variabel itu tes dilewati (SKIP).
package main

import (
	"bytes"
	"database/sql"
	"log"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

const tokenDimas = "token-dimas" // versi benar memetakan token ke akun 417 (1.27); draf tidak membacanya

// siapkan membuat ulang schema f2review dari schema.sql dan menangkap log draf.
func siapkan(t *testing.T) *bytes.Buffer {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL kosong: tes ini butuh PostgreSQL")
	}
	var err error
	if db, err = sql.Open("pgx", url); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	skema, err := os.ReadFile("schema.sql")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec(string(skema)); err != nil {
		t.Fatal(err)
	}
	var catatan bytes.Buffer
	log.SetFlags(0)
	log.SetOutput(&catatan)
	return &catatan
}

// kirim meniru app: POST /transfers dengan token di header Authorization.
func kirim(token, body string) int {
	r := httptest.NewRequest("POST", "/transfers", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	if token != "" {
		r.Header.Set("Authorization", "Bearer "+token)
	}
	w := httptest.NewRecorder()
	bayar(w, r)
	return w.Code
}

func angka(t *testing.T, query string, arg ...any) (n int64) {
	t.Helper()
	if err := db.QueryRow(query, arg...).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func saldo(t *testing.T, id int64) int64 { return angka(t, "SELECT saldo FROM akun WHERE id = $1", id) }
func total(t *testing.T) int64          { return angka(t, "SELECT sum(saldo) FROM akun") }

// --8<-- [start:tes]
// Demo: request yang sama dengan contoh curl draf, body memuat dari.
func TestDemoSaldoPindah(t *testing.T) {
	siapkan(t)
	kirim(tokenDimas, `{"dari":417,"ke":418,"jumlah":25000}`)
	if saldo(t, 417) != 225000 || saldo(t, 418) != 50000 {
		t.Errorf("saldo Dimas %d, Warung Ani %d; mau 225000 dan 50000", saldo(t, 417), saldo(t, 418))
	}
}

// Aturan 1 dan kontrak: body dari app hanya ke dan jumlah; pengirim dari token.
func TestAturan1BodyDariApp(t *testing.T) {
	siapkan(t)
	if kode := kirim(tokenDimas, `{"ke":418,"jumlah":25000}`); kode != 201 || saldo(t, 417) != 225000 {
		t.Errorf("status %d, saldo Dimas %d; mau 201 dan 225000", kode, saldo(t, 417))
	}
}

// Aturan 1: dari di body tidak pernah dipakai. Token Dimas tidak boleh memindah uang Budi.
func TestAturan1DariDiBodyDiabaikan(t *testing.T) {
	siapkan(t)
	kirim(tokenDimas, `{"dari":419,"ke":418,"jumlah":25000}`)
	if saldo(t, 419) != 225000 {
		t.Errorf("saldo Budi %d; mau tetap 225000", saldo(t, 419))
	}
}

// Aturan 2: jumlah 1 sampai 200.000. Di luar itu 422 dan tidak ada saldo yang berubah.
func TestAturan2JumlahMinus(t *testing.T) {
	siapkan(t)
	if kode := kirim(tokenDimas, `{"dari":417,"ke":418,"jumlah":-50000}`); kode != 422 || total(t) != 500000 {
		t.Errorf("status %d, total saldo %d; mau 422 dan 500000", kode, total(t))
	}
}

// Aturan 3 dan sifat wajib 1: ke harus akun warung; satu transaction, total saldo tetap.
func TestAturan3KeTidakAda(t *testing.T) {
	siapkan(t)
	if kode := kirim(tokenDimas, `{"dari":417,"ke":999,"jumlah":25000}`); kode != 422 || total(t) != 500000 {
		t.Errorf("status %d, total saldo %d; mau 422 dan 500000", kode, total(t))
	}
}

// Aturan 4: tanpa token 401, tidak ada saldo yang berubah.
func TestAturan4TanpaToken(t *testing.T) {
	siapkan(t)
	if kode := kirim("", `{"dari":417,"ke":418,"jumlah":25000}`); kode != 401 || saldo(t, 417) != 250000 {
		t.Errorf("status %d, saldo Dimas %d; mau 401 dan 250000", kode, saldo(t, 417))
	}
}

// Sifat wajib 3: token tidak pernah masuk log (ADR 11).
func TestSifat3TokenTidakDiLog(t *testing.T) {
	catatan := siapkan(t)
	kirim(tokenDimas, `{"dari":417,"ke":418,"jumlah":25000}`)
	if strings.Contains(catatan.String(), tokenDimas) {
		t.Errorf("log memuat token: %q", strings.TrimSpace(catatan.String()))
	}
}

// --8<-- [end:tes]
