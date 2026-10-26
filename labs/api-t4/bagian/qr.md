<!-- Fragmen README untuk QR merchant luar (lab-api-t4). Induk menyisipkannya ke README.md api-t4. -->

## QR merchant luar (M35, ADR 40)

Merchant luar Lestari menerima pembayaran lewat QR. Merchant yang sudah diverifikasi (`akun.tingkat = terverifikasi`, `akun.status = aktif`) menerbitkan QR statis atau dinamis. Pembeli memindai QR, melihat nama merchant dari tabel `akun` di layar konfirmasi, lalu membayar dari saldo. Pembayaran QR adalah jurnal `bayar` biasa: dua posting yang seimbang dan satu baris `outbox` untuk merchant, semuanya di transaction yang sama. Tidak ada panggilan jaringan di dalam transaction (ADR 22).

| Endpoint | Siapa | Hasil |
|---|---|---|
| `POST /qr` | merchant terverifikasi dan aktif | 201 `{id, jenis, nominal, berlaku_sampai}`; 403 untuk akun lain, merchant dibekukan, atau merchant belum terverifikasi; 422 untuk jenis atau nominal yang salah; 429 batas laju |
| `GET /qr/{id}` | siapa pun yang login | 200 `{id, jenis, nominal, berlaku_sampai, merchant: {nama, kota}, terverifikasi}`; 404 satu bentuk untuk QR yang tidak ada, tidak aktif, kedaluwarsa, atau milik merchant yang dibekukan atau belum terverifikasi |
| `POST /qr/{id}/bayar` | karyawan atau pemakai, tingkat apa pun | 201 `{id, saldo, nominal, merchant}` dengan `Location: /transfers/{jurnal}`; 409 QR dinamis sudah dibayar; 410 QR dinamis kedaluwarsa; 403 akun dibekukan atau jenis akun salah; 422 nominal atau saldo; `Idempotency-Key` opsional seperti `/transfers` |
| `POST /qr/{id}/laporkan` | siapa pun yang login | 202; merchant pemilik QR dibekukan dan satu baris audit log berantai ditulis di transaction yang sama |

### Aturan

- **QR dinamis** terikat ke satu nominal (paling banyak Rp5.000.000, Asumsi lab) dan berlaku 5 menit sejak terbit (Asumsi, ADR 40). Dibayar sekali: baris QR dikunci (`FOR UPDATE`) sebelum buku pembayar dan merchant, status dan masa berlaku dibaca sesudah lock, lalu `UPDATE ... WHERE status = 'aktif'` menandainya terpakai di transaction yang sama dengan jurnal. Pembayaran yang kalah balapan dibatalkan seluruhnya. Body pembayaran boleh kosong; bila nominal dikirim, nilainya harus sama dengan nominal QR (422 bila beda). QR yang lewat masa berlaku dijawab 410 dan ditandai `kedaluwarsa`; penandaan itu di-COMMIT walau pembayarannya ditolak.
- **QR statis** tidak punya nominal dan masa berlaku, dan dibayar berkali-kali. Pembeli wajib mengirim nominal, paling banyak Rp200.000 per pembayaran (Asumsi produk, ADR 40).
- **Tingkat pembeli** tidak dibatasi: akun yang belum terverifikasi boleh membayar QR (PRD v4). Akun `dibekukan` ditolak 403; merchant dan warung tidak membayar QR (403).
- **Konfirmasi** membaca nama merchant dari tabel `akun`, bukan dari isi QR. Itu satu-satunya hal yang bisa dilakukan server terhadap stiker QR yang diganti: stiker QR statis milik merchant sah lain yang ditempel di atas stiker toko menghasilkan jurnal yang sah ke merchant pemilik QR itu, dan server tidak punya dasar untuk menolaknya (`TestBayarQRMilikMerchantLain`). Pembeli yang membandingkan nama di layar dengan papan toko adalah pengaman terakhir (Asumsi: perilaku pembeli tidak diukur di lab).
- **Laporan QR palsu** membekukan merchant lebih dulu, tim risk memeriksa kemudian (ADR 40). Satu laporan dari satu akun sudah cukup. Itu celah penyalahgunaan terhadap merchant yang sah (Asumsi desain ADR 40: kerugian satu pembayaran palsu dinilai lebih mahal daripada pembekuan sementara); lab ini tidak menutupnya. Peran di baris audit adalah jenis akun pelapor.
- **Batas laju** per akun (Asumsi lab, token bucket di memori satu proses): `qr` 10 QR, isi ulang 10 per menit; `qr-bayar` 20 pembayaran, isi ulang 20 per menit; `qr-lapor` 3 laporan, isi ulang 3 per jam. Setiap percobaan mengambil satu token, termasuk yang gagal validasi.

Urutan lock di semua jalur pembayaran QR sama: baris `qr`, lalu `buku` menurut id (ADR 13). Sepuluh pembeli yang membayar satu QR statis bersamaan antre di baris QR dan semuanya berhasil tanpa deadlock (`TestBayarQRStatisSerentak`).

### Uji mutasi

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
| M6d hapus cek jenis akun di `BuatQR` | `TestQRMerchantBelumSahTidakBisaMenerimaQR`, `TestHandlerQRKedaluwarsaDanKesalahan` | pemakai bisa menerbitkan QR |
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
