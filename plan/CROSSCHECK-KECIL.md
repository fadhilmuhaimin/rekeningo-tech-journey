# Crosscheck kecil

Hasil crosscheck kecil dari loop otomatis (`plan/ANTREAN.md`, "Definisi selesai bersama"). Satu bagian per tugas crosscheck. Tangkapan ada di `situs/tangkapan/` (tidak di-commit) dan bisa dibuat ulang dengan `npm --prefix situs run tangkap -- --url http://127.0.0.1:4321 --path /<path>/`.

## K0 · 1.21–1.25 setelah redesain (2026-10-10)

Gerbang penuh di branch `crosscheck/k0` (main df74599): `semua pemeriksaan lolos`; layar pertama `LOLOS: 0 gagal, 0 margin tipis`. Tangkapan 375×667 dan 1366×657, gelap dan terang, untuk kelima halaman: semua `scrollWidth` sama dengan viewport, tanpa error konsol.

### Cocok dengan naskah dan registry

| Halaman | Naskah (jenis · ★ · widget · lab) | Di situs dan registry | Hasil |
|---|---|---|---|
| 1.21 Lapisan dasar | Konsep · ★ · pilah · api-t1 | `B7.1` konsep, inti, bagian 4, backend; pilah `t1-lapisan-pilah.json`; snippet dan rekaman `api-t1` | Cocok |
| 1.22 M4 | Masalah · ★ · runsql · b3-stack | `t1-m4` masalah, inti, backend; runsql `t1-m4.json`; lab `api-t1` mode `m4` | Cocok; lab beda dari naskah, alasan di keputusan 167–168 |
| 1.23 Transaction | Konsep · ★ · runsql, stackstep · b3-stack | `B3.1` konsep, inti, backend; stackstep + TabSet `b3-stack` | Cocok; runsql sengaja tidak dipakai (duplikat 1.22), keputusan 169 |
| 1.24 ADR 5–6 | ADR · ★ · runsql · b3-stack | `t1-adr-transaction` adr [5, 6], inti, backend; runsql `t1-adr6.json`; lab `api-t1` | Cocok; lab beda dari naskah, alasan di keputusan 171 |
| 1.25 Migration | Konsep · ★ · alur · b4-migration | `B4.1` konsep, inti, backend + devops; alur `t1-migration.json`; lab `b4-migration` | Cocok (naskah: DevOps menonjolkan 25) |

Blok tiap halaman sama dengan `situs/data/templat.json` untuk jenisnya (konsep lima blok, masalah lima blok, ADR enam blok dengan "Yang merevisinya nanti" di blok terakhir). Konsep punya Cek diri ≥ 3 kartu (gerbang sinkron lolos).

### Tampilan dan tiga pertanyaan navigasi

| Halaman | Di mana saya | Apa yang dibaca dulu | Ke mana selanjutnya | Hasil | Bukti |
|---|---|---|---|---|---|
| 1.21 | Breadcrumb "Tahap 1 › Masalah yang muncul", sidebar menyorot 1.21 | Inti satu kalimat, lalu diagram | "Berikutnya: Coba" di akhir blok Mulai | Perlu dibenahi: diagram masih `bb-flow` lama (ditolak keputusan 212); Inti tanpa dua paragraf rinci | `tahap-1_lapisan-dasar-{hp-dark,desktop-light}.png` |
| 1.22 | Breadcrumb "Tahap 1 › minggu 3" | Ilustrasi M4 lalu Gejala | Blok Yang Raka kira terbuka di bawahnya | Perlu dibenahi: teks "bukan 250.000" di ilustrasi meluber keluar bingkai layar HP, di 375 dan 1366 | `tahap-1_m4-rp70000-hilang-{hp-dark,desktop-light}.png` |
| 1.23 | Breadcrumb dan sidebar jelas | Inti satu kalimat, lalu rekaman `m4.txt` | Berikutnya di akhir blok | Perlu dibenahi: visual Inti hanya potongan kode, terpotong di 375 px ("…$1 WH"); Inti tanpa dua paragraf rinci | `tahap-1_transaction-{hp-light,desktop-dark}.png` |
| 1.24 | Breadcrumb "Tahap 1 › ADR 5 dan 6" | Blok Kebutuhan, empat paragraf teks | Blok Opsi terbuka di bawahnya | Perlu dibenahi: tidak ada visual di layar pertama (ADR 1 sudah punya rantai, keputusan 214) | `tahap-1_adr-transaction-koreksi-{hp-dark,desktop-light}.png` |
| 1.25 | Breadcrumb dan sidebar jelas | Inti satu kalimat, lalu rekaman `migrate up` | Berikutnya di akhir blok | Perlu dibenahi: visual Inti hanya rekaman terminal, bukan diagram drift laptop/server; Inti satu paragraf | `tahap-1_migration-{hp-light,desktop-dark}.png` |

### Tugas perbaikan yang lahir

- K0a: Inti 1.21, 1.23, 1.25 mengikuti standar keputusan 212–215 (kalimat → Rantai → dua paragraf).
- K0b: visual di blok Kebutuhan 1.24.
- K0c: teks ilustrasi M4 tidak keluar bingkai.

