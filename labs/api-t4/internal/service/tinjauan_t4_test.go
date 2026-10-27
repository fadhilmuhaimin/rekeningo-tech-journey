package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"lab/apit4/internal/gateway"
)

// Tes tambahan dari tinjauan lab api-t4: mutan yang lolos uji mutasi peninjau (perubahan satu hal di kode, semua tes
// lulus) ditutup di sini. Tiap tes menyebut mutan yang ditutupnya.

// Rekonsiliasi melihat selisih di dua arah. Ledger lebih besar dari laporan gateway berarti Rekeningo mengkredit
// lebih dari yang dibayar bank; selisihnya negatif (gateway dikurangi ledger). Mutan: pembanding jumlah hanya
// melihat gateway lebih besar.
func TestRekonHarianLedgerLebihBesarDariGateway(t *testing.T) {
	svc0, db := siapkan(t)
	g := gatewayTes(t)
	svc := svcT4(t, svc0, g)
	jkt, _ := time.LoadLocation("Asia/Jakarta")
	tgl := time.Now().In(jkt).Format("2006-01-02")
	budi := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
	_, order := topupSiap(t, db, budi, 30_000)
	if h, err := kabarSah(svc, time.Now(), idEvent(t, "lebih"), order, "settlement", 30_000); err != nil || h.Hasil != "diproses" {
		t.Fatalf("kabar settlement: %+v, %v", h, err)
	}
	g.mu.Lock()
	g.settlement = []gateway.BarisSettlement{{OrderID: order, Jumlah: 25_000}}
	g.mu.Unlock()
	if _, err := svc.RekonHarian(context.Background(), tgl); err != nil {
		t.Fatal(err)
	}
	var jenis string
	var selisih int64
	if err := db.QueryRow(`SELECT jenis, selisih FROM insiden_rekon WHERE order_id = $1 AND tanggal = $2::date`, order, tgl).Scan(&jenis, &selisih); err != nil {
		t.Fatalf("ledger Rp30.000 lawan gateway Rp25.000 tidak menjadi insiden: %v", err)
	}
	if jenis != "jumlah_beda" || selisih != -5_000 {
		t.Errorf("insiden %s selisih %d, harus jumlah_beda -5000", jenis, selisih)
	}
}

// Kabar yang diparkir dicek ke gateway hanya bila top-up masih menunggu. Top-up yang sudah berstatus akhir tidak
// ditanyakan: CekTopup berhenti sebelum memanggil gateway. Mutan: pemeriksaan sesudah kabar diparkir dibuang.
func TestWebhookDiparkirDicekKeGatewayHanyaBilaMasihMenunggu(t *testing.T) {
	svc0, db := siapkan(t)
	g := gatewayTes(t)
	svc := svcT4(t, svc0, g)

	// Sudah dibayar: kabar pending diparkir, gateway tidak ditanya.
	budi := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
	_, dibayar := topupSiap(t, db, budi, 50_000)
	if h, err := kabarSah(svc, time.Now(), idEvent(t, "d1"), dibayar, "settlement", 50_000); err != nil || h.Hasil != "diproses" {
		t.Fatalf("settlement: %+v, %v", h, err)
	}
	g.tandai(dibayar, "settlement", 50_000)
	sebelum := g.jumlahGet()
	if h, err := kabarSah(svc, time.Now(), idEvent(t, "d2"), dibayar, "pending", 50_000); err != nil || h.Hasil != "diparkir" {
		t.Fatalf("pending sesudah dibayar: %+v, %v", h, err)
	}
	if n := g.jumlahGet() - sebelum; n != 0 {
		t.Errorf("gateway ditanya %d kali untuk top-up yang sudah dibayar, harus 0", n)
	}

	// Masih menunggu dan diparkir karena melewati batas tingkat: gateway ditanya satu kali.
	dina := qrAkun(t, db, "pemakai", "belum", "aktif", 900_000)
	_, menunggu := topupSiap(t, db, dina, 200_000)
	g.tandai(menunggu, "settlement", 200_000)
	sebelum = g.jumlahGet()
	if h, err := kabarSah(svc, time.Now(), idEvent(t, "d3"), menunggu, "settlement", 200_000); err != nil || h.Hasil != "diparkir" {
		t.Fatalf("settlement melewati batas: %+v, %v", h, err)
	}
	if n := g.jumlahGet() - sebelum; n != 1 {
		t.Errorf("gateway ditanya %d kali untuk top-up yang masih menunggu, harus 1", n)
	}
	if s := saldo(t, db, dina); s != 900_000 {
		t.Errorf("saldo %d: top-up yang melewati batas tidak boleh dikredit", s)
	}
}

