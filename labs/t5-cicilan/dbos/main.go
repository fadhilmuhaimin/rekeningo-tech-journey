// Pembanding lab t5-cicilan: kasus yang sama dengan job tabel langkah di labs/api-t5 (angsuran jatuh tempo ditagih,
// jurnal ditulis di ledger, angsuran ditandai selesai), dikerjakan sebagai workflow DBOS Go. Ledger tetap tabel yang
// sama; satu-satunya yang berganti adalah cara pekerjaan panjang itu diingat dan dilanjutkan sesudah proses mati.
//
// Tiga varian untuk langkah jurnal:
//
//	step             RunAsStep, jurnal tanpa referensi: langkah dicatat DBOS sesudah fungsinya kembali (at-least-once)
//	step-referensi   RunAsStep, jurnal dengan referensi unik angsuran:<jadwal>:<ke> (penulis ledger idempoten)
//	transaksi        RunAsTransaction: jurnal dan catatan selesainya satu transaction di database aplikasi
//
// -mati menyuntik SIGKILL ke proses ini sendiri di satu titik (hanya untuk lab):
//
//	dalam-langkah    di dalam langkah jurnal, sesudah ledger ditulis (varian step) atau sebelum commit (varian transaksi)
//	antar-langkah    di workflow, sesudah langkah jurnal dicatat DBOS dan sebelum langkah penanda
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/dbos-inc/dbos-transact-golang/dbos"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Angsuran adalah satu angsuran jatuh tempo; masukan workflow.
type Angsuran struct {
	Jadwal   int64
	Ke       int
	Akun     int64
	Merchant int64
	Jumlah   int64
}

func (a Angsuran) id() string { return fmt.Sprintf("angsuran:%d:%d", a.Jadwal, a.Ke) }

type setelan struct {
	varian string
	mati   string
	pool   *pgxpool.Pool
	ds     *dbos.DataSource
}

var s setelan

type baris interface{ Scan(dest ...any) error }

// mati mengirim SIGKILL ke proses ini bila titik yang diminta sama: tanpa defer dan tanpa keluaran.
func mati(titik string) {
	if s.mati == titik {
		_ = syscall.Kill(syscall.Getpid(), syscall.SIGKILL)
		time.Sleep(time.Hour) // tidak tercapai: sinyal 9 tidak bisa ditangkap
	}
}

// tulisJurnal memanggil penulis ledger di database (fungsi SQL milik lab ini): kunci buku, cek saldo, jurnal, dua
// posting. Referensi nil berarti jurnal tanpa referensi.
func tulisJurnal(ctx context.Context, tanya func(context.Context, string, ...any) baris, a Angsuran, referensi *string) (int64, error) {
	var id int64
	err := tanya(ctx, `SELECT tulis_jurnal_angsuran($1, $2, $3, $4, $5)`,
		a.Akun, a.Merchant, a.Jumlah, referensi, fmt.Sprintf("Angsuran ke-%d jadwal %d", a.Ke, a.Jadwal)).Scan(&id)
	return id, err
}

func saldoKurang(err error) bool { return err != nil && strings.Contains(err.Error(), "saldo kurang") }

// --8<-- [start:dbos-bersama]
// langkah penutup dan kompensasi saldo kurang dipakai kedua varian alur.
func tandai(ctx dbos.Context, a Angsuran, jurnal int64) (int64, error) {
	return dbos.RunAsStep(ctx, func(c context.Context) (int64, error) {
		_, err := s.pool.Exec(c, `UPDATE angsuran SET status = 'dicatat', jurnal_id = $3
			WHERE jadwal_id = $1 AND ke = $2 AND status IN ('menunggu', 'terjurnal')`, a.Jadwal, a.Ke, jurnal)
		return jurnal, err
	}, dbos.WithStepName("tandai"))
}

func tandaiGagal(ctx dbos.Context, a Angsuran) (int64, error) {
	return dbos.RunAsStep(ctx, func(c context.Context) (int64, error) {
		_, err := s.pool.Exec(c, `UPDATE angsuran SET status = 'gagal' WHERE jadwal_id = $1 AND ke = $2 AND status = 'menunggu'`, a.Jadwal, a.Ke)
		return 0, err
	}, dbos.WithStepName("gagal"))
}

// --8<-- [end:dbos-bersama]

// --8<-- [start:dbos-alur-step]
func tagihStep(ctx dbos.Context, a Angsuran) (int64, error) {
	jurnal, err := dbos.RunAsStep(ctx, func(c context.Context) (int64, error) {
		var ref *string
		if s.varian == "step-referensi" {
			r := a.id()
			ref = &r
		}
		id, err := tulisJurnal(c, func(c context.Context, q string, p ...any) baris { return s.pool.QueryRow(c, q, p...) }, a, ref)
		if err == nil { // lab
			mati("dalam-langkah") // lab
		} // lab
		return id, err
	}, dbos.WithStepName("jurnal"))
	if saldoKurang(err) {
		return tandaiGagal(ctx, a)
	}
	if err != nil {
		return 0, err
	}
	mati("antar-langkah") // lab
	return tandai(ctx, a, jurnal)
}

