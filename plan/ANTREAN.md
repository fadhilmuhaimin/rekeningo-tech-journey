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
- status: antre
- percobaan: 0
- bergantung: 2.17, lab-b2-query
- selesai bila: halaman Masalah 2.18 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (tanpa ★); rekaman dari `labs/b2-query`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: -

### 2.19 · Pagination kursor + ADR 16

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 2.18, lab-b2-query
- selesai bila: halaman Konsep+ADR 2.19 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); rekaman dari `labs/b2-query`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Isi lama B1.3 dipakai ulang. Dari tinjauan #266: kursor `(dibuat, id)` bisa melewatkan transaksi yang mulai lebih dulu dan COMMIT sesudah halaman dibaca (`dibuat` = awal transaction); ADR 16 wajib membahasnya; rekaman belum memuatnya.

### 2.20 · Ukuran payload dan kuota HP

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 2.19
- selesai bila: halaman Konsep 2.20 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (tanpa ★); tanpa lab baru; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Lab `e5-payload` yang ada; bila rekamannya perlu diselaraskan ke cerita, sisipkan `2.20-lab`. Isi lama E5 dipakai ulang.

### 2.21 · M13: Migrasi di jam makan siang

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 2.20, lab-b4-skema
- selesai bila: halaman Masalah 2.21 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); rekaman dari `labs/b4-skema`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Dari b4-skema (536, 537): "40 detik" tidak direkam; lama tunggu = sisa transaction panjang + lama migrasi, bukan ALTER itu sendiri.

### 2.22 · Ubah skema tanpa downtime + ADR 17

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 2.21, lab-b4-skema
- selesai bila: halaman Konsep+ADR 2.22 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); rekaman dari `labs/b4-skema`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Isi lama B4.2 dipakai ulang.

### 2.23 · M14: Batas harian yang hilang

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 2.22, lab-api-t2
- selesai bila: halaman Masalah 2.23 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); rekaman dari `labs/api-t2`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Rekaman merge yang menghapus batas harian dan tes yang menangkapnya kemungkinan butuh `2.23-lab`.

### 2.24 · Tim dan infra Tahap 2: review, branch protection, tes integrasi + ADR 18

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 2.23, lab-api-t2
- selesai bila: halaman Tim-infra 2.24 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); rekaman dari `labs/api-t2`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: -

### 2.25 · M15: Rp15.000 di file bank

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 2.24, lab-t2-pencairan
- selesai bila: halaman Masalah 2.25 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); rekaman dari `labs/t2-pencairan`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: -

### 2.26 · Job terjadwal yang idempoten dan rekonsiliasi + ADR 19

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 2.25, lab-t2-pencairan
- selesai bila: halaman Konsep+ADR 2.26 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); rekaman dari `labs/t2-pencairan`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Dari t2-pencairan (508): Keuangan mengambil file menurut status `dikirim`, bukan menurut ada atau tidaknya file.

### lab-c4a · Celah kunci dan IPv6 di c4-ratelimit

- jenis: perbaikan
- status: selesai
- percobaan: 0
- bergantung: lab-api-t2a
- selesai bila: `labs/c4-ratelimit/login`: percobaan login dicatat sebelum hash argon2id dengan lock baris (`SELECT … FOR UPDATE`) dan kunci dipasang begitu ambang tercapai, sehingga N tebakan bersamaan pada penghitung ambang hanya satu yang dinilai (tes bersamaan); key IP IPv6 dipotong ke prefix /64 (RFC 6459 5.2) dengan tes; `/ganti-password` menolak password dari daftar bocor fiktif lokal (OWASP ASVS 5.0.0 6.2.4); rekaman dari database bersih diulang identik; uji mutasi tiap perbaikan; halaman Tahap 2 yang sudah merujuk rekaman c4 tidak bergeser.
- catatan: Kategori rusak/keamanan dari tinjauan #294 (keputusan 718–719): celah yang sama ada di lab yang dipakai 2.27 dan 2.28. Selesai 2026-10-24 di PR lab/c4a (keputusan 659–661, `plan/masuk/lab-c4a.md`): `catatPercobaan` mencatat percobaan sebelum argon2id dengan `SELECT ... FOR UPDATE` dan memasang kunci di ambang (tes bersamaan gagal 3 dari 3 pada kode lama: 5 tebakan dinilai, penghitung akhir 9; lima tebakan bersamaan kini hanya satu yang dinilai), `kunciAlamat` memotong IPv6 ke /64 (rekaman bagian H lewat `X-Lab-IP`, IPv6 terekam di c4), dan daftar password bocor di `/ganti-password` ternyata SUDAH ada di c4 (yang belum punya adalah api-t2): ditambah tes, bagian I rekaman, dan label bahwa daftar 27 entri jauh di bawah 3.000 dari ASVS 6.2.4. Rekaman: `output/login/ratelimit.txt` +46 baris (bagian G–J) sesudah bagian F, 71 baris lama identik, dua kali dari database bersih identik; tidak ada halaman yang merujuk rekaman c4 (grep `situs/`). Uji mutasi: lock baris, prefix /64 (juga /56), cek daftar, reset password benar, kunci di ambang — semuanya menggagalkan tes atau `run-login.py`. Berikutnya: 2.27 dan 2.28 boleh memakai bagian G dan H; api-t2 `/ganti-password` belum punya daftar bocor (SETELAH-TAHAP-2). Tinjauan #304 (keputusan 798, 799): bagian H memuat batas kedua key /64 (prefix lebih luas, RFC 6177) dan komentar `daftar-bocor.txt` tidak lagi menyebut semua entri buatan sendiri; dua kali `cek-login` dan `test-login` (-race) identik dan lolos.

