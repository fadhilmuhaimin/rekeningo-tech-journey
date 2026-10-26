// Package worker mengirim pemberitahuan dari tabel outbox (ADR 23, 24, 25). Worker berjalan di proses sendiri
// (`api-t4 -peran worker`), bukan di dalam request: pembayaran selesai dalam milidetik walau layanan push lambat.
package worker

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/rand/v2"
	"os"
	"sort"
	"sync"
	"time"

	"lab/apit4/internal/push"
	"lab/apit4/internal/repo"
	"lab/apit4/internal/verifikasi"
)

// Konfigurasi worker. Dari naskah: c = 4 pengirim serentak dan 5 percobaan. Asumsi lab, belum di naskah: klaim 5 detik
// dan backoff dasar 2 detik. Perangkat satu akun dikirimi bergiliran, jadi dua perangkat yang sama-sama menggantung
// memakan 2 x 3 detik (batas push), lebih lama dari klaim 5 detik: worker lain boleh mengklaim baris itu lagi.
type Konfigurasi struct {
	Serentak      int           // pengirim serentak (c); kapasitas = c ÷ t
	Klaim         time.Duration // lama satu baris dipegang (ADR 24)
	Selang        time.Duration // jeda polling bila antrean kosong
	MaksPercobaan int           // sesudah ini baris masuk dead-letter (ADR 25)
	DasarBackoff  time.Duration // tunggu sesudah percobaan pertama, lalu dua kali lipat
	MaksBackoff   time.Duration
	UrutKelas     bool     // false = menurut nomor saja (mode rentan urut-waktu, M27)
	Tujuan        []string // lajur yang diklaim worker ini (push, verifikasi); kosong = semua lajur (ADR 36)
	Kursor        bool     // true = poller kursor (dibuat, id) tanpa klaim (mode rentan kursor, M19)
	// HentiSebelumTandai: lab saja. Proses berhenti mendadak sesudah push berhasil dan sebelum baris ditandai
	// terkirim, supaya klaim habis dan pengiriman ulang (M20) bisa direkam tanpa mengandalkan waktu mematikan proses.
	HentiSebelumTandai bool
}

// Bawaan adalah konfigurasi yang dipakai api-t4 bila flag tidak diisi.
func Bawaan() Konfigurasi {
	return Konfigurasi{Serentak: 4, Klaim: 5 * time.Second, Selang: 200 * time.Millisecond, MaksPercobaan: 5,
		DasarBackoff: 2 * time.Second, MaksBackoff: 60 * time.Second, UrutKelas: true}
}

type Worker struct {
	repo  repo.Repo
	push  push.Klien
	cfg   Konfigurasi
	acak  func() float64    // [0,1); diganti di tes
	verif *verifikasi.Klien // layanan verifikasi tiruan; nil = pekerjaan verifikasi ditunda lagi
	kini  func() time.Time

	kursorDibuat time.Time
	kursorID     int64
}

func Baru(r repo.Repo, p push.Klien, cfg Konfigurasi) *Worker {
	return &Worker{repo: r, push: p, cfg: cfg, acak: rand.Float64, kini: time.Now}
}

// DenganVerifikasi memasang client layanan verifikasi untuk pekerjaan bertujuan verifikasi.
func (w *Worker) DenganVerifikasi(k *verifikasi.Klien) *Worker { w.verif = k; return w }

// --8<-- [start:backoff]
// Backoff: tunggu sebelum percobaan berikutnya = acak antara 0 dan min(maks, dasar × 2^(percobaan-1))
// (full jitter). Jitter mencegah ratusan baris yang gagal bersamaan mencoba lagi pada detik yang sama.
func Backoff(percobaan int, dasar, maks time.Duration, acak float64) time.Duration {
	batas := dasar
	for i := 1; i < percobaan && batas < maks; i++ {
		batas *= 2
	}
	batas = min(batas, maks)
	return time.Duration(acak * float64(batas))
}

// --8<-- [end:backoff]

// Ringkasan hasil satu putaran, untuk log dan rekaman.
type Ringkasan struct{ Diklaim, Terkirim, Dilewati, Ditunda, Mati int }

func (a *Ringkasan) tambah(b Ringkasan) {
	a.Diklaim += b.Diklaim
	a.Terkirim += b.Terkirim
	a.Dilewati += b.Dilewati
	a.Ditunda += b.Ditunda
	a.Mati += b.Mati
}

// Putaran mengambil sampai Serentak baris, mengirimnya serentak, dan mencatat hasilnya.
func (w *Worker) Putaran(ctx context.Context) (Ringkasan, error) {
	var baris []repo.Notifikasi
	var err error
	if w.cfg.Kursor {
		baris, err = w.repo.BacaKursor(ctx, w.kursorDibuat, w.kursorID, w.cfg.Serentak)
		if len(baris) > 0 { // kursor maju ke baris terakhir yang dibaca, apa pun hasil pengirimannya
			akhir := baris[len(baris)-1]
			w.kursorDibuat, w.kursorID = akhir.Dibuat, akhir.ID
		}
	} else {
		baris, err = w.repo.KlaimOutboxTujuan(ctx, w.cfg.Serentak, w.cfg.Klaim, w.cfg.UrutKelas, w.cfg.Tujuan)
		sort.Slice(baris, func(i, j int) bool {
			if w.cfg.UrutKelas && baris[i].Kelas != baris[j].Kelas {
				return baris[i].Kelas < baris[j].Kelas
			}
			return baris[i].ID < baris[j].ID
		})
	}
	if err != nil {
		return Ringkasan{}, err
	}
	hasil := make([]string, len(baris))
	var wg sync.WaitGroup
	for i, n := range baris {
		wg.Add(1)
		go func() {
			defer wg.Done()
			hasil[i] = w.kirimSatu(ctx, n)
		}()
	}
	wg.Wait()
	r := Ringkasan{Diklaim: len(baris)}
	for _, h := range hasil {
		switch h {
		case "terkirim":
			r.Terkirim++
		case "dilewati":
			r.Dilewati++
		case "ditunda":
			r.Ditunda++
		case "mati":
			r.Mati++
		}
	}
	return r, nil
}

