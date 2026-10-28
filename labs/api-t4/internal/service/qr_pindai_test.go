//go:build t4qr

package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	"lab/apit4/internal/qrpayload"
)

// Tes lab t4-qr (ADR 40, M35) dengan PostgreSQL sungguhan. Hanya dikompilasi dengan -tags t4qr, supaya rekaman testing
// lab api-t4 tidak berubah (pola t4modul). Memakai siapkan, qrAkun, qrNom, qrStatus, qrJurnalSeimbang,
// dan saldo dari db_test.go dan qr_test.go. Semua batas ditulis sebagai angka di tes (Rp200.000, Rp5.000.000, 5 menit,
// 20 dan 200 karakter), bukan lewat konstanta paket: mengubah konstanta di kode harus menggagalkan tes. Setiap batas
// diperankan di kedua sisinya; jam diperankan lewat DenganJam, tidak ditunggu. Baris "LAB|" ikut direkam run.py.

func butirValidasi(t *testing.T, err error, field string) {
	t.Helper()
	var ev ErrValidasi
	if !errors.As(err, &ev) || ev.Field != field {
		t.Fatalf("ingin ErrValidasi untuk %q, dapat %v", field, err)
	}
}

func TestQRBatasStatisDuaRatusRibuDiKeduaSisi(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	merchant := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	pembeli := qrAkun(t, db, "pemakai", "belum", "aktif", 1_000_000)
	q, err := svc.BuatQR(ctx, merchant, "statis", nil)
	if err != nil {
		t.Fatal(err)
	}
	var diterima int64
	for _, n := range []int64{1, 199_999, 200_000} {
		h, err := svc.BayarQR(ctx, pembeli, q.ID, qrNom(n))
		if err != nil {
			t.Fatalf("Rp%d pada QR statis harus lolos: %v", n, err)
		}
		qrJurnalSeimbang(t, db, h.ID)
		diterima += n
	}
	for _, n := range []*int64{qrNom(200_001), qrNom(200_000_000), qrNom(0), qrNom(-1), nil} {
		_, err := svc.BayarQR(ctx, pembeli, q.ID, n)
		butirValidasi(t, err, "nominal")
	}
	if got := saldo(t, db, merchant); got != diterima {
		t.Fatalf("saldo merchant %d, ingin %d: pembayaran yang ditolak tidak memindahkan uang", got, diterima)
	}
	if got := saldo(t, db, pembeli); got != 1_000_000-diterima {
		t.Fatalf("saldo pembeli %d, ingin %d", got, 1_000_000-diterima)
	}
	if st, j := qrStatus(t, db, q.ID); st != "aktif" || j != nil {
		t.Fatalf("QR statis sesudah tiga pembayaran: %s %v; harus tetap aktif tanpa jurnal terikat", st, j)
	}
	fmt.Println("LAB|QR statis: Rp1, Rp199.999, dan Rp200.000 diterima; Rp200.001, Rp0, Rp-1, dan nominal kosong ditolak (ErrValidasi nominal); tidak ada uang yang bergerak pada yang ditolak")
}

