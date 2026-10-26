# Audit tampilan · redesain untuk pembaca ADHD

Dokumen kerja sesi redesain (branch `redesain/tampilan`, keputusan 164 dan 200–219). PR prototipe tidak di-merge sampai pemilik memutuskan.

Masalah dari pemilik: tampilan terlalu kaku dan padat, teks terlalu kecil dan kurang jelas, sebagian teks kurang kontras, beranda tidak memberi apa pun untuk dilakukan.

## 1. Ukuran sebelum redesain

Diukur 2026-10-09 dengan `situs/tools/audit-tampilan.mjs` (Playwright, Chromium headless) pada build produksi dari `main` (`a2084bd`), mode gelap, 1366×768 dan 375×667. Angka adalah `getComputedStyle` elemen pertama yang terlihat untuk tiap jenis teks; kontras dihitung dengan rumus luminans WCAG 2.x terhadap latar efektif. **Tebal** = di bawah 14 px.

| Jenis teks | Beranda desktop | 1.1 desktop | 1.19 desktop | 1.1 HP | 1.19 HP | Berat | Warna / latar | Kontras |
|---|---|---|---|---|---|---|---|---|
| isi (paragraf) | 17.6 | 16 | 14.7 | 16 | 14.7 | 400 | `#E6E6E6` / `#0B0B0C` | 15.76:1 |
| judul halaman (h1) | 44.8 | 35.2 | 35.2 | 24 | 24 | 600 | `#FFFFFF` / `#0B0B0C` | 19.67:1 |
| chip peran | **12.5** | **12.8** | **12.8** | – | – | 600 | `#0B0B0C` / `#7AB8FF` | 9.49:1 |
| tombol mode fokus | **13.6** | **13.6** | **13.6** | – | – | 400 | `#E6E6E6` / `#0B0B0C` | 15.76:1 |
| kotak pencarian | 14 | 14 | 14 | 20 | 20 | 400 | `#E6E6E6` / `#0B0B0C` | 15.76:1 |
| beranda: janji | 17.6 | – | – | – | – | 400 | `#E6E6E6` / `#0B0B0C` | 15.76:1 |
| beranda: kartu | 14.1 | – | – | – | – | 400 | `#A3A3A8` / `#141416` | 7.33:1 |
| beranda: peta tahap kecil | **11.8** | – | – | – | – | 400 | `#A3A3A8` / `#0B0B0C` | 7.83:1 |
| meta (baca · prasyarat) | – | **12.8** | **12.8** | **12** | **12** | 400 | `#A3A3A8` / `#0B0B0C` | 7.83:1 |
| kicker (jenis halaman) | – | **12.8** | **12.8** | **12.8** | **12.8** | 600 | `#7AB8FF` / `#0B0B0C` | 9.49:1 |
| breadcrumb | – | **13.1** | **13.1** | **13.1** | **13.1** | 400 | `#A3A3A8` / `#0B0B0C` | 7.83:1 |
| rekap fiktif | – | **13.1** | **13.1** | – | – | 400 | `#A3A3A8` / `#0B0B0C` | 7.83:1 |
| judul blok | – | 19.9 | 19.9 | 19.9 | 19.9 | 600 | `#FFFFFF` / `#0B0B0C` | 19.67:1 |
| label blok (Blok 1 dari 5) | – | **11.5** | **11.5** | **11.5** | **11.5** | 600 | `#A3A3A8` / `#0B0B0C` | 7.83:1 |
| tombol Berikutnya (blok) | – | 14.7 | 14.7 | 14.7 | 14.7 | 600 | `#0B0B0C` / `#7AB8FF` | 9.49:1 |
| navigasi bawah | – | 16 | 16 | 16 | 16 | 600 | `#FFFFFF` / `#0B0B0C` | 19.67:1 |
| sidebar: tautan | – | 14 | 14 | – | – | 400 | `#A3A3A8` / `#0B0B0C` | 7.83:1 |
| sidebar: grup | – | 16 | 16 | – | – | 400 | `#E6E6E6` / `#0B0B0C` | 15.76:1 |
| daftar isi kanan | – | **13** | **13** | 14 | 14 | 400 | `#A3A3A8` / `#0B0B0C` | 7.83:1 / 19.67:1 |

| axe-core 4.10.3 (WCAG 2.0/2.1/2.2 A dan AA) | Desktop 1366×768 | HP 375×667 |
|---|---|---|
| beranda | 0 pelanggaran | 0 pelanggaran |
| 1.1 | `color-contrast` (serious, 13 elemen) | 0 pelanggaran |
| 1.19 | `color-contrast` (serious, 13 elemen), `link-in-text-block` (serious, 1 elemen) | `link-in-text-block` (serious, 1 elemen) |

### Temuan akar masalah

