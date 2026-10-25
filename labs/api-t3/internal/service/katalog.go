package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"lab/apit3/internal/repo"
)

var (
	ErrStokHabis = errors.New("stok tidak cukup")
	ErrProdukOff = errors.New("produk tidak aktif")
)

// ErrVersiBerbeda: perubahan ditolak karena baris sudah diubah pihak lain sejak dilihat pengubah (409). Berisi
// keadaan terkini supaya pengubah memilih.
type ErrVersiBerbeda struct{ Sekarang repo.StokProduk }

func (e ErrVersiBerbeda) Error() string {
	return fmt.Sprintf("versi berbeda: sekarang %d", e.Sekarang.Versi)
}

// Katalog: warung dan menu satu kota. Kota dari parameter, atau kota akun peminta. Siapa pun yang login boleh melihat.
func (s Service) Katalog(ctx context.Context, peminta int64, kota *int64, warung *int64) (int64, []repo.WarungMenu, error) {
	if kota == nil {
		a, err := s.repo.Akun(ctx, peminta)
		if err != nil {
			return 0, nil, err
		}
		if a.KotaID == nil {
			return 0, nil, ErrValidasi{"kota", "wajib diisi untuk akun tanpa kota"}
		}
		kota = a.KotaID
	}
	m, err := s.repo.Katalog(ctx, *kota, warung)
	return *kota, m, err
}

// HasilPesanan: pembayaran satu produk. Nominal dihitung server dari database, bukan dikirim app.
type HasilPesanan struct {
	ID             int64 `json:"id"`
	Saldo          int64 `json:"saldo"`
	Nominal        int64 `json:"nominal"`
	HargaSatuan    int64 `json:"harga_satuan"`
	PotonganPersen int   `json:"potongan_persen"`
	StokSisa       int   `json:"stok_sisa"`
}

// MaksPorsi: porsi per pesanan.
const MaksPorsi = 10

// --8<-- [start:pesan]
// Pesan membayar `porsi` produk dengan harga yang dibaca dari database SESUDAH buku dan produk dikunci: harga
// dasar dikurangi promo terbesar yang berlaku sekarang di kota warung. Harga di layar app (katalog, cache, atau
// salinan lama di HP) tidak ikut menentukan tagihan (ADR 28). Stok dikurangi di transaction yang sama dengan
// jurnal, dan pemberitahuan ke warung ditulis ke outbox seperti Bayar.
func (s Service) Pesan(ctx context.Context, peminta, produk int64, porsi int, catatan string) (HasilPesanan, error) {
	var h HasilPesanan
	if porsi < 1 || porsi > MaksPorsi {
		return h, ErrValidasi{"porsi", fmt.Sprintf("angka 1 sampai %d", MaksPorsi)}
	}
	catatan, err := periksaCatatan(catatan)
	if err != nil {
		return h, err
	}
	warung, _, err := s.repo.PemilikProduk(ctx, produk)
	if errors.Is(err, repo.ErrTidakAda) {
		return h, ErrValidasi{"produk_id", "produk tidak ada"}
	}
	if err != nil {
		return h, err
	}
	pembayar, err := s.repo.Akun(ctx, peminta)
	if err != nil {
		return h, err
	}
	if pembayar.Jenis != "karyawan" {
		return h, ErrDilarang
	}
	perangkat := s.perangkatRentan(ctx, warung)
	err = s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		buku, err := tx.KunciBukuAkun(ctx, peminta, warung)
		if err != nil {
			return err
		}
		p, err := tx.KunciProduk(ctx, produk)
		if err != nil {
			return err
		}
		if !p.Aktif {
			return ErrProdukOff
		}
		if p.Stok < porsi {
			return ErrStokHabis
		}
		h.HargaSatuan = p.Harga * int64(100-p.Potongan) / 100
		h.PotonganPersen = p.Potongan
		h.Nominal = h.HargaSatuan * int64(porsi)
		if h.Nominal > MaksBayar {
			return ErrValidasi{"porsi", "total lebih dari batas satu pembayaran"}
		}
		dari, w := buku[peminta], buku[warung]
		if dari.Saldo < h.Nominal {
			return ErrSaldoKurang
		}
		if w.BatasSaldo != nil && w.Saldo+h.Nominal > *w.BatasSaldo {
			return ErrBatasWarung
		}
		ket := fmt.Sprintf("Bayar %s ke warung: %d %s", pembayar.Nama, porsi, strings.TrimSpace(p.Nama))
		h.ID, err = tx.CatatJurnal(ctx, "bayar", keterangan(ket, catatan), peminta, nil,
			[]repo.Posting{{BukuID: dari.ID, Jumlah: -h.Nominal}, {BukuID: w.ID, Jumlah: h.Nominal}})
		if err != nil {
			return err
		}
		if err := tx.KurangiStok(ctx, produk, porsi); err != nil {
			return err
		}
		h.Saldo, h.StokSisa = dari.Saldo-h.Nominal, p.Stok-porsi
		return s.beritahu(ctx, tx, h.ID, warung, "bayar", perangkat, pesanUang(pembayar.Nama, h.Nominal, h.ID, catatan))
	})
	return h, err
}

