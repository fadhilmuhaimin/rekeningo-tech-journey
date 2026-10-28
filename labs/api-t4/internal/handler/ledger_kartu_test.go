package handler

import (
	"bytes"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"lab/apit4/internal/modul/ledger"
)

// Tes bentuk jawaban POST /ledger/kartu/tahan (ADR 42, lab t4-kartu): status dan alasan tiap hasil, dan pemetaan
// client ledger.Klien.TahanKartu terhadap server sungguhan dengan PostgreSQL sungguhan. Lama menunggu lock
// bergantung mesin, jadi diperiksa sebagai batas.

var urutKartuHTTP atomic.Int64

func idTahan() string {
	return fmt.Sprintf("AUTH-http-%d-%d", time.Now().UnixNano(), urutKartuHTTP.Add(1))
}

// akunBersaldo: akun karyawan terverifikasi dengan saldo, diisi lewat API ledger top-up (jalan uang yang sah).
func akunBersaldo(t *testing.T, srv *httptest.Server, db *sql.DB, saldo int64) int64 {
	t.Helper()
	akun := akunLedgerTes(t, db, "terverifikasi")
	order := fmt.Sprintf("TB-kartu-%d-%d", time.Now().UnixNano(), urutKartuHTTP.Add(1))
	if _, err := ledger.Baru(srv.URL, kunciLayananTes, 3*time.Second).KreditTopup(t.Context(), order,
		ledger.Permintaan{OrderID: order, AkunID: akun, Jumlah: saldo}); err != nil {
		t.Fatal(err)
	}
	return akun
}

func postTahan(t *testing.T, srv *httptest.Server, kunciLayanan, idemKey, body string) (int, string) {
	t.Helper()
	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/ledger/kartu/tahan", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	if kunciLayanan != "" {
		req.Header.Set(KunciLayananHeader, kunciLayanan)
	}
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

func badanTahan(id string, akun, jumlah int64) string {
	return fmt.Sprintf(`{"id_penerbit":%q,"akun_id":%d,"jumlah":%d}`, id, akun, jumlah)
}

func TestLedgerKartuTahanStatusDanAlasan(t *testing.T) {
	srv, db := ledgerTes(t, nil)
	akun := akunBersaldo(t, srv, db, 100_000)
	beku := akunBersaldo(t, srv, db, 100_000)
	if _, err := db.Exec(`UPDATE akun SET status = 'dibekukan' WHERE id = $1`, beku); err != nil {
		t.Fatal(err)
	}
	a1, a2, a3, a4, a5, a6 := idTahan(), idTahan(), idTahan(), idTahan(), idTahan(), idTahan()
	kasus := []struct {
		nama, layanan, kunci, isi string
		status                    int
		alasan                    string
	}{
		{"kunci layanan salah", "salah", a1, badanTahan(a1, akun, 1000), 401, `"alasan":"kunci-layanan"`},
		{"tanpa kunci layanan", "", a1, badanTahan(a1, akun, 1000), 401, `"alasan":"kunci-layanan"`},
		{"tanpa Idempotency-Key", kunciLayananTes, "", badanTahan(a1, akun, 1000), 400, `"alasan":"idempotency-key-wajib"`},
		{"body bukan JSON", kunciLayananTes, a1, `{`, 400, `"alasan":"body-tidak-sah"`},
		{"id_penerbit kosong", kunciLayananTes, "x", badanTahan("", akun, 1000), 400, `"alasan":"body-tidak-sah"`},
		{"akun_id 0", kunciLayananTes, a1, badanTahan(a1, 0, 1000), 400, `"alasan":"body-tidak-sah"`},
		{"key beda id_penerbit", kunciLayananTes, a2, badanTahan(a1, akun, 1000), 422, `"alasan":"tidak-sah"`},
		{"jumlah 0", kunciLayananTes, a3, badanTahan(a3, akun, 0), 422, `"alasan":"tidak-sah"`},
		{"saldo kurang", kunciLayananTes, a4, badanTahan(a4, akun, 100_001), 422, `"alasan":"saldo-kurang"`},
		{"akun dibekukan", kunciLayananTes, a5, badanTahan(a5, beku, 1000), 422, `"alasan":"akun-dibekukan"`},
		{"akun tidak ada", kunciLayananTes, a6, badanTahan(a6, 987_654_321, 1000), 404, `"alasan":"akun-tidak-ada"`},
	}
	for _, k := range kasus {
		s, isi := postTahan(t, srv, k.layanan, k.kunci, k.isi)
		if s != k.status || !strings.Contains(isi, k.alasan) {
			t.Errorf("%s: %d %s; harus %d dengan %s", k.nama, s, isi, k.status, k.alasan)
		}
	}
	// Penolakan tidak menahan key.
	var tertahan int
	if err := db.QueryRow(`SELECT count(*) FROM kunci_idempotensi WHERE kunci IN ($1, $2, $3)`, a4, a5, a6).Scan(&tertahan); err != nil || tertahan != 0 {
		t.Errorf("%d key tertahan sesudah penolakan (%v), harus 0", tertahan, err)
	}
}

