# Antrean tugas loop otomatis

Antrean kerja `tools/jalankan-otomatis.sh` (keputusan 216). Setiap iterasi mengambil satu tugas sesuai `plan/PROTOKOL-OTOMATIS.md`. Urutan bagian di file ini adalah urutan kerja.

Aturan file:

- Satu tugas = judul `### <id> · <judul>` dan enam butir: jenis, status, percobaan, bergantung, selesai bila, catatan. `python3 tools/antrean.py --check` memeriksa formatnya di gerbang.
- Jenis: konten, interaksi, perbaikan, crosscheck. Status: antre, dikerjakan, selesai, diparkir. Percobaan: 0–3 (berapa kali gerbang gagal di iterasi yang mengerjakannya).
- Tugas berikutnya: `python3 tools/antrean.py berikut`. Tugas yang bergantung pada tugas diparkir ikut diparkir.
- Pemilik boleh memindah bagian, menambah tugas, atau membuka tugas diparkir (status `antre`, percobaan `0`). Loop hanya menambah tugas baru tepat sesudah tugas yang memunculkannya.

## Definisi selesai bersama

Berlaku untuk setiap tugas, di samping "selesai bila" masing-masing:

1. Gerbang penuh `bash tools/cek_situs.sh --layar` hijau di branch, CI PR hijau, PR di-merge, gerbang hijau lagi di main sesudah merge.
2. Tangkapan layar yang disentuh dilihat sendiri (375×667 dan 1366×657, gelap dan terang); di PR tertulis jawaban: di mana saya, apa yang dibaca dulu, ke mana selanjutnya.
3. Keputusan bukan detail tercatat di `plan/KEPUTUSAN.md` dengan nomor baru (`tools/antrean.py` tidak memberi nomor; ambil nomor terbesar + 1).
4. Skill dipakai: gaya-bahasa untuk teks, visualisasi untuk visual dan interaksi, analisis-kritis untuk klaim, versi, ADR, dan review kode.

**Halaman konten** juga harus: memakai template jenisnya sesuai naskah ("Peta halaman Tahap 1 versi baru"); widget dan lab sesuai kolom naskah, atau beda dengan nomor keputusan; terdaftar di registry dengan jenis, bagian, peran, dan ★ sesuai naskah; angka, status code, dan output dari rekaman lab atau berlabel Ilustrasi/Asumsi; audit bahasa 0 error; Inti dibuka kalimat → visual → dua paragraf rinci (standar sesi redesain, keputusan 212–215), dan visual tampil di layar pertama; Cek diri minimal tiga kartu untuk halaman konsep. Halaman lama yang ditulis ulang mengikuti pola di MEMORI ("Pola tulis ulang halaman lama").

**Tugas interaksi (I6)** juga harus: ukuran JS per halaman sebelum/sesudah dicatat di `plan/AUDIT-TAMPILAN.md`, dan halaman tanpa diagram tidak memuat React Flow; dengan `prefers-reduced-motion` semua gerak hilang dan fungsi tetap; di 375×667 scroll halaman tidak tertangkap diagram; axe 0 pelanggaran di halaman yang disentuh. Tugas interaksi tidak mengubah isi halaman konten, hanya komponen yang dipakainya.

**Crosscheck kecil** artinya: tangkap semua halaman di rentangnya (dua ukuran, dua mode) dan lihat sendiri; cocokkan tiap halaman dengan naskah (jenis, widget, lab, ★, peran) dan registry; jawab tiga pertanyaan navigasi per halaman; tulis hasilnya di `plan/CROSSCHECK-KECIL.md` bagian `<id>` sebagai tabel (halaman, lolos atau perlu dibenahi, bukti). Setiap temuan yang perlu dibenahi menjadi tugas perbaikan baru tepat sesudah crosscheck itu. PR crosscheck tidak mengubah halaman.

## Tugas

### K0 · Crosscheck kecil 1.21–1.25 setelah redesain di-merge

- jenis: crosscheck
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: bagian K0 di `plan/CROSSCHECK-KECIL.md` memuat 1.21–1.25 dengan bukti tangkapan; temuan menjadi tugas perbaikan di bawah K0.
- catatan: Selesai 2026-10-10 (keputusan 218). Kelima halaman cocok dengan naskah dan registry; empat temuan tampilan menjadi K0a–K0c.

