package worker

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"

	"lab/apit4/internal/repo"
	"lab/apit4/internal/verifikasi"
)

// kirimVerifikasi memproses satu pekerjaan verifikasi (outbox bertujuan verifikasi): mengirim pengajuan ke layanan
// verifikasi dengan Idempotency-Key = id pengajuan, lalu menutup pengajuan dengan jawabannya.
//
// Aturan ADR 25 berlaku apa adanya: backoff dengan jitter, lima percobaan, lalu dead-letter. Tiap percobaan yang
// gagal karena vendor tidak tersedia memakai satu percobaan pekerjaan itu, walau pendaftarnya tidak bersalah
// (M31); lajur yang dijeda oleh breaker ada di lab t4-integrasi, bukan di sini. Timeout menandai pengajuan
// tidak_pasti, bukan gagal: vendor mungkin sudah memprosesnya (ADR 36).
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
	h, err := w.verif.Verifikasi(ctx, verifikasi.Permintaan{Referensi: fmt.Sprint(v.ID), ChecksumKartu: v.ChecksumKartu, ChecksumSwafoto: v.ChecksumSwafoto})
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
