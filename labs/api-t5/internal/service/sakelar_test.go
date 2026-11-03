//go:build t5rollout

package service

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"lab/apit5/internal/repo"
)

// Tes lab t5-rollout (M49, ADR 55): sakelar kartu dari tabel, dengan tag supaya tidak ikut `go test ./...` biasa
// dan tidak mengubah rekaman testing.txt api-t5. Dijalankan lab t5-rollout: go test -tags t5rollout.

type jamTes struct {
	mu sync.Mutex
	t  time.Time
}

func (j *jamTes) kini() time.Time { j.mu.Lock(); defer j.mu.Unlock(); return j.t }
func (j *jamTes) maju(d time.Duration) {
	j.mu.Lock()
	defer j.mu.Unlock()
	j.t = j.t.Add(d)
}

// sakelarPalsu: SakelarKartu dengan pembaca dan jam buatan; membaca = berapa kali tabel dibaca.
func sakelarPalsu(nilai *bool, galat *error, ttl time.Duration) (*SakelarKartu, *jamTes, *int) {
	j := &jamTes{t: time.Date(2026, 11, 3, 15, 0, 0, 0, time.UTC)}
	dibaca := new(int)
	k := &SakelarKartu{ttl: ttl, kini: j.kini, baca: func(ctx context.Context, nama string) (bool, error) {
		*dibaca++
		if nama != NamaSakelarKartu {
			return false, errors.New("nama sakelar salah: " + nama)
		}
		if *galat != nil {
			return false, *galat
		}
		return *nilai, nil
	}}
	return k, j, dibaca
}

// Nilai dipakai ulang selama TTL (tabel dibaca sekali), lalu dibaca lagi: perubahan baru terlihat sesudah cache habis.
func TestSakelarKartuCacheSampaiTTL(t *testing.T) {
	nilai, galat := true, error(nil)
	k, j, dibaca := sakelarPalsu(&nilai, &galat, 5*time.Second)
	ctx := context.Background()
	if a, ok := k.Aktif(ctx); !a || !ok {
		t.Fatalf("bacaan pertama %v %v, ingin menyala dan terbaca", a, ok)
	}
	nilai = false // tabel berubah di tengah jendela cache
	j.maju(4999 * time.Millisecond)
	if a, ok := k.Aktif(ctx); !a || !ok || *dibaca != 1 {
		t.Fatalf("di dalam TTL: %v %v dibaca %d, ingin nilai lama dari cache", a, ok, *dibaca)
	}
	j.maju(time.Millisecond)
	if a, ok := k.Aktif(ctx); a || !ok || *dibaca != 2 {
		t.Fatalf("sesudah TTL: %v %v dibaca %d, ingin nilai baru dari tabel", a, ok, *dibaca)
	}
}

// Pembacaan yang gagal tidak memperpanjang nilai lama: sesudah TTL, sakelar tak terbaca = tidak menyala.
func TestSakelarKartuGagalBacaTidakMemperpanjangNilaiLama(t *testing.T) {
	nilai, galat := true, error(nil)
	k, j, _ := sakelarPalsu(&nilai, &galat, 5*time.Second)
	ctx := context.Background()
	k.Aktif(ctx)
	galat = errors.New("koneksi putus")
	j.maju(5 * time.Second)
	if a, ok := k.Aktif(ctx); a || ok {
		t.Fatalf("galat baca: %v %v, ingin tidak menyala dan tidak terbaca", a, ok)
	}
	galat = nil // pulih: terbaca lagi
	if a, ok := k.Aktif(ctx); !a || !ok {
		t.Fatalf("sesudah pulih: %v %v", a, ok)
	}
}

func TestSakelarKartuBarisTidakAdaTidakTerbaca(t *testing.T) {
	nilai, galat := true, repo.ErrTidakAda
	k, _, _ := sakelarPalsu(&nilai, &galat, 5*time.Second)
	if a, ok := k.Aktif(context.Background()); a || ok {
		t.Fatalf("baris tidak ada: %v %v, ingin tidak menyala dan tidak terbaca", a, ok)
	}
}

