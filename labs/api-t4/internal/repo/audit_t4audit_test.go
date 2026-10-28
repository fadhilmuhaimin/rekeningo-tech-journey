//go:build t4audit

package repo

import (
	"context"
	"database/sql"
	"encoding/json"
	"os"
	"strconv"
	"testing"
	"time"
)

// Tes lab t4-audit atas rantai hash dan jangkar (ADR 43, M38). Hanya dengan -tags t4audit: schema tes dibangun
// labs/t4-audit/run.py, dan setiap tes mengosongkan audit_log lebih dulu (pemilik schema boleh; tes lain di paket ini
// tidak dijalankan bersamaan). Mutasi di tengah rantai tidak meracuni tes lain karena schema tes ini hanya milik lab.

type vektorHash struct {
	Sebelumnya string `json:"sebelumnya"`
	Waktu      string `json:"waktu"`
	Pelaku     int64  `json:"pelaku"`
	Peran      string `json:"peran"`
	Aksi       string `json:"aksi"`
	Objek      string `json:"objek"`
	Alasan     string `json:"alasan"`
	Penyetuju  int64  `json:"penyetuju"`
	Hash       string `json:"hash"`
}

// Vektor dihitung dengan Python (labs/t4-audit/vektor.py), bukan dengan HashAudit: tiga implementasi harus sama.
func TestT4AVektorHashDariPython(t *testing.T) {
	mentah, err := os.ReadFile("../../../t4-audit/vektor-hash.json")
	if err != nil {
		t.Fatal(err)
	}
	var vektor []vektorHash
	if err := json.Unmarshal(mentah, &vektor); err != nil || len(vektor) < 5 {
		t.Fatalf("vektor tidak terbaca: %v (%d baris)", err, len(vektor))
	}
	sebelum := HashAwalAudit
	for i, v := range vektor {
		if v.Sebelumnya != sebelum {
			t.Fatalf("vektor %d: bukan rantai yang berurutan", i)
		}
		waktu, err := time.Parse("2006-01-02T15:04:05.000000Z", v.Waktu)
		if err != nil {
			t.Fatal(err)
		}
		if got := HashAudit(v.Sebelumnya, waktu, v.Pelaku, v.Peran, v.Aksi, v.Objek, v.Alasan, v.Penyetuju); got != v.Hash {
			t.Errorf("vektor %d: HashAudit %s, Python %s", i, got, v.Hash)
		}
		sebelum = v.Hash
	}
}

// bersihAudit membuka schema tes sebagai pemilik, mengosongkan log, dan mengembalikan satu akun risk untuk pelaku.
func bersihAudit(t *testing.T) (Repo, *sql.DB, int64) {
	t.Helper()
	r, db, pelaku := siapkanAudit(t)
	if _, err := db.Exec(`TRUNCATE audit_log RESTART IDENTITY`); err != nil {
		t.Fatal(err)
	}
	return r, db, pelaku
}

// isiLog menulis n baris lewat TulisAudit dengan waktu tetap (hash deterministik) dan mengembalikan nomornya.
func isiLog(t *testing.T, r Repo, pelaku int64, n int) []int64 {
	t.Helper()
	var ids []int64
	for i := 0; i < n; i++ {
		var id int64
		err := r.DalamTx(context.Background(), func(tx Tx) error {
			var err error
			id, err = tx.TulisAudit(context.Background(), time.Date(2026, 10, 26, 1, 0, i, 0, time.UTC), pelaku, "risk",
				"aksi_uji", "akun:1", "alasan uji rantai dan jangkar", nil)
			return err
		})
		if err != nil {
			t.Fatal(err)
		}
		ids = append(ids, id)
	}
	return ids
}

func ujiJangkar(t *testing.T, r Repo, j []Jangkar) (HasilVerifikasiAudit, []TemuanJangkar) {
	t.Helper()
	h, temuan, err := r.VerifikasiAuditJangkar(context.Background(), j)
	if err != nil {
		t.Fatal(err)
	}
	return h, temuan
}

