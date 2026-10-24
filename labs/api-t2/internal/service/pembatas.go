package service

import (
	"fmt"
	"math"
	"net"
	"sync"
	"time"
)

// --8<-- [start:pembatas]
// Pembatas adalah rate limit token bucket di memori satu proses, pola yang sama dengan
// labs/c4-ratelimit/login (ADR 20, keputusan 545). Setiap key punya bucket berisi paling banyak `kapasitas`
// token; satu request mengambil satu token, dan token terisi lagi `perDetik`. Restart mengosongkan semua bucket,
// dan dua instance punya bucket terpisah: cukup untuk satu server Tahap 2, pecah di Tahap 3 (naskah bagian 6).
type Pembatas struct {
	mu        sync.Mutex
	kapasitas float64
	perDetik  float64
	bucket    map[string]*bucket
}

type bucket struct {
	token    float64
	terakhir time.Time
}

// maksKey: di atas jumlah ini, bucket yang sudah penuh lagi dibuang. Bucket penuh sama dengan bucket baru,
// jadi membuangnya tidak mengubah hasil, dan email acak dari penyerang tidak menumpuk di memori.
const maksKey = 10_000

func PembatasBaru(kapasitas, perDetik float64) *Pembatas {
	return &Pembatas{kapasitas: kapasitas, perDetik: perDetik, bucket: map[string]*bucket{}}
}

// Izinkan mengambil satu token dari bucket milik key. Bila kosong, kembalikan lama menunggu token berikutnya.
func (p *Pembatas) Izinkan(key string, kini time.Time) (bool, time.Duration) {
	p.mu.Lock()
	defer p.mu.Unlock()
	b, ada := p.bucket[key]
	if !ada {
		if len(p.bucket) >= maksKey {
			for k, lama := range p.bucket {
				if lama.token+kini.Sub(lama.terakhir).Seconds()*p.perDetik >= p.kapasitas {
					delete(p.bucket, k)
				}
			}
		}
		b = &bucket{token: p.kapasitas, terakhir: kini}
		p.bucket[key] = b
	}
	b.token = math.Min(p.kapasitas, b.token+kini.Sub(b.terakhir).Seconds()*p.perDetik)
	b.terakhir = kini
	if b.token >= 1 {
		b.token--
		return true, 0
	}
	return false, time.Duration((1 - b.token) / p.perDetik * float64(time.Second))
}

// KunciAlamat: key bucket per IP. IPv4 apa adanya; IPv6 dipotong ke prefix /64, karena satu HP di jaringan seluler
// mendapat satu /64 dan boleh memakai alamat apa pun di dalamnya (RFC 6459 bagian 5.2). Tanpa dipotong, penyerang
// berganti alamat di setiap request dan lapis per IP tidak menahan apa pun (keputusan 719).
func KunciAlamat(alamat string) string {
	ip := net.ParseIP(alamat)
	switch {
	case ip == nil:
		return alamat
	case ip.To4() != nil:
		return ip.To4().String()
	default:
		return ip.Mask(net.CIDRMask(64, 128)).String() + "/64"
	}
}

// --8<-- [end:pembatas]

// ErrTerlaluSering: bucket rate limit kosong. Lapis "ip" atau "akun"; Tunggu = sampai token berikutnya.
type ErrTerlaluSering struct {
	Lapis  string
	Tunggu time.Duration
}

func (e ErrTerlaluSering) Error() string {
	return fmt.Sprintf("terlalu sering (per %s), tunggu %s", e.Lapis, e.Tunggu)
}

// TungguDetik dibulatkan ke atas, untuk header Retry-After (RFC 9110 bagian 10.2.3: bilangan bulat detik).
func (e ErrTerlaluSering) TungguDetik() int { return int(math.Ceil(e.Tunggu.Seconds())) }

// --8<-- [start:ambang]
// Ambang lab-api-t2a (keputusan 645). Login sama dengan labs/c4-ratelimit/login (keputusan 545); kiriman dari
// asumsi registry Tahap 2 (1.000 user, 30% aktif, 2 transaksi per hari, puncak 10x): puncak seluruh kampus
// ±4,2 transaksi per menit, jadi 6 per menit per IP masih lolos walau semua HP keluar lewat satu IP kantor (NAT).
var (
	AmbangLoginIP   = [2]float64{10, 10.0 / 60} // 10 percobaan, isi ulang 10 per menit (handler, per IP)
	AmbangLoginAkun = [2]float64{5, 5.0 / 60}   // 5 percobaan, isi ulang 5 per menit (per email)
	AmbangKirimIP   = [2]float64{30, 6.0 / 60}  // 30 kiriman, isi ulang 6 per menit (handler, per IP)
	AmbangKirimAkun = [2]float64{15, 1.0 / 600} // 15 kiriman, isi ulang 1 per 10 menit (per akun pengirim)
)

// --8<-- [end:ambang]
