package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"
)

// Tes jadwal ulangan gateway tiruan: jeda, jumlah ulangan per kode status, waktu maya pada tanda tangan, dan
// pemberitahuan jam ke penerima. Penerima adalah server httptest yang menjawab kode yang diatur tes.

type penerima struct {
	srv   *httptest.Server
	mu    sync.Mutex
	kode  []int // jawaban per kiriman; yang terakhir dipakai bila kiriman lebih banyak
	ts    []int64
	tanda []string
	body  [][]byte
	jam   []int64
}

func penerimaBaru(t *testing.T, kode ...int) *penerima {
	p := &penerima{kode: kode}
	p.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p.mu.Lock()
		defer p.mu.Unlock()
		if r.URL.Path == "/lab/jam" {
			var in struct{ Ms int64 }
			json.NewDecoder(r.Body).Decode(&in)
			p.jam = append(p.jam, in.Ms)
			w.WriteHeader(http.StatusNoContent)
			return
		}
		b, _ := io.ReadAll(r.Body)
		ts, _ := strconv.ParseInt(r.Header.Get("X-Gateway-Timestamp"), 10, 64)
		p.ts, p.tanda, p.body = append(p.ts, ts), append(p.tanda, r.Header.Get("X-Gateway-Signature")), append(p.body, b)
		k := p.kode[len(p.kode)-1]
		if n := len(p.ts) - 1; n < len(p.kode) {
			k = p.kode[n]
		}
		w.WriteHeader(k)
		fmt.Fprintf(w, `{"hasil":"kode-%d"}`, k)
	}))
	t.Cleanup(p.srv.Close)
	return p
}

func mulaiTes() int64 { return time.Date(2026, 10, 27, 8, 0, 0, 0, time.UTC).Unix() }

func main1(t *testing.T, p *penerima, perintah perintahJadwal) ([]percobaan, string) {
	t.Helper()
	perintah.URLTarget, perintah.Mulai, perintah.Rahasia = p.srv.URL+"/webhook", mulaiTes(), "rahasia-uji"
	return mainkanJadwal(&http.Client{Timeout: 5 * time.Second}, perintah, []byte(`{"event_id":"e1"}`))
}

func TestJedaTotal342Menit(t *testing.T) {
	var total time.Duration
	for _, j := range jedaUlang {
		total += j
	}
	if total != 342*time.Minute {
		t.Errorf("total %s, harus 342 menit", total)
	}
	harus := []int{0, 2, 12, 42, 132, 342}
	for n, m := range harus {
		if got := int(offsetKiriman(n+1) / time.Minute); got != m {
			t.Errorf("kiriman ke-%d di menit %d, harus %d", n+1, got, m)
		}
	}
}

func TestJumlahUlangPerKode(t *testing.T) {
	harus := map[int]int{200: 0, 201: 0, 204: 0, 299: 0, 400: 2, 404: 2, 500: 1, 503: 4, 401: 5, 403: 5, 502: 5, 429: 5, 504: 5, 0: 5, 300: 5, 199: 5}
	for kode, n := range harus {
		if got := jumlahUlang(kode); got != n {
			t.Errorf("kode %d: %d ulangan, harus %d", kode, got, n)
		}
	}
}

func TestJadwalBerhentiMenurutKode(t *testing.T) {
	harus := map[int]int{200: 1, 400: 3, 404: 3, 500: 2, 503: 5, 401: 6, 502: 6}
	for kode, n := range harus {
		p := penerimaBaru(t, kode)
		hasil, berhenti := main1(t, p, perintahJadwal{})
		if len(hasil) != n {
			t.Errorf("kode %d: %d kiriman, harus %d", kode, len(hasil), n)
		}
		want := "jadwal habis"
		if kode == 200 {
			want = "diterima"
		}
		if berhenti != want {
			t.Errorf("kode %d: berhenti %q, harus %q", kode, berhenti, want)
		}
		for i, x := range hasil {
			if x.Ke != i+1 || x.Menit != int(offsetKiriman(i+1)/time.Minute) || x.Kode != kode {
				t.Errorf("kode %d, kiriman %d: %+v", kode, i+1, x)
			}
		}
	}
}