func TestQRBatasDinamisNominalTerikatPadaIdQR(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	merchant := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	pembeli := qrAkun(t, db, "pemakai", "belum", "aktif", 6_000_000)
	// Batas atas nominal QR dinamis (Asumsi lab): Rp5.000.000 lolos, Rp5.000.001 tidak.
	if _, err := svc.BuatQR(ctx, merchant, "dinamis", qrNom(5_000_000)); err != nil {
		t.Fatalf("QR dinamis Rp5.000.000: %v", err)
	}
	for _, n := range []*int64{qrNom(5_000_001), qrNom(0), qrNom(-1), nil} {
		_, err := svc.BuatQR(ctx, merchant, "dinamis", n)
		butirValidasi(t, err, "nominal")
	}
	_, err := svc.BuatQR(ctx, merchant, "statis", qrNom(1_000))
	butirValidasi(t, err, "nominal")

	// Nominal terikat pada id QR: body yang berbeda satu rupiah ke atas atau ke bawah ditolak, QR tetap aktif.
	q, err := svc.BuatQR(ctx, merchant, "dinamis", qrNom(35_000))
	if err != nil {
		t.Fatal(err)
	}
	for _, n := range []int64{34_999, 35_001, 0, -35_000, 1} {
		_, err := svc.BayarQR(ctx, pembeli, q.ID, qrNom(n))
		butirValidasi(t, err, "nominal")
	}
	if st, _ := qrStatus(t, db, q.ID); st != "aktif" {
		t.Fatalf("status QR sesudah nominal yang salah: %s, ingin aktif", st)
	}
	if got := saldo(t, db, pembeli); got != 6_000_000 {
		t.Fatalf("saldo pembeli %d, ingin 6000000: nominal yang salah tidak memotong apa pun", got)
	}
	// Body kosong dan body yang sama dengan nominal QR memotong nominal QR, bukan nominal lain.
	h, err := svc.BayarQR(ctx, pembeli, q.ID, nil)
	if err != nil || h.Nominal != 35_000 || h.Saldo != 6_000_000-35_000 {
		t.Fatalf("bayar tanpa body: %+v %v", h, err)
	}
	q2, _ := svc.BuatQR(ctx, merchant, "dinamis", qrNom(35_000))
	if h, err := svc.BayarQR(ctx, pembeli, q2.ID, qrNom(35_000)); err != nil || h.Nominal != 35_000 {
		t.Fatalf("bayar dengan nominal yang sama: %+v %v", h, err)
	}
	fmt.Println("LAB|QR dinamis: Rp5.000.000 lolos dan Rp5.000.001 ditolak; nominal terikat pada id QR: Rp34.999 dan Rp35.001 untuk QR Rp35.000 ditolak (ErrValidasi nominal), body kosong membayar Rp35.000")
}

func TestQRBatasKedaluwarsaLimaMenitDiKeduaSisi(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	// Awal yang tidak jatuh di batas menit atau detik, supaya pembulatan masa berlaku (ke menit, ke detik) menggeser batas dan tertangkap.
	t0 := time.Date(2026, 10, 27, 9, 0, 17, 250_000_000, time.UTC)
	kini := t0
	svc = svc.DenganJam(func() time.Time { return kini })
	merchant := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	pembeli := qrAkun(t, db, "pemakai", "belum", "aktif", 500_000)
	buat := func() string {
		q, err := svc.BuatQR(ctx, merchant, "dinamis", qrNom(35_000))
		if err != nil {
			t.Fatal(err)
		}
		var berlaku time.Time
		if err := db.QueryRow(`SELECT berlaku_sampai FROM qr WHERE id = $1`, q.ID).Scan(&berlaku); err != nil {
			t.Fatal(err)
		}
		if want := kini.Add(5 * time.Minute); !berlaku.Equal(want) {
			t.Fatalf("berlaku_sampai %v, ingin %v (tepat lima menit sejak dibuat)", berlaku, want)
		}
		return q.ID
	}
	sebelum, tepat, sesudah := buat(), buat(), buat()
	// Satu detik sebelum batas: terlihat di layar konfirmasi dan bisa dibayar.
	kini = t0.Add(4*time.Minute + 59*time.Second)
	if _, err := svc.LihatQR(ctx, sebelum); err != nil {
		t.Fatalf("konfirmasi pada 4 menit 59 detik: %v", err)
	}
	if _, err := svc.BayarQR(ctx, pembeli, sebelum, nil); err != nil {
		t.Fatalf("bayar pada 4 menit 59 detik: %v", err)
	}
	// Tepat di batas: sudah kedaluwarsa. Satu detik sesudahnya: tetap kedaluwarsa.
	kini = t0.Add(5 * time.Minute)
	if _, err := svc.LihatQR(ctx, tepat); !errors.Is(err, ErrTidakDitemukan) {
		t.Fatalf("konfirmasi tepat 5 menit: ingin ErrTidakDitemukan, dapat %v", err)
	}
	if _, err := svc.BayarQR(ctx, pembeli, tepat, nil); !errors.Is(err, ErrQRKedaluwarsa) {
		t.Fatalf("bayar tepat 5 menit: ingin ErrQRKedaluwarsa, dapat %v", err)
	}
	kini = t0.Add(5*time.Minute + time.Second)
	if _, err := svc.BayarQR(ctx, pembeli, sesudah, nil); !errors.Is(err, ErrQRKedaluwarsa) {
		t.Fatalf("bayar 5 menit 1 detik: ingin ErrQRKedaluwarsa, dapat %v", err)
	}
	for _, id := range []string{tepat, sesudah} {
		if st, j := qrStatus(t, db, id); st != "kedaluwarsa" || j != nil {
			t.Fatalf("status %s %v, ingin kedaluwarsa tanpa jurnal", st, j)
		}
	}
	if got := saldo(t, db, pembeli); got != 500_000-35_000 {
		t.Fatalf("saldo pembeli %d, ingin %d: hanya yang 4 menit 59 detik yang dibayar", got, 500_000-35_000)
	}
	fmt.Println("LAB|QR dinamis berlaku_sampai = dibuat + 5 menit; 4 menit 59 detik: terlihat dan terbayar; tepat 5 menit dan 5 menit 1 detik: kedaluwarsa (ErrQRKedaluwarsa), uang tidak bergerak")
}

