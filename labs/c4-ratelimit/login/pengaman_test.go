package main

// Tes pengaman login c4-ratelimit (keputusan 659-661). Butuh PostgreSQL bersama (schema c4_login):
// tes memakai TEST_DATABASE_URL, dan dilewati bila kosong. run-login.py menjalankannya dengan URL itu dan
// menggagalkan lab bila ada tes yang gagal atau dilewati.
//
// Semua akun, alamat, dan password di sini fiktif. Jam tiruan (jamMS) dikunci di T0 supaya kunci dan bucket
// tidak bergantung pada tidur sungguhan.

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	basisTes    = "lab"
	skemaTes    = "c4_login"
	t0TesMS     = 1_792_479_600_000 // sama dengan T0_MS di run-login.py
	rahasiaTes  = "rahasia-proxy-tes-hanya-untuk-uji-lokal-0123456789"
	passwordTes = "kampus-aman-%d-ungu" // password seed akun 516..543 (seed.go)
)

var (
	siapSekali sync.Once
	poolTes    *pgxpool.Pool
	galatSiap  error
)

func TestMain(m *testing.M) {
	kode := m.Run()
	if poolTes != nil {
		poolTes.Close()
	}
	os.Exit(kode)
}

// siapkanTes membuka database tes sekali, memastikan itu schema c4_login di database lab (tes menulis dan
// seed menghapus schema itu), lalu mengisi ulang seed.
func siapkanTes(t *testing.T) *pgxpool.Pool {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL kosong: tes ini butuh PostgreSQL")
	}
	siapSekali.Do(func() {
		ctx := context.Background()
		cfg, err := pgxpool.ParseConfig(url)
		if err != nil {
			galatSiap = err
			return
		}
		cfg.MaxConns = 16 // default pgxpool = jumlah CPU; tes lock menahan lima koneksi sekaligus
		pool, err := pgxpool.NewWithConfig(ctx, cfg)
		if err != nil {
			galatSiap = err
			return
		}
		var nama, skema string
		if err := pool.QueryRow(ctx, "SELECT current_database(), coalesce(current_schema(), '')").Scan(&nama, &skema); err != nil {
			galatSiap = err
			return
		}
		if nama != basisTes || skema != skemaTes {
			galatSiap = fmt.Errorf("%s/%s bukan database tes %s/%s: tidak ada yang ditulis", nama, skema, basisTes, skemaTes)
			return
		}
		if err := muatBocor(); err != nil {
			galatSiap = err
			return
		}
		if err := seed(ctx, pool); err != nil {
			galatSiap = err
			return
		}
		poolTes = pool
	})
	if galatSiap != nil {
		t.Fatal(galatSiap)
	}
	jamMS.Store(t0TesMS)
	t.Cleanup(func() { jamMS.Store(0) })
	return poolTes
}

func serverTes(db *pgxpool.Pool, mode, ipSumber string) *server {
	return &server{db: db, mode: mode, ipSumber: ipSumber, proxyRahasia: rahasiaTes,
		perIP: pembatasBaru(10, 10.0/60), perAkun: pembatasBaru(5, 5.0/60)}
}

func emailAkun(id int) string { return fmt.Sprintf("karyawan%d@lestari.example", id) }

// kirimLogin memanggil handler /login. ip kosong = alamat koneksi 127.0.0.1; selain itu IP client ditiru lewat
// header proxy (hanya dipercaya server berstatus IP_SUMBER=proxy).
func kirimLogin(s *server, email, password, ip string) *httptest.ResponseRecorder {
	body := fmt.Sprintf(`{"email":%q,"password":%q}`, email, password)
	r := httptest.NewRequest(http.MethodPost, "/login", strings.NewReader(body))
	r.RemoteAddr = "127.0.0.1:50000"
	if ip != "" {
		r.Header.Set("X-Lab-IP", ip)
		r.Header.Set("X-Lab-Proxy", rahasiaTes)
	}
	w := httptest.NewRecorder()
	s.login(w, r)
	return w
}

// aturKunci menaruh penghitung gagal dan, bila kunciDetikLagi tidak nil, kunci yang berakhir sekian detik dari
// jam tiruan (negatif = sudah lewat).
func aturKunci(t *testing.T, db *pgxpool.Pool, id int, gagal int, kunciDetikLagi *int) {
	t.Helper()
	var sampai *time.Time
	if kunciDetikLagi != nil {
		k := time.UnixMilli(t0TesMS).UTC().Add(time.Duration(*kunciDetikLagi) * time.Second)
		sampai = &k
	}
	if _, err := db.Exec(context.Background(),
		`UPDATE akun SET gagal_login = $2, terkunci_sampai = $3 WHERE id = $1`, id, gagal, sampai); err != nil {
		t.Fatal(err)
	}
}

func bacaKunci(t *testing.T, db *pgxpool.Pool, id int) (gagal int, terkunci bool) {
	t.Helper()
	err := db.QueryRow(context.Background(),
		`SELECT gagal_login, terkunci_sampai IS NOT NULL FROM akun WHERE id = $1`, id).Scan(&gagal, &terkunci)
	if err != nil {
		t.Fatal(err)
	}
	return gagal, terkunci
}

