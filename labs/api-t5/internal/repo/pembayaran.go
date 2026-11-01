package repo

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// Top-up dari bank lewat gateway (M29, M30, ADR 34, ADR 35). Satu top-up satu baris topup_bank; tiap kabar dari
// gateway satu baris webhook_event; selisih dengan laporan gateway satu baris insiden_rekon.

type TopupBank struct {
	ID              int64     `json:"id"`
	AkunID          int64     `json:"-"`
	OrderID         string    `json:"order_id"`
	Jumlah          int64     `json:"jumlah"`
	Status          string    `json:"status"`
	TujuanBayar     *string   `json:"tujuan_bayar,omitempty"`
	Dibuat          time.Time `json:"dibuat"`
	KedaluwarsaPada time.Time `json:"kedaluwarsa_pada"`
	JurnalID        *int64    `json:"jurnal_id,omitempty"`
}

const kolomTopup = `id, akun_id, order_id, jumlah, status, tujuan_bayar, dibuat, kedaluwarsa_pada, jurnal_id`

func pindaiTopup(row interface{ Scan(...any) error }) (TopupBank, error) {
	var t TopupBank
	err := row.Scan(&t.ID, &t.AkunID, &t.OrderID, &t.Jumlah, &t.Status, &t.TujuanBayar, &t.Dibuat, &t.KedaluwarsaPada, &t.JurnalID)
	if errors.Is(err, sql.ErrNoRows) {
		return t, ErrTidakAda
	}
	return t, err
}

