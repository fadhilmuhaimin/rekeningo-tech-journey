// Nilai penjaga halaman 5.5, dibangkitkan dari read-replica.mdx, diagram, tebak, banding, snippet, dan baris riset oleh
// tmp/buat_nilai55.mjs; tes membandingkan halaman dengan nilai ini SETIAP baris dan SETIAP sidik. Ubah halaman, jalankan
// ulang pembangkit, dan baca selisihnya sebelum commit: sidik hanya menandai bahwa sesuatu berubah, bukan bahwa ia benar.
export const SIDIK = {
  frontmatter: "4f0e039623f9beab",
  riset: ["fa0a03be5379dae4","848afd1131dcc7bf","c0f9de8ebd54d610","67f2116fe1516f50","79a5a3cd4a5a875a"],
  diagram: "fb3218a61b36c8c6",
  tebak: "3841659259743d65",
  banding: "48def07cf84181af",
  snippet: ["2f3bff2a254d1b4d","422e1eb556b40fd2","c867c7dddb433b52","64c90368e1c737ae","42163e84b8d4f866","5945657540af21e2","37255ba057d56cdf","73dece135be018ee","6f584f80c431860f","7a21787e0691b77d","a32df71a000a06df"],
};

// Nilai terpisah dari kalimat terkunci: lima baris riset utuh, tiap daun diagram, tebak, dan banding, dan profil kata penentu
// per baris badan (polaritas, urutan waktu, bilangan, kode status, label sumber).
export const RISET_TERKUNCI: string[] = [
  "| R5-130 | Rekaman dan kode lab t5-replika dan api-t5 untuk halaman 5.5 (dibaca tanpa menjalankan ulang) | Rekaman `labs/t5-replika/output/replika.txt` bagian A (primary, `replika_laporan` dan `replika_sinkron` berstatus streaming dan async; jurnal 10200, posting 20400, buku 10288 di tiga node) dan B (UPDATE, INSERT, DELETE, TRUNCATE, CREATE TABLE, CREATE INDEX, ALTER TABLE, DROP TABLE, SELECT FOR UPDATE, dan PREPARE TRANSACTION dijawab 25006; SET TRANSACTION READ WRITE dijawab 0A000; jumlah baris dan saldo tiga node tidak berubah), `jeda.txt` bagian A (100 pembayaran per detik selama 10 detik: 1000 dari 1000 semua 201; replay_lag tertinggi di bawah 1 detik dan jeda byte di bawah 16 MiB sebagai batas) dan B (pg_wal_replay_pause: selisih jurnal bayar 5), `konflik.txt` bagian A (max_standby_streaming_delay 30s, hot_standby_feedback off, statement_timeout 0), B (query 3 detik selesai), C (timeout 20 detik, query 45 detik: 57014, paling sedikit 20 dan kurang dari 30 detik, confl_snapshot 0) dan D (tanpa timeout: 40001, paling sedikit 30 dan kurang dari 60 detik, confl_snapshot 1), `baca.txt` bagian A (saldo buku primary 215000, replica 250000, POST /kiriman Rp240.000 ke K00504: 422 saldo-kurang; pembayaran Rp240.000 tidak dipakai karena MaksBayar 200000); kode `labs/api-t5/internal/service/bayar.go` baris 58 sampai 65 (DalamTx, KunciBukuAkun, dari.Saldo < jumlah dibaca sesudah lock), `kirim.go` baris 42 (komentar: kedua buku dikunci di dalam transaction jurnal, batas harian dan saldo dibaca sesudah lock), `cmd/api/main.go` baris 153 sampai 161 (REPLIKA_DATABASE_URL), `internal/service/replika.go` (satu-satunya berkas bukan tes yang memakai `s.replika`), migrasi `000025_tabel_tahap5.up.sql` (`ringkasan_merchant_harian`, PRIMARY KEY `(merchant_akun_id, tanggal)`; tidak ada kode yang mengisinya), `labs/t5-replika/run.py` (query konflik `SELECT count(*), pg_sleep(N) FROM replika_uji.k`), `init-primary.sh` (slot fisik `slot_laporan` dan `slot_sinkron`; `max_slot_wal_keep_size` tidak diatur di berkas lab). PostgreSQL 17.11, go1.27.3, pgx v5.11.0 | 5.5 (Inti, Rantai, Cara kerjanya, Cek diri, widget tebak dan banding): angka rekaman dan label 'dibaca dari kode' | Baru |",
  "| R5-131 | Hitungan 5.5 atas angka yang tertulis di halaman (Hitungan, Asumsi) | Dihitung dengan skrip sendiri dari angka naskah Tahap 5 dan halaman 5.4, dibaca 2026-11-03: 100 ÷ 69,4 = 1,44 (1,4); (1.388,9 − 69,4) × 0,02 = 26,39 (26,4) dan ÷ 5 = 5,28 (528%); (1.388,9 − 46,3) × 0,02 = 26,85 (26,9); 666,7 × 0,02 = 13,33 (13,3); 20 detik ÷ 0,02 detik = 1.000; 600.000 ÷ 200.000 = 3 dan 400.000 ÷ 200.000 = 2. Asumsi naskah: query 20 ms, statement_timeout 20 detik, ambang jeda 5 detik (PRD v5, Asumsi produk), p95 laporan 1 detik untuk replica kedua. Persentase 26,9 tidak ditulis karena pembulatan 26,9 ÷ 5 dan 26,85 ÷ 5 berbeda | 5.5 (Kenapa ini ada, Jeda replica, Query panjang, Kapan keputusan ini salah): label Hitungan atas Asumsi | Baru |",
  "| R5-132 | PostgreSQL 17.11: Hot Standby dan parameter replikasi (dibaca untuk halaman 5.5) | postgresql.org/docs/17/hot-standby.html (footer 'PostgreSQL 17.11 Documentation', dibuka 2026-11-03): 'Transactions started during hot standby will never be assigned a transaction ID and cannot write to the system write-ahead log.' Daftar galat: DML (INSERT, UPDATE, DELETE, MERGE, COPY FROM, TRUNCATE), DDL (CREATE, DROP, ALTER, COMMENT), 'SELECT ... FOR SHARE \\| UPDATE, because row locks cannot be taken without updating the underlying data files', perintah two-phase commit, dan SET TRANSACTION READ WRITE. 'Application of a vacuum cleanup record from WAL conflicts with standby transactions whose snapshots can still \"see\" any of the rows to be removed.' 'Once the delay specified by max_standby_archive_delay or max_standby_streaming_delay has been exceeded, conflicting queries will be canceled.' 'Keep in mind however that a long-running query could cause other sessions on the standby server to not see recent changes on the primary, if it delays application of WAL records.' hot_standby_feedback 'prevents VACUUM from removing recently-dead rows' dan 'this will delay cleanup of dead rows on the primary, which may result in undesirable table bloat'. postgresql.org/docs/17/runtime-config-replication.html (dibuka 2026-11-03): max_standby_streaming_delay 'The default is 30 seconds' dan 'not the same as the maximum length of time a query can run before cancellation; rather it is the maximum total time allowed to apply WAL data once it has been received from the primary server'; hot_standby_feedback 'can cause database bloat on the primary for some workloads' dan 'The default value is off'; max_slot_wal_keep_size 'If max_slot_wal_keep_size is -1 (the default), replication slots may retain an unlimited amount of WAL files' dan 'the standby using the slot may no longer be able to continue replication due to removal of required WAL files'. Halaman Hot Standby tidak menyebut nilai bawaan max_standby_streaming_delay | 5.5 (Cara kerjanya, ADR 46, pre-mortem, Kapan salah) | Tidak berubah |",
  "| R5-133 | Stack lain untuk memisahkan koneksi baca dan tulis (dibaca untuk halaman 5.5) | github.com/prisma/extension-read-replicas README (dibaca dari teks mentah raw.githubusercontent.com, dibuka 2026-11-03; npm @prisma/extension-read-replicas 0.5.0, terbit 2025-12-02): 'Requires Prisma 7.0+', 'All non-transactional read queries will now be executed against the defined replicas. Write queries and transactions will be executed against the primary server.', `$primary()` dan `$replica()`; kata lag, stale, dan consistency tidak ada di README. laravel.com/docs/13.x/database (dibuka 2026-11-03): kunci `read`, `write`, `sticky`; 'When multiple values exist in the host configuration array, a database host will be randomly chosen for each request'; sticky 'during the current request cycle'; middleware PreventStaleDatabaseReads: 'By default, requests within two seconds of a write will use the write connection for reads on that connection'. docs.djangoproject.com/en/5.2/topics/db/multi-db/ (Django 5.2, dibuka 2026-11-03): contoh PrimaryReplicaRouter dan 'it doesn't provide any solution for handling replication lag'. supabase.com/docs/guides/platform/read-replicas (tanpa nomor versi, dibuka 2026-11-03): 'Replication is asynchronous to ensure that transactions on the Primary aren't blocked', 'There is a delay between an update on the Primary and the time that a Read Replica receives the change', 'A load balancer automatically balances requests between your Primary database and Read Replicas', 'Read Replicas only support GET requests from the REST API'. docs.serverpod.dev/concepts/database/connection tidak terbaca saat dibuka 2026-11-03 (isi kosong) [perlu verifikasi] | 5.5 (Di stack lain: tab Node.js, Laravel, Django, Dart, Supabase) | Baru |",
  "| R5-134 | Selisih naskah ADR 46 dengan lab dan dokumentasi untuk halaman 5.5 (penalaran dari rekaman, bukan sumber luar) | Naskah ADR 46 menulis statement_timeout 20 detik 'supaya query tidak dibatalkan karena konflik dengan WAL': rekaman `konflik.txt` C dan D menunjukkan query 45 detik dihentikan di kedua kasus (57014 pada 20 detik, 40001 pada 30 detik), jadi timeout mengganti pembatalan dan mempersingkat replay tertahan, bukan mencegahnya; halaman menulis versi rekaman. Naskah menulis laporan hari ini dibaca dari replica lewat index riwayat dan laporan periode dari `ringkasan_merchant_harian` yang diisi job idempoten: lab t5-replika membaca akun dan riwayat dari replica, bukan laporan (README lab), dan tidak ada kode yang mengisi `ringkasan_merchant_harian`, jadi bagian itu berlabel Tidak dijalankan (desain). Naskah menulis jeda ±2 detik untuk M41: jeda alami di lab di bawah 1 detik pada 100 pembayaran per detik, jadi ±2 detik tetap Ilustrasi. Naskah menyebut Redis, index tambahan, push, dan CDC sebagai opsi: hanya Redis punya rekaman (`laporan.txt` C); ketiganya yang lain Tidak dijalankan. Slot fisik lab memakai bawaan max_slot_wal_keep_size -1 (R5-132); disk primary penuh bila replica mati lama adalah kesimpulan dari dokumentasi, tidak direkam. Naskah tidak menulis batas query laporan yang dibatalkan yang diterima merchant | 5.5 (ADR 46, pre-mortem, Sengaja belum); usulan ke badan PR | Baru |"
];
export const DIAGRAM_DAUN: [string, string | number | boolean][] = [
 [
  ".id",
  "t5-replica-inti"
 ],
 [
  ".judul",
  "Replica baca-saja, uang di primary"
 ],
 [
  ".sumber.jenis",
  "rekaman"
 ],
 [
  ".sumber.teks",
  "Rekaman lab: replika.txt dan baca.txt"
 ],
 [
  ".baris[0].label",
  "Replica"
 ],
 [
  ".baris[0].sub",
  "replika.txt bagian A dan B"
 ],
 [
  ".baris[0].simpul[0].teks",
  "Isi sama di tiga node"
 ],
 [
  ".baris[0].simpul[0].sub",
  "10.200 jurnal"
 ],
 [
  ".baris[0].simpul[0].nada",
  "good"
 ],
 [
  ".baris[0].simpul[1].teks",
  "UPDATE dan DDL ditolak: 25006"
 ],
 [
  ".baris[0].simpul[1].sub",
  "replica baca-saja"
 ],
 [
  ".baris[0].simpul[1].nada",
  "system"
 ],
 [
  ".baris[1].label",
  "Uang"
 ],
 [
  ".baris[1].sub",
  "baca.txt bagian A"
 ],
 [
  ".baris[1].simpul[0].teks",
  "Replica Rp250.000"
 ],
 [
  ".baris[1].simpul[0].sub",
  "saldo tampil, replay ditahan"
 ],
 [
  ".baris[1].simpul[0].nada",
  "old"
 ],
 [
  ".baris[1].simpul[1].teks",
  "Primary Rp215.000"
 ],
 [
  ".baris[1].simpul[1].sub",
  "saldo yang menentukan"
 ],
 [
  ".baris[1].simpul[1].nada",
  "system"
 ],
 [
  ".baris[1].simpul[2].teks",
  "Kiriman Rp240.000 ditolak: saldo kurang"
 ],
 [
  ".baris[1].simpul[2].sub",
  "422"
 ],
 [
  ".baris[1].simpul[2].nada",
  "good"
 ],
 [
  ".catatan",
  "Abu-abu: yang tertinggal. Biru: sumber yang menentukan. Hijau: hasilnya. Replay di replica ditahan dengan sengaja di baris bawah, jadi selisih Rp35.000 adalah jeda buatan, bukan jeda alami."
 ]
];
export const TEBAK_DAUN: [string, string | number | boolean][] = [
 [
  ".id",
  "t5-replica-tebak"
 ],
 [
  ".judul",
  "Query 45 detik di replica dengan statement_timeout 20 detik"
 ],
 [
  ".sumber.jenis",
  "rekaman"
 ],
 [
  ".sumber.teks",
  "labs/t5-replika/output/konflik.txt bagian A, C, dan D; dokumentasi PostgreSQL 17, Hot Standby dan max_standby_streaming_delay"
 ],
 [
  ".adegan[0]",
  "Wulan memasang read replica dengan pengaturan bawaan, lalu memasang statement_timeout 20 detik di sesi laporan."
 ],
 [
  ".adegan[1]",
  "Satu query membaca tabel lalu menunggu 45 detik. Selama itu primary menghapus 1.000 baris yang dibaca query itu dan menjalankan VACUUM."
 ],
 [
  ".pertanyaan",
  "Apa yang terjadi pada query itu?"
 ],
 [
  ".pilihan[0].teks",
  "Query selesai sesudah 45 detik, karena replica selalu menunggu query yang sedang berjalan."
 ],
 [
  ".pilihan[0].benar",
  false
 ],
 [
  ".pilihan[0].alasan",
  "Replica menunggu paling lama 30 detik menurut max_standby_streaming_delay bawaan, bukan sampai query selesai. Tanpa timeout, query 45 detik dibatalkan (konflik.txt bagian D)."
 ],
 [
  ".pilihan[1].teks",
  "Query dihentikan oleh konflik dengan replay sesudah paling sedikit 30 detik, dengan kode 40001."
 ],
 [
  ".pilihan[1].benar",
  false
 ],
 [
  ".pilihan[1].alasan",
  "Itu hasil tanpa statement_timeout (bagian D). Dengan timeout 20 detik, timeout menghentikan query lebih dulu."
 ],
 [
  ".pilihan[2].teks",
  "Query dihentikan oleh timeout sesudah paling sedikit 20 detik, dengan kode 57014, sebelum konflik sempat membatalkannya."
 ],
 [
  ".pilihan[2].benar",
  true
 ],
 [
  ".pilihan[2].alasan",
  "Rekaman bagian C: berhenti sesudah paling sedikit 20 detik dan sebelum 30 detik, dengan 57014, dan pencacah konflik tetap 0. Timeout tidak mencegah pembatalan. Ia menggantinya dengan penghentian yang lebih awal."
 ],
 [
  ".pilihan[3].teks",
  "Query tidak dihentikan, karena hot_standby_feedback membuat primary menahan baris itu."
 ],
 [
  ".pilihan[3].benar",
  false
 ],
 [
  ".pilihan[3].alasan",
  "hot_standby_feedback bernilai off di lab (konflik.txt bagian A), dan dokumentasi menulis bawaannya off. Bila dinyalakan, primary menunda pembersihan baris yang dibaca replica, dan pada beberapa beban tabelnya membengkak."
 ],
 [
  ".penutup",
  "statement_timeout 20 detik tidak mencegah pembatalan query yang lama. Ia menghentikannya lebih awal (57014 sesudah paling sedikit 20 detik, bukan 40001 sesudah paling sedikit 30 detik), sehingga replay tertahan lebih singkat."
 ],
 [
  ".label.sumber",
  "Rekaman lab · konflik.txt"
 ],
 [
  ".label.tebakDulu",
  "Tebak dulu:"
 ],
 [
  ".label.benar",
  "Tepat"
 ],
 [
  ".label.belum",
  "Belum tepat"
 ],
 [
  ".label.ulang",
  "Coba pilihan lain"
 ],
 [
  ".label.jawaban",
  "Jawaban yang tepat"
 ]
];
export const BANDING_DAUN: [string, string | number | boolean][] = [
 [
  ".judul",
  "Bacaan laporan dan uang: semua dari primary, atau laporan dari replica"
 ],
 [
  ".opsi[0].id",
  "satu"
 ],
 [
  ".opsi[0].nama",
  "A · Semua dari primary (versi pertama)"
 ],
 [
  ".opsi[0].baris[0][0].id",
  "app"
 ],
 [
  ".opsi[0].baris[0][0].label",
  "App"
 ],
 [
  ".opsi[0].baris[0][0].sub",
  "merchant dan karyawan"
 ],
 [
  ".opsi[0].baris[0][1].id",
  "api"
 ],
 [
  ".opsi[0].baris[0][1].label",
  "API"
 ],
 [
  ".opsi[0].baris[0][1].sub",
  "api-t5"
 ],
 [
  ".opsi[0].baris[1][0].id",
  "pri"
 ],
 [
  ".opsi[0].baris[1][0].label",
  "Primary"
 ],
 [
  ".opsi[0].baris[1][0].sub",
  "satu PostgreSQL"
 ],
 [
  ".opsi[0].baris[2][0].id",
  "uang"
 ],
 [
  ".opsi[0].baris[2][0].label",
  "Bayar dan kirim"
 ],
 [
  ".opsi[0].baris[2][1].id",
  "lap"
 ],
 [
  ".opsi[0].baris[2][1].label",
  "Laporan hari ini"
 ],
 [
  ".opsi[0].baris[2][2].id",
  "batas"
 ],
 [
  ".opsi[0].baris[2][2].label",
  "Cek batas harian"
 ],
 [
  ".opsi[0].judulBaris[0]",
  ""
 ],
 [
  ".opsi[0].judulBaris[1]",
  "Tempat membaca dan menulis"
 ],
 [
  ".opsi[0].judulBaris[2]",
  "Yang dikerjakan"
 ],
 [
  ".opsi[1].id",
  "pisah"
 ],
 [
  ".opsi[1].nama",
  "B · Laporan dari replica (ADR 46)"
 ],
 [
  ".opsi[1].baris[0][0].id",
  "app"
 ],
 [
  ".opsi[1].baris[0][0].label",
  "App"
 ],
 [
  ".opsi[1].baris[0][0].sub",
  "merchant dan karyawan"
 ],
 [
  ".opsi[1].baris[0][1].id",
  "api"
 ],
 [
  ".opsi[1].baris[0][1].label",
  "API"
 ],
 [
  ".opsi[1].baris[0][1].sub",
  "api-t5"
 ],
 [
  ".opsi[1].baris[1][0].id",
  "pri"
 ],
 [
  ".opsi[1].baris[1][0].label",
  "Primary"
 ],
 [
  ".opsi[1].baris[1][0].sub",
  "tulisan dan uang"
 ],
 [
  ".opsi[1].baris[1][1].id",
  "rep"
 ],
 [
  ".opsi[1].baris[1][1].label",
  "Replica"
 ],
 [
  ".opsi[1].baris[1][1].sub",
  "asinkron, baca-saja"
 ],
 [
  ".opsi[1].baris[2][0].id",
  "uang"
 ],
 [
  ".opsi[1].baris[2][0].label",
  "Bayar dan kirim"
 ],
 [
  ".opsi[1].baris[2][1].id",
  "lap"
 ],
 [
  ".opsi[1].baris[2][1].label",
  "Laporan hari ini"
 ],
 [
  ".opsi[1].baris[2][2].id",
  "batas"
 ],
 [
  ".opsi[1].baris[2][2].label",
  "Cek batas harian"
 ],
 [
  ".opsi[1].judulBaris[0]",
  ""
 ],
 [
  ".opsi[1].judulBaris[1]",
  "Tempat membaca dan menulis"
 ],
 [
  ".opsi[1].judulBaris[2]",
  "Yang dikerjakan"
 ],
 [
  ".fitur[0].label",
  "Bayar atau kirim uang"
 ],
 [
  ".fitur[0].sorot.satu[0]",
  "app"
 ],
 [
  ".fitur[0].sorot.satu[1]",
  "api"
 ],
 [
  ".fitur[0].sorot.satu[2]",
  "pri"
 ],
 [
  ".fitur[0].sorot.satu[3]",
  "uang"
 ],
 [
  ".fitur[0].sorot.pisah[0]",
  "app"
 ],
 [
  ".fitur[0].sorot.pisah[1]",
  "api"
 ],
 [
  ".fitur[0].sorot.pisah[2]",
  "pri"
 ],
 [
  ".fitur[0].sorot.pisah[3]",
  "uang"
 ],
 [
  ".fitur[0].catatan.satu",
  "Primary mengunci buku pengirim dan penerima di dalam satu transaction, lalu memeriksa saldo sesudah lock (kode Bayar dan Kirim di api-t5)."
 ],
 [
  ".fitur[0].catatan.pisah",
  "Sama. Saldo yang menentukan tetap dibaca dari primary: kiriman Rp240.000 ditolak walau saldo tampil di replica Rp250.000 (baca.txt bagian A, replay ditahan dengan sengaja)."
 ],
 [
  ".fitur[1].label",
  "Laporan penjualan hari ini"
 ],
 [
  ".fitur[1].sorot.satu[0]",
  "app"
 ],
 [
  ".fitur[1].sorot.satu[1]",
  "api"
 ],
 [
  ".fitur[1].sorot.satu[2]",
  "pri"
 ],
 [
  ".fitur[1].sorot.satu[3]",
  "lap"
 ],
 [
  ".fitur[1].sorot.pisah[0]",
  "app"
 ],
 [
  ".fitur[1].sorot.pisah[1]",
  "api"
 ],
 [
  ".fitur[1].sorot.pisah[2]",
  "rep"
 ],
 [
  ".fitur[1].sorot.pisah[3]",
  "lap"
 ],
 [
  ".fitur[1].catatan.satu",
  "Laporan menjumlah posting di primary yang sama dengan pembayaran (laporan.txt bagian A). Perlambatannya tidak terekam, dan 666,7 laporan per detik adalah Hitungan atas Asumsi."
 ],
 [
  ".fitur[1].catatan.pisah",
  "Dibaca dari replica, yang menolak tulisan dengan 25006, jadi laporan tidak bisa mengubah uang. Laporan tertinggal sebesar jeda replica, di lab di bawah 1 detik pada 100 pembayaran per detik (jeda.txt bagian A). Laporan dari replica belum dijalankan di lab: Tidak dijalankan."
 ],
 [
  ".fitur[1].nada.satu",
  "warn"
 ],
 [
  ".fitur[1].nada.pisah",
  "warn"
 ],
 [
  ".fitur[2].label",
  "Query laporan 45 detik"
 ],
 [
  ".fitur[2].sorot.satu[0]",
  "app"
 ],
 [
  ".fitur[2].sorot.satu[1]",
  "api"
 ],
 [
  ".fitur[2].sorot.satu[2]",
  "pri"
 ],
 [
  ".fitur[2].sorot.satu[3]",
  "lap"
 ],
 [
  ".fitur[2].sorot.pisah[0]",
  "app"
 ],
 [
  ".fitur[2].sorot.pisah[1]",
  "api"
 ],
 [
  ".fitur[2].sorot.pisah[2]",
  "rep"
 ],
 [
  ".fitur[2].sorot.pisah[3]",
  "lap"
 ],
 [
  ".fitur[2].catatan.satu",
  "Tidak direkam. Lab hanya menjalankan query 45 detik di replica (konflik.txt)."
 ],
 [
  ".fitur[2].catatan.pisah",
  "Dengan statement_timeout 20 detik, timeout menghentikan query dengan 57014 sesudah paling sedikit 20 detik. Tanpa timeout, konflik dengan replay membatalkannya dengan 40001 sesudah paling sedikit 30 detik (konflik.txt bagian C dan D)."
 ],
 [
  ".fitur[2].nada.pisah",
  "warn"
 ],
 [
  ".fitur[3].label",
  "Cek batas harian kiriman"
 ],
 [
  ".fitur[3].sorot.satu[0]",
  "app"
 ],
 [
  ".fitur[3].sorot.satu[1]",
  "api"
 ],
 [
  ".fitur[3].sorot.satu[2]",
  "pri"
 ],
 [
  ".fitur[3].sorot.satu[3]",
  "batas"
 ],
 [
  ".fitur[3].sorot.pisah[0]",
  "app"
 ],
 [
  ".fitur[3].sorot.pisah[1]",
  "api"
 ],
 [
  ".fitur[3].sorot.pisah[2]",
  "pri"
 ],
 [
  ".fitur[3].sorot.pisah[3]",
  "batas"
 ],
 [
  ".fitur[3].catatan.satu",
  "Kedua buku dikunci di dalam transaction jurnal, lalu batas harian dan saldo dibaca sesudah lock (komentar dan kode Kirim di api-t5)."
 ],
 [
  ".fitur[3].catatan.pisah",
  "Tetap primary. Aturan ADR 45 menulis uang tidak dibaca dari salinan di luar primary, dan replica hanya untuk laporan."
 ]
];
export const PROFIL_BARIS: string[] = [
 "",
 "",
 "",
 "",
 "",
 "",
 "",
 "",
 "",
 "",
 "",
 "",
 "tetap:1 primary:1 laporan:1",
 "",
 "semua:1 Rekaman lab:1 primary:1 standby:2 database:1 25006:1 lab:1",
 "primary:2 replica:2 laporan:1 replay:1 ditolak:1 ditahan:1",
 "",
 "",
 "standby:1 ditolak:1",
 "tanpa:1 replica:1 detik:2 timeout:2",
 "primary:1 replica:1 ditolak:1",
 "",
 "",
 "",
 "tetap:1 primary:1 replica:1 query:1 lebih:1 detik:2 timeout:1 konflik:1",
 "satu:1 kedua:1 replica:1 query:1 detik:1",
 "bukan:1 tanpa:2 Rekaman lab:1 Tidak dijalankan:1 Asumsi:1 Hitungan:1 lab:1 bukan hasil ukuran:1",
 "",
 "",
 "tetap:1 satu:1 kedua:1 primary:2 replica:1 laporan:1",
 "",
 "tidak:1 sebelum:1 sesudah:2 query:1 paling:2 57014:1 40001:1 detik:2 paling sedikit:2 timeout:2 konflik:3",
 "kedua:1 primary:1 replica:1 laporan:1",
 "",
 "",
 "",
 "",
 "sama:1 Rekaman lab:1 Asumsi:1 Hitungan:1 primary:1 pembayaran:1 laporan:3 detik:1 merchant:1 lab:1",
 "dua:2 pertama:1 kedua:1 Asumsi:1 Hitungan:1 replica:1 laporan:1 merchant:1 yaitu:2",
 "tidak:1 hanya:1 primary:1 replica:1 laporan:1",
 "",
 "sebelum:1 primary:1 standby:1 query:1 WAL:3",
 "satu:1 dua:1 primary:1 standby:2 laporan:3 lab:1 WAL:1 slot:3",
 "dua:2 Rekaman lab:1 standby:1 lab:1 slot:1",
 "tidak:1 primary:1 standby:1",
 "tidak:2 standby:1 bisa:1 ditolak:1 WAL:1",
 "Rekaman lab:1 replica:1 lab:1 ditolak:1",
 "Rekaman lab:1 lab:1",
 "sama:1 tiga:1 bukan:1 semua:1 standby:1 25006:1 0A000:1 lab:1",
 "tidak:1 hanya:1 kedua:1 replica:1 standby:1 pembayaran:2 direkam:1 tidak direkam:1 detik:3 di bawah:1 replay:1 jeda:1",
 "Rekaman lab:1 lab:1 di bawah:1 jeda:3",
 "dua:1 Asumsi:1 Hitungan:1 detik:1 lab:1",
 "tidak:1 hanya:1 bukan:1 Ilustrasi:1 Asumsi:1 laporan:1 paling:1 detik:3 lab:1 cerita:1 di bawah:1 paling lama:1",
 "belum:1 replay:2 jeda:1 WAL:1",
 "bukan:1 Rekaman lab:1 lab:1 jeda:4",
 "satu:1 standby:2 query:1 database:1 bisa:1 replay:1 yaitu:1 WAL:1",
 "sama:1 sesudah:1 bukan:1 primary:1 standby:1 query:2 detik:1 lab:1 replay:1 WAL:2",
 "Rekaman lab:1 replica:1 lab:1 bawaan:1 konflik:2",
 "tidak:1 Asumsi:1 query:1 laporan:1 ms:1 detik:3 lab:1 timeout:2 replay:1",
 "Rekaman lab:1 detik:1 lab:1 timeout:1 konflik:2",
 "sama:1 replica:1 query:1 timeout:1 konflik:2",
 "tanpa:1 Rekaman lab:1 lab:1 timeout:1 konflik:2",
 "tidak:1 sesudah:2 satu:1 Asumsi:1 query:1 laporan:1 lebih:1 paling:2 57014:1 40001:1 detik:6 paling sedikit:2 replay:1 WAL:1",
 "tidak:1 hanya:1 bukan:1 juga:1 replica:1 standby:1 query:2 bisa:2 jeda:1 WAL:1",
 "tidak:1 Tidak dijalankan:1 primary:3 standby:1 bisa:1",
 "tidak:1 Budi:1 primary:1 replica:1 422:1 replay:1 ditolak:1 ditahan:1",
 "Rekaman lab:1 primary:1 replica:1 lab:1 ditolak:1",
 "bukan:2 tanpa:1 pembayaran:2 lab:1 jeda:2 ditolak:1 ditahan:1",
 "sama:1",
 "sesudah:1 primary:1 lab:1",
 "hanya:1 Tidak dijalankan:1 primary:1 dibaca dari kode:1 yaitu:1",
 "tidak:1 satu:1 merchant:4",
 "tidak:3 hanya:2 satu:1 dua:1 Tidak dijalankan:1 Asumsi:1 Hitungan:1 penalaran:1 replica:1 laporan:1 merchant:3 lab:2 naskah:1 di atas:1",
 "",
 "satu:2",
 "tidak:1 hanya:1 Ilustrasi:1 lab:1",
 "",
 "slot:1",
 "lab:1 konflik:1 jeda:1",
 "",
 "semua:1 primary:1 replica:1",
 "",
 "slot:1",
 "Tidak dijalankan:1 Ilustrasi:1 di bawah:1",
 "",
 "",
 "",
 "tidak:1 primary:3 replica:2 jeda:1",
 "",
 "slot:1",
 "Tidak dijalankan:1 Ilustrasi:1 database:1 di bawah:1",
 "",
 "",
 "",
 "",
 "",
 "hanya:1 sesudah:1 satu:1 detik:1 bawaan:1",
 "",
 "slot:1",
 "Tidak dijalankan:1 Ilustrasi:1 di bawah:1",
 "",
 "",
 "replica:2",
 "",
 "primary:1",
 "tidak:2 replica:1 query:1 jeda:1",
 "",
 "slot:1",
 "tidak:1 Tidak dijalankan:1 database:2",
 "tidak:2",
 "",
 "slot:1",
 "tanpa:1 Tidak dijalankan:1",
 "hanya:1 primary:2 replica:3 jeda:1 GET:1",
 "",
 "",
 "",
 "",
 "tetap:1 satu:1 primary:1 replica:1 laporan:1",
 "Asumsi:2 Hitungan:1 primary:1 laporan:2 paling:1 detik:1 merchant:1 paling lama:1",
 "tidak:1 sesudah:1",
 "primary:1 replica:1 laporan:1",
 "",
 "bukan:1 primary:2 standby:1 query:1 laporan:4 database:1 detik:2 WAL:1",
 "tidak:1 bukan:1 penalaran:1 primary:1 laporan:2 database:1",
 "satu:2 bukan:1 tanpa:1 Asumsi:1 Hitungan:1 replica:1 hit:1 query:3 laporan:1 bisa:1 detik:2 warung:1 bawaan:1 jeda:1 WAL:1 slot:1",
 "satu:2 kedua:1 penalaran:1 bisa:1 detik:1 konflik:1 jeda:1 slot:1",
 "Rekaman lab:2 Tidak dijalankan:3 penalaran:1 query:1 laporan:2 ms:1 lab:2 di bawah:1 konflik:1 jeda:1",
 "",
 "replica:1 standby:1 laporan:2 merchant:1 lab:1",
 "Tidak dijalankan:1 primary:1 lab:2",
 "belum:1 Tidak dijalankan:1 replica:1 merchant:1 lab:1",
 "tidak:1 Asumsi:1 replica:1 standby:1 query:1 laporan:1 lebih:1 detik:2 di bawah:1 bawaan:1 timeout:1 replay:1",
 "tetap:1 primary:1 standby:1 bisa:1",
 "Asumsi:1 primary:1 replica:1 lebih:1 detik:1 replay:1 jeda:1",
 "bukan:1",
 "tidak:1 sesudah:1 satu:2 dua:1 kedua:1 Hitungan:1 cache:1 hit:2 laporan:1 lebih:1 bisa:1 detik:3 merchant:1 warung:1 ditolak:1",
 "hanya:1 satu:2 Tidak dijalankan:1 query:3 laporan:1 ms:1 warung:1 di bawah:1 ditolak:1",
 "tidak:1 Tidak dijalankan:1 query:1 ditolak:1",
 "tidak:1 hanya:1 satu:1 tanpa:1 laporan:1 bawaan:1 yaitu:1 ditolak:1 WAL:1 slot:2",
 "paling:1",
 "hanya:1 laporan:2 detik:1 di bawah:1 jeda:1",
 "laporan:3 57014:1 40001:1 detik:2 di bawah:1 timeout:1",
 "tidak:1 tanpa:1 Tidak dijalankan:1 penalaran:1 primary:2 replica:1 laporan:1 bisa:1 melewati:1 bawaan:1 WAL:3 slot:4",
 "",
 "Asumsi:1 replica:1 pembayaran:1 detik:3 di bawah:1 melewati:1 jeda:3",
 "belum:1 tanpa:1 query:1 laporan:1 lebih:1 bisa:1 57014:1 merchant:1 timeout:1",
 "satu:1 kedua:1 semua:1 Asumsi:2 Hitungan:1 replica:3 p95:1 laporan:1 detik:1 melewati:1",
 "primary:1 standby:1 bisa:1",
 "tidak:1 laporan:1",
 "sesudah:1 Budi:1 tanpa:1 primary:1 replica:1",
 "belum:1",
 "",
 "",
 "tidak:1 merchant:1 lab:1",
 "bukan:1 replica:1 laporan:1 merchant:1 lab:1",
 "kedua:1 Asumsi:1 p95:1 laporan:1 detik:1",
 "hanya:1 WAL:1 slot:1",
 "",
 "",
 "",
 "standby:1 ditolak:1",
 "",
 "",
 "tidak:1 tiga:1 25006:1 0A000:1",
 "",
 "tanpa:1 replica:1 detik:2 timeout:2",
 "",
 "",
 "tidak:1 sebelum:1 sesudah:2 query:1 lebih:2 paling:2 57014:1 40001:1 detik:3 paling sedikit:2 timeout:1 konflik:2 replay:2",
 "",
 "bukan:1 primary:1 replica:1 pembayaran:1 ditolak:1",
 "",
 "",
 "tidak:1 satu:1 tanpa:1 primary:1 pembayaran:1 bisa:1 422:1 lab:1 ditolak:1",
 "",
 "replica:1 detik:1 ditolak:1",
 "",
 "",
 "satu:1 bukan:1 hit:1 TTL:1 pembayaran:1 laporan:1 bisa:1 detik:4 warung:1 lab:1 di bawah:1 replay:1 jeda:1",
 "",
 "",
 "hanya:1 tanpa:1 replica:1",
 "primary:1",
 "replica:1 standby:1 laporan:1 di bawah:1 timeout:1",
 "tidak:1 tanpa:1 primary:1 standby:1",
 "WAL:1",
 "replica:2 jeda:1",
 "",
 "",
 "",
 "",
 "database:1",
 "",
 "",
 "database:2",
 "",
 "cerita:1"
];

