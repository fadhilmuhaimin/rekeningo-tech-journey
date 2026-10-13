// Lab e3-idempotency · versi ledger: titik henti lab dan main. Kode idempotency ada di main.go.
package main

import (
	"context"
	"database/sql"
	"errors"
	"flag"
	"log"
	"net/http"
	"os"
	"sync/atomic"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// ---------- titik henti lab: hanya untuk request #1, supaya urutan kejadian sama setiap kali direkam ----------

type lab struct {
	titik   string
	lepas   chan struct{} // request #2 sudah dijawab: request #1 yang ditahan boleh COMMIT
	selesai chan struct{} // request #1 sudah COMMIT atau batal
	ditutup atomic.Bool   // request #1 tidak akan mengirim response: titik henti menutup koneksinya
	w       http.ResponseWriter
}

// tutupKoneksi menutup koneksi app tanpa response: yang dilihat app sama dengan sinyal yang putus.
func tutupKoneksi(w http.ResponseWriter) {
	if c, _, err := http.NewResponseController(w).Hijack(); err == nil {
		_ = c.Close()
	}
}

func tunggu(s *Server, n int64, c chan struct{}, apa string) {
	select {
	case <-c:
	case <-time.After(10 * time.Second):
		s.jejak(n, "GAGAL: %s tidak terjadi dalam 10 detik", apa)
	}
}

func (l *lab) sebelumCommit(ctx context.Context, s *Server, n int64, w http.ResponseWriter, tx *sql.Tx) error {
	if n != 1 {
		return nil
	}
	switch l.titik {
	case "tahan-sebelum-commit":
		s.jejak(n, "titik henti lab: koneksi app ditutup, transaction ditahan sampai request #2 dijawab")
		l.w = w
		l.ditutup.Store(true)
		tutupKoneksi(w) // jejak ditulis dulu: request #2 baru ada sesudah koneksi ini ditutup
		tunggu(s, n, l.lepas, "request #2")
	case "mati-di-tengah":
		var pid int
		if err := tx.QueryRowContext(ctx, `SELECT pg_backend_pid()`).Scan(&pid); err != nil {
			return err
		}
		if _, err := s.db.ExecContext(ctx, `SELECT pg_terminate_backend($1)`, pid); err != nil {
			return err
		}
		for i := 0; ; i++ { // tunggu sampai PostgreSQL benar-benar membatalkan transaction dan melepas lock
			var ada int
			if err := s.db.QueryRowContext(ctx, `SELECT count(*) FROM pg_stat_activity WHERE pid = $1`, pid).
				Scan(&ada); err != nil {
				return err
			}
			if ada == 0 {
				break
			}
			if i == 500 {
				return errors.New("backend tidak berhenti dalam 5 detik")
			}
			time.Sleep(10 * time.Millisecond)
		}
		s.jejak(n, "titik henti lab: koneksi database diputus sebelum COMMIT (pg_terminate_backend)")
		l.w = w // koneksi app ditutup sesudah jejak terakhir request #1, lihat selesaiTanpaResponse
		l.ditutup.Store(true)
		return errMatiDiTengah
	}
	return nil
}

// selesaiTanpaResponse: request #1 yang koneksinya sudah ditutup di tengah kerja hanya mencatat akhir ceritanya.
func (l *lab) selesaiTanpaResponse(s *Server, n int64, h Hasil, err error) bool {
	if n != 1 || !l.ditutup.Load() {
		return false
	}
	if err != nil {
		s.jejak(n, "transaction batal: %v; koneksi app ditutup tanpa response", err)
	} else {
		s.jejak(n, "COMMIT; response %d %s tidak terkirim (koneksi sudah ditutup)", h.Status, h.Body)
	}
	tutupKoneksi(l.w) // koneksi yang sudah ditutup: tidak berbuat apa-apa
	close(l.selesai)
	return true
}

func (l *lab) putusSesudahCommit(s *Server, n int64, w http.ResponseWriter, h Hasil) bool {
	if n != 1 || l.titik != "putus-sesudah-commit" {
		return false
	}
	s.jejak(n, "COMMIT; titik henti lab: koneksi app ditutup sebelum response %d %s terkirim", h.Status, h.Body)
	tutupKoneksi(w)
	return true
}

// sesudahJawab: response 409 untuk request #2 baru dikirim sesudah request #1 COMMIT, jadi ulangan
// berikutnya selalu menemukan key selesai (tanpa ini, jumlah 409 bergantung pada jeda backoff).
func (l *lab) sesudahJawab(s *Server, n int64) {
	if n != 2 || l.titik != "tahan-sebelum-commit" {
		return
	}
	close(l.lepas)
	tunggu(s, n, l.selesai, "COMMIT request #1")
	s.jejak(n, "titik henti lab: response di atas dikirim sesudah request #1 COMMIT")
}

func main() {
	alamat := flag.String("alamat", "127.0.0.1:18160", "alamat HTTP")
	tanpa := flag.Bool("tanpa-idempotensi", false, "server minggu 2: abaikan Idempotency-Key (M10)")
	titik := flag.String("titik", "", "titik henti lab untuk request #1")
	flag.Parse()
	switch *titik {
	case "", "putus-sesudah-commit", "tahan-sebelum-commit", "mati-di-tengah":
	default:
		log.Fatalf("titik tidak dikenal: %s", *titik)
	}
	db, err := sql.Open("pgx", os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}
	if err := db.Ping(); err != nil {
		log.Fatal(err)
	}
	s := &Server{db: db, tanpaIdempotensi: *tanpa,
		lab: &lab{titik: *titik, lepas: make(chan struct{}), selesai: make(chan struct{})}}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /transfers", s.transfers)
	srv := &http.Server{Addr: *alamat, Handler: mux, ReadHeaderTimeout: 5 * time.Second}
	log.Fatal(srv.ListenAndServe())
}
