package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"lab/apit5/internal/cache"
	"lab/apit5/internal/repo"
)

// Tahap 5 (lab-api-t5): laporan merchant dari primary dan cache 30 detik (M40), pengumuman (M45), dan cicilan
// sebagai satu job (M48). Mode rentan menyalakan versi pertama; tanpa mode, rute dan job versi pertama tidak ada atau
// memakai pengaman ADR 54.
const (
	// RentanLaporanPrimary: laporan merchant real-time dibaca dari primary yang sama dengan pembayaran (M40).
	RentanLaporanPrimary = "laporan-primary"
	// RentanCicilanSatuJob: job cicilan hanya dijaga Idempotency-Key 24 jam, tanpa referensi bisnis (M48).
	RentanCicilanSatuJob = "cicilan-satu-job"
	// TTLLaporan: umur entri cache laporan (naskah M40: cache 30 detik di Redis; Asumsi).
	TTLLaporan = 30 * time.Second
)

func init() {
	// Batas laju per akun untuk endpoint Tahap 5 (Asumsi lab: kapasitas awal dan isi ulang per jam).
	AmbangEndpoint["cicilan"] = [2]float64{10, 10.0 / 3600}
	AmbangEndpoint["pengumuman"] = [2]float64{5, 5.0 / 3600}
}

// WIB: zona waktu hari laporan dan jatuh tempo. Indonesia bagian barat tidak punya DST, jadi offset tetap cukup.
var WIB = time.FixedZone("WIB", 7*3600)

// awalHariWIB: pukul 00.00 WIB pada tanggal t.
func awalHariWIB(t time.Time) time.Time {
	t = t.In(WIB)
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, WIB)
}

// DenganCacheLaporan memasang cache laporan merchant (flag -laporan-cache). Tanpa ini laporan selalu dari database.
func (s Service) DenganCacheLaporan(k *cache.Katalog) Service { s.kl = k; return s }

// LaporanMerchant adalah jawaban GET /merchant/{id}/laporan/hari-ini.
type LaporanMerchant struct {
	Merchant int64  `json:"merchant"`
	Tanggal  string `json:"tanggal"`
	repo.LaporanHari
	DibacaDari string `json:"dibaca_dari"`
}

// --8<-- [start:laporan-hari-ini]
// LaporanHariIni: jumlah dan total uang masuk ke merchant hari ini (WIB). Hanya pemilik akun; akun lain dijawab
// tidak ditemukan. Hanya ada di mode laporan-primary: versi benarnya (replica, ringkasan harian) belum ada di lab ini.
// Dengan cache (kl) jawabannya bisa setua TTL; uang tidak pernah diputuskan dari angka ini.
func (s Service) LaporanHariIni(ctx context.Context, peminta, merchant int64) (LaporanMerchant, error) {
	var l LaporanMerchant
	if s.rentan != RentanLaporanPrimary || peminta != merchant {
		return l, ErrTidakDitemukan
	}
	a, err := s.repo.Akun(ctx, merchant)
	if errors.Is(err, repo.ErrTidakAda) || (err == nil && a.Jenis != "warung" && a.Jenis != "merchant") {
		return l, ErrTidakDitemukan
	}
	if err != nil {
		return l, err
	}
	awal := awalHariWIB(s.kini())
	muat := func(ctx context.Context) ([]byte, error) {
		h, err := s.repo.LaporanHariIni(ctx, merchant, awal, awal.AddDate(0, 0, 1))
		if err != nil {
			return nil, err
		}
		return json.Marshal(h)
	}
	tanggal := awal.Format("2006-01-02")
	var b []byte
	if s.kl != nil {
		b, err = s.kl.Baca(ctx, fmt.Sprintf("laporan:%d:%s", merchant, tanggal), muat)
	} else {
		b, err = muat(ctx)
	}
	if err != nil {
		return l, err
	}
	l.Merchant, l.Tanggal, l.DibacaDari = merchant, tanggal, "primary"
	return l, json.Unmarshal(b, &l.LaporanHari)
}

