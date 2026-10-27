package service

// Tes Tahap 3 (lab api-t4, keputusan 950-953): catatan, outbox satu transaction dengan jurnal, klaim per baris,
// harga dari database, ubah bersyarat versi, sinkron sekali per kunci, sesi web. Terpisah dari db_test.go supaya
// nomor baris tes lama yang dikutip halaman tidak bergeser. Tes yang butuh PostgreSQL memakai siapkan() di db_test.go.

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"

	"lab/apit4/internal/repo"
)

// kosongkanAntrean: tes lain meninggalkan baris menunggu; tes klaim hanya boleh melihat barisnya sendiri.
func kosongkanAntrean(t *testing.T, db *sql.DB) {
	t.Helper()
	if _, err := db.Exec(`UPDATE outbox SET status = 'dilewati' WHERE status = 'menunggu'`); err != nil {
		t.Fatal(err)
	}
}

func jumlahOutbox(t *testing.T, db *sql.DB, kondisi string, arg ...any) int {
	t.Helper()
	var n int
	if err := db.QueryRow(`SELECT count(*) FROM outbox WHERE `+kondisi, arg...).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

// kotaBaru membuat satu kota dan memasang akun ke kota itu.
func kotaBaru(t *testing.T, db *sql.DB, akun ...int64) int64 {
	t.Helper()
	var id int64
	if err := db.QueryRow(`INSERT INTO kota (nama) VALUES ('Kota tes ' || (SELECT count(*) + 1 FROM kota)) RETURNING id`).Scan(&id); err != nil {
		t.Fatal(err)
	}
	for _, a := range akun {
		if _, err := db.Exec(`UPDATE akun SET kota_id = $1 WHERE id = $2`, id, a); err != nil {
			t.Fatal(err)
		}
	}
	return id
}

func produkBaru(t *testing.T, db *sql.DB, warung int64, harga int64, stok int) int64 {
	t.Helper()
	var id int64
	if err := db.QueryRow(`INSERT INTO produk (akun_id, nama, harga, stok) VALUES ($1, $2, $3, $4) RETURNING id`,
		warung, fmt.Sprintf("Menu tes %d", time.Now().UnixNano()), harga, stok).Scan(&id); err != nil {
		t.Fatal(err)
	}
	return id
}

// --8<-- [start:tes-catatan]
func TestCatatanPanjangDanKarakter(t *testing.T) {
	seratus := strings.Repeat("é", 100) // 100 karakter, 200 byte
	if c, err := periksaCatatan("  " + seratus + "  "); err != nil || c != seratus {
		t.Fatalf("100 karakter harus lolos dan dipangkas spasinya: %q, %v", c, err)
	}
	for nama, c := range map[string]string{"101 karakter": seratus + "x", "baris baru": "a\nb", "tab": "a\tb", "null": "a\x00b"} {
		if _, err := periksaCatatan(c); err == nil {
			t.Errorf("%s harus ditolak", nama)
		}
	}
	html := "<img src=x onerror=alert(1)>"
	if c, err := periksaCatatan(html); err != nil || c != html {
		t.Fatalf("HTML disimpan apa adanya, encoding urusan tampilan (ADR 30): %q, %v", c, err)
	}
}

// --8<-- [end:tes-catatan]

func TestRupiah(t *testing.T) {
	for n, harus := range map[int64]string{0: "0", 999: "999", 1000: "1.000", 25000: "25.000", 250000: "250.000", 1500000: "1.500.000"} {
		if got := rupiah(n); got != harus {
			t.Errorf("rupiah(%d) = %s, harus %s", n, got, harus)
		}
	}
}

// --8<-- [start:tes-outbox-bayar]
// Bayar menulis jurnal, dua posting, dan satu baris outbox untuk penerima di transaction yang sama.
func TestBayarMenulisOutboxSatuTransaction(t *testing.T) {
	svc, db := siapkan(t)
	kosongkanAntrean(t, db)
	a, _ := akunBaru(t, db, "karyawan", 50_000)
	w, _ := akunBaru(t, db, "warung", 0)
	id, _, err := svc.Bayar(context.Background(), a, w, 15_000, "dua porsi")
	if err != nil {
		t.Fatal(err)
	}
	var akun int64
	var kelas int
	var jenis, status, judul string
	if err := db.QueryRow(`SELECT akun_id, kelas, jenis, status, payload->>'judul' FROM outbox WHERE jurnal_id = $1`, id).
		Scan(&akun, &kelas, &jenis, &status, &judul); err != nil {
		t.Fatalf("baris outbox untuk jurnal %d: %v", id, err)
	}
	if akun != w || kelas != repo.KelasUang || jenis != "bayar" || status != "menunggu" || !strings.HasPrefix(judul, "Rp15.000 dari ") {
		t.Fatalf("outbox: akun %d kelas %d %s %s %q", akun, kelas, jenis, status, judul)
	}
}

// Bayar yang ditolak (saldo kurang) tidak meninggalkan jurnal maupun baris outbox.
func TestBayarGagalTidakMenulisOutbox(t *testing.T) {
	svc, db := siapkan(t)
	kosongkanAntrean(t, db)
	a, _ := akunBaru(t, db, "karyawan", 10_000)
	w, _ := akunBaru(t, db, "warung", 0)
	var jurnal int
	db.QueryRow(`SELECT count(*) FROM jurnal`).Scan(&jurnal)
	if _, _, err := svc.Bayar(context.Background(), a, w, 15_000, ""); !errors.Is(err, ErrSaldoKurang) {
		t.Fatalf("ingin ErrSaldoKurang, dapat %v", err)
	}
	var sesudah int
	db.QueryRow(`SELECT count(*) FROM jurnal`).Scan(&sesudah)
	if sesudah != jurnal || jumlahOutbox(t, db, "status = 'menunggu'") != 0 {
		t.Fatalf("jurnal %d -> %d, outbox menunggu %d: penolakan tidak boleh meninggalkan apa pun", jurnal, sesudah,
			jumlahOutbox(t, db, "status = 'menunggu'"))
	}
}

// COMMIT yang ditolak database (jurnal tidak seimbang) membatalkan jurnal dan baris outbox sekaligus.
func TestCommitDitolakMembuangJurnalDanOutbox(t *testing.T) {
	_, db := siapkan(t)
	kosongkanAntrean(t, db)
	a, _ := akunBaru(t, db, "karyawan", 0)
	w, _ := akunBaru(t, db, "warung", 0)
	r := repo.Baru(db)
	err := r.DalamTx(context.Background(), func(tx repo.Tx) error {
		buku, err := tx.KunciBukuAkun(context.Background(), a, w)
		if err != nil {
			return err
		}
		id, err := tx.CatatJurnal(context.Background(), "bayar", "tidak seimbang", a, nil,
			[]repo.Posting{{BukuID: buku[a].ID, Jumlah: -1000}, {BukuID: buku[w].ID, Jumlah: 900}})
		if err != nil {
			return err
		}
		return tx.TulisOutbox(context.Background(), id, w, repo.KelasUang, "bayar", []byte(`{}`))
	})
	if err == nil {
		t.Fatal("COMMIT jurnal tidak seimbang harus ditolak")
	}
	if n := jumlahOutbox(t, db, "akun_id = $1", w); n != 0 {
		t.Fatalf("%d baris outbox tersisa dari transaction yang dibatalkan", n)
	}
}

// --8<-- [end:tes-outbox-bayar]

func TestKirimDanTopupMenulisOutbox(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	kosongkanAntrean(t, db)
	a, _ := akunBaru(t, db, "karyawan", 100_000)
	b, nomorB := akunBaru(t, db, "karyawan", 0)
	admin, _ := akunBaru(t, db, "admin", 0)
	if _, err := svc.Kirim(ctx, a, nomorB, 20_000, "patungan"); err != nil {
		t.Fatal(err)
	}
	if n := jumlahOutbox(t, db, "akun_id = $1 AND jenis = 'transfer' AND kelas = 0", b); n != 1 {
		t.Fatalf("outbox transfer untuk penerima: %d, ingin 1", n)
	}
	csv := fmt.Sprintf("nomor_karyawan,nominal\n%s,250000\n", nomorB)
	if _, _, err := svc.Topup(ctx, admin, "tes", csv); err != nil {
		t.Fatal(err)
	}
	if n := jumlahOutbox(t, db, "akun_id = $1 AND jenis = 'topup' AND kelas = 1", b); n != 1 {
		t.Fatalf("outbox topup: %d, ingin 1", n)
	}
}

// --8<-- [start:tes-klaim]
// Tiga worker mengklaim 60 baris bersamaan: tidak ada baris ganda dan tidak ada yang terlewat (ADR 24).
func TestKlaimTigaWorkerTanpaGandaTanpaTerlewat(t *testing.T) {
	_, db := siapkan(t)
	ctx := context.Background()
	kosongkanAntrean(t, db)
	a, _ := akunBaru(t, db, "karyawan", 0)
	if _, err := db.Exec(`INSERT INTO outbox (akun_id, kelas, jenis, payload)
		SELECT $1, 2, 'promo', '{}' FROM generate_series(1, 60)`, a); err != nil {
		t.Fatal(err)
	}
	r := repo.Baru(db)
	var mu sync.Mutex
	lihat := map[int64]int{}
	var wg sync.WaitGroup
	for w := 0; w < 3; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for ronde := 0; ronde < 40; ronde++ { // 60 baris dibagi 5 per klaim: 12 ronde cukup; batas supaya tes tidak menggantung
				baris, err := r.KlaimOutbox(ctx, 5, time.Minute, true)
				if err != nil {
					t.Error(err)
					return
				}
				if len(baris) == 0 {
					return
				}
				mu.Lock()
				for _, b := range baris {
					lihat[b.ID]++
				}
				mu.Unlock()
			}
		}()
	}
	wg.Wait()
	if len(lihat) != 60 {
		t.Fatalf("%d baris terklaim, ingin 60", len(lihat))
	}
	for id, n := range lihat {
		if n != 1 {
			t.Errorf("baris %d diklaim %d kali", id, n)
		}
	}
}

