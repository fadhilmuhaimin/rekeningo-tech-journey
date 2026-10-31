Draft otomatis, belum ditinjau pemilik

# Cerita Rekeningo · Tahap 5: Skala nasional

Ditulis 2026-10-31 · draf sebelum lab Tahap 5 ada dan sebelum pemilik meninjau Tahap 4 (tugas NASKAH-5, keputusan 1400 sampai 1404). Peninjau konsistensi memakai keputusan 1405 sampai 1409.

## Kenapa dokumen ini ada

Naskah ini adalah source of truth Tahap 5, disimpan di repo sebagai `plan/CERITA-TAHAP-5.md`. Strukturnya sama dengan Tahap 2, 3, dan 4: **PRD → fitur → pekerjaan teknis → inti teknis → masalah yang muncul pelan-pelan → konsep**. Halaman situs ditulis dari naskah ini. Penomoran melanjutkan Tahap 4: masalah M40 dan seterusnya (Tahap 4 berakhir di M39), ADR 46 dan seterusnya (Tahap 4 berakhir di ADR 45).

Seperti Tahap 3 dan 4, naskah ini draf otomatis, bukan tulisan pemilik. Bahannya naskah Tahap 1 sampai 4, PROPOSAL ("System design final", "Enam tahap dalam satu tabel", "Scaling: urutan yang diajarkan"), `plan/RISET-TAHAP-5.md` (ID `R5-nn` menunjuk ke sana; R5-100 sampai R5-103 ditambahkan untuk naskah ini), halaman Tahap 4 yang sudah di main, `plan/EVALUASI-TAHAP-4.md`, `plan/TINJAUAN-PEMILIK.md` bagian Tahap 4, `plan/SETELAH-TAHAP-4.md`, dan `plan/USULAN-PERBAIKAN.md` (DIRI-4). Tugas `T5-siap` memasukkan peta halaman ke registry. Peninjau konsistensi mencocokkan naskah dengan semua naskah sebelumnya. Pemilik meninjau di akhir.

Semua pihak ketiga di Tahap 5 adalah tiruan lokal di container lab: gateway pembayaran, layanan verifikasi, penerbit kartu, layanan push, dan POS milik mitra. Merek nyata tidak dipakai. Standar dan dokumentasi publik disebut sebagai sumber, tanpa klaim izin atau kepatuhan regulasi apa pun.

Lab Tahap 5 belum ada dan belum bisa dijalankan: Docker Desktop menunggu dialog izin administrator di layar pemilik sejak 2026-10-31 06.57 WITA (TINJAUAN-PEMILIK Tahap 4, butir 1). Rekaman lab Tahap 5 menunggu Docker. Setiap pernyataan lab di bagian 4 ditulis sebagai hal yang bisa gagal, dan tak satu pun angka kejadian di naskah ini berasal dari rekaman Tahap 5.

Pelajaran EVAL-4 dan DIRI-4 mengubah cara naskah ini ditulis. Delapan aturan berikut dipakai supaya kelas kesalahan Tahap 3 dan 4 tidak terulang.

