# Lab t3-pool · layanan push yang menggantung dan connection pool

Lab untuk masalah M18 Tahap 3 (`plan/CERITA-TAHAP-3.md` bagian 4): Jumat 12.20 semua layar app berhenti menjawab, padahal pembayaran hanya 0,87 per detik (Asumsi naskah bagian 3, R3-31). Lab ini juga memberi angka untuk ADR 22 (panggilan keluar di luar transaction, timeout 3 detik, pool tetap 10).

Server, data awal, dan layanan push tiruan adalah milik `labs/api-t3` lewat `dasar_t3.py`, tanpa salinan. Mode rentan `push-dalam-tx` memanggil layanan push di dalam transaction dengan client tanpa batas waktu. Lab ini menambah pembangkit beban dan pengamat koneksi (`beban.py`) serta rekamannya (`run.py`). Layanan push selalu tiruan lokal.

## Menjalankan

```bash
make lab-up                                   # dari akar repo: PostgreSQL 17 lab di LAB_DB_PORT
make -C labs/t3-pool run                      # semua bagian, ±5 menit, menulis labs/t3-pool/output/*.txt
make -C labs/t3-pool run BAGIAN=little        # satu bagian: m18 little adr22 jejak
make -C labs/t3-pool cek                      # rekam ulang; gagal bila output/ berbeda dari yang di-commit
```

Lajur kerja lain memakai `COMPOSE_PROJECT_NAME`, `LAB_DB_PORT`, dan `LAB_PORT_OFFSET` (`labs/README.md`). Lab ini memakai port dasar `api-t3` (18180 dan 18181), jadi tidak boleh jalan bersamaan dengan `api-t3` di lajur yang sama. Setiap bagian membuat ulang schema `tahap3` dan data awalnya dari nol. Lab gagal keras bila port dipakai proses lain atau hasilnya meleset dari yang diharapkan.

| Rekaman | Isi | Halaman |
|---|---|---|
| `m18.txt` | A: pool 10 penuh pada 10 ÷ 0,87 detik. B: pool 50 hanya menunda ke 50 ÷ 0,87 detik. C: client yang menyerah melepas koneksi | 3.6, 3.8 |
| `little.txt` | L = λ × W untuk t = 0,3, 2, dan 10 detik; t = 30 detik ada di `m18.txt` A | 3.8 |
| `adr22.txt` | D: timeout 3 detik di dalam transaction. E: `idle_in_transaction_session_timeout` saja. F: push di luar transaction dengan outbox | 3.8 |
| `jejak.txt` | Satu pembayaran selama M18 dilihat dari log, metric, dan database. Trace: Tidak dijalankan | 3.7 |

## Cara merekam

Bebannya 17,4 request per detik (Asumsi naskah bagian 3, R3-30), bukan 17 pembayaran per detik seperti lab lama `t3-bayar`. Jadwalnya tetap: request ke-k dikirim pada detik k ÷ 17,4, dan setiap request ke-20 adalah pembayaran (0,87 per detik, 5%). Sisanya karyawan yang membuka saldo. Pembayar, warung, dan pembaca selalu berbeda, jadi tidak ada rebutan lock buku.

Lab memakai λ = 17,4 ÷ 20 = 0,87 persis, seperti tabel naskah. Hitungan R3-31 yang tidak dibulatkan memberi 0,868, selisih 0,2%. Dengan itu pool 10 penuh pada 11,52 detik dan pool 50 pada 57,60 detik. L untuk t = 2 detik menjadi 1,753: naskah menulis 1,75, lab 1,757.

Sesi karyawan ditulis langsung ke tabel `sesi` sebagai data awal, dengan hash yang sama seperti service. Yang diukur adalah koneksi database saat pembayaran berjalan, bukan bcrypt dan batas login per IP. Pengamat mencuplik `pg_stat_activity` tiap 50 ms (20 ms di `little.txt`).

Rekaman mencetak kejadian dan batas, bukan jam. Pool penuh dicetak sebagai "antara detik ke-11 dan ke-12", rata-rata koneksi sebagai "dalam 15% dari hitungan", dan jumlah request menurut jadwal. Lab menolak hasil yang jauh dari hitungan: pool 10 penuh harus dalam 0,5 detik dari 11,49. Dengan begitu rekaman identik di setiap run.

## Yang terekam (Rekaman lab)

