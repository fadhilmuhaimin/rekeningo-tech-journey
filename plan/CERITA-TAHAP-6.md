Draft otomatis, belum ditinjau pemilik

# Cerita Rekeningo · Tahap 6: Regional

Ditulis 2026-11-06 · draf proyeksi tanpa lab (tugas NASKAH-6, keputusan 1700 sampai 1704). Peninjau konsistensi (KONSISTENSI-6) memakai keputusan 1705 sampai 1709 dan menambal naskah ini di branch yang sama.

## Kenapa dokumen ini ada

Naskah ini adalah source of truth Tahap 6, disimpan di repo sebagai `plan/CERITA-TAHAP-6.md`. Strukturnya sama dengan Tahap 2 sampai 5: **PRD → fitur → pekerjaan teknis → inti teknis → masalah yang muncul pelan-pelan → konsep**. Halaman situs ditulis dari naskah ini. Penomoran melanjutkan Tahap 5: masalah M52 dan seterusnya (Tahap 5 berakhir di M51), ADR 61 dan seterusnya (Tahap 5 berakhir di ADR 60).

Tahap 6 adalah proyeksi konseptual untuk organisasi 50 developer lebih (PROPOSAL, "Tahap 6: apa yang berbeda saat 50+ developer"). Tahap ini tidak punya lab, tidak punya ERD yang dibangun dari skema, dan tidak punya widget baru. Tak satu pun angka kejadian di naskah ini berasal dari rekaman baru. Naskah ini draf otomatis, bukan tulisan pemilik, dan tidak mengubah naskah Tahap 1 sampai 5 atau PROPOSAL.

Bahan naskah: `plan/RISET-TAHAP-6.md` (ID `R6-nn` menunjuk ke sana) dan halaman Tahap 5 yang sudah di main, terutama 5.27 sampai 5.32. Bahan lain: `plan/EVALUASI-TAHAP-5.md`, `plan/TINJAUAN-PEMILIK.md` bagian Tahap 5, dan skill hasil DIRI-2 sampai DIRI-5. Bagian "Prompt untuk Claude Code" di naskah Tahap 2 adalah prompt pemilik untuk memulai Tahap 2. Naskah Tahap 3 sampai 5 tidak memuatnya, dan naskah ini juga tidak. Tugas `T6-siap` memasukkan peta halaman ke registry.

Semua pihak ketiga, negara, mata uang, dan perusahaan di Tahap 6 fiktif atau tidak dinamai. Standar dan dokumentasi publik disebut sebagai sumber, tanpa klaim izin, lisensi, atau kepatuhan regulasi di negara mana pun. Aturan per negara adalah Asumsi produk, bukan kutipan hukum.

Tahap 6 tanpa lab. Karena itu setiap kalimat tentang perilaku sistem memakai satu dari lima label di `/cara-pakai/`: Asumsi, Ilustrasi, Tidak dijalankan, [perlu verifikasi], dan Rekaman lab. Rekaman lab hanya untuk rekaman Tahap 1 sampai 5 yang sudah ada di repo, dengan nama file-nya. Hitungan berarti hasil rumus yang tertulis, dan labelnya ikut masukan terlemah ("Hitungan atas Asumsi"). Prompt tugas menulis "dibaca dari sumber [R6-nn]". Naskah ini menulisnya sebagai "Tidak dijalankan, R6-nn", karena skill gaya-bahasa tidak membuat label sumber baru di halaman (pilihan draf 16). Penalaran berarti kesimpulan dari kalimat yang sudah tertulis tanpa menjalankan apa pun (arti di 5.32), dan tiap "(penalaran)" di naskah ini berlabel Tidak dijalankan. Kode R6-nn dan R5-nn hanya ada di naskah ini dan badan PR: halaman menulis nama sumber, versi, dan tanggal akses (skill riset-tahap).

Delapan aturan dari pelajaran Tahap 2 sampai 5 dipakai supaya kelas kesalahan lama tidak terulang:

1. **Satu angka, satu bentuk.** Angka beban dihitung sekali (bagian 3) dengan nilai tepat dan satu pembulatan setengah ke atas. Turunan dihitung dari angka yang tertulis. Besaran yang punya dua versi (3 atau 2 transaksi) ditulis berdampingan dengan labelnya.
2. **Tanpa lab, tanpa janji rekaman.** Naskah tidak menulis "lab akan merekam". Pernyataan yang butuh bukti tetapi tidak punya lab ditulis Tidak dijalankan atau Asumsi. Alat ukur yang bisa dipakai pembaca ada di tabel "Yang tidak bisa dibuktikan tanpa lab" (bagian 4).
3. **Klaim universal dan negatif menyebut lingkupnya.** "Tidak ada X" hanya untuk folder, tahap, atau halaman yang disebut. Kata "setiap", "semua", dan "hanya" dicek terhadap kasus tandingan sebelum ditulis.
4. **Klaim tentang ADR tahap lain dibaca ke halaman ADR-nya.** Kalimat ADR 52, 56, 58, 59, dan 60 dikutip dari halaman 5.17, 5.25, 5.27, 5.28, dan 5.30 (dibaca 2026-11-06). Kalimat tentang ADR 46 sampai 57 lain berasal dari naskah Tahap 5, dan penulis halaman membuka halaman ADR-nya sebelum mengutip.
5. **Label tidak lebih kuat daripada sumbernya.** Kata pelunak di sumber (might, often, some, "reasonable minimum") ikut ke kalimat naskah. Kasus industri ditulis dengan batas yang ditulis sumbernya sendiri, dan atribusi mengikuti penulis di byline.
6. **Satu kata per konsep.** "Wilayah" berarti region, yaitu satu lokasi geografis dengan pusat data. "Negara" berarti satu pasar dengan satu mata uang. "Replica" berarti salinan database, dan "replika" tidak dipakai untuk pod. "Lock" berarti kunci baris di database, dan "KEK" atau "kunci enkripsi" berarti kunci kriptografi. "Golden path" menggantikan "jalan beraspal" di 5.27 (pilihan draf 8). "Anggaran kegagalan" dan "error budget" berarti hal yang sama (glosarium: Error budget). Naskah ini memakai "anggaran kegagalan" untuk angkanya dan "kebijakan error budget" untuk aturannya. Kata "token", "router", "client", "log", dan "nonce" tidak dipakai di naskah ini, karena tiap kata sudah punya dua arti di Tahap 3 sampai 5. Pengecualiannya dua kutipan halaman Tahap 5 dengan artinya: "client" (koneksi dari pod ke pooler, 5.17) dan "token LSN" (posisi primary di WAL, 5.7).
7. **Jawaban dan tebakan tidak ditulis di prosa sebelum widget.** Naskah menulis jawaban di kolom "Yang sebenarnya", dan penulis halaman memindahkannya ke widget dan `<noscript>`, bukan ke Inti atau paragraf `aman`.
8. **Versi "terbaru" dicek pada hari halaman ditulis.** Naskah hampir tidak menyebut nomor versi. Yang dicek ulang 2026-11-06 adalah rilis spesifikasi OpenFeature (v0.9.0, terbit 2026-07-29, lewat API rilis GitHub), SRE Book bab 11, halaman metrik DORA, dan dokumentasi pertukaran mata uang TigerBeetle. Peninjau KONSISTENSI-6 menambah pembacaan teks mentah SRE Workbook (kebijakan error budget), makalah Spanner OSDI 2012, whitepaper AWS tentang disaster recovery, halaman FinOps Foundation, arsip Prime Video, `decimal.go`, edisi spesifikasi GraphQL, dan lima isu GitHub, semuanya 2026-11-06. Sisanya "versi yang dibaca" di RISET-TAHAP-6 (2026-10-25).

### Pilihan draf yang perlu dilihat pemilik

Dua puluh pilihan berikut diambil tanpa bertanya, dengan opsi paling aman dan paling mudah dibatalkan. Masing-masing dicatat di badan PR sebagai usulan perubahan cerita atau butir "Perlu dicek pemilik".

1. **Tiga negara, tidak dinamai.** Registry `proyeksi[0]` menulis "10 juta user, 3 negara", tetapi naskah Tahap 5 dan pratinjau PRD v6 di 5.32 tidak menyebut jumlah negara. Naskah ini memakai tiga: negara pertama (rumah Rekeningo, rupiah), negara kedua, dan negara ketiga, tanpa nama dan tanpa kode mata uang kecuali rupiah (Asumsi cerita).
2. **Pembagian user 60%, 25%, 15%.** Dari 10.000.000 user terdaftar: 6.000.000, 2.500.000, dan 1.500.000 (Asumsi cerita). Pembagian ini hanya dipakai untuk beban per negara di bagian 3.
3. **Tim: 53 orang dalam 11 tim, termasuk Platform, SRE, dan Security.** PRD v6 menulis "lebih dari 50 developer dalam lebih dari 10 tim". Delapan tim produk berjumlah 38 orang, dan tiga tim fungsi 15 orang, jadi hanya 53 yang melewati 50. Pola menghitung sama dengan Tahap 5 (28 = 4 × 6 + 2 × 2). Angka ±50 developer sebagai pemicu microservices tidak punya sumber primer [perlu verifikasi] dan tidak dipakai sebagai pemicu apa pun.
4. **Transaksi per user aktif per hari: 3, dengan hasil untuk 2 di sebelahnya.** Registry Tahap 5 memakai 2 dan naskah Tahap 2 sampai 5 memakai 3. Registry `proyeksi[0]` tidak punya `asumsi`. Kalkulator 6.2 memakai skenario `tahap: 5` dengan `ubah` seperti 5.29, jadi `proyeksi[0].asumsi` opsional (lihat Catatan untuk `T6-siap`), dan angka registry yang disarankan ada di bagian 3.
5. **RPO nol dipertahankan, RTO wilayah 30 menit baru.** RPO nol untuk transaksi uang yang sudah dijawab sukses dan RTO 15 menit untuk satu mesin berasal dari PRD v5 (Asumsi produk). PRD v6 menambah RTO untuk hilangnya satu wilayah: 30 menit (Asumsi produk). Pemilik memutuskan angkanya.
6. **Aktif-pasif dengan standby sinkron di wilayah pasangan 1.000 km.** Pasangan 3.000 km hanya bila daftar izin negara (Asumsi produk) mengizinkan. Aktif-aktif tetap sengaja belum (ADR 69). Naskah ini memilih RPO nol di atas latensi tulis yang lebih rendah. Pratinjau 5.32 menulis "satu wilayah pusat data melayani, wilayah lain menunggu sampai failover". Naskah ini membacanya per negara: tiap negara punya satu wilayah primer dan satu pasangan pasif. Tiga wilayah primer melayani data yang berbeda, dan tak satu pun aktif-aktif atas data yang sama.
7. **Database per negara, bukan per service.** PROPOSAL menulis "pecah service dengan DB sendiri" dan "database yang dipisah per wilayah" untuk Tahap 6. Tahap 5 memberi tiap service schema dan role sendiri di satu cluster (ADR 50). Naskah ini memisahkan database per negara karena residensi dan mata uang, bukan kapasitas. Butir "database per service" di ADR 60 tetap sengaja belum. Database per negara memenuhi definisi sharding di 5.30 (shard key negara). Butir "sharding" tetap sengaja belum hanya untuk pemecahan karena kapasitas di dalam satu negara.
8. **"Golden path", bukan "jalan beraspal".** Halaman 5.27 menulis "jalan beraspal". PROPOSAL, RISET, dan 5.32 menulis golden path. Naskah ini memakai golden path, dan `T6-siap` membuat halaman istilah. Halaman 5.27 tidak diubah.
9. **Rupiah tetap bulat di ledger.** Dokumentasi payment gateway di R6-10 menulis rupiah sebagai mata uang dua desimal. Ledger Tahap 1 sampai 5 menyimpan rupiah bulat. Naskah ini menyimpan unit terkecil per mata uang dengan eksponen tiap buku (rupiah memakai eksponen 0, Asumsi desain), dan mengonversi hanya di batas dengan pihak luar yang meminta bentuk lain.
10. **Aturan residensi adalah Asumsi produk.** Data identitas dan saldo satu negara tinggal di wilayah negara itu dan pasangan yang ada di daftar izin negara itu. Naskah tidak menyebut hukum, lisensi, atau negara nyata. Rujukan regulasi di R4-40 tetap [perlu verifikasi] dan tidak masuk cerita.
11. **Skor risiko 50 ms dan satu proses.** Angka 50 ms berasal dari M51 (5.29), Asumsi naskah. Angka yang sama muncul sebagai anggaran tambahan p95 satu lompatan (ADR 37, dipakai ADR 48, ADR 52, dan butir 7 ADR 60), dengan arti lain: M51 menulis "angkanya sama, artinya berbeda". Satu-satunya rekaman yang dipakai adalah `labs/t5-gabung/output/` dari Tahap 5, dengan jeda antar panggilan buatan.
12. **Prime Video lewat arsip.** Artikel asli dialihkan, jadi satu-satunya bacaan adalah arsip web.archive.org bertanggal 2023-05-04, untuk tulisan yang terbit 2023-03-22 (RISET-TAHAP-5, baris R5-171; R5-25 adalah butir lama tanpa tanggal terbit, dan RISET-TAHAP-6 kini merujuk R5-171).
13. **Dua belas halaman, masalah dan ADR digabung.** Batas atas 12 halaman memaksa tiap halaman Masalah memuat ADR-nya (jenis "Masalah + ADR"), estimasi digabung dengan ADR penutup (6.11), dan rekap digabung dengan penutup (6.12). Bila halaman melewati ±15 menit baca (TINJAUAN-PEMILIK Tahap 5, butir 10), pecah atas keputusan pemilik.
14. **Tahap 6 tidak ditutup dengan Tahap 7.** PRD v6 tidak punya prioritas P2 yang menunjuk ke v7. Hal yang sengaja belum ada di ADR 69 dengan pemicunya, dan halaman terakhir menutup enam tahap.
15. **Tanpa widget baru, dan tiap halaman Masalah punya satu kontrol.** Widget yang dipakai: alur, banding, kalkulator, tebak, pilah, kartu, dan rantai. Alur, banding, dan kalkulator punya kontrol yang bisa diubah, dan peta di bawah menyebut apa yang diubah pembaca. Putusan W5 (empat tahap berturut-turut TIDAK) tetap milik pemilik.
16. **"Dibaca dari sumber" ditulis "Tidak dijalankan, R6-nn".** Sesuai skill gaya-bahasa (label turunan tidak dibuat di halaman), dan usulan label baru ada di badan PR.
17. **GraphQL digabung ke baris BFF.** PROPOSAL menyebut GraphQL, sedangkan ADR 60 tidak punya butir sendiri untuknya. Naskah ini menaruhnya di baris BFF di ADR 69, karena pemicunya sama (satu layar butuh banyak request berurutan, belum diukur).
18. **Satu sakelar per database negara.** ADR 55 memakai satu sakelar di satu primary. Tiga database negara berarti tiga sakelar, yang diubah oleh alat yang sama. Pilihan satu sakelar untuk semua pod dan semua service (TINJAUAN-PEMILIK Tahap 5, butir 5) dipertahankan per negara.
19. **Fraud tanpa compliance dan rekonsiliasi.** PROPOSAL ("Tahap 6", konsep 4) menulis fraud dan compliance sebagai fungsi engineering, termasuk rekonsiliasi otomatis dengan bank dan gateway. Rekonsiliasi dengan bank dan gateway sudah dikerjakan di Tahap 4 (M29 sampai M39), dan compliance tidak dipakai karena naskah tanpa klaim kepatuhan. Tahap 6 memakai skor risiko dan graf akun-perangkat (M57 dan Keamanan 13), dan tim Risiko menggantikan nama "tim fraud dan compliance engineering".
20. **Security di luar rumpun jaga.** Giliran jaga per rumpun (ADR 68) mencakup 49 dari 53 orang. Tim Security 4 orang dipanggil sebagai eskalasi dan tidak punya rotasi sendiri (Asumsi).

