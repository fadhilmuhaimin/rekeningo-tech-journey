# Arsip pelajaran dan catatan MEMORI

Dipindah dari plan/MEMORI.md saat MEMORI dipangkas ke 80 baris (keputusan 235, 2026-10-10). Tidak diimpor; cari dengan `grep -n <kata> plan/PELAJARAN-ARSIP.md`.

## Pelajaran (sampai 2026-10-10)

- Retrospektif K0e–I3 (2026-10-10): kelima tugas lolos tanpa percobaan ulang. Yang menyelamatkan tetap alat ukur kecil (I3: `ukur-gerak.mjs` menemukan `initial` di frame pertama yang tidak tertulis di dokumentasi). Penolakan dontAsk berulang untuk awalan env (`AXE=... node`) dan pipa ke `gzip`/`wc`; pakai argumen skrip dan skrip Python di `tmp/`.

- Motion `reducedMotion="user"` hanya mematikan transform dan layout; opacity tetap beranimasi, dan durasi 0 masih menggambar `initial` di frame pertama. Ukur frame pertama sesudah klik (`ukur-gerak.mjs`), jangan percaya konfigurasi.
- Menambah route di `src/pages/` atau `import()` lazy mengubah chunk bersama Vite: semua halaman berganti hash dan ukuran JS. Bandingkan sidik `tmp/sidik_dist.py` dan pastikan bedanya hanya pemindahan chunk.

- Perubahan CSS global di atas Inti (mis. meta K0d) menggeser layar pertama semua halaman; simpan keluaran `layar.mjs` sebelum dan bandingkan sesudahnya, jangan hanya halaman yang diubah. Diff shell `<(...)` ditolak mode dontAsk; pakai `tmp/banding_layar.py`.

- bun: `bun --cwd <dir> run <skrip>` mencetak bantuan dan keluar 0 (build "lolos" tanpa build); pakai `bun run --cwd <dir> <skrip>`. Gerbang build sekarang menuntut `Complete!` di log.

- Retrospektif K0–K0d (2026-10-10): keempat perbaikan tampilan lolos di percobaan pertama setelah diukur dengan alat kecil Playwright (`ukur-ilustrasi`, `ukur-judul`), bukan dengan melihat tangkapan saja. Tangkapan dan `layar.mjs` melewatkan luapan 1–5 px. Pola: ukur dulu, perbaiki, ukur ulang, masukkan alat ke gerbang.
- Setiap piksel tambahan di atas Inti di HP harus diambil dari tempat lain di layar pertama; cek `layar.mjs` untuk 1.23 (paling sempit).

- Di halaman konsep, visual pertama sesudah Inti mulai di y≈420 px pada 375×667; tersisa ±245 px. `node situs/tools/layar.mjs` dari root gagal (mencari `dist/` relatif cwd); pakai `npm --prefix situs run layar`.

- macOS di mesin ini tidak punya `timeout`/`gtimeout`; batasi lama perintah dengan timeout alat Bash atau `gh ... --watch`.
- Mode auto menolak sesi mengubah izinnya sendiri (`.claude/settings.json`, label Self-Modification), lewat Bash maupun Edit; pemilik yang memasang perubahan izin.
- `claude -p --output-format stream-json` selalu memancarkan `rate_limit_event` berstatus `allowed`; batas pemakaian dibaca dari field status, bukan dari teks "rate limit".
- Token di `:root[data-theme="light"]` (mis. `--sl-content-width`) mengalahkan override splash Starlight; beranda harus menyetel lebarnya sendiri di `.content-panel:has(.beranda)`.
- Build `main` di worktree: symlink `node_modules` membuat Vite gagal (path ganda); pakai `cp -cR` (clone APFS) dan salin `public/fonts` (di-.gitignore).
- Audit bahasa menolak kata "pemakai" (juga di kunci JSON registry); pakai "user".
- `tools/cek_situs.sh --layar` menyalakan preview di 127.0.0.1:4321; bila port itu dipakai dev server (yang mendengar di `localhost`), langkah layar gagal ECONNREFUSED. Jalankan `node tools/layar.mjs --url <preview lain>` dan `tangkap.mjs --url` manual; jangan mematikan dev server pemilik.
- Starlight 0.42 menyetel ukuran artikel dari `--sl-text-base`, bukan `--sl-text-body`; aturan `details {font-size:0.92em}` mengenai `details.blok` (keputusan 200).
- Merge berhenti sejak #115 (2026-10-09): `gh pr merge` ditolak pengaman mode otomatis satu kali, lalu sesi terus menumpuk PR (#116–#122) dan melapor "menunggu merge pemilik"; pemilik mengira sudah merge. Sekarang pemilik mengizinkan merge sendiri. Kalau merge ditolak lagi: berhenti, laporkan di baris pertama laporan, dan jangan memulai halaman berikutnya di atas PR yang belum di-merge.
- Setelah gerbang lolos, perubahan teks apa pun (termasuk perbaikan audit di Cek diri) wajib diikuti `python3 tools/sinkron_cerita.py` dan gerbang ulang; CI #119 gagal karena `kartu.json` tertinggal.
- gosec v2.29.0 G201/G202 hanya memeriksa query di assignment dan expression statement; query yang langsung di `return` tidak diperiksa (rekaman injection.txt E).
- Aturan Starlight `:is(ol,ul):has(> li > :not(...)) > li > :last-child` memberi margin-bottom 1.25rem; list berisi tombol (cari-bug) perlu override.
- Astro 7 `astro preview` berjalan di latar dan singleton; setelah build ulang, `astro preview stop` lalu jalankan lagi, kalau tidak halaman lama tersaji. Port bisa pindah ke 4322 (cek `astro preview status`).
- Beberapa sesi Claude bisa memakai working tree yang sama; cek `git branch --show-current` sebelum commit, dan pakai `git worktree add` untuk pekerjaan panjang. Worktree butuh `situs/node_modules`, `labs/.venv` (symlink) dan `situs/public/fonts` (salin, diabaikan git).
- `node tools/tangkap.mjs` menulis ke `tangkapan/` relatif cwd; jalankan dari `situs/` (di-.gitignore di sana), bukan dari root.
- Hook PreCompact: stdout dan stderr dengan exit 0 hanya masuk debug log, tidak terlihat model; exit 2 memblokir compaction. Stdout SessionStart masuk konteks (docs hooks resmi).
- Di dalam blok, Cek diri ditulis `### Cek diri`; sinkron membacanya sejak keputusan 127 dan menolak halaman konsep baru dengan kurang dari 3 kartu.
- Widget lama dengan baris horizontal (flex) kena margin saudara Starlight; tambahkan kontainernya ke aturan `:is(...) > * + *` di tema.css (keputusan 124, 128).
- ThemeSelect bawaan Starlight memilih "auto" bila belum ada pilihan dan menimpa default gelap; diganti `PilihTema.astro` (keputusan 119). `tangkap.mjs` kini memeriksa kunjungan pertama dengan sistem terang.
- Komponen di dalam MDX bisa membaca `Astro.locals.starlightRoute.entry.body` (teks MDX halaman) untuk tahu posisinya.
- File `.js` di bawah `situs/` dibaca sebagai ES module (`situs/package.json` type module); widget UMD lama butuh `situs/lama/package.json` type commonjs.
- Di zsh, `for f in $VAR` tidak memecah kata; pakai `xargs` atau `${=VAR}`.
- Gerbang situs sekarang: `bash tools/cek_situs.sh --layar` (±3 menit lokal). Python di alat cukup `python3` sistem (pustaka standar).
- Di zsh, `grep -c` tanpa hasil keluar 1 dan memutus rantai `&&`; `PIPESTATUS` tidak ada (pakai `pipestatus`).
- `tools/cek_batch.sh` lokal (2026-10-08, sebelum perubahan apa pun): lolos; 60/60 halaman, 103 tes widget, layar pertama 0 gagal; 52 peringatan audit bahasa (bukan error) dan 19 peringatan "Inti > 175 karakter" adalah keadaan normal, bukan regresi. Lama ±3 menit.
- `make -C labs/b3-race run` dari nol (venv dihapus, container `down -v`): `make lab` 13 detik, `run` 3 detik. Satu-satunya diff adalah baris tanggal `direkam`/`recorded`; dikembalikan sesuai keputusan 82.
- Workflow `on: pull_request` + `push: [main]` tidak jalan saat branch percobaan didorong; branch `percobaan/**` ditambahkan ke pemicu push supaya pembuktian CI tidak butuh PR.
- `act` tidak terpasang di mesin ini; pembuktian CI memakai branch percobaan di GitHub.
- Foreground `sleep` diblokir di lingkungan Claude Code; pakai `gh run watch` di background.
- Di runner `ubuntu-latest` (24.04) Chrome headless mati dengan `ENOENT DevToolsActivePort`: penyebabnya AppArmor membatasi user namespace. Perbaikan lingkungan: `sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0` sebelum `cek_batch.sh`; kode `tools/lib/chrome.mjs` tidak diubah.
- Astro 7 memakai pemroses Markdown "Sätteri"; `markdown.remarkPlugins` hanya jalan dengan `processor: unified({...})` dari `@astrojs/markdown-remark` (harus dipasang eksplisit). `smartypants: false` supaya tanda kutip sama dengan situs lama.
- Starlight 0.42 + Astro 7: route 404 bawaan memanggil `getEntry("docs","404")` dan Astro mencetak WARN bila tidak ada; dengan `404.md` route `[...slug]` bentrok. Solusi: `disable404Route: true` + `src/content/docs/404.md`.
- Modul yang diimpor komponen Astro dipindah ke `dist/.prerender/chunks/` saat build, jadi `import.meta.url` tidak bisa dipakai untuk mencari root repo; `tools/registri.mjs` mencari `mkdocs.yml` dari `process.cwd()` ke atas.
- Starlight memerlukan koleksi `i18n` (bisa berisi `{}`) bila `locales` diisi; tanpa itu ada WARN "collection i18n does not exist".
- Blok kode Shiki tanpa `overflow-x: auto` membuat scroll horizontal di 375 px; `tools/tangkap.mjs` memeriksa `scrollWidth` di tiap tangkapan.
- Widget `stackstep.js` bergantung pada DOM Material (`.tabbed-set`, `span[id^=__span]`); kontrak itu dibuat ulang oleh `Snippet.astro` + `TabSet.astro` (keputusan 103), bukan dengan mengubah widget.
- Starlight membungkus heading jadi `div.sl-heading-wrapper > h2 + a.sl-anchor-link`; pemeriksa yang berjalan dari `h2.nextElementSibling` harus mulai dari pembungkusnya (bug pertama `tools/layar.mjs` melaporkan lolos palsu).
- Tipe 19 px + header Starlight + bar "Di halaman ini" di HP membuat layar pertama sempit: `.content-panel` padding 0.75rem (0.6rem di HP), H1 2.2rem/1.6rem, pretest rapat ke Inti. Margin 1.11 di 375×667 tinggal 9 px; halaman dengan judul dua baris perlu dicek dulu dengan `npm run layar`.
- Konverter: link Markdown relatif ke `.md` lain (`../cerita/tahap-1.md`) harus diubah ke URL absolut lewat registry; `</details>` dan `</TabSet>` butuh baris kosong sesudahnya supaya heading berikutnya tidak tertelan MDX.
- Chromium di runner Linux merender ±25 px lebih tinggi daripada di Mac untuk bagian atas halaman HP; margin layar pertama lokal harus ≥ 20 px (ambang `tipis`), bukan sekadar > 0.
- Panggilan Bash paralel berbagi direktori kerja; selalu pakai path absolut untuk `node tools/...`.
- Halaman lama dengan judul pendek di H1 (keputusan 68/74) berbeda dari `title` frontmatter; Starlight memakai satu `title`, jadi konverter mengambil H1 badan. `banding.mjs` menangkapnya sebagai "urutan heading BERBEDA".
- pymdownx.snippets punya dua pola selain region: beberapa baris `--8<--` dalam satu fence (digabung) dan rentang baris `file:1:13`; Snippet mendukung `files={[...]}` dan `lines="1:13"`.
- (dipindah dari MEMORI 2026-10-11, K1x) Data widget lama (skenario alur) ditulis di `situs/lama/widgets/data/`; `situs/public/widgets/` tidak dilacak git dan disalin saat build. `tools/sinkron_cerita.py` mengabaikan argumen (`--help` pun langsung menyinkronkan).
- (dipindah dari MEMORI 2026-10-11) Astro 7 `preview` otomatis jadi daemon bila agen terdeteksi, dan bila daemon lama hidup ia keluar tanpa menyalakan server baru; `curl /` berhasil tidak membuktikan server melayani build ini (G1 memakai penanda per jalan di `situs/dist`).
- (dipindah dari MEMORI 2026-10-11) Retrospektif K0e–I3: alat ukur kecil (ukur-gerak, ukur-ilustrasi, ukur-judul) menangkap yang tidak terlihat di tangkapan. Pola: ukur dulu, perbaiki, ukur ulang, masukkan alat ke gerbang.
- (dipindah dari MEMORI 2026-10-11) Motion `reducedMotion="user"` hanya mematikan transform dan layout; ukur frame pertama sesudah klik.
- (dipindah dari MEMORI 2026-10-11) Route baru di `src/pages/` atau `import()` lazy mengubah chunk bersama Vite: semua halaman berganti hash; bandingkan sidik `tmp/sidik_dist.py`.
- (dipindah dari MEMORI 2026-10-12) Retrospektif I4–1.28: halaman lama yang ditulis ulang membawa data lab lama yang bertentangan dengan naskah (JWT 15 menit di B5.1, ID teks `budi`/`ani` di b5-rls); cocokkan rekaman lama dengan skema v1 dan ADR naskah sebelum dipakai ulang. Satu rekaman khusus per halaman (`authz.txt`) lebih jelas daripada potongan dari lima file rekaman.
- (dipindah dari MEMORI 2026-10-12) Lab SQL yang di-pipe ke `grep` kehilangan exit status psql; tambahkan pemeriksaan hasil di Makefile (pola `labs/b5-rls/Makefile`).
- (dipindah dari MEMORI 2026-10-12) Komentar XML di SVG tidak boleh memuat `--` (mis. nama token `--aksen`): favicon jadi gambar rusak tanpa error build; parse SVG dengan `xml.etree`.
- (dipindah dari MEMORI 2026-10-12) Lab psql dengan `-e`: `\set ECHO none` menyembunyikan setup panjang (fungsi, policy); `DROP SCHEMA ... CASCADE` atas lebih dari satu objek mencetak `DETAIL:` yang tidak tersaring `^NOTICE`, jadi run ulang berbeda dari run bersih.
- (dipindah dari MEMORI 2026-10-12) Mode dontAsk/auto menolak: perintah majemuk dengan `cd`, heredoc, loop shell, awalan env (`AXE=...`), diff `<(...)`, pipa ke `gzip`/`wc`, mengubah `.claude/settings.json`; pakai skrip di `tmp/` dan path relatif.
- (dipindah dari MEMORI 2026-10-12) `tmp/sidik_dist.py` hanya menghitung file yang dirujuk HTML; chunk yang diimpor island (React Flow) terlihat lewat `tmp/ukur_diagram_js.py` atau byte jaringan (`situs/tangkapan/i5b-jaringan.mjs`). React Flow `fitView` hanya untuk node awal: data baru = ReactFlow baru (`key`).

