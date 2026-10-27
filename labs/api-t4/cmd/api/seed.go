package main

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

// PasswordLab dipakai semua akun data lab Tahap 4. Bukan secret: data lab di database yang dibuat ulang dari nol.
// Satu hash dipakai bersama, karena 10.000 hash bcrypt (±50 ms) akan memperlambat setiap rekaman tanpa mengajarkan apa pun.
const PasswordLab = "sementara-tahap-4"

// Data lab Tahap 4 = data Tahap 3 (naskah Latar dan registry tahap[2]: enam kota, 10.000 karyawan, 60 warung, satu
// admin Keuangan, satu akun hr per kota; nama tokoh dan nomor akun sama dengan Tahap 2: Dimas 417, Warung Ani 418,
// Budi 419, Warung Sari 502, Warung Mie Pak Joko 503, Citra 504), semuanya terverifikasi lewat HR (PRD v4), ditambah
// pihak publik: dua akun risk (Ratih 420 dan satu lagi 421), 21 merchant luar (Toko Sumber Rejeki milik Bu Marni 30001,
// Toko Andalan 30002, satu merchant yang belum disetujui 30021), dan 200 pemakai umum (Dina 40001 belum terverifikasi
// dengan saldo Rp900.000, Eko 40002 terverifikasi, sisanya 40003 sampai 40200). Jumlah merchant dan pemakai jauh di
// bawah angka naskah (±400 dan 100.000): lab memerlukan akun untuk beban dan aturan, bukan populasi.
var kota = []string{"Jakarta", "Bandung", "Surabaya", "Medan", "Semarang", "Makassar"}

const (
	karyawanPusat   = 1000 // kota 1, termasuk Dimas, Budi, Citra
	karyawanPerKota = 1800 // kota 2 sampai 6: 5 x 1.800 = 9.000
	tunjangan       = 250_000
)

type menuLab struct {
	nama        string
	harga, stok int
}

// menuLab: 40 item per warung (R3-37: 60 warung x 40 item). Sepuluh pertama bernama, sisanya "Menu n".
func daftarMenu() []menuLab {
	nama := []menuLab{{"Nasi goreng", 25000, 50}, {"Ayam geprek", 28000, 30}, {"Mie ayam", 20000, 50},
		{"Soto ayam", 22000, 50}, {"Gado-gado", 18000, 40}, {"Nasi rames", 20000, 60}, {"Bakso", 18000, 50},
		{"Pecel lele", 24000, 30}, {"Es teh", 5000, 100}, {"Kopi susu", 12000, 80}}
	for n := 11; n <= 40; n++ {
		nama = append(nama, menuLab{fmt.Sprintf("Menu %d", n), 12000 + (n%6)*3000, 40})
	}
	return nama
}

