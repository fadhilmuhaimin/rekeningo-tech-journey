package service

import (
	"bytes"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	"lab/apit4/internal/objek"
	"lab/apit4/internal/repo"
)

// Tes file identitas lewat presigned PUT dan retensi 30 hari (ADR 38, M33, lab t4-storage), dengan PostgreSQL
// sungguhan. Penyimpanan objek adalah direktori lokal yang berpura-pura bisa membuat URL; perilaku tanda tangan dan
// kedaluwarsa yang sebenarnya dites di internal/objek (penyimpanan palsu) dan direkam lab terhadap SeaweedFS.

type catatPresign struct {
	kunci  string
	umur   time.Duration
	ukuran int64
}

type penyimpanPalsu struct {
	objek.Dir
	presign     []catatPresign
	galatUkuran error
	galatHapus  map[string]error
	dihapus     []string
}

func (p *penyimpanPalsu) PresignPUT(kunci string, umur time.Duration, ukuran int64) (string, error) {
	p.presign = append(p.presign, catatPresign{kunci, umur, ukuran})
	return fmt.Sprintf("palsu://%s?umur=%s", kunci, umur), nil
}

func (p *penyimpanPalsu) Ukuran(ctx context.Context, kunci string) (int64, error) {
	if p.galatUkuran != nil {
		return 0, p.galatUkuran
	}
	return p.Dir.Ukuran(ctx, kunci)
}

func (p *penyimpanPalsu) Hapus(ctx context.Context, kunci string) error {
	if err := p.galatHapus[kunci]; err != nil {
		return err
	}
	p.dihapus = append(p.dihapus, kunci)
	return p.Dir.Hapus(ctx, kunci)
}

func (p *penyimpanPalsu) ada(kunci string) bool {
	_, err := p.Dir.Ukuran(context.Background(), kunci)
	return err == nil
}

func svcPalsu(t *testing.T, svc Service) (Service, *penyimpanPalsu) {
	t.Helper()
	p := &penyimpanPalsu{Dir: objek.Dir{Akar: t.TempDir()}, galatHapus: map[string]error{}}
	return svc.DenganT4(Dep{Objek: p, TanpaLapis: map[string]bool{}}), p
}

func pngDengan(akhiran string) []byte { return append(append([]byte{}, pngKecil...), akhiran...) }

// unggah meniru PUT app ke penyimpanan: file ada di kunci yang diterbitkan, tanpa melewati server.
func unggah(t *testing.T, p *penyimpanPalsu, kunci string, isi []byte) {
	t.Helper()
	if err := p.Simpan(context.Background(), kunci, isi); err != nil {
		t.Fatal(err)
	}
}

func masukan(u Unggahan, kartu, swafoto []byte) BerkasTerunggah {
	return BerkasTerunggah{KunciKartu: u.KunciKartu, KunciSwafoto: u.KunciSwafoto, ChecksumKartu: checksum(kartu),
		ChecksumSwafoto: checksum(swafoto), NomorIdentitas: "3201012345678901"}
}

