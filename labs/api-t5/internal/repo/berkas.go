package repo

import (
	"context"
	"time"
)

// Retensi file identitas (ADR 38): file dihapus 30 hari sesudah verifikasi selesai. `hapus_pada` diisi saat
// pengajuan mencapai status akhir. Tidak ada kolom "sudah dihapus" di tabel naskah 3b, jadi kunci objek yang
// kosong adalah penandanya: file sudah dihapus dan baris (status, checksum) tetap sebagai catatan.

// BerkasJatuhTempo: satu pengajuan yang filenya sudah waktunya dihapus.
type BerkasJatuhTempo struct {
	ID           int64
	KunciKartu   string
	KunciSwafoto string
}

// BerkasJatuhTempo mengembalikan paling banyak `batas` pengajuan dengan id > sesudah yang hapus_pada-nya sudah
// sampai (hapus_pada <= kini) dan filenya belum ditandai terhapus. Urut menurut id, supaya satu putaran job
// maju melewati baris yang gagal dihapus dan tidak mengulangnya.
func (r Repo) BerkasJatuhTempo(ctx context.Context, kini time.Time, sesudah int64, batas int) ([]BerkasJatuhTempo, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, berkas_kartu_kunci, berkas_swafoto_kunci FROM verifikasi
		WHERE hapus_pada <= $1 AND (berkas_kartu_kunci <> '' OR berkas_swafoto_kunci <> '') AND id > $2
		ORDER BY id LIMIT $3`, kini, sesudah, batas)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var hasil []BerkasJatuhTempo
	for rows.Next() {
		var b BerkasJatuhTempo
		if err := rows.Scan(&b.ID, &b.KunciKartu, &b.KunciSwafoto); err != nil {
			return nil, err
		}
		hasil = append(hasil, b)
	}
	return hasil, rows.Err()
}

// TandaiBerkasDihapus mengosongkan kunci objek setelah filenya terhapus. false bila baris itu sudah ditandai
// (job lain lebih dulu), jadi dua job bersamaan menghitung satu kali.
func (r Repo) TandaiBerkasDihapus(ctx context.Context, id int64, kini time.Time) (bool, error) {
	h, err := r.db.ExecContext(ctx, `
		UPDATE verifikasi SET berkas_kartu_kunci = '', berkas_swafoto_kunci = ''
		WHERE id = $1 AND hapus_pada <= $2 AND (berkas_kartu_kunci <> '' OR berkas_swafoto_kunci <> '')`, id, kini)
	if err != nil {
		return false, err
	}
	n, err := h.RowsAffected()
	return n == 1, err
}
