package worker

import (
	"context"
	"database/sql"
	"fmt"
	"sync/atomic"
	"testing"
	"time"

	"lab/apit4/internal/lajur"
	"lab/apit4/internal/push"
	"lab/apit4/internal/repo"
	"lab/apit4/internal/verifikasi"
)

// Tes lajur dan breaker (ADR 25, ADR 36, lab t4-integrasi) dengan PostgreSQL sungguhan. Vendor dan layanan push
// adalah server httptest: tiruan lokal. Waktu breaker dipendekkan (150 ms menggantikan 60 detik); bahwa bawaannya 60
// detik diperiksa di internal/lajur dengan jam palsu.

const timeoutBreakerTes = 150 * time.Millisecond

func breakerTes(bawaan bool) *lajur.Breaker {
	return lajur.Baru(repo.TujuanVerifikasi, lajur.Opsi{Timeout: timeoutBreakerTes, Bawaan: bawaan,
		SalahPermintaan: verifikasi.SalahPermintaan, Catat: func(string, ...any) {}})
}

func workerDenganBreaker(r repo.Repo, v *vendorTes, serentak int, b *lajur.Breaker, pushURL string) *Worker {
	k := konfigTes()
	k.Serentak = serentak
	if b != nil {
		k.Breaker = map[string]*lajur.Breaker{repo.TujuanVerifikasi: b}
	}
	return Baru(r, push.Baru(pushURL, time.Second), k).DenganVerifikasi(verifikasi.Baru(v.srv.URL, 400*time.Millisecond))
}

// banyakPengajuan membuat n pengajuan berurutan dan mengembalikan id akunnya.
func banyakPengajuan(t *testing.T, db *sql.DB, n int) []int64 {
	t.Helper()
	var akun []int64
	for i := 0; i < n; i++ {
		a, _ := pengajuan(t, db)
		akun = append(akun, a)
	}
	return akun
}

// percobaanPerAkun: percobaan outbox verifikasi tiap akun, dan jumlah barisnya per status.
func percobaanPerAkun(t *testing.T, db *sql.DB, akun []int64) (percobaan []int, status map[string]int) {
	t.Helper()
	status = map[string]int{}
	for _, a := range akun {
		var s string
		var p int
		if err := db.QueryRow(`SELECT status, percobaan FROM outbox WHERE akun_id = $1`, a).Scan(&s, &p); err != nil {
			t.Fatal(err)
		}
		percobaan = append(percobaan, p)
		status[s]++
	}
	return
}

func jumlah(p []int) (n int) {
	for _, x := range p {
		n += x
	}
	return
}

// putaranSampai menjalankan Putaran (jeda 10 ms di antaranya, melewati backoff 1 ms) sampai kondisi benar.
func putaranSampai(t *testing.T, w *Worker, apa string, kondisi func() bool) {
	t.Helper()
	for i := 0; i < 200; i++ {
		time.Sleep(10 * time.Millisecond)
		if _, err := w.Putaran(context.Background()); err != nil {
			t.Fatal(err)
		}
		if kondisi() {
			return
		}
	}
	t.Fatalf("menunggu %s: lewat 200 putaran", apa)
}

