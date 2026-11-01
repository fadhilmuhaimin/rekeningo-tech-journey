package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgconn"

	"lab/apit5/internal/cache"
	"lab/apit5/internal/repo"
)

// Tes Tahap 5 (lab-api-t5): partisi posting, buku tabungan, referensi jurnal, outbox stream, pengumuman, laporan
// merchant, dan job cicilan. Berjalan di schema tahap5_tes yang dibuat run.py dari file migration yang sama.

func kodePG(err error) string {
	var pe *pgconn.PgError
	if errors.As(err, &pe) {
		return pe.Code
	}
	return ""
}

// saldoBuku: saldo_cache dan jumlah posting satu buku (akun dan jenis); tes gagal bila keduanya berbeda.
func saldoBuku(t *testing.T, db *sql.DB, akun int64, jenis string) int64 {
	t.Helper()
	var cache, posting int64
	if err := db.QueryRow(`SELECT b.saldo_cache, coalesce((SELECT sum(jumlah) FROM posting p WHERE p.buku_id = b.id), 0)
		FROM buku b WHERE b.akun_id = $1 AND b.jenis = $2`, akun, jenis).Scan(&cache, &posting); err != nil {
		t.Fatal(err)
	}
	if cache != posting {
		t.Fatalf("akun %d buku %s: saldo_cache %d, jumlah posting %d", akun, jenis, cache, posting)
	}
	return cache
}

func namaConstraint(err error) string {
	var pe *pgconn.PgError
	if errors.As(err, &pe) {
		return pe.ConstraintName
	}
	return ""
}

