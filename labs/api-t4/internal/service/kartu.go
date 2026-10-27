package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgconn"

	"lab/apit4/internal/penerbit"
	"lab/apit4/internal/repo"
)

// Kartu virtual (Tahap 4, M37, ADR 42). Penerbit kartu memanggil Rekeningo untuk otorisasi, clearing, dan reversal,
// dengan tenggat 2 detik (tiruan lab mengikuti dokumentasi satu penerbit). Dana yang sudah disetujui tidak bisa
// ditarik kembali, jadi dana ditahan lebih dulu: hold adalah jurnal di ledger (akun pemilik ke buku dana_tertahan).
// Di lab satu proses ini, "service pembayaran memanggil API ledger" (ADR 37) adalah panggilan fungsi di dalam
// transaction yang sama; pemisahan service dibuktikan lab t4-modul.

var (
	ErrKartuTidakAda     = errors.New("kartu tidak ditemukan")
	ErrKartuStatus       = errors.New("kartu tidak dalam status yang bisa diubah")
	ErrKartuPenerbit     = errors.New("penerbit kartu tidak tersedia")
	ErrOtorisasiTidakAda = errors.New("otorisasi tidak ditemukan")
	ErrOtorisasiStatus   = errors.New("otorisasi tidak dalam status yang bisa diproses")
	ErrOtorisasiBeda     = errors.New("id_penerbit sudah dipakai untuk otorisasi lain")
)

func init() {
	AmbangEndpoint["kartu"] = [2]float64{3, 3.0 / 3600} // 3 kartu, isi ulang 3 per jam (Asumsi lab)
}

// LockTimeoutKartuBawaan: lock_timeout transaction otorisasi bila Dep.LockTimeoutKartu kosong (ADR 42): 1 detik,
// sisa dari tenggat 2 detik penerbit sesudah panggilan HTTP internal.
const LockTimeoutKartuBawaan = time.Second

// KunciPenerbitSah membandingkan header X-Penerbit-Kunci dengan kunci server tanpa membocorkan panjang kecocokan.
// Kunci server kosong berarti tidak ada penerbit yang dikenal: semua ditolak.
func (s Service) KunciPenerbitSah(kunci string) bool {
	if s.t4.KunciPenerbit == "" {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(kunci), []byte(s.t4.KunciPenerbit)) == 1
}

// KartuAktifSekarang: false bila kill switch mematikan otorisasi baru.
func (s Service) KartuAktifSekarang() bool { return s.t4.KartuAktif == nil || s.t4.KartuAktif.Load() }

func (s Service) lockTimeoutKartu() time.Duration {
	if s.t4.LockTimeoutKartu > 0 {
		return s.t4.LockTimeoutKartu
	}
	return LockTimeoutKartuBawaan
}

// TerbitkanKartu: kartu virtual untuk akun yang sudah terverifikasi. Panggilan ke penerbit dilakukan di luar
// transaction (ADR 22) dengan key acak dari server; penerbit yang timeout meninggalkan kartu yatim di sisi penerbit
// (tidak ada baris di sini), dan tidak ada yang menagihnya karena token-nya tidak pernah kita simpan.
func (s Service) TerbitkanKartu(ctx context.Context, peminta int64) (repo.Kartu, error) {
	a, err := s.repo.Akun(ctx, peminta)
	if err != nil {
		return repo.Kartu{}, err
	}
	if a.Jenis != "karyawan" && a.Jenis != "pemakai" {
		return repo.Kartu{}, ErrDilarang
	}
	if a.Status == "dibekukan" {
		return repo.Kartu{}, ErrDibekukan
	}
	if a.Tingkat != "terverifikasi" {
		return repo.Kartu{}, ErrButuhVerifikasi
	}
	if err := s.BatasAkun("kartu", peminta); err != nil {
		return repo.Kartu{}, err
	}
	if s.t4.Penerbit == nil {
		return repo.Kartu{}, ErrKartuPenerbit
	}
	b := make([]byte, 12)
	if _, err := rand.Read(b); err != nil {
		return repo.Kartu{}, err
	}
	token, empat, err := s.t4.Penerbit.Terbitkan(ctx, hex.EncodeToString(b))
	if errors.Is(err, penerbit.ErrTidakPasti) || errors.Is(err, penerbit.ErrDitolak) {
		return repo.Kartu{}, ErrKartuPenerbit
	}
	if err != nil {
		return repo.Kartu{}, err
	}
	return s.repo.BuatKartu(ctx, peminta, token, empat)
}