## Latar: dari satu negara ke tiga

Uji coba nasional lolos pada minggu 16 Tahap 5. Rekonsiliasi harian selisih Rp0 atau insiden tertutup dalam satu hari kerja selama 14 hari berturut-turut (target Tahap 5, Asumsi). Puncak beban 1.388,9 request per detik, dan 28 orang dalam delapan tim.

PT Rekeningo (fiktif) kini menargetkan tiga negara dengan 10.000.000 user terdaftar (20% aktif tiap hari, Asumsi) dan 24 minggu (Asumsi cerita). Tim naik dari 28 menjadi 53 orang, dengan satu sampai dua orang baru tiap minggu. Jumlah user naik 10 kali, dan jumlah orang naik 53 ÷ 28 = 1,9 kali (Hitungan atas Asumsi cerita).

Tiga hal berubah sekaligus. Pertama, **uang melewati mata uang**: transfer antar negara membutuhkan kurs, dan jumlah posting di satu jurnal tidak bisa lagi dijumlahkan menjadi nol. Kedua, **data punya alamat**: data satu negara harus tinggal di tempat tertentu (Asumsi produk), sehingga satu database untuk semua tidak lagi menjadi pilihan. Ketiga, **koordinasi menjadi beban utama**: 53 orang dalam 11 tim merilis puluhan kali sehari ke enam service Tahap 5 dan service baru, dan tidak ada orang yang memahami semuanya.

Tahap 6 berangkat dari keadaan akhir Tahap 5 seperti ditulis halaman 5.1 sampai 5.32, bukan dari sistem yang sudah dibereskan:

- Enam service di Kubernetes, satu cluster PostgreSQL dengan schema dan role per service, tanpa foreign key lintas service (ADR 50). Ledger tetap satu-satunya tempat uang bergerak.
- Satu primary ledger dengan standby sinkron kuorum di dalam satu wilayah, replica asinkron untuk laporan, PgBouncer mode transaction (ADR 46, 48, 52). Tiga kelas baca dengan token LSN (ADR 47).
- Notifikasi lewat outbox dan event streaming, mTLS antar service di Go, satu sakelar kill switch, rilis bertahap lewat Argo Rollouts (ADR 51, 53, 55).
- Tim Platform 4 orang dan SRE 2 orang, SLO pembayaran 99,9% per 30 hari, dan template service yang di 5.27 disebut jalan beraspal (ADR 58).
- Tiga hal belum pernah diuji, menurut 5.29: skor risiko dalam 50 ms antar host, data di dua wilayah, dan 28 orang menjadi lebih dari 50. Kapasitas satu primary untuk 69,4 transaksi uang per detik juga belum pernah diukur.
- ADR 60 menunda dua belas butir dengan pemicu tertulis, dan menulis multi-region sebagai menunggu PRD v6.

Tim naik dari 28 menjadi 53 selama 24 minggu (Asumsi cerita). Sebelas tim:

| Tim | Orang | Pemimpin | Memegang |
| --- | --- | --- | --- |
| Pembayaran | 5 | Nadia | gateway, top-up bank, kartu virtual |
| Ledger dan Tabungan | 5 | Hendra | ledger tiap negara, cicilan, tabungan, tukar mata uang |
| Merchant | 5 | Wulan | merchant, QR, laporan, API untuk POS |
| Akun | 5 | Raka | app, akun, identitas |
| Notifikasi | 4 | Maya (tidak muncul di adegan) | pengiriman push, pengumuman |
| Risiko | 5 | Kirana | skor risiko, graf akun-perangkat, back office bersama tim risk |
| Wilayah | 5 | Arga | aturan per negara, integrasi bank lokal, residensi data |
| Pelaporan | 4 | (tidak muncul di adegan) | laporan Keuangan per negara dan per mata uang |
| Platform | 6 | Bayu | golden path, service catalog, cluster, pipeline |
| SRE | 5 | Dewi | SLO, giliran jaga, latihan failover |
| Security | 4 | Laras | threat model, tinjauan, uji penetrasi lokal |

Delapan tim produk berjumlah 5 + 5 + 5 + 5 + 4 + 5 + 5 + 4 = 38 orang, dan tiga tim fungsi 6 + 5 + 4 = 15 orang, jadi 53 (Hitungan atas Asumsi cerita). Rata-rata 53 ÷ 11 = 4,8 orang per tim. Yang tidak berubah: satu bahasa (Go di backend, Dart di app), PostgreSQL sebagai source of truth, dan ledger dari Tahap 2.

Tim Risiko adalah "tim fraud dan compliance engineering" di PROPOSAL dan pratinjau 5.32. Naskah ini memakai nama Risiko karena tidak membawa klaim kepatuhan (pilihan draf 19). Tim risk milik Ratih adalah tim bisnis yang memakai back office, bukan tim engineering ini.

### Tokoh baru

| Tokoh | Siapa | Ingin | Kelemahan | Yang dibawanya ke cerita |
| --- | --- | --- | --- | --- |
| **Kirana** | Engineer risiko yang memimpin tim Risiko. Lima tahun membangun skor penipuan di sistem lain, belum pernah memikirkan di mana data boleh tinggal. | Skor yang menangkap penipuan sebelum uang berpindah | Menganggap lebih banyak data selalu menaikkan ketepatan skor, termasuk data yang tidak boleh keluar dari satu wilayah | Skor risiko real-time, graf akun-perangkat |
| **Arga** | Engineer yang memimpin tim Wilayah. Pernah memasang integrasi bank di dua negara. | Setiap negara terasa seperti satu produk lokal | Menganggap aturan per negara cukup ditulis sebagai percabangan di kode | Aturan per negara, residensi data, mata uang |

Tokoh lama tetap:

- **Raka** memimpin tim Akun dan masih menulis backend bila perlu.
- **Nadia** memimpin tim Pembayaran dan masih cenderung mengusulkan solusi yang terlalu berat, kali ini aktif-aktif untuk semua hal.
- **Bayu** memimpin tim Platform dan masih menganggap bawaan komponen aman, kali ini bahwa portal yang terpasang sama dengan platform yang dipakai.
- **Hendra** memimpin tim Ledger dan Tabungan, dan masih menganggap pekerjaan berulang bisa dimulai lagi dari awal.
- **Wulan** memimpin tim Merchant dan masih menganggap data dari sistem sendiri aman ditampilkan.
- **Dewi** memimpin tim SRE dan masih menolak rilis tanpa metrik penjaga.
- **Laras** memimpin tim Security dan masih menandai hampir semua temuan sebagai kritis.
- **Ratih** memimpin tim risk (tim bisnis, bukan tim engineer, dan berbeda dari tim Risiko milik Kirana) dan memakai back office tiap hari.
- **Sinta** menulis PRD v6.
- **Budi** dan **Citra** memakai Rekeningo, dan Citra pindah ke negara kedua.
- **Bu Marni**, **Ani**, dan **Tomi** (mitra POS) tetap seperti Tahap 5.
- **Pak Hadi** menambah satu syarat, di bagian 1.
- **Pihak yang mencoba** tetap tidak dikenal, dan di Tahap 6 mencoba perbedaan antar negara.
- **Maya**, **Dimas**, dan **Dina** tidak muncul di adegan Tahap 6.

## 1. PRD v6 · Rekeningo untuk tiga negara

**Latar masalah.** Tahap 5 membuktikan satu negara dengan 1.000.000 user: laporan merchant dari replica, failover tanpa kehilangan uang, notifikasi massal, cicilan, dan pintu untuk mitra POS. Tiga kebutuhan belum terpenuhi. Rekeningo harus melayani user di dua negara lain dengan uang dan aturan mereka. Ia harus tetap hidup bila satu wilayah hilang. Ia juga harus bisa diubah oleh 53 orang tanpa saling menunggu. Ketiganya berlaku untuk 10 kali lipat user.

**Tujuan.** (1) 10.000.000 user terdaftar di tiga negara memakai Rekeningo tanpa perubahan di app selain mata uang. (2) Uang berpindah antar negara dengan kurs yang tercatat dan selisih yang tertelusur. (3) Data satu negara tinggal di wilayah yang ditetapkan untuk negara itu (Asumsi produk). (4) Pembayaran tidak berhenti dan tidak kehilangan uang saat satu wilayah hilang. (5) Tim yang membuat service baru tidak menunggu lebih dari satu hari.

**User.**

| User | Kebutuhan baru | Yang membuatnya berhenti memakai |
| --- | --- | --- |
| User umum (Budi dan Citra di negara berbeda) | Kirim uang antar negara, lihat saldo di mata uangnya sendiri | Kurs yang berubah diam-diam, saldo yang bergerak tanpa kejadian |
| Merchant (Bu Marni dan merchant di tiga negara) | Terima pembayaran di mata uang negaranya, laporan per mata uang | Selisih yang tidak bisa dijelaskan, pembayaran yang menunggu |
| Mitra POS (Tomi dan mitra di tiga negara) | API yang sama di tiga negara | Perbedaan perilaku antar negara tanpa kabar |
| Tim risk (Ratih) dan tim Risiko (Kirana) | Skor risiko yang melihat pola lintas negara | Skor yang terlambat, data yang tidak bisa dipakai |
| Keuangan (Pak Hadi) | Laporan resmi per mata uang dari catatan yang sama dengan ledger | Selisih pembulatan tanpa akun |
| 53 developer | Service baru dalam satu hari, perubahan tanpa rapat, giliran jaga yang adil | Menunggu tim lain, dibangunkan tiap pekan |

**Ruang lingkup (tiga negara, 10.000.000 user terdaftar, 2.000.000 aktif per hari, 53 developer, 24 minggu).**

| Prioritas | Fitur | Keterangan |
| --- | --- | --- |
| P0 | Tiga negara | 6.000.000, 2.500.000, dan 1.500.000 user (Asumsi cerita). Satu app, satu mata uang per negara, dan top-up lewat integrasi bank lokal tiap negara |
| P0 | Multi-mata uang dengan kurs | Transfer antar negara memakai kurs yang disimpan. Tiap mata uang punya ledger sendiri, dan tukar adalah dua jurnal yang terhubung. Setiap satuan di setiap mata uang tertelusur ke kejadian |
| P0 | Data per negara | Data identitas dan saldo satu negara disimpan di wilayah negara itu dan pasangan yang diizinkan (Asumsi produk, tanpa klaim hukum). Database dipisah per negara |
| P0 | Tidak berhenti saat satu wilayah hilang | Multi-region aktif-pasif untuk ledger. RPO nol untuk uang dan RTO wilayah 30 menit (Asumsi produk). RTO 15 menit untuk satu mesin tetap |
| P0 | Skor risiko real-time | Tiap pembayaran dan transfer mendapat skor dalam 50 ms (Asumsi naskah dari M51). Graf akun-perangkat dibangun tim Risiko |
| P0 | Platform internal | Golden path, service catalog, label biaya per tim, dan SLO per tim untuk 11 tim |
| P1 | Perubahan aman di skala | Rilis bertahap berbasis SLO dengan rollback otomatis, dan percobaan gangguan (chaos testing) berskala kecil |
| P1 | Data antar domain | Data yang dipakai tim lain disediakan sebagai produk dengan pemilik (data mesh sederhana) |

