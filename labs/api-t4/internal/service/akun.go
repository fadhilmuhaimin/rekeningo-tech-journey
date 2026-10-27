package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"lab/apit4/internal/repo"
)

// LihatAkun: hanya pemiliknya. Akun orang lain dijawab "tidak ditemukan", bukan "dilarang",
// supaya penanya tidak tahu akun itu ada.
func (s Service) LihatAkun(ctx context.Context, peminta, id int64) (repo.Akun, error) {
	if peminta != id {
		return repo.Akun{}, ErrTidakDitemukan
	}
	a, err := s.repo.Akun(ctx, id)
	if errors.Is(err, repo.ErrTidakAda) {
		return repo.Akun{}, ErrTidakDitemukan
	}
	return a, err
}

// LihatTransaksi: jurnal bayar atau transfer, hanya untuk pengirim atau penerimanya. Nomor transaksi v1
// tidak pernah dipakai jurnal (migrasi 000012), jadi tautan lama dijawab tidak ditemukan.
func (s Service) LihatTransaksi(ctx context.Context, peminta, id int64) (repo.Pindahan, error) {
	t, err := s.repo.Pindahan(ctx, id)
	if errors.Is(err, repo.ErrTidakAda) || (err == nil && peminta != t.Dari && peminta != t.Ke) {
		return repo.Pindahan{}, ErrTidakDitemukan
	}
	return t, err
}

// CariWarung: siapa pun yang login boleh mencari warung. Hasilnya hanya id dan nama warung.
func (s Service) CariWarung(ctx context.Context, cari string) ([]repo.WarungRingkas, error) {
	return s.repo.CariWarung(ctx, cari)
}

// --8<-- [start:pembalik]
// Balik membuat jurnal pembalik untuk satu jurnal (naskah bagian 3: koreksi tanpa mengubah data lama).
// Hanya admin, alasan minimal 20 karakter, satu jurnal paling banyak dibalik sekali. Database ikut menjaga:
// pembalik harus cermin jurnal asal, dan saldo karyawan tidak boleh negatif sesudahnya (keputusan 401).
func (s Service) Balik(ctx context.Context, peminta, jurnal int64, alasan string) (int64, error) {
	admin, err := s.repo.Akun(ctx, peminta)
	if err != nil {
		return 0, err
	}
	if admin.Jenis != "admin" {
		return 0, ErrDilarang
	}
	alasan = strings.TrimSpace(alasan)
	if len(alasan) < 20 {
		return 0, ErrValidasi{"alasan", "wajib, minimal 20 karakter: kenapa jurnal ini dibalik"}
	}
	jenis, asal, sudah, err := s.repo.JurnalAsal(ctx, jurnal)
	if errors.Is(err, repo.ErrTidakAda) {
		return 0, ErrTidakDitemukan
	}
	if err != nil {
		return 0, err
	}
	if jenis == "pembalik" {
		return 0, ErrValidasi{"jurnal", "jurnal pembalik tidak dibalik lagi"}
	}
	if sudah {
		return 0, ErrSudahDibalik
	}
	var id int64
	err = s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		bukuID := make([]int64, len(asal))
		cermin := make([]repo.Posting, len(asal))
		for i, p := range asal {
			bukuID[i] = p.BukuID
			cermin[i] = repo.Posting{BukuID: p.BukuID, Jumlah: -p.Jumlah}
		}
		buku, err := tx.KunciBukuID(ctx, bukuID...)
		if err != nil {
			return err
		}
		for _, p := range cermin {
			if b := buku[p.BukuID]; b.Jenis == "karyawan" && b.Saldo+p.Jumlah < 0 {
				return ErrSaldoKurang
			}
		}
		id, err = tx.CatatJurnal(ctx, "pembalik", alasan, peminta, &jurnal, cermin)
		return err
	})
	if isUnik(err) { // dua admin membalik jurnal yang sama bersamaan: UNIQUE (membalik_jurnal_id)
		return 0, ErrSudahDibalik
	}
	return id, err
}

// --8<-- [end:pembalik]

// --8<-- [start:tutup-buku]
// TutupBuku: laporan satu bulan untuk Keuangan (PRD v2, P0). Hanya admin.
func (s Service) TutupBuku(ctx context.Context, peminta int64, periode string) ([]repo.BarisTutupBuku, repo.RingkasanSistem, error) {
	admin, err := s.repo.Akun(ctx, peminta)
	if err != nil {
		return nil, repo.RingkasanSistem{}, err
	}
	if admin.Jenis != "admin" {
		return nil, repo.RingkasanSistem{}, ErrDilarang
	}
	if _, err := time.Parse("2006-01", periode); err != nil {
		return nil, repo.RingkasanSistem{}, ErrValidasi{"periode", "bulan dengan format YYYY-MM"}
	}
	return s.repo.TutupBuku(ctx, periode+"-01")
}

// --8<-- [end:tutup-buku]
