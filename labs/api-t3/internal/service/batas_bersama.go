package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"log"
	"sync/atomic"
	"time"
)

// Batas adalah satu rate limit: ambil satu jatah untuk key, atau tahu berapa lama menunggu. *Pembatas (token bucket
// di memori satu proses, ADR 20) dan *PembatasBersama (hitungan di Redis, ADR 27) sama-sama memenuhinya, jadi
// handler dan service tidak tahu mana yang dipakai.
type Batas interface {
	Izinkan(key string, kini time.Time) (bool, time.Duration)
}

// JendelaLogin: jendela hitungan bersama untuk login. Batasnya sama dengan kapasitas bucket (AmbangLoginIP: 10,
// AmbangLoginAkun: 5) dan 60 detik sama dengan isi ulang 10 dan 5 per menit di bucket yang digantikannya.
const JendelaLogin = time.Minute

// Penghitung adalah satu operasi atomik di penyimpanan bersama: naikkan hitungan key satu kali, pasang masa
// berlaku jendela bila key baru, kembalikan hitungan sesudahnya dan sisa masa berlaku (internal/redisbatas).
type Penghitung interface {
	Naik(ctx context.Context, key string, jendela time.Duration) (n int64, sisa time.Duration, err error)
}

// --8<-- [start:bersama]
// PembatasBersama menghitung percobaan per key di penyimpanan bersama, jadi semua instance melihat hitungan yang
// sama: dua instance tidak lagi memberi dua kali jatah (M22). Jendela tetap: paling banyak `batas` percobaan per
// `jendela`; hitungan mulai dari nol saat key kedaluwarsa. Kelemahannya: di batas dua jendela, paling banyak
// 2 × batas lolos dalam selang pendek.
//
// Bila penyimpanan gagal atau lewat `timeout` (ADR 27: 50 ms), Izinkan memakai bucket lokal. Login tidak boleh
// ikut mati karena penghitung mati, dan hasilnya paling buruk sama dengan sebelum ada Redis: batas per instance.
type PembatasBersama struct {
	hitung  Penghitung
	awalan  string
	batas   int64
	jendela time.Duration
	timeout time.Duration // 0: tidak ada batas dari sini, client yang menentukan
	lokal   *Pembatas
	bersama atomic.Int64 // pemeriksaan yang dijawab penyimpanan bersama
	jatuh   atomic.Int64 // pemeriksaan yang beralih ke bucket lokal
	macet   atomic.Bool  // true sejak pemeriksaan terakhir gagal; hanya perpindahan keadaan yang dicatat di log
}

func PembatasBersamaBaru(h Penghitung, awalan string, batas int, jendela, timeout time.Duration, lokal *Pembatas) *PembatasBersama {
	return &PembatasBersama{hitung: h, awalan: awalan, batas: int64(batas), jendela: jendela, timeout: timeout, lokal: lokal}
}

// Izinkan menaikkan hitungan key. Lewat batas: false dengan sisa jendela sebagai lama menunggu.
func (p *PembatasBersama) Izinkan(key string, kini time.Time) (bool, time.Duration) {
	ctx := context.Background()
	if p.timeout > 0 {
		var batal context.CancelFunc
		ctx, batal = context.WithTimeout(ctx, p.timeout)
		defer batal()
	}
	n, sisa, err := p.hitung.Naik(ctx, p.awalan+kunciRedis(key), p.jendela)
	if err != nil {
		p.jatuh.Add(1)
		if !p.macet.Swap(true) { // satu baris saat mulai gagal, bukan satu baris per login
			log.Printf("batas bersama %s gagal (%v): memakai bucket lokal", p.awalan, err)
		}
		return p.lokal.Izinkan(key, kini)
	}
	if p.macet.Swap(false) {
		log.Printf("batas bersama %s pulih", p.awalan)
	}
	p.bersama.Add(1)
	if n > p.batas {
		return false, max(sisa, time.Second) // Retry-After bilangan bulat detik, paling sedikit 1
	}
	return true, 0
}

// Statistik: berapa pemeriksaan yang dijawab penyimpanan bersama dan berapa yang jatuh ke bucket lokal.
func (p *PembatasBersama) Statistik() (bersama, jatuh int64) { return p.bersama.Load(), p.jatuh.Load() }

// --8<-- [end:bersama]

// kunciRedis: key rate limit berisi email atau alamat IP; hash-nya yang masuk ke keyspace Redis, supaya MONITOR,
// KEYS, dan berkas cadangan Redis tidak memuat email. Ini bukan perlindungan kuat: alamat IPv4 mudah ditebak dari
// hash-nya. Cukup agar data pribadi tidak tersebar sebagai teks biasa.
func kunciRedis(key string) string {
	h := sha256.Sum256([]byte(key))
	return hex.EncodeToString(h[:16])
}
