package handler

import (
	"bytes"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"lab/apit4/internal/gateway"
	"lab/apit4/internal/objek"
	"lab/apit4/internal/repo"
	"lab/apit4/internal/service"
)

// Tes HTTP untuk endpoint Tahap 4 (daftar, top-up bank, webhook, verifikasi) dengan PostgreSQL sungguhan. Server
// dibuat dari Server.Rute() sungguhan; gateway adalah server httptest.

const (
	rahasiaHTTP = "rahasia-http-tes"
	sandi       = "kata-sandi-tes-lab-1"
)

var pngTes, _ = base64.StdEncoding.DecodeString("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")

type gwHTTP struct {
	srv   *httptest.Server
	mode  string
	tidur time.Duration
}

func gatewayHTTP(t *testing.T) *gwHTTP {
	g := &gwHTTP{}
	g.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch g.mode {
		case "503":
			http.Error(w, "mati", 503)
			return
		case "tidur":
			select {
			case <-time.After(g.tidur):
			case <-r.Context().Done():
			}
		}
		var in struct {
			OrderID string `json:"order_id"`
			Jumlah  int64  `json:"jumlah"`
		}
		json.NewDecoder(r.Body).Decode(&in)
		w.WriteHeader(201)
		json.NewEncoder(w).Encode(gateway.Order{OrderID: in.OrderID, Jumlah: in.Jumlah, Status: "pending", TujuanBayar: "88000000000000"})
	}))
	t.Cleanup(g.srv.Close)
	return g
}

func serverT4(t *testing.T, g *gwHTTP) (*httptest.Server, *sql.DB) {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		if os.Getenv("TES_DB_WAJIB") == "1" {
			t.Fatal("TES_DB_WAJIB=1 tetapi TEST_DATABASE_URL kosong")
		}
		t.Skip("TEST_DATABASE_URL kosong: tes ini butuh PostgreSQL")
	}
	db, err := sql.Open("pgx", url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	var nama, schema string
	db.QueryRow("SELECT current_database(), coalesce(current_schema(), '')").Scan(&nama, &schema)
	if nama != "lab" || schema != schemaTes() {
		t.Fatalf("%s/%s bukan database tes lab/%s", nama, schema, schemaTes())
	}
	dep := service.Dep{RahasiaWebhook: []string{rahasiaHTTP}, Objek: objek.Dir{Akar: t.TempDir()}, TanpaLapis: map[string]bool{}}
	if g != nil {
		dep.Gateway = gateway.Baru(g.srv.URL, 400*time.Millisecond)
	}
	svc := service.Baru(repo.Baru(db), time.Hour).DenganT4(dep)
	srv := httptest.NewServer(Baru(svc).Rute())
	t.Cleanup(srv.Close)
	return srv, db
}