- **M18 dengan beban nyata.** Pool 10 penuh antara detik ke-11 dan ke-12 (hitungan 10 ÷ 0,87 = 11,5). Sebelum itu 190 pembacaan dijawab 200. Sesudahnya 190 pembacaan tidak dijawab dalam 3 detik. Sesudah 30 detik: 26 pembayaran belum dijawab, 10 menggantung di layanan push, 16 menunggu koneksi. Angka 26 hanya jadwal × waktu, karena tidak ada pembayaran yang selesai. Itu bukan ujian L = λ × W: ujiannya di `little.txt`.
- **Pool 50 hanya menunda.** Penuh antara detik ke-57 dan ke-58 (hitungan 57,5), tanpa satu pun request gagal sebelumnya. Penyebabnya tidak berubah.
- **Little's Law.** Untuk t = 0,3, 2, dan 10 detik, rata-rata koneksi dengan transaction terbuka cocok dalam 15% dengan 0,278, 1,757, dan 8,717. Paling sedikit dan paling banyak: 0 dan 1, 1 dan 2, 8 dan 9. W di luar push di bawah batas lab 50 ms (Asumsi naskah 20 ms, R3-33). Di laptop yang tidak sibuk terukur 3 sampai 12 ms (konsol, bukan rekaman). Satu run di mesin sibuk (load 7,8) terukur 24 ms, jadi batas 20 ms tidak dipakai. L semua request di bawah 0,87 (batas lab; naskah 0,35 dengan 20 ms, R3-32).
- **Client yang menyerah melepas koneksi.** Dengan client pembayaran yang menyerah sesudah 5 detik, koneksi terpakai paling banyak 5 dan pool tidak penuh. Transaction dibatalkan, jadi tidak ada jurnal. Handler tetap menunggu push: 26 permintaan masih tertahan di layanan push. Sumber mekanismenya: R3-63 dan R3-64.
- **Timeout 3 detik di dalam transaction.** Pool selamat (paling banyak 3 koneksi), tetapi pembayaran kedua ke warung yang sama menunggu lock buku: selesai sesudah lebih dari 5 detik, bukan 3.
- **`idle_in_transaction_session_timeout` saja.** PostgreSQL memutus sesi yang diam lebih dari 5 detik dan melepas lock buku. Pool di proses Go tetap penuh (dipakai 10 dari 10) selama handler menunggu push (R3-62).
- **Versi benar.** Push di luar transaction dan pemberitahuan lewat outbox: 26 pembayaran 201, 494 pembacaan 200, W di bawah batas lab 50 ms, transaction terbuka paling banyak 1. Layanan push yang menggantung hanya menahan worker. Sesudah layanan pulih, 26 baris terkirim sekali. Batas percobaan worker dinaikkan dari 5 ke 20 hanya di rekaman ini. Dengan batas bawaan, jitter backoff acak bisa membuat baris tertua masuk dead-letter sebelum detik ke-30, dan hitungannya berubah di tiap run.

## Yang tidak ada di lab ini

- **Trace OpenTelemetry: Tidak dijalankan.** Dependency baru (`otelhttp`, nama dan versi [perlu verifikasi]) butuh ADR. Di OpenTelemetry Go, Traces dan Metrics berstatus Stable. Hanya Logs yang masih Release Candidate (R3-14). `jejak.txt` merekam apa yang terlihat tanpa trace: log kosong, `DBStats`, dan `pg_stat_activity`. Log kosong karena api-t3 tidak punya log akses; pembacaan yang selesai pun tidak menulis baris.
- **Circuit breaker: Tidak dijalankan.** Hanya opsi di ADR 22.
- **Layanan push sungguhan.** Tiruan `cmd/pushpalsu` mode `gantung` menerima permintaan dan tidak menjawab. Penyedia sungguhan bisa lambat atau berhenti menjawab. Lab memerankan keduanya: mode `lambat` untuk `little.txt`, mode `gantung` untuk M18.
- **Timeout client di app.** Naskah tidak menyebut timeout di app Flutter. Pool 10 penuh hanya bila client menunggu lebih dari ±11,5 detik: dengan timeout 5 detik koneksi terpakai paling banyak 5 (`m18.txt` C). Lab menutup koneksi TCP saat menyerah. `Future.timeout` di Dart tidak membatalkan permintaan sumbernya (api.dart.dev). Client Flutter yang hanya memakai itu mungkin tidak menutup koneksi, jadi pool tetap penuh [perlu verifikasi: package `http` dan `dio`, tidak dijalankan].
- **Satu mesin.** Pembangkit beban, API, PostgreSQL, dan layanan push tiruan berjalan di satu laptop. Angka waktu (W di bawah 50 ms) bergantung pada mesin dan bebannya, dan berlabel Asumsi sampai diulang di VPS.
- Tabel `outbox` retensi, laju promo, dan kapasitas worker c ÷ t: lab `t3-outbox`.
