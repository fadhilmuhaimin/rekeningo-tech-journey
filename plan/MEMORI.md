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
- Riwayat app sesudah ledger turun 17 → 3 baris (tiga-rilis.txt 69–72, transaksi v1 tidak jadi jurnal): diterima atau migrasi menyalin transaksi v1 (2.22). Akun lab Karyawan 800 berperan Citra di M14 (2.23). Paket 1 GB dan 20 buka/hari untuk kuota adalah Asumsi (2.20-lab). api-t2 tidak mengompres respons dan Dart selalu mengirim Accept-Encoding gzip.

## Ukur antrean merge (keputusan 727, 728)

Alat: `python3 tools/ukur_pr.py <PR...> --sejak <waktu>` (data dari GitHub). Garis dasar sebelum 727, PR #300, #301, #302, #305 (2026-10-24): dibuka → merge 275, 85, 41, 103 menit (median 94); penggabungan main 4, 5, 2, 7 kali (median 4,5); run main merah 2 dari 21 (28946ce, fd9d649). Pembanding pemilik 160 menit (mungkin dihitung dari awal pengerjaan, bukan dari PR dibuka). Keputusan 728 (2026-10-25): tiga lajur halaman; ukur lima halaman berikutnya yang dibuka sesudahnya (2.25 dan seterusnya) dengan menit mulai → merge, menit CI, jumlah jeda limit lawan median 160 menit; main makin sering merah → kembalikan butir 4 dan 5 (pemeriksaan per halaman, peninjau tanpa gerbang penuh). Lima halaman berikutnya yang dibuka SESUDAH #313 dan #314 masuk (2.22, 2.23, 2.20, 2.24, 2.25; dua data pertama median 66 menit, gabung main median 2, lawan 94 menit dan 4,5 di garis dasar; belum cukup lima, jangan menyimpulkan):

| Halaman | PR | Menit dibuka → merge | Gabung main | Run main merah |
| --- | --- | --- | --- | --- |
| 2.22 | #319 | 53 | 2 | 0 |
| 2.23 | #318 | 78 | 2 | 0 |
| 2.20 | #322 | menyusul | 0 | 0 |
| 2.24 | #323 | menyusul | 0 | 0 |

## Sedang dikerjakan

2026-10-25 · Tahap 2 halaman, aturan 727 dan 728 (sampai tiga PR halaman terbuka; catatan di badan PR `## Catatan pengatur`, diambil dengan `python3 tools/ambil_catatan_pr.py <PR...>` lalu `lipat_masuk.py`). Selesai: 2.1–2.19, 2.21–2.23 (22 dari 33), semua lab/widget/teknis Tahap 2. Dalam tinjauan: #322 (2.20), #323 (2.24). Berjalan sesudah 728: LAB-PARALEL dan CI-CEPAT (lajur teknis), RISET-3 lalu NASKAH-3 (lajur riset), pelaksana 2.25. Berikutnya: 2.26–2.33, EVAL-2, DIRI-2, KONSISTENSI-3, lalu Tahap 3 (T3-siap sesudah NASKAH-3, halaman 3.x sesudah KONSISTENSI-3 dan DIRI-2). Alokasi nomor keputusan/riset per tugas: `tmp/catat-antre.md` (tidak di repo; bila hilang: nomor 840+ dan ID riset R2-180 ke atas, cek terbesar atas KEPUTUSAN dan PR terbuka). Untuk melanjutkan: `gh pr list --state open`.

## Pelajaran

- Aturan 727 menurunkan waktu per halaman (53 dan 78 menit vs 94) tetapi masih ada gabung main karena berkas bersama (RISET, cerita.json): urutkan RISET dengan `comm`, cerita.json `--theirs` + skrip registri idempoten + sinkron. Peninjau menemukan cacat nyata di setiap halaman; tes bersamaan harus menahan baris sampai semua antre; tes `t.Skip` tanpa DB hijau saat aturan hilang.
- Alat yang menulis berkas menolak argumen asing (lipat_masuk, sinkron_cerita, build_istilah). Chromium crash saat gerbang bersamaan: ulangi kelompok dengan `--ukur`. `pkill -f` berpola ditolak pagar izin: hentikan server lewat PID `lsof`.
