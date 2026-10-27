//go:build t4qr

package qrpayload

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Tes payload QR (lab t4-qr). Hanya dikompilasi dengan -tags t4qr, supaya rekaman testing lab api-t4 tidak berubah
// (pola t4modul); run.py lab t4-qr menjalankannya. Nilai pembanding dihitung terpisah dengan binascii.crc_hqx dari pustaka standar Python
// (CRC-CCITT berpolinomial 0x1021 dengan nilai awal yang bisa diberikan; nilai awal 0xFFFF), bukan dari kode ini.
// Baris yang diawali "LAB|" ikut direkam oleh run.py.

const (
	idMarni    = "00000000-0000-4000-8000-000000000001"
	idAndalan  = "00000000-0000-4000-8000-000000000002"
	emasStatis = "00020101021126600016id.rekeningo.lab013600000000-0000-4000-8000-0000000000015204541153033605802ID5918Toko Sumber Rejeki6007Bandung63046726"
	emasDinam  = "00020101021226600016id.rekeningo.lab013600000000-0000-4000-8000-0000000000015204541153033605405350005802ID5918Toko Sumber Rejeki6007Bandung630490AB"
)

func nom(n int64) *int64 { return &n }

func statisMarni(t *testing.T) string {
	t.Helper()
	p, err := Bangun(Isi{Jenis: Statis, ID: idMarni, Nama: "Toko Sumber Rejeki", Kota: "Bandung"})
	if err != nil {
		t.Fatal(err)
	}
	return p
}

// dasar menyusun payload dari potongan tag yang ditulis tangan lalu memasang CRC yang benar, supaya kasus yang
// ditolak gagal karena isinya, bukan karena CRC.
func dasar(potongan ...string) string {
	return PasangCRC(strings.Join(potongan, "") + "6304")
}

func tag26(id string) string {
	return tlv("26", tlv("00", PengenalPenerbit)+tlv("01", id))
}

func TestPayloadCRCNilaiUji(t *testing.T) {
	kasus := []struct {
		masuk string
		harus uint16
	}{
		{"123456789", 0x29B1}, // nilai uji katalog CRC-16/IBM-3740 (nama lain CRC-16/CCITT-FALSE)
		{"", 0xFFFF},          // tanpa data: nilai awal
		{"A", 0xB915},
		{"6304", 0x6007},
	}
	for _, k := range kasus {
		if got := CRC16([]byte(k.masuk)); got != k.harus {
			t.Errorf("CRC16(%q) = 0x%04X, ingin 0x%04X", k.masuk, got, k.harus)
		}
	}
	fmt.Printf("LAB|CRC16(\"123456789\") = 0x%04X (nilai uji 0x29B1; pembanding Python binascii.crc_hqx dengan nilai awal 0xFFFF)\n", CRC16([]byte("123456789")))
}

func TestPayloadCRCDitulisEmpatKarakterDenganNolDiDepan(t *testing.T) {
	// Nominal 802 menghasilkan CRC 0x002A (dihitung terpisah): harus tertulis "002A", bukan "2A".
	p, err := Bangun(Isi{Jenis: Dinamis, ID: idMarni, Nominal: nom(802), Nama: "Toko Sumber Rejeki", Kota: "Bandung"})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasSuffix(p, "6304002A") {
		t.Fatalf("ujung payload %q, ingin berakhir 6304002A", p[len(p)-8:])
	}
	if _, err := Urai(p); err != nil {
		t.Fatalf("payload dengan CRC berawalan nol ditolak: %v", err)
	}
	fmt.Printf("LAB|CRC berawalan nol: nominal 802 menghasilkan ujung payload %s\n", p[len(p)-8:])
}

func TestPayloadBangunSamaDenganContohYangDihitungTerpisah(t *testing.T) {
	if got := statisMarni(t); got != emasStatis {
		t.Errorf("statis:\n got %s\nwant %s", got, emasStatis)
	}
	p, err := Bangun(Isi{Jenis: Dinamis, ID: idMarni, Nominal: nom(35000), Nama: "Toko Sumber Rejeki", Kota: "Bandung"})
	if err != nil || p != emasDinam {
		t.Errorf("dinamis:\n got %s (%v)\nwant %s", p, err, emasDinam)
	}
}