// DaftarKartu: kartu milik peminta.
func (s Service) DaftarKartu(ctx context.Context, peminta int64) ([]repo.Kartu, error) {
	return s.repo.DaftarKartu(ctx, peminta)
}

// UbahStatusKartu membekukan (ke = "dibekukan") atau membuka (ke = "aktif") kartu milik peminta. Kartu orang lain
// dijawab tidak ditemukan. Kartu yang sudah ditutup tidak bisa dibuka lagi. Akun yang dibekukan tim risk tidak
// bisa membuka kartunya sendiri.
func (s Service) UbahStatusKartu(ctx context.Context, peminta, id int64, ke string) (repo.Kartu, error) {
	dari := []string{"aktif", "dibekukan"}
	if ke == "aktif" {
		a, err := s.repo.Akun(ctx, peminta)
		if err != nil {
			return repo.Kartu{}, err
		}
		if a.Status == "dibekukan" {
			return repo.Kartu{}, ErrDibekukan
		}
		dari = []string{"dibekukan", "aktif"}
	}
	k, err := s.repo.UbahStatusKartu(ctx, id, peminta, dari, ke)
	if errors.Is(err, repo.ErrTidakAda) {
		if _, e := s.repo.KartuMilik(ctx, id, peminta); errors.Is(e, repo.ErrTidakAda) {
			return repo.Kartu{}, ErrKartuTidakAda
		} else if e != nil {
			return repo.Kartu{}, e
		}
		return repo.Kartu{}, ErrKartuStatus // kartu ditutup
	}
	return k, err
}

// ---------- otorisasi ----------

// PermintaanOtorisasi: yang dikirim penerbit.
type PermintaanOtorisasi struct {
	IDPenerbit string
	Token      string
	Jumlah     int64
}

// Keputusan: jawaban untuk penerbit. Alasan satu kata, hanya pada penolakan.
type Keputusan struct {
	Keputusan string `json:"keputusan"` // setuju atau tolak
	Alasan    string `json:"alasan,omitempty"`
}

func setuju() Keputusan             { return Keputusan{Keputusan: "setuju"} }
func tolak(alasan string) Keputusan { return Keputusan{Keputusan: "tolak", Alasan: alasan} }

// MaksJumlahKartu: batas wajar satu otorisasi (Asumsi lab), supaya angka mustahil ditolak sebelum menyentuh database.
const MaksJumlahKartu = 50_000_000

func periksaOtorisasi(in PermintaanOtorisasi) error {
	switch {
	case in.IDPenerbit == "" || len(in.IDPenerbit) > 64:
		return ErrValidasi{"id_penerbit", "wajib, paling banyak 64 karakter"}
	case in.Token == "" || len(in.Token) > 128:
		return ErrValidasi{"token", "wajib, paling banyak 128 karakter"}
	case in.Jumlah <= 0 || in.Jumlah > MaksJumlahKartu:
		return ErrValidasi{"jumlah", "harus lebih dari 0 dan paling banyak 50000000"}
	}
	return nil
}

func hashOtorisasi(in PermintaanOtorisasi) string {
	h := sha256.Sum256([]byte(fmt.Sprintf("%s|%d", in.Token, in.Jumlah)))
	return hex.EncodeToString(h[:])
}

// jawabUlang: id_penerbit yang sama dijawab dengan keputusan yang sama, tanpa jurnal kedua. Kartu atau jumlah
// yang berbeda dengan otorisasi yang tercatat berarti id itu dipakai untuk hal lain.
func jawabUlang(o repo.Otorisasi, kartu repo.Kartu, in PermintaanOtorisasi) (Keputusan, error) {
	if o.KartuID != kartu.ID || o.Jumlah != in.Jumlah {
		return Keputusan{}, ErrOtorisasiBeda
	}
	if o.Status == "ditolak" {
		return tolak("ditolak-sebelumnya"), nil
	}
	return setuju(), nil
}

