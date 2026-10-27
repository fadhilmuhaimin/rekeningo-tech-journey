package service

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"lab/apit4/internal/objek"
	"lab/apit4/internal/repo"
)

// Tes verifikasi identitas, pendaftaran, tingkat akun pada transfer, dan batas laju endpoint baru (M31, M33, ADR 38)
// dengan PostgreSQL sungguhan.

var pngKecil, _ = base64.StdEncoding.DecodeString("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")

func svcObjek(t *testing.T, svc Service) (Service, string) {
	t.Helper()
	dir := t.TempDir()
	return svc.DenganT4(Dep{Objek: objek.Dir{Akar: dir}, TanpaLapis: map[string]bool{}}), dir
}

func jumlahBerkas(t *testing.T, dir string) int {
	t.Helper()
	n := 0
	filepath.Walk(dir, func(p string, i os.FileInfo, err error) error {
		if err == nil && !i.IsDir() {
			n++
		}
		return nil
	})
	return n
}

func TestAjukanVerifikasiSatuTransactionDanChecksum(t *testing.T) {
	svc, db := siapkan(t)
	svc, dir := svcObjek(t, svc)
	dina := qrAkun(t, db, "pemakai", "belum", "aktif", 0)
	kartu, swafoto := pngKecil, append(append([]byte{}, pngKecil...), "swafoto"...)
	v, err := svc.AjukanVerifikasi(context.Background(), dina, kartu, swafoto)
	if err != nil || v.Status != "diajukan" || v.Subjek != "pemakai" {
		t.Fatalf("%+v %v", v, err)
	}
	if v.ChecksumKartu != checksum(kartu) || v.ChecksumSwafoto != checksum(swafoto) || v.ChecksumKartu == v.ChecksumSwafoto {
		t.Errorf("checksum %s / %s", v.ChecksumKartu, v.ChecksumSwafoto)
	}
	if jumlahBerkas(t, dir) != 2 {
		t.Errorf("file di penyimpanan objek: %d", jumlahBerkas(t, dir))
	}
	// isi file di penyimpanan objek sama dengan yang dikirim, dibaca lewat kunci di database.
	var kk, ks string
	db.QueryRow(`SELECT berkas_kartu_kunci, berkas_swafoto_kunci FROM verifikasi WHERE id = $1`, v.ID).Scan(&kk, &ks)
	if b, err := svc.t4.Objek.Baca(context.Background(), kk); err != nil || !bytes.Equal(b, kartu) {
		t.Errorf("isi kartu di penyimpanan objek: %v", err)
	}
	if !strings.HasPrefix(kk, "identitas/") || kk == ks {
		t.Errorf("kunci objek %q %q", kk, ks)
	}
	var n int
	var tujuan string
	db.QueryRow(`SELECT count(*), max(tujuan) FROM outbox WHERE akun_id = $1 AND jenis = 'verifikasi' AND jurnal_id IS NULL AND kelas = 1`, dina).Scan(&n, &tujuan)
	if n != 1 || tujuan != "verifikasi" {
		t.Errorf("pekerjaan verifikasi di outbox: %d (%s)", n, tujuan)
	}
	// pengajuan kedua selagi yang pertama berjalan: ditolak, dan file barunya dibuang (tidak ada file yatim).
	if _, err := svc.AjukanVerifikasi(context.Background(), dina, kartu, swafoto); !errors.Is(err, ErrVerifikasiBerjalan) {
		t.Errorf("pengajuan kedua: %v", err)
	}
	if jumlahBerkas(t, dir) != 2 {
		t.Errorf("file yatim sesudah pengajuan ditolak: %d file", jumlahBerkas(t, dir))
	}
	db.QueryRow(`SELECT count(*) FROM outbox WHERE akun_id = $1`, dina).Scan(&n)
	if n != 1 {
		t.Errorf("pengajuan yang ditolak menulis outbox: %d", n)
	}
}

