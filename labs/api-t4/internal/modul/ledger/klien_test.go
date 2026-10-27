package ledger_test

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"lab/apit4/internal/modul/ledger"
)

// Pemetaan jawaban API ledger oleh client (ADR 37, ADR 34), tanpa database: server tiruan menjawab status tertentu.
// Pemanggil (modul pembayaran) bergantung pada pembedaan ini: ErrDitolak diparkir, ErrTidakPasti tidak menandai apa pun
// dan diulang dengan key yang sama, ErrTidakSah adalah galat pemrograman.

func jawab(status int, isi string) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(status)
		io.WriteString(w, isi)
	}))
}

func TestKlienMemetakanJawabanLedger(t *testing.T) {
	kasus := []struct {
		nama   string
		status int
		isi    string
		ingin  error // nil = berhasil
		alasan string
		ulang  bool
	}{
		{"201 jurnal baru", 201, `{"jurnal":7,"ulang":false}`, nil, "", false},
		{"200 ulangan", 200, `{"jurnal":7,"ulang":true}`, nil, "", true},
		{"200 tanpa nomor jurnal", 200, `{"ulang":false}`, ledger.ErrTidakPasti, "", false},
		{"200 nomor jurnal nol", 200, `{"jurnal":0,"ulang":false}`, ledger.ErrTidakPasti, "", false},
		{"200 bukan JSON", 200, `bukan json`, ledger.ErrTidakPasti, "", false},
		{"422 ditolak", 422, `{"alasan":"akun-dibekukan"}`, ledger.ErrDitolak, "akun-dibekukan", false},
		{"404 akun tidak ada", 404, `{"alasan":"akun-tidak-ada"}`, ledger.ErrDitolak, "akun-tidak-ada", false},
		{"500", 500, `{}`, ledger.ErrTidakPasti, "", false},
		{"503", 503, ``, ledger.ErrTidakPasti, "", false},
		{"401 kunci layanan salah", 401, `{"alasan":"kunci-layanan"}`, ledger.ErrTidakSah, "", false},
		{"400 bentuk salah", 400, `{"alasan":"body-tidak-sah"}`, ledger.ErrTidakSah, "", false},
		{"302 tidak diikuti", 302, ``, ledger.ErrTidakSah, "", false},
	}
	for _, k := range kasus {
		srv := jawab(k.status, k.isi)
		h, err := ledger.Baru(srv.URL, "kunci", 3*time.Second).KreditTopup(t.Context(), "TB-1", ledger.Permintaan{OrderID: "TB-1", AkunID: 9, Jumlah: 1000})
		srv.Close()
		if k.ingin == nil {
			if err != nil || h.Jurnal != 7 || h.Ulang != k.ulang {
				t.Errorf("%s: %+v, %v; ingin jurnal 7 ulang=%v", k.nama, h, err, k.ulang)
			}
			continue
		}
		for _, lain := range []error{ledger.ErrDitolak, ledger.ErrTidakPasti, ledger.ErrTidakSah} {
			if got := errors.Is(err, lain); got != (lain == k.ingin) {
				t.Errorf("%s: errors.Is(%v) = %v; ingin hanya %v (galat: %v)", k.nama, lain, got, k.ingin, err)
			}
		}
		var p ledger.Penolakan
		if k.alasan != "" && (!errors.As(err, &p) || p.Alasan != k.alasan) {
			t.Errorf("%s: alasan %q, ingin %q", k.nama, p.Alasan, k.alasan)
		}
	}
}

func TestKlienMengirimKunciLayananIdempotencyKeyDanBody(t *testing.T) {
	var metode, path, kunciLayanan, idem string
	var isi struct {
		OrderID string `json:"order_id"`
		AkunID  int64  `json:"akun_id"`
		Jumlah  int64  `json:"jumlah"`
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		metode, path = r.Method, r.URL.Path
		kunciLayanan, idem = r.Header.Get("X-Layanan-Kunci"), r.Header.Get("Idempotency-Key")
		json.NewDecoder(r.Body).Decode(&isi)
		w.WriteHeader(201)
		io.WriteString(w, `{"jurnal":1}`)
	}))
	defer srv.Close()
	_, err := ledger.Baru(srv.URL, "kunci-layanan-x", 3*time.Second).KreditTopup(t.Context(), "TB-kunci", ledger.Permintaan{OrderID: "TB-order", AkunID: 42, Jumlah: 12345})
	if err != nil {
		t.Fatal(err)
	}
	if metode != http.MethodPost || path != "/ledger/jurnal-topup" || kunciLayanan != "kunci-layanan-x" || idem != "TB-kunci" ||
		isi.OrderID != "TB-order" || isi.AkunID != 42 || isi.Jumlah != 12345 {
		t.Fatalf("permintaan: %s %s kunci layanan %q Idempotency-Key %q body %+v", metode, path, kunciLayanan, idem, isi)
	}
}

// Server yang tidak menjawab sampai batas waktu: tidak pasti, bukan ditolak.
func TestKlienTimeoutAdalahTidakPasti(t *testing.T) {
	selesai := make(chan struct{})
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { <-selesai }))
	defer srv.Close()
	defer close(selesai)
	_, err := ledger.Baru(srv.URL, "kunci", 100*time.Millisecond).KreditTopup(t.Context(), "TB-2", ledger.Permintaan{OrderID: "TB-2", AkunID: 9, Jumlah: 1000})
	if !errors.Is(err, ledger.ErrTidakPasti) || errors.Is(err, ledger.ErrDitolak) {
		t.Fatalf("timeout: %v; ingin ErrTidakPasti", err)
	}
}