1. **Satu angka, satu bentuk.** Angka beban dihitung sekali (tabel bagian 3), dengan nilai tepat dan satu pembulatan setengah ke atas. Turunan dihitung dari angka yang tertulis. Besaran yang punya dua versi ditulis berdampingan dengan labelnya.
2. **Kalimat rekaman menunggu rekaman.** Naskah hanya memakai label Asumsi, Hitungan, Ilustrasi, Tidak dijalankan, [perlu verifikasi], atau rekaman Tahap 1 sampai 4 yang sudah ada di `labs/*/output/`. Hitungan adalah hasil rumus yang tertulis di naskah, dan labelnya ikut masukan yang paling lemah.
3. **Klaim universal dan negatif menyebut lingkupnya.** "Tidak ada X" hanya untuk lab, tahap, atau folder yang disebut. Kata "setiap", "semua", dan "hanya" dicek terhadap kasus tandingan sebelum ditulis.
4. **"Kapan salah" tidak bertentangan dengan pembandingnya sendiri.** Setiap ambang di tabel ADR bagian 4 punya satuan dan angka pembanding Tahap 5 yang sama dengan tabel beban.
5. **Label tidak lebih kuat daripada sumbernya.** Kata pelunak di sumber (might, some, "not guaranteed", satu lawan banyak) ikut ke kalimat naskah. Kasus industri ditulis dengan batas yang ditulis sumbernya sendiri.
6. **ADR lama dibaca ulang terhadap PRD baru.** Pemindaian kata "Tahap 5" di `situs/src/content/docs/tahap-1/` sampai `tahap-4/` (2026-10-31) menemukannya di halaman ADR 6 (revisi Tahap 2), ADR 12, 26, 38, 44, dan 45. ADR 33, 36, dan 37 tidak menyebut Tahap 5, tetapi syarat salahnya cocok dengan isi PRD v5. Semuanya diperiksa terhadap PRD v5 di bagian 1.
7. **Satu kata per konsep.** Naskah memakai "replica", "secret", "pembeli", "pengumuman" (satu pesan ke banyak HP), "angsuran", dan "service" untuk unit milik Rekeningo. "Layanan" hanya untuk pihak ketiga tiruan.
8. **Rujukan bisa diikuti.** "Di atas" hanya menunjuk bagian yang memang lebih dulu di naskah. Bagian rekaman disebut dengan nama berkas dan huruf bagiannya hanya bila berkas itu sudah ada.

### Pilihan draf yang perlu dilihat pemilik

Sembilan pilihan berikut diambil tanpa bertanya, dengan opsi paling aman dan paling mudah dibatalkan. Masing-masing dicatat sebagai usulan perubahan cerita atau butir "Perlu dicek pemilik" di badan PR.

1. **Transaksi per user aktif per hari: 3, dengan hasil untuk 2 di sebelahnya.** Registry `tahap[4].asumsi.trx` bernilai 2, sedangkan naskah Tahap 2, 3, dan 4 serta `tahap[3]` memakai 3. Halaman 4.28 menulis angka Tahap 5 dengan 3 dan menyebut hasil dengan 2. Naskah ini sama: 3 sebagai dasar, dan hasil dengan 2 di sebelahnya. `T5-siap` diminta menyamakan registry `tahap[4].asumsi.trx` (usulan di badan PR).
2. **Tim: 28 orang, termasuk platform, SRE, dan security.** PROPOSAL menulis "20–40 (5–7 tim + platform, SRE, security)", dan halaman 4.31 menulis "20 sampai 40 orang dalam 5 sampai 7 tim, ditambah platform, SRE, dan security". Dua bacaan itu berbeda. Naskah ini memakai satu bacaan: 28 orang dalam delapan tim, yaitu lima tim produk dan tiga tim fungsi, semuanya dihitung dalam 20 sampai 40 (Asumsi cerita). Registry `tim` bernilai "20+ developer" dan tidak berubah.
3. **Enam service, satu cluster PostgreSQL.** PROPOSAL menulis "pecah service dengan DB sendiri". Naskah ini memberi tiap service schema dan role sendiri di satu cluster (primary dan replica), seperti ADR 37, karena lab hanya bisa merekam satu primary. Database terpisah per service ditunda ke ADR 60 dengan pemicu tertulis. Pemilik memutuskan mana yang berlaku.
4. **BFF tetap sengaja belum.** PROPOSAL menulis BFF di bentuk Tahap 4, dan naskah Tahap 4 menundanya ke ADR 45 (TINJAUAN-PEMILIK Tahap 4, butir 3). Naskah ini mengikuti naskah Tahap 4: pemicunya, satu layar app butuh lebih dari 3 request berurutan, belum terukur. Request paralel bukan pemicunya.
5. **Satu kill switch untuk monolith dan service pembayaran.** TINJAUAN-PEMILIK butir 4b membiarkan terbuka apakah kill switch kartu satu atau dua, dan di luar proses atau tidak. Naskah ini memilih satu sakelar di tabel `sakelar` yang dibaca semua pod, dengan jawaban aman bila tabelnya tidak terbaca (ADR 55).
6. **Penagihan atas otorisasi kartu yang ditolak tetap keputusan produk.** Butir 4a TINJAUAN-PEMILIK membiarkannya terbuka. Naskah ini tidak memutuskannya, dan menulis asumsi aman bila halaman perlu satu bentuk: tidak didebit, dicatat sebagai insiden bernomor.
7. **RPO dan RTO ditulis di PRD v5.** PRD v3 dan v4 tidak menulis batas waktu pulih atau jendela kehilangan data, sehingga pemicu ADR 33 tetap terbuka (butir 4d). PRD v5 menulisnya sebagai Asumsi produk: tidak ada transaksi uang yang sudah dijawab sukses lalu hilang, dan pulih dalam 15 menit.
8. **api-t5 memakai Go 1.27.3, lab Tahap 4 tidak dinaikkan.** `api-t4` gagal gerbang ADR 44 pada Go 1.27.1 (TINJAUAN-PEMILIK butir 2). Lab Tahap 5 memakai Go 1.27.3 dari RISET (R5-01, Asumsi sampai lab mengecek ulang). Merekam ulang semua lab Tahap 4 adalah tugas terpisah yang bukan lingkup naskah ini.
9. **Heuristik ±50 developer tidak dipakai sebagai pemicu.** Angka itu tidak punya sumber primer [perlu verifikasi] (butir 9). Pemicu rilis di naskah ini adalah kejadian dan angka di halaman ADR: lima tim yang menunggu satu rilis (ADR 45, butir 2) dan pipeline lebih dari 10 menit per PR (ADR 44).

