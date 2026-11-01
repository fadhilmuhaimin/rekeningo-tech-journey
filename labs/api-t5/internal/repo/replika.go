package repo

import (
	"context"
	"database/sql"
)

// --8<-- [start:lsn]
// LSNTulis membaca posisi tulis WAL di primary. Handler memanggilnya SESUDAH COMMIT dan mengirim hasilnya ke app
// sebagai token baca-sesudah-tulis (ADR 47): posisi ini tidak lebih kecil dari rekaman commit milik penulis, jadi
// replica yang sudah memutar ulang sampai posisi ini pasti memuat tulisan itu.
func (r Repo) LSNTulis(ctx context.Context) (string, error) {
	var lsn string
	err := r.db.QueryRowContext(ctx, `SELECT pg_current_wal_lsn()::text`).Scan(&lsn)
	return lsn, err
}

// SampaiLSN bertanya ke sebuah replica apakah ia sudah memutar ulang WAL sampai posisi lsn. Di server yang bukan
// replica (atau replica yang belum memutar apa pun) pg_last_wal_replay_lsn() NULL, dan jawabannya false: tidak tahu
// dibaca sebagai belum sampai.
func (r Repo) SampaiLSN(ctx context.Context, lsn string) (bool, error) {
	var sampai sql.NullBool
	err := r.db.QueryRowContext(ctx, `SELECT pg_last_wal_replay_lsn() >= $1::pg_lsn`, lsn).Scan(&sampai)
	return sampai.Valid && sampai.Bool, err
}

// --8<-- [end:lsn]
