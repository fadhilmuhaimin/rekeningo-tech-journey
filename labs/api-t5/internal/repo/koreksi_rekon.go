package repo

import (
	"context"
	"database/sql"
	"errors"
)

// Koreksi insiden rekonsiliasi (M30, ADR 35, ADR 19). Insiden dibaca, dikunci, dan ditutup di sini; jurnal koreksinya
// ditulis lewat CatatJurnal di transaction yang sama dengan penutupan insiden.

// Insiden adalah satu baris insiden_rekon.
type Insiden struct {
	ID      int64
	Tanggal string // YYYY-MM-DD
	OrderID string
	TopupID *int64
	Jenis   string // tidak_di_ledger, tidak_di_gateway, jumlah_beda
	Selisih int64  // gateway dikurangi ledger
	Status  string // terbuka, selesai
}

const kolomInsiden = `id, tanggal::text, order_id, topup_id, jenis, selisih, status`

func pindaiInsiden(row interface{ Scan(...any) error }) (Insiden, error) {
	var x Insiden
	err := row.Scan(&x.ID, &x.Tanggal, &x.OrderID, &x.TopupID, &x.Jenis, &x.Selisih, &x.Status)
	if errors.Is(err, sql.ErrNoRows) {
		return x, ErrTidakAda
	}
	return x, err
}

// InsidenTerbuka: semua insiden yang belum ditutup, menurut nomor.
func (r Repo) InsidenTerbuka(ctx context.Context) ([]Insiden, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT `+kolomInsiden+` FROM insiden_rekon WHERE status = 'terbuka' ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Insiden
	for rows.Next() {
		x, err := pindaiInsiden(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, x)
	}
	return out, rows.Err()
}

// KunciInsiden membaca satu insiden dengan baris dikunci. Job lain yang mengerjakan insiden yang sama menunggu di
// sini, lalu membaca statusnya yang sudah `selesai`.
func (t Tx) KunciInsiden(ctx context.Context, id int64) (Insiden, error) {
	return pindaiInsiden(t.tx.QueryRowContext(ctx, `SELECT `+kolomInsiden+` FROM insiden_rekon WHERE id = $1 FOR UPDATE`, id))
}

// TutupInsiden menandai insiden selesai, terikat ke jurnal yang menyelesaikannya (nil bila tidak ada uang yang
// bergerak). Hanya insiden yang masih terbuka.
func (t Tx) TutupInsiden(ctx context.Context, id int64, jurnal *int64) (bool, error) {
	h, err := t.tx.ExecContext(ctx, `UPDATE insiden_rekon SET status = 'selesai', jurnal_id = $2 WHERE id = $1 AND status = 'terbuka'`, id, jurnal)
	if err != nil {
		return false, err
	}
	n, _ := h.RowsAffected()
	return n == 1, nil
}

// TopupBankUntukUbahID: sama dengan TopupBankUntukUbah, menurut nomor top-up.
func (t Tx) TopupBankUntukUbahID(ctx context.Context, id int64) (TopupBank, error) {
	return pindaiTopup(t.tx.QueryRowContext(ctx, `SELECT `+kolomTopup+` FROM topup_bank WHERE id = $1 FOR UPDATE`, id))
}

// JumlahMasuk: jumlah posting positif satu jurnal (uang yang masuk ke buku penerima).
func (t Tx) JumlahMasuk(ctx context.Context, jurnal int64) (int64, error) {
	var n int64
	err := t.tx.QueryRowContext(ctx, `SELECT coalesce(sum(jumlah), 0) FROM posting WHERE jurnal_id = $1 AND jumlah > 0`, jurnal).Scan(&n)
	return n, err
}

// JurnalPembalik: nomor jurnal pembalik untuk jurnal ini bila sudah ada.
func (t Tx) JurnalPembalik(ctx context.Context, jurnal int64) (*int64, error) {
	var id int64
	err := t.tx.QueryRowContext(ctx, `SELECT id FROM jurnal WHERE membalik_jurnal_id = $1`, jurnal).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &id, err
}
