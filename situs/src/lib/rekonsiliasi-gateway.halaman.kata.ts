// Kunci kata halaman 4.9 yang TIDAK dibangkitkan ulang dari halaman (pembangkit: tmp/r49/buat_kunci.mjs, dijalankan sekali).
// Tes membandingkan halaman dengan deret ini; ubah halaman berarti membaca selisihnya, lalu menjalankan ulang pembangkit.

export const NEGASI: string[] = [
  "Kalau webhook putus, uang di bank tidak punya jurnal;",
  "Jadwal ulangannya habis, Rp500.000 sudah di bank, dan top-up Citra tetap `menunggu` tanpa jurnal (Rekaman lab, lihat [Label sumber](/cara-pakai/#label-sumber):",
  "Koreksinya lewat jurnal normal, bukan `UPDATE` pada saldo.",
  "setiap rupiah dari luar harus cocok dengan catatan pengirimnya, dan selisih adalah insiden, bukan angka yang dikoreksi dengan tangan.",
  "Webhook Citra tidak pernah datang.",
  "Kenapa job koreksinya tidak menulis `UPDATE` pada saldo?",
  "Kenapa itu tidak berarti hanya ada satu selisih kecil?",
  "**Simulasi** di halaman ini berarti SQL dijalankan di browser kamu oleh SQLite (sql.js 1.14.2), bukan oleh PostgreSQL dan bukan oleh kode Go lab.",
  "Hasil simulasi tidak pernah berlabel Rekaman lab.",
  "<p>Tanpa JavaScript, widget tidak berjalan.",
  "Di lab selisih itu ditutup tanpa jurnal, karena gateway menjawab settlement dengan jumlah yang sama dan hanya tanggalnya yang lain (`rekon.txt` bagian B).",
  "Kabar dari gateway adalah klaim ([[t4-dua-arah]]), dan klaim bisa tidak pernah datang.",
  "Di [[t4-m30]] penyebabnya rahasia webhook yang tidak sama.",
  "Jadi Rekeningo butuh jalan yang tidak bergantung pada gateway mengirim.",
  "Gateway pertama menyediakan laporan yang mencocokkan setoran di rekening bank dengan kumpulan transaksi yang diselesaikannya (dokumentasi laporan sebuah gateway pembayaran, dibuka 2026-10-29, Tidak dijalankan).",
  "Gateway kedua menulis bahwa notifikasi yang terlambat diperiksa dengan GET Status API (dokumentasi notifikasi sebuah gateway pembayaran lain, dibuka 2026-10-29, Tidak dijalankan).",
  "Di app Flutter kamu mungkin pernah membuat layar status pembayaran yang tidak menunggu notifikasi push selamanya, tetapi menanyakan statusnya ke server.",
  "kode lab memakainya sebagai bawaan, dan PRD v4 tidak menulis angkanya.",
  "Gateway ditanya sebelum transaction dibuka, jadi panggilan jaringan tidak memegang lock ([[t3-pool]]).",
  "Webhook yang datang terlambat sesudah cek status dijawab `ganda`, bukan dijurnal lagi (Tidak dijalankan:",
  "Gateway yang tidak mengenal order membuat top-up menjadi `gagal` (Tidak dijalankan:",
  "Rekaman bagian A memakai top-up Citra Rp500.000 yang webhook-nya tidak pernah datang.",
  "Job tidak menanyakan top-up berumur 0 dan 29 menit, dan menanyakan yang berumur 31 menit:",
  "Seberapa sering job berjalan tidak ditentukan lab:",
  "| `tidak_di_ledger` | Order ada di laporan, tetapi Rekeningo tidak punya top-up untuk order itu atau top-up belum `dibayar` | jumlah di laporan | +15.000 dan +60.000 |",
  "| `jumlah_beda` | Order ada di keduanya, tetapi jumlah jurnal tidak sama dengan laporan | laporan dikurangi jurnal | +5.000 |",
  "| `tidak_di_gateway` | Top-up `dibayar` dengan jurnal pada tanggal itu, tetapi laporan tanggal itu tidak memuatnya | jumlah jurnal, bertanda minus | −40.000 dan −30.000 |",
  "Ia tidak memanggil fungsi yang menulis jurnal:",
  "Itu penting di bagian \"Yang tidak terlihat rekonsiliasi\" di bawah:",
  "Jadi menjalankan rekonsiliasi lagi untuk tanggal yang sama tidak menggandakan insiden.",
  "Hasilnya lima insiden, semuanya `terbuka`, dan belum ada koreksi:",
  "Insiden yang sudah selesai karena job lain dilewati, jadi dua job bersamaan tidak menjurnal dua kali ([[t2-job-rekonsiliasi]]).",
  "Tabel di bawah dibaca dari kode (Tidak dijalankan).",
  "| `tidak_di_ledger` | Top-up `menunggu` atau `tidak_pasti`, jumlah sama dengan laporan, akun tidak dibekukan dan tidak melewati batas tingkat.",
  "Hasilnya jurnal top-up | Akun melewati batas tingkat, top-up `kedaluwarsa` atau `gagal`, order tidak dikenal |",
  "ditutup tanpa jurnal.",
  "Order tidak dikenal atau bukan settlement:",
  "jurnal pembalik bila saldo cukup | Gateway tidak menjawab, jumlah settlement berbeda, saldo tidak cukup untuk jurnal pembalik |",
  "Jurnal top-up dari `tidak_di_ledger` memakai keterangan top-up biasa (Tidak dijalankan:",
  "Dari lima insiden, tiga ditutup lewat jurnal, satu ditutup tanpa jurnal, dan satu tetap terbuka.",
  "Insiden −40.000 ditutup tanpa jurnal karena gateway menjawab settlement dengan jumlah yang sama.",
  "Saldo Citra dan Dina tidak berubah.",
  "Posting yang sudah ada tidak berubah (sidik MD5 sama), dan enam posting baru berasal dari tiga jurnal baru.",
  "Menjalankan koreksi lagi hanya memeriksa satu insiden, yaitu yang masih terbuka, dan tidak menulis jurnal baru:",
  "Pembagian antar job bergantung pada waktu, jadi rekaman tidak mencatatnya:",
  "### Yang tidak terlihat rekonsiliasi, dan yang tidak bisa ditutup",
  "Rekonsiliasi dan job koreksi tidak menjawab semuanya.",
  "Tiga di antaranya menunggu keputusan pemilik, dan halaman ini menulisnya sebagai pertanyaan terbuka, bukan keputusan.",
  "PRD v4 belum punya jalur pengembalian dana:",
  "Rekonsiliasi membaca jurnal yang dipegang `topup_bank`, jadi jurnal kedua itu tidak terlihat.",
  "Lab tidak menjalankannya sebagai job:",
  "**Handler pertama tidak mengisi `jurnal_id`.** `kreditV1` menjurnal tanpa mengikat jurnalnya ke top-up.",
  "Ia mencatat `jumlah_beda` +Rp200.000, bukan \"dua jurnal\" (Tidak dijalankan:",
  "lab tidak menjalankan rekonsiliasi atas handler pertama).",
  "**Sesudah jurnal pembalik, status tetap `dibayar`.** Kode koreksi `tidak_di_gateway` tidak mengubah status top-up, dan rekonsiliasi menjumlahkan posting positif jurnal asal tanpa jurnal pembaliknya.",
  "Settlement yang datang lagi sesudah kredit dibalik tidak terlihat sebagai selisih (Tidak dijalankan:",
  "di `labs/api-t4/cmd` dan `labs/api-t4/internal`, `TutupInsiden` hanya dipanggil oleh job koreksi (Tidak dijalankan:",
  "Insiden yang menunggu keputusan manusia belum punya jalur penutupan di lab.",
  "Gateway tiruan merotasi langsung tanpa masa tumpang tindih, jadi yang diuji adalah sisi Rekeningo (`tandatangan.txt` bagian C).",
  "Lamanya jendela 401 tidak diukur.",
  "Keduanya target, bukan hasil lab ([[t4-topup-verifikasi]]).",
  "M30 menunjukkan Rp500.000 di bank tanpa jurnal, karena webhook adalah satu-satunya jalan kabar (`retry.txt` bagian B).",
  "Percaya webhook saja | Jurnal ditulis hanya saat kabar datang | Tanpa job tambahan | Kabar yang tidak datang tidak punya jalan kedua | Rekaman lab `retry.txt` bagian B:",
  "Tidak membandingkan laporan satu hari dengan jurnal, jadi `jumlah_beda` dan `tidak_di_gateway` tidak terlihat | Tidak dijalankan:",
  "Dua lapis dengan insiden bernomor (dipilih) | Cek status per order, rekonsiliasi harian per tanggal, koreksi lewat jurnal normal | Dua jalan yang tidak bergantung pada webhook, dan catatan yang bisa diaudit | Dua job, aturan koreksi per jenis, dan insiden yang menunggu keputusan orang | Rekaman lab `rekon.txt` bagian A, B, dan C |",
  "gateway ditanya sebelum insiden ditutup, dan yang jumlahnya sama ditutup tanpa jurnal.",
  "Koreksi otomatis memperbesar masalah, misalnya jurnal pembalik yang membuat saldo negatif atau kredit ke akun yang tidak boleh.",
  "Insiden terbuka menumpuk tanpa pemilik.",
  "Ini belum dicegah.",
  "Lab tidak punya batas umur insiden dan tidak punya jalur penutupan oleh manusia, sedangkan PRD v4 meminta insiden ditutup dalam satu hari kerja.",
  "Tidak ada koreksi dengan `UPDATE` pada posting atau `buku.saldo_cache`.",
  "- Gateway tidak menyediakan laporan atau cek status per order.",
  "Tidak ada pembanding, dan lapis ini tidak bisa dibangun.",
  "Angka itu menandakan penyebab sistematis, bukan insiden tunggal.",
  "- Lebih dari 1% top-up bergantung pada cek status, karena kabarnya ditolak atau tidak datang.",
  "Janji 5 menit tidak mencakupnya, tetapi batas 30 menit perlu ditinjau.",
  "- Jurnal kedua sesudah key habis tidak terlihat rekonsiliasi (`proses-mati.txt` bagian C).",
  "key top-up tidak kedaluwarsa selagi top-up menunggu, atau rekonsiliasi menjumlahkan semua jurnal per order.",
  "- Top-up yang tidak bisa dikredit dan status sesudah jurnal pembalik tidak punya jawaban produk (PRD v4 belum menjawab pengembalian dana).",
  "**Yang akan merevisinya.** Belum ada ADR yang menjadwalkan revisi.",
  "### Sengaja belum dilakukan",
  "| Batas umur dan pemilik insiden | PRD v4 meminta penutupan dalam satu hari kerja, tetapi lab tidak punya jalur penutupan oleh manusia | Belum dijadwalkan;",
  "| Pemberitahuan ke pemilik akun saat kreditnya dibalik | Lab tidak mengirimnya, dan PRD v4 tidak memintanya | Belum dijadwalkan |",
  "| Pengembalian dana untuk top-up yang tertahan | PRD v4 belum punya jalurnya | Belum dijadwalkan;",
  "Dua total yang hampir sama tidak menunjukkan order yang bermasalah.",
  "**2.** Insiden −Rp40.000 ditutup tanpa jurnal baru, padahal selisihnya ada.",
  "Hanya tanggal settlement yang berbeda, jadi ledger sudah benar dan tidak ada rupiah yang berubah (`rekon.txt` bagian B).",
  "Kenapa job tidak mengkreditnya?",
  "Akun Dina akan melewati batas tingkatnya bila dikredit, dan job tidak memaksa kredit ke akun seperti itu.",
  "Uangnya tertahan di bank sampai tim risk memutuskan, karena PRD v4 belum punya jalur pengembalian dana (`rekon.txt` bagian B dan `urutan.txt` bagian F).",
  "Kenapa insiden tidak ganda?",
  "- [ ] Rekonsiliasi membandingkan per `order_id`, bukan hanya dua total.",
  "Tidak ada `UPDATE` atau `DELETE` pada posting atau saldo.",
  "- [ ] Koreksi yang membuat saldo negatif atau mengkredit akun yang tidak boleh tetap terbuka."
];

