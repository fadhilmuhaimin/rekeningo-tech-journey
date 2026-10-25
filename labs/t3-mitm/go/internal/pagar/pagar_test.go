package pagar

import "testing"

func TestLoopbackHanyaMenerimaAlamatLokal(t *testing.T) {
	boleh := []string{"127.0.0.1:9001", "127.0.0.1", "[::1]:9001", "::1", "localhost:9001", "LOCALHOST", "127.1.2.3:80"}
	for _, a := range boleh {
		if err := Loopback(a); err != nil {
			t.Errorf("%q harus lolos: %v", a, err)
		}
	}
	tolak := []string{"", ":9001", "0.0.0.0:9001", "[::]:9001", "192.168.1.5:9001", "10.0.0.1", "example.com:443", "localhost.example.com:80"}
	for _, a := range tolak {
		if err := Loopback(a); err == nil {
			t.Errorf("%q harus ditolak", a)
		}
	}
}

func TestLoopbackURL(t *testing.T) {
	if err := LoopbackURL("http://127.0.0.1:9002"); err != nil {
		t.Fatal(err)
	}
	if err := LoopbackURL("https://example.com"); err == nil {
		t.Fatal("host di luar mesin harus ditolak")
	}
}
