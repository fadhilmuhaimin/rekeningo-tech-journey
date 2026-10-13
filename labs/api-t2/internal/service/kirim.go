package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"lab/apit2/internal/repo"
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
func (s Service) Kirim(ctx context.Context, peminta int64, nomor string, nominal int64) (HasilKirim, error) {
	var h HasilKirim
	if err := periksaNominal(nominal); err != nil {
		return h, err
	}
	penerima, err := s.repo.AkunLewatNomor(ctx, strings.TrimSpace(nomor))
	if errors.Is(err, repo.ErrTidakAda) || (err == nil && penerima.Jenis != "karyawan") {
		return h, ErrValidasi{"ke_nomor_karyawan", "tidak terdaftar"}
	}
	if err != nil {
		return h, err
	}
	if penerima.ID == peminta {
		return h, ErrValidasi{"ke_nomor_karyawan", "nomor milik pengirim sendiri"}
	}
	pengirim, err := s.repo.Akun(ctx, peminta)
	if err != nil {
		return h, err
	}
	if pengirim.Jenis != "karyawan" {
		return h, ErrDilarang
	}
	err = s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		buku, err := tx.KunciBukuAkun(ctx, peminta, penerima.ID)
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
		h.ID, err = tx.CatatJurnal(ctx, "transfer", fmt.Sprintf("Kiriman %s ke %s", pengirim.Nama, penerima.Nama),
			peminta, nil, []repo.Posting{{BukuID: dari.ID, Jumlah: -nominal}, {BukuID: buku[penerima.ID].ID, Jumlah: nominal}})
		h.Saldo = dari.Saldo - nominal
		if dari.BatasHarian != nil {
			h.SisaBatas = *dari.BatasHarian - h.keluarTadi - nominal
		}
		return err
	})
	return h, err
}

// --8<-- [end:kirim]
