package service

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"testing"
	"time"

	"lab/apit5/internal/repo"
)

// Tes tambahan dari tinjauan independen lab api-t5. Tiap tes menutup mutan yang lolos dari tes pelaksana: langkah
// angsuran dan jadwal yang dihentikan, jenis dan referensi jurnal angsuran, hari laporan menurut WIB, buku tabungan
// di pencarian buku utama, bentuk partisi, dan constraint tabel baru.

// Langkah angsuran dijaga: jadwal yang dihentikan tidak ditagih, angsuran yang statusnya sudah `terjurnal` hanya
// ditandai `dicatat` tanpa jurnal baru, dan penanda status tidak memundurkan angsuran yang sudah selesai.
func TestCicilanLangkahDanJadwalDihentikan(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	akun, _, jadwal := siapkanCicilan(t, svc, db, 100_000)
	r := repo.Baru(db)

	if _, err := db.Exec(`UPDATE jadwal_cicilan SET status = 'dihentikan' WHERE id = $1`, jadwal); err != nil {
		t.Fatal(err)
	}
	h, err := svc.JalankanCicilan(ctx, besok(), OpsiCicilan{Jadwal: jadwal})
	if err != nil || h.Dibaca != 0 || saldoBuku(t, db, akun, "karyawan") != 100_000 {
		t.Fatalf("jadwal dihentikan: %+v, %v; ingin tidak ada angsuran dibaca dan saldo tetap 100000", h, err)
	}
	if _, err := db.Exec(`UPDATE jadwal_cicilan SET status = 'aktif' WHERE id = $1`, jadwal); err != nil {
		t.Fatal(err)
	}

	// Job berhenti sesudah jurnal ditulis, lalu status `terjurnal` dipasang (langkah yang diambil job sebelum menandai dicatat).
	if h, err = svc.JalankanCicilan(ctx, besok(), OpsiCicilan{BerhentiSetelahJurnal: 1, Jadwal: jadwal}); err != nil || h.Dijurnal != 1 {
		t.Fatalf("putaran yang berhenti: %+v, %v", h, err)
	}
	ref := fmt.Sprintf("angsuran:%d:1", jadwal)
	if _, err := db.Exec(`UPDATE angsuran SET status = 'terjurnal', jurnal_id = (SELECT id FROM jurnal WHERE referensi = $2)
		WHERE jadwal_id = $1 AND ke = 1`, jadwal, ref); err != nil {
		t.Fatal(err)
	}
	h, err = svc.JalankanCicilan(ctx, besok(), OpsiCicilan{Jadwal: jadwal})
	if err != nil || h.Dibaca != 1 || h.Dicatat != 1 || h.Dijurnal != 0 || h.JurnalAda != 0 {
		t.Fatalf("angsuran terjurnal: %+v, %v; ingin dibaca 1, dicatat 1, tanpa jurnal baru dan tanpa mencari jurnal lagi", h, err)
	}
	if got := saldoBuku(t, db, akun, "karyawan"); got != 90_000 {
		t.Fatalf("saldo %d, ingin 90000", got)
	}

	// Penanda dengan langkah asal yang tidak cocok tidak mengubah apa pun: angsuran yang sudah `dicatat` tidak jadi `gagal`.
	ok, err := r.TandaiAngsuran(ctx, jadwal, 1, []string{"menunggu"}, "gagal", nil)
	if err != nil || ok || statusAngsuran(t, db, jadwal, 1) != "dicatat" {
		t.Fatalf("TandaiAngsuran dari langkah yang salah: ok %v, %v, status %s; ingin false, tanpa galat, tetap dicatat",
			ok, err, statusAngsuran(t, db, jadwal, 1))
	}
}

