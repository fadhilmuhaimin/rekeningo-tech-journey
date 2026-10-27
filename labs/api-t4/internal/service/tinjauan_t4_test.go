package service

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgconn"

	"lab/apit4/internal/gateway"
	"lab/apit4/internal/repo"
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

// Otorisasi yang sudah ditagih (clearing) tetap dihitung dalam batas harian kartu. Mutan: hanya yang masih ditahan
// yang dihitung, jadi pemilik bisa melewati batas dengan menunggu penagihan.
func TestBatasHarianKartuMenghitungYangSudahDitagih(t *testing.T) {
	svc, db := svcKartu(t, Dep{})
	ctx := context.Background()
	a := pemakaiBaru(t, db, "terverifikasi", 500_000)
	token := kartuTes(t, db, a, "aktif", 50_000)
	id := idOtorisasi()
	k, err := svc.Otorisasi(ctx, PermintaanOtorisasi{IDPenerbit: id, Token: token, Jumlah: 50_000})
	harapSetuju(t, k, err)
	if _, err := svc.Clearing(ctx, id, 50_000); err != nil {
		t.Fatal(err)
	}
	k, err = svc.Otorisasi(ctx, PermintaanOtorisasi{IDPenerbit: idOtorisasi(), Token: token, Jumlah: 1})
	if err != nil || k.Keputusan != "tolak" || k.Alasan != "batas-harian" {
		t.Fatalf("Rp1 sesudah Rp50.000 yang sudah ditagih: %+v, %v; harus tolak batas-harian", k, err)
	}
}

// Penyetuju harus memegang sesi app. Sesi web milik staf risk (tidak bisa dibuat LoginWeb, tetapi bisa ada di
// database) tidak menggantikan token penyetuju. Mutan: jenis sesi tidak diperiksa.
func TestPenyetujuHarusSesiApp(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	risk := akunBO(t, db, "risk", "terverifikasi", 0)
	risk2 := akunBO(t, db, "risk", "terverifikasi", 0)
	sasaran := akunBO(t, db, "pemakai", "terverifikasi", 0)
	if err := svc.BekukanBO(ctx, risk, sasaran, alasanUji); err != nil {
		t.Fatal(err)
	}
	token := fmt.Sprintf("token-web-%d-%d", risk2, time.Now().UnixNano())
	csrf := hashToken("csrf-" + token)
	if err := repo.Baru(db).SimpanSesi(ctx, hashToken(token), risk2, time.Now().Add(time.Hour), "web", &csrf); err != nil {
		t.Fatal(err)
	}
	if err := svc.BukaBlokirBO(ctx, risk, sasaran, alasanUji, token); !errors.Is(err, ErrButuhPersetujuan) {
		t.Fatalf("sesi web sebagai penyetuju: %v; harus ErrButuhPersetujuan", err)
	}
	if st, _ := statusAkun(t, db, sasaran); st != "dibekukan" {
		t.Errorf("status %s: akun tidak boleh dibuka tanpa penyetuju yang sah", st)
	}
	// Pembanding: token app milik petugas yang sama diterima.
	if err := svc.BukaBlokirBO(ctx, risk, sasaran, alasanUji, sesiBaru(t, db, risk2)); err != nil {
		t.Fatalf("token app penyetuju sah: %v", err)
	}
}

// harapPelanggaran: err harus pelanggaran unik atau CHECK dengan nama constraint itu (bukan error lain).
func harapPelanggaran(t *testing.T, err error, kode, nama string) {
	t.Helper()
	var pg *pgconn.PgError
	if !errors.As(err, &pg) {
		t.Fatalf("ditolak database dengan %q, dapat %v; harus %s %s", nama, err, kode, nama)
	}
	if pg.Code != kode || pg.ConstraintName != nama {
		t.Fatalf("pelanggaran %s %s, harus %s %s", pg.Code, pg.ConstraintName, kode, nama)
	}
}

// Satu kejadian paling banyak satu catatan: constraint unik yang menjadi lapis terakhir bila service salah. Mutan
// migrasi: UNIQUE dibuang dari topup_bank.jurnal_id, otorisasi_kartu.id_penerbit, otorisasi_kartu.jurnal_tahan_id,
// atau index verifikasi_satu_berjalan. Tidak ada tes lain yang memeriksanya langsung di database.
func TestAturanUnikDatabaseTahap4(t *testing.T) {
	svc0, db := siapkan(t)
	svc := svcT4(t, svc0, nil)

	// Dua top-up tidak boleh menunjuk satu jurnal.
	budi := qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0)
	_, order1 := topupSiap(t, db, budi, 10_000)
	id2, _ := topupSiap(t, db, budi, 10_000)
	if h, err := kabarSah(svc, time.Now(), idEvent(t, "unik"), order1, "settlement", 10_000); err != nil || h.Hasil != "diproses" {
		t.Fatalf("settlement: %+v, %v", h, err)
	}
	var jurnal1 int64
	if err := db.QueryRow(`SELECT jurnal_id FROM topup_bank WHERE order_id = $1`, order1).Scan(&jurnal1); err != nil {
		t.Fatal(err)
	}
	_, err := db.Exec(`UPDATE topup_bank SET jurnal_id = $1 WHERE id = $2`, jurnal1, id2)
	harapPelanggaran(t, err, "23505", "topup_bank_jurnal_id_key")

	// Otorisasi: id_penerbit dan jurnal tahan masing-masing satu baris.
	svcK, dbK := svcKartu(t, Dep{})
	pemilik := pemakaiBaru(t, dbK, "terverifikasi", 100_000)
	satu := holdBaru(t, svcK, dbK, pemilik, 5_000)
	dua := holdBaru(t, svcK, dbK, pemilik, 6_000)
	_, err = dbK.Exec(`INSERT INTO otorisasi_kartu (kartu_id, id_penerbit, jumlah, status)
		SELECT kartu_id, id_penerbit, 1, 'ditolak' FROM otorisasi_kartu WHERE id_penerbit = $1`, satu)
	harapPelanggaran(t, err, "23505", "otorisasi_kartu_id_penerbit_key")
	_, err = dbK.Exec(`UPDATE otorisasi_kartu SET jurnal_tahan_id = (SELECT jurnal_tahan_id FROM otorisasi_kartu WHERE id_penerbit = $1)
		WHERE id_penerbit = $2`, satu, dua)
	harapPelanggaran(t, err, "23505", "otorisasi_kartu_jurnal_tahan_id_key")

	// Satu pengajuan verifikasi yang berjalan per akun dan subjek.
	dina := qrAkun(t, db, "pemakai", "belum", "aktif", 0)
	ajukan := `INSERT INTO verifikasi (akun_id, subjek, berkas_kartu_kunci, berkas_swafoto_kunci, checksum_kartu, checksum_swafoto)
		VALUES ($1, 'pemakai', 'k', 's', 'c', 'c')`
	if _, err := db.Exec(ajukan, dina); err != nil {
		t.Fatal(err)
	}
	_, err = db.Exec(ajukan, dina)
	harapPelanggaran(t, err, "23505", "verifikasi_satu_berjalan")
}
