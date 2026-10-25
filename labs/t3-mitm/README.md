# Lab t3-mitm · proxy tiruan, pinning, dan rotasi pin

Lab untuk masalah M26 Tahap 3 (`plan/CERITA-TAHAP-3.md` bagian 4) dan ADR 31 (Keamanan 6). Budi melihat saldonya turun Rp150.000 dengan satu "Transfer ke Dimas" yang tidak ia buat. Dimas memasang hotspot bernama sama dengan Wi-Fi kantin, dan build rilis app memuat flag "terima sertifikat apa pun" dari staging. Lab ini merekam apa yang proxy lihat dan ubah, apa yang menahannya, dan apa yang rusak saat pin dirotasi.

Server, data awal, dan akun adalah milik `labs/api-t3` lewat `dasar_t3.py`, tanpa salinan dan tanpa mengubah satu pun file `labs/api-t3/`. Yang baru: tiga program Go kecil (`go/`), satu client Dart (`dart/`), dan rekamannya (`run.py`). Semua serangan hanya terhadap proses lokal di mesin ini.

Sertifikat dan kunci dibuat acak setiap kali lab jalan di folder sementara di luar repo, lalu dihapus. Tidak ada sertifikat atau kunci yang di-commit.

Proxy dan server tepi hanya mau mendengar dan meneruskan ke loopback: `go/internal/pagar` menolak alamat lain (termasuk `0.0.0.0` dan alamat tanpa host) dengan `GAGAL:` sebelum membuka port. Lab memberi `127.0.0.1` ke semua program, jadi pagar ini hanya bekerja bila ada yang menjalankan program Go-nya sendiri dengan alamat lain.

## Menjalankan

```bash
make lab-up                                   # dari akar repo: PostgreSQL 17 lab di LAB_DB_PORT
make -C labs/t3-mitm run                      # semua bagian, ±1 menit, menulis labs/t3-mitm/output/*.txt
make -C labs/t3-mitm run BAGIAN=pin           # satu bagian: m26 pin dio hsts token
make -C labs/t3-mitm cek                      # rekam ulang; gagal bila output/ berbeda dari yang di-commit
make -C labs/t3-mitm test                     # tes Go (pki, tepi, mitm) dan dart analyze
make -C labs/t3-mitm mutasi                   # uji mutasi, ±2 menit (bagian "Uji mutasi")
```

Butuh Docker, Go, dan Dart. Bila Go atau Dart tidak ada di PATH, lab berhenti dengan `GAGAL:` yang menyebut alatnya. `dart pub get` memakai dio 5.11.0 dan crypto 3.0.7 dari `dart/pubspec.lock`. Lajur kerja lain memakai `COMPOSE_PROJECT_NAME`, `LAB_DB_PORT`, dan `LAB_PORT_OFFSET` (`labs/README.md`). Lab ini memakai port dasar `api-t3` (18180) ditambah 18190 sampai 18193, jadi tidak boleh jalan bersamaan dengan `api-t3`, `t3-pool`, atau `t3-outbox` di lajur yang sama. 

Setiap bagian membuat ulang schema `tahap3` dan data awalnya dari nol. Lab gagal keras bila port dipakai proses lain atau hasilnya meleset dari yang diharapkan.

| Bagian | File | Peran |
|---|---|---|
| `go/cmd/pki` | CA dan sertifikat acak | CA Lab Publik (diperankan sebagai CA yang dipercaya sistem), CA Dimas, CA Staging, tiga kunci server (A, B, C), satu penerbitan ulang dengan kunci A. Daun berlaku 200 hari |
| `go/cmd/tepi` | Server tepi (port 18190, HTTP 18191) | TLS, `Strict-Transport-Security`, log akses dengan Authorization dan Cookie disamarkan, di depan api-t3 |
| `go/cmd/mitm` | Proxy tiruan hotspot Dimas (18192 TLS, 18193 tanpa TLS) | Memalsukan sertifikat dengan CA Dimas, merekam request, boleh mengubah nominal dan tujuan |
| `dart/bin/client.dart` | Client Dart | Satu request per perintah: `validasi`, `terima-semua`, `pin-badcallback`, `pin-spki`, `pin-cert`, `dio-validate`, `dio-pin-factory` |

