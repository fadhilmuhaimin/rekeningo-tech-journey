<!-- Dibuat oleh tools/build_istilah.py dari situs/src/content/docs/alat/glosarium.mdx. Jangan diedit langsung. -->
*[API]: Sekumpulan endpoint yang disediakan server supaya program lain, mis. app Flutter, bisa membaca dan mengubah data.
*[Application Programming Interface]: Sekumpulan endpoint yang disediakan server supaya program lain, mis. app Flutter, bisa membaca dan mengubah data.
*[Endpoint]: Pasangan method dan path yang dilayani server, mis. POST /transfers.
*[endpoint]: Pasangan method dan path yang dilayani server, mis. POST /transfers.
*[HTTP method]: Kata kerja request (GET, POST, PUT, PATCH, DELETE) yang menyatakan maksud request terhadap resource.
*[GET]: Kata kerja request (GET, POST, PUT, PATCH, DELETE) yang menyatakan maksud request terhadap resource.
*[POST]: Kata kerja request (GET, POST, PUT, PATCH, DELETE) yang menyatakan maksud request terhadap resource.
*[PUT]: Kata kerja request (GET, POST, PUT, PATCH, DELETE) yang menyatakan maksud request terhadap resource.
*[PATCH]: Kata kerja request (GET, POST, PUT, PATCH, DELETE) yang menyatakan maksud request terhadap resource.
*[Status code]: Angka tiga digit di response yang menyatakan hasil request, mis. 201 berhasil dibuat atau 401 belum login.
*[status code]: Angka tiga digit di response yang menyatakan hasil request, mis. 201 berhasil dibuat atau 401 belum login.
*[Header]: Pasangan nama-nilai di request atau response yang membawa informasi tambahan, mis. token atau tipe konten.
*[header]: Pasangan nama-nilai di request atau response yang membawa informasi tambahan, mis. token atau tipe konten.
*[Payload]: Isi data yang dikirim di body request atau response, biasanya JSON.
*[payload]: Isi data yang dikirim di body request atau response, biasanya JSON.
*[Handler]: Fungsi di server yang menerima satu request, memeriksa formatnya, lalu memanggil logika bisnis.
*[handler]: Fungsi di server yang menerima satu request, memeriksa formatnya, lalu memanggil logika bisnis.
*[Database]: Program yang menyimpan data secara permanen dan menjamin aturan seperti constraint dan transaction.
*[database]: Program yang menyimpan data secara permanen dan menjamin aturan seperti constraint dan transaction.
*[Transaction]: Sekelompok perintah database yang berhasil semua atau batal semua.
*[transaction]: Sekelompok perintah database yang berhasil semua atau batal semua.
*[Constraint]: Aturan yang dipaksakan database pada data, mis. UNIQUE, CHECK, atau NOT NULL.
*[constraint]: Aturan yang dipaksakan database pada data, mis. UNIQUE, CHECK, atau NOT NULL.
*[Migration]: File berurutan yang mengubah skema database, disimpan dan direview seperti kode.
*[migration]: File berurutan yang mengubah skema database, disimpan dan direview seperti kode.
*[Authentication]: Proses memastikan siapa yang mengirim request, mis. lewat token login.
*[authentication]: Proses memastikan siapa yang mengirim request, mis. lewat token login.
*[Auth]: Proses memastikan siapa yang mengirim request, mis. lewat token login.
*[auth]: Proses memastikan siapa yang mengirim request, mis. lewat token login.
*[Authorization]: Proses memastikan user yang sudah dikenal boleh melakukan aksi itu pada data itu.
*[authorization]: Proses memastikan user yang sudah dikenal boleh melakukan aksi itu pada data itu.
*[Idempotent]: Sifat operasi yang hasil akhirnya sama walau dijalankan sekali atau berkali-kali.
*[idempotent]: Sifat operasi yang hasil akhirnya sama walau dijalankan sekali atau berkali-kali.
*[Trade-off]: Pilihan yang memberi satu kelebihan dengan membayar satu kekurangan.
*[trade-off]: Pilihan yang memberi satu kelebihan dengan membayar satu kekurangan.
*[ACID]: Empat jaminan transaction di database relasional: atomicity, consistency, isolation, durability.
*[ADR]: Catatan pendek tentang satu keputusan desain: konteks, pilihan, alasan, dan akibatnya.
*[Architecture Decision Record]: Catatan pendek tentang satu keputusan desain: konteks, pilihan, alasan, dan akibatnya.
*[API gateway]: Server di depan beberapa instance atau service yang mengurus hal bersama sebelum request diteruskan, mis. rate limit, authentication, dan routing.
*[At-least-once]: Jaminan pengiriman: setiap pesan sampai minimal sekali, jadi bisa sampai dua kali dan penerimanya harus tahan pesan ganda.
*[at-least-once]: Jaminan pengiriman: setiap pesan sampai minimal sekali, jadi bisa sampai dua kali dan penerimanya harus tahan pesan ganda.
*[Atomicity]: Jaminan bahwa semua perubahan dalam satu transaction terjadi seluruhnya atau tidak sama sekali.
*[atomicity]: Jaminan bahwa semua perubahan dalam satu transaction terjadi seluruhnya atau tidak sama sekali.
*[BaaS]: Layanan yang menyediakan database, auth, dan API siap pakai, mis. Supabase dan Firebase.
*[Backfill]: Script sekali jalan yang mengisi kolom baru untuk baris lama, biasanya bertahap per batch.
*[backfill]: Script sekali jalan yang mengisi kolom baru untuk baris lama, biasanya bertahap per batch.
*[Backoff]: Jeda yang makin panjang di antara percobaan ulang, supaya server yang sedang kesulitan tidak dibanjiri.
*[backoff]: Jeda yang makin panjang di antara percobaan ulang, supaya server yang sedang kesulitan tidak dibanjiri.
*[BFF]: Endpoint atau service yang dibentuk khusus untuk satu jenis client, mis. satu endpoint beranda untuk app mobile.
*[Backend for Frontend]: Endpoint atau service yang dibentuk khusus untuk satu jenis client, mis. satu endpoint beranda untuk app mobile.
*[Buku ledger]: Satu tempat uang dicatat di ledger: milik satu karyawan, satu warung, atau sistem seperti tunjangan; saldonya adalah jumlah posting-nya.
*[buku ledger]: Satu tempat uang dicatat di ledger: milik satu karyawan, satu warung, atau sistem seperti tunjangan; saldonya adalah jumlah posting-nya.
*[Cache]: Salinan data di tempat yang lebih cepat dibaca, dengan risiko isinya tertinggal dari data asli.
*[cache]: Salinan data di tempat yang lebih cepat dibaca, dengan risiko isinya tertinggal dari data asli.
*[CI]: Pemeriksaan otomatis (build, test, lint) yang berjalan di server setiap kali kode dikirim, sebelum perubahan boleh digabung.
*[Continuous Integration]: Pemeriksaan otomatis (build, test, lint) yang berjalan di server setiap kali kode dikirim, sebelum perubahan boleh digabung.
*[Circuit breaker]: Mekanisme yang berhenti memanggil layanan yang sedang gagal untuk sementara, lalu mencoba lagi setelah jeda.
*[circuit breaker]: Mekanisme yang berhenti memanggil layanan yang sedang gagal untuk sementara, lalu mencoba lagi setelah jeda.
*[COMMIT]: Perintah yang membuat semua perubahan dalam transaction menjadi permanen dan terlihat oleh koneksi lain.
*[Connection pool]: Sekumpulan koneksi database yang dibuka sekali lalu dipinjamkan bergantian ke request.
*[connection pool]: Sekumpulan koneksi database yang dibuka sekali lalu dipinjamkan bergantian ke request.
*[Container]: Paket aplikasi beserta semua dependensinya yang berjalan dengan cara sama di laptop maupun server.
*[container]: Paket aplikasi beserta semua dependensinya yang berjalan dengan cara sama di laptop maupun server.
*[Cursor pagination]: Pagination yang meminta "data sesudah item X", bukan "halaman ke-N", jadi tetap stabil saat data bertambah.
*[cursor pagination]: Pagination yang meminta "data sesudah item X", bukan "halaman ke-N", jadi tetap stabil saat data bertambah.
*[Dead-letter queue]: Tempat job yang terus gagal setelah batas retry, supaya bisa diperiksa manusia dan tidak diulang selamanya.
*[dead-letter queue]: Tempat job yang terus gagal setelah batas retry, supaya bisa diperiksa manusia dan tidak diulang selamanya.
*[Deadlock]: Dua transaction saling menunggu lock milik yang lain, sehingga database harus membatalkan salah satunya.
*[deadlock]: Dua transaction saling menunggu lock milik yang lain, sehingga database harus membatalkan salah satunya.
*[Debit]: Sisi kiri sebuah jurnal akuntansi; di setiap jurnal total debit sama dengan total kredit, dan akun aset bertambah di sisi debit.
*[debit]: Sisi kiri sebuah jurnal akuntansi; di setiap jurnal total debit sama dengan total kredit, dan akun aset bertambah di sisi debit.
*[Double-entry]: Cara mencatat uang di dua sisi atau lebih: setiap rupiah yang keluar dari satu buku masuk ke buku lain, jadi jumlah catatan satu kejadian selalu nol.
*[double-entry]: Cara mencatat uang di dua sisi atau lebih: setiap rupiah yang keluar dari satu buku masuk ke buku lain, jadi jumlah catatan satu kejadian selalu nol.
*[Enumerasi]: Mencoba nilai satu per satu, mis. ID akun 401 sampai 503 atau daftar email, untuk mengetahui data mana yang ada.
*[enumerasi]: Mencoba nilai satu per satu, mis. ID akun 401 sampai 503 atau daftar email, untuk mengetahui data mana yang ada.
*[ERD]: Gambar skema database: tabel dengan kolom pentingnya, dan garis untuk setiap foreign key di antara tabel.
*[ERP]: Perangkat lunak yang mengurus keuangan, pembelian, dan gaji satu perusahaan; di cerita, Nadia datang dari tim ERP Grup Lestari.
*[Enterprise Resource Planning]: Perangkat lunak yang mengurus keuangan, pembelian, dan gaji satu perusahaan; di cerita, Nadia datang dari tim ERP Grup Lestari.
*[Event sourcing]: Menyimpan setiap perubahan data sebagai event yang tidak diubah; keadaan sekarang dibangun ulang dari urutan event itu.
*[event sourcing]: Menyimpan setiap perubahan data sebagai event yang tidak diubah; keadaan sekarang dibangun ulang dari urutan event itu.
*[Eventual consistency]: Data di beberapa tempat boleh berbeda sesaat, tapi akan sama setelah perubahan selesai menyebar.
*[eventual consistency]: Data di beberapa tempat boleh berbeda sesaat, tapi akan sama setelah perubahan selesai menyebar.
*[Expand-migrate-contract]: Urutan mengubah skema tanpa downtime: tambah yang baru, pindahkan data dan kode, baru hapus yang lama.
*[expand-migrate-contract]: Urutan mengubah skema tanpa downtime: tambah yang baru, pindahkan data dan kode, baru hapus yang lama.
*[Fan-out]: Menyebarkan satu kejadian ke banyak penerima, mis. satu promo ditulis ke feed setiap pengikut.
*[fan-out]: Menyebarkan satu kejadian ke banyak penerima, mis. satu promo ditulis ke feed setiap pengikut.
*[FCM]: Layanan push notification milik Firebase. Server mengirim pesan ke token perangkat atau ke topic, lalu sistem operasi HP menampilkannya.
*[Firebase Cloud Messaging]: Layanan push notification milik Firebase. Server mengirim pesan ke token perangkat atau ke topic, lalu sistem operasi HP menampilkannya.
*[Foreign key]: Kolom yang menunjuk primary key tabel lain, dan database menjamin rujukannya ada.
*[foreign key]: Kolom yang menunjuk primary key tabel lain, dan database menjamin rujukannya ada.
*[Idempotency key]: Nilai unik yang dibuat app untuk satu aksi, mis. satu kali tekan Bayar, dan dikirim ulang di setiap retry, supaya server mengenali kiriman ulang dan tidak menjalankannya dua kali.
*[idempotency key]: Nilai unik yang dibuat app untuk satu aksi, mis. satu kali tekan Bayar, dan dikirim ulang di setiap retry, supaya server mengenali kiriman ulang dan tidak menjalankannya dua kali.
*[IDOR]: Celah saat server memakai ID dari request tanpa bertanya apakah peminta boleh menyentuh data itu. OWASP API Security menyebutnya BOLA.
*[Insecure Direct Object Reference]: Celah saat server memakai ID dari request tanpa bertanya apakah peminta boleh menyentuh data itu. OWASP API Security menyebutnya BOLA.
*[Invarian]: Aturan yang harus selalu benar apa pun yang terjadi, mis. transfer tidak mengubah total saldo semua akun.
*[invarian]: Aturan yang harus selalu benar apa pun yang terjadi, mis. transfer tidak mengubah total saldo semua akun.
*[Isolation level]: Seberapa banyak perubahan dari transaction lain yang boleh terlihat oleh satu transaction yang sedang berjalan.
*[isolation level]: Seberapa banyak perubahan dari transaction lain yang boleh terlihat oleh satu transaction yang sedang berjalan.
*[Job terjadwal]: Program di server yang dijalankan jadwal, bukan request user, mis. pencairan warung setiap Jumat 15.00.
*[job terjadwal]: Program di server yang dijalankan jadwal, bukan request user, mis. pencairan warung setiap Jumat 15.00.
*[Jurnal]: Catatan satu kejadian yang memindahkan uang, berisi dua posting atau lebih (satu baris uang per buku) yang jumlahnya selalu nol.
*[jurnal]: Catatan satu kejadian yang memindahkan uang, berisi dua posting atau lebih (satu baris uang per buku) yang jumlahnya selalu nol.
*[JWT]: Token berisi data JSON plus signature, sehingga server bisa memeriksa keasliannya tanpa query ke database.
*[JSON Web Token]: Token berisi data JSON plus signature, sehingga server bisa memeriksa keasliannya tanpa query ke database.
*[Kredit]: Sisi kanan sebuah jurnal akuntansi; di setiap jurnal total kredit sama dengan total debit, dan akun kewajiban bertambah di sisi kredit.
*[kredit]: Sisi kanan sebuah jurnal akuntansi; di setiap jurnal total kredit sama dengan total debit, dan akun kewajiban bertambah di sisi kredit.
*[Latency]: Lama waktu satu request dari dikirim sampai response diterima.
*[latency]: Lama waktu satu request dari dikirim sampai response diterima.
*[Lease]: Batas waktu satu pekerjaan di queue dipegang satu worker. Kalau worker mati sebelum selesai, pekerjaan diberikan ke worker lain setelah lease habis.
*[lease]: Batas waktu satu pekerjaan di queue dipegang satu worker. Kalau worker mati sebelum selesai, pekerjaan diberikan ke worker lain setelah lease habis.
*[Ledger]: Cara mencatat uang dengan menyimpan setiap perpindahan sebagai baris yang tidak diubah; saldo adalah jumlah baris itu, bukan angka yang ditimpa.
*[ledger]: Cara mencatat uang dengan menyimpan setiap perpindahan sebagai baris yang tidak diubah; saldo adalah jumlah baris itu, bukan angka yang ditimpa.
*[Load balancer]: Komponen yang membagi request ke beberapa instance server yang sama.
*[load balancer]: Komponen yang membagi request ke beberapa instance server yang sama.
*[Lock]: Tanda di database bahwa satu transaction sedang memakai baris atau tabel, sehingga transaction lain harus menunggu.
*[lock]: Tanda di database bahwa satu transaction sedang memakai baris atau tabel, sehingga transaction lain harus menunggu.
*[Log]: Catatan kejadian per request atau per peristiwa, ditulis aplikasi untuk dibaca saat menyelidiki masalah.
*[log]: Catatan kejadian per request atau per peristiwa, ditulis aplikasi untuk dibaca saat menyelidiki masalah.
*[Lost update]: Perubahan yang hilang karena dua transaction membaca nilai lama yang sama lalu saling menimpa.
*[lost update]: Perubahan yang hilang karena dua transaction membaca nilai lama yang sama lalu saling menimpa.
*[LSN]: Posisi di WAL. Membandingkan LSN primary dan replica menunjukkan apakah replica sudah menerapkan perubahan tertentu.
*[Log Sequence Number]: Posisi di WAL. Membandingkan LSN primary dan replica menunjukkan apakah replica sudah menerapkan perubahan tertentu.
*[Metric]: Angka yang dihitung terus-menerus, mis. jumlah request per detik atau persentase error.
*[metric]: Angka yang dihitung terus-menerus, mis. jumlah request per detik atau persentase error.
*[Microservice]: Gaya arsitektur yang memecah backend jadi beberapa service kecil yang di-deploy terpisah dan saling memanggil lewat jaringan.
*[microservice]: Gaya arsitektur yang memecah backend jadi beberapa service kecil yang di-deploy terpisah dan saling memanggil lewat jaringan.
*[Middleware]: Fungsi yang dijalankan sebelum atau sesudah semua handler, mis. pemeriksa token atau pencatat log.
*[middleware]: Fungsi yang dijalankan sebelum atau sesudah semua handler, mis. pemeriksa token atau pencatat log.
*[Modular monolith]: Satu aplikasi yang di-deploy sebagai satu unit, tapi kodenya dibagi ke modul dengan batas yang tegas.
*[modular monolith]: Satu aplikasi yang di-deploy sebagai satu unit, tapi kodenya dibagi ke modul dengan batas yang tegas.
*[Monolith]: Satu aplikasi backend yang memuat semua fitur dan di-deploy sebagai satu unit.
*[monolith]: Satu aplikasi backend yang memuat semua fitur dan di-deploy sebagai satu unit.
*[MVCC]: Cara database menyimpan beberapa versi baris, supaya pembaca tidak perlu menunggu penulis.
*[N+1 query]: Pola satu query untuk daftar lalu satu query lagi untuk setiap item di daftar itu.
*[n+1 query]: Pola satu query untuk daftar lalu satu query lagi untuk setiap item di daftar itu.
*[N+1]: Pola satu query untuk daftar lalu satu query lagi untuk setiap item di daftar itu.
*[Nonrepeatable read]: Anomali: baris yang sama dibaca dua kali dalam satu transaction dan nilainya berbeda, karena transaction lain sudah commit perubahan.
*[nonrepeatable read]: Anomali: baris yang sama dibaca dua kali dalam satu transaction dan nilainya berbeda, karena transaction lain sudah commit perubahan.
*[OAuth 2.0]: Standar untuk memberi aplikasi akses terbatas ke akun user di layanan lain tanpa memberikan password.
*[Object storage]: Layanan penyimpanan file besar per objek, diakses lewat HTTP, mis. layanan kompatibel S3.
*[object storage]: Layanan penyimpanan file besar per objek, diakses lewat HTTP, mis. layanan kompatibel S3.
*[Offline-first]: Desain app yang menyimpan perubahan di HP dulu, lalu menyinkronkannya ke server saat sinyal ada.
*[offline-first]: Desain app yang menyimpan perubahan di HP dulu, lalu menyinkronkannya ke server saat sinyal ada.
*[OIDC]: Lapisan di atas OAuth 2.0 untuk login, yang memberi tahu aplikasi siapa user-nya.
*[OpenID Connect]: Lapisan di atas OAuth 2.0 untuk login, yang memberi tahu aplikasi siapa user-nya.
*[OpenAPI]: Format standar untuk menulis kontrak API (endpoint, request, response) yang bisa dibaca manusia dan mesin.
*[Optimistic lock]: Cara mencegah lost update dengan mengecek nomor versi saat menulis, tanpa mengunci baris saat membaca.
*[optimistic lock]: Cara mencegah lost update dengan mengecek nomor versi saat menulis, tanpa mengunci baris saat membaca.
*[ORM]: Library yang memetakan tabel database ke objek di kode, sehingga query ditulis sebagai pemanggilan method, mis. Eloquent di Laravel atau ORM bawaan Django.
*[Outbox]: Tabel tempat event ditulis dalam transaction yang sama dengan perubahan data, lalu dikirim oleh worker.
*[outbox]: Tabel tempat event ditulis dalam transaction yang sama dengan perubahan data, lalu dikirim oleh worker.
*[p95]: Persentil latency: 95% request selesai lebih cepat dari angka p95, dan separuh request lebih cepat dari p50 (median).
*[p50]: Persentil latency: 95% request selesai lebih cepat dari angka p95, dan separuh request lebih cepat dari p50 (median).
*[Pagination]: Membagi daftar panjang menjadi potongan kecil yang diminta satu per satu.
*[pagination]: Membagi daftar panjang menjadi potongan kecil yang diminta satu per satu.
*[Partitioning]: Membagi satu tabel besar jadi beberapa partisi di database yang sama, mis. per bulan, supaya query dan arsip hanya menyentuh sebagian data.
*[partitioning]: Membagi satu tabel besar jadi beberapa partisi di database yang sama, mis. per bulan, supaya query dan arsip hanya menyentuh sebagian data.
*[partisi]: Membagi satu tabel besar jadi beberapa partisi di database yang sama, mis. per bulan, supaya query dan arsip hanya menyentuh sebagian data.
*[Partisi]: Membagi satu tabel besar jadi beberapa partisi di database yang sama, mis. per bulan, supaya query dan arsip hanya menyentuh sebagian data.
*[Phantom read]: Anomali: query yang sama dalam satu transaction mengembalikan kumpulan baris berbeda, karena transaction lain menambah atau menghapus baris.
*[phantom read]: Anomali: query yang sama dalam satu transaction mengembalikan kumpulan baris berbeda, karena transaction lain menambah atau menghapus baris.
*[PKCE]: Tambahan pada alur OAuth untuk app mobile yang mencegah authorization code dipakai oleh aplikasi lain.
*[Polling]: App menanyakan status ke server berulang kali dengan jeda tetap.
*[polling]: App menanyakan status ke server berulang kali dengan jeda tetap.
*[Posting]: Satu baris uang di dalam jurnal untuk satu buku: negatif bila uang keluar, positif bila masuk; saldo buku adalah jumlah posting-nya.
*[posting]: Satu baris uang di dalam jurnal untuk satu buku: negatif bila uang keluar, positif bila masuk; saldo buku adalah jumlah posting-nya.
*[Primary]: Database utama yang menerima semua perintah tulis; replica menyalin perubahan dari primary.
*[primary]: Database utama yang menerima semua perintah tulis; replica menyalin perubahan dari primary.
*[Primary key]: Kolom yang nilainya unik dan dipakai untuk mengenali satu baris.
*[primary key]: Kolom yang nilainya unik dan dipakai untuk mengenali satu baris.
*[Problem Details]: Format error JSON standar dari RFC 9457, dengan field seperti type, title, status, dan detail.
*[Proxy]: Program perantara yang meneruskan request antara client dan server. Proxy milik backend menambahkan hal yang tidak boleh dipegang client, mis. credential; proxy di laptop penguji dipakai untuk melihat dan mengubah request.
*[proxy]: Program perantara yang meneruskan request antara client dan server. Proxy milik backend menambahkan hal yang tidak boleh dipegang client, mis. credential; proxy di laptop penguji dipakai untuk melihat dan mengubah request.
*[Query plan]: Rencana langkah yang dipilih database untuk menjalankan satu query, dilihat dengan EXPLAIN.
*[query plan]: Rencana langkah yang dipilih database untuk menjalankan satu query, dilihat dengan EXPLAIN.
*[Queue]: Daftar pekerjaan yang menunggu diproses oleh worker, satu per satu atau paralel.
*[queue]: Daftar pekerjaan yang menunggu diproses oleh worker, satu per satu atau paralel.
*[Race condition]: Hasil yang bergantung pada urutan dua proses yang berjalan bersamaan.
*[race condition]: Hasil yang bergantung pada urutan dua proses yang berjalan bersamaan.
*[Rate limit]: Batas jumlah request per waktu dari satu sumber, mis. lima percobaan login per menit.
*[rate limit]: Batas jumlah request per waktu dari satu sumber, mis. lima percobaan login per menit.
*[RBAC]: Authorization berdasarkan peran, mis. hanya peran admin yang boleh membekukan akun.
*[Read replica]: Salinan database yang hanya melayani baca dan selalu sedikit tertinggal dari database utama.
*[read replica]: Salinan database yang hanya melayani baca dan selalu sedikit tertinggal dari database utama.
*[Read-your-writes]: Jaminan bahwa user langsung melihat perubahan yang baru ditulisnya, walau bacaan biasa dilayani replica yang tertinggal.
*[read-your-writes]: Jaminan bahwa user langsung melihat perubahan yang baru ditulisnya, walau bacaan biasa dilayani replica yang tertinggal.
*[Replication lag]: Jeda antara perubahan di database utama dan munculnya perubahan itu di replica.
*[replication lag]: Jeda antara perubahan di database utama dan munculnya perubahan itu di replica.
*[Retry]: Mengirim ulang request yang gagal atau tidak dijawab.
*[retry]: Mengirim ulang request yang gagal atau tidak dijawab.
*[Reverse proxy]: Server di depan aplikasi yang menerima request dari internet lalu meneruskannya, sambil mengurus hal bersama seperti TLS dan kompresi.
*[reverse proxy]: Server di depan aplikasi yang menerima request dari internet lalu meneruskannya, sambil mengurus hal bersama seperti TLS dan kompresi.
*[RLS]: Fitur PostgreSQL yang menyaring baris berdasarkan aturan per user, dijalankan di dalam database.
*[Row Level Security]: Fitur PostgreSQL yang menyaring baris berdasarkan aturan per user, dijalankan di dalam database.
*[ROLLBACK]: Perintah yang membatalkan semua perubahan sejak BEGIN.
*[Rolling deploy]: Mengganti instance satu per satu, supaya selalu ada instance yang melayani request.
*[rolling deploy]: Mengganti instance satu per satu, supaya selalu ada instance yang melayani request.
*[Round trip]: Satu kali bolak-balik request dan response antara app dan server. Di jaringan seluler, setiap round trip menambah latency.
*[round trip]: Satu kali bolak-balik request dan response antara app dan server. Di jaringan seluler, setiap round trip menambah latency.
*[Router]: Bagian framework yang mencocokkan method dan path request dengan handler yang tepat.
*[router]: Bagian framework yang mencocokkan method dan path request dengan handler yang tepat.
*[Saga]: Pola untuk proses yang melewati beberapa service: setiap langkah punya transaction sendiri, dan kegagalan dibatalkan dengan langkah kompensasi.
*[saga]: Pola untuk proses yang melewati beberapa service: setiap langkah punya transaction sendiri, dan kegagalan dibatalkan dengan langkah kompensasi.
*[Saldo cache]: Salinan jumlah posting satu buku di kolom buku.saldo_cache, dibaca app supaya cepat dan dicek tiap malam terhadap jumlah posting.
*[saldo cache]: Salinan jumlah posting satu buku di kolom buku.saldo_cache, dibaca app supaya cepat dan dicek tiap malam terhadap jumlah posting.
*[Secure storage]: Penyimpanan terenkripsi milik sistem operasi HP untuk rahasia kecil seperti token sesi: Keychain di iOS, kunci di Android Keystore.
*[secure storage]: Penyimpanan terenkripsi milik sistem operasi HP untuk rahasia kecil seperti token sesi: Keychain di iOS, kunci di Android Keystore.
*[Semaphore]: Penghitung yang membatasi berapa pekerjaan boleh berjalan bersamaan; pekerjaan berikutnya menunggu sampai ada yang selesai.
*[semaphore]: Penghitung yang membatasi berapa pekerjaan boleh berjalan bersamaan; pekerjaan berikutnya menunggu sampai ada yang selesai.
*[Serialization anomaly]: Anomali: hasil beberapa transaction yang berjalan bersamaan tidak sama dengan hasil menjalankannya satu per satu dalam urutan mana pun.
*[serialization anomaly]: Anomali: hasil beberapa transaction yang berjalan bersamaan tidak sama dengan hasil menjalankannya satu per satu dalam urutan mana pun.
*[Sharding]: Membagi data ke beberapa database berdasarkan shard key, mis. per wilayah.
*[sharding]: Membagi data ke beberapa database berdasarkan shard key, mis. per wilayah.
*[Signature]: Nilai hasil perhitungan kriptografi atas data dan secret, untuk membuktikan data tidak diubah.
*[signature]: Nilai hasil perhitungan kriptografi atas data dan secret, untuk membuktikan data tidak diubah.
*[Signed URL]: URL berbatas waktu yang memberi akses langsung ke satu file di object storage.
*[Snapshot]: Gambaran data pada satu saat, misalnya isi database yang dilihat satu query atau transaction, dan saldo akhir periode yang disimpan supaya tidak dijumlah ulang.
*[snapshot]: Gambaran data pada satu saat, misalnya isi database yang dilihat satu query atau transaction, dan saldo akhir periode yang disimpan supaya tidak dijumlah ulang.
*[Source of truth]: Satu tempat yang isinya dianggap benar ketika salinan lain berbeda, mis. database backend untuk saldo; cache dan data di HP hanya salinan.
*[source of truth]: Satu tempat yang isinya dianggap benar ketika salinan lain berbeda, mis. database backend untuk saldo; cache dan data di HP hanya salinan.
*[SSE]: Koneksi HTTP yang dibiarkan terbuka sehingga server bisa mengirim pesan satu arah ke client.
*[Stale]: Data yang sudah tidak terbaru, mis. harga lama yang masih tersimpan di cache.
*[stale]: Data yang sudah tidak terbaru, mis. harga lama yang masih tersimpan di cache.
*[Stateless]: Server tidak menyimpan keadaan antar-request di memorinya, jadi request mana pun bisa dilayani instance mana pun.
*[stateless]: Server tidak menyimpan keadaan antar-request di memorinya, jadi request mana pun bisa dilayani instance mana pun.
*[Throughput]: Jumlah pekerjaan yang selesai per satuan waktu, mis. request per detik.
*[throughput]: Jumlah pekerjaan yang selesai per satuan waktu, mis. request per detik.
*[Timeout]: Batas waktu menunggu sebelum sebuah panggilan dianggap gagal.
*[timeout]: Batas waktu menunggu sebelum sebuah panggilan dianggap gagal.
*[Token]: String yang dibawa request sebagai bukti siapa pengirimnya, mis. token login di header Authorization; siapa pun yang memegangnya bisa memakainya. Di token bucket, token berarti satu jatah request.
*[token]: String yang dibawa request sebagai bukti siapa pengirimnya, mis. token login di header Authorization; siapa pun yang memegangnya bisa memakainya. Di token bucket, token berarti satu jatah request.
*[Token bucket]: Algoritma rate limit: setiap key (IP atau akun) punya bucket berisi token yang terisi ulang dengan laju tetap, dan setiap request memakai satu token.
*[token bucket]: Algoritma rate limit: setiap key (IP atau akun) punya bucket berisi token yang terisi ulang dengan laju tetap, dan setiap request memakai satu token.
*[Trace]: Rekaman perjalanan satu request melewati beberapa komponen, lengkap dengan durasi tiap bagian.
*[trace]: Rekaman perjalanan satu request melewati beberapa komponen, lengkap dengan durasi tiap bagian.
*[TTL]: Masa berlaku sebuah data di cache sebelum dianggap kedaluwarsa.
*[Time To Live]: Masa berlaku sebuah data di cache sebelum dianggap kedaluwarsa.
*[Tutup buku]: Pemeriksaan akhir periode: untuk setiap buku, saldo awal ditambah mutasi harus sama dengan saldo akhir, dan seluruh jurnal harus seimbang.
*[tutup buku]: Pemeriksaan akhir periode: untuk setiap buku, saldo awal ditambah mutasi harus sama dengan saldo akhir, dan seluruh jurnal harus seimbang.
*[WAL]: Log perubahan yang ditulis PostgreSQL sebelum data diubah. Replica menyalin perubahan dengan membaca WAL dari primary.
*[Webhook]: HTTP request yang dikirim sistem lain ke API kita saat ada kejadian, mis. pembayaran berhasil.
*[webhook]: HTTP request yang dikirim sistem lain ke API kita saat ada kejadian, mis. pembayaran berhasil.
*[WebSocket]: Koneksi dua arah yang tetap terbuka antara app dan server.
*[Worker]: Proses terpisah yang mengambil pekerjaan dari queue dan mengerjakannya di luar jalur request. Di server web seperti WSGI, worker juga berarti satu proses yang melayani request.
*[worker]: Proses terpisah yang mengambil pekerjaan dari queue dan mengerjakannya di luar jalur request. Di server web seperti WSGI, worker juga berarti satu proses yang melayani request.