func TestAjukanVerifikasiAturan(t *testing.T) {
	svc, db := siapkan(t)
	svc, dir := svcObjek(t, svc)
	ctx := context.Background()
	png2 := append(append([]byte{}, pngKecil...), "2"...)
	kasus := []struct {
		nama   string
		akun   func() int64
		kartu  []byte
		swa    []byte
		harus  func(error) bool
		berkas int // file yang boleh tertinggal di penyimpanan objek
	}{
		{"bukan gambar", func() int64 { return qrAkun(t, db, "pemakai", "belum", "aktif", 0) }, []byte("%PDF-1.4"), png2,
			func(e error) bool { return errors.As(e, new(ErrValidasi)) }, 0},
		{"swafoto kosong", func() int64 { return qrAkun(t, db, "pemakai", "belum", "aktif", 0) }, pngKecil, nil,
			func(e error) bool { return errors.As(e, new(ErrValidasi)) }, 0},
		{"lebih dari 1 MiB", func() int64 { return qrAkun(t, db, "pemakai", "belum", "aktif", 0) },
			append(append([]byte{}, pngKecil...), bytes.Repeat([]byte{1}, MaksBerkasIdentitas)...), png2,
			func(e error) bool { return errors.As(e, new(ErrValidasi)) }, 0},
		{"tepat 1 MiB lolos", func() int64 { return qrAkun(t, db, "pemakai", "belum", "aktif", 0) },
			append(append([]byte{}, pngKecil...), bytes.Repeat([]byte{1}, MaksBerkasIdentitas-len(pngKecil))...), png2,
			func(e error) bool { return e == nil }, 2},
		{"karyawan Lestari ditolak (terverifikasi lewat HR)", func() int64 { id, _ := akunBaru(t, db, "karyawan", 0); return id }, pngKecil, png2,
			func(e error) bool { return errors.Is(e, ErrDilarang) }, 0},
		{"sudah terverifikasi", func() int64 { return qrAkun(t, db, "pemakai", "terverifikasi", "aktif", 0) }, pngKecil, png2,
			func(e error) bool { return errors.Is(e, ErrSudahTerverifikasi) }, 0},
		{"dibekukan", func() int64 { return qrAkun(t, db, "pemakai", "belum", "dibekukan", 0) }, pngKecil, png2,
			func(e error) bool { return errors.Is(e, ErrDibekukan) }, 0},
		{"warung ditolak", func() int64 { id, _ := akunBaru(t, db, "warung", 0); return id }, pngKecil, png2,
			func(e error) bool { return errors.Is(e, ErrDilarang) }, 0},
	}
	total := 0
	for _, k := range kasus {
		_, err := svc.AjukanVerifikasi(ctx, k.akun(), k.kartu, k.swa)
		if !k.harus(err) {
			t.Errorf("%s: %v", k.nama, err)
		}
		total += k.berkas
		if jumlahBerkas(t, dir) != total {
			t.Errorf("%s: %d file di penyimpanan objek, harus %d", k.nama, jumlahBerkas(t, dir), total)
		}
	}
	// tanpa penyimpanan objek terpasang.
	svc2, _ := siapkan(t)
	if _, err := svc2.AjukanVerifikasi(ctx, qrAkun(t, db, "pemakai", "belum", "aktif", 0), pngKecil, png2); !errors.Is(err, ErrLayananTidakAda) {
		t.Errorf("tanpa objek: %v", err)
	}
}

func TestAjukanVerifikasiMerchantTanpaVendor(t *testing.T) {
	svc, db := siapkan(t)
	svc, _ = svcObjek(t, svc)
	m := qrAkun(t, db, "merchant", "belum", "aktif", 0)
	v, err := svc.AjukanVerifikasi(context.Background(), m, pngKecil, append(append([]byte{}, pngKecil...), "x"...))
	if err != nil || v.Subjek != "merchant" {
		t.Fatalf("%+v %v", v, err)
	}
	var n int
	db.QueryRow(`SELECT count(*) FROM outbox WHERE akun_id = $1`, m).Scan(&n)
	if n != 0 {
		t.Errorf("merchant menunggu tim risk, bukan vendor: %d pekerjaan di outbox", n)
	}
}

func TestAjukanVerifikasiBatasLajuPerAkun(t *testing.T) {
	svc, db := siapkan(t)
	svc, _ = svcObjek(t, svc)
	a := qrAkun(t, db, "pemakai", "belum", "aktif", 0)
	var err error
	for i := 0; i < 4; i++ {
		_, err = svc.AjukanVerifikasi(context.Background(), a, pngKecil, append(append([]byte{}, pngKecil...), "x"...))
	}
	var l ErrTerlaluSering
	if !errors.As(err, &l) || l.Lapis != "akun" {
		t.Errorf("pengajuan ke-4 dalam satu jam: %v (batas 3)", err)
	}
}

