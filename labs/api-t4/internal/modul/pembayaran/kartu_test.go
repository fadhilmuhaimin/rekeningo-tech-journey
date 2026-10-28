package pembayaran_test

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"lab/apit4/internal/modul/ledger"
	"lab/apit4/internal/modul/pembayaran"
)

// Tes otorisasi kartu di service pembayaran (ADR 42 dan ADR 37, lab t4-kartu) dengan PostgreSQL sungguhan dan API
// ledger sungguhan (server httptest): hold lewat Idempotency-Key = id_penerbit, baris otorisasi sesudahnya, jawaban
// untuk tiap keadaan ledger, dan proses yang mati di antara hold dan baris.

// penahanHitung meneruskan ke ledger.Klien, menghitung panggilannya, dan boleh diganti jawabannya.
type penahanHitung struct {
	dalam *ledger.Klien
	n     atomic.Int32
	ganti func() error // bila tidak nil dan mengembalikan galat, galat itu menggantikan panggilan ke ledger
}

func (p *penahanHitung) TahanKartu(ctx context.Context, kunci string, r ledger.PermintaanTahan) (ledger.Hasil, error) {
	p.n.Add(1)
	if p.ganti != nil {
		if err := p.ganti(); err != nil {
			return ledger.Hasil{}, err
		}
	}
	return p.dalam.TahanKartu(ctx, kunci, r)
}

var urutKartu atomic.Int64

type kartuLingkungan struct {
	*lingkungan
	pen *penahanHitung
}

func siapkanKartu(t *testing.T) *kartuLingkungan {
	t.Helper()
	l := siapkan(t)
	pen := &penahanHitung{dalam: ledger.Baru(l.srv.URL, kunciLedger, 3*time.Second)}
	l.p.Penahan = pen
	return &kartuLingkungan{lingkungan: l, pen: pen}
}

// kartuBaru: akun dengan saldo (diisi lewat API ledger) dan satu kartu aktif.
func (l *kartuLingkungan) kartuBaru(t *testing.T, saldo, batas int64) (akun int64, token string) {
	t.Helper()
	akun = l.akun(t, "terverifikasi")
	order := fmt.Sprintf("TB-kartu-%d-%d", time.Now().UnixNano(), urutKartu.Add(1))
	if _, err := l.ledger.dalam.KreditTopup(t.Context(), order, ledger.Permintaan{OrderID: order, AkunID: akun, Jumlah: saldo}); err != nil {
		t.Fatal(err)
	}
	token = fmt.Sprintf("tok_mod_%d_%d", akun, urutKartu.Add(1))
	if _, err := l.db.Exec(`INSERT INTO kartu (akun_id, token_penerbit, empat_digit, status, batas_harian) VALUES ($1, $2, '4242', 'aktif', $3)`,
		akun, token, batas); err != nil {
		t.Fatal(err)
	}
	return akun, token
}

func idKartu() string { return fmt.Sprintf("AUTH-mod-%d-%d", time.Now().UnixNano(), urutKartu.Add(1)) }

func (l *kartuLingkungan) otorisasi(id, token string, jumlah int64) (pembayaran.Keputusan, error) {
	return l.p.Otorisasi(context.Background(), pembayaran.PermintaanOtorisasi{IDPenerbit: id, Token: token, Jumlah: jumlah})
}