**Bukan lingkup v6.** Negara keempat, kartu fisik, pinjaman atau bunga, dan pindah ke aktif-aktif. PRD v6 tidak punya prioritas P2 yang menunjuk ke dokumen berikutnya. Hal yang sengaja belum dikerjakan ada di ADR 69 dengan pemicunya. PRD ini tidak membawa klaim izin, lisensi, atau kepatuhan regulasi di negara mana pun.

**Metrik keberhasilan (target, Asumsi).**

- 2.000.000 user aktif per hari (20% dari 10.000.000).
- 99,9% pembayaran tersedia per 30 hari di tiap negara (43,2 menit anggaran kegagalan), RPO nol, RTO satu mesin 15 menit, RTO satu wilayah 30 menit.
- Selisih pembulatan semua jurnal tukar tercatat di akun sendiri: 0 jurnal dengan jumlah posting bukan nol per mata uang.
- 0 akses staf ke data negara lain yang tidak tercatat.
- Service baru dari permintaan sampai pipeline hijau pertama dalam satu hari (Asumsi), dan lima metrik DORA per service dilaporkan tiap bulan.
- Biaya infrastruktur per transaksi dilaporkan tiap bulan per tim dari label biaya platform (Asumsi).
- Satu orang jaga paling banyak 25% waktunya (Asumsi turunan dari R6-15).

**Batasan.** 53 developer dalam 11 tim selama 24 minggu. Semua pihak ketiga fiktif atau tiruan. Security review Laras lolos sebelum tiap negara dibuka. Tahap ini tanpa lab: kapasitas satu primary, jaringan antar wilayah, dan jaringan antar host tetap belum terukur (bagian 4, "Yang tidak dibuktikan").

Syarat Pak Hadi bertambah: *"Saya menandatangani laporan per mata uang. Selisih pembulatan harus punya akun, dan tidak boleh ada saldo yang berubah tanpa kejadian."*

**Risiko yang ditulis Sinta.** Rekeningo pertama kali punya uang yang tidak bisa dijumlahkan langsung dan data yang tidak boleh berpindah. Organisasinya juga lebih besar dari kemampuan satu orang mengingat siapa memegang apa.

**Pertanyaan terbuka di PRD.**

- Kalau satu wilayah hilang, uang negara itu ada di mana, dan siapa yang tahu?
- Kalau dua negara punya aturan data berbeda, siapa yang boleh membuka data siapa?
- Kalau 11 tim merilis tiap jam, siapa yang tahu perubahan mana yang merusak?

Ketiganya tidak dijawab PRD dan menjadi isi Tahap 6.

### Yang dibuka lagi dari Tahap 5 (rumusan untuk blok halaman 6.1)

Halaman 6.1 punya prasyarat `t5-jembatan` dan blok bernama "Yang dibuka lagi dari Tahap 5". Blok itu membuka jawaban tebakan 5.32 ("Dari ADR Tahap 5, mana yang pecah lebih dulu?") dengan pola yang sama seperti 5.1 membuka jawaban 4.31. "Pecah" berarti halaman ADR itu sendiri menulis keadaan yang sama dengan satu isi PRD v6. Urutan "lebih dulu" adalah penalaran dari kalimat halaman ADR (Asumsi), bukan urutan kejadian yang direkam, dan tidak ada koreksi atas halaman 5.32, karena halaman itu membandingkan kalimat ADR dengan isi PRD, bukan dengan beban. Widget 5.32 menandai jawaban yang cocok sebagai ADR 58, 59, dan 60 bersama. Tiga kalimat berikut sudah tertulis di halaman ADR-nya sebelum PRD v6 ada (dibaca 2026-11-06):

| ADR | Kalimat di halaman Tahap 5 | Isi PRD v6 yang memenuhinya | Dilanjutkan di |
| --- | --- | --- | --- |
| 60 (5.30) | Multi-region salah saat "Satu region mati lebih lama dari RTO 15 menit, atau PRD v6 memintanya". Dibaca "Menunggu PRD v6" | Multi-region aktif-pasif | 6.6 (M55), ADR 64 |
| 59 (5.28) | Salah saat "Data harus tinggal di lokasi tertentu" (syarat dari PRD atau mitra), dan saat "Tim platform dan SRE melewati 6 orang" | Data per negara. Platform 6 dan SRE 5 berjumlah 11 orang (Asumsi cerita) | 6.8 (Keamanan), 6.3, 6.10 |
| 58 (5.27) | Salah saat permintaan template menunggu lebih dari satu minggu (Asumsi naskah), dan saat SLO 99,9% terlalu ketat untuk rilis hampir harian | 53 developer dalam 11 tim, golden path, dan SLO per tim | 6.3 (M52), 6.5 (M54) |

Dua pilihan lain di tebakan 5.32 dinilai "Belum cocok", karena kalimat halaman ADR 52 dan 56 tidak menulis isi PRD v6. Syarat jumlah koneksi ADR 52 dan syarat kuota ADR 56 bergantung pada beban, jadi 6.1 menghitungnya (Hitungan atas Asumsi):

- ADR 52 (5.17) menulis "8 pod tiap service memberi 480 client lawan 400 per instance". Anggap pod tumbuh sebanding beban (Asumsi desain). Tahap 5 memakai 3 pod untuk 1.388,9 request per detik, jadi 13.888,9 memakai 30 pod. Hasilnya 6 × 30 × 10 = 1.800 lawan 400, atau 4,5 kali. Syarat itu sudah terlewati pada 8 pod, yaitu 8 ÷ 3 = 2,7 kali beban Tahap 5, jauh sebelum 10 kali. Perbaikannya mengubah nilai (batas koneksi, jumlah instance pooler), bukan mengganti mode transaction (penalaran). Syarat itu terlewati karena jumlah pod, bukan karena isi PRD v6.
- Karena itu "pecah lebih dulu" punya dua urutan (penalaran). Menurut isi PRD v6, kalimat halaman ADR 58, 59, dan 60 cocok, seperti di widget 5.32. Menurut beban, syarat jumlah koneksi ADR 52 terlewati lebih dulu, pada 2,7 kali beban Tahap 5. Tebakan "ADR 52" di 5.32 benar tentang beban dan belum benar tentang mode transaction, dan blok 6.1 menulis keduanya.
- ADR 56 (5.25) menulis kuota 50 mitra × 100 per detik = 5.000 per detik, 3,6 kali puncak 1.388,9. PRD v6 tidak menulis jumlah mitra. Bila mitra ikut naik 10 kali (500, Asumsi), 50.000 ÷ 13.888,9 = 3,6, rasio yang sama. Bila mitra tetap 50, 5.000 ÷ 13.888,9 = 0,36. Syarat itu bergantung jumlah mitra, bukan jumlah user, dan kapasitas satu server tetap belum diukur.

Kalimat "client" memakai arti halaman 5.17 (koneksi dari pod ke pooler). Penulis halaman memakai kata yang sama dengan halaman itu dan memberi satu kalimat arti. Hitungan ini memberi satu pertanyaan tambahan, bukan jawaban. Bila seluruh request ke satu primary, L = λ × W = 13.888,9 × 0,02 = 277,8 koneksi tertahan. Untuk negara terbesar (60%) hasilnya 166,7. Pembandingnya server pool 60 dan 97 koneksi tersedia di ADR 52, dengan W 0,02 detik sebagai Asumsi naskah Tahap 5. Bacaan lewat replica dan jumlah koneksi sebenarnya tidak dihitung dan belum terukur.

Penulis halaman juga membaca ulang enam ADR Tahap 5 terhadap PRD v6, dengan pola 5.1. ADR 48 (standby sinkron di satu wilayah) dilanjutkan ADR 64, dan ADR 50 dilanjutkan ADR 62. ADR 55 (satu sakelar per primary) dilanjutkan ADR 63. ADR 57 (tempat KEK dan file arsip di produksi belum diputuskan, 5.26) dilanjutkan ADR 66. ADR 54 (kunci bisnis) dilanjutkan ADR 65, dan ADR 59 (model biaya tiga tahun) dilanjutkan ADR 67. Penulis halaman membuka halaman ADR-nya sebelum mengutip.

## 2. Dari fitur ke pekerjaan teknis

| Fitur | Di app | Di backend | Di database | Konsep yang akan dibutuhkan |
| --- | --- | --- | --- | --- |
| Tiga negara | Satu app, mata uang dan bahasa per negara | Request diarahkan ke wilayah negara user | Tiga database dengan schema yang sama | Database per negara, residensi data |
| Multi-mata uang | Jumlah dalam unit terkecil, tampil sesuai mata uang | Tukar sebagai dua jurnal terhubung, kurs berversi | Ledger per mata uang, akun likuiditas, akun selisih pembulatan | Ledger multi-mata uang, saga, minor unit |
| Data per negara | Tidak ada perubahan yang terlihat | Aturan per negara dari kebijakan, akses staf tercatat | KEK per wilayah, `audit_log` per negara | Residensi data, kunci per wilayah, kebijakan sebagai kode |
| Tidak berhenti saat satu wilayah hilang | Tidak ada perubahan yang terlihat | Failover wilayah yang dilatih | Standby sinkron di wilayah pasangan | Multi-region aktif-pasif, RPO dan RTO, akun panas |
| Skor risiko real-time | Sinyal perangkat dikirim app | Skor dalam satu proses, graf akun-perangkat | Salinan fitur baca-saja, sinyal pseudonim | Fraud sebagai fungsi engineering, biaya per transaksi |
| Platform internal | Pipeline app dari template | Template service, katalog, label biaya per tim, SLO per tim | Katalog pemilik data | Platform sebagai produk, golden path, kepemilikan domain, FinOps |
| Perubahan aman dan data antar domain | Rilis app bertahap | Canary berbasis SLO, flag berpemilik, data sebagai produk | Garis waktu perubahan | Error budget, chaos testing, data mesh sederhana |
| 53 developer, 11 tim | Paket app per tim | Giliran jaga lintas tim | - | On-call, SLO, DORA |

Dari tabel ini lahir pertanyaan pertama Tahap 6, sebelum satu baris kode: **tiap data punya satu rumah, dan tiap rumah punya satu pemilik**. Cara pertama yang ditulis tim memperlakukan semua negara, wilayah, dan tim seperti satu, dan itu bagian 3.

## 3. Inti teknis Tahap 6 · Tiap data punya satu rumah

Ini jantung Tahap 6. Pertanyaannya dirumuskan di minggu 0, sebelum masalah apa pun muncul. Di Tahap 5 arahnya salinan ke luar. Di Tahap 6 arahnya batas: batas mata uang, batas negara, batas wilayah, dan batas tim.

Tiga hal harus selalu benar. Dua pertama melanjutkan Tahap 2 dan 5, dan yang ketiga baru di Tahap 6:

1. Uang bergerak hanya lewat ledger, dan jurnal seimbang per mata uang. Satu jurnal tidak pernah menjumlahkan dua mata uang. Tukar adalah dua jurnal yang terhubung, dan selisih pembulatan masuk akun sendiri (syarat Pak Hadi di PRD v6).
2. Data satu negara punya satu rumah, yaitu wilayah negara itu dan pasangan yang diizinkan. Uang tidak dibaca dari salinan di luar primary (ADR 45 aturan 2). Salinan, ringkasan, dan sinyal hanya untuk dilihat, bukan untuk memutuskan (syarat Pak Hadi di PRD v5), dengan jarak ketertinggalan dan batas wilayah yang disebut.
3. Tiap service, data, dan giliran jaga punya satu pemilik yang tercatat. Perubahan oleh pemilik itu lewat jalur yang sama, dan tim lain membaca lewat API atau event, bukan lewat tabel.

**Versi pertama (minggu 2).** Arga menulis tiga database negara sebagai tiga salinan schema yang sama. Kirana mengusulkan satu graf akun-perangkat di wilayah pusat. Nadia mengusulkan aktif-aktif supaya tidak ada failover. Bayu memasang portal developer dan menganggap platform sudah ada. Pelaporan membaca langsung tabel tim lain supaya laporan cepat selesai. Di staging dengan tiga negara kecil tiap bagian tampak cukup.

| Kejadian | 1. Uang bergerak lewat ledger, seimbang per mata uang | 2. Data punya satu rumah | 3. Satu pemilik tercatat |
| --- | --- | --- | --- |
| Transfer antar negara dibuat satu jurnal dengan dua mata uang | Rusak: jumlah posting tidak nol (M56) | Tidak berlaku | Tidak berlaku |
| Graf akun-perangkat di wilayah pusat memuat identitas semua negara | Terjaga | Rusak: data keluar dari wilayahnya (Keamanan 13) | Tidak berlaku |
| Wilayah negara pertama hilang dan pasangan hanya asinkron | Rusak: transaksi yang dijawab sukses ikut hilang (M55) | Terjaga bila pasangan diizinkan | Tidak berlaku |
| Pelaporan membaca tabel tim Pembayaran | Terjaga | Tidak berlaku | Rusak: migration pemilik merusak pembaca (M53) |
| Service baru menunggu template tiga minggu | Tidak berlaku | Tidak berlaku | Rusak: tim menyalin pipeline tanpa pemilik jalur (M52) |
| Sembilan perubahan dalam 30 menit tanpa garis waktu | Tidak berlaku | Tidak berlaku | Rusak: penyebab tidak punya pemilik (M54) |
| Skor risiko dipecah menjadi tiga service | Terjaga | Tidak berlaku | Rusak: biaya dan latensi tidak punya pemilik (M57) |