func TestSelesaikanVerifikasiHanyaSekaliDanTingkat(t *testing.T) {
	_, db := siapkan(t)
	r := repo.Baru(db)
	ctx := context.Background()
	buat := func() (int64, int64) {
		a := qrAkun(t, db, "pemakai", "belum", "aktif", 0)
		var v int64
		db.QueryRow(`INSERT INTO verifikasi (akun_id, subjek, berkas_kartu_kunci, berkas_swafoto_kunci, checksum_kartu, checksum_swafoto)
			VALUES ($1, 'pemakai', 'k', 's', 'c', 'c') RETURNING id`, a).Scan(&v)
		return a, v
	}
	tingkat := func(a int64) string {
		var s string
		db.QueryRow(`SELECT tingkat FROM akun WHERE id = $1`, a).Scan(&s)
		return s
	}
	a, v := buat()
	if ok, err := r.SelesaikanVerifikasi(ctx, v, "lulus", "VND", time.Now()); err != nil || !ok || tingkat(a) != "terverifikasi" {
		t.Fatalf("lulus: %v %v %s", ok, err, tingkat(a))
	}
	// hasil kedua (ditolak) tidak mengubah apa pun: pekerjaan yang diulang tidak membalik keputusan.
	if ok, _ := r.SelesaikanVerifikasi(ctx, v, "ditolak", "VND", time.Now()); ok {
		t.Error("pengajuan yang sudah selesai berubah lagi")
	}
	var s string
	db.QueryRow(`SELECT status FROM verifikasi WHERE id = $1`, v).Scan(&s)
	if s != "lulus" || tingkat(a) != "terverifikasi" {
		t.Errorf("status %s tingkat %s", s, tingkat(a))
	}
	a2, v2 := buat()
	if ok, _ := r.SelesaikanVerifikasi(ctx, v2, "ditolak", "VND", time.Now()); !ok || tingkat(a2) != "belum" {
		t.Errorf("ditolak: tingkat %s", tingkat(a2))
	}
	// gagal tidak menimpa yang sudah lulus.
	r.TandaiVerifikasi(ctx, v, "gagal", time.Now())
	db.QueryRow(`SELECT status FROM verifikasi WHERE id = $1`, v).Scan(&s)
	if s != "lulus" {
		t.Errorf("TandaiVerifikasi menimpa hasil akhir: %s", s)
	}
	// setelah selesai, pemakai boleh mengajukan lagi (indeks hanya untuk pengajuan yang berjalan).
	if _, err := db.Exec(`INSERT INTO verifikasi (akun_id, subjek, berkas_kartu_kunci, berkas_swafoto_kunci, checksum_kartu, checksum_swafoto)
		VALUES ($1, 'pemakai', 'k', 's', 'c', 'c')`, a2); err != nil {
		t.Errorf("pengajuan baru sesudah ditolak: %v", err)
	}
}

// --- tingkat dan status pada transfer ---

func TestKirimButuhTingkatTerverifikasiDanAkunAktif(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	_, nomor := akunBaru(t, db, "karyawan", 0)
	belum := qrAkun(t, db, "pemakai", "belum", "aktif", 100_000)
	if _, err := svc.Kirim(ctx, belum, nomor, 10_000, ""); !errors.Is(err, ErrButuhVerifikasi) {
		t.Errorf("belum terverifikasi: %v", err)
	}
	if saldo(t, db, belum) != 100_000 {
		t.Error("kiriman yang ditolak menggerakkan uang")
	}
	db.Exec(`UPDATE akun SET tingkat = 'terverifikasi' WHERE id = $1`, belum)
	if h, err := svc.Kirim(ctx, belum, nomor, 10_000, ""); err != nil || h.Saldo != 90_000 {
		t.Errorf("sesudah terverifikasi: %+v %v", h, err)
	}
	db.Exec(`UPDATE akun SET status = 'dibekukan' WHERE id = $1`, belum)
	if _, err := svc.Kirim(ctx, belum, nomor, 10_000, ""); !errors.Is(err, ErrDibekukan) {
		t.Errorf("dibekukan: %v", err)
	}
	beku, _ := akunBaru(t, db, "karyawan", 100_000)
	warung, _ := akunBaru(t, db, "warung", 0)
	db.Exec(`UPDATE akun SET status = 'dibekukan' WHERE id = $1`, beku)
	if _, _, err := svc.Bayar(ctx, beku, warung, 10_000, ""); !errors.Is(err, ErrDibekukan) {
		t.Errorf("bayar dibekukan: %v", err)
	}
	if saldo(t, db, beku) != 100_000 {
		t.Error("pembayaran yang ditolak menggerakkan uang")
	}
	// merchant tidak boleh mengirim ke rekan.
	m := qrAkun(t, db, "merchant", "terverifikasi", "aktif", 50_000)
	if _, err := svc.Kirim(ctx, m, nomor, 10_000, ""); !errors.Is(err, ErrDilarang) {
		t.Errorf("merchant: %v", err)
	}
}

