package repo

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// Menu adalah satu produk warung dilihat karyawan: harga dasar dan harga sesudah promo kota yang sedang berlaku.
type Menu struct {
	ID           int64  `json:"id"`
	Nama         string `json:"nama"`
	Harga        int64  `json:"harga"`
	HargaEfektif int64  `json:"harga_efektif"`
	Stok         int    `json:"stok"`
	Versi        int    `json:"versi"`
}

// WarungMenu adalah satu warung dengan menunya.
type WarungMenu struct {
	ID   int64  `json:"id"`
	Nama string `json:"nama"`
	Menu []Menu `json:"menu"`
}

// --8<-- [start:katalog]
// Katalog: warung dan menu aktif satu kota, dengan harga efektif = harga dikurangi potongan promo terbesar yang
// berlaku sekarang di kota itu (dibulatkan ke bawah, rupiah integer). Bila warung != nil, hanya satu warung.
// Ini jawaban baca: boleh di-cache dan boleh basi sebentar. Harga yang ditagih dihitung ulang dari database di
// Pesan (ADR 28).
func (r Repo) Katalog(ctx context.Context, kota int64, warung *int64) ([]WarungMenu, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT a.id, a.nama, p.id, p.nama, p.harga, p.harga * (100 - coalesce(pr.persen, 0)) / 100, p.stok, p.versi
		FROM akun a
		JOIN produk p ON p.akun_id = a.id AND p.aktif
		LEFT JOIN LATERAL (SELECT max(potongan_persen) AS persen FROM promo
		                   WHERE kota_id = a.kota_id AND mulai <= now() AND selesai > now()) pr ON true
		WHERE a.jenis = 'warung' AND a.kota_id = $1 AND ($2::bigint IS NULL OR a.id = $2)
		ORDER BY a.id, p.id`, kota, warung)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []WarungMenu{}
	for rows.Next() {
		var wid int64
		var wnama string
		var m Menu
		if err := rows.Scan(&wid, &wnama, &m.ID, &m.Nama, &m.Harga, &m.HargaEfektif, &m.Stok, &m.Versi); err != nil {
			return nil, err
		}
		if len(out) == 0 || out[len(out)-1].ID != wid {
			out = append(out, WarungMenu{ID: wid, Nama: wnama})
		}
		out[len(out)-1].Menu = append(out[len(out)-1].Menu, m)
	}
	return out, rows.Err()
}

// --8<-- [end:katalog]

// Produk adalah isi satu baris produk yang dikunci untuk pembayaran.
type Produk struct {
	ID       int64
	AkunID   int64
	KotaID   *int64
	Nama     string
	Harga    int64
	Stok     int
	Versi    int
	Aktif    bool
	Potongan int // persen promo terbesar yang berlaku sekarang di kota warung
}

// PemilikProduk: akun warung dan kota pemilik produk, dibaca sebelum transaction pembayaran dibuka.
func (r Repo) PemilikProduk(ctx context.Context, id int64) (akun int64, kota *int64, err error) {
	err = r.db.QueryRowContext(ctx,
		`SELECT p.akun_id, a.kota_id FROM produk p JOIN akun a ON a.id = p.akun_id WHERE p.id = $1`, id).Scan(&akun, &kota)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil, ErrTidakAda
	}
	return akun, kota, err
}

// --8<-- [start:kunci-produk]
// KunciProduk mengunci baris produk sampai transaction selesai dan membaca harga, stok, dan promo yang berlaku
// SEKARANG, dari database. Dipanggil sesudah KunciBukuAkun (urutan lock tetap: buku dulu, lalu produk).
func (t Tx) KunciProduk(ctx context.Context, id int64) (Produk, error) {
	var p Produk
	err := t.tx.QueryRowContext(ctx, `
		SELECT p.id, p.akun_id, a.kota_id, p.nama, p.harga, p.stok, p.versi, p.aktif,
		       (SELECT coalesce(max(potongan_persen), 0) FROM promo
		        WHERE kota_id = a.kota_id AND mulai <= now() AND selesai > now())
		FROM produk p JOIN akun a ON a.id = p.akun_id WHERE p.id = $1 FOR UPDATE OF p`, id).
		Scan(&p.ID, &p.AkunID, &p.KotaID, &p.Nama, &p.Harga, &p.Stok, &p.Versi, &p.Aktif, &p.Potongan)
	if errors.Is(err, sql.ErrNoRows) {
		return p, ErrTidakAda
	}
	return p, err
}

// --8<-- [end:kunci-produk]

// KurangiStok mengurangi stok yang sudah dikunci dan menaikkan versi (pembeli juga mengubah baris).
func (t Tx) KurangiStok(ctx context.Context, id int64, porsi int) error {
	_, err := t.tx.ExecContext(ctx,
		`UPDATE produk SET stok = stok - $2, versi = versi + 1, diubah = now() WHERE id = $1`, id, porsi)
	return err
}

// StokProduk adalah keadaan terkini satu produk, untuk jawaban konflik.
type StokProduk struct {
	ID    int64 `json:"id"`
	Harga int64 `json:"harga"`
	Stok  int   `json:"stok"`
	Versi int   `json:"versi"`
}

// --8<-- [start:ubah-produk]
// UbahProduk mengubah harga dan atau stok bila dan hanya bila versi baris masih sama dengan yang dilihat pengubah
// (optimistic lock, ADR 29). Berhasil: versi naik satu. Versi sudah berbeda: tidak ada yang berubah, dan keadaan
// terkini dikembalikan dengan ok=false supaya pengubah memilih, bukan menimpa. Produk milik akun lain sama dengan
// tidak ada.
func (r Repo) UbahProduk(ctx context.Context, id, akun int64, harga *int64, stok *int, versi int) (hasil StokProduk, ok bool, err error) {
	err = r.db.QueryRowContext(ctx, `
		UPDATE produk SET harga = coalesce($3, harga), stok = coalesce($4, stok), versi = versi + 1, diubah = now()
		WHERE id = $1 AND akun_id = $2 AND versi = $5
		RETURNING id, harga, stok, versi`, id, akun, harga, stok, versi).Scan(&hasil.ID, &hasil.Harga, &hasil.Stok, &hasil.Versi)
	if err == nil {
		return hasil, true, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return hasil, false, err
	}
	err = r.db.QueryRowContext(ctx, `SELECT id, harga, stok, versi FROM produk WHERE id = $1 AND akun_id = $2`, id, akun).
		Scan(&hasil.ID, &hasil.Harga, &hasil.Stok, &hasil.Versi)
	if errors.Is(err, sql.ErrNoRows) {
		return hasil, false, ErrTidakAda
	}
	return hasil, false, err
}

// --8<-- [end:ubah-produk]

// Promo adalah satu promo per kota.
type Promo struct {
	ID             int64     `json:"id"`
	KotaID         int64     `json:"kota_id"`
	Judul          string    `json:"judul"`
	PotonganPersen int       `json:"potongan_persen"`
	Mulai          time.Time `json:"mulai"`
	Selesai        time.Time `json:"selesai"`
}

// BuatPromo menulis satu promo di transaction pemanggil (supaya pengumumannya ikut atomik).
func (t Tx) BuatPromo(ctx context.Context, kota, oleh int64, judul string, persen int, mulai, selesai time.Time) (int64, error) {
	var id int64
	err := t.tx.QueryRowContext(ctx, `
		INSERT INTO promo (kota_id, dibuat_oleh, judul, potongan_persen, mulai, selesai)
		VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, kota, oleh, judul, persen, mulai, selesai).Scan(&id)
	return id, err
}

