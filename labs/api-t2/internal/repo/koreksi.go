package repo

import "context"

// --8<-- [start:koreksi]
// UbahSaldoKoreksi dan CatatKoreksi hanya ada sebagai method Tx: saldo tidak pernah dikoreksi tanpa barisnya.
func (t Tx) UbahSaldoKoreksi(ctx context.Context, akun, jumlah int64) (saldoBaru int64, err error) {
	err = t.tx.QueryRowContext(ctx, `UPDATE akun SET saldo = saldo + $1 WHERE id = $2 RETURNING saldo`,
		jumlah, akun).Scan(&saldoBaru)
	return saldoBaru, err
}

func (t Tx) CatatKoreksi(ctx context.Context, akun, jumlah int64, alasan string, adminID int64) (id int64, err error) {
	err = t.tx.QueryRowContext(ctx,
		`INSERT INTO koreksi (akun_id, jumlah, alasan, admin_id) VALUES ($1, $2, $3, $4) RETURNING id`,
		akun, jumlah, alasan, adminID).Scan(&id)
	return id, err
}

// --8<-- [end:koreksi]
