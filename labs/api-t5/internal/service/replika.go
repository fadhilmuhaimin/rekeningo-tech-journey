package service

import (
	"context"
	"errors"
	"log"
	"regexp"

	"lab/apit5/internal/repo"
)

// Tahap 5 (lab t5-replika): bacaan untuk tampilan (riwayat dan saldo tampil) boleh datang dari replica asinkron,
// dengan satu aturan: yang baru ditulis sendiri dibaca dari primary sampai replica mencapai posisi WAL tulisan itu
// (ADR 47). Keputusan yang menentukan uang tidak lewat sini: Bayar, Kirim, dan semua pemeriksaan saldo memakai
// s.repo, yaitu primary.
const (
	// RentanRiwayatReplika: riwayat dan saldo tampil dibaca dari replica tanpa memeriksa token (M41, versi pertama).
	RentanRiwayatReplika = "riwayat-replika"
	// SumberPrimary dan SumberReplika: nilai header X-Dibaca-Dari, supaya lab bisa merekam dari mana jawaban datang.
	SumberPrimary = "primary"
	SumberReplika = "replika"
)

// polaLSN: posisi WAL ditulis PostgreSQL sebagai dua bilangan heksadesimal dipisah garis miring ("0/3032C60").
var polaLSN = regexp.MustCompile(`^[0-9A-Fa-f]{1,8}/[0-9A-Fa-f]{1,8}$`)

// PembacaReplika adalah sisi replica yang dipakai bacaan tampilan. repo.Repo yang dibuka ke replica memenuhinya.
type PembacaReplika interface {
	Akun(ctx context.Context, id int64) (repo.Akun, error)
	Riwayat(ctx context.Context, akun int64, k *repo.Kursor, batas int) ([]repo.Riwayat, error)
	SampaiLSN(ctx context.Context, lsn string) (bool, error)
}

// pembacaTampil: bagian yang sama dari primary dan replica.
type pembacaTampil interface {
	Akun(ctx context.Context, id int64) (repo.Akun, error)
	Riwayat(ctx context.Context, akun int64, k *repo.Kursor, batas int) ([]repo.Riwayat, error)
}

// DenganReplika memasang replica untuk bacaan tampilan. Tanpa ini semua bacaan dari primary.
func (s Service) DenganReplika(p PembacaReplika) Service { s.replika = p; return s }

// --8<-- [start:sumber-tampil]
// sumberTampil memilih tempat membaca untuk tampilan. token adalah posisi WAL dari jawaban tulis terakhir app
// ("" bila app tidak punya).
//   - Tanpa replica: primary, dan sumbernya kosong (jawaban tidak memuat header sumber).
//   - Mode riwayat-replika (M41): replica, token diabaikan.
//   - Tanpa token: replica (bacaan yang bukan milik sendiri sesudah menulis).
//   - Dengan token: replica hanya bila sudah memutar ulang sampai token; belum sampai, atau replica tidak
//     menjawab, atau tidak tahu: primary.
//
// Token yang bukan posisi WAL ditolak sebelum menyentuh database.
func (s Service) sumberTampil(ctx context.Context, token string) (pembacaTampil, string, error) {
	if s.replika == nil {
		return s.repo, "", nil
	}
	if s.rentan == RentanRiwayatReplika || token == "" {
		return s.replika, SumberReplika, nil
	}
	if !polaLSN.MatchString(token) {
		return nil, "", ErrValidasi{"X-Lsn-Tulis", "posisi WAL seperti 0/3032C60"}
	}
	sampai, err := s.replika.SampaiLSN(ctx, token)
	if err != nil || !sampai {
		if err != nil {
			log.Printf("replica tidak menjawab pemeriksaan LSN, membaca dari primary: %v", err)
		}
		return s.repo, SumberPrimary, nil
	}
	return s.replika, SumberReplika, nil
}

// --8<-- [end:sumber-tampil]

// TokenTulis dipanggil sesudah COMMIT sebuah tulisan milik app dan mengembalikan token baca-sesudah-tulis, atau ""
// bila lab ini tidak memakai replica atau posisinya tidak terbaca (app lalu tidak punya token dan membaca replica).
func (s Service) TokenTulis(ctx context.Context) string {
	if s.replika == nil {
		return ""
	}
	lsn, err := s.repo.LSNTulis(ctx)
	if err != nil {
		log.Printf("posisi WAL tulis tidak terbaca: %v", err)
		return ""
	}
	return lsn
}

// LihatAkunTampil: seperti LihatAkun, tetapi saldo tampil boleh dari replica (aturan sumberTampil). Mengembalikan juga
// sumber bacaannya.
func (s Service) LihatAkunTampil(ctx context.Context, peminta, id int64, token string) (repo.Akun, string, error) {
	if peminta != id {
		return repo.Akun{}, "", ErrTidakDitemukan
	}
	p, sumber, err := s.sumberTampil(ctx, token)
	if err != nil {
		return repo.Akun{}, "", err
	}
	a, err := p.Akun(ctx, id)
	if errors.Is(err, repo.ErrTidakAda) {
		return repo.Akun{}, sumber, ErrTidakDitemukan
	}
	return a, sumber, err
}
