package service

import (
	"context"
	"database/sql"
	"sync"
	"testing"
	"time"

	"lab/apit4/internal/gateway"
	"lab/apit4/internal/repo"
)

// Tes koreksi insiden rekonsiliasi (M30, ADR 35, ADR 19) dengan PostgreSQL sungguhan. Job memproses SEMUA insiden
// terbuka di schema tes, termasuk sisa tes lain, jadi tiap tes lebih dulu menutup insiden lain
// (bersihkanInsiden) dan memeriksa hanya insiden miliknya. Insiden ditulis langsung dengan bentuk yang sama dengan
// RekonHarian, kecuali di tes alur lengkap.

func bersihkanInsiden(t *testing.T, db *sql.DB, kecuali ...string) {
	t.Helper()
	if _, err := db.Exec(`UPDATE insiden_rekon SET status = 'selesai' WHERE status = 'terbuka' AND NOT (order_id = ANY($1))`, kecuali); err != nil {
		t.Fatal(err)
	}
}

func insidenBaru(t *testing.T, db *sql.DB, order string, topup int64, jenis string, selisih int64) int64 {
	t.Helper()
	var tp *int64
	if topup != 0 {
		tp = &topup
	}
	var id int64
	if err := db.QueryRow(`INSERT INTO insiden_rekon (tanggal, order_id, topup_id, jenis, selisih)
		VALUES ((now() AT TIME ZONE 'Asia/Jakarta')::date, $1, $2, $3, $4) RETURNING id`, order, tp, jenis, selisih).Scan(&id); err != nil {
		t.Fatal(err)
	}
	return id
}

func statusInsiden(t *testing.T, db *sql.DB, id int64) (string, *int64) {
	t.Helper()
	var s string
	var j *int64
	if err := db.QueryRow(`SELECT status, jurnal_id FROM insiden_rekon WHERE id = $1`, id).Scan(&s, &j); err != nil {
		t.Fatal(err)
	}
	return s, j
}

