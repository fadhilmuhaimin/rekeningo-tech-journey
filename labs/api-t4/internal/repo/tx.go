package repo

import (
	"context"
	"database/sql"
)

// --8<-- [start:tx]
// Tx adalah satu transaction database yang dibuka atas permintaan service (ADR 5).
// Service memutuskan perubahan mana yang harus terjadi bersama; repo hanya menyediakan SQL-nya.
type Tx struct{ tx *sql.Tx }

// DalamTx menjalankan fn dalam satu transaction: COMMIT kalau fn mengembalikan nil, ROLLBACK kalau tidak.
func (r Repo) DalamTx(ctx context.Context, fn func(Tx) error) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() // tidak berpengaruh setelah Commit berhasil
	if err := fn(Tx{tx}); err != nil {
		return err
	}
	return tx.Commit()
}

// --8<-- [end:tx]