// --8<-- [start:tes-lajur-dijeda]
// Vendor mati: breaker membuka sesudah 6 percobaan gagal berturut-turut (bawaan pustaka). Sesudah itu lajur tidak
// diklaim sama sekali: vendor tidak dihubungi lagi dan percobaan pekerjaan yang menunggu tidak bertambah.
func TestLajurTerbukaTidakMengklaimDanPercobaanTidakNaik(t *testing.T) {
	r, db := siapkan(t)
	v := vendorUji(t)
	v.atur("503", 0)
	akun := banyakPengajuan(t, db, 6)
	b := breakerTes(false)
	w := workerDenganBreaker(r, v, 1, b, "http://127.0.0.1:1")
	putaranSampai(t, w, "breaker terbuka", func() bool { return b.Status() == lajur.Terbuka })

	p, st := percobaanPerAkun(t, db, akun)
	// Satu per satu: pekerjaan pertama memakai kelima percobaannya sebelum pekerjaan kedua mencoba, jadi ia mati dan
	// percobaan keenam (yang membuka breaker) jatuh pada pekerjaan kedua. Selebihnya tidak pernah disentuh.
	if v.n.Load() != 6 || jumlah(p) != 6 || p[0] != 5 || p[1] != 1 || st["mati"] != 1 || st["menunggu"] != 5 {
		t.Fatalf("percobaan %v, status %v, panggilan vendor %d (harus 5,1,0,0,0,0 / 1 mati 5 menunggu / 6 panggilan)", p, st, v.n.Load())
	}

	time.Sleep(timeoutBreakerTes / 3) // masih dalam masa open
	for i := 0; i < 5; i++ {
		h, err := w.Putaran(context.Background())
		if err != nil || h.Diklaim != 0 {
			t.Fatalf("putaran saat lajur dijeda: %+v %v", h, err)
		}
	}
	p2, st2 := percobaanPerAkun(t, db, akun)
	if jumlah(p2) != 6 || st2["menunggu"] != 5 || v.n.Load() != 6 {
		t.Errorf("saat dijeda percobaan berubah: %v, status %v, panggilan vendor %d", p2, st2, v.n.Load())
	}
}

// --8<-- [end:tes-lajur-dijeda]

// Sesudah vendor pulih dan masa open lewat, breaker setengah terbuka: HANYA satu baris diklaim (permintaan percobaan),
// walau kapasitas worker 3. Sukses menutup breaker, dan sisa pekerjaan selesai dengan key idempotensi yang sama.
func TestLajurPulihHanyaSatuPermintaanPercobaanLaluSemuaSelesai(t *testing.T) {
	r, db := siapkan(t)
	v := vendorUji(t)
	v.atur("503", 0)
	akun := banyakPengajuan(t, db, 6)
	b := breakerTes(false)
	w := workerDenganBreaker(r, v, 3, b, "http://127.0.0.1:1")
	putaranSampai(t, w, "breaker terbuka", func() bool { return b.Status() == lajur.Terbuka })
	dipanggil := v.n.Load()

	v.atur("", 0)
	time.Sleep(timeoutBreakerTes + 50*time.Millisecond)
	if b.Status() != lajur.SetengahTerbuka {
		t.Fatalf("status %s, harus half-open sesudah timeout", b.Status())
	}
	h, err := w.Putaran(context.Background())
	if err != nil || h.Diklaim != 1 || h.Terkirim != 1 {
		t.Fatalf("putaran di half-open: %+v %v (harus 1 klaim dan 1 terkirim)", h, err)
	}
	if b.Status() != lajur.Tertutup || v.n.Load() != dipanggil+1 {
		t.Fatalf("sesudah permintaan percobaan sukses: status %s, panggilan %d", b.Status(), v.n.Load()-dipanggil)
	}
	putaranSampai(t, w, "semua selesai", func() bool {
		_, st := percobaanPerAkun(t, db, akun)
		return st["menunggu"] == 0
	})
	_, st := percobaanPerAkun(t, db, akun)
	// Kapasitas 3: enam kegagalan pertama tersebar di tiga pekerjaan (dua percobaan tiap pekerjaan), jadi tidak ada
	// yang mati sebelum breaker terbuka (bandingkan dengan kapasitas 1 di tes pertama).
	if st["terkirim"] != 6 || st["mati"] != 0 {
		t.Errorf("status akhir %v: 6 terkirim, 0 mati", st)
	}
	var lulus int
	db.QueryRow(`SELECT count(*) FROM verifikasi WHERE status = 'lulus' AND akun_id = ANY($1)`, akun).Scan(&lulus)
	if lulus != 6 {
		t.Errorf("verifikasi lulus %d, harus 6", lulus)
	}
}