func TestPayloadTag01StatisSebelasDinamisDuaBelas(t *testing.T) {
	if !strings.Contains(emasStatis, "010211") || strings.Contains(emasStatis, "010212") {
		t.Error("contoh statis harus memuat tag 01 = 11")
	}
	if !strings.Contains(emasDinam, "010212") || strings.Contains(emasDinam, "010211") {
		t.Error("contoh dinamis harus memuat tag 01 = 12")
	}
	i, err := Urai(emasStatis)
	if err != nil || i.Jenis != Statis || i.Nominal != nil || i.ID != idMarni || i.Nama != "Toko Sumber Rejeki" || i.Kota != "Bandung" {
		t.Errorf("urai statis: %+v %v", i, err)
	}
	i, err = Urai(emasDinam)
	if err != nil || i.Jenis != Dinamis || i.Nominal == nil || *i.Nominal != 35000 {
		t.Errorf("urai dinamis: %+v %v", i, err)
	}
	// Bolak-balik: Bangun(Urai(x)) = x.
	for _, p := range []string{emasStatis, emasDinam} {
		i, _ := Urai(p)
		if got, err := Bangun(i); err != nil || got != p {
			t.Errorf("bolak-balik %s: %s %v", p, got, err)
		}
	}
}

func TestPayloadSalahBacaSatuKarakterTerdeteksiSemua(t *testing.T) {
	p := emasStatis
	const abjad = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz "
	total, terdeteksi, crc := 0, 0, 0
	for k := 0; k < len(p); k++ {
		for _, c := range abjad {
			if byte(c) == p[k] {
				continue
			}
			total++
			q := p[:k] + string(c) + p[k+1:]
			_, err := Urai(q)
			if err == nil {
				t.Fatalf("salah baca posisi %d jadi %q lolos: %s", k, string(c), q)
			}
			terdeteksi++
			if errors.Is(err, ErrCRC) {
				crc++
			} else if !errors.Is(err, ErrBentuk) || k < len(p)-8 || k >= len(p)-4 {
				t.Fatalf("posisi %d: galat %v; hanya empat karakter \"6304\" yang boleh ErrBentuk", k, err)
			}
		}
	}
	fmt.Printf("LAB|salah baca satu karakter pada payload contoh statis milik tes (%d karakter): %d dari %d terdeteksi (%d oleh CRC, %d oleh tag 63 yang rusak)\n",
		len(p), terdeteksi, total, crc, terdeteksi-crc)
}

func TestPayloadDuaKarakterBertukarTempatTerdeteksi(t *testing.T) {
	p := emasStatis
	total, terdeteksi := 0, 0
	for k := 0; k+1 < len(p); k++ {
		if p[k] == p[k+1] {
			continue
		}
		total++
		q := p[:k] + string(p[k+1]) + string(p[k]) + p[k+2:]
		if _, err := Urai(q); err == nil {
			t.Errorf("pertukaran posisi %d lolos: %s", k, q)
		} else {
			terdeteksi++
		}
	}
	fmt.Printf("LAB|dua karakter bersebelahan bertukar tempat pada payload contoh yang sama: %d dari %d terdeteksi (hasil untuk payload ini, bukan jaminan umum)\n", terdeteksi, total)
}

