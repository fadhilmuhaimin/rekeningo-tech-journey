// Paket skor: aturan skor risiko untuk peraga lab t5-gabung. Skor ini BUKAN fitur produk dan bukan model risiko:
// aturannya sengaja sederhana (poin bilangan bulat), supaya dua cara menjalankannya (satu proses, tiga proses)
// bisa dibandingkan hasilnya persis. Tidak ada waktu, acak, atau pecahan di sini.
package skor

// Permintaan adalah satu transaksi yang dinilai.
type Permintaan struct {
	ID            string `json:"id"`
	AkunID        int    `json:"akun_id"`
	PerangkatID   int    `json:"perangkat_id"`
	NominalRupiah int64  `json:"nominal"`
}

// FiturAkun datang dari data akun.
type FiturAkun struct {
	UmurHari   int  `json:"umur_hari"`
	Verifikasi int  `json:"verifikasi"` // 0 belum, 1 dasar, 2 penuh
	Dibekukan  bool `json:"dibekukan"`
}

// FiturPerangkat datang dari data perangkat.
type FiturPerangkat struct {
	JumlahAkun int `json:"jumlah_akun"` // akun yang pernah dipakai di perangkat ini
	UmurHari   int `json:"umur_hari"`
}

// FiturRiwayat datang dari riwayat transaksi akun.
type FiturRiwayat struct {
	Jumlah24Jam    int   `json:"jumlah_24_jam"`
	RataRata30Hari int64 `json:"rata_rata_30_hari"` // rupiah, 0 bila tidak ada riwayat
}

// Hasil adalah keluaran akhir: poin, keputusan, dan kode aturan yang menyumbang poin (urut aturan).
type Hasil struct {
	Skor      int      `json:"skor"`
	Keputusan string   `json:"keputusan"`
	Alasan    []string `json:"alasan"`
}

// Ambang keputusan.
const (
	AmbangTolak  = 70
	AmbangTinjau = 40
)

// Hitung menjumlahkan poin dari tiga kelompok fitur dan nominal. Urutan aturan tetap, hasil dibatasi 100.
func Hitung(a FiturAkun, p FiturPerangkat, r FiturRiwayat, nominal int64) Hasil {
	h := Hasil{Alasan: []string{}}
	tambah := func(poin int, kode string) {
		h.Skor += poin
		h.Alasan = append(h.Alasan, kode)
	}
	if a.Dibekukan {
		tambah(100, "akun-dibekukan")
	}
	if a.UmurHari < 7 {
		tambah(20, "akun-baru")
	}
	if a.Verifikasi == 0 {
		tambah(15, "belum-verifikasi")
	}
	if p.JumlahAkun > 3 {
		tambah(25, "perangkat-banyak-akun")
	}
	if p.UmurHari < 2 {
		tambah(10, "perangkat-baru")
	}
	if r.Jumlah24Jam > 10 {
		tambah(20, "transaksi-sering")
	}
	if r.RataRata30Hari == 0 {
		tambah(10, "tanpa-riwayat")
	} else if nominal > 3*r.RataRata30Hari {
		tambah(20, "nominal-besar")
	}
	if h.Skor > 100 {
		h.Skor = 100
	}
	switch {
	case h.Skor >= AmbangTolak:
		h.Keputusan = "tolak"
	case h.Skor >= AmbangTinjau:
		h.Keputusan = "tinjau"
	default:
		h.Keputusan = "setuju"
	}
	return h
}
