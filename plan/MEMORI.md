# Memori kerja

Catatan kerja lintas sesi dan lintas model. Maksimal 80 baris (gerbang menolak lebih, keputusan 235). Pelajaran dan catatan lama di `plan/PELAJARAN-ARSIP.md` (tidak diimpor; cari dengan grep).

## Keputusan baru

- Nomor baru = terbesar di KEPUTUSAN + 1: `grep -o '^| [0-9]*' plan/KEPUTUSAN.md | tail -1`. Daftar per nomor ada di KEPUTUSAN, tidak diulang di sini.
- 235: hemat konteks (RINGKAS menggantikan impor CERITA/PROPOSAL, MEMORI ≤ 80 baris, PROTOKOL bagian k, `tools/ukur_konteks.py`); loop CLI diganti sesi pengatur + satu subagent per tugas.
- 264: mode paralel dua jalur sejak 2026-10-11. Konten (`../rjt-konten`, PORT_PREVIEW=4323, satu-satunya yang menjalankan lab/Docker; boleh `situs/src/content/docs/**`, `labs/**`, `situs/data/cerita.json`, data widget, file baru widget sendiri; keputusan 300–349): 1.35, K2, 1.36–1.40, K3, 1.41, 1.42. Teknis (`../rjt-teknis`, PORT_PREVIEW=4324, tanpa lab; komponen, CSS, widget, `tools/`, tes; keputusan 350–399): I5c-c, I5c-d, I5d, I5e; I5f, P3, P4, R1–R6 ditunda sampai konten selesai (mengubah halaman). Subagen tidak menulis ANTREAN/MEMORI/STATUS; pengatur mencatat lewat PR `catat/*` dan merge satu per satu (PR kedua di-rebase, gerbang ulang, CI hijau). Batas waktu teknis 75 menit, konten 120 menit. Konflik file: jalur teknis berhenti dan menyelesaikannya. Sesudah kedua jalur: hapus worktree, X1 dan X2 di folder utama.
- 369: lingkup Tahap 1 dibekukan 2026-10-13. ANTREAN hanya menerima kategori rusak, aksesibilitas, kontras, atau gerbang yang benar-benar gagal; polesan dan pencegahan ke `plan/SETELAH-TAHAP-1.md`. Sesudah X1 dan X2 (X2 menulis `plan/LAPORAN-TAHAP-1.md`), berhenti: "Tahap 1 selesai, menunggu tinjauan pemilik".

## Usulan perubahan cerita

- Usulan Tahap 1 (M2, M4, M5, M6/ADR 10, cadangan, 1.42, naskah ±43/±64) dipindah ke `plan/PELAJARAN-ARSIP.md` bagian "Usulan perubahan cerita Tahap 1" (2026-10-24); LAPORAN-AKHIR mengumpulkannya.
- Usulan Tahap 2 sampai 2.2 (ADR 12 vs 2.8, ERD 3b, M9, urutan minggu, angka naskah, tabel pertumbuhan, kampus ±1.200 vs ±1.000, index `posting(akun, waktu)`, notifikasi pencairan) di `plan/PELAJARAN-ARSIP.md` bagian "Usulan perubahan cerita Tahap 2 (arsip 2026-10-24)"; 2.8 diselesaikan dengan revisi ADR 6 (723).
- Usulan Tahap 2 untuk M10–M13 (retry app, "4 detik", index `posting`, "hilang" M12, ALTER lock M13) di `plan/PELAJARAN-ARSIP.md` bagian "Usulan perubahan cerita Tahap 2, M10–M13 (arsip 2026-10-25)".
- 2.19 (ADR 16): naskah menulis kursor `(waktu, id)`, padahal `dibuat` = `now()` awal transaction: celah COMMIT-belakangan (R2-145). 2.20-lab: cerita lama "kuota Ani cepat habis" tidak didukung angka lab (riwayat 20 baris = 2.932 B, 598 B gzip; 20 buka/hari = 0,176% paket 1 GB, Asumsi). 2.22 (ADR 17): naskah "per 1.000 baris" jadi "per 1.000 akun", "saldo cache" = buku.saldo_cache, M13 belum menyebut riwayat app 17 → 3 baris. 2.23 (M14): naskah tidak menyebut cara pemeriksaan hilang; halaman memakai skenario dua cabang menghapus salinan berbeda (file contoh 30 baris, bukan kode api-t2).
- 2.20/2.24/2.25: naskah 2.20 tanpa adegan, "kuota Ani cepat habis" tidak didukung angka; naskah M14 menulis Testcontainers, lab memakai service container dan docker compose; M15 "jalan dua kali" jadi "dijalankan lagi sesudah restart", Rp15.000 ilustrasi.

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

