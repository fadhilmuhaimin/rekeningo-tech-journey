//go:build t4modul

package modul_test

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"

	"lab/apit4/internal/modul/pembayaran"
)

// M32 pada versi tanpa batas: satu schema, satu role aplikasi (api_t4), modul pembayaran membaca akun.nama dengan
// SQL langsung. Schema dibangun labs/t4-modul/run.py (T4M_SCHEMA_SATU), sebelum pembagian modul.

func bukaSatu(t *testing.T, role string) *sql.DB {
	t.Helper()
	skema := os.Getenv("T4M_SCHEMA_SATU")
	if skema == "" {
		t.Fatal("T4M_SCHEMA_SATU kosong: tes ini dijalankan oleh labs/t4-modul/run.py")
	}
	pass := role
	db, err := sql.Open("pgx", fmt.Sprintf("postgres://%s:%s@%s/lab?search_path=%s&application_name=t4-modul-satu-%d", role, pass, host(t), skema, os.Getpid()))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

func TestM32TanpaBatasRenameLolosDiCIGagalDiProduksi(t *testing.T) {
	pemilik := bukaSatu(t, "lab")
	var akunID int64
	var nama string
	if err := pemilik.QueryRow(`SELECT id, nama FROM akun WHERE id = 419`).Scan(&akunID, &nama); err != nil {
		t.Fatal(err)
	}
	app := bukaSatu(t, "api_t4") // role aplikasi yang sama untuk semua modul
	teks, err := pembayaran.TeksTopupLangsung(context.Background(), app, akunID, 200_000)
	if err != nil || teks != "Top-up Rp200000 masuk ke "+nama {
		t.Fatalf("sebelum rename: %q, %v", teks, err)
	}
	lab("sebelum rename, role aplikasi (satu role untuk semua modul): pembayaran.TeksTopupLangsung -> %q", teks)
	if _, err := pemilik.Exec(`ALTER TABLE akun RENAME COLUMN nama TO nama_tampil`); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { pemilik.Exec(`ALTER TABLE akun RENAME COLUMN nama_tampil TO nama`) })
	lab("migration tim Merchant: ALTER TABLE akun RENAME COLUMN nama TO nama_tampil")
	_, err = pembayaran.TeksTopupLangsung(context.Background(), app, akunID, 200_000)
	kode, pesan := pg(err)
	if kode != "42703" {
		t.Fatalf("sesudah rename: kode %q, ingin 42703", kode)
	}
	lab("sesudah rename, pembayaran.TeksTopupLangsung dengan role dan skema yang sama -> %s (%s)", pesan, kode)
}
