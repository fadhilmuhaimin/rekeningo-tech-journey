// Lab e3-idempotency · versi ledger (Tahap 2, M10, ADR 14; keputusan 510–515).
// Server Go: POST /transfers (Budi bayar ke warung) di atas ledger labs/b3-ledger, dengan header Idempotency-Key.
//
//	-tanpa-idempotensi   server minggu 2 (M10): header diabaikan, setiap request menulis satu jurnal
//	-titik <nama>        titik henti lab untuk request #1, supaya rekaman tidak bergantung pada waktu:
//	  putus-sesudah-commit   COMMIT, lalu koneksi app ditutup tanpa response (sinyal putus)
//	  tahan-sebelum-commit   jurnal ditulis, koneksi app ditutup, transaction ditahan sampai request #2 dijawab
//	  mati-di-tengah         jurnal ditulis, lalu koneksi database diputus sebelum COMMIT (server mati)
package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"sync/atomic"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
)

const (
	budi      = 419     // peminta tetap: login bukan bagian lab ini
	maksBayar = 200_000 // batas satu pembayaran, sama dengan api-t2
)

// Hasil adalah response untuk app. Untuk request ber-key, Hasil ini juga yang disimpan per key.
type Hasil struct {
	Status int             `json:"status"`
	Body   json.RawMessage `json:"body"`
	Jurnal *int64          `json:"-"`
}

func problem(status int, tipe, judul string) Hasil {
	b, _ := json.Marshal(map[string]any{"type": tipe, "title": judul, "status": status})
	return Hasil{Status: status, Body: b}
}

// Kunci adalah satu idempotency key beserta pemilik dan sidik jari permintaannya.
type Kunci struct {
	Nilai string // UUID dari app
	Akun  int64
	Hash  string // sidikJari(method, path, body)
}

var (
	errSedangDiproses = errors.New("request lain dengan key ini sedang diproses")
	errKunciBeda      = errors.New("key sudah dipakai untuk permintaan lain")
	errMatiDiTengah   = errors.New("koneksi database diputus sebelum COMMIT")
)

type Server struct {
	db               *sql.DB
	tanpaIdempotensi bool
	nomor            atomic.Int64
	lab              *lab
}

// --8<-- [start:dengan-kunci]
// denganKunci menjalankan kerja paling banyak sekali per key (ADR 14), dalam dua langkah:
//  1. Klaim: baris key berstatus diproses, COMMIT sendiri. Key yang sudah ada tidak diubah.
//  2. Kerja: baris key dikunci tanpa menunggu (NOWAIT), lalu kerja dan status selesai ditulis
//     di SATU transaction. Kalau server mati sebelum COMMIT, PostgreSQL membatalkan keduanya:
//     key tetap diproses tanpa lock, dan ulangan berikutnya mengerjakannya dari awal.
func (s *Server) denganKunci(ctx context.Context, n int64, k Kunci, kerja func(*sql.Tx) (Hasil, error)) (Hasil, error) {
	klaim, err := s.db.ExecContext(ctx, `
		INSERT INTO kunci_idempotensi (kunci, akun_id, hash_permintaan, status, kedaluwarsa)
		VALUES ($1, $2, $3, 'diproses', now() + interval '24 hours')
		ON CONFLICT (kunci) DO NOTHING`, k.Nilai, k.Akun, k.Hash)
	if err != nil {
		return Hasil{}, err
	}
	baru, _ := klaim.RowsAffected()

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return Hasil{}, err
	}
	defer tx.Rollback()
	var akun int64
	var hash, status string
	var respons []byte
	err = tx.QueryRowContext(ctx, `
		SELECT akun_id, hash_permintaan, status, respons FROM kunci_idempotensi
		WHERE kunci = $1 FOR UPDATE NOWAIT`, k.Nilai).Scan(&akun, &hash, &status, &respons)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "55P03" { // lock_not_available: request lain sedang di langkah 2
		return Hasil{}, errSedangDiproses
	}
	if err != nil {
		return Hasil{}, err
	}
	if akun != k.Akun || hash != k.Hash {
		return Hasil{}, errKunciBeda // respons milik permintaan lain tidak pernah dikirim
	}
	if status == "selesai" {
		s.jejak(n, "key selesai, hash sama: kirim respons tersimpan, tanpa jurnal baru")
		return dariSimpanan(respons)
	}
	if baru == 1 {
		s.jejak(n, "key baru: status diproses")
	} else {
		s.jejak(n, "key diproses tanpa lock: tidak ada request lain yang mengerjakannya, dikerjakan dari awal")
	}
	h, err := kerja(tx)
	if err != nil {
		return Hasil{}, err // ROLLBACK: key tetap diproses
	}
	simpan, _ := json.Marshal(h)
	if _, err := tx.ExecContext(ctx, `
		UPDATE kunci_idempotensi SET status = 'selesai', respons = $2, jurnal_id = $3
		WHERE kunci = $1`, k.Nilai, string(simpan), h.Jurnal); err != nil {
		return Hasil{}, err
	}
	return h, tx.Commit()
}

