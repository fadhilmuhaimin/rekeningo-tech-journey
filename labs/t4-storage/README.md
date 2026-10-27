# Lab t4-storage · file identitas di bytea lawan penyimpanan objek

Lab Tahap 4 (`plan/CERITA-TAHAP-4.md`, bagian 3, 3b, tabel "Yang harus bisa dibuktikan lab"; masalah M33; ADR 38; Keamanan 7; tugas `lab-t4-storage`). Lab ini membuktikan lewat rekaman apa yang terjadi bila foto kartu identitas dan swafoto disimpan di kolom `bytea` (versi pertama), lawan di penyimpanan objek dengan database yang hanya memegang kunci dan checksum; apa yang bisa dilakukan pemegang presigned URL; apa yang dicek server sesudah unggah; siapa yang boleh mengunduh dan apa yang tercatat; dan bagaimana retensi 30 hari berjalan.

Server, skema, dan data awal adalah milik `labs/api-t4` (`dasar_t4.py`, `cmd/api`), bukan salinan: lab ini menambah kode di api-t4 yang bisa dinyalakan lewat flag dan satu mode rentan, dan skenario di atasnya, di schema sendiri `tahap4_storage` (tes Go di `tahap4_storage_tes`). Penyimpanan objek adalah SeaweedFS 4.51, satu container lokal (`docker-compose.yml`) tanpa kredensial nyata; kunci akses di `s3.json` adalah data lab. Semua pihak ketiga tiruan di komputer lab; tidak ada layanan atau data nyata. Lab ini bukan uji kapasitas dan tidak mengklaim kepatuhan atau izin apa pun.

## Menjalankan

```bash
make -C labs/t4-storage run                  # semua bagian, ±5 menit, menulis labs/t4-storage/output/*.txt
make -C labs/t4-storage run BAGIAN=presign   # satu bagian: ukuran presign unggah unduh retensi testing
make -C labs/t4-storage cek                  # rekam ulang; gagal bila output/ berbeda dari yang di-commit
make -C labs/t4-storage down                 # hentikan dan hapus container SeaweedFS (run.py melakukannya sendiri di akhir)
```

Butuh Docker dan Go; PostgreSQL lewat `labs/b3-race`. Image `chrislusf/seaweedfs:4.51` (±190 MB) ditarik sekali. Port dasar S3 adalah 18290 (ditambah `LAB_PORT_OFFSET`); port api-t4 dan pihak ketiga tiruannya sama dengan `api-t4`, jadi lab ini tidak berjalan serentak dengan `api-t4` atau lab turunannya di lajur yang sama. Setiap bagian membuat ulang schema, data awal, dan container penyimpanan dari nol (penyimpanan selalu mulai kosong), jadi `output/*.txt` tidak bergantung pada urutan bagian dan rekaman ulang identik per byte. Token sesi, tanda tangan URL, kunci objek, waktu, tanggal, dan port disamarkan; angka yang bergantung mesin (waktu) hanya diperiksa sebagai batas yang diperiksa dan tidak direkam. Lab gagal keras bila hasilnya meleset dari yang diharapkan.

## Versi dasar dan sumber (dicek 2026-10-27)

| Komponen | Versi atau sumber | Catatan |
|---|---|---|
| SeaweedFS | 4.51 (Apache-2.0), image `chrislusf/seaweedfs:4.51`, digest `sha256:f7a49e3f3972ebed5be2ed4befa4a0c68eb7bdddba6e692d42729ceb545134b8` (arm64) | GitHub Releases: tag 4.51 terbit 2026-10-25, rilis terbaru saat lab ditulis; `weed version` = `30GB 4.51 ffa87c25f`. Wiki "Amazon S3 API" (diedit 2026-10-17) menulis presigned URL didukung; wiki itu tidak menyebut `X-Amz-Expires`, batas ukuran, atau checksum, jadi semua perilaku itu direkam, bukan dikutip |
| PostgreSQL, Go, pgx | 17.11, go1.27.1, v5.11.0 | dari kepala rekaman dan `go.mod` api-t4; sama dengan tugas `lab-api-t4`; `pg_dump` dan `pg_restore` dari container PostgreSQL 17.11 |
| Python (hanya skrip rekaman) | 3.14.7, psycopg 3.3.6; modul standar `hashlib`, `hmac`, `urllib` | `labs/.venv`; penanda tangan SigV4 kedua di `s3sign.py` |
| Rumus SigV4 query string, `UNSIGNED-PAYLOAD`, `X-Amz-Expires` 1 sampai 604800 | AWS S3 API Reference, "Authenticating Requests: Using Query Parameters (AWS Signature Version 4)", dibuka 2026-10-27 | contoh bertanda tangan di dokumen itu (signature `aeeed9bb...d404`) adalah tes `TestTandaiURLCocokDenganContohDokumentasiAWS` |
| `pg_dump -Fc` terkompresi bawaan; keluaran `bytea` hex dua digit per byte | PostgreSQL 17 docs, `pg_dump` dan tipe biner, dibuka 2026-10-27 | dasar dua rasio di `ukuran.txt` |