Tidak satu pun baris tabel ini direkam. Kalimat di dalamnya adalah penalaran dari dokumentasi dan angka di bagian ini (Tidak dijalankan). Pengecualiannya baris skor risiko, yang memakai rekaman Tahap 5 `labs/t5-gabung/output/` (Rekaman lab, dengan jeda buatan).

Halaman ini menanam tiga pertanyaan. Di minggu 1 Pak Hadi bertanya angka mana yang ia tanda tangani bila satu laporan memuat dua mata uang. Laras bertanya siapa yang boleh membuka data negara kedua. Dewi bertanya siapa yang dibangunkan bila pembayaran negara ketiga gagal pukul 03.10. Jawaban Pak Hadi ada di M56, jawaban Laras di halaman Keamanan 13, dan jawaban Dewi di halaman Tim dan infra.

**Yang pembaca lakukan.** Kalkulator di halaman 6.2: tebak dulu puncak request per detik untuk satu skenario, lalu pilih skenario Tahap 6, Aktif 10%, atau negara pertama saja, dan lihat puncaknya berubah. Sesudah itu baca tabel kejadian di atas: kolomnya menunjukkan hal mana yang rusak.

**Yang dipelajari Raka dengan susah payah.** Pola yang sama muncul lagi di tiap batas. Setiap data diberi rumah, pemilik, dan jarak ketertinggalan, dan tidak ada yang memutuskan uang dari salinan.

### Angka beban Tahap 6 (Asumsi, rumus ditulis)

Masukan semuanya Asumsi dan menunggu `T6-siap` di registry. Isinya 10.000.000 user terdaftar, aktif 20%, 60 request per user aktif per hari, faktor puncak 10, dan 86.400 detik per hari. Bentuk registry (kunci `tahap[].asumsi` Tahap 5): `user` 10000000, `aktif` 20, `req` 60, `puncak` 10, `trx` 2, `baris` 300, `upload` 200000, `fileKB` 500, dan `tim` "50+ developer". Transaksi uang 3 per user aktif per hari mengikuti naskah Tahap 2 sampai 5. Registry Tahap 5 memakai 2, jadi hasil dengan 2 ditulis di sebelahnya (pilihan draf 4). Kenaikan 10 kali dari Tahap 5 datang dari user yang naik 10 kali dan masukan lain yang dianggap tetap (R6-30). Pembagian per negara 60%, 25%, dan 15% adalah Asumsi cerita. Hasil rumus memakai label masukan terlemahnya, jadi seluruh tabel berlabel Asumsi.

| Besaran | Rumus | Masukan | Hasil |
| --- | --- | --- | --- |
| User aktif | user × persen aktif | 10.000.000 × 20% | 2.000.000 per hari; per negara 1.200.000, 500.000, dan 300.000 |
| Request per detik | aktif × request ÷ 86.400 × puncak | 2.000.000 × 60 = 120 juta per hari | 1.388,9 rata-rata dan 13.888,9 puncak (Tahap 5: 1.388,9 puncak). Per negara: 8.333,3, 3.472,2, dan 2.083,3 (R6-30) |
| Transaksi uang | aktif × trx ÷ 86.400 × puncak | 2.000.000 × 3 = 6.000.000 per hari (trx 2: 4.000.000) | 69,4 rata-rata dan 694,4 puncak (trx 2: 46,3 dan 463,0). Makan siang (80% dalam 90 menit): 888,9 (trx 2: 592,6). Per negara pada trx 3: 416,7, 173,6, dan 104,2 (R6-31) |
| Notifikasi uang | (transaksi + top-up) ÷ 86.400 × puncak | (6.000.000 + 2.000.000 × 0,25) ÷ 86.400 × 10 | 752,3 puncak (trx 2: 520,8), sama dengan 5.29 |
| Data posting | aktif × trx × 2 × 365 × byte | 2.000.000 × 3 × 2 × 365 = 4,38 miliar; 250 B per posting | 1.095 GB per tahun, atau ±1,1 TB (trx 2: 2,92 miliar dan 730 GB). Rumus registry (1 baris 300 B): 438 GB (trx 2) dan 657 GB (trx 3). Tahap 5: 109,5 GB, dan 43,8 serta 65,7 GB bila rumus registry (R6-32) |
| File identitas | upload × KB × 365 | 200.000 per hari × 500 KB | 100 GB per hari, 36,5 TB per tahun (Tahap 5: 10 GB dan 3,65 TB; upload 10 kali, Asumsi) (R6-32) |
| Latensi antar wilayah | RTT = 2 × jarak ÷ kecepatan | 1.000 km dan 3.000 km; ±200.000 km per detik di serat (±2/3 kecepatan cahaya, Asumsi) | 10 ms dan 30 ms, batas bawah fisik tanpa peralatan jaringan (R6-09, R6-33) |
| RPO aktif-pasif asinkron | jeda × laju puncak | jeda 1 detik dan 5 detik (Asumsi); 694,4 (trx 2: 463,0) | 694 (463) dan 3.472 (2.315) transaksi bisa hilang saat failover (Tahap 5: 69). Bila semua lewat satu primary, batas atas. Negara terbesar (60%): 416,7 (277,8) dan 2.083,3 (1.388,9) (R6-34) |
| Akun panas | batas per akun 1 ÷ RTT lawan laju akun | merchant besar di negara terbesar, 5% dari puncak seluruh negara (Asumsi cerita): 34,7 per detik (trx 2: 23,1) | Batas 100 per detik pada 1.000 km dan 33,3 pada 3.000 km. Pada 3.000 km: 34,7 ÷ 33,3 = 104% (trx 2: 69%); pada 1.000 km 35%. Lock baris ditahan selama commit menunggu standby: Penalaran [perlu verifikasi] (R6-35, R5-250) |
| Anggaran kegagalan | (1 − SLO) × 43.200 menit | SLO 99,9%, 99,95%, 99,99% | 43,2, 21,6, dan 4,32 menit per 30 hari. Transaksi gagal pada 99,9%: 0,001 × 180 juta per bulan = 180.000 (trx 2: 120.000) (R6-36) |
| SLO berantai | SLO^n untuk n service serial | 4 service di jalur bayar, masing-masing 99,9%, kegagalan independen (Asumsi) | 0,999^4 = 0,9960, atau 99,6%: 172,5 menit per 30 hari, empat kali anggaran satu service |
| Hilang satu wilayah | menit henti ÷ anggaran | 47 menit (Ilustrasi, M55) ÷ 43,2 | 108,8% anggaran 30 hari di negara itu (30 menit RTO wilayah: 69,4%) |
| Giliran jaga | (primer + sekunder) ÷ orang dalam rotasi | 2 ÷ 5, 2 ÷ 8, 2 ÷ 10; batas 25% (SRE Book bab 11, R6-15) | 40%, 25%, 20%, dengan primer dan sekunder dihitung penuh (Asumsi turunan). Rata-rata 53 ÷ 11 = 4,8 orang per tim (R6-37) |
| Koneksi database | λ × W | 13.888,9 × 0,02 detik; negara terbesar 8.333,3 × 0,02; transaksi uang saja 694,4 × 0,02 | 277,8, 166,7, dan 13,9 koneksi tertahan lawan 97 tersedia dan server pool 60 di ADR 52. Bacaan lewat replica dan koneksi sebenarnya belum terukur |
| Skor risiko | panggilan × laju | 6 panggilan per skor lewat rantai tiga proses dan queue (Rekaman lab `labs/t5-gabung/output/panggilan.txt` bagian B) × 694,4 | 6 × 694,4 = 4.166,4 panggilan per detik (nilai tepat 4.166,7). Anggaran skor 50 ms ÷ 6 = 8,3 ms per panggilan. Bila tiap panggilan menambah 10 ms, 6 × 10 = 60 ms (Hitungan atas Asumsi; Rekaman lab `latensi.txt` bagian B untuk jeda buatan 10 ms per panggilan). Angka 10 ms itu jeda per panggilan, bukan RTT antar wilayah, karena ketiga service skor ada di satu wilayah (ADR 67) |
| Frekuensi rilis | tim × rilis per tim per hari ÷ jam kerja | 11 × 4 ÷ 8 | 44 per hari, 5,5 per jam (Asumsi cerita) |
| Orang per tim | developer ÷ tim | 53 ÷ 11 | 4,8 (Tahap 5: 28 ÷ 8 = 3,5) |

Tiga kesimpulan dari tabel ini menentukan tahap. Pertama, beban 13.888,9 request per detik naik 10 kali, tetapi yang melewati batasnya lebih dulu bukan request. Yang melewatinya adalah batas yang bergantung pada jarak (30 ms, 33,3 per detik), pada orang (40% jaga), dan pada kegagalan beruntun (99,6%).

Kedua, tidak ada hitungan di tabel ini yang menunjukkan satu primary tidak sanggup 416,7 transaksi uang per detik di negara terbesar. Itu tidak pernah diukur di repo ini, dan Tahap 6 tidak punya lab untuk mengukurnya.

Ketiga, yang berbahaya adalah **batas yang tidak punya pemilik dan jarak yang tidak dihitung**, bukan banyaknya request. Tabel ini memakai dasar yang sama dengan Tahap 2 sampai 5: Little's Law (R2-35) dan hasil yang tidak diketahui sesudah gagal.

Pemicu ADR 60 dibaca ulang dengan angka di atas. "Terpenuhi" berarti halaman Tahap 6 menulis keadaan yang sama dengan pemicunya, bukan bahwa komponennya terbukti perlu.

| Butir ADR 60 | Pemicu yang ditulis (5.30) | Tahap 5 | Tahap 6 (Hitungan atas Asumsi, atau Ilustrasi) | Dilanjutkan |
| --- | --- | --- | --- | --- |
| 1. Service mesh penuh | Lebih dari satu tujuan kritis butuh identitas yang sama | Satu (ledger) dipanggil tiga service | Empat tujuan kritis: ledger tiga negara, skor risiko, kebijakan, katalog data (Ilustrasi). Terpenuhi untuk identitas, dikerjakan di template golden path tanpa mesh | M52, ADR 61 |
| 2. Multi-region | Satu region mati lebih lama dari RTO 15 menit, atau PRD v6 memintanya | Menunggu PRD v6 | PRD v6 memintanya, dan M55 menulis 47 menit mati (Ilustrasi): terpenuhi untuk aktif-pasif | M55, ADR 64 |
| 3. Database per service | Dua service saling memperlambat, terbaca dari L per schema | Belum terukur | Belum terukur. Database per negara bukan database per service | ADR 69 |
| 4. Sharding | Satu primary tidak menampung tulis 69,4 transaksi uang per detik | Belum terukur | Belum terukur: negara terbesar 416,7, seluruhnya 694,4. Database per negara memenuhi definisi sharding di 5.30 dan glosarium (tiga data store, skema sama, data berbeda, dibagi menurut shard key negara). Alasannya residensi, bukan kapasitas, jadi pemicu kapasitas butir ini tidak dibuka | ADR 65, ADR 66, ADR 69 |
| 5. BFF terpisah (dan GraphQL) | Satu layar butuh lebih dari 3 request berurutan | Belum diukur | Belum diukur oleh tim Akun | ADR 69 |
| 6. Login sosial | PRD memintanya | Tidak diminta | PRD v6 tidak memintanya | ADR 69 |
| 7. gRPC | Tambahan p95 satu lompatan HTTP melewati 50 ms antar host | Antar host belum diukur | Antar wilayah dibatasi RTT 10 sampai 30 ms, bukan format panggilan (penalaran) | ADR 69 |
| 8. CDC dengan Debezium | Relay outbox tertinggal lebih dari 30 detik terus-menerus | Belum punya angka | Belum punya angka | ADR 69 |
| 9. TigerBeetle dan Temporal | Ledger tidak menampung tulis, atau jenis alur panjang lebih dari tiga | Satu jenis (cicilan dan tabungan) | Satu alur panjang (cicilan dan tabungan, satu mesin status) dan satu saga pendek (tukar lintas negara, penalaran): tidak lebih dari tiga. Tulis belum terukur | ADR 69 |
| 10. SLSA, HTTP Message Signatures, atestasi app | Pihak luar atau auditor memintanya | Tidak diminta | Tidak diminta di PRD v6 | ADR 69 |
| 11. Event sourcing penuh | PRD atau auditor meminta keadaan entitas selain saldo pada titik waktu mana pun | Tidak diminta | Tidak diminta. Graf akun-perangkat butuh riwayat sinyal, yang dijawab penyimpanan sinyal append-only (penalaran) | ADR 69 |
| 12. OpenFeature dan flagd | Spesifikasi mencapai 1.0 dan flag aktif lebih dari satu | v0.9.0, satu flag | v0.9.0 (terbit 2026-07-29, dicek 2026-11-06) dan flag aktif banyak: satu dari dua syarat | ADR 63, ADR 69 |

Dari dua belas butir, dua terpenuhi dan dikerjakan sebagian. Butir 1 hanya untuk identitas di template (ADR 61, tanpa mesh penuh). Butir 2 hanya untuk aktif-pasif (ADR 64, tanpa aktif-aktif).

Sepuluh butir tetap tidak dikerjakan. Enam belum terukur (butir 3, 4, 5, 7, 8, 9), tiga tidak diminta (butir 6, 10, 11), dan satu belum terpenuhi (butir 12). Di Tahap 5, kolom "Dibaca" di 5.30 menulis dua belum terpenuhi (butir 1 dan 12), satu menunggu PRD v6 (butir 2), dan sisanya sama.