// Banyak pekerjaan menunggu bersamaan dan kapasitas 4: enam kegagalan pertama tersebar di beberapa pekerjaan, jadi
// tidak ada yang mati; tidak ada pekerjaan yang memakai lebih dari dua percobaan.
func TestLajurBanyakPekerjaanBersamaanTidakAdaYangMati(t *testing.T) {
	r, db := siapkan(t)
	v := vendorUji(t)
	v.atur("503", 0)
	akun := banyakPengajuan(t, db, 8)
	b := breakerTes(false)
	w := workerDenganBreaker(r, v, 4, b, "http://127.0.0.1:1")
	putaranSampai(t, w, "breaker terbuka", func() bool { return b.Status() == lajur.Terbuka })
	p, st := percobaanPerAkun(t, db, akun)
	maks := 0
	for _, x := range p {
		maks = max(maks, x)
	}
	if st["mati"] != 0 || maks > 2 || jumlah(p) < 6 || jumlah(p) > 8 || int(v.n.Load()) != jumlah(p) {
		t.Errorf("percobaan %v, status %v, panggilan vendor %d: tidak boleh ada yang mati, paling banyak 2 per pekerjaan, 6 sampai 8 percobaan", p, st, v.n.Load())
	}
}

// Baris yang diklaim tepat sebelum breaker terbuka: vendor tidak dihubungi, jadi klaim dilepas dan percobaan yang
// dinaikkan klaim itu dikembalikan.
func TestLajurBarisDiklaimSebelumBreakerTerbukaDilepasTanpaMenaikkanPercobaan(t *testing.T) {
	r, db := siapkan(t)
	v := vendorUji(t)
	akun, _ := pengajuan(t, db)
	b := breakerTes(false)
	w := workerDenganBreaker(r, v, 1, b, "http://127.0.0.1:1")
	baris, err := r.KlaimOutboxTujuan(context.Background(), 1, 5*time.Second, true, []string{repo.TujuanVerifikasi})
	if err != nil || len(baris) != 1 || baris[0].Percobaan != 1 {
		t.Fatalf("klaim %v %v", baris, err)
	}
	for i := 0; i < 6; i++ { // breaker terbuka sesudah klaim, sebelum panggilan
		b.Jalankan(func() error { return verifikasi.ErrTidakTersedia })
	}
	if hasil := w.kirimSatu(context.Background(), baris[0]); hasil != "dijeda" {
		t.Fatalf("hasil %q, harus dijeda", hasil)
	}
	var s string
	var p int
	var klaim sql.NullTime
	db.QueryRow(`SELECT status, percobaan, klaim_sampai FROM outbox WHERE akun_id = $1`, akun).Scan(&s, &p, &klaim)
	if s != "menunggu" || p != 0 || klaim.Valid || v.n.Load() != 0 {
		t.Errorf("status %s, percobaan %d, klaim dipegang %t, panggilan vendor %d: harus menunggu, 0, tidak, 0", s, p, klaim.Valid, v.n.Load())
	}
}

// Percobaan tidak pernah turun di bawah nol, dan baris yang sudah selesai tidak disentuh melepas.
func TestLepasOutboxTidakDiBawahNolDanHanyaBarisMenunggu(t *testing.T) {
	r, db := siapkan(t)
	akun, _ := pengajuan(t, db)
	var id int64
	db.QueryRow(`SELECT id FROM outbox WHERE akun_id = $1`, akun).Scan(&id)
	if err := r.LepasOutbox(context.Background(), id); err != nil {
		t.Fatal(err)
	}
	var p int
	db.QueryRow(`SELECT percobaan FROM outbox WHERE id = $1`, id).Scan(&p)
	if p != 0 {
		t.Errorf("percobaan %d, harus tetap 0", p)
	}
	db.Exec(`UPDATE outbox SET status = 'terkirim', percobaan = 3 WHERE id = $1`, id)
	r.LepasOutbox(context.Background(), id)
	db.QueryRow(`SELECT percobaan FROM outbox WHERE id = $1`, id).Scan(&p)
	if p != 3 {
		t.Errorf("baris terkirim berubah: percobaan %d", p)
	}
	db.Exec(`UPDATE outbox SET status = 'mati', percobaan = 5 WHERE id = $1`, id)
	r.LepasOutbox(context.Background(), id)
	db.QueryRow(`SELECT percobaan FROM outbox WHERE id = $1`, id).Scan(&p)
	if p != 5 {
		t.Errorf("baris dead-letter berubah: percobaan %d (hanya baris menunggu yang dilepas)", p)
	}
}

