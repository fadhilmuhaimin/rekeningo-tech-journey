//go:build t4modul

package modul_test

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
	_ "github.com/jackc/pgx/v5/stdlib"

	"lab/apit4/internal/modul/akun"
	"lab/apit4/internal/modul/pembayaran"
)

// Tes batas modul (ADR 37, lab t4-modul): schema dan role per modul, paket internal/ Go, dan perubahan nama kolom
// lintas modul (M32). Hanya dengan -tags t4modul dan T4M_HOST (host:port PostgreSQL lab); schema dibangun
// labs/t4-modul/run.py. Baris yang diawali "LAB|" adalah bahan rekaman.

func lab(format string, a ...any) { fmt.Printf("LAB|"+format+"\n", a...) }

func host(t *testing.T) string {
	t.Helper()
	h := os.Getenv("T4M_HOST")
	if h == "" {
		t.Fatal("T4M_HOST kosong: tes ini dijalankan oleh labs/t4-modul/run.py")
	}
	return h
}

// buka membuka koneksi sebagai satu role; search_path datang dari ALTER ROLE ... SET (modul.sql).
func buka(t *testing.T, role string) *sql.DB {
	t.Helper()
	pass := role
	if role == "lab" {
		pass = "lab"
	}
	db, err := sql.Open("pgx", fmt.Sprintf("postgres://%s:%s@%s/lab?application_name=t4-modul-tes-%d", role, pass, host(t), os.Getpid()))
	if err != nil {
		t.Fatal(err)
	}
	db.SetMaxOpenConns(2)
	t.Cleanup(func() { db.Close() })
	return db
}

func pg(err error) (kode, pesan string) {
	var e *pgconn.PgError
	if errors.As(err, &e) {
		return e.Code, e.Message
	}
	if err != nil {
		return "?", err.Error()
	}
	return "", ""
}

// modulTabel: pembagian 22 tabel menurut naskah 3b.
var modulTabel = map[string][]string{
	"ledger":     {"buku", "jurnal", "posting", "kunci_idempotensi", "batch_pencairan", "baris_pencairan"},
	"akun":       {"akun", "sesi", "perangkat", "kota"},
	"identitas":  {"verifikasi"},
	"merchant":   {"produk", "promo", "operasi_sinkron", "qr"},
	"pembayaran": {"topup_bank", "webhook_event", "insiden_rekon", "kartu", "otorisasi_kartu"},
	"platform":   {"outbox", "audit_log"},
}

var urutan = []string{"ledger", "akun", "identitas", "merchant", "pembayaran", "platform"}

func TestPembagianCocokDenganKatalog(t *testing.T) {
	pemilik := buka(t, "lab")
	jumlah := 0
	for _, modul := range urutan {
		tabel := modulTabel[modul]
		rows, err := pemilik.Query(`SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = $1 AND c.relkind = 'r' ORDER BY 1`, "t4m_"+modul)
		if err != nil {
			t.Fatal(err)
		}
		var ada []string
		for rows.Next() {
			var s string
			rows.Scan(&s)
			ada = append(ada, s)
		}
		rows.Close()
		want := append([]string{}, tabel...)
		sort.Strings(want)
		if strings.Join(ada, ",") != strings.Join(want, ",") {
			t.Fatalf("schema t4m_%s berisi %v, ingin %v", modul, ada, want)
		}
		jumlah += len(ada)
		lab("schema t4m_%s: %d tabel (%s)", modul, len(ada), strings.Join(ada, ", "))
	}
	if jumlah != 22 {
		t.Fatalf("%d tabel, ingin 22", jumlah)
	}
}

