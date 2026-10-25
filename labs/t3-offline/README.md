# Lab t3-offline · sinkron stok dan harga, key 24 jam lawan offline 62 jam

Lab Tahap 3 untuk masalah M24 dan ADR 29 (`plan/CERITA-TAHAP-3.md`, keputusan 971 dan 972). Akhir pekan warung berlangsung 62 jam, dari Jumat 17.00 sampai Senin 07.00 (Asumsi naskah). Idempotency key hanya hidup 24 jam (ADR 14). Lab ini merekam apa yang terjadi pada stok bila pengiriman ulang datang sesudah key itu hilang, dan apa yang menjaganya di jalur yang benar.

Server, skema, dan data awal milik `labs/api-t3`; lab ini tidak menyalin kodenya. Bagian baru di `api-t3` ada di bagian "Yang ditambah di api-t3". Skema lab ini bernama `tahap3_offline`, jadi `make -C labs/api-t3 run` tidak mengganggunya.

## Menjalankan

```bash
make -C labs/t3-offline run                   # semua bagian, ±1 menit, menulis labs/t3-offline/output/*.txt
make -C labs/t3-offline run BAGIAN=m24        # satu bagian: m24 versi kunci24 sinkron14
make -C labs/t3-offline cek                   # rekam ulang; gagal bila output/ berbeda dari yang di-commit
```

Lajur kerja lain memakai `COMPOSE_PROJECT_NAME`, `LAB_DB_PORT`, `LAB_REDIS_PORT`, dan `LAB_PORT_OFFSET` (`labs/README.md`). Port dasar API 18180, sama dengan `api-t3`, `t3-pool`, `t3-outbox`, dan `t3-instance`, jadi lab-lab itu tidak jalan bersamaan dalam satu lajur. Rekaman selalu memakai port dasar.

Setiap bagian membuat ulang schema dan data awal dari nol. Yang dicatat adalah status, isi jawaban, dan urutan, bukan waktu. Key idempotensi di rekaman adalah UUID tetap berentropi rendah (`00000000-0000-4000-8000-...`), jadi rekaman identik per byte dan pemindai secret tidak menandainya. App sungguhan memakai UUID acak.

Lab gagal keras bila hasilnya meleset.

| Rekaman | Isi | Halaman |
|---|---|---|
| `m24.txt` | M24: `PUT /produk/{id}/stok` tanpa versi, key 24 jam; ulangan 17 jam dikenali, ulangan 62 jam menimpa stok baru dengan angka lama | 3.20 |
| `versi.txt` | Jalur benar: `POST /sinkron` bersyarat versi; kunci 14 hari mengenali ulangan, operasi yang belum pernah sampai ditolak 409 membawa `sekarang` | 3.20, 3.21 |
| `kunci24.txt` | Idempotency-Key di bayar, kiriman, dan pesanan: ulangan 17 jam dijawab sama, ulangan 62 jam dikerjakan lagi | 3.21 |
| `sinkron14.txt` | Kunci 14 hari lawan job `-bersih`, queue paling lama 7 hari, pembayaran yang tidak lewat sinkron | 3.21 |

## Waktu diperankan (Ilustrasi mekanisme)

Tidak ada bagian yang menunggu 62 jam. Server jalan dengan `-jam-lab`: jam service dibekukan di "Jumat 16.50" lalu dimajukan lewat `POST /lab/jam`. Umur key idempotensi, umur sesi (8 jam), dan umur operasi di queue (7 hari) dihitung dari jam itu. Setiap lompatan diberi catatan "Ilustrasi mekanisme" di rekaman, dan sesi dibuat ulang sesudahnya karena sesi lama sudah lewat 8 jam.

Job `-bersih` memakai jam database, yang tidak bisa dimajukan. Di bagian `sinkron14`, cap waktu `operasi_sinkron.dibuat_di_hp` digeser ke belakang dengan `UPDATE` sebesar lompatan jam. Rekaman memuat kedua langkah itu.

Tidak diilustrasikan: jam HP yang salah ke arah belakang dan jam database yang berbeda dari jam service.

## Yang direkam