### K0a · Inti 1.21, 1.23, 1.25 dengan Rantai dan dua paragraf

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: Inti ketiga halaman dibuka satu kalimat, lalu diagram `Rantai` (data di `situs/data/diagram/`, divalidasi tes Zod yang ada), lalu dua paragraf rinci (standar keputusan 212–215); 1.21 tidak lagi memakai `bb-flow`; 1.23 tidak lagi bergantung pada potongan kode yang terpotong di 375 px (rekaman boleh tetap di bawah diagram); 1.25 menunjukkan laptop dan server dengan skema berbeda dari `migrate.txt`; semua angka dan teks simpul dari rekaman lab; layar pertama 4 ukuran lolos.
- catatan: Dari K0 (`plan/CROSSCHECK-KECIL.md`). Selesai 2026-10-10 (keputusan 220): Rantai biasa terpotong 450–830 px di 375×667, jadi dibuat varian `ringkas` (HP: simpul mengalir mendatar, tanpa sub dan catatan); data dua baris per halaman. Margin 375×667: 1.21 61 px, 1.23 28 px, 1.25 84 px.

### K0b · Visual di blok Kebutuhan 1.24

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: blok Kebutuhan 1.24 punya diagram `Rantai` di layar pertama 375×667 dan 1366×657 (pola keputusan 214: satu baris per pertanyaan PRD, lalu ADR yang menjawabnya), isi dari halaman dan rekaman `koreksi.txt`; tes data diagram lolos.
- catatan: Dari K0. Selesai (keputusan 221): `t1-adr56-pertanyaan-prd.json` ringkas sesudah kalimat pertama; utuh di 375×667 (±40 px tersisa) dan 1366×657.

### K0c · Ilustrasi M4: teks keluar bingkai

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: di ilustrasi Gejala 1.22, teks "bukan 250.000" tetap di dalam bingkai layar HP di 375×667 dan 1366×657, gelap dan terang; dicek dengan tangkapan; ilustrasi lain yang memakai komponen yang sama tidak berubah tampilannya.
- catatan: Dari K0. Selesai 2026-10-10 (keputusan 222): saldo lama dicoret di atas saldo baru; `situs/tools/ukur-ilustrasi.mjs` mengukur luapan teks, M4 lolos di 4 kombinasi; alat menemukan luapan chip M2, jadi K0e.

### K0d · Judul dua baris menempel ke baris meta di HP

- jenis: perbaikan
- status: selesai
- percobaan: 1
- bergantung: -
- selesai bila: di 375×667 baris kedua judul halaman (mis. "hilang" di 1.22) punya jarak yang terlihat ke baris "Baca … menit"; dicek dengan tangkapan 1.22 dan 1.24 (judul dua baris) gelap dan terang; halaman judul satu baris tidak berubah.
- catatan: Temuan laporan pagi uji kering 2026-10-10 (bukti `tmp/laporan-pagi/tahap-1_m4-rp70000-hilang-hp-dark.png`); crosscheck K0 tidak menangkapnya karena `layar.mjs` hanya mengukur margin. Selesai (keputusan 223): margin negatif `p.meta` dihapus; celah judul→meta HP −5,0 → 4,0 px, diukur `situs/tools/ukur-judul.mjs` (masuk gerbang). Judul satu baris di desktop ikut turun ±6 px (tidak bisa dibedakan dengan CSS); `/cerita/peta/` (halaman lama) desktop 1366×657 tipis 14 px.

### K0e · Ilustrasi M2: chip amount dan jumlah lebih lebar dari kotaknya

- jenis: perbaikan
- status: selesai
- percobaan: 1
- bergantung: -
- selesai bila: `node situs/tools/ukur-ilustrasi.mjs --url <preview>` lolos (0 teks keluar bingkai, 5 halaman × 2 ukuran × 2 tema); teks chip M2 tetap `amount` dan `jumlah`; alat itu dijalankan oleh `tools/cek_situs.sh --layar` sesudah layar pertama; tangkapan 1.17 gelap dan terang dilihat.
- catatan: Temuan alat K0c (keputusan 222): `amount` keluar 3,2 satuan (teks 10,8–61,2, kotak 12–60), `jumlah` keluar 1,2 (136,8–187,2, kotak 136–188). Selesai 2026-10-10 (keputusan 224): chip App 7–65, chip Server 132–192, teks tetap; ukur-ilustrasi lolos dan masuk `cek_situs.sh --layar`; tangkapan 1.17 HP gelap/terang dilihat.

### I1 · Pindah ke bun

- jenis: interaksi
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: ADR baru di KEPUTUSAN dengan versi bun stabil terbaru dicek ke sumber resmi hari itu; `bun install` di `situs/` menghasilkan `bun.lock`, `package-lock.json` dihapus, `bun.lock` tidak lagi di `.gitignore`; CI memakai `oven-sh/setup-bun` dengan versi dipin dan `bun install --frozen-lockfile`; build, Vitest, Playwright, dan `tools/cek_situs.sh` tetap jalan; build lokal dan CI menghasilkan halaman yang sama; README menyebut perintah bun; butir I6.
- catatan: Keputusan 225. bun 1.4.2; dist npm dan bun identik (HTML/JS/CSS); perintah `bun run --cwd situs <skrip>` (bukan `bun --cwd situs run`, yang diam-diam tidak menjalankan apa-apa). `.devcontainer/postCreate.sh` belum diubah (izin ditolak), tercatat di MEMORI "Perlu dicek pemilik".