func (l *kartuLingkungan) hitung(t *testing.T, q string, arg ...any) int64 {
	t.Helper()
	var n int64
	if err := l.db.QueryRow(q, arg...).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func (l *kartuLingkungan) baris(t *testing.T, id string) (status string, jurnal sql.NullInt64, tahanSampai sql.NullTime, ada bool) {
	t.Helper()
	err := l.db.QueryRow(`SELECT status, jurnal_tahan_id, tahan_sampai FROM otorisasi_kartu WHERE id_penerbit = $1`, id).Scan(&status, &jurnal, &tahanSampai)
	if errors.Is(err, sql.ErrNoRows) {
		return "", jurnal, tahanSampai, false
	}
	if err != nil {
		t.Fatal(err)
	}
	return status, jurnal, tahanSampai, true
}

func harapKeputusan(t *testing.T, k pembayaran.Keputusan, err error, keputusan, alasan string) {
	t.Helper()
	if err != nil || k.Keputusan != keputusan || k.Alasan != alasan {
		t.Fatalf("keputusan %+v, error %v; harus %s %q", k, err, keputusan, alasan)
	}
}

func TestKartuOtorisasiMenahanLewatLedgerLaluMenulisBaris(t *testing.T) {
	l := siapkanKartu(t)
	akun, token := l.kartuBaru(t, 100_000, 500_000)
	tetap := time.Date(2026, 10, 1, 12, 0, 0, 0, time.UTC)
	l.p.Kini = func() time.Time { return tetap }
	id := idKartu()
	k, err := l.otorisasi(id, token, 80_000)
	harapKeputusan(t, k, err, "setuju", "")
	if n := l.pen.n.Load(); n != 1 {
		t.Fatalf("%d panggilan ke ledger, harus 1", n)
	}
	if s := l.saldo(t, akun); s != 20_000 {
		t.Fatalf("saldo %d, harus 20000", s)
	}
	status, jurnal, sampai, ada := l.baris(t, id)
	if !ada || status != "ditahan" || !jurnal.Valid {
		t.Fatalf("baris %q jurnal %v ada=%v; harus ditahan dengan jurnal", status, jurnal, ada)
	}
	if want := tetap.Add(pembayaran.UmurTahanKartu); !sampai.Valid || !sampai.Time.Equal(want) {
		t.Fatalf("tahan_sampai %v, harus %v (7 hari)", sampai.Time, want)
	}
	if pembayaran.UmurTahanKartu != 7*24*time.Hour {
		t.Fatalf("UmurTahanKartu %v, harus 7 hari", pembayaran.UmurTahanKartu)
	}
}

func TestKartuIDSamaDuaKaliSatuHoldTanpaPanggilanLedgerKedua(t *testing.T) {
	l := siapkanKartu(t)
	akun, token := l.kartuBaru(t, 100_000, 500_000)
	id := idKartu()
	k, err := l.otorisasi(id, token, 80_000)
	harapKeputusan(t, k, err, "setuju", "")
	k, err = l.otorisasi(id, token, 80_000)
	harapKeputusan(t, k, err, "setuju", "")
	if n := l.pen.n.Load(); n != 1 {
		t.Fatalf("%d panggilan ke ledger, harus 1 (ulangan dijawab dari baris)", n)
	}
	if n := l.hitung(t, `SELECT count(*) FROM jurnal WHERE jenis = 'kartu_tahan' AND dibuat_oleh = $1`, akun); n != 1 {
		t.Fatalf("%d jurnal kartu_tahan, harus 1", n)
	}
}

func TestKartuIDSamaSerentakSatuHoldSatuBaris(t *testing.T) {
	l := siapkanKartu(t)
	akun, token := l.kartuBaru(t, 100_000, 500_000)
	id := idKartu()
	const n = 6
	k := make([]pembayaran.Keputusan, n)
	e := make([]error, n)
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			k[i], e[i] = l.otorisasi(id, token, 30_000)
		}()
	}
	wg.Wait()
	for i := range k {
		harapKeputusan(t, k[i], e[i], "setuju", "")
	}
	if c := l.hitung(t, `SELECT count(*) FROM otorisasi_kartu WHERE id_penerbit = $1`, id); c != 1 {
		t.Fatalf("%d baris, harus 1", c)
	}
	if c := l.hitung(t, `SELECT count(*) FROM jurnal WHERE jenis = 'kartu_tahan' AND dibuat_oleh = $1`, akun); c != 1 {
		t.Fatalf("%d jurnal kartu_tahan, harus 1", c)
	}
	if s := l.saldo(t, akun); s != 70_000 {
		t.Fatalf("saldo %d, harus 70000", s)
	}
}

func TestKartuSaldoKurangDitolakDanDiulangTanpaLedger(t *testing.T) {
	l := siapkanKartu(t)
	_, token := l.kartuBaru(t, 50_000, 500_000)
	id := idKartu()
	k, err := l.otorisasi(id, token, 50_001)
	harapKeputusan(t, k, err, "tolak", "saldo-kurang")
	if status, _, _, ada := l.baris(t, id); !ada || status != "ditolak" {
		t.Fatalf("baris %q ada=%v; harus ditolak", status, ada)
	}
	k, err = l.otorisasi(id, token, 50_001)
	harapKeputusan(t, k, err, "tolak", "ditolak-sebelumnya")
	if n := l.pen.n.Load(); n != 1 {
		t.Fatalf("%d panggilan ke ledger, harus 1", n)
	}
	k, err = l.otorisasi(idKartu(), token, 50_000) // tepat sama dengan saldo
	harapKeputusan(t, k, err, "setuju", "")
}

