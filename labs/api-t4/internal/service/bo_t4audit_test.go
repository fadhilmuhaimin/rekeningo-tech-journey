//go:build t4audit

package service

import (
	"context"
	"database/sql"
	"errors"
	"testing"
	"time"

	"lab/apit4/internal/repo"
)

// Tes lab t4-audit atas back office: mode log biasa, penyetuju bersesi web, dan persetujuan yang tidak terikat pada satu
// aksi. Hanya dengan -tags t4audit; tabel audit_biasa dibuat labs/t4-audit/run.py (audit_biasa.sql).

func jumlahBiasa(t *testing.T, db *sql.DB, pelaku int64, aksi string) int {
	t.Helper()
	var n int
	if err := db.QueryRow(`SELECT count(*) FROM audit_biasa WHERE pelaku_id = $1 AND aksi = $2`, pelaku, aksi).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func TestT4AModeLogBiasaMenulisKeTabelBiasaDanBukanKeAuditLog(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	biasa := svc.DenganMode(RentanLogBiasa)
	risk := akunBO(t, db, "risk", "terverifikasi", 0)
	sasaran := akunBO(t, db, "pemakai", "belum", 0)
	sebelumRantai := totalAudit(t, db)
	if err := biasa.BekukanBO(ctx, risk, sasaran, alasanUji); err != nil {
		t.Fatal(err)
	}
	if _, err := biasa.LihatAkunBO(ctx, risk, sasaran); err != nil {
		t.Fatal(err)
	}
	if jumlahBiasa(t, db, risk, "bekukan") != 1 || jumlahBiasa(t, db, risk, "lihat_akun") != 1 {
		t.Fatal("mode log biasa tidak menulis tepat satu baris per aksi di audit_biasa")
	}
	if totalAudit(t, db) != sebelumRantai {
		t.Fatal("mode log biasa menulis ke audit_log berantai")
	}
	// Mode biasa tidak memutus rantai yang sudah ada, dan rantai tidak melihat baris biasa.
	if h, err := svc.VerifikasiAuditBO(ctx, risk); err != nil || h.RusakDiID != 0 {
		t.Fatalf("%+v %v", h, err)
	}
	// Mode normal sesudahnya menulis ke rantai lagi.
	if err := svc.BukaBlokirBO(ctx, risk, sasaran, alasanUji, sesiBaru(t, db, akunBO(t, db, "risk", "terverifikasi", 0))); err != nil {
		t.Fatal(err)
	}
	if totalAudit(t, db) != sebelumRantai+1 {
		t.Fatal("mode normal tidak menulis ke audit_log")
	}
}

// Sesi web tidak bisa menjadi persetujuan: token yang diterima hanya sesi app (jenis 'app').
func TestT4APenyetujuBersesiWebDitolak(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	risk := akunBO(t, db, "risk", "terverifikasi", 0)
	risk2 := akunBO(t, db, "risk", "terverifikasi", 0)
	sasaran := akunBO(t, db, "pemakai", "belum", 0)
	if err := svc.BekukanBO(ctx, risk, sasaran, alasanUji); err != nil {
		t.Fatal(err)
	}
	csrf := "csrf-uji"
	if err := repo.Baru(db).SimpanSesi(ctx, hashToken("sesi-web-risk2"), risk2, time.Now().Add(time.Hour), "web", &csrf); err != nil {
		t.Fatal(err)
	}
	if err := svc.BukaBlokirBO(ctx, risk, sasaran, alasanUji, "sesi-web-risk2"); !errors.Is(err, ErrButuhPersetujuan) {
		t.Fatalf("sesi web sebagai penyetuju: %v, ingin ErrButuhPersetujuan", err)
	}
	if st, _ := statusAkun(t, db, sasaran); st != "dibekukan" {
		t.Fatal("akun terbuka tanpa persetujuan yang sah")
	}
}

// Karakterisasi (bukan keinginan): persetujuan adalah pemegang token, bukan keputusan per aksi. Satu token penyetuju yang
// sama dipakai untuk dua aksi berbeda atas dua akun berbeda, dan keduanya berhasil. Antrean persetujuan per aksi
// tidak ada di lab ini (skema naskah tidak punya tabelnya).
func TestT4APersetujuanTidakTerikatPadaSatuAksi(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	risk := akunBO(t, db, "risk", "terverifikasi", 0)
	risk2 := akunBO(t, db, "risk", "terverifikasi", 0)
	a := akunBO(t, db, "pemakai", "belum", 0)
	b := akunBO(t, db, "pemakai", "belum", 0)
	if err := svc.BekukanBO(ctx, risk, a, alasanUji); err != nil {
		t.Fatal(err)
	}
	token := sesiBaru(t, db, risk2)
	if err := svc.BukaBlokirBO(ctx, risk, a, alasanUji, token); err != nil {
		t.Fatal(err)
	}
	if err := svc.UbahBatasHarianBO(ctx, risk, b, 300_000, alasanUji, token); err != nil {
		t.Fatalf("token penyetuju yang sama untuk aksi lain: %v", err)
	}
	var n int
	if err := db.QueryRow(`SELECT count(*) FROM audit_log WHERE pelaku_id = $1 AND penyetuju_id = $2`, risk, risk2).Scan(&n); err != nil || n != 2 {
		t.Fatalf("%d baris dengan penyetuju yang sama, ingin 2 (%v)", n, err)
	}
}

// Penyetuju dan pelaku dibandingkan menurut nomor akun, bukan menurut token: sesi kedua akun yang sama tetap pelaku itu.
func TestT4ASesiKeduaPelakuBukanPenyetujuKedua(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	risk := akunBO(t, db, "risk", "terverifikasi", 0)
	sasaran := akunBO(t, db, "pemakai", "belum", 0)
	if err := svc.BekukanBO(ctx, risk, sasaran, alasanUji); err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 2; i++ {
		if err := svc.BukaBlokirBO(ctx, risk, sasaran, alasanUji, sesiBaru(t, db, risk)); !errors.Is(err, ErrButuhPersetujuan) {
			t.Fatalf("sesi ke-%d milik pelaku sendiri: %v", i+1, err)
		}
		if err := svc.UbahBatasHarianBO(ctx, risk, sasaran, 100_000, alasanUji, sesiBaru(t, db, risk)); !errors.Is(err, ErrButuhPersetujuan) {
			t.Fatalf("ubah batas, sesi ke-%d milik pelaku sendiri: %v", i+1, err)
		}
	}
	if jumlahAudit(t, db, risk, "buka_blokir") != 0 || jumlahAudit(t, db, risk, "ubah_batas") != 0 {
		t.Fatal("percobaan ditolak meninggalkan baris audit")
	}
}
