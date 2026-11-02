package main

import (
	"bytes"
	"crypto/rand"
	"crypto/x509"
	"database/sql"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"

	"lab/apit5/internal/identitas"
	"lab/apit5/internal/klien"
	"lab/apit5/internal/pki"
	"lab/apit5/internal/repo"
	"lab/apit5/internal/service"
)

// Tes ledger sebagai service dengan mTLS dan PostgreSQL sungguhan (schema tes dibuat run.py): jurnal sungguhan ditulis
// atau tidak ditulis, dan yang dihitung adalah baris di tabel jurnal, bukan jawaban HTTP saja (M47, ADR 53).

type lingkungan struct {
	db     *sql.DB
	svc    service.Service
	folder string
	ca     *pki.CA
	server *httptest.Server
	alamat string
	akun   int64
	mutasi bool
}

func siapkan(t *testing.T, rentan bool, izin ...identitas.Izin) *lingkungan {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		if os.Getenv("TES_DB_WAJIB") == "1" {
			t.Fatal("TES_DB_WAJIB=1 tetapi TEST_DATABASE_URL kosong")
		}
		t.Skip("TEST_DATABASE_URL kosong: tes ini butuh PostgreSQL")
	}
	cfg, err := pgx.ParseConfig(url)
	if err != nil {
		t.Fatal(err)
	}
	db := stdlib.OpenDB(*cfg)
	t.Cleanup(func() { db.Close() })
	skema := "tahap5_tes"
	if s := os.Getenv("LAB_TES_SCHEMA"); s != "" {
		skema = s
	}
	var nama, schema string
	if err := db.QueryRow("SELECT current_database(), coalesce(current_schema(), '')").Scan(&nama, &schema); err != nil {
		t.Fatal(err)
	}
	if nama != "lab" || schema != skema {
		t.Fatalf("%s/%s bukan database tes lab/%s: tidak ada data yang ditulis", nama, schema, skema)
	}
	l := &lingkungan{db: db, svc: service.Baru(repo.Baru(db), time.Hour), folder: t.TempDir()}
	l.akun = akunBaru(t, db)

	kini := time.Now()
	jam := func(n int) time.Time { return kini.Add(time.Duration(n) * time.Hour) }
	if l.ca, err = pki.BuatCA("CA tes ledger", jam(-1), jam(24)); err != nil {
		t.Fatal(err)
	}
	san := func(n string) []string { return []string{n + "." + identitas.DomainBawaan} }
	l.tulis(t, "ledger", pki.Pilihan{CN: "ledger", DNS: san("ledger"), IP: []net.IP{net.IPv4(127, 0, 0, 1)},
		EKU: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}, Mulai: jam(-1), Sampai: jam(24)})
	for _, n := range []string{"pembayaran", "notifikasi"} {
		l.tulis(t, n, pki.Pilihan{CN: n, DNS: san(n), EKU: []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth}, Mulai: jam(-1), Sampai: jam(24)})
	}
	daftar := identitas.IzinNaskah
	if len(izin) > 0 {
		daftar = izin[0]
	}
	mux := rute(l.svc, rentan, daftar, identitas.DomainBawaan, false, nil, db.PingContext)
	l.server = httptest.NewUnstartedServer(mux)
	l.server.Config.ErrorLog = log.New(io.Discard, "", 0) // galat handshake dari klien yang sengaja ditolak
	if !rentan {
		sert, kunci := l.berkas("ledger")
		if l.server.TLS, err = identitas.ServerTLS(l.ca.PEM, sert, kunci); err != nil {
			t.Fatal(err)
		}
		l.server.StartTLS()
	} else {
		l.server.Start()
	}
	t.Cleanup(l.server.Close)
	l.alamat = strings.TrimPrefix(strings.TrimPrefix(l.server.URL, "https://"), "http://")
	return l
}

func (l *lingkungan) tulis(t *testing.T, nama string, p pki.Pilihan) {
	t.Helper()
	s, k, err := l.ca.Terbitkan(p)
	if err != nil {
		t.Fatal(err)
	}
	if err := pki.Tulis(l.folder, nama, s, k); err != nil {
		t.Fatal(err)
	}
}

