// Dibangkitkan dari fitur-ke-teknis.mdx, t5-fitur-inti.json, dan RISET-TAHAP-5.md (keputusan 1504); jangan diedit tangan.
// Sidik teks: mengunci tiap baris halaman. Tes turunan di fitur-teknis-t5.halaman.test.ts berdiri sendiri tanpa berkas ini dan
// gagal bila sumbernya (naskah, registry, widget, rekaman, riset) berubah. Dibangkitkan ulang tangan bila isi halaman diubah dengan
// sengaja: python3 tmp/gen52.py (skrip sementara, tidak di repo), lalu baca diff-nya.
export const BARIS_MDX: string[] = [
 "---",
 "title: \"5.2 Dari fitur ke pekerjaan teknis v5 dan inti: salinan boleh banyak, uang bergerak di satu tempat\"",
 "description: Wulan, Raka, Hendra, dan Nadia menurunkan PRD v5 jadi pekerjaan di app, backend, dan database, lalu menulis pertanyaan pertama Tahap 5 sebelum kode.",
 "---",
 "import Blok from \"../../../components/Blok.astro\";",
 "import Rantai from \"../../../components/Rantai.astro\";",
 "import PetaZona from \"../../../components/PetaZona.astro\";",
 "import Snippet from \"../../../components/Snippet.astro\";",
 "import inti from \"../../../../data/diagram/t5-fitur-inti.json\";",
 "<p class=\"meta\">Baca 7 menit · Prasyarat: [[t5-prd]] · Jalur inti</p>",
 "<Blok nama=\"Mulai\" buka>",
 "## Inti",
 "PRD v5 menambah delapan tabel. Pekerjaan pertama Tahap 5 adalah satu keputusan: data mana yang boleh jadi salinan, dan di mana uang bergerak.",
 "<Rantai data={inti} ringkas />",
 "*Salinan* adalah data yang sama yang disimpan atau dihitung di tempat lain dan bisa tertinggal dari sumbernya, misalnya replica, ringkasan, cache, dan event. Kalau app Flutter-mu pernah menampilkan data dari cache lokal sambil menunggu server, kamu sudah mengenal salinan yang tertinggal.",
 "Baris bawah Rantai adalah versi pertama laporan Wulan. Budi membayar Rp35.000 dan Rp12.000 ke Warung 505, keduanya dijawab 201, dan laporan warung itu menjawab dua transaksi dengan total Rp47.000 (`laporan.txt`). Laporan itu menjumlah posting dari primary, yaitu database utama yang menerima semua tulisan, dan pembayaran memakai database yang sama ([[t5-m40]]). Dari baris laporan itu lahir pertanyaan pertama Tahap 5: salinan boleh banyak, tetapi tempat uang bergerak hanya satu.",
 "</Blok>",
 "<Blok nama=\"Coba dulu: di mana uang bergerak?\" buka aman=\"Kalau berhenti di sini, kamu sudah tahu: uang bergerak di service ledger dan di satu primary. Replica, ringkasan, cache, dan event hanya untuk dilihat.\">",
 "Peta ini memuat lima zona dari PRD v5: client, edge, service, data, dan operasi. Tebak dulu di zona mana uang bergerak, lalu buka zona satu per satu. Tabel di bawah peta terisi sesuai zona yang kamu buka.",
 "Zona, tim, dan delapan kejadian di peta adalah Asumsi ([Label sumber](/cara-pakai/#label-sumber)): rancangan penulis. Rekaman tiap kejadian ada di halaman masalahnya, bila ada. Nama schema, jumlah tabel, dan hak role dibaca dari rekaman lab `api-t5`, dan di lab satu proses memegang keenam role.",
 "<PetaZona />",
 "Kolom Hal 1, Hal 2, dan Hal 3 di tabel adalah tiga hal di blok Pertanyaan sebelum kode, bukan nomor halaman. Terjaga berarti hal itu tetap benar saat kejadian terjadi, Rusak berarti hal itu dilanggar, dan Tidak berlaku berarti kejadian itu tidak menyentuhnya.",
 "Dua baris tabel perlu catatan tentang dasarnya, karena keduanya penalaran dari dokumentasi, bukan kejadian yang direkam. Baris primary mati (M42) bersandar pada dokumentasi: [PostgreSQL 17, bagian 26.2.8](https://www.postgresql.org/docs/17/warm-standby.html), dibuka 2026-11-02, Tidak dijalankan. Dokumentasi itu menulis bahwa replikasi streaming asinkron secara bawaan, dan bila primary mati, transaksi yang sudah commit bisa belum sampai ke standby.",
 "Lab `t5-replika` merekam akibatnya. Lima jurnal yang dijawab 201 ada di primary lama dan tidak ada di replica yang dipromosikan. Lab memutus koneksi WAL dan tidak mematikan primary.",
 "Baris pod notifikasi (M47) bersandar pada dokumentasi: [Kubernetes, Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/), halaman tanpa nomor versi, dibuka 2026-11-02, Tidak dijalankan. Dokumentasi itu menulis bahwa pod tidak terisolasi untuk koneksi masuk secara bawaan, dan semua koneksi masuk diizinkan. Bila ledger tidak memeriksa identitas pemanggil dan tidak ada NetworkPolicy yang ditegakkan, pod mana pun yang bisa menjangkaunya bisa meminta jurnal. Rekaman `api-t5` merekam hak role di database, bukan identitas antar service di jaringan.",
 "</Blok>",
 "<Blok nama=\"Dari fitur ke pekerjaan\">",
 "Ini tabel yang tim tulis sebelum satu baris kode Tahap 5 ada. Tim yang mengerjakannya adalah lima tim produk dan tiga tim fungsi, 28 orang, seperti di [[t5-prd]] (Asumsi cerita).",
 "| Fitur | Di app | Di backend | Di database |",
 "|---|---|---|---|",
 "| Skala nasional, tidak berhenti | Tidak ada perubahan yang terlihat | Enam service di Kubernetes, tiga instance tiap service, rilis tanpa jeda; pooler; failover | Read replica, replica sinkron, schema dan role per service |",
 "| Laporan merchant real-time | Layar laporan di app Merchant dan dasbor web, diperbarui tiap 30 detik | Laporan dibaca dari replica, ringkasan harian per merchant | `ringkasan_merchant_harian`; `posting` dipartisi |",
 "| Notifikasi massal | Pengumuman muncul di HP, notifikasi uang tetap cepat | Worker diskalakan keluar; pengumuman lewat event streaming; kuota penyedia push | `pengumuman`; topik di event streaming |",
 "| Cicilan dan tabungan | Atur jadwal, lihat angsuran, hentikan | Service cicilan dan batch harian tahan crash | `jadwal_cicilan`, `angsuran`, kantong tabungan sebagai buku |",
 "| API publik untuk POS | Tidak ada (kasir mitra) | Pintu di tepi: kuota per mitra, tanda tangan, WAF; webhook ke POS | `mitra_pos`; `akun.mitra_pos_id` |",
 "| Kartu virtual untuk semua | Tidak ada perubahan | Rilis bertahap, satu kill switch | `sakelar` |",
 "| 28 engineer, delapan tim | Paket app per tim | Pipeline per service, observability penuh, platform sebagai jalan beraspal | Migration per service |",
 "Delapan tabel baru adalah `snapshot_saldo`, `arsip_partisi`, `ringkasan_merchant_harian`, `jadwal_cicilan`, `angsuran`, `pengumuman`, `mitra_pos`, dan `sakelar`. Nama tabel dan kolom di tabel ini ada di skema lab `api-t5` (`skema.txt`), dan tabel `posting` dipartisi per bulan di sana. Enam service dan tiga instance tiap service adalah Asumsi. Di lab satu proses memegang keenam role, jadi \"enam service\" dibaca dari schema, tabel, dan hak role:",
 "<Snippet files={[\"labs/api-t5/output/skema.txt:187:187\", \"labs/api-t5/output/skema.txt:190:191\", \"labs/api-t5/output/skema.txt:207:209\"]} title=\"Rekaman lab: labs/api-t5/output/skema.txt, bagian F (hak role: notifikasi ditolak menulis posting, proses lab memegang semua role)\" />",
 "Role notifikasi yang mencoba INSERT ke `posting` ditolak dengan kode 42501. Server lab berjalan sebagai role `t5_app`, yang mewarisi keenam role, dan UPDATE ke `posting` tetap ditolak untuknya.",
 "Di luar nama tabel, isi tabel adalah rencana kerja tim, bukan hasil ukur. Kubernetes, event streaming, mTLS, WAF, dan penyedia push Tidak dijalankan di halaman ini. Tiap halaman konsepnya memuat rekaman bila labnya ada.",
 "</Blok>",
 "<Blok nama=\"Pertanyaan sebelum kode\">",
 "Tiga hal harus selalu benar di Tahap 5, dan tiap hal punya pemiliknya:",
 "1. Uang bergerak hanya lewat [[t2-ledger|ledger]]: jurnal seimbang, posting tidak diubah, dan satu primary menerima semua tulisan. Service lain membaca, atau meminta posting dengan [[t2-idempotency|Idempotency-Key]]. Ini syarat Pak Hadi sejak PRD v2.",
 "2. Keputusan yang menentukan uang dibaca dari sumber yang sama dengan yang menggerakkan uang. Replica, ringkasan, cache, dan event hanya untuk dilihat, dan jarak ketertinggalannya diketahui dan disebut. Ini syarat Pak Hadi di PRD v5 ([[t5-prd]]) dan aturan 2 di [[t4-adr-45|ADR 45]].",
 "3. Pekerjaan yang lebih panjang dari satu proses, satu hari, atau satu mesin tetap benar bila dihentikan dan diulang di titik mana pun. Contohnya batch, failover, dan deploy. Ini syarat Dewi dan PRD v5: RPO nol dan RTO 15 menit.",
 "**Versi pertama (minggu 2).** Wulan menulis laporan real-time sebagai satu endpoint. Endpoint itu menjumlah posting hari ini milik merchant dari primary yang sama dengan pembayaran, dan app memanggilnya tiap 30 detik. Raka memakai endpoint riwayat yang sama untuk layar \"Berhasil\".",
 "Hendra menulis cicilan sebagai job malam yang menagih semua jadwal jatuh tempo, lalu menandai angsuran lunas. Nadia mengusulkan event streaming untuk semuanya. Di staging dengan 200 merchant tiap bagian tampak cukup (adegan dan angka cerita: Ilustrasi).",
 "Cara pertama itu memperlakukan semua salinan seperti sumber. Peta zona di blok Coba dulu mencatat delapan kejadian yang menunjukkan akibatnya. Dari 24 sel tabelnya, 9 Rusak: tiga di hal 1, dua di hal 2, dan empat di hal 3. Itu Hitungan, yaitu dihitung dari sel yang tertulis, dan tabelnya berlabel Asumsi.",
 "Halaman ini juga menanam tiga pertanyaan. Di minggu 2 Wulan bertanya siapa yang melambat bila laporan dan pembayaran membaca database yang sama. Pak Hadi bertanya angka mana yang ia tanda tangani bila ada dua salinan. Dewi bertanya apa yang hilang bila database utama mati pukul 02.10.",
 "Jawabannya ada di [[t5-m40]] sampai [[t5-m43]]. Pertanyaan Wulan dijawab di [[t5-m40]]. Pertanyaan Pak Hadi dijawab di [[t5-m41]] dan [[t5-m43]], dan pertanyaan Dewi di [[t5-m42]].",
 "**Kenapa bukan request.** Dasar hitungan beban Tahap 5 adalah 3 transaksi uang per user aktif per hari, seperti Tahap 2 sampai 4. Angka dalam kurung memakai 2 transaksi, angka registry Tahap 5. Semuanya Asumsi, dengan rumus di [[t5-prd]].",
 "Puncak 1.388,9 request per detik naik 10 kali dari 138,9 di Tahap 4. Menurut hitungan beban Tahap 5, yang melewati batasnya lebih dulu bukan request.",
 "Worker notifikasi terpakai 564% (391%). Koneksi database terpasang 180 lawan 97 tersedia. Pemeriksaan saldo malam tanpa snapshot membaca 438 juta posting (292 juta) setelah satu tahun.",
 "Kapasitas satu primary untuk 69,4 transaksi uang per detik (46,3) belum diukur di lab `api-t5`. Lab itu menjadwalkan 20.833 permintaan dalam 15 detik pada 1.388,9 per detik di satu laptop, dan semuanya selesai (`beban.txt`). Itu batas lab, bukan kapasitas produksi.",
 "</Blok>",
 "<Blok nama=\"Konsep yang akan dibutuhkan\">",
 "Tabel ini menyebut konsep untuk tiap fitur. Tahap 5 membahasnya satu per satu, saat masalahnya muncul.",
 "| Fitur | Konsep |",
 "|---|---|",
 "| Skala nasional, tidak berhenti | [[t5-read-replica\\|Read replica]], [[t5-rpo-rto\\|failover]], [[t5-service\\|service dan Kubernetes]], [[t5-pooler\\|pooler]] |",
 "| Laporan merchant real-time | [[t5-read-replica\\|Read replica]], [[t5-lag\\|read-your-writes]], [[t5-partisi\\|partisi dan snapshot saldo]] |",
 "| Notifikasi massal | [[t5-fanout\\|Fan-out, backpressure, dan event streaming]] |",
 "| Cicilan dan tabungan | [[t5-batch\\|Batch harian, saga, dan kunci bisnis]] |",
 "| API publik untuk POS | [[t5-waf\\|Rate limit per mitra dan WAF]], [[t5-mtls\\|mTLS antar service]] |",
 "| Kartu virtual untuk semua | [[t5-rollout\\|Progressive delivery, feature flag, dan GitOps]] |",
 "| 28 engineer, delapan tim | [[t5-tim-infra\\|OpenTelemetry, SLO, dan GitOps]], [[t5-onprem\\|on-prem lawan cloud]] |",
 "Pola yang sama muncul lagi di arsip yang dipindah ke penyimpanan objek ([[t5-kms]]), di cicilan yang diulang ([[t5-m48]]), dan di sakelar kartu ([[t5-m49]]). Setiap salinan diberi nama, diberi umur, dan dilarang memutuskan.",
 "Halaman berikutnya, [[t5-skema]], membahas tabel yang lahir di Tahap 5 dan pembagiannya ke enam schema.",
 "</Blok>"
];
export const BENTUK_MDX = "#########-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#########-#-#-#-#-#-#-#-###-#-#-#-#-#-#-#-#-#-#-#-#-#########-#-#-#-";
export const NILAI_RANTAI = [
 {
  "label": "Database",
  "sub": "jumlah tabel",
  "simpul": [
   [
    "22 tabel",
    "akhir Tahap 4",
    "old"
   ],
   [
    "+ 8 tabel",
    "tabel baru Tahap 5",
    "system"
   ],
   [
    "30 tabel",
    "skema lab api-t5",
    "good"
   ]
  ]
 },
 {
  "label": "Laporan",
  "sub": "mode rentan",
  "simpul": [
   [
    "2 pembayaran",
    null,
    "biasa"
   ],
   [
    "Jumlah posting",
    null,
    "system"
   ],
   [
    "Laporan Rp47.000",
    null,
    "warn"
   ]
  ]
 }
];
export const BARIS_RISET: string[] = [
 "| R5-115 | Replikasi streaming asinkron: transaksi commit bisa belum sampai ke standby saat primary mati (dibaca untuk baris M42 di 5.2; penalaran, Tidak dijalankan) | PostgreSQL 17, bab 26 Log-Shipping Standby Servers (postgresql.org/docs/17/warm-standby.html, dibuka 2026-11-02, teks mentah dari `curl`; lab memakai 17.11): bagian 26.2.5 \"Streaming replication is asynchronous by default (see Section 26.2.8), in which case there is a small delay between committing a transaction in the primary and the changes becoming visible in the standby.\" Bagian 26.2.8: \"PostgreSQL streaming replication is asynchronous by default. If the primary server crashes then some transactions that were committed may not have been replicated to the standby server, causing data loss.\" Halaman 5.2 hanya memakai bahwa transaksi commit bisa belum sampai ke standby saat primary crash; ia tidak menulis lamanya jeda | Kalimat baris primary mati (M42) di blok Coba dulu 5.2; akibatnya yang direkam adalah `labs/t5-replika/output/promosi.txt` bagian A (memutus koneksi WAL, bukan mematikan primary; tanpa fencing) | Baru (R5-100 membahas replica sinkron, R5-02 membahas jeda replikasi) |",
 "| R5-116 | Kubernetes: pod tidak terisolasi secara bawaan; NetworkPolicy butuh penegak (dibaca untuk baris M47 di 5.2; penalaran, Tidak dijalankan) | Kubernetes, Network Policies (kubernetes.io/docs/concepts/services-networking/network-policies/, dibuka 2026-11-02, teks mentah dari `curl`; halaman tanpa nomor versi, pemilih versi menampilkan v1.37): \"By default, a pod is non-isolated for ingress; all inbound connections are allowed.\" dan \"Creating a NetworkPolicy resource without a controller that implements it will have no effect.\" Halaman itu tidak membahas identitas pemanggil di tingkat aplikasi, jadi bagian itu penalaran penulis (ledger yang tidak memeriksa identitas) | Kalimat baris pod notifikasi (M47) di blok Coba dulu 5.2 | Baru (R5-20 membahas mTLS, bukan isolasi bawaan) |",
 "| R5-117 | Hitungan 5.2 atas angka yang tertulis di halaman (Hitungan, Asumsi) | Dihitung dengan skrip sendiri dari angka naskah Tahap 5, registry, dan tabel peta zona, dibaca 2026-11-02: 22 + 8 = 30; 4 × 6 + 2 × 2 = 28; 8 kejadian × 3 hal = 24 sel, sel Rusak 9 = 3 (hal 1) + 2 (hal 2) + 4 (hal 3); 200.000 × 60 ÷ 86.400 × 10 = 1.388,89 dan ÷ 10 = 138,89 (Tahap 4); 600.000 ÷ 86.400 × 10 = 69,44 dan 400.000 ÷ 86.400 × 10 = 46,30; (600.000 + 50.000) ÷ 86.400 × 10 = 75,23 dan ÷ 13,33 = 564%; (400.000 + 50.000) ÷ 86.400 × 10 = 52,08 dan ÷ 13,33 = 391%; 6 × 3 × 10 = 180, 100 − 3 = 97; 200.000 × 3 × 2 × 365 = 438 juta dan 200.000 × 2 × 2 × 365 = 292 juta; ⌊1.388,9 × 15⌋ = 20.833. Masukan terlemahnya Asumsi, jadi hasilnya Asumsi | Paragraf Kenapa bukan request dan kalimat hitungan sel Rusak di blok Pertanyaan sebelum kode 5.2 | Tidak berlaku (hitungan atas angka sendiri) |",
 "| R5-118 | Kalimat naskah, halaman 5.1, dan halaman ADR 45 yang dikutip 5.2 dibaca ke teksnya (Asumsi) | Dibaca 2026-11-02 di main: `plan/CERITA-TAHAP-5.md` bagian 2 (tabel tujuh baris), bagian 3 (tiga hal, versi pertama minggu 2, tabel delapan kejadian, tiga pertanyaan yang ditanam), dan daftar fitur pemicu masalah di bagian 4 (M41 dan M43 memuat syarat Pak Hadi); `tahap-4/sengaja-belum.mdx` (ADR 45, aturan 2: uang tidak dibaca dari salinan di luar primary, read replica hanya untuk laporan); `tahap-5/prd-v5.mdx` (aturan Pak Hadi v2 dan v5, RPO nol dan RTO 15 menit, dasar 3 transaksi dan hasil dengan 2) | Tiga hal, kalimat versi pertama, pemetaan tiga pertanyaan ke halaman masalah, dan atribusi syarat (Pak Hadi, Dewi) di blok Pertanyaan sebelum kode 5.2 | Tidak berlaku |",
 "| R5-119 | Rekaman lab yang dikutip 5.2 dibaca ke berkasnya, tanpa menjalankan ulang (Rekaman lab) | `labs/api-t5/output/skema.txt` bagian A (30 tabel; 22 tabel Tahap 4 ditambah delapan: snapshot_saldo, arsip_partisi, ringkasan_merchant_harian, jadwal_cicilan, angsuran, pengumuman, mitra_pos, sakelar) dan bagian F (notifikasi ditolak INSERT ke posting dengan 42501; t5_app mewarisi keenam role dan UPDATE posting ditolak); `labs/api-t5/output/laporan.txt` bagian A (dua pembayaran Budi Rp35.000 dan Rp12.000 dijawab 201, laporan Warung 505 jumlah_transaksi 2 dan total 47000, mode rentan laporan-primary); `labs/api-t5/output/beban.txt` bagian A (20.833 dijadwalkan dan selesai, status 200 ×18.718 dan 201 ×2.115, batas lab bukan kapasitas produksi); `labs/t5-replika/output/promosi.txt` bagian A (lima jurnal 201 ada di primary lama dan tidak di replica yang dipromosikan; fencing tidak ada di lab) | Rantai Inti, Snippet bagian F, dan kalimat M42 di 5.2 | Tidak berlaku |"
];