// Setel (pod yang mengubah sakelar) langsung terlihat di pod itu; pod lain menunggu cache-nya habis.
func TestSakelarKartuSetelHanyaPodSendiri(t *testing.T) {
	nilai, galat := true, error(nil)
	podA, jA, _ := sakelarPalsu(&nilai, &galat, 5*time.Second)
	podB, jB, _ := sakelarPalsu(&nilai, &galat, 5*time.Second)
	ctx := context.Background()
	podA.Aktif(ctx)
	podB.Aktif(ctx)
	nilai = false // satu tabel untuk keduanya
	podA.Setel(false)
	if a, _ := podA.Aktif(ctx); a {
		t.Fatal("pod pengubah masih menyala")
	}
	if b, _ := podB.Aktif(ctx); !b {
		t.Fatal("pod lain sudah berubah sebelum cache-nya habis")
	}
	jA.maju(5 * time.Second)
	jB.maju(5 * time.Second)
	if b, _ := podB.Aktif(ctx); b {
		t.Fatal("pod lain masih menyala sesudah cache habis")
	}
}

func TestLabTolakTepatPersen(t *testing.T) {
	for _, persen := range []int{0, 5, 31, 100} {
		l := &LabTolak{Persen: persen}
		n := 0
		for i := 0; i < 300; i++ {
			if l.Tolak() {
				n++
			}
		}
		if n != 3*persen {
			t.Errorf("persen %d: %d dari 300 ditolak, ingin %d", persen, n, 3*persen)
		}
	}
	var nol *LabTolak
	if nol.Tolak() {
		t.Error("nil menolak")
	}
}

// Penolakan tersebar rata: di setiap awalan pemanggilan, jumlah yang ditolak tepat k x persen / 100 (dibulatkan ke
// bawah). Versi yang menolak N pertama dari tiap 100 memberi rasio 100% di awal dan meloloskan ambang analisis yang salah.
func TestLabTolakTersebarRata(t *testing.T) {
	l := &LabTolak{Persen: 31}
	n := 0
	for k := 1; k <= 300; k++ {
		if l.Tolak() {
			n++
		}
		if n != k*31/100 {
			t.Fatalf("setelah %d pemanggilan %d ditolak, ingin %d", k, n, k*31/100)
		}
	}
}

func TestHitungOtorisasi(t *testing.T) {
	var kosong *HitungOtorisasi
	kosong.Catat(Keputusan{Keputusan: "setuju"}) // tidak panik
	h := &HitungOtorisasi{}
	if total, _, _, rasio := h.Ringkas(); total != 0 || rasio != 0 {
		t.Fatalf("kosong: total %d rasio %v", total, rasio)
	}
	for i := 0; i < 7; i++ {
		h.Catat(setuju())
	}
	for i := 0; i < 3; i++ {
		h.Catat(tolak("versi-baru"))
	}
	if total, s, tl, rasio := h.Ringkas(); total != 10 || s != 7 || tl != 3 || rasio != 0.3 {
		t.Fatalf("hitung: %d %d %d %v", total, s, tl, rasio)
	}
}

// Dengan database: kill switch dari tabel menolak tanpa baris otorisasi; sakelar tak terbaca dijawab tolak (bukan galat);
// menyalakan lagi menyetujui. Kartu dan akun dari helper kartu_test.go.
func TestOtorisasiSakelarTabel(t *testing.T) {
	svc, db := svcKartu(t, Dep{})
	ctx := context.Background()
	r := repo.Baru(db)
	akun := pemakaiBaru(t, db, "terverifikasi", 100_000)
	token := kartuTes(t, db, akun, "aktif", 500_000)
	pod := BaruSakelarKartu(r, 0) // TTL 0: setiap otorisasi membaca tabel
	svc = svc.DenganT4(Dep{SakelarKartu: pod, KunciPenerbit: "kunci-tes"})
	tulis := func(nilai bool) {
		t.Helper()
		if _, err := db.Exec(`INSERT INTO sakelar (nama, nilai) VALUES ($1, $2) ON CONFLICT (nama) DO UPDATE SET nilai = EXCLUDED.nilai`, NamaSakelarKartu, nilai); err != nil {
			t.Fatal(err)
		}
	}
	id := func() string { return idOtorisasi() }
	harapTolak := func(alasan string) {
		t.Helper()
		i := id()
		k, err := svc.Otorisasi(ctx, PermintaanOtorisasi{IDPenerbit: i, Token: token, Jumlah: 10_000})
		if err != nil || k.Keputusan != "tolak" || k.Alasan != alasan {
			t.Fatalf("keputusan %+v, error %v; ingin tolak %s", k, err, alasan)
		}
		if n := hitungKartu(t, db, `SELECT count(*) FROM otorisasi_kartu WHERE id_penerbit = $1`, i); n != 0 {
			t.Fatalf("penolakan %s meninggalkan %d baris otorisasi", alasan, n)
		}
	}
	if _, err := db.Exec(`DELETE FROM sakelar WHERE nama = $1`, NamaSakelarKartu); err != nil {
		t.Fatal(err)
	}
	harapTolak("sakelar-tak-terbaca") // baris tidak ada
	tulis(false)
	harapTolak("kill-switch")
	tulis(true)
	k, err := svc.Otorisasi(ctx, PermintaanOtorisasi{IDPenerbit: id(), Token: token, Jumlah: 10_000})
	harapSetuju(t, k, err)
}

