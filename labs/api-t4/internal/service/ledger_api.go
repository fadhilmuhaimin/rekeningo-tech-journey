package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgconn"

	"lab/apit4/internal/repo"
)

// API ledger untuk service pembayaran (ADR 37, lab t4-modul). Service pembayaran tidak lagi menulis jurnal di
// transaction-nya sendiri: ia meminta ledger lewat HTTP dengan Idempotency-Key = order_id (ADR 34). Fungsi ini
// adalah sisi ledger. Sisi pembayaran (webhook_event dan status topup_bank) ada di internal/modul/pembayaran.

// UmurKunciLedger adalah umur Idempotency-Key ledger (ADR 14).
const UmurKunciLedger = 24 * time.Hour

// ErrKunciBentrok: key yang sama dipakai untuk permintaan lain (akun, order, atau jumlah berbeda).
var ErrKunciBentrok = errors.New("Idempotency-Key sudah dipakai untuk permintaan lain")

// HasilKredit: jurnal yang dihasilkan satu permintaan kredit top-up. Ulang=true bila key sudah punya jurnal dan
// tidak ada jurnal baru yang ditulis.
type HasilKredit struct {
	Jurnal int64
	Ulang  bool
}

func hashKredit(orderID string, akun, jumlah int64) string {
	h := sha256.Sum256([]byte(orderID + "|" + strconv.FormatInt(akun, 10) + "|" + strconv.FormatInt(jumlah, 10)))
	return hex.EncodeToString(h[:])
}

// --8<-- [start:ledger-kredit]
// LedgerKreditTopup menjurnal satu top-up bank untuk satu akun, sekali per key.
//
// Urutan di dalam satu transaction: (1) key diklaim dulu, supaya ulangan tidak memegang lock buku dan tidak
// ditolak oleh batas saldo yang sudah berisi kreditnya sendiri; (2) buku akun dikunci (ADR 13), lalu batas tingkat
// dan pembekuan diperiksa sesudah lock; (3) jurnal topup_bank (lawan: buku bank), key diikat ke jurnalnya, dan
// satu baris outbox di transaction yang sama (ADR 23). Tidak ada panggilan jaringan di dalam transaction (ADR 22).
//
// Permintaan yang ditolak (akun dibekukan, batas tingkat) di-ROLLBACK, jadi key-nya tidak tertahan.
func (s Service) LedgerKreditTopup(ctx context.Context, kunci, orderID string, akun, jumlah int64) (HasilKredit, error) {
	if kunci == "" || kunci != orderID {
		return HasilKredit{}, ErrValidasi{"Idempotency-Key", "harus sama dengan order_id"}
	}
	if jumlah <= 0 || jumlah > MaksTopupBank {
		return HasilKredit{}, ErrValidasi{"jumlah", fmt.Sprintf("lebih dari 0 dan paling banyak %d", MaksTopupBank)}
	}
	hash := hashKredit(orderID, akun, jumlah)
	var h HasilKredit
	err := s.repo.DalamTx(ctx, func(tx repo.Tx) error {
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
		tingkat, status, err := tx.AkunTingkat(ctx, akun)
		if err != nil {
			return err
		}
		if status == "dibekukan" {
			return ErrDibekukan
		}
		if b.Saldo+jumlah > BatasSaldoTingkat(tingkat) {
			return ErrBatasTingkat
		}
		bank, err := tx.BukuSistem(ctx, "bank")
		if err != nil {
			return err
		}
		id, err := tx.CatatJurnal(ctx, "topup_bank", "Top-up bank "+orderID, akun, nil,
			[]repo.Posting{{BukuID: bank, Jumlah: -jumlah}, {BukuID: b.ID, Jumlah: jumlah}})
		if err != nil {
			return err
		}
		if err := tx.SelesaiKunciLedger(ctx, kunci, id); err != nil {
			return err
		}
		if err := s.beritahu(ctx, tx, id, akun, "topup", nil, pesanUang("Bank", jumlah, id, "")); err != nil {
			return err
		}
		h = HasilKredit{Jurnal: id}
		return nil
	})
	return h, err
}

// --8<-- [end:ledger-kredit]
