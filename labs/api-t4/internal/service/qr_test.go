package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"lab/apit4/internal/repo"
)

// Tes QR (ADR 40, M35) dengan PostgreSQL sungguhan, memakai siapkan, saldo, dan isiSaldo dari db_test.go.
// Jalankan dengan schema tes sendiri bila ada pekerjaan paralel: LAB_TES_SCHEMA (lihat db_test.go).

// qrAkun membuat akun pemakai atau merchant beserta bukunya. Saldo diisi lewat jurnal topup, seperti akunBaru.
func qrAkun(t *testing.T, db *sql.DB, jenis, tingkat, status string, saldo int64) int64 {
	t.Helper()
	var id int64
	if err := db.QueryRow(`SELECT greatest(coalesce(max(id), 0), 100000) + 1 FROM akun`).Scan(&id); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO akun (id, jenis, nama, email, password_hash, tingkat, status)
		VALUES ($1, $2, $3, $4, '!', $5, $6)`, id, jenis, fmt.Sprintf("%s %d", jenis, id),
		fmt.Sprintf("%s%d@publik.example", jenis, id), tingkat, status); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO buku (akun_id, jenis) VALUES ($1, $2)`, id, jenis); err != nil {
		t.Fatal(err)
	}
	if saldo > 0 {
		isiSaldo(t, db, id, saldo)
	}
	return id
}

func qrNom(n int64) *int64 { return &n }

// qrStatus: status dan jurnal_id satu QR di database.
func qrStatus(t *testing.T, db *sql.DB, id string) (string, *int64) {
	t.Helper()
	var s string
	var j *int64
	if err := db.QueryRow(`SELECT status, jurnal_id FROM qr WHERE id = $1`, id).Scan(&s, &j); err != nil {
		t.Fatal(err)
	}
	return s, j
}

// qrJurnalSeimbang: jurnal itu berjenis bayar, punya dua posting, dan jumlahnya nol.
func qrJurnalSeimbang(t *testing.T, db *sql.DB, jurnal int64) {
	t.Helper()
	var jenis string
	var n int
	var total int64
	if err := db.QueryRow(`SELECT j.jenis, count(p.id), coalesce(sum(p.jumlah), 0)
		FROM jurnal j JOIN posting p ON p.jurnal_id = j.id WHERE j.id = $1 GROUP BY j.jenis`, jurnal).Scan(&jenis, &n, &total); err != nil {
		t.Fatal(err)
	}
	if jenis != "bayar" || n != 2 || total != 0 {
		t.Fatalf("jurnal %d: jenis %s, %d posting, jumlah %d; harus bayar, 2, 0", jurnal, jenis, n, total)
	}
}

func TestBayarQRDinamisSekaliPakai(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	merchant := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	pembeli := qrAkun(t, db, "pemakai", "belum", "aktif", 100_000) // belum terverifikasi boleh membayar QR
	q, err := svc.BuatQR(ctx, merchant, "dinamis", qrNom(35_000))
	if err != nil || q.BerlakuSampai == nil || q.Nominal == nil || *q.Nominal != 35_000 {
		t.Fatalf("buat QR dinamis: %v %+v", err, q)
	}
	h, err := svc.BayarQR(ctx, pembeli, q.ID, nil)
	if err != nil || h.Nominal != 35_000 || h.Saldo != 65_000 {
		t.Fatalf("bayar QR: %v %+v", err, h)
	}
	qrJurnalSeimbang(t, db, h.ID)
	if s := saldo(t, db, pembeli); s != 65_000 {
		t.Fatalf("saldo pembeli %d, ingin 65000", s)
	}
	if s := saldo(t, db, merchant); s != 35_000 {
		t.Fatalf("saldo merchant %d, ingin 35000", s)
	}
	if st, j := qrStatus(t, db, q.ID); st != "terpakai" || j == nil || *j != h.ID {
		t.Fatalf("QR sesudah dibayar: %s %v; harus terpakai dan terikat ke jurnal %d", st, j, h.ID)
	}
	if n := jumlahOutbox(t, db, "akun_id = $1", merchant); n != 1 {
		t.Fatalf("outbox merchant %d baris, ingin 1 (pemberitahuan di transaction yang sama)", n)
	}
	// Kedua kalinya: QR dinamis hanya sekali bayar, saldo tidak berubah.
	if _, err := svc.BayarQR(ctx, pembeli, q.ID, nil); !errors.Is(err, ErrQRTerpakai) {
		t.Fatalf("bayar kedua kali: ingin ErrQRTerpakai, dapat %v", err)
	}
	if s := saldo(t, db, pembeli); s != 65_000 {
		t.Fatalf("saldo pembeli sesudah ditolak %d, ingin 65000", s)
	}
	if n := jumlahOutbox(t, db, "akun_id = $1", merchant); n != 1 {
		t.Fatalf("outbox merchant %d baris sesudah ditolak, ingin 1", n)
	}
}