func hitungSQL(t *testing.T, db *sql.DB, q string, arg ...any) int64 {
	t.Helper()
	var n int64
	if err := db.QueryRow(q, arg...).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

// --8<-- [start:tes-partisi]
// Aturan ledger tetap berlaku di tabel posting yang dipartisi: jurnal tidak seimbang ditolak saat COMMIT, posting tidak
// diubah, dihapus, atau dikosongkan (juga lewat partisinya langsung), dan baris di luar semua partisi ditolak.
func TestPostingPartisiMenjagaAturanLedger(t *testing.T) {
	_, db := siapkan(t)
	a, _ := akunBaru(t, db, "karyawan", 50_000)
	var buku int64
	if err := db.QueryRow(`SELECT id FROM buku WHERE akun_id = $1`, a).Scan(&buku); err != nil {
		t.Fatal(err)
	}
	if hitungSQL(t, db, `SELECT count(*) FROM pg_inherits WHERE inhparent = 'posting'::regclass`) < 4 {
		t.Fatal("posting tidak dipartisi: butuh partisi sebelum, bulan berjalan, dan dua bulan berikutnya")
	}
	// Jurnal dengan satu posting tidak seimbang: ditolak saat COMMIT oleh trigger yang dipasang ulang di tabel baru.
	tx, _ := db.Begin()
	var j int64
	if err := tx.QueryRow(`INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('topup', 'tidak seimbang', 1) RETURNING id`).Scan(&j); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(`INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES ($1, $2, 1000)`, j, buku); err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(); kodePG(err) != "23514" || namaConstraint(err) != "jurnal_seimbang" {
		t.Fatalf("jurnal tidak seimbang: %v, ingin 23514 jurnal_seimbang", err)
	}
	for _, q := range []string{
		`UPDATE posting SET jumlah = jumlah + 1 WHERE buku_id = ` + fmt.Sprint(buku),
		`DELETE FROM posting WHERE buku_id = ` + fmt.Sprint(buku),
		`TRUNCATE posting`,
		`TRUNCATE posting_bulan_00`,
		`UPDATE posting_bulan_00 SET jumlah = jumlah + 1 WHERE buku_id = ` + fmt.Sprint(buku),
	} {
		if _, err := db.Exec(q); kodePG(err) != "23001" || !strings.Contains(err.Error(), "ditolak") {
			t.Fatalf("%s: ingin ditolak trigger (23001), dapat %v", q, err)
		}
	}
	// Baris di luar semua partisi (lima tahun ke depan) ditolak: tidak ada partisi DEFAULT.
	tx2, _ := db.Begin()
	defer tx2.Rollback()
	var j2 int64
	if err := tx2.QueryRow(`INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('topup', 'masa depan', 1) RETURNING id`).Scan(&j2); err != nil {
		t.Fatal(err)
	}
	_, err := tx2.Exec(`INSERT INTO posting (jurnal_id, buku_id, jumlah, dibuat) VALUES ($1, $2, 5, now() + interval '5 years')`, j2, buku)
	if kodePG(err) != "23514" {
		t.Fatalf("posting di luar partisi: %v, ingin 23514", err)
	}
	if hitungSQL(t, db, `SELECT count(*) FROM pg_inherits i JOIN pg_class c ON c.oid = i.inhrelid
		WHERE i.inhparent = 'posting'::regclass AND pg_get_expr(c.relpartbound, c.oid) = 'DEFAULT'`) != 0 {
		t.Fatal("ada partisi DEFAULT")
	}
}

// PRIMARY KEY pada tabel berpartisi harus memuat kolom kunci partisi (PostgreSQL 17 §5.12; naskah 3b).
func TestPKPartisiHarusMemuatKolomKunci(t *testing.T) {
	_, db := siapkan(t)
	_, err := db.Exec(`CREATE TEMP TABLE coba_partisi (id bigint PRIMARY KEY, dibuat timestamptz NOT NULL) PARTITION BY RANGE (dibuat)`)
	if kodePG(err) != "0A000" {
		t.Fatalf("PK tanpa kolom partisi: %v, ingin 0A000", err)
	}
	var pk string
	if err := db.QueryRow(`SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'posting'::regclass AND contype = 'p'`).Scan(&pk); err != nil {
		t.Fatal(err)
	}
	if pk != "PRIMARY KEY (id, dibuat)" {
		t.Fatalf("PK posting %q, ingin PRIMARY KEY (id, dibuat)", pk)
	}
}

// Query satu hari hanya membaca partisi bulannya (pruning), dan query tanpa batas `dibuat` membaca semuanya.
func TestLaporanHariIniMemangkasPartisi(t *testing.T) {
	_, db := siapkan(t)
	baca := func(q string) string {
		rows, err := db.Query(`EXPLAIN (COSTS OFF) ` + q)
		if err != nil {
			t.Fatal(err)
		}
		defer rows.Close()
		var b strings.Builder
		for rows.Next() {
			var l string
			rows.Scan(&l)
			b.WriteString(l + "\n")
		}
		return b.String()
	}
	// Batas berupa literal supaya pemangkasan terjadi saat perencanaan dan terbaca di EXPLAIN (fungsi seperti now()
	// baru memangkas saat eksekusi).
	awal := awalHariWIB(time.Now())
	lit := func(t time.Time) string { return "'" + t.Format("2006-01-02 15:04:05-07") + "'" }
	satu := baca(fmt.Sprintf(`SELECT count(*) FROM posting WHERE dibuat >= %s AND dibuat < %s`, lit(awal), lit(awal.AddDate(0, 0, 1))))
	semua := baca(`SELECT count(*) FROM posting WHERE jumlah > 0`)
	nama := func(plan string) map[string]bool {
		m := map[string]bool{}
		for _, p := range []string{"posting_sebelum", "posting_bulan_00", "posting_bulan_01", "posting_bulan_02"} {
			if strings.Contains(plan, p) {
				m[p] = true
			}
		}
		return m
	}
	if got := nama(satu); len(got) != 1 {
		t.Fatalf("pruning: ingin satu partisi dibaca, dapat %v:\n%s", got, satu)
	}
	if got := nama(semua); len(got) != 4 {
		t.Fatalf("tanpa batas dibuat: ingin keempat partisi dibaca, dapat %v:\n%s", got, semua)
	}
}

// --8<-- [end:tes-partisi]

// Referensi jurnal: unik, dan bentuknya dijaga database. Jurnal berulang dengan referensi sama mengembalikan jurnal
// yang sama (ADR 54).
func TestJurnalReferensiUnikDanBerbentuk(t *testing.T) {
	_, db := siapkan(t)
	ctx := context.Background()
	a, _ := akunBaru(t, db, "karyawan", 100_000)
	w, _ := akunBaru(t, db, "warung", 0)
	ref := fmt.Sprintf("angsuran:%d:1", 900_000+a)
	var j1, j2 int64
	var baru1, baru2 bool
	tulis := func(j *int64, baru *bool) {
		err := repo.Baru(db).DalamTx(ctx, func(tx repo.Tx) error {
			buku, err := tx.KunciBukuAkun(ctx, a, w)
			if err != nil {
				return err
			}
			*j, *baru, err = tx.CatatJurnalReferensi(ctx, "angsuran", "tes referensi", a, ref,
				[]repo.Posting{{BukuID: buku[a].ID, Jumlah: -10_000}, {BukuID: buku[w].ID, Jumlah: 10_000}})
			return err
		})
		if err != nil {
			t.Fatal(err)
		}
	}
	tulis(&j1, &baru1)
	tulis(&j2, &baru2)
	if j1 != j2 || !baru1 || baru2 {
		t.Fatalf("referensi sama: jurnal %d lalu %d, baru %v lalu %v; ingin jurnal sama, baru lalu bukan baru", j1, j2, baru1, baru2)
	}
	if saldoBuku(t, db, a, "karyawan") != 90_000 {
		t.Fatal("saldo berkurang lebih dari sekali")
	}
	_, err := db.Exec(`INSERT INTO jurnal (jenis, keterangan, dibuat_oleh, referensi) VALUES ('angsuran', 'bentuk salah', $1, 'angsuran:abc')`, a)
	if kodePG(err) != "23514" {
		t.Fatalf("referensi berbentuk salah: %v, ingin 23514", err)
	}
	_, err = db.Exec(`INSERT INTO jurnal (jenis, keterangan, dibuat_oleh, referensi) VALUES ('angsuran', 'ganda', $1, $2)`, a, ref)
	if kodePG(err) != "23505" {
		t.Fatalf("referensi ganda: %v, ingin 23505", err)
	}
}

// Buku tabungan adalah buku milik akun: saldonya tidak boleh negatif, dan buku utama tidak tertukar dengannya.
func TestBukuTabunganMilikAkun(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	a, _ := akunBaru(t, db, "karyawan", 70_000)
	r := repo.Baru(db)
	var tabungan, utama int64
	err := r.DalamTx(ctx, func(tx repo.Tx) error {
		b, err := tx.BukuTabungan(ctx, a)
		tabungan = b.ID
		return err
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`SELECT id FROM buku WHERE akun_id = $1 AND jenis = 'karyawan'`, a).Scan(&utama); err != nil {
		t.Fatal(err)
	}
	// Keluar dari tabungan yang kosong: ditolak oleh aturan saldo tidak negatif saat COMMIT.
	err = r.DalamTx(ctx, func(tx repo.Tx) error {
		_, err := tx.CatatJurnal(ctx, "tabungan", "tarik dari tabungan kosong", a, nil,
			[]repo.Posting{{BukuID: tabungan, Jumlah: -1_000}, {BukuID: utama, Jumlah: 1_000}})
		return err
	})
	if kodePG(err) != "23514" || namaConstraint(err) != "saldo_karyawan_tidak_negatif" {
		t.Fatalf("tarik dari tabungan kosong: %v, ingin 23514 saldo_karyawan_tidak_negatif", err)
	}
	// Buku utama tetap yang dibaca Akun dan KunciBukuAkun, juga sesudah tabungan ada.
	ak, err := svc.LihatAkun(ctx, a, a)
	if err != nil || ak.Saldo != 70_000 {
		t.Fatalf("saldo akun %d, %v; ingin 70000 dari buku utama", ak.Saldo, err)
	}
	err = r.DalamTx(ctx, func(tx repo.Tx) error {
		m, err := tx.KunciBukuAkun(ctx, a)
		if err == nil && (len(m) != 1 || m[a].ID != utama) {
			err = fmt.Errorf("KunciBukuAkun memberi %v, ingin hanya buku utama %d", m, utama)
		}
		return err
	})
	if err != nil {
		t.Fatal(err)
	}
	// Satu akun satu buku tabungan.
	if _, err := db.Exec(`INSERT INTO buku (akun_id, jenis) VALUES ($1, 'tabungan')`, a); kodePG(err) != "23505" {
		t.Fatalf("buku tabungan kedua: %v, ingin 23505", err)
	}
	// Merchant tidak bisa punya buku tabungan tanpa pemilik: buku_pemilik.
	if _, err := db.Exec(`INSERT INTO buku (akun_id, jenis) VALUES (NULL, 'tabungan')`); kodePG(err) != "23514" {
		t.Fatalf("tabungan tanpa pemilik: %v, ingin 23514", err)
	}
}

// Worker push tanpa daftar lajur tidak mengklaim baris stream; relay stream mengklaimnya lewat lajurnya sendiri.
func TestOutboxStreamBukanPekerjaanWorkerPush(t *testing.T) {
	_, db := siapkan(t)
	ctx := context.Background()
	admin, _ := akunBaru(t, db, "admin", 0)
	var stream, push int64
	if err := db.QueryRow(`INSERT INTO outbox (akun_id, kelas, jenis, payload, tujuan) VALUES ($1, 2, 'pengumuman', '{}', 'stream') RETURNING id`, admin).Scan(&stream); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`INSERT INTO outbox (akun_id, kelas, jenis, payload, tujuan) VALUES ($1, 2, 'promo', '{}', 'push') RETURNING id`, admin).Scan(&push); err != nil {
		t.Fatal(err)
	}
	r := repo.Baru(db)
	punya := func(d []repo.Notifikasi, id int64) bool {
		for _, n := range d {
			if n.ID == id {
				return true
			}
		}
		return false
	}
	semua, err := r.KlaimOutboxTujuan(ctx, 1000, time.Minute, true, nil)
	if err != nil {
		t.Fatal(err)
	}
	if punya(semua, stream) || !punya(semua, push) {
		t.Fatalf("worker tanpa daftar lajur: stream diklaim %v, push diklaim %v; ingin stream tidak, push ya", punya(semua, stream), punya(semua, push))
	}
	relay, err := r.KlaimOutboxTujuan(ctx, 1000, time.Minute, true, []string{repo.TujuanStream})
	if err != nil {
		t.Fatal(err)
	}
	if !punya(relay, stream) || punya(relay, push) {
		t.Fatalf("relay stream: stream diklaim %v, push diklaim %v; ingin stream ya, push tidak", punya(relay, stream), punya(relay, push))
	}
	// Pengumuman wajib bertujuan stream.
	if _, err := db.Exec(`INSERT INTO outbox (akun_id, kelas, jenis, payload, tujuan) VALUES ($1, 2, 'pengumuman', '{}', 'push')`, admin); kodePG(err) != "23514" {
		t.Fatalf("pengumuman bertujuan push: %v, ingin 23514", err)
	}
}

// Satu pengumuman = satu baris pengumuman dan satu baris outbox stream, bukan satu baris per penerima (M45).
func TestPengumumanSatuBarisSatuEvent(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	admin, _ := akunBaru(t, db, "admin", 0)
	biasa, _ := akunBaru(t, db, "karyawan", 0)
	for i := 0; i < 3; i++ { // tiga HP milik tiga akun: penerima banyak, event tetap satu
		k, _ := akunBaru(t, db, "karyawan", 0)
		if _, err := db.Exec(`INSERT INTO perangkat (akun_id, platform, token_push) VALUES ($1, 'android', $2)`, k, fmt.Sprintf("tes-%d-%d", k, i)); err != nil {
			t.Fatal(err)
		}
	}
	if _, _, err := svc.BuatPengumuman(ctx, biasa, "bukan hak karyawan"); !errors.Is(err, ErrDilarang) {
		t.Fatalf("karyawan membuat pengumuman: %v, ingin ErrDilarang", err)
	}
	if _, _, err := svc.BuatPengumuman(ctx, admin, "   "); !errors.As(err, new(ErrValidasi)) {
		t.Fatalf("judul kosong: %v, ingin ErrValidasi", err)
	}
	sebelum := hitungSQL(t, db, `SELECT count(*) FROM outbox WHERE jenis = 'pengumuman'`)
	id, n, err := svc.BuatPengumuman(ctx, admin, "Pemeliharaan Sabtu malam")
	if err != nil {
		t.Fatal(err)
	}
	if n < 3 {
		t.Fatalf("jumlah penerima %d, ingin sedikitnya 3", n)
	}
	if hitungSQL(t, db, `SELECT count(*) FROM outbox WHERE jenis = 'pengumuman'`)-sebelum != 1 {
		t.Fatal("satu pengumuman harus menambah tepat satu baris outbox")
	}
	var tujuan string
	var payload string
	if err := db.QueryRow(`SELECT tujuan, payload::text FROM outbox WHERE jenis = 'pengumuman' ORDER BY id DESC LIMIT 1`).Scan(&tujuan, &payload); err != nil {
		t.Fatal(err)
	}
	if tujuan != "stream" || !strings.Contains(payload, fmt.Sprintf(`"pengumuman_id": %d`, id)) {
		t.Fatalf("outbox pengumuman: tujuan %q payload %s", tujuan, payload)
	}
}

// Laporan merchant (M40): hanya mode laporan-primary, hanya pemilik, menjumlah posting masuk hari ini dari primary;
// dengan cache, panggilan kedua tidak membaca database.
func TestLaporanHariIni(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	w, _ := akunBaru(t, db, "warung", 0)
	lain, _ := akunBaru(t, db, "warung", 0)
	isiSaldo(t, db, w, 30_000)
	isiSaldo(t, db, w, 12_000)
	isiSaldo(t, db, lain, 99_000)
	if _, err := svc.LaporanHariIni(ctx, w, w); !errors.Is(err, ErrTidakDitemukan) {
		t.Fatalf("tanpa mode laporan-primary: %v, ingin ErrTidakDitemukan (rute dan service sama-sama tertutup)", err)
	}
	s := svc.DenganMode(RentanLaporanPrimary)
	l, err := s.LaporanHariIni(ctx, w, w)
	if err != nil || l.Jumlah != 2 || l.Total != 42_000 || l.DibacaDari != "primary" {
		t.Fatalf("laporan %+v, %v; ingin 2 transaksi, total 42000, dari primary", l, err)
	}
	if _, err := s.LaporanHariIni(ctx, lain, w); !errors.Is(err, ErrTidakDitemukan) {
		t.Fatalf("laporan merchant lain: %v, ingin ErrTidakDitemukan", err)
	}
	karyawan, _ := akunBaru(t, db, "karyawan", 0)
	if _, err := s.LaporanHariIni(ctx, karyawan, karyawan); !errors.Is(err, ErrTidakDitemukan) {
		t.Fatalf("laporan akun karyawan: %v, ingin ErrTidakDitemukan", err)
	}
	// Cache: hit pada panggilan kedua, dan jawaban cache bisa setua TTL (angka lama sampai entri habis).
	kini := time.Now()
	k := &cache.Katalog{Nama: "memori", Urut: cache.HapusSesudah, P: cache.BaruMemori(func() time.Time { return kini }), TTL: TTLLaporan}
	sc := s.DenganCacheLaporan(k).DenganJam(func() time.Time { return kini })
	if _, err := sc.LaporanHariIni(ctx, w, w); err != nil {
		t.Fatal(err)
	}
	isiSaldo(t, db, w, 8_000)
	l2, _ := sc.LaporanHariIni(ctx, w, w)
	if k.Hit.Load() != 1 || k.Miss.Load() != 1 || l2.Total != 42_000 {
		t.Fatalf("cache: hit %d, miss %d, total %d; ingin hit 1, miss 1, total lama 42000", k.Hit.Load(), k.Miss.Load(), l2.Total)
	}
	kini = kini.Add(TTLLaporan + time.Second)
	l3, _ := sc.LaporanHariIni(ctx, w, w)
	if l3.Total != 50_000 || k.Miss.Load() != 2 {
		t.Fatalf("sesudah TTL: total %d, miss %d; ingin 50000 dan 2", l3.Total, k.Miss.Load())
	}
}

// siapkanCicilan: akun karyawan bersaldo, merchant, dan jadwal tiga angsuran Rp10.000 yang angsuran ke-1 sudah jatuh tempo.
func siapkanCicilan(t *testing.T, svc Service, db *sql.DB, saldoAwal int64) (akun, merchant, jadwal int64) {
	t.Helper()
	akun, _ = akunBaru(t, db, "karyawan", saldoAwal)
	merchant, _ = akunBaru(t, db, "warung", 0)
	kemarin := awalHariWIB(time.Now()).AddDate(0, 0, -1)
	var err error
	jadwal, err = svc.BuatCicilan(context.Background(), akun, "cicilan", &merchant, 10_000, 3, 15, kemarin)
	if err != nil {
		t.Fatal(err)
	}
	return
}

func statusAngsuran(t *testing.T, db *sql.DB, jadwal int64, ke int) string {
	t.Helper()
	var s string
	if err := db.QueryRow(`SELECT status FROM angsuran WHERE jadwal_id = $1 AND ke = $2`, jadwal, ke).Scan(&s); err != nil {
		t.Fatal(err)
	}
	return s
}

func besok() time.Time { return awalHariWIB(time.Now()) }

// --8<-- [start:tes-cicilan]
// Versi benar (ADR 54): job yang berhenti sesudah jurnal ditulis, lalu diulang sesudah 25 jam, tidak menagih dua kali.
func TestCicilanDiulangSesudahCrashTidakMenagihDua(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	akun, merchant, jadwal := siapkanCicilan(t, svc, db, 100_000)
	h, err := svc.JalankanCicilan(ctx, besok(), OpsiCicilan{BerhentiSetelahJurnal: 1, Jadwal: jadwal})
	if err != nil || h.Dijurnal != 1 || h.Dicatat != 0 {
		t.Fatalf("putaran yang berhenti: %+v, %v; ingin 1 jurnal, belum dicatat", h, err)
	}
	if statusAngsuran(t, db, jadwal, 1) != "menunggu" {
		t.Fatal("angsuran ke-1 harus masih menunggu: job berhenti sebelum menandai")
	}
	sesudah := svc.DenganJam(func() time.Time { return time.Now().Add(25 * time.Hour) })
	h, err = sesudah.JalankanCicilan(ctx, besok(), OpsiCicilan{Jadwal: jadwal})
	if err != nil || h.Dijurnal != 0 || h.JurnalAda != 1 || h.Dicatat != 1 {
		t.Fatalf("putaran ulang 25 jam kemudian: %+v, %v; ingin jurnal sudah ada, dicatat 1, tanpa jurnal baru", h, err)
	}
	if got := saldoBuku(t, db, akun, "karyawan"); got != 90_000 {
		t.Fatalf("saldo %d, ingin 90000: angsuran ke-1 hanya satu kali", got)
	}
	if got := saldoBuku(t, db, merchant, "warung"); got != 10_000 {
		t.Fatalf("saldo merchant %d, ingin 10000", got)
	}
	if statusAngsuran(t, db, jadwal, 1) != "dicatat" || statusAngsuran(t, db, jadwal, 2) != "menunggu" {
		t.Fatal("status: ke-1 dicatat, ke-2 menunggu (belum jatuh tempo)")
	}
	h, _ = sesudah.JalankanCicilan(ctx, besok(), OpsiCicilan{Jadwal: jadwal})
	if h.Dibaca != 0 || saldoBuku(t, db, akun, "karyawan") != 90_000 {
		t.Fatalf("putaran ketiga tidak boleh mengerjakan apa pun: %+v", h)
	}
}

// Mode rentan cicilan-satu-job (M48): sesudah key 24 jam kedaluwarsa, job yang diulang menagih angsuran yang sama lagi.
// Sebelum 24 jam, job yang diulang melewatinya dan angsurannya tertinggal menunggu.
func TestCicilanSatuJobRentanMenagihDuaSesudah24Jam(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	rentan := svc.DenganMode(RentanCicilanSatuJob)
	akun, _, jadwal := siapkanCicilan(t, rentan, db, 100_000)
	h, err := rentan.JalankanCicilan(ctx, besok(), OpsiCicilan{BerhentiSetelahJurnal: 1, Jadwal: jadwal})
	if err != nil || h.Dijurnal != 1 {
		t.Fatalf("putaran yang berhenti: %+v, %v", h, err)
	}
	cepat := rentan.DenganJam(func() time.Time { return time.Now().Add(time.Hour) })
	h, err = cepat.JalankanCicilan(ctx, besok(), OpsiCicilan{Jadwal: jadwal})
	if err != nil || h.Dilewati != 1 || h.Dijurnal != 0 || statusAngsuran(t, db, jadwal, 1) != "menunggu" {
		t.Fatalf("1 jam kemudian: %+v, %v, status %s; ingin dilewati dan tetap menunggu", h, err, statusAngsuran(t, db, jadwal, 1))
	}
	lambat := rentan.DenganJam(func() time.Time { return time.Now().Add(25 * time.Hour) })
	h, err = lambat.JalankanCicilan(ctx, besok(), OpsiCicilan{Jadwal: jadwal})
	if err != nil || h.Dijurnal != 1 || h.Dicatat != 1 {
		t.Fatalf("25 jam kemudian: %+v, %v; ingin jurnal kedua dan dicatat", h, err)
	}
	if got := saldoBuku(t, db, akun, "karyawan"); got != 80_000 {
		t.Fatalf("saldo %d, ingin 80000: angsuran ke-1 terdebit dua kali (M48)", got)
	}
}

// --8<-- [end:tes-cicilan]

// Saldo kurang: angsuran gagal dan tidak ada jurnal; tabungan memindahkan uang ke buku tabungan akun itu sendiri.
func TestCicilanSaldoKurangDanTabungan(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	akun, _, jadwal := siapkanCicilan(t, svc, db, 4_000)
	h, err := svc.JalankanCicilan(ctx, besok(), OpsiCicilan{Jadwal: jadwal})
	if err != nil || h.Gagal != 1 || h.Dijurnal != 0 || statusAngsuran(t, db, jadwal, 1) != "gagal" {
		t.Fatalf("saldo kurang: %+v, %v, status %s", h, err, statusAngsuran(t, db, jadwal, 1))
	}
	if got := saldoBuku(t, db, akun, "karyawan"); got != 4_000 {
		t.Fatalf("saldo %d, ingin 4000 tidak berubah", got)
	}
	a2, _ := akunBaru(t, db, "karyawan", 50_000)
	j2, err := svc.BuatCicilan(ctx, a2, "tabungan", nil, 20_000, 2, 10, awalHariWIB(time.Now()).AddDate(0, 0, -1))
	if err != nil {
		t.Fatal(err)
	}
	h, err = svc.JalankanCicilan(ctx, besok(), OpsiCicilan{Jadwal: j2})
	if err != nil || h.Dijurnal != 1 || h.Dicatat != 1 {
		t.Fatalf("tabungan: %+v, %v", h, err)
	}
	if saldoBuku(t, db, a2, "karyawan") != 30_000 || saldoBuku(t, db, a2, "tabungan") != 20_000 {
		t.Fatal("tabungan: ingin utama 30000 dan tabungan 20000")
	}
}

// Validasi jadwal: jenis, merchant, batas angka, dan hak.
func TestBuatCicilanValidasi(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	a, _ := akunBaru(t, db, "karyawan", 0)
	w, _ := akunBaru(t, db, "warung", 0)
	admin, _ := akunBaru(t, db, "admin", 0)
	mulai := awalHariWIB(time.Now())
	for nama, f := range map[string]func() error{
		"jenis":                    func() error { _, e := svc.BuatCicilan(ctx, a, "pinjaman", &w, 1000, 3, 5, mulai); return e },
		"cicilan tanpa merchant":   func() error { _, e := svc.BuatCicilan(ctx, a, "cicilan", nil, 1000, 3, 5, mulai); return e },
		"tabungan dengan merchant": func() error { _, e := svc.BuatCicilan(ctx, a, "tabungan", &w, 1000, 3, 5, mulai); return e },
		"merchant bukan merchant":  func() error { _, e := svc.BuatCicilan(ctx, a, "cicilan", &a, 1000, 3, 5, mulai); return e },
		"jumlah nol":               func() error { _, e := svc.BuatCicilan(ctx, a, "cicilan", &w, 0, 3, 5, mulai); return e },
		"angsuran 37":              func() error { _, e := svc.BuatCicilan(ctx, a, "cicilan", &w, 1000, 37, 5, mulai); return e },
		"hari 29":                  func() error { _, e := svc.BuatCicilan(ctx, a, "cicilan", &w, 1000, 3, 29, mulai); return e },
	} {
		if err := f(); !errors.As(err, new(ErrValidasi)) {
			t.Errorf("%s: %v, ingin ErrValidasi", nama, err)
		}
	}
	if _, err := svc.BuatCicilan(ctx, admin, "cicilan", &w, 1000, 3, 5, mulai); !errors.Is(err, ErrDilarang) {
		t.Errorf("admin membuat cicilan: %v, ingin ErrDilarang", err)
	}
}
