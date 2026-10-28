//go:build t4audit

package jangkar

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"

	"lab/apit4/internal/repo"
)

// Tes jangkar harian (ADR 43, lab t4-audit). Hanya dengan -tags t4audit. Tes berkas tidak butuh database; tes Jalankan
// butuh schema tes yang dibangun labs/t4-audit/run.py (TEST_DATABASE_URL, sebagai pemilik) dan mengosongkan audit_log.

const hashA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const hashB = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

func berkasBaru(t *testing.T) Berkas {
	return Berkas{Path: filepath.Join(t.TempDir(), "jangkar.jsonl")}
}

func TestT4ABerkasJangkarBelumAdaBerartiBelumAdaJangkar(t *testing.T) {
	j, err := berkasBaru(t).Baca()
	if err != nil || len(j) != 0 {
		t.Fatalf("%v %v", j, err)
	}
}

func TestT4ABerkasJangkarHanyaBertambahDanUrut(t *testing.T) {
	b := berkasBaru(t)
	for _, j := range []repo.Jangkar{{ID: 3, Hash: hashA}, {ID: 9, Hash: hashB}} {
		if err := b.Tambah(j); err != nil {
			t.Fatal(err)
		}
	}
	got, err := b.Baca()
	if err != nil || len(got) != 2 || got[0] != (repo.Jangkar{ID: 3, Hash: hashA}) || got[1] != (repo.Jangkar{ID: 9, Hash: hashB}) {
		t.Fatalf("%v %v", got, err)
	}
	if err := b.Tambah(repo.Jangkar{ID: 12, Hash: hashA}); err != nil {
		t.Fatal(err)
	}
	got, _ = b.Baca()
	if len(got) != 3 || got[0].ID != 3 {
		t.Fatalf("menambah mengubah baris lama: %v", got)
	}
}

// Jangkar yang rusak tidak dilewati: itu sama dengan tidak punya jangkar.
func TestT4ABerkasJangkarRusakDitolak(t *testing.T) {
	for nama, isi := range map[string]string{
		"bukan JSON":        "bukan json\n",
		"nomor nol":         `{"id":0,"hash":"` + hashA + `"}` + "\n",
		"nomor negatif":     `{"id":-4,"hash":"` + hashA + `"}` + "\n",
		"hash pendek":       `{"id":3,"hash":"abc"}` + "\n",
		"hash huruf besar":  `{"id":3,"hash":"` + strings.ToUpper(hashA) + `"}` + "\n",
		"hash tanpa nomor":  `{"hash":"` + hashA + `"}` + "\n",
		"hash berspasi":     `{"id":3,"hash":"` + hashA + ` "}` + "\n",
		"baris kosong":      `{"id":3,"hash":"` + hashA + `"}` + "\n\n",
		"baris kedua rusak": `{"id":3,"hash":"` + hashA + `"}` + "\n" + `{"id":4,` + "\n",
	} {
		b := berkasBaru(t)
		if err := os.WriteFile(b.Path, []byte(isi), 0o644); err != nil {
			t.Fatal(err)
		}
		if got, err := b.Baca(); err == nil {
			t.Errorf("%s: dibaca sebagai %v, ingin galat", nama, got)
		}
	}
}

func bukaTes(t *testing.T) (repo.Repo, *sql.DB, int64) {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Fatal("TEST_DATABASE_URL kosong: tes ini dijalankan oleh labs/t4-audit/run.py")
	}
	db, err := sql.Open("pgx", url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	if _, err := db.Exec(`TRUNCATE audit_log RESTART IDENTITY`); err != nil {
		t.Fatal(err)
	}
	var pelaku int64
	if err := db.QueryRow(`SELECT min(id) FROM akun WHERE jenis = 'risk'`).Scan(&pelaku); err != nil || pelaku == 0 {
		t.Fatalf("akun risk tidak ada (data awal): %v", err)
	}
	return repo.Baru(db), db, pelaku
}

func tulisBaris(t *testing.T, r repo.Repo, pelaku int64, n int) {
	t.Helper()
	for i := 0; i < n; i++ {
		err := r.DalamTx(context.Background(), func(tx repo.Tx) error {
			_, err := tx.TulisAudit(context.Background(), time.Date(2026, 10, 26, 3, 0, i, 0, time.UTC), pelaku, "risk", "aksi_uji", "akun:1", "alasan uji jangkar", nil)
			return err
		})
		if err != nil {
			t.Fatal(err)
		}
	}
}