## Sedang dikerjakan (sampai 2026-10-10)

2026-10-10 · 1.26 M5 selesai (keputusan 234), branch `tahap-1/m5-angka-di-url`. Halaman `tahap-1/m5-angka-di-url.mdx`, Rantai `t1-m5-pemilik.json`, alur `lama/widgets/data/skenario/t1-m5.json`, ilustrasi `m5` (tanpa teks di SVG). Token di app hanya berlabel Ilustrasi dan merujuk 1.29; 1.29 harus memuat ADR 8 dengan sumber shared_preferences 2.5.6 dan flutter_secure_storage 11.2.0. Berikutnya: `python3 tools/antrean.py berikut`.
2026-10-10 · I4 selesai (keputusan 232), branch `interaksi/i4`. Diagram arsitektur: `<DiagramArsitektur client:visible id="..." judul="Arsitektur Tahap N" data={Arsitektur.parse(t.arsitektur)} />` dari `situs/src/diagram/` (data registry `tahap[].arsitektur`, skema di `skema.ts`, tata di `tata.ts`). Contoh: `src/pages/uji/diagram.astro`. Diagram baru wajib lolos `ukur-diagram.mjs` (path uji di alat itu). Ukuran JS per halaman: `python3 tmp/ukur_diagram_js.py` (penutupan impor; siapa yang memuat React Flow). Berikutnya: `python3 tools/antrean.py berikut`.
I3 selesai (keputusan 231), branch `interaksi/i3`. Komponen yang memakai gerak: bungkus island dengan `MotionProvider` (`situs/src/gerak/`), pakai `import * as m from "motion/react-m"`, `transition` dari `useGerak("cepat"|"sedang", "masuk"|"keluar")`, `initial` dari `useAwal(...)`; jangan tulis `duration: <angka>` (Vitest gagal). Contoh: `ContohGerak.tsx` di `/uji/gerak/` (StarlightPage, di luar registry). `ukur-gerak.mjs --axe tmp/axe/axe.min.js` menjalankan axe juga (axe-core 4.10.3 dari unpkg; env `AXE=` di depan perintah ditolak dontAsk). Berikutnya: `python3 tools/antrean.py berikut`.
I2 selesai (keputusan 229, 230): `motion` 14.1.0 dan `@xyflow/react` 12.12.0 dipin persis; ukuran paket diukur `python3 tmp/ukur-paket/ukur.py`.
I1 selesai (keputusan 225), branch `interaksi/i1`: situs memakai bun 1.4.2 (`situs/bun.lock`, CI `oven-sh/setup-bun@v2`). Perintah situs sekarang: `bun run --cwd situs build|preview|test|cek-tipe|tangkap|layar` (urutan ini; `bun --cwd situs run x` mencetak bantuan dengan exit 0). bun lokal masih 1.2.19; versi CI dijalankan dengan `npx --yes bun@1.4.2 ...`. Ukuran JS per halaman dicatat di `plan/AUDIT-TAMPILAN.md` bagian 7 (alat sementara `tmp/sidik_dist.py`, `tmp/banding_dist.py`). Berikutnya: `python3 tools/antrean.py berikut` (I2: `bun add` motion dan @xyflow/react).
K0e selesai (keputusan 224): chip `amount`/`jumlah` di `situs/src/components/Ilustrasi.astro` dilebarkan; `ukur-ilustrasi.mjs` dan `ukur-judul.mjs` kini sama-sama di `cek_situs.sh --layar`. Ilustrasi baru (M5, M6, latar) wajib lolos `ukur-ilustrasi` (tambahkan path halamannya ke daftar di alat itu). Jangan tambah tinggi di atas Inti di HP: 1.23 hanya punya 28 px di 375×667. Berikutnya: `python3 tools/antrean.py berikut` (I1). Preview yang tertinggal dimatikan dengan `npm --prefix situs run preview -- stop` (`npx --prefix situs astro preview stop` dari root tidak menemukannya). `layar.mjs` tidak mengukur halaman ADR ("tanpa Inti"); cek layar pertama ADR dengan tangkapan. Rantai di Inti selalu pakai `ringkas` dan maksimal dua baris pendek; ukur dengan `npm --prefix situs run layar -- --url http://127.0.0.1:4321` (perlu build + preview ulang). Tangkapan dari root: `npm --prefix situs run tangkap -- --url http://127.0.0.1:4321 --path /<path>/` (menulis ke `situs/tangkapan/`); `cd` dan perintah majemuk ditolak mode dontAsk, jadi satu perintah per panggilan dengan path relatif.
2026-10-09 · Sistem kerja otomatis siap (keputusan 216, 217). Satu-satunya pekerja: `tools/jalankan-otomatis.sh`; setiap iterasi membaca `plan/PROTOKOL-OTOMATIS.md` dan mengerjakan satu tugas dari `plan/ANTREAN.md` (berikutnya: `python3 tools/antrean.py berikut`). Tidak ada worktree lagi; kerja di folder utama, branch dari main, paling banyak satu PR terbuka, merge sendiri bila CI hijau. Lanjutkan: `caffeinate -dims bash tools/jalankan-otomatis.sh` di main bersih.
Pola tulis ulang halaman lama: pindah ke `tahap-1/<slug>.mdx`, lima blok, contoh disesuaikan dengan PRD v1 (tanpa katalog/pesanan), hapus file lama + data widget lama yang tidak dipakai, perbarui `path`, `prasyarat`, hapus `lama` di registry, perbarui `alat/indeks-topik.mdx`, lalu `python3 tools/sinkron_cerita.py`.
Pola per halaman: branch `tahap-1/<slug>` dari `main`; lab dulu bila perlu (PR sendiri); halaman (PR sendiri); gerbang `bash tools/cek_situs.sh --layar > tmp/cek.txt; tail -30`; tangkapan `cd situs && npm run preview` lalu `node tools/tangkap.mjs --path /tahap-1/<slug>/` (dari `situs/`); lihat sendiri; KEPUTUSAN + STATUS + MEMORI; merge bila CI hijau; akhiri dengan "Siap dilanjutkan dari <halaman>". Setelah 1.42: jalankan isi `plan/PROMPT-CROSSCHECK.md`, tulis `plan/LAPORAN-TAHAP-1.md`.

