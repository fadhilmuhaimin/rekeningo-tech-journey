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