// --8<-- [end:laporan-hari-ini]

// BuatPengumuman: hanya admin atau hr. Satu baris pengumuman dan satu baris outbox stream, satu transaction.
func (s Service) BuatPengumuman(ctx context.Context, peminta int64, judul string) (id int64, penerima int, err error) {
	a, err := s.repo.Akun(ctx, peminta)
	if err != nil {
		return 0, 0, err
	}
	if a.Jenis != "admin" && a.Jenis != "hr" {
		return 0, 0, ErrDilarang
	}
	judul = strings.TrimSpace(judul)
	if judul == "" || len([]rune(judul)) > 80 {
		return 0, 0, ErrValidasi{"judul", "wajib diisi, paling banyak 80 karakter"}
	}
	err = s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		id, penerima, err = tx.BuatPengumuman(ctx, peminta, judul)
		return err
	})
	return id, penerima, err
}

// BuatCicilan: karyawan atau pemakai yang tidak dibekukan membuat jadwal cicilan ke satu merchant, atau jadwal tabungan
// ke bukunya sendiri. `pertama` adalah jatuh tempo angsuran ke-1.
func (s Service) BuatCicilan(ctx context.Context, peminta int64, jenis string, merchant *int64, per int64, n, hari int, pertama time.Time) (int64, error) {
	a, err := s.repo.Akun(ctx, peminta)
	if err != nil {
		return 0, err
	}
	if a.Jenis != "karyawan" && a.Jenis != "pemakai" {
		return 0, ErrDilarang
	}
	if a.Status == "dibekukan" {
		return 0, ErrDibekukan
	}
	switch {
	case jenis != "cicilan" && jenis != "tabungan":
		return 0, ErrValidasi{"jenis", "cicilan atau tabungan"}
	case per < 1 || per > 10_000_000:
		return 0, ErrValidasi{"jumlah_per_angsuran", "angka 1 sampai 10.000.000"}
	case n < 1 || n > 36:
		return 0, ErrValidasi{"jumlah_angsuran", "angka 1 sampai 36"}
	case hari < 1 || hari > 28:
		return 0, ErrValidasi{"hari_tagih", "angka 1 sampai 28"}
	case jenis == "tabungan" && merchant != nil:
		return 0, ErrValidasi{"merchant_akun_id", "jadwal tabungan tidak punya merchant"}
	case jenis == "cicilan" && merchant == nil:
		return 0, ErrValidasi{"merchant_akun_id", "wajib untuk cicilan"}
	}
	if merchant != nil {
		m, err := s.repo.Akun(ctx, *merchant)
		if errors.Is(err, repo.ErrTidakAda) || (err == nil && m.Jenis != "warung" && m.Jenis != "merchant") {
			return 0, ErrValidasi{"merchant_akun_id", "bukan merchant"}
		}
		if err != nil {
			return 0, err
		}
	}
	return s.repo.BuatJadwal(ctx, peminta, jenis, merchant, per, n, hari, pertama)
}

// LihatCicilan: jadwal dan angsurannya, hanya untuk pemilik jadwal.
func (s Service) LihatCicilan(ctx context.Context, peminta, id int64) (repo.Jadwal, []repo.Angsuran, error) {
	j, a, err := s.repo.JadwalMilik(ctx, id, peminta)
	if errors.Is(err, repo.ErrTidakAda) {
		return j, nil, ErrTidakDitemukan
	}
	return j, a, err
}

// HasilCicilan adalah ringkasan satu putaran job cicilan.
type HasilCicilan struct {
	Dibaca    int // angsuran jatuh tempo yang belum selesai
	Dijurnal  int // jurnal baru ditulis di ledger
	JurnalAda int // jurnal dengan referensi itu sudah ada; tidak ditulis lagi
	Dicatat   int // angsuran selesai
	Dilewati  int // dilewati karena Idempotency-Key masih hidup (hanya mode rentan)
	Gagal     int // saldo kurang
}