func TestQRBatasSekaliPakaiHanyaSatuJurnalPerIdQR(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	merchant := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	budi := qrAkun(t, db, "pemakai", "belum", "aktif", 100_000)
	citra := qrAkun(t, db, "pemakai", "belum", "aktif", 100_000)
	q, _ := svc.BuatQR(ctx, merchant, "dinamis", qrNom(35_000))
	if _, err := svc.LihatQR(ctx, q.ID); err != nil {
		t.Fatalf("konfirmasi sebelum dibayar: %v", err)
	}
	h, err := svc.BayarQR(ctx, budi, q.ID, nil)
	if err != nil {
		t.Fatal(err)
	}
	// Pembayar yang sama dan pembayar lain: ErrQRTerpakai (409), bukan kedaluwarsa dan bukan tidak ditemukan.
	for _, p := range []int64{budi, citra} {
		if _, err := svc.BayarQR(ctx, p, q.ID, nil); !errors.Is(err, ErrQRTerpakai) {
			t.Fatalf("pembayaran kedua oleh %d: ingin ErrQRTerpakai, dapat %v", p, err)
		}
	}
	// Konfirmasi sesudah dibayar: satu jawaban untuk semua sebab tidak bisa dibayar (404).
	if _, err := svc.LihatQR(ctx, q.ID); !errors.Is(err, ErrTidakDitemukan) {
		t.Fatalf("konfirmasi sesudah dibayar: ingin ErrTidakDitemukan, dapat %v", err)
	}
	if st, j := qrStatus(t, db, q.ID); st != "terpakai" || j == nil || *j != h.ID {
		t.Fatalf("QR sesudah dibayar: %s %v, ingin terpakai dengan jurnal %d", st, j, h.ID)
	}
	if saldo(t, db, merchant) != 35_000 || saldo(t, db, budi) != 65_000 || saldo(t, db, citra) != 100_000 {
		t.Fatalf("saldo merchant %d, Budi %d, Citra %d", saldo(t, db, merchant), saldo(t, db, budi), saldo(t, db, citra))
	}
	// Satu baris pemberitahuan ke merchant, tidak ke pembayar, untuk satu-satunya jurnal itu.
	var keMerchant, keBudi int
	if err := db.QueryRow(`SELECT count(*) FILTER (WHERE akun_id = $2), count(*) FILTER (WHERE akun_id = $3)
		FROM outbox WHERE jurnal_id = $1`, h.ID, merchant, budi).Scan(&keMerchant, &keBudi); err != nil {
		t.Fatal(err)
	}
	if keMerchant != 1 || keBudi != 0 {
		t.Fatalf("pemberitahuan: ke merchant %d, ke pembayar %d; ingin 1 dan 0", keMerchant, keBudi)
	}
	fmt.Println("LAB|QR dinamis dibayar sekali: pembayaran kedua (pembayar yang sama dan pembayar lain) ErrQRTerpakai, satu jurnal terikat ke id QR, satu pemberitahuan untuk merchant")
}