Dependency baru: tidak ada. Klien S3 ditulis dengan pustaka standar Go (`internal/objek/s3.go`, penandatanganan SigV4 sendiri sekitar 60 baris), bukan AWS SDK, supaya tidak ada dependency yang butuh ADR. Konsekuensinya satu hal: klien itu hanya memakai URL bertanda tangan untuk semua operasi (PUT, GET, HEAD, DELETE), jadi hanya ada satu jalur penandatanganan, dan dua implementasi (Go di server, Python di lab) yang ditulis terpisah diterima oleh penyimpanan yang sama.

## Rekaman

| Rekaman | Isi | Halaman |
|---|---|---|
| `ukuran.txt` | (a) File di `bytea` (mode rentan `berkas-bytea`): dump `-Fc` membesar sebanding dengan ukuran file (rasio dump/file di antara 0,99 dan 1,25 pada 2, 4, dan 8 pengajuan), dump teks sekitar dua kali (hex), pulih ke database lain menghasilkan isi yang sama. Lawan: file di SeaweedFS, dump hampir tidak berubah (rasio di bawah 0,01) karena database hanya memegang kunci dan checksum. Hitungan 28 hari × 1 GB dari angka naskah (Asumsi) | 4.14 |
| `presign.txt` | (b) URL PUT dipakai ulang oleh pemegang lain sampai kedaluwarsa, ditolak sesudahnya (ditunggu sungguhan dengan umur 5 detik; juga jam diperankan lewat tanggal penandatanganan), PUT ke kunci yang sama menimpa, penolakan lain (kunci diganti, metode diganti, tanpa tanda tangan), batas ukuran (tidak ada tanpa `content-length` ditandatangani, ada bila ditandatangani), checksum di penyimpanan, dan log container | 4.15 |
| `unggah.txt` | (d) Alur lengkap minta URL, unggah langsung, ajukan: server menghitung ulang checksum dari isi objek, memeriksa ukuran (tepat 1 MiB lolos, satu byte lebih ditolak), tipe dari byte, dan kepemilikan kunci; file yang ditolak dihapus; nomor identitas dan tanda tangan URL tidak masuk log atau jawaban galat | 4.15 |
| `unduh.txt` | (c) Unduh lewat server: peran diperiksa, alasan wajib, satu baris `audit_log` per percobaan, rantai audit utuh; yang bukan petugas risk ditolak tanpa baris audit; bucket privat; URL GET bertanda tangan (alternatif yang ditolak) dipakai ulang tanpa catatan; file yang ditimpa sesudah diterima terdeteksi saat unduh | 4.15 |
| `retensi.txt` | (e) Job retensi 30 hari: masa simpan tepat 30 hari untuk lulus, ditolak, dan gagal; jam diperankan di 29 hari, satu detik sebelum batas, tepat di batas, dan 31 hari; penyimpanan mati saat job jalan; idempoten; pengajuan yang belum selesai tidak tersentuh; unduh sesudah dihapus dijawab 410 dan tetap tercatat | 4.14, 4.15 |
| `testing.txt` | `go vet` dan tes Go jalur ini (klien S3 dengan penyimpanan palsu yang memeriksa tanda tangan dan masa berlaku, unggah presigned, retensi, bytea, handler) | 4.15 |

## Yang ditambahkan ke api-t4 oleh lab ini