func TestBayarQRStatisBerkaliDenganBatas(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	merchant := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	pembeli := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 600_000)
	q, err := svc.BuatQR(ctx, merchant, "statis", nil)
	if err != nil || q.Nominal != nil || q.BerlakuSampai != nil {
		t.Fatalf("buat QR statis: %v %+v", err, q)
	}
	for i := 0; i < 2; i++ {
		h, err := svc.BayarQR(ctx, pembeli, q.ID, qrNom(50_000))
		if err != nil {
			t.Fatalf("bayar QR statis ke-%d: %v", i+1, err)
		}
		qrJurnalSeimbang(t, db, h.ID)
	}
	if st, j := qrStatus(t, db, q.ID); st != "aktif" || j != nil {
		t.Fatalf("QR statis sesudah dibayar: %s %v; harus tetap aktif tanpa jurnal", st, j)
	}
	// Batas Rp200.000 per pembayaran (Asumsi produk): tepat di batas lolos, satu rupiah di atasnya ditolak.
	if _, err := svc.BayarQR(ctx, pembeli, q.ID, qrNom(MaksQRStatis)); err != nil {
		t.Fatalf("bayar tepat Rp200.000: %v", err)
	}
	var ev ErrValidasi
	for _, n := range []*int64{qrNom(MaksQRStatis + 1), qrNom(0), qrNom(-5), nil} {
		_, err := svc.BayarQR(ctx, pembeli, q.ID, n)
		if !errors.As(err, &ev) || ev.Field != "nominal" {
			t.Fatalf("nominal %v: ingin ErrValidasi nominal, dapat %v", n, err)
		}
	}
	if s := saldo(t, db, pembeli); s != 600_000-50_000-50_000-200_000 {
		t.Fatalf("saldo pembeli %d", s)
	}
	if s := saldo(t, db, merchant); s != 300_000 {
		t.Fatalf("saldo merchant %d, ingin 300000", s)
	}
}

func TestBayarQRNominalTerikat(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	merchant := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	pembeli := qrAkun(t, db, "pemakai", "belum", "aktif", 100_000)
	q, _ := svc.BuatQR(ctx, merchant, "dinamis", qrNom(35_000))
	var ev ErrValidasi
	if _, err := svc.BayarQR(ctx, pembeli, q.ID, qrNom(34_000)); !errors.As(err, &ev) || ev.Field != "nominal" {
		t.Fatalf("nominal beda dari QR: ingin ErrValidasi nominal, dapat %v", err)
	}
	if st, _ := qrStatus(t, db, q.ID); st != "aktif" {
		t.Fatalf("QR sesudah nominal ditolak: %s, harus tetap aktif", st)
	}
	if h, err := svc.BayarQR(ctx, pembeli, q.ID, qrNom(35_000)); err != nil || h.Nominal != 35_000 {
		t.Fatalf("nominal sama dengan QR: %v %+v", err, h)
	}
}