// --8<-- [start:otorisasi]
// Otorisasi menjawab penerbit (ADR 42). Versi benar: satu transaction dengan lock_timeout, buku pemilik dikunci
// (ORDER BY id FOR UPDATE, ADR 13), saldo dan batas harian diperiksa SESUDAH lock, lalu dana ditahan lewat jurnal
// kartu_tahan dan barisnya ditulis. Persetujuan hanya diberikan sesudah hold tercatat, karena persetujuan tidak
// bisa ditarik. Lock yang tidak didapat dalam lock_timeout dijawab tolak (alasan sibuk) dalam tenggat penerbit.
func (s Service) Otorisasi(ctx context.Context, in PermintaanOtorisasi) (Keputusan, error) {
	if err := periksaOtorisasi(in); err != nil {
		return Keputusan{}, err
	}
	if !s.KartuAktifSekarang() {
		return tolak("kill-switch"), nil
	}
	if s.rentan == RentanKartuTanpaHold {
		return s.otorisasiTanpaHold(ctx, in)
	}
	var k Keputusan
	err := s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		var err error
		k, err = s.otorisasiDalamTx(ctx, tx, in)
		return err
	})
	var pg *pgconn.PgError
	if errors.As(err, &pg) && pg.Code == "55P03" { // lock_not_available: lock_timeout habis
		return tolak("sibuk"), nil
	}
	return k, err
}

func (s Service) otorisasiDalamTx(ctx context.Context, tx repo.Tx, in PermintaanOtorisasi) (Keputusan, error) {
	if err := tx.BatasWaktuKunci(ctx, s.lockTimeoutKartu()); err != nil {
		return Keputusan{}, err
	}
	kartu, err := tx.KartuAtasToken(ctx, in.Token)
	if errors.Is(err, repo.ErrTidakAda) {
		return tolak("kartu-tidak-dikenal"), nil
	}
	if err != nil {
		return Keputusan{}, err
	}
	_, statusAkun, err := tx.KartuStatusAkun(ctx, kartu.AkunID)
	if err != nil {
		return Keputusan{}, err
	}
	buku, err := tx.KunciBukuAkun(ctx, kartu.AkunID)
	if err != nil {
		return Keputusan{}, err
	}
	b, ada := buku[kartu.AkunID]
	if !ada {
		return Keputusan{}, fmt.Errorf("akun %d pemilik kartu %d tidak punya buku", kartu.AkunID, kartu.ID)
	}
	// Sesudah lock: otorisasi lain dengan id_penerbit yang sama sudah COMMIT atau belum pernah ada.
	if o, err := tx.OtorisasiAtasID(ctx, in.IDPenerbit, true); err == nil {
		return jawabUlang(o, kartu, in)
	} else if !errors.Is(err, repo.ErrTidakAda) {
		return Keputusan{}, err
	}
	kini := s.kini()
	tahanSampai := kini.Add(UmurTahanKartu)
	// Hold sudah dijurnal oleh panggilan sebelumnya yang mati sebelum barisnya tertulis: key ledger masih hidup.
	// Ulangan mendapat jurnal tahan yang sama, bukan hold kedua (ADR 42, ADR 37).
	if j, err := tx.KartuKunciHidup(ctx, in.IDPenerbit, kini); err != nil {
		return Keputusan{}, err
	} else if j != nil {
		_, err := tx.BuatOtorisasi(ctx, kartu.ID, in.IDPenerbit, in.Jumlah, "ditahan", j, &tahanSampai)
		return setuju(), err
	}
	tolakDanCatat := func(alasan string) (Keputusan, error) {
		_, err := tx.BuatOtorisasi(ctx, kartu.ID, in.IDPenerbit, in.Jumlah, "ditolak", nil, nil)
		return tolak(alasan), err
	}
	if kartu.Status != "aktif" || statusAkun == "dibekukan" {
		return tolakDanCatat("kartu-dibekukan")
	}
	hariIni, err := tx.JumlahKartuHariIni(ctx, kartu.ID)
	if err != nil {
		return Keputusan{}, err
	}
	if hariIni+in.Jumlah > kartu.BatasHarian {
		return tolakDanCatat("batas-harian")
	}
	if b.Saldo < in.Jumlah { // dibaca sesudah lock
		return tolakDanCatat("saldo-kurang")
	}
	if _, baru, err := tx.KunciLedger(ctx, in.IDPenerbit, kartu.AkunID, hashOtorisasi(in), kini, kini.Add(UmurKunci)); err != nil {
		return Keputusan{}, err
	} else if !baru {
		return Keputusan{}, ErrOtorisasiBeda // key hidup yang belum selesai: id ini dipakai alur lain
	}
	tertahan, err := tx.BukuSistem(ctx, "dana_tertahan")
	if err != nil {
		return Keputusan{}, err
	}
	j, err := tx.CatatJurnal(ctx, "kartu_tahan", "Dana tertahan otorisasi kartu "+in.IDPenerbit, kartu.AkunID, nil,
		[]repo.Posting{{BukuID: b.ID, Jumlah: -in.Jumlah}, {BukuID: tertahan, Jumlah: in.Jumlah}})
	if err != nil {
		return Keputusan{}, err
	}
	if _, err := tx.BuatOtorisasi(ctx, kartu.ID, in.IDPenerbit, in.Jumlah, "ditahan", &j, &tahanSampai); err != nil {
		return Keputusan{}, err
	}
	return setuju(), tx.SelesaiKunciLedger(ctx, in.IDPenerbit, j)
}