func TestPayloadCRCBukanAutentikasi(t *testing.T) {
	marni := statisMarni(t)
	// Pemalsu tanpa kunci apa pun: ganti id QR dengan id QR miliknya dan hitung CRC baru.
	palsu, err := Ganti(marni, func(i *Isi) { i.ID = idAndalan })
	if err != nil {
		t.Fatal(err)
	}
	i, err := Urai(palsu)
	if err != nil || i.ID != idAndalan || i.Nama != "Toko Sumber Rejeki" {
		t.Fatalf("payload yang dihitung ulang CRC-nya ditolak atau berubah isi: %+v %v", i, err)
	}
	if palsu == marni {
		t.Fatal("payload palsu sama dengan aslinya")
	}
	// Tanpa menghitung ulang, perubahan yang sama ditolak oleh CRC.
	mentah := strings.Replace(marni, idMarni, idAndalan, 1)
	if _, err := Urai(mentah); !errors.Is(err, ErrCRC) {
		t.Fatalf("id diganti tanpa CRC baru: ingin ErrCRC, dapat %v", err)
	}
	// Cara paling kasar: ganti teks lalu PasangCRC pada isi sampai "6304".
	kasar := PasangCRC(mentah[:len(mentah)-4])
	if i, err := Urai(kasar); err != nil || i.ID != idAndalan {
		t.Fatalf("penggantian teks dengan CRC baru: %+v %v", i, err)
	}
	// Nominal pada QR dinamis juga bisa diganti.
	palsuNom, err := Ganti(emasDinam, func(i *Isi) { i.Nominal = nom(1) })
	if err != nil {
		t.Fatal(err)
	}
	if i, err := Urai(palsuNom); err != nil || *i.Nominal != 1 {
		t.Fatalf("nominal palsu: %+v %v", i, err)
	}
	fmt.Printf("LAB|id QR diganti tanpa CRC baru: %s; diganti dengan CRC dihitung ulang: lolos (CRC tidak memakai kunci)\n", ErrCRC)
}