func TestBuatQRAturan(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	t0 := time.Date(2026, 10, 27, 9, 0, 0, 0, time.UTC)
	svc = svc.DenganJam(func() time.Time { return t0 })
	merchant := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	var ev ErrValidasi
	for _, c := range []struct {
		jenis   string
		nominal *int64
		field   string
	}{{"statis", qrNom(1000), "nominal"}, {"dinamis", nil, "nominal"}, {"dinamis", qrNom(0), "nominal"},
		{"dinamis", qrNom(MaksQRDinamis + 1), "nominal"}, {"lain", nil, "jenis"}, {"", nil, "jenis"}} {
		if _, err := svc.BuatQR(ctx, merchant, c.jenis, c.nominal); !errors.As(err, &ev) || ev.Field != c.field {
			t.Fatalf("%s %v: ingin ErrValidasi %s, dapat %v", c.jenis, c.nominal, c.field, err)
		}
	}
	q, err := svc.BuatQR(ctx, merchant, "dinamis", qrNom(MaksQRDinamis))
	if err != nil {
		t.Fatal(err)
	}
	var berlaku time.Time
	if err := db.QueryRow(`SELECT berlaku_sampai FROM qr WHERE id = $1`, q.ID).Scan(&berlaku); err != nil {
		t.Fatal(err)
	}
	if !berlaku.Equal(t0.Add(5 * time.Minute)) {
		t.Fatalf("berlaku_sampai %v, ingin %v (kini + 5 menit)", berlaku, t0.Add(5*time.Minute))
	}
	// Batas laju per akun: 10 QR, yang ke-11 ditolak (jam dibekukan, tidak ada isi ulang). Setiap percobaan
	// mengambil satu token, juga yang gagal validasi, jadi tes ini memakai merchant baru.
	lain := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	for i := 1; i <= 10; i++ {
		if _, err := svc.BuatQR(ctx, lain, "statis", nil); err != nil {
			t.Fatalf("QR ke-%d: %v", i, err)
		}
	}
	var lambat ErrTerlaluSering
	if _, err := svc.BuatQR(ctx, lain, "statis", nil); !errors.As(err, &lambat) || lambat.Lapis != "akun" {
		t.Fatalf("QR ke-11: ingin ErrTerlaluSering akun, dapat %v", err)
	}
}

func TestBayarQRKedaluwarsa(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	kini := time.Date(2026, 10, 27, 9, 0, 0, 0, time.UTC)
	svc = svc.DenganJam(func() time.Time { return kini })
	merchant := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	pembeli := qrAkun(t, db, "pemakai", "belum", "aktif", 100_000)
	q, _ := svc.BuatQR(ctx, merchant, "dinamis", qrNom(35_000))
	// Satu detik sebelum batas: masih sah, dan layar konfirmasi menampilkannya.
	kini = kini.Add(5*time.Minute - time.Second)
	if _, err := svc.LihatQR(ctx, q.ID); err != nil {
		t.Fatalf("QR sebelum batas: %v", err)
	}
	q2, _ := svc.BuatQR(ctx, merchant, "dinamis", qrNom(35_000)) // dibuat pada kini baru; berlaku 5 menit lagi
	// Tepat di batas QR pertama: sudah kedaluwarsa (kini tidak lebih awal dari berlaku_sampai).
	kini = kini.Add(time.Second)
	if _, err := svc.LihatQR(ctx, q.ID); !errors.Is(err, ErrTidakDitemukan) {
		t.Fatalf("konfirmasi QR kedaluwarsa: ingin ErrTidakDitemukan, dapat %v", err)
	}
	if _, err := svc.BayarQR(ctx, pembeli, q.ID, nil); !errors.Is(err, ErrQRKedaluwarsa) {
		t.Fatalf("bayar QR kedaluwarsa: ingin ErrQRKedaluwarsa, dapat %v", err)
	}
	if st, j := qrStatus(t, db, q.ID); st != "kedaluwarsa" || j != nil {
		t.Fatalf("QR kedaluwarsa: %s %v; penandaan harus di-COMMIT walau pembayaran ditolak", st, j)
	}
	if _, err := svc.BayarQR(ctx, pembeli, q.ID, nil); !errors.Is(err, ErrQRKedaluwarsa) {
		t.Fatalf("bayar kedua kali QR kedaluwarsa: ingin ErrQRKedaluwarsa, dapat %v", err)
	}
	if s := saldo(t, db, pembeli); s != 100_000 {
		t.Fatalf("saldo pembeli %d, ingin 100000 (tidak ada uang yang bergerak)", s)
	}
	if _, err := svc.BayarQR(ctx, pembeli, q2.ID, nil); err != nil {
		t.Fatalf("QR yang masih berlaku: %v", err)
	}
}

