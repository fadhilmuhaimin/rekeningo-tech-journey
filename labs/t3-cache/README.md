# Lab t3-cache · katalog di memori proses lawan Redis

Lab Tahap 3 untuk masalah M23 dan ADR 28 (`plan/CERITA-TAHAP-3.md` bagian 3 dan 4, keputusan 968 dan 969). Lab ini berjalan di atas `labs/api-t3`: server Go, skema, dan data awal (10.000 karyawan, 60 warung, 2.400 produk) dipakai dari `labs/api-t3/dasar_t3.py`, bukan salinan. Yang ditambah di `api-t3` hanya cache katalog di balik flag `-katalog-cache` (`internal/cache`, `internal/service/katalog_cache.go`); tanpa flag itu perilaku `api-t3` tidak berubah. Skenario dan rekamannya ada di schema sendiri (`tahap3_cache`).

Redis adalah container lokal dari `labs/b9-cache`. Tidak ada panggilan ke luar mesin ini.

## Menjalankan

```bash
make lab-up                                   # dari akar repo: PostgreSQL 17 dan Redis 8 lab di lajur ini
make -C labs/t3-cache run                     # semua bagian, ±50 detik, menulis labs/t3-cache/output/*.txt
make -C labs/t3-cache run BAGIAN=redis        # satu bagian: memori redis gagal beban
make -C labs/t3-cache cek                     # rekam ulang; gagal bila output/ berbeda dari yang di-commit
```

Lajur kerja lain memakai `COMPOSE_PROJECT_NAME`, `LAB_DB_PORT`, `LAB_REDIS_PORT`, dan `LAB_PORT_OFFSET` (`labs/README.md`). Port dasar: API 18180, instance kedua 18182, Redis 56379. Rekaman selalu memakai port dasar, jadi sama di semua lajur. Bagian `gagal` menghentikan dan menghidupkan lagi Redis milik proyek compose lajur ini; lab menolak berjalan bila port Redis proyek itu bukan `LAB_REDIS_PORT`.

Lab ini memakai port yang sama dengan `api-t3`, jadi dua lab itu tidak boleh jalan bersamaan di satu lajur.

Setiap bagian membuat ulang schema dan data awal dari nol, jadi rekaman tidak bergantung pada urutan bagian. Token, waktu, dan tanggal disamarkan. Lab gagal keras bila hasilnya meleset dari yang diharapkan. Dua kali rekam menghasilkan file yang identik per byte.

## Cache katalog di api-t3

| Flag | Arti |
|---|---|
| `-katalog-cache memori` | Peta di dalam proses, TTL 5 menit. Jam cache sama dengan jam service, jadi `-jam-lab` dan `POST /lab/jam` menggeser TTL tanpa menunggu |
| `-katalog-cache redis` | Cache-aside di Redis, TTL 60 detik, `-katalog-redis` (alamat), `-katalog-redis-timeout` (bawaan 50 ms; lab memakai 100 ms). Terpisah dari `-redis` dan `-redis-timeout` milik batas login lintas instance (`t3-instance`) |
| `-katalog-cache tanpa` | Tidak menyimpan apa pun; alat ukur "tanpa cache" dengan pencacah yang sama |
| `-katalog-hapus sesudah` | Benar: UPDATE, COMMIT, lalu hapus kunci; tulis yang ditolak tidak menghapus apa pun |
| `-katalog-hapus sebelum` | Rentan: kunci dihapus sebelum COMMIT |
| `-katalog-hapus selalu` | Rentan: kunci juga dihapus saat tulis ditolak atau gagal |
| `-lab-gerbang commit,isi` | Lab saja: menahan penulis sebelum COMMIT dan pembaca sebelum simpan, sampai `POST /lab/gerbang/lepas`. Mati secara bawaan; hanya diterima bersama `-lab` dan `-katalog-cache`, dan rute pelepasnya hanya terdaftar bila gerbang menyala |

Satu kunci per kota dan per warung: `katalog:<kota>:<warung>` dan `katalog:<kota>:semua`. `PATCH /produk/{id}` menghapus dua kunci, yaitu kota dan warung itu. `POST /promo` menghapus semua kunci kota itu (`SCAN katalog:<kota>:*` di Redis). `POST /pesanan` tidak menyentuh cache dan tidak menghapus kunci. `GET /lab/cache` memperlihatkan pencacah: hit, miss, baca database, kunci yang benar-benar terhapus, galat cache.

