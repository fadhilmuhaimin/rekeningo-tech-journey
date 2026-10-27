# Lab t4-webhook · gateway tiruan, webhook ganda, dan rekonsiliasi

Lab Tahap 4 (`plan/CERITA-TAHAP-4.md`, bagian 3 dan 3b; masalah M29 dan M30; ADR 34 dan ADR 35; tugas `lab-t4-webhook`). Lab ini membuktikan lewat rekaman apa yang terjadi bila kabar dari luar datang dua kali, bersamaan, terlambat, tidak berurutan, palsu, atau tidak datang sama sekali, dan bagaimana uangnya tetap dicatat satu kali. Sumber halaman 4.4, 4.6, 4.7, 4.8, 4.9 dan widget `W4-webhook`.

Server, skema, data awal, dan gateway tiruan adalah milik `labs/api-t4` (`dasar_t4.py`, `cmd/api`, `cmd/tiruan`), bukan salinan: lab ini hanya menambah skenario di atasnya, di schema sendiri `tahap4_webhook` (tes Go di `tahap4_webhook_tes`). Mode rentan yang dipakai adalah `webhook-v1` dan `webhook-cek-tulis` (api-t4); flag lab yang dipakai adalah `-lab-tanpa-lapis`, `-lab-jeda-cek-tulis`, `-jam-lab`, dan `-rahasia-webhook`. Gateway adalah proses tiruan lokal; tidak ada layanan, data, atau kredensial nyata, dan lab ini tidak mengklaim kepatuhan atau izin apa pun.

## Menjalankan

```bash
make -C labs/t4-webhook run                  # semua bagian, ±40 detik, menulis labs/t4-webhook/output/*.txt
make -C labs/t4-webhook run BAGIAN=retry     # satu bagian: ganda tandatangan retry urutan rekon testing
make -C labs/t4-webhook cek                  # rekam ulang; gagal bila output/ berbeda dari yang di-commit
```

Port dasar sama dengan api-t4 (ditambah `LAB_PORT_OFFSET`): lab ini tidak berjalan serentak dengan `api-t4` di lajur yang sama. Penerima webhook tiruan di proses `run.py` memakai port sementara yang dipilih sistem dan tidak tertulis di rekaman. Setiap bagian membuat ulang schema dan data awalnya dari nol, jadi `output/*.txt` tidak bergantung pada urutan bagian. Token, waktu, tanggal, dan nomor order disamarkan; waktu retry diperankan (waktu maya), tidak ditunggu. Lab gagal keras bila hasilnya meleset dari yang diharapkan.

## Yang ditambahkan ke api-t4 oleh lab ini

- **Job `-koreksi-rekon`** (`internal/service/koreksi_rekon.go`, `internal/repo/koreksi_rekon.go`): menutup insiden rekonsiliasi lewat jurnal normal, satu transaction per insiden. Baris insiden dikunci `FOR UPDATE` dan hanya yang masih `terbuka` dikerjakan, jadi job yang dijalankan dua kali, atau dua job bersamaan, menghasilkan satu jurnal per insiden (ADR 19). Aturannya ada di bagian "Aturan job koreksi".
- **Gateway tiruan** (`cmd/tiruan/jadwal.go`, `main.go`): `POST /lab/jadwal` (jadwal ulangan dengan waktu maya), `POST /lab/rahasia` (rotasi rahasia penanda tangan, langsung dipakai), `GET /lab/dicek` (berapa kali Rekeningo menanyakan keadaan tiap order), dan di `POST /lab/webhook` dua pilihan baru: `body_cantik` (body sah berindentasi, ditandatangani apa adanya) dan `url_target` (kirim ke penerima lain, supaya lab bisa melihat byte yang sesungguhnya dikirim).
- Tes Go untuk keduanya: `koreksi_rekon_test.go` (tujuh tes, PostgreSQL sungguhan) dan `cmd/tiruan/jadwal_test.go`. Rekaman `api-t4/output/testing.txt` ikut berubah karena daftar tes bertambah.