func (l *lingkungan) berkas(nama string) (string, string) {
	return filepath.Join(l.folder, nama+".pem"), filepath.Join(l.folder, nama+".key")
}

func akunBaru(t *testing.T, db *sql.DB) int64 {
	t.Helper()
	var id int64
	if err := db.QueryRow(`SELECT greatest(coalesce(max(id), 0), 100000) + 1 FROM akun`).Scan(&id); err != nil {
		t.Fatal(err)
	}
	nomor := fmt.Sprintf("L%d", id)
	if _, err := db.Exec(`INSERT INTO akun (id, jenis, nama, email, password_hash, nomor_karyawan, tingkat)
		VALUES ($1, 'karyawan', $2, $3, '!', $4, 'terverifikasi')`, id, fmt.Sprintf("Tes %d", id), fmt.Sprintf("ledger%d@lestari.example", id), nomor); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO buku (akun_id, jenis, batas_harian) VALUES ($1, 'karyawan', 500000)`, id); err != nil {
		t.Fatal(err)
	}
	return id
}

func order() string {
	b := make([]byte, 8)
	rand.Read(b)
	return "TB-" + hex.EncodeToString(b)
}

// panggil: POST ke ledger sebagai service `nama` ("" = tanpa sertifikat). Mengembalikan status dan isi.
func (l *lingkungan) panggil(t *testing.T, nama, jalan, kunci, badan string) (int, string) {
	t.Helper()
	tr := &http.Transport{}
	skema := "http://"
	if l.server.TLS != nil {
		skema = "https://"
		var sert, key string
		if nama != "" {
			sert, key = l.berkas(nama)
		}
		cfg, err := identitas.KlienTLS(l.ca.PEM, sert, key, "ledger."+identitas.DomainBawaan)
		if err != nil {
			t.Fatal(err)
		}
		tr.TLSClientConfig = cfg
	}
	req, _ := http.NewRequest("POST", skema+l.alamat+jalan, bytes.NewReader([]byte(badan)))
	req.Header.Set("Idempotency-Key", kunci)
	res, err := klien.BaruDenganTransport(klien.BatasBawaan, tr).Do(req)
	if err != nil {
		t.Fatalf("%s %s: %v", nama, jalan, err)
	}
	defer res.Body.Close()
	isi, _ := io.ReadAll(res.Body)
	return res.StatusCode, strings.TrimSpace(string(isi))
}

func (l *lingkungan) jurnalUntuk(t *testing.T, ket string) (n int, jenis string) {
	t.Helper()
	err := l.db.QueryRow(`SELECT count(*), coalesce(min(jenis), '') FROM jurnal WHERE keterangan = $1`, ket).Scan(&n, &jenis)
	if err != nil {
		t.Fatal(err)
	}
	return
}

func badanTopup(o string, akun int64) string {
	return fmt.Sprintf(`{"order_id":%q,"akun_id":%d,"jumlah":200000}`, o, akun)
}

func TestPembayaranMembuatSatuJurnalTopupBankPerKey(t *testing.T) {
	l := siapkan(t, false)
	o := order()
	s, isi := l.panggil(t, "pembayaran", "/ledger/jurnal-topup", o, badanTopup(o, l.akun))
	if s != 201 || !strings.Contains(isi, `"ulang":false`) {
		t.Fatalf("pertama: %d %s", s, isi)
	}
	s2, isi2 := l.panggil(t, "pembayaran", "/ledger/jurnal-topup", o, badanTopup(o, l.akun))
	if s2 != 200 || !strings.Contains(isi2, `"ulang":true`) {
		t.Fatalf("kedua: %d %s", s2, isi2)
	}
	if n, jenis := l.jurnalUntuk(t, "Top-up bank "+o); n != 1 || jenis != JenisTopup {
		t.Errorf("jurnal untuk key: %d berjenis %q, ingin 1 berjenis %s", n, jenis, JenisTopup)
	}
}

func TestPembayaranMenahanDanaKartuDenganJenisKartuTahan(t *testing.T) {
	l := siapkan(t, false)
	o := order()
	if s, isi := l.panggil(t, "pembayaran", "/ledger/jurnal-topup", o, badanTopup(o, l.akun)); s != 201 {
		t.Fatalf("isi saldo: %d %s", s, isi)
	}
	id := "AUTH-" + order()
	s, isi := l.panggil(t, "pembayaran", "/ledger/kartu/tahan", id, fmt.Sprintf(`{"id_penerbit":%q,"akun_id":%d,"jumlah":50000}`, id, l.akun))
	if s != 201 {
		t.Fatalf("tahan: %d %s", s, isi)
	}
	var jenis string
	if err := l.db.QueryRow(`SELECT jenis FROM jurnal WHERE jenis = 'kartu_tahan' AND keterangan LIKE '%' || $1 || '%'`, id).Scan(&jenis); err != nil {
		t.Fatalf("jurnal kartu_tahan untuk %s: %v", id, err)
	}
}

func TestNotifikasiBersertifikatSahTidakMembuatJurnal(t *testing.T) {
	l := siapkan(t, false)
	o := order()
	s, isi := l.panggil(t, "notifikasi", "/ledger/jurnal-topup", o, badanTopup(o, l.akun))
	if s != 403 || !strings.Contains(isi, "jenis-tidak-diizinkan") {
		t.Fatalf("notifikasi: %d %s, ingin 403", s, isi)
	}
	if n, _ := l.jurnalUntuk(t, "Top-up bank "+o); n != 0 {
		t.Errorf("jurnal untuk key notifikasi: %d, ingin 0", n)
	}
}

func TestTanpaSertifikatDitolakSebelumHandlerDanTidakAdaJurnal(t *testing.T) {
	l := siapkan(t, false)
	o := order()
	cfg, err := identitas.KlienTLS(l.ca.PEM, "", "", "ledger."+identitas.DomainBawaan)
	if err != nil {
		t.Fatal(err)
	}
	if hasil := identitas.Sonde(l.alamat, cfg, 2*time.Second); hasil != "alert dari server: tls: certificate required" {
		t.Fatalf("tanpa sertifikat: %q", hasil)
	}
	if n, _ := l.jurnalUntuk(t, "Top-up bank "+o); n != 0 {
		t.Errorf("jurnal: %d", n)
	}
}

// Mode rentan M47: siapa pun yang sampai ke port membuat jurnal dengan key baru. Tes ini mengunci perilaku rentannya
// supaya rekaman lab tidak bisa berubah diam-diam; versi benar diuji di atas.
func TestModeRentanMenerimaPemanggilManaPunDenganKeyBaru(t *testing.T) {
	l := siapkan(t, true)
	o := order()
	s, isi := l.panggil(t, "", "/ledger/jurnal-topup", o, badanTopup(o, l.akun))
	if s != 201 {
		t.Fatalf("mode rentan: %d %s, ingin 201", s, isi)
	}
	if n, jenis := l.jurnalUntuk(t, "Top-up bank "+o); n != 1 || jenis != JenisTopup {
		t.Errorf("jurnal: %d berjenis %q", n, jenis)
	}
}

// Jenis jurnal di tabel naskah semuanya sah menurut constraint di database, dan dua jenis yang punya rute di ledger
// ini ada di tabel itu atas nama pembayaran.
func TestJenisDiTabelIzinAdaDiConstraintJurnal(t *testing.T) {
	l := siapkan(t, false)
	var def string
	if err := l.db.QueryRow(`SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'jurnal_jenis_check' AND conrelid = 'jurnal'::regclass`).Scan(&def); err != nil {
		t.Fatal(err)
	}
	for nama, jenis := range identitas.IzinNaskah {
		for _, j := range jenis {
			if !strings.Contains(def, "'"+j+"'") {
				t.Errorf("%s boleh jenis %q yang tidak ada di constraint jurnal: %s", nama, j, def)
			}
		}
	}
	for _, j := range []string{JenisTopup, JenisTahan} {
		if !identitas.IzinNaskah.Boleh("pembayaran", j) {
			t.Errorf("pembayaran harus boleh %s (rute ledger)", j)
		}
	}
}

// Izin per jenis berlaku per rute: identitas yang hanya boleh kartu_tahan tidak membuat topup_bank, dan sebaliknya.
// Jenis yang diperiksa rute sama dengan jenis yang ditulisnya ke tabel jurnal.
func TestIzinSatuJenisTidakMembukaRuteJenisLain(t *testing.T) {
	for _, k := range []struct {
		izin, boleh, ditolak   string
		jalanBoleh, jalanTolak string
	}{
		{"kartu_tahan", "kartu_tahan", "topup_bank", "/ledger/kartu/tahan", "/ledger/jurnal-topup"},
		{"topup_bank", "topup_bank", "kartu_tahan", "/ledger/jurnal-topup", "/ledger/kartu/tahan"},
	} {
		l := siapkan(t, false, identitas.Izin{"pembayaran": {k.izin}})
		o := order()
		// kartu_tahan butuh saldo: diisi lewat repo, bukan lewat rute ledger yang sedang diuji.
		if k.izin == "kartu_tahan" {
			isiSaldo(t, l, 100000)
		}
		badanBoleh := badanTopup(o, l.akun)
		if k.jalanBoleh == "/ledger/kartu/tahan" {
			badanBoleh = fmt.Sprintf(`{"id_penerbit":%q,"akun_id":%d,"jumlah":50000}`, o, l.akun)
		}
		if s, isi := l.panggil(t, "pembayaran", k.jalanBoleh, o, badanBoleh); s != 201 {
			t.Fatalf("izin %s di %s: %d %s", k.izin, k.jalanBoleh, s, isi)
		}
		var jenis string
		if err := l.db.QueryRow(`SELECT jenis FROM jurnal WHERE keterangan LIKE '%' || $1`, o).Scan(&jenis); err != nil || jenis != k.boleh {
			t.Errorf("jurnal dari %s berjenis %q (%v), ingin %s", k.jalanBoleh, jenis, err, k.boleh)
		}
		o2 := order()
		badanTolak := badanTopup(o2, l.akun)
		if k.jalanTolak == "/ledger/kartu/tahan" {
			badanTolak = fmt.Sprintf(`{"id_penerbit":%q,"akun_id":%d,"jumlah":50000}`, o2, l.akun)
		}
		if s, isi := l.panggil(t, "pembayaran", k.jalanTolak, o2, badanTolak); s != 403 || !strings.Contains(isi, `"jenis":"`+k.ditolak+`"`) {
			t.Errorf("izin %s di %s: %d %s, ingin 403 untuk jenis %s", k.izin, k.jalanTolak, s, isi, k.ditolak)
		}
		var n int
		l.db.QueryRow(`SELECT count(*) FROM jurnal WHERE keterangan LIKE '%' || $1`, o2).Scan(&n)
		if n != 0 {
			t.Errorf("jurnal untuk permintaan yang ditolak: %d", n)
		}
	}
}

// isiSaldo: satu jurnal topup dari buku tunjangan ke akun lab.
func isiSaldo(t *testing.T, l *lingkungan, n int64) {
	t.Helper()
	err := repo.Baru(l.db).DalamTx(t.Context(), func(tx repo.Tx) error {
		tj, err := tx.BukuSistem(t.Context(), "tunjangan")
		if err != nil {
			return err
		}
		b, err := tx.KunciBukuAkun(t.Context(), l.akun)
		if err != nil {
			return err
		}
		_, err = tx.CatatJurnal(t.Context(), "topup", "isi saldo tes", 1, nil, []repo.Posting{{BukuID: tj, Jumlah: -n}, {BukuID: b[l.akun].ID, Jumlah: n}})
		return err
	})
	if err != nil {
		t.Fatal(err)
	}
}