// Permintaan percobaan di half-open adalah percobaan sungguhan: vendor dihubungi dan percobaan pekerjaan yang diklaim
// bertambah. Selama vendor tetap mati, tiap putaran half-open menghabiskan satu percobaan pekerjaan terdepan, jadi
// lima permintaan percobaan mematikan satu pekerjaan (dead-letter) walau lajur dijeda di antaranya. Percobaan tidak
// dihitung hanya selama breaker terbuka (ADR 36); pekerjaan yang menunggu lebih lama dari outage tetap bisa mati.
func TestLajurPermintaanPercobaanSetengahTerbukaMenghabiskanPercobaanPekerjaanTerdepan(t *testing.T) {
	r, db := siapkan(t)
	v := vendorUji(t)
	v.atur("503", 0)
	akun := banyakPengajuan(t, db, 3)
	b := breakerTes(false)
	for i := 0; i < 6; i++ { // breaker terbuka tanpa menyentuh outbox
		b.Jalankan(func() error { return verifikasi.ErrTidakTersedia })
	}
	w := workerDenganBreaker(r, v, 1, b, "http://127.0.0.1:1")
	for probe := 1; probe <= 5; probe++ {
		time.Sleep(timeoutBreakerTes + 50*time.Millisecond)
		if b.Status() != lajur.SetengahTerbuka {
			t.Fatalf("permintaan percobaan %d: status %s, harus half-open", probe, b.Status())
		}
		h, err := w.Putaran(context.Background())
		if err != nil || h.Diklaim != 1 || b.Status() != lajur.Terbuka {
			t.Fatalf("permintaan percobaan %d: %+v %v, status %s (harus 1 klaim dan breaker terbuka lagi)", probe, h, err, b.Status())
		}
	}
	p, st := percobaanPerAkun(t, db, akun)
	if p[0] != 5 || p[1] != 0 || p[2] != 0 || st["mati"] != 1 || st["menunggu"] != 2 || v.n.Load() != 5 {
		t.Errorf("percobaan %v, status %v, panggilan vendor %d: lima permintaan percobaan yang gagal mematikan pekerjaan terdepan (5,0,0 / 1 mati 2 menunggu / 5 panggilan)", p, st, v.n.Load())
	}
}

// Worker yang hanya memegang lajur verifikasi (flag -tujuan verifikasi): bila breakernya terbuka, tidak ada lajur
// bebas. Klaim tidak boleh jatuh ke "semua lajur" (daftar lajur kosong berarti semua di KlaimOutboxTujuan), karena itu
// akan mengklaim lajur yang sedang dijeda.
func TestLajurTerbukaWorkerSatuLajurTidakMengklaimApaPun(t *testing.T) {
	r, db := siapkan(t)
	v := vendorUji(t)
	akun := banyakPengajuan(t, db, 2)
	b := lajur.Baru(repo.TujuanVerifikasi, lajur.Opsi{Timeout: time.Minute, SalahPermintaan: verifikasi.SalahPermintaan, Catat: func(string, ...any) {}})
	for i := 0; i < 6; i++ {
		b.Jalankan(func() error { return verifikasi.ErrTidakTersedia })
	}
	if b.Status() != lajur.Terbuka {
		t.Fatalf("status %s, harus open", b.Status())
	}
	w := workerDenganBreaker(r, v, 2, b, "http://127.0.0.1:1")
	w.cfg.Tujuan = []string{repo.TujuanVerifikasi}
	h, err := w.Putaran(context.Background())
	p, st := percobaanPerAkun(t, db, akun)
	if err != nil || h.Diklaim != 0 || jumlah(p) != 0 || st["menunggu"] != 2 || v.n.Load() != 0 {
		t.Errorf("putaran %+v %v, percobaan %v, status %v, panggilan vendor %d: lajur terbuka tidak boleh diklaim walau tidak ada lajur lain", h, err, p, st, v.n.Load())
	}
}

