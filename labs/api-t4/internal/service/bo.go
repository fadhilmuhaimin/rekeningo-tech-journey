package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"

	"lab/apit4/internal/objek"
	"lab/apit4/internal/repo"
)

// Back office tim risk (naskah M38, ADR 43). Peran = akun.jenis: hanya jenis `risk`. Setiap aksi berisiko menulis satu
// baris audit berantai di transaction yang sama dengan aksinya (Service.Audit): aksi yang dibatalkan tidak
// meninggalkan catatan, dan aksi yang berhasil tidak kehilangan catatannya. Mode rentan bo-tanpa-audit (versi
// pertama) menjalankan semua aksi yang sama tanpa menulis catatan.

var (
	// ErrButuhPersetujuan: aksi butuh petugas risk kedua yang tidak diberikan atau tidak sah. Satu galat untuk semua
	// sebab (tanpa token, token salah, penyetuju bukan risk, penyetuju sama dengan pelaku): penanya tidak diberi
	// petunjuk bagian mana yang salah.
	ErrButuhPersetujuan = errors.New("butuh persetujuan petugas risk kedua")
	// ErrSudahDiputuskan: pengajuan itu sudah disetujui atau ditolak.
	ErrSudahDiputuskan = errors.New("pengajuan sudah diputuskan")
	// ErrStatusSama: akun sudah berstatus seperti yang diminta.
	ErrStatusSama = errors.New("status akun sudah seperti itu")
	// ErrBerkasRusak: checksum isi berkas tidak cocok dengan yang tercatat; isi tidak dikirim.
	ErrBerkasRusak = errors.New("checksum berkas tidak cocok")
	// ErrObjekTidakDipasang: penyimpanan objek tidak dipasang di proses ini.
	ErrObjekTidakDipasang = errors.New("penyimpanan objek tidak dipasang")
	// ErrFlagTidakDipasang: kill switch kartu tidak dipasang di proses ini.
	ErrFlagTidakDipasang = errors.New("kill switch kartu tidak dipasang")
)

func init() {
	// Batas laju per petugas (Asumsi lab): 120 aksi, isi ulang 2 per detik. Impor katalog: 10 impor, isi ulang 10 per jam.
	AmbangEndpoint["bo"] = [2]float64{120, 2}
	AmbangEndpoint["impor-katalog"] = [2]float64{10, 10.0 / 3600}
}

// Batas nilai yang boleh diubah tim risk (Asumsi lab).
const (
	MaksBatasHarianBO int64 = 5_000_000
	minAlasan               = 20
	maksAlasan              = 300
)

// periksaAlasan: alasan tertulis wajib untuk aksi berisiko (ADR 43): paling sedikit 20 karakter, paling banyak 300,
// tanpa karakter kontrol. Dihitung dalam karakter, bukan byte.
func periksaAlasan(a string) (string, error) {
	a = strings.TrimSpace(a)
	// Alasan berbyte UTF-8 tidak sah (mis. ?alasan=%FF di jalur berkas) lolos hitungan karakter dan baru ditolak
	// PostgreSQL (22021) saat baris audit ditulis: jawabannya 500, bukan 422.
	if !utf8.ValidString(a) {
		return "", ErrValidasi{"alasan", "harus teks UTF-8 yang sah"}
	}
	n := utf8.RuneCountInString(a)
	if n < minAlasan || n > maksAlasan {
		return "", ErrValidasi{"alasan", fmt.Sprintf("wajib, %d sampai %d karakter: kenapa aksi ini dilakukan", minAlasan, maksAlasan)}
	}
	for _, r := range a {
		if r < 0x20 || r == 0x7f {
			return "", ErrValidasi{"alasan", "tidak boleh berisi baris baru atau karakter kontrol"}
		}
	}
	return a, nil
}

// petugasRisk: pelaku harus akun risk yang aktif. Dicek sebelum apa pun dibaca atau ditulis.
func (s Service) petugasRisk(ctx context.Context, id int64) error {
	a, err := s.repo.Akun(ctx, id)
	if errors.Is(err, repo.ErrTidakAda) {
		return ErrDilarang
	}
	if err != nil {
		return err
	}
	if a.Jenis != "risk" {
		return ErrDilarang
	}
	if a.Status != "aktif" {
		return ErrDibekukan
	}
	return s.BatasAkun("bo", id)
}