func TestT4AJalankanMenjangkarkanBarisTerakhirSekaliDanTidakDuaKali(t *testing.T) {
	r, _, pelaku := bukaTes(t)
	b := berkasBaru(t)
	ctx := context.Background()
	if l, err := Jalankan(ctx, r, b); err != nil || l.JangkarBaru != nil || !l.Sehat() || l.Baris != 0 {
		t.Fatalf("log kosong: %+v %v", l, err)
	}
	tulisBaris(t, r, pelaku, 3)
	l, err := Jalankan(ctx, r, b)
	if err != nil || l.JangkarBaru == nil || l.JangkarBaru.ID != 3 || l.Baris != 3 || l.JangkarLama != 0 {
		t.Fatalf("pertama: %+v %v", l, err)
	}
	h, _ := r.VerifikasiAudit(ctx)
	if l.JangkarBaru.Hash != h.HashTerakhir {
		t.Fatal("jangkar bukan hash baris terakhir")
	}
	l, err = Jalankan(ctx, r, b)
	if err != nil || l.JangkarBaru != nil || l.JangkarLama != 1 || !l.Sehat() {
		t.Fatalf("kedua tanpa baris baru: %+v %v", l, err)
	}
	if got, _ := b.Baca(); len(got) != 1 {
		t.Fatalf("%d jangkar sesudah dua kali, ingin 1", len(got))
	}
	tulisBaris(t, r, pelaku, 2)
	l, err = Jalankan(ctx, r, b)
	if err != nil || l.JangkarBaru == nil || l.JangkarBaru.ID != 5 || l.JangkarLama != 1 {
		t.Fatalf("ketiga dengan baris baru: %+v %v", l, err)
	}
	if got, _ := b.Baca(); len(got) != 2 || got[0].ID != 3 {
		t.Fatalf("jangkar lama berubah: %v", got)
	}
}

// Keadaan yang sudah rusak tidak pernah dijangkarkan: rantai putus atau jangkar lama tidak cocok berarti tidak ada
// jangkar baru, dan jangkar lama tidak ditimpa.
func TestT4AJalankanTidakMenjangkarkanKeadaanRusak(t *testing.T) {
	r, db, pelaku := bukaTes(t)
	b := berkasBaru(t)
	ctx := context.Background()
	tulisBaris(t, r, pelaku, 3)
	if _, err := Jalankan(ctx, r, b); err != nil {
		t.Fatal(err)
	}
	tulisBaris(t, r, pelaku, 2)
	// 1. Rantai putus di tengah.
	if _, err := db.Exec(`UPDATE audit_log SET aksi = 'dipalsukan' WHERE id = 2`); err != nil {
		t.Fatal(err)
	}
	l, err := Jalankan(ctx, r, b)
	if err != nil || l.RusakDiID != 2 || l.JangkarBaru != nil || l.Sehat() {
		t.Fatalf("rantai putus: %+v %v", l, err)
	}
	if _, err := db.Exec(`UPDATE audit_log SET aksi = 'aksi_uji' WHERE id = 2`); err != nil {
		t.Fatal(err)
	}
	// 2. Ekor lama dipotong: jangkar nomor 3 hilang.
	if _, err := db.Exec(`DELETE FROM audit_log WHERE id >= 3`); err != nil {
		t.Fatal(err)
	}
	l, err = Jalankan(ctx, r, b)
	if err != nil || len(l.Temuan) != 1 || l.Temuan[0].Masalah != repo.JangkarBarisHilang || l.JangkarBaru != nil || l.Sehat() {
		t.Fatalf("ekor dipotong: %+v %v", l, err)
	}
	if got, _ := b.Baca(); len(got) != 1 {
		t.Fatalf("jangkar bertambah dari keadaan rusak: %v", got)
	}
}

func TestT4AJalankanJangkarRusakMenggagalkanPemeriksaan(t *testing.T) {
	r, _, pelaku := bukaTes(t)
	tulisBaris(t, r, pelaku, 1)
	b := berkasBaru(t)
	if err := os.WriteFile(b.Path, []byte("rusak\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := Jalankan(context.Background(), r, b); err == nil {
		t.Fatal("berkas jangkar rusak diterima")
	}
}
