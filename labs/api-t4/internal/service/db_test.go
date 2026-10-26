package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"

	"lab/apit4/internal/repo"
)

// --8<-- [start:siapkan]
// Database dan schema yang dibuat labs/api-t4/run.py dari file migration yang sama (skema akhir Tahap 3).
const databaseTes = "lab"

// schemaTes: schema tes. Pekerjaan paralel di database bersama memakai schema tes sendiri lewat LAB_TES_SCHEMA.
var schemaTes = func() string {
	if s := os.Getenv("LAB_TES_SCHEMA"); s != "" {
		return s
	}
	return "tahap4_tes"
}()

// siapkan membuka PostgreSQL sungguhan. Posting tidak bisa dihapus (invarian 2), jadi tes tidak mengosongkan
// tabel: setiap tes membuat akun dan bukunya sendiri. Tes berhenti bila database atau schema bukan milik tes.
func siapkan(t *testing.T) (Service, *sql.DB) {
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
	if nama != databaseTes || schema != schemaTes {
		t.Fatalf("%s/%s bukan database tes %s/%s: tidak ada data yang ditulis", nama, schema, databaseTes, schemaTes)
	}
	return Baru(repo.Baru(db), time.Hour), db
}

// akunBaru membuat satu akun dengan buku (kecuali admin), lalu mengisi saldonya lewat jurnal topup.
func akunBaru(t *testing.T, db *sql.DB, jenis string, saldo int64) (id int64, nomor string) {
	t.Helper()
	if err := db.QueryRow(`SELECT greatest(coalesce(max(id), 0), 100000) + 1 FROM akun`).Scan(&id); err != nil {
		t.Fatal(err)
	}
	var nomorPtr *string
	if jenis == "karyawan" {
		nomor = fmt.Sprintf("T%d", id)
		nomorPtr = &nomor
	}
	if _, err := db.Exec(`INSERT INTO akun (id, jenis, nama, email, password_hash, nomor_karyawan)
		VALUES ($1, $2, $3, $4, '!', $5)`, id, jenis, fmt.Sprintf("Tes %d", id), fmt.Sprintf("tes%d@lestari.example", id),
		nomorPtr); err != nil {
		t.Fatal(err)
	}
	if jenis == "admin" || jenis == "hr" { // tanpa buku
		return id, ""
	}
	if _, err := db.Exec(`INSERT INTO buku (akun_id, jenis, batas_saldo, batas_harian)
		VALUES ($1, $2, CASE WHEN $2 = 'warung' THEN 1500000 END, CASE WHEN $2 = 'karyawan' THEN 500000 END)`,
		id, jenis); err != nil {
		t.Fatal(err)
	}
	if saldo > 0 {
		isiSaldo(t, db, id, saldo)
	}
	return id, nomor
}

// isiSaldo: satu jurnal topup dari buku tunjangan, oleh akun sistem.
func isiSaldo(t *testing.T, db *sql.DB, akun, n int64) {
	t.Helper()
	r := repo.Baru(db)
	err := r.DalamTx(context.Background(), func(tx repo.Tx) error {
		tunjangan, err := tx.BukuSistem(context.Background(), "tunjangan")
		if err != nil {
			return err
		}
		buku, err := tx.KunciBukuAkun(context.Background(), akun)
		if err != nil {
			return err
		}
		_, err = tx.CatatJurnal(context.Background(), "topup", "isi saldo tes", 1, nil,
			[]repo.Posting{{BukuID: tunjangan, Jumlah: -n}, {BukuID: buku[akun].ID, Jumlah: n}})
		return err
	})
	if err != nil {
		t.Fatal(err)
	}
}

// saldo: saldo_cache dan jumlah posting satu akun; tes gagal bila keduanya berbeda.
func saldo(t *testing.T, db *sql.DB, akun int64) int64 {
	t.Helper()
	var cache, posting int64
	if err := db.QueryRow(`SELECT b.saldo_cache, coalesce((SELECT sum(jumlah) FROM posting p WHERE p.buku_id = b.id), 0)
		FROM buku b WHERE b.akun_id = $1`, akun).Scan(&cache, &posting); err != nil {
		t.Fatal(err)
	}
	if cache != posting {
		t.Fatalf("akun %d: saldo_cache %d, jumlah posting %d", akun, cache, posting)
	}
	return cache
}

