package handler

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

	"lab/apit5/internal/objek"
	"lab/apit5/internal/repo"
	"lab/apit5/internal/service"
)

// Tes HTTP untuk endpoint Tahap 5 (lab-api-t5) dengan PostgreSQL sungguhan: laporan merchant (hanya dengan mode rentan
// laporan-primary), pengumuman, dan cicilan. Server dibuat per tes dengan mode yang diminta.
func serverT5(t *testing.T, mode string) (*httptest.Server, *sql.DB) {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		if os.Getenv("TES_DB_WAJIB") == "1" {
			t.Fatal("TES_DB_WAJIB=1 tetapi TEST_DATABASE_URL kosong")
		}
		t.Skip("TEST_DATABASE_URL kosong: tes ini butuh PostgreSQL")
	}
	db, err := sql.Open("pgx", url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	var nama, schema string
	db.QueryRow("SELECT current_database(), coalesce(current_schema(), '')").Scan(&nama, &schema)
	if nama != "lab" || schema != schemaTes() {
		t.Fatalf("%s/%s bukan database tes lab/%s", nama, schema, schemaTes())
	}
	dep := service.Dep{RahasiaWebhook: []string{rahasiaHTTP}, Objek: objek.Dir{Akar: t.TempDir()}, TanpaLapis: map[string]bool{}}
	svc := service.Baru(repo.Baru(db), time.Hour).DenganT4(dep).DenganMode(mode)
	srv := httptest.NewServer(Baru(svc).DenganRentan(mode).Rute())
	t.Cleanup(srv.Close)
	return srv, db
}

// akunTanpaBuku: akun admin atau hr (tanpa buku, seperti akunBaru di tes service).
func akunTanpaBuku(t *testing.T, db *sql.DB, jenis string) string {
	t.Helper()
	var id int64
	db.QueryRow(`SELECT greatest(coalesce(max(id), 0), 100000) + 1 FROM akun`).Scan(&id)
	email := fmt.Sprintf("t5%d@lestari.example", id)
	if _, err := db.Exec(`INSERT INTO akun (id, jenis, nama, email, password_hash) VALUES ($1, $2, $3, $4, $5)`,
		id, jenis, fmt.Sprintf("Tes %d", id), email, hashSandi(t)); err != nil {
		t.Fatal(err)
	}
	return email
}

func idAkun(t *testing.T, db *sql.DB, email string) int64 {
	t.Helper()
	var id int64
	if err := db.QueryRow(`SELECT id FROM akun WHERE email = $1`, email).Scan(&id); err != nil {
		t.Fatal(err)
	}
	return id
}

func TestRuteLaporanMerchantHanyaDenganModeRentan(t *testing.T) {
	srv, db := serverT5(t, "")
	_, email := akunDB(t, db, "merchant", "terverifikasi", 0)
	id := idAkun(t, db, email)
	tok := masuk(t, srv, email)
	path := fmt.Sprintf("/merchant/%d/laporan/hari-ini", id)
	if code, _, _ := kirimReq(t, srv, "GET", path, tok, nil); code != 404 {
		t.Fatalf("tanpa mode laporan-primary: %d, ingin 404 (rute tidak ada)", code)
	}
	srv2, _ := serverT5(t, service.RentanLaporanPrimary)
	tok2 := masuk(t, srv2, email)
	code, _, isi := kirimReq(t, srv2, "GET", path, tok2, nil)
	var l struct {
		Merchant   int64  `json:"merchant"`
		Total      int64  `json:"total"`
		Jumlah     int64  `json:"jumlah_transaksi"`
		DibacaDari string `json:"dibaca_dari"`
	}
	json.Unmarshal([]byte(isi), &l)
	if code != 200 || l.Merchant != id || l.DibacaDari != "primary" || l.Jumlah != 0 {
		t.Fatalf("laporan pemilik: %d %s", code, isi)
	}
	if code, _, _ := kirimReq(t, srv2, "GET", path, "", nil); code != 401 {
		t.Fatalf("laporan tanpa token: %d, ingin 401", code)
	}
	_, lain := akunDB(t, db, "merchant", "terverifikasi", 0)
	if code, _, isi := kirimReq(t, srv2, "GET", path, masuk(t, srv2, lain), nil); code != 404 || tipe(isi) != "/problems/tidak-ditemukan" {
		t.Fatalf("laporan merchant lain: %d %s, ingin 404 tidak ditemukan", code, isi)
	}
}