func TestPayloadDitolakKarenaIsinya(t *testing.T) {
	baik := func(extra ...string) []string {
		s := []string{tlv("00", "01"), tlv("01", "11"), tag26(idMarni), tlv("59", "Toko Sumber Rejeki"), tlv("60", "Bandung")}
		return append(s, extra...)
	}
	kasus := []struct {
		nama    string
		payload string
		galat   error
	}{
		{"statis utuh (kontrol)", dasar(baik()...), nil},
		{"tag 00 bukan paling depan", dasar(tlv("01", "11"), tlv("00", "01"), tag26(idMarni), tlv("59", "Toko Sumber Rejeki"), tlv("60", "Bandung")), ErrBentuk},
		{"tag 00 bernilai 02", dasar(tlv("00", "02"), tlv("01", "11"), tag26(idMarni), tlv("59", "Toko Sumber Rejeki"), tlv("60", "Bandung")), ErrBentuk},
		{"tag 01 hilang", dasar(tlv("00", "01"), tag26(idMarni), tlv("59", "Toko Sumber Rejeki"), tlv("60", "Bandung")), ErrInisiasi},
		{"tag 01 bernilai 10", dasar(tlv("00", "01"), tlv("01", "10"), tag26(idMarni), tlv("59", "Toko Sumber Rejeki"), tlv("60", "Bandung")), ErrInisiasi},
		{"tag 01 bernilai 13", dasar(tlv("00", "01"), tlv("01", "13"), tag26(idMarni), tlv("59", "Toko Sumber Rejeki"), tlv("60", "Bandung")), ErrInisiasi},
		{"tag 01 bernilai 1", dasar(tlv("00", "01"), tlv("01", "1"), tag26(idMarni), tlv("59", "Toko Sumber Rejeki"), tlv("60", "Bandung")), ErrInisiasi},
		{"tag 59 dua kali", dasar(baik(tlv("59", "Toko Lain"))...), ErrBentuk},
		{"tag 63 dua kali (satu di tengah)", dasar(baik(tlv("63", "ABCD"))...), ErrBentuk},
		{"QR statis membawa nominal", dasar(baik(tlv("54", "5000"))...), ErrIsi},
		{"QR dinamis tanpa nominal", dasar(tlv("00", "01"), tlv("01", "12"), tag26(idMarni), tlv("59", "Toko Sumber Rejeki"), tlv("60", "Bandung")), ErrIsi},
		{"nominal nol", dasar(tlv("00", "01"), tlv("01", "12"), tag26(idMarni), tlv("54", "0"), tlv("59", "Toko Sumber Rejeki"), tlv("60", "Bandung")), ErrIsi},
		{"nominal berawalan nol", dasar(tlv("00", "01"), tlv("01", "12"), tag26(idMarni), tlv("54", "0500"), tlv("59", "Toko Sumber Rejeki"), tlv("60", "Bandung")), ErrIsi},
		{"nominal bertitik", dasar(tlv("00", "01"), tlv("01", "12"), tag26(idMarni), tlv("54", "12.50"), tlv("59", "Toko Sumber Rejeki"), tlv("60", "Bandung")), ErrIsi},
		{"nominal negatif", dasar(tlv("00", "01"), tlv("01", "12"), tag26(idMarni), tlv("54", "-500"), tlv("59", "Toko Sumber Rejeki"), tlv("60", "Bandung")), ErrIsi},
		{"nominal 14 digit", dasar(tlv("00", "01"), tlv("01", "12"), tag26(idMarni), tlv("54", "10000000000000"), tlv("59", "Toko Sumber Rejeki"), tlv("60", "Bandung")), ErrIsi},
		{"id QR bukan uuid", dasar(tlv("00", "01"), tlv("01", "11"), tag26("bukan-uuid"), tlv("59", "Toko Sumber Rejeki"), tlv("60", "Bandung")), ErrIsi},
		{"id QR uuid berhuruf besar di grup 1", dasar(tlv("00", "01"), tlv("01", "11"), tag26("0A000000-0000-4000-8000-000000000001"), tlv("59", "Toko Sumber Rejeki"), tlv("60", "Bandung")), ErrIsi},
		{"id QR uuid berhuruf besar di grup 2", dasar(tlv("00", "01"), tlv("01", "11"), tag26("00000000-000A-4000-8000-000000000001"), tlv("59", "Toko Sumber Rejeki"), tlv("60", "Bandung")), ErrIsi},
		{"id QR uuid berhuruf besar di grup 3", dasar(tlv("00", "01"), tlv("01", "11"), tag26("00000000-0000-400A-8000-000000000001"), tlv("59", "Toko Sumber Rejeki"), tlv("60", "Bandung")), ErrIsi},
		{"id QR uuid berhuruf besar di grup 4", dasar(tlv("00", "01"), tlv("01", "11"), tag26("00000000-0000-4000-800A-000000000001"), tlv("59", "Toko Sumber Rejeki"), tlv("60", "Bandung")), ErrIsi},
		{"id QR uuid berhuruf besar di grup 5", dasar(tlv("00", "01"), tlv("01", "11"), tag26("00000000-0000-4000-8000-00000000000A"), tlv("59", "Toko Sumber Rejeki"), tlv("60", "Bandung")), ErrIsi},
		{"pengenal penerbit lain", dasar(tlv("00", "01"), tlv("01", "11"), tlv("26", tlv("00", "id.lain.lab")+tlv("01", idMarni)), tlv("59", "Toko Sumber Rejeki"), tlv("60", "Bandung")), ErrIsi},
		{"template merchant hilang", dasar(tlv("00", "01"), tlv("01", "11"), tlv("59", "Toko Sumber Rejeki"), tlv("60", "Bandung")), ErrIsi},
		{"nama hilang", dasar(tlv("00", "01"), tlv("01", "11"), tag26(idMarni), tlv("60", "Bandung")), ErrIsi},
		{"kota hilang", dasar(tlv("00", "01"), tlv("01", "11"), tag26(idMarni), tlv("59", "Toko Sumber Rejeki")), ErrIsi},
		{"panjang melewati sisa payload", dasar(tlv("00", "01"), tlv("01", "11"), tag26(idMarni), "5950Toko", tlv("60", "Bandung")), ErrBentuk},
		{"panjang satu lebih dari sisa", dasar(tlv("00", "01"), tlv("01", "11"), tag26(idMarni), tlv("59", "Toko Sumber Rejeki"), "6008Bandung"), ErrBentuk},
		{"nominal bertanda plus", dasar(tlv("00", "01"), tlv("01", "12"), tag26(idMarni), tlv("54", "+500"), tlv("59", "Toko Sumber Rejeki"), tlv("60", "Bandung")), ErrIsi},
		{"panjang bukan angka", dasar(tlv("00", "01"), tlv("01", "11"), tag26(idMarni), "59xxToko", tlv("60", "Bandung")), ErrBentuk},
		{"panjang bertanda plus", dasar(tlv("00", "01"), tlv("01", "11"), tag26(idMarni), "59+4Toko", tlv("60", "Bandung")), ErrBentuk},
		{"sisa pendek di ujung isi", dasar(baik("5")...), ErrBentuk},
	}
	for _, k := range kasus {
		_, err := Urai(k.payload)
		switch {
		case k.galat == nil && err != nil:
			t.Errorf("%s: ditolak: %v", k.nama, err)
		case k.galat != nil && !errors.Is(err, k.galat):
			t.Errorf("%s: ingin %v, dapat %v", k.nama, k.galat, err)
		}
	}
}

