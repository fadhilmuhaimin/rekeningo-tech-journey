package main

// Tes daftar password bocor di /ganti-password (keputusan 661).
// Pembantu (siapkanTes, serverTes, kirimLogin, ...) ada di pengaman_test.go.

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// /ganti-password menolak password baru yang ada di daftar bocor, tanpa membedakan huruf besar/kecil, dan hanya
// daftar entri yang sudah lolos kebijakan panjang (15 karakter) yang bisa sampai ke pemeriksaan itu
// (ASVS 5.0.0 6.2.4: daftar dibandingkan setelah kebijakan; NIST SP 800-63B-4 3.1.1.2).
func TestGantiPasswordMenolakDaftarBocor(t *testing.T) {
	db := siapkanTes(t)
	s := serverTes(db, "per-akun", "koneksi")
	const id = 523
	ganti := func(baru string) (int, string) {
		body := fmt.Sprintf(`{"email":%q,"password_lama":%q,"password_baru":%q}`,
			emailAkun(id), fmt.Sprintf(passwordTes, id), baru)
		r := httptest.NewRequest(http.MethodPost, "/ganti-password", strings.NewReader(body))
		r.RemoteAddr = "127.0.0.1:50000"
		w := httptest.NewRecorder()
		s.gantiPassword(w, r)
		var p problem
		_ = json.Unmarshal(w.Body.Bytes(), &p)
		return w.Code, p.Type
	}
	for _, c := range []struct {
		baru string
		code int
		tipe string
	}{
		{"rekeningolestari", 422, "/problems/password-bocor"},
		{"REKENINGOLESTARI", 422, "/problems/password-bocor"},
		{"Rekeningolestari", 422, "/problems/password-bocor"},
		{"123456789012345", 422, "/problems/password-bocor"}, // tepat 15 karakter
		{"rekeningo123", 422, "/problems/password-lemah"},    // di daftar, tapi 12 karakter: kebijakan panjang dulu
		{"rekeningolestari1", 200, ""},                       // bukan entri daftar; harus kasus terakhir (password lama berganti)
	} {
		if code, tipe := ganti(c.baru); code != c.code || tipe != c.tipe {
			t.Errorf("ganti ke %q = %d %q; ingin %d %q", c.baru, code, tipe, c.code, c.tipe)
		}
	}
}

// Daftar yang tidak punya satu pun entri sepanjang kebijakan tidak pernah menolak apa pun: pemeriksaan daftar
// jadi kode mati. Tes ini menjaga supaya daftar lab tetap memuat entri yang bisa sampai ke pemeriksaan.
func TestDaftarBocorMemuatEntriSesuaiKebijakan(t *testing.T) {
	if err := muatBocor(); err != nil {
		t.Fatal(err)
	}
	sesuai := 0
	for p := range daftarBocor {
		if len([]rune(p)) >= panjangMinimumPassword {
			sesuai++
		}
	}
	if sesuai == 0 {
		t.Fatalf("daftar bocor (%d entri) tidak punya entri >= %d karakter: pemeriksaan daftar tidak pernah menolak",
			len(daftarBocor), panjangMinimumPassword)
	}
}
