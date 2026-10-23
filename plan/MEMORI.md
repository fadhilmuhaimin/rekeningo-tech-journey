# Memori kerja

Catatan kerja lintas sesi dan lintas model. Maksimal 80 baris (gerbang menolak lebih, keputusan 235). Pelajaran dan catatan lama di `plan/PELAJARAN-ARSIP.md` (tidak diimpor; cari dengan grep).

## Keputusan baru

- Nomor baru = terbesar di KEPUTUSAN + 1: `grep -o '^| [0-9]*' plan/KEPUTUSAN.md | tail -1`. Daftar per nomor ada di KEPUTUSAN, tidak diulang di sini.
- 235: hemat konteks (RINGKAS menggantikan impor CERITA/PROPOSAL, MEMORI ≤ 80 baris, PROTOKOL bagian k, `tools/ukur_konteks.py`); loop CLI diganti sesi pengatur + satu subagent per tugas.
- 264: mode paralel dua jalur sejak 2026-10-11. Konten (`../rjt-konten`, PORT_PREVIEW=4323, satu-satunya yang menjalankan lab/Docker; boleh `situs/src/content/docs/**`, `labs/**`, `situs/data/cerita.json`, data widget, file baru widget sendiri; keputusan 300–349): 1.35, K2, 1.36–1.40, K3, 1.41, 1.42. Teknis (`../rjt-teknis`, PORT_PREVIEW=4324, tanpa lab; komponen, CSS, widget, `tools/`, tes; keputusan 350–399): I5c-c, I5c-d, I5d, I5e; I5f, P3, P4, R1–R6 ditunda sampai konten selesai (mengubah halaman). Subagen tidak menulis ANTREAN/MEMORI/STATUS; pengatur mencatat lewat PR `catat/*` dan merge satu per satu (PR kedua di-rebase, gerbang ulang, CI hijau). Batas waktu teknis 75 menit, konten 120 menit. Konflik file: jalur teknis berhenti dan menyelesaikannya. Sesudah kedua jalur: hapus worktree, X1 dan X2 di folder utama.
- 369: lingkup Tahap 1 dibekukan 2026-10-13. ANTREAN hanya menerima kategori rusak, aksesibilitas, kontras, atau gerbang yang benar-benar gagal; polesan dan pencegahan ke `plan/SETELAH-TAHAP-1.md`. Sesudah X1 dan X2 (X2 menulis `plan/LAPORAN-TAHAP-1.md`), berhenti: "Tahap 1 selesai, menunggu tinjauan pemilik".

## Usulan perubahan cerita