## Rekaman

| Rekaman | Isi | Halaman |
|---|---|---|
| `m26.txt` | A: tanpa TLS. B: validasi menolak sertifikat tiruan. C: flag terima-semua, dari staging ke rilis. D: CA Dimas ada di daftar akar. E: Dimas memakai token yang dibacanya | 3.24 |
| `pin.txt` | A: pin SPKI menolak tiruan walau CA dipercaya. B: pin di `badCertificateCallback` tidak dipanggil. C: rotasi dengan dan tanpa cadangan. D: pin SPKI lawan pin daun. E: masa berlaku 200 hari | 3.25 |
| `dio.txt` | A: klaim cfug/dio#2418 diuji. B: pin di `connectionFactory` menolak sebelum request | 3.25 |
| `hsts.txt` | A: server tepi. B: client yang menyimpan HSTS (curl). C: alamat IP | 3.25 |
| `token.txt` | A: umur token 15 menit. B: redaksi log | 3.25 |

## Cara merekam

Hotspot Dimas diperankan dengan mengarahkan client ke port proxy, dengan nama host yang sama (`localhost`) seperti ke server asli. Validasi sertifikat dan pin berjalan persis seperti di jaringan sungguhan. Yang tidak diuji adalah routing hotspot (DNS dan pengalihan koneksi): Tidak dijalankan.

Daftar akar app diatur lewat `SecurityContext(withTrustedRoots: false)` dengan CA yang disebut di tiap perintah, supaya hasilnya tidak bergantung pada trust store mesin. "CA Lab Publik" memerankan CA yang dipercaya sistem. Di HP sungguhan, daftar akar itu adalah trust store sistem. Bagaimana CA Dimas bisa sampai di daftar akar (profil dipasang di HP, CA yang salah menerbitkan): Tidak dijalankan.

Pin, serial, dan hash sertifikat acak di setiap run, jadi rekaman memakai nama (A, B, C, `spki_server-a`) dan hasil (terhubung atau ditolak). Lab memeriksa jawaban client, request yang proxy baca, isi database (`jurnal` dan `posting`), dan isi log server tepi. Rekaman memakai port dasar, bukan port dengan offset lajur. Versi Dart dan dio tertulis di kepala setiap rekaman yang memakai client Dart.

"Request tidak pernah keluar" dibuktikan dari sisi proxy dan database: proxy menerima handshake dan nol request, dan tidak ada transfer di database. Proxy menulis rekaman saat request masuk, dan lab menunggu 0,4 detik sesudah client selesai sebelum membacanya.

## Yang terekam (Rekaman lab)

