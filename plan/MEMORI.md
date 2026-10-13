# Memori kerja

Catatan kerja lintas sesi dan lintas model. Maksimal 80 baris (gerbang menolak lebih, keputusan 235). Pelajaran dan catatan lama di `plan/PELAJARAN-ARSIP.md` (tidak diimpor; cari dengan grep).

## Keputusan baru

- Nomor baru = terbesar di KEPUTUSAN + 1: `grep -o '^| [0-9]*' plan/KEPUTUSAN.md | tail -1`. Daftar per nomor ada di KEPUTUSAN, tidak diulang di sini.
- 235: hemat konteks (RINGKAS menggantikan impor CERITA/PROPOSAL, MEMORI ≤ 80 baris, PROTOKOL bagian k, `tools/ukur_konteks.py`); loop CLI diganti sesi pengatur + satu subagent per tugas.
- 264: mode paralel dua jalur sejak 2026-10-11. Konten (`../rjt-konten`, PORT_PREVIEW=4323, satu-satunya yang menjalankan lab/Docker; boleh `situs/src/content/docs/**`, `labs/**`, `situs/data/cerita.json`, data widget, file baru widget sendiri; keputusan 300–349): 1.35, K2, 1.36–1.40, K3, 1.41, 1.42. Teknis (`../rjt-teknis`, PORT_PREVIEW=4324, tanpa lab; komponen, CSS, widget, `tools/`, tes; keputusan 350–399): I5c-c, I5c-d, I5d, I5e; I5f, P3, P4, R1–R6 ditunda sampai konten selesai (mengubah halaman). Subagen tidak menulis ANTREAN/MEMORI/STATUS; pengatur mencatat lewat PR `catat/*` dan merge satu per satu (PR kedua di-rebase, gerbang ulang, CI hijau). Batas waktu teknis 75 menit, konten 120 menit. Konflik file: jalur teknis berhenti dan menyelesaikannya. Sesudah kedua jalur: hapus worktree, X1 dan X2 di folder utama.
- 369: lingkup Tahap 1 dibekukan 2026-10-13. ANTREAN hanya menerima kategori rusak, aksesibilitas, kontras, atau gerbang yang benar-benar gagal; polesan dan pencegahan ke `plan/SETELAH-TAHAP-1.md`. Sesudah X1 dan X2 (X2 menulis `plan/LAPORAN-TAHAP-1.md`), berhenti: "Tahap 1 selesai, menunggu tinjauan pemilik".

## Usulan perubahan cerita

- M4: naskah belum menyebut asal batas saldo warung. 1.22 memakai: minggu 2 Raka menambah batas Rp1.500.000 lewat psql; Jumat minggu 3 saldo Ani Rp1.450.000. Disetujui pemilik 2026-10-09; mohon naskah M4 diperbarui.
- M2: naskah menulis server membaca `nominal`; lab dan halaman sejak 1.9 memakai `jumlah` (label layar "Nominal"). Usul: naskah menyebut `jumlah`, atau dibiarkan.
- M5: naskah menulis "100 saldo"; lab membaca 103 akun (100 karyawan + 3 warung), 1.26 menulis 103. Usul: naskah menyebut 103.
- M6/ADR 10: naskah belum menyebut deploy server expand (`jumlah` + `nominal`) yang memulihkan app 1.1 sesudah M6; 1.33 memakainya (Raka men-deploy expand sesudah ADR 10, `versi.txt` bagian B–D, keputusan 252). Mohon naskah diperbarui atau dikonfirmasi.
- Cadangan database: naskah Tahap 1 tidak menyebutnya, padahal API dan PostgreSQL ada di satu VPS. 1.36 menulisnya sebagai celah terbuka + latihan lab (keputusan 302). Usul: Raka menjalankan `pg_dump` manual sebelum setiap migration dan menyalinnya keluar VPS, atau risiko diterima sampai cadangan terjadwal Tahap 3.
- 1.42: naskah bagian 6 menulis jawaban tebak (ADR 6, ADR 5) dibuka di halaman pertama Tahap 2; 1.42 sudah membukanya di widget tebak dan blok "Menuju Tahap 2" (sesuai ANTREAN). Usul: halaman pertama Tahap 2 mengulang dan memperluasnya, naskah cukup menyebut keduanya. Prioritas fitur PRD v2 (P0–P2) dan durasinya belum ada di naskah.
- Naskah `CERITA-TAHAP-1.md` ±64 menulis "Transfer setengah jadi" (Tahap 2), halaman Cerita memakai "Pembayaran setengah jadi" yang lebih tepat; ±43 menulis "Lima tokoh" padahal tabelnya enam. Usul: naskah diselaraskan (XF2, keputusan 372).
- Tahap 2: naskah menulis 2.8 "ADR 12: dari kolom saldo ke ledger", padahal ADR 12 sudah dipakai 1.40 ("Sengaja belum dilakukan") dan ADR Tahap 2 lain bernomor 13–21. Usul: 2.8 jadi ADR 13 dan nomor berikutnya bergeser (21 → 22), atau 2.8 tanpa nomor baru ("ADR 6 diganti"). Registry sementara menulis judul naskah.