**M24 (`m24.txt`).** Jumat 16.50 Ani mencatat "ayam habis": stok 0, versi 2. Jawabannya hilang. Sabtu 07.50 Ani mengisi 30 porsi lewat dasbor (versi 3).

Senin 06.50 HP mengirim ulang operasi yang sama dengan key yang sama. Key sudah berumur 62 jam, jadi server memperlakukannya baru dan menerapkan `stok = 0` lagi tanpa memeriksa versi: stok 0, versi 4. Budi melihat "habis", dan tidak ada error di sisi mana pun.

Pembanding di bagian C: nasi goreng dikirim ulang 17 jam sesudah Jumat. Key masih dikenali, server menjawab dengan respons tersimpan, dan stok 50 tidak berubah. Hanya lama ulangan yang membedakan kedua hasil itu.

**Versi bersyarat (`versi.txt`).** Urutan yang sama lewat `POST /sinkron`. Soto: kunci yang sama dikenali (`ulang: true`) dan stok 30 dari Sabtu utuh.

Bakso: operasi yang belum pernah sampai tiba pertama kali pada hari Senin. Kuncinya tidak dikenal, tetapi versi dasar 1 sudah lewat. Server menjawab 409 dengan `sekarang` (stok 30, versi 2) dan tidak mengubah apa pun.

Ani memilih. Memilih berarti operasi baru dengan kunci baru dan versi dasar dari `sekarang`.

**Key 24 jam di jalur uang (`kunci24.txt`).** Tanpa header, dua pembayaran yang sama menjadi dua jurnal (perilaku lama, app 1.0 dan 1.1). Dengan key, ulangan 17 jam kemudian dijawab dengan status, isi, dan `Location` yang sama tanpa jurnal baru.

Key yang sama dengan isi lain atau dari akun lain ditolak 422, dan bentuk key yang rusak ditolak 400. Ulangan 62 jam kemudian dikerjakan lagi di ketiga jalur: saldo Budi turun dua kali. Itu alasan pembayaran tidak pernah offline (ADR 29).

**Kunci sinkron (`sinkron14.txt`).** Kunci berumur 62 jam masih dikenali dan job `-bersih` tidak menyentuhnya. Operasi di queue 6 hari 23 jam diterima, 7 hari 1 jam ditolak. Kunci yang sama dengan isi lain ditolak 422.

Sesudah 15 hari job `-bersih` membuang kuncinya, dan operasi lama itu ditolak karena lebih tua dari 7 hari. Queue 7 hari lebih pendek dari kunci 14 hari, jadi kunci selalu hidup selama operasinya masih bisa dikirim.

Jenis `bayar`, `transfer`, dan `topup` ditolak 422 apa pun isinya.

## Yang ditambah di api-t3

Semuanya di file baru atau di belakang flag. Tanpa flag dan tanpa header, `api-t3` berperilaku seperti sebelumnya (rekaman lab lain identik).

| Bagian | Fungsi |
|---|---|
| `Idempotency-Key` di `POST /transfers`, `/kiriman`, `/pesanan` | Opsional. Middleware `idempoten` di `internal/handler/handler_idempoten.go`, klaim di `internal/repo/idempoten.go`, tabel `kunci_idempotensi` yang sudah ada sejak api-t2 |
| `-rentan stok-timpa` | M24: menambah `PUT /produk/{id}/stok` yang menimpa stok tanpa versi; hanya dengan flag |
| `openapi.yaml` | Header `Idempotency-Key` opsional dan jawaban 409 di bayar dan kiriman; tidak ada yang merusak client lama |
| Tes Go | `idempoten_test.go` (service dan handler) dan `offline_test.go`: klaim, kedaluwarsa tepat 24 jam, 20 klaim bersamaan satu pemenang, 20 perubahan dari versi yang sama satu pemenang, batas queue 7 hari |

Aturan jalur key (keputusan 971):