ADR 69 memuat dua belas baris bernomor sama dengan ADR 60. Isinya butir 3 sampai 12, ditambah bagian butir 1 dan 2 yang tidak dikerjakan (mesh penuh dan aktif-aktif). GraphQL digabung ke baris BFF (butir 5).

Aktif-aktif dan GraphQL adalah dua dari empat butir "ada, dan ini kapan kamu akan butuh" di PROPOSAL. Dua butir lain, service mesh dan event sourcing penuh, sudah ada di dua belas butir ADR 60. Pemicu event sourcing tidak punya angka, jadi pembacaannya adalah penalaran penulis halaman.

## 3b. Skema data: apa yang berubah dari Tahap 5 ke Tahap 6

Tahap 6 tidak membangun skema dari database, jadi tidak ada ERD6, dan `tools/erd.py` tidak dijalankan. Halaman 6.2 menampilkan ERD Tahap 5 (30 tabel dari `situs/data/erd/tahap-5.json`) sebagai keadaan awal, dan tabel di bawah menulis apa yang berubah secara konseptual. Semuanya Ilustrasi: tak satu baris pun dicocokkan dengan skema lab.

| Tahap 5 | Tahap 6 (Ilustrasi) | Alasan | Masalah atau syarat |
| --- | --- | --- | --- |
| Satu cluster, 30 tabel dalam enam schema service | Tiga database negara dengan schema service yang sama | Data satu negara punya satu rumah | Keamanan 13, ADR 65 |
| `buku` tanpa mata uang | `buku` + kode mata uang dan eksponen (rupiah: 0) | Jurnal seimbang per mata uang | M56 |
| `jurnal` | `jurnal` + penghubung tukar (satu pasangan jurnal) dan kurs sebagai pembilang dan penyebut bilangan bulat | Tukar adalah dua jurnal terhubung | M56 |
| (tidak ada) | `kurs` (pasangan mata uang, pembilang, penyebut, berlaku dari, sumber), buku jenis likuiditas dan selisih pembulatan | Kurs berversi, selisih punya akun | M56 |
| `akun` | `akun` + negara | Rumah data ditentukan negara | Keamanan 13 |
| (tidak ada) | `sinyal_risiko` (hash perangkat, rujukan akun pseudonim, waktu) dan salinan fitur baca-saja untuk skor | Skor dalam satu proses | M57, ADR 66 |
| `sakelar` (satu primary) | `sakelar` per database negara | Kill switch per negara | ADR 63 |
| `audit_log` (Tahap 4) | `audit_log` per negara, akses staf lintas negara tercatat | Residensi dan akses | ADR 66 |
| Katalog di luar database | Service catalog: pemilik, on-call, SLO, produk data | Kepemilikan domain | M52, M53 |

Pertumbuhan skala database Tahap 5 dan 6 memakai rumus naskah Tahap 2: *posting per tahun = transaksi per hari × 2 × 365*, dengan ±250 byte per posting.

| Tahap | User | Tabel inti | Baris terbesar per tahun | Ukuran per tahun | Perubahan skema penting |
| --- | --- | --- | --- | --- | --- |
| 5 | 1 juta | 30, dibagi per service | `posting` ±440 juta (438 juta), dipartisi per bulan | ±110 GB (109,5 GB) | Partisi, snapshot saldo, read replica, cicilan, API untuk POS |
| 6 (proyeksi) | 10 juta | ±30 per negara, tiga database | `posting` ±4,4 miliar (4,38 miliar) | ±1 TB (1.095 GB) | Multi-mata uang dan kurs, database per negara, data per negara |

Tabel 3b menulis ukuran Tahap 6 ±1 TB, seperti tabel naskah Tahap 2 dan halaman 5.3. Bagian 3 menulis 1.095 GB atau ±1,1 TB. Itu satu nilai dengan dua pembulatan (Hitungan atas Asumsi).

Pola yang ditanam: di Tahap 6 database tumbuh karena **batas**, bukan fitur atau salinan. Tabel baru sedikit, tetapi tiap tabel lama memperoleh pemilik, negara, dan mata uang.

## 4. Masalah yang muncul, pelan-pelan

Pola sama dengan Tahap 2 sampai 5. Gejala yang dilihat orang, lalu yang Raka, Nadia, atau Bayu kira, lalu yang sebenarnya, konsep, dan keputusan. Angka kejadian di kolom gejala berlabel Ilustrasi kecuali ada hitungan yang ditulis. Semua kalimat di kolom "Yang sebenarnya" adalah Hitungan atas Asumsi, Penalaran (Tidak dijalankan), atau Rekaman lab Tahap 5 yang disebut dengan nama file-nya. Setiap halaman Masalah juga memuat ADR-nya (jenis "Masalah + ADR").

| # | Minggu | Gejala yang dilihat orang | Yang dikira | Yang sebenarnya | Konsep yang lahir | Keputusan (ADR) |
| --- | --- | --- | --- | --- | --- | --- |
| M52 | 3 | Selasa tim Notifikasi meminta service baru untuk pengumuman per negara, dan template dari Platform baru jadi sesudah 17 hari. Dalam 17 hari itu tim Wilayah dan Risiko menyalin pipeline tim lain. Dewi menghitung empat bentuk pipeline dan tiga cara memuat sertifikat mTLS di sebelas tim (Ilustrasi). | Platform kurang orang. Bayu meminta tiga orang. Nadia: tiap tim membuat pipeline sendiri | Platform bekerja sebagai queue tiket: tak ada daftar tim yang memakainya, tak ada target waktu membuat service, dan tak ada ukuran yang dilihat siapa pun. 17 hari melewati syarat salah ADR 58 (satu minggu, Asumsi naskah). Tambah orang memendekkan queue tanpa mengubah bentuknya (penalaran). Empat pipeline berarti tiap perbaikan keamanan dikerjakan empat kali. Tujuan kritis yang butuh identitas sama sudah empat (bagian 3, butir 1). DORA kini lima metrik dan paling cocok diukur per aplikasi atau service (R6-04) | **Platform sebagai produk**; golden path; service catalog; ukuran lead time dan adopsi | ADR 61: platform dijalankan sebagai produk dengan golden path, katalog, roadmap, dan ukuran; mTLS ada di template, tanpa mesh |
| M53 | 6 | Rabu tim Pelaporan, yang menyiapkan laporan Keuangan per negara, diberi hak baca atas schema pembayaran "sementara" karena event-nya belum ada. Kamis tim Pembayaran mengganti nama satu kolom lewat migration. Jumat 06.00 laporan tutup buku negara kedua kosong, dan Pak Hadi menunda tanda tangan satu hari (Ilustrasi). | Pelaporan tidak membaca pengumuman migration. Bayu: tambah rapat sinkronisasi migration tiap minggu antar sebelas tim | Hak baca lintas schema adalah contract yang tidak tertulis. Halaman 5.13 menulis bahwa ADR 50 memberi tiap service schema dan role sendiri, menghapus foreign key lintas service, dan memasang daftar periksa review "service tidak membaca tabel service lain". Halaman itu tidak menulis cara memeriksanya selain review (penalaran), jadi hak baca "sementara" lolos. Conway: sistem menyalin struktur komunikasi organisasi pembuatnya (R6-05). Sebelas tim butuh batas yang terbaca di sistem, bukan rapat. Data yang dipakai tim lain adalah produk: ia punya pemilik, skema berversi, dan kesegaran yang disebut. Laporan resmi Keuangan tetap dibaca dari catatan yang sama dengan ledger (syarat Pak Hadi di PRD v5), jadi laporan resmi adalah produk milik tim Ledger | **Kepemilikan domain**; data sebagai produk; data mesh sederhana (empat prinsip, R6-06) | ADR 62: data untuk tim lain hanya lewat API atau event berversi; hak baca lintas schema dicabut; laporan resmi milik tim Ledger |
| M54 | 9 | Kamis 10.00 pembayaran negara kedua gagal 2,0% selama 22 menit. Dewi bertanya apa yang berubah dalam 30 menit terakhir: sembilan perubahan dari lima tim (dua deploy, tiga flag, satu aturan skor, satu migration, dua perubahan konfigurasi). Tak ada yang tahu mana penyebabnya. Pada hari ke-19 anggaran kegagalan 43,2 menit sudah terpakai 46 menit (Ilustrasi). | Bayu: rapat persetujuan rilis harian dengan wakil tiap tim. Nadia: bekukan rilis tiap Kamis | Kejadian Kamis itu setara 22 × 0,02 = 0,44 menit henti penuh (Hitungan atas Ilustrasi), jadi anggaran habis oleh banyak kejadian kecil yang penyebabnya tidak tercatat. Rilis 44 per hari, 5,5 per jam (Hitungan atas Asumsi), membuat rapat menjadi queue baru, dan pembekuan hanya menurunkan frekuensi tanpa mengurangi risiko tiap rilis (penalaran). Yang kurang: satu garis waktu perubahan, rilis bertahap dengan analisis otomatis atas SLO dan rollback otomatis (R6-14), dan kebijakan error budget yang ditulis sebelum anggaran habis, yang bukan hukuman (R6-13). Empat service serial dengan SLO 99,9% masing-masing memberi 99,6% di jalur bayar (Hitungan atas Asumsi), jadi SLO tiap tim harus lebih ketat dari SLO produk | **Perubahan aman di skala**; SLO per tim; error budget; canary berbasis SLO; chaos testing | ADR 63: SLO per service, canary dengan analisis SLO dan rollback otomatis, flag berpemilik, garis waktu perubahan, kebijakan error budget, percobaan gangguan berskala kecil |
| M55 | 12 | Selasa 03.40 wilayah utama negara pertama tidak terjangkau 47 menit karena gangguan jaringan penyedia. Pembayaran negara itu berhenti sampai pasangan dipromosikan, dan sekitar 63 transaksi uang yang sudah dijawab sukses tidak ada di pasangan: jeda 1,5 detik pada laju rata-rata negara itu, 69,4 × 60% = 41,7 per detik, jadi 1,5 × 41,7 = 62,55 (Ilustrasi; batas atas, karena pukul 03.40 lebih sepi dari rata-rata). 47 menit melewati RTO wilayah 30 menit. Sinta bertanya kenapa tidak berpindah otomatis. | Nadia: aktif-aktif, dua wilayah menerima tulis, tanpa failover. Raka: pindah ke penyedia dengan failover otomatis | Aktif-aktif yang menjaga konsistensi kuat atas akun yang sama menuntut serialisasi lintas wilayah. Tiap commit menunggu RTT minimum (10 ms pada 1.000 km, 30 ms pada 3.000 km; R5-250 dan R6-33), sehingga akun panas dibatasi 1 ÷ RTT: 100 dan 33,3 jurnal per detik. Merchant besar di negara terbesar, 5% dari puncak seluruh negara, 34,7 per detik, melewati 33,3 pada 3.000 km (104%; trx 2: 69%, Hitungan atas Asumsi). Replica asinkron memberi RPO lebih dari nol: laju puncak negara itu dikali jeda, yaitu 416,7 (trx 2: 277,8) transaksi per detik jeda di negara terbesar, dan 694 (463) bila seluruhnya lewat satu primary (Hitungan atas Asumsi). Failover otomatis dari health check berisiko alarm palsu, dan tanpa fencing menghasilkan dua primary (R6-07, R5-24). Multi-site aktif-aktif adalah yang paling kompleks dan mahal (R6-07). Spanner memakai TrueTime, infrastruktur jam Google. Makalahnya (2012) menulis bahwa F1 memakai lima replika di seluruh Amerika Serikat dan bahwa kebanyakan aplikasi lain "will probably" mereplikasi data ke 3 sampai 5 datacenter di satu wilayah geografis, jadi itu perkiraan penulisnya (R6-21) | **Multi-region aktif-pasif**; RPO dan RTO lintas wilayah; akun panas; latensi antar wilayah | ADR 64: standby sinkron di wilayah pasangan paling jauh 1.000 km; failover wilayah diputuskan manusia dengan fencing; aktif-aktif sengaja belum |
| M56 | 15 | Budi mengirim Rp100.000 ke Citra yang kini memakai Rekeningo di negara kedua. Tim Wilayah membuat jurnal tukar dengan empat posting dan mengecualikannya dari aturan "jumlah posting nol". Sesudah seminggu Pak Hadi menemukan 8.213 jurnal tukar yang jumlah postingnya bukan nol, rata-rata Rp19, dan tak ada akun untuk selisihnya (Ilustrasi). | Pembulatan kurs: tambah desimal, atau pakai pustaka decimal 31 digit | Aturan seimbang berlaku per mata uang, jadi satu jurnal tidak bisa menjumlahkan dua mata uang. Tukar adalah dua jurnal di dua ledger, terhubung lewat akun likuiditas milik penyedia likuiditas, dan spread sebagai posting terpisah (R6-10). Dokumentasi itu menautkan kedua transfer secara atomik di satu cluster dan menyuruh membulatkan demi akun likuiditas. Di sini tautannya saga, karena kedua ledger ada di database berbeda, dan sisa pembulatan masuk akun selisih sendiri supaya tertelusur (Asumsi desain, syarat Pak Hadi). Menormalkan semua saldo ke satu mata uang membuat saldo bergerak tiap kurs berubah, yang dihindari (R6-10). Contoh: Rp100.000 ÷ kurs 10.350 = 9,66184 → 9,66 satuan; 9,66 × 10.350 = 99.981, sisa Rp19 (Hitungan atas Ilustrasi). Pembagian di pustaka decimal Go yang dibaca punya presisi bawaan 16 digit di belakang koma (R6-39), jadi simpan bilangan bulat dan tulis pembulatan sendiri (R6-10). Dua ledger di dua database berarti bukan satu transaction: saga | **Ledger multi-mata uang**; minor unit; kurs; saga lintas database | ADR 65: ledger per mata uang di database per negara; tukar dua jurnal terhubung; selisih pembulatan punya akun; kurs bilangan bulat dan pembulatan tertulis |
| M57 | 19 | Untuk pertama kali biaya infrastruktur dilaporkan per tim dari label biaya yang dipasang platform. Tagihan bulan lalu 2,4 kali bulan sebelumnya, transaksi 1,3 kali, jadi biaya per transaksi naik 2,4 ÷ 1,3 = 1,85 kali. Tim Risiko 41% dari kenaikan. P95 skor risiko 140 ms, anggarannya 50 ms (Ilustrasi). | Dewi: kurang cache. Nadia: tambah pod skor supaya p95 turun | Skor dipecah menjadi tiga service (akun, perangkat, riwayat; di lab bernama masuk, perangkat, dan riwayat) mengikuti kepemilikan domain, dan satu skor melewati ketiganya lewat queue: 6 panggilan, yaitu kirim dan ambil tiap proses (Rekaman lab `labs/t5-gabung/output/panggilan.txt` bagian B). 6 × 694,4 = 4.166,4 panggilan per detik (Hitungan atas Asumsi). Pada jeda buatan 10 ms per panggilan batas bawah p95 60 ms, di atas 50 ms (Rekaman lab `latensi.txt` bagian B). Bentuk lain, satu pemanggil yang memanggil ketiga service tanpa queue, Tidak dijalankan di lab. Dalam skenario ini biaya tumbuh dari jumlah service dan panggilan, bukan data: ±620 byte per transaksi di lab (`panggilan.txt`). Padanan Prime Video: pindah ke satu proses menurunkan biaya infrastruktur lebih dari 90%, untuk satu service, bukan seluruh layanan (tulisan karyawan tentang sistemnya sendiri, terbit 2023-03-22; sumbernya menulis dua sumber biaya, yaitu orkestrasi dan perpindahan data besar antar komponen; R5-171) | **FinOps**; biaya per transaksi; kapan menggabungkan kembali; skor risiko real-time | ADR 67: biaya per transaksi menjadi kendala yang ditulis di tiap ADR; skor risiko dalam satu proses dengan salinan fitur baca-saja |