func TestPayloadDitolakKarenaUjungDanCRC(t *testing.T) {
	p := emasStatis
	kasus := []struct {
		nama    string
		payload string
		galat   error
	}{
		{"kosong", "", ErrBentuk},
		{"terlalu pendek", "6304", ErrBentuk},
		{"tanpa tag 63", p[:len(p)-8], ErrBentuk},
		{"tag 63 berpanjang 03", p[:len(p)-8] + "630367", ErrBentuk},
		{"ada sisa sesudah CRC", p + "0", ErrBentuk},
		{"CRC salah satu digit", p[:len(p)-1] + "7", ErrCRC},
		{"CRC nol semua", p[:len(p)-4] + "0000", ErrCRC},
	}
	for _, k := range kasus {
		if _, err := Urai(k.payload); !errors.Is(err, k.galat) {
			t.Errorf("%s: ingin %v, dapat %v", k.nama, k.galat, err)
		}
	}
	// CRC berhuruf kecil: pakai payload yang CRC-nya memuat huruf, supaya huruf kecil benar-benar berbeda.
	d := emasDinam // CRC 90AB memuat huruf
	kecil := d[:len(d)-4] + strings.ToLower(d[len(d)-4:])
	if _, err := Urai(kecil); !errors.Is(err, ErrCRC) {
		t.Errorf("CRC berhuruf kecil: ingin ErrCRC (huruf besar adalah aturan lab), dapat %v", err)
	}
}

func TestPayloadBangunMenolak(t *testing.T) {
	kasus := []struct {
		nama  string
		isi   Isi
		galat error
	}{
		{"jenis lain", Isi{Jenis: "lain", ID: idMarni, Nama: "T", Kota: "K"}, ErrInisiasi},
		{"jenis kosong", Isi{ID: idMarni, Nama: "T", Kota: "K"}, ErrInisiasi},
		{"statis dengan nominal", Isi{Jenis: Statis, ID: idMarni, Nominal: nom(1000), Nama: "T", Kota: "K"}, ErrIsi},
		{"dinamis tanpa nominal", Isi{Jenis: Dinamis, ID: idMarni, Nama: "T", Kota: "K"}, ErrIsi},
		{"dinamis nominal nol", Isi{Jenis: Dinamis, ID: idMarni, Nominal: nom(0), Nama: "T", Kota: "K"}, ErrIsi},
		{"dinamis nominal negatif", Isi{Jenis: Dinamis, ID: idMarni, Nominal: nom(-1), Nama: "T", Kota: "K"}, ErrIsi},
		{"id bukan uuid", Isi{Jenis: Statis, ID: "abc", Nama: "T", Kota: "K"}, ErrIsi},
		{"nama kosong", Isi{Jenis: Statis, ID: idMarni, Nama: "", Kota: "K"}, ErrIsi},
		{"kota kosong", Isi{Jenis: Statis, ID: idMarni, Nama: "T", Kota: ""}, ErrIsi},
		{"nama bukan ASCII", Isi{Jenis: Statis, ID: idMarni, Nama: "Toko Ünggul", Kota: "K"}, ErrIsi},
		{"kota dengan karakter kontrol", Isi{Jenis: Statis, ID: idMarni, Nama: "T", Kota: "Ban\ndung"}, ErrIsi},
	}
	for _, k := range kasus {
		if _, err := Bangun(k.isi); !errors.Is(err, k.galat) {
			t.Errorf("%s: ingin %v, dapat %v", k.nama, k.galat, err)
		}
	}
}

