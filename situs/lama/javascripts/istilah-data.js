// Dibuat oleh tools/build_istilah.py dari situs/src/content/docs/alat/glosarium.mdx. Jangan diedit langsung.
window.ISTILAH = {
 "ACID": {
  "b": "B3.1",
  "d": "Empat jaminan transaction di database relasional: atomicity, consistency, isolation, durability.",
  "n": "1.23 Transaction",
  "s": "istilah-acid",
  "t": "ACID",
  "u": "tahap-1/transaction/"
 },
 "ADR": {
  "b": "D5",
  "d": "Catatan pendek tentang satu keputusan desain: konteks, pilihan, alasan, dan akibatnya.",
  "n": "4.6 Template ADR",
  "s": "istilah-adr",
  "t": "ADR (Architecture Decision Record)",
  "u": "d-system-design/d5-adr/"
 },
 "API": {
  "b": "A1",
  "d": "Sekumpulan endpoint yang disediakan server supaya program lain, mis. app Flutter, bisa membaca dan mengubah data.",
  "n": "1.3 Apa yang dikerjakan backend",
  "s": "istilah-api",
  "t": "API (Application Programming Interface)",
  "u": "tahap-1/apa-yang-dikerjakan-backend/"
 },
 "API gateway": {
  "b": "C4",
  "d": "Server di depan beberapa instance atau service yang mengurus hal bersama sebelum request diteruskan, mis. rate limit, authentication, dan routing.",
  "n": "3.7 Security dasar dan rate limit",
  "s": "istilah-api-gateway",
  "t": "API gateway",
  "u": "c-operasional/c4-security-dasar/"
 },
 "Application Programming Interface": {
  "b": "A1",
  "d": "Sekumpulan endpoint yang disediakan server supaya program lain, mis. app Flutter, bisa membaca dan mengubah data.",
  "n": "1.3 Apa yang dikerjakan backend",
  "s": "istilah-api",
  "t": "API (Application Programming Interface)",
  "u": "tahap-1/apa-yang-dikerjakan-backend/"
 },
 "Architecture Decision Record": {
  "b": "D5",
  "d": "Catatan pendek tentang satu keputusan desain: konteks, pilihan, alasan, dan akibatnya.",
  "n": "4.6 Template ADR",
  "s": "istilah-adr",
  "t": "ADR (Architecture Decision Record)",
  "u": "d-system-design/d5-adr/"
 },
 "At-least-once": {
  "b": "B10.1",
  "d": "Jaminan pengiriman: setiap pesan sampai minimal sekali, jadi bisa sampai dua kali dan penerimanya harus tahan pesan ganda.",
  "h": "istilah/at-least-once/",
  "n": "3.3 Background job, queue, retry",
  "s": "istilah-at-least-once",
  "t": "At-least-once",
  "u": "b-fondasi/b10-1-background-job/"
 },
 "Atomicity": {
  "b": "B3.1",
  "d": "Jaminan bahwa semua perubahan dalam satu transaction terjadi seluruhnya atau tidak sama sekali.",
  "n": "1.23 Transaction",
  "s": "istilah-atomicity",
  "t": "Atomicity",
  "u": "tahap-1/transaction/"
 },
 "Auth": {
  "b": "B5.1",
  "d": "Proses memastikan siapa yang mengirim request, mis. lewat token login.",
  "n": "1.27 Authentication",
  "s": "istilah-authentication",
  "t": "Authentication",
  "u": "tahap-1/authentication/"
 },
 "Authentication": {
  "b": "B5.1",
  "d": "Proses memastikan siapa yang mengirim request, mis. lewat token login.",
  "n": "1.27 Authentication",
  "s": "istilah-authentication",
  "t": "Authentication",
  "u": "tahap-1/authentication/"
 },
 "Authorization": {
  "b": "B5.3",
  "d": "Proses memastikan user yang sudah dikenal boleh melakukan aksi itu pada data itu.",
  "n": "1.28 Authorization",
  "s": "istilah-authorization",
  "t": "Authorization",
  "u": "tahap-1/authorization/"
 },
 "BFF": {
  "b": "B11.2",
  "d": "Endpoint atau service yang dibentuk khusus untuk satu jenis client, mis. satu endpoint beranda untuk app mobile.",
  "n": "4.2 Proxy dan BFF",
  "s": "istilah-bff",
  "t": "BFF (Backend for Frontend)",
  "u": "b-fondasi/b11-2-proxy-bff/"
 },
 "BaaS": {
  "b": "A4",
  "d": "Layanan yang menyediakan database, auth, dan API siap pakai, mis. Supabase dan Firebase.",
  "n": "1.4 Backend sendiri, bukan BaaS",
  "s": "istilah-baas",
  "t": "BaaS (Backend-as-a-Service)",
  "u": "tahap-1/adr-1-backend-sendiri/"
 },
 "Backend for Frontend": {
  "b": "B11.2",
  "d": "Endpoint atau service yang dibentuk khusus untuk satu jenis client, mis. satu endpoint beranda untuk app mobile.",
  "n": "4.2 Proxy dan BFF",
  "s": "istilah-bff",
  "t": "BFF (Backend for Frontend)",
  "u": "b-fondasi/b11-2-proxy-bff/"
 },
 "Backfill": {
  "b": "B4.2",
  "d": "Script sekali jalan yang mengisi kolom baru untuk baris lama, biasanya bertahap per batch.",
  "n": "2.22 Ubah skema tanpa downtime",
  "s": "istilah-backfill",
  "t": "Backfill",
  "u": "b-fondasi/b4-2-ubah-skema-tanpa-downtime/"
 },
 "Backoff": {
  "b": "t2-idempotency",
  "d": "Jeda yang makin panjang di antara percobaan ulang, ditambah keacakan (jitter) supaya banyak app tidak mengulang di detik yang sama.",
  "h": "istilah/backoff/",
  "n": "2.14 Retry dan idempotency key",
  "s": "istilah-backoff",
  "t": "Backoff",
  "u": "tahap-2/retry-idempotency/"
 },
 "Buku ledger": {
  "b": "t2-ledger",
  "d": "Satu tempat uang dicatat di ledger: milik satu karyawan, satu warung, atau sistem seperti tunjangan; saldonya adalah jumlah posting-nya.",
  "h": "istilah/buku-ledger/",
  "n": "2.7 Ledger double-entry",
  "s": "istilah-buku-ledger",
  "t": "Buku ledger",
  "u": "tahap-2/ledger/"
 },
 "CI": {
  "b": "B1.4",
  "d": "Pemeriksaan otomatis (build, test, lint) yang berjalan di server setiap kali kode dikirim, sebelum perubahan boleh digabung.",
  "n": "1.18 Kontrak OpenAPI dan ADR 3",
  "s": "istilah-ci",
  "t": "CI (Continuous Integration)",
  "u": "tahap-1/kontrak-openapi/"
 },
 "COMMIT": {
  "b": "B3.1",
  "d": "Perintah yang membuat semua perubahan dalam transaction menjadi permanen dan terlihat oleh koneksi lain.",
  "n": "1.23 Transaction",
  "s": "istilah-commit",
  "t": "COMMIT",
  "u": "tahap-1/transaction/"
 },
 "Cache": {
  "b": "B9",
  "d": "Salinan data di tempat yang lebih cepat dibaca, dengan risiko isinya tertinggal dari data asli.",
  "n": "3.6 Caching dan invalidation",
  "s": "istilah-cache",
  "t": "Cache",
  "u": "b-fondasi/b9-caching/"
 },
 "Circuit breaker": {
  "b": "B11",
  "d": "Mekanisme yang berhenti memanggil layanan yang sedang gagal untuk sementara, lalu mencoba lagi setelah jeda.",
  "n": "4.1 Integrasi pihak ketiga",
  "s": "istilah-circuit-breaker",
  "t": "Circuit breaker",
  "u": "b-fondasi/b11-integrasi-pihak-ketiga/"
 },
 "Connection pool": {
  "b": "B2.5",
  "d": "Sekumpulan koneksi database yang dibuka sekali lalu dipinjamkan bergantian ke request.",
  "n": "3.2 Connection pool",
  "s": "istilah-connection-pool",
  "t": "Connection pool",
  "u": "b-fondasi/b2-5-connection-pool/"
 },
 "Constraint": {
  "b": "B2.1",
  "d": "Aturan yang dipaksakan database pada data, mis. UNIQUE, CHECK, atau NOT NULL.",
  "n": "1.12 Data modeling dan relasi",
  "s": "istilah-constraint",
  "t": "Constraint",
  "u": "tahap-1/data-modeling/"
 },
 "Container": {
  "b": "C3",
  "d": "Paket aplikasi beserta semua dependensinya yang berjalan dengan cara sama di laptop maupun server.",
  "n": "1.31 Deployment dan rollback",
  "s": "istilah-container",
  "t": "Container",
  "u": "tahap-1/deployment-rollback/"
 },
 "Continuous Integration": {
  "b": "B1.4",
  "d": "Pemeriksaan otomatis (build, test, lint) yang berjalan di server setiap kali kode dikirim, sebelum perubahan boleh digabung.",
  "n": "1.18 Kontrak OpenAPI dan ADR 3",
  "s": "istilah-ci",
  "t": "CI (Continuous Integration)",
  "u": "tahap-1/kontrak-openapi/"
 },
 "Database": {
  "b": "B2.1",
  "d": "Program yang menyimpan data secara permanen dan menjamin aturan seperti constraint dan transaction.",
  "n": "1.12 Data modeling dan relasi",
  "s": "istilah-database",
  "t": "Database",
  "u": "tahap-1/data-modeling/"
 },
 "Dead-letter queue": {
  "b": "B10.1",
  "d": "Tempat job yang terus gagal setelah batas retry, supaya bisa diperiksa manusia dan tidak diulang selamanya.",
  "n": "3.3 Background job, queue, retry",
  "s": "istilah-dead-letter-queue",
  "t": "Dead-letter queue",
  "u": "b-fondasi/b10-1-background-job/"
 },
 "Deadlock": {
  "b": "t2-race-lock",
  "d": "Dua transaction saling menunggu lock milik yang lain, sehingga database harus membatalkan salah satunya.",
  "h": "istilah/deadlock/",
  "n": "2.11 Race condition",
  "s": "istilah-deadlock",
  "t": "Deadlock",
  "u": "tahap-2/race-lock/"
 },
 "Debit": {
  "b": "t2-ledger",
  "d": "Sisi kiri sebuah jurnal akuntansi; di setiap jurnal total debit sama dengan total kredit, dan akun aset bertambah di sisi debit.",
  "h": "istilah/debit/",
  "n": "2.7 Ledger double-entry",
  "s": "istilah-debit",
  "t": "Debit",
  "u": "tahap-2/ledger/"
 },
 "Double-entry": {
  "b": "t2-ledger",
  "d": "Cara mencatat uang di dua sisi atau lebih: setiap rupiah yang keluar dari satu buku masuk ke buku lain, jadi jumlah catatan satu kejadian selalu nol.",
  "h": "istilah/double-entry/",
  "n": "2.7 Ledger double-entry",
  "s": "istilah-double-entry",
  "t": "Double-entry",
  "u": "tahap-2/ledger/"
 },
 "ERD": {
  "b": "t2-skema",
  "d": "Gambar skema database: tabel dengan kolom pentingnya, dan garis untuk setiap foreign key di antara tabel.",
  "h": "istilah/erd/",
  "n": "2.9 Skema data Tahap 2",
  "s": "istilah-erd",
  "t": "ERD (Entity-Relationship Diagram)",
  "u": "tahap-2/skema-data/"
 },
 "ERP": {
  "b": "t2-prd",
  "d": "Perangkat lunak yang mengurus keuangan, pembelian, dan gaji satu perusahaan; di cerita, Nadia datang dari tim ERP Grup Lestari.",
  "n": "2.1 PRD v2",
  "s": "istilah-erp",
  "t": "ERP (Enterprise Resource Planning)",
  "u": "tahap-2/prd-v2/"
 },
 "EXPLAIN": {
  "b": "t2-index",
  "d": "Perintah PostgreSQL yang menampilkan query plan; dengan ANALYZE ia menjalankan query dan mencatat baris dan waktu tiap node.",
  "h": "istilah/explain/",
  "n": "2.17 Index dan query plan",
  "s": "istilah-explain",
  "t": "EXPLAIN",
  "u": "tahap-2/index-query-plan/"
 },
 "Eager loading": {
  "b": "t2-n-plus-1",
  "d": "Memuat data berelasi bersama query induknya, supaya mengakses relasi di dalam loop tidak mengirim query baru.",
  "h": "istilah/eager-loading/",
  "n": "2.16 N+1 query",
  "s": "istilah-eager-loading",
  "t": "Eager loading",
  "u": "tahap-2/n-plus-1/"
 },
 "Endpoint": {
  "b": "B1.1",
  "d": "Pasangan method dan path yang dilayani server, mis. POST /transfers.",
  "n": "1.16 HTTP",
  "s": "istilah-endpoint",
  "t": "Endpoint",
  "u": "tahap-1/http/"
 },
 "Enterprise Resource Planning": {
  "b": "t2-prd",
  "d": "Perangkat lunak yang mengurus keuangan, pembelian, dan gaji satu perusahaan; di cerita, Nadia datang dari tim ERP Grup Lestari.",
  "n": "2.1 PRD v2",
  "s": "istilah-erp",
  "t": "ERP (Enterprise Resource Planning)",
  "u": "tahap-2/prd-v2/"
 },
 "Enumerasi": {
  "b": "t1-idor",
  "d": "Mencoba nilai satu per satu, mis. ID akun 401 sampai 503 atau daftar email, untuk mengetahui data mana yang ada.",
  "n": "1.29 IDOR, enumerasi, dan token di app",
  "s": "istilah-enumerasi",
  "t": "Enumerasi",
  "u": "tahap-1/idor-token-app/"
 },
 "Event sourcing": {
  "b": "t2-adr-ledger",
  "d": "Menyimpan setiap perubahan data sebagai event yang tidak diubah; keadaan sekarang dibangun ulang dari urutan event itu.",
  "h": "istilah/event-sourcing/",
  "n": "2.8 ADR 6 direvisi",
  "s": "istilah-event-sourcing",
  "t": "Event sourcing",
  "u": "tahap-2/adr-ledger/"
 },
 "Eventual consistency": {
  "b": "D3",
  "d": "Data di beberapa tempat boleh berbeda sesaat, tapi akan sama setelah perubahan selesai menyebar.",
  "n": "5.2 Replica dan consistency",
  "s": "istilah-eventual-consistency",
  "t": "Eventual consistency",
  "u": "d-system-design/d3-consistency/"
 },
 "Expand-migrate-contract": {
  "b": "E1",
  "d": "Urutan mengubah skema tanpa downtime: tambah yang baru, pindahkan data dan kode, baru hapus yang lama.",
  "n": "1.33 App versi lama",
  "s": "istilah-expand-migrate-contract",
  "t": "Expand-migrate-contract",
  "u": "tahap-1/app-versi-lama/"
 },
 "FCM": {
  "b": "E4",
  "d": "Layanan push notification milik Firebase. Server mengirim pesan ke token perangkat atau ke topic, lalu sistem operasi HP menampilkannya.",
  "n": "3.5 Push dan real-time",
  "s": "istilah-fcm",
  "t": "FCM (Firebase Cloud Messaging)",
  "u": "e-mobile/e4-push-real-time/"
 },
 "Fan-out": {
  "b": "D4b",
  "d": "Menyebarkan satu kejadian ke banyak penerima, mis. satu promo ditulis ke feed setiap pengikut.",
  "n": "5.3 Feed dan notifikasi",
  "s": "istilah-fan-out",
  "t": "Fan-out",
  "u": "d-system-design/d4b-feed-notifikasi/"
 },
 "Firebase Cloud Messaging": {
  "b": "E4",
  "d": "Layanan push notification milik Firebase. Server mengirim pesan ke token perangkat atau ke topic, lalu sistem operasi HP menampilkannya.",
  "n": "3.5 Push dan real-time",
  "s": "istilah-fcm",
  "t": "FCM (Firebase Cloud Messaging)",
  "u": "e-mobile/e4-push-real-time/"
 },
 "Foreign key": {
  "b": "B2.1",
  "d": "Kolom yang menunjuk primary key tabel lain, dan database menjamin rujukannya ada.",
  "n": "1.12 Data modeling dan relasi",
  "s": "istilah-foreign-key",
  "t": "Foreign key",
  "u": "tahap-1/data-modeling/"
 },
 "GET": {
  "b": "B1.1",
  "d": "Kata kerja request (GET, POST, PUT, PATCH, DELETE) yang menyatakan maksud request terhadap resource.",
  "n": "1.16 HTTP",
  "s": "istilah-http-method",
  "t": "HTTP method",
  "u": "tahap-1/http/"
 },
 "HTTP method": {
  "b": "B1.1",
  "d": "Kata kerja request (GET, POST, PUT, PATCH, DELETE) yang menyatakan maksud request terhadap resource.",
  "n": "1.16 HTTP",
  "s": "istilah-http-method",
  "t": "HTTP method",
  "u": "tahap-1/http/"
 },
 "Handler": {
  "b": "A2",
  "d": "Fungsi di server yang menerima satu request, memeriksa formatnya, lalu memanggil logika bisnis.",
  "n": "1.5 Perjalanan satu request",
  "s": "istilah-handler",
  "t": "Handler",
  "u": "tahap-1/perjalanan-request/"
 },
 "Header": {
  "b": "B1.1",
  "d": "Pasangan nama-nilai di request atau response yang membawa informasi tambahan, mis. token atau tipe konten.",
  "n": "1.16 HTTP",
  "s": "istilah-header",
  "t": "Header",
  "u": "tahap-1/http/"
 },
 "IDOR": {
  "b": "t1-idor",
  "d": "Celah saat server memakai ID dari request tanpa bertanya apakah peminta boleh menyentuh data itu. OWASP API Security menyebutnya BOLA.",
  "n": "1.29 IDOR, enumerasi, dan token di app",
  "s": "istilah-idor",
  "t": "IDOR (Insecure Direct Object Reference)",
  "u": "tahap-1/idor-token-app/"
 },
 "Idempotency key": {
  "b": "t2-idempotency",
  "d": "Nilai unik yang dibuat app untuk satu aksi, mis. satu kali tekan Bayar, dan dikirim ulang di setiap retry, supaya server mengenali kiriman ulang dan tidak menjalankannya dua kali.",
  "h": "istilah/idempotency-key/",
  "n": "2.14 Retry dan idempotency key",
  "s": "istilah-idempotency-key",
  "t": "Idempotency key",
  "u": "tahap-2/retry-idempotency/"
 },
 "Idempotent": {
  "b": "t2-kursor",
  "d": "Sifat operasi yang hasil akhirnya sama walau dijalankan sekali atau berkali-kali.",
  "n": "2.19 Pagination kursor",
  "s": "istilah-idempotent",
  "t": "Idempotent",
  "u": "tahap-2/pagination-kursor/"
 },
 "Insecure Direct Object Reference": {
  "b": "t1-idor",
  "d": "Celah saat server memakai ID dari request tanpa bertanya apakah peminta boleh menyentuh data itu. OWASP API Security menyebutnya BOLA.",
  "n": "1.29 IDOR, enumerasi, dan token di app",
  "s": "istilah-idor",
  "t": "IDOR (Insecure Direct Object Reference)",
  "u": "tahap-1/idor-token-app/"
 },
 "Invarian": {
  "b": "C1",
  "d": "Aturan yang harus selalu benar apa pun yang terjadi, mis. transfer tidak mengubah total saldo semua akun.",
  "h": "istilah/invarian/",
  "n": "1.32 Testing",
  "s": "istilah-invarian",
  "t": "Invarian",
  "u": "tahap-1/testing/"
 },
 "Isolation level": {
  "b": "t2-isolation-level",
  "d": "Seberapa banyak perubahan dari transaction lain yang boleh terlihat oleh satu transaction yang sedang berjalan.",
  "h": "istilah/isolation-level/",
  "n": "2.12 Isolation level",
  "s": "istilah-isolation-level",
  "t": "Isolation level",
  "u": "tahap-2/isolation-level/"
 },
 "JSON Web Token": {
  "b": "B5.1",
  "d": "Token berisi data JSON plus signature, sehingga server bisa memeriksa keasliannya tanpa query ke database.",
  "n": "1.27 Authentication",
  "s": "istilah-jwt",
  "t": "JWT (JSON Web Token)",
  "u": "tahap-1/authentication/"
 },
 "JWT": {
  "b": "B5.1",
  "d": "Token berisi data JSON plus signature, sehingga server bisa memeriksa keasliannya tanpa query ke database.",
  "n": "1.27 Authentication",
  "s": "istilah-jwt",
  "t": "JWT (JSON Web Token)",
  "u": "tahap-1/authentication/"
 },
 "Job terjadwal": {
  "b": "t2-pencairan",
  "d": "Program di server yang dijalankan jadwal, bukan request user, mis. pencairan warung setiap Jumat 15.00.",
  "h": "istilah/job-terjadwal/",
  "n": "2.5 Fitur pencairan",
  "s": "istilah-job-terjadwal",
  "t": "Job terjadwal",
  "u": "tahap-2/fitur-pencairan/"
 },
 "Jurnal": {
  "b": "t2-ledger",
  "d": "Catatan satu kejadian yang memindahkan uang, berisi dua posting atau lebih (satu baris uang per buku) yang jumlahnya selalu nol.",
  "h": "istilah/jurnal/",
  "n": "2.7 Ledger double-entry",
  "s": "istilah-jurnal",
  "t": "Jurnal",
  "u": "tahap-2/ledger/"
 },
 "Kredit": {
  "b": "t2-ledger",
  "d": "Sisi kanan sebuah jurnal akuntansi; di setiap jurnal total kredit sama dengan total debit, dan akun kewajiban bertambah di sisi kredit.",
  "h": "istilah/kredit/",
  "n": "2.7 Ledger double-entry",
  "s": "istilah-kredit",
  "t": "Kredit",
  "u": "tahap-2/ledger/"
 },
 "LSN": {
  "b": "D3",
  "d": "Posisi di WAL. Membandingkan LSN primary dan replica menunjukkan apakah replica sudah menerapkan perubahan tertentu.",
  "n": "5.2 Replica dan consistency",
  "s": "istilah-lsn",
  "t": "LSN (Log Sequence Number)",
  "u": "d-system-design/d3-consistency/"
 },
 "Latency": {
  "b": "C2",
  "d": "Lama waktu satu request dari dikirim sampai response diterima.",
  "n": "3.1 Observability",
  "s": "istilah-latency",
  "t": "Latency",
  "u": "c-operasional/c2-observability/"
 },
 "Lazy loading": {
  "b": "t2-n-plus-1",
  "d": "Memuat data berelasi baru saat kode pertama kali mengaksesnya, dengan satu query setiap akses.",
  "h": "istilah/lazy-loading/",
  "n": "2.16 N+1 query",
  "s": "istilah-lazy-loading",
  "t": "Lazy loading",
  "u": "tahap-2/n-plus-1/"
 },
 "Lease": {
  "b": "B10.1",
  "d": "Batas waktu satu pekerjaan di queue dipegang satu worker. Kalau worker mati sebelum selesai, pekerjaan diberikan ke worker lain setelah lease habis.",
  "n": "3.3 Background job, queue, retry",
  "s": "istilah-lease",
  "t": "Lease",
  "u": "b-fondasi/b10-1-background-job/"
 },
 "Ledger": {
  "b": "t2-saldo-bukan-kolom",
  "d": "Cara mencatat uang dengan menyimpan setiap perpindahan sebagai baris yang tidak diubah; saldo adalah jumlah baris itu, bukan angka yang ditimpa.",
  "h": "istilah/ledger/",
  "n": "2.6 Kenapa saldo bukan kolom",
  "s": "istilah-ledger",
  "t": "Ledger",
  "u": "tahap-2/saldo-bukan-kolom/"
 },
 "Load balancer": {
  "b": "D2",
  "d": "Komponen yang membagi request ke beberapa instance server yang sama.",
  "n": "5.1 Scaling",
  "s": "istilah-load-balancer",
  "t": "Load balancer",
  "u": "d-system-design/d2-scaling/"
 },
 "Lock": {
  "b": "t2-race-lock",
  "d": "Tanda di database bahwa satu transaction sedang memakai baris atau tabel, sehingga transaction lain harus menunggu.",
  "h": "istilah/lock/",
  "n": "2.11 Race condition",
  "s": "istilah-lock",
  "t": "Lock",
  "u": "tahap-2/race-lock/"
 },
 "Log": {
  "b": "C2",
  "d": "Catatan kejadian per request atau per peristiwa, ditulis aplikasi untuk dibaca saat menyelidiki masalah.",
  "n": "3.1 Observability",
  "s": "istilah-log",
  "t": "Log",
  "u": "c-operasional/c2-observability/"
 },
 "Log Sequence Number": {
  "b": "D3",
  "d": "Posisi di WAL. Membandingkan LSN primary dan replica menunjukkan apakah replica sudah menerapkan perubahan tertentu.",
  "n": "5.2 Replica dan consistency",
  "s": "istilah-lsn",
  "t": "LSN (Log Sequence Number)",
  "u": "d-system-design/d3-consistency/"
 },
 "Lost update": {
  "b": "t2-race-lock",
  "d": "Perubahan yang hilang karena dua transaction membaca nilai lama yang sama lalu saling menimpa.",
  "n": "2.11 Race condition",
  "s": "istilah-lost-update",
  "t": "Lost update",
  "u": "tahap-2/race-lock/"
 },
 "MVCC": {
  "b": "t2-isolation-level",
  "d": "Cara database menyimpan beberapa versi baris, supaya pembaca tidak perlu menunggu penulis.",
  "n": "2.12 Isolation level",
  "s": "istilah-mvcc",
  "t": "MVCC (Multi-Version Concurrency Control)",
  "u": "tahap-2/isolation-level/"
 },
 "Metode idempoten": {
  "b": "t2-kursor",
  "d": "Metode HTTP yang efeknya di server sama untuk satu request atau banyak request identik: PUT, DELETE, dan semua metode safe seperti GET.",
  "h": "istilah/metode-idempoten/",
  "n": "2.19 Pagination kursor",
  "s": "istilah-metode-idempoten",
  "t": "Metode idempoten",
  "u": "tahap-2/pagination-kursor/"
 },
 "Metric": {
  "b": "C2",
  "d": "Angka yang dihitung terus-menerus, mis. jumlah request per detik atau persentase error.",
  "n": "3.1 Observability",
  "s": "istilah-metric",
  "t": "Metric",
  "u": "c-operasional/c2-observability/"
 },
 "Microservice": {
  "b": "B7.2",
  "d": "Gaya arsitektur yang memecah backend jadi beberapa service kecil yang di-deploy terpisah dan saling memanggil lewat jaringan.",
  "n": "4.5 Modular monolith",
  "s": "istilah-microservice",
  "t": "Microservice",
  "u": "b-fondasi/b7-2-batas-modul/"
 },
 "Middleware": {
  "b": "B7.1",
  "d": "Fungsi yang dijalankan sebelum atau sesudah semua handler, mis. pemeriksa token atau pencatat log.",
  "n": "1.21 Lapisan dasar",
  "s": "istilah-middleware",
  "t": "Middleware",
  "u": "tahap-1/lapisan-dasar/"
 },
 "Migration": {
  "b": "B4.1",
  "d": "File berurutan yang mengubah skema database, disimpan dan direview seperti kode.",
  "n": "1.25 Migration",
  "s": "istilah-migration",
  "t": "Migration",
  "u": "tahap-1/migration/"
 },
 "Modular monolith": {
  "b": "B7.2",
  "d": "Satu aplikasi yang di-deploy sebagai satu unit, tapi kodenya dibagi ke modul dengan batas yang tegas.",
  "n": "4.5 Modular monolith",
  "s": "istilah-modular-monolith",
  "t": "Modular monolith",
  "u": "b-fondasi/b7-2-batas-modul/"
 },
 "Monolith": {
  "b": "A1",
  "d": "Satu aplikasi backend yang memuat semua fitur dan di-deploy sebagai satu unit.",
  "n": "1.3 Apa yang dikerjakan backend",
  "s": "istilah-monolith",
  "t": "Monolith",
  "u": "tahap-1/apa-yang-dikerjakan-backend/"
 },
 "N+1": {
  "b": "t2-n-plus-1",
  "d": "Pola satu query untuk daftar lalu satu query lagi untuk setiap item di daftar itu.",
  "h": "istilah/n-1-query/",
  "n": "2.16 N+1 query",
  "s": "istilah-n-1-query",
  "t": "N+1 query",
  "u": "tahap-2/n-plus-1/"
 },
 "N+1 query": {
  "b": "t2-n-plus-1",
  "d": "Pola satu query untuk daftar lalu satu query lagi untuk setiap item di daftar itu.",
  "h": "istilah/n-1-query/",
  "n": "2.16 N+1 query",
  "s": "istilah-n-1-query",
  "t": "N+1 query",
  "u": "tahap-2/n-plus-1/"
 },
 "Nonrepeatable read": {
  "b": "t2-isolation-level",
  "d": "Anomali: baris yang sama dibaca dua kali dalam satu transaction dan nilainya berbeda, karena transaction lain sudah commit perubahan.",
  "n": "2.12 Isolation level",
  "s": "istilah-nonrepeatable-read",
  "t": "Nonrepeatable read",
  "u": "tahap-2/isolation-level/"
 },
 "OAuth 2.0": {
  "b": "B5.2",
  "d": "Standar untuk memberi aplikasi akses terbatas ke akun user di layanan lain tanpa memberikan password.",
  "n": "4.4 OAuth dan login sosial",
  "s": "istilah-oauth-2-0",
  "t": "OAuth 2.0",
  "u": "b-fondasi/b5-2-oauth-oidc/"
 },
 "OIDC": {
  "b": "B5.2",
  "d": "Lapisan di atas OAuth 2.0 untuk login, yang memberi tahu aplikasi siapa user-nya.",
  "n": "4.4 OAuth dan login sosial",
  "s": "istilah-oidc",
  "t": "OIDC (OpenID Connect)",
  "u": "b-fondasi/b5-2-oauth-oidc/"
 },
 "ORM": {
  "b": "t2-n-plus-1",
  "d": "Library yang memetakan tabel database ke objek di kode, sehingga query ditulis sebagai pemanggilan method, mis. Eloquent di Laravel atau ORM bawaan Django.",
  "h": "istilah/orm/",
  "n": "2.16 N+1 query",
  "s": "istilah-orm",
  "t": "ORM (Object-Relational Mapping)",
  "u": "tahap-2/n-plus-1/"
 },
 "Object storage": {
  "b": "B11.2",
  "d": "Layanan penyimpanan file besar per objek, diakses lewat HTTP, mis. layanan kompatibel S3.",
  "n": "4.2 Proxy dan BFF",
  "s": "istilah-object-storage",
  "t": "Object storage",
  "u": "b-fondasi/b11-2-proxy-bff/"
 },
 "Offline-first": {
  "b": "E2",
  "d": "Desain app yang menyimpan perubahan di HP dulu, lalu menyinkronkannya ke server saat sinyal ada.",
  "n": "3.8 Offline-first dan sync",
  "s": "istilah-offline-first",
  "t": "Offline-first",
  "u": "e-mobile/e2-offline-first/"
 },
 "OpenAPI": {
  "b": "B1.4",
  "d": "Format standar untuk menulis kontrak API (endpoint, request, response) yang bisa dibaca manusia dan mesin.",
  "n": "1.18 Kontrak OpenAPI dan ADR 3",
  "s": "istilah-openapi",
  "t": "OpenAPI",
  "u": "tahap-1/kontrak-openapi/"
 },
 "OpenID Connect": {
  "b": "B5.2",
  "d": "Lapisan di atas OAuth 2.0 untuk login, yang memberi tahu aplikasi siapa user-nya.",
  "n": "4.4 OAuth dan login sosial",
  "s": "istilah-oidc",
  "t": "OIDC (OpenID Connect)",
  "u": "b-fondasi/b5-2-oauth-oidc/"
 },
 "Optimistic lock": {
  "b": "t2-race-lock",
  "d": "Cara mencegah lost update dengan mengecek nomor versi saat menulis, tanpa mengunci baris saat membaca.",
  "h": "istilah/optimistic-lock/",
  "n": "2.11 Race condition",
  "s": "istilah-optimistic-lock",
  "t": "Optimistic lock",
  "u": "tahap-2/race-lock/"
 },
 "Outbox": {
  "b": "B10.2",
  "d": "Tabel tempat event ditulis dalam transaction yang sama dengan perubahan data, lalu dikirim oleh worker.",
  "n": "4.3 Webhook dan outbox",
  "s": "istilah-outbox",
  "t": "Outbox",
  "u": "b-fondasi/b10-2-webhook-outbox/"
 },
 "PATCH": {
  "b": "B1.1",
  "d": "Kata kerja request (GET, POST, PUT, PATCH, DELETE) yang menyatakan maksud request terhadap resource.",
  "n": "1.16 HTTP",
  "s": "istilah-http-method",
  "t": "HTTP method",
  "u": "tahap-1/http/"
 },
 "PKCE": {
  "b": "B5.2",
  "d": "Tambahan pada alur OAuth untuk app mobile yang mencegah authorization code dipakai oleh aplikasi lain.",
  "n": "4.4 OAuth dan login sosial",
  "s": "istilah-pkce",
  "t": "PKCE",
  "u": "b-fondasi/b5-2-oauth-oidc/"
 },
 "POST": {
  "b": "B1.1",
  "d": "Kata kerja request (GET, POST, PUT, PATCH, DELETE) yang menyatakan maksud request terhadap resource.",
  "n": "1.16 HTTP",
  "s": "istilah-http-method",
  "t": "HTTP method",
  "u": "tahap-1/http/"
 },
 "PUT": {
  "b": "B1.1",
  "d": "Kata kerja request (GET, POST, PUT, PATCH, DELETE) yang menyatakan maksud request terhadap resource.",
  "n": "1.16 HTTP",
  "s": "istilah-http-method",
  "t": "HTTP method",
  "u": "tahap-1/http/"
 },
 "Pagination": {
  "b": "t2-kursor",
  "d": "Membagi daftar panjang menjadi potongan kecil yang diminta satu per satu.",
  "h": "istilah/pagination/",
  "n": "2.19 Pagination kursor",
  "s": "istilah-pagination",
  "t": "Pagination",
  "u": "tahap-2/pagination-kursor/"
 },
 "Pagination kursor": {
  "b": "t2-kursor",
  "d": "Pagination yang meminta baris sesudah nilai urutan baris terakhir yang sudah tampil, bukan halaman ke-N, jadi tetap stabil saat baris baru masuk.",
  "h": "istilah/pagination-kursor/",
  "n": "2.19 Pagination kursor",
  "s": "istilah-pagination-kursor",
  "t": "Pagination kursor (keyset)",
  "u": "tahap-2/pagination-kursor/"
 },
 "Partisi": {
  "b": "D2",
  "d": "Membagi satu tabel besar jadi beberapa partisi di database yang sama, mis. per bulan, supaya query dan arsip hanya menyentuh sebagian data.",
  "n": "5.1 Scaling",
  "s": "istilah-partitioning",
  "t": "Partitioning",
  "u": "d-system-design/d2-scaling/"
 },
 "Partitioning": {
  "b": "D2",
  "d": "Membagi satu tabel besar jadi beberapa partisi di database yang sama, mis. per bulan, supaya query dan arsip hanya menyentuh sebagian data.",
  "n": "5.1 Scaling",
  "s": "istilah-partitioning",
  "t": "Partitioning",
  "u": "d-system-design/d2-scaling/"
 },
 "Payload": {
  "b": "E5",
  "d": "Isi data yang dikirim di body request atau response, biasanya JSON.",
  "n": "2.20 Ukuran payload dan kuota HP",
  "s": "istilah-payload",
  "t": "Payload",
  "u": "e-mobile/e5-ukuran-payload/"
 },
 "Phantom read": {
  "b": "t2-isolation-level",
  "d": "Anomali: query yang sama dalam satu transaction mengembalikan kumpulan baris berbeda, karena transaction lain menambah atau menghapus baris.",
  "n": "2.12 Isolation level",
  "s": "istilah-phantom-read",
  "t": "Phantom read",
  "u": "tahap-2/isolation-level/"
 },
 "Polling": {
  "b": "E4",
  "d": "App menanyakan status ke server berulang kali dengan jeda tetap.",
  "n": "3.5 Push dan real-time",
  "s": "istilah-polling",
  "t": "Polling",
  "u": "e-mobile/e4-push-real-time/"
 },
 "Posting": {
  "b": "t2-ledger",
  "d": "Satu baris uang di dalam jurnal untuk satu buku: negatif bila uang keluar, positif bila masuk; saldo buku adalah jumlah posting-nya.",
  "h": "istilah/posting/",
  "n": "2.7 Ledger double-entry",
  "s": "istilah-posting",
  "t": "Posting",
  "u": "tahap-2/ledger/"
 },
 "Primary": {
  "b": "D3",
  "d": "Database utama yang menerima semua perintah tulis; replica menyalin perubahan dari primary.",
  "n": "5.2 Replica dan consistency",
  "s": "istilah-primary",
  "t": "Primary",
  "u": "d-system-design/d3-consistency/"
 },
 "Primary key": {
  "b": "B2.1",
  "d": "Kolom yang nilainya unik dan dipakai untuk mengenali satu baris.",
  "n": "1.12 Data modeling dan relasi",
  "s": "istilah-primary-key",
  "t": "Primary key",
  "u": "tahap-1/data-modeling/"
 },
 "Problem Details": {
  "b": "B6",
  "d": "Format error JSON standar dari RFC 9457, dengan field seperti type, title, status, dan detail.",
  "n": "1.15 Validation dua lapis dan format error",
  "s": "istilah-problem-details",
  "t": "Problem Details",
  "u": "tahap-1/validation-error/"
 },
 "Proxy": {
  "b": "B11.2",
  "d": "Program perantara yang meneruskan request antara client dan server. Proxy milik backend menambahkan hal yang tidak boleh dipegang client, mis. credential; proxy di laptop penguji dipakai untuk melihat dan mengubah request.",
  "n": "4.2 Proxy dan BFF",
  "s": "istilah-proxy",
  "t": "Proxy",
  "u": "b-fondasi/b11-2-proxy-bff/"
 },
 "Query plan": {
  "b": "t2-index",
  "d": "Rencana langkah yang dipilih database untuk menjalankan satu query, dilihat dengan EXPLAIN.",
  "h": "istilah/query-plan/",
  "n": "2.17 Index dan query plan",
  "s": "istilah-query-plan",
  "t": "Query plan",
  "u": "tahap-2/index-query-plan/"
 },
 "Queue": {
  "b": "B10.1",
  "d": "Daftar pekerjaan yang menunggu diproses oleh worker, satu per satu atau paralel.",
  "n": "3.3 Background job, queue, retry",
  "s": "istilah-queue",
  "t": "Queue",
  "u": "b-fondasi/b10-1-background-job/"
 },
 "RBAC": {
  "b": "B5.3",
  "d": "Authorization berdasarkan peran, mis. hanya peran admin yang boleh membekukan akun.",
  "n": "1.28 Authorization",
  "s": "istilah-rbac",
  "t": "RBAC (Role-Based Access Control)",
  "u": "tahap-1/authorization/"
 },
 "RLS": {
  "b": "B5.3",
  "d": "Fitur PostgreSQL yang menyaring baris berdasarkan aturan per user, dijalankan di dalam database.",
  "n": "1.28 Authorization",
  "s": "istilah-rls",
  "t": "RLS (Row Level Security)",
  "u": "tahap-1/authorization/"
 },
 "ROLLBACK": {
  "b": "B3.1",
  "d": "Perintah yang membatalkan semua perubahan sejak BEGIN.",
  "n": "1.23 Transaction",
  "s": "istilah-rollback",
  "t": "ROLLBACK",
  "u": "tahap-1/transaction/"
 },
 "Race condition": {
  "b": "t2-race-lock",
  "d": "Hasil yang bergantung pada urutan dua proses yang berjalan bersamaan.",
  "h": "istilah/race-condition/",
  "n": "2.11 Race condition",
  "s": "istilah-race-condition",
  "t": "Race condition",
  "u": "tahap-2/race-lock/"
 },
 "Rate limit": {
  "b": "C4",
  "d": "Batas jumlah request per waktu dari satu sumber, mis. lima percobaan login per menit.",
  "n": "3.7 Security dasar dan rate limit",
  "s": "istilah-rate-limit",
  "t": "Rate limit",
  "u": "c-operasional/c4-security-dasar/"
 },
 "Read Committed": {
  "b": "t2-isolation-level",
  "d": "Isolation level bawaan PostgreSQL: setiap perintah membaca data yang sudah COMMIT saat perintah itu mulai, jadi dua perintah bisa membaca keadaan berbeda.",
  "h": "istilah/read-committed/",
  "n": "2.12 Isolation level",
  "s": "istilah-read-committed",
  "t": "Read Committed",
  "u": "tahap-2/isolation-level/"
 },
 "Read replica": {
  "b": "D2",
  "d": "Salinan database yang hanya melayani baca dan selalu sedikit tertinggal dari database utama.",
  "n": "5.1 Scaling",
  "s": "istilah-read-replica",
  "t": "Read replica",
  "u": "d-system-design/d2-scaling/"
 },
 "Read-your-writes": {
  "b": "D3",
  "d": "Jaminan bahwa user langsung melihat perubahan yang baru ditulisnya, walau bacaan biasa dilayani replica yang tertinggal.",
  "n": "5.2 Replica dan consistency",
  "s": "istilah-read-your-writes",
  "t": "Read-your-writes",
  "u": "d-system-design/d3-consistency/"
 },
 "Repeatable Read": {
  "b": "t2-isolation-level",
  "d": "Isolation level yang memakai satu snapshot untuk seluruh transaction, diambil saat perintah pertama; transaction yang menulis bisa ditolak SQLSTATE 40001.",
  "h": "istilah/repeatable-read/",
  "n": "2.12 Isolation level",
  "s": "istilah-repeatable-read",
  "t": "Repeatable Read",
  "u": "tahap-2/isolation-level/"
 },
 "Replication lag": {
  "b": "D3",
  "d": "Jeda antara perubahan di database utama dan munculnya perubahan itu di replica.",
  "n": "5.2 Replica dan consistency",
  "s": "istilah-replication-lag",
  "t": "Replication lag",
  "u": "d-system-design/d3-consistency/"
 },
 "Retry": {
  "b": "t2-idempotency",
  "d": "Mengirim ulang request yang gagal atau tidak dijawab.",
  "h": "istilah/retry/",
  "n": "2.14 Retry dan idempotency key",
  "s": "istilah-retry",
  "t": "Retry",
  "u": "tahap-2/retry-idempotency/"
 },
 "Reverse proxy": {
  "b": "B11.2",
  "d": "Server di depan aplikasi yang menerima request dari internet lalu meneruskannya, sambil mengurus hal bersama seperti TLS dan kompresi.",
  "n": "4.2 Proxy dan BFF",
  "s": "istilah-reverse-proxy",
  "t": "Reverse proxy",
  "u": "b-fondasi/b11-2-proxy-bff/"
 },
 "Rolling deploy": {
  "b": "C3",
  "d": "Mengganti instance satu per satu, supaya selalu ada instance yang melayani request.",
  "n": "1.31 Deployment dan rollback",
  "s": "istilah-rolling-deploy",
  "t": "Rolling deploy",
  "u": "tahap-1/deployment-rollback/"
 },
 "Round trip": {
  "b": "B11.2",
  "d": "Satu kali bolak-balik request dan response antara app dan server. Di jaringan seluler, setiap round trip menambah latency.",
  "n": "4.2 Proxy dan BFF",
  "s": "istilah-round-trip",
  "t": "Round trip",
  "u": "b-fondasi/b11-2-proxy-bff/"
 },
 "Router": {
  "b": "B1.1",
  "d": "Bagian framework yang mencocokkan method dan path request dengan handler yang tepat.",
  "n": "1.16 HTTP",
  "s": "istilah-router",
  "t": "Router",
  "u": "tahap-1/http/"
 },
 "Row Level Security": {
  "b": "B5.3",
  "d": "Fitur PostgreSQL yang menyaring baris berdasarkan aturan per user, dijalankan di dalam database.",
  "n": "1.28 Authorization",
  "s": "istilah-rls",
  "t": "RLS (Row Level Security)",
  "u": "tahap-1/authorization/"
 },
 "SELECT FOR UPDATE": {
  "b": "t2-race-lock",
  "d": "Perintah SQL yang membaca baris sekaligus menguncinya sampai transaction selesai, sehingga transaction lain yang mau mengubah atau mengunci baris itu menunggu.",
  "h": "istilah/select-for-update/",
  "n": "2.11 Race condition",
  "s": "istilah-select-for-update",
  "t": "SELECT FOR UPDATE",
  "u": "tahap-2/race-lock/"
 },
 "SSE": {
  "b": "E4",
  "d": "Koneksi HTTP yang dibiarkan terbuka sehingga server bisa mengirim pesan satu arah ke client.",
  "n": "3.5 Push dan real-time",
  "s": "istilah-sse",
  "t": "SSE (Server-Sent Events)",
  "u": "e-mobile/e4-push-real-time/"
 },
 "Saga": {
  "b": "D3",
  "d": "Pola untuk proses yang melewati beberapa service: setiap langkah punya transaction sendiri, dan kegagalan dibatalkan dengan langkah kompensasi.",
  "n": "5.2 Replica dan consistency",
  "s": "istilah-saga",
  "t": "Saga",
  "u": "d-system-design/d3-consistency/"
 },
 "Saldo cache": {
  "b": "t2-saldo-bukan-kolom",
  "d": "Salinan jumlah posting satu buku di kolom buku.saldo_cache, dibaca app supaya cepat dan dicek tiap malam terhadap jumlah posting.",
  "h": "istilah/saldo-cache/",
  "n": "2.6 Kenapa saldo bukan kolom",
  "s": "istilah-saldo-cache",
  "t": "Saldo cache",
  "u": "tahap-2/saldo-bukan-kolom/"
 },
 "Secure storage": {
  "b": "t1-idor",
  "d": "Penyimpanan terenkripsi milik sistem operasi HP untuk rahasia kecil seperti token sesi: Keychain di iOS, kunci di Android Keystore.",
  "n": "1.29 IDOR, enumerasi, dan token di app",
  "s": "istilah-secure-storage",
  "t": "Secure storage",
  "u": "tahap-1/idor-token-app/"
 },
 "Semaphore": {
  "b": "B8",
  "d": "Penghitung yang membatasi berapa pekerjaan boleh berjalan bersamaan; pekerjaan berikutnya menunggu sampai ada yang selesai.",
  "n": "3.4 Concurrency dan async",
  "s": "istilah-semaphore",
  "t": "Semaphore",
  "u": "b-fondasi/b8-concurrency/"
 },
 "Serializable": {
  "b": "t2-isolation-level",
  "d": "Isolation level paling ketat: hasil transaction bersamaan harus sama dengan menjalankannya satu per satu; yang melanggar ditolak SQLSTATE 40001.",
  "h": "istilah/serializable/",
  "n": "2.12 Isolation level",
  "s": "istilah-serializable",
  "t": "Serializable",
  "u": "tahap-2/isolation-level/"
 },
 "Serialization anomaly": {
  "b": "t2-isolation-level",
  "d": "Anomali: hasil beberapa transaction yang berjalan bersamaan tidak sama dengan hasil menjalankannya satu per satu dalam urutan mana pun.",
  "n": "2.12 Isolation level",
  "s": "istilah-serialization-anomaly",
  "t": "Serialization anomaly",
  "u": "tahap-2/isolation-level/"
 },
 "Sharding": {
  "b": "D2",
  "d": "Membagi data ke beberapa database berdasarkan shard key, mis. per wilayah.",
  "n": "5.1 Scaling",
  "s": "istilah-sharding",
  "t": "Sharding",
  "u": "d-system-design/d2-scaling/"
 },
 "Signature": {
  "b": "B5.1",
  "d": "Nilai hasil perhitungan kriptografi atas data dan secret, untuk membuktikan data tidak diubah.",
  "n": "1.27 Authentication",
  "s": "istilah-signature",
  "t": "Signature",
  "u": "tahap-1/authentication/"
 },
 "Signed URL": {
  "b": "B11.2",
  "d": "URL berbatas waktu yang memberi akses langsung ke satu file di object storage.",
  "n": "4.2 Proxy dan BFF",
  "s": "istilah-signed-url",
  "t": "Signed URL",
  "u": "b-fondasi/b11-2-proxy-bff/"
 },
 "Snapshot": {
  "b": "t2-isolation-level",
  "d": "Gambaran data pada satu saat, misalnya isi database yang dilihat satu query atau transaction, dan saldo akhir periode yang disimpan supaya tidak dijumlah ulang.",
  "h": "istilah/snapshot/",
  "n": "2.12 Isolation level",
  "s": "istilah-snapshot",
  "t": "Snapshot",
  "u": "tahap-2/isolation-level/"
 },
 "Source of truth": {
  "b": "A1",
  "d": "Satu tempat yang isinya dianggap benar ketika salinan lain berbeda, mis. database backend untuk saldo; cache dan data di HP hanya salinan.",
  "n": "1.3 Apa yang dikerjakan backend",
  "s": "istilah-source-of-truth",
  "t": "Source of truth",
  "u": "tahap-1/apa-yang-dikerjakan-backend/"
 },
 "Stale": {
  "b": "B9",
  "d": "Data yang sudah tidak terbaru, mis. harga lama yang masih tersimpan di cache.",
  "n": "3.6 Caching dan invalidation",
  "s": "istilah-stale",
  "t": "Stale",
  "u": "b-fondasi/b9-caching/"
 },
 "Stateless": {
  "b": "D2",
  "d": "Server tidak menyimpan keadaan antar-request di memorinya, jadi request mana pun bisa dilayani instance mana pun.",
  "n": "5.1 Scaling",
  "s": "istilah-stateless",
  "t": "Stateless",
  "u": "d-system-design/d2-scaling/"
 },
 "Status code": {
  "b": "B1.1",
  "d": "Angka tiga digit di response yang menyatakan hasil request, mis. 201 berhasil dibuat atau 401 belum login.",
  "n": "1.16 HTTP",
  "s": "istilah-status-code",
  "t": "Status code",
  "u": "tahap-1/http/"
 },
 "TTL": {
  "b": "B9",
  "d": "Masa berlaku sebuah data di cache sebelum dianggap kedaluwarsa.",
  "n": "3.6 Caching dan invalidation",
  "s": "istilah-ttl",
  "t": "TTL (Time To Live)",
  "u": "b-fondasi/b9-caching/"
 },
 "Throughput": {
  "b": "C2",
  "d": "Jumlah pekerjaan yang selesai per satuan waktu, mis. request per detik.",
  "n": "3.1 Observability",
  "s": "istilah-throughput",
  "t": "Throughput",
  "u": "c-operasional/c2-observability/"
 },
 "Time To Live": {
  "b": "B9",
  "d": "Masa berlaku sebuah data di cache sebelum dianggap kedaluwarsa.",
  "n": "3.6 Caching dan invalidation",
  "s": "istilah-ttl",
  "t": "TTL (Time To Live)",
  "u": "b-fondasi/b9-caching/"
 },
 "Timeout": {
  "b": "B11",
  "d": "Batas waktu menunggu sebelum sebuah panggilan dianggap gagal.",
  "n": "4.1 Integrasi pihak ketiga",
  "s": "istilah-timeout",
  "t": "Timeout",
  "u": "b-fondasi/b11-integrasi-pihak-ketiga/"
 },
 "Token": {
  "b": "B5.1",
  "d": "String yang dibawa request sebagai bukti siapa pengirimnya, mis. token login di header Authorization; siapa pun yang memegangnya bisa memakainya. Di token bucket, token berarti satu jatah request.",
  "n": "1.27 Authentication",
  "s": "istilah-token",
  "t": "Token",
  "u": "tahap-1/authentication/"
 },
 "Token bucket": {
  "b": "C4",
  "d": "Algoritma rate limit: setiap key (IP atau akun) punya bucket berisi token yang terisi ulang dengan laju tetap, dan setiap request memakai satu token.",
  "n": "3.7 Security dasar dan rate limit",
  "s": "istilah-token-bucket",
  "t": "Token bucket",
  "u": "c-operasional/c4-security-dasar/"
 },
 "Trace": {
  "b": "C2",
  "d": "Rekaman perjalanan satu request melewati beberapa komponen, lengkap dengan durasi tiap bagian.",
  "n": "3.1 Observability",
  "s": "istilah-trace",
  "t": "Trace",
  "u": "c-operasional/c2-observability/"
 },
 "Trade-off": {
  "b": "D1",
  "d": "Pilihan yang memberi satu kelebihan dengan membayar satu kekurangan.",
  "n": "1.38 Kerangka berpikir dan estimasi",
  "s": "istilah-trade-off",
  "t": "Trade-off",
  "u": "tahap-1/kerangka-estimasi/"
 },
 "Transaction": {
  "b": "B3.1",
  "d": "Sekelompok perintah database yang berhasil semua atau batal semua.",
  "n": "1.23 Transaction",
  "s": "istilah-transaction",
  "t": "Transaction",
  "u": "tahap-1/transaction/"
 },
 "Tutup buku": {
  "b": "t2-tutup-buku",
  "d": "Pemeriksaan akhir periode: untuk setiap buku, saldo awal ditambah mutasi harus sama dengan saldo akhir, dan seluruh jurnal harus seimbang.",
  "h": "istilah/tutup-buku/",
  "n": "2.4 Fitur tutup buku",
  "s": "istilah-tutup-buku",
  "t": "Tutup buku",
  "u": "tahap-2/fitur-tutup-buku/"
 },
 "WAL": {
  "b": "D3",
  "d": "Log perubahan yang ditulis PostgreSQL sebelum data diubah. Replica menyalin perubahan dengan membaca WAL dari primary.",
  "n": "5.2 Replica dan consistency",
  "s": "istilah-wal",
  "t": "WAL (Write-Ahead Log)",
  "u": "d-system-design/d3-consistency/"
 },
 "WebSocket": {
  "b": "E4",
  "d": "Koneksi dua arah yang tetap terbuka antara app dan server.",
  "n": "3.5 Push dan real-time",
  "s": "istilah-websocket",
  "t": "WebSocket",
  "u": "e-mobile/e4-push-real-time/"
 },
 "Webhook": {
  "b": "B10.2",
  "d": "HTTP request yang dikirim sistem lain ke API kita saat ada kejadian, mis. pembayaran berhasil.",
  "n": "4.3 Webhook dan outbox",
  "s": "istilah-webhook",
  "t": "Webhook",
  "u": "b-fondasi/b10-2-webhook-outbox/"
 },
 "Worker": {
  "b": "B10.1",
  "d": "Proses terpisah yang mengambil pekerjaan dari queue dan mengerjakannya di luar jalur request. Di server web seperti WSGI, worker juga berarti satu proses yang melayani request.",
  "n": "3.3 Background job, queue, retry",
  "s": "istilah-worker",
  "t": "Worker",
  "u": "b-fondasi/b10-1-background-job/"
 },
 "at-least-once": {
  "b": "B10.1",
  "d": "Jaminan pengiriman: setiap pesan sampai minimal sekali, jadi bisa sampai dua kali dan penerimanya harus tahan pesan ganda.",
  "h": "istilah/at-least-once/",
  "n": "3.3 Background job, queue, retry",
  "s": "istilah-at-least-once",
  "t": "At-least-once",
  "u": "b-fondasi/b10-1-background-job/"
 },
 "atomicity": {
  "b": "B3.1",
  "d": "Jaminan bahwa semua perubahan dalam satu transaction terjadi seluruhnya atau tidak sama sekali.",
  "n": "1.23 Transaction",
  "s": "istilah-atomicity",
  "t": "Atomicity",
  "u": "tahap-1/transaction/"
 },
 "auth": {
  "b": "B5.1",
  "d": "Proses memastikan siapa yang mengirim request, mis. lewat token login.",
  "n": "1.27 Authentication",
  "s": "istilah-authentication",
  "t": "Authentication",
  "u": "tahap-1/authentication/"
 },
 "authentication": {
  "b": "B5.1",
  "d": "Proses memastikan siapa yang mengirim request, mis. lewat token login.",
  "n": "1.27 Authentication",
  "s": "istilah-authentication",
  "t": "Authentication",
  "u": "tahap-1/authentication/"
 },
 "authorization": {
  "b": "B5.3",
  "d": "Proses memastikan user yang sudah dikenal boleh melakukan aksi itu pada data itu.",
  "n": "1.28 Authorization",
  "s": "istilah-authorization",
  "t": "Authorization",
  "u": "tahap-1/authorization/"
 },
 "backfill": {
  "b": "B4.2",
  "d": "Script sekali jalan yang mengisi kolom baru untuk baris lama, biasanya bertahap per batch.",
  "n": "2.22 Ubah skema tanpa downtime",
  "s": "istilah-backfill",
  "t": "Backfill",
  "u": "b-fondasi/b4-2-ubah-skema-tanpa-downtime/"
 },
 "backoff": {
  "b": "t2-idempotency",
  "d": "Jeda yang makin panjang di antara percobaan ulang, ditambah keacakan (jitter) supaya banyak app tidak mengulang di detik yang sama.",
  "h": "istilah/backoff/",
  "n": "2.14 Retry dan idempotency key",
  "s": "istilah-backoff",
  "t": "Backoff",
  "u": "tahap-2/retry-idempotency/"
 },
 "buku ledger": {
  "b": "t2-ledger",
  "d": "Satu tempat uang dicatat di ledger: milik satu karyawan, satu warung, atau sistem seperti tunjangan; saldonya adalah jumlah posting-nya.",
  "h": "istilah/buku-ledger/",
  "n": "2.7 Ledger double-entry",
  "s": "istilah-buku-ledger",
  "t": "Buku ledger",
  "u": "tahap-2/ledger/"
 },
 "cache": {
  "b": "B9",
  "d": "Salinan data di tempat yang lebih cepat dibaca, dengan risiko isinya tertinggal dari data asli.",
  "n": "3.6 Caching dan invalidation",
  "s": "istilah-cache",
  "t": "Cache",
  "u": "b-fondasi/b9-caching/"
 },
 "circuit breaker": {
  "b": "B11",
  "d": "Mekanisme yang berhenti memanggil layanan yang sedang gagal untuk sementara, lalu mencoba lagi setelah jeda.",
  "n": "4.1 Integrasi pihak ketiga",
  "s": "istilah-circuit-breaker",
  "t": "Circuit breaker",
  "u": "b-fondasi/b11-integrasi-pihak-ketiga/"
 },
 "connection pool": {
  "b": "B2.5",
  "d": "Sekumpulan koneksi database yang dibuka sekali lalu dipinjamkan bergantian ke request.",
  "n": "3.2 Connection pool",
  "s": "istilah-connection-pool",
  "t": "Connection pool",
  "u": "b-fondasi/b2-5-connection-pool/"
 },
 "constraint": {
  "b": "B2.1",
  "d": "Aturan yang dipaksakan database pada data, mis. UNIQUE, CHECK, atau NOT NULL.",
  "n": "1.12 Data modeling dan relasi",
  "s": "istilah-constraint",
  "t": "Constraint",
  "u": "tahap-1/data-modeling/"
 },
 "container": {
  "b": "C3",
  "d": "Paket aplikasi beserta semua dependensinya yang berjalan dengan cara sama di laptop maupun server.",
  "n": "1.31 Deployment dan rollback",
  "s": "istilah-container",
  "t": "Container",
  "u": "tahap-1/deployment-rollback/"
 },
 "database": {
  "b": "B2.1",
  "d": "Program yang menyimpan data secara permanen dan menjamin aturan seperti constraint dan transaction.",
  "n": "1.12 Data modeling dan relasi",
  "s": "istilah-database",
  "t": "Database",
  "u": "tahap-1/data-modeling/"
 },
 "dead-letter queue": {
  "b": "B10.1",
  "d": "Tempat job yang terus gagal setelah batas retry, supaya bisa diperiksa manusia dan tidak diulang selamanya.",
  "n": "3.3 Background job, queue, retry",
  "s": "istilah-dead-letter-queue",
  "t": "Dead-letter queue",
  "u": "b-fondasi/b10-1-background-job/"
 },
 "deadlock": {
  "b": "t2-race-lock",
  "d": "Dua transaction saling menunggu lock milik yang lain, sehingga database harus membatalkan salah satunya.",
  "h": "istilah/deadlock/",
  "n": "2.11 Race condition",
  "s": "istilah-deadlock",
  "t": "Deadlock",
  "u": "tahap-2/race-lock/"
 },
 "debit": {
  "b": "t2-ledger",
  "d": "Sisi kiri sebuah jurnal akuntansi; di setiap jurnal total debit sama dengan total kredit, dan akun aset bertambah di sisi debit.",
  "h": "istilah/debit/",
  "n": "2.7 Ledger double-entry",
  "s": "istilah-debit",
  "t": "Debit",
  "u": "tahap-2/ledger/"
 },
 "double-entry": {
  "b": "t2-ledger",
  "d": "Cara mencatat uang di dua sisi atau lebih: setiap rupiah yang keluar dari satu buku masuk ke buku lain, jadi jumlah catatan satu kejadian selalu nol.",
  "h": "istilah/double-entry/",
  "n": "2.7 Ledger double-entry",
  "s": "istilah-double-entry",
  "t": "Double-entry",
  "u": "tahap-2/ledger/"
 },
 "eager loading": {
  "b": "t2-n-plus-1",
  "d": "Memuat data berelasi bersama query induknya, supaya mengakses relasi di dalam loop tidak mengirim query baru.",
  "h": "istilah/eager-loading/",
  "n": "2.16 N+1 query",
  "s": "istilah-eager-loading",
  "t": "Eager loading",
  "u": "tahap-2/n-plus-1/"
 },
 "endpoint": {
  "b": "B1.1",
  "d": "Pasangan method dan path yang dilayani server, mis. POST /transfers.",
  "n": "1.16 HTTP",
  "s": "istilah-endpoint",
  "t": "Endpoint",
  "u": "tahap-1/http/"
 },
 "enumerasi": {
  "b": "t1-idor",
  "d": "Mencoba nilai satu per satu, mis. ID akun 401 sampai 503 atau daftar email, untuk mengetahui data mana yang ada.",
  "n": "1.29 IDOR, enumerasi, dan token di app",
  "s": "istilah-enumerasi",
  "t": "Enumerasi",
  "u": "tahap-1/idor-token-app/"
 },
 "event sourcing": {
  "b": "t2-adr-ledger",
  "d": "Menyimpan setiap perubahan data sebagai event yang tidak diubah; keadaan sekarang dibangun ulang dari urutan event itu.",
  "h": "istilah/event-sourcing/",
  "n": "2.8 ADR 6 direvisi",
  "s": "istilah-event-sourcing",
  "t": "Event sourcing",
  "u": "tahap-2/adr-ledger/"
 },
 "eventual consistency": {
  "b": "D3",
  "d": "Data di beberapa tempat boleh berbeda sesaat, tapi akan sama setelah perubahan selesai menyebar.",
  "n": "5.2 Replica dan consistency",
  "s": "istilah-eventual-consistency",
  "t": "Eventual consistency",
  "u": "d-system-design/d3-consistency/"
 },
 "expand-migrate-contract": {
  "b": "E1",
  "d": "Urutan mengubah skema tanpa downtime: tambah yang baru, pindahkan data dan kode, baru hapus yang lama.",
  "n": "1.33 App versi lama",
  "s": "istilah-expand-migrate-contract",
  "t": "Expand-migrate-contract",
  "u": "tahap-1/app-versi-lama/"
 },
 "fan-out": {
  "b": "D4b",
  "d": "Menyebarkan satu kejadian ke banyak penerima, mis. satu promo ditulis ke feed setiap pengikut.",
  "n": "5.3 Feed dan notifikasi",
  "s": "istilah-fan-out",
  "t": "Fan-out",
  "u": "d-system-design/d4b-feed-notifikasi/"
 },
 "foreign key": {
  "b": "B2.1",
  "d": "Kolom yang menunjuk primary key tabel lain, dan database menjamin rujukannya ada.",
  "n": "1.12 Data modeling dan relasi",
  "s": "istilah-foreign-key",
  "t": "Foreign key",
  "u": "tahap-1/data-modeling/"
 },
 "handler": {
  "b": "A2",
  "d": "Fungsi di server yang menerima satu request, memeriksa formatnya, lalu memanggil logika bisnis.",
  "n": "1.5 Perjalanan satu request",
  "s": "istilah-handler",
  "t": "Handler",
  "u": "tahap-1/perjalanan-request/"
 },
 "header": {
  "b": "B1.1",
  "d": "Pasangan nama-nilai di request atau response yang membawa informasi tambahan, mis. token atau tipe konten.",
  "n": "1.16 HTTP",
  "s": "istilah-header",
  "t": "Header",
  "u": "tahap-1/http/"
 },
 "idempotency key": {
  "b": "t2-idempotency",
  "d": "Nilai unik yang dibuat app untuk satu aksi, mis. satu kali tekan Bayar, dan dikirim ulang di setiap retry, supaya server mengenali kiriman ulang dan tidak menjalankannya dua kali.",
  "h": "istilah/idempotency-key/",
  "n": "2.14 Retry dan idempotency key",
  "s": "istilah-idempotency-key",
  "t": "Idempotency key",
  "u": "tahap-2/retry-idempotency/"
 },
 "idempotent": {
  "b": "t2-kursor",
  "d": "Sifat operasi yang hasil akhirnya sama walau dijalankan sekali atau berkali-kali.",
  "n": "2.19 Pagination kursor",
  "s": "istilah-idempotent",
  "t": "Idempotent",
  "u": "tahap-2/pagination-kursor/"
 },
 "invarian": {
  "b": "C1",
  "d": "Aturan yang harus selalu benar apa pun yang terjadi, mis. transfer tidak mengubah total saldo semua akun.",
  "h": "istilah/invarian/",
  "n": "1.32 Testing",
  "s": "istilah-invarian",
  "t": "Invarian",
  "u": "tahap-1/testing/"
 },
 "isolation level": {
  "b": "t2-isolation-level",
  "d": "Seberapa banyak perubahan dari transaction lain yang boleh terlihat oleh satu transaction yang sedang berjalan.",
  "h": "istilah/isolation-level/",
  "n": "2.12 Isolation level",
  "s": "istilah-isolation-level",
  "t": "Isolation level",
  "u": "tahap-2/isolation-level/"
 },
 "job terjadwal": {
  "b": "t2-pencairan",
  "d": "Program di server yang dijalankan jadwal, bukan request user, mis. pencairan warung setiap Jumat 15.00.",
  "h": "istilah/job-terjadwal/",
  "n": "2.5 Fitur pencairan",
  "s": "istilah-job-terjadwal",
  "t": "Job terjadwal",
  "u": "tahap-2/fitur-pencairan/"
 },
 "jurnal": {
  "b": "t2-ledger",
  "d": "Catatan satu kejadian yang memindahkan uang, berisi dua posting atau lebih (satu baris uang per buku) yang jumlahnya selalu nol.",
  "h": "istilah/jurnal/",
  "n": "2.7 Ledger double-entry",
  "s": "istilah-jurnal",
  "t": "Jurnal",
  "u": "tahap-2/ledger/"
 },
 "kredit": {
  "b": "t2-ledger",
  "d": "Sisi kanan sebuah jurnal akuntansi; di setiap jurnal total kredit sama dengan total debit, dan akun kewajiban bertambah di sisi kredit.",
  "h": "istilah/kredit/",
  "n": "2.7 Ledger double-entry",
  "s": "istilah-kredit",
  "t": "Kredit",
  "u": "tahap-2/ledger/"
 },
 "latency": {
  "b": "C2",
  "d": "Lama waktu satu request dari dikirim sampai response diterima.",
  "n": "3.1 Observability",
  "s": "istilah-latency",
  "t": "Latency",
  "u": "c-operasional/c2-observability/"
 },
 "lazy loading": {
  "b": "t2-n-plus-1",
  "d": "Memuat data berelasi baru saat kode pertama kali mengaksesnya, dengan satu query setiap akses.",
  "h": "istilah/lazy-loading/",
  "n": "2.16 N+1 query",
  "s": "istilah-lazy-loading",
  "t": "Lazy loading",
  "u": "tahap-2/n-plus-1/"
 },
 "lease": {
  "b": "B10.1",
  "d": "Batas waktu satu pekerjaan di queue dipegang satu worker. Kalau worker mati sebelum selesai, pekerjaan diberikan ke worker lain setelah lease habis.",
  "n": "3.3 Background job, queue, retry",
  "s": "istilah-lease",
  "t": "Lease",
  "u": "b-fondasi/b10-1-background-job/"
 },
 "ledger": {
  "b": "t2-saldo-bukan-kolom",
  "d": "Cara mencatat uang dengan menyimpan setiap perpindahan sebagai baris yang tidak diubah; saldo adalah jumlah baris itu, bukan angka yang ditimpa.",
  "h": "istilah/ledger/",
  "n": "2.6 Kenapa saldo bukan kolom",
  "s": "istilah-ledger",
  "t": "Ledger",
  "u": "tahap-2/saldo-bukan-kolom/"
 },
 "load balancer": {
  "b": "D2",
  "d": "Komponen yang membagi request ke beberapa instance server yang sama.",
  "n": "5.1 Scaling",
  "s": "istilah-load-balancer",
  "t": "Load balancer",
  "u": "d-system-design/d2-scaling/"
 },
 "lock": {
  "b": "t2-race-lock",
  "d": "Tanda di database bahwa satu transaction sedang memakai baris atau tabel, sehingga transaction lain harus menunggu.",
  "h": "istilah/lock/",
  "n": "2.11 Race condition",
  "s": "istilah-lock",
  "t": "Lock",
  "u": "tahap-2/race-lock/"
 },
 "log": {
  "b": "C2",
  "d": "Catatan kejadian per request atau per peristiwa, ditulis aplikasi untuk dibaca saat menyelidiki masalah.",
  "n": "3.1 Observability",
  "s": "istilah-log",
  "t": "Log",
  "u": "c-operasional/c2-observability/"
 },
 "lost update": {
  "b": "t2-race-lock",
  "d": "Perubahan yang hilang karena dua transaction membaca nilai lama yang sama lalu saling menimpa.",
  "n": "2.11 Race condition",
  "s": "istilah-lost-update",
  "t": "Lost update",
  "u": "tahap-2/race-lock/"
 },
 "metode idempoten": {
  "b": "t2-kursor",
  "d": "Metode HTTP yang efeknya di server sama untuk satu request atau banyak request identik: PUT, DELETE, dan semua metode safe seperti GET.",
  "h": "istilah/metode-idempoten/",
  "n": "2.19 Pagination kursor",
  "s": "istilah-metode-idempoten",
  "t": "Metode idempoten",
  "u": "tahap-2/pagination-kursor/"
 },
 "metric": {
  "b": "C2",
  "d": "Angka yang dihitung terus-menerus, mis. jumlah request per detik atau persentase error.",
  "n": "3.1 Observability",
  "s": "istilah-metric",
  "t": "Metric",
  "u": "c-operasional/c2-observability/"
 },
 "microservice": {
  "b": "B7.2",
  "d": "Gaya arsitektur yang memecah backend jadi beberapa service kecil yang di-deploy terpisah dan saling memanggil lewat jaringan.",
  "n": "4.5 Modular monolith",
  "s": "istilah-microservice",
  "t": "Microservice",
  "u": "b-fondasi/b7-2-batas-modul/"
 },
 "middleware": {
  "b": "B7.1",
  "d": "Fungsi yang dijalankan sebelum atau sesudah semua handler, mis. pemeriksa token atau pencatat log.",
  "n": "1.21 Lapisan dasar",
  "s": "istilah-middleware",
  "t": "Middleware",
  "u": "tahap-1/lapisan-dasar/"
 },
 "migration": {
  "b": "B4.1",
  "d": "File berurutan yang mengubah skema database, disimpan dan direview seperti kode.",
  "n": "1.25 Migration",
  "s": "istilah-migration",
  "t": "Migration",
  "u": "tahap-1/migration/"
 },
 "modular monolith": {
  "b": "B7.2",
  "d": "Satu aplikasi yang di-deploy sebagai satu unit, tapi kodenya dibagi ke modul dengan batas yang tegas.",
  "n": "4.5 Modular monolith",
  "s": "istilah-modular-monolith",
  "t": "Modular monolith",
  "u": "b-fondasi/b7-2-batas-modul/"
 },
 "monolith": {
  "b": "A1",
  "d": "Satu aplikasi backend yang memuat semua fitur dan di-deploy sebagai satu unit.",
  "n": "1.3 Apa yang dikerjakan backend",
  "s": "istilah-monolith",
  "t": "Monolith",
  "u": "tahap-1/apa-yang-dikerjakan-backend/"
 },
 "n+1 query": {
  "b": "t2-n-plus-1",
  "d": "Pola satu query untuk daftar lalu satu query lagi untuk setiap item di daftar itu.",
  "h": "istilah/n-1-query/",
  "n": "2.16 N+1 query",
  "s": "istilah-n-1-query",
  "t": "N+1 query",
  "u": "tahap-2/n-plus-1/"
 },
 "nonrepeatable read": {
  "b": "t2-isolation-level",
  "d": "Anomali: baris yang sama dibaca dua kali dalam satu transaction dan nilainya berbeda, karena transaction lain sudah commit perubahan.",
  "n": "2.12 Isolation level",
  "s": "istilah-nonrepeatable-read",
  "t": "Nonrepeatable read",
  "u": "tahap-2/isolation-level/"
 },
 "object storage": {
  "b": "B11.2",
  "d": "Layanan penyimpanan file besar per objek, diakses lewat HTTP, mis. layanan kompatibel S3.",
  "n": "4.2 Proxy dan BFF",
  "s": "istilah-object-storage",
  "t": "Object storage",
  "u": "b-fondasi/b11-2-proxy-bff/"
 },
 "offline-first": {
  "b": "E2",
  "d": "Desain app yang menyimpan perubahan di HP dulu, lalu menyinkronkannya ke server saat sinyal ada.",
  "n": "3.8 Offline-first dan sync",
  "s": "istilah-offline-first",
  "t": "Offline-first",
  "u": "e-mobile/e2-offline-first/"
 },
 "optimistic lock": {
  "b": "t2-race-lock",
  "d": "Cara mencegah lost update dengan mengecek nomor versi saat menulis, tanpa mengunci baris saat membaca.",
  "h": "istilah/optimistic-lock/",
  "n": "2.11 Race condition",
  "s": "istilah-optimistic-lock",
  "t": "Optimistic lock",
  "u": "tahap-2/race-lock/"
 },
 "outbox": {
  "b": "B10.2",
  "d": "Tabel tempat event ditulis dalam transaction yang sama dengan perubahan data, lalu dikirim oleh worker.",
  "n": "4.3 Webhook dan outbox",
  "s": "istilah-outbox",
  "t": "Outbox",
  "u": "b-fondasi/b10-2-webhook-outbox/"
 },
 "p50": {
  "b": "C2",
  "d": "Persentil latency: 95% request selesai lebih cepat dari angka p95, dan separuh request lebih cepat dari p50 (median).",
  "n": "3.1 Observability",
  "s": "istilah-p95-p50",
  "t": "p95 / p50",
  "u": "c-operasional/c2-observability/"
 },
 "p95": {
  "b": "C2",
  "d": "Persentil latency: 95% request selesai lebih cepat dari angka p95, dan separuh request lebih cepat dari p50 (median).",
  "n": "3.1 Observability",
  "s": "istilah-p95-p50",
  "t": "p95 / p50",
  "u": "c-operasional/c2-observability/"
 },
 "pagination": {
  "b": "t2-kursor",
  "d": "Membagi daftar panjang menjadi potongan kecil yang diminta satu per satu.",
  "h": "istilah/pagination/",
  "n": "2.19 Pagination kursor",
  "s": "istilah-pagination",
  "t": "Pagination",
  "u": "tahap-2/pagination-kursor/"
 },
 "pagination kursor": {
  "b": "t2-kursor",
  "d": "Pagination yang meminta baris sesudah nilai urutan baris terakhir yang sudah tampil, bukan halaman ke-N, jadi tetap stabil saat baris baru masuk.",
  "h": "istilah/pagination-kursor/",
  "n": "2.19 Pagination kursor",
  "s": "istilah-pagination-kursor",
  "t": "Pagination kursor (keyset)",
  "u": "tahap-2/pagination-kursor/"
 },
 "partisi": {
  "b": "D2",
  "d": "Membagi satu tabel besar jadi beberapa partisi di database yang sama, mis. per bulan, supaya query dan arsip hanya menyentuh sebagian data.",
  "n": "5.1 Scaling",
  "s": "istilah-partitioning",
  "t": "Partitioning",
  "u": "d-system-design/d2-scaling/"
 },
 "partitioning": {
  "b": "D2",
  "d": "Membagi satu tabel besar jadi beberapa partisi di database yang sama, mis. per bulan, supaya query dan arsip hanya menyentuh sebagian data.",
  "n": "5.1 Scaling",
  "s": "istilah-partitioning",
  "t": "Partitioning",
  "u": "d-system-design/d2-scaling/"
 },
 "payload": {
  "b": "E5",
  "d": "Isi data yang dikirim di body request atau response, biasanya JSON.",
  "n": "2.20 Ukuran payload dan kuota HP",
  "s": "istilah-payload",
  "t": "Payload",
  "u": "e-mobile/e5-ukuran-payload/"
 },
 "phantom read": {
  "b": "t2-isolation-level",
  "d": "Anomali: query yang sama dalam satu transaction mengembalikan kumpulan baris berbeda, karena transaction lain menambah atau menghapus baris.",
  "n": "2.12 Isolation level",
  "s": "istilah-phantom-read",
  "t": "Phantom read",
  "u": "tahap-2/isolation-level/"
 },
 "polling": {
  "b": "E4",
  "d": "App menanyakan status ke server berulang kali dengan jeda tetap.",
  "n": "3.5 Push dan real-time",
  "s": "istilah-polling",
  "t": "Polling",
  "u": "e-mobile/e4-push-real-time/"
 },
 "posting": {
  "b": "t2-ledger",
  "d": "Satu baris uang di dalam jurnal untuk satu buku: negatif bila uang keluar, positif bila masuk; saldo buku adalah jumlah posting-nya.",
  "h": "istilah/posting/",
  "n": "2.7 Ledger double-entry",
  "s": "istilah-posting",
  "t": "Posting",
  "u": "tahap-2/ledger/"
 },
 "primary": {
  "b": "D3",
  "d": "Database utama yang menerima semua perintah tulis; replica menyalin perubahan dari primary.",
  "n": "5.2 Replica dan consistency",
  "s": "istilah-primary",
  "t": "Primary",
  "u": "d-system-design/d3-consistency/"
 },
 "primary key": {
  "b": "B2.1",
  "d": "Kolom yang nilainya unik dan dipakai untuk mengenali satu baris.",
  "n": "1.12 Data modeling dan relasi",
  "s": "istilah-primary-key",
  "t": "Primary key",
  "u": "tahap-1/data-modeling/"
 },
 "proxy": {
  "b": "B11.2",
  "d": "Program perantara yang meneruskan request antara client dan server. Proxy milik backend menambahkan hal yang tidak boleh dipegang client, mis. credential; proxy di laptop penguji dipakai untuk melihat dan mengubah request.",
  "n": "4.2 Proxy dan BFF",
  "s": "istilah-proxy",
  "t": "Proxy",
  "u": "b-fondasi/b11-2-proxy-bff/"
 },
 "query plan": {
  "b": "t2-index",
  "d": "Rencana langkah yang dipilih database untuk menjalankan satu query, dilihat dengan EXPLAIN.",
  "h": "istilah/query-plan/",
  "n": "2.17 Index dan query plan",
  "s": "istilah-query-plan",
  "t": "Query plan",
  "u": "tahap-2/index-query-plan/"
 },
 "queue": {
  "b": "B10.1",
  "d": "Daftar pekerjaan yang menunggu diproses oleh worker, satu per satu atau paralel.",
  "n": "3.3 Background job, queue, retry",
  "s": "istilah-queue",
  "t": "Queue",
  "u": "b-fondasi/b10-1-background-job/"
 },
 "race condition": {
  "b": "t2-race-lock",
  "d": "Hasil yang bergantung pada urutan dua proses yang berjalan bersamaan.",
  "h": "istilah/race-condition/",
  "n": "2.11 Race condition",
  "s": "istilah-race-condition",
  "t": "Race condition",
  "u": "tahap-2/race-lock/"
 },
 "rate limit": {
  "b": "C4",
  "d": "Batas jumlah request per waktu dari satu sumber, mis. lima percobaan login per menit.",
  "n": "3.7 Security dasar dan rate limit",
  "s": "istilah-rate-limit",
  "t": "Rate limit",
  "u": "c-operasional/c4-security-dasar/"
 },
 "read replica": {
  "b": "D2",
  "d": "Salinan database yang hanya melayani baca dan selalu sedikit tertinggal dari database utama.",
  "n": "5.1 Scaling",
  "s": "istilah-read-replica",
  "t": "Read replica",
  "u": "d-system-design/d2-scaling/"
 },
 "read-your-writes": {
  "b": "D3",
  "d": "Jaminan bahwa user langsung melihat perubahan yang baru ditulisnya, walau bacaan biasa dilayani replica yang tertinggal.",
  "n": "5.2 Replica dan consistency",
  "s": "istilah-read-your-writes",
  "t": "Read-your-writes",
  "u": "d-system-design/d3-consistency/"
 },
 "replication lag": {
  "b": "D3",
  "d": "Jeda antara perubahan di database utama dan munculnya perubahan itu di replica.",
  "n": "5.2 Replica dan consistency",
  "s": "istilah-replication-lag",
  "t": "Replication lag",
  "u": "d-system-design/d3-consistency/"
 },
 "retry": {
  "b": "t2-idempotency",
  "d": "Mengirim ulang request yang gagal atau tidak dijawab.",
  "h": "istilah/retry/",
  "n": "2.14 Retry dan idempotency key",
  "s": "istilah-retry",
  "t": "Retry",
  "u": "tahap-2/retry-idempotency/"
 },
 "reverse proxy": {
  "b": "B11.2",
  "d": "Server di depan aplikasi yang menerima request dari internet lalu meneruskannya, sambil mengurus hal bersama seperti TLS dan kompresi.",
  "n": "4.2 Proxy dan BFF",
  "s": "istilah-reverse-proxy",
  "t": "Reverse proxy",
  "u": "b-fondasi/b11-2-proxy-bff/"
 },
 "rolling deploy": {
  "b": "C3",
  "d": "Mengganti instance satu per satu, supaya selalu ada instance yang melayani request.",
  "n": "1.31 Deployment dan rollback",
  "s": "istilah-rolling-deploy",
  "t": "Rolling deploy",
  "u": "tahap-1/deployment-rollback/"
 },
 "round trip": {
  "b": "B11.2",
  "d": "Satu kali bolak-balik request dan response antara app dan server. Di jaringan seluler, setiap round trip menambah latency.",
  "n": "4.2 Proxy dan BFF",
  "s": "istilah-round-trip",
  "t": "Round trip",
  "u": "b-fondasi/b11-2-proxy-bff/"
 },
 "router": {
  "b": "B1.1",
  "d": "Bagian framework yang mencocokkan method dan path request dengan handler yang tepat.",
  "n": "1.16 HTTP",
  "s": "istilah-router",
  "t": "Router",
  "u": "tahap-1/http/"
 },
 "saga": {
  "b": "D3",
  "d": "Pola untuk proses yang melewati beberapa service: setiap langkah punya transaction sendiri, dan kegagalan dibatalkan dengan langkah kompensasi.",
  "n": "5.2 Replica dan consistency",
  "s": "istilah-saga",
  "t": "Saga",
  "u": "d-system-design/d3-consistency/"
 },
 "saldo cache": {
  "b": "t2-saldo-bukan-kolom",
  "d": "Salinan jumlah posting satu buku di kolom buku.saldo_cache, dibaca app supaya cepat dan dicek tiap malam terhadap jumlah posting.",
  "h": "istilah/saldo-cache/",
  "n": "2.6 Kenapa saldo bukan kolom",
  "s": "istilah-saldo-cache",
  "t": "Saldo cache",
  "u": "tahap-2/saldo-bukan-kolom/"
 },
 "secure storage": {
  "b": "t1-idor",
  "d": "Penyimpanan terenkripsi milik sistem operasi HP untuk rahasia kecil seperti token sesi: Keychain di iOS, kunci di Android Keystore.",
  "n": "1.29 IDOR, enumerasi, dan token di app",
  "s": "istilah-secure-storage",
  "t": "Secure storage",
  "u": "tahap-1/idor-token-app/"
 },
 "semaphore": {
  "b": "B8",
  "d": "Penghitung yang membatasi berapa pekerjaan boleh berjalan bersamaan; pekerjaan berikutnya menunggu sampai ada yang selesai.",
  "n": "3.4 Concurrency dan async",
  "s": "istilah-semaphore",
  "t": "Semaphore",
  "u": "b-fondasi/b8-concurrency/"
 },
 "serializable": {
  "b": "t2-isolation-level",
  "d": "Isolation level paling ketat: hasil transaction bersamaan harus sama dengan menjalankannya satu per satu; yang melanggar ditolak SQLSTATE 40001.",
  "h": "istilah/serializable/",
  "n": "2.12 Isolation level",
  "s": "istilah-serializable",
  "t": "Serializable",
  "u": "tahap-2/isolation-level/"
 },
 "serialization anomaly": {
  "b": "t2-isolation-level",
  "d": "Anomali: hasil beberapa transaction yang berjalan bersamaan tidak sama dengan hasil menjalankannya satu per satu dalam urutan mana pun.",
  "n": "2.12 Isolation level",
  "s": "istilah-serialization-anomaly",
  "t": "Serialization anomaly",
  "u": "tahap-2/isolation-level/"
 },
 "sharding": {
  "b": "D2",
  "d": "Membagi data ke beberapa database berdasarkan shard key, mis. per wilayah.",
  "n": "5.1 Scaling",
  "s": "istilah-sharding",
  "t": "Sharding",
  "u": "d-system-design/d2-scaling/"
 },
 "signature": {
  "b": "B5.1",
  "d": "Nilai hasil perhitungan kriptografi atas data dan secret, untuk membuktikan data tidak diubah.",
  "n": "1.27 Authentication",
  "s": "istilah-signature",
  "t": "Signature",
  "u": "tahap-1/authentication/"
 },
 "snapshot": {
  "b": "t2-isolation-level",
  "d": "Gambaran data pada satu saat, misalnya isi database yang dilihat satu query atau transaction, dan saldo akhir periode yang disimpan supaya tidak dijumlah ulang.",
  "h": "istilah/snapshot/",
  "n": "2.12 Isolation level",
  "s": "istilah-snapshot",
  "t": "Snapshot",
  "u": "tahap-2/isolation-level/"
 },
 "source of truth": {
  "b": "A1",
  "d": "Satu tempat yang isinya dianggap benar ketika salinan lain berbeda, mis. database backend untuk saldo; cache dan data di HP hanya salinan.",
  "n": "1.3 Apa yang dikerjakan backend",
  "s": "istilah-source-of-truth",
  "t": "Source of truth",
  "u": "tahap-1/apa-yang-dikerjakan-backend/"
 },
 "stale": {
  "b": "B9",
  "d": "Data yang sudah tidak terbaru, mis. harga lama yang masih tersimpan di cache.",
  "n": "3.6 Caching dan invalidation",
  "s": "istilah-stale",
  "t": "Stale",
  "u": "b-fondasi/b9-caching/"
 },
 "stateless": {
  "b": "D2",
  "d": "Server tidak menyimpan keadaan antar-request di memorinya, jadi request mana pun bisa dilayani instance mana pun.",
  "n": "5.1 Scaling",
  "s": "istilah-stateless",
  "t": "Stateless",
  "u": "d-system-design/d2-scaling/"
 },
 "status code": {
  "b": "B1.1",
  "d": "Angka tiga digit di response yang menyatakan hasil request, mis. 201 berhasil dibuat atau 401 belum login.",
  "n": "1.16 HTTP",
  "s": "istilah-status-code",
  "t": "Status code",
  "u": "tahap-1/http/"
 },
 "throughput": {
  "b": "C2",
  "d": "Jumlah pekerjaan yang selesai per satuan waktu, mis. request per detik.",
  "n": "3.1 Observability",
  "s": "istilah-throughput",
  "t": "Throughput",
  "u": "c-operasional/c2-observability/"
 },
 "timeout": {
  "b": "B11",
  "d": "Batas waktu menunggu sebelum sebuah panggilan dianggap gagal.",
  "n": "4.1 Integrasi pihak ketiga",
  "s": "istilah-timeout",
  "t": "Timeout",
  "u": "b-fondasi/b11-integrasi-pihak-ketiga/"
 },
 "token": {
  "b": "B5.1",
  "d": "String yang dibawa request sebagai bukti siapa pengirimnya, mis. token login di header Authorization; siapa pun yang memegangnya bisa memakainya. Di token bucket, token berarti satu jatah request.",
  "n": "1.27 Authentication",
  "s": "istilah-token",
  "t": "Token",
  "u": "tahap-1/authentication/"
 },
 "token bucket": {
  "b": "C4",
  "d": "Algoritma rate limit: setiap key (IP atau akun) punya bucket berisi token yang terisi ulang dengan laju tetap, dan setiap request memakai satu token.",
  "n": "3.7 Security dasar dan rate limit",
  "s": "istilah-token-bucket",
  "t": "Token bucket",
  "u": "c-operasional/c4-security-dasar/"
 },
 "trace": {
  "b": "C2",
  "d": "Rekaman perjalanan satu request melewati beberapa komponen, lengkap dengan durasi tiap bagian.",
  "n": "3.1 Observability",
  "s": "istilah-trace",
  "t": "Trace",
  "u": "c-operasional/c2-observability/"
 },
 "trade-off": {
  "b": "D1",
  "d": "Pilihan yang memberi satu kelebihan dengan membayar satu kekurangan.",
  "n": "1.38 Kerangka berpikir dan estimasi",
  "s": "istilah-trade-off",
  "t": "Trade-off",
  "u": "tahap-1/kerangka-estimasi/"
 },
 "transaction": {
  "b": "B3.1",
  "d": "Sekelompok perintah database yang berhasil semua atau batal semua.",
  "n": "1.23 Transaction",
  "s": "istilah-transaction",
  "t": "Transaction",
  "u": "tahap-1/transaction/"
 },
 "tutup buku": {
  "b": "t2-tutup-buku",
  "d": "Pemeriksaan akhir periode: untuk setiap buku, saldo awal ditambah mutasi harus sama dengan saldo akhir, dan seluruh jurnal harus seimbang.",
  "h": "istilah/tutup-buku/",
  "n": "2.4 Fitur tutup buku",
  "s": "istilah-tutup-buku",
  "t": "Tutup buku",
  "u": "tahap-2/fitur-tutup-buku/"
 },
 "webhook": {
  "b": "B10.2",
  "d": "HTTP request yang dikirim sistem lain ke API kita saat ada kejadian, mis. pembayaran berhasil.",
  "n": "4.3 Webhook dan outbox",
  "s": "istilah-webhook",
  "t": "Webhook",
  "u": "b-fondasi/b10-2-webhook-outbox/"
 },
 "worker": {
  "b": "B10.1",
  "d": "Proses terpisah yang mengambil pekerjaan dari queue dan mengerjakannya di luar jalur request. Di server web seperti WSGI, worker juga berarti satu proses yang melayani request.",
  "n": "3.3 Background job, queue, retry",
  "s": "istilah-worker",
  "t": "Worker",
  "u": "b-fondasi/b10-1-background-job/"
 }
};