### 2.27 · M16: Akun Ani terkunci

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 2.26, lab-c4-ratelimit, lab-c4a
- selesai bila: halaman Masalah 2.27 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); rekaman dari `labs/c4-ratelimit`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: Hanya container lokal; beberapa percobaan, bukan skrip massal. Dari c4-ratelimit (550): akun terkunci dijawab 401 generik, jadi Ani mengira lupa password; halaman menyebut jalur lupa password atau notifikasi lewat jalur lain (mohon konfirmasi pemilik).

### 2.28 · Keamanan 4: brute force, credential stuffing, hash password + ADR 20

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 2.27, lab-c4-ratelimit
- selesai bila: halaman Keamanan+ADR 2.28 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); rekaman dari `labs/c4-ratelimit`; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: -

### 2.29 · M17: Tutup buku kedua lolos, PRD v3 datang

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 2.28
- selesai bila: halaman Masalah 2.29 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); tanpa lab baru; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: -

### 2.30 · Estimasi Tahap 2 → 3

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 2.29
- selesai bila: halaman Konsep 2.30 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); tanpa lab baru; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: -

### 2.31 · ADR 21: Sengaja belum dilakukan

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 2.30
- selesai bila: halaman ADR 2.31 sesuai `plan/CERITA-TAHAP-2.md` bagian 4 dan peta halaman Tahap 2 (★); tanpa lab baru; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: -

### 2.32 · Yang dibawa keluar dari Tahap 2

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 2.31
- selesai bila: halaman Konsep 2.32 sesuai `plan/CERITA-TAHAP-2.md` bagian 5 dan peta halaman Tahap 2 (★); tanpa lab baru; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: -

### 2.33 · Jembatan: pratinjau PRD v3

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: 2.32
- selesai bila: halaman PRD 2.33 sesuai `plan/CERITA-TAHAP-2.md` bagian 6 dan peta halaman Tahap 2 (★); tanpa lab baru; registry berubah dari "segera" ke halaman jadi; Definisi selesai bersama.
- catatan: -

### EVAL-2 · Evaluasi Tahap 2

- jenis: crosscheck
- status: antre
- percobaan: 0
- bergantung: 2.33, G-axe
- selesai bila: `plan/EVALUASI-TAHAP-2.md` sesuai skill evaluasi-tahap oleh subagent yang tidak menulis halaman Tahap 2: kartu W1–W8 dengan satu baris bukti yang bisa diulang, tiga pertanyaan pembaca di tiga halaman acak (seed 2), uji baca oleh subagent segar (5 hal membingungkan). Ada TIDAK: paling banyak 3 tugas perbaikan disisipkan tepat sesudah tugas ini, lalu `EVAL-2-ulang` sekali; sisa TIDAK dan 5 hal membingungkan ke `plan/TINJAUAN-PEMILIK.md`.
- catatan: W1–W4 wajib YA. Sesudah evaluasi ulang tahap dinyatakan selesai apa pun hasilnya.