export const KALIMAT_TERKUNCI: string[] = [
  "import Blok from \"../../../components/Blok.astro\";",
  "import Rantai from \"../../../components/Rantai.astro\";",
  "import Snippet from \"../../../components/Snippet.astro\";",
  "import TabSet from \"../../../components/TabSet.astro\";",
  "import WidgetLama from \"../../../components/WidgetLama.astro\";",
  "import SkripLama from \"../../../components/SkripLama.astro\";",
  "import Tebak from \"../../../widgets/tebak/Tebak.tsx\";",
  "import intiDiagram from \"../../../../data/diagram/t5-replica-inti.json\";",
  "import dataTebak from \"../../../../data/widget/t5-replica-tebak.json\";",
  "<p class=\"meta\">Baca 16 menit · coba 4 menit · Prasyarat: [[t5-m40]] · Jalur inti</p>",
  "<Blok nama=\"Mulai\" buka>",
  "## Inti",
  "Replica menolak tulisan, jadi laporan pindah ke sana dan uang tetap dibaca dari primary.",
  "<Rantai data={intiDiagram} ringkas />",
  "Primary adalah database yang menerima semua tulisan. Replica adalah salinan yang menerima rekaman perubahan dari primary dan memutarnya ulang, dan PostgreSQL menyebut server penerima itu standby. Di Rekaman lab ([Label sumber](/cara-pakai/#label-sumber)) `replika.txt` bagian B, standby menolak UPDATE, DDL, `SELECT ... FOR UPDATE`, dan `PREPARE TRANSACTION` dengan kode 25006.",
  "Replica selalu sedikit tertinggal, jadi ADR 46 membagi bacaan: laporan dari replica, uang dari primary. Di `baca.txt` bagian A replay ditahan dengan sengaja, dan saldo tampil di replica Rp250.000 sedangkan saldo primary Rp215.000. Kiriman Rp240.000 ditolak.",
  "<details class=\"question\">",
  "<summary>Sudah tahu? Cek 3 pertanyaan</summary>",
  "1. Pernyataan apa yang ditolak standby, dan dengan kode apa?",
  "2. Query 45 detik di replica dengan `statement_timeout` 20 detik: kapan ia berhenti, dengan kode apa, dan apa yang berubah tanpa timeout?",
  "3. Saldo tampil di replica Rp250.000, saldo primary Rp215.000. Kiriman Rp240.000 diterima atau ditolak, dan saldo yang menentukan itu dibaca dari mana?",
  "Yakin dengan ketiganya? Lompat ke [[berikutnya]].",
  "</details>",
  "</Blok>",
  "<Blok nama=\"Coba\" buka aman=\"Kalau berhenti di sini, kamu sudah tahu: statement_timeout 20 detik di replica menghentikan query lama lebih awal daripada konflik pada 30 detik, dan saldo, kiriman, serta batas harian tetap dibaca dari primary.\">",
  "Tebak dulu apa yang terjadi pada query 45 detik di replica. Lalu pilih satu kejadian di widget perbandingan dan lihat bagian mana yang mengerjakannya di kedua susunan.",
  "Catatan di widget menyebut file rekaman dan bagiannya bila berasal dari Rekaman lab. Tidak dijalankan berarti dicek ke kode atau dokumentasi tanpa menjalankannya. Hitungan adalah hasil rumus dari angka yang tertulis di halaman ini, dan Asumsi adalah angka pilihan penulis tanpa rekaman. Penalaran adalah kesimpulan dari kode atau angka di halaman, bukan hasil ukuran.",
  "<Tebak client:visible data={dataTebak} />",
  "<WidgetLama nama=\"banding\" src=\"data/t5-replica-banding.json\" />",
  "**Ubah satu hal:** pindah dari Bayar atau kirim uang ke Laporan penjualan hari ini. Susunan B memindahkan tempat baca laporan dari primary ke replica. Bayar atau kirim uang dan Cek batas harian kiriman tetap di primary di kedua susunan.",
  "<noscript>",
  "<p>Tanpa JavaScript tebakan dan widget perbandingan tidak tampil. Jawaban yang tepat: query dihentikan oleh timeout sesudah paling sedikit 20 detik dengan kode 57014, sebelum konflik membatalkannya (konflik.txt bagian C). Tanpa timeout, konflik membatalkannya sesudah paling sedikit 30 detik dengan kode 40001 (bagian D).</p>",
  "<p>Di kedua susunan, Bayar atau kirim uang dan Cek batas harian kiriman dibaca dari primary. Di susunan B laporan hari ini dibaca dari replica.</p>",
  "</noscript>",
  "</Blok>",
  "<Blok nama=\"Paham\">",
  "### Kenapa ini ada",
  "[[t5-m40]] menunjukkan laporan merchant yang menjumlah posting di primary yang sama dengan pembayaran. Rekaman lab membuktikan jalurnya, dan hitungan memperkirakan bebannya: 666,7 laporan per detik dan 13,3 laporan berjalan serentak (Hitungan atas Asumsi, diturunkan di halaman itu).",
  "[[t4-adr-45]] menunda read replica dengan dua pemicu: laporan merchant real-time diminta, atau L baca mencapai 5 koneksi. L baca adalah jumlah bacaan yang berjalan serentak, yaitu laju dikali lama ([[t3-pool]]). PRD v5 memenuhi pemicu pertama ([[t5-prd]]). Pemicu kedua: (1.388,9 − 69,4) × 0,02 = 26,4 koneksi, yaitu 528% dari 5 (Hitungan atas Asumsi; dengan dua transaksi per user aktif, 26,9 koneksi).",
  "Aturan 2 di ADR itu sudah menulis batasnya: uang tidak dibaca dari salinan di luar primary, dan read replica hanya untuk laporan. ADR 46 menjalankan aturan itu.",
  "### Cara kerjanya",
  "**Replica menerima WAL dan memutarnya ulang.** PostgreSQL menulis tiap perubahan ke write-ahead log (WAL) sebelum mengubah data. Replica streaming menerima WAL itu dari primary dan memutarnya ulang. Standby yang menjawab query disebut hot standby.",
  "Lab `t5-replika` menjalankan satu primary dan dua standby di container lokal. Standby `replika_laporan` melayani laporan, dan `replika_sinkron` dipakai bagian sinkron dan promosi lab ([[t5-rpo-rto]]). Keduanya `streaming` dan `async`. Primary menahan WAL untuk tiap standby lewat slot replikasi fisik, `slot_laporan` dan `slot_sinkron`:",
  "<Snippet file=\"labs/t5-replika/output/replika.txt\" lines=\"22:33\" title=\"Rekaman lab: labs/t5-replika/output/replika.txt, bagian A (dua standby asinkron dan dua slot)\" />",
  "Asinkron berarti COMMIT di primary tidak menunggu standby. Ketiga node memuat 10.200 jurnal, 20.400 posting, dan 10.288 buku di bagian A.",
  "**Replica menolak tulisan.** Dokumentasi PostgreSQL 17 menulis bahwa transaction di hot standby tidak pernah mendapat transaction ID dan tidak bisa menulis ke WAL. Karena itu DML, DDL, `SELECT ... FOR SHARE | UPDATE`, dan perintah two-phase commit menghasilkan galat ([PostgreSQL 17.11, Hot Standby](https://www.postgresql.org/docs/17/hot-standby.html), dibuka 2026-11-03). Rekaman bagian B menunjukkan UPDATE yang ditolak, lalu penolakan yang lain:",
  "<Snippet file=\"labs/t5-replika/output/replika.txt\" lines=\"75:77\" title=\"Rekaman lab: labs/t5-replika/output/replika.txt, bagian B (UPDATE ditolak di replica)\" />",
  "<Snippet file=\"labs/t5-replika/output/replika.txt\" lines=\"102:111\" title=\"Rekaman lab: labs/t5-replika/output/replika.txt, bagian B (FOR UPDATE, SET TRANSACTION, dan PREPARE TRANSACTION)\" />",
  "UPDATE, INSERT, DELETE, TRUNCATE, CREATE, ALTER, DROP, `SELECT ... FOR UPDATE`, dan `PREPARE TRANSACTION` dijawab 25006. `SET TRANSACTION READ WRITE` dijawab 0A000. Pesannya milik mode baca-saja standby, bukan milik trigger append-only ledger (README lab). Sesudah semua penolakan, jumlah jurnal, posting, dan total saldo di tiga node sama dengan sebelumnya.",
  "**Jeda replica diukur sebagai batas.** Lab menjalankan 100 pembayaran per detik selama 10 detik lewat `api-t5`. Semua 1.000 pembayaran 201, dan jeda replay tertinggi di kedua standby ada di bawah 1 detik. Nilai jedanya tidak direkam, hanya batasnya:",
  "<Snippet file=\"labs/t5-replika/output/jeda.txt\" lines=\"5:12\" title=\"Rekaman lab: labs/t5-replika/output/jeda.txt, bagian A (jeda alami di bawah beban)\" />",
  "Laju lab 100 per detik adalah 100 ÷ 69,4 = 1,4 kali puncak transaksi uang Tahap 5 (Hitungan atas Asumsi). Dengan dua transaksi per user aktif puncaknya 46,3.",
  "Jeda ±2 detik di cerita [[t5-m41]] tidak terjadi dengan sendirinya di lab, jadi ia Ilustrasi. PRD v5 menulis data laporan tertinggal paling lama 5 detik ([[t5-prd]]; Asumsi produk). Rekaman hanya membuktikan batas di bawah 1 detik di laptop, bukan di produksi.",
  "Bagian B menahan replay dengan `pg_wal_replay_pause()` untuk memperagakan jeda. Replica sudah menerima WAL sampai posisi tulis terakhir tetapi belum memutarnya, dan selisihnya 5 jurnal bayar:",
  "<Snippet file=\"labs/t5-replika/output/jeda.txt\" lines=\"43:55\" title=\"Rekaman lab: labs/t5-replika/output/jeda.txt, bagian B (jeda buatan, bukan jeda alami)\" />",
  "**Query panjang bentrok dengan replay.** Query di standby memakai snapshot, yaitu foto isi database pada satu saat. Primary membuang baris lama lewat VACUUM dan mengirim catatan pembersihannya lewat WAL. Catatan itu bentrok dengan query di standby yang masih bisa melihat baris yang akan dibuang (PostgreSQL 17.11, Hot Standby).",
  "Standby lalu memilih: menunda replay, atau membatalkan query. Dokumentasi menulis bahwa `max_standby_streaming_delay` bawaannya 30 detik, dan bahwa nilai itu bukan batas lama query. Nilainya adalah total waktu yang diizinkan untuk menerapkan WAL sesudah WAL diterima dari primary ([PostgreSQL 17.11, Replication](https://www.postgresql.org/docs/17/runtime-config-replication.html), dibuka 2026-11-03). Pengaturan di lab sama dengan itu:",
  "<Snippet file=\"labs/t5-replika/output/konflik.txt\" lines=\"12:27\" title=\"Rekaman lab: labs/t5-replika/output/konflik.txt, bagian A (pengaturan bawaan replica)\" />",
  "Query lab memakai `pg_sleep` untuk menjadi panjang, jadi ia tidak mewakili query laporan 20 ms (Asumsi, [[t5-m40]]). Query 3 detik selesai dan replay menunggunya (bagian B). Query 45 detik dengan `statement_timeout` 20 detik berhenti oleh timeout:",
  "<Snippet file=\"labs/t5-replika/output/konflik.txt\" lines=\"51:54\" title=\"Rekaman lab: labs/t5-replika/output/konflik.txt, bagian C (timeout 20 detik)\" />",
  "Tanpa timeout, query yang sama dibatalkan oleh konflik, dan pencacah konflik di katalog replica naik dari 0 ke 1:",
  "<Snippet file=\"labs/t5-replika/output/konflik.txt\" lines=\"68:78\" title=\"Rekaman lab: labs/t5-replika/output/konflik.txt, bagian D (tanpa timeout)\" />",
  "Timeout tidak mencegah pembatalan. Ia menggantinya: 57014 sesudah paling sedikit 20 detik menggantikan 40001 sesudah paling sedikit 30 detik, dan replay tertahan lebih singkat. Lama itu diukur sejak query mulai, sedangkan dokumentasi menghitung 30 detik sejak WAL diterima. Angka 20 detik adalah Asumsi desain, dan 20 detik ÷ 0,02 detik = 1.000 kali lama normal satu laporan.",
  "Dokumentasi juga menulis bahwa query yang lama bisa membuat sesi lain di standby tidak melihat perubahan terbaru bila ia menunda penerapan WAL. Jadi query panjang di replica bisa menambah jeda, bukan hanya risiko dibatalkan.",
  "**`hot_standby_feedback` mencegah pembatalan dengan harga di primary.** Standby memberi tahu primary baris mana yang masih ia pakai, sehingga VACUUM menunda pembersihannya. Dokumentasi menulis bawaannya off, dan pengaturan ini bisa menggembungkan tabel di primary pada beberapa beban ([PostgreSQL 17.11, Replication](https://www.postgresql.org/docs/17/runtime-config-replication.html), dibuka 2026-11-03). Lab membiarkannya off dan tidak mengukur penggembungan (Tidak dijalankan).",
  "**Uang tidak dibaca dari replica.** Di `baca.txt` bagian A Budi membayar Rp35.000 ke Warung 505 sementara replay ditahan, dan jawaban bayar memuat saldo Rp215.000. Replica masih menjawab Rp250.000, sedangkan primary Rp215.000. Kiriman Rp240.000 ditolak dengan 422 `saldo-kurang`:",
  "<Snippet file=\"labs/t5-replika/output/baca.txt\" lines=\"44:60\" title=\"Rekaman lab: labs/t5-replika/output/baca.txt, bagian A (saldo di primary lawan replica, kiriman ditolak)\" />",
  "Rekaman memakai kiriman, bukan pembayaran. Satu pembayaran dibatasi Rp200.000, jadi Rp240.000 ditolak oleh batas itu tanpa membaca saldo (README lab). Replay yang ditahan adalah jeda buatan, bukan jeda alami.",
  "Di kode, `Bayar` mengunci buku pengirim dan penerima di dalam `DalamTx`, lalu membandingkan saldo. `Kirim` melakukan hal yang sama untuk batas harian dan saldo (komentar di `kirim.go`):",
  "<Snippet file=\"labs/api-t5/internal/service/bayar.go\" lines=\"58:65\" lang=\"go\" title=\"Kode lab: labs/api-t5/internal/service/bayar.go baris 58 sampai 65 (saldo dibaca sesudah lock di primary)\" />",
  "Di `labs/api-t5/internal`, selain tes, hanya `internal/service/replika.go` yang memakai `s.replika`. `Bayar` dan `Kirim` memakai `s.repo`, yaitu primary (dibaca dari kode, Tidak dijalankan).",
  "**Laporan periode dibaca dari ringkasan.** Tabel `ringkasan_merchant_harian` menyimpan jumlah transaksi dan total per merchant per hari, dengan PRIMARY KEY `(merchant_akun_id, tanggal)` ([[t5-skema]]). Desainnya: job mengisi satu baris per merchant per hari dari posting yang sudah lewat, dengan `INSERT ... ON CONFLICT DO UPDATE`, supaya menjalankannya lagi tidak menambah baris.",
  "Tabel itu ada di lab, tetapi tidak ada kode di `labs/api-t5` yang mengisinya, dan lab `t5-replika` tidak membaca laporan dari replica. Bagian ini Tidak dijalankan: ia desain. Rata-rata satu merchant hanya 3 transaksi per hari (600.000 ÷ 200.000), atau 2 dengan dua transaksi per user aktif (Hitungan atas Asumsi). Jadi ringkasan hanya menolong merchant jauh di atas rata-rata atau rentang panjang (penalaran), dan sebaran transaksi per merchant tidak ada di naskah.",
  "### Di stack lain",
  "**Skenario:** satu app memisahkan koneksi baca dari koneksi tulis. Yang ditanyakan: bagaimana kode memilih koneksi, dan apa yang terjadi bila satu request menulis lalu membaca.",
  "Tab Go dijalankan di lab. Tab lain tidak dijalankan, dan hanya dicek ke dokumentasi pada 2026-11-03. Kode di tab lain adalah Ilustrasi.",
  "<TabSet id=\"stack\" labels={[\"Go\", \"Node.js\", \"Laravel\", \"Django\", \"Dart (Serverpod)\", \"Supabase\"]}>",
  "<Fragment slot=\"t0\">",
  "*Dijalankan: lab api-t5 dan t5-replika, PostgreSQL 17.11, Go 1.27.3, dan pgx v5.11.0 (rekaman `replika.txt`, `jeda.txt`, `konflik.txt`, `baca.txt`).*",
  "<Snippet file=\"labs/api-t5/cmd/api/main.go\" lines=\"153:161\" lang=\"go\" title=\"labs/api-t5/cmd/api/main.go\" />",
  "**Yang berbeda di stack ini:** pilihan koneksi ditulis tangan. DSN replica datang dari `REPLIKA_DATABASE_URL`, lalu `Service` memilih sendiri tempat membaca. Tanpa variabel itu semua bacaan dari primary.",
  "</Fragment>",
  "<Fragment slot=\"t1\">",
  "*Tidak dijalankan. Dicek ke README [@prisma/extension-read-replicas](https://github.com/prisma/extension-read-replicas) (npm 0.5.0, terbit 2025-12-02, butuh Prisma 7.0 ke atas), dibuka 2026-11-03. Kode di bawah adalah Ilustrasi.*",
  "<Snippet lang=\"js\" code={`const prisma = new PrismaClient().$extends(",
  "readReplicas({ replicas: [replika] }),",
  ");`} />",
  "**Yang berbeda di stack ini:** README menulis bahwa bacaan non-transaksional dijalankan di replica, sedangkan tulisan dan transaction dijalankan di primary. Method `$primary()` memaksa primary. README tidak membahas jeda replica.",
  "</Fragment>",
  "<Fragment slot=\"t2\">",
  "*Tidak dijalankan. Dicek ke [Laravel 13.x: Database](https://laravel.com/docs/13.x/database), dibuka 2026-11-03. Kode di bawah adalah Ilustrasi.*",
  "<Snippet lang=\"php\" code={`'mysql' => [",
  "'read' => ['host' => ['192.168.1.1', '192.168.1.2']],",
  "'write' => ['host' => ['192.168.1.3']],",
  "'sticky' => true,",
  "],`} />",
  "**Yang berbeda di stack ini:** konfigurasi menulis host baca dan host tulis, dan host baca dipilih acak untuk tiap request. Opsi `sticky` hanya berlaku dalam satu request: sesudah menulis, bacaan berikutnya di request itu memakai koneksi tulis. Untuk request berikutnya ada middleware `PreventStaleDatabaseReads`, yang memakai sesi dan 2 detik bawaan ([[t5-lag]]).",
  "</Fragment>",
  "<Fragment slot=\"t3\">",
  "*Tidak dijalankan. Dicek ke [Django 5.2: Multiple databases](https://docs.djangoproject.com/en/5.2/topics/db/multi-db/), dibuka 2026-11-03. Kode di bawah adalah Ilustrasi.*",
  "<Snippet lang=\"python\" code={`class PrimaryReplicaRouter:",
  "def db_for_read(self, model, **hints):",
  "return random.choice([\"replica1\", \"replica2\"])",
  "def db_for_write(self, model, **hints):",
  "return \"primary\"`} />",
  "**Yang berbeda di stack ini:** router menentukan koneksi untuk tiap query, dan bacaan pergi ke replica yang dipilih acak. Dokumentasi menulis bahwa susunan itu tidak menyediakan penyelesaian untuk replication lag, jadi router contoh itu tidak menangani jeda.",
  "</Fragment>",
  "<Fragment slot=\"t4\">",
  "*Tidak dijalankan. Halaman [Serverpod: database connection](https://docs.serverpod.dev/concepts/database/connection) tidak terbaca saat dibuka 2026-11-03 [perlu verifikasi].*",
  "**Yang berbeda di stack ini:** cara Serverpod memisahkan koneksi baca dari koneksi tulis tidak dibaca [perlu verifikasi]. Kode Dart tidak ditulis di tab ini.",
  "</Fragment>",
  "<Fragment slot=\"t5\">",
  "*Tidak dijalankan. Dicek ke [Supabase: Read Replicas](https://supabase.com/docs/guides/platform/read-replicas), dokumen tanpa nomor versi, dibuka 2026-11-03.*",
  "**Yang berbeda di stack ini:** halaman itu menulis bahwa replikasi asinkron dan ada jeda antara update di primary dan saat replica menerimanya. Load balancer membagi request antara primary dan replica, dan replica hanya menerima request REST API berjenis GET.",
  "</Fragment>",
  "</TabSet>",
  "</Blok>",
  "<Blok nama=\"Putuskan\">",
  "### ADR 46: satu read replica asinkron untuk laporan, uang tetap dari primary",
  "**Kebutuhan.** PRD v5 meminta laporan merchant real-time, dengan data tertinggal paling lama 5 detik ([[t5-prd]]; Asumsi produk). Laporan di primary menambah kerja mesin yang menulis uang ([[t5-m40]]). Pemicu ADR 45 terpenuhi: laporan diminta, dan L baca 26,4 koneksi lawan ambang 5 (Hitungan atas Asumsi).",
  "**Status:** diterima sesudah M40, dan menjalankan aturan 2 ADR 45 ([[t4-adr-45]]). Dibaca ulang di [[t5-m41]]. Naskah tidak menulis tanggal ADR.",
  "| | A. Cache laporan di Redis | B. Index tambahan di primary | C. Polling diganti push | D. Database analitik lewat CDC | E. Read replica asinkron |",
  "|---|---|---|---|---|---|",
  "| Cara kerja | Jawaban laporan disimpan 30 detik di Redis ([[t3-cache]]) | Index baru mempercepat query laporan di primary | App menerima kabar saat ada penjualan, bukan bertanya tiap 30 detik | Perubahan dialirkan dari WAL ke database lain yang melayani laporan | Satu standby asinkron melayani laporan, primary melayani uang |",
  "| Kelebihan | Tidak menambah database | Tidak menambah komponen | Query laporan sebanyak kejadian, bukan sebanyak polling (penalaran) | Laporan berat tidak menyentuh ledger | Replica menolak tulisan, dan bacaan laporan keluar dari primary |",
  "| Kekurangan | 0 hit dari 18 untuk satu client per warung berjarak 30,5 detik (`laporan.txt` bagian C) | Mempercepat satu query, bukan mengurangi 666,7 query per detik (Hitungan atas Asumsi) | Butuh event streaming yang baru ada di [[t5-fanout]] | Slot replikasi menahan WAL, dan bawaan `max_slot_wal_keep_size` tanpa batas | Laporan tertinggal sebesar jeda replica, dan query lama bisa dibatalkan |",
  "| Biaya operasional | Redis sudah ada ([[t3-cache]]), isi bisa setua 30 detik | Tiap posting baru menulis satu entri index lagi (penalaran) | Event streaming dan relay yang harus dipantau | Database kedua, alat CDC, dan pemantauan slot | Satu server lagi, jeda dipantau, dan satu pengaturan konflik |",
  "| Bukti | Rekaman lab `laporan.txt` bagian C | Tidak dijalankan: query laporan di bawah 1 ms pada data kecil (bagian A) | Tidak dijalankan: penalaran dari [[t5-fanout]] | Tidak dijalankan: dokumentasi PostgreSQL 17 | Rekaman lab `replika.txt`, `jeda.txt`, `konflik.txt`, `baca.txt` |",
  "**Keputusan: opsi E.** Enam aturan:",
  "1. Satu read replica asinkron melayani laporan merchant dan bacaan berat. Di lab itu standby `replika_laporan`.",
  "2. Semua yang memutuskan uang dibaca dari primary di dalam transaction: saldo untuk bayar, cek batas harian, dan tutup buku resmi. Ini aturan 2 ADR 45. Rekaman dan kode lab mencakup bayar dan kirim, sedangkan tutup buku resmi Tidak dijalankan di lab ini.",
  "3. Laporan hari ini menjumlah posting di replica. Laporan periode dibaca dari `ringkasan_merchant_harian`, yang diisi job idempoten dari posting yang sudah lewat. Bagian ini desain, belum ada di lab (Tidak dijalankan).",
  "4. Sesi laporan di replica memakai `statement_timeout` 20 detik (Asumsi), di bawah `max_standby_streaming_delay` bawaan 30 detik. Timeout menghentikan query lama lebih awal dan mempersingkat replay yang tertahan, tetapi tidak mencegah pembatalan.",
  "5. `hot_standby_feedback` tetap off, seperti bawaannya. Bila dinyalakan, primary menunda pembersihan baris dan tabelnya bisa membengkak.",
  "6. Jeda replica dibaca di primary dari `replay_lag` di `pg_stat_replication`, seperti `jeda.txt` bagian A, dengan alert bila lebih dari 5 detik (Asumsi dari PRD v5).",
  "**Kenapa E, bukan A, B, C, atau D.**",
  "- **A ditolak** karena polling satu perangkat per merchant tiap 30 detik tidak punya panggilan kedua dalam umur isi cache. Rekaman `laporan.txt` bagian C mencatat 0 hit dari 18, dan kontrol dengan dua client per warung dalam satu jendela mencatat 9 hit dari 18. Hitungan 5.4 menulis penjualan baru bisa terlihat 60 detik sesudah tercatat, lebih lambat dari 35 detik di PRD v5 ([[t5-m40]]).",
  "- **B ditolak** karena index mempercepat satu query, sedangkan beban M40 datang dari jumlah query. Rekaman hanya menunjukkan query laporan di bawah 1 ms pada data satu hari dan 9 warung. Belum ada bukti bahwa query-nya yang lambat (Tidak dijalankan).",
  "- **C ditolak untuk sekarang** karena push butuh event streaming yang dibahas di [[t5-fanout]]. Opsi ini mengurangi query, tetapi tidak ada rekamannya di halaman ini (Tidak dijalankan).",
  "- **D ditolak** karena terlalu berat untuk satu laporan. Dokumentasi PostgreSQL 17 menulis bawaan `max_slot_wal_keep_size` -1, yaitu slot boleh menahan WAL tanpa batas ([PostgreSQL 17.11, Replication](https://www.postgresql.org/docs/17/runtime-config-replication.html), dibuka 2026-11-03). Debezium hanya disebut dan tidak dijalankan.",
  "**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:",
  "1. Merchant membaca laporan sebagai angka final. Replica tertinggal sebesar jedanya, dan di rekaman hanya batas di bawah 1 detik yang terbukti. Pencegahannya aturan 6: jeda dipantau, dan tampilan laporan menyebut waktu datanya.",
  "2. Query laporan yang lama dibatalkan dengan 57014 atau 40001. Merchant melihat galat di tengah hari. Pencegahannya laporan yang pendek, laporan periode dari ringkasan, dan timeout 20 detik di bawah 30 detik.",
  "3. Replica laporan mati lama dan slot replikasinya menahan WAL di primary. Dengan `max_slot_wal_keep_size` bawaan -1, dokumentasi menulis slot boleh menahan WAL tanpa batas. Disk primary penuh adalah kesimpulan dari itu (penalaran, Tidak dijalankan). Pencegahannya batas WAL per slot dan alert. Harganya: replica yang tertinggal melewati batas tidak bisa lanjut dan dibangun ulang.",
  "**Kapan keputusan ini salah.**",
  "- Saat jeda replica melewati 5 detik, target PRD v5 (Asumsi produk). Pembandingnya jeda alami di bawah 1 detik pada 100 pembayaran per detik di laptop (`jeda.txt` bagian A).",
  "- Saat query laporan dibatalkan lebih sering daripada yang diterima merchant. PRD v5 belum menulis batasnya. Yang bisa dihitung: galat 57014 dan pencacah `confl_snapshot`, yang naik dari 0 ke 1 di rekaman tanpa timeout.",
  "- Saat L baca melebihi yang ditampung satu replica. Laporan sendiri 13,3 koneksi (666,7 × 0,02). Bila semua bacaan selain uang pindah, 26,4 koneksi (Hitungan atas Asumsi). Bila p95 laporan di replica melewati 1 detik (Asumsi), tambah replica kedua.",
  "- Saat `hot_standby_feedback` dinyalakan, karena primary bisa membengkak.",
  "- Saat polling diganti push ([[t5-fanout]]). Replica khusus laporan mungkin tidak diperlukan lagi.",
  "**Yang akan merevisinya.** [[t5-m41]] menunjukkan riwayat dan saldo tampil yang dipindah ke replica tanpa ADR, sehingga Budi melihat data lama. Hasilnya aturan baca sesudah tulis di [[t5-lag]]. [[t5-m42]] menunjukkan transaksi yang hilang saat primary mati, dan jawabannya ada di [[t5-rpo-rto]].",
  "### Sengaja belum dilakukan",
  "| Yang ditunda | Kenapa ditunda | Muncul lagi di |",
  "|---|---|---|",
  "| Kode yang mengisi `ringkasan_merchant_harian` | Tabel ada di lab, tetapi tidak ada kode yang mengisinya | Belum dijadwalkan |",
  "| Laporan merchant yang dibaca dari replica di lab | Lab `t5-replika` menjalankan bacaan riwayat dan saldo tampil, bukan laporan | Belum dijadwalkan |",
  "| Replica kedua | Belum ada ukuran p95 laporan, dan ambang 1 detik adalah Asumsi | Belum dijadwalkan |",
  "| Database analitik lewat CDC | Debezium hanya disebut, dan slot menahan WAL | [[t5-adr-60]] |",
  "</Blok>",
  "<Blok nama=\"Kunci\">",
  "### Cek diri",
  "**1.** Pernyataan apa yang ditolak standby, dan dengan kode apa?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Pernyataan yang menulis atau mengunci baris dijawab 25006: UPDATE, INSERT, DELETE, TRUNCATE, CREATE, ALTER, DROP, `SELECT ... FOR UPDATE`, dan `PREPARE TRANSACTION`. Untuk `SET TRANSACTION READ WRITE` jawabannya 0A000. Sesudahnya jumlah jurnal, posting, dan total saldo di tiga node tidak berubah (`replika.txt` bagian B).",
  "</details>",
  "**2.** Query 45 detik berjalan di replica dengan `statement_timeout` 20 detik. Berhenti kapan, dengan kode apa, dan apa bedanya dengan tanpa timeout?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Query berhenti sesudah paling sedikit 20 detik dan sebelum 30 detik, dengan 57014. Tanpa timeout, konflik dengan replay membatalkannya sesudah paling sedikit 30 detik, dengan 40001. Timeout tidak mencegah pembatalan: ia menghentikan query lebih awal, dan replay tertahan lebih singkat (`konflik.txt` bagian C dan D).",
  "</details>",
  "**3.** Saldo tampil di replica Rp250.000, saldo primary Rp215.000. Kiriman Rp240.000 diterima atau ditolak, dan kenapa rekaman memakai kiriman, bukan pembayaran?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Ditolak dengan 422 `saldo-kurang`, karena saldo yang menentukan dibaca dari primary di dalam transaction. Pembayaran tidak bisa dipakai: satu pembayaran dibatasi Rp200.000, jadi Rp240.000 ditolak oleh batas itu tanpa membaca saldo (`baca.txt` bagian A, README lab).",
  "</details>",
  "**4.** Cache 30 detik ditolak sedangkan replica dipilih. Apa beda antara data yang tertinggal di keduanya?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Cache menyimpan jawaban sampai TTL 30 detik habis, jadi laporan bisa setua 30 detik. Rekaman mencatat 0 hit dari 18 untuk satu client per warung. Replica menjawab dari data yang tertinggal sebesar jeda replay, di lab di bawah 1 detik pada 100 pembayaran per detik. Jeda itu batas di laptop, bukan nilai produksi.",
  "</details>",
  "### Saat me-review kode AI, cek ini",
  "- [ ] Koneksi ke replica hanya dipakai untuk SELECT biasa, tanpa `FOR UPDATE` atau tulisan.",
  "- [ ] Saldo untuk bayar, cek batas harian, dan tutup buku resmi dibaca dari primary di dalam transaction.",
  "- [ ] Sesi laporan di replica punya `statement_timeout` di bawah `max_standby_streaming_delay`.",
  "- [ ] `hot_standby_feedback` tidak dinyalakan tanpa memantau ukuran tabel di primary.",
  "- [ ] Slot replikasi punya batas WAL dan alert.",
  "- [ ] Bacaan baru yang dipindah ke replica punya ADR dan jawaban untuk jeda replica.",
  "### Bacaan lanjut",
  "- [PostgreSQL 17: Hot Standby](https://www.postgresql.org/docs/17/hot-standby.html)",
  "- [PostgreSQL 17: Replication](https://www.postgresql.org/docs/17/runtime-config-replication.html)",
  "- [@prisma/extension-read-replicas](https://github.com/prisma/extension-read-replicas)",
  "- [Laravel 13.x: Database](https://laravel.com/docs/13.x/database)",
  "- [Django 5.2: Multiple databases](https://docs.djangoproject.com/en/5.2/topics/db/multi-db/)",
  "- [Supabase: Read Replicas](https://supabase.com/docs/guides/platform/read-replicas)",
  "- [Serverpod: database connection](https://docs.serverpod.dev/concepts/database/connection)",
  "</Blok>",
  "<SkripLama daftar={[\"cerita\",\"banding\"]} />",
];
