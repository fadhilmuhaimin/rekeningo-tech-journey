package worker

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"

	"lab/apit4/internal/lajur"
	"lab/apit4/internal/repo"
	"lab/apit4/internal/verifikasi"
)

// kirimVerifikasi memproses satu pekerjaan verifikasi (outbox bertujuan verifikasi): mengirim pengajuan ke layanan
// verifikasi dengan Idempotency-Key = id pengajuan, lalu menutup pengajuan dengan jawabannya.
//
// Aturan ADR 25 berlaku apa adanya: backoff dengan jitter, lima percobaan, lalu dead-letter. Tiap percobaan yang
// gagal karena vendor tidak tersedia memakai satu percobaan pekerjaan itu, walau pendaftarnya tidak bersalah
// (M31). Dengan breaker (Konfigurasi.Breaker, ADR 36) lajur verifikasi dijeda saat vendor jelas mati: baris tidak
// diklaim, dan baris yang sempat diklaim tepat sebelum breaker terbuka dilepas tanpa menaikkan percobaan. Timeout
// menandai pengajuan tidak_pasti, bukan gagal: vendor mungkin sudah memprosesnya (ADR 36).
func (w *Worker) kirimVerifikasi(ctx context.Context, n repo.Notifikasi) string {
	var isi struct {
		VerifikasiID int64 `json:"verifikasi_id"`
	}
	if err := json.Unmarshal(n.Payload, &isi); err != nil || isi.VerifikasiID == 0 {
		log.Printf("outbox %d: payload verifikasi tidak terbaca", n.ID)
		return w.matikanVerifikasi(ctx, n, 0)
	}
	if n.Percobaan > w.cfg.MaksPercobaan {
		log.Printf("outbox %d: %d kali diklaim tanpa pernah selesai, masuk dead-letter", n.ID, n.Percobaan-1)
		return w.matikanVerifikasi(ctx, n, isi.VerifikasiID)
	}
	v, err := w.repo.Verifikasi(ctx, isi.VerifikasiID)
	if err != nil {
		log.Printf("outbox %d: baca verifikasi %d: %v", n.ID, isi.VerifikasiID, err)
		return w.tunda(ctx, n)
	}
	if v.Status != "diajukan" && v.Status != "tidak_pasti" { // sudah selesai: pekerjaan ini tidak perlu mengerjakannya lagi
		if err := w.repo.SelesaiOutbox(ctx, n.ID, "dilewati"); err != nil {
			log.Printf("outbox %d: tandai dilewati: %v", n.ID, err)
		}
		return "dilewati"
	}
	if w.verif == nil {
		log.Printf("outbox %d: layanan verifikasi tidak dikonfigurasi", n.ID)
		return w.tundaVerifikasi(ctx, n, isi.VerifikasiID)
	}
	req := verifikasi.Permintaan{Referensi: fmt.Sprint(v.ID), ChecksumKartu: v.ChecksumKartu, ChecksumSwafoto: v.ChecksumSwafoto}
	if w.cfg.KunciBaruTiapPercobaan {
		req.Kunci = kunciAcak()
	}
	var h verifikasi.Hasil
	panggil := func() (err error) { h, err = w.verif.Verifikasi(ctx, req); return }
	err = panggilVendor(w.cfg.Breaker[repo.TujuanVerifikasi], panggil)
	if lajur.Dijeda(err) {
		// Breaker menutup lajur sesudah baris ini diklaim: vendor tidak dihubungi, jadi percobaan ini tidak terjadi.
		if e := w.repo.LepasOutbox(ctx, n.ID); e != nil {
			log.Printf("outbox %d: lepas klaim: %v", n.ID, e)
		}
		return "dijeda"
	}
	switch {
	case err == nil:
		if _, e := w.repo.SelesaikanVerifikasi(ctx, v.ID, h.Status, h.Referensi, w.kini()); e != nil {
			log.Printf("outbox %d: selesaikan verifikasi %d: %v", n.ID, v.ID, e)
			return w.tunda(ctx, n)
		}
		if e := w.repo.SelesaiOutbox(ctx, n.ID, "terkirim"); e != nil {
			log.Printf("outbox %d: tandai terkirim: %v", n.ID, e)
			return "ditunda"
		}
		return "terkirim"
	case errors.Is(err, verifikasi.ErrTidakPasti):
		log.Printf("outbox %d percobaan %d: %v", n.ID, n.Percobaan, err)
		if e := w.repo.TandaiVerifikasi(ctx, v.ID, "tidak_pasti", w.kini()); e != nil {
			log.Printf("outbox %d: tandai tidak pasti: %v", n.ID, e)
		}
		// Percobaan kelima yang timeout juga berakhir di dead-letter dan menandai pengajuan gagal (tundaVerifikasi),
		// walau vendor mungkin sudah memprosesnya: tidak_pasti hanya bertahan selama masih ada percobaan (t4-integrasi,
		// retry.txt bagian D). Pengajuan tidak_pasti masih berjalan menurut indeks verifikasi_satu_berjalan, jadi
		// membiarkannya tanpa job yang memeriksa status vendor akan menahan pendaftar; job itu belum ada.
		return w.tundaVerifikasi(ctx, n, v.ID)
	default:
		log.Printf("outbox %d percobaan %d: %v", n.ID, n.Percobaan, err)
		return w.tundaVerifikasi(ctx, n, v.ID)
	}
}

// tundaVerifikasi menunda dengan backoff; bila percobaan habis, baris mati dan pengajuan ditandai gagal.
func (w *Worker) tundaVerifikasi(ctx context.Context, n repo.Notifikasi, verifikasiID int64) string {
	hasil := w.tunda(ctx, n)
	if hasil == "mati" && verifikasiID != 0 {
		if e := w.repo.TandaiVerifikasi(ctx, verifikasiID, "gagal", w.kini()); e != nil {
			log.Printf("outbox %d: tandai verifikasi gagal: %v", n.ID, e)
		}
	}
	return hasil
}

func (w *Worker) matikanVerifikasi(ctx context.Context, n repo.Notifikasi, verifikasiID int64) string {
	if err := w.repo.TundaOutbox(ctx, n.ID, 0, true); err != nil {
		log.Printf("outbox %d: dead-letter: %v", n.ID, err)
	}
	if verifikasiID != 0 {
		if e := w.repo.TandaiVerifikasi(ctx, verifikasiID, "gagal", w.kini()); e != nil {
			log.Printf("outbox %d: tandai verifikasi gagal: %v", n.ID, e)
		}
	}
	return "mati"
}

// panggilVendor menjalankan panggilan lewat breaker bila ada. Tanpa breaker panggilan langsung (ADR 25 apa adanya).
func panggilVendor(b *lajur.Breaker, f func() error) error {
	if b == nil {
		return f()
	}
	return b.Jalankan(f)
}

func kunciAcak() string {
	b := make([]byte, 8)
	rand.Read(b)
	return "acak-" + hex.EncodeToString(b)
}