- Key berbentuk String berisi UUID (draft-ietf-httpapi-idempotency-key-header-08, R3-90). Header ada tetapi bentuknya salah: 400.
- Klaim dilakukan dalam satu `INSERT ... ON CONFLICT DO UPDATE ... WHERE kedaluwarsa <= jam service`. Key yang kedaluwarsa diklaim ulang oleh permintaan baru; tidak ada job pembersih dan tidak ada tidur.
- Ulangan dengan key, akun, dan isi yang sama sesudah selesai: respons tersimpan dikirim ulang. Isi atau akun lain: 422. Key yang belum selesai: 409.
- Respons 5xx dan 429 tidak disimpan dan key dilepas; handler yang panik juga melepasnya. Respons 4xx lain ikut disimpan: niat baru memakai key baru.
- Kerja dan penyimpanan respons bukan satu transaction. Server yang mati di antara COMMIT dan penyimpanan meninggalkan key berstatus diproses sampai kedaluwarsa, dan ulangan mendapat 409 tanpa mengerjakan ulang: paling banyak sekali. Tidak dijalankan: rekaman mati di tengah ada di `labs/e3-idempotency`.

## Uji mutasi

Satu perubahan, jalankan, pulihkan; `git diff` kosong sesudahnya. Hasil dari tes Go dan run lab, dengan mutan yang sempat lolos di bagian berikutnya.

| Mutasi | Tes Go | Rekaman lab |
|---|---|---|
| M1 cek versi di `TerapkanOperasi` dibuang | gagal: `TestSinkronBersamaanSatuPemenang`, `TestSinkronSekaliPerKunci` | gagal `versi`: bakso dijawab 200, harus 409 |
| M2 `UmurKunci` 24 jam jadi 7 hari | gagal: `TestKunciKedaluwarsaSesudah24Jam` | gagal `kunci24` E (saldo 166.000, harus 103.000) dan `m24` D |
| M3 `UmurKunci` jadi 1 jam | gagal: `TestKunciKedaluwarsaSesudah24Jam` | gagal `kunci24` C: ulangan 17 jam bukan jawaban pertama |
| M4 klaim ulang key kedaluwarsa dimatikan | gagal: `TestKunciKedaluwarsaSesudah24Jam` | gagal `kunci24` E |
| M5 pemeriksaan isi beda dibuang | gagal: `TestKlaimKunciBaruBerjalanUlangBeda`, `TestIdempotenUlanganTanpaEfekGanda` | gagal `kunci24` D: isi beda dijawab 201, harus 422 |
| M6 pemeriksaan akun lain dibuang | gagal: `TestKlaimKunciBaruBerjalanUlangBeda` | gagal `kunci24` D |
| M7 retensi `-bersih` 14 hari jadi 1 hari | tidak ada tes Go (kode di `cmd/api`) | gagal `sinkron14` A: 1 baris terbuang, harus 0 |
| M8 batas queue 7 hari dibuang | gagal: `TestSinkronBatasUmurQueue`, `TestSinkronSekaliPerKunci` | gagal `sinkron14` B: 7 hari 1 jam dijawab 200 |
| M9 kunci sinkron dengan isi lain diterima | gagal: `TestSinkronSekaliPerKunci` | gagal `sinkron14` C |
| M10 `PUT /produk/{id}/stok` tanpa middleware key | tidak ada tes Go | gagal `m24` C: ulangan 17 jam menerapkan stok lagi |
| M11 respons 5xx dan 429 ikut disimpan | gagal: `TestIdempotenUlanganTanpaEfekGanda` | tidak direkam |
| M12 `PATCH /produk/{id}` tanpa syarat versi | gagal: `TestUbahProdukBersamaanSatuPemenang`, `TestUbahProdukBersyaratVersi` | gagal `versi` B: tab dasbor stale dijawab 200 |
| M13 penolakan khusus pembayaran di sinkron dibuang | gagal: `TestSinkronMenolakPembayaran` | gagal `sinkron14` E: pesan penolakan berubah |
| M14 handler yang panik tidak melepas key | gagal: `TestIdempotenPanikMelepasKey` | tidak direkam |
| M15 respons tidak disimpan | gagal: `TestIdempotenUlanganTanpaEfekGanda` | gagal `kunci24` C: ulangan dijawab 409 sedang diproses |
| M16 tanpa header tidak diteruskan | gagal: `TestIdempotenTanpaHeaderMeneruskan` | gagal `kunci24` A: dijawab 400, harus 201 |
| M17 sidik jari mengabaikan path | gagal: `TestIdempotenKeySamaEndpointBeda` | tidak direkam |
| M18 sidik jari memakai body mentah | gagal: `TestIdempotenUlanganTanpaEfekGanda` | tidak direkam |
| M19 batas kedaluwarsa `<=` jadi `<` | gagal: `TestKunciKedaluwarsaSesudah24Jam` | tidak direkam |

