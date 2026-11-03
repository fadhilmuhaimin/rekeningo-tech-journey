package layanan

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"
	"time"

	"lab/t5gabung/antrean"
	"lab/t5gabung/skor"
)

// pipa menjalankan versi tiga proses di dalam satu proses tes: broker, masuk, perangkat, dan riwayat sebagai goroutine
// dengan klien HTTP sendiri-sendiri, jadi setiap pesan tetap lewat soket.
type pipa struct {
	broker                   *antrean.Broker
	masuk                    *httptest.Server
	kMasuk, kPerangkat, kRiw *antrean.Klien
}

func nyalakan(t *testing.T, tanpaRiwayat bool, batas time.Duration) *pipa {
	t.Helper()
	b := antrean.NewBroker()
	bs := httptest.NewServer(b.Handler())
	ctx, batal := context.WithCancel(context.Background())
	t.Cleanup(func() { batal(); bs.Close() })
	p := &pipa{broker: b, kMasuk: antrean.NewKlien(bs.URL), kPerangkat: antrean.NewKlien(bs.URL), kRiw: antrean.NewKlien(bs.URL)}
	m := NewMasuk(p.kMasuk, skor.NewTokoAkun(), batas)
	m.JalankanHasil(ctx, 1)
	p.masuk = httptest.NewServer(m.Handler())
	t.Cleanup(p.masuk.Close)
	NewPerangkat(p.kPerangkat, skor.NewTokoPerangkat()).Jalankan(ctx, 1)
	if !tanpaRiwayat {
		NewRiwayat(p.kRiw, skor.NewTokoRiwayat()).Jalankan(ctx, 1)
	}
	return p
}

func panggil(t *testing.T, url string, p skor.Permintaan) (int, Jawaban) {
	t.Helper()
	isi, _ := json.Marshal(p)
	resp, err := http.Post(url+"/skor", "application/json", bytes.NewReader(isi))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	var j Jawaban
	_ = json.NewDecoder(resp.Body).Decode(&j)
	return resp.StatusCode, j
}

func TestTigaProsesSamaDenganSatuProsesDanEnamPanggilan(t *testing.T) {
	p := nyalakan(t, false, 5*time.Second)
	satu := httptest.NewServer((&Satu{Toko: skor.NewToko()}).Handler())
	defer satu.Close()
	const n = 120
	for i := 0; i < n; i++ {
		kode, tiga := panggil(t, p.masuk.URL, skor.Transaksi(i))
		kodeS, sat := panggil(t, satu.URL, skor.Transaksi(i))
		if kode != 200 || kodeS != 200 {
			t.Fatalf("transaksi %d: status %d dan %d", i, kode, kodeS)
		}
		if tiga.Panggilan != 6 || sat.Panggilan != 0 {
			t.Fatalf("transaksi %d: panggilan %d (tiga proses, harus 6) dan %d (satu proses, harus 0)", i, tiga.Panggilan, sat.Panggilan)
		}
		tiga.Panggilan, sat.Panggilan = 0, 0
		if !reflect.DeepEqual(tiga, sat) {
			t.Fatalf("transaksi %d: hasil berbeda: %+v lawan %+v", i, tiga, sat)
		}
	}
	// Tiga hitungan yang berdiri sendiri harus sama: pesan, klien tiap proses, dan broker.
	var klien int64
	for _, k := range []*antrean.Klien{p.kMasuk, p.kPerangkat, p.kRiw} {
		h := k.Hitungan()
		klien += h.Keluar + h.Masuk
	}
	m := p.broker.Metrik()
	if klien != 6*n || m.Publikasi+m.AmbilBerisi != 6*n || m.Publikasi != 3*n || m.AmbilBerisi != 3*n || m.Tertinggal != 0 {
		t.Errorf("klien %d, broker %+v, harus %d", klien, m, 6*n)
	}
	if m.ByteMasuk != m.ByteKeluar {
		t.Errorf("byte yang dikirim %d dan diterima %d harus sama", m.ByteMasuk, m.ByteKeluar)
	}
}

func TestProsesRiwayatMatiMembuatPermintaanHabisWaktuDanPesanTertinggal(t *testing.T) {
	p := nyalakan(t, true, 300*time.Millisecond)
	kode, j := panggil(t, p.masuk.URL, skor.Transaksi(1))
	if kode != http.StatusGatewayTimeout || j.Galat == "" {
		t.Fatalf("harus 504 dengan galat, dapat %d %+v", kode, j)
	}
	if m := p.broker.Metrik(); m.Tertinggal != 1 {
		t.Errorf("satu pesan harus tertinggal di topik riwayat: %+v", m)
	}
}

func TestIDDiLuarDataDijawab422DiKeduaVersi(t *testing.T) {
	p := nyalakan(t, false, 2*time.Second)
	satu := httptest.NewServer((&Satu{Toko: skor.NewToko()}).Handler())
	defer satu.Close()
	for _, perm := range []skor.Permintaan{
		{ID: "a", AkunID: skor.JumlahAkun, PerangkatID: 0, NominalRupiah: 1},
		{ID: "b", AkunID: 0, PerangkatID: skor.JumlahPerangkat, NominalRupiah: 1},
	} {
		k1, _ := panggil(t, p.masuk.URL, perm)
		k2, _ := panggil(t, satu.URL, perm)
		if k1 != http.StatusUnprocessableEntity || k2 != http.StatusUnprocessableEntity {
			t.Errorf("%+v: status %d dan %d, harus 422 dan 422", perm, k1, k2)
		}
	}
}

func TestPermintaanTanpaIDDitolak(t *testing.T) {
	satu := httptest.NewServer((&Satu{Toko: skor.NewToko()}).Handler())
	defer satu.Close()
	resp, err := http.Post(satu.URL+"/skor", "application/json", bytes.NewReader([]byte(`{"akun_id":1}`)))
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("harus 400, dapat %d", resp.StatusCode)
	}
}
