package skor

import (
	"errors"
	"fmt"
)

// Ukuran data peraga. Data dibangkitkan dari benih tetap, jadi proses mana pun yang memegang satu bagian data
// melihat nilai yang sama dengan proses lain yang memegang bagian yang sama.
const (
	JumlahAkun          = 2000
	JumlahPerangkat     = 1500
	BarisRiwayatPerAkun = 60
	menit24Jam          = 24 * 60
	menit30Hari         = 30 * 24 * 60
)

// ErrTidakAda dikembalikan saat id akun atau perangkat di luar data.
var ErrTidakAda = errors.New("skor: data tidak ada")

// acak adalah xorshift64*: deterministik dan tidak bergantung versi pustaka standar.
type acak struct{ s uint64 }

func (a *acak) lanjut() uint64 {
	a.s ^= a.s >> 12
	a.s ^= a.s << 25
	a.s ^= a.s >> 27
	return a.s * 2685821657736338717
}

func (a *acak) n(m int) int { return int(a.lanjut() % uint64(m)) }

// TokoAkun memegang data akun.
type TokoAkun struct{ baris []FiturAkun }

// NewTokoAkun membangun data akun dari benih tetap.
func NewTokoAkun() *TokoAkun {
	r := &acak{s: 0x9E3779B97F4A7C15}
	t := &TokoAkun{baris: make([]FiturAkun, JumlahAkun)}
	for i := range t.baris {
		f := FiturAkun{UmurHari: 7 + r.n(400), Verifikasi: 2}
		if r.n(100) < 6 {
			f.UmurHari = r.n(7)
		}
		if v := r.n(100); v < 10 {
			f.Verifikasi = 0
		} else if v < 50 {
			f.Verifikasi = 1
		}
		f.Dibekukan = r.n(100) < 1
		t.baris[i] = f
	}
	return t
}

// Cari mengembalikan fitur akun.
func (t *TokoAkun) Cari(id int) (FiturAkun, error) {
	if id < 0 || id >= len(t.baris) {
		return FiturAkun{}, ErrTidakAda
	}
	return t.baris[id], nil
}

// TokoPerangkat memegang data perangkat.
type TokoPerangkat struct{ baris []FiturPerangkat }

// NewTokoPerangkat membangun data perangkat dari benih tetap.
func NewTokoPerangkat() *TokoPerangkat {
	r := &acak{s: 0xD1B54A32D192ED03}
	t := &TokoPerangkat{baris: make([]FiturPerangkat, JumlahPerangkat)}
	for i := range t.baris {
		f := FiturPerangkat{JumlahAkun: 1, UmurHari: 2 + r.n(300)}
		if r.n(100) < 10 {
			f.JumlahAkun = 1 + r.n(7)
		}
		if r.n(100) < 8 {
			f.UmurHari = r.n(2)
		}
		t.baris[i] = f
	}
	return t
}

// Cari mengembalikan fitur perangkat.
func (t *TokoPerangkat) Cari(id int) (FiturPerangkat, error) {
	if id < 0 || id >= len(t.baris) {
		return FiturPerangkat{}, ErrTidakAda
	}
	return t.baris[id], nil
}

// Baris adalah satu transaksi lama sebuah akun.
type Baris struct {
	MenitLalu int
	Nominal   int64
}

// TokoRiwayat memegang riwayat transaksi tiap akun.
type TokoRiwayat struct{ akun [][]Baris }

// NewTokoRiwayat membangun riwayat dari benih tetap. Sebagian kecil akun punya banyak transaksi dalam 24 jam terakhir.
func NewTokoRiwayat() *TokoRiwayat {
	r := &acak{s: 0xA0761D6478BD642F}
	t := &TokoRiwayat{akun: make([][]Baris, JumlahAkun)}
	for i := range t.akun {
		padat := r.n(100) < 5
		kosong := r.n(100) < 4
		rows := make([]Baris, 0, BarisRiwayatPerAkun)
		if !kosong {
			for j := 0; j < BarisRiwayatPerAkun; j++ {
				b := Baris{MenitLalu: r.n(2 * menit30Hari), Nominal: int64(1+r.n(60)) * 5000}
				if padat && j%2 == 0 {
					b.MenitLalu = r.n(menit24Jam)
				}
				rows = append(rows, b)
			}
		}
		t.akun[i] = rows
	}
	return t
}

// Ringkas membaca semua baris akun dan menghitung dua fitur: jumlah transaksi 24 jam terakhir dan rata-rata nominal
// 30 hari terakhir (pembagian bulat; 0 bila tidak ada baris dalam 30 hari).
func (t *TokoRiwayat) Ringkas(akunID int) (FiturRiwayat, error) {
	if akunID < 0 || akunID >= len(t.akun) {
		return FiturRiwayat{}, ErrTidakAda
	}
	var f FiturRiwayat
	var jumlah, total int64
	for _, b := range t.akun[akunID] {
		if b.MenitLalu < menit24Jam {
			f.Jumlah24Jam++
		}
		if b.MenitLalu < menit30Hari {
			jumlah++
			total += b.Nominal
		}
	}
	if jumlah > 0 {
		f.RataRata30Hari = total / jumlah
	}
	return f, nil
}

// Toko memegang ketiga data sekaligus: dipakai versi satu proses dan sebagai pembanding di tes.
type Toko struct {
	Akun      *TokoAkun
	Perangkat *TokoPerangkat
	Riwayat   *TokoRiwayat
}

// NewToko membangun ketiga data.
func NewToko() *Toko {
	return &Toko{Akun: NewTokoAkun(), Perangkat: NewTokoPerangkat(), Riwayat: NewTokoRiwayat()}
}

// Nilai menjalankan seluruh alur skor dalam satu proses: tiga pembacaan data lewat pemanggilan fungsi biasa.
func (t *Toko) Nilai(p Permintaan) (Hasil, error) {
	a, err := t.Akun.Cari(p.AkunID)
	if err != nil {
		return Hasil{}, err
	}
	pr, err := t.Perangkat.Cari(p.PerangkatID)
	if err != nil {
		return Hasil{}, err
	}
	r, err := t.Riwayat.Ringkas(p.AkunID)
	if err != nil {
		return Hasil{}, err
	}
	return Hitung(a, pr, r, p.NominalRupiah), nil
}

// Transaksi membangkitkan transaksi ke-i untuk beban: id, akun, perangkat, dan nominal ditentukan oleh i saja.
func Transaksi(i int) Permintaan {
	return Permintaan{
		ID:            fmt.Sprintf("T%05d", i),
		AkunID:        (i*7 + 3) % JumlahAkun,
		PerangkatID:   (i*13 + 5) % JumlahPerangkat,
		NominalRupiah: int64(1+(i*7919)%400) * 5000,
	}
}
