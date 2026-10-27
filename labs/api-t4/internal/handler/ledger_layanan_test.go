package handler

import (
	"bytes"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"lab/apit4/internal/modul/ledger"
	"lab/apit4/internal/repo"
	"lab/apit4/internal/service"
)

// Tes API ledger untuk service pembayaran (ADR 37, lab t4-modul): kunci layanan, Idempotency-Key, balasan 201 dan
// 200, penolakan 422, dan client ledger.Klien terhadap server sungguhan dengan PostgreSQL sungguhan.

const kunciLayananTes = "kunci-layanan-tes-lab"

// ledgerTes memasang PasangLedger di mux sendiri (bukan Rute() publik) di atas database tes.
func ledgerTes(t *testing.T, bungkus func(http.Handler) http.Handler) (*httptest.Server, *sql.DB) {
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
	mux := http.NewServeMux()
	PasangLedger(mux, service.Baru(repo.Baru(db), time.Hour), kunciLayananTes, false)
	var h http.Handler = mux
	if bungkus != nil {
		h = bungkus(mux)
	}
	srv := httptest.NewServer(h)
	t.Cleanup(srv.Close)
	return srv, db
}

func akunLedgerTes(t *testing.T, db *sql.DB, tingkat string) int64 {
	t.Helper()
	var id int64
	if err := db.QueryRow(`SELECT greatest(coalesce(max(id), 0), 200000) + 1 FROM akun`).Scan(&id); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO akun (id, jenis, nama, email, password_hash, nomor_karyawan, tingkat) VALUES ($1, 'karyawan', $2, $3, '!', $4, $5)`,
		id, fmt.Sprintf("Ledger %d", id), fmt.Sprintf("ledger%d@lestari.example", id), fmt.Sprintf("L%d", id), tingkat); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO buku (akun_id, jenis, batas_harian) VALUES ($1, 'karyawan', 500000)`, id); err != nil {
		t.Fatal(err)
	}
	return id
}

func jumlahJurnalTopup(t *testing.T, db *sql.DB, order string) int {
	t.Helper()
	var n int
	db.QueryRow(`SELECT count(*) FROM jurnal WHERE jenis = 'topup_bank' AND keterangan = $1`, "Top-up bank "+order).Scan(&n)
	return n
}

func postLedger(t *testing.T, srv *httptest.Server, kunciLayanan, idemKey, body string) int {
	t.Helper()
	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/ledger/jurnal-topup", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	if kunciLayanan != "" {
		req.Header.Set(KunciLayananHeader, kunciLayanan)
	}
	if idemKey != "" {
		req.Header.Set("Idempotency-Key", idemKey)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	return resp.StatusCode
}

func TestLedgerHTTPKunciLayananDanIdempotencyKeyWajib(t *testing.T) {
	srv, db := ledgerTes(t, nil)
	a := akunLedgerTes(t, db, "terverifikasi")
	order := fmt.Sprintf("TB-http-%d", time.Now().UnixNano())
	body := fmt.Sprintf(`{"order_id":%q,"akun_id":%d,"jumlah":100000}`, order, a)
	for nama, c := range map[string]struct {
		kunci, idem string
		ingin       int
	}{
		"tanpa kunci layanan":   {"", order, http.StatusUnauthorized},
		"kunci layanan salah":   {"salah", order, http.StatusUnauthorized},
		"tanpa Idempotency-Key": {kunciLayananTes, "", http.StatusBadRequest},
		"key bukan order_id":    {kunciLayananTes, "lain", http.StatusUnprocessableEntity},
	} {
		if got := postLedger(t, srv, c.kunci, c.idem, body); got != c.ingin {
			t.Fatalf("%s: status %d, ingin %d", nama, got, c.ingin)
		}
	}
	if n := jumlahJurnalTopup(t, db, order); n != 0 {
		t.Fatalf("jurnal %d: permintaan yang ditolak tidak menulis apa pun", n)
	}
	if got := postLedger(t, srv, kunciLayananTes, order, body); got != http.StatusCreated {
		t.Fatalf("permintaan sah: %d, ingin 201", got)
	}
	if got := postLedger(t, srv, kunciLayananTes, order, body); got != http.StatusOK {
		t.Fatalf("ulangan: %d, ingin 200", got)
	}
	if n := jumlahJurnalTopup(t, db, order); n != 1 {
		t.Fatalf("jurnal %d, ingin 1", n)
	}
}