## Latar: dari publik ke seluruh negeri

Uji coba publik lolos pada minggu ke-12 Tahap 4. Rekonsiliasi harian selisih Rp0 atau insiden tertutup dalam satu hari kerja selama 14 hari berturut-turut (target Tahap 4, Asumsi), dan puncak beban 138,9 request per detik. PT Rekeningo (fiktif) kini menargetkan satu negara: 1.000.000 user terdaftar (20% aktif tiap hari, registry) dan merchant di seluruh kota, dengan kata "ratusan ribu" dari Sinta ditulis 200.000 (Asumsi; R5-36).

Frasa "uang elektronik nasional" di PRD v5 tidak membawa klaim izin atau regulasi apa pun. Naskah ini juga tidak.

Tiga hal berubah sekaligus. Pertama, **salinan datang**: laporan, riwayat, pengumuman, dan cadangan membaca data yang sama dari banyak tempat, sehingga Rekeningo untuk pertama kali punya data yang sengaja tertinggal. Kedua, **pihak luar memanggil masuk**: POS milik mitra membuat QR dan membaca status pembayaran lewat API publik. Ketiga, **tim dan rilis berlipat**: 28 orang dalam delapan tim merilis hampir tiap hari ke enam service.

Tahap 5 berangkat dari `api-t4` di akhir Tahap 4, bukan dari sistem yang sudah dibereskan. Yang tercatat dari naskah Tahap 4, halaman Tahap 4 yang sudah di main, dan README lab `api-t4`:

- Satu monolith Go dengan lima modul dan satu service `pembayaran`. Satu PostgreSQL 17.11 di lab, dibagi dalam schema dan role per modul. Proses monolith memakai satu role `t4m_monolit` dan satu pool.
- Ledger dari Tahap 2 tetap satu-satunya tempat uang bergerak. Service `pembayaran` meminta jurnal lewat API ledger dengan Idempotency-Key (ADR 37). Notifikasi lewat outbox dalam transaction yang sama dengan jurnal (ADR 23), klaim per baris (ADR 24), maksimal 5 percobaan lalu dead-letter (ADR 25), dan kelas queue memisahkan uang dari promo (ADR 32).
- Satu worker dengan 4 pengirim serentak dan 0,3 detik per pengiriman, sehingga kapasitasnya 13,33 per detik (Asumsi Tahap 3). Breaker per vendor hidup di memori proses worker (ADR 36). Kill switch kartu adalah flag di memori satu proses (ADR 42).
- Kapasitas satu server belum pernah diukur. `make beban` di `api-t4` memutar beban berjadwal di laptop dan menulis sendiri bahwa itu bukan kapasitas produksi (halaman 4.27, 4.28).
- ADR 45 menunda delapan komponen dengan pemicu tertulis. Empat pemicu berangka belum terlewati di Tahap 4, dan yang terdekat adalah koneksi database: 40 dari 70, atau 57%. Halaman 4.26 menunda sebelas butir lain, termasuk tempat flag kill switch di luar proses, rilis kartu bertahap, atestasi app, dan pemindai state IaC.
- Tahap 4 berakhir dengan tiga keadaan yang belum selesai: `api-t4` gagal gerbang ADR 44 pada Go 1.27.1, RPO dan RTO belum ada di PRD, dan satu server belum diukur.

Tim tumbuh dari 13 menjadi 28 orang selama 16 minggu (Asumsi cerita), dan tiap minggu memasukkan satu sampai tiga engineer baru. Delapan tim:

| Tim | Orang | Pemimpin | Memegang |
| --- | --- | --- | --- |
| Pembayaran | 4 | Nadia | gateway, top-up bank, kartu virtual |
| Ledger dan Tabungan | 4 | Hendra | ledger, cicilan, tabungan, batch harian |
| Merchant | 4 | Wulan | merchant, QR, laporan, API untuk POS |
| Pengguna | 4 | Raka | app, akun, identitas |
| Notifikasi | 4 | Sari (tidak muncul di adegan) | pengiriman push, pengumuman |
| Platform | 4 | Bayu | cluster, pooler, pipeline, observability |
| SRE | 2 | Dewi | SLO, giliran jaga, latihan failover |
| Security | 2 | Laras | threat model, tinjauan, uji penetrasi lokal |

Totalnya 4 × 6 + 2 × 2 = 28 orang. Yang tidak berubah: satu bahasa (Go di backend, Dart di app), PostgreSQL sebagai source of truth, dan ledger dari Tahap 2. Yang baru: enam service, satu read replica, event streaming, dan Kubernetes.

### Tokoh baru

| Tokoh | Siapa | Ingin | Kelemahan | Yang dibawanya ke cerita |
| --- | --- | --- | --- | --- |
| **Dewi** | Site reliability engineer (SRE) yang bergabung di minggu 3. Delapan tahun giliran jaga di sistem pembayaran lain, belum pernah menulis fitur. | Sistem yang berhenti dengan aman dan pulih dalam waktu yang sudah diumumkan | Menolak rilis tanpa metrik penjaga, sehingga perbaikan kecil ikut menunggu | SLO, alert, latihan failover, error budget |
| **Hendra** | Engineer data dari tim akuntansi Lestari, memimpin tim Ledger dan Tabungan. Menguasai tutup buku dan batch malam. | Angka yang bisa dicocokkan sampai rupiah terakhir | Menganggap batch malam selalu bisa diulang dari awal | Cicilan, tabungan, snapshot saldo, arsip |
| **Tomi** | Engineer di penyedia POS (fiktif), mitra pertama API publik. | Kasir yang tidak pernah menunggu Rekeningo | Mengulang permintaan tanpa batas bila tidak ada jawaban | Sudut pandang pihak luar yang memanggil Rekeningo |

Tokoh lama tetap:

- **Raka** memimpin tim Pengguna dan masih menulis backend bila perlu.
- **Nadia** memimpin tim Pembayaran dan masih cenderung mengusulkan solusi yang terlalu berat, kali ini event streaming untuk semua hal.
- **Bayu** memimpin tim Platform dan masih menganggap bawaan komponen aman, kali ini bawaan Kubernetes dan pooler.
- **Wulan** memimpin tim Merchant dan masih menganggap data dari sistem sendiri aman ditampilkan.
- **Laras** memimpin tim Security dan masih menandai hampir semua temuan sebagai kritis.
- **Ratih** memimpin tim risk (bukan tim engineer) dan memakai back office setiap hari.
- **Sinta** menulis PRD v5.
- **Budi** dan **Citra** memakai Rekeningo di kota masing-masing, dengan cicilan dan tabungan.
- **Bu Marni** kini memakai laporan penjualan di HP dan menerima pembayaran lewat POS mitra.
- **Ani** satu dari ±60 warung Lestari, tetap seperti Tahap 4.
- **Pak Hadi** menambah satu syarat: angka yang ia tanda tangani dibaca dari catatan yang sama dengan yang menggerakkan uang.
- **Pihak yang mencoba** tetap tidak dikenal, dan kali ini mencoba pintu yang paling jarang dijaga: API untuk mitra, arsip, dan jaringan di dalam cluster.
- **Dimas** tidak muncul di Tahap 5.

## 1. PRD v5 · Rekeningo untuk satu negara

**Latar masalah.** Tahap 4 membuktikan top-up dari bank, verifikasi identitas, QR merchant luar, kartu virtual, dan back office untuk 100.000 user. Tiga kebutuhan belum terpenuhi: merchant ingin melihat penjualan hari ini sampai detik ini, Rekeningo harus tetap hidup saat satu mesin mati, dan penyedia POS ingin memakai Rekeningo dari kasir mereka. Ketiganya berlaku untuk jumlah user sepuluh kali lipat.

**Tujuan.** (1) Satu juta user terdaftar dan ratusan ribu merchant memakai Rekeningo tanpa perubahan di app. (2) Merchant melihat penjualannya hampir seketika. (3) Pembayaran tidak berhenti saat deploy atau saat satu mesin mati, dan tidak ada uang yang hilang. (4) Penyedia POS pihak ketiga membuat QR dan membaca status lewat API publik. (5) Cicilan dan tabungan berjalan lewat batch harian yang tidak menagih dua kali.

**User.**

| User | Kebutuhan baru | Yang membuatnya berhenti memakai |
| --- | --- | --- |
| User umum (Budi dan Citra di kota masing-masing) | Cicilan ke merchant, tabungan berjangka, pengumuman yang sampai | Pembayaran yang tidak muncul di riwayat, angsuran yang ditagih dua kali |
| Merchant (Bu Marni dan ±200.000 lainnya, Asumsi) | Laporan penjualan hampir seketika, per cabang | Laporan yang terlambat, pembayaran yang melambat saat ia membuka laporan |
| Mitra POS (Tomi dan ±50 penyedia, Asumsi) | API untuk membuat QR dan membaca status, webhook ke kasir | Kuota yang tidak jelas, kunci yang bocor, perubahan API tanpa kabar |
| Warung Lestari (Ani dan ±59 lainnya) | Tetap seperti Tahap 4 | Pembayaran atau notifikasi yang terganggu urusan nasional |
| Tim risk (Ratih) | Back office tetap cepat saat user berlipat | Data yang tertinggal tanpa tanda |
| Keuangan (Pak Hadi) | Laporan resmi dan tutup buku harian dari catatan yang sama dengan ledger | Angka dari salinan yang tertinggal |
| SRE dan security (Dewi dan Laras) | Batas waktu pulih yang tertulis, bukti rilis aman | Rilis tanpa metrik penjaga, kunci tanpa rotasi |

