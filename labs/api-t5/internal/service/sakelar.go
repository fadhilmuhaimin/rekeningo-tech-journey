package service

import (
	"context"
	"sync"
	"sync/atomic"
	"time"

	"lab/apit5/internal/repo"
)

// Tahap 5 (lab t5-rollout, M49, ADR 55): kill switch kartu yang dibaca semua pod dari satu tempat. Tanpa
// Dep.SakelarKartu, kill switch tetap flag di memori satu proses (ADR 42): itu versi pertama M49.

// NamaSakelarKartu: nama baris di tabel sakelar untuk kill switch otorisasi kartu.
const NamaSakelarKartu = "kartu_aktif"

// TTLSakelar: lama nilai sakelar dipakai ulang sebelum dibaca lagi dari database (Asumsi, naskah ADR 55: 5 detik).
const TTLSakelar = 5 * time.Second

// BatasBacaSakelar: satu pembacaan sakelar yang tidak selesai dalam waktu ini dianggap tidak terbaca. Lebih pendek dari
// tenggat 2 detik penerbit, supaya jawaban tolak masih sampai.
const BatasBacaSakelar = time.Second

// SakelarKartu membaca sakelar dari tabel dengan cache. Nilai yang tidak terbaca (galat, tenggat, atau baris tidak
// ada) tidak dianggap menyala: pemanggil menolak otorisasi baru (ADR 55).
type SakelarKartu struct {
	baca func(ctx context.Context, nama string) (bool, error)
	ttl  time.Duration
	kini func() time.Time

	mu     sync.Mutex
	nilai  bool
	sampai time.Time // nilai di atas berlaku sampai waktu ini; nol = belum pernah terbaca
}

// BaruSakelarKartu: ttl 0 = membaca database di setiap pemanggilan.
func BaruSakelarKartu(r repo.Repo, ttl time.Duration) *SakelarKartu {
	return &SakelarKartu{baca: r.SakelarBaca, ttl: ttl, kini: time.Now}
}

// Aktif mengembalikan nilai sakelar dan apakah nilai itu terbaca. Cache dipakai selama ttl sejak pembacaan yang
// berhasil; sesudahnya sakelar dibaca ulang dengan batas BatasBacaSakelar. Pembacaan yang gagal tidak memperpanjang
// nilai lama.
func (k *SakelarKartu) Aktif(ctx context.Context) (aktif, terbaca bool) {
	k.mu.Lock()
	defer k.mu.Unlock()
	if !k.sampai.IsZero() && k.kini().Before(k.sampai) {
		return k.nilai, true
	}
	ctx, batal := context.WithTimeout(ctx, BatasBacaSakelar)
	defer batal()
	nilai, err := k.baca(ctx, NamaSakelarKartu)
	if err != nil {
		k.sampai = time.Time{}
		return false, false
	}
	k.nilai, k.sampai = nilai, k.kini().Add(k.ttl)
	return nilai, true
}

// Setel memperbarui cache pod ini sesudah COMMIT perubahan sakelar oleh pod ini. Pod lain baru melihatnya sesudah
// cache mereka habis.
func (k *SakelarKartu) Setel(aktif bool) {
	k.mu.Lock()
	defer k.mu.Unlock()
	k.nilai, k.sampai = aktif, k.kini().Add(k.ttl)
}

// LabTolak (lab saja): menolak sebagian otorisasi dengan alasan "versi-baru", untuk memerankan versi baru yang
// salah (M49). Penolakan tersebar rata: sesudah k pemanggilan, tepat k x Persen / 100 (dibulatkan ke bawah) yang
// ditolak, jadi rasio tolak mendekati Persen sejak pemanggilan pertama. Hitungannya tepat, tidak acak.
type LabTolak struct {
	Persen int
	n      atomic.Uint64
}

// Tolak: true bila pemanggilan ini termasuk yang ditolak. Nil atau Persen <= 0 tidak pernah menolak.
func (l *LabTolak) Tolak() bool {
	if l == nil || l.Persen <= 0 {
		return false
	}
	k, p := l.n.Add(1)-1, uint64(l.Persen)
	return (k+1)*p/100 > k*p/100
}

// HitungOtorisasi (lab saja): pencacah keputusan otorisasi di satu pod, dibaca analisis rollout lewat
// GET /lab/otorisasi.
type HitungOtorisasi struct {
	setuju, tolak atomic.Int64
}

// Catat menambah pencacah menurut keputusan. Nil tidak mencatat.
func (h *HitungOtorisasi) Catat(k Keputusan) {
	if h == nil {
		return
	}
	if k.Keputusan == "setuju" {
		h.setuju.Add(1)
	} else {
		h.tolak.Add(1)
	}
}

// Ringkas: jumlah keputusan sejak proses mulai dan rasio tolak (0 bila belum ada keputusan).
func (h *HitungOtorisasi) Ringkas() (total, setuju, tolak int64, rasioTolak float64) {
	setuju, tolak = h.setuju.Load(), h.tolak.Load()
	total = setuju + tolak
	if total > 0 {
		rasioTolak = float64(tolak) / float64(total)
	}
	return
}

// Otorisasi menjawab penerbit dan mencatat keputusannya di pencacah lab (bila dipasang). Isinya ada di otorisasiKartu.
func (s Service) Otorisasi(ctx context.Context, in PermintaanOtorisasi) (Keputusan, error) {
	k, err := s.otorisasiKartu(ctx, in)
	if err == nil {
		s.t4.HitungOtorisasi.Catat(k)
	}
	return k, err
}

// tolakSebelumDatabase: penolakan yang diputuskan sebelum otorisasi menyentuh tabel kartu. Sakelar dari tabel
// (ADR 55): nilai yang tidak terbaca ditolak dengan jawaban tolak yang eksplisit, bukan galat, karena penerbit
// tiruan membaca jawaban bukan-200 sebagai timeout dan menyetujui (ADR 42). Tanpa sakelar tabel, flag memori
// proses (ADR 42, versi pertama M49).
func (s Service) tolakSebelumDatabase(ctx context.Context) (Keputusan, bool) {
	if sk := s.t4.SakelarKartu; sk != nil {
		aktif, terbaca := sk.Aktif(ctx)
		switch {
		case !terbaca:
			return tolak("sakelar-tak-terbaca"), true
		case !aktif:
			return tolak("kill-switch"), true
		}
	} else if !s.KartuAktifSekarang() {
		return tolak("kill-switch"), true
	}
	if s.t4.LabTolak.Tolak() {
		return tolak("versi-baru"), true
	}
	return Keputusan{}, false
}