// Ekor dipotong: rantai tetap utuh (tidak ada yang bisa dibandingkan), jangkar yang tercatat sebelumnya yang menangkapnya.
func TestT4AJangkarMendeteksiEkorDipotongYangRantaiSajaTidak(t *testing.T) {
	r, db, pelaku := bersihAudit(t)
	ids := isiLog(t, r, pelaku, 5)
	h, _ := ujiJangkar(t, r, nil)
	j := Jangkar{ID: h.IDTerakhir, Hash: h.HashTerakhir}
	if j.ID != ids[4] {
		t.Fatalf("jangkar %d, ingin baris terakhir %d", j.ID, ids[4])
	}
	if _, err := db.Exec(`DELETE FROM audit_log WHERE id > $1`, ids[2]); err != nil {
		t.Fatal(err)
	}
	h2, temuan := ujiJangkar(t, r, nil)
	if h2.RusakDiID != 0 || h2.Baris != 3 {
		t.Fatalf("tanpa jangkar: %+v, ingin rantai utuh dengan 3 baris", h2)
	}
	if len(temuan) != 0 {
		t.Fatalf("tanpa jangkar ada temuan %v", temuan)
	}
	h3, temuan := ujiJangkar(t, r, []Jangkar{j})
	if h3.RusakDiID != 0 || len(temuan) != 1 || temuan[0] != (TemuanJangkar{ID: j.ID, Masalah: JangkarBarisHilang}) {
		t.Fatalf("dengan jangkar: %+v %v, ingin rantai utuh dan satu temuan baris-hilang di %d", h3, temuan, j.ID)
	}
}

// Penyerang yang bisa menulis ulang baris tengah lalu menghitung ulang seluruh hash sampai ujung membuat rantai utuh lagi:
// rantai tanpa kunci rahasia bukan tanda tangan. Jangkar yang tercatat sebelumnya tidak lagi cocok.
func TestT4AJangkarMendeteksiRantaiYangDitulisUlangSampaiUjung(t *testing.T) {
	r, db, pelaku := bersihAudit(t)
	isiLog(t, r, pelaku, 5)
	h, _ := ujiJangkar(t, r, nil)
	j := Jangkar{ID: h.IDTerakhir, Hash: h.HashTerakhir}
	tulisUlang(t, db, 2, "alasan yang sudah dipalsukan penyerang")
	h2, temuan := ujiJangkar(t, r, nil)
	if h2.RusakDiID != 0 || h2.Baris != 5 {
		t.Fatalf("sesudah tulis ulang dan hitung ulang: %+v, ingin rantai utuh", h2)
	}
	if len(temuan) != 0 {
		t.Fatal("tanpa jangkar tidak ada yang bisa dicocokkan")
	}
	_, temuan = ujiJangkar(t, r, []Jangkar{j})
	if len(temuan) != 1 || temuan[0] != (TemuanJangkar{ID: j.ID, Masalah: JangkarHashBeda}) {
		t.Fatalf("temuan %v, ingin satu hash-beda di %d", temuan, j.ID)
	}
}

// tulisUlang mengganti alasan baris id lalu menghitung ulang hash baris itu dan semua baris sesudahnya.
func tulisUlang(t *testing.T, db *sql.DB, id int64, alasanBaru string) {
	t.Helper()
	if _, err := db.Exec(`UPDATE audit_log SET alasan = $2 WHERE id = $1`, id, alasanBaru); err != nil {
		t.Fatal(err)
	}
	rows, err := db.Query(`SELECT id, waktu, pelaku_id, peran, aksi, objek, coalesce(alasan, ''), coalesce(penyetuju_id, 0) FROM audit_log WHERE id >= $1 ORDER BY id`, id)
	if err != nil {
		t.Fatal(err)
	}
	type baris struct {
		id, pelaku, penyetuju      int64
		waktu                      time.Time
		peran, aksi, objek, alasan string
	}
	var semua []baris
	for rows.Next() {
		var b baris
		if err := rows.Scan(&b.id, &b.waktu, &b.pelaku, &b.peran, &b.aksi, &b.objek, &b.alasan, &b.penyetuju); err != nil {
			t.Fatal(err)
		}
		semua = append(semua, b)
	}
	rows.Close()
	sebelum := HashAwalAudit
	if err := db.QueryRow(`SELECT hash FROM audit_log WHERE id < $1 ORDER BY id DESC LIMIT 1`, id).Scan(&sebelum); err != nil && err != sql.ErrNoRows {
		t.Fatal(err)
	}
	for _, b := range semua {
		h := HashAudit(sebelum, b.waktu, b.pelaku, b.peran, b.aksi, b.objek, b.alasan, b.penyetuju)
		if _, err := db.Exec(`UPDATE audit_log SET hash_sebelumnya = $2, hash = $3 WHERE id = $1`, b.id, sebelum, h); err != nil {
			t.Fatal(err)
		}
		sebelum = h
	}
}