func jurnalUntukOrder(t *testing.T, db *sql.DB, order string) int {
	t.Helper()
	var n int
	if err := db.QueryRow(`SELECT count(*) FROM jurnal WHERE keterangan LIKE '%' || $1 || '%'`, order).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func jumlahPosting(t *testing.T, db *sql.DB) (n, jumlah int64) {
	t.Helper()
	if err := db.QueryRow(`SELECT count(*), coalesce(sum(jumlah), 0) FROM posting`).Scan(&n, &jumlah); err != nil {
		t.Fatal(err)
	}
	return
}

func jumlahOutboxAkun(t *testing.T, db *sql.DB, akun int64) int {
	t.Helper()
	var n int
	if err := db.QueryRow(`SELECT count(*) FROM outbox WHERE akun_id = $1`, akun).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

// tidak_di_ledger dari RekonHarian sampai koreksi: gateway settlement, webhook tidak pernah datang. Job menutupnya
// lewat jurnal top-up biasa, lalu kabar yang datang terlambat tidak menjurnal lagi.
func TestKoreksiRekonTidakDiLedgerMengkreditLaluKabarTerlambatGanda(t *testing.T) {
	svc0, db := siapkan(t)
	g := gatewayTes(t)
	svc := svcT4(t, svc0, g)
	ctx := context.Background()
	jkt, _ := time.LoadLocation("Asia/Jakarta")
	tgl := time.Now().In(jkt).Format("2006-01-02")
	akun := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
	tid, order := topupSiap(t, db, akun, 15_000)
	g.mu.Lock()
	g.settlement = append(g.settlement[:0], gateway.BarisSettlement{OrderID: order, Jumlah: 15_000})
	g.mu.Unlock()
	if _, err := svc.RekonHarian(ctx, tgl); err != nil {
		t.Fatal(err)
	}
	bersihkanInsiden(t, db, order)
	var insiden int64
	db.QueryRow(`SELECT id FROM insiden_rekon WHERE order_id = $1 AND jenis = 'tidak_di_ledger'`, order).Scan(&insiden)
	if insiden == 0 {
		t.Fatal("RekonHarian tidak mencatat tidak_di_ledger")
	}
	sebelum, _ := jumlahPosting(t, db)
	h, err := svc.KoreksiRekon(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if h != (HasilKoreksi{Diperiksa: 1, Dikoreksi: 1}) {
		t.Fatalf("hasil %+v", h)
	}
	if s := saldo(t, db, akun); s != 15_000 {
		t.Errorf("saldo %d, harus 15000 (saldo_cache sama dengan jumlah posting)", s)
	}
	if n := jurnalUntukOrder(t, db, order); n != 1 {
		t.Errorf("%d jurnal untuk order, harus 1", n)
	}
	var jurnalTopup *int64
	db.QueryRow(`SELECT jurnal_id FROM topup_bank WHERE id = $1`, tid).Scan(&jurnalTopup)
	st, jInsiden := statusInsiden(t, db, insiden)
	if st != "selesai" || jInsiden == nil || jurnalTopup == nil || *jInsiden != *jurnalTopup {
		t.Errorf("insiden %s jurnal %v, harus selesai dan terikat ke jurnal top-up %v", st, jInsiden, jurnalTopup)
	}
	if s := statusTopup(t, db, tid); s != "dibayar" {
		t.Errorf("status top-up %s", s)
	}
	if n, _ := jumlahPosting(t, db); n != sebelum+2 {
		t.Errorf("posting bertambah %d, harus 2 (satu jurnal dua posting)", n-sebelum)
	}
	if n := jumlahOutboxAkun(t, db, akun); n != 1 {
		t.Errorf("%d pemberitahuan untuk akun, harus 1", n)
	}
	// Dijalankan lagi: tidak ada yang tersisa, tidak ada jurnal baru.
	if h2, _ := svc.KoreksiRekon(ctx); h2 != (HasilKoreksi{}) {
		t.Errorf("job kedua %+v", h2)
	}
	if n := jurnalUntukOrder(t, db, order); n != 1 {
		t.Errorf("sesudah job kedua %d jurnal", n)
	}
	// Webhook yang terlambat datang: status dibayar menahannya.
	if r, err := kabarSah(svc, time.Now(), idEvent(t, "tlt"), order, "settlement", 15_000); err != nil || r.Hasil != "ganda" {
		t.Errorf("kabar terlambat: %+v %v", r, err)
	}
	if n := jurnalUntukOrder(t, db, order); n != 1 {
		t.Errorf("sesudah kabar terlambat %d jurnal", n)
	}
}

// tidak_di_ledger yang tidak boleh ditutup otomatis: tetap terbuka, tidak ada jurnal.
func TestKoreksiRekonTidakDiLedgerYangDitahan(t *testing.T) {
	svc0, db := siapkan(t)
	g := gatewayTes(t)
	svc := svcT4(t, svc0, g)
	ctx := context.Background()
	type kasus struct {
		nama    string
		insiden int64
		order   string
		akun    int64
	}
	var daftar []kasus
	tambah := func(nama string, akun, jumlah int64, selisih int64, ubah func(tid int64)) {
		tid, order := topupSiap(t, db, akun, jumlah)
		if ubah != nil {
			ubah(tid)
		}
		daftar = append(daftar, kasus{nama, insidenBaru(t, db, order, tid, "tidak_di_ledger", selisih), order, akun})
	}
	lewatBatas := qrAkun(t, db, "pemakai", "belum", "aktif", 990_000)
	tambah("melewati batas tingkat", lewatBatas, 20_000, 20_000, nil)
	beku := qrAkun(t, db, "pemakai", "terverifikasi", "dibekukan", 0)
	tambah("akun dibekukan", beku, 20_000, 20_000, nil)
	biasa := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
	tambah("sudah kedaluwarsa", biasa, 20_000, 20_000, func(tid int64) {
		db.Exec(`UPDATE topup_bank SET status = 'kedaluwarsa' WHERE id = $1`, tid)
	})
	tambah("sudah gagal", biasa, 20_000, 20_000, func(tid int64) {
		db.Exec(`UPDATE topup_bank SET status = 'gagal' WHERE id = $1`, tid)
	})
	tambah("jumlah gateway bukan jumlah order", biasa, 20_000, 21_000, nil)
	// Order yang tidak dikenal Rekeningo: tidak ada baris top-up, tidak ada akun yang bisa dikredit.
	orderAsing := orderBaru()
	asing := insidenBaru(t, db, orderAsing, 0, "tidak_di_ledger", 50_000)
	semua := []string{orderAsing}
	for _, k := range daftar {
		semua = append(semua, k.order)
	}
	bersihkanInsiden(t, db, semua...)
	sebelum, jumlah := jumlahPosting(t, db)
	h, err := svc.KoreksiRekon(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if h != (HasilKoreksi{Diperiksa: 6, Ditahan: 6}) {
		t.Fatalf("hasil %+v", h)
	}
	if n, j := jumlahPosting(t, db); n != sebelum || j != jumlah {
		t.Errorf("posting %d/%d menjadi %d/%d: tidak ada jurnal yang boleh ditulis", sebelum, jumlah, n, j)
	}
	for _, k := range daftar {
		if st, _ := statusInsiden(t, db, k.insiden); st != "terbuka" {
			t.Errorf("%s: insiden %s, harus tetap terbuka", k.nama, st)
		}
		if n := jurnalUntukOrder(t, db, k.order); n != 0 {
			t.Errorf("%s: %d jurnal", k.nama, n)
		}
	}
	if st, _ := statusInsiden(t, db, asing); st != "terbuka" {
		t.Errorf("order tidak dikenal: %s", st)
	}
	if s := saldo(t, db, lewatBatas); s != 990_000 {
		t.Errorf("saldo akun di batas berubah: %d", s)
	}
}

// Insiden yang sudah dikredit lewat jalur lain sesudah rekonsiliasi cukup ditutup, tanpa jurnal kedua.
func TestKoreksiRekonTidakDiLedgerYangSudahDikreditJalurLain(t *testing.T) {
	svc0, db := siapkan(t)
	svc := svcT4(t, svc0, gatewayTes(t))
	akun := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
	tid, order := topupSiap(t, db, akun, 30_000)
	insiden := insidenBaru(t, db, order, tid, "tidak_di_ledger", 30_000)
	if h, err := kabarSah(svc, time.Now(), idEvent(t, "jl"), order, "settlement", 30_000); err != nil || h.Hasil != "diproses" {
		t.Fatalf("%+v %v", h, err)
	}
	// Dikredit lewat jalur lain, tetapi jumlah di laporan gateway berbeda dari yang dikredit: bukan tugas insiden ini.
	tid2, order2 := topupSiap(t, db, akun, 20_000)
	if h, err := kabarSah(svc, time.Now(), idEvent(t, "jl2"), order2, "settlement", 20_000); err != nil || h.Hasil != "diproses" {
		t.Fatalf("%+v %v", h, err)
	}
	insidenBeda := insidenBaru(t, db, order2, tid2, "tidak_di_ledger", 21_000)
	bersihkanInsiden(t, db, order, order2)
	h, err := svc.KoreksiRekon(context.Background())
	if err != nil || h != (HasilKoreksi{Diperiksa: 2, SelesaiTanpaJurnal: 1, Ditahan: 1}) {
		t.Fatalf("hasil %+v %v", h, err)
	}
	if st, _ := statusInsiden(t, db, insidenBeda); st != "terbuka" {
		t.Errorf("insiden dengan jumlah berbeda: %s, harus tetap terbuka", st)
	}
	st, j := statusInsiden(t, db, insiden)
	var jurnalTopup *int64
	db.QueryRow(`SELECT jurnal_id FROM topup_bank WHERE id = $1`, tid).Scan(&jurnalTopup)
	if st != "selesai" || j == nil || *j != *jurnalTopup {
		t.Errorf("insiden %s jurnal %v, harus terikat ke jurnal top-up %v", st, j, jurnalTopup)
	}
	if n := jurnalUntukOrder(t, db, order); n != 1 {
		t.Errorf("%d jurnal untuk order", n)
	}
	if s := saldo(t, db, akun); s != 50_000 {
		t.Errorf("saldo %d", s)
	}
}

// jumlah_beda: gateway menerima lebih besar dari yang dikredit, selisihnya dikredit lewat jurnal kedua; yang lebih
// kecil, melewati batas tingkat, atau akun dibekukan menunggu keputusan manusia.
func TestKoreksiRekonJumlahBeda(t *testing.T) {
	svc0, db := siapkan(t)
	svc := svcT4(t, svc0, gatewayTes(t))
	ctx := context.Background()
	kredit := func(akun, jumlah int64) (int64, string) {
		tid, order := topupSiap(t, db, akun, jumlah)
		if h, err := kabarSah(svc, time.Now(), idEvent(t, "jb"), order, "settlement", jumlah); err != nil || h.Hasil != "diproses" {
			t.Fatalf("%+v %v", h, err)
		}
		return tid, order
	}
	biasa := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
	tidB, orderB := kredit(biasa, 20_000)
	lebih := insidenBaru(t, db, orderB, tidB, "jumlah_beda", 5_000)
	kurang := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
	tidK, orderK := kredit(kurang, 20_000)
	lebihKecil := insidenBaru(t, db, orderK, tidK, "jumlah_beda", -5_000)
	dekat := qrAkun(t, db, "pemakai", "belum", "aktif", 0)
	tidD, orderD := kredit(dekat, 980_000)
	lewat := insidenBaru(t, db, orderD, tidD, "jumlah_beda", 30_000)
	beku := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
	tidZ, orderZ := kredit(beku, 20_000)
	dibekukan := insidenBaru(t, db, orderZ, tidZ, "jumlah_beda", 5_000)
	db.Exec(`UPDATE akun SET status = 'dibekukan' WHERE id = $1`, beku)
	// Top-up yang belum dibayar menurut ledger tidak punya jurnal untuk diselisihkan: tidak dikredit.
	belum := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
	tidM, orderM := topupSiap(t, db, belum, 20_000)
	menunggu := insidenBaru(t, db, orderM, tidM, "jumlah_beda", 5_000)
	bersihkanInsiden(t, db, orderB, orderK, orderD, orderZ, orderM)
	h, err := svc.KoreksiRekon(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if h != (HasilKoreksi{Diperiksa: 5, Dikoreksi: 1, Ditahan: 4}) {
		t.Fatalf("hasil %+v", h)
	}
	if s := saldo(t, db, biasa); s != 25_000 {
		t.Errorf("saldo akun dengan selisih +5000: %d, harus 25000", s)
	}
	if n := jurnalUntukOrder(t, db, orderB); n != 2 {
		t.Errorf("%d jurnal untuk order, harus 2 (kredit awal dan koreksi)", n)
	}
	st, j := statusInsiden(t, db, lebih)
	if st != "selesai" || j == nil {
		t.Errorf("insiden +5000: %s %v", st, j)
	} else {
		var ket, jenis string
		db.QueryRow(`SELECT keterangan, jenis FROM jurnal WHERE id = $1`, *j).Scan(&ket, &jenis)
		if jenis != "topup_bank" || ket == "Top-up bank "+orderB {
			t.Errorf("jurnal koreksi: %s %q", jenis, ket)
		}
	}
	if n := jumlahOutboxAkun(t, db, biasa); n != 2 {
		t.Errorf("%d pemberitahuan, harus 2 (kredit awal dan koreksi)", n)
	}
	for nama, id := range map[string]int64{"selisih negatif": lebihKecil, "melewati batas": lewat, "dibekukan": dibekukan, "belum dibayar": menunggu} {
		if st, _ := statusInsiden(t, db, id); st != "terbuka" {
			t.Errorf("%s: %s", nama, st)
		}
	}
	for nama, c := range map[string]struct {
		akun, saldo int64
		order       string
	}{"negatif": {kurang, 20_000, orderK}, "batas": {dekat, 980_000, orderD}, "beku": {beku, 20_000, orderZ}, "belum dibayar": {belum, 0, orderM}} {
		if s := saldo(t, db, c.akun); s != c.saldo {
			t.Errorf("%s: saldo %d", nama, s)
		}
		harusJurnal := 1
		if nama == "belum dibayar" {
			harusJurnal = 0
		}
		if n := jurnalUntukOrder(t, db, c.order); n != harusJurnal {
			t.Errorf("%s: %d jurnal", nama, n)
		}
	}
	// Job kedua: yang sudah ditutup tidak dikoreksi lagi; yang ditahan tetap ditahan.
	h2, _ := svc.KoreksiRekon(ctx)
	if h2 != (HasilKoreksi{Diperiksa: 4, Ditahan: 4}) {
		t.Errorf("job kedua %+v", h2)
	}
	if s := saldo(t, db, biasa); s != 25_000 {
		t.Errorf("saldo sesudah job kedua %d", s)
	}
}

// tidak_di_gateway: laporan gateway tanggal itu tidak memuat order yang sudah dikredit. Gateway ditanya langsung.
func TestKoreksiRekonTidakDiGateway(t *testing.T) {
	svc0, db := siapkan(t)
	g := gatewayTes(t)
	svc := svcT4(t, svc0, g)
	ctx := context.Background()
	kredit := func(jumlah int64) (akun, tid int64, order string) {
		akun = qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
		tid, order = topupSiap(t, db, akun, jumlah)
		if h, err := kabarSah(svc, time.Now(), idEvent(t, "tg"), order, "settlement", jumlah); err != nil || h.Hasil != "diproses" {
			t.Fatalf("%+v %v", h, err)
		}
		return
	}
	// a. gateway: settlement di tanggal lain dengan jumlah yang sama, ledger sudah benar.
	akunA, tidA, orderA := kredit(40_000)
	g.tandai(orderA, "settlement", 40_000)
	insA := insidenBaru(t, db, orderA, tidA, "tidak_di_gateway", -40_000)
	// b. gateway tidak mengenal order itu (404): uang tidak pernah masuk, kredit dibalik.
	akunB, tidB, orderB := kredit(45_000)
	insB := insidenBaru(t, db, orderB, tidB, "tidak_di_gateway", -45_000)
	// c. gateway mengenalnya tetapi statusnya pending: dibalik juga.
	akunC, tidC, orderC := kredit(46_000)
	g.tandai(orderC, "pending", 46_000)
	insC := insidenBaru(t, db, orderC, tidC, "tidak_di_gateway", -46_000)
	// d. settlement, jumlahnya berbeda: bukan urusan job ini (rekonsiliasi tanggal settlement mencatatnya).
	akunD, tidD, orderD := kredit(47_000)
	g.tandai(orderD, "settlement", 50_000)
	insD := insidenBaru(t, db, orderD, tidD, "tidak_di_gateway", -47_000)
	// e. uang sudah terpakai: jurnal pembalik akan membuat saldo negatif, menunggu Keuangan.
	akunE, tidE, orderE := kredit(48_000)
	insE := insidenBaru(t, db, orderE, tidE, "tidak_di_gateway", -48_000)
	tujuan := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
	var bukuE, bukuTujuan int64
	db.QueryRow(`SELECT id FROM buku WHERE akun_id = $1`, akunE).Scan(&bukuE)
	db.QueryRow(`SELECT id FROM buku WHERE akun_id = $1`, tujuan).Scan(&bukuTujuan)
	if err := repo.Baru(db).DalamTx(ctx, func(tx repo.Tx) error {
		_, err := tx.CatatJurnal(ctx, "transfer", "uang terpakai", akunE, nil, []repo.Posting{{BukuID: bukuE, Jumlah: -40_000}, {BukuID: bukuTujuan, Jumlah: 40_000}})
		return err
	}); err != nil {
		t.Fatal(err)
	}
	// f. sudah dibalik lewat jalur lain sebelum job jalan.
	akunF, tidF, orderF := kredit(49_000)
	var jurnalF int64
	db.QueryRow(`SELECT jurnal_id FROM topup_bank WHERE id = $1`, tidF).Scan(&jurnalF)
	admin, _ := akunBaru(t, db, "admin", 0)
	if _, err := svc.Balik(ctx, admin, jurnalF, "dibalik lebih dulu oleh Keuangan untuk tes"); err != nil {
		t.Fatalf("balik: %v", err)
	}
	insF := insidenBaru(t, db, orderF, tidF, "tidak_di_gateway", -49_000)
	// g. top-up belum dibayar menurut ledger: tidak ada jurnal yang bisa dibalik.
	akunG := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
	tidG, orderG := topupSiap(t, db, akunG, 41_000)
	insG := insidenBaru(t, db, orderG, tidG, "tidak_di_gateway", -41_000)
	semua := []string{orderA, orderB, orderC, orderD, orderE, orderF, orderG}
	bersihkanInsiden(t, db, semua...)
	h, err := svc.KoreksiRekon(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if h != (HasilKoreksi{Diperiksa: 7, Dikoreksi: 2, SelesaiTanpaJurnal: 2, Ditahan: 3}) {
		t.Fatalf("hasil %+v", h)
	}
	cek := func(nama string, ins int64, st string, adaJurnal bool) {
		t.Helper()
		s, j := statusInsiden(t, db, ins)
		if s != st || (j != nil) != adaJurnal {
			t.Errorf("%s: insiden %s jurnal %v, harus %s dengan jurnal %v", nama, s, j, st, adaJurnal)
		}
	}
	cek("a settlement tanggal lain", insA, "selesai", false)
	cek("b order tidak dikenal", insB, "selesai", true)
	cek("c pending", insC, "selesai", true)
	cek("d jumlah beda", insD, "terbuka", false)
	cek("e uang terpakai", insE, "terbuka", false)
	cek("f sudah dibalik", insF, "selesai", true)
	cek("g belum dibayar", insG, "terbuka", false)
	for nama, c := range map[string]struct {
		akun, saldo int64
		order       string
		jurnal      int
	}{
		"a": {akunA, 40_000, orderA, 1}, "b": {akunB, 0, orderB, 2}, "c": {akunC, 0, orderC, 2},
		"d": {akunD, 47_000, orderD, 1}, "e": {akunE, 8_000, orderE, 1}, "f": {akunF, 0, orderF, 1}, "g": {akunG, 0, orderG, 0},
	} {
		if s := saldo(t, db, c.akun); s != c.saldo {
			t.Errorf("%s: saldo %d, harus %d", nama, s, c.saldo)
		}
		// Jurnal yang keterangannya memuat nomor order: kredit awal, dan jurnal pembalik buatan job (b dan c).
		if n := jurnalUntukOrder(t, db, c.order); n != c.jurnal {
			t.Errorf("%s: %d jurnal berisi nomor order, harus %d", nama, n, c.jurnal)
		}
	}
	// Jurnal pembalik: cermin jurnal asal, merujuk jurnal top-up, tanpa mengubah posting lama.
	var membalik int64
	var jenis string
	db.QueryRow(`SELECT j2.membalik_jurnal_id, j2.jenis FROM insiden_rekon i JOIN jurnal j2 ON j2.id = i.jurnal_id WHERE i.id = $1`, insB).Scan(&membalik, &jenis)
	var jurnalB int64
	db.QueryRow(`SELECT jurnal_id FROM topup_bank WHERE id = $1`, tidB).Scan(&jurnalB)
	if jenis != "pembalik" || membalik != jurnalB {
		t.Errorf("jurnal koreksi b: %s membalik %d, harus pembalik atas %d", jenis, membalik, jurnalB)
	}
	// Dijalankan lagi: dua insiden terbuka tetap terbuka, tidak ada jurnal baru.
	sebelum, _ := jumlahPosting(t, db)
	if h2, _ := svc.KoreksiRekon(ctx); h2 != (HasilKoreksi{Diperiksa: 3, Ditahan: 3}) {
		t.Errorf("job kedua %+v", h2)
	}
	if n, _ := jumlahPosting(t, db); n != sebelum {
		t.Errorf("posting bertambah di job kedua")
	}
}

// Gateway mati atau lambat: insiden tidak_di_gateway tetap terbuka, tidak dibalik karena jawaban tidak ada.
func TestKoreksiRekonGatewayTidakMenjawabTidakMembalik(t *testing.T) {
	svc0, db := siapkan(t)
	g := gatewayTes(t)
	svc := svcT4(t, svc0, g)
	akun := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
	tid, order := topupSiap(t, db, akun, 22_000)
	if h, err := kabarSah(svc, time.Now(), idEvent(t, "mt"), order, "settlement", 22_000); err != nil || h.Hasil != "diproses" {
		t.Fatalf("%+v %v", h, err)
	}
	ins := insidenBaru(t, db, order, tid, "tidak_di_gateway", -22_000)
	bersihkanInsiden(t, db, order)
	for _, mode := range []string{"503", "tidur"} {
		g.atur(mode, 2*time.Second)
		h, err := svc.KoreksiRekon(context.Background())
		if err != nil || h != (HasilKoreksi{Diperiksa: 1, Ditahan: 1}) {
			t.Fatalf("mode %s: %+v %v", mode, h, err)
		}
		if st, _ := statusInsiden(t, db, ins); st != "terbuka" {
			t.Errorf("mode %s: insiden %s", mode, st)
		}
		if s := saldo(t, db, akun); s != 22_000 {
			t.Errorf("mode %s: saldo %d", mode, s)
		}
	}
}

// Dua job bersamaan atas insiden yang sama: tepat satu jurnal koreksi per insiden. Insiden dikunci FOR UPDATE.
func TestKoreksiRekonDuaJobBersamaanSatuJurnalPerInsiden(t *testing.T) {
	svc0, db := siapkan(t)
	svc := svcT4(t, svc0, gatewayTes(t))
	const n = 6
	var orders []string
	var akuns []int64
	for i := 0; i < n; i++ {
		akun := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
		tid, order := topupSiap(t, db, akun, int64(10_000+i*1_000))
		insidenBaru(t, db, order, tid, "tidak_di_ledger", int64(10_000+i*1_000))
		orders, akuns = append(orders, order), append(akuns, akun)
	}
	bersihkanInsiden(t, db, orders...)
	hasil := make([]HasilKoreksi, 3)
	var wg sync.WaitGroup
	for i := range hasil {
		wg.Add(1)
		go func() {
			defer wg.Done()
			h, err := svc.KoreksiRekon(context.Background())
			if err != nil {
				t.Error(err)
			}
			hasil[i] = h
		}()
	}
	wg.Wait()
	var total int
	for _, h := range hasil {
		total += h.Dikoreksi
		if h.Galat != 0 {
			t.Errorf("galat %+v", h)
		}
	}
	if total != n {
		t.Errorf("tiga job bersamaan mengoreksi %d insiden, harus %d (%+v)", total, n, hasil)
	}
	for i, o := range orders {
		if c := jurnalUntukOrder(t, db, o); c != 1 {
			t.Errorf("order %d: %d jurnal", i, c)
		}
		if s := saldo(t, db, akuns[i]); s != int64(10_000+i*1_000) {
			t.Errorf("order %d: saldo %d", i, s)
		}
	}
}