func TestLedgerTanpaKunciLayananRuteTidakAda(t *testing.T) {
	mux := http.NewServeMux()
	PasangLedger(mux, service.Service{}, "", false)
	srv := httptest.NewServer(mux)
	defer srv.Close()
	if got := postLedger(t, srv, "", "x", `{}`); got != http.StatusNotFound {
		t.Fatalf("tanpa kunci terkonfigurasi: %d, ingin 404 (rute tidak dipasang)", got)
	}
}

func TestLedgerKlienBaruUlangDitolak(t *testing.T) {
	srv, db := ledgerTes(t, nil)
	a := akunLedgerTes(t, db, "terverifikasi")
	k := ledger.Baru(srv.URL, kunciLayananTes, 2*time.Second)
	order := fmt.Sprintf("TB-klien-%d", time.Now().UnixNano())
	p := ledger.Permintaan{OrderID: order, AkunID: a, Jumlah: 150_000}
	h1, err := k.KreditTopup(t.Context(), order, p)
	if err != nil || h1.Ulang {
		t.Fatalf("pertama: %+v, %v", h1, err)
	}
	h2, err := k.KreditTopup(t.Context(), order, p)
	if err != nil || !h2.Ulang || h2.Jurnal != h1.Jurnal {
		t.Fatalf("ulangan: %+v, %v", h2, err)
	}
	// Key yang sama untuk jumlah lain: ditolak dengan alasan, bukan jurnal kedua.
	p.Jumlah = 150_001
	_, err = k.KreditTopup(t.Context(), order, p)
	var pen ledger.Penolakan
	if !errors.Is(err, ledger.ErrDitolak) || !errors.As(err, &pen) || pen.Alasan != "key-dipakai-permintaan-lain" {
		t.Fatalf("key dipakai ulang: %v", err)
	}
	// Akun dibekukan: penolakan dengan alasan.
	db.Exec(`UPDATE akun SET status = 'dibekukan' WHERE id = $1`, a)
	o2 := order + "-b"
	_, err = k.KreditTopup(t.Context(), o2, ledger.Permintaan{OrderID: o2, AkunID: a, Jumlah: 10_000})
	if !errors.As(err, &pen) || pen.Alasan != "akun-dibekukan" {
		t.Fatalf("akun dibekukan: %v", err)
	}
	// Kunci layanan salah: ErrTidakSah, bukan penolakan data.
	salah := ledger.Baru(srv.URL, "salah", 2*time.Second)
	if _, err := salah.KreditTopup(t.Context(), o2, ledger.Permintaan{OrderID: o2, AkunID: a, Jumlah: 10_000}); !errors.Is(err, ledger.ErrTidakSah) {
		t.Fatalf("kunci layanan salah: %v", err)
	}
}

// Timeout dari sisi pemanggil bukan gagal: ledger sudah menjurnal, dan ulangan dengan key yang sama mendapat jurnal itu.
func TestLedgerTimeoutPemanggilBukanGagal(t *testing.T) {
	tahan := 600 * time.Millisecond
	srv, db := ledgerTes(t, func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			next.ServeHTTP(w, r) // ledger menulis dan COMMIT dulu...
			time.Sleep(tahan)    // ...lalu jawabannya terlambat
		})
	})
	a := akunLedgerTes(t, db, "terverifikasi")
	order := fmt.Sprintf("TB-lambat-%d", time.Now().UnixNano())
	p := ledger.Permintaan{OrderID: order, AkunID: a, Jumlah: 100_000}
	pendek := ledger.Baru(srv.URL, kunciLayananTes, 150*time.Millisecond)
	if _, err := pendek.KreditTopup(t.Context(), order, p); !errors.Is(err, ledger.ErrTidakPasti) {
		t.Fatalf("timeout: ingin ErrTidakPasti, dapat %v", err)
	}
	if n := jumlahJurnalTopup(t, db, order); n != 1 {
		t.Fatalf("jurnal %d: ledger sudah menjurnal walau pemanggil menyerah, ingin 1", n)
	}
	panjang := ledger.Baru(srv.URL, kunciLayananTes, 3*time.Second)
	h, err := panjang.KreditTopup(t.Context(), order, p)
	if err != nil || !h.Ulang {
		t.Fatalf("ulangan sesudah timeout: %+v, %v; ingin jurnal yang sama (ulang)", h, err)
	}
	if n := jumlahJurnalTopup(t, db, order); n != 1 {
		t.Fatalf("jurnal %d sesudah ulangan, ingin 1", n)
	}
}
