package handler

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"lab/apit5/internal/repo"
	"lab/apit5/internal/service"
)

// Tes API mitra POS (lab t5-waf, ADR 56, M50): cakupan kunci, rahasia gerbang, dan Idempotency-Key. Server httptest
// dengan Server.Rute() yang sama dengan lab, PostgreSQL schema tes (LAB_TES_SCHEMA). Pemeriksaan di gerbang
// (WAF, tanda tangan, kuota) diuji di labs/t5-waf/gerbang.

const rahasiaGerbangTes = "rahasia-gerbang-tes"

// posLab: dua mitra, masing-masing dengan satu merchant terverifikasi, dan server dengan rute POS.
type posLab struct {
	l                    *lingkunganQR
	mitraA, mitraB       int64
	merchantA, merchantB int64
}

func siapkanPOS(t *testing.T, rentan string) *posLab {
	t.Helper()
	l := siapkanQR(t)
	p := &posLab{l: l}
	buatMitra := func(nama string) int64 {
		var id int64
		if err := l.db.QueryRow(`INSERT INTO mitra_pos (nama, kunci_hash, kuota_per_detik) VALUES ($1, md5(random()::text || clock_timestamp()::text), 100) RETURNING id`, nama).Scan(&id); err != nil {
			t.Fatal(err)
		}
		return id
	}
	p.mitraA, p.mitraB = buatMitra("Mitra A tes"), buatMitra("Mitra B tes")
	p.merchantA = l.akun("merchant", "terverifikasi", "aktif", 0)
	p.merchantB = l.akun("merchant", "terverifikasi", "aktif", 0)
	for m, a := range map[int64]int64{p.mitraA: p.merchantA, p.mitraB: p.merchantB} {
		if _, err := l.db.Exec(`UPDATE akun SET mitra_pos_id = $1 WHERE id = $2`, m, a); err != nil {
			t.Fatal(err)
		}
	}
	svc := service.Baru(repo.Baru(l.db), time.Hour).DenganJam(l.jam)
	srv := httptest.NewServer(Baru(svc).DenganRentan(rentan).DenganPOS(rahasiaGerbangTes).Rute())
	t.Cleanup(srv.Close)
	l.url = srv.URL
	return p
}

// dari mengirim satu permintaan seperti yang diteruskan gerbang: rahasia gerbang dan id mitra di kepala.
func (p *posLab) dari(mitra int64, method, path, body string, kepala ...string) (int, map[string]any) {
	p.l.t.Helper()
	h := append([]string{"X-Gerbang-Rahasia", rahasiaGerbangTes, "X-Mitra-Id", fmt.Sprint(mitra)}, kepala...)
	st, _, isi := p.l.kirim(method, path, "", body, h...)
	return st, isi
}

func qrPath(merchant int64) string { return fmt.Sprintf("/pos/v1/merchant/%d/qr", merchant) }

// seedKunci: key tes disimpan di database dan berlaku global, jadi tiap proses tes memakai awalan sendiri.
var seedKunci = uint32(time.Now().UnixNano())

func uuidKunci(n int) string { return fmt.Sprintf(`"%08x-0000-4000-8000-%012d"`, seedKunci, n) }

func TestPOSBuatDanBacaQR(t *testing.T) {
	p := siapkanPOS(t, "")
	st, isi := p.dari(p.mitraA, "POST", qrPath(p.merchantA), `{"nominal":25000,"referensi":"MEJA 12"}`, "Idempotency-Key", uuidKunci(1))
	if st != 201 || isi["jenis"] != "dinamis" || isi["status"] != "aktif" || isi["referensi"] != "MEJA 12" {
		t.Fatalf("buat QR: %d %v", st, isi)
	}
	id := isi["id"].(string)
	st, isi = p.dari(p.mitraA, "GET", qrPath(p.merchantA)+"/"+id, "")
	if st != 200 || isi["id"] != id || isi["status"] != "aktif" {
		t.Fatalf("baca QR: %d %v", st, isi)
	}
	// Sesudah masa berlaku (5 menit, Asumsi lab) QR dinamis yang belum dibayar dijawab kedaluwarsa.
	p.l.maju(10 * time.Minute)
	if st, isi = p.dari(p.mitraA, "GET", qrPath(p.merchantA)+"/"+id, ""); st != 200 || isi["status"] != "kedaluwarsa" {
		t.Fatalf("QR kedaluwarsa: %d %v", st, isi)
	}
}