// Jenis dan referensi jurnal angsuran: cicilan memakai `angsuran`, tabungan memakai `tabungan`, dan referensinya
// mengikuti jenis itu.
func TestJurnalAngsuranJenisDanReferensi(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	_, _, jc := siapkanCicilan(t, svc, db, 100_000)
	a2, _ := akunBaru(t, db, "karyawan", 50_000)
	jt, err := svc.BuatCicilan(ctx, a2, "tabungan", nil, 20_000, 2, 10, awalHariWIB(time.Now()).AddDate(0, 0, -1))
	if err != nil {
		t.Fatal(err)
	}
	for _, j := range []int64{jc, jt} {
		if _, err := svc.JalankanCicilan(ctx, besok(), OpsiCicilan{Jadwal: j}); err != nil {
			t.Fatal(err)
		}
	}
	jenisRef := func(jadwal int64) (jenis, ref string) {
		if err := db.QueryRow(`SELECT j.jenis, j.referensi FROM angsuran a JOIN jurnal j ON j.id = a.jurnal_id
			WHERE a.jadwal_id = $1 AND a.ke = 1`, jadwal).Scan(&jenis, &ref); err != nil {
			t.Fatal(err)
		}
		return
	}
	if j, r := jenisRef(jc); j != "angsuran" || r != fmt.Sprintf("angsuran:%d:1", jc) {
		t.Fatalf("jurnal cicilan: jenis %q, referensi %q", j, r)
	}
	if j, r := jenisRef(jt); j != "tabungan" || r != fmt.Sprintf("tabungan:%d:1", jt) {
		t.Fatalf("jurnal tabungan: jenis %q, referensi %q", j, r)
	}
}

// Batas validasi: akun dibekukan tidak membuat jadwal, jumlah per angsuran paling banyak 10.000.000, dan judul
// pengumuman paling banyak 80 karakter (dihitung per karakter, bukan per byte).
func TestBatasValidasiCicilanDanPengumuman(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	w, _ := akunBaru(t, db, "warung", 0)
	a, _ := akunBaru(t, db, "karyawan", 0)
	mulai := awalHariWIB(time.Now())
	if _, err := svc.BuatCicilan(ctx, a, "cicilan", &w, 10_000_001, 3, 5, mulai); !errors.As(err, new(ErrValidasi)) {
		t.Errorf("jumlah per angsuran 10.000.001: %v, ingin ErrValidasi", err)
	}
	if _, err := svc.BuatCicilan(ctx, a, "cicilan", &w, 10_000_000, 3, 5, mulai); err != nil {
		t.Errorf("jumlah per angsuran 10.000.000: %v, ingin berhasil", err)
	}
	if _, err := db.Exec(`UPDATE akun SET status = 'dibekukan' WHERE id = $1`, a); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.BuatCicilan(ctx, a, "cicilan", &w, 1000, 3, 5, mulai); !errors.Is(err, ErrDibekukan) {
		t.Errorf("akun dibekukan: %v, ingin ErrDibekukan", err)
	}
	admin, _ := akunBaru(t, db, "admin", 0)
	if _, _, err := svc.BuatPengumuman(ctx, admin, strings.Repeat("é", 81)); !errors.As(err, new(ErrValidasi)) {
		t.Errorf("judul 81 karakter: %v, ingin ErrValidasi", err)
	}
	if _, _, err := svc.BuatPengumuman(ctx, admin, strings.Repeat("é", 80)); err != nil {
		t.Errorf("judul 80 karakter: %v, ingin berhasil", err)
	}
}

// Jumlah penerima pengumuman menghitung akun, bukan perangkat: akun dengan dua HP dihitung satu kali.
func TestPengumumanMenghitungAkunBukanPerangkat(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	admin, _ := akunBaru(t, db, "admin", 0)
	k, _ := akunBaru(t, db, "karyawan", 0)
	tambah := func(token string) {
		if _, err := db.Exec(`INSERT INTO perangkat (akun_id, platform, token_push) VALUES ($1, 'android', $2)`, k, token); err != nil {
			t.Fatal(err)
		}
	}
	tambah(fmt.Sprintf("tinjau-%d-a", k))
	_, n1, err := svc.BuatPengumuman(ctx, admin, "Satu HP")
	if err != nil {
		t.Fatal(err)
	}
	tambah(fmt.Sprintf("tinjau-%d-b", k))
	_, n2, err := svc.BuatPengumuman(ctx, admin, "Dua HP, akun sama")
	if err != nil {
		t.Fatal(err)
	}
	if n2 != n1 {
		t.Fatalf("jumlah penerima %d lalu %d: HP kedua milik akun yang sama tidak boleh menambah penerima", n1, n2)
	}
}