- Usulan Tahap 1 (M2, M4, M5, M6/ADR 10, cadangan, 1.42, naskah ±43/±64) dipindah ke `plan/PELAJARAN-ARSIP.md` bagian "Usulan perubahan cerita Tahap 1" (2026-10-24); LAPORAN-AKHIR mengumpulkannya.
- Tahap 2: naskah menulis 2.8 "ADR 12: dari kolom saldo ke ledger", padahal ADR 12 sudah dipakai 1.40 ("Sengaja belum dilakukan") dan ADR Tahap 2 lain bernomor 13–21. Usul: 2.8 jadi ADR 13 dan nomor berikutnya bergeser (21 → 22), atau 2.8 tanpa nomor baru ("ADR 6 diganti"). Registry sementara menulis judul naskah.
- Tahap 2 bagian 3b, ERD Tahap 1: blok mermaid berbeda dari `labs/api-t1` di delapan hal (keputusan 375: `peran`→`jenis`, `hash_password`→`password_hash`, tanpa `akun.batas_saldo` (CHECK Rp1.500.000 warung) dan `akun.dibuat`, `topup.jumlah`→`nominal`, `dibuat_oleh`→`admin_id`, `koreksi` tanpa `transaksi_id`, relasi admin), dan tabel "Apa yang berubah" menulis Tahap 1 "tanpa index riwayat" padahal CERITA-TAHAP-1 ±125 dan lab punya index `transaksi (dari, dibuat)` dan `(ke, dibuat)`. Diagram mengikuti lab. Usul: blok mermaid dan baris itu diselaraskan.
- M9: lab `b3-ledger` (keputusan 403, `batas.txt`) membuktikan "keduanya berhasil, saldo −Rp20.000" hanya terjadi bila pemeriksaan saldo kedua transfer jalan sebelum salah satunya commit; bila kode memperbarui `saldo_cache` di transaction yang sama, transfer kedua menunggu lock baris lalu ditolak (500). Usul: naskah M9 menyebut kode minggu 1 memeriksa saldo dari jumlah posting tanpa memperbarui cache.
- Tahap 2, urutan minggu: M9 (minggu 1) sudah berjalan di ledger, padahal M13 (minggu 4) adalah migrasi ke ledger itu sendiri (api-t2, keputusan 409–412). Juga: asal nomor karyawan tidak disebut (lab: `K` + nomor akun); `akun.saldo` membeku antara migrate dan contract (naskah "dipertahankan sebagai cache" ditafsirkan `buku.saldo_cache`); riwayat app sesudah migrasi dimulai dari jurnal pembuka.
- Tahap 2, angka naskah yang tidak terulang di lab: M11 "4 detik" (lab ±30 ms per halaman, ±1,9 detik seluruh riwayat; minggu 3 baru ±44 ribu posting, keputusan 521, 526), M13 "40 detik" (lab 5 detik; lama datang dari antrean di belakang laporan, 536), M15 Rp15.000 (data lab menaruh saldo itu di titik henti, 504), M9 −Rp20.000 (hanya lewat alat lab, 431). Usul: naskah menyebut mekanismenya; angkanya tetap ilustrasi cerita.
- Tahap 2, lain-lain: M10 "Budi menekan Bayar lagi" direkam sebagai retry app dengan request sama (e3); nomor rekening tujuan warung belum ada di ERD 3b (505); mermaid ERD Tahap 2 berbeda dari lab di beberapa kolom (473: `peran`/`jenis`, `hash_password`, `akun.nama`, PK `baris_pencairan`).
- Tahap 2 bagian 3b, tabel pertumbuhan: baris Tahap 1 (±22 ribu) memakai 2 transaksi per user aktif, Tahap 2–4 memakai 3; registry dan 1.38 memakai 2 × 300 B; lab b2-query 760.448 posting ±99 MB. Halaman Tahap 2 memakai rumus naskah, 1.38 tidak diubah (keputusan 600).
- 2.1: CERITA-TAHAP-1 ±13/±81 dan 1.1 menulis kampus ±1.200 karyawan, CERITA-TAHAP-2 ±1.000 (2.1 ikut Tahap 2); CERITA-TAHAP-1 ±65 dan 1.42 menyebut fitur "ekspor laporan bulanan", PRD v2 tidak (2.1 menulisnya bagian tutup buku).

## Catatan untuk halaman Tahap 2

- Temuan lab untuk halaman 2.x ada di butir `catatan` tugasnya di ANTREAN dan di `plan/SETELAH-TAHAP-2.md`; catatan halaman Tahap 1 dipindah ke PELAJARAN-ARSIP (2026-10-14).

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

## Diputuskan tanpa pemilik

Mode penyelesaian penuh sejak 2026-10-23: pemilik meninjau di akhir, tidak ditanya. Satu baris per keputusan (opsi paling aman dan paling mudah dibatalkan); bila lebih dari 8 baris, yang lama pindah ke `plan/DIPUTUSKAN-TANPA-PEMILIK.md` (keputusan 551). LAPORAN-AKHIR mengumpulkan keduanya.