func kirimReq(t *testing.T, srv *httptest.Server, method, path, token string, body any, kepala ...string) (int, http.Header, string) {
	t.Helper()
	var r io.Reader
	switch b := body.(type) {
	case nil:
	case []byte:
		r = bytes.NewReader(b)
	case string:
		r = strings.NewReader(b)
	default:
		j, _ := json.Marshal(b)
		r = bytes.NewReader(j)
	}
	req, _ := http.NewRequest(method, srv.URL+path, r)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	for i := 0; i+1 < len(kepala); i += 2 {
		req.Header.Set(kepala[i], kepala[i+1])
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	isi, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, resp.Header, string(isi)
}

// pemakaiLogin mendaftar pemakai lewat POST /daftar, login, dan mengembalikan nomor dan token. Alamat tes yang sama
// dibatasi 5 pendaftaran per jam, jadi tes yang butuh banyak akun memasukkan akun lewat database.
func akunDB(t *testing.T, db *sql.DB, jenis, tingkat string, saldo int64) (int64, string) {
	t.Helper()
	var id int64
	db.QueryRow(`SELECT greatest(coalesce(max(id), 0), 100000) + 1 FROM akun`).Scan(&id)
	email := fmt.Sprintf("h%d@publik.example", id)
	// hash bcrypt dari `sandi` dibuat lewat service.Daftar pada akun lain; di sini cukup hash tetap yang dibuat sekali.
	if _, err := db.Exec(`INSERT INTO akun (id, jenis, nama, email, password_hash, tingkat) VALUES ($1, $2, $3, $4, $5, $6)`,
		id, jenis, fmt.Sprintf("Tes %d", id), email, hashSandi(t), tingkat); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO buku (akun_id, jenis) VALUES ($1, $2)`, id, jenis); err != nil {
		t.Fatal(err)
	}
	if saldo > 0 {
		err := repo.Baru(db).DalamTx(t.Context(), func(tx repo.Tx) error {
			tj, _ := tx.BukuSistem(t.Context(), "tunjangan")
			b, _ := tx.KunciBukuAkun(t.Context(), id)
			_, err := tx.CatatJurnal(t.Context(), "topup", "isi saldo tes", 1, nil,
				[]repo.Posting{{BukuID: tj, Jumlah: -saldo}, {BukuID: b[id].ID, Jumlah: saldo}})
			return err
		})
		if err != nil {
			t.Fatal(err)
		}
	}
	return id, email
}

var hashTetap string

func hashSandi(t *testing.T) string {
	if hashTetap == "" {
		// Daftar memakai bcrypt; hash yang sama dipakai semua akun tes supaya tes tidak menunggu bcrypt berulang kali.
		srv, _ := serverT4(t, nil)
		code, _, isi := kirimReq(t, srv, "POST", "/daftar", "", map[string]string{"nama": "Hash", "email": fmt.Sprintf("hash%d@publik.example", time.Now().UnixNano()), "password": sandi})
		if code != 201 {
			t.Fatalf("daftar untuk hash: %d %s", code, isi)
		}
		var id struct{ ID int64 }
		json.Unmarshal([]byte(isi), &id)
		db, _ := sql.Open("pgx", os.Getenv("TEST_DATABASE_URL"))
		defer db.Close()
		db.QueryRow(`SELECT password_hash FROM akun WHERE id = $1`, id.ID).Scan(&hashTetap)
	}
	return hashTetap
}

func masuk(t *testing.T, srv *httptest.Server, email string) string {
	t.Helper()
	code, _, isi := kirimReq(t, srv, "POST", "/login", "", map[string]string{"email": email, "password": sandi})
	if code != 200 {
		t.Fatalf("login %s: %d %s", email, code, isi)
	}
	var j struct{ Token string }
	json.Unmarshal([]byte(isi), &j)
	return j.Token
}

func tipe(isi string) string {
	var p struct{ Type string }
	json.Unmarshal([]byte(isi), &p)
	return p.Type
}

func TestDaftarEndpoint(t *testing.T) {
	srv, db := serverT4(t, nil)
	email := fmt.Sprintf("daftar%d@publik.example", time.Now().UnixNano())
	badan := map[string]string{"nama": "Pendaftar", "email": email, "password": sandi}
	code, kep, isi := kirimReq(t, srv, "POST", "/daftar", "", badan)
	if code != 201 || !strings.HasPrefix(kep.Get("Location"), "/akun/") {
		t.Fatalf("daftar: %d %s %v", code, isi, kep)
	}
	var tingkat, status, jenis string
	var adaBuku bool
	db.QueryRow(`SELECT a.tingkat, a.status, a.jenis, EXISTS (SELECT 1 FROM buku b WHERE b.akun_id = a.id AND b.jenis = a.jenis) FROM akun a WHERE a.email = $1`, email).
		Scan(&tingkat, &status, &jenis, &adaBuku)
	if tingkat != "belum" || status != "aktif" || jenis != "pemakai" || !adaBuku {
		t.Errorf("akun baru: %s %s %s buku %v", tingkat, status, jenis, adaBuku)
	}
	if code, _, isi = kirimReq(t, srv, "POST", "/daftar", "", badan); code != 409 || tipe(isi) != "/problems/email-terpakai" {
		t.Errorf("email sama: %d %s", code, isi)
	}
	if code, _, isi = kirimReq(t, srv, "POST", "/daftar", "", map[string]string{"nama": "X", "email": "x1@publik.example", "password": "pendek"}); code != 422 {
		t.Errorf("password pendek: %d %s", code, isi)
	}
	if code, _, _ = kirimReq(t, srv, "POST", "/daftar", "", map[string]string{"nama": "X"}); code != 400 {
		t.Errorf("field wajib hilang: %d", code)
	}
	// merchant boleh; tingkat tetap belum.
	if code, _, isi = kirimReq(t, srv, "POST", "/daftar", "", map[string]string{"nama": "Toko", "email": "toko" + email, "password": sandi, "jenis": "merchant"}); code != 201 {
		t.Errorf("merchant: %d %s", code, isi)
	}
}

// Satu server, lima pendaftaran (satu untuk jenis admin, empat body rusak): yang keenam ditolak sebelum body dibaca, dengan Retry-After. Jenis admin tidak
// boleh mendaftar sendiri dan tidak meninggalkan akun.
func TestDaftarBatasPerAlamatDanJenisAdmin(t *testing.T) {
	srv, db := serverT4(t, nil)
	if code, _, _ := kirimReq(t, srv, "POST", "/daftar", "", map[string]string{"nama": "X", "email": "x2@publik.example", "password": sandi, "jenis": "admin"}); code != 422 {
		t.Errorf("jenis admin tidak boleh mendaftar sendiri: %d", code)
	}
	var admin int
	db.QueryRow(`SELECT count(*) FROM akun WHERE email = 'x2@publik.example'`).Scan(&admin)
	if admin != 0 {
		t.Error("akun admin terbuat lewat /daftar")
	}
	var kode []int
	var kep http.Header
	var isi string
	for i := 0; i < 6; i++ { // percobaan yang gagal validasi juga mengambil token: pembatas ada di depan body; token pertama sudah dipakai jenis admin
		var c int
		c, kep, isi = kirimReq(t, srv, "POST", "/daftar", "", "{")
		kode = append(kode, c)
	}
	if kode[3] != 400 || kode[4] != 429 || kode[5] != 429 || kep.Get("Retry-After") != "720" || tipe(isi) != "/problems/rate-limit-ip" {
		t.Errorf("batas per alamat: %v Retry-After %q %s", kode, kep.Get("Retry-After"), isi)
	}
}

func TestWebhookEndpointTandaTangan(t *testing.T) {
	srv, db := serverT4(t, nil)
	budi, _ := akunDB(t, db, "pemakai", "terverifikasi", 0)
	order := fmt.Sprintf("TB-http%d", time.Now().UnixNano())
	if _, err := repo.Baru(db).BuatTopupBank(t.Context(), budi, order, 50_000, time.Now().Add(time.Hour)); err != nil {
		t.Fatal(err)
	}
	kirim := func(body []byte, rahasia string, geser int64) (int, string) {
		ts := time.Now().Unix() + geser
		c, _, isi := kirimReq(t, srv, "POST", "/webhooks/pembayaran", "", body,
			"X-Gateway-Timestamp", fmt.Sprint(ts), "X-Gateway-Signature", service.TandaTangan(rahasia, ts, body))
		return c, isi
	}
	body, _ := json.Marshal(service.KabarGateway{EventID: order + "-e1", OrderID: order, Status: "settlement", Jumlah: 50_000})
	if c, isi := kirim(body, "rahasia-lain", 0); c != 401 || tipe(isi) != "/problems/tanda-tangan" {
		t.Errorf("rahasia salah: %d %s", c, isi)
	}
	if c, _ := kirim(body, rahasiaHTTP, -400); c != 401 {
		t.Errorf("timestamp lama: %d", c)
	}
	if c, _, _ := kirimReq(t, srv, "POST", "/webhooks/pembayaran", "", body); c != 401 {
		t.Errorf("tanpa header tanda tangan: %d", c)
	}
	var n int
	db.QueryRow(`SELECT count(*) FROM webhook_event WHERE event_id = $1`, order+"-e1").Scan(&n)
	if n != 0 {
		t.Error("kiriman palsu tercatat")
	}
	if c, isi := kirim(body, rahasiaHTTP, 0); c != 200 || !strings.Contains(isi, `"diproses"`) {
		t.Errorf("sah: %d %s", c, isi)
	}
	if c, isi := kirim(body, rahasiaHTTP, 0); c != 200 || !strings.Contains(isi, `"ganda"`) {
		t.Errorf("ulang: %d %s", c, isi)
	}
	if c, _ := kirim([]byte("{"), rahasiaHTTP, 0); c != 400 {
		t.Errorf("JSON rusak: %d", c)
	}
	besar := bytes.Repeat([]byte("a"), MaksWebhook+1)
	if c, _ := kirim(besar, rahasiaHTTP, 0); c != 400 {
		t.Errorf("body terlalu besar: %d", c)
	}
	if c, _, _ := kirimReq(t, srv, "GET", "/webhooks/pembayaran", "", nil); c != 405 {
		t.Errorf("GET ke webhook: %d", c)
	}
}

func TestTopupBankEndpoint(t *testing.T) {
	g := gatewayHTTP(t)
	srv, db := serverT4(t, g)
	_, email := akunDB(t, db, "pemakai", "terverifikasi", 0)
	token := masuk(t, srv, email)
	if c, _, _ := kirimReq(t, srv, "POST", "/topup-bank", "", map[string]int64{"jumlah": 50_000}); c != 401 {
		t.Errorf("tanpa login: %d", c)
	}
	c, kep, isi := kirimReq(t, srv, "POST", "/topup-bank", token, map[string]int64{"jumlah": 50_000})
	var tb struct {
		ID          int64  `json:"id"`
		Status      string `json:"status"`
		TujuanBayar string `json:"tujuan_bayar"`
		OrderID     string `json:"order_id"`
	}
	json.Unmarshal([]byte(isi), &tb)
	if c != 201 || tb.Status != "menunggu" || tb.TujuanBayar == "" || kep.Get("Location") != fmt.Sprintf("/topup-bank/%d", tb.ID) {
		t.Fatalf("normal: %d %s %v", c, isi, kep)
	}
	if c, _, isi = kirimReq(t, srv, "GET", fmt.Sprintf("/topup-bank/%d", tb.ID), token, nil); c != 200 || !strings.Contains(isi, tb.OrderID) {
		t.Errorf("lihat milik sendiri: %d %s", c, isi)
	}
	_, email2 := akunDB(t, db, "pemakai", "terverifikasi", 0)
	token2 := masuk(t, srv, email2)
	if c, _, _ = kirimReq(t, srv, "GET", fmt.Sprintf("/topup-bank/%d", tb.ID), token2, nil); c != 404 {
		t.Errorf("lihat milik orang lain harus 404: %d", c)
	}
	if c, _, _ = kirimReq(t, srv, "GET", "/topup-bank/abc", token, nil); c != 404 {
		t.Errorf("id bukan angka: %d", c)
	}
	if c, _, isi = kirimReq(t, srv, "POST", "/topup-bank", token, map[string]string{"jumlah": "lima"}); c != 400 {
		t.Errorf("tipe salah: %d %s", c, isi)
	}
	if c, _, _ = kirimReq(t, srv, "POST", "/topup-bank", token, map[string]int64{}); c != 400 {
		t.Errorf("jumlah hilang: %d", c)
	}
	if c, _, _ = kirimReq(t, srv, "POST", "/topup-bank", token, map[string]int64{"jumlah": 5}); c != 422 {
		t.Errorf("jumlah terlalu kecil: %d", c)
	}
	g.mode = "503"
	if c, _, isi = kirimReq(t, srv, "POST", "/topup-bank", token, map[string]int64{"jumlah": 50_000}); c != 502 || tipe(isi) != "/problems/gateway-tidak-tersedia" {
		t.Errorf("gateway mati: %d %s", c, isi)
	}
	g.mode, g.tidur = "tidur", 3*time.Second
	if c, _, isi = kirimReq(t, srv, "POST", "/topup-bank", token, map[string]int64{"jumlah": 50_000}); c != 202 || !strings.Contains(isi, "tidak_pasti") {
		t.Errorf("timeout: %d %s", c, isi)
	}
	g.mode = ""
	_, emailBelum := akunDB(t, db, "pemakai", "belum", 990_000)
	tokenBelum := masuk(t, srv, emailBelum)
	if c, _, isi = kirimReq(t, srv, "POST", "/topup-bank", tokenBelum, map[string]int64{"jumlah": 20_000}); c != 422 || tipe(isi) != "/problems/batas-saldo-tingkat" {
		t.Errorf("melewati batas tingkat: %d %s", c, isi)
	}
	// akun dibekukan dan merchant: 403 dengan jenis masalah yang berbeda.
	_, emailBeku := akunDB(t, db, "pemakai", "terverifikasi", 0)
	tokenBeku := masuk(t, srv, emailBeku)
	db.Exec(`UPDATE akun SET status = 'dibekukan' WHERE email = $1`, emailBeku)
	if c, _, isi = kirimReq(t, srv, "POST", "/topup-bank", tokenBeku, map[string]int64{"jumlah": 20_000}); c != 403 || tipe(isi) != "/problems/akun-dibekukan" {
		t.Errorf("dibekukan: %d %s", c, isi)
	}
	_, emailM := akunDB(t, db, "merchant", "terverifikasi", 0)
	tokenM := masuk(t, srv, emailM)
	if c, _, isi = kirimReq(t, srv, "POST", "/topup-bank", tokenM, map[string]int64{"jumlah": 20_000}); c != 403 || tipe(isi) != "/problems/dilarang" {
		t.Errorf("merchant: %d %s", c, isi)
	}
}

func TestVerifikasiEndpoint(t *testing.T) {
	srv, db := serverT4(t, nil)
	_, email := akunDB(t, db, "pemakai", "belum", 0)
	token := masuk(t, srv, email)
	berkas := map[string][]byte{"berkas_kartu": pngTes, "berkas_swafoto": append(append([]byte{}, pngTes...), "x"...)}
	c, kep, isi := kirimReq(t, srv, "POST", "/verifikasi", token, berkas)
	var v struct {
		ID     int64  `json:"id"`
		Status string `json:"status"`
	}
	json.Unmarshal([]byte(isi), &v)
	if c != 202 || v.Status != "diajukan" || kep.Get("Location") != fmt.Sprintf("/verifikasi/%d", v.ID) {
		t.Fatalf("ajukan: %d %s", c, isi)
	}
	if strings.Contains(isi, "identitas/") || strings.Contains(isi, "berkas_kartu_kunci") {
		t.Errorf("kunci objek tidak boleh keluar dari server: %s", isi)
	}
	if c, _, isi = kirimReq(t, srv, "POST", "/verifikasi", token, berkas); c != 409 || tipe(isi) != "/problems/verifikasi-berjalan" {
		t.Errorf("pengajuan kedua: %d %s", c, isi)
	}
	var tujuan, jenis string
	db.QueryRow(`SELECT tujuan, jenis FROM outbox WHERE akun_id = (SELECT akun_id FROM verifikasi WHERE id = $1)`, v.ID).Scan(&tujuan, &jenis)
	if tujuan != "verifikasi" || jenis != "verifikasi" {
		t.Errorf("outbox: %s %s", tujuan, jenis)
	}
	if c, _, isi = kirimReq(t, srv, "GET", fmt.Sprintf("/verifikasi/%d", v.ID), token, nil); c != 200 {
		t.Errorf("lihat: %d %s", c, isi)
	}
	_, email2 := akunDB(t, db, "pemakai", "belum", 0)
	token2 := masuk(t, srv, email2)
	if c, _, _ = kirimReq(t, srv, "GET", fmt.Sprintf("/verifikasi/%d", v.ID), token2, nil); c != 404 {
		t.Errorf("milik orang lain harus 404: %d", c)
	}
	if c, _, isi = kirimReq(t, srv, "POST", "/verifikasi", token2, map[string][]byte{"berkas_kartu": []byte("bukan gambar"), "berkas_swafoto": pngTes}); c != 422 {
		t.Errorf("bukan gambar: %d %s", c, isi)
	}
	if c, _, _ = kirimReq(t, srv, "POST", "/verifikasi", token2, map[string]string{"berkas_kartu": "%%%"}); c != 400 {
		t.Errorf("base64 rusak: %d", c)
	}
	if c, _, _ = kirimReq(t, srv, "POST", "/verifikasi", token2, bytes.Repeat([]byte("a"), MaksBodyVerifikasi+10)); c != 400 {
		t.Errorf("body terlalu besar: %d", c)
	}
	// pemakai yang sudah terverifikasi tidak mengajukan lagi (karyawan Lestari terverifikasi lewat HR, jenisnya ditolak di service).
	_, emailT := akunDB(t, db, "pemakai", "terverifikasi", 0)
	tokenT := masuk(t, srv, emailT)
	if c, _, isi = kirimReq(t, srv, "POST", "/verifikasi", tokenT, berkas); c != 409 || tipe(isi) != "/problems/sudah-terverifikasi" {
		t.Errorf("sudah terverifikasi: %d %s", c, isi)
	}
	// tanpa penyimpanan objek terpasang: 503, bukan 500.
	svcTanpa := service.Baru(repo.Baru(db), time.Hour)
	srv2 := httptest.NewServer(Baru(svcTanpa).Rute())
	defer srv2.Close()
	token3 := masuk(t, srv2, email2)
	if c, _, _ = kirimReq(t, srv2, "POST", "/verifikasi", token3, berkas); c != 503 {
		t.Errorf("tanpa penyimpanan objek: %d", c)
	}
}

func TestBatasLajuEndpointLama(t *testing.T) {
	srv, db := serverT4(t, nil)
	_, email := akunDB(t, db, "pemakai", "belum", 0)
	token := masuk(t, srv, email)
	badan := map[string]string{"platform": "android", "token_push": fmt.Sprintf("tok-%d", time.Now().UnixNano())}
	var kode []int
	var kep http.Header
	var isi string
	for i := 0; i < 11; i++ {
		var c int
		c, kep, isi = kirimReq(t, srv, "POST", "/perangkat", token, badan)
		kode = append(kode, c)
	}
	if kode[9] != 201 || kode[10] != 429 || kep.Get("Retry-After") != "360" || tipe(isi) != "/problems/rate-limit-akun" {
		t.Errorf("perangkat: %v Retry-After %q %s", kode, kep.Get("Retry-After"), isi)
	}
	// bucket per endpoint dan per akun: akun lain dan endpoint lain tidak ikut habis.
	_, email2 := akunDB(t, db, "pemakai", "belum", 0)
	token2 := masuk(t, srv, email2)
	if c, _, _ := kirimReq(t, srv, "POST", "/perangkat", token2, badan); c != 201 {
		t.Errorf("akun lain: %d", c)
	}
	if c, _, _ := kirimReq(t, srv, "GET", "/akun/1", token, nil); c == 429 {
		t.Error("endpoint lain ikut habis")
	}
	// /pesanan, /sinkron, /promo: body kosong ditolak validasi SESUDAH mengambil token, jadi percobaan salah tetap dihitung.
	for _, k := range []struct {
		path string
		n    int
	}{{"/pesanan", 20}, {"/sinkron", 30}, {"/promo", 5}} {
		var terakhir int
		for i := 0; i < k.n+1; i++ {
			terakhir, _, _ = kirimReq(t, srv, "POST", k.path, token2, map[string]string{})
			if i < k.n && terakhir == 429 {
				t.Fatalf("%s ditolak terlalu dini pada permintaan %d (batas %d)", k.path, i+1, k.n)
			}
		}
		if terakhir != 429 {
			t.Errorf("%s: permintaan ke-%d harus 429, dapat %d", k.path, k.n+1, terakhir)
		}
	}
}