## Keputusan baru (sampai 2026-10-10)

- Nomor keputusan baru = nomor terbesar di KEPUTUSAN + 1 (aturan dari keputusan 216); sisa 174–199 dibiarkan kosong.
- 234: 1.26 M5 (halaman masalah, alur `t1-m5.json`, ilustrasi m5 tanpa teks).
- 233: 1.26-lab, mode rentan m5 + `m5.txt`; `run.py` membuang warna ANSI gosec.
- 232: I4, fondasi diagram `situs/src/diagram/` (skema Zod registry arsitektur + zona, tata mendatar/tegak, React Flow terkunci), `/uji/diagram/`, `ukur-diagram.mjs`.
- 231: I3, fondasi gerak `situs/src/gerak/` (token, MotionProvider, `useGerak`, `useAwal`), halaman uji `/uji/gerak/`, `ukur-gerak.mjs`.
- 229–230: I2, motion 14.1.0 dan @xyflow/react 12.12.0 (ADR dependency).
- 228: K0f, kartu Peta cerita dirapikan (margin desktop 14 → 32 px; penyebab meta K0d).
- 227: `.devcontainer/postCreate.sh` memasang bun 1.4.2 dan `bun install --frozen-lockfile` (diizinkan pemilik).
- 226: skrip loop menunggu batas pemakaian pulih (`resetsAt` + 2 menit), laporan pagi ikut menunggu (tenggang 180 menit), nomor log berlanjut.
- 225: I1, situs pindah ke bun 1.4.2 (`bun.lock`, setup-bun di CI); gerbang build menuntut `Complete!`.
- 224: K0e, chip ilustrasi M2 dilebarkan; `ukur-ilustrasi.mjs` di gerbang `--layar`.
- 223: K0d, `p.meta` tanpa margin negatif; `ukur-judul.mjs` di gerbang; ruang HP diambil dari jarak meta ke blok.
- 222: K0c, ilustrasi M4 saldo dicoret; `ukur-ilustrasi.mjs`; temuan M2 jadi K0e.
- 221: K0b, Rantai ringkas di Kebutuhan 1.24 (dua pertanyaan PRD → ADR 5, ADR 6).
- 220: K0a, Rantai prop `ringkas` untuk Inti (HP mendatar tanpa sub); Inti 1.21, 1.23, 1.25.
- 218: crosscheck K0 di `plan/CROSSCHECK-KECIL.md`; temuan K0a–K0c.
- 219: hasil uji kering, tabel perintah yang ditolak di protokol, tugas K0d. 218: crosscheck K0 (dari loop).
- 217: satu pekerja; #120 di-merge, worktree konten ditutup, lab m5 di branch `tahap-1/lab-m5`.
- 216: sistem otomatis (ANTREAN, PROTOKOL-OTOMATIS, `tools/antrean.py`, `tools/jalankan-otomatis.sh`, deny loop di `tools/otomatis.settings.json`).
- 211–215: visual redesain (PetaFitur, Rantai, diagram ADR 1 dan halaman masalah, ilustrasi M4); 200–210: redesain tampilan (#120).
- 173: 1.25 migration; 172: lab b4-migration v1 (drift laptop/server, dirty).
- 171: 1.24 ADR 5–6; 170: lab DalamTx + koreksi.
- 169: 1.23 transaction.
- 168: 1.22 M4; 167: mode rentan m4 + `m4.txt`, PORT_PREVIEW di cek_situs.sh.
- 166: 1.21 lapisan dasar; 165: `cek_arah.py` + rekaman `lapisan.txt`.
- 162: 1.20 SQL injection + ADR 4; 161: cari-bug field `aman` + CSS baris; 160: rekaman injection (log PG, gosec, latihan/).
- 159: 1.19 M3 (injection); 158: widget React cari-bug; 157: lab pencarian + mode rentan m3.
- 156: 1.18 + ADR 3; 155: kontrak b1-openapi v1, bacaJSON/wajibAda, -rentan m2.
- 154: 1.17 M2; 153: lab m2 (field asing diabaikan, judul 400 menyesatkan).
- 152: 1.16 HTTP dari http.txt; 151: GET /transfers/{id} supaya Location jujur.
- 150: 1.15 + ADR 2; B1.2 dihapus, rujukan ke B6; penamaan resource pindah ke 1.18.
- 149: 1.14 M1 (masalah pertama); 148: mode rentan -rentan m1, runsql setup per panel.
- 147: 1.13 ditulis ulang (Sinta bertanya, banding fitur v1).
- 146: 1.12 ditulis ulang ke tabel v1; lab relasi (145).
- 144: halaman 1.11 + widget React pertama jumlah-total (src/widgets/, data/widget/).
- 143: lab api-t1 bagian pertukaran (SUM saldo = SUM top-up).
- 142: pengaman loop (tree bersih + main), log stream-json.
- 141: halaman 1.10 (laporan per tanggal WIB vs UTC).
- 140: hooks PreCompact/SessionStart, `tools/jalankan-tahap.sh` (loop headless + crosscheck akhir), CLAUDE.md butir 7.
- 109: konten dulu, satu tahap sampai tuntas; CERITA jadi sumber tertinggi; tiga skill wajib.
- 110: job CI `pesan_commit` menolak Co-Authored-By/Claude di pesan commit PR.
- 111: gerbang situs `tools/cek_situs.sh` (registry, istilah, audit, build, ID, kontras, tes; `--layar`).
- 112–114: MkDocs, halaman Markdown lama, dan `docs/` dihapus; registry di `situs/data/cerita.json`, widget lama di `situs/lama/`.
- 115: Cloudflare Pages Direct Upload dari CI; menunggu secret pemilik.
- 116: React 19.3, TS 6.0.3 (bukan 7: peer @astrojs/check), Zod 4.6, Vitest 5; `astro check` strict di gerbang.
- 121: beranda satu layar (splash); A0 pindah ke /cara-pakai/ (lama); layar.mjs memeriksa beranda.
- 120: breadcrumb otomatis di atas judul (jangan tulis `<KamuDiSini>` di halaman), pemilih peran, mode fokus.
- 119: tema hanya Gelap/Terang; kunjungan pertama selalu gelap.
- 118: `Blok.astro` + `data/templat.json`; kerangka di `situs/templat/`; daftar isi = blok (route middleware).
- 117: registry v2, Tahap 1 = 42 halaman 1.1–1.42; ID lama dipakai ulang; B1.2/F2 lebur, T1 lama diganti PRD.
- Island yang mengganti versi statis wajib memesan tinggi akhirnya di SSR; ukur CLS dengan modul JS ditunda dan gulir tanpa input (`ukur-diagram.mjs` bagian 7), karena tangkapan dan `layar.mjs` tidak melihat geser.
- Konteks awal tiap iterasi loop 94–103k token, puncak 127–209k; 46% token yang diproses berasal dari panggilan dengan konteks > 150k. Penyumbang hasil alat terbesar: gambar (22%), grep (17%), PROTOKOL dibaca ulang (10%), `tail` KEPUTUSAN (baris ribuan karakter).
- Island React Astro di-hydrate di `startTransition` dan atribut `ssr` dilepas sebelum React selesai; keadaan yang dibaca dari DOM di efek butuh CSS yang menyembunyikan isi SSR sampai cocok, bukan selektor `[ssr]`.
- OWASP API Security pindah ke `api-security.owasp.org` (308 dari `owasp.org/API-Security/...`); link baru memakai alamat baru.
- (dipindah dari MEMORI 2026-10-12) K2 (1.34–1.35, keputusan 301): alur baca, href, dan konsistensi secret lolos; sesudah 1.35 tombol Lanjut menuju 1.38 lama sampai 1.36 terbit. CI berbasis pull_request tidak berjalan selama PR CONFLICTING: cek `gh pr view <n> --json mergeable` sebelum menunggu run, batasi tunggu 5 menit. Hitung pipe tanpa escape untuk tabel KEPUTUSAN.
- (dipindah dari MEMORI 2026-10-13) Animasi CSS yang dipicu event `toggle` (async) mulai satu sampai dua frame sesudah `<details>` terbuka: isi penuh sempat berkedip. Ukur frame per rAF sesudah klik sungguhan (`page.click`, bukan `el.click()`, yang tidak mengirim pointerdown). `page.click` lebih dulu menggulir ke elemen: ukur gulir dari tombol yang sudah di layar, bukan `scrollY` sebelum klik (K1xe).
- (dipindah dari MEMORI 2026-10-13) Penanda selesai di `tmp/` bisa tertinggal dari sesi lama (K1: `tmp/cek-hasil.txt` membuat Monitor menyala saat gerbang masih jalan); hapus penanda sebelum gerbang mulai, atau tunggu prosesnya (`pgrep -f cek_situs`).
- (dipindah dari MEMORI 2026-10-13) Markup pesanan yang meniru komponen (mis. `figure.diagram` di `.peta__pesan`) ikut tertangkap selector alat ukur; kecualikan wadahnya (`:not(.peta__pesan figure)`, `:scope >`).
- (dipindah dari MEMORI 2026-10-13) Widget lama alur diuji tanpa melihat gambar: `node situs/tangkapan/uji-alur.mjs <url>` (tangkapan/ di-.gitignore, jadi skrip ditulis ulang bila hilang) membuka semua blok (`details.open`), menekan tebakan, Berikutnya, dan varian, lalu menghitung error konsol.
- (dipindah dari MEMORI 2026-10-13) Menutup blok di atas tombol yang diklik menggeser semua yang di bawahnya; ukur top tujuan sebelum dan sesudah `open = false`, lalu `scrollBy({ behavior: "instant" })` sebesar selisihnya. Scroll anchoring Chromium tidak mengoreksinya (K1xe).
- (dipindah dari MEMORI 2026-10-13) zsh tidak memecah `$VAR` tanpa tanda kutip menjadi beberapa argumen (daftar halaman jadi satu URL); kirim daftar lewat `xargs`.
- (dipindah dari MEMORI 2026-10-13) Ukur konteks sesi pengatur 1.28 (tools/ukur_konteks.py pada transcript subagen): awal 65–66k (loop lama 94–101k), puncak pelaksana 279k, 24,9 juta token diproses, 86% di atas 150k; peninjau 98–176k. Pelaksana wajib serah-terima di ±120k (PROTOKOL k.4).
- (dipindah dari MEMORI 2026-10-13) `git rm` langsung men-stage penghapusan; `git add <file baru> && git commit` ikut membawanya. Hapus file lama di commit yang sama dengan perubahan registry, supaya setiap commit tetap bisa dibangun.
- (dipindah dari MEMORI 2026-10-13) Mode font telat (`ukur-cls.mjs --font-telat`, di gerbang sejak 361) di macOS tidak meniru CI: Chromium Linux membulatkan lebar glyph ke piksel (hinting), jadi size-adjust yang dikalibrasi di macOS gagal tanpa `text-rendering: geometricPrecision`; cari sumber CLS di text node yang titik awalnya melompat ratusan px mendatar. Ukur lewat commit di branch `percobaan/**` (keputusan 359, 361).
- (dipindah dari MEMORI 2026-10-13) `page.evaluate` Playwright tidak punya timeout (kNoTimeout); alat ukur baru wajib memakai `awasi(browser, { alat })` (sekuensial) atau `denganBatas` (paralel) dari `situs/tools/lib/batas.mjs`. Macet intermiten di CI dicari dengan mengulang di branch `percobaan/**` (keputusan 360). Warning `ukur-luapan diulang` (baris `ULANG`, ringkasan langkah) berarti renderer diam di halaman Tahap 1, diulang sekali di konteks baru; sementara sampai G2d (keputusan 364).
- (dipindah dari MEMORI 2026-10-13) `gh pr checks` (v2.93.0) tidak menghitung check `cancelled` sebagai gagal: job yang kena `timeout-minutes` bisa terbaca hijau. Sebelum merge, pastikan semua job `success` (`gh run view <id> --json jobs`), dan tunggu run untuk head yang benar terdaftar dulu (tanpa run, `--watch` langsung selesai).
- (dipindah dari MEMORI 2026-10-13) Batas API GitHub (5.000/jam per user, dibagi semua agen): `gh run watch` bawaan memeriksa tiap 3 s; dengan 6+ agen kena 403. Pakai `tmp/tunggu_pr.sh` (interval 30 s) atau `--interval 60`; bila 403, tunggu ±5 menit (2026-10-12).
- (dipindah dari MEMORI 2026-10-13) `layar.mjs` dan `tangkap.mjs` mengukur keadaan awal halaman (blok terlipat, island di bawah layar belum hidup); luapan horizontal di blok terlipat hanya tertangkap `ukur-luapan.mjs`, yang membuka semua blok dan menggulir sampai bawah (keputusan 356). Docker Desktop bisa tertahan dialog izin macOS: rekaman resmi tetap di container, cluster PG sementara hanya untuk mencoba.
- (dipindah dari MEMORI 2026-10-13) Widget lama yang mengganti teks pemuat sesudah fetch butuh versi statis dari build (pola `alur-statis.ts`, `race-statis.ts`); `contrast.py` tidak membaca `color: inherit` bila induk hanya dikenali lewat kelas lain, jadi tulis token warna eksplisit di elemen teks widget (keputusan 353).
- (dipindah dari MEMORI 2026-10-13) Angka yang bergerak: `tweenAngka`/`gerakkanAngka` dari `situs/src/gerak/angka.ts`; teks khusus pembaca layar hanya dirender selama tween (kalau selalu ada, angka dobel saat diseleksi dan masuk HTML/indeks), dan status "sedang bergerak" diambil dari hasil tween, bukan dari guard yang keluar lebih awal (keputusan 352).
- (dipindah dari MEMORI 2026-10-13) `offsetHeight` host tidak melihat margin anak yang runtuh keluar host, dan containment (container query) membuat lebar intrinsik 0: bandingkan letak elemen sesudahnya serta x dan lebar host, termasuk di 1440 px (wadah 1024).
- (dipindah dari MEMORI 2026-10-13) Widget alur hanya menerima nada `warn` dan `good` (`alur-core.js` NADA, diperiksa `tools/validasi_skenario.mjs` saat build); Rantai menerima juga `system`.
- (dipindah dari MEMORI 2026-10-13) ADR 7: policy RLS yang menyaring `UPDATE` membuat kredit ke baris orang lain jadi `UPDATE 0` tanpa error (`b5-rls` bagian 5); RLS di Rekeningo hanya untuk baca, di tabel ledger Tahap 2.
- (dipindah dari MEMORI 2026-10-14) Widget alur: satu urutan DOM di semua ukuran (jalur, tombol, tebakan, varian, detail + HP); mode sempit hanya kelas `is-sempit`, tanpa memindah DOM (keputusan 358). Bila DOM terpaksa dipindah, simpan `document.activeElement` dan kembalikan dengan `focus({ preventScroll: true })`: Chrome memindah fokus ke BODY.
- (dipindah dari MEMORI 2026-10-14) Perubahan CSS global di atas Inti menggeser layar pertama semua halaman; simpan keluaran `layar.mjs` sebelum dan bandingkan sesudahnya (`tmp/banding_layar.py`).
- (dipindah dari MEMORI 2026-10-14) Setelah gerbang lolos, perubahan teks apa pun wajib diikuti `python3 tools/sinkron_cerita.py` dan gerbang ulang (CI #119 gagal karena `kartu.json` tertinggal).
- (dipindah dari MEMORI 2026-10-14) Merge ditolak pengaman: berhenti, laporkan di baris pertama, jangan memulai halaman berikutnya di atas PR yang belum di-merge.
- (dipindah dari MEMORI 2026-10-14) layar.mjs tidak menghitung Snippet sebagai visual Inti; Inti butuh Rantai atau widget (1.32 gagal 4 ukuran sebelum Rantai).
- (dipindah dari MEMORI 2026-10-14) Tabel `plan/*.md` diperiksa `tools/cek_tabel_plan.py` di gerbang (keputusan 362): pipe di teks atau code span ditulis `\|`; jangan tulis `\\|`.
- (dipindah dari MEMORI 2026-10-14) Pemeriksa yang menyaring data wajib menghitung dan mencetak yang dilewati: `if fg and bg:` di contrast.py membuang 26 pasangan per mode tanpa pesan; buktikan pemeriksa bisa gagal dengan uji mutasi pada salinan (`tools/test_contrast.py`).

## Catatan untuk halaman Tahap 1 (dipindah dari MEMORI 2026-10-14)

- Sejak 1.33 server cerita = expand (`jumlah` + `nominal`, kontrak `labs/b1-openapi/openapi-expand.yaml`). Rekaman atau Snippet 1.34+ yang menampilkan handler bayar, body transfers/riwayat, atau kontrak dibangun dari varian expand (`bangun_dari_v1(tmp, nama, EXPAND_UBAH)` di `run.py`, `openapi-expand.yaml`), atau diberi label "kode v1 sebelum expand".
- 1.39 (F1) menyerap F2: hapus halaman F2 dan entrinya di PR yang sama (pola keputusan 150).
- 1.31 `deploy.txt`: kode api-t1 diambil dari commit main `f128167` (`KODE_V1` di `run.py`), Dockerfile dari folder lab; hash 390ff47/f5ea0b4 (±27 tempat: halaman, `t1-deploy.json`, `t1-deploy-tag.json`, `kartu.json`) hanya berubah bila salah satunya diubah, dan `harap` membuat lab gagal keras.
- Ilustrasi latar Grup Lestari belum ada; ilustrasi baru wajib lolos `ukur-ilustrasi.mjs` (tambahkan path halamannya ke alat itu). `situs/lama/assets/cerita/tahap-1.svg` tidak dipakai lagi.
- Tabel "Angka di tahap ini" ditulis ulang di 1.37/1.38, angka dari `tahap[0].asumsi`.
- 1.41/1.42: rekaman `labs/api-t1/output/sengaja-belum.txt` (1.40) membuktikan dua yang pecah di Tahap 2 — bagian B: dua Bayar bersamaan lolos pemeriksaan service, yang menahan constraint (23514 → 500 di v1, perilaku v1); bagian C–E: Bayar diulang sesudah response hilang tercatat dua kali. Jawaban 1.42 "ADR 5 dibuka lagi" bersandar di sini; keempat yang ditunda ADR 12 tidak ada di jalur kedua kejadian.
- Audit bahasa menolak "kantor" (pakai "perusahaan") dan "pemakai" (pakai "user").
- Pola tulis ulang halaman lama: pindah ke `tahap-1/<slug>.mdx`, lima blok, contoh PRD v1; hapus file lama dan data widget lama; perbarui `path`, `prasyarat`, hapus `lama` di registry, perbarui `alat/indeks-topik.mdx`, lalu `python3 tools/sinkron_cerita.py`.

## Diputuskan malam ini (mode malam 2026-10-13/14, dipindah 2026-10-23)

- X1 dan X2 sudah selesai sebelum malam ini (PR #249), jadi tidak diulang: ERD1 masuk sesudah X2 sebagai pengecualian pembekuan; sesudahnya hanya 1.12 dicek ulang 4 varian dan LAPORAN-TAHAP-1 mendapat satu baris. Alasan: perubahan hanya di satu halaman; mengulang X1 penuh tidak menambah bukti.
- 1.12 hanya mendapat diagram statis. Widget ERD bertumbuh dibangun dan diuji di `/uji/erd/`, belum dipasang di 1.12 atau 2.9 sampai pemilik meninjau Tahap 1. Alasan: paling mudah dibatalkan; halaman Tahap 1 sedang ditinjau.
- Nomor keputusan Tahap 2 mengikuti prompt di naskah: jalur lab/konten 400–449, teknis 450–499, pengatur 376–399. Alasan: dua jalur tidak berebut nomor.
- Judul 2.8 di registry ditulis persis naskah ("ADR 12: dari kolom saldo ke ledger") walau 1.40 sudah ADR 12; lihat Usulan perubahan cerita. Alasan: CERITA paling tinggi; mengganti judul satu baris registry mudah.
- Lab pencairan bernama `t2-pencairan` (pola lab khusus tahap `t3-bayar`, `t5-replika`). Halaman 2.x bergantung pada tugas gerbang `T2-mulai` yang hanya pemilik tandai selesai, jadi `antrean.py berikut` tidak pernah memilih halaman. Alasan: larangan menulis halaman malam ini dijaga alat, bukan ingatan.
- Dua jalur lab berjalan bersamaan (api-t2 dan b3-race, lalu lab berikutnya) di PostgreSQL bersama dengan schema, port, dan rentang nomor keputusan sendiri; container tidak boleh di-down. Alasan: tujuh lab sisa tidak muat satu jalur dalam satu malam; isolasi schema sudah berlaku sejak keputusan 80. Rekaman ledger lab lama ditulis ke file baru supaya halaman versi lama tidak berubah.
- Registry Tahap 2 menggeser nomor rujukan halaman lama di 9 halaman Tahap 1 (2.1/2.3/2.4/2.6 → 2.11/2.14/2.19/2.17; judul dan tujuan sama) dan diterima; `tahap[1]` di registry (user, nama, rekap) belum diubah ke naskah Tahap 2 supaya kalkulator 1.37/1.38 tidak berubah. Nomor keputusan lab sisa malam ini 500–549. Alasan: paling mudah dibatalkan, Tahap 1 sedang ditinjau.
- Temuan keamanan dan aksesibilitas dari tinjauan jadi tugas `lab-api-t2a` dan `A11y-diagram` sebelum `T2-mulai`; polesan ke `plan/SETELAH-TAHAP-2.md`. Alasan: kategori yang boleh masuk antrean di bawah pembekuan.

## Usulan perubahan cerita Tahap 1 (dipindah dari MEMORI 2026-10-24)

- M4: naskah belum menyebut asal batas saldo warung. 1.22 memakai: minggu 2 Raka menambah batas Rp1.500.000 lewat psql; Jumat minggu 3 saldo Ani Rp1.450.000. Disetujui pemilik 2026-10-09; mohon naskah M4 diperbarui.
- M2: naskah menulis server membaca `nominal`; lab dan halaman sejak 1.9 memakai `jumlah` (label layar "Nominal"). Usul: naskah menyebut `jumlah`, atau dibiarkan.
- M5: naskah menulis "100 saldo"; lab membaca 103 akun (100 karyawan + 3 warung), 1.26 menulis 103. Usul: naskah menyebut 103.
- M6/ADR 10: naskah belum menyebut deploy server expand (`jumlah` + `nominal`) yang memulihkan app 1.1 sesudah M6; 1.33 memakainya (Raka men-deploy expand sesudah ADR 10, `versi.txt` bagian B–D, keputusan 252). Mohon naskah diperbarui atau dikonfirmasi.
- Cadangan database: naskah Tahap 1 tidak menyebutnya, padahal API dan PostgreSQL ada di satu VPS. 1.36 menulisnya sebagai celah terbuka + latihan lab (keputusan 302). Usul: Raka menjalankan `pg_dump` manual sebelum setiap migration dan menyalinnya keluar VPS, atau risiko diterima sampai cadangan terjadwal Tahap 3.
- 1.42: naskah bagian 6 menulis jawaban tebak (ADR 6, ADR 5) dibuka di halaman pertama Tahap 2; 1.42 sudah membukanya di widget tebak dan blok "Menuju Tahap 2" (sesuai ANTREAN). Usul: halaman pertama Tahap 2 mengulang dan memperluasnya, naskah cukup menyebut keduanya. Prioritas fitur PRD v2 (P0–P2) dan durasinya belum ada di naskah.
- Naskah `CERITA-TAHAP-1.md` ±64 menulis "Transfer setengah jadi" (Tahap 2), halaman Cerita memakai "Pembayaran setengah jadi" yang lebih tepat; ±43 menulis "Lima tokoh" padahal tabelnya enam. Usul: naskah diselaraskan (XF2, keputusan 372).

## Pelajaran (dipindah dari MEMORI 2026-10-24)

- PR yang CONFLICTING dengan main tidak memicu CI (`cek.yml` hanya `pull_request`), dan `tmp/tunggu_pr.sh` berakhir "TIDAK ADA RUN": cek `gh pr view <n> --json mergeable` dulu; konflik baris tambahan KEPUTUSAN/README digabung `tmp/gabung_urut.sh <branch> <nomor>` (union, KEPUTUSAN diurutkan). Lab yang menunggu lock dengan ambang waktu tetap gagal palsu saat mesin ramai: tunggu sampai selesai atau `pg_stat_activity` menunjukkan Lock (2026-10-14).
- Dua lapis menangkap celah yang lolos pelaksana: c4 (`/ganti-password` tanpa rate limit, salt tetap), api-t2 (Bayar v1 dijawab 201 tanpa ledger). Peninjau wajib uji mutasi dan baca kode; cek `mergeable` lagi sesudah CI hijau; scratchpad dipakai bersama agen, tulis ke subfolder unik (2026-10-14).

## Perlu dicek pemilik (arsip 2026-10-24)

- PROPOSAL tidak konsisten soal deploy: tabel infra (~149) menulis Tahap 2 deploy lewat SSH dari Actions, tabel pipeline (~430–431) menulis Tahap 2 manual dan staging Tahap 3, (~432) blue/green Tahap 4; halaman 1.31, 1.35, 1.36, 1.40 mengikuti tabel pipeline ("deploy tanpa jeda" Tahap 3 dari dua instance ~150). Mohon diputuskan.
- Dashboard web: CERITA-TAHAP-1:66, registry Tahap 3 `skala.prd`, PROPOSAL:461 dan :688 menaruhnya di Tahap 3; PROPOSAL:77 di Tahap 2. Beranda (keputusan 316) tidak menyebut tahap. Mohon diputuskan.
- M8 (1.37, keputusan 303): naskah menulis "91/100 penguji aktif", asumsi registry 30% user aktif per hari; halaman memakai 91 sebagai aktif selama uji coba dan menulis kepekaannya terbuka (0,14–0,42 RPS). Mohon konfirmasi tafsiran.
- Redesain #120: usulan perubahan PROPOSAL "Desain visual final" dan CLAUDE.md `<tampilan>` di `plan/AUDIT-TAMPILAN.md` bagian 6, belum diubah.
- ADR 7 (keputusan 240): RLS sebagai pagar kedua dipasang di tabel ledger Tahap 2, tidak di tabel v1 `api-t1` (rekaman `b5-rls` bagian 5: policy pemilik membuat bayar ke warung `UPDATE 0`). Kalau RLS harus sudah berjalan di Tahap 1, perlu tugas lab `api-t1` sendiri.
- Cloudflare Pages (keputusan 115): butuh API token (Account > Cloudflare Pages > Edit) dan Account ID, lalu `gh secret set CLOUDFLARE_API_TOKEN` dan `gh secret set CLOUDFLARE_ACCOUNT_ID`.
- Serverpod 4 (1.32): apakah exception buatan sendiri sampai ke tes `withServerpod` dengan tipe aslinya [perlu verifikasi].
- CI Linux (keputusan 361): `ubuntu-latest` pindah ke 26.04 bertahap 19 Okt–19 Nov 2026 (changelog GitHub 2026-09-17); usul pin `ubuntu-24.04` atau run percobaan 26.04 (tugas G2c). `geometricPrecision` membuat teks di Linux/ChromeOS tanpa hinting (sedikit lebih lembut di layar DPI rendah); biaya di Firefox [perlu verifikasi].
- Renderer Chromium di CI diam total ±0,13% per muat di halaman Tahap 1 (keputusan 364, 367): mekanismenya di pipeline commit/aktivasi/raster Chromium, 28/31 kasus di enam halaman yang banyak kodenya, juga saat muat tanpa gulir; Xvfb headed ikut, macOS 0/10.080. Risiko di Chrome HP pembaca belum diketahui. Kirim draf laporan bug Chromium (PR #231)?

## Pelajaran (dipindah dari MEMORI 2026-10-24, kedua)

- Merge hanya bila `gh pr checks <n>` keluar 0: PR #271 ter-merge dengan job "Pasang Chromium Playwright" gagal (mirror apt lambat, exit 124; main hijau sesudah `gh run rerun --failed`). Worktree baru butuh `bash tools/get_fonts.sh` sebelum gerbang (2026-10-24).
- Pohon aksesibilitas Chromium (CDP `Accessibility.getFullAXTree`) yang dibuktikan, bukan atribut DOM: svg pembungkus tanpa nama tetap terbaca `image` (#274). `gh pr merge --delete-branch` gagal bila worktree lain memegang main: merge tanpa itu lalu `git push origin --delete <branch>`; subagen tidak checkout main di worktree. Durasi: RISET-2 27 + 62 menit tinjau, A11y-diagram 82 menit (2026-10-24).
- Peninjau menemukan yang lolos pelaksana di setiap tugas sejauh ini: apt memakai .deb cache hanya menurut ukuran (#278, 684), Berikutnya 2.1 menuju cerita lama (#277, 605), klik kotak diagram tidak sampai tombol (#274, 681). Pipa dua worktree per jalur (720); nomor keputusan per tugas di brief (721).

## Usulan perubahan cerita Tahap 2 (arsip 2026-10-24)

- Tahap 2: naskah menulis 2.8 "ADR 12: dari kolom saldo ke ledger", padahal ADR 12 sudah dipakai 1.40 ("Sengaja belum dilakukan") dan ADR Tahap 2 lain bernomor 13–21. Usul: 2.8 jadi ADR 13 dan nomor berikutnya bergeser (21 → 22), atau 2.8 tanpa nomor baru ("ADR 6 diganti"). Registry sementara menulis judul naskah.
- Tahap 2 bagian 3b, ERD Tahap 1: blok mermaid berbeda dari `labs/api-t1` di delapan hal (keputusan 375: `peran`→`jenis`, `hash_password`→`password_hash`, tanpa `akun.batas_saldo` (CHECK Rp1.500.000 warung) dan `akun.dibuat`, `topup.jumlah`→`nominal`, `dibuat_oleh`→`admin_id`, `koreksi` tanpa `transaksi_id`, relasi admin), dan tabel "Apa yang berubah" menulis Tahap 1 "tanpa index riwayat" padahal CERITA-TAHAP-1 ±125 dan lab punya index `transaksi (dari, dibuat)` dan `(ke, dibuat)`. Diagram mengikuti lab. Usul: blok mermaid dan baris itu diselaraskan.
- M9: lab `b3-ledger` (keputusan 403, `batas.txt`) membuktikan "keduanya berhasil, saldo −Rp20.000" hanya terjadi bila pemeriksaan saldo kedua transfer jalan sebelum salah satunya commit; bila kode memperbarui `saldo_cache` di transaction yang sama, transfer kedua menunggu lock baris lalu ditolak (500). Usul: naskah M9 menyebut kode minggu 1 memeriksa saldo dari jumlah posting tanpa memperbarui cache.
- Tahap 2, urutan minggu: M9 (minggu 1) sudah berjalan di ledger, padahal M13 (minggu 4) adalah migrasi ke ledger itu sendiri (api-t2, keputusan 409–412). Juga: asal nomor karyawan tidak disebut (lab: `K` + nomor akun); `akun.saldo` membeku antara migrate dan contract (naskah "dipertahankan sebagai cache" ditafsirkan `buku.saldo_cache`); riwayat app sesudah migrasi dimulai dari jurnal pembuka.
- Tahap 2, angka naskah yang tidak terulang di lab: M11 "4 detik" (lab ±30 ms per halaman, ±1,9 detik seluruh riwayat; minggu 3 baru ±44 ribu posting, keputusan 521, 526), M13 "40 detik" (lab 5 detik; lama datang dari antrean di belakang laporan, 536), M15 Rp15.000 (terulang untuk satu Jumat di `rentan.txt`: data lab menaruh saldo itu di titik henti, 504; yang tidak terulang ialah penemuannya di tutup buku bulan pertama), M9 −Rp20.000 (hanya lewat alat lab, 431). Usul: naskah menyebut mekanismenya; angkanya tetap ilustrasi cerita.
- Tahap 2, lain-lain: M10 "Budi menekan Bayar lagi" direkam sebagai retry app dengan request sama (e3); nomor rekening tujuan warung belum ada di ERD 3b (505); mermaid ERD Tahap 2 berbeda dari lab di beberapa kolom (473: `peran`/`jenis`, `hash_password`, `akun.nama`, PK `baris_pencairan`).
- Tahap 2 bagian 3b, tabel pertumbuhan: baris Tahap 1 (±22 ribu) memakai 2 transaksi per user aktif, Tahap 2–4 memakai 3; registry dan 1.38 memakai 2 × 300 B; lab b2-query 760.448 posting ±99 MB. Halaman Tahap 2 memakai rumus naskah, 1.38 tidak diubah (keputusan 600).
- 2.1: CERITA-TAHAP-1 ±13/±81 dan 1.1 menulis kampus ±1.200 karyawan, CERITA-TAHAP-2 ±1.000 (2.1 ikut Tahap 2); CERITA-TAHAP-1 ±65 dan 1.42 menyebut fitur "ekspor laporan bulanan", PRD v2 tidak (2.1 menulisnya bagian tutup buku).
- Tahap 2 bagian 2.8: diselesaikan dengan revisi ADR 6 (keputusan 723); mohon naskah menyebut 2.8 sebagai revisi ADR 6, atau memberi nomor baru.
- 2.2: naskah bagian 2 menulis index `posting(akun, waktu, id)`, lab `posting (buku_id, dibuat, id)`; "notifikasi sederhana di app warung" untuk pencairan ditafsirkan pemberitahuan di dalam app tanpa push (607), mohon ditegaskan.

## Pelajaran (dipindah dari MEMORI 2026-10-24, ketiga)

- Pipa paralel butuh nomor per tugas untuk keputusan DAN ID riset (R2-36 dipakai dua PR); alat ukur bisa lolos palsu bila persiapannya diam-diam gagal (axe: hasil terpangkas tanpa `incomplete`, path 404 lolos), jadi setiap alat diuji mutasi (#283). Widget runsql memakai SQLite (sql.js), bukan PGlite (2.4).
- Subagen yang melapor selesai tetapi masih punya proses latar (watch CI) bisa bangun di worktree yang sudah dipakai tugas lain: hentikan dengan TaskStop; brief meminta proses latar dihentikan sebelum melapor. `client:visible` di details tertutup menunda island; details tertutup disembunyikan content-visibility; simpul Rantai diawali angka sesudah huruf bagian terbaca ID internal (2026-10-24).

## Pelajaran (dipindah dari MEMORI 2026-10-25)

- Saat batas pemakaian tercapai, subagen berhenti di tengah dan dilanjutkan dengan SendMessage dari transkripnya. Pipa paralel butuh koordinasi istilah dan halaman lama (`lebur_ke`): pengatur meneruskan keputusan satu PR ke PR yang berjalan bersamaan. Peninjau terus menemukan cacat nyata (kunci non-atomik, klaim pre-mortem salah, istilah membocorkan jawaban M9).
- Satu halaman Tahap 2 ±3 jam pelaksana + peninjau; peninjau menemukan cacat nyata di setiap halaman (klaim melebihi rekaman, tooltip dua arti, navigasi membuka versi lama, kunci non-atomik). Cek hasil CI dengan `gh pr checks` TANPA --watch; alat yang mengubah repo menolak argumen asing (725); teks Inti pendek menjaga CLS mode font telat (2.7, 2.14); `cek_id_tampil.py` menyambung node DOM tanpa spasi ("A"+"1 query" = "A1").

## Usulan perubahan cerita Tahap 2, M10–M13 (arsip 2026-10-25)

- M10 (2.13, 651): naskah mengandaikan app punya retry otomatis; tap kedua Budi dan retry app sama bagi server (direkam: request sama); ADR 14 (2.14, 654): naskah belum menyebut app 1.0/1.1 tanpa key, usul satu kalimat masa peralihan.
- M11 (2.15, 663/664): "4 detik" tidak bisa diturunkan dari lab: riwayat Budi minggu 3 ≈ 225 posting ≈ 226 query ≈ 0,1 detik; halaman pertama hanya 20 baris padahal M12 memakai pagination. Usul: naskah menyebut mekanismenya (21 query untuk 20 baris, tanpa index per buku dan waktu) atau memakai data setahun.
- 2.17: naskah menulis index `posting(akun, waktu)` (M11) dan `posting(akun, waktu, id)` (tabel fitur); lab dan halaman memakai `posting (buku_id, dibuat, id)` bernama `posting_riwayat`. M12 (2.18, 678): naskah menulis transaksi baru "hilang", rekaman hanya tidak ada di daftar yang digulir; api-t2 sudah kursor sedangkan M12 menceritakan OFFSET. M13 (2.21, 811): "ALTER pada tabel besar mengambil lock lama" benar hanya untuk ALTER yang memindai/menulis ulang tabel; di lab yang menahan pembayaran adalah laporan terbuka di depan migrasi dan pembayaran akhirnya gagal 42703; usul naskah menyebut mekanismenya.

## Pelajaran (dipindah dari MEMORI 2026-10-25)

- Pipa lima worktree: peninjau menemukan cacat nyata di setiap halaman dan lab (klaim melebihi rekaman, kunci non-atomik, tooltip dua arti, navigasi ke versi lama). Gerbang cepat tidak cukup: setelah merge main yang menyentuh registry, jalankan `sinkron_cerita.py`, `build_istilah.py`, dan CI ulang. `gh pr checks` tanpa --watch untuk putusan akhir; poll `mergeable` sampai bukan UNKNOWN. ID riset tiga digit perlu pola `\d{2,3}` (sudah). Alat yang mengubah repo menolak argumen asing (725).
- Tes bersamaan yang biasa tidak menangkap pencabutan `FOR UPDATE`; tahan baris sampai semua antre di `pg_stat_activity` (lab-c4a). Teks Inti pendek menjaga CLS mode font telat. `cek_id_tampil.py` menyambung node DOM tanpa spasi ("A"+"1 query" = "A1").

## Perlu dicek pemilik Tahap 2 (arsip 2026-10-25)

- Butir lama dari Tahap 1 dan mode paralel (deploy PROPOSAL, dashboard web, M8, redesain #120, ADR 7 RLS, Cloudflare, Serverpod 4, CI Linux 26.04, renderer Chromium) dipindah ke `plan/PELAJARAN-ARSIP.md` bagian "Perlu dicek pemilik (arsip 2026-10-24)"; LAPORAN-AKHIR mengumpulkannya.
- Idempotency-Key: draft kini revisi -08 (2026-10-22), Active, belum RFC dan belum di registry IANA (600); ADR 14 memutuskan masa peralihan app 1.0/1.1 (654), belum direkam di lab (keputusan 517).
- Lab Tahap 2: argon2id 64 MiB [perlu verifikasi] terhadap RAM VPS Tahap 2; akun terkunci dijawab 401 generik (550), jadi Ani mengira lupa password: 2.27/2.28 butuh jalur lupa password, mohon konfirmasi; kursor riwayat bisa melewatkan transaksi yang COMMIT belakangan (ADR 16, tinjauan #266).
- RISET-2 "Belum bisa dicek" (7 butir di `plan/RISET-TAHAP-2.md`): antrean di belakang ALTER yang menunggu lock tidak tertulis di dokumentasi PostgreSQL (bukti hanya b4-skema); plan GitHub untuk branch protection/CODEOWNERS repo privat; rekaman e5-payload masih skema lama; Testcontainers dan CREATE INDEX CONCURRENTLY belum direkam; Testcontainers Tahap 2 (naskah) lawan Tahap 3 (PROPOSAL).
- `role="application"` di pembungkus React Flow tidak bisa diganti lewat props; efeknya di pembaca layar [perlu verifikasi] (tinjauan #274).
- 2.4 (618): rekaman api-t2 `tutup-buku.txt` C, jurnal yang COMMIT sesudah laporan masuk periode yang sudah dilaporkan (1.122 jadi 1.123); naskah tidak punya halaman penutupan periode. "< 1 hari" belum diukur.
- api-t2 sesudah lab-api-t2a (648): password sementara bisa dipakai orang lain mendahului pemiliknya di /ganti-password (usul: password sementara acak per akun lewat saluran di luar app); app 1.0/1.1 tanpa layar ganti password berhenti di 403; bila HP kampus keluar lewat satu IP (NAT), 300 login per 30 menit tepat di batas per IP.
- 2.8: `jurnal.keterangan` teks bebas berisi nama dan jurnal tidak bisa dihapus; naskah belum menjadwalkan penghapusan data pribadi.
- 2.11 (780): top-up CSV api-t2 bisa deadlock dengan transfer bila urutan CSV beda dari id buku (dari kode dan dokumentasi, belum direkam). 2.12 (R2-94): tutup buku api-t2 menjalankan dua query lewat pool tanpa transaction (disimpulkan dari kode, belum direkam). 2.3: tanpa endpoint cek nama, layar konfirmasi hanya bisa menampilkan nomor dan nominal.
- 2.14: masa peralihan app 1.0/1.1 tidak berakhir bila satu HP lama tetap memakai app 1.0 (butuh tanggal akhir atau versi minimum, ADR 10); pola key belum di `labs/api-t2` (517). 2.16: jumlah query SQL di balik satu embedding PostgREST tidak disebut dokumentasi [perlu verifikasi]; "tunjangan makan hilang bila JOIN biasa" belum direkam.
- api-t2 `Service.GantiPassword` hanya memeriksa panjang 15–72 byte, tanpa daftar password bocor (ASVS 6.2.4); usul tugas lab sendiri di SETELAH-TAHAP-2.
- 2.17: node-pg-migrate 9.0.0 (`concurrently` tanpa `pgm.noTransaction()` di dokumentasi v9), Laravel `->online()` di luar transaction migration, Serverpod `id` di daftar `fields` index masih [perlu verifikasi]. 2.21: lama lock CHECK pada tabel besar versus NOT VALID lalu VALIDATE CONSTRAINT belum diukur (usul lab untuk 2.22).

## Perlu dicek pemilik Tahap 2–3 (arsip 2026-10-26)

- Butir Tahap 2 sampai 2.19 dan 2.21–2.23 (Idempotency-Key -08, argon2id 64 MiB, akun terkunci 401 generik, RISET-2 belum bisa dicek, role=application React Flow, 2.4 jurnal COMMIT belakangan, password sementara, `jurnal.keterangan`, deadlock top-up CSV, masa peralihan app 1.0/1.1, `GantiPassword` tanpa daftar bocor, 2.17 dan 2.21 [perlu verifikasi], riwayat app 17 → 3 baris) dipindah ke `plan/PELAJARAN-ARSIP.md` bagian "Perlu dicek pemilik Tahap 2 (arsip 2026-10-25)"; LAPORAN-AKHIR mengumpulkannya.
- 2.20: paket 1 GB dan 5/20/100 buka per hari Asumsi; reverse proxy yang mengompres belum diketahui; Serverpod "tanpa kompresi" hanya dari `server.dart` tag 4.0.4. 2.24: plan GitHub dan visibilitas repo untuk branch protection dan CODEOWNERS; exit code tes dilewati di `node --test` dan CI Serverpod; versi PHPUnit Laravel 13 [perlu verifikasi]. 2.25: naskah Rp15.000 tutup buku bulan pertama vs lab satu Jumat; cara menyelesaikan Rp15.000 yang sudah keluar ke bank belum dijawab; "bank memproses semua baris" Asumsi (R2-184).
- 2.26: aturan ADR 19 "Keuangan memeriksa status batch tiap Jumat sesudah 15.00" dan nama status `dikirim` (terbaca "sudah di bank"; usul `siap`); 2.27: jalur lupa password Ani = admin manual, skenario Dimas Ilustrasi; 2.28: RAM VPS argon2id 64 MiB (640 MiB untuk 10 hash), api-t2 masih bcrypt tanpa hitung ulang dan daftar bocor, password sementara berpola `sementara-<id>`; T3-siap: baris tabel 1.38 ±550 → ±820 MB (registry trx 3), `tahap[2].user` = "10.000", dua besaran ukuran data ±820 MB lawan ±1,4 GB; naskah Tahap 3: janji 30 detik hanya bayar dan transfer, push saja lawan push dan email, lab untuk panic goroutine/LISTEN-NOTIFY/dio#2418/passkey; RISET-4–6: ukuran tim Tahap 4 tiga angka (10–15, 6–10, 8), Gartner/UK Finance/FATF/ISO 20022 [perlu verifikasi], UU 27/2022 dan PBI 23/6/PBI/2021 dari hasil pencarian, BSL (OpenTofu/OpenBao); Compose `!override` minimum versi [perlu verifikasi].
- RISET-3: replika baca awal tidak ada di PROPOSAL Tahap 3; Redis 8 AGPLv3 lawan Valkey 9.1.2 belum diputuskan; required reviewers GitHub hanya repo publik di Free/Pro/Team; registry `asumsi.trx` 2 lawan naskah 3b 3. CI-CEPAT (#328): main tanpa branch protection; jadwal GitHub nonaktif setelah 60 hari tanpa aktivitas.

## Pelajaran (dipindah dari MEMORI 2026-10-26)

- Aturan 727 menurunkan waktu per halaman (53 dan 78 menit vs 94) tetapi masih ada gabung main karena berkas bersama (RISET, cerita.json): urutkan RISET dengan `comm`, cerita.json `--theirs` + skrip registri idempoten + sinkron. Peninjau menemukan cacat nyata di setiap halaman; tes bersamaan harus menahan baris sampai semua antre; tes `t.Skip` tanpa DB hijau saat aturan hilang.

## Perlu dicek pemilik, 2.29–2.31 dan lab Tahap 3 (arsip 2026-10-26 siang)

- 2.29–2.31: naskah M17 "banyak server belum diuji" perlu lingkup api-t2 (c4 dan t5-skala punya dua instance); "3 jam"/"kurang dari satu hari" tak terukur; penutupan periode belum di peta; ADR 21 bertumpu Asumsi (kapasitas satu server belum diukur); registry `trx` 2 lawan 3 (usul samakan: 2.9 ±65,7 → ±98,6 MB); ADR 27 (Redis) lawan pemicu Redis ADR 21.
- Lab Tahap 3: enum `hr` di GET /akun/{id} (oasdiff: app lama enum tertutup); nama enam kota tak di naskah; Idempotency-Key bayar/transfer/pesanan belum di api-t2/api-t3 (lab t3-offline menambah opsional); satu key per IP di belakang proxy (10/menit untuk SEMUA client, juga lewat Redis): 3.16/3.17 harus menyebut; RemoteAddr tanpa X-Forwarded-For; naskah M18 tak menyebut timeout app; `Future.timeout` Dart tak membatalkan permintaan [perlu verifikasi]; W 20 ms Asumsi; satu λ 0,868; SKIP LOCKED tidak membuat klaim benar (klausa kunci + klaim_sampai): rumusan 3.11/ADR 24 di keputusan 990–991; R3-37 300 B/item vs terukur 86 B (207 KB); Redis 8 AGPLv3 vs Valkey; dependency lab (go-redis 967, dio dan crypto Dart tanpa ADR); mitmproxy diganti proxy Go.

## Perlu dicek pemilik, batch 16 dan CI-CEPAT (arsip 2026-10-26 siang)

- Batch 16 (#355–#361): aturan 5 ADR 21 (load test kapasitas api-t2) belum dijalankan di lab mana pun, pemicu Redis ADR 21 (counter PostgreSQL) tak diukur; Idempotency-Key api-t3 melepas key saat 5xx COMMIT tak diketahui dan 409 tertinggal bila server mati (butuh tugas lab sebelum 3.21); lupa password mandiri belum di PRD v3; "7 dari 15 pasang terbalik" M19 tak direkam; Chromium 156 satu-satunya browser (3.22, 3.23); TTL "5 menit" naskah M23 = 300 detik; W5 Inti hasil-dulu, pengecualian bagian j untuk DIRI-N, label "Hitungan" di /cara-pakai/ ke pemilik (USULAN-PERBAIKAN); 8 halaman lama Tahap 2 tetap di sidebar (hapus atau arsip tetap TINJAUAN-PEMILIK Tahap 2 butir 2).
- CI-CEPAT (#328): main tanpa branch protection; jadwal GitHub nonaktif setelah 60 hari tanpa aktivitas; PR halaman selalu menyentuh berkas turunan bersama sehingga mode semua (±7 menit), mode sebagian teramati di #337 dan #341; batas 20 job bersamaan.

## Ukur antrean merge, baris 2.20–2.24 (arsip 2026-10-26 siang)

| Halaman | PR | Menit dibuka → merge | Gabung main | Run main merah |
| --- | --- | --- | --- | --- |
| 2.22 | #319 | 53 | 2 | 0 |
| 2.23 | #318 | 78 | 2 | 0 |
| 2.20 | #322 | 319 (peninjau 63; sisanya menunggu) | 0 | 0 |
| 2.24 | #323 | 63 | 0 | 0 |

## Ukur antrean merge, baris 2.25–2.30 (arsip 2026-10-26 sore)

| Halaman | PR | Menit dibuka → merge | Gabung main | Run main merah |
| --- | --- | --- | --- | --- |
| 2.25 | #327 | 41 | 1 | 0 |
| 2.27 | #335 | 53 (jeda limit 3 jam di antaranya) | 1 | 0 |
| 2.26 | #334 | 74 (jeda limit) | 3 | 0 |
| 2.28 | #337 | 28 (15.12 → 15.40) | 3 | 0 |
| 2.29 | #339 | 32 | 1 | 0 |
| 2.30 | #341 | 184 (jeda limit #2; peninjau 25) | 1 | 0 |

## Ukur antrean merge, baris 2.31–3.3 (arsip 2026-10-26 malam)

| Halaman | PR | Menit dibuka → merge | Gabung main | Run main merah |
| --- | --- | --- | --- | --- |
| 2.31 | #346 | 57 | 0 | 0 |
| 2.32 | #351 | 31 | 1 | 0 |
| 2.33 | #353 | 42 | 1 | 0 |
| 3.1 | #364 | 24 (pelaksana terputus restart sesi) | 0 | 0 |
| 3.2 | #365 | 36 | 1 | 0 |
| 3.3 | #366 | 39 | 1 | 0 |

## Perlu dicek pemilik, halaman 3.1–3.3 (arsip 2026-10-26 malam)

- Halaman 3.1–3.3 (#364–#366): top-up massal "beberapa menit" (naskah) lawan ±12,5 menit M27, usul "belasan menit"; pemicu ADR 21 sudah dipenuhi sejak PRD tetapi M21 menceritakannya kejutan (3.14 pilih opsi a atau b); versi app 3.0/3.1 Asumsi penulis; dokumentasi FCM menyarankan FID, field FID di request HTTP v1 [perlu verifikasi] (bila bukan `token`, `perangkat.token_push` di ERD3 berubah); penyaring `notifikasi_id` butuh kode app padahal pesan notification ditampilkan SDK (3.13 pilih data message); widget peta 3.2 "–" padahal pilah.

## Ukur antrean merge, baris 3.4–3.8 (arsip 2026-10-27 dini hari)

| Halaman | PR | Menit dibuka → merge | Gabung main | Run main merah |
| --- | --- | --- | --- | --- |
| 3.4 | #368 | 50 | 2 | 0 |
| 3.5 | #369 | 102 (dua restart sesi) | 2 | 0 |
| 3.6 | #370 | 66 (jeda limit #5) | 4 | 0 |
| 3.7 | #371 | 29 | 1 | 0 |
| 3.8 | #372 | 53 | 2 | 0 |

## Perlu dicek pemilik, halaman 3.4–3.12 (arsip 2026-10-27 dini hari)

- Halaman 3.4–3.8 (#368–#372): hal 1 "pemberitahuan tidak mendahului uangnya" hanya penalaran ("push berhasil lalu COMMIT gagal" tak direkam; push tiruan rentan.txt A menerima 10 permintaan sebelum COMMIT); ±170 MB di 2.9 (nilai tepat 164,25 MB) dan registry `trx` 2 lawan 3 (±65,7 lawan ±98,6 MB); timeout app 30/10 detik Asumsi, perilaku `http`/`dio` [perlu verifikasi]; komponen Tebak bersama: tiga tombol tanpa fungsi saat JS mati (USULAN-PERBAIKAN 9); widget cari-bug diperluas (fokus sesudah Ulang kini juga di 1.19/1.20) dan `.bb-chip.is-good` mengubah chip 2.23; "ubah satu hal" 3.7 hanya perbandingan dua rekaman (W5); naskah: M18 ±12 vs ±11,5 detik, adegan log tak ada, Val Town dan Fowler ke kolom Sumber ADR 22.
- Halaman 3.9–3.12 (#374–#378): ambang "ratusan per detik" ADR 23 naskah bertentangan dengan pembandingnya (±231 per detik; ditulis sebagai usulan, naskah tak diubah); naskah M19 "tiga pembayaran Ani" dan "dua hari" (poller tanpa restart; tak direkam) dan "nomor urut id pun bukan urutan commit" (rekaman hanya `dibuat` terbalik); naskah M20 "worker dihentikan saat deploy" vs `Jalankan` menyelesaikan putaran saat SIGTERM (lab merekam mati paksa) dan "selang di atas lima detik" bukan yang diukur; peta 3.11 "widget race" padahal OutboxWorker kursor; pgmq/Serverpod/Laravel label [perlu verifikasi]; nomor keputusan tampil di 2.x ("keputusan 415/514") belum ditangkap alat; rekaman t3-pool adr22 diubah tanpa dijalankan ulang (Docker mati): jalankan `make -C labs/t3-pool cek` sebelum EVAL-3.

## Ukur antrean merge, baris 3.9–3.15 (arsip 2026-10-27 siang)

| Halaman | PR | Menit dibuka → merge | Gabung main | Run main merah |
| --- | --- | --- | --- | --- |
| 3.9 | #374 | 31 | 1 | 0 |
| 3.10 | #375 | 140 (tinjauan 359 mutasi) | 2 | 0 |
| 3.11 | #376 | 37 | 2 | 0 |
| 3.12 | #378 | 39 | 3 | 0 |
| 3.13 | #381 | 58 | 2 | 1 (infra Playwright digest-mismatch) |
| 3.14 | #382 | 45 | 2 | 0 |
| 3.15 | #383 | 131 (macet, dua restart) | 2 | 0 |

## Perlu dicek pemilik, halaman 3.13–3.15 dan naskah 4 (arsip 2026-10-27 siang)

- Halaman 3.13–3.15 (#381–#383) dan naskah 4: ADR 25 tetap pesan `data` (iOS tak menjamin; Doze) atau `notification` + `tag` = `notifikasi_id` (keduanya Tidak dijalankan di perangkat); alert baris `mati` dan replay otomatis dijanjikan ke 3.27 tetapi naskah ADR 32 hanya alert umur tertua; naskah M21 "tidak ada yang memulainya lagi" (±9 menit) vs `restart: unless-stopped` Tahap 1 (opsi A: restart otomatis ada, mati beberapa detik; opsi B: API tanpa pengawas: ubah Tahap 1 dan 2); naskah M20 "worker dihentikan saat deploy" vs mati paksa; selang health check 1 detik Asumsi; BFF: PROPOSAL Tahap 4 "modular monolith + 1 service pembayaran + BFF" vs naskah menunda ke ADR 45 (membatalkan = satu ADR + satu halaman); pemangkasan Tahap 4 (1207: 11 lab, 2 widget baru) belum dilihat pemilik; registry/3.5 "tim 6–10 dalam 2 tim" vs naskah 4 tim 13 dalam tiga tim (KONSISTENSI-4).