// id_penerbit yang sama untuk kartu lain bukan ulangan. Mutan: jawabUlang tidak membandingkan kartunya.
func TestOtorisasiIDPenerbitSamaUntukKartuLainDitolak(t *testing.T) {
	svc, db := svcKartu(t, Dep{})
	ctx := context.Background()
	a := pemakaiBaru(t, db, "terverifikasi", 100_000)
	b := pemakaiBaru(t, db, "terverifikasi", 100_000)
	tokenA := kartuTes(t, db, a, "aktif", 500_000)
	tokenB := kartuTes(t, db, b, "aktif", 500_000)
	id := idOtorisasi()
	k, err := svc.Otorisasi(ctx, PermintaanOtorisasi{IDPenerbit: id, Token: tokenA, Jumlah: 10_000})
	harapSetuju(t, k, err)
	if k, err := svc.Otorisasi(ctx, PermintaanOtorisasi{IDPenerbit: id, Token: tokenB, Jumlah: 10_000}); !errors.Is(err, ErrOtorisasiBeda) {
		t.Fatalf("id_penerbit yang sama untuk kartu lain: %+v, %v; harus ErrOtorisasiBeda", k, err)
	}
	if s := saldo(t, db, b); s != 100_000 {
		t.Errorf("saldo pemilik kartu lain %d, harus tetap 100000", s)
	}
}

// Batas harian dan saldo adalah batas sama-dengan: tepat di batas boleh, satu rupiah lebih ditolak. Mutan: pembanding
// batas harian atau saldo memakai >= atau <=.
func TestOtorisasiTepatDiBatasHarianDanSaldoBoleh(t *testing.T) {
	svc, db := svcKartu(t, Dep{})
	ctx := context.Background()
	a := pemakaiBaru(t, db, "terverifikasi", 500_000)
	token := kartuTes(t, db, a, "aktif", 50_000)
	minta := func(jumlah int64) Keputusan {
		k, err := svc.Otorisasi(ctx, PermintaanOtorisasi{IDPenerbit: idOtorisasi(), Token: token, Jumlah: jumlah})
		if err != nil {
			t.Fatal(err)
		}
		return k
	}
	harapSetuju(t, minta(30_000), nil)
	harapSetuju(t, minta(20_000), nil) // 30.000 + 20.000 = batas harian 50.000 tepat
	if k := minta(1); k.Keputusan != "tolak" || k.Alasan != "batas-harian" {
		t.Errorf("Rp1 sesudah batas harian: %+v, harus tolak batas-harian", k)
	}

	// Seluruh saldo: otorisasi sebesar saldo disetujui dan saldo jadi nol.
	b := pemakaiBaru(t, db, "terverifikasi", 40_000)
	tokenB := kartuTes(t, db, b, "aktif", 500_000)
	k, err := svc.Otorisasi(ctx, PermintaanOtorisasi{IDPenerbit: idOtorisasi(), Token: tokenB, Jumlah: 40_000})
	harapSetuju(t, k, err)
	if s := saldo(t, db, b); s != 0 {
		t.Errorf("saldo %d sesudah menahan seluruh saldo, harus 0", s)
	}
	if k, err := svc.Otorisasi(ctx, PermintaanOtorisasi{IDPenerbit: idOtorisasi(), Token: tokenB, Jumlah: 1}); err != nil || k.Keputusan != "tolak" || k.Alasan != "saldo-kurang" {
		t.Errorf("Rp1 dari saldo nol: %+v, %v; harus tolak saldo-kurang", k, err)
	}
}