// Klaim yang habis membuat baris dipegang worker lain lagi (pengiriman ulang, M20); klaim yang masih berlaku tidak.
func TestKlaimHabisDiklaimLagi(t *testing.T) {
	_, db := siapkan(t)
	ctx := context.Background()
	kosongkanAntrean(t, db)
	a, _ := akunBaru(t, db, "karyawan", 0)
	if _, err := db.Exec(`INSERT INTO outbox (akun_id, kelas, jenis, payload) VALUES ($1, 2, 'promo', '{}')`, a); err != nil {
		t.Fatal(err)
	}
	r := repo.Baru(db)
	pertama, err := r.KlaimOutbox(ctx, 5, time.Minute, true)
	if err != nil || len(pertama) != 1 || pertama[0].Percobaan != 1 {
		t.Fatalf("klaim pertama: %v, %v", pertama, err)
	}
	if lagi, _ := r.KlaimOutbox(ctx, 5, time.Minute, true); len(lagi) != 0 {
		t.Fatalf("baris yang masih dipegang tidak boleh diklaim lagi: %v", lagi)
	}
	if _, err := db.Exec(`UPDATE outbox SET klaim_sampai = now() - interval '1 second' WHERE id = $1`, pertama[0].ID); err != nil {
		t.Fatal(err)
	}
	kedua, err := r.KlaimOutbox(ctx, 5, time.Minute, true)
	if err != nil || len(kedua) != 1 || kedua[0].ID != pertama[0].ID || kedua[0].Percobaan != 2 ||
		kedua[0].NotifikasiID != pertama[0].NotifikasiID {
		t.Fatalf("klaim habis: %v, %v", kedua, err)
	}
}

