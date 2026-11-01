// Package cache: cache katalog untuk lab t3-cache (keputusan 968). Dua tempat penyimpanan di balik satu antarmuka:
// memori proses (satu salinan per instance) dan Redis (satu salinan bersama). Cache hanya untuk jawaban baca
// katalog; harga yang ditagih selalu dari database (ADR 28), jadi tidak ada jalur uang yang membaca paket ini.
package cache

import (
	"context"
	"sync"
	"sync/atomic"
	"time"
)

// Penyimpan adalah tempat entri. Nilainya JSON jawaban katalog.
type Penyimpan interface {
	Ambil(ctx context.Context, kunci string) (nilai []byte, ada bool, err error)
	Simpan(ctx context.Context, kunci string, nilai []byte, ttl time.Duration) error
	// Hapus mengembalikan 1 bila kuncinya ada dan terhapus, 0 bila tidak ada.
	Hapus(ctx context.Context, kunci string) (int, error)
	// HapusAwalan membuang semua kunci berawalan itu (promo kota: semua entri katalog kota itu).
	HapusAwalan(ctx context.Context, awalan string) (int, error)
}

// ---------- memori proses ----------

type entri struct {
	nilai  []byte
	sampai time.Time
}

// Memori menyimpan entri di peta di dalam proses. Dua instance berarti dua peta yang tidak saling tahu.
type Memori struct {
	mu   sync.Mutex
	m    map[string]entri
	kini func() time.Time
}

// BaruMemori memakai `kini` sebagai jam (lab: jam yang sama dengan service, supaya TTL 5 menit bisa dilewati
// tanpa menunggu 5 menit).
func BaruMemori(kini func() time.Time) *Memori {
	return &Memori{m: map[string]entri{}, kini: kini}
}

func (c *Memori) Ambil(_ context.Context, kunci string) ([]byte, bool, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	e, ada := c.m[kunci]
	if !ada {
		return nil, false, nil
	}
	if !c.kini().Before(e.sampai) {
		delete(c.m, kunci)
		return nil, false, nil
	}
	return append([]byte(nil), e.nilai...), true, nil
}

func (c *Memori) Simpan(_ context.Context, kunci string, nilai []byte, ttl time.Duration) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.m[kunci] = entri{nilai: append([]byte(nil), nilai...), sampai: c.kini().Add(ttl)}
	return nil
}

func (c *Memori) Hapus(_ context.Context, kunci string) (int, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if _, ada := c.m[kunci]; !ada {
		return 0, nil
	}
	delete(c.m, kunci)
	return 1, nil
}

func (c *Memori) HapusAwalan(_ context.Context, awalan string) (int, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	n := 0
	for k := range c.m {
		if len(k) >= len(awalan) && k[:len(awalan)] == awalan {
			delete(c.m, k)
			n++
		}
	}
	return n, nil
}

// Jumlah: banyak entri di peta (termasuk yang sudah lewat TTL tetapi belum dibaca).
func (c *Memori) Jumlah() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.m)
}

// ---------- tanpa cache ----------

// Tanpa tidak menyimpan apa pun: setiap baca jadi miss. Dipakai lab sebagai alat ukur "tanpa cache" dengan pencacah
// yang sama (jumlah baca database), bukan sebagai jalur produksi.
type Tanpa struct{}

func (Tanpa) Ambil(context.Context, string) ([]byte, bool, error)         { return nil, false, nil }
func (Tanpa) Simpan(context.Context, string, []byte, time.Duration) error { return nil }
func (Tanpa) Hapus(context.Context, string) (int, error)                  { return 0, nil }
func (Tanpa) HapusAwalan(context.Context, string) (int, error)            { return 0, nil }

// ---------- katalog ----------

// Urutan hapus kunci terhadap tulis database.
const (
	HapusSesudah = "sesudah" // benar: tulis dan COMMIT dulu, baru hapus kunci; kegagalan tulis tidak menghapus apa pun
	HapusSebelum = "sebelum" // rentan: kunci dihapus sebelum COMMIT (celah: pembaca mengisi lagi dengan data lama)
	HapusSelalu  = "selalu"  // rentan: kunci juga dihapus saat tulis gagal, seperti klien yang menganggap galat = nilai rusak (R3-25)
)

// Katalog membungkus satu Penyimpan dengan aturan cache-aside katalog dan pencacah untuk rekaman.
type Katalog struct {
	P       Penyimpan
	Nama    string // "memori" atau "redis"
	TTL     time.Duration
	Urut    string
	Gerbang *Gerbang

	Hit, Miss, DBBaca, GalatCache, Hapus, DBNanos atomic.Int64
}

