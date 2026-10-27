package handler

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"lab/apit4/internal/objek"
	"lab/apit4/internal/repo"
	"lab/apit4/internal/service"
)

// Tes HTTP back office dan impor katalog: status code, bentuk Problem, dan header yang tidak boleh hilang.

type bo struct {
	t     *testing.T
	srv   *httptest.Server
	db    *sql.DB
	objek objek.Dir
	kartu *atomic.Bool
}

func siapkanHTTPBO(t *testing.T, denganKartu bool) *bo {
	t.Helper()
	_, db, _ := siapkanDB(t)
	b := &bo{t: t, db: db, objek: objek.Dir{Akar: t.TempDir()}}
	dep := service.Dep{Objek: b.objek}
	if denganKartu {
		b.kartu = &atomic.Bool{}
		b.kartu.Store(true)
		dep.KartuAktif = b.kartu
	}
	b.srv = httptest.NewServer(Baru(service.Baru(repo.Baru(db), time.Hour).DenganT4(dep)).Rute())
	t.Cleanup(b.srv.Close)
	return b
}

func (b *bo) akun(jenis, tingkat string) (id int64, token string) {
	b.t.Helper()
	if err := b.db.QueryRow(`SELECT greatest(coalesce(max(id), 0), 100000) + 1 FROM akun`).Scan(&id); err != nil {
		b.t.Fatal(err)
	}
	var nomor *string
	if jenis == "karyawan" {
		n := fmt.Sprintf("H%d", id)
		nomor = &n
	}
	if _, err := b.db.Exec(`INSERT INTO akun (id, jenis, nama, email, password_hash, nomor_karyawan, tingkat)
		VALUES ($1, $2, $3, $4, '!', $5, $6)`, id, jenis, fmt.Sprintf("HTTP %s %d", jenis, id), fmt.Sprintf("h%d@rekeningo.example", id), nomor, tingkat); err != nil {
		b.t.Fatal(err)
	}
	if jenis == "pemakai" || jenis == "merchant" {
		if _, err := b.db.Exec(`INSERT INTO buku (akun_id, jenis, batas_harian) VALUES ($1, $2, CASE WHEN $2 = 'pemakai' THEN 500000 END)`, id, jenis); err != nil {
			b.t.Fatal(err)
		}
	}
	token = fmt.Sprintf("token-http-%d-%d", id, time.Now().UnixNano())
	h := sha256.Sum256([]byte(token))
	if err := repo.Baru(b.db).SimpanSesi(context.Background(), hex.EncodeToString(h[:]), id, time.Now().Add(time.Hour), "app", nil); err != nil {
		b.t.Fatal(err)
	}
	return id, token
}

func (b *bo) panggil(metode, jalur, token, body string, kepala ...string) (*http.Response, []byte) {
	b.t.Helper()
	req, err := http.NewRequest(metode, b.srv.URL+jalur, strings.NewReader(body))
	if err != nil {
		b.t.Fatal(err)
	}
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	for i := 0; i+1 < len(kepala); i += 2 {
		req.Header.Set(kepala[i], kepala[i+1])
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		b.t.Fatal(err)
	}
	defer resp.Body.Close()
	isi, _ := io.ReadAll(resp.Body)
	return resp, isi
}

func jenisProblem(t *testing.T, isi []byte) string {
	t.Helper()
	var p Problem
	if err := json.Unmarshal(isi, &p); err != nil {
		t.Fatalf("bukan Problem: %q", isi)
	}
	return p.Type
}

func TestHTTPBOTanpaLoginDanBukanRisk(t *testing.T) {
	b := siapkanHTTPBO(t, false)
	_, pemakai := b.akun("pemakai", "belum")
	sasaran, _ := b.akun("pemakai", "belum")
	jalur := fmt.Sprintf("/bo/akun/%d", sasaran)
	if r, _ := b.panggil("GET", jalur, "", ""); r.StatusCode != 401 {
		t.Errorf("tanpa login: %d, ingin 401", r.StatusCode)
	}
	r, isi := b.panggil("GET", jalur, pemakai, "")
	if r.StatusCode != 403 || jenisProblem(t, isi) != "/problems/dilarang" {
		t.Errorf("pemakai: %d %s, ingin 403 /problems/dilarang", r.StatusCode, isi)
	}
	for _, p := range [][3]string{
		{"POST", jalur + "/bekukan", `{"alasan":"alasan yang cukup panjang untuk uji"}`},
		{"POST", "/bo/flag/kartu", `{"aktif":false,"alasan":"alasan yang cukup panjang untuk uji"}`},
		{"GET", "/bo/audit/verifikasi", ""},
		{"POST", "/bo/merchant/1/setujui", `{"alasan":"alasan yang cukup panjang untuk uji"}`},
	} {
		if r, _ := b.panggil(p[0], p[1], pemakai, p[2]); r.StatusCode != 403 {
			t.Errorf("%s %s oleh pemakai: %d, ingin 403", p[0], p[1], r.StatusCode)
		}
	}
}