## Catatan untuk halaman Tahap 1 berikutnya

- Sejak 1.33 server cerita = expand (`jumlah` + `nominal`, kontrak `labs/b1-openapi/openapi-expand.yaml`). Rekaman atau Snippet 1.34+ yang menampilkan handler bayar, body transfers/riwayat, atau kontrak dibangun dari varian expand (`bangun_dari_v1(tmp, nama, EXPAND_UBAH)` di `run.py`, `openapi-expand.yaml`), atau diberi label "kode v1 sebelum expand".
- 1.39 (F1) menyerap F2: hapus halaman F2 dan entrinya di PR yang sama (pola keputusan 150).
- 1.31 `deploy.txt`: kode api-t1 diambil dari commit main `f128167` (`KODE_V1` di `run.py`), Dockerfile dari folder lab; hash 390ff47/f5ea0b4 (±27 tempat: halaman, `t1-deploy.json`, `t1-deploy-tag.json`, `kartu.json`) hanya berubah bila salah satunya diubah, dan `harap` membuat lab gagal keras.
- Ilustrasi latar Grup Lestari belum ada; ilustrasi baru wajib lolos `ukur-ilustrasi.mjs` (tambahkan path halamannya ke alat itu). `situs/lama/assets/cerita/tahap-1.svg` tidak dipakai lagi.
- Tabel "Angka di tahap ini" ditulis ulang di 1.37/1.38, angka dari `tahap[0].asumsi`.
- 1.41/1.42: rekaman `labs/api-t1/output/sengaja-belum.txt` (1.40) membuktikan dua yang pecah di Tahap 2 — bagian B: dua Bayar bersamaan lolos pemeriksaan service, yang menahan constraint (23514 → 500 di v1, perilaku v1); bagian C–E: Bayar diulang sesudah response hilang tercatat dua kali. Jawaban 1.42 "ADR 5 dibuka lagi" bersandar di sini; keempat yang ditunda ADR 12 tidak ada di jalur kedua kejadian.
- Audit bahasa menolak "kantor" (pakai "perusahaan") dan "pemakai" (pakai "user").
- Pola tulis ulang halaman lama: pindah ke `tahap-1/<slug>.mdx`, lima blok, contoh PRD v1; hapus file lama dan data widget lama; perbarui `path`, `prasyarat`, hapus `lama` di registry, perbarui `alat/indeks-topik.mdx`, lalu `python3 tools/sinkron_cerita.py`.

## Perintah dan pola kerja

