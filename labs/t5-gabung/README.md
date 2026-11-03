# Lab t5-gabung · skor risiko dalam satu proses lawan tiga proses dengan queue

Lab Tahap 5 untuk ADR 50, bagian kapan menggabungkan kembali (naskah `plan/CERITA-TAHAP-5.md` bagian 3 dan 4; sumber halaman 5.13). Ia menjalankan satu alur yang sama dengan dua cara. Alurnya: baca data akun, baca data perangkat, baca riwayat transaksi akun, lalu hitung skor risiko dengan aturan poin sederhana. Cara pertama menjalankannya dalam satu proses. Cara kedua memecahnya jadi tiga proses (masuk, perangkat, riwayat) yang saling meneruskan pesan lewat broker queue tiruan.

**Skor risiko di lab ini peraga, bukan fitur PRD v5 dan bukan model risiko.** Aturannya delapan kode alasan dengan poin bilangan bulat (`skor/skor.go`). Lab tidak mengklaim bahwa skor produksi cocok dipecah atau digabung. Yang diperagakan hanya satu hal: apa yang berubah dalam jumlah panggilan jaringan, byte, p95, dan keadaan gagal ketika satu alur pendek dipecah jadi tiga proses.

Lab ini berdiri sendiri: satu modul Go (`lab/t5gabung`, pustaka standar saja), satu penggerak Python (hanya pustaka standar), tanpa Docker, tanpa PostgreSQL, tanpa Redis. Tidak ada yang diubah di `labs/api-t5` atau lab lain. Data akun, perangkat, dan riwayat dibangkitkan dari benih tetap dan disimpan di memori tiap proses.

## Versi

| Komponen | Versi | Catatan |
| --- | --- | --- |
| Go | 1.27.3 | `go.mod` memakai `go 1.27.3`; `go` di lab ini memilih toolchain 1.27.3 dari cache modul lokal (`GOTOOLCHAIN=auto`), tanpa unduhan baru. Kepala rekaman menulis versi yang dipakai |
| Python | 3.14.2 | hanya pustaka standar (`labs/.venv` dipakai bila ada, `python3` bila tidak) |
| Dependency | tidak ada | `go.mod` tanpa `require`; tidak ada paket Go dari luar |

Gerbang pemindai kerentanan ADR 44 (govulncheck, grype) **Tidak dijalankan** di lab ini: ia butuh unduhan alat dan basis data kerentanan yang tidak termasuk izin tugas ini. Apakah Go 1.27.3 menutup temuan stdlib yang membuat `api-t4` gagal di Go 1.27.1 belum diperiksa di sini.

gosec v2.29.0 di komputer pengembang dibangun dengan Go 1.27.1 dan tidak bisa membaca data ekspor pustaka Go 1.27.3: atas folder lab ia menulis "package has type errors, skipping SSA analysis" dan melapor 0 temuan tanpa menganalisis apa pun, jadi hasil itu tidak dipakai. Atas salinan dengan `go 1.27.1` di `go.mod` (toolchain lokal) ia membaca 6 file dan menemukan 2 temuan G115 di `skor/data.go` (konversi `uint64` dan `int` pada pembangkit acak). Semua pemanggilnya memakai konstanta positif (paling besar 86.400), jadi keduanya tidak dapat meluap di lab ini. Hasil ini pengamatan peninjau PR, tidak masuk `output/`.

## Isi lab

| File | Isi |
| --- | --- |
| `skor/` | `Hitung` (aturan poin, ambang 40 dan 70), tiga data (`TokoAkun`, `TokoPerangkat`, `TokoRiwayat`) dari benih tetap, `Toko` yang memegang ketiganya, dan `Transaksi(i)` yang menentukan transaksi dari nomornya |
| `antrean/` | broker queue tiruan (satu channel per topik, kapasitas 1.024 pesan per topik, penuh dijawab 503; jumlah topik tidak dibatasi dan isi satu pesan sampai 1 MiB, jadi memori broker tidak berbatas; `run.py` memulainya hanya di 127.0.0.1; jeda buatan per panggilan, penghitung) dan client kecilnya (penghitung panggilan dan byte) |
| `layanan/` | `Satu` (versi satu proses), `Masuk`, dan `Tahap` untuk proses perangkat dan riwayat (versi tiga proses); pesan membawa hitungan panggilannya sendiri |
| `cmd/gabung` | satu biner: `satu`, `antrean`, `masuk`, `perangkat`, `riwayat`, dan `beban` (penggerak berurutan yang mencetak p50, p95, dan hasil tiap transaksi) |
| `run.py` | penggerak rekaman: memulai proses, menjalankan beban, memeriksa hasil terhadap batas, menulis `output/` |
| `output/` | `panggilan.txt`, `latensi.txt`, `mati.txt`, `testing.txt` |

