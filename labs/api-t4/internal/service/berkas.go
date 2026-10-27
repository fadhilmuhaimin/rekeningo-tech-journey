package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"lab/apit4/internal/objek"
	"lab/apit4/internal/repo"
)

// File identitas di penyimpanan objek (ADR 38, M33): unggah langsung dari app lewat presigned PUT, unduh hanya lewat
// server (BukaBerkas), retensi 30 hari oleh job. Alur unggah dua langkah:
//
//  1. MintaUnggahan: server memilih dua kunci acak di bawah awalan akun dan menjawab dengan dua URL PUT berumur
//     pendek. App mengunggah ke penyimpanan, bukan ke server.
//  2. AjukanVerifikasiTerunggah: app menyebut kunci dan checksum SHA-256 yang dihitungnya. Server memeriksa objek di
//     penyimpanan (ada, ukuran, tipe dari byte, checksum dihitung ulang dari isi) SEBELUM pengajuan ditulis. File
//     yang tidak lolos dihapus. Checksum dari app adalah klaim; yang dipercaya adalah hitungan server.

// UmurPresign: umur URL PUT yang diberikan ke app (ADR 38; 5 menit adalah Asumsi).
const UmurPresign = 5 * time.Minute

var (
	// ErrPresignTidakAda: penyimpanan objek yang terpasang tidak bisa membuat URL bertanda tangan (direktori lokal, bytea).
	ErrPresignTidakAda = errors.New("penyimpanan objek ini tidak membuat URL bertanda tangan")
	// ErrBerkasDihapus: file sudah lewat retensi dan dihapus; barisnya tetap sebagai catatan.
	ErrBerkasDihapus = errors.New("berkas sudah dihapus menurut masa simpan")
)

func init() {
	// 3 permintaan URL per akun per jam, sama dengan pengajuan (Asumsi lab); dipasang sebelum Baru membuat pembatas.
	AmbangEndpoint["unggahan"] = [2]float64{3, 3.0 / 3600}
}

// Penandatangan: penyimpanan yang bisa membuat URL PUT bertanda tangan (objek.S3).
type Penandatangan interface {
	PresignPUT(kunci string, umur time.Duration, ukuran int64) (string, error)
}

// Unggahan: jawaban MintaUnggahan. URL adalah bearer token: siapa pun yang memegangnya bisa menulis ke kunci itu
// sampai BerlakuSampai.
type Unggahan struct {
	KunciKartu    string    `json:"kunci_kartu"`
	URLKartu      string    `json:"url_kartu"`
	KunciSwafoto  string    `json:"kunci_swafoto"`
	URLSwafoto    string    `json:"url_swafoto"`
	BerlakuSampai time.Time `json:"berlaku_sampai"`
}

// BerkasTerunggah: masukan AjukanVerifikasiTerunggah.
type BerkasTerunggah struct {
	KunciKartu      string
	KunciSwafoto    string
	ChecksumKartu   string
	ChecksumSwafoto string
	NomorIdentitas  string
}

// periksaPengaju: syarat yang sama untuk semua jalur pengajuan (jenis akun, dibekukan, belum terverifikasi).
func (s Service) periksaPengaju(ctx context.Context, peminta int64) (repo.Akun, error) {
	a, err := s.repo.Akun(ctx, peminta)
	if err != nil {
		return a, err
	}
	if a.Jenis != "pemakai" && a.Jenis != "merchant" {
		return a, ErrDilarang
	}
	if a.Status == "dibekukan" {
		return a, ErrDibekukan
	}
	if a.Tingkat == "terverifikasi" {
		return a, ErrSudahTerverifikasi
	}
	return a, nil
}

