package handler

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"

	"lab/apit3/internal/repo"
	"lab/apit3/internal/service"
)

const uuidTes = `"0fa0431d-1f2e-4c11-8a55-7d0c4b6d9a01"`

// Tanpa header, middleware meneruskan permintaan apa adanya dan tidak menyentuh database (kompatibilitas mundur,
// ADR 10 dan 14: app 1.0 dan 1.1 tidak mengirim key).
func TestIdempotenTanpaHeaderMeneruskan(t *testing.T) {
	var s Server // service kosong: bila middleware menyentuh database, tes ini panik
	panggilan := 0
	h := s.idempoten(func(w http.ResponseWriter, r *http.Request) { panggilan++; w.WriteHeader(201) })
	rec := httptest.NewRecorder()
	h(rec, httptest.NewRequest("POST", "/transfers", strings.NewReader(`{"ke":418,"jumlah":25000}`)))
	if panggilan != 1 || rec.Code != 201 {
		t.Fatalf("tanpa header: handler dipanggil %d kali, status %d; harus 1 dan 201", panggilan, rec.Code)
	}
}

func TestIdempotenKunciRusakDitolak400(t *testing.T) {
	var s Server
	for nama, nilai := range map[string][]string{
		"bukan String":     {"0fa0431d-1f2e-4c11-8a55-7d0c4b6d9a01"},
		"bukan UUID":       {`"12345"`},
		"dua header":       {uuidTes, uuidTes},
		"UUID huruf besar": {`"0FA0431D-1F2E-4C11-8A55-7D0C4B6D9A01"`},
	} {
		panggilan := 0
		h := s.idempoten(func(w http.ResponseWriter, r *http.Request) { panggilan++ })
		rec := httptest.NewRecorder()
		r := httptest.NewRequest("POST", "/transfers", strings.NewReader(`{}`))
		r.Header["Idempotency-Key"] = nilai
		h(rec, r)
		if rec.Code != 400 || panggilan != 0 {
			t.Errorf("%s: status %d, handler dipanggil %d kali; harus 400 dan 0", nama, rec.Code, panggilan)
		}
	}
}

func siapkanDB(t *testing.T) (Server, *sql.DB, int64) {
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
	if err := db.QueryRow("SELECT current_database(), coalesce(current_schema(), '')").Scan(&nama, &schema); err != nil {
		t.Fatal(err)
	}
	if nama != "lab" || schema != "tahap3_tes" {
		t.Fatalf("%s/%s bukan database tes lab/tahap3_tes", nama, schema)
	}
	var akun int64
	if err := db.QueryRow(`
		INSERT INTO akun (id, jenis, nama, email, password_hash)
		SELECT greatest(coalesce(max(id), 0), 100000) + 1, 'admin', 'Tes middleware', 'mw' || now()::text || '@lestari.example', '!'
		FROM akun RETURNING id`).Scan(&akun); err != nil {
		t.Fatal(err)
	}
	return Baru(service.Baru(repo.Baru(db), time.Hour)), db, akun
}

func panggil(h http.HandlerFunc, akun int64, kunci, body string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/transfers", strings.NewReader(body))
	r.Header.Set("Idempotency-Key", kunci)
	r = r.WithContext(context.WithValue(r.Context(), kunciPeminta{}, akun))
	h(rec, r)
	return rec
}

