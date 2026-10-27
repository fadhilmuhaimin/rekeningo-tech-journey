# Lab api-t4 · api-t3 naik ke publik

Lab utama Tahap 4 (`plan/CERITA-TAHAP-4.md`, bagian 3 dan 3b; tugas `lab-api-t4`). Kodenya berangkat dari `labs/api-t3`: monolith Go yang sama, tiga lapisan (`internal/handler`, `internal/service`, `internal/repo`), satu PostgreSQL. Semua yang ada di api-t3 tetap ada dan tetap dites (outbox, worker, katalog, promo, sinkron offline, sesi dasbor, batas login, cache katalog, mode rentan Tahap 3); README api-t3 menjelaskannya.

Yang baru: top-up dari rekening bank lewat gateway tiruan dan webhook-nya, verifikasi identitas lewat layanan tiruan, tingkat akun dan batas saldo, merchant luar dan QR, kartu virtual dan penerbit tiruan, back office tim risk dengan audit log berantai hash, impor katalog dengan unduh gambar, dan batas laju untuk endpoint publik baru. Skema lab ini adalah sumber ERD Tahap 4. Lab Tahap 4 berikutnya (`t4-webhook`, `t4-integrasi`, `t4-modul`, `t4-storage`, `t4-infra`, `t4-qr`, `t4-ssrf`, `t4-kartu`, `t4-audit`, `t4-pipeline`) memakai server dan data yang sama lewat `dasar_t4.py`, bukan salinan.

Semua pihak ketiga (gateway pembayaran, layanan verifikasi, penerbit kartu, layanan push) adalah proses tiruan lokal di komputer lab; tidak ada layanan, data, atau kredensial nyata. Lab ini bukan uji kapasitas produksi dan tidak mengklaim kepatuhan atau izin apa pun.

## Menjalankan

```bash
make lab-up                                   # dari akar repo: PostgreSQL 17 lab di LAB_DB_PORT dan Redis di LAB_REDIS_PORT
make -C labs/api-t4 run                       # semua bagian, ±2 menit, menulis labs/api-t4/output/*.txt
make -C labs/api-t4 run BAGIAN=topup          # satu bagian: skema topup verifikasi batas rentan fitur beban testing
make -C labs/api-t4 beban                     # hanya beban berjadwal dan kapasitas worker
make -C labs/api-t4 cek                       # rekam ulang; gagal bila output/ berbeda dari yang di-commit
make -C labs/api-t4 kontrak                   # lint dan oasdiff terhadap api-t3 (butuh jaringan dan Docker)
make -C labs/api-t4 test                      # go vet dan go test tanpa rekaman (TEST_DATABASE_URL ke schema tahap4_tes)
```

Lajur kerja lain memakai `COMPOSE_PROJECT_NAME`, `LAB_DB_PORT`, `LAB_REDIS_PORT`, dan `LAB_PORT_OFFSET` (`labs/README.md`). Port dasar (ditambah `LAB_PORT_OFFSET`): API 18280, layanan push tiruan 18281, instance kedua 18282 (dicadangkan lab turunan), gateway pembayaran tiruan 18283, layanan verifikasi tiruan 18284, penerbit kartu tiruan 18285. Rekaman selalu memakai port dasar. Direktori penyimpanan objek tiruan ada di folder sementara sistem (`api-t4-objek-<port database>`).

Setiap bagian membuat ulang schema `tahap4` dan data awalnya dari nol, jadi `output/*.txt` tidak bergantung pada urutan bagian. Token, waktu, tanggal, `notifikasi_id`, nomor order, dan nomor tujuan bayar disamarkan, sehingga rekaman ulang identik per byte; angka yang bergantung mesin (waktu, jumlah koneksi) hanya direkam sebagai batas yang diperiksa. Lab gagal keras bila port dipakai proses lain atau hasilnya meleset dari yang diharapkan.

## Versi dasar (dicek 2026-10-27)

| Komponen | Versi | Sumber dan catatan |
|---|---|---|
| PostgreSQL | 17.11 (kontainer `postgres:17`, dicetak di kepala setiap rekaman) | tetap 17: pilihan Tahap 1 sampai 3; PostgreSQL 18 belum dipakai |
| Go | toolchain lokal go1.27.1 (dicetak di kepala rekaman); `go.mod` memakai `go 1.27.1` | `go.dev/dl` menulis go1.27.3 sebagai rilis terbaru; lab belum memakainya |
| pgx | v5.11.0 | `proxy.golang.org/github.com/jackc/pgx/v5/@latest` = v5.11.0 |
| go-redis | v9.23.0 | `@latest` = v9.23.0; dipakai hanya oleh `internal/redisbatas` dan cache katalog warisan api-t3 |
| golang.org/x/crypto | v0.57.0 (bcrypt) | `@latest` = v0.58.0; belum dinaikkan |
| Redis (tes warisan api-t3) | 8.10.2 (kontainer `redis:8-alpine` yang sedang berjalan) | tag 8.10.3 ada di Docker Hub; pin Tahap 3 tidak diubah |

Dependency baru di lab ini: tidak ada (semua paket Go yang dipakai sudah ada di `go.mod` api-t3). Versi alat Tahap 4 yang lain (SeaweedFS, OpenBao, OpenTofu, oasdiff, syft, grype, cosign, gobreaker) dipakai lab turunan, bukan lab ini.

## Rekaman

| Rekaman | Isi | Halaman |
|---|---|---|
| `skema.txt` | Migrasi 000020 sampai 000023 di atas akhir Tahap 3: 22 tabel, kolom lawan blok mermaid naskah 3b, data awal publik, aturan yang ditolak database, hak role aplikasi | 4.5 |
| `topup.txt` | Top-up dari bank: alur normal, kiriman ganda dan balasan hilang, dua kiriman bersamaan, tanda tangan dan timestamp, kabar mundur, gateway mati dan timeout, job cek status, batas tingkat sesudah lock, rekonsiliasi | 4.3, 4.6 |
| `verifikasi.txt` | Pengajuan verifikasi, pekerjaan outbox bertujuan verifikasi, tingkat akun naik, timeout dan retry berkunci, vendor mati sampai dead-letter | 4.3, 4.10 |
| `batas.txt` | Batas laju endpoint baru dan yang belum punya: daftar, top-up bank, perangkat, pesanan, sinkron, promo | 4.3, 4.26 |
| `rentan.txt` | Mode rentan `webhook-v1` dan `webhook-cek-tulis` (M29) | 4.6 |
| `fitur.txt` | QR, kartu virtual, back office, audit berantai, dan impor katalog sebagai role aplikasi `api_t4` (asap; bukti mendalam di tes Go dan lab turunan) | 4.18 sampai 4.25 |
| `beban.txt` | Beban berjadwal 138,9 request per detik, koneksi lawan pool, kapasitas worker | 4.27, 4.28 |
| `testing.txt` | `go vet`, tes Go dengan dan tanpa PostgreSQL, `TES_DB_WAJIB`, dua tes sebagai role aplikasi | 4.26 |
| `kontrak.txt` | Lint OpenAPI v4 dan perubahan yang merusak client dibanding api-t3 (`make kontrak`) | 4.26 |

## Yang berubah dari api-t3

- **Migrasi** `migrasi/000020` sampai `000023` di atas `api-t3/migrasi/000019`. `000020`: `akun.tingkat` (belum, terverifikasi) dan `akun.status` (aktif, dibekukan), jenis akun `pemakai`, `merchant`, `risk`, jenis buku `pemakai`, `merchant`, `bank`, `dana_tertahan`, `settlement_kartu`, jenis jurnal `topup_bank`, `kartu_tahan`, `kartu_tangkap`, `outbox.tujuan` (push, verifikasi), `produk.gambar_url`. `000021`: `topup_bank`, `webhook_event`, `insiden_rekon`. `000022`: `verifikasi`, `qr`. `000023`: `kartu`, `otorisasi_kartu`, `audit_log`. Jumlahnya 22 tabel (14 + 8). Satu schema untuk semuanya: pembagian enam schema per modul (naskah 3b) adalah rancangan yang dibuktikan `t4-modul`.
- **Jalur uang** tetap satu-satunya tempat uang bergerak (ledger, ADR 6 revisi) dan tidak memanggil jaringan di dalam transaction (ADR 22): gateway, layanan verifikasi, dan penerbit dipanggil sebelum atau sesudah transaction, dengan timeout 3 detik dari satu fungsi pembuat client (`internal/klien`). Versi satu proses (minggu 3 naskah): pembayaran memanggil ledger sebagai fungsi; pemisahan service dan Idempotency-Key lewat API ada di `t4-modul`.
- **Idempotency-Key ke ledger** memakai tabel `kunci_idempotensi` yang sudah ada, diklaim di dalam transaction jurnal (`Tx.KunciLedger`): `order_id` untuk top-up bank dan `id_penerbit` untuk otorisasi kartu, berumur 24 jam.
- **Outbox dengan lajur** (`outbox.tujuan`): pekerjaan verifikasi memakai mekanisme klaim yang sama dengan notifikasi (`FOR UPDATE SKIP LOCKED` dan `klaim_sampai`, ADR 24), kelas 1 (di belakang notifikasi uang, di depan promo). Flag worker `-tujuan push|verifikasi` membatasi lajur yang diklaim, supaya satu proses per lajur bisa dijalankan (dasar breaker per lajur di `t4-integrasi`).
- **Batas laju endpoint baru** (`internal/service/batas_endpoint.go`, token bucket di memori satu proses, Asumsi lab): `/daftar` 5 per jam per alamat; `/topup-bank` 10 per jam per akun dan 30 per jam per alamat; `/verifikasi` 3 per jam per akun dan 10 per jam per alamat; `/perangkat` 10 per jam, `/pesanan` 20 per menit, `/sinkron` 30 per menit, `/promo` 5 per jam per akun. Batas QR, kartu, back office, dan impor katalog ada di bagian masing-masing. Dua yang disebut README api-t3 sebagai belum ada kini ada: `/perangkat`, `/pesanan`, `/promo`, `/sinkron`.
- **Endpoint baru** (kontrak di `openapi.yaml`, dijaga `internal/handler/kontrak_test.go` agar sama dengan rute di kode): `POST /daftar`, `POST /topup-bank`, `GET /topup-bank/{id}`, `POST /webhooks/pembayaran`, `POST /verifikasi`, `GET /verifikasi/{id}`; `/qr`, `/kartu`, `/penerbit/*`, `/bo/*`, dan `POST /merchant/katalog/impor` di bagian masing-masing. `GET /warung` (sejak Tahap 1) baru masuk kontrak di sini: penjaga rute menemukannya hilang.
- **Perilaku yang berubah** pada endpoint lama: `POST /kiriman` hanya untuk akun `terverifikasi` (403 `/problems/butuh-verifikasi`) dan pengirim boleh `pemakai` selain `karyawan`; penerima tetap karyawan lewat nomor karyawan. Akun `dibekukan` tidak bisa membayar, mengirim, atau top-up (403 `/problems/akun-dibekukan`). `GET /akun/{id}` menambah `tingkat` dan `status`. Saldo semua jenis buku milik akun tidak boleh negatif (trigger `saldo_karyawan_tidak_negatif` berlaku juga untuk `pemakai` dan `merchant`).