Client Redis adalah go-redis v9.23.0 (GET, SET dengan TTL, DEL, SCAN), dependency yang sudah ada sejak `t3-instance` (keputusan 967). Opsinya sama dengan `internal/redisbatas`. Batas waktu dial, tulis, baca, dan antre di pool diisi `-katalog-redis-timeout`. Retry dimatikan (`MaxRetries: -1`; nol berarti bawaan 3 kali) dan dial dicoba sekali. Satu perintah paling lama beberapa kali batas itu, bukan satu kali, karena dial, tulis, dan baca masing-masing sampai batas.

Versi pertama lab ini memakai client RESP2 sendiri supaya batas waktu terlihat di kode. Tinjauan menggantinya (keputusan 970): go-redis bisa dibatasi persis begitu, dan rekaman `memori.txt`, `gagal.txt`, `beban.txt` tetap identik; di `redis.txt` hanya baris kepala yang menyebut client yang berubah. Bawaan go-redis (5 detik dan 3 retry) tidak direkam untuk katalog. Perbandingannya ada untuk batas login di `t3-instance` (`batas.txt` J). `TestRedisMenggantungBerhentiDiBatasTanpaRetry` memakai Redis tiruan yang menjawab handshake tetapi tidak menjawab GET: tanpa retry diterima 1 GET, dengan retry bawaan 4.

## Rekaman

| Rekaman | Isi | Halaman |
|---|---|---|
| `memori.txt` | M23: dua instance dengan cache di memori masing-masing; promo lewat satu instance, meja lain tetap melihat harga lama; pesanan tetap ditagih dari database; TTL 300 detik (detik ke-299 dan ke-300) | 3.18, 3.19 |
| `redis.txt` | Satu Redis untuk dua instance; hapus kunci sesudah COMMIT; urutan terbalik (D) lawan benar (E); pembaca lambat mengisi sesudah tulis (F); promo yang mulai nanti (G) | 3.19 |
| `gagal.txt` | Redis menggantung (A) dan mati (B); hapus kunci gagal karena Redis mati (C); galat tulis (D); galat baca database (E) | 3.19 |
| `beban.txt` | Ukuran katalog; 52 bacaan per 10 detik tanpa cache lawan dengan Redis | 3.19 |

## Angka: yang direkam dan yang dihitung

Angka yang bergantung pada kecepatan mesin tidak ditulis sebagai angka tunggal. Lab memeriksa batasnya dan gagal bila meleset.

| Angka | Asal | Label |
|---|---|---|
| Empat bacaan di dua instance memori: 2 baca database (satu per instance) | `memori.txt` A | Rekaman lab |
| Promo lewat instance A: 1 kunci terhapus di A, 0 di B; Budi Rp22.500 dan Citra Rp25.000 di meja yang sama; Pesan menagih Rp22.500 | `memori.txt` B dan C | Rekaman lab |
| TTL 300 detik: detik ke-299 masih harga lama, detik ke-300 harga baru | `memori.txt` D, jam cache digeser lewat `POST /lab/jam` | Rekaman lab; 5 menit sungguhan tidak ditunggu |
| Redis: dua instance, 1 baca database; sisa TTL paling banyak 60.000 ms | `redis.txt` A | Rekaman lab dan batas |
| Hapus kunci sebelum COMMIT: Redis berisi Rp25.000 padahal database Rp28.000 sampai TTL | `redis.txt` D | Rekaman lab |
| Hapus kunci sesudah COMMIT: harga lama hanya terlihat sebelum COMMIT, sesudahnya Rp28.000 | `redis.txt` E | Rekaman lab |
| Pembaca lambat mengisi sesudah tulis selesai: Rp25.000 bertahan walau kunci sudah dihapus | `redis.txt` F | Rekaman lab |
| Promo yang mulai 3 detik sesudah dibuat: tidak ada kunci terhapus, entri lama dipakai sampai TTL (6 detik di rekaman, 60 detik di ADR 28) | `redis.txt` G | Rekaman lab; 60 detik Asumsi |
| Redis menggantung dengan batas 100 ms: 5 bacaan, 5 baca database, 5 galat cache, semuanya 200 | `gagal.txt` A | Rekaman lab |
| Redis menggantung dengan batas 5 detik: satu bacaan menunggu lebih dari 1,5 detik | `gagal.txt` A | Rekaman lab (batas) |
| Redis mati, 50 bacaan serentak: 50 baca database, semuanya 200, koneksi PostgreSQL paling banyak 10 | `gagal.txt` B | Rekaman lab |
| Redis mati saat tulis: hapus kunci gagal, entri lama kembali bersama dump.rdb sesudah Redis hidup | `gagal.txt` C | Rekaman lab |
| Lima PATCH gagal dan lima bacaan: 1 baca database (benar) lawan 6 (hapus kunci selalu) | `gagal.txt` D | Rekaman lab |
| Galat baca database: entri yang hidup tetap melayani, kunci yang kosong tidak diisi galat | `gagal.txt` E | Rekaman lab |
| 86 byte per item (41.279 byte untuk 480 item di Jakarta); enam kota, 2.400 item = 206.551 byte (207 KB) | `beban.txt` A, enam jawaban `GET /katalog?kota=N` | Rekaman lab |
| R3-37 menulis 720 KB (300 byte per item) | Tebakan riset, bukan ukuran | Asumsi; selisih dicatat |
| 52 bacaan tanpa cache: 52 baca database; dengan Redis: 13 baca database dan 39 hit | `beban.txt` B dan C | Rekaman lab |
| W per baca database di bawah 20 ms dan L rata-rata di bawah 0,1 koneksi | `beban.txt` B, batas | Rekaman lab (batas) |
| 5,21 baca per detik, W = 5 ms, L = 0,026 | R3-37 | Asumsi |