// Kelas mendahului nomor: bayar (0) sebelum top-up (1) sebelum promo (2), walau nomornya lebih besar.
// Dengan batas 1 baris, yang dipilih bayar; tanpa kelas (mode rentan urut-waktu) yang dipilih yang tertua, yaitu promo.
func TestKelasMendahuluiNomor(t *testing.T) {
	_, db := siapkan(t)
	ctx := context.Background()
	r := repo.Baru(db)
	a, _ := akunBaru(t, db, "karyawan", 0)
	isiAntrean := func() {
		kosongkanAntrean(t, db)
		isiSaldo(t, db, a, 1000)
		var j1, j2 int64
		db.QueryRow(`SELECT max(id) FROM jurnal`).Scan(&j2)
		isiSaldo(t, db, a, 1000)
		db.QueryRow(`SELECT max(id) FROM jurnal`).Scan(&j1)
		// Nomor naik: promo (2) paling tua, lalu top-up (1), lalu bayar (0).
		if _, err := db.Exec(`INSERT INTO outbox (akun_id, kelas, jenis, payload) VALUES ($1, 2, 'promo', '{}')`, a); err != nil {
			t.Fatal(err)
		}
		if _, err := db.Exec(`INSERT INTO outbox (jurnal_id, akun_id, kelas, jenis, payload) VALUES ($1, $2, 1, 'topup', '{}')`, j2, a); err != nil {
			t.Fatal(err)
		}
		if _, err := db.Exec(`INSERT INTO outbox (jurnal_id, akun_id, kelas, jenis, payload) VALUES ($1, $2, 0, 'bayar', '{}')`, j1, a); err != nil {
			t.Fatal(err)
		}
	}
	isiAntrean()
	satu, err := r.KlaimOutbox(ctx, 1, time.Minute, true)
	if err != nil || len(satu) != 1 || satu[0].Kelas != 0 || satu[0].Jenis != "bayar" {
		t.Fatalf("batas 1 dengan kelas harus memilih bayar: %v, %v", satu, err)
	}
	isiAntrean()
	tertua, err := r.KlaimOutbox(ctx, 1, time.Minute, false)
	if err != nil || len(tertua) != 1 || tertua[0].Kelas != 2 || tertua[0].Jenis != "promo" {
		t.Fatalf("batas 1 tanpa kelas harus memilih yang tertua (promo): %v, %v", tertua, err)
	}
}

