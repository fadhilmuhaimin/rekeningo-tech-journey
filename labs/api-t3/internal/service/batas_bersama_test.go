package service

// Tes batas login bersama antar instance (ADR 27, keputusan 965): penghitung palsu di memori menggantikan Redis,
// jadi tes ini jalan tanpa Redis dan tanpa PostgreSQL. Tes dengan Redis sungguhan ada di internal/redisbatas;
// tes dengan dua Service dan database sungguhan di instance_test.go.

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"
)

// penghitungPalsu meniru kontrak Penghitung: hitungan per key naik satu per panggilan, dibagi semua pemakainya.
type penghitungPalsu struct {
	mu      sync.Mutex
	n       map[string]int64
	galat   error
	tahan   chan struct{} // bila tidak nil: Naik menunggu channel ini atau konteks selesai (Redis menggantung)
	panggil int
}

func baruPalsu() *penghitungPalsu { return &penghitungPalsu{n: map[string]int64{}} }

func (p *penghitungPalsu) Naik(ctx context.Context, key string, jendela time.Duration) (int64, time.Duration, error) {
	if p.tahan != nil {
		select {
		case <-p.tahan:
		case <-ctx.Done():
			return 0, 0, ctx.Err()
		case <-time.After(3 * time.Second):
			// Pengaman tes: tanpa batas waktu dari PembatasBersama, tes gagal setelah 3 detik, bukan menggantung
			// sampai batas waktu `go test` (10 menit).
			return 0, 0, errors.New("penghitung palsu menggantung lebih dari 3 detik")
		}
	}
	p.mu.Lock()
	defer p.mu.Unlock()
	p.panggil++
	if p.galat != nil {
		return 0, 0, p.galat
	}
	p.n[key]++
	return p.n[key], 42 * time.Second, nil
}

// bersamaIP membuat satu pembatas bersama seperti di cmd/api: batas dan jendela login per IP.
func bersamaIP(h Penghitung, timeout time.Duration) *PembatasBersama {
	return PembatasBersamaBaru(h, "tes:ip:", int(AmbangLoginIP[0]), JendelaLogin, timeout,
		PembatasBaru(AmbangLoginIP[0], AmbangLoginIP[1]))
}

// --8<-- [start:tes-bersama]
// Dua instance, satu IP, 24 percobaan bergantian: dengan bucket di memori 20 lolos (10 per instance, rekaman M22);
// dengan hitungan bersama tepat 10 lolos, siapa pun yang menjawab.
func TestDuaInstanceBerbagiSatuHitungan(t *testing.T) {
	kini := time.Unix(1_700_000_000, 0)
	memA, memB := PembatasBaru(AmbangLoginIP[0], AmbangLoginIP[1]), PembatasBaru(AmbangLoginIP[0], AmbangLoginIP[1])
	palsu := baruPalsu()
	a, b := bersamaIP(palsu, 50*time.Millisecond), bersamaIP(palsu, 50*time.Millisecond)
	var lolosMemori, lolosBersama int
	for i := 0; i < 24; i++ {
		m, s := memA, a
		if i%2 == 1 {
			m, s = memB, b
		}
		if ok, _ := m.Izinkan("203.0.113.9", kini); ok {
			lolosMemori++
		}
		if ok, _ := s.Izinkan("203.0.113.9", kini); ok {
			lolosBersama++
		}
	}
	if lolosMemori != 20 || lolosBersama != 10 {
		t.Fatalf("memori %d (ingin 20), bersama %d (ingin 10)", lolosMemori, lolosBersama)
	}
	if bersama, jatuh := a.Statistik(); bersama != 12 || jatuh != 0 {
		t.Fatalf("instance A: bersama %d, jatuh %d (ingin 12 dan 0)", bersama, jatuh)
	}
}

// --8<-- [end:tes-bersama]