// MintaUnggahan membuat dua kunci objek acak milik akun itu dan dua URL PUT. ukuranKartu dan ukuranSwafoto
// opsional (0 = tidak disebut): bila disebut, panjangnya ikut ditandatangani dan penyimpanan menolak PUT yang
// panjangnya lain; bila tidak, penyimpanan menerima ukuran apa pun dan hanya pemeriksaan sesudah unggah yang
// menolaknya.
func (s Service) MintaUnggahan(ctx context.Context, peminta, ukuranKartu, ukuranSwafoto int64) (Unggahan, error) {
	pen, ok := s.t4.Objek.(Penandatangan)
	if s.t4.Objek == nil || !ok {
		return Unggahan{}, ErrPresignTidakAda
	}
	if _, err := s.periksaPengaju(ctx, peminta); err != nil {
		return Unggahan{}, err
	}
	for _, c := range []struct {
		nama string
		u    int64
	}{{"ukuran_kartu", ukuranKartu}, {"ukuran_swafoto", ukuranSwafoto}} {
		if c.u < 0 || c.u > MaksBerkasIdentitas {
			return Unggahan{}, ErrValidasi{c.nama, "paling besar 1 MiB"}
		}
	}
	if err := s.BatasAkun("unggahan", peminta); err != nil {
		return Unggahan{}, err
	}
	umur := UmurPresign
	if s.t4.UmurPresign > 0 {
		umur = s.t4.UmurPresign
	}
	awalan := fmt.Sprintf("identitas/%d/", peminta)
	u := Unggahan{KunciKartu: awalan + acakHex(16), KunciSwafoto: awalan + acakHex(16), BerlakuSampai: s.kini().Add(umur)}
	var err error
	if u.URLKartu, err = pen.PresignPUT(u.KunciKartu, umur, ukuranKartu); err != nil {
		return Unggahan{}, err
	}
	if u.URLSwafoto, err = pen.PresignPUT(u.KunciSwafoto, umur, ukuranSwafoto); err != nil {
		return Unggahan{}, err
	}
	return u, nil
}

// periksaChecksum: bentuk checksum dari app (64 heksadesimal); nilainya diperiksa terhadap isi, bukan dipercaya.
func periksaBentukChecksum(nama, c string) error {
	if len(c) != 64 {
		return ErrValidasi{nama, "harus 64 karakter heksadesimal (SHA-256)"}
	}
	for _, r := range c {
		if !(r >= '0' && r <= '9' || r >= 'a' && r <= 'f' || r >= 'A' && r <= 'F') {
			return ErrValidasi{nama, "harus 64 karakter heksadesimal (SHA-256)"}
		}
	}
	return nil
}

// periksaNomorIdentitas: 16 angka (Asumsi lab; naskah tidak punya bidang ini). Pesan galatnya tidak memuat nilainya:
// nomor identitas tidak boleh sampai ke log atau jawaban.
func periksaNomorIdentitas(n string) error {
	if len(n) != 16 {
		return ErrValidasi{"nomor_identitas", "harus 16 angka"}
	}
	for _, r := range n {
		if r < '0' || r > '9' {
			return ErrValidasi{"nomor_identitas", "harus 16 angka"}
		}
	}
	return nil
}

// periksaObjek memeriksa satu objek yang sudah diunggah: ada, ukuran (HEAD, sebelum isinya dibaca), tipe dari byte,
// dan checksum yang dihitung server dari isi. Mengembalikan checksum hitungan server.
func (s Service) periksaObjek(ctx context.Context, bidang, kunci, klaim string) (string, error) {
	n, err := s.t4.Objek.Ukuran(ctx, kunci)
	if errors.Is(err, objek.ErrTidakAda) {
		return "", ErrValidasi{bidang, "belum diunggah"}
	}
	if err != nil {
		return "", err
	}
	if n == 0 {
		return "", ErrValidasi{bidang, "wajib diisi"}
	}
	if n > MaksBerkasIdentitas {
		return "", ErrValidasi{bidang, "paling besar 1 MiB"}
	}
	isi, err := s.t4.Objek.Baca(ctx, kunci)
	if errors.Is(err, objek.ErrTidakAda) {
		return "", ErrValidasi{bidang, "belum diunggah"}
	}
	if errors.Is(err, objek.ErrTerlaluBesar) {
		return "", ErrValidasi{bidang, "paling besar 1 MiB"}
	}
	if err != nil {
		return "", err
	}
	if err := periksaGambar(bidang, isi); err != nil {
		return "", err
	}
	hitung := checksum(isi)
	if !strings.EqualFold(hitung, klaim) {
		return "", ErrValidasi{bidang, "checksum tidak cocok dengan isi yang diunggah"}
	}
	return hitung, nil
}