### DIRI-2 · Perbaikan diri sesudah Tahap 2

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: EVAL-2
- selesai bila: Satu subagent membaca `plan/EVALUASI-TAHAP-2.md` dan pelajaran MEMORI Tahap 2, lalu boleh mengubah skill gaya-bahasa, visualisasi, analisis-kritis, riset-tahap, evaluasi-tahap hanya dengan bukti dari Tahap 2, paling banyak 10 baris per skill, masing-masing dicatat sebagai keputusan dengan teks sebelum/sesudah; CLAUDE.md, PROPOSAL, dan CERITA-TAHAP-1/2 tidak disentuh (usulan ke `plan/USULAN-PERBAIKAN.md`); STATUS menulis "Tahap 2 selesai".
- catatan: Langkah penutup alur tahap.

## Tahap 3

Alur tujuh langkah (keputusan 554). Tugas lab dan halaman Tahap 3 disisipkan oleh `T3-siap` dari peta halaman naskah: lab sebelum `ERD3`, halaman sesudah widget. Nomor keputusan: 800–999 (konten +0–99, teknis +100–149, pengatur +150–199).

### RISET-3 · Riset Tahap 3

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: DIRI-2
- selesai bila: `plan/RISET-TAHAP-3.md` (≤ 120 baris) sesuai skill riset-tahap untuk Tahap 3 (seluruh cabang di enam kota, PROPOSAL "Enam tahap dalam satu tabel"): konsep dengan 1–3 sumber primer bertanggal dan ID `R3-nn`, yang berubah sejak PROPOSAL, teknik terbaru masuk/tidak, satu kasus industri nyata untuk ADR dari sumber primer, jebakan forum, angka beban dan ukuran data dihitung ulang dengan rumus PROPOSAL sebagai Asumsi; pengatur membuka tiga ID acak.
- catatan: -

### NASKAH-3 · Naskah Tahap 3 (draft otomatis)

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: RISET-3
- selesai bila: `plan/CERITA-TAHAP-3.md` dengan struktur persis CERITA-TAHAP-2 (Kenapa dokumen ini ada, Latar, Tokoh baru, 1 PRD v3, 2 Dari fitur ke pekerjaan teknis, 3 Inti teknis, 3b Skema data, 4 Masalah, 5 Yang dibawa keluar, 6 Jembatan, Peta halaman, Jalur per peran), baris pertama "Draft otomatis, belum ditinjau pemilik", memakai RISET-TAHAP-3; nomor M dan ADR melanjutkan tahap sebelumnya; peta halaman 24–32 halaman dengan kolom lab, setiap halaman masalah dipicu fitur PRD, pihak ketiga selalu tiruan lokal; peninjau konsistensi (subagent kedua) membaca naskah terhadap semua naskah sebelumnya (tokoh, nama perusahaan, angka saldo dan user, istilah glosarium, nomor ADR dan M, rantai PRD → fitur → teknis → masalah → konsep) dan semua temuannya ditutup.
- catatan: Satu-satunya naskah yang ditulis Claude; Tahap 1–2 milik pemilik dan tidak disentuh.

### T3-siap · RINGKAS, registry, dan antrean Tahap 3

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: NASKAH-3
- selesai bila: `plan/RINGKAS.md` (≤ 60 baris) memuat peta halaman Tahap 3 satu baris per halaman dan tahap sebelumnya diringkas; registry `situs/data/cerita.json` memuat semua halaman Tahap 3 sesuai naskah (judul, jenis, bagian, ★, peran, prasyarat, lab), yang belum ditulis tampil "segera", halaman lama tahap ini menjadi `lama` bila diganti; ANTREAN mendapat tugas lab (sebelum `ERD3`) dan tugas halaman berurutan (sesudah tugas widget) dengan `selesai bila` merujuk bagian naskah; `sinkron_cerita.py`, `cek_tautan.py`, dan gerbang lolos.
- catatan: Sekaligus mengganti `bergantung` `EVAL-3` ke halaman terakhir Tahap 3 dan `ERD3` ke lab utama Tahap 3; halaman yang memakai widget bergantung pada tugas widgetnya.

### ERD3 · ERD Tahap 3 dari skema lab

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: T3-siap
- selesai bila: `tools/erd.py` membaca skema akhir lab utama Tahap 3 dan menulis `situs/data/erd/tahap-3.json` beserta selisih terhadap Tahap 2; `--cek` di gerbang mencakup Tahap 3; widget ERD bertumbuh menampilkan Tahap 3 berdampingan dengan Tahap 2 di `/uji/erd/`; selisih dengan mermaid naskah 3b tercatat (lab yang benar).
- catatan: `T3-siap` menambahkan lab utama Tahap 3 ke `bergantung` tugas ini.