func jumlahVerifikasi(t *testing.T, db *sql.DB, akun int64) int {
	t.Helper()
	var n int
	if err := db.QueryRow(`SELECT count(*) FROM verifikasi WHERE akun_id = $1`, akun).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func TestMintaUnggahanKunciAcakMilikAkunDanUmurLimaMenit(t *testing.T) {
	svc, db := siapkan(t)
	svc, p := svcPalsu(t, svc)
	t0 := time.Date(2026, 10, 27, 9, 0, 0, 0, time.UTC)
	svc = svc.DenganJam(func() time.Time { return t0 })
	dina := qrAkun(t, db, "pemakai", "belum", "aktif", 0)
	u, err := svc.MintaUnggahan(context.Background(), dina, 0, 0)
	if err != nil {
		t.Fatal(err)
	}
	awalan := fmt.Sprintf("identitas/%d/", dina)
	for _, k := range []string{u.KunciKartu, u.KunciSwafoto} {
		if !strings.HasPrefix(k, awalan) || len(k) != len(awalan)+32 {
			t.Errorf("kunci %q: harus %s + 32 heksadesimal", k, awalan)
		}
	}
	if u.KunciKartu == u.KunciSwafoto {
		t.Error("dua kunci sama")
	}
	if u.URLKartu == "" || u.URLSwafoto == "" || u.URLKartu == u.URLSwafoto {
		t.Errorf("URL: %q %q", u.URLKartu, u.URLSwafoto)
	}
	if !u.BerlakuSampai.Equal(t0.Add(5 * time.Minute)) {
		t.Errorf("berlaku sampai %v, harus tepat 5 menit sesudah %v", u.BerlakuSampai, t0)
	}
	if len(p.presign) != 2 || p.presign[0].umur != 5*time.Minute || p.presign[1].umur != 5*time.Minute || p.presign[0].ukuran != 0 || p.presign[1].ukuran != 0 {
		t.Errorf("PresignPUT dipanggil dengan %+v", p.presign)
	}
	if p.presign[0].kunci != u.KunciKartu || p.presign[1].kunci != u.KunciSwafoto {
		t.Errorf("URL tidak untuk kunci yang dijawabkan: %+v", p.presign)
	}
	if jumlahVerifikasi(t, db, dina) != 0 {
		t.Error("meminta URL tidak boleh menulis pengajuan")
	}
	// Dua permintaan menghasilkan kunci berbeda.
	u2, _ := svc.MintaUnggahan(context.Background(), dina, 0, 0)
	if u2.KunciKartu == u.KunciKartu || u2.KunciSwafoto == u.KunciSwafoto {
		t.Error("kunci dipakai ulang antar permintaan")
	}
}

func TestMintaUnggahanUmurDariDepDanUkuranDitandatangani(t *testing.T) {
	svc, db := siapkan(t)
	svc, p := svcPalsu(t, svc)
	p2 := svc.t4
	p2.UmurPresign = 2 * time.Second
	svc = svc.DenganT4(p2)
	dina := qrAkun(t, db, "pemakai", "belum", "aktif", 0)
	if _, err := svc.MintaUnggahan(context.Background(), dina, 1000, MaksBerkasIdentitas); err != nil {
		t.Fatal(err)
	}
	if p.presign[0].umur != 2*time.Second || p.presign[0].ukuran != 1000 || p.presign[1].ukuran != MaksBerkasIdentitas {
		t.Errorf("PresignPUT: %+v", p.presign)
	}
	for _, c := range []struct {
		nama   string
		a, b   int64
		bidang string
	}{{"kartu melewati batas", MaksBerkasIdentitas + 1, 0, "ukuran_kartu"}, {"swafoto melewati batas", 0, MaksBerkasIdentitas + 1, "ukuran_swafoto"},
		{"kartu negatif", -1, 0, "ukuran_kartu"}, {"swafoto negatif", 0, -1, "ukuran_swafoto"}} {
		dina2 := qrAkun(t, db, "pemakai", "belum", "aktif", 0)
		var e ErrValidasi
		if _, err := svc.MintaUnggahan(context.Background(), dina2, c.a, c.b); !errors.As(err, &e) || e.Field != c.bidang {
			t.Errorf("%s: %v, harus ErrValidasi %s", c.nama, err, c.bidang)
		}
	}
}

func TestMintaUnggahanSyaratAkunDanPenyimpanan(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	svcP, _ := svcPalsu(t, svc)
	for _, k := range []struct {
		nama  string
		akun  int64
		harus error
	}{
		{"sudah terverifikasi", qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0), ErrSudahTerverifikasi},
		{"dibekukan", qrAkun(t, db, "pemakai", "belum", "dibekukan", 0), ErrDibekukan},
		{"warung", func() int64 { id, _ := akunBaru(t, db, "warung", 0); return id }(), ErrDilarang},
	} {
		if _, err := svcP.MintaUnggahan(ctx, k.akun, 0, 0); !errors.Is(err, k.harus) {
			t.Errorf("%s: %v, harus %v", k.nama, err, k.harus)
		}
	}
	dina := qrAkun(t, db, "pemakai", "belum", "aktif", 0)
	svcDir, _ := svcObjek(t, svc) // direktori lokal: tidak bisa membuat URL
	if _, err := svcDir.MintaUnggahan(ctx, dina, 0, 0); !errors.Is(err, ErrPresignTidakAda) {
		t.Errorf("Dir: %v, harus ErrPresignTidakAda", err)
	}
	if _, err := svc.DenganT4(Dep{}).MintaUnggahan(ctx, dina, 0, 0); !errors.Is(err, ErrPresignTidakAda) {
		t.Errorf("tanpa penyimpanan: %v, harus ErrPresignTidakAda", err)
	}
}

func TestMintaUnggahanDibatasiTigaPerJamPerAkun(t *testing.T) {
	svc, db := siapkan(t)
	svc, _ = svcPalsu(t, svc)
	svc = svc.DenganJam(func() time.Time { return time.Date(2026, 10, 27, 9, 0, 0, 0, time.UTC) })
	dina := qrAkun(t, db, "pemakai", "belum", "aktif", 0)
	for i := 1; i <= 3; i++ {
		if _, err := svc.MintaUnggahan(context.Background(), dina, 0, 0); err != nil {
			t.Fatalf("permintaan %d: %v", i, err)
		}
	}
	var l ErrTerlaluSering
	if _, err := svc.MintaUnggahan(context.Background(), dina, 0, 0); !errors.As(err, &l) || l.Lapis != "akun" {
		t.Fatalf("permintaan 4: %v, harus ErrTerlaluSering per akun", err)
	}
	lain := qrAkun(t, db, "pemakai", "belum", "aktif", 0)
	if _, err := svc.MintaUnggahan(context.Background(), lain, 0, 0); err != nil {
		t.Fatalf("akun lain tidak boleh ikut terkena: %v", err)
	}
}

