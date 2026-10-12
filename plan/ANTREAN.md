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
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: `adr-1-backend-sendiri.mdx` dan `struktur-folder.mdx` memakai Snippet dari `labs/api-t1` (folder nyata), bukan `api-t1-lama`; `grep -rn api-t1-lama situs/src/content/docs/tahap-1/` kosong.
- catatan: 1.4 memakai `internal/service/bayar.go` region `bayar`; 1.4 menyebut transaction baru ada setelah M4 (minggu 3), seperti 1.9; 1.6 memakai komentar package handler, service, repo, pohon rencananya tetap `migrations/`, dan kalimat lab menyebut beda `schema.sql`.

### K1x · Crosscheck kecil 1.31–1.33

- jenis: crosscheck
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: bagian K1x di `plan/CROSSCHECK-KECIL.md` memuat 1.31–1.33, P1 di 1.4 dan 1.6, beranda I5b, dan sambungan 1.30→1.31 dengan bukti; temuan menjadi tugas perbaikan di bawah K1x.
- catatan: Ditambahkan pengatur karena K2 mencakup lima halaman. Selesai 2026-10-11 (keputusan 254): alur 1.30→1.33 tanpa error konsol dan scroll horizontal, href 0 salah, konsistensi lintas halaman cocok, layar pertama lolos; tujuh salah kecil diperbaiki langsung; lima temuan jadi K1xa–K1xe.

### K1xa · CLS beranda untuk tab 2–5 sebelum hydrate

- jenis: perbaikan
- status: selesai
- percobaan: 1
- bergantung: -
- selesai bila: tap tab Tahap 2, 3, 4, dan 5 sebelum hydrate di 375×667 masing-masing diukur di gerbang (`situs/tools/ukur-diagram.mjs` bagian 6 untuk semua tab, bukan hanya Tahap 3) dan geseran tiap tab 0 px (CLS 0); komentar `situs/src/components/Beranda.astro` di atas `cssPesan` diperbarui dengan angka ukur baru dan cara ukurnya; tangkapan sebelum/sesudah.
- catatan: Dari K1x butir (e). Ukuran review PR #166 dengan cara `ukur-diagram.mjs` bagian 6, per tab, dua kali identik: Tahap 2 dan 3 geser 63 px (CLS 0,0105), Tahap 4 dan 5 geser 41 px (CLS 0,0067). Gerbang sekarang hanya mengukur Tahap 3. Angka 20–63 px dan CLS 0,0323 dari review PR sebelumnya tidak bisa dihasilkan ulang dan tidak dipakai. Keputusan 248. Selesai 2026-10-11 (frasa K1xa di keputusan 248): kaki setiap tahap di `.peta__pesan`, ditampilkan cssPesan selama diagram belum mengikuti tab; bagian 6 mengukur Tahap 2–6, semuanya geser 0 px dan CLS 0 (sebelumnya 63, 63, 41, 41, 0 px).

### K1xb · Kontrak expand: salah satu jumlah atau nominal wajib

- jenis: perbaikan
- status: selesai
- percobaan: 1
- bergantung: -
- selesai bila: `PermintaanBayar` di `labs/b1-openapi/openapi-expand.yaml` menyatakan salah satu `jumlah` atau `nominal` wajib (mis. `anyOf` dengan `required: [jumlah]` dan `required: [nominal]`), dicek ke spesifikasi OpenAPI yang dipakai file itu; redocly lint dan oasdiff direkam ulang ke `labs/b1-openapi/output/expand.txt` (dua kali identik); bila hasil oasdiff berubah, 1.33 baris 79 diperbarui sesuai rekaman; Snippet 1.33 `openapi-expand.yaml` `lines="221:228"` (`situs/src/content/docs/tahap-1/app-versi-lama.mdx` ~baris 77) diganti region `skema-bayar` atau rentang baru, supaya syarat baru tampil; keputusan baru.
- catatan: Dari K1x butir (f): server expand menjawab `400` (field `jumlah`) bila keduanya tidak dikirim (`EXPAND_UBAH` di `labs/api-t1/run.py`), tetapi kontrak hanya mewajibkan `ke`. Selesai 2026-10-11 (keputusan 255): `anyOf` dengan `required: [jumlah]` dan `required: [nominal]`; rekaman `expand.txt` dua kali identik dan tidak berubah (oasdiff tetap tanpa breaking change), jadi kalimat 1.33 baris 79 tetap; Snippet 1.33 memakai region `skema-bayar`.

### K1xc · Skema Bearer tidak peka huruf di lab api-t1

