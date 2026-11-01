package handler

import (
	"context"
	"database/sql"
	"fmt"
	"net/http/httptest"
	"os"
	"regexp"
	"testing"
	"time"

	"lab/apit5/internal/objek"
	"lab/apit5/internal/repo"
	"lab/apit5/internal/service"
)

// Tes HTTP lab t5-replika (ADR 47) dengan PostgreSQL sungguhan: kepala X-Lsn-Tulis pada bayar dan kirim, kepala
// X-Dibaca-Dari pada saldo tampil dan riwayat, dan jawaban yang tidak berubah tanpa replica. "Replica" di sini adalah
// primary yang sama dengan jawaban SampaiLSN yang diatur tes; perilaku replica sungguhan direkam lab t5-replika.

type replikaTes struct {
	repo.Repo
	sampai bool
}

func (r replikaTes) SampaiLSN(context.Context, string) (bool, error) { return r.sampai, nil }

// serverReplikaTes: sampai nil berarti server tanpa replica; selain itu replica yang menjawab SampaiLSN = *sampai.
func serverReplikaTes(t *testing.T, sampai *bool) (*httptest.Server, *sql.DB) {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		if os.Getenv("TES_DB_WAJIB") == "1" {
			t.Fatal("TES_DB_WAJIB=1 tetapi TEST_DATABASE_URL kosong")
		}
		t.Skip("TEST_DATABASE_URL kosong: tes ini butuh PostgreSQL")
	}
	db, err := sql.Open("pgx", url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	var nama, schema string
	db.QueryRow("SELECT current_database(), coalesce(current_schema(), '')").Scan(&nama, &schema)
	if nama != "lab" || schema != schemaTes() {
		t.Fatalf("%s/%s bukan database tes lab/%s", nama, schema, schemaTes())
	}
	dep := service.Dep{RahasiaWebhook: []string{rahasiaHTTP}, Objek: objek.Dir{Akar: t.TempDir()}, TanpaLapis: map[string]bool{}}
	svc := service.Baru(repo.Baru(db), time.Hour).DenganT4(dep)
	if sampai != nil {
		svc = svc.DenganReplika(replikaTes{Repo: repo.Baru(db), sampai: *sampai})
	}
	srv := httptest.NewServer(Baru(svc).Rute())
	t.Cleanup(srv.Close)
	return srv, db
}

// pemakaiReplika: karyawan terverifikasi dengan saldo, satu warung, dan satu rekan dengan nomor karyawan.
type pemakaiReplika struct {
	token, nomorRekan string
	idSaya, idWarung  int64
}