// OpsiCicilan: BerhentiSetelahJurnal > 0 menghentikan job (seperti proses mati, lab saja) sesudah sekian jurnal ditulis
// dan sebelum angsurannya ditandai.
type OpsiCicilan struct {
	BerhentiSetelahJurnal int
	Jadwal                int64 // > 0: hanya jadwal itu (menjalankan ulang satu jadwal, dan tes yang berbagi database)
}

// --8<-- [start:job-cicilan]
// JalankanCicilan menagih semua angsuran jatuh tempo sampai tanggal itu. Boleh dijalankan ulang kapan saja.
//
// Versi benar (ADR 54): ledger menerima referensi `angsuran:<jadwal>:<ke>` yang unik di jurnal, jadi jurnal kedua untuk
// angsuran yang sama tidak pernah dibuat, berapa pun umur job sebelumnya. Status angsuran berjalan per langkah:
// menunggu, terjurnal (jurnal ada di ledger), dicatat.
//
// Mode rentan cicilan-satu-job (M48, versi pertama): satu job menagih lalu menandai, dan satu-satunya penjaga adalah
// Idempotency-Key 24 jam. Job yang diulang sesudah key kedaluwarsa menagih angsuran yang sama lagi.
func (s Service) JalankanCicilan(ctx context.Context, sampai time.Time, o OpsiCicilan) (HasilCicilan, error) {
	var h HasilCicilan
	daftar, err := s.repo.AngsuranJatuhTempo(ctx, sampai, o.Jadwal)
	if err != nil {
		return h, err
	}
	h.Dibaca = len(daftar)
	ditulis := 0
	for _, a := range daftar {
		berhenti := func() bool { ditulis++; return o.BerhentiSetelahJurnal > 0 && ditulis >= o.BerhentiSetelahJurnal }
		if s.rentan == RentanCicilanSatuJob {
			if stop, err := s.tagihRentan(ctx, a, &h, berhenti); err != nil || stop {
				return h, err
			}
			continue
		}
		if stop, err := s.tagihBenar(ctx, a, &h, berhenti); err != nil || stop {
			return h, err
		}
	}
	return h, nil
}

// --8<-- [end:job-cicilan]

func jenisJurnalAngsuran(a repo.Angsuran) string {
	if a.Jenis == "tabungan" {
		return "tabungan"
	}
	return "angsuran"
}

// jurnalAngsuran menulis jurnal satu angsuran: buku akun berkurang, buku merchant (cicilan) atau buku tabungan akun
// itu sendiri (tabungan) bertambah. referensi nil = tanpa referensi (mode rentan).
func (s Service) jurnalAngsuran(ctx context.Context, tx repo.Tx, a repo.Angsuran, referensi *string) (jurnal int64, baru bool, err error) {
	if referensi != nil {
		if id, ada, err := tx.JurnalReferensi(ctx, *referensi); err != nil || ada {
			return id, false, err
		}
	}
	akun := []int64{a.AkunID}
	if a.MerchantAkunID != nil {
		akun = append(akun, *a.MerchantAkunID)
	}
	buku, err := tx.KunciBukuAkun(ctx, akun...)
	if err != nil {
		return 0, false, err
	}
	dari := buku[a.AkunID]
	var ke repo.Buku
	if a.Jenis == "tabungan" {
		if ke, err = tx.BukuTabungan(ctx, a.AkunID); err != nil {
			return 0, false, err
		}
	} else {
		ke = buku[*a.MerchantAkunID]
	}
	if dari.Saldo < a.Jumlah {
		return 0, false, ErrSaldoKurang
	}
	ket := fmt.Sprintf("Angsuran ke-%d jadwal %d", a.Ke, a.JadwalID)
	p := []repo.Posting{{BukuID: dari.ID, Jumlah: -a.Jumlah}, {BukuID: ke.ID, Jumlah: a.Jumlah}}
	if referensi == nil {
		jurnal, err = tx.CatatJurnal(ctx, jenisJurnalAngsuran(a), ket, a.AkunID, nil, p)
		return jurnal, err == nil, err
	}
	return tx.CatatJurnalReferensi(ctx, jenisJurnalAngsuran(a), ket, a.AkunID, *referensi, p)
}

