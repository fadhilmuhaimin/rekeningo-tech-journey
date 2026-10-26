package service

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"lab/apit4/internal/repo"
)

// QR merchant luar (PRD v4 P0, ADR 40, M35). Merchant yang sudah diverifikasi tim risk membuat QR statis atau
// dinamis; pembeli memindai, melihat nama merchant dari tabel akun, lalu membayar dari saldo. Pembayaran QR adalah
// jurnal bayar biasa di ledger: dua posting seimbang, satu baris outbox untuk merchant, di transaction yang sama.
//
// Yang dijaga: QR dinamis dibayar sekali dan berlaku 5 menit (Asumsi), QR statis dibatasi Rp200.000 per pembayaran
// (Asumsi produk). Yang tidak bisa dijaga server: stiker QR statis milik merchant lain yang ditempel di atas stiker
// yang sah menghasilkan jurnal yang sah ke merchant pemilik QR itu (TestBayarQRMilikMerchantLain).

var (
	// ErrQRTerpakai: QR dinamis sudah dibayar. Dijawab 409.
	ErrQRTerpakai = errors.New("QR dinamis sudah dibayar")
	// ErrQRKedaluwarsa: QR dinamis lewat masa berlakunya. Dijawab 410.
	ErrQRKedaluwarsa = errors.New("QR kedaluwarsa")
)

// MaksQRDinamis: nominal paling besar satu QR dinamis (Asumsi lab).
const MaksQRDinamis int64 = 5_000_000

// Batas laju QR per akun (Asumsi lab), ditambahkan ke AmbangEndpoint sebelum Baru membuat pembatasnya.
func init() {
	AmbangEndpoint["qr"] = [2]float64{10, 10.0 / 60}       // 10 QR baru, isi ulang 10 per menit
	AmbangEndpoint["qr-bayar"] = [2]float64{20, 20.0 / 60} // 20 pembayaran QR, isi ulang 20 per menit
	AmbangEndpoint["qr-lapor"] = [2]float64{3, 3.0 / 3600} // 3 laporan, isi ulang 3 per jam
}

var polaUUID = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

// merchantAktif: merchant yang boleh menerima QR: jenis merchant, tingkat terverifikasi, status aktif.
func merchantAktif(jenis, tingkat, status string) bool {
	return jenis == "merchant" && tingkat == "terverifikasi" && status == "aktif"
}

// --8<-- [start:buat-qr]
// BuatQR menerbitkan satu QR untuk merchant. Merchant yang belum diverifikasi atau dibekukan ditolak.
func (s Service) BuatQR(ctx context.Context, peminta int64, jenis string, nominal *int64) (repo.QR, error) {
	if err := s.BatasAkun("qr", peminta); err != nil {
		return repo.QR{}, err
	}
	switch jenis {
	case "statis":
		if nominal != nil {
			return repo.QR{}, ErrValidasi{"nominal", "QR statis tidak punya nominal"}
		}
	case "dinamis":
		if nominal == nil || *nominal <= 0 || *nominal > MaksQRDinamis {
			return repo.QR{}, ErrValidasi{"nominal", fmt.Sprintf("QR dinamis wajib bernominal lebih dari 0 dan paling banyak %d", MaksQRDinamis)}
		}
	default:
		return repo.QR{}, ErrValidasi{"jenis", "statis atau dinamis"}
	}
	a, err := s.repo.Akun(ctx, peminta)
	if err != nil {
		return repo.QR{}, err
	}
	if a.Jenis != "merchant" {
		return repo.QR{}, ErrDilarang
	}
	if a.Status != "aktif" {
		return repo.QR{}, ErrDibekukan
	}
	if a.Tingkat != "terverifikasi" {
		return repo.QR{}, ErrButuhVerifikasi
	}
	var berlaku *time.Time
	if jenis == "dinamis" {
		b := s.kini().Add(UmurQRDinamis)
		berlaku = &b
	}
	return s.repo.BuatQR(ctx, peminta, jenis, nominal, berlaku)
}

// --8<-- [end:buat-qr]