## Top-up dari bank (PRD v4 P0, M29, M30, ADR 34, ADR 35)

Kabar dari gateway adalah klaim, bukan fakta: dicatat satu kali, dipercaya sesudah dicek.

- `POST /topup-bank` menulis baris `topup_bank` (`menunggu`), memanggil gateway di luar transaction (timeout 3 detik, `Idempotency-Key` = `order_id`), dan menjawab dengan tujuan bayar. Timeout menghasilkan status `tidak_pasti` (202, order mungkin sudah ada), penolakan atau gateway tidak terjangkau menghasilkan `gagal` (502). Batas saldo menurut tingkat (Rp1.000.000 belum terverifikasi, Rp10.000.000 terverifikasi, Asumsi produk) diperiksa dua kali: saat membuat top-up (tanpa lock) dan saat kredit, sesudah buku dikunci. Yang kedua yang menentukan; top-up yang melewati batas sesudah lock diparkir dan tampil sebagai `tidak_di_ledger` di rekonsiliasi (PRD v4 belum menjawab pengembalian dana; Asumsi: tim risk memutuskan).
- `POST /webhooks/pembayaran` (versi benar, ADR 34): tanda tangan HMAC-SHA256 atas `"<timestamp>.<byte mentah body>"` diperiksa sebelum JSON diurai (header `X-Gateway-Timestamp` dan `X-Gateway-Signature`), toleransi waktu 5 menit (bawaan satu gateway nyata, Asumsi untuk tiruan), rahasia kedua diterima selama masa tumpang tindih rotasi. Lalu satu transaction: `INSERT INTO webhook_event ... ON CONFLICT DO NOTHING` (kunci utama `event_id`; nol baris berarti ganda), baris top-up dikunci, status hanya maju, kredit saldo lewat jurnal `topup_bank` (lawan: buku `bank`) dengan Idempotency-Key `order_id` di ledger, dan satu baris outbox. Balasan 2xx hanya sesudah COMMIT. Kabar yang tidak maju diparkir dan status top-up tidak berubah; top-up yang masih menunggu (mis. diparkir karena batas saldo) sesudahnya ditanyakan ke gateway di luar transaction, top-up yang sudah berstatus akhir tidak.
- **Tiga lapis menahan jurnal kedua** untuk satu kejadian: (1) kunci utama `event_id` (event yang sama), (2) status `topup_bank` yang hanya maju (event berbeda untuk kejadian yang sama), (3) Idempotency-Key `order_id` di ledger (24 jam). Flag lab `-lab-tanpa-lapis status,kunci` mematikan lapis 2 dan 3 supaya lapis lain bisa direkam atau dites sendirian; lapis 1 tidak bisa dimatikan. `TestWebhookLapisanPenahanJurnalKedua` menjalankan delapan kombinasi, termasuk key yang sudah habis (jam service diputar 25 jam): sesudah 24 jam hanya status yang menahan.
- `-cek-topup` (job): top-up `menunggu` atau `tidak_pasti` lebih dari `-cek-umur` (30 menit, Asumsi) ditanyakan ke gateway dan diterapkan lewat fungsi yang sama dengan webhook, jadi dua jalur kabar tidak bisa menjurnal dua kali. `-rekon <tanggal>` (job): laporan settlement gateway lawan jurnal per `order_id`; tiga jenis selisih (`tidak_di_ledger`, `tidak_di_gateway`, `jumlah_beda`) menjadi baris `insiden_rekon`, `(tanggal, order_id, jenis)` unik sehingga job aman dijalankan dua kali. Job tidak mengoreksi apa pun; koreksi lewat jurnal normal oleh job idempoten (ADR 19) adalah job `-koreksi-rekon` (kode di lab ini, aturan dan rekamannya di `t4-webhook`).
- **Gateway tiruan** (`cmd/tiruan -peran gateway`): `POST /orders` (satu objek per `Idempotency-Key`), `GET /orders/{id}`, `GET /settlement?tanggal=`, dan perintah lab `POST /lab/mode` (`mati`, `lambat`, `menggantung`, `setelah-buat-menggantung`), `POST /lab/bayar`, `POST /lab/webhook` (kiriman berulang, serentak, tanpa tanda tangan, rahasia lain, timestamp bergeser, body diubah, JSON ditulis ulang, dan `putus_balasan`: koneksi ditutup begitu byte pertama balasan tiba, sebelum dibaca). Untuk lab `t4-webhook` ditambah `POST /lab/jadwal` (jadwal ulangan gateway pada waktu maya: jeda 2, 10, 30, 90, 210 menit, jumlah ulangan menurut kode status), `POST /lab/rahasia` (rotasi rahasia penanda tangan), `GET /lab/dicek` (berapa kali Rekeningo menanyakan keadaan tiap order), dan di `POST /lab/webhook` pilihan `body_cantik` dan `url_target`.

## Verifikasi identitas (PRD v4 P0, M31, M33, ADR 36, ADR 38)

`POST /verifikasi` menerima dua file (JPEG atau PNG, tipe dari byte, paling besar 1 MiB; Asumsi lab), menyimpannya di penyimpanan objek tiruan (direktori lokal, kunci acak dari server), dan menulis satu baris `verifikasi` (kunci objek dan checksum SHA-256, tidak ada isi file) serta satu baris `outbox` bertujuan `verifikasi` di satu transaction. Worker memanggil layanan verifikasi tiruan dengan Idempotency-Key = id pengajuan: `lulus` menaikkan `akun.tingkat` di transaction yang sama dengan penutupan pengajuan; timeout menandai `tidak_pasti` (bukan gagal) dan pekerjaan diulang dengan key yang sama; lima percobaan tanpa hasil (aturan ADR 25 berlaku apa adanya) berakhir di dead-letter dan pengajuan berstatus `gagal` (M31: pendaftar tidak bersalah). Lajur yang dijeda dan breaker per vendor (ADR 36) ada di `t4-integrasi`. Pengajuan merchant tidak memakai vendor: tim risk memutuskannya di back office. Penyimpanan objek sungguhan, presigned URL, dan retensi 30 hari yang dijalankan job: `t4-storage`; kolom `hapus_pada` sudah terisi saat pengajuan selesai.

Layanan verifikasi tiruan (`cmd/tiruan -peran verifikasi`): `POST /verifikasi` (satu objek per key), `GET /lab/diterima`, `POST /lab/mode` (`mati`, `lambat`, `menggantung`, `setengah`: jawaban terpotong, `ditolak`).

## QR merchant luar (M35, ADR 40)

Merchant luar Lestari menerima pembayaran lewat QR. Merchant yang sudah diverifikasi (`akun.tingkat = terverifikasi`, `akun.status = aktif`) menerbitkan QR statis atau dinamis. Pembeli memindai QR, melihat nama merchant dari tabel `akun` di layar konfirmasi, lalu membayar dari saldo. Pembayaran QR adalah jurnal `bayar` biasa: dua posting yang seimbang dan satu baris `outbox` untuk merchant, semuanya di transaction yang sama. Tidak ada panggilan jaringan di dalam transaction (ADR 22).

| Endpoint | Siapa | Hasil |
|---|---|---|
| `POST /qr` | merchant terverifikasi dan aktif | 201 `{id, jenis, nominal, berlaku_sampai}`; 403 untuk akun lain, merchant dibekukan, atau merchant belum terverifikasi; 422 untuk jenis atau nominal yang salah; 429 batas laju |
| `GET /qr/{id}` | siapa pun yang login | 200 `{id, jenis, nominal, berlaku_sampai, merchant: {nama, kota}, terverifikasi}`; 404 satu bentuk untuk QR yang tidak ada, tidak aktif, kedaluwarsa, atau milik merchant yang dibekukan atau belum terverifikasi |
| `POST /qr/{id}/bayar` | karyawan atau user, tingkat apa pun | 201 `{id, saldo, nominal, merchant}` dengan `Location: /transfers/{jurnal}`; 409 QR dinamis sudah dibayar; 410 QR dinamis kedaluwarsa; 403 akun dibekukan atau jenis akun salah; 422 nominal atau saldo; `Idempotency-Key` opsional seperti `/transfers` |
| `POST /qr/{id}/laporkan` | siapa pun yang login | 202; merchant pemilik QR dibekukan dan satu baris audit log berantai ditulis di transaction yang sama |