## K1 · 1.26–1.30 (2026-10-10)

Branch `crosscheck/k1` (main 1d60c9c). Build `bun run --cwd situs build`: 79 halaman, exit 0. Preview `http://localhost:4321` (preview Astro hanya mendengar `localhost`, bukan `127.0.0.1`). Alat: `situs/tangkapan/k1-nav.mjs` (Playwright), `tmp/k1_href.py` dan `tmp/k1_href2.py` (href di `situs/dist/`), semuanya di folder yang di-.gitignore dan tidak di-commit; `layar.mjs`. Isi diperiksa satu subagen baca saja terhadap rekaman lab, seed, naskah, dan PROPOSAL; temuannya dicek ulang ke baris yang dikutip sebelum ditulis di sini.

### Alur baca 1.25 → 1.31

`node situs/tangkapan/k1-nav.mjs http://localhost:4321` di 375×667 dan 1366×657: ketujuh halaman `200`, `scrollWidth` sama dengan lebar viewport, 0 error konsol. Di tiap halaman, tombol Berikutnya di blok 1–4 diklik berurutan: blok tujuan terbuka dan terlihat di viewport (4 dari 4 di keenam halaman baru); tautan Berikutnya di blok 5 dan `Lanjut` di kaki halaman menunjuk halaman berikutnya di registry.

| Halaman | Blok (dua pertama terbuka) | Blok 5 → | Breadcrumb HP | Sidebar aktif | Layar pertama 375×667 |
|---|---|---|---|---|---|
| 1.25 Migration | Mulai, Coba, Paham, Putuskan, Kunci | `/tahap-1/m5-angka-di-url/` | Tahap 1 › Masalah yang muncul | 1.25 | margin 85 px |
| 1.26 M5 | Gejala, Yang Raka kira, Yang sebenarnya, Coba sendiri, Konsep yang lahir | `/tahap-1/authentication/` | Tahap 1 › minggu 4 | 1.26 | tanpa Inti; dilihat: tangkapan `k1-m5-hp-dark.png` |
| 1.27 Authentication | lima blok konsep | `/tahap-1/authorization/` | Tahap 1 › Masalah yang muncul | 1.27 | margin 112 px |
| 1.28 Authorization | lima blok konsep | `/tahap-1/idor-token-app/` | sama | 1.28 | margin 58 px |
| 1.29 Keamanan 2 + ADR 7–8 | lima blok konsep | `/tahap-1/m6-deploy-hari-senin/` | sama, label "ADR 7 dan 8" | 1.29 | margin 57 px |
| 1.30 M6 | lima blok masalah | `/c-operasional/c3-deployment/` | Tahap 1 › minggu 5 | 1.30 | tanpa Inti; dilihat: tangkapan `k1-m6-hp-dark.png` |
| 1.31 Deployment (lama) | tanpa blok (belum ditulis ulang) | `Lanjut` → `/c-operasional/c1-testing/` (1.32) | sama | 1.31 | margin 114 px |

`layar.mjs` keseluruhan: `LOLOS: 0 gagal, 0 margin tipis.` Tiga pertanyaan di dua tangkapan HP gelap (1.26, 1.30): di mana saya (breadcrumb "Tahap 1 › minggu 4/5", judul dengan nomor), apa yang dibaca dulu (Gejala dengan ilustrasi M5/M6 di atas paragraf pertama, ilustrasi top 245 px tinggi 110 px), ke mana (meta "Blok 1 dari 5"); ketiganya terjawab. Judul 1.29 di H1 ("Keamanan 2: …, dan ADR 7–8") lebih panjang dari judul registry di sidebar dan breadcrumb ("IDOR, enumerasi, dan token di app"); pola sama dengan 1.20 ("Keamanan 1: SQL injection dan ADR 4" vs "SQL injection"), jadi bukan temuan.

### Tautan

`python3 tmp/k1_href.py`: href internal di `<main>` 1.25 (19), 1.26 (9), 1.27 (19), 1.28 (23), 1.29 (27), 1.30 (11), 1.31 (15); 0 anchor salah. Satu-satunya href tanpa target di kelima halaman adalah `/tahap-1/tim-infra/` di 1.30, dengan kelas `rujukan-menyusul` (keputusan 104). Rujukan ke halaman lama: 1.25 → C3, E1; 1.28 → C1; 1.29 → C4; 1.30 → C1, C3, E1; semuanya ada di `dist/`.

Seluruh situs (`python3 tmp/k1_href2.py`): 622 href internal tanpa target dari 7.557. 539 tautan sidebar `nav-menyusul` dan 4 `rujukan-menyusul` disengaja (keputusan 104). 79 sisanya `<link rel="icon" href="/favicon.svg">` di semua halaman: `situs/public/` tidak punya `favicon.svg` dan konfigurasi Starlight tidak menyetel `favicon`, jadi setiap halaman memuat ikon yang 404. Catatan kecil: `title` untuk halaman yang belum ada berbeda antara sidebar ("Belum ditulis") dan rujukan di teks ("Halaman ini belum dipindah ke situs baru"), padahal 1.36 halaman baru, bukan halaman yang dipindah. Tautan sidebar `nav-menyusul` juga membawa atribut `class` dua kali (`class="nav-inti nav-menyusul astro-…" class="nav-inti nav-menyusul"`, dari `situs/tools/sidebar.mjs` baris 10–13); browser memakai yang pertama, jadi tidak terlihat, tetapi HTML-nya tidak sah.

