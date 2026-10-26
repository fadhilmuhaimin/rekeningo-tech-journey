package handler

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"lab/apit4/internal/penerbit"
	"lab/apit4/internal/push"
	"lab/apit4/internal/repo"
	"lab/apit4/internal/service"
)

var urutKartuHandler atomic.Int64

// akunKartu: akun pemakai dengan buku, tingkat, saldo, dan satu kartu aktif. Mengembalikan id akun dan token kartu.
func akunKartu(t *testing.T, db *sql.DB, tingkat string, saldo int64) (int64, string) {
	t.Helper()
	var id int64
	if err := db.QueryRow(`SELECT greatest(coalesce(max(id), 0), 100000) + 1 FROM akun`).Scan(&id); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO akun (id, jenis, nama, email, password_hash, tingkat) VALUES ($1, 'pemakai', $2, $3, '!', $4)`,
		id, fmt.Sprintf("Pemakai %d", id), fmt.Sprintf("hk%d@publik.example", id), tingkat); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO buku (akun_id, jenis, batas_harian) VALUES ($1, 'pemakai', 500000)`, id); err != nil {
		t.Fatal(err)
	}
	if saldo > 0 {
		ctx := context.Background()
		err := repo.Baru(db).DalamTx(ctx, func(tx repo.Tx) error {
			tunjangan, err := tx.BukuSistem(ctx, "tunjangan")
			if err != nil {
				return err
			}
			buku, err := tx.KunciBukuAkun(ctx, id)
			if err != nil {
				return err
			}
			_, err = tx.CatatJurnal(ctx, "topup", "isi saldo tes kartu", 1, nil,
				[]repo.Posting{{BukuID: tunjangan, Jumlah: -saldo}, {BukuID: buku[id].ID, Jumlah: saldo}})
			return err
		})
		if err != nil {
			t.Fatal(err)
		}
	}
	token := fmt.Sprintf("tok_handler_%d_%d", id, urutKartuHandler.Add(1))
	if _, err := db.Exec(`INSERT INTO kartu (akun_id, token_penerbit, empat_digit) VALUES ($1, $2, '4242')`, id, token); err != nil {
		t.Fatal(err)
	}
	return id, token
}

func serverKartu(t *testing.T, d service.Dep, rentan string) (Server, *sql.DB) {
	t.Helper()
	_, db, _ := siapkanDB(t)
	svc := service.Baru(repo.Baru(db), time.Hour).DenganT4(d)
	if rentan != "" {
		svc = svc.DenganRentan(rentan, push.Baru("http://127.0.0.1:1", time.Second))
	}
	return Baru(svc).DenganRentan(rentan), db
}

func kirimPenerbit(h http.Handler, path, kunci, body string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	r := httptest.NewRequest("POST", path, strings.NewReader(body))
	if kunci != "" {
		r.Header.Set("X-Penerbit-Kunci", kunci)
	}
	h.ServeHTTP(rec, r)
	return rec
}

func tipeProblem(t *testing.T, rec *httptest.ResponseRecorder) string {
	t.Helper()
	var p Problem
	if err := json.Unmarshal(rec.Body.Bytes(), &p); err != nil {
		t.Fatalf("badan bukan problem: %q", rec.Body.String())
	}
	return p.Type
}

// Kunci penerbit salah, hilang, atau server tanpa kunci: 401 untuk ketiga rute /penerbit/*, dan database tidak
// disentuh.
func TestPenerbitTanpaKunciYangSahDitolak(t *testing.T) {
	s, _ := serverKartu(t, service.Dep{KunciPenerbit: "kunci-handler"}, "")
	h := s.Rute()
	_, token := akunKartu(t, func() *sql.DB { _, db, _ := siapkanDB(t); return db }(), "terverifikasi", 100_000)
	for _, path := range []string{"/penerbit/otorisasi", "/penerbit/clearing", "/penerbit/reversal"} {
		for nama, kunci := range map[string]string{"tanpa header": "", "salah": "kunci-lain", "beda huruf": "Kunci-Handler"} {
			rec := kirimPenerbit(h, path, kunci, fmt.Sprintf(`{"id_penerbit":"AUTH-x","token":"%s","jumlah":1000}`, token))
			if rec.Code != 401 || tipeProblem(t, rec) != "/problems/kunci-penerbit" {
				t.Errorf("%s %s: status %d; harus 401", path, nama, rec.Code)
			}
		}
	}
	kosong, _ := serverKartu(t, service.Dep{}, "")
	if rec := kirimPenerbit(kosong.Rute(), "/penerbit/otorisasi", "", `{}`); rec.Code != 401 {
		t.Errorf("server tanpa kunci menerima header kosong: status %d", rec.Code)
	}
}