// --8<-- [end:otorisasi]

// --8<-- [start:tanpa-hold]
// otorisasiTanpaHold adalah handler versi pertama (mode rentan kartu-tanpa-hold, M37): cek saldo, lalu setuju,
// tanpa lock dan tanpa menahan dana. Cek-lalu-tulis seperti M9: dua otorisasi serentak yang masing-masing di bawah
// saldo sama-sama disetujui. Dana tidak berpindah; ledger baru menjaga saldo saat clearing, berjam-jam kemudian,
// padahal persetujuan sudah diberikan. JedaCekTulis (lab saja) melebarkan celah di antara cek dan tulis.
func (s Service) otorisasiTanpaHold(ctx context.Context, in PermintaanOtorisasi) (Keputusan, error) {
	kartu, err := s.repo.KartuAtasToken(ctx, in.Token)
	if errors.Is(err, repo.ErrTidakAda) {
		return tolak("kartu-tidak-dikenal"), nil
	}
	if err != nil {
		return Keputusan{}, err
	}
	if o, err := s.repo.OtorisasiLewatID(ctx, in.IDPenerbit); err == nil {
		return jawabUlang(o, kartu, in)
	} else if !errors.Is(err, repo.ErrTidakAda) {
		return Keputusan{}, err
	}
	a, err := s.repo.Akun(ctx, kartu.AkunID)
	if err != nil {
		return Keputusan{}, err
	}
	catat := func(status, alasan string) (Keputusan, error) {
		err := s.repo.DalamTx(ctx, func(tx repo.Tx) error {
			_, err := tx.BuatOtorisasi(ctx, kartu.ID, in.IDPenerbit, in.Jumlah, status, nil, nil)
			return err
		})
		if isUnik(err) { // id_penerbit yang sama tiba bersamaan: yang pertama menang, jawabannya dibaca ulang
			o, e := s.repo.OtorisasiLewatID(ctx, in.IDPenerbit)
			if e != nil {
				return Keputusan{}, e
			}
			return jawabUlang(o, kartu, in)
		}
		if err != nil {
			return Keputusan{}, err
		}
		if status == "ditolak" {
			return tolak(alasan), nil
		}
		return setuju(), nil
	}
	if kartu.Status != "aktif" || a.Status == "dibekukan" {
		return catat("ditolak", "kartu-dibekukan")
	}
	if a.Saldo < in.Jumlah { // saldo_cache tanpa lock: sudah bisa basi saat baris ditulis
		return catat("ditolak", "saldo-kurang")
	}
	if s.t4.JedaCekTulis > 0 {
		time.Sleep(s.t4.JedaCekTulis)
	}
	return catat("ditahan", "") // status ditahan tanpa jurnal: tidak ada dana yang benar-benar tertahan
}

// --8<-- [end:tanpa-hold]

// ---------- clearing, reversal, kedaluwarsa ----------

// HasilOtorisasi: keadaan satu otorisasi sesudah clearing atau reversal.
type HasilOtorisasi struct {
	IDPenerbit string `json:"id_penerbit"`
	Status     string `json:"status"`
	Jumlah     int64  `json:"jumlah"`
	Jurnal     *int64 `json:"jurnal,omitempty"`
}