// Baca: cache-aside. Hit mengembalikan entri. Miss memanggil `muat` (database) lalu menyimpan hasilnya selama TTL.
// Penyimpan yang galat (Redis mati atau lambat) dilewati: jawaban diambil dari database dan tidak ada yang disimpan.
// Galat dari `muat` (database) dikembalikan apa adanya: tidak ada yang disimpan dan tidak ada entri yang dibuang
// (R3-25: galat backend bukan alasan menghapus cache).
func (k *Katalog) Baca(ctx context.Context, kunci string, muat func(context.Context) ([]byte, error)) ([]byte, error) {
	b, ada, err := k.P.Ambil(ctx, kunci)
	switch {
	case err != nil:
		k.GalatCache.Add(1)
	case ada:
		k.Hit.Add(1)
		return b, nil
	default:
		k.Miss.Add(1)
	}
	mulai := time.Now()
	k.DBBaca.Add(1)
	b, merr := muat(ctx)
	k.DBNanos.Add(int64(time.Since(mulai)))
	if merr != nil {
		return nil, merr
	}
	if err == nil {
		k.Gerbang.Tahan(ctx, GerbangIsi) // lab: tahan di antara baca database dan simpan ke cache
		if serr := k.P.Simpan(ctx, kunci, b, k.TTL); serr != nil {
			k.GalatCache.Add(1)
		}
	}
	return b, nil
}

// HapusKunci membuang kunci tertentu; galat penyimpan dihitung, tidak digagalkan (tulis database sudah COMMIT).
// Pencacah Hapus menghitung kunci yang benar-benar ada dan terhapus, bukan jumlah perintah.
func (k *Katalog) HapusKunci(ctx context.Context, kunci ...string) {
	for _, s := range kunci {
		n, err := k.P.Hapus(ctx, s)
		if err != nil {
			k.GalatCache.Add(1)
			continue
		}
		k.Hapus.Add(int64(n))
	}
}

// HapusAwalan membuang semua entri berawalan itu.
func (k *Katalog) HapusAwalan(ctx context.Context, awalan string) {
	n, err := k.P.HapusAwalan(ctx, awalan)
	if err != nil {
		k.GalatCache.Add(1)
		return
	}
	k.Hapus.Add(int64(n))
}

// Reset menolkan pencacah (lab).
func (k *Katalog) Reset() {
	k.Hit.Store(0)
	k.Miss.Store(0)
	k.DBBaca.Store(0)
	k.GalatCache.Store(0)
	k.Hapus.Store(0)
	k.DBNanos.Store(0)
}

// ---------- gerbang lab ----------

// Nama gerbang: tempat sebuah goroutine menunggu sampai lab melepasnya, supaya dua kejadian yang berpacu bisa
// direkam dalam urutan yang sama setiap kali (menunggu keadaan, bukan jam).
const (
	GerbangCommit = "commit" // penulis: sesudah UPDATE, sebelum COMMIT
	GerbangIsi    = "isi"    // pembaca: sesudah baca database, sebelum simpan ke cache
)

// Gerbang menahan goroutine pada nama yang diaktifkan lewat flag -lab-gerbang. Nol (nil) berarti tidak ada gerbang.
type Gerbang struct {
	mu       sync.Mutex
	aktif    map[string]bool
	menunggu map[string]int
	lepas    map[string]chan struct{}
}

func BaruGerbang(nama ...string) *Gerbang {
	g := &Gerbang{aktif: map[string]bool{}, menunggu: map[string]int{}, lepas: map[string]chan struct{}{}}
	for _, n := range nama {
		g.aktif[n] = true
		g.lepas[n] = make(chan struct{})
	}
	return g
}

// Tahan menunggu sampai Lepas dipanggil untuk nama itu. Tanpa efek bila gerbangnya tidak diaktifkan.
func (g *Gerbang) Tahan(ctx context.Context, nama string) {
	if g == nil || !g.aktif[nama] {
		return
	}
	g.mu.Lock()
	g.menunggu[nama]++
	g.mu.Unlock()
	select {
	case <-g.lepas[nama]:
	case <-ctx.Done():
	}
	g.mu.Lock()
	g.menunggu[nama]--
	g.mu.Unlock()
}

// Lepas melepas satu goroutine yang menunggu; false bila tidak ada yang menunggu dalam 5 detik.
func (g *Gerbang) Lepas(nama string) bool {
	if g == nil || !g.aktif[nama] {
		return false
	}
	select {
	case g.lepas[nama] <- struct{}{}:
		return true
	case <-time.After(5 * time.Second):
		return false
	}
}

// Menunggu: banyak goroutine yang sedang tertahan di gerbang itu.
func (g *Gerbang) Menunggu(nama string) int {
	if g == nil {
		return 0
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.menunggu[nama]
}