// Cakupan kunci: merchant milik mitra lain, merchant yang tidak ada, dan akun yang bukan merchant dijawab 404 yang sama.
func TestPOSCakupanMerchant(t *testing.T) {
	p := siapkanPOS(t, "")
	pemakai := p.l.akun("pemakai", "terverifikasi", "aktif", 0)
	for nama, merchant := range map[string]int64{"milik mitra lain": p.merchantB, "tidak ada": 999999999, "bukan merchant": pemakai} {
		st, isi := p.dari(p.mitraA, "POST", qrPath(merchant), `{"nominal":25000}`, "Idempotency-Key", uuidKunci(2))
		if st != 404 || isi["type"] != "/problems/tidak-ditemukan" {
			t.Errorf("%s, POST: %d %v", nama, st, isi)
		}
		st, isi = p.dari(p.mitraA, "GET", qrPath(merchant)+"/00000000-0000-4000-8000-000000000000", "")
		if st != 404 || isi["type"] != "/problems/tidak-ditemukan" {
			t.Errorf("%s, GET: %d %v", nama, st, isi)
		}
	}
	var n int
	if err := p.l.db.QueryRow(`SELECT count(*) FROM qr WHERE akun_id = $1`, p.merchantB).Scan(&n); err != nil || n != 0 {
		t.Fatalf("merchant B mendapat %d QR dari kunci mitra A (err %v)", n, err)
	}
}

// Merchant sendiri sah, tetapi QR milik merchant lain tidak terbaca walau id-nya diketahui.
func TestPOSQRMilikMerchantLain(t *testing.T) {
	p := siapkanPOS(t, "")
	_, isiB := p.dari(p.mitraB, "POST", qrPath(p.merchantB), `{"nominal":30000}`, "Idempotency-Key", uuidKunci(3))
	idB := isiB["id"].(string)
	st, isi := p.dari(p.mitraA, "GET", qrPath(p.merchantA)+"/"+idB, "")
	if st != 404 || isi["type"] != "/problems/tidak-ditemukan" {
		t.Fatalf("QR milik merchant B lewat merchant A: %d %v", st, isi)
	}
	if st, _ = p.dari(p.mitraB, "GET", qrPath(p.merchantB)+"/"+idB, ""); st != 200 {
		t.Fatalf("pemilik sendiri: %d", st)
	}
}

// Mode rentan pos-tanpa-cakupan: kunci satu mitra membuka merchant mitra lain (yang dicegah TestPOSCakupanMerchant).
func TestPOSRentanTanpaCakupan(t *testing.T) {
	p := siapkanPOS(t, service.RentanPosTanpaCakupan)
	_, isiB := p.dari(p.mitraB, "POST", qrPath(p.merchantB), `{"nominal":30000}`, "Idempotency-Key", uuidKunci(4))
	idB := isiB["id"].(string)
	st, isi := p.dari(p.mitraA, "GET", qrPath(p.merchantB)+"/"+idB, "")
	if st != 200 || isi["id"] != idB {
		t.Fatalf("mode rentan harus membuka merchant B untuk mitra A: %d %v", st, isi)
	}
}

