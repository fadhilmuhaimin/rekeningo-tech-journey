package repo

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	_ "github.com/jackc/pgx/v5/stdlib"
)

// Tes audit log berantai (ADR 43, M38) dengan PostgreSQL sungguhan. TEST_DATABASE_URL menunjuk schema tes milik
// pemilik (LAB_TES_SCHEMA, bawaan tahap4_tes). Tes role aplikasi butuh schema kedua yang dibuat dengan hak
// (dasar_t4.buat_schema(nama, hak=True)): TEST_DATABASE_URL_APP, tersambung sebagai api_t4. TES_DB_WAJIB=1 mengubah
// "dilewati" menjadi gagal.

func schemaTes() string {
	if s := os.Getenv("LAB_TES_SCHEMA"); s != "" {
		return s
	}
	return "tahap4_tes"
}

func bukaDB(t *testing.T, env string, role string) *sql.DB {
	t.Helper()
	url := os.Getenv(env)
	if url == "" {
		if os.Getenv("TES_DB_WAJIB") == "1" {
			t.Fatalf("TES_DB_WAJIB=1 tetapi %s kosong", env)
		}
		t.Skipf("%s kosong: tes ini butuh PostgreSQL", env)
	}
	db, err := sql.Open("pgx", url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	var nama, user string
	if err := db.QueryRow("SELECT current_database(), current_user").Scan(&nama, &user); err != nil {
		t.Fatal(err)
	}
	if nama != "lab" {
		t.Fatalf("database %s bukan lab", nama)
	}
	if role != "" && user != role {
		t.Fatalf("tersambung sebagai %s, ingin role %s", user, role)
	}
	return db
}

func siapkanAudit(t *testing.T) (Repo, *sql.DB, int64) {
	t.Helper()
	db := bukaDB(t, "TEST_DATABASE_URL", "")
	var schema string
	if err := db.QueryRow("SELECT coalesce(current_schema(), '')").Scan(&schema); err != nil {
		t.Fatal(err)
	}
	if schema != schemaTes() {
		t.Fatalf("schema %s bukan schema tes %s", schema, schemaTes())
	}
	var akun int64
	if err := db.QueryRow(`
		INSERT INTO akun (id, jenis, nama, email, password_hash, tingkat)
		SELECT greatest(coalesce(max(id), 0), 100000) + 1, 'risk', 'Tes audit', 'audit' || gen_random_uuid() || '@rekeningo.example', '!', 'terverifikasi'
		FROM akun RETURNING id`).Scan(&akun); err != nil {
		t.Fatal(err)
	}
	return Baru(db), db, akun
}

func tulis(t *testing.T, r Repo, pelaku int64, aksi string) int64 {
	t.Helper()
	var id int64
	err := r.DalamTx(context.Background(), func(tx Tx) error {
		var err error
		id, err = tx.TulisAudit(context.Background(), time.Now(), pelaku, "risk", aksi, "akun:1", "alasan uji rantai audit", nil)
		return err
	})
	if err != nil {
		t.Fatal(err)
	}
	return id
}

func utuh(t *testing.T, r Repo) HasilVerifikasiAudit {
	t.Helper()
	h, err := r.VerifikasiAudit(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	return h
}

// Rumus hash ditulis ulang di sini dari komentar HashAudit, bukan dipanggil, supaya perubahan kolom atau pemisah
// di kode produksi tidak lolos diam-diam.
func TestHashAuditCocokDenganRumusTertulis(t *testing.T) {
	waktu := time.Date(2026, 10, 27, 3, 4, 5, 678901234, time.FixedZone("WITA", 8*3600))
	ingin := sha256.Sum256([]byte(HashAwalAudit + "\x1e" + "2026-10-26T19:04:05.678901Z" + "\x1f" + "420" + "\x1f" + "risk" + "\x1f" +
		"buka_berkas" + "\x1f" + "verifikasi:7/kartu" + "\x1f" + "alasan uji" + "\x1f" + "421"))
	got := HashAudit(HashAwalAudit, waktu, 420, "risk", "buka_berkas", "verifikasi:7/kartu", "alasan uji", 421)
	if got != hex.EncodeToString(ingin[:]) {
		t.Fatalf("hash %s, ingin %s", got, hex.EncodeToString(ingin[:]))
	}
	// Tiap kolom ikut: mengubah satu kolom mengubah hash.
	for nama, h := range map[string]string{
		"waktu":     HashAudit(HashAwalAudit, waktu.Add(time.Microsecond), 420, "risk", "buka_berkas", "verifikasi:7/kartu", "alasan uji", 421),
		"pelaku":    HashAudit(HashAwalAudit, waktu, 421, "risk", "buka_berkas", "verifikasi:7/kartu", "alasan uji", 421),
		"peran":     HashAudit(HashAwalAudit, waktu, 420, "cs", "buka_berkas", "verifikasi:7/kartu", "alasan uji", 421),
		"aksi":      HashAudit(HashAwalAudit, waktu, 420, "risk", "lihat_akun", "verifikasi:7/kartu", "alasan uji", 421),
		"objek":     HashAudit(HashAwalAudit, waktu, 420, "risk", "buka_berkas", "verifikasi:7/swafoto", "alasan uji", 421),
		"alasan":    HashAudit(HashAwalAudit, waktu, 420, "risk", "buka_berkas", "verifikasi:7/kartu", "alasan lain", 421),
		"penyetuju": HashAudit(HashAwalAudit, waktu, 420, "risk", "buka_berkas", "verifikasi:7/kartu", "alasan uji", 422),
		"sebelum":   HashAudit(HashAwalAudit[:63]+"1", waktu, 420, "risk", "buka_berkas", "verifikasi:7/kartu", "alasan uji", 421),
	} {
		if h == got {
			t.Errorf("mengubah %s tidak mengubah hash", nama)
		}
	}
}

func TestAuditBerantaiUtuhDanBerurutan(t *testing.T) {
	r, db, pelaku := siapkanAudit(t)
	sebelum := utuh(t, r)
	if sebelum.RusakDiID != 0 {
		t.Fatalf("rantai sudah putus sebelum tes dimulai di baris %d", sebelum.RusakDiID)
	}
	var id [4]int64
	for i := range id {
		id[i] = tulis(t, r, pelaku, fmt.Sprintf("aksi_%d", i))
	}
	sesudah := utuh(t, r)
	if sesudah.RusakDiID != 0 || sesudah.Baris != sebelum.Baris+4 {
		t.Fatalf("sesudah empat baris: %+v, ingin utuh dengan %d baris", sesudah, sebelum.Baris+4)
	}
	// Setiap baris menyimpan hash baris sebelumnya.
	for i := 1; i < 4; i++ {
		var sebelumnya, hashPrev string
		if err := db.QueryRow(`SELECT hash_sebelumnya FROM audit_log WHERE id = $1`, id[i]).Scan(&sebelumnya); err != nil {
			t.Fatal(err)
		}
		if err := db.QueryRow(`SELECT hash FROM audit_log WHERE id = $1`, id[i-1]).Scan(&hashPrev); err != nil {
			t.Fatal(err)
		}
		if sebelumnya != hashPrev {
			t.Errorf("baris %d: hash_sebelumnya %s bukan hash baris %d (%s)", id[i], sebelumnya, id[i-1], hashPrev)
		}
	}
}

// Penulis serentak tidak boleh membuat dua cabang dari satu hash terakhir. Advisory lock di TulisAudit mengurutkan
// mereka; tanpa itu, dua transaction membaca hash terakhir yang sama dan menulis dua baris dengan hash_sebelumnya
// yang sama, dan rantai putus.
func TestAuditPenulisSerentakTidakMemutusRantai(t *testing.T) {
	r, db, pelaku := siapkanAudit(t)
	var sebelum int
	db.QueryRow(`SELECT count(*) FROM audit_log`).Scan(&sebelum)
	const penulis, perPenulis = 12, 8
	var wg sync.WaitGroup
	galat := make(chan error, penulis*perPenulis)
	for p := 0; p < penulis; p++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := 0; i < perPenulis; i++ {
				err := r.DalamTx(context.Background(), func(tx Tx) error {
					_, err := tx.TulisAudit(context.Background(), time.Now(), pelaku, "risk", "serentak", "akun:1", "uji penulis serentak", nil)
					return err
				})
				if err != nil {
					galat <- err
				}
			}
		}()
	}
	wg.Wait()
	close(galat)
	for err := range galat {
		t.Fatal(err)
	}
	h := utuh(t, r)
	if h.RusakDiID != 0 || h.Baris != sebelum+penulis*perPenulis {
		t.Fatalf("sesudah %d penulis serentak: %+v, ingin utuh dengan %d baris", penulis, h, sebelum+penulis*perPenulis)
	}
	var cabang int
	if err := db.QueryRow(`SELECT count(*) FROM (SELECT hash_sebelumnya FROM audit_log GROUP BY 1 HAVING count(*) > 1) x`).Scan(&cabang); err != nil {
		t.Fatal(err)
	}
	if cabang != 0 {
		t.Fatalf("%d hash dipakai sebagai hash_sebelumnya oleh lebih dari satu baris: rantai bercabang", cabang)
	}
}