Fitur PRD v6 yang memicu tiap masalah:

- M52: platform internal (P0) dan 53 developer dalam 11 tim (batasan PRD).
- M53: data antar domain (P1) dan syarat Pak Hadi di PRD v5.
- M54: perubahan aman di skala (P1) dan SLO per tim (P0).
- M55: tidak berhenti saat satu wilayah hilang (P0).
- M56: multi-mata uang dengan kurs (P0) dan syarat Pak Hadi di PRD v6.
- M57: skor risiko real-time (P0) dan label biaya per tim dari platform internal (P0).
- Halaman Keamanan 13 (bukan halaman masalah): data per negara (P0) dan skor risiko (P0).
- Halaman Tim dan infra (bukan halaman masalah): 53 developer dalam 11 tim dan SLO per tim.

Halaman Keamanan 13 membuka dengan satu kejadian, minggu 17. Senin 09.00 Ratih membuka back office dan melihat 38 akun di tiga negara menerima transfer kecil dari akun baru dalam 6 menit. Skor tiap negara hanya melihat 12, 14, dan 12 akun (Ilustrasi). Akun-akun itu berbagi 4 perangkat. Kirana mengusulkan satu graf akun-perangkat di wilayah pusat dengan semua data identitas. Laras menolak membawa data negara kedua dan ketiga keluar dari wilayahnya (Asumsi produk). Arga bertanya siapa memegang kunci cadangan bila wilayah negara itu hilang. Dugaan pertama Kirana: ketepatan skor selalu naik bersama jumlah data.

Halaman Tim dan infra membuka dengan satu kejadian, minggu 21. Tim Notifikasi (4 orang) menjaga bergantian tiap minggu sebagai primer dan sekunder. Dua orang cuti, dua orang yang tersisa menjaga tiga minggu beruntun, dan satu dari mereka meminta keluar dari rotasi (Ilustrasi). Raka mengusulkan satu orang tambahan per tim. Bayu mengusulkan SRE menjaga semuanya.

### ADR yang lahir di Tahap 6

Setiap ADR ditulis dengan tiga opsi atau lebih, pre-mortem, dan "kapan keputusan ini salah", sesuai skill analisis-kritis. Ambang di kolom "Kapan salah" memakai satuan dan pembanding yang sama dengan tabel angka beban di bagian 3. Tabel ini hanya acuan untuk penulis halaman, dan kalimat bertanda [perlu verifikasi] dibuka ke sumbernya saat halaman ditulis. Tak satu pun ADR di sini punya lab: bukti terbaiknya Tidak dijalankan atau Hitungan atas Asumsi.

