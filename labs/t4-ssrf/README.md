# Lab t4-ssrf · verifikasi defensif fetcher gambar versi aman

Lab Tahap 4 (`plan/CERITA-TAHAP-4.md`, bagian 3b dan tabel "Yang harus bisa dibuktikan lab"; masalah M36; ADR 41; Keamanan 8; tugas `lab-t4-ssrf`). Lab ini memeriksa dua hal tentang fetcher gambar versi aman di `labs/api-t4/internal/unduh`. Pertama, apakah ia menepati tiap batas ADR 41 dari dua sisi. Kedua, apakah daftar alamat yang ditolaknya lengkap.

**Lab ini dipersempit dari blok tugas aslinya (keputusan 1239).** Blok tugas meminta juga demonstrasi versi rentan terhadap layanan tiruan di jaringan container (butir a sampai d). Pekerjaan itu dihentikan oleh pemeriksa keamanan saat disusun, lalu pengatur memutuskannya di luar lingkup. Bagian itu tertulis di bawah sebagai Tidak dijalankan di lab ini, dengan rujukan ke apa yang sudah ada di `api-t4`. Pemilik memutuskan apakah halaman 4.20 dan 4.21 cukup bersandar pada rekaman `api-t4` dan lab ini.

Lab ini tidak memakai database dan tidak memakai Docker. Semua tes berjalan di dalam proses Go, dan setiap server uji hanya mendengar di `127.0.0.1`. Sertifikat https dibuat di memori untuk satu tes dan tidak ditulis ke file atau dipasang di store sistem. Tidak ada permintaan ke alamat di luar mesin; resolver buatan menggantikan DNS di tes yang butuh nama. Karena tidak ada keadaan yang disimpan, tidak ada schema atau saldo yang direkam.

## Menjalankan

```bash
make -C labs/t4-ssrf run                  # semua bagian, ±20 detik, menulis labs/t4-ssrf/output/*.txt
make -C labs/t4-ssrf run BAGIAN=alamat    # satu bagian: batas alamat testing
make -C labs/t4-ssrf cek                  # rekam ulang; gagal bila output/ berbeda dari yang di-commit
```

Butuh Go (go1.27.1 dipakai saat lab ditulis). Kode yang diperiksa dan tesnya ada di `labs/api-t4/internal/unduh`; tes lab ini memakai tag build `t4ssrf` (`ssrf_batas_test.go`), jadi tes bawaan `api-t4` dan rekamannya tidak berubah. Waktu hanya diperiksa sebagai batas di dalam tes dan tidak dicetak. `run.py` gagal bila satu tes bertag dilewati, gagal, atau tidak muncul sebagai PASS. Pola `-run` yang tidak cocok membuat tes tidak pernah berjalan, dan penjaga itu menutupnya.

## Rekaman

| Rekaman | Isi | Halaman |
|---|---|---|
| `batas.txt` | Batas ADR 41 dari dua sisi: skema `http` ditolak sebelum permintaan, https dengan sertifikat yang dipercaya diterima, sertifikat asing ditolak; redirect 300, 301, 302, 303, 304, 307, dan 308 tidak diikuti dan server tujuannya tidak tersentuh; tepat 2 MiB diterima dan 2 MiB + 1 byte ditolak (dengan dan tanpa Content-Length), `Content-Length` 1 GiB ditolak sebelum isi dibaca; batas 3 detik untuk seluruh unduhan (menjawab sesudah 1 detik diterima, tidak pernah menjawab dan isi yang menetes ditolak di antara 3 dan 5 detik); hanya status 200; hanya PNG, JPEG, GIF, dan WebP menurut byte awal, dan header `Content-Type` tidak dipercaya; header jawaban paling besar 64 KiB (32 KiB dan 60 KiB diterima, 68 KiB, 128 KiB, dan 11 MiB ditolak); masukan ekstrem yang gagal tertutup (host 100.000 karakter dan path 2 MiB ditolak oleh resolver buatan dan oleh server uji, bukan oleh batas di fetcher; rantai redirect tanpa akhir, jawaban DNS 4.097 alamat dengan satu alamat private di ujung, dan alamat terlarang di urutan kedua jawaban DNS); 13 bentuk URL rusak atau tanpa host ditolak sebelum ada resolusi nama; nama dengan dua alamat tetap bisa diunduh bila alamat pertama tidak menjawab; pesan galat tanpa isi respons, alamat, atau port, dan satu pesan untuk semua penolakan karena alamat literal; satu batas yang belum tertutup (nama yang ada lawan nama yang tidak ada); URL bernama IDNA ditolak | 4.20, 4.21 |
| `alamat.txt` | Untuk 37 alamat: jawaban empat penanda bawaan Go (`IsPrivate`, `IsLoopback`, `IsLinkLocalUnicast`, `IsUnspecified`) dan keputusan fetcher aman. Hasil: 32 dari 32 alamat terlarang ditolak, 5 alamat publik sebagai kontrol lolos, dan 29 dari 32 alamat terlarang lolos bila `IsPrivate` satu-satunya pemeriksaan (Hitungan dari rekaman ini); 26 dari 32 tetap lolos bila hanya empat penanda di tabel yang diperiksa. Bagian kedua menguji 19 alamat IPv6 terlarang dengan zona (`%1` dan `%eth0`): 19 dari 19 ditolak, dan dua alamat publik berzona lolos. Bagian ketiga menguji tepi 27 blok registri IANA dari dua sisi: 54 tepi dalam ditolak (54 dari 54), 39 tepi luar lolos (39 dari 39), dan 4 alamat yang terjangkau global menurut registri lolos | 4.21 |
| `testing.txt` | `go vet` dengan dan tanpa tag, tes bawaan `api-t4` untuk paket `unduh` (20 fungsi, tanpa tag), dan penjaga bahwa tiap dari 14 fungsi tes bertag muncul sebagai PASS | 4.21 |