export const ANGKA: string[] = ["15","3","4","30","2","4","30","401","500.000","30","3","1","2","3","10.000","1","1.14.2","660.000","650.000","10.000","1","15.000","2","60.000","2","5.000","3","40.000","1","30.000","10.000","1","1","15.000","60.000","5.000","40.000","30.000","10.000","3","40.000","4","4","30","6","342","2026","10","29","2026","10","29","30","4","30","4","3","500.000","0","29","31","30","15.000","60.000","5.000","40.000","30.000","17","17","17","2026","10","29","2","60.000","40.000","20.000","310.000","330.000","15.000","5.000","30.000","5","60.000","50.000","4","24","25","1","4","29","0","200.000","1","4","4","4","30","401","35","2.7.2","50","30","401","4","35","4","99","5","0","4","4","30","500.000","401","4","1","40.000","2","60.000","3","4","1","30","2","2","3","4","5","20","5.000","20.000","0,25","20","5.000","0,4","1","5.000","1","50","30","5","30","4","20","4","4","4","1","10.000","15.000","60.000","5.000","40.000","30.000","10.000","2","40.000","3","60.000","4","4","2026","10","29","2026","10","29","17","17","2026","10","29"];

export const LABEL: string[] = ["Rekaman lab","Simulasi","Rekaman lab","Hitungan","Hitungan","Tidak dijalankan","Asumsi","Tidak dijalankan","Asumsi","Tidak dijalankan","Tidak dijalankan","Asumsi","Tidak dijalankan","Tidak dijalankan","Tidak dijalankan","Tidak dijalankan","Tidak dijalankan","Asumsi","Rekaman lab","Tidak dijalankan","Rekaman lab","Rekaman lab","Asumsi","Asumsi","Asumsi","Hitungan","Hitungan","Asumsi","Simulasi"];

