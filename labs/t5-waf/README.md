# Lab t5-waf · pintu untuk mitra POS: WAF, kuota per mitra, dan tanda tangan bertimestamp

Lab Tahap 5 (`plan/CERITA-TAHAP-5.md`, bagian 3, 3b, dan 4; masalah M50 dan ADR 56; tugas `lab-t5-waf`; sumber halaman 5.24 dan 5.25). Lab ini merekam apa yang terjadi bila satu mitra POS mengulang permintaan tanpa jeda, dan bagaimana gerbang di tepi menjaganya: kuota per mitra, WAF, kunci API dengan tanda tangan bertimestamp, dan Idempotency-Key wajib untuk permintaan yang mengubah data.

Server, skema, dan data awal adalah milik `labs/api-t5` (`dasar_t5.py`, `cmd/api`), bukan salinan. Yang ditambahkan lab ini ke api-t5: rute `/pos/v1/...` (flag `-pos-rahasia`, `internal/handler/handler_pos.go`) dan mode rentan `pos-tanpa-cakupan`. Tidak ada tabel atau kolom baru: `mitra_pos` dan `akun.mitra_pos_id` sudah ada dari lab `api-t5`. Yang baru di folder ini: `gerbang/` (gerbang tiruan, modul Go sendiri), `crs/` (aturan OWASP CRS lokal), `payload.json` (masukan uji WAF), `run.py`, dan rekaman. POS tiruan adalah client Python di `run.py`.

Semua berjalan di mesin lab dan hanya memanggil `127.0.0.1`. Gerbang menolak mulai bila `-addr` atau `-hulu` bukan alamat lokal. Payload uji adalah string uji generik (tautologi SQL, tag script, naik direktori) yang lazim dipakai menguji WAF, dikirim hanya ke gerbang tiruan. Lab ini tidak memuat pemindaian, eksploit baru, atau serangan volumetrik.

## Menjalankan

```bash
make -C labs/t5-waf run                     # semua bagian, menulis labs/t5-waf/output/*.txt
make -C labs/t5-waf run BAGIAN=kuota        # satu bagian: kuota waf tandatangan testing
make -C labs/t5-waf cek                     # rekam ulang; gagal bila output/ berbeda dari yang di-commit
make -C labs/t5-waf test                    # hanya tes Go gerbang (butuh Redis lab)
```

Port dasar (ditambah `LAB_PORT_OFFSET`): gerbang 18330, api-t5 18310 (milik `api-t5`). Redis di `LAB_REDIS_PORT`, PostgreSQL di `LAB_DB_PORT`. Lab ini memakai server `api-t5`, jadi tidak jalan bersamaan dengan `api-t5` atau lab Tahap 5 lain yang memakai `dasar_t5.py` dalam satu lajur. Biner gerbang dan rahasia tanda tangan dibuat di folder sementara di luar repo dan dihapus di akhir. Tiap bagian membuat ulang schema dan data awal dari nol. Jam bucket kuota dibekukan dan dimajukan lewat `POST /lab/jam` (hanya dengan `-lab`), jadi hitungan token tepat dan waktu sungguhan tidak ditunggu.

## Versi dan sumber (dicek 2026-11-03)