func TestBayarQRSaldoKurangDanAkunDibekukan(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	merchant := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	miskin := qrAkun(t, db, "pemakai", "belum", "aktif", 20_000)
	beku := qrAkun(t, db, "pemakai", "terverifikasi", "dibekukan", 100_000)
	q, _ := svc.BuatQR(ctx, merchant, "dinamis", qrNom(35_000))
	if _, err := svc.BayarQR(ctx, miskin, q.ID, nil); !errors.Is(err, ErrSaldoKurang) {
		t.Fatalf("saldo kurang: ingin ErrSaldoKurang, dapat %v", err)
	}
	if st, _ := qrStatus(t, db, q.ID); st != "aktif" {
		t.Fatalf("QR sesudah saldo kurang: %s, harus tetap aktif (pembayaran gagal tidak menghabiskan QR)", st)
	}
	if _, err := svc.BayarQR(ctx, beku, q.ID, nil); !errors.Is(err, ErrDibekukan) {
		t.Fatalf("pembayar dibekukan: ingin ErrDibekukan, dapat %v", err)
	}
	if s := saldo(t, db, beku); s != 100_000 {
		t.Fatalf("saldo akun dibekukan %d, ingin 100000", s)
	}
	// Jenis pembayar: merchant dan warung tidak membayar QR (merchant tidak membayar QR-nya sendiri).
	warung, _ := akunBaru(t, db, "warung", 100_000)
	for _, a := range []int64{merchant, warung} {
		if _, err := svc.BayarQR(ctx, a, q.ID, nil); !errors.Is(err, ErrDilarang) {
			t.Fatalf("akun %d membayar QR: ingin ErrDilarang, dapat %v", a, err)
		}
	}
}

func TestQRMerchantBelumSahTidakBisaMenerimaQR(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	belum := qrAkun(t, db, "merchant", "belum", "aktif", 0)
	beku := qrAkun(t, db, "merchant", "terverifikasi", "dibekukan", 0)
	pemakai := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
	pembeli := qrAkun(t, db, "pemakai", "belum", "aktif", 100_000)
	if _, err := svc.BuatQR(ctx, belum, "statis", nil); !errors.Is(err, ErrButuhVerifikasi) {
		t.Fatalf("merchant belum terverifikasi: ingin ErrButuhVerifikasi, dapat %v", err)
	}
	if _, err := svc.BuatQR(ctx, beku, "statis", nil); !errors.Is(err, ErrDibekukan) {
		t.Fatalf("merchant dibekukan: ingin ErrDibekukan, dapat %v", err)
	}
	if _, err := svc.BuatQR(ctx, pemakai, "statis", nil); !errors.Is(err, ErrDilarang) {
		t.Fatalf("pemakai membuat QR: ingin ErrDilarang, dapat %v", err)
	}
	// QR yang sudah ada tetapi merchant-nya tidak sah (belum diverifikasi, atau dibekukan sesudah QR terbit):
	// satu jawaban 404 di konfirmasi dan di pembayaran, tanpa uang bergerak.
	for _, m := range []int64{belum, beku} {
		var id string
		if err := db.QueryRow(`INSERT INTO qr (akun_id, jenis) VALUES ($1, 'statis') RETURNING id`, m).Scan(&id); err != nil {
			t.Fatal(err)
		}
		if _, err := svc.LihatQR(ctx, id); !errors.Is(err, ErrTidakDitemukan) {
			t.Fatalf("konfirmasi QR merchant %d: ingin ErrTidakDitemukan, dapat %v", m, err)
		}
		if _, err := svc.BayarQR(ctx, pembeli, id, qrNom(10_000)); !errors.Is(err, ErrTidakDitemukan) {
			t.Fatalf("bayar QR merchant %d: ingin ErrTidakDitemukan, dapat %v", m, err)
		}
	}
	if s := saldo(t, db, pembeli); s != 100_000 {
		t.Fatalf("saldo pembeli %d, ingin 100000", s)
	}
	// Id yang bukan uuid dan id yang tidak ada: 404 yang sama.
	for _, id := range []string{"bukan-uuid", "", "00000000-0000-4000-8000-000000000000"} {
		if _, err := svc.LihatQR(ctx, id); !errors.Is(err, ErrTidakDitemukan) {
			t.Fatalf("konfirmasi %q: ingin ErrTidakDitemukan, dapat %v", id, err)
		}
		if _, err := svc.BayarQR(ctx, pembeli, id, qrNom(1000)); !errors.Is(err, ErrTidakDitemukan) {
			t.Fatalf("bayar %q: ingin ErrTidakDitemukan, dapat %v", id, err)
		}
	}
}

