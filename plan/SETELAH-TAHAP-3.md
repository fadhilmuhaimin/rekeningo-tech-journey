# Setelah Tahap 3

Polesan dari tinjauan Tahap 3 yang sengaja tidak dikerjakan (lingkup dibekukan).

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- Lab `t3-bayar` (skema lama) perlu versi ledger dengan 0,87 pembayaran per detik dan layanan push yang menggantung (R3-33).
- Halaman 3.27 bisa terlalu panjang (staging, pipeline, alert, on-call, backup): pecah menjadi dua bila lebih dari 10 menit baca.
- Halaman 3.19 (ADR 28): promo yang dijadwalkan mulai di jam tertentu tidak punya tulis saat mulai, jadi hapus-kunci-sesudah-tulis tidak menutupnya; TTL 60 detik membatasi, atau harga efektif dihitung saat baca; tulis di ADR.
- Lab api-t3: api-t2 memakai `database/sql` tanpa batas pool bawaan; tetapkan `SetMaxOpenConns(10)` (atau pgxpool) dan rekam; catatan bawaan pgxpool di naskah hanya berlaku bila lab pindah ke pgxpool.
- M20 (3.12): sebut panjang klaim; dua pengiriman berselang "enam detik" menuntut klaim paling lama sekitar 5 detik.
- Versi app Tahap 3 (3.0 notifikasi, 3.1 rilis M26) belum didefinisikan di naskah; tulis di halaman 3.3.
- `t3-pool` dan `t3-outbox` boleh berbagi `api-t3` lewat mode rentan (pola api-t1) bila itu menghemat lab.
- T3-siap: registry `trx` jadi 3 hanya di `tahap[2]` membuat "data transaksi per tahun" (dau × trx × 365 × 300 B = 821 MB) berbeda dari 1,37 GB di naskah 3b (dua posting × 250 B) dan dari `tahap[0]` dan `tahap[1]` yang tetap trx 2; putuskan samakan semuanya atau tulis dua besaran terpisah.
- `T4-siap` dan `T5-siap`: RINGKAS tinggal 2 baris kosong; lipat peta Tahap 3 (3.1 sampai 3.32) jadi sekitar enam baris per kelompok bagian sebelum menulis peta Tahap 4, dengan format lipat di baris pembuka RINGKAS.
- Tugas lab Tahap 3 boleh digabung bila mode rentan api-t3 cukup untuk `t3-pool` dan `t3-outbox`; gabung hanya bila rekamannya tetap terpisah per masalah.

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- `labs/README.md` hanya menyebut rentang port server lab (kini 18080 sampai 18182); tabel konflik port per lajur belum menyebut `api-t3`.
- Rate limit `/perangkat`, `/pesanan`, `/promo`, `/sinkron` belum ada (hanya login, ganti password, kiriman).
- Satu baris outbox dikirim ke semua perangkat aktif; kegagalan satu perangkat mengulang seluruh baris (perangkat lain menyaring `notifikasi_id`). Pecah per perangkat bila 1,3 perangkat per user berubah jadi lebih.
- `operasi_sinkron.kunci` adalah kunci utama global: kunci sama dari dua akun memberi 422 "kunci sudah dipakai", dan dua POST bersamaan dengan kunci sama untuk produk berbeda berakhir di unique violation (500). Usul kunci per `(perangkat_id, kunci)`.
- `SelesaiOutbox` dan `TundaOutbox` tidak memeriksa pemilik klaim (nilai `percobaan` saat klaim); worker yang klaimnya habis bisa melepas klaim worker lain. Dampaknya pengiriman ulang, bukan baris hilang.
- `POST /web/login` tidak memeriksa `Origin` (login CSRF: korban masuk ke akun penyerang); pelaku harus tahu password akunnya sendiri, dampak kecil.
- Handler (CSRF, cookie, 409 dengan `sekarang`) hanya dites lewat rekaman, tanpa tes Go; mutasi dijalankan lewat `make run BAGIAN=web`.
- `NASKAH_3B` di `run.py` adalah salinan tangan blok mermaid; bila naskah berubah, bandingkan lewat `tools/erd.py` atau baca blok itu langsung.
- api-t3 `GET /lab/outbox`: umur tertua per kelas, bukan semua kelas; alert uang harus per kelas (`queue.txt` E: semua kelas lebih dari 30 detik, kelas uang 0).
- api-t3: laju promo 5 per detik di `UmumkanPromo` atau flag worker; saat ini hanya penjadwalan SQL di lab `t3-outbox`.
- api-t3 worker: kirim ke perangkat penerima serentak, atau klaim sekurang-kurangnya jumlah perangkat x batas waktu push (`ganda.txt` D).
- `labs/README.md` daftar "lab yang punya port dasar sama": tambahkan `api-t3` dan `t3-outbox` (18180, 18181).
- `labs/t3-outbox` `kursor.txt` D: peluang tidak ada pasang terbalik dalam 10 pasang kecil tetapi bukan nol dan bergantung mesin; bila lab gagal di sana, ulangi dulu, lalu naikkan batas pasang (rate limit per akun menjawab 429 sesudah ±15 kiriman).
- Ukur peluang baris tertinggal di kursor (putaran poller jatuh di antara dua COMMIT) bila halaman 3.10 mau menulis persen; sekarang hanya mekanismenya yang terekam.
- Naskah menulis L = 1,75 untuk t = 2 detik. Itu cocok dengan λ = 0,868 (R3-31 tanpa pembulatan: 1,753); lab memakai λ = 0,87 persis dan merekam 1,757 (dibulatkan 1,76). Halaman 3.8 menulis satu λ dan menyebutnya.
- Circuit breaker (opsi ADR 22) Tidak dijalankan; usul tugas lab sendiri bila halaman 3.8 ingin menunjukkan breaker terbuka dan setengah terbuka.
- Trace OpenTelemetry di api-t3 (ADR untuk dependency, lalu lab `t3-otel`): `jejak.txt` hanya menunjukkan apa yang kurang tanpa trace.
- Layanan push tiruan mode `gantung` menerima permintaan dan tidak menjawab; penyedia sungguhan bisa menjawab lambat. Mode `lambat` dengan ms besar sudah ada untuk itu.
- Angka W (kurang dari 20 ms) berasal dari laptop yang menjalankan lab; ulangi di VPS sebelum halaman menyebutnya sebagai angka produksi.
- Beban 17,4 dan 20 (tiap request ke-20 pembayaran) ditulis di dua tempat: default `Beban` di `beban.py` dan `RPS`, `TIAP` di `umum.py`. Satu sumber (mutasi mengubah salah satunya gagal juga, tetapi baru di ujung bagian).
- `m18.txt` C: "jurnal 0" bukan bukti rollback, karena push tidak pernah kembali dan transaction memang tidak pernah COMMIT. Buktinya 380 pembacaan 200 dan puncak 5.
- Mutasi yang selamat dan tidak bisa dibunuh oleh rekaman: pelonggaran toleransi 15% dan menghapus W = 20 ms dari rumus L (0,87 × 0,02 = 0,017 koneksi, di bawah resolusi cuplikan 20 ms). Bukan cacat; dicatat supaya halaman 3.8 tidak menjual 20 ms sebagai hasil ukur.
- ERD Tahap 3 dua kolom di desktop: sisi kanan 1366 px zoom 0,80 (Tahap 2: 0,87) dan di HP 320 px zoom 0,86, karena delapan garis menuju `akun` bertemu di satu handle masuk dan menyisakan 14 lajur; usul: bundel garis ke `akun` atau handle masuk per kelompok tabel.
- `ukur-erd.mjs`: tambah CLS hydrate untuk Tahap 3 sebagai tahap awal saat halaman 3.5 punya `awal={3}`.
- `situs/src/erd/uji/tahap-2.json` (data uji lama) tinggal dipakai tes lama di `tumbuh.test.ts`; usul gabung ke tes lab bila kasus "kolom berganti nama" sudah tidak dibutuhkan.
- `erd.py --cek` tidak menangkap kolom, UNIQUE, CHECK, atau index yang dihapus tangan dari `tahap-1.json` dan `tahap-2.json` (format sah); Tahap 3 kini dijaga Vitest (994), Tahap 1 dan 2 belum; usul: penjaga yang sama untuk keduanya, atau job CI pembangun ulang dengan database (SETELAH-TAHAP-2).
- `varPesan` memesan tinggi wadah tanpa zoom: di layar 320 px Tahap 3 (zoom 0,86) wadah 2.815 px lawan pesanan 3.264 px, jadi halaman 3.5 dengan `awal={3}` bergeser sekitar 449 px sesudah hydrate bila diagram sedang di layar; usul: pesanan memakai zoom di lebar terkecil (`min(1, 288 / lebar tata)`) dan `ukur-erd.mjs` mengukur CLS di 320 px.
- HP 320 dan 375 px: nama kolom `nomor_karyawan` dan `membalik_jurnal_id` terpotong ("...") di node karena label kunci "FK UNIQUE CHECK" memakai separuh baris (ada sejak Tahap 2; Tahap 2 di 320 px juga `wajib_ganti_password`); detail di bawah diagram tetap lengkap; usul: label kunci di baris sendiri atau `title` berisi nama penuh.
- Baca `X-Forwarded-For` dari proxy tepercaya di `clientIP` api-t3 (komentarnya sudah menulis rencana itu; butuh dua sumber alamat di lab untuk merekamnya).
- Pindahkan penahan `/kiriman` ke Redis bila 3.17 membutuhkannya; sekarang hanya login yang berpindah.
- Rekam jendela tetap di batas dua jendela (paling banyak 2 kali batas lolos), pemeriksaan pertama Caddy (caddy#6410), dan POST yang terputus di jendela `Shutdown`.
- `GET /healthz` belum masuk `openapi.yaml`: ditambahkan bila kontrak perlu mendokumentasikan endpoint operasi (`make -C labs/api-t3 kontrak` butuh jaringan).
- Go-test tidak menjaga `JendelaLogin` (hanya rekaman `batas.txt` bagian E) dan `MaxRetries = -1` di `redisbatas.Baru` (uji mutasi bertahan); tambah tes bila 3.17 menyebut keduanya.
- 3.16 dan 3.17 menyebut akibat satu key per IP di belakang proxy: semua client berbagi 10 login per menit (per Redis, untuk seluruh proxy), jadi satu penyerang bisa menolak login semua orang; tulis di bagian "kapan salah" ADR 27.
- `go mod tidy` di `labs/api-t3` mengubah banyak baris `go.sum` yang sudah tidak rapi sebelum PR ini; rapikan di PR sendiri.
- Jalankan lab t3-instance di Linux Engine (instance mendengar di 127.0.0.1; belum dijalankan) atau tulis "hanya Docker Desktop" di halaman yang merujuknya.
- `plan/RISET-TAHAP-3.md` "Belum bisa dicek": hapus butir klaim dio#2418, teks MASVS-NETWORK-2, dan nomor ASVS logging; dijawab R3-74, R3-77, R3-78.
- `labs/t3-mitm/umum.py` `lihat_mitm`: ganti jeda 0,4 detik dengan hitungan koneksi tertutup di proxy supaya "nol request" tidak bergantung pada waktu.
- Pin di emulator Android (Network Security Config) bila emulator tersedia; sekarang hanya Dart CLI di macOS.
- Pesan galat handshake Dart ("application verification failure") tidak membedakan sebab (kedaluwarsa, nama salah, CA tidak dikenal); rekaman mencatatnya tetapi tidak memeriksanya, jadi mutasi yang hanya mengganti sebab tidak terbunuh.
- Lab refresh token (api-t3 hanya punya sesi berumur tetap) bila ADR 31 menjanjikan token 15 menit di app.
- `labs/t3-mitm/bagian_pin.py` C membaca log tepi tanpa jeda dan `bagian_token.py` B sesudah jeda 0,2 detik: tepi menulis baris log sesudah jawaban selesai dikirim, jadi bacaan yang terlalu cepat bisa melewatkan baris terakhir. Ganti dengan menunggu jumlah baris yang diharapkan.
- `go/internal/pagar` menerima nama `localhost` tanpa resolusi DNS; bila `/etc/hosts` mengarahkan `localhost` ke alamat lain, pagar tidak melihatnya.
- `hsts.txt` tidak menulis versi curl (8.7.1 di mesin peninjau, LibreSSL 3.3.6); R3-76 mengakui "versi tidak direkam". Catat versinya di README atau kepala rekaman supaya 3.25 bisa menyebutnya.
- 3.25: ADR 31 sebaiknya mengutip RFC 7469 lampiran B ("cadangan yang tidak diuji sama dengan tanpa cadangan"); `pin.txt` C adalah ujinya. Kebijakan kunci pin cadangan (disimpan di luar server, ditandatangani rantai lain) ada di lampiran yang sama.

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- Halaman 3.19 (ADR 28): hapus kunci sesudah COMMIT tidak menutup pembaca lambat yang mengisi cache sesudahnya (stale set, R3-65, `redis.txt` F); tulis di "kapan keputusan ini salah"; lease atau TTL pendek hanya membatasi.
- Halaman 3.19: promo yang mulai di jam tertentu (`redis.txt` G) tidak punya tulis saat mulai; dengan TTL 60 detik harga promo telat sampai 60 detik; cara menutup (TTL entri dipendekkan sampai waktu mulai promo berikutnya, atau harga efektif dihitung saat baca) tidak dijalankan.
- Halaman 3.18 dan 3.19: stok di katalog juga stale karena `Pesan` tidak menghapus kunci (`memori.txt` C); `Pesan` memeriksa stok di database.
- Halaman 3.19: jangan menulis "hit tidak menyentuh database". Dari kode (tidak diukur), tiap request yang login membaca `sesi` dan `GET /katalog` tanpa parameter `kota` membaca `akun`; cache hanya menggantikan query katalog.
- Lab `t3-cache`: client Redis tanpa circuit breaker, jadi saat Redis menggantung tiap bacaan membayar satu batas waktu (dari kode, tidak diukur). Usul lab tersendiri bila halaman ingin menunjukkan waktunya.
- Lab `t3-cache`: `SCAN` tidak atomik; entri yang diisi pembaca di tengah iterasi bisa terlewat (R3-67); perlombaan itu tidak direkam.
- Lab `t3-cache`: entri cache yang JSON-nya rusak (Unmarshal gagal) menjawab 500 sampai TTL; cache-aside yang benar memperlakukannya sebagai miss lalu menimpanya (dari kode, tidak diukur).
- Lab `t3-cache`: bagian yang memakai gerbang menggantung selamanya bila gerbang tidak dilepas, karena `dasar_t3.curl` tanpa `maks` bawaan; usul `maks` di panggilan yang menunggu gerbang (menyentuh `dasar_t3.py`, tugas tersendiri).
- Halaman 3.19: stale set (`redis.txt` F) juga mungkin di cache memori; rekaman hanya memuat Redis. Jangan menulis "paling lama 100 ms" untuk satu perintah Redis: dial, tulis, dan baca masing-masing sampai batas.
- Kunci `operasi_sinkron` global: akun lain mendapat 422 untuk kunci yang sudah ada (direkam `t3-offline/output/sinkron14.txt` C) dan dua POST bersamaan dengan kunci sama untuk produk berbeda berakhir unique violation 500 (dari kode, tidak dijalankan); usul kunci per `(perangkat_id, kunci)` dan rekam ulang `api-t3/output/sinkron.txt`.
- Klaim Idempotency-Key di `/kiriman` terjadi sebelum penahan laju: tiap key baru menulis satu baris sebelum 429 melepasnya; pindahkan klaim ke sesudah penahan bila diukur mengganggu.
- `kunci_idempotensi` tanpa job pembersih: baris kedaluwarsa menumpuk (7.500 per hari bila semua pembayaran memakai key, Asumsi R3-31); usul job yang memakai jam database dan retensi tertulis.
- Klaim key dan penyimpanan respons bukan satu transaction: paling banyak sekali hanya selama key berlaku (24 jam), server mati meninggalkan 409 sampai kedaluwarsa, dan 5xx dari `COMMIT` yang hasilnya tidak diketahui melepas key (ulangan bisa menggandakan; dibaca dari kode, tidak dijalankan). Rancangan `labs/e3-idempotency` (status selesai di transaction jurnal) menutup keduanya tetapi butuh mengubah `Bayar`, `Kirim`, dan `Pesan` di api-t3.
- Ulangan dalam 24 jam menjawab dengan respons lama (stok 0, versi 2, padahal stok sekarang 50; `m24.txt` C): app harus mengambil keadaan terbaru sesudah ulangan; bahan halaman 3.20 dan 3.21.
- Kolom `kunci_idempotensi.jurnal_id` tidak diisi jalur ini (middleware tidak tahu jurnal mana).
- Cache katalog t3-cache hanya dihapus oleh `PATCH /produk/{id}`; `POST /sinkron` (dan `PUT /produk/{id}/stok` mode rentan) mengubah stok tanpa menghapus entri, jadi katalog yang di-cache bisa menampilkan stok lama sampai TTL (dibaca dari kode `service/katalog_cache.go`, tidak dijalankan).
- `t3-pool` punya ukuran waktu yang goyah di bawah load mesin tinggi (hasil A/B di PR #349): longgarkan batas atau ulangi di dalam lab.
- CI memakai gitleaks-action v3 dengan gitleaks 8.24.3 (log run 40221041034), lokal 8.30.1: `[[allowlists]]` tingkat atas (kondisi AND commit, berkas, regex) baru jalan di versi lebih baru. Naikkan versi di CI (env `GITLEAKS_VERSION`) bila ingin allowlist per commit dan berkas; sampai itu `.gitleaks.toml` memakai `[allowlist]` tunggal.
- Rekaman lab tidak membedakan key 24 jam dari 48 jam (lompatan 15, 17, 62, dan 360 jam); tambah lompatan 30 jam bila halaman 3.21 ingin mengutip rekaman untuk angka 24, bukan hanya "17 jam dikenali, 62 jam tidak".
- Tidak ada tes yang memastikan `POST /lab/jam` tidak ada tanpa `-jam-lab` (diperiksa tinjauan dengan curl pada server tanpa flag, 404); `cmd/api` tidak punya tes.
- Hash isi permintaan membaca JSON ke `float64`: dua nominal bulat di atas 2^53 yang berbeda bisa berhash sama; nominal Rekeningo jauh di bawahnya, `UseNumber` bila ada id 64 bit di body.
- Widget pool: prop `kelompok` supaya halaman 3.6 (M18) hanya menampilkan ukuran pool dan client menyerah, dan 3.8 keempatnya; sekarang satu instance selalu menampilkan empat kelompok (tinggi ±1.800 px di 375 px sesudah menebak).
- Client yang tidak menutup koneksi saat menyerah (`Future.timeout` di Dart tidak membatalkan source future, api.dart.dev Dart 3.13.7) belum ada di widget karena tanpa rekaman: usul bagian G di lab `t3-pool` dengan client yang membiarkan koneksi terbuka, lalu pengaturan kelima di widget.
- Circuit breaker (opsi ADR 22) tidak ada di widget: Tidak dijalankan di lab.
- Beban pembacaan 16,5 × 0,02 = 0,33 koneksi (W 20 ms, Asumsi) tidak masuk L widget; pool 10 dengan push 10 detik (L 8,717 + 0,33) jadi makin dekat ke penuh. Rekaman `little.txt` hanya mengukur pembayaran.
- Pool 4 (R3-33, 4 ÷ 0,87 = 4,6 detik) dan t = 30 detik (L 26,117) belum direkam; tambah bagian lab bila halaman 3.8 ingin menulisnya sebagai Rekaman lab, bukan Hitungan.
- Chip sumber widget "Ilustrasi · acuan Rekaman lab t3-pool" berwarna warn: pembaca bisa mengira semua angka Ilustrasi; halaman 3.8 sebaiknya menjelaskan pembagiannya di kalimat pengantar widget.
- Kalimat penutup `labs/t3-pool/output/m18.txt` C ("Pool 10 baru penuh bila client menunggu lebih dari 10 ÷ 0,87 = 11,5 detik") dan baris R3-63 menyebut ambang yang kurang tepat: pool 10 penuh pada 10 ÷ λ = 11,5 detik bila W > (n − 1) ÷ λ = 10,34 detik (T = 10,4 sudah cukup; tes batas penuh di `logika.test.ts`). Halaman 3.6 dan 3.8 menulis batas yang benar; kalimat lab diperbaiki di tugas lab sendiri bersama rekamannya.
- Widget pool: teks "tidak pernah, karena L kurang dari n" benar untuk semua tombol yang ada, tetapi syarat sebenarnya L ≤ n − 1 (L di antara n − 1 dan n memberi "sempat penuh"); bila halaman menambah nilai tombol, ubah teks menjadi "L tidak melebihi n − 1".
- `ukur-pool.mjs`: toleransi garis L 0,04 dari tinggi grafik kasar untuk L kecil (0,017 dan 0,278 tak terbedakan dari 0); cukup untuk salah skala, belum untuk salah satu piksel.
- W3-outbox: acuan `cara` dengan `langsung` dan `push-menggantung` bisa dipindah dari Ilustrasi ke Rekaman lab dengan mem-parse `labs/t3-pool/output/m18.txt` (mode rentan `push-dalam-tx`); `jalankanCara` tidak memodelkan pool, hanya transaction yang tertahan.
- W3-outbox: label opsi di ringkasan satu kalimat memakai huruf kapital di tengah kalimat ("Dengan kelas, Semua sekaligus, 4 pengirim: ..."); bisa dijadikan huruf kecil bila halaman memakainya di prosa.
- W3-outbox: skenario `ganda` tidak memodelkan pengiriman ulang terjadwal sesudah `ditunda` (backoff berikutnya) untuk varian klaim panjang; ringkasan menyebut hanya pesan selama klaim berlaku.
- W3-outbox (tinjauan): hal yang tidak berlaku pada satu kejadian ditulis "ya" (mis. push menggantung di transaction: notifikasi tidak mendahului uang "ya"; proses API mati sebelum push pada cara sesudah COMMIT: "Pembayaran tidak menunggu push" "ya"), sedangkan naskah bagian 3 menulis "Tidak berlaku"; bisa jadi jenis ketiga "tidak berlaku" bila halaman 3.4 menampilkannya berdampingan dengan tabel naskah.
- W3-outbox (tinjauan): satu worker dengan satu HP yang menggantung (cara outbox, push menggantung) belum direkam; usul bagian kecil di lab t3-outbox supaya label naik dari Hitungan ke Rekaman lab.
- W3-outbox (tinjauan): `periksaAcuan` memakai angka tulis tangan 0,6 untuk dua putaran (queue E); aman karena build gagal bila rekaman berubah, tetapi sebaiknya diturunkan dari satu sumber.

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- Skenario Lax bawaan yang menunggu lebih dari dua menit (cookie dipasang, tunggu 120 detik lebih, serang lagi) untuk mengukur batas masa tenggang, bukan hanya efeknya (`labs/t3-dasbor`, README "Keterbatasan uji").
- Skenario client tanpa Sec-Fetch-Site dan Origin (client lama atau non-browser dengan cookie curian) untuk menunjukkan token sendirian di luar browser; sekarang hanya tes Go.
- `GET /logout` di dasbor lab mengubah keadaan (logout CSRF); tidak dicakup lab, boleh disebut di 3.23 sebagai contoh endpoint GET yang mengubah data.
- Tabel `sesi` di dasbor lab hanya di memori tanpa kedaluwarsa sisi server; cukup untuk lab, bukan pola untuk produksi.
- Widget cache: umur entri saat perubahan selalu 0 (kasus terburuk); usul pengaturan "umur entri" bila 3.19 butuh rata-rata atau ingin menunjukkan entri yang lebih tua habis lebih cepat.
- Widget cache: stampede, lease, dan XFetch tidak dimodelkan (lab tidak merekamnya); usul lab tersendiri bila 3.19 ingin menunjukkannya.
- Widget cache: cara menutup promo yang mulai nanti (TTL entri dipendekkan sampai waktu mulai promo berikutnya, atau harga efektif dihitung saat baca) belum bisa ditunjukkan; butuh rekaman lab (README t3-cache "Tidak dijalankan").
- Widget cache: jumlah baca database sebagai fungsi TTL tidak dihitung (rekaman beban satu TTL dan satu jendela 10 detik); usul rekaman beban untuk TTL 6 dan 300 bila halaman ingin membandingkan.
- Widget cache: "Redis mati" hanya memengaruhi perubahan yang menghapus kunci; waktu tunggu bacaan saat Redis menggantung (batas 100 ms lawan 5 detik, gagal.txt A) tidak dimodelkan.
- Widget cache: cache memori dengan urutan "sebelum COMMIT" atau pembaca lambat (instance A mengisi ulang entrinya sendiri) berlabel Ilustrasi; lab merekam urutan itu hanya di Redis.
- Halaman 3.19: pasang `<CacheInvalidation />` sekali di blok Coba; jangan menulis "hit tidak menyentuh database" (catatan tinjauan #347), dan tulis "kapan keputusan ini salah" dari pengaturan "pembaca lambat" dan "promo mulai nanti".
- Widget cache: panel "Ubah satu hal" setinggi sekitar 800 px, jadi tombol di kelompok pertama (Jenis cache) berjarak lebih dari 800 px dari kalimat penuh di 320, 375, dan 1366 px (kalimat penuh di luar layar sesudah klik; terukur di `/uji/cache/`). Usul: kalimat penuh di antara kelompok pengaturan, atau dua kolom di desktop, atau kalimat penuh lengket di layar sempit.
- Widget cache: pilihan benar 300 adalah satu-satunya pilihan berangka yang sama dengan TTL di pertanyaan, jadi terbaca tanpa memahami, dan urutan pilihan tetap. Usul: pengecoh "separuh TTL" dan urutan pilihan diputar deterministik per halaman.
- Widget cache: tombol "Urutan hapus kunci" tidak berpengaruh bila yang berubah promo mulai nanti atau pesanan, atau cache tanpa atau Redis mati, tetapi tetap aktif tanpa petunjuk. Usul: tandai "tidak berpengaruh untuk pengaturan ini".
- Widget cache: baris "Baca database untuk mengisi satu kunci yang sama" menulis 1 untuk "Redis bersama, mati saat harga berubah", padahal selama Redis mati tiap bacaan membaca database (gagal.txt B); catatan di bawahnya menyebut itu, barisnya belum.
- Widget cache: acuan memori-stok dan redis-mati berlabel dua instance, padahal rekamannya hanya membaca satu instance (B di memori.txt C, A di gagal.txt C); instance lain disimpulkan dari model.
- Widget cache: judul "Siapa masih melihat harga lama?" tanpa "yang".
- Widget cache: uji mutasi peninjau N5 sampai N12 dan N19 (pengamat, indeks benar, TTL tak terhingga, persen garis, id slider, aria-hidden garis, kontras angka kotak, animasi penanda, urutan pilihan) belum dijalankan; jalankan `python3 tmp/mutasi-358.py 11 12 13 14 15 16 17 18 19` bila tmp/ masih ada, atau salin daftar M dari badan ini.
- Paragraf kepala naskah ("Disesuaikan ...") berisi lima kalimat dan memicu peringatan audit bahasa; pecah menjadi daftar bila pemilik meninjau.
- Sel "Pool 10 penuh" di tabel angka beban naskah panjang; halaman 3.8 sebaiknya memecahnya menjadi dua baris (tanpa client menyerah, dengan client menyerah).
- RINGKAS masih menulis Tahap 2 sebagai "2.1 sampai 2.25 ditulis, 2.26 sampai 2.33 sedang ditulis"; lipat sekalian saat `T4-siap`.
- Widget W3-outbox sudah punya skenario kursor-atau-klaim dan pengiriman ganda yang cocok untuk 3.10 dan 3.12; naskah menulis `race` dan `alur`. Peta tidak diubah; pelaksana halaman boleh memilih.
- Naskah belum mendefinisikan versi app Tahap 3 (3.0 notifikasi, 3.1 rilis M26); tulis di 3.3 bila halaman membutuhkannya.
- Baris PRD P0 "Dua instance API" di naskah menyebut solusi, sedangkan tabel 2.33 menulis kebutuhan; halaman 3.1 sebaiknya menulis kebutuhan dulu, lalu solusinya, tanpa mengubah penjaga 2.33.
- Lab t3-pool: kalimat penutup `m18.txt` C dan README ("Pool 10 baru penuh bila client menunggu lebih dari 10 ÷ 0,87 = 11,5 detik") menyebut ambang yang kurang tepat; naskah memakai (n − 1) ÷ λ = 10,34 detik untuk client yang menyerah dan 11,5 hanya untuk client yang tidak menyerah. Halaman 3.6 dan 3.8 mengikuti naskah; perbaiki kalimat lab di tugas lab sendiri bersama rekamannya.
- "Client" di M18 dan tabel pool berarti app di HP yang menunggu (lab `m18.txt` C), bukan `http.Client` ke layanan push; halaman 3.6 dan 3.8 menulis "client app" dan "client push" terpisah.
- Pool "penuh" berarti 10 koneksi terpakai (T lebih dari ±10,4 detik); pembayaran baru tertahan hanya bila T lebih dari n ÷ λ (±11,5), di antaranya hanya pembacaan yang tertunda sebentar (simulasi peninjau, bukan rekaman). Tulis pembedaan itu bila 3.8 menampilkan nilai T di antaranya.
- ADR 21 punya pemicu queue (L kelas bayar dan transfer mencapai 5 koneksi, W luar ±5,7 detik) yang terpenuhi oleh M18 (push menggantung); ADR 23 menjawabnya. Naskah menghubungkan ADR 21 hanya di M21, ADR 24, 27, 28; tulis satu kalimat di 3.9.
- `m18.txt` C "jurnal 0" bukan bukti rollback (push tidak pernah kembali, transaction memang tidak COMMIT); buktinya 380 pembacaan 200 dan puncak 5 koneksi (catatan #343). Halaman 3.6 jangan memakai "jurnal 0" sebagai bukti.
- Ulangan dalam 24 jam menjawab respons lama (stok 0, versi 2, padahal stok sekarang 50; `m24.txt` C): app harus mengambil keadaan terbaru sesudah ulangan; bahan 3.20 dan 3.21.
- Naskah M18 memakai satu kata "client" untuk dua hal dan "Naskah tidak menyebut timeout app" menunjuk bagian lain naskah; rapikan saat pemilik meninjau.