- **Tanpa TLS** (`m26.txt` A). Request Rp10.000 ke Citra diubah proxy menjadi Rp150.000 ke Dimas. Server menjawab 201 dan mencatat satu transfer yang seimbang: Budi −150.000, Dimas +150.000. Saldo Budi turun dari Rp250.000 ke Rp100.000. Server tidak punya yang bisa ditolak: token sah, jurnal seimbang, batas harian terpenuhi.
- **Validasi menolak tiruan** (B). Client yang hanya mempercayai CA Lab Publik menolak sertifikat CA Dimas pada handshake. Proxy melihat handshake, nol request, dan database tanpa transfer.
- **Flag terima-semua** (C). Staging memakai sertifikat dari CA buatan sendiri, validasi menolaknya, dan flag membuatnya jalan. Flag yang sama di build rilis membiarkan proxy membaca header Authorization (sama dengan token Budi) dan mengubah request. Callback flag dipanggil sekali.
- **CA Dimas di daftar akar** (D). Tanpa flag, validasi lolos dan hasilnya sama dengan C. Validasi sertifikat yang benar tidak cukup bila daftar akar berisi CA yang salah.
- **Token dipakai Dimas** (E). Token yang dibaca proxy dipakai dari laptop Dimas untuk transfer Rp150.000. Riwayat Budi menunjukkan satu kiriman keluar ke Dimas.
- **Pin SPKI menahan CA yang dipercaya** (`pin.txt` A). Dengan CA Dimas di daftar akar, pin A dan B tetap menolak sertifikat tiruan sesudah handshake dan sebelum byte HTTP pertama. Proxy melihat nol request.
- **Pin di `badCertificateCallback` tidak menahan** (B). Callback hanya dipanggil bila validasi bawaan gagal. Dengan CA Dimas dipercaya callback dipanggil 0 kali dan proxy membaca request. Bila CA Dimas tidak dipercaya, callback dipanggil dan menolak, sama dengan validasi biasa.
- **Rotasi** (C). Pin A saja: server pindah ke kunci B dengan sertifikat yang sah, app tidak bisa terhubung, dan tepi tidak menerima request. Pin A dan B: jalan terus saat server pindah ke B. Rotasi kedua ke C mematikan pin A dan B; pin B dan C jalan. Dari 7 request client di bagian itu, 5 sampai ke tepi dan 2 yang ditolak pin tidak ada di log tepi.
- **Pin SPKI lawan pin daun** (D). Penerbitan ulang dengan kunci yang sama menjaga pin SPKI dan mengganti hash sertifikat. Pin SPKI lama lolos, pin daun lama ditolak.
- **Masa berlaku** (E). Daun lab berlaku 200 hari. Dengan jam tiruan di Go, hari ke-199 lolos dan hari ke-201 ditolak. Jumlah penerbitan ulang per tahun (365 ÷ masa berlaku: 1,83, 3,65, 7,77) dihitung, bukan direkam.
- **dio#2418** (`dio.txt` A). Kode dio 5.11.0: `request.close()` di baris 161, `validateCertificate!(` di baris 195. Di lab, callback menolak sertifikat tiruan, tetapi proxy sudah membaca Authorization dan body, server asli sudah mencatat transfer, dan app menampilkan galat sertifikat. Klaim terbukti untuk dio 5.11.0 dengan adapter bawaan.
- **Mekanisme yang dipilih** (B). Pin di `HttpClient.connectionFactory` (dart:io), dipasang ke dio lewat `createHttpClient`: proxy menerima handshake, nol request, database tanpa transfer. Kontrol ke server asli berjalan normal.
- **HSTS** (`hsts.txt`). Port HTTP menjawab 301 tanpa header HSTS; jawaban TLS, termasuk 401, membawa `max-age=31536000; includeSubDomains`. Dengan cache curl yang kosong, permintaan `http://` pertama sampai ke server sebagai teks biasa. Sesudah satu jawaban TLS, curl menaikkan `http://` ke `https://` sebelum meninggalkan client. Alamat IP tidak disimpan di cache.
- **Umur token** (`token.txt` A). `-umur-sesi 15m` memberi `kedaluwarsa_detik` 900. Token yang dibaca proxy berlaku pada menit 1 dan menit 14,5, dan ditolak 401 pada menit 15,5 (jam server dimajukan lewat `POST /lab/jam`, waktu tidak ditunggu).
- **Redaksi log** (B). Server tepi yang menyamarkan Authorization dan Cookie: token muncul 0 kali di log tepi dan 0 kali di log api-t3. Varian rentan yang menyalin header: token muncul 2 kali (satu dari Authorization, satu dari Cookie).

## Temuan yang mengubah cara M26 dan ADR 31 ditulis

1. Validasi sertifikat yang aktif tidak cukup. Ia menahan CA yang tidak dipercaya (B), tetapi tidak menahan CA yang sudah ada di daftar akar (D). Itu alasan pin ada.
2. Pin yang ditaruh di `badCertificateCallback` tidak berfungsi justru pada kasus yang ingin ditahan pin: callback tidak pernah dipanggil bila CA dipercaya.
3. `validateCertificate` di dio menolak terlambat: transfer sudah diproses server asli. Akibat untuk app: layar menampilkan galat sertifikat padahal uang sudah pindah, dan pembaca yang mencoba lagi memakai key idempotency (ADR 14) atau tidak.
4. Pin cadangan menahan satu rotasi, bukan dua. Rilis app berikutnya harus mem-pin kunci yang akan datang sebelum rotasi sesudahnya.
5. Pin SPKI tahan penerbitan ulang selama kuncinya dipakai ulang; pin daun mati di setiap penerbitan ulang. Dengan masa berlaku maksimum 200 hari (R3-18), pin daun mati paling sedikit 1,83 kali per tahun.
6. Token berumur 15 menit membatasi lamanya pencurian, bukan menghentikannya: yang dibaca proxy tetap berguna sampai umurnya habis.
7. HSTS tidak melindungi permintaan pertama (RFC 6797 §14.6) dan tidak berlaku untuk alamat IP (§8.1.1); ia melindungi dasbor, bukan app Flutter.
8. Log yang menyalin header membuat token terbaca oleh siapa pun yang membaca log. Redaksi harus mencakup Authorization dan Cookie.