// Matriks: tiap role modul mencoba membaca tiap tabel. Yang berhasil hanya tabel modulnya sendiri dan kontrak kolom
// ledger ke akun.
func TestMatriksRoleModul(t *testing.T) {
	pemilik := buka(t, "lab")
	for _, r := range urutan {
		db := buka(t, "t4m_"+r)
		boleh, ditolak := 0, 0
		var salah []string
		for _, m := range urutan {
			for _, tb := range modulTabel[m] {
				_, err := db.Exec(fmt.Sprintf(`SELECT 1 FROM t4m_%s.%s LIMIT 0`, m, tb))
				kode, _ := pg(err)
				diizinkan := m == r || (r == "ledger" && tb == "akun")
				if m != r {
					// Menulis juga ditolak: INSERT, UPDATE, dan DELETE (WHERE false: hak diperiksa sebelum baris dibaca).
					var kol string
					if err := pemilik.QueryRow(`SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position LIMIT 1`, "t4m_"+m, tb).Scan(&kol); err != nil {
						t.Fatal(err)
					}
					for _, q := range []string{
						fmt.Sprintf(`INSERT INTO t4m_%s.%s (%s) SELECT NULL WHERE false`, m, tb, kol),
						fmt.Sprintf(`UPDATE t4m_%s.%s SET %s = %s WHERE false`, m, tb, kol, kol),
						fmt.Sprintf(`DELETE FROM t4m_%s.%s WHERE false`, m, tb)} {
						if _, err := db.Exec(q); func() string { k, _ := pg(err); return k }() != "42501" {
							salah = append(salah, fmt.Sprintf("%s: %s: dapat %v, ingin 42501", r, q, err))
						}
					}
				}
				switch {
				case err == nil && diizinkan:
					boleh++
				case kode == "42501" && !diizinkan:
					ditolak++
				default:
					salah = append(salah, fmt.Sprintf("%s -> %s.%s: kode %q", r, m, tb, kode))
				}
			}
		}
		if len(salah) > 0 {
			t.Fatalf("matriks tidak sesuai: %v", salah)
		}
		lab("role t4m_%s: %d tabel terbaca (milik sendiri%s), %d ditolak permission denied (42501)", r, boleh,
			map[bool]string{true: " dan kolom id, tingkat, status akun", false: ""}[r == "ledger"], ditolak)
	}
}

func TestKontrakKolomLedgerKeAkunHanyaTigaKolom(t *testing.T) {
	db := buka(t, "t4m_ledger")
	if _, err := db.Exec(`SELECT id, tingkat, status FROM t4m_akun.akun LIMIT 1`); err != nil {
		t.Fatalf("kontrak: %v", err)
	}
	for _, q := range []string{`SELECT nama FROM t4m_akun.akun LIMIT 1`, `SELECT * FROM t4m_akun.akun LIMIT 1`, `SELECT password_hash FROM t4m_akun.akun LIMIT 1`} {
		_, err := db.Exec(q)
		kode, pesan := pg(err)
		if kode != "42501" {
			t.Fatalf("%s: kode %q, ingin 42501", q, kode)
		}
		lab("ledger: %s -> %s (%s)", q, pesan, kode)
	}
}

func TestRoleModulTidakBisaMembuatObjek(t *testing.T) {
	for _, c := range []struct{ role, q string }{
		{"t4m_pembayaran", `CREATE TABLE public.tabel_gelap (a int)`},
		{"t4m_pembayaran", `CREATE TABLE t4m_akun.tabel_gelap (a int)`},
		{"t4m_akun", `CREATE TABLE t4m_ledger.tabel_gelap (a int)`},
	} {
		_, err := buka(t, c.role).Exec(c.q)
		kode, pesan := pg(err)
		if kode != "42501" {
			t.Fatalf("%s: %s: kode %q, ingin 42501", c.role, c.q, kode)
		}
		lab("%s: %s -> %s (%s)", c.role, c.q, pesan, kode)
	}
}

func TestMonolitMembacaLimaModulTapiBukanPembayaran(t *testing.T) {
	db := buka(t, "t4m_monolit")
	for _, m := range urutan {
		for _, tb := range modulTabel[m] {
			_, err := db.Exec(fmt.Sprintf(`SELECT 1 FROM %s LIMIT 0`, tb)) // tanpa awalan: search_path role monolith
			kode, pesan := pg(err)
			if m == "pembayaran" {
				if kode != "42P01" {
					t.Fatalf("monolith -> %s: kode %q, ingin 42P01 (tidak ada di search_path)", tb, kode)
				}
				continue
			}
			if err != nil {
				t.Fatalf("monolith -> %s: %v", tb, pesan)
			}
		}
	}
	for _, tb := range modulTabel["pembayaran"] {
		_, err := db.Exec(fmt.Sprintf(`SELECT 1 FROM t4m_pembayaran.%s LIMIT 0`, tb))
		if kode, _ := pg(err); kode != "42501" {
			t.Fatalf("monolith -> t4m_pembayaran.%s: kode %q, ingin 42501", tb, kode)
		}
	}
	lab("role t4m_monolit: 17 tabel lima modul terbaca; 5 tabel pembayaran ditolak (42501 dengan awalan schema, tidak ada di search_path tanpa awalan)")
}

