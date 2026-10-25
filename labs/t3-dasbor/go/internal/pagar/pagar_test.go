package pagar

import "testing"

func TestLoopbackURL(t *testing.T) {
	if err := LoopbackURL("http://localhost:19194"); err != nil {
		t.Fatal(err)
	}
	if err := LoopbackURL("http://penyerang.localhost:19195"); err != nil {
		t.Fatal(err)
	}
	if err := LoopbackURL("https://example.com"); err == nil {
		t.Fatal("host di luar mesin harus ditolak")
	}
}

func TestLoopbackHanyaMenerimaAlamatLokal(t *testing.T) {
	boleh := []string{
		"127.0.0.1:19194", "127.0.0.1", "[::1]:19194", "::1",
		"localhost:19194", "LOCALHOST", "penyerang.localhost:19195", "a.localhost", "127.1.2.3:80",
	}
	for _, a := range boleh {
		if err := Loopback(a); err != nil {
			t.Errorf("%q harus lolos: %v", a, err)
		}
	}
	tolak := []string{
		"", ":19194", "0.0.0.0:19194", "[::]:19194", "192.168.1.5:19194", "10.0.0.1",
		"example.com:443", "localhost.example.com:80", "notlocalhost:80",
	}
	for _, a := range tolak {
		if err := Loopback(a); err == nil {
			t.Errorf("%q harus ditolak", a)
		}
	}
}