// Hari laporan mengikuti WIB, bukan UTC: pada pukul 01.00 WIB (18.00 UTC hari sebelumnya) laporan hari itu hanya
// memuat posting sesudah pukul 00.00 WIB. Waktu diperankan lewat jam service; posting ditulis dengan `dibuat` tetap
// di partisi `posting_sebelum` (bulan lama), jadi tes ini tidak bergantung pada tanggal hari ini.
func TestLaporanHariIniMemakaiHariWIB(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	w, _ := akunBaru(t, db, "warung", 0)
	tulisPosting := func(n int64, dibuat string) {
		tx, err := db.Begin()
		if err != nil {
			t.Fatal(err)
		}
		defer tx.Rollback()
		var tunjangan, buku, j int64
		if err := tx.QueryRow(`SELECT id FROM buku WHERE akun_id IS NULL AND jenis = 'tunjangan'`).Scan(&tunjangan); err != nil {
			t.Fatal(err)
		}
		if err := tx.QueryRow(`SELECT id FROM buku WHERE akun_id = $1`, w).Scan(&buku); err != nil {
			t.Fatal(err)
		}
		if err := tx.QueryRow(`INSERT INTO jurnal (jenis, keterangan, dibuat_oleh, dibuat) VALUES ('topup', 'tes hari WIB', 1, $1::timestamptz) RETURNING id`, dibuat).Scan(&j); err != nil {
			t.Fatal(err)
		}
		if _, err := tx.Exec(`INSERT INTO posting (jurnal_id, buku_id, jumlah, dibuat) VALUES ($1, $2, $4, $5::timestamptz), ($1, $3, -$4, $5::timestamptz)`,
			j, buku, tunjangan, n, dibuat); err != nil {
			t.Fatal(err)
		}
		if _, err := tx.Exec(`UPDATE buku SET saldo_cache = saldo_cache + $2 WHERE id = $1`, buku, n); err != nil {
			t.Fatal(err)
		}
		if _, err := tx.Exec(`UPDATE buku SET saldo_cache = saldo_cache - $2 WHERE id = $1`, tunjangan, n); err != nil {
			t.Fatal(err)
		}
		if err := tx.Commit(); err != nil {
			t.Fatal(err)
		}
	}
	tulisPosting(5_000, "2026-03-10 23:30:00+07") // hari WIB 10 Maret
	tulisPosting(7_000, "2026-03-11 00:30:00+07") // hari WIB 11 Maret
	pukul01WIB := time.Date(2026, 3, 11, 1, 0, 0, 0, WIB)
	s := svc.DenganMode(RentanLaporanPrimary).DenganJam(func() time.Time { return pukul01WIB })
	l, err := s.LaporanHariIni(ctx, w, w)
	if err != nil || l.Tanggal != "2026-03-11" || l.Jumlah != 1 || l.Total != 7_000 {
		t.Fatalf("laporan pukul 01.00 WIB: %+v, %v; ingin tanggal 2026-03-11, 1 transaksi, total 7000", l, err)
	}
}