| Komponen | Versi | Sumber dan catatan |
| --- | --- | --- |
| Go | 1.27.3 | `gerbang/go.mod` dan `labs/api-t5/go.mod`; seluruh tes dan rekaman berjalan di 1.27.3. Gerbang govulncheck dan grype (ADR 44) Tidak dijalankan di lab ini, sama dengan `api-t5` |
| Coraza | v3.8.1 (Apache-2.0) | rilis GitHub `corazawaf/coraza` tertanggal 2026-10-02 (halaman rilis dan API GitHub), modul dari `proxy.golang.org` lewat `go get`; `go.mod` modul itu menulis `go 1.25.0` |
| OWASP CRS | v4.30.0 (Apache-2.0) | rilis GitHub `coreruleset/coreruleset` tertanggal 2026-10-02 (API GitHub: 21:19 UTC). File `coreruleset-4.30.0-minimal.tar.gz`, 283.197 byte, SHA-256 `3d678a41fd5aade34760127fef5dd64fd7a77848913fc0f70dde0cf467c94427`, sama dengan digest yang dilaporkan API GitHub untuk aset itu. Tanda tangan GPG rilis (`.asc`) tidak diperiksa: kunci rilis tidak diimpor [perlu verifikasi] |
| Modul Go CRS untuk Coraza | tidak dipakai | `github.com/corazawaf/coraza-coreruleset/v4` terbaru di `proxy.golang.org` saat dicek adalah v4.25.0, bukan 4.30.0, jadi aturan dibawa dari rilis resmi CRS |
| pgx | v5.11.0 (MIT) | sama dengan `api-t5`; gerbang hanya membaca `mitra_pos` |
| go-redis | v9.23.0 (BSD-2-Clause) | sama dengan `api-t5` |
| PostgreSQL | 17.11 (`postgres:17`) | image sama dengan lab lain, dari cache lokal |
| Redis | `redis:8-alpine` (versi tertulis di kepala rekaman) | compose `labs/b9-cache`; tag bergerak |
| Python (hanya skrip rekaman) | venv `labs/.venv`, psycopg 3.3.6, redis-py 8.1.0 | `labs/requirements.txt` |

File CRS di `crs/` adalah salinan tanpa perubahan dari tarball itu. Isinya `rules/` (48 file: rilis memuat 49, tanpa `REQUEST-900-EXCLUSION-RULES-BEFORE-CRS.conf.example`), `LICENSE`, dan `crs-setup.conf` (isinya `crs-setup.conf.example`). `crs/SHA256SUMS` memuat hash 50 file itu, dan `run.py` menolak mulai bila ada yang berbeda (`shasum -a 256 -c`). `crs/waf.conf` milik lab: mesin, batas body, pemroses body JSON, lalu `Include` setelan CRS dan dua ketetapan eksplisit (paranoia level 1, ambang anomali masuk 5; keduanya sama dengan bawaan CRS 4.30.0).

Dependency modul `gerbang` (hasil `go list -deps`, lisensi dibaca dari file LICENSE tiap modul di cache modul; bukan tinjauan hukum):

| Modul | Versi | Lisensi |
| --- | --- | --- |
| `github.com/corazawaf/coraza/v3` | v3.8.1 | Apache-2.0 |
| `github.com/corazawaf/libinjection-go` | v0.3.3 | BSD-3-Clause |
| `github.com/petar-dambovaliev/aho-corasick` | v0.0.0-20250424160509-463d218d4745 | MIT |
| `github.com/tidwall/gjson`, `match`, `pretty` | v1.18.0, v1.1.1, v1.2.1 | MIT |
| `github.com/kaptinlin/jsonschema`, `go-i18n` | v0.4.6, v0.1.4 | MIT |
| `github.com/goccy/go-json`, `go-yaml` | v0.10.5, v1.19.2 | MIT |
| `github.com/gotnospirit/makeplural`, `messageformat` | commit 2018 dan 2022 | BSD-2-Clause |
| `github.com/valllabh/ocsf-schema-golang` | v1.0.3 | Apache-2.0 |
| `github.com/jackc/pgx/v5`, `puddle/v2`, `pgpassfile`, `pgservicefile` | v5.11.0, v2.2.2, v1.0.0, 2024-06 | MIT |
| `github.com/redis/go-redis/v9` | v9.23.0 | BSD-2-Clause |
| `github.com/cespare/xxhash/v2`, `go.uber.org/atomic` | v2.3.0, v1.12.0 | MIT |
| `golang.org/x/net`, `sync`, `sys`, `text`, `google.golang.org/protobuf`, `rsc.io/binaryregexp` | v0.58.0, v0.22.0, v0.48.0, v0.41.0, v1.36.11, v0.2.0 | BSD-3-Clause |

## Cara kerja gerbang

Rantai pemeriksaan (`gerbang/gerbang.go`), berurutan; permintaan berhenti di pemeriksaan pertama yang menolaknya:

