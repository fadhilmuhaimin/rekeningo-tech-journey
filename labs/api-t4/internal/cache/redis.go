package cache

import (
	"context"
	"errors"
	"time"

	"github.com/redis/go-redis/v9"
)

// Redis adalah Penyimpan di Redis lewat go-redis v9 (GET, SET dengan TTL, DEL, SCAN). Opsinya sama dengan
// `internal/redisbatas`: batas waktu dial, tulis, baca, dan antre di pool diisi `batas` (bawaan go-redis 5 detik,
// R3-12), retry dimatikan (`MaxRetries: -1`; 0 berarti bawaan 3 kali), dan dial dicoba sekali. Redis yang mati atau
// menggantung membuat satu perintah paling lama beberapa kali `batas` (dial, tulis, baca masing-masing sampai
// `batas`), lalu galat.
type Redis struct {
	rdb *redis.Client
}

// BaruRedis membuka klien ke `alamat`; `batas` harus lebih dari 0 (nol di go-redis berarti bawaan 5 detik).
func BaruRedis(alamat string, batas time.Duration) Redis {
	return Redis{rdb: redis.NewClient(&redis.Options{
		Addr:                  alamat,
		DialTimeout:           batas,
		ReadTimeout:           batas,
		WriteTimeout:          batas,
		PoolTimeout:           batas,
		MaxRetries:            -1,
		DialerRetries:         1,
		ContextTimeoutEnabled: true,
	})}
}

func (r Redis) Ambil(ctx context.Context, kunci string) ([]byte, bool, error) {
	b, err := r.rdb.Get(ctx, kunci).Bytes()
	if errors.Is(err, redis.Nil) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	return b, true, nil
}

func (r Redis) Simpan(ctx context.Context, kunci string, nilai []byte, ttl time.Duration) error {
	return r.rdb.Set(ctx, kunci, nilai, ttl).Err()
}

func (r Redis) Hapus(ctx context.Context, kunci string) (int, error) {
	n, err := r.rdb.Del(ctx, kunci).Result()
	return int(n), err
}

// HapusAwalan: SCAN dengan MATCH awalan*, lalu DEL. Awalan tidak boleh berisi karakter glob (* ? [ ] \); kunci
// katalog hanya berisi huruf kecil, angka, dan titik dua.
func (r Redis) HapusAwalan(ctx context.Context, awalan string) (int, error) {
	var kursor uint64
	total := 0
	for {
		daftar, next, err := r.rdb.Scan(ctx, kursor, awalan+"*", 200).Result()
		if err != nil {
			return total, err
		}
		if len(daftar) > 0 {
			n, err := r.rdb.Del(ctx, daftar...).Result()
			if err != nil {
				return total, err
			}
			total += int(n)
		}
		if next == 0 {
			return total, nil
		}
		kursor = next
	}
}