- Butir sebelum 2026-10-25 pagi di `plan/DIPUTUSKAN-TANPA-PEMILIK.md`.
- ADR 16: kursor `(dibuat, id)`, celah COMMIT-belakangan risiko diterima, belum direkam (740, 741); ADR 17: tiga rilis, riwayat app 17 → 3 baris ditulis terang (814); golang-migrate dijawab dari kode sumber (816).
- Lab e5-payload diselaraskan ke riwayat ledger sebagai PR lab sendiri sebelum 2.20 (818–820): server Go salinan 4 blok api-t2, bentuk `penuh` = batas bawah, `/lab/terima` text/plain nosniff (836, 837).
- 2.23: git sungguhan di file contoh 30 baris, Karyawan 800 berperan Citra (826, 827); skenario dua cabang berlabel Ilustrasi (829). Alat penulis berkas menolak argumen asing (725, PR #320).
## Perlu dicek pemilik

- Butir Tahap 2.20–2.28, RISET-3–6, T3-siap, CI-CEPAT dipindah ke `plan/PELAJARAN-ARSIP.md` bagian "Perlu dicek pemilik Tahap 2–3 (arsip 2026-10-26)".
- Butir 2.29–2.31 dan lab Tahap 3 dipindah ke `plan/PELAJARAN-ARSIP.md` bagian "Perlu dicek pemilik, 2.29–2.31 dan lab Tahap 3 (arsip 2026-10-26 siang)".
- Batch 16 dan CI-CEPAT dipindah ke `plan/PELAJARAN-ARSIP.md` bagian "Perlu dicek pemilik, batch 16 dan CI-CEPAT (arsip 2026-10-26 siang)".
- Halaman 3.1–3.3 (#364–#366): top-up massal "beberapa menit" (naskah) lawan ±12,5 menit M27, usul "belasan menit"; pemicu ADR 21 sudah dipenuhi sejak PRD tetapi M21 menceritakannya kejutan (3.14 pilih opsi a atau b); versi app 3.0/3.1 Asumsi penulis; dokumentasi FCM menyarankan FID, field FID di request HTTP v1 [perlu verifikasi] (bila bukan `token`, `perangkat.token_push` di ERD3 berubah); penyaring `notifikasi_id` butuh kode app padahal pesan notification ditampilkan SDK (3.13 pilih data message); widget peta 3.2 "–" padahal pilah.
- Halaman 3.4–3.8 (#368–#372): hal 1 "pemberitahuan tidak mendahului uangnya" hanya penalaran ("push berhasil lalu COMMIT gagal" tak direkam; push tiruan rentan.txt A menerima 10 permintaan sebelum COMMIT); ±170 MB di 2.9 (nilai tepat 164,25 MB) dan registry `trx` 2 lawan 3 (±65,7 lawan ±98,6 MB); timeout app 30/10 detik Asumsi, perilaku `http`/`dio` [perlu verifikasi]; komponen Tebak bersama: tiga tombol tanpa fungsi saat JS mati (USULAN-PERBAIKAN 9); widget cari-bug diperluas (fokus sesudah Ulang kini juga di 1.19/1.20) dan `.bb-chip.is-good` mengubah chip 2.23; "ubah satu hal" 3.7 hanya perbandingan dua rekaman (W5); naskah: M18 ±12 vs ±11,5 detik, adegan log tak ada, Val Town dan Fowler ke kolom Sumber ADR 22.
- Riwayat app sesudah ledger turun 17 → 3 baris (tiga-rilis.txt 69–72, transaksi v1 tidak jadi jurnal): diterima atau migrasi menyalin transaksi v1 (2.22). Akun lab Karyawan 800 berperan Citra di M14 (2.23). Paket 1 GB dan 20 buka/hari untuk kuota adalah Asumsi (2.20-lab). api-t2 tidak mengompres respons dan Dart selalu mengirim Accept-Encoding gzip.

## Ukur antrean merge (keputusan 727, 728)

Alat: `python3 tools/ukur_pr.py <PR...> --sejak <waktu>` (data dari GitHub). Garis dasar sebelum 727, PR #300, #301, #302, #305 (2026-10-24): dibuka → merge 275, 85, 41, 103 menit (median 94); penggabungan main 4, 5, 2, 7 kali (median 4,5); run main merah 2 dari 21 (28946ce, fd9d649). Pembanding pemilik 160 menit (mungkin dihitung dari awal pengerjaan, bukan dari PR dibuka). Keputusan 728 (2026-10-25): tiga lajur halaman; CI-CEPAT (#328) menurunkan waktu dinding CI PR 11,2 → 7,0 menit (semua halaman) dan 3,9 menit (satu halaman), menit job +8% di mode semua; jeda limit #1 (10.47–13.47 WITA, tujuh agen paralel): pakai paling banyak lima agen aktif; PR halaman selalu menyentuh berkas turunan bersama, jadi CI berjalan mode semua (±7 menit); mode sebagian baru teramati di #337 sesudah main bergerak (4m40s, 20 halaman); ukur lima halaman berikutnya yang dibuka sesudahnya (2.25 dan seterusnya) dengan menit mulai → merge, menit CI, jumlah jeda limit lawan median 160 menit; main makin sering merah → kembalikan butir 4 dan 5 (pemeriksaan per halaman, peninjau tanpa gerbang penuh). Lima halaman berikutnya yang dibuka SESUDAH #313 dan #314 masuk (2.22, 2.23, 2.20, 2.24, 2.25; dua data pertama median 66 menit, gabung main median 2, lawan 94 menit dan 4,5 di garis dasar; belum cukup lima, jangan menyimpulkan):

| Halaman | PR | Menit dibuka → merge | Gabung main | Run main merah |
| --- | --- | --- | --- | --- |
| 2.31 | #346 | 57 | 0 | 0 |
| 2.32 | #351 | 31 | 1 | 0 |
| 2.33 | #353 | 42 | 1 | 0 |
| 3.1 | #364 | 24 (pelaksana terputus restart sesi) | 0 | 0 |
| 3.2 | #365 | 36 | 1 | 0 |
| 3.3 | #366 | 39 | 1 | 0 |
| 3.4 | #368 | 50 | 2 | 0 |
| 3.5 | #369 | 102 (dua restart sesi) | 2 | 0 |
| 3.6 | #370 | 66 (jeda limit #5) | 4 | 0 |
| 3.7 | #371 | 29 | 1 | 0 |
| 3.8 | #372 | 53 | 2 | 0 |

## Sedang dikerjakan

2026-10-26 17.00 · Tahap 2 selesai (33/33, EVAL-2 #356, EVAL-2-ulang #363); Tahap 3: lab, ERD3, widget, DIRI-2, KONSISTENSI-3 di main; halaman 3.1–3.8 merge (#364–#366, #368–#372; median 50 menit, run main merah 0 dari 17). Berjalan: pelaksana 3.9 (`tahap-3/outbox-worker`, rjt-konten4), 3.10 (`tahap-3/m19-tidak-diberi-tahu`, rjt-konten3), 3.11 (`tahap-3/klaim-per-baris`, rjt-konten2) dengan `tmp/brief-halaman-t3.md` (memuat pelajaran peninjau: label vs kode rekaman, klaim negatif dipindai, penjaga diturunkan dari sumber). Berikutnya: peninjau tiap halaman, 3.12–3.32 (paling banyak 3 PR halaman terbuka), EVAL-3, DIRI-3, Tahap 4–6, LAPORAN-AKHIR. Alokasi nomor: `tmp/catat-antre.md` (tidak di repo; bila hilang: halaman 3.n memakai 1000+4×(n−1) sampai +3, ID riset R3-100+5×(n−1) sampai +4, cadangan 1150–1169 terpakai sampai 1168; Tahap 4 mulai 1200, Tahap 5 1400, Tahap 6 1600). Untuk melanjutkan: `gh pr list --state open`.

## Pelajaran

- Alat yang menulis berkas menolak argumen asing (lipat_masuk, sinkron_cerita, build_istilah). Chromium crash saat gerbang bersamaan: ulangi kelompok dengan `--ukur`. `pkill -f` berpola ditolak pagar izin: hentikan server lewat PID `lsof`.
- Tujuh agen paralel menghabiskan batas sesi ±4,5 jam: paling banyak lima agen aktif. Koneksi GitHub putus-putus (graphql broken pipe): ulangi perintah, jangan hapus branch sebelum `gh pr view <n> --json state` = MERGED; di zsh `set -- $var` tidak memecah kata, pakai `bash`. Cari tes yang bergantung pada halaman "segera" sebelum menutup daftar; jalankan build SEGERA sesudah gabung konflik JSX; `node --test tests/widgets/*.cjs` dan `sinkron_cerita.py --check` dulu (murah) sebelum gerbang 24 menit.
- Peninjau menemukan cacat nyata di tiap halaman (label lebih kuat dari rekaman, hitungan tak bisa diulang, klaim melampaui dokumentasi, penjaga yang tak menangkap perubahan kata): brief halaman Tahap 3 memuatnya. Empat jeda limit tiap ±5 jam (10.47–13.47, 16.50–19.01, 22.10–23.40, 04.12–08.24) dengan 5–7 agen paralel; pesan pemilik "lanjutkan" diperlukan setelah tiap jeda (agen tak bangun sendiri). Lab yang mengubah `labs/api-t3` bersama harus mencek flag terhadap PR terbuka lain, menjalankan ulang `make cek` api-t3/outbox/pool/instance, dan peninjau menjalankannya lagi: mutasi pada kode uang sering lolos sampai ditambah tes.
