package service

import (
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"lab/apit2/internal/repo"
)

var ErrDilarang = errors.New("dilarang")

// MaksTopup adalah batas fiktif per baris: tunjangan satu minggu adalah Rp250.000.
const MaksTopup = 1_000_000

// KesalahanBaris menjelaskan satu baris CSV yang ditolak.
type KesalahanBaris struct {
	Baris int    `json:"baris"`
	Field string `json:"field"`
	Pesan string `json:"pesan"`
}

// ErrCSV berisi semua baris yang ditolak. Tidak ada saldo yang berubah bila ada satu baris pun yang salah.
type ErrCSV struct{ Kesalahan []KesalahanBaris }

func (e ErrCSV) Error() string { return fmt.Sprintf("%d baris CSV ditolak", len(e.Kesalahan)) }

// --8<-- [start:topup]
func (s Service) Topup(ctx context.Context, peminta int64, keterangan, isiCSV string) (akun int, total int64, err error) {
	a, err := s.repo.Akun(ctx, peminta)
	if err != nil {
		return 0, 0, err
	}
	if a.Jenis != "admin" {
		return 0, 0, ErrDilarang
	}
	if strings.TrimSpace(keterangan) == "" {
		return 0, 0, ErrCSV{[]KesalahanBaris{{0, "keterangan", "wajib diisi: kenapa saldo ini berubah"}}}
	}
	rekaman, err := csv.NewReader(strings.NewReader(isiCSV)).ReadAll()
	if err != nil || len(rekaman) < 2 || strings.Join(rekaman[0], ",") != "email,nominal" {
		return 0, 0, ErrCSV{[]KesalahanBaris{{1, "header", "harus email,nominal lalu minimal satu baris"}}}
	}
	email := make([]string, 0, len(rekaman)-1)
	for _, r := range rekaman[1:] {
		email = append(email, r[0])
	}
	jenis, err := s.repo.JenisAkunLewatEmail(ctx, email)
	if err != nil {
		return 0, 0, err
	}
	// Periksa semua baris dulu. Satu baris salah = seluruh file ditolak, supaya tidak ada top-up setengah jadi.
	var salah []KesalahanBaris
	baris := make([]repo.BarisTopup, 0, len(rekaman)-1)
	for i, r := range rekaman[1:] {
		no := i + 2 // baris 1 adalah header
		akun, ada := jenis[r[0]]
		nominal, errN := strconv.ParseInt(r[1], 10, 64)
		switch {
		case !ada:
			salah = append(salah, KesalahanBaris{no, "email", "tidak terdaftar"})
		case akun.Jenis != "karyawan":
			salah = append(salah, KesalahanBaris{no, "email", "bukan akun karyawan"})
		case errN != nil:
			salah = append(salah, KesalahanBaris{no, "nominal", "harus angka rupiah tanpa titik"})
		case nominal <= 0 || nominal > MaksTopup:
			salah = append(salah, KesalahanBaris{no, "nominal", "harus lebih dari 0 dan paling banyak 1000000"})
		default:
			baris = append(baris, repo.BarisTopup{AkunID: akun.ID, Nominal: nominal})
			total += nominal
		}
	}
	if len(salah) > 0 {
		return 0, 0, ErrCSV{salah}
	}
	// ADR 5: semua baris dalam satu transaction yang dibuka service. Satu gagal, semua batal.
	err = s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		for _, b := range baris {
			if err := tx.TambahSaldo(ctx, b.AkunID, b.Nominal); err != nil {
				return fmt.Errorf("akun %d: %w", b.AkunID, err)
			}
			if err := tx.CatatTopup(ctx, b, peminta, keterangan); err != nil {
				return fmt.Errorf("catatan akun %d: %w", b.AkunID, err)
			}
		}
		return nil
	})
	return len(baris), total, err
}

// --8<-- [end:topup]