func TestKartuDibekukanDanBatasHarianTanpaLedger(t *testing.T) {
	l := siapkanKartu(t)
	_, token := l.kartuBaru(t, 1_000_000, 100_000)
	k, err := l.otorisasi(idKartu(), token, 60_000)
	harapKeputusan(t, k, err, "setuju", "")
	k, err = l.otorisasi(idKartu(), token, 40_001) // 60.000 + 40.001 melewati 100.000
	harapKeputusan(t, k, err, "tolak", "batas-harian")
	k, err = l.otorisasi(idKartu(), token, 40_000) // tepat di batas: lolos
	harapKeputusan(t, k, err, "setuju", "")
	if n := l.pen.n.Load(); n != 2 {
		t.Fatalf("%d panggilan ke ledger, harus 2 (penolakan batas harian tidak memanggil ledger)", n)
	}
	if _, err := l.db.Exec(`UPDATE kartu SET status = 'dibekukan' WHERE token_penerbit = $1`, token); err != nil {
		t.Fatal(err)
	}
	k, err = l.otorisasi(idKartu(), token, 1_000)
	harapKeputusan(t, k, err, "tolak", "kartu-dibekukan")
	if n := l.pen.n.Load(); n != 2 {
		t.Fatalf("%d panggilan ke ledger sesudah pembekuan, harus tetap 2", n)
	}
}

func TestKartuKillSwitchTanpaBarisDanTanpaLedger(t *testing.T) {
	l := siapkanKartu(t)
	_, token := l.kartuBaru(t, 100_000, 500_000)
	aktif := &atomic.Bool{}
	l.p.KartuAktif = aktif
	id := idKartu()
	k, err := l.otorisasi(id, token, 10_000)
	harapKeputusan(t, k, err, "tolak", "kill-switch")
	if _, _, _, ada := l.baris(t, id); ada || l.pen.n.Load() != 0 {
		t.Fatalf("kill switch mati: baris ada=%v, panggilan ledger %d; harus tanpa keduanya", ada, l.pen.n.Load())
	}
	aktif.Store(true)
	k, err = l.otorisasi(id, token, 10_000)
	harapKeputusan(t, k, err, "setuju", "")
}

func TestKartuTokenTidakDikenalDanValidasi(t *testing.T) {
	l := siapkanKartu(t)
	id := idKartu()
	k, err := l.otorisasi(id, "tok_tidak_ada", 1_000)
	harapKeputusan(t, k, err, "tolak", "kartu-tidak-dikenal")
	if _, _, _, ada := l.baris(t, id); ada {
		t.Fatal("kartu tak dikenal tidak boleh punya baris (kartu_id wajib)")
	}
	for nama, in := range map[string]pembayaran.PermintaanOtorisasi{
		"id kosong":      {IDPenerbit: "", Token: "t", Jumlah: 1},
		"id 65":          {IDPenerbit: strings.Repeat("a", 65), Token: "t", Jumlah: 1},
		"token 129":      {IDPenerbit: "a", Token: strings.Repeat("t", 129), Jumlah: 1},
		"id NUL":         {IDPenerbit: "AUTH-\x00x", Token: "t", Jumlah: 1},
		"id UTF-8 rusak": {IDPenerbit: "AUTH-\xff\xfe", Token: "t", Jumlah: 1},
		"id baris baru":  {IDPenerbit: "A\nB", Token: "t", Jumlah: 1},
		"token NUL":      {IDPenerbit: "a", Token: "tok\x00en", Jumlah: 1},
		"token kosong":   {IDPenerbit: "a", Token: "", Jumlah: 1},
		"jumlah 0":       {IDPenerbit: "a", Token: "t", Jumlah: 0},
		"jumlah besar":   {IDPenerbit: "a", Token: "t", Jumlah: pembayaran.MaksJumlahKartu + 1},
	} {
		if _, err := l.p.Otorisasi(context.Background(), in); !errors.Is(err, pembayaran.ErrKartuValidasi) {
			t.Fatalf("%s: %v; harus ErrKartuValidasi", nama, err)
		}
	}
	if n := l.pen.n.Load(); n != 0 {
		t.Fatalf("%d panggilan ledger untuk permintaan salah, harus 0", n)
	}
}

