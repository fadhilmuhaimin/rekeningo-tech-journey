# Status

Diperbarui: 2026-10-09 (redesain #120 di-merge; sistem kerja otomatis siap, keputusan 216). Catatan singkat tentang keadaan panduan dan pekerjaan yang masih terbuka. Keputusan dan alasannya ada di [KEPUTUSAN.md](KEPUTUSAN.md).

## Keadaan sekarang

- 60 halaman ada (pembuka, Tahap 1–5, satu studi desain sampingan, enam halaman alat). `tools/cek_batch.sh` lolos: build strict, ID internal, audit bahasa (0 error), 103 tes widget, layar pertama 60 halaman × 4 ukuran.
- 26 lab. Semua lab di database bersama memakai schema sendiri, dan lab gagal keras bila skema, hasil, atau port-nya salah (keputusan 79–81, 95). Log beberapa proses diurutkan menurut waktu tulis (keputusan 96).
- Glosarium punya 98 istilah di bagian "Semua istilah". Rujukan halaman MVCC dan monolith sudah cocok dengan isi halamannya (keputusan 94).
- Istilah teknis ditulis dalam bahasa Inggris, idiom terjemahan literal sudah diganti, dan fragmen kalimat di prosa diberi predikat (keputusan 86, 87, 93). Tabel angka di kelima halaman tahap berlabel asumsi per baris (keputusan 88).
- Halaman Tahap 1 yang memakai materi Tahap 2 punya penjelasan singkat di tempat (keputusan 92).
- Link yang menolak bot sudah diverifikasi lewat API metadata (keputusan 98).

## Arahan baru (keputusan 109)

Urutan kerja dibalik: konten dulu, Tahap 1 sampai tuntas sesuai `plan/CERITA-TAHAP-1.md`.

### Tugas 0 · Siapkan repo (selesai 2026-10-08, kecuali secret Cloudflare)

| Langkah | Keadaan |
|---|---|
| Pemeriksaan di `situs/` | `tools/cek_situs.sh --layar`: registry, istilah, audit bahasa, build strict, ID internal, kontras, tipe strict, Vitest, tes widget lama, layar pertama 4 ukuran (termasuk beranda satu layar), tangkapan dan tema awal (111, 119, 121) |
| MkDocs dan `docs/` | Dihapus; registry di `situs/data/cerita.json`, widget lama di `situs/lama/` (112–114) |
| Cloudflare Pages + preview per PR | Job `deploy` siap; menunggu secret `CLOUDFLARE_API_TOKEN` dan `CLOUDFLARE_ACCOUNT_ID` dari pemilik (115) |
| Dependency | React 19.3, TypeScript 6.0.3, Zod 4.6, Vitest 5 dengan ADR; PGlite menunggu widget SQL pertama (116) |
| Registry v2 | 42 halaman Tahap 1 bernomor 1.1–1.42 sesuai naskah; 18 halaman memakai isi lama (`lama`), 24 menyusul (117) |
| Template | `Blok.astro` + `data/templat.json` untuk enam jenis; kerangka di `situs/templat/` (118) |
| Navigasi | Breadcrumb otomatis, pemilih peran, mode fokus (120); tema gelap default benar-benar berlaku (119) |
| Beranda | Satu layar: Mulai, tiga pintu, peta enam tahap (121) |

### Tugas 1 · Tahap 1 (42 halaman)

| Halaman | Keadaan |
|---|---|
| 1.1 PRD v1 | Ditulis (keputusan 122); T1 lama dihapus |
| 1.2 Dari fitur ke pekerjaan teknis | Ditulis (keputusan 125) |
| 1.3 Apa yang dikerjakan backend | Ditulis ulang dari A1 (keputusan 126, 127) |
| 1.4 ADR 1: Backend sendiri, bukan BaaS | Ditulis ulang dari A4 (keputusan 129) |
| 1.5 Perjalanan satu request | Ditulis ulang dari A2 (keputusan 130) |
| 1.6 Struktur folder pertama | Halaman baru (keputusan 131) |
| 1.7 Fitur: login karyawan | Halaman baru, lab `api-t1` versi naskah (keputusan 132–134) |
| 1.8 Fitur: top-up oleh admin | Halaman baru (keputusan 135, 136) |
| 1.9 Fitur: bayar ke warung | Halaman baru (keputusan 137, 138) |
| 1.10 Fitur: saldo, riwayat, laporan warung | Halaman baru (keputusan 139, 141) |
| 1.11 Pertukaran saldo | Halaman baru, lab `pertukaran.txt`, widget React pertama `jumlah-total` (keputusan 143, 144) |
| 1.12 Data modeling dan relasi | Ditulis ulang dari B2.1 ke tabel v1, lab `relasi.txt` (keputusan 145, 146) |
| 1.13 SQL atau NoSQL | Ditulis ulang dari B2.2, pertanyaan Sinta, banding fitur v1 (keputusan 147) |
| 1.14 M1: Nominal minus lolos | Halaman masalah pertama, mode rentan `-rentan m1` (keputusan 148, 149) |
| 1.15 Validation dua lapis + ADR 2 | Ditulis ulang dari B6, menyerap B1.2 (dihapus) (keputusan 150) |
| 1.16 HTTP: method, status, header | Ditulis ulang dari B1.1, lab `http.txt` + `GET /transfers/{id}` (keputusan 151, 152) |
| 1.17 M2: amount atau nominal | Halaman masalah, lab `m2.txt` (keputusan 153, 154) |
| 1.18 Kontrak OpenAPI + ADR 3 | Ditulis ulang dari B1.4, kontrak `b1-openapi` v1, 400 dengan nama field (keputusan 155, 156) |
| 1.19 M3: Tanda kutip di pencarian | Halaman masalah, lab `m3.txt` + mode rentan m3, widget React cari-bug (keputusan 157, 158, 159) |
| 1.20 Keamanan 1: SQL injection + ADR 4 | Halaman baru, lab `injection.txt` + modul `latihan/` + gosec v2.29.0, widget cari-bug data kedua dengan baris aman (keputusan 160, 161, 162) |
| 1.21 Lapisan dasar: handler tidak tahu SQL | Ditulis ulang dari B7.1, lab `lapisan.txt` + `cek_arah.py`, pilah dari baris lab (keputusan 165, 166) |
| 1.22 M4: Rp70.000 yang hilang | Halaman masalah, mode rentan `m4` + rekaman `m4.txt`, runsql `t1-m4.json` (keputusan 167, 168) |
| 1.23 Transaction | Ditulis ulang dari B3.1, Inti dari `m4.txt`, stackstep b3-stack dengan tab Dart (Serverpod) (keputusan 169) |
| 1.24 ADR 5–6: Transaction di service; tabel koreksi | Lab `DalamTx` + tabel koreksi (keputusan 170), halaman ADR + runsql `t1-adr6.json` (keputusan 171) |
| 1.25 Migration: skema sebagai kode | Lab `b4-migration` ditulis ulang ke skema v1 (keputusan 172), halaman + alur `t1-migration.json` (keputusan 173) |
| 1.26 M5: Angka di URL | Lab mode rentan m5 + `m5.txt` (keputusan 233), halaman masalah + alur `t1-m5.json` + ilustrasi m5 (keputusan 234) |
| 1.27 Authentication | Ditulis ulang dari B5.1 ke sesi acak dari `login.txt`, Rantai + alur `t1-authn.json` (keputusan 236) |
| 1.28 Authorization | Ditulis ulang dari B5.3; lab `authz.txt` (pemilik 404, peran 403, login 401 lebih dulu) dan `b5-rls` ke akun v1, Rantai + alur + pilah `t1-authz` (keputusan 237) |
| 1.29 Keamanan 2: IDOR, enumerasi, token di app + ADR 7–8 | Halaman baru; lab `b5-rls` bagian 5–7 (bayar `UPDATE 0`, `SET` tertinggal di pool, `set_config` lokal) (keputusan 239); Rantai + alur + banding `t1-idor`, ADR 7 dan ADR 8 (keputusan 240) |
| 1.30-lab M6: rekaman prober deploy | Bagian `m6` di `labs/api-t1`, `m6.txt`: prober tiap detik selama deploy v1 ke v2, kolom `transaksi.jumlah` jadi `nominal`; jeda 3 putaran, app 1.0 error, binary v1 tertimpa, v1 di skema baru 500; kolom dikembalikan, v1 melayani app 1.0 tapi tidak app 1.1 (keputusan 241) |
| 1.30 M6: Deploy hari Senin | Halaman masalah dari `m6.txt`: Rantai `t1-m6-deploy`, alur `t1-m6.json` dua HP (varian kembali ke v1: 500, lalu app 1.1 rusak), ilustrasi m6 (keputusan 242) |
| 1.31 Deployment dan rollback + ADR 9 | Ditulis ulang dari C3 ke `tahap-1/deployment-rollback.mdx`, lab `deploy.txt` (image per commit, rollback = tag lama) + Dockerfile, Compose, contoh CI, alur `t1-deploy.json` (keputusan 247) |
| 1.32 Testing: apa dites di level mana | Ditulis ulang dari C1; tes Go nyata di lab `api-t1` dan rekaman `testing.txt`, pilah, stackstep dengan tab Dart (Serverpod) (keputusan 250, 251) |
| 1.33 App versi lama + ADR 10 | Ditulis ulang dari E1 tanpa B4.2; lab `versi.txt` (expand: app 1.0 dan 1.1 sama-sama 200; migration 000008; contract), alur `t1-versi` (keputusan 252, 253) |
| K1 Crosscheck 1.26–1.30 | `plan/CROSSCHECK-KECIL.md` bagian K1: alur Berikutnya 1.25 → 1.31 dan tautan bersih; 1.27 bcrypt dan 1.29 "103 akun" diperbaiki; tugas K1a (favicon, `title`/`class` menyusul), K1b (batas percobaan login), K1c (ADR 7 butir 4) (keputusan 244) |
| K1c ADR 7 butir 4 dan RLS di ledger | Butir 4 jadi policy per perintah: `SELECT` pemilik, entri dua sisi lewat fungsi `bayar`; lab `b5-rls` bagian 9–10 (keputusan 246) |

Diperbarui 2026-10-11. 33 dari 42 halaman selesai. Crosscheck K1 (1.26–1.30, keputusan 244) selesai; berikutnya K1a–K1c lalu 1.31. Crosscheck K0 (1.21–1.25, keputusan 218): isi cocok naskah, empat temuan tampilan jadi K0a–K0c. K0a selesai (keputusan 220): Inti 1.21, 1.23, 1.25 memakai Rantai ringkas dari rekaman lab. K0b selesai (keputusan 221): blok Kebutuhan 1.24 punya Rantai dua pertanyaan PRD → ADR 5 dan 6; K0c selesai (keputusan 222): teks ilustrasi M4 di dalam bingkai, diukur `situs/tools/ukur-ilustrasi.mjs`; luapan chip M2 jadi K0e. K0d selesai (keputusan 223): judul dua baris tidak lagi menempel ke baris meta di HP (celah −5,0 → 4,0 px, `situs/tools/ukur-judul.mjs` di gerbang). K0e selesai (keputusan 224): chip ilustrasi M2 di dalam kotaknya; `ukur-ilustrasi.mjs` masuk gerbang. I1 selesai (keputusan 225): situs memakai bun 1.4.2, `dist/` identik dengan build npm; `.devcontainer/postCreate.sh` ikut memakai bun 1.4.2 (keputusan 227). Sesudah loop: #139 (skrip menunggu batas pemakaian pulih, keputusan 226) dan #140 (Dev Container memakai bun, keputusan 227). Laporan pagi tertunda ditulis ulang di `plan/LAPORAN-PAGI.md`; temuannya (margin Peta cerita di desktop) jadi K0f. K0f selesai (keputusan 228): margin Peta cerita 1366×657 kembali 32 px, halaman lain tidak berubah. I2 selesai (keputusan 229, 230): `motion` 14.1.0 dan `@xyflow/react` 12.12.0 terpasang dengan ADR, belum dipakai halaman mana pun. I3 selesai (keputusan 231): fondasi gerak `situs/src/gerak/` (token, MotionProvider, reduced motion mematikan semua gerak), diperiksa `ukur-gerak.mjs` di gerbang; hanya halaman uji `/uji/gerak/` yang memuat motion. I4 selesai (keputusan 232): fondasi diagram arsitektur di atas React Flow (`situs/src/diagram/`), data dari registry dengan skema Zod dan zona, tegak di HP dan mendatar di desktop, kotak dibuka dengan klik atau keyboard, versi statis tanpa JS; diperiksa `ukur-diagram.mjs` di gerbang; hanya halaman uji `/uji/diagram/` yang memuat React Flow. Berikutnya sesuai `python3 tools/antrean.py berikut`. 1.26-lab selesai (keputusan 233): mode rentan m5 dan rekaman `m5.txt` (IDOR dan enumerasi 401–503; versi benar 404 seragam). K1a selesai (keputusan 245): favicon tidak lagi 404, `title` tautan menyusul satu kalimat, atribut `class` sidebar tidak lagi ganda. K1b selesai (keputusan 244): batas percobaan login di 1.7, 1.27, dan 1.29 sama-sama Tahap 2, sesuai PROPOSAL baris 686. 1.27-lab selesai (keputusan 243): 401 tanpa token mengirim `WWW-Authenticate: Bearer` tanpa kode error, token yang ditolak tetap `invalid_token` (RFC 6750 §3.1). I5a selesai (keputusan 238): blok lipat dibuka dan ditutup dengan gerak tinggi + opacity dari token (`src/gerak/lipat.ts`, `animate` mini Motion, tanpa React), menggantikan transisi CSS; reduced motion tanpa gerak; diperiksa `ukur-gerak.mjs`; layar pertama tidak bergeser; 28 halaman ber-Blok +2,7 KB gzip. I5b selesai (keputusan 248): peta tahap di beranda memakai DiagramArsitektur; memilih tahap mengganti diagram dengan gerak masuk singkat, jawaban teka-teki muncul dengan gerak yang sama; reduced motion tanpa gerak; React Flow diunduh sesudah peta masuk layar.

## Sistem kerja otomatis (keputusan 216)

| Bagian | Keadaan |
|---|---|
| `plan/ANTREAN.md` | 46 tugas awal: K0, I1–I4, 1.26–1.42 dengan I5a–I5f dan crosscheck kecil K1–K3, P1–P4, R1–R6, X1–X2 |
| `plan/PROTOKOL-OTOMATIS.md` | Dibaca setiap iterasi; satu tugas per iterasi, maksimal 3 percobaan, parkir, laporan pagi |
| `tools/jalankan-otomatis.sh` | `claude -p` per iterasi, `dontAsk` + allowlist, model Opus 5.5 dengan cadangan Opus 4.8, syarat berhenti, laporan pagi + notifikasi |
| Hemat konteks (235) | Loop CLI dihentikan pemilik 2026-10-10; diganti sesi pengatur + satu subagent per tugas. CLAUDE.md mengimpor `plan/RINGKAS.md`, bukan CERITA/PROPOSAL penuh; MEMORI ≤ 80 baris; PROTOKOL bagian k |
| `tools/antrean.py` | Pemeriksa format (masuk gerbang), pemilih tugas berikutnya, parkir dari skrip |
| Gerbang dan preview (249) | `tools/cek_situs.sh --layar` menghentikan daemon preview worktree ini sebelum mulai dan di trap; gagal keras bila server di port bukan build ini (G1) |

## Redesain tampilan (sesi 2026-10-09, di-merge lewat #120)

Masalah pemilik (pembaca ADHD): kaku, padat, teks kecil, kontras kurang, beranda tanpa aktivitas. PR #120 di-merge 2026-10-09 atas keputusan pemilik (keputusan 217); sisa langkah 5–6 sesi 3 jadi tugas R1–R6 di ANTREAN. Rincian dan langkah berikutnya di MEMORI "Sedang dikerjakan"; ukuran di `plan/AUDIT-TAMPILAN.md`.

| Langkah | Keadaan |
|---|---|
| Ukur sebelum (keputusan 200) | Selesai: teks isi 16/14,7 px (spesifikasi 19 px tidak pernah berlaku), 9 jenis teks UI < 14 px, sekunder 7,83:1, axe `color-contrast` 13 elemen dan `link-in-text-block` |
| Riset bersumber | Selesai (laporan subagen), belum ditulis ke AUDIT-TAMPILAN.md bagian 2 |
| Tipografi + layar pertama (201) | Commit eb8320c; layar pertama 0 gagal, 1 tipis (b3-1 lama) |
| Satu kolom, TOC tersembunyi, sidebar terlipat, menu peran (202) | Commit 227014f |
| Blok tanpa kotak, selesai setelah digulir (203) | Commit a61af02 |
| Berikutnya kecil rata kanan (204) | Commit 7f653df |
| Kepala PRD dua baris (205) | Commit 46229f8 |
| Progres baca, ilustrasi blok cerita, transisi buka (206, 207) | Commit 3a2add4 |
| Beranda baru + widget React tebak (208) | Commit 5cb9df1 |
| Riset bersumber, ukuran sesudah, tangkapan sebelum/sesudah | Commit 0a0b526, `plan/AUDIT-TAMPILAN.md`; gambar di `situs/tangkapan/banding/` (tidak di-commit) |
| PROPOSAL "Desain visual final" dan CLAUDE.md `<tampilan>` | Usulan di AUDIT-TAMPILAN.md bagian 6; menunggu pemilik |
| PR #117 (konten 1024 px, keputusan 163) | Ditutup 2026-10-09 |

## Fase 0 · Fondasi (plan/PROPOSAL.md "Rencana migrasi")

| Langkah | Keadaan |
|---|---|
| `tools/cek_batch.sh` dijalankan apa adanya | Lolos lokal 2026-10-08 (catatan di MEMORI) |
| GitHub Actions `.github/workflows/cek.yml` di tiap PR | Dibuat; hijau di branch `percobaan/ci-fase-0` (keputusan 99) |
| `make lab` + `.devcontainer/` | Dibuat; `make -C labs/b3-race run` terbukti jalan dari nol (keputusan 100, 101) |
| Deploy Cloudflare Pages, Playwright menggantikan CDP, link checker | Belum |
| Rencana fase 1 untuk 1.11 Transaction | Disetujui, dikerjakan (lihat Fase 1) |

## Fase 1 · Situs baru (`situs/`, Astro 7.3.7 + Starlight 0.42.5, tanpa React)

| Ukuran | Nilai |
|---|---|
| Halaman dipindah | 60 dari 60 (plus 404). Semua halaman dikonversi `situs/tools/konversi.mjs`, dibandingkan `tools/banding.mjs` (teks, heading, link), lolos `tools/layar.mjs` 4 ukuran, dan setiap widget terpasang tanpa error konsol. Beranda `/` masih isi A0 "Cara pakai panduan ini"; beranda satu layar = fase 3 |
| Build | 0 warning, 0 error; `npm test` 5/5; `contrast.py` 125/125 (gelap + terang) |
| Teks artikel lama vs baru (`tools/banding.mjs`) | 1.11: 1185 vs 1185 kata, 0 berbeda; 10 heading sama; 26 vs 26 link. 1.12: 993 vs 992 kata, 1 beda pemenggalan ("token-nya"); 10 heading sama; 22 vs 22 link (16 eksternal identik). 1.13: 958 vs 957 kata, 1 beda pemenggalan; 10 heading sama; 13 vs 13 link. 1.14: 794 vs 794 kata, 0 beda; 7 vs 7 link. 1.15: 985 vs 985 kata, 0 beda; 18 vs 18 link. 1.17: 851 vs 850 kata, beda pemenggalan dan `&`; 10 heading sama. 1.18: 719 vs 717 kata, beda pemenggalan tanda kutip; 10 heading sama. 1.19: 871 vs 871 kata, 0 beda; 24 vs 24 link. Tahap 2 · Ceritanya: 375 vs 375 kata, 0 beda; 9 vs 9 link; ilustrasi SVG tampil dari /assets/cerita. 2.1: 1448 vs 1446 kata, beda pemenggalan; 12 heading sama; 18 vs 18 link. 2.3: 1074 vs 1071 (pemenggalan). 2.4: 739 = 739. 2.6: 838 = 838. 2.8: 1048 = 1048. 2.9: 824 = 824; semua heading dan jumlah link sama. Judul H1 pendek (2.3, 2.9) dipertahankan: konverter memakai H1 badan sebagai title. Tahap 3–4: T3 461/459, 3.1 752/750, 3.2 830/829, 3.3 825=825, 3.6 751/749, 3.7 1028=1028, T4 358=358, 4.1 816/814; semua beda hanya pemenggalan, heading dan link sama |
| CSS widget ditulis ulang | 1.11: 89 aturan menggantikan 121 aturan `widgets.css`. 1.12 menambah widget `alur` + mockup HP: 70 aturan menggantikan 76 aturan lama (hp, alur, rel vertikal). Total 159 aturan widget di `tema.css` dari 302 aturan `widgets.css`; sisanya (race, pilah, banding, kartu, peta, ember, map, ilustrasi) menyusul bersama halamannya |
| Widget lama | tooltip istilah jalan (keputusan 107: remark-abbr + istilah.js lama). Semua 15 jenis widget: `runsql`, `stackstep`, `alur` (+`hp`), `pilah`, `banding`, `race`, `ember`, `kartu`, `peta-cerita`, `indeks-masalah`, `umpan-balik-data`, `arsitektur`, `selesai`, `umpan-balik` jalan tanpa perubahan kode (keputusan 103); diuji Playwright: runsql menghasilkan tabel Before/After, stackstep menyorot 1 baris di tiap tab, alur berjalan 7 langkah dengan mockup HP |
| Tangkapan layar | 1366×657 dan 375×667 × gelap/terang: tanpa scroll horizontal, tanpa error konsol. `tools/layar.mjs` (layar pertama 4 ukuran) lolos dengan margin ≥ 21 px di semua halaman setelah breadcrumb HP dipendekkan |
| Belum | Gerbang fase 1 (PROPOSAL): MkDocs belum dihapus, `cek_batch.sh` tetap gerbang situs lama; ilustrasi SVG cerita masih berlatar terang di mode gelap (token ilustrasi = fase 3); sidebar menampilkan 59 halaman yang belum dipindah dengan kelas `nav-menyusul` (keputusan 104); beranda final, lima blok, Pagefind untuk glosarium = fase 3 |

## Terbuka

| Topik | Catatan |
|---|---|
| Halaman dengan perkiraan waktu baca > 7 menit | Terutama 2.1 dan 1.11, juga 1.7, 1.12, 1.15, 2.3, 2.8, 3.7, 4.1. Menunggu catatan review; jangan dipecah atau diringkas sebelum itu. |
| Istilah lain tanpa entri glosarium | Belum dipindai ulang setelah penambahan 2026-10-07. Kandidat dari pemindaian sebelumnya: DTO, dependency injection, PL/pgSQL, Kubernetes, bottleneck, service mesh, event bus, authorization code, Read Committed. |
| Label pendek di widget pilah | Field "kenapa" di beberapa widget pilah dibuka dengan label tanpa predikat ("Faktor puncak."). Dibiarkan sebagai gaya kartu (keputusan 93). |
| Mode lab berbahasa Indonesia | Nama mode dan file `e3-idempotency` (`kunci-sama`, `kunci-baru`) dan identifier widget `ember` tetap (keputusan 86). |