## Keputusan desain

- **Bentuk pembagian: rantai tiga proses lewat queue.** Proses `masuk` menerima permintaan, membaca data akun, dan mengirim ke queue perangkat. Proses `perangkat` menambah fitur perangkat dan mengirim ke queue riwayat. Proses `riwayat` menambah fitur riwayat, menghitung skor, dan mengirim hasil ke queue hasil. Proses `masuk` menunggu hasil itu untuk menjawab client. Satu transaksi melewati enam panggilan antar proses: kirim, ambil, kirim, ambil, kirim, ambil. Proses yang berjalan: tiga layanan dan satu broker, jadi empat. Bentuk lain (satu pemanggil yang memanggil tiga service sekaligus tanpa queue) **Tidak dijalankan**: jumlah panggilannya dan p95-nya berbeda, jadi kalimat di halaman berlaku untuk rantai ini saja.
- **Hitungan panggilan berasal dari penghitung di kode, bukan tulisan tangan.** Pesan membawa `Panggilan`, yang bertambah di dua fungsi saja (`kirim` dan `terima`). Dua penghitung lain berdiri sendiri: penghitung client di tiap proses dan penghitung sisi penerima di broker. Lab gagal bila ketiganya berbeda atau bila hasilnya bukan enam per transaksi. Satu proses tidak memanggil `kirim` atau `terima`, jadi pesannya tetap 0 dan prosesnya tidak punya client queue. Panggilan dari client ke pintu masuk (satu POST per transaksi) sama di kedua versi dan tidak dihitung. `Ambil` yang habis waktu tanpa pesan juga tidak dihitung: jumlahnya bergantung pada waktu tunggu. `run.py` menunggu sampai broker mencatat satu ambil kosong di jendela hitungan (kejadian, bukan jeda tetap), lalu memeriksa bahwa hitungan client dan broker tetap tepat; jumlahnya tidak ditulis.
- **Dua versi harus menghasilkan skor yang sama persis.** Perbandingan waktu tidak berarti bila hasilnya berbeda. Lab membandingkan id, skor, keputusan, dan kode alasan tiap transaksi, dan data peraga menghasilkan ketiga keputusan dan kedelapan aturan (diperiksa tes Go).
- **Jeda per panggilan adalah jeda buatan (Asumsi).** Broker menunda tiap panggilan yang membawa pesan sebesar `hop_ms` sebelum pesan terlihat (kirim) atau sebelum diserahkan (ambil). Jeda ini memerankan waktu tempuh satu panggilan antar host. Lab tidak mengukur jaringan antar host: 0, 2, 4, dan 10 ms dipilih untuk memperlihatkan di mana anggaran 50 ms habis, bukan karena itu angka jaringan nyata.
- **p95 dibandingkan sebagai rasio dengan batas.** Tiap kondisi dijalankan 5 putaran bergantian (satu proses, lalu tiga proses), 100 transaksi berurutan per putaran dan 20 pemanasan yang tidak diukur. p95 memakai nearest-rank per putaran, dan yang dibandingkan adalah median dari 5 p95 tiap versi. Lab hanya memeriksa dua hal: p95 tiga proses paling sedikit 6 × jeda (`time.Sleep` tidak pernah kembali sebelum durasinya lewat, dibaca dari `go doc time.Sleep` toolchain 1.27.3) dan rasio p95 paling kecil batas longgar (2 pada jeda 0, 10 pada jeda lain). Batas atas p95 tidak diperiksa, kecuali p95 satu proses di bawah 50 ms.
- **Anggaran 50 ms di lab ini adalah anggaran satu alur skor**, seperti tertulis di tugas dan naskah tabel lab. Ia bukan batas satu lompatan HTTP ke ledger yang jadi pemicu gRPC di ADR 45 (tabel di naskah bagian 3 memakai angka yang sama untuk dua hal berbeda).
- **Broker tiruan tidak persisten dan tidak mengonfirmasi penerimaan.** Pesan hidup di memori broker. Pesan yang sudah diambil lalu penerimanya mati sebelum selesai hilang. Pesan yang belum diambil menunggu sampai pemrosesnya hidup lagi (diperagakan di `mati.txt`). Queue produk punya konfirmasi, penyimpanan, dan pengiriman ulang: **Tidak dijalankan**.

