package handler

import (
	"net/http/httptest"
	"testing"
)

// Nama skema di header Authorization tidak peka huruf (RFC 9110 §11.1).
func TestTokenBearer(t *testing.T) {
	kasus := []struct {
		header, token string
		ada           bool
	}{
		{"Bearer abc", "abc", true},
		{"bearer abc", "abc", true},
		{"BEARER abc", "abc", true},
		{"Bearer ", "", true},
		{"", "", false},
		{"Basic abc", "", false},
		{"Bearerabc", "", false},
	}
	for _, k := range kasus {
		r := httptest.NewRequest("GET", "/akun/419", nil)
		if k.header != "" {
			r.Header.Set("Authorization", k.header)
		}
		token, ada := tokenBearer(r)
		if token != k.token || ada != k.ada {
			t.Errorf("Authorization %q: (%q, %v), ingin (%q, %v)", k.header, token, ada, k.token, k.ada)
		}
	}
}