- jenis: perbaikan
- status: selesai
- percobaan: 1
- bergantung: -
- selesai bila: lab `api-t1` menerima `bearer` dan `BEARER` sama dengan `Bearer` (RFC 9110 §11.1), dengan tes; rekaman yang memuat header Authorization dibandingkan sebelum dan sesudah (status, urutan; bukan waktu) dan tidak berubah kecuali baris baru untuk kasus ini; Snippet 1.27 (region `wajib-login`, `situs/src/content/docs/tahap-1/authentication.mdx` ~baris 74) dan teks 1.27 ~baris 76 (tanpa token hanya `Bearer`, token ditolak `Bearer error="invalid_token"`) tetap cocok dengan kode baru; keputusan baru.
- catatan: Dari K1x butir (g): sekarang `bearer <token>` diperlakukan sebagai tanpa token (`401`). `strings.CutPrefix(..., "Bearer ")` ada di dua tempat di `labs/api-t1/internal/handler/handler.go`: `wajibLogin` ~baris 139, di dalam region `wajib-login` (135–160) yang tampil di 1.27, dan `logout` ~baris 165. Selesai 2026-10-11 (keputusan 256): helper `tokenBearer` (`strings.Cut` + `strings.EqualFold`) dipakai `wajibLogin` dan `logout`, tes unit `TestTokenBearer` tanpa database; rekaman hanya berubah di `testing.txt` (+3 baris per bagian A/B, rentang Snippet 1.32 digeser, isi sama) dan ringkasan `Lines` gosec di `injection.txt`.

### K1xd · 1.29: rekaman bagian 10 tampil untuk klaimnya

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: kalimat di `situs/src/content/docs/tahap-1/idor-token-app.mdx` sesudah Snippet bagian 10 (Warung Ani melihat +5.000, `INSERT` ditolak `permission denied`, `bayar` tanpa identitas ditolak) didukung Snippet yang tampil dari `labs/b5-rls/output/rls.txt` baris 157–160 dan 174–181 (atau satu Snippet bila komponen mendukung beberapa rentang); layar pertama 1.29 tidak berubah.
- catatan: Dari K1x butir (b): Snippet sekarang hanya baris 134–144 (Dimas −5.000).