// --8<-- [end:dengan-kunci]

// dariSimpanan membuat ulang response dari kolom jsonb. jsonb menyimpan ulang spasi dan urutan field,
// jadi body dibaca ke map lalu ditulis lagi dengan encoder yang sama: byte-nya sama dengan response pertama.
func dariSimpanan(respons []byte) (Hasil, error) {
	var h Hasil
	if err := json.Unmarshal(respons, &h); err != nil {
		return Hasil{}, err
	}
	d := json.NewDecoder(bytes.NewReader(h.Body))
	d.UseNumber()
	var body map[string]any
	if err := d.Decode(&body); err != nil {
		return Hasil{}, err
	}
	b, err := json.Marshal(body)
	h.Body = b
	return h, err
}

// sekali: server minggu 2, tanpa idempotency key. Kerja yang sama, tanpa ingatan tentang request sebelumnya.
func (s *Server) sekali(ctx context.Context, kerja func(*sql.Tx) (Hasil, error)) (Hasil, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return Hasil{}, err
	}
	defer tx.Rollback()
	h, err := kerja(tx)
	if err != nil {
		return Hasil{}, err
	}
	return h, tx.Commit()
}

// --8<-- [start:bayar]
// bayar: satu jurnal bayar dengan dua posting. Aturan sama dengan api-t2 (keputusan 415), tanpa batas warung.
func bayar(ctx context.Context, tx *sql.Tx, dari, ke, jumlah int64) (Hasil, error) {
	type buku struct {
		id, saldo   int64
		jenis, nama string
	}
	rows, err := tx.QueryContext(ctx, `
		SELECT b.akun_id, b.id, b.saldo_cache, b.jenis, a.nama
		FROM buku b JOIN akun a ON a.id = b.akun_id
		WHERE b.akun_id = ANY($1) ORDER BY b.id FOR UPDATE OF b`, []int64{dari, ke})
	if err != nil {
		return Hasil{}, err
	}
	semua := map[int64]buku{}
	for rows.Next() {
		var akun int64
		var b buku
		if err := rows.Scan(&akun, &b.id, &b.saldo, &b.jenis, &b.nama); err != nil {
			_ = rows.Close()
			return Hasil{}, err
		}
		semua[akun] = b
	}
	if err := rows.Err(); err != nil {
		return Hasil{}, err
	}
	p, w := semua[dari], semua[ke]
	if w.jenis != "warung" {
		return problem(422, "/problems/validasi", "Tujuan harus akun warung"), nil
	}
	if p.saldo < jumlah { // dibaca sesudah lock
		return problem(422, "/problems/saldo-kurang", "Saldo tidak cukup"), nil
	}
	var j int64
	if err := tx.QueryRowContext(ctx, `
		INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('bayar', $1, $2) RETURNING id`,
		fmt.Sprintf("Bayar %s ke %s", p.nama, w.nama), dari).Scan(&j); err != nil {
		return Hasil{}, err
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES ($1, $2, $3), ($1, $4, $5)`,
		j, p.id, -jumlah, w.id, jumlah); err != nil {
		return Hasil{}, err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE buku SET saldo_cache = saldo_cache + CASE WHEN id = $1 THEN -$3::bigint ELSE $3::bigint END
		WHERE id IN ($1, $2)`, p.id, w.id, jumlah); err != nil {
		return Hasil{}, err
	}
	body, _ := json.Marshal(map[string]int64{"id": j, "saldo": p.saldo - jumlah})
	return Hasil{Status: 201, Body: body, Jurnal: &j}, nil
}

// --8<-- [end:bayar]

// --8<-- [start:key-header]
// Idempotency-Key berisi String Structured Field (draft IETF -07 bagian 2.1, RFC 9651 bagian 3.3.3):
// nilai di antara tanda kutip. Rekeningo hanya menerima UUID di dalamnya, supaya key sulit ditebak.
var polaKunci = regexp.MustCompile(`^"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"$`)

func bacaKunci(h http.Header) (string, bool) {
	v := h.Values("Idempotency-Key")
	if len(v) != 1 {
		return "", false
	}
	m := polaKunci.FindStringSubmatch(v[0])
	if m == nil {
		return "", false
	}
	return m[1], true
}

