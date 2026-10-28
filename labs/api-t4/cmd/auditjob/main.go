// Command auditjob: pemeriksaan harian audit_log berantai dan jangkar hash di luar database (ADR 43, lab t4-audit).
// Membaca log sebagai role baca-saja, mencocokkan jangkar lama, lalu mencatat jangkar baru hanya bila semuanya cocok.
// Keluar 0 bila sehat, 2 bila rantai putus atau jangkar tidak cocok, 1 bila gagal dijalankan.
package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"

	"lab/apit4/internal/jangkar"
	"lab/apit4/internal/repo"
)

func main() {
	dsn := flag.String("db", os.Getenv("DATABASE_URL"), "PostgreSQL (role baca-saja cukup)")
	berkas := flag.String("jangkar", "", "berkas jangkar di luar database (wajib)")
	flag.Parse()
	if *berkas == "" || *dsn == "" {
		fmt.Fprintln(os.Stderr, "auditjob: -jangkar dan -db wajib")
		os.Exit(1)
	}
	db, err := sql.Open("pgx", *dsn)
	if err != nil {
		fmt.Fprintln(os.Stderr, "auditjob:", err)
		os.Exit(1)
	}
	defer db.Close()
	ctx, batal := context.WithTimeout(context.Background(), 30*time.Second)
	defer batal()
	l, err := jangkar.Jalankan(ctx, repo.Baru(db), jangkar.Berkas{Path: *berkas})
	if err != nil {
		fmt.Fprintln(os.Stderr, "auditjob:", err)
		os.Exit(1)
	}
	rantai := "utuh"
	if l.RusakDiID != 0 {
		rantai = fmt.Sprintf("putus di baris %d", l.RusakDiID)
	}
	fmt.Printf("baris=%d rantai=%s jangkar_lama=%d temuan=%d\n", l.Baris, rantai, l.JangkarLama, len(l.Temuan))
	for _, t := range l.Temuan {
		fmt.Printf("jangkar nomor %d: %s\n", t.ID, t.Masalah)
	}
	if l.JangkarBaru != nil {
		fmt.Printf("jangkar baru: nomor %d\n", l.JangkarBaru.ID)
	}
	if !l.Sehat() {
		os.Exit(2)
	}
}
