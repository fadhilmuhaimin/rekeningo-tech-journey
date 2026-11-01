package service

import (
	"errors"
	"time"
)

// Aturan Tahap 4 (PRD v4, naskah 3b). Angka yang bertanda Asumsi adalah pilihan produk atau lab, bukan hasil
// pengukuran.
const (
	// Batas saldo menurut tingkat (Asumsi produk, PRD v4): belum terverifikasi paling banyak Rp1.000.000,
	// terverifikasi paling banyak Rp10.000.000.
	BatasSaldoBelum         int64 = 1_000_000
	BatasSaldoTerverifikasi int64 = 10_000_000

	// Satu top-up dari bank: paling sedikit Rp10.000 dan paling banyak Rp5.000.000 (Asumsi lab).
	MinTopupBank  int64 = 10_000
	MaksTopupBank int64 = 5_000_000

	// Order di gateway berlaku 24 jam sejak dibuat (Asumsi lab).
	UmurTopupBank = 24 * time.Hour

	// Toleransi selisih waktu pada tanda tangan webhook: 5 menit (bawaan satu gateway nyata; Asumsi untuk tiruan).
	ToleransiWebhook = 5 * time.Minute

	// Top-up yang masih menunggu lebih dari ini ditanyakan ke gateway oleh job cek status (ADR 35; Asumsi).
	UmurCekStatus = 30 * time.Minute

	// Retensi file identitas sesudah verifikasi selesai: 30 hari (Asumsi produk, ADR 38).
	RetensiIdentitas = 30 * 24 * time.Hour

	// Pembayaran QR statis paling banyak Rp200.000 per transaksi (Asumsi produk, ADR 40); QR dinamis berlaku 5 menit.
	MaksQRStatis  int64 = 200_000
	UmurQRDinamis       = 5 * time.Minute

	// Dana kartu tertahan paling lama 7 hari (Asumsi, ADR 42).
	UmurTahanKartu = 7 * 24 * time.Hour
)

// BatasSaldoTingkat: saldo paling banyak yang boleh dipegang satu akun pada tingkat itu.
func BatasSaldoTingkat(tingkat string) int64 {
	if tingkat == "terverifikasi" {
		return BatasSaldoTerverifikasi
	}
	return BatasSaldoBelum
}

// Mode rentan Tahap 4 (flag -rentan di cmd/api). Satu mode per proses; yang lama (push-dalam-tx, kursor, ...) tetap.
const (
	RentanWebhookV1       = "webhook-v1"        // M29: handler paling pendek: tanpa tanda tangan, tanpa tabel event, tanpa status bersyarat
	RentanWebhookCekTulis = "webhook-cek-tulis" // M29: cek status top-up lalu tulis, tanpa kunci; tanda tangan diperiksa
	RentanKartuTanpaHold  = "kartu-tanpa-hold"  // M37: otorisasi memeriksa saldo lalu menyetujui tanpa menahan dana
	RentanUnduhRentan     = "unduh-rentan"      // M36: unduh gambar tanpa pemeriksaan alamat tujuan
	RentanTanpaAudit      = "bo-tanpa-audit"    // M38: back office versi pertama: tidak ada catatan audit
	// M31 (retry bebas tanpa kunci, ditolak ADR 36): worker memakai Idempotency-Key baru di setiap percobaan ke vendor.
	RentanVerifikasiTanpaKey = "verifikasi-tanpa-key"
	// M33 (versi pertama, ditolak ADR 38): file identitas di kolom bytea di database yang sama (lab t4-storage).
	RentanBerkasBytea = "berkas-bytea"
)

var (
	ErrDibekukan       = errors.New("akun dibekukan")
	ErrButuhVerifikasi = errors.New("butuh akun terverifikasi")
	ErrBatasTingkat    = errors.New("saldo melewati batas tingkat akun")
	ErrTopupBukan      = errors.New("top-up tidak bisa diproses dalam keadaan ini")
)