### K0f · Margin layar pertama Peta cerita di desktop

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: `/cerita/peta/` di 1366×657 kembali punya margin layar pertama ≥ 20 px (`layar.mjs` tanpa "margin tipis"); penyebab turunnya dari 20 px (gerbang #132) ke 14 px (gerbang #139) ditulis di keputusan; halaman lain tidak berubah (dibandingkan dengan keluaran `layar.mjs` sebelumnya).
- catatan: Dari laporan pagi 2026-10-10. Di tangkapan, judul kartu "Tahap 1 · Uji coba Gedung A" patah dengan "A" sendirian; kandidat penyebab: `p.meta` K0d (#136). Bukti `tmp/laporan-pagi/cerita_peta-desktop-dark.png`. Selesai (keputusan 228): penyebab meta K0d tanpa margin −6 px; kartu peta dirapikan, margin 14 → 32 px, halaman lain identik.

### I2 · Pasang motion dan @xyflow/react

- jenis: interaksi
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: `bun add motion @xyflow/react` (atau npm bila I1 diparkir), versi dicek ke npm hari itu dan dipin persis; ADR per paket menyebut untuk apa, ukuran gzip, lisensi (keduanya MIT), dan alternatif yang ditolak (mis. GSAP, CSS saja; Mermaid, SVG tangan); build hijau; belum ada halaman yang berubah; butir I6.
- catatan: Selesai 2026-10-10 (keputusan 229, 230). motion 14.1.0, @xyflow/react 12.12.0; `dist/` identik byte per byte dengan build main; ukuran di AUDIT-TAMPILAN bagian 7.

### I3 · Fondasi gerak

- jenis: interaksi
- status: selesai
- percobaan: 0
- bergantung: I2
- selesai bila: komponen MotionProvider dengan `MotionConfig reducedMotion="user"`, memakai `LazyMotion` + `m`; token durasi dan easing di satu file (mis. cepat 150 ms, sedang 250 ms) dan tidak ada angka durasi di komponen lain; aturan tertulis di file token: semua gerak dipicu klik, scroll, atau pilihan, tidak ada animasi yang berjalan sendiri, tidak ada gerak dekoratif; tes Vitest untuk token dan satu tes Playwright bahwa reduced-motion mematikan gerak; belum ada komponen yang memakainya kecuali satu contoh di halaman uji; butir I6.
- catatan: Selesai 2026-10-10 (keputusan 231). `situs/src/gerak/` (token, MotionProvider dengan `useGerak` dan `useAwal`, contoh), halaman uji `/uji/gerak/`, `ukur-gerak.mjs` di gerbang. `reducedMotion="user"` saja tidak cukup (opacity tetap bergerak, frame pertama masih `initial`); provider menutup keduanya.

### I4 · Fondasi diagram

- jenis: interaksi
- status: selesai
- percobaan: 1
- bergantung: I2
- selesai bila: komponen DiagramArsitektur di atas React Flow, data dari registry tahap (kotak, zona, catatan, baru/lama), skema Zod, warna dari token; pengaturan `nodesDraggable` false, `zoomOnScroll` false, `panOnDrag` false di layar sempit, `preventScrolling` false, `fitView`; klik kotak membuka catatannya di bawah diagram (bukan tooltip) dan bisa dioperasikan dengan keyboard; dimuat hanya di halaman yang memakainya (`client:visible`); selalu ada versi statis untuk pembaca layar (`role="img"` + `aria-label`) dan sebelum JS dimuat; CSS React Flow hanya base, gaya dari token, `contrast.py` lolos gelap dan terang; dipakai di satu halaman uji; halaman lain tidak memuat React Flow; butir I6.
- catatan: Selesai 2026-10-10 (keputusan 232). `situs/src/diagram/` (skema, tata, komponen), halaman uji `/uji/diagram/`, `ukur-diagram.mjs` di gerbang. Tahap 1 mendapat zona HP karyawan dan Satu VPS Divisi TI. Hanya halaman uji yang memuat React Flow (58,3 KB gzip). Percobaan 1: CI gagal karena gestur sentuh sintetis tidak menggulir apa pun di Chromium runner Linux (dan titik gestur dihitung sebelum roda menggulir); alat kini mengukur ulang posisi dan memakai gestur kontrol di paragraf, bila kontrol diam yang diperiksa `touch-action`.

### 1.26-lab · Lab M5: rekaman mode rentan m5

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: mode `-rentan m5` di `labs/api-t1` (GET akun tanpa cek pemilik, `service.LihatAkunM5`) dan rekaman `labs/api-t1/output/m5.txt` dari database bersih: Dimas membaca akun 417 miliknya, lalu 418 Warung Ani, lalu enumerasi 401–503; versi benar menjawab 404 untuk akun orang lain; output dibandingkan (status, saldo, urutan; bukan waktu); keputusan baru.
- catatan: Selesai 2026-10-10 (keputusan 233). Dilanjutkan dari branch `tahap-1/lab-m5` (rebase ke main). `m5.txt`: rentan 418 terbaca, enumerasi 200 × 103; benar 418 dan 9999 sama-sama 404 dengan body identik, enumerasi 200 × 1, 404 × 102. `run.py` kini membuang warna ANSI dari gosec (bagian injection gagal di lingkungan loop tanpa itu).

### 1.26 · M5: Angka di URL

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 1.26-lab
- selesai bila: halaman `t1-m5` (masalah, ★, peran security) dengan template masalah: gejala (Dimas mengganti 417 jadi 418, menyimpan 100 saldo ke spreadsheet, mengirimnya ke Sinta) → yang Raka kira (UUID) → yang sebenarnya (backend tidak pernah bertanya pemilik; token di tempat yang salah di app) → coba sendiri dari `m5.txt` → konsep → ADR 7–8 dirujuk; widget alur; ilustrasi adegan M5 baru di `Ilustrasi.astro` (token gelap/terang, tanpa teks di SVG) lewat `<Blok ilustrasi="m5">`; token di app berlabel Ilustrasi bila tidak direkam.
- catatan: Selesai 2026-10-10 (keputusan 234). Spreadsheet 103 baris dari rekaman (naskah: 100); ilustrasi m5 tanpa teks di SVG; widget alur `t1-m5.json` dengan varian versi benar.

### 1.27 · Authentication

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: B5.1 ditulis ulang dari `b-fondasi/b5-1-authentication.mdx` ke `tahap-1/` dengan lima blok, contoh dari login PRD v1 (`login.txt` lab api-t1), widget alur; tanpa Snippet `api-t1-lama`; registry tanpa `lama`.
- catatan: Selesai 2026-10-10 (keputusan 236). `tahap-1/authentication.mdx`, Rantai `t1-authn`, alur baru `t1-authn.json` (varian sesudah logout). JWT 15 menit dari halaman lama dibuang karena bertentangan dengan ADR 8 naskah; JWT tinggal sebagai pembanding.

### 1.28 · Authorization

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: B5.3 ditulis ulang ke `tahap-1/` dengan lima blok, widget alur dan pilah, lab api-t1 (cek pemilik di service) dan b5-rls; tanpa Snippet `api-t1-lama`; registry tanpa `lama`.
- catatan: Selesai 2026-10-10 (keputusan 237). `tahap-1/authorization.mdx`; rekaman baru `authz.txt` (pemilik 404, peran 403, tanpa token 401); `b5-rls` ditulis ulang ke akun v1 dan gagal keras bila hasil beda. Alur `t1-authz` di Coba, pilah di Paham.

### I5a · Blok: buka/tutup dengan layout animation

- jenis: interaksi
- status: selesai
- percobaan: 1
- bergantung: I3
- selesai bila: buka/tutup blok memakai layout animation dari fondasi gerak, menggantikan transisi CSS; tangkapan sebelum/sesudah; butir I6.
- catatan: Selesai 2026-10-10 (keputusan 238). `situs/src/gerak/lipat.ts` (`animate` mini Motion, token, tanpa React) dipakai `Blok.astro`; transisi CSS `blok-muncul` dihapus; `ukur-gerak.mjs` memeriksa Blok (frame pertama, reduced, disela, tanpa JS, axe). `layar.mjs` identik; 28 halaman ber-Blok +2.711 B gzip.

### 1.29 · Keamanan 2: IDOR, enumerasi, token di app + ADR 7–8

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 1.26
- selesai bila: halaman `t1-idor` dengan ADR 7 (cek pemilik di `service/` + RLS sebagai pagar kedua; 404 bukan 403) dan ADR 8 (sesi acak dengan masa berlaku, secure storage; JWT ditunda ke Tahap 4 dengan alasan), masing-masing minimal tiga opsi dan "kapan keputusan ini salah"; widget alur dan banding; lab b5-rls.
- catatan: Jalur Mobile dan Security. Selesai (keputusan 239, 240): lab b5-rls bagian 5–7; ADR 7 memasang RLS di tabel ledger Tahap 2, bukan di tabel v1 api-t1.

### 1.30-lab · Lab M6: rekaman prober deploy

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: rekaman prober deploy dari database bersih: prober memanggil API tiap detik saat binary diganti dan kolom diganti nama; terekam jeda layanan, error untuk client versi lama sesudah ganti nama kolom, dan tidak ada binary lama untuk kembali; output dibandingkan tanpa waktu; keputusan baru.
- catatan: Naskah M6 menyebut "app mati 5 menit" dan "11 HP"; angka itu cerita, angka lab yang tampil di halaman harus dari rekaman. Selesai (keputusan 241): `labs/api-t1/output/m6.txt`, jeda 3 putaran, app 1.0 field `jumlah` hilang dan bayar 400, VPS hanya punya v2, v1 di skema baru 500.

### 1.30 · M6: Deploy hari Senin

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 1.30-lab
- selesai bila: halaman `t1-m6` (masalah, ★, peran devops) dengan template masalah dari rekaman prober; widget alur; ilustrasi adegan M6 baru lewat `<Blok ilustrasi="m6">`.
- catatan: Selesai (keputusan 242): `tahap-1/m6-deploy-hari-senin.mdx`, Rantai `t1-m6-deploy`, alur `t1-m6.json` (dua HP, varian F–G), ilustrasi m6 di `ukur-ilustrasi.mjs`. Angka 5 menit dan 11 HP berlabel cerita.

### 1.27-lab · Lab: 401 tanpa header Authorization tanpa kode error

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: `wajibLogin` (`labs/api-t1/internal/handler/handler.go`, baris `WWW-Authenticate`) mengirim `Bearer` tanpa `error="invalid_token"` bila request tidak membawa header Authorization, dan tetap mengirim `error="invalid_token"` untuk token yang salah atau sesinya berakhir; rekaman `login.txt`, `authz.txt`, dan `http.txt` direkam ulang dari database bersih dan dibandingkan tanpa waktu; halaman yang mengutip header disesuaikan (1.27 `authentication.mdx`, 1.28, skenario `t1-authn.json` dan `t1-login.json`); keputusan baru.
- catatan: RFC 6750 §3.1: bila request tidak membawa informasi authentication sama sekali, resource server SHOULD NOT menyertakan kode error atau informasi error lain; `invalid_token` untuk token yang kedaluwarsa, dicabut, rusak, atau tidak sah (https://www.rfc-editor.org/rfc/rfc6750#section-3.1). Ditemukan peninjau PR #150 (keputusan 237). Jenis "lab" tidak dikenal `tools/antrean.py`, jadi ditulis perbaikan. Selesai (keputusan 243): tanpa token `WWW-Authenticate: Bearer`, token sesudah logout tetap `invalid_token`, diperiksa `harap` di `run.py`; rekaman dua kali identik, hanya baris header login/authz/http dan jumlah baris gosec di injection berubah.

### K1 · Crosscheck kecil 1.26–1.30

- jenis: crosscheck
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: bagian K1 di `plan/CROSSCHECK-KECIL.md` memuat 1.26–1.30 dengan bukti; temuan menjadi tugas perbaikan di bawah K1.
- catatan: Selesai 2026-10-10 (keputusan 244). Alur Berikutnya 1.25 → 1.31 jalan di 375×667 dan 1366×657, 0 error konsol, layar pertama lolos; dua salah kecil diperbaiki langsung (bcrypt cost 10 di 1.27, "103 akun" di 1.29); tiga temuan jadi K1a–K1c; pertentangan C3 lama dengan 1.30 masuk catatan 1.31.

### K1a · Favicon 404 dan dua sisa HTML tautan menyusul

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: `situs/dist/favicon.svg` ada setelah build (ikon sederhana dari token aksen di latar gelap, tanpa teks; atau `favicon` Starlight di `situs/astro.config.mjs` menunjuk file yang ada) dan tidak ada lagi `<link rel="icon">` yang 404; `title` tautan ke halaman yang belum ada sama di sidebar dan di teks, dan tidak menyebut "dipindah" untuk halaman baru (`situs/src/plugins/remark-rujukan.mjs` baris 34, `situs/tools/sidebar.mjs` baris 13); tautan sidebar `nav-menyusul` hanya punya satu atribut `class` (`sidebar.mjs` baris 10–13); build strict dan layar pertama lolos.
- catatan: Dari K1 (`plan/CROSSCHECK-KECIL.md`): 79 halaman memuat `/favicon.svg` yang 404; `situs/public/` tidak punya favicon. Ganti `title` dan kelas mengubah HTML semua halaman; bandingkan sidik `tmp/sidik_dist.py`. Selesai 2026-10-10 (keputusan 245): favicon aksen di latar gelap, `title` dari `JUDUL_MENYUSUL`, penanda sidebar di `data-nav`; `tmp/k1a_cek.py` 0 salah, `layar.mjs` identik.

### K1b · Batas percobaan login di satu tahap

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: 1.7 (`fitur-login.mdx` baris 83), 1.27 (`authentication.mdx` baris 62, 192), dan 1.29 (`idor-token-app.mdx` baris 67, 176, 184) menyebut tahap yang sama untuk batas percobaan login, sesuai PROPOSAL tabel keamanan (Tahap 2: brute force, rate limit per akun, lockout bertahap); rujukan `[[C4]]` (3.7, Tahap 3) tidak lagi disebut sebagai tempat batas itu lahir, atau disebut sebagai bahan lanjutan saja; `python3 tools/sinkron_cerita.py` dan gerbang lolos.
- catatan: Dari K1. `plan/PROPOSAL.md` baris 686 menaruh brute force di Tahap 2 ("Perluas `c4-ratelimit`"); 1.29 menulis "[[C4]], Tahap 3". Selesai 2026-10-10 (keputusan 244): 1.29 baris 67, 176, 184 kini menulis Tahap 2, bersama brute force; 1.7 dan 1.27 sudah Tahap 2; rujukan C4 dilepas.

### K1c · ADR 7 butir 4 dan RLS di ledger

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: ADR 7 di 1.29 (`idor-token-app.mdx`) tidak lagi bertentangan dengan dirinya sendiri: Inti (baris 22) merencanakan RLS untuk ledger Tahap 2, butir 4 (baris 126) melarang RLS di tabel yang dibaca atau ditulis atas nama pihak lain, dan "Yang merevisinya nanti" (baris 137) menulis ledger di-`INSERT` untuk Warung Ani dari pembayaran Dimas. Butir 4 dirumuskan ulang dengan syarat yang bisa diuji (mis. policy per perintah: `SELECT` pemilik, `INSERT` lewat jalur service yang diperiksa) dan klaimnya didukung rekaman `b5-rls` atau dokumentasi PostgreSQL; Inti, butir, dan blok terakhir saling cocok; gerbang lolos.
- catatan: Dari K1. Pakai skill analisis-kritis; jangan menambah klaim RLS tanpa rekaman (pola temuan peninjau #150: FORCE dan superuser). Selesai 2026-10-11 (keputusan 246): butir 4 jadi policy per perintah (`SELECT` pemilik, entri dua sisi lewat fungsi `bayar` `SECURITY DEFINER`); lab `b5-rls` bagian 9–10 merekamnya; baris 1–109 rekaman tidak bergeser.

### 1.31 · Deployment dan rollback + ADR 9

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: 1.30
- selesai bila: C3 ditulis ulang ke `tahap-1/` dengan ADR 9 (image per commit, rollback = tag lama, CI pertama); Infra 1 (satu VPS, Compose, kenapa cukup); widget alur; tanpa Snippet `api-t1-lama`.
- catatan: Jalur DevOps. Dari K1: C3 lama bertentangan dengan 1.30 (deploy `ssh` + `git pull` + build di server vs build di laptop lalu `scp`; "suatu malam", mati 40 menit, pulih dari Git vs Senin 12.10, mati 5 menit, v1 hasil build ulang menjawab 500 di `m6.txt` baris 87); prasyarat C3 kosong (harus 1.30); kolom `telp` tidak ada di skema v1; `TOKEN_SECRET` ikut di `kartu.json`. Semuanya hilang saat ditulis ulang.

### I5b · Beranda: peta tahap memakai DiagramArsitektur

- jenis: interaksi
- status: selesai
- percobaan: 0
- bergantung: I3, I4
- selesai bila: peta tahap di beranda memakai DiagramArsitektur; memilih tahap mengubah diagram dengan transisi; jawaban teka-teki muncul dengan gerak singkat; tangkapan sebelum/sesudah; butir I6.
- catatan: keputusan 248

### G1 · Gerbang menghentikan daemon preview

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: `tools/cek_situs.sh` menjalankan `bun run --cwd situs preview stop` (atau padanan yang benar) sebelum mulai dan di trap; gagal keras bila loop `curl` tidak pernah berhasil; memastikan server yang dilayani adalah `situs/dist` worktree ini (mis. bandingkan `index.html` yang dilayani dengan `situs/dist/index.html`); sesudah gerbang LOLOS tidak ada proses yang memegang port 4321.
- catatan: ditemukan peninjau PR #161; `astro preview` Astro 7 berjalan sebagai daemon, `trap kill $PID` hanya membunuh `bun run`, dan saat daemon lama hidup Astro mencetak "Preview server already running" sehingga gerbang memakai server lama (bisa dari worktree lain). Selesai: keputusan 249.

### 1.32 · Testing: apa dites di level mana

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: C1 ditulis ulang ke `tahap-1/` dengan lima blok, widget pilah dan stackstep, lab api-t1; tanpa Snippet `api-t1-lama`.
- catatan: keputusan 250, 251; PR menunggu tinjauan pemilik

### 1.33 · App versi lama + ADR 10

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: E1 ditulis ulang ke `tahap-1/` dengan ADR 10 (field tidak pernah diganti nama, expand lalu contract) yang berdiri sendiri tanpa rekaman B4.2; widget alur; tanpa Snippet `api-t1-lama`.
- catatan: Prasyarat B4.2 (Tahap 2) dibuang (MEMORI). Jalur Mobile.

### P1 · 1.4 dan 1.6 lepas dari api-t1-lama

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: -
- selesai bila: `adr-1-backend-sendiri.mdx` dan `struktur-folder.mdx` memakai Snippet dari `labs/api-t1` (folder nyata), bukan `api-t1-lama`; `grep -rn api-t1-lama situs/src/content/docs/tahap-1/` kosong.
- catatan: -

### P2 · Hapus labs/api-t1-lama

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: 1.27, 1.28, 1.31, 1.32, 1.33, P1
- selesai bila: `grep -rn api-t1-lama situs/ labs/ tools/` kosong kecuali folder itu sendiri, bukti grep tertulis di PR; folder `labs/api-t1-lama` dihapus; tabel lab di README diperbarui.
- catatan: Disetujui pemilik 2026-10-08 dengan syarat grep kosong (MEMORI "Catatan untuk penulisan ulang Tahap 1"). Kalau grep tidak kosong, jangan hapus: parkir dengan daftar rujukannya.

### 1.34-lab · Lab M7: .env di riwayat git

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: -
- selesai bila: mode rentan M7 yang direkam di dalam container atau folder sementara lab: repo contoh meng-commit `.env` berisi nilai palsu, file dihapus, gitleaks tetap menemukannya di riwayat, pre-commit hook menolak commit berikutnya; rekaman dibandingkan tanpa waktu; tidak ada secret nyata; keputusan baru.
- catatan: Lab serangan hanya di dalam container atau folder sementara lab.

### 1.34 · M7: .env di repo

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 1.34-lab
- selesai bila: halaman `t1-m7` (masalah, peran security) dengan template masalah dari rekaman M7.
- catatan: -

### I5c · Widget alur

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: I3
- selesai bila: widget alur (pindah ke React bila belum): paket data bergerak dari komponen ke komponen saat Berikutnya ditekan; lapisan yang aktif tersorot; semua halaman yang memakai alur tetap jalan; tangkapan sebelum/sesudah; butir I6.
- catatan: -

### 1.35 · Keamanan 3: secret + ADR 11

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 1.34
- selesai bila: halaman `t1-secret` dengan ADR 11 (`.env.example`, pre-commit gitleaks, secret hanya di server), minimal tiga opsi dan "kapan keputusan ini salah"; lab api-t1.
- catatan: Jalur Security.

### K2 · Crosscheck kecil 1.31–1.35

- jenis: crosscheck
- status: antre
- percobaan: 0
- bergantung: -
- selesai bila: bagian K2 di `plan/CROSSCHECK-KECIL.md` memuat 1.31–1.35 dengan bukti; temuan menjadi tugas perbaikan di bawah K2.
- catatan: -

### 1.36 · Tim dan infra Tahap 1

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: -
- selesai bila: halaman `t1-tim-infra` dengan template tim-infra: satu orang, satu VPS, CI pertama, dengan file nyata dari repo lab; widget alur.
- catatan: Jalur DevOps.

### 1.37 · M8: Uji coba lolos, PRD v2 datang

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: -
- selesai bila: halaman `t1-m8` (masalah, ★) dengan widget React baru kalkulator (logika murni di `.ts`, data divalidasi Zod, tes Vitest); puncak 0,14 RPS dihitung terbuka dari `tahap[0].asumsi`; tabel "Angka di tahap ini" ditulis ulang di sini atau di 1.38.
- catatan: -

### I5d · Angka berubah dengan tween

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: I3
- selesai bila: jumlah-total dan saldo di mockup HP berubah dengan tween singkat dari token gerak; tangkapan sebelum/sesudah; butir I6.
- catatan: -

### 1.38 · Kerangka berpikir dan estimasi

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 1.37
- selesai bila: D1 ditulis ulang ke `tahap-1/` dengan widget kalkulator; angka dari `tahap[0].asumsi`.
- catatan: -

### 1.39 · Spesifikasi untuk AI dan review kode AI

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: -
- selesai bila: F1 ditulis ulang ke `tahap-1/` dan menyerap F2; halaman F2 dan entrinya dihapus di PR yang sama (pola keputusan 150, sudah direncanakan registry v2); tes registri disesuaikan; widget banding dan pilah; lab f2-review.
- catatan: -

### 1.40 · ADR 12: Sengaja belum dilakukan

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: -
- selesai bila: halaman `t1-adr-12` (adr, ★): tanpa cache, queue, service kedua, k8s, masing-masing dengan alasan dan "kapan keputusan ini salah"; menyebut dua yang pecah di Tahap 2 (dua request bersamaan; retry dari app).
- catatan: -

### K3 · Crosscheck kecil 1.36–1.40

- jenis: crosscheck
- status: antre
- percobaan: 0
- bergantung: -
- selesai bila: bagian K3 di `plan/CROSSCHECK-KECIL.md` memuat 1.36–1.40 dengan bukti; temuan menjadi tugas perbaikan di bawah K3.
- catatan: -

### I5e · Race: garis waktu dua client

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: I3
- selesai bila: widget race menampilkan garis waktu dua client; langkah yang lewat tetap terlihat; langkah baru masuk dengan gerak; tangkapan sebelum/sesudah; butir I6.
- catatan: -

### 1.41 · Yang dibawa keluar dari Tahap 1

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: -
- selesai bila: halaman `t1-rekap` dengan 10 kalimat dari naskah bagian 5, masing-masing terikat ke kejadiannya, plus Cek diri gabungan; widget kartu.
- catatan: -

### 1.42 · Jembatan: pratinjau PRD v2

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: -
- selesai bila: halaman `t1-jembatan` (prd, ★) menampilkan pratinjau PRD v2 dari naskah bagian 6 dan widget tebak (`situs/src/widgets/tebak/`): dari 12 ADR, mana yang dibuka lagi; jawabannya ADR 6 dan ADR 5 dengan alasan naskah.
- catatan: -

### I5f · Diagram arsitektur di halaman tahap dan ADR

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: I4
- selesai bila: diagram kotak statis di halaman tahap dan halaman ADR (banding) diganti DiagramArsitektur; MEMORI mendapat bagian "Untuk halaman baru": cara memakai DiagramArsitektur dan token gerak; tangkapan sebelum/sesudah; butir I6.
- catatan: Widget lain hanya bila jelas membantu pemahaman; alasannya dicatat di keputusan.

### P3 · Halaman cara pakai untuk lima blok dan tiga pintu

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: -
- selesai bila: `/cara-pakai/` menjelaskan lima blok dan tiga pintu (cerita, peran, masalah), bukan susunan lima bagian lama; audit bahasa 0 error.
- catatan: Dari MEMORI "Catatan untuk penulisan ulang Tahap 1".

### P4 · Ilustrasi latar perusahaan Grup Lestari

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: -
- selesai bila: adegan latar perusahaan baru di `Ilustrasi.astro` (kampus tiga gedung, kantin, warung tenant; token gelap/terang, tanpa teks di SVG) dipakai di 1.1 PRD v1; `contrast.py` lolos.
- catatan: Naskah meminta satu ilustrasi latar dan satu per masalah M3–M6.

### R1 · Visual layar pertama: 1.3, 1.5, 1.6

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: -
- selesai bila: di tiap halaman Inti = kalimat → visual → dua paragraf rinci, plus satu diagram di Paham (`Rantai.astro` atau `PetaFitur.astro`, data JSON + Zod); visual tampil di layar pertama 4 ukuran; satu commit per halaman.
- catatan: Setengah jalan dari sesi redesain (MEMORI sesi 3, langkah 5): langkah 1–4 selesai di #120.

### R2 · Visual layar pertama: 1.11, 1.12, 1.13

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: -
- selesai bila: sama dengan R1 untuk 1.11, 1.12, 1.13.
- catatan: -

### R3 · Visual layar pertama: 1.15, 1.16, 1.18

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: -
- selesai bila: sama dengan R1 untuk 1.15, 1.16, 1.18.
- catatan: -

### R4 · Visual layar pertama: 1.20, 1.21, 1.23

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: -
- selesai bila: sama dengan R1 untuk 1.20, 1.21, 1.23.
- catatan: -

### R5 · Visual layar pertama: 1.24, 1.25

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: -
- selesai bila: 1.24 (ADR: diagram di blok Kebutuhan seperti 1.4) dan 1.25 (konsep: seperti R1) punya visual di layar pertama.
- catatan: Ditulis di main tanpa redesain.

### R6 · Aturan layar: visual wajib di layar pertama

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: R1, R2, R3, R4, R5
- selesai bila: `situs/tools/layar.mjs` gagal bila halaman berblok tidak menampilkan visual di layar pertama 4 ukuran; semua halaman Tahap 1 yang ada lolos.
- catatan: Setengah jalan dari sesi redesain (MEMORI sesi 3, langkah 6).

### X1 · Crosscheck penuh Tahap 1

- jenis: crosscheck
- status: antre
- percobaan: 0
- bergantung: -
- selesai bila: isi `plan/PROMPT-CROSSCHECK.md` dijalankan; `plan/LAPORAN-TAHAP-1.md` ditulis; setiap perbaikan dari laporan menjadi tugas perbaikan baru sesudah X1 (satu tugas per perbaikan, bukan dikerjakan di iterasi X1).
- catatan: -

### X2 · Penutup Tahap 1

- jenis: crosscheck
- status: antre
- percobaan: 0
- bergantung: X1
- selesai bila: semua tugas dari X1 selesai atau diparkir; tangkapan seluruh Tahap 1 dilihat; laporan di STATUS dan baris "Tahap 1: crosscheck selesai"; tidak ada tugas Tahap 2 yang dimulai.
- catatan: Tahap 2 menunggu `plan/CERITA-TAHAP-2.md` dari pemilik.