// Kunci asing lintas schema: database memeriksanya sebagai pemilik tabel yang diacu, jadi role pembayaran tidak
// butuh hak apa pun di schema akun untuk menulis topup_bank, dan nomor akun yang tidak ada tetap ditolak.
func TestKunciAsingLintasSchemaTidakButuhHakBaca(t *testing.T) {
	pemilik := buka(t, "lab")
	var akunID int64
	if err := pemilik.QueryRow(`SELECT id FROM t4m_akun.akun WHERE id = 419`).Scan(&akunID); err != nil {
		t.Fatal(err)
	}
	db := buka(t, "t4m_pembayaran")
	order := fmt.Sprintf("TB-fk-%d", os.Getpid())
	if _, err := db.Exec(`INSERT INTO topup_bank (akun_id, order_id, jumlah, kedaluwarsa_pada) VALUES ($1, $2, 10000, now() + interval '1 day')`, akunID, order); err != nil {
		t.Fatalf("topup_bank untuk akun yang ada: %v", err)
	}
	_, err := db.Exec(`INSERT INTO topup_bank (akun_id, order_id, jumlah, kedaluwarsa_pada) VALUES (999999999, $1, 10000, now() + interval '1 day')`, order+"-x")
	kode, pesan := pg(err)
	if kode != "23503" {
		t.Fatalf("akun tidak ada: kode %q, ingin 23503", kode)
	}
	lab("role t4m_pembayaran menulis topup_bank untuk akun yang ada: berhasil tanpa hak apa pun di schema akun")
	lab("role t4m_pembayaran menulis topup_bank untuk akun yang tidak ada: %s (%s)", pesan, kode)
	if _, err := pemilik.Exec(`DELETE FROM t4m_pembayaran.topup_bank WHERE order_id = $1`, order); err != nil {
		t.Fatal(err)
	}
}

// Keterikatan lintas schema dibaca dari katalog: semua kunci asing yang menyeberang batas modul.
func TestKeterikatanLintasSchema(t *testing.T) {
	pemilik := buka(t, "lab")
	rows, err := pemilik.Query(`
		SELECT replace(sn.nspname, 't4m_', ''), c.conrelid::regclass::text, replace(tn.nspname, 't4m_', ''), c.confrelid::regclass::text
		FROM pg_constraint c
		JOIN pg_class s ON s.oid = c.conrelid JOIN pg_namespace sn ON sn.oid = s.relnamespace
		JOIN pg_class tc ON tc.oid = c.confrelid JOIN pg_namespace tn ON tn.oid = tc.relnamespace
		WHERE c.contype = 'f' AND sn.nspname LIKE 't4m\_%' AND tn.nspname LIKE 't4m\_%' AND sn.oid <> tn.oid
		ORDER BY 1, 2, 3, 4`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	ke := map[string]int{}
	n := 0
	dari := map[string]int{}
	for rows.Next() {
		var sm, st, tm, tt string
		rows.Scan(&sm, &st, &tm, &tt)
		ke[tm+"."+strings.TrimPrefix(tt, "t4m_"+tm+".")]++
		dari[sm]++
		n++
	}
	var daftar []string
	for k, v := range ke {
		daftar = append(daftar, fmt.Sprintf("%s x%d", k, v))
	}
	sort.Strings(daftar)
	var asal []string
	for k, v := range dari {
		asal = append(asal, fmt.Sprintf("%s %d", k, v))
	}
	sort.Strings(asal)
	lab("kunci asing yang menyeberang schema modul: %d; tujuan: %s", n, strings.Join(daftar, ", "))
	lab("asal kunci asing lintas schema: %s", strings.Join(asal, ", "))
	if n == 0 {
		t.Fatal("tidak ada kunci asing lintas schema: pembagian tidak sesuai")
	}
}

// --- M32 ---

func akunUji(t *testing.T) (id int64, nama string) {
	t.Helper()
	if err := buka(t, "lab").QueryRow(`SELECT id, nama FROM t4m_akun.akun WHERE id = 419`).Scan(&id, &nama); err != nil {
		t.Fatal(err)
	}
	return
}

func ganti(t *testing.T, ddl, balik string) {
	t.Helper()
	pemilik := buka(t, "lab")
	if _, err := pemilik.Exec(ddl); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { pemilik.Exec(balik) })
}