// Buku tabungan tidak ikut pencarian buku utama di riwayat, laporan, penerimaan, top-up CSV, dan back office. Dua urutan
// pembuatan dicoba (tabungan lebih dulu, buku utama lebih dulu), karena pencarian tanpa penyaring mengambil baris
// pertama atau terakhir menurut urutan baris.
func TestBukuTabunganTidakMasukPencarianBukuUtama(t *testing.T) {
	svc, db := siapkan(t)
	ctx := context.Background()
	r := repo.Baru(db)
	for _, tabunganDulu := range []bool{true, false} {
		t.Run(fmt.Sprintf("tabungan_dulu_%v", tabunganDulu), func(t *testing.T) {
			var wr int64
			if err := db.QueryRow(`SELECT greatest(coalesce(max(id), 0), 100000) + 1 FROM akun`).Scan(&wr); err != nil {
				t.Fatal(err)
			}
			email := fmt.Sprintf("wtj%d@lestari.example", wr)
			if _, err := db.Exec(`INSERT INTO akun (id, jenis, nama, email, password_hash, tingkat) VALUES ($1, 'warung', 'Warung tinjau', $2, '!', 'terverifikasi')`, wr, email); err != nil {
				t.Fatal(err)
			}
			buatTabungan := func() {
				if err := r.DalamTx(ctx, func(tx repo.Tx) error { _, err := tx.BukuTabungan(ctx, wr); return err }); err != nil {
					t.Fatal(err)
				}
			}
			buatUtama := func() {
				if _, err := db.Exec(`INSERT INTO buku (akun_id, jenis, batas_saldo) VALUES ($1, 'warung', 1500000)`, wr); err != nil {
					t.Fatal(err)
				}
			}
			if tabunganDulu {
				buatTabungan()
				buatUtama()
			} else {
				buatUtama()
				buatTabungan()
			}
			k, _ := akunBaru(t, db, "karyawan", 100_000)
			if _, _, err := svc.Bayar(ctx, k, wr, 30_000, ""); err != nil {
				t.Fatal(err)
			}
			// Uang masuk ke buku tabungan warung itu lewat jurnal bayar langsung (rancangan lab tidak punya jalur ini; ini
			// hanya untuk membuktikan penyaring jenis).
			var tabungan int64
			if err := db.QueryRow(`SELECT id FROM buku WHERE akun_id = $1 AND jenis = 'tabungan'`, wr).Scan(&tabungan); err != nil {
				t.Fatal(err)
			}
			if err := r.DalamTx(ctx, func(tx repo.Tx) error {
				bk, err := tx.KunciBukuAkun(ctx, k)
				if err != nil {
					return err
				}
				_, err = tx.CatatJurnal(ctx, "bayar", "uang ke buku tabungan warung", k, nil,
					[]repo.Posting{{BukuID: bk[k].ID, Jumlah: -5_000}, {BukuID: tabungan, Jumlah: 5_000}})
				return err
			}); err != nil {
				t.Fatal(err)
			}
			var utama int64
			if err := db.QueryRow(`SELECT id FROM buku WHERE akun_id = $1 AND jenis = 'warung'`, wr).Scan(&utama); err != nil {
				t.Fatal(err)
			}
			hari := time.Now().In(WIB).Format("2006-01-02")
			if rw, err := r.Riwayat(ctx, wr, nil, 50); err != nil || len(rw) != 1 || rw[0].Jumlah != 30_000 {
				t.Errorf("riwayat warung: %+v, %v; ingin satu baris 30000 dari buku utama", rw, err)
			}
			if lp, err := r.Laporan(ctx, wr, hari, hari); err != nil || len(lp) != 1 || lp[0].Transaksi != 1 || lp[0].Total != 30_000 {
				t.Errorf("laporan warung: %+v, %v; ingin 1 transaksi 30000", lp, err)
			}
			// Laporan hari ini (mode laporan-primary) juga hanya menjumlah buku warung, bukan buku tabungan.
			if lh, err := svc.DenganMode(RentanLaporanPrimary).LaporanHariIni(ctx, wr, wr); err != nil || lh.Jumlah != 1 || lh.Total != 30_000 {
				t.Errorf("laporan hari ini warung: %+v, %v; ingin 1 transaksi 30000", lh, err)
			}
			if pn, err := r.RiwayatPenerimaan(ctx, wr, 50); err != nil || len(pn) != 1 || pn[0].Nominal != 30_000 {
				t.Errorf("penerimaan warung: %+v, %v; ingin satu baris 30000", pn, err)
			}
			if m, err := r.AkunLewatKunci(ctx, "email", []string{email}); err != nil || m[email].BukuID != utama {
				t.Errorf("AkunLewatKunci: %+v, %v; ingin buku utama %d (top-up CSV tidak boleh masuk buku tabungan %d)", m[email], err, utama, tabungan)
			}
			if err := r.DalamTx(ctx, func(tx repo.Tx) error {
				a, err := tx.AkunBO(ctx, wr)
				if err == nil && a.Saldo != 30_000 {
					err = fmt.Errorf("saldo back office %d, ingin 30000 dari buku utama", a.Saldo)
				}
				return err
			}); err != nil {
				t.Error(err)
			}
		})
	}
	// Riwayat karyawan: pemindahan ke tabungan muncul sekali (keluar dari buku utama), bukan juga sebagai uang masuk.
	a, _ := akunBaru(t, db, "karyawan", 50_000)
	j, err := svc.BuatCicilan(ctx, a, "tabungan", nil, 20_000, 1, 10, awalHariWIB(time.Now()).AddDate(0, 0, -1))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.JalankanCicilan(ctx, besok(), OpsiCicilan{Jadwal: j}); err != nil {
		t.Fatal(err)
	}
	rw, err := r.Riwayat(ctx, a, nil, 50)
	if err != nil || len(rw) != 2 {
		t.Fatalf("riwayat karyawan dengan tabungan: %d baris, %v; ingin 2 (saldo awal masuk, angsuran tabungan keluar)", len(rw), err)
	}
}