// BuatTopupBank menulis baris `menunggu` SEBELUM gateway dipanggil: panggilan jaringan tidak ada di dalam
// transaction (ADR 22), dan baris itu yang membuat order_id dikenal bila webhook datang lebih dulu dari jawaban.
func (r Repo) BuatTopupBank(ctx context.Context, akun int64, orderID string, jumlah int64, kedaluwarsa time.Time) (int64, error) {
	var id int64
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO topup_bank (akun_id, order_id, jumlah, kedaluwarsa_pada) VALUES ($1, $2, $3, $4) RETURNING id`,
		akun, orderID, jumlah, kedaluwarsa).Scan(&id)
	return id, err
}

func (r Repo) TopupBank(ctx context.Context, id int64) (TopupBank, error) {
	return pindaiTopup(r.db.QueryRowContext(ctx, `SELECT `+kolomTopup+` FROM topup_bank WHERE id = $1`, id))
}

func (r Repo) TopupBankLewatOrder(ctx context.Context, orderID string) (TopupBank, error) {
	return pindaiTopup(r.db.QueryRowContext(ctx, `SELECT `+kolomTopup+` FROM topup_bank WHERE order_id = $1`, orderID))
}

// TopupBankUntukUbah membaca baris top-up dengan baris dikunci (FOR UPDATE) di dalam transaction.
func (t Tx) TopupBankUntukUbah(ctx context.Context, orderID string) (TopupBank, error) {
	return pindaiTopup(t.tx.QueryRowContext(ctx, `SELECT `+kolomTopup+` FROM topup_bank WHERE order_id = $1 FOR UPDATE`, orderID))
}

// AturTujuanBayar menyimpan nomor tujuan dari gateway.
func (r Repo) AturTujuanBayar(ctx context.Context, id int64, tujuan string) error {
	_, err := r.db.ExecContext(ctx, `UPDATE topup_bank SET tujuan_bayar = $2 WHERE id = $1`, id, tujuan)
	return err
}

// UbahStatusTopup mengubah status hanya bila status sekarang ada di `dari` (status hanya maju; ADR 34). Mengembalikan
// apakah ada baris yang berubah. Dipanggil di luar transaction jurnal untuk status yang tidak menggerakkan uang.
func (r Repo) UbahStatusTopup(ctx context.Context, id int64, dari []string, ke string) (bool, error) {
	h, err := r.db.ExecContext(ctx, `UPDATE topup_bank SET status = $3 WHERE id = $1 AND status = ANY($2)`, id, dari, ke)
	if err != nil {
		return false, err
	}
	n, _ := h.RowsAffected()
	return n == 1, nil
}

// TopupBelumSelesai: top-up menunggu atau tidak pasti yang dibuat sebelum `sebelum`, untuk job cek status (ADR 35).
func (r Repo) TopupBelumSelesai(ctx context.Context, sebelum time.Time) ([]TopupBank, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT `+kolomTopup+` FROM topup_bank
		WHERE status IN ('menunggu', 'tidak_pasti') AND dibuat < $1 ORDER BY id`, sebelum)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []TopupBank
	for rows.Next() {
		t, err := pindaiTopup(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

// --- webhook_event ---

// CatatEvent menulis satu event dengan hasil sementara `diproses`. Kunci utama event_id adalah penahan event ganda:
// nol baris berarti event ini sudah pernah tercatat. Dipanggil di transaction yang sama dengan jurnalnya, jadi
// event dan jurnal COMMIT atau ROLLBACK bersama (ADR 34).
func (t Tx) CatatEvent(ctx context.Context, eventID, jenis string) (baru bool, err error) {
	h, err := t.tx.ExecContext(ctx, `
		INSERT INTO webhook_event (event_id, jenis, hasil) VALUES ($1, $2, 'diproses') ON CONFLICT (event_id) DO NOTHING`,
		eventID, jenis)
	if err != nil {
		return false, err
	}
	n, _ := h.RowsAffected()
	return n == 1, nil
}

// SelesaiEvent menulis hasil akhir pemrosesan satu event.
func (t Tx) SelesaiEvent(ctx context.Context, eventID string, topup *int64, hasil string, jurnal *int64) error {
	_, err := t.tx.ExecContext(ctx, `
		UPDATE webhook_event SET topup_id = $2, hasil = $3, jurnal_id = $4 WHERE event_id = $1`, eventID, topup, hasil, jurnal)
	return err
}

// --- ledger: top-up ---

// UbahTopupDibayar menandai top-up dibayar dan mengikatnya ke jurnal. dari: status yang boleh dilewati; kosong
// = tanpa syarat (hanya mode rentan dan lapisan yang sengaja dimatikan di lab).
func (t Tx) UbahTopupDibayar(ctx context.Context, id, jurnal int64, dari []string) (bool, error) {
	q := `UPDATE topup_bank SET status = 'dibayar', jurnal_id = $2 WHERE id = $1`
	args := []any{id, jurnal}
	if dari != nil {
		q += ` AND status = ANY($3)`
		args = append(args, dari)
	}
	h, err := t.tx.ExecContext(ctx, q, args...)
	if err != nil {
		return false, err
	}
	n, _ := h.RowsAffected()
	return n == 1, nil
}

// UbahStatusTopupTx: sama dengan UbahStatusTopup di dalam transaction.
func (t Tx) UbahStatusTopupTx(ctx context.Context, id int64, dari []string, ke string) (bool, error) {
	h, err := t.tx.ExecContext(ctx, `UPDATE topup_bank SET status = $3 WHERE id = $1 AND status = ANY($2)`, id, dari, ke)
	if err != nil {
		return false, err
	}
	n, _ := h.RowsAffected()
	return n == 1, nil
}

// UbahStatusTanpaSyarat: versi pertama handler webhook (M29): status diganti apa adanya, bisa mundur.
func (t Tx) UbahStatusTanpaSyarat(ctx context.Context, orderID, ke string) error {
	_, err := t.tx.ExecContext(ctx, `UPDATE topup_bank SET status = $2 WHERE order_id = $1`, orderID, ke)
	return err
}

// AkunTingkat membaca tingkat dan status akun di dalam transaction (sesudah buku dikunci).
func (t Tx) AkunTingkat(ctx context.Context, id int64) (tingkat, status string, err error) {
	err = t.tx.QueryRowContext(ctx, `SELECT tingkat, status FROM akun WHERE id = $1`, id).Scan(&tingkat, &status)
	return
}

// --- rekonsiliasi ---

// BarisLedgerTopup: satu top-up berstatus dibayar menurut ledger, untuk dibandingkan dengan laporan settlement.
type BarisLedgerTopup struct {
	OrderID string
	TopupID int64
	Jumlah  int64 // jumlah di topup_bank
	Jurnal  int64 // jumlah posting positif di jurnal yang terikat; 0 bila tidak ada jurnal
	Dibayar bool
}

// LedgerTopupTanggal: semua top-up bank yang dijurnal pada tanggal itu (zona Asia/Jakarta), dan juga yang
// disebut `orders` (order di laporan gateway) walau tidak punya jurnal.
func (r Repo) LedgerTopupTanggal(ctx context.Context, tanggal string, orders []string) (map[string]BarisLedgerTopup, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT t.order_id, t.id, t.jumlah, t.status = 'dibayar',
		       coalesce((SELECT sum(p.jumlah) FROM posting p WHERE p.jurnal_id = t.jurnal_id AND p.jumlah > 0), 0)
		FROM topup_bank t LEFT JOIN jurnal j ON j.id = t.jurnal_id
		WHERE t.order_id = ANY($2)
		   OR (j.id IS NOT NULL AND (j.dibuat AT TIME ZONE 'Asia/Jakarta')::date = $1::date)`, tanggal, orders)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]BarisLedgerTopup{}
	for rows.Next() {
		var b BarisLedgerTopup
		if err := rows.Scan(&b.OrderID, &b.TopupID, &b.Jumlah, &b.Dibayar, &b.Jurnal); err != nil {
			return nil, err
		}
		out[b.OrderID] = b
	}
	return out, rows.Err()
}

// CatatInsiden menulis satu insiden rekonsiliasi; (tanggal, order_id, jenis) unik, jadi job aman dijalankan dua kali.
func (r Repo) CatatInsiden(ctx context.Context, tanggal, orderID string, topup *int64, jenis string, selisih int64) (bool, error) {
	h, err := r.db.ExecContext(ctx, `
		INSERT INTO insiden_rekon (tanggal, order_id, topup_id, jenis, selisih) VALUES ($1::date, $2, $3, $4, $5)
		ON CONFLICT (tanggal, order_id, jenis) DO NOTHING`, tanggal, orderID, topup, jenis, selisih)
	if err != nil {
		return false, err
	}
	n, _ := h.RowsAffected()
	return n == 1, nil
}