// Inti M35: server tidak punya cara mencegah stiker QR statis milik merchant lain ditempel di atas stiker yang
// sah. Pembayarannya valid: jurnal seimbang ke merchant pemilik QR itu. Yang bisa dilakukan server hanya
// menampilkan nama merchant dari tabel akun di layar konfirmasi, supaya pembeli bisa membandingkannya dengan toko.
func TestBayarQRMilikMerchantLain(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	sah := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	pelaku := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	pembeli := qrAkun(t, db, "pemakai", "belum", "aktif", 100_000)
	stikerPelaku, err := svc.BuatQR(ctx, pelaku, "statis", nil)
	if err != nil {
		t.Fatal(err)
	}
	k, err := svc.LihatQR(ctx, stikerPelaku.ID)
	if err != nil || k.Merchant.Nama != fmt.Sprintf("merchant %d", pelaku) || !k.Terverifikasi {
		t.Fatalf("konfirmasi: %v %+v; nama harus nama merchant pelaku dari tabel akun", err, k)
	}
	h, err := svc.BayarQR(ctx, pembeli, stikerPelaku.ID, qrNom(35_000))
	if err != nil {
		t.Fatalf("pembayaran ke QR yang ditempel: %v (server tidak punya dasar untuk menolaknya)", err)
	}
	qrJurnalSeimbang(t, db, h.ID)
	if saldo(t, db, pelaku) != 35_000 || saldo(t, db, sah) != 0 {
		t.Fatalf("saldo pelaku %d dan merchant sah %d; uang harus masuk ke pemilik QR", saldo(t, db, pelaku), saldo(t, db, sah))
	}
}