// --8<-- [start:seed]
// isiAwal mengisi schema yang sudah dimigrasi sampai 000023 dengan data lab Tahap 4, sebagai pemilik schema, dalam
// satu transaction: 10.291 akun, 10.288 buku (10.281 milik akun, 7 buku sistem), 10.200 jurnal saldo awal (10.000
// tunjangan karyawan, 200 saldo pemakai), 10.281 perangkat, 2.400 produk. Set-based (generate_series) kecuali jurnal tunjangan: satu loop PL/pgSQL 10.000 putaran di
// dalam database (±1,5 detik seluruh seed), karena tiap jurnal butuh nomornya untuk posting. Tidak lewat service, jadi
// tidak ada baris outbox: antrean awal kosong.
func isiAwal(ctx context.Context, db *sql.DB) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(PasswordLab), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var n int
	if err := tx.QueryRowContext(ctx, `SELECT count(*) FROM akun WHERE id <> 1`).Scan(&n); err != nil {
		return err
	}
	if n != 0 {
		return fmt.Errorf("schema sudah berisi %d akun; seed hanya untuk schema kosong", n)
	}
	var nama []string
	for _, k := range kota {
		nama = append(nama, "('"+k+"')")
	}
	langkah := []struct {
		apa, q string
		arg    []any
	}{
		{"kota", `INSERT INTO kota (nama) VALUES ` + strings.Join(nama, ","), nil},
		{"admin dan hr", `
			INSERT INTO akun (id, jenis, nama, email, password_hash, kota_id)
			SELECT 400, 'admin', 'Admin Tunjangan', 'admin.tunjangan@lestari.example', $1, NULL
			UNION ALL
			SELECT 410 + k.id, 'hr', 'HR ' || k.nama, 'hr.' || lower(k.nama) || '@lestari.example', $1, k.id FROM kota k`,
			[]any{string(hash)}},
		{"karyawan", fmt.Sprintf(`
			INSERT INTO akun (id, jenis, nama, email, password_hash, nomor_karyawan, kota_id)
			SELECT i, 'karyawan', n.nama, n.email, $1, 'K' || lpad(i::text, 5, '0'),
			       CASE WHEN i <= 10000 + %[1]d - 3 THEN 1 ELSE 2 + (i - (10000 + %[1]d - 3) - 1) / %[2]d END
			FROM generate_series(10001, 10000 + 10000 - 3) AS i,
			     LATERAL (SELECT 'Karyawan ' || i AS nama, 'karyawan' || i || '@lestari.example' AS email) n
			UNION ALL VALUES
			  (417, 'karyawan', 'Dimas', 'dimas@lestari.example', $1, 'K00417', 1),
			  (419, 'karyawan', 'Budi', 'budi@lestari.example', $1, 'K00419', 1),
			  (504, 'karyawan', 'Citra', 'citra@lestari.example', $1, 'K00504', 1)`, karyawanPusat, karyawanPerKota),
			[]any{string(hash)}},
		{"warung", `
			INSERT INTO akun (id, jenis, nama, email, password_hash, kota_id)
			SELECT i, 'warung', 'Warung ' || i, 'warung' || i || '@lestari.example', $1, 1 FROM generate_series(505, 513) AS i
			UNION ALL SELECT i, 'warung', 'Warung ' || i, 'warung' || i || '@lestari.example', $1, 2 + (i - 2001) / 10
			  FROM generate_series(2001, 2048) AS i
			UNION ALL VALUES
			  (418, 'warung', 'Warung Ani', 'warung.ani@lestari.example', $1, 1),
			  (502, 'warung', 'Warung Sari', 'warung.sari@lestari.example', $1, 1),
			  (503, 'warung', 'Warung Mie Pak Joko', 'warung.joko@lestari.example', $1, 1)`,
			[]any{string(hash)}},
		{"buku", `
			INSERT INTO buku (akun_id, jenis, batas_saldo, batas_harian)
			SELECT id, jenis, CASE WHEN jenis = 'warung' THEN 1500000 END, CASE WHEN jenis = 'karyawan' THEN 500000 END
			FROM akun WHERE jenis IN ('karyawan', 'warung') ORDER BY id`, nil},
		// Satu jurnal topup per karyawan, dari buku tunjangan oleh admin. Posting dan saldo_cache di transaction ini juga.
		{"tunjangan awal", fmt.Sprintf(`
			DO $$
			DECLARE r record; j bigint; t bigint;
			BEGIN
			  SELECT id INTO t FROM buku WHERE jenis = 'tunjangan';
			  FOR r IN SELECT b.id AS buku_id, a.nama FROM buku b JOIN akun a ON a.id = b.akun_id
			           WHERE b.jenis = 'karyawan' ORDER BY b.id LOOP
			    INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('topup', 'Tunjangan makan awal Tahap 4', 400) RETURNING id INTO j;
			    INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES (j, t, -%[1]d), (j, r.buku_id, %[1]d);
			  END LOOP;
			  UPDATE buku b SET saldo_cache = (SELECT coalesce(sum(jumlah), 0) FROM posting p WHERE p.buku_id = b.id);
			END $$`, tunjangan), nil},
		// Tahap 4: seluruh akun Lestari ditandai terverifikasi lewat HR (PRD v4).
		{"tingkat Lestari", `UPDATE akun SET tingkat = 'terverifikasi' WHERE jenis IN ('karyawan', 'warung', 'hr', 'admin')`, nil},
		{"risk", `
			INSERT INTO akun (id, jenis, nama, email, password_hash, tingkat) VALUES
			  (420, 'risk', 'Ratih', 'ratih@rekeningo.example', $1, 'terverifikasi'),
			  (421, 'risk', 'Tim Risk Dua', 'risk.dua@rekeningo.example', $1, 'terverifikasi')`,
			[]any{string(hash)}},
		{"merchant luar", `
			INSERT INTO akun (id, jenis, nama, email, password_hash, tingkat)
			SELECT 30000 + i, 'merchant',
			       CASE i WHEN 1 THEN 'Toko Sumber Rejeki' WHEN 2 THEN 'Toko Andalan' ELSE 'Merchant ' || i END,
			       'merchant' || i || '@merchant.example', $1,
			       CASE WHEN i = 21 THEN 'belum' ELSE 'terverifikasi' END
			FROM generate_series(1, 21) AS i`,
			[]any{string(hash)}},
		{"pemakai umum", `
			INSERT INTO akun (id, jenis, nama, email, password_hash, tingkat)
			SELECT 40000 + i, 'pemakai',
			       CASE i WHEN 1 THEN 'Dina' WHEN 2 THEN 'Eko' ELSE 'Pemakai ' || i END,
			       'pemakai' || i || '@publik.example', $1,
			       CASE WHEN i = 1 THEN 'belum' WHEN i <= 100 AND i <> 2 THEN 'belum' ELSE 'terverifikasi' END
			FROM generate_series(1, 200) AS i`,
			[]any{string(hash)}},
		{"buku publik", `
			INSERT INTO buku (akun_id, jenis, batas_harian)
			SELECT id, jenis, CASE WHEN jenis = 'pemakai' THEN 500000 END
			FROM akun WHERE jenis IN ('pemakai', 'merchant') ORDER BY id`, nil},
		// Saldo awal pemakai: Rp500.000 dari buku bank, kecuali Dina (Rp900.000, dekat batas Rp1.000.000 tingkat belum).
		{"saldo awal pemakai", `
			DO $$
			DECLARE r record; j bigint; bank bigint;
			BEGIN
			  SELECT id INTO bank FROM buku WHERE jenis = 'bank';
			  FOR r IN SELECT b.id AS buku_id, a.id AS akun FROM buku b JOIN akun a ON a.id = b.akun_id
			           WHERE b.jenis = 'pemakai' ORDER BY b.id LOOP
			    INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('topup', 'Saldo awal pemakai Tahap 4', 400) RETURNING id INTO j;
			    INSERT INTO posting (jurnal_id, buku_id, jumlah)
			    VALUES (j, bank, -CASE WHEN r.akun = 40001 THEN 900000 ELSE 500000 END),
			           (j, r.buku_id, CASE WHEN r.akun = 40001 THEN 900000 ELSE 500000 END);
			  END LOOP;
			  UPDATE buku b SET saldo_cache = (SELECT coalesce(sum(jumlah), 0) FROM posting p WHERE p.buku_id = b.id)
			  WHERE jenis IN ('pemakai', 'bank');
			END $$`, nil},
		{"perangkat", `
			INSERT INTO perangkat (akun_id, platform, token_push)
			SELECT id, CASE WHEN id % 2 = 0 THEN 'android' ELSE 'ios' END, 'tiruan-' || id
			FROM akun WHERE jenis IN ('karyawan', 'warung', 'pemakai', 'merchant') ORDER BY id`, nil},
	}
	for _, l := range langkah {
		if _, err := tx.ExecContext(ctx, l.q, l.arg...); err != nil {
			return fmt.Errorf("seed %s: %w", l.apa, err)
		}
	}
	for _, m := range daftarMenu() {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO produk (akun_id, nama, harga, stok) SELECT id, $1, $2, $3 FROM akun WHERE jenis = 'warung' ORDER BY id`,
			m.nama, m.harga, m.stok); err != nil {
			return fmt.Errorf("seed produk %s: %w", m.nama, err)
		}
	}
	return tx.Commit()
}

// --8<-- [end:seed]