// Kode pembayaran yang membaca akun.nama dengan SQL langsung tidak bisa jalan di sini sama sekali: bukan karena
// kolomnya diganti, tetapi karena modul pembayaran tidak boleh membaca tabel akun.
func TestPembayaranTidakBisaMembacaAkunLangsung(t *testing.T) {
	akunID, _ := akunUji(t)
	db := buka(t, "t4m_pembayaran")
	_, err := pembayaran.TeksTopupLangsung(context.Background(), db, akunID, 200_000)
	kode, pesan := pg(err)
	if kode != "42P01" {
		t.Fatalf("SQL tanpa awalan schema: kode %q, ingin 42P01", kode)
	}
	lab("pembayaran menjalankan SQL M32 apa adanya (SELECT nama FROM akun): %s (%s)", pesan, kode)
	_, err = db.Exec(`SELECT nama FROM t4m_akun.akun WHERE id = $1`, akunID)
	kode, pesan = pg(err)
	if kode != "42501" {
		t.Fatalf("SQL dengan awalan schema: kode %q, ingin 42501", kode)
	}
	lab("pembayaran menulis awalan schema sendiri (SELECT nama FROM t4m_akun.akun): %s (%s)", pesan, kode)
	// Kontrol: role akun menjalankan SQL yang sama dan berhasil, jadi penolakan di atas karena batas, bukan karena data.
	var nama string
	if err := buka(t, "t4m_akun").QueryRow(`SELECT nama FROM t4m_akun.akun WHERE id = $1`, akunID).Scan(&nama); err != nil || nama == "" {
		t.Fatalf("kontrol: role akun membaca nama: %v", err)
	}
	lab("kontrol: role t4m_akun menjalankan SQL yang sama pada baris yang sama: berhasil")
}

// Tim Akun mengganti nama kolom lewat migration dan mengubah kodenya sendiri. Modul lain membaca lewat kontrak,
// jadi tidak ada yang rusak.
func TestRenameKolomNamaTidakMematahkanModulLain(t *testing.T) {
	akunID, nama := akunUji(t)
	modul := akun.Modul{DB: buka(t, "t4m_akun")}
	akun.SkemaNama(1)
	ganti(t, `ALTER TABLE t4m_akun.akun RENAME COLUMN nama TO nama_tampil`, `ALTER TABLE t4m_akun.akun RENAME COLUMN nama_tampil TO nama`)
	t.Cleanup(func() { akun.SkemaNama(1) })
	// Sebelum kode tim Akun ikut berubah, kodenya sendiri gagal: itu cakupan tesnya sendiri.
	if _, err := modul.NamaTampil(context.Background(), akunID); err == nil {
		t.Fatal("kode akun versi 1 seharusnya gagal sesudah rename")
	}
	akun.SkemaNama(2)
	got, err := modul.NamaTampil(context.Background(), akunID)
	if err != nil || got != nama {
		t.Fatalf("akun.NamaTampil sesudah rename dan kode ikut berubah: %q, %v", got, err)
	}
	teks, err := pembayaran.TeksTopup(context.Background(), modul, akunID, 200_000)
	if err != nil || !strings.HasSuffix(teks, nama) {
		t.Fatalf("pembayaran.TeksTopup lewat kontrak akun: %q, %v", teks, err)
	}
	// Kontrak kolom modul lain tetap jalan: yang dibaca ledger bukan kolom nama.
	if _, err := buka(t, "t4m_ledger").Exec(`SELECT id, tingkat, status FROM t4m_akun.akun LIMIT 1`); err != nil {
		t.Fatalf("kontrak ledger sesudah rename nama: %v", err)
	}
	lab("sesudah ALTER TABLE akun RENAME COLUMN nama TO nama_tampil oleh pemilik schema akun dan kode modul akun ikut diubah:")
	lab("  modul akun membaca nama_tampil: berhasil; pembayaran.TeksTopup lewat kontrak akun: %q", teks)
	lab("  kontrak kolom ledger (id, tingkat, status): berhasil; tidak ada modul lain yang menyentuh kolom nama")
}