func TestKartuIDDipakaiUntukOtorisasiLainDitolak(t *testing.T) {
	l := siapkanKartu(t)
	_, token := l.kartuBaru(t, 100_000, 500_000)
	_, token2 := l.kartuBaru(t, 100_000, 500_000)
	id := idKartu()
	if k, err := l.otorisasi(id, token, 10_000); err != nil || k.Keputusan != "setuju" {
		t.Fatalf("%+v %v", k, err)
	}
	if _, err := l.otorisasi(id, token, 10_001); !errors.Is(err, pembayaran.ErrOtorisasiBeda) {
		t.Fatalf("jumlah lain: %v; harus ErrOtorisasiBeda", err)
	}
	if _, err := l.otorisasi(id, token2, 10_000); !errors.Is(err, pembayaran.ErrOtorisasiBeda) {
		t.Fatalf("kartu lain: %v; harus ErrOtorisasiBeda", err)
	}
	// Ledger menolak key yang dipakai permintaan lain (baris belum ada, key hidup): pemetaan yang sama.
	id2 := idKartu()
	l.pen.ganti = func() error { return ledger.Penolakan{Alasan: "key-dipakai-permintaan-lain"} }
	if _, err := l.otorisasi(id2, token, 10_000); !errors.Is(err, pembayaran.ErrOtorisasiBeda) {
		t.Fatalf("key bentrok di ledger: %v; harus ErrOtorisasiBeda", err)
	}
}

func TestKartuLedgerSibukDanTidakMenjawabDitolakTanpaBaris(t *testing.T) {
	l := siapkanKartu(t)
	_, token := l.kartuBaru(t, 100_000, 500_000)
	id := idKartu()
	l.pen.ganti = func() error { return ledger.ErrSibuk }
	k, err := l.otorisasi(id, token, 10_000)
	harapKeputusan(t, k, err, "tolak", "sibuk")
	id2 := idKartu()
	l.pen.ganti = func() error { return fmt.Errorf("%w: timeout", ledger.ErrTidakPasti) }
	k, err = l.otorisasi(id2, token, 10_000)
	harapKeputusan(t, k, err, "tolak", "ledger-tidak-menjawab")
	for _, x := range []string{id, id2} {
		if _, _, _, ada := l.baris(t, x); ada {
			t.Fatalf("%s: tidak boleh ada baris bila ledger sibuk atau tidak menjawab", x)
		}
	}
	l.pen.ganti = nil
	k, err = l.otorisasi(id, token, 10_000)
	harapKeputusan(t, k, err, "setuju", "")
}

// Proses mati sesudah ledger menahan dan sebelum baris ditulis: hold ada tanpa baris. Ulangan penerbit dengan id yang
// sama mendapat hold yang sama (key ledger) dan baris ditulis; hold yang tidak pernah diulang tetap yatim.
func TestKartuMatiSesudahLedgerPulihLewatUlanganPenerbit(t *testing.T) {
	l := siapkanKartu(t)
	akun, token := l.kartuBaru(t, 100_000, 500_000)
	id, yatim := idKartu(), idKartu()
	l.p.TitikGagal = func(titik string) {
		if titik == "sesudah-ledger" {
			panic("proses mati")
		}
	}
	mati := func(id string) (m bool) {
		defer func() { m = recover() != nil }()
		l.otorisasi(id, token, 30_000)
		return false
	}
	if !mati(id) || !mati(yatim) {
		t.Fatal("titik sesudah-ledger tidak tercapai")
	}
	l.p.TitikGagal = nil
	jurnalTanpaBaris := func() int64 {
		return l.hitung(t, `SELECT count(*) FROM jurnal j WHERE j.jenis = 'kartu_tahan' AND j.dibuat_oleh = $1
			AND NOT EXISTS (SELECT 1 FROM otorisasi_kartu o WHERE o.jurnal_tahan_id = j.id)`, akun)
	}
	if n := jurnalTanpaBaris(); n != 2 {
		t.Fatalf("%d hold tanpa baris, harus 2", n)
	}
	if s := l.saldo(t, akun); s != 40_000 {
		t.Fatalf("saldo %d, harus 40000 (dua hold Rp30.000 sudah di ledger)", s)
	}
	k, err := l.otorisasi(id, token, 30_000) // ulangan penerbit
	harapKeputusan(t, k, err, "setuju", "")
	if n := l.hitung(t, `SELECT count(*) FROM jurnal WHERE jenis = 'kartu_tahan' AND dibuat_oleh = $1`, akun); n != 2 {
		t.Fatalf("%d jurnal kartu_tahan, harus tetap 2 (ulangan tidak menahan lagi)", n)
	}
	if n := jurnalTanpaBaris(); n != 1 {
		t.Fatalf("%d hold tanpa baris, harus 1 (yang tidak diulang)", n)
	}
	if status, _, _, ada := l.baris(t, id); !ada || status != "ditahan" {
		t.Fatalf("baris %q ada=%v; harus ditahan", status, ada)
	}
}

