package service

import (
	"context"
	"errors"
	"strings"

	"lab/apit2/internal/repo"
)

// MaksKoreksi adalah batas fiktif satu koreksi: empat kali tunjangan mingguan.
const MaksKoreksi = 1_000_000

// --8<-- [start:koreksi]
// Koreksi mengubah saldo satu akun di luar bayar dan top-up (ADR 6). Hanya admin, alasan wajib,
// dan perubahan saldo serta barisnya terjadi dalam satu transaction (ADR 5).
func (s Service) Koreksi(ctx context.Context, peminta, akun, jumlah int64, alasan string) (id, saldo int64, err error) {
	admin, err := s.repo.Akun(ctx, peminta)
	if err != nil {
		return 0, 0, err
	}
	if admin.Jenis != "admin" {
		return 0, 0, ErrDilarang
	}
	if len(strings.TrimSpace(alasan)) < 20 {
		return 0, 0, ErrValidasi{"alasan", "wajib, minimal 20 karakter: kenapa saldo ini diubah"}
	}
	if jumlah == 0 || jumlah > MaksKoreksi || jumlah < -MaksKoreksi {
		return 0, 0, ErrValidasi{"jumlah", "bukan 0, dan paling banyak 1000000 ke atas atau ke bawah"}
	}
	tujuan, err := s.repo.Akun(ctx, akun)
	if errors.Is(err, repo.ErrTidakAda) {
		return 0, 0, ErrValidasi{"akun", "tidak terdaftar"}
	}
	if err != nil {
		return 0, 0, err
	}
	if tujuan.Saldo+jumlah < 0 {
		return 0, 0, ErrValidasi{"jumlah", "membuat saldo negatif"}
	}
	err = s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		if saldo, err = tx.UbahSaldoKoreksi(ctx, akun, jumlah); err != nil {
			return err
		}
		id, err = tx.CatatKoreksi(ctx, akun, jumlah, strings.TrimSpace(alasan), peminta)
		return err
	})
	return id, saldo, err
}

// --8<-- [end:koreksi]