// Yang tidak dicakup: baris sesudah jangkar terakhir. Dihapus sebelum jangkar berikutnya, tidak ada yang melihatnya.
func TestT4AJangkarTidakMencakupBarisSesudahJangkarTerakhir(t *testing.T) {
	r, db, pelaku := bersihAudit(t)
	isiLog(t, r, pelaku, 3)
	h, _ := ujiJangkar(t, r, nil)
	j := Jangkar{ID: h.IDTerakhir, Hash: h.HashTerakhir}
	isiLog(t, r, pelaku, 2) // baris 4 dan 5, belum dijangkarkan
	if _, err := db.Exec(`DELETE FROM audit_log WHERE id > $1`, j.ID); err != nil {
		t.Fatal(err)
	}
	h2, temuan := ujiJangkar(t, r, []Jangkar{j})
	if h2.RusakDiID != 0 || len(temuan) != 0 || h2.Baris != 3 {
		t.Fatalf("%+v %v: ingin tidak terdeteksi (batas jangkar harian)", h2, temuan)
	}
}

// Seluruh log dikosongkan: semua jangkar hilang. Log kosong tanpa jangkar tidak menghasilkan temuan.
func TestT4AJangkarLogDikosongkan(t *testing.T) {
	r, db, pelaku := bersihAudit(t)
	isiLog(t, r, pelaku, 2)
	h, _ := ujiJangkar(t, r, nil)
	j := Jangkar{ID: h.IDTerakhir, Hash: h.HashTerakhir}
	if _, err := db.Exec(`DELETE FROM audit_log`); err != nil {
		t.Fatal(err)
	}
	h2, temuan := ujiJangkar(t, r, []Jangkar{j})
	if h2.Baris != 0 || h2.IDTerakhir != 0 || len(temuan) != 1 || temuan[0].Masalah != JangkarBarisHilang {
		t.Fatalf("%+v %v", h2, temuan)
	}
	h3, temuan := ujiJangkar(t, r, nil)
	if h3.Baris != 0 || len(temuan) != 0 || h3.HashTerakhir != HashAwalAudit {
		t.Fatalf("log kosong tanpa jangkar: %+v %v", h3, temuan)
	}
}

