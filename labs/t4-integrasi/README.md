# Lab t4-integrasi · layanan verifikasi tiruan, retry, breaker, dan lajur queue

Lab Tahap 4 untuk masalah M31 dan ADR 36 (`plan/CERITA-TAHAP-4.md` bagian 3 dan 4, tugas `lab-t4-integrasi`). Pertanyaannya: apa yang terjadi pada pekerjaan verifikasi identitas ketika layanan vendor mati, lambat, atau menjawab setengah, dan apa yang mengubahnya.

Lab ini berjalan di atas `labs/api-t4`: server Go, skema, data awal, worker, dan pihak ketiga tiruan dipakai dari `labs/api-t4/dasar_t4.py`, bukan salinan. Yang ditambahkan ke api-t4 adalah kode (breaker per lajur, klaim per lajur, satu pembuat client, mode rentan `verifikasi-tanpa-key`) dan tesnya; yang ditambahkan di sini adalah skenario dan rekamannya, di schema sendiri (`t4_integrasi`). Layanan verifikasi adalah proses tiruan lokal (`cmd/tiruan -peran verifikasi`); tidak ada layanan, data, atau kredensial nyata. Lab ini bukan uji kapasitas dan tidak mengklaim perilaku vendor nyata.

## Menjalankan

```bash
make lab-up                                       # dari akar repo: PostgreSQL 17 lab di LAB_DB_PORT
make -C labs/t4-integrasi run                     # semua bagian, ±3 menit, menulis labs/t4-integrasi/output/*.txt
make -C labs/t4-integrasi run BAGIAN=lajur        # satu bagian: lajur retry worker breaker testing
make -C labs/t4-integrasi cek                     # rekam ulang; gagal bila output/ berbeda dari yang di-commit
```

Lajur kerja lain memakai `COMPOSE_PROJECT_NAME`, `LAB_DB_PORT`, `LAB_REDIS_PORT`, dan `LAB_PORT_OFFSET` (`labs/README.md`). Port dasar mengikuti api-t4 (API 18280, push 18281, verifikasi tiruan 18284), ditambah `LAB_PORT_OFFSET`; rekaman selalu menulis port dasar. Setiap bagian membuat ulang schema dan data awal dari nol. Token, waktu, dan `notifikasi_id` disamarkan. Lama menunggu dan lama satu percobaan bergantung mesin, jadi rekaman hanya memuat batas yang diperiksa dan lab gagal keras bila batas itu meleset.

## Versi dasar (dicek 2026-10-27)

| Komponen | Versi | Sumber dan catatan |
|---|---|---|
| `github.com/sony/gobreaker/v2` | v2.4.0 | `proxy.golang.org/github.com/sony/gobreaker/v2/@latest` = v2.4.0 (terbit 2026-01-01); repositori tanpa GitHub Release, hanya tag; dokumentasi pkg.go.dev v2.4.0 dibuka 2026-10-27 dan cocok dengan kode sumber yang dibaca di `go/pkg/mod`. Halaman pkg.go.dev menulis "not in the latest version of its module" walau `@latest` dan tag terbaru sama-sama v2.4.0; peringatan itu tidak dipakai sebagai klaim |
| PostgreSQL, Go, pgx | 17.11, go1.27.1, v5.11.0 | dari api-t4 (README api-t4, "Versi dasar"); dicetak di kepala rekaman |

Dependency baru: satu (`gobreaker/v2`), terpasang di `labs/api-t4/go.mod`. Pustaka itu tidak punya jam yang bisa disuntikkan; bagian `breaker` memerankan jam dengan `testing/synctest` (jam palsu di dalam gelembung).

## Rekaman

| Rekaman | Isi | Halaman |
|---|---|---|
| `lajur.txt` | A: vendor mati tanpa breaker, 10 pekerjaan habis lima percobaan sebelum vendor pulih. B: breaker per lajur, lajur dijeda, percobaan tidak bertambah, pekerjaan selesai sesudah pulih. C: kapasitas 4, tidak ada yang mati. D dan E: dokumen rusak (422) di depan antrean, IsSuccessful bawaan pustaka lawan kustom | 4.10, 4.11 |
| `retry.txt` | A: retry dengan Idempotency-Key = id pengajuan, satu objek di vendor. B: pembanding retry tanpa kunci, dua objek. C: timeout menghasilkan `tidak_pasti`, jawaban 503 tidak. D: timeout terus-menerus berakhir `gagal` | 4.10, 4.11 |
| `breaker.txt` | gobreaker v2.4.0 dengan pengaturan bawaan, jam diperankan: membuka sesudah lebih dari 5 gagal berturut-turut, terbuka 60 detik, satu permintaan di half-open; 4xx bawaan lawan kustom; hasil netral (`IsExcluded`) | 4.11 |
| `worker.txt` | pemakaian worker: pemberitahuan uang menunggu putaran verifikasi yang menggantung; lajur dijeda membebaskannya; c dan t terukur dan hitungan naskah 1,74 dan 4,0 dari 4 | 4.10, 4.11 |
| `testing.txt` | daftar tes Go yang ditambahkan lab ini dan `go vet` | 4.11 |

