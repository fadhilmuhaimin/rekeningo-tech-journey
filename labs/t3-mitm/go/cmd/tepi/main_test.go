package main

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSamarkanAuthorizationKecualiMentah(t *testing.T) {
	r := httptest.NewRequest("POST", "/kiriman", nil)
	r.Header.Set("Authorization", "Bearer rahasia123")
	r.Header.Set("Cookie", "__Host-sesi=rahasia456")
	if b := baris(r, 201, false); strings.Contains(b, "rahasia") || !strings.Contains(b, "[disamarkan]") {
		t.Fatalf("log tersamar bocor: %s", b)
	}
	if b := baris(r, 201, true); !strings.Contains(b, "rahasia123") {
		t.Fatalf("log mentah harus menyalin token: %s", b)
	}
}