// Alur penerbit lewat HTTP: otorisasi, clearing, reversal, dan jawaban untuk input yang salah.
func TestPenerbitOtorisasiClearingReversal(t *testing.T) {
	s, db := serverKartu(t, service.Dep{KunciPenerbit: "kunci-handler"}, "")
	h := s.Rute()
	_, token := akunKartu(t, db, "terverifikasi", 100_000)
	id1, id2 := fmt.Sprintf("AUTH-h1-%d", time.Now().UnixNano()), fmt.Sprintf("AUTH-h2-%d", time.Now().UnixNano())
	otorisasi := func(id string, jumlah int) *httptest.ResponseRecorder {
		return kirimPenerbit(h, "/penerbit/otorisasi", "kunci-handler", fmt.Sprintf(`{"id_penerbit":"%s","token":"%s","jumlah":%d}`, id, token, jumlah))
	}
	rec := otorisasi(id1, 40_000)
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"setuju"`) {
		t.Fatalf("otorisasi: %d %s", rec.Code, rec.Body.String())
	}
	rec = otorisasi(id2, 90_000)
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"saldo-kurang"`) {
		t.Fatalf("otorisasi melebihi saldo: %d %s", rec.Code, rec.Body.String())
	}
	if rec := otorisasi(id1, 41_000); rec.Code != 409 || tipeProblem(t, rec) != "/problems/id-penerbit-dipakai" {
		t.Fatalf("id sama jumlah beda: %d %s", rec.Code, rec.Body.String())
	}
	if rec := otorisasi("AUTH-nol", 0); rec.Code != 422 {
		t.Fatalf("jumlah 0: %d; harus 422", rec.Code)
	}
	if rec := kirimPenerbit(h, "/penerbit/otorisasi", "kunci-handler", `{"id_penerbit":"AUTH-y"}`); rec.Code != 400 {
		t.Fatalf("field hilang: %d; harus 400", rec.Code)
	}
	if rec := kirimPenerbit(h, "/penerbit/otorisasi", "kunci-handler", `{rusak`); rec.Code != 400 {
		t.Fatalf("JSON rusak: %d; harus 400", rec.Code)
	}
	rec = kirimPenerbit(h, "/penerbit/clearing", "kunci-handler", fmt.Sprintf(`{"id_penerbit":"%s","jumlah":40000}`, id1))
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"ditangkap"`) {
		t.Fatalf("clearing: %d %s", rec.Code, rec.Body.String())
	}
	if rec := kirimPenerbit(h, "/penerbit/clearing", "kunci-handler", `{"id_penerbit":"AUTH-tidak-ada","jumlah":1000}`); rec.Code != 404 {
		t.Fatalf("clearing tak dikenal: %d; harus 404", rec.Code)
	}
	if rec := kirimPenerbit(h, "/penerbit/reversal", "kunci-handler", fmt.Sprintf(`{"id_penerbit":"%s"}`, id1)); rec.Code != 409 {
		t.Fatalf("reversal sesudah clearing: %d; harus 409", rec.Code)
	}
	id3 := fmt.Sprintf("AUTH-h3-%d", time.Now().UnixNano())
	otorisasi(id3, 10_000)
	for range 2 { // reversal diulang tetap 200
		rec = kirimPenerbit(h, "/penerbit/reversal", "kunci-handler", fmt.Sprintf(`{"id_penerbit":"%s"}`, id3))
		if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"dibalik"`) {
			t.Fatalf("reversal: %d %s", rec.Code, rec.Body.String())
		}
	}
}

