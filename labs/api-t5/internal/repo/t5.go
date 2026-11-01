package repo

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// Tahap 5 (lab-api-t5): laporan merchant dari primary (M40), pengumuman dan outbox stream (M45), jadwal dan angsuran
// cicilan (M48), dan buku tabungan. Semua tabelnya baru di migrasi 000025 dan 000026.

// TujuanStream: baris outbox yang diteruskan relay ke event streaming (lab t5-fanout). Worker push dan worker
// verifikasi tidak mengklaimnya, juga bila dijalankan tanpa daftar lajur.
const TujuanStream = "stream"

// LaporanHari: uang masuk ke buku satu merchant dalam satu hari.
type LaporanHari struct {
	Jumlah int64 `json:"jumlah_transaksi"`
	Total  int64 `json:"total"`
}

// --8<-- [start:laporan-hari]
// LaporanHariIni menjumlah posting masuk ke buku merchant dari [dari, sampai) langsung dari tabel posting di
// primary. Ini versi pertama M40: tidak ada ringkasan, replica, atau cache; setiap panggilan membaca posting.
// Batas `dibuat` dipakai pruning partisi (migrasi 000024): hanya partisi bulan yang memuat hari itu yang dibaca.
func (r Repo) LaporanHariIni(ctx context.Context, akun int64, dari, sampai time.Time) (LaporanHari, error) {
	var l LaporanHari
	err := r.db.QueryRowContext(ctx, `
		SELECT count(*), coalesce(sum(p.jumlah), 0)
		FROM buku b JOIN posting p ON p.buku_id = b.id
		WHERE b.akun_id = $1 AND b.jenis IN ('warung', 'merchant') AND p.jumlah > 0
		  AND p.dibuat >= $2 AND p.dibuat < $3`, akun, dari, sampai).Scan(&l.Jumlah, &l.Total)
	return l, err
}

// --8<-- [end:laporan-hari]

// --8<-- [start:pengumuman]
// BuatPengumuman menulis satu baris pengumuman dan satu baris outbox bertujuan stream dalam satu transaction.
// Bukan satu baris outbox per penerima (naskah M45): penerimanya dibaca consumer saat mengirim.
func (t Tx) BuatPengumuman(ctx context.Context, oleh int64, judul string) (id int64, penerima int, err error) {
	if err = t.tx.QueryRowContext(ctx, `SELECT count(DISTINCT akun_id) FROM perangkat`).Scan(&penerima); err != nil {
		return 0, 0, err
	}
	if err = t.tx.QueryRowContext(ctx, `
		INSERT INTO pengumuman (judul, jumlah_penerima, dibuat_oleh) VALUES ($1, $2, $3) RETURNING id`,
		judul, penerima, oleh).Scan(&id); err != nil {
		return 0, 0, err
	}
	_, err = t.tx.ExecContext(ctx, `
		INSERT INTO outbox (akun_id, kelas, jenis, payload, tujuan)
		VALUES ($1, $2, 'pengumuman', jsonb_build_object('pengumuman_id', $3::bigint, 'judul', $4::text), 'stream')`,
		oleh, KelasPromo, id, judul)
	return id, penerima, err
}

// --8<-- [end:pengumuman]

// Jadwal adalah satu jadwal cicilan atau tabungan milik service cicilan.
type Jadwal struct {
	ID             int64  `json:"id"`
	AkunID         int64  `json:"akun_id"`
	Jenis          string `json:"jenis"`
	MerchantAkunID *int64 `json:"merchant_akun_id"`
	JumlahPer      int64  `json:"jumlah_per_angsuran"`
	JumlahAngsuran int    `json:"jumlah_angsuran"`
	HariTagih      int    `json:"hari_tagih"`
	Status         string `json:"status"`
}

// Angsuran adalah satu angsuran dilihat dari jadwalnya.
type Angsuran struct {
	JadwalID       int64     `json:"jadwal_id"`
	Ke             int       `json:"ke"`
	JatuhTempo     time.Time `json:"jatuh_tempo"`
	Status         string    `json:"status"`
	JurnalID       *int64    `json:"jurnal_id"`
	AkunID         int64     `json:"-"`
	MerchantAkunID *int64    `json:"-"`
	Jenis          string    `json:"-"`
	Jumlah         int64     `json:"-"`
}