// AjukanVerifikasiTerunggah menulis pengajuan untuk dua objek yang sudah diunggah app lewat presigned PUT.
func (s Service) AjukanVerifikasiTerunggah(ctx context.Context, peminta int64, in BerkasTerunggah) (repo.Verifikasi, error) {
	if s.t4.Objek == nil {
		return repo.Verifikasi{}, ErrLayananTidakAda
	}
	a, err := s.periksaPengaju(ctx, peminta)
	if err != nil {
		return repo.Verifikasi{}, err
	}
	awalan := fmt.Sprintf("identitas/%d/", peminta)
	for _, c := range []struct{ nama, k string }{{"kunci_kartu", in.KunciKartu}, {"kunci_swafoto", in.KunciSwafoto}} {
		if !strings.HasPrefix(c.k, awalan) || len(c.k) <= len(awalan) {
			return repo.Verifikasi{}, ErrValidasi{c.nama, "bukan kunci yang diterbitkan untuk akun ini"}
		}
	}
	if in.KunciKartu == in.KunciSwafoto {
		return repo.Verifikasi{}, ErrValidasi{"kunci_swafoto", "tidak boleh sama dengan kunci_kartu"}
	}
	if err := periksaBentukChecksum("checksum_kartu", in.ChecksumKartu); err != nil {
		return repo.Verifikasi{}, err
	}
	if err := periksaBentukChecksum("checksum_swafoto", in.ChecksumSwafoto); err != nil {
		return repo.Verifikasi{}, err
	}
	if err := periksaNomorIdentitas(in.NomorIdentitas); err != nil {
		return repo.Verifikasi{}, err
	}
	if err := s.BatasAkun("verifikasi", peminta); err != nil {
		return repo.Verifikasi{}, err
	}
	ckKartu, err := s.periksaObjek(ctx, "berkas_kartu", in.KunciKartu, in.ChecksumKartu)
	if err == nil {
		var ckSwafoto string
		if ckSwafoto, err = s.periksaObjek(ctx, "berkas_swafoto", in.KunciSwafoto, in.ChecksumSwafoto); err == nil {
			return s.catatPengajuan(ctx, peminta, a.Jenis, in.KunciKartu, in.KunciSwafoto, ckKartu, ckSwafoto)
		}
	}
	// File yang ditolak karena isinya dihapus dari penyimpanan, supaya tidak tinggal di sana. Galat penyimpanan
	// (bukan isi file) tidak menghapus apa pun: yang gagal adalah pemeriksaannya, bukan filenya.
	var tolak ErrValidasi
	if errors.As(err, &tolak) {
		s.t4.Objek.Hapus(ctx, in.KunciKartu)
		s.t4.Objek.Hapus(ctx, in.KunciSwafoto)
	}
	return repo.Verifikasi{}, err
}

// HasilRetensi: ringkasan satu putaran job retensi.
type HasilRetensi struct{ Diperiksa, Dihapus, Galat int }

const ukuranHalamanRetensi = 100

// HapusBerkasJatuhTempo menghapus file identitas yang masa simpannya sudah sampai (hapus_pada <= waktu service),
// lalu menandai barisnya. Idempoten: Hapus objek yang sudah tidak ada dianggap berhasil, dan baris yang sudah
// ditandai tidak dipilih lagi. Panggilan ke penyimpanan ada di luar transaction (ADR 22). Satu file yang gagal
// dihapus dihitung sebagai galat dan tidak menghentikan job; barisnya tetap, dan putaran berikutnya mencobanya lagi.
func (s Service) HapusBerkasJatuhTempo(ctx context.Context) (HasilRetensi, error) {
	var h HasilRetensi
	if s.t4.Objek == nil {
		return h, ErrObjekTidakDipasang
	}
	kini := s.kini()
	var sesudah int64
	for {
		halaman, err := s.repo.BerkasJatuhTempo(ctx, kini, sesudah, ukuranHalamanRetensi)
		if err != nil {
			return h, err
		}
		for _, b := range halaman {
			sesudah = b.ID
			h.Diperiksa++
			gagal := false
			for _, k := range []string{b.KunciKartu, b.KunciSwafoto} {
				if k == "" {
					continue
				}
				if err := s.t4.Objek.Hapus(ctx, k); err != nil {
					gagal = true
				}
			}
			if gagal {
				h.Galat++
				continue
			}
			ok, err := s.repo.TandaiBerkasDihapus(ctx, b.ID, kini)
			if err != nil {
				return h, err
			}
			if ok {
				h.Dihapus++
			}
		}
		if len(halaman) < ukuranHalamanRetensi {
			return h, nil
		}
	}
}