| Langkah | Penolakan |
| --- | --- |
| Batas body 64 KiB (Asumsi) | 413 `body-terlalu-besar` |
| WAF: Coraza dengan CRS, fase 1 dan 2, mode blokir | 403 `diblokir-waf` (400 untuk JSON rusak); galat Coraza menjadi 503 `waf-gagal` |
| Rute: hanya `/pos/v1/` diteruskan | 404 |
| Kunci API: SHA-256 `X-Kunci-Api` dicari di `mitra_pos.kunci_hash`, status harus `aktif` | 401 `kunci-tidak-sah`; sesudah 5 kegagalan per alamat dalam 60 detik (Asumsi) 429 `terlalu-banyak-percobaan-kunci` |
| Kuota per mitra di Redis: permintaan berjalan paling banyak 20, lalu token bucket `kuota_per_detik` (100) dengan kapasitas satu detik | 429 `terlalu-banyak-berjalan` atau `kuota-terlampaui`, dengan `Retry-After` |
| Tanda tangan HMAC-SHA256 atas `<timestamp>.<METHOD>.<alamat dan query>.<byte mentah body>`, toleransi 5 menit | 401 `tanda-tangan-salah` atau `waktu-di-luar-toleransi` |
| `Idempotency-Key` wajib untuk POST, PUT, PATCH, dan DELETE | 400 `idempotency-key-wajib` |
| Diteruskan ke api-t5 dengan `X-Mitra-Id` dan `X-Gerbang-Rahasia` dari gerbang; kepala identitas dari client dibuang | |

Keputusan desain yang naskah tidak menuliskannya (Asumsi desain; lab yang benar):

- **Kuota sebelum tanda tangan.** Mitra yang membanjiri gerbang dibatasi sebelum gerbang menghitung HMAC untuk tiap permintaannya. Akibatnya kunci API yang bocor tanpa rahasia penandatangannya masih bisa menghabiskan kuota mitra pemiliknya.
- **Kunci API dan rahasia penandatangan terpisah.** Database menyimpan hanya hash kunci (`mitra_pos.kunci_hash`). Rahasia penandatangan per mitra datang dari penyimpanan rahasia tiruan (file JSON di folder sementara), bukan dari database: naskah tidak menyebut tempatnya.
- **Tanda tangan memuat method dan alamat.** ADR 34 menandatangani `<timestamp>.<byte mentah>`. Untuk API ini GET tidak punya body, sehingga tanda tangan itu berlaku untuk GET mana pun dalam jendela lima menit.
- **Batas tanda tangan.** Yang tercakup: timestamp, method, alamat beserta query string, dan byte mentah body (`TestGerbangTandaTanganMencakupQuery`). Header tidak tercakup, termasuk `Idempotency-Key`, `Content-Type`, dan `Host`. Tidak ada nonce atau catatan permintaan yang sudah dipakai, jadi permintaan bertanda tangan sah yang diputar ulang di dalam jendela lima menit diterima lagi (`TestGerbangPutarUlangDalamJendelaDiterima`). `Idempotency-Key` menjaga pengulangan kasir yang jujur: key yang sama menghasilkan QR yang sama (`tandatangan.txt` A). Pihak yang memegang salinan permintaan itu dalam jendela lima menit bisa mengganti `Idempotency-Key` yang tidak ditandatangani, dan api-t5 memperlakukan key baru sebagai permintaan baru. Memegang salinan itu butuh akses ke jalur permintaan; TLS di tepi Tidak dijalankan di lab ini. `tandatangan.txt` B hanya merekam penolakan permintaan yang lebih tua dari jendela.
- **Gerbang membaca database sebagai role baca-saja.** Gerbang adalah komponen yang menghadap pihak luar, dan satu-satunya data yang ia butuhkan adalah baris `mitra_pos`. Ia berjalan sebagai role `t5_gerbang` yang hanya punya `SELECT` atas lima kolom (`id`, `nama`, `kunci_hash`, `status`, `kuota_per_detik`) dan `USAGE` atas schema `t5_merchant`; hak itu dibaca dari katalog di `tandatangan.txt` F. api-t5 memakai role `t5_app`. Pelaksana awal memakai role `t5_merchant` (tulis atas `mitra_pos` dan `qr`); diganti dalam tinjauan.
- **Jam bucket dari Redis.** Tanpa `-lab-jam-beku`, skrip bucket memakai `TIME` Redis, jadi semua instance gerbang membaca jam yang sama. Dengan `-lab-jam-beku`, jam datang dari gerbang dan dimajukan lewat `/lab/jam`.
- **Gagal tertutup.** Redis yang tidak terjangkau dijawab 503 `kuota-tidak-tersedia`, dan galat WAF dijawab 503 `waf-gagal`; keduanya tidak meneruskan permintaan. Pilihan ini membuat Redis menjadi ketergantungan ketersediaan API POS. Middleware HTTP bawaan Coraza v3.8.1 (`WrapHandler` di `http/middleware.go`) berperilaku lain saat pemrosesan permintaan galat: ia menulis log lalu kembali, tidak memanggil handler berikutnya (permintaan tidak sampai ke api-t5) dan tidak menulis jawaban, sehingga client menerima 200 kosong. Itu aman bagi data tetapi menyesatkan kasir: QR belum dibuat dan jawabannya 200. Perilaku ini dibaca dari kode sumber dan dijalankan di tes `TestCorazaWrapHandlerBawaanGalatMenjawab200Kosong` (galat dipicu body yang putus di tengah jalan). Gerbang ini menulis middleware sendiri yang menjawab 503 dan mengikuti urutan pemrosesan yang sama.
- **Hitungan kegagalan kunci hanya untuk kunci yang salah.** Kasir mitra yang sah di belakang alamat yang sama dengan penebak tidak ikut terhalang. Alamat diambil dari `RemoteAddr` dan gerbang tidak membaca `X-Forwarded-For`: di belakang proxy atau load balancer semua client berbagi satu alamat (ADR 27). `Retry-After: 60` pada 429 ini adalah lebar jendela, batas atas, bukan sisa masa jendela.
- **Temuan WAF.** Daftar aturan yang cocok membuang aturan CRS yang bertindak `nolog` (inisialisasi dan penghitung skor); yang tersisa adalah aturan yang mencatat, termasuk aturan pemblokir 949110.
- **POS tiruan memakai Host bernama** (`pos.rekeningo.example`). Host berupa alamat IP memicu aturan 920350 (severity warning, 3 poin menurut bawaan CRS), di bawah ambang 5 (`TestWAFTemuanKecilDiBawahAmbang`). Satu temuan warning lain pada payload yang sama sudah cukup untuk memblokirnya.

