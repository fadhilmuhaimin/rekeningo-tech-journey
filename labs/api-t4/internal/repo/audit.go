package repo

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"strconv"
	"strings"
	"time"
)

// Audit log berantai hash (ADR 43, M38). Setiap baris menyimpan hash baris sebelumnya dan hash dirinya:
// hash = SHA-256(hash_sebelumnya, isi baris). Mengubah atau menghapus baris di tengah memutus rantai di baris itu
// (VerifikasiAudit). Menghapus ekor rantai tidak terdeteksi tanpa jangkar di luar database: hash baris terakhir
// yang dicatat di tempat lain (`HashTerakhirAudit`).

// HashAwalAudit adalah hash_sebelumnya baris pertama.
const HashAwalAudit = "0000000000000000000000000000000000000000000000000000000000000000"

// kunciAuditAdvisory: satu angka bebas yang dipakai pg_advisory_xact_lock supaya dua penulis tidak membaca hash
// terakhir yang sama dan membuat dua cabang rantai.
const kunciAuditAdvisory = 4004001

// HashAudit menghitung hash satu baris. Waktu dibulatkan ke mikrodetik UTC (ketelitian timestamptz); penyetuju
// kosong ditulis 0; alasan kosong ditulis kosong. Pemisah \x1f antar kolom dan \x1e sesudah hash sebelumnya
// supaya dua isi berbeda tidak menghasilkan teks yang sama.
func HashAudit(sebelumnya string, waktu time.Time, pelaku int64, peran, aksi, objek, alasan string, penyetuju int64) string {
	isi := strings.Join([]string{
		waktu.UTC().Truncate(time.Microsecond).Format("2006-01-02T15:04:05.000000Z"),
		strconv.FormatInt(pelaku, 10), peran, aksi, objek, alasan, strconv.FormatInt(penyetuju, 10)}, "\x1f")
	h := sha256.Sum256([]byte(sebelumnya + "\x1e" + isi))
	return hex.EncodeToString(h[:])
}

// TulisAudit menambah satu baris di ujung rantai. Dipanggil di transaction yang sama dengan aksi yang dicatat:
// aksi yang dibatalkan tidak meninggalkan catatan, dan aksi yang berhasil tidak kehilangan catatannya.
func (t Tx) TulisAudit(ctx context.Context, waktu time.Time, pelaku int64, peran, aksi, objek, alasan string, penyetuju *int64) (int64, error) {
	if _, err := t.tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock($1)`, kunciAuditAdvisory); err != nil {
		return 0, err
	}
	sebelumnya := HashAwalAudit
	err := t.tx.QueryRowContext(ctx, `SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1`).Scan(&sebelumnya)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return 0, err
	}
	waktu = waktu.UTC().Truncate(time.Microsecond)
	var p int64
	var psql *int64
	if penyetuju != nil {
		p, psql = *penyetuju, penyetuju
	}
	var alasanSQL *string
	if alasan != "" {
		alasanSQL = &alasan
	}
	hash := HashAudit(sebelumnya, waktu, pelaku, peran, aksi, objek, alasan, p)
	var id int64
	err = t.tx.QueryRowContext(ctx, `
		INSERT INTO audit_log (waktu, pelaku_id, peran, aksi, objek, alasan, penyetuju_id, hash_sebelumnya, hash)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
		waktu, pelaku, peran, aksi, objek, alasanSQL, psql, sebelumnya, hash).Scan(&id)
	return id, err
}

// BarisAudit adalah satu baris log untuk dibaca (verifikasi dan back office).
type BarisAudit struct {
	ID        int64     `json:"id"`
	Waktu     time.Time `json:"waktu"`
	PelakuID  int64     `json:"pelaku_id"`
	Peran     string    `json:"peran"`
	Aksi      string    `json:"aksi"`
	Objek     string    `json:"objek"`
	Alasan    string    `json:"alasan,omitempty"`
	Penyetuju int64     `json:"penyetuju_id,omitempty"`
}

// HasilVerifikasiAudit: jumlah baris yang diperiksa, baris pertama yang rantainya putus (0 bila utuh), dan hash
// baris terakhir (jangkar).
type HasilVerifikasiAudit struct {
	Baris        int    `json:"baris"`
	RusakDiID    int64  `json:"rusak_di_id,omitempty"`
	HashTerakhir string `json:"hash_terakhir"`
}

// VerifikasiAudit membaca seluruh log menurut nomor dan menghitung ulang rantainya. Berhenti di baris pertama yang
// hash_sebelumnya-nya bukan hash baris sebelumnya, atau yang hash-nya bukan hasil hitung ulang isinya.
func (r Repo) VerifikasiAudit(ctx context.Context) (HasilVerifikasiAudit, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, waktu, pelaku_id, peran, aksi, objek, coalesce(alasan, ''), coalesce(penyetuju_id, 0), hash_sebelumnya, hash
		FROM audit_log ORDER BY id`)
	if err != nil {
		return HasilVerifikasiAudit{}, err
	}
	defer rows.Close()
	h := HasilVerifikasiAudit{HashTerakhir: HashAwalAudit}
	for rows.Next() {
		var b BarisAudit
		var sebelum, hash string
		if err := rows.Scan(&b.ID, &b.Waktu, &b.PelakuID, &b.Peran, &b.Aksi, &b.Objek, &b.Alasan, &b.Penyetuju, &sebelum, &hash); err != nil {
			return h, err
		}
		h.Baris++
		if h.RusakDiID == 0 && (sebelum != h.HashTerakhir ||
			hash != HashAudit(sebelum, b.Waktu, b.PelakuID, b.Peran, b.Aksi, b.Objek, b.Alasan, b.Penyetuju)) {
			h.RusakDiID = b.ID
		}
		h.HashTerakhir = hash
	}
	return h, rows.Err()
}
