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
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
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
	default:
		err = fmt.Errorf("mode %q tidak dikenal", *mode)
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