// --8<-- [end:tes-klaim]

// --8<-- [start:tes-harga]
// Harga yang ditagih dibaca dari database sesudah lock: promo 10% yang berlaku membuat Rp25.000 jadi Rp22.500,
// stok berkurang, versi naik, dan outbox ditulis.
func TestPesanHargaDariDatabase(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	kosongkanAntrean(t, db)
	a, _ := akunBaru(t, db, "karyawan", 100_000)
	w, _ := akunBaru(t, db, "warung", 0)
	kotaBaru(t, db, a, w)
	p := produkBaru(t, db, w, 25_000, 5)
	h, err := svc.Pesan(ctx, a, p, 1, "")
	if err != nil || h.Nominal != 25_000 || h.PotonganPersen != 0 {
		t.Fatalf("tanpa promo: %+v, %v", h, err)
	}
	var kota, hr int64
	db.QueryRow(`SELECT kota_id FROM akun WHERE id = $1`, w).Scan(&kota)
	hr, _ = akunBaru(t, db, "hr", 0)
	db.Exec(`INSERT INTO promo (kota_id, dibuat_oleh, judul, potongan_persen, mulai, selesai)
		VALUES ($1, $2, 'Promo tes', 10, now() - interval '1 hour', now() + interval '1 hour')`, kota, hr)
	h, err = svc.Pesan(ctx, a, p, 2, "")
	if err != nil || h.HargaSatuan != 22_500 || h.Nominal != 45_000 || h.StokSisa != 2 || h.PotonganPersen != 10 {
		t.Fatalf("dengan promo 10%%: %+v, %v", h, err)
	}
	if s := saldo(t, db, a); s != 100_000-25_000-45_000 {
		t.Fatalf("saldo %d", s)
	}
	var versi int
	db.QueryRow(`SELECT versi FROM produk WHERE id = $1`, p).Scan(&versi)
	if versi != 3 {
		t.Fatalf("versi produk %d, ingin 3 (dua pesanan)", versi)
	}
	if _, err := svc.Pesan(ctx, a, p, 3, ""); !errors.Is(err, ErrStokHabis) {
		t.Fatalf("stok 2 diminta 3: ingin ErrStokHabis, dapat %v", err)
	}
}

