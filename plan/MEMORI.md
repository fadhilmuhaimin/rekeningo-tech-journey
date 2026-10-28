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
- Halaman 3.4–3.12 dipindah ke `plan/PELAJARAN-ARSIP.md` bagian "Perlu dicek pemilik, halaman 3.4–3.12 (arsip 2026-10-27 dini hari)".
- Halaman 3.13–3.15 dan naskah 4 dipindah ke `plan/PELAJARAN-ARSIP.md` bagian "Perlu dicek pemilik, halaman 3.13–3.15 dan naskah 4 (arsip 2026-10-27 siang)".
- Halaman 3.16–3.21 dan lab api-t4 dipindah ke `plan/PELAJARAN-ARSIP.md` bagian "Perlu dicek pemilik, halaman 3.16–3.21 dan lab api-t4 (arsip 2026-10-27 sore)".
- Halaman 3.22–3.24 dan lab t4-webhook/t4-integrasi dipindah ke `plan/PELAJARAN-ARSIP.md` bagian "Perlu dicek pemilik, halaman 3.22–3.24 dan lab webhook/integrasi (arsip 2026-10-28)".
- Halaman 3.25–3.32 dan lab t4-modul/storage/infra/qr/ssrf dipindah ke `plan/PELAJARAN-ARSIP.md` bagian "Perlu dicek pemilik, 3.25–3.32 dan lab Tahap 4 (2026-10-28)".
- Tahap 3 selesai (EVAL-3 #418, putaran 2 #422, DIRI-3 #423): 12 butir untuk pemilik di `plan/TINJAUAN-PEMILIK.md` bagian "Tahap 3". Lab t4-kartu/audit/pipeline (#415, #416, #420) dan ERD4: `plan/PELAJARAN-ARSIP.md` "Perlu dicek pemilik, lab t4-kartu/audit/pipeline (2026-10-29)"; inti: api-t4 gagal gerbang ADR 44 (Go 1.27.1: govulncheck 10 stdlib dipanggil, grype 15 temuan 2 Critical); penerbit tiruan fail terbuka (non-200 dibaca timeout setuju); aturan pelapor QR palsu; api_t4 boleh INSERT audit_log dan UPDATE status; `docker builder prune` (15,5 GB) ditolak pemeriksa izin.
- Riwayat app sesudah ledger turun 17 → 3 baris (tiga-rilis.txt 69–72, transaksi v1 tidak jadi jurnal): diterima atau migrasi menyalin transaksi v1 (2.22). Akun lab Karyawan 800 berperan Citra di M14 (2.23). Paket 1 GB dan 20 buka/hari untuk kuota adalah Asumsi (2.20-lab). api-t2 tidak mengompres respons dan Dart selalu mengirim Accept-Encoding gzip.

## Ukur antrean merge (keputusan 727, 728)

Alat: `python3 tools/ukur_pr.py <PR...> --sejak <waktu>` (data dari GitHub). Garis dasar sebelum 727, PR #300, #301, #302, #305 (2026-10-24): dibuka → merge 275, 85, 41, 103 menit (median 94); penggabungan main 4, 5, 2, 7 kali (median 4,5); run main merah 2 dari 21 (28946ce, fd9d649). Pembanding pemilik 160 menit (mungkin dihitung dari awal pengerjaan, bukan dari PR dibuka). Keputusan 728 (2026-10-25): tiga lajur halaman; CI-CEPAT (#328) menurunkan waktu dinding CI PR 11,2 → 7,0 menit (semua halaman) dan 3,9 menit (satu halaman), menit job +8% di mode semua; jeda limit #1 (10.47–13.47 WITA, tujuh agen paralel): pakai paling banyak lima agen aktif; PR halaman selalu menyentuh berkas turunan bersama, jadi CI berjalan mode semua (±7 menit); mode sebagian baru teramati di #337 sesudah main bergerak (4m40s, 20 halaman); ukur lima halaman berikutnya yang dibuka sesudahnya (2.25 dan seterusnya) dengan menit mulai → merge, menit CI, jumlah jeda limit lawan median 160 menit; main makin sering merah → kembalikan butir 4 dan 5 (pemeriksaan per halaman, peninjau tanpa gerbang penuh). Lima halaman berikutnya yang dibuka SESUDAH #313 dan #314 masuk (2.22, 2.23, 2.20, 2.24, 2.25; dua data pertama median 66 menit, gabung main median 2, lawan 94 menit dan 4,5 di garis dasar; belum cukup lima, jangan menyimpulkan):

| Halaman | PR | Menit dibuka → merge | Gabung main | Run main merah |
| --- | --- | --- | --- | --- |
| 3.25–3.29 | #403, #404, #406, #407, #408 | 81, 64, 29, 38, 68 | 3, 1, 2, 2, 3 | 0 |
| 3.30–3.32 | #411, #413, #414 | 1045 (sesi dimulai ulang ±16 jam; kerja ±100), 67, 67 | 2, 2, 2 | 0 |
| lab t4-modul, storage, infra, qr, ssrf | #401, #405, #409, #410, #412 | 111, 383, 71, 1099 (sesi dimulai ulang; kerja ±300), 102 | 1, 2, 1, 3, 2 | 1 (fe5aea3: MACET/digest Playwright) |
| EVAL/DIRI Tahap 3; lab t4-kartu, audit, pipeline | #418, #421, #422, #423; #415, #416, #420 | 12, 12, 8, 13; 344 (sesi dimulai ulang), 385 (idem), 65 | 1, 0, 0, 0; 2, 2, 2 | 0 |

## Sedang dikerjakan

2026-10-29 04.30 · Tahap 3 SELESAI: 32/32 halaman, EVAL-3 (#418) dan putaran 2 (#422): W1–W4, W6–W8 YA, W5 TIDAK (keputusan pemilik), DIRI-3 (#423). Tahap 4: naskah, registry/ANTREAN, lab 11/11 di main (api-t4, webhook, integrasi, modul, storage, infra, qr, ssrf (dipersempit), kartu, audit, pipeline). Berjalan: ERD4 (#419, peninjau rjt-teknis), W4-webhook (`tahap-4/w4-webhook`, rjt-konten2), W4-breaker (`tahap-4/w4-breaker`, rjt-konten4). Berikutnya: KONSISTENSI-4 (naskah 4 vs semua selisih lab), halaman 4.1–4.31 (3 PR halaman terbuka; pelaksana + peninjau), EVAL-4/DIRI-4, Tahap 5–6 (NASKAH, lab, halaman), LAPORAN-AKHIR. Alokasi nomor: `catatan` tiap tugas ANTREAN dan `tmp/catat-antre.md` (halaman 4.n 1266+4×(n−1)..+3, R4-110+5×(n−1)..+4; KONSISTENSI-4 1390–1393; Tahap 5 1400, Tahap 6 1600). LINGKUNGAN: disk Data 97% (±15 GiB; Docker build cache 15 GB tak dibersihkan: `docker builder prune` ditolak pemeriksa izin, pemilik menjalankan bila perlu); agen lab menyalakan lajurnya sendiri lewat `make`; sesi pengatur dimulai ulang 28 Okt 01.11→17.44 dan 29 Okt 01.10. Untuk melanjutkan: `gh pr list --state open`.

## Pelajaran

- Alat yang menulis berkas menolak argumen asing (lipat_masuk, sinkron_cerita, build_istilah). Chromium crash saat gerbang bersamaan: ulangi kelompok dengan `--ukur`. `pkill -f` berpola ditolak pagar izin: hentikan server lewat PID `lsof`.
- Tujuh agen paralel menghabiskan batas sesi ±4,5 jam: paling banyak lima agen aktif. Koneksi GitHub putus-putus (graphql broken pipe): ulangi perintah, jangan hapus branch sebelum `gh pr view <n> --json state` = MERGED; di zsh `set -- $var` tidak memecah kata, pakai `bash`. Cari tes yang bergantung pada halaman "segera" sebelum menutup daftar; jalankan build SEGERA sesudah gabung konflik JSX; `node --test tests/widgets/*.cjs` dan `sinkron_cerita.py --check` dulu (murah) sebelum gerbang 24 menit.
- Peninjau menemukan cacat nyata di tiap halaman (label lebih kuat dari rekaman, hitungan tak bisa diulang, klaim melampaui dokumentasi, penjaga yang tak menangkap perubahan kata): brief halaman Tahap 3 memuatnya. Empat jeda limit tiap ±5 jam (10.47–13.47, 16.50–19.01, 22.10–23.40, 04.12–08.24) dengan 5–7 agen paralel; pesan pemilik "lanjutkan" diperlukan setelah tiap jeda (agen tak bangun sendiri). Lab yang mengubah `labs/api-t3` bersama harus mencek flag terhadap PR terbuka lain, menjalankan ulang `make cek` api-t3/outbox/pool/instance, dan peninjau menjalankannya lagi: mutasi pada kode uang sering lolos sampai ditambah tes.
- Mutasi penjaga halaman: jalankan putaran DENGAN dan TANPA kunci baris (hanya yang tanpa menemukan celah; 559/559 trivial), mutasi otomatis per baris/angka (±500) di samping terarah, jangkar harus ada dan unik; tes yang tak muncul PASS di `make cek` tak dihitung (daftar dari file bertag); normalisasi masukan sebelum membandingkan (zona IPv6, huruf besar-kecil); cek `df -h /System/Volumes/Data` sebelum run panjang (disk penuh mematikan Docker/PostgreSQL diam-diam); `kill $PIDS` di zsh tak memecah kata; satu respons agen dapat dihentikan pemeriksa keamanan: persempit lingkup, jangan tulis ulang atau alihkan ke agen lain.