## Temuan yang perlu diketahui halaman

1. Beban katalog tidak memaksa cache. Tanpa cache, 52 bacaan menjadi 52 baca database. Lab memeriksa bahwa waktu satu baca di bawah 20 ms dan L di bawah 0,1 koneksi dari pool 10 (`beban.txt` B). Dengan Redis jadi 13 (`beban.txt` C). Penghematan itu nyata, tetapi database tidak tertekan di kedua kasus. "Tanpa cache" tetap opsi sah di ADR 28.
2. Cache menghemat satu query dari beberapa. Dari kode (tidak diukur): tiap request yang login memanggil `Service.Periksa` (satu baca tabel `sesi`), dan `GET /katalog` tanpa parameter `kota` membaca akun peminta. Hit hanya menggantikan query katalog.
3. M23 terjadi karena cache ada di tiap proses. Hanya instance yang menerima perubahan yang membuang entrinya (`memori.txt` B). Stok juga stale: `POST /pesanan` tidak menghapus kunci, jadi katalog menunjukkan stok 50 sementara database 49 (`memori.txt` C). Harga yang ditagih tidak pernah dari cache.
4. Cache bersama menutup M23 tetapi tidak menutup tiga hal lain. Urutan hapus kunci sebelum COMMIT meninggalkan harga lama sampai TTL (`redis.txt` D). Hapus kunci sesudah COMMIT masih punya celah: pembaca yang membaca database sebelum COMMIT lalu menyimpan sesudah kunci dihapus (`redis.txt` F). Nishtala dkk. menyebutnya stale set dan menutupnya dengan lease (R3-65); lab tidak mengimplementasikan lease. Promo yang mulai di jam tertentu tidak punya tulis saat mulai, jadi tidak ada yang menghapus kunci (`redis.txt` G). Ketiganya hanya dibatasi TTL.
5. Hapus kunci bisa gagal. Redis mati saat Ani mengubah harga: PATCH tetap 200 karena database sudah COMMIT, dua DEL gagal, dan entri lama kembali bersama Redis (`gagal.txt` C). Tanpa TTL tidak ada yang menutupnya. Entri kembali karena lab menulis dump.rdb dengan `SAVE` sebelum Redis dihentikan (R3-68). Apakah Redis memuat snapshot tanpa `SAVE` manual tidak diuji.
6. Client cache wajib punya batas waktu per perintah. Dengan batas 100 ms, Redis yang menggantung mengubah lima bacaan menjadi lima baca database yang tetap 200 (`gagal.txt` A). Dengan batas 5 detik satu bacaan menunggu sampai Redis menjawab. `CLIENT PAUSE ALL` menahan semua perintah tetapi menerima koneksi. Ia meniru Redis yang menggantung, bukan jaringan yang putus (R3-66). Dari kode (tidak diukur): tanpa circuit breaker, tiap bacaan tetap membayar satu batas waktu selama Redis menggantung.
7. Galat backend bukan alasan menghapus entri atau menyimpan hasil. Mode benar tidak menghapus kunci saat PATCH ditolak database dan tidak menyimpan galat baca (`gagal.txt` D dan E). Mode `selalu` menjadikan tiap galat tulis satu baca database tambahan (6 lawan 1). Ini versi kecil dari kasus Facebook 2010 (R3-25). Client Facebook menghapus kunci saat galat; di lab penghapusan terjadi di jalur tulis, bukan di jalur baca.
8. `SCAN katalog:<kota>:*` untuk hapus awalan bukan operasi atomik. Dokumentasi Redis menulis elemen yang tidak ada terus selama iterasi bisa muncul atau tidak (R3-67). Entri yang diisi pembaca di tengah iterasi bisa terlewat. Lab tidak merekam perlombaan itu.
9. Ukuran katalog lebih kecil dari tebakan riset. Satu item 86 byte di JSON lab; 2.400 item di enam kota 206.551 byte (207 KB, diukur), bukan 720 KB (R3-37 memakai 300 byte per item, R3-69). Kesimpulan "tidak perlu cache" tidak berubah.
10. Nilai kunci: lab menyimpan JSON `[]WarungMenu` per kunci. Satu kota punya 13 kunci di rekaman beban (satu kota dan dua belas warung). R3-37 menulis 60 kunci untuk enam kota; lab hanya mengukur Jakarta.