// Batas harian dibaca sebelum hold dan tanpa lock: dua otorisasi serentak yang masing-masing di bawah batas dan
// bersama di atasnya sama-sama disetujui. Versi satu proses memeriksanya sesudah lock buku, jadi yang kedua ditolak.
// Tes ini menjaga celah itu tetap tercatat (README lab): bila suatu hari tertutup, tes ini gagal dan README berubah.
func TestKartuBatasHarianDuaSerentakKeduanyaLolosDiJalurDuaService(t *testing.T) {
	l := siapkanKartu(t)
	_, token := l.kartuBaru(t, 1_000_000, 100_000)
	// Gerbang di titik sesudah-ledger: dua permintaan sama-sama sudah lolos cek batas dan sudah menahan di ledger
	// sebelum salah satunya menulis baris.
	var sampai sync.WaitGroup
	sampai.Add(2)
	gerbang := make(chan struct{})
	l.p.TitikGagal = func(titik string) {
		if titik == "sesudah-ledger" {
			sampai.Done()
			<-gerbang
		}
	}
	k := make([]pembayaran.Keputusan, 2)
	e := make([]error, 2)
	var wg sync.WaitGroup
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			k[i], e[i] = l.otorisasi(idKartu(), token, 60_000)
		}()
	}
	sampai.Wait()
	close(gerbang)
	wg.Wait()
	for i := range k {
		harapKeputusan(t, k[i], e[i], "setuju", "")
	}
	if jumlah := l.hitung(t, `SELECT sum(o.jumlah) FROM otorisasi_kartu o JOIN kartu c ON c.id = o.kartu_id WHERE c.token_penerbit = $1`, token); jumlah != 120_000 {
		t.Fatalf("jumlah disetujui %d, harus 120000 (di atas batas harian 100000)", jumlah)
	}
}

// Penerbit memutus koneksi (tenggat lewat) tepat sesudah ledger menahan: konteks permintaan dibatalkan, tetapi baris
// otorisasi tetap ditulis, karena tanpa baris tidak ada yang bisa mengedaluwarsakan hold itu.
func TestKartuBarisTetapDitulisBilaPenerbitSudahPergi(t *testing.T) {
	l := siapkanKartu(t)
	akun, token := l.kartuBaru(t, 100_000, 500_000)
	ctx, batal := context.WithCancel(context.Background())
	defer batal()
	l.p.TitikGagal = func(titik string) {
		if titik == "sesudah-ledger" {
			batal()
		}
	}
	id := idKartu()
	k, err := l.p.Otorisasi(ctx, pembayaran.PermintaanOtorisasi{IDPenerbit: id, Token: token, Jumlah: 30_000})
	harapKeputusan(t, k, err, "setuju", "")
	if status, jurnal, _, ada := l.baris(t, id); !ada || status != "ditahan" || !jurnal.Valid {
		t.Fatalf("baris %q jurnal %v ada=%v; harus ditahan dengan jurnal walau konteks dibatalkan", status, jurnal, ada)
	}
	if s := l.saldo(t, akun); s != 70_000 {
		t.Fatalf("saldo %d, harus 70000", s)
	}
}

// Dua permintaan dengan id yang sama sama-sama sudah mendapat hold (jawaban 200 ulang dari ledger) sebelum salah
// satunya menulis baris: yang kedua tidak boleh gagal di UNIQUE (id_penerbit maupun jurnal_tahan_id, karena jurnal tahan
// yang sama) dan tidak boleh menulis baris kedua. Gerbang di titik sesudah-ledger membuat keduanya bertemu di sana tanpa
// jeda tetap. Jendela balapan di dalam PostgreSQL (urutan penyisipan ke indeks UNIQUE) sempit, jadi skenario diulang 40
// kali dengan id baru; satu kegagalan menggagalkan tes.
func TestKartuIDSamaDiTitikSesudahLedgerSatuBarisDuaJawabanSetuju(t *testing.T) {
	l := siapkanKartu(t)
	akun, token := l.kartuBaru(t, 100_000, 500_000)
	const putaran = 40
	for i := 0; i < putaran; i++ {
		var sampai sync.WaitGroup
		sampai.Add(2)
		gerbang := make(chan struct{})
		l.p.TitikGagal = func(titik string) {
			if titik == "sesudah-ledger" {
				sampai.Done()
				<-gerbang
			}
		}
		id := idKartu()
		k := make([]pembayaran.Keputusan, 2)
		e := make([]error, 2)
		var wg sync.WaitGroup
		for j := 0; j < 2; j++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				k[j], e[j] = l.otorisasi(id, token, 1_000)
			}()
		}
		sampai.Wait()
		close(gerbang)
		wg.Wait()
		for j := range k {
			harapKeputusan(t, k[j], e[j], "setuju", "")
		}
		if c := l.hitung(t, `SELECT count(*) FROM otorisasi_kartu WHERE id_penerbit = $1`, id); c != 1 {
			t.Fatalf("putaran %d: %d baris, harus 1", i, c)
		}
	}
	if c := l.hitung(t, `SELECT count(*) FROM jurnal WHERE jenis = 'kartu_tahan' AND dibuat_oleh = $1`, akun); c != putaran {
		t.Fatalf("%d jurnal kartu_tahan, harus %d (satu per id)", c, putaran)
	}
}