// Mengganti nama kolom yang ada di kontrak lintas modul tidak lolos: tes kontrak di CI gagal dengan undefined_column,
// jadi tim yang mengubahnya tahu sebelum rilis.
func TestRenameKolomKontrakTerdeteksiDiCI(t *testing.T) {
	ganti(t, `ALTER TABLE t4m_akun.akun RENAME COLUMN tingkat TO tingkat_baru`, `ALTER TABLE t4m_akun.akun RENAME COLUMN tingkat_baru TO tingkat`)
	_, err := buka(t, "t4m_ledger").Exec(`SELECT id, tingkat, status FROM t4m_akun.akun LIMIT 1`)
	kode, pesan := pg(err)
	if kode != "42703" {
		t.Fatalf("kontrak sesudah rename tingkat: kode %q, ingin 42703", kode)
	}
	lab("ALTER TABLE akun RENAME COLUMN tingkat TO tingkat_baru (kolom di kontrak ledger): tes kontrak ledger gagal: %s (%s)", pesan, kode)
}

// Batas impor di compiler: paket modul pembayaran mengimpor internal/data milik modul akun, dan go build menolaknya.
func TestImporInternalModulLainDitolakKompiler(t *testing.T) {
	akarModul, err := filepath.Abs("../..")
	if err != nil {
		t.Fatal(err)
	}
	tmp := t.TempDir()
	salah := filepath.Join(tmp, "salah.go")
	benar := filepath.Join(tmp, "benar.go")
	os.WriteFile(salah, []byte("package pembayaran\n\nimport \"lab/apit4/internal/modul/akun/internal/data\"\n\nvar _ = data.Nama\n"), 0o644)
	os.WriteFile(benar, []byte("package pembayaran\n\nimport \"lab/apit4/internal/modul/akun\"\n\nvar _ = akun.Modul{}\n"), 0o644)
	bangun := func(berkas string) (string, error) {
		overlay := filepath.Join(tmp, "overlay.json")
		isi, _ := json.Marshal(map[string]map[string]string{"Replace": {filepath.Join(akarModul, "internal/modul/pembayaran/impor_uji.go"): berkas}})
		os.WriteFile(overlay, isi, 0o644)
		c := exec.Command("go", "build", "-overlay", overlay, "./internal/modul/pembayaran/")
		c.Dir = akarModul
		out, err := c.CombinedOutput()
		return strings.TrimSpace(strings.ReplaceAll(string(out), "\t", "  ")), err
	}
	out, err := bangun(salah)
	if err == nil || !strings.Contains(out, "use of internal package lab/apit4/internal/modul/akun/internal/data not allowed") {
		t.Fatalf("impor paket internal modul lain: err %v, keluaran %q", err, out)
	}
	lab("$ go build ./internal/modul/pembayaran/   (berkas uji menambah: import \"lab/apit4/internal/modul/akun/internal/data\")")
	for _, l := range strings.Split(out, "\n") {
		lab("%s", l)
	}
	out, err = bangun(benar)
	if err != nil {
		t.Fatalf("kontrol: impor paket publik akun harus lolos: %v\n%s", err, out)
	}
	lab("$ go build ./internal/modul/pembayaran/   (kontrol: berkas uji mengimpor lab/apit4/internal/modul/akun, paket publik)")
	lab("(lolos, tanpa keluaran)")
}

// Log yang hanya bertambah: role tidak punya UPDATE atau DELETE pada audit_log, jurnal, dan posting. Trigger invarian
// juga menolak, tetapi hak adalah lapis pertama dan satu-satunya yang berlaku bila trigger dimatikan.
func TestRoleTidakBisaMengubahCatatanYangHanyaBertambah(t *testing.T) {
	for _, c := range []struct{ role, tabel string }{{"t4m_platform", "t4m_platform.audit_log"}, {"t4m_ledger", "t4m_ledger.jurnal"}, {"t4m_ledger", "t4m_ledger.posting"}} {
		db := buka(t, c.role)
		for _, q := range []string{fmt.Sprintf(`DELETE FROM %s WHERE false`, c.tabel), fmt.Sprintf(`UPDATE %s SET id = id WHERE false`, c.tabel)} {
			_, err := db.Exec(q)
			kode, _ := pg(err)
			if kode != "42501" {
				t.Fatalf("%s: %s: kode %q, ingin 42501", c.role, q, kode)
			}
		}
		lab("%s: UPDATE dan DELETE pada %s -> permission denied (42501)", c.role, strings.TrimPrefix(c.tabel, "t4m_"))
	}
}
