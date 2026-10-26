package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"lab/apit4/internal/penerbit"
)

// Tes kartu virtual (M37, ADR 42) dengan PostgreSQL sungguhan. Pola db_test.go: setiap tes membuat akun dan kartunya
// sendiri, karena posting tidak bisa dihapus. Angka yang bergantung mesin (lama menunggu lock) diperiksa sebagai
// batas, bukan nilai tunggal.

var urutKartuTes atomic.Int64

// pemakaiBaru: akun pemakai dengan buku, tingkat tertentu, dan saldo awal.
func pemakaiBaru(t *testing.T, db *sql.DB, tingkat string, saldoAwal int64) int64 {
	t.Helper()
	var id int64
	if err := db.QueryRow(`SELECT greatest(coalesce(max(id), 0), 100000) + 1 FROM akun`).Scan(&id); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO akun (id, jenis, nama, email, password_hash, tingkat)
		VALUES ($1, 'pemakai', $2, $3, '!', $4)`, id, fmt.Sprintf("Pemakai %d", id), fmt.Sprintf("kartu%d@publik.example", id), tingkat); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO buku (akun_id, jenis, batas_harian) VALUES ($1, 'pemakai', 500000)`, id); err != nil {
		t.Fatal(err)
	}
	if saldoAwal > 0 {
		isiSaldo(t, db, id, saldoAwal)
	}
	return id
}

// kartuTes: satu kartu milik akun itu; mengembalikan token dari penerbit.
func kartuTes(t *testing.T, db *sql.DB, akun int64, status string, batas int64) string {
	t.Helper()
	token := fmt.Sprintf("tok_tes_%d_%d", akun, urutKartuTes.Add(1))
	if _, err := db.Exec(`INSERT INTO kartu (akun_id, token_penerbit, empat_digit, status, batas_harian)
		VALUES ($1, $2, '4242', $3, $4)`, akun, token, status, batas); err != nil {
		t.Fatal(err)
	}
	return token
}

func idOtorisasi() string { return fmt.Sprintf("AUTH-%d", urutKartuTes.Add(1)+time.Now().UnixNano()) }