- **Klien S3** (`internal/objek/s3.go`): URL bertanda tangan SigV4 (query string), `PresignPUT(kunci, umur, ukuran)`, dan `Simpan`, `Baca`, `Ukuran` (HEAD), `Hapus`, `PastikanBucket` di atasnya. Pesan galat tidak pernah memuat URL: `*url.Error` dari `net/http` menulis URL lengkap, dan URL itu adalah bearer token. `Baca` dibatasi (`MaksBaca`): objek yang lebih besar ditolak tanpa dibaca ke memori. Server memasang batas 4 MiB di `bukaObjek` (`cmd/api/berkas.go`), dijaga tes: HEAD menolak objek di atas 1 MiB lebih dulu, dan batas baca melindungi memori bila pemegang URL unggah mengganti objek di antara HEAD dan GET. Antarmuka `Penyimpan` mendapat `Ukuran`; `Dir` (bawaan api-t4) mengimplementasikannya.
- **Endpoint** (kontrak di `openapi.yaml`, dijaga `kontrak_test.go`): `POST /verifikasi/unggahan` (dua kunci acak di bawah `identitas/<akun>/` dan dua URL PUT; `Cache-Control: no-store`; `ukuran_kartu` dan `ukuran_swafoto` opsional menandatangani panjang PUT) dan `POST /verifikasi/terunggah` (kunci, checksum dari app, dan `nomor_identitas`; 202 seperti `POST /verifikasi`). Jalur lama `POST /verifikasi` (unggah lewat server) tidak berubah.
- **Pemeriksaan sesudah unggah** (`internal/service/berkas.go`): kunci harus di bawah awalan akun, berbentuk persis yang diterbitkan server (32 heksadesimal huruf kecil) dan berbeda; checksum 64 heksadesimal; objek ada; ukuran dari HEAD sebelum isi dibaca (paling besar 1 MiB); tipe dari byte (JPEG atau PNG); checksum dihitung ulang dari isi dan dibandingkan dengan klaim app. Checksum yang tersimpan adalah hitungan server. File yang ditolak karena isinya dihapus dari penyimpanan; galat penyimpanan (bukan isi) tidak menghapus apa pun. Pengajuan ditulis dengan fungsi yang sama dengan jalur lama (`catatPengajuan`: satu transaction dengan outbox, file yatim dibuang bila gagal).
- **Retensi** (`HapusBerkasJatuhTempo`, flag job `-retensi-identitas`, `-lab-sekarang` untuk waktu maya): menghapus file yang `hapus_pada <= sekarang`, lalu mengosongkan kunci objek di barisnya sebagai penanda "sudah dihapus". Idempoten (Hapus objek yang tidak ada dianggap berhasil, baris yang sudah ditandai tidak dipilih lagi), tanpa panggilan jaringan di dalam transaction, satu file yang gagal dihitung sebagai galat dan tidak menghentikan job. Job tidak membuat bucket (server yang membuatnya), supaya tetap berjalan dan melapor saat penyimpanan mati.
- **Perbaikan yang ditemukan lab**: pengajuan berstatus `gagal` (vendor mati, M31) tidak pernah mendapat `hapus_pada`, jadi filenya tidak akan pernah dihapus; `TandaiVerifikasi` kini mengisinya sama dengan `SelesaikanVerifikasi` (selesai + 30 hari). `BukaBerkas` dengan kunci kosong menjawab 410 (`/problems/berkas-dihapus`) dan percobaannya tetap tercatat di audit.
- **Mode rentan `berkas-bytea`** (M33, versi pertama): penyimpanan objek diganti `objek.Bytea`, satu baris per objek di tabel `berkas_bytea` di database yang sama. DDL di `internal/objek/bytea.sql` (satu sumber; dijalankan lab dan tes sebagai pemilik schema, bukan migration Tahap 4).
- **Flag** (`cmd/api`): `-objek-s3` (endpoint; kunci akses dan rahasia dari `OBJEK_S3_KUNCI` dan `OBJEK_S3_RAHASIA`, bukan argumen baris perintah), `-objek-bucket` (bawaan `berkas`), `-objek-presign-umur` (bawaan 5 menit, Asumsi; lab saja untuk umur pendek), `-retensi-identitas`, `-lab-sekarang`.
- **Batas laju** `unggahan`: 3 permintaan URL per akun per jam (Asumsi lab, token bucket di memori satu proses).
- Tes Go: `internal/objek/s3_test.go`, `internal/service/berkas_test.go`, `internal/handler/handler_berkas_test.go`. Rekaman `api-t4/output/testing.txt` ikut berubah karena daftar tes bertambah.