// --8<-- [end:pesan]

// UbahProduk: harga dan atau stok, bersyarat versi (ADR 29). Hanya warung pemilik produk.
func (s Service) UbahProduk(ctx context.Context, peminta, id int64, harga *int64, stok *int, versi int) (repo.StokProduk, error) {
	a, err := s.repo.Akun(ctx, peminta)
	if err != nil {
		return repo.StokProduk{}, err
	}
	if a.Jenis != "warung" {
		return repo.StokProduk{}, ErrDilarang
	}
	switch {
	case harga == nil && stok == nil:
		return repo.StokProduk{}, ErrValidasi{"harga,stok", "kirim harga, stok, atau keduanya"}
	case harga != nil && *harga <= 0:
		return repo.StokProduk{}, ErrValidasi{"harga", "harus lebih dari 0"}
	case stok != nil && *stok < 0:
		return repo.StokProduk{}, ErrValidasi{"stok", "tidak boleh negatif"}
	case versi < 1:
		return repo.StokProduk{}, ErrValidasi{"versi", "versi baris yang kamu lihat, minimal 1"}
	}
	hasil, ok, err := s.repo.UbahProduk(ctx, id, peminta, harga, stok, versi)
	if errors.Is(err, repo.ErrTidakAda) {
		return hasil, ErrTidakDitemukan
	}
	if err == nil && !ok {
		return hasil, ErrVersiBerbeda{Sekarang: hasil}
	}
	return hasil, err
}

// BuatPromo: hanya akun hr, hanya untuk kota hr itu sendiri. Bila umumkan, satu pemberitahuan promo per karyawan
// kota itu ditulis di transaction yang sama (kelas promo, ADR 32); pengirimannya urusan worker.
func (s Service) BuatPromo(ctx context.Context, peminta int64, judul string, persen int, mulai, selesai time.Time, umumkan bool) (id, diumumkan int64, err error) {
	a, err := s.repo.Akun(ctx, peminta)
	if err != nil {
		return 0, 0, err
	}
	if a.Jenis != "hr" || a.KotaID == nil {
		return 0, 0, ErrDilarang
	}
	judul = strings.TrimSpace(judul)
	switch {
	case judul == "" || len([]rune(judul)) > 80:
		return 0, 0, ErrValidasi{"judul", "wajib diisi, paling banyak 80 karakter"}
	case persen < 1 || persen > 90:
		return 0, 0, ErrValidasi{"potongan_persen", "angka 1 sampai 90"}
	case !selesai.After(mulai):
		return 0, 0, ErrValidasi{"selesai", "harus sesudah mulai"}
	}
	err = s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		if id, err = tx.BuatPromo(ctx, *a.KotaID, peminta, judul, persen, mulai, selesai); err != nil {
			return err
		}
		if !umumkan {
			return nil
		}
		isi, err := jsonPesan(pesan{Judul: "Promo: " + judul,
			Isi: fmt.Sprintf("Potongan %d%% untuk menu warung di kotamu.", persen)})
		if err != nil {
			return err
		}
		diumumkan, err = tx.UmumkanPromo(ctx, *a.KotaID, isi)
		return err
	})
	return id, diumumkan, err
}

// DaftarPromo: promo yang belum selesai di satu kota (kota akun peminta bila tidak disebut).
func (s Service) DaftarPromo(ctx context.Context, peminta int64, kota *int64) ([]repo.Promo, error) {
	if kota == nil {
		a, err := s.repo.Akun(ctx, peminta)
		if err != nil {
			return nil, err
		}
		if a.KotaID == nil {
			return nil, ErrValidasi{"kota", "wajib diisi untuk akun tanpa kota"}
		}
		kota = a.KotaID
	}
	return s.repo.DaftarPromo(ctx, *kota)
}