### Aturan

- **QR dinamis** terikat ke satu nominal (paling banyak Rp5.000.000, Asumsi lab) dan berlaku 5 menit sejak terbit (Asumsi, ADR 40). Dibayar sekali: baris QR dikunci (`FOR UPDATE`) sebelum buku pembayar dan merchant, status dan masa berlaku dibaca sesudah lock, lalu `UPDATE ... WHERE status = 'aktif'` menandainya terpakai di transaction yang sama dengan jurnal. Pembayaran yang kalah balapan dibatalkan seluruhnya. Body pembayaran boleh kosong; bila nominal dikirim, nilainya harus sama dengan nominal QR (422 bila beda). QR yang lewat masa berlaku dijawab 410 dan ditandai `kedaluwarsa`; penandaan itu di-COMMIT walau pembayarannya ditolak.
- **QR statis** tidak punya nominal dan masa berlaku, dan dibayar berkali-kali. Pembeli wajib mengirim nominal, paling banyak Rp200.000 per pembayaran (Asumsi produk, ADR 40).
- **Tingkat pembeli** tidak dibatasi: akun yang belum terverifikasi boleh membayar QR (PRD v4). Akun `dibekukan` ditolak 403; merchant dan warung tidak membayar QR (403).
- **Konfirmasi** membaca nama merchant dari tabel `akun`, bukan dari isi QR. Itu satu-satunya hal yang bisa dilakukan server terhadap stiker QR yang diganti: stiker QR statis milik merchant sah lain yang ditempel di atas stiker toko menghasilkan jurnal yang sah ke merchant pemilik QR itu, dan server tidak punya dasar untuk menolaknya (`TestBayarQRMilikMerchantLain`). Pembeli yang membandingkan nama di layar dengan papan toko adalah pengaman terakhir (Asumsi: perilaku pembeli tidak diukur di lab).
- **Laporan QR palsu** membekukan merchant lebih dulu, tim risk memeriksa kemudian (ADR 40). Satu laporan dari satu akun sudah cukup. Itu celah penyalahgunaan terhadap merchant yang sah (Asumsi desain ADR 40: kerugian satu pembayaran palsu dinilai lebih mahal daripada pembekuan sementara); lab ini tidak menutupnya. Peran di baris audit adalah jenis akun pelapor.
- **Batas laju** per akun (Asumsi lab, token bucket di memori satu proses): `qr` 10 QR, isi ulang 10 per menit; `qr-bayar` 20 pembayaran, isi ulang 20 per menit; `qr-lapor` 3 laporan, isi ulang 3 per jam. Setiap percobaan mengambil satu token, termasuk yang gagal validasi.

Urutan lock di semua jalur pembayaran QR sama: baris `qr`, lalu `buku` menurut id (ADR 13). Sepuluh pembeli yang membayar satu QR statis bersamaan antre di baris QR dan semuanya berhasil tanpa deadlock (`TestBayarQRStatisSerentak`).

### Yang belum ada di lab ini

- **Payload QR**: isi QR di lab ini hanya `id` (uuid). Payload TLV dengan CRC-16 di tag 63, tag 01 untuk statis atau dinamis, dan bukti bahwa CRC dihitung ulang untuk payload lain tetap lolos ada di lab `t4-qr`.
- **Pembatalan QR**: status `dibatalkan` ada di skema, tetapi tidak ada endpoint merchant yang menulisnya. QR dinamis yang tidak dibayar berhenti sendiri karena masa berlaku.
- **Pembersihan**: baris QR kedaluwarsa tidak dihapus dan tidak ada job yang menandai QR yang tidak pernah dibuka lagi; status `kedaluwarsa` hanya ditulis saat ada pembayaran yang ditolak. `GET /qr/{id}` menjawab 404 untuk QR yang lewat masa berlakunya tanpa menulis apa pun.
- **Persetujuan merchant** (verifikasi oleh tim risk sampai `tingkat = terverifikasi`) ada di endpoint back office, bukan di bagian ini. Merchant hasil seed (`30001` sampai `30020`) sudah terverifikasi; `30021` belum.
- **Batas saldo merchant** tidak diterapkan (batas Rp1.000.000 dan Rp10.000.000 menurut tingkat berlaku untuk top-up, bukan untuk penerimaan QR); pencairan merchant ke rekening bank memakai file seperti Tahap 2 dan tidak dikerjakan di sini.
- **Kota merchant** ditampilkan di konfirmasi hanya bila `akun.kota_id` terisi; merchant hasil seed tidak punya kota. Naskah menulis "nama dan kota"; lab menampilkan kota bila ada.
- **Penyalahgunaan laporan**: satu laporan cukup membekukan merchant, tanpa ambang jumlah pelapor dan tanpa pemulihan otomatis (lihat Aturan).
- **Perbedaan jawaban**: 410 dan 409 pada pembayaran membedakan QR yang pernah ada dari yang tidak ada, sedangkan konfirmasi menjawab 404 untuk semuanya. Id QR adalah uuid acak (`gen_random_uuid`), jadi menebaknya tidak praktis; perbedaan itu dibiarkan demi pesan yang jelas bagi pembeli.
- **Lintas instance**: batas laju QR di memori satu proses (ADR 20); penghitung bersama lintas instance (ADR 27) belum diterapkan pada endpoint ini.

## Kartu virtual dan penerbit tiruan

Naskah M37 dan ADR 42. Penerbit kartu memanggil Rekeningo untuk meminta persetujuan (otorisasi), menagih (clearing), dan membatalkan (reversal). Persetujuan tidak bisa ditarik kembali, jadi dana ditahan sebelum jawaban setuju: hold adalah jurnal di ledger dari buku pemilik ke buku sistem `dana_tertahan`. Penerbit di lab adalah proses tiruan lokal `cmd/penerbit`; tidak ada nomor kartu penuh di mana pun, hanya token dari penerbit dan empat digit terakhir (Asumsi desain, naskah 3b).

| Endpoint | Siapa | Hasil |
|---|---|---|
| `POST /kartu` | pemilik (login; akun `terverifikasi`, tidak dibekukan) | 201 kartu; 403 belum terverifikasi atau dibekukan; 429; 502 penerbit tidak tersedia, tanpa baris |
| `GET /kartu` | pemilik | 200 daftar kartu sendiri |
| `POST /kartu/{id}/bekukan`, `/buka` | pemilik | 200; 404 bila kartu milik orang lain; 409 bila kartu `ditutup`; akun yang dibekukan tim risk tidak bisa membuka |
| `POST /penerbit/otorisasi` | penerbit (`X-Penerbit-Kunci`) | 200 `{keputusan: setuju\|tolak, alasan?}`; 401 kunci salah; 409 `id_penerbit` dipakai untuk otorisasi lain; 422 |
| `POST /penerbit/clearing` | penerbit | 200 `ditangkap`; 404; 409 status atau saldo; 422 jumlah berbeda |
| `POST /penerbit/reversal` | penerbit | 200 `dibalik`; diulang tetap 200; 404; 409 bila sudah ditagih |

Aturan:

- **Hold sebelum setuju.** Otorisasi membuka satu transaction dengan `lock_timeout` (1 detik, flag `-kartu-lock-timeout`), mengunci buku pemilik (`ORDER BY id FOR UPDATE`, ADR 13), memeriksa saldo dan batas harian kartu sesudah lock, lalu menulis jurnal `kartu_tahan` (pemilik ke `dana_tertahan`) dan baris `otorisasi_kartu` berstatus `ditahan` dengan `jurnal_tahan_id` dan `tahan_sampai` 7 hari (Asumsi). Tidak ada panggilan jaringan di dalam transaction (ADR 22).
- **Idempotency-Key ke ledger = `id_penerbit`.** Key diklaim di `kunci_idempotensi` di transaction yang sama dengan jurnal dan berumur 24 jam. Ulangan dengan `id_penerbit` yang sama dijawab dari baris otorisasi tanpa jurnal kedua; baris itu permanen (`UNIQUE id_penerbit`), jadi sesudah key habis hanya baris yang menahan hold kedua. Bila jurnal dan key ada tetapi barisnya belum tertulis (proses mati di antaranya, ADR 37), ulangan menulis baris yang menunjuk jurnal tahan semula. Di lab satu proses kedua langkah itu satu transaction; kasus mati di antaranya diuji dengan menghapus barisnya dari luar.
- **Lock tidak didapat dalam `lock_timeout`** (SQLSTATE 55P03): jawaban `tolak` dengan alasan `sibuk`, tetap 200, supaya sampai sebelum tenggat penerbit. Hasilnya aman tetapi menolak pemilik yang sah; angka p95 jawaban terhadap tenggat 2 detik diukur lab `t4-kartu`, bukan di sini.
- **Alasan penolakan** satu kata: `kartu-tidak-dikenal` (tanpa baris, karena `kartu_id` wajib ada), `kartu-dibekukan` (kartu atau akun), `batas-harian`, `saldo-kurang`, `sibuk`, `kill-switch`. Penolakan yang tercatat dijawab `ditolak-sebelumnya` bila diulang; skema tidak menyimpan alasannya.
- **Clearing** memindahkan dana dari `dana_tertahan` ke `settlement_kartu` tanpa menyentuh saldo pemilik. Jumlah harus sama dengan otorisasi. Diulang tetap 200 dengan jurnal yang sama.
- **Reversal dan job kedaluwarsa** membalik jurnal tahan dengan jurnal pembalik (cermin, alasan lebih dari 20 karakter). Baris otorisasi dikunci dan statusnya harus `ditahan`; `membalik_jurnal_id` UNIQUE menjadi lapis kedua. Dua job bersamaan melepas sekali. Urutan lock di seluruh jalur kartu sama: buku pemilik lebih dulu, buku sistem (`dana_tertahan`, `settlement_kartu`) sesudahnya; reversal dan job kedaluwarsa dulu mengunci menurut id buku, dan karena `dana_tertahan` berid lebih kecil daripada buku pemilik di lab, mereka memegang `dana_tertahan` lalu menunggu buku pemilik yang dipegang otorisasi: deadlock (`TestReversalMengunciBukuPemilikSebelumDanaTertahan`).
- **Kill switch:** `Dep.KartuAktif` (`atomic.Bool`) mematikan otorisasi baru tanpa deploy dan tanpa menyentuh database. Endpoint yang membalik nilainya adalah `POST /bo/flag/kartu` di bagian back office.
- **Rentan `-rentan kartu-tanpa-hold` (M37):** handler versi pertama. Saldo dibaca tanpa lock, lalu otorisasi disetujui dan dicatat `ditahan` tanpa jurnal; batas harian tidak diperiksa. `-lab-jeda-cek-tulis` melebarkan celah di antara cek dan tulis (Asumsi lab: celah alami hanya mikrodetik, tidak diukur). Clearing otorisasi tanpa hold mengambil dari saldo pemilik; bila saldo sudah tidak cukup, database menolak saat COMMIT (`saldo_karyawan_tidak_negatif`) dan jawabannya 409 `saldo-kurang`, sedangkan persetujuan sudah diberikan.

Di lab satu proses, "service pembayaran memanggil API ledger" (ADR 37) adalah panggilan fungsi di dalam transaction yang sama. Pemisahan service, dan akibatnya bagi ADR 42, dibuktikan lab `t4-modul`.

### Penerbit tiruan (`cmd/penerbit`)

Port dasar 18285 (`portLab`). Flag: `-addr`, `-api` (alamat Rekeningo), `-kunci` (nilai `X-Penerbit-Kunci`; data lab, bukan secret), `-tenggat` (bawaan 2 detik, mengikuti naskah M37), `-bila-timeout setuju|tolak` (bawaan `setuju`). `POST /kartu` menurunkan token dan empat digit dari `Idempotency-Key`, jadi key yang sama menghasilkan kartu yang sama. `POST /lab/otorisasi` meneruskan ke `/penerbit/otorisasi` dengan tenggat itu; bila jawaban terlambat atau gagal, penerbit memutuskan sendiri menurut aturan timeout dan membalas `{keputusan, sumber: "rekeningo"|"timeout"}`. `POST /lab/clearing` dan `/lab/reversal` meneruskan apa adanya. `POST /lab/aturan` `{bila_timeout, tenggat_ms}` mengganti aturan tanpa memulai ulang. Bawaan "setuju bila timeout" mengikuti naskah M37 (rujukan penerbit nyata ada di riset; [perlu verifikasi] ke dokumentasi penerbit saat halaman 4.22 dan 4.23 ditulis).

### Yang belum ada di lab ini

- p95 jawaban otorisasi terhadap tenggat 2 detik, dan jawaban saat buku terkunci oleh otorisasi lain yang beruntun: `t4-kartu`.
- Baris buku `dana_tertahan` dipakai semua hold, jadi menjadi titik panas lain selain buku pemilik (naskah ADR 42 hanya menyebut buku pemilik). Pada 0,116 otorisasi per detik puncak (Asumsi naskah) belum terukur sebagai masalah.
- Penerbit yang timeout saat menerbitkan kartu meninggalkan kartu yatim di sisi penerbit; token-nya tidak pernah kita simpan, jadi tidak ada yang menagihnya.
- Satu kartu per permintaan tanpa batas jumlah kartu per akun; hanya batas laju (3 kartu, isi ulang 3 per jam, Asumsi lab).
- Kartu `ditutup` belum punya endpoint yang menulisnya.
- Clearing sebagian (jumlah lebih kecil dari hold) dan kartu multi-mata uang: tidak ada; jumlah berbeda ditolak 422.
- Kasus penerbit yang menolak tetapi jaringan kartu menyetujui (dokumentasi satu penerbit): Tidak dijalankan.

## Back office tim risk, audit log berantai, dan impor katalog (M36, M38, ADR 41, ADR 43)

Peran di back office adalah `akun.jenis`: hanya `risk` (Ratih 420 dan Tim Risk Dua 421 di data awal). Akun risk yang dibekukan tidak bisa memakai back office, dan akun `risk` dan `admin` tidak bisa menjadi sasaran bekukan, buka, atau ubah batas. Setiap aksi berisiko menulis satu baris audit log berantai di transaction yang sama dengan aksinya (`Service.Audit`): aksi yang dibatalkan tidak meninggalkan catatan, dan aksi yang berhasil tidak kehilangan catatannya.

| Endpoint | Hasil |
|---|---|
| `GET /bo/akun/{id}` | 200 ringkasan akun (tanpa data identitas); audit `lihat_akun` |
| `POST /bo/akun/{id}/bekukan` `{alasan}` | 204; akun `dibekukan`; audit `bekukan` |
| `POST /bo/akun/{id}/buka` `{alasan}` + `X-Penyetuju-Token` | 204; butuh staf risk kedua; audit `buka_blokir` dengan `penyetuju_id` |
| `POST /bo/akun/{id}/batas-harian` `{nilai, alasan}` + `X-Penyetuju-Token` | 204; paling banyak Rp5.000.000 (Asumsi lab); audit |
| `GET /bo/verifikasi/{id}` | 200 metadata pengajuan (status, checksum; tanpa isi file) |
| `GET /bo/verifikasi/{id}/berkas/{kartu\|swafoto}?alasan=...` | 200 isi file (`application/octet-stream`, `nosniff`, `no-store`) sesudah checksum cocok; alasan wajib; audit `buka_berkas` |
| `POST /bo/merchant/{id}/setujui` dan `/tolak` `{alasan}` | 204; `{id}` adalah nomor akun merchant; setuju menaikkan tingkat; 409 bila sudah diputuskan |
| `POST /bo/flag/kartu` `{aktif, alasan}` | 200; kill switch otorisasi kartu tanpa deploy (`Dep.KartuAktif`); audit |
| `GET /bo/audit/verifikasi` | 200 `{baris, utuh, hash_terakhir, rusak_di_id?}`: rantai dihitung ulang dari baris pertama |
| `POST /merchant/katalog/impor` `{produk: [{nama, harga, stok, gambar_url?}]}` | 200 hasil per baris (`pratinjau` dan `galat`); produk ditulis dalam satu transaction dan di-COMMIT sebelum unduhan pertama |

Aturan:

- **Alasan tertulis** wajib untuk semua aksi berisiko: 20 sampai 300 karakter, tanpa karakter kontrol (ADR 43). **Dua staf**: ubah batas dan buka blokir butuh token sesi app staf risk kedua di header `X-Penyetuju-Token`; satu jawaban 403 `butuh-persetujuan` untuk semua sebab (tanpa token, token salah, penyetuju sama dengan pelaku, penyetuju bukan risk), supaya penanya tidak diberi petunjuk bagian mana yang salah. Pembekuan darurat tidak butuh penyetuju. Persetujuan di sini terjadi pada saat permintaan; tidak ada antrean persetujuan, karena skema (naskah 3b) tidak punya tabel untuk itu.
- **Rantai hash** (`internal/repo/audit.go`): `hash = SHA-256(hash_sebelumnya, 0x1e, isi baris)`, isi baris = waktu (mikrodetik, UTC), pelaku, peran, aksi, objek, alasan, penyetuju, dipisah 0x1f. Penulis serentak diserialkan dengan `pg_advisory_xact_lock`, jadi rantai tidak bercabang. Role aplikasi hanya punya `SELECT` dan `INSERT` pada `audit_log`; pemilik schema tetap bisa mengubahnya, dan itulah yang terdeteksi: mengubah atau menghapus baris di tengah memutus rantai di baris itu atau sesudahnya (`fitur.txt` bagian E; `internal/repo/audit_test.go`). Menghapus ekor rantai tidak terdeteksi tanpa jangkar di luar database: `hash_terakhir` dari `GET /bo/audit/verifikasi` adalah jangkar yang harus disimpan di tempat lain, dan itu ada di `t4-audit`.
- **Mode rentan `bo-tanpa-audit` (M38):** semua aksi yang sama berjalan, tanpa catatan. Jawaban "tidak ada catatan" sama nilainya dengan "tidak tahu".
- **Impor katalog dan unduh gambar** (`internal/unduh`): dua versi di server yang sama. Versi aman (bawaan): hanya `https`, alamat tujuan diperiksa saat dial (`net.Dialer.ControlContext`: loopback, private, link-local, ULA IPv6, dan bentuk IPv4-mapped ditolak), redirect tidak diikuti, 2 MiB dan 3 detik, tipe isi dari byte, pesan galat generik tanpa isi respons. Flag lab `-unduh-izinkan-http` membuka skema `http` supaya tiruan lokal tanpa TLS bisa dipakai; alamat loopback tetap ditolak (`fitur.txt` bagian F). Versi rentan (`-rentan unduh-rentan`, M36): deny-list string pada URL, semua redirect diikuti, alamat hasil resolusi tidak diperiksa, dan pesan galat memuat awal isi respons. Gambar tidak disimpan: pemanggil hanya menerima tipe dan ukuran.
- **Batas laju** (Asumsi lab): `bo` 120 aksi per staf, isi ulang 2 per detik; `impor-katalog` 10 impor per jam per akun.