- T2-mulai ditandai selesai tanpa tinjauan Tahap 1 (keputusan 552). Mudah dibatalkan: halaman 2.x bisa ditarik per PR.
- Nomor keputusan per tahap (keputusan 553): T2 konten 600–679, teknis 680–719, pengatur 720–799; T3 800–999; T4 1000–1199; T5 1200–1399; T6 1400–1499; laporan akhir 1500+. Di dalam blok tahap: konten +0–99, teknis +100–149, pengatur +150–199.
- Crosscheck kecil K4–K9 dan X1-t2/X2-t2 dihapus dari ANTREAN; EVALUASI-TAHAP-N menggantikannya (keputusan 554).
- Halaman 2.1 dan 2.2 ditulis sebelum lab-api-t2a karena Docker tertahan; lab tetap sebelum halaman yang memakainya (keputusan 562).
- Angka pertumbuhan Tahap 2 memakai rumus naskah 3b; 1.38 tidak diubah (keputusan 600).
- Halaman cerita Tahap 2 lama tidak dihapus, dipindah ke akhir Tahap 2 di registry (605). 2.4 ditulis sebelum 2.3; selama Docker tertahan, halaman memakai rekaman yang sudah ada (722).

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
- Keamanan api-t2 (tinjauan #256): nomor karyawan `K` + nomor akun mudah ditebak, `/kiriman` membedakan nomor terdaftar, dan kiriman Rp1 membuka nama penerima di riwayat, jadi nama 1.000 karyawan bisa dikumpulkan dengan Rp1.000 sehari (api-t1 tidak membuka ini). Usul: masuk M16/2.28 (batas per akun untuk cek penerima) atau tugas perbaikan api-t2 sebelum halaman 2.3.
- Idempotency-Key: draft-ietf-httpapi-idempotency-key-header kini revisi -08 (2026-10-22), Active, belum RFC dan belum di registry IANA; baris 512 "kedaluwarsa" diganti keputusan 600, status 400/409/422 lab e3 tetap. ADR 14 perlu memutuskan nasib app 1.0/1.1 yang tidak mengirim key (lab menolak 400).
- Lab Tahap 2: argon2id 64 MiB [perlu verifikasi] terhadap RAM VPS Tahap 2; akun terkunci dijawab 401 generik (550), jadi Ani mengira lupa password: 2.27/2.28 butuh jalur lupa password, mohon konfirmasi; kursor riwayat bisa melewatkan transaksi yang COMMIT belakangan (ADR 16, tinjauan #266).
- Docker Desktop (2026-10-24 00.10 WITA) tertahan di dialog izin admin untuk helper privileged; daemon tidak jalan, jadi lab (lab-api-t2a, ulang rekaman) menunggu pemilik mengizinkan. Pengatur tidak memasukkan password.
- RISET-2 "Belum bisa dicek" (7 butir di `plan/RISET-TAHAP-2.md`): antrean di belakang ALTER yang menunggu lock tidak tertulis di dokumentasi PostgreSQL (bukti hanya b4-skema); plan GitHub untuk branch protection/CODEOWNERS repo privat; rekaman e5-payload masih skema lama; Testcontainers dan CREATE INDEX CONCURRENTLY belum direkam; Testcontainers Tahap 2 (naskah) lawan Tahap 3 (PROPOSAL).
- `role="application"` di pembungkus React Flow tidak bisa diganti lewat props; efeknya di pembaca layar [perlu verifikasi] (tinjauan #274).

## Sedang dikerjakan

2026-10-24 · Tahap 2 langkah halaman, pipa dua worktree per jalur (720). Selesai: RISET-2 (#272), A11y-diagram (#274), 2.1 (#277), G-ci-apt (#278). Berjalan: pelaksana 2.2 (`../rjt-konten2`), 2.4 (`../rjt-konten`), G-istilah (`../rjt-teknis2`), G-axe (`../rjt-teknis`). Antre: ERD-1.12 → W2-race (teknis); 2.5, 2.6 … (konten); 2.3 dan lab-api-t2a menunggu Docker. Nomor keputusan per tugas: keputusan 721. Catatan yang belum masuk repo: `tmp/catat-antre.md`. Untuk melanjutkan: `gh pr list --state open`.

## Pelajaran

- Merge hanya bila `gh pr checks <n>` keluar 0: PR #271 ter-merge dengan job "Pasang Chromium Playwright" gagal (mirror apt lambat, exit 124; main hijau sesudah `gh run rerun --failed`). Worktree baru butuh `bash tools/get_fonts.sh` sebelum gerbang (2026-10-24).
- Pohon aksesibilitas Chromium (CDP `Accessibility.getFullAXTree`) yang dibuktikan, bukan atribut DOM: svg pembungkus tanpa nama tetap terbaca `image` (#274). `gh pr merge --delete-branch` gagal bila worktree lain memegang main: merge tanpa itu lalu `git push origin --delete <branch>`; subagen tidak checkout main di worktree. Durasi: RISET-2 27 + 62 menit tinjau, A11y-diagram 82 menit (2026-10-24).
- Peninjau menemukan yang lolos pelaksana di setiap tugas sejauh ini: apt memakai .deb cache hanya menurut ukuran (#278, 684), Berikutnya 2.1 menuju cerita lama (#277, 605), klik kotak diagram tidak sampai tombol (#274, 681). Pipa dua worktree per jalur (720); nomor keputusan per tugas di brief (721).
