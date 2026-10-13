package main

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Skema c4_login memuat subset kolom login dari tabel akun api-t2 sesudah migration 000009
// (nomor_karyawan, wajib_ganti_password, gagal_login, terkunci_sampai). Kolom ledger (buku, jurnal,
// saldo) tidak ada: lab ini hanya tentang login, bukan uang. jenis mengikuti 000009.
// Nama schema terpisah supaya aman di database bersama (keputusan 80). application_name di DATABASE_URL.
const skema = `
DROP SCHEMA IF EXISTS c4_login CASCADE;
CREATE SCHEMA c4_login;
SET search_path = c4_login;

CREATE TABLE akun (
  id                   bigint      PRIMARY KEY,
  jenis                text        NOT NULL CHECK (jenis IN ('karyawan', 'warung', 'admin', 'sistem')),
  nama                 text        NOT NULL,
  email                text        NOT NULL UNIQUE,
  password_hash        text        NOT NULL,                       -- argon2id format PHC
  nomor_karyawan       text        UNIQUE,                         -- tujuan transfer (api-t2 000009)
  wajib_ganti_password boolean     NOT NULL DEFAULT false,         -- M16, ADR 20
  gagal_login          integer     NOT NULL DEFAULT 0 CHECK (gagal_login >= 0),
  terkunci_sampai      timestamptz
);
`

type seedAkun struct {
	id       int64
	jenis    string
	nama     string
	email    string
	password string // password sementara/awal; di produksi tidak pernah disimpan, hanya hash-nya
	wajib    bool
}

// seedAkunDaftar: data FIKTIF. Nomor akun dan nama meniru seed api-t1/api-t2 (keputusan 413).
// Semua password di sini lemah dan fiktif, ditulis di kode lab (bukan rahasia):
//   - 418 Warung Ani: password kuat, sudah diganti. Jadi sasaran kunci-akun DoS di rekaman.
//   - 419 Budi: password kuat, sudah diganti.
//   - 514 Karyawan 514: memakai ulang password yang ada di daftar bocor -> credential stuffing berhasil.
//   - 515 Karyawan 515: masih password sementara dari admin, wajib_ganti_password = true.
//   - 516..543: password kuat dan unik, tidak ada di daftar bocor -> stuffing gagal.
func seedAkunDaftar() []seedAkun {
	daftar := []seedAkun{
		{418, "warung", "Warung Ani", "warung.ani@lestari.example", "payung-biru-ani-2026", false},
		{419, "karyawan", "Budi", "budi@lestari.example", "kopi-pagi-budi-2026x", false},
		{514, "karyawan", "Karyawan 514", "karyawan514@lestari.example", "rekeningo123", false},
		{515, "karyawan", "Karyawan 515", "karyawan515@lestari.example", "sementara-515", true},
	}
	for id := int64(516); id <= 543; id++ {
		daftar = append(daftar, seedAkun{
			id:    id,
			jenis: "karyawan",
			nama:  fmt.Sprintf("Karyawan %d", id),
			email: fmt.Sprintf("karyawan%d@lestari.example", id),
			// Password kuat unik per akun; di luar daftar bocor.
			password: fmt.Sprintf("kampus-aman-%d-ungu", id),
			wajib:    false,
		})
	}
	return daftar
}

func seed(ctx context.Context, pool *pgxpool.Pool) error {
	if _, err := pool.Exec(ctx, skema); err != nil {
		return err
	}
	for _, a := range seedAkunDaftar() {
		// Salt deterministik HANYA untuk lab (rekaman identik tiap run). Di produksi salt wajib acak.
		hash := enkodeHash(a.password, saltLab(a.id, "awal"))
		var nomor any
		if a.jenis == "karyawan" {
			nomor = fmt.Sprintf("K%05d", a.id)
		}
		_, err := pool.Exec(ctx,
			`INSERT INTO akun (id, jenis, nama, email, password_hash, nomor_karyawan, wajib_ganti_password)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			a.id, a.jenis, a.nama, a.email, hash, nomor, a.wajib)
		if err != nil {
			return err
		}
	}
	return nil
}