Selisih dengan naskah: peran `cs`, `keuangan`, dan `admin-sistem` (ADR 43) belum ada karena `akun.jenis` naskah 3b hanya menambah `risk`; jangkar harian hash di luar database dan akses langsung ke database lewat role baca per modul dengan sesi tercatat adalah pekerjaan `t4-audit` dan `t4-modul`. Agen AI baca-saja (MCP) tidak ada di lab ini.

Uji mutasi bagian ini: dijalankan oleh pelaksana tugas lab ini (tabel di bagian "Uji mutasi lab ini" di bawah); tes Go bagian back office, audit, dan unduh ada di `internal/service/bo_test.go`, `bo_impor_test.go`, `internal/handler/handler_bo_test.go`, `internal/repo/audit_test.go`, dan `internal/unduh/unduh_test.go`.

## Mode rentan

Seperti `api-t1`: satu flag `-rentan` menyalakan versi yang salah untuk rekaman halaman masalah. Tanpa flag, server berperilaku benar. Mode Tahap 3 (`push-dalam-tx`, `kursor`, `urut-waktu`, `ekspor-panic`, `tanpa-shutdown`, `stok-timpa`) tetap ada dan dijelaskan README api-t3.

| Mode | Masalah | Efek |
|---|---|---|
| `webhook-v1` | M29 | Handler paling pendek: tanpa tanda tangan, tanpa tabel event, tanpa status bersyarat, jumlah dari isi kabar, tanpa batas tingkat, `jurnal_id` tidak diisi (`rentan.txt` bagian A) |
| `webhook-cek-tulis` | M29 | Tanda tangan diperiksa, duplikat dicegah dengan cek status lalu tulis tanpa kunci; `-lab-jeda-cek-tulis` melebarkan celah (`rentan.txt` bagian B) |
| `kartu-tanpa-hold` | M37 | Otorisasi memeriksa saldo tanpa lock lalu menyetujui tanpa menahan dana (bagian kartu) |
| `unduh-rentan` | M36 | Impor katalog mengunduh URL tanpa pemeriksaan alamat tujuan (bagian back office) |
| `bo-tanpa-audit` | M38 | Back office versi pertama: semua aksi berjalan, tidak ada catatan audit (bagian back office) |

Flag Tahap 4: `-gateway-url`, `-gateway-timeout`, `-verifikasi-url`, `-verifikasi-timeout`, `-penerbit-url`, `-penerbit-kunci`, `-kartu-lock-timeout`, `-objek-dir`, `-rahasia-webhook` (dipisah koma; kosong = semua webhook ditolak), `-lab-jeda-cek-tulis`, `-lab-tanpa-lapis`, `-unduh-izinkan-http` (lab saja), job `-cek-topup` (`-cek-umur`), `-rekon <tanggal>`, `-koreksi-rekon` (tutup insiden rekonsiliasi lewat jurnal normal; dibuktikan `t4-webhook`), `-kedaluwarsa-hold`, dan flag worker `-tujuan`. Flag Tahap 3 tetap (`-pool`, `-jam-lab`, `-redis`, `-katalog-cache`, dan seterusnya).

## Beban dan kapasitas worker (M39)

`make beban` (`cmd/beban`) menjalankan beban berjadwal kedatangan tetap (open loop): permintaan ke-i berangkat pada mulai + i ÷ 138,9 detik, tidak menunggu jawaban sebelumnya; 138,9 = 20.000 aktif × 60 request ÷ 86.400 × 10 (naskah bagian 3, Asumsi). Campuran 50% baca saldo, 25% riwayat 20 baris, 15% katalog, 10% pembayaran (benih tetap, jadi campuran sama di setiap run), 200 karyawan, 20 detik, 2.778 permintaan. Sesi dibuat langsung di tabel (batas login 10 per menit per alamat membuat 200 login tidak mungkin). Generator menyampel `pg_stat_activity` tiap 100 ms untuk koneksi milik `api-t4`. Yang diperiksa dan direkam adalah batas: semua permintaan selesai tanpa error, p95 di bawah 500 ms (batas lab, Asumsi), jadwal tidak tertinggal lebih dari 100 ms, koneksi paling banyak 10 (pool). Batas koneksi itu dipasang pool sendiri (`SetMaxOpenConns`), jadi ia tidak bisa gagal dan bukan bukti pool tidak sesak; buktinya tiga batas lain, karena pool yang penuh membuat permintaan antre dan memecahkan p95 atau jadwal. Nilai mentah dicetak ke stderr dan tidak direkam; satu run di laptop pengembangan (2026-10-27): p50 1,8 ms, p95 14 ms, p99 36 ms, koneksi paling banyak 10 dan paling banyak 3 yang aktif menjalankan query. Itu bukan kapasitas produksi, dan kata "tidak sesak" di naskah berarti L kecil terhadap pool di laptop lab (dua run peninjau memberi koneksi aktif paling banyak 1 dan 5 dari pool 10).

Kapasitas worker: push tiruan menjawab 300 ms, 100 pemberitahuan dikuras satu worker dengan c = 4; laju terukur harus dalam 15% dari c ÷ t = 4 ÷ 0,3 = 13,3 per detik. Pengumuman ke 100.000 HP (100.000 ÷ 13,3 = 7.500 detik = 125 menit) adalah hitungan dari laju itu dan Tidak dijalankan: lab tidak menulis 100.000 baris outbox. Catatan kejujuran: satu run `make run` pernah gagal di bagian `testing` saat uji mutasi berjalan di CPU yang sama; diulang tanpa perubahan kode dan lolos, dan tes yang goyah tidak ditelusuri. Jalankan `make cek` di mesin yang tidak sedang memikul pekerjaan lain.

## Data awal

`./api-t4 -seed` mengisi schema kosong sebagai pemilik schema, tanpa lewat service. Isinya data Tahap 3 (enam kota, 10.000 karyawan, 60 warung, satu admin, satu `hr` per kota, 2.400 produk, tunjangan Rp250.000 per karyawan) dengan seluruh akun Lestari ditandai `terverifikasi` (lewat HR, PRD v4), ditambah:

- dua akun `risk`: Ratih 420 dan Tim Risk Dua 421 (dua orang untuk persetujuan dua staf);
- 21 merchant luar: Toko Sumber Rejeki (Bu Marni) 30001, Toko Andalan 30002, `Merchant 3` sampai `Merchant 20`, dan 30021 yang belum terverifikasi; email `merchant<n>@merchant.example`;
- 200 user umum: Dina 40001 (belum terverifikasi, saldo Rp900.000, dekat batas Rp1.000.000), Eko 40002 (terverifikasi), 40003 sampai 40100 belum terverifikasi, 40101 sampai 40200 terverifikasi; saldo awal Rp500.000 dari buku `bank`; email `pemakai<n>@publik.example`.

Jumlahnya jauh di bawah naskah (±400 merchant, 100.000 user terdaftar): lab memerlukan akun untuk beban dan aturan, bukan populasi. Total 10.291 akun, 10.288 buku (7 buku sistem), 10.200 jurnal awal. Tokoh dan nomor akun Tahap 2 sama (Dimas 417, Warung Ani 418, Budi 419, Warung Sari 502, Warung Mie Pak Joko 503, Citra 504). Password semua akun adalah `sementara-tahap-4` (data lab, bukan secret). Rahasia webhook `rahasia-gateway-lab-1` dan kunci penerbit `kunci-penerbit-lab` juga data lab.

## Dipakai lab lain

`dasar_t4.py` menyediakan `buat_schema(nama)`, `seed()`, `bangun()`, `mulai_api(args)`, `mulai_push()`, `mulai_gateway()`, `mulai_verifikasi()`, `mulai_penerbit()`, `mulai_worker(nama, args)`, `worker(args)`, `tiruan_mode(port, mode, ms)`, `tiruan_reset(port)`, `curl(...)`, `login(...)`, `push_mode(...)`, `push_diterima()`, `tunggu(kondisi, apa)`, `samarkan(...)`, dan konstanta port. Lab Tahap 4 lain menulis `sys.path.insert(0, ".../api-t4"); import dasar_t4 as d`, lalu menambah bagian rekamannya di atas server ini. Mode rentan baru ditambah di `cmd/api/main.go` dan `internal/service`; sebelum mengubah api-t4, cek flag terhadap PR terbuka lain dan jalankan ulang `make -C labs/api-t4 cek` (peninjau menjalankannya lagi). Schema tes tambahan untuk pekerjaan paralel: `LAB_TES_SCHEMA`.

## Uji mutasi lab ini

Satu perubahan per mutan pada kode uang dan keamanan milik lab ini, lalu `go test` paket terkait dengan PostgreSQL sungguhan (`tmp/mutasi_t4.py` pada salinan terpisah dengan schema tes sendiri; skrip sementara, tidak di repo). Kode dipulihkan sesudah tiap mutan. Hasil: 57 dari 59 mutan tertangkap karena SEBAB yang diuji; yang lolos dijelaskan di bawah tabel. Mutan pertama yang lolos di putaran awal (kunci utama `event_id` sendirian, batas ukuran body webhook) membuat tes diperkuat: kasus `-lab-tanpa-lapis status,kunci` dengan event yang sama, dan body sah yang lebih besar dari batas.

