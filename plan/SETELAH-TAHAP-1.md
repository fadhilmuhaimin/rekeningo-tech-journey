# Setelah Tahap 1

Tugas dan temuan yang sengaja tidak dikerjakan di Tahap 1 (keputusan 369, lingkup beku 2026-10-13). Yang masuk ANTREAN hanya kategori rusak, aksesibilitas, kontras, atau gerbang yang benar-benar gagal; selebihnya ditulis di sini dan dikerjakan sesudah pemilik meninjau Tahap 1. Format tugas sama dengan ANTREAN supaya bisa dipindah kembali apa adanya.

## Tugas yang dipindah dari ANTREAN

### I5f · Diagram arsitektur di halaman tahap dan ADR

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: I4
- selesai bila: diagram kotak statis di halaman tahap dan halaman ADR (banding) diganti DiagramArsitektur; MEMORI mendapat bagian "Untuk halaman baru": cara memakai DiagramArsitektur dan token gerak; tangkapan sebelum/sesudah; butir I6.
- catatan: Widget lain hanya bila jelas membantu pemahaman; alasannya dicatat di keputusan. Kategori: polesan (diagram kotak statis masih benar, hanya belum interaktif).

### P4 · Ilustrasi latar perusahaan Grup Lestari

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: -
- selesai bila: adegan latar perusahaan baru di `Ilustrasi.astro` (kampus tiga gedung, kantin, warung tenant; token gelap/terang, tanpa teks di SVG) dipakai di 1.1 PRD v1; `contrast.py` lolos.
- catatan: Naskah meminta satu ilustrasi latar dan satu per masalah M3–M6. Kategori: polesan (ilustrasi baru).

### G2c · Pagar lebar font fallback di CI

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: I5c-h
- selesai bila: gerbang gagal bila lebar span uji "Satoshi Fallback" di CI berbeda > 0,5% dari Satoshi atau lebarnya bilangan bulat (tanda hinting), dengan uji mutasi; pesan menyebut versi runner dan font.
- catatan: Dari PR #213 (keputusan 361): label `ubuntu-latest` pindah versi [perlu verifikasi tanggal], set font atau hinting bisa berubah tanpa ketahuan. Jalur teknis. Keadaan 2026-10-13: PR #232 (branch `perbaikan/g2c-pagar-font`, head 7f992ee) putaran 2 selesai (korpus beku `situs/tools/ukur-font-korpus.txt`, mutasi per jenis temuan), belum digabung dengan main (konflik `plan/KEPUTUSAN.md` dan `KELOMPOK_UKUR`), CI head terakhir belum jalan. Kategori: pencegahan; gerbang tidak sedang gagal (ubuntu-26.04 diuji identik dengan 24.04).

### G2e · Ulang sekali yang sama untuk ukur-cls

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: G2d
- selesai bila: `ukur-cls.mjs` memakai syarat ulang sekali yang sama dengan ukur-luapan (renderer diam lewat `jejak`, tanpa xhr/fetch tertunda, batas jumlah ulang, peringatan Actions dan ringkasan langkah) dari satu modul bersama di `situs/tools/lib/`, bukan salinan; uji mutasi seperti keputusan 364.
- catatan: Dari peninjau PR #231: lengan konteks per halaman (cara kerja ukur-cls) macet 3/60, dan ukur-cls pernah macet di run 38257090943. Jalur teknis. Kategori: pencegahan; ukur-cls belum pernah gagal karena macet sejak batas waktu G2b.