// Lima tebakan salah bersamaan saat penghitung tinggal satu dari ambang: hanya satu yang dinilai argon2id,
// sisanya melihat kunci yang dipasang tebakan pertama. Penghitung yang naik atomik saja tidak cukup bila kunci
// dibaca tanpa lock dan baru dipasang sesudah argon2id: tebakan yang sudah lewat pemeriksaan kunci tetap
// dinilai (keputusan 659).
func TestKunciTidakBisaDilewatiBersamaan(t *testing.T) {
	db := siapkanTes(t)
	s := serverTes(db, "per-akun", "koneksi") // tanpa bucket memori: yang diuji kunci di database
	const id = 520
	aturKunci(t, db, id, ambangAkun-1, nil)
	awal := hitungNilai.Load()

	var wg sync.WaitGroup
	mulai := make(chan struct{})
	for range ambangAkun {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-mulai
			if w := kirimLogin(s, emailAkun(id), "tebakan-salah", ""); w.Code != http.StatusUnauthorized {
				t.Errorf("tebakan bersamaan: ingin 401, dapat %d", w.Code)
			}
		}()
	}
	close(mulai)
	wg.Wait()

	dinilai := hitungNilai.Load() - awal
	gagal, terkunci := bacaKunci(t, db, id)
	if dinilai != 1 {
		t.Fatalf("%d tebakan dinilai argon2id sesudah penghitung %d; ingin 1 (penghitung akhir %d)",
			dinilai, ambangAkun-1, gagal)
	}
	if gagal != ambangAkun || !terkunci {
		t.Fatalf("penghitung %d terkunci=%v; ingin %d dan terkunci", gagal, terkunci, ambangAkun)
	}
}

// Tebakan menunggu lock baris, bukan hanya kebetulan datang berurutan. Transaction lain menahan baris akun
// (SELECT ... FOR UPDATE) sementara lima tebakan datang; tes menunggu sampai kelimanya benar-benar antre di lock
// (pg_stat_activity), baru melepas lock. Tanpa FOR UPDATE di catatPercobaan, kelimanya membaca penghitung yang
// sama dan semuanya dinilai: celah itu tidak tertangkap tes yang hanya menjalankan tebakan bersamaan, karena
// jendela antara SELECT dan UPDATE hanya beberapa milidetik (keputusan 659).
func TestKunciMenungguLockBaris(t *testing.T) {
	db := siapkanTes(t)
	s := serverTes(db, "per-akun", "koneksi")
	const id = 524
	ctx := context.Background()
	aturKunci(t, db, id, ambangAkun-1, nil)
	tahan, err := db.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tahan.Rollback(ctx)
	if _, err := tahan.Exec(ctx, `SELECT 1 FROM akun WHERE id = $1 FOR UPDATE`, id); err != nil {
		t.Fatal(err)
	}
	awal := hitungNilai.Load()

	var wg sync.WaitGroup
	for range ambangAkun {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if w := kirimLogin(s, emailAkun(id), "tebakan-salah", ""); w.Code != http.StatusUnauthorized {
				t.Errorf("tebakan yang menunggu lock: ingin 401, dapat %d", w.Code)
			}
		}()
	}
	antre := 0
	for range 200 { // paling lama 10 detik
		if err := db.QueryRow(ctx, `SELECT count(*) FROM pg_stat_activity
			WHERE application_name = current_setting('application_name') AND wait_event_type = 'Lock'`).Scan(&antre); err != nil {
			t.Fatal(err)
		}
		if antre == ambangAkun {
			break
		}
		time.Sleep(50 * time.Millisecond)
	}
	if err := tahan.Commit(ctx); err != nil { // lepas lock; commit tanpa perubahan
		t.Fatal(err)
	}
	wg.Wait()
	if antre != ambangAkun {
		t.Fatalf("%d dari %d tebakan antre di lock baris; ingin semuanya", antre, ambangAkun)
	}
	if dinilai := hitungNilai.Load() - awal; dinilai != 1 {
		gagal, _ := bacaKunci(t, db, id)
		t.Fatalf("%d tebakan dinilai argon2id sesudah lock dilepas; ingin 1 (penghitung akhir %d)", dinilai, gagal)
	}
	if gagal, terkunci := bacaKunci(t, db, id); gagal != ambangAkun || !terkunci {
		t.Fatalf("penghitung %d terkunci=%v; ingin %d dan terkunci", gagal, terkunci, ambangAkun)
	}
}

// Password benar menghapus penghitung dan kunci yang dipasang percobaan itu sendiri (catatPercobaan memasang
// kunci sebelum argon2id, jadi tanpa reset akun yang baru saja masuk dengan benar tetap terkunci). Dua kasus:
// penghitung biasa dan kunci yang baru lewat.
func TestPasswordBenarMenghapusPenghitungDanKunci(t *testing.T) {
	db := siapkanTes(t)
	s := serverTes(db, "per-akun", "koneksi")
	kunciLewat := -1
	for _, c := range []struct {
		id     int
		gagal  int
		kunci  *int
		nama   string
		wantOK int
	}{
		{521, ambangAkun - 2, nil, "penghitung 3, tanpa kunci", http.StatusOK},
		{522, ambangAkun + 1, &kunciLewat, "penghitung 6, kunci lewat 1 detik lalu", http.StatusOK},
	} {
		aturKunci(t, db, c.id, c.gagal, c.kunci)
		w := kirimLogin(s, emailAkun(c.id), fmt.Sprintf(passwordTes, c.id), "")
		if w.Code != c.wantOK {
			t.Fatalf("%s: login dengan password benar = %d, ingin %d", c.nama, w.Code, c.wantOK)
		}
		if gagal, terkunci := bacaKunci(t, db, c.id); gagal != 0 || terkunci {
			t.Fatalf("%s: sesudah password benar penghitung %d terkunci=%v; ingin 0 dan tidak terkunci", c.nama, gagal, terkunci)
		}
	}
}