func TestJadwalTandaTanganMemakaiWaktuMayaDanByteAsli(t *testing.T) {
	p := penerimaBaru(t, 401)
	main1(t, p, perintahJadwal{})
	if len(p.ts) != 6 {
		t.Fatalf("%d kiriman", len(p.ts))
	}
	for i := range p.ts {
		want := mulaiTes() + int64(offsetKiriman(i+1)/time.Second)
		if p.ts[i] != want {
			t.Errorf("kiriman %d: timestamp %d, harus %d (waktu maya)", i+1, p.ts[i], want)
		}
		if p.tanda[i] != tandatangani("rahasia-uji", p.ts[i], p.body[i]) {
			t.Errorf("kiriman %d: tanda tangan tidak cocok dengan HMAC atas timestamp dan byte mentah", i+1)
		}
		if string(p.body[i]) != `{"event_id":"e1"}` {
			t.Errorf("kiriman %d: body %q berubah antar percobaan", i+1, p.body[i])
		}
	}
	if p.tanda[0] == p.tanda[1] {
		t.Error("tanda tangan sama di dua percobaan: tiap percobaan harus ditandatangani ulang dengan timestamp barunya")
	}
}

func TestJadwalMemberiTahuJamKePenerimaSebelumTiapKiriman(t *testing.T) {
	p := penerimaBaru(t, 503)
	_, _ = main1(t, p, perintahJadwal{URLJam: p.srv.URL + "/lab/jam"})
	if len(p.jam) != 5 {
		t.Fatalf("%d pemberitahuan jam, harus 5 (satu per kiriman)", len(p.jam))
	}
	for i, ms := range p.jam {
		if want := (mulaiTes() + int64(offsetKiriman(i+1)/time.Second)) * 1000; ms != want {
			t.Errorf("pemberitahuan %d: %d ms, harus %d", i+1, ms, want)
		}
	}
}

func TestJadwalDiterimaDiTengahBerhenti(t *testing.T) {
	p := penerimaBaru(t, 401, 401, 200)
	hasil, berhenti := main1(t, p, perintahJadwal{})
	if len(hasil) != 3 || berhenti != "diterima" || hasil[2].Menit != 12 {
		t.Errorf("%+v %s", hasil, berhenti)
	}
}

func TestJadwalDariDanSampai(t *testing.T) {
	p := penerimaBaru(t, 401)
	hasil, berhenti := main1(t, p, perintahJadwal{Sampai: 2})
	if len(hasil) != 2 || berhenti != "sesuai perintah lab" {
		t.Errorf("sampai 2: %+v %s", hasil, berhenti)
	}
	p2 := penerimaBaru(t, 401)
	hasil, berhenti = main1(t, p2, perintahJadwal{Dari: 3})
	if len(hasil) != 4 || hasil[0].Ke != 3 || hasil[0].Menit != 12 || hasil[3].Menit != 342 || berhenti != "jadwal habis" {
		t.Errorf("dari 3: %+v %s", hasil, berhenti)
	}
}

func TestJadwalKodeBerubahMemakaiKodeTerakhir(t *testing.T) {
	// 503 (empat ulangan) lalu 500 (satu ulangan): ulangan ke-1 sudah dipakai, jadi berhenti sesudah kiriman ke-2.
	p := penerimaBaru(t, 503, 500)
	hasil, _ := main1(t, p, perintahJadwal{})
	if len(hasil) != 2 {
		t.Errorf("%d kiriman, harus 2: %+v", len(hasil), hasil)
	}
}