**Ruang lingkup (nasional, 1.000.000 user terdaftar, 200.000 aktif per hari, 28 orang, 16 minggu).**

| Prioritas | Fitur | Keterangan |
| --- | --- | --- |
| P0 | Skala nasional | 1.000.000 user dan ±200.000 merchant (Asumsi). Deploy tanpa error yang terlihat user |
| P0 | Laporan merchant real-time | Penjualan hari ini per merchant dan per cabang tampil paling lambat 5 detik sesudah pembayaran tercatat (Asumsi produk). Laporan periode dan ekspor memakai catatan yang sama dengan ledger |
| P0 | Tidak berhenti, tidak kehilangan uang | Ketersediaan pembayaran 99,9% per 30 hari: error budget 0,001 × 43.200 menit = 43,2 menit. Tidak ada transaksi uang yang sudah dijawab sukses lalu hilang (RPO nol), dan pulih dalam 15 menit (RTO). Angka ini Asumsi produk dan menjawab pemicu ADR 33 yang tertunda sejak Tahap 3 |
| P0 | Notifikasi massal | Pengumuman ke semua HP terkirim dalam 30 menit (Asumsi produk). Notifikasi uang tetap janji PRD v3: 95% di bawah 30 detik, dan pemberitahuan tidak mendahului uang |
| P0 | Cicilan dan tabungan berjangka | Cicilan adalah pembayaran bertahap ke merchant tanpa bunga, dan PT tidak meminjamkan uang (Asumsi produk). Tabungan memindahkan jumlah tetap ke kantong tabungan tiap minggu. Batch harian menagih yang jatuh tempo, dan tiap angsuran terdebit tepat sekali |
| P0 | API publik untuk POS pihak ketiga | Mitra membuat QR dinamis, membaca status pembayaran, dan menerima webhook. Kunci per mitra, kuota per mitra, dan Idempotency-Key wajib untuk perintah yang menggerakkan uang |
| P1 | Kartu virtual untuk semua user terverifikasi | Rilis bertahap dari PRD v4, dengan satu kill switch |
| P1 | Laporan Keuangan dari catatan yang sama dengan ledger | Syarat Pak Hadi di bawah |
| P2 | Ditunda ke v6 | Multi-region, skor risiko real-time, platform internal untuk lebih dari 50 developer, 10 juta user |

**Bukan lingkup v5.** Pembayaran offline, pencairan merchant otomatis lewat bank (tetap file), tarik tunai, kartu fisik, multi-mata uang, bunga atau pinjaman dari PT, dan klaim izin atau kepatuhan regulasi apa pun.

**Metrik keberhasilan (target, Asumsi).**

- 200.000 user aktif per hari (20% dari 1.000.000, registry).
- 99,9% pembayaran tersedia dalam 30 hari (43,2 menit error budget), RPO nol untuk transaksi uang yang sudah dijawab sukses, RTO 15 menit.
- Laporan merchant tertinggal paling lama 5 detik dari pembayaran yang tercatat.
- Pengumuman ke 1.000.000 HP terkirim dalam 30 menit, dan 95% notifikasi uang di bawah 30 detik.
- 0 angsuran terdebit dua kali, dan 0 angsuran jatuh tempo tanpa jejak.
- 0 permintaan dari satu mitra yang membuat mitra lain mendapat 429.

**Batasan.** 28 engineer dalam delapan tim selama 16 minggu. Semua pihak ketiga berupa tiruan lokal di lab. Security review Laras lolos sebelum tiap rilis ke seluruh negeri. Kapasitas satu server belum pernah diukur, dan pengukurannya dijadwalkan sebelum fitur pertama yang menambah beban (ADR 45, aturan 5).

Syarat Pak Hadi bertambah: *"Angka yang saya tanda tangani harus dibaca dari catatan yang sama dengan yang menggerakkan uang. Salinan boleh untuk dilihat, bukan untuk memutuskan."*