func referensiAngsuran(a repo.Angsuran) string {
	return fmt.Sprintf("%s:%d:%d", jenisJurnalAngsuran(a), a.JadwalID, a.Ke)
}

func (s Service) tagihBenar(ctx context.Context, a repo.Angsuran, h *HasilCicilan, berhenti func() bool) (bool, error) {
	if a.Status == "menunggu" {
		ref := referensiAngsuran(a)
		var jurnal int64
		var baru bool
		err := s.repo.DalamTx(ctx, func(tx repo.Tx) (e error) {
			jurnal, baru, e = s.jurnalAngsuran(ctx, tx, a, &ref)
			return e
		})
		if errors.Is(err, ErrSaldoKurang) {
			h.Gagal++
			_, err = s.repo.TandaiAngsuran(ctx, a.JadwalID, a.Ke, []string{"menunggu"}, "gagal", nil)
			return false, err
		}
		if err != nil {
			return false, err
		}
		if baru {
			h.Dijurnal++
		} else {
			h.JurnalAda++
		}
		if baru && berhenti() {
			return true, nil
		}
		if _, err := s.repo.TandaiAngsuran(ctx, a.JadwalID, a.Ke, []string{"menunggu"}, "terjurnal", &jurnal); err != nil {
			return false, err
		}
	}
	ok, err := s.repo.TandaiAngsuran(ctx, a.JadwalID, a.Ke, []string{"terjurnal"}, "dicatat", nil)
	if ok {
		h.Dicatat++
	}
	return false, err
}

func (s Service) tagihRentan(ctx context.Context, a repo.Angsuran, h *HasilCicilan, berhenti func() bool) (bool, error) {
	kini := s.kini()
	kunci := fmt.Sprintf("cicilan:%d:%d", a.JadwalID, a.Ke)
	hasil, _, err := s.repo.KlaimKunci(ctx, kunci, a.AkunID, "angsuran", kini, kini.Add(24*time.Hour))
	if err != nil {
		return false, err
	}
	if hasil != repo.KlaimBaru {
		h.Dilewati++
		return false, nil
	}
	var jurnal int64
	err = s.repo.DalamTx(ctx, func(tx repo.Tx) (e error) {
		jurnal, _, e = s.jurnalAngsuran(ctx, tx, a, nil)
		return e
	})
	if errors.Is(err, ErrSaldoKurang) {
		h.Gagal++
		if err := s.repo.LepasKunci(ctx, kunci); err != nil {
			return false, err
		}
		_, err = s.repo.TandaiAngsuran(ctx, a.JadwalID, a.Ke, []string{"menunggu"}, "gagal", nil)
		return false, err
	}
	if err != nil {
		return false, err
	}
	h.Dijurnal++
	if err := s.repo.SelesaiKunci(ctx, kunci, []byte(fmt.Sprintf(`{"jurnal":%d}`, jurnal))); err != nil {
		return false, err
	}
	if berhenti() {
		return true, nil
	}
	ok, err := s.repo.TandaiAngsuran(ctx, a.JadwalID, a.Ke, []string{"menunggu", "terjurnal"}, "dicatat", &jurnal)
	if ok {
		h.Dicatat++
	}
	return false, err
}

// DenganEventPembayaran menyalakan event pembayaran untuk relay (flag -event-pembayaran, lab t5-fanout): Bayar menulis
// satu baris outbox stream di transaction jurnalnya. Hanya Bayar (POST /bayar); jalur katalog dan QR belum menulisnya.
func (s Service) DenganEventPembayaran(aktif bool) Service { s.eventPembayaran = aktif; return s }
