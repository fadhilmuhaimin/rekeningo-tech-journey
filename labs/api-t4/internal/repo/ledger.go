package repo

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// Buku adalah satu tempat uang dicatat. Buku karyawan dan warung punya pemilik (AkunID); buku sistem tidak.
type Buku struct {
	ID          int64
	AkunID      int64 // 0 untuk buku sistem
	Jenis       string
	Saldo       int64 // saldo_cache; source of truth = jumlah posting
	BatasSaldo  *int64
	BatasHarian *int64
}

// Posting adalah satu baris uang di satu buku: negatif keluar, positif masuk.
type Posting struct {
	BukuID int64
	Jumlah int64
}

// --8<-- [start:kunci-buku]
// KunciBukuAkun mengunci buku milik akun-akun ini sampai transaction selesai (ADR 13, M9).
// Urutan lock selalu menurut id buku, jadi dua transfer berlawanan arah (A ke B dan B ke A) tidak saling
// menunggu selamanya (deadlock). Transaction lain yang mengunci buku yang sama menunggu di sini.
func (t Tx) KunciBukuAkun(ctx context.Context, akun ...int64) (map[int64]Buku, error) {
	rows, err := t.tx.QueryContext(ctx, `
		SELECT id, akun_id, jenis, saldo_cache, batas_saldo, batas_harian
		FROM buku WHERE akun_id = ANY($1)
		ORDER BY id
		FOR UPDATE`, akun)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	hasil := map[int64]Buku{}
	for rows.Next() {
		var b Buku
		if err := rows.Scan(&b.ID, &b.AkunID, &b.Jenis, &b.Saldo, &b.BatasSaldo, &b.BatasHarian); err != nil {
			return nil, err
		}
		hasil[b.AkunID] = b
	}
	return hasil, rows.Err()
}

// --8<-- [end:kunci-buku]

// BukuSistem: id buku sistem satu jenis (tunjangan, kas_pencairan, pembuka, selisih).
func (t Tx) BukuSistem(ctx context.Context, jenis string) (int64, error) {
	var id int64
	err := t.tx.QueryRowContext(ctx, `SELECT id FROM buku WHERE akun_id IS NULL AND jenis = $1`, jenis).Scan(&id)
	return id, err
}

// --8<-- [start:keluar-hari-ini]
// TransferKeluarHariIni: jumlah transfer keluar dari satu buku sejak pukul 00.00 WIB hari ini.
// Dipanggil sesudah KunciBukuAkun, jadi transfer lain dari buku yang sama tidak bisa menyelip di antaranya.
func (t Tx) TransferKeluarHariIni(ctx context.Context, buku int64) (int64, error) {
	var n int64
	err := t.tx.QueryRowContext(ctx, `
		SELECT coalesce(-sum(p.jumlah), 0)
		FROM posting p JOIN jurnal j ON j.id = p.jurnal_id
		WHERE p.buku_id = $1 AND p.jumlah < 0 AND j.jenis = 'transfer'
		  AND p.dibuat >= date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta'`,
		buku).Scan(&n)
	return n, err
}

// --8<-- [end:keluar-hari-ini]

// --8<-- [start:catat-jurnal]
// CatatJurnal menulis satu jurnal dengan posting-nya, lalu memperbarui saldo_cache buku yang disentuh,
// semuanya di transaction yang sama (keputusan 402). Keseimbangan jurnal dan saldo karyawan diperiksa
// database saat COMMIT (keputusan 401).
func (t Tx) CatatJurnal(ctx context.Context, jenis, keterangan string, oleh int64, membalik *int64, p []Posting) (int64, error) {
	var id int64
	err := t.tx.QueryRowContext(ctx, `
		INSERT INTO jurnal (jenis, keterangan, membalik_jurnal_id, dibuat_oleh)
		VALUES ($1, $2, $3, $4) RETURNING id`, jenis, keterangan, membalik, oleh).Scan(&id)
	if err != nil {
		return 0, err
	}
	buku := make([]int64, len(p))
	jumlah := make([]int64, len(p))
	for i, x := range p {
		buku[i], jumlah[i] = x.BukuID, x.Jumlah
	}
	if _, err := t.tx.ExecContext(ctx, `
		INSERT INTO posting (jurnal_id, buku_id, jumlah)
		SELECT $1, u.buku, u.jumlah FROM unnest($2::bigint[], $3::bigint[]) WITH ORDINALITY AS u(buku, jumlah, n)
		ORDER BY u.n`, id, buku, jumlah); err != nil {
		return 0, err
	}
	// Dijumlah per buku dulu: UPDATE ... FROM yang menemukan dua baris untuk satu buku hanya memakai satu.
	_, err = t.tx.ExecContext(ctx, `
		UPDATE buku b SET saldo_cache = b.saldo_cache + p.jumlah
		FROM (SELECT buku_id, sum(jumlah) AS jumlah FROM posting WHERE jurnal_id = $1 GROUP BY buku_id) p
		WHERE b.id = p.buku_id`, id)
	return id, err
}