export const TAUTAN: string[] = ["t4-m30","t2-job-rekonsiliasi","t4-m30","berikutnya","t4-dua-arah","t4-m30","t4-dua-arah","t3-pool","t2-job-rekonsiliasi","t4-m29","t4-m30","t4-infra-secret","t4-topup-verifikasi","t4-prd","t2-job-rekonsiliasi"];

export const TABEL: string[] = [
  "| Jenis selisih | Artinya | Selisih | Di rekaman bagian B |",
  "|---|---|---|---|",
  "| `tidak_di_ledger` | Order ada di laporan, tetapi Rekeningo tidak punya top-up untuk order itu atau top-up belum `dibayar` | jumlah di laporan | +15.000 dan +60.000 |",
  "| `jumlah_beda` | Order ada di keduanya, tetapi jumlah jurnal tidak sama dengan laporan | laporan dikurangi jurnal | +5.000 |",
  "| `tidak_di_gateway` | Top-up `dibayar` dengan jurnal pada tanggal itu, tetapi laporan tanggal itu tidak memuatnya | jumlah jurnal, bertanda minus | −40.000 dan −30.000 |",
  "| Jenis | Dikoreksi bila | Tetap terbuka bila |",
  "|---|---|---|",
  "| `tidak_di_ledger` | Top-up `menunggu` atau `tidak_pasti`, jumlah sama dengan laporan, akun tidak dibekukan dan tidak melewati batas tingkat. Hasilnya jurnal top-up | Akun melewati batas tingkat, top-up `kedaluwarsa` atau `gagal`, order tidak dikenal |",
  "| `jumlah_beda` | Laporan lebih besar dari jurnal. Hasilnya jurnal top-up kedua sebesar selisih | Selisih nol atau negatif, akun dibekukan, batas tingkat terlewati |",
  "| `tidak_di_gateway` | Gateway ditanya lebih dulu. Settlement dengan jumlah sama: ditutup tanpa jurnal. Order tidak dikenal atau bukan settlement: jurnal pembalik bila saldo cukup | Gateway tidak menjawab, jumlah settlement berbeda, saldo tidak cukup untuk jurnal pembalik |",
  "| Opsi | Cara kerja | Kelebihan | Kekurangan | Bukti |",
  "|---|---|---|---|---|",
  "| A. Percaya webhook saja | Jurnal ditulis hanya saat kabar datang | Tanpa job tambahan | Kabar yang tidak datang tidak punya jalan kedua | Rekaman lab `retry.txt` bagian B: enam kiriman 401, jadwal habis, top-up `menunggu` |",
  "| B. Polling semua top-up tiap menit | Tiap top-up `menunggu` ditanyakan ke gateway sekali semenit | Kabar yang hilang ketahuan cepat | Hanya order yang Rekeningo kenal, satu per satu. Tidak membandingkan laporan satu hari dengan jurnal, jadi `jumlah_beda` dan `tidak_di_gateway` tidak terlihat | Tidak dijalankan: dibaca dari kode `CekTopup` |",
  "| C. Koreksi tangan oleh Keuangan | Orang mengubah saldo atau menghapus jurnal | Cepat untuk satu kasus | Melanggar aturan Pak Hadi. Role aplikasi di lab ditolak saat `DELETE` pada `jurnal` (`skema.txt` bagian D, api-t4) | Rekaman lab |",
  "| D. Dua lapis dengan insiden bernomor (dipilih) | Cek status per order, rekonsiliasi harian per tanggal, koreksi lewat jurnal normal | Dua jalan yang tidak bergantung pada webhook, dan catatan yang bisa diaudit | Dua job, aturan koreksi per jenis, dan insiden yang menunggu keputusan orang | Rekaman lab `rekon.txt` bagian A, B, dan C |",
  "| Yang ditunda | Kenapa ditunda | Kapan dibahas |",
  "|---|---|---|",
  "| Batas umur dan pemilik insiden | PRD v4 meminta penutupan dalam satu hari kerja, tetapi lab tidak punya jalur penutupan oleh manusia | Belum dijadwalkan; menunggu keputusan pemilik |",
  "| Pemberitahuan ke pemilik akun saat kreditnya dibalik | Lab tidak mengirimnya, dan PRD v4 tidak memintanya | Belum dijadwalkan |",
  "| Pengembalian dana untuk top-up yang tertahan | PRD v4 belum punya jalurnya | Belum dijadwalkan; keputusan produk |"
];