## Dependency lab

Hanya client Dart yang punya dependency di luar SDK, dan hanya untuk lab ini (`dart/pubspec.yaml`, versi persis, `pubspec.lock` di-commit):

| Paket | Versi | Lisensi | Alasan |
|---|---|---|---|
| dio | 5.11.0 | MIT | Yang diuji adalah perilaku dio (klaim cfug/dio#2418), jadi dio tidak bisa diganti `dart:io`. 5.11.1 (2026-09-04) memuat baris yang sama di `io_adapter.dart` dan tidak menyebut `validateCertificate`; 5.11.0 dipakai karena itu yang dibaca dan dijalankan |
| crypto | 3.0.7 | BSD-3-Clause | SHA-256 untuk pin; `dart:io` tidak punya fungsi hash |

Program Go memakai stdlib saja (`go/go.mod` tanpa `require`). Keputusan 979.

## Yang tidak ada di lab ini

- **mitmproxy v12.3.0: Tidak dijalankan.** Brief tugas menyebut mitmproxy di container. Lab memakai proxy tiruan ±150 baris Go (stdlib) supaya CA, nama sertifikat, dan perilakunya terkendali dan tanpa image baru. Yang direkam (menerbitkan sertifikat palsu per nama, membaca dan mengubah request) sama dengan yang dilakukan alat seperti mitmproxy. Lab tidak diuji dengan mitmproxy (keputusan 977).
- **Flutter di Android atau iOS: Tidak dijalankan.** Client adalah Dart CLI di macOS. `HttpClient` dari dart:io adalah dasar dio dan client Flutter. Perilaku di Android dan iOS (daftar akar sistem, Network Security Config) tidak direkam [perlu verifikasi].
- **dio 5.11.1 dan PR cfug/dio#2512: Tidak dijalankan.** Changelog 5.11.1 (2026-09-04) tidak menyebut `validateCertificate`, dan kode `io_adapter.dart` di tag `dio_v5.11.1` memuat `request.close()` di baris 161 dan `validateCertificate!(` di baris 195, sama dengan 5.11.0 (dibaca, tidak dijalankan). PR #2512 terbuka saat lab ditulis dan menambah `connectionFactory` di dalam dio (R3-74).
- **flutterfire#17602: Tidak dijalankan.** Isu itu tentang token FCM, bukan TLS; milik lab `t3-outbox` dan halaman 3.13.
- **HSTS di browser dan preload list: Tidak dijalankan.** Client HSTS yang diuji hanya `curl --hsts` (curl 8.7.1 di macOS; versi tidak direkam).
- **Pin Dart di Flutter Web: Tidak dijalankan.**
- **Refresh token, penyimpanan token di app, dan pencabutan token: Tidak dijalankan.** api-t3 hanya punya sesi dengan umur tetap.
- **Perilaku bawaan log Caddy: Tidak dijalankan.** Dokumentasi Caddy menyebut Authorization dan Cookie ditulis REDACTED secara bawaan (R3-78); lab merekam server tepi buatannya sendiri.
- **Masa berlaku 100 dan 47 hari (SC-081v3): dihitung, tidak ditunggu.** Verifikasi dengan jam tiruan dilakukan di Go (`x509.Verify`), karena Dart tidak punya jam tiruan.
- **Satu mesin.** Client, proxy, server tepi, api-t3, dan PostgreSQL berjalan di satu laptop. Hasil tidak bergantung pada waktu, tetapi bergantung pada versi Dart (pesan galat handshake) dan curl.

## Uji mutasi

`make -C labs/t3-mitm mutasi` mengubah satu hal di kode, menjalankan bagian rekaman yang menjaganya, lalu mengembalikan file-nya. Rekaman harus gagal lewat assertion lab (`GAGAL: ...`) atau tes Go yang gagal (`--- FAIL`). Kompilasi rusak atau traceback juga membuat exit tidak nol, tetapi `mutasi.py` menandainya `TANPA-SEBAB` dan menghitungnya menyimpang. Hasil terakhir (2026-10-25):

| Mutasi | Perubahan | Bagian | Hasil |
|---|---|---|---|
| `tanpa-pemeriksaan-pin` | client tidak memeriksa pin sesudah handshake | `pin` | Dibunuh: sertifikat tiruan diterima |
| `pin-hash-berubah` | pin yang diberikan ke client dibalik urutan hurufnya | `pin` | Dibunuh: pin A dan B menolak server asli |
| `tanpa-pin-cadangan` | client hanya mem-pin A saat server pindah ke B | `pin` | Dibunuh: app tidak bisa terhubung ke server B |
| `terima-sertifikat-apa-saja` | mode `validasi` menerima semua sertifikat | `m26` | Dibunuh: sertifikat tiruan diterima |
| `flag-staging-ditolak` | flag terima-semua mengembalikan `false` | `m26` | Dibunuh: staging tidak bisa dipakai |
| `proxy-tidak-mengubah` | proxy meneruskan request tanpa mengubahnya | `m26` | Dibunuh: database memuat Rp10.000 ke Citra, bukan Rp150.000 ke Dimas |
| `dio-pin-di-factory` | pin dio dipindah ke `connectionFactory` | `dio` | Dibunuh: dio menolak sebelum request, bukan sesudahnya |
| `daun-398-hari` | daun lab berlaku 398 hari | `pin` | Dibunuh: masa berlaku 398, harus 200 |
| `log-tidak-disamarkan` | server tepi menyalin Authorization ke log | `token` | Dibunuh: token muncul 2 kali di log tepi |
| `cookie-tidak-disamarkan` | server tepi menyalin Cookie ke log | `token` | Dibunuh: token muncul 1 kali di log tepi |
| `cookie-tidak-disamarkan-tes-go` | perubahan yang sama, dijalankan lewat `go test` | `go-test` | Dibunuh oleh tes Go `cmd/tepi` |
| `umur-token-16-menit` | server memberi umur sesi 16 menit | `token` | Dibunuh: `kedaluwarsa_detik` 960, harus 900 |
| `tanpa-hsts` | server tepi tanpa header HSTS | `hsts` | Dibunuh: header HSTS tidak ada di jawaban TLS |
| `hsts-di-port-http` | port HTTP ikut mengirim HSTS | `hsts` | Dibunuh: port HTTP mengirim HSTS |
| `proxy-tidak-mencatat-handshake` | proxy tidak mencatat handshake yang masuk | `pin` | Dibunuh: pemeriksaan handshake gagal |
| `proxy-bind-semua-antarmuka` | proxy diminta mendengar di `0.0.0.0` | `m26` | Dibunuh: proxy berhenti dengan `GAGAL:` bukan loopback |
| `pagar-menerima-semua-alamat` | `pagar.Loopback` menerima alamat apa saja | `go-test` | Dibunuh oleh tes Go `internal/pagar` |
| `daftar-akar-sistem-ikut` | client memakai akar sistem selain CA yang disebut | `m26` | **Lolos** (lihat di bawah) |

Tujuh belas dari delapan belas mutasi dibunuh. Satu lolos dan memang tidak bisa dibunuh oleh rekaman: `SecurityContext(withTrustedRoots: true)` menambah akar sistem, dan CA Dimas tidak ada di trust store mesin ini, jadi hasilnya sama. Karena itu `withTrustedRoots: false` hanya menjaga lab tidak bergantung pada trust store, dan tidak terbukti oleh rekaman.

## Keterbatasan uji

- Pernyataan "nol request" memakai jeda 0,4 detik. Proxy yang menulis rekaman lebih lambat dari itu lolos dari pemeriksaan jumlah request. Pemeriksaan database dan handshake ikut menjaganya, tetapi database dibaca sesudah jeda yang sama.
- Mutasi yang hanya mengubah alasan penolakan (pesan galat handshake) tidak terbunuh karena rekaman mencatat alasannya, tidak memeriksanya.
- Hasil di Android dan iOS, mitmproxy, dan browser belum diuji (bagian di atas).