Rekaman ulang identik per byte (`make cek`, dijalankan dua kali). Alamat contoh private dan link-local di `alamat.txt` adalah angka karangan lab; alamat metadata instance cloud dan IMDSv2 tidak dijalankan dan tidak ditulis sebagai tujuan.

## Cakupan terhadap blok tugas

| Butir blok tugas | Keadaan | Yang ada |
|---|---|---|
| (a) fetcher rentan menjangkau tujuan di jaringan container, pesan galat memuat sebagian isi respons | Tidak dijalankan di lab ini | `api-t4`: tes `TestRentanPesanGalatMembocorkanIsiLayananDalam` di `internal/unduh/unduh_test.go` (namanya tercatat PASS di `labs/api-t4/output/testing.txt`). Rekaman tingkat endpoint untuk mode `unduh-rentan` tidak ada: `output/rentan.txt` hanya menyebut nama mode, dan `output/fitur.txt` bagian F merekam versi aman yang menolak satu URL |
| (b) redirect dari alamat luar ke alamat dalam lolos di versi rentan | Tidak dijalankan di lab ini | `api-t4`: `TestRentanMengikutiRedirectKeAlamatDalam`. Sisi aman direkam di sini: `batas.txt` bagian redirect |
| (c) deny-list string dilewati bentuk alamat lain | Tidak dijalankan di lab ini | `api-t4`: `TestRentanDenyListDilewatiBentukLainAmanMenolak` mengukur, di platform yang menjalankannya, bentuk mana yang lolos, dan mencetak daftarnya ke `testing.txt`. Daftar itu bergantung resolver sistem (macOS memakai `getaddrinfo`, binary statik Linux memakai resolver Go murni), jadi lab ini tidak merekamnya sebagai hasil tetap |
| (d) `Dialer.ControlContext` menolak semuanya, termasuk saat nama diselesaikan ke alamat berbeda di antara dua pemeriksaan | Sebagian, di `api-t4` | `api-t4`: `TestAmanDNSRebindingDitolakDiControlContext` (resolver buatan menjawab alamat publik lalu loopback), `TestAmanJawabanDNSCampuranDitolakUtuh`, dan `TestAmanNamaYangMenunjukKeAlamatDalamDitolak`. Lab ini menambah uji mutasi: menghapus pemeriksaan di `ControlContext` atau membuat resolusi kedua mengabaikan resolver buatan ditangkap tes (mutan D02 dan D03). Tidak ada rekaman jaringan container |
| (e) hanya https, redirect dimatikan, 2 MB dan 3 detik, tipe dari byte, pesan galat tanpa isi respons | Dijalankan | `batas.txt` |
| (f) dial ke nama IDNA (golang/go#80417); `IP.IsPrivate` tidak cukup (golang/go#79925) | Dijalankan sebagian | `batas.txt` bagian IDNA menjaga hasil (ditolak, nol permintaan) dan `alamat.txt` mencatat 29 dari 32 alamat terlarang lolos bila `IsPrivate` satu-satunya pemeriksaan. Bukti dial sungguhan ke alamat CGNAT atau link-local di jaringan container: Tidak dijalankan |
| Alamat metadata instance cloud dan IMDSv2 | Tidak dijalankan | Sumber: OWASP SSRF Prevention Cheat Sheet (naskah, riset R4-14); tidak ada tes |
| "Proses pengunduh tidak diberi akses jaringan ke layanan dalam yang tidak perlu" (ADR 41) | Tidak dijalankan | Ini keputusan penempatan, bukan perilaku kode; tidak ada jaringan container di lab ini |

## Temuan

1. **Daftar alamat terlarang tidak lengkap (diperbaiki, keputusan 1238).** Daftar `alamatKhusus` di `unduh.go` ditulis tangan. Daftar itu dibandingkan dengan registri alamat khusus IPv6 IANA (versi 2025-10-09, diunduh 2026-10-28). Delapan alamat uji lolos: awalan NAT64 lokal 64:ff9b:1::/48, 100:0:0:1::/64, benchmark 2001:2::/48 (di dalam 2001::/23), dokumentasi 2001:db8::/32 dan 3fff::/20, SRv6 5f00::/16, serta dua blok usang `::/96` (IPv4-compatible) dan `fec0::/10` (site-local) yang tidak ada di registri. Kode lama menolak 24 dari 32 alamat uji. Perbaikannya menambah delapan awalan (`2001::/23` memuat awalan `2001::/32` yang sudah ada); kode baru menolak 32 dari 32. Tes `TestSSRFKelasAlamatIsPrivateTidakCukup` gagal pada kode lama dengan delapan pesan "tidak ditolak fetcher aman". Yang dicakup awalan ini hanya penolakan alamat tujuan; tidak ada jalur jaringan yang direkam menuju alamat itu.
2. **Pesan galat membedakan nama yang ada dari yang tidak ada (belum diperbaiki).** Untuk alamat literal, semua penolakan satu pesan ("tujuan tidak diizinkan"). Untuk nama, nama yang diselesaikan ke alamat terlarang dijawab "tujuan tidak diizinkan" dan nama yang tidak ada dijawab "tidak menjawab". Pemanggil yang mencoba banyak nama bisa membedakan nama yang ada dari yang tidak. ADR 41 menulis "pesan kesalahan tanpa isi respons" dan tidak menyebut nama; yang terbukti hanya bagian pertama. Dicatat sebagai polesan untuk Setelah Tahap 4; `TestSSRFBatasPesanMembedakanNamaDikenalDariTidakDikenal` menetapkan perilaku saat ini dan harus diubah bila pesannya disamakan.
3. **Header jawaban tidak dibatasi (diperbaiki, keputusan 1240).** Batas 2 MiB hanya berlaku untuk isi. Tanpa batas lain, `http.Transport` menerima header jawaban sampai 10 MiB (kode sumber go1.27.1, `net/http/transport.go`; dokumentasinya hanya menulis "default limit"). Satu impor katalog mengunduh delapan gambar serentak, jadi satu server yang sengaja mengirim header besar bisa menahan sampai 80 MiB (8 × 10 MiB, Hitungan). Kode kini memasang `MaxResponseHeaderBytes` 64 KiB (`BatasHeader`, Asumsi lab). Tes `TestSSRFBatasMasukanEkstremGagalTertutup` gagal pada kode lama: header 128 KiB diterima. Memori yang sebenarnya ditahan tidak diukur; 80 MiB adalah batas atas dari hitungan itu.
4. **Status 2xx selain 200 ditolak, dan hanya empat tipe gambar diterima.** Fetcher aman menolak 201, 202, 203, 204, dan 206 walau isinya PNG sah (jawaban `ErrGagal`). ADR 41 tidak menyebut status; ini perilaku kode yang kini dijaga tes.
5. **Penyebab penolakan nama IDNA bergantung jalur.** Pada go1.27.1, client HTTP memetakan nama lebar penuh ke alamat ASCII saat menghubungi (diamati tangan, tidak direkam). Penolakan oleh fetcher aman datang dari pemeriksaan di `ControlContext` pada alamat yang dihubungi, atau lebih awal dari resolusi nama yang gagal, tergantung resolver. Tes hanya menjaga hasilnya. Status isu golang/go#80417: terbuka (dibaca 2026-10-28), dengan dua CL yang menyebutnya; perilaku di versi Go sesudahnya [perlu verifikasi].
6. **Zona IPv6 melewati daftar alamat khusus (diperbaiki oleh peninjau, keputusan 1241).** `netip.Prefix.Contains` menjawab false untuk alamat yang punya zona (dokumentasi paket `netip`), sedangkan `url.Hostname()` dan `netip.ParseAddr` menyimpan zonanya dan `net.Dialer` meneruskannya ke `ControlContext`. Akibatnya `alamatDilarang` tidak pernah mencocokkan alamat IPv6 berzona dengan `alamatKhusus` di penyaring awal maupun di `ControlContext`: `http://[64:ff9b::a00:1%251]/` dan bentuk berzona dari delapan awalan lain lolos. Pada kode sebelum perbaikan 13 dari 19 alamat IPv6 terlarang berzona lolos (12 bentuk berzona dari awalan di daftar dan `::%1`; ULA, link-local, loopback, multicast, dan IPv4-mapped tetap ditolak karena penandanya memeriksa bit alamat, sedangkan `IsUnspecified` membandingkan seluruh nilai termasuk zona). Perbaikannya satu baris: zona dibuang sebelum `Unmap`. `TestSSRFKelasAlamatBerzonaSamaDenganTanpaZona` memeriksa klasifikasi murni tanpa jaringan dan gagal pada kode sebelumnya; bahwa zona sampai ke `ControlContext` diperiksa dengan dial yang dibatalkan sebelum `connect` (probe peninjau, tidak direkam). Koneksi sungguhan ke alamat berzona tidak dijalankan.
7. **Satu blok registri IPv4 belum ada di daftar (diperbaiki oleh peninjau, keputusan 1241).** Tepi tiap blok registri yang tidak terjangkau global (atau usang) diturunkan dari file registri yang sama dan diuji dari dua sisi. Hasilnya satu selisih: `192.88.99.0/24` (anycast relay 6to4, usang menurut RFC 7526; registri menandai `192.88.99.2/32` tidak terjangkau global) tidak ditolak. Blok itu ditambahkan ke `alamatKhusus`. Alamat IPv6 yang jatuh di `::/8` dicadangkan IETF tetapi di luar blok yang terdaftar (misalnya `::ffff:0:a00:1`, IPv4-translated usang menurut RFC 2765) tetap lolos; tidak ada host sungguhan di sana dan daftar ini mengikuti registri, jadi dicatat sebagai polesan.

## Selisih dengan naskah

Naskah tidak diubah. Yang terbaca dari lab ini untuk KONSISTENSI-4:

- ADR 41 menulis daftar kelas yang ditolak ("loopback, private, link-local, ULA IPv6, dan bentuk IPv4-mapped"). Kode menolak lebih banyak (awalan registri IANA di atas); halaman memakai rekaman `alamat.txt`.
- "Dial ke nama IDNA [perlu verifikasi: golang/go#80417]": tetap [perlu verifikasi] untuk versi Go sesudah go1.27.1. Yang terbukti hanya hasil di go1.27.1: ditolak, nol permintaan.
- Tabel "Yang harus bisa dibuktikan lab" menulis `t4-ssrf` merekam redirect, deny-list, dan jaringan container dari fetcher rentan. Bagian itu belum terekam di tingkat endpoint di mana pun; hanya tes bawaan `api-t4` yang memeriksanya.

## Uji mutasi

Skrip: `make -C labs/t4-ssrf mutasi` (±20 menit; butuh Docker; hasil dicetak, tidak ditulis ke `output/`). Tiap mutan mengubah satu hal di salinan `internal/unduh/unduh.go` atau `internal/klien/klien.go` (tiga mutan gabungan, C01 sampai C03, mengubah beberapa lapis sekaligus). Tes dikompilasi sebagai biner Linux dan dijalankan di container tanpa jaringan (`--network none`), supaya mutan yang melemahkan pemeriksaan alamat tidak bisa menyambung ke jaringan mesin. Yang dijalankan adalah tes bawaan `api-t4` untuk paket ini ditambah tes bertag lab ini. Mutan yang tidak bisa dikompilasi tidak dihitung.

Hasil (80 mutan baru; 66 membuat suite gagal, satu (C01) membuat suite macet lewat 240 detik, 13 lolos):

| Kelompok | Mutan | Tertangkap | Lolos |
|---|---|---|---|
| Rentang alamat: tiap penanda bawaan, tiap awalan di `alamatKhusus` dibuang satu per satu, lebar awalan, IPv4-mapped | 37 | 34 | U06, U08, P11 |
| Skema dan URL | 3 | 3 | - |
| Batas ukuran isi dan header | 9 | 9 | - |
| Batas waktu | 6 | 3 | L07, R03, D08 |
| Redirect | 2 | 2 | - |
| Status dan tipe isi | 6 | 6 | - |
| Pesan galat | 7 | 5 | E02, E03 |
| Resolusi nama dan pemeriksaan awal | 7 | 5 | D04, X02 |
| Transport | 3 | 0 | D06, D07, C03 |

Tiga belas mutan yang lolos, dan kenapa tidak ditutup:

- **Setara karena lapis lain mencakup perilakunya (5):** U06 (multicast skop tautan ikut tertolak oleh `IsMulticast`), U08 (`0.0.0.0` dan `::` sudah di 0.0.0.0/8 dan ::/96), P11 (`2001::/32` ada di dalam `2001::/23`), D04 dan X02 (alamat literal yang lolos pemeriksaan awal ditolak lagi oleh `ControlContext` dengan galat yang sama).
- **Lapis ganda; mutan gabungannya tertangkap (5):** L07, R03, dan D08 membuang satu dari tiga batas waktu (context, `Timeout` client, `Timeout` dialer), dan C01 yang membuang ketiganya membuat suite macet. E02 dan E03 membuang satu dari dua pemetaan galat timeout, dan C02 yang membuang keduanya tertangkap.
- **Tidak teramati dengan server uji di loopback (3):** D06 (Go tidak memakai proxy untuk tujuan loopback) serta D07 dan C03 (transport dibuat per unduhan dan ditutup, jadi koneksi tidak dipakai ulang). Pemeriksaannya ada di kode tetapi tidak ada tes yang membuktikannya: Tidak dijalankan.

Dua mutan lolos pada tes yang pertama ditulis dan ditutup tes lanjutan: X01 (pemeriksaan awal hanya delapan jawaban DNS pertama) dan D01 (hanya jawaban pertama), dengan `TestSSRFBatasMasukanEkstremGagalTertutup` dan `TestSSRFBatasJawabanDNSDenganAlamatTerlarangDiUrutanKedua`. Sebelum label Content-Length diperbaiki, mutan L06 (`Content-Length` tepat 2 MiB ditolak) lolos karena server uji ternyata menjawab chunked; kini tes membuktikan header yang diterima client.

## Versi dasar dan sumber (dicek 2026-10-28)

| Komponen | Versi atau sumber | Catatan |
|---|---|---|
| Go | go1.27.1 (toolchain lokal) | tes dikompilasi juga sebagai biner linux/arm64 untuk uji mutasi di container `golang:1.27-alpine` (go1.27.1) tanpa jaringan |
| golang/go#80417 | terbuka, dibuka 2026-07-15, label NeedsInvestigation; CL 802060 dan 802080 menyebutnya | GitHub API, dibaca 2026-10-28 |
| golang/go#79925 | ditutup 2026-07-11 (`not_planned`): himpunan alamat `IsPrivate` tidak diubah, dokumentasi bukan tempat panduan SSRF | GitHub API, dibaca 2026-10-28 |
| Registri alamat khusus IANA IPv4 dan IPv6 | file XML bertanggal 2025-10-09, diunduh 2026-10-28 | dipakai untuk membandingkan daftar `alamatKhusus`; filenya tidak disimpan di repo |

Dependency baru: tidak ada. Tes memakai pustaka standar Go.

## Yang belum ada di lab ini

- Demonstrasi versi rentan terhadap layanan tiruan di jaringan container (butir a sampai d): Tidak dijalankan, lihat tabel cakupan.
- Rekaman tingkat endpoint `POST /merchant/katalog/impor` dengan `-rentan unduh-rentan`.
- Alamat metadata instance cloud dan IMDSv2: Tidak dijalankan.
- Perilaku proxy: client mengabaikan `HTTP_PROXY` (`Proxy: nil` di `unduh.go`). Go tidak memakai proxy untuk tujuan loopback, jadi perilaku ini tidak bisa diuji dengan server uji di loopback (mutan D06, setara di lab ini).
- Perilaku di cloud sungguhan, layanan terkelola, atau jaringan dengan NAT64: Tidak dijalankan. Awalan NAT64 khusus operator (RFC 6052 bagian 2.2) berasal dari ruang alamat operator itu dan tidak bisa didaftar di kode; yang menutupnya penempatan jaringan proses pengunduh (ADR 41), yang juga Tidak dijalankan.