// BuatJadwal menulis jadwal dan semua angsurannya (status menunggu) dalam satu transaction. `pertama` adalah tanggal
// jatuh tempo angsuran ke-1; angsuran berikutnya jatuh pada tanggal yang sama bulan-bulan berikutnya (hari 1 sampai 28).
func (r Repo) BuatJadwal(ctx context.Context, akun int64, jenis string, merchant *int64, per int64, n, hari int, pertama time.Time) (int64, error) {
	var id int64
	err := r.DalamTx(ctx, func(t Tx) error {
		if err := t.tx.QueryRowContext(ctx, `
			INSERT INTO jadwal_cicilan (akun_id, jenis, merchant_akun_id, jumlah_per_angsuran, jumlah_angsuran, hari_tagih)
			VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, akun, jenis, merchant, per, n, hari).Scan(&id); err != nil {
			return err
		}
		_, err := t.tx.ExecContext(ctx, `
			INSERT INTO angsuran (jadwal_id, ke, jatuh_tempo)
			SELECT $1, k, ($2::date + make_interval(months => k - 1))::date FROM generate_series(1, $3) AS k`,
			id, pertama.Format("2006-01-02"), n)
		return err
	})
	return id, err
}

// Jadwal membaca satu jadwal beserta angsurannya, hanya milik akun itu.
func (r Repo) JadwalMilik(ctx context.Context, id, akun int64) (Jadwal, []Angsuran, error) {
	var j Jadwal
	err := r.db.QueryRowContext(ctx, `
		SELECT id, akun_id, jenis, merchant_akun_id, jumlah_per_angsuran, jumlah_angsuran, hari_tagih, status
		FROM jadwal_cicilan WHERE id = $1 AND akun_id = $2`, id, akun).
		Scan(&j.ID, &j.AkunID, &j.Jenis, &j.MerchantAkunID, &j.JumlahPer, &j.JumlahAngsuran, &j.HariTagih, &j.Status)
	if errors.Is(err, sql.ErrNoRows) {
		return j, nil, ErrTidakAda
	}
	if err != nil {
		return j, nil, err
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT jadwal_id, ke, jatuh_tempo, status, jurnal_id FROM angsuran WHERE jadwal_id = $1 ORDER BY ke`, id)
	if err != nil {
		return j, nil, err
	}
	defer rows.Close()
	var a []Angsuran
	for rows.Next() {
		var x Angsuran
		if err := rows.Scan(&x.JadwalID, &x.Ke, &x.JatuhTempo, &x.Status, &x.JurnalID); err != nil {
			return j, nil, err
		}
		a = append(a, x)
	}
	return j, a, rows.Err()
}

// AngsuranJatuhTempo: angsuran yang belum selesai (menunggu atau terjurnal) dengan jatuh tempo sampai tanggal itu, urut
// jadwal lalu angsuran; jadwal > 0 membatasi ke satu jadwal. Status `terjurnal` ikut: job yang berhenti sesudah jurnal ditulis melanjutkan dari sana.
func (r Repo) AngsuranJatuhTempo(ctx context.Context, sampai time.Time, jadwal int64) ([]Angsuran, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT a.jadwal_id, a.ke, a.jatuh_tempo, a.status, a.jurnal_id, j.akun_id, j.merchant_akun_id, j.jenis, j.jumlah_per_angsuran
		FROM angsuran a JOIN jadwal_cicilan j ON j.id = a.jadwal_id
		WHERE a.status IN ('menunggu', 'terjurnal') AND a.jatuh_tempo <= $1::date AND j.status = 'aktif'
		  AND ($2::bigint = 0 OR a.jadwal_id = $2)
		ORDER BY a.jadwal_id, a.ke`, sampai.Format("2006-01-02"), jadwal)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var hasil []Angsuran
	for rows.Next() {
		var x Angsuran
		if err := rows.Scan(&x.JadwalID, &x.Ke, &x.JatuhTempo, &x.Status, &x.JurnalID, &x.AkunID, &x.MerchantAkunID, &x.Jenis, &x.Jumlah); err != nil {
			return nil, err
		}
		hasil = append(hasil, x)
	}
	return hasil, rows.Err()
}

// TandaiAngsuran memajukan status satu angsuran. `dari` menjaga langkah: baris yang statusnya sudah lain tidak berubah
// (false), jadi job yang diulang atau dua job serentak tidak mundur atau melompat.
func (r Repo) TandaiAngsuran(ctx context.Context, jadwal int64, ke int, dari []string, ke2 string, jurnal *int64) (bool, error) {
	res, err := r.db.ExecContext(ctx, `
		UPDATE angsuran SET status = $4, jurnal_id = coalesce($5, jurnal_id)
		WHERE jadwal_id = $1 AND ke = $2 AND status = ANY($3)`, jadwal, ke, dari, ke2, jurnal)
	if err != nil {
		return false, err
	}
	n, err := res.RowsAffected()
	return n == 1, err
}

// BukuTabungan: buku tabungan milik akun, dibuat bila belum ada, dikunci sampai transaction selesai.
func (t Tx) BukuTabungan(ctx context.Context, akun int64) (Buku, error) {
	if _, err := t.tx.ExecContext(ctx, `
		INSERT INTO buku (akun_id, jenis) VALUES ($1, 'tabungan') ON CONFLICT (akun_id, jenis) DO NOTHING`, akun); err != nil {
		return Buku{}, err
	}
	var b Buku
	err := t.tx.QueryRowContext(ctx, `
		SELECT id, akun_id, jenis, saldo_cache, batas_saldo, batas_harian FROM buku
		WHERE akun_id = $1 AND jenis = 'tabungan' FOR UPDATE`, akun).Scan(&b.ID, &b.AkunID, &b.Jenis, &b.Saldo, &b.BatasSaldo, &b.BatasHarian)
	return b, err
}

// --8<-- [start:jurnal-referensi]
// CatatJurnalReferensi menulis jurnal berulang (angsuran, tabungan) dengan referensi bisnis yang unik (ADR 54).
// `INSERT ... ON CONFLICT (referensi) DO NOTHING` tidak menulis apa pun bila referensi sudah ada, dan jurnal yang
// sudah ada dikembalikan (baru = false). Berbeda dari Idempotency-Key, referensi tidak kedaluwarsa. Buku yang
// disentuh harus sudah dikunci pemanggil.
func (t Tx) CatatJurnalReferensi(ctx context.Context, jenis, keterangan string, oleh int64, referensi string, p []Posting) (id int64, baru bool, err error) {
	err = t.tx.QueryRowContext(ctx, `
		INSERT INTO jurnal (jenis, keterangan, dibuat_oleh, referensi) VALUES ($1, $2, $3, $4)
		ON CONFLICT (referensi) DO NOTHING RETURNING id`, jenis, keterangan, oleh, referensi).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		err = t.tx.QueryRowContext(ctx, `SELECT id FROM jurnal WHERE referensi = $1`, referensi).Scan(&id)
		return id, false, err
	}
	if err != nil {
		return 0, false, err
	}
	buku := make([]int64, len(p))
	jumlah := make([]int64, len(p))
	for i, x := range p {
		buku[i], jumlah[i] = x.BukuID, x.Jumlah
	}
	if _, err = t.tx.ExecContext(ctx, `
		INSERT INTO posting (jurnal_id, buku_id, jumlah)
		SELECT $1, u.buku, u.jumlah FROM unnest($2::bigint[], $3::bigint[]) WITH ORDINALITY AS u(buku, jumlah, n)
		ORDER BY u.n`, id, buku, jumlah); err != nil {
		return 0, false, err
	}
	_, err = t.tx.ExecContext(ctx, `
		UPDATE buku b SET saldo_cache = b.saldo_cache + p.jumlah
		FROM (SELECT buku_id, sum(jumlah) AS jumlah FROM posting WHERE jurnal_id = $1 GROUP BY buku_id) p
		WHERE b.id = p.buku_id`, id)
	return id, true, err
}

// --8<-- [end:jurnal-referensi]

// JurnalReferensi: jurnal yang sudah memakai referensi itu, bila ada.
func (t Tx) JurnalReferensi(ctx context.Context, referensi string) (id int64, ada bool, err error) {
	err = t.tx.QueryRowContext(ctx, `SELECT id FROM jurnal WHERE referensi = $1`, referensi).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, false, nil
	}
	return id, err == nil, err
}