1. **Teks isi tidak pernah 19 px.** Spesifikasi menulis 19–20 px desktop, tapi teks isi terukur 16 px di 1.1 dan 14,7 px di 1.19. Penyebab pertama: `tema.css` mengubah token `--sl-text-body`, padahal Starlight 0.42 menyetel ukuran artikel dari `--sl-text-base` (16 px); `--sl-text-body` tidak dipakai artikel. Penyebab kedua: aturan umum `.sl-markdown-content details { font-size: 0.92em }` (untuk kotak pertanyaan kecil) ikut mengenai setiap Blok, jadi semua isi blok mengecil ke 14,72 px.
2. **Sembilan jenis teks UI di bawah 14 px**: label blok 11,5 px, peta tahap beranda 11,8 px, meta HP 12 px, chip peran 12,5–12,8 px, kicker 12,8 px, meta desktop 12,8 px, daftar isi 13 px, breadcrumb dan rekap 13,1 px, tombol mode fokus 13,6 px.
3. **Teks sekunder `#A3A3A8` = 7,83:1** (lolos AA, tapi di bawah target baru 8:1). Kartu beranda di latar `#141416` turun ke 7,33:1.
4. **Tautan sidebar "menyusul" gagal AA**: `color: var(--teks-2)` ditambah `opacity: 0.7` membuat warna efektif `#757579` di `#0B0B0C` = 4,31:1 (dihitung dari campuran alfa). axe mencatat 13 elemen di 1.1 dan 1.19. Tautan "versi lama" juga miring (italic), yang dihindari panduan disleksia.
5. **Tautan prasyarat di meta hanya dibedakan warna** (`link-in-text-block`, WCAG 1.4.1).
6. **"Semuanya terlihat selesai" bukan dari status blok.** Logika status di `Blok.astro` benar: blok baru ditandai selesai setelah tombol Berikutnya diklik, dan pada kunjungan pertama tidak ada penanda selesai. Yang terlihat seperti progres adalah sorotan peran Generalis: setiap halaman jalur inti mendapat garis biru `box-shadow: inset 3px 0 0 var(--aksen)` di sidebar, sehingga hampir semua tautan Tahap 1 tampak "sudah". Garis hilang tepat di halaman tanpa ★ (1.8, 1.10, 1.13).
7. **Kolom kanan memakan ruang**: bawaan Starlight memberi daftar isi separuh ruang kosong; di 1920 px itu ±30% layar untuk 5–8 tautan.
8. **Beranda**: satu layar berisi teks dan tiga kartu kecil; tidak ada yang bisa dicoba, peta tahap memakai teks 11,8 px, setengah layar kosong di desktop.

Tangkapan sebelum dibuat ulang dari build `main` untuk perbandingan di bagian 5.

## 2. Riset yang dipakai

Sumber primer dibuka 2026-10-09. Yang belum bisa dicek ke sumber primer diberi label.