// DaftarPromo: promo satu kota yang belum selesai, paling awal dulu.
func (r Repo) DaftarPromo(ctx context.Context, kota int64) ([]Promo, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, kota_id, judul, potongan_persen, mulai, selesai FROM promo
		WHERE kota_id = $1 AND selesai > now() ORDER BY mulai, id`, kota)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Promo{}
	for rows.Next() {
		var p Promo
		if err := rows.Scan(&p.ID, &p.KotaID, &p.Judul, &p.PotonganPersen, &p.Mulai, &p.Selesai); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// OperasiSinkron adalah satu operasi dari queue offline.
type OperasiSinkron struct {
	Kunci      string
	Perangkat  int64
	Produk     int64
	Jenis      string
	Nilai      int64
	VersiDasar int
	DibuatHP   time.Time
}

// --8<-- [start:sinkron]
// ErrKunciBeda: kunci sinkron sudah dipakai untuk operasi lain (produk, jenis, nilai, atau versi dasar berbeda).
var ErrKunciBeda = errors.New("kunci sudah dipakai untuk operasi lain")

// TerapkanOperasi menerapkan satu operasi sinkron sekali saja per kunci (ADR 29). Kunci yang sudah ada dikenali
// dan hasilnya dikembalikan tanpa menerapkan lagi (ulang=true). Kunci baru: baris produk dikunci, perubahan
// diterapkan hanya bila versi dasar sama dengan versi sekarang, dan hasilnya (diterapkan atau konflik) disimpan
// bersama kuncinya, jadi kirim ulang sesudah jawaban hilang mendapat jawaban yang sama. Seluruhnya satu transaction.
func (r Repo) TerapkanOperasi(ctx context.Context, o OperasiSinkron, akun int64) (status string, sekarang StokProduk, ulang bool, err error) {
	err = r.DalamTx(ctx, func(t Tx) error {
		// Kunci produk lebih dulu: dua pengiriman kunci yang sama bersamaan antre di sini, yang kedua melihat yang pertama.
		err := t.tx.QueryRowContext(ctx,
			`SELECT id, harga, stok, versi FROM produk WHERE id = $1 AND akun_id = $2 FOR UPDATE`, o.Produk, akun).
			Scan(&sekarang.ID, &sekarang.Harga, &sekarang.Stok, &sekarang.Versi)
		if errors.Is(err, sql.ErrNoRows) {
			return ErrTidakAda
		}
		if err != nil {
			return err
		}
		var ada OperasiSinkron
		err = t.tx.QueryRowContext(ctx, `
			SELECT status, perangkat_id, produk_id, jenis, nilai, versi_dasar FROM operasi_sinkron WHERE kunci = $1`, o.Kunci).
			Scan(&status, &ada.Perangkat, &ada.Produk, &ada.Jenis, &ada.Nilai, &ada.VersiDasar)
		if err == nil {
			if ada.Perangkat != o.Perangkat || ada.Produk != o.Produk || ada.Jenis != o.Jenis || ada.Nilai != o.Nilai ||
				ada.VersiDasar != o.VersiDasar {
				return ErrKunciBeda // kunci yang sama dengan isi berbeda bukan pengiriman ulang
			}
			ulang = true
			return nil
		}
		if !errors.Is(err, sql.ErrNoRows) {
			return err
		}
		if sekarang.Versi == o.VersiDasar {
			if o.Jenis == "stok" {
				_, err = t.tx.ExecContext(ctx,
					`UPDATE produk SET stok = $2, versi = versi + 1, diubah = now() WHERE id = $1`, o.Produk, o.Nilai)
			} else {
				_, err = t.tx.ExecContext(ctx,
					`UPDATE produk SET harga = $2, versi = versi + 1, diubah = now() WHERE id = $1`, o.Produk, o.Nilai)
			}
			if err != nil {
				return err
			}
			status = "diterapkan"
		} else {
			status = "konflik"
		}
		if _, err = t.tx.ExecContext(ctx, `
			INSERT INTO operasi_sinkron (kunci, perangkat_id, produk_id, jenis, nilai, versi_dasar, status, dibuat_di_hp, diterapkan)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $7 = 'diterapkan' THEN now() END)`,
			o.Kunci, o.Perangkat, o.Produk, o.Jenis, o.Nilai, o.VersiDasar, status, o.DibuatHP); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return "", sekarang, false, err
	}
	// Keadaan sesudah operasi (versi baru bila diterapkan).
	if err := r.db.QueryRowContext(ctx, `SELECT id, harga, stok, versi FROM produk WHERE id = $1`, o.Produk).
		Scan(&sekarang.ID, &sekarang.Harga, &sekarang.Stok, &sekarang.Versi); err != nil {
		return "", sekarang, false, err
	}
	return status, sekarang, ulang, nil
}

// --8<-- [end:sinkron]

// BersihkanOperasi membuang operasi sinkron yang lebih tua dari retensi (14 hari, naskah 3b).
func (r Repo) BersihkanOperasi(ctx context.Context, retensi time.Duration) (int64, error) {
	h, err := r.db.ExecContext(ctx,
		`DELETE FROM operasi_sinkron WHERE dibuat_di_hp < now() - make_interval(secs => $1::double precision)`, retensi.Seconds())
	if err != nil {
		return 0, err
	}
	return h.RowsAffected()
}

// Penerimaan adalah satu uang masuk ke buku warung, untuk dasbor "Riwayat penerimaan".
type Penerimaan struct {
	ID         int64     `json:"id"`
	Jenis      string    `json:"jenis"`
	Nominal    int64     `json:"nominal"`
	Keterangan string    `json:"keterangan"`
	Waktu      time.Time `json:"waktu"`
}

// RiwayatPenerimaan: uang masuk ke buku satu akun, terbaru dulu (hanya posting positif).
func (r Repo) RiwayatPenerimaan(ctx context.Context, akun int64, batas int) ([]Penerimaan, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT j.id, j.jenis, p.jumlah, j.keterangan, p.dibuat
		FROM buku b JOIN posting p ON p.buku_id = b.id AND p.jumlah > 0 JOIN jurnal j ON j.id = p.jurnal_id
		WHERE b.akun_id = $1 ORDER BY p.dibuat DESC, p.id DESC LIMIT $2`, akun, batas)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Penerimaan{}
	for rows.Next() {
		var x Penerimaan
		if err := rows.Scan(&x.ID, &x.Jenis, &x.Nominal, &x.Keterangan, &x.Waktu); err != nil {
			return nil, err
		}
		out = append(out, x)
	}
	return out, rows.Err()
}