// Baris tengah diubah, dihapus, dan baris palsu di ujung dengan hash yang benar: apa yang terlihat rantai.
func TestT4ARantaiBarisTengahDiubahDihapusDanBarisPalsuDiUjung(t *testing.T) {
	r, db, pelaku := bersihAudit(t)
	ids := isiLog(t, r, pelaku, 5)
	// Satu baris: rantai utuh dan IDTerakhir benar.
	if _, err := db.Exec(`DELETE FROM audit_log WHERE id > $1`, ids[0]); err != nil {
		t.Fatal(err)
	}
	if h, _ := ujiJangkar(t, r, nil); h.RusakDiID != 0 || h.Baris != 1 || h.IDTerakhir != ids[0] {
		t.Fatalf("satu baris: %+v", h)
	}
	isiLog(t, r, pelaku, 4) // baris berikutnya melanjutkan dari hash baris 1
	ids = nil
	rows, _ := db.Query(`SELECT id FROM audit_log ORDER BY id`)
	for rows.Next() {
		var id int64
		rows.Scan(&id)
		ids = append(ids, id)
	}
	rows.Close()
	if len(ids) != 5 {
		t.Fatalf("%d baris, ingin 5", len(ids))
	}
	if h, _ := ujiJangkar(t, r, nil); h.RusakDiID != 0 || h.Baris != 5 {
		t.Fatalf("sebelum diubah: %+v", h)
	}
	// Diubah di tengah: putus di baris itu.
	if _, err := db.Exec(`UPDATE audit_log SET aksi = 'dipalsukan' WHERE id = $1`, ids[2]); err != nil {
		t.Fatal(err)
	}
	if h, _ := ujiJangkar(t, r, nil); h.RusakDiID != ids[2] {
		t.Fatalf("diubah: putus di %d, ingin %d", h.RusakDiID, ids[2])
	}
	// Dihapus di tengah: putus di baris sesudahnya.
	if _, err := db.Exec(`UPDATE audit_log SET aksi = 'aksi_uji' WHERE id = $1`, ids[2]); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`DELETE FROM audit_log WHERE id = $1`, ids[2]); err != nil {
		t.Fatal(err)
	}
	if h, _ := ujiJangkar(t, r, nil); h.RusakDiID != ids[3] {
		t.Fatalf("dihapus: putus di %d, ingin %d (baris sesudahnya)", h.RusakDiID, ids[3])
	}
	// Baris palsu di ujung dengan hash yang dihitung penulisnya: lolos. Rantai tidak membuktikan siapa penulisnya.
	if _, err := db.Exec(`TRUNCATE audit_log RESTART IDENTITY`); err != nil {
		t.Fatal(err)
	}
	isiLog(t, r, pelaku, 3)
	h, _ := ujiJangkar(t, r, nil)
	waktu := time.Date(2026, 10, 26, 2, 0, 0, 0, time.UTC)
	palsu := HashAudit(h.HashTerakhir, waktu, pelaku, "risk", "buka_berkas", "verifikasi:9/kartu", "dipalsukan", 0)
	if _, err := db.Exec(`INSERT INTO audit_log (waktu, pelaku_id, peran, aksi, objek, alasan, penyetuju_id, hash_sebelumnya, hash)
		VALUES ($1, $2, 'risk', 'buka_berkas', 'verifikasi:9/kartu', 'dipalsukan', NULL, $3, $4)`, waktu, pelaku, h.HashTerakhir, palsu); err != nil {
		t.Fatal(err)
	}
	if h2, _ := ujiJangkar(t, r, nil); h2.RusakDiID != 0 || h2.Baris != 4 {
		t.Fatalf("baris palsu di ujung: %+v, ingin lolos", h2)
	}
}

// Kelas bug "membandingkan sesudah menormalkan": hash disimpan sebagai teks, dan pembandingan harus persis. Huruf besar
// dan spasi di ujung dianggap putus, bukan disamakan dengan hash yang bernilai sama.
func TestT4ARantaiMenolakHashBerbentukLainWalauNilainyaSama(t *testing.T) {
	r, db, pelaku := bersihAudit(t)
	for nama, kasus := range map[string]struct {
		ubah  string
		rusak int64
	}{
		"hash huruf besar":                           {`UPDATE audit_log SET hash = upper(hash) WHERE id = 2`, 2},
		"hash dengan spasi di ujung":                 {`UPDATE audit_log SET hash = hash || ' ' WHERE id = 2`, 2},
		"hash_sebelumnya huruf besar":                {`UPDATE audit_log SET hash_sebelumnya = upper(hash_sebelumnya) WHERE id = 3`, 3},
		"hash_sebelumnya dengan spasi di ujung":      {`UPDATE audit_log SET hash_sebelumnya = hash_sebelumnya || ' ' WHERE id = 3`, 3},
		"hash_sebelumnya baris pertama dengan spasi": {`UPDATE audit_log SET hash_sebelumnya = hash_sebelumnya || ' ' WHERE id = 1`, 1},
	} {
		if _, err := db.Exec(`TRUNCATE audit_log RESTART IDENTITY`); err != nil {
			t.Fatal(err)
		}
		isiLog(t, r, pelaku, 4)
		if h, _ := ujiJangkar(t, r, nil); h.RusakDiID != 0 || h.Baris != 4 {
			t.Fatalf("%s: rantai sudah putus sebelum diubah: %+v", nama, h)
		}
		if _, err := db.Exec(kasus.ubah); err != nil {
			t.Fatalf("%s: %v", nama, err)
		}
		if h, _ := ujiJangkar(t, r, nil); h.RusakDiID != kasus.rusak {
			t.Errorf("%s: putus di %d, ingin %d", nama, h.RusakDiID, kasus.rusak)
		}
	}
}