func TestQRBatasLaporanMembekukanMerchantSebelumDiperiksa(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	merchant := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	pembeli := qrAkun(t, db, "pemakai", "belum", "aktif", 100_000)
	statis, _ := svc.BuatQR(ctx, merchant, "statis", nil)
	dinamis, _ := svc.BuatQR(ctx, merchant, "dinamis", qrNom(35_000))
	if _, err := svc.BayarQR(ctx, pembeli, statis.ID, qrNom(20_000)); err != nil {
		t.Fatal(err)
	}
	// Panjang alasan: 19 karakter ditolak, 20 dan 200 diterima, 201 ditolak. Setiap laporan dari akun sendiri
	// (batas laju laporan per akun: 3 per jam).
	pelapor := func() int64 { return qrAkun(t, db, "pemakai", "belum", "aktif", 0) }
	butirValidasi(t, svc.LaporkanQR(ctx, pelapor(), "00000000-0000-4000-8000-0000000000ff", strings.Repeat("x", 19)), "alasan")
	butirValidasi(t, svc.LaporkanQR(ctx, pelapor(), statis.ID, strings.Repeat("x", 19)), "alasan")
	butirValidasi(t, svc.LaporkanQR(ctx, pelapor(), statis.ID, strings.Repeat("x", 201)), "alasan")
	var status string
	if err := db.QueryRow(`SELECT status FROM akun WHERE id = $1`, merchant).Scan(&status); err != nil || status != "aktif" {
		t.Fatalf("laporan yang ditolak tidak boleh membekukan: status %q (%v)", status, err)
	}
	if err := svc.LaporkanQR(ctx, pelapor(), "00000000-0000-4000-8000-0000000000ff", strings.Repeat("x", 20)); !errors.Is(err, ErrTidakDitemukan) {
		t.Fatalf("QR yang tidak ada: ingin ErrTidakDitemukan, dapat %v", err)
	}
	// Satu laporan dari satu akun yang belum terverifikasi cukup: tidak ada pemeriksaan sebelum pembekuan.
	if err := svc.LaporkanQR(ctx, pelapor(), statis.ID, strings.Repeat("x", 20)); err != nil {
		t.Fatalf("laporan 20 karakter: %v", err)
	}
	if err := db.QueryRow(`SELECT status FROM akun WHERE id = $1`, merchant).Scan(&status); err != nil || status != "dibekukan" {
		t.Fatalf("status merchant %q (%v), ingin dibekukan", status, err)
	}
	if err := svc.LaporkanQR(ctx, pelapor(), dinamis.ID, strings.Repeat("x", 200)); err != nil {
		t.Fatalf("laporan 200 karakter: %v", err)
	}
	// Dampak pada merchant yang sah: semua QR-nya hilang bagi pembeli, dan ia tidak bisa menerbitkan yang baru.
	if _, err := svc.LihatQR(ctx, statis.ID); !errors.Is(err, ErrTidakDitemukan) {
		t.Fatalf("konfirmasi QR statis merchant beku: %v", err)
	}
	if _, err := svc.BayarQR(ctx, pembeli, dinamis.ID, nil); !errors.Is(err, ErrTidakDitemukan) {
		t.Fatalf("bayar QR dinamis merchant beku: %v", err)
	}
	if _, err := svc.BayarQR(ctx, pembeli, statis.ID, qrNom(10_000)); !errors.Is(err, ErrTidakDitemukan) {
		t.Fatalf("bayar QR statis merchant beku: %v", err)
	}
	if _, err := svc.BuatQR(ctx, merchant, "statis", nil); !errors.Is(err, ErrDibekukan) {
		t.Fatalf("merchant beku menerbitkan QR: ingin ErrDibekukan, dapat %v", err)
	}
	// Uang yang sudah diterima tidak ditarik: pembekuan hanya mengubah status akun, bukan posting.
	if got := saldo(t, db, merchant); got != 20_000 {
		t.Fatalf("saldo merchant beku %d, ingin 20000", got)
	}
	if st, _ := qrStatus(t, db, statis.ID); st != "aktif" {
		t.Fatalf("baris QR statis %s: laporan membekukan akun merchant, bukan baris QR", st)
	}
	fmt.Println("LAB|laporan QR palsu dari akun belum terverifikasi: 19 dan 201 karakter ditolak, 20 dan 200 diterima; satu laporan membekukan merchant lebih dulu; QR-nya tidak ditemukan (ErrTidakDitemukan) bagi pembeli; saldo merchant tidak ditarik")
}