// Dua permintaan dengan id yang sama sama-sama belum melihat baris. Yang satu menahan dana dan menulis baris `ditahan`;
// yang lain baru memeriksa batas harian sesudahnya, sehingga jumlah yang baru ditahan ikut terhitung dan 300.000 +
// 300.000 melewati batas 500.000. Tanpa penanganan, yang kedua dijawab tolak sedangkan yang pertama setuju dan dana
// tertahan tujuh hari: satu id, dua jawaban. Yang tercatat harus yang berlaku. Dua gerbang di titik `sebelum-batas`
// memaksa urutannya: yang pertama menunggu sampai kembarannya sudah membaca baris, lalu berjalan sampai selesai;
// yang kedua menunggu yang pertama selesai.
func TestKartuIDSamaBatasHarianDiperiksaSesudahBarisPertamaDijawabSama(t *testing.T) {
	l := siapkanKartu(t)
	akun, token := l.kartuBaru(t, 1_000_000, 500_000)
	id := idKartu()
	var tiba atomic.Int32
	keduaTiba := make(chan struct{})
	pertamaSelesai := make(chan struct{})
	var sekali sync.Once
	l.p.TitikGagal = func(titik string) {
		if titik != "sebelum-batas" {
			return
		}
		switch tiba.Add(1) {
		case 1:
			<-keduaTiba
		case 2:
			close(keduaTiba)
			<-pertamaSelesai
		}
	}
	k := make([]pembayaran.Keputusan, 2)
	e := make([]error, 2)
	var wg sync.WaitGroup
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			k[i], e[i] = l.otorisasi(id, token, 300_000)
			sekali.Do(func() { close(pertamaSelesai) })
		}()
	}
	wg.Wait()
	if n := tiba.Load(); n != 2 {
		t.Fatalf("%d permintaan sampai di titik sebelum-batas, harus 2", n)
	}
	for i := range k {
		harapKeputusan(t, k[i], e[i], "setuju", "")
	}
	if c := l.hitung(t, `SELECT count(*) FROM otorisasi_kartu WHERE id_penerbit = $1 AND status = 'ditahan'`, id); c != 1 {
		t.Fatalf("%d baris ditahan, harus 1", c)
	}
	if c := l.hitung(t, `SELECT count(*) FROM jurnal WHERE jenis = 'kartu_tahan' AND dibuat_oleh = $1`, akun); c != 1 {
		t.Fatalf("%d jurnal kartu_tahan, harus 1", c)
	}
}

// Dua penolakan untuk id yang sama bertemu di penulisan baris: yang kedua tidak boleh gagal di UNIQUE id_penerbit
// (ON CONFLICT DO NOTHING) dan tetap dijawab tolak, dengan satu baris saja. Gerbang di panggilan ke ledger memastikan
// keduanya sudah membaca baris (tidak ada) sebelum salah satunya menulis.
func TestKartuDuaPenolakanSerentakUntukIDSamaSatuBaris(t *testing.T) {
	l := siapkanKartu(t)
	_, token := l.kartuBaru(t, 1_000_000, 500_000)
	var sampai sync.WaitGroup
	sampai.Add(2)
	l.pen.ganti = func() error {
		sampai.Done()
		sampai.Wait()
		return ledger.Penolakan{Alasan: "saldo-kurang"}
	}
	id := idKartu()
	k := make([]pembayaran.Keputusan, 2)
	e := make([]error, 2)
	var wg sync.WaitGroup
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			k[i], e[i] = l.otorisasi(id, token, 10_000)
		}()
	}
	wg.Wait()
	for i := range k {
		harapKeputusan(t, k[i], e[i], "tolak", "saldo-kurang")
	}
	if c := l.hitung(t, `SELECT count(*) FROM otorisasi_kartu WHERE id_penerbit = $1 AND status = 'ditolak'`, id); c != 1 {
		t.Fatalf("%d baris ditolak, harus 1", c)
	}
}

