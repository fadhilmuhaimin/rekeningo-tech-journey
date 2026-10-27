package service

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"lab/apit4/internal/objek"
	"lab/apit4/internal/push"
	"lab/apit4/internal/repo"
)

// Tes back office tim risk, audit, dan persetujuan merchant (M38, ADR 43) dengan PostgreSQL sungguhan. Tiap tes
// membuat akunnya sendiri; baris audit tidak bisa dihapus, jadi tes menghitung selisih, bukan total.

const alasanUji = "alasan uji back office yang cukup panjang"

// akunBO membuat satu akun dengan jenis dan tingkat tertentu. Buku dibuat untuk jenis yang punya buku.
func akunBO(t *testing.T, db *sql.DB, jenis, tingkat string, saldo int64) int64 {
	t.Helper()
	var id int64
	if err := db.QueryRow(`SELECT greatest(coalesce(max(id), 0), 100000) + 1 FROM akun`).Scan(&id); err != nil {
		t.Fatal(err)
	}
	var nomor *string
	if jenis == "karyawan" {
		n := fmt.Sprintf("B%d", id)
		nomor = &n
	}
	if _, err := db.Exec(`INSERT INTO akun (id, jenis, nama, email, password_hash, nomor_karyawan, tingkat)
		VALUES ($1, $2, $3, $4, '!', $5, $6)`, id, jenis, fmt.Sprintf("BO %s %d", jenis, id),
		fmt.Sprintf("bo%d@rekeningo.example", id), nomor, tingkat); err != nil {
		t.Fatal(err)
	}
	if jenis == "karyawan" || jenis == "pemakai" || jenis == "merchant" {
		if _, err := db.Exec(`INSERT INTO buku (akun_id, jenis, batas_harian)
			VALUES ($1, $2, CASE WHEN $2 IN ('karyawan', 'pemakai') THEN 500000 END)`, id, jenis); err != nil {
			t.Fatal(err)
		}
		if saldo > 0 {
			isiSaldo(t, db, id, saldo)
		}
	}
	return id
}

func sesiBaru(t *testing.T, db *sql.DB, akun int64) string {
	t.Helper()
	token := fmt.Sprintf("token-bo-%d-%d", akun, time.Now().UnixNano())
	if err := repo.Baru(db).SimpanSesi(context.Background(), hashToken(token), akun, time.Now().Add(time.Hour), "app", nil); err != nil {
		t.Fatal(err)
	}
	return token
}

