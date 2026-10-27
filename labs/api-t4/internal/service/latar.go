package service

import (
	"context"
	"fmt"
	"log"
	"runtime/debug"
	"slices"
	"time"

	"lab/apit4/internal/repo"
)

// Mode rentan M21 (flag -rentan ekspor-panic): pekerjaan di goroutine latar tidak dijaga, dan ringkasan ekspor
// mengira laporan tidak pernah kosong. Panic di goroutine itu tidak ditangkap net/http (hanya goroutine handler
// yang ditangkap), jadi satu laporan kosong mematikan seluruh proses.
const RentanEksporPanic = "ekspor-panic"

// DenganMode menyalakan mode rentan yang tidak butuh client push (RentanEksporPanic).
func (s Service) DenganMode(mode string) Service { s.rentan = mode; return s }

// --8<-- [start:latar]
// Latar menjalankan pekerjaan yang tidak ditunggu request di goroutine sendiri. Panic di goroutine ini tidak
// ditangkap net/http: dokumentasi http.Handler menulis bahwa server memulihkan panic dari ServeHTTP, tetapi tidak
// menyebut goroutine yang dibuka handler. Panic yang tidak ditangkap di goroutine mana pun menghentikan seluruh
// program (spesifikasi Go, "Handling panics"). Versi benar menangkap di sini, mencatat, dan membiarkan proses
// hidup; mode rentan membuang pelindungnya.
func (s Service) Latar(nama string, f func()) {
	go func() {
		if s.rentan != RentanEksporPanic {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("latar %s panik: %v (proses tetap hidup)\n%s", nama, r, debug.Stack())
				}
			}()
		}
		f()
	}()
}

// --8<-- [end:latar]

// JedaAudit: waktu tulis catatan audit (tiruan, bukan kerja nyata). Urutan "CSV sudah terkirim, lalu proses mati"
// jadi tetap; tanpa jeda, panic bisa mendahului respons dan proxy mengulang GET yang sama ke instance lain.
const JedaAudit = 50 * time.Millisecond

// --8<-- [start:ekspor]
// LaporanEkspor: laporan untuk dasbor (GET /warung/{id}/laporan.csv). Selain mengembalikan barisnya, ia mencatat
// ringkasan ekspor untuk audit di latar, supaya respons CSV tidak menunggu pencatatan.
func (s Service) LaporanEkspor(ctx context.Context, peminta, warung int64, dari, sampai string) ([]repo.BarisLaporan, error) {
	baris, err := s.Laporan(ctx, peminta, warung, dari, sampai)
	if err != nil {
		return nil, err
	}
	salinan := slices.Clone(baris)
	ringkas := ringkasanEkspor
	if s.rentan == RentanEksporPanic {
		ringkas = ringkasanEksporRentan
	}
	s.Latar("ekspor", func() {
		time.Sleep(JedaAudit)
		log.Print(ringkas(warung, salinan))
	})
	return baris, nil
}

// ringkasanEkspor: satu baris catatan audit. Laporan kosong (warung yang belum menerima pembayaran di rentang itu)
// adalah keadaan biasa, bukan kesalahan.
func ringkasanEkspor(warung int64, baris []repo.BarisLaporan) string {
	if len(baris) == 0 {
		return fmt.Sprintf("ekspor warung %d: laporan kosong", warung)
	}
	return ringkasanTersibuk(warung, baris)
}

// ringkasanEksporRentan adalah versi pertama minggu 1: "laporan pasti punya minimal satu hari".
func ringkasanEksporRentan(warung int64, baris []repo.BarisLaporan) string {
	return ringkasanTersibuk(warung, baris)
}

func ringkasanTersibuk(warung int64, baris []repo.BarisLaporan) string {
	tersibuk := baris[0] // panic "index out of range [0] with length 0" bila baris kosong
	for _, b := range baris[1:] {
		if b.Transaksi > tersibuk.Transaksi {
			tersibuk = b
		}
	}
	return fmt.Sprintf("ekspor warung %d: %d hari, tersibuk %s dengan %d transaksi", warung, len(baris), tersibuk.Tanggal, tersibuk.Transaksi)
}

// --8<-- [end:ekspor]