Di sisi api-t5 (`handler_pos.go`) rute hanya terdaftar dengan `-pos-rahasia`. Permintaan harus membawa rahasia gerbang (perbandingan waktu tetap), dan merchant di alamat harus punya `akun.mitra_pos_id` sama dengan mitra yang disebut gerbang. Merchant milik mitra lain, merchant yang tidak ada, dan akun yang bukan merchant dijawab 404 yang sama (pola ADR 7). Cakupan dicek di api-t5, bukan di gerbang: service membaca `akun.mitra_pos_id` dan jenis akun dari database lewat SQL lalu membandingkannya dengan mitra dari gerbang. Pemeriksaan ini tetap berlaku untuk permintaan yang membawa rahasia gerbang dari dalam jaringan dan menyebut mitra lain di `X-Mitra-Id`.

Naskah tidak mendefinisikan bentuk endpoint, jadi bentuk ini Asumsi desain dan kontraknya belum ditulis di `labs/api-t5/openapi.yaml`: `POST /pos/v1/merchant/{id}/qr` (body `nominal`, `referensi` opsional paling banyak 100 karakter, dikembalikan apa adanya dan tidak disimpan) dan `GET /pos/v1/merchant/{id}/qr/{qr}` (status `aktif`, `terpakai`, `kedaluwarsa`, atau `dibatalkan`).

## Mode rentan