| Mutan | Bagian | Perilaku yang diubah | Tes yang menangkap | Hasil |
|---|---|---|---|---|
| A1 | Audit berantai (`internal/repo/audit.go`) | hash tidak memuat hash sebelumnya | `TestHashAuditCocokDenganRumusTertulis`, `TestAuditBerantaiUtuhDanBerurutan` | tertangkap |
| A2 | Audit berantai (`internal/repo/audit.go`) | penulis audit serentak tanpa lock | `TestAuditBerantaiUtuhDanBerurutan`, `TestAuditPenulisSerentakTidakMemutusRantai` | tertangkap |
| B1 | Batas laju | batas laju per akun mati | `TestBuatTopupBankAturan`, `TestBuatQRAturan` | tertangkap |
| B2 | Batas laju | kapasitas perangkat 11 | `TestBatasEndpointPerAkunDanPerAlamat` | tertangkap |
| B3 | Batas laju | batas per alamat /daftar hilang | `TestDaftarBatasPerAlamatDanJenisAdmin` | tertangkap |
| D1 | Pendaftaran | password tersimpan polos | `TestDaftarAturan` | tertangkap |
| D2 | Pendaftaran | password minimal 14 | `TestDaftarAturan` | tertangkap |
| D3 | Pendaftaran | email tidak dijadikan huruf kecil | `TestDaftarAturan` | tertangkap |
| D4 | Pendaftaran | admin boleh mendaftar sendiri | `TestDaftarAturan` | tertangkap |
| H1 | Handler | tanda tangan salah dijawab 200 | `TestWebhookEndpointTandaTangan` | tertangkap |
| H2 | Handler | timeout dijawab 201 | `TestTopupBankEndpoint` | tertangkap |
| H3 | Handler | body webhook tak dibatasi | `TestHTTPBOMerchantKillSwitchDanRantaiAudit`, `TestWebhookEndpointTandaTangan` | tertangkap |
| K1 | Tingkat dan status akun pada transfer dan pembayaran | transfer tanpa tingkat terverifikasi | `TestKirimButuhTingkatTerverifikasiDanAkunAktif` | tertangkap |
| K2 | Tingkat dan status akun pada transfer dan pembayaran | akun dibekukan boleh kirim | `TestKirimButuhTingkatTerverifikasiDanAkunAktif` | tertangkap |
| K3 | Tingkat dan status akun pada transfer dan pembayaran | akun dibekukan boleh bayar | `TestKirimButuhTingkatTerverifikasiDanAkunAktif` | tertangkap |
| O1 | Back office (`internal/service/bo.go`) | penyetuju boleh sama dengan pelaku | `TestBOBekukanLalubukaButuhPenyetujuSah`, `TestBOUbahBatasHarianButuhPenyetujuDanNilaiWajar` | tertangkap |
| O2 | Back office (`internal/service/bo.go`) | penyetuju bukan staf risk | `TestBOBekukanLalubukaButuhPenyetujuSah` | tertangkap |
| O3 | Back office (`internal/service/bo.go`) | pelaku bukan risk boleh memakai back office | `TestBOHanyaAkunRisk` | tertangkap |
| O4 | Back office (`internal/service/bo.go`) | checksum file tidak diperiksa | `TestBOBukaBerkasMenulisAuditSebelumIsiDanMenolakChecksumSalah` | tertangkap |
| O5 | Back office (`internal/service/bo.go`) | batas harian tanpa plafon | `TestBOUbahBatasHarianButuhPenyetujuDanNilaiWajar` | tertangkap |
| O6 | Back office (`internal/service/bo.go`) | alasan minimal 1 karakter | `TestBOBekukanLalubukaButuhPenyetujuSah`, `TestBOBukaBerkasMenulisAuditSebelumIsiDanMenolakChecksumSalah` | tertangkap |
| T1 | Kunci ledger | key kedaluwarsa tidak dibuang | `TestOtorisasiMenahanDana`, `TestOtorisasiSerentakVersiBenar` | tertangkap |
| U1 | Unduh gambar (`internal/unduh`) | IPv4-mapped lolos | `TestAlamatDilarangPerKelas` | tertangkap |
| U2 | Unduh gambar (`internal/unduh`) | redirect diikuti | `TestAmanRedirectTidakDiikuti` | tertangkap |
| U3 | Unduh gambar (`internal/unduh`) | ukuran unduhan tak dibatasi | - | setara perilaku |
| V1 | Verifikasi identitas dan worker | tipe isi file tidak diperiksa | `TestAjukanVerifikasiAturan` | tertangkap |
| V2 | Verifikasi identitas dan worker | ukuran file tidak dibatasi | `TestBuatTopupBankTidakMenahanLockSelamaGatewayMenunggu`, `TestAjukanVerifikasiAturan` | tertangkap |
| V3 | Verifikasi identitas dan worker | akun terverifikasi mengajukan lagi | `TestAjukanVerifikasiAturan` | tertangkap |
| V4 | Verifikasi identitas dan worker | file yatim | `TestAjukanVerifikasiSatuTransactionDanChecksum` | tertangkap |
| V5 | Verifikasi identitas dan worker | merchant ikut vendor | `TestAjukanVerifikasiMerchantTanpaVendor` | tertangkap |
| V6 | Verifikasi identitas dan worker | karyawan boleh mengajukan | `TestAjukanVerifikasiAturan` | tertangkap |
| V7 | Verifikasi identitas dan worker | hasil akhir verifikasi bisa ditimpa | `TestSelesaikanVerifikasiHanyaSekaliDanTingkat` | tertangkap |
| V8 | Verifikasi identitas dan worker | lulus tidak menaikkan tingkat | `TestVerifikasiLulusMenaikkanTingkat`, `TestVerifikasiTimeoutTidakPastiLaluPulih` | tertangkap |
| V9 | Verifikasi identitas dan worker | lajur tujuan diabaikan | `TestVerifikasiLulusMenaikkanTingkat`, `TestVerifikasiDitolakTidakMenaikkanTingkat` | tertangkap |
| V10 | Verifikasi identitas dan worker | dead-letter tidak menandai gagal | `TestVerifikasiVendorMatiLimaPercobaanLaluGagal` | tertangkap |
| V11 | Verifikasi identitas dan worker | timeout ditandai gagal | `TestVerifikasiTimeoutTidakPastiLaluPulih` | tertangkap |
| V12 | Verifikasi identitas dan worker | pekerjaan menimpa verifikasi yang sudah selesai | `TestVerifikasiYangSudahSelesaiDilewati` | tertangkap |
| V13 | Verifikasi identitas dan worker | key ke vendor bukan id pengajuan | `TestVerifikasiLulusMenaikkanTingkat` | tertangkap |
| W1 | Top-up bank dan webhook (`internal/service/pembayaran.go`, `internal/repo/pembayaran.go`) | kunci utama event_id tidak ditahan | `TestWebhookLapisanPenahanJurnalKedua` | tertangkap |
| W2 | Top-up bank dan webhook (`internal/service/pembayaran.go`, `internal/repo/pembayaran.go`) | event berbeda untuk kejadian yang sama tidak ganda | `TestWebhookDuaEventSatuKejadianSatuJurnal`, `TestWebhookSerentakEventSamaDanEventBeda` | tertangkap |
| W3 | Top-up bank dan webhook (`internal/service/pembayaran.go`, `internal/repo/pembayaran.go`) | status akhir bisa berubah lagi | `TestWebhookStatusHanyaMaju` | tertangkap |
| W4 | Top-up bank dan webhook (`internal/service/pembayaran.go`, `internal/repo/pembayaran.go`) | jumlah di kabar dipercaya | `TestWebhookJumlahBedaOrderTakDikenalDanPalsu` | tertangkap |
| W5 | Top-up bank dan webhook (`internal/service/pembayaran.go`, `internal/repo/pembayaran.go`) | batas tingkat tidak dijaga sesudah lock | `TestWebhookBatasSaldoTingkatSesudahLock` | tertangkap |
| W6 | Top-up bank dan webhook (`internal/service/pembayaran.go`, `internal/repo/pembayaran.go`) | akun dibekukan tetap dikredit | `TestWebhookAkunDibekukanDiparkir` | tertangkap |
| W7 | Top-up bank dan webhook (`internal/service/pembayaran.go`, `internal/repo/pembayaran.go`) | tanda posting dibalik | `TestWebhookSatuKaliLaluUlang`, `TestWebhookDuaEventSatuKejadianSatuJurnal` | tertangkap |
| W8 | Top-up bank dan webhook (`internal/service/pembayaran.go`, `internal/repo/pembayaran.go`) | Idempotency-Key ke ledger tidak diklaim | `TestWebhookLapisanPenahanJurnalKedua` | tertangkap |
| W9 | Top-up bank dan webhook (`internal/service/pembayaran.go`, `internal/repo/pembayaran.go`) | UPDATE status tanpa syarat | - | setara perilaku |
| W10 | Top-up bank dan webhook (`internal/service/pembayaran.go`, `internal/repo/pembayaran.go`) | timestamp tidak diperiksa | `TestTandaTanganAtasByteMentah` | tertangkap |
| W11 | Top-up bank dan webhook (`internal/service/pembayaran.go`, `internal/repo/pembayaran.go`) | tanda tangan tidak mencakup body | `TestTandaTanganAtasByteMentah` | tertangkap |
| W12 | Top-up bank dan webhook (`internal/service/pembayaran.go`, `internal/repo/pembayaran.go`) | perbandingan tanda tangan hanya panjang | `TestTandaTanganAtasByteMentah`, `TestWebhookJumlahBedaOrderTakDikenalDanPalsu` | tertangkap |
| W13 | Top-up bank dan webhook (`internal/service/pembayaran.go`, `internal/repo/pembayaran.go`) | rahasia lama tidak diterima (tumpang tindih) | `TestTandaTanganAtasByteMentah` | tertangkap |
| W14 | Top-up bank dan webhook (`internal/service/pembayaran.go`, `internal/repo/pembayaran.go`) | timeout ditandai gagal | `TestBuatTopupBankGatewayTiruan` | tertangkap |
| W15 | Top-up bank dan webhook (`internal/service/pembayaran.go`, `internal/repo/pembayaran.go`) | cek awal batas tingkat hilang | `TestBuatTopupBankAturan` | tertangkap |
| W16 | Top-up bank dan webhook (`internal/service/pembayaran.go`, `internal/repo/pembayaran.go`) | status mundur dari dibayar | `TestWebhookStatusHanyaMaju` | tertangkap |
| W17 | Top-up bank dan webhook (`internal/service/pembayaran.go`, `internal/repo/pembayaran.go`) | tanda selisih rekon | `TestRekonHarianTigaJenisSelisih` | tertangkap |
| W18 | Top-up bank dan webhook (`internal/service/pembayaran.go`, `internal/repo/pembayaran.go`) | insiden ganda pada rekon kedua | `TestRekonHarianTigaJenisSelisih` | tertangkap |
| W19 | Top-up bank dan webhook (`internal/service/pembayaran.go`, `internal/repo/pembayaran.go`) | order tak dikenal gateway tidak jadi gagal | `TestCekTopupMenerapkanStatusGateway` | tertangkap |
| W20 | Top-up bank dan webhook (`internal/service/pembayaran.go`, `internal/repo/pembayaran.go`) | top-up milik orang lain terbaca | `TestTopupBankEndpoint` | tertangkap |
| W21 | Top-up bank dan webhook (`internal/service/pembayaran.go`, `internal/repo/pembayaran.go`) | tanda tangan tidak diperiksa di versi benar | `TestWebhookJumlahBedaOrderTakDikenalDanPalsu` | tertangkap |