| ADR | Keputusan | Opsi yang ditimbang selain pilihan | Kapan salah | Sumber |
| --- | --- | --- | --- | --- |
| 61 | Platform dijalankan sebagai produk. Golden path adalah satu jalur yang didukung: template service, pipeline, dashboard, alert, dan `service.yaml` yang diisi tim produk. Service catalog mencatat pemilik, giliran jaga, dan SLO tiap service. Platform punya roadmap dan pertemuan dengan tim yang memakainya tiap dua minggu. Ukuran: lead time dari permintaan service baru sampai pipeline hijau pertama paling lama satu hari (Asumsi), adopsi golden path (service baru 90 hari terakhir yang dibuat dari template; tidak punya definisi baku, Asumsi), dan lima metrik DORA per service. mTLS dan identitas service ada di template, tanpa service mesh. Jalur di luar golden path boleh dengan ADR singkat | Tiap tim membuat pipeline sendiri (ditolak: empat pipeline, perbaikan keamanan empat kali); tim platform sebagai queue tiket (ditolak: M52, 17 hari); portal developer dipasang lebih dulu (disebut: katalog adalah konsep, bukan produk; isu Backstage#34765, ditutup 2026-09-30, melaporkan satu entri yang gagal dicoba ulang tanpa batas dan memakai kapasitas queue katalog, R6-03, [perlu verifikasi: dibaca dari isu, bukan dokumentasi]); service mesh sebagai cara identitas seragam (ditunda: isu terbuka istio#58514 melaporkan lonjakan 503 saat rollout pod di mode ambient pada Istio 1.28.1, sedangkan versi yang dibaca di R6-01 adalah 1.31.3, R6-18 [perlu verifikasi]; menurut pengumuman Buoyant 2024-10-23 rilis stabil Linkerd datang lewat vendor, R6-18) | Adopsi golden path di bawah 50% selama dua kuartal (Asumsi), atau lead time template lebih dari satu hari: jalur lebih lambat dari menyalin. Permintaan perubahan template menunggu lebih dari satu minggu (syarat ADR 58). Tujuan kritis yang butuh identitas sama melewati kemampuan template: mesh dibuka lagi (ADR 69, butir 1). Pembanding: 4 pipeline dan 17 hari | R6-02, R6-03, R6-04, R6-18, R6-20 (Spotify, 2020-08-17), ADR 58, ADR 53 |
| 62 | Tiap domain memiliki service, schema, giliran jaga, dan SLO, tercatat di katalog. Data untuk tim lain hanya lewat API atau event berversi (produk data) dengan pemilik, skema, dan kesegaran tertulis (Asumsi). Hak SELECT lintas schema dicabut, dan lint di pipeline menolak query lintas schema. Laporan resmi Keuangan dibaca dari API tutup buku milik tim Ledger (berasal dari snapshot saldo, ADR 49), dan event hanya untuk dasbor dan tim lain. Dari empat prinsip data mesh (R6-06) dipakai kepemilikan domain dan data sebagai produk, self-serve lewat golden path, dan tata kelola berupa tinjauan Security dan Keuangan atas daftar produk data, bukan tata kelola komputasional federasi yang otomatis. Tanpa alat mesh | Pelaporan membaca lewat replica lintas schema (ditolak: M53, contract tak tertulis); data warehouse pusat dengan salinan semua tabel (disebut: memindahkan ketergantungan ke pembaca tabel, dan salinan tidak boleh memutuskan uang); rapat sinkronisasi migration (ditolak: tak terbaca di sistem); database terpisah per service (ADR 60 butir 3: pemicu L per schema belum terukur) | Produk data lebih banyak dari yang sanggup dirawat pemiliknya (Asumsi: lebih dari 3 per tim). Kesegaran event tertinggal lebih dari 5 detik dari ledger untuk dasbor merchant (pembanding PRD v5). Satu laporan butuh gabungan lebih dari empat domain tiap hari: pertimbangkan data warehouse. Struktur tim berubah sehingga pemilik produk data hilang (Conway) | R6-05, R6-06 (Dehghani, 2020-12-03), R4-03, ADR 50, ADR 51 |
| 63 | (1) SLO per service ditulis pemiliknya di katalog dari metrik penjaga. SLO pembayaran 99,9% per negara dimiliki tim Pembayaran, dan SLO service di jalurnya lebih ketat (SLO berantai, bagian 3). (2) Tiap rilis lewat canary golden path (1%, 5%, 25%, 100%) dengan analisis atas SLO dan rollback otomatis. (3) Flag punya pemilik dan tanggal kedaluwarsa, dan satu sakelar per database negara. (4) Deploy, flag, migration, dan konfigurasi ditulis ke satu garis waktu per negara. (5) Kebijakan error budget ditulis sebelum anggaran habis: bila anggaran terlampaui, hentikan perubahan kecuali P0 dan perbaikan keamanan, tanpa menghukum tim. Contoh kebijakan di SRE Workbook memakai jendela empat minggu (R6-13), sedangkan SLO di sini dihitung per 30 hari, jadi jendela kebijakan mengikuti jendela SLO (Asumsi desain). (6) Chaos testing: satu percobaan per tim per kuartal, di staging lebih dulu, lalu produksi dengan paparan paling banyak 1% lalu lintas (Asumsi), hipotesis steady state tertulis, dan tombol hentikan | Rapat persetujuan rilis harian (ditolak: M54); pembekuan rilis hari tertentu (ditolak: frekuensi turun, risiko tiap rilis sama); rilis bebas dengan peringatan (ditolak: anggaran habis di hari ke-19); flag saja tanpa canary (ditolak: membatasi paparan tetapi tidak mengukur); OpenFeature dan flagd (ADR 60 butir 12: spesifikasi belum 1.0) | SLO terlalu ketat untuk rilis hampir harian: tiap kegagalan sepanjang RTO 15 menit memakai 34,7% anggaran, tiga kegagalan melewatinya (5.27, Hitungan atas Asumsi). Canary 1% kekurangan sampel: 1% × 694,4 = 6,9 transaksi per detik di puncak dan lebih sedikit di jam sepi. Percobaan gangguan merusak produksi: satu laporan di pelacak Chaos Mesh (v2.7.x, ditutup 2026-04-16) menulis pemulihan gagal saat pod restart di tengah percobaan (R6-17, [perlu verifikasi: dibaca dari isu]). Kebijakan dipakai sebagai hukuman | R6-04, R6-13, R6-14, R6-17, R6-36, R5-17 |
| 64 | Ledger tiap negara: primary di wilayah negara itu, dan kuorum standby sinkron yang memuat paling sedikit satu standby di wilayah pasangan paling jauh 1.000 km, supaya RPO nol berlaku saat satu wilayah hilang (Asumsi desain, Tidak dijalankan; satu standby sinkron tetap di wilayah yang sama untuk RTO satu mesin). Jarak itu memberi RTT 10 ms dan tambahan commit paling sedikit 10 ms, di bawah anggaran 50 ms ADR 48 (anggaran tambahan p95 satu lompatan, bukan anggaran skor risiko). Pasangan 3.000 km hanya bila daftar izin negara mengizinkan (ADR 66), dengan batas akun panas 33,3 per detik dan alert pada 50% batas. Replica asinkron untuk laporan di wilayah mana pun (ADR 46). Failover wilayah diputuskan manusia (SRE) dengan fencing, dilatih tiap kuartal, RTO wilayah 30 menit (Asumsi produk). Aktif-aktif sengaja belum. Aturan 8 ADR 47 berlaku sesudah failover wilayah: semua bacaan tampil dibaca dari primary baru selama jendela token (Asumsi: belum diuji [perlu verifikasi]). Efek samping dari primary lama, mis. baris outbox untuk pembayaran yang tidak ada di primary baru, belum punya aturan sejak ADR 48 dan tetap terbuka (TINJAUAN-PEMILIK Tahap 5 butir 2) | Aktif-aktif (ditolak: akun panas dan konflik tulis; paling kompleks dan mahal, R6-07); asinkron saja untuk ledger (ditolak: RPO lebih dari nol, 416,7 per detik jeda di negara terbesar; dipakai untuk bacaan); backup dan restore (ditolak: M55, 47 menit); pilot light atau warm standby (disebut, R6-07); layanan terkelola multi-region (Tidak dijalankan; ADR 59 menjaga jalan keluar); failover otomatis penuh dari health check (ditolak: alarm palsu, dua primary tanpa fencing) | P95 commit pembayaran melewati 50 ms (pembanding: 10 ms pada 1.000 km). Merchant melewati 50% batas per akun: 34,7 ÷ 100 = 35% pada 1.000 km, 104% pada 3.000 km (Hitungan atas Asumsi). Latihan wilayah lebih dari 30 menit (pembanding M55: 47 menit, Ilustrasi). Negara tanpa pasangan dalam 1.000 km yang diizinkan. Standby sinkron mati: commit macet sampai manusia menurunkan jumlah standby, seperti ADR 48 | R6-07, R6-08, R6-09, R6-21 (Corbett dkk., OSDI 2012), R6-33 sampai R6-35, R5-24, R5-39, R5-250, ADR 48 |
| 65 | Tiap mata uang punya ledger sendiri, di database negara pemiliknya. Jumlah disimpan sebagai bilangan bulat dalam unit terkecil dengan eksponen per buku (rupiah: 0, Asumsi desain), dan konversi bentuk hanya di batas dengan pihak luar. Jurnal seimbang per mata uang. Tukar adalah dua jurnal terhubung, satu di tiap ledger, lewat akun likuiditas. Kurs disimpan sebagai pembilang dan penyebut bilangan bulat dengan versi. Pembulatan ke bawah ke unit terkecil, dan sisanya masuk akun selisih pembulatan. Spread adalah posting terpisah. Lintas database berarti saga dengan Idempotency-Key dan referensi unik di jurnal yang tidak kedaluwarsa (pola ADR 54) dan kompensasi lewat jurnal pembalik. Tidak ada saldo yang dinormalkan ke satu mata uang | Menormalkan semua ke satu mata uang di app (ditolak: saldo bergerak tiap kurs berubah, R6-10); satu ledger global dengan kolom mata uang dan aturan seimbang per mata uang (benar di satu database; ditolak: bertentangan dengan data per negara dan menambah RTT ke tiap commit); pustaka decimal (ditolak: pembagian punya presisi bawaan, 16 digit di versi yang dibaca, R6-39; isu shopspring/decimal#211 dan #338 hanya penanda jebakan; R6-10); ledger khusus (TigerBeetle: ADR 60 butir 9, tulis belum terukur; dokumentasinya dipakai sebagai pola dan tidak dipasang) | Jenis alur panjang melewati tiga (sekarang satu: cicilan dan tabungan, ditambah saga pendek tukar lintas negara): pertimbangkan durable execution (ADR 60 butir 9). Kompensasi tukar tidak bisa berupa jurnal pembalik bila penerima sudah memakai uangnya. Selisih pembulatan per hari melewati ambang yang ditetapkan Pak Hadi (belum ada, Asumsi: Rp1.000.000 per hari). Mata uang dengan eksponen berbeda salah dikonversi di batas pihak luar (rupiah 0 lawan 2) | R6-10, R6-39, R2-06, ADR 6, ADR 54, ADR 60 |
| 66 | (1) Data identitas dan saldo user negara X disimpan hanya di wilayah negara X dan pasangan yang ada di daftar izin negara X (Asumsi produk, tanpa klaim hukum), ditulis di katalog dan diperiksa pipeline IaC. (2) KEK per wilayah di KMS wilayah itu (pola ADR 57). Data key per file dibungkus KEK asal, pasangan menyimpan ciphertext arsip, dan KEK tidak keluar dalam bentuk terbuka. Standby sinkron ledger memegang data langsung, jadi pasangannya harus ada di daftar izin. (3) Sinyal fraud lintas negara berupa pseudonim: hash perangkat dengan kunci sinyal yang dirotasi (Asumsi desain), tanpa nama dan tanpa nomor identitas. Pertanyaan lintas wilayah dijawab dengan jumlah, bukan daftar akun. Pseudonim tetap diperlakukan sebagai data sensitif (penalaran). (4) Aturan per negara (batas harian, tingkat verifikasi, jenis transaksi) dibaca dari paket kebijakan berversi di luar kode, dievaluasi satu mesin kebijakan (OPA disebut, R6-11), dan diuji dan dirilis lewat canary (ADR 63). (5) Setiap akses staf ke data negara lain tercatat di `audit_log` negara pemilik | Semua data identitas ke wilayah pusat (ditolak: aturan 1); graf per negara tanpa lintas (ditolak: 12, 14, 12 akun tak terlihat sebagai 38); kueri federasi tanpa data keluar (disebut: tiap wilayah menjawab pertanyaan, butuh jaringan antar wilayah hidup); tokenisasi oleh pihak ketiga (Tidak dijalankan; data keluar); aturan per negara sebagai percabangan di kode (ditolak: tiap perubahan aturan jadi rilis, dan perilaku antar negara terpecah) | Daftar izin berubah: negara menuntut pasangan di dalam negerinya atau tak ada pasangan dalam 1.000 km. Kunci sinyal bocor: semua akun dapat ditautkan. Tim Risiko menuntut atribut di luar hash. KEK wilayah hilang tanpa cadangan: arsip tidak terbaca (ADR 57 menulis tempat KEK dan tempat file arsip di produksi sebagai belum diputuskan, dan RTO 15 menit hanya untuk pemulihan OpenBao). Mesin kebijakan menjadi titik gagal tunggal: batas dan verifikasi tak terbaca | R5-18 (NIST SP 800-57 Part 1 Rev. 5), R6-11, R6-12 (tanpa sumber primer terbuka: Ilustrasi), R4-40 ([perlu verifikasi]; tidak masuk cerita), ADR 43, ADR 57, ADR 64 |
| 67 | Biaya per transaksi menjadi kendala arsitektur (FinOps: kolaborasi engineering, Keuangan, dan bisnis, R6-16). Tiap ADR yang menambah service, wilayah, atau panggilan antar wilayah menulis biaya per transaksi (Asumsi) dan jumlah panggilan per transaksi. Platform memasang label biaya per tim lewat golden path. Skor risiko dalam satu proses milik tim Risiko, membaca fitur dari salinan baca-saja di wilayah yang sama, diisi event produk data (ADR 62) dari domain akun, perangkat, dan riwayat. Tak ada panggilan antar service per transaksi untuk skor (0 panggilan antar proses di lab satu proses; pembacaan salinan fitur dari database tidak dihitung di lab). Bila salinan fitur tak tersedia, skor memakai batas nominal rendah per negara (Asumsi desain), bukan setuju atau tolak semua. Fitur lintas wilayah hanya sinyal pseudonim (ADR 66) | Tiga service dengan data di pemiliknya (ditolak: M57, 6 panggilan dan 60 ms); satu service yang memanggil tiap domain saat skor (ditolak: tiga panggilan antar service per skor, jumlahnya tidak direkam karena bentuk ini Tidak dijalankan di lab, dan tiap panggilan tetap menambah jeda: penalaran); skor batch tiap 5 menit (ditolak: PRD v6 meminta real-time); layanan skor pihak ketiga (Tidak dijalankan; data keluar dari wilayah); semua dalam satu monolith (ditolak: Prime Video menggabungkan satu service, bukan seluruh layanan, dan menulis keputusan dibuat kasus per kasus, R5-171) | P95 skor melewati 50 ms walau satu proses (pembanding M57: 140 ms, Ilustrasi). Salinan fitur tertinggal lebih dari 5 detik (Asumsi). Tim Risiko menjadi pemilik data domain lain. Biaya salinan melebihi biaya panggilan. Batas kasus industri: satu service milik satu tim, tulisan karyawan tentang sistemnya sendiri, dibaca lewat arsip bertanggal 2023-05-04 | R5-171, R6-16, R6-12, ADR 50, ADR 59, `labs/t5-gabung/output/` |
| 68 | Giliran jaga per rumpun, bukan per tim: Uang (Pembayaran dan Ledger, 10 orang), Merchant dan Akun (10), Risiko dan Wilayah (10), Notifikasi dan Pelaporan (8), Platform dan SRE (11). Primer dan sekunder tiap minggu, paling banyak 25% waktu per orang (2 ÷ 10 = 20%; 2 ÷ 8 = 25%). Lima rumpun berjumlah 10 + 10 + 10 + 8 + 11 = 49 orang, dan Security 4 orang tidak masuk rumpun (pilihan draf 20). Service tetap dimiliki tim dengan SLO dan runbook sendiri, dan pemilik dipanggil sebagai eskalasi. Insiden keamanan masuk lewat giliran Platform dan SRE, dan Security dipanggil sebagai eskalasi (Asumsi). Katalog menolak service tanpa pemilik dan runbook | Tiap tim sendiri (ditolak: 2 ÷ 5 = 40%, 2 ÷ 4 = 50%); tim SRE menjaga semuanya (ditolak: 5 orang di bawah minimum 8 untuk satu lokasi menurut SRE Book); jaga bergilir seluruh 53 orang (ditolak: pengetahuan service tersebar tipis); jaga bergilir antar lokasi (SRE Book menulis 6 orang per tim sebagai minimum yang wajar untuk dua lokasi; Tidak dijalankan: lokasi orang tidak ditulis di naskah) | Insiden lebih dari 2 per shift 12 jam (SRE Book, R6-15). Waktu operasi murni lebih dari 50% (SRE Book). Rumpun melewati 13 orang sehingga pemilik jaga tidak lagi mengenal service. Jaga primer menerima pager untuk service tim lain tanpa runbook. Eskalasi keamanan di luar jam kerja menunggu satu dari empat orang Security, yang bila menjaga sendiri berarti 2 ÷ 4 = 50% (Hitungan atas Asumsi cerita). Pembanding sekarang 18% sampai 25% (2 ÷ 11 sampai 2 ÷ 8) | R6-15 (SRE Book bab 11, dibuka ulang 2026-11-06), R6-37, ADR 58 |
| 69 | Sengaja belum (Tahap 6): service mesh penuh; multi-region aktif-aktif; database terpisah per service; sharding berkunci kapasitas (pemecahan tambahan di dalam satu negara); BFF terpisah dan GraphQL; login sosial; gRPC; CDC dengan Debezium; TigerBeetle dan Temporal; SLSA, HTTP Message Signatures, dan atestasi app; event sourcing penuh; OpenFeature dan flagd. Tiap butir punya pemicu di halamannya (bagian 3). Kapasitas tulis satu primary, jaringan antar wilayah dan antar host, request berurutan per layar, dan umur event tertua di relay tetap belum diukur. ADR ini tidak menjanjikan tahap berikutnya | Pasang semuanya (ditolak: 53 orang, enam service, tiga negara); tunda tanpa pemicu (ditolak); tunda dengan pemicu dan alat ukur (dipilih, seperti ADR 45 dan 60) | Per butir seperti ADR 60, dengan angka Tahap 6: multi-region aktif-aktif bila satu akun panas melewati batas 1 ÷ RTT pada pasangan terdekat dan satu wilayah tidak cukup; database per service bila dua service saling memperlambat; sharding di dalam satu negara bila satu primary tidak menampung tulis (negara terbesar 416,7 per detik, belum terukur); BFF dan GraphQL bila satu layar butuh lebih dari 3 request berurutan; gRPC bila p95 antar host melewati 50 ms; event sourcing bila PRD atau auditor memintanya; OpenFeature bila spesifikasi 1.0 dan flag aktif lebih dari satu. Lima butir lain memakai pemicu ADR 60 tanpa angka baru: mesh penuh, login sosial, CDC, TigerBeetle dan Temporal, serta SLSA dan atestasi | R6-18, R6-19, R6-08, R6-35, ADR 60, ADR 45, ADR 21 |

### Yang tidak bisa dibuktikan tanpa lab (Tidak dijalankan)

Tahap 6 tidak punya lab, jadi tabel ini menggantikan "Yang harus bisa dibuktikan lab" di naskah Tahap 2 sampai 5. Tiap baris menulis pernyataan yang butuh bukti, kenapa repo ini tidak merekamnya, dan alat ukur yang bisa dipakai pembaca sendiri. Tak satu baris pun menjanjikan rekaman.

| Pernyataan | Kenapa tidak direkam di repo ini | Alat ukur untuk pembaca | Label |
| --- | --- | --- | --- |
| Satu primary menampung 416,7 transaksi uang per detik (negara terbesar) | Tidak ada server sungguhan di repo, dan `make beban` di `api-t5` memberi batas di laptop | `pgbench` dengan skrip transaksi sendiri di server sungguhan (PostgreSQL 17: program yang menjalankan urutan perintah SQL yang sama berulang lewat beberapa sesi dan menghitung rata-rata transaksi per detik, R5-251) | Tidak dijalankan |
| RTT antar wilayah 10 dan 30 ms; akun panas 33,3 per detik | Lab hanya satu mesin | Ukur RTT antar dua wilayah, lalu jalankan transaksi ke satu baris dari skrip uji di wilayah primary dengan standby sinkron di wilayah pasangan | Hitungan atas Asumsi; Tidak dijalankan |
| Lock baris ditahan selama commit menunggu standby | Dokumentasi menulis waktu tunggu minimum RTT, dan tidak membahas lock (R5-250) | Dua transaksi ke satu baris dengan standby sinkron jauh, lalu ukur jeda yang kedua | [perlu verifikasi] |
| Latihan failover wilayah selesai dalam 30 menit | Tidak ada dua wilayah | Latihan terjadwal oleh SRE dengan catatan waktu terhadap RTO | Tidak dijalankan |
| Skor risiko dalam 50 ms antar wilayah | Lab `t5-gabung` memakai jeda buatan di satu mesin | Jalankan alur skor dengan jaringan antar host dan antar wilayah, dan bandingkan p95 satu proses lawan tiga proses | Rekaman lab Tahap 5 (jeda buatan); sisanya Tidak dijalankan |
| Adopsi golden path dan lead time template | Tak ada organisasi sungguhan | Hitung dari riwayat pembuatan service dan pipeline di katalog | Asumsi |
| Giliran jaga 20% sampai 25% terjaga | Tak ada rotasi sungguhan | Catat jam di luar jam kerja per orang per bulan dan jumlah insiden per shift 12 jam | Tidak dijalankan |
| Pseudonim fraud tidak bisa dibalik | Tidak ada kajian kriptografi | Tinjauan kriptografer atas pembuatan hash dan rotasi kunci sinyal | [perlu verifikasi] |
| Satu layar app butuh paling banyak 3 request berurutan | Tidak ada app Flutter di lab, dan 5.30 menulis request berurutan per layar belum diukur | Trace app per layar di tim Akun, lalu hitung request berurutan tiap layar (alat ukur butir 5 ADR 60) | Tidak dijalankan |
| Relay outbox tidak tertinggal lebih dari 30 detik terus-menerus | Repo tidak punya relay dengan beban Tahap 6, dan 5.30 menulis umur event tertua belum punya angka | Ukur umur event tertua di relay tiap menit, lalu bandingkan dengan 30 detik (alat ukur butir 8 ADR 60) | Tidak dijalankan |
| Biaya per transaksi naik 1,85 kali | Angka cerita | Pakai label biaya per tim dari penyedia dan bagi dengan transaksi bulan itu | Ilustrasi |

## 5. Yang dibawa pembaca keluar dari Tahap 6

| Konsep | Kalimat yang diingat | Kejadian |
| --- | --- | --- |
| Platform sebagai produk | Platform punya tim yang memakainya, roadmap, dan ukuran, bukan queue tiket | M52 |
| Golden path dan service catalog | Satu jalur yang didukung dan satu daftar pemilik membuat 11 tim berjalan tanpa saling menunggu | M52 |
| Kepemilikan domain | Tim lain membaca lewat API atau event, bukan lewat tabel milik pemilik | M53 |
| Data sebagai produk | Data yang dipakai tim lain punya pemilik, skema berversi, dan kesegaran yang disebut | M53 |
| Perubahan aman di skala | Perubahan kecil, bertahap, diukur oleh SLO, dan bisa dibatalkan otomatis | M54 |
| Error budget | Kebijakan anggaran ditulis sebelum anggaran habis, dan bukan hukuman | M54 |
| Multi-region aktif-pasif | Jarak ke wilayah pasangan menentukan latensi tulis dan batas akun panas | M55 |
| RPO nol lintas wilayah | RPO nol dibayar dengan RTT di tiap commit | M55 |
| Ledger multi-mata uang | Jurnal seimbang per mata uang, dan tukar adalah dua jurnal terhubung | M56 |
| Residensi data dan kunci per wilayah | Data punya satu rumah, kunci enkripsi tinggal di wilayah yang sama, dan yang melintas hanya sinyal pseudonim | Keamanan 13 |
| FinOps | Biaya per transaksi adalah ukuran arsitektur, ditulis di tiap ADR | M57 |
| Kapan menggabungkan kembali | Komponen yang sering dipanggil per transaksi rugi bila dipisah, untuk satu service dan bukan seluruh layanan | M57 |
| Giliran jaga | Dua orang per minggu dari lima orang adalah 40%, jadi rotasi dibuat per rumpun | Tim dan infra |
| Estimasi | Masalah Tahap 6 adalah batas yang tidak punya pemilik dan jarak yang tidak dihitung, bukan jumlah request. Kapasitas satu primary tidak pernah diukur | 6.11 |

## 6. Jembatan keluar dari enam tahap

Tahap 6 tidak punya jembatan ke tahap berikutnya. Halaman terakhir (6.12) menutup enam tahap, dan tidak menampilkan PRD baru, tebakan baru, atau daftar tugas untuk tahap lain. Isinya tiga hal.

**Yang dibawa pembaca.** Satu kalimat per tahap, diambil dari halaman rekap tiap tahap (1.41, 2.32, 3.31, 4.30, 5.31) dan dari bagian 5 di atas. Kalimat itu tidak ditulis ulang di sini, dan penulis halaman menautkannya. Tiga pertanyaan bisa dibawa pembaca ke backend mana pun. Di mana uang bergerak? Siapa pemiliknya? Apa yang terjadi bila hal itu dilakukan dua kali? Ketiganya ringkasan penulis, bukan kutipan halaman: yang pertama dari ledger (2.6 sampai 2.9), yang kedua dari 6.4, dan yang ketiga dari idempotency (2.13 dan 2.14). Halaman 6.12 menautkan halaman asalnya.

**Yang sengaja tidak diceritakan.** Izin, lisensi, dan kepatuhan regulasi di negara mana pun. Kapasitas yang terukur di server sungguhan. Keamanan fisik dan perangkat keras. Produk di luar pembayaran, dan tahap sesudah enam. Semuanya ditulis sebagai batas dengan satu kalimat alasan, supaya pembaca tahu bahwa itu pilihan dan bukan kelupaan.

**Yang belum diukur.** Lima pengukuran tertulis di ADR 69. Isinya kapasitas tulis satu primary, jaringan antar wilayah, jaringan antar host, request berurutan per layar app, dan umur event tertua di relay. Halaman terakhir menulis alat ukur tiap pengukuran dari tabel "Yang tidak bisa dibuktikan tanpa lab", sebagai tugas untuk pembaca.

Pola jawaban tebakan 5.32 dibuka di 6.1. Halaman 6.12 tidak menaruh tebakan yang dijawab di tempat lain. Ia memakai satu widget banding (Tahap 1 lawan Tahap 6, pembaca memilih satu dimensi) dan kartu rekap.

## Peta halaman Tahap 6

Jenis halaman sama dengan Tahap 1 sampai 5. Registry `cerita.json` belum punya halaman Tahap 6 (dipindai 2026-11-06), jadi tidak ada halaman lama untuk dipakai ulang. Kolom Lab semua "–" karena tahap ini konseptual. Kolom Widget hanya memuat jenis yang sudah ada, dan kolom itu menulis apa yang diubah pembaca di blok Coba.

| # | Bagian | Halaman | Jenis | ★ | Lab | Widget |
| --- | --- | --- | --- | --- | --- | --- |
| 6.1 | 1 | PRD v6: Rekeningo untuk tiga negara, dan jawaban tebakan 5.32 | PRD | ★ | – | rantai (sebelum dan sesudah PRD) |
| 6.2 | 2, 3, 3b | Dari fitur ke pekerjaan teknis v6 dan inti: tiap data punya satu rumah | Fitur → teknis | ★ | – | kalkulator (pembaca mengganti skenario: Tahap 6, Aktif 10%, negara pertama saja) |
| 6.3 | 4 | M52: Template service menunggu 17 hari + ADR 61 (platform sebagai produk, golden path, service catalog) | Masalah + ADR | ★ | – | alur (tebak, lalu pembaca mengganti tim memakai golden path atau menyalin pipeline) |
| 6.4 | 4 | M53: Laporan tutup buku kosong sesudah migration + ADR 62 (kepemilikan domain, data sebagai produk) | Masalah + ADR | ★ | – | alur (tebak, lalu pembaca mengganti membaca lewat tabel atau lewat event) |
| 6.5 | 4 | M54: Sembilan perubahan dalam 30 menit + ADR 63 (SLO per tim, error budget, canary, chaos testing) | Masalah + ADR | ★ | – | tebak dulu lewat lipatan, lalu banding (pembaca memilih kejadian: rilis biasa, aturan skor, flag) |
| 6.6 | 4 | M55: Satu wilayah hilang 47 menit + ADR 64 (multi-region aktif-pasif) | Masalah + ADR | ★ | – | alur (tebak, lalu pembaca mengganti jarak pasangan 1.000 atau 3.000 km) |
| 6.7 | 4 | M56: Jurnal tukar yang jumlah postingnya bukan nol + ADR 65 (multi-mata uang) | Masalah + ADR | ★ | – | tebak dulu lewat lipatan, lalu banding (pembaca memilih kejadian: kurs berubah, pembulatan, tukar separuh jalan) |
| 6.8 | 4 | Keamanan 13: Data per negara, kunci per wilayah, fraud lintas negara + ADR 66 | Keamanan + ADR | ★ | – | tebak dulu lewat lipatan, lalu banding (pembaca memilih kejadian: staf membuka data, pemulihan, kunci dicabut) |
| 6.9 | 4 | M57: Biaya per transaksi naik 1,85 kali + ADR 67 (FinOps, skor risiko satu proses) | Masalah + ADR | ★ | – | tebak dulu lewat lipatan, lalu banding (pembaca memilih fitur: panggilan, latensi, biaya) |
| 6.10 | 4 | Tim dan infra Tahap 6: giliran jaga lintas tim, pemilik service, DORA + ADR 68 | Tim dan infra | ★ | – | tebak dulu lewat lipatan, lalu banding (pembaca memilih pengaturan jaga: per tim, per rumpun, SRE) |
| 6.11 | 4 | Estimasi Tahap 6 dan ADR 69: Sengaja belum dilakukan | Konsep + ADR | ★ | – | tebak dulu lewat lipatan, lalu banding (pembaca memilih kapasitas K: beban Tahap 5 lawan Tahap 6) |
| 6.12 | 5, 6 | Penutup: yang dibawa keluar dari enam tahap | Konsep | ★ | – | kartu (rekap) dan banding (Tahap 1 lawan Tahap 6, pembaca memilih dimensi) |

Catatan untuk `T6-siap`:

- 6.1 punya prasyarat `t5-jembatan` dan blok "Yang dibuka lagi dari Tahap 5" dengan rumusan di bagian 1. PR yang menambah 6.1 `ada` menambah 6 ke `URUT_BACA` di `situs/tools/registri.mjs` dan mengubah Berikutnya dari 5.32 ke 6.1 (keputusan 1895).
- Halaman istilah baru: multi-region, golden path, service catalog, chaos testing, data mesh, FinOps, residensi data, dan kebijakan sebagai kode. Akun panas sudah ada di halaman istilah optimistic lock, jadi periksa satu arti. Kata "wilayah" dan "negara" dalam arti naskah ini didaftarkan di `situs/data/arti-istilah.json` bila perlu.
- Halaman Cerita Tahap 6 (`cerita/tahap-6.mdx`, padanan `cerita/tahap-5.mdx`) belum ada, dan halaman Cerita tahap lain ditulis dari bagian Latar dan PRD naskahnya.
- Kalkulator 6.2 membaca `tahap[].asumsi`, bukan `proyeksi`. Skenario Tahap 6 ditulis seperti di 5.29, yaitu `tahap: 5` dengan `ubah: {user: 10000000}`. "Negara pertama saja" adalah `ubah: {user: 6000000}`. `proyeksi[0].asumsi` hanya perlu bila T6-siap melonggarkan skema `.strict()` di `situs/src/lib/registri.ts`. Tes `m51-prd-v6.halaman.test.ts` mengunci `proyeksi[0].user` dan baris PROPOSAL Tahap 6. Halaman 6.2 memuat ERD Tahap 5 sebagai keadaan awal tanpa ERD6.
- `situs/data/templat.json` mengunci urutan blok `masalah` (lima blok) dan `adr` (enam blok), jadi satu halaman tidak bisa memakai keduanya. `T6-siap` menulis "Masalah + ADR" dan "Keamanan + ADR" sebagai jenis `konsep`: lima blok, dengan ADR di blok Putuskan, seperti Keamanan 1 sampai 12. "Konsep + ADR" (6.11) ditulis sebagai `adr`, dan "Tim dan infra" sebagai `tim-infra`. Alternatifnya jenis baru di `templat.json` beserta `templat.test.ts`.
- 6.6 dan 6.7 menyebut daftar izin negara dan database per negara, yang ADR 66 (6.8) tulis. Prasyarat registry tetap halaman sebelumnya, dan rujukan ke depan ditulis "dibahas di 6.8" dengan tautan, bukan sebagai prasyarat.

Halaman 6.2 memakai kalkulator dengan rumus request per detik dari 5.29, dan bukan kalkulator koneksi. Widget banding dan alur memakai data JSON baru yang ditulis penulis halaman, tanpa komponen baru. Bila data tidak cukup mengungkapkan satu kontrol di atas, penulis halaman mencatatnya di badan PR dan tidak menulis widget baru.

Widget banding (`situs/lama/widgets/banding.js`) membuka fitur pertama saat dimuat dan tidak punya tebak bawaan. Alur punya `predict` dan satu kotak centang `varian`. Kalkulator punya `tebak` dan pilihan skenario, dan kartu punya tebak lalu buka.

Karena itu halaman dengan banding memasang tebak lewat lipatan "Tebak dulu" (pola 5.4 dan 5.10) atau widget Tebak sebelum banding. Jawabannya tidak tertulis di prosa sebelum pembaca memilih. Banding membandingkan dua opsi, mis. sebelum dan sesudah ADR. Untuk 6.11, tiap pilihan kapasitas K adalah satu fitur, dan persentasenya ada di catatan tiap opsi.

Jalur per peran:

- **Mobile** menonjolkan 6.1, 6.2 (mata uang tampil dan unit terkecil), 6.7 (jumlah bilangan bulat per mata uang di Dart), 6.8 (sinyal perangkat dari app, endpoint wilayah negara user), 6.5 (rilis app bertahap), dan 6.12.
- **Backend** hampir semua, terutama 6.4, 6.6, 6.7, 6.9.
- **DevOps** 6.3, 6.5, 6.6, 6.9, 6.10, 6.11.
- **Security** 6.4, 6.6, 6.8, 6.9, 6.11.
