package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strconv"

	"github.com/jackc/pgx/v5/pgconn"

	"lab/apit4/internal/repo"
)

// API ledger untuk kartu (ADR 42 dan ADR 37, lab t4-kartu). Service pembayaran menjawab penerbit dengan satu
// panggilan ke ledger, Idempotency-Key = id_penerbit. Di sini sisi ledger: hold adalah satu transaction yang
// menahan dana lewat jurnal kartu_tahan (akun pemilik ke buku dana_tertahan). Baris otorisasi_kartu ditulis service
// pembayaran sesudahnya, di luar transaction ini; kegagalan di antaranya dijaga key.

// ErrLedgerSibuk: lock buku tidak didapat dalam lock_timeout (SQLSTATE 55P03). Hold tidak ditulis dan key tidak
// tertahan; service pembayaran menjawab penerbit "tolak, sibuk" supaya jawaban sampai sebelum tenggat penerbit.
var ErrLedgerSibuk = errors.New("ledger sibuk: lock buku tidak didapat dalam lock_timeout")

func hashTahan(idPenerbit string, akun, jumlah int64) string {
	h := sha256.Sum256([]byte("tahan|" + idPenerbit + "|" + strconv.FormatInt(akun, 10) + "|" + strconv.FormatInt(jumlah, 10)))
	return hex.EncodeToString(h[:])
}

// --8<-- [start:ledger-tahan]
// LedgerTahanKartu menahan dana satu otorisasi kartu di ledger, sekali per key.
//
// Urutan di dalam satu transaction: lock_timeout dipasang lebih dulu (supaya menunggu lock, termasuk menunggu key
// yang sedang diklaim transaction lain, tidak lebih lama daripada sisa tenggat penerbit); key diklaim; buku pemilik
// dikunci (ORDER BY id FOR UPDATE, ADR 13); status akun dan saldo diperiksa SESUDAH lock; jurnal kartu_tahan ditulis
// dan key diikat ke jurnalnya. Ulangan dengan key yang sama mendapat jurnal pertama, bukan hold kedua. Permintaan
// yang ditolak (saldo kurang, akun dibekukan) di-ROLLBACK, jadi key-nya tidak tertahan. Tidak ada panggilan jaringan
// di dalam transaction (ADR 22).
func (s Service) LedgerTahanKartu(ctx context.Context, kunci, idPenerbit string, akun, jumlah int64) (HasilKredit, error) {
	if kunci == "" || kunci != idPenerbit {
		return HasilKredit{}, ErrValidasi{"Idempotency-Key", "harus sama dengan id_penerbit"}
	}
	if idPenerbit == "" || len(idPenerbit) > 64 {
		return HasilKredit{}, ErrValidasi{"id_penerbit", "wajib, paling banyak 64 karakter"}
	}
	if jumlah <= 0 || jumlah > MaksJumlahKartu {
		return HasilKredit{}, ErrValidasi{"jumlah", fmt.Sprintf("lebih dari 0 dan paling banyak %d", MaksJumlahKartu)}
	}
	hash := hashTahan(idPenerbit, akun, jumlah)
	var h HasilKredit
	err := s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		if err := tx.BatasWaktuKunci(ctx, s.lockTimeoutKartu()); err != nil {
			return err
		}
		kini := s.kini()
		j, baru, err := tx.KunciLedger(ctx, kunci, akun, hash, kini, kini.Add(UmurKunciLedger))
		var pg *pgconn.PgError
		if errors.As(err, &pg) && pg.Code == "23503" { // akun tidak ada: key mengacu ke akun
			return ErrTidakDitemukan
		}
		if err != nil {
			return err
		}
		if !baru {
			a, hs, err := tx.IsiKunci(ctx, kunci)
			if err != nil {
				return err
			}
			if a != akun || hs != hash {
				return ErrKunciBentrok
			}
			if j == nil {
				return errors.New("key hidup tanpa jurnal: ulangi permintaan")
			}
			h = HasilKredit{Jurnal: *j, Ulang: true}
			return nil
		}
		buku, err := tx.KunciBukuAkun(ctx, akun)
		if err != nil {
			return err
		}
		b, ada := buku[akun]
		if !ada {
			return ErrTidakDitemukan
		}
		_, status, err := tx.AkunTingkat(ctx, akun)
		if err != nil {
			return err
		}
		if status == "dibekukan" {
			return ErrDibekukan
		}
		if b.Saldo < jumlah { // dibaca sesudah lock
			return ErrSaldoKurang
		}
		tertahan, err := tx.BukuSistem(ctx, "dana_tertahan")
		if err != nil {
			return err
		}
		id, err := tx.CatatJurnal(ctx, "kartu_tahan", "Dana tertahan otorisasi kartu "+idPenerbit, akun, nil,
			[]repo.Posting{{BukuID: b.ID, Jumlah: -jumlah}, {BukuID: tertahan, Jumlah: jumlah}})
		if err != nil {
			return err
		}
		if err := tx.SelesaiKunciLedger(ctx, kunci, id); err != nil {
			return err
		}
		h = HasilKredit{Jurnal: id}
		return nil
	})
	var pg *pgconn.PgError
	if errors.As(err, &pg) && pg.Code == "55P03" { // lock_not_available: lock_timeout habis
		return HasilKredit{}, ErrLedgerSibuk
	}
	return h, err
}

// --8<-- [end:ledger-tahan]