// KonfirmasiQR adalah isi layar konfirmasi pembayaran: nama merchant terverifikasi dari tabel akun.
type KonfirmasiQR struct {
	ID            string     `json:"id"`
	Jenis         string     `json:"jenis"`
	Nominal       *int64     `json:"nominal,omitempty"`
	BerlakuSampai *time.Time `json:"berlaku_sampai,omitempty"`
	Merchant      struct {
		Nama string  `json:"nama"`
		Kota *string `json:"kota,omitempty"`
	} `json:"merchant"`
	Terverifikasi bool `json:"terverifikasi"`
}

// bisaDibayar: QR aktif, belum lewat masa berlakunya, dan merchant-nya masih sah. Satu jawaban untuk semua sebab
// supaya penanya tidak tahu kenapa QR itu tidak ada.
func (s Service) bisaDibayar(q repo.QRDenganMerchant) bool {
	if q.Status != "aktif" || !merchantAktif(q.MerchantJenis, q.MerchantTingkat, q.MerchantStatus) {
		return false
	}
	return q.BerlakuSampai == nil || s.kini().Before(*q.BerlakuSampai)
}

// LihatQR: layar konfirmasi. QR yang tidak ada, tidak aktif, kedaluwarsa, atau milik merchant yang dibekukan atau
// belum diverifikasi dijawab ErrTidakDitemukan.
func (s Service) LihatQR(ctx context.Context, id string) (KonfirmasiQR, error) {
	var k KonfirmasiQR
	if !polaUUID.MatchString(id) {
		return k, ErrTidakDitemukan
	}
	q, err := s.repo.LihatQR(ctx, id)
	if errors.Is(err, repo.ErrTidakAda) {
		return k, ErrTidakDitemukan
	}
	if err != nil {
		return k, err
	}
	if !s.bisaDibayar(q) {
		return k, ErrTidakDitemukan
	}
	k.ID, k.Jenis, k.Nominal, k.BerlakuSampai = q.ID, q.Jenis, q.Nominal, q.BerlakuSampai
	k.Merchant.Nama, k.Merchant.Kota = q.MerchantNama, q.MerchantKota
	k.Terverifikasi = true
	return k, nil
}

// HasilBayarQR: jurnal yang tercatat dan saldo pembayar sesudahnya.
type HasilBayarQR struct {
	ID       int64  `json:"id"`
	Saldo    int64  `json:"saldo"`
	Nominal  int64  `json:"nominal"`
	Merchant string `json:"merchant"`
}

