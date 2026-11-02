package main

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// diam membuang log internal go-redis (sama dengan api-t5 internal/redisbatas): kegagalan dihitung dan dijawab 503.
type diam struct{}

func (diam) Printf(context.Context, string, ...interface{}) {}

func init() { redis.SetLogger(diam{}) }

// --8<-- [start:bucket]
// skripBucket adalah token bucket per kunci dalam SATU perintah di sisi Redis: baca, isi ulang menurut waktu yang
// lewat, ambil satu token, dan tulis kembali tidak punya celah di antaranya (GET lalu SET dari dua instance gerbang
// mengambil token yang sama). ARGV[1] = waktu dalam milidetik, atau 0 untuk memakai jam Redis sendiri (semua instance
// gerbang membaca jam yang sama); ARGV[2] = token per detik; ARGV[3] = kapasitas.
var skripBucket = redis.NewScript(`
local sekarang = tonumber(ARGV[1])
if sekarang == 0 then
  local t = redis.call('TIME')
  sekarang = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
end
local laju = tonumber(ARGV[2])
local kapasitas = tonumber(ARGV[3])
local d = redis.call('HMGET', KEYS[1], 'token', 'ts')
local token = tonumber(d[1])
local ts = tonumber(d[2])
if token == nil then
  token = kapasitas
  ts = sekarang
end
if sekarang > ts then
  token = math.min(kapasitas, token + (sekarang - ts) * laju / 1000)
  ts = sekarang
end
local boleh = 0
if token >= 1 then
  token = token - 1
  boleh = 1
end
redis.call('HSET', KEYS[1], 'token', tostring(token), 'ts', tostring(ts))
redis.call('PEXPIRE', KEYS[1], math.ceil(kapasitas / laju * 1000) * 2 + 1000)
local tunggu = 0
if boleh == 0 then
  tunggu = math.ceil((1 - token) * 1000 / laju)
end
return {boleh, math.floor(token), tunggu}
`)

// --8<-- [end:bucket]

// --8<-- [start:berjalan]
// skripMasuk menaikkan hitungan permintaan yang sedang berjalan dan menolaknya bila melewati batas. Masa berlaku
// (ARGV[2], milidetik) dipasang tiap kali dan lebih panjang dari timeout gerbang: bila gerbang mati sebelum Keluar,
// hitungan yang bocor sembuh sendiri.
var skripMasuk = redis.NewScript(`
local n = redis.call('INCR', KEYS[1])
redis.call('PEXPIRE', KEYS[1], ARGV[2])
if n > tonumber(ARGV[1]) then
  redis.call('DECR', KEYS[1])
  return 0
end
return n
`)

// skripKeluar mengurangi hitungan, tidak pernah di bawah nol.
var skripKeluar = redis.NewScript(`
local n = tonumber(redis.call('GET', KEYS[1]))
if n ~= nil and n > 0 then
  return redis.call('DECR', KEYS[1])
end
return 0
`)

// --8<-- [end:berjalan]

// skripGagal: hitungan per jendela tetap, INCR dan PEXPIRE dalam satu perintah (pola api-t5 internal/redisbatas).
var skripGagal = redis.NewScript(`
local n = redis.call('INCR', KEYS[1])
if n == 1 or redis.call('PTTL', KEYS[1]) < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return n
`)

// Alasan penolakan kuota.
const (
	AlasanLaju     = "kuota-terlampaui"
	AlasanBerjalan = "terlalu-banyak-berjalan"
)

// Putusan adalah jawaban Pembatas untuk satu permintaan.
type Putusan struct {
	Boleh    bool
	Alasan   string
	TungguMs int64
}

// Pembatas memegang kuota per kunci (mitra) di Redis: token bucket untuk laju dan hitungan permintaan berjalan.
type Pembatas struct {
	rdb       *redis.Client
	Awalan    string
	Berjalan  int           // batas permintaan berjalan per kunci
	Napas     time.Duration // masa berlaku hitungan berjalan
	Jam       func() int64  // milidetik; nil berarti jam Redis
	Timeout   time.Duration
	JendelaGl time.Duration // jendela hitungan kegagalan autentikasi per IP
}