| Mode | Di mana | Masalah | Perilaku |
| --- | --- | --- | --- |
| `kuota-bersama` | gerbang (`-rentan`) | M50 | satu bucket untuk semua mitra: mitra yang membanjiri menghabiskannya, mitra lain ikut 429 |
| `tanpa-idempoten-wajib` | gerbang | M50 | Idempotency-Key opsional seperti Tahap 4: kasir yang mengulang POST tanpa key membuat dua QR |
| `waf-deteksi` | gerbang | konfigurasi | Coraza `DetectionOnly`: aturan cocok dan tercatat, tidak ada yang diblokir |
| `pos-tanpa-cakupan` | api-t5 (`-rentan`) | M50 | merchant di alamat tidak dicocokkan dengan mitra: kunci satu mitra membuka merchant mitra lain |

## Rekaman

| File | Bagian | Isi |
| --- | --- | --- |
| `output/kuota.txt` | `kuota` | (a) 600 permintaan A dan 20 permintaan B diselipkan, jam bucket beku: A 100 lolos dan 500 429, B 20 dari 20 tetap 200; isi ulang 500 ms = 50 token; kapasitas tidak terlampaui; 25 permintaan bersamaan: 20 lolos dan 5 429 `terlalu-banyak-berjalan`; mode `kuota-bersama`: 100 lolos untuk 620 permintaan dan B ikut 429 |
| `output/waf.txt` | `waf` | (b) delapan payload serangan dengan kunci dan tanda tangan sah: 8 dari 8 403 dengan daftar aturan CRS; 37 payload POS yang sah: 0 diblokir; referensi 101 karakter lolos WAF dan ditolak api-t5 (400); mode `waf-deteksi`: 0 dari 8 diblokir |
| `output/tandatangan.txt` | `tandatangan` | (c) POST tanpa Idempotency-Key 400, key yang sama dua kali menghasilkan satu QR, key yang sama dengan isi lain 422, mode `tanpa-idempoten-wajib` dua QR; (d) rahasia salah, isi diubah, timestamp 360 detik lalu atau ke depan, permintaan lama diputar ulang, kunci tidak dikenal, mitra dibekukan: semua 401; kunci A tidak membuka merchant B (404 di lima percobaan, 0 QR dibuat), kepala identitas palsu dibuang, api-t5 menolak yang tidak lewat gerbang; mode `pos-tanpa-cakupan` 200; enumerasi kunci: 5 kali 401 lalu 429, dan batas 10 QR per menit per akun di api-t5 tetap berlaku; gerbang berhenti dengan exit status 1 bila `-addr` atau `-hulu` bukan alamat lokal; (F) hak role database gerbang dari katalog PostgreSQL (hanya `SELECT` atas lima kolom `mitra_pos`) dan role koneksi gerbang dari `pg_stat_activity` |
| `output/testing.txt` | `testing` | `go vet` dan tes Go gerbang (WAF, tanda tangan, kuota di Redis, rantai, baris `mitra_pos` dari PostgreSQL, dan perilaku `WrapHandler` Coraza bawaan), tes Go api-t5 untuk rute POS, dan tes yang dilewati atau gagal keras tanpa Redis |

Rekaman dari database bersih, diulang dua kali (tenang, lalu dengan 8 proses sibuk di samping) dan identik per byte. Angka yang bergantung mesin tidak direkam sebagai nilai: laju sungguhan tidak diukur, dan hitungan token memakai jam yang dibekukan.

## Pernyataan naskah dan rekamannya

