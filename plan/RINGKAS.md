# Ringkas: CERITA-TAHAP-1, 2, 3 dan PROPOSAL (keputusan 235, 900)
Diimpor CLAUDE.md menggantikan file penuh. Bagian lengkap dibaca hanya saat tugas membutuhkannya: `grep -n '^##' plan/CERITA-TAHAP-N.md` (atau PROPOSAL), lalu Read dengan offset/limit atau subagent yang mengembalikan ringkasan. Bila ringkasan ini bertentangan dengan file penuh, file penuh yang benar. Format lipat (batas 60 baris, gerbang): peta tahap yang selesai dilipat jadi satu baris per kelompok halaman; peta tahap yang sedang ditulis satu baris per halaman (nomor · judul · jenis · ★ · lab); judul dan jenis lengkap tiap halaman ada di registry `situs/data/cerita.json`.
## Keputusan final dan tampilan (PROPOSAL "Keputusan final" dan "Desain visual final", CLAUDE.md `<tampilan>`)
- Situs Astro + Starlight; widget React 19 + TypeScript (logika murni di `.ts`, JSON divalidasi Zod); SQL di browser PGlite (race dua koneksi replay rekaman). Hosting Cloudflare Pages lewat GitHub Actions; progres pembaca di localStorage + ekspor/impor, tanpa akun. Hands-on jalur A (browser) + B (`make lab`, Dev Container). Stack pembanding keenam Dart server (Serverpod); Flutter feature-first + MVVM, Riverpod 3, go_router. Uang: Tahap 1 kolom `saldo` di-UPDATE, mulai Tahap 2 ledger double-entry append-only. Keamanan direkam sampai Tahap 4, Tahap 5–6 konseptual [perlu verifikasi]; penyerang "yang mencoba" (Dimas, penasaran, bukan jahat).
- Enam tahap (6 = proyeksi), konten dulu satu tahap sampai tuntas (109); semua fiktif, tanpa merek nyata atau klaim regulasi; tiap tahap mulai dari PRD; masalah terlihat orang, bukan log.
- Tampilan: gelap default #0B0B0C, teks #E6E6E6, judul #FFFFFF, sekunder #A3A3A8, aksen #7AB8FF, terang satu klik, semua warna lewat token; teks 19–20 px desktop, 17 px HP, line-height 1,65, kolom 680–720 px; Satoshi 400/600 (fallback Inter), JetBrains Mono. Halaman konsep lima blok (Mulai, Coba, Paham, Putuskan, Kunci), dua pertama terbuka, Berikutnya di tiap blok; tanpa animasi otomatis; teks tidak di dalam SVG.
## Tahap 1 · Gedung A (selesai 2026-10-13; peta penuh di CERITA-TAHAP-1 "Peta halaman Tahap 1 versi baru")
- Gedung A, 100 karyawan, 3 warung, puncak 0,14 RPS. Tokoh: Raka (mobile engineer, sendiri), Sinta (PM, PRD), Budi (karyawan), Ani (warung), Pak Hadi (Keuangan, "setiap rupiah tertelusur"), Dimas (TI junior, mencoba). Lab utama `api-t1` (Go); skema v1 `akun` (saldo kolom), `sesi`, `topup`, `transaksi`, `koreksi`, ERD dari `tools/erd.py`.
- 42 halaman 1.1–1.42; PRD 1.1, fitur 1.2–1.10, rekap 1.41, jembatan 1.42. Masalah: M1 1.14, M2 1.17, M3 1.19, M4 1.22, M5 1.26, M6 1.30, M7 1.34, M8 1.37. ADR: 1 di 1.4, 2 di 1.15, 3 di 1.18, 4 di 1.20, 5–6 di 1.24, 7–8 di 1.29, 9 di 1.31, 10 di 1.33, 11 di 1.35, 12 ("Sengaja belum dilakukan") di 1.40. Keamanan 1.20, 1.29, 1.35.
## Tahap 2 · Seluruh kampus (CERITA-TAHAP-2; 2.1–2.25 ditulis, 2.26–2.33 sedang ditulis)
- 3 gedung, ±1.000 karyawan, 12 warung, 8 minggu, satu server; dua engineer: Raka dan Nadia (backend dari tim ERP, bahasa akuntansi, cenderung mengusulkan solusi terlalu berat). Puncak 1,4 RPS. Masalah M9–M17, ADR 13–21 (ADR 6 direvisi di 2.8; naskah 2.8 menulis "ADR 12", lihat MEMORI). PRD v2 P0: transfer antar karyawan (nomor karyawan, batas Rp500.000/hari), tutup buku bulanan, pencairan warung Jumat 15.00 (satu file bank, tanpa integrasi bank), top-up 1.000 akun dari CSV; P1 riwayat panjang, login lebih aman; P2 notifikasi ditunda ke v3.
- Inti: ledger double-entry. Jurnal berisi ≥ 2 posting berjumlah nol; posting tidak pernah di-UPDATE/DELETE, koreksi = jurnal pembalik; saldo karyawan tidak negatif; ketiganya dijaga database. Saldo = jumlah posting; `buku.saldo_cache` dikunci saat transfer (M9). Aturan Pak Hadi: setiap rupiah tertelusur ke kejadian, tanpa koreksi tangan. Skema v2: `akun`, `sesi`, `buku`, `jurnal`, `posting`, `kunci_idempotensi`, `batch_pencairan`, `baris_pencairan`. Lab: `b3-ledger`, `api-t2`, `b3-race`, `b3-isolasi`, `t2-pencairan`, `e3-idempotency`, `b2-query`, `b4-skema`, `c4-ratelimit`, `e5-payload`.
- 2.1–2.25 (ditulis): PRD 2.1, fitur→teknis 2.2–2.5 (api-t2, b3-ledger, t2-pencairan), ledger 2.6–2.9, M9 2.10 + ADR 13 2.11 (b3-race), isolasi 2.12, M10 2.13 + ADR 14 2.14 (e3-idempotency), M11 2.15, N+1 2.16, ADR 15 2.17, M12 2.18, ADR 16 2.19 (b2-query), payload 2.20 (e5-payload), M13 2.21 + ADR 17 2.22 (b4-skema), M14 2.23 (api-t2), ADR 18 2.24 (tim-infra), M15 2.25 (t2-pencairan). Peta 2.26–2.33 (nomor · judul · jenis · ★ · lab):
2.26 Job terjadwal yang idempoten dan rekonsiliasi + ADR 19 · Konsep+ADR · ★ · t2-pencairan
2.27 M16: Akun Ani terkunci · Masalah · ★ · c4-ratelimit
2.28 Keamanan 4: brute force, credential stuffing, hash password + ADR 20 · Keamanan+ADR · ★ · c4-ratelimit
2.29 M17: Tutup buku kedua lolos, PRD v3 datang · Masalah · ★ · –
2.30 Estimasi Tahap 2 → 3 · Konsep · ★ · –
2.31 ADR 21: Sengaja belum dilakukan · ADR · ★ · –
2.32 Yang dibawa keluar dari Tahap 2 · Konsep · ★ · –
2.33 Jembatan: pratinjau PRD v3 · PRD · ★ · –
## Tahap 3 · Enam kota (CERITA-TAHAP-3, draf otomatis; 32 halaman 3.1–3.32, M18–M28, ADR 22–33)
- 6 kota, ±10.000 karyawan, ±60 warung (12 pusat + ±48; tenant mitra), 10 minggu, tim 4: Raka (app), Nadia dan Bayu (backend; Bayu dari infrastruktur, menganggap bawaan komponen aman), Wulan (dasbor web). Beban (Asumsi, rumus di naskah): puncak 17,4 RPS, 0,868 (dibulatkan 0,87) pembayaran per detik (3 transaksi per user aktif per hari; registry `trx` 3 hanya Tahap 3), pool 10 koneksi penuh dalam ±11,5 detik bila push tidak menjawab dan client terus menunggu (client yang menyerah sesudah T detik: penuh hanya bila T > ±10,4 detik; pool 50 hanya menunda ±58 detik), worker 13,3 per detik (promo 10.000 HP ±750 detik), katalog 5,2 baca per detik, posting ±5,5 juta (1,37 GB) per tahun (registry: data transaksi ±820 MB). Masalah Tahap 3 adalah ketergantungan, bukan kapasitas.
- PRD v3 P0: notifikasi saat menerima uang (95% bayar dan transfer di bawah 30 detik; top-up massal dan promo boleh menyusul), katalog dan stok warung, dasbor web warung, tidak berhenti saat deploy; P1 promo HR (peran `hr`), catatan pembayaran (maks 100 karakter), offline stok dan harga (pembayaran tidak pernah offline), passkey pilihan; P2 bank, kartu, verifikasi ke v4. Pak Hadi: pemberitahuan tidak mendahului uang. Inti: PostgreSQL satu-satunya source of truth, push bukan bagian transaction, jadi outbox (satu transaction dengan jurnal), worker klaim per baris (`FOR UPDATE` + `klaim_sampai`; `SKIP LOCKED` hanya melewati baris terkunci), at-least-once, penerima idempoten (`notifikasi_id`).
- M18 3.6 pool habis (ADR 22 di 3.8) · M19 3.10 kursor melewatkan (ADR 23 outbox 3.9, ADR 24 3.11) · M20 3.12 ganda (ADR 25 3.13) · M21 3.14 satu proses, pemicu ADR 21 dibaca terlambat (ADR 26 3.15) · M22 3.16 rate limit memori (ADR 27 3.17, Redis) · M23 3.18 dua harga (ADR 28 3.19) · M24 3.20 offline (ADR 29 3.21) · M25 3.22 XSS (ADR 30 3.23) · M26 3.24 MITM (ADR 31 3.25) · M27 3.26 promo menahan uang (ADR 32 3.27) · M28 3.28 PRD v4 (ADR 33 3.30). Skema v3 (±14 tabel): + `perangkat`, `outbox`, `produk`, `kota`, `promo`, `operasi_sinkron`; `sesi` + `jenis`, `csrf_hash`; `akun` + `kota_id`, jenis `hr`. Lab: `api-t3` (utama, sumber ERD3), `t3-pool`, `t3-outbox`, `t3-instance`, `t3-cache`, `t3-offline`, `t3-dasbor`, `t3-mitm`; pihak ketiga selalu tiruan lokal.
### Peta halaman Tahap 3 (nomor · judul · jenis · ★ · lab; peran: mobile 3.3, 3.12, 3.13, 3.20, 3.21, 3.24, 3.25; devops 3.14, 3.15, 3.17, 3.26, 3.27; security 3.16, 3.17, 3.22–3.25)
3.1 PRD v3: Rekeningo untuk enam kota · PRD · ★ · –
3.2 Dari fitur ke pekerjaan teknis v3 · Fitur→teknis · ★ · –
3.3 Fitur: notifikasi push dan promo HR · Fitur→teknis · ★ · api-t3
3.4 Dua tempat yang tidak bisa commit bersama · Konsep · ★ · t3-outbox
3.5 Skema data: ERD Tahap 2 → Tahap 3 dan pertumbuhannya · Konsep · ★ · api-t2, api-t3
3.6 M18: Seluruh app membeku jam 12.20 · Masalah · ★ · t3-pool
3.7 Observability: log, metric, trace · Konsep · ★ · api-t3, t3-pool
3.8 Connection pool, Little's Law, dan timeout + ADR 22 · Konsep+ADR · ★ · t3-pool
3.9 Outbox transaksional dan worker + ADR 23 · Konsep+ADR · ★ · t3-outbox
3.10 M19: Ani tidak diberi tahu · Masalah · ★ · t3-outbox
3.11 Klaim per baris, bukan kursor: SKIP LOCKED + ADR 24 · Konsep+ADR · ★ · t3-outbox
3.12 M20: Notifikasi masuk dua kali · Masalah · – · t3-outbox
3.13 At-least-once: retry, dead-letter, penyaring di app + ADR 25 · Konsep+ADR · ★ · t3-outbox
3.14 M21: Satu proses mati, semua mati · Masalah · ★ · t3-instance
3.15 Dua instance di belakang proxy + ADR 26 · Konsep+ADR · ★ · t3-instance
3.16 M22: Batas login jadi dua kali lipat · Masalah · ★ · t3-instance
3.17 Rate limit lintas instance dan Redis + ADR 27 · Konsep+ADR · ★ · t3-instance
3.18 M23: Dua harga di satu meja · Masalah · – · t3-cache
3.19 Cache dan invalidation + ADR 28 · Konsep+ADR · ★ · t3-cache
3.20 M24: Stok yang kembali ke angka lama · Masalah · – · t3-offline
3.21 Offline-first dan sinkron + ADR 29 · Konsep+ADR · – · t3-offline
3.22 M25: Kotak peringatan di riwayat Ani · Masalah · ★ · t3-dasbor
3.23 Keamanan 5: XSS, CSRF, cookie sesi, passkey + ADR 30 · Keamanan+ADR · ★ · t3-dasbor
3.24 M26: Transfer yang tidak dibuat Budi · Masalah · ★ · t3-mitm
3.25 Keamanan 6: TLS, HSTS, pinning + ADR 31 · Keamanan+ADR · ★ · t3-mitm
3.26 M27: Hari promo, notifikasi uang terlambat · Masalah · ★ · t3-outbox
3.27 Tim dan infra Tahap 3: staging, pipeline, alert, on-call + ADR 32 · Tim-infra · ★ · api-t3, t3-outbox
3.28 M28: Uji coba enam kota lolos, PRD v4 datang · Masalah · ★ · –
3.29 Estimasi Tahap 3 → 4 · Konsep · ★ · –
3.30 ADR 33: Sengaja belum dilakukan · ADR · ★ · –
3.31 Yang dibawa keluar dari Tahap 3 · Konsep · ★ · –
3.32 Jembatan: pratinjau PRD v4 · PRD · ★ · –