// --8<-- [end:catat-jurnal]

// Pindahan adalah satu jurnal bayar atau transfer dilihat dari dua pemiliknya, untuk GET /transfers/{id}.
type Pindahan struct {
	ID      int64     `json:"id"`
	Jenis   string    `json:"jenis"`
	Dari    int64     `json:"dari"`
	Ke      int64     `json:"ke"`
	Jumlah  int64     `json:"jumlah"`
	Nominal int64     `json:"nominal"`
	Waktu   time.Time `json:"waktu"`
}

// Pindahan: jurnal bayar atau transfer. Jurnal jenis lain dijawab tidak ada.
func (r Repo) Pindahan(ctx context.Context, id int64) (Pindahan, error) {
	var x Pindahan
	err := r.db.QueryRowContext(ctx, `
		SELECT j.id, j.jenis, bd.akun_id, bk.akun_id, pk.jumlah, j.dibuat
		FROM jurnal j
		JOIN posting pd ON pd.jurnal_id = j.id AND pd.jumlah < 0 JOIN buku bd ON bd.id = pd.buku_id
		JOIN posting pk ON pk.jurnal_id = j.id AND pk.jumlah > 0 JOIN buku bk ON bk.id = pk.buku_id
		WHERE j.id = $1 AND j.jenis IN ('bayar', 'transfer')`, id).
		Scan(&x.ID, &x.Jenis, &x.Dari, &x.Ke, &x.Jumlah, &x.Waktu)
	if errors.Is(err, sql.ErrNoRows) {
		return x, ErrTidakAda
	}
	x.Nominal = x.Jumlah
	return x, err
}

// JurnalAsal: posting jurnal yang akan dibalik, dan apakah sudah pernah dibalik.
func (r Repo) JurnalAsal(ctx context.Context, id int64) (jenis string, p []Posting, sudahDibalik bool, err error) {
	err = r.db.QueryRowContext(ctx, `
		SELECT jenis, EXISTS (SELECT 1 FROM jurnal WHERE membalik_jurnal_id = $1) FROM jurnal WHERE id = $1`, id).
		Scan(&jenis, &sudahDibalik)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil, false, ErrTidakAda
	}
	if err != nil {
		return "", nil, false, err
	}
	rows, err := r.db.QueryContext(ctx, `SELECT buku_id, jumlah FROM posting WHERE jurnal_id = $1 ORDER BY id`, id)
	if err != nil {
		return "", nil, false, err
	}
	defer rows.Close()
	for rows.Next() {
		var x Posting
		if err := rows.Scan(&x.BukuID, &x.Jumlah); err != nil {
			return "", nil, false, err
		}
		p = append(p, x)
	}
	return jenis, p, sudahDibalik, rows.Err()
}

// KunciBukuID mengunci buku menurut id (urutan id, sama dengan KunciBukuAkun) dan mengembalikan jenis
// serta saldo_cache-nya.
func (t Tx) KunciBukuID(ctx context.Context, id ...int64) (map[int64]Buku, error) {
	rows, err := t.tx.QueryContext(ctx, `
		SELECT id, coalesce(akun_id, 0), jenis, saldo_cache FROM buku WHERE id = ANY($1) ORDER BY id FOR UPDATE`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	hasil := map[int64]Buku{}
	for rows.Next() {
		var b Buku
		if err := rows.Scan(&b.ID, &b.AkunID, &b.Jenis, &b.Saldo); err != nil {
			return nil, err
		}
		hasil[b.ID] = b
	}
	return hasil, rows.Err()
}

// SelisihCache adalah satu buku yang saldo_cache-nya berbeda dari jumlah posting.
type SelisihCache struct {
	BukuID  int64
	Jenis   string
	Nama    string
	Cache   int64
	Posting int64
}

// --8<-- [start:cek-cache]
// CekCache membandingkan saldo_cache setiap buku dengan jumlah posting-nya (dijalankan tiap malam).
func (r Repo) CekCache(ctx context.Context) (diperiksa int, beda []SelisihCache, err error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT b.id, b.jenis, coalesce(a.nama, ''), b.saldo_cache, coalesce(sum(p.jumlah), 0)
		FROM buku b LEFT JOIN akun a ON a.id = b.akun_id LEFT JOIN posting p ON p.buku_id = b.id
		GROUP BY b.id, a.nama
		ORDER BY b.id`)
	if err != nil {
		return 0, nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var s SelisihCache
		if err := rows.Scan(&s.BukuID, &s.Jenis, &s.Nama, &s.Cache, &s.Posting); err != nil {
			return 0, nil, err
		}
		diperiksa++
		if s.Cache != s.Posting {
			beda = append(beda, s)
		}
	}
	return diperiksa, beda, rows.Err()
}

// --8<-- [end:cek-cache]