func TestAjukanTerunggahBerhasilMemakaiChecksumHitunganServer(t *testing.T) {
	svc, db := siapkan(t)
	svc, p := svcPalsu(t, svc)
	ctx := context.Background()
	dina := qrAkun(t, db, "pemakai", "belum", "aktif", 0)
	u, _ := svc.MintaUnggahan(ctx, dina, 0, 0)
	kartu, swafoto := pngDengan("kartu"), pngDengan("swafoto")
	unggah(t, p, u.KunciKartu, kartu)
	unggah(t, p, u.KunciSwafoto, swafoto)
	in := masukan(u, kartu, swafoto)
	in.ChecksumKartu = strings.ToUpper(in.ChecksumKartu) // heksadesimal huruf besar tetap checksum yang sama
	v, err := svc.AjukanVerifikasiTerunggah(ctx, dina, in)
	if err != nil || v.Status != "diajukan" || v.Subjek != "pemakai" {
		t.Fatalf("%+v %v", v, err)
	}
	if v.ChecksumKartu != checksum(kartu) || v.ChecksumSwafoto != checksum(swafoto) {
		t.Errorf("checksum tersimpan harus hitungan server (huruf kecil): %s / %s", v.ChecksumKartu, v.ChecksumSwafoto)
	}
	var kk, ks string
	db.QueryRow(`SELECT berkas_kartu_kunci, berkas_swafoto_kunci FROM verifikasi WHERE id = $1`, v.ID).Scan(&kk, &ks)
	if kk != u.KunciKartu || ks != u.KunciSwafoto {
		t.Errorf("kunci tersimpan %q %q", kk, ks)
	}
	if !p.ada(u.KunciKartu) || !p.ada(u.KunciSwafoto) || len(p.dihapus) != 0 {
		t.Errorf("file yang lolos tidak boleh dihapus: %v", p.dihapus)
	}
	var n int
	db.QueryRow(`SELECT count(*) FROM outbox WHERE akun_id = $1 AND jenis = 'verifikasi' AND tujuan = 'verifikasi'`, dina).Scan(&n)
	if n != 1 {
		t.Errorf("outbox verifikasi: %d", n)
	}
	// Nomor identitas tidak tersimpan di baris mana pun yang ditulis alur ini.
	var ada bool
	db.QueryRow(`SELECT EXISTS (SELECT 1 FROM verifikasi v WHERE v.id = $1 AND v::text LIKE '%3201012345678901%')
		OR EXISTS (SELECT 1 FROM outbox o WHERE o.akun_id = $2 AND o::text LIKE '%3201012345678901%')`, v.ID, dina).Scan(&ada)
	if ada {
		t.Error("nomor identitas tertulis di tabel verifikasi atau outbox")
	}
}

func TestAjukanTerunggahMenolakDanMenghapusFileYangTidakLolos(t *testing.T) {
	kartu, swafoto := pngDengan("kartu"), pngDengan("swafoto")
	besar := append(pngDengan(""), bytes.Repeat([]byte{1}, MaksBerkasIdentitas-len(pngKecil)+1)...) // 1 MiB + 1 byte
	pas := append(pngDengan(""), bytes.Repeat([]byte{1}, MaksBerkasIdentitas-len(pngKecil))...)     // tepat 1 MiB
	kasus := []struct {
		nama    string
		kartu   []byte // isi yang diunggah (nil = tidak diunggah)
		swafoto []byte
		ubah    func(*BerkasTerunggah) // klaim app
		bidang  string
		pesan   string
		lolos   bool
	}{
		{"checksum kartu salah", kartu, swafoto, func(b *BerkasTerunggah) { b.ChecksumKartu = checksum([]byte("lain")) }, "berkas_kartu", "checksum", false},
		{"checksum swafoto salah", kartu, swafoto, func(b *BerkasTerunggah) { b.ChecksumSwafoto = checksum([]byte("lain")) }, "berkas_swafoto", "checksum", false},
		{"kartu tidak diunggah", nil, swafoto, nil, "berkas_kartu", "belum diunggah", false},
		{"swafoto tidak diunggah", kartu, nil, nil, "berkas_swafoto", "belum diunggah", false},
		{"kartu 1 MiB + 1 byte", besar, swafoto, nil, "berkas_kartu", "1 MiB", false},
		{"swafoto 1 MiB + 1 byte", kartu, besar, nil, "berkas_swafoto", "1 MiB", false},
		{"kartu bukan gambar", []byte("%PDF-1.4 bukan gambar"), swafoto, nil, "berkas_kartu", "JPEG atau PNG", false},
		{"kartu kosong", []byte{}, swafoto, nil, "berkas_kartu", "wajib diisi", false},
		{"tepat 1 MiB lolos", pas, swafoto, nil, "", "", true},
	}
	for _, k := range kasus {
		t.Run(k.nama, func(t *testing.T) {
			svc, db := siapkan(t)
			svc, p := svcPalsu(t, svc)
			ctx := context.Background()
			dina := qrAkun(t, db, "pemakai", "belum", "aktif", 0)
			u, _ := svc.MintaUnggahan(ctx, dina, 0, 0)
			if k.kartu != nil {
				unggah(t, p, u.KunciKartu, k.kartu)
			}
			if k.swafoto != nil {
				unggah(t, p, u.KunciSwafoto, k.swafoto)
			}
			in := masukan(u, k.kartu, k.swafoto)
			if k.ubah != nil {
				k.ubah(&in)
			}
			_, err := svc.AjukanVerifikasiTerunggah(ctx, dina, in)
			if k.lolos {
				if err != nil {
					t.Fatal(err)
				}
				return
			}
			var e ErrValidasi
			if !errors.As(err, &e) || e.Field != k.bidang || !strings.Contains(e.Pesan, k.pesan) {
				t.Fatalf("galat %v, harus ErrValidasi %s ~ %q", err, k.bidang, k.pesan)
			}
			if p.ada(u.KunciKartu) || p.ada(u.KunciSwafoto) {
				t.Errorf("file yang ditolak harus dihapus dari penyimpanan (kartu ada %v, swafoto ada %v)", p.ada(u.KunciKartu), p.ada(u.KunciSwafoto))
			}
			if jumlahVerifikasi(t, db, dina) != 0 {
				t.Error("pengajuan yang ditolak tidak boleh menulis baris verifikasi")
			}
			var n int
			db.QueryRow(`SELECT count(*) FROM outbox WHERE akun_id = $1`, dina).Scan(&n)
			if n != 0 {
				t.Errorf("outbox: %d", n)
			}
		})
	}
}