type salinan struct {
	id                   int64
	waktu                time.Time
	pelaku               int64
	peran, aksi, objek   string
	alasan               *string
	penyetuju            *int64
	hashSebelumnya, hash string
}

func ambil(t *testing.T, db *sql.DB, id int64) salinan {
	t.Helper()
	var s salinan
	s.id = id
	if err := db.QueryRow(`SELECT waktu, pelaku_id, peran, aksi, objek, alasan, penyetuju_id, hash_sebelumnya, hash
		FROM audit_log WHERE id = $1`, id).Scan(&s.waktu, &s.pelaku, &s.peran, &s.aksi, &s.objek, &s.alasan, &s.penyetuju,
		&s.hashSebelumnya, &s.hash); err != nil {
		t.Fatal(err)
	}
	return s
}

func (s salinan) pulihkan(t *testing.T, db *sql.DB) {
	t.Helper()
	if _, err := db.Exec(`UPDATE audit_log SET waktu=$2, pelaku_id=$3, peran=$4, aksi=$5, objek=$6, alasan=$7, penyetuju_id=$8,
		hash_sebelumnya=$9, hash=$10 WHERE id=$1`, s.id, s.waktu, s.pelaku, s.peran, s.aksi, s.objek, s.alasan, s.penyetuju,
		s.hashSebelumnya, s.hash); err != nil {
		t.Fatal(err)
	}
}