// --8<-- [end:tes-harga]

// --8<-- [start:tes-versi]
func TestUbahProdukBersyaratVersi(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	w, _ := akunBaru(t, db, "warung", 0)
	lain, _ := akunBaru(t, db, "warung", 0)
	p := produkBaru(t, db, w, 20_000, 10)
	harga := int64(21_000)
	h, err := svc.UbahProduk(ctx, w, p, &harga, nil, 1)
	if err != nil || h.Versi != 2 || h.Harga != 21_000 || h.Stok != 10 {
		t.Fatalf("ubah dengan versi 1: %+v, %v", h, err)
	}
	stok := 0
	_, err = svc.UbahProduk(ctx, w, p, nil, &stok, 1) // masih memegang versi 1
	var beda ErrVersiBerbeda
	if !errors.As(err, &beda) || beda.Sekarang.Versi != 2 || beda.Sekarang.Stok != 10 {
		t.Fatalf("versi basi: ingin ErrVersiBerbeda dengan keadaan terkini, dapat %v", err)
	}
	if _, err := svc.UbahProduk(ctx, lain, p, nil, &stok, 2); !errors.Is(err, ErrTidakDitemukan) {
		t.Fatalf("warung lain: ingin ErrTidakDitemukan, dapat %v", err)
	}
	var sekarang int
	db.QueryRow(`SELECT stok FROM produk WHERE id = $1`, p).Scan(&sekarang)
	if sekarang != 10 {
		t.Fatalf("stok %d: penolakan tidak boleh mengubah baris", sekarang)
	}
}

// --8<-- [end:tes-versi]

