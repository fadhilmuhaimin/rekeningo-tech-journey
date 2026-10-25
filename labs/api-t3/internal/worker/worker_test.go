package worker

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"sync/atomic"
	"testing"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"

	"lab/apit3/internal/push"
	"lab/apit3/internal/repo"
)

// TestMain: sama dengan internal/service (keputusan 831): TES_DB_WAJIB=1 tanpa TEST_DATABASE_URL gagal keras.
func TestMain(m *testing.M) {
	log.SetOutput(io.Discard) // log retry worker bukan bagian yang dites
	if os.Getenv("TES_DB_WAJIB") == "1" && os.Getenv("TEST_DATABASE_URL") == "" {
		fmt.Fprintln(os.Stderr, "TES_DB_WAJIB=1 tetapi TEST_DATABASE_URL kosong: tes yang butuh PostgreSQL tidak boleh dilewati")
		os.Exit(1)
	}
	os.Exit(m.Run())
}

// --8<-- [start:tes-backoff]
func TestBackoffBatas(t *testing.T) {
	dasar, maks := 2*time.Second, 60*time.Second
	kasus := []struct {
		percobaan int
		acak      float64
		harus     time.Duration
	}{
		{1, 1, 2 * time.Second}, {2, 1, 4 * time.Second}, {3, 1, 8 * time.Second}, {5, 1, 32 * time.Second},
		{6, 1, 60 * time.Second}, {40, 1, 60 * time.Second}, // batas atas dikunci di maks
		{3, 0, 0}, {3, 0.5, 4 * time.Second}, // full jitter: dari 0 sampai batas
	}
	for _, k := range kasus {
		if got := Backoff(k.percobaan, dasar, maks, k.acak); got != k.harus {
			t.Errorf("Backoff(%d, acak %v) = %s, harus %s", k.percobaan, k.acak, got, k.harus)
		}
	}
}

// --8<-- [end:tes-backoff]

func siapkan(t *testing.T) (repo.Repo, *sql.DB) {
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
	if nama != "lab" || schema != "tahap3_tes" {
		t.Fatalf("%s/%s bukan database tes lab/tahap3_tes: tidak ada data yang ditulis", nama, schema)
	}
	if _, err := db.Exec(`UPDATE outbox SET status = 'dilewati' WHERE status = 'menunggu'`); err != nil {
		t.Fatal(err)
	}
	return repo.Baru(db), db
}

