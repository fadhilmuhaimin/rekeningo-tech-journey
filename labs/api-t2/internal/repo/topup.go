package repo

import (
	"context"
)

// AkunLewatEmailSemua: nomor dan jenis akun untuk setiap email, satu query.
func (r Repo) JenisAkunLewatEmail(ctx context.Context, email []string) (map[string]struct {
	ID    int64
	Jenis string
}, error) {
	hasil := map[string]struct {
		ID    int64
		Jenis string
	}{}
	rows, err := r.db.QueryContext(ctx, `SELECT email, id, jenis FROM akun WHERE email = ANY($1)`, email)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var e string
		var v struct {
			ID    int64
			Jenis string
		}
		if err := rows.Scan(&e, &v.ID, &v.Jenis); err != nil {
			return nil, err
		}
		hasil[e] = v
	}
	return hasil, rows.Err()
}

type BarisTopup struct {
	AkunID  int64
	Nominal int64
}

// --8<-- [start:topup]
// CatatTopup menulis satu baris catatan top-up: siapa, berapa, oleh admin mana, dan kenapa.
// Saldo diubah lewat TambahSaldo di transaction yang sama (service/topup.go).
func (t Tx) CatatTopup(ctx context.Context, b BarisTopup, adminID int64, keterangan string) error {
	_, err := t.tx.ExecContext(ctx,
		`INSERT INTO topup (akun_id, nominal, admin_id, keterangan) VALUES ($1, $2, $3, $4)`,
		b.AkunID, b.Nominal, adminID, keterangan)
	return err
}

// --8<-- [end:topup]