- Membaca situs: `make jalan` (font, paket, server dev, browser; `make jalan-hp` untuk HP). Situs (bun 1.4.2): `bun run --cwd situs build|preview|test|cek-tipe|tangkap|layar` (urutan ini; `bun --cwd situs run x` hanya mencetak bantuan dengan exit 0). bun lokal 1.2.19; versi CI lewat `npx --yes bun@1.4.2 ...`.
- Gerbang: `bash tools/cek_situs.sh --layar > tmp/cek.txt 2>&1 && echo LOLOS || echo GAGAL`, lalu `tail -30 tmp/cek.txt`. Gerbang menghentikan preview worktree ini sendiri (sebelum mulai dan di trap) dan gagal keras bila port dipegang server lain (keputusan 249). Preview manual (argumen sama dengan gerbang): `bun run --cwd situs preview --background --port 4321 --host 127.0.0.1`, hentikan `bun run --cwd situs preview stop`; tanpa `--host` server hanya mendengar `[::1]:4321` dan `--url http://127.0.0.1:4321` gagal. Di CI alat ukur berjalan per kelompok (`cek_situs.sh --ukur "<kelompok>"` atas artefak `situs-dist`); daftar satu-satunya `KELOMPOK_UKUR` di `tools/cek_situs.sh`, alat baru masuk kelompok terpendek (keputusan 357).
- Tangkapan dari root: `npm --prefix situs run tangkap -- --url http://127.0.0.1:4321 --path /<path>/` (ke `situs/tangkapan/`). Layar pertama: `npm --prefix situs run layar -- --url http://127.0.0.1:4321`; `layar.mjs` tidak mengukur halaman ADR.
- Layar pertama HP sempit: 1.23 hanya punya 28 px di 375×667, 1.11 43 px di 1366×657; jangan tambah tinggi di atas Inti. Rantai di Inti selalu `ringkas`, maksimal dua baris pendek yang muat di 360 px; simpul akhir harus terbaca benar tanpa sub (sub disembunyikan di HP), mis. "ditolak: saldo kurang" (R1, R2).
- Gerak: bungkus island dengan `MotionProvider` (`situs/src/gerak/`), `import * as m from "motion/react-m"`, `transition` dari `useGerak(...)`, `initial` dari `useAwal(...)`; jangan tulis `duration: <angka>`. Contoh `/uji/gerak/`; diperiksa `ukur-gerak.mjs`.
- Gerak masuk tanpa React/domMax: `muncul(el)` dari `situs/src/gerak/muncul.ts` di useLayoutEffect sesudah pilihan (Tebak, PetaDiagram).
- Diagram arsitektur: `<DiagramArsitektur client:visible id="..." judul="Arsitektur Tahap N" data={Arsitektur.parse(t.arsitektur)} />` dari `situs/src/diagram/`; data di registry `tahap[].arsitektur`; wajib lolos `ukur-diagram.mjs`. Contoh `/uji/diagram/`.
- Per halaman: branch `tahap-1/<slug>` dari main; lab dulu bila perlu (PR sendiri); halaman (PR sendiri); KEPUTUSAN + STATUS + MEMORI + ANTREAN; merge bila CI hijau; akhiri "Siap dilanjutkan dari <halaman>". Setelah 1.42: `plan/PROMPT-CROSSCHECK.md`, lalu `plan/LAPORAN-TAHAP-1.md`.
- Mode paralel: konflik PR yang hanya baris tambahan di `plan/KEPUTUSAN.md` digabung pengatur dengan `tmp/gabung_keputusan.sh <branch> <nomor>` (union baris, cek tidak ada baris hilang, `cek_tabel_plan.py`, push biasa); gerbang ulangnya CI di head gabungan. PR yang file-nya terpisah dari perubahan main terbaru boleh di-merge tanpa gabung ulang; CI push ke main diawasi sesudahnya.

## Diputuskan malam ini

