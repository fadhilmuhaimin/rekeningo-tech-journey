package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"

	"lab/apit4/internal/repo"
)

// Verifikasi identitas (PRD v4 P0, M31, M33, ADR 36, ADR 38). Pengajuan menyimpan dua file di penyimpanan objek
// dan satu baris verifikasi, lalu menulis satu baris outbox bertujuan verifikasi di transaction yang sama. Worker
// (internal/worker/verifikasi.go) memanggil layanan verifikasi tiruan dan menaikkan tingkat akun bila lulus.

// MaksBerkasIdentitas: satu file identitas paling besar 1 MiB (Asumsi lab; naskah 3b memakai 500 KB per file untuk hitungan).
const MaksBerkasIdentitas = 1 << 20

func checksum(b []byte) string {
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}

func periksaGambar(nama string, b []byte) error {
	if len(b) == 0 {
		return ErrValidasi{nama, "wajib diisi"}
	}
	if len(b) > MaksBerkasIdentitas {
		return ErrValidasi{nama, "paling besar 1 MiB"}
	}
	// Tipe isi dari byte pertama, bukan dari nama atau header yang dikirim user.
	if t := http.DetectContentType(b); t != "image/jpeg" && t != "image/png" {
		return ErrValidasi{nama, "harus gambar JPEG atau PNG"}
	}
	return nil
}

// AjukanVerifikasi: foto kartu identitas dan swafoto dari pemakai atau merchant yang belum terverifikasi. Pemakai
// diteruskan ke layanan verifikasi lewat outbox; merchant menunggu persetujuan tim risk (back office), tanpa vendor.
func (s Service) AjukanVerifikasi(ctx context.Context, peminta int64, kartu, swafoto []byte) (repo.Verifikasi, error) {
	if s.t4.Objek == nil {
		return repo.Verifikasi{}, ErrLayananTidakAda
	}
	a, err := s.periksaPengaju(ctx, peminta)
	if err != nil {
		return repo.Verifikasi{}, err
	}
	if err := periksaGambar("berkas_kartu", kartu); err != nil {
		return repo.Verifikasi{}, err
	}
	if err := periksaGambar("berkas_swafoto", swafoto); err != nil {
		return repo.Verifikasi{}, err
	}
	if err := s.BatasAkun("verifikasi", peminta); err != nil {
		return repo.Verifikasi{}, err
	}
	kunciKartu, kunciSwafoto := "identitas/"+acakHex(16), "identitas/"+acakHex(16)
	if err := s.t4.Objek.Simpan(ctx, kunciKartu, kartu); err != nil {
		return repo.Verifikasi{}, err
	}
	if err := s.t4.Objek.Simpan(ctx, kunciSwafoto, swafoto); err != nil {
		s.t4.Objek.Hapus(ctx, kunciKartu)
		return repo.Verifikasi{}, err
	}
	return s.catatPengajuan(ctx, peminta, a.Jenis, kunciKartu, kunciSwafoto, checksum(kartu), checksum(swafoto))
}

// catatPengajuan menulis baris verifikasi dan (untuk pemakai) satu baris outbox di satu transaction. Bila
// pengajuan gagal ditulis, kedua file dihapus: file yatim tidak dibiarkan. Dipakai jalur unggah lewat server
// (AjukanVerifikasi) dan jalur presigned PUT (AjukanVerifikasiTerunggah).
func (s Service) catatPengajuan(ctx context.Context, peminta int64, subjek, kunciKartu, kunciSwafoto, ckKartu, ckSwafoto string) (repo.Verifikasi, error) {
	var id int64
	err := s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		var err error
		id, err = tx.BuatVerifikasi(ctx, peminta, subjek, kunciKartu, kunciSwafoto, ckKartu, ckSwafoto)
		if err != nil {
			return err
		}
		if subjek != "pemakai" {
			return nil
		}
		payload, _ := json.Marshal(map[string]int64{"verifikasi_id": id})
		return tx.TulisOutboxVerifikasi(ctx, peminta, payload)
	})
	if err != nil {
		s.t4.Objek.Hapus(ctx, kunciKartu) // pengajuan gagal: file yatim tidak dibiarkan
		s.t4.Objek.Hapus(ctx, kunciSwafoto)
		if isUnik(err) {
			return repo.Verifikasi{}, ErrVerifikasiBerjalan
		}
		return repo.Verifikasi{}, err
	}
	return s.repo.Verifikasi(ctx, id)
}

// LihatVerifikasi: hanya pemiliknya; milik orang lain dijawab tidak ditemukan.
func (s Service) LihatVerifikasi(ctx context.Context, peminta, id int64) (repo.Verifikasi, error) {
	v, err := s.repo.Verifikasi(ctx, id)
	if errors.Is(err, repo.ErrTidakAda) || (err == nil && v.AkunID != peminta) {
		return repo.Verifikasi{}, ErrTidakDitemukan
	}
	return v, err
}
