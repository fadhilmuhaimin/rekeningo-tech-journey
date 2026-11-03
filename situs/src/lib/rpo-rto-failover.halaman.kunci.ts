// Kalimat prosa halaman 5.9 dikunci literal di berkas terpisah dari berkas nilai, dengan jumlah kemunculannya (kalimat yang
// digandakan atau disisipi kata tertolak). Dibangkitkan sekali oleh tmp/rpo/buat_nilai.mjs; jangan dibangkitkan ulang dari halaman termutasi.
export const KUNCI_LITERAL: [string, number][] = [
  [
    "COMMIT yang menunggu standby sinkron membuat jawaban 201 ada di node yang dipromosikan.",
    1
  ],
  [
    "RPO adalah titik waktu terakhir yang harus bisa dipulihkan sesudah gangguan, dan RTO adalah lama paling lama sistem boleh berada dalam pemulihan.",
    1
  ],
  [
    "PRD v5 menulis RPO nol dan RTO 15 menit sebagai Asumsi produk ([[t5-prd]]).",
    1
  ],
  [
    "RPO nol berarti pembayaran yang sudah dijawab sukses tidak boleh hilang.",
    1
  ],
  [
    "Replica asinkron tidak menjamin RPO nol, dan standby sinkron menjaganya dengan syarat.",
    1
  ],
  [
    "Di Rekaman lab ([Label sumber](/cara-pakai/#label-sumber)) `promosi.txt`, lima jurnal 201 tidak ada di replica asinkron yang dipromosikan (bagian A).",
    1
  ],
  [
    "Tiga jurnal 201 ada di standby sinkron yang dipromosikan (bagian B).",
    1
  ],
  [
    "ADR 48 menulis syaratnya dan kapan pilihan ini salah.",
    1
  ],
  [
    "1.",
    21
  ],
  [
    "Di standby sinkron, apa yang ditunggu COMMIT dengan `synchronous_commit = on`, dan apa dengan `remote_apply`?",
    1
  ],
  [
    "2.",
    5
  ],
  [
    "Kenapa primary lama yang tidak dihentikan sesudah promosi berbahaya, dan apa buktinya di lab?",
    1
  ],
  [
    "3.",
    19
  ],
  [
    "Dari RPO dan RTO, mana yang membatasi data yang boleh hilang, dan mana yang membatasi lama pulih?",
    1
  ],
  [
    "Yakin dengan ketiganya?",
    1
  ],
  [
    "Lompat ke [[berikutnya]].",
    1
  ],
  [
    "Tebak dulu apa yang terjadi pada COMMIT bila satu-satunya standby sinkron mati selagi primary hidup.",
    1
  ],
  [
    "Jawabannya dibuka sesudah kamu memilih.",
    1
  ],
  [
    "Rekaman lab menulis file dan bagian rekamannya.",
    1
  ],
  [
    "Tidak dijalankan berarti dicek ke dokumentasi atau kode, tanpa dijalankan.",
    1
  ],
  [
    "Hitungan adalah hasil rumus dari angka yang tertulis di halaman ini, dan Asumsi adalah angka pilihan penulis tanpa rekaman.",
    1
  ],
  [
    "Penalaran adalah kesimpulan dari kode atau angka di halaman, bukan hasil ukuran.",
    1
  ],
  [
    "**Ubah satu hal:** isi `synchronous_standby_names` dengan dua nama dan metode `ANY 1`.",
    1
  ],
  [
    "Menurut dokumentasi PostgreSQL 17, tiap COMMIT lalu dilepas oleh jawaban dari salah satu standby, jadi satu standby yang mati tidak menahannya.",
    1
  ],
  [
    "Ini Tidak dijalankan: lab hanya punya satu kandidat sinkron.",
    1
  ],
  [
    "[[t5-m42]] menunjukkan primary yang diganti tanpa replica sinkron.",
    1
  ],
  [
    "Lima jurnal yang sudah dijawab 201 tidak ada di node baru.",
    1
  ],
  [
    "Di skala naskah jumlahnya 69 transaksi per jeda 1 detik (Hitungan atas Asumsi, diturunkan di halaman itu).",
    1
  ],
  [
    "PRD v5 menulis tiga angka yang menjawabnya, semuanya Asumsi produk ([[t5-prd]]).",
    1
  ],
  [
    "RPO nol berlaku untuk transaksi uang yang sudah dijawab sukses.",
    1
  ],
  [
    "RTO 15 menit membatasi lama pulih.",
    1
  ],
  [
    "Ketersediaan pembayaran 99,9% per 30 hari memberi anggaran kegagalan 0,001 × 43.200 = 43,2 menit.",
    1
  ],
  [
    "[[t3-adr-33]] menunda VPS kedua sampai waktu pulih atau jendela kehilangan data melebihi yang diterima PRD.",
    1
  ],
  [
    "Backup harian berjendela sampai 24 jam, sedangkan PRD v5 menulis RPO nol.",
    1
  ],
  [
    "Pemicu itu terpenuhi, dan ADR 48 menjawabnya.",
    1
  ],
  [
    "**RPO dan RTO mengukur dua hal berbeda.** NIST menulis RPO sebagai titik waktu yang datanya harus bisa dipulihkan sesudah gangguan.",
    1
  ],
  [
    "NIST menulis RTO sebagai lama komponen sistem boleh berada dalam fase pemulihan sebelum mengganggu misi organisasi ([NIST SP 800-34 Rev. 1, glosarium CSRC](https://csrc.nist.gov/glossary/term/recovery_point_objective), dibuka 2026-11-03).",
    1
  ],
  [
    "Satu gangguan bisa memenuhi yang satu dan melanggar yang lain.",
    1
  ],
  [
    "Datanya utuh tetapi pulih 23 menit, atau pulih cepat dengan data hilang.",
    1
  ],
  [
    "**Replica asinkron kehilangan sebesar jedanya.** Replikasi streaming PostgreSQL bersifat asinkron secara bawaan.",
    1
  ],
  [
    "Dokumentasi PostgreSQL 17 menulis bahwa kehilangan data sebanding dengan jeda replikasi saat failover ([PostgreSQL 17: replikasi sinkron](https://www.postgresql.org/docs/17/warm-standby.html#SYNCHRONOUS-REPLICATION), dibuka 2026-11-03).",
    1
  ],
  [
    "Rekaman bagian A di [[t5-m42]] menunjukkan 0 dari 5 jurnal 201 di node baru.",
    1
  ],
  [
    "**Standby sinkron menahan jawaban sampai standby menyimpan commit.** Replica sinkron adalah standby yang ditunggu COMMIT, dan PostgreSQL menyebutnya standby sinkron.",
    1
  ],
  [
    "Dua pengaturan menyalakannya:",
    1
  ],
  [
    "`synchronous_standby_names` berisi nama, dan `synchronous_commit` bernilai `on`, nilai bawaan.",
    1
  ],
  [
    "Tiap COMMIT lalu menunggu konfirmasi bahwa standby menulis rekaman commit ke penyimpanan tahan lama (sumber yang sama).",
    1
  ],
  [
    "Nama standby di daftar adalah `application_name`-nya.",
    1
  ],
  [
    "Dengan `FIRST 1 (replika_sinkron)`, `replika_sinkron` berstatus `sync`.",
    1
  ],
  [
    "`replika_laporan` tetap `async`, jadi COMMIT tidak menunggunya.",
    1
  ],
  [
    "**`on` dan `remote_apply` menunggu hal berbeda.** Dengan `on`, standby sudah menyimpan rekaman commit.",
    1
  ],
  [
    "Dengan `remote_apply`, standby sudah memutar ulang rekaman itu, sehingga commit terlihat oleh query di standby.",
    1
  ],
  [
    "Dokumentasi menulis bahwa `remote_apply` menimbulkan jeda commit yang jauh lebih besar, karena menunggu replay ([PostgreSQL 17: konfigurasi WAL](https://www.postgresql.org/docs/17/runtime-config-wal.html), dibuka 2026-11-03).",
    1
  ],
  [
    "Lab menahan replay di standby sinkron:",
    1
  ],
  [
    "COMMIT dengan `on` selesai selagi replay ditahan.",
    1
  ],
  [
    "COMMIT dengan `remote_apply` menunggu di `SyncRep` sampai replay dilanjutkan.",
    1
  ],
  [
    "Tanpa penahanan, selisih COMMIT tercepat kedua mode di bawah 1 ms dari 600 COMMIT per mode, dan nilainya tidak direkam.",
    1
  ],
  [
    "Jeda yang jauh lebih besar tidak terlihat di laptop lab.",
    1
  ],
  [
    "**Standby sinkron yang mati menahan COMMIT.** Lab menghentikan container standby sinkron selagi primary hidup:",
    1
  ],
  [
    "Hanya `replika_laporan` yang tersisa di `pg_stat_replication`.",
    1
  ],
  [
    "Satu COMMIT menunggu di `SyncRep`, dan barisnya belum terlihat oleh sesi lain.",
    1
  ],
  [
    "Dokumentasi menulis bahwa commit seperti ini mungkin tidak pernah selesai bila salah satu standby sinkron mati.",
    1
  ],
  [
    "Dokumentasi menyuruh menurunkan jumlah standby sinkron lalu memuat ulang konfigurasi ([PostgreSQL 17: perencanaan ketersediaan tinggi](https://www.postgresql.org/docs/17/warm-standby.html#SYNCHRONOUS-REPLICATION-HA), dibuka 2026-11-03).",
    1
  ],
  [
    "Halaman itu tidak menyebut batas waktu penantian, dan lab tidak menunggunya.",
    1
  ],
  [
    "Sesudah daftar dikosongkan, COMMIT yang macet selesai.",
    1
  ],
  [
    "Harganya: selama daftar kosong, COMMIT tidak menunggu siapa pun, jadi jaminan RPO nol berhenti.",
    1
  ],
  [
    "**`FIRST` dan `ANY` memilih standby dengan cara berbeda.** `FIRST n` berbasis prioritas.",
    1
  ],
  [
    "Nama di awal daftar menjadi standby sinkron, dan nama sesudahnya menjadi calon.",
    1
  ],
  [
    "Standby sinkron yang putus segera digantikan calon berikutnya.",
    1
  ],
  [
    "`ANY n` berbasis kuorum:",
    1
  ],
  [
    "COMMIT dilepas begitu paling sedikit n standby dalam daftar menjawab ([PostgreSQL 17: synchronous_standby_names](https://www.postgresql.org/docs/17/runtime-config-replication.html), dibuka 2026-11-03).",
    1
  ],
  [
    "Menurut dokumentasi, `FIRST 1 (s1, s2)` sama artinya dengan `s1, s2`.",
    1
  ],
  [
    "Lab memakai satu nama, jadi macet di atas bukan sifat `FIRST`.",
    1
  ],
  [
    "Satu kandidat yang mati menahan COMMIT karena tidak ada calon pengganti.",
    1
  ],
  [
    "`FIRST` dan `ANY` dengan dua nama Tidak dijalankan.",
    1
  ],
  [
    "**Jaminannya punya syarat.** Dokumentasi menulis empat batas jaminan ini:",
    1
  ],
  [
    "`synchronous_commit` bisa dipasang per user, per database, atau per transaction oleh aplikasi.",
    1
  ],
  [
    "Nilai `local` atau `off` membuat transaction tidak menunggu replikasi (PostgreSQL 17: konfigurasi WAL dan `synchronous_standby_names`).",
    1
  ],
  [
    "Data hanya bisa hilang bila primary dan standby gagal bersamaan (PostgreSQL 17: replikasi sinkron).",
    1
  ],
  [
    "Dengan `on`, transaction tidak hilang kecuali primary dan semua standby sinkron mengalami kerusakan penyimpanan (PostgreSQL 17: konfigurasi WAL).",
    1
  ],
  [
    "4.",
    10
  ],
  [
    "Sesudah primary restart, transaction yang menunggu dianggap ter-commit penuh, sehingga sebagian bisa tampak ter-commit di primary tetapi tidak di standby.",
    1
  ],
  [
    "Aplikasi tidak menerima konfirmasi sebelum WAL diterima semua standby sinkron.",
    1
  ],
  [
    "Lab menunjukkan keadaan yang mirip butir 4 lewat jalan lain: penantian dibatalkan, bukan primary restart.",
    1
  ],
  [
    "Pembayaran keempat tidak dijawab 201, dan primary lama mencatat bahwa transaksinya sudah ter-commit lokal.",
    1
  ],
  [
    "Jurnalnya ada di primary lama dan tidak di node baru (`promosi.txt` bagian B, dibahas di [[t5-m42]]).",
    1
  ],
  [
    "Dokumentasi Patroni 4.1.5 menulis bahwa replikasi sinkron tidak menjamin nol transaksi hilang dalam semua keadaan.",
    1
  ],
  [
    "Bila primary dan standby sinkron gagal bersamaan, node ketiga yang dipromosikan mungkin belum memuat semua transaksi ([Patroni 4.1.5: replication modes](https://patroni.readthedocs.io/en/latest/replication_modes.html), dibuka 2026-11-03, Tidak dijalankan).",
    1
  ],
  [
    "**Failover punya enam langkah, dan lab merekam satu.** Dokumentasi PostgreSQL menulis bahwa PostgreSQL tidak menyediakan perangkat lunak yang mengenali kegagalan primary.",
    1
  ],
  [
    "Banyak perangkat seperti itu ada di luarnya ([PostgreSQL 17: failover](https://www.postgresql.org/docs/17/warm-standby-failover.html), dibuka 2026-11-03).",
    1
  ],
  [
    "Promosi dipicu dengan `pg_ctl promote` atau `pg_promote()`.",
    1
  ],
  [
    "Primary lama yang hidup lagi harus diberi tahu bahwa ia bukan primary, supaya tidak ada dua server yang merasa primary.",
    1
  ],
  [
    "Dokumentasi menulis bahwa langkah itu kadang disebut STONITH, dan halaman ini menyebutnya fencing.",
    1
  ],
  [
    "Tanpa langkah itu, dua server yang sama-sama merasa primary berujung pada kebingungan dan kehilangan data.",
    1
  ],
  [
    "Sesudah failover hanya satu server yang tersisa.",
    1
  ],
  [
    "`pg_rewind` bisa mempercepat pembuatan ulang standby di cluster besar.",
    1
  ],
  [
    "Lab memerankan primary yang gagal tanpa mematikannya.",
    1
  ],
  [
    "Koneksi WAL satu standby diputus di sisi primary, lalu standby itu dipromosikan:",
    1
  ],
  [
    "Primary lama tetap menerima pembayaran sesudah promosi: primary lama punya 9 jurnal bayar dan node baru 3 (`promosi.txt` bagian A).",
    1
  ],
  [
    "Fencing tidak ada di lab.",
    1
  ],
  [
    "Dokumentasi menyarankan prosedur administrasi tertulis.",
    1
  ],
  [
    "Dokumentasi juga menulis bahwa berpindah dari primary ke standby secara berkala menguji mekanisme failover itu.",
    1
  ],
  [
    "Di Rekeningo itu menjadi runbook dan latihan bulanan SRE (ADR 48).",
    1
  ],
  [
    "Dokumentasi menulis bahwa bila primary terisolasi, failover dilakukan ke kandidat terbaik di antara standby yang tersisa.",
    1
  ],
  [
    "Dengan `ANY 1` dari dua standby, kedua standby bisa memegang commit terakhir yang berbeda.",
    1
  ],
  [
    "Tiap COMMIT dilepas oleh salah satunya (penalaran dari definisi kuorum).",
    1
  ],
  [
    "`pg_last_wal_receive_lsn()` mengembalikan posisi WAL terakhir yang diterima dan disimpan standby ([PostgreSQL 17: fungsi administrasi](https://www.postgresql.org/docs/17/functions-admin.html), dibuka 2026-11-03).",
    1
  ],
  [
    "Membandingkannya di kedua standby memilih yang lebih maju (penalaran, Tidak dijalankan).",
    1
  ],
  [
    "**Alat failover menulis pilihan yang sama.** Patroni 4.1.5 dengan `synchronous_mode` tidak mempromosikan standby kecuali yakin standby itu memuat semua transaksi yang mungkin sudah dijawab sukses.",
    1
  ],
  [
    "Bila standby sinkron mati, commit macet.",
    1
  ],
  [
    "Putaran Patroni berikutnya lalu mengalihkan primary ke mode standalone.",
    1
  ],
  [
    "`synchronous_mode_strict` mencegah peralihan itu, dengan harga primary berhenti menerima tulisan sampai satu standby sinkron kembali.",
    1
  ],
  [
    "Patroni juga mendukung watchdog.",
    1
  ],
  [
    "Watchdog mereset mesin bila detak keepalive tidak datang, sebagai lapisan pengaman tambahan terhadap dua primary ([Patroni 4.1.5: watchdog](https://patroni.readthedocs.io/en/latest/watchdog.html), dibuka 2026-11-03, Tidak dijalankan).",
    1
  ],
  [
    "CloudNativePG 1.30 menulis `method: any` dengan `number: 1` untuk tiga instance.",
    1
  ],
  [
    "Hasilnya `synchronous_standby_names` bernilai `ANY 1 (...)`.",
    1
  ],
  [
    "`dataDurability: required` menghentikan tulisan bila jumlah standby sinkron tidak cukup, dan `preferred` melanjutkan tulisan walau standby kurang ([CloudNativePG 1.30: replication](https://cloudnative-pg.io/docs/1.30/replication/), dibuka 2026-11-03, Tidak dijalankan).",
    1
  ],
  [
    "Alat yang diatur ke `preferred` atau tanpa mode strict menurunkan jaminan sendiri, tanpa SRE yang mencatatnya.",
    1
  ],
  [
    "**Berapa lama menunggu dan berapa lama pulih.** Dokumentasi menulis bahwa menunggu tidak memakai sumber daya sistem, tetapi lock transaction tetap ditahan sampai pengiriman dikonfirmasi (PostgreSQL 17: replikasi sinkron, bagian perencanaan kinerja).",
    1
  ],
  [
    "Lab hanya merekam bahwa COMMIT tercepat dengan standby sinkron lebih lambat dari `local` (`sinkron.txt` bagian B, nilai tidak direkam).",
    1
  ],
  [
    "Hitungan di bawah memakai angka yang tertulis di halaman ini atau di halaman yang disebut:",
    1
  ],
  [
    "- 69,4 transaksi uang per detik di puncak, dan 46,3 dengan 2 transaksi per user aktif (Asumsi, diturunkan di [[t5-m42]]).",
    1
  ],
  [
    "- 50 ms untuk tambahan COMMIT, yaitu anggaran satu lompatan di [[t4-modul]] (Asumsi).",
    1
  ],
  [
    "- RTO 15 menit dan anggaran 43,2 menit dari PRD v5 (Asumsi produk), serta gangguan 23 menit dari naskah M42 (Ilustrasi).",
    1
  ],
  [
    "Koneksi tambahan memakai L = λ × W dari [[t3-pool]].",
    1
  ],
  [
    "Baris buku memakai penalaran.",
    1
  ],
  [
    "Tiap pembayaran ke satu merchant mengunci buku merchant itu sampai commit ([[t2-race-lock]]).",
    1
  ],
  [
    "Lock yang ditahan 50 ms membatasi satu buku paling banyak 20 pembayaran per detik.",
    1
  ],
  [
    "Rekaman tidak mengukurnya (Tidak dijalankan).",
    1
  ],
  [
    "Tiap hasil di tabel adalah Hitungan atas Asumsi atau Ilustrasi.",
    1
  ],
  [
    "**Skenario:** satu app menulis uang ke PostgreSQL, dan primary-nya diganti.",
    1
  ],
  [
    "Yang ditanyakan: apa yang ditulis dokumentasi stack ini tentang memilih server yang menerima tulisan?",
    1
  ],
  [
    "Tab Go dijalankan sebagian di lab.",
    1
  ],
  [
    "Tab lain tidak dijalankan, dan hanya dicek ke dokumentasi pada 2026-11-03.",
    1
  ],
  [
    "Kode di tab lain adalah Ilustrasi.",
    1
  ],
  [
    "*Dijalankan sebagian: server lab `api-t5` membaca satu `DATABASE_URL`.",
    1
  ],
  [
    "Beberapa host dibaca dari kode sumber pgx v5.11.0, versi lab, dan tidak dijalankan.*",
    1
  ],
  [
    "**Yang berbeda di stack ini:** `pgx.ParseConfig` meneruskan ke `pgconn.ParseConfig`, yang menerima beberapa host dipisah koma dan mencobanya berurutan.",
    1
  ],
  [
    "`target_session_attrs` menerima `read-write`, `read-only`, `primary`, `standby`, `prefer-standby`, dan `any`.",
    1
  ],
  [
    "Untuk `read-write`, pgx menjalankan `show transaction_read_only` dan menolak koneksi yang menjawab `on`.",
    1
  ],
  [
    "Primary lama yang masih menerima tulisan tidak menjawab `on`, jadi pemeriksaan itu juga lolos untuknya (penalaran dari kode dan `promosi.txt` bagian A, Tidak dijalankan).",
    1
  ],
  [
    "Menghentikan primary lama tetap tugas fencing, bukan tugas driver.",
    1
  ],
  [
    "*Tidak dijalankan.",
    5
  ],
  [
    "Dicek ke halaman Connecting di dokumentasi node-postgres (pg 8.23.1 di npm) dan README Postgres.js di repositorinya (postgres 4.0.0 di npm), dibuka 2026-11-03.",
    1
  ],
  [
    "Kode di bawah adalah Ilustrasi.*",
    1
  ],
  [
    "target_session_attrs: \"primary\",",
    1
  ],
  [
    "});`} />",
    1
  ],
  [
    "**Yang berbeda di stack ini:** halaman Connecting node-postgres tidak memuat `target_session_attrs` maupun beberapa host (dicari di teks halaman).",
    1
  ],
  [
    "README Postgres.js punya bagian multi-host untuk ketersediaan tinggi: host dicoba berurutan, dan `target_session_attrs: 'primary'` membatasi koneksi ke primary.",
    1
  ],
  [
    "README menyebutnya cara mencapai failover tanpa downtime, dan klaim itu tidak diukur di sini.",
    1
  ],
  [
    "Dicek ke [Laravel 13.x:",
    1
  ],
  [
    "Database](https://laravel.com/docs/13.x/database), dibuka 2026-11-03.*",
    1
  ],
  [
    "**Yang berbeda di stack ini:** halaman Database tidak memuat kata failover, `target_session_attrs`, maupun beberapa host (dicari di teks halaman).",
    1
  ],
  [
    "Konfigurasi `read` dan `write` memilih host untuk bacaan dan tulisan ([[t5-read-replica]]), bukan primary yang baru sesudah promosi.",
    1
  ],
  [
    "Alamat primary baru harus datang dari luar app, misalnya dari alamat yang dialihkan oleh perangkat failover (penalaran).",
    1
  ],
  [
    "Dicek ke [Django 5.2:",
    1
  ],
  [
    "Databases](https://docs.djangoproject.com/en/5.2/ref/databases/) dan [Django 5.2:",
    1
  ],
  [
    "Settings](https://docs.djangoproject.com/en/5.2/ref/settings/), dibuka 2026-11-03.*",
    1
  ],
  [
    "**Yang berbeda di stack ini:** kedua halaman tidak memuat kata failover, `target_session_attrs`, maupun beberapa host (dicari di teks halaman).",
    1
  ],
  [
    "`OPTIONS` pada `DATABASES` menulis parameter tambahan untuk koneksi.",
    1
  ],
  [
    "Parameter yang tersedia tergantung backend.",
    1
  ],
  [
    "Pilihan server tulis tidak dibahas, jadi ia diserahkan ke driver dan ke alamat yang dipakai app (penalaran).",
    1
  ],
  [
    "Dicek ke [Serverpod: database connection](https://docs.serverpod.dev/concepts/data-and-the-database/database/connection), Serverpod 4.1.0, dibuka 2026-11-03.",
    1
  ],
  [
    "Kode Dart tidak ditulis di tab ini.*",
    1
  ],
  [
    "**Yang berbeda di stack ini:** halaman Connection menulis satu blok `database` untuk tiap lingkungan, berisi host, port, name, dan user.",
    1
  ],
  [
    "Halaman itu tidak memuat kata failover, replica, maupun beberapa host (dicari di teks halaman), jadi satu host di konfigurasi menunjuk satu alamat.",
    1
  ],
  [
    "Dicek ke [Supabase:",
    1
  ],
  [
    "Read Replicas](https://supabase.com/docs/guides/platform/read-replicas), dokumen tanpa nomor versi, dibuka 2026-11-03.*",
    1
  ],
  [
    "**Yang berbeda di stack ini:** halaman itu menulis bahwa replikasi ke Read Replica bersifat asinkron, supaya transaksi di primary tidak terblokir.",
    1
  ],
  [
    "Halaman itu tidak memuat kata failover maupun promote (dicari di teks halaman), jadi RPO nol tidak bisa dibaca darinya.",
    1
  ],
  [
    "**Kebutuhan.** PRD v5 menulis RPO nol untuk transaksi uang yang sudah dijawab sukses dan RTO 15 menit ([[t5-prd]]; Asumsi produk).",
    1
  ],
  [
    "Replica asinkron kehilangan 0 dari 5 jurnal 201 saat dipromosikan, dan di skala naskah 69 transaksi per jeda 1 detik ([[t5-m42]]).",
    1
  ],
  [
    "Pemicu VPS kedua di ADR 33 sudah terpenuhi ([[t3-adr-33]]).",
    1
  ],
  [
    "**Status:** diterima sesudah M42 ([[t5-m42]]), dan menjawab pemicu ADR 33.",
    1
  ],
  [
    "Naskah tidak menulis tanggal ADR.",
    1
  ],
  [
    "**Keputusan: opsi E.** Delapan aturan:",
    1
  ],
  [
    "Ledger memakai `synchronous_standby_names = 'ANY 1 (r1, r2)'` dan `synchronous_commit = on`.",
    1
  ],
  [
    "Nama r1 dan r2 adalah `application_name` dua standby.",
    1
  ],
  [
    "Di lab hanya `replika_sinkron` yang ada.",
    1
  ],
  [
    "Replica laporan ([[t5-read-replica]]) terpisah, asinkron, dan tidak masuk daftar sinkron.",
    1
  ],
  [
    "Di lab itu `replika_laporan`, berstatus `async`.",
    1
  ],
  [
    "Failover otomatis oleh alat dengan fencing, yaitu mematikan primary lama sebelum promosi.",
    1
  ],
  [
    "Patroni v4.1.5 (rilis 2026-08-12) atau CloudNativePG v1.30.1 (rilis 2026-09-23) Tidak dijalankan, dengan versi dari halaman rilis GitHub yang dibuka 2026-11-03.",
    1
  ],
  [
    "Di lab promosi manual dengan `pg_promote()`, tanpa fencing.",
    1
  ],
  [
    "Alatnya diatur agar tulisan berhenti saat standby sinkron tidak cukup (`synchronous_mode_strict` di Patroni, `dataDurability: required` di CloudNativePG), bukan turun ke asinkron sendiri.",
    1
  ],
  [
    "Tanpa alat, SRE membandingkan `pg_last_wal_receive_lsn()` di kedua standby dan mempromosikan yang lebih maju (penalaran, Tidak dijalankan).",
    1
  ],
  [
    "5.",
    8
  ],
  [
    "Jawaban sukses dikirim hanya sesudah COMMIT selesai, termasuk balasan 2xx untuk webhook ([[t4-webhook]]).",
    1
  ],
  [
    "RPO nol hanya berlaku untuk jawaban yang sudah diterima client.",
    1
  ],
  [
    "6.",
    1
  ],
  [
    "Kode transaksi uang tidak mengubah `synchronous_commit` ke `local` atau `off`.",
    1
  ],
  [
    "Tes memindai kode untuk perubahan itu (Asumsi desain, belum ada di lab).",
    1
  ],
  [
    "7.",
    3
  ],
  [
    "Bila kedua standby sinkron mati, SRE menurunkan jumlah di `synchronous_standby_names` atau mengosongkannya, memuat ulang konfigurasi, dan mencatatnya sebagai insiden.",
    1
  ],
  [
    "Lab merekam pengosongan untuk satu kandidat.",
    1
  ],
  [
    "8.",
    2
  ],
  [
    "SRE melatih failover tiap bulan dan mencatat waktunya terhadap RTO 15 menit.",
    1
  ],
  [
    "Runbook tertulis.",
    1
  ],
  [
    "**Kenapa E, bukan A, B, C, atau D.**",
    1
  ],
  [
    "- **A ditolak** karena PRD v5 menulis RPO nol, dan rekaman menunjukkan 0 dari 5 jurnal 201 di node baru.",
    1
  ],
  [
    "Dokumentasi menulis kehilangan sebanding dengan jeda.",
    1
  ],
  [
    "- **B ditolak** karena satu kandidat membuat satu standby yang mati menahan COMMIT (`sinkron.txt` bagian C).",
    1
  ],
  [
    "Itu sifat satu nama, bukan sifat `FIRST`: dokumentasi menulis `FIRST 1` dengan dua nama langsung mengganti standby yang putus dengan calon berikutnya.",
    1
  ],
  [
    "- **`FIRST 1 (r1, r2)` bukan opsi di tabel** karena lab tidak menjalankannya, dan naskah memilih `ANY`.",
    1
  ],
  [
    "Alasan memilih `ANY` adalah penalaran dari definisi dokumentasi:",
    1
  ],
  [
    "`FIRST` menunggu standby berprioritas tertinggi yang terhubung, sedangkan `ANY` dilepas jawaban pertama.",
    1
  ],
  [
    "Standby yang lambat tetapi masih terhubung tidak menahan `ANY`.",
    1
  ],
  [
    "Keduanya Tidak dijalankan.",
    1
  ],
  [
    "- **C ditolak** karena RPO nol tidak butuh replay.",
    1
  ],
  [
    "`on` sudah menunggu penyimpanan tahan lama di standby, dan `remote_apply` menunggu replay yang bisa ditahan (`sinkron.txt` bagian B).",
    1
  ],
  [
    "Bacaan yang butuh data segar memakai [[t5-lag]].",
    1
  ],
  [
    "- **D tidak dipilih untuk lab** karena tidak bisa direkam, bukan karena salah.",
    1
  ],
  [
    "Produksi database dijalankan sendiri atau terkelola menunggu pemilik ([[t5-onprem]]).",
    1
  ],
  [
    "**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi.",
    1
  ],
  [
    "Tiga penyebab yang paling mungkin:",
    1
  ],
  [
    "Kedua standby mati bersamaan atau gagal bersama karena satu zona.",
    1
  ],
  [
    "COMMIT macet, pembayaran berhenti sampai SRE menurunkan daftar, dan selama itu RPO nol tidak berlaku.",
    1
  ],
  [
    "Pencegahannya standby di zona berbeda dari primary dan dari standby lain (Asumsi), alert saat jumlah standby sinkron kurang dari dua, dan runbook aturan 7.",
    1
  ],
  [
    "Sesi aplikasi atau job menurunkan `synchronous_commit` ke `local` atau `off`.",
    1
  ],
  [
    "Jawaban sukses lalu terkirim tanpa menunggu standby, dan RPO nol hilang tanpa galat.",
    1
  ],
  [
    "Pencegahannya aturan 6 dan tinjauan kode.",
    1
  ],
  [
    "Promosi tanpa fencing menghasilkan dua primary, seperti pembayaran ke-9 di primary lama pada `promosi.txt` bagian A.",
    1
  ],
  [
    "Pencegahannya alat dengan fencing dan latihan bulanan.",
    1
  ],
  [
    "Latihan yang tidak dijalankan membuat RTO tidak pernah terukur.",
    1
  ],
  [
    "**Kapan keputusan ini salah.**",
    1
  ],
  [
    "- Saat p95 COMMIT pembayaran melewati 50 ms, anggaran satu lompatan di [[t4-modul]] (Asumsi).",
    1
  ],
  [
    "Pembandingnya koneksi tambahan 69,4 × 0,05 = 3,47.",
    1
  ],
  [
    "Rekaman hanya memuat bahwa COMMIT tercepat dengan standby sinkron lebih lambat dari `local`.",
    1
  ],
  [
    "- Saat satu buku menerima lebih dari 1 ÷ 0,05 = 20 pembayaran per detik.",
    1
  ],
  [
    "Lock yang ditahan sampai konfirmasi membatasinya (penalaran, Tidak dijalankan).",
    1
  ],
  [
    "- Saat latihan bulanan pulih lebih dari 15 menit.",
    1
  ],
  [
    "Pembandingnya M42: 23 menit (Ilustrasi), selisih 8 menit dan 53,2% dari anggaran 43,2 menit.",
    1
  ],
  [
    "- Saat kedua standby sinkron mati bersamaan.",
    1
  ],
  [
    "Dokumentasi menulis commit mungkin tidak selesai, dan manusia menurunkan daftar.",
    1
  ],
  [
    "Pemulihan manual 15 menit memakai 15 ÷ 43,2 = 34,7% anggaran.",
    1
  ],
  [
    "- Saat primary dan satu standby gagal bersamaan.",
    1
  ],
  [
    "Untuk satu standby sinkron, dokumentasi menulis data hanya bisa hilang dalam keadaan itu.",
    1
  ],
  [
    "Patroni menulis bahwa node ketiga yang dipromosikan mungkin belum lengkap.",
    1
  ],
  [
    "**Yang akan merevisinya.** [[t5-m46]] menunjukkan, menurut naskah (Ilustrasi), latihan failover yang berhasil tetapi membuat semua pod menyambung ulang bersamaan dan menghabiskan koneksi.",
    1
  ],
  [
    "Jawabannya ADR 52 di [[t5-pooler]].",
    1
  ],
  [
    "[[t5-onprem]] menimbang database dijalankan sendiri atau terkelola, dan [[t5-tim-infra]] membawa SLO dan latihan.",
    1
  ],
  [
    "**1.** Di standby sinkron, apa yang ditunggu COMMIT dengan `on`, dan apa dengan `remote_apply`?",
    1
  ],
  [
    "Dengan `on`, COMMIT menunggu standby menyimpan rekaman commit ke penyimpanan tahan lama.",
    1
  ],
  [
    "Dengan `remote_apply`, COMMIT menunggu standby memutar ulang rekaman itu.",
    1
  ],
  [
    "Selagi replay ditahan, COMMIT `on` selesai dan COMMIT `remote_apply` menunggu di `SyncRep` (`sinkron.txt` bagian B).",
    1
  ],
  [
    "**2.** Tiga pembayaran dijawab 201 selagi standby sinkron terhubung, lalu koneksinya putus.",
    1
  ],
  [
    "Pembayaran keempat tidak dijawab dalam 3 detik.",
    1
  ],
  [
    "Apa yang ada di node baru, dan apakah itu melanggar RPO nol?",
    1
  ],
  [
    "Tiga jurnal yang dijawab 201 ada di node baru, dan jurnal keempat tidak ada.",
    1
  ],
  [
    "Itu tidak melanggar RPO nol untuk transaksi yang sudah dijawab sukses, karena client tidak pernah menerima 201 untuk jurnal keempat.",
    1
  ],
  [
    "Primary lama mencatat 4 jurnal bayar dan node baru 3 (`promosi.txt` bagian B).",
    1
  ],
  [
    "**3.** `FIRST 1 (replika_sinkron)` macet saat standby-nya mati.",
    1
  ],
  [
    "Apakah itu karena `FIRST`?",
    1
  ],
  [
    "Bukan.",
    1
  ],
  [
    "Lab memakai satu nama, jadi tidak ada calon pengganti.",
    1
  ],
  [
    "Dokumentasi PostgreSQL 17 menulis bahwa `FIRST 1` dengan dua nama langsung mengganti standby yang putus.",
    1
  ],
  [
    "Dua nama dengan `FIRST` atau `ANY` Tidak dijalankan di lab.",
    1
  ],
  [
    "**4.** Satu gangguan pulih dalam 23 menit.",
    1
  ],
  [
    "Berapa menit di atas RTO 15 menit, dan berapa persen dari anggaran kegagalan 43,2 menit?",
    1
  ],
  [
    "23 − 15 = 8 menit di atas RTO, dan 23 ÷ 43,2 = 53,2% dari anggaran.",
    1
  ],
  [
    "Hasilnya Hitungan atas Asumsi produk dan Ilustrasi, karena 23 menit berasal dari naskah.",
    1
  ],
  [
    "- [PostgreSQL 17:",
    6
  ],
  [
    "High Availability, Load Balancing, and Replication](https://www.postgresql.org/docs/17/warm-standby.html)",
    1
  ],
  [
    "Failover](https://www.postgresql.org/docs/17/warm-standby-failover.html)",
    1
  ],
  [
    "Replication](https://www.postgresql.org/docs/17/runtime-config-replication.html)",
    1
  ],
  [
    "Write Ahead Log](https://www.postgresql.org/docs/17/runtime-config-wal.html)",
    1
  ],
  [
    "System Administration Functions](https://www.postgresql.org/docs/17/functions-admin.html)",
    1
  ],
  [
    "- [PostgreSQL 17: pg_rewind](https://www.postgresql.org/docs/17/app-pgrewind.html)",
    1
  ],
  [
    "- [NIST CSRC: recovery point objective](https://csrc.nist.gov/glossary/term/recovery_point_objective)",
    1
  ],
  [
    "- [NIST CSRC: recovery time objective](https://csrc.nist.gov/glossary/term/recovery_time_objective)",
    1
  ],
  [
    "- [Patroni: replication modes](https://patroni.readthedocs.io/en/latest/replication_modes.html)",
    1
  ],
  [
    "- [Patroni: watchdog support](https://patroni.readthedocs.io/en/latest/watchdog.html)",
    1
  ],
  [
    "- [CloudNativePG 1.30: replication](https://cloudnative-pg.io/docs/1.30/replication/)",
    1
  ],
  [
    "- [CloudNativePG 1.30: automated failover](https://cloudnative-pg.io/docs/1.30/failover/)",
    1
  ],
  [
    "- [Postgres.js](https://github.com/porsager/postgres)",
    1
  ],
  [
    "- [node-postgres: connecting](https://node-postgres.com/features/connecting)",
    1
  ],
  [
    "- [Laravel 13.x:",
    1
  ],
  [
    "Database](https://laravel.com/docs/13.x/database)",
    2
  ],
  [
    "- [Django 5.2:",
    1
  ],
  [
    "Databases](https://docs.djangoproject.com/en/5.2/ref/databases/)",
    2
  ],
  [
    "- [Serverpod: database connection](https://docs.serverpod.dev/concepts/data-and-the-database/database/connection)",
    1
  ],
  [
    "- [Supabase:",
    1
  ],
  [
    "Read Replicas](https://supabase.com/docs/guides/platform/read-replicas)",
    2
  ]
];