## Jujur tentang hasilnya

Semua 19 mutasi tertangkap oleh tes Go, rekaman lab, atau keduanya. Empat lolos pada percobaan pertama dan ditutup sebelum PR dibuka.

- M12 lolos di lab: dasbor di rekaman selalu mengirim versi terbaru. Rekaman `versi` sekarang punya tab dasbor stale yang harus dijawab 409.
- M13 lolos di tes Go: penolakan umum ("stok atau harga") tetap `ErrValidasi`. Tes sekarang memeriksa field dan pesannya.
- M2 akan lolos di tes Go karena tes memakai konstanta `UmurKunci` sendiri sebagai batas. Tes sekarang memakai angka 24 jam tertulis.
- M5 dan M6 pada percobaan pertama gagal di lab karena `KeyError` di skrip, bukan karena rekaman memeriksa isinya. Skrip sekarang gagal dengan pesan.

Mutasi sinkron M9 versi pertama (membuang satu field dari perbandingan) bukan mutan yang efektif: field lain tetap berbeda. Diganti dengan mematikan penolakan seluruhnya.

Yang tidak dimutasi dan tidak dijalankan: server yang mati di antara COMMIT dan penyimpanan respons, serta jam database yang berbeda dari jam service. Lab memakai satu jam service untuk semua umur key.

## Yang belum ada di lab ini

- **Klaim dan penyimpanan respons dalam satu transaction.** Tidak dijalankan. Rancangan e3-idempotency menulis status selesai di transaction jurnal; di api-t3 itu menyentuh `Bayar`, `Kirim`, dan `Pesan`, jadi tidak diubah di lab ini.
- **Pembersihan baris key.** Tidak ada job: baris yang kedaluwarsa tetap di `kunci_idempotensi` sampai key yang sama dipakai lagi. Bila semua pembayaran memakai key, tabel tumbuh 7.500 baris per hari (R3-31, Asumsi), ±2,7 juta per tahun. Ukuran baris tidak diukur.
- **Cache katalog (t3-cache).** `TimpaStok` dan `POST /sinkron` mengubah stok tanpa menghapus entri cache katalog; hanya `PATCH /produk/{id}` yang menghapus (`internal/service/katalog_cache.go`). Dibaca dari kode, tidak dijalankan: lab ini memakai server tanpa cache.
- **Klaim key sebelum penahan laju.** Di `/kiriman`, key diklaim sebelum penahan per IP dan per akun memeriksa. Permintaan yang kena 429 melepas key, tetapi tiap key baru tetap menulis satu baris dulu. Tidak diukur.
- **Kunci `operasi_sinkron` global.** Kunci utama tabel itu satu untuk semua akun: akun lain mendapat 422 untuk kunci yang sudah ada (direkam di `sinkron14.txt` C). Dua POST bersamaan dengan kunci sama untuk produk berbeda mencapai unique violation dan berakhir 500 (dibaca dari kode, tidak dijalankan karena hasilnya bergantung pada urutan). Perbaikan (kunci per perangkat) mengubah rekaman `api-t3/output/sinkron.txt`, jadi tidak dikerjakan di sini.
- **Last-write-wins dengan cap waktu HP, CRDT, key 7 hari untuk semua endpoint, queue pembayaran offline.** Opsi yang ditolak ADR 29. Tidak dijalankan; alasannya ada di halaman ADR, bukan di rekaman.
- **Aplikasi Flutter.** Tidak ada client sungguhan: HP diperankan oleh curl. Perilaku queue lokal, tombol sinkron, dan layar konflik tidak dijalankan.
- **Worker dan push.** Baris outbox dari pembayaran menunggu; tidak ada worker di lab ini.
- **Jam database dan jam service yang berbeda.** Tidak dijalankan.