// Yang dilaporkan adalah baris pertama yang putus, walau lebih dari satu baris diubah.
func TestT4ARantaiMelaporkanBarisPutusPertama(t *testing.T) {
	r, db, pelaku := bersihAudit(t)
	isiLog(t, r, pelaku, 5)
	if _, err := db.Exec(`UPDATE audit_log SET aksi = 'dipalsukan' WHERE id IN (2, 4)`); err != nil {
		t.Fatal(err)
	}
	if h, _ := ujiJangkar(t, r, nil); h.RusakDiID != 2 {
		t.Fatalf("putus di %d, ingin baris pertama yang putus (2)", h.RusakDiID)
	}
}

// Setiap kolom yang ikut di hash (waktu, pelaku, peran, aksi, objek, alasan, penyetuju) diuji sendiri: mengubah satu
// kolom di baris tengah memutus rantai di baris itu. Tanpa tes per kolom, verifikasi yang diam-diam membuang satu
// kolom dari hitungannya lolos, karena tes lain hanya mengubah `aksi`.
func TestT4ARantaiMendeteksiPerubahanDiSetiapKolomYangDiHash(t *testing.T) {
	r, db, pelaku := bersihAudit(t)
	var lain int64
	if err := db.QueryRow(`SELECT min(id) FROM akun WHERE jenis = 'risk' AND id <> $1`, pelaku).Scan(&lain); err != nil {
		t.Fatalf("butuh dua akun risk: %v", err)
	}
	for kolom, ubah := range map[string]string{
		"waktu":        `UPDATE audit_log SET waktu = waktu + interval '1 microsecond' WHERE id = 2`,
		"pelaku_id":    `UPDATE audit_log SET pelaku_id = ` + itoa(lain) + ` WHERE id = 2`,
		"peran":        `UPDATE audit_log SET peran = 'admin' WHERE id = 2`,
		"aksi":         `UPDATE audit_log SET aksi = 'aksi_lain' WHERE id = 2`,
		"objek":        `UPDATE audit_log SET objek = 'akun:2' WHERE id = 2`,
		"alasan":       `UPDATE audit_log SET alasan = alasan || '.' WHERE id = 2`,
		"penyetuju_id": `UPDATE audit_log SET penyetuju_id = ` + itoa(lain) + ` WHERE id = 2`,
	} {
		if _, err := db.Exec(`TRUNCATE audit_log RESTART IDENTITY`); err != nil {
			t.Fatal(err)
		}
		isiLog(t, r, pelaku, 4)
		if h, _ := ujiJangkar(t, r, nil); h.RusakDiID != 0 || h.Baris != 4 {
			t.Fatalf("%s: rantai sudah putus sebelum diubah: %+v", kolom, h)
		}
		if _, err := db.Exec(ubah); err != nil {
			t.Fatalf("%s: %v", kolom, err)
		}
		if h, _ := ujiJangkar(t, r, nil); h.RusakDiID != 2 {
			t.Errorf("%s diubah di baris 2: putus di %d, ingin 2", kolom, h.RusakDiID)
		}
	}
}

func itoa(n int64) string { return strconv.FormatInt(n, 10) }

// Rantai mengikuti nomor baris, bukan jam: jam yang mundur (koreksi NTP, dua server) tidak boleh membuat penulis
// menyambung ke baris yang salah atau pemeriksa membaca dengan urutan lain.
func TestT4ARantaiTidakBergantungPadaUrutanWaktu(t *testing.T) {
	r, db, pelaku := bersihAudit(t)
	jam := []time.Time{
		time.Date(2026, 10, 26, 5, 0, 10, 0, time.UTC),
		time.Date(2026, 10, 26, 5, 0, 30, 0, time.UTC),
		time.Date(2026, 10, 26, 5, 0, 5, 0, time.UTC), // jam mundur 25 detik
		time.Date(2026, 10, 26, 5, 0, 5, 0, time.UTC), // sama persis dengan baris sebelumnya
		time.Date(2026, 10, 26, 4, 59, 0, 0, time.UTC),
	}
	for i, w := range jam {
		err := r.DalamTx(context.Background(), func(tx Tx) error {
			_, err := tx.TulisAudit(context.Background(), w, pelaku, "risk", "aksi_uji", "akun:1", "alasan uji urutan waktu rantai", nil)
			return err
		})
		if err != nil {
			t.Fatalf("baris %d: %v", i+1, err)
		}
	}
	h, _ := ujiJangkar(t, r, nil)
	if h.RusakDiID != 0 || h.Baris != 5 || h.IDTerakhir != 5 {
		t.Fatalf("jam mundur: %+v, ingin rantai utuh 5 baris", h)
	}
	var sambung int
	if err := db.QueryRow(`SELECT count(*) FROM audit_log a JOIN audit_log b ON b.id = a.id - 1 WHERE a.hash_sebelumnya = b.hash`).Scan(&sambung); err != nil || sambung != 4 {
		t.Fatalf("%d sambungan menurut nomor baris, ingin 4 (%v)", sambung, err)
	}
}

