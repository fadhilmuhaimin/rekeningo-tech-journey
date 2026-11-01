# Setelah Tahap 5

Polesan dari tinjauan Tahap 5 yang sengaja tidak dikerjakan (lingkup dibekukan).

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- Lab `t5-replika` (skema saldo lama, jeda buatan) perlu versi ledger dengan jeda alami di bawah beban (R5-02, R5-39).
- Lab `t5-skala` partisi: periksa kunci primer dan FK ke tabel partisi di skema ledger (R5-04).

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- `plan/RISET-TAHAP-5.md` 119 dari 120 baris: baris riset halaman akan melewati 120; batas 120 di skill riset-tahap hanya untuk riset awal (RISET-TAHAP-4 293 baris). Perjelas kalimat batas di skill saat DIRI-5.
- `labs/t5-skala`: hapus atau arsipkan sesudah `t5-partisi` dan `api-t5` merge, dengan persetujuan pemilik; `lb.txt` (sesi di memori lawan token) tidak punya halaman Tahap 5.
- `labs/README.md` dan `tools/cek_port_lab.py`: daftarkan port Kafka, k3d, OpenBao, PgBouncer, replica ketiga, dan Redis tiap lab baru sebelum lab pertama merge.
- `registri.test.ts` mengunci judul tugas ANTREAN (`### lab-<nama> · ` dan `### 5.n · `): mengganti nama tugas menuntut mengubah tes.
- Registry D2, D3, dan D4b kini tanpa nomor; `cek_tautan.py` lolos, tetapi teks luar yang masih menulis "5.1 Scaling" tidak ada di repo.
- `G3-rantai` bisa dipecah: `for T in 1 2 3 4` di `tools/cek_situs.sh` lolos hari ini (rantai 4: 31 langkah, sesudah 4.31 ke halaman Tahap 5; sesudah 5.1 terbit, 4.31 menuju 5.1) dan menjaga Berikutnya dari 4.31 selama 32 halaman ditulis; rantai 5 dan `gejala` menunggu 5.32.
- Penjaga yang tidak ada: path halaman "segera" (mutan R22) dan id serta path halaman setelah ditulis tetap mengikuti penjaga halamannya; tes `registri.test.ts` membekukan id Tahap 5, jadi mengganti id satu halaman menuntut mengubah tes itu.
- Kepala `catatan` registry `cerita.json` ("Tahap 3-5 masih versi lama dari plan/STORY.md") sudah usang sejak Tahap 3; bukan data tampil.
- Tes peta RINGKAS di `registri.test.ts` hanya meminta baris lipat `5.1–5.32 selesai` begitu pengatur melipat peta Tahap 5; tulis baris itu persis dengan tanda "–" panjang.

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- Sesudah halaman 5.5, 5.11, 5.13, 5.15, 5.17, 5.19, 5.21, 5.23, 5.27, 5.29, dan 5.32 merge, cek bahwa rujukan `[[id]]` di 5.30 berubah dari "(segera)" menjadi tautan dan tes 5.30 tetap hijau (tes mengunci id, nomor, dan ADR di registry, bukan teks "(segera)").
- Halaman 5.31 dan 5.32 mengulang kalimat pemicu multi-region persis ("Satu region mati lebih lama dari RTO 15 menit, atau PRD v6 memintanya"); penjaga 5.30 mengunci kalimat itu karena naskah bagian 6 memakainya sebagai bukti tebakan 5.32.
- Halaman 5.31 menghitung "enam belas kalimat" atas ADR 46 sampai 60: tabel Kapan keputusan ini salah di 5.30 (dua belas baris, kolom Dibaca) adalah sumber hitungan butir ADR 60.
- Daftar sumber 5.30 memuat 14 tautan luar tanpa nomor versi di enam halaman (Istio, AWS, gRPC, TigerBeetle, Temporal, flagd); cek ulang saat DIRI-5 bila nomor versi tersedia.
- (peninjau 5.30) Tebak bersama sesudah memilih lewat Enter: fokus jatuh ke BODY, `role=status` memuat empat kalimat dan tombol "Coba pilihan lain", dan tanpa JavaScript empat tombol tampil mati (sudah tercatat di SETELAH-TAHAP-3 dan 4; diukur lagi di 5.30, Chrome 375x667).
- (peninjau 5.30) Snippet `latensi_ledger_test.go:23:25` menampilkan komentar lab "Hitungan dari naskah ADR 42 ..." (kata naskah dan nomor ADR di teks tampil); pakai rentang 25:25 atau tulis kodenya di prop `code`. Kode memakai `>=`, kalimat halaman "melewati 50 ms": tulis "mencapai atau melewati".
- (peninjau 5.30) Rantai Inti membungkus jadi 4 garis di 360 dan 375 px (dua baris data, dicetak `ukur-rantai.mjs` sebagai info R6); margin layar pertama 62 px tetap aman. Nada `good` pada "6 belum terukur" berarti hasil benar menurut `Rantai.astro`; pertimbangkan nada biasa untuk butir tanpa angka.
- (peninjau 5.30) Adegan Tebak menulis "yang masih lolos target" tanpa menyebut targetnya (aturan 4 menulis ambang p95); tulis "ambang p95 yang ditetapkan" saat 5.29 dan 5.31 merge.
- (peninjau 5.30) Halaman 5.31 dan 5.32 tidak boleh menulis "semua pemicu ADR 45 dibaca ulang": enam dari sebelas baris punya pemicu tambahan di 4.29 (baris 1, 2 Kubernetes, 4 read replica, 5, 6, 7). R4-251 menulis Istio tanpa nomor versi dan keliru (kaki halaman: Istio 1.31.3); perbaiki saat DIRI-5 bila R4 boleh diubah.
- (peninjau 5.30) Heading "Apa kedua belasnya" dapat ditulis "Apa saja kedua belas butir itu". Tautan jangkar heading Starlight berukuran 16x23 px (tema global, bukan 5.30).
- `BiayaTigaTahun` menyembunyikan widget tanpa JavaScript lewat `@media (scripting: none)` dan memuat tabel semua skenario di `<noscript>`; `Kalkulator` dan `Tebak` masih menampilkan tombol mati tanpa JS (polesan 4.x). Pindahkan pola itu ke komponen bersama.
- Model biaya belum menghitung biaya menjaga jalan keluar (aturan bentuk standar, review) dan biaya latihan pindah; tambahkan dua komponen itu bila PT punya angkanya.
- Hanya satu skenario mengubah pertumbuhan (50% per tahun). Bila pemilik ingin mencoba angka sendiri, ubah skenario jadi slider (tebak dulu tetap dipertahankan).
- 5.28 membaca ±14 menit (3.061 kata di MDX, `wc -w`), di bawah ±15 menit; meta menulis 15 menit.
- Kalimat tentang ADR 48 dan 52 ("bentuk yang juga bisa dijalankan sendiri") bersumber dari naskah karena halaman 5.9 dan 5.17 belum merge; cocokkan dengan teks keduanya saat merge.
- `colo` dijelaskan di halaman istilah on-prem, bukan entri sendiri; pisahkan bila halaman Tahap 6 memakainya.
- (tinjauan 5.28) Model membeli perangkat on-prem tepat sesuai kebutuhan tiap tahun, tanpa kapasitas cadangan dan waktu tunggu, padahal tulisan kedua 37signals menulis mereka sengaja over-provision. Tambahkan skenario kapasitas cadangan bila PT punya angka.
- (tinjauan 5.28) Tulisan kedua 37signals memuat dua kalimat yang langsung mendukung ADR ini: kerja mengemas aplikasi dalam container membuat keluar relatif mudah, dan terikat pada layanan terkelola khusus penyedia membuat keluar sangat sulit. Halaman belum memakainya, dan 37signals memakai pusat data sewaan (colo), cocok dengan opsi B.
- (tinjauan 5.28) "Selisih sebesar 290 itu kecil dibandingkan angka orang" kurang jelas: tulis "dibandingkan biaya satu orang selama tiga tahun (1.440)". Dua kalimat penutup kasus industri (faktor puncak "mengarah ke ujung beban tidak teratur" lalu "belum sama dengan lonjakan yang tidak bisa ditebak") berlawanan arah: gabung jadi satu kalimat bersyarat.
- (tinjauan 5.28) Halaman istilah `on-prem` menulis perangkat dibeli "sesuai kapasitas yang dibutuhkan beberapa tahun ke depan", sedangkan model membeli kenaikan kapasitas tiap tahun. Samakan satu gambaran.
- (tinjauan 5.28) Opsi C ("Tidak dijalankan: jaringan antar lokasi tidak diukur") memakai label yang berarti dicek ke dokumentasi, padahal tidak ada dokumentasi yang dicek: ganti "Belum diukur" bila `/cara-pakai/` mendapat label itu.
- 5.1 dibaca ±16 menit (3.2xx kata, registry 16), di atas ±15 menit. Bila pembaca segar mengeluh, pecah blok "Yang dibuka lagi dari Tahap 4" jadi halaman sendiri atau ringkas dua belas bullet ADR jadi tabel; tidak dipecah di PR ini.
- Penjaga 5.1 mengunci kalimat tabel dan bullet ke kalimat halaman ADR Tahap 1 sampai 4 dan memindai kata "Tahap 5" di halaman ADR (tujuh ADR). PR yang mengubah kalimat itu atau menambah kata "Tahap 5" ke halaman ADR lama mematahkan tes 5.1 dengan sengaja; sesuaikan tes di PR yang sama.
- `audit_bahasa` memberi peringatan "bocor" untuk "kunci yang bocor" di tabel user (kata naskah); ganti bila naskah diubah.
- RPO, RTO, dan Error budget hanya punya baris glosarium; SLO, failover, batch harian, WAF, Kubernetes, dan primary diberi arti di tempat dan belum punya baris glosarium.
- Mutan prosa tanpa sidik tertangkap oleh tes "prosa habis dikunci" yang daftar kuncinya ditulis tangan; bila halaman 5.1 diubah, bangkitkan ulang `prd-v5.halaman.nilai.ts` dengan skrip sementara dan baca diff-nya.
- Tinjauan 5.1: "Asumsi produk" pertama muncul di catatan Rantai, sebelum artinya (satu kalimat di bawah tabel Ruang lingkup); pindahkan artinya ke paragraf label di blok Latar masalah. "Asumsi cerita" dipakai tiga kali tanpa arti di halaman ini.
- Tinjauan 5.1: arti error budget "dikalikan lama periode" adalah turunan penulis; sumbernya (SRE Workbook) menulis 100% dikurangi SLO sebagai persen dan contohnya dalam jumlah gagal. Tulis sebagai Hitungan bila halaman ditinjau lagi.
- Tinjauan 5.1: kalimat ADR 33 menulis backup harian berjendela sampai 24 jam tanpa label; sumbernya (halaman ADR 33) menulis "Hitungan; jadwal Asumsi", dan halaman ADR 39 menulis jendela layanan terkelola belum diketahui. Tambah label atau rujukan bila halaman diubah.
- Tinjauan 5.1: tabel empat ADR selebar 474 px digulir di dalam wadahnya di HP (WCAG 1.4.10 membolehkan tabel data); pertimbangkan tiga kolom bila pembaca HP mengeluh.
- Tinjauan 5.1 (komponen `Blok` bersama, bukan halaman ini): tanpa JavaScript tujuh tombol Berikutnya tampil dan tidak berfungsi, padahal `details` tetap bisa dibuka; skill visualisasi menyuruh tombol seperti itu tidak ditampilkan.
- Tinjauan 5.1: penjaga mengunci prosa lewat daftar kunci tulisan tangan; mutan spasi di akhir baris lolos tanpa sidik karena tidak terlihat di render (setara).
