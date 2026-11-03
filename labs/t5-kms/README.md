# Lab t5-kms · envelope encryption file arsip partisi dengan OpenBao transit

Lab Tahap 5 untuk ADR 57 (naskah `plan/CERITA-TAHAP-5.md` bagian 3, 3b, dan 4; sumber halaman 5.26). Ia mengenkripsi file arsip partisi `posting` dengan satu data key AES-256-GCM per file. Data key dibungkus kunci pembungkus (KEK) di OpenBao (mesin transit). Yang tersimpan: file terenkripsi, data key terbungkus, versi KEK, dan checksum di `arsip_partisi`, ditambah satu baris jangkar di file di luar database.

File arsip yang dienkripsi dibuat dengan kode lab `t5-partisi` (riwayat posting, `DETACH PARTITION ... CONCURRENTLY`, ekspor CSV `lepas.ekspor`), bukan file yang tertinggal di folder sementara, supaya rekaman berasal dari database bersih. Skema dan data awal datang dari `labs/api-t5` (`dasar_t5.py`). Pihak ketiga adalah OpenBao di container lokal (mode dev). Jaringan hanya dipakai saat mengunduh image dan toolchain Go (sekali).

## Versi

| Komponen | Versi | Catatan |
| --- | --- | --- |
| Go | 1.27.3 | `go.mod` memakai `go 1.27.3`; modul `lab/t5kms` hanya memakai pustaka standar, tanpa dependency |
| OpenBao | v2.7.2, image `ghcr.io/openbao/openbao:2.7.2` | digest `sha256:5046911075e137e154ce49ab051502f4ec7cf367d484ae4a4dce665d9b90561f` (sama dengan lab `t4-infra`), 259 MB menurut `docker images`; rilis teratas di GitHub API pada 2026-11-03 (terbit 2026-10-26); file LICENSE tag v2.7.2: Mozilla Public License 2.0. Baris riset awal menulis v2.7.1 |
| PostgreSQL | 17.11 (`postgres:17`) | image yang sama dengan lab lain, dari cache lokal |
| psycopg | 3.3.6 | venv `labs/.venv` |
| SoftHSM | 2.7.0 | **Tidak dijalankan**. Hanya dicek bahwa rilisnya ada (terbit 2026-01-20). Dipakai halaman sebagai Ilustrasi |
| Client Go PKCS#11 | `github.com/miekg/pkcs11` v1.1.2 | **Tidak dijalankan**: bahwa ia bekerja dengan SoftHSM 2.7.0 [perlu verifikasi] |

Gerbang pemindai kerentanan ADR 44 (govulncheck, grype) **Tidak dijalankan** di lab ini: modulnya tanpa dependency, tetapi pemindaiannya butuh unduhan basis data kerentanan. Apakah Go 1.27.3 menutup temuan stdlib yang membuat `api-t4` gagal di Go 1.27.1 belum diperiksa.

Dokumentasi API transit OpenBao tidak bisa dibaca dari mesin ini (halaman openbao.org dirender JavaScript, dan sumbernya tidak ditemukan di jalur GitHub yang dicoba). Perilaku `rotate`, `rewrap`, `min_decryption_version`, dan `trim` di bawah bersumber **pengamatan lab pada v2.7.2**, bukan dokumentasi: [perlu verifikasi] terhadap dokumentasi sebelum halaman menulisnya sebagai klaim dokumentasi. Dokumentasi Go dibaca lewat `go doc crypto/cipher.NewGCMWithRandomNonce` pada toolchain 1.27.3 (R5-311). ID riset lain: R5-310 (versi OpenBao), R5-312 (perilaku transit), R5-313 (SoftHSM), R5-314 (syarat umur KEK).

## Isi lab

| File | Isi |
| --- | --- |
| `envelope/` | AES-256-GCM per file dengan `NewGCMWithRandomNonce`; data tambahan GCM = periode; data key harus 32 byte; `Arsipkan` (tujuan baru, `O_EXCL`, izin 0600), `Buka`, `VersiKEK` |
| `bao/` | client kecil `net/http` untuk transit: `datakey/plaintext`, `decrypt`, `rewrap` (token di header `X-Vault-Token`) |
| `jangkar/` | file JSONL di luar database yang hanya bertambah: satu baris per periode dan checksum |
| `cmd/kmsarsip` | `arsipkan`, `buka`, `rewrap`, `verifikasi`; OpenBao dari `BAO_ADDR`, `BAO_TOKEN`, `BAO_KUNCI`, jadi token tidak lewat argumen |
| `run.py` | penggerak rekaman: OpenBao mode dev, kunci KEK, tiga kebijakan dan token, arsip, pemalsuan, rotasi, jeda, restart |
| `output/` | `arsip.txt`, `rotasi.txt`, `testing.txt` |