### Cocok dengan naskah, lab, dan registry

| Yang diperiksa | Hasil | Bukti |
|---|---|---|
| Sesi acak, bukan JWT | Cocok. JWT hanya muncul sebagai pembanding atau "ditunda ke Tahap 4" (1.27 sebelas kali, 1.29 lima kali, banding `t1-idor-banding.json` opsi B); tabelnya `sesi` | `grep -n JWT` di kelima MDX |
| Field `jumlah` | Cocok. `amount` dan `nominal` tidak muncul di 1.26–1.29; di 1.30 `nominal` adalah nama field v2 yang diganti (keputusan 241) | `labs/api-t1/rekaman/m6.txt` baris 3–12 |
| 103 akun, 401–503 | Cocok untuk enumerasi: seed admin 400, 401–501 tanpa 418 = 100 karyawan, 418/502/503 warung; m5 `200 x 103` lalu versi benar `200 x 1, 404 x 102`. Tidak cocok di 1.29: "Satu backend melayani 103 akun" dan tabel "103 akun", padahal seed membuat 104 baris dengan admin; diperbaiki di PR ini jadi "100 karyawan dan 3 warung" | `labs/api-t1/cmd/api/main.go` baris 68–93; `m5.txt` baris 28, 68 |
| Dimas 417, Ani 418, Budi 419, admin 400 | Cocok di kelima halaman dan widget | seed di atas |
| Sesi 8 jam | Cocok (28.800 detik) | `main.go` baris 26; `login.txt` baris 8 |
| 404 / 403 / 401 | Cocok: 404 seragam untuk data orang lain, 403 untuk peran, 401 sebelum 403 | `m5.txt` 53–62; `authz.txt` 27, 52, 62–65 |
| `WWW-Authenticate` (keputusan 243) | Cocok: tanpa token `Bearer`, token sesudah logout `Bearer error="invalid_token"`; 1.27 baris 76, `t1-authn.json` 127 dan `t1-login.json` 66 adalah kasus logout | `login.txt` 39, 50; `authz.txt` 54 |
| Tokoh | Cocok dengan naskah; "untuk kedua kalinya" di 1.26 benar (spreadsheet pertama di 1.19, minggu 2) | `plan/CERITA-TAHAP-1.md` baris 47–52 |
| ADR 8 | Cocok: shared_preferences 2.5.6 dan flutter_secure_storage 11.2.0 ada | `idor-token-app.mdx` baris 85, 87 |
| ADR 7 | Tidak cocok di dalam ADR: butir 4 melarang RLS di tabel yang dibaca atau ditulis atas nama pihak lain, padahal Inti merencanakan RLS untuk ledger Tahap 2 dan "Yang merevisinya nanti" menulis ledger di-`INSERT` untuk Warung Ani dari pembayaran Dimas | `idor-token-app.mdx` baris 22, 126, 137 |
| Migration 000006/000007 | Cocok: lab berhenti di 000005; 000006 dan 000007 hanya muncul sebagai komentar "di cerita" di rekaman M6, dan 1.30 menulis "migration baru" tanpa nomor | `labs/b4-migration/baru/`; `m6.txt` 33, 95; `t1-m6.json` 148 |
| bcrypt cost 10 | Tidak cocok di 1.27: baris 60 "sama dengan batas minimum OWASP", baris 193 "masih di atas batas minimum". OWASP: bcrypt dengan work factor 10 atau lebih, jadi 10 tepat di batas; baris 193 diperbaiki di PR ini jadi "memenuhi batas minimum" | [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) |
| Batas percobaan login | Tidak cocok: 1.7 baris 83 dan 1.27 baris 62, 192 menulis "Tahap 2, bersama brute force"; 1.29 baris 67, 176, 184 menulis "[[C4]], Tahap 3". PROPOSAL tabel keamanan baris 686 menaruh brute force dan rate limit per akun di Tahap 2 | `plan/PROPOSAL.md` baris 686 |
| Rujukan `[[…]]` | Semua terdaftar dan nomornya cocok (B1.4 = 1.18, C4 = 3.7). 1.30 baris 87, 90 menyebut C3 dan E1 "memuat ADR 9/10", padahal halaman lamanya belum memuat ADR; rujukan maju yang sudah terjadwal di tugas 1.31 dan 1.33 | `grep -c ADR` di C3 dan E1 = 0 |
| Sambungan 1.25 → 1.26 | Cocok: minggu 3 lalu minggu 4; 1.25 baris 183 menunjuk 1.30 dan E1 | `migration.mdx` |
| Sambungan 1.30 → 1.31 | Tidak cocok (C3 lama belum ditulis ulang): C3 bercerita deploy lewat `ssh` + `git pull` + build di server, "suatu malam", mati 40 menit, lalu pulih dengan build ulang dari Git; 1.30 build di laptop lalu `scp`, Senin 12.10, mati 5 menit, dan v1 yang dibangun ulang menjawab 500. C3 juga memakai prasyarat kosong, kolom `telp` yang tidak ada di skema v1, dan `TOKEN_SECRET` (ikut di `kartu.json`) | `c3-deployment` baris 8, 37, 39, 92–106; `m6.txt` baris 87 |
| Registry | Prasyarat 1.30 = B4.1 cocok; jenis 1.29 `konsep` sama dengan 1.15, 1.18, 1.20 (konsep + ADR) | `situs/data/cerita.json` |

