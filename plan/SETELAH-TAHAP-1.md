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
- Peta cerita: garis putus-putus kartu Tahap 6 tipis di mode terang (dekorasi; teks "proyeksi, belum ditulis" sudah ada) (peninjau P5, keputusan 320).

## Temuan polesan dari X1

Dari crosscheck X1 (keputusan 370). Bukti di `tmp/crosscheck/x1a.md`, `x1b.md`, `x1c.md` (lokal, di-gitignore). Temuan yang sudah ada di atas (id `__span-*` ganda, Firestore 1.13, ilustrasi latar P4, Rantai R6) tidak diulang.

- 1.8 dan 1.10: lab naskah `b2-model` dan `b2-query` diganti `api-t1` tanpa nomor keputusan (135, 136, 139, 141 tidak menyebutnya). Usulan: satu baris keputusan yang merujuk alasan keputusan 145 (x1a).
- Judul ADR tidak seragam: title 1.4 tanpa "ADR 1:", sedangkan 1.24 dan 1.40 memuat nomor ADR. H1 1.24 juga beda dari judul registry yang dipakai sidebar, Sebelumnya/Berikutnya, dan breadcrumb. Usulan: satu pola untuk ketiganya, cek `ukur-judul.mjs` di HP (x1a, x1c).
- `labs/api-t1/internal/service/bayar.go:22-41`: akun warung bisa memanggil `POST /transfers`. Ke diri sendiri jadi `500` dari `CHECK (dari <> ke)`, ke warung lain `201`. Halaman tidak menjanjikan larangan; perbaikan menunggu keputusan pemilik (x1a).
- `cerita/tahap-2.mdx:11` sesudah 1.42: 1.42 menjanjikan PRD v2 dan ADR 5–6 di awal Tahap 2, Tahap 2 lama tidak memuatnya. Penanda "(versi lama)" breadcrumb tersembunyi di HP (`tema.css:193`). Opsional: satu kalimat di blok "Menuju Tahap 2" (x1a).
- `Ilustrasi.astro:22-128`: 24 elemen `<text>` SVG di ilustrasi prd dan m1–m6, lawan PROPOSAL baris 557 (keputusan 207). Menunggu pemilik (x1a).
- `PilihTema.astro:11-19`: tema terang dipilih lewat `<select>`, dua interaksi; PROPOSAL menulis satu klik (keputusan 119) (x1a).
- Indeks masalah hanya ada di beranda, `cerita/peta.mdx`, dan Pagefind; PROPOSAL baris 509 juga menyebut sidebar (x1a).
- `Blok.astro:54`: Berikutnya di blok terakhir tanpa perkiraan menit, PROPOSAL baris 508 memintanya (x1a).
- `ThemeProvider.astro:13-14`: `localStorage.getItem` tanpa try/catch. Di peramban yang memblokir storage, `PilihTema` ikut gagal; default gelap tetap berlaku dari `:root`. Sama dengan kode Starlight 0.42.5 (x1a).
- `Beranda.astro:225-231`: tab peta tahap hanya menerima panah kiri dan kanan, tanpa Home/End (pola tab WAI-ARIA, opsional) (x1a).
- Daftar isi kanan memuat "Inti" di 24 halaman (`astro.config.mjs:41`, level 2), PROPOSAL baris 510 menulis hanya lima blok (x1a).
- Coba pilah tanpa "ubah satu hal" dan chip sumber di 1.2, 1.3, 1.16, 1.21, 1.32, 1.39: `pilah.js` tanpa `predict`, `varian`, atau `BB.sumberChip`. Usulan: field `sumber` opsional, pengecualian "ubah" dicatat di KEPUTUSAN (x1b).
- Coba banding tanpa "tebak dulu" dan chip di 1.4 (`adr-1-backend-sendiri.mdx:71`) dan 1.6; 1.13 sudah punya tebakan `<details>`, tetap tanpa chip. Usulan: `<details>` "Tebak dulu" seperti 1.13, `sumber` di `banding.js` (x1b).
- Coba runsql tanpa chip sumber di 1.8, 1.10, 1.12, 1.14, 1.22, 1.24; label hanya di teks. Usulan: chip "Ilustrasi" di kepala runsql, atau label teks diterima lewat keputusan (x1b).
- 1.23 `transaction.mdx:41-45`: Coba stackstep tanpa "tebak dulu". Usulan: satu `<details>` sebelum widget (x1b).
- 1.41 `rekap.mdx`: Coba kartu tanpa "ubah satu hal" dan chip. Usulan: dicatat sebagai pengecualian bentuk rekap (x1b).
- Widget di luar Coba tanpa chip: 1.3 hp, 1.16 stackstep, 1.28 pilah, 1.29 banding, 1.32 stackstep, 1.39 banding (`x1b-widget-luar-coba.txt`). Ikut perbaikan pilah, banding, dan stackstep (x1b).
- 1.23 `transaction.mdx:74` dan `:85`: "PHP 8.5.8" dan "Python 3.14.7" tidak ada di rekaman. Usulan: `labs/b3-stack/rekam.py` mencetak versi runtime di kepala output (x1b).
- 1.10 `fitur-saldo.mdx:43`: label "PostgreSQL 18" bertaut ke `/docs/current/`, lab memakai 17.11. Usulan: `/docs/17/`, pola 1.40 baris 46 (x1b).
- 1.13 `sql-atau-nosql.mdx:123`: "cache atau antrean" jadi "cache atau queue" (x1b).
- 13 peringatan panjang audit bahasa di 7 halaman: 1.19:21; 1.26:71, :87; 1.29:22, :149, :151, :233; 1.31:105; 1.33:150; 1.35:171; 1.39:3, :69, :143 (`audit.txt`) (x1b).
- `tools/audit_bahasa.py:31`: `EXTRA_GLOBS` tidak mencakup `situs/data/widget/` dan `situs/data/diagram/` (62 file; audit manual 0 error, 7 peringatan). Usulan: `situs/data/**/*.json` (x1b).
- runsql memakai sql.js (SQLite), bukan PGlite (keputusan 144 menunda). Di 1.12 panel Before memperlihatkan FK yang tidak ditegakkan. Usulan: satu kalimat di Coba 1.12 bahwa PostgreSQL selalu menegakkan foreign key (x1b).
- 1.22–1.40 (19 halaman): entri aktif sidebar di bawah lipatan 1366×657 (top 639–1410 px), juga sesudah Berikutnya. Usulan: `scrollIntoView({ block: "center" })` di panel sidebar saat dimuat (x1c).
- 1.32, 1.41, 1.33: sisa layar pertama 375×667 20, 21, dan 24 px, batasnya 20. Tanpa tindakan sekarang; siapa pun yang mengubah kepala halaman atau Inti ketiganya harus mengukur ulang (x1c).