// --8<-- [start:bayar-qr]
// BayarQR memindahkan uang dari pembayar ke merchant pemilik QR dalam satu transaction. Urutannya: baris QR dikunci
// dulu, lalu buku pembayar dan merchant menurut id (ADR 13); status, masa berlaku, nominal, dan saldo dibaca sesudah
// lock. QR dinamis ditandai terpakai di transaction yang sama dengan jurnalnya, jadi pembayaran yang kalah balapan
// dibatalkan seluruhnya. `nominal` nil berarti body kosong (hanya sah untuk QR dinamis).
func (s Service) BayarQR(ctx context.Context, pembayar int64, qrID string, nominal *int64) (HasilBayarQR, error) {
	var h HasilBayarQR
	if !polaUUID.MatchString(qrID) {
		return h, ErrTidakDitemukan
	}
	if err := s.BatasAkun("qr-bayar", pembayar); err != nil {
		return h, err
	}
	p, err := s.repo.Akun(ctx, pembayar)
	if err != nil {
		return h, err
	}
	if p.Jenis != "karyawan" && p.Jenis != "pemakai" {
		return h, ErrDilarang
	}
	if p.Status != "aktif" {
		return h, ErrDibekukan
	}
	kedaluwarsa := false
	err = s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		q, err := tx.KunciQR(ctx, qrID)
		if errors.Is(err, repo.ErrTidakAda) {
			return ErrTidakDitemukan
		}
		if err != nil {
			return err
		}
		if !merchantAktif(q.MerchantJenis, q.MerchantTingkat, q.MerchantStatus) {
			return ErrTidakDitemukan
		}
		switch q.Status {
		case "aktif":
		case "terpakai":
			return ErrQRTerpakai
		case "kedaluwarsa":
			return ErrQRKedaluwarsa
		default:
			return ErrTidakDitemukan
		}
		if q.BerlakuSampai != nil && !s.kini().Before(*q.BerlakuSampai) {
			kedaluwarsa = true // ditandai dan di-COMMIT di bawah; error dikembalikan sesudah transaction selesai
			return tx.TandaiQRKedaluwarsa(ctx, q.ID)
		}
		var jumlah int64
		if q.Jenis == "dinamis" {
			if nominal != nil && *nominal != *q.Nominal {
				return ErrValidasi{"nominal", "QR dinamis terikat ke nominal " + fmt.Sprint(*q.Nominal)}
			}
			jumlah = *q.Nominal
		} else {
			if nominal == nil || *nominal <= 0 || *nominal > MaksQRStatis {
				return ErrValidasi{"nominal", fmt.Sprintf("QR statis wajib bernominal lebih dari 0 dan paling banyak %d", MaksQRStatis)}
			}
			jumlah = *nominal
		}
		buku, err := tx.KunciBukuAkun(ctx, pembayar, q.AkunID)
		if err != nil {
			return err
		}
		dari, ke := buku[pembayar], buku[q.AkunID]
		if dari.ID == 0 || ke.ID == 0 || dari.ID == ke.ID {
			return ErrTidakDitemukan
		}
		if dari.Saldo < jumlah { // dibaca sesudah lock: transaction lain dari buku ini menunggu
			return ErrSaldoKurang
		}
		id, err := tx.CatatJurnal(ctx, "bayar", fmt.Sprintf("Bayar QR %s ke %s", p.Nama, q.MerchantNama), pembayar, nil,
			[]repo.Posting{{BukuID: dari.ID, Jumlah: -jumlah}, {BukuID: ke.ID, Jumlah: jumlah}})
		if err != nil {
			return err
		}
		if q.Jenis == "dinamis" {
			ok, err := tx.TandaiQRTerpakai(ctx, q.ID, id)
			if err != nil {
				return err
			}
			if !ok {
				return ErrQRTerpakai
			}
		}
		if err := s.beritahu(ctx, tx, id, q.AkunID, "bayar", nil, pesanUang(p.Nama, jumlah, id, "")); err != nil {
			return err
		}
		h = HasilBayarQR{ID: id, Saldo: dari.Saldo - jumlah, Nominal: jumlah, Merchant: q.MerchantNama}
		return nil
	})
	if err != nil {
		return HasilBayarQR{}, err
	}
	if kedaluwarsa {
		return HasilBayarQR{}, ErrQRKedaluwarsa
	}
	return h, nil
}

// --8<-- [end:bayar-qr]

// --8<-- [start:laporkan-qr]
// LaporkanQR: laporan QR palsu membekukan merchant pemiliknya lebih dulu, tim risk memeriksa kemudian (ADR 40).
// Pembekuan dan satu baris audit log berantai ditulis di transaction yang sama. Satu laporan dari satu akun sudah
// cukup membekukan; itu celah penyalahgunaan terhadap merchant yang sah, dan lab ini tidak menutupnya (Asumsi
// desain ADR 40: kerugian satu pembayaran palsu dinilai lebih mahal daripada pembekuan sementara).
func (s Service) LaporkanQR(ctx context.Context, pelapor int64, qrID, alasan string) error {
	if !polaUUID.MatchString(qrID) {
		return ErrTidakDitemukan
	}
	if err := s.BatasAkun("qr-lapor", pelapor); err != nil {
		return err
	}
	alasan = strings.TrimSpace(alasan)
	if n := utf8.RuneCountInString(alasan); n < 20 || n > 200 {
		return ErrValidasi{"alasan", "wajib, 20 sampai 200 karakter: apa yang janggal pada QR ini"}
	}
	a, err := s.repo.Akun(ctx, pelapor)
	if err != nil {
		return err
	}
	q, err := s.repo.LihatQR(ctx, qrID)
	if errors.Is(err, repo.ErrTidakAda) {
		return ErrTidakDitemukan
	}
	if err != nil {
		return err
	}
	return s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		if q.MerchantJenis == "merchant" {
			if _, err := tx.BekukanAkun(ctx, q.AkunID); err != nil {
				return err
			}
		}
		return s.Audit(ctx, tx, pelapor, a.Jenis, "laporan_qr", "qr:"+q.ID, alasan, nil)
	})
}

// --8<-- [end:laporkan-qr]