Di luar kelima halaman: `alat/kamus-lintas-stack.mdx` baris 35 memetakan "Login dan token" di Go ke `golang-jwt`. Itu pemetaan antar-stack, bukan klaim tentang lab, jadi dibiarkan.

### Diperbaiki langsung di PR ini

- 1.27 `authentication.mdx`: "bcrypt cost 10 masih di atas batas minimum OWASP" jadi "memenuhi batas minimum OWASP", sama dengan blok Paham.
- 1.29 `idor-token-app.mdx`: "103 akun" (Kebutuhan ADR dan tabel Sengaja belum) jadi "100 karyawan dan 3 warung".

### Tugas perbaikan yang lahir

- K1a: favicon 404 di semua halaman, `title` rujukan menyusul, dan atribut `class` ganda di sidebar.
- K1b: satu tahap untuk batas percobaan login (Tahap 2 menurut PROPOSAL) di 1.7, 1.27, dan 1.29.
- K1c: ADR 7 butir 4 tidak bertentangan dengan rencana RLS di ledger Tahap 2.
- Pertentangan C3 lama dengan 1.30 masuk catatan tugas 1.31 yang sudah ada, bukan tugas baru.

## K1x · 1.31–1.33 (2026-10-11)

Branch `crosscheck/k1x` (main 7fdc0ad, P1 sudah di-merge lewat #165). Build `bun run --cwd situs build`: 79 halaman, exit 0. Preview `bun run --cwd situs preview --background --port 4321 --host 127.0.0.1`. Alat: `situs/tangkapan/k1x-nav.mjs`, `k1x-nav2.mjs`, `k1x-adr.mjs` (Playwright), `tmp/k1x_href.py` (href di `situs/dist/`), `tmp/k1x_grep.py` (grep silang `situs/src/content/docs/tahap-1` dan `situs/lama/widgets/data`); semuanya di folder yang di-.gitignore. Sebelum K1x berlaku `K1` di atas; K2 nanti cukup 1.34–1.35.

### Alur baca 1.30 → 1.34

`node situs/tangkapan/k1x-nav.mjs http://127.0.0.1:4321` di 375×667 dan 1366×657: keempat halaman yang ada `200`, `scrollWidth` sama dengan lebar viewport, 0 error konsol; 1.34 `404` karena belum ditulis. Di tiap halaman, Berikutnya di blok 1–4 diklik berurutan: blok tujuan terbuka dan terlihat (4 dari 4).

| Halaman | Blok (dua pertama terbuka) | Blok 5 dan Lanjut → | Breadcrumb HP | Sidebar aktif |
|---|---|---|---|---|
| 1.30 M6 | Gejala, Yang Raka kira, Yang sebenarnya, Coba sendiri, Konsep yang lahir | `/tahap-1/deployment-rollback/` | Tahap 1 › Masalah yang muncul › minggu 5 | 1.30 |
| 1.31 Deployment + ADR 9 | Mulai, Coba, Paham, Putuskan, Kunci | `/tahap-1/testing/` | Tahap 1 › Masalah yang muncul | 1.31 |
| 1.32 Testing | lima blok konsep | `/tahap-1/app-versi-lama/` | sama | 1.32 |
| 1.33 App versi lama + ADR 10 | lima blok konsep | `/d-system-design/d1-kerangka-berpikir/` (1.38 lama) | sama | 1.33 |

1.33 menunjuk 1.38 karena `urutanBaca` hanya memuat halaman yang ada (`situs/tools/registri.mjs` baris 64); `[[berikutnya]]` di 1.33 baris 31 dan `Lanjut` pindah sendiri ke 1.34 saat halaman itu terbit. Bukan temuan; diperiksa lagi di K2.

`k1x-nav2.mjs` untuk beranda, 1.4, 1.6, dan 1.29 di dua ukuran: `200`, `scrollWidth` = viewport, 0 error konsol. Satu hasil janggal: di 1.4 375×667, 250 ms sesudah Berikutnya blok 1, blok Opsi berada 374 px di atas viewport. Diagnosis pertama di sini salah (review PR #166): `k1x-adr.mjs` membaca `scrollY` sebelum `click()` Playwright, padahal `click()` lebih dulu menggulir ke tombol, jadi "0 → 1.737" adalah gulir otomatis ke tombol, bukan gulir yang melewati tujuan. Ukuran ulang `situs/tangkapan/k1xe-gulir.mjs` (tombol digulir ke layar dulu, lalu diklik, lalu disampel per rAF) tidak menemukan gulir yang melewati posisi akhir. Masalah nyatanya: blok 1 menutup selagi masih di layar, padahal komentar handler Berikutnya di `Blok.astro` menganggapnya sudah di atas layar. Di frame pertama blok tujuan meloncat ke atas viewport, lalu gulir halus membawanya kembali. Di 1.4 375×667 tinggi halaman 4.678 → 2.704 px, top blok Opsi −1.570 px, gulir 1.682 px selama 663 ms; di 1.24 375×667 top −898 px, gulir 1.010 px. Halaman konsep juga mengalaminya: 1.32 375×667 tinggi 2.951 → 1.868 px, top −301 px, gulir 389 px. Jadi K1xe.

### Tautan

`python3 tmp/k1x_href.py`: href internal di `<main>` beranda (36), 1.4 (13), 1.6 (15), 1.30 (11), 1.31 (32), 1.32 (36), 1.33 (20); 0 href atau anchor salah. Yang tanpa target hanya rujukan maju dengan kelas `rujukan-menyusul` dan `title="Halaman ini belum ditulis"`: 1.31 → 1.34 (3 kali) dan 1.36 (2 kali), 1.4 dan 1.30 → 1.36. Rujukan id lama di `tahap-1/` di-resolve registry: `[[C3]]` → 1.31, `[[C1]]` → 1.32, `[[E1]]` → 1.33, `[[B4.1]]` → 1.25, `[[B5.3]]` → 1.28; `[[B4.2]]` tidak dipakai lagi (prasyarat 1.33 dibuang). Slug lama `c-operasional/c3-deployment` dan `c1-testing` tidak ada di sumber maupun `situs/dist/`.

### Cocok lintas halaman

| Yang diperiksa | Hasil | Bukti |
|---|---|---|
| Tag image 7 karakter | Cocok: hanya `390ff47` dan `f5ea0b4`, tanpa varian lebih panjang | `k1x_grep.py hash7` kosong; tangkapan 1.31 HP |
| Login GHCR `read:packages` | Cocok: hanya 1.31 baris 99; tempat menyimpan token dan `DATABASE_URL` dirujuk ke [[t1-m7]] (1.31 baris 73, 99, 162) | `k1x_grep.py readpkg` |
| `TEST_DATABASE_URL` dan penjaga | Cocok: tes membaca variabel sendiri, bukan `DATABASE_URL` server, dan berhenti bila bukan database tes | 1.32 baris 102, 108, 112, 230, 280; `kartu.json` 481 |
| CI 1.31 dan `SKIP` | Cocok: 1.31 baris 91, 142 hanya menulis CI menjalankan `go test`; Cek diri 3 (baris 191) menanyakan yang belum dikerjakan CI; 1.32 baris 108 menjawab: CI tidak mengisi `TEST_DATABASE_URL`, `f5ea0b4` lolos, PostgreSQL masuk CI di Tahap 3 | `labs/api-t1/deploy/ci.yml` baris 20 |
| Server cerita sesudah 1.33 | Cocok: expand (`jumlah` + `nominal`); contract hanya latihan lab dan menunggu hitungan request per versi (Tahap 3, observability) | 1.33 baris 39, 157–159; `t1-versi.json` 8, 10; `labs/api-t1/run.py` 1210–1219 |
| Migration 000005–000008 | Cocok, berurutan: 000005 batas saldo warung (1.25), 000006 ganti nama kolom (1.30, 1.33 baris 91), 000007 mengembalikan kolom, 000008 kolom `catatan` (1.33 baris 93, 138) | `t1-deploy.json` 161, 193; `t1-m6.json` 148 |
| Token pendek + refresh, JWT | Cocok: Tahap 3 dan Tahap 4 | 1.27 baris 195–196; 1.29 baris 180, 190, 199–200 |
| Batas percobaan login | Cocok sesudah K1b: Tahap 2 | 1.7 baris 83; 1.27 baris 62, 192; 1.29 baris 67, 190, 198 |
| 100 karyawan + 3 warung; 417/418/419/400 | Cocok: "103" hanya untuk hasil enumerasi M5 | 1.31 baris 131; 1.29 baris 22, 49, 126, 155 |
| Janji 1.28: tes empat endpoint ber-ID | Cocok: akun dan riwayat Dimas, laporan Warung Ani, satu transaksi, semuanya `404` | 1.32 baris 98, 229 |
| Sambungan 1.30 → 1.31 | Cocok: temuan K1 (C3 lama dengan `ssh` + `git pull`) sudah hilang; Inti 1.31 menyambung binary v1 dari 1.30 | tangkapan 1.31 HP |
| Sambungan 1.33 → 1.34 | Belum bisa: 1.34 belum ditulis (lihat Alur baca) | K2 |

### Layar pertama

`layar.mjs` di gerbang: `LOLOS: 0 gagal, 0 margin tipis.` Margin 375×667 / 1366×657: 1.31 55 / 86 px, 1.32 20 / 52 px, 1.33 24 / 52 px, 1.6 66 / 101 px; 1.4 (ADR) dan 1.30 (masalah) "tanpa Inti", tidak diukur (usulan K1). 1.32 sekarang yang paling tipis: jangan tambah tinggi di atas Inti. Dua tangkapan HP gelap dibuka (1.31, 1.33): di mana saya (breadcrumb "Tahap 1", judul bernomor), apa yang dibaca dulu (Inti dengan Rantai dari rekaman), ke mana (meta "Blok 1 dari 5"); ketiganya terjawab. Rantai 1.33 dua baris, masing-masing terlipat dua di HP, masih di layar pertama.

### Sisa peninjau sebelumnya

| Butir | Nilai | Tindakan |
|---|---|---|
| (a) 1.29 "Tulisan atas nama orang lain", "tulisan ke akun lain", "Bacaan untuk pihak lain" | Nyata, terjemahan literal; ditemukan satu lagi di baris 169 ("tulisan ke disk") | Diperbaiki langsung |
| (b) 1.29 baris 95: Ani +5.000, `permission denied`, `bayar` tanpa identitas | Nyata: Snippet baris 93 hanya `rls.txt` 134–144 (Dimas −5.000); bukti ada di 157–160 dan 174–181 tetapi tidak tampil | K1xd |
| (c) KEPUTUSAN 246 tanpa URL dan tanggal akses | Nyata | Diperbaiki: tiga URL dokumentasi PostgreSQL 17 (yang sama dengan di 1.29) + tanggal akses |
| (d) "belum dipindah" di `remark-rujukan.mjs:3` dan `Lanjut.astro:4` | Nyata, komentar basi sejak keputusan 245 | Diperbaiki jadi "belum ditulis" |
| (e) beranda: tab 2–5 ditap sebelum hydrate masih menggeser halaman | Nyata, tetapi angka peninjau sebelumnya (20–63 px, CLS 0,0323) tidak bisa dihasilkan ulang. Cara ukur `ukur-diagram.mjs` bagian 6 per tab (review PR #166): Tahap 2 dan 3 geser 63 px (CLS 0,0105), Tahap 4 dan 5 geser 41 px (CLS 0,0067); gerbang hanya mengukur Tahap 3 | K1xa (target 0 px); komentar `Beranda.astro` memakai angka ukur ini |
| (f) KEPUTUSAN 252 alasan berputar | Nyata: opsi ditolak karena bertentangan dengan ADR yang sedang diputuskan | Diperbaiki: nama kolom tidak dibaca app (`EXPAND_UBAH` memetakan `nominal` ke kolom `jumlah`) |
| (f) label "Ubah satu hal: Latihan lab: …" | Nyata, dua titik dua | Diperbaiki: label `t1-versi.json` jadi "… (contract, latihan lab)" |
| (f) `PermintaanBayar` `required: [ke]` | Nyata: kontrak tidak menyatakan salah satu `jumlah`/`nominal` wajib, padahal server menjawab `400` tanpa keduanya | K1xb (rekaman `expand.txt` diulang) |
| (g) `bearer` huruf kecil diperlakukan tanpa token | Nyata menurut RFC 9110 §11.1 (nama skema tidak peka huruf). Kodenya tampil: `strings.CutPrefix(..., "Bearer ")` di `handler.go` ~139 ada di region `wajib-login` (135–160) yang ditampilkan 1.27; tempat kedua di `logout` ~165 | K1xc (Snippet dan teks 1.27 ikut dicek) |
| (h) 1.31 "GHCR" tanpa kepanjangan | Nyata | Diperbaiki: "GitHub Container Registry (GHCR)" |

### Diperbaiki langsung di PR ini

- 1.29 `idor-token-app.mdx`: empat terjemahan literal (baris 73, 133, 151, 169).
- 1.31 `deployment-rollback.mdx` baris 99: kepanjangan GHCR.
- 1.33 widget `t1-versi.json`: label varian tanpa titik dua ganda.
- Komentar `remark-rujukan.mjs`, `Lanjut.astro`, `Beranda.astro`.
- KEPUTUSAN 246 (sumber) dan 252 (alasan opsi ganti nama kolom).

### Tugas perbaikan yang lahir

- K1xa: geseran beranda 0 px untuk tab 2–5 yang ditap sebelum hydrate, semua tab diukur di gerbang.
- K1xb: kontrak expand menyatakan salah satu `jumlah`/`nominal` wajib.
- K1xc: skema `Bearer` tidak peka huruf di lab `api-t1`.
- K1xd: rekaman `rls.txt` untuk klaim bagian 10 tampil di 1.29.
- K1xe: Berikutnya blok 1 di halaman ADR dan konsep: blok tujuan tidak meloncat jauh ke atas layar saat blok 1 menutup.

## K2 · 1.34–1.35 (2026-10-12)

Branch `crosscheck/k2` dari main 8cae5e2 (1.35 sudah di-merge lewat #179). Build `bun run --cwd situs build`: 81 halaman, exit 0. Preview di port 4323. Alat: `situs/tangkapan/k2-nav.mjs` (alur baca, klik Berikutnya, href internal dicek ke `situs/dist/`), `situs/tangkapan/k2-skip.mjs` (kontras langkah runsql yang dilewati), `tmp/k2_kolom.py` (kolom KEPUTUSAN), `tmp/k2_celah.py` (aturan yang tidak dipasangkan `tools/contrast.py`); semuanya di folder yang di-.gitignore. 1.31–1.33 sudah diperiksa di K1x; di sini hanya sambungannya dan teks 1.31 yang diubah 1.35.

### Alur baca 1.33 → 1.34 → 1.35 → 1.36

`node situs/tangkapan/k2-nav.mjs http://127.0.0.1:4323 situs/dist` di 375×667 dan 1366×657: 1.31, 1.33, 1.34, dan 1.35 `200`, `scrollWidth` sama dengan lebar viewport, 0 error konsol. Di tiap halaman, Berikutnya blok 1–4 digulir ke layar, diklik, lalu dibaca 900 ms sesudahnya: blok tujuan terbuka dan terlihat, 16 dari 16 per ukuran (top 80–232 px).

| Halaman | Blok (dua pertama terbuka) | Blok 5 dan Lanjut → | Breadcrumb HP | Sidebar aktif |
|---|---|---|---|---|
| 1.31 Deployment + ADR 9 | lima blok konsep | `/tahap-1/testing/` (1.32) | Tahap 1 | 1.31 |
| 1.33 App versi lama + ADR 10 | lima blok konsep | `/tahap-1/m7-env-di-repo/` (1.34) | Tahap 1 | 1.33 |
| 1.34 M7 | Gejala, Yang Raka kira, Yang sebenarnya, Coba sendiri, Konsep yang lahir | `/tahap-1/secret/` (1.35) | Tahap 1 › minggu 5 | 1.34 |
| 1.35 Keamanan 3 + ADR 11 | lima blok konsep | `/d-system-design/d1-kerangka-berpikir/` (1.38 lama) | Tahap 1 | 1.35 |

Di desktop breadcrumb keempatnya "Tahap 1 · Uji coba Gedung A › Masalah yang muncul". Sambungan 1.33 → 1.34 yang di K1x belum bisa diperiksa sekarang ada: `[[berikutnya]]` di Inti 1.33 dan Lanjut menunjuk 1.34. 1.35 → 1.36: 1.36 dan 1.37 belum ditulis, jadi `urutanBaca` meloncat ke 1.38 lama, pola yang sama dengan 1.33 → 1.38 di K1x. 1.38 lama `200`, Sebelumnya → `/tahap-1/secret/`, 0 error konsol. Bukan temuan; Lanjut pindah sendiri ke 1.36 saat halaman itu terbit.

Isi sambungannya cocok. 1.33 berakhir dengan server expand yang melayani app 1.0 dan 1.1. 1.34 dibuka "Minggu 5, sesudah deploy hari Senin", saat Raka menyiapkan CI pertama dari 1.31. Inti 1.35 menyambung ke M7: password `rekeningo_app` ikut di setiap clone sejak minggu 1.

### Tautan

href internal di `<main>`: 1.31 (33), 1.33 (20), 1.34 (7), 1.35 (30); 0 tujuan atau anchor salah. Yang tanpa target hanya 1.31 → `/tahap-1/tim-infra/` (1.36) dua kali, dengan kelas `rujukan-menyusul` dan `title="Halaman ini belum ditulis"`. 1.34 dan 1.35 tidak merujuk 1.36.

### Cocok lintas halaman

| Yang diperiksa | Hasil | Bukti |
|---|---|---|
| Asal `DATABASE_URL` | Cocok: environment shell dulu, lalu `.env` di folder proyek; lab lewat shell, VPS lewat `.env` | 1.31 baris 73; 1.35 baris 92; `compose.yaml` baris 10 |
| Siapa menyimpan apa | Cocok: password VPS di `.env` VPS dengan `chmod 600`, token GHCR di file konfigurasi Docker VPS, laptop memakai database lokal. 1.34 baris 53 (password baru juga di `.env` laptop) dikoreksi terang-terangan oleh ADR 11 butir 5 | 1.35 baris 76–80, 153 |
| Token GHCR | Cocok: dari VPS personal access token (classic) dengan `read:packages`; di Actions hanya `GITHUB_TOKEN` per job | 1.31 baris 99; 1.34 baris 85; 1.35 baris 79, 82, 84, 154 |
| Kunci CI ke VPS | Tidak cocok: 1.34 baris 85 menyebut "kunci CI ke VPS" sebagai secret yang tempatnya diputuskan ADR 11, padahal ADR 11 sengaja tidak membuatnya | 1.35 baris 80, 154; 1.31 baris 162. Diperbaiki langsung |
| gitleaks: baris tambahan dan seluruh riwayat | Cocok: satu commit hanya baris yang ditambahkan; CI dengan `fetch-depth: 0` memindai seluruh riwayat | 1.34 baris 68 (`sources/git.go` v8.30.1); 1.35 baris 60, 104, 152, 161 |
| Pemicu CI (catatan peninjau #179 b) | Tidak cocok: 1.35 baris 104 "di setiap push", sedangkan baris 152 dan 1.31 baris 91, 142 "setiap push ke `main`" | `labs/api-t1/deploy/ci.yml` baris 6–7 `push: branches: [main]`. Diperbaiki langsung |
| Tahap yang merevisi | Cocok: Tahap 3 staging, CI penuh, dan kunci deploy; Tahap 4 secret manager, cloud managed, tiga tim | 1.31 baris 156, 162; 1.35 baris 173, 179–182; CERITA tabel tahap baris 66–67; PROPOSAL baris 151 |
| Server expand sejak 1.33 | Cocok: rotasi 1.35 langkah 3 menjalankan "hash yang sedang jalan"; 1.34–1.35 tidak menyebut `jumlah` atau `nominal` | 1.33 baris 142 |
| Minggu, tokoh, commit | Cocok: M7 minggu 5 sesudah M6, password di clone minggu 1–5, commit `80952b1` sama di kedua halaman; hanya Raka, tanpa nomor akun, Cek diri 2 memakai "seseorang", bukan Dimas | 1.34 baris 14, 47, 57; 1.35 baris 137, 163, 199 |
| Chip Rantai rotasi (catatan peninjau #179 a) | Nyata: "baris kedua dari m7.txt bagian I" bisa terbaca baris kedua file, padahal maksudnya baris kedua Rantai | Diperbaiki: "Urutan ADR 11 · Container lama dari m7.txt bagian I". Nama baris sama dengan label baris Rantai; tanpa titik dua supaya tidak bertumpuk (pola K1x butir f) |

### Layar pertama

`layar.mjs` di gerbang: `LOLOS: 0 gagal, 0 margin tipis.` Margin 1.35 di 375×667 / 1366×657: 106 / 47 px. 1.34 (masalah) "tanpa Inti", tidak diukur, sama dengan 1.26 dan 1.30 di K1. Dua tangkapan HP gelap dibuka. 1.34: breadcrumb "Tahap 1 › minggu 5", judul bernomor, Gejala terbuka dengan "Blok 1 dari 5"; ketiga pertanyaan 3 detik terjawab. `api-t1` di paragraf pertama terpotong di tanda hubung ("api-" / "t1"), pemenggalan bawaan browser untuk code inline; tidak dijadikan tugas. 1.35: Inti dan Rantai ringkas dua baris di layar pertama. Simpul pertama baris Repo dan VPS tidak sejajar (±17 px, karena lebar label berbeda); kecil, dicatat untuk jalur teknis tanpa tugas.

### Temuan lintas repo dari pengatur

| Butir | Nilai | Tindakan |
|---|---|---|
| (i) Baris KEPUTUSAN dengan jumlah kolom tak seragam | Sebagian. Dihitung tanpa `\|` (pipe yang di-escape di isi sel), 202, 219, 227, dan 229 sudah 6 `\|` dan tampil benar. Yang nyata: 157 dengan 10, karena `ILIKE '%'\|\|$1\|\|'%'` ditulis tanpa escape di code span; tabel GFM tetap memecah sel di pipe dalam code span ([GFM spec, tables](https://github.github.com/gfm/#tables-extension-)). 247 hanya 3, 252 dan 253 hanya 4 | K2c |
| (ii) runsql `.bb-step.is-skipped { opacity: 0.55 }` | Diukur di 1.22 M4 (tiga langkah dilewati), 1366×657, warna dari computed style dan opacity dikomposit ke latar halaman. Teks SQL (14,4 px): gelap 5,50:1, terang 3,96:1. Label "→ tidak dijalankan" (13,6 px): gelap 3,54:1, terang 2,87:1. Tanpa opacity 16,80 / 17,74 dan 9,53 / 9,66. Tiga dari empat di bawah 4,5:1 (WCAG 2.2 SC 1.4.3); langkah yang dilewati adalah isi, bukan komponen nonaktif. Hitungan pengatur cocok (3,96 / 2,86 / 3,54) | K2a |
| (iii) Celah `tools/contrast.py` | Nyata. Fungsi `pasangan_css` sendiri menghasilkan 90 pasangan dari 81 selector. 146 aturan yang hanya menulis `color` dan 57 yang hanya menulis latar tidak pernah dipasangkan. 6 aturan `opacity` juga tidak, termasuk `.bb-step.is-skipped` (karena itu butir ii lolos gerbang) dan link sidebar `menyusul`. Sebabnya: bentuk 1 butuh color dan latar di aturan yang sama atau aturan dasarnya, bentuk 3 hanya untuk turunan aturan berlatar, dan opacity di aturan induk tidak diturunkan ke color turunannya | K2b |

### Diperbaiki langsung di PR ini

- 1.35 `secret.mdx` baris 104: "di setiap push ke `main`".
- 1.34 `m7-env-di-repo.mdx` baris 85: kunci CI ke VPS tidak lagi disebut sebagai secret yang ada; ADR 11 memutuskan kenapa CI belum diberi kunci itu.
- `situs/data/diagram/t1-secret-rotasi.json`: chip sumber Rantai rotasi.

### Tugas perbaikan yang lahir

- K2a (teknis): langkah runsql yang dilewati ≥ 4,5:1 di dua tema, teks SQL dan label, tanpa `opacity` pada teks; coret dan label "tidak dijalankan" tetap.
- K2b (teknis): `contrast.py` memasangkan aturan yang hanya menulis `color` atau hanya latar dengan pasangan dari aturan leluhur atau halaman, dan menurunkan opacity induk ke turunannya; tes di `tools/test_contrast.py`.
- K2c (teknis): baris KEPUTUSAN 157, 247, 252, 253 jadi lima kolom, dan gerbang menolak baris dengan jumlah pipe tanpa escape yang berbeda dari header.