// sidikJari: sha256 dari method, path, dan body yang sudah dibaca ulang ke bentuk tetap,
// jadi spasi atau urutan field di JSON app tidak membuat ulangan dianggap permintaan lain.
func sidikJari(method, path, body string) string {
	h := sha256.Sum256([]byte(method + " " + path + "\n" + body))
	return hex.EncodeToString(h[:])
}

// --8<-- [end:key-header]

func (s *Server) transfers(w http.ResponseWriter, r *http.Request) {
	n := s.nomor.Add(1)
	// Tanpa cancel dari request: app yang memutus koneksi tidak menghentikan transaction di tengah jalan.
	// Transaction tetap utuh, COMMIT atau batal seluruhnya; batas 15 detik menjaga koneksi tidak tertahan.
	ctx, batal := context.WithTimeout(context.WithoutCancel(r.Context()), 15*time.Second)
	defer batal()
	var in struct {
		Ke     *int64 `json:"ke"`
		Jumlah *int64 `json:"jumlah"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<16)).Decode(&in); err != nil ||
		in.Ke == nil || in.Jumlah == nil {
		s.kirim(w, n, problem(400, "/problems/body", "Body harus JSON berisi ke dan jumlah"))
		return
	}
	body := fmt.Sprintf(`{"ke":%d,"jumlah":%d}`, *in.Ke, *in.Jumlah)
	kerja := func(tx *sql.Tx) (Hasil, error) {
		h, err := bayar(ctx, tx, budi, *in.Ke, *in.Jumlah)
		if err == nil && h.Jurnal != nil {
			s.jejak(n, "jurnal %d ditulis, belum COMMIT", *h.Jurnal)
			err = s.lab.sebelumCommit(ctx, s, n, w, tx)
		}
		return h, err
	}

	var h Hasil
	var err error
	if s.tanpaIdempotensi {
		s.jejak(n, "POST /transfers  tanpa key  %s", body)
		if *in.Jumlah <= 0 || *in.Jumlah > maksBayar {
			s.kirim(w, n, problem(422, "/problems/validasi", "Jumlah harus 1 sampai 200000"))
			return
		}
		h, err = s.sekali(ctx, kerja)
	} else {
		k, ok := bacaKunci(r.Header)
		if !ok {
			if v := r.Header.Values("Idempotency-Key"); len(v) > 0 {
				s.jejak(n, "POST /transfers  Idempotency-Key: %s  %s", v[0], body)
			} else {
				s.jejak(n, "POST /transfers  tanpa Idempotency-Key  %s", body)
			}
			s.kirim(w, n, problem(400, "/problems/idempotency-key", "Header Idempotency-Key wajib: String berisi UUID"))
			return
		}
		s.jejak(n, "POST /transfers  key %s…  %s", k[:8], body)
		if *in.Jumlah <= 0 || *in.Jumlah > maksBayar {
			s.kirim(w, n, problem(422, "/problems/validasi", "Jumlah harus 1 sampai 200000"))
			return
		}
		h, err = s.denganKunci(ctx, n, Kunci{Nilai: k, Akun: budi, Hash: sidikJari(r.Method, r.URL.Path, body)}, kerja)
		switch {
		case errors.Is(err, errSedangDiproses):
			s.jejak(n, "baris key sedang dikunci transaction lain (55P03 lock_not_available)")
			h, err = problem(409, "/problems/sedang-diproses", "Permintaan dengan Idempotency-Key ini masih diproses"), nil
		case errors.Is(err, errKunciBeda):
			s.jejak(n, "key sudah ada dengan hash permintaan berbeda")
			h, err = problem(422, "/problems/idempotency-key-dipakai-ulang",
				"Idempotency-Key sudah dipakai untuk permintaan lain"), nil
		}
	}
	if s.lab.selesaiTanpaResponse(s, n, h, err) {
		return
	}
	if err != nil {
		s.jejak(n, "error: %v", err)
		s.kirim(w, n, problem(500, "/problems/internal", "Terjadi kesalahan di server"))
		return
	}
	if s.lab.putusSesudahCommit(s, n, w, h) {
		return
	}
	s.kirim(w, n, h)
	s.lab.sesudahJawab(s, n)
}

func (s *Server) kirim(w http.ResponseWriter, n int64, h Hasil) {
	s.jejak(n, "→ %d %s", h.Status, h.Body)
	ct := "application/json"
	if h.Status >= 400 {
		ct = "application/problem+json"
	}
	w.Header().Set("Content-Type", ct)
	w.WriteHeader(h.Status)
	_, _ = w.Write(h.Body) // app yang sudah memutus koneksi: tidak ada yang bisa dilakukan
}

func (s *Server) jejak(n int64, format string, a ...any) {
	fmt.Printf("server  #%d  "+format+"\n", append([]any{n}, a...)...)
}
