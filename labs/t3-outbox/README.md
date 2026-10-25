# Lab t3-outbox · outbox, klaim per baris, retry, dan queue promo

Lab Tahap 3 untuk masalah M19, M20, dan M27 serta ADR 23, 24, 25, dan 32 (`plan/CERITA-TAHAP-3.md` bagian 3 dan 4, keputusan 960 sampai 962). Lab ini berjalan di atas `labs/api-t3`: server Go, skema, data awal (10.000 karyawan, 60 warung), worker, dan layanan push tiruan dipakai dari `labs/api-t3/dasar_t3.py`, bukan salinan. Yang ditambah di sini hanya skenario dan rekamannya, di schema sendiri (`tahap3_outbox`). Layanan push selalu tiruan lokal; tidak ada panggilan ke luar mesin ini.

## Menjalankan

```bash
make lab-up                                   # dari akar repo: PostgreSQL 17 lab di LAB_DB_PORT
make -C labs/t3-outbox run                    # semua bagian, ±95 detik, menulis labs/t3-outbox/output/*.txt
make -C labs/t3-outbox run BAGIAN=kursor      # satu bagian: transaksi kursor klaim ganda retry queue listen
make -C labs/t3-outbox cek                    # rekam ulang; gagal bila output/ berbeda dari yang di-commit
```

Lajur kerja lain memakai `COMPOSE_PROJECT_NAME`, `LAB_DB_PORT`, dan `LAB_PORT_OFFSET` (`labs/README.md`). Port dasar: API 18180 dan layanan push tiruan 18181, sama dengan `api-t3`, jadi dua lab itu tidak boleh jalan bersamaan di lajur yang sama (lab berhenti dengan `GAGAL: port ... sudah dipakai`). Rekaman selalu memakai port dasar.

Setiap bagian membuat ulang schema `tahap3_outbox` dan data awalnya dari nol, jadi rekaman tidak bergantung pada urutan bagian. Token, waktu, tanggal, dan `notifikasi_id` disamarkan, dan nomor proses tidak ditulis. Lab gagal keras bila port dipakai proses lain atau hasilnya meleset dari yang diharapkan. Dua kali rekam menghasilkan file yang identik per byte.

## Rekaman

| Rekaman | Isi | Halaman |
|---|---|---|
| `transaksi.txt` | Jurnal dan baris outbox satu transaction: COMMIT menyimpan keduanya, ROLLBACK, saldo kurang, dan COMMIT yang ditolak database membuang keduanya; worker tidak melihat baris sebelum COMMIT; satu pemberitahuan per jurnal per penerima; proses API mati sesudah COMMIT; INSERT outbox yang gagal di kode API membatalkan pembayaran (G) | 3.9 |
| `kursor.txt` | M19: dua transfer ke penerima yang sama antre di baris buku penerima; kursor `(dibuat, id)` aman bila tiba berurutan; tanpa penghambat buatan urutan `dibuat` dan nomor outbox bisa terbalik (D); baris tertinggal bila putaran poller jatuh di antara dua COMMIT (B); klaim menemukannya | 3.10 |
| `klaim.txt` | tanpa klausa kunci, `FOR UPDATE`, dan `FOR UPDATE SKIP LOCKED`; tiga worker serentak atas 60 baris tanpa ganda dan tanpa yang terlewat; urutan antar pesan tidak dijaga; worker sungguhan melewati baris yang dikunci sesi lain (D) | 3.11 |
| `ganda.txt` | M20: worker mati di antara kirim dan tandai terkirim, klaim 5 detik, pengiriman ulang dengan `notifikasi_id` sama; klaim yang terlalu pendek; penyaring di penerima | 3.12, 3.13 |
| `retry.txt` | Backoff dengan jitter, lima percobaan lalu dead-letter, baris yang mematikan worker, putar ulang dead-letter | 3.13 |
| `queue.txt` | M27: kapasitas worker, 10.000 promo di depan notifikasi uang tanpa kelas lawan dengan kelas, banjir promo, laju promo | 3.26 |
| `listen.txt` | `LISTEN`/`NOTIFY` sebagai pembangun worker, nasib listener yang putus, retensi 7 hari | 3.9, 3.11, 3.27 |

## Angka: yang direkam dan yang dihitung

Angka yang bergantung pada kecepatan mesin tidak ditulis sebagai angka tunggal. Lab memeriksa batasnya dan gagal bila meleset; rekaman memuat batas itu.

