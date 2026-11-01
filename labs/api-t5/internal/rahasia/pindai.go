package rahasia

import (
	"bufio"
	"bytes"
	"regexp"
	"strings"
)

// Temuan: satu tempat di staging yang memuat kunci produksi. Nilainya tidak pernah disalin ke temuan.
type Temuan struct {
	Berkas string
	Baris  int
	Alasan string // AlasanAwalan atau AlasanSidik
}

const (
	// AlasanAwalan: token berawalan kunci produksi (gw_live_ lawan gw_test_). Menangkap kunci produksi yang belum
	// pernah dilihat pemindai, asal formatnya mengikuti aturan awalan vendor.
	AlasanAwalan = "awalan"
	// AlasanSidik: SHA-256 token sama dengan sidik rahasia produksi yang diberikan. Menangkap nilai yang disalin
	// apa pun formatnya, tetapi hanya untuk rahasia yang sidiknya diketahui pemindai.
	AlasanSidik = "sidik"
	// AlasanTakTerbaca: baris yang tidak bisa dibaca pemindai (lebih panjang dari BatasBaris). Pemindai berhenti di
	// baris itu dan sisa berkas tidak diperiksa, jadi hasil "bersih" tidak boleh keluar: baris itu dilaporkan sebagai
	// temuan (gagal tertutup).
	AlasanTakTerbaca = "tak-terbaca"
)

// BatasBaris: panjang baris terbesar yang dipindai, dalam byte.
const BatasBaris = 1 << 20

// token: rangkaian karakter yang mungkin membentuk satu kunci (huruf, angka, garis bawah, strip, plus, garis miring).
var token = regexp.MustCompile(`[A-Za-z0-9_+/\-]{8,}`)

// Pindai memeriksa isi satu berkas baris demi baris. Kandidat tiap baris: tiap token, dan nilai sesudah `=` atau `:`
// pertama (tanpa spasi dan tanda kutip di tepi) bila nilai itu memuat karakter di luar token, misalnya padding `=`.
// awalan kosong mematikan aturan awalan; sidikProduksi kosong mematikan aturan sidik.
func Pindai(nama string, isi []byte, awalan string, sidikProduksi map[string]bool) []Temuan {
	var hasil []Temuan
	sc := bufio.NewScanner(bytes.NewReader(isi))
	sc.Buffer(make([]byte, 0, 64<<10), BatasBaris)
	n := 0
	for sc.Scan() {
		n++
		baris := sc.Text()
		kandidat := token.FindAllString(baris, -1)
		if i := strings.IndexAny(baris, "=:"); i >= 0 {
			if v := strings.Trim(strings.TrimSpace(baris[i+1:]), `"'`); v != "" {
				kandidat = append(kandidat, v)
			}
		}
		alasan := ""
		for _, k := range kandidat {
			switch {
			case awalan != "" && strings.HasPrefix(k, awalan):
				alasan = AlasanAwalan
			case len(sidikProduksi) > 0 && sidikProduksi[SidikPenuh(k)]:
				if alasan == "" {
					alasan = AlasanSidik
				}
			}
			if alasan == AlasanAwalan {
				break
			}
		}
		if alasan != "" {
			hasil = append(hasil, Temuan{Berkas: nama, Baris: n, Alasan: alasan})
		}
	}
	if sc.Err() != nil { // bufio.ErrTooLong: tanpa ini baris panjang diam-diam menyembunyikan sisa berkas
		hasil = append(hasil, Temuan{Berkas: nama, Baris: n + 1, Alasan: AlasanTakTerbaca})
	}
	return hasil
}