// DaftarkanPerangkat: token push satu HP untuk akun peminta.
func (s Service) DaftarkanPerangkat(ctx context.Context, peminta int64, platform, token string) (int64, error) {
	token = strings.TrimSpace(token)
	switch {
	case platform != "android" && platform != "ios":
		return 0, ErrValidasi{"platform", "android atau ios"}
	case token == "" || len(token) > 4096:
		return 0, ErrValidasi{"token_push", "wajib diisi, paling banyak 4096 karakter"}
	}
	return s.repo.DaftarkanPerangkat(ctx, peminta, platform, token)
}

// MaksUmurOperasi: operasi di queue offline paling lama 7 hari (ADR 29); lebih tua dari itu ditolak.
const MaksUmurOperasi = 7 * 24 * time.Hour

// MaksJamSalah: jam HP boleh maju paling banyak sehari dari jam server. Retensi operasi sinkron (14 hari) dihitung dari
// dibuat_di_hp; tanpa batas ini HP dengan jam jauh di depan membuat barisnya tidak pernah dibersihkan.
const MaksJamSalah = 24 * time.Hour

// Sinkron menerapkan satu operasi dari queue offline HP warung (ADR 29). Hanya stok dan harga: pembayaran tidak
// pernah offline, jadi jenis lain ditolak apa pun isinya.
func (s Service) Sinkron(ctx context.Context, peminta int64, o repo.OperasiSinkron) (status string, sekarang repo.StokProduk, ulang bool, err error) {
	switch {
	case o.Jenis == "bayar" || o.Jenis == "transfer" || o.Jenis == "topup":
		return "", sekarang, false, ErrValidasi{"jenis", "pembayaran tidak pernah lewat sinkron offline; hanya stok dan harga"}
	case o.Jenis != "stok" && o.Jenis != "harga":
		return "", sekarang, false, ErrValidasi{"jenis", "stok atau harga"}
	case o.Kunci == "" || len(o.Kunci) > 200:
		return "", sekarang, false, ErrValidasi{"kunci", "wajib diisi, paling banyak 200 karakter"}
	case o.Nilai < 0 || (o.Jenis == "harga" && o.Nilai == 0):
		return "", sekarang, false, ErrValidasi{"nilai", "stok tidak negatif, harga lebih dari 0"}
	case o.VersiDasar < 1:
		return "", sekarang, false, ErrValidasi{"versi_dasar", "versi baris yang dilihat HP, minimal 1"}
	case s.kini().Sub(o.DibuatHP) > MaksUmurOperasi:
		return "", sekarang, false, ErrValidasi{"dibuat_di_hp", "lebih dari 7 hari di queue: ditolak, ambil keadaan terbaru lalu ubah lagi"}
	case o.DibuatHP.Sub(s.kini()) > MaksJamSalah:
		return "", sekarang, false, ErrValidasi{"dibuat_di_hp", "lebih dari 1 hari di masa depan: jam HP salah"}
	}
	a, err := s.repo.Akun(ctx, peminta)
	if err != nil {
		return "", sekarang, false, err
	}
	if a.Jenis != "warung" {
		return "", sekarang, false, ErrDilarang
	}
	if ok, err := s.repo.PerangkatMilik(ctx, o.Perangkat, peminta); err != nil || !ok {
		if err == nil {
			err = ErrValidasi{"perangkat_id", "bukan perangkat akun ini"}
		}
		return "", sekarang, false, err
	}
	status, sekarang, ulang, err = s.repo.TerapkanOperasi(ctx, o, peminta)
	if errors.Is(err, repo.ErrTidakAda) {
		return "", sekarang, false, ErrTidakDitemukan
	}
	if errors.Is(err, repo.ErrKunciBeda) {
		return "", sekarang, false, ErrValidasi{"kunci", "sudah dipakai untuk operasi lain; satu operasi satu kunci"}
	}
	return status, sekarang, ulang, err
}

// Penerimaan: uang masuk ke warung, hanya untuk pemiliknya (dasbor "Riwayat penerimaan").
func (s Service) Penerimaan(ctx context.Context, peminta, warung int64, batas int) ([]repo.Penerimaan, error) {
	if peminta != warung {
		return nil, ErrTidakDitemukan
	}
	if batas < 1 || batas > 100 {
		return nil, ErrValidasi{"batas", "angka 1 sampai 100"}
	}
	return s.repo.RiwayatPenerimaan(ctx, warung, batas)
}