// Constraint tabel baru dijaga database, dengan nama yang diperiksa (bukan hanya kode 23514 yang bisa datang dari
// trigger lain): bentuk referensi berjangkar di kedua ujung, tabungan tanpa merchant, status angsuran sesuai jurnal,
// dan jumlah posting bukan nol.
func TestConstraintTabelBaruTahap5(t *testing.T) {
	_, db := siapkan(t)
	cek := func(q, constraint string, arg ...any) {
		t.Helper()
		_, err := db.Exec(q, arg...)
		if kodePG(err) != "23514" || namaConstraint(err) != constraint {
			t.Errorf("%s: %v, ingin 23514 %s", q, err, constraint)
		}
	}
	for _, ref := range []string{"angsuran:1:2xyz", "angsuran:1", "xangsuran:1:2", "pinjaman:1:2"} {
		cek(`INSERT INTO jurnal (jenis, keterangan, dibuat_oleh, referensi) VALUES ('angsuran', 'bentuk', 1, $1)`, "referensi_bentuk", ref)
	}
	cek(`INSERT INTO jadwal_cicilan (akun_id, jenis, merchant_akun_id, jumlah_per_angsuran, jumlah_angsuran, hari_tagih) VALUES (1, 'tabungan', 2, 1000, 1, 1)`,
		"tabungan_tanpa_merchant")
	cek(`INSERT INTO jadwal_cicilan (akun_id, jenis, jumlah_per_angsuran, jumlah_angsuran, hari_tagih) VALUES (1, 'cicilan', 1000, 1, 1)`,
		"cicilan_dengan_merchant")
	var jadwal int64
	if err := db.QueryRow(`INSERT INTO jadwal_cicilan (akun_id, jenis, merchant_akun_id, jumlah_per_angsuran, jumlah_angsuran, hari_tagih) VALUES (1, 'cicilan', 2, 1000, 1, 1) RETURNING id`).Scan(&jadwal); err != nil {
		t.Fatal(err)
	}
	cek(`INSERT INTO angsuran (jadwal_id, ke, jatuh_tempo, status) VALUES ($1, 1, '2026-01-01', 'terjurnal')`, "angsuran_jurnal_sesuai_status", jadwal)
	cek(`INSERT INTO angsuran (jadwal_id, ke, jatuh_tempo, status, jurnal_id) VALUES ($1, 1, '2026-01-01', 'menunggu', 5)`, "angsuran_jurnal_sesuai_status", jadwal)
	// Posting bernilai nol ditolak langsung oleh CHECK di tabel induk (bukan baru saat COMMIT oleh trigger keseimbangan).
	tx, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback()
	var j, buku int64
	if err := tx.QueryRow(`INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('topup', 'nol', 1) RETURNING id`).Scan(&j); err != nil {
		t.Fatal(err)
	}
	if err := tx.QueryRow(`SELECT id FROM buku WHERE akun_id IS NULL AND jenis = 'tunjangan'`).Scan(&buku); err != nil {
		t.Fatal(err)
	}
	_, err = tx.Exec(`INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES ($1, $2, 0)`, j, buku)
	// Nama bawaan PostgreSQL memakai akhiran angka bila nama yang sama masih dipakai tabel lain (posting_jumlah_check1).
	if kodePG(err) != "23514" || !strings.HasPrefix(namaConstraint(err), "posting_jumlah_check") {
		t.Errorf("posting nol: %v, ingin 23514 posting_jumlah_check", err)
	}
}