## Versi dasar dan sumber (dicek 2026-10-27)

| Komponen | Versi atau sumber | Catatan |
|---|---|---|
| PostgreSQL, Go, pgx | 17.11, go1.27.1, v5.11.0 | dari kepala rekaman dan `go.mod` api-t4; sama dengan tugas `lab-api-t4`; tidak ada dependency baru |
| Python (hanya skrip rekaman) | 3.14.7, psycopg 3.3.6; modul standar `hmac` dan `hashlib` untuk pembanding tanda tangan | `labs/.venv` |
| Jadwal ulangan per kode status, jeda 2, 10, 30, 90, 210 menit, tanda tangan SHA-512 atas field | dokumentasi satu gateway nyata, dibuka 2026-10-27 | `docs.midtrans.com/docs/https-notification-webhooks`; riset R4-305. Jumlah ulangan per kode dan jeda dibaca persis; dokumentasi itu menggeser tiap percobaan secara acak, tiruan tidak |
| Toleransi 5 menit, tanda tangan dibuat ulang tiap percobaan, rahasia lama aktif sampai 24 jam, urutan tidak dijamin, dua Event untuk satu kejadian | dokumentasi gateway nyata lain, dibuka 2026-10-27 | `docs.stripe.com/webhooks`; riset R4-306 |
| Angka pembanding ADR 34 | Hitungan dari rumus naskah bagian 3 | riset R4-307 |

## Rekaman

| Rekaman | Isi | Halaman |
|---|---|---|
| `ganda.txt` | (a) kiriman yang sama dua kali: dua jurnal pada handler versi pertama, satu jurnal pada versi ADR 34 (balasan 200 yang pertama hilang di jalan) | 4.6, 4.7 |
| `ganda-serentak.txt` | (b) dua kiriman bersamaan lolos cek-lalu-tulis; tanpa dua lapis cadangan hanya kunci utama `event_id` yang menahan event yang sama, dan event berbeda untuk satu kejadian lolos | 4.6, 4.7 |
| `tandatangan.txt` | (c) tanda tangan atas byte mentah lawan JSON yang diurai ulang, isi yang diubah, timestamp di luar toleransi; (d) rotasi rahasia: ditolak 401, diterima selama tumpang tindih, ditolak lagi sesudah rahasia lama dicabut; (i) tiga gaya tanda tangan sebagai pembanding | 4.7, 4.8 |
| `retry.txt` | (e) jadwal ulangan gateway per kode status pada waktu maya; M30: enam kiriman 401 lalu jadwal habis, lawan disamakan pada menit 12; pembanding koneksi ADR 34 (Hitungan) | 4.8, 4.9 |
| `urutan.txt` | (f) kabar yang datang mundur diparkir, dan kapan gateway ditanya; (g) tiga lapis penahan jurnal kedua dan umur Idempotency-Key 24 jam | 4.7, 4.9 |
| `rekon.txt` | (h) job cek status untuk top-up menunggu lebih dari 30 menit; rekonsiliasi harian dengan tiga jenis selisih; koreksi lewat jurnal normal; dua job bersamaan | 4.8, 4.9 |
| `testing.txt` | `go vet` dan tes Go jalur webhook (tanda tangan, event, lapis penahan, cek status, rekonsiliasi, koreksi, jadwal ulangan) | 4.9 |

## Pernyataan naskah dan rekamannya

