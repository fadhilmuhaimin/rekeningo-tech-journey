package service

import (
	"context"
	"testing"
	"time"
)

// Urutan lock di jalur kartu: buku pemilik lebih dulu, buku sistem dana_tertahan sesudahnya (ADR 13). Otorisasi
// mengunci buku pemilik lalu mengubah dana_tertahan lewat CatatJurnal. Reversal dan job kedaluwarsa dulu mengunci
// menurut id buku; buku dana_tertahan (migrasi 000020) berid lebih kecil daripada buku pemilik (seed), jadi mereka
// memegang dana_tertahan lalu menunggu buku pemilik: deadlock (SQLSTATE 40P01) dengan otorisasi pemilik yang sama.
//
// Transaction `otorisasi` di bawah meniru dua langkah itu dengan urutan yang pasti: ia memegang buku pemilik, reversal
// pemilik yang sama dimulai dan menunggu, lalu transaction itu mengubah dana_tertahan. Tanpa urutan yang benar,
// PostgreSQL membatalkan salah satu dari keduanya.
func TestReversalMengunciBukuPemilikSebelumDanaTertahan(t *testing.T) {
	svc, db := svcKartu(t, Dep{})
	ctx := context.Background()
	akun := pemakaiBaru(t, db, "terverifikasi", 1_000_000)
	id := holdBaru(t, svc, db, akun, 10_000)

	otorisasi, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	defer otorisasi.Rollback()
	if _, err := otorisasi.Exec(`SELECT id FROM buku WHERE akun_id = $1 FOR UPDATE`, akun); err != nil {
		t.Fatal(err)
	}
	selesai := make(chan error, 1)
	go func() { _, err := svc.Reversal(ctx, id); selesai <- err }()

	// Tunggu sampai ada backend yang diblok lock buku (reversal), bukan jeda tetap.
	for mulai := time.Now(); ; {
		var n int
		if err := db.QueryRow(`SELECT count(*) FROM pg_stat_activity
			WHERE datname = current_database() AND application_name = $1 AND pid <> pg_backend_pid() AND wait_event_type = 'Lock'
			  AND query LIKE '%FROM buku%FOR UPDATE%'`, appTes).Scan(&n); err != nil {
			t.Fatal(err)
		}
		if n >= 1 {
			break
		}
		if time.Since(mulai) > 5*time.Second {
			t.Fatal("reversal tidak menunggu lock buku pemilik dalam 5 detik")
		}
		time.Sleep(20 * time.Millisecond)
	}
	// Langkah kedua otorisasi: ubah saldo_cache dana_tertahan. Bila reversal sudah memegang buku itu, di sinilah
	// deadlock terjadi dan salah satu transaction dibatalkan.
	if _, err := otorisasi.Exec(`UPDATE buku SET saldo_cache = saldo_cache WHERE akun_id IS NULL AND jenis = 'dana_tertahan'`); err != nil {
		t.Fatalf("otorisasi mengubah dana_tertahan: %v (reversal memegang dana_tertahan sebelum buku pemilik)", err)
	}
	if err := otorisasi.Commit(); err != nil {
		t.Fatal(err)
	}
	select {
	case err := <-selesai:
		if err != nil {
			t.Fatalf("reversal: %v; harus selesai sesudah otorisasi COMMIT", err)
		}
	case <-time.After(10 * time.Second):
		t.Fatal("reversal menggantung sesudah otorisasi COMMIT")
	}
	if s := saldo(t, db, akun); s != 1_000_000 {
		t.Fatalf("saldo %d, harus kembali 1000000 sesudah reversal", s)
	}
}