Tes `envelope` memakai KMS tiruan di memori (kunci pembungkus lokal) dan mengubah setiap byte sebuah blob kecil satu per satu. Dua tes di `bao/` memakai OpenBao sungguhan dan dilewati bila `BAO_ADDR` kosong, kecuali `TES_KMS_WAJIB=1`. Bagian `testing` merekamnya dengan `TES_KMS_WAJIB=1`, jadi tes yang terlewat gagal, bukan lulus.

## Keputusan desain

- **Satu file, satu data key, satu pesan GCM di memori.** File lab 28.000 baris, ±1,3 MB. File arsip sebulan di naskah (36,5 juta posting, 9,1 GB) tidak muat dalam satu pesan di memori: enkripsi berpotongan (streaming) **Tidak dijalankan** dan tidak ditulis.
- **Nonce 96 bit acak, di depan ciphertext.** File = nonce (12 byte) + ciphertext + tag (16 byte). Tes Go membuka blob buatan `cipher.NewGCM` standar dengan nonce eksplisit dan sebaliknya, jadi bentuk dan panjang kunci (32 byte) terkunci.
- **Data tambahan GCM = periode.** File bulan itu tidak terbuka bila dibuka seolah file bulan lain.
- **Checksum = SHA-256 atas file terenkripsi**, bukan atas CSV, supaya pemeriksa jangkar tidak butuh KMS. Nilainya acak per rekaman (kunci dan nonce acak), jadi rekaman menulis hasil perbandingan, bukan nilainya.
- **Tiga peran, tiga kebijakan, satu jalur dengan satu hak (`update`) masing-masing:** `pengarsip` (`datakey/plaintext`), `pembuka` (`decrypt`), `pembungkus-ulang` (`rewrap`). KEK tidak punya jalur baca. Operator memegang token root mode dev (data lab, bukan secret).
- **Arsip hanya bertambah.** Tujuan yang sudah ada ditolak (`O_EXCL`). Jangkar menolak periode yang sama dengan checksum lain.
- **Pencatatan baris `arsip_partisi` dikerjakan penggerak lab (Python) sebagai role `api_t5`**, yang punya hak `SELECT` dan `INSERT`. Di sistem sungguhan job arsip yang menulisnya. Job Go di lab tidak menyentuh database.

## Menjalankan

```
make -C labs/t5-kms run                      # tiga bagian berurutan
make -C labs/t5-kms run BAGIAN=rotasi        # satu bagian: arsip rotasi testing
make -C labs/t5-kms cek                      # rekam ulang, lalu output/ harus identik dengan yang di-commit
make -C labs/t5-kms test                     # go vet dan go test tanpa OpenBao (tes OpenBao dilewati)
```

Butuh Docker, Go, dan image OpenBao (diunduh sekali bila belum ada). PostgreSQL lewat `labs/b3-race`. Container OpenBao bernama `t5kms-<LAB_DB_PORT>-bao` dan dihapus `run.py` sesudah tiap bagian. Port dasar 18330 (OpenBao, ditambah `LAB_PORT_OFFSET`). Lab ini memakai `dasar_t5.py` dan `labs/t5-partisi`, jadi tidak jalan bersamaan dengan lab Tahap 5 lain yang memakai `dasar_t5.py` dalam satu lajur.

## Rekaman

| File | Isi |
| --- | --- |
| `output/arsip.txt` | A: dua partisi dilepas dan diekspor. B: arsip dengan satu data key per file, baris `arsip_partisi`, jangkar, arsip tidak ditimpa. C: tanpa KMS tidak terbaca (data key file lain, token tanpa hak `decrypt`, token tidak dikenal; dengan hak, isi sama dengan file asal). D: satu bit diubah di lima posisi file, file terpotong dan diperpanjang, periode lain, satu byte di data key terbungkus. E: tiga cara memalsukan checksum dan siapa yang melihatnya |
| `output/rotasi.txt` | B: `rotate`, data key versi 1 tetap terbuka, data key baru versi 2. C: `rewrap` dan hak `UPDATE` dua kolom. D: `min_decryption_version` naik dan turun. E: `trim` dan akibatnya. F: OpenBao dijeda lalu dilanjutkan, lalu restart. G: umur KEK |
| `output/testing.txt` | `go vet` dan tes Go dengan OpenBao sungguhan |

Rekaman dari database dan container bersih, diulang dan identik per byte, juga di bawah beban CPU (10 proses sibuk). Angka yang bergantung mesin tidak direkam. Sengaja tidak direkam: nilai checksum, nonce, data key, token (semua acak), dan tanggal.

## Yang terbaca dari rekaman

