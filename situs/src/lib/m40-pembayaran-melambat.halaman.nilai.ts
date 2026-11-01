// Nilai penjaga halaman 5.4, dibangkitkan dari m40-pembayaran-melambat.mdx, diagram, skenario, snippet, dan baris riset oleh
// tmp/m40/buat_nilai.mjs; tes membandingkan halaman dengan nilai ini SETIAP baris dan SETIAP sidik. Ubah halaman, jalankan
// ulang pembangkit, dan baca selisihnya sebelum commit: sidik hanya menandai bahwa sesuatu berubah, bukan bahwa ia benar.
export const SIDIK = {
  frontmatter: "69b8c63646a98982",
  riset: ["ebb8a2f6933ebdb2","2ed920408c7a3f17","34c1fd514ebf4991","36b1699d6181a540","feeab9ab6a4d9282"],
  diagram: "28d5a3bb538e22f0",
  skenario: "222f7cd1c1803423",
  snippet: ["b1ba3f24d8e872cc","968a0f4d5d20b087","43ab032c7548abcd","0793890ce9dd7dde","32952b26f1ea72cf","ec6ecdd11b95126d"],
};

// Nilai terpisah dari kalimat terkunci: lima baris riset utuh, tiap daun diagram dan skenario, dan profil kata penentu
// per baris badan (polaritas, urutan waktu, bilangan, tokoh, kode status, label sumber).
export const RISET_TERKUNCI: string[] = [
  "| R5-125 | Rekaman dan kode lab api-t5 untuk M40 (dibaca untuk halaman 5.4, tanpa menjalankan ulang) | Rekaman `labs/api-t5/output/laporan.txt` bagian A (rute laporan 404 tanpa mode `laporan-primary`; Budi bayar Warung 505 Rp35.000 dan Rp12.000, laporan menjawab 2 transaksi, total 47000, `dibaca_dari` primary; Warung 506 dan Budi dijawab 404; waktu eksekusi query laporan di bawah 1 ms sebagai batas), B (pembayaran 100 per detik selama 10 detik: 1000 dari 1000 semua 201 tanpa dan dengan laporan 666,7 per detik dari 9 warung: 6667 dari 6667 semua 200; p95 pembayaran di bawah 2000 ms di kedua putaran; selisih p95 tidak direkam), C (cache Redis TTL 30 detik, 9 warung satu client, dua putaran berjarak 30,5 detik: hit 0, miss 18, baca database 18; kontrol dua client per warung: hit 9, miss 9, baca database 9); kode `labs/api-t5/internal/repo/t5.go` (`LaporanHariIni` baris 27 sampai 35: satu query atas `posting` dan `buku`), `internal/service/t5.go` (`LaporanHariIni` baris 57 sampai 89: `Akun` dibaca sebelum cache, `kl.Baca` hanya membungkus `muat`, `DibacaDari` teks tetap \"primary\" baris 87), `internal/repo/repo.go` (`SesiAktif`, `Akun`), `internal/handler/handler.go` (`wajibLogin` memanggil `Periksa`), `handler_t5.go` (rute hanya dengan mode), `internal/cache/cache.go` (`Baca`: hit tidak memanggil `Simpan`), `cmd/beban/main.go` (aliran laporan memutar 9 warung; `-hanya-bayar` mengirim POST /transfers Rp1.000), `run.py` (`rekam_laporan`: jeda 30,5 detik, TTL 30 detik); README lab bagian 'Yang terbaca dari rekaman' butir M40 dan Cache laporan. PostgreSQL 17.11, go1.27.3, pgx v5.11.0 | 5.4 (semua blok, Cek diri, diagram, widget alur t5-m40): angka rekaman, label 'dibaca dari kode', dan lingkup klaim negatif | Baru |",
  "| R5-126 | Hitungan 5.4 atas angka yang tertulis di halaman (Hitungan, Asumsi) | Dihitung dengan skrip sendiri dari angka naskah Tahap 5 dan halaman, dibaca 2026-11-02: 200.000 × 10% = 20.000; 20.000 ÷ 30 = 666,67 (ditulis 666,7); 666,7 ÷ 69,4 = 9,61 (9,6) dan 666,7 ÷ 46,3 = 14,40 (14,4); 666,7 × 0,02 = 13,33 (13,3); 666,7 × 0,02 ÷ 8 = 1,667 (167%); 8 ÷ 666,7 = 0,0120 detik (12 ms); 666,7 × 0,001 ÷ 8 = 8,3%; 666,7 × 0,02 ÷ 16 = 83%; (1.388,9 − 69,4) × 0,02 = 26,39 (26,4) dan ÷ 5 = 528%; (1.388,9 − 46,3) × 0,02 = 26,85 (26,9); 666,7 ÷ 9 = 74,1; 29 + 29 = 58 lawan TTL 30; 30 + 30 = 60 lawan 30 + 5 = 35 (PRD v5: data laporan tertinggal paling lama 5 detik, layar memperbarui tiap 30 detik; Asumsi produk). Masukan 10% online, 20 ms, dan 8 vCPU adalah Asumsi naskah (R5-34); 20 ms adalah lama satu request memegang koneksi, bukan waktu CPU, jadi 167% adalah batas atas untuk W itu (penalaran) | 5.4 (Yang sebenarnya, Cek diri, diagram, widget alur): label Hitungan atas Asumsi dan titik impas 12 ms | Baru |",
  "| R5-127 | Selisih naskah M40 dengan lab untuk halaman 5.4 (penalaran dari rekaman, bukan sumber luar) | Naskah M40 menulis 'Di app Budi tombol Bayar berputar 6 detik' dan 'hampir tidak ada panggilan yang menemukan isinya': lab tidak menghasilkan perlambatan (p95 pembayaran di bawah 2000 ms di kedua putaran, selisih tidak direkam; query laporan di bawah 1 ms pada data satu hari dan 9 warung), jadi 6 detik tetap Ilustrasi dan 666,7, 13,3, serta 167% tetap Hitungan atas Asumsi. Rekaman cache memakai jarak 30,5 detik, lebih panjang dari TTL 30 detik; jarak 30 detik atau lebih pendek tidak direkam, dan hit tidak memperpanjang umur isi (`cache.go` `Baca`), jadi paling baik satu hit dari dua panggilan satu perangkat (Hitungan). Naskah R5-36 menulis laporan harian satu merchant ringan (2 sampai 3 transaksi per hari) sedangkan hitungan memakai 20 ms per request: kedua angka itu belum didamaikan oleh rekaman. Naskah menolak 'server kurang kuat' tanpa menghitung 16 vCPU (83%). Cache laporan di naskah tidak menyebut batas ketertinggalan 5 detik di PRD v5 | 5.4 (Gejala, Yang sebenarnya, Yang tidak direkam); usulan ke badan PR | Baru |",
  "| R5-128 | Redis: timeout kunci dan kedaluwarsa (dibaca untuk halaman 5.4) | redis.io/docs/latest/commands/expire/ (versi 'latest' tanpa nomor, dibuka 2026-11-02, dibaca dari teks halaman): 'After the timeout has expired, the key will automatically be deleted.' dan 'The timeout will only be cleared by commands that delete or overwrite the contents of the key, including DEL, SET, GETSET and all the *STORE commands.' Halaman tidak menyebut GET secara eksplisit; GET membaca tanpa menghapus atau menimpa isi kunci, dan `internal/cache/redis.go` lab membaca dengan GET (`Ambil`) dan menyimpan dengan SET berumur TTL (`Simpan`) hanya saat miss (`cache.go` `Baca`), jadi hit tidak memperpanjang umur isi. Appendix: 'A key is passively expired when a client tries to access it and the key is timed out' | 5.4 (Cache 30 detik; Cek diri butir 3) | Tidak berubah |",
  "| R5-129 | PostgreSQL: EXPLAIN ANALYZE menjalankan statement (dibaca untuk halaman 5.4) | PostgreSQL 17.11, EXPLAIN (postgresql.org/docs/17/sql-explain.html, dibuka 2026-11-02): 'The ANALYZE option causes the statement to be actually executed, not only planned. Then actual run time statistics are added to the display'. Halaman tidak mendefinisikan baris 'Execution Time' secara eksplisit; lab hanya memakainya sebagai batas di bawah 1 ms, nilainya tidak direkam | 5.4 (Yang sebenarnya, polling dan perlambatan) | Tidak berubah |"
];
export const DIAGRAM_DAUN: [string, string | number | boolean][] = [
 [
  ".id",
  "t5-m40-laporan-primary"
 ],
 [
  ".judul",
  "Laporan di primary: yang direkam dan yang dihitung"
 ],
 [
  ".sumber.jenis",
  "asumsi"
 ],
 [
  ".sumber.teks",
  "Baris atas: rekaman lab api-t5, laporan.txt bagian A dan B. Baris bawah: Hitungan atas Asumsi"
 ],
 [
  ".baris[0].label",
  "Direkam"
 ],
 [
  ".baris[0].sub",
  "laporan.txt bagian A dan B"
 ],
 [
  ".baris[0].simpul[0].teks",
  "Laporan dibaca dari primary"
 ],
 [
  ".baris[0].simpul[0].sub",
  "tiap panggilan menjumlah posting"
 ],
 [
  ".baris[0].simpul[1].teks",
  "6.667 laporan selesai"
 ],
 [
  ".baris[0].simpul[1].sub",
  "666,7 per detik selama 10 detik, semua 200"
 ],
 [
  ".baris[0].simpul[2].teks",
  "1.000 pembayaran tetap 201"
 ],
 [
  ".baris[0].simpul[2].sub",
  "selisih p95 tidak direkam"
 ],
 [
  ".baris[1].label",
  "Dihitung"
 ],
 [
  ".baris[1].sub",
  "Asumsi: 20.000 merchant online, 20 ms, 8 vCPU"
 ],
 [
  ".baris[1].simpul[0].teks",
  "666,7 laporan per detik"
 ],
 [
  ".baris[1].simpul[0].sub",
  "20.000 ÷ 30"
 ],
 [
  ".baris[1].simpul[1].teks",
  "13,3 laporan berjalan"
 ],
 [
  ".baris[1].simpul[1].sub",
  "666,7 × 0,02"
 ],
 [
  ".baris[1].simpul[2].teks",
  "167% CPU bila 20 ms"
 ],
 [
  ".baris[1].simpul[2].sub",
  "666,7 × 0,02 ÷ 8, Hitungan atas Asumsi"
 ],
 [
  ".baris[1].simpul[2].nada",
  "warn"
 ],
 [
  ".catatan",
  "Rekaman membuktikan jalurnya, bukan perlambatannya. Kotak oranye adalah hitungan yang bergantung pada 20 ms, yang tidak diukur."
 ]
];
export const SKENARIO_DAUN: [string, string | number | boolean][] = [
 [
  ".versi",
  2
 ],
 [
  ".judul",
  "Laporan merchant dari primary: polling 666,7 per detik dan cache 30 detik"
 ],
 [
  ".sumber.jenis",
  "rekaman"
 ],
 [
  ".sumber.file",
  "labs/api-t5/output/laporan.txt"
 ],
 [
  ".sumber.fileVarian",
  "labs/api-t5/output/laporan.txt"
 ],
 [
  ".sumber.catatan",
  "Lab api-t5, PostgreSQL 17.11, dari database bersih (make -C labs/api-t5 run BAGIAN=laporan). Jalur utama: laporan.txt bagian A (laporan dari primary), B (pembayaran dengan dan tanpa polling), dan C (cache 30 detik, satu client per warung). Ubah satu hal: bagian C (kontrol dengan dua client per warung). Polling berasal dari 9 warung dengan data satu hari, bukan dari 20.000 merchant. Baris diawali tanda pagar diringkas dari rekaman yang sama, bukan baris log."
 ],
 [
  ".pengantar",
  "Laporan Warung 505 dibaca dari primary, lalu lab memutar polling dan cache 30 detik. Tebak dulu berapa dari 18 panggilan yang mendapat hit di cache, lalu ikuti langkahnya. Sesudah langkah terakhir, centang 'Ubah satu hal'."
 ],
 [
  ".komponen[0].id",
  "kln"
 ],
 [
  ".komponen[0].label",
  "Client: curl dan generator beban"
 ],
 [
  ".komponen[1].id",
  "srv"
 ],
 [
  ".komponen[1].label",
  "Server api-t5 (mode laporan-primary)"
 ],
 [
  ".komponen[2].id",
  "dbm"
 ],
 [
  ".komponen[2].label",
  "PostgreSQL: tabel posting dan buku"
 ],
 [
  ".komponen[3].id",
  "rds"
 ],
 [
  ".komponen[3].label",
  "Redis: cache laporan 30 detik"
 ],
 [
  ".predict.q",
  "Cache laporan di Redis berumur 30 detik. Sembilan warung masing-masing punya satu client yang memanggil laporan dua kali, berjarak 30,5 detik. Berapa dari 18 panggilan yang menemukan isinya di cache (hit)?"
 ],
 [
  ".predict.options[0]",
  "9 dari 18: panggilan kedua tiap warung memakai isi dari panggilan pertama"
 ],
 [
  ".predict.options[1]",
  "Berubah di tiap run, jadi tidak bisa dihitung: hit cache bergantung pada waktu"
 ],
 [
  ".predict.options[2]",
  "0 dari 18: panggilan kedua datang sesudah isi cache kedaluwarsa"
 ],
 [
  ".predict.options[3]",
  "18 dari 18: Redis menyimpan isi sampai datanya berubah"
 ],
 [
  ".predict.answer",
  2
 ],
 [
  ".predict.varian",
  false
 ],
 [
  ".predict.explain",
  "Jaraknya 30,5 detik, lebih panjang dari umur isi cache 30 detik, jadi kedua putaran miss: hit 0, miss 18, baca database 18. Jumlah hit dibaca dari pencacah server, bukan dari waktu. Rekaman laporan.txt bagian C."
 ],
 [
  ".langkah[0].dari",
  "kln"
 ],
 [
  ".langkah[0].ke",
  "srv"
 ],
 [
  ".langkah[0].judul",
  "Budi membayar Warung 505 dua kali, lalu warung membuka laporan"
 ],
 [
  ".langkah[0].kirim",
  "$ curl -i -X POST '/transfers' -H 'Authorization: Bearer <token sesi Budi>' -d '{\"ke\": 505, \"nominal\": 35000}'\nHTTP/1.1 201 Created\n$ curl -i -X POST '/transfers' -H 'Authorization: Bearer <token sesi Budi>' -d '{\"ke\": 505, \"nominal\": 12000}'\nHTTP/1.1 201 Created\n$ curl -i -X GET '/merchant/505/laporan/hari-ini' -H 'Authorization: Bearer <token sesi Warung 505>'\nHTTP/1.1 200 OK\n{\"merchant\":505,\"tanggal\":\"<tanggal>\",\"jumlah_transaksi\":2,\"total\":47000,\"dibaca_dari\":\"primary\"}"
 ],
 [
  ".langkah[0].jelas",
  "Laporan menjawab dua transaksi dengan total Rp47.000, hasil dua pembayaran Budi (Rp35.000 + Rp12.000, Hitungan). Field dibaca_dari adalah teks tetap di kode, bukan hasil ukuran."
 ],
 [
  ".langkah[1].dari",
  "srv"
 ],
 [
  ".langkah[1].ke",
  "dbm"
 ],
 [
  ".langkah[1].judul",
  "Server menjumlah posting hari ini langsung dari tabel posting, tiap panggilan"
 ],
 [
  ".langkah[1].kirim",
  "# Query laporan menjumlah posting masuk ke buku merchant hari ini langsung dari tabel posting di primary, tiap panggilan.\nwaktu eksekusi query laporan satu warung di database di bawah 1 ms (EXPLAIN ANALYZE; batas lab, nilai ukur tidak direkam): ya"
 ],
 [
  ".langkah[1].jelas",
  "Data lab kecil: satu hari dan 9 warung. Angka 20 ms di hitungan beban adalah Asumsi, bukan hasil rekaman."
 ],
 [
  ".langkah[2].dari",
  "kln"
 ],
 [
  ".langkah[2].ke",
  "srv"
 ],
 [
  ".langkah[2].judul",
  "Pembayaran 100 per detik selama 10 detik, tanpa laporan"
 ],
 [
  ".langkah[2].kirim",
  "# ./beban: pembayaran 100 per detik selama 10 detik dari 200 user, tanpa laporan\npembayaran selesai: 1000 dari 1000, semua 201"
 ],
 [
  ".langkah[2].jelas",
  "Seribu pembayaran selesai dan semuanya 201 (100 × 10, Hitungan)."
 ],
 [
  ".langkah[3].dari",
  "kln"
 ],
 [
  ".langkah[3].ke",
  "srv"
 ],
 [
  ".langkah[3].judul",
  "Pembayaran yang sama, ditambah laporan 666,7 per detik dari 9 warung"
 ],
 [
  ".langkah[3].kirim",
  "# ./beban: pembayaran yang sama, ditambah laporan 666,7 per detik dari 9 warung\npembayaran selesai: 1000 dari 1000, semua 201; laporan selesai: 6667 dari 6667, semua 200\np95 pembayaran tanpa laporan di bawah 2000 ms (batas lab, Asumsi; nilai ukur tidak direkam): ya\np95 pembayaran dengan laporan di bawah 2000 ms (batas lab, Asumsi; nilai ukur tidak direkam): ya"
 ],
 [
  ".langkah[3].jelas",
  "Kedua putaran selesai tanpa galat dan p95 pembayaran ada di bawah batas 2.000 ms. Selisih p95 tidak direkam dan tidak menjadi syarat, jadi rekaman tidak menunjukkan pembayaran yang melambat. Tombol Bayar yang berputar 6 detik di cerita tetap Ilustrasi."
 ],
 [
  ".langkah[4].dari",
  "srv"
 ],
 [
  ".langkah[4].ke",
  "rds"
 ],
 [
  ".langkah[4].judul",
  "Cache laporan 30 detik: satu client per warung, dua putaran berjarak 30,5 detik"
 ],
 [
  ".langkah[4].kirim",
  "# server: ./api-t5 -lab -rentan laporan-primary -laporan-cache redis -laporan-ttl 30s\n$ GET /merchant/<id>/laporan/hari-ini untuk 9 warung, satu client per warung, dua putaran berjarak 30,5 detik (TTL 30 detik)\nGET /lab/cache-laporan -> mode redis, ttl 30 detik, hit 0, miss 18, baca database 18\nhit rate: 0 dari 18 = 0%"
 ],
 [
  ".langkah[4].jelas",
  "Panggilan kedua datang sekitar 0,5 detik sesudah isi cache kedaluwarsa, jadi tidak ada hit dan database dibaca 18 kali. Jarak yang lebih pendek dari 30 detik tidak direkam."
 ],
 [
  ".langkah[4].nada",
  "warn"
 ],
 [
  ".varian.label",
  "dua client untuk tiap warung dalam satu jendela TTL"
 ],
 [
  ".varian.mulai",
  4
 ],
 [
  ".varian.langkah[0].dari",
  "srv"
 ],
 [
  ".varian.langkah[0].ke",
  "rds"
 ],
 [
  ".varian.langkah[0].judul",
  "Kontrol: dua client untuk tiap warung, dua panggilan berurutan dalam satu jendela TTL"
 ],
 [
  ".varian.langkah[0].kirim",
  "# Kontrol: dua client untuk setiap warung, dua panggilan berurutan dalam satu jendela TTL.\nGET /lab/cache-laporan -> hit 9, miss 9, baca database 9\nhit rate kontrol: 9 dari 18 = 50%"
 ],
 [
  ".varian.langkah[0].jelas",
  "Panggilan pertama tiap warung miss dan yang kedua hit, jadi 9 hit dari 18. Cache menolong bila ada panggilan kedua dalam 30 detik untuk merchant yang sama. Berapa layar yang membuka laporan satu merchant di produksi adalah Asumsi."
 ],
 [
  ".varian.langkah[0].nada",
  "good"
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
 "belum:1 dua:1 Budi:1 Ani:1 pembayaran:1 detik:1",
 "sama:1 Wulan:1 laporan:1 detik:1 merchant:1",
 "tidak:1 dua:1 Ani:1 bukan:1 Rekaman lab:2 Tidak dijalankan:1 Ilustrasi:2 Asumsi:1 pembayaran:1 detik:2 lab:2 naskah:1 cerita:1",
 "",
 "Raka:1",
 "pertama:1 laporan:1 database:1",
 "tidak:3 Nadia:1 cache:2 hit:1 miss:1 laporan:1 database:2 detik:1",
 "cache:1 TTL:1 laporan:1 polling:1 detik:2 merchant:1",
 "",
 "tidak:1 hanya:1 pembayaran:2 laporan:2",
 "hanya:1 sama:1 satu:1 semua:1 juga:1 Tidak dijalankan:1 primary:1 pembayaran:1 database:1 dibaca dari kode:1 lab:3",
 "",
 "Nadia:1 cache:1",
 "",
 "",
 "sama:1 primary:1 pembayaran:1 polling:1 database:1",
 "",
 "hanya:1 satu:2 bukan:1 database:1 404:1 lab:1 cerita:1",
 "tidak:1 tanpa:1 Rekaman lab:1 laporan:3 lab:1",
 "dua:2 Budi:1 Rekaman lab:1 Hitungan:1 primary:1 warung:1 lab:1",
 "dua:1 Budi:1 Rekaman lab:1 pembayaran:1 laporan:3 lab:1",
 "tidak:1 satu:1 Tidak dijalankan:1 replica:1 cache:1 query:1 dibaca dari kode:1",
 "query:1 laporan:1 lab:1",
 "tidak:1 hanya:1 tiga:1 Tidak dijalankan:1 laporan:1 merchant:1 lab:1 perintah SQL:3 GET:1 Bearer:1",
 "tetap:1 satu:1 cache:1 query:1 lab:1",
 "bukan:1 juga:1 Tidak dijalankan:1 primary:1 cache:1 dibaca dari kode:1",
 "tidak:1 dua:1 pertama:1 kedua:1 tanpa:2 Tidak dijalankan:1 pembayaran:1 laporan:2 200:1 detik:4 warung:1",
 "tanpa:1 Rekaman lab:1 pembayaran:1 laporan:3 polling:1 lab:1",
 "tidak:2 kedua:2 tanpa:1 Asumsi:1 p95:2 pembayaran:2 laporan:1 direkam:1 tidak direkam:1 200:1 201:1 ms:1 lab:1 di bawah:1",
 "tidak:2 hanya:1 kedua:1 pembayaran:1 ms:1",
 "tidak:1 satu:1 Rekaman lab:1 Tidak dijalankan:1 penalaran:1 laporan:2 bisa:1 direkam:1 ms:1 warung:1 lab:2 produksi:1 di bawah:1",
 "Hitungan:1 polling:1 detik:2 merchant:1 warung:2 lab:1 produksi:1",
 "sama:1 satu:1 Asumsi:2 Hitungan:1 CPU:1 vCPU:2 polling:1 200:1 ms:1 detik:1 merchant:1 produksi:1 naskah:1",
 "dua:1 tiga:1 detik:1",
 "Hitungan:1",
 "",
 "200:1",
 "detik:1",
 "",
 "",
 "CPU:1",
 "CPU:1 ms:1",
 "CPU:1 vCPU:1",
 "dua:2 juga:1 Asumsi:1 Hitungan:1 replica:1",
 "tidak:1 satu:1 penalaran:1 CPU:2 vCPU:1 pembayaran:1 laporan:2 lebih:1 ms:2 detik:1",
 "tidak:1 satu:1 juga:1 penalaran:1 CPU:1 query:1 laporan:1 ms:4 cerita:1 batas atas:1 di bawah:1",
 "tetap:1 CPU:1 vCPU:1 laporan:1 merchant:1 sebanding:1",
 "satu:1 dua:2 pertama:1 cache:1 hit:1 TTL:1 laporan:1 detik:3 warung:2",
 "dua:1 Rekaman lab:1 cache:1 laporan:2 detik:1 lab:1",
 "satu:1 dua:1 kedua:1 bukan:1 cache:1 hit:3 miss:1 TTL:1 database:1 warung:1",
 "tidak:3 sesudah:1 satu:1 kedua:1 Hitungan:1 hit:3 TTL:1 lebih:2 direkam:1 tidak direkam:1 detik:5 perangkat:1 di atas:1 memperpanjang:1",
 "tidak:2 hanya:2 satu:1 dua:1 tanpa:2 Tidak dijalankan:1 penalaran:1 hit:2 miss:1 TTL:1 direkam:1 tidak direkam:1 lab:1 GET:2 SET:1 memperpanjang:1 Hasil terbaik:1 satu hit dari dua panggilan:1",
 "tidak:1 hanya:1 tetap:1 dua:1 juga:1 Tidak dijalankan:1 database:2 dibaca dari kode:1",
 "tidak:1 sesudah:1 kedua:1 Tidak dijalankan:1 Asumsi:2 Hitungan:1 cache:1 hit:2 miss:1 laporan:2 paling:2 bisa:2 dibaca dari kode:1 detik:5 setua:1 sesudah tercatat:1",
 "tidak:1 direkam:1 tidak direkam:1",
 "tidak:1 hanya:1 kedua:1 tanpa:1 p95:2 laporan:1 direkam:1 tidak direkam:1 ms:1 di bawah:1",
 "satu:2 Asumsi:1 vCPU:1 ms:1 merchant:1 warung:1",
 "tidak:1 cache:1 polling:1 lebih:1 direkam:1 tidak direkam:1 detik:1",
 "satu:1 Asumsi:1 laporan:1 merchant:2 perangkat:1",
 "hanya:1 dua:1 Ani:1 Ilustrasi:1 pembayaran:1 detik:1 cerita:1",
 "tidak:2 belum:1 satu:1 primary:1 merchant:1 lab:1",
 "",
 "",
 "satu:1 cache:1 laporan:1",
 "",
 "tidak:1 sama:1 satu:3 dua:1 kedua:1 hit:1 TTL:1 polling:1 detik:1 merchant:2 warung:1 perangkat:1",
 "",
 "tidak:2 satu:1 dua:1 tanpa:1 primary:1 p95:1 pembayaran:1 laporan:1 direkam:1 tidak direkam:1 detik:1 warung:1",
 "satu:2 dua:1 hit:2 detik:2 warung:2",
 "",
 "",
 "",
 "laporan:1 database:1",
 "cache:1 hit:1 miss:1 TTL:1",
 "",
 "laporan:1 merchant:1",
 "belum:1 sama:1 Wulan:1 primary:1 pembayaran:1 laporan:1 database:1",
 "",
 "hanya:1 laporan:1 lab:1",
 "",
 "",
 "hanya:2 sama:1 satu:1 Tidak dijalankan:1 pembayaran:1 laporan:1 dibaca dari kode:1 lab:1",
 "",
 "tidak:1 tanpa:1 p95:1 pembayaran:2 laporan:2 ms:1 di bawah:1",
 "",
 "",
 "tidak:2 hanya:1 tetap:1 kedua:1 Asumsi:1 Hitungan:1 p95:1 CPU:1 pembayaran:1 laporan:1 direkam:1 tidak direkam:1 200:1 201:1 ms:1 detik:1",
 "",
 "tidak:1 cache:2 hit:1 detik:1",
 "",
 "",
 "tidak:1 sesudah:1 satu:1 dua:1 Hitungan:1 cache:1 hit:1 TTL:1 laporan:1 lebih:3 bisa:1 direkam:1 tidak direkam:1 detik:6 setua:1 sesudah tercatat:1 satu hit dari dua panggilan:1",
 "",
 "",
 ""
];

export const KALIMAT_TERKUNCI: string[] = [
  "import Blok from \"../../../components/Blok.astro\";",
  "import Rantai from \"../../../components/Rantai.astro\";",
  "import Snippet from \"../../../components/Snippet.astro\";",
  "import WidgetLama from \"../../../components/WidgetLama.astro\";",
  "import SkripLama from \"../../../components/SkripLama.astro\";",
  "import laporanPrimary from \"../../../../data/diagram/t5-m40-laporan-primary.json\";",
  "<p class=\"meta\">Baca 9 menit · coba 3 menit · Prasyarat: [[t5-skema]], [[t3-pool]] · Jalur inti</p>",
  "<Blok nama=\"Gejala\" buka>",
  "Minggu 2 Tahap 5. Kamis pukul 11.40 Ani menunggu dua pembayaran yang belum muncul di layar kasirnya. Di app Budi, tombol Bayar berputar 6 detik.",
  "Pada jam yang sama merchant di banyak kota membuka laporan penjualan yang baru dirilis Wulan. Laporan itu menunjukkan penjualan hari ini dan diperbarui tiap 30 detik ([[t5-prd]]).",
  "*Angka cerita (Ilustrasi):* hari, jam, dua pembayaran Ani, dan 6 detik berasal dari naskah, bukan dari rekaman. Rekaman lab tidak menghasilkan tombol Bayar yang berputar 6 detik, dan alasannya ada di blok Yang sebenarnya. Arti Ilustrasi, Rekaman lab, Asumsi, dan Tidak dijalankan ada di [[A0]].",
  "</Blok>",
  "<Blok nama=\"Yang Raka kira\" buka>",
  "Dugaan pertama tim: server kurang kuat. Pembayaran melambat tepat saat laporan dibuka, jadi mesin database terlihat kewalahan.",
  "Nadia mengusulkan jalan yang tidak butuh mesin baru: cache laporan 30 detik di Redis, seperti cache katalog di [[t3-cache]]. Cache menyimpan jawaban sementara. Panggilan yang menemukan jawaban tersimpan disebut hit dan tidak membaca database. Panggilan yang tidak menemukannya disebut miss dan membaca database.",
  "Jawaban tersimpan itu berumur 30 detik (TTL, masa berlaku entri cache). App tiap merchant memakai polling: ia menanyakan laporan ke server tiap 30 detik.",
  "<details class=\"question\">",
  "<summary>Tebak dulu: laporan hanya membaca dan tidak mengubah apa pun, tetapi pembayaran ikut melambat. Apa yang laporan dan pembayaran pakai bersama?</summary>",
  "Primary, yaitu database yang menerima semua tulisan. Laporan menjumlah baris di tabel `posting`. Tabel itu juga menerima baris baru tiap pembayaran, lewat pool koneksi yang sama (Tidak dijalankan: dibaca dari kode lab). Di lab hanya ada satu PostgreSQL, jadi kata primary berlaku menurut susunan lab.",
  "</details>",
  "Usul cache Nadia diuji di blok Coba sendiri, dengan tebakan sendiri.",
  "</Blok>",
  "<Blok nama=\"Yang sebenarnya\">",
  "Laporan menjumlah posting di primary yang sama dengan pembayaran, jadi tiap polling menambah kerja database yang menulis uang.",
  "<Rantai data={laporanPrimary} ringkas />",
  "*Kondisi rekaman:* PostgreSQL 17.11, go1.27.3, dan pgx v5.11.0, dari database bersih, dengan server `api-t5` satu proses dan satu PostgreSQL. Laporan hanya ada bila server dijalankan dengan mode `-rentan laporan-primary`. Mode itu adalah kode lab yang ditulis untuk M40, bukan salinan kode yang pernah berjalan di cerita. Tanpa mode itu rutenya dijawab 404:",
  "<Snippet file=\"labs/api-t5/output/laporan.txt\" lines=\"7:12\" title=\"Rekaman lab: labs/api-t5/output/laporan.txt, bagian A (tanpa mode rentan rute laporan tidak ada)\" />",
  "**Laporan menjumlah posting dari primary, tiap panggilan.** Budi membayar Warung 505 dua kali, Rp35.000 dan Rp12.000. Laporan warung itu lalu menjawab dua transaksi dengan total Rp47.000 (Rekaman lab, bagian A). Penjumlahan 35.000 + 12.000 = 47.000 adalah Hitungan, yaitu angka yang dihitung dari angka lain di halaman.",
  "<Snippet file=\"labs/api-t5/output/laporan.txt\" lines=\"14:30\" title=\"Rekaman lab: labs/api-t5/output/laporan.txt, bagian A (dua pembayaran Budi dan laporan Warung 505)\" />",
  "Fungsi `LaporanHariIni` di lapisan repo menjalankan satu query atas `posting` dan `buku`. Di dalam fungsi itu tidak ada ringkasan, replica, atau cache (Tidak dijalankan: dibaca dari kode):",
  "<Snippet file=\"labs/api-t5/internal/repo/t5.go\" lines=\"27:35\" lang=\"go\" title=\"Kode lab: labs/api-t5/internal/repo/t5.go baris 27 sampai 35 (query laporan atas posting)\" />",
  "**Tiga perintah SQL per permintaan.** Satu permintaan laporan yang sah, yaitu GET dengan token Bearer, menjalankan tiga perintah SQL di lab. `SesiAktif` memeriksa sesi, `Akun` membaca akun merchant, dan `LaporanHariIni` menjumlah posting. Ketiganya dibaca dari `handler.go`, `repo.go`, dan `service/t5.go`, sedangkan rekaman tidak menghitung perintah SQL (Tidak dijalankan). Cache, bila dipasang, hanya membungkus yang ketiga:",
  "<Snippet file=\"labs/api-t5/internal/service/t5.go\" lines=\"69:88\" lang=\"go\" title=\"Kode lab: labs/api-t5/internal/service/t5.go baris 69 sampai 88 (cache membungkus satu query, dibaca_dari teks tetap)\" />",
  "Field `dibaca_dari` ditulis kode sebagai teks `primary`, juga untuk jawaban dari cache. Field itu menyatakan maksud kode, bukan hasil ukuran (Tidak dijalankan: dibaca dari kode).",
  "**Polling 666,7 per detik selesai tanpa galat, dan perlambatannya tidak terekam.** Lab menjalankan pembayaran 100 per detik selama 10 detik, dua kali. Putaran pertama tanpa laporan, putaran kedua dengan laporan 666,7 per detik dari 9 warung. Pembayarannya `POST /transfers` Rp1.000 dari 200 user tiruan (Tidak dijalankan: dibaca dari `cmd/beban`).",
  "<Snippet file=\"labs/api-t5/output/laporan.txt\" lines=\"48:57\" title=\"Rekaman lab: labs/api-t5/output/laporan.txt, bagian B (pembayaran dengan dan tanpa polling laporan)\" />",
  "Kedua putaran selesai tanpa galat: 1.000 dari 1.000 pembayaran 201, dan 6.667 dari 6.667 laporan 200. Nilai p95 pembayaran ada di bawah batas lab 2.000 ms di kedua putaran (Asumsi). Selisih p95 di antara kedua putaran tidak direkam dan tidak menjadi syarat, karena bergantung pada mesin dan beban lain di laptop.",
  "Jadi rekaman tidak menunjukkan pembayaran yang melambat. Batas 2.000 ms hanya memeriksa bahwa kedua putaran tidak macet.",
  "Dua perbedaan antara lab dan produksi bisa menjelaskan kenapa perlambatan tidak terlihat (penalaran). Pertama, laporan menjumlah data satu hari dari 9 warung. Query laporan berjalan di bawah 1 ms. Hanya batasnya yang direkam (Rekaman lab, bagian A). `EXPLAIN ANALYZE` menjalankan statement dan menambahkan statistik waktu nyata ([PostgreSQL 17.11, EXPLAIN](https://www.postgresql.org/docs/17/sql-explain.html), dibuka 2026-11-02, Tidak dijalankan).",
  "Kedua, polling lab berasal dari 9 warung, yaitu 666,7 ÷ 9 = 74,1 per warung per detik (Hitungan). Di produksi, 20.000 merchant masing-masing bertanya sekali tiap 30 detik.",
  "**Di produksi, bebannya Hitungan atas Asumsi.** Masukannya berasal dari tabel beban naskah Tahap 5, dan semuanya Asumsi. Isinya 200.000 merchant ([[t5-prd]]), 10% online, polling tiap 30 detik, dan 8 vCPU. vCPU adalah satu inti CPU virtual. Satu permintaan memegang koneksi 20 ms, angka yang sama dengan [[t4-estimasi]].",
  "Transaksi uang puncak 69,4 per detik memakai tiga transaksi per user aktif per hari. Dengan dua transaksi angkanya 46,3.",
  "| Besaran | Hitungan | Hasil |",
  "|---|---|---|",
  "| Merchant online | 200.000 × 10% | 20.000 |",
  "| Laporan per detik | 20.000 ÷ 30 | 666,7 |",
  "| Dibanding transaksi uang puncak | 666,7 ÷ 69,4 | 9,6 kali |",
  "| Laporan berjalan serentak | 666,7 × 0,02 | 13,3 |",
  "| Kebutuhan CPU | 666,7 × 0,02 ÷ 8 | 167% |",
  "| Kebutuhan CPU bila 1 ms | 666,7 × 0,001 ÷ 8 | 8,3% |",
  "| Kebutuhan CPU di 16 vCPU | 666,7 × 0,02 ÷ 16 | 83% |",
  "Dengan dua transaksi per user aktif, perbandingan itu menjadi 666,7 ÷ 46,3 = 14,4 kali. Bacaan selain uang juga menahan koneksi: (1.388,9 − 69,4) × 0,02 = 26,4 koneksi, 528% dari pemicu read replica di [[t4-adr-45]] yang 5 koneksi. Dengan dua transaksi hasilnya 26,9 koneksi (Hitungan atas Asumsi).",
  "Laporan sendirian memakai seluruh 8 vCPU bila satu permintaan memakai 8 ÷ 666,7 = 0,0120 detik CPU, yaitu 12 ms. Di atas 12 ms, laporan meminta lebih dari yang dimiliki mesin, dan pembayaran berebut CPU dengan laporan (penalaran; rekaman tidak mengukurnya).",
  "Angka 167% memakai 20 ms sebagai waktu CPU. Lama memegang koneksi juga mencakup menunggu disk atau lock, jadi untuk 20 ms itu 167% adalah batas atas (penalaran). Rekaman membatasi satu query laporan di bawah 1 ms pada data kecil. Seluruh perlambatan di cerita bergantung pada 20 ms yang tidak diukur.",
  "Menambah CPU memindahkan batas itu: 16 vCPU memberi 83%. Tetapi 666,7 naik sebanding dengan merchant online (online ÷ 30), dan bebannya tetap di mesin yang menulis uang. Cara lain melayani laporan ditimbang di [[t5-read-replica]].",
  "**Cache 30 detik punya dua masalah yang terpisah.** Yang pertama soal hit. Lab menyalakan cache Redis dengan TTL 30 detik dan memanggil laporan 9 warung, satu client per warung, dalam dua putaran berjarak 30,5 detik.",
  "<Snippet file=\"labs/api-t5/output/laporan.txt\" lines=\"60:66\" title=\"Rekaman lab: labs/api-t5/output/laporan.txt, bagian C (cache 30 detik dan kontrol dua client)\" />",
  "Hasilnya 0 hit, 18 miss, dan 18 pembacaan database. Kontrol dengan dua client per warung dalam satu jendela TTL menghasilkan 9 hit dari 18, jadi cache bekerja. Yang kurang adalah panggilan kedua dalam jendela itu. Jumlah hit dibaca dari pencacah server, bukan dari waktu.",
  "Jarak 30,5 detik lebih panjang dari TTL 30 detik, jadi 0 hit memang diharapkan. Jarak 30 detik atau lebih pendek tidak direkam. Bila jarak satu perangkat 29 detik, panggilan kedua mendapat hit. Panggilan ketiga tidak, karena hit tidak memperpanjang umur isi: ia datang 29 + 29 = 58 detik sesudah isi dibuat, jauh di atas 30 (Hitungan).",
  "Kode lab membaca kunci dengan `GET`, dan menyimpannya dengan `SET` berumur TTL hanya saat miss. Dokumentasi Redis menulis bahwa timeout hanya dihapus perintah yang menghapus atau menimpa isi kunci. Halaman sumbernya, [Redis, EXPIRE](https://redis.io/docs/latest/commands/expire/), berversi latest tanpa nomor dan dibuka 2026-11-02 (Tidak dijalankan). `GET` membaca tanpa menimpa isinya, jadi hit tidak memperpanjang umur isi. Hasil terbaik satu hit dari dua panggilan (penalaran, tidak direkam).",
  "Hit juga hanya melewati `LaporanHariIni`. Pemeriksaan sesi dan `Akun` tetap membaca database di tiap panggilan (Tidak dijalankan: dibaca dari kode). Pencacah \"baca database\" tidak menghitung dua perintah itu.",
  "**Masalah kedua tidak bergantung pada hit.** Cache 30 detik membuat laporan bisa setua 30 detik, karena hit mengembalikan isi yang disimpan saat miss (Tidak dijalankan: dibaca dari kode). PRD v5 menulis data laporan tertinggal paling lama 5 detik dan penjualan baru terlihat paling lambat 35 detik, yaitu 30 + 5 ([[t5-prd]]; Asumsi produk). Dengan cache, penjualan baru bisa terlihat 30 + 30 = 60 detik sesudah tercatat (Hitungan atas Asumsi produk).",
  "**Yang tidak direkam.**",
  "- Pembayaran yang melambat: selisih p95 dengan dan tanpa laporan tidak direkam. Yang terekam hanya p95 di bawah 2.000 ms di kedua putaran.",
  "- 20.000 merchant online, 20 ms, dan 8 vCPU adalah Asumsi. Lab memakai 9 warung, data satu hari, dan satu laptop.",
  "- Jarak polling 30 detik atau lebih pendek ke cache tidak direkam.",
  "- Naskah menulis satu perangkat per merchant, padahal laporan tampil di app Merchant dan di dasbor web. Jumlah layar per merchant adalah Asumsi.",
  "- Tombol Bayar 6 detik, hari, jam, dan dua pembayaran Ani hanya ada di cerita (Ilustrasi).",
  "- Replica tidak dipakai di lab `api-t5`, dan tidak ada kode di folder itu yang mengisi tabel `ringkasan_merchant_harian`. Kapasitas satu primary belum diukur: `make beban` memberi batas di laptop ([[t5-prd]]).",
  "</Blok>",
  "<Blok nama=\"Coba sendiri\">",
  "Widget ini mengikuti rekaman `laporan.txt` bagian A sampai C, dengan satu varian dari bagian C. Tebak dulu berapa dari 18 panggilan yang menemukan isinya di cache, lalu tekan Berikutnya atau panah kanan.",
  "<WidgetLama nama=\"alur\" src=\"data/skenario/t5-m40.json\" />",
  "Sesudah langkah terakhir, centang **Ubah satu hal: dua client untuk tiap warung dalam satu jendela TTL**. Hasilnya 9 hit dari 18. Cache menolong bila ada panggilan kedua dalam 30 detik untuk merchant yang sama, dan polling satu perangkat per merchant tidak punya panggilan itu.",
  "<noscript>",
  "Tanpa JavaScript, tebakan dan kotak Ubah satu hal tidak tersedia. Hasilnya: laporan Warung 505 dijawab dari primary dengan dua transaksi dan total Rp47.000. Polling 666,7 per detik dari 9 warung selesai tanpa galat, dan selisih p95 pembayaran tidak direkam.",
  "Cache 30 detik dengan satu client per warung dan jarak 30,5 detik menghasilkan 0 hit dari 18. Dengan dua client per warung dalam satu jendela, hasilnya 9 hit dari 18. Rekamannya ada di cuplikan pada blok sebelumnya.",
  "</noscript>",
  "</Blok>",
  "<Blok nama=\"Konsep yang lahir\">",
  "- [[t5-read-replica]]: salinan database yang melayani bacaan, dan model baca untuk laporan. Keputusannya ADR 46.",
  "- [[t3-cache]]: cache-aside, hit, miss, dan TTL, termasuk batas cache untuk angka yang menggerakkan uang.",
  "- [[t3-pool]]: laju kali lama, yang dipakai untuk menghitung permintaan berjalan serentak.",
  "- [[t5-skema]]: tabel yang lahir di Tahap 5, termasuk `ringkasan_merchant_harian` untuk laporan periode.",
  "Laporan yang dibaca dari primary menambah kerja mesin yang menulis uang. Rekaman membuktikan jalurnya, dan hitungan memperkirakan bebannya. Jawaban atas pertanyaan Wulan, siapa yang melambat bila laporan dan pembayaran membaca database yang sama, bergantung pada angka yang belum diukur.",
  "### Cek diri",
  "**1.** Pembayaran ikut melambat padahal laporan hanya membaca. Apa yang keduanya pakai bersama di lab, dan dari mana kamu tahu?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Primary. Fungsi `LaporanHariIni` menjumlah baris `posting` lewat pool koneksi yang sama dengan pembayaran, dan di lab hanya ada satu PostgreSQL (Tidak dijalankan: dibaca dari kode). Rekaman bagian A menunjukkan rute laporan hanya ada bersama mode `laporan-primary`.",
  "</details>",
  "**2.** Di rekaman bagian B, p95 pembayaran di bawah 2.000 ms dengan dan tanpa laporan. Apakah itu membuktikan laporan tidak memperlambat pembayaran?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Tidak. Batas 2.000 ms hanya memeriksa bahwa kedua putaran tidak macet, dan selisih p95 tidak direkam. Yang terekam: 1.000 dari 1.000 pembayaran 201 dan 6.667 dari 6.667 laporan 200. Angka 666,7 per detik dan 167% CPU tetap Hitungan atas Asumsi.",
  "</details>",
  "**3.** Rekaman cache menghasilkan 0 hit dari 18. Apa yang tidak dijawab rekaman itu, dan alasan lain apa yang membuat cache 30 detik bermasalah?",
  "<details class=\"success\">",
  "<summary>Jawaban</summary>",
  "Rekaman memakai jarak 30,5 detik, lebih panjang dari TTL 30 detik. Jarak 30 detik atau lebih pendek tidak direkam, dan hasil terbaiknya satu hit dari dua panggilan (Hitungan). Alasan lain: cache membuat laporan bisa setua 30 detik. Penjualan lalu terlihat 30 + 30 = 60 detik sesudah tercatat, lebih lambat dari 35 detik di PRD v5.",
  "</details>",
  "</Blok>",
  "<SkripLama daftar={[\"hp\",\"alur-core\",\"alur\"]} />",
];
