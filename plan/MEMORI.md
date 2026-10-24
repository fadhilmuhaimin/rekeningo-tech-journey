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
- Tahap 2 bagian 2.8: diselesaikan dengan revisi ADR 6 (keputusan 723); mohon naskah menyebut 2.8 sebagai revisi ADR 6, atau memberi nomor baru.
- 2.2: naskah bagian 2 menulis index `posting(akun, waktu, id)`, lab `posting (buku_id, dibuat, id)`; "notifikasi sederhana di app warung" untuk pencairan ditafsirkan pemberitahuan di dalam app tanpa push (607), mohon ditegaskan.

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

- Butir sebelum 2026-10-24 siang di `plan/DIPUTUSKAN-TANPA-PEMILIK.md`.
- Halaman istilah buku dan saldo_cache ditunda ke 2.7/2.9; trigger batas saldo di widget SQLite 2.6 (lab membacanya di app) diminta diberi label oleh peninjau.
- Konvensi tanda ledger: positif = uang masuk ke buku, tanpa pemetaan debit/kredit (627); istilah "Buku ledger" supaya tooltip tidak menandai "buku" di Tahap 1 (628).
- Replay ledger sebagai widget React baru `RaceLedger`, bukan mode race.js (708); halaman lama B3.2 ditandai `lebur_ke` ke 2.11, tidak dihapus (638).
- api-t2: tanpa endpoint cek nama penerima, tetap bcrypt, nomor `K`+nomor akun dipertahankan dengan risiko tertulis (646–648).

## Perlu dicek pemilik

- Butir lama dari Tahap 1 dan mode paralel (deploy PROPOSAL, dashboard web, M8, redesain #120, ADR 7 RLS, Cloudflare, Serverpod 4, CI Linux 26.04, renderer Chromium) dipindah ke `plan/PELAJARAN-ARSIP.md` bagian "Perlu dicek pemilik (arsip 2026-10-24)"; LAPORAN-AKHIR mengumpulkannya.
- Keamanan api-t2 (tinjauan #256): nomor karyawan `K` + nomor akun mudah ditebak, `/kiriman` membedakan nomor terdaftar, dan kiriman Rp1 membuka nama penerima di riwayat, jadi nama 1.000 karyawan bisa dikumpulkan dengan Rp1.000 sehari (api-t1 tidak membuka ini). Usul: masuk M16/2.28 (batas per akun untuk cek penerima) atau tugas perbaikan api-t2 sebelum halaman 2.3.
- Idempotency-Key: draft-ietf-httpapi-idempotency-key-header kini revisi -08 (2026-10-22), Active, belum RFC dan belum di registry IANA; baris 512 "kedaluwarsa" diganti keputusan 600, status 400/409/422 lab e3 tetap. ADR 14 perlu memutuskan nasib app 1.0/1.1 yang tidak mengirim key (lab menolak 400).
- Lab Tahap 2: argon2id 64 MiB [perlu verifikasi] terhadap RAM VPS Tahap 2; akun terkunci dijawab 401 generik (550), jadi Ani mengira lupa password: 2.27/2.28 butuh jalur lupa password, mohon konfirmasi; kursor riwayat bisa melewatkan transaksi yang COMMIT belakangan (ADR 16, tinjauan #266).
- RISET-2 "Belum bisa dicek" (7 butir di `plan/RISET-TAHAP-2.md`): antrean di belakang ALTER yang menunggu lock tidak tertulis di dokumentasi PostgreSQL (bukti hanya b4-skema); plan GitHub untuk branch protection/CODEOWNERS repo privat; rekaman e5-payload masih skema lama; Testcontainers dan CREATE INDEX CONCURRENTLY belum direkam; Testcontainers Tahap 2 (naskah) lawan Tahap 3 (PROPOSAL).
- `role="application"` di pembungkus React Flow tidak bisa diganti lewat props; efeknya di pembaca layar [perlu verifikasi] (tinjauan #274).
- 2.4 (618): rekaman api-t2 `tutup-buku.txt` C, jurnal yang COMMIT sesudah laporan masuk periode yang sudah dilaporkan (1.122 jadi 1.123); naskah tidak punya halaman penutupan periode. "< 1 hari" belum diukur.
- Debit/kredit (G-istilah, 691): naskah bagian 3 menulis posting debit dan kredit, lab menyimpan jumlah bertanda (positif masuk); 2.7 harus memilih satu konvensi [perlu verifikasi].
- Tab Laravel 2.6: tipe PHP untuk bigint dari PDO pgsql belum dicek ke dokumentasi PHP (peninjau 2.6 diminta mengecek).
- api-t2 sesudah lab-api-t2a (648): password sementara bisa dipakai orang lain mendahului pemiliknya di /ganti-password (usul: password sementara acak per akun lewat saluran di luar app); app 1.0/1.1 tanpa layar ganti password berhenti di 403; bila HP kampus keluar lewat satu IP (NAT), 300 login per 30 menit tepat di batas per IP.
- 2.8: `jurnal.keterangan` teks bebas berisi nama dan jurnal tidak bisa dihapus; naskah belum menjadwalkan penghapusan data pribadi.

## Sedang dikerjakan

2026-10-24 sore · Tahap 2 halaman, pipa lima worktree (`../rjt-konten` 4323, `../rjt-konten2` 4325, `../rjt-konten3` 4327, `../rjt-teknis` 4324, `../rjt-teknis2` 4326; worktree mana pun dipakai tugas mana pun). Selesai: 2.1, 2.2, 2.4–2.8, lab-api-t2a, W2-race, semua tugas teknis Tahap 2. Berjalan: 2.3, 2.9 (#293), 2.10, 2.11 (#295, ditinjau), 2.12. Antre: lab-c4a sebelum 2.27, 2.13 dst. Batas pemakaian pernah tercapai 09.45–10.20; subagen dilanjutkan dengan SendMessage. Alokasi nomor per tugas: `tmp/catat-antre.md`. Untuk melanjutkan: `gh pr list --state open`.

## Pelajaran

- Pipa paralel butuh nomor per tugas untuk keputusan DAN ID riset (R2-36 dipakai dua PR); alat ukur bisa lolos palsu bila persiapannya diam-diam gagal (axe: hasil terpangkas tanpa `incomplete`, path 404 lolos), jadi setiap alat diuji mutasi (#283). Widget runsql memakai SQLite (sql.js), bukan PGlite (2.4).
- Subagen yang melapor selesai tetapi masih punya proses latar (watch CI) bisa bangun di worktree yang sudah dipakai tugas lain: hentikan dengan TaskStop; brief meminta proses latar dihentikan sebelum melapor. `client:visible` di details tertutup menunda island; details tertutup disembunyikan content-visibility; simpul Rantai diawali angka sesudah huruf bagian terbaca ID internal (2026-10-24).
- Saat batas pemakaian tercapai, subagen berhenti di tengah dan dilanjutkan dengan SendMessage dari transkripnya. Pipa paralel butuh koordinasi istilah dan halaman lama (`lebur_ke`): pengatur meneruskan keputusan satu PR ke PR yang berjalan bersamaan. Peninjau terus menemukan cacat nyata (kunci non-atomik, klaim pre-mortem salah, istilah membocorkan jawaban M9).
