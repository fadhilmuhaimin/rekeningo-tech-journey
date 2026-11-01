package repo

import "context"

// IsiKunci membaca akun dan hash permintaan yang diklaim satu Idempotency-Key ledger. API ledger memakainya untuk
// menolak key yang dipakai ulang oleh permintaan lain (ADR 37): ulangan yang sama mendapat jurnal pertama,
// permintaan berbeda dengan key yang sama ditolak.
func (t Tx) IsiKunci(ctx context.Context, kunci string) (akun int64, hash string, err error) {
	err = t.tx.QueryRowContext(ctx, `SELECT akun_id, hash_permintaan FROM kunci_idempotensi WHERE kunci = $1`, kunci).Scan(&akun, &hash)
	return
}
