// Package qrpayload membangun dan memeriksa payload QR bergaya EMV Merchant-Presented Mode untuk lab t4-qr (ADR 40, M35).
//
// Ini bukan implementasi EMVCo penuh. Yang dibaca dari sumber yang bisa dibuka: tag 00 bernilai "01", tag 01
// bernilai "11" (QR statis) atau "12" (QR dinamis), tag 63 berpanjang "04" dan menjadi data object terakhir, dan
// CRC-16 berpolinomial 0x1021 dengan nilai awal 0xFFFF dihitung atas semua data object termasuk "6304" tetapi tanpa
// nilai CRC-nya, lalu ditulis empat karakter heksadesimal dengan nol di depan. Yang lain (tag 00 harus paling
// depan, tag 26 sebagai template merchant dengan dua sub-tag, tag 52, 53, 58, 59, 60, batas panjang nama dan kota,
// huruf besar pada CRC, tag ganda ditolak) adalah pilihan lab, bukan kutipan spesifikasi; PDF EMVCo belum dibuka
// [perlu verifikasi di PDF EMVCo].
//
// CRC mendeteksi salah baca, bukan penggantian: tidak ada kunci rahasia di dalamnya, jadi siapa pun yang mengubah
// isi payload bisa menghitung CRC yang baru (PasangCRC). Keaslian QR tidak bisa dibuktikan dari payload ini.
package qrpayload