// --8<-- [start:tes-sinkron]
func TestSinkronSekaliPerKunci(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	w, _ := akunBaru(t, db, "warung", 0)
	var hp int64
	if err := db.QueryRow(`INSERT INTO perangkat (akun_id, platform, token_push) VALUES ($1, 'android', $2) RETURNING id`,
		w, fmt.Sprintf("tes-%d-%d", w, time.Now().UnixNano())).Scan(&hp); err != nil {
		t.Fatal(err)
	}
	p := produkBaru(t, db, w, 20_000, 10)
	op := repo.OperasiSinkron{Kunci: fmt.Sprintf("tes-%d-a", p), Perangkat: hp, Produk: p, Jenis: "stok", Nilai: 0, VersiDasar: 1,
		DibuatHP: time.Now().Add(-62 * time.Hour)}
	status, s, ulang, err := svc.Sinkron(ctx, w, op)
	if err != nil || status != "diterapkan" || ulang || s.Stok != 0 || s.Versi != 2 {
		t.Fatalf("pertama: %s %+v ulang=%v, %v", status, s, ulang, err)
	}
	status, s, ulang, err = svc.Sinkron(ctx, w, op) // jawaban hilang, HP mengirim ulang dengan kunci yang sama
	if err != nil || status != "diterapkan" || !ulang || s.Versi != 2 {
		t.Fatalf("kirim ulang: %s %+v ulang=%v, %v (tidak boleh diterapkan dua kali)", status, s, ulang, err)
	}
	basi := op
	basi.Kunci, basi.Nilai = fmt.Sprintf("tes-%d-b", p), 30 // HP lain masih melihat versi 1
	status, s, _, err = svc.Sinkron(ctx, w, basi)
	if err != nil || status != "konflik" || s.Stok != 0 || s.Versi != 2 {
		t.Fatalf("versi basi: %s %+v, %v", status, s, err)
	}
	pembayaran := op
	pembayaran.Kunci, pembayaran.Jenis = fmt.Sprintf("tes-%d-c", p), "bayar"
	var v ErrValidasi
	if _, _, _, err := svc.Sinkron(ctx, w, pembayaran); !errors.As(err, &v) || v.Field != "jenis" {
		t.Fatalf("pembayaran lewat sinkron: ingin ErrValidasi jenis, dapat %v", err)
	}
	beda := op
	beda.Nilai = 7 // kunci yang sama, isi lain: bukan pengiriman ulang
	if _, _, _, err := svc.Sinkron(ctx, w, beda); !errors.As(err, &v) || v.Field != "kunci" {
		t.Fatalf("kunci sama isi beda: ingin ErrValidasi kunci, dapat %v", err)
	}
	depan := op
	depan.Kunci, depan.DibuatHP = fmt.Sprintf("tes-%d-e", p), time.Now().Add(48*time.Hour)
	if _, _, _, err := svc.Sinkron(ctx, w, depan); !errors.As(err, &v) || v.Field != "dibuat_di_hp" {
		t.Fatalf("jam HP 2 hari di depan: ingin ErrValidasi dibuat_di_hp, dapat %v", err)
	}
	lama := op
	lama.Kunci, lama.DibuatHP = fmt.Sprintf("tes-%d-d", p), time.Now().Add(-8*24*time.Hour)
	if _, _, _, err := svc.Sinkron(ctx, w, lama); !errors.As(err, &v) || v.Field != "dibuat_di_hp" {
		t.Fatalf("operasi 8 hari: ingin ErrValidasi dibuat_di_hp, dapat %v", err)
	}
}

// --8<-- [end:tes-sinkron]

func TestPromoHanyaHrDanPengumuman(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	kosongkanAntrean(t, db)
	hr, _ := akunBaru(t, db, "hr", 0)
	k1, _ := akunBaru(t, db, "karyawan", 0)
	k2, _ := akunBaru(t, db, "karyawan", 0)
	w, _ := akunBaru(t, db, "warung", 0)
	kota := kotaBaru(t, db, hr, k1, k2, w)
	mulai, selesai := time.Now().Add(time.Hour), time.Now().Add(2*time.Hour)
	if _, _, err := svc.BuatPromo(ctx, w, "Promo", 10, mulai, selesai, true); !errors.Is(err, ErrDilarang) {
		t.Fatalf("warung membuat promo: ingin ErrDilarang, dapat %v", err)
	}
	id, n, err := svc.BuatPromo(ctx, hr, "Promo makan siang", 10, mulai, selesai, true)
	if err != nil || id == 0 || n != 2 {
		t.Fatalf("hr: promo %d, diumumkan %d, %v (ingin 2 karyawan di kota itu)", id, n, err)
	}
	if got := jumlahOutbox(t, db, "kelas = 2 AND jenis = 'promo' AND jurnal_id IS NULL AND akun_id IN ($1, $2)", k1, k2); got != 2 {
		t.Fatalf("outbox promo: %d, ingin 2", got)
	}
	var v ErrValidasi
	if _, _, err := svc.BuatPromo(ctx, hr, "Promo", 10, selesai, mulai, false); !errors.As(err, &v) || v.Field != "selesai" {
		t.Fatalf("selesai sebelum mulai: ingin ErrValidasi selesai, dapat %v", err)
	}
	_ = kota
}

