//go:build t4modul

package handler

import (
	"context"
	"fmt"
	"os"
	"sort"
	"testing"
	"time"

	"lab/apit4/internal/modul/ledger"
	"lab/apit4/internal/repo"
	"lab/apit4/internal/service"
)

// Tambahan latensi HTTP internal (ADR 37, lab t4-modul): fungsi ledger yang sama dipanggil langsung dan lewat
// HTTP (client ledger.Klien, server httptest di localhost). Selisihnya adalah ongkos satu lompatan antar service di
// satu mesin; jaringan sungguhan antar host menambah lebih dari itu dan tidak diukur di sini. Dijalankan hanya
// dengan -tags t4modul oleh labs/t4-modul/run.py.

// AnggaranTambahanHTTP: batas tambahan p95 yang diperiksa lab. Hitungan dari naskah ADR 42: tenggat penerbit 2.000
// ms dikurangi lock_timeout 1.000 ms menyisakan 1.000 ms untuk semuanya; 5% dari sisa itu (Asumsi lab) adalah 50 ms.
const anggaranTambahanHTTP = 50 * time.Millisecond

func persentil(d []time.Duration, p float64) time.Duration {
	s := append([]time.Duration{}, d...)
	sort.Slice(s, func(i, j int) bool { return s[i] < s[j] })
	i := int(float64(len(s)-1) * p)
	return s[i]
}

func TestLatensiHTTPInternalDiBawahAnggaran(t *testing.T) {
	srv, db := ledgerTes(t, nil)
	svc := service.Baru(repo.Baru(db), time.Hour)
	k := ledger.Baru(srv.URL, kunciLayananTes, 3*time.Second)
	a := akunLedgerTes(t, db, "terverifikasi")
	ctx := context.Background()
	const hangat, n = 10, 200
	var dalam, lewatHTTP []time.Duration
	for i := 0; i < hangat+n; i++ {
		o1 := fmt.Sprintf("TB-lat-d-%d-%d", time.Now().UnixNano(), i)
		mulai := time.Now()
		if _, err := svc.LedgerKreditTopup(ctx, o1, o1, a, 5_000); err != nil {
			t.Fatal(err)
		}
		d1 := time.Since(mulai)
		o2 := fmt.Sprintf("TB-lat-h-%d-%d", time.Now().UnixNano(), i)
		mulai = time.Now()
		if _, err := k.KreditTopup(ctx, o2, ledger.Permintaan{OrderID: o2, AkunID: a, Jumlah: 5_000}); err != nil {
			t.Fatal(err)
		}
		d2 := time.Since(mulai)
		if i >= hangat {
			dalam, lewatHTTP = append(dalam, d1), append(lewatHTTP, d2)
		}
	}
	tambah50 := persentil(lewatHTTP, 0.50) - persentil(dalam, 0.50)
	tambah95 := persentil(lewatHTTP, 0.95) - persentil(dalam, 0.95)
	// Nilai mentah ke stderr saja: angka mesin tidak masuk rekaman, hanya batas yang diperiksa.
	fmt.Fprintf(os.Stderr, "latensi (mesin ini): langsung p50 %v p95 %v; HTTP p50 %v p95 %v; tambahan p50 %v p95 %v\n",
		persentil(dalam, 0.50), persentil(dalam, 0.95), persentil(lewatHTTP, 0.50), persentil(lewatHTTP, 0.95), tambah50, tambah95)
	fmt.Printf("LAB|%d panggilan langsung dan %d lewat HTTP bergantian (10 pemanasan dibuang), fungsi ledger yang sama\n", n, n)
	fmt.Printf("LAB|batas: tambahan p95 lewat HTTP di bawah %v: %v\n", anggaranTambahanHTTP, map[bool]string{true: "ya", false: "tidak"}[tambah95 < anggaranTambahanHTTP])
	if tambah95 >= anggaranTambahanHTTP {
		t.Fatalf("tambahan p95 %v melewati anggaran %v", tambah95, anggaranTambahanHTTP)
	}
}