### W3-pool · Simulasi connection pool dan Little's Law

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: ERD3
- selesai bila: Widget baru (skill visualisasi) dibuat sebelum halaman yang memakainya: slider beban (request per detik) dan lama query; L = λ × W dihitung dan ditampilkan; antrean menunggu koneksi terlihat saat L melewati ukuran pool; angka contoh dari rekaman lab pool Tahap 3 atau berlabel Simulasi/Ilustrasi. Tebak dulu sebelum hasil, satu hal yang bisa diubah pembaca, chip sumber ke rekaman atau label Simulasi/Ilustrasi, keyboard penuh, `prefers-reduced-motion` tanpa gerak dengan fungsi tetap, teks sebagai DOM (bukan di SVG), token warna gelap/terang, dimuat hanya di halaman yang memakainya, ukuran JS dicatat di `plan/AUDIT-TAMPILAN.md`, diuji di halaman `/uji/`, axe 0, tes Vitest untuk logika murni.
- catatan: -

### W3-cache · Simulasi cache dan invalidation

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: ERD3
- selesai bila: Widget baru (skill visualisasi) dibuat sebelum halaman yang memakainya: baca dengan dan tanpa cache, hit/miss, TTL dan invalidasi saat saldo berubah, kasus data basi yang terlihat orang; skenario dari lab cache Tahap 3. Tebak dulu sebelum hasil, satu hal yang bisa diubah pembaca, chip sumber ke rekaman atau label Simulasi/Ilustrasi, keyboard penuh, `prefers-reduced-motion` tanpa gerak dengan fungsi tetap, teks sebagai DOM (bukan di SVG), token warna gelap/terang, dimuat hanya di halaman yang memakainya, ukuran JS dicatat di `plan/AUDIT-TAMPILAN.md`, diuji di halaman `/uji/`, axe 0, tes Vitest untuk logika murni.
- catatan: -

### W3-outbox · Timeline outbox dan worker

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: ERD3
- selesai bila: Widget baru (skill visualisasi) dibuat sebelum halaman yang memakainya: garis waktu jurnal + baris outbox dalam satu transaction, worker mengambil, gagal, retry, notifikasi sekali; dari rekaman lab outbox Tahap 3. Tebak dulu sebelum hasil, satu hal yang bisa diubah pembaca, chip sumber ke rekaman atau label Simulasi/Ilustrasi, keyboard penuh, `prefers-reduced-motion` tanpa gerak dengan fungsi tetap, teks sebagai DOM (bukan di SVG), token warna gelap/terang, dimuat hanya di halaman yang memakainya, ukuran JS dicatat di `plan/AUDIT-TAMPILAN.md`, diuji di halaman `/uji/`, axe 0, tes Vitest untuk logika murni.
- catatan: -

### EVAL-3 · Evaluasi Tahap 3

- jenis: crosscheck
- status: antre
- percobaan: 0
- bergantung: W3-outbox
- selesai bila: `plan/EVALUASI-TAHAP-3.md` sesuai skill evaluasi-tahap oleh subagent yang tidak menulis halaman Tahap 3: kartu W1–W8 dengan satu baris bukti yang bisa diulang, tiga pertanyaan pembaca di tiga halaman acak (seed 3), uji baca oleh subagent segar (5 hal membingungkan). Ada TIDAK: paling banyak 3 tugas perbaikan disisipkan tepat sesudah tugas ini, lalu `EVAL-3-ulang` sekali; sisa TIDAK dan 5 hal membingungkan ke `plan/TINJAUAN-PEMILIK.md`.
- catatan: W1–W4 wajib YA. Sesudah evaluasi ulang tahap dinyatakan selesai apa pun hasilnya.

### DIRI-3 · Perbaikan diri sesudah Tahap 3

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: EVAL-3
- selesai bila: Satu subagent membaca `plan/EVALUASI-TAHAP-3.md` dan pelajaran MEMORI Tahap 3, lalu boleh mengubah skill gaya-bahasa, visualisasi, analisis-kritis, riset-tahap, evaluasi-tahap hanya dengan bukti dari Tahap 3, paling banyak 10 baris per skill, masing-masing dicatat sebagai keputusan dengan teks sebelum/sesudah; CLAUDE.md, PROPOSAL, dan CERITA-TAHAP-1/2 tidak disentuh (usulan ke `plan/USULAN-PERBAIKAN.md`); STATUS menulis "Tahap 3 selesai".
- catatan: Langkah penutup alur tahap.

## Tahap 4