## Menjalankan

```
make -C labs/t5-gabung run                      # empat bagian berurutan, ±80 detik
make -C labs/t5-gabung run BAGIAN=panggilan     # satu bagian: panggilan latensi mati testing
make -C labs/t5-gabung cek                      # rekam ulang, lalu output/ harus identik dengan yang di-commit
make -C labs/t5-gabung test                     # go vet dan go test
```

Butuh Go. Tanpa Docker dan tanpa unduhan. Port dasar 18340 (broker), 18341 (satu proses), 18342 (masuk), 18343 (perangkat), 18344 (riwayat), ditambah `LAB_PORT_OFFSET`; `tools/cek_port_lab.py` menjaga tidak ada port yang tertulis tetap. Proses lab dihentikan per PID oleh `run.py`, dan PID tercatat di folder sementara di luar repo (`t5-gabung-<LAB_PORT_OFFSET>`) supaya sisa dari run yang mati bisa dibersihkan run berikutnya. Port sementara host bisa habis oleh TIME_WAIT dari proses lain (`can't assign requested address`): penggerak beban dan `run.py` mengulang sambungan yang gagal dibuat (bukan permintaan yang sudah terkirim) sampai enam kali.

## Rekaman

| File | Isi |
| --- | --- |
| `output/panggilan.txt` | A: yang dijalankan. B: panggilan antar proses per transaksi (0 lawan 6), penghitung client tiap proses dan broker. C: hasil skor sama persis di 400 transaksi. D: byte isi pesan |
| `output/latensi.txt` | A: hasil pemeriksaan p95 terhadap batas bawah dan rasio pada jeda 0, 2, 4, dan 10 ms. B: anggaran 50 ms (50 ÷ 6 = 8,33 ms per panggilan) |
| `output/mati.txt` | proses riwayat mati: permintaan 504 setelah batas tunggu, satu pesan tertinggal di queue, satu proses tetap menjawab, pesan lama diproses saat proses hidup lagi |
| `output/testing.txt` | `go vet` dan tes Go |

Rekaman dibuat dari proses baru, diulang dan identik per byte, juga di bawah beban CPU (20 proses sibuk, load average ±26). Waktu dan p95 bergantung mesin: rekaman menulis hasil pemeriksaan terhadap batas, bukan angkanya. Angkanya dicetak ke layar saat `run.py` jalan.

## Yang terbaca dari rekaman

- **Satu proses: 0 panggilan antar proses per transaksi. Tiga proses dengan queue: 6**, dari 400 transaksi masing-masing. Tiga penghitung (pesan, client tiap proses, broker) sama. Hitungan ini berlaku untuk rantai ini. Satu tahap tambahan menambah satu kirim dan satu ambil per transaksi (Hitungan, tidak direkam).
- **Hasilnya sama persis.** Perbedaan di bawah ini adalah harga arsitektur, bukan perbedaan hasil.
- **Byte isi pesan:** tiga proses mengirim ±620 byte dan menerima ±620 byte per transaksi (nilai tepat di `panggilan.txt`, JSON tanpa header HTTP), satu proses 0. Isi pesan kecil karena tiap proses mengirim fitur yang sudah diringkas, bukan baris riwayat. Lab ini tidak memperagakan komponen yang bertukar data besar: kalimat itu di halaman butuh sumber lain (kasus industri), bukan rekaman ini.
- **p95: rasio tiga proses terhadap satu proses lebih besar dari 1 pada semua jeda**, dan pada jeda 0 ms paling sedikit 2. Penyebabnya kerja tambahan tiga proses (enam panggilan HTTP di loopback, serialisasi JSON, perpindahan goroutine); lab tidak memprofil bagian terbesarnya. Dengan jeda buatan p95 tiga proses naik mengikuti 6 × jeda, jadi rasio mengukur jumlah panggilan dikali jeda dan tidak mengukur kecepatan jaringan nyata.
- **Anggaran 50 ms (Hitungan atas Asumsi jeda):** dibagi enam panggilan, anggaran habis pada jeda 8,33 ms per panggilan. Pada jeda 10 ms semua transaksi tiga proses (500 dari 500) melewati 50 ms karena batas bawahnya 60 ms, sedangkan p95 satu proses tetap di bawah 50 ms.
- **Proses riwayat mati (SIGTERM saat proses itu menganggur):** satu proses tetap menjawab, tiga proses menjawab 504 sesudah batas tunggu. Pesan yang sedang berjalan tertinggal di queue dan diproses saat riwayat hidup lagi. Hasilnya sampai ke proses masuk tanpa penunggu karena permintaannya sudah dijawab 504. Skor di lab ini tidak punya efek samping. Alur yang menggerakkan uang perlu penanganan sendiri untuk pesan yang diproses terlambat dan permintaan yang diulang; lab ini tidak memperagakannya.