## Hal yang dikirim skrip lab, bukan akibat sistem

Rekaman ini dibuat skrip (`run.py`), jadi beberapa hal yang tampak di dalamnya adalah perbuatan skrip:

- **Skrip berperan sebagai app dan sebagai pemegang URL.** PUT ke URL dari server, "pemegang pertama" dan "pemegang lain", dan penimpaan file sesudah diterima adalah permintaan HTTP dari skrip. Server tidak menimpa apa pun.
- **Jam diperankan, bukan ditunggu**, di dua tempat: tanggal penandatanganan URL yang digeser (jam penyimpanan tetap sungguhan), dan `-lab-sekarang` pada job retensi. Kedaluwarsa umur 5 detik ditunggu sungguhan (mengulang PUT sampai ditolak, batas 3,5 sampai 15 detik).
- **File karangan.** Isi file adalah tanda tangan PNG kecil lalu byte acak berbenih tetap (Ilustrasi): tipe terbaca `image/png`, isinya tidak bisa dimampatkan seperti JPEG nyata, dan rekaman sama di setiap run. Ukuran 500.000 byte per file mengikuti Asumsi naskah. Rasio dump/file untuk foto nyata tidak diukur.
- **Nomor identitas** `1111222233334444` adalah karangan. Skrip sengaja mengirimnya sebagai angka JSON di satu pemeriksaan, karena pesan galat standar pengurai JSON mengutip nilai yang bertipe salah; itu bukan cara app mengirimnya.
- **Sesi** dibuat langsung di tabel `sesi` (batas login 10 per menit per alamat membuat banyak login tidak mungkin); data awal dari `./api-t4 -seed`.
- **Penyimpanan mati** adalah `docker compose stop seaweedfs` oleh skrip; **penyimpanan pulih** adalah `start`.
- **Pemanasan.** Sebelum tiap bagian skrip menulis dan menghapus satu objek kecil: penulisan pertama ke bucket baru lebih lambat daripada berikutnya (diduga karena volume dibuat; tidak diselidiki), dan run pertama dengan umur URL 3 detik gagal karena PUT kedua sudah terlambat.

## Selisih dengan naskah

Naskah tidak diubah (usulan masuk badan PR, `### USULAN-CERITA`). Yang rekaman perlihatkan dan naskah belum tulis:

1. **File ditimpa sesudah diterima.** ADR 38 menulis PUT ke kunci yang sama menimpa. Rekaman menambah akibatnya: sesudah pengajuan diterima dan URL belum kedaluwarsa, pemegang URL masih bisa menimpa file; server menolak file itu saat diunduh (checksum tidak cocok, 500 `berkas-rusak`), tetapi isi aslinya hilang dan penyimpanan tidak menyimpan versi lama. Layanan verifikasi tiruan hanya menerima checksum yang tercatat saat diterima, bukan isi file.
2. **Ukuran bisa ditegakkan saat unggah.** Naskah menulis ukuran diperiksa sesudah unggah. Itu terbukti dan tetap dilakukan, tetapi penyimpanan juga menolak PUT yang panjangnya lain bila `content-length` ikut ditandatangani (app menyebut ukuran saat meminta URL). URL tanpa itu tidak membatasi apa pun (5 MiB diterima).
3. **Klaim "diukur lab t4-storage" di ADR 38.** Kolom "Kapan salah" menyebut bandwidth unduhan staf lewat server "diukur lab `t4-storage`". Lab ini tidak mengukur bandwidth; unduh lewat server terbukti memeriksa peran, menulis audit, dan memeriksa checksum, tetapi beban jaringannya Tidak dijalankan.
4. **Penanda "file sudah dihapus" dan `hapus_pada` untuk status `gagal`.** Tabel `verifikasi` naskah 3b tidak punya penanda terhapus; lab memakai kunci objek kosong (produksi akan memakai kolom atau tabel sendiri, Asumsi). Naskah menulis file dihapus 30 hari sesudah verifikasi "selesai"; pengajuan berstatus `gagal` tidak mendapat `hapus_pada` di api-t4 sampai lab ini memperbaikinya.
5. **Nomor identitas.** Naskah menulis "nomor identitas tidak masuk log" tetapi tidak punya bidang itu di PRD maupun tabel. Lab menambahkan `nomor_identitas` sebagai masukan yang diperiksa bentuknya lalu dibuang (Asumsi lab, 16 angka); bentuk dan keberadaan bidangnya adalah keputusan produk.
6. **Angka M33 yang tidak direproduksi lab.** "3 jam 40 menit", "12 menit", dan disk staging penuh di naskah berlabel Ilustrasi dan tidak muncul di rekaman; lab merekam ukuran (rasio dump/file), bukan waktu. "97%" di naskah terhitung: 28 ÷ (28 + 0,84) = 97,1% (Hitungan dari Asumsi, `ukuran.txt` bagian D).
7. **"Ikut transaction".** Alasan Raka memilih `bytea` ("ikut transaction dan ikut backup"): `objek.Bytea` di lab menulis dengan satu pernyataan sendiri di luar transaction pengajuan, seperti `Dir` dan `S3`, jadi sifat "ikut transaction" tidak dibuktikan dan tidak dibantah oleh lab ini.