func hitungKartu(t *testing.T, db *sql.DB, q string, arg ...any) int64 {
	t.Helper()
	var n int64
	if err := db.QueryRow(q, arg...).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func saldoSistem(t *testing.T, db *sql.DB, jenis string) int64 {
	t.Helper()
	return hitungKartu(t, db, `SELECT saldo_cache FROM buku WHERE akun_id IS NULL AND jenis = $1`, jenis)
}

// svcKartu: service dengan kunci penerbit lab, pada schema tes.
func svcKartu(t *testing.T, d Dep) (Service, *sql.DB) {
	t.Helper()
	svc, db := siapkan(t)
	d.KunciPenerbit = "kunci-tes"
	return svc.DenganT4(d), db
}

func harapSetuju(t *testing.T, k Keputusan, err error) {
	t.Helper()
	if err != nil || k.Keputusan != "setuju" {
		t.Fatalf("keputusan %+v, error %v; harus setuju", k, err)
	}
}

// Versi benar: dana ditahan sebelum persetujuan. Saldo pemilik turun, dana_tertahan naik sebesar yang sama, hold
// adalah jurnal kartu_tahan yang seimbang dan terhubung ke baris otorisasi, dan key ledger = id_penerbit mengikat
// jurnal itu.
func TestOtorisasiMenahanDana(t *testing.T) {
	svc, db := svcKartu(t, Dep{})
	ctx := context.Background()
	akun := pemakaiBaru(t, db, "terverifikasi", 100_000)
	token := kartuTes(t, db, akun, "aktif", 500_000)
	tertahanAwal := saldoSistem(t, db, "dana_tertahan")
	id := idOtorisasi()

	k, err := svc.Otorisasi(ctx, PermintaanOtorisasi{IDPenerbit: id, Token: token, Jumlah: 80_000})
	harapSetuju(t, k, err)
	if s := saldo(t, db, akun); s != 20_000 {
		t.Fatalf("saldo pemilik %d, harus 20000: dana tidak tertahan", s)
	}
	if d := saldoSistem(t, db, "dana_tertahan") - tertahanAwal; d != 80_000 {
		t.Fatalf("dana_tertahan naik %d, harus 80000", d)
	}
	var status string
	var jurnal int64
	var jenis string
	if err := db.QueryRow(`SELECT o.status, o.jurnal_tahan_id, j.jenis FROM otorisasi_kartu o JOIN jurnal j ON j.id = o.jurnal_tahan_id
		WHERE o.id_penerbit = $1`, id).Scan(&status, &jurnal, &jenis); err != nil {
		t.Fatal(err)
	}
	if status != "ditahan" || jenis != "kartu_tahan" {
		t.Fatalf("otorisasi %s dengan jurnal %s; harus ditahan dan kartu_tahan", status, jenis)
	}
	if n, s := hitungKartu(t, db, `SELECT count(*) FROM posting WHERE jurnal_id = $1`, jurnal),
		hitungKartu(t, db, `SELECT coalesce(sum(jumlah), 0) FROM posting WHERE jurnal_id = $1`, jurnal); n != 2 || s != 0 {
		t.Fatalf("jurnal tahan: %d posting berjumlah %d; harus 2 dan 0", n, s)
	}
	// Idempotency-Key ke ledger = id_penerbit (ADR 42).
	if j := hitungKartu(t, db, `SELECT jurnal_id FROM kunci_idempotensi WHERE kunci = $1 AND status = 'selesai'`, id); j != jurnal {
		t.Fatalf("key ledger %q mengikat jurnal %d, harus jurnal tahan %d", id, j, jurnal)
	}
}

// Dua otorisasi serentak Rp80.000 dari saldo Rp100.000: versi benar menyetujui tepat satu, yang lain ditolak karena
// saldo, dan hanya satu hold yang ada.
func TestOtorisasiSerentakVersiBenar(t *testing.T) {
	svc, db := svcKartu(t, Dep{})
	akun := pemakaiBaru(t, db, "terverifikasi", 100_000)
	token := kartuTes(t, db, akun, "aktif", 500_000)
	hasil := make([]Keputusan, 2)
	var wg sync.WaitGroup
	for i := range hasil {
		wg.Add(1)
		go func() {
			defer wg.Done()
			k, err := svc.Otorisasi(context.Background(), PermintaanOtorisasi{IDPenerbit: idOtorisasi(), Token: token, Jumlah: 80_000})
			if err != nil {
				t.Errorf("otorisasi %d: %v", i, err)
			}
			hasil[i] = k
		}()
	}
	wg.Wait()
	setuju, tolakSaldo := 0, 0
	for _, k := range hasil {
		switch {
		case k.Keputusan == "setuju":
			setuju++
		case k.Keputusan == "tolak" && k.Alasan == "saldo-kurang":
			tolakSaldo++
		}
	}
	if setuju != 1 || tolakSaldo != 1 {
		t.Fatalf("hasil %+v; harus satu setuju dan satu tolak saldo-kurang", hasil)
	}
	if s := saldo(t, db, akun); s != 20_000 {
		t.Fatalf("saldo %d, harus 20000", s)
	}
	if n := hitungKartu(t, db, `SELECT count(*) FROM otorisasi_kartu o JOIN kartu k ON k.id = o.kartu_id
		WHERE k.akun_id = $1 AND o.status = 'ditahan'`, akun); n != 1 {
		t.Fatalf("%d hold, harus 1", n)
	}
}

// Mode rentan kartu-tanpa-hold (M37): cek saldo lalu setuju, tanpa lock dan tanpa hold. Dengan jeda di antara cek
// dan tulis, kedua otorisasi Rp80.000 dari saldo Rp100.000 disetujui. Clearing pertama berhasil, clearing kedua
// ditolak ledger saat COMMIT: uang yang sudah disetujui kepada toko tidak punya penutup.
func TestOtorisasiSerentakTanpaHoldDanClearingKeduaDitolak(t *testing.T) {
	svc, db := svcKartu(t, Dep{JedaCekTulis: 300 * time.Millisecond})
	svc.rentan = RentanKartuTanpaHold
	akun := pemakaiBaru(t, db, "terverifikasi", 100_000)
	token := kartuTes(t, db, akun, "aktif", 500_000)
	tertahanAwal := saldoSistem(t, db, "dana_tertahan")
	id := [2]string{idOtorisasi(), idOtorisasi()}
	hasil := make([]Keputusan, 2)
	var wg sync.WaitGroup
	for i := range hasil {
		wg.Add(1)
		go func() {
			defer wg.Done()
			k, err := svc.Otorisasi(context.Background(), PermintaanOtorisasi{IDPenerbit: id[i], Token: token, Jumlah: 80_000})
			if err != nil {
				t.Errorf("otorisasi %d: %v", i, err)
			}
			hasil[i] = k
		}()
	}
	wg.Wait()
	if hasil[0].Keputusan != "setuju" || hasil[1].Keputusan != "setuju" {
		t.Fatalf("hasil %+v; mode rentan harus menyetujui keduanya", hasil)
	}
	if s := saldo(t, db, akun); s != 100_000 || saldoSistem(t, db, "dana_tertahan") != tertahanAwal {
		t.Fatalf("saldo %d: mode rentan tidak boleh menahan dana", s)
	}
	if n := hitungKartu(t, db, `SELECT count(*) FROM otorisasi_kartu WHERE id_penerbit = ANY($1) AND status = 'ditahan' AND jurnal_tahan_id IS NULL`,
		fmt.Sprintf("{%s,%s}", id[0], id[1])); n != 2 {
		t.Fatalf("%d otorisasi ditahan tanpa jurnal, harus 2", n)
	}
	ctx := context.Background()
	if _, err := svc.Clearing(ctx, id[0], 80_000); err != nil {
		t.Fatalf("clearing pertama: %v", err)
	}
	if _, err := svc.Clearing(ctx, id[1], 80_000); !errors.Is(err, ErrSaldoKurang) {
		t.Fatalf("clearing kedua: %v; harus ErrSaldoKurang dari ledger", err)
	}
	if s := saldo(t, db, akun); s != 20_000 {
		t.Fatalf("saldo %d sesudah dua clearing, harus 20000 (hanya yang pertama lolos)", s)
	}
	var status string
	if err := db.QueryRow(`SELECT status FROM otorisasi_kartu WHERE id_penerbit = $1`, id[1]).Scan(&status); err != nil || status != "ditahan" {
		t.Fatalf("otorisasi kedua %q (%v): harus tetap ditahan, ditolak ledger tanpa penutup", status, err)
	}
}

// id_penerbit yang sama dua kali menghasilkan satu hold dan jawaban yang sama; id yang sama dengan jumlah lain
// bukan ulangan.
func TestOtorisasiIDSamaSatuHold(t *testing.T) {
	svc, db := svcKartu(t, Dep{})
	ctx := context.Background()
	akun := pemakaiBaru(t, db, "terverifikasi", 100_000)
	token := kartuTes(t, db, akun, "aktif", 500_000)
	id := idOtorisasi()
	in := PermintaanOtorisasi{IDPenerbit: id, Token: token, Jumlah: 30_000}
	for range 2 {
		k, err := svc.Otorisasi(ctx, in)
		harapSetuju(t, k, err)
	}
	if n := hitungKartu(t, db, `SELECT count(*) FROM jurnal WHERE jenis = 'kartu_tahan' AND keterangan LIKE '%' || $1`, id); n != 1 {
		t.Fatalf("%d jurnal tahan untuk %s, harus 1", n, id)
	}
	if s := saldo(t, db, akun); s != 70_000 {
		t.Fatalf("saldo %d, harus 70000 (satu hold)", s)
	}
	in.Jumlah = 40_000
	if _, err := svc.Otorisasi(ctx, in); !errors.Is(err, ErrOtorisasiBeda) {
		t.Fatalf("id sama jumlah beda: %v; harus ErrOtorisasiBeda", err)
	}
}

// Penolakan karena saldo dicatat satu kali dan dijawab sama saat diulang.
func TestOtorisasiDitolakDiulangDijawabSama(t *testing.T) {
	svc, db := svcKartu(t, Dep{})
	ctx := context.Background()
	akun := pemakaiBaru(t, db, "terverifikasi", 10_000)
	token := kartuTes(t, db, akun, "aktif", 500_000)
	in := PermintaanOtorisasi{IDPenerbit: idOtorisasi(), Token: token, Jumlah: 50_000}
	k, err := svc.Otorisasi(ctx, in)
	if err != nil || k.Keputusan != "tolak" || k.Alasan != "saldo-kurang" {
		t.Fatalf("keputusan %+v, error %v; harus tolak saldo-kurang", k, err)
	}
	k, err = svc.Otorisasi(ctx, in)
	if err != nil || k.Keputusan != "tolak" {
		t.Fatalf("diulang: %+v, %v; harus tolak lagi", k, err)
	}
	if n := hitungKartu(t, db, `SELECT count(*) FROM otorisasi_kartu WHERE id_penerbit = $1 AND status = 'ditolak'`, in.IDPenerbit); n != 1 {
		t.Fatalf("%d baris ditolak, harus 1", n)
	}
}

// Kartu atau akun yang dibekukan menolak; token yang tidak dikenal menolak tanpa baris; batas harian kartu dijaga.
func TestOtorisasiDitolak(t *testing.T) {
	svc, db := svcKartu(t, Dep{})
	ctx := context.Background()
	akun := pemakaiBaru(t, db, "terverifikasi", 500_000)

	beku := kartuTes(t, db, akun, "dibekukan", 500_000)
	if k, _ := svc.Otorisasi(ctx, PermintaanOtorisasi{IDPenerbit: idOtorisasi(), Token: beku, Jumlah: 10_000}); k.Alasan != "kartu-dibekukan" {
		t.Fatalf("kartu dibekukan: %+v", k)
	}

	akunBeku := pemakaiBaru(t, db, "terverifikasi", 500_000)
	tokenAkunBeku := kartuTes(t, db, akunBeku, "aktif", 500_000)
	if _, err := db.Exec(`UPDATE akun SET status = 'dibekukan' WHERE id = $1`, akunBeku); err != nil {
		t.Fatal(err)
	}
	if k, _ := svc.Otorisasi(ctx, PermintaanOtorisasi{IDPenerbit: idOtorisasi(), Token: tokenAkunBeku, Jumlah: 10_000}); k.Alasan != "kartu-dibekukan" {
		t.Fatalf("akun dibekukan: %+v", k)
	}
	if s := saldo(t, db, akunBeku); s != 500_000 {
		t.Fatalf("saldo akun dibekukan %d, harus tetap 500000", s)
	}

	idTakDikenal := idOtorisasi()
	if k, _ := svc.Otorisasi(ctx, PermintaanOtorisasi{IDPenerbit: idTakDikenal, Token: "tok_tidak_ada", Jumlah: 10_000}); k.Alasan != "kartu-tidak-dikenal" {
		t.Fatalf("token tidak dikenal: %+v", k)
	}
	if n := hitungKartu(t, db, `SELECT count(*) FROM otorisasi_kartu WHERE id_penerbit = $1`, idTakDikenal); n != 0 {
		t.Fatalf("token tidak dikenal meninggalkan %d baris", n)
	}

	batas := kartuTes(t, db, akun, "aktif", 100_000)
	k, err := svc.Otorisasi(ctx, PermintaanOtorisasi{IDPenerbit: idOtorisasi(), Token: batas, Jumlah: 60_000})
	harapSetuju(t, k, err)
	if k, _ := svc.Otorisasi(ctx, PermintaanOtorisasi{IDPenerbit: idOtorisasi(), Token: batas, Jumlah: 60_000}); k.Alasan != "batas-harian" {
		t.Fatalf("batas harian kartu: %+v; harus tolak batas-harian", k)
	}
	if s := saldo(t, db, akun); s != 440_000 {
		t.Fatalf("saldo %d, harus 440000 (hanya satu hold Rp60.000)", s)
	}
}

// lock_timeout (ADR 42): transaction lain memegang buku pemilik; otorisasi menjawab tolak (sibuk) dalam batas
// waktu, bukan menunggu sampai lock lepas. Lama menunggu bergantung mesin, jadi diperiksa sebagai batas.
func TestOtorisasiLockTimeoutMenjawabSibuk(t *testing.T) {
	svc, db := svcKartu(t, Dep{LockTimeoutKartu: 300 * time.Millisecond})
	akun := pemakaiBaru(t, db, "terverifikasi", 100_000)
	token := kartuTes(t, db, akun, "aktif", 500_000)
	penahan, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	if _, err := penahan.Exec(`SELECT id FROM buku WHERE akun_id = $1 FOR UPDATE`, akun); err != nil {
		t.Fatal(err)
	}
	lepas := time.AfterFunc(4*time.Second, func() { penahan.Rollback() })
	defer lepas.Stop()

	mulai := time.Now()
	k, err := svc.Otorisasi(context.Background(), PermintaanOtorisasi{IDPenerbit: idOtorisasi(), Token: token, Jumlah: 10_000})
	lama := time.Since(mulai)
	if err != nil || k.Keputusan != "tolak" || k.Alasan != "sibuk" {
		t.Fatalf("keputusan %+v, error %v; harus tolak sibuk", k, err)
	}
	if lama > 2*time.Second { // tenggat penerbit 2 detik; lock_timeout 300 ms
		t.Fatalf("jawaban butuh %s: melewati tenggat penerbit 2 detik", lama)
	}
	penahan.Rollback()
	k, err = svc.Otorisasi(context.Background(), PermintaanOtorisasi{IDPenerbit: idOtorisasi(), Token: token, Jumlah: 10_000})
	harapSetuju(t, k, err)
}

// Kill switch: menolak otorisasi baru tanpa deploy dan tanpa menyentuh database.
func TestKillSwitchMenolakTanpaBaris(t *testing.T) {
	aktif := &atomic.Bool{}
	aktif.Store(true)
	svc, db := svcKartu(t, Dep{KartuAktif: aktif})
	akun := pemakaiBaru(t, db, "terverifikasi", 100_000)
	token := kartuTes(t, db, akun, "aktif", 500_000)
	aktif.Store(false)
	id := idOtorisasi()
	k, err := svc.Otorisasi(context.Background(), PermintaanOtorisasi{IDPenerbit: id, Token: token, Jumlah: 10_000})
	if err != nil || k.Keputusan != "tolak" || k.Alasan != "kill-switch" {
		t.Fatalf("keputusan %+v, error %v; harus tolak kill-switch", k, err)
	}
	if n := hitungKartu(t, db, `SELECT count(*) FROM otorisasi_kartu WHERE id_penerbit = $1`, id); n != 0 {
		t.Fatalf("kill switch meninggalkan %d baris", n)
	}
	aktif.Store(true)
	k, err = svc.Otorisasi(context.Background(), PermintaanOtorisasi{IDPenerbit: id, Token: token, Jumlah: 10_000})
	harapSetuju(t, k, err)
}

// Hold yang sudah dijurnal tetapi barisnya belum tertulis (proses mati di antaranya, ADR 42 dan ADR 37): ulangan
// membawa key yang sama dan mendapat jurnal tahan yang sama, bukan hold kedua.
func TestOtorisasiPulihDariKeyLedger(t *testing.T) {
	svc, db := svcKartu(t, Dep{})
	ctx := context.Background()
	akun := pemakaiBaru(t, db, "terverifikasi", 100_000)
	token := kartuTes(t, db, akun, "aktif", 500_000)
	id := idOtorisasi()
	in := PermintaanOtorisasi{IDPenerbit: id, Token: token, Jumlah: 40_000}
	k, err := svc.Otorisasi(ctx, in)
	harapSetuju(t, k, err)
	var jurnal int64
	if err := db.QueryRow(`SELECT jurnal_tahan_id FROM otorisasi_kartu WHERE id_penerbit = $1`, id).Scan(&jurnal); err != nil {
		t.Fatal(err)
	}
	// Meniru kematian proses: jurnal dan key ledger ada, baris otorisasi belum.
	if _, err := db.Exec(`DELETE FROM otorisasi_kartu WHERE id_penerbit = $1`, id); err != nil {
		t.Fatal(err)
	}
	k, err = svc.Otorisasi(ctx, in)
	harapSetuju(t, k, err)
	if n := hitungKartu(t, db, `SELECT count(*) FROM jurnal WHERE jenis = 'kartu_tahan' AND keterangan LIKE '%' || $1`, id); n != 1 {
		t.Fatalf("%d jurnal tahan, harus 1: ulangan membuat hold kedua", n)
	}
	if j := hitungKartu(t, db, `SELECT jurnal_tahan_id FROM otorisasi_kartu WHERE id_penerbit = $1`, id); j != jurnal {
		t.Fatalf("baris baru menunjuk jurnal %d, harus jurnal tahan semula %d", j, jurnal)
	}
	if s := saldo(t, db, akun); s != 60_000 {
		t.Fatalf("saldo %d, harus 60000", s)
	}
}

func holdBaru(t *testing.T, svc Service, db *sql.DB, akun int64, jumlah int64) (id string) {
	t.Helper()
	token := kartuTes(t, db, akun, "aktif", 5_000_000)
	id = idOtorisasi()
	k, err := svc.Otorisasi(context.Background(), PermintaanOtorisasi{IDPenerbit: id, Token: token, Jumlah: jumlah})
	harapSetuju(t, k, err)
	return id
}

// Clearing memindahkan dana dari dana_tertahan ke settlement_kartu, tidak menyentuh saldo pemilik lagi, dan aman
// diulang. Jumlah lain, otorisasi yang tidak ada, dan otorisasi yang sudah dibalik ditolak.
func TestClearingIdempoten(t *testing.T) {
	svc, db := svcKartu(t, Dep{})
	ctx := context.Background()
	akun := pemakaiBaru(t, db, "terverifikasi", 100_000)
	id := holdBaru(t, svc, db, akun, 70_000)
	tertahan, settlement := saldoSistem(t, db, "dana_tertahan"), saldoSistem(t, db, "settlement_kartu")

	h, err := svc.Clearing(ctx, id, 70_000)
	if err != nil || h.Status != "ditangkap" || h.Jurnal == nil {
		t.Fatalf("clearing: %+v, %v", h, err)
	}
	if d := saldoSistem(t, db, "dana_tertahan") - tertahan; d != -70_000 {
		t.Fatalf("dana_tertahan berubah %d, harus -70000", d)
	}
	if d := saldoSistem(t, db, "settlement_kartu") - settlement; d != 70_000 {
		t.Fatalf("settlement_kartu berubah %d, harus 70000", d)
	}
	if s := saldo(t, db, akun); s != 30_000 {
		t.Fatalf("saldo %d, harus 30000: clearing tidak boleh mengurangi saldo lagi", s)
	}
	h2, err := svc.Clearing(ctx, id, 70_000)
	if err != nil || h2.Jurnal == nil || *h2.Jurnal != *h.Jurnal {
		t.Fatalf("clearing diulang: %+v, %v; harus jurnal yang sama", h2, err)
	}
	if n := hitungKartu(t, db, `SELECT count(*) FROM jurnal WHERE jenis = 'kartu_tangkap' AND keterangan LIKE '%' || $1`, id); n != 1 {
		t.Fatalf("%d jurnal tangkap, harus 1", n)
	}
	var ve ErrValidasi
	if _, err := svc.Clearing(ctx, id, 60_000); !errors.As(err, &ve) {
		t.Fatalf("clearing jumlah lain: %v; harus ErrValidasi", err)
	}
	if _, err := svc.Clearing(ctx, "AUTH-tidak-ada", 1_000); !errors.Is(err, ErrOtorisasiTidakAda) {
		t.Fatalf("clearing tak dikenal: %v", err)
	}
	id2 := holdBaru(t, svc, db, akun, 10_000)
	if _, err := svc.Reversal(ctx, id2); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Clearing(ctx, id2, 10_000); !errors.Is(err, ErrOtorisasiStatus) {
		t.Fatalf("clearing sesudah reversal: %v; harus ErrOtorisasiStatus", err)
	}
}

// Reversal mengembalikan dana lewat jurnal pembalik, sekali saja; sesudah clearing tidak bisa lagi.
func TestReversalIdempoten(t *testing.T) {
	svc, db := svcKartu(t, Dep{})
	ctx := context.Background()
	akun := pemakaiBaru(t, db, "terverifikasi", 100_000)
	id := holdBaru(t, svc, db, akun, 80_000)
	h, err := svc.Reversal(ctx, id)
	if err != nil || h.Status != "dibalik" || h.Jurnal == nil {
		t.Fatalf("reversal: %+v, %v", h, err)
	}
	if s := saldo(t, db, akun); s != 100_000 {
		t.Fatalf("saldo %d, harus kembali 100000", s)
	}
	if h2, err := svc.Reversal(ctx, id); err != nil || h2.Status != "dibalik" || h2.Jurnal != nil {
		t.Fatalf("reversal diulang: %+v, %v; harus dibalik tanpa jurnal baru", h2, err)
	}
	if n := hitungKartu(t, db, `SELECT count(*) FROM jurnal j WHERE j.jenis = 'pembalik' AND j.membalik_jurnal_id =
		(SELECT jurnal_tahan_id FROM otorisasi_kartu WHERE id_penerbit = $1)`, id); n != 1 {
		t.Fatalf("%d jurnal pembalik, harus 1", n)
	}
	id2 := holdBaru(t, svc, db, akun, 5_000)
	if _, err := svc.Clearing(ctx, id2, 5_000); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Reversal(ctx, id2); !errors.Is(err, ErrOtorisasiStatus) {
		t.Fatalf("reversal sesudah clearing: %v; harus ErrOtorisasiStatus", err)
	}
	if _, err := svc.Reversal(ctx, "AUTH-tidak-ada"); !errors.Is(err, ErrOtorisasiTidakAda) {
		t.Fatalf("reversal tak dikenal: %v", err)
	}
}

// Job kedaluwarsa hold: hold yang lewat 7 hari dilepas lewat jurnal pembalik, hold yang belum jatuh tempo tidak
// disentuh, dan dua job bersamaan melepas sekali.
func TestKedaluwarsaHoldDijalankanDuaKali(t *testing.T) {
	svc, db := svcKartu(t, Dep{})
	ctx := context.Background()
	akun := pemakaiBaru(t, db, "terverifikasi", 100_000)
	nanti := svc.DenganJam(func() time.Time { return time.Now().Add(UmurTahanKartu + 24*time.Hour) })
	if _, _, err := nanti.KedaluwarsaHold(ctx); err != nil { // buang hold sisa tes lain supaya hitungan bersih
		t.Fatal(err)
	}
	id := holdBaru(t, svc, db, akun, 60_000)

	if d, l, err := svc.KedaluwarsaHold(ctx); err != nil || d != 0 || l != 0 {
		t.Fatalf("job sebelum jatuh tempo: diperiksa %d, dilepas %d, %v; harus 0 dan 0", d, l, err)
	}
	if s := saldo(t, db, akun); s != 40_000 {
		t.Fatalf("saldo %d: hold yang belum jatuh tempo tidak boleh dilepas", s)
	}

	// Dua job bersamaan, dipaksa bertemu: transaction luar memegang buku pemilik, kedua job berhenti menunggu lock,
	// lalu lock dilepas. Tanpa lock baris otorisasi dan syarat status, job kedua membalik hold yang sudah dibalik.
	penahan, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	if _, err := penahan.Exec(`SELECT id FROM buku WHERE akun_id = $1 FOR UPDATE`, akun); err != nil {
		t.Fatal(err)
	}
	var wg sync.WaitGroup
	var total atomic.Int64
	for range 2 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, l, err := nanti.KedaluwarsaHold(ctx)
			if err != nil {
				t.Errorf("job kedaluwarsa: %v", err)
			}
			total.Add(int64(l))
		}()
	}
	for mulai := time.Now(); hitungKartu(t, db, `SELECT count(*) FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND application_name = 'api-t4-tes' AND (query LIKE '%otorisasi_kartu%' OR query LIKE '%FROM buku%')`) < 2; {
		if time.Since(mulai) > 5*time.Second {
			penahan.Rollback()
			t.Fatal("kedua job tidak sampai menunggu lock dalam 5 detik")
		}
		time.Sleep(20 * time.Millisecond)
	}
	penahan.Rollback()
	wg.Wait()
	if total.Load() != 1 {
		t.Fatalf("dua job bersamaan melepas %d hold, harus 1", total.Load())
	}
	if s := saldo(t, db, akun); s != 100_000 {
		t.Fatalf("saldo %d, harus kembali 100000 (dilepas sekali)", s)
	}
	var status string
	if err := db.QueryRow(`SELECT status FROM otorisasi_kartu WHERE id_penerbit = $1`, id).Scan(&status); err != nil || status != "kedaluwarsa" {
		t.Fatalf("status %q (%v), harus kedaluwarsa", status, err)
	}
	if d, l, err := nanti.KedaluwarsaHold(ctx); err != nil || d != 0 || l != 0 {
		t.Fatalf("job ketiga: diperiksa %d, dilepas %d, %v; harus 0 dan 0", d, l, err)
	}
	if _, err := svc.Reversal(ctx, id); err != nil { // reversal sesudah kedaluwarsa: jawaban yang sama, tanpa jurnal
		t.Fatalf("reversal sesudah kedaluwarsa: %v", err)
	}
}