// Ulangan dengan key sama dan isi sama (urutan field dan spasi boleh beda) mendapat respons yang sama tanpa
// menjalankan handler; key sama dengan isi beda 422; kegagalan sementara (5xx, 429) tidak disimpan.
func TestIdempotenUlanganTanpaEfekGanda(t *testing.T) {
	s, _, akun := siapkanDB(t)
	kerja, status := 0, 201
	h := s.idempoten(func(w http.ResponseWriter, r *http.Request) {
		kerja++
		w.Header().Set("Location", fmt.Sprintf("/transfers/%d", kerja))
		tulisJSON(w, status, map[string]int{"id": kerja})
	})
	k := fmt.Sprintf(`"%s"`, fmt.Sprintf("%08x-0000-4000-8000-%012x", time.Now().UnixNano()&0xffffffff, time.Now().UnixNano()&0xffffffffffff))

	a := panggil(h, akun, k, `{"ke":418,"jumlah":25000}`)
	b := panggil(h, akun, k, `{ "jumlah": 25000, "ke": 418 }`)
	if kerja != 1 {
		t.Fatalf("handler dipanggil %d kali untuk satu key; harus 1", kerja)
	}
	if a.Code != 201 || b.Code != 201 || a.Body.String() != b.Body.String() || a.Header().Get("Location") != b.Header().Get("Location") {
		t.Fatalf("ulangan beda dari yang pertama: %d %q %q lawan %d %q %q",
			a.Code, a.Body.String(), a.Header().Get("Location"), b.Code, b.Body.String(), b.Header().Get("Location"))
	}
	if c := panggil(h, akun, k, `{"ke":418,"jumlah":30000}`); c.Code != 422 || kerja != 1 {
		t.Fatalf("key sama, isi beda: status %d, handler %d kali; harus 422 dan 1", c.Code, kerja)
	}

	// 5xx dan 429: key dilepas, ulangan mengerjakannya dari awal.
	for _, sementara := range []int{500, 429} {
		status = sementara
		k2 := strings.Replace(k, "0000-4000", fmt.Sprintf("%04d-4000", sementara), 1)
		sebelum := kerja
		panggil(h, akun, k2, `{"ke":418,"jumlah":1}`)
		status = 201
		r := panggil(h, akun, k2, `{"ke":418,"jumlah":1}`)
		if kerja != sebelum+2 || r.Code != 201 {
			t.Fatalf("setelah %d: handler %d kali, status ulangan %d; harus 2 kali dan 201", sementara, kerja-sebelum, r.Code)
		}
	}
}

// Handler yang panik tidak boleh meninggalkan key berstatus diproses: ulangan akan mendapat 409 sampai 24 jam.
func TestIdempotenPanikMelepasKey(t *testing.T) {
	s, _, akun := siapkanDB(t)
	k := fmt.Sprintf(`"%s"`, fmt.Sprintf("%08x-0001-4000-8000-%012x", time.Now().UnixNano()&0xffffffff, time.Now().UnixNano()&0xffffffffffff))
	panik := true
	kerja := 0
	h := s.idempoten(func(w http.ResponseWriter, r *http.Request) {
		kerja++
		if panik {
			panic("handler rusak")
		}
		w.WriteHeader(201)
	})
	func() {
		defer func() { _ = recover() }() // net/http memulihkan panic handler; tes memerankannya
		panggil(h, akun, k, `{"ke":418,"jumlah":1}`)
	}()
	panik = false
	if r := panggil(h, akun, k, `{"ke":418,"jumlah":1}`); r.Code != 201 || kerja != 2 {
		t.Fatalf("sesudah panic: status %d, handler %d kali; harus 201 dan 2 (key dilepas)", r.Code, kerja)
	}
}

// Key yang sama dengan isi yang sama tetapi untuk endpoint lain adalah permintaan lain: 422, tidak ada respons yang bocor.
func TestIdempotenKeySamaEndpointBeda(t *testing.T) {
	s, _, akun := siapkanDB(t)
	kerja := 0
	h := s.idempoten(func(w http.ResponseWriter, r *http.Request) { kerja++; tulisJSON(w, 201, map[string]int{"id": kerja}) })
	k := fmt.Sprintf(`"%s"`, fmt.Sprintf("%08x-0002-4000-8000-%012x", time.Now().UnixNano()&0xffffffff, time.Now().UnixNano()&0xffffffffffff))
	panggil(h, akun, k, `{"ke":418,"jumlah":25000}`)
	rec := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/pesanan", strings.NewReader(`{"ke":418,"jumlah":25000}`))
	r.Header.Set("Idempotency-Key", k)
	r = r.WithContext(context.WithValue(r.Context(), kunciPeminta{}, akun))
	h(rec, r)
	if rec.Code != 422 || kerja != 1 {
		t.Fatalf("key sama, endpoint beda: status %d, handler %d kali; harus 422 dan 1", rec.Code, kerja)
	}
}

