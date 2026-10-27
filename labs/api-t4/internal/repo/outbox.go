package repo

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// Outbox (ADR 23, lab api-t4): pemberitahuan ditulis di transaction yang sama dengan jurnal, dikirim worker
// sesudahnya. Kelas menentukan urutan antrean (ADR 32).
const (
	KelasUang  = 0 // bayar dan transfer
	KelasTopup = 1 // top-up massal
	KelasPromo = 2 // pengumuman promo
)

// Lajur pekerjaan (kolom `tujuan`, migrasi 000020). Satu worker boleh mengklaim satu lajur, beberapa, atau semuanya.
const (
	TujuanPush       = "push"
	TujuanVerifikasi = "verifikasi"
)

// TujuanSemua: semua lajur yang dikenal. Worker tanpa daftar lajur mengklaim semuanya.
var TujuanSemua = []string{TujuanPush, TujuanVerifikasi}

// Notifikasi adalah satu baris outbox yang sudah dipegang worker.
type Notifikasi struct {
	ID           int64
	NotifikasiID string
	JurnalID     *int64
	AkunID       int64
	Kelas        int
	Jenis        string
	Tujuan       string // push atau verifikasi (migrasi 000020): lajur pekerjaan
	Payload      []byte
	Percobaan    int
	Dibuat       time.Time
}

// Perangkat adalah satu HP yang boleh menerima pemberitahuan.
type Perangkat struct {
	ID       int64  `json:"id"`
	Platform string `json:"platform"`
	Token    string `json:"-"`
}

// --8<-- [start:tulis-outbox]
// TulisOutbox menulis satu pemberitahuan untuk satu jurnal. Dipanggil di transaction yang sama dengan CatatJurnal:
// COMMIT menyimpan keduanya, ROLLBACK membuang keduanya, jadi pemberitahuan tidak mendahului uangnya (syarat
// Pak Hadi) dan uang yang tercatat tidak kehilangan pemberitahuannya (syarat Sinta). Tidak ada panggilan
// jaringan di sini: pengiriman dilakukan worker sesudah COMMIT (ADR 22).
func (t Tx) TulisOutbox(ctx context.Context, jurnal, akun int64, kelas int, jenis string, payload []byte) error {
	_, err := t.tx.ExecContext(ctx, `
		INSERT INTO outbox (jurnal_id, akun_id, kelas, jenis, payload) VALUES ($1, $2, $3, $4, $5)`,
		jurnal, akun, kelas, jenis, payload)
	return err
}

// --8<-- [end:tulis-outbox]

// UmumkanPromo menulis satu pemberitahuan promo untuk setiap karyawan di satu kota (fan-out dalam satu query).
func (t Tx) UmumkanPromo(ctx context.Context, kota int64, payload []byte) (int64, error) {
	r, err := t.tx.ExecContext(ctx, `
		INSERT INTO outbox (akun_id, kelas, jenis, payload)
		SELECT id, $2, 'promo', $3 FROM akun WHERE kota_id = $1 AND jenis = 'karyawan' ORDER BY id`,
		kota, KelasPromo, payload)
	if err != nil {
		return 0, err
	}
	return r.RowsAffected()
}

// --8<-- [start:klaim]
// KlaimOutbox mengambil sampai n baris yang siap dikirim dan memegangnya sampai `lama` dari sekarang (ADR 24).
// Dua hal bekerja bersama. FOR UPDATE mengunci baris selama pernyataan klaim, dan klaim_sampai menahannya sesudahnya.
// Tanpa klausa kunci sama sekali, dua klaim bersamaan sama-sama meng-UPDATE satu baris dan baris itu dikirim dua kali
// (mutasi tinjauan PR 340). SKIP LOCKED membuat worker lain melewati baris yang sedang dikunci klaim yang berjalan,
// bukan menunggunya (R3-03: mengurangi lock contention pada tabel mirip antrean). Tanpa SKIP LOCKED tidak ada baris
// ganda, tetapi klaim ikut menunggu (TestKlaimMelewatBarisYangDikunci). Tidak ada kursor: baris yang COMMIT belakangan
// dengan `dibuat` lebih awal tetap terlihat. Klaim yang habis (worker mati di tengah kirim) membuat baris itu
// dipegang worker lain; pengiriman ulang itu benar, dan penerima menyaring notifikasi_id (ADR 25).
// urutKelas=false mengurutkan menurut nomor saja (mode rentan urut-waktu, M27).
func (r Repo) KlaimOutbox(ctx context.Context, n int, lama time.Duration, urutKelas bool) ([]Notifikasi, error) {
	return r.KlaimOutboxTujuan(ctx, n, lama, urutKelas, nil)
}