func TestJadwalTanpaJawabanDihitungKodeLain(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hj, _ := w.(http.Hijacker)
		c, _, _ := hj.Hijack()
		c.Close()
	}))
	defer srv.Close()
	hasil, berhenti := mainkanJadwal(&http.Client{Timeout: time.Second}, perintahJadwal{URLTarget: srv.URL, Mulai: mulaiTes(), Rahasia: "r"}, []byte(`{}`))
	if len(hasil) != 6 || berhenti != "jadwal habis" || hasil[0].Kode != 0 || hasil[0].Hasil != "tidak ada jawaban" {
		t.Errorf("%+v %s", hasil, berhenti)
	}
}

func TestRotasiRahasiaLangsungDipakaiJadwal(t *testing.T) {
	p := penerimaBaru(t, 200)
	g := &gateway{order: map[string]*order{}, kunci: map[string]string{}, webhook: p.srv.URL + "/webhook", rahasia: "lama"}
	srv := httptest.NewServer(g.rute())
	defer srv.Close()
	kirim := func(path, isi string) (int, string) {
		r, err := http.Post(srv.URL+path, "application/json", strings.NewReader(isi))
		if err != nil {
			t.Fatal(err)
		}
		defer r.Body.Close()
		b, _ := io.ReadAll(r.Body)
		return r.StatusCode, string(b)
	}
	perintah := fmt.Sprintf(`{"event_id":"e1","order_id":"o1","jumlah":1000,"mulai":%d}`, mulaiTes())
	if s, _ := kirim("/lab/jadwal", perintah); s != 200 {
		t.Fatalf("jadwal: %d", s)
	}
	if s, _ := kirim("/lab/rahasia", `{"rahasia":"baru"}`); s != 204 {
		t.Fatalf("rotasi: %d", s)
	}
	if s, _ := kirim("/lab/rahasia", `{}`); s != 400 {
		t.Fatalf("rotasi tanpa rahasia: %d", s)
	}
	if s, _ := kirim("/lab/jadwal", perintah); s != 200 {
		t.Fatalf("jadwal kedua: %d", s)
	}
	if len(p.ts) != 2 {
		t.Fatalf("%d kiriman", len(p.ts))
	}
	if p.tanda[0] != tandatangani("lama", p.ts[0], p.body[0]) || p.tanda[1] != tandatangani("baru", p.ts[1], p.body[1]) {
		t.Error("kiriman sebelum rotasi harus bertanda rahasia lama, sesudahnya rahasia baru")
	}
}

func TestWebhookBodyCantikDitandatanganApaAdanyaDanDicekDihitung(t *testing.T) {
	p := penerimaBaru(t, 200)
	g := &gateway{order: map[string]*order{"o1": {OrderID: "o1", Jumlah: 1000, Status: "pending"}}, kunci: map[string]string{}, webhook: "http://127.0.0.1:1/tidak-dipakai", rahasia: "r"}
	srv := httptest.NewServer(g.rute())
	defer srv.Close()
	perintah := fmt.Sprintf(`{"event_id":"e1","order_id":"o1","body_cantik":true,"url_target":%q}`, p.srv.URL+"/webhook")
	r, err := http.Post(srv.URL+"/lab/webhook", "application/json", strings.NewReader(perintah))
	if err != nil || r.StatusCode != 200 {
		t.Fatalf("%v %v", err, r)
	}
	r.Body.Close()
	if len(p.body) != 1 || !strings.Contains(string(p.body[0]), "\n  \"event_id\"") {
		t.Fatalf("body %q bukan format berindentasi", p.body)
	}
	if p.tanda[0] != tandatangani("r", p.ts[0], p.body[0]) {
		t.Error("tanda tangan harus atas byte yang dikirim")
	}
	for i := 0; i < 2; i++ {
		r, _ := http.Get(srv.URL + "/orders/o1")
		r.Body.Close()
	}
	r, _ = http.Get(srv.URL + "/lab/dicek")
	var isi struct{ Dicek map[string]int }
	json.NewDecoder(r.Body).Decode(&isi)
	r.Body.Close()
	if isi.Dicek["o1"] != 2 {
		t.Errorf("dicek %v, harus o1 = 2", isi.Dicek)
	}
}