// Notifikasi uang tidak ikut tertahan: lajur verifikasi terbuka, lajur push tetap diklaim di worker yang sama.
func TestLajurPushTetapJalanSelagiLajurVerifikasiTerbuka(t *testing.T) {
	r, db := siapkan(t)
	v := vendorUji(t)
	v.atur("503", 0)
	var kode, n atomic.Int32
	kode.Store(200)
	srv := layananPalsu(&kode, &n)
	defer srv.Close()
	akunVer := banyakPengajuan(t, db, 6)
	b := breakerTes(false)
	w := workerDenganBreaker(r, v, 1, b, srv.URL)
	putaranSampai(t, w, "breaker terbuka", func() bool { return b.Status() == lajur.Terbuka })
	akunPush := akunDenganPerangkat(t, db, "hidup")
	h, err := w.Putaran(context.Background())
	if err != nil || h.Terkirim != 1 || n.Load() != 1 {
		t.Fatalf("putaran sesudah lajur terbuka: %+v %v, push diterima %d (harus satu push terkirim)", h, err, n.Load())
	}
	if status, _ := statusOutbox(t, db, akunPush); status != "terkirim" {
		t.Errorf("push %s", status)
	}
	if _, st := percobaanPerAkun(t, db, akunVer); st["menunggu"] != 5 {
		t.Errorf("pekerjaan verifikasi tersentuh: %v", st)
	}
}

// IsSuccessful: jawaban 4xx karena permintaan salah tidak boleh membuka breaker (kustom, ADR 36); bawaan pustaka
// membukanya. Pekerjaan verifikasi yang sehat di belakang pekerjaan yang dokumennya rusak ikut tertahan pada bawaan.
func TestLajur4xxTidakMembukaBreakerKustomTetapiMembukaBreakerBawaan(t *testing.T) {
	for _, bawaan := range []bool{false, true} {
		t.Run(fmt.Sprintf("bawaan=%t", bawaan), func(t *testing.T) {
			r, db := siapkan(t)
			v := vendorUji(t)
			v.atur("422", 0)
			banyakPengajuan(t, db, 3)
			b := breakerTes(bawaan)
			w := workerDenganBreaker(r, v, 1, b, "http://127.0.0.1:1")
			for i := 0; i < 8; i++ {
				time.Sleep(10 * time.Millisecond)
				w.Putaran(context.Background())
			}
			if bawaan && b.Status() != lajur.Terbuka {
				t.Errorf("bawaan pustaka: status %s sesudah 6 jawaban 4xx berturut-turut, harus open", b.Status())
			}
			if !bawaan && (b.Status() != lajur.Tertutup || b.Hitungan().ConsecutiveFailures != 0) {
				t.Errorf("kustom: status %s, gagal berturut-turut %d, harus closed dan 0", b.Status(), b.Hitungan().ConsecutiveFailures)
			}
		})
	}
}

// Kode benar memakai id pengajuan sebagai Idempotency-Key di setiap percobaan; mode rentan verifikasi-tanpa-key
// memakai key baru tiap percobaan (retry bebas tanpa kunci, ditolak ADR 36).
func TestKunciIdempotensiPerPercobaan(t *testing.T) {
	for _, tanpaKunci := range []bool{false, true} {
		t.Run(fmt.Sprintf("tanpaKunci=%t", tanpaKunci), func(t *testing.T) {
			r, db := siapkan(t)
			v := vendorUji(t)
			v.atur("503", 0)
			_, ver := pengajuan(t, db)
			w := workerDenganBreaker(r, v, 1, nil, "http://127.0.0.1:1")
			w.cfg.KunciBaruTiapPercobaan = tanpaKunci
			for i := 0; i < 3; i++ {
				time.Sleep(10 * time.Millisecond)
				w.Putaran(context.Background())
			}
			v.mu.Lock()
			kunci := append([]string{}, v.kunci...)
			v.mu.Unlock()
			if len(kunci) != 3 {
				t.Fatalf("kunci %v", kunci)
			}
			beda := kunci[0] != kunci[1] && kunci[1] != kunci[2]
			if tanpaKunci != beda || (!tanpaKunci && kunci[0] != fmt.Sprint(ver)) {
				t.Errorf("tanpaKunci=%t, kunci %v: kode benar memakai id pengajuan %d di setiap percobaan, mode rentan key baru tiap percobaan", tanpaKunci, kunci, ver)
			}
		})
	}
}