## Yang ditambahkan ke api-t4

- **Breaker per lajur** (`internal/lajur`, flag `-breaker`): satu breaker gobreaker untuk lajur `verifikasi`, dengan `ReadyToTrip`, `MaxRequests`, dan `Timeout` bawaan pustaka (lebih dari 5 gagal berturut-turut, satu permintaan di half-open, 60 detik). `-breaker-timeout` mempersingkat `Timeout` supaya rekaman tidak menunggu 60 detik; yang 60 detik dibuktikan di `breaker.txt`. Hanya `IsSuccessful` yang berbeda dari bawaan: jawaban 4xx vendor dihitung sukses (ADR 36). `-breaker-bawaan` memasang `IsSuccessful` bawaan pustaka, supaya akibatnya bisa direkam. Tanpa `-breaker` perilaku worker sama dengan sebelumnya (ADR 25 apa adanya) dan rekaman api-t4 tidak berubah.
- **Klaim per lajur** (`internal/worker`, fungsi `klaim`): lajur yang breakernya terbuka tidak diklaim sama sekali, jadi percobaan baris yang menunggu tidak bertambah dan tidak ada slot worker terpakai. Lajur setengah terbuka hanya diklaim satu baris (permintaan percobaan). Baris yang diklaim tepat sebelum breaker terbuka dilepas oleh `LepasOutbox`, yang mengurangi lagi percobaan yang dinaikkan klaim itu.
- **Satu pembuat client** (`internal/klien`): `klien.Baru` dan `klien.BaruDenganTransport` (timeout 3 detik, redirect tidak diikuti). Gateway, layanan verifikasi, penerbit, layanan push, dan fetcher gambar versi aman memakainya; `TestSatuPembuatClientUntukSemuaPanggilanKeluar` memindai semua file `.go` bukan tes di bawah `internal/` dan hanya mengizinkan dua kemunculan pola pembuat client: satu di `klien.go` dan satu di fetcher versi rentan M36 (`unduh.go`), yang sengaja memakai client bawaan. Lingkup klaim: `internal/`; `cmd/beban`, `cmd/tiruan`, dan `cmd/penerbit` (alat lab, bukan panggilan Rekeningo) membuat client sendiri.
- **Mode rentan** `-rentan verifikasi-tanpa-key` (retry bebas tanpa kunci, ditolak ADR 36): worker memakai Idempotency-Key baru di setiap percobaan.
- **Tiruan verifikasi**: `GET /lab/statistik` (permintaan bersamaan paling banyak, lama tiap permintaan ditahan), jawaban 422 untuk `checksum_kartu` bernilai `buruk`, dan body dibaca habis sebelum mode gangguan. Tanpa yang terakhir handler `menggantung` tidak pernah selesai walau client sudah menyerah, karena `net/http` baru mendeteksi koneksi yang ditutup sesudah body terbaca (diamati: lama tahan tidak terukur sebelum perbaikan).

## Temuan (lab yang benar; KONSISTENSI-4 menyelaraskan naskah)

