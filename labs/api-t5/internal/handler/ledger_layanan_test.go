package handler

import (
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"lab/apit5/internal/repo"
	"lab/apit5/internal/service"
)

// Versi kunci bersama (ADR 37) tetap bekerja sesudah isi rute dipisah dari pemeriksa pemanggil (lab t5-service): kunci
// salah atau kosong dijawab 401 tanpa jurnal, kunci benar membuat satu jurnal, dan tanpa kunci yang dikonfigurasi rute
// tidak dipasang. Pemisahan ini yang memungkinkan identitas mTLS memakai isi rute yang sama.
func TestPasangLedgerKunciBersama(t *testing.T) {
	_, db := serverT4(t, nil)
	akun, _ := akunDB(t, db, "pemakai", "terverifikasi", 0)
	svc := service.Baru(repo.Baru(db), time.Hour)

	mux := http.NewServeMux()
	PasangLedger(mux, svc, "kunci-lab", false)
	srv := httptest.NewServer(mux)
	defer srv.Close()
	order := fmt.Sprintf("TB-KUNCI-%d", time.Now().UnixNano())
	kirim := func(kunci string) (int, string) {
		req, _ := http.NewRequest("POST", srv.URL+"/ledger/jurnal-topup", strings.NewReader(fmt.Sprintf(`{"order_id":%q,"akun_id":%d,"jumlah":1000}`, order, akun)))
		req.Header.Set("Idempotency-Key", order)
		if kunci != "" {
			req.Header.Set(KunciLayananHeader, kunci)
		}
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		isi, _ := io.ReadAll(res.Body)
		return res.StatusCode, string(isi)
	}
	jurnal := func() (n int) {
		db.QueryRow(`SELECT count(*) FROM jurnal WHERE keterangan = $1`, "Top-up bank "+order).Scan(&n)
		return
	}
	for _, kunci := range []string{"", "salah"} {
		if s, isi := kirim(kunci); s != 401 || !strings.Contains(isi, "kunci-layanan") {
			t.Errorf("kunci %q: %d %s, ingin 401 kunci-layanan", kunci, s, isi)
		}
	}
	if n := jurnal(); n != 0 {
		t.Fatalf("jurnal sesudah dua kunci salah: %d", n)
	}
	if s, isi := kirim("kunci-lab"); s != 201 {
		t.Fatalf("kunci benar: %d %s", s, isi)
	}
	if n := jurnal(); n != 1 {
		t.Errorf("jurnal sesudah kunci benar: %d, ingin 1", n)
	}
	// Rute kartu/tahan memakai pemeriksa kunci yang sama (ADR 42): kunci salah atau kosong dijawab 401, kunci benar lolos.
	idTahan := "AUTH-" + order
	tahan := func(kunci string) (int, string) {
		req, _ := http.NewRequest("POST", srv.URL+"/ledger/kartu/tahan", strings.NewReader(fmt.Sprintf(`{"id_penerbit":%q,"akun_id":%d,"jumlah":1000}`, idTahan, akun)))
		req.Header.Set("Idempotency-Key", idTahan)
		if kunci != "" {
			req.Header.Set(KunciLayananHeader, kunci)
		}
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		isi, _ := io.ReadAll(res.Body)
		return res.StatusCode, string(isi)
	}
	for _, kunci := range []string{"", "salah"} {
		if s, isi := tahan(kunci); s != 401 || !strings.Contains(isi, "kunci-layanan") {
			t.Errorf("kartu/tahan dengan kunci %q: %d %s, ingin 401 kunci-layanan", kunci, s, isi)
		}
	}
	var nTahan int
	db.QueryRow(`SELECT count(*) FROM jurnal WHERE jenis = 'kartu_tahan' AND keterangan LIKE '%' || $1 || '%'`, idTahan).Scan(&nTahan)
	if nTahan != 0 {
		t.Fatalf("jurnal kartu_tahan sesudah dua kunci salah: %d", nTahan)
	}
	if s, isi := tahan("kunci-lab"); s == 401 || s == 404 {
		t.Errorf("kartu/tahan dengan kunci benar: %d %s, ingin lolos dari pemeriksa kunci (jawaban lain dari isi rute)", s, isi)
	}
	kosong := http.NewServeMux()
	PasangLedger(kosong, svc, "", false)
	s2 := httptest.NewServer(kosong)
	defer s2.Close()
	if res, err := http.Post(s2.URL+"/ledger/jurnal-topup", "application/json", strings.NewReader("{}")); err != nil || res.StatusCode != 404 {
		t.Errorf("tanpa kunci terkonfigurasi: %v %v, ingin 404 (rute tidak dipasang)", res, err)
	}
}