### R6 · Aturan layar: visual wajib di layar pertama

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: R1, R2, R3, R4, R5, P10
- selesai bila: `situs/tools/layar.mjs` gagal bila halaman berblok tidak menampilkan visual di layar pertama 4 ukuran; alat ukur Rantai (P10) gagal bila satu baris Rantai ringkas di Inti membungkus lebih dari dua baris visual di 360 atau 375 px; semua halaman Tahap 1 yang ada lolos (halaman yang gagal diperbaiki di tugas ini, satu commit per halaman).
- catatan: Setengah jalan dari sesi redesain (MEMORI sesi 3, langkah 6). Keadaan 2026-10-13: dihentikan saat berjalan; satu commit WIP di branch `perbaikan/r6-aturan-layar` (head b910d2e, tanpa PR, gerbang belum lolos penuh): aturan layar.mjs untuk halaman lima blok, aturan ukur-rantai (≤ 2 garis per baris data, ≤ 4 per figure, simpul tidak membungkus) dengan uji mutasi, KEPUTUSAN 319 ditulis di branch; 1.3, 1.5, 1.13, 1.28, 1.41 sudah dipendekkan. Sisa: ADR 1.4 dan 1.40 (Kebutuhan terpotong, 1.40 8 garis), M7 dan M8 tanpa visual di Gejala, halaman fitur 1.2 dan 1.7–1.10 (visual pertama terpotong 394–637 px), 1.42 island 0 px sebelum digulir. Kategori: polesan.

## Temuan kecil dari tinjauan (polesan)

- Widget alur: scroll anchoring Chromium menggeser baris tombol 22–68 px di 19/30 halaman 375 px saat tebakan lewat pointer; `overflow-anchor: none` membuatnya 0 (peninjau I5c-g, keputusan 363).
- Widget alur: label "Tebak dulu:" tetap tampil sesudah menebak (pelaksana I5c-g).
- 1.20: inline code `' OR 1=1 --` membungkus sesudah `'` di 375 px; sub `$1 = ''' OR 1=1 --'` terbaca seperti `"'` di font proporsional; label "ORDER BY $1" tanpa format kode (peninjau R4).
- 1.21: simpul Rantai Inti "ditolak" tidak menyebut siapa yang menolak; `lapisan-dasar.mdx` ±110 kalimat "Pencarian `cari=Ani` yang sama, ..." tanpa predikat (peninjau R4).
- 1.25: sub simpul `no change` di `t1-migration-dirty` sebaiknya "migrate up, output yang sama" (peninjau R5).
- 1.24: Rantai Kebutuhan membungkus 4 baris visual di 360/375 (peninjau R5; bagian R6).
- 1.15: CLS mode font telat di CI 0,063 (1366) dan 0,078 (1440), tertinggi di situs, masih di bawah 0,1; sumbernya paragraf Inti berkurang satu baris saat Satoshi datang (peninjau R3).
- Rasio lebar Satoshi Fallback/Satoshi 600 berbeda per teks (−0,95 … +0,35 % di 26 halaman), jadi metrik fallback keputusan 351 hanya rata-rata (peninjau G2c).
- 28 id `__span-*` ganda di `/tahap-1/authorization/` dan `/tahap-1/testing/`, tidak dirujuk tautan (pelaksana P6).
- `/cara-pakai/`: kalimat "diambil dari halaman yang ditonjolkan untuk peran itu" sedikit longgar untuk Generalis (jalur inti ★) (peninjau P8).
- Ekspor progres: `revokeObjectURL` 60 s untuk Safari iOS [perlu verifikasi] (keputusan 365).
- 1.13: perilaku Firestore untuk rujukan antar-dokumen masih [perlu verifikasi] (keputusan 312).
- Proses: setiap PR jalur paralel menambah baris di akhir KEPUTUSAN sehingga PR lain konflik; usulan di `plan/USULAN-PERBAIKAN.md`.
- `tools/cek_tautan.py`: `#:~:text=` internal dianggap anchor rusak, srcset `data:` dipecah di koma (rusak palsu, belum ada di dist); kunci `path` di `widgets/data/cerita.json` tidak diperiksa; `<a href>` kosong dilewati tanpa dihitung (peninjau P6, keputusan 318).
- `404.md`: menyuruh pembaca "lewat sidebar", padahal halaman splash tanpa sidebar (peninjau P6).
- `situs/tools/percobaan/percobaan-g2d.yml` baris 92 dan 99: dua langkah upload-artifact bernama sama (peninjau G2d, keputusan 367).
- G2d lanjutan: belah isi salah satu dari enam halaman yang paling sering macet untuk mencari pemicu dan reproduksi mandiri; mengirim laporan bug Chromium menunggu keputusan pemilik (keputusan 367).