// --8<-- [start:tes-web]
func TestSesiWebDanCsrf(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	w, email := akunLogin(t, db, "password-uji-lima-belas", false)
	if _, err := db.Exec(`UPDATE akun SET jenis = 'warung' WHERE id = $1`, w); err != nil {
		t.Fatal(err)
	}
	token, csrf, _, err := svc.LoginWeb(ctx, email, "password-uji-lima-belas")
	if err != nil {
		t.Fatal(err)
	}
	sesi, err := svc.Periksa(ctx, token)
	if err != nil || sesi.Jenis != "web" || sesi.AkunID != w {
		t.Fatalf("sesi web: %+v, %v", sesi, err)
	}
	if !CsrfSah(sesi, csrf) || CsrfSah(sesi, "salah") || CsrfSah(sesi, "") || CsrfSah(sesi, token) {
		t.Fatal("hanya token CSRF dari login yang sah; token sesi bukan token CSRF")
	}
	var hash string
	db.QueryRow(`SELECT token_hash FROM sesi WHERE akun_id = $1 AND jenis = 'web'`, w).Scan(&hash)
	if hash == token {
		t.Fatal("database hanya menyimpan hash token sesi")
	}
	k, emailK := akunLogin(t, db, "password-uji-lima-belas", false)
	_ = k
	if _, _, _, err := svc.LoginWeb(ctx, emailK, "password-uji-lima-belas"); !errors.Is(err, ErrDilarang) {
		t.Fatalf("karyawan login web: ingin ErrDilarang, dapat %v", err)
	}
}

// --8<-- [end:tes-web]

// Klaim tidak menunggu baris yang sedang dikunci transaction lain: FOR UPDATE SKIP LOCKED melewatinya (ADR 24,
// R3-03). Tanpa SKIP LOCKED tidak ada baris ganda (klaim_sampai menahannya), tetapi klaim ikut menunggu kunci itu:
// tes gagal dengan batas waktu. Mutasi yang dicoba peninjau PR 340: FOR UPDATE tanpa SKIP LOCKED lolos tes lain.
func TestKlaimMelewatBarisYangDikunci(t *testing.T) {
	_, db := siapkan(t)
	kosongkanAntrean(t, db)
	a, _ := akunBaru(t, db, "karyawan", 0)
	var id [2]int64
	for i := range id {
		if err := db.QueryRow(`INSERT INTO outbox (akun_id, kelas, jenis, payload) VALUES ($1, 2, 'promo', '{}') RETURNING id`, a).
			Scan(&id[i]); err != nil {
			t.Fatal(err)
		}
	}
	tahan, err := db.BeginTx(context.Background(), nil) // transaction lain mengunci baris pertama
	if err != nil {
		t.Fatal(err)
	}
	defer tahan.Rollback()
	var dikunci int64
	if err := tahan.QueryRow(`SELECT id FROM outbox WHERE id = $1 FOR UPDATE`, id[0]).Scan(&dikunci); err != nil {
		t.Fatal(err)
	}
	r := repo.Baru(db)
	ctx, batal := context.WithTimeout(context.Background(), 3*time.Second)
	defer batal()
	baris, err := r.KlaimOutbox(ctx, 5, time.Minute, true)
	if err != nil || len(baris) != 1 || baris[0].ID != id[1] {
		t.Fatalf("baris pertama dikunci: ingin hanya baris %d tanpa menunggu, dapat %v, %v", id[1], baris, err)
	}
	if err := tahan.Rollback(); err != nil {
		t.Fatal(err)
	}
	baris, err = r.KlaimOutbox(context.Background(), 5, time.Minute, true)
	if err != nil || len(baris) != 1 || baris[0].ID != id[0] {
		t.Fatalf("kunci dilepas: ingin baris %d, dapat %v, %v", id[0], baris, err)
	}
}