// KlaimOutboxTujuan: klaim yang sama, dibatasi ke satu atau beberapa lajur (`tujuan`). Daftar kosong = semua lajur.
// Satu proses worker per lajur membuat lajur yang macet tidak menahan lajur lain.
func (r Repo) KlaimOutboxTujuan(ctx context.Context, n int, lama time.Duration, urutKelas bool, tujuan []string) ([]Notifikasi, error) {
	if tujuan == nil {
		tujuan = []string{}
	}
	urut := "id"
	if urutKelas {
		urut = "kelas, id"
	}
	rows, err := r.db.QueryContext(ctx, `
		WITH pilih AS (
		  SELECT id FROM outbox
		  WHERE status = 'menunggu' AND coba_lagi <= now() AND (klaim_sampai IS NULL OR klaim_sampai < now())
		    AND (cardinality($3::text[]) = 0 OR tujuan = ANY($3))
		  ORDER BY `+urut+`
		  LIMIT $1
		  FOR UPDATE SKIP LOCKED)
		UPDATE outbox o SET klaim_sampai = now() + make_interval(secs => $2::double precision), percobaan = o.percobaan + 1
		FROM pilih WHERE o.id = pilih.id
		RETURNING o.id, o.notifikasi_id, o.jurnal_id, o.akun_id, o.kelas, o.jenis, o.tujuan, o.payload, o.percobaan, o.dibuat`,
		n, lama.Seconds(), tujuan)
	if err != nil {
		return nil, err
	}
	return bacaNotifikasi(rows)
}

// --8<-- [end:klaim]

// --8<-- [start:baca-kursor]
// BacaKursor adalah poller versi pertama (mode rentan kursor, M19): baris sesudah kursor (dibuat, id), tanpa klaim,
// tanpa lock. `dibuat` = awal transaction, bukan COMMIT, dan nomor id pun bukan urutan COMMIT. Transaction yang
// menunggu lock buku selesai belakangan dengan `dibuat` lebih awal, lalu tertinggal di belakang kursor.
func (r Repo) BacaKursor(ctx context.Context, dibuat time.Time, id int64, n int) ([]Notifikasi, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, notifikasi_id, jurnal_id, akun_id, kelas, jenis, tujuan, payload, percobaan, dibuat
		FROM outbox WHERE status = 'menunggu' AND (dibuat, id) > ($1, $2)
		ORDER BY dibuat, id LIMIT $3`, dibuat, id, n)
	if err != nil {
		return nil, err
	}
	return bacaNotifikasi(rows)
}

// --8<-- [end:baca-kursor]

func bacaNotifikasi(rows *sql.Rows) ([]Notifikasi, error) {
	defer rows.Close()
	var out []Notifikasi
	for rows.Next() {
		var n Notifikasi
		if err := rows.Scan(&n.ID, &n.NotifikasiID, &n.JurnalID, &n.AkunID, &n.Kelas, &n.Jenis, &n.Tujuan, &n.Payload,
			&n.Percobaan, &n.Dibuat); err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, rows.Err()
}

// SelesaiOutbox menandai satu baris terkirim atau dilewati (tidak ada perangkat aktif). Klaim dilepas.
func (r Repo) SelesaiOutbox(ctx context.Context, id int64, status string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE outbox SET status = $2, klaim_sampai = NULL WHERE id = $1 AND status = 'menunggu'`, id, status)
	return err
}

