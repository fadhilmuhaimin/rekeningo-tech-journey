package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

var fixedFuture = time.Now().Add(8 * time.Hour)

// Tes ini tidak butuh database: hanya memeriksa gerbang cookie dan CSRF yang menjadi inti rekaman lab
// (output/web.txt, output/csrf.txt). Uji mutasi di README mengandalkan tes ini gagal saat satu baris dihapus.

func cookieDariRespons(t *testing.T, w *httptest.ResponseRecorder, nama string) *http.Cookie {
	t.Helper()
	for _, c := range w.Result().Cookies() {
		if c.Name == nama {
			return c
		}
	}
	t.Fatalf("cookie %q tidak ditulis; header Set-Cookie: %v", nama, w.Header()["Set-Cookie"])
	return nil
}

func TestAturCookieBenarHttpOnlySecureLaxAwalanHost(t *testing.T) {
	s := &server{} // escape/csp/cookie/csrf semua "" = benar
	w := httptest.NewRecorder()
	s.aturCookie(w, "token-contoh", fixedFuture)
	c := cookieDariRespons(t, w, "__Host-sesi")
	if !c.HttpOnly || !c.Secure || c.SameSite != http.SameSiteLaxMode {
		t.Fatalf("cookie benar harus HttpOnly+Secure+SameSite=Lax, dapat %+v", c)
	}
	if c.Domain != "" {
		t.Fatalf("cookie __Host- tidak boleh punya Domain, dapat %q", c.Domain)
	}
}

func TestAturCookieRentanTanpaHttpOnlyTanpaAwalanHost(t *testing.T) {
	s := &server{cookie: "rentan"}
	w := httptest.NewRecorder()
	s.aturCookie(w, "token-contoh", fixedFuture)
	c := cookieDariRespons(t, w, "sesi")
	if c.HttpOnly {
		t.Fatal("cookie rentan seharusnya tidak HttpOnly (bisa dibaca document.cookie)")
	}
}

func TestAturCookieSamesiteNoneMemaksaSecure(t *testing.T) {
	s := &server{samesite: "none", cookie: "rentan"}
	w := httptest.NewRecorder()
	s.aturCookie(w, "token-contoh", fixedFuture)
	c := cookieDariRespons(t, w, "sesi")
	if c.SameSite != http.SameSiteNoneMode || !c.Secure {
		t.Fatalf("-samesite none harus SameSite=None;Secure (RFC 6265bis §4.1.2.7), dapat %+v", c)
	}
}

func TestAturCookieBawaanMemberiLax(t *testing.T) {
	s := &server{}
	w := httptest.NewRecorder()
	s.aturCookie(w, "token-contoh", fixedFuture)
	c := cookieDariRespons(t, w, "__Host-sesi")
	if c.SameSite != http.SameSiteLaxMode {
		t.Fatalf("bawaan harus SameSite=Lax, dapat %+v", c)
	}
}

func TestCsrfSahMenolakOriginAsing(t *testing.T) {
	s := &server{}
	x := sesi{CsrfHash: hashToken("token-benar")}
	r := httptest.NewRequest("POST", "http://localhost:19194/api/menu/harga", nil)
	r.Header.Set("X-CSRF-Token", "token-benar")
	r.Header.Set("Origin", "http://penyerang.localhost:19195")
	if s.csrfSah(r, x) {
		t.Fatal("Origin lintas situs harus ditolak walau token benar")
	}
}

func TestCsrfSahMenolakSecFetchSiteLintasSitus(t *testing.T) {
	s := &server{}
	x := sesi{CsrfHash: hashToken("token-benar")}
	r := httptest.NewRequest("POST", "http://localhost:19194/api/menu/harga", nil)
	r.Header.Set("X-CSRF-Token", "token-benar")
	r.Header.Set("Sec-Fetch-Site", "cross-site")
	if s.csrfSah(r, x) {
		t.Fatal("Sec-Fetch-Site: cross-site harus ditolak walau token benar")
	}
}

func TestCsrfSahMenolakTokenSalahAtauKosong(t *testing.T) {
	s := &server{}
	x := sesi{CsrfHash: hashToken("token-benar")}
	r := httptest.NewRequest("POST", "http://localhost:19194/api/menu/harga", nil)
	if s.csrfSah(r, x) {
		t.Fatal("tanpa token harus ditolak")
	}
	r.Header.Set("X-CSRF-Token", "token-salah")
	if s.csrfSah(r, x) {
		t.Fatal("token salah harus ditolak")
	}
}

func TestCsrfSahMenerimaSameOriginDenganTokenBenar(t *testing.T) {
	s := &server{}
	x := sesi{CsrfHash: hashToken("token-benar")}
	r := httptest.NewRequest("POST", "http://localhost:19194/api/menu/harga", nil)
	r.Header.Set("X-CSRF-Token", "token-benar")
	r.Header.Set("Sec-Fetch-Site", "same-origin")
	r.Header.Set("Origin", "http://localhost:19194")
	if !s.csrfSah(r, x) {
		t.Fatal("same-origin dengan token benar harus lolos")
	}
}