export const RISET: string[] = [
  "| R4-150 | Rekonsiliasi laporan gateway dengan catatan sendiri | Stripe docs, \"Payout reconciliation report\" (docs.stripe.com/reports/payout-reconciliation, dibuka 2026-10-29), dibaca dari teks halaman: subjudul \"Reconcile each payout with the batch of transactions it settles\"; laporan \"helps you match the payouts you receive in your bank account with the batches of payments and other transactions that they relate to\"; payout dikelompokkan menurut tanggal perkiraan tiba, bukan tanggal bank memposting setoran; unduhan itemized memuat tiap transaksi di setoran dan bisa membawa metadata untuk dicocokkan dengan catatan sendiri | 4.9 (Paham, Bacaan lanjut, halaman istilah Rekonsiliasi): gateway nyata menyediakan laporan yang mencocokkan per setoran, bukan per pembayaran; laporan tiruan lab memuat satu baris per order (Asumsi); ditulis tanpa merek | Tidak berubah dari R4-11 (dibuka ulang 2026-10-29) |",
  "| R4-151 | Cek status ke gateway untuk notifikasi yang terlambat atau tidak berurutan | Midtrans docs, \"HTTP(S) Notification / Webhooks\" (docs.midtrans.com/docs/https-notification-webhooks, dibuka 2026-10-29), 100.000 dari 106.898 karakter pertama dibaca: bila notifikasi terasa terlambat, \"you should use the GET Status API to check for current status of the transaction\" (bagian Best Practice to Handle Notification); \"Settlement notification : up to 20s\"; \"You can verify authenticity using the GET status API Request\" (bagian Verify Using GET Status API Call); untuk notifikasi tidak berurutan (mis. settlement sebelum pending) \"You should call GET Status API to get the latest/actual status of the transaction\" | 4.9 (Paham): gateway nyata memberi cek status per order sebagai jalan kedua; ditulis tanpa merek | Tidak berubah dari R4-10 (dibuka ulang 2026-10-29) |",
  "| R4-152 | Penyisipan yang melewati konflik, dasar insiden unik | PostgreSQL 17 docs, INSERT (postgresql.org/docs/17/sql-insert.html, dibuka 2026-10-29): \"ON CONFLICT DO NOTHING simply avoids inserting a row as its alternative action\"; \"The count is the number of rows inserted or updated\" (baris yang dilewati tidak terhitung: disimpulkan dari definisi itu, halaman tidak menulisnya langsung); untuk DO NOTHING conflict_target opsional, dan bila dihilangkan konflik dengan semua constraint dan unique index yang bisa dipakai ditangani | 4.9 (Paham): `insiden_rekon` dengan `UNIQUE (tanggal, order_id, jenis)` dan `ON CONFLICT DO NOTHING` tidak menggandakan insiden saat rekonsiliasi dijalankan lagi. Versi lab 17.11, dokumentasi 17 | Tidak berubah |",
  "| R4-153 | Rekaman dan kode lab untuk rekonsiliasi, koreksi, dan batasnya | Rekaman `labs/t4-webhook/output/rekon.txt` bagian A, B, C; `urutan.txt` bagian F; `tandatangan.txt` bagian C; `labs/t4-modul/output/proses-mati.txt` bagian C; `labs/t4-infra/output/rotasi.txt` bagian D; kode `labs/api-t4/internal/service/pembayaran.go` (CekTopup, RekonHarian, kreditV1), `internal/repo/pembayaran.go` (LedgerTopupTanggal, CatatInsiden), `internal/service/koreksi_rekon.go`, `migrasi/000021_topup_bank.up.sql` | 4.9 (Coba, Paham, Putuskan, halaman istilah Rekonsiliasi): lima insiden dari tujuh order, saldo sebelum dan sesudah koreksi, batas yang tidak terlihat rekonsiliasi | Baru |",
  "| R4-154 | Hitungan ADR 35 dan widget | 20.000 user aktif × 0,25 top-up per user aktif per hari = 5.000 top-up per hari (Asumsi naskah, R4-33); 20 ÷ 5.000 = 0,4%; 1% × 5.000 = 50 top-up per hari; selisih total widget 660.000 − 650.000 = 10.000 = 15.000 + 60.000 + 5.000 − 40.000 − 30.000 (data disalin dari skrip `labs/t4-webhook/run.py`, bagian B) | 4.9 (Coba, Putuskan, kapan keputusan salah): label Hitungan, Asumsi, dan Simulasi | Baru |"
];