Alur tujuh langkah (keputusan 554). Tugas lab dan halaman Tahap 4 disisipkan oleh `T4-siap` dari peta halaman naskah: lab sebelum `ERD4`, halaman sesudah widget. Nomor keputusan: 1000–1199 (konten +0–99, teknis +100–149, pengatur +150–199).

### RISET-4 · Riset Tahap 4

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: DIRI-3
- selesai bila: `plan/RISET-TAHAP-4.md` (≤ 120 baris) sesuai skill riset-tahap untuk Tahap 4 (integrasi pihak ketiga dan tiga tim, PROPOSAL "Enam tahap dalam satu tabel"): konsep dengan 1–3 sumber primer bertanggal dan ID `R4-nn`, yang berubah sejak PROPOSAL, teknik terbaru masuk/tidak, satu kasus industri nyata untuk ADR dari sumber primer, jebakan forum, angka beban dan ukuran data dihitung ulang dengan rumus PROPOSAL sebagai Asumsi; pengatur membuka tiga ID acak.
- catatan: -

### NASKAH-4 · Naskah Tahap 4 (draft otomatis)

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: RISET-4
- selesai bila: `plan/CERITA-TAHAP-4.md` dengan struktur persis CERITA-TAHAP-2 (Kenapa dokumen ini ada, Latar, Tokoh baru, 1 PRD v4, 2 Dari fitur ke pekerjaan teknis, 3 Inti teknis, 3b Skema data, 4 Masalah, 5 Yang dibawa keluar, 6 Jembatan, Peta halaman, Jalur per peran), baris pertama "Draft otomatis, belum ditinjau pemilik", memakai RISET-TAHAP-4; nomor M dan ADR melanjutkan tahap sebelumnya; peta halaman 24–32 halaman dengan kolom lab, setiap halaman masalah dipicu fitur PRD, pihak ketiga selalu tiruan lokal; peninjau konsistensi (subagent kedua) membaca naskah terhadap semua naskah sebelumnya (tokoh, nama perusahaan, angka saldo dan user, istilah glosarium, nomor ADR dan M, rantai PRD → fitur → teknis → masalah → konsep) dan semua temuannya ditutup.
- catatan: Satu-satunya naskah yang ditulis Claude; Tahap 1–2 milik pemilik dan tidak disentuh.

### T4-siap · RINGKAS, registry, dan antrean Tahap 4

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: NASKAH-4
- selesai bila: `plan/RINGKAS.md` (≤ 60 baris) memuat peta halaman Tahap 4 satu baris per halaman dan tahap sebelumnya diringkas; registry `situs/data/cerita.json` memuat semua halaman Tahap 4 sesuai naskah (judul, jenis, bagian, ★, peran, prasyarat, lab), yang belum ditulis tampil "segera", halaman lama tahap ini menjadi `lama` bila diganti; ANTREAN mendapat tugas lab (sebelum `ERD4`) dan tugas halaman berurutan (sesudah tugas widget) dengan `selesai bila` merujuk bagian naskah; `sinkron_cerita.py`, `cek_tautan.py`, dan gerbang lolos.
- catatan: Sekaligus mengganti `bergantung` `EVAL-4` ke halaman terakhir Tahap 4 dan `ERD4` ke lab utama Tahap 4; halaman yang memakai widget bergantung pada tugas widgetnya.

### ERD4 · ERD Tahap 4 dari skema lab

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: T4-siap
- selesai bila: `tools/erd.py` membaca skema akhir lab utama Tahap 4 dan menulis `situs/data/erd/tahap-4.json` beserta selisih terhadap Tahap 3; `--cek` di gerbang mencakup Tahap 4; widget ERD bertumbuh menampilkan Tahap 4 berdampingan dengan Tahap 3 di `/uji/erd/`; selisih dengan mermaid naskah 3b tercatat (lab yang benar).
- catatan: `T4-siap` menambahkan lab utama Tahap 4 ke `bergantung` tugas ini.

### W4-webhook · Scrollytelling webhook dan outbox

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: ERD4
- selesai bila: Widget baru (skill visualisasi) dibuat sebelum halaman yang memakainya: langkah demi langkah saat digulir (tanpa animasi otomatis): request ke gateway tiruan, webhook datang dua kali atau terlambat, outbox dan tabel event masuk, rekonsiliasi; dari rekaman lab Tahap 4. Tebak dulu sebelum hasil, satu hal yang bisa diubah pembaca, chip sumber ke rekaman atau label Simulasi/Ilustrasi, keyboard penuh, `prefers-reduced-motion` tanpa gerak dengan fungsi tetap, teks sebagai DOM (bukan di SVG), token warna gelap/terang, dimuat hanya di halaman yang memakainya, ukuran JS dicatat di `plan/AUDIT-TAMPILAN.md`, diuji di halaman `/uji/`, axe 0, tes Vitest untuk logika murni.
- catatan: -