// Akun dibekukan sesudah kartu terbit: kartu masih aktif, jadi pembayaran baru tahu dari ledger (422 akun-dibekukan).
// Jawabannya tolak dengan alasan yang sama dengan kartu dibekukan, satu baris ditolak, tanpa hold.
func TestKartuAkunDibekukanDiLedgerDitolakTanpaHold(t *testing.T) {
	l := siapkanKartu(t)
	akun, token := l.kartuBaru(t, 100_000, 500_000)
	if _, err := l.db.Exec(`UPDATE akun SET status = 'dibekukan' WHERE id = $1`, akun); err != nil {
		t.Fatal(err)
	}
	id := idKartu()
	k, err := l.otorisasi(id, token, 10_000)
	harapKeputusan(t, k, err, "tolak", "kartu-dibekukan")
	if status, jurnal, _, ada := l.baris(t, id); !ada || status != "ditolak" || jurnal.Valid {
		t.Fatalf("baris %q jurnal %v ada=%v; harus ditolak tanpa jurnal", status, jurnal, ada)
	}
	if n := l.pen.n.Load(); n != 1 {
		t.Fatalf("%d panggilan ke ledger, harus 1 (pembekuan akun hanya diketahui ledger)", n)
	}
	if s := l.saldo(t, akun); s != 100_000 {
		t.Fatalf("saldo %d, harus tetap 100000", s)
	}
}

// Batas harian menghitung otorisasi yang ditahan dan yang sudah ditagih, bukan yang dibalik atau kedaluwarsa. Clearing
// berjalan di monolith, jadi di sini statusnya diubah langsung seperti yang dilakukan clearing. Satu kartu per status,
// supaya otorisasi baru yang disetujui tidak ikut menambah jumlah di kasus berikutnya.
func TestKartuBatasHarianMenghitungYangDitahanDanDitagihBukanYangDilepas(t *testing.T) {
	l := siapkanKartu(t)
	for _, c := range []struct{ status, keputusan, alasan string }{
		{"ditahan", "tolak", "batas-harian"},
		{"ditangkap", "tolak", "batas-harian"},
		{"dibalik", "setuju", ""},
		{"kedaluwarsa", "setuju", ""},
	} {
		_, token := l.kartuBaru(t, 1_000_000, 100_000)
		id := idKartu()
		k, err := l.otorisasi(id, token, 60_000)
		harapKeputusan(t, k, err, "setuju", "")
		if _, err := l.db.Exec(`UPDATE otorisasi_kartu SET status = $2 WHERE id_penerbit = $1`, id, c.status); err != nil {
			t.Fatal(err)
		}
		k, err = l.otorisasi(idKartu(), token, 60_000)
		if err != nil || k.Keputusan != c.keputusan || k.Alasan != c.alasan {
			t.Fatalf("otorisasi pertama %s: keputusan %+v, error %v; harus %s %q", c.status, k, err, c.keputusan, c.alasan)
		}
	}
}

// "Hari ini" adalah hari kalender WIB: yang dibuat 1 detik sesudah 00.00 WIB terhitung, yang dibuat 1 detik sebelumnya
// tidak. Dua kartu dipakai karena batas hari UTC (07.00 WIB) salah ke arah yang berbeda menurut jam tes dijalankan:
// sebelum 07.00 WIB baris kemarin ikut terhitung, sesudahnya baris 00.00:01 WIB tidak.
func TestKartuBatasHarianMemakaiHariKalenderWIB(t *testing.T) {
	l := siapkanKartu(t)
	siapkanBaris := func(token, id string, jumlah int64, selisih string) {
		t.Helper()
		if _, err := l.db.Exec(`INSERT INTO otorisasi_kartu (kartu_id, id_penerbit, jumlah, status, dibuat)
			SELECT id, $2, $3, 'ditahan', date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta' + $4::interval
			FROM kartu WHERE token_penerbit = $1`, token, id, jumlah, selisih); err != nil {
			t.Fatal(err)
		}
	}
	_, hariIni := l.kartuBaru(t, 1_000_000, 100_000)
	siapkanBaris(hariIni, idKartu(), 60_000, "1 second")
	k, err := l.otorisasi(idKartu(), hariIni, 60_000)
	harapKeputusan(t, k, err, "tolak", "batas-harian")
	_, kemarin := l.kartuBaru(t, 1_000_000, 100_000)
	siapkanBaris(kemarin, idKartu(), 60_000, "-1 second")
	k, err = l.otorisasi(idKartu(), kemarin, 60_000)
	harapKeputusan(t, k, err, "setuju", "")
}