// Tanpa breaker perilakunya ADR 25 apa adanya: semua pekerjaan menghabiskan lima percobaan dan mati.
func TestTanpaBreakerSemuaPekerjaanMatiSebelumVendorPulih(t *testing.T) {
	r, db := siapkan(t)
	v := vendorUji(t)
	v.atur("503", 0)
	akun := banyakPengajuan(t, db, 3)
	w := workerDenganBreaker(r, v, 1, nil, "http://127.0.0.1:1")
	putaranSampai(t, w, "semua mati", func() bool { _, st := percobaanPerAkun(t, db, akun); return st["mati"] == 3 })
	p, _ := percobaanPerAkun(t, db, akun)
	if jumlah(p) != 15 || v.n.Load() != 15 {
		t.Errorf("percobaan %v, panggilan vendor %d: 3 pekerjaan x 5 percobaan = 15", p, v.n.Load())
	}
	v.atur("", 0)
	time.Sleep(20 * time.Millisecond)
	if h, _ := w.Putaran(context.Background()); h.Diklaim != 0 {
		t.Errorf("pekerjaan yang mati diklaim lagi sesudah vendor pulih: %+v", h)
	}
}

// Ringkasan putaran menghitung baris yang dijeda; cetakannya hanya memuat kata dijeda bila ada (rekaman api-t4 sama).
func TestRingkasanMenjumlahkanDanMencetakDijeda(t *testing.T) {
	var a Ringkasan
	a.tambah(Ringkasan{Diklaim: 2, Dijeda: 1})
	a.tambah(Ringkasan{Diklaim: 1, Dijeda: 2, Mati: 1})
	if a.Diklaim != 3 || a.Dijeda != 3 || a.Mati != 1 {
		t.Errorf("%+v", a)
	}
	if got, harus := (Ringkasan{Diklaim: 1, Terkirim: 1}).String(), "diklaim 1, terkirim 1, dilewati 0, ditunda 0, mati 0"; got != harus {
		t.Errorf("tanpa dijeda %q, harus %q", got, harus)
	}
	if got, harus := a.String(), "diklaim 3, terkirim 0, dilewati 0, ditunda 0, mati 1, dijeda 3"; got != harus {
		t.Errorf("dengan dijeda %q, harus %q", got, harus)
	}
}

// Setiap nasib baris dihitung tepat satu kali di ringkasan putaran.
func TestRingkasHasilMenghitungSetiapJenis(t *testing.T) {
	r := ringkasHasil([]string{"terkirim", "terkirim", "dilewati", "ditunda", "mati", "dijeda", "dijeda", "dijeda"})
	if r != (Ringkasan{Diklaim: 8, Terkirim: 2, Dilewati: 1, Ditunda: 1, Mati: 1, Dijeda: 3}) {
		t.Errorf("%+v", r)
	}
}

// Setengah terbuka: satu baris percobaan dihitung dalam kapasitas c, bukan di atasnya. Dengan c = 2 dan tiga
// pemberitahuan push menunggu, putaran mengklaim 1 percobaan verifikasi + 1 push, bukan 1 + 2.
func TestLajurSetengahTerbukaMembagiKapasitasDenganLajurLain(t *testing.T) {
	r, db := siapkan(t)
	v := vendorUji(t)
	var kode, n atomic.Int32
	kode.Store(200)
	srv := layananPalsu(&kode, &n)
	defer srv.Close()
	banyakPengajuan(t, db, 2)
	b := breakerTes(false)
	for i := 0; i < 6; i++ {
		b.Jalankan(func() error { return verifikasi.ErrTidakTersedia })
	}
	time.Sleep(timeoutBreakerTes + 50*time.Millisecond)
	if b.Status() != lajur.SetengahTerbuka {
		t.Fatalf("status %s", b.Status())
	}
	for i := 0; i < 3; i++ {
		akunDenganPerangkat(t, db, "hidup")
	}
	w := workerDenganBreaker(r, v, 2, b, srv.URL)
	h, err := w.Putaran(context.Background())
	if err != nil || h.Diklaim != 2 || h.Terkirim != 2 || n.Load() != 1 || v.n.Load() != 1 {
		t.Fatalf("putaran: %+v %v, push %d, vendor %d (harus 2 klaim: 1 percobaan verifikasi dan 1 push)", h, err, n.Load(), v.n.Load())
	}
}