// --8<-- [end:siapkan]

// --8<-- [start:batas-harian]
func TestKirimBatasHarian(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	a, _ := akunBaru(t, db, "karyawan", 600_000)
	_, nomorB := akunBaru(t, db, "karyawan", 0)
	h, err := svc.Kirim(ctx, a, nomorB, 500_000, "")
	if err != nil || h.SisaBatas != 0 {
		t.Fatalf("kirim tepat batas: %v, sisa %d", err, h.SisaBatas)
	}
	if _, err := svc.Kirim(ctx, a, nomorB, 1, ""); !errors.Is(err, ErrBatasHarian) {
		t.Fatalf("kirim Rp1 sesudah batas: ingin ErrBatasHarian, dapat %v", err)
	}
	if s := saldo(t, db, a); s != 100_000 {
		t.Fatalf("saldo pengirim %d, ingin 100000", s)
	}
}

// --8<-- [end:batas-harian]

// --8<-- [start:bersamaan]
// Sepuluh kiriman Rp20.000 bersamaan dari saldo Rp100.000: tepat lima berhasil, saldo 0, tidak pernah negatif.
func TestKirimBersamaanTidakNegatif(t *testing.T) {
	svc, db := siapkan(t)
	a, _ := akunBaru(t, db, "karyawan", 100_000)
	_, nomorB := akunBaru(t, db, "karyawan", 0)
	var wg sync.WaitGroup
	var mu sync.Mutex
	hasil := map[string]int{}
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := svc.Kirim(context.Background(), a, nomorB, 20_000, "")
			mu.Lock()
			defer mu.Unlock()
			hasil[fmt.Sprint(err)]++
		}()
	}
	wg.Wait()
	if hasil["<nil>"] != 5 || hasil[ErrSaldoKurang.Error()] != 5 {
		t.Fatalf("hasil %v, ingin 5 berhasil dan 5 saldo kurang", hasil)
	}
	if s := saldo(t, db, a); s != 0 {
		t.Fatalf("saldo %d, ingin 0", s)
	}
}

// --8<-- [end:bersamaan]

// --8<-- [start:topup]
func TestTopupSatuBarisSalahSemuaDitolak(t *testing.T) {
	svc, db := siapkan(t)
	admin, _ := akunBaru(t, db, "admin", 0)
	a, nomorA := akunBaru(t, db, "karyawan", 0)
	_, nomorB := akunBaru(t, db, "karyawan", 0)
	var sebelum int64
	db.QueryRow(`SELECT count(*) FROM jurnal`).Scan(&sebelum)
	csv := fmt.Sprintf("nomor_karyawan,nominal\n%s,250000\n%s,250.000\n", nomorA, nomorB)
	_, _, err := svc.Topup(context.Background(), admin, "tes", csv)
	var e ErrCSV
	if !errors.As(err, &e) || len(e.Kesalahan) != 1 || e.Kesalahan[0].Baris != 3 {
		t.Fatalf("ingin ErrCSV baris 3, dapat %v", err)
	}
	var sesudah int64
	db.QueryRow(`SELECT count(*) FROM jurnal`).Scan(&sesudah)
	if sesudah != sebelum || saldo(t, db, a) != 0 {
		t.Fatalf("jurnal %d -> %d, saldo A %d: file yang ditolak tidak boleh mengubah apa pun", sebelum, sesudah, saldo(t, db, a))
	}
}

