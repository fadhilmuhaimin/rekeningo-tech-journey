package service

import (
	"context"
	"fmt"
	"testing"
	"time"

	"lab/apit4/internal/gateway"
)

// Tes tambahan dari tinjauan lab t4-webhook: mutan yang lolos uji mutasi peninjau (satu perubahan di kode, semua tes
// lulus) ditutup di sini. Tiap tes menyebut mutan yang ditutupnya.

// ADR 22 untuk job koreksi: pertanyaan ke gateway (tidak_di_gateway) dikerjakan sebelum transaction dibuka. Selama
// gateway menggantung tidak ada koneksi idle in transaction, dan pemilik akun masih bisa membayar. Mutan: panggilan
// ke gateway dipindah ke dalam koreksiTidakDiGateway, sesudah insiden dikunci.
func TestKoreksiRekonTidakMenahanTransactionSelamaGatewayMenunggu(t *testing.T) {
	svc0, db := siapkan(t)
	g := gatewayTes(t)
	svc := svcT4(t, svc0, g)
	svc.t4.Gateway = gateway.Baru(g.srv.URL, 3*time.Second)
	ctx := context.Background()
	karyawan, _ := akunBaru(t, db, "karyawan", 100_000)
	warung, _ := akunBaru(t, db, "warung", 0)
	tid, order := topupSiap(t, db, karyawan, 40_000)
	if h, err := kabarSah(svc, time.Now(), idEvent(t, "ad22"), order, "settlement", 40_000); err != nil || h.Hasil != "diproses" {
		t.Fatalf("kredit awal: %+v %v", h, err)
	}
	ins := insidenBaru(t, db, order, tid, "tidak_di_gateway", -40_000) // gateway tidak mengenal order: kredit akan dibalik
	bersihkanInsiden(t, db, order)
	g.atur("tidur", 1500*time.Millisecond)
	selesai := make(chan HasilKoreksi, 1)
	go func() {
		h, err := svc.KoreksiRekon(ctx)
		if err != nil {
			t.Error(err)
		}
		selesai <- h
	}()
	<-g.masuk // pertanyaan ke gateway sedang berjalan
	mulai := time.Now()
	if _, _, err := svc.Bayar(ctx, karyawan, warung, 10_000, ""); err != nil {
		t.Fatalf("bayar saat job koreksi menunggu gateway: %v", err)
	}
	if d := time.Since(mulai); d > time.Second {
		t.Errorf("bayar menunggu %s selama job koreksi menunggu gateway", d)
	}
	// Sampai job selesai: koneksi milik proses ini yang idle in transaction terus-menerus (lima cuplikan berturut-turut,
	// 200 ms) berarti sebuah transaction menunggu jaringan. Transaction pendek job sendiri tidak terhitung. Satu cuplikan
	// saja tidak cukup: panggilan kedua ke gateway (mutan) baru terjadi sesudah yang pertama selesai.
	berturut, terpanjang := 0, 0
	for done := false; !done; {
		select {
		case h := <-selesai:
			selesai <- h
			done = true
		case <-time.After(40 * time.Millisecond):
			var idle int
			db.QueryRow(`SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND application_name = $1 AND state LIKE 'idle in transaction%'`, appTes).Scan(&idle)
			if idle > 0 {
				berturut++
			} else {
				berturut = 0
			}
			if berturut > terpanjang {
				terpanjang = berturut
			}
		}
	}
	if terpanjang >= 5 {
		t.Errorf("koneksi idle in transaction %d cuplikan berturut-turut selama job koreksi menunggu gateway", terpanjang)
	}
	h := <-selesai
	if h != (HasilKoreksi{Diperiksa: 1, Dikoreksi: 1}) {
		t.Errorf("hasil %+v", h)
	}
	if st, j := statusInsiden(t, db, ins); st != "selesai" || j == nil {
		t.Errorf("insiden: %s %v", st, j)
	}
}

