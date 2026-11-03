package skor

import (
	"reflect"
	"testing"
)

func TestHitungAturanSatuPerSatu(t *testing.T) {
	aman := FiturAkun{UmurHari: 100, Verifikasi: 2}
	pAman := FiturPerangkat{JumlahAkun: 1, UmurHari: 100}
	rAman := FiturRiwayat{Jumlah24Jam: 1, RataRata30Hari: 100_000}
	kasus := []struct {
		nama   string
		a      FiturAkun
		p      FiturPerangkat
		r      FiturRiwayat
		nom    int64
		skor   int
		alasan []string
	}{
		{"semua aman", aman, pAman, rAman, 100_000, 0, []string{}},
		{"akun dibekukan", FiturAkun{UmurHari: 100, Verifikasi: 2, Dibekukan: true}, pAman, rAman, 100_000, 100, []string{"akun-dibekukan"}},
		{"akun baru", FiturAkun{UmurHari: 6, Verifikasi: 2}, pAman, rAman, 100_000, 20, []string{"akun-baru"}},
		{"akun tepat tujuh hari bukan baru", FiturAkun{UmurHari: 7, Verifikasi: 2}, pAman, rAman, 100_000, 0, []string{}},
		{"belum verifikasi", FiturAkun{UmurHari: 100, Verifikasi: 0}, pAman, rAman, 100_000, 15, []string{"belum-verifikasi"}},
		{"perangkat empat akun", aman, FiturPerangkat{JumlahAkun: 4, UmurHari: 100}, rAman, 100_000, 25, []string{"perangkat-banyak-akun"}},
		{"perangkat tiga akun wajar", aman, FiturPerangkat{JumlahAkun: 3, UmurHari: 100}, rAman, 100_000, 0, []string{}},
		{"perangkat baru", aman, FiturPerangkat{JumlahAkun: 1, UmurHari: 1}, rAman, 100_000, 10, []string{"perangkat-baru"}},
		{"sebelas transaksi", aman, pAman, FiturRiwayat{Jumlah24Jam: 11, RataRata30Hari: 100_000}, 100_000, 20, []string{"transaksi-sering"}},
		{"sepuluh transaksi wajar", aman, pAman, FiturRiwayat{Jumlah24Jam: 10, RataRata30Hari: 100_000}, 100_000, 0, []string{}},
		{"tanpa riwayat", aman, pAman, FiturRiwayat{}, 100_000, 10, []string{"tanpa-riwayat"}},
		{"nominal tiga kali rata-rata wajar", aman, pAman, rAman, 300_000, 0, []string{}},
		{"nominal di atas tiga kali rata-rata", aman, pAman, rAman, 300_001, 20, []string{"nominal-besar"}},
	}
	for _, k := range kasus {
		h := Hitung(k.a, k.p, k.r, k.nom)
		if h.Skor != k.skor || !reflect.DeepEqual(h.Alasan, k.alasan) {
			t.Errorf("%s: dapat %d %v, harus %d %v", k.nama, h.Skor, h.Alasan, k.skor, k.alasan)
		}
	}
}

func TestHitungDibatasiSeratusDanAmbangKeputusan(t *testing.T) {
	h := Hitung(FiturAkun{UmurHari: 1, Verifikasi: 0, Dibekukan: true}, FiturPerangkat{JumlahAkun: 5, UmurHari: 0}, FiturRiwayat{Jumlah24Jam: 20}, 1)
	if h.Skor != 100 || h.Keputusan != "tolak" {
		t.Fatalf("skor harus dibatasi 100: dapat %d %s", h.Skor, h.Keputusan)
	}
	batas := []struct {
		akun FiturAkun
		perg FiturPerangkat
		skor int
		kep  string
	}{
		{FiturAkun{UmurHari: 1, Verifikasi: 2}, FiturPerangkat{JumlahAkun: 1, UmurHari: 100}, 20, "setuju"},
		{FiturAkun{UmurHari: 1, Verifikasi: 2}, FiturPerangkat{JumlahAkun: 4, UmurHari: 100}, 45, "tinjau"},
		{FiturAkun{UmurHari: 1, Verifikasi: 0}, FiturPerangkat{JumlahAkun: 4, UmurHari: 100}, 60, "tinjau"},
		{FiturAkun{UmurHari: 1, Verifikasi: 0}, FiturPerangkat{JumlahAkun: 4, UmurHari: 1}, 70, "tolak"},
	}
	r := FiturRiwayat{Jumlah24Jam: 1, RataRata30Hari: 100_000}
	for _, k := range batas {
		h := Hitung(k.akun, k.perg, r, 100_000)
		if h.Skor != k.skor || h.Keputusan != k.kep {
			t.Errorf("dapat %d %s, harus %d %s", h.Skor, h.Keputusan, k.skor, k.kep)
		}
	}
}