func TestAjukanTerunggahKunciBukanMilikAkunDitolakTanpaMenghapusMilikOrang(t *testing.T) {
	svc, db := siapkan(t)
	svc, p := svcPalsu(t, svc)
	ctx := context.Background()
	dina, rudi := qrAkun(t, db, "pemakai", "belum", "aktif", 0), qrAkun(t, db, "pemakai", "belum", "aktif", 0)
	ur, _ := svc.MintaUnggahan(ctx, rudi, 0, 0)
	unggah(t, p, ur.KunciKartu, pngDengan("rudi"))
	ud, _ := svc.MintaUnggahan(ctx, dina, 0, 0)
	unggah(t, p, ud.KunciSwafoto, pngDengan("dina"))
	var e ErrValidasi
	in := masukan(ud, pngDengan("rudi"), pngDengan("dina"))
	in.KunciKartu = ur.KunciKartu // kunci milik Rudi
	if _, err := svc.AjukanVerifikasiTerunggah(ctx, dina, in); !errors.As(err, &e) || e.Field != "kunci_kartu" {
		t.Fatalf("kunci akun lain: %v", err)
	}
	if !p.ada(ur.KunciKartu) {
		t.Error("file milik akun lain tidak boleh dihapus oleh pengajuan yang ditolak")
	}
	for nama, kunci := range map[string]string{"awalan saja": fmt.Sprintf("identitas/%d/", dina), "tanpa awalan": "identitas/abc", "kosong": "",
		"akun lain lewat awalan mirip": fmt.Sprintf("identitas/%d0/abc", dina)} {
		in := masukan(ud, pngDengan("x"), pngDengan("dina"))
		in.KunciKartu = kunci
		if _, err := svc.AjukanVerifikasiTerunggah(ctx, dina, in); !errors.As(err, &e) || e.Field != "kunci_kartu" {
			t.Errorf("%s (%q): %v", nama, kunci, err)
		}
	}
	in = masukan(ud, pngDengan("dina"), pngDengan("dina"))
	in.KunciKartu, in.KunciSwafoto = ud.KunciSwafoto, ud.KunciSwafoto
	if _, err := svc.AjukanVerifikasiTerunggah(ctx, dina, in); !errors.As(err, &e) || e.Field != "kunci_swafoto" {
		t.Errorf("dua kunci sama: %v", err)
	}
}

func TestAjukanTerunggahBentukChecksumDanNomorIdentitas(t *testing.T) {
	svc, db := siapkan(t)
	svc, p := svcPalsu(t, svc)
	ctx := context.Background()
	kartu, swafoto := pngDengan("kartu"), pngDengan("swafoto")
	for _, k := range []struct {
		nama   string
		ubah   func(*BerkasTerunggah)
		bidang string
	}{
		{"checksum 63 karakter", func(b *BerkasTerunggah) { b.ChecksumKartu = b.ChecksumKartu[:63] }, "checksum_kartu"},
		{"checksum 65 karakter", func(b *BerkasTerunggah) { b.ChecksumSwafoto += "0" }, "checksum_swafoto"},
		{"checksum bukan heksadesimal", func(b *BerkasTerunggah) { b.ChecksumKartu = strings.Repeat("g", 64) }, "checksum_kartu"},
		{"nomor 15 angka", func(b *BerkasTerunggah) { b.NomorIdentitas = "320101234567890" }, "nomor_identitas"},
		{"nomor 17 angka", func(b *BerkasTerunggah) { b.NomorIdentitas = "32010123456789012" }, "nomor_identitas"},
		{"nomor berhuruf", func(b *BerkasTerunggah) { b.NomorIdentitas = "320101234567890A" }, "nomor_identitas"},
		{"nomor kosong", func(b *BerkasTerunggah) { b.NomorIdentitas = "" }, "nomor_identitas"},
	} {
		dina := qrAkun(t, db, "pemakai", "belum", "aktif", 0)
		u, _ := svc.MintaUnggahan(ctx, dina, 0, 0)
		unggah(t, p, u.KunciKartu, kartu)
		unggah(t, p, u.KunciSwafoto, swafoto)
		in := masukan(u, kartu, swafoto)
		k.ubah(&in)
		var e ErrValidasi
		_, err := svc.AjukanVerifikasiTerunggah(ctx, dina, in)
		if !errors.As(err, &e) || e.Field != k.bidang {
			t.Errorf("%s: %v, harus ErrValidasi %s", k.nama, err, k.bidang)
			continue
		}
		for _, nilai := range []string{in.NomorIdentitas, in.ChecksumKartu} {
			if nilai != "" && strings.Contains(err.Error(), nilai) {
				t.Errorf("%s: pesan galat mengutip masukan: %v", k.nama, err)
			}
		}
		if !p.ada(u.KunciKartu) {
			t.Errorf("%s: kesalahan bentuk masukan tidak boleh menghapus file", k.nama)
		}
	}
}