func TestKunciPenerbit(t *testing.T) {
	svc := Baru(repoKosong(), time.Hour).DenganT4(Dep{KunciPenerbit: "rahasia-lab"})
	if !svc.KunciPenerbitSah("rahasia-lab") {
		t.Fatal("kunci yang benar ditolak")
	}
	for _, salah := range []string{"", "rahasia-lab ", "Rahasia-lab", "rahasia-la"} {
		if svc.KunciPenerbitSah(salah) {
			t.Errorf("kunci %q diterima", salah)
		}
	}
	kosong := Baru(repoKosong(), time.Hour)
	if kosong.KunciPenerbitSah("") || kosong.KunciPenerbitSah("apa-saja") {
		t.Fatal("server tanpa kunci harus menolak semua, termasuk kunci kosong")
	}
}

// Penerbitan kartu: hanya akun terverifikasi yang tidak dibekukan; panggilan ke penerbit di luar transaction;
// penerbit mati tidak meninggalkan baris.
func TestTerbitkanKartu(t *testing.T) {
	penerbitTiruan := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Idempotency-Key") == "" {
			w.WriteHeader(400)
			return
		}
		w.WriteHeader(201)
		fmt.Fprint(w, `{"token":"tok_`+r.Header.Get("Idempotency-Key")+`","empat_digit":"0042"}`)
	}))
	defer penerbitTiruan.Close()
	svc, db := svcKartu(t, Dep{Penerbit: penerbit.Baru(penerbitTiruan.URL, 3*time.Second)})
	ctx := context.Background()

	belum := pemakaiBaru(t, db, "belum", 0)
	if _, err := svc.TerbitkanKartu(ctx, belum); !errors.Is(err, ErrButuhVerifikasi) {
		t.Fatalf("akun belum terverifikasi: %v; harus ErrButuhVerifikasi", err)
	}
	beku := pemakaiBaru(t, db, "terverifikasi", 0)
	if _, err := db.Exec(`UPDATE akun SET status = 'dibekukan' WHERE id = $1`, beku); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.TerbitkanKartu(ctx, beku); !errors.Is(err, ErrDibekukan) {
		t.Fatalf("akun dibekukan: %v; harus ErrDibekukan", err)
	}
	ok := pemakaiBaru(t, db, "terverifikasi", 0)
	k, err := svc.TerbitkanKartu(ctx, ok)
	if err != nil || k.EmpatDigit != "0042" || k.Status != "aktif" || k.BatasHarian != 500_000 {
		t.Fatalf("kartu %+v, %v", k, err)
	}
	if n := hitungKartu(t, db, `SELECT count(*) FROM kartu WHERE akun_id = $1`, ok); n != 1 {
		t.Fatalf("%d kartu, harus 1", n)
	}
	penerbitTiruan.Close()
	mati := pemakaiBaru(t, db, "terverifikasi", 0)
	if _, err := svc.TerbitkanKartu(ctx, mati); !errors.Is(err, ErrKartuPenerbit) {
		t.Fatalf("penerbit mati: %v; harus ErrKartuPenerbit", err)
	}
	if n := hitungKartu(t, db, `SELECT count(*) FROM kartu WHERE akun_id = $1`, mati); n != 0 {
		t.Fatalf("penerbit mati meninggalkan %d kartu", n)
	}
	tanpa := Baru(svc.repo, time.Hour) // tanpa penerbit terpasang
	if _, err := tanpa.TerbitkanKartu(ctx, ok); !errors.Is(err, ErrKartuPenerbit) {
		t.Fatalf("tanpa penerbit: %v", err)
	}
}