### Pengamatan satu mesin (tidak direkam, bukan sumber angka halaman)

Empat kali `run.py latensi` di Apple M4 (10 inti, macOS), tiga kali tanpa beban tambahan dari lab ini dan satu kali di bawah 20 proses sibuk (mesin dipakai lajur kerja lain di semua run, load average ±10 sebelum beban tambahan): p95 satu proses 0,09 sampai 0,22 ms; p95 tiga proses pada jeda 0 ms 0,48 sampai 1,07 ms (rasio 3,9 sampai 5,3); pada jeda 2 ms 15,2 sampai 27,2 ms; pada jeda 4 ms 29,2 sampai 42,6 ms; pada jeda 10 ms 71,7 sampai 79,5 ms. Selisih p95 dan batas bawah 6 × jeda membagi enam menjadi ±0,5 sampai 3 ms per panggilan (p95 lebih besar dari rata-rata, jadi ini batas atas keterlambatan `time.Sleep`), dan satu putaran pada jeda 4 ms sempat melewati 50 ms. Karena itu batas atas p95 tidak diperiksa lab.

## Selisih dengan naskah (lab yang benar)

- Naskah menulis "tiga proses dengan queue" tanpa menyebut broker. Lab menjalankan tiga proses layanan dan satu broker queue tiruan (empat proses). Halaman yang menulis "tiga proses" menyebut broker di sebelahnya.
- Naskah menulis "anggaran 50 ms" untuk alur skor di tabel lab, dan "p95 satu lompatan HTTP melewati 50 ms antar host" untuk pemicu gRPC (ADR 45). Dua besaran berbeda dengan angka sama. Lab hanya memakai yang pertama.
- Naskah menulis "p95 diukur sebagai rasio, bukan nilai mutlak". Lab merekam rasio sebagai batas (paling kecil 2 pada jeda 0, 10 pada jeda lain) dan tidak menulis nilai rasionya, karena nilainya bergantung mesin dan jeda buatan.
- Naskah ADR 50 memakai Prime Video sebagai kasus industri. Lab ini bukan reproduksi kasus itu: skor risiko hanya padanan dengan label Ilustrasi (baris riset kasus industri), dan tidak membuktikan bahwa komponen yang bertukar data besar rugi bila dipisah.

## Tidak dijalankan atau belum ada

Jaringan antar host (semua panggilan di loopback; jeda antar host adalah jeda buatan), broker queue produk (konfirmasi, persistensi, pengiriman ulang, consumer group), bentuk pembagian lain (satu pemanggil yang memanggil tiga service paralel, atau tiga service dengan database sendiri), beban serentak (penggerak mengirim satu transaksi pada satu waktu, jadi p95 di sini adalah latensi satu transaksi tanpa queue di depan pemrosesnya), pembacaan data dari database (data di memori di kedua versi), skor produksi, govulncheck dan grype (alat dan basis data tidak diunduh), dan kegagalan broker.

## Uji mutasi

Tabel hasil ada di badan PR. Tiap mutan mengubah satu hal (satu penghitung, satu panggilan, satu jeda, satu aturan skor), dijalankan dengan `go test ./...` dan, bila perlu, bagian lab yang relevan. Tiap mutan harus gagal karena sebab yang diuji, bukan karena proses tidak mau mulai. File dikembalikan sesudahnya dengan `git show HEAD:<path>`.
