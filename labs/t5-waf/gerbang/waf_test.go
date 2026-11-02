package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"regexp"
	"strconv"
	"strings"
	"testing"
)

type payload struct {
	Kelas  string  `json:"kelas"`
	Nama   string  `json:"nama"`
	Metode string  `json:"metode"`
	Jalur  string  `json:"jalur"`
	Isi    *string `json:"isi"`
}

type daftarPayload struct {
	Serangan []payload `json:"serangan"`
	Sah      []payload `json:"sah"`
}

func muatPayload(t testing.TB) daftarPayload {
	t.Helper()
	b, err := os.ReadFile("../payload.json")
	if err != nil {
		t.Fatal(err)
	}
	var d daftarPayload
	if err := json.Unmarshal(b, &d); err != nil {
		t.Fatal(err)
	}
	return d
}

// permintaan membangun http.Request seperti yang diterima gerbang dari kasir POS: Host bernama (bukan alamat IP),
// User-Agent, Accept, dan Content-Length untuk POST.
func (p payload) permintaan() (*http.Request, []byte) {
	var body []byte
	if p.Isi != nil {
		body = []byte(*p.Isi)
	}
	r := httptest.NewRequest(p.Metode, p.Jalur, strings.NewReader(string(body)))
	r.Host = "pos.rekeningo.example"
	r.RemoteAddr = "127.0.0.1:50000"
	r.Header.Set("User-Agent", "pos-tiruan/1.0")
	r.Header.Set("Accept", "application/json")
	if p.Isi != nil {
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("Content-Length", strconv.Itoa(len(body)))
	}
	return r, body
}

func bukaWAFTes(t testing.TB, mesin string) *PenjagaWAF {
	t.Helper()
	w, err := BukaWAF("../crs", mesin)
	if err != nil {
		t.Fatal(err)
	}
	return w
}

func ada(aturan []int, id int) bool {
	for _, a := range aturan {
		if a == id {
			return true
		}
	}
	return false
}

// Keluarga aturan CRS 4.30.0 yang diharapkan menangkap tiap kelas: 942 (SQLi), 941 (XSS), 930 (LFI, naik direktori).
var keluarga = map[string]int{"sqli": 942, "xss": 941, "traversal": 930}

var polaSkor = regexp.MustCompile(`^Inbound Anomaly Score Exceeded \(Total Score: (\d+)\)$`)

// Setiap payload serangan diblokir 403 oleh aturan evaluasi 949110 (skor anomali lewat ambang 5), dan ada satu aturan
// dari keluarga kelasnya yang ikut cocok. Lingkup: delapan string uji di payload.json, paranoia level 1, CRS 4.30.0.
func TestWAFSeranganDiblokir(t *testing.T) {
	w := bukaWAFTes(t, "On")
	d := muatPayload(t)
	if len(d.Serangan) != 8 {
		t.Fatalf("payload serangan: %d, harus 8", len(d.Serangan))
	}
	for _, p := range d.Serangan {
		r, body := p.permintaan()
		k, err := w.Periksa(r, body)
		if err != nil {
			t.Fatalf("%s: %v", p.Nama, err)
		}
		if !k.Blokir || k.Status != 403 || !ada(k.Aturan, 949110) {
			t.Errorf("%s: blokir=%v status=%d aturan=%v", p.Nama, k.Blokir, k.Status, k.Aturan)
			continue
		}
		if m := polaSkor.FindStringSubmatch(k.Pesan); m == nil {
			t.Errorf("%s: pesan %q", p.Nama, k.Pesan)
		} else if n, _ := strconv.Atoi(m[1]); n < 5 {
			t.Errorf("%s: skor %d di bawah ambang 5", p.Nama, n)
		}
		found := false
		for _, a := range k.Aturan {
			if a/1000 == keluarga[p.Kelas] {
				found = true
			}
		}
		if !found {
			t.Errorf("%s: tidak ada aturan keluarga %d di %v", p.Nama, keluarga[p.Kelas], k.Aturan)
		}
	}
}

// Payload POS yang sah tidak diblokir, dan tidak ada satu pun aturan cocok. Jumlahnya dihitung: 37 diuji, 0 diblokir.
func TestWAFSahLolos(t *testing.T) {
	w := bukaWAFTes(t, "On")
	d := muatPayload(t)
	if len(d.Sah) != 37 {
		t.Fatalf("payload sah: %d, harus 37", len(d.Sah))
	}
	for _, p := range d.Sah {
		r, body := p.permintaan()
		k, err := w.Periksa(r, body)
		if err != nil || k.Blokir || len(k.Aturan) != 0 {
			t.Errorf("%s: blokir=%v aturan=%v err=%v", p.Nama, k.Blokir, k.Aturan, err)
		}
	}
}

// Mesin DetectionOnly (mode rentan waf-deteksi): aturan yang sama cocok dan skornya sama, tetapi tidak ada yang diblokir.
func TestWAFDeteksiSaja(t *testing.T) {
	w := bukaWAFTes(t, "DetectionOnly")
	for _, p := range muatPayload(t).Serangan {
		r, body := p.permintaan()
		k, err := w.Periksa(r, body)
		if err != nil || k.Blokir {
			t.Errorf("%s: blokir=%v err=%v", p.Nama, k.Blokir, err)
		}
		if !ada(k.Aturan, keluarga[p.Kelas]*1000+100) && !ada(k.Aturan, 930100) && !ada(k.Aturan, 941100) {
			t.Errorf("%s: temuan tetap dicatat, dapat %v", p.Nama, k.Aturan)
		}
	}
}

// Ambang 5: satu temuan kecil tanpa serangan (Host berupa alamat IP, 3 poin) tidak memblokir payload yang sah,
// tetapi terlihat di daftar aturan. Itu alasan POS tiruan memakai Host bernama.
func TestWAFTemuanKecilDiBawahAmbang(t *testing.T) {
	w := bukaWAFTes(t, "On")
	p := muatPayload(t).Sah[1]
	r, body := p.permintaan()
	r.Host = "127.0.0.1:8080"
	k, err := w.Periksa(r, body)
	if err != nil || k.Blokir || !ada(k.Aturan, 920350) {
		t.Fatalf("Host berupa IP: blokir=%v aturan=%v err=%v", k.Blokir, k.Aturan, err)
	}
}

// JSON rusak dijawab 400 oleh aturan 200002 sebelum CRS menilai isinya.
func TestWAFJSONRusak(t *testing.T) {
	w := bukaWAFTes(t, "On")
	bad := `{"nominal":25000,`
	p := payload{Metode: "POST", Jalur: "/pos/v1/merchant/30001/qr", Isi: &bad}
	r, body := p.permintaan()
	k, err := w.Periksa(r, body)
	if err != nil || !k.Blokir || k.Status != 400 || !ada(k.Aturan, 200002) {
		t.Fatalf("JSON rusak: blokir=%v status=%d aturan=%v err=%v", k.Blokir, k.Status, k.Aturan, err)
	}
}

func TestBukaWAFGagalKeras(t *testing.T) {
	if _, err := BukaWAF(t.TempDir(), "On"); err == nil {
		t.Fatal("folder tanpa waf.conf harus gagal")
	}
	if _, err := BukaWAF("../crs", "Off"); err == nil {
		t.Fatal("mesin Off tidak boleh dikenal")
	}
}
