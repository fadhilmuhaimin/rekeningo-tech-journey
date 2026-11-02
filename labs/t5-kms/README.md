# Lab t5-kms · envelope encryption arsip partisi dengan OpenBao transit (RANCANGAN, belum ada kode)

Status: berhenti di batas waktu tugas. Berkas ini hanya memuat hasil pemeriksaan awal dan rancangan, supaya pelaksana berikutnya tidak mengulanginya. Belum ada kode Go, belum ada `run.py`, belum ada rekaman di `output/`, dan lab ini belum boleh di-merge sebagai lab selesai.

Sumber tugas: naskah Tahap 5 bagian 3, 3b, dan 4 (ADR 57), dan blok tugas lab-t5-kms di antrean. Arsipnya berasal dari lab `t5-partisi` (`lepas.py`, fungsi `ekspor`: CSV tanpa enkripsi).

## Hasil pemeriksaan awal (belum direkam)

Semua butir di bawah dijalankan sekali, tangan, di container sementara (dihapus sesudahnya), bukan lewat lab. Statusnya Tidak direkam sampai `run.py` menulisnya ke `output/`.

| Butir | Hasil | Sumber |
| --- | --- | --- |
| Versi OpenBao terbaru | v2.7.2, terbit 2026-10-26 (daftar rilis GitHub API, dibuka 2026-11-03; tidak ada rilis lebih baru di daftar itu) | github.com/openbao/openbao/releases |
| Image | `ghcr.io/openbao/openbao:2.7.2`, 259 MB di Docker lokal, digest `sha256:5046911075e137e154ce49ab051502f4ec7cf367d484ae4a4dce665d9b90561f` (sama dengan lab `t4-infra`) | `docker pull`, `docker inspect` |
| Mode dev | `GET /v1/sys/seal-status`: `sealed: false`, `storage_type: inmem`, `version: 2.7.2`. Penyimpanan di memori: restart container menghapus semua kunci | percobaan |
| `POST /transit/datakey/plaintext/<kunci>` | menjawab `plaintext` (32 byte, base64) dan `ciphertext` berbentuk `vault:v1:...` (60 byte: nonce 12, kunci 32, tag 16) | percobaan |
| `rotate` | `latest_version` naik ke 2; ciphertext `vault:v1:` tetap bisa dibuka | percobaan |
| `rewrap` | `vault:v1:...` menjadi `vault:v2:...` tanpa menjawab plaintext | percobaan |
| `min_decryption_version` = 2 | `decrypt` dan `rewrap` atas `vault:v1:` ditolak: `ciphertext or signature version is disallowed by policy (too old)` | percobaan |
| Menurunkan lagi ke 1 | `vault:v1:` bisa dibuka lagi: menaikkan `min_decryption_version` hanya mengarsipkan versi lama dan bisa dibalik, bukan mencabut | percobaan |
| `trim` | `min_available_version` ditolak bila `min_encryption_version` belum diisi, dan ditolak bila lebih besar dari `min_decryption_version`. Penghapusan versi lama butuh urutan: `min_encryption_version`, `min_decryption_version`, lalu `trim`. Urutan ini belum dijalankan sampai selesai | percobaan |
| Ciphertext diubah satu byte | `decrypt` menjawab `cipher: message authentication failed` | percobaan |
| Kunci tidak ada | `decrypt` menjawab `encryption key not found` | percobaan |
| `crypto/cipher.NewGCMWithRandomNonce` (Go 1.27.3) | nonce acak 96 bit di depan ciphertext, `Overhead` 28 byte, "A given key MUST NOT be used to encrypt more than 2^32 messages" | `go doc crypto/cipher.NewGCMWithRandomNonce` pada toolchain lokal |

Dokumentasi API transit di openbao.org tidak bisa dibaca dari mesin ini (halaman dirender JavaScript, 340 byte dari `curl`; sumber MDX di GitHub tidak ditemukan di jalur yang dicoba). Perilaku `rotate`, `rewrap`, dan `min_decryption_version` di atas karena itu bersumber percobaan pada v2.7.2, bukan dokumentasi: [perlu verifikasi] terhadap dokumentasi sebelum halaman 5.26 menuliskannya sebagai klaim dokumentasi.

## Selisih dengan ADR 57 di naskah (lab yang benar, setelah direkam)