func TestAjukanTerunggahGalatPenyimpananTidakMenghapusFile(t *testing.T) {
	svc, db := siapkan(t)
	svc, p := svcPalsu(t, svc)
	ctx := context.Background()
	dina := qrAkun(t, db, "pemakai", "belum", "aktif", 0)
	u, _ := svc.MintaUnggahan(ctx, dina, 0, 0)
	kartu, swafoto := pngDengan("kartu"), pngDengan("swafoto")
	unggah(t, p, u.KunciKartu, kartu)
	unggah(t, p, u.KunciSwafoto, swafoto)
	p.galatUkuran = errors.New("penyimpanan tidak menjawab")
	if _, err := svc.AjukanVerifikasiTerunggah(ctx, dina, masukan(u, kartu, swafoto)); !errors.Is(err, p.galatUkuran) {
		t.Fatalf("galat: %v", err)
	}
	if !p.ada(u.KunciKartu) || !p.ada(u.KunciSwafoto) {
		t.Fatal("galat penyimpanan bukan penolakan isi: file tidak boleh dihapus")
	}
	p.galatUkuran = nil
	if _, err := svc.AjukanVerifikasiTerunggah(ctx, dina, masukan(u, kartu, swafoto)); err != nil {
		t.Fatalf("diulang sesudah penyimpanan pulih: %v", err)
	}
}

func TestAjukanTerunggahPengajuanKeduaDitolakDanFileBarunyaDibuang(t *testing.T) {
	svc, db := siapkan(t)
	svc, p := svcPalsu(t, svc)
	ctx := context.Background()
	dina := qrAkun(t, db, "pemakai", "belum", "aktif", 0)
	kartu, swafoto := pngDengan("kartu"), pngDengan("swafoto")
	u1, _ := svc.MintaUnggahan(ctx, dina, 0, 0)
	unggah(t, p, u1.KunciKartu, kartu)
	unggah(t, p, u1.KunciSwafoto, swafoto)
	if _, err := svc.AjukanVerifikasiTerunggah(ctx, dina, masukan(u1, kartu, swafoto)); err != nil {
		t.Fatal(err)
	}
	u2, _ := svc.MintaUnggahan(ctx, dina, 0, 0)
	unggah(t, p, u2.KunciKartu, kartu)
	unggah(t, p, u2.KunciSwafoto, swafoto)
	if _, err := svc.AjukanVerifikasiTerunggah(ctx, dina, masukan(u2, kartu, swafoto)); !errors.Is(err, ErrVerifikasiBerjalan) {
		t.Fatalf("pengajuan kedua: %v", err)
	}
	if p.ada(u2.KunciKartu) || p.ada(u2.KunciSwafoto) {
		t.Error("file milik pengajuan yang ditolak karena yang pertama masih berjalan harus dibuang")
	}
	if !p.ada(u1.KunciKartu) || !p.ada(u1.KunciSwafoto) {
		t.Error("file milik pengajuan yang berjalan tidak boleh ikut terhapus")
	}
}

// Setelah file diterima, pemegang URL yang belum kedaluwarsa masih bisa menimpanya (PUT ke kunci yang sama). Tes ini
// mencatat akibatnya di sisi server: checksum di database tidak lagi cocok dan unduh lewat server menolak file itu.
func TestFileDitimpaSesudahDiterimaTerdeteksiSaatUnduh(t *testing.T) {
	svc, db := siapkan(t)
	svc, p := svcPalsu(t, svc)
	ctx := context.Background()
	risk := akunBO(t, db, "risk", "terverifikasi", 0)
	dina := qrAkun(t, db, "pemakai", "belum", "aktif", 0)
	u, _ := svc.MintaUnggahan(ctx, dina, 0, 0)
	kartu, swafoto := pngDengan("kartu"), pngDengan("swafoto")
	unggah(t, p, u.KunciKartu, kartu)
	unggah(t, p, u.KunciSwafoto, swafoto)
	v, err := svc.AjukanVerifikasiTerunggah(ctx, dina, masukan(u, kartu, swafoto))
	if err != nil {
		t.Fatal(err)
	}
	if b, err := svc.BukaBerkas(ctx, risk, v.ID, "kartu", alasanUji); err != nil || !bytes.Equal(b, kartu) {
		t.Fatalf("sebelum ditimpa: %v", err)
	}
	unggah(t, p, u.KunciKartu, pngDengan("ditimpa pemegang URL"))
	if _, err := svc.BukaBerkas(ctx, risk, v.ID, "kartu", alasanUji); !errors.Is(err, ErrBerkasRusak) {
		t.Fatalf("sesudah ditimpa: %v, harus ErrBerkasRusak", err)
	}
	if jumlahAudit(t, db, risk, "buka_berkas") != 2 {
		t.Errorf("dua percobaan buka berkas, audit %d", jumlahAudit(t, db, risk, "buka_berkas"))
	}
}

// ---- retensi 30 hari ----

// selesaiLulus menyelesaikan satu pengajuan (jalur worker) pada waktu t dan mengembalikan id dan hapus_pada.
func selesaiLulus(t *testing.T, svc Service, db *sql.DB, akun int64, v repo.Verifikasi, pada time.Time, status string) time.Time {
	t.Helper()
	ok, err := svc.repo.SelesaikanVerifikasi(context.Background(), v.ID, status, "ref-uji", pada)
	if err != nil || !ok {
		t.Fatalf("selesaikan: %v %v", ok, err)
	}
	var h time.Time
	if err := db.QueryRow(`SELECT hapus_pada FROM verifikasi WHERE id = $1`, v.ID).Scan(&h); err != nil {
		t.Fatal(err)
	}
	return h
}