### W4-breaker · Circuit breaker interaktif

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: ERD4
- selesai bila: Widget baru (skill visualisasi) dibuat sebelum halaman yang memakainya: pembaca mengatur error rate dan latensi pihak ketiga tiruan; status closed/open/half-open dan request yang ditolak cepat terlihat; ambang dari lab Tahap 4. Tebak dulu sebelum hasil, satu hal yang bisa diubah pembaca, chip sumber ke rekaman atau label Simulasi/Ilustrasi, keyboard penuh, `prefers-reduced-motion` tanpa gerak dengan fungsi tetap, teks sebagai DOM (bukan di SVG), token warna gelap/terang, dimuat hanya di halaman yang memakainya, ukuran JS dicatat di `plan/AUDIT-TAMPILAN.md`, diuji di halaman `/uji/`, axe 0, tes Vitest untuk logika murni.
- catatan: -

### W4-modul · Diagram batas modul

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: ERD4
- selesai bila: Widget baru (skill visualisasi) dibuat sebelum halaman yang memakainya: modular monolith: modul, API antar modul, tabel milik modul, panggilan terlarang ditandai; klik modul membuka pemilik (CODEOWNERS) dan halaman; data dari lab/registry Tahap 4. Tebak dulu sebelum hasil, satu hal yang bisa diubah pembaca, chip sumber ke rekaman atau label Simulasi/Ilustrasi, keyboard penuh, `prefers-reduced-motion` tanpa gerak dengan fungsi tetap, teks sebagai DOM (bukan di SVG), token warna gelap/terang, dimuat hanya di halaman yang memakainya, ukuran JS dicatat di `plan/AUDIT-TAMPILAN.md`, diuji di halaman `/uji/`, axe 0, tes Vitest untuk logika murni.
- catatan: -

### EVAL-4 · Evaluasi Tahap 4

- jenis: crosscheck
- status: antre
- percobaan: 0
- bergantung: W4-modul
- selesai bila: `plan/EVALUASI-TAHAP-4.md` sesuai skill evaluasi-tahap oleh subagent yang tidak menulis halaman Tahap 4: kartu W1–W8 dengan satu baris bukti yang bisa diulang, tiga pertanyaan pembaca di tiga halaman acak (seed 4), uji baca oleh subagent segar (5 hal membingungkan). Ada TIDAK: paling banyak 3 tugas perbaikan disisipkan tepat sesudah tugas ini, lalu `EVAL-4-ulang` sekali; sisa TIDAK dan 5 hal membingungkan ke `plan/TINJAUAN-PEMILIK.md`.
- catatan: W1–W4 wajib YA. Sesudah evaluasi ulang tahap dinyatakan selesai apa pun hasilnya.

### DIRI-4 · Perbaikan diri sesudah Tahap 4

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: EVAL-4
- selesai bila: Satu subagent membaca `plan/EVALUASI-TAHAP-4.md` dan pelajaran MEMORI Tahap 4, lalu boleh mengubah skill gaya-bahasa, visualisasi, analisis-kritis, riset-tahap, evaluasi-tahap hanya dengan bukti dari Tahap 4, paling banyak 10 baris per skill, masing-masing dicatat sebagai keputusan dengan teks sebelum/sesudah; CLAUDE.md, PROPOSAL, dan CERITA-TAHAP-1/2 tidak disentuh (usulan ke `plan/USULAN-PERBAIKAN.md`); STATUS menulis "Tahap 4 selesai".
- catatan: Langkah penutup alur tahap.

## Tahap 5

Alur tujuh langkah (keputusan 554). Tugas lab dan halaman Tahap 5 disisipkan oleh `T5-siap` dari peta halaman naskah: lab sebelum `ERD5`, halaman sesudah widget. Nomor keputusan: 1200–1399 (konten +0–99, teknis +100–149, pengatur +150–199).

### RISET-5 · Riset Tahap 5

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: DIRI-4
- selesai bila: `plan/RISET-TAHAP-5.md` (≤ 120 baris) sesuai skill riset-tahap untuk Tahap 5 (skala nasional, PROPOSAL "Enam tahap dalam satu tabel"): konsep dengan 1–3 sumber primer bertanggal dan ID `R5-nn`, yang berubah sejak PROPOSAL, teknik terbaru masuk/tidak, satu kasus industri nyata untuk ADR dari sumber primer, jebakan forum, angka beban dan ukuran data dihitung ulang dengan rumus PROPOSAL sebagai Asumsi; pengatur membuka tiga ID acak.
- catatan: -