// Pemilik schema (insider yang melewati hak role aplikasi) mengubah satu kolom di baris tengah: verifikasi gagal
// di baris itu, bukan di baris lain.
func TestAuditUbahBarisTengahTerdeteksiDiBarisItu(t *testing.T) {
	r, db, pelaku := siapkanAudit(t)
	id := [3]int64{tulis(t, r, pelaku, "a"), tulis(t, r, pelaku, "b"), tulis(t, r, pelaku, "c")}
	tengah := id[1]
	asli := ambil(t, db, tengah)
	t.Cleanup(func() { asli.pulihkan(t, db) })
	for _, ubah := range []struct{ nama, sql string }{
		{"peran", `UPDATE audit_log SET peran = 'admin-sistem' WHERE id = $1`},
		{"aksi", `UPDATE audit_log SET aksi = 'lihat_akun' WHERE id = $1`},
		{"objek", `UPDATE audit_log SET objek = 'akun:999' WHERE id = $1`},
		{"alasan", `UPDATE audit_log SET alasan = 'alasan yang ditulis ulang belakangan' WHERE id = $1`},
		{"alasan jadi kosong", `UPDATE audit_log SET alasan = NULL WHERE id = $1`},
		{"waktu", `UPDATE audit_log SET waktu = waktu + interval '1 second' WHERE id = $1`},
		{"pelaku", `UPDATE audit_log SET pelaku_id = 1 WHERE id = $1`},
		{"penyetuju", `UPDATE audit_log SET penyetuju_id = 1 WHERE id = $1`},
	} {
		if _, err := db.Exec(ubah.sql, tengah); err != nil {
			t.Fatalf("%s: %v", ubah.nama, err)
		}
		h := utuh(t, r)
		asli.pulihkan(t, db)
		if h.RusakDiID != tengah {
			t.Errorf("ubah %s: rantai putus di %d, ingin %d", ubah.nama, h.RusakDiID, tengah)
		}
	}
	if h := utuh(t, r); h.RusakDiID != 0 {
		t.Fatalf("sesudah dipulihkan rantai masih putus di %d", h.RusakDiID)
	}
}