- **U3**: setara perilaku pada hasil: `LimitReader` dengan batas + 1 melindungi memori (membaca paling banyak satu byte lebih dari batas); pemeriksaan ukuran sesudah membaca tetap menolak isi yang terlalu besar, jadi mutan hanya membuat server membaca lebih banyak sebelum menolak.
- **W9**: setara perilaku: baris top-up sudah dikunci `FOR UPDATE` dan statusnya sudah diperiksa di `terapkanStatus`, jadi syarat status pada UPDATE adalah lapis cadangan yang tidak mengubah hasil.
- Mutan bagian QR dan kartu (dijalankan pelaksana bagian itu) ada di tabel sub-bagian di bawah; mutan unduh dan back office yang dijalankan pelaksana bagian itu tidak sampai tertulis (sesi terhenti), jadi mutan O, A, dan U di atas dijalankan ulang oleh pelaksana lab ini.

### Uji mutasi bagian QR
Satu perubahan per mutan pada `internal/service/qr.go`, `internal/repo/qr.go`, atau `internal/handler/handler_qr.go`, lalu `go test -run QR ./internal/service/ ./internal/handler/` dengan PostgreSQL sungguhan. Kode dipulihkan sesudah tiap mutan. Hasil: 30 dari 31 mutan tertangkap; satu mutan setara perilaku (M27).

| Mutan | Tes yang menangkap | Gagal karena |
|---|---|---|
| M1 hapus `FOR UPDATE` di `KunciQR` | `TestBayarQRMenungguLockQRLaluMelihatStatusBaru` | pembayaran tidak berhenti di pernyataan SELECT yang menunggu lock baris QR |
| M2 hapus syarat `status = 'aktif'` di UPDATE | `TestTandaiQRTerpakaiHanyaSekali` | penanda kedua mengembalikan true dan menimpa jurnal pertama |
| M2b hapus `FOR UPDATE` dan syarat status (kedua pengaman) | `TestBayarQRDinamisSerentak`, `TestBayarQRMenungguLockQRLaluMelihatStatusBaru` | dua pembayaran serentak ke QR dinamis yang sama sama-sama berhasil |
| M3 hapus cabang status `terpakai` | `TestBayarQRDinamisSekaliPakai`, `TestBayarQRDinamisSerentak`, `TestHandlerQRAlurDinamis` | pembayaran kedua mendapat 404, bukan 409 |
| M4 hapus cek `berlaku_sampai` | `TestBayarQRKedaluwarsa`, `TestHandlerQRKedaluwarsaDanKesalahan` | QR kedaluwarsa masih bisa dibayar |
| M5 balik tanda posting | `TestBayarQRDinamisSekaliPakai`, `TestBayarQRStatisBerkaliDenganBatas` dan dua lain | database menolak saldo merchant negatif saat COMMIT |
| M6a hapus cek tingkat di `BuatQR` | `TestQRMerchantBelumSahTidakBisaMenerimaQR` | merchant belum terverifikasi bisa menerbitkan QR |
| M6b, M6c `merchantAktif` tanpa cek tingkat, atau tanpa cek status | `TestQRMerchantBelumSahTidakBisaMenerimaQR`, `TestLaporkanQRMembekukanMerchantDanMenulisAudit` | QR merchant belum sah atau dibekukan masih tampil dan bisa dibayar |
| M6d hapus cek jenis akun di `BuatQR` | `TestQRMerchantBelumSahTidakBisaMenerimaQR`, `TestHandlerQRKedaluwarsaDanKesalahan` | user bisa menerbitkan QR |
| M7 hapus cek saldo | `TestBayarQRSaldoKurangDanAkunDibekukan`, `TestHandlerQRKedaluwarsaDanKesalahan` | jawabannya error database (saldo negatif saat COMMIT), bukan `ErrSaldoKurang` |
| M8 hapus cek nominal terikat | `TestBayarQRNominalTerikat` | nominal lain dari body diterima |
| M9 hapus batas Rp200.000 | `TestBayarQRStatisBerkaliDenganBatas`, `TestHandlerQRKedaluwarsaDanKesalahan` | pembayaran Rp200.001 lolos |
| M10 hapus cek akun pembayar dibekukan | `TestBayarQRSaldoKurangDanAkunDibekukan` | akun dibekukan bisa membayar |
| M10b hapus cek jenis pembayar | `TestBayarQRSaldoKurangDanAkunDibekukan` | warung bisa membayar QR |
| M11 laporan tidak menulis audit | `TestLaporkanQRMembekukanMerchantDanMenulisAudit` | jumlah baris audit tidak bertambah |
| M12 laporan tidak membekukan | `TestLaporkanQRMembekukanMerchantDanMenulisAudit`, `TestHandlerQRLaporkan` | status merchant tetap aktif |
| M13 penandaan kedaluwarsa tidak di-COMMIT | `TestBayarQRKedaluwarsa` | QR tetap `aktif` di database |
| M15 tidak menulis outbox merchant | `TestBayarQRDinamisSekaliPakai` | merchant tidak mendapat pemberitahuan |
| M16 QR dinamis tidak pernah ditandai terpakai | `TestBayarQRDinamisSekaliPakai`, `TestBayarQRDinamisSerentak`, `TestHandlerQRAlurDinamis` | QR dinamis bisa dibayar dua kali |
| M17 hapus cabang status `kedaluwarsa` | `TestBayarQRKedaluwarsa` | pembayaran kedua pada QR kedaluwarsa mendapat 404, bukan 410 |
| M20 hapus batas laju `qr` | `TestBuatQRAturan` | QR ke-11 lolos |
| M21 konfirmasi tanpa `bisaDibayar` | `TestBayarQRKedaluwarsa` dan tiga lain | QR kedaluwarsa atau milik merchant tidak sah tampil |
| M22 alasan laporan tanpa batas bawah | `TestLaporkanQRMembekukanMerchantDanMenulisAudit`, `TestHandlerQRLaporkan` | alasan "palsu" diterima |
| M25 konfirmasi tanpa cek bentuk uuid | `TestQRMerchantBelumSahTidakBisaMenerimaQR`, `TestHandlerQRKedaluwarsaDanKesalahan` | id bukan uuid menjadi error database (500), bukan 404 |
| M26 bayar tanpa cek merchant sah | `TestQRMerchantBelumSahTidakBisaMenerimaQR` dan dua lain | QR merchant belum sah bisa dibayar |
| H1 handler: 409 menjadi 400 | `TestHandlerQRAlurDinamis` | status code salah |
| H2 handler: 410 menjadi 404 | `TestHandlerQRKedaluwarsaDanKesalahan` | status code salah |
| H3 bayar QR tanpa middleware `Idempotency-Key` | `TestHandlerQRBayarMemakaiIdempotencyKey` | pembayaran dengan key yang sama memotong saldo dua kali |
| H4 laporkan tanpa `wajibLogin` | `TestHandlerQRLaporkan` | request tanpa sesi tidak ditolak |
| M27 dinamis memakai nominal dari body | tidak ada (setara) | tidak ada perbedaan perilaku: cek nominal terikat (M8) sudah menolak body yang berbeda dari QR sebelum baris itu tercapai |