// --- pendaftaran ---

func TestDaftarAturan(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	u := fmt.Sprint(time.Now().UnixNano())
	sandi15 := strings.Repeat("k", 15)
	kasus := []struct {
		nama                       string
		jenis, nm, email, password string
		harus                      func(error) bool
	}{
		{"sah", "", "Dina", "dina" + u + "@publik.example", sandi15, func(e error) bool { return e == nil }},
		{"merchant sah", "merchant", "Toko", "toko" + u + "@publik.example", sandi15, func(e error) bool { return e == nil }},
		{"password 14 karakter", "", "X", "a" + u + "@publik.example", strings.Repeat("k", 14), func(e error) bool { return errors.As(e, new(ErrValidasi)) }},
		{"password 73 byte", "", "X", "b" + u + "@publik.example", strings.Repeat("k", 73), func(e error) bool { return errors.As(e, new(ErrValidasi)) }},
		{"password 72 byte sah", "", "X", "c" + u + "@publik.example", strings.Repeat("k", 72), func(e error) bool { return e == nil }},
		{"jenis admin", "admin", "X", "d" + u + "@publik.example", sandi15, func(e error) bool { return errors.As(e, new(ErrValidasi)) }},
		{"jenis risk", "risk", "X", "e" + u + "@publik.example", sandi15, func(e error) bool { return errors.As(e, new(ErrValidasi)) }},
		{"nama kosong", "", "   ", "f" + u + "@publik.example", sandi15, func(e error) bool { return errors.As(e, new(ErrValidasi)) }},
		{"nama 101 karakter", "", strings.Repeat("n", 101), "g" + u + "@publik.example", sandi15, func(e error) bool { return errors.As(e, new(ErrValidasi)) }},
		{"email tanpa @", "", "X", "tanpa-at", sandi15, func(e error) bool { return errors.As(e, new(ErrValidasi)) }},
		{"email dua @", "", "X", "a@b@c", sandi15, func(e error) bool { return errors.As(e, new(ErrValidasi)) }},
		{"email berspasi", "", "X", "a b@publik.example", sandi15, func(e error) bool { return errors.As(e, new(ErrValidasi)) }},
		{"email 255 karakter", "", "X", strings.Repeat("a", 250) + "@b.id", sandi15, func(e error) bool { return errors.As(e, new(ErrValidasi)) }},
		{"email diawali @", "", "X", "@publik.example", sandi15, func(e error) bool { return errors.As(e, new(ErrValidasi)) }},
		{"email diakhiri @", "", "X", "a@", sandi15, func(e error) bool { return errors.As(e, new(ErrValidasi)) }},
	}
	for _, k := range kasus {
		_, err := svc.Daftar(ctx, k.jenis, k.nm, k.email, k.password)
		if !k.harus(err) {
			t.Errorf("%s: %v", k.nama, err)
		}
	}
	// email sama, huruf besar berbeda: terpakai (email disimpan huruf kecil).
	if _, err := svc.Daftar(ctx, "", "Lagi", strings.ToUpper("dina"+u)+"@PUBLIK.EXAMPLE", sandi15); !errors.Is(err, ErrEmailTerpakai) {
		t.Errorf("email sama beda huruf: %v", err)
	}
	var tingkat, status, jenis string
	var buku sql.NullString
	err := db.QueryRow(`SELECT a.tingkat, a.status, a.jenis, b.jenis FROM akun a LEFT JOIN buku b ON b.akun_id = a.id WHERE a.email = $1`,
		"dina"+u+"@publik.example").Scan(&tingkat, &status, &jenis, &buku)
	if err != nil || tingkat != "belum" || status != "aktif" || jenis != "pemakai" || buku.String != "pemakai" {
		t.Errorf("akun baru: %s %s %s buku %v %v", tingkat, status, jenis, buku, err)
	}
	var hash string
	db.QueryRow(`SELECT password_hash FROM akun WHERE email = $1`, "dina"+u+"@publik.example").Scan(&hash)
	if strings.Contains(hash, sandi15) || !strings.HasPrefix(hash, "$2") {
		t.Errorf("password_hash bukan bcrypt: %q", hash)
	}
	var batasHarian *int64
	db.QueryRow(`SELECT b.batas_harian FROM buku b JOIN akun a ON a.id = b.akun_id WHERE a.email = $1`, "dina"+u+"@publik.example").Scan(&batasHarian)
	if batasHarian == nil || *batasHarian != 500_000 {
		t.Errorf("batas harian pemakai: %v", batasHarian)
	}
}