## Yang belum ada di lab ini

- **Pencadangan dan replikasi SeaweedFS**, pemulihan penyimpanan objek, dan bukti bahwa file yang dihapus job juga hilang dari salinan cadangan: Tidak dijalankan.
- **Presigned POST dengan kebijakan `content-length-range`** dan unggah multipart: Tidak dijalankan; dukungan SeaweedFS 4.51 tidak diperiksa [perlu verifikasi].
- **Aturan siklus hidup (lifecycle) di penyimpanan** sebagai ganti job retensi: Tidak dijalankan; dukungan SeaweedFS 4.51 tidak diperiksa [perlu verifikasi]. Job di sini memakai satu jalur yang bisa diperankan jamnya.
- **Enkripsi at rest** dan kunci server (`-s3.encryptVolumeData`, SSE): Tidak dijalankan.
- **Layanan terkelola** sungguhan (S3 atau setara), kebijakan bucket, dan IAM: Tidak dijalankan (naskah: produksi memakai layanan terkelola).
- **Log akses di proxy atau penyeimbang beban** di depan penyimpanan: Tidak dijalankan. Hasil "log container tidak memuat tanda tangan" berlaku untuk setelan lab SeaweedFS 4.51, bukan untuk log di depannya.
- **Batas ukuran per objek di SeaweedFS** (konfigurasi atau bawaan): tidak ditemukan di dokumentasi yang dibuka [perlu verifikasi]; lab hanya merekam bahwa 5 MiB diterima.
- **Tanggal di depan pada URL.** SeaweedFS 4.51 menerima tanggal penandatanganan 30 menit di depan; perilaku S3 asli dan penyimpanan lain tidak diperiksa [perlu verifikasi].
- **Foto nyata, KTP nyata, dan aturan masa simpan hukum.** Retensi 30 hari adalah Asumsi produk [perlu verifikasi]; tidak ada klaim kepatuhan.
- **Waktu dump dan pulih untuk puluhan GB** dan "disk penuh": Tidak dijalankan; hanya ukuran 8 MB dan batas 120 detik yang diperiksa.
- **Lintas instance.** Batas laju `unggahan` di memori satu proses (sama dengan batas endpoint Tahap 4 lain); penghitung bersama belum diterapkan.
- **Pembersihan file yatim** dari URL yang diminta tetapi tidak pernah diajukan: tidak ada job; file semacam itu tinggal di penyimpanan sampai ada aturan lifecycle atau job yang menyapunya (Tidak dijalankan). Karena `ukuran_kartu` dan `ukuran_swafoto` opsional, app yang tidak menyebutnya mendapat URL tanpa batas ukuran (5 MiB diterima, `presign.txt` bagian F): batas laju 3 permintaan per jam membatasi jumlah URL, bukan ukuran file yang ditaruh lewatnya. Membuat ukuran wajib adalah keputusan produk.
- **`POST /verifikasi/unggahan` untuk merchant.** Pengajuan merchant memakai jalur yang sama sampai tim risk memutuskan (back office); jalur persetujuan itu tidak diulang di lab ini.

## Uji mutasi

