package repo

import (
	"context"
	"encoding/json"
)

// --8<-- [start:event-pembayaran]
// TulisEventPembayaran menulis satu baris outbox bertujuan stream untuk satu pembayaran, di transaction yang sama
// dengan jurnalnya (lab t5-fanout, ADR 23 dan 51): COMMIT menyimpan keduanya, ROLLBACK membuang keduanya. Kunci event
// adalah merchant (di payload). akun_id baris ini pembayarnya, karena satu jurnal hanya boleh punya satu baris outbox
// per akun (index outbox_satu_per_jurnal) dan baris push untuk jurnal yang sama sudah memakai akun merchant.
func (t Tx) TulisEventPembayaran(ctx context.Context, jurnal, pembayar, merchant, nominal int64) error {
	payload, err := json.Marshal(map[string]int64{"jurnal": jurnal, "merchant": merchant, "pembayar": pembayar, "nominal": nominal})
	if err != nil {
		return err
	}
	_, err = t.tx.ExecContext(ctx, `
		INSERT INTO outbox (jurnal_id, akun_id, kelas, jenis, payload, tujuan)
		VALUES ($1, $2, $3, 'bayar', $4::jsonb, 'stream')`, jurnal, pembayar, KelasUang, string(payload))
	return err
}

// --8<-- [end:event-pembayaran]