func pengajuanTerunggah(t *testing.T, svc Service, db *sql.DB, p *penyimpanPalsu) (int64, repo.Verifikasi, Unggahan) {
	t.Helper()
	ctx := context.Background()
	dina := qrAkun(t, db, "pemakai", "belum", "aktif", 0)
	u, err := svc.MintaUnggahan(ctx, dina, 0, 0)
	if err != nil {
		t.Fatal(err)
	}
	kartu, swafoto := pngDengan("kartu"+u.KunciKartu), pngDengan("swafoto"+u.KunciSwafoto)
	unggah(t, p, u.KunciKartu, kartu)
	unggah(t, p, u.KunciSwafoto, swafoto)
	v, err := svc.AjukanVerifikasiTerunggah(ctx, dina, masukan(u, kartu, swafoto))
	if err != nil {
		t.Fatal(err)
	}
	return dina, v, u
}

// kunciKosong: apakah baris itu sudah ditandai terhapus (kedua kunci kosong).
func kunciKosong(t *testing.T, db *sql.DB, id int64) bool {
	t.Helper()
	var k, s string
	if err := db.QueryRow(`SELECT berkas_kartu_kunci, berkas_swafoto_kunci FROM verifikasi WHERE id = $1`, id).Scan(&k, &s); err != nil {
		t.Fatal(err)
	}
	return k == "" && s == ""
}

