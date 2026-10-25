package cache

import (
	"bufio"
	"context"
	"errors"
	"net"
	"strings"
	"sync"
	"testing"
	"time"
)

func jamTes() (func() time.Time, func(time.Duration)) {
	t := time.Date(2026, 10, 25, 11, 0, 0, 0, time.UTC)
	var mu sync.Mutex
	return func() time.Time { mu.Lock(); defer mu.Unlock(); return t },
		func(d time.Duration) { mu.Lock(); defer mu.Unlock(); t = t.Add(d) }
}

// Entri memori hidup tepat sampai TTL: 299 detik masih ada, 300 detik hilang.
func TestMemoriTTL(t *testing.T) {
	kini, maju := jamTes()
	m := BaruMemori(kini)
	ctx := context.Background()
	m.Simpan(ctx, "k", []byte("a"), 5*time.Minute)
	maju(299 * time.Second)
	if _, ada, _ := m.Ambil(ctx, "k"); !ada {
		t.Fatal("299 detik: entri harus masih ada")
	}
	maju(time.Second)
	if _, ada, _ := m.Ambil(ctx, "k"); ada {
		t.Fatal("300 detik: entri harus hilang")
	}
}

func TestMemoriHapusAwalan(t *testing.T) {
	kini, _ := jamTes()
	m := BaruMemori(kini)
	ctx := context.Background()
	for _, k := range []string{"katalog:1:semua", "katalog:1:7", "katalog:2:semua"} {
		m.Simpan(ctx, k, []byte("x"), time.Hour)
	}
	if n, _ := m.HapusAwalan(ctx, "katalog:1:"); n != 2 || m.Jumlah() != 1 {
		t.Fatalf("hapus awalan kota 1: %d terhapus, sisa %d (ingin 2 dan 1)", n, m.Jumlah())
	}
}

// Galat database tidak disimpan dan tidak membuang entri yang ada; galat cache dilewati ke database.
func TestBacaGalatDatabaseTidakMenyimpanDanTidakMenghapus(t *testing.T) {
	kini, _ := jamTes()
	k := &Katalog{P: BaruMemori(kini), TTL: time.Minute}
	ctx := context.Background()
	if _, err := k.Baca(ctx, "a", func(context.Context) ([]byte, error) { return nil, errors.New("db mati") }); err == nil {
		t.Fatal("galat database harus naik")
	}
	if _, ada, _ := k.P.Ambil(ctx, "a"); ada {
		t.Fatal("galat database tidak boleh disimpan")
	}
	k.P.Simpan(ctx, "b", []byte("lama"), time.Minute)
	k.Baca(ctx, "c", func(context.Context) ([]byte, error) { return nil, errors.New("db mati") })
	if _, ada, _ := k.P.Ambil(ctx, "b"); !ada || k.Hapus.Load() != 0 {
		t.Fatal("galat database tidak boleh membuang entri lain")
	}
}

type penyimpanRusak struct{}

func (penyimpanRusak) Ambil(context.Context, string) ([]byte, bool, error) {
	return nil, false, errors.New("redis mati")
}
func (penyimpanRusak) Simpan(context.Context, string, []byte, time.Duration) error {
	return errors.New("redis mati")
}
func (penyimpanRusak) Hapus(context.Context, string) (int, error) { return 0, errors.New("redis mati") }
func (penyimpanRusak) HapusAwalan(context.Context, string) (int, error) {
	return 0, errors.New("redis mati")
}

func TestBacaPenyimpanRusakJatuhKeDatabase(t *testing.T) {
	k := &Katalog{P: penyimpanRusak{}, TTL: time.Minute}
	for i := 0; i < 3; i++ {
		b, err := k.Baca(context.Background(), "a", func(context.Context) ([]byte, error) { return []byte("db"), nil })
		if err != nil || string(b) != "db" {
			t.Fatalf("baca %d: %q, %v", i, b, err)
		}
	}
	if k.DBBaca.Load() != 3 || k.Hit.Load() != 0 || k.GalatCache.Load() != 3 {
		t.Fatalf("db %d, hit %d, galat cache %d (ingin 3, 0, 3)", k.DBBaca.Load(), k.Hit.Load(), k.GalatCache.Load())
	}
}

func TestGerbangMenahanSampaiDilepas(t *testing.T) {
	g := BaruGerbang(GerbangCommit)
	selesai := make(chan struct{})
	go func() { g.Tahan(context.Background(), GerbangCommit); close(selesai) }()
	for i := 0; g.Menunggu(GerbangCommit) != 1; i++ {
		if i > 200 {
			t.Fatal("goroutine tidak tertahan")
		}
		time.Sleep(10 * time.Millisecond)
	}
	select {
	case <-selesai:
		t.Fatal("harus tertahan sebelum dilepas")
	default:
	}
	if !g.Lepas(GerbangCommit) {
		t.Fatal("lepas gagal")
	}
	<-selesai
	g.Tahan(context.Background(), GerbangIsi) // gerbang tidak aktif: langsung lewat
}

func TestBacaRESP(t *testing.T) {
	cek := func(masuk string, ingin any) {
		t.Helper()
		v, err := bacaRESP(bufio.NewReader(strings.NewReader(masuk)))
		if err != nil {
			t.Fatalf("%q: %v", masuk, err)
		}
		switch w := ingin.(type) {
		case string:
			if s, ok := v.(string); !ok || s != w {
				t.Fatalf("%q: %v", masuk, v)
			}
		case []byte:
			if s, ok := v.([]byte); !ok || string(s) != string(w) {
				t.Fatalf("%q: %v", masuk, v)
			}
		case int64:
			if s, ok := v.(int64); !ok || s != w {
				t.Fatalf("%q: %v", masuk, v)
			}
		case nil:
			if v != nil {
				t.Fatalf("%q: %v", masuk, v)
			}
		}
	}
	cek("+OK\r\n", "OK")
	cek(":42\r\n", int64(42))
	cek("$5\r\nhalo\n\r\n", []byte("halo\n"))
	cek("$-1\r\n", nil)
	v, err := bacaRESP(bufio.NewReader(strings.NewReader("*2\r\n$1\r\n0\r\n*2\r\n$3\r\nk:1\r\n$3\r\nk:2\r\n")))
	a, _ := v.([]any)
	if err != nil || len(a) != 2 || len(a[1].([]any)) != 2 {
		t.Fatalf("array bersarang: %v, %v", v, err)
	}
	if _, err := bacaRESP(bufio.NewReader(strings.NewReader("-ERR salah\r\n"))); err != ErrRedis("ERR salah") {
		t.Fatalf("galat Redis: %v", err)
	}
}

// Redis yang menerima koneksi tetapi tidak menjawab: satu operasi paling lama Batas, lalu galat.
func TestRedisMenggantungBerhentiDiBatas(t *testing.T) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()
	go func() {
		for {
			c, err := l.Accept()
			if err != nil {
				return
			}
			defer c.Close()
		}
	}()
	r := Redis{Alamat: l.Addr().String(), Batas: 100 * time.Millisecond}
	mulai := time.Now()
	if _, _, err := r.Ambil(context.Background(), "k"); err == nil {
		t.Fatal("harus galat")
	}
	if d := time.Since(mulai); d > 2*time.Second {
		t.Fatalf("menunggu %s: batas 100 ms tidak dipakai", d)
	}
}