- X1 dan X2 sudah selesai sebelum malam ini (PR #249), jadi tidak diulang: ERD1 masuk sesudah X2 sebagai pengecualian pembekuan; sesudahnya hanya 1.12 dicek ulang 4 varian dan LAPORAN-TAHAP-1 mendapat satu baris. Alasan: perubahan hanya di satu halaman; mengulang X1 penuh tidak menambah bukti.
- 1.12 hanya mendapat diagram statis. Widget ERD bertumbuh dibangun dan diuji di `/uji/erd/`, belum dipasang di 1.12 atau 2.9 sampai pemilik meninjau Tahap 1. Alasan: paling mudah dibatalkan; halaman Tahap 1 sedang ditinjau.
- Nomor keputusan Tahap 2 mengikuti prompt di naskah: jalur lab/konten 400–449, teknis 450–499, pengatur 376–399. Alasan: dua jalur tidak berebut nomor.
- Judul 2.8 di registry ditulis persis naskah ("ADR 12: dari kolom saldo ke ledger") walau 1.40 sudah ADR 12; lihat Usulan perubahan cerita. Alasan: CERITA paling tinggi; mengganti judul satu baris registry mudah.
- Lab pencairan bernama `t2-pencairan` (pola lab khusus tahap `t3-bayar`, `t5-replika`). Halaman 2.x bergantung pada tugas gerbang `T2-mulai` yang hanya pemilik tandai selesai, jadi `antrean.py berikut` tidak pernah memilih halaman. Alasan: larangan menulis halaman malam ini dijaga alat, bukan ingatan.

## Perlu dicek pemilik

- PROPOSAL tidak konsisten soal deploy: tabel infra (~149) menulis Tahap 2 deploy lewat SSH dari Actions, tabel pipeline (~430–431) menulis Tahap 2 manual dan staging Tahap 3, (~432) blue/green Tahap 4; halaman 1.31, 1.35, 1.36, 1.40 mengikuti tabel pipeline ("deploy tanpa jeda" Tahap 3 dari dua instance ~150). Mohon diputuskan.
- Dashboard web: CERITA-TAHAP-1:66, registry Tahap 3 `skala.prd`, PROPOSAL:461 dan :688 menaruhnya di Tahap 3; PROPOSAL:77 di Tahap 2. Beranda (keputusan 316) tidak menyebut tahap. Mohon diputuskan.
- M8 (1.37, keputusan 303): naskah menulis "91/100 penguji aktif", asumsi registry 30% user aktif per hari; halaman memakai 91 sebagai aktif selama uji coba dan menulis kepekaannya terbuka (0,14–0,42 RPS). Mohon konfirmasi tafsiran.
- Redesain #120: usulan perubahan PROPOSAL "Desain visual final" dan CLAUDE.md `<tampilan>` di `plan/AUDIT-TAMPILAN.md` bagian 6, belum diubah.
- ADR 7 (keputusan 240): RLS sebagai pagar kedua dipasang di tabel ledger Tahap 2, tidak di tabel v1 `api-t1` (rekaman `b5-rls` bagian 5: policy pemilik membuat bayar ke warung `UPDATE 0`). Kalau RLS harus sudah berjalan di Tahap 1, perlu tugas lab `api-t1` sendiri.
- Cloudflare Pages (keputusan 115): butuh API token (Account > Cloudflare Pages > Edit) dan Account ID, lalu `gh secret set CLOUDFLARE_API_TOKEN` dan `gh secret set CLOUDFLARE_ACCOUNT_ID`.
- Serverpod 4 (1.32): apakah exception buatan sendiri sampai ke tes `withServerpod` dengan tipe aslinya [perlu verifikasi].
- CI Linux (keputusan 361): `ubuntu-latest` pindah ke 26.04 bertahap 19 Okt–19 Nov 2026 (changelog GitHub 2026-09-17); usul pin `ubuntu-24.04` atau run percobaan 26.04 (tugas G2c). `geometricPrecision` membuat teks di Linux/ChromeOS tanpa hinting (sedikit lebih lembut di layar DPI rendah); biaya di Firefox [perlu verifikasi].
- Renderer Chromium di CI diam total ±0,13% per muat di halaman Tahap 1 (keputusan 364, 367): mekanismenya di pipeline commit/aktivasi/raster Chromium, 28/31 kasus di enam halaman yang banyak kodenya, juga saat muat tanpa gulir; Xvfb headed ikut, macOS 0/10.080. Risiko di Chrome HP pembaca belum diketahui. Kirim draf laporan bug Chromium (PR #231)?

## Sedang dikerjakan

2026-10-13 23.30 WITA · Mode malam (prompt pemilik, tanpa bertanya): ERD1 (ERD Tahap 1 statis di 1.12, pengecualian pembekuan, keputusan 375) di jalur teknis; lalu persiapan Tahap 2 dari `plan/CERITA-TAHAP-2.md`: RINGKAS, ANTREAN Tahap 2, registry 33 halaman "segera", `tools/erd.py` Tahap 2 dan widget ERD bertumbuh (teknis), lab Tahap 2 urut ANTREAN (jalur lab). Halaman 2.x TIDAK ditulis malam ini. Worktree `../rjt-teknis` (4324) dan `../rjt-lab` (4323, satu-satunya yang merekam lab). Akhir: `plan/LAPORAN-PAGI.md` lalu "Selesai untuk malam ini". Melanjutkan: `python3 tools/antrean.py berikut` dan `git worktree list`.

## Pelajaran

- Widget alur: satu urutan DOM di semua ukuran (jalur, tombol, tebakan, varian, detail + HP); mode sempit hanya kelas `is-sempit`, tanpa memindah DOM (keputusan 358). Bila DOM terpaksa dipindah, simpan `document.activeElement` dan kembalikan dengan `focus({ preventScroll: true })`: Chrome memindah fokus ke BODY.
- Perubahan CSS global di atas Inti menggeser layar pertama semua halaman; simpan keluaran `layar.mjs` sebelum dan bandingkan sesudahnya (`tmp/banding_layar.py`).
- Setelah gerbang lolos, perubahan teks apa pun wajib diikuti `python3 tools/sinkron_cerita.py` dan gerbang ulang (CI #119 gagal karena `kartu.json` tertinggal).
- Merge ditolak pengaman: berhenti, laporkan di baris pertama, jangan memulai halaman berikutnya di atas PR yang belum di-merge.
- layar.mjs tidak menghitung Snippet sebagai visual Inti; Inti butuh Rantai atau widget (1.32 gagal 4 ukuran sebelum Rantai).
- Tabel `plan/*.md` diperiksa `tools/cek_tabel_plan.py` di gerbang (keputusan 362): pipe di teks atau code span ditulis `\|`; jangan tulis `\\|`.
- Pemeriksa yang menyaring data wajib menghitung dan mencetak yang dilewati: `if fg and bg:` di contrast.py membuang 26 pasangan per mode tanpa pesan; buktikan pemeriksa bisa gagal dengan uji mutasi pada salinan (`tools/test_contrast.py`).