1. **Ambang breaker lebih tinggi daripada batas percobaan.** Breaker membuka pada kegagalan keenam, batas percobaan satu pekerjaan lima. Pada pekerjaan yang diproses satu per satu (kapasitas 1; direkam dengan backoff 0 di `lajur.txt` bagian B: satu dari sepuluh `gagal`, sembilan lulus) pekerjaan pertama menghabiskan lima percobaan dan mati sebelum breaker terbuka. Pekerjaan yang datang berjauhan (0,0116 per detik rata-rata, selang ±86 detik) lebih lama dari jadwal backoff ADR 25 (2 detik sampai 60 detik); itu penalaran dari kode dan hitungan, tidak dijalankan. Pada banyak pekerjaan bersamaan dengan kapasitas 4 enam kegagalan pertama tersebar dan tidak ada yang mati (bagian C). Kalimat naskah "pekerjaan menunggu dan selesai sesudah vendor pulih" benar untuk pekerjaan yang belum dicoba, tidak untuk satu atau dua yang pertama.
2. **Kelas antrean tidak membebaskan slot.** Komentar `TulisOutboxVerifikasi` menulis kelas 1 "supaya pekerjaan verifikasi tidak menahan uang". Kelas hanya mengatur urutan klaim. Dengan vendor menggantung dan satu worker untuk semua lajur, pemberitahuan uang menunggu sampai putaran yang berjalan selesai (batas bawah 2,0 detik diperiksa; batas waktu client 3 detik, `worker.txt` bagian A). Dengan lajur verifikasi dijeda, keempat pemberitahuan sampai dalam kurang dari 2,0 detik (bagian B). Komentar kode diluruskan.
3. **`tidak_pasti` tidak bertahan sampai dead-letter.** Lima timeout beruntun mengakhiri pekerjaan di dead-letter dan menandai pengajuan `gagal`, padahal vendor menyimpan satu objek (`retry.txt` bagian D). Naskah menulis timeout menghasilkan `tidak_pasti`, bukan `gagal`; itu benar per percobaan, tidak sesudah percobaan terakhir. Mempertahankan `tidak_pasti` tanpa job yang memeriksa status vendor menahan pendaftar (indeks `verifikasi_satu_berjalan` menghitungnya berjalan), jadi lab ini tidak mengubah perilakunya; keputusan ada pada pemilik.
4. **Jawaban 4xx diulang lima kali.** Dengan `IsSuccessful` kustom breaker tidak membuka karena dokumen rusak, tetapi pekerjaan itu tetap memakai lima percobaan atas jawaban yang tidak akan berubah (`lajur.txt` bagian E: 34 permintaan untuk 10 pengajuan). Dengan bawaan pustaka breaker membuka sesudah enam jawaban 4xx berturut-turut (bagian D memakai enam pengajuan rusak), dan itu menjeda pengajuan sehat di belakangnya selagi vendor sehat. Satu dokumen rusak saja tidak membukanya: ia memakai paling banyak lima percobaan, dan satu sukses di antaranya mengembalikan hitungan gagal berturut-turut ke nol (kode pustaka `counter.go`; dipaku `TestLajur4xxTidakMembukaBreakerKustomTetapiMembukaBreakerBawaan` dan `TestBreakerSuksesMemutusGagalBerturutTurut`).
5. **Permintaan percobaan di half-open memakai percobaan pekerjaan.** Lajur setengah terbuka mengklaim satu baris; vendor dihubungi, jadi percobaan baris itu naik seperti percobaan lain (ADR 25 menghitung percobaan saat vendor benar-benar dihubungi). Selama vendor tetap mati, tiap Timeout breaker menghabiskan satu percobaan pekerjaan terdepan: lima permintaan percobaan mematikan satu pekerjaan walau lajur dijeda di antaranya (`TestLajurPermintaanPercobaanSetengahTerbukaMenghabiskanPercobaanPekerjaanTerdepan`, jam nyata 150 ms). Hitungan dari Timeout bawaan 60 detik dan lima percobaan: outage 12.600 detik (naskah M31) memberi 210 permintaan percobaan, yaitu sampai 42 dari 146 pekerjaan mati sebelum vendor pulih, bukan nol (Hitungan atas angka naskah, tidak dijalankan). Rekaman `lajur.txt` bagian B memulihkan vendor sebelum permintaan percobaan pertama, jadi tidak merekamnya. Kalimat naskah "pekerjaan menunggu dan selesai sesudah vendor pulih" benar paling jauh selama outage lebih pendek dari lima Timeout breaker.
6. **Hasil netral ada di v2.4.0.** `Settings.IsExcluded` membuat error tertentu tidak dihitung sukses maupun gagal (`breaker.txt` bagian D). Lab ini tidak memakainya.

Hitungan naskah 0,116 × 5 × 3 = 1,74 dan 1,74 + 2,26 = 4,0 dari 4 slot terulang (`worker.txt` bagian C). Hanya c = 4 dan batas waktu client 3 detik yang terukur; 0,116, 7,52, dan 0,3 detik adalah Asumsi naskah.

## Uji mutasi

Lihat badan PR (tabel mutan, hasil, dan mutan yang lolos). Mutan dijalankan pada salinan terpisah `labs/api-t4` dengan schema sendiri yang dibangun ulang sebelum tiap mutan; skripnya sementara dan tidak ada di repo.

## Yang belum ada di lab ini

- **Jalur sinkron**: breaker per vendor untuk panggilan yang ditunggu user (`POST /topup-bank` ke gateway) tidak dipasang. ADR 36 menyebutnya; lab ini hanya merekam lajur queue. Tidak dijalankan.
- **Keadaan breaker bersama**: breaker hidup di memori satu proses worker (dari kode, tidak direkam). Worker yang dimulai ulang memulai dari tertutup, dan dua worker tidak berbagi hitungan.
- **Job pemeriksa status vendor** untuk pengajuan `tidak_pasti`: tidak ada, dan tiruan tidak punya endpoint status.
- **Vendor nyata**: perilaku vendor terhadap Idempotency-Key (menyimpan jawaban pertama, kedaluwarsa, penagihan) tidak diukur; tiruan menyimpan satu objek per key tanpa kedaluwarsa.
- **Beban 0,116 per detik**: laju naskah tidak dijalankan; yang direkam adalah c dan t terukur dan hitungannya.
- **Backoff produksi** (2 detik sampai 60 detik dengan jitter): rekaman memakai backoff 0 atau 1 ms supaya waktu tidak ditunggu; fungsi backoff dites di api-t4.
- **Outage 3 jam 30 menit** dan angka 146 pendaftar: Ilustrasi dan Hitungan naskah, tidak dijalankan.