## Uji mutasi

Satu hal diubah di `labs/api-t3` (kode server atau client cache), bagian yang bersangkutan dijalankan, bagian itu harus gagal, lalu perubahan dikembalikan lewat git. Hasil 2026-10-25:

| Perubahan | Bagian | Hasil |
|---|---|---|
| Hapus kunci sesudah `PATCH` yang berhasil dibuang | `redis` B | Gagal: kunci masih ada sesudah ubah harga |
| Cache memori tanpa TTL (umur 100 hari) | `memori` D | Gagal: detik ke-300 masih Rp25.000, harus Rp22.500 |
| `Set` di client dengan TTL 0 (tanpa kedaluwarsa; semula `SET` tanpa `PX`) | `redis` A | Gagal: sisa TTL -1 ms (tanpa kedaluwarsa), harus 1 sampai 60.000 |
| Mode benar menghapus kunci sebelum COMMIT | `redis` E | Gagal: kunci sudah hilang di celah sebelum COMMIT |
| Promo tidak menghapus entri kota | `memori` B | Gagal: kunci terhapus (0, 0), harus (1, 0) |
| Galat baca database disimpan sebagai daftar kosong | `gagal` E | Gagal: kunci galat ada di Redis |
| Tulis yang gagal menghapus kunci di mode benar | `gagal` D | Gagal: 6 baca database, harus 1 |
| Mode `selalu` tidak menghapus saat tulis gagal | `gagal` D | Gagal: 1 baca database, harus 6 |
| Client tanpa batas baca (`ReadTimeout: -1`; semula client RESP2 tanpa batas waktu) | `gagal` A | Gagal: lima bacaan menunggu Redis dan menjadi hit, bukan lima galat cache |
| `SCAN` memakai awalan salah | `redis` C | Gagal: entri kota tidak dibuang oleh promo |
| Cache memori `HapusAwalan` tidak menghapus | `memori` B | Gagal: Budi masih melihat Rp25.000 |
| `Pesan` menagih tanpa promo (harga seperti cache yang stale) | `memori` C | Gagal: tagihan Rp25.000, harus Rp22.500 |
| Jam cache memakai jam sungguhan, bukan jam lab | `memori` D | Gagal: detik ke-300 masih Rp25.000 |
| Gerbang `commit` tidak menahan | `redis` D | Gagal: PATCH tidak tertahan dalam 15 detik |
| Gerbang `isi` tidak menahan | `redis` F | Gagal: pembaca tidak tertahan dalam 15 detik |
| Hit dianggap miss | `memori` A | Gagal: 2 baca database per instance, harus 1 |
| Mode `tanpa` memakai cache memori | `beban` B | Gagal: 13 baca database dan 39 hit, harus 52 dan 0 |
| Kunci tidak membedakan warung | `redis` A | Gagal: entri kunci warung tidak ada |

Delapan belas perubahan, semuanya gagal di lab; tidak ada yang lolos. Tes Go di `labs/api-t3` (`TestKatalogCache*`, `TestPesanTidakMembacaCache`, `internal/cache`) tidak diuji mutasi satu per satu: yang dijaga bersama lab adalah perilaku yang sama. Perubahan yang tidak dicoba: jawaban `SCAN` bercabang lebih dari satu halaman (kursor tidak 0), karena katalog satu kota tidak cukup banyak kunci.

### Tinjauan, 2026-10-25

Peninjau mengulang sebagian mutasi di atas pada kode sesudah client diganti ke go-redis, dan menambah perubahan sendiri. Tiap perubahan dijalankan dari database bersih di lajur sendiri, lalu dikembalikan.