// Perubahan lewat SetKartuAktifBO ditulis ke tabel dan audit dalam satu transaction; pod lain (SakelarKartu lain
// dengan TTL 0) membacanya.
func TestSetKartuAktifBOMenulisSakelarDanAudit(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	risk := akunBO(t, db, "risk", "terverifikasi", 0)
	r := repo.Baru(db)
	podA, podB := BaruSakelarKartu(r, time.Hour), BaruSakelarKartu(r, 0)
	svc = svc.DenganT4(Dep{SakelarKartu: podA})
	if err := svc.SetKartuAktifBO(ctx, risk, false, alasanUji); err != nil {
		t.Fatal(err)
	}
	var nilai bool
	var oleh int64
	if err := db.QueryRow(`SELECT nilai, diubah_oleh FROM sakelar WHERE nama = $1`, NamaSakelarKartu).Scan(&nilai, &oleh); err != nil || nilai || oleh != risk {
		t.Fatalf("tabel sakelar: nilai %v oleh %d, error %v; ingin mati oleh %d", nilai, oleh, err, risk)
	}
	if a, ok := podB.Aktif(ctx); a || !ok {
		t.Fatalf("pod lain membaca %v %v, ingin mati dan terbaca", a, ok)
	}
	if a, ok := podA.Aktif(ctx); a || !ok {
		t.Fatalf("pod pengubah membaca %v %v, ingin mati dari cache sendiri", a, ok)
	}
	var objek string
	if err := db.QueryRow(`SELECT objek FROM audit_log WHERE pelaku_id = $1 AND aksi = 'flag_kartu' ORDER BY id DESC LIMIT 1`, risk).Scan(&objek); err != nil || objek != "flag:kartu=mati" {
		t.Fatalf("audit: %q, %v", objek, err)
	}
	// Alasan pendek: tabel tidak berubah.
	if err := svc.SetKartuAktifBO(ctx, risk, true, "pendek"); err == nil {
		t.Fatal("alasan pendek diterima")
	}
	if err := db.QueryRow(`SELECT nilai FROM sakelar WHERE nama = $1`, NamaSakelarKartu).Scan(&nilai); err != nil || nilai {
		t.Fatalf("alasan pendek mengubah tabel: %v %v", nilai, err)
	}
}

// Pelaku yang bukan petugas risk ditolak sebelum menyentuh tabel sakelar.
func TestSetKartuAktifBOBukanRiskTidakMengubahSakelar(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	if _, err := db.Exec(`INSERT INTO sakelar (nama, nilai) VALUES ($1, true) ON CONFLICT (nama) DO UPDATE SET nilai = true`, NamaSakelarKartu); err != nil {
		t.Fatal(err)
	}
	svc = svc.DenganT4(Dep{SakelarKartu: BaruSakelarKartu(repo.Baru(db), 0)})
	biasa := akunBO(t, db, "pemakai", "terverifikasi", 0)
	if err := svc.SetKartuAktifBO(ctx, biasa, false, alasanUji); !errors.Is(err, ErrDilarang) {
		t.Fatalf("bukan petugas risk: %v, ingin ErrDilarang", err)
	}
	var nilai bool
	if err := db.QueryRow(`SELECT nilai FROM sakelar WHERE nama = $1`, NamaSakelarKartu).Scan(&nilai); err != nil || !nilai {
		t.Fatalf("penolakan mengubah tabel: %v %v", nilai, err)
	}
}