func TestLedgerKartuTahanBaruLaluUlangDanBentrok(t *testing.T) {
	srv, db := ledgerTes(t, nil)
	akun := akunBersaldo(t, srv, db, 100_000)
	id := idTahan()
	s1, isi1 := postTahan(t, srv, kunciLayananTes, id, badanTahan(id, akun, 40_000))
	s2, isi2 := postTahan(t, srv, kunciLayananTes, id, badanTahan(id, akun, 40_000))
	if s1 != 201 || !strings.Contains(isi1, `"ulang":false`) {
		t.Fatalf("pertama: %d %s; harus 201 ulang false", s1, isi1)
	}
	if s2 != 200 || !strings.Contains(isi2, `"ulang":true`) {
		t.Fatalf("kedua: %d %s; harus 200 ulang true", s2, isi2)
	}
	j1 := strings.SplitN(strings.SplitN(isi1, `"jurnal":`, 2)[1], ",", 2)[0]
	j2 := strings.SplitN(strings.SplitN(isi2, `"jurnal":`, 2)[1], ",", 2)[0]
	if j1 != j2 {
		t.Fatalf("jurnal %s lawan %s; harus sama", j1, j2)
	}
	if s, isi := postTahan(t, srv, kunciLayananTes, id, badanTahan(id, akun, 40_001)); s != 422 || !strings.Contains(isi, `"alasan":"key-dipakai-permintaan-lain"`) {
		t.Fatalf("jumlah lain: %d %s; harus 422 key-dipakai-permintaan-lain", s, isi)
	}
	var n int
	db.QueryRow(`SELECT count(*) FROM jurnal WHERE jenis = 'kartu_tahan' AND keterangan = $1`, "Dana tertahan otorisasi kartu "+id).Scan(&n)
	if n != 1 {
		t.Fatalf("%d jurnal kartu_tahan, harus 1", n)
	}
}

// 503 sibuk hanya untuk lock yang tidak didapat dalam lock_timeout (bawaan 1 detik); client memetakannya ke ErrSibuk,
// bukan ErrTidakPasti: pemanggil tahu tidak ada hold dan bisa menolak tanpa menebak.
func TestLedgerKartuTahanLockDitahanMenjawab503SibukDanClientMemetakan(t *testing.T) {
	srv, db := ledgerTes(t, nil)
	akun := akunBersaldo(t, srv, db, 100_000)
	penahan, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { penahan.Rollback() }) // lock tidak boleh bocor ke tes berikutnya bila tes ini gagal di tengah
	if _, err := penahan.Exec(`SELECT id FROM buku WHERE akun_id = $1 FOR UPDATE`, akun); err != nil {
		t.Fatal(err)
	}
	lepas := time.AfterFunc(6*time.Second, func() { penahan.Rollback() })
	defer lepas.Stop()
	id := idTahan()
	mulai := time.Now()
	s, isi := postTahan(t, srv, kunciLayananTes, id, badanTahan(id, akun, 1000))
	lama := time.Since(mulai)
	if s != 503 || !strings.Contains(isi, `"alasan":"sibuk"`) {
		t.Fatalf("%d %s; harus 503 sibuk", s, isi)
	}
	if lama < 900*time.Millisecond || lama > 4*time.Second {
		t.Fatalf("503 sibuk butuh %s; harus kira-kira lock_timeout bawaan 1 detik", lama)
	}
	id2 := idTahan()
	_, err = ledger.Baru(srv.URL, kunciLayananTes, 5*time.Second).TahanKartu(t.Context(), id2,
		ledger.PermintaanTahan{IDPenerbit: id2, AkunID: akun, Jumlah: 1000})
	if !errors.Is(err, ledger.ErrSibuk) || errors.Is(err, ledger.ErrTidakPasti) {
		t.Fatalf("client: %v; harus ErrSibuk dan bukan ErrTidakPasti", err)
	}
	penahan.Rollback()
	if s, _ := postTahan(t, srv, kunciLayananTes, id, badanTahan(id, akun, 1000)); s != 201 {
		t.Fatalf("sesudah lock lepas: %d, harus 201", s)
	}
}

func TestLedgerKartuClientMemetakanJawaban(t *testing.T) {
	srv, db := ledgerTes(t, nil)
	akun := akunBersaldo(t, srv, db, 100_000)
	k := ledger.Baru(srv.URL, kunciLayananTes, 3*time.Second)
	id := idTahan()
	h, err := k.TahanKartu(t.Context(), id, ledger.PermintaanTahan{IDPenerbit: id, AkunID: akun, Jumlah: 60_000})
	if err != nil || h.Ulang || h.Jurnal <= 0 {
		t.Fatalf("baru: %+v, %v", h, err)
	}
	h2, err := k.TahanKartu(t.Context(), id, ledger.PermintaanTahan{IDPenerbit: id, AkunID: akun, Jumlah: 60_000})
	if err != nil || !h2.Ulang || h2.Jurnal != h.Jurnal {
		t.Fatalf("ulangan: %+v, %v", h2, err)
	}
	id2 := idTahan()
	_, err = k.TahanKartu(t.Context(), id2, ledger.PermintaanTahan{IDPenerbit: id2, AkunID: akun, Jumlah: 60_000})
	var pen ledger.Penolakan
	if !errors.As(err, &pen) || pen.Alasan != "saldo-kurang" || !errors.Is(err, ledger.ErrDitolak) {
		t.Fatalf("saldo kurang: %v; harus Penolakan saldo-kurang", err)
	}
	salah := ledger.Baru(srv.URL, "kunci-salah", 3*time.Second)
	if _, err := salah.TahanKartu(t.Context(), id2, ledger.PermintaanTahan{IDPenerbit: id2, AkunID: akun, Jumlah: 1}); !errors.Is(err, ledger.ErrTidakSah) {
		t.Fatalf("kunci layanan salah: %v; harus ErrTidakSah", err)
	}
}