| Pernyataan (tabel "Yang harus bisa dibuktikan lab" di naskah dan butir tugas lab) | Hasil | Rekaman |
|---|---|---|
| (a) Kiriman yang sama dua kali: dua jurnal pada versi pertama, satu pada versi ADR 34 | Terbukti | `ganda.txt` A, B |
| (b) Dua kiriman bersamaan lolos cek-lalu-tulis (jeda buatan 300 ms); hanya kunci utama `event_id` yang menahan | Terbukti. Tanpa `status` dan `kunci`, event_id yang sama: satu `diproses` dan satu `ganda`; dua event_id berbeda: dua jurnal | `ganda-serentak.txt` A, B |
| (c) Tanda tangan atas body yang diurai ulang gagal pada isi yang sah dan lolos atas byte mentah; isi diubah dan timestamp lama ditolak | Terbukti. Toleransi 5 menit adalah Asumsi untuk tiruan (bawaan library satu gateway nyata, R4-306): 240 detik diterima, 360 detik ditolak | `tandatangan.txt` A, B |
| (d) Rahasia lama menolak kiriman bertanda rahasia baru (401); masa tumpang tindih menerimanya | Terbukti, di sisi Rekeningo (`-rahasia-webhook <baru>,<lama>`). Gateway tiruan merotasi langsung tanpa tumpang tindih; gateway nyata yang dirujuk menahan rahasia lama sampai 24 jam di sisinya | `tandatangan.txt` C; `retry.txt` B, C |
| (e) Jadwal 2, 10, 30, 90, 210 menit (total 342 menit) pada waktu maya, berhenti sesudah kiriman ke-6; jumlah ulangan per kode | Terbukti: 2xx 1 kiriman, 400 dan 404 3, 500 2, 503 5, 401 dan 502 6 | `retry.txt` A, B |
| (f) `menunggu` sesudah `dibayar` tidak memundurkan status; yang datang mundur diparkir dan dicek ke gateway di luar transaction | Sebagian: diparkir terbukti; "dicek ke gateway" hanya untuk top-up yang masih `menunggu` atau `tidak_pasti` (lihat "Selisih dengan naskah") | `urutan.txt` F1 sampai F3 |
| (g) Dua Event berbeda untuk satu kejadian tidak menjurnal dua kali karena Idempotency-Key `order_id`; key habis 24 jam dan hanya status `topup_bank` yang menahan | Terbukti, dengan jam service diputar 25 jam (`-jam-lab`) | `urutan.txt` G |
| (h) Cek status top-up `menunggu` lebih dari 30 menit, rekonsiliasi harian tiga jenis selisih sebagai `insiden_rekon`, dikoreksi lewat jurnal normal oleh job idempoten, bukan UPDATE pada posting atau `buku.saldo_cache` | Terbukti. Umur top-up diputar mundur 31 menit lewat UPDATE kolom `dibuat` oleh pemilik schema (lab saja). Posting yang ada sebelum koreksi tidak berubah (sidik MD5 sama), jurnal tetap seimbang, `saldo_cache` sama dengan jumlah posting | `rekon.txt` A, B, C |
| (i) Tiga gaya tanda tangan sebagai pembanding | Pembanding murni: tiga fungsi verifikasi di `run.py`; hanya gaya 1 dijalankan di api-t4. Bentuk gaya 2 dari rumus satu gateway nyata (R4-305, field lab); bentuk gaya 3 [perlu verifikasi] | `tandatangan.txt` D |
| Pembanding ADR 34: koneksi terpakai pada 3,47 kiriman per detik dengan W = 5 detik | Hitungan, Tidak dijalankan: L = 17,4 melewati pool 10; ambang W = 2,6 detik; pada 0,579 per detik L = 2,9 | `retry.txt` D |

## Aturan job koreksi

`./api-t4 -koreksi-rekon` mengerjakan semua insiden `terbuka`, menurut nomor. Pemanggilan ke gateway (hanya untuk `tidak_di_gateway`) terjadi sebelum transaction dibuka (ADR 22). Aturan di bawah adalah pilihan lab (Asumsi): naskah hanya menyebut "koreksi lewat jurnal normal oleh job idempoten".

