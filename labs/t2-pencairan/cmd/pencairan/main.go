// Job pencairan warung Jumat 15.00 · Rekeningo (fiktif), lab t2-pencairan (keputusan 500–503).
//
// Dua versi dalam satu program:
//
//	-mode rentan  job versi pertama (M15): satu transaction per warung, baris file transfer ditulis di tengahnya.
//	-mode benar   ADR 19: batch per periode, baris pencairan per buku, file dibuat dari database
//	              sesudah rekonsiliasi.
//
// Flag -berhenti dan -uji-baris-dobel hanya untuk lab: memerankan server restart di titik tertentu dan cacat
// pembuat file. Format file transfer fiktif, bukan format bank mana pun.
package main

import (
	"context"
	"encoding/csv"
	"errors"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5"
)

const sistem = 1 // akun sistem: pembuat jurnal pencairan

// Kepala file transfer fiktif. File bank sungguhan juga butuh nomor rekening tujuan (belum ada di ERD Tahap 2).
const kepala = "akun_warung,nama_penerima,jumlah,berita"

var titikHenti = flag.String("berhenti", "", "khusus lab: proses mematikan dirinya (SIGKILL) di titik ini")

type baris struct {
	buku, akun int64
	nama       string
	jumlah     int64
	jurnal     int64 // versi benar: jurnal yang mencatat baris ini (0 = belum)
}

func main() {
	mode := flag.String("mode", "", "rentan atau benar")
	periode := flag.String("periode", "", "periode pencairan, mis. 2026-W43")
	dir := flag.String("dir", ".", "folder file transfer")
	urutan := flag.String("urutan", "file-dulu", "versi rentan: file-dulu atau jurnal-dulu")
	dobel := flag.Int64("uji-baris-dobel", 0, "khusus lab: pembuat file menulis baris akun ini dua kali")
	flag.Parse()

	ctx := context.Background()
	db, err := pgx.Connect(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		keluar(1, err)
	}
	defer db.Close(ctx)

	switch *mode {
	case "rentan":
		err = rentan(ctx, db, *periode, *dir, *urutan)
	case "benar":
		err = benar(ctx, db, *periode, *dir, *dobel)
	default:
		err = fmt.Errorf("mode %q tidak dikenal", *mode)
	}
	if errors.Is(err, errDitolak) {
		keluar(3, err)
	}
	if err != nil {
		keluar(1, err)
	}
}

func keluar(kode int, err error) {
	fmt.Fprintln(os.Stderr, "galat:", err)
	os.Exit(kode)
}

// berhenti memerankan server restart: proses mati seketika, tanpa defer, tanpa COMMIT.
func berhenti(titik string) {
	if *titikHenti != titik {
		return
	}
	fmt.Printf("titik henti %s: proses dimatikan (SIGKILL)\n", titik)
	syscall.Kill(os.Getpid(), syscall.SIGKILL)
	for {
		// Sinyal bisa sampai sesudah Kill kembali. Tidur, bukan select {}: runtime Go menganggap select {} tanpa
		// goroutine lain sebagai deadlock dan keluar sendiri dengan "fatal error" sebelum SIGKILL sampai.
		time.Sleep(time.Second)
	}
}

// ---------- versi rentan (M15) ----------