func TestQRPindaiPayloadStatisMilikMerchantLainMenjadiJurnalSah(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	marni := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	pelaku := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	budi := qrAkun(t, db, "pemakai", "belum", "aktif", 100_000)
	stikerMarni, _ := svc.BuatQR(ctx, marni, "statis", nil)
	stikerPelaku, _ := svc.BuatQR(ctx, pelaku, "statis", nil)
	namaMarni, namaPelaku := fmt.Sprintf("merchant %d", marni), fmt.Sprintf("merchant %d", pelaku)
	payloadMarni, err := qrpayload.Bangun(qrpayload.Isi{Jenis: qrpayload.Statis, ID: stikerMarni.ID, Nama: namaMarni, Kota: "Bandung"})
	if err != nil {
		t.Fatal(err)
	}
	// Stiker pelaku sendiri, dan payload Marni yang idnya diganti dengan CRC dihitung ulang: keduanya lolos Urai.
	payloadPelaku, _ := qrpayload.Bangun(qrpayload.Isi{Jenis: qrpayload.Statis, ID: stikerPelaku.ID, Nama: namaPelaku, Kota: "Bandung"})
	payloadPalsu, err := qrpayload.Ganti(payloadMarni, func(i *qrpayload.Isi) { i.ID = stikerPelaku.ID })
	if err != nil {
		t.Fatal(err)
	}
	for _, p := range []string{payloadMarni, payloadPelaku, payloadPalsu} {
		if _, err := qrpayload.Urai(p); err != nil {
			t.Fatalf("payload ditolak pemindai: %v", err)
		}
	}
	isi, _ := qrpayload.Urai(payloadPalsu)
	if isi.Nama != namaMarni {
		t.Fatalf("payload palsu membawa nama %q, ingin nama Marni %q", isi.Nama, namaMarni)
	}
	// Server hanya menerima id dari payload. Layar konfirmasi memakai nama dari tabel akun, bukan dari payload.
	k, err := svc.LihatQR(ctx, isi.ID)
	if err != nil {
		t.Fatal(err)
	}
	if k.Merchant.Nama != namaPelaku || k.Merchant.Nama == isi.Nama {
		t.Fatalf("nama di konfirmasi %q; harus nama pelaku %q dari tabel akun, bukan nama di payload %q", k.Merchant.Nama, namaPelaku, isi.Nama)
	}
	h, err := svc.BayarQR(ctx, budi, isi.ID, qrNom(35_000))
	if err != nil {
		t.Fatalf("pembayaran ke QR palsu: %v (server tidak punya dasar untuk menolaknya)", err)
	}
	qrJurnalSeimbang(t, db, h.ID)
	if saldo(t, db, pelaku) != 35_000 || saldo(t, db, marni) != 0 || saldo(t, db, budi) != 65_000 {
		t.Fatalf("saldo pelaku %d, Marni %d, Budi %d", saldo(t, db, pelaku), saldo(t, db, marni), saldo(t, db, budi))
	}
	var keMarni, kePelaku int
	if err := db.QueryRow(`SELECT count(*) FILTER (WHERE akun_id = $2), count(*) FILTER (WHERE akun_id = $3)
		FROM outbox WHERE jurnal_id = $1`, h.ID, marni, pelaku).Scan(&keMarni, &kePelaku); err != nil {
		t.Fatal(err)
	}
	if keMarni != 0 || kePelaku != 1 {
		t.Fatalf("pemberitahuan ke Marni %d dan pelaku %d, ingin 0 dan 1", keMarni, kePelaku)
	}
	fmt.Println("LAB|payload Marni dengan id QR pelaku dan CRC dihitung ulang lolos pemindai; konfirmasi menampilkan nama pelaku dari tabel akun; jurnal sah ke pelaku, tidak ke Marni")
}