### NASKAH-5 · Naskah Tahap 5 (draft otomatis)

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: RISET-5
- selesai bila: `plan/CERITA-TAHAP-5.md` dengan struktur persis CERITA-TAHAP-2 (Kenapa dokumen ini ada, Latar, Tokoh baru, 1 PRD v5, 2 Dari fitur ke pekerjaan teknis, 3 Inti teknis, 3b Skema data, 4 Masalah, 5 Yang dibawa keluar, 6 Jembatan, Peta halaman, Jalur per peran), baris pertama "Draft otomatis, belum ditinjau pemilik", memakai RISET-TAHAP-5; nomor M dan ADR melanjutkan tahap sebelumnya; peta halaman 24–32 halaman dengan kolom lab, setiap halaman masalah dipicu fitur PRD, pihak ketiga selalu tiruan lokal; peninjau konsistensi (subagent kedua) membaca naskah terhadap semua naskah sebelumnya (tokoh, nama perusahaan, angka saldo dan user, istilah glosarium, nomor ADR dan M, rantai PRD → fitur → teknis → masalah → konsep) dan semua temuannya ditutup.
- catatan: Satu-satunya naskah yang ditulis Claude; Tahap 1–2 milik pemilik dan tidak disentuh.

### T5-siap · RINGKAS, registry, dan antrean Tahap 5

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: NASKAH-5
- selesai bila: `plan/RINGKAS.md` (≤ 60 baris) memuat peta halaman Tahap 5 satu baris per halaman dan tahap sebelumnya diringkas; registry `situs/data/cerita.json` memuat semua halaman Tahap 5 sesuai naskah (judul, jenis, bagian, ★, peran, prasyarat, lab), yang belum ditulis tampil "segera", halaman lama tahap ini menjadi `lama` bila diganti; ANTREAN mendapat tugas lab (sebelum `ERD5`) dan tugas halaman berurutan (sesudah tugas widget) dengan `selesai bila` merujuk bagian naskah; `sinkron_cerita.py`, `cek_tautan.py`, dan gerbang lolos.
- catatan: Sekaligus mengganti `bergantung` `EVAL-5` ke halaman terakhir Tahap 5 dan `ERD5` ke lab utama Tahap 5; halaman yang memakai widget bergantung pada tugas widgetnya.

### ERD5 · ERD Tahap 5 dari skema lab

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: T5-siap
- selesai bila: `tools/erd.py` membaca skema akhir lab utama Tahap 5 dan menulis `situs/data/erd/tahap-5.json` beserta selisih terhadap Tahap 4; `--cek` di gerbang mencakup Tahap 5; widget ERD bertumbuh menampilkan Tahap 5 berdampingan dengan Tahap 4 di `/uji/erd/`; selisih dengan mermaid naskah 3b tercatat (lab yang benar).
- catatan: `T5-siap` menambahkan lab utama Tahap 5 ke `bergantung` tugas ini.

### W5-lag · Simulasi replication lag

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: ERD5
- selesai bila: Widget baru (skill visualisasi) dibuat sebelum halaman yang memakainya: tulis ke primary, baca dari replica dengan lag yang bisa diubah; kasus saldo lama setelah transfer; read-your-writes sebagai perbaikan; dari rekaman lab replica Tahap 5. Tebak dulu sebelum hasil, satu hal yang bisa diubah pembaca, chip sumber ke rekaman atau label Simulasi/Ilustrasi, keyboard penuh, `prefers-reduced-motion` tanpa gerak dengan fungsi tetap, teks sebagai DOM (bukan di SVG), token warna gelap/terang, dimuat hanya di halaman yang memakainya, ukuran JS dicatat di `plan/AUDIT-TAMPILAN.md`, diuji di halaman `/uji/`, axe 0, tes Vitest untuk logika murni.
- catatan: -

### W5-fanout · Simulasi fan-out notifikasi

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: ERD5
- selesai bila: Widget baru (skill visualisasi) dibuat sebelum halaman yang memakainya: satu kejadian ke banyak penerima, antrean per partisi, backpressure; ubah jumlah penerima; dari lab Tahap 5 atau berlabel Simulasi. Tebak dulu sebelum hasil, satu hal yang bisa diubah pembaca, chip sumber ke rekaman atau label Simulasi/Ilustrasi, keyboard penuh, `prefers-reduced-motion` tanpa gerak dengan fungsi tetap, teks sebagai DOM (bukan di SVG), token warna gelap/terang, dimuat hanya di halaman yang memakainya, ukuran JS dicatat di `plan/AUDIT-TAMPILAN.md`, diuji di halaman `/uji/`, axe 0, tes Vitest untuk logika murni.
- catatan: -

