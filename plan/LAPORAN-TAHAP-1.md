# Laporan Tahap 1

Laporan ini menutup Tahap 1 sebelum tinjauan pemilik (keputusan 369). Tiga bagian pertama ditulis X2 dan dibaca lebih dulu. Bagian crosscheck sesudahnya ditulis X1 (keputusan 370).

## Apa yang selesai

Diperiksa X2 di main `51d9870`, 2026-10-13. Angka diambil dari registry `situs/data/cerita.json`, isi `situs/` dan `labs/`, `plan/STATUS.md`, dan bagian X1 di bawah.

1. Tahap 1 punya 42 halaman bernomor 1.1–1.42, sesuai peta naskah. Semuanya `ada` di registry, dan tidak ada yang masih versi lama.
2. Per jenis di registry: 23 konsep, 8 masalah (M1–M8), 5 fitur ke teknis, 3 ADR, 2 PRD, dan 1 tim-infra.
3. Tujuh halaman konsep memuat ADR, tiga di antaranya halaman keamanan (1.20, 1.29, 1.35). ADR 1–12 tersebar di 10 halaman.
4. Halaman Tahap 1 merujuk enam lab: `api-t1`, `b1-openapi`, `b3-stack`, `b4-migration`, `b5-rls`, dan `f2-review`. Repo memuat 26 lab.
5. `api-t1` punya 23 rekaman di `labs/api-t1/output/` dan mode rentan m1, m3, m4, m5. Lab naskah `b2-model` dan `b2-query` diganti rekaman `api-t1`.
6. Widget React: `jumlah-total` (1.11), `cari-bug` (1.19, 1.20), `kalkulator` (1.37, 1.38), dan `tebak` (1.42, beranda). Diagram arsitektur React Flow dipakai di 1.36 dan peta beranda.
7. Widget lama terpasang 44 kali: alur 16, pilah 7, runsql 6, banding 5, umpan-balik 5, stackstep 3, kartu 1, hp 1. Halaman Tahap 1 juga memuat 50 Rantai dan 215 Snippet.
8. Ilustrasi `prd` dan `m1`–`m6` di `Ilustrasi.astro` memakai token gelap dan terang. Ilustrasi latar perusahaan belum ada (P4).
9. Gerbang `bash tools/cek_situs.sh --layar` tanpa browser memeriksa registry, antrean, tabel plan, istilah, audit bahasa, build strict, ID internal, tautan, kontras, tipe, dan tes.
10. Pemeriksa tabel plan, tautan, dan kontras punya uji lolos palsu. Uji itu membuktikan pemeriksanya bisa gagal.
11. Sepuluh alat ukur browser berjalan dalam tiga kelompok `KELOMPOK_UKUR`: layar, judul, ilustrasi, rantai; gerak; diagram, cls, kontras, luapan, alur. Halaman yang macet menghentikan alat dengan baris `MACET`.
12. CI menjalankan pemeriksa pesan commit, gitleaks, satu build, lalu tiga job ukur atas artefak `situs-dist` (keputusan 357). Job deploy Cloudflare Pages dilewati selama secret belum ada.
13. Gerbang X1 di `c58d904` lolos: build 0 warning, audit bahasa 0 error, kontras 735/735, Vitest 189/189, widget lama 141/141, 10.925 tautan internal tanpa yang rusak.
14. Layar pertama beranda (keputusan 208) berisi judul, satu kalimat, "Mulai dari PRD", dan tiga pintu (Cerita, Peran, Masalah). Teka-teki M4 dan peta enam tahap ada sesudahnya.
15. Navigasi: sidebar per tahap, pemilih lima jalur, breadcrumb "Kamu di sini", mode fokus, gelap default dan terang (keputusan 119, 120), serta pencarian Pagefind.
16. Progres pembaca tersimpan di localStorage tanpa akun. Kartu ulang dan Peta cerita membacanya (P5), dan `/cara-pakai/` punya ekspor dan impor (keputusan 365).
17. Halaman `/cerita/` ditulis ulang dari naskah Tahap 1: Grup Lestari, enam tokoh, enam tahap, Tahap 6 sebagai proyeksi (XF2, keputusan 372).
18. Crosscheck berjalan per lima halaman (K0–K3), lalu X1 untuk seluruh Tahap 1. Tujuh perbaikan dari X1 selesai lewat enam PR (#242–#247).
19. Lingkup dibekukan 2026-10-13 (keputusan 369). Tahap 2 belum dimulai dan menunggu `plan/CERITA-TAHAP-2.md`.

### Cek akhir X2

Delapan halaman ditangkap ulang dari build `51d9870`, masing-masing 4 varian. Hasilnya 32/32 tanpa scroll horizontal dan tanpa error konsol. Satu gambar per halaman dilihat langsung, campuran HP dan desktop, gelap dan terang. Semua lolos tes 3 detik; catatan di kolom terakhir sudah tercatat sebagai polesan.

| Halaman | Varian | Di mana | Baca dulu | Ke mana | Catatan |
|---|---|---|---|---|---|
| `/` | HP gelap | Nama situs dan judul | Satu kalimat di bawah judul | "Mulai dari PRD", lalu tiga pintu | - |
| `/tahap-1/prd-v1/` | desktop terang | Breadcrumb Tahap 1 › PRD, entri sidebar disorot | Paragraf Sinta dan kepala PRD | Latar masalah, blok 1 dari 7 | - |
| `/tahap-1/fitur-bayar/` | HP terang | Breadcrumb Fitur ke teknis | Target PRD: bayar dalam 5 detik | Prasyarat 1.8, lalu gulir | Peta alur di bawah lipatan (R6) |
| `/tahap-1/m4-rp70000-hilang/` | desktop gelap | Breadcrumb sampai "minggu 3" | Ilustrasi Gejala dan adegan Budi | Gejala, blok 1 dari 5 | Entri aktif sidebar di tepi bawah (polesan X1) |
| `/tahap-1/transaction/` | HP gelap | Breadcrumb Tahap 1 dan H1 | Inti satu kalimat dan Rantai commit/rollback | Mulai, blok 1 dari 5 | - |
| `/tahap-1/adr-transaction-koreksi/` | desktop terang | Breadcrumb sampai "ADR 5 dan 6" | Kebutuhan dan Rantai dua pertanyaan PRD | Blok 1 dari 6 | Judul ADR tidak seragam (polesan X1) |
| `/tahap-1/jembatan-prd-v2/` | desktop gelap | Breadcrumb Jembatan ke Tahap 2 | Pembuka dan kepala PRD v2 | Pratinjau PRD v2, blok 1 dari 4 | - |
| `/cerita/` | HP terang | Breadcrumb Pembuka dan H1 | Inti dan Rantai enam tahap | Perusahaan dan aplikasinya | Panah sesudah "Enam kota" menggantung (polesan XF2) |

## Setelah Tahap 1

Daftar lengkap ada di `plan/SETELAH-TAHAP-1.md`: 5 tugas dan 47 temuan polesan. Semuanya menunggu tinjauan pemilik, dan tidak ada yang sedang dikerjakan.

### Tugas yang dipindah dari ANTREAN

| Tugas | Isi | Keadaan |
|---|---|---|
| G2c | Pagar lebar font fallback di CI | PR #232 terbuka, branch `perbaikan/g2c-pagar-font`, head `7f992ee`. Konflik dengan main di `plan/KEPUTUSAN.md` dan `KELOMPOK_UKUR`; CI head terakhir belum jalan |
| R6 | Visual wajib di layar pertama | Branch `perbaikan/r6-aturan-layar`, head `b910d2e`, satu commit WIP tanpa PR. Sisa: ADR 1.4 dan 1.40, M7, M8, fitur 1.2 dan 1.7–1.10, 1.42 |
| I5f | Diagram arsitektur di halaman tahap dan ADR | Antre, belum dimulai |
| P4 | Ilustrasi latar perusahaan di 1.1 | Antre. Menunggu jawaban pemilik di X1 (d) butir 2 |
| G2e | Ulang sekali yang sama untuk ukur-cls | Antre. Pencegahan: ukur-cls belum pernah gagal karena macet sejak G2b |

### Temuan polesan

Per sumber: 18 dari tinjauan PR, 25 dari X1, dan 4 dari perbaikan XF. Per area:

- Widget dan blok Coba: chip sumber, "tebak dulu", dan "ubah satu hal" belum ada di pilah, banding, runsql, stackstep, dan kartu. Widget alur bergeser karena scroll anchoring di HP.
- Lab dan klaim: runsql memakai SQLite, jadi foreign key di Coba 1.12 tidak ditegakkan. Versi runtime 1.23 tidak ada di rekaman, dan urutan akun m3 tidak diperiksa.
- Teks halaman: 13 peringatan kalimat panjang di tujuh halaman, judul ADR tidak seragam, serta perbaikan kecil di 1.20, 1.21, 1.25, `/cerita/`, dan 404.
- Navigasi dan tampilan: entri aktif sidebar di bawah lipatan di 1.22–1.40, dan tema terang dipilih lewat `<select>` (dua interaksi). Indeks masalah tidak ada di sidebar, dan layar pertama 1.32, 1.33, 1.41 tipis.
- Alat dan gerbang: rusak palsu di `tools/cek_tautan.py`, cakupan `tools/audit_bahasa.py`, id `__span-*` ganda, dan lanjutan G2d.
- Menunggu pemilik: teks di dalam SVG ilustrasi, dan akun warung yang bisa memanggil `POST /transfers`.
- Proses: baris KEPUTUSAN yang selalu konflik antar-PR paralel. Usulannya di `plan/USULAN-PERBAIKAN.md`.

## 10 hal teratas untuk dilihat pemilik

Urutannya dari yang paling penting. Setiap butir menyebut halaman, apa yang dilihat, dan pertanyaan untuk pemilik. Keputusan lain yang menunggu ada di X1 (d) dan `plan/MEMORI.md`.

1. **Preview dari HP**, `/` lewat URL Cloudflare Pages. Job `deploy` selalu dilewati karena secret belum ada (keputusan 115). Membuka preview dari HP adalah syarat selesai Tahap 1. Pertanyaan: kapan `CLOUDFLARE_API_TOKEN` dan `CLOUDFLARE_ACCOUNT_ID` dipasang lewat `gh secret set`?
2. **Beranda di HP**, `/` di 375×667. Layar pertama berisi judul, satu kalimat, "Mulai dari PRD", dan tiga pintu. Peta enam tahap ada sesudahnya, di luar layar pertama yang diperiksa `layar.mjs`. CLAUDE.md `<tampilan>` memintanya di layar pertama. Pertanyaan: susunan keputusan 208 diterima, dan usulan `plan/AUDIT-TAMPILAN.md` bagian 6 boleh masuk PROPOSAL dan CLAUDE.md?
3. **Halaman Cerita**, `/cerita/`. Halaman pembuka jalur inti ini baru ditulis ulang di XF2. Isinya Grup Lestari, enam tokoh, dan tabel enam tahap; halaman menulis terbuka bahwa Tahap 2–5 masih versi lama. Pertanyaan: isinya sesuai maksud naskah, dan kolom masalah Tahap 2–6 yang baru garis besar boleh tampil?
4. **Rasa membaca**, `/tahap-1/m4-rp70000-hilang/` dari HP, dari Gejala sampai Konsep yang lahir. Gerbang hanya mengukur letak, kontras, dan luapan. Ia tidak bisa menilai apakah adegan membuat penasaran atau Coba membantu. Pertanyaan: halaman ini terasa ringan untuk pembaca yang cepat lelah (alasan redesain #120), dan bagian mana yang ingin dipotong?
5. **PRD v1**, `/tahap-1/prd-v1/`. Ilustrasi antrean kasir dan m1–m6 memuat 24 elemen teks di dalam SVG. PROPOSAL baris 557 melarangnya, keputusan 207 memilihnya, dan ilustrasi latar perusahaan belum ada (P4). Pertanyaan: PROPOSAL diubah atau teks pindah ke HTML, dan apakah ilustrasi `prd` cukup sebagai latar?
6. **Naskah tertinggal**, `/tahap-1/app-versi-lama/` dan `/tahap-1/m8-uji-coba-lolos/`. 1.33 memakai deploy expand (`jumlah` + `nominal`) yang belum ada di naskah M6/ADR 10. 1.37 membaca "91/100 penguji aktif" sebagai aktif selama uji coba, dengan kepekaan 0,14–0,42 RPS. Pertanyaan: naskah diperbarui atau tafsiran ini dikonfirmasi? Usulan M2, M4, dan M5 ada di MEMORI.
7. **Jembatan ke Tahap 2**, `/tahap-1/jembatan-prd-v2/`. Widget tebak sudah membuka jawaban (ADR 6 dan ADR 5 dibuka lagi), padahal naskah menaruhnya di halaman pertama Tahap 2. Sesudah 1.42, sidebar masuk Tahap 2 versi lama yang belum memuat PRD v2. Pertanyaan: urutan ini diterima, dan kapan `plan/CERITA-TAHAP-2.md` datang, termasuk prioritas P0–P2?
8. **Macet renderer**, `/tahap-1/adr-transaction-koreksi/`, satu dari enam halaman dengan macet terbanyak di CI. Chromium Linux diam total di ±0,13% muat halaman Tahap 1; gerbang mengulang sekali, dan macOS 0 dari 10.080 muat. Situs tidak punya telemetri, jadi macet di Chrome HP pembaca tidak akan terlihat. Pertanyaan: draf laporan bug Chromium dari PR #231 dikirim (keputusan 367)?
9. **Deploy dan cadangan**, `/tahap-1/deployment-rollback/` dan `/tahap-1/tim-infra/`. PROPOSAL menulis dua rencana deploy Tahap 2: SSH dari Actions dan manual; halaman mengikuti yang manual. 1.36 menulis cadangan database sebagai celah terbuka karena naskah tidak menyebutnya. Pertanyaan: rencana mana yang berlaku, dan apakah Raka menjalankan `pg_dump` manual di Tahap 1?
10. **Bayar oleh akun warung**, `/tahap-1/fitur-bayar/`. Di lab `api-t1`, warung bisa membayar warung lain (`201`), dan membayar diri sendiri berakhir `500` dari constraint. Halaman tidak menjanjikan larangan, jadi belum ada yang salah tulis. Pertanyaan: `POST /transfers` khusus karyawan, dan `ke == peminta` ditolak `422`?

## Hasil crosscheck (X1)

Crosscheck berjalan 2026-10-13 di main `c58d904`, hanya membaca. Main `9d47274` sesudahnya hanya mengubah empat file plan (PR #239). Pemeriksaan dipecah tiga, masing-masing dengan bukti sendiri di `tmp/crosscheck/` (lokal, di-gitignore):

- X1a (`x1a.md`): peta halaman, registry, dan proposal, dibaca dari kode. Skill: analisis-kritis.
- X1b (`x1b.md`): checklist gaya-bahasa, visualisasi, dan analisis-kritis per halaman, klaim dicocokkan dengan rekaman lab.
- X1c (`x1c.md`): gerbang lengkap, tiga pertanyaan di 42 halaman × 4 varian, dan heuristik aksesibilitas DOM. Skill: visualisasi, analisis-kritis.

Ringkasnya:

- 39 dari 42 halaman lolos isi. Tiga perlu dibenahi: 1.16, 1.19, 1.28. Tidak ada halaman hilang.
- Gerbang `bash tools/cek_situs.sh --layar` LOLOS. Semua 168 varian lolos tiga pertanyaan.
- Tujuh perbaikan non-polesan akan dikerjakan: lima rusak, dua aksesibilitas.
- 25 temuan polesan masuk `plan/SETELAH-TAHAP-1.md` bagian "Temuan polesan dari X1".
- Delapan hal baru butuh pemilik, ditambah daftar yang sudah ada di MEMORI.

### (a) Tabel per halaman

Keadaan menilai isi halaman itu sendiri. Temuan dari komponen bersama dicatat di daftar perbaikan, tidak di baris halaman. "Daftar periksa" berarti halaman itu memuat checkbox perbaikan 7.

Setiap baris juga bersandar pada tiga bukti dasar: `x1a-halaman.txt` (urutan blok lawan template), `audit.txt` (audit bahasa), dan `x1c-ukur.json` (tiga pertanyaan, 4/4 varian). Kolom bukti hanya menyebut bukti tambahan.

| No | Judul | Keadaan | Alasan | Bukti |
|---|---|---|---|---|
| 1.1 | PRD v1: Rekeningo untuk Gedung A | lolos | PRD 7 blok, 1 terbuka; ilustrasi antrean kasir. Ilustrasi latar perusahaan belum ada (P4) | `x1a.md` (A) |
| 1.2 | Dari fitur ke pekerjaan teknis | lolos | Fitur 4 blok. Pilah tanpa "ubah satu hal" dan chip (polesan) | `x1b-coba.txt` |
| 1.3 | Apa yang dikerjakan backend | lolos | Konsep 5 blok. Pilah dan hp tanpa chip (polesan); daftar periksa | `x1b-coba.txt`, `x1b-widget-luar-coba.txt` |
| 1.4 | ADR 1: Backend sendiri, bukan BaaS | lolos | ADR 3 opsi, ada "Kapan keputusan ini salah". Title tanpa "ADR 1:" (polesan); daftar periksa | `x1b-adr.txt`, `x1a-frontmatter.txt` |
| 1.5 | Perjalanan satu request | lolos | Alur lengkap: tebak, ubah, chip Rekaman; daftar periksa | `x1b-coba.txt` |
| 1.6 | Struktur folder pertama | lolos | Banding tanpa tebak dan chip (polesan); daftar periksa | `x1b-coba.txt` |
| 1.7 | Fitur: login karyawan | lolos | Alur Rekaman, lab `api-t1` | `x1b-alur-klaim.txt` |
| 1.8 | Fitur: top-up oleh admin | lolos | Runsql tanpa chip; lab `api-t1` menggantikan `b2-model` tanpa nomor keputusan (polesan) | `x1a-kep-lab.txt`, `x1b-runsql.txt` |
| 1.9 | Fitur: bayar ke warung | lolos | Alur dan layar HP dari rekaman. Akun warung bisa memanggil Bayar (pemilik, butir 4) | `x1b-alur-klaim.txt`, `x1a.md` (B) |
| 1.10 | Fitur: saldo, riwayat, laporan warung | lolos | Runsql tanpa chip; `b2-query` tanpa keputusan; tautan dokumentasi PostgreSQL 18, lab 17.11 (polesan) | `x1a-kep-lab.txt`, `x1b-versi2.tsv` |
| 1.11 | Pertukaran saldo | lolos | Jumlah-total lengkap. Layar pertama 1366×657 sisa 43 px | `x1b-coba.txt`, `layar-t1.txt` |
| 1.12 | Data modeling dan relasi | lolos | Runsql SQLite memperlihatkan FK yang tidak ditegakkan (polesan); daftar periksa | `x1b-runsql.txt` |
| 1.13 | SQL atau NoSQL | lolos | Firestore berlabel [perlu verifikasi] (pemilik, butir 7); "antrean" untuk queue (polesan); daftar periksa | `x1b-klaim-ringkas.txt` |
| 1.14 | M1: Nominal minus lolos | lolos | Masalah 5 blok. Runsql tanpa chip (polesan) | `x1b-runsql.txt` |
| 1.15 | Validation dua lapis + ADR 2 | lolos | ADR 2: 3 opsi × 3 subkeputusan; daftar periksa | `x1b-adr.txt` |
| 1.16 | HTTP: method, status, header | perlu dibenahi | Baris 98 dan 223 menulis "wajib/harus mengabaikan" reason phrase; RFC 9112 §4 memakai SHOULD (perbaikan 6); daftar periksa | `x1b.md` (B), `x1b-klaim-detail.tsv` |
| 1.17 | M2: amount atau nominal | lolos | Alur Rekaman; 400 dan 422 cocok dengan `m2.txt` | `x1b-status.txt` |
| 1.18 | Kontrak OpenAPI + ADR 3 | lolos | ADR 3: 3 opsi; 26 peringatan kontrak (rendah); daftar periksa | `x1b-adr.txt` |
| 1.19 | M3: Tanda kutip di pencarian | perlu dibenahi | Rekaman menulis 3 akun + "99 akun lain" = 102; prosa dan seed 104 (perbaikan 1) | `x1a.md` (B); `sed -n 36p labs/api-t1/output/m3.txt` |
| 1.20 | Keamanan 1: SQL injection + ADR 4 | lolos | Cari-bug Rekaman; ADR 4: 3 opsi; daftar periksa | `x1b-adr.txt` |
| 1.21 | Lapisan dasar: handler tidak tahu SQL | lolos | Pilah tanpa "ubah satu hal" dan chip (polesan); daftar periksa | `x1b-coba.txt` |
| 1.22 | M4: Rp70.000 yang hilang | lolos | 29 transaksi, Rp25.000.000 dan Rp24.930.000 cocok `m4.txt`. Entri sidebar di bawah lipatan 1366×657 (polesan) | `x1b-angka.tsv`, `x1c-sidebar.json` |
| 1.23 | Transaction | lolos | Stackstep tanpa tebak; PHP 8.5.8 dan Python 3.14.7 tanpa rekaman (polesan); daftar periksa | `x1b-versi3.tsv` |
| 1.24 | ADR 5–6: Transaction di service; tabel koreksi | lolos | ADR 5 dan 6 masing-masing 3 opsi. H1 beda dari judul registry (polesan); daftar periksa | `x1b-adr.txt` |
| 1.25 | Migration: skema sebagai kode | lolos | Alur Rekaman `b4-migration`; daftar periksa | `x1b-coba.txt` |
| 1.26 | M5: Angka di URL | lolos | Enumerasi 401–503 (103 akun) dijawab 404 seragam. 3 peringatan panjang (polesan) | `x1b.md` (sampel manual) |
| 1.27 | Authentication | lolos | Alur Rekaman; daftar periksa | `x1b-coba.txt` |
| 1.28 | Authorization | perlu dibenahi | Registry memberi peran `security`, naskah tidak (perbaikan 3). Id ganda di Snippet (sudah tercatat); daftar periksa | `x1a-banding.txt`, `x1c-a11y.json` |
| 1.29 | Keamanan 2: IDOR, enumerasi, token di app + ADR 7–8 | lolos | ADR 7: 4 opsi; ADR 8: 3 + 3 opsi. 5 peringatan panjang (polesan); daftar periksa | `x1b-adr.txt` |
| 1.30 | M6: Deploy hari Senin | lolos | "5 menit, 11 HP" berlabel cerita; alur Rekaman | `x1b-alur-klaim.txt` |
| 1.31 | Deployment dan rollback + ADR 9 | lolos | ADR 9: 4 opsi. Satu kalimat 36 kata (polesan); daftar periksa | `x1b-adr.txt` |
| 1.32 | Testing: apa dites di level mana | lolos | Layar pertama 375×667 sisa 20 px, tepat di batas. Serverpod [perlu verifikasi] sudah di MEMORI; daftar periksa | `layar-t1.txt` |
| 1.33 | App versi lama + ADR 10 | lolos | ADR 10: 4 opsi. 11 peringatan, 1 paragraf panjang (polesan); daftar periksa | `x1b-adr.txt` |
| 1.34 | M7: `.env` di repo | lolos | `no leaks found` lalu `leaks found: 1` cocok `m7.txt` baris 41–65 | `x1b-klaim-detail.tsv` |
| 1.35 | Keamanan 3: secret + ADR 11 | lolos | ADR 11: 5 opsi; 4 Snippet Rekaman. 1 paragraf panjang (polesan) | `x1b-adr.txt` |
| 1.36 | Tim dan infra Tahap 1 | lolos | Tim-infra 4 blok; alur `t1-cadangan` Rekaman; daftar periksa | `x1b-coba.txt` |
| 1.37 | M8: Uji coba lolos, PRD v2 datang | lolos | Kalkulator berchip Asumsi; hasil hitung dicek ulang | `x1b-angka.tsv` |
| 1.38 | Kerangka berpikir dan estimasi | lolos | Kalkulator; tabel semua asumsi dicek; daftar periksa | `x1b-angka.tsv` |
| 1.39 | Spesifikasi untuk AI dan review kode AI | lolos | 1 PASS, 6 FAIL cocok `review.txt`. Pilah tanpa chip, 4 peringatan (polesan); daftar periksa | `x1b-klaim-detail.tsv` |
| 1.40 | ADR 12: Sengaja belum dilakukan | lolos | ADR 12: 3 opsi; 128 MB bertaut ke dokumentasi PostgreSQL 17; daftar periksa | `x1b-adr.txt` |
| 1.41 | Yang dibawa keluar dari Tahap 1 | lolos | Kartu tebak lalu buka. Layar pertama 375×667 sisa 21 px; daftar periksa | `x1b-coba.txt`, `layar-t1.txt` |
| 1.42 | Jembatan: pratinjau PRD v2 | lolos | Tebak Rekaman. Berikutnya ke Tahap 2 lama yang belum memuat PRD v2 (lingkup Tahap 2) | `x1b-coba.txt` |

Hasil: 39 lolos, 3 perlu dibenahi, 0 hilang. X1a menghitung 40 lolos karena temuan 1.16 berasal dari X1b.

### (b) Gerbang dan tiga pertanyaan

Gerbang `bash tools/cek_situs.sh --layar` LOLOS dalam 16 menit 07 detik, tanpa MACET atau ULANG. Bukti: `cek.txt`, `cek-hasil.txt`. CI main untuk `c58d904` (run 38330608166) hijau di semua job (`x1a-ci-jobs.txt`).

| Langkah | Hasil |
|---|---|
| Build strict | 0 warning |
| Registry | 82/82 halaman, prasyarat urut, angka asumsi cocok |
| Audit bahasa | 163 file, 0 error, 124 peringatan |
| Kontras dua mode | 735/735; uji pemeriksa 14/14 |
| Tes | node:test 5/5, Vitest 189/189, widget lama 141/141, tipe strict 0 error |
| Tautan internal | 10.925 tautan, 0 rusak |
| Layar pertama 4 ukuran | 241 ok, 0 tipis, 0 gagal; tertipis 1.32 di 375×667 (20 px) |
| Luapan 360 dan 375 | 84 halaman × 2 ukuran, 0 gagal |
| CLS alur, font telat | 30 halaman, maksimum 0,059 |

Tiga pertanyaan diukur `x1c-ukur.mjs` di 375×667 dan 1366×657, gelap dan terang. Di mana: breadcrumb "Kamu di sini" dan H1 utuh di layar pertama, tidak tertutup header. Dari mana dan ke mana: href Sebelumnya dan Berikutnya sama dengan urutan nomor 1.1–1.42.

- Hasil: 168/168 varian lolos, 42/42 halaman lolos (`x1c-ukur.json`, `x1c-tabel.md`).
- Pemeriksa terbukti bisa gagal: dua uji mutasi masing-masing menandai 8/8 varian (`x1c-mutasi.txt`, `x1c-mutasi2.txt`).
- Delapan tangkapan dilihat langsung. Semuanya lolos tes 3 detik (`x1c.md` bagian D).
- axe-core tidak terpasang, jadi aksesibilitas diperiksa heuristik DOM (`x1c-a11y.json`). Nama kontrol dan alt gambar 0 temuan. Checkbox tanpa label menjadi perbaikan 7.

### (c) Perbaikan yang akan dikerjakan

Hanya kategori rusak dan aksesibilitas (keputusan 369). Kontras dan gerbang tidak punya temuan.

| No | Kategori | File:baris | Bukti | Usulan | Keadaan |
|---|---|---|---|---|---|
| 1 | rusak | `labs/api-t1/run.py:618-624` → `labs/api-t1/output/m3.txt:36`, tampil di 1.19 `m3-tanda-kutip.mdx:54` (Snippet 30:36) | Rekaman menulis tiga akun + "99 akun lain" = 102. Prosa 1.19 baris 21 dan seed `labs/api-t1/cmd/api/main.go:57` = 104. Teks ditulis tangan di `bocor`; `harap` hanya memeriksa `len(hasil) > 100`. Keputusan 157 ikut menulis 102 (`x1a.md` B) | `bocor` jadi "101 akun lain" dari `len(hasil) - 3`, `harap` jadi `len(hasil) == 104`. Jalankan `make -C labs/api-t1 run BAGIAN=m3` di container, cek Snippet 30:36, koreksi 157 di keputusan baru | selesai (PR #245) |
| 2 | rusak | `situs/src/content/docs/cerita/index.mdx:6-62` | Halaman pembuka di jalur inti masih cerita lama: "MVP 1–100", transfer antar user, apotek, empat tokoh tanpa Pak Hadi dan Dimas, Tahap 2 "100–1.000". `tokoh.svg` berlatar putih di mode gelap (`x1a.md` B) | Tulis ulang baris 10–60 dari naskah bagian Latar, Tokoh (enam tokoh), dan `tahap[].skala` registry; ganti atau lepas `tokoh.svg` | selesai (PR #246) |
| 3 | rusak | `situs/data/cerita.json:938` (entri `B5.3`, 1.28) | `peran` memuat `security`; jalur Security naskah `CERITA-TAHAP-1.md:242` tanpa 28. Beranda dan sidebar menebalkan 7 halaman, bukan 6 (`x1a-banding.txt`) | Hapus `security` dari 1.28, lalu `python3 tools/sinkron_cerita.py` | selesai (PR #242) |
| 4 | rusak | `situs/src/components/Beranda.astro:41` | Peta beranda menulis "Sedang ditulis: 42 dari 42 halaman"; rumusnya tidak membedakan tahap yang lengkap (`x1a.md` B) | Bila semua halaman ada, tulis "42 halaman"; cek `layar.mjs` | selesai (PR #243) |
| 5 | aksesibilitas | `situs/src/components/Beranda.astro:186` | `<ul role="status">` diisi `<li>` oleh `tampil()` (baris 252–262). Peran status menggantikan peran list, jadi setiap `li` kehilangan induk list (aturan axe `listitem`). Gerbang tidak menjalankan axe: opsi `--axe` di `ukur-diagram.mjs` dan `ukur-gerak.mjs` tidak dipakai `cek_situs.sh` (`x1a.md` B) | Bungkus `<div role="status" aria-live="polite">` di luar `<ul>`, tampilan tetap | selesai (PR #243) |
| 6 | rusak | `situs/src/content/docs/tahap-1/http.mdx:98` dan `:223` | Halaman menulis "App wajib mengabaikan" dan "RFC 9112 menyatakan client harus mengabaikan". RFC 9112 §4 memakai SHOULD, dicek di rfc-editor.org 2026-10-13 (`x1b.md` B) | Ganti jadi "sebaiknya mengabaikan (SHOULD)"; contoh Go dan kesimpulan tetap | selesai (PR #244) |
| 7 | aksesibilitas [perlu verifikasi] | 25 file `situs/src/content/docs/tahap-1/*.mdx`, bagian "Saat me-review kode AI, cek ini", mis. `data-modeling.mdx:199-201` | 128 butir `- [ ]` dirender `<input type="checkbox" disabled>` tanpa nama. Pembaca layar mengumumkan kotak centang tanpa nama (`x1c-a11y.json`, aturan `label`). Belum diuji axe-core | Plugin rehype yang memberi `aria-hidden="true"` atau `aria-label` dari teks butir, lalu pemeriksaan di gerbang | selesai (PR #247) |

Pembagian jalur: perbaikan 1 butuh lab di container. Perbaikan 2, 3, dan 6 hanya teks atau registry. Perbaikan 4, 5, dan 7 menyentuh komponen.

### (d) Butuh pemilik

Baru dari X1:

1. Teks di dalam SVG ilustrasi prd dan m1–m6 (24 elemen `<text>`). PROPOSAL baris 557 melarangnya, keputusan 207 memilihnya. Ubah PROPOSAL, atau teks pindah ke HTML (`x1a.md` C1).
2. Ilustrasi latar perusahaan (naskah baris 244, tugas P4). Apakah ilustrasi `prd` (antrean kasir) cukup, atau kampus Grup Lestari tetap wajib (`x1a.md` C2)?
3. 1.28 di jalur Security. Perbaikan 3 mengikuti naskah. Bila 1.28 memang perlu di jalur itu karena prasyarat 1.29, naskah yang diperbarui (`x1a.md` C3).
4. Bayar oleh akun warung atau admin. Warung ke warung lain lolos `201`; ke diri sendiri `500` dari constraint. Apakah `POST /transfers` khusus karyawan dan `ke == peminta` ditolak `422` (`x1a.md` C4)?
5. Tabel jenis halaman di `plan/CERITA-TAHAP-1.md:190-195` tidak cocok dengan peta naskah sendiri (Fitur, Konsep, ADR). Situs mengikuti peta (`x1a.md` C6).
6. Tahap 2 lama sesudah 1.42 belum memuat PRD v2 dan ADR 5–6 yang dijanjikan 1.42. Menunggu `plan/CERITA-TAHAP-2.md` (`x1a.md` C7).
7. [perlu verifikasi] 1.13 `sql-atau-nosql.mdx:77`: perilaku Firestore untuk rujukan antar-dokumen. Belum tercatat di MEMORI (`x1b.md` C1).
8. [perlu verifikasi] axe-core belum terpasang, dan gerbang tidak memakai opsi `--axe` yang sudah ada di alat ukur. Perbaikan 5, perbaikan 7, dan catatan aturan `duplicate-id` di axe 4.7+ belum diuji axe sungguhan. Memasangnya butuh ADR dependency (`x1c.md` C).

Sudah tercatat, dirujuk tanpa disalin:

- `plan/MEMORI.md` "Perlu dicek pemilik": sembilan butir. Di dalamnya ada secret Cloudflare, Serverpod 4 [perlu verifikasi] (`x1b.md` C2), dan warna teks lawan CLAUDE.md lewat redesain #120 (`x1a.md` C5).
- `plan/MEMORI.md` "Usulan perubahan cerita": enam butir (M4, M2, M5, M6/ADR 10, cadangan database, 1.42).
- `x1a.md` C8 sudah diselesaikan urutan kebenaran, tanpa tindakan.