// --8<-- [start:clearing]
// Clearing: penerbit menagih otorisasi yang sudah disetujui. Dengan hold, dana pindah dari dana_tertahan ke
// settlement_kartu dan tidak menyentuh saldo pemilik lagi. Otorisasi tanpa hold (dari mode rentan) mengambil dana
// langsung dari buku pemilik; bila saldo sudah tidak cukup, database menolak saat COMMIT (saldo_karyawan_tidak_negatif)
// dan jawabannya ErrSaldoKurang: uang yang sudah disetujui kepada toko tidak punya penutup.
func (s Service) Clearing(ctx context.Context, idPenerbit string, jumlah int64) (HasilOtorisasi, error) {
	if idPenerbit == "" || len(idPenerbit) > 64 {
		return HasilOtorisasi{}, ErrValidasi{"id_penerbit", "wajib, paling banyak 64 karakter"}
	}
	if jumlah <= 0 || jumlah > MaksJumlahKartu {
		return HasilOtorisasi{}, ErrValidasi{"jumlah", "harus lebih dari 0 dan paling banyak 50000000"}
	}
	var h HasilOtorisasi
	err := s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		o, err := tx.OtorisasiAtasID(ctx, idPenerbit, true)
		if errors.Is(err, repo.ErrTidakAda) {
			return ErrOtorisasiTidakAda
		}
		if err != nil {
			return err
		}
		if o.Status != "ditahan" && o.Status != "ditangkap" {
			return ErrOtorisasiStatus
		}
		if o.Jumlah != jumlah {
			return ErrValidasi{"jumlah", "harus sama dengan jumlah otorisasi"}
		}
		h = HasilOtorisasi{IDPenerbit: idPenerbit, Status: "ditangkap", Jumlah: jumlah, Jurnal: o.JurnalTangkapID}
		if o.Status == "ditangkap" { // clearing diulang: jawaban yang sama, tanpa jurnal kedua
			return nil
		}
		kartu, err := tx.KartuAtasID(ctx, o.KartuID)
		if err != nil {
			return err
		}
		settlement, err := tx.BukuSistem(ctx, "settlement_kartu")
		if err != nil {
			return err
		}
		var sumber int64
		if o.JurnalTahanID != nil {
			if sumber, err = tx.BukuSistem(ctx, "dana_tertahan"); err != nil {
				return err
			}
			if _, err = tx.KunciBukuID(ctx, sumber, settlement); err != nil {
				return err
			}
		} else {
			buku, err := tx.KunciBukuAkun(ctx, kartu.AkunID)
			if err != nil {
				return err
			}
			sumber = buku[kartu.AkunID].ID
		}
		j, err := tx.CatatJurnal(ctx, "kartu_tangkap", "Penagihan otorisasi kartu "+idPenerbit, kartu.AkunID, nil,
			[]repo.Posting{{BukuID: sumber, Jumlah: -jumlah}, {BukuID: settlement, Jumlah: jumlah}})
		if err != nil {
			return err
		}
		ok, err := tx.UbahOtorisasi(ctx, o.ID, "ditahan", "ditangkap", &j)
		if err != nil {
			return err
		}
		if !ok {
			return ErrOtorisasiStatus
		}
		h.Jurnal = &j
		return nil
	})
	var pg *pgconn.PgError
	if errors.As(err, &pg) && pg.Code == "23514" && pg.ConstraintName == "saldo_karyawan_tidak_negatif" {
		return HasilOtorisasi{}, ErrSaldoKurang
	}
	return h, err
}

// --8<-- [end:clearing]

// Reversal: penerbit membatalkan otorisasi yang belum ditagih. Dana tertahan kembali lewat jurnal pembalik.
func (s Service) Reversal(ctx context.Context, idPenerbit string) (HasilOtorisasi, error) {
	if idPenerbit == "" || len(idPenerbit) > 64 {
		return HasilOtorisasi{}, ErrValidasi{"id_penerbit", "wajib, paling banyak 64 karakter"}
	}
	h, _, err := s.lepasHold(ctx, idPenerbit, "dibalik", "Reversal otorisasi kartu "+idPenerbit+" oleh penerbit", false)
	return h, err
}

