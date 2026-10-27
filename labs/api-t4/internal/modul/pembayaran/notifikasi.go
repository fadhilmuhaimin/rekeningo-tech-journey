package pembayaran

import (
	"context"
	"database/sql"
	"fmt"
)

// Teks notifikasi top-up (M32). Dua versi hidup berdampingan hanya di lab supaya perbedaannya bisa direkam.

// Penanya dipenuhi *sql.DB dan *sql.Tx.
type Penanya interface {
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

// PenyediaNama adalah kontrak yang diminta modul pembayaran dari modul akun; modul akun yang mengisinya.
type PenyediaNama interface {
	NamaTampil(ctx context.Context, id int64) (string, error)
}

// TeksTopupLangsung adalah kode modul pembayaran seperti pada M32 (satu schema, satu role, tanpa batas): nama
// penerima dibaca dengan SQL langsung ke tabel akun milik modul lain. Tes modul ini lolos dengan data tiruan, dan
// kode ini baru gagal di lingkungan yang skemanya sudah berubah.
func TeksTopupLangsung(ctx context.Context, q Penanya, akunID, jumlah int64) (string, error) {
	var nama string
	if err := q.QueryRowContext(ctx, `SELECT nama FROM akun WHERE id = $1`, akunID).Scan(&nama); err != nil {
		return "", err
	}
	return teks(nama, jumlah), nil
}

// TeksTopup adalah versi dengan batas modul: nama datang dari kontrak modul akun, tanpa SQL ke tabelnya.
func TeksTopup(ctx context.Context, akun PenyediaNama, akunID, jumlah int64) (string, error) {
	nama, err := akun.NamaTampil(ctx, akunID)
	if err != nil {
		return "", err
	}
	return teks(nama, jumlah), nil
}

func teks(nama string, jumlah int64) string {
	return fmt.Sprintf("Top-up Rp%d masuk ke %s", jumlah, nama)
}
