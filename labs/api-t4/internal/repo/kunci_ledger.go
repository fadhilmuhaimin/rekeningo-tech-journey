package repo

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// Idempotency-Key ke ledger (ADR 14, ADR 34, ADR 42), versi satu proses: key diklaim di dalam transaction yang
// sama dengan jurnalnya, jadi key dan jurnal COMMIT atau ROLLBACK bersama. Key = order_id untuk top-up bank dan
// id_penerbit untuk otorisasi kartu. Sesudah service pembayaran dipisah (ADR 37), panggilan ke ledger lewat API
// membawa key yang sama; tabelnya tetap kunci_idempotensi.

// KunciLedger mengklaim key. Mengembalikan baru=true bila key milik transaction ini (belum ada, atau sudah lewat
// `kedaluwarsa` pada waktu kini: key lama diperlakukan belum pernah ada, jadi hanya status baris domain, mis.
// topup_bank, yang masih menahan jurnal kedua). Bila key hidup sudah ada, jurnal pertamanya dikembalikan di
// `jurnal` (nil bila pemegangnya belum selesai; transaction lain menunggu di INSERT sampai pemegang COMMIT).
func (t Tx) KunciLedger(ctx context.Context, kunci string, akun int64, hash string, kini, kedaluwarsa time.Time) (jurnal *int64, baru bool, err error) {
	h, err := t.tx.ExecContext(ctx, `
		INSERT INTO kunci_idempotensi (kunci, akun_id, hash_permintaan, status, kedaluwarsa)
		VALUES ($1, $2, $3, 'diproses', $5)
		ON CONFLICT (kunci) DO UPDATE
		   SET akun_id = EXCLUDED.akun_id, hash_permintaan = EXCLUDED.hash_permintaan, status = 'diproses',
		       respons = NULL, jurnal_id = NULL, kedaluwarsa = EXCLUDED.kedaluwarsa
		 WHERE kunci_idempotensi.kedaluwarsa <= $4`, kunci, akun, hash, kini, kedaluwarsa)
	if err != nil {
		return nil, false, err
	}
	if n, _ := h.RowsAffected(); n == 1 {
		return nil, true, nil
	}
	err = t.tx.QueryRowContext(ctx, `SELECT jurnal_id FROM kunci_idempotensi WHERE kunci = $1`, kunci).Scan(&jurnal)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, false, errors.New("key hilang di antara dua perintah: ulangi permintaan")
	}
	return jurnal, false, err
}

// SelesaiKunciLedger mengikat key yang diklaim transaction ini ke jurnalnya.
func (t Tx) SelesaiKunciLedger(ctx context.Context, kunci string, jurnal int64) error {
	_, err := t.tx.ExecContext(ctx, `
		UPDATE kunci_idempotensi SET status = 'selesai', jurnal_id = $2, respons = jsonb_build_object('jurnal', $2::bigint)
		WHERE kunci = $1 AND status = 'diproses'`, kunci, jurnal)
	return err
}