// Dua puluh permintaan serentak dengan key yang sama (ulangan HP yang tidak sabar): satu mengerjakan, sembilan belas
// mendapat 409 selama yang pertama belum selesai dan tidak mengerjakan apa pun. Sesudah selesai, ulangan mendapat
// respons yang sama. Tanpa cabang KlaimBerjalan, permintaan kedua ikut mengerjakan dan uang berpindah dua kali.
func TestIdempotenBersamaanSatuMenang(t *testing.T) {
	s, _, akun := siapkanDB(t)
	var kerja atomic.Int32
	lepas := make(chan struct{}) // pemenang menahan handler di sini sampai semua yang kalah sudah dijawab
	h := s.idempoten(func(w http.ResponseWriter, r *http.Request) {
		kerja.Add(1)
		<-lepas
		w.Header().Set("Location", "/transfers/1")
		tulisJSON(w, 201, map[string]int{"id": 1})
	})
	k := fmt.Sprintf(`"%s"`, fmt.Sprintf("%08x-0003-4000-8000-%012x", time.Now().UnixNano()&0xffffffff, time.Now().UnixNano()&0xffffffffffff))
	const n = 20
	hasil := make(chan int, n)
	for i := 0; i < n; i++ {
		go func() { hasil <- panggil(h, akun, k, `{"ke":418,"jumlah":25000}`).Code }()
	}
	batas := time.After(10 * time.Second)
	for kalah := 0; kalah < n-1; kalah++ {
		select {
		case kode := <-hasil:
			if kode != 409 {
				close(lepas)
				t.Fatalf("jawaban ke-%d selagi pemenang menahan handler: status %d, handler dipanggil %d kali; harus 409 dan 1", kalah+1, kode, kerja.Load())
			}
		case <-batas:
			close(lepas)
			t.Fatalf("hanya %d dari %d jawaban 409 datang selagi pemenang menahan handler; handler dipanggil %d kali, harus 1", kalah, n-1, kerja.Load())
		}
	}
	close(lepas)
	if kode := <-hasil; kode != 201 || kerja.Load() != 1 {
		t.Fatalf("pemenang: status %d, handler dipanggil %d kali; harus 201 dan 1", kode, kerja.Load())
	}
	if r := panggil(h, akun, k, `{"ke":418,"jumlah":25000}`); r.Code != 201 || r.Header().Get("Location") != "/transfers/1" || kerja.Load() != 1 {
		t.Fatalf("ulangan sesudah selesai: status %d, Location %q, handler dipanggil %d kali; harus 201, /transfers/1, 1",
			r.Code, r.Header().Get("Location"), kerja.Load())
	}
}

// PUT /produk/{id}/stok menimpa stok tanpa syarat versi (M24): hanya ada di mode rentan stok-timpa. Server dengan mode lain
// atau tanpa mode tidak boleh punya rutenya, kalau tidak setiap server api-t3 membawa kerentanan M24.
func TestStokTimpaHanyaDiModeRentan(t *testing.T) {
	req := httptest.NewRequest("PUT", "/produk/61/stok", strings.NewReader(`{"stok":0}`))
	for _, mode := range []string{"", "push-dalam-tx", "kursor", "ekspor-panic", "tanpa-shutdown", "urut-waktu"} {
		if _, pola := (Server{}).DenganRentan(mode).Rute().Handler(req); pola != "" {
			t.Errorf("mode %q: PUT /produk/{id}/stok terdaftar sebagai %q; hanya mode stok-timpa yang boleh", mode, pola)
		}
	}
	if _, pola := (Server{}).DenganRentan(service.RentanStokTimpa).Rute().Handler(req); pola != "PUT /produk/{id}/stok" {
		t.Errorf("mode stok-timpa: rute %q; harus PUT /produk/{id}/stok", pola)
	}
}