func TestBatasBersamaMenolakDenganSisaJendela(t *testing.T) {
	palsu := baruPalsu()
	p := bersamaIP(palsu, 50*time.Millisecond)
	for i := 0; i < 10; i++ {
		if ok, _ := p.Izinkan("x", time.Now()); !ok {
			t.Fatalf("percobaan %d ditolak, batasnya 10", i+1)
		}
	}
	ok, tunggu := p.Izinkan("x", time.Now())
	if ok || tunggu != 42*time.Second {
		t.Fatalf("percobaan 11: ok=%v tunggu=%v, ingin ditolak dengan sisa jendela 42s", ok, tunggu)
	}
	// Retry-After tidak boleh 0 walau sisa jendela sudah di bawah satu detik (RFC 9110: bilangan bulat detik).
	palsu.n["tes:ip:"+kunciRedis("y")] = 10
	pendek := PembatasBersamaBaru(palsuSisa{palsu, 300 * time.Millisecond}, "tes:ip:", 10, JendelaLogin, 0, PembatasBaru(1, 1))
	if ok, tunggu := pendek.Izinkan("y", time.Now()); ok || tunggu != time.Second {
		t.Fatalf("sisa 300ms: ok=%v tunggu=%v, ingin ditolak dengan 1s", ok, tunggu)
	}
}

type palsuSisa struct {
	*penghitungPalsu
	sisa time.Duration
}

func (p palsuSisa) Naik(ctx context.Context, key string, j time.Duration) (int64, time.Duration, error) {
	n, _, err := p.penghitungPalsu.Naik(ctx, key, j)
	return n, p.sisa, err
}

// --8<-- [start:tes-jatuh]
// Redis gagal: pemeriksaan jatuh ke bucket lokal. Login tidak ikut mati, dan batasnya kembali ke per instance.
func TestRedisGagalJatuhKeBucketLokal(t *testing.T) {
	palsu := baruPalsu()
	palsu.galat = errors.New("connection refused")
	p := bersamaIP(palsu, 50*time.Millisecond)
	lolos := 0
	for i := 0; i < 12; i++ {
		if ok, _ := p.Izinkan("203.0.113.9", time.Unix(1_700_000_000, 0)); ok {
			lolos++
		}
	}
	if lolos != 10 {
		t.Fatalf("bucket lokal meloloskan %d dari 12, ingin 10 (kapasitas)", lolos)
	}
	if bersama, jatuh := p.Statistik(); bersama != 0 || jatuh != 12 {
		t.Fatalf("bersama %d, jatuh %d, ingin 0 dan 12", bersama, jatuh)
	}
}

// --8<-- [end:tes-jatuh]

// Redis menggantung (koneksi terbuka, tidak menjawab): pemeriksaan berhenti di batas waktu, tidak menunggu.
func TestRedisMenggantungBerhentiDiBatasWaktu(t *testing.T) {
	palsu := baruPalsu()
	palsu.tahan = make(chan struct{}) // tidak pernah ditutup
	p := bersamaIP(palsu, 50*time.Millisecond)
	mulai := time.Now()
	ok, _ := p.Izinkan("203.0.113.9", time.Unix(1_700_000_000, 0))
	if lama := time.Since(mulai); lama > 2*time.Second {
		t.Fatalf("pemeriksaan menunggu %v, batasnya 50 ms", lama)
	}
	if !ok {
		t.Fatal("percobaan pertama ditolak: bucket lokal masih penuh")
	}
	if _, jatuh := p.Statistik(); jatuh != 1 {
		t.Fatalf("jatuh %d, ingin 1", jatuh)
	}
}

func TestKunciRedisTidakMemuatEmailAtauAlamat(t *testing.T) {
	palsu := baruPalsu()
	p := bersamaIP(palsu, 50*time.Millisecond)
	p.Izinkan("budi@lestari.example", time.Now())
	p.Izinkan("203.0.113.9", time.Now())
	for k := range palsu.n {
		if strings.Contains(k, "@") || strings.Contains(k, "203.0.113") {
			t.Fatalf("key di Redis memuat data pribadi: %q", k)
		}
		if !strings.HasPrefix(k, "tes:ip:") || len(k) != len("tes:ip:")+32 {
			t.Fatalf("key tidak berbentuk awalan + 32 heks: %q", k)
		}
	}
}