**Risiko yang ditulis Sinta.** Rekeningo pertama kali punya data yang sengaja tertinggal, enam unit yang dirilis sendiri-sendiri, dan pihak luar yang memanggil masuk dengan laju yang tidak ia kendalikan.

**Pertanyaan terbuka di PRD.**

- Kalau laporan dan pembayaran membaca database yang sama, siapa yang melambat?
- Kalau database utama mati, apa yang hilang, dan siapa yang tahu?
- Kalau pengumuman, makan siang, dan rilis datang bersamaan, notifikasi uang yang mana yang terlambat?

Ketiganya tidak dijawab PRD dan menjadi masalah terbesar Tahap 5.

Halaman 5.1 membuka jawaban tebakan di halaman 4.31 (dari ADR Tahap 4, mana yang pecah lebih dulu?). Pilihan yang cocok adalah ADR 36, ADR 37, ADR 44, dan ADR 45. Buktinya sudah tertulis di halaman Tahap 4, dan tebakan itu penalaran (Asumsi), bukan urutan kejadian yang direkam. Empat kalimat berikut ditulis halaman ADR-nya sendiri sebelum PRD v5 ada:

| ADR | Kalimat di halaman Tahap 4 | Isi PRD v5 yang memenuhinya | Dilanjutkan di |
| --- | --- | --- | --- |
| 45 | Satu pemicu read replica adalah laporan merchant real-time yang diminta PRD v5 (4.29) | Laporan merchant real-time | M40, ADR 46 |
| 36 | Breaker hidup di memori satu proses worker, dan dua worker tidak berbagi hitungan, jadi tiap proses menunggu enam kegagalannya sendiri (4.11, dibaca dari kode, tidak direkam) | Notifikasi massal, yang butuh banyak worker | M45, ADR 51 |
| 37 | Keputusan salah bila satu modul punya profil beban atau tim yang membuat deploy bersama tidak lagi masuk akal (4.13) | 28 orang dalam delapan tim | M44, ADR 50 |
| 44 | Pipeline dan giliran jaga dibagi per tim, dan batas modul perlu menjadi batas deploy (4.26) | 28 orang dalam delapan tim | M44, ADR 58 |

Dua pilihan lain di tebakan tidak cocok. ADR 41 menulis syarat salah per satu impor (50 produk menjadi 21 detik), dan ADR 40 memakai pembanding persen yang mengecil bila merchant bertambah. Tak satu pun menyebut isi PRD v5.

Tahap 5 mengubah dugaan itu menjadi hitungan, dan hitungannya di bagian 3: worker terpakai 564% (Tahap 4: 56%), pengumuman ke 1.000.000 HP butuh 20,8 jam di satu worker, dan koneksi tertahan 27,8 lawan batas 18. Semuanya Hitungan atas Asumsi (halaman 4.28). Urutan "lebih dulu" di tebakan tetap penalaran. Urutan masalah di bagian 4 adalah urutan cerita, bukan hasil pengukuran.

Sembilan ADR sebelumnya menulis Tahap 5 sebagai revisi atau memuat syarat salah yang cocok dengan PRD ini, jadi syaratnya dibaca ulang:

- ADR 6 (revisi di Tahap 2) menjadwalkan partisi `posting` per bulan dan snapshot saldo di Tahap 5, dan ADR 12 menjadwalkan Kubernetes (mulai dari k3s di lab) dan read replica untuk laporan di Tahap 5. ADR 49, 50, dan 46 mengerjakannya.
- ADR 26 menulis bahwa PROPOSAL menaruh Kubernetes di Tahap 5, dan ADR 33 menunda VPS kedua sampai waktu pulih atau jendela kehilangan data melebihi yang diterima Pak Hadi atau PRD. PRD v5 menulis keduanya (RPO nol, RTO 15 menit), jadi pemicu ADR 33 terpenuhi dan dijawab ADR 48.
- ADR 14 membatasi umur Idempotency-Key 24 jam, dan ADR 34 mencatat bahwa jurnal bisa ganda bila proses mati di antara ledger dan transaction pembayaran, lalu kiriman ulang datang sesudah key habis. Cicilan berjalan berbulan-bulan, dan batch yang ditunda lebih dari 24 jam melewati batas itu (ADR 54).
- ADR 36 menulis breaker per proses. Pengumuman ke 1.000.000 HP butuh puluhan proses (ADR 51).
- ADR 38 menghitung unduhan staf 1.157 KB per detik untuk registry Tahap 5, yaitu 20.000 × 500 KB ÷ 86.400 × 10 (4.15, Hitungan atas Asumsi). Kapasitas jaringan instance tidak diukur lab, jadi angka itu belum bisa dibandingkan dengan pemicunya, dan hitungannya diulang di bagian 3.
- ADR 42 menaruh kill switch di memori satu proses, dan Kubernetes menjalankan beberapa pod per service. Itu menjadi M49.
- ADR 44 menulis pipeline dan giliran jaga per tim, dan ADR 58 mengerjakannya.
- ADR 45 menunda delapan komponen. Tahap 5 membaca tiap pemicunya terhadap PRD v5 (tabel di bagian 3), dan ADR 60 menulis ulang yang belum tercapai.

ADR 45 aturan 5 menjadwalkan tiga pengukuran sebelum fitur PRD v5 pertama: load test kapasitas satu server, role dan pool per modul, dan hitungan request berurutan per layar app. Lab `api-t5` mengerjakan dua yang pertama dalam batas laptop. Yang ketiga tetap milik tim Pengguna, dan BFF tetap sengaja belum sampai angkanya ada.

## 2. Dari fitur ke pekerjaan teknis

| Fitur | Di app | Di backend | Di database | Konsep yang akan dibutuhkan |
| --- | --- | --- | --- | --- |
| Skala nasional, tidak berhenti | Tidak ada perubahan yang terlihat | Enam service di Kubernetes, tiga instance tiap service, rilis tanpa jeda; pooler; failover | Read replica, replica sinkron, schema dan role per service | Read replica, failover, service, Kubernetes, pooler |
| Laporan merchant real-time | Layar laporan di app Merchant dan dasbor web, diperbarui tiap 30 detik | Laporan dibaca dari replica, ringkasan harian per merchant | `ringkasan_merchant_harian`; `posting` dipartisi | Read replica, read-your-writes, partisi, snapshot saldo |
| Notifikasi massal | Pengumuman muncul di HP, notifikasi uang tetap cepat | Worker diskalakan keluar; pengumuman lewat event streaming; kuota penyedia push | `pengumuman`; topik di event streaming | Fan-out, backpressure, event streaming |
| Cicilan dan tabungan | Atur jadwal, lihat angsuran, hentikan | Service cicilan dan batch harian tahan crash | `jadwal_cicilan`, `angsuran`, kantong tabungan sebagai buku | Batch harian, saga, kunci bisnis |
| API publik untuk POS | Tidak ada (kasir mitra) | Pintu di tepi: kuota per mitra, tanda tangan, WAF; webhook ke POS | `mitra_pos`; `akun.mitra_pos_id` | Rate limit per mitra, WAF, mTLS antar service |
| Kartu virtual untuk semua | Tidak ada perubahan | Rilis bertahap, satu kill switch | `sakelar` | Progressive delivery, feature flag, GitOps |
| 28 engineer, delapan tim | Paket app per tim | Pipeline per service, observability penuh, platform sebagai jalan beraspal | Migration per service | OpenTelemetry, SLO, GitOps, on-prem lawan cloud |

Dari tabel ini lahir pertanyaan pertama Tahap 5, sebelum satu baris kode: **salinan boleh banyak, tetapi tempat uang bergerak hanya satu**. Cara pertama yang ditulis tim memperlakukan semua salinan seperti sumber, dan itu bagian 3.