func TestPengumumanEndpoint(t *testing.T) {
	srv, db := serverT5(t, "")
	admin := akunTanpaBuku(t, db, "admin")
	_, biasa := akunDB(t, db, "pemakai", "terverifikasi", 0)
	if code, _, _ := kirimReq(t, srv, "POST", "/pengumuman", "", map[string]string{"judul": "x"}); code != 401 {
		t.Fatalf("tanpa token: %d, ingin 401", code)
	}
	if code, _, isi := kirimReq(t, srv, "POST", "/pengumuman", masuk(t, srv, biasa), map[string]string{"judul": "Bukan hak pemakai"}); code != 403 {
		t.Fatalf("pemakai membuat pengumuman: %d %s, ingin 403", code, isi)
	}
	tok := masuk(t, srv, admin)
	if code, _, _ := kirimReq(t, srv, "POST", "/pengumuman", tok, map[string]string{}); code != 400 {
		t.Fatalf("tanpa judul: %d, ingin 400 field wajib", code)
	}
	var sebelum int
	db.QueryRow(`SELECT count(*) FROM outbox WHERE jenis = 'pengumuman'`).Scan(&sebelum)
	code, _, isi := kirimReq(t, srv, "POST", "/pengumuman", tok, map[string]string{"judul": "Pemeliharaan Sabtu malam"})
	if code != 201 {
		t.Fatalf("admin membuat pengumuman: %d %s", code, isi)
	}
	var sesudah int
	db.QueryRow(`SELECT count(*) FROM outbox WHERE jenis = 'pengumuman' AND tujuan = 'stream'`).Scan(&sesudah)
	if sesudah-sebelum != 1 {
		t.Fatalf("baris outbox stream bertambah %d, ingin 1", sesudah-sebelum)
	}
}

func TestCicilanEndpoint(t *testing.T) {
	srv, db := serverT5(t, "")
	_, pemilik := akunDB(t, db, "pemakai", "terverifikasi", 0)
	_, merchant := akunDB(t, db, "merchant", "terverifikasi", 0)
	mid := idAkun(t, db, merchant)
	tok := masuk(t, srv, pemilik)
	mulai := time.Now().AddDate(0, 0, 1).Format("2006-01-02")
	badan := map[string]any{"jenis": "cicilan", "merchant_akun_id": mid, "jumlah_per_angsuran": 25000, "jumlah_angsuran": 3, "hari_tagih": 10, "mulai": mulai}
	code, _, isi := kirimReq(t, srv, "POST", "/cicilan", tok, badan)
	var dibuat struct{ ID int64 }
	json.Unmarshal([]byte(isi), &dibuat)
	if code != 201 || dibuat.ID == 0 {
		t.Fatalf("buat cicilan: %d %s", code, isi)
	}
	code, _, isi = kirimReq(t, srv, "GET", fmt.Sprintf("/cicilan/%d", dibuat.ID), tok, nil)
	var j struct {
		Jadwal   struct{ Status string }
		Angsuran []struct {
			Ke     int
			Status string
		}
	}
	json.Unmarshal([]byte(isi), &j)
	if code != 200 || len(j.Angsuran) != 3 || j.Jadwal.Status != "aktif" || j.Angsuran[0].Status != "menunggu" || j.Angsuran[2].Ke != 3 {
		t.Fatalf("lihat cicilan: %d %s", code, isi)
	}
	_, lain := akunDB(t, db, "pemakai", "terverifikasi", 0)
	if code, _, isi := kirimReq(t, srv, "GET", fmt.Sprintf("/cicilan/%d", dibuat.ID), masuk(t, srv, lain), nil); code != 404 {
		t.Fatalf("jadwal milik orang lain: %d %s, ingin 404", code, isi)
	}
	for nama, b := range map[string]map[string]any{
		"jenis salah":       {"jenis": "pinjaman", "jumlah_per_angsuran": 1000, "jumlah_angsuran": 3, "hari_tagih": 10, "mulai": mulai},
		"tabungan merchant": {"jenis": "tabungan", "merchant_akun_id": mid, "jumlah_per_angsuran": 1000, "jumlah_angsuran": 3, "hari_tagih": 10, "mulai": mulai},
		"tanggal salah":     {"jenis": "tabungan", "jumlah_per_angsuran": 1000, "jumlah_angsuran": 3, "hari_tagih": 10, "mulai": "kemarin"},
		"hari tagih 29":     {"jenis": "tabungan", "jumlah_per_angsuran": 1000, "jumlah_angsuran": 3, "hari_tagih": 29, "mulai": mulai},
	} {
		if code, _, isi := kirimReq(t, srv, "POST", "/cicilan", tok, b); code != 422 {
			t.Errorf("%s: %d %s, ingin 422", nama, code, strings.TrimSpace(isi))
		}
	}
	if code, _, _ := kirimReq(t, srv, "POST", "/cicilan", tok, map[string]any{"jenis": "tabungan"}); code != 400 {
		t.Errorf("field wajib hilang: %d, ingin 400", code)
	}
	if code, _, _ := kirimReq(t, srv, "GET", "/cicilan/abc", tok, nil); code != 404 {
		t.Errorf("id bukan angka: %d, ingin 404", code)
	}
	_ = http.StatusOK
}
