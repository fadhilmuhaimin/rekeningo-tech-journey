# Laporan pagi · 2026-10-14 (mode malam 23.25–06.10 WITA)

Persiapan Tahap 2 selesai, termasuk sembilan lab. Halaman 2.x sengaja belum ditulis, sesuai prompt malam. Setiap lab, widget, dan alat malam ini dikerjakan satu pelaksana, lalu diperiksa satu peninjau sebelum merge. Dari 13 PR kerja yang ditinjau, 10 diperbaiki peninjau sebelum merge. Empat perbaikan menyangkut uang, file bank, keamanan, atau isolasi antar-lab (#256, #260, #268, #265).

## 1. Alasan berhenti dan jam

- Butir 1–4 prompt malam selesai pukul ±06.00 WITA, jadi berhenti dengan "Selesai untuk malam ini".
- X1 dan X2 Tahap 1 sudah selesai sebelum malam ini (PR #249) dan tidak diulang. ERD1 masuk sesudahnya sebagai pengecualian pembekuan; yang dicek ulang hanya 1.12.
- Batas pemakaian sesi tercapai pukul ±03.20 dan pulih 04.40 WITA. Lima agen berhenti di tengah dan dilanjutkan dari commit terakhir masing-masing. Tidak ada pekerjaan yang hilang.

## 2. Selesai malam ini

| Tugas | Isi | PR | Keputusan | Peninjau |
|---|---|---|---|---|
| T2-naskah | `plan/CERITA-TAHAP-2.md` identik byte demi byte dengan lampiran; RINGKAS (Tahap 1 diringkas, peta 33 halaman Tahap 2); ANTREAN Tahap 2 (55 tugas, gerbang pemilik `T2-mulai`) | #252 | – | – |
| ERD1 | `tools/erd.py` membangun skema akhir Tahap 1 di schema sementara, `situs/data/erd/tahap-1.json`, `--cek` di gerbang, diagram statis di blok Paham 1.12 | #253 | 375 | Diperbaiki: baris "Sengaja belum dilakukan" 1.12 yang bertentangan dengan ERD |
| lab-b3-ledger | Jurnal, posting, tiga invarian di database, migrasi v1, tutup buku | #254 | 400–407 | Diperbaiki: alasan 402, rujukan 403 |
| lab-api-t2 | api-t1 naik ke ledger lewat expand → migrate → contract; transfer antar karyawan, top-up CSV 1.000 akun, riwayat kursor, tutup buku; `go test` di PostgreSQL | #256 | 408–418 | Diperbaiki: Bayar dari server v1 yang antre dijawab 201 tapi uangnya hanya di tabel v1 (417); top-up besar dipotong diam-diam (418) |
| lab-b3-race | M9 di ledger, empat cara mengunci, enam replay widget race | #257 | 430–434 | Diperbaiki: lab macet, bukan gagal, saat gagal di tengah lock (434) |
| T2-registry | 33 halaman Tahap 2; 25 yang belum ditulis tampil "segera" tanpa tautan; 8 halaman lama di slot naskah sebagai "versi lama" | #258 | 450 | Lolos |
| lab-b3-isolasi | Anomali per isolation level di ledger | #259 | 440–447 | Diperbaiki: deteksi lock berbasis waktu (446), dua klaim teks (447) |
| lab-t2-pencairan | Lab baru: job Jumat, M15 Rp15.000 dari kode, ADR 19, rekonsiliasi | #260 | 500–508 | Diperbaiki: folder tidak di-sync sesudah rename (506), periode tidak diperiksa (507) |
| I6-erd | Widget ERD bertumbuh (React Flow) di `/uji/erd/`: pemilih tahap, bandingkan, versi statis | #262 | 460–467 | Diperbaiki: label pembaca layar Inggris dari React Flow, kalimat terpotong, detail di luar layar |
| lab-e3-idempotency | M10 di ledger, idempotency key per niat bayar, client Dart | #263 | 510–518 | Lolos (30 request bersamaan tetap satu jurnal) |
| lab-b4-skema | M13: ALTER di jam ramai, `lock_timeout`, backfill per 1.000, tiga rilis | #264 | 530–537 | Diperbaiki: dua kalimat cara kerja lock (537) |
| ERD2 | `situs/data/erd/tahap-2.json` dari api-t2 (8 tabel, 11 FK), selisih Tahap 1 → 2, `/uji/erd/` memakai data lab | #265 | 470–474 | Diperbaiki: tokenizer SQL `erd.py` bisa dibohongi empat bentuk SQL sehingga sumber bisa menyentuh schema lab lain; ditambah pagar lock (474) |
| lab-b2-query | M11 dan M12 di ledger: N+1, index, kursor | #266 | 520–526 | Lolos |
| lab-c4-ratelimit | M16: argon2id, rate limit dua lapis di memori, wajib ganti password | #268 | 540–550 | Diperbaiki: enam celah keamanan (550), antara lain `/ganti-password` tanpa rate limit dan salt tetap |

Pencatatan pengatur: #255, #261, #267, dan PR laporan ini.

## 3. Diparkir dan yang sengaja belum

- Tidak ada tugas yang diparkir.
- Halaman 2.1–2.33 belum ditulis. Semua halaman bergantung pada tugas `T2-mulai`, yang hanya pemilik tandai selesai.
- Widget ERD bertumbuh baru ada di `/uji/erd/`. Halaman 1.12 tetap memakai diagram statis, dan pemasangan di 1.12 dan 2.9 ikut tugas 2.9.
- Dua tugas baru dari tinjauan masuk ANTREAN sebelum `T2-mulai`:
  - `lab-api-t2a` (keamanan): batasi cek penerima dan kiriman di api-t2.
  - `A11y-diagram` (aksesibilitas): label pembaca layar DiagramArsitektur di beranda masih berbahasa Inggris.
- Polesan dari 14 tinjauan ada di `plan/SETELAH-TAHAP-2.md` (dan ERD1 di `plan/SETELAH-TAHAP-1.md`).
- PR #232 (G2c) dan branch R6 tetap dibiarkan untuk sesudah tinjauan Tahap 1.

## 4. Status main

- Gerbang penuh `tools/cek_situs.sh --layar` di main `cb8378f` (sesudah #264) LOLOS pukul 05.27: "semua pemeriksaan lolos".
- CI push ke main: `0e0192b` (sesudah #268) dan `cb8378f` success; `5eb96ee` (sesudah #265) berjalan saat laporan ditulis, lihat run terakhir workflow `cek` di main. Run `033e70b` dibatalkan karena tersusul push berikutnya.
- Semua worktree `../rjt-*` dihapus; main bersih.

## 5. Sepuluh hal untuk dilihat pemilik pagi ini

1. **Selisih naskah Tahap 2 dengan lab.** Empat angka naskah tidak terulang di lab:
   - M11 "4 detik": lab ±30 ms per halaman, ±1,9 detik untuk seluruh riwayat.
   - M13 "40 detik": lab 5 detik.
   - M15 Rp15.000: angka itu data lab yang sengaja ditaruh.
   - M9 −Rp20.000: hanya bisa direkam lewat alat lab.

   Urutan minggu juga bertentangan: M9 (minggu 1) sudah berjalan di ledger, padahal M13 (minggu 4) adalah migrasi ke ledger itu sendiri. Rinciannya ada di MEMORI "Usulan perubahan cerita".
2. **Nomor ADR 12 ganda.** Naskah menulis 2.8 sebagai "ADR 12", padahal 1.40 sudah memakai ADR 12. Registry sementara memakai judul naskah. Pilihannya: geser nomor (2.8 jadi ADR 13 dan seterusnya), atau 2.8 tanpa nomor baru.
3. **Keamanan api-t2.** Nomor karyawan mudah ditebak, dan kiriman Rp1 membuka nama penerima di riwayat. Akibatnya nama 1.000 karyawan bisa dikumpulkan dengan Rp1.000. Tugas `lab-api-t2a` menangani ini; mohon konfirmasi apakah masuk cerita M16.
4. **Idempotency-Key.** Header ini masih draft IETF -07 yang sudah kedaluwarsa, bukan standar. Halaman 2.13/2.14 harus menyebutnya begitu, dan ADR 14 perlu memutuskan nasib app 1.0/1.1 yang tidak mengirim key.
5. **Kursor riwayat (ADR 16).** Transaksi yang mulai lebih dulu lalu COMMIT belakangan bisa terlewat oleh kursor `(dibuat, id)`. Peninjau sudah membuktikannya, tapi belum direkam. ADR 16 harus memilih jalan keluar.
6. **Akun terkunci (M16).** Lab sekarang menjawab 401 generik sesuai OWASP, jadi Ani tidak melihat pesan "terkunci" dan mengira lupa password. Mohon konfirmasi: apakah 2.27/2.28 menambah jalur lupa password atau notifikasi?
7. **Registry dan Tahap 1.** Nomor rujukan halaman lama di 9 halaman Tahap 1 berubah, misalnya 2.1 → 2.11; judul dan tujuannya tetap. `tahap[1]` di registry masih versi lama ("100–1.000 user", rekap lama) supaya kalkulator 1.37/1.38 tidak berubah.
8. **Lihat sendiri.** Tiga halaman perlu dibuka:
   - `/tahap-1/data-modeling/` di blok Paham: ERD statis Tahap 1.
   - `/uji/erd/`: widget ERD bertumbuh. Pilih Tahap 2, lalu Bandingkan.
   - Sidebar Tahap 2 di HP: butir "segera" dan "versi lama".

   Tangkapannya ada di bagian 8.
9. **argon2id 64 MiB [perlu verifikasi].** Biaya hash dari parameter RFC 9106 perlu dicocokkan dengan RAM VPS Tahap 2.
10. **Gerbang pemilik.** Untuk membuka halaman Tahap 2, tandai `T2-mulai` selesai, atau kirim prompt "Tahap 1 sudah saya tinjau" yang ada di naskah. Urutan berikutnya: `lab-api-t2a`, `A11y-diagram`, lalu 2.1.

## 6. Diputuskan malam ini

Daftar lengkap ada di MEMORI "Diputuskan malam ini":

- X1/X2 tidak diulang.
- 1.12 hanya mendapat diagram statis.
- Rentang nomor keputusan Tahap 2: lab dan konten 400–449 lalu 500–549 untuk lab sisa, teknis 450–499.
- Judul 2.8 mengikuti naskah.
- Lab pencairan diberi nama `t2-pencairan`.
- Halaman Tahap 2 dikunci di balik `T2-mulai`.
- Beberapa jalur lab berjalan bersamaan di PostgreSQL bersama, dengan schema dan port sendiri; rekaman versi ledger ditulis ke file baru, jadi halaman versi lama tidak berubah.
- Rujukan nomor di Tahap 1 berubah; `tahap[1]` tidak diubah.
- Temuan keamanan dan aksesibilitas dijadikan tugas.

## 7. Perlu dicek pemilik

Butir baru malam ini (daftar lengkap di MEMORI "Perlu dicek pemilik"):

- Keamanan api-t2 (butir 5.3).
- Status Idempotency-Key (butir 5.4).
- Lab Tahap 2: argon2id, 401 generik, kursor (butir 5.5, 5.6, 5.9).
- Butir lama yang masih terbuka: secret Cloudflare (preview dari HP), deploy di PROPOSAL, dashboard web, M8 "91/100", ADR 7 RLS, runner CI 26.04, macet renderer Chromium.

## 8. Tangkapan

Di `tmp/laporan-pagi/` (tidak di-commit), dari build main `5eb96ee`:

- `1-erd-1.12-hp-gelap.png`: ERD statis Tahap 1 di blok Paham 1.12, 375 px gelap. Kelima tabel, kunci ditulis sebagai teks, dan garis FK ke `akun` terbaca.
- `2-erd-bertumbuh-bandingkan-desktop-terang.png`: `/uji/erd/` mode bandingkan, 1366 px terang. `akun` ditandai berubah (kolom login baru, `saldo` dihapus), tabel Tahap 2 yang baru berwarna. Di sidebar, Tahap 2 masih bernama versi lama ("Saldo salah dan dobel bayar"), karena `tahap[1]` sengaja tidak diubah.
- `3-erd-bertumbuh-hp-gelap.png`: widget yang sama di HP.
- `4-sidebar-tahap-2-desktop-gelap.png`: halaman 2.11 versi lama dengan sidebar Tahap 2.

Dua tangkapan pertama sudah saya lihat sendiri. Dalam 3 detik terjawab di mana pembaca berada (judul figure), apa yang dibaca dulu (`akun`, lalu perubahannya), dan ke mana selanjutnya (Bandingkan, atau ketuk tabel untuk detail).

## 9. Usulan perbaikan baru

Tiga butir 2026-10-14 di `plan/USULAN-PERBAIKAN.md`:

- `tunggu_pr.sh` dan `gabung_urut.sh` dipindah ke `tools/`, ditambah pemeriksaan `mergeable` dan perlakuan untuk GitHub 502.
- Pin image `postgres:17`.
- Pola tunggu lock tanpa ambang waktu di b3-race.

Selesai untuk malam ini.