func TestHTTPBORingkasanAkunTanpaDataSensitif(t *testing.T) {
	b := siapkanHTTPBO(t, false)
	_, risk := b.akun("risk", "terverifikasi")
	sasaran, _ := b.akun("pemakai", "belum")
	r, isi := b.panggil("GET", fmt.Sprintf("/bo/akun/%d", sasaran), risk, "")
	if r.StatusCode != 200 {
		t.Fatalf("status %d: %s", r.StatusCode, isi)
	}
	var kolom map[string]any
	json.Unmarshal(isi, &kolom)
	for _, k := range []string{"id", "jenis", "nama", "tingkat", "status", "saldo"} {
		if _, ada := kolom[k]; !ada {
			t.Errorf("kolom %s hilang: %s", k, isi)
		}
	}
	for _, k := range []string{"email", "password_hash", "nomor_karyawan", "password"} {
		if _, ada := kolom[k]; ada {
			t.Errorf("kolom %s tidak boleh ada di ringkasan tim risk: %s", k, isi)
		}
	}
	if r, isi := b.panggil("GET", "/bo/akun/999999999", risk, ""); r.StatusCode != 404 || jenisProblem(t, isi) != "/problems/tidak-ditemukan" {
		t.Errorf("akun tidak ada: %d %s", r.StatusCode, isi)
	}
	if r, _ := b.panggil("GET", "/bo/akun/abc", risk, ""); r.StatusCode != 404 {
		t.Errorf("id bukan angka: %d, ingin 404", r.StatusCode)
	}
}

func TestHTTPBOBerkasHeaderDanAlasan(t *testing.T) {
	b := siapkanHTTPBO(t, false)
	_, risk := b.akun("risk", "terverifikasi")
	pemohon, _ := b.akun("pemakai", "belum")
	kartu, swafoto := []byte("isi-kartu-http"), []byte("isi-swafoto-http")
	sk, ss := sha256.Sum256(kartu), sha256.Sum256(swafoto)
	var id int64
	if err := b.db.QueryRow(`INSERT INTO verifikasi (akun_id, subjek, berkas_kartu_kunci, berkas_swafoto_kunci, checksum_kartu, checksum_swafoto)
		VALUES ($1, 'pemakai', $2, $3, $4, $5) RETURNING id`, pemohon, fmt.Sprintf("identitas/hk%d", time.Now().UnixNano()),
		fmt.Sprintf("identitas/hs%d", time.Now().UnixNano()), hex.EncodeToString(sk[:]), hex.EncodeToString(ss[:])).Scan(&id); err != nil {
		t.Fatal(err)
	}
	var kk string
	b.db.QueryRow(`SELECT berkas_kartu_kunci FROM verifikasi WHERE id = $1`, id).Scan(&kk)
	b.objek.Simpan(context.Background(), kk, kartu)

	jalur := fmt.Sprintf("/bo/verifikasi/%d/berkas/kartu", id)
	// Tanpa alasan dan dengan alasan pendek: 422 tanpa isi.
	for _, q := range []string{"", "?alasan=pendek"} {
		r, isi := b.panggil("GET", jalur+q, risk, "")
		if r.StatusCode != 422 || string(isi) == string(kartu) {
			t.Errorf("alasan %q: %d %s, ingin 422", q, r.StatusCode, isi)
		}
	}
	r, isi := b.panggil("GET", jalur+"?alasan="+url.QueryEscape("memeriksa kecocokan foto dengan pengajuan"), risk, "")
	if r.StatusCode != 200 || string(isi) != string(kartu) {
		t.Fatalf("berkas: %d %q", r.StatusCode, isi)
	}
	for k, ingin := range map[string]string{
		"Content-Type": "application/octet-stream", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
	} {
		if got := r.Header.Get(k); got != ingin {
			t.Errorf("header %s = %q, ingin %q", k, got, ingin)
		}
	}
	if cd := r.Header.Get("Content-Disposition"); !strings.HasPrefix(cd, "attachment;") {
		t.Errorf("Content-Disposition %q, ingin attachment", cd)
	}
	// Swafoto tidak disimpan: 404. Checksum rusak: 500 berkas-rusak tanpa isi.
	if r, _ := b.panggil("GET", fmt.Sprintf("/bo/verifikasi/%d/berkas/swafoto?alasan=%s", id, url.QueryEscape("memeriksa swafoto pengajuan ini")), risk, ""); r.StatusCode != 404 {
		t.Errorf("swafoto tidak ada: %d, ingin 404", r.StatusCode)
	}
	b.objek.Simpan(context.Background(), kk, []byte("isi-yang-berubah"))
	r, isi = b.panggil("GET", jalur+"?alasan="+url.QueryEscape("memeriksa kecocokan foto dengan pengajuan"), risk, "")
	if r.StatusCode != 500 || jenisProblem(t, isi) != "/problems/berkas-rusak" || strings.Contains(string(isi), "isi-yang-berubah") {
		t.Errorf("checksum rusak: %d %s", r.StatusCode, isi)
	}
}