### W5-zona · Peta zona arsitektur

- jenis: interaksi
- status: antre
- percobaan: 0
- bergantung: ERD5
- selesai bila: Widget baru (skill visualisasi) dibuat sebelum halaman yang memakainya: lima lapisan dan batas tim Tahap 5 (PROPOSAL System design final) di atas DiagramArsitektur; klik zona membuka service, data, dan halaman; ledger tetap satu-satunya tempat uang bergerak. Tebak dulu sebelum hasil, satu hal yang bisa diubah pembaca, chip sumber ke rekaman atau label Simulasi/Ilustrasi, keyboard penuh, `prefers-reduced-motion` tanpa gerak dengan fungsi tetap, teks sebagai DOM (bukan di SVG), token warna gelap/terang, dimuat hanya di halaman yang memakainya, ukuran JS dicatat di `plan/AUDIT-TAMPILAN.md`, diuji di halaman `/uji/`, axe 0, tes Vitest untuk logika murni.
- catatan: -

### EVAL-5 · Evaluasi Tahap 5

- jenis: crosscheck
- status: antre
- percobaan: 0
- bergantung: W5-zona
- selesai bila: `plan/EVALUASI-TAHAP-5.md` sesuai skill evaluasi-tahap oleh subagent yang tidak menulis halaman Tahap 5: kartu W1–W8 dengan satu baris bukti yang bisa diulang, tiga pertanyaan pembaca di tiga halaman acak (seed 5), uji baca oleh subagent segar (5 hal membingungkan). Ada TIDAK: paling banyak 3 tugas perbaikan disisipkan tepat sesudah tugas ini, lalu `EVAL-5-ulang` sekali; sisa TIDAK dan 5 hal membingungkan ke `plan/TINJAUAN-PEMILIK.md`.
- catatan: W1–W4 wajib YA. Sesudah evaluasi ulang tahap dinyatakan selesai apa pun hasilnya.

### DIRI-5 · Perbaikan diri sesudah Tahap 5

- jenis: perbaikan
- status: antre
- percobaan: 0
- bergantung: EVAL-5
- selesai bila: Satu subagent membaca `plan/EVALUASI-TAHAP-5.md` dan pelajaran MEMORI Tahap 5, lalu boleh mengubah skill gaya-bahasa, visualisasi, analisis-kritis, riset-tahap, evaluasi-tahap hanya dengan bukti dari Tahap 5, paling banyak 10 baris per skill, masing-masing dicatat sebagai keputusan dengan teks sebelum/sesudah; CLAUDE.md, PROPOSAL, dan CERITA-TAHAP-1/2 tidak disentuh (usulan ke `plan/USULAN-PERBAIKAN.md`); STATUS menulis "Tahap 5 selesai".
- catatan: Langkah penutup alur tahap.

## Tahap 6

Alur tujuh langkah (keputusan 554). Tugas lab dan halaman Tahap 6 disisipkan oleh `T6-siap` dari peta halaman naskah: lab sebelum `ERD6`, halaman sesudah widget. Nomor keputusan: 1400–1599 (konten +0–99, teknis +100–149, pengatur +150–199). Tahap 6 konseptual: 10–12 halaman tanpa lab dan tanpa widget baru.

### RISET-6 · Riset Tahap 6

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: DIRI-5
- selesai bila: `plan/RISET-TAHAP-6.md` (≤ 120 baris) sesuai skill riset-tahap untuk Tahap 6 (regional (proyeksi), PROPOSAL "Enam tahap dalam satu tabel"): konsep dengan 1–3 sumber primer bertanggal dan ID `R6-nn`, yang berubah sejak PROPOSAL, teknik terbaru masuk/tidak, satu kasus industri nyata untuk ADR dari sumber primer, jebakan forum, angka beban dan ukuran data dihitung ulang dengan rumus PROPOSAL sebagai Asumsi; pengatur membuka tiga ID acak.
- catatan: -

### NASKAH-6 · Naskah Tahap 6 (draft otomatis)

- jenis: konten
- status: antre
- percobaan: 0
- bergantung: RISET-6
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