// rentan mencairkan saldo setiap warung saat ini. Baris file ditulis di dalam transaction jurnal, sebelum COMMIT:
// kalau file gagal ditulis, jurnal ikut batal. File dibuka dengan O_APPEND supaya baris yang sudah ditulis tidak
// hilang bila job berhenti di tengah.
func rentan(ctx context.Context, db *pgx.Conn, periode, dir, urutan string) error {
	f, err := os.OpenFile(filepath.Join(dir, "pencairan-"+periode+".csv"), os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer f.Close()
	if info, err := f.Stat(); err != nil {
		return err
	} else if info.Size() == 0 {
		fmt.Fprintln(f, kepala)
	}

	daftar, err := warungBersaldo(ctx, db)
	if err != nil {
		return err
	}
	fmt.Printf("pencairan %s (rentan, %s): %d warung bersaldo\n", periode, urutan, len(daftar))
	for i, w := range daftar {
		n := i + 1
		tx, err := db.Begin(ctx)
		if err != nil {
			return err
		}
		defer tx.Rollback(ctx)
		j, err := catatJurnal(ctx, tx, w, periode)
		if err != nil {
			return err
		}
		if urutan == "file-dulu" {
			if err := tulisBaris(f, w, periode); err != nil {
				return err // jurnal ikut di-rollback
			}
			fmt.Printf("baris file %d ditulis: %s %s\n", n, w.nama, rp(w.jumlah))
			berhenti(fmt.Sprintf("baris-file:%d", n))
		}
		if err := tx.Commit(ctx); err != nil {
			return err
		}
		fmt.Printf("jurnal %d COMMIT: %s %s\n", j, w.nama, rp(w.jumlah))
		if urutan == "jurnal-dulu" {
			berhenti(fmt.Sprintf("commit:%d", n))
			if err := tulisBaris(f, w, periode); err != nil {
				return err
			}
			fmt.Printf("baris file %d ditulis: %s %s\n", n, w.nama, rp(w.jumlah))
		}
	}
	fmt.Println("selesai")
	return nil
}

func warungBersaldo(ctx context.Context, db *pgx.Conn) ([]baris, error) {
	rows, _ := db.Query(ctx, `
		SELECT b.id, a.id, a.nama, s.saldo
		FROM buku b
		JOIN akun a ON a.id = b.akun_id
		CROSS JOIN LATERAL (SELECT coalesce(sum(p.jumlah), 0) AS saldo FROM posting p WHERE p.buku_id = b.id) s
		WHERE b.jenis = 'warung' AND s.saldo > 0
		ORDER BY b.id`)
	return pgx.CollectRows(rows, func(r pgx.CollectableRow) (baris, error) {
		var w baris
		err := r.Scan(&w.buku, &w.akun, &w.nama, &w.jumlah)
		return w, err
	})
}

func tulisBaris(f *os.File, w baris, periode string) error {
	// Tanpa bufio: setiap Fprintf langsung jadi satu write ke file, jadi baris ini tetap ada walau proses mati.
	_, err := fmt.Fprintf(f, "%d,%s,%d,Pencairan Rekeningo %s\n", w.akun, w.nama, w.jumlah, periode)
	return err
}

// catatJurnal: buku warung -jumlah, buku kas pencairan +jumlah, lalu saldo_cache dari posting jurnal itu
// (keputusan 402).
func catatJurnal(ctx context.Context, tx pgx.Tx, w baris, periode string) (int64, error) {
	var j int64
	err := tx.QueryRow(ctx, `INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('pencairan', $1, $2) RETURNING id`,
		fmt.Sprintf("Pencairan %s %s", periode, w.nama), sistem).Scan(&j)
	if err != nil {
		return 0, err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES
		  ($1, $2, -$3::bigint),
		  ($1, (SELECT id FROM buku WHERE akun_id IS NULL AND jenis = 'kas_pencairan'), $3::bigint)`,
		j, w.buku, w.jumlah); err != nil {
		return 0, err
	}
	_, err = tx.Exec(ctx, `
		UPDATE buku b SET saldo_cache = b.saldo_cache + p.jumlah
		FROM (SELECT buku_id, sum(jumlah) AS jumlah FROM posting WHERE jurnal_id = $1 GROUP BY buku_id) p
		WHERE b.id = p.buku_id`, j)
	return j, err
}

// ---------- versi benar (ADR 19) ----------

var errDitolak = errors.New("rekonsiliasi menolak: file tidak dibuat")

// benar menjalankan tiga langkah. Setiap langkah membaca status batch dulu, jadi job yang berhenti di mana pun
// bisa dijalankan lagi dengan perintah yang sama.
func benar(ctx context.Context, db *pgx.Conn, periode, dir string, dobel int64) error {
	// 1. Batch per periode. UNIQUE (periode) membuat batch hanya dibuat sekali; jumlah per warung dibekukan di
	//    baris_pencairan saat itu juga, jadi uang yang masuk sesudahnya ikut periode berikutnya.
	tx, err := db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	tag, err := tx.Exec(ctx, `INSERT INTO batch_pencairan (periode, status) VALUES ($1, 'dibuat') ON CONFLICT (periode) DO NOTHING`, periode)
	if err != nil {
		return err
	}
	var id, total int64
	var status string
	if err := tx.QueryRow(ctx, `SELECT id, status FROM batch_pencairan WHERE periode = $1`, periode).Scan(&id, &status); err != nil {
		return err
	}
	if tag.RowsAffected() == 1 {
		n, err := tx.Exec(ctx, `
			INSERT INTO baris_pencairan (batch_id, buku_id, jumlah)
			SELECT $1, b.id, s.saldo
			FROM buku b
			CROSS JOIN LATERAL (SELECT coalesce(sum(p.jumlah), 0) AS saldo FROM posting p WHERE p.buku_id = b.id) s
			WHERE b.jenis = 'warung' AND s.saldo > 0`, id)
		if err != nil {
			return err
		}
		if err := tx.QueryRow(ctx, `
			UPDATE batch_pencairan SET total = (SELECT coalesce(sum(jumlah), 0) FROM baris_pencairan WHERE batch_id = $1)
			WHERE id = $1 RETURNING total`, id).Scan(&total); err != nil {
			return err
		}
		fmt.Printf("batch %d periode %s dibuat: %d baris, total %s\n", id, periode, n.RowsAffected(), rp(total))
	} else {
		fmt.Printf("batch %d periode %s sudah ada, status %s\n", id, periode, status)
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	if status == "dikirim" {
		fmt.Println("batch sudah dikirim: tidak ada yang dikerjakan")
		return nil
	}

	// 2. Satu transaction per baris: jurnal dan baris_pencairan.jurnal_id di-COMMIT bersama.
	if status == "dibuat" {
		if err := jurnalkan(ctx, db, id); err != nil {
			return err
		}
	}

	// 3. File dibuat dari database, dicocokkan dengan ledger, baru diberi nama akhir.
	return buatFile(ctx, db, id, periode, dir, dobel)
}

func barisBatch(ctx context.Context, q interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
}, id int64) ([]baris, error) {
	rows, _ := q.Query(ctx, `
		SELECT b.buku_id, a.id, a.nama, b.jumlah, coalesce(b.jurnal_id, 0)
		FROM baris_pencairan b JOIN buku k ON k.id = b.buku_id JOIN akun a ON a.id = k.akun_id
		WHERE b.batch_id = $1 ORDER BY b.buku_id`, id)
	return pgx.CollectRows(rows, func(r pgx.CollectableRow) (baris, error) {
		var w baris
		err := r.Scan(&w.buku, &w.akun, &w.nama, &w.jumlah, &w.jurnal)
		return w, err
	})
}

func jurnalkan(ctx context.Context, db *pgx.Conn, id int64) error {
	daftar, err := barisBatch(ctx, db, id)
	if err != nil {
		return err
	}
	periode := ""
	if err := db.QueryRow(ctx, `SELECT periode FROM batch_pencairan WHERE id = $1`, id).Scan(&periode); err != nil {
		return err
	}
	for i, w := range daftar {
		n := i + 1
		if w.jurnal != 0 {
			fmt.Printf("baris %d %s: sudah dicatat jurnal %d, dilewati\n", n, w.nama, w.jurnal)
			continue
		}
		tx, err := db.Begin(ctx)
		if err != nil {
			return err
		}
		defer tx.Rollback(ctx)
		// Kunci baris. Kalau proses lain sudah mencatatnya sesudah daftar dibaca, baris tidak cocok lagi.
		var ada int
		err = tx.QueryRow(ctx, `SELECT 1 FROM baris_pencairan WHERE batch_id = $1 AND buku_id = $2 AND jurnal_id IS NULL FOR UPDATE`,
			id, w.buku).Scan(&ada)
		if errors.Is(err, pgx.ErrNoRows) {
			tx.Rollback(ctx)
			fmt.Printf("baris %d %s: sudah dicatat proses lain, dilewati\n", n, w.nama)
			continue
		}
		if err != nil {
			return err
		}
		// Kunci buku warung, lalu pastikan saldo masih cukup untuk jumlah yang dibekukan.
		var saldo int64
		if _, err := tx.Exec(ctx, `SELECT 1 FROM buku WHERE id = $1 FOR UPDATE`, w.buku); err != nil {
			return err
		}
		if err := tx.QueryRow(ctx, `SELECT coalesce(sum(jumlah), 0) FROM posting WHERE buku_id = $1`, w.buku).Scan(&saldo); err != nil {
			return err
		}
		if saldo < w.jumlah {
			return fmt.Errorf("saldo %s %s kurang dari baris pencairan %s; batch %d berhenti", w.nama, rp(saldo), rp(w.jumlah), id)
		}
		j, err := catatJurnal(ctx, tx, w, periode)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE baris_pencairan SET jurnal_id = $3 WHERE batch_id = $1 AND buku_id = $2`, id, w.buku, j); err != nil {
			return err
		}
		berhenti(fmt.Sprintf("jurnal:%d", n))
		if err := tx.Commit(ctx); err != nil {
			return err
		}
		fmt.Printf("baris %d %s %s: jurnal %d COMMIT\n", n, w.nama, rp(w.jumlah), j)
	}
	tag, err := db.Exec(ctx, `
		UPDATE batch_pencairan SET status = 'dijurnal'
		WHERE id = $1 AND status = 'dibuat'
		  AND NOT EXISTS (SELECT 1 FROM baris_pencairan WHERE batch_id = $1 AND jurnal_id IS NULL)`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 1 {
		fmt.Printf("batch %d: dijurnal\n", id)
	}
	berhenti("dijurnal")
	return nil
}

func buatFile(ctx context.Context, db *pgx.Conn, id int64, periode, dir string, dobel int64) error {
	tx, err := db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var status string
	// Satu pembuat file per batch: proses kedua menunggu di sini, lalu melihat status dikirim.
	if err := tx.QueryRow(ctx, `SELECT status FROM batch_pencairan WHERE id = $1 FOR UPDATE`, id).Scan(&status); err != nil {
		return err
	}
	if status == "dikirim" {
		fmt.Println("batch sudah dikirim: tidak ada yang dikerjakan")
		return nil
	}
	if status != "dijurnal" {
		return fmt.Errorf("batch %d berstatus %s, belum semua baris dijurnal", id, status)
	}
	daftar, err := barisBatch(ctx, tx, id)
	if err != nil {
		return err
	}
	akhir := filepath.Join(dir, "pencairan-"+periode+".csv")
	sementara := akhir + ".sementara"
	f, err := os.OpenFile(sementara, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer f.Close()
	// encoding/csv memberi tanda kutip bila nama warung berisi koma; Fprintf versi rentan tidak.
	cw := csv.NewWriter(f)
	cw.Write(strings.Split(kepala, ","))
	for _, w := range daftar {
		r := []string{strconv.FormatInt(w.akun, 10), w.nama, strconv.FormatInt(w.jumlah, 10), "Pencairan Rekeningo " + periode}
		cw.Write(r)
		if w.akun == dobel {
			cw.Write(r) // cacat yang disuntik lab: baris yang sama dua kali, seperti M15
		}
	}
	cw.Flush()
	if err := cw.Error(); err != nil {
		return err
	}
	if err := f.Sync(); err != nil {
		return err
	}

	if err := rekonsiliasi(ctx, tx, id, sementara); err != nil {
		os.Remove(sementara)
		return err
	}
	// Nama akhir baru ada sesudah rekonsiliasi cocok. rename mengganti file lama dalam satu langkah.
	if err := os.Rename(sementara, akhir); err != nil {
		return err
	}
	fmt.Printf("file %s dibuat\n", filepath.Base(akhir))
	berhenti("file")
	if _, err := tx.Exec(ctx, `UPDATE batch_pencairan SET status = 'dikirim' WHERE id = $1`, id); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	fmt.Printf("batch %d: dikirim\n", id)
	return nil
}

type hitung struct {
	nama   string
	n      int64
	jumlah int64
}

// rekonsiliasi membaca ulang file yang akan diunggah, lalu mencocokkannya dengan jurnal pencairan batch ini di
// ledger: per warung (banyak baris dan jumlah), total, dan mutasi buku kas pencairan. Jurnal pembalik yang membalik
// jurnal pencairan batch ini ikut dijumlah, jadi pencairan yang dibatalkan di ledger tidak lolos ke file.
func rekonsiliasi(ctx context.Context, tx pgx.Tx, id int64, path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	rec, err := csv.NewReader(f).ReadAll()
	if err != nil {
		return err
	}
	if len(rec) == 0 || strings.Join(rec[0], ",") != kepala {
		return fmt.Errorf("kepala file bukan %q", kepala)
	}
	file := map[int64]*hitung{}
	var fileN, fileTotal int64
	for _, r := range rec[1:] {
		akun, err1 := strconv.ParseInt(r[0], 10, 64)
		jml, err2 := strconv.ParseInt(r[2], 10, 64)
		if err := errors.Join(err1, err2); err != nil {
			return err
		}
		if file[akun] == nil {
			file[akun] = &hitung{nama: r[1]}
		}
		file[akun].n++
		file[akun].jumlah += jml
		fileN++
		fileTotal += jml
	}

	ledger := map[int64]*hitung{}
	rows, _ := tx.Query(ctx, `
		SELECT k.akun_id, a.nama, count(*) FILTER (WHERE j.jenis = 'pencairan'), -sum(p.jumlah)
		FROM baris_pencairan b
		JOIN jurnal j  ON j.id = b.jurnal_id OR j.membalik_jurnal_id = b.jurnal_id
		JOIN posting p ON p.jurnal_id = j.id
		JOIN buku k    ON k.id = p.buku_id AND k.jenis = 'warung'
		JOIN akun a    ON a.id = k.akun_id
		WHERE b.batch_id = $1
		GROUP BY k.akun_id, a.nama`, id)
	var akun int64
	var h hitung
	if _, err := pgx.ForEachRow(rows, []any{&akun, &h.nama, &h.n, &h.jumlah}, func() error {
		c := h
		ledger[akun] = &c
		return nil
	}); err != nil {
		return err
	}
	var kas, jurnalN int64
	if err := tx.QueryRow(ctx, `
		SELECT coalesce(sum(p.jumlah), 0), count(DISTINCT j.id) FILTER (WHERE j.jenis = 'pencairan')
		FROM baris_pencairan b
		JOIN jurnal j  ON j.id = b.jurnal_id OR j.membalik_jurnal_id = b.jurnal_id
		JOIN posting p ON p.jurnal_id = j.id
		JOIN buku k    ON k.id = p.buku_id AND k.jenis = 'kas_pencairan'
		WHERE b.batch_id = $1`, id).Scan(&kas, &jurnalN); err != nil {
		return err
	}

	fmt.Printf("rekonsiliasi batch %d: file %d baris %s; ledger %d jurnal pencairan, kas pencairan +%s\n",
		id, fileN, rp(fileTotal), jurnalN, rp(kas))
	var semua []int64
	for a := range file {
		semua = append(semua, a)
	}
	for a := range ledger {
		if file[a] == nil {
			semua = append(semua, a)
		}
	}
	sort.Slice(semua, func(i, j int) bool { return semua[i] < semua[j] })
	beda := 0
	for _, a := range semua {
		fh, lh := file[a], ledger[a]
		if fh == nil {
			fh = &hitung{nama: lh.nama}
		}
		if lh == nil {
			lh = &hitung{nama: fh.nama}
		}
		if fh.n != lh.n || fh.jumlah != lh.jumlah {
			beda++
			fmt.Printf("  beda %d %s: file %d baris %s, ledger %d jurnal %s\n", a, fh.nama, fh.n, rp(fh.jumlah), lh.n, rp(lh.jumlah))
		}
	}
	if beda > 0 || fileN != jurnalN || fileTotal != kas {
		fmt.Printf("rekonsiliasi: DITOLAK (%d warung beda, selisih total %s)\n", beda, rp(fileTotal-kas))
		return errDitolak
	}
	fmt.Println("rekonsiliasi: cocok")
	return nil
}

// rp menulis rupiah dengan titik ribuan: Rp2.450.000.
func rp(n int64) string {
	tanda := ""
	if n < 0 {
		tanda, n = "-", -n
	}
	s := strconv.FormatInt(n, 10)
	for i := len(s) - 3; i > 0; i -= 3 {
		s = s[:i] + "." + s[i:]
	}
	return tanda + "Rp" + s
}