func TestHTTPBOBukaBlokirButuhHeaderPenyetuju(t *testing.T) {
	b := siapkanHTTPBO(t, false)
	_, risk := b.akun("risk", "terverifikasi")
	_, risk2 := b.akun("risk", "terverifikasi")
	sasaran, _ := b.akun("pemakai", "belum")
	alasan := `{"alasan":"alasan yang cukup panjang untuk uji"}`
	if r, _ := b.panggil("POST", fmt.Sprintf("/bo/akun/%d/bekukan", sasaran), risk, alasan); r.StatusCode != 204 {
		t.Fatalf("bekukan: %d", r.StatusCode)
	}
	if r, _ := b.panggil("POST", fmt.Sprintf("/bo/akun/%d/bekukan", sasaran), risk, alasan); r.StatusCode != 409 {
		t.Errorf("bekukan dua kali: %d, ingin 409", r.StatusCode)
	}
	jalur := fmt.Sprintf("/bo/akun/%d/buka", sasaran)
	r, isi := b.panggil("POST", jalur, risk, alasan)
	if r.StatusCode != 403 || jenisProblem(t, isi) != "/problems/butuh-persetujuan" {
		t.Fatalf("tanpa penyetuju: %d %s", r.StatusCode, isi)
	}
	if r, _ := b.panggil("POST", jalur, risk, alasan, "X-Penyetuju-Token", risk); r.StatusCode != 403 {
		t.Errorf("penyetuju sama: %d, ingin 403", r.StatusCode)
	}
	if r, _ := b.panggil("POST", jalur, risk, alasan, "X-Penyetuju-Token", risk2); r.StatusCode != 204 {
		t.Errorf("penyetuju sah: %d, ingin 204", r.StatusCode)
	}
	// Body: field alasan hilang = 400 dengan namanya; alasan pendek = 422.
	if r, isi := b.panggil("POST", fmt.Sprintf("/bo/akun/%d/bekukan", sasaran), risk, `{}`); r.StatusCode != 400 || !strings.Contains(string(isi), `"alasan"`) {
		t.Errorf("tanpa alasan: %d %s", r.StatusCode, isi)
	}
	if r, _ := b.panggil("POST", fmt.Sprintf("/bo/akun/%d/bekukan", sasaran), risk, `{"alasan":"pendek"}`); r.StatusCode != 422 {
		t.Errorf("alasan pendek: %d, ingin 422", r.StatusCode)
	}
	// Batas harian: butuh penyetuju juga, nilai di luar rentang 422.
	if r, _ := b.panggil("POST", fmt.Sprintf("/bo/akun/%d/batas-harian", sasaran), risk, `{"nilai":300000,"alasan":"alasan yang cukup panjang untuk uji"}`, "X-Penyetuju-Token", risk2); r.StatusCode != 204 {
		t.Errorf("ubah batas: %d, ingin 204", r.StatusCode)
	}
	if r, _ := b.panggil("POST", fmt.Sprintf("/bo/akun/%d/batas-harian", sasaran), risk, `{"nilai":0,"alasan":"alasan yang cukup panjang untuk uji"}`, "X-Penyetuju-Token", risk2); r.StatusCode != 422 {
		t.Errorf("batas 0: %d, ingin 422", r.StatusCode)
	}
}