func BuatPembatas(alamat, awalan string, berjalan int) *Pembatas {
	o := &redis.Options{Addr: alamat, DialTimeout: 500 * time.Millisecond, ReadTimeout: 500 * time.Millisecond,
		WriteTimeout: 500 * time.Millisecond, PoolTimeout: 500 * time.Millisecond, MaxRetries: -1, DialerRetries: 1,
		ContextTimeoutEnabled: true}
	return &Pembatas{rdb: redis.NewClient(o), Awalan: awalan, Berjalan: berjalan, Napas: 10 * time.Second,
		Timeout: 500 * time.Millisecond, JendelaGl: 60 * time.Second}
}

func (p *Pembatas) Tutup() error { return p.rdb.Close() }

func (p *Pembatas) ctx(parent context.Context) (context.Context, context.CancelFunc) {
	return context.WithTimeout(parent, p.Timeout)
}

// Masuk memeriksa dua batas untuk satu kunci. Urutannya: permintaan berjalan dulu, supaya yang ditolak karena terlalu
// banyak berjalan tidak memakai token; lalu token bucket. Bila token habis, slot berjalan dilepas lagi. Boleh = true
// berarti pemanggil WAJIB memanggil Keluar.
func (p *Pembatas) Masuk(parent context.Context, kunci string, perDetik int) (Putusan, error) {
	ctx, batal := p.ctx(parent)
	defer batal()
	n, err := skripMasuk.Run(ctx, p.rdb, []string{p.Awalan + "jalan:" + kunci}, p.Berjalan, p.Napas.Milliseconds()).Int64()
	if err != nil {
		return Putusan{}, err
	}
	if n == 0 {
		return Putusan{Alasan: AlasanBerjalan, TungguMs: 1000}, nil
	}
	var ms int64
	if p.Jam != nil {
		ms = p.Jam()
	}
	hasil, err := skripBucket.Run(ctx, p.rdb, []string{p.Awalan + "bucket:" + kunci}, ms, perDetik, perDetik).Int64Slice()
	if err != nil {
		_, _ = skripKeluar.Run(ctx, p.rdb, []string{p.Awalan + "jalan:" + kunci}).Result()
		return Putusan{}, err
	}
	if hasil[0] == 0 {
		_, _ = skripKeluar.Run(ctx, p.rdb, []string{p.Awalan + "jalan:" + kunci}).Result()
		return Putusan{Alasan: AlasanLaju, TungguMs: hasil[2]}, nil
	}
	return Putusan{Boleh: true}, nil
}

// Keluar melepas satu slot berjalan. Pakai konteks baru: client yang sudah pergi tidak boleh meninggalkan slot.
func (p *Pembatas) Keluar(kunci string) {
	ctx, batal := p.ctx(context.Background())
	defer batal()
	_, _ = skripKeluar.Run(ctx, p.rdb, []string{p.Awalan + "jalan:" + kunci}).Result()
}

// Gagal menambah hitungan kegagalan autentikasi untuk satu alamat dan mengembalikan hitungan jendela ini.
func (p *Pembatas) Gagal(parent context.Context, alamat string) (int64, error) {
	ctx, batal := p.ctx(parent)
	defer batal()
	return skripGagal.Run(ctx, p.rdb, []string{p.Awalan + "gagal:" + alamat}, p.JendelaGl.Milliseconds()).Int64()
}

// SudahGagal membaca hitungan tanpa menambah.
func (p *Pembatas) SudahGagal(parent context.Context, alamat string) (int64, error) {
	ctx, batal := p.ctx(parent)
	defer batal()
	n, err := p.rdb.Get(ctx, p.Awalan+"gagal:"+alamat).Int64()
	if err == redis.Nil {
		return 0, nil
	}
	return n, err
}