// penyetuju mengubah token sesi petugas kedua menjadi nomor akunnya. Petugas kedua harus berjenis risk, aktif, dan
// bukan pelaku sendiri.
func (s Service) penyetuju(ctx context.Context, pelaku int64, token string) (int64, error) {
	if token == "" {
		return 0, ErrButuhPersetujuan
	}
	sesi, err := s.Periksa(ctx, token)
	if errors.Is(err, ErrSesiTidakSah) {
		return 0, ErrButuhPersetujuan
	}
	if err != nil {
		return 0, err
	}
	// --8<-- [start:penyetuju-sah]
	if sesi.Jenis != "app" || sesi.AkunID == pelaku {
		return 0, ErrButuhPersetujuan
	}
	a, err := s.repo.Akun(ctx, sesi.AkunID)
	if err != nil {
		return 0, err
	}
	if a.Jenis != "risk" || a.Status != "aktif" {
		return 0, ErrButuhPersetujuan
	}
	// --8<-- [end:penyetuju-sah]
	return a.ID, nil
}

// targetBoleh: akun risk dan admin tidak dibekukan, dibuka, atau diubah batasnya oleh tim risk.
func targetBoleh(jenis string) error {
	if jenis == "risk" || jenis == "admin" {
		return ErrDilarang
	}
	return nil
}

// LihatAkunBO membaca satu akun untuk tim risk dan mencatatnya dalam satu transaction: yang dilihat dan yang tercatat
// tidak bisa berbeda. Akun yang tidak ada tidak meninggalkan catatan.
func (s Service) LihatAkunBO(ctx context.Context, pelaku, id int64) (repo.AkunBO, error) {
	var a repo.AkunBO
	if err := s.petugasRisk(ctx, pelaku); err != nil {
		return a, err
	}
	err := s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		var err error
		if a, err = tx.AkunBO(ctx, id); err != nil {
			return err
		}
		return s.Audit(ctx, tx, pelaku, "risk", "lihat_akun", fmt.Sprintf("akun:%d", id), "", nil)
	})
	if errors.Is(err, repo.ErrTidakAda) {
		return repo.AkunBO{}, ErrTidakDitemukan
	}
	return a, err
}

// LihatVerifikasiBO membaca metadata satu pengajuan (tanpa file) dan mencatatnya.
func (s Service) LihatVerifikasiBO(ctx context.Context, pelaku, id int64) (repo.BarisVerifikasi, error) {
	var v repo.BarisVerifikasi
	if err := s.petugasRisk(ctx, pelaku); err != nil {
		return v, err
	}
	err := s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		var err error
		if v, err = tx.Verifikasi(ctx, id); err != nil {
			return err
		}
		return s.Audit(ctx, tx, pelaku, "risk", "lihat_verifikasi", fmt.Sprintf("verifikasi:%d", id), "", nil)
	})
	if errors.Is(err, repo.ErrTidakAda) {
		return repo.BarisVerifikasi{}, ErrTidakDitemukan
	}
	return v, err
}

// BukaBerkas mengembalikan isi satu file identitas. Urutannya: alasan diperiksa, metadata dibaca dan baris audit
// ditulis dalam satu transaction yang COMMIT lebih dulu, baru file dibaca dari penyimpanan objek dan checksum-nya
// dibandingkan. Catatannya adalah catatan percobaan membuka: file yang hilang atau rusak tetap meninggalkan baris
// audit, karena yang diminta petugas adalah file itu. Pembacaan dari penyimpanan objek tidak ada di dalam transaction
// (panggilan keluar, ADR 22).
func (s Service) BukaBerkas(ctx context.Context, pelaku, id int64, bagian, alasan string) ([]byte, error) {
	if err := s.petugasRisk(ctx, pelaku); err != nil {
		return nil, err
	}
	alasan, err := periksaAlasan(alasan)
	if err != nil {
		return nil, err
	}
	if bagian != "kartu" && bagian != "swafoto" {
		return nil, ErrTidakDitemukan
	}
	if s.t4.Objek == nil {
		return nil, ErrObjekTidakDipasang
	}
	var kunci, checksum string
	err = s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		v, err := tx.Verifikasi(ctx, id)
		if err != nil {
			return err
		}
		kunci, checksum = v.KunciKartu, v.ChecksumKartu
		if bagian == "swafoto" {
			kunci, checksum = v.KunciSwafoto, v.ChecksumSwafoto
		}
		// --8<-- [start:audit-berkas]
		return s.Audit(ctx, tx, pelaku, "risk", "buka_berkas", fmt.Sprintf("verifikasi:%d/%s", id, bagian), alasan, nil)
		// --8<-- [end:audit-berkas]
	})
	if errors.Is(err, repo.ErrTidakAda) {
		return nil, ErrTidakDitemukan
	}
	if err != nil {
		return nil, err
	}
	if kunci == "" { // retensi sudah menghapus file (repo/berkas.go): baris audit percobaan ini tetap tertulis
		return nil, ErrBerkasDihapus
	}
	isi, err := s.t4.Objek.Baca(ctx, kunci)
	if errors.Is(err, objek.ErrTidakAda) {
		return nil, ErrTidakDitemukan
	}
	if err != nil {
		return nil, err
	}
	// --8<-- [start:cek-checksum]
	h := sha256.Sum256(isi)
	if !strings.EqualFold(hex.EncodeToString(h[:]), checksum) {
		return nil, ErrBerkasRusak
	}
	// --8<-- [end:cek-checksum]
	return isi, nil
}