func TestQRPindaiPayloadDinamisDenganNominalDipalsukan(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	merchant := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	pembeli := qrAkun(t, db, "pemakai", "belum", "aktif", 100_000)
	q, err := svc.BuatQR(ctx, merchant, "dinamis", qrNom(35_000))
	if err != nil {
		t.Fatal(err)
	}
	payload, err := qrpayload.Bangun(qrpayload.Isi{Jenis: qrpayload.Dinamis, ID: q.ID, Nominal: qrNom(35_000), Nama: "Toko Lab", Kota: "Bandung"})
	if err != nil {
		t.Fatal(err)
	}
	palsu, err := qrpayload.Ganti(payload, func(i *qrpayload.Isi) { i.Nominal = qrNom(1) })
	if err != nil {
		t.Fatal(err)
	}
	isi, err := qrpayload.Urai(palsu)
	if err != nil || isi.Nominal == nil || *isi.Nominal != 1 {
		t.Fatalf("payload dengan nominal Rp1 dan CRC baru ditolak pemindai: %+v %v", isi, err)
	}
	// Pemindai yang memakai nominal dari payload mengirim Rp1: server menolaknya karena nominal terikat pada id QR.
	_, err = svc.BayarQR(ctx, pembeli, isi.ID, isi.Nominal)
	butirValidasi(t, err, "nominal")
	if got := saldo(t, db, pembeli); got != 100_000 {
		t.Fatalf("saldo pembeli %d, ingin 100000", got)
	}
	// Tanpa body, server memotong nominal yang tersimpan, bukan nominal di payload.
	h, err := svc.BayarQR(ctx, pembeli, isi.ID, nil)
	if err != nil || h.Nominal != 35_000 {
		t.Fatalf("bayar tanpa body: %+v %v", h, err)
	}
	fmt.Println("LAB|payload dinamis dengan nominal Rp1 dan CRC dihitung ulang lolos pemindai; nominal di server tetap Rp35.000: body Rp1 ditolak (ErrValidasi nominal), body kosong memotong Rp35.000")
}

func TestQRBatasSaldoTepatDanKurangSatuRupiah(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	merchant := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	pas := qrAkun(t, db, "pemakai", "belum", "aktif", 35_000)
	kurang := qrAkun(t, db, "pemakai", "belum", "aktif", 34_999)
	q1, _ := svc.BuatQR(ctx, merchant, "dinamis", qrNom(35_000))
	q2, _ := svc.BuatQR(ctx, merchant, "dinamis", qrNom(35_000))
	h, err := svc.BayarQR(ctx, pas, q1.ID, nil)
	if err != nil || h.Saldo != 0 {
		t.Fatalf("saldo Rp35.000 membayar QR Rp35.000: %+v %v; harus lolos dan menyisakan Rp0", h, err)
	}
	if _, err := svc.BayarQR(ctx, kurang, q2.ID, nil); !errors.Is(err, ErrSaldoKurang) {
		t.Fatalf("saldo Rp34.999 membayar QR Rp35.000: ingin ErrSaldoKurang, dapat %v", err)
	}
	if st, _ := qrStatus(t, db, q2.ID); st != "aktif" {
		t.Fatalf("QR yang gagal dibayar karena saldo: %s, ingin tetap aktif", st)
	}
	if saldo(t, db, kurang) != 34_999 || saldo(t, db, pas) != 0 || saldo(t, db, merchant) != 35_000 {
		t.Fatalf("saldo kurang %d, pas %d, merchant %d", saldo(t, db, kurang), saldo(t, db, pas), saldo(t, db, merchant))
	}
	fmt.Println("LAB|saldo tepat Rp35.000 membayar QR Rp35.000 dan menyisakan Rp0; saldo Rp34.999 ditolak (ErrSaldoKurang) dan QR tetap aktif")
}