| Jenis insiden | Syarat dan koreksi | Bila syarat tidak terpenuhi |
|---|---|---|
| `tidak_di_ledger` (gateway settlement, ledger belum) | top-up `menunggu` atau `tidak_pasti`, jumlah di laporan sama dengan jumlah order: dikredit lewat fungsi yang sama dengan webhook dan job cek status (jurnal `topup_bank`, Idempotency-Key `order_id`). Top-up yang sudah `dibayar` lewat jalur lain: ditutup dengan merujuk jurnalnya | tetap terbuka: akun dibekukan atau saldo akan melewati batas tingkat, top-up `kedaluwarsa` atau `gagal`, order tidak dikenal, jumlah beda dari order |
| `jumlah_beda` (selisih = gateway − ledger) | selisih positif: dikredit lewat jurnal `topup_bank` kedua dan satu pemberitahuan | tetap terbuka: selisih nol atau negatif (uang yang sudah dikredit mungkin sudah terpakai), akun dibekukan, melewati batas tingkat, top-up belum `dibayar` |
| `tidak_di_gateway` (ledger sudah, laporan tanggal itu tidak memuat) | gateway ditanya: settlement dengan jumlah yang sama (hanya tanggalnya lain): ditutup tanpa jurnal. Order tidak dikenal atau tidak settlement: kredit dibalik lewat jurnal `pembalik` (cermin jurnal asal) bila saldo cukup; sudah dibalik lewat jalur lain: ditutup dengan merujuk jurnal pembalik itu | tetap terbuka: gateway tidak menjawab, jumlah settlement berbeda, uangnya sudah terpakai (saldo tidak cukup), top-up belum `dibayar` |

Job tidak mengkredit akun yang tidak boleh dikredit dan tidak membuat saldo negatif; itu keputusan tim risk atau Keuangan (PRD v4 belum menjawab pengembalian dana). Pembatalan settlement oleh gateway sesudah webhook (`failure` di `rekon.txt` B) adalah Asumsi lab untuk memerankan `tidak_di_gateway` yang bukan soal tanggal. Pemilik akun tidak diberi tahu saat kreditnya dibalik (belum ada).

## Selisih dengan naskah (lab yang benar)

Pembaruan naskah dikerjakan KONSISTENSI-4; lab ini yang benar.

1. **ADR 34 dan M29, baris "kabar yang datang mundur diparkir lalu dicek ke gateway di luar transaction"**: kabar yang tidak maju selalu diparkir (`webhook_event.hasil = diparkir`, status top-up tidak berubah). Gateway ditanya sesudah COMMIT hanya bila top-up masih `menunggu` atau `tidak_pasti` (mis. diparkir karena batas saldo, `urutan.txt` F2: satu kali). Top-up yang sudah `dibayar` atau `kedaluwarsa` tidak ditanyakan (`dicek` = 0): jawaban gateway tidak bisa mengubah statusnya.
2. **`settlement` sesudah `expire`** (`urutan.txt` F3): diparkir, status tetap `kedaluwarsa`, uang sudah di bank dan tidak ada jurnal. Hanya rekonsiliasi harian yang menemukannya (`tidak_di_ledger`), dan `-koreksi-rekon` tidak menutupnya karena top-up berstatus akhir. Naskah tidak menyebut kasus ini; apakah pembayaran sesudah kedaluwarsa dikredit adalah keputusan produk yang belum ada.
3. **Tanda tangan ulang tiap percobaan**: tiruan menandatangani ulang tiap percobaan dengan timestamp-nya (sesuai dokumentasi satu gateway nyata, R4-306). Gateway yang tanda tangannya tanpa timestamp (gaya 2 dan 3 di `tandatangan.txt` D) tidak punya masalah ini, tetapi juga tidak menolak kiriman lama.
4. **Aturan koreksi**: naskah menulis satu kalimat; lab memilih aturan per jenis (bagian di atas). Selisih negatif dan pembalikan yang membuat saldo negatif sengaja tidak otomatis.

## Asumsi dan label

- Toleransi waktu 5 menit, umur cek status 30 menit, jeda lab 300 ms di antara cek dan tulis, kode berganti di antara percobaan (kode kiriman terakhir), tidak ada geseran acak pada tiap percobaan: Asumsi untuk tiruan.
- Waktu maya hanya untuk jam service (`-jam-lab`) dan timestamp tanda tangan; `now()` di PostgreSQL tetap waktu sungguhan. Umur top-up pada `rekon.txt` A diputar lewat UPDATE oleh pemilik schema.
- Angka di bagian "Hitungan" `retry.txt` D adalah hitungan dari angka naskah, bukan pengukuran.