| Pernyataan (tabel "Yang harus bisa dibuktikan lab" dan tugas lab) | Hasil | Rekaman |
| --- | --- | --- |
| (a) Satu mitra yang melebihi kuota mendapat 429, mitra lain tetap 200 | Terbukti, dengan jam bucket beku: 600 permintaan A dihitung dalam satu detik, tidak ada pengukuran laju sungguhan | `kuota.txt` A |
| (a) 20 permintaan berjalan per mitra | Terbukti dengan hulu yang ditahan 1,5 detik (`-lab-tahan`, hanya lab); 20 lolos dan 5 429, mitra B 200 | `kuota.txt` B |
| (b) Coraza dengan CRS memblokir payload serangan umum dengan 403 | Terbukti untuk delapan string di `payload.json` (SQLi 3, XSS 3, naik direktori 2), paranoia level 1, CRS 4.30.0. "Serangan umum" di luar daftar itu dan paranoia level lain tidak diuji | `waf.txt` A |
| (b) Coraza meloloskan payload POS yang sah | 37 diuji, 0 diblokir. Ini bukan ukuran false positive untuk payload POS di luar daftar itu | `waf.txt` B |
| (c) POST tanpa Idempotency-Key dijawab 400 | Terbukti di gerbang. Format key (String UUID) diperiksa api-t5 | `tandatangan.txt` A |
| (d) HMAC salah atau timestamp lama ditolak | Terbukti: 240 detik diterima, 360 detik ke dua arah ditolak (toleransi 5 menit, Asumsi) | `tandatangan.txt` B |
| (d) Kunci mitra A tidak membuka merchant mitra B | Terbukti untuk baca dan buat QR; mode `pos-tanpa-cakupan` membuka | `tandatangan.txt` C |
| (e) Serangan volumetrik lapisan 3 dan 4 | Tidak dijalankan | `kuota.txt` (kalimat penutup) |
| Rate limit enumerasi per akun dan IP tetap berlaku (ADR 27) | Sebagian: per akun terbukti di api-t5 (10 QR per menit, lapis `akun`); per alamat direkam untuk kunci yang salah di gerbang. Lapis per IP bawaan api-t5 tidak direkam untuk rute POS: semua permintaan POS tiba dari alamat gerbang | `tandatangan.txt` D |

## Selisih dengan naskah (lab yang benar)

- Naskah ADR 56 menulis "kunci API per mitra (`mitra_pos.kunci_hash`) ditambah HMAC-SHA256"; tempat rahasia penandatangan dan isi yang ditandatangani (method dan alamat) tidak ditulis di naskah. Lihat "Keputusan desain".
- Naskah menulis "timeout 3 detik dan batas ukuran body". Gerbang memasang `ReadHeaderTimeout` dan `ReadTimeout` 3 detik, `ResponseHeaderTimeout` 3 detik ke hulu, dan batas body 64 KiB (Asumsi). Batas body diuji di tes Go (413); timeout tidak direkam sebagai perilaku (Tidak dijalankan).
- Naskah menulis kuota "100 per detik dan 20 berjalan" tanpa kapasitas bucket. Kapasitas diambil sama dengan lajunya (satu detik) dan 20 berjalan menjadi flag gerbang (`-berjalan`), bukan kolom `mitra_pos`.
- Naskah M50 menulis bahwa rate limit per IP menghitung semua kasir di satu alamat NAT sebagai satu (penalaran). Lab merekam versi "batas bersama untuk semua mitra" (`kuota-bersama`), bukan penghitungan per IP.
- Skema: lab tidak mengubah skema. `mitra_pos` dan `akun.mitra_pos_id` sama dengan blok 3b naskah (status `aktif` atau `dibekukan`).

## Tidak dijalankan atau belum ada

Serangan volumetrik lapisan 3 dan 4 (Tidak dijalankan; didelegasikan ke penyedia jaringan di naskah). TLS di tepi: gerbang melayani HTTP di localhost. mTLS untuk mitra (disebut di ADR 56, Tidak dijalankan). Webhook keluar ke POS dengan aturan alamat keluar ADR 41 dan tanda tangan Rekeningo (ada di ADR 56, bukan butir tugas lab ini; Tidak dijalankan). Plugin Caddy untuk Coraza (Tidak dijalankan; naskah memakai middleware Go). Paranoia level di atas 1 dan false positive di luar `payload.json` tidak diukur. Kapasitas satu server di bawah beban sungguhan tidak diukur: kuota 50 mitra × 100 per detik = 5.000 per detik tetap Hitungan atas Asumsi. Timeout 3 detik tidak direkam. Gerbang govulncheck dan grype (ADR 44) Tidak dijalankan.

## Uji mutasi

Tabel hasil ada di badan PR. Setiap mutan mengubah satu hal di gerbang, di `crs/`, atau di rute POS api-t5, lalu tes Go atau lab dijalankan; tes harus gagal karena sebab yang diuji, dan file dikembalikan sesudahnya.