// Menghapus baris di tengah ketahuan di baris sesudahnya. Menghapus EKOR rantai tidak ketahuan oleh rantai itu
// sendiri: hanya jangkar di luar database (hash baris terakhir yang dicatat di tempat lain) yang menangkapnya.
func TestAuditHapusEkorHanyaTerdeteksiDenganJangkar(t *testing.T) {
	r, db, pelaku := siapkanAudit(t)
	tulis(t, r, pelaku, "dasar")
	ekor := tulis(t, r, pelaku, "ekor")
	jangkar := utuh(t, r).HashTerakhir // dicatat di luar database
	asli := ambil(t, db, ekor)

	if _, err := db.Exec(`DELETE FROM audit_log WHERE id = $1`, ekor); err != nil {
		t.Fatal(err)
	}
	h := utuh(t, r)
	t.Cleanup(func() {
		if _, err := db.Exec(`INSERT INTO audit_log (id, waktu, pelaku_id, peran, aksi, objek, alasan, penyetuju_id, hash_sebelumnya, hash)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, asli.id, asli.waktu, asli.pelaku, asli.peran, asli.aksi, asli.objek,
			asli.alasan, asli.penyetuju, asli.hashSebelumnya, asli.hash); err != nil {
			t.Fatal(err)
		}
	})
	if h.RusakDiID != 0 {
		t.Fatalf("rantai tanpa ekor dilaporkan putus di %d; rantai saja tidak boleh bisa melihat ekor yang hilang", h.RusakDiID)
	}
	if h.HashTerakhir == jangkar {
		t.Fatal("hash terakhir sama dengan jangkar sesudah ekor dihapus: jangkar tidak menangkap pemotongan")
	}
}

func TestAuditHapusBarisTengahTerdeteksiDiBarisSesudahnya(t *testing.T) {
	r, db, pelaku := siapkanAudit(t)
	a, b, c := tulis(t, r, pelaku, "a"), tulis(t, r, pelaku, "b"), tulis(t, r, pelaku, "c")
	_ = a
	tengah := ambil(t, db, b)
	if _, err := db.Exec(`DELETE FROM audit_log WHERE id = $1`, b); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if _, err := db.Exec(`INSERT INTO audit_log (id, waktu, pelaku_id, peran, aksi, objek, alasan, penyetuju_id, hash_sebelumnya, hash)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, tengah.id, tengah.waktu, tengah.pelaku, tengah.peran, tengah.aksi, tengah.objek,
			tengah.alasan, tengah.penyetuju, tengah.hashSebelumnya, tengah.hash); err != nil {
			t.Fatal(err)
		}
	})
	if h := utuh(t, r); h.RusakDiID != c {
		t.Fatalf("baris tengah dihapus: putus di %d, ingin %d (baris sesudahnya)", h.RusakDiID, c)
	}
}

// Role aplikasi (api_t4, bukan pemilik) hanya punya SELECT dan INSERT pada audit_log: UPDATE, DELETE, dan TRUNCATE
// ditolak database dengan 42501, bukan oleh kode aplikasi.
func TestAuditRoleAplikasiDitolakUbahHapusKosongkan(t *testing.T) {
	db := bukaDB(t, "TEST_DATABASE_URL_APP", "api_t4")
	r := Baru(db)
	// akun 1 (sistem) ada di setiap schema hasil migrasi; FK dicek database.
	id := tulis(t, r, 1, "dari_role_aplikasi")
	for nama, q := range map[string]string{
		"UPDATE":   `UPDATE audit_log SET aksi = 'dihapus' WHERE id = ` + fmt.Sprint(id),
		"DELETE":   `DELETE FROM audit_log WHERE id = ` + fmt.Sprint(id),
		"TRUNCATE": `TRUNCATE audit_log`,
	} {
		_, err := db.Exec(q)
		var pg *pgconn.PgError
		if !errors.As(err, &pg) || pg.Code != "42501" {
			t.Errorf("%s oleh role aplikasi: galat %v, ingin 42501 insufficient_privilege", nama, err)
		}
	}
	var n int
	if err := db.QueryRow(`SELECT count(*) FROM audit_log WHERE id = $1 AND aksi = 'dari_role_aplikasi'`, id).Scan(&n); err != nil || n != 1 {
		t.Fatalf("baris hilang atau berubah sesudah percobaan yang ditolak: %d baris, %v", n, err)
	}
	if h := utuh(t, r); h.RusakDiID != 0 {
		t.Fatalf("rantai putus di %d", h.RusakDiID)
	}
}