// Bekukan dan buka dari app: milik orang lain 404, kartu ditutup tidak bisa dibuka, akun dibekukan tidak bisa membuka.
func TestUbahStatusKartu(t *testing.T) {
	svc, db := svcKartu(t, Dep{})
	ctx := context.Background()
	akun := pemakaiBaru(t, db, "terverifikasi", 0)
	lain := pemakaiBaru(t, db, "terverifikasi", 0)
	kartuTes(t, db, akun, "aktif", 500_000)
	daftar, err := svc.DaftarKartu(ctx, akun)
	if err != nil || len(daftar) != 1 {
		t.Fatalf("daftar %+v, %v", daftar, err)
	}
	id := daftar[0].ID
	if _, err := svc.UbahStatusKartu(ctx, lain, id, "dibekukan"); !errors.Is(err, ErrKartuTidakAda) {
		t.Fatalf("kartu orang lain: %v; harus ErrKartuTidakAda", err)
	}
	if k, err := svc.UbahStatusKartu(ctx, akun, id, "dibekukan"); err != nil || k.Status != "dibekukan" {
		t.Fatalf("bekukan: %+v, %v", k, err)
	}
	if k, err := svc.UbahStatusKartu(ctx, akun, id, "aktif"); err != nil || k.Status != "aktif" {
		t.Fatalf("buka: %+v, %v", k, err)
	}
	if _, err := db.Exec(`UPDATE kartu SET status = 'ditutup' WHERE id = $1`, id); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.UbahStatusKartu(ctx, akun, id, "aktif"); !errors.Is(err, ErrKartuStatus) {
		t.Fatalf("buka kartu ditutup: %v; harus ErrKartuStatus", err)
	}
}