// Partisi posting menyambung tanpa celah dan tanpa tumpang tindih: posting_sebelum berakhir tepat di awal bulan
// berjalan, tiap partisi bulan dimulai pukul 00.00 WIB tanggal 1 dan berakhir di awal bulan berikutnya, dan jumlahnya
// empat. Celah akan menolak posting yang ditulis di jam-jam awal bulan.
func TestPartisiPostingMenyambungTanpaCelah(t *testing.T) {
	_, db := siapkan(t)
	rows, err := db.Query(`SELECT c.relname, pg_get_expr(c.relpartbound, c.oid) FROM pg_inherits i
		JOIN pg_class c ON c.oid = i.inhrelid WHERE i.inhparent = 'posting'::regclass`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	type batas struct {
		nama     string
		dari, ke time.Time
		dariMin  bool
	}
	re := regexp.MustCompile(`^FOR VALUES FROM \((MINVALUE|'[^']+')\) TO \('([^']+)'\)$`)
	waktu := func(s string) time.Time {
		x, err := time.Parse("2006-01-02 15:04:05-07", strings.Trim(s, "'"))
		if err != nil {
			t.Fatalf("batas %q: %v", s, err)
		}
		return x
	}
	var ps []batas
	for rows.Next() {
		var nama, b string
		if err := rows.Scan(&nama, &b); err != nil {
			t.Fatal(err)
		}
		m := re.FindStringSubmatch(b)
		if m == nil {
			t.Fatalf("batas partisi %s: %q bukan FROM ... TO ...", nama, b)
		}
		p := batas{nama: nama, ke: waktu(m[2]), dariMin: m[1] == "MINVALUE"}
		if !p.dariMin {
			p.dari = waktu(m[1])
		}
		ps = append(ps, p)
	}
	if err := rows.Err(); err != nil {
		t.Fatal(err)
	}
	if len(ps) != 4 {
		t.Fatalf("%d partisi, ingin 4 (posting_sebelum dan tiga bulan)", len(ps))
	}
	sort.Slice(ps, func(i, j int) bool { return ps[i].ke.Before(ps[j].ke) })
	if ps[0].nama != "posting_sebelum" || !ps[0].dariMin {
		t.Fatalf("partisi pertama %+v, ingin posting_sebelum dari MINVALUE", ps[0])
	}
	for i := 1; i < len(ps); i++ {
		if !ps[i].dari.Equal(ps[i-1].ke) {
			t.Errorf("celah atau tumpang tindih antara %s (sampai %s) dan %s (dari %s)", ps[i-1].nama, ps[i-1].ke, ps[i].nama, ps[i].dari)
		}
		d, k := ps[i].dari.In(WIB), ps[i].ke.In(WIB)
		if d.Day() != 1 || d.Hour() != 0 || d.Minute() != 0 || !k.Equal(time.Date(d.Year(), d.Month()+1, 1, 0, 0, 0, 0, WIB)) {
			t.Errorf("%s: dari %s sampai %s menurut WIB, ingin satu bulan penuh dari tanggal 1 pukul 00.00", ps[i].nama, d, k)
		}
	}
	sekarang := time.Now()
	if !(ps[1].dari.Before(sekarang) && sekarang.Before(ps[1].ke)) {
		t.Errorf("%s tidak memuat saat ini (%s): bulan berjalan harus di partisi bulan pertama", ps[1].nama, sekarang)
	}
}

// Fungsi pembuat partisi menolak tanggal yang bukan awal bulan, dan partisi yang dibuatnya ikut menolak TRUNCATE.
func TestBuatPartisiPostingMenolakTengahBulan(t *testing.T) {
	_, db := siapkan(t)
	tx, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	_, err = tx.Exec(`SELECT buat_partisi_posting('posting_tes_tengah_bulan', '2030-01-15')`)
	tx.Rollback()
	if kodePG(err) != "22023" {
		t.Fatalf("partisi dari tengah bulan: %v, ingin 22023", err)
	}
	tx, err = db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`SELECT buat_partisi_posting('posting_tes_2030_01', '2030-01-01')`); err != nil {
		t.Fatal(err)
	}
	if _, err := tx.Exec(`TRUNCATE posting_tes_2030_01`); kodePG(err) != "23001" {
		t.Fatalf("TRUNCATE partisi baru: %v, ingin 23001 ditolak trigger", err)
	}
}