// Pembacaan tabel yang menggantung (PostgreSQL berhenti menjawab) dibagi semua pemanggil yang tiba selama pembacaan
// itu berjalan: tiap pemanggil menunggu paling lama BatasBacaSakelar, bukan sebanyak antrean di depannya. Bila
// pembacaan dikerjakan satu per satu di bawah satu mutex, pemanggil ke-n menunggu n x BatasBacaSakelar dan melewati
// tenggat 2 detik penerbit, yang membaca keterlambatan sebagai setuju (ADR 42).
func TestSakelarKartuTakTerbacaTidakMengantre(t *testing.T) {
	var dibaca atomic.Int32
	k := &SakelarKartu{ttl: 5 * time.Second, kini: time.Now, baca: func(ctx context.Context, nama string) (bool, error) {
		dibaca.Add(1)
		<-ctx.Done() // PostgreSQL berhenti menjawab: pembacaan hanya selesai oleh batas waktu
		return false, ctx.Err()
	}}
	const pemanggil = 5
	lama := make([]time.Duration, pemanggil)
	hasil := make([][2]bool, pemanggil)
	var wg sync.WaitGroup
	mulai := time.Now()
	for i := range pemanggil {
		wg.Add(1)
		go func() {
			defer wg.Done()
			a, ok := k.Aktif(context.Background())
			lama[i], hasil[i] = time.Since(mulai), [2]bool{a, ok}
		}()
	}
	wg.Wait()
	for i := range pemanggil {
		if hasil[i] != [2]bool{false, false} {
			t.Errorf("pemanggil %d: %v, ingin tidak menyala dan tidak terbaca", i, hasil[i])
		}
		if lama[i] > BatasBacaSakelar+750*time.Millisecond {
			t.Errorf("pemanggil %d menunggu %v, ingin paling lama %v", i, lama[i], BatasBacaSakelar)
		}
	}
	if n := dibaca.Load(); n > 2 {
		t.Errorf("tabel dibaca %d kali oleh %d pemanggil yang tiba bersamaan, ingin dibagi", n, pemanggil)
	}
}

// Setel di tengah pembacaan yang sudah berjalan tidak ditimpa hasil pembacaan itu: pembacaan memulai sebelum perubahan
// di-COMMIT, jadi nilainya bisa sudah lama.
func TestSakelarKartuSetelDiTengahPembacaanTidakDitimpa(t *testing.T) {
	mulaiBaca, lepas := make(chan struct{}), make(chan struct{})
	k := &SakelarKartu{ttl: time.Hour, kini: time.Now, baca: func(ctx context.Context, nama string) (bool, error) {
		close(mulaiBaca)
		<-lepas
		return true, nil // tabel masih menyala saat dibaca
	}}
	selesai := make(chan [2]bool)
	go func() {
		a, ok := k.Aktif(context.Background())
		selesai <- [2]bool{a, ok}
	}()
	<-mulaiBaca
	k.Setel(false) // pod ini mematikan sakelar selagi pembacaan lama masih berjalan
	close(lepas)
	<-selesai
	if a, ok := k.Aktif(context.Background()); a || !ok {
		t.Fatalf("sesudah Setel(false): %v %v, ingin mati dan terbaca", a, ok)
	}
}

// Pembacaan yang panik tidak menggantungkan pemanggil berikutnya.
func TestSakelarKartuPembacaanPanikTidakMenggantung(t *testing.T) {
	panik := true
	k := &SakelarKartu{ttl: time.Hour, kini: time.Now, baca: func(ctx context.Context, nama string) (bool, error) {
		if panik {
			panic("pembacaan sakelar panik")
		}
		return true, nil
	}}
	func() {
		defer func() { _ = recover() }()
		k.Aktif(context.Background())
	}()
	panik = false
	ctx, batal := context.WithTimeout(context.Background(), 500*time.Millisecond)
	defer batal()
	if a, ok := k.Aktif(ctx); !a || !ok {
		t.Fatalf("sesudah panik: %v %v, ingin menyala dan terbaca", a, ok)
	}
}