// BekukanBO membekukan satu akun. Pembekuan darurat: tidak butuh persetujuan kedua, tetapi wajib alasan (ADR 43).
func (s Service) BekukanBO(ctx context.Context, pelaku, id int64, alasan string) error {
	if err := s.petugasRisk(ctx, pelaku); err != nil {
		return err
	}
	alasan, err := periksaAlasan(alasan)
	if err != nil {
		return err
	}
	return s.ubahStatusBO(ctx, pelaku, id, "aktif", "dibekukan", "bekukan", alasan, nil)
}

// BukaBlokirBO membuka blokir: butuh persetujuan petugas risk kedua (ADR 43), yang tercatat sebagai penyetuju.
func (s Service) BukaBlokirBO(ctx context.Context, pelaku, id int64, alasan, tokenPenyetuju string) error {
	if err := s.petugasRisk(ctx, pelaku); err != nil {
		return err
	}
	alasan, err := periksaAlasan(alasan)
	if err != nil {
		return err
	}
	p, err := s.penyetuju(ctx, pelaku, tokenPenyetuju)
	if err != nil {
		return err
	}
	return s.ubahStatusBO(ctx, pelaku, id, "dibekukan", "aktif", "buka_blokir", alasan, &p)
}

func (s Service) ubahStatusBO(ctx context.Context, pelaku, id int64, dari, ke, aksi, alasan string, penyetuju *int64) error {
	err := s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		jenis, err := tx.JenisAkun(ctx, id)
		if err != nil {
			return err
		}
		if err := targetBoleh(jenis); err != nil {
			return err
		}
		ok, err := tx.UbahStatusAkun(ctx, id, dari, ke)
		if err != nil {
			return err
		}
		if !ok {
			return ErrStatusSama
		}
		return s.Audit(ctx, tx, pelaku, "risk", aksi, fmt.Sprintf("akun:%d", id), alasan, penyetuju)
	})
	if errors.Is(err, repo.ErrTidakAda) {
		return ErrTidakDitemukan
	}
	return err
}

// UbahBatasHarianBO mengganti batas transfer harian satu akun. Butuh persetujuan petugas risk kedua (ADR 43). Nilai
// baru ikut di kolom objek audit, karena tabel audit tidak punya kolom nilai.
func (s Service) UbahBatasHarianBO(ctx context.Context, pelaku, id, nilai int64, alasan, tokenPenyetuju string) error {
	if err := s.petugasRisk(ctx, pelaku); err != nil {
		return err
	}
	alasan, err := periksaAlasan(alasan)
	if err != nil {
		return err
	}
	if nilai < 1 || nilai > MaksBatasHarianBO {
		return ErrValidasi{"nilai", fmt.Sprintf("1 sampai %d", MaksBatasHarianBO)}
	}
	p, err := s.penyetuju(ctx, pelaku, tokenPenyetuju)
	if err != nil {
		return err
	}
	err = s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		jenis, err := tx.JenisAkun(ctx, id)
		if err != nil {
			return err
		}
		if err := targetBoleh(jenis); err != nil {
			return err
		}
		ok, err := tx.UbahBatasHarian(ctx, id, nilai)
		if err != nil {
			return err
		}
		if !ok {
			return ErrTidakDitemukan
		}
		return s.Audit(ctx, tx, pelaku, "risk", "ubah_batas", fmt.Sprintf("akun:%d/batas_harian=%d", id, nilai), alasan, &p)
	})
	if errors.Is(err, repo.ErrTidakAda) {
		return ErrTidakDitemukan
	}
	return err
}