export const DIAGRAM: unknown = {
  "id": "t4-rekonsiliasi-inti",
  "judul": "Dua jalan kedua",
  "sumber": {
    "jenis": "rekaman",
    "teks": "Rekaman lab, rekon.txt"
  },
  "baris": [
    {
      "label": "Cek status",
      "sub": "webhook Citra tidak pernah datang",
      "simpul": [
        {
          "teks": "menunggu 31 menit",
          "sub": "lewat batas 30 menit"
        },
        {
          "teks": "gateway ditanya",
          "sub": "dari luar transaction"
        },
        {
          "teks": "dibayar, 1 jurnal",
          "sub": "Rp500.000 tercatat",
          "nada": "good"
        }
      ]
    },
    {
      "label": "Rekonsiliasi harian",
      "sub": "laporan gateway lawan jurnal",
      "simpul": [
        {
          "teks": "5 selisih",
          "sub": "tiga jenis, per order"
        },
        {
          "teks": "4 ditutup",
          "sub": "3 lewat jurnal baru, 1 tanpa jurnal",
          "nada": "good"
        },
        {
          "teks": "1 terbuka",
          "sub": "menunggu keputusan tim risk",
          "nada": "warn"
        }
      ]
    }
  ],
  "catatan": "Kotak oranye adalah selisih yang tidak dikoreksi job. Kedua baris memakai gateway tiruan lokal dan server api-t4."
};

