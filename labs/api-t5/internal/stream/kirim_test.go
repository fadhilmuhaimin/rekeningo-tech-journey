package stream

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// penyediaTes menjawab `status` untuk `n` permintaan pertama, lalu 200. Menghitung permintaan.
func penyediaTes(t *testing.T, status int, n int) (*httptest.Server, *atomic.Int64) {
	t.Helper()
	var hitung atomic.Int64
	s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if hitung.Add(1) <= int64(n) {
			w.WriteHeader(status)
			return
		}
		w.Write([]byte(`{"name":"pesan/ok"}`))
	}))
	t.Cleanup(s.Close)
	return s, &hitung
}

func pengirimTes(url string, acak float64) (*Pengirim, *[]time.Duration) {
	p := BaruPengirim(url, 2, 100*time.Millisecond, 2*time.Second)
	var mu sync.Mutex
	var tunggu []time.Duration
	p.Acak = func() float64 { return acak }
	p.Tidur = func(_ context.Context, d time.Duration) { mu.Lock(); tunggu = append(tunggu, d); mu.Unlock() }
	return p, &tunggu
}

// Sesudah percobaan ke-k yang dijawab 429, pengirim menunggu acak × min(maks, dasar × 2^(k-1)). Dengan acak 1 batas atasnya
// terbaca persis: 100, 200, 400, 800, 1600 ms lalu 2000 ms (batas maks).
func TestBackoffEksponensialSampaiBatas(t *testing.T) {
	s, hitung := penyediaTes(t, http.StatusTooManyRequests, 6)
	p, tunggu := pengirimTes(s.URL, 1.0)
	hasil, err := p.Kirim(context.Background(), "tiruan-1", "id-1", "j", "")
	if err != nil || hasil != Terkirim {
		t.Fatalf("hasil %v, galat %v", hasil, err)
	}
	harap := []time.Duration{100, 200, 400, 800, 1600, 2000}
	if len(*tunggu) != len(harap) {
		t.Fatalf("menunggu %d kali, harus %d: %v", len(*tunggu), len(harap), *tunggu)
	}
	for i, h := range harap {
		if (*tunggu)[i] != h*time.Millisecond {
			t.Fatalf("tunggu ke-%d = %s, harus %s", i+1, (*tunggu)[i], h*time.Millisecond)
		}
	}
	if hitung.Load() != 7 {
		t.Fatalf("permintaan %d, harus 7 (6 kali 429 dan satu 200)", hitung.Load())
	}
	st := p.Statistik()
	if st.Ditolak429 != 6 || st.Diterima != 1 || len(st.TungguMaksMs) != 6 || st.TungguMaksMs[5] != 2000 {
		t.Fatalf("statistik: %+v", st)
	}
}

// Jitter: acak antara 0 dan batas. Dengan acak 0 pengirim tidak menunggu sama sekali, dengan acak 0,5 separuh batas.
func TestJitterPenuh(t *testing.T) {
	for _, c := range []struct {
		acak float64
		ms   time.Duration
	}{{0, 0}, {0.5, 50}} {
		s, _ := penyediaTes(t, http.StatusTooManyRequests, 1)
		p, tunggu := pengirimTes(s.URL, c.acak)
		if _, err := p.Kirim(context.Background(), "tiruan-1", "id-1", "j", ""); err != nil {
			t.Fatal(err)
		}
		if len(*tunggu) != 1 || (*tunggu)[0] != c.ms*time.Millisecond {
			t.Fatalf("acak %v: tunggu %v, harus %s", c.acak, *tunggu, c.ms*time.Millisecond)
		}
	}
}

func TestTanpaBackoffTidakMenunggu(t *testing.T) {
	s, hitung := penyediaTes(t, http.StatusTooManyRequests, 5)
	p, tunggu := pengirimTes(s.URL, 1.0)
	p.TanpaBackoff = true
	if _, err := p.Kirim(context.Background(), "tiruan-1", "id-1", "j", ""); err != nil {
		t.Fatal(err)
	}
	for _, d := range *tunggu {
		if d != 0 {
			t.Fatalf("mode tanpa backoff menunggu %s", d)
		}
	}
	if hitung.Load() != 6 {
		t.Fatalf("permintaan %d, harus 6", hitung.Load())
	}
}

func TestTidakTerdaftarBerhentiTanpaUlang(t *testing.T) {
	s, hitung := penyediaTes(t, http.StatusNotFound, 100)
	p, tunggu := pengirimTes(s.URL, 1.0)
	hasil, err := p.Kirim(context.Background(), "mati-1", "id-1", "j", "")
	if err != nil || hasil != TidakTerdaftar {
		t.Fatalf("hasil %v, galat %v", hasil, err)
	}
	if hitung.Load() != 1 || len(*tunggu) != 0 {
		t.Fatalf("404 harus satu permintaan tanpa menunggu: %d permintaan, tunggu %v", hitung.Load(), *tunggu)
	}
}

func TestMenyerahSesudahMaksPercobaan(t *testing.T) {
	s, hitung := penyediaTes(t, http.StatusServiceUnavailable, 1000)
	p, _ := pengirimTes(s.URL, 0)
	p.MaksPercobaan = 4
	if _, err := p.Kirim(context.Background(), "tiruan-1", "id-1", "j", ""); err != ErrMenyerah {
		t.Fatalf("galat %v, harus ErrMenyerah", err)
	}
	if hitung.Load() != 4 {
		t.Fatalf("permintaan %d, harus 4", hitung.Load())
	}
	if st := p.Statistik(); st.GagalLain != 4 || st.Ditolak429 != 0 {
		t.Fatalf("503 harus dihitung gagal lain, bukan 429: %+v", st)
	}
}

// Laju: slot berjarak `selang` dan slot yang sudah lewat tidak dikejar (tidak ada semburan sesudah jeda).
func TestLajuJarakSlotTanpaSemburan(t *testing.T) {
	l := BaruLaju(100) // 10 ms
	sekarang := time.Unix(100, 0)
	l.kini = func() time.Time { return sekarang }
	var slot []time.Time
	l.tidurSlot = func(_ context.Context, t time.Time) { slot = append(slot, t) }
	for i := 0; i < 3; i++ {
		l.Tunggu(context.Background())
	}
	for i := 1; i < 3; i++ {
		if d := slot[i].Sub(slot[i-1]); d != 10*time.Millisecond {
			t.Fatalf("jarak slot %d = %s, harus 10 ms", i, d)
		}
	}
	sekarang = sekarang.Add(5 * time.Second) // lama menganggur: slot berikutnya sekarang, bukan 500 slot tertunggak
	l.Tunggu(context.Background())
	if !slot[3].Equal(sekarang) {
		t.Fatalf("slot sesudah jeda %s, harus %s", slot[3], sekarang)
	}
	l.Tunggu(context.Background())
	if d := slot[4].Sub(slot[3]); d != 10*time.Millisecond {
		t.Fatalf("slot sesudah jeda berjarak %s, harus 10 ms", d)
	}
}

func TestLajuNolTanpaBatas(t *testing.T) {
	l := BaruLaju(0)
	n := 0
	l.tidurSlot = func(context.Context, time.Time) { n++ }
	for i := 0; i < 5; i++ {
		l.Tunggu(context.Background())
	}
	if n != 0 {
		t.Fatalf("laju 0 menunggu %d kali", n)
	}
	var nilLaju *Laju
	nilLaju.Tunggu(context.Background()) // nil tidak panik
}
