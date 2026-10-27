package service

import (
	"sync/atomic"
	"time"

	"lab/apit4/internal/gateway"
	"lab/apit4/internal/objek"
	"lab/apit4/internal/penerbit"
	"lab/apit4/internal/verifikasi"
)

// Dep adalah pihak ketiga tiruan dan setelan lab Tahap 4. Semuanya boleh kosong: fitur yang butuh pihak itu
// menjawab 503 sendiri, dan lab Tahap 3 yang memakai server ini tidak berubah.
type Dep struct {
	Gateway  *gateway.Klien
	Vendor   *verifikasi.Klien
	Penerbit *penerbit.Klien
	Objek    objek.Penyimpan
	// Umur URL PUT bertanda tangan untuk unggah file identitas (ADR 38); 0 = UmurPresign (5 menit, Asumsi). Lab saja:
	// umur pendek (detik) supaya kedaluwarsa bisa direkam dengan menunggu.
	UmurPresign time.Duration

	// Rahasia webhook: yang pertama dipakai gateway menandatangani, yang kedua adalah rahasia lama yang masih
	// diterima selama masa tumpang tindih rotasi (ADR 35). Kosong = webhook ditolak semua (401).
	RahasiaWebhook []string

	// Lab saja: jeda di antara cek dan tulis pada mode webhook-cek-tulis dan kartu-tanpa-hold, supaya celah
	// cek-lalu-tulis terekam tanpa mengandalkan nasib.
	JedaCekTulis time.Duration

	// Lab saja: lapisan pengaman handler webhook ADR 34 yang sengaja dimatikan, supaya lapisan lain bisa direkam
	// sendirian. Kunci yang dikenal: "status" (status top-up hanya maju) dan "kunci" (Idempotency-Key ke ledger).
	// Kunci utama webhook_event.event_id tidak bisa dimatikan.
	TanpaLapis map[string]bool

	// Rahasia bersama penerbit kartu tiruan: header X-Penerbit-Kunci pada /penerbit/*. Kosong = ditolak semua.
	KunciPenerbit string
	// Kill switch kartu (ADR 42): false menolak otorisasi baru tanpa deploy. Nil dianggap menyala.
	KartuAktif *atomic.Bool
	// lock_timeout otorisasi kartu di ledger (ADR 42); 0 = bawaan 1 detik.
	LockTimeoutKartu time.Duration
}

// DenganT4 memasang pihak ketiga tiruan dan setelan lab Tahap 4.
func (s Service) DenganT4(d Dep) Service { s.t4 = d; return s }
