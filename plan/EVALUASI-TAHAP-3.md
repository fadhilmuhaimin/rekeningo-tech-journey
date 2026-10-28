# Evaluasi Tahap 3 · Enam kota

Dievaluasi 2026-10-28 sampai 2026-10-29 oleh subagent evaluasi (skill evaluasi-tahap) yang tidak menulis satu pun halaman Tahap 3. Seed acak: 3. Putaran: 1 (bagian lain di bawah) dan 2 (bagian "Putaran 2" di akhir file).

Dasar yang dievaluasi: `origin/main` c7fdcba5 (merge #414, halaman 3.32), 32 halaman 3.1 sampai 3.32; commit sesudahnya (c7005c07, #417) hanya mengubah `plan/`. Skill lain yang dipakai: analisis-kritis (bukti yang bisa diulang, tiga klaim dicek ke sumber primer), gaya-bahasa (teks dokumen ini dan pemeriksaan label), riset-tahap (jejak klaim). Nomor keputusan: 1128 sampai 1131.

## Kartu nilai

W1 sampai W4 wajib YA. Tiga dari empat YA. W3 TIDAK karena satu kalimat di dalam adegan 3.16, dan W5 TIDAK seperti di Tahap 2.

| Butir | Hasil | Bukti (perintah → keluaran, PR, tangkapan) |
| --- | --- | --- |
| W1 | YA | `python3 tools/eval_tahap.py peta 3` → "naskah 32 halaman, registry 32 halaman", "halaman bercatatan: 0", 0 halaman "segera", 0 selisih nomor, bintang, atau lab; judul registry sama dengan judul naskah di 32 dari 32 (dibandingkan terpisah, karena `peta` hanya mencetaknya). Gerbang penuh `PORT_PREVIEW=4326 bash tools/cek_situs.sh --layar` di c7fdcba5 → "semua pemeriksaan lolos", ±37 menit (`tmp/cek.txt`, 1.833 baris). `gh run list --branch main --workflow cek` → run 40685895620 (merge #414) dan 40687071298 (merge #417) success. 32 PR halaman MERGED, masing-masing dengan 11 check SUCCESS dan 0 selain itu (bagian "Daftar PR halaman") |
| W2 | YA | 23 angka dan status dari 6 halaman (seed 3) ditelusuri ke baris rekaman, 0 tanpa rekaman atau label (bagian "Telusur angka W2"). Delapan lab diulang dari database bersih di lajur `rjt-konten3` (kontainer `rjt-konten3-db-1`, port 54533): `make -C labs/<lab> cek` untuk t3-outbox, t3-offline, t3-instance, t3-pool, t3-dasbor, t3-mitm, t3-cache, dan api-t3 → exit 0 semuanya, `git status labs` kosong. 107 persamaan di 32 halaman dihitung ulang mesin: 0 salah hitung. Label diperiksa terhadap definisi gaya-bahasa di 6 tempat: 5 sesuai, 1 sebagian (bukan salah) |
| W3 | TIDAK | `python3 tools/audit_bahasa.py --check` → "335 file · 0 error · 285 peringatan"; Tahap 3 saja → "32 file · 0 error · 12 peringatan". `python3 tools/eval_tahap.py gejala 3` → exit 1: 10 dari 11 blok Gejala hanya berisi kejadian dan dialog, dan 3.16 menulis "Pemeriksaan password adalah saat server membandingkan password dengan hash yang tersimpan" di dalam adegan. Itu definisi istilah di adegan, yang gaya-bahasa larang. Enam halaman seed 3 (3.14, 3.26, 3.24, 3.12, 3.22, 3.16) dan lima halaman masalah lain dibaca tangan; hanya 3.16 melanggar. Tugas perbaikan EVAL3-F1 |
| W4 | YA | `layar.mjs` di gerbang → "LOLOS: 0 gagal, 0 margin tipis" (1366×768 dan 1366×657) dan "0 gagal, 1 margin tipis" (375×812 dan 375×667); 19 dari 32 halaman Tahap 3 terukur (76 pengukuran), margin terkecil 22 px (3.5 di 1366×657), 13 tanpa Inti dicetak "info" (3.1, 3.6, 3.10, 3.12, 3.14, 3.16, 3.18, 3.20, 3.22, 3.24, 3.26, 3.28, 3.32). Satu margin tipis (13 px di 375×667) milik `/tahap-2/job-rekonsiliasi/`, bukan Tahap 3. `python3 tools/contrast.py` → "889/889 lolos" dua mode. axe-core 4.14.0 (`wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`): `node tools/ukur-axe.mjs --url http://127.0.0.1:4326 --semua --awalan /tahap-3/` → "uji diri 4/4 lolos; 32 halaman × 2 ukuran × 2 tema = 128 run; 0 halaman berpelanggaran; incomplete untuk dicek manusia: color-contrast 2272", 51,7 detik. Keyboard saja: `node tools/eval-keyboard.mjs` di 3.16 dan 3.9 → stop pertama "Lewati ke konten", Berikutnya halaman tercapai (101 dan 255 Tab di 375×667; 290 dan 443 di 1366×657), tanpa tanda fokus 0, kontrol terlewat 0; `--uji-diri` → alat melihat stop tanpa tanda fokus saat tanda fokus dimatikan |
| W5 | TIDAK | `python3 tools/eval_tahap.py coba 3`, `bocor 3`, dan hitungan kontrol di DOM sesudah hidrasi (bagian "Lampiran W5"): dari 30 halaman dengan blok Coba, 23 punya tebakan lalu satu masukan yang bisa diubah. 3.31 (rekap, kartu tebak lalu buka) dan 3.2 (pilah) tidak punya masukan "ubah satu hal", sama seperti 2.32 dan 2.2. Lima halaman lain (3.7, 3.27 pilah; 3.21, 3.25, 3.30 Tebak) menulis "Ubah satu hal" sebagai prosa yang bertaut ke rekaman, bukan kontrol. `bocor 3` → 3 halaman masalah (3.18, 3.20, 3.24) dengan angka jawaban tebakan di teks sebelum blok Coba; dicatat saja (hasil-dulu adalah desain pemilik) |
| W6 | YA | `python3 tools/eval_tahap.py adr 3` → 12 ADR (ADR 22 sampai 33): 11 punya 4 atau 5 opsi dan ADR 32 punya 3, semuanya `pre-mortem True (3 penyebab)`, `kapan salah True`, 8 sampai 25 tautan sumber di halamannya. Perintah itu kini menghitung penyebab pre-mortem (keputusan 1128). Daftar di bagian "Lampiran W6". Tiga klaim dicek ke sumber primer 2026-10-28: RFC 6797 (7.2, 8.1.1, 14.6) di 3.25, dokumentasi PostgreSQL 17 SELECT (SKIP LOCKED) di 3.11, dan draft IETF Idempotency-Key revisi -08 bagian 2.3 di 3.21. Ketiganya cocok |
| W7 | YA | `python3 tools/erd.py --cek` → "lolos: Tahap 1 5 tabel, Tahap 2 8 tabel, Tahap 3 14 tabel; hash sumber cocok". `labs/.venv/bin/python tools/erd.py --tahap 3` dari PostgreSQL lajur → "14 tabel, 20 foreign key, PostgreSQL 17; tidak berubah situs/data/erd/tahap-3.json; pembanding identik (16 file)"; Tahap 2 juga tidak berubah (8 tabel, 11 foreign key). 3.5 memuat `<ErdHalaman id="erd-t3" tahap={[2, 3]} />`; `ukur-erd` di gerbang → "Tahap 3 bandingkan → berdampingan, 22 node, 31 edge, 6 baru, 2 berubah, 0 dihapus, 0 di luar wadah" di 1366×657 dan "bertumpuk" di 375×667 |
| W8 | YA | `python3 tools/eval_tahap.py rantai 3` → 32 langkah dari 3.1 sampai 3.32, semuanya 200, tautan akhir blok sama dengan tombol, 0 tautan hilang; 3.32 → `/cerita/tahap-4/` ("Tahap 4 · Ceritanya", `diganti_oleh` t4-prd yang masih "segera", jadi belum halaman lama menurut aturan keputusan 1150). `rantai 2` → 2.33 sekarang menuju `/tahap-3/prd-v3/` (3.1). `python3 tools/cek_tautan.py` di gerbang → "234 HTML: 45135 tautan internal ... rusak: 0 path, 0 anchor". Rantai Tahap 3 kini ikut gerbang, bersama uji dirinya (keputusan 1129) |

## Daftar PR halaman

| Halaman | PR | Halaman | PR | Halaman | PR |
| --- | --- | --- | --- | --- | --- |
| 3.1 | #364 | 3.12 | #378 | 3.23 | #399 |
| 3.2 | #365 | 3.13 | #381 | 3.24 | #400 |
| 3.3 | #366 | 3.14 | #382 | 3.25 | #403 |
| 3.4 | #368 | 3.15 | #383 | 3.26 | #404 |
| 3.5 | #369 | 3.16 | #386 | 3.27 | #406 |
| 3.6 | #370 | 3.17 | #385 | 3.28 | #408 |
| 3.7 | #371 | 3.18 | #389 | 3.29 | #407 |
| 3.8 | #372 | 3.19 | #391 | 3.30 | #411 |
| 3.9 | #374 | 3.20 | #390 | 3.31 | #413 |
| 3.10 | #375 | 3.21 | #393 | 3.32 | #414 |
| 3.11 | #376 | 3.22 | #397 | | |

Sumber: `gh pr list --state merged --search "head:tahap-3/"` (cabang `tahap-3/<halaman>`) dan `gh pr view <n> --json state,statusCheckRollup` (`tmp/e3-ci.txt`). Ada 32 PR halaman, bukan 33: rentang di brief tugas memuat #367, yang PR catatan (`catat/batch17`), bukan halaman Tahap 3. Halaman 3.16 merge sesudah 3.17, 3.19 sesudah 3.20, dan 3.28 sesudah 3.29; PR pertama (#364) merge 2026-10-26 03.23 UTC dan PR terakhir (#414) 2026-10-28 12.12 UTC. Lab Tahap 3 punya PR sendiri (#340, #342, #343, #345, #347, #348, #349, #355), begitu juga ERD3 (#344) dan widget (#352, #354, #358).

## Telusur angka W2

Halaman dipilih dengan seed 3 dari halaman Tahap 3 yang punya lab: `python3 -c "import json,random; h=[x for x in json.load(open('situs/data/cerita.json'))['halaman'] if x.get('tahap')==3 and x.get('nomor') and x.get('lab')]; random.seed(3); print([x['nomor'] for x in random.sample(h,6)])"` → 3.10, 3.21, 3.20, 3.7, 3.14, 3.22. (Perintah di skill memakai `id` yang diawali "N."; di registry sekarang `id` berbentuk `t3-prd`, jadi hasilnya kosong. Lihat Pelajaran 1.)

| Halaman | Angka atau status di halaman | Rekaman |
| --- | --- | --- |
| 3.10 | HP Citra (token tiruan-504) menerima 1 pesan, baris Budi `menunggu` sesudah 1,5 detik | `labs/t3-outbox/output/kursor.txt:44-45` |
| 3.10 | Saldo Citra naik Rp50.000 | `labs/t3-outbox/output/kursor.txt:39-42` |
| 3.10 | Nomor outbox 1 dan 2 dengan urutan dibuat 1 dan 2 (bagian A), lalu terbalik 2 dan 1 (bagian B) | `labs/t3-outbox/output/kursor.txt:17-21`, `:33-37` |
| 3.10 | Poller selang 20 ms; bagian D paling banyak 10 pasang, jumlah yang dipakai tidak direkam | `labs/t3-outbox/output/kursor.txt:5`, `:60-61` |
| 3.10 | Nomor 2 terpakai baris yang di-ROLLBACK, baris berikutnya bernomor 3 | `labs/t3-outbox/output/listen.txt:14`, `:22-25` |
| 3.20 | Jumat: stok 0, versi 2. Sabtu: PATCH stok 30, versi 3. Senin, 62 jam sesudah Jumat: jawaban 200, stok 0, versi 4 | `labs/t3-offline/output/m24.txt:19`, `:30-34`, `:62-66` |
| 3.20 | Pengiriman ulang 17 jam: jawaban lama stok 0 versi 2, database stok 50 versi 3 | `labs/t3-offline/output/m24.txt:47-53` |
| 3.21 | Sesudah 62 jam job `-bersih` membuang 0 operasi, sesudah 15 hari membuang 2 | `labs/t3-offline/output/sinkron14.txt:16`, `:69` |
| 3.21 | Umur operasi 6 hari 23 jam diterima, 7 hari 1 jam ditolak 422 | `labs/t3-offline/output/sinkron14.txt:28`, `:35` |
| 3.21 | Senin tiga jurnal baru Budi: Rp28.000, Rp10.000, Rp25.000 | `labs/t3-offline/output/kunci24.txt:107-109` |
| 3.14 | Ekspor kosong Sari dijawab 200, proses berhenti sendiri dengan kode keluar 2, 3 detik kemudian `/healthz` tidak menjawab | `labs/t3-instance/output/panic.txt:25-26`, `:29` |
| 3.14 | Dua instance: 20 request sesudah a mati dijawab 200 (b 20); sesudah b mati 10 request dijawab 503 | `labs/t3-instance/output/panic.txt:32-35` |
| 3.14 | Deploy manual Tahap 1: 3 dari 8 putaran prober tanpa jawaban | `labs/api-t1/output/m6.txt:49-51` |
| 3.22 | Catatan `<img src=x onerror=alert(1)>` panjang 28 karakter | dihitung (`len` = 28); isi catatan di `labs/t3-dasbor/output/xss.txt:4` |
| 3.22 | Mode rentan: 1 dialog `alert` berisi "1", 1 elemen `img`; mode benar: 0 elemen, tag terlihat sebagai teks | `labs/t3-dasbor/output/xss.txt:9`, `:13` |
| 3.22 | Bagian D: `fetch` dijawab 200, harga produk 1 berubah dari Rp25.000 | `labs/t3-dasbor/output/xss.txt:21-22` |
| 3.7 | 190 pembacaan sebelum pool penuh dijawab 200, 190 sesudahnya tanpa jawaban; dipakai 10 dari maks 10 | `labs/t3-pool/output/m18.txt:21-23` |
| 3.7 | Tanpa log akses: 0 baris log baru sesudah satu pembayaran, 0 baris memuat trace-id dari app | `labs/t3-pool/output/jejak.txt:14-15`, `:29` |
| 3.7 | Sepuluh pembayaran pertama menulis 10 baris `push gagal` pada beban 17,4 request per detik (Asumsi naskah) | `labs/t3-pool/output/adr22.txt:10`, `:15` |

Angka yang berlabel di halaman dan tidak terulang di lab: 3.14 "40 detik" dan "sembilan menit" (Ilustrasi, tanpa rekaman), 3.10 "tiga pembayaran" dan "dua hari" (Ilustrasi; rekaman memakai dua kiriman Rp25.000), 3.20 "62 jam" (Asumsi naskah; rekaman memerankan waktu dengan jam service yang dimajukan, berlabel "Ilustrasi mekanisme").

Label dibandingkan dengan definisi di gaya-bahasa dan `/cara-pakai/`:

| Tempat | Angka dan label | Sesuai definisi |
| --- | --- | --- |
| 3.10 Gejala | "Angka cerita (Ilustrasi)": tiga pembayaran, dua hari | Ya: contoh cerita, bukan hasil sistem |
| 3.20 Gejala | "62 jam" Asumsi naskah (Jumat 17.00 sampai Senin 07.00, hitungan 62 benar) | Ya |
| 3.7 tabel empat golden signals | Traffic "17,4 request per detik (Asumsi)", Errors "190 pembacaan (`m18.txt`)" | Ya: masukan Asumsi berlabel Asumsi, hasil kejadian berlabel rekaman |
| 3.8 dan 3.29 | "Pool 4 dan push 30 detik adalah Hitungan dari rumus: masukannya Asumsi, jadi hasilnya juga Asumsi"; L = 138,9 × 0,02 = 2,78 dengan W 20 ms "(Asumsi, belum diukur)" | Ya: hasil rumus memakai label masukan terlemah |
| 3.14 | "40 detik" dan "sembilan menit" Ilustrasi | Ya |
| Widget outbox, pool, cache dan 3.8, 3.10, 3.28 | Label "Hitungan" dan "Ilustrasi mekanisme" | Sebagian: bukan salah satu dari lima label di `/cara-pakai/`, dan dua-duanya dijelaskan di tempat pemakaian. Hasilnya tetap berlabel Asumsi atau Ilustrasi. Polesan |

Satu angka, satu bentuk: 17,36 dan 0,868 ditulis lengkap bersama bentuk bulatnya (17,4 dan 0,87) dengan kalimat pembulatan di 3.6, 3.8, 3.18, 3.28 (0,87 lawan 0,868: selisih 0,23%, halaman menulis 0,2%). Penghitungan mesin (`tmp/e3-hitung.py`, tidak di repo): 107 persamaan "a ○ b = c" di 32 halaman, 15 tertandai karena satuan persen atau persamaan berantai (mis. "20.000 × 3 × 2 × 365 = 43,8 juta", "18 ÷ 138,9 = 130 ms"), dibaca tangan semuanya benar, 0 salah hitung. Itu pelajaran dari 2.30 dan 2.33 yang kini terpenuhi.

## Lampiran W5

Blok Coba diambil dari registry (`jenis`), `eval_tahap.py coba 3`, data widget (`predict`, `varian`, `toggles` di `situs/public/widgets/data/*.json`), dan kontrol di DOM sesudah hidrasi di 1366×657 (`situs/tmp/e3-kontrol.mjs`, tidak di repo): tombol `aria-pressed`, kotak centang, dan ringkasan lipat di dalam blok Coba.

| Halaman | Komponen Coba | Tebak dulu | Ubah satu hal |
| --- | --- | --- | --- |
| 3.3, 3.6, 3.12, 3.14, 3.17, 3.18, 3.20, 3.24 | alur (`WidgetLama`) | `predict` 4 opsi | `varian` 3 dan kotak centang "Ubah satu hal" |
| 3.4, 3.22 | CariBug | menandai baris | tombol "Lihat versi benar" yang mengganti baris |
| 3.5 | ErdHalaman dan Tebak | komponen Tebak | tombol "Bandingkan dengan Tahap 2" |
| 3.8 | PoolLittle | tebak kapan pool penuh | tombol pengaturan (menurut teks Coba: "ubah satu hal") |
| 3.9, 3.10, 3.11, 3.13, 3.26 | OutboxWorker | tebak | tombol skenario dan pengaturan (3.10: urutan COMMIT dan cara worker mengambil baris) |
| 3.15 | Tebak dan banding | tebak berapa dari 20 gagal | pilih satu kejadian di widget perbandingan |
| 3.16 | BatasInstance | tebak | jumlah instance |
| 3.19 | CacheInvalidation | tebak | tombol pengaturan (TTL, penulis, urutan menurut teks Coba) |
| 3.23 | Tebak dan banding | tebak jawaban dasbor | pilih skenario di widget perbandingan |
| 3.28, 3.29 | Kalkulator | tebak | skenario (`aria-pressed`) |
| 3.2 | pilah `t3-fitur-pilah` | memilah sepuluh pekerjaan | tidak ada |
| 3.7 | pilah `t3-observability-pilah` | memilah tujuh pertanyaan | prosa "Ubah satu hal: pasang timeout 3 detik" bertaut ke `adr22.txt` |
| 3.27 | pilah `t3-tim-infra-pilah` | memilah tujuh kejadian | prosa "Ubah satu hal: hitung alert dari semua kelas" bertaut ke `queue.txt` |
| 3.21 | Tebak | tebak jawaban server | prosa "Ubah satu hal" bertaut ke `versi.txt` bagian A dan B |
| 3.25 | Tebak | tebak | prosa "Ubah satu hal" bertaut ke `dio.txt` bagian B dan `pin.txt` bagian C |
| 3.30 | Tebak | tebak mana yang paling dekat ke pemicu | tabel statis "Ubah satu hal" (2 instance, 4 instance, 6 instance) |
| 3.31 | kartu `t3-rekap-kartu` (13 entri) | tebak lalu buka | tidak ada |
| 3.1, 3.32 | tanpa blok Coba | halaman PRD | halaman PRD |

Dua catatan. Pertama, tebakan 3.32 ada di blok "Pratinjau PRD v4" dan "Pertanyaan terbuka", bukan di blok Coba, sehingga `coba` mencatat 0 blok Coba. Halaman PRD (3.1, 3.32) tidak punya blok Coba, seperti 2.1 dan 2.33. Kedua, hasil-dulu: `bocor 3` menemukan Rp25.000 (3.18), 200 (3.20), dan 201 (3.24) di teks sebelum blok Coba; ketiganya halaman masalah yang menampilkan hasil di "Yang sebenarnya" menurut rancangannya. Jawaban `predict` yang berupa teks (3.3, 3.6, 3.12, 3.14, 3.17) tidak bisa diperiksa dengan cara ini.

## Lampiran W6

`python3 tools/eval_tahap.py adr 3`, ditambah satu pembacaan tangan: ada "Kasus industri" (satu per halaman), "Yang akan merevisinya", "Status", dan bagian bukti atau lab di semua 12.

| ADR | Halaman | Opsi | Pre-mortem | Kapan salah | Tautan sumber |
| --- | --- | --- | --- | --- | --- |
| 22 | 3.8 | 4 | 3 penyebab | ada | 23 |
| 23 | 3.9 | 4 | 3 penyebab | ada | 15 |
| 24 | 3.11 | 4 | 3 penyebab | ada | 17 |
| 25 | 3.13 | 4 | 3 penyebab | ada | 19 |
| 26 | 3.15 | 5 | 3 penyebab | ada | 25 |
| 27 | 3.17 | 4 | 3 penyebab | ada | 14 |
| 28 | 3.19 | 4 | 3 penyebab | ada | 10 |
| 29 | 3.21 | 5 | 3 penyebab | ada | 16 |
| 30 | 3.23 | 4 | 3 penyebab | ada | 23 |
| 31 | 3.25 | 4 | 3 penyebab | ada | 24 |
| 32 | 3.27 | 3 | 3 penyebab | ada | 8 |
| 33 | 3.30 | 4 | 3 penyebab | ada | 11 |

Tiga klaim sumber dicek ke halaman primer 2026-10-28:

1. 3.25: "RFC 6797 melarang host mengirim header itu lewat transport yang tidak aman" (bagian 7.2), alamat IP tidak dicatat (bagian 8.1.1), permintaan pertama tak terlindungi (bagian 14.6). RFC 6797 7.2: "An HSTS Host MUST NOT include the STS header field in HTTP responses conveyed over non-secure transport"; 8.1.1: UA "MUST NOT note this host as a Known HSTS Host" untuk IP-literal; 14.6: interaksi awal lewat kanal tak aman rentan. Cocok, termasuk nomor bagian.
2. 3.11: `FOR UPDATE SKIP LOCKED` melewati baris yang sudah dikunci transaction lain. Dokumentasi PostgreSQL 17 (SELECT, Locking Clause): baris yang tidak bisa dikunci segera dilewati, hasilnya "an inconsistent view of the data", cocok untuk "queue-like table" dengan banyak konsumen. Cocok, dan 3.9 menyebut ongkos yang sama.
3. 3.21: draft IETF Idempotency-Key bagian 2.3, "Resource boleh memakai key berbasis waktu ... dan sebaiknya menerbitkan kebijakan kedaluwarsanya". Datatracker: revisi -08 bertanggal 22 Oktober 2026, Active, belum RFC, kedaluwarsa 25 April 2027; bagian 2.3 menulis resource "MAY require time based idempotency keys" dan "SHOULD define such expiration policy and publish it". Cocok, dan revisinya masih yang sama dengan Tahap 2.

## Pertanyaan pembaca

Halaman dipilih dengan `python3 -c "import json,random; h=[x for x in json.load(open('situs/data/cerita.json'))['halaman'] if x.get('tahap')==3 and x.get('nomor')]; random.seed(3); print([x['nomor'] for x in random.sample(h,5)])"` → 3.16, 3.9, 3.24, 3.31, 3.5 (lima pertama untuk axe pada putaran tanpa alat axe penuh, tiga pertama di bawah). Tangkapan 375×667 gelap yang dibuka: `situs/tangkapan/tahap-3_m22-batas-login-dua-kali-hp-dark.png` (3.16) dan `situs/tangkapan/tahap-3_outbox-worker-hp-dark.png` (3.9). Jawaban 3.24 dibaca dari DOM di 375×667.

| Halaman | Di mana | Dari mana | Ke mana |
| --- | --- | --- | --- |
| 3.16 | Jalur "Tahap 3 › minggu 6", judul "3.16 M22: Batas login jadi dua kali lipat", kepala blok "Gejala · Blok 1 dari 5 · 1 menit" | Baris meta "Prasyarat: 3.15 Dua instance di belakang proxy" (tautan, di layar pertama); Sebelumnya "3.15 Dua instance di belakang proxy + ADR 26" | Tombol "Berikutnya: 3.17 Rate limit lintas instance dan Redis + ADR 27" di akhir blok (di bawah layar pertama) |
| 3.9 | Jalur "Tahap 3", judul "3.9 Outbox transaksional dan worker + ADR 23", "Blok 1 dari 5 · 1 menit", dan Rantai Inti di layar pertama | "Prasyarat: 3.8 Connection pool dan Little's Law"; Sebelumnya "3.8 Connection pool, Little's Law, dan timeout + ADR 22" | "Berikutnya: 3.10 M19: Ani tidak diberi tahu" |
| 3.24 | Jalur "Tahap 3 › 3.24 M26 › minggu 9" di DOM (tangkapan 3.16 di HP menampilkan "Tahap 3 › minggu 6"), judul "3.24 M26: Transfer yang tidak dibuat Budi", "Blok 1 dari 5" | "Prasyarat: 3.23 XSS, CSRF, cookie sesi, passkey"; Sebelumnya "3.23 Keamanan 5: XSS, CSRF, cookie sesi, passkey + ADR 30" | "Berikutnya: 3.25 Keamanan 6: TLS, HSTS, pinning + ADR 31" |

Dalam tiga detik di layar pertama pembaca tahu halaman mana (judul bernomor dan jalur), dari mana (meta Prasyarat), dan apa yang dibaca dulu (Inti dan Rantai di 3.9, adegan Gejala di 3.16). Tombol Berikutnya antarblok baru terlihat sesudah menggulir. Jalur 3.9 hanya "Tahap 3" karena halaman konsep tidak punya sub minggu. Tangkapan 3.16 juga memperlihatkan kalimat definisi di dalam adegan yang jadi dasar W3.

## Uji baca: 5 hal membingungkan

Pembaca: satu subagent segar (tipe general-purpose, model sonnet, tanpa konteks proyek). Ia hanya diberi persona mobile engineer baru di backend dan teks polos tiga halaman seed 3 (3.16, 3.9, 3.24) yang diekspor sesudah hidrasi di 375×667 dengan semua bagian lipat terbuka (tautan ditulis sebagai `[-> /path/]`), serta teks seluruh 32 halaman Tahap 3 di folder terpisah untuk dibuka bila halaman menyebutnya. Ia tidak diberi tahu apa yang dicari dan dilarang membuka file lain, menjalankan shell, atau mencari di web. Ia membaca teks saja: widget interaktif (Tebak, alur, OutboxWorker) tidak ia operasikan, dan ia tidak melihat gambar. Lima butir di bawah dari laporannya; kolom terakhir klasifikasi evaluator, dengan kutipan yang dicek ke sumbernya.

| No | Halaman dan kalimat | Kenapa membingungkan (kata pembaca) | Klasifikasi |
| --- | --- | --- | --- |
| 1 | 3.9, bagian "Worker mengklaim baris": "`FOR UPDATE` mengunci baris yang dipilih selama klaim, dan `klaim_sampai` menahannya sesudahnya selama 5 detik" dan "Tanpa klausa kunci sama sekali, dua sesi memilih nomor 1 sampai 4 yang sama" | Pembaca tidak bisa memisahkan peran `FOR UPDATE`, `klaim_sampai`, dan `SKIP LOCKED` (dibilang "tidak menambah kebenaran"). "Klaim" tidak pernah didefinisikan, "5 detik" tidak ada di kode yang tampil, dan "nomor 1 sampai 4" tidak disebut nomor apa | Kosakata. Halaman menulis peran yang mencegah baris ganda ("Itulah yang mencegah dua worker mengirim baris yang sama"), jadi klaim pembaca bahwa ia tidak bisa menyimpulkannya terlalu kuat. Yang nyata: "klaim" dipakai sebagai kata kerja sebelum arti, dan "nomor 1 sampai 4" adalah nomor outbox tanpa disebut |
| 2 | 3.9, bagian "Kenapa ini ada" dan tabel beban: "Pemicu itu tercapai pada W luar ±5,7 detik (Hitungan: 5 ÷ 0,868 − 0,02 = 5,74)" dan "untuk t = 10 detik, lab t3-pool menghitung L = 8,717 dengan λ = 0,87" | L, λ, W, c, dan t tidak dijelaskan di halaman ini, dan huruf t berarti 10 detik di satu kalimat dan 0,3 detik di tabel. Asal 0,02 dan 0,3 dan "terukur antara 12 dan 13,33" tidak jelas | Kosakata dan prasyarat: Little's Law ada di 3.8 dan ADR 21 (2.31), yang 3.9 tautkan tetapi pembaca tidak buka. Pemakaian t ganda adalah cacat tulis nyata (satu simbol dua arti). Polesan |
| 3 | 3.16, bagian "Yang tidak berlipat: kunci akun": "tebakan 6 sampai 10 bertemu akun terkunci dan dijawab 401 ... Jadi password dibandingkan dengan hash akun lima kali, bukan sepuluh" dan rekaman "tebakan 1-5 per instance lolos bucket" | Penomoran tebakan campur antara urutan global 1 sampai 12 dan "per instance". Kode yang tampil tidak memperlihatkan perbandingan hash, dan pembaca tidak tahu apakah hasilnya kabar baik atau masalah | Desain. Halaman sudah menulis "(penalaran dari kode)" dan bahwa dua baris keterangan rekaman ditulis lab, tetapi pembaca mengikuti garis "yang tidak berlipat" tanpa kesimpulan satu kalimat. Polesan |
| 4 | 3.16, blok Gejala: "Batas per alamat tertulis 10, tetapi 20 percobaan sampai ke pemeriksaan password sebelum ada yang ditolak dengan 429. Pemeriksaan password adalah saat server membandingkan password dengan hash yang tersimpan." | Terbaca seolah 20 lolos dulu baru ada yang ditolak, padahal 24 dikirim. "Sampai ke pemeriksaan password" tidak langsung terpetakan ke status 401, dan dua masalah (jatah berlipat per instance dan satu key per alamat proxy) tercampur | Desain dan satu pelanggaran gaya: kalimat kedua adalah definisi istilah di dalam adegan (W3). Perbaikannya di EVAL3-F1 |
| 5 | 3.24, "Yang sebenarnya": "App Budi menerima sertifikat apa pun" dan diagram "Flag: terima sertifikat apa pun" | "Flag" muncul sebagai fakta sebelum dijelaskan siapa memasangnya (penjelasan baru di bagian "Staging membutuhkan flag"). "Diperankan" dan "server tepi TLS" tidak dijelaskan. Pembaca juga menulis bahwa huruf bagian rekaman dipakai ganda dan Cek diri 1 salah merujuk bagian C | Kosakata ("flag" dan "diperankan" dipakai sebelum arti) dan urutan bagian rekaman yang melompat (B, C, E, C, D, A di teks). Dua tuduhan pembaca tidak terbukti: `m26.txt:41` menamai bagian C "Flag ... dari staging", yang memuat baik penolakan staging (`:43-44`) maupun hotspot yang mengubah transfer (`:49-64`), dan Cek diri 1 merujuk bagian C dengan benar. Polesan |

## Putaran perbaikan

Satu tugas perbaikan, disisipkan pengatur di `plan/ANTREAN.md` tepat sesudah EVAL-3, lalu `EVAL-3-ulang` sekali (skill evaluasi-tahap, "Setelah kartu" butir 2):

- `EVAL3-F1` · Blok Gejala 3.16 memuat definisi istilah di dalam adegan. Selesai bila: kalimat "Pemeriksaan password adalah saat server membandingkan password dengan hash yang tersimpan." tidak ada di blok Gejala `situs/src/content/docs/tahap-3/m22-batas-login-dua-kali.mdx`; "pemeriksaan password" di adegan diganti kata yang pembaca kenal tanpa definisi (mis. "diperiksa passwordnya"), dan definisinya sudah ada, atau ditambah, di blok "Yang sebenarnya"; `python3 tools/eval_tahap.py gejala 3` → exit 0; penjaga halaman 3.16 (`situs/src/widgets/batas-instance/halaman.test.ts` atau yang setara) diberi satu kasus yang gagal bila kalimat berpenanda definisi kembali ke Gejala, diuji mutasi; gerbang penuh lolos. Kategori: butir W yang gagal (W3).
- `EVAL-3-ulang` · evaluasi ulang ringan dengan seed 3 yang sama, bergantung pada EVAL3-F1. `DIRI-3` bergantung pada EVAL-3-ulang.

Hasil perbaikan dan evaluasi ulang: bagian "Putaran 2" di akhir file (2026-10-29, EVAL-3-ulang): W1 sampai W4 dan W6 sampai W8 YA, W5 TIDAK; tahap dinyatakan selesai.

Tidak ada tugas halaman untuk W5, karena sebabnya sama dengan 2.32 dan 2.2: halaman rekap dan pilah bukan tempat yang wajar untuk masukan "ubah satu hal", dan prosa "Ubah satu hal" yang bertaut ke rekaman di lima halaman adalah keputusan desain. Keputusannya ada pada pemilik (TINJAUAN-PEMILIK butir 3 Tahap 2 dan butir 1 di bawah) dan pada DIRI-3.

## Untuk TINJAUAN-PEMILIK

Urut dari yang paling berat. Pengatur memindahkannya ke `plan/TINJAUAN-PEMILIK.md` bagian "Tahap 3"; dokumen ini tidak mengubah file itu.

1. W5 TIDAK (belum ada keputusan). Tujuh dari 30 halaman bukan "tebak dulu lalu ubah satu hal" menurut huruf skill: 3.31 (rekap) dan 3.2 (pilah) tanpa masukan; 3.7, 3.27 (pilah), 3.21, 3.25, dan 3.30 (Tebak) memakai prosa yang bertaut ke rekaman. Pilihan: kecualikan rekap, pilah, dan ADR "Sengaja belum" dari definisi W5 secara tertulis, atau terima prosa bertaut rekaman sebagai "ubah satu hal", atau tambahkan kontrol. Hasil-dulu di halaman masalah (3.18, 3.20, 3.24) tetap desain pemilik.
2. Butir EVAL3-F1 (W3). Bila putaran perbaikan lolos, butir ini selesai; bila tidak, kalimat definisi di Gejala 3.16 tetap.
3. Lima hal membingungkan (tabel di atas), terutama butir 1 dan 2: "klaim" dan simbol L, λ, W, c, t di 3.9, dan "flag" di 3.24, dipakai sebelum didefinisikan. Sama dengan keluhan 3 dan 5 di Tahap 2, jadi aturan "istilah baru diberi arti di pemakaian pertama" di gaya-bahasa belum cukup menahannya.
4. Label "Hitungan" dan "Ilustrasi mekanisme" dipakai di halaman dan widget (3.8, 3.10, 3.28; OutboxWorker, PoolLittle, CacheInvalidation) tetapi `/cara-pakai/` hanya mendefinisikan lima label. Putuskan: tambahkan ke `/cara-pakai/` atau ganti dengan label yang ada. Sama dengan "Dipersempit" di 2.32.
5. File `README.md` di akar menulis `t3-bayar` untuk "3.1–3.3" (penomoran lama), dan folder `labs/t3-bayar` bukan satu dari delapan lab Tahap 3 yang 3.30 hitung. Halaman 3.30 menulis lingkup "delapan lab Tahap 3", dan tesnya memindai delapan folder itu, tetapi pembaca yang menghitung folder `t3-*` mendapat sembilan. Putuskan apakah `t3-bayar` dihapus (butuh persetujuan pemilik) atau ditandai lama.
6. Pemeriksaan di luar W: butir dari catatan PR #340 sampai #414 dan arsip MEMORI yang belum pernah dilihat pemilik (pengatur yang menyalinnya; evaluasi ini tidak membaca ulang semuanya).

## Pelajaran Tahap 3

Bahan untuk DIRI-3. Tiap butir menyebut bukti dari evaluasi ini dan skill yang bisa berubah; keputusannya ada di DIRI-3.

1. evaluasi-tahap, seed: perintah di bagian "Pemilihan acak" memfilter `str(x.get('id','')).startswith('N.')`, tetapi `id` registry sekarang `t3-prd`, jadi daftarnya kosong (`len` = 0) dan `random.sample` gagal. Evaluasi ini memakai `x.get('tahap')==N and x.get('nomor')` seperti EVAL-2. Usul: ganti perintah di skill dengan versi itu.
2. evaluasi-tahap, W3: "tidak ada konsep di dalam adegan" tidak punya alat; Tahap 2 hanya membaca enam blok. `eval_tahap.py gejala N` (keputusan 1130) memindai semua halaman masalah dan menemukan 1 dari 11 pelanggaran (3.16), dengan uji diri 6 kasus. Usul: masukkan perintah itu ke baris W3 skill, dan ke gerbang untuk tahap yang sudah lolos.
3. evaluasi-tahap, W5: `eval_tahap.py coba` hanya mencetak apakah kata "tebak" dan "ubah" ada di teks, dan itu tidak membedakan kontrol dari prosa. Perbedaan itu menentukan lima halaman Tahap 3. Usul: definisikan apakah "Ubah satu hal" berupa prosa bertaut rekaman dihitung, dan tulis kontrol yang dihitung (tombol `aria-pressed`, kotak centang, banding).
4. evaluasi-tahap, W6: perintah `adr` kini menghitung penyebab pre-mortem (tepat tiga) selain ada-tidaknya, sesuai butir "Pre-mortem berisi tepat tiga penyebab" yang EVAL-2 putaran 2 hitung tangan. Parser opsi hanya mengenali tabel dengan 3 kolom opsi atau lebih, jadi ADR dengan dua opsi tercetak "opsi 0", bukan "opsi 2". Tahap 1 (1.15 sampai 1.35) tidak berformat itu dan `adr 1` gagal untuk 8 halaman; perintah itu hanya dirancang untuk Tahap 2 ke atas.
5. evaluasi-tahap, W8: `rantai` hanya di gerbang untuk Tahap 1 dan 2. Rantai Tahap 3 dan uji dirinya kini ikut (keputusan 1129). 3.32 menuju `/cerita/tahap-4/` karena penggantinya (`t4-prd`) masih "segera"; begitu 4.1 jadi, aturan keputusan 1150 melewati halaman lama itu dan Berikutnya dari 3.32 pindah ke 4.1 (seperti 2.33 yang kini menuju 3.1), jadi tugas halaman 4.1 tidak perlu mengubah 3.32. Uji diri: `tools/test_eval_tahap.py` (26 kasus mutasi untuk `peta`, `adr`, `rantai`, `bocor`, `gejala`); 11 dari 12 mutasi pada alatnya sendiri tertangkap, dan satu (`opsi >= 3` menjadi `opsi >= 1`) sepadan karena parser tidak pernah menghasilkan 1 atau 2.
6. gaya-bahasa, label: "Hitungan" dan "Ilustrasi mekanisme" dipakai di halaman dan chip widget tanpa ada di daftar lima label (TINJAUAN-PEMILIK butir 4). Hasil rumus sudah memakai label masukan terlemahnya di 3.8, 3.28, dan 3.29, jadi pelajaran Tahap 2 terserap. Usul: satu kalimat di gaya-bahasa tentang label turunan yang diizinkan.
7. gaya-bahasa, istilah: tiga dari lima keluhan pembaca segar (3.9 "klaim" dan L, λ, W; 3.24 "flag"; 3.16 definisi di adegan) adalah kosakata sebelum arti, sama dengan Tahap 2. Usul: pemeriksa kosakata Inti dan Gejala yang membandingkan istilah di blok itu dengan daftar istilah yang halaman prasyarat sudah jelaskan.
8. analisis-kritis, klaim negatif dan lingkup: 3.30 menulis "delapan lab Tahap 3" dengan tes yang memindai delapan folder, tetapi `labs/t3-bayar` (lab lama, penomoran 3.1–3.3) bernama mirip. Lingkupnya tertulis (folder dan jenis file), dan klaimnya benar untuk delapan lab itu. Usul: klaim negatif menyebut daftar folder yang dipindai, bukan hanya jumlahnya.
9. riset-tahap: tiga sumber primer dicek (RFC 6797, PostgreSQL 17, draft IETF -08) dan semuanya cocok, termasuk nomor bagian; draft Idempotency-Key tidak berubah sejak Tahap 2. Tidak ada klaim tanpa jejak yang ditemukan di sampel. Usul tidak ada.
10. analisis-kritis, kerja paralel: menyunting skrip bash yang sedang berjalan (`tools/cek_situs.sh`) menggeser offset baca bash dan bisa merusak sisa eksekusi. Perubahan gerbang di evaluasi ini ditulis sesudah gerbang selesai, setelah perubahan pertama dikembalikan byte demi byte selagi gerbang berjalan. Usul: aturan satu baris di BRIEF-SUBAGEN.

## Cara mengulang

```
git fetch origin && git checkout -B tahap-3/eval origin/main
bun install --cwd situs && bash tools/get_fonts.sh
PORT_PREVIEW=4326 bash tools/cek_situs.sh --layar > tmp/cek.txt 2>&1 && echo LOLOS || echo GAGAL   # W1, W3, W4 (layar, kontras), W8 (rantai 1 sampai 3, tautan)
python3 tools/eval_tahap.py peta 3        # W1
python3 tools/eval_tahap.py gejala 3      # W3 (exit 1 sampai EVAL3-F1)
python3 tools/eval_tahap.py coba 3        # W5 (lalu baca data widget dan DOM)
python3 tools/eval_tahap.py bocor 3       # W5: dicatat saja
python3 tools/eval_tahap.py adr 3         # W6
python3 tools/eval_tahap.py rantai 3      # W8; butuh situs/dist dari build
python3 tools/test_eval_tahap.py          # uji diri alat bukti
python3 tools/erd.py --cek                # W7; bangun ulang: labs/.venv/bin/python tools/erd.py --tahap 3 dengan LAB_DB_PORT lajur
python3 tools/audit_bahasa.py --check situs/src/content/docs/tahap-3   # W3, hanya Tahap 3
bun run --cwd situs preview --background --port 4326 --host 127.0.0.1
cd situs && node tools/ukur-axe.mjs --url http://127.0.0.1:4326 --semua --awalan /tahap-3/
cd situs && node tools/eval-keyboard.mjs --url http://127.0.0.1:4326 --path /tahap-3/m22-batas-login-dua-kali/ --ukuran 375x667   # dan outbox-worker, 1366x657, --uji-diri
bun run --cwd situs preview stop
export COMPOSE_PROJECT_NAME=rjt-konten3 LAB_DB_PORT=54533 LAB_REDIS_PORT=56579 LAB_PORT_OFFSET=200 && make -C labs/b3-race up
make -C labs/t3-outbox cek                # dan t3-offline, t3-instance, t3-pool, t3-dasbor, t3-mitm, t3-cache, api-t3
gitleaks detect --no-banner               # 1.613 commit, no leaks found
```

Lajur lab di atas milik `rjt-konten3`; di worktree lain pakai nilai lajurnya (`labs/README.md`). Telusur angka, hitungan persamaan, kontrol Coba, dan ekspor teks untuk pembaca segar memakai skrip sementara di `tmp/` dan `situs/tmp/` yang tidak masuk repo; semua angka yang ditelusuri ada di tabel di atas dengan file dan baris.

## Pemeriksaan tambahan di luar W1 sampai W8

| Pemeriksaan | Hasil |
| --- | --- |
| Tes | Vitest 2.584 lolos, `node --test` situs 35 lolos, widget lama 203 lolos, `astro check` 0 error (gerbang) |
| ID internal | "ID internal (halaman, riset, nomor keputusan, nomor PR) tidak tampil di teks halaman, atribut, SVG, data JSON, sidebar, dan data widget" (gerbang) |
| Istilah | "istilah sinkron" (gerbang) |
| Keamanan | `gitleaks detect` v8.30.1 → 1.613 commit dipindai, "no leaks found". `python3 tools/cek_port_lab.py` di gerbang → "lolos: 638 file diperiksa". Lab serangan Tahap 3 (t3-mitm, t3-dasbor) berjalan hanya di container dan `127.0.0.1` |
| Widget Tahap 3 | Gerbang: widget pool, outbox dan worker, dan cache lolos "tebak dulu, keyboard, angka dari rekaman, kontras, axe, luapan, CLS" |
| KEPUTUSAN, MEMORI, STATUS | Dimutakhirkan pengatur lewat PR catatan (#417 melipat batch 23); evaluasi ini tidak mengubahnya |
| Perubahan di PR ini | Dokumen ini; `tools/eval_tahap.py` (penyebab pre-mortem, `gejala`, `EVAL_AKAR`); `tools/test_eval_tahap.py` (baru, 26 kasus); `tools/cek_situs.sh` (rantai Tahap 3 dan uji diri alat). Tidak ada halaman, lab, naskah, skill, atau file bersama yang diubah |

## Putaran 2

Dievaluasi 2026-10-29 oleh subagent evaluasi (skill evaluasi-tahap) yang bukan penulis halaman Tahap 3 dan bukan pelaksana EVAL3-F1 (#421). Seed acak 3, sampel sama dengan putaran 1: `random.sample` memberi 3.10, 3.21, 3.20, 3.7, 3.14, 3.22 (halaman berlab lab, W2) dan 3.16, 3.9, 3.24, 3.31, 3.5 (W4 dan pertanyaan pembaca).

Dasar: `origin/main` c52a6f34 (merge #421), 32 halaman 3.1 sampai 3.32. Skill lain yang dipakai: analisis-kritis (mutasi pada halaman dan penjaga, klaim "20 dari 24" dibandingkan dengan rekaman) dan gaya-bahasa (adegan di blok Gejala). Nomor keputusan: 1135 dan 1136.

Dua batasan. Pertama, lab tidak dijalankan ulang. `git diff --name-only c7fdcba5 HEAD -- labs situs/data/erd tools/erd.py` memuat 25 file, semuanya di `labs/api-t4` (14), `labs/t4-kartu` (10), dan `labs/t4-modul` (1), yaitu lab Tahap 4. Tidak ada file di lab Tahap 3, di `situs/data/erd`, atau di `tools/erd.py`, jadi delapan lab dan ERD3 dari putaran 1 tetap berlaku. Kedua, uji baca oleh pembaca segar tidak diulang: satu-satunya halaman Tahap 3 yang berubah sejak putaran 1 adalah 3.16, dengan empat baris diganti (`git diff --stat c7fdcba5 HEAD -- situs/src/content/docs/tahap-3`).

### Perubahan sejak putaran 1

- 3.16 (EVAL3-F1, #421): kalimat "Pemeriksaan password adalah saat server membandingkan password dengan hash yang tersimpan" keluar dari blok Gejala. Adegan kini menulis "20 dari 24 percobaan sampai diperiksa passwordnya sebelum ada yang ditolak dengan 429", dan definisi satu kalimat ("Pemeriksaan password adalah langkah login yang membandingkan password yang dikirim dengan hash") ada di blok "Yang sebenarnya", baris 42. Penjaga halaman `situs/src/lib/m22-batas-login-dua-kali.halaman.test.ts` kini 52 tes.
- Alat: `tools/eval_tahap.py`, `tools/test_eval_tahap.py`, dan `tools/cek_situs.sh` dari putaran 1 (#418). Gerbang kini menjalankan rantai Tahap 3 dan uji diri alat.
- Di luar Tahap 3: lab Tahap 4 (`api-t4`, `t4-kartu`, `t4-modul`), dua baris `README.md` untuk `t4-kartu`, dan file `plan/`. Tidak ada yang menyentuh halaman, widget, atau data Tahap 3 selain 3.16.

### Kartu nilai putaran 2

| Butir | Putaran 1 | Putaran 2 | Bukti (perintah → keluaran) |
| --- | --- | --- | --- |
| W1 | YA | YA | `python3 tools/eval_tahap.py peta 3` → "naskah 32 halaman, registry 32 halaman", "halaman bercatatan: 0". Gerbang penuh tidak diulang: build baru dari c52a6f34 selesai dan CI PR #421 punya 11 check SUCCESS (`gh pr view 421 --json statusCheckRollup`). `gh run list --branch main --workflow cek` → run 40737571765 (merge #418) success; run 40743907354 (merge #421, EVAL3-F1) success |
| W2 | YA | YA | Tidak diulang: diff lab dan ERD Tahap 3 kosong (bagian atas). Untuk kalimat baru di 3.16: "20 dari 24 percobaan" ← `labs/t3-instance/output/batas.txt:9` ("24 percobaan → 401: 20 · 429: 4 (401 sampai ke pemeriksaan password, 429 ditolak penahan per IP)") dan `:10` (401 a 10, b 10 · 429 a 2, b 2). Arti "diperiksa passwordnya" cocok dengan catatan "401 sampai ke pemeriksaan password" di baris yang sama. Rekaman mencatat jumlah, bukan urutan; "sebelum ada yang ditolak" dibaca dari mekanisme (10 per instance, round_robin). Catatan di bawah adegan berlabel "Angka cerita (Ilustrasi)" untuk staging, password, dan Dimas, dan menulis bahwa angka 24 dan 20 sama dengan rekaman |
| W3 | TIDAK | YA | `python3 tools/eval_tahap.py gejala 3` → exit 0, 11 dari 11 "ok"; 3.16 kini 3 paragraf adegan, 81 kata (putaran 1: 91 kata dengan definisi). `python3 tools/audit_bahasa.py --check situs/src/content/docs/tahap-3` → "32 file · 0 error · 12 peringatan"; seluruh repo "335 file · 0 error · 285 peringatan", sama dengan putaran 1. Tiga blok Gejala dibaca ulang: 3.16, 3.22 (kotak peringatan di dasbor Ani), dan 3.14 (Rabu 12.05); semuanya kejadian dan dialog, istilah teknis hanya yang tokoh lihat atau ucapkan ("429", "instance", "staging", "password"). Mutasi pada halaman asli: kalimat definisi dikembalikan ke Gejala → `gejala 3` mencetak "3.16 ... DEFINISI: Pemeriksaan password adalah ..." dan penjaga 3.16 gagal di 3 dari 52 tes; sesudah dipulihkan `gejala 3` exit 0 dan penjaga 52/52. `python3 tools/test_eval_tahap.py` → "26/26 kasus uji eval_tahap lolos" |
| W4 | YA | YA | `node tools/ukur-axe.mjs --url http://127.0.0.1:4326 --path /tahap-3/m22-batas-login-dua-kali/` → "1 halaman × 2 ukuran × 2 tema = 4 run; 0 halaman berpelanggaran; incomplete color-contrast 22", uji diri 4/4. Seluruh Tahap 3 (`--semua --awalan /tahap-3/`) → "32 halaman × 2 ukuran × 2 tema = 128 run; 0 halaman berpelanggaran", 25,7 detik. `layar.mjs` dengan `UKUR_HALAMAN` (3.16, 3.15, 3.17) → "LOLOS: 0 gagal, 0 margin tipis"; 3.16 tanpa Inti dicetak "info" (tidak terukur, sama dengan putaran 1), 3.15 dan 3.17 margin terkecil 31 px di 375×667. `python3 tools/contrast.py` → "889/889 lolos". Tangkapan 375×667 gelap `situs/tangkapan/tahap-3_m22-batas-login-dua-kali-hp-dark.png`: jalur "Tahap 3 › minggu 6", judul "3.16 M22", Prasyarat 3.15, dan adegan tanpa kalimat definisi. Uji keyboard tidak diulang: 3.16 hanya berubah teks |
| W5 | TIDAK | TIDAK | Definisi di skill evaluasi-tahap belum berubah (`git log -- .claude/skills`: commit terakhir 1ef981c8, sebelum EVAL-3; DIRI-3 belum jalan). `python3 tools/eval_tahap.py coba 3` dan `bocor 3` → keluaran identik dengan putaran 1 (`diff` kosong). Penyebab TIDAK tetap: 3.31 (rekap) dan 3.2 (pilah) tanpa masukan "ubah satu hal", dan 3.7, 3.27, 3.21, 3.25, 3.30 memakai prosa bertaut rekaman. Tanpa itu butir ini YA menurut huruf skill untuk 23 halaman lain (tabel "Lampiran W5") |
| W6 | YA | YA | `python3 tools/eval_tahap.py adr 3` → 12 baris "ok" (12 ADR, 3 sampai 5 opsi, pre-mortem 3 penyebab, kapan salah). Tiga klaim sumber primer dari putaran 1 tidak dicek ulang; tidak ada halaman ADR yang berubah |
| W7 | YA | YA | `python3 tools/erd.py --cek` → "lolos: Tahap 1 5 tabel, Tahap 2 8 tabel, Tahap 3 14 tabel; hash sumber cocok". `situs/data/erd` dan `tools/erd.py` tidak berubah sejak c7fdcba5; bangun ulang dari PostgreSQL tidak dijalankan (batasan di atas) |
| W8 | YA | YA | Build baru dari main ("234 page(s) built", 0 peringatan). `python3 tools/eval_tahap.py rantai 3` → "langkah dari 3.1 sampai 3.32: 32; 404 atau tautan hilang: 0"; `rantai 1` 42 langkah dan `rantai 2` 33 langkah, 0 hilang. `python3 tools/cek_tautan.py` → "234 HTML: 45135 tautan internal ... rusak: 0 path, 0 anchor". Berikutnya dari 3.32 menuju `/cerita/tahap-4/` ("Tahap 4 · Ceritanya"); `situs/data/cerita.json` menulis `t4-prd` dengan `ada: false`, jadi "Tahap 4 · Ceritanya" belum halaman lama dan tujuan itu sah. Begitu 4.1 ada, rantai 3 di gerbang menuntut Berikutnya pindah ke 4.1 |

W1 sampai W4 wajib YA dan keempatnya YA. W5 tetap TIDAK.

### Temuan baru

- 3.16, adegan: "20 dari 24 percobaan sampai diperiksa passwordnya sebelum ada yang ditolak dengan 429". Rekaman memuat jumlah (401: 20, 429: 4), tidak urutan. Urutannya mengikuti mekanisme bucket 10 per instance di bawah round_robin, dan halaman menulis bahwa angka 24 dan 20 sama dengan rekaman. Polesan: satu kalimat di blok "Yang sebenarnya" yang menyebut bahwa rekaman hanya menghitung.
- Lima hal membingungkan dari putaran 1: butir 4 (3.16 Gejala) sebagian selesai (definisi keluar dari adegan; ambiguitas "20 dari 24" kini jelas dari "dari 24"); butir 1, 2, 3, dan 5 tidak berubah karena halamannya tidak berubah.
- Pelajaran: tugas perbaikan dengan satu kalimat, alat yang mengukurnya (`gejala`), dan penjaga halaman yang diuji mutasi menutup W3 dalam satu putaran. Mutasi pada halaman asli (kalimat definisi dikembalikan) gagal di alat dan di penjaga, jadi dua lapis itu saling menguatkan.

### Hasil putaran 2

Tahap 3 dinyatakan selesai apa pun hasilnya (skill evaluasi-tahap, "Setelah kartu" butir 2). Hasil: W1 sampai W4 dan W6 sampai W8 YA, W5 TIDAK.

Butir yang tetap TIDAK (W5) dan lima hal membingungkan ada di bagian "Untuk TINJAUAN-PEMILIK" di atas, tanpa butir baru; butir 2 di sana (EVAL3-F1, W3) selesai dan dicoret. Pengatur menulis bagian "Tahap 3" di `plan/TINJAUAN-PEMILIK.md`; putaran ini tidak mengubah file itu.

### Cara mengulang putaran 2

```
git fetch origin && git checkout -B tahap-3/eval-ulang origin/main
bun install --cwd situs && bun run --cwd situs build
python3 tools/eval_tahap.py peta 3        # W1
python3 tools/eval_tahap.py gejala 3      # W3 (exit 0)
python3 tools/eval_tahap.py coba 3 && python3 tools/eval_tahap.py bocor 3   # W5: bandingkan dengan putaran 1
python3 tools/eval_tahap.py adr 3         # W6
python3 tools/eval_tahap.py rantai 3      # W8 (juga rantai 1 dan 2)
python3 tools/test_eval_tahap.py          # uji diri alat bukti
python3 tools/audit_bahasa.py --check situs/src/content/docs/tahap-3   # W3
python3 tools/erd.py --cek                # W7
python3 tools/cek_tautan.py && python3 tools/contrast.py                # W8, W4
git diff --name-only c7fdcba5 HEAD -- labs situs/data/erd tools/erd.py   # lab dan ERD Tahap 3 berubah atau tidak
bun run --cwd situs preview --background --port 4326 --host 127.0.0.1
cd situs && node tools/ukur-axe.mjs --url http://127.0.0.1:4326 --path /tahap-3/m22-batas-login-dua-kali/   # lalu --semua --awalan /tahap-3/
printf '/tahap-3/m22-batas-login-dua-kali/\n/tahap-3/dua-instance/\n/tahap-3/rate-limit-redis/\n' > ../tmp/halaman.txt && UKUR_HALAMAN=$PWD/../tmp/halaman.txt node tools/layar.mjs --url http://127.0.0.1:4326
bunx vitest run src/lib/m22-batas-login-dua-kali.halaman.test.ts      # penjaga 3.16: 52 tes
bun run --cwd situs preview stop
```