// Id QR yang bentuknya salah ditolak ErrTidakDitemukan sebelum menyentuh database dan sebelum mengambil token laju:
// jatah laporan (3 per jam) dan jatah pembayaran (20 per menit) utuh sesudah puluhan masukan salah.
func TestQRBatasIdBentukSalahDitolakSebelumJatahLaju(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	merchant := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	pembeli := qrAkun(t, db, "pemakai", "belum", "aktif", 100_000)
	pelapor := qrAkun(t, db, "pemakai", "belum", "aktif", 0)
	q, err := svc.BuatQR(ctx, merchant, "statis", nil)
	if err != nil {
		t.Fatal(err)
	}
	salah := []string{"", "ngawur", strings.ToUpper(q.ID), q.ID + "0", q.ID[:35], "00000000-0000-4000-8000-00000000000g", "'; DROP TABLE qr; --"}
	for putaran := 0; putaran < 30; putaran++ {
		for _, id := range salah {
			if _, err := svc.LihatQR(ctx, id); !errors.Is(err, ErrTidakDitemukan) {
				t.Fatalf("LihatQR(%q): ingin ErrTidakDitemukan, dapat %v", id, err)
			}
			if _, err := svc.BayarQR(ctx, pembeli, id, qrNom(1_000)); !errors.Is(err, ErrTidakDitemukan) {
				t.Fatalf("BayarQR(%q): ingin ErrTidakDitemukan, dapat %v", id, err)
			}
			if err := svc.LaporkanQR(ctx, pelapor, id, strings.Repeat("x", 20)); !errors.Is(err, ErrTidakDitemukan) {
				t.Fatalf("LaporkanQR(%q): ingin ErrTidakDitemukan, dapat %v", id, err)
			}
		}
	}
	if _, err := svc.BayarQR(ctx, pembeli, q.ID, qrNom(1_000)); err != nil {
		t.Fatalf("pembayaran yang sah sesudah masukan salah: %v (jatah laju terpakai oleh masukan salah?)", err)
	}
	if err := svc.LaporkanQR(ctx, pelapor, q.ID, strings.Repeat("x", 20)); err != nil {
		t.Fatalf("laporan yang sah sesudah masukan salah: %v (jatah laju terpakai oleh masukan salah?)", err)
	}
	fmt.Println("LAB|id QR berbentuk salah (kosong, huruf besar, kelebihan atau kekurangan karakter, huruf di luar heksadesimal, teks SQL) dijawab ErrTidakDitemukan untuk konfirmasi, pembayaran, dan laporan; 630 pemanggilan (30 putaran, 7 id, 3 jalur) tidak memakai jatah laju")
}

// Alasan laporan dihitung dalam karakter (bukan byte) sesudah spasi di ujungnya dipangkas: 19 karakter berbyte dua
// ditolak walau 38 byte, 150 karakter berbyte dua diterima walau 300 byte, dan 19 karakter berspasi di ujung ditolak.
func TestQRBatasAlasanLaporanDalamKarakterSesudahDipangkas(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	merchant := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 0)
	q, err := svc.BuatQR(ctx, merchant, "statis", nil)
	if err != nil {
		t.Fatal(err)
	}
	pelapor := func() int64 { return qrAkun(t, db, "pemakai", "belum", "aktif", 0) }
	butirValidasi(t, svc.LaporkanQR(ctx, pelapor(), q.ID, strings.Repeat("é", 19)), "alasan")
	butirValidasi(t, svc.LaporkanQR(ctx, pelapor(), q.ID, "   "+strings.Repeat("x", 19)+"   "), "alasan")
	butirValidasi(t, svc.LaporkanQR(ctx, pelapor(), q.ID, strings.Repeat("é", 201)), "alasan")
	var status string
	if err := db.QueryRow(`SELECT status FROM akun WHERE id = $1`, merchant).Scan(&status); err != nil || status != "aktif" {
		t.Fatalf("laporan yang ditolak tidak boleh membekukan: status %q (%v)", status, err)
	}
	if err := svc.LaporkanQR(ctx, pelapor(), q.ID, strings.Repeat("é", 150)); err != nil {
		t.Fatalf("laporan 150 karakter berbyte dua (300 byte): %v", err)
	}
	if err := db.QueryRow(`SELECT status FROM akun WHERE id = $1`, merchant).Scan(&status); err != nil || status != "dibekukan" {
		t.Fatalf("status merchant %q (%v), ingin dibekukan", status, err)
	}
	fmt.Println("LAB|alasan laporan dihitung dalam karakter sesudah spasi di ujungnya dipangkas: 19 karakter berbyte dua dan 19 karakter berspasi ditolak, 150 karakter berbyte dua (300 byte) diterima")
}