func jumlahAudit(t *testing.T, db *sql.DB, pelaku int64, aksi string) int {
	t.Helper()
	var n int
	if err := db.QueryRow(`SELECT count(*) FROM audit_log WHERE pelaku_id = $1 AND aksi = $2`, pelaku, aksi).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func totalAudit(t *testing.T, db *sql.DB) int {
	t.Helper()
	var n int
	if err := db.QueryRow(`SELECT count(*) FROM audit_log`).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func statusAkun(t *testing.T, db *sql.DB, id int64) (status, tingkat string) {
	t.Helper()
	if err := db.QueryRow(`SELECT status, tingkat FROM akun WHERE id = $1`, id).Scan(&status, &tingkat); err != nil {
		t.Fatal(err)
	}
	return
}

func verifikasiBaru(t *testing.T, db *sql.DB, akun int64, subjek, status string, kartu, swafoto []byte) int64 {
	t.Helper()
	sk, ss := sha256.Sum256(kartu), sha256.Sum256(swafoto)
	var id int64
	if err := db.QueryRow(`
		INSERT INTO verifikasi (akun_id, subjek, status, berkas_kartu_kunci, berkas_swafoto_kunci, checksum_kartu, checksum_swafoto)
		VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, akun, subjek, status,
		fmt.Sprintf("identitas/k%d", time.Now().UnixNano()), fmt.Sprintf("identitas/s%d", time.Now().UnixNano()),
		hex.EncodeToString(sk[:]), hex.EncodeToString(ss[:])).Scan(&id); err != nil {
		t.Fatal(err)
	}
	return id
}

func TestBOHanyaAkunRisk(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	sasaran := akunBO(t, db, "pemakai", "belum", 0)
	risk2 := akunBO(t, db, "risk", "terverifikasi", 0)
	tokenRisk2 := sesiBaru(t, db, risk2)
	sebelum := totalAudit(t, db)
	for _, jenis := range []string{"pemakai", "merchant", "admin", "hr"} {
		pelaku := akunBO(t, db, jenis, "terverifikasi", 0)
		if _, err := svc.LihatAkunBO(ctx, pelaku, sasaran); !errors.Is(err, ErrDilarang) {
			t.Errorf("%s melihat akun: %v, ingin ErrDilarang", jenis, err)
		}
		if _, err := svc.LihatVerifikasiBO(ctx, pelaku, 1); !errors.Is(err, ErrDilarang) {
			t.Errorf("%s melihat verifikasi: %v, ingin ErrDilarang", jenis, err)
		}
		if _, err := svc.BukaBerkas(ctx, pelaku, 1, "kartu", alasanUji); !errors.Is(err, ErrDilarang) {
			t.Errorf("%s membuka berkas: %v, ingin ErrDilarang", jenis, err)
		}
		if err := svc.BekukanBO(ctx, pelaku, sasaran, alasanUji); !errors.Is(err, ErrDilarang) {
			t.Errorf("%s membekukan: %v, ingin ErrDilarang", jenis, err)
		}
		if err := svc.BukaBlokirBO(ctx, pelaku, sasaran, alasanUji, tokenRisk2); !errors.Is(err, ErrDilarang) {
			t.Errorf("%s membuka blokir: %v, ingin ErrDilarang", jenis, err)
		}
		if err := svc.UbahBatasHarianBO(ctx, pelaku, sasaran, 100_000, alasanUji, tokenRisk2); !errors.Is(err, ErrDilarang) {
			t.Errorf("%s mengubah batas: %v, ingin ErrDilarang", jenis, err)
		}
		if err := svc.SetujuiMerchantBO(ctx, pelaku, sasaran, alasanUji); !errors.Is(err, ErrDilarang) {
			t.Errorf("%s menyetujui merchant: %v, ingin ErrDilarang", jenis, err)
		}
		if err := svc.SetKartuAktifBO(ctx, pelaku, false, alasanUji); !errors.Is(err, ErrDilarang) {
			t.Errorf("%s mematikan kartu: %v, ingin ErrDilarang", jenis, err)
		}
		if _, err := svc.VerifikasiAuditBO(ctx, pelaku); !errors.Is(err, ErrDilarang) {
			t.Errorf("%s memverifikasi audit: %v, ingin ErrDilarang", jenis, err)
		}
	}
	if st, _ := statusAkun(t, db, sasaran); st != "aktif" {
		t.Fatalf("status sasaran %s sesudah semua percobaan ditolak, ingin aktif", st)
	}
	if n := totalAudit(t, db); n != sebelum {
		t.Fatalf("audit bertambah %d baris dari percobaan yang ditolak", n-sebelum)
	}
	// Akun risk yang dibekukan tidak boleh bertindak.
	beku := akunBO(t, db, "risk", "terverifikasi", 0)
	db.Exec(`UPDATE akun SET status = 'dibekukan' WHERE id = $1`, beku)
	if _, err := svc.LihatAkunBO(ctx, beku, sasaran); !errors.Is(err, ErrDibekukan) {
		t.Errorf("risk dibekukan melihat akun: %v, ingin ErrDibekukan", err)
	}
}

func TestBOLihatAkunMenulisAuditDanTidakUntukAkunTakAda(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	risk := akunBO(t, db, "risk", "terverifikasi", 0)
	sasaran := akunBO(t, db, "pemakai", "belum", 250_000)
	a, err := svc.LihatAkunBO(ctx, risk, sasaran)
	if err != nil || a.ID != sasaran || a.Jenis != "pemakai" || a.Tingkat != "belum" || a.Status != "aktif" || a.Saldo != 250_000 {
		t.Fatalf("ringkasan akun %+v, %v", a, err)
	}
	var objekAudit string
	if err := db.QueryRow(`SELECT objek FROM audit_log WHERE pelaku_id = $1 AND aksi = 'lihat_akun'`, risk).Scan(&objekAudit); err != nil || objekAudit != fmt.Sprintf("akun:%d", sasaran) {
		t.Fatalf("baris audit lihat_akun: objek %q, %v", objekAudit, err)
	}
	sebelum := totalAudit(t, db)
	if _, err := svc.LihatAkunBO(ctx, risk, 999_999_999); !errors.Is(err, ErrTidakDitemukan) {
		t.Fatalf("akun tidak ada: %v, ingin ErrTidakDitemukan", err)
	}
	if totalAudit(t, db) != sebelum {
		t.Fatal("akun yang tidak ada meninggalkan baris audit")
	}
}

func TestBOBekukanLalubukaButuhPenyetujuSah(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	risk := akunBO(t, db, "risk", "terverifikasi", 0)
	risk2 := akunBO(t, db, "risk", "terverifikasi", 0)
	pemakai := akunBO(t, db, "pemakai", "terverifikasi", 0)
	sasaran := akunBO(t, db, "pemakai", "belum", 0)

	// Alasan pendek ditolak; tidak ada yang berubah dan tidak ada catatan.
	if err := svc.BekukanBO(ctx, risk, sasaran, "terlalu pendek"); !errors.As(err, new(ErrValidasi)) {
		t.Fatalf("alasan pendek: %v, ingin ErrValidasi", err)
	}
	if st, _ := statusAkun(t, db, sasaran); st != "aktif" || jumlahAudit(t, db, risk, "bekukan") != 0 {
		t.Fatal("alasan pendek mengubah status atau menulis audit")
	}
	// Pembekuan darurat: satu petugas cukup.
	if err := svc.BekukanBO(ctx, risk, sasaran, alasanUji); err != nil {
		t.Fatal(err)
	}
	if st, _ := statusAkun(t, db, sasaran); st != "dibekukan" {
		t.Fatalf("status %s, ingin dibekukan", st)
	}
	if jumlahAudit(t, db, risk, "bekukan") != 1 {
		t.Fatal("pembekuan tidak menulis tepat satu baris audit")
	}
	// Membekukan lagi: status sama, tanpa baris audit baru (aksi gagal tidak meninggalkan catatan).
	if err := svc.BekukanBO(ctx, risk, sasaran, alasanUji); !errors.Is(err, ErrStatusSama) {
		t.Fatalf("bekukan dua kali: %v, ingin ErrStatusSama", err)
	}
	if jumlahAudit(t, db, risk, "bekukan") != 1 {
		t.Fatal("aksi yang gagal meninggalkan baris audit")
	}

	// Membuka blokir butuh petugas kedua yang sah. Semua kegagalan memberi galat yang sama.
	tokenSendiri := sesiBaru(t, db, risk)
	for nama, token := range map[string]string{
		"tanpa token":          "",
		"token tidak dikenal":  "bukan-token-siapa-pun",
		"token pelaku sendiri": tokenSendiri,
		"token bukan risk":     sesiBaru(t, db, pemakai),
	} {
		err := svc.BukaBlokirBO(ctx, risk, sasaran, alasanUji, token)
		if !errors.Is(err, ErrButuhPersetujuan) {
			t.Errorf("%s: %v, ingin ErrButuhPersetujuan", nama, err)
		}
	}
	if st, _ := statusAkun(t, db, sasaran); st != "dibekukan" || jumlahAudit(t, db, risk, "buka_blokir") != 0 {
		t.Fatal("percobaan tanpa penyetuju sah mengubah status atau menulis audit")
	}
	// Petugas kedua yang dibekukan tidak sah.
	risk3 := akunBO(t, db, "risk", "terverifikasi", 0)
	tokenRisk3 := sesiBaru(t, db, risk3)
	db.Exec(`UPDATE akun SET status = 'dibekukan' WHERE id = $1`, risk3)
	if err := svc.BukaBlokirBO(ctx, risk, sasaran, alasanUji, tokenRisk3); !errors.Is(err, ErrButuhPersetujuan) {
		t.Fatalf("penyetuju dibekukan: %v, ingin ErrButuhPersetujuan", err)
	}
	// Penyetuju sah.
	if err := svc.BukaBlokirBO(ctx, risk, sasaran, alasanUji, sesiBaru(t, db, risk2)); err != nil {
		t.Fatal(err)
	}
	if st, _ := statusAkun(t, db, sasaran); st != "aktif" {
		t.Fatalf("status %s sesudah dibuka, ingin aktif", st)
	}
	var penyetuju int64
	if err := db.QueryRow(`SELECT penyetuju_id FROM audit_log WHERE pelaku_id = $1 AND aksi = 'buka_blokir'`, risk).Scan(&penyetuju); err != nil || penyetuju != risk2 {
		t.Fatalf("penyetuju di audit %d, %v; ingin %d", penyetuju, err, risk2)
	}
	// Pembekuan darurat tidak mencatat penyetuju.
	var kosong sql.NullInt64
	db.QueryRow(`SELECT penyetuju_id FROM audit_log WHERE pelaku_id = $1 AND aksi = 'bekukan'`, risk).Scan(&kosong)
	if kosong.Valid {
		t.Fatal("pembekuan darurat mencatat penyetuju")
	}
}

func TestBOAkunRiskDanAdminTidakBisaDibekukan(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	risk := akunBO(t, db, "risk", "terverifikasi", 0)
	for _, jenis := range []string{"risk", "admin"} {
		sasaran := akunBO(t, db, jenis, "terverifikasi", 0)
		if err := svc.BekukanBO(ctx, risk, sasaran, alasanUji); !errors.Is(err, ErrDilarang) {
			t.Errorf("membekukan %s: %v, ingin ErrDilarang", jenis, err)
		}
		if st, _ := statusAkun(t, db, sasaran); st != "aktif" {
			t.Errorf("%s berstatus %s", jenis, st)
		}
	}
	if err := svc.BekukanBO(ctx, risk, 999_999_999, alasanUji); !errors.Is(err, ErrTidakDitemukan) {
		t.Errorf("akun tidak ada: %v, ingin ErrTidakDitemukan", err)
	}
}

// Mode bo-tanpa-audit (back office versi pertama, M38): semua aksi berhasil seperti biasa, dan tidak ada catatan.
func TestBOModeTanpaAuditMenjalankanAksiTanpaCatatan(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	rentan := svc.DenganRentan(RentanTanpaAudit, push.Klien{})
	risk := akunBO(t, db, "risk", "terverifikasi", 0)
	sasaran := akunBO(t, db, "pemakai", "belum", 0)
	sebelum := totalAudit(t, db)
	if _, err := rentan.LihatAkunBO(ctx, risk, sasaran); err != nil {
		t.Fatal(err)
	}
	if err := rentan.BekukanBO(ctx, risk, sasaran, alasanUji); err != nil {
		t.Fatal(err)
	}
	if st, _ := statusAkun(t, db, sasaran); st != "dibekukan" {
		t.Fatalf("aksi tidak berjalan: status %s", st)
	}
	if totalAudit(t, db) != sebelum {
		t.Fatalf("mode tanpa audit menulis %d baris", totalAudit(t, db)-sebelum)
	}
	// Mode benar menulis.
	if _, err := svc.LihatAkunBO(ctx, risk, sasaran); err != nil {
		t.Fatal(err)
	}
	if totalAudit(t, db) != sebelum+1 {
		t.Fatal("mode benar tidak menulis audit")
	}
}

func TestBOBukaBerkasMenulisAuditSebelumIsiDanMenolakChecksumSalah(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	penyimpan := objek.Dir{Akar: t.TempDir()}
	svc = svc.DenganT4(Dep{Objek: penyimpan})
	risk := akunBO(t, db, "risk", "terverifikasi", 0)
	pemohon := akunBO(t, db, "pemakai", "belum", 0)
	kartu, swafoto := []byte("isi-foto-kartu-uji"), []byte("isi-foto-swafoto-uji")
	id := verifikasiBaru(t, db, pemohon, "pemakai", "diajukan", kartu, swafoto)
	var kunciKartu, kunciSwafoto string
	db.QueryRow(`SELECT berkas_kartu_kunci, berkas_swafoto_kunci FROM verifikasi WHERE id = $1`, id).Scan(&kunciKartu, &kunciSwafoto)
	if err := penyimpan.Simpan(ctx, kunciKartu, kartu); err != nil {
		t.Fatal(err)
	}
	if err := penyimpan.Simpan(ctx, kunciSwafoto, []byte("isi-yang-sudah-berubah")); err != nil {
		t.Fatal(err)
	}

	// Alasan pendek: ditolak sebelum audit dan sebelum membaca.
	if _, err := svc.BukaBerkas(ctx, risk, id, "kartu", "pendek"); !errors.As(err, new(ErrValidasi)) {
		t.Fatalf("alasan pendek: %v", err)
	}
	if jumlahAudit(t, db, risk, "buka_berkas") != 0 {
		t.Fatal("alasan pendek menulis audit")
	}
	// Berkas sah: isi kembali dan tepat satu baris audit dengan alasan dan objek yang benar.
	isi, err := svc.BukaBerkas(ctx, risk, id, "kartu", alasanUji)
	if err != nil || string(isi) != string(kartu) {
		t.Fatalf("berkas kartu: %q, %v", isi, err)
	}
	var objekAudit, alasanAudit string
	if err := db.QueryRow(`SELECT objek, alasan FROM audit_log WHERE pelaku_id = $1 AND aksi = 'buka_berkas'`, risk).Scan(&objekAudit, &alasanAudit); err != nil {
		t.Fatalf("baris audit buka_berkas: %v", err)
	}
	if objekAudit != fmt.Sprintf("verifikasi:%d/kartu", id) || alasanAudit != alasanUji {
		t.Fatalf("audit: objek %q alasan %q", objekAudit, alasanAudit)
	}
	// Checksum tidak cocok: isi tidak dikirim, tetapi percobaan membuka tetap tercatat (audit mendahului pembacaan).
	if _, err := svc.BukaBerkas(ctx, risk, id, "swafoto", alasanUji); !errors.Is(err, ErrBerkasRusak) {
		t.Fatalf("checksum salah: %v, ingin ErrBerkasRusak", err)
	}
	if jumlahAudit(t, db, risk, "buka_berkas") != 2 {
		t.Fatal("percobaan dengan checksum salah tidak tercatat")
	}
	// File hilang dari penyimpanan.
	penyimpan.Hapus(ctx, kunciKartu)
	if _, err := svc.BukaBerkas(ctx, risk, id, "kartu", alasanUji); !errors.Is(err, ErrTidakDitemukan) {
		t.Fatalf("file hilang: %v, ingin ErrTidakDitemukan", err)
	}
	// Bagian tidak dikenal, verifikasi tidak ada, penyimpanan tidak dipasang: tanpa audit tambahan.
	sebelum := totalAudit(t, db)
	if _, err := svc.BukaBerkas(ctx, risk, id, "ktp", alasanUji); !errors.Is(err, ErrTidakDitemukan) {
		t.Errorf("bagian ktp: %v", err)
	}
	if _, err := svc.BukaBerkas(ctx, risk, 999_999_999, "kartu", alasanUji); !errors.Is(err, ErrTidakDitemukan) {
		t.Errorf("verifikasi tidak ada: %v", err)
	}
	tanpaObjek, _ := siapkan(t)
	if _, err := tanpaObjek.BukaBerkas(ctx, risk, id, "kartu", alasanUji); !errors.Is(err, ErrObjekTidakDipasang) {
		t.Errorf("tanpa penyimpanan objek: %v", err)
	}
	if totalAudit(t, db) != sebelum {
		t.Fatal("bagian tidak dikenal, verifikasi tidak ada, atau penyimpanan tidak dipasang menulis audit")
	}
}

func TestBOLihatVerifikasiTanpaKunciObjek(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	risk := akunBO(t, db, "risk", "terverifikasi", 0)
	pemohon := akunBO(t, db, "pemakai", "belum", 0)
	id := verifikasiBaru(t, db, pemohon, "pemakai", "diajukan", []byte("a"), []byte("b"))
	v, err := svc.LihatVerifikasiBO(ctx, risk, id)
	if err != nil || v.ID != id || v.AkunID != pemohon || v.Subjek != "pemakai" || v.Status != "diajukan" || len(v.ChecksumKartu) != 64 {
		t.Fatalf("metadata %+v, %v", v, err)
	}
	if jumlahAudit(t, db, risk, "lihat_verifikasi") != 1 {
		t.Fatal("tidak ada tepat satu baris audit lihat_verifikasi")
	}
	if _, err := svc.LihatVerifikasiBO(ctx, risk, 999_999_999); !errors.Is(err, ErrTidakDitemukan) {
		t.Fatalf("tidak ada: %v", err)
	}
}

func TestBOMerchantDisetujuiMengangkatTingkatDanSekaliSaja(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	risk := akunBO(t, db, "risk", "terverifikasi", 0)
	merchant := akunBO(t, db, "merchant", "belum", 0)
	id := verifikasiBaru(t, db, merchant, "merchant", "diajukan", []byte("k"), []byte("s"))
	if err := svc.SetujuiMerchantBO(ctx, risk, merchant, "pendek"); !errors.As(err, new(ErrValidasi)) {
		t.Fatalf("alasan pendek: %v", err)
	}
	if err := svc.SetujuiMerchantBO(ctx, risk, merchant, alasanUji); err != nil {
		t.Fatal(err)
	}
	var status string
	var selesai, hapus sql.NullTime
	db.QueryRow(`SELECT status, selesai, hapus_pada FROM verifikasi WHERE id = $1`, id).Scan(&status, &selesai, &hapus)
	if status != "lulus" || !selesai.Valid || !hapus.Valid || hapus.Time.Sub(selesai.Time) < RetensiIdentitas-time.Second {
		t.Fatalf("verifikasi %s selesai %v hapus_pada %v", status, selesai, hapus)
	}
	if _, tingkat := statusAkun(t, db, merchant); tingkat != "terverifikasi" {
		t.Fatalf("tingkat %s, ingin terverifikasi", tingkat)
	}
	if jumlahAudit(t, db, risk, "setujui_merchant") != 1 {
		t.Fatal("tidak ada tepat satu baris audit setujui_merchant")
	}
	// Kedua kali: sudah diputuskan, tanpa audit baru; menolak yang sudah disetujui juga 409.
	if err := svc.SetujuiMerchantBO(ctx, risk, merchant, alasanUji); !errors.Is(err, ErrSudahDiputuskan) {
		t.Fatalf("setujui dua kali: %v, ingin ErrSudahDiputuskan", err)
	}
	if err := svc.TolakMerchantBO(ctx, risk, merchant, alasanUji); !errors.Is(err, ErrSudahDiputuskan) {
		t.Fatalf("tolak sesudah setuju: %v, ingin ErrSudahDiputuskan", err)
	}
	if jumlahAudit(t, db, risk, "setujui_merchant") != 1 || jumlahAudit(t, db, risk, "tolak_merchant") != 0 {
		t.Fatal("keputusan yang ditolak meninggalkan baris audit")
	}
	// Bukan merchant, dan merchant tanpa pengajuan.
	pemakai := akunBO(t, db, "pemakai", "belum", 0)
	verifikasiBaru(t, db, pemakai, "merchant", "diajukan", []byte("k"), []byte("s")) // subjek merchant tetapi akun pemakai
	if err := svc.SetujuiMerchantBO(ctx, risk, pemakai, alasanUji); !errors.Is(err, ErrTidakDitemukan) {
		t.Errorf("akun pemakai: %v, ingin ErrTidakDitemukan", err)
	}
	kosong := akunBO(t, db, "merchant", "belum", 0)
	if err := svc.SetujuiMerchantBO(ctx, risk, kosong, alasanUji); !errors.Is(err, ErrTidakDitemukan) {
		t.Errorf("merchant tanpa pengajuan: %v, ingin ErrTidakDitemukan", err)
	}
	if _, tingkat := statusAkun(t, db, pemakai); tingkat != "belum" {
		t.Errorf("tingkat pemakai berubah menjadi %s", tingkat)
	}
}

func TestBOMerchantDitolakTidakMengangkatTingkat(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	risk := akunBO(t, db, "risk", "terverifikasi", 0)
	merchant := akunBO(t, db, "merchant", "belum", 0)
	id := verifikasiBaru(t, db, merchant, "merchant", "diajukan", []byte("k"), []byte("s"))
	if err := svc.TolakMerchantBO(ctx, risk, merchant, alasanUji); err != nil {
		t.Fatal(err)
	}
	var status string
	db.QueryRow(`SELECT status FROM verifikasi WHERE id = $1`, id).Scan(&status)
	if _, tingkat := statusAkun(t, db, merchant); status != "ditolak" || tingkat != "belum" {
		t.Fatalf("status %s, tingkat %s; ingin ditolak dan belum", status, tingkat)
	}
	if jumlahAudit(t, db, risk, "tolak_merchant") != 1 {
		t.Fatal("tidak ada baris audit tolak_merchant")
	}
}

// Dua atau lebih petugas yang memutuskan pengajuan yang sama bersamaan: tepat satu yang berhasil, tepat satu baris audit.
func TestBOMerchantDisetujuiSerentakHanyaSekali(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	merchant := akunBO(t, db, "merchant", "belum", 0)
	id := verifikasiBaru(t, db, merchant, "merchant", "diajukan", []byte("k"), []byte("s"))
	const petugas = 6
	ids := make([]int64, petugas)
	for i := range ids {
		ids[i] = akunBO(t, db, "risk", "terverifikasi", 0)
	}
	hasil := make([]error, petugas)
	var wg sync.WaitGroup
	for i := range ids {
		wg.Add(1)
		go func() { defer wg.Done(); hasil[i] = svc.SetujuiMerchantBO(ctx, ids[i], merchant, alasanUji) }()
	}
	wg.Wait()
	var berhasil, sudah int
	for _, err := range hasil {
		switch {
		case err == nil:
			berhasil++
		case errors.Is(err, ErrSudahDiputuskan):
			sudah++
		default:
			t.Errorf("galat tak terduga: %v", err)
		}
	}
	if berhasil != 1 || sudah != petugas-1 {
		t.Fatalf("%d berhasil dan %d sudah diputuskan; ingin 1 dan %d", berhasil, sudah, petugas-1)
	}
	var n int
	db.QueryRow(`SELECT count(*) FROM audit_log WHERE aksi = 'setujui_merchant' AND objek = $1`, fmt.Sprintf("verifikasi:%d", id)).Scan(&n)
	if n != 1 {
		t.Fatalf("%d baris audit setujui_merchant untuk satu pengajuan, ingin 1", n)
	}
}

func TestBOKillSwitchKartuMenulisAuditDanMengubahFlag(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	risk := akunBO(t, db, "risk", "terverifikasi", 0)
	// Flag tidak dipasang: 503 tanpa audit.
	sebelum := totalAudit(t, db)
	if err := svc.SetKartuAktifBO(ctx, risk, false, alasanUji); !errors.Is(err, ErrFlagTidakDipasang) {
		t.Fatalf("flag nil: %v, ingin ErrFlagTidakDipasang", err)
	}
	if totalAudit(t, db) != sebelum {
		t.Fatal("flag yang tidak dipasang menulis audit")
	}
	var aktif atomic.Bool
	aktif.Store(true)
	svc = svc.DenganT4(Dep{KartuAktif: &aktif})
	if err := svc.SetKartuAktifBO(ctx, risk, false, alasanUji); err != nil {
		t.Fatal(err)
	}
	if aktif.Load() {
		t.Fatal("flag masih menyala sesudah dimatikan")
	}
	var objekAudit string
	if err := db.QueryRow(`SELECT objek FROM audit_log WHERE pelaku_id = $1 AND aksi = 'flag_kartu' ORDER BY id DESC LIMIT 1`, risk).Scan(&objekAudit); err != nil || objekAudit != "flag:kartu=mati" {
		t.Fatalf("audit flag: %q, %v", objekAudit, err)
	}
	if err := svc.SetKartuAktifBO(ctx, risk, true, alasanUji); err != nil || !aktif.Load() {
		t.Fatalf("menyalakan lagi: %v, flag %v", err, aktif.Load())
	}
	// Alasan pendek: flag tidak berubah.
	if err := svc.SetKartuAktifBO(ctx, risk, false, "pendek"); !errors.As(err, new(ErrValidasi)) || !aktif.Load() {
		t.Fatalf("alasan pendek: %v, flag %v", err, aktif.Load())
	}
}

func TestBOUbahBatasHarianButuhPenyetujuDanNilaiWajar(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	risk := akunBO(t, db, "risk", "terverifikasi", 0)
	risk2 := akunBO(t, db, "risk", "terverifikasi", 0)
	sasaran := akunBO(t, db, "pemakai", "terverifikasi", 0)
	batas := func() int64 {
		var b int64
		db.QueryRow(`SELECT batas_harian FROM buku WHERE akun_id = $1`, sasaran).Scan(&b)
		return b
	}
	if err := svc.UbahBatasHarianBO(ctx, risk, sasaran, 750_000, alasanUji, ""); !errors.Is(err, ErrButuhPersetujuan) || batas() != 500_000 {
		t.Fatalf("tanpa penyetuju: %v, batas %d", err, batas())
	}
	if err := svc.UbahBatasHarianBO(ctx, risk, sasaran, 750_000, alasanUji, sesiBaru(t, db, risk)); !errors.Is(err, ErrButuhPersetujuan) {
		t.Fatalf("penyetuju sama: %v", err)
	}
	for _, nilai := range []int64{0, -5, MaksBatasHarianBO + 1} {
		if err := svc.UbahBatasHarianBO(ctx, risk, sasaran, nilai, alasanUji, sesiBaru(t, db, risk2)); !errors.As(err, new(ErrValidasi)) {
			t.Errorf("nilai %d: %v, ingin ErrValidasi", nilai, err)
		}
	}
	if err := svc.UbahBatasHarianBO(ctx, risk, sasaran, 750_000, alasanUji, sesiBaru(t, db, risk2)); err != nil {
		t.Fatal(err)
	}
	if batas() != 750_000 {
		t.Fatalf("batas %d, ingin 750000", batas())
	}
	var objekAudit string
	var penyetuju int64
	db.QueryRow(`SELECT objek, penyetuju_id FROM audit_log WHERE pelaku_id = $1 AND aksi = 'ubah_batas'`, risk).Scan(&objekAudit, &penyetuju)
	if objekAudit != fmt.Sprintf("akun:%d/batas_harian=750000", sasaran) || penyetuju != risk2 {
		t.Fatalf("audit ubah_batas: objek %q penyetuju %d", objekAudit, penyetuju)
	}
	// Merchant tidak punya buku berbatas harian; akun risk tidak boleh diubah.
	merchant := akunBO(t, db, "merchant", "terverifikasi", 0)
	if err := svc.UbahBatasHarianBO(ctx, risk, merchant, 100_000, alasanUji, sesiBaru(t, db, risk2)); !errors.Is(err, ErrTidakDitemukan) {
		t.Errorf("merchant: %v, ingin ErrTidakDitemukan", err)
	}
	if err := svc.UbahBatasHarianBO(ctx, risk, risk2, 100_000, alasanUji, sesiBaru(t, db, risk2)); !errors.Is(err, ErrDilarang) {
		t.Errorf("akun risk: %v, ingin ErrDilarang", err)
	}
}

func TestBOVerifikasiRantaiAuditUtuhSesudahAksi(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	risk := akunBO(t, db, "risk", "terverifikasi", 0)
	sasaran := akunBO(t, db, "pemakai", "belum", 0)
	if _, err := svc.LihatAkunBO(ctx, risk, sasaran); err != nil {
		t.Fatal(err)
	}
	if err := svc.BekukanBO(ctx, risk, sasaran, alasanUji); err != nil {
		t.Fatal(err)
	}
	h, err := svc.VerifikasiAuditBO(ctx, risk)
	if err != nil || h.RusakDiID != 0 || h.Baris < 2 || len(h.HashTerakhir) != 64 {
		t.Fatalf("verifikasi rantai: %+v, %v", h, err)
	}
}

func TestPeriksaAlasan(t *testing.T) {
	for alasan, ingin := range map[string]bool{
		"":                                    false,
		strings.Repeat("a", 19):               false,
		strings.Repeat("a", 20):               true,
		"  " + strings.Repeat("a", 20) + "  ": true,
		strings.Repeat("a", 19) + "  ":        false, // spasi pinggir tidak dihitung
		strings.Repeat("é", 20):               true,  // dihitung karakter, bukan byte
		strings.Repeat("a", 300):              true,
		strings.Repeat("a", 301):              false,
		strings.Repeat("a", 19) + "\n" + "b":  false,
		strings.Repeat("a", 25) + "\t" + "b":  false,
	} {
		_, err := periksaAlasan(alasan)
		if (err == nil) != ingin {
			t.Errorf("%q: galat %v, sah seharusnya %v", alasan, err, ingin)
		}
	}
}