// Waktu dengan pecahan di bawah mikrodetik: hash dihitung dari waktu yang dipotong ke mikrodetik, persis yang disimpan
// PostgreSQL, jadi pemeriksa yang membaca ulang mendapat hash yang sama. Tes lain memakai detik bulat.
func TestT4ARantaiWaktuDenganPecahanSubDetik(t *testing.T) {
	r, db, pelaku := bersihAudit(t)
	for i, ns := range []int{123_456_789, 999_999_999, 500, 1_000, 999} {
		w := time.Date(2026, 10, 26, 6, 0, i, ns, time.UTC)
		err := r.DalamTx(context.Background(), func(tx Tx) error {
			_, err := tx.TulisAudit(context.Background(), w, pelaku, "risk", "aksi_uji", "akun:1", "alasan uji pecahan waktu rantai", nil)
			return err
		})
		if err != nil {
			t.Fatal(err)
		}
	}
	if h, _ := ujiJangkar(t, r, nil); h.RusakDiID != 0 || h.Baris != 5 {
		t.Fatalf("pecahan sub-detik: %+v, ingin rantai utuh 5 baris", h)
	}
	// 123.456.789 ns, 999.999.999 ns, dan 1.000 ns menyisakan 123456, 999999, dan 1 mikrodetik; 500 ns dan 999 ns dipotong
	// menjadi nol. Yang disimpan harus persis hasil pemotongan (bukan pembulatan).
	rows, err := db.Query(`SELECT (extract(microseconds FROM waktu)::bigint % 1000000) FROM audit_log ORDER BY id`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	var got []int64
	for rows.Next() {
		var us int64
		if err := rows.Scan(&us); err != nil {
			t.Fatal(err)
		}
		got = append(got, us)
	}
	want := []int64{123456, 999999, 0, 1, 0}
	for i := range want {
		if i >= len(got) || got[i] != want[i] {
			t.Fatalf("mikrodetik tersimpan %v, ingin %v (dipotong, bukan dibulatkan)", got, want)
		}
	}
}

// Karakterisasi (bukan keinginan): HashAudit tidak menyandikan panjang kolom, jadi dua isi yang berbeda hanya di letak
// pemisah 0x1f menghasilkan hash yang sama. Tidak terjangkau lewat service (alasan menolak karakter kontrol, objek
// dibentuk dari angka dan kata tetap); tes ini mencatat batasnya supaya penyandian berubah bila kolom bebas bertambah.
func TestT4AHashAuditTidakInjektifUntukPemisahDiDalamKolom(t *testing.T) {
	w := time.Date(2026, 10, 26, 1, 0, 0, 0, time.UTC)
	a := HashAudit(HashAwalAudit, w, 420, "risk", "aksi", "akun:1\x1fbagian", "sisa", 0)
	b := HashAudit(HashAwalAudit, w, 420, "risk", "aksi", "akun:1", "bagian\x1fsisa", 0)
	if a != b {
		t.Skip("HashAudit sudah menyandikan batas kolom: hapus tes karakterisasi ini")
	}
	if c := HashAudit(HashAwalAudit, w, 420, "risk", "aksi", "akun:1bagian", "sisa", 0); c == a {
		t.Fatal("tanpa pemisah di dalam kolom, hash harus berbeda")
	}
}