- **Tanpa KMS tidak terbaca.** File terenkripsi tidak memuat baris CSV dan bukan UTF-8. Data key milik file lain menghasilkan galat GCM. Token `pengarsip` (hanya boleh membuat data key) dan token tidak dikenal dijawab 403 oleh OpenBao: galatnya datang dari KMS, bukan dari GCM. Lingkupnya: file arsip ini, dengan data key terbungkus yang tercatat.
- **Satu byte berubah gagal autentikasi GCM**, dicoba di byte pertama (nonce), awal ciphertext, tengah, ciphertext terakhir, dan byte terakhir (tag), juga pada file terpotong atau diperpanjang satu byte dan periode lain. Satu byte di data key terbungkus ditolak OpenBao (400). Tes Go mengubah semua byte sebuah blob kecil.
- **Versi KEK lama terbuka sampai `min_decryption_version` dinaikkan**, lalu ditolak (400, "too old"). Menurunkannya lagi membuka arsip itu kembali: kenaikan itu bisa dibalik, bukan pencabutan.
- **`rewrap` menghasilkan versi baru tanpa menjawab teks biasa**, dan file arsip tidak disentuh. Pencabutan sungguhan butuh `trim`, yang menghapus versi lama; sesudahnya arsip yang belum dibungkus ulang tidak bisa dibuka lagi. Urutan: rewrap semua, periksa `versi_kek`, naikkan `min_encryption_version` dan `min_decryption_version`, lalu `trim`.
- **Pemalsuan checksum.** File diubah: lawan database dan lawan jangkar sama-sama beda. Database dipalsukan oleh pemilik schema: hanya database yang beda dari file dan jangkar. File dan database diubah bersama: hanya jangkar yang melihatnya. Role aplikasi ditolak (42501) bila mengubah `checksum`.
- **OpenBao tidak tersedia = arsip tidak terbaca.** Container dijeda: pemulihan menunggu sampai batas waktu client (5 detik). Restart mode dev menghapus mount transit, jadi semua arsip yang dibungkus KEK itu tidak bisa dibuka (404).
- **Umur KEK** (Hitungan atas Asumsi naskah): 2^32 ÷ 438 juta = 9,8 tahun bila satu data key per posting (3 transaksi per user aktif per hari), 14,7 tahun dengan 292 juta (2 transaksi), dan tidak relevan dengan 12 data key per tahun. Syarat hitungan: satu pembungkusan memakai satu nonce acak di KEK, dan bahwa transit OpenBao memakai nonce acak [perlu verifikasi].

## Selisih dengan naskah (lab yang benar)

- Naskah ADR 57 menulis "`min_decryption_version` dinaikkan" sebagai langkah sesudah pembungkusan ulang. Langkah itu bisa dibalik. Pencabutan versi butuh `trim`, dan `trim` menolak bila `min_encryption_version` belum diisi. Sesudah `trim`, `min_decryption_version` tidak bisa diturunkan lagi di bawah versi yang tersisa.
- Role aplikasi hanya punya `SELECT` dan `INSERT` atas `arsip_partisi` (`api-t5`, daftar `HAK`). `rewrap` mengubah `kunci_data_terbungkus` dan `versi_kek`, jadi butuh `UPDATE` pada dua kolom itu saja. Lab merekam penolakan lalu `GRANT UPDATE (kunci_data_terbungkus, versi_kek)`; `checksum` dan `kunci_objek` tetap tertutup. Hak ini belum ada di `api-t5`; lab memberikannya di schema sendiri.
- Naskah menulis OpenBao yang tidak tersedia saat pemulihan membuat arsip tidak terbaca sampai ia hidup lagi (masuk RTO). Lab merekam itu (jeda), dan satu hal yang naskah belum menyebut: restart mode dev menghapus KEK, jadi arsip tidak bisa dibuka selamanya. Produksi memakai penyimpanan persisten, unseal, dan cadangan KEK: **Tidak dijalankan**.
- Naskah menulis checksum dicatat "di `arsip_partisi` dan di jangkar harian". Jangkar lab adalah satu file JSONL sendiri (pola `internal/jangkar` api-t4: file luar yang hanya bertambah), bukan jangkar `audit_log`. Penggabungan ke satu jangkar harian dengan rantai `audit_log`: **Tidak dijalankan**.
- Naskah menulis 438 juta posting per tahun dari 3 transaksi per user aktif dan menaruh 292 juta (2 transaksi) di sebelahnya. Lab menghitung keduanya dan tidak mengubah registry.

## Tidak dijalankan atau belum ada

Enkripsi berpotongan untuk file yang lebih besar dari memori, SoftHSM dan PKCS#11, penyimpanan objek sungguhan (file di folder sementara memerankannya), OpenBao mode produksi (penyimpanan persisten, unseal, audit device), rotasi otomatis (`auto_rotate_period`), kunci utama di HSM yang membungkus KEK, jangkar harian yang digabung dengan `audit_log`, pemulihan arsip terenkripsi ke tabel dan `ATTACH PARTITION` (rekaman `t5-partisi` berhenti di CSV tanpa enkripsi), dan enkripsi cadangan database (hanya file arsip).

## Uji mutasi

Tabel hasil ada di badan PR. Mutan Go (17) dijalankan dengan `go test ./...` dan harus kompilasi. Mutan penggerak (kebijakan token, `verifikasi`, jangkar) diuji lewat bagian `arsip`. Tiap mutan harus gagal karena sebab yang diuji, bukan karena koneksi mati. File dikembalikan sesudahnya.