// ADR 23: pemberitahuan ditulis di transaction yang sama dengan uangnya. Bila penulisan outbox gagal, jurnal, posting,
// saldo, dan stok ikut batal di keempat jalur uang. Tes lain hanya membuktikan baris outbox ADA sesudah berhasil;
// mutasi peninjau PR 340 (outbox ditulis di transaction terpisah sesudah COMMIT) lolos semuanya. Pemicu penolak
// hanya berlaku untuk akun milik tes ini, jadi tes lain di schema yang sama tidak terganggu.
func TestOutboxGagalMembatalkanUang(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	kosongkanAntrean(t, db)
	a, _ := akunBaru(t, db, "karyawan", 100_000)
	b, nomorB := akunBaru(t, db, "karyawan", 0)
	w, _ := akunBaru(t, db, "warung", 0)
	admin, _ := akunBaru(t, db, "admin", 0)
	kotaBaru(t, db, a, w)
	p := produkBaru(t, db, w, 25_000, 5)
	for _, q := range []string{
		`CREATE OR REPLACE FUNCTION tolak_outbox_tes() RETURNS trigger LANGUAGE plpgsql AS
		   $$ BEGIN RAISE EXCEPTION 'outbox ditolak untuk tes'; END $$`,
		fmt.Sprintf(`CREATE TRIGGER tolak_outbox_tes BEFORE INSERT ON outbox FOR EACH ROW
		   WHEN (NEW.akun_id IN (%d, %d)) EXECUTE FUNCTION tolak_outbox_tes()`, b, w),
	} {
		if _, err := db.Exec(q); err != nil {
			t.Fatal(err)
		}
	}
	t.Cleanup(func() {
		db.Exec(`DROP TRIGGER IF EXISTS tolak_outbox_tes ON outbox`)
		db.Exec(`DROP FUNCTION IF EXISTS tolak_outbox_tes()`)
	})
	hitung := func(q string) (n int) {
		t.Helper()
		if err := db.QueryRow(q).Scan(&n); err != nil {
			t.Fatal(err)
		}
		return n
	}
	jurnal := hitung(`SELECT count(*) FROM jurnal`)
	kasus := []struct {
		nama  string
		jalan func() error
	}{
		{"Bayar", func() error { _, _, err := svc.Bayar(ctx, a, w, 15_000, ""); return err }},
		{"Kirim", func() error { _, err := svc.Kirim(ctx, a, nomorB, 20_000, ""); return err }},
		{"Topup", func() error {
			_, _, err := svc.Topup(ctx, admin, "tes", "nomor_karyawan,nominal\n"+nomorB+",250000\n")
			return err
		}},
		{"Pesan", func() error { _, err := svc.Pesan(ctx, a, p, 1, ""); return err }},
	}
	for _, k := range kasus {
		if err := k.jalan(); err == nil || !strings.Contains(err.Error(), "outbox ditolak untuk tes") {
			t.Fatalf("%s: ingin gagal karena outbox ditolak, dapat %v", k.nama, err)
		}
		if n := hitung(`SELECT count(*) FROM jurnal`); n != jurnal {
			t.Fatalf("%s: jurnal %d menjadi %d; uang tercatat tanpa pemberitahuannya", k.nama, jurnal, n)
		}
		if s := saldo(t, db, a); s != 100_000 {
			t.Fatalf("%s: saldo pengirim %d, ingin 100000", k.nama, s)
		}
		if s := saldo(t, db, b) + saldo(t, db, w); s != 0 {
			t.Fatalf("%s: saldo penerima %d, ingin 0", k.nama, s)
		}
	}
	var stok, versi int
	db.QueryRow(`SELECT stok, versi FROM produk WHERE id = $1`, p).Scan(&stok, &versi)
	if stok != 5 || versi != 1 {
		t.Fatalf("stok %d versi %d: Pesan yang batal tidak boleh mengurangi stok", stok, versi)
	}
}

var _ = bcrypt.MinCost