// LepasOutbox mengembalikan baris yang baru diklaim tanpa pernah dikerjakan: klaim dilepas dan percobaan yang
// dinaikkan klaim itu dikurangi lagi. Dipakai bila lajur dijeda breaker sesudah baris diklaim (ADR 25 dan 36:
// percobaan hanya dihitung bila vendor benar-benar dihubungi).
func (r Repo) LepasOutbox(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE outbox SET klaim_sampai = NULL, percobaan = greatest(percobaan - 1, 0)
		WHERE id = $1 AND status = 'menunggu'`, id)
	return err
}

// TundaOutbox melepas klaim dan menentukan kapan baris dicoba lagi; mati=true memindahkannya ke dead-letter.
func (r Repo) TundaOutbox(ctx context.Context, id int64, tunggu time.Duration, mati bool) error {
	if mati {
		_, err := r.db.ExecContext(ctx,
			`UPDATE outbox SET status = 'mati', klaim_sampai = NULL WHERE id = $1 AND status = 'menunggu'`, id)
		return err
	}
	_, err := r.db.ExecContext(ctx, `
		UPDATE outbox SET coba_lagi = now() + make_interval(secs => $2::double precision), klaim_sampai = NULL
		WHERE id = $1 AND status = 'menunggu'`, id, tunggu.Seconds())
	return err
}

// RingkasOutbox: jumlah baris per status dan umur baris tertua yang masih menunggu (detik; 0 bila tidak ada).
// Umur tertua adalah sinyal alert yang dirasakan user (naskah 3.27, ADR 32).
func (r Repo) RingkasOutbox(ctx context.Context) (perStatus map[string]int64, tertuaDetik float64, err error) {
	perStatus = map[string]int64{}
	rows, err := r.db.QueryContext(ctx, `SELECT status, count(*) FROM outbox GROUP BY status`)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	for rows.Next() {
		var s string
		var n int64
		if err := rows.Scan(&s, &n); err != nil {
			return nil, 0, err
		}
		perStatus[s] = n
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	err = r.db.QueryRowContext(ctx, `
		SELECT coalesce(extract(epoch FROM now() - min(dibuat)), 0) FROM outbox WHERE status = 'menunggu'`).Scan(&tertuaDetik)
	return perStatus, tertuaDetik, err
}

// BersihkanOutbox membuang baris yang sudah selesai lebih tua dari retensi (7 hari, naskah 3b). Baris yang masih
// menunggu atau mati tidak disentuh: dead-letter dibaca manusia dulu.
func (r Repo) BersihkanOutbox(ctx context.Context, retensi time.Duration) (int64, error) {
	h, err := r.db.ExecContext(ctx, `
		DELETE FROM outbox WHERE status IN ('terkirim', 'dilewati') AND dibuat < now() - make_interval(secs => $1::double precision)`,
		retensi.Seconds())
	if err != nil {
		return 0, err
	}
	return h.RowsAffected()
}

// --8<-- [start:perangkat]
// DaftarkanPerangkat menyimpan token push satu HP untuk satu akun. Token yang sama di akun lain (HP berpindah
// tangan) dipindahkan ke akun ini dan diaktifkan lagi; satu token tidak pernah menerima pemberitahuan dua akun.
func (r Repo) DaftarkanPerangkat(ctx context.Context, akun int64, platform, token string) (int64, error) {
	var id int64
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO perangkat (akun_id, platform, token_push) VALUES ($1, $2, $3)
		ON CONFLICT (token_push) DO UPDATE
		  SET akun_id = EXCLUDED.akun_id, platform = EXCLUDED.platform, aktif = true, terakhir_terlihat = now()
		RETURNING id`, akun, platform, token).Scan(&id)
	return id, err
}

// PerangkatAktif: HP akun yang masih boleh dikirimi pemberitahuan.
func (r Repo) PerangkatAktif(ctx context.Context, akun int64) ([]Perangkat, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, platform, token_push FROM perangkat WHERE akun_id = $1 AND aktif ORDER BY id`, akun)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Perangkat
	for rows.Next() {
		var p Perangkat
		if err := rows.Scan(&p.ID, &p.Platform, &p.Token); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// NonaktifkanPerangkat: layanan push menjawab token tidak terdaftar (R3-16); token itu tidak dicoba lagi.
func (r Repo) NonaktifkanPerangkat(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, `UPDATE perangkat SET aktif = false WHERE id = $1`, id)
	return err
}

// PerangkatMilik: apakah perangkat ini milik akun itu (untuk operasi sinkron).
func (r Repo) PerangkatMilik(ctx context.Context, id, akun int64) (bool, error) {
	var x int64
	err := r.db.QueryRowContext(ctx, `SELECT id FROM perangkat WHERE id = $1 AND akun_id = $2`, id, akun).Scan(&x)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}

// --8<-- [end:perangkat]
