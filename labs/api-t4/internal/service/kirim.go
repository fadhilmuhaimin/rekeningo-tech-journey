package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"lab/apit4/internal/repo"
)

// HasilKirim: jurnal yang tercatat, saldo pengirim sesudahnya, dan sisa batas hari ini.
type HasilKirim struct {
	ID         int64 `json:"id"`
	Saldo      int64 `json:"saldo"`
	SisaBatas  int64 `json:"sisa_batas_harian"`
	keluarTadi int64
}

// --8<-- [start:aturan-kirim]
// periksaNominal: aturan yang tidak butuh database, diperiksa sebelum transaction dibuka.
func periksaNominal(nominal int64) error {
	if nominal <= 0 {
		return ErrValidasi{"nominal", "harus lebih dari 0"}
	}
	return nil
}

// periksaBatas: transfer keluar hari ini ditambah nominal ini tidak boleh melewati batas harian buku.
// Bayar ke warung tidak dihitung (PRD v2: batas untuk kirim ke rekan).
func periksaBatas(keluarHariIni, nominal int64, batas *int64) error {
	if batas != nil && keluarHariIni+nominal > *batas {
		return ErrBatasHarian
	}
	return nil
}

// --8<-- [end:aturan-kirim]

// --8<-- [start:kirim]
// Kirim memindahkan uang antar karyawan lewat nomor karyawan penerima (PRD v2, P0).
// Kedua buku dikunci di dalam transaction jurnal (ADR 13), lalu batas harian dan saldo dibaca sesudah lock.
//
// Pengaman cek penerima (lab-api-t2a, keputusan 646): setiap percobaan mengambil satu token dari bucket akun
// pengirim, dan aturan sisi pengirim (nominal, batas harian, saldo) diperiksa sebelum ada jawaban tentang
// penerima. Nomor yang tidak terdaftar hanya dilaporkan bila kiriman ke nomor terdaftar akan berhasil, jadi
// percobaan yang gagal tidak membedakan nomor terdaftar dari yang tidak.
func (s Service) Kirim(ctx context.Context, peminta int64, nomor string, nominal int64, catatan string) (HasilKirim, error) {
	var h HasilKirim
	if ok, tunggu := s.kirimAkun.Izinkan(fmt.Sprint(peminta), s.kini()); !ok {
		return h, ErrTerlaluSering{Lapis: "akun", Tunggu: tunggu}
	}
	if err := periksaNominal(nominal); err != nil {
		return h, err
	}
	catatan, err := periksaCatatan(catatan)
	if err != nil {
		return h, err
	}
	pengirim, err := s.repo.Akun(ctx, peminta)
	if err != nil {
		return h, err
	}
	if pengirim.Jenis != "karyawan" {
		return h, ErrDilarang
	}
	if pengirim.Status == "dibekukan" {
		return h, ErrDibekukan
	}
	if pengirim.Tingkat != "terverifikasi" { // PRD v4: transfer hanya untuk akun terverifikasi
		return h, ErrButuhVerifikasi
	}
	if pengirim.NomorKaryawan != nil && *pengirim.NomorKaryawan == strings.TrimSpace(nomor) {
		return h, ErrValidasi{"ke_nomor_karyawan", "nomor milik pengirim sendiri"}
	}
	penerima, err := s.repo.AkunLewatNomor(ctx, strings.TrimSpace(nomor))
	terdaftar := err == nil && penerima.Jenis == "karyawan"
	if err != nil && !errors.Is(err, repo.ErrTidakAda) {
		return h, err
	}
	akun := []int64{peminta}
	if terdaftar {
		akun = append(akun, penerima.ID)
	}
	perangkat := s.perangkatRentan(ctx, penerima.ID)
	err = s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		buku, err := tx.KunciBukuAkun(ctx, akun...)
		if err != nil {
			return err
		}
		dari := buku[peminta]
		if h.keluarTadi, err = tx.TransferKeluarHariIni(ctx, dari.ID); err != nil {
			return err
		}
		if err := periksaBatas(h.keluarTadi, nominal, dari.BatasHarian); err != nil {
			return err
		}
		if dari.Saldo < nominal {
			return ErrSaldoKurang
		}
		if !terdaftar { // baru di sini: kiriman ini akan berhasil bila nomornya terdaftar
			return ErrValidasi{"ke_nomor_karyawan", "tidak terdaftar"}
		}
		h.ID, err = tx.CatatJurnal(ctx, "transfer", keterangan(fmt.Sprintf("Kiriman %s ke %s", pengirim.Nama, penerima.Nama), catatan),
			peminta, nil, []repo.Posting{{BukuID: dari.ID, Jumlah: -nominal}, {BukuID: buku[penerima.ID].ID, Jumlah: nominal}})
		if err != nil {
			return err
		}
		h.Saldo = dari.Saldo - nominal
		if dari.BatasHarian != nil {
			h.SisaBatas = *dari.BatasHarian - h.keluarTadi - nominal
		}
		return s.beritahu(ctx, tx, h.ID, penerima.ID, "transfer", perangkat, pesanUang(pengirim.Nama, nominal, h.ID, catatan))
	})
	return h, err
}

// --8<-- [end:kirim]
