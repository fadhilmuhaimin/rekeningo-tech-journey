# Laporan Tahap 1

Laporan ini menutup Tahap 1 sebelum tinjauan pemilik (keputusan 369). Bagian crosscheck ditulis X1 (keputusan 370). X2 menambahkan bagian penutup.

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
| 1 | rusak | `labs/api-t1/run.py:618-624` → `labs/api-t1/output/m3.txt:36`, tampil di 1.19 `m3-tanda-kutip.mdx:54` (Snippet 30:36) | Rekaman menulis tiga akun + "99 akun lain" = 102. Prosa 1.19 baris 21 dan seed `labs/api-t1/cmd/api/main.go:57` = 104. Teks ditulis tangan di `bocor`; `harap` hanya memeriksa `len(hasil) > 100`. Keputusan 157 ikut menulis 102 (`x1a.md` B) | `bocor` jadi "101 akun lain" dari `len(hasil) - 3`, `harap` jadi `len(hasil) == 104`. Jalankan `make -C labs/api-t1 run BAGIAN=m3` di container, cek Snippet 30:36, koreksi 157 di keputusan baru | akan dikerjakan |
| 2 | rusak | `situs/src/content/docs/cerita/index.mdx:6-62` | Halaman pembuka di jalur inti masih cerita lama: "MVP 1–100", transfer antar user, apotek, empat tokoh tanpa Pak Hadi dan Dimas, Tahap 2 "100–1.000". `tokoh.svg` berlatar putih di mode gelap (`x1a.md` B) | Tulis ulang baris 10–60 dari naskah bagian Latar, Tokoh (enam tokoh), dan `tahap[].skala` registry; ganti atau lepas `tokoh.svg` | akan dikerjakan |
| 3 | rusak | `situs/data/cerita.json:938` (entri `B5.3`, 1.28) | `peran` memuat `security`; jalur Security naskah `CERITA-TAHAP-1.md:242` tanpa 28. Beranda dan sidebar menebalkan 7 halaman, bukan 6 (`x1a-banding.txt`) | Hapus `security` dari 1.28, lalu `python3 tools/sinkron_cerita.py` | akan dikerjakan |
| 4 | rusak | `situs/src/components/Beranda.astro:41` | Peta beranda menulis "Sedang ditulis: 42 dari 42 halaman"; rumusnya tidak membedakan tahap yang lengkap (`x1a.md` B) | Bila semua halaman ada, tulis "42 halaman"; cek `layar.mjs` | akan dikerjakan |
| 5 | aksesibilitas | `situs/src/components/Beranda.astro:186` | `<ul role="status">` diisi `<li>` oleh `tampil()` (baris 252–262). Peran status menggantikan peran list, jadi setiap `li` kehilangan induk list (aturan axe `listitem`). Gerbang tidak menjalankan axe: opsi `--axe` di `ukur-diagram.mjs` dan `ukur-gerak.mjs` tidak dipakai `cek_situs.sh` (`x1a.md` B) | Bungkus `<div role="status" aria-live="polite">` di luar `<ul>`, tampilan tetap | akan dikerjakan |
| 6 | rusak | `situs/src/content/docs/tahap-1/http.mdx:98` dan `:223` | Halaman menulis "App wajib mengabaikan" dan "RFC 9112 menyatakan client harus mengabaikan". RFC 9112 §4 memakai SHOULD, dicek di rfc-editor.org 2026-10-13 (`x1b.md` B) | Ganti jadi "sebaiknya mengabaikan (SHOULD)"; contoh Go dan kesimpulan tetap | akan dikerjakan |
| 7 | aksesibilitas [perlu verifikasi] | 25 file `situs/src/content/docs/tahap-1/*.mdx`, bagian "Saat me-review kode AI, cek ini", mis. `data-modeling.mdx:199-201` | 128 butir `- [ ]` dirender `<input type="checkbox" disabled>` tanpa nama. Pembaca layar mengumumkan kotak centang tanpa nama (`x1c-a11y.json`, aturan `label`). Belum diuji axe-core | Plugin rehype yang memberi `aria-hidden="true"` atau `aria-label` dari teks butir, lalu pemeriksaan di gerbang | akan dikerjakan |

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