export const WIDGET: unknown = {
  "id": "t4-rekonsiliasi",
  "title": "Satu hari rekonsiliasi: lima order di laporan gateway, lima jurnal di ledger",
  "setup": "CREATE TABLE laporan (order_id TEXT PRIMARY KEY, hari TEXT NOT NULL, jumlah INTEGER NOT NULL);\nCREATE TABLE jurnal_topup (order_id TEXT PRIMARY KEY, hari TEXT NOT NULL, jumlah INTEGER NOT NULL);\nCREATE TABLE insiden_rekon (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL, jenis TEXT NOT NULL CHECK (jenis IN ('tidak_di_ledger', 'tidak_di_gateway', 'jumlah_beda')), selisih INTEGER NOT NULL, UNIQUE (order_id, jenis));\n-- laporan settlement gateway: satu baris per order yang diselesaikan gateway; hari = 'rekon' berarti masuk laporan hari yang dicocokkan\nINSERT INTO laporan VALUES ('citra-1', 'rekon', 500000), ('budi-1', 'rekon', 15000), ('dina-1', 'rekon', 60000), ('dina-2', 'rekon', 60000), ('budi-2', 'rekon', 25000), ('budi-3', 'lain', 40000);\n-- jurnal top-up di ledger yang dipegang topup_bank: jumlah posting positif, dan hari jurnal itu ditulis\nINSERT INTO jurnal_topup VALUES ('citra-1', 'rekon', 500000), ('dina-1', 'rekon', 60000), ('budi-2', 'rekon', 20000), ('budi-3', 'rekon', 40000), ('eko-1', 'rekon', 30000);",
  "check": "SELECT nama, nilai FROM (\n  SELECT 1 AS u, 'total laporan gateway' AS nama, SUM(jumlah) AS nilai FROM laporan WHERE hari = 'rekon'\n  UNION ALL SELECT 2, 'total jurnal di ledger', SUM(jumlah) FROM jurnal_topup WHERE hari = 'rekon'\n  UNION ALL SELECT 3, 'selisih total', (SELECT SUM(jumlah) FROM laporan WHERE hari = 'rekon') - (SELECT SUM(jumlah) FROM jurnal_topup WHERE hari = 'rekon')\n  UNION ALL SELECT 4, 'insiden bernomor', COUNT(*) FROM insiden_rekon\n  UNION ALL SELECT 10 + id, 'insiden ' || id || ': ' || jenis || ' ' || order_id, selisih FROM insiden_rekon\n) ORDER BY u",
  "predict": {
    "q": "Total laporan gateway Rp660.000 dan total jurnal Rp650.000 hanya berbeda Rp10.000. Berapa insiden yang ditemukan panel After, yang mencocokkan per order_id?",
    "options": [
      "1 insiden, sebesar selisih total Rp10.000",
      "3 insiden, satu per jenis selisih",
      "5 insiden: tiga selisih positif dan dua negatif",
      "7 insiden, satu per order"
    ],
    "answer": 2,
    "explain": "Dua dari tujuh order cocok persis. Lima sisanya selisih: dua order ada di laporan tanpa jurnal (+15.000 dan +60.000), satu jumlahnya beda (+5.000), dan dua jurnal tidak ada di laporan hari itu (-40.000 dan -30.000). Kelimanya dijumlahkan menjadi +10.000, sama dengan selisih total: total yang hampir sama menutupi lima selisih."
  },
  "panels": {
    "before": {
      "label": "Before: hanya membandingkan dua total",
      "onError": "stop",
      "steps": [
        {
          "actor": "Keuangan",
          "sql": "SELECT (SELECT SUM(jumlah) FROM laporan WHERE hari = 'rekon') - (SELECT SUM(jumlah) FROM jurnal_topup WHERE hari = 'rekon') AS selisih_total",
          "note": "satu angka: laporan gateway dikurangi jurnal"
        }
      ]
    },
    "after": {
      "label": "After: mencocokkan per order_id",
      "onError": "stop",
      "steps": [
        {
          "actor": "job",
          "sql": "INSERT INTO insiden_rekon (order_id, jenis, selisih)\nSELECT l.order_id, 'tidak_di_ledger', l.jumlah FROM laporan l\nWHERE l.hari = 'rekon' AND NOT EXISTS (SELECT 1 FROM jurnal_topup j WHERE j.order_id = l.order_id)",
          "note": "ada di laporan, belum ada jurnal",
          "rowsLabel": {
            "2": "2 insiden tidak_di_ledger"
          }
        },
        {
          "actor": "job",
          "sql": "INSERT INTO insiden_rekon (order_id, jenis, selisih)\nSELECT l.order_id, 'jumlah_beda', l.jumlah - j.jumlah FROM laporan l JOIN jurnal_topup j ON j.order_id = l.order_id\nWHERE l.hari = 'rekon' AND l.jumlah <> j.jumlah",
          "note": "ada di keduanya, jumlah berbeda",
          "rowsLabel": {
            "1": "1 insiden jumlah_beda"
          }
        },
        {
          "actor": "job",
          "sql": "INSERT INTO insiden_rekon (order_id, jenis, selisih)\nSELECT j.order_id, 'tidak_di_gateway', -j.jumlah FROM jurnal_topup j\nWHERE j.hari = 'rekon' AND NOT EXISTS (SELECT 1 FROM laporan l WHERE l.order_id = j.order_id AND l.hari = 'rekon')",
          "note": "ada jurnal hari itu, tidak ada di laporan hari itu",
          "rowsLabel": {
            "2": "2 insiden tidak_di_gateway"
          }
        }
      ]
    }
  },
  "toggles": [
    {
      "label": "Gateway menulis settlement budi-3 pada hari yang dicocokkan, bukan hari lain",
      "pairs": [
        [
          "('budi-3', 'lain', 40000)",
          "('budi-3', 'rekon', 40000)"
        ]
      ]
    }
  ]
};