// --8<-- [end:dbos-alur-step]

// --8<-- [start:dbos-alur-transaksi]
func tagihTransaksi(ctx dbos.Context, a Angsuran) (int64, error) {
	jurnal, err := dbos.RunAsTransaction(ctx, s.ds, func(c context.Context, tx dbos.Tx) (int64, error) {
		id, err := tulisJurnal(c, func(c context.Context, q string, p ...any) baris { return tx.QueryRow(c, q, p...) }, a, nil)
		if err == nil { // lab
			mati("dalam-langkah") // lab
		} // lab
		return id, err
	}, dbos.WithStepName("jurnal"))
	if saldoKurang(err) {
		return tandaiGagal(ctx, a)
	}
	if err != nil {
		return 0, err
	}
	mati("antar-langkah") // lab
	return tandai(ctx, a, jurnal)
}

// --8<-- [end:dbos-alur-transaksi]

// --8<-- [start:dbos-batch]
func jalankan(ctx dbos.Context, daftar []Angsuran) (dicatat, gagal int, err error) {
	alur := tagihStep
	if s.varian == "transaksi" {
		alur = tagihTransaksi
	}
	var wg sync.WaitGroup
	var mu sync.Mutex
	for _, a := range daftar {
		h, e := dbos.RunWorkflow(ctx, alur, a, dbos.WithWorkflowID(a.id()))
		if e != nil {
			return 0, 0, e
		}
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, e := h.GetResult()
			mu.Lock()
			defer mu.Unlock()
			if e != nil {
				gagal++
			} else {
				dicatat++
			}
		}()
	}
	wg.Wait()
	return dicatat, gagal, nil
}

// --8<-- [end:dbos-batch]

func jatuhTempo(ctx context.Context, sampai string) ([]Angsuran, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT a.jadwal_id, a.ke, j.akun_id, j.merchant_akun_id, j.jumlah_per_angsuran
		FROM angsuran a JOIN jadwal_cicilan j ON j.id = a.jadwal_id
		WHERE a.status IN ('menunggu', 'terjurnal') AND a.jatuh_tempo <= $1::date AND j.status = 'aktif' AND j.jenis = 'cicilan'
		ORDER BY a.jadwal_id, a.ke`, sampai)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var hasil []Angsuran
	for rows.Next() {
		var a Angsuran
		if err := rows.Scan(&a.Jadwal, &a.Ke, &a.Akun, &a.Merchant, &a.Jumlah); err != nil {
			return nil, err
		}
		hasil = append(hasil, a)
	}
	return hasil, rows.Err()
}

func main() {
	dbApp := flag.String("db-app", "", "URL database aplikasi (role api_t5, search_path ke schema lab)")
	dbSistem := flag.String("db-sistem", "", "URL database sistem DBOS (role api_t5, tanpa search_path)")
	skema := flag.String("dbos-schema", "", "schema tabel sistem DBOS dan transaction_completion (dibuat pemilik sebelum proses ini jalan)")
	sampai := flag.String("sampai", "", "tagih angsuran jatuh tempo sampai tanggal YYYY-MM-DD")
	flag.StringVar(&s.varian, "varian", "step", "step | step-referensi | transaksi")
	flag.StringVar(&s.mati, "mati", "", "lab saja: dalam-langkah | antar-langkah (SIGKILL ke proses ini sendiri)")
	flag.Parse()
	if *dbApp == "" || *dbSistem == "" || *skema == "" || *sampai == "" {
		log.Fatal("butuh -db-app, -db-sistem, -dbos-schema, dan -sampai")
	}
	switch s.varian {
	case "step", "step-referensi", "transaksi":
	default:
		log.Fatalf("varian tidak dikenal: %s", s.varian)
	}
	bg := context.Background()
	var err error
	if s.pool, err = pgxpool.New(bg, *dbApp); err != nil {
		log.Fatal(err)
	}
	defer s.pool.Close()
	dctx, err := dbos.NewContext(bg, dbos.Config{AppName: "cicilan-lab", DatabaseURL: *dbSistem, DatabaseSchema: *skema, ApplicationVersion: "lab"})
	if err != nil {
		log.Fatal(err)
	}
	if s.ds, err = dbos.NewDataSource(dctx, s.pool, dbos.WithDataSourceName("ledger"), dbos.WithDataSourceSchema(*skema)); err != nil {
		log.Fatal(err)
	}
	dbos.RegisterWorkflow(dctx, tagihStep)
	dbos.RegisterWorkflow(dctx, tagihTransaksi)
	if err := dbos.Launch(dctx); err != nil { // Launch melanjutkan workflow PENDING milik executor ini
		log.Fatal(err)
	}
	daftar, err := jatuhTempo(bg, *sampai)
	if err != nil {
		log.Fatal(err)
	}
	dicatat, gagal, err := jalankan(dctx, daftar)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("dbos %s sampai %s: dibaca %d, dicatat %d, gagal %d\n", s.varian, *sampai, len(daftar), dicatat, gagal)
	if err := dbos.Shutdown(dctx, 10*time.Second); err != nil {
		log.Print(err)
	}
	os.Exit(0)
}
