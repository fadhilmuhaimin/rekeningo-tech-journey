package service

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"

	"lab/apit4/internal/repo"
)

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

// barisCSV adalah satu baris yang lolos pemeriksaan bentuk; akunnya belum dicari.
type barisCSV struct {
	no      int
	kunci   string
	nominal int64
}

// --8<-- [start:baca-csv]
// bacaCSV memeriksa bentuk file tanpa database: header, angka, batas per baris, dan akun yang muncul dua kali.
// Header "nomor_karyawan,nominal" (file HR Tahap 2) atau "email,nominal" (format Tahap 1, tetap diterima).
func bacaCSV(isi string) (kolom string, baris []barisCSV, salah []KesalahanBaris) {
	rekaman, err := csv.NewReader(strings.NewReader(isi)).ReadAll()
	if err != nil || len(rekaman) < 2 || len(rekaman[0]) != 2 || rekaman[0][1] != "nominal" ||
		(rekaman[0][0] != "nomor_karyawan" && rekaman[0][0] != "email") {
		return "", nil, []KesalahanBaris{{1, "header", "harus nomor_karyawan,nominal lalu minimal satu baris"}}
	}
	kolom = rekaman[0][0]
	pertama := map[string]int{}
	for i, r := range rekaman[1:] {
		no := i + 2 // baris 1 adalah header
		nominal, errN := strconv.ParseInt(r[1], 10, 64)
		switch {
		case errN != nil:
			salah = append(salah, KesalahanBaris{no, "nominal", "harus angka rupiah tanpa titik"})
		case nominal <= 0 || nominal > MaksTopup:
			salah = append(salah, KesalahanBaris{no, "nominal", "harus lebih dari 0 dan paling banyak 1000000"})
		case pertama[r[0]] != 0:
			salah = append(salah, KesalahanBaris{no, kolom, fmt.Sprintf("sudah ada di baris %d", pertama[r[0]])})
		default:
			pertama[r[0]] = no
			baris = append(baris, barisCSV{no, r[0], nominal})
		}
	}
	return kolom, baris, salah
}

// --8<-- [end:baca-csv]

// --8<-- [start:topup]
// Topup: satu file CSV dari HR, satu jurnal topup per akun (buku tunjangan -, buku karyawan +),
// semua jurnal dalam satu transaction (PRD v2, P0). Satu baris salah = seluruh file ditolak.
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
	kolom, baris, salah := bacaCSV(isiCSV)
	kunci := make([]string, len(baris))
	for i, b := range baris {
		kunci[i] = b.kunci
	}
	tujuan, err := s.repo.AkunLewatKunci(ctx, kolom, kunci)
	if err != nil {
		return 0, 0, err
	}
	for _, b := range baris {
		t, ada := tujuan[b.kunci]
		switch {
		case !ada:
			salah = append(salah, KesalahanBaris{b.no, kolom, "tidak terdaftar"})
		case t.Jenis != "karyawan" || t.BukuID == 0:
			salah = append(salah, KesalahanBaris{b.no, kolom, "bukan akun karyawan"})
		}
	}
	if len(salah) > 0 {
		urutkan(salah)
		return 0, 0, ErrCSV{salah}
	}
	err = s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		tunjangan, err := tx.BukuSistem(ctx, "tunjangan")
		if err != nil {
			return err
		}
		for _, b := range baris {
			id, err := tx.CatatJurnal(ctx, "topup", keterangan, peminta, nil, []repo.Posting{
				{BukuID: tunjangan, Jumlah: -b.nominal}, {BukuID: tujuan[b.kunci].BukuID, Jumlah: b.nominal}})
			if err != nil {
				return fmt.Errorf("baris %d: %w", b.no, err)
			}
			// Satu pemberitahuan per jurnal, kelas top-up massal: boleh menyusul di belakang uang (ADR 32).
			isi, err := json.Marshal(pesanUang("Tunjangan makan", b.nominal, id, ""))
			if err != nil {
				return err
			}
			if err := tx.TulisOutbox(ctx, id, tujuan[b.kunci].ID, repo.KelasTopup, "topup", isi); err != nil {
				return fmt.Errorf("baris %d: %w", b.no, err)
			}
			total += b.nominal
		}
		return nil
	})
	if err != nil {
		return 0, 0, err
	}
	return len(baris), total, nil
}

// --8<-- [end:topup]

// urutkan kesalahan menurut nomor baris (pemeriksaan bentuk dan pemeriksaan akun berjalan terpisah).
func urutkan(k []KesalahanBaris) {
	for i := 1; i < len(k); i++ {
		for j := i; j > 0 && k[j].Baris < k[j-1].Baris; j-- {
			k[j], k[j-1] = k[j-1], k[j]
		}
	}
}

// isUnik: error PostgreSQL 23505 unique_violation.
func isUnik(err error) bool {
	var pg *pgconn.PgError
	return errors.As(err, &pg) && pg.Code == "23505"
}