| Angka | Asal | Label |
|---|---|---|
| Kapasitas worker c = 4, t = 0,3 detik: antara 12 dan 13,33 per detik | Diukur dari 80 baris (`queue.txt` A); batas atas c ÷ t = 13,33 | Rekaman lab |
| 10.000 promo ÷ 13,33 = 750 detik; 95% dalam 30 detik butuh 9.500 ÷ 30 = ±317 per detik | Dihitung dari c ÷ t; tidak dijalankan 12,5 menit | Asumsi |
| Dalam 30 detik terkirim 3,4% sampai 4,2% dari 10.000 (naskah: 400 = 4%, dari 13,33 × 30) | Satu worker tanpa kelas, 30 detik sungguhan (`queue.txt` C) | Rekaman lab |
| Notifikasi uang di belakang 10.000 promo menunggu lebih dari 30 detik tanpa kelas; dengan kelas dikirim pertama | `queue.txt` C dan D | Rekaman lab |
| Notifikasi uang yang tiba di tengah banjir promo: terkirim dalam kurang dari 1,5 detik | `queue.txt` E | Rekaman lab |
| Laju promo antara 4 dan 5,6 per detik; 10.000 ÷ 5 = 2.000 detik; sisa kapasitas 8,33 per detik | Terukur 8 detik (`queue.txt` F); sisanya dihitung | Rekaman lab dan Asumsi |
| Batas 5 percobaan. Worker yang mati: dihitung saat klaim, lima pengiriman, klaim ke-6 masuk dead-letter tanpa kirim. Push yang menjawab 503: dead-letter pada kegagalan ke-5, juga sesudah lima pengiriman | `retry.txt` C dan A | Rekaman lab |
| Selang dari start worker pertama sampai worker kedua selesai mengirim: sedikit di atas klaim 5 detik (batas 4,9 sampai 7,0 detik) | `ganda.txt` A; naskah menulis "enam detik" | Rekaman lab; "enam detik" Ilustrasi |
| Penjadwalan promo 5 per detik ditulis lab sebagai `UPDATE`, bukan kode api-t3 | `queue.txt` F; `UmumkanPromo` menulis semua baris sekaligus | Rekaman lab |

## Temuan yang perlu diketahui halaman

1. `SKIP LOCKED` tidak membuat klaim lebih benar. Yang mencegah baris dikirim dua kali adalah klausa kunci `FOR UPDATE` bersama syarat `klaim_sampai`. Tanpa klausa kunci sama sekali, dua sesi memilih baris yang sama (`klaim.txt` A) dan tiga worker mengklaim 104 baris untuk 60 (mutasi). Dengan `FOR UPDATE` saja, sesi kedua menunggu sampai klaim pertama COMMIT. Syarat klaim lalu diperiksa ulang di READ COMMITTED (PostgreSQL 17 §13.2.1, R3-60). Ia mendapat baris berikutnya, bukan nol baris (`klaim.txt` A). `SKIP LOCKED` hanya mengganti menunggu dengan melewati: worker tidak berhenti di baris yang dikunci sesi lain (`klaim.txt` A dan D). Itu penting selama kunci dipegang lama. Klaim di sini satu pernyataan, jadi menunggunya pendek; lab tidak mengukur seberapa pendek. Ongkosnya menurut dokumentasi adalah tampilan data yang tidak konsisten: sesi ketiga di A mendapat 0 baris walau queue belum kosong (R3-03, R3-60). Lab gagal bila klausa kunci, `SKIP LOCKED`, lama klaim, jitter, atau kelas berubah (tabel mutasi di bawah).
2. Klaim 5 detik hanya muat satu perangkat yang menggantung. Worker mengirim ke perangkat satu per satu, tiap panggilan berbatas 3 detik. Penerima dengan dua perangkat yang menggantung butuh 6 detik, dan worker kedua mengklaim baris itu di detik ke-5 (`ganda.txt` D). Klaim harus lebih panjang dari jumlah perangkat × batas waktu push, atau pengiriman ke perangkat dibuat serentak.
3. `GET /lab/outbox` di api-t3 melaporkan umur tertua dari semua kelas. Saat promo menumpuk, angkanya lebih dari 30 detik walau umur tertua kelas uang 0 (`queue.txt` E). Alert untuk syarat Sinta dan Pak Hadi harus dihitung per kelas.
4. Laju promo 5 per detik (ADR 32) belum ada di kode api-t3. Lab menjadwalkannya dengan `UPDATE outbox SET coba_lagi = now() + n / 5 detik`; `UmumkanPromo` masih menulis semua baris dengan `coba_lagi = now()`.
5. Pesan `NOTIFY` yang dikirim selagi listener putus tidak pernah sampai ke listener baru. Barisnya tetap di tabel dan worker yang polling mengirimnya (`listen.txt` B). Dokumentasi PostgreSQL 17.11 menyebut bahwa hanya sesi yang sedang mendengar yang diberi tahu, dan registrasi hilang saat sesi berakhir. Nasib notifikasi yang dikirim selagi listener putus tidak ditulis tegas (R3-61). `NOTIFY` hanya membangunkan; sumbernya tetap tabel.
6. Dua transfer ke penerima yang sama antre di baris buku penerima. Dalam rekaman, yang tiba lebih dulu selesai lebih dulu, jadi kursor `(dibuat, id)` aman (`kursor.txt` A). Dokumentasi PostgreSQL tidak menjanjikan urutan itu (arbitrase lock baris ada di lock manager, `README.tuplock`), jadi ia hasil rekaman. Tanpa penghambat buatan, urutan `dibuat` (awal transaction) dan nomor outbox (urutan INSERT sesudah lock buku penerima) bisa terbalik. Dua transfer yang dilepas bersamaan terbalik pada sebagian pasangan (`kursor.txt` D; pengukuran peninjau, tidak direkam, bergantung mesin: 7 dari 15 pasang). Baris benar-benar tertinggal bila putaran poller jatuh di antara dua COMMIT. B memanjangkan celah itu dengan permintaan lain dari pengirim yang masih memegang bukunya, supaya terekam. Jadi pemicu M19 di naskah ("hampir bersamaan", transaction yang menunggu lock buku) tercapai tanpa pemicu buatan. Kehilangan per kejadian jarang (dugaan, tidak diukur: peluangnya selisih dua COMMIT dibanding selang poller).
7. Nomor outbox bukan nomor tanpa celah: baris yang di-ROLLBACK memakai nomornya (`listen.txt` A, nomor 2 hilang).