// Data peraga harus menghasilkan ketiga keputusan; kalau tidak, perbandingan dua versi tidak membuktikan apa-apa.
func TestDataMenghasilkanSemuaKeputusanDanSemuaAturan(t *testing.T) {
	toko := NewToko()
	kep := map[string]int{}
	alasan := map[string]int{}
	for i := 0; i < 2000; i++ {
		h, err := toko.Nilai(Transaksi(i))
		if err != nil {
			t.Fatal(err)
		}
		kep[h.Keputusan]++
		for _, a := range h.Alasan {
			alasan[a]++
		}
	}
	for _, k := range []string{"setuju", "tinjau", "tolak"} {
		if kep[k] < 20 {
			t.Errorf("keputusan %s hanya %d dari 2000", k, kep[k])
		}
	}
	for _, a := range []string{"akun-dibekukan", "akun-baru", "belum-verifikasi", "perangkat-banyak-akun", "perangkat-baru", "transaksi-sering", "tanpa-riwayat", "nominal-besar"} {
		if alasan[a] == 0 {
			t.Errorf("aturan %s tidak pernah menyala dalam 2000 transaksi", a)
		}
	}
}

func TestDataDeterministik(t *testing.T) {
	a, b := NewToko(), NewToko()
	for i := 0; i < 300; i++ {
		ha, _ := a.Nilai(Transaksi(i))
		hb, _ := b.Nilai(Transaksi(i))
		if !reflect.DeepEqual(ha, hb) {
			t.Fatalf("transaksi %d berbeda antar dua toko", i)
		}
	}
	if Transaksi(7) != Transaksi(7) || Transaksi(7) == Transaksi(8) {
		t.Fatal("Transaksi harus ditentukan oleh nomornya saja")
	}
}

func TestIDDiLuarDataDitolak(t *testing.T) {
	toko := NewToko()
	for _, p := range []Permintaan{
		{ID: "x", AkunID: -1, PerangkatID: 0}, {ID: "x", AkunID: JumlahAkun, PerangkatID: 0},
		{ID: "x", AkunID: 0, PerangkatID: -1}, {ID: "x", AkunID: 0, PerangkatID: JumlahPerangkat},
	} {
		if _, err := toko.Nilai(p); err != ErrTidakAda {
			t.Errorf("%+v: harus ErrTidakAda, dapat %v", p, err)
		}
	}
}

func TestRingkasRiwayatMenghitungDariBaris(t *testing.T) {
	r := &TokoRiwayat{akun: [][]Baris{{
		{MenitLalu: 10, Nominal: 10_000}, {MenitLalu: 1439, Nominal: 20_000}, {MenitLalu: 1440, Nominal: 30_000},
		{MenitLalu: 43_199, Nominal: 40_000}, {MenitLalu: 43_200, Nominal: 999_000},
	}, {}}}
	f, err := r.Ringkas(0)
	if err != nil {
		t.Fatal(err)
	}
	// 24 jam: baris 1 dan 2. 30 hari: empat baris pertama (43.200 menit tepat tidak masuk): (10+20+30+40) ribu ÷ 4.
	if f.Jumlah24Jam != 2 || f.RataRata30Hari != 25_000 {
		t.Errorf("dapat %+v, harus 2 transaksi dan rata-rata 25.000", f)
	}
	if f, _ := r.Ringkas(1); f != (FiturRiwayat{}) {
		t.Errorf("akun tanpa baris harus kosong, dapat %+v", f)
	}
}