| Perubahan | Penjaga | Hasil |
|---|---|---|
| Hapus kunci sesudah `PATCH` yang berhasil dibuang | `redis` B | Gagal: kunci dihapus, dapat True, harus False |
| Promo tidak memanggil hapus awalan | `memori` B | Gagal: yang membuang entri (0, 0), harus (1, 0) |
| Cache memori hidup 100 hari | `memori` D | Gagal: Citra melihat Rp25.000, harus Rp22.500 |
| Urutan `sesudah` dipaksa jadi `sebelum` | `redis` E | Gagal: kunci belum dihapus, dapat False, harus True |
| Jam cache memakai jam sungguhan | `memori` D | Gagal: Rp25.000, harus Rp22.500 |
| Tulis yang ditolak menghapus kunci di mode benar | `gagal` D | Gagal: 6 baca database, harus 1 |
| Hit dianggap miss | `memori` A | Gagal: (2, 2, 0, 0), harus (1, 1, 1, 1) |
| `Pesan` membaca harga dari katalog (cache) | `memori` C | Gagal: tagihan Rp25.000, harus Rp22.500 |
| `Pesan` menagih tanpa promo | `memori` C dan `go test` | Gagal di lab; `make -C labs/api-t3 run BAGIAN=testing` exit 1 |
| Tanpa jatuh ke database saat Redis galat | `gagal` A | Gagal: 500, harus 200 |
| Hasil database disimpan juga saat baca cache galat | `gagal` A | Gagal: galat cache 10, harus 5 |
| `Set` dengan TTL 0 | `redis` A | Gagal: PTTL -1 ms |
| `SCAN` memakai awalan salah | `redis` C | Gagal: entri kota tidak dibuang |
| `Del` tidak menghapus | `redis` B | Gagal: kunci dihapus, dapat True, harus False |
| `ReadTimeout: -1` | `gagal` A | Gagal: (5, 1, 1, 0), harus (0, 1, 6, 5) |
| go-redis dengan retry bawaan (`MaxRetries: 0`) | `TestRedisMenggantungBerhentiDiBatasTanpaRetry` | Rekaman tidak menangkapnya (hasilnya sama, hanya lebih lama); tes Go gagal: 4 GET diterima, harus 1 |
| Gerbang `commit,isi` menyala secara bawaan | `TestBukaCacheKatalogTanpaGerbangBawaan` | Rekaman hanya menggantung (curl lab tanpa batas waktu), tidak gagal keras; tes Go gagal |
| `-lab-gerbang` diterima tanpa `-lab` | `TestBukaCacheKatalogMenolakFlagSalah` | Gagal: "gerbang tanpa -lab: harus ditolak" |
| Rute `POST /lab/gerbang/lepas` terdaftar tanpa gerbang | `TestEndpointLepasGerbangHanyaBilaGerbangAda` | Gagal: status 409, harus 404 |

Dua perubahan lolos dari rekaman sebelum tinjauan: retry bawaan dan gerbang yang menyala sendiri. Keduanya kini dijaga tes Go. Lima belas perubahan lain membuat rekaman gagal dengan pesan yang menyebut nilai yang salah. Dua yang terakhir (`-lab-gerbang` tanpa `-lab`, rute pelepas) adalah pemeriksaan baru yang hanya dijaga tes Go.

## Tidak dijalankan

- Stampede dan perlindungannya (lease, kedaluwarsa dini XFetch): hanya disebut di halaman. Di rekaman beban, 13 kunci dan TTL 60 detik berarti paling banyak 13 baca database per menit. Perlombaan antar-pembaca pada satu kunci dingin tidak direkam karena jumlahnya bergantung penjadwalan.
- Memendekkan TTL entri sampai waktu mulai promo berikutnya (cara menutup `redis.txt` G).
- go-redis dengan opsi bawaan (5 detik, 3 retry) sebagai client katalog: perbandingan itu direkam untuk batas login di `t3-instance` (`batas.txt` J), bukan untuk katalog.
- Valkey sebagai pengganti Redis (lisensi Redis 8, R3-10): lab memakai Redis 8; tidak ada perbandingan jalan.
- Redis dengan AUTH dan TLS, batas memori (`maxmemory`) dan kebijakan eviction (R3-10), Redis Cluster atau replika.
- ETag dan cache lokal di app Flutter (opsi ditolak di ADR 28): tidak ada client Dart di lab ini.
- Beban katalog enam kota dengan 60 kunci: yang direkam hanya Jakarta (13 kunci).
- Cache di memori proses dengan batas ukuran (LRU) dan pembersihan entri yang lewat TTL tetapi belum dibaca: `Memori` membuang entri hanya saat dibaca atau dihapus.
- Waktu baca Redis lawan PostgreSQL: bergantung mesin, dan `labs/b9-cache` sudah memuat rekaman lama (bahan, bukan dasar angka).