### Uji mutasi bagian kartu
Satu hal diubah di kode, tes (`-run` kartu di `internal/service` dan `internal/handler`) harus gagal karena sebab yang diuji, lalu kode dipulihkan. Tes memakai PostgreSQL sungguhan. 26 mutan; 25 tertangkap, 1 setara (tidak mengubah perilaku). Mutan M8, M15, dan M25 pertama kali lolos; tes kedaluwarsa kemudian diperkuat (dua job dipaksa bertemu di lock buku, dan `diperiksa` harus 0 sebelum jatuh tempo), lalu M8 dan M15 tertangkap. M1 dan M2 gagal lewat trigger saldo database (23514) saat COMMIT, jadi yang menangkap adalah invarian ledger, bukan cek di kode kartu.

| Mutan | Tes yang menangkap | Gagal karena |
|---|---|---|
| M1 hapus `FOR UPDATE` pada `KunciBukuAkun` (ledger.go) | SerentakVersiBenar | dua otorisasi serentak lolos; ledger menolak saldo negatif saat COMMIT |
| M2 hapus cek saldo | SerentakVersiBenar, DitolakDiulangDijawabSama, handler OtorisasiClearingReversal | otorisasi melebihi saldo tidak lagi `tolak saldo-kurang` |
| M3 hapus `lock_timeout` | LockTimeoutMenjawabSibuk | jawaban `setuju` sesudah menunggu lock, bukan `tolak sibuk` dalam batas |
| M4 balik tanda posting hold | MenahanDana, SerentakVersiBenar, IDSamaSatuHold | saldo pemilik naik, bukan turun |
| M5 kunci server kosong diterima | KunciPenerbit, handler PenerbitTanpaKunciYangSahDitolak | server tanpa kunci menerima kunci kosong |
| M6 pembanding kunci selalu benar | KunciPenerbit, handler PenerbitTanpaKunciYangSahDitolak | kunci salah diterima |
| M7 hapus syarat status `dibalik` pada reversal | ReversalIdempoten, KedaluwarsaHold, handler OtorisasiClearingReversal | reversal diulang membalik lagi (ditolak UNIQUE pembalik) |
| M8 hapus `FOR UPDATE` pada baris otorisasi | KedaluwarsaHoldDijalankanDuaKali | job kedua membalik hold yang sudah dibalik: UNIQUE `membalik_jurnal_id` |
| M9 key ledger tidak diklaim | MenahanDana, PulihDariKeyLedger | tidak ada key `selesai` untuk `id_penerbit` |
| M10 key ledger tidak diikat ke jurnal | MenahanDana, PulihDariKeyLedger | key tidak mengikat jurnal tahan |
| M11 hapus pemulihan dari key ledger | PulihDariKeyLedger | ulangan ditolak `ErrOtorisasiBeda`, bukan hold yang sama |
| M12 clearing diulang tidak idempoten | ClearingIdempoten | clearing kedua error status, bukan jawaban yang sama |
| M13 balik tanda posting clearing | ClearingIdempoten, TanpaHold | `dana_tertahan` naik saat ditagih |
| M14 hapus kill switch | KillSwitchMenolakTanpaBaris | otorisasi disetujui saat dimatikan |
| M15 job kedaluwarsa tanpa syarat jatuh tempo | KedaluwarsaHoldDijalankanDuaKali | job memeriksa hold yang belum jatuh tempo |
| M16 batas harian kartu dikalikan 1000 | Ditolak | otorisasi di atas batas harian disetujui |
| M17 abaikan akun dibekukan | Ditolak | akun dibekukan masih disetujui |
| M18 hapus syarat tingkat pada penerbitan | TerbitkanKartu | akun belum terverifikasi mendapat kartu |
| M19 ubah status kartu tanpa cek pemilik | UbahStatusKartu | kartu orang lain berhasil dibekukan |
| M20 hapus pemetaan saldo tidak negatif dari ledger | SerentakTanpaHoldDanClearingKeduaDitolak, handler TanpaHoldClearingKedua409 | clearing kedua mengembalikan error database mentah, bukan `ErrSaldoKurang` |
| M21 `id_penerbit` sama dengan jumlah lain dianggap ulangan | IDSamaSatuHold, handler OtorisasiClearingReversal | tidak ada `ErrOtorisasiBeda` |
| M22 hapus pemeriksaan kunci di handler penerbit | handler PenerbitTanpaKunciYangSahDitolak | permintaan tanpa kunci diproses (409, bukan 401) |
| M23 clearing tanpa hold mengambil dari `dana_tertahan` | SerentakTanpaHoldDanClearingKeduaDitolak, handler TanpaHoldClearingKedua409 | clearing kedua lolos, tidak ditolak ledger |
| M24 reversal memberi status `kedaluwarsa` | ReversalIdempoten, handler OtorisasiClearingReversal | status bukan `dibalik` |
| M25 hapus syarat jatuh tempo di `lepasHold` | tidak ada (mutan setara) | `tahan_sampai` tidak pernah berubah dan jam tidak mundur, jadi kueri `HoldKedaluwarsa` sudah menyaring hal yang sama |
| M26 mode rentan tidak berlaku | SerentakTanpaHoldDanClearingKeduaDitolak, handler TanpaHoldClearingKedua409 | otorisasi kedua ditolak saldo, bukan disetujui |

Tes tambahan `TestKartuSebagaiRoleAplikasi` menjalankan alur penuh sebagai role aplikasi `api_t4` (hak kolom dan tabel); dilewati bila `TEST_APP_DATABASE_URL` kosong, dan schema harus dibuat dengan hak.

## Selisih dengan naskah (lab yang benar)

Pembaruan naskah dan ERD4 dikerjakan KONSISTENSI-4; lab ini yang benar.

1. `topup_bank.tujuan_bayar` ditambahkan: naskah menyebut "mendapat tujuan bayar dari gateway" tetapi tabel mermaid tidak punya kolomnya.
2. Jenis buku baru (`pemakai`, `merchant`, `bank`, `dana_tertahan`, `settlement_kartu`) dan jenis jurnal baru (`topup_bank`, `kartu_tahan`, `kartu_tangkap`); naskah hanya menyebut akun sistem dana tertahan.
3. Jumlah tabel 22 sesuai naskah, tetapi dalam satu schema; pembagian enam schema belum dibuktikan (`t4-modul`).
4. `webhook_event` mencatat event yang valid; kiriman bertanda tangan salah dijawab 401 tanpa baris (event_id dari pihak yang tidak terbukti tidak dipercaya untuk menulis tabel). `hasil = ditolak` dipakai untuk order tidak dikenal atau jumlah yang berbeda dari order.
5. Top-up yang melewati batas saldo sesudah lock tidak dikredit dan tidak punya jalur pengembalian dana di PRD v4; lab memarkirnya (lihat atas). Naskah tidak menyebut kasus ini.
6. Top-up `tidak_pasti` dan `gagal` dibedakan menurut jenis kegagalan (timeout lawan penolakan eksplisit), sesuai ADR 36 untuk timeout; naskah tidak merinci kasus koneksi ditolak.
7. Pengirim transfer boleh `pemakai` terverifikasi dan penerimanya tetap karyawan (nomor karyawan): user belum punya nomor tujuan transfer di PRD.
8. QR, kartu, dan back office: lihat "Selisih" di bagian masing-masing.

## Yang belum ada di lab ini

- Pembagian enam schema dan role per modul, service pembayaran terpisah yang memanggil API ledger, dan latensi HTTP internal: `t4-modul`.
- Jadwal retry gateway, rotasi secret, tiga gaya tanda tangan sebagai pembanding, dan koreksi insiden lewat jurnal normal sudah dibuktikan lab `t4-webhook` (kodenya `-koreksi-rekon` dan jadwal gateway tiruan ada di lab ini dan dites).
- Breaker `sony/gobreaker`, lajur yang dijeda tanpa menaikkan hitungan percobaan, dan pengukuran pemakaian worker bersama notifikasi uang: `t4-integrasi`.
- Penyimpanan objek sungguhan, presigned URL, retensi 30 hari yang dijalankan job, dan ukuran dump lawan `bytea`: `t4-storage`.
- Penerbit yang menolak tetapi jaringan kartu menyetujui, p95 otorisasi, dan hold yang menumpuk di satu buku sistem: `t4-kartu`.
- Payload QR dengan CRC: `t4-qr`. Fetcher dengan resolver buatan dan nama IDNA: `t4-ssrf`. Perilaku agen AI di back office dan jangkar hash di luar database: `t4-audit`.
- Pipeline (oasdiff per modul di CI, SBOM, pindai, tanda tangan image) dan IaC: `t4-pipeline`, `t4-infra`. `make kontrak` hanya melint dan membandingkan terhadap api-t3.
- Rate limit lintas instance: batas laju Tahap 4 di memori satu proses (ADR 20); penghitung bersama (ADR 27) belum diterapkan pada endpoint baru. Di belakang proxy semua client berbagi satu key per alamat (README api-t3).
- Enumerasi email lewat `POST /daftar` (409) hanya ditahan batas laju per alamat; verifikasi email tidak ada.
- Pembayaran dari queue offline, notifikasi massal ke 100.000 HP, dan pencairan merchant ke rekening bank (file seperti Tahap 2): tidak dikerjakan.
- Testcontainers dan k6 Tidak dijalankan (Compose, seperti Tahap 3); `make beban` memakai generator Go sendiri.
