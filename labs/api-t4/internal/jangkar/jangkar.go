// Package jangkar mencatat hash baris terakhir audit_log di berkas di luar database dan mencocokkannya pada pemeriksaan
// berikutnya (ADR 43, lab t4-audit). Berkasnya hanya bertambah: satu baris JSON per jangkar.
//
// Di lab "di luar database" berarti satu berkas di folder sementara yang tidak disentuh role database mana pun. Di
// produksi tempat itu harus akun atau bucket lain dengan hak tulis-sekali; siapa pun yang bisa menulis ulang log dan
// berkas ini sekaligus tidak terdeteksi (Tidak dijalankan di lab).
package jangkar

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"regexp"

	"lab/apit4/internal/repo"
)

var bentukHash = regexp.MustCompile(`^[0-9a-f]{64}$`)

// Berkas adalah lokasi jangkar.
type Berkas struct{ Path string }

// Baca membaca semua jangkar menurut urutan ditulis. Berkas yang belum ada berarti belum ada jangkar. Baris yang
// bukan JSON, bernomor tidak positif, atau berhash bukan 64 heksadesimal membuat pembacaan gagal: jangkar yang rusak
// tidak boleh dilewati diam-diam, karena itu sama dengan tidak punya jangkar.
func (b Berkas) Baca() ([]repo.Jangkar, error) {
	f, err := os.Open(b.Path)
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	defer f.Close()
	var hasil []repo.Jangkar
	sc := bufio.NewScanner(f)
	sc.Buffer(make([]byte, 0, 4096), 1<<20)
	for n := 1; sc.Scan(); n++ {
		var j repo.Jangkar
		if err := json.Unmarshal(sc.Bytes(), &j); err != nil {
			return nil, fmt.Errorf("jangkar baris %d: %w", n, err)
		}
		if j.ID < 1 || !bentukHash.MatchString(j.Hash) {
			return nil, fmt.Errorf("jangkar baris %d: nomor atau hash tidak sah", n)
		}
		hasil = append(hasil, j)
	}
	return hasil, sc.Err()
}

// Tambah menulis satu jangkar di ujung berkas dan memaksa tulisannya ke disk.
func (b Berkas) Tambah(j repo.Jangkar) error {
	f, err := os.OpenFile(b.Path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer f.Close()
	baris, err := json.Marshal(j)
	if err != nil {
		return err
	}
	if _, err := f.Write(append(baris, '\n')); err != nil {
		return err
	}
	return f.Sync()
}

// Laporan adalah hasil satu pemeriksaan harian.
type Laporan struct {
	Baris       int                  // baris audit_log yang dibaca
	RusakDiID   int64                // baris pertama yang rantainya putus; 0 bila utuh
	JangkarLama int                  // jangkar yang dicocokkan
	Temuan      []repo.TemuanJangkar // jangkar yang tidak cocok dengan log sekarang
	JangkarBaru *repo.Jangkar        // jangkar yang ditambahkan; nil bila tidak ada
}

// Sehat: rantai utuh dan semua jangkar lama cocok.
func (l Laporan) Sehat() bool { return l.RusakDiID == 0 && len(l.Temuan) == 0 }

// Jalankan memeriksa rantai dan semua jangkar lama dalam satu lintasan. Hanya bila hasilnya sehat dan log punya baris
// yang belum dijangkarkan, baris terakhir dari lintasan yang sama dicatat sebagai jangkar baru: keadaan yang sudah
// rusak tidak pernah dijangkarkan. Dijalankan dua kali tanpa baris baru tidak menambah jangkar.
func Jalankan(ctx context.Context, r repo.Repo, b Berkas) (Laporan, error) {
	lama, err := b.Baca()
	if err != nil {
		return Laporan{}, err
	}
	h, temuan, err := r.VerifikasiAuditJangkar(ctx, lama)
	if err != nil {
		return Laporan{}, err
	}
	l := Laporan{Baris: h.Baris, RusakDiID: h.RusakDiID, JangkarLama: len(lama), Temuan: temuan}
	if !l.Sehat() || h.Baris == 0 {
		return l, nil
	}
	baru := repo.Jangkar{ID: h.IDTerakhir, Hash: h.HashTerakhir}
	if n := len(lama); n > 0 && lama[n-1] == baru {
		return l, nil
	}
	if err := b.Tambah(baru); err != nil {
		return l, err
	}
	l.JangkarBaru = &baru
	return l, nil
}