// akunDenganPerangkat: akun karyawan, satu baris outbox, dan satu perangkat per token.
func akunDenganPerangkat(t *testing.T, db *sql.DB, token ...string) (akun int64) {
	t.Helper()
	if err := db.QueryRow(`SELECT greatest(coalesce(max(id), 0), 200000) + 1 FROM akun`).Scan(&akun); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO akun (id, jenis, nama, email, password_hash, nomor_karyawan)
		VALUES ($1::bigint, 'karyawan', 'Tes worker', 'w' || $1::text || '@lestari.example', '!', 'W' || $1::text)`, akun); err != nil {
		t.Fatal(err)
	}
	for i, tk := range token {
		if _, err := db.Exec(`INSERT INTO perangkat (akun_id, platform, token_push) VALUES ($1, 'android', $2)`,
			akun, fmt.Sprintf("%s-%d-%d", tk, akun, i)); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := db.Exec(`INSERT INTO outbox (akun_id, kelas, jenis, payload) VALUES ($1, 2, 'promo', '{"judul":"j","isi":"i"}')`, akun); err != nil {
		t.Fatal(err)
	}
	return akun
}

func statusOutbox(t *testing.T, db *sql.DB, akun int64) (status string, percobaan int) {
	t.Helper()
	if err := db.QueryRow(`SELECT status, percobaan FROM outbox WHERE akun_id = $1`, akun).Scan(&status, &percobaan); err != nil {
		t.Fatal(err)
	}
	return
}

func konfigTes() Konfigurasi {
	k := Bawaan()
	k.Serentak, k.DasarBackoff, k.MaksBackoff = 2, time.Millisecond, 2*time.Millisecond
	return k
}

// layananPalsu menjawab dengan kode yang diatur tes dan menghitung permintaan.
func layananPalsu(kode *atomic.Int32, n *atomic.Int32) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n.Add(1)
		w.WriteHeader(int(kode.Load()))
	}))
}

// --8<-- [start:tes-worker]
// Push gagal sementara: baris ditunda dengan backoff, dicoba lagi, dan masuk dead-letter sesudah percobaan ke-5.
func TestWorkerRetryLaluDeadLetter(t *testing.T) {
	r, db := siapkan(t)
	var kode, n atomic.Int32
	kode.Store(503)
	srv := layananPalsu(&kode, &n)
	defer srv.Close()
	akun := akunDenganPerangkat(t, db, "hidup")
	w := Baru(r, push.Baru(srv.URL, time.Second), konfigTes())
	for percobaan := 1; percobaan <= 5; percobaan++ {
		time.Sleep(10 * time.Millisecond) // lewat backoff sebelumnya
		if _, err := w.Putaran(context.Background()); err != nil {
			t.Fatal(err)
		}
		status, p := statusOutbox(t, db, akun)
		harus := "menunggu"
		if percobaan == 5 {
			harus = "mati"
		}
		if status != harus || p != percobaan {
			t.Fatalf("sesudah percobaan %d: status %s, percobaan %d", percobaan, status, p)
		}
	}
	if n.Load() != 5 {
		t.Fatalf("layanan push menerima %d permintaan, ingin 5", n.Load())
	}
	kode.Store(200)
	time.Sleep(10 * time.Millisecond)
	if _, err := w.Putaran(context.Background()); err != nil {
		t.Fatal(err)
	}
	if status, _ := statusOutbox(t, db, akun); status != "mati" || n.Load() != 5 {
		t.Fatalf("dead-letter tidak dikirim lagi: status %s, permintaan %d", status, n.Load())
	}
}

// Token yang ditolak (404) menonaktifkan perangkat dan tidak membuat baris diulang; tanpa perangkat aktif: dilewati.
func TestWorkerTokenTidakTerdaftarDilewati(t *testing.T) {
	r, db := siapkan(t)
	var kode, n atomic.Int32
	kode.Store(404)
	srv := layananPalsu(&kode, &n)
	defer srv.Close()
	akun := akunDenganPerangkat(t, db, "mati")
	w := Baru(r, push.Baru(srv.URL, time.Second), konfigTes())
	if _, err := w.Kuras(context.Background()); err != nil {
		t.Fatal(err)
	}
	var aktif bool
	db.QueryRow(`SELECT aktif FROM perangkat WHERE akun_id = $1`, akun).Scan(&aktif)
	if status, _ := statusOutbox(t, db, akun); status != "dilewati" || aktif {
		t.Fatalf("status %s, perangkat aktif %v: ingin dilewati dan perangkat nonaktif", status, aktif)
	}
	tanpa := akunDenganPerangkat(t, db)
	if _, err := w.Kuras(context.Background()); err != nil {
		t.Fatal(err)
	}
	if status, _ := statusOutbox(t, db, tanpa); status != "dilewati" {
		t.Fatalf("akun tanpa perangkat: status %s, ingin dilewati", status)
	}
}

// Baris yang terus diklaim lalu ditinggal (worker mati di tengah kirim) tidak diulang tanpa akhir: klaim ke-6 masuk
// dead-letter tanpa mengirim apa pun.
func TestWorkerBarisBeracunMasukDeadLetter(t *testing.T) {
	r, db := siapkan(t)
	var kode, n atomic.Int32
	kode.Store(200)
	srv := layananPalsu(&kode, &n)
	defer srv.Close()
	akun := akunDenganPerangkat(t, db, "hidup")
	if _, err := db.Exec(`UPDATE outbox SET percobaan = 5, klaim_sampai = now() - interval '1 second' WHERE akun_id = $1`, akun); err != nil {
		t.Fatal(err)
	}
	w := Baru(r, push.Baru(srv.URL, time.Second), konfigTes())
	if _, err := w.Putaran(context.Background()); err != nil {
		t.Fatal(err)
	}
	if status, p := statusOutbox(t, db, akun); status != "mati" || p != 6 || n.Load() != 0 {
		t.Fatalf("status %s, percobaan %d, permintaan %d: ingin mati di klaim ke-6 tanpa mengirim", status, p, n.Load())
	}
}

// --8<-- [end:tes-worker]

// Push menggantung: client berhenti menunggu di batas waktunya, bukan selamanya (ADR 22), dan baris ditunda.
func TestWorkerPushMenggantungBerhentiDiBatasWaktu(t *testing.T) {
	r, db := siapkan(t)
	selesai := make(chan struct{})
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) { <-selesai }))
	defer srv.Close()
	defer close(selesai)
	akun := akunDenganPerangkat(t, db, "gantung")
	w := Baru(r, push.Baru(srv.URL, 200*time.Millisecond), konfigTes())
	mulai := time.Now()
	if _, err := w.Putaran(context.Background()); err != nil {
		t.Fatal(err)
	}
	if lama := time.Since(mulai); lama < 200*time.Millisecond || lama > 2*time.Second {
		t.Fatalf("putaran %s, ingin sekitar batas waktu 200ms", lama)
	}
	if status, p := statusOutbox(t, db, akun); status != "menunggu" || p != 1 {
		t.Fatalf("status %s percobaan %d: ingin menunggu (ditunda), percobaan 1", status, p)
	}
}