// Rahasia gerbang: tanpa kepala itu, atau dengan nilai lain, permintaan ditolak 401 sebelum apa pun dibaca.
func TestPOSTanpaRahasiaGerbang(t *testing.T) {
	p := siapkanPOS(t, "")
	for nama, kepala := range map[string][]string{
		"tanpa kepala":   {"X-Mitra-Id", fmt.Sprint(p.mitraA)},
		"rahasia salah":  {"X-Gerbang-Rahasia", rahasiaGerbangTes + "x", "X-Mitra-Id", fmt.Sprint(p.mitraA)},
		"tanpa id mitra": {"X-Gerbang-Rahasia", rahasiaGerbangTes},
		"id mitra rusak": {"X-Gerbang-Rahasia", rahasiaGerbangTes, "X-Mitra-Id", "abc"},
	} {
		st, _, isi := p.l.kirim("GET", qrPath(p.merchantA)+"/00000000-0000-4000-8000-000000000000", "", "", kepala...)
		if st != 401 || isi["type"] != "/problems/bukan-dari-gerbang" {
			t.Errorf("%s: %d %v", nama, st, isi)
		}
	}
}

// Idempotency-Key: pengulangan dengan key yang sama menghasilkan QR yang sama dan satu baris; isi lain dengan key
// yang sama ditolak 422. Tanpa key, dua POST yang sama menghasilkan dua QR (versi pertama; gerbang yang menolaknya 400).
func TestPOSIdempotensi(t *testing.T) {
	p := siapkanPOS(t, "")
	hitung := func() int {
		var n int
		if err := p.l.db.QueryRow(`SELECT count(*) FROM qr WHERE akun_id = $1`, p.merchantA).Scan(&n); err != nil {
			t.Fatal(err)
		}
		return n
	}
	st1, a := p.dari(p.mitraA, "POST", qrPath(p.merchantA), `{"nominal":25000}`, "Idempotency-Key", uuidKunci(5))
	st2, b := p.dari(p.mitraA, "POST", qrPath(p.merchantA), `{"nominal":25000}`, "Idempotency-Key", uuidKunci(5))
	if st1 != 201 || st2 != 201 || a["id"] != b["id"] || hitung() != 1 {
		t.Fatalf("ulangan dengan key sama: %d %d %v %v, %d baris", st1, st2, a["id"], b["id"], hitung())
	}
	if st, isi := p.dari(p.mitraA, "POST", qrPath(p.merchantA), `{"nominal":99000}`, "Idempotency-Key", uuidKunci(5)); st != 422 {
		t.Fatalf("key sama, isi lain: %d %v", st, isi)
	}
	_, c := p.dari(p.mitraA, "POST", qrPath(p.merchantA), `{"nominal":25000}`)
	_, d := p.dari(p.mitraA, "POST", qrPath(p.merchantA), `{"nominal":25000}`)
	if c["id"] == d["id"] || hitung() != 3 {
		t.Fatalf("tanpa key harus dua QR berbeda: %v %v, %d baris", c["id"], d["id"], hitung())
	}
}

func TestPOSValidasi(t *testing.T) {
	p := siapkanPOS(t, "")
	panjang := strings.Repeat("a", 101)
	for nama, c := range map[string]struct {
		body, ket string
		key       int
	}{
		"referensi 101 karakter": {`{"nominal":25000,"referensi":"` + panjang + `"}`, "referensi", 6},
		"nominal hilang":         {`{"referensi":"x"}`, "nominal", 7},
	} {
		st, isi := p.dari(p.mitraA, "POST", qrPath(p.merchantA), c.body, "Idempotency-Key", uuidKunci(c.key))
		if st != 400 || !strings.Contains(fmt.Sprint(isi["errors"]), c.ket) {
			t.Errorf("%s: %d %v", nama, st, isi)
		}
	}
	if st, _ := p.dari(p.mitraA, "GET", qrPath(p.merchantA)+"/bukan-uuid", ""); st != 404 {
		t.Errorf("id QR bukan UUID: %d", st)
	}
}

// Tanpa -pos-rahasia rute /pos/v1 tidak ada.
func TestPOSRuteTidakAdaTanpaRahasia(t *testing.T) {
	l := siapkanQR(t)
	resp, err := http.Get(l.url + "/pos/v1/merchant/1/qr/x")
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != 404 {
		t.Fatalf("rute POS tanpa -pos-rahasia: %d", resp.StatusCode)
	}
}
