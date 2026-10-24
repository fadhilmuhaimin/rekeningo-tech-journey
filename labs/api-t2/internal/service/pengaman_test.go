package service

// Tes pengaman lab-api-t2a (keputusan 645-647): rate limit per akun untuk kiriman dan login, cek penerima yang
// tidak membedakan nomor, kunci bertahap, akun terkunci dijawab sama dengan password salah, wajib ganti password.
// File ini sengaja terpisah dari db_test.go supaya nomor baris tes lama yang dikutip halaman tidak bergeser.

import (
	"context"
	"database/sql"
	"errors"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"

	"lab/apit2/internal/repo"
)

// jam tiruan untuk tes: waktu hanya maju bila tes memajukannya.
type jam struct{ t time.Time }

func (j *jam) kini() time.Time      { return j.t }
func (j *jam) maju(d time.Duration) { j.t = j.t.Add(d) }

// akunLogin: akun karyawan dengan password sungguhan (bcrypt biaya minimum supaya tes cepat).
func akunLogin(t *testing.T, db *sql.DB, password string, wajib bool) (id int64, email string) {
	t.Helper()
	id, _ = akunBaru(t, db, "karyawan", 0)
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`UPDATE akun SET password_hash = $2, wajib_ganti_password = $3 WHERE id = $1 RETURNING email`,
		id, string(hash), wajib).Scan(&email); err != nil {
		t.Fatal(err)
	}
	return id, email
}

// --8<-- [start:tes-kirim-per-akun]
// Lima belas percobaan kiriman per akun, lalu 429 sampai token terisi (1 per 10 menit). Tanpa database:
// bucket dicek sebelum aturan lain, dan nominal 0 ditolak sebelum database disentuh.
func TestKirimDibatasiPerAkun(t *testing.T) {
	svc := Baru(repo.Repo{}, 0)
	j := &jam{t: time.Date(2026, 10, 19, 12, 0, 0, 0, time.UTC)}
	svc.kini = j.kini
	for i := 1; i <= 15; i++ {
		if _, err := svc.Kirim(context.Background(), 417, "K00504", 0); !errors.As(err, &ErrValidasi{}) {
			t.Fatalf("percobaan %d: ingin ErrValidasi (masih di bawah batas), dapat %v", i, err)
		}
	}
	var lambat ErrTerlaluSering
	if _, err := svc.Kirim(context.Background(), 417, "K00504", 0); !errors.As(err, &lambat) || lambat.Lapis != "akun" {
		t.Fatalf("percobaan 16: ingin ErrTerlaluSering per akun, dapat %v", err)
	}
	if lambat.TungguDetik() != 600 {
		t.Fatalf("Retry-After %d detik, ingin 600", lambat.TungguDetik())
	}
	if _, err := svc.Kirim(context.Background(), 419, "K00504", 0); !errors.As(err, &ErrValidasi{}) {
		t.Fatalf("akun lain ikut tertahan: %v", err)
	}
	j.maju(10 * time.Minute)
	if _, err := svc.Kirim(context.Background(), 417, "K00504", 0); !errors.As(err, &ErrValidasi{}) {
		t.Fatalf("sesudah 10 menit: ingin satu token baru, dapat %v", err)
	}
}

// --8<-- [end:tes-kirim-per-akun]

// --8<-- [start:tes-cek-penerima]
// Percobaan yang gagal di sisi pengirim memberi jawaban yang sama untuk nomor terdaftar dan tidak terdaftar.
// "Tidak terdaftar" hanya muncul bila kiriman ke nomor terdaftar akan berhasil.
func TestKirimTidakMembedakanNomor(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	a, _ := akunBaru(t, db, "karyawan", 100_000)
	_, terdaftar := akunBaru(t, db, "karyawan", 0)
	tidak := "T999999999"
	for _, kasus := range []struct {
		nominal int64
		ingin   error
	}{{150_000, ErrSaldoKurang}, {600_000, ErrBatasHarian}} {
		_, e1 := svc.Kirim(ctx, a, terdaftar, kasus.nominal)
		_, e2 := svc.Kirim(ctx, a, tidak, kasus.nominal)
		if !errors.Is(e1, kasus.ingin) || !errors.Is(e2, kasus.ingin) {
			t.Fatalf("nominal %d: terdaftar %v, tidak terdaftar %v; ingin keduanya %v", kasus.nominal, e1, e2, kasus.ingin)
		}
	}
	var v ErrValidasi
	if _, err := svc.Kirim(ctx, a, tidak, 10_000); !errors.As(err, &v) || v.Pesan != "tidak terdaftar" {
		t.Fatalf("nomor salah dengan saldo cukup: ingin 'tidak terdaftar', dapat %v", err)
	}
	if _, err := svc.Kirim(ctx, a, terdaftar, 10_000); err != nil {
		t.Fatalf("kiriman ke nomor terdaftar: %v", err)
	}
	if s := saldo(t, db, a); s != 90_000 {
		t.Fatalf("saldo %d, ingin 90000: percobaan yang ditolak tidak boleh memindahkan uang", s)
	}
}

// --8<-- [end:tes-cek-penerima]

func TestDurasiKunciBertahap(t *testing.T) {
	for gagal, ingin := range map[int]time.Duration{
		5: time.Minute, 6: 2 * time.Minute, 7: 4 * time.Minute, 10: 32 * time.Minute, 50: 32 * time.Minute,
	} {
		if d := durasiKunci(gagal); d != ingin {
			t.Fatalf("durasiKunci(%d) = %s, ingin %s", gagal, d, ingin)
		}
	}
}

