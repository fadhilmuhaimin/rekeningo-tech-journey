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

**Mode penyelesaian penuh (Tahap 2–6, keputusan 551–558)** menambah: setiap tugas dikerjakan pelaksana lalu ditinjau peninjau (subagent lain) sebelum merge; setiap instruksi subagent dibuka "Baca CLAUDE.md, PROTOKOL-OTOMATIS.md, dan skill yang relevan sebelum mulai; laporkan skill mana yang dipakai", dan laporan tanpa daftar skill belum selesai; setiap angka dan output berlabel Rekaman lab, Ilustrasi, Tidak dijalankan, Asumsi, atau [perlu verifikasi]; setiap klaim di halaman tertelusur ke ID `RN-nn` di `plan/RISET-TAHAP-N.md` atau berlabel [perlu verifikasi]; istilah baru di halaman mendapat halaman istilah (G-istilah) di PR yang sama; bagian "Di stack lain" memakai enam stack (Go, Node, Laravel, Django, Serverpod, Supabase) dengan versi yang dijalankan di lab, atau label "Tidak dijalankan" dengan versi dari dokumentasi; halaman tanpa diagram tidak memuat React Flow dan ukuran JS halaman dicatat (naik > 30% dari tahap sebelumnya ditulis alasannya); halaman keamanan Tahap 5–6 yang tidak bisa direkam berlabel Ilustrasi atau [perlu verifikasi]. Branch per tahap: `tahap-N/<slug>`.

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

### P3 · Halaman cara pakai untuk lima blok dan tiga pintu

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: `/cara-pakai/` menjelaskan lima blok dan tiga pintu (cerita, peran, masalah), bukan susunan lima bagian lama; audit bahasa 0 error.
- catatan: Dari MEMORI "Catatan untuk penulisan ulang Tahap 1". PR #212, keputusan 310; dua putaran (saran peran, Generalis, batas waktu Roediger).

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

### P5 · Kunci progres lama di Kartu ulang dan Peta cerita

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: saringan Kartu ulang "Hanya dari halaman yang sudah kutandai selesai" dan `/cerita/peta/` membaca kunci progres yang sungguh ditulis halaman sekarang (bukan `bb1:selesai` lama), dengan tes; Peta cerita menulis enam tahap, bukan lima.
- catatan: Dari pelaksana P3 (keputusan 310). Jalur teknis-halaman. P7 (keputusan 365): `bb1:selesai` masih ditulis widget lama di 26 halaman, jadi bukan kunci mati; halaman Tahap 1 menulis `rtj-blok`. Bila kunci selesai diganti, naikkan `versi` di `situs/src/lib/progres.ts` dan tulis pemindah dari versi 1. PR #237, keputusan 320; dua putaran (race Peta cerita lawan DataSelesai).

### P6 · Tautan relatif .md yang 404

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: tautan relatif berakhiran `.md` di `situs/src/content/docs/**` (mis. `cerita/index.mdx` `(peta.md)`) diganti `[[ID]]` atau path yang benar; gerbang gagal bila tautan internal di `dist/` menuju halaman yang tidak ada, dengan uji mutasi.
- catatan: Dari pelaksana P3 (keputusan 310); link checker masih "Belum" di STATUS Fase 0. Jalur teknis-halaman. PR #234, keputusan 318; satu putaran.

### P7 · Ekspor dan impor progres pembaca

- jenis: interaksi
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: progres pembaca (blok selesai, halaman selesai, jalur, kartu) bisa diekspor ke satu file JSON dan diimpor kembali, divalidasi Zod, dengan tes Vitest; tombolnya ada di `/cara-pakai/` dan halaman itu menjelaskannya; tanpa akun, tanpa server.
- catatan: PROPOSAL "Keputusan final": progres di localStorage + ekspor/impor; belum dibangun (pelaksana dan peninjau P3). Jalur teknis. PR #221, keputusan 365; dua putaran (versi bersarang, live region, fokus).

### P8 · Klaim Beranda dan Kartu ulang sesuai kode

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: `Beranda.astro` tidak lagi menulis "Kamu mendapat lima halaman" untuk semua peran (Dashboard web memberi 0) dan tidak menjanjikan halaman web di Tahap 3 bila registry tidak punya halaman ber-`peran` web; `alat/kartu-ulang.mdx` menyebut batas waktu temuan Roediger & Karpicke 2006 (unggul di tes 2 hari dan 1 minggu, kalah di tes 5 menit), seperti `tahap-1/rekap.mdx`.
- catatan: Dari peninjau P3 (keputusan 310). Jalur teknis-halaman. PR #229, keputusan 316; dua putaran (kalimat Cepeda).

### P9 · Contoh request 1.5 sesuai rekaman

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: R1
- selesai bila: tabel request di Paham 1.5 dan data widget `a2-alur.json` memakai body dan response dari `labs/api-t1/output/bayar.txt` B (`"ke"` berupa angka akun, id dari rekaman), bukan `"ke": "warung-ani"` dan `"id": 812`; `ke` berupa teks dijelaskan sebagai 400 sesuai `m2.txt` C bila disebut.
- catatan: Dari pelaksana dan peninjau R1 (keputusan 311). Jalur teknis-halaman. PR #233, keputusan 317; dua putaran (pemetaan $1–$3 per statement).

### P10 · Sisa CSS lama dan panah Rantai ringkas di HP

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: R1
- selesai bila: aturan CSS `bb-map` (±16 aturan di `tema.css`) yang tidak dipakai halaman mana pun dihapus sesudah dicek dengan grep atas `dist/`; panah sesudah simpul Rantai ringkas yang membungkus tidak menggantung ke gutter kanan di 360 dan 375 px (contoh 1.6 "periksa saldo", ±8 px), diperiksa `ukur-luapan.mjs` atau alat ukur Rantai.
- catatan: Dari pelaksana dan peninjau R1 (keputusan 311). Jalur teknis. PR #226, keputusan 366; satu putaran + gabung main (KELOMPOK_UKUR dengan alur).

### G2d · Akar macet renderer di halaman Tahap 1

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: G2b
- selesai bila: penyebab renderer diam (`pthread_cond_wait`, metrik CDP tak menjawab) yang hanya muncul di halaman `/tahap-1/` di 360×740 dan 375×667 ditemukan lewat varian percobaan (mis. tanpa skrip `Blok.astro`, localStorage diganti stub, tanpa island) ≥ 48 putaran per varian di branch `percobaan/**`, atau tumpukan bersimbol Chromium; bila penyebabnya kode situs, diperbaiki dan `ULANG` di ukur-luapan turun ke 0 dalam ≥ 48 putaran; bila di Chromium headless, bukti dan laporan bug dicatat.
- catatan: Dari PR #222 (keputusan 364): 27 MACET dalam 240 putaran, semuanya halaman Tahap 1. Bisa jadi risiko pembaca nyata (halaman membeku di HP). Jalur teknis. PR #231, keputusan 367; dua putaran (macet saat muat, konsentrasi di enam halaman).

### X1 · Crosscheck penuh Tahap 1

- jenis: crosscheck
- status: selesai
- percobaan: 0
- bergantung: -
- selesai bila: (lingkup beku, keputusan 369) temuan hanya masuk ANTREAN sebagai tugas perbaikan bila kategorinya rusak, aksesibilitas, kontras, atau gerbang yang benar-benar gagal; temuan lain langsung ditulis ke `plan/SETELAH-TAHAP-1.md`. Isi `plan/PROMPT-CROSSCHECK.md` dijalankan; `plan/LAPORAN-TAHAP-1.md` ditulis; setiap perbaikan dari laporan menjadi tugas perbaikan baru sesudah X1 (satu tugas per perbaikan, bukan dikerjakan di iterasi X1).
- catatan: Dari pelaksana 1.41: jumlah akun M3 tidak seragam — 1.19 `m3-tanda-kutip.mdx` ~21 "100 karyawan, tiga warung, dan admin" (104) vs `labs/api-t1/output/m3.txt` ~36 tiga + "99 akun lain" (102) vs M5 103. Dari peninjau P9 (keputusan 317): dari kode, `Service.Bayar` tidak memeriksa bahwa peminta adalah karyawan, jadi Warung Ani mungkin bisa membayar ke akunnya sendiri (418→418) dan baris itu terhitung di laporan warung [belum dibuktikan lab]; bila terbukti, kategorinya rusak. Crosscheck dipecah X1a/X1b/X1c (baca saja) lalu laporan PR #240, keputusan 370; tujuh perbaikan jadi XF1–XF6.

### XF1 · Jumlah akun di rekaman M3

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: X1
- selesai bila: `labs/api-t1/run.py` tidak lagi menulis "99 akun lain" dengan tangan; teks dan `harap` menghitung jumlah akun dari database (104 menurut seed `isiAwal`); `m3.txt` direkam ulang dari database bersih di container dan rekaman lain `api-t1` tidak berubah kecuali yang memang bergantung; halaman yang mengutip m3.txt cocok; keputusan baru mengoreksi angka 102 di keputusan 157.
- catatan: Kategori rusak (X1, keputusan 370). Butuh Docker. PR #245, keputusan 371; satu putaran.

### XF2 · Halaman Cerita sesuai naskah Tahap 1

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: X1
- selesai bila: `situs/src/content/docs/cerita/index.mdx` memakai cerita dan tokoh dari `plan/CERITA-TAHAP-1.md` (Gedung A, PRD v1, Raka, Sinta, Budi, Ani, Pak Hadi, Dimas), bukan cerita lama (MVP 1–100, pesan makan siang); `tokoh.svg` tidak berlatar putih di mode gelap atau diganti; audit bahasa 0 error.
- catatan: Kategori rusak (X1, keputusan 370). PR #246, keputusan 372; satu putaran.

### XF3 · Peran 1.28 di registry sesuai naskah

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: X1
- selesai bila: entri 1.28 di `situs/data/cerita.json` tidak memuat peran `security` (naskah `CERITA-TAHAP-1.md` ±242 tidak memasukkannya ke jalur Security), atau keputusan baru menjelaskan bedanya; beranda dan sidebar menghitung ulang dari registry.
- catatan: Kategori rusak (X1, keputusan 370). PR #242; satu putaran; tanpa keputusan baru.

### XF4 · Beranda: status Tahap 1 dan hasil pencarian masalah

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: X1
- selesai bila: `Beranda.astro` tidak lagi menulis "Sedang ditulis: 42 dari 42 halaman" untuk Tahap 1 yang selesai; daftar hasil pencarian masalah tidak lagi memakai `ul role="status"` yang membuat `li` kehilangan induk list (live region dipisah dari list).
- catatan: Kategori rusak + aksesibilitas (X1, keputusan 370). PR #243; satu putaran.

### XF5 · 1.16: reason phrase SHOULD, bukan wajib

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: X1
- selesai bila: `tahap-1/http.mdx` ±98 dan ±223 menulis bahwa client sebaiknya mengabaikan reason phrase (RFC 9112 §4 SHOULD), bukan wajib/harus.
- catatan: Kategori rusak (X1, keputusan 370). PR #244; satu putaran.

### XF6 · Label checkbox daftar periksa

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: X1
- selesai bila: checkbox disabled di daftar periksa "Saat me-review kode AI, cek ini" (25 halaman Tahap 1) punya nama yang dapat diakses atau tidak diekspos sebagai kontrol tanpa nama; dicek terhadap aturan axe/WCAG yang berlaku (sumber primer).
- catatan: Kategori aksesibilitas [perlu verifikasi] (X1, keputusan 370). PR #247, keputusan 374; satu putaran.

### X2 · Penutup Tahap 1

- jenis: crosscheck
- status: selesai
- percobaan: 0
- bergantung: X1
- selesai bila: (lingkup beku, keputusan 369) `plan/LAPORAN-TAHAP-1.md` memuat apa yang selesai, daftar "Setelah Tahap 1" (dari `plan/SETELAH-TAHAP-1.md`), dan 10 hal teratas yang perlu dilihat pemilik sendiri (halaman dan apa yang diperhatikan); temuan X2 mengikuti aturan yang sama dengan X1; pengatur lalu berhenti dengan kalimat "Tahap 1 selesai, menunggu tinjauan pemilik". Semua tugas dari X1 selesai atau diparkir; tangkapan seluruh Tahap 1 dilihat; laporan di STATUS dan baris "Tahap 1: crosscheck selesai"; tidak ada tugas Tahap 2 yang dimulai.
- catatan: Tahap 2 menunggu `plan/CERITA-TAHAP-2.md` dari pemilik. PR #249 (LAPORAN-TAHAP-1: apa yang selesai, Setelah Tahap 1, 10 hal pemilik, cek akhir 8 tangkapan); keputusan 369.

### ERD1 · ERD Tahap 1 dari skema lab, statis di 1.12

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: X2
- selesai bila: `tools/erd.py` membangun skema akhir Tahap 1 `labs/api-t1` di schema sementara PostgreSQL lab, membaca katalog (tabel, kolom, tipe, PK, FK, UNIQUE, CHECK, index) dan menulis `situs/data/erd/tahap-1.json` yang deterministik beserta hash sumbernya; `tools/erd.py --cek` (tanpa database) masuk gerbang dan gagal bila sumber skema berubah tanpa JSON ikut dibuat ulang; 1.12 menampilkan diagram statis bertoken (tabel, kolom penting, PK/FK, relasi) tanpa JavaScript, teks tidak di dalam SVG, terbaca di 375×667 dan 1366×657 gelap dan terang, kontras lolos, layar pertama 1.12 tidak bergeser; selisih dengan blok mermaid ERD Tahap 1 di `plan/CERITA-TAHAP-2.md` bagian 3b tercatat (skema lab yang benar).
- catatan: Permintaan pemilik 2026-10-13, pengecualian pembekuan lingkup (keputusan 375). PR #253: `tools/erd.py` (schema.sql + migration 000005 M4 di schema sementara yang di-ROLLBACK; 000006/000007 saling membatalkan, 000008 latihan lab), `--cek` di gerbang, Zod + Vitest, `Erd.astro` statis di blok Paham 1.12. Peninjau: baris "Sengaja belum dilakukan" 1.12 diselaraskan dengan ERD (index riwayat sudah ada). Polesan ke `plan/SETELAH-TAHAP-1.md`.

## Tahap 2

Dari `plan/CERITA-TAHAP-2.md`. Sejak 2026-10-23 (mode penyelesaian penuh, keputusan 551–558) setiap tahap mengikuti tujuh langkah berurutan: RISET (skill riset-tahap) → NASKAH (Tahap 3–6) → LAB → ERD → WIDGET → HALAMAN → EVALUASI (skill evaluasi-tahap) + perbaikan diri skill; crosscheck kecil per 5 halaman dihapus. Lab Tahap 2 sudah selesai di mode malam. Lingkup dibekukan: tugas baru hanya kategori rusak, aksesibilitas, kontras, atau gerbang gagal; polesan ke `plan/SETELAH-TAHAP-N.md`. Nomor keputusan Tahap 2: konten 600–679, teknis 680–719, pengatur 720–799 (keputusan 553). Dua jalur (konten, teknis) di worktree masing-masing; `status: dikerjakan` hanya untuk tugas jalur konten.

### T2-naskah · Simpan naskah Tahap 2, RINGKAS, dan antrean Tahap 2

- jenis: crosscheck
- status: selesai
- percobaan: 0
- bergantung: X2
- selesai bila: `plan/CERITA-TAHAP-2.md` identik byte demi byte dengan lampiran pemilik; `plan/RINGKAS.md` (≤ 60 baris) memuat peta halaman Tahap 2 satu baris per halaman dan Tahap 1 diringkas; bagian Tahap 2 di ANTREAN berurutan lab sebelum halaman, crosscheck kecil tiap 5 halaman, X1 dan X2 di akhir.
- catatan: Mode malam 2026-10-13. PR #252 (naskah), PR berikutnya (RINGKAS, ANTREAN).

### T2-registry · Registry 33 halaman Tahap 2, yang belum ditulis tampil segera

- jenis: interaksi
- status: selesai
- percobaan: 0
- bergantung: T2-naskah
- selesai bila: `situs/data/cerita.json` memuat 2.1–2.33 dengan judul, jenis, bagian, ★, peran (naskah "Jalur per peran"), prasyarat, dan lab sesuai peta halaman Tahap 2; halaman yang belum ditulis tampil "segera" di sidebar, peta, breadcrumb, dan Berikutnya, bukan tautan 404; halaman Tahap 2 lama tetap ada sampai digantikan, ditandai "versi lama", dan nomor lamanya tidak bertabrakan dengan 2.1–2.33; Tahap 1 tidak berubah; `sinkron_cerita.py`, `cek_tautan.py`, dan gerbang lolos.
- catatan: Jalur teknis. PR #258, keputusan 450: delapan halaman lama mengambil slot naskah dengan `lama: true` (B3.2→2.11, B3.3→2.12, E3→2.14, B2.4→2.16, B2.3→2.17, B1.3→2.19, E5→2.20, B4.2→2.22), T2 diganti 2.1; 25 halaman "segera" tanpa href (`rute-segera.ts`), Berikutnya melompatinya; Vitest mencocokkan registry dengan peta naskah. Tahap 1 berubah hanya di 17 rujukan nomor di 9 halaman. Peninjau: lolos tanpa perbaikan.

### I6-erd · Widget ERD bertumbuh

- jenis: interaksi
- status: selesai
- percobaan: 0
- bergantung: ERD1
- selesai bila: Komponen React di atas `@xyflow/react` dengan data `situs/data/erd/*.json` divalidasi Zod; satu tabel = satu node (nama, kolom; PK, FK, UNIQUE, CHECK ditandai teks, bukan hanya warna), relasi sebagai edge FK; pemilih tahap dan mode bandingkan dua tahap berdampingan; warna dari token (baru, berubah, tetap), tabel dihapus putus-putus dengan keterangan ke mana isinya pindah; klik atau keyboard pada tabel membuka kolom lengkap dan tautan halaman dari registry; versi statis untuk pembaca layar dan tanpa JavaScript; dimuat hanya di halaman yang memakainya; scroll halaman tidak tertangkap di 375×667; reduced motion tanpa gerak; axe 0; diuji di `/uji/erd/` dengan data Tahap 1 dan data uji Tahap 2 (data nyata sesudah ERD2).
- catatan: Jalur teknis. PR #262, keputusan 460–467: `ErdTumbuh.tsx` di atas @xyflow/react, `aturan_berubah` di selisih, `halaman.json` tabel → halaman registry, versi statis, `ukur-erd.mjs` di gerbang (kelompok "gerak erd"); hanya di `/uji/erd/` (174,0 KB gzip). Peninjau: edge `aria-hidden` (label bawaan React Flow berbahasa Inggris), node tabel dihapus tidak lagi memotong kalimat pindah, detail digulir ke layar (466, 467).

### lab-b3-ledger · Lab b3-ledger: jurnal, posting, tiga invarian

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: T2-naskah
- selesai bila: Lab baru `labs/b3-ledger` (schema sendiri di PostgreSQL bersama, `make -C labs/b3-ledger run`, gagal keras bila hasil berbeda dari harapan): tabel `akun`, `buku`, `jurnal`, `posting` mengikuti naskah bagian 3 dan 3b (selisih dengan blok mermaid dicatat; lab yang benar); tiga invarian dijaga database dan penolakannya direkam dengan SQLSTATE: jurnal tidak seimbang, UPDATE atau DELETE posting, saldo buku karyawan negatif sesudah jurnal; lima kejadian di tabel bagian 3 (top-up, bayar, transfer, pencairan, pembalik) direkam sebagai posting; saldo = jumlah posting dan cocok dengan `saldo_cache`; migrasi data v1 (kolom saldo jadi jurnal pembuka per akun, `koreksi` jadi jurnal pembalik) dengan saldo tiap akun sama sebelum dan sesudah; tutup buku per buku (saldo awal + mutasi = saldo akhir) dan seluruh jurnal seimbang; rekaman diulang dari database bersih dan identik (status, saldo, urutan; bukan waktu).
- catatan: Jalur lab. PR #254, keputusan 400–407: schema `b3_ledger` + `b3_ledger_v1`, invarian lewat trigger (23514 deferred, 23001), `saldo_cache` diperbarui kode app, invarian 3 tidak kebal dua COMMIT bersamaan (`batas.txt`; lock di b3-race), migrasi koreksi = jurnal asal lawan buku selisih + pembalik, `make cek`. Peninjau membetulkan alasan 402 dan rujukan 403. Polesan ke `plan/SETELAH-TAHAP-2.md`.

### lab-api-t2 · Lab api-t2: api-t1 naik ke ledger

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: lab-b3-ledger
- selesai bila: `labs/api-t2` (Go, schema sendiri) berangkat dari api-t1 dan naik ke ledger lewat expand → migrate → contract (naskah bagian 3 "Migrasi"): kolom saldo jadi `buku.saldo_cache` yang dicek ulang terhadap jumlah posting, tabel koreksi jadi jurnal pembalik, app versi lama tetap jalan di tiap langkah (direkam); endpoint transfer antar karyawan lewat nomor karyawan dengan batas Rp500.000 per hari dan buku dikunci di dalam transaction jurnal, bayar, top-up CSV 1.000 akun dalam satu transaction (satu baris salah = seluruh file ditolak), riwayat dengan kursor `(dibuat, id)`, tutup buku bulanan; tes Go untuk aturan uang; rekaman `output/*.txt` dari database bersih, diulang identik; kontrak OpenAPI v2 bila endpoint berubah.
- catatan: Jalur lab. PR #256, keputusan 408–418: expand (000009–000011, server v1 tetap jalan), migrate in-place satu transaction dengan LOCK tabel v1 dan hak akses app di transaction yang sama (417), contract membuang `akun.saldo` dan tabel v1 sesudah disalin ke `tahap2_arsip`; 8 tabel naskah 3b ada, idempotency/pencairan/login belum berperilaku (410); role `api_t2` hanya UPDATE `buku (saldo_cache, versi)`; buku dikunci `ORDER BY id FOR UPDATE`; top-up > 1 MiB 413 (418); `go test` 12 di PostgreSQL. Peninjau memperbaiki 417 dan 418.

### ERD2 · ERD Tahap 2 dari api-t2 dan selisihnya

- jenis: interaksi
- status: selesai
- percobaan: 0
- bergantung: ERD1, lab-api-t2
- selesai bila: `tools/erd.py` membaca skema akhir `labs/api-t2` dan menulis `situs/data/erd/tahap-2.json` beserta selisih terhadap Tahap 1 (tabel baru, kolom baru atau berubah, tabel dihapus dan ke mana isinya pindah, mengikuti tabel "Apa yang berubah dan kenapa" naskah 3b); `--cek` di gerbang mencakup Tahap 2; selisih dengan blok mermaid ERD Tahap 2 naskah tercatat (lab yang benar).
- catatan: Jalur teknis. PR #265, keputusan 470–473: `TAHAP[2]` = skema akhir Tahap 1 + api-t2 000009–000013 (pembanding b4-migration identik); `tahap-2.json` 8 tabel, 11 FK; selisih 6 tabel baru, 3 dihapus (topup dan transaksi diarsip, koreksi jadi jurnal selisih + pembalik), `akun` +4 kolom −`saldo`, 6 aturan berubah; `bersihkan()` membaca token SQL (`SET search_path FROM CURRENT` hanya sebagai atribut fungsi) dan menutup tiga celah lama; `/uji/erd/` memakai data lab. Job CI pembangun ulang ERD ditunda (SETELAH-TAHAP-2). Peninjau (474): tokenizer `bersihkan()` mengikuti lexer PostgreSQL (nama bertanda kutip, string E, `$` di tengah nama; komentar bersarang ditolak) karena empat bentuk SQL bisa menyembunyikan `SET search_path` di balik "komentar"; pagar `pastikan_di_schema()` sesudah tiap file memeriksa `search_path` dan lock di luar schema sementara; `test_erd.py` 50/50.

### lab-b3-race · Lab b3-race ke ledger: M9 dan empat cara mengunci

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: lab-b3-ledger
- selesai bila: `labs/b3-race` ditulis ulang ke ledger untuk M9: dua transfer bersamaan dari buku Budi (saldo Rp100.000; Rp70.000 dan Rp50.000) di dua koneksi; versi rentan (baca jumlah posting lalu tulis jurnal tanpa lock) merekam apa yang benar-benar terjadi, termasuk saldo −Rp20.000 bila pemeriksaan saldo bisa dilewati; empat cara direkam dan dibandingkan (`SELECT … FOR UPDATE` pada buku, UPDATE atomik bersyarat, optimistic lock `versi`, SERIALIZABLE + retry) dengan status, jumlah retry, dan saldo akhir; replay untuk widget race tetap jalan; rekaman dari database bersih, diulang identik.
- catatan: Jalur lab. PR #257, keputusan 430–434: `run_ledger.py` + `rekam.py`, rekaman `output/ledger/`, target `run-ledger`/`cek-ledger`; rentan dua urutan (−Rp20.000 lewat `SET CONSTRAINTS ALL IMMEDIATE` sebagai alat lab; COMMIT bergantian B 23514); empat cara berakhir Rp30.000 satu jurnal; enam replay `ledger-<cara>.json` belum dipasang. Peninjau: thread statement daemon supaya lab gagal keras, tidak macet (434).

### lab-b3-isolasi · Lab b3-isolasi ke ledger

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: lab-b3-ledger
- selesai bila: `labs/b3-isolasi` ditulis ulang ke ledger untuk 2.12: anomali yang benar-benar terjadi di PostgreSQL per isolation level (READ COMMITTED, REPEATABLE READ, SERIALIZABLE) pada skenario Rekeningo (mis. laporan tutup buku yang membaca saat jurnal masuk, dua transfer) dengan SQLSTATE 40001 dan retry; klaim tiap level dicek ke dokumentasi PostgreSQL; rekaman dari database bersih, diulang identik.
- catatan: Jalur lab. PR #259, keputusan 440–447: `ledger.py`, rekaman `output/ledger/`, `run-ledger`/`cek-ledger`; laporan tutup buku dua statement salah di READ COMMITTED dan seimbang di REPEATABLE READ/SERIALIZABLE; tanpa lock buku, REPEATABLE READ lebih lemah dari READ COMMITTED untuk invarian 3 (trigger saat COMMIT membaca snapshot transaction). Peninjau: deteksi tunggu lock tanpa ambang waktu (446), saldo dibaca dari posting dan kalimat RC dibetulkan (447).

### lab-t2-pencairan · Lab t2-pencairan: job Jumat dan rekonsiliasi

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: lab-b3-ledger
- selesai bila: Lab baru `labs/t2-pencairan` untuk 2.5, 2.25, 2.26 (M15): job pencairan Jumat membuat jurnal pencairan per warung dan satu file transfer bank (CSV); versi rentan: server restart di tengah lalu job jalan lagi, satu warung muncul dua kali di file tetapi sekali di ledger (selisih sesuai naskah atau angka rekaman berlabel); versi benar: batch per periode dengan kunci unik `periode`, status batch, baris pencairan per buku, aman dijalankan dua kali; rekonsiliasi otomatis ledger lawan file sebelum file dibuat (menolak bila beda); rekaman dari database bersih, diulang identik.
- catatan: Jalur lab. PR #260, keputusan 500–508: job Go `cmd/pencairan`; rentan menulis baris file sebelum COMMIT lalu SIGKILL sesudah baris 7, job ulang menulis Warung 508 lagi (file Rp2.465.000 lawan ledger Rp2.450.000); ADR 19 tiga langkah yang bisa dilanjutkan, rekonsiliasi sebelum file dibuat (exit 3 bila beda); tabel sama dengan api-t2 000011. Peninjau: sync folder sesudah rename (506), periode wajib minggu ISO dan path di dalam `-dir` (507), batas yang dicoba tanpa direkam (508); empat job bersamaan × 40 tetap 12 jurnal.

### lab-e3-idempotency · Lab e3-idempotency diselaraskan ke M10 dan ledger

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: lab-b3-ledger
- selesai bila: `labs/e3-idempotency` diselaraskan ke M10: Bayar Rp25.000 diulang sesudah response hilang tercatat dua kali tanpa key; dengan key yang dibuat app sekali per niat bayar, server menyimpan hasil per key 24 jam di `kunci_idempotensi` (hash permintaan, status, respons, jurnal): ulangan mendapat respons yang sama tanpa jurnal kedua, key sama dengan body beda ditolak, ulangan saat permintaan pertama masih diproses ditangani; status standar header dicek ke sumber primer (IETF); rekaman dari database bersih, diulang identik; nama mode dan file lama boleh tetap (keputusan 86).
- catatan: Jalur lab. PR #263, keputusan 510–518: server ledger sendiri di samping versi lama; klaim key `diproses` di-commit sendiri lalu satu transaction `FOR UPDATE NOWAIT` menulis jurnal + `selesai` (55P03 → 409); header dan status mengikuti draft IETF -07 yang sudah kedaluwarsa; titik henti server, bukan waktu; client Dart satu key per niat bayar, 4 percobaan dengan backoff + jitter; key dipendekkan di rekaman karena gitleaks. Peninjau: lolos tanpa perbaikan (30 request bersamaan → 1 jurnal).

### lab-b2-query · Lab b2-query ke ledger: N+1, index, kursor

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: lab-b3-ledger
- selesai bila: `labs/b2-query` diselaraskan ke M11 dan M12 di atas posting: riwayat N+1 (nama lawan diambil satu per satu) lawan satu query JOIN dengan jumlah query; `EXPLAIN (ANALYZE, BUFFERS)` sebelum dan sesudah index `posting (buku_id, dibuat, id)`; pagination offset menggandakan dan menghilangkan baris saat transaksi baru masuk, kursor `(dibuat, id)` tidak; waktu ditulis sebagai pembanding berlabel, bukan janji; rekaman dari database bersih, struktur hasil identik.
- catatan: Jalur lab. PR #266, keputusan 520–526: `run_ledger.py`, data satu tahun dari rumus naskah (760.448 posting, Budi 3.892), muat dengan `DISABLE TRIGGER USER` lalu ketiga invarian diperiksa; yang dibandingkan hanya node, index, rows, jumlah query, baris ganda; N+1 21 lawan 1 query; Index Scan Backward 20 baris sesudah `posting_riwayat`; OFFSET 204 ganda + 204 tidak tampil, kursor 0/0/0. Peninjau: lolos tanpa perbaikan.

### lab-b4-skema · Lab b4-skema diselaraskan ke M13

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: lab-b3-ledger
- selesai bila: `labs/b4-skema` diselaraskan ke M13: ALTER pada tabel besar saat ada transaction berjalan membuat pembayaran berikutnya menunggu (durasi direkam), `lock_timeout` membuat migrasi gagal cepat dan aman diulang, backfill bertahap per 1.000 baris, expand/migrate/contract tiga rilis dengan app versi lama tetap membaca riwayat; klaim lock dicek ke dokumentasi PostgreSQL; rekaman dari database bersih, diulang identik.
- catatan: Jalur lab. PR #264, keputusan 530–537: lab ledger memakai migration api-t2 000009–000013 apa adanya; versi salah (ALTER di belakang laporan terbuka: bayar antre ≥ 5 detik lalu 42703, app lama berhenti membaca riwayat), `lock_timeout` 3 detik 55P03 lalu ulang berhasil, migrate tanpa jeda dengan backfill per 1.000 akun, cek malam 0 beda sebelum contract; app lama dimodelkan di Dart. Peninjau: dua kalimat lock di rekaman dibetulkan (537).

### lab-c4-ratelimit · Lab c4-ratelimit diselaraskan ke M16

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: T2-naskah
- selesai bila: `labs/c4-ratelimit` diselaraskan ke M16, hanya terhadap container lokal dan dengan beberapa percobaan, bukan skrip massal: banyak akun fiktif dicoba dari satu IP dengan daftar password bocor fiktif; kunci per akun saja membuat akun Ani terkunci berulang; rate limit dua lapis di memori (per IP dan per akun) dengan kunci bertahap; wajib ganti password pertama; hash argon2id dengan parameter dari sumber primer (RFC 9106, OWASP); Redis tidak dipakai (ADR 20); rekaman dari database bersih, diulang identik.
- catatan: Jalur lab. PR #268, keputusan 540–550: lab baru `labs/c4-ratelimit/login`, argon2id t=3 p=4 m=64 MiB, kunci per akun berlipat 60 detik sampai 32 menit, dua lapis di memori (10 per IP, 5 per akun) sebelum DB dan argon2id, tanpa Redis, wajib ganti password pertama (≥ 15 karakter, NIST SP 800-63B-4). Peninjau menutup enam celah (550): `/ganti-password` tanpa rate limit, salt tetap, 423 membuka akun terdaftar (kini 401 generik), penanda proxy yang bisa dipalsukan, kenaikan `gagal_login` tidak atomik, temuan gosec.

### RISET-2 · Riset Tahap 2

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: lab-c4-ratelimit
- selesai bila: `plan/RISET-TAHAP-2.md` (≤ 120 baris) sesuai skill riset-tahap: setiap konsep 2.6–2.31 punya 1–3 sumber primer dengan versi dan tanggal dan ID `R2-nn`; yang berubah sejak PROPOSAL; teknik terbaru masuk/tidak; satu kasus industri nyata untuk ADR ledger (sumber primer); jebakan forum untuk kolom "Yang dikira"; angka beban Tahap 2 dihitung ulang dengan rumus PROPOSAL dan dibandingkan dengan registry; pengatur membuka tiga ID acak dan isinya memuat klaimnya.
- catatan: Langkah 1 alur tahap (keputusan 554). Lab Tahap 2 sudah ada; riset menjadi jejak klaim halaman 2.x. PR #272, keputusan 600: 35 baris R2-01–R2-35, kasus Square Books (2019) dengan Stripe Ledger sebagai pembanding; draft Idempotency-Key kini -08 aktif (bukan kedaluwarsa seperti 512); rumus ukuran naskah 3b lawan registry 1.38 dan 760.448 posting lab dicatat; 7 butir "Belum bisa dicek" untuk MEMORI pengatur.

### lab-api-t2a · Pengaman cek penerima dan login di api-t2

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: RISET-2, lab-api-t2, lab-c4-ratelimit
- selesai bila: `labs/api-t2`: `/kiriman` dan cek penerima dibatasi per akun dan per IP dengan pola `labs/c4-ratelimit/login` (keputusan 545, 550), sehingga nama 1.000 karyawan tidak bisa dikumpulkan lewat kiriman Rp1; akun terkunci dijawab 401 generik; 104 akun Gedung A `wajib_ganti_password` sesuai cerita M16; bila nomor karyawan yang mudah ditebak dipertahankan, risikonya tertulis di keputusan; rekaman dari database bersih, `go test` dan `make cek` lolos.
- catatan: Kategori keamanan, dari tinjauan #256 dan #268 (MEMORI "Perlu dicek pemilik"). Sebelum halaman 2.3 dan 2.27. Selesai 2026-10-24 di PR #294 (keputusan 645–649, `plan/masuk/lab-api-t2a.md`): rate limit dua lapis di memori (login IP 10 + 10/menit, email 5 + 5/menit; kiriman IP 30 + 6/menit, akun 15 + 1 per 10 menit), aturan pengirim diperiksa sebelum nomor penerima sehingga percobaan gagal tidak membedakan nomor terdaftar, nomor `K` + nomor akun dipertahankan dengan risiko tertulis (646), akun terkunci 401 generik, migration 000014 menandai 104 akun Gedung A, 403 tanpa token sampai `POST /ganti-password`; rekaman baru `labs/api-t2/output/pengaman.txt`, `transfer.txt` +1 baris, `testing.txt` +12 baris sesudah baris 39, rujukan halaman 2.4/2.6/2.8 tidak bergeser; enam uji mutasi tertangkap. Untuk pemilik (648): password sementara yang diketahui orang lain bisa dipakai mendahului pemiliknya; app 1.0/1.1 tanpa layar ganti password. Tinjauan: percobaan login dicatat sebelum bcrypt dengan lock baris akun, karena lima tebakan bersamaan sebelumnya semuanya dinilai (718); `pengaman.txt` G merekam `/ganti-password` berbagi kunci dan bucket dengan `/login` (718); bucket IP per prefix IPv6 /64 (719); `testing.txt` jadi +16 baris sesudah baris 39.

### A11y-diagram · Label pembaca layar DiagramArsitektur berbahasa Indonesia

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: I6-erd
- selesai bila: Edge DiagramArsitektur (beranda, `/uji/diagram/`, halaman yang memakainya) tidak lagi membacakan label bawaan React Flow berbahasa Inggris ("Edge from X to Y"), node tanpa `aria-roledescription` Inggris (pola keputusan 466); `ukur-diagram.mjs` gagal bila label Inggris kembali; axe 0; layar pertama dan CLS tidak berubah.
- catatan: Kategori aksesibilitas, dari tinjauan #262 (keputusan 466). Menyentuh beranda; boleh di bawah pembekuan Tahap 1 (keputusan 369). Selesai 2026-10-24 di PR #274 (keputusan 680): node tanpa aria-roledescription, garis dan lapisan svg garis aria-hidden; `ukur-diagram.mjs` memeriksa `/uji/diagram/`, beranda, dan halaman diagram di `dist/` (1.36), uji mutasi m1–m3 gagal; axe 0; CLS dan layar pertama tidak berubah; svg garis ErdTumbuh dan `role="application"` ke `plan/SETELAH-TAHAP-2.md`. Tinjauan (keputusan 681, 682, `plan/masuk/perbaikan-a11y-diagram.md`): klik dan tap kotak yang tertahan `pointer-events: none` React Flow sejak I4 dipulihkan dan diuji lewat koordinat; pembungkus `role="application"` diberi nama; temuan klik yang sama di ErdTumbuh ke SETELAH-TAHAP-2.

### T2-mulai · Pemilik membuka penulisan halaman Tahap 2

- jenis: crosscheck
- status: selesai
- percobaan: 0
- bergantung: X2, T2-registry
- selesai bila: Pemilik meninjau Tahap 1 dan menyatakan halaman Tahap 2 boleh ditulis (prompt di naskah bagian "Prompt untuk Claude Code").
- catatan: Ditandai selesai 2026-10-23 atas prompt pemilik "mode penyelesaian penuh": pemilik melewatkan tinjauan Tahap 1 dan meninjau di akhir (keputusan 552).

### G-ci-apt · Cache paket apt Chromium di CI ukur

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: A11y-diagram
- selesai bila: Job ukur CI tidak lagi mengunduh ulang paket apt dependency Chromium dari mirror setiap run: paket `.deb` di-cache dengan `actions/cache` resmi (kunci dari versi Playwright di lockfile) dan dipulihkan ke cache apt sebelum `playwright install --with-deps chromium`; daftar paket yang terpasang sama dengan sebelumnya (tidak ada font yang hilang, karena font fallback ikut menentukan ukuran CLS dan layar); batas langkah tetap ada; tiga run CI berturut-turut lolos tanpa rerun; waktu langkah sebelum/sesudah dicatat.
- catatan: Kategori gerbang gagal: langkah pasang Chromium exit 124 di lima run sejak 2026-10-24, juga sesudah batas 8 menit (keputusan 563; run 39994454442). Tanpa action pihak ketiga. Selesai 2026-10-24 di PR #278 (keputusan 683): `actions/cache@v6` menyimpan 17 `.deb` (25 MB) dengan kunci ImageOS, ImageVersion, dan versi playwright-core di `situs/bun.lock`, dipulihkan `sudo cp` ke `/var/cache/apt/archives`; perintah install dan batas 8 menit tetap. Langkah pasang sebelum: 20–41 s normal, 185 s dan 485 s saat mirror lambat (exit 124); run miss 40005551753: 48, 20, 26 s; run hit 40007115210: 21, 27, 19 s dengan "Need to get 0 B/25.9 MB". Daftar paket NEW dan upgraded sama dengan sebelum perubahan. Mirror normal selama ketiga run PR, jadi efek saat mirror lambat belum teramati; run ketiga di komentar PR. Peninjau (keputusan 684): apt 2.8.3 memakai `.deb` di archives yang ukurannya cocok tanpa memeriksa hash (run percobaan 40011291291), jadi tiap `.deb` dari cache kini dicocokkan dengan SHA256 di index apt sebelum disalin.

### G-axe · axe-core di alat ukur untuk evaluasi

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: G-ci-apt
- selesai bila: axe-core dipasang sebagai devDependency dengan ADR (versi dicek ke npm hari itu); `situs/tools/ukur-axe.mjs --path <p> ...` menjalankan axe dengan runOnly wcag2a, wcag2aa, wcag21aa, wcag22aa sesudah semua `<details>` dibuka dan halaman digulir sampai island hidup, di 375×667 dan 1366×657, gelap dan terang, dan keluar 1 bila ada pelanggaran; uji lolos palsu (halaman uji dengan pelanggaran sengaja membuatnya gagal); tidak masuk gerbang per PR kecuali murah, dipakai EVAL-N butir W4.
- catatan: Kategori aksesibilitas/gerbang. Usul dari tinjauan #274 dan skill evaluasi-tahap (W4). Selesai 2026-10-24 di PR #283 (keputusan 692–694): `axe-core` 4.14.0 devDependency dipin (ADR 692, dipilih atas `@axe-core/playwright`, file lokal, CDN, pa11y); `situs/tools/lib/axe.mjs` satu sumber untuk semua alat (`--axe` tanpa file di ukur-diagram/erd/gerak, `AXE=1` di audit-tampilan); `situs/tools/ukur-axe.mjs --path ... \| --semua [--awalan]` dengan uji diri `situs/tests/fixture/axe-salah.html` di awal setiap run (mutasi details, gulir, tunggu island, wcag22aa, tema, ukuran semuanya membuatnya gagal); masuk gerbang kelompok pertama dengan 10 halaman (40 run, lokal 6,4 s). Run atas beranda + 42 halaman Tahap 1 + 2.1 (176 run): 4 halaman `scrollable-region-focusable` di 375×667 (1.6, 1.11, 1.18, 1.28: tabel yang digulir ke samping tidak bisa difokus); seluruh `dist/` menambah `definition-list` di widget race lama `/b-fondasi/b3-2-race-condition-lock/`. Tugas baru diusulkan ke pengatur: `A11y-gulir-tabel`, `A11y-race-dl`. Tinjauan: node incomplete dihitung penuh (`resultTypes` violations + incomplete; color-contrast 1.466 node, bukan 176, keputusan 695) dan halaman yang tidak dijawab HTTP 200 membuat alat gagal (sebelumnya path salah lolos palsu, keputusan 696).

### A11y-gulir-tabel · Wadah tabel yang digulir bisa difokus

- jenis: perbaikan
- status: selesai
- percobaan: 1
- bergantung: G-axe
- selesai bila: axe `scrollable-region-focusable` (SC 2.1.1) 0 di 375×667 dan 1366×657 dua tema pada 1.6, 1.11, 1.18, 1.28 dan seluruh `situs/dist` (`situs/tools/ukur-axe.mjs`): wadah tabel atau kode yang digulir ke samping bisa dicapai Tab, punya nama aksesibel, dan fokusnya terlihat; layar pertama dan CLS tidak berubah; perbaikan di komponen atau CSS bersama, bukan per halaman; teks halaman tidak berubah.
- catatan: Kategori aksesibilitas dari G-axe (#283, keputusan 694). Selesai 2026-10-24 di PR #286 (keputusan 712–714): plugin `situs/src/plugins/rehype-tabel-gulir.mjs` membungkus setiap tabel GFM dengan `div.tabel-gulir` `role="region"`, `aria-label` dari judul kolom (urutan "Tabel k dari n" bila kembar), `tabindex="0"`; skrip inline `situs/src/lib/tabel-gulir.ts` (ResizeObserver) mencabut ketiganya dari wadah yang tidak meluap, tanpa JavaScript semua wadah tetap berfokus; fokus 2 px `--aksen` di dalam wadah. axe 4 halaman 16 run 0, `--semua` 93 halaman 372 run `scrollable-region-focusable` 0 (sisa `definition-list` race lama, A11y-race-dl); geometri 804 pasangan tabel identik dengan main; tab stop 375 54 dari 201 wadah, 1366 2; mutasi cabut tabindex dan `meluap` false membuat `ukur-axe` gagal; gerbang `axe` 10 → 14 halaman.

### ERD-1.12 · Widget ERD bertumbuh di 1.12

- jenis: interaksi
- status: selesai
- percobaan: 0
- bergantung: G-axe, ERD2
- selesai bila: Blok Paham 1.12 memakai `ErdTumbuh` dengan data `situs/data/erd/tahap-1.json` (versi statis tetap untuk pembaca layar dan tanpa JS); React Flow hanya dimuat di 1.12 dan `/uji/erd/`; ukuran JS 1.12 sebelum/sesudah dicatat di `plan/AUDIT-TAMPILAN.md`; layar pertama 1.12 tidak bergeser; axe 0; lapisan svg garis ErdTumbuh tidak terbaca sebagai `image` tanpa nama di pohon aksesibilitas Chromium (CDP `Accessibility.getFullAXTree`, pola keputusan 680; temuan #274: 11 dari 12 svg garis di `/uji/erd/`); klik dan tap kotak tabel ErdTumbuh sampai ke tombolnya (node React Flow pointer-events none, pola keputusan 681) dan diuji lewat koordinat; `ukur-erd.mjs` lolos dan gagal bila salah satunya kembali.
- catatan: Langkah 4 Tahap 2 (naskah "Dipasang di: 1.12 … satu PR kecil di Tahap 1"). Pengecualian pembekuan Tahap 1 atas permintaan naskah (keputusan 555). 2.9 memasang mode bandingkan di PR halamannya. PR #285, keputusan 697–700: `ErdHalaman.astro` di blok Paham 1.12 (`tahap={[1]}`), versi statis Erd.astro lewat `children` (tanpa JS dan pembaca layar), tanpa pemilih tahap, tautan ke 1.12 sendiri "(halaman ini)"; ErdTumbuh: lapisan svg garis aria-hidden (CDP image tanpa nama 11 → 0 di `/uji/erd/`), `pointer-events: auto` di tombol tabel (klik dan tap), application bernama; `ukur-erd.mjs` memeriksa pohon aksesibilitas, klik/tap, dan 1.12, uji mutasi GAGAL 12/8/12/5; layar pertama 1.12 identik di 4 ukuran, CLS 0, axe 0 (gerbang axe kini 11 halaman); JS 1.12 saat dimuat tetap 56,6 KB gzip, 186,6 KB sesudah semua blok dibuka (React Flow hanya sesudah Paham dibuka). Tiga polesan ke SETELAH-TAHAP-1.

### G-istilah · Halaman glosarium per istilah

- jenis: interaksi
- status: selesai
- percobaan: 0
- bergantung: A11y-diagram
- selesai bila: Satu rute per istilah (mis. `/istilah/<slug>/`) dengan delapan bagian tetap PROPOSAL "Glosarium jadi halaman mendalam per istilah" (satu kalimat, bahasa sehari-hari, di mana muncul di cerita, mekanisme 3–5 langkah, di tiap stack, jebakan umum, istilah terkait, sumber), data divalidasi Zod, bagian yang belum ditulis tampil "belum ditulis" tanpa tautan 404; tooltip istilah tetap memakai kalimat pertama; halaman Glosarium mendaftar semua istilah dan menautkan yang sudah punya halaman; satu contoh lengkap (*idempotency key*); istilah baru dari halaman 2.x yang sudah di-merge sebelum tugas ini selesai ikut mendapat halaman; istilah lama tetap jalan; gerbang lolos.
- catatan: Langkah 5 Tahap 2. Dipakai halaman 2.x dan sesudahnya: istilah baru di halaman mendapat halaman istilahnya di PR halaman itu (keputusan 556). PR #281, keputusan 685–691: rute `/istilah/<slug>/` dari `situs/data/halaman-istilah/<slug>.json` (skema Zod, 20 tes Vitest), kalimat pertama = baris Glosarium = tooltip; lima halaman (idempotency key, debit, kredit, jurnal, tutup buku), ERP satu baris; id baris Glosarium statis; jalur Alat › Glosarium › Istilah; tanpa island (17.400 B gzip); axe 0 di 24 kombinasi; sumber R2-36–R2-40. Cara menambah istilah: README.md "Menambah halaman istilah". Nomor 684 dipakai PR #278, jadi rentang mulai 685.

### W2-race · Replay ledger di widget race

- jenis: interaksi
- status: selesai
- percobaan: 0
- bergantung: A11y-diagram
- selesai bila: Widget race memutar enam replay `ledger-<cara>.json` dari `labs/b3-race/output/ledger/` (rentan dua urutan, FOR UPDATE, UPDATE atomik, optimistic lock, SERIALIZABLE + retry) dengan saldo dan status dari rekaman, tebak dulu sebelum hasil, pilih satu cara untuk diubah, chip sumber ke file rekaman; keyboard dan reduced motion; versi lama widget untuk halaman versi lama tidak berubah; ukuran JS dicatat; diuji di halaman `/uji/`; axe `definition-list` (SC 1.3.1) di widget race lama `/b-fondasi/b3-2-race-condition-lock/` 0 (temuan G-axe, keputusan 694).
- catatan: Langkah 5 Tahap 2, dipakai 2.10 dan 2.11 (keputusan 557). Menyerap A11y-race-dl. PR #291, keputusan 707–711: komponen React baru `situs/src/widgets/race-ledger/` lewat `situs/src/components/RaceLedger.astro` (`<RaceLedger id="..." cara={["tanpa-lock", ...]} awal="..." />`), race.js tidak dipakai; rekaman dibaca dari `labs/` saat build, Zod, dicocokkan dengan `banding.txt` (berbeda = build gagal); saldo, hasil client, menunggu, retry, SQLSTATE dari rekaman (JSON tanpa kolom retry: dihitung dari "(retry N)" dan dicocokkan); tebak saldo per cara, tombol cara `aria-pressed`, "Ubah satu hal" + kotak beda; `/uji/race/`; `ukur-race.mjs` 50 pemeriksaan (keyboard, ARIA, reduced motion, angka enam cara, axe keadaan akhir, CLS 0 px), uji mutasi GAGAL 9 dan 2; axe B3.2 `definition-list` 8 node → 0, tampilan lama identik; gerbang axe 17 halaman; JS `/uji/race/` 144,3 KB gzip, B3.2 +187 B, 1.11 +160 B. Lima polesan SETELAH-TAHAP-2. Peninjau (715, 716): fokus tidak lagi jatuh ke `<body>` saat panah kiri di "Ubah satu hal" (ukur-race 54 pemeriksaan, mutasi GAGAL 16); cara pasang 2.10/2.11 (Snippet `ledger-<cara>.txt` untuk tanpa JS) di komentar `RaceLedger.astro`; ukuran diukur ulang di atas f57acc6; dua polesan lagi.

### 2.1 · PRD v2: Rekeningo untuk seluruh kampus

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: T2-mulai, RISET-2
- selesai bila: halaman PRD 2.1 sesuai `plan/CERITA-TAHAP-2.md` bagian 1 dan peta halaman Tahap 2 (★); tanpa lab baru; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Menggantikan halaman cerita Tahap 2 lama. PR #277, keputusan 602–605: `tahap-2/prd-v2.mdx` dengan template PRD 1.1 (kepala + delapan blok, Rantai Ilustrasi, beban Asumsi), jawaban tebak 1.42 diperluas dari `koreksi.txt` D dan `sengaja-belum.txt` B, D–E; T2 lama keluar dari jalur inti dan (tinjauan, 605) pindah ke akhir Tahap 2 supaya Berikutnya 2.1 tidak menuju cerita lama, tebak 1.42 menautkan 2.1; rekaman di blok terakhir menyebut file dan bagiannya (604). Istilah baru tanpa halaman istilah (G-istilah belum selesai): debit, kredit, jurnal, tutup buku, ERP.

### 2.2 · Dari fitur ke pekerjaan teknis v2

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 2.1
- selesai bila: halaman Fitur→teknis 2.2 sesuai `plan/CERITA-TAHAP-2.md` bagian 2 dan peta halaman Tahap 2 (★); tanpa lab baru; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: PR #279, keputusan 606: `tahap-2/fitur-ke-teknis.mdx` dengan template 1.2 dan blok Mulai berisi Inti + Rantai ringkas `t2-fitur-dua-model` (Ilustrasi), pilah `t2-fitur-pilah.json` (dua penjelasan dari Rekaman lab api-t2 dan c4-ratelimit), tabel naskah bagian 2 dipecah dua (empat kolom kata per kata; fitur → konsep dengan tautan registry), nama index lab `posting (buku_id, dibuat, id)` di bawah tabel. Dibuat dari origin/main tanpa 2.1 (#277): cerita.json, indeks-topik, cerita/tahap-2 konflik, selesaikan dengan sinkron_cerita.py. Istilah baru tanpa halaman istilah (G-istilah belum selesai): posting, ledger, saldo awal, mutasi, job terjadwal, status batch, kursor, branch protection.

### 2.3 · Fitur: transfer antar karyawan

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 2.2, lab-api-t2, lab-api-t2a
- selesai bila: halaman Fitur→teknis 2.3 sesuai `plan/CERITA-TAHAP-2.md` bagian 2 dan peta halaman Tahap 2 (★); rekaman dari `labs/api-t2`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Keputusan 656–658 (`plan/masuk/tahap-2-transfer.md`): `tahap-2/fitur-transfer.mdx`, Inti dengan Rantai ringkas dari `transfer.txt` A dan C (4 garis di 360/375), PetaFitur empat jalur, Coba runsql `t2-transfer` (batas harian lewat view + trigger SQLite; ubah satu hal: bayar ke warung ikut dihitung, After ditolak Rp525.000), rekaman `transfer.txt` A–D, `pengaman.txt` C–D, `testing.txt` 40–43, Di stack lain kunci dua buku urut id (Go dijalankan, lima Tidak dijalankan), riset baru R2-106, R2-107, R2-109 (R2-105 dan R2-108 dibuang: sama dengan R2-85 dan R2-86 dari 2.11). Lab diulang dari database bersih: `make -C labs/api-t2 cek` identik. Rekaman E dan tes batas harian tidak dikutip supaya jawaban M9 dan M14 tetap di 2.10/2.11 dan 2.23 (657). Halaman istilah baru: Deadlock (Lock sudah dibuat 2.11); skema istilah menerima ID riset tiga digit (658).

### 2.4 · Fitur: tutup buku bulanan

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 2.2, lab-b3-ledger
- selesai bila: halaman Fitur→teknis 2.4 sesuai `plan/CERITA-TAHAP-2.md` bagian 2 dan peta halaman Tahap 2 (★); rekaman dari `labs/b3-ledger`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: PR #282, keputusan 615–618 (`plan/masuk/tahap-2-tutup-buku.md`): `tahap-2/fitur-tutup-buku.mdx`, Inti dengan Rantai ringkas dari `b3-ledger` `tutup-buku.txt` A–B, PetaFitur dan rekaman A–C `api-t2`, Coba runsql `t2-tutup-buku` (UPDATE langsung ke `saldo_cache` lawan jurnal; ubah satu hal: saldo akhir dari posting yang sama), Di stack lain enam tab (Go dijalankan), R2-45–R2-48. Lab tidak diulang: Docker tertahan. Celah jurnal terlambat COMMIT dan "< 1 hari" ditulis terbuka (618). Istilah baru tanpa halaman istilah (G-istilah belum di-merge): posting, buku, mutasi, saldo awal, saldo akhir, `saldo_cache`, `FILTER`.

### 2.5 · Fitur: pencairan warung terjadwal

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 2.4, lab-t2-pencairan
- selesai bila: halaman Fitur→teknis 2.5 sesuai `plan/CERITA-TAHAP-2.md` bagian 2 dan peta halaman Tahap 2 (tanpa ★); rekaman dari `labs/t2-pencairan`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Keputusan 620–622 (`plan/masuk/tahap-2-pencairan.md`): `tahap-2/fitur-pencairan.mdx`, Inti dengan Rantai ringkas dari `benar.txt` A dan C, PetaFitur, Coba runsql `t2-pencairan` (jalan kedua sesudah jalan pertama selesai; ubah satu hal: bayar Rp25.000 pukul 15.05), rekaman `benar.txt` A dan C, Di stack lain tentang jadwal (enam tab Tidak dijalankan, R2-50–R2-54); M15 dan ADR 19 hanya disiapkan sebagai pertanyaan. Lab tidak diulang: Docker tertahan. Halaman istilah baru: Job terjadwal.

### 2.6 · Kenapa saldo bukan kolom

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 2.5, lab-b3-ledger, G-istilah
- selesai bila: halaman Konsep 2.6 sesuai `plan/CERITA-TAHAP-2.md` bagian 3 dan peta halaman Tahap 2 (★); rekaman dari `labs/b3-ledger`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: PR #288, keputusan 623–625 (`plan/masuk/tahap-2-saldo-bukan-kolom.md`): `tahap-2/saldo-bukan-kolom.mdx` dengan template konsep 1.23; Inti Rantai ringkas `t2-saldo-bukan-kolom-inti` dari `b3-ledger` `migrasi.txt` B dan `kejadian.txt` D; Coba runsql `t2-saldo-bukan-kolom` (SQLite, Ilustrasi: pembayaran M4 tanpa transaction di kolom saldo lawan posting, ubah satu hal Rp40.000); Paham dari `migrasi.txt` B, api-t1 `koreksi.txt` D, `kejadian.txt` D dan 5b, api-t2 `migrasi.txt` E; rincian jurnal/invarian ke 2.7, keputusan ke 2.8; Di stack lain enam tab (Go dijalankan, `Repo.CekCache`); halaman istilah Ledger dan Posting; R2-55, R2-56. Dikerjakan sebelum 2.5 (PR lain) karena 2.6 tidak memakai isi 2.5. Lab tidak diulang: Docker tertahan.

### 2.7 · Ledger double-entry: jurnal, posting, invarian

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 2.6, lab-b3-ledger
- selesai bila: halaman Konsep 2.7 sesuai `plan/CERITA-TAHAP-2.md` bagian 3 dan peta halaman Tahap 2 (★); rekaman dari `labs/b3-ledger`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: PR #292, keputusan 626–628 (`plan/masuk/tahap-2-ledger-double-entry.md`): `tahap-2/ledger.mdx` dengan template konsep 1.23; Inti Rantai ringkas `t2-ledger-inti` (`kejadian.txt` B jurnal 7 lawan `invarian.txt` A jurnal 12); Coba widget alur `t2-ledger` (Rekaman lab, tebak "kapan ditolak", Ubah satu hal = jurnal 6 `kejadian.txt` B); Paham empat tabel, lima kejadian naskah, satu konvensi tanda (positif masuk, negatif keluar, tanpa pemetaan debit/kredit), invarian 1–3, pembalik, batas invarian 3 (Rantai `t2-ledger-batas` dari `batas.txt`, ke M9); Di stack lain enam tab penolakan saat COMMIT (Go kode api-t2, lima Tidak dijalankan); keputusan model ke 2.8; halaman istilah Double-entry, Buku ledger, Invarian; R2-60–R2-63. Pelaksana tidak mengulang lab (Docker tertahan); peninjau mengulangnya dari database bersih, lima rekaman identik, dan memperbaiki tiga klaim (keputusan 675, 676).

### 2.8 · ADR 6 direvisi: dari kolom saldo ke ledger

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 2.7, lab-b3-ledger
- selesai bila: halaman ADR 2.8 sesuai `plan/CERITA-TAHAP-2.md` bagian 3 dan peta halaman Tahap 2 (★); rekaman dari `labs/b3-ledger`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: PR #290, keputusan 629–631 (`plan/masuk/tahap-2-adr-ledger.md`) dan 723: `tahap-2/adr-ledger.mdx` sebagai revisi ADR 6 tanpa nomor baru (nomor 12 dipakai 1.40, 13–21 milik naskah; Nygard R2-65), registry `adr: [6]` dan judul baru, peta `JUDUL` di `registri.test.ts`, 1.24 satu tautan. Template ADR enam blok: Rantai Kebutuhan `t2-adr-ledger-kebutuhan` (api-t1 `koreksi.txt` C–D, api-t2 `pembalik.txt` B, b3-ledger `tutup-buku.txt`); empat opsi (kolom + koreksi, kolom + tabel audit trigger, ledger, event sourcing; B dan D Tidak dijalankan, R2-66, R2-67); tujuh aturan, Square Books dan Stripe Ledger, pre-mortem dari api-t2 `migrasi.txt` E–F dan b3-ledger `batas.txt`; Coba runsql `t2-adr-ledger` (SQLite, Ilustrasi: koreksi salah bayar Rp15.000, ubah satu hal salah ketik Rp150.000); halaman istilah Event sourcing (`stack: null`). Lab tidak diulang: Docker tertahan.

### 2.9 · Skema data: ERD Tahap 1 → Tahap 2 dan pertumbuhannya

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 2.8, ERD-1.12
- selesai bila: halaman Konsep 2.9 sesuai `plan/CERITA-TAHAP-2.md` bagian 3b dan peta halaman Tahap 2 (★); data ERD dari `labs/api-t1` dan `labs/api-t2` (ERD2) dan widget I6-erd; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Memasang widget ERD bertumbuh di 2.9 (bandingkan Tahap 1 dan 2) dan di 1.12 (ERD Tahap 1) sesuai naskah. PR #293, keputusan 632–634 (`plan/masuk/tahap-2-skema-data.md`): `tahap-2/skema-data.mdx` dengan template konsep; Inti Rantai ringkas `t2-skema-inti` (2 garis di 360 dan 375); Coba = Tebak `t2-skema-tebak` (tabel yang hilang dan ke mana isinya, dari `migrasi.txt` C–D) lalu `ErdHalaman` `tahap={[1, 2]}` mulai di Tahap 2, ubah satu hal = Bandingkan dengan Tahap 1 (berdampingan di 1366, bertumpuk di 375; ErdTumbuh tidak diubah, prop bandingkan awal ke SETELAH-TAHAP-2); Paham: tabel Apa yang berubah mengikuti skema lab (keputusan 633), expand/migrate/contract dari api-t2 `migrasi.txt` B–D, pertumbuhan Tahap 1–6 dengan rumus naskah berlabel Asumsi, tiga angka ukuran Tahap 2 (1.38 ±65,7 MB, rumus ±164 MB, lab ±99 MB); Di stack lain enam tab (tabel `posting` dengan foreign key; Go dari migration lab, lima Tidak dijalankan); halaman istilah ERD dan Saldo cache (Buku ledger di PR 2.7); riset R2-70 sampai R2-73; `ukur-erd.mjs` mencakup 2.9 (tanpa JS, CLS 0, Bandingkan 13 node 18 edge, bawaan React Flow); JS 49,8 KB gzip tanpa gulir, 205,7 KB sesudah ERD terlihat (AUDIT-TAMPILAN). Lab tidak diulang: Docker tertahan.

### 2.10 · M9: Saldo −Rp20.000

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 2.9, lab-b3-race, W2-race
- selesai bila: halaman Masalah 2.10 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); rekaman dari `labs/b3-race`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Dari lab b3-race (431, tinjauan #257): −Rp20.000 hanya bisa direkam lewat alat lab `SET CONSTRAINTS ALL IMMEDIATE`; bila dua request tumpang tindih, hasil yang lebih mungkin B 23514 (500); frekuensi di produksi belum diukur. PR #296, keputusan 635–637 (`plan/masuk/tahap-2-m9-saldo-minus.md`): `tahap-2/m9-saldo-minus.mdx` template Masalah lima blok, ilustrasi `m9` tanpa teks, Rantai `t2-m9-baca-sama`, Snippet langkah 3–6 dan dua ujung, `<RaceLedger id="m9" cara={["tanpa-lock", "tanpa-lock-bergantian"]} />` plus rekaman lengkap di `<details>`; −Rp20.000 berlabel "Rekaman lab, kondisi dibuat" (R2-75, R2-76, `batas.txt` 2b), COMMIT bergantian 23514 saldo Rp30.000, status HTTP tidak ditulis (tidak direkam), "Kondisi rekaman" ledger lawan migrasi minggu 4; ADR 13 tidak dibuka. Tanpa halaman istilah: race condition, lock, select-for-update, optimistic-lock dibuat #295 (2.11), koordinasi pengatur; Konsep yang lahir memakai `[[berikutnya]]`, bukan `[[B3.2]]`. Riset R2-75, R2-76, R2-78. Lab diulang dari schema bersih: `make -C labs/b3-race cek-ledger` exit 0, identik. JS 147,5 KB gzip (1.37 145,6 KB), axe 0.

### 2.11 · Race condition dan lock + ADR 13

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 2.10, lab-b3-race
- selesai bila: halaman Konsep+ADR 2.11 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); rekaman dari `labs/b3-race`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Isi lama B3.2 dipakai ulang. Dari b3-race (432, 433): enam replay `ledger-<cara>.json` siap; footer race.js, mode "Update" langkah 8, dan warna tab "bergantian" perlu dibetulkan (SETELAH-TAHAP-2). PR #295, keputusan 638–640 (`plan/masuk/tahap-2-race-lock.md`): halaman baru `tahap-2/race-lock.mdx` (`t2-race-lock`, template konsep, ADR 13 di Putuskan); B3.2 tetap ada sebagai versi lama dengan `lebur_ke` (bukan `diganti_oleh`: `lengkapi()` akan memberi nomor 2.34). Inti Rantai `t2-race-lock-inti`; Coba `<RaceLedger id="adr13" ... awal="for-update" />` + Snippet `banding.txt` dan lima `ledger-<cara>.txt`; Paham: lost update lawan ledger, empat cara, lock terlambat (b3-ledger `batas.txt` 3), deadlock dan `ORDER BY id` (dokumentasi, belum direkam); Di stack lain enam tab (Go api-t2, Node/Laravel/Django/Supabase b3-stack skema Tahap 1, Serverpod Tidak dijalankan). ADR 13 opsi A lima aturan; lingkup = jalur yang memutuskan dari saldo atau batas (top-up api-t2 tidak mengunci sebelum membaca, 640). Halaman istilah race condition, lock, SELECT FOR UPDATE, optimistic lock (`stack: null`); rujukan [[B3.2]] di 2.2, 2.6, 2.7, 2.8 ke 2.11, Tahap 1 dibiarkan. R2-85–R2-89. Lab tidak dijalankan (2.10 memakai b3-race). Catatan untuk 2.10: `race-condition.json` sudah dibuat di sini.

### 2.12 · Isolation level secara praktis

- jenis: konten
- status: selesai
- percobaan: 2
- bergantung: 2.11, lab-b3-isolasi
- selesai bila: halaman Konsep 2.12 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (tanpa ★); rekaman dari `labs/b3-isolasi`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: PR #298, keputusan 641–643 (`plan/masuk/tahap-2-isolation-level.md`): `tahap-2/isolation-level.mdx` (ID `t2-isolation-level`) dengan template konsep 1.23; Inti Rantai ringkas `t2-isolasi-inti` (laporan dua perintah Read Committed selisih Rp25.000 lawan Repeatable Read cocok; dua transfer M9 tanpa lock Read Committed 23514 lawan Repeatable Read −Rp20.000); Coba widget alur `t2-isolasi` (Rekaman lab `laporan.txt`, tebak, Ubah satu hal = Repeatable Read); Paham tabel empat level, `dirty-read.txt`, Rantai `t2-isolasi-transfer`, trigger `VOLATILE` membaca snapshot transaction, Serializable 40001 + retry, `transfer-cache.txt` ke ADR 13; Di stack lain enam tab (Go `DalamTx` dijalankan, lainnya Tidak dijalankan); Cek diri 4 kartu. Registry pola 2.11: B3.3 lama `lebur_ke`, file lama tetap; `[[B3.3]]` di 2.7 dan glosarium diarahkan ke halaman baru. Istilah Read Committed, Repeatable Read, Serializable (baru), Isolation level dan Snapshot (halaman istilah); R2-90–R2-94. Lab diulang dari database bersih (`make -C labs/b3-isolasi cek-ledger`): lima rekaman identik. Dua percobaan gerbang gagal di layar pertama (Inti 54 px lalu 40 px terpotong); kalimat Inti dan sub diagram dipendekkan. Sesudah #295 di-merge: `[[B3.2]]` di 2.12 jadi `[[t2-race-lock]]`, dua `[[B3.3]]` di 2.11 jadi halaman baru, B3.3 lama pindah ke akhir Tahap 2 sesudah B3.2 lama (pola keputusan 781). Peninjau (keputusan 788, 789): lab diulang dari database bersih (`make -C labs/b3-isolasi cek-ledger`), lima rekaman identik; sebelas angka dan SQLSTATE dicocokkan ke baris rekaman, klaim ke PostgreSQL 17 13.2.1–13.2.3, 13.5, 38.7, SET TRANSACTION, versi tab stack ke registry npm, Packagist, PyPI, pub.dev dan kode sumber Laravel 13.x dan pgx v5.11.0. Diperbaiki: kalimat Inti "level yang lebih tinggi bukan pengganti lock" salah untuk Serializable (`transfer.txt` bagian 3), kalimat 38.7 tanpa catatan level, label "Dijalankan" di tab Go, dua baris RISET, dan rujukan `[[B3.3]]` di 2.10 sesudah menggabung #296. Dua polesan ke SETELAH-TAHAP-2.

### 2.13 · M10: Nasi goreng dibayar dua kali

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 2.12, lab-e3-idempotency
- selesai bila: halaman Masalah 2.13 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); rekaman dari `labs/e3-idempotency`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Dari e3 (512, 518): Idempotency-Key adalah draft IETF -07 yang sudah kedaluwarsa, bukan standar; key di contoh dipendekkan karena gitleaks. PR #300, keputusan 650–652 (`plan/masuk/tahap-2-m10-dobel-bayar.md`): `tahap-2/m10-dibayar-dua-kali.mdx` dengan template Masalah; Rantai `t2-m10-dua-request`, potongan `ledger/tanpa-key.txt`, `api-t1/output/sengaja-belum.txt` D (tap kedua Budi), `mati-di-tengah.txt` 29–31, RFC 9110 §9.2.2 (R2-19); widget alur `t2-m10.json` dua HP, ubah satu hal `key-per-niat.txt`; ilustrasi `m10`. Status draft ditulis -08 aktif, belum RFC (R2-17, dicek 2026-10-24). ADR 14 tidak dibuka; tanpa halaman istilah baru. Lab diulang dari database bersih: `cek-ledger` LOLOS, rekaman identik.

### 2.14 · Retry dan idempotency key + ADR 14

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 2.13, lab-e3-idempotency
- selesai bila: halaman Konsep+ADR 2.14 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); rekaman dari `labs/e3-idempotency`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Isi lama E3 dipakai ulang. Dari e3 (514, tinjauan #263): sesudah jawaban final (termasuk 422 yang disimpan 24 jam) tap baru = niat baru; ADR 14 memutuskan nasib app 1.0/1.1 tanpa key. Dikerjakan di `tahap-2/idempotency`, keputusan 653–655 (`plan/masuk/tahap-2-idempotency.md`): halaman baru `tahap-2/retry-idempotency.mdx` (`t2-idempotency`, template konsep, ADR 14 di Putuskan), E3 jadi versi lama dengan `lebur_ke`; Rantai `t2-idempotency-inti`; Coba = widget alur `t2-idempotency.json` (key dibuat ulang per percobaan lawan key sekali per niat, dari `key-per-percobaan.txt` dan `key-per-niat.txt`); Paham: sisi app (Dart `NiatBayar`, retry), sisi server (tabel key, `diproses.txt`, `mati-di-tengah.txt`, `aturan.txt`), backoff dan jitter, retry mana yang aman, at-least-once, enam tab stack; ADR 14 empat opsi (A–D), enam aturan, nasib app 1.0 dan 1.1 = masa peralihan (key opsional, wajib sesudah satu minggu tanpa Bayar tanpa key, Asumsi), pre-mortem tiga penyebab. Istilah baru: retry, backoff, at-least-once; riset R2-100–R2-104; skema istilah menerima ID riset tiga digit. Peninjau (PR #301, keputusan 792, 793): tujuh klaim dikoreksi terhadap kode lab dan sumber (satu pengaturan server tidak ada di lab, 5xx = 500/502/503/504, 243 = 3⁵ percobaan, kalimat usang enam jawaban, pre-mortem 3, Stripe menyimpan 500, Equal Jitter); aturan 5 dipertahankan sebagai rancangan berlabel; enam polesan ke SETELAH-TAHAP-2.

### 2.15 · M11: Riwayat 4 detik

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 2.14, lab-b2-query
- selesai bila: halaman Masalah 2.15 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); rekaman dari `labs/b2-query`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Dari b2-query (521, 526): "4 detik" naskah tidak terulang di lab (halaman ±30 ms, seluruh riwayat Budi ±1,9 detik dengan 3.893 query); data satu tahun, bukan minggu 3. Branch `tahap-2/m11-riwayat`, keputusan 662–664 (`plan/masuk/tahap-2-m11-riwayat.md`): `tahap-2/m11-riwayat-lambat.mdx` template Masalah lima blok, ilustrasi `m11` tanpa teks, Rantai `t2-m11-satu-request`, widget baru `QueryRiwayat` (angka dari `n1.txt` D dan E saat build, tebak lalu ubah jumlah baris); "4 detik" dan timeout berlabel Ilustrasi, paragraf "Yang tidak terulang" memuat angka lab dan ±44 ribu posting minggu 3 (Asumsi, R2-116); ADR 15, index baru, dan query JOIN tidak dibuka (milik 2.16 dan 2.17); riset R2-115 sampai R2-119; `make -C labs/b2-query cek-ledger` diulang dari database bersih: 4 file sama.

### 2.16 · N+1 query

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: 2.15, lab-b2-query
- selesai bila: halaman Konsep 2.16 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); rekaman dari `labs/b2-query`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: PR #305, keputusan 665–667 (`plan/masuk/tahap-2-n-plus-1.md`): `tahap-2/n-plus-1.mdx` (ID `t2-n-plus-1`) dengan template konsep 1.23 dan 2.12; Inti Rantai ringkas `t2-n1-inti` (21 lawan 1 query untuk halaman pertama, 3.893 lawan 1 untuk seluruh riwayat Budi); Coba widget alur `t2-n1` (Rekaman lab `n1.txt` bagian A–D, tebak 3.893, Ubah satu hal = nama lawan di query yang sama); Paham: tabel jumlah query (D) dan waktu dua kolom (E: N+1 dan index adalah dua perbaikan yang berdiri sendiri), rumus tambahan jaringan jumlah query × RTT (RTT 1 ms Asumsi), cara menemukan, dua cara memperbaiki dengan tiga jebakan JOIN (baris tanpa pasangan, baris menggandakan, hasil harus sama; berlabel Tidak dijalankan), Di stack lain enam tab (Go dari `riwayat.go` api-t2 yang dijalankan, lainnya Tidak dijalankan dengan versi dan URL: Node pg 8.23.1, Laravel 13.38.0, Django 6.1.2 dengan `fetch_mode`, Serverpod 4.0.4, supabase-js 2.118.0); Cek diri 4 kartu. Registry pola 2.11/2.12: B2.4 lama `lebur_ke`, file lama tetap dan dipindah ke akhir Tahap 2; `[[B2.4]]` di 2.2 dan `b2-3-index.mdx` diarahkan ke halaman baru; B2.3 (2.17) bergantung pada `t2-n-plus-1`. Istilah N+1 query, ORM, Eager loading, Lazy loading (halaman istilah); pola ID riset istilah dilonggarkan ke tiga digit. Riset R2-120–R2-124. Lab tidak diulang di PR ini (2.15 mengulangnya). Untuk 2.17: tabel E kolom kanan dan `index.txt` bagian B sudah dipakai sebagai pembanding di 2.16; keputusan index dan ADR 15 belum disentuh. Polesan di file masuk.

### 2.17 · Index dan query plan + ADR 15

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 2.16, lab-b2-query
- selesai bila: halaman Konsep+ADR 2.17 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); rekaman dari `labs/b2-query`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Keputusan 668–669 (`plan/masuk/tahap-2-index-adr15.md`): `tahap-2/index-query-plan.mdx` (id `t2-index`) dengan template konsep + ADR; Rantai `t2-index-inti` dari `index.txt` B dan F; Coba = runsql SQLite `t2-index.json` (100.000 posting buatan, Ilustrasi, rencana SCAN/SEARCH/TEMP B-TREE, Ubah satu hal `buku_id` kolom terakhir); Paham: enam butir dengan Snippet `index.txt`/`data.txt`, Di stack lain enam tab (Go dari migration api-t2 000011; lima lain Tidak dijalankan); ADR 15 empat opsi (JOIN + index komposit dipilih, cache, nama lawan di posting, materialized view) dengan pre-mortem dan kapan salah; halaman istilah Index, Query plan, EXPLAIN; R2-125 sampai R2-129. Isi lama B2.3 jadi `lebur_ke` (file tetap). Lab tidak diulang di PR ini: 2.15 mengulangnya. Naskah menulis index `posting(akun, waktu)`; lab `posting (buku_id, dibuat, id)`, halaman memakai lab. Rujukan `[[B2.3]]` di 2.15 diganti `[[t2-index]]`; prasyarat 2.17 `B2.4` diganti `t2-n-plus-1` sesudah 2.16 masuk main.

### 2.18 · M12: Transaksi muncul dua kali

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 2.17, lab-b2-query
- selesai bila: halaman Masalah 2.18 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (tanpa ★); rekaman dari `labs/b2-query`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Branch `tahap-2/m12-dobel-tampil`, keputusan 672 dan 678 (`plan/masuk/tahap-2-m12-dobel-tampil.md`; 671 dan 673 dari brief sudah dipakai baris peninjau di KEPUTUSAN): `tahap-2/m12-muncul-dua-kali.mdx` template Masalah lima blok, ilustrasi `m12` tanpa teks, Rantai `t2-m12-dua-halaman`, widget baru `GeserRiwayat` (baris dan angka dari `pagination.txt` A, B, C saat build; tebak apa yang tampil sesudah halaman 2, lalu ubah satu hal: dua halaman atau seluruh riwayat: 1 ganda dan 1 tidak tampil, 204 dan 204); kursor hanya penunjuk ke 2.19, ADR 16 dan celah kursor tidak dibuka; "hilang" naskah ditulis "tidak ada di daftar"; riset R2-140 sampai R2-143. Lab tidak diulang: 2.15 mengulang `cek-ledger` identik.

### 2.19 · Pagination kursor + ADR 16

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 2.18, lab-b2-query
- selesai bila: halaman Konsep+ADR 2.19 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); rekaman dari `labs/b2-query`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Isi lama B1.3 dipakai ulang. Dari tinjauan #266: kursor `(dibuat, id)` bisa melewatkan transaksi yang mulai lebih dulu dan COMMIT sesudah halaman dibaca (`dibuat` = awal transaction); ADR 16 wajib membahasnya; rekaman belum memuatnya. Dikerjakan di `tahap-2/kursor-adr16`, keputusan 740–742 (`plan/masuk/tahap-2-kursor-adr16.md`; rentang 674–676 di brief dan 726 sudah terpakai): halaman baru `tahap-2/pagination-kursor.mdx` (`t2-kursor`, template konsep, ADR 16 di Putuskan), B1.3 jadi versi lama dengan `lebur_ke`; Rantai `t2-kursor-inti`; Coba = widget runsql SQLite berlabel Ilustrasi `t2-kursor.json` (id, lawan, jumlah dari `pagination.txt` A; ubah satu hal = transaksi yang COMMIT belakangan, bukan rekaman) dan tes `tests/widgets/runsql-t2-kursor.test.cjs`; Paham: OFFSET menghitung posisi, kursor mengingat baris, kursor di API (`labs/api-t2`), metode idempoten dan GET riwayat, enam tab stack; ADR 16 empat opsi (OFFSET, kursor `(dibuat, id)`, kursor dengan batas aman `xid8`, nomor urut per buku), lima aturan, pre-mortem tiga penyebab, celah COMMIT belakangan ditulis sebagai sudah direkam mekanismenya (`tutup-buku.txt` C) dan belum direkam di riwayat (usul tugas lab `lab-b2-kursor-commit` di SETELAH-TAHAP-2). Lab b2-query tidak diulang di PR ini: 2.15 mengulangnya identik. Istilah baru: Pagination, Pagination kursor (keyset), Metode idempoten; riset R2-145–R2-149.

### 2.20 · Ukuran payload dan kuota HP

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: 2.19
- selesai bila: halaman Konsep 2.20 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (tanpa ★); tanpa lab baru; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Lab `e5-payload` yang ada; bila rekamannya perlu diselaraskan ke cerita, sisipkan `2.20-lab`. Isi lama E5 dipakai ulang. Selesai 2026-10-25 di PR #322 (catatan keputusan dan polesan di badan PR, dilipat pengatur).

### 2.21 · M13: Migrasi di jam makan siang

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 2.20, lab-b4-skema
- selesai bila: halaman Masalah 2.21 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); rekaman dari `labs/b4-skema`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Dari b4-skema (536, 537): "40 detik" tidak direkam; lama tunggu = sisa transaction panjang + lama migrasi, bukan ALTER itu sendiri. Branch `tahap-2/m13-migrasi-siang`, keputusan 810–812 (`plan/masuk/tahap-2-m13-migrasi-siang.md`): `tahap-2/m13-migrasi-siang.mdx` template Masalah lima blok, ilustrasi `m13` tanpa teks, Rantai `t2-m13-antre`, widget baru `AntreanLock` (langkah dan keadaan tiap sesi dari `satu-langkah.txt` dan `lock-timeout.txt` saat build, dicocokkan dengan tabel pg_locks; tebak siapa yang ditunggu Bayar, lalu ubah satu hal ke batas tunggu 3 detik); "40 detik" berlabel Ilustrasi, laporan Keuangan yang terbuka ditulis sebagai kondisi rekaman, paragraf "Yang tidak terulang" (tabel 1.013 baris cukup, ukuran tabel bukan penyebab); ADR 17, tiga rilis, backfill, dan halaman istilah `lock_timeout` atau expand-migrate-contract tidak dibuka (milik 2.22); riset R2-155 sampai R2-158 (soft block diperiksa sampai `lock.c` REL_17_STABLE); `make -C labs/b4-skema cek-ledger` diulang dari database bersih: tiga file identik.

### 2.22 · Ubah skema tanpa downtime + ADR 17

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: 2.21, lab-b4-skema
- selesai bila: halaman Konsep+ADR 2.22 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); rekaman dari `labs/b4-skema`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Isi lama B4.2 dipakai ulang. Selesai 2026-10-25 di PR #319 (catatan keputusan dan polesan di badan PR, dilipat pengatur).

### 2.23 · M14: Batas harian yang hilang

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: 2.22, lab-api-t2
- selesai bila: halaman Masalah 2.23 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); rekaman dari `labs/api-t2`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Rekaman merge yang menghapus batas harian dan tes yang menangkapnya kemungkinan butuh `2.23-lab`. Selesai 2026-10-25 di PR #318 (catatan keputusan dan polesan di badan PR, dilipat pengatur).

### 2.24 · Tim dan infra Tahap 2: review, branch protection, tes integrasi + ADR 18

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: 2.23, lab-api-t2
- selesai bila: halaman Tim-infra 2.24 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); rekaman dari `labs/api-t2`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Selesai 2026-10-25 di PR #323 (catatan keputusan dan polesan di badan PR, dilipat pengatur).
### 2.25 · M15: Rp15.000 di file bank

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: 2.24, lab-t2-pencairan
- selesai bila: halaman Masalah 2.25 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); rekaman dari `labs/t2-pencairan`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Selesai 2026-10-25 di PR #327 (catatan keputusan dan polesan di badan PR, dilipat pengatur).
### 2.26 · Job terjadwal yang idempoten dan rekonsiliasi + ADR 19

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: 2.25, lab-t2-pencairan
- selesai bila: halaman Konsep+ADR 2.26 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); rekaman dari `labs/t2-pencairan`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Dari t2-pencairan (508): Keuangan mengambil file menurut status `dikirim`, bukan menurut ada atau tidaknya file. Selesai 2026-10-25 di PR #334 (catatan keputusan dan polesan di badan PR, dilipat pengatur).

### lab-c4a · Celah kunci dan IPv6 di c4-ratelimit

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: lab-api-t2a
- selesai bila: `labs/c4-ratelimit/login`: percobaan login dicatat sebelum hash argon2id dengan lock baris (`SELECT … FOR UPDATE`) dan kunci dipasang begitu ambang tercapai, sehingga N tebakan bersamaan pada penghitung ambang hanya satu yang dinilai (tes bersamaan); key IP IPv6 dipotong ke prefix /64 (RFC 6459 5.2) dengan tes; `/ganti-password` menolak password dari daftar bocor fiktif lokal (OWASP ASVS 5.0.0 6.2.4); rekaman dari database bersih diulang identik; uji mutasi tiap perbaikan; halaman Tahap 2 yang sudah merujuk rekaman c4 tidak bergeser.
- catatan: Kategori rusak/keamanan dari tinjauan #294 (keputusan 718–719): celah yang sama ada di lab yang dipakai 2.27 dan 2.28. Selesai 2026-10-24 di PR lab/c4a (keputusan 659–661, `plan/masuk/lab-c4a.md`): `catatPercobaan` mencatat percobaan sebelum argon2id dengan `SELECT ... FOR UPDATE` dan memasang kunci di ambang (tes bersamaan gagal 3 dari 3 pada kode lama: 5 tebakan dinilai, penghitung akhir 9; lima tebakan bersamaan kini hanya satu yang dinilai), `kunciAlamat` memotong IPv6 ke /64 (rekaman bagian H lewat `X-Lab-IP`, IPv6 terekam di c4), dan daftar password bocor di `/ganti-password` ternyata SUDAH ada di c4 (yang belum punya adalah api-t2): ditambah tes, bagian I rekaman, dan label bahwa daftar 27 entri jauh di bawah 3.000 dari ASVS 6.2.4. Rekaman: `output/login/ratelimit.txt` +46 baris (bagian G–J) sesudah bagian F, 71 baris lama identik, dua kali dari database bersih identik; tidak ada halaman yang merujuk rekaman c4 (grep `situs/`). Uji mutasi: lock baris, prefix /64 (juga /56), cek daftar, reset password benar, kunci di ambang — semuanya menggagalkan tes atau `run-login.py`. Berikutnya: 2.27 dan 2.28 boleh memakai bagian G dan H; api-t2 `/ganti-password` belum punya daftar bocor (SETELAH-TAHAP-2). Tinjauan #304 (keputusan 798, 799): bagian H memuat batas kedua key /64 (prefix lebih luas, RFC 6177) dan komentar `daftar-bocor.txt` tidak lagi menyebut semua entri buatan sendiri; dua kali `cek-login` dan `test-login` (-race) identik dan lolos.

### 2.27 · M16: Akun Ani terkunci

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: 2.26, lab-c4-ratelimit, lab-c4a
- selesai bila: halaman Masalah 2.27 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); rekaman dari `labs/c4-ratelimit`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Hanya container lokal; beberapa percobaan, bukan skrip massal. Dari c4-ratelimit (550): akun terkunci dijawab 401 generik, jadi Ani mengira lupa password; halaman menyebut jalur lupa password atau notifikasi lewat jalur lain (mohon konfirmasi pemilik). Selesai 2026-10-25 di PR #335 (catatan keputusan dan polesan di badan PR, dilipat pengatur).

### 2.28 · Keamanan 4: brute force, credential stuffing, hash password + ADR 20

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: 2.27, lab-c4-ratelimit
- selesai bila: halaman Keamanan+ADR 2.28 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); rekaman dari `labs/c4-ratelimit`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Selesai 2026-10-25 di PR #337 (catatan keputusan dan polesan di badan PR, dilipat pengatur).
### 2.29 · M17: Tutup buku kedua lolos, PRD v3 datang

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: 2.28
- selesai bila: halaman Masalah 2.29 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); tanpa lab baru; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Selesai 2026-10-25 di PR #339 (catatan keputusan dan polesan di badan PR, dilipat pengatur).
### 2.30 · Estimasi Tahap 2 → 3

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: 2.29
- selesai bila: halaman Konsep 2.30 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); tanpa lab baru; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Selesai 2026-10-25 di PR #341 (catatan keputusan dan polesan di badan PR, dilipat pengatur).
### 2.31 · ADR 21: Sengaja belum dilakukan

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: 2.30
- selesai bila: halaman ADR 2.31 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); tanpa lab baru; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Selesai 2026-10-25 di PR #346 (catatan keputusan dan polesan di badan PR, dilipat pengatur).
### 2.32 · Yang dibawa keluar dari Tahap 2

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: 2.31
- selesai bila: halaman Konsep 2.32 sesuai `plan/CERITA-TAHAP-2.md` bagian 5 dan peta halaman Tahap 2 (★); tanpa lab baru; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Selesai 2026-10-26 di PR #351 (catatan keputusan dan polesan di badan PR, dilipat pengatur).
### 2.33 · Jembatan: pratinjau PRD v3

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: 2.32
- selesai bila: halaman PRD 2.33 sesuai `plan/CERITA-TAHAP-2.md` bagian 6 dan peta halaman Tahap 2 (★); tanpa lab baru; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Selesai 2026-10-26 di PR #353 (catatan keputusan dan polesan di badan PR, dilipat pengatur).
### EVAL-2 · Evaluasi Tahap 2

- jenis: crosscheck
- status: selesai
- percobaan: 1
- bergantung: 2.33, G-axe
- selesai bila: `plan/EVALUASI-TAHAP-2.md` sesuai skill evaluasi-tahap oleh subagent yang tidak menulis halaman Tahap 2: kartu W1–W8 dengan satu baris bukti yang bisa diulang, tiga pertanyaan pembaca di tiga halaman acak (seed 2), uji baca oleh subagent segar (5 hal membingungkan). Ada TIDAK: paling banyak 3 tugas perbaikan disisipkan tepat sesudah tugas ini, lalu `EVAL-2-ulang` sekali; sisa TIDAK dan 5 hal membingungkan ke `plan/TINJAUAN-PEMILIK.md`.
- catatan: W1–W4 wajib YA. Sesudah evaluasi ulang tahap dinyatakan selesai apa pun hasilnya. Selesai 2026-10-26 di PR #356 (keputusan 750–753): W1–W4 dan W6–W8 YA, W5 TIDAK (2.32 dan 2.2 tanpa "ubah satu hal"; jawaban tebakan sudah di Inti pada 2.12, 2.14, 2.16). Satu perbaikan teks 2.28 (750), alat bukti `tools/eval_tahap.py` dan `situs/tools/eval-keyboard.mjs` (753), satu tugas perbaikan (`EVAL2-F1`) dan `EVAL-2-ulang` (752); sisanya di `plan/TINJAUAN-PEMILIK.md` bagian Tahap 2.

### EVAL2-F1 · Berikutnya sesudah jembatan Tahap 2 tidak masuk halaman lama

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: EVAL-2
- selesai bila: `urutanBaca` di `situs/tools/registri.mjs` (dipakai `Lanjut.astro`, `Blok.astro`, `Beranda.astro`, `remark-rujukan.mjs`) melewati halaman yang punya `lebur_ke` atau `diganti_oleh` yang menunjuk halaman `ada: true`; halaman itu tidak dihapus dan tetap ada di sidebar, di URL-nya, dan sebagai rujukan `[[ID]]`; halaman lama yang penggantinya masih "segera" tetap ada di urutan baca. Sesudah perbaikan `python3 tools/eval_tahap.py rantai 2` tetap mencetak 33 langkah dari 2.1 ke 2.33 tanpa 404, dan baris "sesudah halaman terakhir" menunjuk halaman tahap berikutnya yang bukan halaman lama (sekarang `T3`, "Tahap 3 · Ceritanya", selama 3.1 masih "segera"; 3.1 bila sudah ada); Sebelumnya dari halaman itu menunjuk 2.33; Berikutnya dari 1.42 tetap 2.1. Satu tes (Vitest di `situs/src/lib/` atau `node --test` di `situs/tests/`) membuktikan urutan: halaman lama yang penggantinya `ada` tidak muncul, halaman lama tanpa pengganti `ada` tetap muncul, dan satu mutasi (syarat dihapus) membuatnya gagal. `jalur_inti` dan menit baca Tahap 2 dihitung ulang bila berubah (`sinkron_cerita.py`); gerbang lolos.
- catatan: Dari EVAL-2 (keputusan 752), kategori rusak. Bukti: `python3 tools/eval_tahap.py rantai 2` mencetak Berikutnya dari 2.33 menuju `/cerita/tahap-2/` (`T2`, `diganti_oleh` t2-prd), disusul B3.2, B3.3, B2.4, B2.3, E3, B4.2, B1.3, E5 (semuanya `lama` dengan `lebur_ke` ke halaman 2.x yang sudah ada), baru Tahap 3 (keputusan 605, 638, 642, 653, 665, 781 memindahkan halaman lama ke akhir Tahap 2). Tugas ini hanya mengubah urutan baca. Menghapus atau menulis ulang halaman lama menunggu keputusan pemilik (`plan/TINJAUAN-PEMILIK.md` Tahap 2 butir 2). File yang disentuh: `situs/tools/registri.mjs` dan tesnya. Selesai 2026-10-26 di PR #361 (keputusan 1150–1153, 1164): urutanBaca melewati halaman lama; rantai Tahap 1 dan 2 dijalankan di gerbang.

### EVAL-2-ulang · Evaluasi ulang Tahap 2

- jenis: crosscheck
- status: selesai
- percobaan: 1
- bergantung: EVAL2-F1
- selesai bila: satu subagent yang bukan penulis halaman Tahap 2 dan bukan pelaksana `EVAL2-F1` menambah bagian "Putaran 2" ke `plan/EVALUASI-TAHAP-2.md` dengan seed 2 yang sama dan bagian "Cara mengulang" file itu: gerbang penuh sekali; W8 (rantai Berikutnya 2.1 sampai 2.33 dan langkah sesudah jembatan yang tidak lagi masuk halaman bertanda lama); W4 (`ukur-axe --semua --awalan /tahap-2/` dan `eval-keyboard.mjs` di 2.4 dan 2.11); W5 dinilai ulang dengan definisi skill yang berlaku saat itu (DIRI-2 mungkin sudah mengubahnya; tidak ada halaman yang diubah di putaran ini); W1 sampai W3, W6, dan W7 diulang dengan perintah yang sama. Tidak ada putaran perbaikan kedua. Sesudahnya tahap dinyatakan selesai apa pun hasilnya, dan butir yang tetap TIDAK dipastikan ada di `plan/TINJAUAN-PEMILIK.md`.
- catatan: Skill evaluasi-tahap: evaluasi ulang SEKALI. Boleh lebih ringan dari EVAL-2. `DIRI-2` dan `KONSISTENSI-3` menunggu tugas ini (keputusan 752); perbaikan `EVAL2-F1` tidak mengubah bukti yang mereka pakai, jadi bila pengatur ingin Tahap 3 jalan lebih awal, `bergantung` keduanya boleh dikembalikan ke `EVAL-2`. Selesai 2026-10-26 di PR #363 (keputusan 1166 sampai 1168): W1 sampai W4 dan W6 sampai W8 YA, W5 tetap TIDAK (2.32 tanpa "ubah satu hal"; definisi sesudah DIRI-2 tidak mengecualikan rekap dan pilah); Berikutnya dari 2.33 kini menuju `/cerita/tahap-3/`; lab tidak dijalankan ulang (tidak berubah sejak putaran 1); temuan baru berupa polesan (2.30, 2.28, label Dipersempit) ke SETELAH-TAHAP-2; butir TIDAK tetap di `plan/TINJAUAN-PEMILIK.md` Tahap 2 butir 3.

### DIRI-2 · Perbaikan diri sesudah Tahap 2

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: EVAL-2
- selesai bila: Satu subagent membaca `plan/EVALUASI-TAHAP-2.md` dan pelajaran MEMORI Tahap 2, lalu boleh mengubah skill gaya-bahasa, visualisasi, analisis-kritis, riset-tahap, evaluasi-tahap hanya dengan bukti dari Tahap 2, paling banyak 10 baris per skill, masing-masing dicatat sebagai keputusan dengan teks sebelum/sesudah; CLAUDE.md, PROPOSAL, dan CERITA-TAHAP-1/2 tidak disentuh (usulan ke `plan/USULAN-PERBAIKAN.md`); STATUS menulis "Tahap 2 selesai".
- catatan: Langkah penutup alur tahap. Pengatur 2026-10-26 (keputusan 728 butir 3, boleh menurut catatan EVAL-2-ulang): bergantung EVAL-2 supaya Tahap 3 tidak tertunda; EVAL-2-ulang berjalan paralel. Selesai 2026-10-26 di PR #359 (keputusan 754–759, 1160–1161): lima skill diperbaiki dengan bukti Tahap 2, usulan di luar wewenang di plan/USULAN-PERBAIKAN.md.

### LAB-PARALEL · Lab bisa jalan di beberapa lajur sekaligus

- jenis: perbaikan
- status: selesai
- percobaan: 1
- bergantung: -
- selesai bila: port database lab dan port server lab dibaca dari variabel (`LAB_DB_PORT` bawaan 54333, `LAB_PORT_OFFSET` bawaan 0) di semua lab (`labs/*/run*.py`, `Makefile`, skrip rekam, tes Go yang menyebut port), `labs/b3-race/docker-compose.yml` memakai `${LAB_DB_PORT:-54333}` dan Makefile root `lab-up`/`lab-down` memakai `COMPOSE_PROJECT_NAME`; tanpa variabel semua lab berperilaku sama seperti sebelumnya (rekaman identik); dua lajur dengan `COMPOSE_PROJECT_NAME`, `LAB_DB_PORT`, dan `LAB_PORT_OFFSET` berbeda menjalankan satu lab masing-masing bersamaan dan rekaman keduanya sama dengan rekaman di repo; satu alat pemeriksa di gerbang menolak `54333` yang tertulis tetap di luar nilai bawaan; `labs/README.md` atau bagian lab di `plan/BRIEF-SUBAGEN.md` menulis cara memakainya; satu PR kecil.
- catatan: Keputusan 728 butir 2. Pelaksana mengusulkan nilai per lajur (`rjt-konten` offset 0 bawaan, `rjt-konten2` 100, dst.) di badan PR; pengatur memasukkannya ke brief. Selesai 2026-10-25 di PR #326. Nilai per lajur dan pemeriksa port ada di `labs/README.md` dan `tools/cek_port_lab.py` (keputusan 860–864).

### CI-CEPAT · CI lebih cepat tanpa mengurangi cakupan

- jenis: perbaikan
- status: selesai
- percobaan: 1
- bergantung: -
- selesai bila: `.github/workflows/cek.yml` menyimpan cache bun dan browser Playwright (kunci dari `bun.lock` dan versi Playwright, dengan verifikasi yang ada untuk .deb tetap); job ukur paralel per ukuran layar atau kelompok sehingga waktu dinding turun; di PR alat ukur halaman hanya memeriksa halaman yang berubah (dibandingkan dengan dist main) kecuali bila tema, CSS, komponen, plugin, atau alat ukur berubah, maka semua halaman; di main dan di workflow terjadwal malam (`schedule`) 100% halaman tetap diperiksa; menit CI sebelum dan sesudah (rata-rata tiga run PR terakhir dan tiga run sesudahnya, dari `gh run list`) dicatat di badan PR; satu alat uji membuktikan PR dengan perubahan CSS memilih semua halaman dan PR dengan satu halaman memilih halaman itu saja.
- catatan: Keputusan 728 butir 4. Bila main lebih sering merah sesudahnya, pengatur mengembalikan pemeriksaan per halaman (butir 4 dan 5). Selesai 2026-10-25 di PR #328.

## Tahap 3

Alur tujuh langkah (keputusan 554). Tugas lab dan halaman Tahap 3 disisipkan oleh `T3-siap` dari peta halaman naskah: lab sebelum `ERD3`, halaman sesudah widget. Nomor keputusan Tahap 3: konten 900–949, teknis 950–979, pengatur 980–999, halaman 3.n blok 1000+4×(n−1) sampai +3 (sampai 1127), cadangan 1150–1169 (keputusan 900: rentang 800–899 sudah dipakai Tahap 2; Tahap 4 mulai 1200). Lab, `ERD3`, dan `W3-*` tidak menunggu `EVAL-2`; setiap halaman Tahap 3 menunggu `KONSISTENSI-3` dan `DIRI-2` (keputusan 728).

### RISET-3 · Riset Tahap 3

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: RISET-2
- selesai bila: `plan/RISET-TAHAP-3.md` (≤ 120 baris) sesuai skill riset-tahap untuk Tahap 3 (seluruh cabang di enam kota, PROPOSAL "Enam tahap dalam satu tabel"): konsep dengan 1–3 sumber primer bertanggal dan ID `R3-nn`, yang berubah sejak PROPOSAL, teknik terbaru masuk/tidak, satu kasus industri nyata untuk ADR dari sumber primer, jebakan forum, angka beban dan ukuran data dihitung ulang dengan rumus PROPOSAL sebagai Asumsi; pengatur membuka tiga ID acak.
- catatan: Kerja di depan (keputusan 728): jalan sebelum EVAL-2 dan DIRI-2 di lajur riset; bila DIRI-2 mengubah skill riset-tahap, RISET-3 tidak diulang, `KONSISTENSI-3` yang memeriksa. Selesai 2026-10-25 di PR #325 (catatan keputusan dan polesan di badan PR, dilipat pengatur).

### NASKAH-3 · Naskah Tahap 3 (draft otomatis)

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: RISET-3
- selesai bila: `plan/CERITA-TAHAP-3.md` dengan struktur persis CERITA-TAHAP-2 (Kenapa dokumen ini ada, Latar, Tokoh baru, 1 PRD v3, 2 Dari fitur ke pekerjaan teknis, 3 Inti teknis, 3b Skema data, 4 Masalah, 5 Yang dibawa keluar, 6 Jembatan, Peta halaman, Jalur per peran), baris pertama "Draft otomatis, belum ditinjau pemilik", memakai RISET-TAHAP-3; nomor M dan ADR melanjutkan tahap sebelumnya; peta halaman 24–32 halaman dengan kolom lab, setiap halaman masalah dipicu fitur PRD, pihak ketiga selalu tiruan lokal; peninjau konsistensi (subagent kedua) membaca naskah terhadap semua naskah sebelumnya (tokoh, nama perusahaan, angka saldo dan user, istilah glosarium, nomor ADR dan M, rantai PRD → fitur → teknis → masalah → konsep) dan semua temuannya ditutup.
- catatan: Satu-satunya naskah yang ditulis Claude; Tahap 1–2 milik pemilik dan tidak disentuh. Ditulis sebelum Tahap 2 selesai (keputusan 728): memakai RINGKAS dan CERITA-TAHAP-2 sebagai jembatan; `KONSISTENSI-3` mencocokkannya dengan keputusan Tahap 2 yang sebenarnya. Selesai 2026-10-25 di PR #331. Tinjauan konsistensi di badan PR (keputusan 873–879).

### KONSISTENSI-3 · NASKAH-3 dicocokkan dengan keputusan Tahap 2 yang sebenarnya

- jenis: crosscheck
- status: selesai
- percobaan: 0
- bergantung: NASKAH-3, EVAL-2
- selesai bila: satu subagent membaca `plan/CERITA-TAHAP-3.md`, `plan/EVALUASI-TAHAP-2.md`, halaman Tahap 2 yang ditulis, ADR 13–21 dan keputusan Tahap 2 di KEPUTUSAN, lalu menambal naskah seperlunya (nama tabel dan kolom, nomor M dan ADR, angka beban, apa yang sudah ada di akhir Tahap 2, peta halaman dan prasyarat) tanpa menulis ulang struktur; setiap tambalan dicatat satu baris di bagian atas naskah ("Disesuaikan dengan Tahap 2 pada <tanggal>: ...") dan di KEPUTUSAN; bila peta halaman berubah, registry dan `plan/RINGKAS.md` Tahap 3 diselaraskan di PR yang sama; gerbang lolos.
- catatan: Keputusan 728 butir 3. Halaman 3.1 baru boleh mulai sesudah tugas ini dan DIRI-2. Pengatur 2026-10-26 (keputusan 728 butir 3, boleh menurut catatan EVAL-2-ulang): bergantung EVAL-2 supaya Tahap 3 tidak tertunda; EVAL-2-ulang berjalan paralel. Selesai 2026-10-26 di PR #360 (keputusan 890–895, 1162–1163): 63 tambalan di plan/CERITA-TAHAP-3.md (21 dari keputusan Tahap 2, 42 dari lab dan widget).

### T3-siap · RINGKAS, registry, dan antrean Tahap 3

- jenis: interaksi
- status: selesai
- percobaan: 0
- bergantung: NASKAH-3
- selesai bila: `plan/RINGKAS.md` (≤ 60 baris) memuat peta halaman Tahap 3 satu baris per halaman dan tahap sebelumnya diringkas; registry `situs/data/cerita.json` memuat semua halaman Tahap 3 sesuai naskah (judul, jenis, bagian, ★, peran, prasyarat, lab), yang belum ditulis tampil "segera", halaman lama tahap ini menjadi `lama` bila diganti; ANTREAN mendapat tugas lab (sebelum `ERD3`) dan tugas halaman berurutan (sesudah tugas widget) dengan `selesai bila` merujuk bagian naskah; `sinkron_cerita.py`, `cek_tautan.py`, dan gerbang lolos.
- catatan: Keputusan 728: lab, `ERD3`, dan `W3-*` Tahap 3 dimulai segera sesudah tugas ini di lajur teknis, tidak menunggu EVAL-2; setiap halaman Tahap 3 bergantung tambahan pada `KONSISTENSI-3` dan `DIRI-2`. Sekaligus mengganti `bergantung` `EVAL-3` ke halaman terakhir Tahap 3 dan `ERD3` ke lab utama Tahap 3; halaman yang memakai widget bergantung pada tugas widgetnya. Selesai 2026-10-25 di PR #336 (keputusan 900–905): RINGKAS 58 dari 60 baris; registry memuat 3.1–3.32 "segera", delapan halaman lama dilebur, `asumsi.trx` Tahap 3 jadi 3; delapan tugas lab, 32 tugas halaman. Satu baris tabel di 1.38 dan `cerita/tahap-3.mdx` mengikuti `trx` 3 (±550 jadi ±820 MB).

### lab-api-t3 · Lab api-t3: api-t2 naik ke enam kota

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: T3-siap
- selesai bila: Lab baru `labs/api-t3` (Go, schema sendiri di PostgreSQL bersama, `make -C labs/api-t3 run`, gagal keras bila hasil berbeda dari harapan) berangkat dari `labs/api-t2` dan menambah semua tabel naskah bagian 3b lewat migrasi baru di atas 000013: `kota`, `perangkat`, `outbox`, `produk`, `promo`, `operasi_sinkron`, `sesi` + `jenis` dan `csrf_hash`, `akun` + `kota_id` (boleh kosong untuk admin dan sistem) dan jenis `hr`; kolom persis mengikuti skema lab, selisih dengan blok mermaid naskah dicatat (lab yang benar). Jalur uang menulis jurnal, posting, dan baris `outbox` dalam satu transaction (ADR 23) dan tidak memanggil jaringan di dalam transaction (ADR 22: timeout 3 detik di setiap client, `idle_in_transaction_session_timeout` 5 detik). Batas pool 10 ditetapkan eksplisit (`SetMaxOpenConns(10)` atau pgxpool `MaxConns` 10) dan direkam, karena api-t2 memakai `database/sql` tanpa batas bawaan. Ada: daftar perangkat dan token push; katalog dan ubah produk bersyarat versi; promo per kota; laporan harian dan ekspor CSV untuk dasbor; endpoint sinkron bersyarat versi; catatan pembayaran maksimal 100 karakter di `jurnal.keterangan`; layanan push tiruan lokal di container (menjawab, lambat, menggantung, 503). Mode rentan seperti `api-t1` (push di dalam transaction dan client tanpa batas waktu untuk M18; kursor `(dibuat, id)` untuk M19) supaya `t3-pool` dan `t3-outbox` berbagi lab ini, bukan salinan. Tes Go untuk aturan uang dan outbox dari PostgreSQL; rekaman `output/*.txt` dari database bersih, diulang identik (status, saldo, urutan; bukan waktu); port dan nama kontainer lewat `labs/lab_env.*` (keputusan 860–864), tanpa 54333 tertulis tetap di luar nilai bawaan (`tools/cek_port_lab.py`); kontrak OpenAPI v3 bila endpoint berubah.
- catatan: Jalur lab. Sumber `ERD3` dan lab utama halaman 3.3, 3.5, 3.7, 3.27. Versi dasar dari R3-01 (PostgreSQL 17.11, Go 1.27.3, pgx v5.11.0, dicek 2026-10-25) dicek ulang saat lab ditulis. Lab lama `t3-bayar` hanya bahan, bukan dasar angka (17 pembayaran per detik, 20 kali terlalu tinggi). Versi app Tahap 3 (3.0 notifikasi, 3.1 rilis M26) belum ada di naskah: kontrak mencatat versi app per endpoint. Selesai 2026-10-25 di PR #340 (catatan keputusan dan polesan di badan PR, dilipat pengatur).

### lab-t3-pool · Lab t3-pool: layanan push yang menggantung dan connection pool

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: lab-api-t3
- selesai bila: Lab `labs/t3-pool` (mode rentan `api-t3` atau server kecil sendiri bila lebih sederhana) merekam M18: layanan push tiruan menerima koneksi lalu tidak menjawab; beban 17,4 request per detik dengan 5% pembayaran (bukan 17 pembayaran per detik seperti `t3-bayar`), pembayaran memanggil push di dalam transaction dengan client tanpa batas waktu (timeout nol berarti tanpa batas, R3-08) dan pool 10; direkam: koneksi terpakai naik, pool 10 penuh dalam kira-kira 11,5 detik (hitungan 10 ÷ 0,87, bandingkan dengan ukuran), request lain ikut mengantre. Dibandingkan: pool 50 (hanya menunda), timeout 3 detik tetapi tetap di dalam transaction, dan panggilan keluar di luar transaction dengan timeout 3 detik dan `idle_in_transaction_session_timeout` 5 detik (ADR 22). L = λ × W dihitung dari data untuk t = 0,3 / 2 / 10 / 30 detik dan dibandingkan dengan 0,28 / 1,75 / 8,7 / 26,1; W 20 ms dan jumlah koneksi diukur lewat `pg_stat_activity`. Satu permintaan dilacak dari app ke API (log, metric, trace untuk 3.7; OpenTelemetry bila terpasang, kalau tidak berlabel Tidak dijalankan). Rekaman dari database bersih, diulang identik.
- catatan: Jalur lab. Angka beban naskah bagian 3 (Asumsi) diganti rekaman di halaman; `t3-bayar` hanya bahan. Sumber W3-pool dan halaman 3.6, 3.7, 3.8. Selesai 2026-10-25 di PR #343 (catatan keputusan dan polesan di badan PR, dilipat pengatur).

### lab-t3-outbox · Lab t3-outbox: outbox, klaim per baris, retry, dan queue promo

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: lab-api-t3
- selesai bila: Lab `labs/t3-outbox` di atas `api-t3`: (a) jurnal dan baris outbox dalam satu transaction, ROLLBACK membuang keduanya; (b) kursor `(dibuat, id)` melewatkan baris yang COMMIT belakangan (M19), termasuk dua transfer ke penerima yang sama yang saling menunggu di baris `buku` penerima (dari kode `CatatJurnal`, belum direkam: rekam atau beri label Tidak dijalankan); (c) klaim per baris `FOR UPDATE SKIP LOCKED` dengan batas klaim: tiga worker tanpa baris ganda dan tanpa baris terlewat, urutan antar pesan tidak dijaga (direkam); (d) worker dihentikan di antara kirim dan tandai terkirim: klaim habis, pengiriman ulang, penerima menyaring `notifikasi_id` (M20), dengan panjang klaim sekitar 5 detik; (e) retry dengan backoff dan jitter, maksimal 5 percobaan lalu dead-letter; (f) 10.000 baris promo di depan notifikasi uang, tanpa kelas (urut waktu) lawan dengan kolom `kelas` (bayar dan transfer, top-up massal, promo), umur notifikasi tertua, kapasitas worker c ÷ t (c = 4, t = 0,3 detik; diukur) dibandingkan 13,3 per detik, laju promo paling banyak 5 per detik (M27); (g) `LISTEN`/`NOTIFY` hanya sebagai pembangun worker: nasib listener yang putus (R3-05; rekam atau Tidak dijalankan); retensi 7 hari. Rekaman dari database bersih, diulang identik.
- catatan: Jalur lab. Sumber W3-outbox dan halaman 3.4, 3.9–3.13, 3.26, 3.27. Pembanding tulisan di stack lain (Laravel, Django) dari dokumentasi (R3-22), berlabel Tidak dijalankan bila tidak dijalankan di lab. Selesai 2026-10-25 di PR #342 (catatan keputusan dan polesan di badan PR, dilipat pengatur).

### lab-t3-instance · Lab t3-instance: proxy, dua instance, dan rate limit lintas instance

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: lab-api-t3
- selesai bila: Lab `labs/t3-instance`: proxy (Caddy; versi dicek ulang saat lab ditulis, R3-01) di depan dua instance `api-t3`. Direkam: (a) bawaan tanpa health check dan tanpa retry: instance mati tetap dipilih acak (R3-13) lawan health check aktif dan retry, tanpa error terlihat user; (b) panic di goroutine latar (ekspor laporan) mematikan seluruh proses Go dan tidak ada yang memulainya lagi (M21, [perlu verifikasi di lab]); (c) deploy bergulir dengan `Shutdown` saat SIGTERM: request yang sedang jalan selesai, lawan tanpa itu; (d) rate limit lintas instance: token bucket di memori dua instance memberi batas efektif per IP antara 10 dan 20 dan per akun antara 5 dan 10, sedangkan kunci akun di database tetap lima (keputusan 545, 550; rekaman `c4-ratelimit` bagian C dan F sebagai pembanding), lawan skrip atomik di Redis (`INCR` dan `EXPIRE`, R3-12) dengan timeout 50 ms dan Redis mati berarti batas lokal. Rekaman dari database bersih, diulang identik.
- catatan: Jalur lab. Sumber halaman 3.14–3.17. Redis 8.10.2 atau yang lebih baru; lisensi dan Valkey sebagai pembanding hanya dicatat (PERLU-DICEK-PEMILIK). Selesai 2026-10-25 di PR #345 (catatan keputusan dan polesan di badan PR, dilipat pengatur).

### lab-t3-cache · Lab t3-cache: katalog di memori proses lawan Redis

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: lab-api-t3
- selesai bila: Lab `labs/t3-cache`: katalog 60 warung × 40 item (720 KB, R3-37). Direkam: cache di memori proses dua instance dengan TTL 5 menit, hanya instance yang menerima perubahan yang membuang entri, instance lain basi sampai TTL habis (M23); cache-aside di Redis dengan TTL 60 detik dan hapus kunci sesudah tulis database (urutan terbalik meninggalkan data basi, R3-09); promo yang mulai pada jam tertentu tidak punya tulis saat mulai, jadi hapus kunci tidak menutupnya dan TTL membatasi; harga yang ditagih selalu dari database; error backend tidak membuang entri (R3-25); beban tanpa cache (5,2 baca per detik, L = 0,026) diukur lawan dengan cache, supaya "tanpa cache" tetap opsi sah. Stampede hanya disebut. Rekaman dari database bersih, diulang identik.
- catatan: Jalur lab. Sumber W3-cache dan halaman 3.18, 3.19. `b9-cache` hanya bahan; Redis lab bersama `t3-instance`. Selesai 2026-10-26 di PR #347 (catatan keputusan dan polesan di badan PR, dilipat pengatur).

### lab-t3-offline · Lab t3-offline: sinkron stok dan harga, key 24 jam lawan 62 jam

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: lab-api-t3
- selesai bila: Lab `labs/t3-offline`: (a) key idempotensi 24 jam (ADR 14) lawan offline Jumat 17.00 sampai Senin 07.00 (62 jam, Asumsi): key sudah dibuang dan operasi "stok = 0" diterapkan sebagai timpa tanpa pemeriksaan versi (M24); jam diperankan (baris diberi waktu mundur), bukan menunggu 62 jam; (b) operasi bersyarat versi `UPDATE … WHERE versi = …`: 409 saat versi berubah dan pilihan user; (c) `operasi_sinkron` dengan key 14 hari dan queue paling lama 7 hari: pengiriman ulang dengan key sama tidak menerapkan dua kali; (d) pembayaran dari queue offline ditolak server. Rekaman dari database bersih, diulang identik. `e2-sync` hanya bahan.
- catatan: Jalur lab. Sumber halaman 3.20, 3.21. Selesai 2026-10-26 di PR #349 (catatan keputusan dan polesan di badan PR, dilipat pengatur).

### lab-t3-dasbor · Lab t3-dasbor: dasbor kecil dengan mode rentan

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: lab-api-t3
- selesai bila: Lab `labs/t3-dasbor`: dasbor kecil HTML dan Go dengan mode rentan. Direkam: (a) XSS tersimpan, `<img src=x onerror=…>` di `jurnal.keterangan` ditampilkan lewat `innerHTML` (M25) lawan teks tanpa HTML dan CSP dengan nonce; (b) CSRF: form lintas situs ke endpoint ubah menu tanpa token, dengan `SameSite=Lax`, dengan token dan pemeriksaan `Sec-Fetch-Site` dan `Origin`; XSS mengalahkan token CSRF (R3-19); (c) cookie `__Host-` dengan `HttpOnly`, `Secure`, dan `SameSite=Lax`, dengan batasan `Secure` di `localhost` dicatat; (d) passkey dengan authenticator virtual bila terbukti (R3-20), kalau tidak berlabel Tidak dijalankan. Bukti perilaku browser dari Playwright, bukan dari ingatan. Rekaman dari database bersih, diulang identik.
- catatan: Jalur lab. Sumber halaman 3.22, 3.23. Selesai 2026-10-26 di PR #355 (keputusan 974–976, 1165): dua binary Go dan lima sumbu mode; peninjau menemukan dan memperbaiki reflected XSS di dasbor benar.

### lab-t3-mitm · Lab t3-mitm: proxy tiruan, pinning, dan rotasi pin

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: lab-api-t3
- selesai bila: Lab `labs/t3-mitm`: mitmproxy (versi dicek ulang saat lab ditulis, R3-01) di container, tanpa target di luar container. Direkam: (a) client Dart dengan validasi sertifikat menolak sertifikat tiruan, sedangkan flag "terima sertifikat apa pun" (M26: ada di build staging, tidak dicabut dari build rilis) membiarkan proxy membaca header `Authorization`; (b) pin SPKI dengan satu cadangan (ADR 31): pin lolos, rotasi kunci server tanpa cadangan mematikan client dan dengan cadangan jalan terus; masa berlaku sertifikat daun paling lama 200 hari dihitung, tidak ditunggu (R3-18); (c) klaim dio#2418 (callback jalan sesudah body terkirim) diuji lebih dulu dan hasilnya memilih mekanisme di Dart; (d) HSTS di dasbor (RFC 6797); (e) token sesi 15 menit dan redaksi log: token tidak muncul di log. Rekaman dari database bersih, diulang identik; versi Dart disebut.
- catatan: Jalur lab. Sumber halaman 3.24, 3.25. Bila (c) tidak terbukti di lab, halaman menulis Tidak dijalankan dan sumbernya. Selesai 2026-10-25 di PR #348 (catatan keputusan dan polesan di badan PR, dilipat pengatur).

### ERD3 · ERD Tahap 3 dari skema lab

- jenis: interaksi
- status: selesai
- percobaan: 1
- bergantung: lab-api-t3
- selesai bila: `tools/erd.py` membaca skema akhir lab utama Tahap 3 dan menulis `situs/data/erd/tahap-3.json` beserta selisih terhadap Tahap 2; `--cek` di gerbang mencakup Tahap 3; widget ERD bertumbuh menampilkan Tahap 3 berdampingan dengan Tahap 2 di `/uji/erd/`; selisih dengan mermaid naskah 3b tercatat (lab yang benar).
- catatan: `T3-siap` mengganti `bergantung` dari T3-siap ke lab utama Tahap 3 (`lab-api-t3`, yang bergantung pada T3-siap). Diagram naskah 3b dibanding skema lab; yang benar skema lab. Selesai 2026-10-25 di PR #344 (catatan keputusan dan polesan di badan PR, dilipat pengatur).

### W3-pool · Simulasi connection pool dan Little's Law

- jenis: interaksi
- status: selesai
- percobaan: 1
- bergantung: ERD3, lab-t3-pool
- selesai bila: Widget baru (skill visualisasi) dibuat sebelum halaman yang memakainya: slider beban (request per detik) dan lama query; L = λ × W dihitung dan ditampilkan; antrean menunggu koneksi terlihat saat L melewati ukuran pool; angka contoh dari rekaman lab pool Tahap 3 atau berlabel Simulasi/Ilustrasi. Tebak dulu sebelum hasil, satu hal yang bisa diubah pembaca, chip sumber ke rekaman atau label Simulasi/Ilustrasi, keyboard penuh, `prefers-reduced-motion` tanpa gerak dengan fungsi tetap, teks sebagai DOM (bukan di SVG), token warna gelap/terang, dimuat hanya di halaman yang memakainya, ukuran JS dicatat di `plan/AUDIT-TAMPILAN.md`, diuji di halaman `/uji/`, axe 0, tes Vitest untuk logika murni.
- catatan: Dipakai 3.8. Masukan awal dari naskah bagian 3 (Asumsi): 0,87 pembayaran per detik dan pool 10; angka halaman dari rekaman `t3-pool`. Selesai 2026-10-26 di PR #352 (catatan keputusan dan polesan di badan PR, dilipat pengatur).

### W3-cache · Simulasi cache dan invalidation

- jenis: interaksi
- status: selesai
- percobaan: 0
- bergantung: ERD3, lab-t3-cache
- selesai bila: Widget baru (skill visualisasi) dibuat sebelum halaman yang memakainya: baca dengan dan tanpa cache, hit/miss, TTL dan invalidasi saat saldo berubah, kasus data basi yang terlihat orang; skenario dari lab cache Tahap 3. Tebak dulu sebelum hasil, satu hal yang bisa diubah pembaca, chip sumber ke rekaman atau label Simulasi/Ilustrasi, keyboard penuh, `prefers-reduced-motion` tanpa gerak dengan fungsi tetap, teks sebagai DOM (bukan di SVG), token warna gelap/terang, dimuat hanya di halaman yang memakainya, ukuran JS dicatat di `plan/AUDIT-TAMPILAN.md`, diuji di halaman `/uji/`, axe 0, tes Vitest untuk logika murni.
- catatan: Dipakai 3.19. Tampilkan juga kasus "tanpa cache" (5,2 baca per detik, L = 0,026) sebagai opsi sah. Selesai 2026-10-26 di PR #358 (keputusan 986–988): widget CacheInvalidation, sembilan pengaturan dari rekaman, hanya di /uji/cache/ (3.19 yang memasang).

### W3-outbox · Timeline outbox dan worker

- jenis: interaksi
- status: selesai
- percobaan: 1
- bergantung: ERD3, lab-t3-outbox
- selesai bila: Widget baru (skill visualisasi) dibuat sebelum halaman yang memakainya: garis waktu jurnal + baris outbox dalam satu transaction, worker mengambil, gagal, retry, notifikasi sekali; dari rekaman lab outbox Tahap 3. Tebak dulu sebelum hasil, satu hal yang bisa diubah pembaca, chip sumber ke rekaman atau label Simulasi/Ilustrasi, keyboard penuh, `prefers-reduced-motion` tanpa gerak dengan fungsi tetap, teks sebagai DOM (bukan di SVG), token warna gelap/terang, dimuat hanya di halaman yang memakainya, ukuran JS dicatat di `plan/AUDIT-TAMPILAN.md`, diuji di halaman `/uji/`, axe 0, tes Vitest untuk logika murni.
- catatan: Dipakai 3.9, 3.13, dan 3.26. Butuh mode queue dengan dan tanpa kolom `kelas` untuk 3.26 (naskah, catatan widget). Selesai 2026-10-26 di PR #354 (catatan keputusan dan polesan di badan PR, dilipat pengatur).

### 3.1 · PRD v3: Rekeningo untuk enam kota

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: W3-outbox, KONSISTENSI-3, DIRI-2
- selesai bila: halaman PRD 3.1 sesuai `plan/CERITA-TAHAP-3.md` bagian 1 dan peta halaman Tahap 3; tanpa lab baru; jawaban atas tebakan pembaca di 2.33 (dibuka dari naskah bagian 1: user, ruang lingkup P0 sampai P2, metrik, risiko Sinta, tiga pertanyaan terbuka); janji 95% dalam 30 detik hanya untuk bayar dan transfer; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Template PRD seperti 2.1. Tugas halaman pertama: menunggu semua widget Tahap 3 supaya halaman berikutnya tidak menunggu widget. Selesai 2026-10-26 di PR #364 (keputusan 1000–1003): prd-v3.mdx 8 blok, penjaga 48 tes, 66 mutasi tertangkap; peninjau memperbaiki hitungan 12,5 kali, label lock, dan janji 95%.

### 3.2 · Dari fitur ke pekerjaan teknis v3

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.1, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Fitur → teknis 3.2 sesuai `plan/CERITA-TAHAP-3.md` bagian 2 dan peta halaman Tahap 3; tanpa lab baru; tabel delapan baris naskah (fitur, app, backend, database, konsep) dengan tautan ke halaman konsep; pertanyaan pertama Tahap 3 dirumuskan sebelum kode; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Katalog, dasbor, promo, dan offline tidak punya halaman fitur sendiri (peta 32 halaman); cukup di tabel ini. Selesai 2026-10-26 di PR #365 (keputusan 1004–1007): fitur-ke-teknis.mdx dua tabel, pilah lama dengan data baru, penjaga 40 tes; peninjau memperbaiki dua label lebih kuat dari sumber.

### 3.3 · Fitur: notifikasi push dan promo HR

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.2, lab-api-t3, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Fitur → teknis 3.3 sesuai `plan/CERITA-TAHAP-3.md` bagian 2 dan 3 dan peta halaman Tahap 3; rekaman dari `labs/api-t3`; widget alur; menyerap bagian relevan E4 (Push dan real-time, halaman lama); layanan push tiruan lokal dengan FCM v1 hanya sebagai rujukan (R3-16); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Tulis versi app Tahap 3 di halaman ini (3.0 notifikasi, 3.1 rilis M26): naskah belum mendefinisikannya (SETELAH-TAHAP-3). Selesai 2026-10-26 di PR #366 (keputusan 1008–1011): fitur-notifikasi.mdx, Rantai, PetaFitur, alur, istilah Token perangkat, penjaga 47 tes; peninjau memperbaiki dua klaim FCM dan hitungan 13,33.

### 3.4 · Dua tempat yang tidak bisa commit bersama

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.3, lab-t3-outbox, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Konsep 3.4 sesuai `plan/CERITA-TAHAP-3.md` bagian 3 dan peta halaman Tahap 3; rekaman dari `labs/t3-outbox`; widget cari-bug (tandai baris handler versi pertama yang melanggar satu dari tiga hal, lalu tabel empat kejadian terisi); tiga hal yang harus selalu benar dan versi pertama minggu 1 dari naskah; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Cek diri minimal tiga kartu. Pola dua tempat dijanjikan muncul lagi di M22, M23, M24, dan M27. Selesai 2026-10-26 di PR #368 (keputusan 1012–1015): dua-tempat-commit.mdx, widget cari-bug diperluas (kejadian, label.ringkas, fokus), penjaga mengunci kalimat penulis; peninjau memperbaiki urutan rekaman push mati dan lima klaim.

### 3.5 · Skema data: ERD Tahap 2 → Tahap 3 dan pertumbuhannya

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.4, ERD3, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Konsep 3.5 sesuai `plan/CERITA-TAHAP-3.md` bagian 3b dan peta halaman Tahap 3; widget ERD bertumbuh dengan Tahap 2 dan Tahap 3 berdampingan dari `situs/data/erd/tahap-3.json` (ERD3); tabel "Apa yang berubah dan kenapa" dan pertumbuhan skala Tahap 2 sampai 4; selisih dengan mermaid naskah ditulis (lab yang benar); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Dua besaran dengan label, tidak disamakan diam-diam: "data transaksi per tahun" registry ±820 MB (3 × 300 B) dan ukuran posting naskah 3b ±1,4 GB (2 posting × 250 B, R3-38). Outbox 0,82 GB tanpa pembersihan lawan 15,8 MB dengan retensi 7 hari. Selesai 2026-10-26 di PR #369 (keputusan 1016–1019): skema-data.mdx, ERD bertumbuh Tahap 2 dan 3, tiga besaran penyimpanan berlabel Asumsi, penjaga 51 tes; peninjau memperbaiki klaim psql -1 -f dan tiga mutasi nyata.

### 3.6 · M18: Seluruh app membeku jam 12.20

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.5, lab-t3-pool, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Masalah 3.6 sesuai `plan/CERITA-TAHAP-3.md` bagian 4 (M18) dan peta halaman Tahap 3; rekaman dari `labs/t3-pool`; widget alur; gejala berlabel Ilustrasi sampai ada rekaman; yang dikira (pool dinaikkan dari 10 ke 50) sebelum yang sebenarnya; konsep tidak di dalam adegan; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: - Selesai 2026-10-26 di PR #370 (keputusan 1020–1023): m18-app-membeku.mdx, alur t3-m18, penjaga 47 tes; peninjau memperbaiki label koneksi ditahan, klaim pembaca selalu berbeda, dan jam widget.

### 3.7 · Observability: log, metric, trace

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.6, lab-api-t3, lab-t3-pool, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Konsep 3.7 sesuai `plan/CERITA-TAHAP-3.md` bagian 4 dan peta (menyerap C2 lama) dan peta halaman Tahap 3; rekaman dari `labs/api-t3` dan `labs/t3-pool`; widget pilah; empat golden signals dan `traceparent` (R3-14); log Go masih Release Candidate di OpenTelemetry (R3-14); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Halaman lama C2 dilebur ke sini. Selesai 2026-10-26 di PR #371 (keputusan 1024–1027): observability.mdx, C2 dilebur lewat lebur_ke, tiga halaman istilah, penjaga 46 tes; peninjau memperbaiki umur transaction dan klaim hanya menulis.

### 3.8 · Connection pool, Little's Law, dan timeout + ADR 22

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.7, W3-pool, lab-t3-pool, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Konsep + ADR 3.8 sesuai `plan/CERITA-TAHAP-3.md` bagian 4 dan tabel ADR 22 (menyerap B2.5 lama) dan peta halaman Tahap 3; rekaman dari `labs/t3-pool`; widget W3-pool; ADR 22 dengan tiga opsi atau lebih (pool 50, timeout tetap di dalam transaction, circuit breaker), pre-mortem, kapan salah; kasus pgx#1974 hanya sebagai jebakan forum; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Halaman lama B2.5 dilebur ke sini. Selesai 2026-10-26 di PR #372 (keputusan 1028–1031): connection-pool.mdx, ADR 22 empat opsi, widget pool-little, B2.5 dilebur, penjaga 39 tes; peninjau memperbaiki atribusi HikariCP, label ditahan, dan kalimat node-postgres.

### 3.9 · Outbox transaksional dan worker + ADR 23

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.8, W3-outbox, lab-t3-outbox, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Konsep + ADR 3.9 sesuai `plan/CERITA-TAHAP-3.md` bagian 4 dan tabel ADR 23 (menyerap B10.1 lama) dan peta halaman Tahap 3; rekaman dari `labs/t3-outbox`; widget W3-outbox; ADR 23 dengan opsi queue di Redis, log-based CDC, kirim sesudah COMMIT tanpa outbox; kasus industri Solid Queue (R3-24); di stack lain (Laravel, Django) dari dokumentasi berlabel Tidak dijalankan; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Halaman lama B10.1 dilebur ke sini (juga ke 3.11 dan 3.13). Selesai 2026-10-26 di PR #374 (keputusan 1032–1035): outbox-worker.mdx, ADR 23 empat opsi, B10.1 dilebur, widget OutboxWorker cara, penjaga 63 tes; peninjau memperbaiki Snippet yang menampilkan komentar lab dan klaim hanya INSERT.

### 3.10 · M19: Ani tidak diberi tahu

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.9, lab-t3-outbox, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Masalah 3.10 sesuai `plan/CERITA-TAHAP-3.md` bagian 4 (M19) dan peta halaman Tahap 3; rekaman dari `labs/t3-outbox`; widget race; kursor `(dibuat, id)` melewatkan baris yang COMMIT belakangan; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Dua transfer ke penerima yang sama saling menunggu di baris buku penerima: rekaman atau Tidak dijalankan (lab-t3-outbox). Selesai 2026-10-26 di PR #375 (keputusan 1036–1039): m19-tidak-diberi-tahu.mdx, widget OutboxWorker kursor, penjaga 23 tes; peninjau memperbaiki atribusi Morling dan label urutan COMMIT yang tak terekam.

### 3.11 · Klaim per baris, bukan kursor: SKIP LOCKED + ADR 24

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.10, lab-t3-outbox, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Konsep + ADR 3.11 sesuai `plan/CERITA-TAHAP-3.md` bagian 4 dan tabel ADR 24 (menyerap B8 lama) dan peta halaman Tahap 3; rekaman dari `labs/t3-outbox`; widget race; ADR 24 dengan opsi kursor `(dibuat, id)`, nomor urut tanpa celah, `LISTEN`/`NOTIFY` hanya sebagai pembangun; worker di berbagai stack; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Halaman lama B8 (Concurrency dan async) dilebur ke sini. `SKIP LOCKED` tidak menjaga urutan antar pesan: tulis di "kapan salah". Selesai 2026-10-26 di PR #376 (keputusan 1040–1043): klaim-per-baris.mdx, ADR 24 empat opsi, B8 dilebur, penjaga 39 tes; peninjau memperbaiki klaim universal tab stack, label worker A, dan opsi C ADR 16.

### 3.12 · M20: Notifikasi masuk dua kali

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.11, lab-t3-outbox, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Masalah 3.12 sesuai `plan/CERITA-TAHAP-3.md` bagian 4 (M20) dan peta halaman Tahap 3; rekaman dari `labs/t3-outbox`; widget alur; hanya satu jurnal, worker dihentikan saat deploy di antara kirim dan tandai terkirim; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Dua pengiriman berselang sekitar enam detik menuntut klaim paling lama sekitar 5 detik (SETELAH-TAHAP-3): sebut panjang klaim. Selesai 2026-10-26 di PR #378 (keputusan 1044–1047): m20-notifikasi-dua-kali.mdx, alur t3-m20, penjaga 45 tes; peninjau memperbaiki lima kalimat terkunci yang salah (jurnal_id kosong untuk promo, label klaim 300 ms, batas klaim, atribusi worker kedua).

### 3.13 · At-least-once: retry, dead-letter, penyaring di app + ADR 25

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.12, W3-outbox, lab-t3-outbox, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Konsep + ADR 3.13 sesuai `plan/CERITA-TAHAP-3.md` bagian 4 dan tabel ADR 25 (menyerap E4 lama) dan peta halaman Tahap 3; rekaman dari `labs/t3-outbox`; widget W3-outbox; ADR 25 dengan opsi at-most-once, retry tanpa batas, exactly-once; penyaring `notifikasi_id` di app (Dart); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Halaman lama E4 (Push dan real-time) dilebur ke sini dan ke 3.3. Selesai 2026-10-26 di PR #381 (keputusan 1048–1051): at-least-once.mdx, ADR 25 pesan data, E4 diserap lewat lebur_ke, penjaga 35 tes; peninjau memperbaiki klaim lima kali, jendela retry 45 detik bersyarat, dan klaim FCM.

### 3.14 · M21: Satu proses mati, semua mati

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.13, lab-t3-instance, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Masalah 3.14 sesuai `plan/CERITA-TAHAP-3.md` bagian 4 (M21) dan peta halaman Tahap 3; rekaman dari `labs/t3-instance`; widget alur; panic di goroutine latar berlabel [perlu verifikasi di lab] bila tidak terekam; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: - Selesai 2026-10-26 di PR #382 (keputusan 1052–1055): m21-satu-proses-mati.mdx, alur t3-m21 dari panic.txt, penjaga 46 tes; peninjau memperbaiki kalimat naskah yang salah dikunci dan label rekaman lawan kode; pertentangan dengan restart otomatis Tahap 1 dicatat untuk pemilik.

### 3.15 · Dua instance di belakang proxy + ADR 26

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.14, lab-t3-instance, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Konsep + ADR 3.15 sesuai `plan/CERITA-TAHAP-3.md` bagian 4 dan tabel ADR 26 dan peta halaman Tahap 3; rekaman dari `labs/t3-instance`; widget banding; ADR 26 dengan opsi proxy bawaan, satu instance dengan restart otomatis, dua VPS, Kubernetes; satu VPS tetap titik gagal tunggal; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: - Selesai 2026-10-27 di PR #383 (keputusan 1056–1059): dua-instance.mdx, ADR 26 lima opsi, Tebak + banding, penjaga 78 tes tanpa snapshot; peninjau memperbaiki klaim universal load balancer, jadwal Kubernetes lawan PROPOSAL, dan margin layar pertama.

### 3.16 · M22: Batas login jadi dua kali lipat

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.15, lab-t3-instance, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Masalah 3.16 sesuai `plan/CERITA-TAHAP-3.md` bagian 4 (M22) dan peta halaman Tahap 3; rekaman dari `labs/t3-instance`; widget ember; yang berlipat adalah penahan per IP di memori, bukan kunci akun di database (keputusan 877, 550); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: - Selesai 2026-10-27 di PR #386 (keputusan 1060–1063): m22-batas-login-dua-kali.mdx + widget BatasInstance (island PertahananLogin), penjaga 39+16 tes; peninjau memperbaiki klaim password dibandingkan lima kali dan komentar lab di Snippet.

### 3.17 · Rate limit lintas instance dan Redis + ADR 27

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.16, lab-t3-instance, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Konsep + ADR 3.17 sesuai `plan/CERITA-TAHAP-3.md` bagian 4 dan tabel ADR 27 (menyerap C4 lama) dan peta halaman Tahap 3; rekaman dari `labs/t3-instance`; widget ember; ADR 27 dengan opsi counter di PostgreSQL, sticky session, batas dibagi N; bagian brute force tidak diulang (sudah di 2.28); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Halaman lama C4 dilebur ke sini. Lisensi Redis 8 dan Valkey hanya dicatat di PERLU-DICEK-PEMILIK (R3-10). Selesai 2026-10-27 di PR #385 (keputusan 1064–1067): rate-limit-redis.mdx, ADR 27, C4 dilebur, widget alur t3-batas-redis, penjaga 75 mutasi; peninjau memperbaiki urutan Redis mati dan klaim satu key per alamat.

### 3.18 · M23: Dua harga di satu meja

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.17, lab-t3-cache, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Masalah 3.18 sesuai `plan/CERITA-TAHAP-3.md` bagian 4 (M23) dan peta halaman Tahap 3; rekaman dari `labs/t3-cache`; widget alur; cache memori proses dua instance tetap basi sampai TTL habis; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: - Selesai 2026-10-27 di PR #389 (keputusan 1068–1071): M23 dua harga, alur dari memori.txt dan redis.txt; peninjau menemukan bug komponen alur (jawaban tebakan di jalur varian; diperbaiki #394).

### 3.19 · Cache dan invalidation + ADR 28

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.18, W3-cache, lab-t3-cache, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Konsep + ADR 3.19 sesuai `plan/CERITA-TAHAP-3.md` bagian 4 dan tabel ADR 28 (menyerap B9 lama) dan peta halaman Tahap 3; rekaman dari `labs/t3-cache`; widget W3-cache; ADR 28 jujur bahwa beban tidak memaksa cache dan "tanpa cache" tetap opsi sah; kasus Facebook 2010 (R3-25); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Halaman lama B9 dilebur ke sini. Promo yang mulai di jam tertentu tidak punya tulis saat mulai: tulis di ADR (SETELAH-TAHAP-3). Selesai 2026-10-27 di PR #391 (keputusan 1072–1075): cache-invalidation.mdx, ADR 28 Redis bersama, widget CacheInvalidation, B9 dilebur, penjaga 45+8 tes; peninjau memperbaiki petunjuk Coba dan aturan 6.

### 3.20 · M24: Stok yang kembali ke angka lama

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.19, lab-t3-offline, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Masalah 3.20 sesuai `plan/CERITA-TAHAP-3.md` bagian 4 (M24) dan peta halaman Tahap 3; rekaman dari `labs/t3-offline`; widget alur; offline akhir pekan 62 jam lawan key 24 jam (Asumsi, jam diperankan); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: - Selesai 2026-10-27 di PR #390 (keputusan 1076–1079): m24-stok-kembali.mdx, alur t3-m24, penjaga 46 tes; peninjau memperbaiki kalimat hanya menerima stok 0 dan jam bilah status.

### 3.21 · Offline-first dan sinkron + ADR 29

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.20, lab-t3-offline, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Konsep + ADR 3.21 sesuai `plan/CERITA-TAHAP-3.md` bagian 4 dan tabel ADR 29 (menyerap E2 lama) dan peta halaman Tahap 3; rekaman dari `labs/t3-offline`; widget tebak; ADR 29 dengan opsi key 7 hari semua endpoint, last-write-wins, CRDT, queue pembayaran offline; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Halaman lama E2 dilebur ke sini. Bukan ★ di naskah. Selesai 2026-10-27 di PR #393 (keputusan 1080–1083): offline-first.mdx, ADR 29 lima opsi, E2 dilebur, tab enam stack mobile, penjaga EXPECT unit demi unit; peninjau memperbaiki hari Jumat dan Sabtu, 409 mencatat konflik, dan atribusi dokumentasi.

### 3.22 · M25: Kotak peringatan di riwayat Ani

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.21, lab-t3-dasbor, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Masalah 3.22 sesuai `plan/CERITA-TAHAP-3.md` bagian 4 (M25) dan peta halaman Tahap 3; rekaman dari `labs/t3-dasbor`; widget cari-bug; Dimas hanya mencoba, catatan di `jurnal.keterangan` tinggal selamanya (append-only), perbaikannya di output; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: - Selesai 2026-10-27 di PR #397 (keputusan 1084–1087): m25-kotak-peringatan.mdx dari xss.txt A, D, E dan skema.txt D, widget cari-bug t3-m25-caribug, penjaga; peninjau mempersempit klaim query dasbor (batas 20 baris) dan mengunci gerbang CSRF serta definisi glosarium XSS (11 mutasi yang lolos dibunuh).

### 3.23 · Keamanan 5: XSS, CSRF, cookie sesi, passkey + ADR 30

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.22, lab-t3-dasbor, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Keamanan + ADR 3.23 sesuai `plan/CERITA-TAHAP-3.md` bagian 4 dan tabel ADR 30 dan peta halaman Tahap 3; rekaman dari `labs/t3-dasbor`; widget banding; ADR 30 dengan opsi escape manual saja, CSP saja, token di `localStorage`; passkey berlabel Tidak dijalankan bila authenticator virtual tidak terbukti (R3-20); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: - Selesai 2026-10-27 di PR #399 (keputusan 1088–1091): xss-csrf-cookie.mdx (Keamanan 5, ADR 30, kasus GitHub CSP journey), tab enam stack, penjaga 51 tes + BENTUK_MDX; peninjau meluruskan klaim token CSRF dan HttpOnly menahan, lingkup CSP, atribusi nonce, kata Passkey (WebAuthn L3 DEPRECATED), penjaga bolong baris kosong.

### 3.24 · M26: Transfer yang tidak dibuat Budi

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.23, lab-t3-mitm, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Masalah 3.24 sesuai `plan/CERITA-TAHAP-3.md` bagian 4 (M26) dan peta halaman Tahap 3; rekaman dari `labs/t3-mitm`; widget alur; flag "terima sertifikat apa pun" di build staging yang ikut ke rilis; uji lapangan dengan akun uji; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: - Selesai 2026-10-27 di PR #400 (keputusan 1092–1095): m26-transfer-bukan-budi.mdx, alur t3-m26, penjaga 44 tes; peninjau meluruskan lingkup sertifikat dan CA Dimas, token berakhir lewat logout dan ganti password, janji ke 3.25, rekaman memakai curl ke api-t3 tanpa tepi TLS, dan mengunci bentuk baris MDX.

### 3.25 · Keamanan 6: TLS, HSTS, pinning + ADR 31

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.24, lab-t3-mitm, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Keamanan + ADR 3.25 sesuai `plan/CERITA-TAHAP-3.md` bagian 4 dan tabel ADR 31 dan peta halaman Tahap 3; rekaman dari `labs/t3-mitm`; widget tebak; ADR 31 dengan opsi tanpa pinning, pin sertifikat daun (200 hari), pin CA; hasil dio#2418 dari lab menentukan mekanisme di Dart; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: - Selesai 2026-10-27 di PR #403 (keputusan 1096–1099): tls-pinning.mdx (Keamanan 6, ADR 31 opsi D: pin SPKI + 1 cadangan di connectionFactory), penjaga 763/763 mutasi; peninjau meluruskan atribusi Android/OkHttp, klaim rantai CA di dokumentasi Dart, HSTS hanya di tepi lab, batas pin (perangkat dikuasai penyerang).

### 3.26 · M27: Hari promo, notifikasi uang terlambat

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.25, W3-outbox, lab-t3-outbox, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Masalah 3.26 sesuai `plan/CERITA-TAHAP-3.md` bagian 4 (M27) dan peta halaman Tahap 3; rekaman dari `labs/t3-outbox`; widget W3-outbox dalam mode queue dengan dan tanpa kelas; kapasitas worker c ÷ t dan umur notifikasi tertua; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: ADR 32 memperbarui ADR 23: halaman menautkan 3.9. Selesai 2026-10-27 di PR #404 (keputusan 1100–1103): m27-hari-promo.mdx, widget OutboxWorker antrean, penjaga 49 tes; peninjau memperbaiki teks widget ('satu urutan waktu' padahal ORDER BY id) dan gejala salah arah; 481 mutan.

### 3.27 · Tim dan infra Tahap 3: staging, pipeline, alert, on-call + ADR 32

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.26, lab-api-t3, lab-t3-outbox, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Tim dan infra 3.27 sesuai `plan/CERITA-TAHAP-3.md` bagian 4, tabel ADR 32, dan daftar isi halaman 3.27 di bawah tabel ADR dan peta halaman Tahap 3; rekaman dari `labs/api-t3` dan `labs/t3-outbox`; widget pilah; isi mengikuti PROPOSAL "Pipeline backend per tahap" dan "Pipeline app Flutter per tahap"; required reviewers dan plan pemilik berlabel [perlu verifikasi] (R3-15); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Pecah menjadi dua halaman bila lebih dari 10 menit baca (SETELAH-TAHAP-3); ambang alert adalah Asumsi sampai ada rekaman. Selesai 2026-10-27 di PR #406 (keputusan 1104–1107): tim-infra.mdx (ADR 32: kolom kelas, alert umur uang tertua, staging, giliran jaga), widget pilah; peninjau meluruskan klaim 'umur tak melewati ambang' (jeda retry acak), ambang vs PRD 95%, baris 3.7; halaman 17 menit baca.

### 3.28 · M28: Uji coba enam kota lolos, PRD v4 datang

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.27, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Masalah 3.28 sesuai `plan/CERITA-TAHAP-3.md` bagian 4 (M28) dan peta halaman Tahap 3; tanpa lab; widget kalkulator; puncak 17,4 request per detik berlabel Asumsi, PRD v4 sebagai pemicu seperti M17; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: - Selesai 2026-10-28 di PR #408 (keputusan 1108–1111): m28-prd-v4.mdx, kalkulator tiga skenario, tabel sepuluh masalah M18–M27; peninjau meluruskan '0,87' dua arti, 'satu-satunya panggilan keluar', 'dua dari sepuluh' (tiga); ±800 mutan.

### 3.29 · Estimasi Tahap 3 → 4

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.28, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Konsep 3.29 sesuai `plan/CERITA-TAHAP-3.md` bagian 4 dan 5 dan peta halaman Tahap 3; tanpa lab; widget kalkulator dengan asumsi Tahap 3 dan 4 dari registry; hitungan ditulis rumusnya; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Registry `tahap[3].asumsi` (Tahap 4) masih versi lama; `T4-siap` memperbaruinya, halaman ini memakai angka naskah Tahap 4 bila sudah ada. Selesai 2026-10-27 di PR #407 (keputusan 1112–1115): estimasi.mdx tanpa lab, kalkulator; peninjau meluruskan ambang client dua pool 5 = 13,8 detik (bukan 15,5), klaim negatif lawan beban.txt, pemakaian worker pada 12/detik = 63% dan 80%.

### 3.30 · ADR 33: Sengaja belum dilakukan

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.29, KONSISTENSI-3, DIRI-2
- selesai bila: halaman ADR 3.30 sesuai `plan/CERITA-TAHAP-3.md` tabel ADR 33 dan peta halaman Tahap 3; tanpa lab; tanpa microservices, Kubernetes dan canary, read replica, PgBouncer, CDC, VPS kedua, cache saldo dan riwayat, pembayaran offline; masing-masing dengan angka tahap ini dan pemicunya; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: - Selesai 2026-10-28 di PR #411 (keputusan 1116–1119): sengaja-belum.mdx (ADR 33 opsi C, delapan yang ditunda), kasus Segment 2018; peninjau meluruskan pembeda cache katalog vs saldo (uang), pemicu CDC 'terus-menerus', klaim load test berlingkup, '62 jam' = tiga permintaan Rp63.000; 1.357 mutan.

### 3.31 · Yang dibawa keluar dari Tahap 3

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.30, KONSISTENSI-3, DIRI-2
- selesai bila: halaman Konsep 3.31 sesuai `plan/CERITA-TAHAP-3.md` bagian 5 dan peta halaman Tahap 3; tanpa lab; widget kartu; tiga belas konsep dengan satu kalimat dan kejadiannya dari tabel naskah bagian 5; Cek diri gabungan; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: - Selesai 2026-10-28 di PR #413 (keputusan 1120–1123): rekap.mdx (13 kalimat naskah, empat dipersempit), kartu rekap; peninjau meluruskan label '62 jam/17 jam', premis Cek diri 4, kartu 2; penjaga dengan dan tanpa kunci baris.

### 3.32 · Jembatan: pratinjau PRD v4

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 3.31, KONSISTENSI-3, DIRI-2
- selesai bila: halaman PRD 3.32 sesuai `plan/CERITA-TAHAP-3.md` bagian 6 dan peta halaman Tahap 3; tanpa lab; widget tebak (dari ADR Tahap 3, mana yang pecah lebih dulu?); PRD v4 enam butir; "uang elektronik publik" tanpa klaim izin atau regulasi; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Jawaban tebakan dibuka di halaman pertama Tahap 4. Selesai 2026-10-28 di PR #414 (keputusan 1124–1127): jembatan-prd-v4.mdx (tebakan pola 2.33: ADR 22, 25, 26, 32 pecah lebih dulu, Asumsi), glosarium Gateway pembayaran dan Merchant; peninjau meluruskan ADR 23, janji 'Tahap 4 membacanya satu per satu', 'dijalankan tim empat orang'; ±2.100 mutan. Tahap 3 selesai ditulis.

### EVAL-3 · Evaluasi Tahap 3

- jenis: crosscheck
- status: selesai
- percobaan: 0
- bergantung: 3.32
- selesai bila: `plan/EVALUASI-TAHAP-3.md` sesuai skill evaluasi-tahap oleh subagent yang tidak menulis halaman Tahap 3: kartu W1–W8 dengan satu baris bukti yang bisa diulang, tiga pertanyaan pembaca di tiga halaman acak (seed 3), uji baca oleh subagent segar (5 hal membingungkan). Ada TIDAK: paling banyak 3 tugas perbaikan disisipkan tepat sesudah tugas ini, lalu `EVAL-3-ulang` sekali; sisa TIDAK dan 5 hal membingungkan ke `plan/TINJAUAN-PEMILIK.md`.
- catatan: W1–W4 wajib YA. Sesudah evaluasi ulang tahap dinyatakan selesai apa pun hasilnya. Selesai 2026-10-28 di PR #418 (keputusan 1128–1131): plan/EVALUASI-TAHAP-3.md; W1, W2, W4, W6, W7, W8 YA; W3 TIDAK (3.16 definisi di Gejala; alat baru eval_tahap.py gejala) dan W5 TIDAK (7 dari 30 halaman Coba bukan 'tebak lalu ubah satu hal' menurut huruf skill); pembaca segar: lima hal membingungkan (kosakata sebelum arti di 3.9 dan 3.24); tugas perbaikan EVAL3-F1; sisanya ke TINJAUAN-PEMILIK bagian Tahap 3.

### EVAL3-F1 · Blok Gejala 3.16 tanpa definisi di adegan

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: EVAL-3
- selesai bila: kalimat 'Pemeriksaan password adalah saat server membandingkan password dengan hash yang tersimpan.' tidak ada di blok Gejala `situs/src/content/docs/tahap-3/m22-batas-login-dua-kali.mdx`; `python3 tools/eval_tahap.py gejala 3` exit 0; definisi pindah ke 'Yang sebenarnya'; penjaga halaman diberi kasus mutasi; kartu.json dan turunan sinkron.
- catatan: Dari EVAL-3 (keputusan 1130), kategori rusak. Selesai 2026-10-29 di PR #421 (keputusan 1132–1134): definisi satu kalimat pindah ke kalimat Inti 'Yang sebenarnya'; adegan '20 dari 24 percobaan sampai diperiksa passwordnya' (cocok batas.txt A: 401 20, 429 4); penjaga 42 → 52 tes; mutasi 53/53 terarah dan 309/309 otomatis dengan dan tanpa kunci baris.

### EVAL-3-ulang · Evaluasi ulang Tahap 3

- jenis: crosscheck
- status: selesai
- percobaan: 1
- bergantung: EVAL3-F1
- selesai bila: subagent yang bukan penulis halaman Tahap 3 dan bukan pelaksana EVAL3-F1 menambah bagian 'Putaran 2' ke `plan/EVALUASI-TAHAP-3.md` dengan seed 3 yang sama: W3 (gejala 3, audit bahasa), W8 (rantai Berikutnya 3.1–3.32), W4 (ukur-axe 3.16 dan seluruh Tahap 3), W5 dinilai ulang; tahap dinyatakan selesai.
- catatan: Selesai 2026-10-29 di PR #422 (keputusan 1135–1136): W1–W4 dan W6–W8 YA, W5 TIDAK; Tahap 3 dinyatakan selesai. Lab, ERD, dan uji baca segar tidak diulang karena `git diff --name-only c7fdcba5 HEAD -- labs situs/data/erd tools/erd.py` hanya memuat lab Tahap 4.

### DIRI-3 · Perbaikan diri sesudah Tahap 3

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: EVAL-3
- selesai bila: Satu subagent membaca `plan/EVALUASI-TAHAP-3.md` dan pelajaran MEMORI Tahap 3, lalu boleh mengubah skill gaya-bahasa, visualisasi, analisis-kritis, riset-tahap, evaluasi-tahap hanya dengan bukti dari Tahap 3, paling banyak 10 baris per skill, masing-masing dicatat sebagai keputusan dengan teks sebelum/sesudah; CLAUDE.md, PROPOSAL, dan CERITA-TAHAP-1/2 tidak disentuh (usulan ke `plan/USULAN-PERBAIKAN.md`); STATUS menulis "Tahap 3 selesai".
- catatan: Langkah penutup alur tahap.

## Tahap 4

Alur tujuh langkah (keputusan 554). Tugas lab dan halaman Tahap 4 disisipkan oleh `T4-siap` dari peta halaman naskah: lab sebelum `ERD4`, halaman sesudah widget. Nomor keputusan: 1200–1399 (konten +0–99, teknis +100–149, pengatur +150–199); 1000–1199 sudah dipakai halaman dan cadangan Tahap 3 (pengatur, 2026-10-26). Alokasi T4-siap (keputusan 1207 sampai 1209): lab k (urut antrean, 11 lab) memakai 4 nomor mulai 1210 + 4×(k−1) dan ID riset R4-300 + 5×(k−1) sampai +4; `ERD4` 1254–1257; `W4-webhook` 1258–1261; `W4-breaker` 1262–1265; halaman 4.n memakai 1266 + 4×(n−1) sampai +3 (4.31: 1386–1389) dan ID riset R4-110 + 5×(n−1) sampai +4 (4.31: R4-260 sampai R4-264); `KONSISTENSI-4` 1390–1393; cadangan 1394–1399 (`EVAL-4` 1394–1396, `DIRI-4` 1397–1399); Tahap 5 mulai 1400. Tiga nomor pertama tiap blok untuk pelaksana, yang keempat untuk peninjau. Lab, `ERD4`, dan `W4-*` tidak menunggu `DIRI-3`; setiap halaman Tahap 4 menunggu `KONSISTENSI-4` dan `DIRI-3` (skill diperbaiki sesudah Tahap 3). Aturan halaman Tahap 4 sampai 6 ada di `plan/BRIEF-HALAMAN.md`. Selesai 2026-10-29 di PR #423 (keputusan 1137–1141): kelima skill berubah ≤ 10 baris tiap skill dengan bukti PR Tahap 3 (gaya-bahasa +5, visualisasi +4, analisis-kritis +7, riset-tahap +5/−1, evaluasi-tahap +6/−1; perintah seed diperbaiki: 3.16, 3.9, 3.24, 3.31, 3.5 untuk seed 3); tiga butir brief ditolak setelah diverifikasi (ambang karakter Inti HP, berkas cek-status, aturan posisi Tebak); usulan ke plan/USULAN-PERBAIKAN.md bagian 'Dari DIRI-3'. Tahap 3 selesai.

### RISET-4 · Riset Tahap 4

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: RISET-3
- selesai bila: `plan/RISET-TAHAP-4.md` (≤ 120 baris) sesuai skill riset-tahap untuk Tahap 4 (integrasi pihak ketiga dan tiga tim, PROPOSAL "Enam tahap dalam satu tabel"): konsep dengan 1–3 sumber primer bertanggal dan ID `R4-nn`, yang berubah sejak PROPOSAL, teknik terbaru masuk/tidak, satu kasus industri nyata untuk ADR dari sumber primer, jebakan forum, angka beban dan ukuran data dihitung ulang dengan rumus PROPOSAL sebagai Asumsi; pengatur membuka tiga ID acak.
- catatan: Kerja di depan (keputusan 728): jalan di lajur riset sebelum DIRI-3; `plan/RISET-TAHAP-4.md` memakai angka tahap sebelumnya dari RINGKAS dan naskahnya. Selesai 2026-10-25 di PR #329.

### NASKAH-4 · Naskah Tahap 4 (draft otomatis)

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: RISET-4
- selesai bila: `plan/CERITA-TAHAP-4.md` dengan struktur persis CERITA-TAHAP-2 (Kenapa dokumen ini ada, Latar, Tokoh baru, 1 PRD v4, 2 Dari fitur ke pekerjaan teknis, 3 Inti teknis, 3b Skema data, 4 Masalah, 5 Yang dibawa keluar, 6 Jembatan, Peta halaman, Jalur per peran), baris pertama "Draft otomatis, belum ditinjau pemilik", memakai RISET-TAHAP-4; nomor M dan ADR melanjutkan tahap sebelumnya; peta halaman 24–32 halaman dengan kolom lab, setiap halaman masalah dipicu fitur PRD, pihak ketiga selalu tiruan lokal; peninjau konsistensi (subagent kedua) membaca naskah terhadap semua naskah sebelumnya (tokoh, nama perusahaan, angka saldo dan user, istilah glosarium, nomor ADR dan M, rantai PRD → fitur → teknis → masalah → konsep) dan semua temuannya ditutup.
- catatan: Satu-satunya naskah yang ditulis Claude; Tahap 1–2 milik pemilik dan tidak disentuh. Selesai 2026-10-26 di PR #379 (keputusan 1200–1206): 31 halaman, M29–M39, ADR 34–45, tinjauan konsistensi 54 tambalan; usulan pemangkasan peninjau diterapkan `T4-siap` (keputusan 1207).

### T4-siap · RINGKAS, registry, dan antrean Tahap 4

- jenis: interaksi
- status: selesai
- percobaan: 0
- bergantung: NASKAH-4
- selesai bila: `plan/RINGKAS.md` (≤ 60 baris) memuat peta halaman Tahap 4 satu baris per halaman dan tahap sebelumnya diringkas; registry `situs/data/cerita.json` memuat semua halaman Tahap 4 sesuai naskah (judul, jenis, bagian, ★, peran, prasyarat, lab), yang belum ditulis tampil "segera", halaman lama tahap ini menjadi `lama` bila diganti; ANTREAN mendapat tugas lab (sebelum `ERD4`) dan tugas halaman berurutan (sesudah tugas widget) dengan `selesai bila` merujuk bagian naskah; `sinkron_cerita.py`, `cek_tautan.py`, dan gerbang lolos.
- catatan: Sekaligus mengganti `bergantung` `EVAL-4` ke halaman terakhir Tahap 4 dan `ERD4` ke lab utama Tahap 4; halaman yang memakai widget bergantung pada tugas widgetnya. Selesai 2026-10-26 di PR #384 (keputusan 1207–1209): RINGKAS 58 dari 60 baris (peta Tahap 3 dilipat per kelompok, peta Tahap 4 satu baris per halaman); registry memuat 4.1–4.31 "segera", enam halaman lama dilebur, `asumsi.trx` Tahap 4 jadi 3 dan tim 13 orang; 11 tugas lab (`t4-beban` dilipat ke `api-t4`), `ERD4`, `W4-webhook`, `W4-breaker` (`W4-modul` diganti banding), `KONSISTENSI-4`, 31 tugas halaman; `plan/BRIEF-HALAMAN.md` baru.

### lab-api-t4 · Lab api-t4: api-t3 naik ke publik

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: T4-siap
- selesai bila: Lab baru `labs/api-t4` (Go, `make -C labs/api-t4 run`) berangkat dari `labs/api-t3` dan menambah semua tabel naskah bagian 3b lewat migrasi baru di atas migrasi terakhir api-t3: delapan tabel baru (`topup_bank`, `webhook_event`, `insiden_rekon`, `verifikasi`, `qr`, `kartu`, `otorisasi_kartu`, `audit_log`) dan kolom baru (`akun.tingkat`, `akun.status`, nilai jenis `pemakai`, `merchant`, dan `risk` di `akun.jenis`, `outbox.tujuan`, `produk.gambar_url`), jadi 22 tabel; kolom persis mengikuti skema lab, selisih dengan blok mermaid naskah dicatat (lab yang benar); pembagian schema per modul mengikuti tabel "Modul (schema)" bagian 3b sebagai rancangan yang dibuktikan `t4-modul`. Fitur: top-up dari bank (buat top-up di gateway tiruan dengan kunci, tujuan bayar, status menunggu sampai dibayar, webhook masuk versi pertama dan versi ADR 34 lewat mode, cek status, laporan settlement), verifikasi identitas (unggah, pekerjaan di `outbox` dengan `tujuan`, layanan verifikasi tiruan, tingkat akun dan batas saldo Rp1.000.000 dan Rp10.000.000 sebagai Asumsi produk), merchant luar dan QR, kartu virtual dan penerbit tiruan, audit log, dan endpoint back office. Versi satu proses (minggu 3 naskah): pembayaran memanggil ledger sebagai fungsi; pemisahan service ada di `t4-modul`. Jalur uang tetap satu-satunya tempat uang bergerak (ledger, ADR 6 revisi) dan tidak memanggil jaringan di dalam transaction (ADR 22); Idempotency-Key ke ledger `order_id` (top-up) dan `id_penerbit` (otorisasi). Mode rentan seperti `api-t3` (handler webhook versi pertama untuk M29, unduh gambar rentan untuk M36, otorisasi tanpa hold untuk M37) supaya lab turunan berbagi lab ini. Batas laju untuk endpoint publik baru (daftar, verifikasi, top-up) dan untuk `/perangkat`, `/pesanan`, `/promo`, `/sinkron` yang belum punya (README api-t3, "Yang belum ada di lab ini"). Target `make beban` (melipat lab `t4-beban`, keputusan 1207): generator beban berjadwal kedatangan tetap 138,9 request per detik (20.000 aktif × 60 ÷ 86.400 × 10), merekam koneksi terpakai (`pg_stat_activity`) terhadap pool dan p95 sebagai batas, bukan nilai tunggal, dan kapasitas worker 4 ÷ 0,3 detik = 13,3 per detik terukur dalam 15%; pengumuman ke 100.000 HP diskalakan lalu diekstrapolasi, bukan dijalankan; kapasitas produksi tidak diklaim. Rekaman minimal: top-up bank (alur normal dan gateway gagal), verifikasi sampai tingkat akun naik, batas laju, dan beban. Tes Go untuk aturan uang, outbox, dan tingkat verifikasi dari PostgreSQL; kontrak OpenAPI v4 untuk endpoint baru (sumber `t4-pipeline`). Aturan lab (`plan/BRIEF-HALAMAN.md` bagian Tugas lab dan widget): schema sendiri di PostgreSQL bersama, `make -C labs/api-t4 run`, gagal keras bila hasil berbeda dari pernyataan naskah (bila lab membantah naskah, naskah yang berubah lewat KONSISTENSI-4 dan halaman memakai rekaman); rekaman `output/*.txt` dari database bersih, diulang identik (status, saldo, urutan; angka mesin sebagai batas yang diperiksa; kepala rekaman menulis versi alat); port dan nama kontainer lewat `labs/lab_env.*` (keputusan 860–864), tanpa 54333 tertulis tetap (`tools/cek_port_lab.py`); pihak ketiga tiruan lokal di container; uji mutasi atas kode uang dan keamanan (tes atau lab gagal karena sebab yang diuji, bukan koneksi mati); klaim dari dokumentasi diberi versi dan tanggal, dan yang tidak terbukti ditulis Tidak dijalankan atau [perlu verifikasi] di README dan rekaman.
- catatan: Jalur lab. Sumber `ERD4`, `lab-t4-*`, dan halaman 4.3, 4.5, 4.26, 4.27, 4.28. Versi dasar R4-01 (PostgreSQL 17.11, Go 1.27.3, pgx v5.11.0, Redis pin Tahap 3 8.10.2 lawan 8.10.3 terbaru menurut tinjauan PR #379) dicek ulang saat lab ditulis. Lab lama `b10-2-webhook`, `b11-integrasi`, `b11-2-proxy`, `b7-2-modul`, `b5-2-oidc` hanya bahan (skema lama), bukan dasar angka. Pembagian schema per modul (6 schema) bentuk akhirnya ditetapkan `t4-modul`; bila berbeda, tulis selisihnya di badan PR dan KONSISTENSI-4 menyelaraskan naskah dan `ERD4`. ALOKASI: keputusan 1210–1213 (1210–1212 pelaksana, 1213 peninjau), ID riset R4-300 sampai R4-304. Selesai 2026-10-27 di PR #392 (keputusan 1210–1213): labs/api-t4 22 tabel, webhook ADR 34 tiga lapis, verifikasi, merchant+QR, kartu, audit berantai, make beban; peninjau memperbaiki deadlock jalur kartu (urutan lock) dan flake pg_stat_activity.

### lab-t4-webhook · Lab t4-webhook: gateway tiruan, webhook ganda, dan rekonsiliasi

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: lab-api-t4
- selesai bila: Lab `labs/t4-webhook` di atas `api-t4`: gateway tiruan di container yang mengirim webhook ganda, terlambat, tidak berurutan, palsu, dan hilang, dengan tanda tangan HMAC-SHA256 atas byte mentah. Direkam: (a) kiriman yang sama dua kali menghasilkan dua jurnal pada handler versi pertama dan satu jurnal pada versi ADR 34; (b) dua kiriman bersamaan lolos cek-lalu-tulis (jeda buatan di antara cek dan tulis supaya celah terekam) dan hanya kunci utama `webhook_event.event_id` yang menahannya; (c) tanda tangan atas body yang diurai ulang gagal pada isi yang sah dan lolos atas byte mentah; isi yang diubah dan timestamp lama (toleransi 5 menit, Asumsi untuk tiruan) ditolak; (d) secret lama menolak kiriman bertanda secret baru (401), dan masa tumpang tindih menerimanya; (e) jadwal retry tiruan 2, 10, 30, 90, 210 menit (total 342 menit) diskalakan, waktu diperankan dan bukan ditunggu, berhenti sesudah kiriman ke-6; jadwal per kode status (2xx tanpa ulangan, 400 dan 404 dua kali, 500 sekali, 503 empat kali, lainnya lima kali) menurut dokumentasi satu gateway nyata (R4-08); (f) kabar `menunggu` yang datang sesudah `dibayar` tidak memundurkan status; kabar yang datang mundur diparkir dan dicek ke gateway di luar transaction; (g) dua Event berbeda untuk satu kejadian tidak menjurnal dua kali karena Idempotency-Key ke ledger `order_id`; key habis sesudah 24 jam dan hanya status `topup_bank` yang menahan jurnal kedua; (h) cek status untuk top-up `menunggu` lebih dari 30 menit dan rekonsiliasi harian menemukan tiga jenis selisih (`tidak_di_ledger`, `tidak_di_gateway`, `jumlah_beda`) sebagai `insiden_rekon`, dikoreksi lewat jurnal normal oleh job idempoten (ADR 19), bukan UPDATE pada posting atau `buku.saldo_cache`; (i) tiga gaya tanda tangan sebagai pembanding (HMAC atas timestamp dan body, SHA-512 atas field tertentu, token statis; SETELAH-TAHAP-4). Pembanding ADR 34 bila murah: koneksi terpakai pada 3,47 kiriman per detik dengan W = 5 detik (L = 17,4 melewati pool 10), kalau tidak berlabel Hitungan. Lab ini berbagi `labs/api-t4` lewat mode rentan (pola api-t1 dan api-t3), bukan salinan; sebelum mengubah api-t4 cek flag terhadap PR terbuka lain dan jalankan ulang `make cek` lab yang berbagi (peninjau menjalankannya lagi). Aturan lab (`plan/BRIEF-HALAMAN.md` bagian Tugas lab dan widget): schema sendiri di PostgreSQL bersama, `make -C labs/t4-webhook run`, gagal keras bila hasil berbeda dari pernyataan naskah (bila lab membantah naskah, naskah yang berubah lewat KONSISTENSI-4 dan halaman memakai rekaman); rekaman `output/*.txt` dari database bersih, diulang identik (status, saldo, urutan; angka mesin sebagai batas yang diperiksa; kepala rekaman menulis versi alat); port dan nama kontainer lewat `labs/lab_env.*` (keputusan 860–864), tanpa 54333 tertulis tetap (`tools/cek_port_lab.py`); pihak ketiga tiruan lokal di container; uji mutasi atas kode uang dan keamanan (tes atau lab gagal karena sebab yang diuji, bukan koneksi mati); klaim dari dokumentasi diberi versi dan tanggal, dan yang tidak terbukti ditulis Tidak dijalankan atau [perlu verifikasi] di README dan rekaman.
- catatan: Jalur lab. Sumber W4-webhook dan halaman 4.4, 4.6, 4.7, 4.8, 4.9. Baris `t4-webhook` di tabel "Yang harus bisa dibuktikan lab" naskah adalah isi minimal; bila lab membantah satu pernyataan, M29 dan M30 diubah mengikuti rekaman. Gateway nyata hanya rujukan dokumentasi (R4-08), tanpa merek di halaman. ALOKASI: keputusan 1214–1217 (1214–1216 pelaksana, 1217 peninjau), ID riset R4-305 sampai R4-309. Selesai 2026-10-27 di PR #396 (keputusan 1214–1217): labs/t4-webhook (ganda, tanda tangan, retry, urutan, rekon, testing); peninjau memperbaiki batas 30 menit job cek status (29 lawan 31), ADR 22 job koreksi, enam tes jalur uang; batas baru: sesudah jurnal pembalik topup_bank.status tetap dibayar.

### lab-t4-integrasi · Lab t4-integrasi: layanan verifikasi tiruan, retry, breaker, dan lajur queue

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: lab-api-t4
- selesai bila: Lab `labs/t4-integrasi` di atas `api-t4`: layanan verifikasi tiruan yang mati, lambat, dan setengah menjawab. Direkam: (a) vendor mati: lima percobaan lalu dead-letter (ADR 25) menghabiskan semua pekerjaan sebelum vendor pulih, sedangkan dengan lajur per `tujuan` dan breaker pekerjaan menunggu dan selesai sesudah pulih (jam diperankan, bukan ditunggu 3 jam 30 menit); (b) retry dengan Idempotency-Key tidak membuat dua objek di vendor tiruan; (c) timeout menghasilkan status `tidak_pasti`, bukan gagal; (d) breaker `sony/gobreaker` v2.4.0 bawaan membuka sesudah lebih dari 5 gagal berturut-turut (Timeout 60 detik, satu permintaan di half-open) dan menghitung 4xx sebagai gagal (dokumentasi pkg.go.dev v2.4.0 dibuka 2026-10-26: `IsSuccessful` bawaan menganggap semua error non-nil gagal; lab membuktikan perilakunya), sedangkan `IsSuccessful` kustom menghitung 4xx sebagai sukses; (e) lajur queue yang dijeda tidak menaikkan hitungan percobaan (ADR 25 dan ADR 36), dan pekerjaan uang tidak ikut tertahan di belakang pekerjaan verifikasi; (f) pemakaian worker diukur lawan hitungan naskah: 0,116 verifikasi per detik × 5 percobaan × 3 detik = 1,74 dari 4 worker, dan 4,0 dari 4 bersama notifikasi uang (Hitungan, Asumsi; lab memberi c dan t terukur). Satu fungsi pembuat client (timeout 3 detik, ADR 22) dipakai semua panggilan keluar. Lab ini berbagi `labs/api-t4` lewat mode rentan (pola api-t1 dan api-t3), bukan salinan; sebelum mengubah api-t4 cek flag terhadap PR terbuka lain dan jalankan ulang `make cek` lab yang berbagi (peninjau menjalankannya lagi). Aturan lab (`plan/BRIEF-HALAMAN.md` bagian Tugas lab dan widget): schema sendiri di PostgreSQL bersama, `make -C labs/t4-integrasi run`, gagal keras bila hasil berbeda dari pernyataan naskah (bila lab membantah naskah, naskah yang berubah lewat KONSISTENSI-4 dan halaman memakai rekaman); rekaman `output/*.txt` dari database bersih, diulang identik (status, saldo, urutan; angka mesin sebagai batas yang diperiksa; kepala rekaman menulis versi alat); port dan nama kontainer lewat `labs/lab_env.*` (keputusan 860–864), tanpa 54333 tertulis tetap (`tools/cek_port_lab.py`); pihak ketiga tiruan lokal di container; uji mutasi atas kode uang dan keamanan (tes atau lab gagal karena sebab yang diuji, bukan koneksi mati); klaim dari dokumentasi diberi versi dan tanggal, dan yang tidak terbukti ditulis Tidak dijalankan atau [perlu verifikasi] di README dan rekaman.
- catatan: Jalur lab. Sumber W4-breaker dan halaman 4.10, 4.11. `b11-integrasi` hanya bahan (SETELAH-TAHAP-4: gateway tanpa timeout, breaker, antrean per gateway). Versi gobreaker dicek ulang (`proxy.golang.org @latest` = v2.4.0, repositori tanpa GitHub Release, hanya tag). ALOKASI: keputusan 1218–1221 (1218–1220 pelaksana, 1221 peninjau), ID riset R4-310 sampai R4-314. Selesai 2026-10-27 di PR #398 (keputusan 1218–1221): labs/t4-integrasi (lajur per tujuan, retry, breaker gobreaker v2.4.0, worker); peninjau memperbaiki rekaman worker B yang tak deterministik (jitter), klaim breaker, dan mencatat celah probe half-open (sampai 42 dari 146 pekerjaan mati).

### lab-t4-modul · Lab t4-modul: batas modul, schema dan role, dan service pembayaran

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: lab-api-t4, lab-t4-webhook
- selesai bila: Lab `labs/t4-modul` di atas `api-t4`: batas modul `ledger`, `akun`, `identitas`, `merchant`, `pembayaran`, `platform`, schema dan role database per modul (`REVOKE CREATE ON SCHEMA public FROM PUBLIC`, R4-03), paket `internal/` Go yang memaksa batas impor di compiler (R4-02), dan service pembayaran terpisah yang meminta jurnal lewat API ledger dengan Idempotency-Key. Direkam: (a) perubahan nama kolom lintas modul (`akun.nama` menjadi `akun.nama_tampil`, M32) gagal di CI sebagai compile error atau `permission denied`, bukan di produksi, dan lolos pada versi tanpa batas; (b) dua panggilan pembayaran ke ledger dengan Idempotency-Key yang sama menghasilkan satu jurnal, juga bila satu datang dari jalur webhook dan satu dari job cek status (key `order_id`); (c) proses pembayaran yang dimatikan sesudah ledger menjurnal dan sebelum `topup_bank` ditandai `dibayar` menghasilkan satu jurnal sesudah kiriman ulang; (d) tambahan latensi HTTP internal terukur sebagai batas (anggaran untuk ADR 37 "kapan salah"); (e) CODEOWNERS dan review wajib Tidak dijalankan di lab (pola terakhir menang menurut dokumentasi, R4-04; review wajib bergantung plan repositori, [perlu verifikasi: plan pemilik]); halaman memakai dokumentasi dan checklist PR sebagai cadangan. Bentuk akhir pembagian modul dan schema ditetapkan di sini; selisih dengan tabel "Modul (schema)" bagian 3b ditulis di badan PR. Lab ini berbagi `labs/api-t4` lewat mode rentan (pola api-t1 dan api-t3), bukan salinan; sebelum mengubah api-t4 cek flag terhadap PR terbuka lain dan jalankan ulang `make cek` lab yang berbagi (peninjau menjalankannya lagi). Aturan lab (`plan/BRIEF-HALAMAN.md` bagian Tugas lab dan widget): schema sendiri di PostgreSQL bersama, `make -C labs/t4-modul run`, gagal keras bila hasil berbeda dari pernyataan naskah (bila lab membantah naskah, naskah yang berubah lewat KONSISTENSI-4 dan halaman memakai rekaman); rekaman `output/*.txt` dari database bersih, diulang identik (status, saldo, urutan; angka mesin sebagai batas yang diperiksa; kepala rekaman menulis versi alat); port dan nama kontainer lewat `labs/lab_env.*` (keputusan 860–864), tanpa 54333 tertulis tetap (`tools/cek_port_lab.py`); pihak ketiga tiruan lokal di container; uji mutasi atas kode uang dan keamanan (tes atau lab gagal karena sebab yang diuji, bukan koneksi mati); klaim dari dokumentasi diberi versi dan tanggal, dan yang tidak terbukti ditulis Tidak dijalankan atau [perlu verifikasi] di README dan rekaman.
- catatan: Jalur lab. Sumber halaman 4.12, 4.13 (dan 4.5 untuk pembagian schema). `b7-2-modul` hanya bahan. Bila bentuk akhir berbeda dari 3b dan `ERD4` sudah selesai, KONSISTENSI-4 menyelaraskan naskah dan menjalankan ulang `tools/erd.py`. ALOKASI: keputusan 1222–1225 (1222–1224 pelaksana, 1225 peninjau), ID riset R4-315 sampai R4-319. Selesai 2026-10-27 di PR #401 (keputusan 1222–1225): labs/t4-modul (enam schema t4m_* 22 tabel, role per modul, internal/ Go, service pembayaran terpisah, API ledger); peninjau menemukan tes yang tak dijalankan gerbang, RekonHarian tak melihat jurnal kedua sesudah key habis, matriks hak 50 baris ACL.

### lab-t4-storage · Lab t4-storage: file di bytea lawan object storage dan presigned URL

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: lab-api-t4
- selesai bila: Lab `labs/t4-storage` di atas `api-t4`: SeaweedFS 4.51 (endpoint S3 lokal; versi dicek ulang saat lab ditulis) atau, bila presign tidak didukung, tiruan Go yang disebut terang. Direkam: (a) dump dan pulih membesar sebanding dengan ukuran file di `bytea` (rasio ukuran; waktu hanya batas), lawan file di penyimpanan objek yang menyisakan kunci dan checksum di database (28 hari × 1 GB, Hitungan, Asumsi); (b) presigned URL dipakai ulang oleh pemegang lain sampai kedaluwarsa dan ditolak sesudahnya; PUT ke kunci yang sama menimpa; kedaluwarsa dan batas ukuran di SeaweedFS [perlu verifikasi]; (c) unduh lewat server memeriksa peran dan menulis `audit_log`; (d) checksum tidak cocok membuat file ditolak, dan ukuran diperiksa sesudah unggah; (e) retensi 30 hari (Asumsi produk, [perlu verifikasi]) oleh job idempoten bila murah; nomor identitas tidak masuk log. Lab ini berbagi `labs/api-t4` lewat mode rentan (pola api-t1 dan api-t3), bukan salinan; sebelum mengubah api-t4 cek flag terhadap PR terbuka lain dan jalankan ulang `make cek` lab yang berbagi (peninjau menjalankannya lagi). Aturan lab (`plan/BRIEF-HALAMAN.md` bagian Tugas lab dan widget): schema sendiri di PostgreSQL bersama, `make -C labs/t4-storage run`, gagal keras bila hasil berbeda dari pernyataan naskah (bila lab membantah naskah, naskah yang berubah lewat KONSISTENSI-4 dan halaman memakai rekaman); rekaman `output/*.txt` dari database bersih, diulang identik (status, saldo, urutan; angka mesin sebagai batas yang diperiksa; kepala rekaman menulis versi alat); port dan nama kontainer lewat `labs/lab_env.*` (keputusan 860–864), tanpa 54333 tertulis tetap (`tools/cek_port_lab.py`); pihak ketiga tiruan lokal di container; uji mutasi atas kode uang dan keamanan (tes atau lab gagal karena sebab yang diuji, bukan koneksi mati); klaim dari dokumentasi diberi versi dan tanggal, dan yang tidak terbukti ditulis Tidak dijalankan atau [perlu verifikasi] di README dan rekaman.
- catatan: Jalur lab. Sumber halaman 4.14, 4.15. Bila SeaweedFS gagal diunduh atau tidak mendukung presign, lab memakai tiruan Go dan menulis Tidak dijalankan untuk perilaku SeaweedFS. ALOKASI: keputusan 1226–1229 (1226–1228 pelaksana, 1229 peninjau), ID riset R4-320 sampai R4-324. Selesai 2026-10-28 di PR #405 (keputusan 1226–1229): labs/t4-storage (SeaweedFS 4.51, SigV4 stdlib, presign, retensi); peninjau menemukan kunci unggahan berbentuk salah yang menghapus file sah (500) dan batas baca di bukaObjek.

### lab-t4-infra · Lab t4-infra: proxy keluar bertetap, OpenBao mode dev, dan OpenTofu

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: lab-api-t4
- selesai bila: Lab `labs/t4-infra` (keputusan 1207: OpenTofu memakai provider `random` dan `local`, bukan provider Docker): proxy keluar bertetap, OpenBao mode dev (v2.7.1), dan OpenTofu (v1.13.2); versi dicek ulang saat lab ditulis. Direkam: (a) permintaan keluar lewat proxy bertetap datang dari satu alamat, sedangkan tanpa proxy alamatnya berubah di tiap pindahan (pindahan diperankan dua container dengan alamat berbeda); layanan verifikasi tiruan yang hanya menerima alamat terdaftar menolak 403 pada alamat baru (M34); (b) state OpenTofu memuat nilai secret bila ditulis di konfigurasi (`random_password` atau variabel) dan tidak bila dibaca dari secret manager saat runtime [perlu verifikasi]; (c) rotasi secret di OpenBao terbaca service tanpa deploy, dengan masa tumpang tindih; cara OpenBao mode dev berjalan di lab [perlu verifikasi]; (d) secret staging dan produksi terpisah: kunci produksi yang ada di staging dideteksi (Ilustrasi bila tidak direkam). Tidak dijalankan dan ditulis begitu di README: hosting terkelola, NAT cloud, failover PostgreSQL terkelola, provider Docker atau cloud, Terraform v1.17.0 dan Vault v2.2.1 (lisensi BSL, hanya dibandingkan). Aturan lab (`plan/BRIEF-HALAMAN.md` bagian Tugas lab dan widget): schema sendiri di PostgreSQL bersama, `make -C labs/t4-infra run`, gagal keras bila hasil berbeda dari pernyataan naskah (bila lab membantah naskah, naskah yang berubah lewat KONSISTENSI-4 dan halaman memakai rekaman); rekaman `output/*.txt` dari database bersih, diulang identik (status, saldo, urutan; angka mesin sebagai batas yang diperiksa; kepala rekaman menulis versi alat); port dan nama kontainer lewat `labs/lab_env.*` (keputusan 860–864), tanpa 54333 tertulis tetap (`tools/cek_port_lab.py`); pihak ketiga tiruan lokal di container; uji mutasi atas kode uang dan keamanan (tes atau lab gagal karena sebab yang diuji, bukan koneksi mati); klaim dari dokumentasi diberi versi dan tanggal, dan yang tidak terbukti ditulis Tidak dijalankan atau [perlu verifikasi] di README dan rekaman.
- catatan: Jalur lab. Sumber halaman 4.16, 4.17. Pemangkasan tugas ini ada di keputusan 1207 (usulan peninjau PR #379). ALOKASI: keputusan 1230–1233 (1230–1232 pelaksana, 1233 peninjau), ID riset R4-325 sampai R4-329. Selesai 2026-10-28 di PR #409 (keputusan 1230–1233): labs/t4-infra (OpenBao v2.7.2, OpenTofu v1.13.2, proxy keluar, state, rotasi); peninjau menemukan pemindai gagal terbuka (baris > 1 MiB) dan versi lama KV v2 masih terbaca sesudah tumpang tindih; tanda tangan GPG checksum diperiksa.

### lab-t4-qr · Lab t4-qr: payload QR, CRC, dan QR statis lawan dinamis

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: lab-api-t4
- selesai bila: Lab `labs/t4-qr` (Go murni, kecil dan murah) di atas `api-t4`: payload QR bergaya EMV dengan tag 01 (11 statis, 12 dinamis) dan CRC di tag 63. Direkam: (a) payload yang CRC-nya dihitung ulang untuk payload lain lolos validasi CRC (CRC bukan autentikasi); (b) QR dinamis sekali pakai: pembayaran kedua dan pembayaran sesudah kedaluwarsa (5 menit, Asumsi) ditolak, dan nominal terikat id QR; (c) QR statis milik merchant lain menghasilkan jurnal sah ke merchant itu: server tidak punya cara mencegahnya; batas Rp200.000 per transaksi QR statis (Asumsi produk) dan layar konfirmasi dengan nama dan kota merchant terverifikasi; (d) laporan QR palsu membekukan merchant lebih dulu; (e) parameter CRC memakai CRC-16 dengan polinomial 0x1021 dan nilai awal 0xFFFF, diuji lawan nilai uji sumber sekunder (0x29B1 untuk "123456789"); PDF EMVCo belum dibuka, jadi [perlu verifikasi di PDF EMVCo]. Tanpa nama skema nasional; format mengikuti standar publik. Lab ini berbagi `labs/api-t4` lewat mode rentan (pola api-t1 dan api-t3), bukan salinan; sebelum mengubah api-t4 cek flag terhadap PR terbuka lain dan jalankan ulang `make cek` lab yang berbagi (peninjau menjalankannya lagi). Aturan lab (`plan/BRIEF-HALAMAN.md` bagian Tugas lab dan widget): schema sendiri di PostgreSQL bersama, `make -C labs/t4-qr run`, gagal keras bila hasil berbeda dari pernyataan naskah (bila lab membantah naskah, naskah yang berubah lewat KONSISTENSI-4 dan halaman memakai rekaman); rekaman `output/*.txt` dari database bersih, diulang identik (status, saldo, urutan; angka mesin sebagai batas yang diperiksa; kepala rekaman menulis versi alat); port dan nama kontainer lewat `labs/lab_env.*` (keputusan 860–864), tanpa 54333 tertulis tetap (`tools/cek_port_lab.py`); pihak ketiga tiruan lokal di container; uji mutasi atas kode uang dan keamanan (tes atau lab gagal karena sebab yang diuji, bukan koneksi mati); klaim dari dokumentasi diberi versi dan tanggal, dan yang tidak terbukti ditulis Tidak dijalankan atau [perlu verifikasi] di README dan rekaman.
- catatan: Jalur lab. Sumber halaman 4.18, 4.19. Perilaku pembeli di layar konfirmasi tidak terukur di lab (Asumsi). ALOKASI: keputusan 1234–1237 (1234–1236 pelaksana, 1237 peninjau), ID riset R4-330 sampai R4-334. Selesai 2026-10-28 di PR #410 (keputusan 1234–1237): labs/t4-qr (CRC-16/IBM-3740, QR statis/dinamis, laporan palsu); peninjau menutup celah tes (12 dari 20 mutan payload lolos) dan merekam penolakan dua orang; aturan pelapor QR palsu = keputusan produk.

### lab-t4-ssrf · Lab t4-ssrf: fetcher gambar rentan lawan aman

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: lab-api-t4
- selesai bila: Lab `labs/t4-ssrf` di atas `api-t4`: fetcher gambar katalog dalam dua versi, rentan dan aman, dengan tujuan tiruan di jaringan container. Direkam: (a) fetcher rentan menjangkau tujuan di jaringan container (loopback, private, link-local) dan pesan kesalahannya menampilkan sebagian isi respons; (b) redirect dari alamat luar ke alamat dalam lolos pada versi rentan; (c) deny-list string pada URL dilewati bentuk alamat lain (desimal, heksadesimal, IPv4-mapped IPv6, nama yang diselesaikan ke alamat dalam); (d) fetcher dengan `Dialer.ControlContext` menolak semuanya, termasuk saat nama diselesaikan ke alamat berbeda di antara dua pemeriksaan (resolver buatan di lab); (e) hanya https, redirect dimatikan, 2 MB dan 3 detik, tipe isi dari byte, pesan kesalahan tanpa isi respons; (f) dial ke nama IDNA [perlu verifikasi: golang/go#80417]; `IP.IsPrivate` tidak cukup sendirian (golang/go#79925). Alamat metadata instance cloud dan IMDSv2 Tidak dijalankan (R4-14). Lab ini berbagi `labs/api-t4` lewat mode rentan (pola api-t1 dan api-t3), bukan salinan; sebelum mengubah api-t4 cek flag terhadap PR terbuka lain dan jalankan ulang `make cek` lab yang berbagi (peninjau menjalankannya lagi). Aturan lab (`plan/BRIEF-HALAMAN.md` bagian Tugas lab dan widget): schema sendiri di PostgreSQL bersama, `make -C labs/t4-ssrf run`, gagal keras bila hasil berbeda dari pernyataan naskah (bila lab membantah naskah, naskah yang berubah lewat KONSISTENSI-4 dan halaman memakai rekaman); rekaman `output/*.txt` dari database bersih, diulang identik (status, saldo, urutan; angka mesin sebagai batas yang diperiksa; kepala rekaman menulis versi alat); port dan nama kontainer lewat `labs/lab_env.*` (keputusan 860–864), tanpa 54333 tertulis tetap (`tools/cek_port_lab.py`); pihak ketiga tiruan lokal di container; uji mutasi atas kode uang dan keamanan (tes atau lab gagal karena sebab yang diuji, bukan koneksi mati); klaim dari dokumentasi diberi versi dan tanggal, dan yang tidak terbukti ditulis Tidak dijalankan atau [perlu verifikasi] di README dan rekaman.
- catatan: Jalur lab. Sumber halaman 4.20, 4.21. Server uji hanya mendengar di jaringan container; tidak ada target di luar container. ALOKASI: keputusan 1238–1241 (1238–1240 pelaksana, 1241 peninjau), ID riset R4-335 sampai R4-339. Selesai 2026-10-28 di PR #412 (keputusan 1238–1241): labs/t4-ssrf DIPERSEMPIT ke verifikasi defensif atas internal/unduh (respons agen dihentikan pemeriksa keamanan saat demonstrasi fetcher rentan; butir a–d Tidak dijalankan); zona IPv6 melewati alamatKhusus (diperbaiki), blok 192.88.99.0/24 ditambah.

### lab-t4-kartu · Lab t4-kartu: penerbit kartu tiruan, hold, dan kill switch

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: lab-api-t4, lab-t4-modul
- selesai bila: Lab `labs/t4-kartu` di atas `api-t4`: penerbit kartu tiruan di container dengan otorisasi real-time bertenggat 2 detik, clearing, dan reversal; ledger dipanggil lewat API dengan Idempotency-Key `id_penerbit` (ADR 37). Direkam: (a) tanpa hold, dua otorisasi serentak (jeda buatan di antara cek dan tulis) yang masing-masing di bawah saldo keduanya disetujui dan clearing kedua ditolak ledger; dengan hold (`ORDER BY id FOR UPDATE`, jurnal tahan), yang kedua ditolak; (b) `id_penerbit` yang sama dua kali menghasilkan satu hold; (c) `lock_timeout` 1 detik membuat jawaban keluar dalam tenggat saat buku terkunci; (d) job kedaluwarsa hold (7 hari, diperankan jamnya) dijalankan dua kali tidak melepas hold dua kali; (e) kill switch menolak otorisasi baru tanpa deploy (feature flag; OpenFeature go-sdk v1.20.0 dan flagd v0.19.0 bila dipakai, spesifikasi belum 1.0 [perlu verifikasi], kalau tidak flag di tabel dan disebut terang); (f) dua keadaan penerbit sesuai dokumentasi satu penerbit (R4-100): jawaban terlambat diputuskan penerbit menurut setelan timeout, dan menolak tetapi tidak menjangkau jaringan lalu jaringan menyetujui berarti dana tidak ditahan tetapi bisa ditangkap; rekonsiliasi kartu tetap perlu. Lab ini berbagi `labs/api-t4` lewat mode rentan (pola api-t1 dan api-t3), bukan salinan; sebelum mengubah api-t4 cek flag terhadap PR terbuka lain dan jalankan ulang `make cek` lab yang berbagi (peninjau menjalankannya lagi). Aturan lab (`plan/BRIEF-HALAMAN.md` bagian Tugas lab dan widget): schema sendiri di PostgreSQL bersama, `make -C labs/t4-kartu run`, gagal keras bila hasil berbeda dari pernyataan naskah (bila lab membantah naskah, naskah yang berubah lewat KONSISTENSI-4 dan halaman memakai rekaman); rekaman `output/*.txt` dari database bersih, diulang identik (status, saldo, urutan; angka mesin sebagai batas yang diperiksa; kepala rekaman menulis versi alat); port dan nama kontainer lewat `labs/lab_env.*` (keputusan 860–864), tanpa 54333 tertulis tetap (`tools/cek_port_lab.py`); pihak ketiga tiruan lokal di container; uji mutasi atas kode uang dan keamanan (tes atau lab gagal karena sebab yang diuji, bukan koneksi mati); klaim dari dokumentasi diberi versi dan tanggal, dan yang tidak terbukti ditulis Tidak dijalankan atau [perlu verifikasi] di README dan rekaman.
- catatan: Jalur lab. Sumber halaman 4.22, 4.23. Tenggat 2 detik adalah parameter tiruan yang mengikuti dokumentasi satu penerbit; tanpa merek di halaman. ALOKASI: keputusan 1242–1245 (1242–1244 pelaksana, 1245 peninjau), ID riset R4-340 sampai R4-344. Selesai 2026-10-28 di PR #415 (keputusan 1242–1245): labs/t4-kartu (penerbit tiruan, hold ORDER BY id FOR UPDATE, lock_timeout 1 detik, kedaluwarsa 7 hari, kill switch, dua service lewat API ledger); peninjau menemukan id_penerbit kembar disetujui dan ditolak sekaligus, masukan NUL/UTF-8 rusak → 22021 → 500 → penerbit tiruan membaca timeout lalu setuju tanpa hold, X-Penerbit-Kunci tak dijaga; temuan lab: lock_timeout per penantian bukan per transaction, batas harian dua service tak diserialisasi.

### lab-t4-audit · Lab t4-audit: audit log berantai, role, dan MCP server baca-saja

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: lab-api-t4
- selesai bila: Lab `labs/t4-audit` di atas `api-t4`: audit log append-only berantai hash (`hash` = SHA-256 dari hash sebelumnya dan isi baris). Direkam: (a) UPDATE pada baris tengah log biasa tidak terdeteksi; pada log berantai verifikasi gagal di baris itu; (b) menghapus ekor log berantai tidak terdeteksi tanpa jangkar luar dan terdeteksi dengan jangkar harian di luar database [perlu verifikasi]; (c) role aplikasi ditolak UPDATE dan DELETE, dibuktikan sebagai role itu dan bukan sebagai pemilik tabel atau superuser (keduanya melewati pembatasan); (d) persetujuan dua orang untuk ubah batas dan buka blokir; pembekuan darurat tanpa persetujuan; (e) MCP server baca-saja (spesifikasi 2026-07-28 dan go-sdk v1.8.0, [perlu verifikasi: versi]) tidak punya tool tulis dan tidak meneruskan token; (f) perilaku model terhadap isi catatan yang berisi instruksi (prompt injection tidak langsung, R4-102) Tidak dijalankan. Lab ini berbagi `labs/api-t4` lewat mode rentan (pola api-t1 dan api-t3), bukan salinan; sebelum mengubah api-t4 cek flag terhadap PR terbuka lain dan jalankan ulang `make cek` lab yang berbagi (peninjau menjalankannya lagi). Aturan lab (`plan/BRIEF-HALAMAN.md` bagian Tugas lab dan widget): schema sendiri di PostgreSQL bersama, `make -C labs/t4-audit run`, gagal keras bila hasil berbeda dari pernyataan naskah (bila lab membantah naskah, naskah yang berubah lewat KONSISTENSI-4 dan halaman memakai rekaman); rekaman `output/*.txt` dari database bersih, diulang identik (status, saldo, urutan; angka mesin sebagai batas yang diperiksa; kepala rekaman menulis versi alat); port dan nama kontainer lewat `labs/lab_env.*` (keputusan 860–864), tanpa 54333 tertulis tetap (`tools/cek_port_lab.py`); pihak ketiga tiruan lokal di container; uji mutasi atas kode uang dan keamanan (tes atau lab gagal karena sebab yang diuji, bukan koneksi mati); klaim dari dokumentasi diberi versi dan tanggal, dan yang tidak terbukti ditulis Tidak dijalankan atau [perlu verifikasi] di README dan rekaman.
- catatan: Jalur lab. Sumber halaman 4.24, 4.25. ALOKASI: keputusan 1246–1249 (1246–1248 pelaksana, 1249 peninjau), ID riset R4-345 sampai R4-349. Selesai 2026-10-29 di PR #416 (keputusan 1246–1249): labs/t4-audit (audit log berantai, jangkar, role, persetujuan dua orang, MCP baca-saja go-sdk v1.8.0 di modul terpisah); peninjau menemukan ?alasan=%FF → 22021 → 500, label 'oleh pemilik tabel' dijalankan sebagai superuser, api_t4 boleh INSERT audit_log dan UPDATE status; rantai tanpa kunci rahasia bukan tanda tangan.

### lab-t4-pipeline · Lab t4-pipeline: oasdiff, SBOM, pindai, dan tanda tangan image

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: lab-api-t4
- selesai bila: Lab `labs/t4-pipeline`: pemeriksaan merge per modul atas kontrak dan image `api-t4` (versi dicek ulang saat lab ditulis: oasdiff v1.34.1, oapi-codegen v2.8.1, openapi-generator v7.26.0, gosec v2.30.0, syft v1.55.0, grype v0.121.0, cosign v3.1.4). Direkam: (a) oasdiff `breaking` mendeteksi perubahan enum dan penghapusan field; apakah ia mendeteksi parameter tingkat path (isu #1163 dan #1164) [perlu verifikasi]; (b) client Dart dibuat ulang dari kontrak dan diff-nya diperiksa; (c) gosec dan govulncheck menemukan satu temuan yang disiapkan; (d) pindai grype atas SBOM CycloneDX syft menemukan satu kerentanan yang disiapkan (grype butuh basis data kerentanan yang diunduh sekali; versinya dicatat di rekaman); (e) `cosign verify` gagal pada image tanpa tanda tangan atau yang ditandatangani lewat tag lalu berubah, dan berhasil pada digest (cosign#2047; kunci sendiri, keyless hanya dijelaskan). Butir (b) dan (c) boleh ditulis Tidak dijalankan bila waktu habis, dan halaman memakai labelnya. Registry image lokal di container; provenance SLSA dan atestasi app hanya disebut. Aturan lab (`plan/BRIEF-HALAMAN.md` bagian Tugas lab dan widget): schema sendiri di PostgreSQL bersama, `make -C labs/t4-pipeline run`, gagal keras bila hasil berbeda dari pernyataan naskah (bila lab membantah naskah, naskah yang berubah lewat KONSISTENSI-4 dan halaman memakai rekaman); rekaman `output/*.txt` dari database bersih, diulang identik (status, saldo, urutan; angka mesin sebagai batas yang diperiksa; kepala rekaman menulis versi alat); port dan nama kontainer lewat `labs/lab_env.*` (keputusan 860–864), tanpa 54333 tertulis tetap (`tools/cek_port_lab.py`); pihak ketiga tiruan lokal di container; uji mutasi atas kode uang dan keamanan (tes atau lab gagal karena sebab yang diuji, bukan koneksi mati); klaim dari dokumentasi diberi versi dan tanggal, dan yang tidak terbukti ditulis Tidak dijalankan atau [perlu verifikasi] di README dan rekaman.
- catatan: Jalur lab. Sumber halaman 4.26. Bila unduhan basis data grype gagal lokal, tulis Tidak dijalankan dan sebut penyebabnya. ALOKASI: keputusan 1250–1253 (1250–1252 pelaksana, 1253 peninjau), ID riset R4-350 sampai R4-354. Selesai 2026-10-29 di PR #420 (keputusan 1250–1253): labs/t4-pipeline (oasdiff v1.34.1, openapi-generator v7.26.0, gosec v2.30.0, govulncheck v1.9.0, syft v1.55.0, grype v0.121.0, cosign v3.1.4 + registry:3); api-t4 TIDAK lolos gerbang ADR 44 hari ini (Go 1.27.1: govulncheck 10 stdlib dipanggil, grype 15 temuan 2 Critical); gosec -quiet, govulncheck json, grype SBOM kosong gagal terbuka (gerbang lab menutupnya); cosign tag dipindah sebelum tanda tangan lulus atas image salah; peninjau memperketat identitas tanda tangan dan 107 mutan baru.

### ERD4 · ERD Tahap 4 dari skema lab

- jenis: interaksi
- status: selesai
- percobaan: 0
- bergantung: lab-api-t4
- selesai bila: `tools/erd.py` membaca skema akhir lab utama Tahap 4 (`labs/api-t4`, 22 tabel) dan menulis `situs/data/erd/tahap-4.json` beserta selisih terhadap Tahap 3; `--cek` di gerbang mencakup Tahap 4 (penjaga Vitest seperti Tahap 3 yang menangkap kolom, UNIQUE, CHECK, atau index yang dihapus tangan); widget ERD bertumbuh menampilkan Tahap 4 berdampingan dengan Tahap 3 di `/uji/erd/` (HP 320 dan 375 px: label kunci tidak memotong nama kolom, SETELAH-TAHAP-3); selisih dengan mermaid naskah 3b tercatat (lab yang benar; `NASKAH_3B` salinan tangan di `run.py` lab dibandingkan lewat `tools/erd.py`).
- catatan: Pembagian schema per modul ditampilkan bila `t4-modul` sudah menetapkannya; bila belum, tabel dikelompokkan sesuai rancangan 3b dan KONSISTENSI-4 menyelaraskan. ALOKASI: keputusan 1254–1257 (1254–1256 pelaksana, 1257 peninjau); tanpa ID riset. Selesai 2026-10-28 di PR #419 (keputusan 1254–1257): situs/data/erd/tahap-4.json dan modul-tahap-4.json dari katalog api-t4 (22 tabel, enam schema, 35 FK) dan t4-modul; diagram bertumbuh dengan pembagian modul; peninjau menambah penjaga tinggi node dan label dua baris (tiga mutan CSS dan satu konstanta tata lolos uji mutasi peninjau); selisih naskah di PELAJARAN-ARSIP.

### W4-webhook · Scrollytelling webhook dan outbox

- jenis: interaksi
- status: selesai
- percobaan: 0
- bergantung: ERD4, lab-t4-webhook
- selesai bila: Widget baru (skill visualisasi) dibuat sebelum halaman yang memakainya: langkah demi langkah saat digulir (tanpa animasi otomatis; tombol Berikutnya sebagai jalan keyboard; maksimal 8 langkah): request ke gateway tiruan, webhook datang dua kali atau terlambat, `webhook_event` dan jurnal masuk, rekonsiliasi; memakai tiga kejadian naskah bagian 3 (ganda, terlambat, hilang) dan jadwal retry tiruan 2, 10, 30, 90, 210 menit (342 menit, diskalakan); dua mode, handler versi pertama (dua jurnal) lawan versi ADR 34 (satu jurnal); dari rekaman `labs/t4-webhook`. Tebak dulu sebelum hasil, satu hal yang bisa diubah pembaca, chip sumber ke rekaman atau label Simulasi/Ilustrasi, keyboard penuh, `prefers-reduced-motion` tanpa gerak dengan fungsi tetap, teks sebagai DOM (bukan di SVG), token warna gelap/terang, dimuat hanya di halaman yang memakainya, `role=status` satu kalimat per wilayah, fokus tidak jatuh ke body, hasil tanpa JavaScript, tabel 320 px, ukuran JS dicatat di `plan/AUDIT-TAMPILAN.md`, diuji di halaman `/uji/`, axe 0, tes Vitest untuk logika murni, dan alat ukur geometri sendiri (`situs/tools/ukur-<widget>.mjs`; mutasi tampilan lolos Vitest dan build, pola `ukur-pool.mjs` dan `ukur-outbox.mjs`).
- catatan: Dipakai 4.7. Keputusan 1207: `W4-modul` dihapus, `W4-webhook` dan `W4-breaker` tetap karena keduanya mesin keadaan dan jadwal. ALOKASI: keputusan 1258–1261 (1258–1260 pelaksana, 1261 peninjau); tanpa ID riset. Selesai 2026-10-29 di PR #425 (keputusan 1258–1261): widget Webhook langkah demi langkah (ADR 34) di situs/src/widgets/webhook-langkah, halaman uji /uji/webhook/, ukur-webhook.mjs; peninjau mempersempit kalimat langkah yang melampaui rekaman (rekon.txt A, webhookV1 tanpa memeriksa status, jadwal 2/10/30/90/210 berlabel Ilustrasi), mengunci label tetap dengan sidik, model ADR 34 mencatat hasil ganda, dan alat ukur 83 → 91 pemeriksaan (11 dari 23 mutan tampilan awalnya lolos).

### W4-breaker · Circuit breaker interaktif

- jenis: interaksi
- status: selesai
- percobaan: 0
- bergantung: ERD4, lab-t4-integrasi
- selesai bila: Widget baru (skill visualisasi) dibuat sebelum halaman yang memakainya: pembaca mengatur error rate dan latensi pihak ketiga tiruan; status closed, open, dan half-open dan request yang ditolak cepat terlihat; ambang dari lab Tahap 4 (lebih dari 5 gagal berturut-turut, open 60 detik, satu permintaan di half-open, timeout 3 detik, 5 percobaan); dua jalur (sinkron dengan breaker, queue dengan lajur yang dijeda tanpa menghitung percobaan); pilihan 4xx dihitung sukses atau gagal; laju verifikasi 0,116 per detik dan pemakaian worker 1,74 dari 4 (Hitungan, Asumsi). Tebak dulu sebelum hasil, satu hal yang bisa diubah pembaca, chip sumber ke rekaman atau label Simulasi/Ilustrasi, keyboard penuh, `prefers-reduced-motion` tanpa gerak dengan fungsi tetap, teks sebagai DOM (bukan di SVG), token warna gelap/terang, dimuat hanya di halaman yang memakainya, `role=status` satu kalimat per wilayah, fokus tidak jatuh ke body, hasil tanpa JavaScript, tabel 320 px, ukuran JS dicatat di `plan/AUDIT-TAMPILAN.md`, diuji di halaman `/uji/`, axe 0, tes Vitest untuk logika murni, dan alat ukur geometri sendiri (`situs/tools/ukur-<widget>.mjs`; mutasi tampilan lolos Vitest dan build, pola `ukur-pool.mjs` dan `ukur-outbox.mjs`).
- catatan: Dipakai 4.11. ALOKASI: keputusan 1262–1265 (1262–1264 pelaksana, 1265 peninjau); tanpa ID riset. Selesai 2026-10-29 di PR #426 (keputusan 1262–1265): widget Circuit breaker interaktif (ADR 36) di situs/src/widgets/circuit-breaker, halaman uji /uji/breaker/, ukur-breaker.mjs 78 pemeriksaan; peninjau menemukan awalan kelas cb- bertabrakan dengan widget cari-bug di tema.css global (tombol baris kode cari-bug 1.19, 1.20, 3.4, 3.22 menempel; diganti brk- dan tes memindai tabrakan), jawaban tebakan '1' hanya benar dengan backoff 0 (lajur.txt B; premis ditulis di pertanyaan), simulasi bisa membeku (putaran dibatasi), 13 dari 18 mutan tampilan yang lolos ditutup alat ukur.

### KONSISTENSI-4 · NASKAH-4 dicocokkan dengan temuan lab dan keputusan Tahap 3

- jenis: crosscheck
- status: selesai
- percobaan: 0
- bergantung: NASKAH-4, lab-api-t4, lab-t4-webhook, lab-t4-integrasi, lab-t4-modul, lab-t4-storage, lab-t4-infra, lab-t4-qr, lab-t4-ssrf, lab-t4-kartu, lab-t4-audit, lab-t4-pipeline, ERD4, W4-webhook, W4-breaker, EVAL-3
- selesai bila: satu subagent (bukan penulis lab) membaca `plan/CERITA-TAHAP-4.md`, README dan rekaman semua lab Tahap 4, badan PR lab dan widget (temuan peninjau), `situs/data/erd/tahap-4.json` beserta selisihnya dengan mermaid 3b, `plan/EVALUASI-TAHAP-3.md`, halaman Tahap 3 yang ditulis, ADR 22–33 dan keputusan Tahap 3 di KEPUTUSAN, lalu menambal naskah seperlunya tanpa menulis ulang struktur: nama tabel dan kolom, nomor M dan ADR, angka beban, kalimat rekaman yang dibantah lab (bagian "Yang harus bisa dibuktikan lab"), jadwal retry dan ambang, versi alat, peta halaman, prasyarat; setiap tambalan satu baris di bagian atas naskah ("Disesuaikan dengan lab pada <tanggal>: ...") dan di KEPUTUSAN (badan PR); bila peta halaman berubah, registry dan `plan/RINGKAS.md` diselaraskan di PR yang sama. Butir wajib: (1) tim 6–10 dalam 2 tim di halaman 3.5 ("Pertumbuhan skala") lawan 13 dalam tiga tim; (2) jembatan 3.32 "gateway, kartu, dasbor" lawan Pembayaran, Merchant, Platform; (3) ADR 22 menunggu "halaman Tahap 4 yang membahas panggilan luar yang harus selesai sebelum uang bergerak", dijawab ADR 36 dan ADR 42; (4) pemicu VPS kedua ADR 33 di 3.30 lawan ADR 26 di naskah; (5) ±22 tabel naskah Tahap 3 lawan hitungan `ERD4`; (6) bentuk akhir pembagian modul dan schema dari `t4-modul` lawan tabel 3b; (7) versi Redis dan alat lain lawan R4-01; (8) tabel "Terjaga" dan "Rusak" bagian 3 lawan rekaman `t4-webhook`. Enam aturan penulisan naskah (satu angka satu bentuk, kalimat rekaman menunggu rekaman, klaim negatif berlingkup, ambang tanpa pembanding yang bertentangan, urutan commit dan jam tidak diklaim di luar rekaman, ADR lama dibaca terhadap PRD baru) diperiksa satu per satu; gerbang lolos.
- catatan: Pelajaran KONSISTENSI-3: 63 tambalan (21 dari keputusan tahap sebelumnya, 42 dari lab dan widget); karena itu tugas ini menunggu semua lab, `ERD4`, dan kedua widget, dan EVAL-3 supaya halaman Tahap 3 ikut dibaca. Butir (1) dan (2) memperbaiki halaman 3.5 dan 3.32 yang sudah merge sebelum tugas ini jalan, dalam commit terpisah beserta konstanta `TIM_T4_HALAMAN` di `situs/src/lib/skema-data-t3.halaman.test.ts` (T4-siap menaruhnya karena halaman 3.x ditulis agen lain). Halaman 4.1 baru boleh mulai sesudah tugas ini dan `DIRI-3`. ALOKASI: keputusan 1390–1393 (1390–1392 pelaksana, 1393 peninjau); cadangan pengatur 1394–1399. Selesai 2026-10-29 di PR #427 (keputusan 1390–1393): 95 tambalan pada plan/CERITA-TAHAP-4.md (83 penggantian kalimat + 12 butir), halaman 3.5 diperbaiki ke 13 developer dalam tiga tim (penjaga membaca registry), pemicu VPS kedua ADR 33 ditulis pertanyaan terbuka; peninjau menemukan penjaga 3.5 hanya memeriksa satu blok, delapan tambalan melampaui rekaman, empat baris tabel pernyataan lab terlewat, atribusi ADR 22 salah; blok mermaid 3b tidak diubah (NASKAH_3B di run.py).

### 4.1 · PRD v4: Rekeningo dibuka ke publik

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: W4-breaker, KONSISTENSI-4, DIRI-3
- selesai bila: halaman PRD 4.1 sesuai `plan/CERITA-TAHAP-4.md` bagian 1 dan peta halaman Tahap 4; tanpa lab baru; jawaban atas tebakan pembaca di 3.32 (dari ADR Tahap 3, mana yang pecah lebih dulu?) dibuka dari naskah bagian 1: M28 serta syarat ADR 12, 22, 25, 26, dan 32 ditulis sebagai syarat yang sudah terpenuhi sejak PRD dibagikan, bukan kejutan; user, ruang lingkup P0 sampai P2, metrik, risiko Sinta (kabar dari luar, data orang tak dikenal, tiga tim, endpoint tanpa rate limit), dan tiga pertanyaan terbuka; tingkat verifikasi Rp1.000.000 dan Rp10.000.000 berlabel Asumsi produk; tanpa klaim izin atau regulasi; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Template PRD seperti 3.1. Tugas halaman pertama: menunggu semua widget Tahap 4 supaya halaman berikutnya tidak menunggu widget. KONSISTENSI-4 selesai (PR #427, keputusan 1390–1393): halaman 3.32 tidak menamai tim; tiga tim bernama Pembayaran 5, Merchant 4, Platform 4 (13 developer; 3.27/3.29/3.32 menulis "10 sampai 15 dalam tiga tim"); naskah 3 bagian 6 masih menulis "gateway, kartu, dasbor" dan dijaga `jembatan-prd-v4.halaman.test.ts` (usulan di USULAN-CERITA, jangan diubah dari halaman); naskah 4 bagian 1 membaca ulang ADR 12, 22, 25 (dihitung bersama ADR 23), 26, dan 32 dan menulis pemicu VPS kedua ADR 33 (jendela pg_dump harian sampai 24 jam, ±7.500 transaksi Tahap 3 dan ±65.000 per hari Tahap 4, Hitungan atas Asumsi) sebagai pertanyaan terbuka karena PRD v3 dan v4 tanpa RPO/RTO. ALOKASI: keputusan 1266–1269 (1266–1268 pelaksana, 1269 peninjau), ID riset R4-110 sampai R4-114. Selesai 2026-10-29 di PR #429 (keputusan 1266–1269): prd-v4.mdx (template PRD, 13 menit), jawaban tebakan 3.32 dari halaman ADR 22, 25, 26, 32; peninjau: simbol L diberi arti, 6,5% memuat 0,868, atribusi penerbit kartu tidak ke PRD, penjaga satu Rantai/Blok dan tes sisa-teks (147/153 mutan).

### 4.2 · Dari fitur ke pekerjaan teknis v4

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.1, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Fitur → teknis 4.2 sesuai `plan/CERITA-TAHAP-4.md` bagian 2 dan peta halaman Tahap 4; tanpa lab baru; tabel tujuh baris naskah (fitur, app, backend, database, konsep) dengan tautan ke halaman konsep; widget pilah (siapa mengerjakan apa) dengan data baru; pertanyaan pertama Tahap 4 dirumuskan sebelum kode: kabar dari luar adalah klaim, bukan fakta; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Kartu, back office, dan merchant luar tidak punya halaman fitur sendiri (peta 31 halaman); cukup di tabel ini. ALOKASI: keputusan 1270–1273 (1270–1272 pelaksana, 1273 peninjau), ID riset R4-115 sampai R4-119. Selesai 2026-10-29 di PR #431 (keputusan 1270–1273): fitur-ke-teknis.mdx (kartu pilah empat kelompok, tabel tujuh baris); pola kabar dari luar hanya M31 dan M37 (bukan M33); peninjau: Inti subjek tim, label Rantai, kartu hold dengan pelaku.

### 4.3 · Fitur: top-up dari bank dan verifikasi identitas

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.2, lab-api-t4, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Fitur → teknis 4.3 sesuai `plan/CERITA-TAHAP-4.md` bagian 2 dan 3 dan peta halaman Tahap 4; rekaman dari `labs/api-t4`; widget alur (pilih nominal, tujuan bayar, status menunggu lalu naik saat gateway memberi tahu; foto kartu identitas dan swafoto, status verifikasi); gateway dan layanan verifikasi tiruan lokal, dokumentasi gateway nyata hanya sebagai rujukan tanpa merek; dua tingkat verifikasi sebagai Asumsi produk; syarat batas laju untuk endpoint pendaftaran terbuka (README api-t3 "Yang belum ada di lab ini"); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Naskah belum mendefinisikan versi app Tahap 4: bila halaman menyebutnya, tulis sebagai Asumsi penulis seperti 3.3. ALOKASI: keputusan 1274–1277 (1274–1276 pelaksana, 1277 peninjau), ID riset R4-120 sampai R4-124. Selesai 2026-10-29 di PR #430 (keputusan 1274–1277): fitur-topup-verifikasi.mdx (dua blok Coba); peninjau: kamera depan Android tak dijamin, jenis gambar hanya imageQuality, rekaman memakai 500 ms; 'mati sehari' diperbaiki oleh peninjau 4.10.

### 4.4 · Dua arah ke pihak ketiga: dipanggil masuk, memanggil keluar

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.3, lab-t4-webhook, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Konsep 4.4 sesuai `plan/CERITA-TAHAP-4.md` bagian 3 dan peta halaman Tahap 4; rekaman dari `labs/t4-webhook`; widget cari-bug (tandai baris handler versi pertama yang melanggar satu dari tiga hal, lalu tabel enam kejadian naskah terisi, dicocokkan dengan rekaman); tiga hal yang harus selalu benar dan versi pertama minggu 2 dari naskah; satu kalimat bahwa pola ini muncul lagi di M31, M33, dan M37; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Cek diri minimal tiga kartu. Tabel "Terjaga" dan "Rusak" naskah adalah prediksi sebelum lab: salin hanya yang terekam. ALOKASI: keputusan 1278–1281 (1278–1280 pelaksana, 1281 peninjau), ID riset R4-125 sampai R4-129. Selesai 2026-10-29 di PR #432 (keputusan 1278–1281): dua-arah-pihak-ketiga.mdx (cari-bug data baru); peninjau: retry gateway hanya 4xx/5xx (3xx 'No retries'), webhookV1 mencari top-up lewat order_id, mode mati menjawab 503, label turunan.

### 4.5 · Skema data: ERD Tahap 3 → Tahap 4 dan pertumbuhannya

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.4, ERD4, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Konsep 4.5 sesuai `plan/CERITA-TAHAP-4.md` bagian 3b dan peta halaman Tahap 4; widget ERD bertumbuh dengan Tahap 3 di kiri dan Tahap 4 di kanan dari `situs/data/erd/tahap-4.json` (ERD4); tabel "Apa yang berubah dan kenapa" dan pembagian modul dan schema (bentuk akhir dari `t4-modul`, bukan rancangan naskah); pertumbuhan skala Tahap 3 sampai 5; tiga besaran ukuran data berlabel Asumsi (4,38 GB registry dengan 2 transaksi, 6,57 GB registry dengan 3, 10,95 GB rumus ledger) dan file 365 GB per tahun (33 kali posting); selisih dengan mermaid naskah ditulis (lab yang benar); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Halaman 3.5 sudah diperbaiki ke 13 developer dalam tiga tim (PR #427, keputusan 1390; penjaga membaca registry). ERD4: 22 tabel (14 + 8), 35 foreign key; tabel "Modul (schema)" naskah cocok katalog `t4-modul` (22 tabel, 6/4/1/4/5/2, awalan `t4m_`, 21 FK lintas modul: 14 ke modul akun dan 7 ke jurnal); blok mermaid 3b di naskah TIDAK sama dengan ERD4 (enam selisih ditulis di bawah blok; `NASKAH_3B` di `labs/api-t4/run.py` menyalinnya): halaman memakai ERD4 dari `situs/data/erd/tahap-4.json`. ALOKASI: keputusan 1282–1285 (1282–1284 pelaksana, 1285 peninjau), ID riset R4-130 sampai R4-134. Selesai 2026-10-29 di PR #434 (keputusan 1282–1285): skema-data.mdx, tebakan, tabel modul; memperbaiki komponen ErdHalaman/ErdTumbuh (memilih Tahap 2 di 3.5 melempar galat dan melepas widget; ukur-erd bagian 12); peninjau: judul 'semua bermuara' dibantah halaman sendiri, README bukan rekaman, UNIQUE.

### 4.6 · M29: Top-up Budi masuk dua kali

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.5, lab-t4-webhook, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Masalah 4.6 sesuai `plan/CERITA-TAHAP-4.md` bagian 4 (M29) dan peta halaman Tahap 4; rekaman dari `labs/t4-webhook`; widget alur; yang dikira (gateway mengirim dua kali karena bug, hapus jurnal kedua dengan tangan) sebelum yang sebenarnya (gateway mengulang kiriman yang tidak dijawab 2xx dengan jeda menit, bukan dua kali dalam satu detik; balasan 200 hilang; dua kiriman hampir bersamaan lolos cek-lalu-tulis; status mundur; tanpa tanda tangan); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Gejala berlabel Ilustrasi sampai ada rekaman; yang dikira sebelum yang sebenarnya; konsep tidak di dalam adegan; angka kejadian naskah yang tidak terulang di lab berlabel Ilustrasi dan masuk `### USULAN-CERITA`. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Saldo Rp450.000 dan dua jurnal berlabel Ilustrasi kecuali rekaman menghasilkannya. ALOKASI: keputusan 1286–1289 (1286–1288 pelaksana, 1289 peninjau), ID riset R4-135 sampai R4-139. Selesai 2026-10-29 di PR #433 (keputusan 1286–1289): m29-topup-dua-kali.mdx (alur dua jalur dari rentan.txt); peninjau: 'tiga kegagalan satu akar' keliru untuk kiriman bersamaan, ulangan sesuai dokumentasi, definisi di luar adegan, 17 tes penjaga baru.

### 4.7 · Webhook masuk: tanda tangan, event ganda, urutan + ADR 34

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.6, lab-t4-webhook, W4-webhook, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Konsep + ADR 4.7 sesuai `plan/CERITA-TAHAP-4.md` bagian 4 dan tabel ADR 34 (menyerap B10.2 lama) dan peta halaman Tahap 4; rekaman dari `labs/t4-webhook`; widget W4-webhook; ADR 34: HMAC-SHA256 atas byte mentah, toleransi 5 menit (Asumsi untuk tiruan), `event_id` kunci utama dengan `INSERT ... ON CONFLICT DO NOTHING`, balas 2xx sesudah COMMIT, status hanya maju; opsi cek-lalu-tulis tanpa tabel event, balas-dulu-lalu-antre, token statis tanpa timestamp; tiga gaya tanda tangan sebagai pembanding; ADR 34 ditulis dalam dua bentuk (satu proses, dan sesudah ADR 37 ledger dipanggil lewat API di luar transaction) dengan tautan `[[t4-modul]]`; "kapan salah" dengan pembanding L = 2,9 pada puncak dan ±2,6 detik pada batas atas 3,47 kiriman per detik (Hitungan, Asumsi); bagian "Di stack lain" memakai enam stack atau label Tidak dijalankan; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Halaman lama B10.2 dilebur ke sini. ALOKASI: keputusan 1290–1293 (1290–1292 pelaksana, 1293 peninjau), ID riset R4-140 sampai R4-144. Selesai 2026-10-29 di PR #435 (keputusan 1290–1293): webhook-masuk.mdx (ADR 34, WebhookLangkah, tab enam stack); peninjau: 'dua event berbeda ditahan tiga lapis' salah, aturan 4 lebih luas dari kode, asal angka 9 dan ambang 2,6 s, 378 mutan.

### 4.8 · M30: Saldo Citra tidak naik, padahal bank sudah memotong

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.7, lab-t4-webhook, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Masalah 4.8 sesuai `plan/CERITA-TAHAP-4.md` bagian 4 (M30) dan peta halaman Tahap 4; rekaman dari `labs/t4-webhook`; widget alur; gateway tiruan merotasi secret dan langsung menandatangani dengan secret baru, 401 sampai secret disamakan; jadwal retry 5 kali (342 menit) berlaku untuk 401 menurut jadwal per kode status; kiriman yang pertama datang sebelum batas jadwal tidak datang lagi (Hitungan); dua gateway nyata yang berbeda tidak ditulis seolah satu, tanpa merek di adegan; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Gejala berlabel Ilustrasi sampai ada rekaman; yang dikira sebelum yang sebenarnya; konsep tidak di dalam adegan; angka kejadian naskah yang tidak terulang di lab berlabel Ilustrasi dan masuk `### USULAN-CERITA`. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Jam Sabtu dan Minggu, dan "tujuh top-up" berlabel Ilustrasi. ALOKASI: keputusan 1294–1297 (1294–1296 pelaksana, 1297 peninjau), ID riset R4-145 sampai R4-149. Selesai 2026-10-29 di PR #436 (keputusan 1294–1297): m30-saldo-tidak-naik.mdx (alur retry.txt B dan C); peninjau: enam klaim (401 tidak disebut dibatasi ke tabel kode status, bagian C menyalakan ulang dengan <baru>,<lama>), 25 hitungan cocok.

### 4.9 · Rekonsiliasi dengan gateway + ADR 35

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.8, lab-t4-webhook, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Konsep + ADR 4.9 sesuai `plan/CERITA-TAHAP-4.md` bagian 4 dan tabel ADR 35 dan peta halaman Tahap 4; rekaman dari `labs/t4-webhook`; widget runsql (PGlite: tiga jenis selisih dari pencocokan laporan settlement dengan jurnal per `order_id`); ADR 35: dua lapis (job cek status top-up `menunggu` lebih dari 30 menit lewat job idempoten ADR 19, `[[t2-job-rekonsiliasi]]`; rekonsiliasi harian), `insiden_rekon` bernomor, koreksi lewat jurnal normal, rotasi secret dengan masa tumpang tindih; opsi percaya webhook saja, polling semua top-up tiap menit, koreksi tangan; "kapan salah" dengan 20 ÷ 5.000 = 0,4% (Asumsi); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Aturan Pak Hadi: setiap rupiah dari luar cocok dengan catatan pengirimnya; selisih adalah insiden, bukan angka yang dikoreksi. ALOKASI: keputusan 1298–1301 (1298–1300 pelaksana, 1301 peninjau), ID riset R4-150 sampai R4-154. Selesai 2026-10-29 di PR #438 (keputusan 1298–1301): rekonsiliasi-gateway.mdx (ADR 35, runsql SQLite sql.js berlabel Simulasi); .gitleaks.toml pengecualian berjangkar diperiksa aman; runsql lama: fokus kembali ke tombol; keputusan 4 ADR 35 dipersempit ke jumlah_beda negatif.

### 4.10 · M31: 146 pendaftar tertahan "Sedang diverifikasi"

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.9, lab-t4-integrasi, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Masalah 4.10 sesuai `plan/CERITA-TAHAP-4.md` bagian 4 (M31) dan peta halaman Tahap 4; rekaman dari `labs/t4-integrasi`; widget alur; yang dikira (foto buram) sebelum yang sebenarnya (vendor mati, lima percobaan lalu dead-letter menghabiskan pekerjaan yang tidak bersalah); hitungan dari angka yang tertulis di halaman: 0,0116 × 12.600 = 146 pada laju rata-rata, 0,116 × 5 × 3 = 1,74 dari 4 worker, dan 4,0 dari 4 bersama notifikasi uang (Hitungan, Asumsi); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Gejala berlabel Ilustrasi sampai ada rekaman; yang dikira sebelum yang sebenarnya; konsep tidak di dalam adegan; angka kejadian naskah yang tidak terulang di lab berlabel Ilustrasi dan masuk `### USULAN-CERITA`. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Angka 146 dan jam kejadian berlabel Ilustrasi atau Hitungan; judul halaman memuat 146 persis seperti peta naskah. ALOKASI: keputusan 1302–1305 (1302–1304 pelaksana, 1305 peninjau), ID riset R4-155 sampai R4-159. Selesai 2026-10-29 di PR #437 (keputusan 1302–1305): m31-verifikasi-tertahan.mdx; peninjau: umur pekerjaan paling lama 48 detik (batas 3,6 s), klaim negatif RingkasOutbox, hitungan slot batas bawah (kode membebaskan slot per putaran), 4.3 'mati beberapa jam'.

### 4.11 · Timeout, retry berkunci, circuit breaker, lajur per vendor + ADR 36

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.10, lab-t4-integrasi, W4-breaker, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Konsep + ADR 4.11 sesuai `plan/CERITA-TAHAP-4.md` bagian 4 dan tabel ADR 36 (menyerap B11 lama) dan peta halaman Tahap 4; rekaman dari `labs/t4-integrasi`; widget W4-breaker; ADR 36: satu pembuat client dengan timeout 3 detik, Idempotency-Key dari id internal, breaker per vendor `sony/gobreaker` v2.4.0 di jalur sinkron (4xx dihitung sukses), lajur queue per `tujuan` dijeda tanpa menghitung percobaan, timeout menjadi `tidak_pasti`; opsi retry bebas tanpa kunci, breaker di semua jalur termasuk queue, satu service per vendor (R4-29); breaker melengkapi ADR 22 (yang menandainya Tidak dijalankan); "kapan salah" dengan pembanding 1,74 dan 4,0 dari 4 worker; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Halaman lama B11 dilebur ke sini (dan ke 4.4). Sesudah KONSISTENSI-4 (PR #427): IsExcluded gobreaker belum jadi kalimat ADR 36; label "Simulasi" (W4-breaker) bukan salah satu dari lima label `/cara-pakai/`: definisikan di pemakaian pertama; jalur sinkron dengan breaker hanya Simulasi. ALOKASI: keputusan 1306–1309 (1306–1308 pelaksana, 1309 peninjau), ID riset R4-160 sampai R4-164. Selesai 2026-10-30 di PR #439 (keputusan 1306–1309): timeout-retry-breaker.mdx (ADR 36, CircuitBreaker, halaman istilah Circuit breaker, enam stack: Go dijalankan); peninjau: kalimat Inti 'menunggu tanpa kehilangan percobaan' dibantah lajur.txt B, kondisi Azure sesuai sumber, hitungan 146 dan 12.600 diturunkan, 4,00 (3,99 tanpa pembulatan), opsi B ditolak dari kode; 187 mutan baru (13 tes tambahan).

### 4.12 · M32: Rilis Kamis memecahkan top-up

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.11, lab-t4-modul, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Masalah 4.12 sesuai `plan/CERITA-TAHAP-4.md` bagian 4 (M32) dan peta halaman Tahap 4; rekaman dari `labs/t4-modul`; widget alur; yang dikira (rilis tim Pembayaran rusak) sebelum yang sebenarnya (tim Merchant mengganti nama kolom `akun.nama`, modul pembayaran membaca dengan SQL langsung, tes tiap tim lolos dengan data tiruan, folder migration tanpa pemilik); ADR 17 (`[[t2-skema-tanpa-downtime]]`) sudah ada tetapi tidak ada mesin yang memaksanya lintas tim; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Gejala berlabel Ilustrasi sampai ada rekaman; yang dikira sebelum yang sebenarnya; konsep tidak di dalam adegan; angka kejadian naskah yang tidak terulang di lab berlabel Ilustrasi dan masuk `### USULAN-CERITA`. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Jam rilis dan rollback berlabel Ilustrasi. ALOKASI: keputusan 1310–1313 (1310–1312 pelaksana, 1313 peninjau), ID riset R4-165 sampai R4-169. Selesai 2026-10-30 di PR #442 (keputusan 1310–1313): m32-rilis-kamis.mdx (alur dua jalur dari batas.txt); klaim naskah M32 dan README t4-modul 'kode top-up tidak membaca akun.nama' SALAH menurut kode (BuatTopupBank, Topup CSV memanggil repo.Akun); peninjau: 'rename tidak mematahkan modul lain' dilingkupi, 'tes data tiruan' = satu tes lewat -run, minimal tujuh pembaca nama.

### 4.13 · Modular monolith, CODEOWNERS, ADR wajib + ADR 37

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.12, lab-t4-modul, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Konsep + ADR 4.13 sesuai `plan/CERITA-TAHAP-4.md` bagian 4 dan tabel ADR 37 (menyerap B7.2 dan D5 lama) dan peta halaman Tahap 4; rekaman dari `labs/t4-modul`; widget banding (batas yang hanya tertulis di dokumen lawan batas yang dijaga compiler dan database: compile error `internal/` dan `permission denied`; keputusan 1207) dan diagram arsitektur untuk pembagian modul dan schema; ADR 37 merevisi ADR 12 dan membuat ADR 34 dan 42 dua langkah idempoten; CODEOWNERS (pola terakhir menang; review wajib hanya bila admin menyalakannya, [perlu verifikasi: plan pemilik]); template MADR 4.0.0 ringkas untuk ADR wajib lintas modul; opsi tetap satu paket, semua modul jadi service (R4-28, R4-29), modular monolith tanpa service pembayaran; heuristik ±50 developer berlabel tingkat 4, bukan studi terkontrol; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Halaman lama B7.2 dan D5 dilebur ke sini. W4-modul dihapus dari tugas (keputusan 1207). ALOKASI: keputusan 1314–1317 (1314–1316 pelaksana, 1317 peninjau), ID riset R4-170 sampai R4-174. Selesai 2026-10-30 di PR #441 (keputusan 1314–1317): modular-monolith.mdx (ADR 37, Rantai, Tebak, banding, DiagramArsitektur; ukur-diagram.mjs +2 baris buka details); peninjau: atribusi Fowler dipisah (MonolithFirst vs MicroservicePremium; penjaga lama mengunci kalimat salah), CODEOWNERS @rekeningo/tim-x, batas database belum melindungi kode lama, ±50 developer tanpa sumber primer.

### 4.14 · M33: Uji pulih mingguan makin lama

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.13, lab-t4-storage, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Masalah 4.14 sesuai `plan/CERITA-TAHAP-4.md` bagian 4 (M33) dan peta halaman Tahap 4; rekaman dari `labs/t4-storage`; widget alur; yang dikira (disk staging terlalu kecil) sebelum yang sebenarnya (foto kartu identitas di kolom `bytea`, 28 hari × 1 GB lawan ±0,84 GB posting, 97% isi backup adalah file); rasio ukuran dari rekaman, waktu hanya batas; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Gejala berlabel Ilustrasi sampai ada rekaman; yang dikira sebelum yang sebenarnya; konsep tidak di dalam adegan; angka kejadian naskah yang tidak terulang di lab berlabel Ilustrasi dan masuk `### USULAN-CERITA`. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: 3 jam 40 menit lawan 12 menit berlabel Ilustrasi; hitungan 28 hari berlabel Hitungan dan Asumsi. ALOKASI: keputusan 1318–1321 (1318–1320 pelaksana, 1321 peninjau), ID riset R4-175 sampai R4-179. Selesai 2026-10-30 di PR #443 (keputusan 1318–1321): m33-uji-pulih.mdx (alur ukuran.txt, halaman istilah Backup dan uji pulih); peninjau mempersempit pengecualian berkas_x di tools/audit_bahasa.py ke file data (NAMA_KODE_DATA) dan menambah tools/test_audit_bahasa.py (26 kasus) ke cek_situs.sh; klaim 'satu-satunya tempat waktu pulih terlihat' dilingkupi; 94/94 mutan.

### 4.15 · Keamanan 7: File identitas: object storage, presigned URL + ADR 38

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.14, lab-t4-storage, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Keamanan + ADR 4.15 sesuai `plan/CERITA-TAHAP-4.md` bagian 4 dan tabel ADR 38 dan peta halaman Tahap 4; rekaman dari `labs/t4-storage`; widget banding (file di `bytea` lawan penyimpanan objek, atau unggah lewat server lawan presigned URL); presigned URL adalah bearer token yang punya umur dan PUT ke kunci yang sama menimpa; ADR 38: kunci objek dan checksum di database, unggah presigned PUT 5 menit (Asumsi), unduh hanya lewat server yang menulis audit, retensi 30 hari (Asumsi produk, [perlu verifikasi]), nomor identitas tidak masuk log; opsi `bytea`, disk lokal VPS, semua lewat server; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Bila baca lebih dari 10 menit, pecah atau ringkas (SETELAH-TAHAP-4). ALOKASI: keputusan 1322–1325 (1322–1324 pelaksana, 1325 peninjau), ID riset R4-180 sampai R4-184. Selesai 2026-10-30 di PR #445 (keputusan 1322–1325): object-storage-presigned.mdx (Keamanan 7 + ADR 38, ±3.578 kata 17 menit baca tidak diringkas); peninjau: tautan 4.3 'siapa boleh membacanya' dipindah dari t4-m33 ke t4-storage, klaim ukuran dilingkupi lab (presigned POST), 0,2315 × 500 = 115,75, batas kasus GitLab, atribusi wiki PostgreSQL, M34 disamakan dengan 4.16; 906 mutan baru.

### 4.16 · M34: Semua verifikasi ditolak sesudah pindah hosting

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.15, lab-t4-infra, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Masalah 4.16 sesuai `plan/CERITA-TAHAP-4.md` bagian 4 (M34) dan peta halaman Tahap 4; rekaman dari `labs/t4-infra`; widget alur; yang dikira (vendor mati lagi, M31 terulang) sebelum yang sebenarnya (alamat keluar berubah sesudah pindah akun cloud dan belum didaftarkan; breaker ADR 36 hanya menghitung gagal berturut-turut (membuka sesudah gagal ke-6, 4xx dihitung gagal oleh bawaan pustaka dan sukses oleh pengaturan kustom: lihat naskah M31 dan ADR 36 sesudah KONSISTENSI-4) dan tidak memperbaiki penyebab; klaim bahwa breaker "terbuka dengan benar" pada penolakan alamat butuh rekaman (`breaker.txt`, `t4-infra`) atau label Simulasi); dua temuan lain dari pindahan yang sama: nilai secret di state IaC ([perlu verifikasi di lab]) dan staging memakai kunci produksi (Ilustrasi); ±42 pendaftar per jam (Hitungan: 1.000 ÷ 24); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Gejala berlabel Ilustrasi sampai ada rekaman; yang dikira sebelum yang sebenarnya; konsep tidak di dalam adegan; angka kejadian naskah yang tidak terulang di lab berlabel Ilustrasi dan masuk `### USULAN-CERITA`. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Senin 07.50 dan dua hari kerja pendaftaran alamat berlabel Ilustrasi atau Asumsi. ALOKASI: keputusan 1326–1329 (1326–1328 pelaksana, 1329 peninjau), ID riset R4-185 sampai R4-189. Selesai 2026-10-30 di PR #446 (keputusan 1326–1329): m34-verifikasi-ditolak.mdx (alamat keluar berubah sesudah pindah hosting; halaman istilah Alamat keluar); peninjau: 'satu pekerjaan tetap mati' hanya satu slot worker (lajur.txt C: nol mati pada 4 slot; M34 pada 4 slot Tidak dijalankan), NAT dan [perlu verifikasi] diberi arti, klaim state dilunakkan; 175 mutan baru.

### 4.17 · Secret manager, IaC, alamat keluar tetap + ADR 39

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.16, lab-t4-infra, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Konsep + ADR 4.17 sesuai `plan/CERITA-TAHAP-4.md` bagian 4 dan tabel ADR 39 (menyerap B11.2 lama) dan peta halaman Tahap 4; rekaman dari `labs/t4-infra`; widget pilah (yang dipindah ke layanan terkelola dan yang tetap di VPS); ADR 39: layanan terkelola, OpenTofu v1.13.2 lawan Terraform v1.17.0 (BSL), OpenBao v2.7.2 (versi lab; naskah lama menulis v2.7.1) lawan Vault v2.2.1 (BSL) hanya dibandingkan, secret dibaca saat runtime, alamat keluar tetap, secret staging dan produksi terpisah; menjawab SEBAGIAN titik gagal tunggal ADR 26 (data, file, secret; app tetap berhenti saat mesin diganti, VPS kedua ditunda ADR 33); hosting terkelola dan failover Tidak dijalankan; BFF terpisah hanya disebut di 4.29; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Halaman lama B11.2 dilebur ke sini. Bila baca lebih dari 10 menit, pecah atau ringkas. SETELAH-TAHAP-4: jalur Security tidak memuat 4.17 padahal isinya keamanan; pertimbangkan. ALOKASI: keputusan 1330–1333 (1330–1332 pelaksana, 1333 peninjau), ID riset R4-190 sampai R4-194. Selesai 2026-10-30 di PR #447 (keputusan 1330–1333): secret-iac-alamat-keluar.mdx (ADR 39 empat opsi, Terraform v1.17.1, tiga halaman istilah); peninjau: sebelas klaim (jendela ±17 bersyarat, destroy sebagai aturan, kasus CircleCI dibaca sampai batasnya, 'biasanya' untuk ulangan gateway), 67 mutan baru; versi dan lisensi dicocokkan ke GitHub API dan LICENSE.

### 4.18 · M35: QR di kasir Bu Marni

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.17, lab-t4-qr, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Masalah 4.18 sesuai `plan/CERITA-TAHAP-4.md` bagian 4 (M35) dan peta halaman Tahap 4; rekaman dari `labs/t4-qr`; widget alur; pihak yang mencoba menempelkan stiker QR statis miliknya (merchant sah terverifikasi) di atas stiker Bu Marni: pembayaran valid, jurnal seimbang; CRC di tag 63 mendeteksi salah baca, bukan penggantian (Hitungan); layar konfirmasi versi pertama hanya bertanya "Bayar?"; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Gejala berlabel Ilustrasi sampai ada rekaman; yang dikira sebelum yang sebenarnya; konsep tidak di dalam adegan; angka kejadian naskah yang tidak terulang di lab berlabel Ilustrasi dan masuk `### USULAN-CERITA`. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Tiga pembayaran Rp35.000, Rp48.000, Rp22.000 berlabel Ilustrasi. ALOKASI: keputusan 1334–1337 (1334–1336 pelaksana, 1337 peninjau), ID riset R4-195 sampai R4-199. Selesai 2026-10-30 di PR #448 (keputusan 1334–1337): m35-qr-bu-marni.mdx (M35, halaman istilah CRC); peninjau: dugaan Raka ditulis dengan akibat yang bisa dilihat, asal tag dan CRC sebagai sumber sekunder, tiga posisi salah baca pada payload dinamis, definisi CRC 'rusak saat dikirim'; CRC-16 dihitung ulang bit demi bit; 334 mutan baru.

### 4.19 · QR pembayaran: statis, dinamis, konfirmasi + ADR 40

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.18, lab-t4-qr, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Konsep + ADR 4.19 sesuai `plan/CERITA-TAHAP-4.md` bagian 4 dan tabel ADR 40 dan peta halaman Tahap 4; rekaman dari `labs/t4-qr`; widget tebak (payload dengan CRC yang dihitung ulang untuk payload lain: lolos atau ditolak?); QR statis (tag 01 = 11) lawan dinamis (12); layar konfirmasi nama terverifikasi; batas Rp200.000 (Asumsi produk); ADR 40 dengan opsi statis saja, dinamis saja, QR statis bertanda tangan; parameter CRC [perlu verifikasi di PDF EMVCo]; tanpa nama skema nasional; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Perilaku pembeli di layar konfirmasi tidak terukur: Asumsi. ALOKASI: keputusan 1338–1341 (1338–1340 pelaksana, 1341 peninjau), ID riset R4-200 sampai R4-204. Selesai 2026-10-30 di PR #451 (keputusan 1338–1341): qr-pembayaran.mdx (ADR 40 empat kolom, Tebak, 'Di stack lain' CRC 16 bit, halaman istilah QR statis dan dinamis); peninjau: kasus FBI PSA ditulis sampai batas sumber (memuat QR pembayaran bisnis yang diganti), sumber Mastercard tak memuat cara menghitung CRC, 15 ÷ 460 berdampingan 15 ÷ 400, Snippet qr.go dipecah, batas 300 detik; 469 mutan baru.

### 4.20 · M36: Pratinjau gambar yang berisi JSON

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.19, lab-t4-ssrf, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Masalah 4.20 sesuai `plan/CERITA-TAHAP-4.md` bagian 4 (M36) dan peta halaman Tahap 4; rekaman dari `labs/t4-ssrf`; widget alur; yang dikira (gambar rusak atau CSV salah) sebelum yang sebenarnya (server mengunduh URL yang diisi merchant dengan hak jaringan dalam, pesan kesalahan menampilkan sebagian isi respons, pemeriksaan teks atas URL dilewati, redirect tidak diperiksa); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Gejala berlabel Ilustrasi sampai ada rekaman; yang dikira sebelum yang sebenarnya; konsep tidak di dalam adegan; angka kejadian naskah yang tidak terulang di lab berlabel Ilustrasi dan masuk `### USULAN-CERITA`. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Kata `penyimpanan-internal` dan nama layanan di container berlabel Ilustrasi kecuali rekaman memuatnya. Sesudah KONSISTENSI-4 (PR #427): `fitur.txt` dan `rentan.txt` api-t4 menunjuk rekaman unduh-rentan yang tidak ada; lab ssrf dipersempit (butir a–d Tidak dijalankan), tulis apa adanya. ALOKASI: keputusan 1342–1345 (1342–1344 pelaksana, 1345 peninjau), ID riset R4-205 sampai R4-209. Selesai 2026-10-30 di PR #450 (keputusan 1342–1345): m36-pratinjau-json.mdx dari sisi pembela (lab ssrf dipersempit); peninjau: klaim 'sisanya hanya daftar awalan' dibantah kode (24 awalan + 2 IsMulticast; penjaga lama mengunci kalimat salah), HasilImpor tiga field; 400 mutan baru; lingkup defensif aman.

### 4.21 · Keamanan 8: SSRF + ADR 41

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.20, lab-t4-ssrf, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Keamanan + ADR 4.21 sesuai `plan/CERITA-TAHAP-4.md` bagian 4 dan tabel ADR 41 dan peta halaman Tahap 4; rekaman dari `labs/t4-ssrf`; widget cari-bug (fungsi unduh: tandai pemeriksaan yang bisa dilewati, dengan baris aman); ADR 41: hanya https, resolusi DNS lalu pemeriksaan di `Dialer.ControlContext`, redirect dimatikan, 2 MiB (2.097.152 byte; `batas.txt`) dan 3 detik, hanya status 200, tipe dari byte, kesalahan tanpa isi respons; opsi allowlist, deny-list string (pilihan terakhir menurut OWASP), tanpa URL; golang/go#80417 dan #79925 sesuai hasil lab; metadata cloud Tidak dijalankan; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Naskah menyebut halaman ini Keamanan 8. ALOKASI: keputusan 1346–1349 (1346–1348 pelaksana, 1349 peninjau), ID riset R4-210 sampai R4-214. Selesai 2026-10-30 di PR #452 (keputusan 1346–1349): ssrf.mdx (ADR 41 empat opsi, cari-bug); peninjau: hitungan alamat dengan skrip Go sendiri (daftar awalan 24 mentah atau 25 sesudah Unmap; empat penanda 6; penuh 32 dari 32), label 'fetcher menolak 32 dari 32' diturunkan jadi 'pemeriksaan alamat ... tanpa membuat koneksi', tab Node blockList, OWASP Deny-list (Last Resort); juga memperbaiki halaman 4.20 (tujuh kode 3xx, angka karangan hanya private/link-local, pesan galat).

### 4.22 · M37: Kartu virtual disetujui dua kali dengan satu saldo

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.21, lab-t4-kartu, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Masalah 4.22 sesuai `plan/CERITA-TAHAP-4.md` bagian 4 (M37) dan peta halaman Tahap 4; rekaman dari `labs/t4-kartu`; widget alur; yang dikira (bug di penerbit kartu) sebelum yang sebenarnya (otorisasi memeriksa saldo lalu menyetujui tanpa menahan dana, cek-lalu-tulis seperti M9 `[[t2-m9]]`; ledger menolak clearing kedua karena saldo tidak boleh negatif, padahal persetujuan tidak bisa ditarik; tenggat 2 detik penerbit); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Gejala berlabel Ilustrasi sampai ada rekaman; yang dikira sebelum yang sebenarnya; konsep tidak di dalam adegan; angka kejadian naskah yang tidak terulang di lab berlabel Ilustrasi dan masuk `### USULAN-CERITA`. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Rp100.000 dan Rp80.000 berlabel Ilustrasi. ALOKASI: keputusan 1350–1353 (1350–1352 pelaksana, 1353 peninjau), ID riset R4-215 sampai R4-219. Selesai 2026-10-30 di PR #453 (keputusan 1350–1353): m37-kartu-dua-kali.mdx (cek-lalu-tulis pada otorisasi kartu, penerbit tiruan fail terbuka, jalan kedua lewat tenggat); peninjau menjalankan klaim ke rekaman, 731 menit dibuka sampai merge (jeda limit #10 dan dua kali sesi pengatur dimulai ulang).

### 4.23 · Kartu virtual: otorisasi, dana tertahan, kill switch + ADR 42

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.22, lab-t4-kartu, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Konsep + ADR 4.23 sesuai `plan/CERITA-TAHAP-4.md` bagian 4 dan tabel ADR 42 dan peta halaman Tahap 4; rekaman dari `labs/t4-kartu`; widget race (replay dua otorisasi serentak, tebak hasilnya); ADR 42: satu panggilan ke API ledger dengan key `id_penerbit`, hold satu transaction (`ORDER BY id FOR UPDATE`, jurnal tahan), `lock_timeout` 1 detik, hold kedaluwarsa 7 hari (Asumsi), kill switch dan rilis bertahap 1%, 5%, 25%, 100% (Asumsi); opsi cek saldo tanpa menahan, saldo tersedia = saldo − hold di kolom terpisah (dua sumber kebenaran), tolak semua bila lock tak langsung; "kapan salah" dengan dua keadaan penerbit dan L = 0,23; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Feature flag di OpenFeature dan flagd hanya bila lab memakainya (spesifikasi belum 1.0, [perlu verifikasi]). ALOKASI: keputusan 1354–1357 (1354–1356 pelaksana, 1357 peninjau), ID riset R4-220 sampai R4-224. Selesai 2026-10-30 di PR #456 (keputusan 1354–1357): kartu-virtual.mdx (ADR 42 empat opsi, Tebak menggantikan widget race, halaman istilah hold dan kill-switch); peninjau: tabel otorisasi_kartu satu schema tahap4_kartu (bukan schema pembayaran), tiga titik tunggu lock disebut dari kode, urutan audit lalu flag dibaca dari kode, 'tanpa panggilan ke ledger' dibatasi ke tes Go, nama penyedia tidak tampil di teks, ukur-erd.mjs mengikuti registry, 65 dari 91 mutan baris RISET lolos dengan kunci kalimat lalu ditutup; 3.109 mutan baru.

### 4.24 · M38: Siapa yang membuka data Budi?

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.23, lab-t4-audit, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Masalah 4.24 sesuai `plan/CERITA-TAHAP-4.md` bagian 4 (M38) dan peta halaman Tahap 4; rekaman dari `labs/t4-audit`; widget alur; yang dikira (layanan verifikasi bocor) sebelum yang sebenarnya (satu akun bersama, engineer membaca tabel lewat role pemilik schema tanpa catatan, log biasa bisa diubah; jawaban "tidak ada" sama nilainya dengan "tidak tahu"); sumber pesan ke Budi tidak pernah dibuktikan; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Gejala berlabel Ilustrasi sampai ada rekaman; yang dikira sebelum yang sebenarnya; konsep tidak di dalam adegan; angka kejadian naskah yang tidak terulang di lab berlabel Ilustrasi dan masuk `### USULAN-CERITA`. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Pesan ke Budi dan 30 hari berlabel Ilustrasi. ALOKASI: keputusan 1358–1361 (1358–1360 pelaksana, 1361 peninjau), ID riset R4-225 sampai R4-229. Selesai 2026-10-30 di PR #457 (keputusan 1358–1361): m38-siapa-membuka.mdx; peninjau: 'Rekeningo tidak bisa menjawab' dibatasi ke tabel catatan, 'UPDATE tidak meninggalkan petunjuk' jadi 'di isi tabel' (xmin dan n_tup_upd tak diperiksa lab), 'pemilik tabel yang mengubah satu baris terdeteksi' dibantah jangkar.txt B dan C, penjaga klaim negatif migrasi diperluas (RULE, EVENT TRIGGER, CONSTRAINT TRIGGER); 248 mutan baru, 4 lolos setara.

### 4.25 · Keamanan 9: Back office, audit log berantai, agen baca-saja + ADR 43

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.24, lab-t4-audit, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Keamanan + ADR 4.25 sesuai `plan/CERITA-TAHAP-4.md` bagian 4 dan tabel ADR 43 dan peta halaman Tahap 4; rekaman dari `labs/t4-audit`; widget banding (log biasa lawan log berantai: UPDATE baris tengah, ekor dipotong); ADR 43: peran `cs`, `risk`, `keuangan`, `admin-sistem`, persetujuan dua orang, hash SHA-256 berantai, jangkar harian di luar database, role aplikasi tanpa UPDATE dan DELETE, agen baca-saja lewat MCP tanpa meneruskan token (perilaku model Tidak dijalankan); "kapan salah": pelaku yang menulis ulang seluruh rantai termasuk jangkar, pemotongan ekor ([perlu verifikasi di lab]); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Naskah menyebut halaman ini Keamanan 9. ALOKASI: keputusan 1362–1365 (1362–1364 pelaksana, 1365 peninjau), ID riset R4-230 sampai R4-234. Selesai 2026-10-30 di PR #455 (keputusan 1362–1365): audit-log-back-office.mdx (ADR 43 empat opsi, banding log biasa lawan berantai, halaman istilah audit-log dan mcp); peninjau: Inti diberi syarat 'tanpa hitung ulang', aturan 4 ADR 43 memisahkan ubah data dari buka file (BukaBerkas menulis audit di transaction sendiri), ukuran PRD 100% belum terpenuhi untuk dua jalur, opsi C [perlu verifikasi]; 635 mutan baru, penjaga +45 tes.

### 4.26 · Tim dan infra Tahap 4: pipeline per modul, supply chain, rilis bertahap + ADR 44

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.25, lab-api-t4, lab-t4-pipeline, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Tim dan infra 4.26 sesuai `plan/CERITA-TAHAP-4.md` bagian 4, tabel ADR 44 dan isi "Tim dan infra Tahap 4" dan peta halaman Tahap 4; rekaman dari `labs/api-t4` dan `labs/t4-pipeline`; widget pilah (pemeriksaan per modul: lint, contract, SAST, SBOM, tanda tangan; mana di PR, mana di rilis); ADR 44 merevisi ADR 12 (tes contract OpenAPI di CI); CODEOWNERS dan branch protection, `api_client` dibuat ulang dari OpenAPI, paket app per tim, rilis store bertahap (Android hanya update, iOS 7 hari dari 1% sampai 100%, R4-22), security review Laras (temuan tanpa bukti ditulis dugaan), on-call per modul dan alert gejala; Testcontainers dan k6 Tidak dijalankan; "kapan salah": oasdiff belum memeriksa parameter tingkat path, SBOM tidak mencegah serangan, tanda tangan di tag tidak berarti; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Bila baca lebih dari 10 menit, pecah dua (pipeline dan supply chain; CODEOWNERS, rilis bertahap, on-call) hanya bila perlu (SETELAH-TAHAP-4). Pemicu ADR 44: M32 dan M34. Sesudah KONSISTENSI-4 (PR #427): jangan menulis gosec G701 untuk semua `Sprintf`; api-t4 gagal gerbang ADR 44 dengan Go 1.27.1 (govulncheck 10 temuan stdlib dipanggil, grype 15 temuan, 2 Critical): tulis apa adanya; aturan "jalankan semua" untuk kode bersama di ADR 44 adalah keputusan yang belum final. ALOKASI: keputusan 1366–1369 (1366–1368 pelaksana, 1369 peninjau), ID riset R4-235 sampai R4-239. Selesai 2026-10-30 di PR #458 (keputusan 1366–1369): tim-infra.mdx (ADR 44 tiga opsi, pilah 8 kartu, dua Rantai; 25 menit baca, tidak dipecah); peninjau: '13 temuan High atau lebih' = 2 Critical + 9 High + 2 Unknown, iOS 'paling banyak 200 per hari' dibatasi pembaruan otomatis, lockfile workflow GitHub ditambahkan, parameter tingkat path hanya tertangkap pada ambang WARN, klaim 'Tahap 3 tidak ada SAST' salah (1.31 gosec G201 dan G202), janji 4.17 (pemindai state IaC) dan 4.23 (flag kartu di luar proses, rilis kartu bertahap) dijawab sebagai Sengaja belum tanpa lab; 148 mutan baru.

### 4.27 · M39: Uji coba publik lolos, PRD v5 datang

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.26, lab-api-t4, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Masalah 4.27 sesuai `plan/CERITA-TAHAP-4.md` bagian 4 (M39) dan peta halaman Tahap 4; tanpa lab sendiri (keputusan 1207); rekaman beban `make beban` dari `labs/api-t4` memberi koneksi dan p95 di laptop lab sebagai batas, bukan kapasitas produksi; widget kalkulator dengan angka beban naskah bagian 3 (138,9 RPS, 6,94 transaksi uang per detik, worker 56%, 125 menit untuk 100.000 HP; Hitungan, Asumsi); yang dikira (server lebih besar, Kubernetes, service per modul) sebelum yang sebenarnya; kata "tidak sesak" berarti L kecil terhadap pool di laptop lab; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Gejala berlabel Ilustrasi sampai ada rekaman; yang dikira sebelum yang sebenarnya; konsep tidak di dalam adegan; angka kejadian naskah yang tidak terulang di lab berlabel Ilustrasi dan masuk `### USULAN-CERITA`. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: PRD v5 tidak punya fitur v4 sebagai pemicu; pola seperti M28. ALOKASI: keputusan 1370–1373 (1370–1372 pelaksana, 1373 peninjau), ID riset R4-240 sampai R4-244. Selesai 2026-10-31 di PR #460 (keputusan 1370–1373): m39-prd-v5.mdx (Masalah tanpa lab, widget Kalkulator dengan data baru, Rantai ringkas); peninjau: klaim 'yang melihat jawaban server hanya p95' salah (run.py baris 749–751 juga memeriksa selesai = dijadwalkan dan status 200 atau 201) jadi 'status dan p95; keduanya batas longgar', jawaban Tebak '95% permintaan di bawah batas', 'pool setelah beban: maks 10' = MaxOpenConnections (batas, bukan pemakaian), batas L produksi 18 (dua pool 10) vs 9 (satu proses), janji ADR 45 dipersempit; 255 mutan baru 255/255.

### 4.28 · Estimasi Tahap 4 → 5

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.27, lab-api-t4, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Konsep 4.28 sesuai `plan/CERITA-TAHAP-4.md` bagian 3 (angka beban) dan peta halaman Tahap 4; widget kalkulator (asumsi dari `tahap[].asumsi`: 3 transaksi per user aktif, unggahan 2.000 × 500 KB); tabel angka beban naskah diulang dari angka yang tertulis di halaman; tiga besaran ukuran data berlabel; koneksi database 40 dari 100 dengan semua suku; kapasitas satu server belum terukur dan rekaman beban api-t4 hanya batas; penjaga angka yang menurunkan nilai dari registry (pola estimasi Tahap 2); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Kolom lab naskah "–" (keputusan 1207): bergantung `lab-api-t4` karena rekaman beban. ALOKASI: keputusan 1374–1377 (1374–1376 pelaksana, 1377 peninjau), ID riset R4-245 sampai R4-249. Selesai 2026-10-31 di PR #462 (keputusan 1374–1377): estimasi.mdx (tabel beban naskah diulang, tiga besaran ukuran data, satu langkah ke Tahap 5 sebagai Hitungan atas Asumsi: 1.388,9 RPS, worker 564%, 27,8 lawan 18); peninjau: '1,37 × 8 = 10,95 GB' tak bisa diulang (10,96; 10,95 dari 1,36875 × 8) dan penjaga mengunci kalimat salah, 'lima baris pertama hanya benar bila tidak punya timeout' dibantah baris ketiga (timeout 3 detik, ADR 22), keputusan beban Tahap 5 ditulis 'belum diputuskan di Tahap 4' (bukan di ADR 45), tebakan kalkulator indeks 3 → 1; 64 angka dihitung ulang: 63 cocok; mutasi 2.727/2.729 tanpa kunci.

### 4.29 · ADR 45: Sengaja belum dilakukan

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.28, KONSISTENSI-4, DIRI-3
- selesai bila: halaman ADR 4.29 sesuai `plan/CERITA-TAHAP-4.md` bagian 4 dan tabel ADR 45 dan peta halaman Tahap 4; tanpa lab; menyerap B5.2 lama (login sosial sebagai sengaja belum, syarat RFC 8252, RFC 7636, dan RFC 9700 dari halaman lama); tabel naskah: semua modul jadi service, Kubernetes dan service mesh dan Kafka, gRPC ke service pembayaran, read replica dan PgBouncer, BFF terpisah, login sosial, provenance SLSA dan HTTP Message Signatures (hanya disebut), durable execution dan event streaming (Tahap 5); masing-masing dengan angka tahap ini dan pemicunya yang bisa diukur; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: PERLU-DICEK-PEMILIK: PROPOSAL "Enam tahap dalam satu tabel" menulis bentuk Tahap 4 "modular monolith + 1 service pembayaran + BFF", naskah menunda BFF ke halaman ini (R4-06). Jangan mengubah PROPOSAL atau naskah; tulis BFF sebagai butir "Sengaja belum" dengan pemicunya dan catat di `### PERLU-DICEK-PEMILIK`; bila pemilik membatalkan, tambah satu ADR dan satu halaman. ALOKASI: keputusan 1378–1381 (1378–1380 pelaksana, 1381 peninjau), ID riset R4-250 sampai R4-254. Selesai 2026-10-31 di PR #463 (keputusan 1378–1381): sengaja-belum.mdx (ADR 45 opsi C 'tunda dengan pemicu dan alat ukur' atas A, B, D; delapan butir naskah; empat pemicu berangka di bawah ambang; login sosial lima syarat dari RFC 8252, 7636, 9700, OIDC Core; BFF butir 5); peninjau: asersi 4.25 dikembalikan ke versi main, 'empat dari delapan punya pemicu angka' salah (empat pemicu di tiga butir), kasus Shopify dibaca terbalik, lingkup 4.26 11 butir bukan 4, BFF 'tidak cocok' vs sumber 'might not be suitable', PgBouncer vs pgx max_prepared_statements, label beban.txt, Tebak ke indeks 1; Kafka dari trunk [perlu verifikasi]; 339 mutan baru semua tertangkap.

### 4.30 · Yang dibawa keluar dari Tahap 4

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.29, KONSISTENSI-4, DIRI-3
- selesai bila: halaman Konsep 4.30 sesuai `plan/CERITA-TAHAP-4.md` bagian 5 dan peta halaman Tahap 4; tanpa lab; tiga belas kalimat naskah bagian 5 masing-masing terikat ke kejadian dan rekaman; kartu (tebak lalu buka) dan Cek diri gabungan lima soal; daftar ADR 34 sampai 45; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Pola seperti 3.31. ALOKASI: keputusan 1382–1385 (1382–1384 pelaksana, 1385 peninjau), ID riset R4-255 sampai R4-259. Selesai 2026-10-31 di PR #464 (keputusan 1382–1385): rekap.mdx (13 kalimat naskah bagian 5 dalam versi halaman asal, tabel ADR 34–45, kartu, Cek diri 5 soal); peninjau: CI kepala sempat merah (asersi sengaja-belum-t4 'R4-254 diikuti R4-300' dilonggarkan ke 255..300), 'balasan 200 hilang, saldo naik Rp400.000' hanya benar di bagian B rekaman (handler ADR 34), govulncheck atas kode vs grype atas SBOM image, tabel ADR 45 'pemicu tertulis, dan kapasitas satu server belum diukur', M36 berlabel cerita (Ilustrasi), '125 menit' jadi 'paling sedikit'; eval_tahap.py gejala 4: 11 halaman Masalah ok; 122 mutan baru.

### 4.31 · Jembatan: pratinjau PRD v5

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: 4.30, KONSISTENSI-4, DIRI-3
- selesai bila: halaman PRD 4.31 sesuai `plan/CERITA-TAHAP-4.md` bagian 6 dan peta halaman Tahap 4; tanpa lab; pratinjau PRD v5 (skala nasional 1 juta user, laporan merchant real-time, notifikasi massal, cicilan dan tabungan, API publik untuk POS; tim 13 menjadi 20 sampai 40); widget tebak (dari ADR Tahap 4, mana yang pecah lebih dulu?) dengan bukti dari rekaman Tahap 4 tanpa isi Tahap 5; jawaban dibuka di halaman pertama Tahap 5, bukan di sini; "uang elektronik publik" tanpa klaim izin atau regulasi; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Aturan terbukti Tahap 3 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px.
- catatan: Jawaban tebakan dibuka di halaman pertama Tahap 5. ALOKASI: keputusan 1386–1389 (1386–1388 pelaksana, 1389 peninjau), ID riset R4-260 sampai R4-264. Selesai 2026-10-31 di PR #465 (keputusan 1386–1389): jembatan-prd-v5.mdx (PRD v5 pratinjau; Tebak 3 pilihan indeks 1 dengan label 'Cocok dengan halaman ADR', pilihan benar ADR 36, 37, 44, 45; 'jawabannya dibuka di halaman pertama Tahap 5'); peninjau: 'satu repo dan satu proses' salah (modul pembayaran service sendiri, ADR 37 aturan 1), kolom PRD v4 'satu notifikasi per kejadian uang' salah (PRD v3 sudah top-up massal dan promo), daftar tanpa lingkup jadi 'Contoh', syarat salah kedua ADR 38 juga memenuhi definisi pecah (paragraf lingkup), tabel melebar di 320 px dengan Verdana diperbaiki, R4-263 dibetulkan; 293 mutan baru: 293/293 dengan kunci, 283/293 tanpa (sisa prosa baris riset).

### EVAL-4 · Evaluasi Tahap 4

- jenis: crosscheck
- status: selesai
- percobaan: 0
- bergantung: 4.31
- selesai bila: `plan/EVALUASI-TAHAP-4.md` sesuai skill evaluasi-tahap oleh subagent yang tidak menulis halaman Tahap 4: kartu W1–W8 dengan satu baris bukti yang bisa diulang, tiga pertanyaan pembaca di tiga halaman acak (seed 4), uji baca oleh subagent segar (5 hal membingungkan). Ada TIDAK: paling banyak 3 tugas perbaikan disisipkan tepat sesudah tugas ini, lalu `EVAL-4-ulang` sekali; sisa TIDAK dan 5 hal membingungkan ke `plan/TINJAUAN-PEMILIK.md`.
- catatan: W1–W4 wajib YA. Sesudah evaluasi ulang tahap dinyatakan selesai apa pun hasilnya. ALOKASI: keputusan 1394–1396 (cadangan pengatur Tahap 4); tanpa ID riset. Selesai 2026-10-31 di PR #468 (keputusan 1394–1396; `plan/EVALUASI-TAHAP-4.md`): W1 YA (31/31, 0 segera), W2 YA atas penelusuran (20 baris, lebih dari 40 angka, 6 label sesuai definisi) tetapi ulang `make cek` lima lab TERTUNDA (Docker Desktop menunggu dialog izin administrator di layar Mac; agen tidak memasukkan kata sandi; butir 1 TINJAUAN-PEMILIK Tahap 4), W3 YA (gejala 11/11), W4 YA (axe 124 run 0 pelanggaran, contrast 957/957, keyboard 0 terlewat), W5 TIDAK (tujuh dari 29), W6 YA, W7 YA, W8 YA (31 langkah, cek_tautan 0 rusak); tidak ada tugas perbaikan, EVAL-4-ulang tidak diperlukan kecuali ulang lab gagal; lima hal membingungkan semuanya polesan; temuan alat: eval-keyboard.mjs 6 'terlewat' palsu di 4.13, gerbang rantai hanya Tahap 1–3, run.py:685 'keempat percobaan'.

### DIRI-4 · Perbaikan diri sesudah Tahap 4

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: EVAL-4
- selesai bila: Satu subagent membaca `plan/EVALUASI-TAHAP-4.md` dan pelajaran MEMORI Tahap 4, lalu boleh mengubah skill gaya-bahasa, visualisasi, analisis-kritis, riset-tahap, evaluasi-tahap hanya dengan bukti dari Tahap 4, paling banyak 10 baris per skill, masing-masing dicatat sebagai keputusan dengan teks sebelum/sesudah; CLAUDE.md, PROPOSAL, dan CERITA-TAHAP-1/2 tidak disentuh (usulan ke `plan/USULAN-PERBAIKAN.md`); STATUS menulis "Tahap 4 selesai".
- catatan: Langkah penutup alur tahap. ALOKASI: keputusan 1397–1399 (cadangan pengatur Tahap 4); skill yang diubah dicatat sebagai keputusan satu per satu. Selesai 2026-10-31 di PR #470 (keputusan 1397–1399): lima SKILL.md dan `plan/USULAN-PERBAIKAN.md` (bagian 'Dari DIRI-4': 13 usulan di luar wewenang dan 6 pelajaran untuk LAPORAN-AKHIR). gaya-bahasa +3 (angka masukan dari halaman lain diberi asal; rujukan 'di atas' dan 'bagian G' harus bisa diikuti; satu kata per konsep), visualisasi +1 (tabel GFM sama jumlah kolom, hitung `<table>` di dist), analisis-kritis +7/−2 (kalimat dua fakta, kata bilangan atas daftar, penjaga mengunci kalimat salah, kelas mutan RISET, penjaga tetangga RISET, pembulatan setengah ke atas, toContain), riset-tahap +1 (kata pelunak sumber), evaluasi-tahap +5/−2 (`docker info` dan kartu 'YA, ulang lab tertunda', keyboard dengan jeda, uji baca dengan nama file lengkap, W5 dan W6 diperluas); ditolak: posisi Tebak, Hitungan lawan Rekaman, nama penyedia, tiga klaim prompt yang tak terbukti. STATUS: Tahap 4 selesai.

## Tahap 5

Alur tujuh langkah (keputusan 554). Tugas lab dan halaman Tahap 5 disisipkan oleh `T5-siap` dari peta halaman naskah: lab sebelum `ERD5`, halaman sesudah widget. Nomor keputusan: 1400–1699 (naskah dan `T5-siap` 1400–1414; halaman 5.n 1500–1627; lab 1630–1669; `ERD5` dan widget 1670–1685; cadangan pengatur 1686–1689 dan 1699; `EVAL-5`, `DIRI-5`, `G3-rantai` 1690–1698; digeser dari 1200–1399 karena Tahap 3 memakai 1000–1199 dan Tahap 4 1200–1399, pengatur 2026-10-26; diperpanjang ke 1699 oleh `T5-siap` 2026-10-31 karena alokasi empat nomor per halaman melewati 1599).

### RISET-5 · Riset Tahap 5

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: RISET-4
- selesai bila: `plan/RISET-TAHAP-5.md` (≤ 120 baris) sesuai skill riset-tahap untuk Tahap 5 (skala nasional, PROPOSAL "Enam tahap dalam satu tabel"): konsep dengan 1–3 sumber primer bertanggal dan ID `R5-nn`, yang berubah sejak PROPOSAL, teknik terbaru masuk/tidak, satu kasus industri nyata untuk ADR dari sumber primer, jebakan forum, angka beban dan ukuran data dihitung ulang dengan rumus PROPOSAL sebagai Asumsi; pengatur membuka tiga ID acak.
- catatan: Kerja di depan (keputusan 728): jalan di lajur riset sebelum DIRI-4; `plan/RISET-TAHAP-5.md` memakai angka tahap sebelumnya dari RINGKAS dan naskahnya. Selesai 2026-10-25 di PR #330.

### NASKAH-5 · Naskah Tahap 5 (draft otomatis)

- jenis: konten
- status: selesai
- percobaan: 0
- bergantung: RISET-5, DIRI-4
- selesai bila: `plan/CERITA-TAHAP-5.md` dengan struktur persis CERITA-TAHAP-2 (Kenapa dokumen ini ada, Latar, Tokoh baru, 1 PRD v5, 2 Dari fitur ke pekerjaan teknis, 3 Inti teknis, 3b Skema data, 4 Masalah, 5 Yang dibawa keluar, 6 Jembatan, Peta halaman, Jalur per peran), baris pertama "Draft otomatis, belum ditinjau pemilik", memakai RISET-TAHAP-5; nomor M dan ADR melanjutkan tahap sebelumnya; peta halaman 24–32 halaman dengan kolom lab, setiap halaman masalah dipicu fitur PRD, pihak ketiga selalu tiruan lokal; peninjau konsistensi (subagent kedua) membaca naskah terhadap semua naskah sebelumnya (tokoh, nama perusahaan, angka saldo dan user, istilah glosarium, nomor ADR dan M, rantai PRD → fitur → teknis → masalah → konsep) dan semua temuannya ditutup.
- catatan: Satu-satunya naskah yang ditulis Claude; Tahap 1–2 milik pemilik dan tidak disentuh. Selesai 2026-10-31 di PR #472 (keputusan 1400–1409; KONSISTENSI-5 menambal naskah di PR yang sama): 32 halaman, M40–M51, ADR 46–60, 10 lab dirancang (`api-t5` dan sembilan `t5-*`) dan tiga widget (W5-zona, W5-lag, W5-fanout); RISET-TAHAP-5 menambah R5-100 sampai R5-105; usulan peninjau untuk `T5-siap` diterapkan di keputusan 1410 sampai 1414.

### T5-siap · RINGKAS, registry, dan antrean Tahap 5

- jenis: interaksi
- status: selesai
- percobaan: 0
- bergantung: NASKAH-5
- selesai bila: `plan/RINGKAS.md` (≤ 60 baris) memuat peta halaman Tahap 5 satu baris per halaman dan tahap sebelumnya diringkas; registry `situs/data/cerita.json` memuat semua halaman Tahap 5 sesuai naskah (judul, jenis, bagian, ★, peran, prasyarat, lab), yang belum ditulis tampil "segera", halaman lama tahap ini menjadi `lama` bila diganti; ANTREAN mendapat tugas lab (sebelum `ERD5`) dan tugas halaman berurutan (sesudah tugas widget) dengan `selesai bila` merujuk bagian naskah; `sinkron_cerita.py`, `cek_tautan.py`, dan gerbang lolos.
- catatan: Sekaligus mengganti `bergantung` `EVAL-5` ke halaman terakhir Tahap 5 dan `ERD5` ke lab utama Tahap 5; halaman yang memakai widget bergantung pada tugas widgetnya. Selesai 2026-10-31 di PR #PR_T5_SIAP (keputusan 1410–1414): RINGKAS 59 dari 60 baris (peta Tahap 4 dilipat per kelompok, peta Tahap 5 satu baris per halaman); registry memuat 5.1–5.32 "segera", `T5` diganti `t5-prd`, D2, D3, dan D4b dilebur (`t5-read-replica`, `t5-lag`, `t5-fanout`), `tahap[4]` ditulis ulang tanpa `versi: lama` (`trx` tetap 2); 10 tugas lab, `G3-rantai`, dan 32 tugas halaman; halaman tanpa lab (5.1, 5.28, 5.30) bisa jalan selama Docker mati; `plan/BRIEF-HALAMAN.md` +2 baris.

### lab-api-t5 · Lab api-t5: api-t4 naik ke enam service dan satu negara

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: T5-siap
- selesai bila: Lab baru `labs/api-t5` (Go 1.27.3, Asumsi sampai lab mengecek ulang; `make -C labs/api-t5 run`) berangkat dari `labs/api-t4` dan menambah semua tabel dan kolom naskah bagian 3b lewat migrasi baru di atas migrasi terakhir api-t4: delapan tabel baru (`snapshot_saldo`, `arsip_partisi`, `ringkasan_merchant_harian`, `jadwal_cicilan`, `angsuran`, `pengumuman`, `mitra_pos`, `sakelar`), kolom dan nilai baru (`akun.mitra_pos_id`, nilai `stream` di `outbox.tujuan`, `jurnal.referensi` UNIK boleh kosong, nilai `angsuran` dan `tabungan` di `jurnal.jenis`, nilai `tabungan` di `buku.jenis`), dan `posting` dipartisi per bulan menurut `dibuat` dengan PK `(id, dibuat)`, jadi 30 tabel dalam enam schema service (`ledger`, `akun`, `pembayaran`, `merchant`, `notifikasi`, `cicilan`) dengan role per service. Kolom persis mengikuti skema lab, selisih dengan blok mermaid naskah dicatat (lab yang benar), dan pembagian tabel ke service mengikuti tabel "Service (schema)" bagian 3b sebagai rancangan (Asumsi desain) yang bentuk akhirnya ditetapkan di sini. Foreign key lintas schema service dihapus; jumlahnya dihitung dari katalog (Tahap 4: 21) dan harus 0. PgBouncer 1.26.1 mode transaction di depan primary (versi dicek ulang). Enam service adalah paket dengan schema dan role sendiri; apakah satu proses atau beberapa ditetapkan di sini dan dicatat di badan PR (`t5-service` memisahkan dua sampai tiga di antaranya jadi proses sendiri dengan mTLS). Mode rentan seperti `api-t3` dan `api-t4`: laporan merchant dibaca dari primary (versi pertama M40) dan cicilan satu job (versi pertama M48, dipakai `t5-cicilan`). Direkam (bagian `laporan`): polling dari banyak client serentak lawan tanpa laporan, p95 pembayaran lebih tinggi sebagai batas, bukan nilai tunggal (bila selisihnya tidak terlihat di laptop, halaman menulisnya dan 666,7 per detik tetap Asumsi); cache laporan 30 detik di Redis (versi Redis dicek ulang) dengan satu client per merchant yang memanggil tiap 30 detik menghasilkan hit rate hampir nol (jumlah hit dihitung, bukan waktu). Direkam (bagian `pooler`): N client dengan pool 10 melewati `max_connections` menghasilkan kode 53300; dengan PgBouncer tidak. Target `make beban` (melanjutkan `make beban` api-t4 dan menyerap pengukuran beban `t5-skala`): beban berjadwal kedatangan tetap 1.388,9 request per detik (200.000 × 60 ÷ 86.400 × 10), status dan p95 sebagai batas di laptop, bukan kapasitas produksi; dua dari tiga pengukuran ADR 45 aturan 5 (kapasitas satu server dan role dan pool per service) dikerjakan di sini dengan batas yang sama seperti api-t4, dan yang ketiga (request berurutan per layar app) tetap milik tim Akun. Jalur uang tetap satu-satunya tempat uang bergerak (ledger, ADR 6 revisi) dan tidak memanggil jaringan di dalam transaction (ADR 22); Idempotency-Key ke ledger. Tes Go untuk aturan uang, partisi, dan outbox `stream`; kontrak OpenAPI v5 untuk endpoint baru (laporan, pengumuman, API mitra, cicilan; sumber pipeline tim Platform). Aturan lab (`plan/BRIEF-HALAMAN.md` bagian Tugas lab dan widget): schema sendiri di PostgreSQL bersama, `make -C labs/api-t5 run`, gagal keras bila hasil berbeda dari pernyataan naskah (bila lab membantah naskah, halaman memakai rekaman dan menulis selisihnya di `### USULAN-CERITA`; naskah tidak diubah dari tugas lab); rekaman `output/*.txt` dari database bersih, diulang identik (status, saldo, urutan; angka mesin sebagai batas yang diperiksa; kepala rekaman menulis versi alat); port dan nama kontainer lewat `labs/lab_env.*` (keputusan 860–864), tanpa 54333 tertulis tetap (`tools/cek_port_lab.py`); pihak ketiga tiruan lokal di container; uji mutasi atas kode uang dan keamanan (tes atau lab gagal karena sebab yang diuji, bukan koneksi mati); klaim dari dokumentasi diberi versi dan tanggal, dan yang tidak terbukti ditulis Tidak dijalankan atau [perlu verifikasi] di README dan rekaman.
- catatan: Jalur lab. Sumber `ERD5`, `W5-zona`, semua `t5-*`, dan halaman 5.2, 5.3, 5.4, 5.12, 5.16, 5.17, 5.29. Versi dasar R5-01 (PostgreSQL 17.11, Go 1.27.3 lawan 1.27.1 di api-t4 yang tidak dinaikkan, pgx v5.11.0, PgBouncer 1.26.1, Redis pin Tahap 3 lawan terbaru) dicek ulang saat lab ditulis. Menyerap bagian beban `labs/t5-skala` (folder lama tetap sebagai bahan, tidak diubah dan tidak dihapus: keputusan 1412). Bila bentuk akhir schema berbeda dari 3b, tulis selisihnya di badan PR dan `ERD5` memakai lab. Butuh Docker hidup (`docker info`); bila mati, parkir sampai pemilik menyetujui (TINJAUAN-PEMILIK Tahap 4 butir 1). ALOKASI: keputusan 1630–1633 (1630–1632 pelaksana, 1633 peninjau), ID riset bila perlu R5-270 sampai R5-274.

### lab-t5-replika · Lab t5-replika: replica streaming, baca sesudah tulis, replica sinkron, dan promosi

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: T5-siap, lab-api-t5
- selesai bila: Lab `labs/t5-replika` ditulis ulang di folder yang sama ke skema ledger `api-t5` (versi lama dengan skema saldo dan jeda buatan tetap di riwayat git; `replika.txt` lama diganti rekaman baru): replica streaming nyata dengan primary, satu standby asinkron untuk laporan, dan satu standby sinkron (PostgreSQL 17.11, versi dicek ulang; `ANY 1` dari dua kandidat sinkron Tidak dijalankan karena lab memakai satu kandidat; Patroni dan CloudNativePG Tidak dijalankan). Direkam: (a) replica menolak DML dan DDL; (b) jeda alami di bawah beban terukur sebagai batas, dan jeda buatan hanya untuk memperagakan dan ditulis begitu; (c) baca sesudah tulis tanpa token melihat saldo lama pada replica yang ditahan, dan dengan token LSN membaca dari primary sampai replica menyusul; (d) `remote_apply` menambah jeda commit dibanding `on` (batas); (e) standby sinkron yang dimatikan membuat commit macet, dan menurunkan jumlah standby sinkron melepasnya; (f) promosi replica sesudah koneksi WAL diputus kehilangan transaksi yang belum diterima, dan jumlahnya dihitung; (g) `statement_timeout` di replica menahan query yang akan dibatalkan karena konflik dengan replay WAL (`max_standby_streaming_delay` bawaan 30 detik). Port standby sinkron ketiga memakai variabel baru yang didaftarkan di `labs/README.md` dan `tools/cek_port_lab.py` (dua port replika yang ada: `LAB_REPLIKA_PRIMARY_PORT` dan `LAB_REPLIKA_REPLICA_PORT`). Lab ini berbagi `labs/api-t5` lewat mode rentan (pola api-t1, api-t3, dan api-t4), bukan salinan; sebelum mengubah api-t5 cek flag terhadap PR terbuka lain dan jalankan ulang `make cek` lab yang berbagi (peninjau menjalankannya lagi). Aturan lab (`plan/BRIEF-HALAMAN.md` bagian Tugas lab dan widget): schema sendiri di PostgreSQL bersama, `make -C labs/t5-replika run`, gagal keras bila hasil berbeda dari pernyataan naskah (bila lab membantah naskah, halaman memakai rekaman dan menulis selisihnya di `### USULAN-CERITA`; naskah tidak diubah dari tugas lab); rekaman `output/*.txt` dari database bersih, diulang identik (status, saldo, urutan; angka mesin sebagai batas yang diperiksa; kepala rekaman menulis versi alat); port dan nama kontainer lewat `labs/lab_env.*` (keputusan 860–864), tanpa 54333 tertulis tetap (`tools/cek_port_lab.py`); pihak ketiga tiruan lokal di container; uji mutasi atas kode uang dan keamanan (tes atau lab gagal karena sebab yang diuji, bukan koneksi mati); klaim dari dokumentasi diberi versi dan tanggal, dan yang tidak terbukti ditulis Tidak dijalankan atau [perlu verifikasi] di README dan rekaman.
- catatan: Jalur lab. Sumber `W5-lag` dan halaman 5.5, 5.6, 5.7, 5.8, 5.9. Lab lama `labs/t5-replika` (skema saldo lama, jeda replica 2 detik yang dibuat dengan sengaja; hanya bahan) ditulis ulang oleh tugas ini dan tidak diubah sebelumnya (keputusan 1412). Jeda replica buatan tidak boleh ditulis sebagai jeda alami. Butuh Docker hidup (`docker info`); bila mati, parkir sampai pemilik menyetujui (TINJAUAN-PEMILIK Tahap 4 butir 1). ALOKASI: keputusan 1634–1637 (1634–1636 pelaksana, 1637 peninjau), ID riset bila perlu R5-275 sampai R5-279.

### lab-t5-partisi · Lab t5-partisi: partisi posting, snapshot saldo, DETACH dan ATTACH

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: T5-siap, lab-api-t5
- selesai bila: Lab `labs/t5-partisi` di atas skema ledger `api-t5` (PostgreSQL 17.11, versi dicek ulang; pg_partman v5.5.0 hanya disebut) menggantikan bagian partisi `t5-skala`: `posting` dipartisi per bulan menurut `dibuat`. Direkam: (a) pruning terlihat di EXPLAIN untuk query satu bulan, dan query tanpa `dibuat` memindai semua partisi (Parallel Append); (b) PK tanpa kolom `dibuat` ditolak; (c) `DETACH PARTITION ... CONCURRENTLY` tidak bisa di dalam blok transaction dan tidak jalan bila ada partisi default; (d) DETACH dan DROP membuang satu bulan lebih cepat daripada DELETE dengan jumlah baris sama (batas, bukan nilai tunggal); (e) pemeriksaan saldo dengan snapshot membaca baris lebih sedikit daripada tanpa snapshot (jumlah baris dihitung, bukan waktu) dan hasilnya sama; (f) `ATTACH PARTITION` memindai tabel kecuali ada CHECK valid dan setara batas partisi, termasuk arsip yang dipulihkan ke tabel baru tanpa CHECK itu; (g) bila murah: partisi bulan depan belum ada saat bulan mulai (jam diperankan) membuat INSERT gagal, dan jurnal pembalik atas jurnal yang postingnya sudah diarsipkan tidak bisa dibuat dari database utama. Partisi lama dilepas dan diarsipkan, tidak dihapus (aturan ledger); berkas arsip diserahkan ke `t5-kms`. Lab ini berbagi `labs/api-t5` lewat mode rentan (pola api-t1, api-t3, dan api-t4), bukan salinan; sebelum mengubah api-t5 cek flag terhadap PR terbuka lain dan jalankan ulang `make cek` lab yang berbagi (peninjau menjalankannya lagi). Aturan lab (`plan/BRIEF-HALAMAN.md` bagian Tugas lab dan widget): schema sendiri di PostgreSQL bersama, `make -C labs/t5-partisi run`, gagal keras bila hasil berbeda dari pernyataan naskah (bila lab membantah naskah, halaman memakai rekaman dan menulis selisihnya di `### USULAN-CERITA`; naskah tidak diubah dari tugas lab); rekaman `output/*.txt` dari database bersih, diulang identik (status, saldo, urutan; angka mesin sebagai batas yang diperiksa; kepala rekaman menulis versi alat); port dan nama kontainer lewat `labs/lab_env.*` (keputusan 860–864), tanpa 54333 tertulis tetap (`tools/cek_port_lab.py`); pihak ketiga tiruan lokal di container; uji mutasi atas kode uang dan keamanan (tes atau lab gagal karena sebab yang diuji, bukan koneksi mati); klaim dari dokumentasi diberi versi dan tanggal, dan yang tidak terbukti ditulis Tidak dijalankan atau [perlu verifikasi] di README dan rekaman.
- catatan: Jalur lab. Sumber halaman 5.10, 5.11 dan bahan `t5-kms`. Menggantikan bagian partisi `labs/t5-skala` (`partisi.txt`: DETACH dan DROP 3 ms lawan DELETE 65 ms di skema saldo lama, hanya pola). `lb.txt` (dua instance, sesi di memori lawan token) tidak dikerjakan ulang: D2 sudah dilebur dan folder lama tetap sebagai bahan; penghapusan `labs/t5-skala` menunggu persetujuan pemilik (keputusan 1412, SETELAH-TAHAP-5). Butuh Docker hidup (`docker info`); bila mati, parkir sampai pemilik menyetujui (TINJAUAN-PEMILIK Tahap 4 butir 1). ALOKASI: keputusan 1638–1641 (1638–1640 pelaksana, 1641 peninjau), ID riset bila perlu R5-280 sampai R5-284.

### lab-t5-fanout · Lab t5-fanout: Kafka KRaft, relay outbox, consumer group, dan penyedia push tiruan

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: T5-siap, lab-api-t5
- selesai bila: Lab `labs/t5-fanout` di atas `api-t5`: Kafka 4.3 dengan KRaft satu broker (versi dicek ulang; halaman unduhan memuat 4.2.2 dan 4.3.1 dengan urutan tanggal janggal, [perlu verifikasi]; replication factor 3 Tidak dijalankan), relay outbox (`tujuan` bernilai `stream`) ke topik `pembayaran.tercatat` dan `pengumuman.kirim`, consumer group (franz-go v1.22.2 atau yang terbaru yang dicek; v1.22.1 pernah mengakui rekaman yang tidak ada di log, jadi consumer idempoten dengan `notifikasi_id`), dan penyedia push tiruan dengan kuota 10.000 per detik (600.000 per menit mengikuti dokumentasi satu penyedia) yang menjawab 429 di atasnya. Direkam: (a) satu pengumuman ditulis sebagai satu baris `pengumuman` dan satu event, bukan satu baris outbox per penerima (jumlah baris dihitung); (b) consumer group membagi partisi dan tiap penerima menerima tepat satu notifikasi akhir walau satu consumer dimatikan di tengah; (c) 429 di atas kuota dijawab backoff eksponensial dan jitter; (d) notifikasi uang dengan kelas lebih kecil tidak menunggu di belakang pengumuman, dan umur tertua uang tetap di bawah batas lab; (e) pemakaian pengirim diukur lawan hitungan naskah (L = 96,3 × 0,3 = 29; 8 dan 11 proses; 42 partisi untuk 167 pengirim; Hitungan atas Asumsi, lab memberi c dan t terukur). NATS JetStream, Redpanda, dan Debezium hanya disebut. Lab ini berbagi `labs/api-t5` lewat mode rentan (pola api-t1, api-t3, dan api-t4), bukan salinan; sebelum mengubah api-t5 cek flag terhadap PR terbuka lain dan jalankan ulang `make cek` lab yang berbagi (peninjau menjalankannya lagi). Aturan lab (`plan/BRIEF-HALAMAN.md` bagian Tugas lab dan widget): schema sendiri di PostgreSQL bersama, `make -C labs/t5-fanout run`, gagal keras bila hasil berbeda dari pernyataan naskah (bila lab membantah naskah, halaman memakai rekaman dan menulis selisihnya di `### USULAN-CERITA`; naskah tidak diubah dari tugas lab); rekaman `output/*.txt` dari database bersih, diulang identik (status, saldo, urutan; angka mesin sebagai batas yang diperiksa; kepala rekaman menulis versi alat); port dan nama kontainer lewat `labs/lab_env.*` (keputusan 860–864), tanpa 54333 tertulis tetap (`tools/cek_port_lab.py`); pihak ketiga tiruan lokal di container; uji mutasi atas kode uang dan keamanan (tes atau lab gagal karena sebab yang diuji, bukan koneksi mati); klaim dari dokumentasi diberi versi dan tanggal, dan yang tidak terbukti ditulis Tidak dijalankan atau [perlu verifikasi] di README dan rekaman.
- catatan: Jalur lab. Sumber `W5-fanout` dan halaman 5.14, 5.15. Pengumuman ke 1.000.000 HP diskalakan lalu diekstrapolasi, bukan dijalankan; kapasitas produksi tidak diklaim. Butuh Docker hidup (`docker info`); bila mati, parkir sampai pemilik menyetujui (TINJAUAN-PEMILIK Tahap 4 butir 1). ALOKASI: keputusan 1642–1645 (1642–1644 pelaksana, 1645 peninjau), ID riset bila perlu R5-285 sampai R5-289.

### lab-t5-service · Lab t5-service: mTLS, daftar jenis jurnal, dan OpenTelemetry Collector

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: T5-siap, lab-api-t5
- selesai bila: Lab `labs/t5-service` di atas `api-t5`: dua sampai tiga service (`pembayaran`, `cicilan` atau `notifikasi`, dan `ledger`) sebagai proses sendiri dengan mTLS di Go (`tls.Config` dengan `ClientAuth` `RequireAndVerifyClientCert`; sertifikat dari CA lokal yang dibuat lab; cert-manager v1.21.3 hanya disebut), daftar jenis jurnal per identitas di ledger, dan OpenTelemetry Collector (Go v1.47.0 dan Collector v0.163.0, versi dicek ulang) dengan tail sampling. Direkam: (a) pemanggil tanpa sertifikat gagal di handshake, dan sertifikat tanpa izin jenis jurnal dijawab 403; (b) tanpa mTLS dan daftar jenis jurnal (mode rentan di `api-t5`), pemanggil mana pun dengan key baru membuat jurnal; (c) permintaan yang sama dikirim dua kali menghasilkan satu jurnal; (d) `traceparent` merambat dari service pertama ke ledger, dan Collector menyimpan trace error dan membuang sebagian trace normal (jumlah trace dihitung). NetworkPolicy dan jaringan yang menegakkannya Tidak dijalankan [perlu verifikasi]; SPIRE dan service mesh hanya disebut. Lab ini berbagi `labs/api-t5` lewat mode rentan (pola api-t1, api-t3, dan api-t4), bukan salinan; sebelum mengubah api-t5 cek flag terhadap PR terbuka lain dan jalankan ulang `make cek` lab yang berbagi (peninjau menjalankannya lagi). Aturan lab (`plan/BRIEF-HALAMAN.md` bagian Tugas lab dan widget): schema sendiri di PostgreSQL bersama, `make -C labs/t5-service run`, gagal keras bila hasil berbeda dari pernyataan naskah (bila lab membantah naskah, halaman memakai rekaman dan menulis selisihnya di `### USULAN-CERITA`; naskah tidak diubah dari tugas lab); rekaman `output/*.txt` dari database bersih, diulang identik (status, saldo, urutan; angka mesin sebagai batas yang diperiksa; kepala rekaman menulis versi alat); port dan nama kontainer lewat `labs/lab_env.*` (keputusan 860–864), tanpa 54333 tertulis tetap (`tools/cek_port_lab.py`); pihak ketiga tiruan lokal di container; uji mutasi atas kode uang dan keamanan (tes atau lab gagal karena sebab yang diuji, bukan koneksi mati); klaim dari dokumentasi diberi versi dan tanggal, dan yang tidak terbukti ditulis Tidak dijalankan atau [perlu verifikasi] di README dan rekaman.
- catatan: Jalur lab. Sumber halaman 5.18, 5.19, 5.27 (bagian OpenTelemetry ADR 58). Ketergantungan komponen yang tak terbaca di dokumentasi ditulis [perlu verifikasi]. Butuh Docker hidup (`docker info`); bila mati, parkir sampai pemilik menyetujui (TINJAUAN-PEMILIK Tahap 4 butir 1). ALOKASI: keputusan 1646–1649 (1646–1648 pelaksana, 1649 peninjau), ID riset bila perlu R5-290 sampai R5-294.

### lab-t5-cicilan · Lab t5-cicilan: batch harian tahan crash, referensi unik, dan DBOS Go

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: T5-siap, lab-api-t5
- selesai bila: Lab `labs/t5-cicilan` di atas `api-t5` (mode rentan cicilan satu job): batch harian tahan crash, `jurnal.referensi` unik, dan DBOS Go v1.8.0 (MIT; versi dicek ulang) dibandingkan dengan tabel langkah buatan sendiri. Direkam: (a) batch yang dimatikan di antara jurnal dan penandaan, lalu diulang dengan jam ledger diperankan +25 jam, menghasilkan dua jurnal pada versi dengan Idempotency-Key saja dan satu jurnal dengan `referensi` unik; (b) job yang dijalankan dua kali serentak tidak menagih dua kali; (c) tabel langkah buatan dan DBOS Go dibandingkan atas kasus yang sama: hasil sama, jumlah baris dan kode yang harus ditulis berbeda (dihitung, bukan dinilai); (d) kompensasi lewat jurnal pembalik; (e) 13.333 angsuran per hari puncak pada 20 per detik = 667 detik (Hitungan atas Asumsi; lab memberi laju terukur sebagai batas). Temporal v1.32.1 hanya disebut (dokumentasinya belum dibuka). Lab ini berbagi `labs/api-t5` lewat mode rentan (pola api-t1, api-t3, dan api-t4), bukan salinan; sebelum mengubah api-t5 cek flag terhadap PR terbuka lain dan jalankan ulang `make cek` lab yang berbagi (peninjau menjalankannya lagi). Aturan lab (`plan/BRIEF-HALAMAN.md` bagian Tugas lab dan widget): schema sendiri di PostgreSQL bersama, `make -C labs/t5-cicilan run`, gagal keras bila hasil berbeda dari pernyataan naskah (bila lab membantah naskah, halaman memakai rekaman dan menulis selisihnya di `### USULAN-CERITA`; naskah tidak diubah dari tugas lab); rekaman `output/*.txt` dari database bersih, diulang identik (status, saldo, urutan; angka mesin sebagai batas yang diperiksa; kepala rekaman menulis versi alat); port dan nama kontainer lewat `labs/lab_env.*` (keputusan 860–864), tanpa 54333 tertulis tetap (`tools/cek_port_lab.py`); pihak ketiga tiruan lokal di container; uji mutasi atas kode uang dan keamanan (tes atau lab gagal karena sebab yang diuji, bukan koneksi mati); klaim dari dokumentasi diberi versi dan tanggal, dan yang tidak terbukti ditulis Tidak dijalankan atau [perlu verifikasi] di README dan rekaman.
- catatan: Jalur lab. Sumber halaman 5.20, 5.21. Pola rekaman Tahap 4 `labs/t4-modul/output/proses-mati.txt` bagian C (+23 jam satu jurnal, +25 jam dua; jam ledger diperankan) dipakai ulang untuk angsuran. Butuh Docker hidup (`docker info`); bila mati, parkir sampai pemilik menyetujui (TINJAUAN-PEMILIK Tahap 4 butir 1). ALOKASI: keputusan 1650–1653 (1650–1652 pelaksana, 1653 peninjau), ID riset bila perlu R5-295 sampai R5-299.

### lab-t5-rollout · Lab t5-rollout: k3d, Argo Rollouts, HPA, dan sakelar

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: T5-siap, lab-api-t5
- selesai bila: Lab `labs/t5-rollout` (k3d v5.9.0 dengan k3s v1.37.1+k3s1, Argo Rollouts v1.10.1, Gateway API; versi dicek ulang) di atas image `api-t5`: tiga pod otorisasi kartu dan satu sakelar di tabel `sakelar`. Direkam: (a) `setWeight` 5 dengan 3 replika tanpa traffic router menghasilkan 0 atau 1 dari 3 pod (aturan pembulatan terekam; apakah minimal satu pod dipaksa [perlu verifikasi] sampai terekam), dan 5% butuh 20 replika; (b) dengan bobot Gateway API (bila plugin berjalan di k3d) bobot 5% terukur dari hitungan permintaan, kalau tidak Tidak dijalankan dengan sebabnya; (c) analisis yang gagal membalik rollout; (d) tiga pod membaca satu sakelar dari tabel dan semuanya berhenti menyetujui dalam jendela cache (5 detik, Asumsi), dan sakelar tak terbaca dijawab tolak yang eksplisit (penerbit tiruan membaca non-200 sebagai timeout dan menyetujui, ADR 42); (e) HPA menambah replika menurut metrik. Argo CD v3.5.6 Tidak dijalankan (butuh repositori Git yang terjangkau dari dalam cluster), jadi bentrok HPA dan Argo CD soal jumlah replika tetap [perlu verifikasi]. Lab ini berbagi `labs/api-t5` lewat mode rentan (pola api-t1, api-t3, dan api-t4), bukan salinan; sebelum mengubah api-t5 cek flag terhadap PR terbuka lain dan jalankan ulang `make cek` lab yang berbagi (peninjau menjalankannya lagi). Aturan lab (`plan/BRIEF-HALAMAN.md` bagian Tugas lab dan widget): schema sendiri di PostgreSQL bersama, `make -C labs/t5-rollout run`, gagal keras bila hasil berbeda dari pernyataan naskah (bila lab membantah naskah, halaman memakai rekaman dan menulis selisihnya di `### USULAN-CERITA`; naskah tidak diubah dari tugas lab); rekaman `output/*.txt` dari database bersih, diulang identik (status, saldo, urutan; angka mesin sebagai batas yang diperiksa; kepala rekaman menulis versi alat); port dan nama kontainer lewat `labs/lab_env.*` (keputusan 860–864), tanpa 54333 tertulis tetap (`tools/cek_port_lab.py`); pihak ketiga tiruan lokal di container; uji mutasi atas kode uang dan keamanan (tes atau lab gagal karena sebab yang diuji, bukan koneksi mati); klaim dari dokumentasi diberi versi dan tanggal, dan yang tidak terbukti ditulis Tidak dijalankan atau [perlu verifikasi] di README dan rekaman.
- catatan: Jalur lab. Sumber halaman 5.13 (HPA), 5.22, 5.23. k3d memakai Docker: Docker harus hidup dan sumber daya laptop dicek (`df -h /System/Volumes/Data`) sebelum run panjang. Rekaman kill switch Tahap 4 `labs/t4-kartu/output/kill-switch.txt` bagian B adalah pola satu proses. Butuh Docker hidup (`docker info`); bila mati, parkir sampai pemilik menyetujui (TINJAUAN-PEMILIK Tahap 4 butir 1). ALOKASI: keputusan 1654–1657 (1654–1656 pelaksana, 1657 peninjau), ID riset bila perlu R5-300 sampai R5-304.

### lab-t5-waf · Lab t5-waf: Coraza, kuota per mitra, dan tanda tangan bertimestamp

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: T5-siap, lab-api-t5
- selesai bila: Lab `labs/t5-waf` di atas `api-t5`: gateway tiruan di tepi dengan Coraza v3.8.1 dan OWASP CRS v4.30.0 (mode blokir; dipakai sebagai middleware Go), token bucket per `mitra_id` di Redis (100 per detik dan 20 berjalan, Asumsi), kunci API dan HMAC-SHA256 bertimestamp per mitra (pola `t4-webhook`), dan POS tiruan. Direkam: (a) satu mitra yang melebihi kuota mendapat 429 sementara mitra lain tetap 200; (b) Coraza dengan CRS memblokir payload serangan umum dengan 403 dan meloloskan payload POS yang sah; (c) POST tanpa Idempotency-Key dijawab 400; (d) HMAC yang salah atau timestamp lama ditolak, dan kunci mitra A tidak membuka merchant mitra B; (e) serangan volumetrik lapisan 3 dan 4 Tidak dijalankan. Tidak ada perintah yang bisa diarahkan ke target di luar container. Rate limit enumerasi per akun dan IP tetap berlaku (ADR 27). Lab ini berbagi `labs/api-t5` lewat mode rentan (pola api-t1, api-t3, dan api-t4), bukan salinan; sebelum mengubah api-t5 cek flag terhadap PR terbuka lain dan jalankan ulang `make cek` lab yang berbagi (peninjau menjalankannya lagi). Aturan lab (`plan/BRIEF-HALAMAN.md` bagian Tugas lab dan widget): schema sendiri di PostgreSQL bersama, `make -C labs/t5-waf run`, gagal keras bila hasil berbeda dari pernyataan naskah (bila lab membantah naskah, halaman memakai rekaman dan menulis selisihnya di `### USULAN-CERITA`; naskah tidak diubah dari tugas lab); rekaman `output/*.txt` dari database bersih, diulang identik (status, saldo, urutan; angka mesin sebagai batas yang diperiksa; kepala rekaman menulis versi alat); port dan nama kontainer lewat `labs/lab_env.*` (keputusan 860–864), tanpa 54333 tertulis tetap (`tools/cek_port_lab.py`); pihak ketiga tiruan lokal di container; uji mutasi atas kode uang dan keamanan (tes atau lab gagal karena sebab yang diuji, bukan koneksi mati); klaim dari dokumentasi diberi versi dan tanggal, dan yang tidak terbukti ditulis Tidak dijalankan atau [perlu verifikasi] di README dan rekaman.
- catatan: Jalur lab. Sumber halaman 5.24, 5.25. Lab serangan hanya ke container lab sendiri (PROTOKOL j); plugin Caddy untuk Coraza hanya disebut ("needs a maintainer", R5-21). Butuh Docker hidup (`docker info`); bila mati, parkir sampai pemilik menyetujui (TINJAUAN-PEMILIK Tahap 4 butir 1). ALOKASI: keputusan 1658–1661 (1658–1660 pelaksana, 1661 peninjau), ID riset bila perlu R5-305 sampai R5-309.

### lab-t5-kms · Lab t5-kms: envelope encryption dengan OpenBao transit

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: T5-siap, lab-api-t5, lab-t5-partisi
- selesai bila: Lab `labs/t5-kms` (Go; OpenBao v2.7.2 atau lebih baru mode dev dengan mesin transit, versi dicek ulang; SoftHSM 2.7.0 lewat PKCS#11 hanya sebagai Ilustrasi) di atas file arsip dari `t5-partisi`: envelope encryption AES-256-GCM per file dengan nonce acak 96 bit (`NewGCMWithRandomNonce`, versi Go dicek) dan data key terbungkus. Direkam: (a) file arsip dibuka tanpa KMS tidak terbaca; (b) satu byte yang diubah gagal autentikasi GCM; (c) data key terbungkus dengan versi KEK lama bisa dibuka sampai `min_decryption_version` dinaikkan; (d) rotasi KEK dengan pembungkusan ulang diperiksa di OpenBao transit, dan bila `rotate` atau pembungkusan ulang tidak didukung seperti ditulis ADR 57, halaman menulis yang terekam [perlu verifikasi]; (e) checksum tiap file dicatat di `arsip_partisi` dan di jangkar harian; (f) umur KEK 9,8 tahun untuk satu data key per posting dihitung (2^32 ÷ 438 juta, Hitungan atas Asumsi). SoftHSM dan client Go-nya [perlu verifikasi], diperagakan sebagai Ilustrasi. Aturan lab (`plan/BRIEF-HALAMAN.md` bagian Tugas lab dan widget): schema sendiri di PostgreSQL bersama, `make -C labs/t5-kms run`, gagal keras bila hasil berbeda dari pernyataan naskah (bila lab membantah naskah, halaman memakai rekaman dan menulis selisihnya di `### USULAN-CERITA`; naskah tidak diubah dari tugas lab); rekaman `output/*.txt` dari database bersih, diulang identik (status, saldo, urutan; angka mesin sebagai batas yang diperiksa; kepala rekaman menulis versi alat); port dan nama kontainer lewat `labs/lab_env.*` (keputusan 860–864), tanpa 54333 tertulis tetap (`tools/cek_port_lab.py`); pihak ketiga tiruan lokal di container; uji mutasi atas kode uang dan keamanan (tes atau lab gagal karena sebab yang diuji, bukan koneksi mati); klaim dari dokumentasi diberi versi dan tanggal, dan yang tidak terbukti ditulis Tidak dijalankan atau [perlu verifikasi] di README dan rekaman.
- catatan: Jalur lab. Sumber halaman 5.26. Lab Tahap 4 `t4-infra` memakai OpenBao v2.7.2 (R5-01 menulis v2.7.1). Cara OpenBao mode dev berjalan di lab [perlu verifikasi]. Butuh Docker hidup (`docker info`); bila mati, parkir sampai pemilik menyetujui (TINJAUAN-PEMILIK Tahap 4 butir 1). ALOKASI: keputusan 1662–1665 (1662–1664 pelaksana, 1665 peninjau), ID riset bila perlu R5-310 sampai R5-314.

### lab-t5-gabung · Lab t5-gabung: skor risiko tiga proses lawan satu proses

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: T5-siap, lab-api-t5
- selesai bila: Lab `labs/t5-gabung` (Go murni, kecil; peraga untuk bagian "kapan menggabungkan kembali" ADR 50): dua versi alur skor risiko (data akun, perangkat, dan riwayat dalam anggaran 50 ms): satu dipecah jadi tiga proses dengan queue, satu dalam satu proses. Direkam: jumlah panggilan jaringan per transaksi dihitung, dan p95 diukur sebagai rasio kedua versi, bukan nilai mutlak (PROPOSAL). Skor risiko bukan fitur PRD v5 dan hanya dipakai sebagai peraga; lab tidak mengklaim bahwa skor produksi cocok. Aturan lab (`plan/BRIEF-HALAMAN.md` bagian Tugas lab dan widget): schema sendiri di PostgreSQL bersama, `make -C labs/t5-gabung run`, gagal keras bila hasil berbeda dari pernyataan naskah (bila lab membantah naskah, halaman memakai rekaman dan menulis selisihnya di `### USULAN-CERITA`; naskah tidak diubah dari tugas lab); rekaman `output/*.txt` dari database bersih, diulang identik (status, saldo, urutan; angka mesin sebagai batas yang diperiksa; kepala rekaman menulis versi alat); port dan nama kontainer lewat `labs/lab_env.*` (keputusan 860–864), tanpa 54333 tertulis tetap (`tools/cek_port_lab.py`); pihak ketiga tiruan lokal di container; uji mutasi atas kode uang dan keamanan (tes atau lab gagal karena sebab yang diuji, bukan koneksi mati); klaim dari dokumentasi diberi versi dan tanggal, dan yang tidak terbukti ditulis Tidak dijalankan atau [perlu verifikasi] di README dan rekaman.
- catatan: Jalur lab. Sumber halaman 5.13. Pola `t4-qr`: kecil dan murah. Butuh Docker hidup (`docker info`); bila mati, parkir sampai pemilik menyetujui (TINJAUAN-PEMILIK Tahap 4 butir 1). ALOKASI: keputusan 1666–1669 (1666–1668 pelaksana, 1669 peninjau), ID riset bila perlu R5-315 sampai R5-319.

### ERD5 · ERD Tahap 5 dari skema lab

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: lab-api-t5
- selesai bila: `tools/erd.py` membaca skema akhir lab utama Tahap 5 dan menulis `situs/data/erd/tahap-5.json` beserta selisih terhadap Tahap 4; `--cek` di gerbang mencakup Tahap 5; widget ERD bertumbuh menampilkan Tahap 5 berdampingan dengan Tahap 4 di `/uji/erd/`; selisih dengan mermaid naskah 3b tercatat (lab yang benar).
- catatan: `T5-siap` menambahkan lab utama Tahap 5 ke `bergantung` tugas ini. Tabel partisi `posting` dan PK komposit `(id, dibuat)` harus terbaca benar oleh `tools/erd.py` (30 tabel, enam schema service, 0 foreign key lintas service dari katalog); pembagian service yang ditampilkan adalah bentuk akhir dari `api-t5`. ALOKASI: keputusan 1670–1673 (1670–1672 pelaksana, 1673 peninjau); tanpa ID riset.

### W5-lag · Simulasi replication lag

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: ERD5, lab-t5-replika
- selesai bila: Widget baru (skill visualisasi) dibuat sebelum halaman yang memakainya: tulis ke primary, baca dari replica dengan lag yang bisa diubah; kasus saldo lama setelah transfer; read-your-writes sebagai perbaikan; dari rekaman lab replica Tahap 5. Tebak dulu sebelum hasil, satu hal yang bisa diubah pembaca, chip sumber ke rekaman atau label Simulasi/Ilustrasi, keyboard penuh, `prefers-reduced-motion` tanpa gerak dengan fungsi tetap, teks sebagai DOM (bukan di SVG), token warna gelap/terang, dimuat hanya di halaman yang memakainya, ukuran JS dicatat di `plan/AUDIT-TAMPILAN.md`, diuji di halaman `/uji/`, axe 0, tes Vitest untuk logika murni.
- catatan: Dipakai 5.7. Rekaman `t5-replika` menggantikan label Simulasi bila sudah ada. ALOKASI: keputusan 1674–1677 (1674–1676 pelaksana, 1677 peninjau); tanpa ID riset.

### W5-fanout · Simulasi fan-out notifikasi

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: ERD5, lab-t5-fanout
- selesai bila: Widget baru (skill visualisasi) dibuat sebelum halaman yang memakainya: satu kejadian ke banyak penerima, antrean per partisi, backpressure; ubah jumlah penerima; dari lab Tahap 5 atau berlabel Simulasi. Tebak dulu sebelum hasil, satu hal yang bisa diubah pembaca, chip sumber ke rekaman atau label Simulasi/Ilustrasi, keyboard penuh, `prefers-reduced-motion` tanpa gerak dengan fungsi tetap, teks sebagai DOM (bukan di SVG), token warna gelap/terang, dimuat hanya di halaman yang memakainya, ukuran JS dicatat di `plan/AUDIT-TAMPILAN.md`, diuji di halaman `/uji/`, axe 0, tes Vitest untuk logika murni.
- catatan: Dipakai 5.15. Berlabel Simulasi bila rekaman `t5-fanout` belum ada. ALOKASI: keputusan 1678–1681 (1678–1680 pelaksana, 1681 peninjau); tanpa ID riset.

### W5-zona · Peta zona arsitektur

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: ERD5
- selesai bila: Widget baru (skill visualisasi) dibuat sebelum halaman yang memakainya: lima lapisan dan batas tim Tahap 5 (PROPOSAL System design final) di atas DiagramArsitektur; klik zona membuka service, data, dan halaman; ledger tetap satu-satunya tempat uang bergerak. Tebak dulu sebelum hasil, satu hal yang bisa diubah pembaca, chip sumber ke rekaman atau label Simulasi/Ilustrasi, keyboard penuh, `prefers-reduced-motion` tanpa gerak dengan fungsi tetap, teks sebagai DOM (bukan di SVG), token warna gelap/terang, dimuat hanya di halaman yang memakainya, ukuran JS dicatat di `plan/AUDIT-TAMPILAN.md`, diuji di halaman `/uji/`, axe 0, tes Vitest untuk logika murni.
- catatan: Dipakai 5.2. Isinya rancangan (Asumsi desain), jadi widget tidak menunggu lab selain `ERD5`. ALOKASI: keputusan 1682–1685 (1682–1684 pelaksana, 1685 peninjau); tanpa ID riset.

### 5.1 · PRD v5: Rekeningo untuk satu negara

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: T5-siap
- selesai bila: halaman PRD 5.1 sesuai `plan/CERITA-TAHAP-5.md` bagian 1 dan peta halaman Tahap 5; tanpa lab; jawaban atas tebakan pembaca di 4.31 (dari ADR Tahap 4, mana yang pecah lebih dulu?) dibuka dari naskah bagian 1: ADR 36, 37, 44, dan 45 dengan kalimat yang sudah tertulis di halaman ADR-nya (Asumsi: penalaran, bukan urutan kejadian yang direkam), dan dua pilihan lain (ADR 40 dan 41) tidak cocok dengan isi PRD v5; ADR lama yang menulis Tahap 5 atau yang syarat salahnya cocok dengan PRD v5 dibaca ulang dan ditulis sebagai syarat yang sudah terpenuhi, bukan kejutan (daftar naskah bagian 1: ADR 4, 6, 12, 14, 26, 33, 34, 36, 38, 42, 44, 45 dan halaman 1.13; hitung ulang dari daftar itu, bukan dari kalimat pembukanya); user, ruang lingkup P0 sampai P2 (99,9% per 30 hari, RPO nol, RTO 15 menit berlabel Asumsi produk), metrik, risiko Sinta, tiga pertanyaan terbuka, dan syarat Pak Hadi; "uang elektronik nasional" tanpa klaim izin atau regulasi; angka beban hanya dari tabel naskah bagian 3 dan berlabel Asumsi; 3 transaksi sebagai dasar dan hasil dengan 2 di sebelahnya.; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Template PRD seperti 4.1. Hanya bergantung pada `T5-siap` supaya bisa jalan selama lab menunggu Docker. Nama tahap "Satu database tidak cukup": satu primary belum terbukti kurang untuk menulis (bagian 3), jadi nama dijelaskan di halaman. ALOKASI: keputusan 1500–1503 (1500–1502 pelaksana, 1503 peninjau), ID riset R5-110 sampai R5-114.

### 5.2 · Dari fitur ke pekerjaan teknis v5 dan inti: salinan boleh banyak, uang bergerak di satu tempat

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.1, T5-siap, lab-api-t5, W5-zona
- selesai bila: halaman Fitur → teknis 5.2 sesuai `plan/CERITA-TAHAP-5.md` bagian 2 dan 3 (inti) dan peta halaman Tahap 5; rekaman dari `labs/api-t5` (mode rentan laporan di primary); widget W5-zona (klik tiap zona dari lima lapisan dan tandai zona tempat uang bergerak, lalu tabel "kejadian lawan tiga hal yang harus selalu benar" terisi); tabel tujuh baris naskah bagian 2 (fitur, app, backend, database, konsep) dengan tautan ke halaman konsep; pertanyaan pertama Tahap 5 dirumuskan sebelum kode: salinan boleh banyak, tetapi tempat uang bergerak hanya satu; tiga hal yang selalu benar (uang hanya lewat ledger, keputusan dari sumber yang sama, pekerjaan panjang benar bila diulang) dan tabel delapan kejadian bagian 3 (Terjaga, Rusak, Tidak berlaku); kalimat M42 dan M47 di tabel itu penalaran dari dokumentasi (berlabel), bukan kejadian yang direkam; tiga pertanyaan yang ditanam (Wulan, Pak Hadi, Dewi); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Inti (bagian 3) tidak punya halaman sendiri dan ikut di sini (pilihan draf 17). Tetap satu halaman; bila baca lebih dari ±15 menit, tulis di SETELAH-TAHAP-5 dan usulkan pecah ke pemilik (keputusan 1413). Memakai widget W5-zona. Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1504–1507 (1504–1506 pelaksana, 1507 peninjau), ID riset R5-115 sampai R5-119.

### 5.3 · Skema data: ERD Tahap 4 → Tahap 5 dan pertumbuhannya

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.2, T5-siap, lab-api-t5, ERD5
- selesai bila: halaman Konsep 5.3 sesuai `plan/CERITA-TAHAP-5.md` bagian 3b dan peta halaman Tahap 5; rekaman dari `labs/api-t5` (30 tabel dalam enam schema service; 21 foreign key Tahap 4 lawan 0 lintas service, dihitung dari katalog); widget ERD bertumbuh (Tahap 4 di kiri, Tahap 5 di kanan, dari `situs/data/erd/tahap-5.json` hasil `ERD5`); tabel "Apa yang berubah dan kenapa" (14 baris naskah), tabel "Service (schema)" sebagai rancangan yang dibandingkan dengan bentuk akhir lab, dan tabel pertumbuhan Tahap 4 sampai 6 (tiga besaran 43,8, 65,7, dan 109,5 GB yang satu orde: ukuran bukan alasan partisi); selisih dengan blok mermaid naskah 3b ditulis (lab yang benar); sumber 3 vs 2 transaksi dijelaskan satu kalimat; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Pola seperti 4.5. Bila blok mermaid 3b berbeda dari skema lab, halaman memakai skema lab dan menulis selisihnya di `### USULAN-CERITA`. Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1508–1511 (1508–1510 pelaksana, 1511 peninjau), ID riset R5-120 sampai R5-124.

### 5.4 · M40: Pembayaran melambat saat merchant membuka laporan

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.3, T5-siap, lab-api-t5
- selesai bila: halaman Masalah 5.4 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (M40) dan peta halaman Tahap 5; rekaman dari `labs/api-t5` (bagian `laporan`, mode rentan laporan di primary); widget alur; yang dikira (server kurang kuat; cache laporan 30 detik di Redis seperti ADR 28) sebelum yang sebenarnya (laporan dan pembayaran memakai primary yang sama; 20.000 merchant online dengan polling 30 detik = 666,7 query per detik, 9,6 kali transaksi uang puncak, CPU 167% pada query 20 ms di 8 vCPU: Hitungan atas Asumsi; satu perangkat per merchant memanggil sekali per 30 detik, sama dengan umur isi cache, jadi hit rate hampir nol, dihitung dari jumlah hit); p95 pembayaran dengan dan tanpa laporan hanya sebagai batas, dan bila selisihnya tidak terlihat di laptop halaman menulisnya dan 666,7 tetap Asumsi; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Gejala berlabel Ilustrasi sampai ada rekaman; yang dikira sebelum yang sebenarnya; konsep tidak di dalam adegan; angka kejadian naskah yang tidak terulang di lab berlabel Ilustrasi dan masuk `### USULAN-CERITA`. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Gejala Kamis 11.40 berlabel Ilustrasi. L baca 26,4 koneksi (528% dari pemicu ADR 45) memakai Hitungan atas Asumsi. Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1512–1515 (1512–1514 pelaksana, 1515 peninjau), ID riset R5-125 sampai R5-129.

### 5.5 · Read replica dan model baca untuk laporan + ADR 46

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.4, T5-siap, lab-t5-replika
- selesai bila: halaman Konsep + ADR 5.5 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (M40) dan tabel ADR 46 (menyerap D2 dan D3 lama) dan peta halaman Tahap 5; rekaman dari `labs/t5-replika` (replica menolak DML dan DDL; `statement_timeout` di replica menahan query yang akan dibatalkan); widget banding (laporan di primary lawan di replica, atau polling lawan push); ADR 46: satu read replica asinkron untuk laporan dan bacaan berat, yang memutuskan uang dibaca dari primary di dalam transaction (ADR 45 aturan 2), laporan periode dari `ringkasan_merchant_harian` yang diisi job idempoten, `statement_timeout` 20 detik (Asumsi) karena `max_standby_streaming_delay` bawaan 30 detik, `hot_standby_feedback` tetap mati; opsi cache Redis, index tambahan, polling diganti push, database analitik lewat CDC (Debezium hanya disebut); "kapan salah" dengan pembanding L baca 26,4 koneksi (528% dari pemicu 5) dan jeda replica di atas 5 detik (pembanding jeda 1 detik, Asumsi); pre-mortem; bagian "Di stack lain" memakai enam stack dengan versi yang dijalankan atau label Tidak dijalankan; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman bila labnya ada, kalau tidak berlabel Tidak dijalankan. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Halaman lama D2 (Scaling) dan D3 (Replica dan consistency) dilebur ke sini dan 5.7; D2 juga ke 5.13 (keputusan 1410). Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1516–1519 (1516–1518 pelaksana, 1519 peninjau), ID riset R5-130 sampai R5-134.

### 5.6 · M41: Riwayat belum memuat pembayaran yang baru dibuat

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.5, T5-siap, lab-t5-replika
- selesai bila: halaman Masalah 5.6 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (M41) dan peta halaman Tahap 5; rekaman dari `labs/t5-replika` (baca sesudah tulis tanpa token melihat saldo lama pada replica yang ditahan); widget alur; yang dikira (pembayaran belum tercatat, app menyimpan data lama; Raka menambah muat ulang otomatis) sebelum yang sebenarnya (sesudah ADR 46 tim Akun memindahkan bacaan riwayat dan saldo tampil ke replica; replica asinkron tertinggal; saldo yang menentukan bayar tetap dibaca dari primary jadi uang aman; memindahkan riwayat dan saldo tampil ke replica melompati aturan 2 ADR 45 tanpa ADR); rekaman lama `t5-replika/output/replika.txt` bagian A dikutip hanya sebagai pola dengan label skema lama dan jeda buatan, dan hanya bila rekaman baru belum ada; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Gejala berlabel Ilustrasi sampai ada rekaman; yang dikira sebelum yang sebenarnya; konsep tidak di dalam adegan; angka kejadian naskah yang tidak terulang di lab berlabel Ilustrasi dan masuk `### USULAN-CERITA`. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Jeda ±2 detik naskah berlabel Ilustrasi kecuali rekaman baru menghasilkannya. Jalur mobile. Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1520–1523 (1520–1522 pelaksana, 1523 peninjau), ID riset R5-135 sampai R5-139.

### 5.7 · Replication lag dan read-your-writes + ADR 47

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.6, T5-siap, lab-t5-replika, W5-lag
- selesai bila: halaman Konsep + ADR 5.7 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (M41) dan tabel ADR 47 (menyerap D3 lama) dan peta halaman Tahap 5; rekaman dari `labs/t5-replika` (token LSN; `remote_apply` menambah jeda commit dibanding `on` sebagai batas); widget W5-lag (tulis ke primary, baca dari replica dengan jeda yang bisa diubah; aturan baca: replica biasa, token LSN, `remote_apply`); ADR 47: tiga kelas baca, token LSN di header dan dikirim app selama 30 detik (Asumsi), app versi lama tanpa token membaca dari primary (ADR 10); opsi `remote_apply` untuk semua commit, jendela waktu tetap 5 detik, semua baca ke primary, menyimpan transaksi sendiri di app; "kapan salah" dengan pembanding 5,0% (69,4 ÷ 1.388,9, Hitungan) dan jeda replica lebih dari 30 detik; token sesudah failover [perlu verifikasi]; pre-mortem; bagian "Di stack lain" memakai enam stack dengan versi yang dijalankan atau label Tidak dijalankan; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman bila labnya ada, kalau tidak berlabel Tidak dijalankan. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Jalur mobile (token LSN dikirim app). Pola widget baru: tebak dulu, satu hal yang diubah, chip sumber. Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1524–1527 (1524–1526 pelaksana, 1527 peninjau), ID riset R5-140 sampai R5-144.

### 5.8 · M42: Database utama mati, dua top-up hilang

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.7, T5-siap, lab-t5-replika
- selesai bila: halaman Masalah 5.8 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (M42) dan peta halaman Tahap 5; rekaman dari `labs/t5-replika` (promosi replica sesudah koneksi WAL diputus kehilangan transaksi yang belum diterima, jumlahnya dihitung); widget alur; yang dikira (gateway tidak mengirim webhook; minta kirim ulang; backup harian) sebelum yang sebenarnya (replica asinkron belum menerima commit terakhir; handler sudah membalas 2xx sesudah COMMIT (ADR 34) jadi gateway tidak mengulang; 1 detik × 69,4 = 69 transaksi pada puncak, trx 2: 46, Hitungan atas Asumsi, dan pukul 02.10 hanya dua; hanya rekonsiliasi menemukannya (`tidak_di_ledger`, ADR 35); 23 menit melewati RTO 15 menit); PostgreSQL tidak punya perangkat deteksi kegagalan dan promosi diserahkan ke administrator (dokumentasi dengan versi); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Gejala berlabel Ilustrasi sampai ada rekaman; yang dikira sebelum yang sebenarnya; konsep tidak di dalam adegan; angka kejadian naskah yang tidak terulang di lab berlabel Ilustrasi dan masuk `### USULAN-CERITA`. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Rupiah dan jam kejadian berlabel Ilustrasi. Kalimat dengan dua fakta (balasan 2xx sesudah COMMIT dan kehilangan commit) ditelusuri per fakta ke kode. Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1528–1531 (1528–1530 pelaksana, 1531 peninjau), ID riset R5-145 sampai R5-149.

### 5.9 · RPO, RTO, replica sinkron, dan failover + ADR 48

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.8, T5-siap, lab-t5-replika
- selesai bila: halaman Konsep + ADR 5.9 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (M42) dan tabel ADR 48 dan peta halaman Tahap 5; rekaman dari `labs/t5-replika` (standby sinkron yang dimatikan membuat commit macet, dan menurunkan jumlah standby sinkron melepasnya; `ANY 1` dari dua kandidat Tidak dijalankan); widget tebak (apa yang hilang bila primary mati?); ADR 48: `ANY 1 (r1, r2)` dan `synchronous_commit = on`, replica laporan terpisah dan asinkron, failover otomatis dengan fencing (Patroni v4.1.5 atau CloudNativePG v1.30.1 Tidak dijalankan; di lab promosi manual), latihan bulanan SRE terhadap RTO 15 menit; opsi replica asinkron saja (RPO 69 transaksi), `FIRST 1`, `remote_apply` untuk ledger, layanan terkelola (Tidak dijalankan; tidak dipilih karena tidak bisa direkam: ADR 59); "kapan salah" tambahan p95 commit di atas 50 ms, pulih lebih dari 15 menit, dan kedua standby mati; RPO nol dan RTO 15 menit adalah Asumsi produk PRD v5 dan menjawab pemicu ADR 33; pre-mortem; bagian "Di stack lain" memakai enam stack dengan versi yang dijalankan atau label Tidak dijalankan; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman bila labnya ada, kalau tidak berlabel Tidak dijalankan. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Jalur devops. Satu kandidat sinkron di lab; `ANY 1` dari dua kandidat tetap Tidak dijalankan. Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1532–1535 (1532–1534 pelaksana, 1535 peninjau), ID riset R5-150 sampai R5-154.

### 5.10 · M43: Pemeriksaan saldo harian selesai pukul 14.20

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.9, T5-siap, lab-t5-partisi
- selesai bila: halaman Masalah 5.10 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (M43) dan peta halaman Tahap 5; rekaman dari `labs/t5-partisi` (pemeriksaan tanpa snapshot lawan dengan snapshot membaca baris lebih sedikit dengan hasil sama; jumlah baris dihitung, bukan waktu); widget alur; yang dikira (disk dan CPU kurang; ledger pindah ke database khusus) sebelum yang sebenarnya (pemeriksaan harian membaca semua posting sejak awal: 438 juta baris (109,5 GB) setelah satu tahun dan 1.314 juta setelah tiga, Hitungan atas Asumsi; index riwayat mempercepat satu akun, bukan pemeriksaan semua akun; ukuran bukan masalahnya: batas 32 TB per tabel = 292 tahun data; yang bermasalah adalah pekerjaan yang membaca seluruh tabel tiap malam, VACUUM, dan membuang data lama; posting tidak boleh dihapus); rekaman lama `t5-skala/output/partisi.txt` hanya sebagai pola dengan label skema lama; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Gejala berlabel Ilustrasi sampai ada rekaman; yang dikira sebelum yang sebenarnya; konsep tidak di dalam adegan; angka kejadian naskah yang tidak terulang di lab berlabel Ilustrasi dan masuk `### USULAN-CERITA`. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Pukul 14.20 lawan target 06.00 berlabel Ilustrasi. Satu bentuk per angka: 438 juta dan 109,5 GB (trx 3), trx 2 di sebelahnya. Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1536–1539 (1536–1538 pelaksana, 1539 peninjau), ID riset R5-155 sampai R5-159.

### 5.11 · Partisi tabel ledger dan snapshot saldo + ADR 49

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.10, T5-siap, lab-t5-partisi
- selesai bila: halaman Konsep + ADR 5.11 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (M43) dan tabel ADR 49 dan peta halaman Tahap 5; rekaman dari `labs/t5-partisi` (pruning di EXPLAIN untuk query satu bulan, query tanpa `dibuat` memindai semua partisi, PK tanpa `dibuat` ditolak, DETACH CONCURRENTLY tidak di dalam blok transaction dan tidak jalan bila ada partisi default, DETACH dan DROP lawan DELETE sebagai batas, ATTACH memindai tabel kecuali ada CHECK valid); widget runsql (PGlite) dengan data cukup besar yang menulis jumlah barisnya; ADR 49: partisi per bulan menurut `dibuat`, PK `(id, dibuat)`, partisi bulan depan dibuat sebelum bulannya mulai (pg_partman v5.5.0 disebut), tanpa partisi default, snapshot saldo akhir bulan, partisi lebih dari 13 bulan (Asumsi) dilepas dan diarsipkan, tidak dihapus; opsi satu tabel dan index, sharding, database ledger khusus (TigerBeetle hanya disebut), partisi hash; "kapan salah" (satu primary tidak menampung 69,4 transaksi uang per detik, partisi bulan depan belum ada, jendela koreksi lebih panjang dari 13 bulan; tabel `jurnal` 219 juta baris per tahun tidak dipartisi, Hitungan); pre-mortem; bagian "Di stack lain" memakai enam stack dengan versi yang dijalankan atau label Tidak dijalankan; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman bila labnya ada, kalau tidak berlabel Tidak dijalankan. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Menggantikan bagian partisi `labs/t5-skala` (halaman memakai `t5-partisi`). Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1540–1543 (1540–1542 pelaksana, 1543 peninjau), ID riset R5-160 sampai R5-164.

### 5.12 · M44: Rilis Kamis menunggu lima tim

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.11, T5-siap, lab-api-t5
- selesai bila: halaman Masalah 5.12 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (M44) dan peta halaman Tahap 5; rekaman dari `labs/api-t5` (schema dan role per service; foreign key lintas schema service 0, dihitung dari katalog); widget alur; yang dikira (tambah runner CI dan jadwal rilis bergilir; tiap modul jadi service saat ini juga) sebelum yang sebenarnya (lima tim produk bergantung pada satu artefak deploy; pemicu ADR 45 butir 1 dan 2 terpenuhi; ADR 37 salah bila deploy bersama tidak lagi masuk akal, ADR 44 pipeline lebih dari 10 menit per PR; pemicunya jadwal rilis, bukan ukuran: 28 ÷ 6 = 4,7 orang per service, Hitungan; memecah memutus transaction lintas modul, peringatan ADR 12); waktu pipeline dan merge queue berlabel Ilustrasi; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Gejala berlabel Ilustrasi sampai ada rekaman; yang dikira sebelum yang sebenarnya; konsep tidak di dalam adegan; angka kejadian naskah yang tidak terulang di lab berlabel Ilustrasi dan masuk `### USULAN-CERITA`. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Jalur devops. 14 menit, 6 jam, dan lima tim di gejala berlabel Ilustrasi. Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1544–1547 (1544–1546 pelaksana, 1547 peninjau), ID riset R5-165 sampai R5-169.

### 5.13 · Dari modul ke service, Kubernetes, kapan menggabungkan kembali + ADR 50

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.12, T5-siap, lab-t5-gabung, lab-t5-rollout
- selesai bila: halaman Konsep + ADR 5.13 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (M44) dan tabel ADR 50 (menyerap bagian urutan scaling dan kapan berhenti dari D2 lama) dan peta halaman Tahap 5; rekaman dari `labs/t5-gabung` (dua versi alur skor risiko: jumlah panggilan jaringan per transaksi dan p95 sebagai rasio) dan `labs/t5-rollout` (HPA menambah replika menurut metrik); widget banding (modular monolith lawan enam service: yang berubah dan yang tidak); ADR 50: enam service dengan pipeline sendiri, tiga instance, dan tim pemilik; satu cluster PostgreSQL dengan schema dan role per service (ADR 37) tanpa foreign key lintas service; ledger tetap satu-satunya tempat uang bergerak; HTTP dan OpenAPI, bukan gRPC; Kubernetes (k3s di lab, 1.37.1) dan Gateway API menggantikan Ingress NGINX yang dihentikan sejak Maret 2026; opsi modular monolith dengan rilis terjadwal, semua modul jadi service (28 ÷ 12 = 2,3 orang per service), database per service (ADR 60); "kapan salah" (waktu tunggu rilis tidak turun, p95 lompatan HTTP ke ledger di atas 50 ms antar host belum diukur, selisih lintas service tidak tertutup rekonsiliasi dalam satu hari kerja, satu service dipegang kurang dari 3 orang); kasus industri Prime Video ditulis dengan batas yang ditulis sumbernya (satu service pemantau, bukan seluruh perusahaan); pre-mortem; bagian "Di stack lain" memakai enam stack dengan versi yang dijalankan atau label Tidak dijalankan; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman bila labnya ada, kalau tidak berlabel Tidak dijalankan. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Jalur devops. D2 (Scaling) dilebur ke sini dan ke 5.5. Kasus industri dibaca sampai batasnya sebelum dipakai (R5-25). Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1548–1551 (1548–1550 pelaksana, 1551 peninjau), ID riset R5-170 sampai R5-174.

### 5.14 · M45: Pengumuman ke satu juta HP, notifikasi uang terlambat

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.13, T5-siap, lab-t5-fanout
- selesai bila: halaman Masalah 5.14 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (M45) dan peta halaman Tahap 5; rekaman dari `labs/t5-fanout` (notifikasi uang dengan kelas lebih kecil tidak menunggu di belakang pengumuman; penyedia push tiruan menjawab 429 di atas kuota); widget alur; yang dikira (pengumuman menahan notifikasi uang; hentikan pengumuman) sebelum yang sebenarnya (kelas queue ADR 32 sudah memisahkan uang dari promo; penyebabnya kapasitas: 96,3 notifikasi uang per detik lawan worker 13,33 = 722%, queue tumbuh 83 per detik, umur tertua 34,5 menit, Hitungan atas Asumsi; pengumuman 20,8 jam di 4 pengirim; satu baris outbox per penerima menulis ±300 MB ke primary, Asumsi; menambah proses worker membuat breaker ADR 36 hidup di memori tiap proses, dibaca dari kode, tidak direkam); kuota penyedia push 600.000 per menit adalah rancangan lab; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Gejala berlabel Ilustrasi sampai ada rekaman; yang dikira sebelum yang sebenarnya; konsep tidak di dalam adegan; angka kejadian naskah yang tidak terulang di lab berlabel Ilustrasi dan masuk `### USULAN-CERITA`. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Jalur mobile (notifikasi di HP). Kejadian Kamis 11.30 berlabel Ilustrasi; 34,5 menit adalah Hitungan. Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1552–1555 (1552–1554 pelaksana, 1555 peninjau), ID riset R5-175 sampai R5-179.

### 5.15 · Fan-out: event streaming, partisi, backpressure + ADR 51

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.14, T5-siap, lab-t5-fanout, W5-fanout
- selesai bila: halaman Konsep + ADR 5.15 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (M45) dan tabel ADR 51 (menyerap D4b lama) dan peta halaman Tahap 5; rekaman dari `labs/t5-fanout` (satu pengumuman satu baris dan satu event; consumer group membagi partisi dan tiap penerima menerima tepat satu notifikasi akhir walau satu consumer dimatikan; 429 dijawab backoff dan jitter); widget W5-fanout (jumlah penerima, 4, 32, dan 167 pengirim, kuota 10.000 per detik; queue per partisi dan backpressure; berlabel Simulasi bila rekaman `t5-fanout` belum ada); ADR 51: (1) notifikasi uang tetap outbox per baris dan worker diskalakan keluar (L = 96,3 × 0,3 = 29; 8 proses minimal, 11 untuk ±70%, Asumsi desain), (2) event pembayaran lewat relay dari outbox (`tujuan` `stream`) ke `pembayaran.tercatat` dengan kunci `merchant`, pengumuman satu baris dan satu event `pengumuman.kirim` dengan consumer group per partisi akun, paling sedikit 42 partisi (Hitungan); Kafka 4.3 KRaft satu broker di lab, produksi tiga broker Tidak dijalankan; breaker per proses: 6 × 11 = 66 kegagalan; opsi tambah worker saja, rentang akun di PostgreSQL, NATS JetStream, Redpanda (lisensi [perlu verifikasi]), CDC Debezium (`max_slot_wal_keep_size` bawaan -1); "kapan salah" (hanya satu consumer group; pembanding 630,8 per detik = 6,3 kali pemicu 100, bukan terus-menerus; relay tertinggal; franz-go #1484; 66 kegagalan per kejadian); pre-mortem; bagian "Di stack lain" memakai enam stack dengan versi yang dijalankan atau label Tidak dijalankan; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman bila labnya ada, kalau tidak berlabel Tidak dijalankan. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: D4b (Feed dan notifikasi) dilebur ke sini. Kata penuh "exactly-once" diperiksa: dokumentasi Kafka menyuruh membaca tulisan kecil, jadi consumer tetap idempoten (R5-07). Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1556–1559 (1556–1558 pelaksana, 1559 peninjau), ID riset R5-180 sampai R5-184.

### 5.16 · M46: Latihan failover membuat semua service error

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.15, T5-siap, lab-api-t5
- selesai bila: halaman Masalah 5.16 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (M46) dan peta halaman Tahap 5; rekaman dari `labs/api-t5` (bagian `pooler`: N client dengan pool 10 melewati `max_connections` menghasilkan kode 53300; dengan PgBouncer tidak); widget alur; yang dikira (promosi belum selesai; database belum siap menerima koneksi) sebelum yang sebenarnya (tiap pod menutup koneksinya dan membuka ulang bersamaan; koneksi potensial 6 × 3 × 10 = 180, tersedia 97 (100 dikurangi 3 cadangan), 83 ditolak dengan 53300 walau rata-rata hanya 27,8, Hitungan atas Asumsi; retry menambah badai, penalaran; `MaxConns` dan `MaxConnLifetimeJitter` bawaan pgx v5.11.0 dari dokumentasi); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Gejala berlabel Ilustrasi sampai ada rekaman; yang dikira sebelum yang sebenarnya; konsep tidak di dalam adegan; angka kejadian naskah yang tidak terulang di lab berlabel Ilustrasi dan masuk `### USULAN-CERITA`. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Jalur devops. Promosi 40 detik dan gagal 4 menit di gejala berlabel Ilustrasi. Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1560–1563 (1560–1562 pelaksana, 1563 peninjau), ID riset R5-185 sampai R5-189.

### 5.17 · Pooler koneksi: PgBouncer + ADR 52

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.16, T5-siap, lab-api-t5
- selesai bila: halaman Konsep + ADR 5.17 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (M46) dan tabel ADR 52 dan peta halaman Tahap 5; rekaman dari `labs/api-t5` (bagian `pooler`); widget kalkulator (rumus service × instance × pool lawan `max_connections` dan batas server pool PgBouncer, pola kalkulator ADR 45 di 4.29); ADR 52: PgBouncer 1.26.1 mode transaction di depan primary, dua instance, koneksi ke PostgreSQL 60 dari 97 tersedia (Asumsi), pool tiap pod 10, `max_client_conn` bawaan 100 dinaikkan (misalnya 400, Asumsi), `query_wait_timeout` bawaan 120 detik, pgx v5.11.0 dengan statement cache dan `max_prepared_statements` lebih dari 0 (PgBouncer 1.21.0 ke atas), tanpa `SET`, `LISTEN`, advisory lock sesi, dan `PREPARE` SQL; outbox memakai `FOR UPDATE SKIP LOCKED` di dalam transaction; `MaxConnLifetimeJitter` 5 menit (Asumsi) dan backoff dengan jitter; opsi naikkan `max_connections`, kecilkan pool per pod, pooler bawaan layanan terkelola (Tidak dijalankan); "kapan salah" (fitur sesi, pooler titik gagal tunggal, `query_wait_timeout` dan isu pgx#1687 [perlu verifikasi], 180 lawan 400, p95 lompatan tambahan di atas 50 ms); pre-mortem; bagian "Di stack lain" memakai enam stack dengan versi yang dijalankan atau label Tidak dijalankan; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman bila labnya ada, kalau tidak berlabel Tidak dijalankan. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Jalur devops. Kalkulator memakai angka halaman 5.16 sebagai masukan dengan satu kalimat asal. Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1564–1567 (1564–1566 pelaksana, 1567 peninjau), ID riset R5-190 sampai R5-194.

### 5.18 · M47: Pod notifikasi membuat jurnal

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.17, T5-siap, lab-t5-service
- selesai bila: halaman Masalah 5.18 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (M47) dan peta halaman Tahap 5; rekaman dari `labs/t5-service` (mode rentan: pemanggil mana pun dengan key baru membuat jurnal); widget alur; yang dikira (jaringan di dalam cluster privat jadi aman; bawaan Kubernetes sudah membatasi lalu lintas) sebelum yang sebenarnya (ledger mempercayai setiap pemanggil; Idempotency-Key mencegah pemrosesan ganda untuk request yang sama, bukan pemanggil yang tidak berhak, penalaran; pembatasan lalu lintas antar pod butuh NetworkPolicy dan jaringan yang menegakkannya [perlu verifikasi]); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Gejala berlabel Ilustrasi sampai ada rekaman; yang dikira sebelum yang sebenarnya; konsep tidak di dalam adegan; angka kejadian naskah yang tidak terulang di lab berlabel Ilustrasi dan masuk `### USULAN-CERITA`. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Jalur security. Jurnal top-up Rp1.000 untuk akun uji berlabel Ilustrasi kecuali rekaman menghasilkannya. Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1568–1571 (1568–1570 pelaksana, 1571 peninjau), ID riset R5-195 sampai R5-199.

### 5.19 · Keamanan 10: Identitas antar service, mTLS + ADR 53

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.18, T5-siap, lab-t5-service
- selesai bila: halaman Keamanan + ADR 5.19 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (M47) dan tabel ADR 53 dan peta halaman Tahap 5; rekaman dari `labs/t5-service` (pemanggil tanpa sertifikat gagal di handshake; sertifikat tanpa izin jenis jurnal dijawab 403; permintaan sama dua kali satu jurnal); widget banding (tanpa mTLS dan daftar jenis jurnal lawan dengan keduanya); ADR 53: mTLS di Go (`ClientAuth` `RequireAndVerifyClientCert`), sertifikat dari CA internal yang berotasi (cert-manager v1.21.3 disebut), identitas dari SAN, ledger menyimpan daftar jenis jurnal per identitas (pembayaran: topup_bank, kartu_tahan, kartu_tangkap; cicilan: angsuran, tabungan; merchant: bayar; notifikasi dan akun tidak boleh), NetworkPolicy [perlu verifikasi], Idempotency-Key tetap; opsi jaringan privat dipercaya, token bearer per service (RFC 9700 §4.10.1, RFC 9449), service mesh, SPIFFE/SPIRE v1.15.5 (disebut); "kapan salah" (jalur bertambah, sertifikat kedaluwarsa tanpa rotasi, service sah yang dibajak, daftar jenis jurnal salah); pre-mortem; bagian "Di stack lain" memakai enam stack dengan versi yang dijalankan atau label Tidak dijalankan; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman bila labnya ada, kalau tidak berlabel Tidak dijalankan. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Jalur security. Atribusi RFC dibaca dari teks mentah (kata pelunak sumber ikut ke kalimat). Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1572–1575 (1572–1574 pelaksana, 1575 peninjau), ID riset R5-200 sampai R5-204.

### 5.20 · M48: Angsuran Budi terdebit dua kali

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.19, T5-siap, lab-t5-cicilan
- selesai bila: halaman Masalah 5.20 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (M48) dan peta halaman Tahap 5; rekaman dari `labs/t5-cicilan` (batch dimatikan di antara jurnal dan penandaan lalu diulang dengan jam ledger +25 jam: dua jurnal dengan Idempotency-Key saja); widget alur; yang dikira (bug di penagihan; batch selalu bisa diulang dari awal) sebelum yang sebenarnya (batch Sabtu 02.00 mati di tengah dan baru dijalankan lagi Senin 02.00, 48 jam kemudian; job menandai lunas sesudah jurnal dan pod mati di antaranya; ulangan dalam 24 jam aman karena key (ADR 14 dan 19), sesudahnya menjurnal lagi; rekaman Tahap 4 `labs/t4-modul/output/proses-mati.txt` bagian C untuk top-up: +23 jam satu jurnal, +25 jam dua, jam ledger diperankan); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Gejala berlabel Ilustrasi sampai ada rekaman; yang dikira sebelum yang sebenarnya; konsep tidak di dalam adegan; angka kejadian naskah yang tidak terulang di lab berlabel Ilustrasi dan masuk `### USULAN-CERITA`. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: 312 angsuran dan 48 jam di gejala berlabel Ilustrasi. Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1576–1579 (1576–1578 pelaksana, 1579 peninjau), ID riset R5-205 sampai R5-209.

### 5.21 · Batch harian tahan crash, saga + ADR 54

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.20, T5-siap, lab-t5-cicilan
- selesai bila: halaman Konsep + ADR 5.21 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (M48) dan tabel ADR 54 dan peta halaman Tahap 5; rekaman dari `labs/t5-cicilan` (`referensi` unik satu jurnal; job dijalankan dua kali serentak tidak menagih dua kali; tabel langkah buatan dan DBOS Go v1.8.0 atas kasus yang sama, hasil sama, jumlah baris dan kode berbeda dihitung bukan dinilai); widget banding (tabel langkah buatan lawan DBOS); ADR 54: `jurnal.referensi` UNIK `angsuran:<jadwal_id>:<ke>` dengan `INSERT ... ON CONFLICT`, tabel `angsuran` PK `(jadwal_id, ke)` dengan status `menunggu`, `terjurnal`, `dicatat`, job mengklaim per baris (ADR 24) pada 20 per detik (Asumsi) dan boleh dijalankan ulang kapan saja, kompensasi lewat jurnal pembalik (saga; ADR 6); opsi cron dan job idempoten saja (ADR 19), DBOS Go, Temporal v1.32.1 (disebut), orkestrasi lewat event; "kapan salah" (jenis alur panjang tiga atau lebih, jadwal diubah di tengah, kompensasi bukan jurnal pembalik, job di atas 1 jam: 13.333 angsuran = 667 detik, Hitungan); pre-mortem; bagian "Di stack lain" memakai enam stack dengan versi yang dijalankan atau label Tidak dijalankan; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman bila labnya ada, kalau tidak berlabel Tidak dijalankan. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Temporal tidak dibuka dokumentasinya (R5-10): ditulis disebut, bukan dibandingkan. Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1580–1583 (1580–1582 pelaksana, 1583 peninjau), ID riset R5-210 sampai R5-214.

### 5.22 · M49: Rilis kartu 5% ternyata sepertiga

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.21, T5-siap, lab-t5-rollout
- selesai bila: halaman Masalah 5.22 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (M49) dan peta halaman Tahap 5; rekaman dari `labs/t5-rollout` (`setWeight` 5 dengan 3 replika tanpa traffic router menghasilkan 0 atau 1 dari 3 pod; 5% butuh 20 replika) dan rekaman Tahap 4 `labs/t4-kartu/output/kill-switch.txt` bagian B (flag di memori satu proses; dua instance Tidak dijalankan); widget alur; yang dikira (canary 5% berarti 5% user; kill switch mematikan semuanya) sebelum yang sebenarnya (Argo Rollouts tanpa traffic router mendekati bobot lewat rasio replika dengan bilangan bulat berselisih terkecil; 3 replika memberi 0%, 33,3%, 66,7%, atau 100%; aturan minimal satu pod [perlu verifikasi] sampai terekam; kill switch ADR 42 adalah flag atomik di memori satu proses, jadi mematikannya di satu pod tidak mengubah pod lain); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Gejala berlabel Ilustrasi sampai ada rekaman; yang dikira sebelum yang sebenarnya; konsep tidak di dalam adegan; angka kejadian naskah yang tidak terulang di lab berlabel Ilustrasi dan masuk `### USULAN-CERITA`. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Jalur devops. Rasio tolak 2% ke 31% di gejala berlabel Ilustrasi. Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1584–1587 (1584–1586 pelaksana, 1587 peninjau), ID riset R5-215 sampai R5-219.

### 5.23 · Progressive delivery, GitOps, kill switch + ADR 55

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.22, T5-siap, lab-t5-rollout
- selesai bila: halaman Konsep + ADR 5.23 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (M49) dan tabel ADR 55 dan peta halaman Tahap 5; rekaman dari `labs/t5-rollout` (bobot Gateway API bila plugin berjalan di k3d; analisis yang gagal membalik rollout; tiga pod membaca satu sakelar dan semuanya berhenti menyetujui dalam jendela cache; sakelar tak terbaca dijawab tolak yang eksplisit; HPA menambah replika menurut metrik); widget tebak; ADR 55: Argo Rollouts v1.10.1 canary 1%, 5%, 25%, 100% dengan bobot Gateway API lewat plugin, jeda manual sebelum 100%, analisis otomatis atas rasio tolak, p95 otorisasi, dan selisih rekonsiliasi kartu dengan `failureLimit`; GitOps dengan Argo CD v3.5.6 (Tidak dijalankan di lab); sakelar `kartu_aktif` di tabel `sakelar` dengan cache 5 detik (Asumsi), nilai tak terbaca berarti tolak otorisasi baru dengan jawaban tolak yang eksplisit (penerbit tiruan membaca non-200 sebagai timeout dan menyetujui, ADR 42); OpenFeature dan flagd tidak dipasang; opsi rasio replika saja, 20 replika, blue/green, flag lewat OpenFeature, flag di memori; "kapan salah" (cache 5 detik × 1,16 otorisasi per detik = 5,8 lolos, langkah 1% = 0,0116 per detik atau ±42 per jam, Hitungan atas Asumsi; plugin tak mendukung router yang dipilih [perlu verifikasi]; primary mati menolak semua otorisasi baru; bentrok HPA dan Argo CD [perlu verifikasi]); pre-mortem; bagian "Di stack lain" memakai enam stack dengan versi yang dijalankan atau label Tidak dijalankan; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman bila labnya ada, kalau tidak berlabel Tidak dijalankan. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Jalur mobile dan devops (feature flag di app mengikuti ADR 10). Menjawab butir ADR 45 yang dikerjakan di sini: flag kill switch di luar proses dan rilis kartu bertahap. Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1588–1591 (1588–1590 pelaksana, 1591 peninjau), ID riset R5-220 sampai R5-224.

### 5.24 · M50: Satu POS mengirim 3.000 permintaan per detik

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.23, T5-siap, lab-t5-waf
- selesai bila: halaman Masalah 5.24 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (M50) dan peta halaman Tahap 5; rekaman dari `labs/t5-waf` (satu mitra yang melebihi kuota mendapat 429 sementara mitra lain tetap 200); widget alur; yang dikira (serangan DDoS; blokir alamat mitra; tambah replika API) sebelum yang sebenarnya (kasir mitra mengulang tanpa batas bila tidak ada jawaban; rate limit per IP ADR 27 menghitung semua kasir mitra di satu alamat NAT sebagai satu, penalaran; konsumsi sumber daya tanpa batas menurut OWASP API4:2023; Idempotency-Key hanya opsional di bayar, transfer, dan pesanan, jadi pengulangan bisa membuat dua QR untuk satu pesanan; reset stream HTTP/2 golang/go#63417, ditutup 2023-10-10); 3.000 per detik = 216% dari puncak 1.388,9 (Hitungan atas Ilustrasi); registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Gejala berlabel Ilustrasi sampai ada rekaman; yang dikira sebelum yang sebenarnya; konsep tidak di dalam adegan; angka kejadian naskah yang tidak terulang di lab berlabel Ilustrasi dan masuk `### USULAN-CERITA`. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Jalur security. Angka 3.000 per detik dan 10.15 di gejala berlabel Ilustrasi; atribusi isu golang dibaca dari teks mentah. Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1592–1595 (1592–1594 pelaksana, 1595 peninjau), ID riset R5-225 sampai R5-229.

### 5.25 · Keamanan 11: Pintu untuk pihak luar, kuota, WAF + ADR 56

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.24, T5-siap, lab-t5-waf
- selesai bila: halaman Keamanan + ADR 5.25 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (M50) dan tabel ADR 56 dan peta halaman Tahap 5; rekaman dari `labs/t5-waf` (Coraza dengan CRS memblokir payload serangan umum dengan 403 dan meloloskan payload POS yang sah; POST tanpa Idempotency-Key dijawab 400; HMAC salah atau timestamp lama ditolak; kunci mitra A tidak membuka merchant mitra B; serangan volumetrik lapisan 3 dan 4 Tidak dijalankan); widget pilah (siapa mengerjakan apa di pintu: WAF, kuota, kunci, HMAC, Idempotency-Key); ADR 56: gateway di tepi (Gateway API) yang memenuhi penundaan WAF di ADR 4, Coraza v3.8.1 dengan OWASP CRS v4.30.0 mode blokir, token bucket per `mitra_id` di Redis (ADR 27; 100 per detik dan 20 berjalan, Asumsi), timeout 3 detik dan batas ukuran body, kunci API per mitra (`mitra_pos.kunci_hash`) dan HMAC-SHA256 atas byte mentah bertimestamp (pola ADR 34) dengan cakupan merchant miliknya, Idempotency-Key wajib untuk POST uang, webhook keluar ke POS memakai aturan alamat keluar ADR 41 dan tanda tangan HMAC; opsi WAF saja, blokir IP mitra, kuota bersama, mTLS untuk mitra (disebut), plugin Caddy; "kapan salah" (50 × 100 = 5.000 per detik = 3,6 kali puncak 1.388,9, Hitungan atas Asumsi; false positive CRS; mitra menuntut mTLS; Coraza kehilangan pemelihara); pre-mortem; bagian "Di stack lain" memakai enam stack dengan versi yang dijalankan atau label Tidak dijalankan; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman bila labnya ada, kalau tidak berlabel Tidak dijalankan. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Jalur security. Memenuhi penundaan WAF ADR 4 (halaman 1.20). Serangan volumetrik dilimpahkan ke penyedia jaringan: Ilustrasi. Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1596–1599 (1596–1598 pelaksana, 1599 peninjau), ID riset R5-230 sampai R5-234.

### 5.26 · Keamanan 12: Arsip dan cadangan, envelope encryption + ADR 57

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.25, T5-siap, lab-t5-kms
- selesai bila: halaman Keamanan + ADR 5.26 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (lahir dari M43 dan M42, bukan halaman masalah) dan tabel ADR 57 dan peta halaman Tahap 5; rekaman dari `labs/t5-kms` (file arsip dibuka tanpa KMS tidak terbaca; satu byte yang diubah gagal autentikasi GCM; data key terbungkus versi KEK lama bisa dibuka sampai `min_decryption_version` dinaikkan; rotasi KEK dengan pembungkusan ulang di OpenBao transit, dan bila `rotate` atau pembungkusan ulang tidak didukung seperti ditulis halaman menulis yang terekam; SoftHSM lewat PKCS#11 sebagai Ilustrasi dan client Go-nya [perlu verifikasi]); widget alur; ADR 57: data key AES-256-GCM per file arsip dengan nonce acak 96 bit (`NewGCMWithRandomNonce`), dibungkus KEK di OpenBao transit (v2.7.2 atau lebih baru), tersimpan ciphertext, data key terbungkus, dan `versi_kek` di `arsip_partisi`; checksum tiap file di `arsip_partisi` dan jangkar harian (hash chain Tahap 4 diperluas); data pribadi di kolom tidak dienkripsi per baris di Tahap 5; opsi enkripsi disk saja, data key per posting (umur KEK 9,8 tahun: 2^32 ÷ 438 juta), data key per tabel, enkripsi oleh penyedia penyimpanan; "kapan salah" (KEK dan file di tempat yang sama, OpenBao tidak tersedia saat pemulihan masuk RTO, rotasi tanpa pembungkusan ulang, HSM tiruan bukan perangkat); pre-mortem; bagian "Di stack lain" memakai enam stack dengan versi yang dijalankan atau label Tidak dijalankan; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman bila labnya ada, kalau tidak berlabel Tidak dijalankan. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Jalur security. Data key per file, bukan per baris atau per tabel (pilihan draf 15). Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1600–1603 (1600–1602 pelaksana, 1603 peninjau), ID riset R5-235 sampai R5-239.

### 5.27 · Tim dan infra Tahap 5: platform, GitOps, OpenTelemetry, SLO + ADR 58

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.26, T5-siap, lab-t5-service
- selesai bila: halaman Tim dan infra 5.27 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (lahir dari M44, M46, dan M49; lima butir isi halaman di bawah tabel ADR, mengikuti PROPOSAL "Pipeline backend per tahap" dan "Pipeline app Flutter per tahap") dan tabel ADR 58 dan peta halaman Tahap 5; rekaman dari `labs/t5-service` (`traceparent` merambat dari service pertama ke ledger; Collector dengan tail sampling menyimpan trace error dan membuang sebagian trace normal); widget pilah (siapa memegang apa: platform, SRE, tim produk, security); ADR 58: template service, pipeline per service (ADR 44 diperluas: contract, SAST, SBOM, tanda tangan, canary), repo kode terpisah dari repo konfigurasi (Argo CD v3.5.6 Tidak dijalankan), pemindai kunci atas repo konfigurasi dan state IaC, OpenTelemetry dengan `traceparent` W3C lintas HTTP dan header event, tail sampling ±6% (Asumsi) = 2,9 GB per hari dari 48,0 GB mentah, SLO 99,9% per 30 hari (43,2 menit anggaran kegagalan), alert burn rate 14,4 selama 1 jam dan 6 selama 6 jam memanggil orang dan 1 selama 3 hari membuka tiket, giliran jaga per tim, Shorebird v1.6.131 hanya untuk perbaikan Dart (Apple 2.5.2; kebijakan Google Play [perlu verifikasi]); Testcontainers dan k6 Tidak dijalankan seperti Tahap 3 dan 4; "kapan salah" (platform jadi penghambat: permintaan template lebih dari satu minggu; tail sampling membuang trace yang dibutuhkan; HPA dan Argo CD bentrok [perlu verifikasi]; SLO terlalu ketat; pipeline lebih dari 10 menit); pre-mortem; bagian "Di stack lain" memakai enam stack dengan versi yang dijalankan atau label Tidak dijalankan; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman bila labnya ada, kalau tidak berlabel Tidak dijalankan. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Jalur mobile (Shorebird, hanya perbaikan Dart) dan devops. 4.26 membaca ±25 menit (TINJAUAN-PEMILIK Tahap 4 butir 11): bila halaman ini lebih dari ±15 menit baca, tulis di SETELAH-TAHAP-5. Menyerap pemindai kunci atas state IaC (butir 'Sengaja belum' 4.26). Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1604–1607 (1604–1606 pelaksana, 1607 peninjau), ID riset R5-240 sampai R5-244.

### 5.28 · On-prem lawan cloud + ADR 59

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.1, T5-siap
- selesai bila: halaman ADR 5.28 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (lahir dari ADR 39 dan batasan PRD v5: biaya tiga tahun) dan tabel ADR 59 dan peta halaman Tahap 5; tanpa lab (Tidak dijalankan: lab dua Compose dari PROPOSAL tidak dibuat karena batas sumber daya di laptop tidak merekam biaya atau kapasitas dengan jujur; pemilik boleh meminta); widget kalkulator (model biaya tiga tahun: biaya = infrastruktur + orang operasi + migrasi + risiko, masukan berlabel Asumsi atau Ilustrasi, tanpa harga penyedia nyata); ADR 59: tetap di cloud milik PT (ADR 39) dengan jalan keluar yang dijaga (manifest Kubernetes standar, PostgreSQL standar tanpa fitur khusus penyedia, Kafka dan Redis tanpa layanan queue milik penyedia, IaC OpenTofu), perbandingan biaya tiga tahun ditulis tiap tahun, data yang harus tinggal di lokasi tertentu sebagai syarat tanpa klaim kepatuhan; opsi cloud dengan layanan terkelola penuh, on-prem atau colo, campuran, tetap seperti Tahap 4; "kapan salah" (biaya cloud tiga tahun melebihi on-prem termasuk tim operasi; beban stabil: 37signals menulis cloud unggul di dua ujung dan mereka pindah dalam enam bulan dengan tim operasi tetap, hitungan "napkin" pendirinya tanpa audit independen; data harus tinggal di lokasi tertentu; tim platform dan SRE melewati 6 orang, pembanding 4 + 2); pre-mortem; database dijalankan sendiri lawan terkelola: ADR ini menjaga jalan keluar tanpa menyatakan terkelola salah, produksi menunggu pemilik; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman bila labnya ada, kalau tidak berlabel Tidak dijalankan. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Hanya bergantung pada `T5-siap` dan 5.1 (tanpa lab, bisa jalan selama lab menunggu Docker); rujuk 5.9 dan 5.17 lewat ID registry `[[ID]]` tanpa menunggu merge. Jalur devops. Angka biaya berlabel Asumsi atau Ilustrasi. ALOKASI: keputusan 1608–1611 (1608–1610 pelaksana, 1611 peninjau), ID riset R5-245 sampai R5-249.

### 5.29 · M51: Uji coba nasional lolos, PRD v6 datang, dan estimasi Tahap 5 → 6

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.28, 5.27, T5-siap, lab-api-t5
- selesai bila: halaman Masalah 5.29 (jenis masalah dengan kalkulator di blok Paham; M51 dan estimasi Tahap 5 → 6 dalam satu halaman, pilihan draf 16) sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (M51) dan bagian 3 (tabel angka beban) dan peta halaman Tahap 5; rekaman dari `labs/api-t5` (`make beban`: status dan p95 sebagai batas di laptop, bukan kapasitas; kapasitas satu primary untuk 69,4 transaksi uang per detik belum diukur, jadi 694,4 lebih belum bisa dinilai); widget kalkulator (rumus sama dengan 4.28: angka Tahap 5 dikali 10 = 13.888,9 request per detik puncak, 694,4 transaksi uang per detik, 752,3 notifikasi uang per detik, `posting` 4,38 miliar per tahun, Hitungan atas Asumsi); yang dikira (perlu multi-region dan service mesh sekarang) sebelum yang sebenarnya (tiga hal belum pernah diuji: skor risiko dalam 50 ms, data di dua wilayah, 28 orang menjadi lebih dari 50); estimasi tidak memilih komponen; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Gejala berlabel Ilustrasi sampai ada rekaman; yang dikira sebelum yang sebenarnya; konsep tidak di dalam adegan; angka kejadian naskah yang tidak terulang di lab berlabel Ilustrasi dan masuk `### USULAN-CERITA`. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Satu halaman dua topik (keputusan 1413): bila baca lebih dari ±15 menit, tulis di SETELAH-TAHAP-5 dan usulkan pecah ke pemilik (peta jadi 33 halaman). Angka Tahap 6 memakai 3 transaksi sebagai dasar dan 2 di sebelahnya. PRD v6 berlabel Ilustrasi. Memakai rekaman lab; tugas lab butuh Docker hidup, jadi halaman ini menunggu lab itu. ALOKASI: keputusan 1612–1615 (1612–1614 pelaksana, 1615 peninjau), ID riset R5-250 sampai R5-254.

### 5.30 · ADR 60: Sengaja belum dilakukan

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.1, T5-siap
- selesai bila: halaman ADR 5.30 sesuai `plan/CERITA-TAHAP-5.md` bagian 4 (tabel ADR 60 dan pembacaan ulang pemicu ADR 45 di bagian 3) dan peta halaman Tahap 5; tanpa lab; ADR 60: sengaja belum (Tahap 5): service mesh penuh, multi-region, database terpisah per service, sharding, BFF terpisah, login sosial, gRPC, CDC dengan Debezium, TigerBeetle dan Temporal, provenance SLSA, HTTP Message Signatures, dan atestasi app, event sourcing penuh, OpenFeature dan flagd; tiap butir dengan pemicu tertulis, alat ukur, dan keadaan Tahap 5 (tabel pembacaan ulang pemicu ADR 45: "terpenuhi" berarti keadaan sama dengan pemicunya, bukan bahwa komponennya terbukti perlu); lima dari sebelas butir "Sengaja belum" 4.26 jadi bahan Tahap 5 (dua dikerjakan ADR 55, satu ADR 58, dua tetap di sini) dan enam lainnya tidak dibawa; BFF tetap sengaja belum (pemicu: satu layar app butuh lebih dari 3 request berurutan, belum terukur; TINJAUAN-PEMILIK Tahap 4 butir 3); opsi pasang semuanya, tunda tanpa pemicu, tunda dengan pemicu dan alat ukur (dipilih); opsi yang ditolak berlabel Tidak dijalankan dengan sumbernya; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. ADR dengan opsi naskah (tiga atau lebih), pre-mortem, "kapan salah" dengan satuan dan pembanding yang sama dengan hitungan beban naskah (aturan 4), dan sumber; opsi terpilih dan satu opsi yang ditolak ada di rekaman bila labnya ada, kalau tidak berlabel Tidak dijalankan. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Pola 4.29. Hanya bergantung pada `T5-siap` dan 5.1 (tanpa lab, bisa jalan selama lab menunggu Docker); tabel pemicu ditulis dari naskah dan dirujuk ke halaman ADR lain lewat ID registry `[[ID]]`. Pemicu berangka yang belum terukur ditulis begitu. ALOKASI: keputusan 1616–1619 (1616–1618 pelaksana, 1619 peninjau), ID riset R5-255 sampai R5-259.

### 5.31 · Yang dibawa keluar dari Tahap 5

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.30, 5.29, T5-siap
- selesai bila: halaman Konsep 5.31 sesuai `plan/CERITA-TAHAP-5.md` bagian 5 dan peta halaman Tahap 5; tanpa lab; enam belas kalimat naskah bagian 5 masing-masing terikat ke kejadian dan rekaman (dalam versi halaman asal yang sudah merge); kartu (tebak lalu buka) dan Cek diri gabungan lima soal; daftar ADR 46 sampai 60; satu kalimat per konsep, tanpa konsep baru; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Pola 4.30. Bergantung pada 5.29 dan 5.30 (tidak pada daftar halaman tanpa lab saja): kalimat rekap terikat ke rekaman halaman asal, jadi halamannya harus ada (keputusan 1412). ALOKASI: keputusan 1620–1623 (1620–1622 pelaksana, 1623 peninjau), ID riset R5-260 sampai R5-264.

### 5.32 · Jembatan: pratinjau PRD v6

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 5.31, T5-siap
- selesai bila: halaman PRD 5.32 sesuai `plan/CERITA-TAHAP-5.md` bagian 6 dan peta halaman Tahap 5; tanpa lab; pratinjau PRD v6 (10 juta user, multi-region aktif-pasif, skor risiko real-time dan graf akun-perangkat, platform internal, chaos testing dan data mesh sederhana, multi-mata uang dan kurs, data per negara; tim 28 menjadi lebih dari 50 developer dalam lebih dari 10 tim; semuanya Ilustrasi karena Tahap 6 adalah proyeksi konseptual); widget tebak (dari ADR Tahap 5, mana yang pecah lebih dulu?) dengan bukti dari kalimat halaman ADR Tahap 5 yang sudah tertulis (ADR 58, 59, dan 60) tanpa isi Tahap 6, dan dua pilihan lain (ADR 52 dan 56) tidak cocok; "pecah lebih dulu" ditulis sebagai penalaran (Asumsi); jawaban dibuka di halaman pertama Tahap 6, bukan di sini; rencana jawaban dibaca dari kalimat halaman ADR dan dicocokkan dengan teks yang sudah jadi; "uang elektronik" tanpa klaim izin atau regulasi; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama. Aturan terbukti Tahap 3 dan 4 (`plan/BRIEF-HALAMAN.md`, dibaca seluruhnya): angka hanya dari rekaman atau dihitung dari angka yang tertulis di halaman, dengan label tidak lebih kuat dari rekaman dan dari kode lab yang memerankannya; klaim negatif dan universal berlingkup; penjaga angka Vitest yang menurunkan nilai dari rekaman, registry, dan naskah dengan uji mutasi sendiri (tabel di badan PR); ID riset dan nomor keputusan tidak tampil (`cek_id_tampil.py`); Snippet `lines=` dari rentang fungsi; hasil tanpa JavaScript (noscript); tabel tidak meluap di 320 px. Aturan DIRI-4: angka masukan yang asalnya di halaman lain diberi satu kalimat asal atau tautan di pemakaian pertama; rujukan "di atas" dan "bagian G" hanya bila elemennya memang lebih dulu di halaman; satu kata per konsep (hitung di halaman tetangga; naskah Tahap 5: replica, secret, pembeli, pengumuman, angsuran, service, dan "layanan" hanya untuk pihak ketiga tiruan); tabel GFM punya jumlah kolom sama di header, pemisah, dan tiap baris (hitung `<table>` di `dist`). Naskah Tahap 5 menulis 3 transaksi per user aktif per hari sebagai dasar dan hasil dengan 2 di sebelahnya (registry `trx` 2 tidak diubah): halaman menulis keduanya dengan label Asumsi.
- catatan: Jawaban tebakan dibuka di halaman pertama Tahap 6 (tugas `T6-siap` mengikat janji ini). Pola 4.31. ALOKASI: keputusan 1624–1627 (1624–1626 pelaksana, 1627 peninjau), ID riset R5-265 sampai R5-269.

### G3-rantai · Gerbang rantai Tahap 4 dan 5

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: 5.32
- selesai bila: `tools/cek_situs.sh` menjalankan pemeriksa rantai `tools/eval_tahap.py rantai` untuk tahap 1 sampai 5 (sekarang `for T in 1 2 3`, TINJAUAN-PEMILIK Tahap 4 butir 10), supaya Berikutnya dari 4.31 ke 5.1 terjaga di gerbang, dan sesudah 5.32 juga ke halaman pertama Tahap 6 bila sudah ada; bila pengatur memutuskan USULAN-PERBAIKAN DIRI-4 butir 4 (gerbang sekarang tidak menjalankan `gejala` untuk tahap mana pun), `eval_tahap.py gejala N` untuk tiap tahap yang punya halaman masalah; `tools/test_eval_tahap.py` mendapat kasus yang menggagalkan rantai bila satu prasyarat atau satu tautan Berikutnya diubah (uji mutasi sendiri: ubah satu `prasyarat` di registry salinan, rantai harus gagal); `python3 tools/eval_tahap.py peta 4` dan `peta 5` tidak memberi selisih bintang, lab, atau jenis; gerbang penuh lolos dan lamanya tidak melewati batas CI.
- catatan: Dibuat T5-siap (keputusan 1413). JANGAN mengubah `tools/` sebelum 5.32 merge: rantai Tahap 5 butuh 32 halaman "ada" dan gagal selama ada yang "segera". Sumber: TINJAUAN-PEMILIK Tahap 4 butir 10 dan USULAN-PERBAIKAN DIRI-4 butir 4. ALOKASI: keputusan 1696–1698 (1696–1697 pelaksana, 1698 peninjau); tanpa ID riset.

### EVAL-5 · Evaluasi Tahap 5

- jenis: crosscheck
- status: antre
- percobaan: 0
- bergantung: 5.32
- selesai bila: `plan/EVALUASI-TAHAP-5.md` sesuai skill evaluasi-tahap oleh subagent yang tidak menulis halaman Tahap 5: kartu W1–W8 dengan satu baris bukti yang bisa diulang, tiga pertanyaan pembaca di tiga halaman acak (seed 5), uji baca oleh subagent segar (5 hal membingungkan). Ada TIDAK: paling banyak 3 tugas perbaikan disisipkan tepat sesudah tugas ini, lalu `EVAL-5-ulang` sekali; sisa TIDAK dan 5 hal membingungkan ke `plan/TINJAUAN-PEMILIK.md`.
- catatan: W1–W4 wajib YA. Sesudah evaluasi ulang tahap dinyatakan selesai apa pun hasilnya. ALOKASI: keputusan 1690–1692 (cadangan pengatur Tahap 5); tanpa ID riset. Hidupkan Docker lebih dulu (`docker info`): W2 dan ulang `make cek` lab sampel butuh Docker.

### DIRI-5 · Perbaikan diri sesudah Tahap 5

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: EVAL-5
- selesai bila: Satu subagent membaca `plan/EVALUASI-TAHAP-5.md` dan pelajaran MEMORI Tahap 5, lalu boleh mengubah skill gaya-bahasa, visualisasi, analisis-kritis, riset-tahap, evaluasi-tahap hanya dengan bukti dari Tahap 5, paling banyak 10 baris per skill, masing-masing dicatat sebagai keputusan dengan teks sebelum/sesudah; CLAUDE.md, PROPOSAL, dan CERITA-TAHAP-1/2 tidak disentuh (usulan ke `plan/USULAN-PERBAIKAN.md`); STATUS menulis "Tahap 5 selesai".
- catatan: Langkah penutup alur tahap. ALOKASI: keputusan 1693–1695 (cadangan pengatur Tahap 5); skill yang diubah dicatat sebagai keputusan satu per satu.

## Tahap 6

Alur tujuh langkah (keputusan 554). Tugas lab dan halaman Tahap 6 disisipkan oleh `T6-siap` dari peta halaman naskah: lab sebelum `ERD6`, halaman sesudah widget. Nomor keputusan: 1700–1899 (konten +0–99, teknis +100–149, pengatur +150–199; digeser dari 1600–1799 oleh `T5-siap` 2026-10-31 karena Tahap 5 memakai sampai 1699). Tahap 6 konseptual: 10–12 halaman tanpa lab dan tanpa widget baru.

### RISET-6 · Riset Tahap 6

- jenis: konten
- status: selesai
- percobaan: 1
- bergantung: RISET-5
- selesai bila: `plan/RISET-TAHAP-6.md` (≤ 120 baris) sesuai skill riset-tahap untuk Tahap 6 (regional (proyeksi), PROPOSAL "Enam tahap dalam satu tabel"): konsep dengan 1–3 sumber primer bertanggal dan ID `R6-nn`, yang berubah sejak PROPOSAL, teknik terbaru masuk/tidak, satu kasus industri nyata untuk ADR dari sumber primer, jebakan forum, angka beban dan ukuran data dihitung ulang dengan rumus PROPOSAL sebagai Asumsi; pengatur membuka tiga ID acak.
- catatan: Kerja di depan (keputusan 728): jalan di lajur riset sebelum DIRI-5; `plan/RISET-TAHAP-6.md` memakai angka tahap sebelumnya dari RINGKAS dan naskahnya. Selesai 2026-10-25 di PR #332.

### NASKAH-6 · Naskah Tahap 6 (draft otomatis)

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: RISET-6, DIRI-5
- selesai bila: `plan/CERITA-TAHAP-6.md` dengan struktur persis CERITA-TAHAP-2 (Kenapa dokumen ini ada, Latar, Tokoh baru, 1 PRD v6, 2 Dari fitur ke pekerjaan teknis, 3 Inti teknis, 3b Skema data, 4 Masalah, 5 Yang dibawa keluar, 6 Jembatan, Peta halaman, Jalur per peran), baris pertama "Draft otomatis, belum ditinjau pemilik", memakai RISET-TAHAP-6; nomor M dan ADR melanjutkan tahap sebelumnya; 10–12 halaman konseptual tanpa lab; peninjau konsistensi (subagent kedua) membaca naskah terhadap semua naskah sebelumnya (tokoh, nama perusahaan, angka saldo dan user, istilah glosarium, nomor ADR dan M, rantai PRD → fitur → teknis → masalah → konsep) dan semua temuannya ditutup.
- catatan: Satu-satunya naskah yang ditulis Claude; Tahap 1–2 milik pemilik dan tidak disentuh.

### T6-siap · RINGKAS, registry, dan antrean Tahap 6

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: NASKAH-6
- selesai bila: `plan/RINGKAS.md` (≤ 60 baris) memuat peta halaman Tahap 6 satu baris per halaman dan tahap sebelumnya diringkas; registry `situs/data/cerita.json` memuat semua halaman Tahap 6 sesuai naskah (judul, jenis, bagian, ★, peran, prasyarat, lab), yang belum ditulis tampil "segera", halaman lama tahap ini menjadi `lama` bila diganti; ANTREAN mendapat tugas lab (sebelum `ERD6`) dan tugas halaman berurutan (sesudah tugas widget) dengan `selesai bila` merujuk bagian naskah; `sinkron_cerita.py`, `cek_tautan.py`, dan gerbang lolos.
- catatan: Sekaligus mengganti `bergantung` `EVAL-6` ke halaman terakhir Tahap 6.

### EVAL-6 · Evaluasi Tahap 6

- jenis: crosscheck
- status: antre
- percobaan: 0
- bergantung: T6-siap
- selesai bila: `plan/EVALUASI-TAHAP-6.md` sesuai skill evaluasi-tahap oleh subagent yang tidak menulis halaman Tahap 6: kartu W1–W8 dengan satu baris bukti yang bisa diulang, tiga pertanyaan pembaca di tiga halaman acak (seed 6), uji baca oleh subagent segar (5 hal membingungkan). Ada TIDAK: paling banyak 3 tugas perbaikan disisipkan tepat sesudah tugas ini, lalu `EVAL-6-ulang` sekali; sisa TIDAK dan 5 hal membingungkan ke `plan/TINJAUAN-PEMILIK.md`.
- catatan: W1–W4 wajib YA. Sesudah evaluasi ulang tahap dinyatakan selesai apa pun hasilnya.

### DIRI-6 · Perbaikan diri sesudah Tahap 6

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: EVAL-6
- selesai bila: Satu subagent membaca `plan/EVALUASI-TAHAP-6.md` dan pelajaran MEMORI Tahap 6, lalu boleh mengubah skill gaya-bahasa, visualisasi, analisis-kritis, riset-tahap, evaluasi-tahap hanya dengan bukti dari Tahap 6, paling banyak 10 baris per skill, masing-masing dicatat sebagai keputusan dengan teks sebelum/sesudah; CLAUDE.md, PROPOSAL, dan CERITA-TAHAP-1/2 tidak disentuh (usulan ke `plan/USULAN-PERBAIKAN.md`); STATUS menulis "Tahap 6 selesai".
- catatan: Langkah penutup alur tahap.

## Penutup

### LAPORAN-AKHIR · Laporan akhir enam tahap

- jenis: crosscheck
- status: antre
- percobaan: 0
- bergantung: DIRI-6
- selesai bila: `plan/LAPORAN-AKHIR.md`: ringkasan 6 tahap, tautan 6 EVALUASI dan 5 RISET, isi `plan/TINJAUAN-PEMILIK.md` terurut dari yang paling penting, "Diputuskan tanpa pemilik" (MEMORI + arsip), "Setelah rilis" (SETELAH-TAHAP-1…6), perubahan skill yang dilakukan (keputusan DIRI-2…6), dan 10 halaman yang paling layak dilihat pemilik pertama; pengatur menulis "Semua tahap selesai" dan berhenti.
- catatan: -