- Naskah menulis "rotasi KEK, data key dibungkus ulang, lalu `min_decryption_version` dinaikkan". Percobaan menunjukkan langkah terakhir itu bisa dibalik. Pencabutan sungguhan butuh `trim`. Halaman perlu menulis keduanya.
- Role aplikasi hanya punya `SELECT` dan `INSERT` atas `arsip_partisi` (`labs/api-t5/dasar_t5.py`, daftar `HAK`). Pembungkusan ulang mengubah `kunci_data_terbungkus` dan `versi_kek`, jadi butuh `UPDATE` pada dua kolom itu saja, sedangkan `periode`, `kunci_objek`, dan `checksum` harus tetap tidak bisa diubah. Naskah 3b belum menyebut hak itu.
- Di mode dev, restart OpenBao menghilangkan KEK, dan arsip yang dibungkus kunci itu tidak terbuka lagi. Produksi memakai penyimpanan persisten dan unseal: Tidak dijalankan.

## Rancangan yang belum dikerjakan

1. Modul Go `labs/t5-kms` (hanya pustaka standar, tanpa dependency): paket `envelope` (AES-256-GCM per file dengan `NewGCMWithRandomNonce`, AAD berisi periode, data key harus 32 byte), paket klien OpenBao transit lewat `net/http` (`datakey/plaintext`, `decrypt`, `rewrap`), paket jangkar (berkas JSONL yang hanya bertambah, satu baris per periode dan checksum), dan perintah `kmsarsip` (`arsipkan`, `buka`, `rewrap`, `verifikasi`).
2. Checksum arsip: SHA-256 atas file terenkripsi di penyimpanan objek, supaya bisa diperiksa tanpa KMS. Nilainya acak per rekaman (kunci dan nonce acak), jadi rekaman menulis hasil perbandingan, bukan nilainya.
3. `run.py` memakai `labs/t5-partisi` untuk membuat riwayat, DETACH, dan ekspor CSV (`dasar.siapkan_riwayat`, `lepas.ekspor`), lalu merekam: (a) file tanpa KMS tidak terbaca, termasuk token tanpa hak `decrypt` (403) dan data key salah; (b) satu byte berubah di nonce, ciphertext, dan tag gagal autentikasi, juga file terpotong atau diperpanjang dan AAD periode lain; (c) data key `vault:v1:` terbuka sesudah `rotate` dan gagal sesudah `min_decryption_version` naik; (d) `rewrap`, pembalikan `min_decryption_version`, dan `trim` sampai selesai; (e) baris `arsip_partisi` terisi, jangkar di luar database cocok, dan tiga kasus pemalsuan (file, baris database, keduanya); (f) umur KEK: 2^32 ÷ 438 juta = 9,8 tahun untuk satu data key per posting, dan 14,7 tahun dengan 292 juta (Hitungan atas Asumsi naskah); (g) OpenBao dijeda lalu dihidupkan (pemulihan menunggu), dan restart di mode dev menghilangkan KEK.
4. Tes Go: tes unit atas `envelope` dengan pembungkus lokal (semua byte sebuah blob kecil diubah satu per satu), tes terhadap OpenBao sungguhan di `make test` (wajib bila `TES_KMS_WAJIB=1`), lalu uji mutasi (AAD diabaikan, panjang data key tidak diperiksa, nonce tetap, checksum atas plaintext, perbandingan jangkar dimatikan, header token dihapus).
5. SoftHSM 2.7.0 lewat PKCS#11 dan klien Go-nya: Tidak dijalankan. Halaman memakainya hanya sebagai Ilustrasi, dan versi serta klien Go tetap [perlu verifikasi] (belum dibuka ke sumber primer).
6. Port server lab: pilih satu port dasar baru lewat `port_lab` (rentang 18325 sampai 18349 tidak dipakai lab mana pun di `main` saat diperiksa), dan jalankan container OpenBao di jaringan sendiri dengan nama berawalan nama lajur.

## Perintah untuk melanjutkan

```
git fetch origin && git checkout tahap-5/lab-t5-kms
export COMPOSE_PROJECT_NAME=rjt-teknis3 LAB_DB_PORT=54833 LAB_REDIS_PORT=56879 LAB_PORT_OFFSET=500
docker image inspect ghcr.io/openbao/openbao:2.7.2   # sudah ada di cache lokal (259 MB)
```

Cek `gh pr list --state open` sebelum mengubah `labs/api-t5`: lab `t5-waf` (PR 494) juga menyentuhnya. Nomor keputusan 1662 sampai 1664 dan ID riset R5-310 sampai R5-314 belum dipakai.