// karyawanReplika: karyawan terverifikasi bernomor karyawan (aturan karyawan_bernomor), dengan buku dan saldo dari jurnal topup.
func karyawanReplika(t *testing.T, db *sql.DB, saldo int64) (id int64, email, nomor string) {
	t.Helper()
	db.QueryRow(`SELECT greatest(coalesce(max(id), 0), 100000) + 1 FROM akun`).Scan(&id)
	email, nomor = fmt.Sprintf("rep%d@lestari.example", id), fmt.Sprintf("TR%d", id)
	if _, err := db.Exec(`INSERT INTO akun (id, jenis, nama, email, password_hash, nomor_karyawan, tingkat)
		VALUES ($1, 'karyawan', $2, $3, $4, $5, 'terverifikasi')`, id, fmt.Sprintf("Tes %d", id), email, hashSandi(t), nomor); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO buku (akun_id, jenis) VALUES ($1, 'karyawan')`, id); err != nil {
		t.Fatal(err)
	}
	if saldo > 0 {
		err := repo.Baru(db).DalamTx(t.Context(), func(tx repo.Tx) error {
			tj, _ := tx.BukuSistem(t.Context(), "tunjangan")
			b, _ := tx.KunciBukuAkun(t.Context(), id)
			_, err := tx.CatatJurnal(t.Context(), "topup", "isi saldo tes", 1, nil,
				[]repo.Posting{{BukuID: tj, Jumlah: -saldo}, {BukuID: b[id].ID, Jumlah: saldo}})
			return err
		})
		if err != nil {
			t.Fatal(err)
		}
	}
	return id, email, nomor
}

func siapkanPemakaiReplika(t *testing.T, srv *httptest.Server, db *sql.DB) pemakaiReplika {
	t.Helper()
	idSaya, email, _ := karyawanReplika(t, db, 100_000)
	idWarung, _ := akunDB(t, db, "warung", "terverifikasi", 0)
	_, _, nomorRekan := karyawanReplika(t, db, 0)
	return pemakaiReplika{token: masuk(t, srv, email), nomorRekan: nomorRekan, idSaya: idSaya, idWarung: idWarung}
}

func (p pemakaiReplika) tulis(t *testing.T, srv *httptest.Server, aksi string) (int, string) {
	t.Helper()
	path, badan := "/transfers", any(map[string]any{"ke": p.idWarung, "nominal": 1000})
	if aksi == "kirim" {
		path, badan = "/kiriman", map[string]any{"ke_nomor_karyawan": p.nomorRekan, "nominal": 1000}
	}
	code, kep, isi := kirimReq(t, srv, "POST", path, p.token, badan)
	if code != 201 {
		t.Fatalf("%s: %d %s", aksi, code, isi)
	}
	return code, kep.Get(KepalaLSNTulis)
}

var polaTokenTes = regexp.MustCompile(`^[0-9A-F]+/[0-9A-F]+$`)

// Bayar dan kirim sama-sama memberi token tulis; replica yang belum sampai membuat saldo tampil dan riwayat dibaca dari
// primary, bacaan tanpa token dari replica, dan token yang bukan posisi WAL dijawab 422 tanpa menyentuh sumber bacaan.
func TestBayarDanKirimMemberiTokenTulisDenganReplica(t *testing.T) {
	belum := false
	srv, db := serverReplikaTes(t, &belum)
	p := siapkanPemakaiReplika(t, srv, db)
	saldoTampil, riwayat := fmt.Sprintf("/akun/%d", p.idSaya), fmt.Sprintf("/akun/%d/riwayat", p.idSaya)
	for _, aksi := range []string{"bayar", "kirim"} {
		_, token := p.tulis(t, srv, aksi)
		if !polaTokenTes.MatchString(token) {
			t.Fatalf("%s: %s %q bukan posisi WAL", aksi, KepalaLSNTulis, token)
		}
		for _, path := range []string{saldoTampil, riwayat} {
			code, kep, isi := kirimReq(t, srv, "GET", path, p.token, nil, KepalaLSNTulis, token)
			if code != 200 || kep.Get(KepalaDibacaDari) != "primary" {
				t.Errorf("%s %s dengan token: %d dari %q, harus 200 dari primary: %s", aksi, path, code, kep.Get(KepalaDibacaDari), isi)
			}
		}
	}
	for _, path := range []string{saldoTampil, riwayat} {
		code, kep, _ := kirimReq(t, srv, "GET", path, p.token, nil)
		if code != 200 || kep.Get(KepalaDibacaDari) != "replika" {
			t.Errorf("%s tanpa token: %d dari %q, harus 200 dari replika", path, code, kep.Get(KepalaDibacaDari))
		}
		// Token terbesar yang sah tetap posisi WAL: replica belum sampai, jadi primary (bukan 422 dan bukan replica).
		code, kep, _ = kirimReq(t, srv, "GET", path, p.token, nil, KepalaLSNTulis, "FFFFFFFF/FFFFFFFF")
		if code != 200 || kep.Get(KepalaDibacaDari) != "primary" {
			t.Errorf("%s dengan token terbesar: %d dari %q, harus 200 dari primary", path, code, kep.Get(KepalaDibacaDari))
		}
		for _, salah := range []string{"bukan-posisi-wal", "0/ZZ", "123456789/0", "0/123456789"} {
			code, kep, isi := kirimReq(t, srv, "GET", path, p.token, nil, KepalaLSNTulis, salah)
			if code != 422 || tipe(isi) != "/problems/validasi" || kep.Get(KepalaDibacaDari) != "" {
				t.Errorf("%s token %q: %d dari %q, harus 422 validasi tanpa sumber: %s", path, salah, code, kep.Get(KepalaDibacaDari), isi)
			}
		}
	}
}

// Replica yang sudah sampai posisi token dipakai lagi, dan akun lain tidak bisa membaca akun ini lewat jalur baru.
func TestReplikaYangSudahSampaiDipakaiLagiDanHanyaPemilik(t *testing.T) {
	sampai := true
	srv, db := serverReplikaTes(t, &sampai)
	p := siapkanPemakaiReplika(t, srv, db)
	_, token := p.tulis(t, srv, "bayar")
	for _, path := range []string{fmt.Sprintf("/akun/%d", p.idSaya), fmt.Sprintf("/akun/%d/riwayat", p.idSaya)} {
		code, kep, _ := kirimReq(t, srv, "GET", path, p.token, nil, KepalaLSNTulis, token)
		if code != 200 || kep.Get(KepalaDibacaDari) != "replika" {
			t.Errorf("%s: %d dari %q, harus 200 dari replika sesudah replica sampai", path, code, kep.Get(KepalaDibacaDari))
		}
	}
	_, lain, _ := karyawanReplika(t, db, 0)
	tokLain := masuk(t, srv, lain)
	for _, path := range []string{fmt.Sprintf("/akun/%d", p.idSaya), fmt.Sprintf("/akun/%d/riwayat", p.idSaya)} {
		code, kep, _ := kirimReq(t, srv, "GET", path, tokLain, nil, KepalaLSNTulis, token)
		if code != 404 || kep.Get(KepalaDibacaDari) != "" {
			t.Errorf("%s oleh akun lain: %d dari %q, harus 404 tanpa sumber", path, code, kep.Get(KepalaDibacaDari))
		}
	}
}

// Tanpa replica jawaban api-t5 tidak berubah: tidak ada kepala baru di jawaban tulis atau bacaan, dan token di
// kepala permintaan diabaikan, bahkan yang bukan posisi WAL.
func TestTanpaReplicaTidakAdaKepalaBaru(t *testing.T) {
	srv, db := serverReplikaTes(t, nil)
	p := siapkanPemakaiReplika(t, srv, db)
	for _, aksi := range []string{"bayar", "kirim"} {
		if _, token := p.tulis(t, srv, aksi); token != "" {
			t.Errorf("%s tanpa replica memuat %s %q", aksi, KepalaLSNTulis, token)
		}
	}
	for _, path := range []string{fmt.Sprintf("/akun/%d", p.idSaya), fmt.Sprintf("/akun/%d/riwayat", p.idSaya)} {
		code, kep, _ := kirimReq(t, srv, "GET", path, p.token, nil, KepalaLSNTulis, "bukan-posisi-wal")
		if code != 200 || kep.Get(KepalaDibacaDari) != "" {
			t.Errorf("%s tanpa replica: %d dengan %s %q, harus 200 tanpa kepala sumber", path, code, KepalaDibacaDari, kep.Get(KepalaDibacaDari))
		}
	}
}