### K1xe · Berikutnya blok 1: blok tujuan tetap dekat layar saat blok 1 menutup

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: diukur dari tombol Berikutnya blok 1 yang sudah di layar (tombol digulir ke layar dulu, lalu diklik, lalu disampel per rAF), di frame pertama sesudah klik top blok tujuan masih di dalam viewport, atau jarak gulir ≤ satu tinggi viewport; berlaku di halaman ADR (1.4, 1.24, dan yang menyusul) dan halaman konsep (mis. 1.32) di 375×667 dan 1366×657; pemeriksaannya masuk gerbang (mis. `ukur-gerak.mjs`); komentar handler Berikutnya di `situs/src/components/Blok.astro` ("sudah di atas layar") sesuai perilakunya; reduced motion tetap tanpa gerak.
- catatan: Diagnosis K1x salah (review PR #166): `k1x-adr.mjs` membaca `scrollY` sebelum `click()` Playwright, yang lebih dulu menggulir ke tombol, jadi "0 → 1.737" adalah gulir otomatis itu. Tidak ada gulir yang melewati tujuan. Masalah nyata: blok 1 menutup selagi masih di layar, tinggi halaman turun, dan blok tujuan meloncat ke atas viewport sebelum gulir halus membawanya kembali. Ukuran 2026-10-11 (`situs/tangkapan/k1xe-gulir.mjs`, di-.gitignore, tulis ulang bila hilang; tombol di top ±351 px; top blok tujuan di frame 1 → jarak gulir, lama gulir): 1.4 375×667 −1.570 px → 1.682 px, 663 ms; 1.4 1366×657 −576 → 672 px, 436 ms; 1.24 375×667 −898 → 1.010 px, 510 ms; 1.24 1366×657 −588 → 684 px, 418 ms; 1.32 375×667 −301 → 389 px, 314 ms; 1.32 1366×657 −195 → 291 px, 275 ms. Menurut syarat di atas, 1.4 dan 1.24 gagal di kedua ukuran; 1.32 lolos karena jarak gulirnya di bawah satu viewport.

### P2 · Hapus labs/api-t1-lama

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: 1.27, 1.28, 1.31, 1.32, 1.33, P1
- selesai bila: `grep -rn api-t1-lama situs/ labs/ tools/` kosong kecuali folder itu sendiri, bukti grep tertulis di PR; folder `labs/api-t1-lama` dihapus; tabel lab di README diperbarui.
- catatan: Disetujui pemilik 2026-10-08 dengan syarat grep kosong (MEMORI "Catatan untuk penulisan ulang Tahap 1"). Kalau grep tidak kosong, jangan hapus: parkir dengan daftar rujukannya.

### 1.34-lab · Lab M7: .env di riwayat git

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: mode rentan M7 yang direkam di dalam container atau folder sementara lab: repo contoh meng-commit `.env` berisi nilai palsu, file dihapus, gitleaks tetap menemukannya di riwayat, pre-commit hook menolak commit berikutnya; rekaman dibandingkan tanpa waktu; tidak ada secret nyata; keputusan baru.
- catatan: Lab serangan hanya di dalam container atau folder sementara lab.

### 1.34 · M7: .env di repo

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 1.34-lab
- selesai bila: halaman `t1-m7` (masalah, peran security) dengan template masalah dari rekaman M7.
- catatan: keputusan 260. ADR 11 dan bagian E, G, H `m7.txt` untuk 1.35.

### I5c · Widget alur

- jenis: interaksi
- status: selesai
- percobaan: 0
- bergantung: I3
- selesai bila: widget alur (pindah ke React bila belum): paket data bergerak dari komponen ke komponen saat Berikutnya ditekan; lapisan yang aktif tersorot; semua halaman yang memakai alur tetap jalan; tangkapan sebelum/sesudah; butir I6.
- catatan: keputusan 261

### I5c-a · Kontras mockup HP mode terang

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: I5c
- selesai bila: axe `color-contrast` 0 pelanggaran di halaman alur mode terang, termasuk `.bb-hp__saldo small` (3,6:1) dan `.bb-hp__saldo > strong` (putih di #0075EB, 4,42:1), juga `.bb-alur__packet`; `contrast.py`/`palette.py` memeriksa pasangan yang dipakai CSS sebagai teks (`--ink-di-aksen` di atas `--k-system-edge`, tema.css ±319 dan ±347) supaya celah ini tertutup; palet tetap sesuai CLAUDE.md.
- catatan: ditemukan peninjau PR #175; ada di main sebelum I5c. Selesai: keputusan 262.

### I5c-b · CLS alur saat dimuat

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: I5c
- selesai bila: widget alur memesan tinggi sejak SSR (atau render awal statis) sehingga CLS saat dimuat ≤ 0,1 di semua halaman alur (di main 15 halaman > 0,01, nilai bervariasi, mis. b4-2 0,278, b5-2 0,075–0,320), diukur dengan modul JS ditunda dan masuk gerbang.
- catatan: ditemukan peninjau PR #175. Selesai: keputusan 263.

### I5c-c · Alur di HP lanskap

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: I5c
- selesai bila: di 667×375 paket dan tombol Berikutnya terlihat bersamaan sesudah setiap klik di semua halaman alur (sekarang paket di luar layar di 176 dari 193 klik, sama dengan main), mis. syarat mode sempit `lebar < 600 || innerHeight < 500`; pemeriksaan 667×375 masuk `ukur-gerak.mjs`.
- catatan: ditemukan peninjau PR #175 putaran 2. Selesai: keputusan 350, PR #180.

### I5c-d · CLS halaman alur di CI

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: I5c-b
- selesai bila: `ukur-cls.mjs` gagal (bukan `lewat`) bila CLS halaman > 0,1; run CI hijau dengan 0 lewat di 28 halaman × 375×667 dan 1366×657 (dua posisi, modul ditunda 600 ms); setiap sumber dari run 38140527859 hilang atau < 0,01: `.content-panel` naik 29 px di 375 saat modul datang (m6 0,342; m2 0,340; b3-2 dan b5-2 0,336; authentication 0,318; fitur-bayar 0,244); `figure.rantai`/`.rantai__baris` naik 20–31 px (authorization 0,270; app-versi-lama 0,239; deployment-rollback 0,174); `figure.bb-fig` dan diagram arsitektur naik 30 px (kontrak-openapi 0,238; b2-5 0,194; b10-1 0,171); `details.blok` naik 31 px (fitur-login 0,106); `li` sidebar naik 21 px di 1366 (b3-2, b5-2, d2, e3); penyebab beda lokal (0 lewat) dan CI dicatat di keputusan.
- catatan: ditemukan peninjau PR #177. CI run 38144799335 juga mengukur 1440×900: 45 baris lewat (375: 21, 1366: 8, 1440: 16), maks 0,473 di validation-error (`.content-panel` y200→158); sumber di 1440: `?` y228→207 di 6 halaman, `li` sidebar 21 px, `.bb-predict` 32 px; tambahkan 1440 ke syarat. Jalur teknis (keputusan 264). Selesai: keputusan 351, PR #181.

### 1.35 · Keamanan 3: secret + ADR 11

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 1.34
- selesai bila: halaman `t1-secret` dengan ADR 11 (`.env.example`, pre-commit gitleaks, secret hanya di server), minimal tiga opsi dan "kapan keputusan ini salah"; lab api-t1.
- catatan: Jalur Security. Selesai: keputusan 300, PR #179.

### K2 · Crosscheck kecil 1.34–1.35

- jenis: crosscheck
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: bagian K2 di `plan/CROSSCHECK-KECIL.md` memuat 1.34–1.35 serta sambungan 1.33 → 1.34 dan 1.35 → 1.36 dengan bukti; temuan menjadi tugas perbaikan di bawah K2.
- catatan: 1.31–1.33 sudah diperiksa di K1x (keputusan 254). Selesai: keputusan 301, PR #184.

### I5c-e · Berikutnya alur terlihat di desktop

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: di 1366×657, sesudah setiap klik Berikutnya di semua halaman alur, tombol Berikutnya tetap di dalam layar (sekarang 18 dari 199 klik terdorong keluar karena detail di atasnya memanjang: b10-2, e3, app-versi-lama, authorization, deployment-rollback, idor-token-app, dan lainnya; sama dengan main); pemeriksaan 1366×657 masuk `ukur-gerak.mjs`.
- catatan: Dari pelaksana PR #180 (keputusan 350). Jalur teknis. Selesai: keputusan 358, PR #202.

### I5c-f · CLS di CI tahan font yang terlambat

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: `ukur-cls.mjs` dengan `--font-telat 1500 --fallback Verdana` lolos (CLS ≤ 0,1) di semua halaman alur dan ukuran; e3-retry-idempotency 375 (sekarang 0,184 karena "Idempotency key" muat di fallback tetapi tidak di Satoshi) diperbaiki; mode font telat dijalankan di gerbang supaya hasil CI tidak bergantung waktu datang font.
- catatan: Dari peninjau PR #181 (keputusan 351). Jalur teknis. PR #206, keputusan 359; tiga putaran (pagar host hidup, abbr hanya prosa, KEPUTUSAN).

### K2a · Kontras langkah runsql yang dilewati

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: `.bb-step.is-skipped` (teks SQL dan label "→ tidak dijalankan") ≥ 4,5:1 di gelap dan terang, diukur di 1.22 M4 dengan computed style (opacity leluhur dikalikan, warna dicampur ke latar); teks tidak lagi diredupkan dengan `opacity`, coretan dan label tetap.
- catatan: Dari K2 (keputusan 301). Ukuran sekarang: terang SQL 3,96:1, label 2,87:1; gelap SQL 5,50:1, label 3,54:1. Jalur teknis (keputusan 264). Selesai: keputusan 354, PR #189 (juga menaikkan timeout job situs CI 15 ke 20 menit).

### K2b · Celah tools/contrast.py

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: K2a
- selesai bila: aturan yang hanya menulis `color`, atau hanya menulis latar, dipasangkan dengan aturan leluhur atau latar halaman; `opacity` di aturan induk ikut diturunkan ke warna turunannya; ada tes di `tools/test_contrast.py`; `.bb-step.is-skipped` (sebelum K2a) tertangkap oleh tes mutasi.
- catatan: Dari K2 (keputusan 301): 146 aturan color saja, 57 latar saja, 6 aturan opacity tidak pernah dipasangkan (termasuk is-skipped dan tautan sidebar `menyusul`). Jalur teknis. Selesai: keputusan 355, PR #192.

### G2 · Waktu gerbang CI di bawah batas

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: job situs CI selesai jauh di bawah `timeout-minutes` (target ≤ 12 menit dari ±15 menit sekarang, batas 20): mis. job dipecah jadi build + artefak `dist` lalu job matriks paralel untuk alat ukur Playwright, atau konteks ukuran×mode dijalankan paralel di `layar.mjs`, `ukur-cls.mjs`, `ukur-gerak.mjs` seperti `ukur-kontras.mjs` (keputusan 354); hasil alat sama persis sebelum/sesudah; durasi sebelum/sesudah dicatat.
- catatan: Dari PR #189: job situs 14m51–15m07 di main/PR (layar pertama + tangkapan sampai CLS ±10m20, CLS alur ±3m24); PR #189 terpotong di 15 menit sebelum batas dinaikkan. Jalur teknis. Selesai: keputusan 357, PR #198 (job situs 15m11 → workflow ±6m30; langkah dibungkus timeout supaya macet = failure, bukan cancelled).

### I5c-g · Detail alur dekat jalur di desktop sesudah menebak

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: I5c-e
- selesai bila: sesudah pembaca menebak, kotak tebakan dan varian di widget alur tidak lagi memisahkan detail langkah dari jalur dan tombol (mis. kotak tebakan diciutkan menjadi satu baris jawaban sesudah menebak); di 1366×657 jarak paket ke judul detail kembali ≤ 60 px dan penjelasan langkah terbaca utuh tanpa menggulir di ≥ 20 dari 23 langkah; tombol Berikutnya tetap di layar (cek `ukur-gerak.mjs`); versi statis dan `ukur-cls.mjs` tetap 0 px; tanpa animasi otomatis.
- catatan: Dari peninjau PR #202 (keputusan 358): jarak paket ke judul detail naik 30 → 224–286 px (1.40: 297–387 px); penjelasan utuh tanpa gulir turun 20/23 → 14/23. Jalur teknis. PR #219, keputusan 363; dua putaran (fokus keyboard di HP, WCAG 2.4.11).

### I5c-h · Mode font telat di gerbang CI

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: I5c-f
- selesai bila: lima kasus yang hanya gagal di CI Linux dengan `ukur-cls.mjs --font-telat 1500 --fallback Verdana` diperbaiki di komponen/CSS (b11-2-proxy-bff 667 0,196; d2-scaling 375 0,108 dan 667 0,168; authentication 1440 0,172; kontrak-openapi 1440 0,161), lalu mode font telat dipasang di kelompok CLS gerbang (`--paralel 8`) dan CI hijau dengan 0 di atas 0,1; percobaan dilakukan lewat commit di branch karena lebar glyph Linux tidak bisa ditiru di macOS.
- catatan: Dari PR #206 (keputusan 359). Jalur teknis. PR #213, keputusan 361; satu putaran (opsional Blink/Firefox/Safari di KEPUTUSAN).

### G2a · Batas waktu per halaman di alat ukur

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: G2
- selesai bila: `situs/tools/ukur-luapan.mjs` dan alat lain yang memakai `page.evaluate` tanpa batas (cari dengan grep) punya batas waktu per halaman (mis. `Promise.race` dengan timer, atau `waitForFunction` dengan `timeout`), gagal cepat dengan nama halaman dan ukuran; penyebab macet ±8 menit di run 38227021065 percobaan 1 dicari (mis. `document.fonts.ready` atau rAF di tab latar) dan dicatat; langkah pasang (bun install, Chromium Playwright) di `cek.yml` juga dibungkus `timeout` supaya macet di sana berakhir `failure`, bukan `cancelled`.
- catatan: Dari pelaksana dan peninjau PR #198 (keputusan 357). `gh pr checks` v2.93.0 tidak menghitung `cancelled` sebagai gagal. Jalur teknis. PR #211 (squash), keputusan 360; dua putaran (merge commit "# Conflicts", komentar dan format MACET).

### K2c · Kolom tabel KEPUTUSAN

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: baris 157, 247, 252, 253 di `plan/KEPUTUSAN.md` punya 5 kolom tanpa mengubah isi; gerbang menolak baris tabel yang jumlah pipe tanpa escape-nya berbeda dari header (`\|` di dalam teks tidak dihitung), dengan uji mutasi.
- catatan: Dari K2 (keputusan 301). Baris 157 rusak karena `||` di code span tanpa escape. Jalur teknis; kalau jalur konten sedang punya PR terbuka yang mengubah KEPUTUSAN, kerjakan sesudah PR itu di-merge. PR #215, keputusan 362; dua putaran (backslash genap sebelum pipe, kapan salah).

### K2d · Chip sumber Rantai tidak meluap di HP

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: chip sumber di `Rantai.astro` (kini `white-space: nowrap`) tidak pernah lebih lebar dari figure di 360×740 dan 375×667 (boleh membungkus atau dipendekkan secara visual tanpa memotong informasi); alat di gerbang memeriksa `scrollWidth` = lebar viewport di 360×740 untuk seluruh halaman, bukan hanya layar pertama.
- catatan: Dari peninjau PR #184: chip 349 px meluap 21 px di 360×740 dan membuat halaman bisa digulir ke samping; `layar.mjs` tidak menangkapnya karena chip di bawah layar pertama. Jalur teknis. Selesai: keputusan 356, PR #195 (alat ukur-luapan.mjs di gerbang).

### 1.36 · Tim dan infra Tahap 1

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: halaman `t1-tim-infra` dengan template tim-infra: satu orang, satu VPS, CI pertama, dengan file nyata dari repo lab; widget alur.
- catatan: Jalur DevOps. Selesai: keputusan 302, PR #186.

### 1.37 · M8: Uji coba lolos, PRD v2 datang

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: halaman `t1-m8` (masalah, ★) dengan widget React baru kalkulator (logika murni di `.ts`, data divalidasi Zod, tes Vitest); puncak 0,14 RPS dihitung terbuka dari `tahap[0].asumsi`; tabel "Angka di tahap ini" ditulis ulang di sini atau di 1.38.
- catatan: Selesai: keputusan 303, PR #191.

### I5d · Angka berubah dengan tween

- jenis: interaksi
- status: selesai
- percobaan: 0
- bergantung: I3
- selesai bila: jumlah-total dan saldo di mockup HP berubah dengan tween singkat dari token gerak; tangkapan sebelum/sesudah; butir I6.
- catatan: Selesai: keputusan 352, PR #182.

### 1.38 · Kerangka berpikir dan estimasi

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 1.37
- selesai bila: D1 ditulis ulang ke `tahap-1/` dengan widget kalkulator; angka dari `tahap[0].asumsi`.
- catatan: Selesai: keputusan 304, PR #194.

### 1.39 · Spesifikasi untuk AI dan review kode AI

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: F1 ditulis ulang ke `tahap-1/` dan menyerap F2; halaman F2 dan entrinya dihapus di PR yang sama (pola keputusan 150, sudah direncanakan registry v2); tes registri disesuaikan; widget banding dan pilah; lab f2-review.
- catatan: Selesai: keputusan 305, PR #197 (F2 diserap dan dihapus; lab f2-review identik di container postgres:17.11).

### 1.40 · ADR 12: Sengaja belum dilakukan

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: halaman `t1-adr-12` (adr, ★): tanpa cache, queue, service kedua, k8s, masing-masing dengan alasan dan "kapan keputusan ini salah"; menyebut dua yang pecah di Tahap 2 (dua request bersamaan; retry dari app).
- catatan: Selesai: keputusan 306, PR #201.

### K3 · Crosscheck kecil 1.36–1.40

- jenis: crosscheck
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: bagian K3 di `plan/CROSSCHECK-KECIL.md` memuat 1.36–1.40 dengan bukti; temuan menjadi tugas perbaikan di bawah K3.
- catatan: Periksa juga klaim kapasitas tanpa load test di 1.31 `deployment-rollback.mdx` (~baris 103, "Satu proses Go menjawab beban itu"), dari pelaksana 1.38. Selesai: keputusan 307, PR #204 (tanpa tugas baru; klaim kapasitas 1.31 dan chip ADR 1/ADR 12 diperbaiki).

### I5e · Race: garis waktu dua client

- jenis: interaksi
- status: selesai
- percobaan: 0
- bergantung: I3
- selesai bila: widget race menampilkan garis waktu dua client; langkah yang lewat tetap terlihat; langkah baru masuk dengan gerak; tangkapan sebelum/sesudah; butir I6.
- catatan: Selesai: keputusan 353, PR #187.

### 1.41 · Yang dibawa keluar dari Tahap 1

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: halaman `t1-rekap` dengan 10 kalimat dari naskah bagian 5, masing-masing terikat ke kejadiannya, plus Cek diri gabungan; widget kartu.
- catatan: Selesai: keputusan 308, PR #207.

### 1.42 · Jembatan: pratinjau PRD v2

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: halaman `t1-jembatan` (prd, ★) menampilkan pratinjau PRD v2 dari naskah bagian 6 dan widget tebak (`situs/src/widgets/tebak/`): dari 12 ADR, mana yang dibuka lagi; jawabannya ADR 6 dan ADR 5 dengan alasan naskah.
- catatan: PR #209, keputusan 309; satu putaran tinjauan.

### I5f · Diagram arsitektur di halaman tahap dan ADR

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: I4
- selesai bila: diagram kotak statis di halaman tahap dan halaman ADR (banding) diganti DiagramArsitektur; MEMORI mendapat bagian "Untuk halaman baru": cara memakai DiagramArsitektur dan token gerak; tangkapan sebelum/sesudah; butir I6.
- catatan: Widget lain hanya bila jelas membantu pemahaman; alasannya dicatat di keputusan.

### P3 · Halaman cara pakai untuk lima blok dan tiga pintu

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: `/cara-pakai/` menjelaskan lima blok dan tiga pintu (cerita, peran, masalah), bukan susunan lima bagian lama; audit bahasa 0 error.
- catatan: Dari MEMORI "Catatan untuk penulisan ulang Tahap 1". PR #212, keputusan 310; dua putaran (saran peran, Generalis, batas waktu Roediger).

### P4 · Ilustrasi latar perusahaan Grup Lestari

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: -
- selesai bila: adegan latar perusahaan baru di `Ilustrasi.astro` (kampus tiga gedung, kantin, warung tenant; token gelap/terang, tanpa teks di SVG) dipakai di 1.1 PRD v1; `contrast.py` lolos.
- catatan: Naskah meminta satu ilustrasi latar dan satu per masalah M3–M6.

### R1 · Visual layar pertama: 1.3, 1.5, 1.6

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: di tiap halaman Inti = kalimat → visual → dua paragraf rinci, plus satu diagram di Paham (`Rantai.astro` atau `PetaFitur.astro`, data JSON + Zod); visual tampil di layar pertama 4 ukuran; satu commit per halaman.
- catatan: Setengah jalan dari sesi redesain (MEMORI sesi 3, langkah 5): langkah 1–4 selesai di #120. PR #216, keputusan 311; dua putaran (simpul "ditolak" tanpa saldo kurang). Audit R2–R5 di laporan pelaksana: 1.24 sudah memenuhi R5.

### R2 · Visual layar pertama: 1.11, 1.12, 1.13

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: sama dengan R1 untuk 1.11, 1.12, 1.13.
- catatan: PR #220, keputusan 312; dua putaran (klaim MongoDB $lookup, Rantai 1.11 lima baris di 375).

### R3 · Visual layar pertama: 1.15, 1.16, 1.18

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: sama dengan R1 untuk 1.15, 1.16, 1.18.
- catatan: PR #223, keputusan 313; satu putaran; gabung main oleh pengatur (tmp/gabung_keputusan.sh).

### R4 · Visual layar pertama: 1.20, 1.21, 1.23

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: sama dengan R1 untuk 1.20, 1.21, 1.23.
- catatan: PR #225, keputusan 314; satu putaran; gabung KEPUTUSAN oleh pengatur.

### R5 · Visual layar pertama: 1.24, 1.25

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: 1.24 (ADR: diagram di blok Kebutuhan seperti 1.4) dan 1.25 (konsep: seperti R1) punya visual di layar pertama.
- catatan: Ditulis di main tanpa redesain. PR #228, keputusan 315; satu putaran; 1.24 tidak diubah.

### G2b · Batas waktu ukur-cls dan halaman yang menahan renderer

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: G2a, I5c-h
- selesai bila: `situs/tools/ukur-cls.mjs` (paralel) memakai `denganBatas` per halaman dari `situs/tools/lib/batas.mjs` dan mencetak `MACET cls <ukuran> <halaman>` dengan exit 1; penyebab thread utama renderer tertahan di `/tahap-1/m5-angka-di-url/` 360×740 (run 38257090943) dicari lewat pengulangan di branch `percobaan/**` dan dicatat, atau dibuktikan tidak terulang dalam ≥ 10 putaran.
- catatan: Dari pelaksana dan peninjau PR #211 (keputusan 360). Jalur teknis. PR #222, keputusan 364; dua putaran (klaim "bukan isi halaman" dibantah data; ulang di konteks baru).

### G2c · Pagar lebar font fallback di CI

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: I5c-h
- selesai bila: gerbang gagal bila lebar span uji "Satoshi Fallback" di CI berbeda > 0,5% dari Satoshi atau lebarnya bilangan bulat (tanda hinting), dengan uji mutasi; pesan menyebut versi runner dan font.
- catatan: Dari PR #213 (keputusan 361): label `ubuntu-latest` pindah versi [perlu verifikasi tanggal], set font atau hinting bisa berubah tanpa ketahuan. Jalur teknis.

### P5 · Kunci progres lama di Kartu ulang dan Peta cerita

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: -
- selesai bila: saringan Kartu ulang "Hanya dari halaman yang sudah kutandai selesai" dan `/cerita/peta/` membaca kunci progres yang sungguh ditulis halaman sekarang (bukan `bb1:selesai` lama), dengan tes; Peta cerita menulis enam tahap, bukan lima.
- catatan: Dari pelaksana P3 (keputusan 310). Jalur teknis-halaman. P7 (keputusan 365): `bb1:selesai` masih ditulis widget lama di 26 halaman, jadi bukan kunci mati; halaman Tahap 1 menulis `rtj-blok`. Bila kunci selesai diganti, naikkan `versi` di `situs/src/lib/progres.ts` dan tulis pemindah dari versi 1.

### P6 · Tautan relatif .md yang 404

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: -
- selesai bila: tautan relatif berakhiran `.md` di `situs/src/content/docs/**` (mis. `cerita/index.mdx` `(peta.md)`) diganti `[[ID]]` atau path yang benar; gerbang gagal bila tautan internal di `dist/` menuju halaman yang tidak ada, dengan uji mutasi.
- catatan: Dari pelaksana P3 (keputusan 310); link checker masih "Belum" di STATUS Fase 0. Jalur teknis-halaman.

### P7 · Ekspor dan impor progres pembaca

- jenis: interaksi
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: progres pembaca (blok selesai, halaman selesai, jalur, kartu) bisa diekspor ke satu file JSON dan diimpor kembali, divalidasi Zod, dengan tes Vitest; tombolnya ada di `/cara-pakai/` dan halaman itu menjelaskannya; tanpa akun, tanpa server.
- catatan: PROPOSAL "Keputusan final": progres di localStorage + ekspor/impor; belum dibangun (pelaksana dan peninjau P3). Jalur teknis. PR #221, keputusan 365; dua putaran (versi bersarang, live region, fokus).

### P8 · Klaim Beranda dan Kartu ulang sesuai kode

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: -
- selesai bila: `Beranda.astro` tidak lagi menulis "Kamu mendapat lima halaman" untuk semua peran (Dashboard web memberi 0) dan tidak menjanjikan halaman web di Tahap 3 bila registry tidak punya halaman ber-`peran` web; `alat/kartu-ulang.mdx` menyebut batas waktu temuan Roediger & Karpicke 2006 (unggul di tes 2 hari dan 1 minggu, kalah di tes 5 menit), seperti `tahap-1/rekap.mdx`.
- catatan: Dari peninjau P3 (keputusan 310). Jalur teknis-halaman.

### P9 · Contoh request 1.5 sesuai rekaman

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: R1
- selesai bila: tabel request di Paham 1.5 dan data widget `a2-alur.json` memakai body dan response dari `labs/api-t1/output/bayar.txt` B (`"ke"` berupa angka akun, id dari rekaman), bukan `"ke": "warung-ani"` dan `"id": 812`; `ke` berupa teks dijelaskan sebagai 400 sesuai `m2.txt` C bila disebut.
- catatan: Dari pelaksana dan peninjau R1 (keputusan 311). Jalur teknis-halaman.

### P10 · Sisa CSS lama dan panah Rantai ringkas di HP

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: R1
- selesai bila: aturan CSS `bb-map` (±16 aturan di `tema.css`) yang tidak dipakai halaman mana pun dihapus sesudah dicek dengan grep atas `dist/`; panah sesudah simpul Rantai ringkas yang membungkus tidak menggantung ke gutter kanan di 360 dan 375 px (contoh 1.6 "periksa saldo", ±8 px), diperiksa `ukur-luapan.mjs` atau alat ukur Rantai.
- catatan: Dari pelaksana dan peninjau R1 (keputusan 311). Jalur teknis.

### G2d · Akar macet renderer di halaman Tahap 1

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: G2b
- selesai bila: penyebab renderer diam (`pthread_cond_wait`, metrik CDP tak menjawab) yang hanya muncul di halaman `/tahap-1/` di 360×740 dan 375×667 ditemukan lewat varian percobaan (mis. tanpa skrip `Blok.astro`, localStorage diganti stub, tanpa island) ≥ 48 putaran per varian di branch `percobaan/**`, atau tumpukan bersimbol Chromium; bila penyebabnya kode situs, diperbaiki dan `ULANG` di ukur-luapan turun ke 0 dalam ≥ 48 putaran; bila di Chromium headless, bukti dan laporan bug dicatat.
- catatan: Dari PR #222 (keputusan 364): 27 MACET dalam 240 putaran, semuanya halaman Tahap 1. Bisa jadi risiko pembaca nyata (halaman membeku di HP). Jalur teknis.

### R6 · Aturan layar: visual wajib di layar pertama

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: R1, R2, R3, R4, R5, P10
- selesai bila: `situs/tools/layar.mjs` gagal bila halaman berblok tidak menampilkan visual di layar pertama 4 ukuran; alat ukur Rantai (P10) gagal bila satu baris Rantai ringkas di Inti membungkus lebih dari dua baris visual di 360 atau 375 px; semua halaman Tahap 1 yang ada lolos (halaman yang gagal diperbaiki di tugas ini, satu commit per halaman).
- catatan: Setengah jalan dari sesi redesain (MEMORI sesi 3, langkah 6).

### X1 · Crosscheck penuh Tahap 1

- jenis: crosscheck
- status: antre
- percobaan: 0
- bergantung: -
- selesai bila: isi `plan/PROMPT-CROSSCHECK.md` dijalankan; `plan/LAPORAN-TAHAP-1.md` ditulis; setiap perbaikan dari laporan menjadi tugas perbaikan baru sesudah X1 (satu tugas per perbaikan, bukan dikerjakan di iterasi X1).
- catatan: Dari pelaksana 1.41: jumlah akun M3 tidak seragam — 1.19 `m3-tanda-kutip.mdx` ~21 "100 karyawan, tiga warung, dan admin" (104) vs `labs/api-t1/output/m3.txt` ~36 tiga + "99 akun lain" (102) vs M5 103.

### X2 · Penutup Tahap 1

- jenis: crosscheck
- status: antre
- percobaan: 0
- bergantung: X1
- selesai bila: semua tugas dari X1 selesai atau diparkir; tangkapan seluruh Tahap 1 dilihat; laporan di STATUS dan baris "Tahap 1: crosscheck selesai"; tidak ada tugas Tahap 2 yang dimulai.
- catatan: Tahap 2 menunggu `plan/CERITA-TAHAP-2.md` dari pemilik.