// BukuTabungan dipanggil tiap angsuran tabungan: panggilan kedua untuk akun yang sama memakai buku yang ada, bukan
// membuat buku kedua atau gagal karena nama unik.
func TestBukuTabunganDipakaiUlang(t *testing.T) {
	_, db := siapkan(t)
	ctx := context.Background()
	a, _ := akunBaru(t, db, "karyawan", 0)
	r := repo.Baru(db)
	var pertama, kedua int64
	for i, id := range []*int64{&pertama, &kedua} {
		if err := r.DalamTx(ctx, func(tx repo.Tx) error {
			b, err := tx.BukuTabungan(ctx, a)
			*id = b.ID
			return err
		}); err != nil {
			t.Fatalf("panggilan ke-%d: %v", i+1, err)
		}
	}
	if pertama == 0 || pertama != kedua {
		t.Fatalf("buku tabungan %d lalu %d, ingin buku yang sama", pertama, kedua)
	}
	if n := hitungSQL(t, db, `SELECT count(*) FROM buku WHERE akun_id = $1 AND jenis = 'tabungan'`, a); n != 1 {
		t.Fatalf("%d buku tabungan, ingin 1", n)
	}
}

// Invarian 3 berlaku di semua buku milik akun yang menyimpan uang: karyawan, pemakai, merchant, dan tabungan tidak boleh
// negatif. Daftar jenisnya ditulis ulang di migration 000026, jadi satu jenis yang terlupa lolos dari tes karyawan.
func TestSaldoBukuMilikAkunTidakNegatif(t *testing.T) {
	_, db := siapkan(t)
	ctx := context.Background()
	r := repo.Baru(db)
	for _, jenis := range []string{"karyawan", "pemakai", "merchant"} {
		a, _ := akunBaru(t, db, jenis, 10_000)
		err := r.DalamTx(ctx, func(tx repo.Tx) error {
			tunjangan, err := tx.BukuSistem(ctx, "tunjangan")
			if err != nil {
				return err
			}
			buku, err := tx.KunciBukuAkun(ctx, a)
			if err != nil {
				return err
			}
			_, err = tx.CatatJurnal(ctx, "pencairan", "tarik melebihi saldo", 1, nil,
				[]repo.Posting{{BukuID: buku[a].ID, Jumlah: -20_000}, {BukuID: tunjangan, Jumlah: 20_000}})
			return err
		})
		if kodePG(err) != "23514" || namaConstraint(err) != "saldo_karyawan_tidak_negatif" {
			t.Errorf("buku %s: tarik 20000 dari saldo 10000: %v, ingin 23514 saldo_karyawan_tidak_negatif", jenis, err)
		}
		if got := saldoBuku(t, db, a, jenis); got != 10_000 {
			t.Errorf("buku %s: saldo %d sesudah penolakan, ingin 10000", jenis, got)
		}
	}
}