export const ISTILAH: unknown = {
  "istilah": "Rekonsiliasi",
  "sehari_hari": "Rekonsiliasi adalah mencocokkan catatan sendiri dengan catatan pihak lain, order demi order. Yang tidak cocok dicatat sebagai selisih, bukan diubah supaya terlihat cocok.",
  "cerita": [
    {
      "rujukan": "t2-job-rekonsiliasi",
      "teks": "File untuk bank dibaca ulang dan dicocokkan dengan ledger sebelum diberi nama akhir. File yang memuat Warung 508 dua kali ditolak."
    },
    {
      "rujukan": "t4-rekonsiliasi",
      "teks": "Laporan settlement gateway dicocokkan per order dengan jurnal top-up. Lima dari tujuh order tidak cocok, dan tiap selisih menjadi insiden bernomor."
    }
  ],
  "mekanisme": [
    "Dua catatan dari sumber berbeda diambil untuk periode yang sama, di Rekeningo laporan gateway dan jurnal di ledger.",
    "Keduanya dipasangkan lewat pengenal bersama, yaitu order_id. Order yang hanya ada di satu sisi, atau yang jumlahnya berbeda, menjadi selisih.",
    "Tiap selisih ditulis sebagai satu baris dengan nomor dan kunci unik, jadi menjalankan job lagi tidak menggandakannya.",
    "Selisih dikoreksi dengan jurnal baru bila aturannya jelas. Yang butuh keputusan orang tetap terbuka."
  ],
  "stack": null,
  "jebakan": [
    "Membandingkan dua total saja. Pada data simulasi halaman 4.9, selisih total Rp10.000 menutupi lima selisih per order yang saling meniadakan.",
    "Menganggap tanggal settlement di laporan sama dengan tanggal jurnal. Di lab t4-webhook, satu order yang settlement-nya tertulis di tanggal lain tampil sebagai selisih -Rp40.000, padahal ledger sudah benar."
  ],
  "terkait": [
    "Ledger",
    "Jurnal",
    "Job terjadwal",
    "Idempotency key"
  ],
  "sumber": [
    {
      "riset": "R4-150",
      "judul": "Laporan rekonsiliasi payout di sebuah gateway pembayaran",
      "url": "https://docs.stripe.com/reports/payout-reconciliation",
      "catatan": "Laporan membantu mencocokkan setoran di rekening bank dengan kumpulan pembayaran dan transaksi lain yang berkaitan dengannya. Pencocokannya per setoran, bukan per pembayaran."
    },
    {
      "riset": "R4-151",
      "judul": "Notifikasi HTTP di gateway pembayaran lain",
      "url": "https://docs.midtrans.com/docs/https-notification-webhooks",
      "catatan": "Untuk notifikasi yang terlambat, dokumentasi menyarankan memeriksa status transaksi lewat GET Status API."
    },
    {
      "riset": "R4-153",
      "judul": "Rekaman lab t4-webhook: rekonsiliasi harian dan koreksi insiden",
      "rekaman": "labs/t4-webhook/output/rekon.txt",
      "catatan": "Bagian B: lima insiden dari tujuh order (dua tidak_di_ledger, satu jumlah_beda, dua tidak_di_gateway). Tiga ditutup lewat jurnal, satu tanpa jurnal, satu tetap terbuka."
    }
  ]
};
