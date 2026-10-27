// Package redisbatas adalah satu-satunya tempat api-t4 bicara dengan Redis: penghitung rate limit yang dipakai
// semua instance (ADR 27, keputusan 965). Redis hanya menyimpan hitungan per jendela waktu; yang boleh hilang
// bila Redis restart. Tidak ada uang, sesi, atau antrean di sini (naskah bagian 3, "dua tempat").
package redisbatas

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// diam membuang log internal go-redis. Library itu menulis satu baris ke stderr untuk setiap koneksi yang gagal;
// pada frekuensi login, Redis yang mati akan membanjiri log. Kegagalan tidak hilang: service.PembatasBersama
// menghitungnya dan mencatat satu baris saat keadaan berubah.
type diam struct{}

func (diam) Printf(context.Context, string, ...interface{}) {}

func init() { redis.SetLogger(diam{}) }

// --8<-- [start:skrip]
// skrip menaikkan hitungan satu key dan memasang masa berlakunya dalam SATU perintah di sisi Redis, jadi tidak ada
// celah di antara INCR dan EXPIRE. Dua perintah terpisah meninggalkan key tanpa masa berlaku bila proses mati di
// antaranya (redis.io/docs/latest/commands/incr, pola 2: "race"); key itu lalu menghitung selamanya.
// Cabang PTTL < 0 juga memperbaiki key yang sudah telanjur tanpa masa berlaku.
var skrip = redis.NewScript(`
local n = redis.call('INCR', KEYS[1])
if n == 1 or redis.call('PTTL', KEYS[1]) < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return {n, redis.call('PTTL', KEYS[1])}
`)

// --8<-- [end:skrip]

// Klien memenuhi service.Penghitung.
type Klien struct {
	rdb *redis.Client
}

// --8<-- [start:opsi]
// Baru membuka client dengan batas waktu yang ditulis di sini. Bawaan go-redis v9.23.0 (dokumentasi options.go):
// DialTimeout, ReadTimeout, dan WriteTimeout 5 detik, MaxRetries 3, DialerRetries 5. Untuk jalur login, itu berarti
// Redis yang menggantung menahan satu login sampai puluhan detik. timeout > 0 menggantinya dengan satu batas
// untuk semuanya, tanpa retry; timeout 0 membiarkan bawaan go-redis (hanya untuk rekaman perbandingan).
func Baru(alamat string, timeout time.Duration) *Klien {
	o := &redis.Options{Addr: alamat}
	if timeout > 0 {
		o.DialTimeout, o.ReadTimeout, o.WriteTimeout, o.PoolTimeout = timeout, timeout, timeout, timeout
		o.MaxRetries = -1 // -1 mematikan retry; 0 berarti bawaan (3 kali)
		o.DialerRetries = 1
		o.ContextTimeoutEnabled = true
	}
	return &Klien{rdb: redis.NewClient(o)}
}

// --8<-- [end:opsi]

// Naik menaikkan hitungan key dan mengembalikan hitungan sesudahnya serta sisa masa berlaku jendela.
func (k *Klien) Naik(ctx context.Context, key string, jendela time.Duration) (int64, time.Duration, error) {
	hasil, err := skrip.Run(ctx, k.rdb, []string{key}, jendela.Milliseconds()).Int64Slice()
	if err != nil {
		return 0, 0, err
	}
	return hasil[0], time.Duration(hasil[1]) * time.Millisecond, nil
}

// Tutup melepas koneksi.
func (k *Klien) Tutup() error { return k.rdb.Close() }