import (
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

const (
	Statis  = "statis"
	Dinamis = "dinamis"

	nilaiStatis  = "11"
	nilaiDinamis = "12"

	// PengenalPenerbit mengisi sub-tag 00 pada tag 26: milik lab, bukan pengenal skema nyata.
	PengenalPenerbit = "id.rekeningo.lab"

	// Batas panjang nama dan kota merchant: pilihan lab (Asumsi), bukan batas dari spesifikasi.
	MaksNama = 25
	MaksKota = 15
)

var (
	// ErrBentuk: payload bukan rangkaian tag, panjang, dan nilai yang utuh, atau tag 63 tidak di ujung.
	ErrBentuk = errors.New("bentuk payload salah")
	// ErrCRC: empat karakter terakhir tidak sama dengan CRC atas isi di depannya.
	ErrCRC = errors.New("CRC tidak cocok")
	// ErrInisiasi: tag 01 tidak ada, atau bukan "11" dan bukan "12".
	ErrInisiasi = errors.New("tag 01 harus 11 atau 12")
	// ErrIsi: isi tidak lengkap atau saling bertentangan (nominal pada QR statis, QR dinamis tanpa nominal, dan sejenisnya).
	ErrIsi = errors.New("isi payload tidak lengkap atau bertentangan")
)

var polaUUID = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

// Isi adalah isi payload yang dipakai lab: jenis QR, id QR (uuid), nominal (hanya QR dinamis), nama dan kota merchant.
type Isi struct {
	Jenis   string `json:"jenis"`
	ID      string `json:"id"`
	Nominal *int64 `json:"nominal,omitempty"`
	Nama    string `json:"nama"`
	Kota    string `json:"kota"`
}

// CRC16 menghitung CRC-16/CCITT-FALSE (nama lain CRC-16/IBM-3740): polinomial 0x1021, nilai awal 0xFFFF, tanpa
// pembalikan bit, tanpa XOR akhir. Nilai uji untuk "123456789" adalah 0x29B1.
func CRC16(b []byte) uint16 {
	crc := uint16(0xFFFF)
	for _, x := range b {
		crc ^= uint16(x) << 8
		for i := 0; i < 8; i++ {
			if crc&0x8000 != 0 {
				crc = crc<<1 ^ 0x1021
			} else {
				crc <<= 1
			}
		}
	}
	return crc
}

// PasangCRC menempelkan nilai CRC pada isi yang sudah berakhir dengan "6304". Siapa pun bisa memanggilnya:
// begitulah CRC dihitung ulang untuk payload yang sudah diubah.
func PasangCRC(sampaiTag63 string) string {
	return sampaiTag63 + fmt.Sprintf("%04X", CRC16([]byte(sampaiTag63)))
}

func tlv(tag, nilai string) string {
	return fmt.Sprintf("%s%02d%s", tag, len(nilai), nilai)
}

func asciiCetak(s string) bool {
	for i := 0; i < len(s); i++ {
		if s[i] < 0x20 || s[i] > 0x7E {
			return false
		}
	}
	return true
}

// --8<-- [start:bangun]
// Bangun menyusun payload dari isi, urut tag naik, dengan tag 63 di ujung. QR statis tidak membawa nominal;
// QR dinamis wajib membawanya.
func Bangun(i Isi) (string, error) {
	var tag01 string
	switch i.Jenis {
	case Statis:
		if i.Nominal != nil {
			return "", fmt.Errorf("%w: QR statis tidak membawa nominal", ErrIsi)
		}
		tag01 = nilaiStatis
	case Dinamis:
		if i.Nominal == nil || *i.Nominal <= 0 {
			return "", fmt.Errorf("%w: QR dinamis wajib bernominal lebih dari 0", ErrIsi)
		}
		tag01 = nilaiDinamis
	default:
		return "", fmt.Errorf("%w: jenis %q", ErrInisiasi, i.Jenis)
	}
	if !polaUUID.MatchString(i.ID) {
		return "", fmt.Errorf("%w: id QR bukan uuid", ErrIsi)
	}
	if n := len(i.Nama); n < 1 || n > MaksNama || !asciiCetak(i.Nama) {
		return "", fmt.Errorf("%w: nama merchant 1 sampai %d karakter ASCII", ErrIsi, MaksNama)
	}
	if n := len(i.Kota); n < 1 || n > MaksKota || !asciiCetak(i.Kota) {
		return "", fmt.Errorf("%w: kota merchant 1 sampai %d karakter ASCII", ErrIsi, MaksKota)
	}
	var b strings.Builder
	b.WriteString(tlv("00", "01"))
	b.WriteString(tlv("01", tag01))
	b.WriteString(tlv("26", tlv("00", PengenalPenerbit)+tlv("01", i.ID)))
	b.WriteString(tlv("52", "5411"))
	b.WriteString(tlv("53", "360"))
	if i.Nominal != nil {
		b.WriteString(tlv("54", strconv.FormatInt(*i.Nominal, 10)))
	}
	b.WriteString(tlv("58", "ID"))
	b.WriteString(tlv("59", i.Nama))
	b.WriteString(tlv("60", i.Kota))
	b.WriteString("6304")
	return PasangCRC(b.String()), nil
}

// --8<-- [end:bangun]

// ambil membaca satu data object dari awal s: tag dua digit, panjang dua digit, lalu nilai sepanjang itu.
func ambil(s string) (tag, nilai, sisa string, err error) {
	if len(s) < 4 {
		return "", "", "", ErrBentuk
	}
	tag = s[:2]
	n, err := strconv.Atoi(s[2:4])
	if err != nil || n < 0 || n > 99 || !digit(s[:4]) {
		return "", "", "", ErrBentuk
	}
	if len(s) < 4+n {
		return "", "", "", ErrBentuk
	}
	return tag, s[4 : 4+n], s[4+n:], nil
}

func digit(s string) bool {
	for i := 0; i < len(s); i++ {
		if s[i] < '0' || s[i] > '9' {
			return false
		}
	}
	return true
}

// uraiObjek membaca semua data object di s menjadi peta tag ke nilai. Tag ganda ditolak.
func uraiObjek(s string) (peta map[string]string, urut []string, err error) {
	peta = map[string]string{}
	for len(s) > 0 {
		tag, nilai, sisa, err := ambil(s)
		if err != nil {
			return nil, nil, err
		}
		if _, ada := peta[tag]; ada {
			return nil, nil, fmt.Errorf("%w: tag %s dua kali", ErrBentuk, tag)
		}
		peta[tag] = nilai
		urut = append(urut, tag)
		s = sisa
	}
	return peta, urut, nil
}

// --8<-- [start:urai]
// Urai memeriksa payload dari luar: tag 63 di ujung dengan panjang 04, CRC cocok, tag 00 paling depan dan bernilai
// 01, tag 01 bernilai 11 atau 12, isi lengkap dan tidak bertentangan dengan jenisnya. CRC diperiksa lebih dulu,
// supaya salah baca satu karakter di mana pun terdeteksi sebagai ErrCRC. Lolosnya Urai bukan bukti QR itu asli.
func Urai(s string) (Isi, error) {
	var i Isi
	if len(s) < 8 || s[len(s)-8:len(s)-4] != "6304" {
		return i, fmt.Errorf("%w: tag 63 tidak ada di ujung", ErrBentuk)
	}
	if fmt.Sprintf("%04X", CRC16([]byte(s[:len(s)-4]))) != s[len(s)-4:] {
		return i, ErrCRC
	}
	return UraiTanpaCRC(s[:len(s)-8])
}

// --8<-- [end:urai]

// UraiTanpaCRC membaca isi payload tanpa tag 63 (dipakai Urai sesudah CRC cocok, dan oleh pihak yang mengubah payload).
func UraiTanpaCRC(isi string) (Isi, error) {
	var i Isi
	peta, urut, err := uraiObjek(isi)
	if err != nil {
		return i, err
	}
	if len(urut) == 0 || urut[0] != "00" || peta["00"] != "01" {
		return i, fmt.Errorf("%w: tag 00 harus paling depan dan bernilai 01", ErrBentuk)
	}
	if _, ada := peta["63"]; ada {
		return i, fmt.Errorf("%w: tag 63 hanya boleh satu, di ujung", ErrBentuk)
	}
	switch peta["01"] {
	case nilaiStatis:
		i.Jenis = Statis
	case nilaiDinamis:
		i.Jenis = Dinamis
	default:
		return i, ErrInisiasi
	}
	sub, _, err := uraiObjek(peta["26"])
	if err != nil || peta["26"] == "" {
		return i, fmt.Errorf("%w: tag 26", ErrIsi)
	}
	if sub["00"] != PengenalPenerbit || !polaUUID.MatchString(sub["01"]) {
		return i, fmt.Errorf("%w: template merchant", ErrIsi)
	}
	i.ID = sub["01"]
	nom, adaNominal := peta["54"]
	switch {
	case i.Jenis == Statis && adaNominal:
		return i, fmt.Errorf("%w: QR statis membawa nominal", ErrIsi)
	case i.Jenis == Dinamis && !adaNominal:
		return i, fmt.Errorf("%w: QR dinamis tanpa nominal", ErrIsi)
	case adaNominal:
		n, err := strconv.ParseInt(nom, 10, 64)
		if err != nil || n <= 0 || len(nom) > 13 || nom[0] == '0' || !digit(nom) {
			return i, fmt.Errorf("%w: nominal %q", ErrIsi, nom)
		}
		i.Nominal = &n
	}
	i.Nama, i.Kota = peta["59"], peta["60"]
	if i.Nama == "" || i.Kota == "" {
		return i, fmt.Errorf("%w: nama atau kota kosong", ErrIsi)
	}
	return i, nil
}

// Ganti memalsukan payload tanpa kunci apa pun: isinya dibaca tanpa memeriksa CRC, diubah, disusun ulang, dan
// CRC-nya dihitung ulang. Hasilnya lolos Urai. Ini bukti bahwa CRC bukan autentikasi, bukan fitur sistem.
func Ganti(s string, ubah func(*Isi)) (string, error) {
	if len(s) < 8 || s[len(s)-8:len(s)-4] != "6304" {
		return "", fmt.Errorf("%w: tag 63 tidak ada di ujung", ErrBentuk)
	}
	i, err := UraiTanpaCRC(s[:len(s)-8])
	if err != nil {
		return "", err
	}
	ubah(&i)
	return Bangun(i)
}