func TestLaporkanQRMembekukanMerchantDanMenulisAudit(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	merchant := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	pelapor := qrAkun(t, db, "pemakai", "belum", "aktif", 100_000)
	iseng := qrAkun(t, db, "pemakai", "belum", "aktif", 0) // pelapor yang ditolak mengambil tokennya sendiri
	q, _ := svc.BuatQR(ctx, merchant, "statis", nil)
	var sebelum int
	if err := db.QueryRow(`SELECT count(*) FROM audit_log`).Scan(&sebelum); err != nil {
		t.Fatal(err)
	}
	var ev ErrValidasi
	if err := svc.LaporkanQR(ctx, iseng, q.ID, "palsu"); !errors.As(err, &ev) || ev.Field != "alasan" {
		t.Fatalf("alasan pendek: ingin ErrValidasi alasan, dapat %v", err)
	}
	if err := svc.LaporkanQR(ctx, iseng, q.ID, strings.Repeat("x", 201)); !errors.As(err, &ev) {
		t.Fatalf("alasan 201 karakter: ingin ErrValidasi, dapat %v", err)
	}
	if err := svc.LaporkanQR(ctx, iseng, "00000000-0000-4000-8000-000000000000", strings.Repeat("x", 30)); !errors.Is(err, ErrTidakDitemukan) {
		t.Fatalf("QR tidak ada: ingin ErrTidakDitemukan, dapat %v", err)
	}
	if err := svc.LaporkanQR(ctx, pelapor, q.ID, "stiker ini ditempel di atas stiker toko yang asli"); err != nil {
		t.Fatalf("laporkan: %v", err)
	}
	var status string
	if err := db.QueryRow(`SELECT status FROM akun WHERE id = $1`, merchant).Scan(&status); err != nil || status != "dibekukan" {
		t.Fatalf("status merchant %q (%v), ingin dibekukan", status, err)
	}
	var sesudah int
	var peran, aksi, objek string
	if err := db.QueryRow(`SELECT count(*) FROM audit_log`).Scan(&sesudah); err != nil || sesudah != sebelum+1 {
		t.Fatalf("baris audit %d sesudah laporan, ingin %d (alasan yang ditolak tidak menulis apa pun)", sesudah, sebelum+1)
	}
	if err := db.QueryRow(`SELECT peran, aksi, objek FROM audit_log ORDER BY id DESC LIMIT 1`).Scan(&peran, &aksi, &objek); err != nil {
		t.Fatal(err)
	}
	if peran != "pemakai" || aksi != "laporan_qr" || objek != "qr:"+q.ID {
		t.Fatalf("baris audit: %s %s %s", peran, aksi, objek)
	}
	if v, err := svc.repo.VerifikasiAudit(ctx); err != nil || v.RusakDiID != 0 || v.Baris < 1 {
		t.Fatalf("rantai audit: %v %+v; harus utuh", err, v)
	}
	// Sesudah dibekukan: QR itu tidak tampil dan tidak bisa dibayar.
	if _, err := svc.LihatQR(ctx, q.ID); !errors.Is(err, ErrTidakDitemukan) {
		t.Fatalf("konfirmasi sesudah dibekukan: ingin ErrTidakDitemukan, dapat %v", err)
	}
	if _, err := svc.BayarQR(ctx, pelapor, q.ID, qrNom(10_000)); !errors.Is(err, ErrTidakDitemukan) {
		t.Fatalf("bayar sesudah dibekukan: ingin ErrTidakDitemukan, dapat %v", err)
	}
	// Laporan kedua tetap dicatat (satu baris per laporan), tanpa error.
	if err := svc.LaporkanQR(ctx, pelapor, q.ID, "laporan kedua untuk QR yang sama ini"); err != nil {
		t.Fatalf("laporan kedua: %v", err)
	}
	if err := db.QueryRow(`SELECT count(*) FROM audit_log`).Scan(&sesudah); err != nil || sesudah != sebelum+2 {
		t.Fatalf("baris audit %d, ingin %d", sesudah, sebelum+2)
	}
}

