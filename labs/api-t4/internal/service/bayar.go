package service

import (
	"context"
	"errors"
	"fmt"

	"lab/apit4/internal/repo"
)

var (
	ErrDilarang     = errors.New("dilarang")
	ErrSaldoKurang  = errors.New("saldo tidak cukup")
	ErrBatasHarian  = errors.New("batas transfer harian terlewati")
	ErrBatasWarung  = errors.New("saldo warung melewati batas")
	ErrSudahDibalik = errors.New("jurnal sudah pernah dibalik")
)

// ErrValidasi: satu field input tidak memenuhi aturan Rekeningo.
type ErrValidasi struct{ Field, Pesan string }

func (e ErrValidasi) Error() string { return e.Field + ": " + e.Pesan }

// MaksBayar adalah batas fiktif satu pembayaran: empat kali tunjangan harian (sama dengan Tahap 1).
const MaksBayar = 200_000

// --8<-- [start:bayar]
// Bayar memindahkan uang dari karyawan ke warung: satu jurnal bayar dengan dua posting, dan (Tahap 3) satu baris
// outbox untuk pemberitahuan ke warung di transaction yang sama. Kontrak HTTP sama dengan Tahap 1, jadi app 1.0
// dan 1.1 tidak perlu diubah; catatan hanya dikirim app yang baru.
func (s Service) Bayar(ctx context.Context, peminta, ke, jumlah int64, catatan string) (id, saldo int64, err error) {
	if jumlah <= 0 || jumlah > MaksBayar {
		return 0, 0, ErrValidasi{"jumlah", "harus lebih dari 0 dan paling banyak 200000"}
	}
	if catatan, err = periksaCatatan(catatan); err != nil {
		return 0, 0, err
	}
	penerima, err := s.repo.Akun(ctx, ke)
	if errors.Is(err, repo.ErrTidakAda) || (err == nil && penerima.Jenis != "warung") {
		return 0, 0, ErrValidasi{"ke", "harus akun warung"}
	}
	if err != nil {
		return 0, 0, err
	}
	pembayar, err := s.repo.Akun(ctx, peminta)
	if err != nil {
		return 0, 0, err
	}
	if pembayar.Jenis != "karyawan" {
		return 0, 0, ErrDilarang
	}
	perangkat := s.perangkatRentan(ctx, ke)
	err = s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		buku, err := tx.KunciBukuAkun(ctx, peminta, ke)
		if err != nil {
			return err
		}
		dari, w := buku[peminta], buku[ke]
		if dari.Saldo < jumlah { // dibaca sesudah lock: transaction lain dari buku ini menunggu
			return ErrSaldoKurang
		}
		if w.BatasSaldo != nil && w.Saldo+jumlah > *w.BatasSaldo {
			return ErrBatasWarung
		}
		id, err = tx.CatatJurnal(ctx, "bayar", keterangan(fmt.Sprintf("Bayar %s ke %s", pembayar.Nama, penerima.Nama), catatan),
			peminta, nil, []repo.Posting{{BukuID: dari.ID, Jumlah: -jumlah}, {BukuID: w.ID, Jumlah: jumlah}})
		if err != nil {
			return err
		}
		saldo = dari.Saldo - jumlah
		return s.beritahu(ctx, tx, id, ke, "bayar", perangkat, pesanUang(pembayar.Nama, jumlah, id, catatan))
	})
	return id, saldo, err
}

// --8<-- [end:bayar]