func TestHTTPBOMerchantKillSwitchDanRantaiAudit(t *testing.T) {
	b := siapkanHTTPBO(t, true)
	_, risk := b.akun("risk", "terverifikasi")
	merchant, _ := b.akun("merchant", "belum")
	if _, err := b.db.Exec(`INSERT INTO verifikasi (akun_id, subjek, berkas_kartu_kunci, berkas_swafoto_kunci, checksum_kartu, checksum_swafoto)
		VALUES ($1, 'merchant', 'identitas/x', 'identitas/y', 'a', 'b')`, merchant); err != nil {
		t.Fatal(err)
	}
	alasan := `{"alasan":"alasan yang cukup panjang untuk uji"}`
	jalur := fmt.Sprintf("/bo/merchant/%d/setujui", merchant)
	if r, _ := b.panggil("POST", jalur, risk, alasan); r.StatusCode != 204 {
		t.Fatalf("setujui: %d", r.StatusCode)
	}
	if r, isi := b.panggil("POST", jalur, risk, alasan); r.StatusCode != 409 || jenisProblem(t, isi) != "/problems/sudah-diputuskan" {
		t.Errorf("setujui dua kali: %d %s", r.StatusCode, isi)
	}
	if r, _ := b.panggil("POST", "/bo/merchant/999999999/tolak", risk, alasan); r.StatusCode != 404 {
		t.Errorf("merchant tanpa pengajuan: %d, ingin 404", r.StatusCode)
	}
	r, isi := b.panggil("POST", "/bo/flag/kartu", risk, `{"aktif":false,"alasan":"alasan yang cukup panjang untuk uji"}`)
	if r.StatusCode != 200 || b.kartu.Load() {
		t.Errorf("kill switch: %d %s, flag %v", r.StatusCode, isi, b.kartu.Load())
	}
	if r, _ := b.panggil("POST", "/bo/flag/kartu", risk, `{"alasan":"alasan yang cukup panjang untuk uji"}`); r.StatusCode != 400 {
		t.Errorf("flag tanpa aktif: %d, ingin 400", r.StatusCode)
	}
	r, isi = b.panggil("GET", "/bo/audit/verifikasi", risk, "")
	var h struct {
		Baris int    `json:"baris"`
		Utuh  bool   `json:"utuh"`
		Hash  string `json:"hash_terakhir"`
	}
	json.Unmarshal(isi, &h)
	if r.StatusCode != 200 || !h.Utuh || h.Baris < 2 || len(h.Hash) != 64 {
		t.Errorf("verifikasi rantai: %d %s", r.StatusCode, isi)
	}
	// Flag tidak dipasang: 503.
	b2 := siapkanHTTPBO(t, false)
	_, risk2 := b2.akun("risk", "terverifikasi")
	if r, isi := b2.panggil("POST", "/bo/flag/kartu", risk2, `{"aktif":false,"alasan":"alasan yang cukup panjang untuk uji"}`); r.StatusCode != 503 || jenisProblem(t, isi) != "/problems/tidak-dipasang" {
		t.Errorf("flag tidak dipasang: %d %s", r.StatusCode, isi)
	}
}

func TestHTTPImporKatalog(t *testing.T) {
	b := siapkanHTTPBO(t, false)
	_, merchant := b.akun("merchant", "terverifikasi")
	_, pemakai := b.akun("pemakai", "terverifikasi")
	ok := `{"produk":[{"nama":"Kopi susu","harga":18000,"stok":5},{"nama":"Teh","harga":9000,"stok":0}]}`
	r, isi := b.panggil("POST", "/merchant/katalog/impor", merchant, ok)
	var h struct {
		Hasil []struct {
			Nama      string `json:"nama"`
			Pratinjau any    `json:"pratinjau"`
			Galat     any    `json:"galat"`
		} `json:"hasil"`
	}
	json.Unmarshal(isi, &h)
	if r.StatusCode != 200 || len(h.Hasil) != 2 || h.Hasil[0].Nama != "Kopi susu" {
		t.Fatalf("impor: %d %s", r.StatusCode, isi)
	}
	if !strings.Contains(string(isi), `"pratinjau":null`) || !strings.Contains(string(isi), `"galat":null`) {
		t.Errorf("baris tanpa URL harus membawa pratinjau dan galat null: %s", isi)
	}
	if r, _ := b.panggil("POST", "/merchant/katalog/impor", pemakai, ok); r.StatusCode != 403 {
		t.Errorf("pemakai: %d, ingin 403", r.StatusCode)
	}
	// Field wajib: 400 dengan nama field beserta indeksnya.
	r, isi = b.panggil("POST", "/merchant/katalog/impor", merchant, `{"produk":[{"nama":"A","stok":1}]}`)
	if r.StatusCode != 400 || !strings.Contains(string(isi), "produk[0].harga") {
		t.Errorf("harga hilang: %d %s", r.StatusCode, isi)
	}
	// Lebih dari 50 baris: 422.
	var banyak []string
	for i := 0; i < service.MaksBarisImpor+1; i++ {
		banyak = append(banyak, fmt.Sprintf(`{"nama":"P%d","harga":1000,"stok":1}`, i))
	}
	if r, _ := b.panggil("POST", "/merchant/katalog/impor", merchant, `{"produk":[`+strings.Join(banyak, ",")+`]}`); r.StatusCode != 422 {
		t.Errorf("51 baris: %d, ingin 422", r.StatusCode)
	}
	// Body yang terlalu besar ditolak sebelum diurai.
	if r, _ := b.panggil("POST", "/merchant/katalog/impor", merchant, `{"produk":[{"nama":"`+strings.Repeat("a", MaksBodyImpor)+`"}]}`); r.StatusCode != 400 {
		t.Errorf("body raksasa: %d, ingin 400", r.StatusCode)
	}
}
