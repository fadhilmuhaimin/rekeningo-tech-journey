# Ringkas: CERITA-TAHAP-1, CERITA-TAHAP-2, dan PROPOSAL (keputusan 235)

Diimpor CLAUDE.md menggantikan file penuh. Bagian lengkap dibaca hanya saat tugas membutuhkannya: `grep -n '^##' plan/CERITA-TAHAP-2.md` (atau CERITA-TAHAP-1, PROPOSAL), lalu Read dengan offset/limit rentang itu, atau subagent yang mengembalikan ringkasan. Kalau ringkasan ini bertentangan dengan file penuh, file penuh yang benar.

## Keputusan final (PROPOSAL "Keputusan final")
- Situs Astro + Starlight; widget React 19 + TypeScript, logika murni di `.ts`, JSON divalidasi Zod; SQL di browser PGlite (race dua koneksi tetap replay rekaman).
- Hosting Cloudflare Pages lewat GitHub Actions; progres pembaca di localStorage + ekspor/impor, tanpa akun. Hands-on: jalur A (browser) + B (`make lab`, Dev Container); terminal di VPS ditunda. Stack pembanding keenam: Dart server (Serverpod). Flutter: feature-first + MVVM, Riverpod 3, go_router.
- Model uang: Tahap 1 kolom `saldo` di-UPDATE; mulai Tahap 2 ledger double-entry append-only.
- Keamanan direkam sampai Tahap 4, Tahap 5–6 konseptual [perlu verifikasi]; penyerang "yang mencoba" (Dimas, penasaran, bukan jahat).
- Enam tahap (6 = proyeksi). Konten dulu, satu tahap sampai tuntas (keputusan 109). Semua fiktif, tanpa merek nyata, tanpa klaim regulasi; tiap tahap mulai dari PRD; masalah terlihat orang, bukan log.

## Tampilan (CLAUDE.md `<tampilan>`, PROPOSAL "Desain visual final")
- Gelap default: latar #0B0B0C, teks #E6E6E6, judul #FFFFFF, sekunder #A3A3A8, aksen #7AB8FF; terang satu klik; semua warna lewat token. Teks 19–20 px desktop, 17 px HP, line-height 1,65, kolom 680–720 px; Satoshi 400/600 (fallback Inter), JetBrains Mono.
- Halaman konsep lima blok (Mulai, Coba, Paham, Putuskan, Kunci), dua pertama terbuka, Berikutnya di tiap blok; tanpa animasi otomatis; teks tidak di dalam SVG.

## Tahap 1 (selesai 2026-10-13, menunggu tinjauan pemilik; peta penuh di CERITA-TAHAP-1 "Peta halaman Tahap 1 versi baru")
- Gedung A, 100 karyawan, 3 warung, puncak 0,14 RPS. Tokoh: Raka (mobile engineer, sendiri), Sinta (PM, PRD), Budi (karyawan), Ani (warung), Pak Hadi (Keuangan, "setiap rupiah tertelusur"), Dimas (TI junior, mencoba).
- 42 halaman 1.1–1.42, masalah M1–M8, ADR 1–12 (ADR 12 = "Sengaja belum dilakukan", 1.40); lab utama `api-t1` (Go); skema v1 `akun` (saldo kolom), `sesi`, `topup`, `transaksi`, `koreksi`, ERD dari `tools/erd.py`.