// --8<-- [start:tes-kunci]
// Lima password salah mengunci akun 1 menit. Selama terkunci, password benar dijawab sama dengan password salah.
// Bucket per email dibuat longgar di tes ini supaya yang diuji hanya kunci di database.
func TestLoginTerkunciSamaDenganPasswordSalah(t *testing.T) {
	svc, db := siapkan(t)
	j := &jam{t: time.Now().UTC()}
	svc.kini = j.kini
	svc.loginAkun = PembatasBaru(1000, 1)
	ctx := context.Background()
	id, email := akunLogin(t, db, "password-benar-milik-tes", false)
	for i := 1; i <= 5; i++ {
		if _, _, err := svc.Login(ctx, email, "tebakan-salah"); !errors.Is(err, ErrLoginGagal) {
			t.Fatalf("tebakan %d: %v", i, err)
		}
	}
	var gagal int
	var sampai time.Time
	if err := db.QueryRow(`SELECT gagal_login, terkunci_sampai FROM akun WHERE id = $1`, id).Scan(&gagal, &sampai); err != nil {
		t.Fatal(err)
	}
	if gagal != 5 || sampai.Sub(j.t).Round(time.Second) != time.Minute {
		t.Fatalf("gagal_login %d, kunci %s; ingin 5 dan 1 menit", gagal, sampai.Sub(j.t))
	}
	if _, _, err := svc.Login(ctx, email, "password-benar-milik-tes"); !errors.Is(err, ErrLoginGagal) {
		t.Fatalf("password benar saat terkunci: ingin ErrLoginGagal yang sama, dapat %v", err)
	}
	j.maju(61 * time.Second)
	if _, _, err := svc.Login(ctx, email, "tebakan-salah"); !errors.Is(err, ErrLoginGagal) {
		t.Fatal(err)
	}
	if err := db.QueryRow(`SELECT terkunci_sampai FROM akun WHERE id = $1`, id).Scan(&sampai); err != nil {
		t.Fatal(err)
	}
	if sampai.Sub(j.t).Round(time.Second) != 2*time.Minute {
		t.Fatalf("gagal keenam: kunci %s, ingin 2 menit (bertahap)", sampai.Sub(j.t))
	}
	j.maju(121 * time.Second)
	if _, _, err := svc.Login(ctx, email, "password-benar-milik-tes"); err != nil {
		t.Fatalf("sesudah kunci habis: %v", err)
	}
	if err := db.QueryRow(`SELECT gagal_login FROM akun WHERE id = $1`, id).Scan(&gagal); err != nil || gagal != 0 {
		t.Fatalf("penghitung sesudah login berhasil: %d, %v", gagal, err)
	}
}

// --8<-- [end:tes-kunci]

// Lapis memori per email: percobaan keenam dalam satu menit ditolak sebelum database dan bcrypt.
func TestLoginDibatasiPerAkun(t *testing.T) {
	svc, db := siapkan(t)
	j := &jam{t: time.Now().UTC()}
	svc.kini = j.kini
	_, email := akunLogin(t, db, "password-benar-milik-tes", false)
	for i := 1; i <= 5; i++ {
		if _, _, err := svc.Login(context.Background(), email, "tebakan-salah"); !errors.Is(err, ErrLoginGagal) {
			t.Fatalf("tebakan %d: %v", i, err)
		}
	}
	var lambat ErrTerlaluSering
	if _, _, err := svc.Login(context.Background(), email, "tebakan-salah"); !errors.As(err, &lambat) || lambat.Lapis != "akun" {
		t.Fatalf("tebakan 6: ingin ErrTerlaluSering per akun, dapat %v", err)
	}
}

// --8<-- [start:tes-wajib-ganti]
// Akun yang wajib ganti tidak mendapat token, sesi lamanya tidak berlaku, dan password baru minimal 15 karakter.
func TestLoginWajibGantiPassword(t *testing.T) {
	svc, db := siapkan(t)
	svc.loginAkun = PembatasBaru(1000, 1) // enam percobaan untuk satu email di tes ini
	ctx := context.Background()
	id, email := akunLogin(t, db, "sementara-tes", false)
	token, _, err := svc.Login(ctx, email, "sementara-tes")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`UPDATE akun SET wajib_ganti_password = true WHERE id = $1`, id); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Periksa(ctx, token); !errors.Is(err, ErrSesiTidakSah) {
		t.Fatalf("sesi yang dibuka sebelum ditandai: ingin ErrSesiTidakSah, dapat %v", err)
	}
	if _, _, err := svc.Login(ctx, email, "sementara-tes"); !errors.Is(err, ErrWajibGanti) {
		t.Fatalf("login dengan password sementara: ingin ErrWajibGanti, dapat %v", err)
	}
	if err := svc.GantiPassword(ctx, email, "sementara-tes", "pendek-sekali"); !errors.As(err, &ErrValidasi{}) {
		t.Fatalf("password baru 13 karakter: ingin ErrValidasi, dapat %v", err)
	}
	if err := svc.GantiPassword(ctx, email, "sementara-tes", "kalimat panjang milik tes"); err != nil {
		t.Fatal(err)
	}
	var sesi int
	if err := db.QueryRow(`SELECT count(*) FROM sesi WHERE akun_id = $1`, id).Scan(&sesi); err != nil || sesi != 0 {
		t.Fatalf("sesi tersisa sesudah ganti password: %d, %v", sesi, err)
	}
	if _, _, err := svc.Login(ctx, email, "sementara-tes"); !errors.Is(err, ErrLoginGagal) {
		t.Fatalf("password sementara sesudah diganti: %v", err)
	}
	if _, _, err := svc.Login(ctx, email, "kalimat panjang milik tes"); err != nil {
		t.Fatalf("password baru: %v", err)
	}
}

// --8<-- [end:tes-wajib-ganti]