| Klaim | Sumber | Dipakai untuk |
|---|---|---|
| Studi Material Design (2022) dengan 184 peserta, lalu makalah CHI 2023 dengan total 459 peserta: teks gelap di latar terang dibaca lebih cepat daripada kebalikannya; efek grade (ketebalan) hanya terlihat di mode terang | [Material Design, "Adjusting Grade for Mode"](https://m3.material.io/blog/readability-research), [Palmén dkk., CHI 2023](https://dl.acm.org/doi/fullHtml/10.1145/3544548.3581552) | Berat isi tetap 400 di mode gelap (tidak ditebalkan); mode terang tetap tersedia satu klik (keputusan 201) |
| Ukuran huruf 16–19 px (1–1,2em), spasi baris sekitar 1,5; hindari garis bawah dan huruf miring, pakai tebal untuk penekanan; hindari huruf kapital untuk teks | [BDA Dyslexia Style Guide 2023](https://www.bdadyslexia.org.uk/advice/employers/creating-a-dyslexia-friendly-workplace/dyslexia-friendly-style-guide) | Isi 18 px HP dan 20 px desktop, line-height 1,7; label tanpa kapital; sidebar tanpa italic (201). Catatan: BDA menghindari garis bawah, sedangkan WCAG 1.4.1 meminta tautan dibedakan selain warna. Situs memakai garis bawah tipis 1 px bernada aksen hanya untuk tautan di dalam teks |
| Potongan teks pendek, satu ide per paragraf, ruang putih yang cukup di antara potongan supaya halaman tidak terasa berat | [W3C COGA, Making Content Usable (2021)](https://www.w3.org/TR/coga-usable/) | Blok tanpa kotak dengan garis tipis dan ruang lega (203); kepala PRD dua baris (205) |
| Durasi animasi umumnya 100–500 ms; umpan balik sederhana ±100 ms, perubahan layar besar 200–300 ms; 500 ms mulai terasa lambat | [NN/g, Executing UX Animations](https://www.nngroup.com/articles/animation-duration/); COGA untuk gerak yang hanya dipicu pembaca | Transisi buka blok 180 ms, hanya setelah klik, mati bila reduced motion (207); progres baca tanpa transisi (206) |
| Tautan di dalam teks harus dibedakan selain lewat warna | WCAG 2.2 SC 1.4.1, aturan axe `link-in-text-block` | Garis bawah tipis tautan di teks (201) |

## 3. Ukuran sesudah redesain

Diukur 2026-10-09 dengan alat dan cara yang sama di build branch `redesain/tampilan` (`3a2add4`), mode gelap. Tidak ada lagi teks di bawah 14 px di beranda, 1.1, dan 1.19.

| Jenis teks | Sebelum desktop | Sesudah desktop | Sebelum HP | Sesudah HP | Warna sesudah | Kontras sesudah |
|---|---|---|---|---|---|---|
| isi (paragraf), 1.1 | 16 | 20 | 16 | 18 | `#EDEDED` / `#0B0B0C` | 16,8:1 |
| isi (paragraf), 1.19 | 14,7 | 20 | 14,7 | 18 | `#EDEDED` / `#0B0B0C` | 16,8:1 |
| meta (baca · prasyarat) | 12,8 | 15 | 12 | 15 | `#B4B4B9` / `#0B0B0C` | 9,53:1 |
| kicker | 12,8 | 15 | 12,8 | 15 | `#7AB8FF` / `#0B0B0C` | 9,49:1 |
| breadcrumb | 13,1 | 15 | 13,1 | 15 | `#B4B4B9` / `#0B0B0C` | 9,53:1 |
| rekap tahap | 13,1 (2 kalimat) | 15 (1 kalimat) | – | – | `#B4B4B9` / `#0B0B0C` | 9,53:1 |
| judul blok | 19,9 | 30 | 19,9 | 27 | `#FFFFFF` / `#0B0B0C` | 19,67:1 |
| label blok | 11,5 | 15 | 11,5 | 15 | `#B4B4B9` / `#0B0B0C` | 9,53:1 |
| tombol Berikutnya | 14,7 di blok biru penuh | 16, tautan rata kanan | 14,7 | 16 | `#7AB8FF` / `#0B0B0C` | 9,49:1 |
| sidebar: tautan | 14 | 15 | – | – | `#B4B4B9` / `#0B0B0C` | 9,53:1 |
| chip peran | 12,8 | 15 (menu) | – | – | `#0B0B0C` / `#7AB8FF` | 9,49:1 |
| beranda: teks terkecil | 11,8 | 14 (kotak pencarian header) | 11,5 | 15 | – | – |

| axe-core 4.10.3 | Sebelum desktop | Sesudah desktop | Sebelum HP | Sesudah HP |
|---|---|---|---|---|
| beranda | 0 | 0 | 0 | 0 |
| 1.1 | `color-contrast` 13 | 0 | 0 | 0 |
| 1.19 | `color-contrast` 13, `link-in-text-block` 1 | 0 | `link-in-text-block` 1 | 0 |

Layar pertama (`situs/tools/layar.mjs`, 70 halaman × 4 ukuran): 0 gagal, 1 tipis (b3-1 lama, 1366×657, 15 px; halaman ini diganti 1.23). Gerbang `tools/cek_situs.sh` lolos.

## 4. Yang berubah, per keputusan

| No | Perubahan | Commit |
|---|---|---|
| 201 | Tipografi 20/18 px, sekunder ≥ 8:1, UI ≥ 14 px; layar pertama dipulihkan dengan merapatkan bagian atas, bukan mengecilkan teks | `eb8320c` |
| 202 | Satu kolom baca 680 px, daftar isi tersembunyi bawaan, sidebar terlipat, peran jadi menu | `227014f` |
| 203 | Blok tanpa kotak, garis tipis, judul besar; selesai hanya setelah digulir sampai akhir | `a61af02` |
| 204 | Berikutnya kecil rata kanan; judul blok sejajar teks | `7f653df` |
| 205 | Kepala PRD dua baris tanpa kotak | `46229f8` |
| 206, 207 | Progres baca tipis; ilustrasi kecil di blok cerita (PRD, M1–M3); transisi buka 180 ms | `3a2add4` |
| 208 | Beranda baru: teka-teki Rp70.000 (widget React `tebak`), peta enam tahap, kartu Lanjutkan, peran sebagai pertanyaan, pencarian masalah | `5cb9df1` |

## 5. Tangkapan sebelum dan sesudah

Beranda, 1.1, dan 1.19; 1366×768 dan 375×667; gelap dan terang. Sesuai CLAUDE.md, tangkapan tidak di-commit. Enam gambar berdampingan (sebelum di kiri, sesudah di kanan, baris atas gelap, baris bawah terang) ada di `situs/tangkapan/banding/` dan dibuat ulang dengan:

1. Bangun `main` di worktree terpisah, jalankan `npx astro preview --port 4330`.
2. Dari `situs/` di branch ini: `AXE=<axe.min.js> node tools/audit-tampilan.mjs --url http://127.0.0.1:4330 --foto <dir-sebelum>`, lalu sama dengan `--url http://127.0.0.1:4322 --foto <dir-sesudah>`.
3. Gabungkan per halaman dan ukuran (skrip PIL di catatan sesi; nama file `<halaman>-<desktop|hp>.png`).

Yang terlihat di gambar: teks isi jelas lebih besar; kotak blok dan tombol biru penuh hilang; sidebar hanya menampilkan tahap aktif; daftar isi kanan tidak lagi memakan sepertiga layar; beranda punya sesuatu untuk dicoba di layar pertama.

## 6. Usulan perubahan PROPOSAL (menunggu pemilik)

PROPOSAL dan CLAUDE.md tidak saya ubah, karena keduanya butuh persetujuan pemilik. Bagian yang tidak lagi cocok dengan keputusan 201–208:

1. **"Desain visual final", tabel warna**: teks isi `#E6E6E6` jadi `#EDEDED`; sekunder `#A3A3A8` (±7:1) jadi `#B4B4B9` gelap dan `#40454C` terang (≥ 8:1). Ukuran isi 19–20 px desktop dan 17 px HP jadi 20 px dan 18 px, line-height 1,65 jadi 1,7. Kolom 680–720 px jadi tepat 680 px.
2. **"Layar pertama"**: beranda bukan lagi satu layar penuh. Usul kalimat baru: "Layar pertama beranda memuat judul, satu kalimat, Mulai dari PRD, kartu Lanjutkan, tiga pintu, dan satu teka-teki dari cerita; peta enam tahap, peran, dan pencarian masalah ada tepat di bawahnya." CLAUDE.md `<tampilan>` perlu kalimat yang sama.
3. **"Navigasi"**: daftar isi kanan tersembunyi bawaan (tombol "Isi halaman"), kecuali layar ≥ 1600 px; pemilih peran berupa menu, bukan deretan chip; tombol Berikutnya berupa tautan kecil rata kanan, bukan tombol besar.
4. **"ADHD-friendly", aturan 1**: "Progres terlihat di tiap blok" diperjelas: status selesai hanya setelah akhir blok digulir pembaca; ditambah garis progres baca di bawah header.

## 7. Ukuran JS per halaman (tugas interaksi, butir I6)

Diukur dari `situs/dist`: jumlah byte file JS yang dirujuk tiap `index.html` (`<script src>`, `modulepreload`, `component-url`, `renderer-url`), mentah dan gzip level 9. 73 halaman.

| Tugas | Halaman | Sebelum | Sesudah | Catatan |
|---|---|---|---|---|
| I1 (keputusan 225) | 1.19 M3, 1.20 SQL injection | 307.614 B (88.149 gzip), 10 file | sama | Terberat: React + widget cari-bug |
| I1 | 1.11 Pertukaran saldo | 288.687 B (81.888 gzip), 8 file | sama | React + jumlah-total |
| I1 | Beranda | 286.058 B (80.779 gzip), 6 file | sama | React + tebak |
| I1 | Semua 73 halaman | - | sama | 280 file `dist/`, HTML/JS/CSS identik byte per byte; React Flow belum terpasang |
| I2 (keputusan 229, 230) | Semua 73 halaman | build dengan `package.json` main | sama | `motion` 14.1.0 dan `@xyflow/react` 12.12.0 terpasang tapi belum diimpor; 280 file `dist/` identik byte per byte, tidak ada `xyflow`/`framer-motion` di `dist/`. Ukuran paket sendiri (gzip, esbuild): motion lazy 28,8 KB, motion penuh 40,6 KB, React Flow 57,9 KB + `base.css` 2,4 KB |
| I3 (keputusan 231) | Halaman uji `/uji/gerak/` (baru) | - | 295.344 B (84.537 gzip), 6 file saat dimuat + `fitur` (domMax) 85.969 B (28.144 gzip) lazy | Satu-satunya halaman yang memuat motion: contoh 5,6 KB + chunk motion 11,3 KB gzip di atas React |
| I3 | 73 halaman lain | sidik I2 | 560–597 B gzip lebih kecil, jumlah file sama | Helper preload Vite pindah dari skrip pencarian ke chunk bersama karena `import()` lazy di MotionProvider; tidak ada `framer-motion` atau `ContohGerak` di HTML halaman lain |
| I4 (keputusan 232) | Halaman uji `/uji/diagram/` (baru) | - | 460.234 B (136.314 gzip), 6 file saat dimuat; CSS `diagram` 13,5 KB | Satu-satunya halaman yang memuat React Flow: chunk `DiagramArsitektur` 182.500 B (58.279 gzip) berisi React Flow + komponen; `tmp/ukur_diagram_js.py` menelusuri impor statis dan dinamis semua 74 halaman: hanya halaman ini yang menyentuh chunk berisi `react-flow__`, dan hanya halaman ini yang merujuk CSS diagram |
| I4 | Beranda, 1.11, 1.19, 1.20, `/uji/gerak/` (halaman dengan island React) | sidik I3 | 868 B gzip lebih kecil (3.748 B mentah), jumlah file sama | `react-dom` dipecah Vite menjadi chunk bersama karena island React kedua; 68 halaman lain identik ukuran JS-nya |
| I5a (keputusan 238) | 28 halaman yang memakai Blok (mis. 1.23 Transaction, 1.1 PRD v1, 1.11, 1.19) | 1.23: 22.201 B gzip; 1.1: 13.631; 1.11: 80.450; 1.19: 86.709 | +2.711 B gzip (+6.296 B mentah), +1 file: 24.912; 16.342; 83.161; 89.420 | Chunk baru berisi `animate` mini Motion (Web Animations API) + `lipat.ts` + token; tanpa React, tanpa `domMax`, tanpa React Flow |
| I5a | 47 halaman tanpa Blok (beranda, alat, uji diagram) | sidik I4 sampai 1.28 | sama; `/uji/gerak/` −17 B gzip | `tmp/sidik_dist.py` sebelum (main 12da7e3) dan sesudah, dibandingkan `tmp/banding_js_i5a.py` |
| I5b (keputusan 248) | Beranda | Byte jaringan saat dimuat 478.933 B mentah, React Flow tidak dimuat; penutupan impor 110.341 B gzip | Saat dimuat 488.186 B (+9.253: `muncul.ts` + animate mini); sesudah peta digulir masuk layar +183.649 B (React Flow); penutupan impor 173.460 B gzip | React Flow hanya lewat island `client:visible` PetaDiagram; layar pertama tidak berubah; `tmp/ukur_diagram_js.py`: hanya beranda dan `/uji/diagram/` memuat React Flow |
| I5b | 31 halaman dengan Blok (mis. 1.23), `/uji/diagram/` | Sidik langsung 1.23: 25.531 B gzip; penutupan impor 1.23: 29.813, `/uji/diagram/`: 142.652 | Sidik langsung −1.141 B gzip; penutupan impor 1.23: 30.028 (+215), `/uji/diagram/`: 142.753 | animate mini pindah ke chunk bersama dengan Tebak; sidik langsung `/uji/diagram/` turun 58.201 B karena React Flow kini chunk bersama yang diimpor island, bukan chunk island itu sendiri; 45 halaman lain identik |
| I5c (keputusan 261) | 28 halaman alur (mis. 1.9 Fitur: bayar, 1.7 Fitur: login, B9 caching) | 1.9 dan 1.7: 114.505 B (29.686 gzip), 12 file; B9: 111.169 B (28.082 gzip), 11 file | +1.675 B mentah (+767 gzip), +1 file: 116.180 (30.453); 112.844 (28.849) | Chunk `GerakAlur` (438 B gzip) mengimpor token dan animate mini yang di halaman ber-Blok sudah dimuat lipat; tanpa React. Island React akan menambah ±70 KB gzip (renderer `client` 64.838 + react, react-dom, jsx-runtime 4.979) |
| I5c | 51 halaman lain | sidik main b210335 | identik | `tmp/sidik_dist.py` sebelum dan sesudah |
| I5d (keputusan 352) | 1.11 Pertukaran saldo, 1.9 Fitur: bayar (byte jaringan saat dimuat, 375×667) | 1.11: 495.559 B (144.315 gzip), 19 file; 1.9: 225.687 B (63.747 gzip), 19 file | 1.11: 497.026 B (145.234 gzip), 22 file; 1.9: 227.882 B (64.897 gzip), 22 file | Tiga chunk kecil: `angka` (418 B gzip), `cubic-bezier` (288), `token` (171, kini dipakai bersama island dan skrip); tanpa `animate` hybrid, tanpa motion/react di island jumlah-total |
| I5d | 79 halaman (rujukan langsung `index.html`, main ba6740a) | sidik main | 1.11 +165 B gzip; 28 halaman alur +20–21 B gzip; 19 halaman lain +1 B gzip (hash chunk bersama); 29 halaman identik | `tmp/sidik_i5d.py` sebelum dan sesudah, jumlah file sama |
| I5e (keputusan 353) | B3.2 Race condition dan lock (satu-satunya halaman race) | 75.552 B (27.495 gzip), 14 file (rujukan langsung `index.html`, termasuk `/widgets/*.js`) | 79.077 B (28.806 gzip), 15 file | `race.js` 8.924 → 12.259 B (garis waktu dua lajur); chunk `GerakRace` kecil memakai `muncul` dan animate mini yang sudah ada; tanpa React, tanpa React Flow |
| I5e | 79 halaman lain | sidik main 1ab6f05 | identik | `tmp/sidik_i5e.py` sebelum dan sesudah |
| I6-erd (keputusan 460–467) | Halaman uji `/uji/erd/` (baru) | - | 174,0 KB gzip sesudah tinjauan (577,4 KB mentah, 17 file sebelum tinjauan) | Satu-satunya halaman yang memuat ErdTumbuh; pembanding `/uji/diagram/` 166,2 KB gzip; 1.12 (54,5 KB) dan `/cerita/` (45,3 KB) tidak memuat React Flow; diukur `ukur-erd.mjs` |
| A11y-diagram (keputusan 680) | Beranda, `/uji/diagram/`, 1.36 Tim dan infra (penutupan impor statis dari `index.html`, gzip level 9, `tmp/ukur_diagram_js.py`) | 174.591; 143.292; 168.686 B gzip | 174.687; 143.388; 168.782 B gzip (+96 masing-masing) | Chunk island `DiagramArsitektur` 5.185 → 5.441 B mentah: `domAttributes` node dan edge + `useLayoutEffect` yang menyembunyikan lapisan svg garis; React Flow (`base`, 56.552 B gzip) tidak berubah; hanya ketiga halaman ini dan `/uji/erd/` yang memuat React Flow |
| A11y-diagram | 82 halaman lain, termasuk `/uji/erd/` | sidik main ebb5482 (`tmp/sidik_dist.py`) | identik | Rujukan langsung `index.html` sama di 85 halaman; penutupan impor berbeda hanya di tiga halaman di atas |
| Tinjauan #274 (keputusan 681–682) | Beranda, `/uji/diagram/`, 1.36 Tim dan infra (cara ukur sama) | 174.687; 143.388; 168.782 B gzip (head PR 31e3c24, diukur ulang, sama dengan baris A11y-diagram) | 174.699; 143.402; 168.796 B gzip (+12, +14, +14) | Chunk `DiagramArsitektur` 5.441 → 5.481 B mentah: `aria-label` pembungkus application (682); `pointer-events` kotak (681) hanya CSS; penutupan impor 85 halaman dibandingkan, 82 lainnya identik |
| G-istilah (keputusan 685–691) | `/alat/glosarium/` (penutupan impor statis dari `index.html` termasuk `component-url`, gzip level 9 per file) | 85.261 B (19.852 gzip), 9 file: head ini dikurangi selisih `istilah.js` dan `istilah-data.js` terhadap origin/main 7719637 | 88.225 B (21.205 gzip), 9 file | `istilah-data.js` +3.013 B (+1.377 gzip): 10 kunci tooltip baru (debit, kredit, jurnal, tutup buku, ERP) dan field `h`; `istilah.js` −49 B (id baris pindah ke plugin remark). Kedua file dimuat setiap halaman berartikel, jadi semua halaman itu naik 1.353 B gzip |
| G-istilah | Lima halaman istilah baru `/istilah/<slug>/` | - | 77.493 B (17.400 gzip), 8 file, masing-masing | Tanpa island: hanya skrip Starlight (pencarian, daftar isi) dan tooltip; tidak ada `xyflow` dalam penutupan impor (React Flow tidak dimuat). Lebih ringan dari Glosarium karena tanpa widget umpan balik |
| Tinjauan #281 (keputusan 702) | `/alat/glosarium/`, lima halaman `/istilah/<slug>/` (penutupan impor statis dari `index.html`, gzip level 9 per file, diukur ulang di head PR) | Glosarium 88.237 B; istilah 77.505 B (sesudah dikurangi selisih `istilah.js`; 12 B di atas baris G-istilah karena cara ukur) | Glosarium 90.525 B (21.924 gzip), 9 file; istilah 79.793 B (18.119 gzip), 8 file | `istilah.js` 6.475 → 8.763 B (2.335 → 3.050 gzip, +715): Tab dari istilah ke tautan popover, Shift+Tab dan Esc kembali ke istilah. File ini dimuat setiap halaman berartikel, jadi semuanya naik 715 B gzip; tanpa `xyflow` di kedua jenis halaman |
| ERD-1.12 (keputusan 697–700) | 1.12 Data modeling: byte jaringan (`ukur-erd.mjs`, 1366×657, gzip per respons) | Saat dimuat dan digulir sampai bawah 202,2 KB mentah (56,6 KB gzip), 17 file; React Flow tidak dimuat | Saat dimuat sama: 56,6 KB gzip, 17 file, React Flow tidak dimuat (blok Paham tertutup); sesudah semua blok dibuka 609,9 KB mentah (186,6 KB gzip), 24 file | Naik ±130 KB gzip hanya saat blok Paham dibuka: chunk React Flow bersama (`base`), island `ErdTumbuh` (React Flow + widget), dan `client` React. Di atas 30%, dengan alasan: 1.12 sekarang halaman diagram (naskah Tahap 2: widget ERD bertumbuh dipasang di 1.12); pembaca yang tidak membuka Paham tidak mengunduhnya |
| ERD-1.12 | 1.12; `/uji/erd/`; 90 halaman lain (penutupan impor statis dari `index.html` termasuk `component-url`, gzip level 9 per file, `tmp/ukur_diagram_js.py` dengan daftar halaman lain) | 1.12: 113.295 B (31.409 gzip), 16 file; `/uji/erd/`: 503.182 B (153.393 gzip), 16 file (origin/main d39df6a) | 1.12: 530.738 B (164.205 gzip), 23 file; `/uji/erd/`: 503.497 B (153.539 gzip, +146); 90 halaman lain identik | Penutupan impor menghitung island yang baru diunduh saat terlihat, jadi lebih besar dari byte jaringan saat dimuat. `/uji/erd/` naik karena `aria-hidden` lapisan garis, `aria-label` application, dan `children` (keputusan 698, 699); `pointer-events` hanya CSS. Halaman yang memuat React Flow: beranda, 1.12, 1.36, `/uji/diagram/`, `/uji/erd/` |
| A11y-gulir-tabel (keputusan 712, 714) | 92 halaman berartikel (rujukan langsung `index.html`: `<script src>`, `modulepreload`, `component-url`, `renderer-url`) | sidik origin/main d39df6a | Rujukan file JS identik di 92 halaman; HTML tiap halaman +794 B skrip modul inline (425 B gzip level 9) | Skrip wadah tabel gulir dari `MarkdownContent.astro`, diinline Vite karena kecil; halaman tanpa tabel ikut memuatnya dan langsung berhenti (polesan di SETELAH-TAHAP-2). Tidak ada React atau `xyflow` baru |
| W2-race (keputusan 707–711) | Halaman uji `/uji/race/` (baru): byte jaringan saat dimuat dan digulir sampai bawah, 1366×657, gzip per respons (`ukur-race.mjs` baris info) | - | 19 file, 494,0 KB mentah, 144,3 KB gzip sesudah gabung main f57acc6 (143,8 KB di atas daed2f2); penutupan impor statis 18 file, 410.191 B (120.512 gzip); HTML 113.567 B (16.228 gzip). Diukur ulang peninjau di atas f57acc6 sesudah perbaikan fokus (keputusan 715): jaringan 19 file, 494,1 KB mentah, 144,3 KB gzip; penutupan 18 file, 412.123 B (121.029 gzip); HTML 114.183 B (16.639 gzip); B3.2 +187 B dan 1.11 +160 B gzip terulang, 96 dari 99 halaman identik | Island `RaceLedger` 11.478 B (4.090 gzip; 11.494 B, 4.098 gzip sesudah keputusan 715), tanpa Zod (rekaman divalidasi saat build) dan tanpa React Flow; sisanya React (`client`) dan skrip Starlight. HTML besar karena props enam replay; halaman dengan dua replay lebih kecil |
| W2-race | B3.2 Race condition dan lock (widget race lama), 1.11 Pertukaran saldo; 91 halaman lain (penutupan impor statis dari `index.html` termasuk `component-url` dan `/widgets/*.js`, gzip level 9 per file, `tmp/ukur_js_w2.py` atas build origin/main daed2f2 dan branch) | B3.2: 26 file, 168.197 B (50.888 gzip); 1.11: 21 file, 410.188 B (121.364 gzip) | B3.2: 27 file, 168.564 B (51.075 gzip, +187); 1.11: 22 file, 410.257 B (121.524 gzip, +160); 91 halaman lain identik | B3.2: `race.js` 12.259 → 12.575 B (dt pembaca layar, keputusan 707) dan `masukLangkah` jadi chunk bersama dengan RaceLedger; 1.11: `rupiah` dari `jumlah-total/logika.ts` jadi chunk bersama. Tidak ada halaman baru yang memuat React Flow |
| W3-pool (keputusan 980, 981) | Halaman uji `/uji/pool/` (baru): byte jaringan saat dimuat dan digulir sampai bawah, 1366×657, gzip per respons (`ukur-pool.mjs` baris info); `dist/` hasil `bun run --cwd situs build` | - | 16 file, 421,8 KB mentah, 125,9 KB gzip (421,1 KB dan 125,7 KB sebelum penjaga masukan, keputusan 982); HTML 95.537 B (16.712 gzip); pembanding `/uji/race/` 19 file, 144,3 KB gzip | Island `PoolLittle` 11.271 B (3.736 gzip; 10.618 B dan 3.491 sebelum `periksaMasukan`, keputusan 982), tanpa Zod (rekaman dan teks divalidasi saat build) dan tanpa React Flow; sisanya React (`client`, `react-dom`) dan `motion/mini` lewat `muncul`. Chunk hanya dirujuk `/uji/pool/` (`grep -rl PoolLittle situs/dist`: satu berkas), jadi JS halaman lain tidak berubah. CSS widget 47 baris di `tema.css` (+4.781 B mentah, ±1,3 KB gzip) ikut stylesheet bersama semua halaman. Halaman 3.6 dan 3.8 memasang komponen yang sama dan ukurannya dicatat di PR halamannya |
| 2.9 Skema data (keputusan 632) | 2.9: byte jaringan (`ukur-erd.mjs`, 1366×657, gzip per respons; tanpa gulir: skrip Playwright yang sama tanpa `scrollBy`) | Halaman baru; pembanding 1.12 (skema Tahap 1): saat dimuat 57,3 KB gzip, 17 file, React Flow tidak dimuat; semua blok dibuka 187,4 KB gzip, 24 file | Saat dimuat tanpa gulir 49,8 KB gzip, 14 file, React Flow belum dimuat (375 dan 1366); sesudah digulir sampai ERD 682,8 KB mentah (205,7 KB gzip), 23 file, sama dengan semua blok dibuka | +9,8% dari 1.12 dengan semua blok dibuka. Saat digulir +259% dari 1.12 tertutup, dengan alasan: ERD bertumbuh ada di blok Coba yang terbuka (naskah: 2.9 memakai widget ERD bertumbuh, Coba wajib widget), dan widget Tebak memakai React yang sama; React Flow tetap baru diunduh saat diagram terlihat (`client:visible`) |
| W3-outbox (keputusan 983) | Halaman uji `/uji/outbox/` (baru): byte jaringan saat dimuat dan digulir sampai bawah, 1366×657, gzip per respons (`ukur-outbox.mjs` baris info) | - | 16 file, 415,7 KB mentah, 123,9 KB gzip (kelima skenario); island `OutboxWorker` 5.032 B (1.690 gzip), tanpa Zod dan tanpa React Flow; HTML 258.264 B (22.970 gzip level 9, diukur ulang sesudah tinjauan: label Asumsi dan (dihitung)) | Hasil tiap pengaturan dihitung saat build dan dikirim sebagai props: 6 sampai 30 KB mentah (1 sampai 2 KB gzip) per skenario, jadi halaman dengan satu skenario jauh lebih kecil dari halaman uji. `tema.css` +2,9 KB mentah (+0,4 KB gzip, 25.518 → 25.945 B gzip) di setiap halaman; tidak ada halaman lain yang memuat island (`grep -rl OutboxWorker situs/dist` hanya `/uji/outbox/`) |
| W3-cache (keputusan 986, 987) | Halaman uji `/uji/cache/` (baru): byte jaringan saat dimuat dan digulir sampai bawah, 1366×657, gzip per respons (`ukur-cache.mjs` baris info); `dist/` hasil `bun run --cwd situs build` sesudah gabung main b0baec0 | - | 16 file, 422,7 KB mentah, 126,2 KB gzip; HTML 99.216 B (17.464 gzip level 9), diukur ulang sesudah tinjauan (alasan tebakan di luar daerah status); pembanding `/uji/pool/` 125,9 KB gzip dan `/uji/outbox/` 123,9 KB gzip | Island `CacheInvalidation` 12.230 B (4.073 gzip), tanpa Zod, tanpa pembaca rekaman, dan tanpa React Flow (dijaga `penjaga.test.ts` dan `ukur-cache.mjs`); sisanya React (`client`, `react-dom`) dan `motion/mini` lewat `muncul`. Simulasi dihitung di island (`logika.ts`, murni dan kecil), jadi tidak ada hasil yang dikirim sebagai props selain teks. Chunk hanya dirujuk `/uji/cache/` (`grep -rl CacheInvalidation situs/dist`: satu berkas). CSS widget 44 baris di `tema.css` (+4.620 B mentah, 1.246 B gzip) ikut stylesheet bersama semua halaman. Halaman 3.19 memasang komponen yang sama dan ukurannya dicatat di PR halamannya |