// jatuhTempo: jumlah baris yang akan diperiksa job pada waktu itu, dihitung dari database.
func jatuhTempo(t *testing.T, db *sql.DB, kini time.Time) int {
	t.Helper()
	var n int
	if err := db.QueryRow(`SELECT count(*) FROM verifikasi WHERE hapus_pada <= $1 AND (berkas_kartu_kunci <> '' OR berkas_swafoto_kunci <> '')`, kini).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func TestRetensiMasaSimpanTigaPuluhHariTepatDariSelesai(t *testing.T) {
	svc, db := siapkan(t)
	svc, p := svcPalsu(t, svc)
	t0 := time.Date(2026, 11, 3, 10, 0, 0, 0, time.UTC)
	for _, status := range []string{"lulus", "ditolak"} {
		_, v, _ := pengajuanTerunggah(t, svc, db, p)
		h := selesaiLulus(t, svc, db, 0, v, t0, status)
		if !h.Equal(t0.AddDate(0, 0, 30)) || h.Sub(t0) != 30*24*time.Hour {
			t.Errorf("%s: hapus_pada %v, harus tepat 30 hari sesudah selesai %v", status, h, t0)
		}
		if h.Sub(t0) != RetensiIdentitas {
			t.Errorf("%s: konstanta RetensiIdentitas %v tidak sama dengan SQL (%v)", status, RetensiIdentitas, h.Sub(t0))
		}
	}
	// Pengajuan yang gagal (vendor tidak tersedia, M31) juga memulai retensi: file tidak boleh tinggal selamanya.
	_, v, _ := pengajuanTerunggah(t, svc, db, p)
	if err := svc.repo.TandaiVerifikasi(context.Background(), v.ID, "gagal", t0); err != nil {
		t.Fatal(err)
	}
	var h sql.NullTime
	db.QueryRow(`SELECT hapus_pada FROM verifikasi WHERE id = $1`, v.ID).Scan(&h)
	if !h.Valid || h.Time.Sub(t0) != 30*24*time.Hour {
		t.Errorf("gagal: hapus_pada %v", h)
	}
	// Pengajuan yang belum selesai tidak punya hapus_pada, jadi tidak pernah dipilih job.
	_, v2, _ := pengajuanTerunggah(t, svc, db, p)
	db.QueryRow(`SELECT hapus_pada FROM verifikasi WHERE id = $1`, v2.ID).Scan(&h)
	if h.Valid {
		t.Errorf("diajukan: hapus_pada %v, harus kosong", h)
	}
}

func TestRetensiBatas29Dan31HariJamDiperankan(t *testing.T) {
	svc, db := siapkan(t)
	svc, p := svcPalsu(t, svc)
	ctx := context.Background()
	t0 := time.Date(2026, 11, 3, 10, 0, 0, 0, time.UTC)
	_, v, u := pengajuanTerunggah(t, svc, db, p)
	h := selesaiLulus(t, svc, db, 0, v, t0, "lulus")
	_, muda, um := pengajuanTerunggah(t, svc, db, p) // selesai satu hari sesudahnya: belum jatuh tempo di 30 hari
	selesaiLulus(t, svc, db, 0, muda, t0.Add(24*time.Hour), "lulus")

	pada := func(d time.Time) (HasilRetensi, error) {
		return svc.DenganJam(func() time.Time { return d }).HapusBerkasJatuhTempo(ctx)
	}
	// 29 hari sesudah selesai, dan satu detik sebelum batas: belum.
	for _, d := range []time.Time{t0.AddDate(0, 0, 29), h.Add(-time.Second)} {
		if _, err := pada(d); err != nil {
			t.Fatal(err)
		}
		if kunciKosong(t, db, v.ID) || !p.ada(u.KunciKartu) || !p.ada(u.KunciSwafoto) {
			t.Fatalf("pada %v (sebelum batas) file sudah dihapus", d)
		}
	}
	// Tepat di batas: hapus_pada <= sekarang, jadi dihapus.
	sebelum := jatuhTempo(t, db, h)
	hasil, err := pada(h)
	if err != nil {
		t.Fatal(err)
	}
	if !kunciKosong(t, db, v.ID) || p.ada(u.KunciKartu) || p.ada(u.KunciSwafoto) {
		t.Fatalf("tepat di batas: file harus terhapus dan baris ditandai (kunci kosong %v)", kunciKosong(t, db, v.ID))
	}
	if hasil.Diperiksa != sebelum || hasil.Dihapus != sebelum || hasil.Galat != 0 {
		t.Errorf("hasil %+v, harus diperiksa dan dihapus %d", hasil, sebelum)
	}
	// Yang selesai sehari lebih lambat belum tersentuh pada waktu itu.
	if kunciKosong(t, db, muda.ID) || !p.ada(um.KunciKartu) {
		t.Fatal("pengajuan yang batasnya sehari lebih lambat ikut terhapus")
	}
	// Putaran kedua tanpa perubahan: tidak ada yang diperiksa lagi (idempoten).
	if hasil, _ = pada(h); hasil.Diperiksa != 0 || hasil.Dihapus != 0 {
		t.Errorf("putaran kedua: %+v", hasil)
	}
	// 31 hari sesudah selesai pertama: yang kedua (selesai t0+1 hari, batas t0+31 hari) juga.
	if _, err := pada(t0.AddDate(0, 0, 31)); err != nil {
		t.Fatal(err)
	}
	if !kunciKosong(t, db, muda.ID) || p.ada(um.KunciKartu) {
		t.Fatal("31 hari: pengajuan kedua harus terhapus")
	}
}

func TestRetensiDihentikanGalatSatuFileTidakMenghentikanJobDanDiulangBerikutnya(t *testing.T) {
	svc, db := siapkan(t)
	svc, p := svcPalsu(t, svc)
	ctx := context.Background()
	t0 := time.Date(2026, 11, 3, 10, 0, 0, 0, time.UTC)
	_, a, ua := pengajuanTerunggah(t, svc, db, p)
	_, b, ub := pengajuanTerunggah(t, svc, db, p)
	h := selesaiLulus(t, svc, db, 0, a, t0, "lulus")
	selesaiLulus(t, svc, db, 0, b, t0, "lulus")
	sv := svc.DenganJam(func() time.Time { return h })
	p.galatHapus[ua.KunciSwafoto] = errors.New("penyimpanan menolak DELETE")
	hasil, err := sv.HapusBerkasJatuhTempo(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if hasil.Galat < 1 {
		t.Errorf("galat harus dihitung: %+v", hasil)
	}
	if kunciKosong(t, db, a.ID) {
		t.Error("baris yang file-nya gagal dihapus tidak boleh ditandai terhapus")
	}
	if !kunciKosong(t, db, b.ID) || p.ada(ub.KunciKartu) {
		t.Error("galat di satu baris tidak boleh menghentikan baris lain")
	}
	delete(p.galatHapus, ua.KunciSwafoto)
	if _, err := sv.HapusBerkasJatuhTempo(ctx); err != nil {
		t.Fatal(err)
	}
	if !kunciKosong(t, db, a.ID) || p.ada(ua.KunciKartu) || p.ada(ua.KunciSwafoto) {
		t.Error("putaran berikutnya harus menyelesaikan baris yang tertunda")
	}
}

func TestRetensiFileSudahHilangDiPenyimpananTetapDitandai(t *testing.T) {
	svc, db := siapkan(t)
	svc, p := svcPalsu(t, svc)
	ctx := context.Background()
	_, v, u := pengajuanTerunggah(t, svc, db, p)
	h := selesaiLulus(t, svc, db, 0, v, time.Date(2026, 11, 3, 10, 0, 0, 0, time.UTC), "lulus")
	p.Dir.Hapus(ctx, u.KunciKartu) // dihapus dari luar: job sebelumnya mati di antara hapus dan tandai
	if _, err := svc.DenganJam(func() time.Time { return h }).HapusBerkasJatuhTempo(ctx); err != nil {
		t.Fatal(err)
	}
	if !kunciKosong(t, db, v.ID) || p.ada(u.KunciSwafoto) {
		t.Error("job harus menyelesaikan penandaan walau salah satu file sudah tidak ada")
	}
}

func TestRetensiHalamanLebihDariSeratusBaris(t *testing.T) {
	svc, db := siapkan(t)
	svc, p := svcPalsu(t, svc)
	ctx := context.Background()
	dina := qrAkun(t, db, "pemakai", "belum", "aktif", 0)
	if _, err := db.Exec(`
		INSERT INTO verifikasi (akun_id, subjek, status, berkas_kartu_kunci, berkas_swafoto_kunci, checksum_kartu, checksum_swafoto, selesai, hapus_pada)
		SELECT $1, 'pemakai', 'lulus', 'identitas/halaman/k' || g, 'identitas/halaman/s' || g, 'x', 'y', '2020-01-01', '2020-01-31'
		FROM generate_series(1, 250) g`, dina); err != nil {
		t.Fatal(err)
	}
	sebelum := jatuhTempo(t, db, time.Now())
	hasil, err := svc.HapusBerkasJatuhTempo(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if sebelum < 250 || hasil.Diperiksa != sebelum || hasil.Dihapus != sebelum {
		t.Fatalf("diperiksa %d dihapus %d, harus %d (>= 250)", hasil.Diperiksa, hasil.Dihapus, sebelum)
	}
	if jatuhTempo(t, db, time.Now()) != 0 {
		t.Error("masih ada baris jatuh tempo sesudah job")
	}
	if len(p.dihapus) < 500 {
		t.Errorf("DELETE ke penyimpanan: %d kunci, harus >= 500 (dua file per baris)", len(p.dihapus))
	}
}

func TestRetensiTanpaPenyimpananDitolak(t *testing.T) {
	svc, _ := siapkan(t)
	if _, err := svc.DenganT4(Dep{}).HapusBerkasJatuhTempo(context.Background()); !errors.Is(err, ErrObjekTidakDipasang) {
		t.Fatalf("tanpa penyimpanan: %v", err)
	}
}

func TestBukaBerkasSesudahRetensiMenjawabDihapusDanTetapMencatatAudit(t *testing.T) {
	svc, db := siapkan(t)
	svc, p := svcPalsu(t, svc)
	ctx := context.Background()
	risk := akunBO(t, db, "risk", "terverifikasi", 0)
	_, v, _ := pengajuanTerunggah(t, svc, db, p)
	h := selesaiLulus(t, svc, db, 0, v, time.Date(2026, 11, 3, 10, 0, 0, 0, time.UTC), "lulus")
	if _, err := svc.BukaBerkas(ctx, risk, v.ID, "kartu", alasanUji); err != nil {
		t.Fatalf("sebelum retensi: %v", err)
	}
	if _, err := svc.DenganJam(func() time.Time { return h }).HapusBerkasJatuhTempo(ctx); err != nil {
		t.Fatal(err)
	}
	for _, bagian := range []string{"kartu", "swafoto"} {
		if _, err := svc.BukaBerkas(ctx, risk, v.ID, bagian, alasanUji); !errors.Is(err, ErrBerkasDihapus) {
			t.Errorf("%s sesudah retensi: %v, harus ErrBerkasDihapus", bagian, err)
		}
	}
	if n := jumlahAudit(t, db, risk, "buka_berkas"); n != 3 {
		t.Errorf("audit buka_berkas %d, harus 3 (satu berhasil, dua percobaan sesudah dihapus)", n)
	}
	// Baris tetap sebagai catatan: status dan checksum tidak hilang.
	var status, ck string
	db.QueryRow(`SELECT status, checksum_kartu FROM verifikasi WHERE id = $1`, v.ID).Scan(&status, &ck)
	if status != "lulus" || len(ck) != 64 {
		t.Errorf("catatan sesudah retensi: %s %q", status, ck)
	}
}

// ---- penyimpanan bytea (mode rentan berkas-bytea) ----

func TestBytea(t *testing.T) {
	_, db := siapkan(t)
	if _, err := db.Exec(objek.SkemaBytea); err != nil {
		t.Fatal(err)
	}
	b := objek.Bytea{DB: db}
	ctx := context.Background()
	kunci := fmt.Sprintf("identitas/bytea%d", time.Now().UnixNano())
	isi := bytes.Repeat([]byte{0, 1, 2, 255}, 2048) // byte biner, di atas ambang TOAST
	if err := b.Simpan(ctx, kunci, isi); err != nil {
		t.Fatal(err)
	}
	if got, err := b.Baca(ctx, kunci); err != nil || !bytes.Equal(got, isi) {
		t.Fatalf("Baca: %d byte, %v", len(got), err)
	}
	if n, err := b.Ukuran(ctx, kunci); err != nil || n != int64(len(isi)) {
		t.Fatalf("Ukuran: %d, %v", n, err)
	}
	if err := b.Simpan(ctx, kunci, []byte("ditimpa")); err != nil { // kunci yang sama menimpa
		t.Fatal(err)
	}
	if got, _ := b.Baca(ctx, kunci); string(got) != "ditimpa" {
		t.Fatalf("setelah ditimpa: %q", got)
	}
	if err := b.Hapus(ctx, kunci); err != nil {
		t.Fatal(err)
	}
	if err := b.Hapus(ctx, kunci); err != nil {
		t.Fatalf("hapus kedua: %v", err)
	}
	if _, err := b.Baca(ctx, kunci); !errors.Is(err, objek.ErrTidakAda) {
		t.Fatalf("Baca sesudah Hapus: %v", err)
	}
	if _, err := b.Ukuran(ctx, kunci); !errors.Is(err, objek.ErrTidakAda) {
		t.Fatalf("Ukuran sesudah Hapus: %v", err)
	}
	if err := b.Simpan(ctx, "../salah", []byte("x")); err == nil {
		t.Fatal("kunci tidak sah harus ditolak")
	}
}

// Penanda terhapus punya penjaga sendiri di repo: sebelum hapus_pada tidak mengubah apa pun, sesudahnya sekali saja.
func TestRetensiTandaiBerkasDihapusMenjagaBatasDanSekaliSaja(t *testing.T) {
	svc, db := siapkan(t)
	svc, p := svcPalsu(t, svc)
	ctx := context.Background()
	_, v, _ := pengajuanTerunggah(t, svc, db, p)
	h := selesaiLulus(t, svc, db, 0, v, time.Date(2026, 11, 3, 10, 0, 0, 0, time.UTC), "lulus")
	if ok, err := svc.repo.TandaiBerkasDihapus(ctx, v.ID, h.Add(-time.Second)); err != nil || ok || kunciKosong(t, db, v.ID) {
		t.Fatalf("satu detik sebelum batas: ok=%v err=%v kunci kosong=%v, tidak boleh mengubah apa pun", ok, err, kunciKosong(t, db, v.ID))
	}
	if ok, err := svc.repo.TandaiBerkasDihapus(ctx, v.ID, h); err != nil || !ok || !kunciKosong(t, db, v.ID) {
		t.Fatalf("tepat di batas: ok=%v err=%v kunci kosong=%v", ok, err, kunciKosong(t, db, v.ID))
	}
	if ok, err := svc.repo.TandaiBerkasDihapus(ctx, v.ID, h.Add(time.Hour)); err != nil || ok {
		t.Fatalf("kedua kali: ok=%v err=%v, harus false (sudah ditandai)", ok, err)
	}
}