## Uji mutasi

Satu hal diubah di `labs/api-t3` (satu baris di `run.py`), bagian yang bersangkutan dijalankan, bagian itu harus gagal, lalu perubahan dikembalikan lewat git. Hasil 2026-10-25, pelaksana dan tinjauan PR 342:

| Perubahan | Bagian | Hasil |
|---|---|---|
| `Backoff` mengembalikan batas tanpa jitter | `retry` | Gagal: sebaran `coba_lagi` 0,005 detik, harus lebih dari 0,5 |
| Klaim bawaan 5 detik jadi 2 detik | `ganda` | Gagal: selang dua pengiriman 2,2 detik, harus sedikit di atas 5 |
| `KlaimOutbox` tanpa `ORDER BY kelas` | `queue` | Gagal: urutan kirim bukan uang, top-up, promo |
| Semua klausa kunci dihapus dari `KlaimOutbox` (tanpa `FOR UPDATE`) | `klaim` | Gagal: tiga worker mengklaim 104 baris untuk 60 baris (ganda) |
| `FOR UPDATE SKIP LOCKED` jadi `FOR UPDATE` di `KlaimOutbox` | `klaim` D | Gagal: worker belum selesai dalam 10 detik (menunggu baris yang dikunci sesi tangan). Sebelum bagian D ada, mutasi ini lolos: A memakai SQL tangan, bukan kode worker, dan rekaman lain identik per byte (temuan 1) |
| `n.Percobaan > MaksPercobaan` tidak pernah benar (batas klaim ke-5 hilang) | `retry` C | Gagal: klaim ke-6 mengirim, bukan dead-letter (diklaim 1, mati 0, terkirim 1) |
| Klaim tidak menahan baris (`klaim_sampai` = sekarang) | `ganda`, `klaim` | Gagal: worker baru mengklaim baris yang seharusnya masih dipegang; 104 klaim untuk 60 baris. `retry` tetap lolos |
| `INSERT` outbox dijalankan sesudah COMMIT, bukan di transaction jurnal | `transaksi` G | Gagal: jurnal, posting, dan saldo berubah walau INSERT outbox ditolak. Sebelum bagian G ada, mutasi ini lolos: B sampai D memakai sesi tangan |
| Laju promo dijadwalkan 8 per detik (`run.py`) | `queue` F | Gagal: laju 7,76 per detik, harus antara 4 dan 5,6 |
| Klaim mengabaikan `coba_lagi` | `queue` F | Gagal: 12,72 promo per detik, jadwal 5 per detik tidak dihormati |
| `Backoff` tidak berlipat dua (`batas *= 1`) | `retry` | Lolos di lab: tiap putaran hanya diperiksa batas atasnya. Gagal di tes Go `TestBackoffBatas` api-t3 (`go test ./internal/worker`), bukan di lab ini |

## Tidak dijalankan

Opsi ADR 23 yang tidak ada di lab ini, supaya halaman tidak menulis angkanya:

- Kirim sesudah COMMIT di proses API tanpa outbox. Yang direkam hanya sisi outbox (`transaksi.txt` F: API mati sesudah COMMIT, baris tetap ada).
- Queue di Redis (BullMQ, Streams) dan log-based CDC (Debezium dengan Kafka): dari dokumentasi (R3-02, R3-22), bukan dijalankan.
- Pembanding di stack lain: Laravel (`after_commit`), Django (`on_commit`), BullMQ, dan future call Serverpod hanya dari dokumentasi (R3-22).
- Top-up CSV 10.000 akun (kelas 1): yang direkam tiga akun lewat CSV dan banjir 10.000 promo (kelas 2); hitungannya sama karena antreannya sama.
- Penyaring `notifikasi_id` di app Dart: `ganda.txt` C memakai penyaring lima baris di `run.py`.
- OpenTelemetry dan alert sungguhan: `t3-pool`.