// Dua pembayaran bersamaan ke QR dinamis yang sama: tepat satu berhasil, yang lain ErrQRTerpakai, dan hanya
// satu jurnal yang terikat ke QR. Diulang pada QR baru supaya jadwal thread yang menguntungkan tidak menutupi celah.
func TestBayarQRDinamisSerentak(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	merchant := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	a := qrAkun(t, db, "pemakai", "belum", "aktif", 1_000_000)
	b := qrAkun(t, db, "pemakai", "belum", "aktif", 1_000_000)
	const putaran = 20
	for i := 0; i < putaran; i++ {
		q, err := svc.BuatQR(ctx, merchant, "dinamis", qrNom(1_000))
		if err != nil {
			// Batas laju per akun (10 QR): pakai pembatas baru untuk putaran berikutnya.
			svc, _ = siapkan(t)
			if q, err = svc.BuatQR(ctx, merchant, "dinamis", qrNom(1_000)); err != nil {
				t.Fatal(err)
			}
		}
		hasil := make([]error, 2)
		var wg sync.WaitGroup
		mulai := make(chan struct{})
		for k, pembeli := range []int64{a, b} {
			wg.Add(1)
			go func() {
				defer wg.Done()
				<-mulai
				_, hasil[k] = svc.BayarQR(ctx, pembeli, q.ID, nil)
			}()
		}
		close(mulai)
		wg.Wait()
		ok, terpakai := 0, 0
		for _, e := range hasil {
			switch {
			case e == nil:
				ok++
			case errors.Is(e, ErrQRTerpakai):
				terpakai++
			default:
				t.Fatalf("putaran %d: error tak terduga %v", i, e)
			}
		}
		if ok != 1 || terpakai != 1 {
			t.Fatalf("putaran %d: %d berhasil dan %d ErrQRTerpakai; harus 1 dan 1", i, ok, terpakai)
		}
		var n int
		if err := db.QueryRow(`SELECT count(*) FROM jurnal WHERE jenis = 'bayar' AND keterangan LIKE 'Bayar QR % ke merchant ' || $1`, fmt.Sprint(merchant)).Scan(&n); err != nil {
			t.Fatal(err)
		}
		if n != i+1 {
			t.Fatalf("putaran %d: %d jurnal bayar ke merchant, ingin %d (satu per QR)", i, n, i+1)
		}
	}
	if s := saldo(t, db, merchant); s != putaran*1_000 {
		t.Fatalf("saldo merchant %d, ingin %d", s, putaran*1_000)
	}
}

// Sepuluh pembeli membayar satu QR statis bersamaan: semua berhasil, tanpa deadlock, dan saldo merchant jumlahnya.
// Urutan lock sama di semua jalur (baris QR, lalu buku menurut id), jadi antrean di baris QR tidak menjadi deadlock.
func TestBayarQRStatisSerentak(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	merchant := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	q, _ := svc.BuatQR(ctx, merchant, "statis", nil)
	const n = 10
	hasil := make([]error, n)
	var wg sync.WaitGroup
	mulai := make(chan struct{})
	for i := 0; i < n; i++ {
		pembeli := qrAkun(t, db, "pemakai", "belum", "aktif", 100_000)
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-mulai
			_, hasil[i] = svc.BayarQR(ctx, pembeli, q.ID, qrNom(10_000))
		}()
	}
	close(mulai)
	wg.Wait()
	for i, e := range hasil {
		if e != nil {
			t.Fatalf("pembeli %d: %v", i, e)
		}
	}
	if s := saldo(t, db, merchant); s != n*10_000 {
		t.Fatalf("saldo merchant %d, ingin %d", s, n*10_000)
	}
}