// Mode rentan kartu-tanpa-hold lewat HTTP: dua otorisasi Rp80.000 dari saldo Rp100.000 keduanya setuju; clearing
// kedua dijawab 409 saldo-kurang.
func TestPenerbitTanpaHoldClearingKedua409(t *testing.T) {
	s, db := serverKartu(t, service.Dep{KunciPenerbit: "kunci-handler"}, service.RentanKartuTanpaHold)
	h := s.Rute()
	_, token := akunKartu(t, db, "terverifikasi", 100_000)
	ids := [2]string{fmt.Sprintf("AUTH-r1-%d", time.Now().UnixNano()), fmt.Sprintf("AUTH-r2-%d", time.Now().UnixNano())}
	for _, id := range ids {
		rec := kirimPenerbit(h, "/penerbit/otorisasi", "kunci-handler", fmt.Sprintf(`{"id_penerbit":"%s","token":"%s","jumlah":80000}`, id, token))
		if rec.Code != 200 || !strings.Contains(rec.Body.String(), `"setuju"`) {
			t.Fatalf("otorisasi %s: %d %s", id, rec.Code, rec.Body.String())
		}
	}
	if rec := kirimPenerbit(h, "/penerbit/clearing", "kunci-handler", fmt.Sprintf(`{"id_penerbit":"%s","jumlah":80000}`, ids[0])); rec.Code != 200 {
		t.Fatalf("clearing pertama: %d %s", rec.Code, rec.Body.String())
	}
	rec := kirimPenerbit(h, "/penerbit/clearing", "kunci-handler", fmt.Sprintf(`{"id_penerbit":"%s","jumlah":80000}`, ids[1]))
	if rec.Code != 409 || tipeProblem(t, rec) != "/problems/saldo-kurang" {
		t.Fatalf("clearing kedua: %d %s; harus 409 saldo-kurang", rec.Code, rec.Body.String())
	}
}

func panggilSebagai(f http.HandlerFunc, akun int64, method, path, id string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	r := httptest.NewRequest(method, path, strings.NewReader(`{}`))
	r.SetPathValue("id", id)
	f(rec, r.WithContext(context.WithValue(r.Context(), kunciPeminta{}, akun)))
	return rec
}

// Rute app: belum terverifikasi 403, penerbit mati 502, kartu orang lain 404, penerbitan berhasil 201 tanpa nomor
// penuh atau token di jawaban.
func TestRuteKartuApp(t *testing.T) {
	penerbitTiruan := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(201)
		fmt.Fprint(w, `{"token":"tok_rahasia_penerbit","empat_digit":"0042"}`)
	}))
	s, db := serverKartu(t, service.Dep{Penerbit: penerbit.Baru(penerbitTiruan.URL, 3*time.Second)}, "")
	belum, _ := akunKartu(t, db, "belum", 0)
	if rec := panggilSebagai(s.terbitkanKartu, belum, "POST", "/kartu", ""); rec.Code != 403 || tipeProblem(t, rec) != "/problems/butuh-verifikasi" {
		t.Fatalf("belum terverifikasi: %d %s", rec.Code, rec.Body.String())
	}
	ok, _ := akunKartu(t, db, "terverifikasi", 0)
	rec := panggilSebagai(s.terbitkanKartu, ok, "POST", "/kartu", "")
	if rec.Code != 201 || !strings.Contains(rec.Body.String(), `"empat_digit":"0042"`) || strings.Contains(rec.Body.String(), "tok_rahasia_penerbit") {
		t.Fatalf("terbitkan: %d %s; harus 201 tanpa token penerbit di jawaban", rec.Code, rec.Body.String())
	}
	var k struct{ ID int64 }
	json.Unmarshal(rec.Body.Bytes(), &k)
	lain, _ := akunKartu(t, db, "terverifikasi", 0)
	if rec := panggilSebagai(s.ubahStatusKartu("dibekukan"), lain, "POST", "/kartu/x/bekukan", fmt.Sprint(k.ID)); rec.Code != 404 {
		t.Fatalf("kartu orang lain: %d; harus 404", rec.Code)
	}
	if rec := panggilSebagai(s.ubahStatusKartu("dibekukan"), ok, "POST", "/kartu/x/bekukan", fmt.Sprint(k.ID)); rec.Code != 200 || !strings.Contains(rec.Body.String(), `"dibekukan"`) {
		t.Fatalf("bekukan: %d %s", rec.Code, rec.Body.String())
	}
	if rec := panggilSebagai(s.ubahStatusKartu("aktif"), ok, "POST", "/kartu/x/buka", "bukan-angka"); rec.Code != 404 {
		t.Fatalf("id bukan angka: %d; harus 404", rec.Code)
	}
	penerbitTiruan.Close()
	mati, _ := akunKartu(t, db, "terverifikasi", 0)
	if rec := panggilSebagai(s.terbitkanKartu, mati, "POST", "/kartu", ""); rec.Code != 502 || tipeProblem(t, rec) != "/problems/penerbit-tidak-tersedia" {
		t.Fatalf("penerbit mati: %d %s", rec.Code, rec.Body.String())
	}
}