// jumlah_beda: saldo yang tepat mencapai batas tingkat masih boleh dikredit; satu rupiah di atasnya ditahan. Mutan:
// pembanding batas `>` menjadi `>=`.
func TestKoreksiRekonJumlahBedaTepatDiBatasTingkat(t *testing.T) {
	svc0, db := siapkan(t)
	svc := svcT4(t, svc0, gatewayTes(t))
	ctx := context.Background()
	kredit := func(jumlah int64) (akun, tid int64, order string) {
		akun = qrAkun(t, db, "pemakai", "belum", "aktif", 0)
		tid, order = topupSiap(t, db, akun, jumlah)
		if h, err := kabarSah(svc, time.Now(), idEvent(t, "pas"), order, "settlement", jumlah); err != nil || h.Hasil != "diproses" {
			t.Fatalf("%+v %v", h, err)
		}
		return
	}
	sisa := BatasSaldoBelum - 980_000
	akunPas, tidPas, orderPas := kredit(980_000)
	pas := insidenBaru(t, db, orderPas, tidPas, "jumlah_beda", sisa)
	akunLebih, tidLebih, orderLebih := kredit(980_000)
	lebih := insidenBaru(t, db, orderLebih, tidLebih, "jumlah_beda", sisa+1)
	bersihkanInsiden(t, db, orderPas, orderLebih)
	h, err := svc.KoreksiRekon(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if h != (HasilKoreksi{Diperiksa: 2, Dikoreksi: 1, Ditahan: 1}) {
		t.Fatalf("hasil %+v", h)
	}
	if s := saldo(t, db, akunPas); s != BatasSaldoBelum {
		t.Errorf("saldo tepat di batas: %d, harus %d", s, BatasSaldoBelum)
	}
	if st, j := statusInsiden(t, db, pas); st != "selesai" || j == nil {
		t.Errorf("insiden tepat di batas: %s %v", st, j)
	}
	if s := saldo(t, db, akunLebih); s != 980_000 {
		t.Errorf("saldo satu rupiah di atas batas: %d, harus tetap 980000", s)
	}
	if st, _ := statusInsiden(t, db, lebih); st != "terbuka" {
		t.Errorf("insiden satu rupiah di atas batas: %s", st)
	}
}

// Job cek status: batasnya 30 menit (UmurCekStatus, Asumsi) dan yang tidak_pasti ikut. Tes lama hanya membandingkan
// 2 jam dengan 0 menit, jadi batas antara 0 dan 2 jam tidak dijaga. Mutan: UmurCekStatus 30 menit menjadi 3 menit;
// query job hanya memuat status menunggu.
func TestCekTopupBelumSelesaiBatasTigaPuluhMenitDanTidakPasti(t *testing.T) {
	svc0, db := siapkan(t)
	g := gatewayTes(t)
	svc := svcT4(t, svc0, g)
	ctx := context.Background()
	akun := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
	buat := func(menit int, status string) int64 {
		id, order := topupSiap(t, db, akun, 10_000)
		if _, err := db.Exec(`UPDATE topup_bank SET dibuat = now() - make_interval(mins => $2), status = $3 WHERE id = $1`, id, menit, status); err != nil {
			t.Fatal(err)
		}
		g.tandai(order, "settlement", 10_000)
		return id
	}
	dua9 := buat(29, "menunggu")
	tiga1 := buat(31, "menunggu")
	pasti := buat(31, "tidak_pasti")
	if _, err := svc.CekTopupBelumSelesai(ctx, UmurCekStatus); err != nil {
		t.Fatal(err)
	}
	if s := statusTopup(t, db, dua9); s != "menunggu" {
		t.Errorf("umur 29 menit: %s, harus belum ditanyakan (batas %s)", s, UmurCekStatus)
	}
	if s := statusTopup(t, db, tiga1); s != "dibayar" {
		t.Errorf("umur 31 menit: %s, harus sudah ditanyakan", s)
	}
	if s := statusTopup(t, db, pasti); s != "dibayar" {
		t.Errorf("tidak_pasti umur 31 menit: %s, harus ikut ditanyakan", s)
	}
}

// Top-up berstatus tidak_pasti (timeout waktu membuat order) yang dibayar di bank dikoreksi seperti yang menunggu.
// Mutan: koreksi tidak_di_ledger hanya mengenali status menunggu.
func TestKoreksiRekonTidakDiLedgerTopupTidakPasti(t *testing.T) {
	svc0, db := siapkan(t)
	svc := svcT4(t, svc0, gatewayTes(t))
	akun := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
	tid, order := topupSiap(t, db, akun, 25_000)
	if _, err := db.Exec(`UPDATE topup_bank SET status = 'tidak_pasti' WHERE id = $1`, tid); err != nil {
		t.Fatal(err)
	}
	ins := insidenBaru(t, db, order, tid, "tidak_di_ledger", 25_000)
	bersihkanInsiden(t, db, order)
	h, err := svc.KoreksiRekon(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if h != (HasilKoreksi{Diperiksa: 1, Dikoreksi: 1}) {
		t.Fatalf("hasil %+v", h)
	}
	if s := saldo(t, db, akun); s != 25_000 {
		t.Errorf("saldo %d, harus 25000", s)
	}
	if s := statusTopup(t, db, tid); s != "dibayar" {
		t.Errorf("status top-up %s", s)
	}
	if st, j := statusInsiden(t, db, ins); st != "selesai" || j == nil {
		t.Errorf("insiden: %s %v", st, j)
	}
}

// Satu insiden yang gagal di database dihitung galat dan tidak menghentikan insiden sesudahnya. Insiden pertama
// memakai akun tanpa buku, jadi kreditnya gagal dan transaction-nya dibatalkan. Mutan: galat pertama mengakhiri job.
func TestKoreksiRekonSatuGalatTidakMenghentikanYangLain(t *testing.T) {
	svc0, db := siapkan(t)
	svc := svcT4(t, svc0, gatewayTes(t))
	var rusak int64
	if err := db.QueryRow(`SELECT greatest(coalesce(max(id), 0), 100000) + 1 FROM akun`).Scan(&rusak); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO akun (id, jenis, nama, email, password_hash, tingkat, status)
		VALUES ($1, 'pemakai', 'Tanpa buku', $2, '!', 'terverifikasi', 'aktif')`, rusak, fmt.Sprintf("tanpabuku%d@publik.example", rusak)); err != nil {
		t.Fatal(err)
	}
	tidR, orderR := topupSiap(t, db, rusak, 12_000)
	insR := insidenBaru(t, db, orderR, tidR, "tidak_di_ledger", 12_000) // nomor lebih kecil: dikerjakan lebih dulu
	baik := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
	tidB, orderB := topupSiap(t, db, baik, 13_000)
	insB := insidenBaru(t, db, orderB, tidB, "tidak_di_ledger", 13_000)
	bersihkanInsiden(t, db, orderR, orderB)
	h, err := svc.KoreksiRekon(context.Background())
	if err != nil {
		t.Fatalf("job berhenti di galat pertama: %v", err)
	}
	if h != (HasilKoreksi{Diperiksa: 2, Dikoreksi: 1, Galat: 1}) {
		t.Fatalf("hasil %+v", h)
	}
	if st, _ := statusInsiden(t, db, insR); st != "terbuka" {
		t.Errorf("insiden yang galat: %s, harus tetap terbuka", st)
	}
	if n := jurnalUntukOrder(t, db, orderR); n != 0 {
		t.Errorf("%d jurnal untuk insiden yang galat", n)
	}
	if st, j := statusInsiden(t, db, insB); st != "selesai" || j == nil {
		t.Errorf("insiden sesudah galat: %s %v", st, j)
	}
	if s := saldo(t, db, baik); s != 13_000 {
		t.Errorf("saldo %d, harus 13000", s)
	}
}

// webhook_event menyimpan jenis kabar, top-up, dan jurnalnya; kabar untuk order yang tidak dikenal tetap tercatat
// ditolak. Mutan: topup_id tidak diisi, jenis diganti, event untuk order tak dikenal tidak ditulis.
func TestWebhookEventMenyimpanJenisTopupDanJurnal(t *testing.T) {
	svc0, db := siapkan(t)
	svc := svcT4(t, svc0, nil)
	akun := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
	tid, order := topupSiap(t, db, akun, 20_000)
	baca := func(event string) (jenis, hasil string, topup, jurnal *int64) {
		t.Helper()
		if err := db.QueryRow(`SELECT jenis, hasil, topup_id, jurnal_id FROM webhook_event WHERE event_id = $1`, event).Scan(&jenis, &hasil, &topup, &jurnal); err != nil {
			t.Fatalf("event %s tidak tercatat: %v", event, err)
		}
		return
	}
	pending := idEvent(t, "jenis-p")
	if h, err := kabarSah(svc, time.Now(), pending, order, "pending", 20_000); err != nil || h.Hasil != "diproses" {
		t.Fatalf("pending: %+v %v", h, err)
	}
	if jenis, hasil, topup, jurnal := baca(pending); jenis != "pending" || hasil != "diproses" || topup == nil || *topup != tid || jurnal != nil {
		t.Errorf("event pending: %s %s %v %v", jenis, hasil, topup, jurnal)
	}
	settle := idEvent(t, "jenis-s")
	if h, err := kabarSah(svc, time.Now(), settle, order, "settlement", 20_000); err != nil || h.Hasil != "diproses" {
		t.Fatalf("settlement: %+v %v", h, err)
	}
	if jenis, hasil, topup, jurnal := baca(settle); jenis != "settlement" || hasil != "diproses" || topup == nil || *topup != tid || jurnal == nil {
		t.Errorf("event settlement: %s %s %v %v", jenis, hasil, topup, jurnal)
	}
	asing := idEvent(t, "jenis-x")
	if h, err := kabarSah(svc, time.Now(), asing, "TB-tidak-dikenal-"+acakHex(4), "settlement", 1_000); err != nil || h.Hasil != "ditolak" {
		t.Fatalf("order tak dikenal: %+v %v", h, err)
	}
	if _, hasil, topup, jurnal := baca(asing); hasil != "ditolak" || topup != nil || jurnal != nil {
		t.Errorf("event order tak dikenal: %s %v %v", hasil, topup, jurnal)
	}
}