// --- batas laju ---

func TestBatasEndpointPerAkunDanPerAlamat(t *testing.T) {
	svc := Baru(repoKosong(), time.Hour)
	for nama, a := range AmbangEndpoint {
		n := int(a[0])
		for i := 0; i < n; i++ {
			if err := svc.BatasAkun(nama, 1); err != nil {
				t.Fatalf("%s: permintaan ke-%d ditolak (kapasitas %d): %v", nama, i+1, n, err)
			}
		}
		var l ErrTerlaluSering
		if err := svc.BatasAkun(nama, 1); !errors.As(err, &l) || l.Lapis != "akun" || l.Tunggu <= 0 {
			t.Errorf("%s: permintaan ke-%d harus ditolak: %v", nama, n+1, err)
		}
		if err := svc.BatasAkun(nama, 2); err != nil {
			t.Errorf("%s: akun lain ikut habis: %v", nama, err)
		}
	}
	if err := svc.BatasAkun("endpoint-tanpa-batas", 1); err != nil {
		t.Errorf("endpoint tanpa entri dibatasi: %v", err)
	}
	// tiap endpoint punya bucket sendiri.
	if err := svc.BatasAkun("perangkat", 3); err != nil {
		t.Fatal(err)
	}
	for i := 0; i < int(AmbangEndpoint["promo"][0]); i++ {
		svc.BatasAkun("promo", 3)
	}
	if err := svc.BatasAkun("perangkat", 3); err != nil {
		t.Errorf("bucket promo memakai token perangkat: %v", err)
	}
	// per alamat: IPv6 dalam satu /64 berbagi bucket, IPv4 berbeda tidak.
	for i := 0; i < int(AmbangEndpointIP["daftar"][0]); i++ {
		if err := svc.BatasAlamat("daftar", fmt.Sprintf("2001:db8:1:2::%x", i+1)); err != nil {
			t.Fatalf("daftar %d: %v", i+1, err)
		}
	}
	if err := svc.BatasAlamat("daftar", "2001:db8:1:2:ffff::1"); err == nil {
		t.Error("alamat lain di /64 yang sama harus berbagi bucket")
	}
	if err := svc.BatasAlamat("daftar", "2001:db8:1:3::1"); err != nil {
		t.Errorf("/64 lain ikut habis: %v", err)
	}
	if err := svc.BatasAlamat("daftar", "192.0.2.1"); err != nil {
		t.Errorf("IPv4 ikut habis: %v", err)
	}
	// isi ulang menurut laju: 5 per jam = 1 token per 720 detik (jam service digeser).
	jam := time.Now()
	s2 := Baru(repoKosong(), time.Hour).DenganJam(func() time.Time { return jam })
	for i := 0; i < 10; i++ {
		s2.BatasAkun("perangkat", 9)
	}
	if err := s2.BatasAkun("perangkat", 9); err == nil {
		t.Fatal("bucket harus kosong")
	}
	jam = jam.Add(359 * time.Second)
	if err := s2.BatasAkun("perangkat", 9); err == nil {
		t.Error("belum waktunya terisi (1 token per 360 detik)")
	}
	jam = jam.Add(2 * time.Second)
	if err := s2.BatasAkun("perangkat", 9); err != nil {
		t.Errorf("sesudah 361 detik satu token terisi: %v", err)
	}
}