// Pembayaran yang menunggu lock QR membaca status yang ditulis transaction lain sesudah COMMIT. Tes menahan baris
// QR di transaction sendiri, mengubah status menjadi dibatalkan, lalu membiarkan pembayaran mulai: pembayaran harus
// BERHENTI di SELECT ... FOR UPDATE (terlihat di pg_stat_activity), bukan melaju membaca status lama.
func TestBayarQRMenungguLockQRLaluMelihatStatusBaru(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	merchant := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	pembeli := qrAkun(t, db, "pemakai", "belum", "aktif", 100_000)
	q, _ := svc.BuatQR(ctx, merchant, "dinamis", qrNom(35_000))
	tahan, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer tahan.Rollback()
	if _, err := tahan.Exec(`SELECT id FROM qr WHERE id = $1 FOR UPDATE`, q.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := tahan.Exec(`UPDATE qr SET status = 'dibatalkan' WHERE id = $1`, q.ID); err != nil {
		t.Fatal(err)
	}
	selesai := make(chan error, 1)
	go func() { _, err := svc.BayarQR(ctx, pembeli, q.ID, nil); selesai <- err }()
	// Tunggu sampai ada backend yang menunggu lock dengan pernyataan SELECT (bukan UPDATE): itulah KunciQR.
	deadline := time.Now().Add(5 * time.Second)
	menunggu := false
	for time.Now().Before(deadline) && !menunggu {
		var n int
		if err := db.QueryRow(`SELECT count(*) FROM pg_stat_activity
			WHERE datname = current_database() AND pid <> pg_backend_pid() AND wait_event_type = 'Lock'
			  AND ltrim(query, E' \n\t') ILIKE 'select%'`).Scan(&n); err != nil {
			t.Fatal(err)
		}
		menunggu = n >= 1
		if !menunggu {
			time.Sleep(20 * time.Millisecond)
		}
	}
	if !menunggu {
		t.Fatal("pembayaran tidak menunggu lock baris QR: pernyataan SELECT yang diblok lock tidak terlihat")
	}
	select {
	case err := <-selesai:
		t.Fatalf("pembayaran selesai (%v) sebelum transaction yang memegang QR COMMIT", err)
	default:
	}
	if err := tahan.Commit(); err != nil {
		t.Fatal(err)
	}
	select {
	case err := <-selesai:
		if !errors.Is(err, ErrTidakDitemukan) {
			t.Fatalf("sesudah QR dibatalkan: ingin ErrTidakDitemukan, dapat %v", err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("pembayaran tidak lanjut sesudah lock dilepas")
	}
	if s := saldo(t, db, pembeli); s != 100_000 {
		t.Fatalf("saldo pembeli %d, ingin 100000", s)
	}
}

// Akun Lestari (karyawan) membayar QR seperti pemakai; jenis ini dipakai tes lain lewat akunBaru, jadi dipastikan
// di sini bahwa pembayaran QR tidak memperlakukannya berbeda.
func TestBayarQRKaryawanLestari(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	merchant := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	budi, _ := akunBaru(t, db, "karyawan", 100_000)
	q, _ := svc.BuatQR(ctx, merchant, "dinamis", qrNom(22_000))
	h, err := svc.BayarQR(ctx, budi, q.ID, nil)
	if err != nil {
		t.Fatal(err)
	}
	qrJurnalSeimbang(t, db, h.ID)
	if s := saldo(t, db, budi); s != 78_000 {
		t.Fatalf("saldo karyawan %d, ingin 78000", s)
	}
}

// Pengaman kedua pembayaran QR dinamis: UPDATE ... WHERE status = 'aktif' hanya berhasil sekali, juga tanpa lock
// baris QR. Diuji langsung di repo karena KunciQR sudah menutup balapan lebih dulu, jadi tes pembayaran saja tidak
// membuktikan pengaman ini.
func TestTandaiQRTerpakaiHanyaSekali(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	merchant := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	pembeli := qrAkun(t, db, "pemakai", "belum", "aktif", 10_000)
	isiSaldo(t, db, pembeli, 10_000) // dua jurnal topup yang bisa dipakai sebagai pengikat
	var j1, j2 int64
	if err := db.QueryRow(`SELECT (array_agg(id ORDER BY id DESC))[1], (array_agg(id ORDER BY id DESC))[2] FROM jurnal`).Scan(&j1, &j2); err != nil {
		t.Fatal(err)
	}
	q, err := svc.BuatQR(ctx, merchant, "dinamis", qrNom(5_000))
	if err != nil {
		t.Fatal(err)
	}
	var pertama, kedua bool
	if err := svc.repo.DalamTx(ctx, func(tx repo.Tx) error { var e error; pertama, e = tx.TandaiQRTerpakai(ctx, q.ID, j1); return e }); err != nil {
		t.Fatal(err)
	}
	if err := svc.repo.DalamTx(ctx, func(tx repo.Tx) error { var e error; kedua, e = tx.TandaiQRTerpakai(ctx, q.ID, j2); return e }); err != nil {
		t.Fatal(err)
	}
	if !pertama || kedua {
		t.Fatalf("menandai terpakai: pertama %v, kedua %v; harus true lalu false", pertama, kedua)
	}
	if st, j := qrStatus(t, db, q.ID); st != "terpakai" || j == nil || *j != j1 {
		t.Fatalf("QR: %s %v; harus terpakai dan tetap terikat ke jurnal pertama %d", st, j, j1)
	}
}
