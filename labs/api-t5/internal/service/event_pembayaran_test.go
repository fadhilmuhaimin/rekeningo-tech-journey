package service

import (
	"context"
	"database/sql"
	"errors"
	"testing"

	"lab/apit5/internal/repo"
)

// Event pembayaran (lab t5-fanout, ADR 23 dan 51): satu baris outbox stream di transaction jurnal bayar.

type barisStream struct {
	akun, merchant, nominal int64
	jenis, status           string
}

func bacaStream(t *testing.T, db *sql.DB, jurnal int64) []barisStream {
	t.Helper()
	rows, err := db.Query(`
		SELECT akun_id, (payload->>'merchant')::bigint, (payload->>'nominal')::bigint, jenis, status
		FROM outbox WHERE jurnal_id = $1 AND tujuan = 'stream' ORDER BY id`, jurnal)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	var out []barisStream
	for rows.Next() {
		var b barisStream
		if err := rows.Scan(&b.akun, &b.merchant, &b.nominal, &b.jenis, &b.status); err != nil {
			t.Fatal(err)
		}
		out = append(out, b)
	}
	return out
}

func hitungOutbox(t *testing.T, db *sql.DB, kondisi string, arg ...any) int {
	t.Helper()
	var n int
	if err := db.QueryRow(`SELECT count(*) FROM outbox WHERE `+kondisi, arg...).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

// Bayar dengan event menulis tepat satu baris stream (kunci merchant di payload, akun_id pembayar) di samping baris push
// untuk warung. Tanpa event, Bayar tidak menulis baris stream: perilaku api-t5 tidak berubah.
func TestBayarMenulisSatuEventStreamDanBarisPushTetap(t *testing.T) {
	svc, db := siapkan(t)
	karyawan, _ := akunBaru(t, db, "karyawan", 100000)
	warung, _ := akunBaru(t, db, "warung", 0)

	id, _, err := svc.DenganEventPembayaran(true).Bayar(context.Background(), karyawan, warung, 25000, "")
	if err != nil {
		t.Fatal(err)
	}
	got := bacaStream(t, db, id)
	if len(got) != 1 || got[0] != (barisStream{akun: karyawan, merchant: warung, nominal: 25000, jenis: "bayar", status: "menunggu"}) {
		t.Fatalf("baris stream: %+v", got)
	}
	if n := hitungOutbox(t, db, `jurnal_id = $1 AND tujuan = 'push' AND akun_id = $2`, id, warung); n != 1 {
		t.Fatalf("baris push untuk warung %d, harus 1", n)
	}

	id2, _, err := svc.DenganEventPembayaran(false).Bayar(context.Background(), karyawan, warung, 5000, "")
	if err != nil {
		t.Fatal(err)
	}
	if got := bacaStream(t, db, id2); len(got) != 0 {
		t.Fatalf("tanpa event, Bayar menulis baris stream: %+v", got)
	}
}

// Event ditulis di transaction yang sama dengan jurnal: transaction yang dibatalkan sesudah event ditulis tidak
// meninggalkan jurnal maupun baris stream. Pembayaran yang ditolak (saldo kurang) juga tidak menulis event.
func TestEventPembayaranBatalBersamaJurnal(t *testing.T) {
	svc, db := siapkan(t)
	karyawan, _ := akunBaru(t, db, "karyawan", 10000)
	warung, _ := akunBaru(t, db, "warung", 0)
	var sebelum int
	if err := db.QueryRow(`SELECT count(*) FROM jurnal`).Scan(&sebelum); err != nil {
		t.Fatal(err)
	}
	batal := errors.New("batal sesudah event")
	var jurnal int64
	err := repo.Baru(db).DalamTx(context.Background(), func(tx repo.Tx) error {
		buku, err := tx.KunciBukuAkun(context.Background(), karyawan, warung)
		if err != nil {
			return err
		}
		jurnal, err = tx.CatatJurnal(context.Background(), "bayar", "tes batal", karyawan, nil,
			[]repo.Posting{{BukuID: buku[karyawan].ID, Jumlah: -1000}, {BukuID: buku[warung].ID, Jumlah: 1000}})
		if err != nil {
			return err
		}
		if err := tx.TulisEventPembayaran(context.Background(), jurnal, karyawan, warung, 1000); err != nil {
			return err
		}
		return batal
	})
	if !errors.Is(err, batal) {
		t.Fatalf("galat %v", err)
	}
	var sesudah int
	if err := db.QueryRow(`SELECT count(*) FROM jurnal`).Scan(&sesudah); err != nil {
		t.Fatal(err)
	}
	if sesudah != sebelum || len(bacaStream(t, db, jurnal)) != 0 {
		t.Fatalf("jurnal %d lalu %d, baris stream %d: transaction batal harus membuang keduanya", sebelum, sesudah, len(bacaStream(t, db, jurnal)))
	}

	// Saldo kurang: ditolak sebelum jurnal ditulis, jadi tidak ada event.
	if _, _, err := svc.DenganEventPembayaran(true).Bayar(context.Background(), karyawan, warung, 20000, ""); !errors.Is(err, ErrSaldoKurang) {
		t.Fatalf("galat %v, harus ErrSaldoKurang", err)
	}
	if n := hitungOutbox(t, db, `tujuan = 'stream' AND akun_id = $1`, karyawan); n != 0 {
		t.Fatalf("pembayaran ditolak meninggalkan %d baris stream", n)
	}
}
