package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"lab/apit2/internal/handler"
	"lab/apit2/internal/repo"
	"lab/apit2/internal/service"
)

// server merakit router, handler, service, dan PostgreSQL seperti main, di port acak dari httptest.
// Alamat database dari TEST_DATABASE_URL, dengan penjaga yang sama seperti siapkan di internal/service.
func server(t *testing.T) (*httptest.Server, *sql.DB) {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL kosong: tes ini butuh PostgreSQL")
	}
	db, err := sql.Open("pgx", url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	var nama, schema string
	if err := db.QueryRow("SELECT current_database(), coalesce(current_schema(), '')").Scan(&nama, &schema); err != nil {
		t.Fatal(err)
	}
	if nama != "lab" || schema != "tahap1" {
		t.Fatalf("%s/%s bukan database tes lab/tahap1: tidak ada data yang ditulis", nama, schema)
	}
	srv := httptest.NewServer(handler.Baru(service.Baru(repo.Baru(db), time.Hour)).Rute())
	t.Cleanup(srv.Close)
	return srv, db
}

func minta(t *testing.T, method, url, token, body string) *http.Response {
	t.Helper()
	req, _ := http.NewRequest(method, url, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { res.Body.Close() })
	return res
}

func loginBudi(t *testing.T, srv *httptest.Server) string {
	t.Helper()
	var sesi struct{ Token string }
	res := minta(t, "POST", srv.URL+"/login", "", `{"email": "budi@lestari.example", "password": "sementara-419"}`)
	json.NewDecoder(res.Body).Decode(&sesi)
	return sesi.Token
}

// --8<-- [start:http]
// Tes HTTP: yang diperiksa adalah yang dibaca app, yaitu status code, Content-Type, dan nama field.
func TestBayarDitolakDenganNamaField(t *testing.T) {
	srv, _ := server(t)
	token := loginBudi(t, srv)
	for _, c := range []struct {
		body   string
		status int
	}{
		{`{"ke": 418, "jumlah": -70000}`, 422}, // M1: aturan di service
		{`{"ke": 418, "amount": 70000}`, 400},  // M2: field wajib di handler
	} {
		res := minta(t, "POST", srv.URL+"/transfers", token, c.body)
		var p struct{ Errors []map[string]string }
		json.NewDecoder(res.Body).Decode(&p)
		jenis := res.Header.Get("Content-Type")
		if res.StatusCode != c.status || jenis != "application/problem+json" || len(p.Errors) != 1 || p.Errors[0]["field"] != "jumlah" {
			t.Errorf("%s: %d %s %v, ingin %d problem+json field jumlah", c.body, res.StatusCode, jenis, p.Errors, c.status)
		}
	}
}

// --8<-- [end:http]

// --8<-- [start:pemilik]
// Tes "token A meminta data B" (1.28) di keempat endpoint ber-ID: data orang lain dijawab sama dengan data yang tidak ada.
func TestAkunOrangLainDijawab404(t *testing.T) {
	srv, db := server(t)
	token := loginBudi(t, srv)
	// Satu baris transaksi Dimas (417) ke Warung Ani (418) tanpa Budi; dihapus lagi sesudah tes.
	var milikDimas int64
	if err := db.QueryRow("INSERT INTO transaksi (dari, ke, jumlah) VALUES (417, 418, 10000) RETURNING id").Scan(&milikDimas); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Exec("DELETE FROM transaksi WHERE id = $1", milikDimas) })
	hari := time.Now().Format("2006-01-02")
	for _, c := range []struct {
		path   string
		status int
	}{
		{"/akun/419", 200},  // akun Budi sendiri
		{"/akun/417", 404},  // akun Dimas
		{"/akun/9999", 404}, // akun yang tidak ada
		{"/akun/417/riwayat", 404},
		{"/warung/418/laporan?dari=" + hari + "&sampai=" + hari, 404},
		{fmt.Sprintf("/transfers/%d", milikDimas), 404},
	} {
		if res := minta(t, "GET", srv.URL+c.path, token, ""); res.StatusCode != c.status {
			t.Errorf("Budi GET %s: %d, ingin %d", c.path, res.StatusCode, c.status)
		}
	}
}

// --8<-- [end:pemilik]