// --8<-- [start:kirim-satu]
// kirimSatu mengirim satu notifikasi ke semua perangkat aktif akun penerima, lalu menentukan nasib barisnya:
// terkirim (semua jalan), dilewati (tidak ada perangkat aktif), ditunda dengan backoff (gagal sementara), atau
// mati (percobaan habis). Token yang ditolak layanan push dinonaktifkan dan tidak membuat baris diulang.
func (w *Worker) kirimSatu(ctx context.Context, n repo.Notifikasi) string {
	if n.Tujuan == "verifikasi" {
		return w.kirimVerifikasi(ctx, n)
	}
	// Klaim menaikkan percobaan sebelum mengirim. Worker yang mati di tengah kirim membuat baris diklaim lagi dengan
	// percobaan lebih besar; sesudah batas, baris itu masuk dead-letter tanpa dikirim, bukan diulang tanpa akhir.
	if n.Percobaan > w.cfg.MaksPercobaan {
		if err := w.repo.TundaOutbox(ctx, n.ID, 0, true); err != nil {
			log.Printf("outbox %d: dead-letter: %v", n.ID, err)
		}
		log.Printf("outbox %d: %d kali diklaim tanpa pernah selesai, masuk dead-letter", n.ID, n.Percobaan-1)
		return "mati"
	}
	var isi struct{ Judul, Isi string }
	_ = json.Unmarshal(n.Payload, &isi)
	perangkat, err := w.repo.PerangkatAktif(ctx, n.AkunID)
	if err != nil {
		log.Printf("outbox %d: baca perangkat: %v", n.ID, err)
		return w.tunda(ctx, n)
	}
	ok := 0
	var sementara error
	for _, p := range perangkat {
		switch err := w.push.Kirim(ctx, p.Token, n.NotifikasiID, isi.Judul, isi.Isi); {
		case err == nil:
			ok++
		case errors.Is(err, push.ErrTidakTerdaftar):
			if e := w.repo.NonaktifkanPerangkat(ctx, p.ID); e != nil {
				log.Printf("outbox %d: nonaktifkan perangkat %d: %v", n.ID, p.ID, e)
			}
		default:
			sementara = err
		}
	}
	if sementara != nil {
		log.Printf("outbox %d percobaan %d: %v", n.ID, n.Percobaan, sementara)
		return w.tunda(ctx, n)
	}
	if ok > 0 && w.cfg.HentiSebelumTandai {
		log.Printf("outbox %d: dihentikan sebelum ditandai terkirim (lab)", n.ID)
		os.Exit(3)
	}
	status := "terkirim"
	if ok == 0 {
		status = "dilewati"
	}
	if err := w.repo.SelesaiOutbox(ctx, n.ID, status); err != nil {
		log.Printf("outbox %d: tandai %s: %v", n.ID, status, err)
		return "ditunda" // klaim habis sendiri; baris dikirim ulang, penerima menyaring notifikasi_id
	}
	return status
}

// --8<-- [end:kirim-satu]

func (w *Worker) tunda(ctx context.Context, n repo.Notifikasi) string {
	mati := n.Percobaan >= w.cfg.MaksPercobaan
	tunggu := Backoff(n.Percobaan, w.cfg.DasarBackoff, w.cfg.MaksBackoff, w.acak())
	if err := w.repo.TundaOutbox(ctx, n.ID, tunggu, mati); err != nil {
		log.Printf("outbox %d: tunda: %v", n.ID, err)
	}
	if mati {
		return "mati"
	}
	return "ditunda"
}

// Kuras menjalankan putaran sampai antrean yang siap dikirim habis, lalu berhenti (`-sekali`). Baris yang
// ditunda backoff belum siap dan tidak ditunggu.
func (w *Worker) Kuras(ctx context.Context) (Ringkasan, error) {
	var total Ringkasan
	for {
		r, err := w.Putaran(ctx)
		total.tambah(r)
		if err != nil || r.Diklaim == 0 {
			return total, err
		}
	}
}

// Jalankan berputar sampai ctx dibatalkan (SIGTERM). Putaran yang sedang berjalan selesai dulu, jadi deploy
// tidak memotong pengiriman di tengah.
func (w *Worker) Jalankan(ctx context.Context) error {
	for ctx.Err() == nil {
		r, err := w.Putaran(context.WithoutCancel(ctx))
		switch {
		case err != nil:
			log.Printf("worker: %v", err)
			sleep(ctx, w.cfg.Selang)
		case r.Diklaim == 0:
			sleep(ctx, w.cfg.Selang)
		default:
			log.Print(fmt.Sprintf("worker: diklaim %d, terkirim %d, dilewati %d, ditunda %d, mati %d",
				r.Diklaim, r.Terkirim, r.Dilewati, r.Ditunda, r.Mati))
		}
	}
	return nil
}

func sleep(ctx context.Context, d time.Duration) {
	select {
	case <-ctx.Done():
	case <-time.After(d):
	}
}
