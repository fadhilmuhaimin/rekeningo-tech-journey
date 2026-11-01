package service

// Dua Service dengan satu database seperti dua instance di belakang proxy (ADR 26, ADR 27, M22). Butuh PostgreSQL
// (siapkan di db_test.go); penghitung bersama dipalsukan di memori.

import (
	"context"
	"errors"
	"testing"
	"time"
)

// --8<-- [start:tes-dua-instance]
// Dua instance, satu akun, sepuluh tebakan bergantian. Bucket di memori: kesepuluhnya sampai ke database (5 per
// instance), sedangkan kunci akun di database tetap satu: gagal_login berhenti di 5 dan akun terkunci sekali.
// Hitungan bersama: tebakan keenam sudah ditolak 429 di lapis akun. Kunci akun tidak berlipat di kedua kasus.
func TestDuaInstanceBatasAkunDanKunciDatabase(t *testing.T) {
	svc, db := siapkan(t)
	j := &jam{t: time.Now().UTC()}
	svc.kini = j.kini
	id, email := akunLogin(t, db, "password-benar-milik-tes", false)
	a, b := svc, svc // dua instance: bucket per akun masing-masing (Baru dipanggil sekali; salin yang baru)
	a.loginAkun, b.loginAkun = PembatasBaru(AmbangLoginAkun[0], AmbangLoginAkun[1]), PembatasBaru(AmbangLoginAkun[0], AmbangLoginAkun[1])
	tebak := func(s Service) error {
		_, _, err := s.Login(context.Background(), email, "tebakan-salah")
		return err
	}
	for i := 1; i <= 10; i++ {
		s := a
		if i%2 == 0 {
			s = b
		}
		if err := tebak(s); !errors.Is(err, ErrLoginGagal) {
			t.Fatalf("memori, tebakan %d: ingin ErrLoginGagal (sampai ke database), dapat %v", i, err)
		}
	}
	var gagal int
	var terkunci bool
	if err := db.QueryRow(`SELECT gagal_login, terkunci_sampai IS NOT NULL FROM akun WHERE id = $1`, id).Scan(&gagal, &terkunci); err != nil {
		t.Fatal(err)
	}
	if gagal != ambangGagal || !terkunci {
		t.Fatalf("kunci akun: gagal_login=%d terkunci=%v, ingin %d dan true: kunci tidak boleh berlipat", gagal, terkunci, ambangGagal)
	}

	// Hitungan bersama untuk akun lain.
	_, email2 := akunLogin(t, db, "password-benar-milik-tes", false)
	palsu := baruPalsu()
	bersama := func() Batas {
		return PembatasBersamaBaru(palsu, "tes:akun:", int(AmbangLoginAkun[0]), JendelaLogin, 50*time.Millisecond,
			PembatasBaru(AmbangLoginAkun[0], AmbangLoginAkun[1]))
	}
	a, b = a.DenganBatasLoginAkun(bersama()), b.DenganBatasLoginAkun(bersama())
	var lambat ErrTerlaluSering
	for i := 1; i <= 10; i++ {
		s := a
		if i%2 == 0 {
			s = b
		}
		_, _, err := s.Login(context.Background(), email2, "tebakan-salah")
		if i <= 5 && !errors.Is(err, ErrLoginGagal) {
			t.Fatalf("bersama, tebakan %d: ingin ErrLoginGagal, dapat %v", i, err)
		}
		if i > 5 && (!errors.As(err, &lambat) || lambat.Lapis != "akun") {
			t.Fatalf("bersama, tebakan %d: ingin 429 per akun, dapat %v", i, err)
		}
	}
}

// --8<-- [end:tes-dua-instance]