func TestPayloadBatasPanjangNamaDanKota(t *testing.T) {
	ok := func(nama, kota string) error {
		_, err := Bangun(Isi{Jenis: Statis, ID: idMarni, Nama: nama, Kota: kota})
		return err
	}
	if err := ok(strings.Repeat("N", 25), strings.Repeat("K", 15)); err != nil {
		t.Errorf("nama 25 dan kota 15 karakter harus lolos: %v", err)
	}
	if err := ok(strings.Repeat("N", 26), "K"); !errors.Is(err, ErrIsi) {
		t.Errorf("nama 26 karakter harus ditolak: %v", err)
	}
	if err := ok("N", strings.Repeat("K", 16)); !errors.Is(err, ErrIsi) {
		t.Errorf("kota 16 karakter harus ditolak: %v", err)
	}
	// Payload dari luar dengan nama 26 karakter tetap terbaca (batas itu aturan penerbit, bukan aturan pembaca).
	p := dasar(tlv("00", "01"), tlv("01", "11"), tag26(idMarni), tlv("59", strings.Repeat("N", 26)), tlv("60", "Bandung"))
	if _, err := Urai(p); err != nil {
		t.Errorf("pembaca menolak nama 26 karakter: %v", err)
	}
}

func TestPayloadNominalDiTag54TanpaPemisah(t *testing.T) {
	p, err := Bangun(Isi{Jenis: Dinamis, ID: idMarni, Nominal: nom(1234567), Nama: "T", Kota: "K"})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(p, "54071234567") {
		t.Errorf("tag 54 harus 54 07 1234567: %s", p)
	}
}

func TestPayloadUraiTanpaCRCDanGantiMenolakBentukRusak(t *testing.T) {
	if _, err := Ganti("bukan payload", func(*Isi) {}); !errors.Is(err, ErrBentuk) {
		t.Errorf("Ganti pada teks acak: %v", err)
	}
	if _, err := Ganti(dasar(tlv("00", "01")), func(*Isi) {}); err == nil {
		t.Error("Ganti pada payload tak lengkap harus gagal")
	}
	// Ganti yang menghasilkan isi tidak sah (statis diberi nominal) ditolak Bangun.
	if _, err := Ganti(emasStatis, func(i *Isi) { i.Nominal = nom(5) }); !errors.Is(err, ErrIsi) {
		t.Errorf("Ganti ke isi bertentangan: %v", err)
	}
}

// Klaim negatif dengan lingkup: di modul api-t4 ini (semua berkas .go yang bukan tes), hanya cmd/qrlab yang mengimpor
// internal/qrpayload. Server (handler, service, repo) tidak membaca payload; ia hanya menerima id QR dan nominal.
func TestPayloadHanyaDipakaiQrlab(t *testing.T) {
	var pengimpor []string
	err := filepath.WalkDir("../..", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() || !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return nil
		}
		isi, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		if strings.Contains(string(isi), `"lab/apit4/internal/qrpayload"`) {
			pengimpor = append(pengimpor, filepath.ToSlash(strings.TrimPrefix(path, "../../")))
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(pengimpor) != 1 || pengimpor[0] != "cmd/qrlab/main.go" {
		t.Fatalf("berkas non-tes yang mengimpor internal/qrpayload: %v; ingin hanya cmd/qrlab/main.go", pengimpor)
	}
	fmt.Println("LAB|berkas Go non-tes di modul api-t4 yang mengimpor payload QR: cmd/qrlab/main.go saja (server tidak membaca payload)")
}