// SetujuiMerchantBO dan TolakMerchantBO memutuskan pengajuan merchant (subjek merchant) milik satu akun merchant.
func (s Service) SetujuiMerchantBO(ctx context.Context, pelaku, akun int64, alasan string) error {
	return s.putuskanMerchant(ctx, pelaku, akun, alasan, true)
}

func (s Service) TolakMerchantBO(ctx context.Context, pelaku, akun int64, alasan string) error {
	return s.putuskanMerchant(ctx, pelaku, akun, alasan, false)
}

func (s Service) putuskanMerchant(ctx context.Context, pelaku, akun int64, alasan string, lulus bool) error {
	if err := s.petugasRisk(ctx, pelaku); err != nil {
		return err
	}
	alasan, err := periksaAlasan(alasan)
	if err != nil {
		return err
	}
	status, aksi := "ditolak", "tolak_merchant"
	if lulus {
		status, aksi = "lulus", "setujui_merchant"
	}
	err = s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		// FOR UPDATE di VerifikasiMerchantTerakhir: petugas kedua menunggu di sini, lalu membaca status yang sudah
		// diputuskan.
		id, sekarang, err := tx.VerifikasiMerchantTerakhir(ctx, akun)
		if err != nil {
			return err
		}
		// --8<-- [start:syarat-diajukan]
		if sekarang != "diajukan" {
			return ErrSudahDiputuskan
		}
		// --8<-- [end:syarat-diajukan]
		kini := s.kini()
		ok, err := tx.PutuskanVerifikasi(ctx, id, status, kini, kini.Add(RetensiIdentitas))
		if err != nil {
			return err
		}
		if !ok {
			return ErrSudahDiputuskan
		}
		if lulus {
			if err := tx.NaikkanTingkat(ctx, akun); err != nil {
				return err
			}
		}
		return s.Audit(ctx, tx, pelaku, "risk", aksi, fmt.Sprintf("verifikasi:%d", id), alasan, nil)
	})
	if errors.Is(err, repo.ErrTidakAda) {
		return ErrTidakDitemukan
	}
	return err
}

// SetKartuAktifBO menyalakan atau mematikan kill switch kartu (ADR 42) tanpa deploy. Audit ditulis di transaction;
// flag baru diubah sesudah COMMIT, jadi audit yang gagal tidak meninggalkan flag yang berubah tanpa catatan.
// Flag hidup di memori satu proses: lintas instance butuh penyimpanan bersama (Tidak dijalankan di lab ini).
func (s Service) SetKartuAktifBO(ctx context.Context, pelaku int64, aktif bool, alasan string) error {
	if err := s.petugasRisk(ctx, pelaku); err != nil {
		return err
	}
	alasan, err := periksaAlasan(alasan)
	if err != nil {
		return err
	}
	if s.t4.KartuAktif == nil {
		return ErrFlagTidakDipasang
	}
	keadaan := "mati"
	if aktif {
		keadaan = "aktif"
	}
	err = s.repo.DalamTx(ctx, func(tx repo.Tx) error {
		return s.Audit(ctx, tx, pelaku, "risk", "flag_kartu", "flag:kartu="+keadaan, alasan, nil)
	})
	if err != nil {
		return err
	}
	s.t4.KartuAktif.Store(aktif)
	return nil
}

// VerifikasiAuditBO menghitung ulang seluruh rantai audit. Hash terakhir yang dikembalikan adalah jangkar: bila
// dicatat di luar database, baris ekor yang dihapus ketahuan.
func (s Service) VerifikasiAuditBO(ctx context.Context, pelaku int64) (repo.HasilVerifikasiAudit, error) {
	if err := s.petugasRisk(ctx, pelaku); err != nil {
		return repo.HasilVerifikasiAudit{}, err
	}
	return s.repo.VerifikasiAudit(ctx)
}