## Temuan polesan dari perbaikan XF

- Beranda (XF4, #243): live region hasil pencarian masalah membacakan semua judul yang cocok (sampai 5) di setiap ketikan; pola lebih tenang menurut WCAG ARIA22 contoh 1: `role="status"` hanya berisi ringkasan ("3 halaman cocok") dan list di luar region, ditambah debounce ±300–500 ms. `statusTahap` akan menulis "Selesai: 0 halaman" untuk tahap non-lama tanpa halaman bernomor (belum terjadi).
- `labs/api-t1/run.py` m3 (XF1, #245, keputusan 371): query rentan tanpa ORDER BY, jadi urutan akun 400/418/419 di body tidak diperiksa, hanya isinya; komentar "Angka 104 juga ditulis di prosa 1.19" kurang tepat (prosa menulis 100 + 3 + 1).
- Halaman Cerita (XF2, #246, keputusan 372): baris 372 belum punya "Sumber:" dan "Salah bila:" eksplisit; `cerita/index.mdx` ±68 "Setiap tahap mengikuti urutan yang sama" sebaiknya "Tahap 1 mengikuti …, tahap berikutnya akan mengikuti pola yang sama" (naskah ±71); Rantai tokoh ±809 px di HP; panah sesudah "Enam kota" menggantung di akhir baris bb-flow (sudah ada sebelum XF2).
- Task list (XF6, #247, keputusan 374): bila nanti ada butir `- [x]`, status centangnya ikut tersembunyi dari pembaca layar; "salah bila" di 374 sebaiknya menyebut kasus ini.

## Temuan polesan dari ERD1 (#253, keputusan 375)

- `tools/erd.py --cek` lolos bila isi JSON diubah tangan dengan format sah (tipe kolom diganti `integer`); hash hanya menutup file sumber, bukan kode `erd.py`. Usul: job CI dengan service PostgreSQL yang membangun ulang lalu membandingkan (dicatat juga di ERD2).
- `hitung_selisih` mengabaikan perubahan CHECK dan index; urutan tabel `ORDER BY oid`; tabel partisi akan tampil terpisah; policy, fungsi, dan trigger tidak dibaca.
- 1.12 desktop: figure ERD dan catatannya ±1018 px, lebih lebar dari kolom teks; "Garis menandai 7 foreign key" padahal terlihat 4 garis; subjudul dan figcaption hampir sama, "Diagram ini dibangun dari" muncul dua kali; diagram menulis `bigint` sedangkan snippet menulis `bigserial`.
- Ligatur JetBrains Mono hanya dimatikan di ERD; snippet lain masih menampilkan `>=` sebagai ligatur.
- Tanpa `.gitattributes`, checkout CRLF mengubah hash sumber ERD.

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- 1.12 di 375×667: petunjuk "Pilih tabel untuk membaca kolom lengkap dan halaman yang menjelaskannya." ada di bawah diagram, ±1.400 px di bawah judulnya, jadi pembaca HP baru tahu tabel bisa diketuk sesudah melewati seluruh diagram (keputusan 697). Usul: petunjuk satu baris di bawah judul figure, tingginya dipesan sejak SSR.
- 1.12 di 1366×657: dua garis `koreksi` → `akun` (edge `jalur`, keputusan 463) mengitari baris tengah dari kiri dan kanan, sehingga tampak seperti bingkai di sekeliling `sesi`, `topup`, dan `transaksi`.
- 1.12 sesudah hydrate: kalimat Erd.astro "Garis menandai 7 foreign key, semuanya menunjuk ke akun.id" dan nama file sumbernya hanya untuk pembaca layar; pembaca yang melihat tinggal chip "Rekaman lab · PostgreSQL 17". Usul: kalimat itu di bawah diagram ErdTumbuh juga, bila pemilik ingin mempertahankannya.
- 1.12 sebelum hydrate (JS aktif, island belum dimuat): Erd.astro (1.577 px di 375, 1.011 px di 1366) dipotong `max-height` setinggi pesanan React Flow (996 dan 700 px), jadi hanya 2–3 dari 5 tabel terlihat sampai chunk ±130 KB gzip selesai; bila chunk gagal dimuat, potongan itu menetap. Tanpa JS tingginya bebas dan utuh (tinjauan #285, `scripting: enabled` di erd-tumbuh.css). Usul: penanda "memuat diagram" di tepi potongan, atau ErdHalaman memesan tinggi Erd.astro bila lebih tinggi dari tata React Flow.
