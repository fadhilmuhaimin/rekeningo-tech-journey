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