## Yang belum ada di lab ini

- Jitter acak pada tiap percobaan, pengalihan 3xx (dokumentasi gateway itu: 301, 302, 303 tanpa ulangan; 307 dan 308 diikuti), ulangan manual dari dasbor, dan batas ulangan beberapa hari milik gateway lain: Tidak dijalankan.
- Service pembayaran terpisah yang memanggil ledger lewat API dengan Idempotency-Key, dan kegagalan di antara dua langkahnya: `t4-modul`.
- Pengembalian dana untuk top-up yang tertahan, pemberitahuan ke pemilik akun saat kredit dibalik, pembatasan umur insiden, dan retensi `webhook_event` 30 hari: tidak ada.
- Koneksi terpakai pada 3,47 kiriman per detik tidak dijalankan: lab tidak menahan koneksi 5 detik per kabar.
- Gaya tanda tangan 2 dan 3 hanya fungsi pembanding; gaya 3 [perlu verifikasi] ke dokumentasi gateway yang memakainya.

## Uji mutasi lab ini

Satu perubahan per mutan pada salinan `labs/` di folder sementara (skrip sementara, tidak di repo), lalu tes Go atau bagian `run.py` dijalankan dari salinan itu; yang diubah harus membuat tes atau lab gagal karena sebab yang diuji, bukan karena kompilasi atau koneksi. Schema tes dibangun ulang sebelum tiap mutan (tabel append-only seperti `jurnal` tidak boleh meracuni mutan berikutnya), dan tes yang membaca keadaan database memakai `application_name` milik proses tesnya. Hasil: **43 dari 43 mutan tertangkap**, tanpa mutan yang setara perilaku. Mutan K dan J memakai `go test` dengan PostgreSQL sungguhan; mutan L menjalankan bagian lab dari salinan.

Putaran pertama menemukan satu mutan yang lolos: K24 (top-up yang belum dibayar ikut dikoreksi pada `jumlah_beda`), jadi tes dilengkapi dengan kasus top-up belum dibayar pada `jumlah_beda` dan `tidak_di_gateway`. Delapan mutan awal gagal kompilasi (variabel atau impor tidak terpakai sesudah perubahan) dan ditulis ulang supaya mengubah perilaku saja; mutan L7 tidak bisa ditangkap tes Go karena tes menghitung tanda tangan dengan fungsi yang sama, sehingga ia ditangkap lewat HMAC yang dihitung ulang secara terpisah di `run.py`. K27 ditambahkan sesudah pemeriksaan jumlah pada insiden yang sudah dibayar jalur lain dibuat. Mutan atas kode webhook milik api-t4 (W1 sampai W21) ada di README api-t4; mutan L1 sampai L6 di sini menunjukkan bahwa rekaman lab ini sendiri gagal bila perilakunya berubah.