## Tahap 2 · Seluruh kampus (CERITA-TAHAP-2)
- 3 gedung, ±1.000 karyawan, 12 warung, 8 minggu, satu server; dua engineer: Raka dan Nadia (backend dari tim ERP, bahasa akuntansi, cenderung mengusulkan solusi terlalu berat). Puncak 1,4 RPS. Masalah M9–M17, ADR 13–21 (naskah 2.8 menulis "ADR 12", lihat MEMORI).
- PRD v2 P0: transfer antar karyawan (nomor karyawan, batas Rp500.000/hari), tutup buku bulanan, pencairan warung Jumat 15.00 (satu file bank, tanpa integrasi bank), top-up 1.000 akun dari CSV; P1 riwayat panjang, login lebih aman; P2 notifikasi ditunda ke v3.
- Inti: ledger double-entry. Jurnal berisi ≥ 2 posting berjumlah nol; posting tidak pernah di-UPDATE/DELETE, koreksi = jurnal pembalik; saldo karyawan tidak negatif; ketiganya dijaga database. Saldo = jumlah posting; `buku.saldo_cache` dikunci saat transfer (M9). Aturan Pak Hadi: setiap rupiah tertelusur ke kejadian, tanpa koreksi tangan.
- Skema v2: `akun`, `sesi`, `buku`, `jurnal`, `posting`, `kunci_idempotensi`, `batch_pencairan`, `baris_pencairan`; widget ERD bertumbuh (React Flow) di 1.12 dan 2.9.
- Lab: `b3-ledger` (baru), `api-t2` (api-t1 naik ke ledger, expand/contract), `b3-race`, `b3-isolasi`, `t2-pencairan` (baru), `e3-idempotency`, `b2-query`, `b4-skema`, `c4-ratelimit`, `e5-payload`.

## Peta halaman Tahap 2 (nomor · judul · jenis · ★ · lab)
2.1 PRD v2: Rekeningo untuk seluruh kampus · PRD · ★ · –
2.2 Dari fitur ke pekerjaan teknis v2 · Fitur→teknis · ★ · –
2.3 Fitur: transfer antar karyawan · Fitur→teknis · ★ · api-t2
2.4 Fitur: tutup buku bulanan · Fitur→teknis · ★ · b3-ledger
2.5 Fitur: pencairan warung terjadwal · Fitur→teknis · – · t2-pencairan
2.6 Kenapa saldo bukan kolom · Konsep · ★ · b3-ledger
2.7 Ledger double-entry: jurnal, posting, invarian · Konsep · ★ · b3-ledger
2.8 ADR 12: dari kolom saldo ke ledger · ADR · ★ · b3-ledger
2.9 Skema data: ERD Tahap 1 → Tahap 2 dan pertumbuhannya · Konsep · ★ · api-t1, api-t2
2.10 M9: Saldo −Rp20.000 · Masalah · ★ · b3-race
2.11 Race condition dan lock + ADR 13 · Konsep+ADR · ★ · b3-race
2.12 Isolation level secara praktis · Konsep · – · b3-isolasi
2.13 M10: Nasi goreng dibayar dua kali · Masalah · ★ · e3-idempotency
2.14 Retry dan idempotency key + ADR 14 · Konsep+ADR · ★ · e3-idempotency
2.15 M11: Riwayat 4 detik · Masalah · ★ · b2-query
2.16 N+1 query · Konsep · ★ · b2-query
2.17 Index dan query plan + ADR 15 · Konsep+ADR · ★ · b2-query
2.18 M12: Transaksi muncul dua kali · Masalah · – · b2-query
2.19 Pagination kursor + ADR 16 · Konsep+ADR · ★ · b2-query
2.20 Ukuran payload dan kuota HP · Konsep · – · e5-payload
2.21 M13: Migrasi di jam makan siang · Masalah · ★ · b4-skema
2.22 Ubah skema tanpa downtime + ADR 17 · Konsep+ADR · ★ · b4-skema
2.23 M14: Batas harian yang hilang · Masalah · ★ · api-t2
2.24 Tim dan infra Tahap 2: review, branch protection, tes integrasi + ADR 18 · Tim-infra · ★ · api-t2
2.25 M15: Rp15.000 di file bank · Masalah · ★ · t2-pencairan
2.26 Job terjadwal yang idempoten dan rekonsiliasi + ADR 19 · Konsep+ADR · ★ · t2-pencairan
2.27 M16: Akun Ani terkunci · Masalah · ★ · c4-ratelimit
2.28 Keamanan 4: brute force, credential stuffing, hash password + ADR 20 · Keamanan+ADR · ★ · c4-ratelimit
2.29 M17: Tutup buku kedua lolos, PRD v3 datang · Masalah · ★ · –
2.30 Estimasi Tahap 2 → 3 · Konsep · ★ · –
2.31 ADR 21: Sengaja belum dilakukan · ADR · ★ · –
2.32 Yang dibawa keluar dari Tahap 2 · Konsep · ★ · –
2.33 Jembatan: pratinjau PRD v3 · PRD · ★ · –