Dijalankan pelaksana lab ini: 40 mutan di kode Go (satu perubahan per mutan pada salinan terpisah di folder sementara, schema tes dibangun ulang sebelum tiap mutan, hasil dibaca dari nama tes yang gagal) dan 5 mutan yang hanya terlihat oleh rekaman lab. Hasil: 39 dari 40 tertangkap tes Go, satu setara perilaku; 5 dari 5 tertangkap rekaman lab. Tiga mutan pertama gagal kompilasi atau merusak query (V11, H2, R3) dan diulang dalam bentuk yang sah; ketiganya tertangkap. Penjaga `hapus_pada` di `TandaiBerkasDihapus` (R3) hanya tertangkap oleh `TestRetensiTandaiBerkasDihapusMenjagaBatasDanSekaliSaja`: tes lain memanggilnya lewat job yang hanya meneruskan baris yang sudah jatuh tempo, jadi tes itu ditulis khusus.

| Kode | Berkas | Mutan | Ditangkap oleh |
|---|---|---|---|
| S1, S2 | `objek/s3.go` | batas atas umur URL 604801 detik; batas bawah 1 detik ditolak | `TestPresignUmurDiLuarRentangDitolak` |
| S3 | `objek/s3.go` | `UNSIGNED-PAYLOAD` diubah | `TestTandaiURLCocokDenganContohDokumentasiAWS` |
| S4 | `objek/s3.go` | daftar header ditandatangani dipisah koma, bukan titik koma | `TestPresignPUTUkuranDitandatanganMenolakPanjangLain` |
| S5, S6 | `objek/s3.go` | batas baca `>=` pada isi dan pada `Content-Length` | `TestBacaMemakaiBatasUkuran` |
| S7 | `objek/s3.go` | 404 tidak dipetakan ke `ErrTidakAda` | `TestS3SimpanBacaUkuranHapus` |
| S9 | `objek/s3.go` | URL tidak dibuang dari galat jaringan | `TestGalatS3TidakMemuatTandaTanganAtauURL` |
| S10 | `objek/s3.go` | kunci objek tidak diperiksa bentuknya | `TestS3KunciTidakSahDitolakSebelumKeJaringan` |
| S11 | `objek/s3.go` | `content-length` ditandatangani juga bila ukuran 0 | `TestPresignPUTDipakaiPemegangLainSampaiKedaluwarsa`, `TestPresignPUTUkuranDitandatanganMenolakPanjangLain` |
| S12 | `objek/s3.go` | nilai query tidak di-encode | `TestTandaiURLCocokDenganContohDokumentasiAWS` |
| B2 | `objek/bytea.go` | `ON CONFLICT DO NOTHING`: kunci yang sama tidak menimpa | `TestBytea` |
| V1 | `service/berkas.go` | umur URL 6 menit | `TestMintaUnggahanKunciAcakMilikAkunDanUmurLimaMenit` |
| V2 | `service/berkas.go` | akun terverifikasi boleh meminta URL | `TestMintaUnggahanSyaratAkunDanPenyimpanan`, tes handler |
| V3, V4, V5 | `service/berkas.go` | awalan kunci tanpa garis miring; kunci hanya awalan; dua kunci sama | `TestAjukanTerunggahKunciBukanMilikAkunDitolakTanpaMenghapusMilikOrang` |
| V6 | `service/berkas.go` | panjang checksum `< 64` | `TestAjukanTerunggahBentukChecksumDanNomorIdentitas` |
| V7 | `service/berkas.go` | nomor identitas 15 angka | beberapa tes `TestAjukanTerunggah...` |
| V8 | `service/berkas.go` | ukuran tepat 1 MiB ditolak | `TestAjukanTerunggahMenolakDanMenghapusFileYangTidakLolos` |
| V9, V13 | `service/berkas.go` | checksum dibandingkan peka huruf besar; checksum klaim disimpan, bukan hitungan server | `TestAjukanTerunggahBerhasilMemakaiChecksumHitunganServer` |
| V10 | `service/berkas.go` | hanya kartu yang dihapus saat ditolak | `TestAjukanTerunggahMenolakDanMenghapusFileYangTidakLolos` |
| V11 | `service/berkas.go` | file dihapus juga saat galat penyimpanan | `TestAjukanTerunggahGalatPenyimpananTidakMenghapusFile` |
| V12 | `service/berkas.go` | tipe isi tidak diperiksa | `TestAjukanTerunggahMenolakDanMenghapusFileYangTidakLolos` |
| V14 | `service/berkas.go` | batas laju `unggahan` dibuang | `TestMintaUnggahanDibatasiTigaPerJamPerAkun` |
| V15 | `service/berkas.go` | baris ditandai terhapus walau file gagal dihapus | `TestRetensiDihentikanGalatSatuFile...` |
| V19 | `service/berkas.go` | ukuran swafoto dipakai untuk URL kartu | `TestMintaUnggahanUmurDariDepDanUkuranDitandatangani` |
| V20 | `service/berkas.go` | pemeriksaan file kosong dibuang | lolos: setara perilaku (`periksaGambar` menolak file kosong dengan pesan yang sama) |
| R1 | `repo/berkas.go` | batas retensi `<` bukan `<=` | `TestRetensiBatas29Dan31HariJamDiperankan` dan dua tes lain |
| R3 | `repo/berkas.go` | penanda terhapus tanpa penjaga `hapus_pada` (batas diperlebar 100 tahun) | hanya `TestRetensiTandaiBerkasDihapusMenjagaBatasDanSekaliSaja` |
| R5 | `repo/berkas.go` | hanya kunci kartu yang dikosongkan | `TestRetensiBatas29Dan31HariJamDiperankan` dan tes lain (baris dipilih lagi) |
| T1, T2 | `repo/verifikasi.go` | status `gagal` tanpa `hapus_pada`; 31 hari | `TestRetensiMasaSimpanTigaPuluhHariTepatDariSelesai` |
| T3 | `repo/verifikasi.go` | `SelesaikanVerifikasi` memakai 29 hari | `TestRetensiMasaSimpanTigaPuluhHariTepatDariSelesai` |
| O1 | `service/bo.go` | kunci kosong dibaca sebagai kunci objek | `TestBukaBerkasSesudahRetensiMenjawabDihapusDanTetapMencatatAudit` |
| H1 | `handler_berkas.go` | `Cache-Control: no-store` dibuang | `TestHandlerBerkasUnggahanLoginUkuranDanTanpaCache` |
| H2 | `handler_berkas.go` | `nomor_identitas` bertipe `string`: pesan galat JSON mengutip nilainya | `TestHandlerBerkasTerunggahAlurDanNomorIdentitasTidakDiulang` |
| H3 | `handler_bo.go` | 410 tidak dipetakan | `TestHandlerBerkasBukaSesudahRetensiMenjawab410DanTetapMencatatAudit` |
| H4 | `handler_berkas.go` | batas badan 409.600 byte, bukan 4096 | `TestHandlerBerkasTerunggahAlurDanNomorIdentitasTidakDiulang` |
| L1 | `cmd/api/berkas.go` | job retensi memastikan bucket (gagal saat penyimpanan mati) | `retensi.txt`: job berhenti dengan galat koneksi, bukan melapor galat per file |
| L2 | `handler_berkas.go` | handler mencatat nomor identitas ke log | `unggah.txt`: "log memuat nomor identitas" |
| L4 | `cmd/api/main.go` | mode `berkas-bytea` tidak memilih `objek.Bytea` | `ukuran.txt`: tabel `berkas_bytea` kosong, rasio dump 0,00 |
| L6 | `cmd/api/berkas.go` | `-lab-sekarang` diabaikan | `retensi.txt`: bagian C mendapat (0, 0, 0), harus (1, 0, 1) |
| L7 | `cmd/api/main.go` | `-objek-presign-umur` diabaikan | `presign.txt`: `X-Amz-Expires` 300, harus 5 |

Mutan yang tidak dijalankan atau dianggap setara tanpa tes: ukuran halaman job (100) yang diganti 1.000 (perilaku sama), `id > $2` menjadi `>=` pada pemilihan halaman (baris yang sudah ditandai tidak dipilih lagi, jadi hasilnya sama), dan `.UTC()` pada waktu penanda tangan (semua tes memakai UTC). Mutasi tidak mencakup `s3sign.py` (alat lab; dua implementasi saling dibandingkan oleh penyimpanan yang sama: bila salah satu salah, penyimpanan menolaknya dan rekaman gagal).
