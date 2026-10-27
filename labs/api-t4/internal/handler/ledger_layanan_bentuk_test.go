package handler

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// Bentuk jawaban API ledger (ADR 37, lab t4-modul): status dan alasan tiap penolakan, validasi bentuk body, dan batas
// ukuran body 4 KiB. Client ledger.Klien memetakan 422 dan 404 ke penolakan dan sisanya ke "tidak pasti" atau
// "tidak sah"; pemetaan itu hanya benar bila server menjawab persis seperti yang dijanjikan di sini.

func postLedgerIsi(t *testing.T, srv *httptest.Server, idemKey, body string) (int, string) {
	t.Helper()
	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/ledger/jurnal-topup", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(KunciLayananHeader, kunciLayananTes)
	if idemKey != "" {
		req.Header.Set("Idempotency-Key", idemKey)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	isi, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, strings.TrimSpace(string(isi))
}

func TestLedgerHTTPStatusDanAlasanPerPenolakan(t *testing.T) {
	srv, db := ledgerTes(t, nil)
	terverifikasi := akunLedgerTes(t, db, "terverifikasi")
	belum := akunLedgerTes(t, db, "belum")
	beku := akunLedgerTes(t, db, "terverifikasi")
	if _, err := db.Exec(`UPDATE akun SET status = 'dibekukan' WHERE id = $1`, beku); err != nil {
		t.Fatal(err)
	}
	urut := 0
	order := func() string {
		urut++
		return fmt.Sprintf("TB-bentuk-%d-%d", time.Now().UnixNano(), urut)
	}
	badan := func(o string, akun, jumlah int64, tambahan string) string {
		return fmt.Sprintf(`{"order_id":%q,"akun_id":%d,"jumlah":%d%s}`, o, akun, jumlah, tambahan)
	}
	o1, o2, o3, o4, o5, o6, o7, o8, o9 := order(), order(), order(), order(), order(), order(), order(), order(), order()
	kasus := []struct {
		nama   string
		kunci  string
		isi    string
		status int
		alasan string
	}{
		{"akun_id 0", o1, badan(o1, 0, 1000, ""), 400, `"alasan":"body-tidak-sah"`},
		{"order_id kosong", "x", badan("", terverifikasi, 1000, ""), 400, `"alasan":"body-tidak-sah"`},
		{"body bukan JSON", o2, `bukan json`, 400, `"alasan":"body-tidak-sah"`},
		{"akun tidak ada", o3, badan(o3, 999_999_999, 1000, ""), 404, `"alasan":"akun-tidak-ada"`},
		{"akun dibekukan", o4, badan(o4, beku, 1000, ""), 422, `"alasan":"akun-dibekukan"`},
		{"melewati batas tingkat", o5, badan(o5, belum, 1_000_001, ""), 422, `"alasan":"batas-tingkat"`},
		{"jumlah di atas batas top-up", o6, badan(o6, terverifikasi, 5_000_001, ""), 422, `"field":"jumlah"`},
		{"body 3 KiB masih diterima", o7, badan(o7, terverifikasi, 1000, `,"x":"`+strings.Repeat("a", 3000)+`"`), 201, `"ulang":false`},
		{"body 5 KiB ditolak (batas 4 KiB)", o8, badan(o8, terverifikasi, 1000, `,"x":"`+strings.Repeat("a", 5000)+`"`), 400, `"alasan":"body-tidak-sah"`},
		{"permintaan sah", o9, badan(o9, terverifikasi, 1000, ""), 201, `"ulang":false`},
	}
	for _, k := range kasus {
		status, isi := postLedgerIsi(t, srv, k.kunci, k.isi)
		if status != k.status || !strings.Contains(isi, k.alasan) {
			t.Errorf("%s: status %d isi %s; ingin %d dengan %s", k.nama, status, isi, k.status, k.alasan)
		}
	}
	if n := jumlahJurnalTopup(t, db, o8); n != 0 {
		t.Errorf("body 5 KiB menulis %d jurnal, ingin 0", n)
	}
}