// Dua penolakan serentak dengan id yang sama tetapi jumlah berbeda: yang tercatat lebih dulu menang, yang lain
// mendapat ErrOtorisasiBeda (id itu sudah dipakai untuk otorisasi lain), bukan "tolak" biasa.
func TestKartuDuaPenolakanSerentakIDSamaJumlahBedaSatuMenang(t *testing.T) {
	l := siapkanKartu(t)
	_, token := l.kartuBaru(t, 1_000_000, 500_000)
	var sampai sync.WaitGroup
	sampai.Add(2)
	l.pen.ganti = func() error {
		sampai.Done()
		sampai.Wait()
		return ledger.Penolakan{Alasan: "saldo-kurang"}
	}
	id := idKartu()
	k := make([]pembayaran.Keputusan, 2)
	e := make([]error, 2)
	var wg sync.WaitGroup
	for i, jumlah := range []int64{10_000, 20_000} {
		wg.Add(1)
		go func() {
			defer wg.Done()
			k[i], e[i] = l.otorisasi(id, token, jumlah)
		}()
	}
	wg.Wait()
	menang, beda := 0, 0
	for i := range k {
		switch {
		case e[i] == nil && k[i].Keputusan == "tolak" && k[i].Alasan == "saldo-kurang":
			menang++
		case errors.Is(e[i], pembayaran.ErrOtorisasiBeda):
			beda++
		default:
			t.Fatalf("jawaban %d: %+v, %v", i, k[i], e[i])
		}
	}
	if menang != 1 || beda != 1 {
		t.Fatalf("%d tolak dan %d ErrOtorisasiBeda; harus 1 dan 1", menang, beda)
	}
	if c := l.hitung(t, `SELECT count(*) FROM otorisasi_kartu WHERE id_penerbit = $1`, id); c != 1 {
		t.Fatalf("%d baris, harus 1", c)
	}
}

// Id yang sama dari dua kartu milik akun yang sama dengan jumlah yang sama: ledger hanya mengenal akun dan jumlah,
// jadi keduanya mendapat hold yang sama. Di penulisan baris yang kalah mendapat ErrOtorisasiBeda, bukan "setuju" untuk
// kartu yang tidak punya baris (id itu dipakai untuk otorisasi lain).
func TestKartuIDSamaDuaKartuSatuAkunDiTitikSesudahLedgerSatuMenang(t *testing.T) {
	l := siapkanKartu(t)
	akun, token1 := l.kartuBaru(t, 100_000, 500_000)
	token2 := token1 + "_kedua"
	if _, err := l.db.Exec(`INSERT INTO kartu (akun_id, token_penerbit, empat_digit, status, batas_harian) VALUES ($1, $2, '4242', 'aktif', 500000)`, akun, token2); err != nil {
		t.Fatal(err)
	}
	var sampai sync.WaitGroup
	sampai.Add(2)
	gerbang := make(chan struct{})
	l.p.TitikGagal = func(titik string) {
		if titik == "sesudah-ledger" {
			sampai.Done()
			<-gerbang
		}
	}
	id := idKartu()
	k := make([]pembayaran.Keputusan, 2)
	e := make([]error, 2)
	var wg sync.WaitGroup
	for i, token := range []string{token1, token2} {
		wg.Add(1)
		go func() {
			defer wg.Done()
			k[i], e[i] = l.otorisasi(id, token, 20_000)
		}()
	}
	sampai.Wait()
	close(gerbang)
	wg.Wait()
	menang, beda := 0, 0
	for i := range k {
		switch {
		case e[i] == nil && k[i].Keputusan == "setuju":
			menang++
		case errors.Is(e[i], pembayaran.ErrOtorisasiBeda):
			beda++
		default:
			t.Fatalf("jawaban %d: %+v, %v", i, k[i], e[i])
		}
	}
	if menang != 1 || beda != 1 {
		t.Fatalf("%d setuju dan %d ErrOtorisasiBeda; harus 1 dan 1", menang, beda)
	}
	if c := l.hitung(t, `SELECT count(*) FROM jurnal WHERE jenis = 'kartu_tahan' AND dibuat_oleh = $1`, akun); c != 1 {
		t.Fatalf("%d jurnal kartu_tahan, harus 1", c)
	}
}