// --8<-- [start:lepas-hold]
// lepasHold membalik hold satu otorisasi lewat jurnal pembalik dan memindahkan statusnya ke `akhir` (dibalik atau
// kedaluwarsa). Dua pemanggil bersamaan tidak melepas dua kali: baris dikunci, status harus masih ditahan, dan
// jurnal pembalik punya UNIQUE (membalik_jurnal_id). jatuhTempo=true (job kedaluwarsa) melewati otorisasi yang
// ternyata sudah ditagih atau belum jatuh tempo tanpa kesalahan.
func (s Service) lepasHold(ctx context.Context, idPenerbit, akhir, alasan string, jatuhTempo bool) (HasilOtorisasi, bool, error) {
	var h HasilOtorisasi
	dilepas := false
	err := s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		o, err := tx.OtorisasiAtasID(ctx, idPenerbit, true)
		if errors.Is(err, repo.ErrTidakAda) {
			return ErrOtorisasiTidakAda
		}
		if err != nil {
			return err
		}
		h = HasilOtorisasi{IDPenerbit: idPenerbit, Status: o.Status, Jumlah: o.Jumlah}
		switch o.Status {
		case "dibalik", "kedaluwarsa": // sudah dilepas: jawaban yang sama
			return nil
		case "ditahan":
		default:
			if jatuhTempo {
				return nil
			}
			return ErrOtorisasiStatus
		}
		if jatuhTempo && (o.TahanSampai == nil || !o.TahanSampai.Before(s.kini())) {
			return nil
		}
		if o.JurnalTahanID != nil {
			kartu, err := tx.KartuAtasID(ctx, o.KartuID)
			if err != nil {
				return err
			}
			// Urutan lock sama dengan otorisasi: buku milik akun lebih dulu, buku sistem (dana_tertahan) sesudahnya.
			// KunciBukuID mengurutkan menurut id, dan di lab buku dana_tertahan (dibuat migrasi 000020) berid lebih
			// kecil daripada buku pemilik (dibuat seed): tanpa baris ini reversal memegang dana_tertahan lalu
			// menunggu buku pemilik, sedangkan otorisasi pemilik yang sama memegang buku pemilik lalu menunggu
			// dana_tertahan (deadlock, SQLSTATE 40P01).
			if _, err := tx.KunciBukuAkun(ctx, kartu.AkunID); err != nil {
				return err
			}
			asal, err := tx.KartuPostingJurnal(ctx, *o.JurnalTahanID)
			if err != nil {
				return err
			}
			id := make([]int64, len(asal))
			cermin := make([]repo.Posting, len(asal))
			for i, p := range asal {
				id[i], cermin[i] = p.BukuID, repo.Posting{BukuID: p.BukuID, Jumlah: -p.Jumlah}
			}
			if _, err := tx.KunciBukuID(ctx, id...); err != nil {
				return err
			}
			j, err := tx.CatatJurnal(ctx, "pembalik", alasan, kartu.AkunID, o.JurnalTahanID, cermin)
			if err != nil {
				return err
			}
			h.Jurnal = &j
		}
		ok, err := tx.UbahOtorisasi(ctx, o.ID, "ditahan", akhir, nil)
		if err != nil {
			return err
		}
		if !ok {
			return ErrOtorisasiStatus
		}
		h.Status, dilepas = akhir, true
		return nil
	})
	return h, dilepas, err
}

// --8<-- [end:lepas-hold]

// KedaluwarsaHold melepas hold yang lewat `tahan_sampai` (7 hari, Asumsi; ADR 42). Satu transaction per
// otorisasi; aman dijalankan dua kali. Dijalankan job `-kedaluwarsa-hold`.
func (s Service) KedaluwarsaHold(ctx context.Context) (diperiksa, dilepas int, err error) {
	ids, err := s.repo.HoldKedaluwarsa(ctx, s.kini())
	if err != nil {
		return 0, 0, err
	}
	for _, id := range ids {
		diperiksa++
		_, ok, err := s.lepasHold(ctx, id, "kedaluwarsa", "Hold kartu "+id+" kedaluwarsa sesudah 7 hari", true)
		if err != nil {
			return diperiksa, dilepas, err
		}
		if ok {
			dilepas++
		}
	}
	return diperiksa, dilepas, nil
}