func TestTopupSeribuAkunSatuTransaction(t *testing.T) {
	svc, db := siapkan(t)
	admin, _ := akunBaru(t, db, "admin", 0)
	var awal int64
	db.QueryRow(`SELECT greatest(coalesce(max(id), 0), 100000) + 1 FROM akun`).Scan(&awal)
	if _, err := db.Exec(`
		INSERT INTO akun (id, jenis, nama, email, password_hash, nomor_karyawan)
		SELECT i, 'karyawan', 'Tes ' || i, 'tes' || i || '@lestari.example', '!', 'T' || i
		FROM generate_series($1::bigint, $1::bigint + 999) AS i;
		`, awal); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO buku (akun_id, jenis, batas_harian)
		SELECT i, 'karyawan', 500000 FROM generate_series($1::bigint, $1::bigint + 999) AS i`, awal); err != nil {
		t.Fatal(err)
	}
	var b strings.Builder
	b.WriteString("nomor_karyawan,nominal\n")
	for i := awal; i < awal+1000; i++ {
		fmt.Fprintf(&b, "T%d,250000\n", i)
	}
	n, total, err := svc.Topup(context.Background(), admin, "tes 1.000 akun", b.String())
	if err != nil || n != 1000 || total != 250_000_000 {
		t.Fatalf("Topup: %d akun, total %d, err %v", n, total, err)
	}
	var jumlah int64
	db.QueryRow(`SELECT sum(b.saldo_cache) FROM buku b WHERE b.akun_id BETWEEN $1 AND $1 + 999`, awal).Scan(&jumlah)
	if jumlah != 250_000_000 || saldo(t, db, awal+999) != 250_000 {
		t.Fatalf("jumlah saldo 1.000 akun %d, ingin 250000000", jumlah)
	}
}

// --8<-- [end:topup]

// --8<-- [start:kursor]
// Posting baru di atas halaman pertama tidak membuat baris ganda atau baris terlewat di halaman berikutnya.
func TestRiwayatKursorTanpaGandaTanpaTerlewat(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	a, _ := akunBaru(t, db, "karyawan", 0)
	for n := int64(1); n <= 7; n++ {
		isiSaldo(t, db, a, n*1000)
	}
	halaman, kursor, err := svc.Riwayat(ctx, a, a, "", "3")
	if err != nil {
		t.Fatal(err)
	}
	isiSaldo(t, db, a, 99_000) // masuk sesudah halaman pertama dibuka
	lihat := map[int64]int{}
	for _, r := range halaman {
		lihat[r.Jumlah]++
	}
	for kursor != "" {
		if halaman, kursor, err = svc.Riwayat(ctx, a, a, kursor, "3"); err != nil {
			t.Fatal(err)
		}
		for _, r := range halaman {
			lihat[r.Jumlah]++
		}
	}
	for n := int64(1); n <= 7; n++ {
		if lihat[n*1000] != 1 {
			t.Errorf("posting Rp%d terlihat %d kali, ingin 1", n*1000, lihat[n*1000])
		}
	}
	if lihat[99_000] != 0 || len(lihat) != 7 {
		t.Errorf("posting baru ikut di halaman lama: %v", lihat)
	}
}

// --8<-- [end:kursor]

func TestBalikSekali(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	admin, _ := akunBaru(t, db, "admin", 0)
	a, _ := akunBaru(t, db, "karyawan", 50_000)
	w, _ := akunBaru(t, db, "warung", 0)
	id, _, err := svc.Bayar(ctx, a, w, 15_000, "")
	if err != nil {
		t.Fatal(err)
	}
	alasan := "salah pilih warung, dikembalikan atas konfirmasi warung"
	if _, err := svc.Balik(ctx, admin, id, alasan); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Balik(ctx, admin, id, alasan); !errors.Is(err, ErrSudahDibalik) {
		t.Fatalf("balik kedua: ingin ErrSudahDibalik, dapat %v", err)
	}
	if saldo(t, db, a) != 50_000 || saldo(t, db, w) != 0 {
		t.Fatalf("saldo sesudah pembalik: %d dan %d", saldo(t, db, a), saldo(t, db, w))
	}
}

func TestTutupBukuSeimbang(t *testing.T) {
	svc, db := siapkan(t)
	admin, _ := akunBaru(t, db, "admin", 0)
	var periode string
	db.QueryRow(`SELECT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM')`).Scan(&periode)
	buku, s, err := svc.TutupBuku(context.Background(), admin, periode)
	if err != nil {
		t.Fatal(err)
	}
	if s.TidakSeimbang != 0 || s.JumlahPosting != 0 || s.JumlahSaldoAkhir != 0 || s.Jurnal == 0 {
		t.Fatalf("ringkasan sistem %+v", s)
	}
	for _, b := range buku {
		if b.SaldoAwal+b.Masuk-b.Keluar != b.SaldoAkhir || b.SaldoAkhir != b.SaldoCache {
			t.Errorf("buku %d: %+v", b.Buku, b)
		}
	}
}