| Mutan | Bagian | Perilaku yang diubah | Yang menangkap | Hasil |
|---|---|---|---|---|
| K1 | Koreksi insiden (`koreksi_rekon.go`) | status insiden tidak diperiksa lagi sesudah lock | `DuaJobBersamaanSatuJurnalPerInsiden` | tertangkap |
| K2 | Koreksi insiden (`repo/koreksi_rekon.go`) | baris insiden dibaca tanpa `FOR UPDATE` | `DuaJobBersamaanSatuJurnalPerInsiden` | tertangkap |
| K3 | Koreksi insiden | insiden yang sudah dikredit lewat jalur lain ditutup tanpa merujuk jurnalnya | `TidakDiLedgerYangSudahDikreditJalurLain` | tertangkap |
| K4 | Koreksi insiden | jumlah di laporan gateway diganti jumlah order saat mengkredit | `TidakDiLedgerYangDitahan` | tertangkap |
| K5 | Koreksi insiden | selisih negatif pada jumlah_beda ikut dikoreksi | `JumlahBeda` | tertangkap |
| K6 | Koreksi insiden | akun dibekukan tidak diperiksa pada jumlah_beda | `JumlahBeda` | tertangkap |
| K7 | Koreksi insiden | batas saldo menurut tingkat tidak diperiksa pada jumlah_beda | `JumlahBeda` | tertangkap |
| K8 | Koreksi insiden | tanda posting jurnal koreksi dibalik | `JumlahBeda` | tertangkap |
| K9 | Koreksi insiden | jurnal koreksi memakai jumlah order, bukan selisih | `JumlahBeda` | tertangkap |
| K10 | Koreksi insiden | pemberitahuan koreksi tidak ditulis | `JumlahBeda` | tertangkap |
| K11 | Koreksi insiden | gateway yang tidak menjawab dianggap order tidak settlement (kredit dibalik) | `GatewayTidakMenjawabTidakMembalik` | tertangkap |
| K12 | Koreksi insiden | jumlah settlement tidak dibandingkan dengan jumlah yang dikredit | `TidakDiGateway` | tertangkap |
| K13 | Koreksi insiden | saldo yang cukup untuk jurnal pembalik tidak diperiksa | `TidakDiGateway` | tertangkap |
| K14 | Koreksi insiden | jurnal pembalik bukan cermin jurnal asal | `TidakDiGateway` | tertangkap |
| K15 | Koreksi insiden | pemeriksaan jurnal yang sudah dibalik dihapus | `TidakDiGateway` | tertangkap |
| K16 | Koreksi insiden | syarat status settlement dibalik | `TidakDiGateway` | tertangkap |
| K17 | Koreksi insiden | keterangan pembalik kurang dari 20 karakter | `TidakDiGateway` | tertangkap |
| K18 | Koreksi insiden | insiden yang dikoreksi dihitung sebagai selesai tanpa jurnal | `TidakDiLedgerMengkreditLaluKabarTerlambatGanda`, `JumlahBeda` dan 2 lain | tertangkap |
| K19 | Koreksi insiden | insiden yang harus ditahan ikut ditutup | `TidakDiLedgerYangDitahan`, `JumlahBeda` dan 2 lain | tertangkap |
| K20 | Koreksi insiden (`repo/koreksi_rekon.go`) | penutupan insiden tidak mengikat jurnalnya | `TidakDiLedgerMengkreditLaluKabarTerlambatGanda`, `TidakDiLedgerYangSudahDikreditJalurLain` dan 3 lain | tertangkap |
| K21 | Koreksi insiden (`repo/koreksi_rekon.go`) | daftar insiden terbuka memuat yang sudah selesai | `TidakDiLedgerMengkreditLaluKabarTerlambatGanda`, `TidakDiLedgerYangDitahan` dan 3 lain | tertangkap |
| K22 | Koreksi insiden | buku milik akun tidak dikunci sebelum buku sistem pada jurnal pembalik | `TidakDiGateway` | tertangkap |
| K23 | Koreksi insiden | top-up kedaluwarsa atau gagal diperlakukan masih menunggu | `TidakDiLedgerYangDitahan` | tertangkap |
| K24 | Koreksi insiden | top-up yang belum dibayar ikut dikoreksi pada jumlah_beda | `JumlahBeda` | tertangkap |
| K25 | Koreksi insiden | galat gateway dibuang sebelum keputusan | `GatewayTidakMenjawabTidakMembalik` | tertangkap |
| K26 | Koreksi insiden | order yang tidak dikenal gateway dianggap galat, bukan alasan membalik | `TidakDiGateway` | tertangkap |
| K27 | Koreksi insiden | jumlah yang sudah dikredit tidak dibandingkan dengan laporan gateway (tidak_di_ledger yang sudah dibayar) | `TidakDiLedgerYangSudahDikreditJalurLain` | tertangkap |
| J1 | Jadwal ulangan (`cmd/tiruan/jadwal.go`) | kode 503 diulang 3 kali, bukan 4 | `JumlahUlangPerKode`, `JadwalBerhentiMenurutKode` dan 1 lain | tertangkap |
| J2 | Jadwal ulangan | kode 500 diulang 2 kali, bukan 1 | `JumlahUlangPerKode`, `JadwalBerhentiMenurutKode` dan 1 lain | tertangkap |
| J3 | Jadwal ulangan | kode 404 tidak masuk daftar dua ulangan | `JumlahUlangPerKode`, `JadwalBerhentiMenurutKode` | tertangkap |
| J4 | Jadwal ulangan | jeda terakhir 200 menit, bukan 210 | `JedaTotal342Menit`, `JadwalDariDanSampai` | tertangkap |
| J5 | Jadwal ulangan | ulangan yang dipakai dihitung satu terlalu banyak | `JadwalBerhentiMenurutKode`, `JadwalTandaTanganMemakaiWaktuMayaDanByteAsli` dan 3 lain | tertangkap |
| J6 | Jadwal ulangan | tanda tangan memakai waktu sungguhan, bukan waktu maya | `JadwalTandaTanganMemakaiWaktuMayaDanByteAsli` | tertangkap |
| J7 | Jadwal ulangan | penerima tidak diberi tahu jam maya | `JadwalMemberiTahuJamKePenerimaSebelumTiapKiriman` | tertangkap |
| J8 | Jadwal ulangan | offset kiriman bergeser satu jeda | `JedaTotal342Menit`, `JadwalDiterimaDiTengahBerhenti` dan 1 lain | tertangkap |
| L1 | Tanda tangan dan lapis penahan (`service/pembayaran.go`), lewat lab | timestamp tidak diperiksa | lab gagal: timestamp 360 detik lalu (di luar toleransi): dapat '200 diproses', harus '401 ' | tertangkap |
| L2 | Tanda tangan dan lapis penahan, lewat lab | hanya rahasia pertama dicoba (masa tumpang tindih hilang) | lab gagal: rahasia lama diterima selama tumpang tindih: dapat '401 ', harus '200 diproses' | tertangkap |
| L3 | Tanda tangan dan lapis penahan, lewat lab | event ganda tidak dijawab ganda (kunci utama tidak menahan) | lab gagal: kunci utama menahan event yang sama: dapat ['200 diproses', '200 diproses'], harus ['200 diproses', '200 ganda'] | tertangkap |
| L4 | Tanda tangan dan lapis penahan, lewat lab | kabar yang mundur dari status akhir diproses | lab gagal: pending diparkir: dapat ['200 diproses'], harus ['200 diparkir'] | tertangkap |
| L5 | Tanda tangan dan lapis penahan, lewat lab | Idempotency-Key ke ledger tidak diklaim | lab gagal: jawaban event kedua: dapat ['ganda', 'ganda', 'diproses', 'diproses'], harus ['ganda', 'ganda', 'ganda', 'diproses'] | tertangkap |
| L6 | Tanda tangan dan lapis penahan, lewat lab | umur Idempotency-Key 48 jam, bukan 24 | lab gagal: jawaban event kedua: dapat ['ganda', 'ganda', 'ganda', 'ganda'], harus ['ganda', 'ganda', 'ganda', 'diproses'] | tertangkap |
| L7 | Tanda tangan gateway tiruan (`jadwal.go`), lewat lab | tanda tangan tanpa titik pemisah timestamp dan body (tes Go memakai fungsi yang sama; yang menangkap HMAC yang dihitung ulang di `run.py`) | lab gagal: tiap kiriman ditandatangani dengan timestamp-nya sendiri: dapat False, harus True | tertangkap |
| L8 | Koreksi insiden, lewat lab | penutupan insiden menulis status `terbuka` | lab gagal: satu insiden tetap terbuka: dapat 5, harus 1 | tertangkap |
