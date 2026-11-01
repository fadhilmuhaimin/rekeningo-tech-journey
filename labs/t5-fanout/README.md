# Lab t5-fanout · Kafka KRaft, relay outbox, consumer group, dan penyedia push tiruan

Lab Tahap 5 untuk M45 dan ADR 51 (naskah `plan/CERITA-TAHAP-5.md` bagian 3, 3b, dan 4). Ia berbagi `labs/api-t5` lewat `dasar_t5.py` dan satu bendera baru, bukan salinan. Yang baru: satu broker Kafka dalam mode KRaft di container (`docker-compose.yml`), relay dari outbox ke Kafka, consumer group yang mengirim pengumuman, pengirim ke penyedia push dengan backoff dan jitter, dan penyedia push tiruan dengan kuota (`cmd/pushkuota`).

Pihak ketiga adalah tiruan lokal: penyedia push `cmd/pushkuota`, dan Kafka di container tanpa jaringan keluar. Jaringan hanya dipakai saat membangun: image `apache/kafka`, modul Go (`go mod download`), dan paket Python lab.

## Versi

| Komponen | Versi | Catatan |
| --- | --- | --- |
| Kafka | `apache/kafka:4.3.2` | Image resmi Apache di Docker Hub. Tag terbit 2026-10-20 (API Docker Hub, dicek 2026-11-02). 238,5 MB terkompresi untuk arm64, 691 MB di disk. Tag terbaru lain: 4.4.0 (2026-10-22); `latest` masih 4.3.1 (2026-06-24). 4.3.2 dipilih karena naskah menulis garis 4.3. Satu broker KRaft (broker dan controller satu proses), replication factor 1; tiga broker dan replication factor 3 **Tidak dijalankan**. RepoDigest lokal (`docker image inspect`): `apache/kafka@sha256:852a0d49fc4e656b022e7f23785411802c9a088c78a7c5e39f33969de9c227a7`. Tanggal tag di Docker Hub (dibuka 2026-11-02): 4.3.1 2026-06-23, 4.2.2 2026-09-28, 4.3.2 2026-10-20, jadi tag garis 4.2 memang terbit sesudah 4.3.1. Halaman unduhan `kafka.apache.org` tidak terjangkau dari mesin ini (`ECONNREFUSED`), jadi urutan tanggal rilis di halaman itu **[perlu verifikasi]** |
| franz-go | v1.22.2 (BSD-3-Clause) | `proxy.golang.org`: terbit 2026-10-13. `CHANGELOG.md` v1.22.2 memuat perbaikan #1484 (producer idempoten bisa mengakui rekaman yang tidak ditulis; terjadi di v1.22.1, issue ditutup 2026-10-12). Sebab itu consumer di lab tetap idempoten |
| Kafka, batas bawah sesi | `group.min.session.timeout.ms` = 6000 | `GroupCoordinatorConfig.java` cabang `4.3` (`raw.githubusercontent.com`, dibaca 2026-11-02). Consumer lab memakai session timeout 6 detik, batas bawah itu |
| PostgreSQL | 17.11 (`postgres:17`) | database bersama lab, seperti `api-t5` |
| Go | 1.27.3 | toolchain `api-t5`; modul `lab/apit5` |
| pgx | v5.11.0 | |
| Python | venv `labs/.venv`, psycopg 3.3.6 | |

Gerbang pemindai kerentanan ADR 44 (govulncheck, grype) **Tidak dijalankan** di lab ini; `api-t5` menulis alasan yang sama.

## Yang berubah di api-t5

| Berkas | Isi |
| --- | --- |
| `cmd/api/main.go`, `internal/service/bayar.go`, `internal/service/sesi.go`, `internal/service/t5.go` | bendera `-event-pembayaran`: `POST /transfers` (bayar ke warung) menulis satu baris outbox bertujuan `stream` di transaction jurnalnya. Tanpa bendera, perilaku `api-t5` tidak berubah |
| `internal/repo/stream.go` | `TulisEventPembayaran`: baris `stream` berjenis `bayar`, kunci event merchant di payload |
| `internal/notifid/` | `notifikasi_id` pengumuman: UUID versi 5 dari nomor pengumuman dan nomor perangkat, jadi sama di setiap pengiriman ulang |
| `internal/stream/` | `Relay` (klaim baris `stream` seperti worker push, tulis ke Kafka, tandai terkirim sesudah broker menjawab), `Konsumen` (consumer group), `Pengirim` (backoff eksponensial dengan jitter penuh memakai `worker.Backoff`, batas laju per proses) |
| `cmd/stream/` | satu binary, tiga peran: `relay`, `konsumen`, `uji-pengirim` |
| `cmd/pushkuota/` | penyedia push tiruan: kuota per jendela satu detik, latensi, hitungan per kelas (uang atau pengumuman) |
| `go.mod`, `go.sum` | `github.com/twmb/franz-go` v1.22.2 dan tiga modul turunannya (`klauspost/compress`, `pierrec/lz4`, `franz-go/pkg/kmsg`) |

Tes Go baru: `internal/stream` (7 tes), `internal/notifid` (4), `cmd/pushkuota` (3), dan dua tes `internal/service` untuk event pembayaran. `labs/api-t5/output/testing.txt` direkam ulang karena memuat semua tes modul.

## Keputusan desain

- **Satu baris outbox per pengumuman, satu rekaman per rentang perangkat.** `POST /pengumuman` menulis satu baris `pengumuman` dan satu baris outbox `stream` (sudah ada di `api-t5`). Relay membagi perangkat aktif menjadi `-partisi` rentang nomor yang hampir sama banyak (`ntile`) dan menulis satu rekaman per rentang, di partisi bernomor sama dengan rentangnya. Satu rekaman hanya dibaca satu consumer dalam satu consumer group (R5-07), jadi satu rekaman untuk seluruh pengumuman tidak bisa dibagi.
- **Offset dicatat sesudah satu rentang selesai.** Consumer membaca satu rekaman sekali waktu (`PollRecords(1)`), mengirim ke semua perangkat aktif di rentangnya (4 pengirim serentak, c di naskah), lalu mencatat offset. Pembagian ulang partisi ditahan selama satu rekaman dikerjakan (`BlockRebalanceOnPoll`). Consumer yang mati di tengah tidak mencatat offset, jadi consumer lain mengulang rentang itu dari awal: pengiriman ganda yang benar (at-least-once).
- **Id deterministik, bukan pengiriman tepat satu kali.** Penyedia push tiruan tidak menyaring: ia menerima ulangan, menghitungnya (`panggilan_ganda`), dan menghitung berapa `notifikasi_id` berbeda yang diterima tiap token. Satu notifikasi per perangkat berlaku bila penerima (app atau sistem operasi) menyaring id yang sama; yang diukur lab adalah jumlah id berbeda per perangkat. Pengumuman yang sama ke perangkat yang sama selalu memakai id yang sama (`notifid.Pengumuman`). Yang dijamin: tiap perangkat melihat satu notifikasi berbeda. Yang tidak dijamin: tiap perangkat dikirimi tepat satu kali. Transaksi Kafka dan exactly-once **Tidak dijalankan**.
- **Uang tetap di outbox dan worker push.** Notifikasi uang tidak lewat Kafka. Pengumuman dan uang bersaing di tempat lain: kuota penyedia push yang dipakai bersama (bagian `antrean`).
- **Relay at-least-once.** Baris `stream` ditandai terkirim sesudah broker menjawab semua rekaman. Relay yang mati di antaranya menulis rekaman yang sama dua kali sesudah klaim habis. Consumer atas `pembayaran.tercatat` harus menyaring `event_id` (kolom `notifikasi_id` baris outbox, UUID; bukan nomor baris).
- **Event pembayaran berkunci merchant.** Rekaman `pembayaran.tercatat` berkunci nomor merchant (akun warung). Kunci yang sama selalu jatuh di partisi yang sama (`StickyKeyPartitioner`), jadi urutan per merchant terjaga. Urutan antar merchant tidak dijaga.
- **Baris `stream` pembayaran memakai akun pembayar.** Index `outbox_satu_per_jurnal` mengizinkan satu baris per pasangan jurnal dan akun, dan baris push untuk jurnal yang sama sudah memakai akun merchant.
- **Kuota dengan jendela satu detik.** Jendela dibuka oleh permintaan pertama sesudah jendela sebelumnya habis (kuota satu penyedia push diukur per menit dan tidak selaras jam, R5-08). Dokumentasi penyedia itu menyebut kuota per menit (600.000) dan tidak menyebut laju per detik (R5-288), jadi jendela satu detik dan 10.000 per detik adalah terjemahan lab: semburan di awal menit yang kuota per menit izinkan tidak diperankan. Jawaban 429 tidak menghabiskan kuota. Kelas pesan dibaca dari id: UUID versi 5 berarti pengumuman, selain itu uang. Penyedia sungguhan tidak membedakannya.
- **Batas laju per proses.** Tiap consumer boleh dibatasi (`-laju`): slot waktu berjarak tetap, dan slot yang sudah lewat tidak dikejar.

## Mode rentan dan bendera lab

| Bendera | Perilaku |
| --- | --- |
| `cmd/stream -id-acak` | consumer memakai id baru di setiap pengiriman (bentuk id pengumuman, nilai berbeda) |
| `cmd/stream -tanpa-backoff` | pengirim mengulang segera sesudah 429, tanpa menunggu |
| `cmd/stream -lab-henti-setelah N` | consumer berhenti mendadak (`os.Exit(3)`, tanpa melepas grup) sesudah pengiriman ke-N |
| `cmd/stream -lab-henti-sebelum-tandai` | relay berhenti mendadak sesudah broker menjawab, sebelum baris ditandai terkirim |
| `api-t5 -peran worker -rentan urut-waktu` | M27 dari Tahap 3: klaim menurut nomor saja, bukan kelas (dipakai bagian `antrean`) |

## Menjalankan

```
make -C labs/t5-fanout run                    # semua bagian berurutan
make -C labs/t5-fanout run BAGIAN=kuota       # satu bagian: aliran grup kuota antrean pengirim testing
make -C labs/t5-fanout cek                    # rekam ulang, lalu output/ harus identik dengan yang di-commit
make -C labs/t5-fanout test                   # tes Go tanpa Kafka dan tanpa PostgreSQL
make -C labs/t5-fanout down                   # hentikan Kafka lab ini
```

Port dasar: penyedia push tiruan 18317 dan Kafka 19092, keduanya ditambah `LAB_PORT_OFFSET`. Kafka berjalan di proyek compose sendiri (`<COMPOSE_PROJECT_NAME>-t5-fanout`), jadi `down` tidak menghapus PostgreSQL lajur. Lab ini memakai server dan port `api-t5` (18310 sampai 18316), jadi tidak jalan bersamaan dengan `api-t5` atau lab Tahap 5 lain yang memakai `dasar_t5.py` dalam satu lajur. Setiap bagian membuat ulang schema `tahap5_fanout`, broker, dan topik dari nol.

## Rekaman

| File | Bagian | Isi |
| --- | --- | --- |
| `output/aliran.txt` | `aliran` | satu pengumuman: 1 baris `pengumuman`, 1 baris outbox, 6 rekaman di Kafka (satu per rentang perangkat, tanpa celah dan tumpang tindih); ukuran satu baris outbox per penerima dari katalog; 12 pembayaran menjadi 12 rekaman berkunci merchant, tiap merchant di satu partisi dengan jurnal naik menurut offset; relay yang mati menulis satu `event_id` dua kali |
| `output/grup.txt` | `grup` | tiga consumer, enam partisi, dua partisi per consumer; consumer pertama mati di tengah rentangnya; sesudahnya dua consumer memegang tiga partisi, semua offset dicatat, tiap perangkat melihat satu notifikasi berbeda, panggilan yang diulang terbaca; mode rentan `-id-acak` membuat penerima melihat dua notifikasi |
| `output/kuota.txt` | `kuota` | kuota 1.000 per detik di lab: pengirim 96 serentak dijawab 429; backoff tidak pernah melebihi batas `min(maks, dasar x 2^(k-1))`; semua pesan diterima tepat satu per perangkat; mode `-tanpa-backoff` menghasilkan paling sedikit dua kali lebih banyak 429 |
| `output/antrean.txt` | `antrean` | kelas antrean (uang kelas 0 di belakang 3.000 baris promo kelas 2, dengan dan tanpa kelas); pengumuman dan uang memakai satu kuota: dengan laju dibatasi tidak ada 429 untuk uang, tanpa batas laju dan tanpa backoff ada |
| `output/pengirim.txt` | `pengirim` | hitungan naskah diulang (96,3 per detik, L = 29, 8 dan 11 proses, 167 pengirim, 42 consumer dan partisi); c dan t terukur oleh kode pengirim yang sama dengan consumer; kepekaan terhadap t |
| `output/testing.txt` | `testing` | `go vet`, tes Go tanpa database, dan tes event pembayaran dengan PostgreSQL |

Rekaman dari database bersih, diulang berkali-kali (tenang, dan dengan proses sibuk di samping) dan identik per byte. Waktu, UUID acak, lama, jumlah 429, dan umur tidak direkam sebagai nilai (nomor akun, jurnal, dan perangkat data awal deterministik, jadi ikut direkam): yang direkam hitungan baris, status, urutan, dan "ya" bila batas yang diperiksa terpenuhi.

## Yang terbaca dari rekaman

- **(a) Satu pengumuman.** 10.281 perangkat aktif (satu per akun) menghasilkan satu baris `pengumuman`, satu baris outbox, dan enam rekaman di Kafka. Cara lama (satu baris outbox per penerima) menulis 10.281 baris; tumpukan tabel bertambah 166 byte per baris tanpa index, jadi 1.000.000 penerima menulis ±166 MB di tumpukan tabel (Hitungan atas rekaman; naskah memakai 300 byte per baris, Asumsi; naskah tidak menyebut index, dan 166 byte tidak termasuk index outbox).
- **(b) Consumer group.** Tiga consumer memegang masing-masing dua partisi. Satu consumer mati sesudah ±500 pengiriman tanpa mencatat offset; dua consumer yang hidup menyelesaikan keenam rekaman dan mengirim ke 10.281 perangkat. Penyedia push menerima 10.281 id berbeda, tiap perangkat tepat satu id; panggilan yang diulang (paling banyak 504) berasal dari rentang consumer yang mati. Dengan `-id-acak`, perangkat dari rentang itu menerima dua id berbeda.
- **(c) 429.** Dengan kuota 1.000 per detik dan 96 pengirim serentak, ada 429. Menunggu sesudah percobaan ke-k tidak melebihi `min(2000, 100 x 2^(k-1))` ms di semua consumer. Semua 3.000 perangkat menerima tepat satu notifikasi. Tanpa backoff, jumlah 429 paling sedikit dua kali lebih banyak.
- **(d) Uang dan pengumuman.** Dengan 3.000 baris promo kelas 2 menunggu, satu putaran worker dengan kelas mengirim empat baris uang kelas 0; dengan urutan nomor saja, yang terkirim empat baris promo. Lewat Kafka, pengumuman tidak masuk antrean outbox, tetapi memakai kuota penyedia yang sama dengan uang: dengan 600 pesan per detik (tiga consumer, 200 per detik) dari kuota 1.000, tidak ada 429 untuk uang dan umur uang tertua di bawah batas lab 2 detik (Asumsi lab); tanpa batas laju dan tanpa backoff (96 pengirim serentak), uang ikut dijawab 429 dan umur uang tertua melewati batas itu.
- **(e) Pengirim.** Hitungan naskah terulang: λ = 96,3, L = 96,3 x 0,3 = 28,89 (29), 8 proses minimal dan 11 proses untuk terpakai paling tinggi 70%, 167 pengirim dan 42 consumer dan partisi untuk 30 menit. Terukur: c = 4 pengirim serentak, t rata-rata antara 300 dan 400 ms pada penyedia berlatensi 300 ms, kapasitas antara 10 dan 13,4 pesan per detik, dan L = λ x t dalam 15% dari c. Itu membuktikan hitungan dan kode pengirim, bukan t penyedia sungguhan: t di naskah (0,3 detik) tetap Asumsi.

## Selisih dengan naskah (lab yang benar)

- Naskah ADR 51 menulis "satu baris `pengumuman` dan satu event `pengumuman.kirim`". Di lab: satu baris outbox, tetapi enam rekaman di Kafka (satu per rentang perangkat). Satu rekaman tidak bisa dibagi consumer group.
- Naskah menulis "42 consumer dengan 4 pengirim" dan paling sedikit 42 partisi. Lab memakai 6 partisi dan 3 consumer; 42 hanya dihitung.
- Naskah menulis kuota 10.000 per detik. Lab memakai 1.000 per detik di bagian `kuota` dan `antrean`, karena laptop tidak pasti melewati 10.000 permintaan per detik di bawah beban. Aturan jendela dengan 10.000 diuji di `cmd/pushkuota/main_test.go`.
- Naskah menulis t = 0,3 detik. Lab memakai latensi tiruan 0 sampai 5 ms di bagian lain (supaya ribuan perangkat selesai dalam detik) dan 300 ms hanya di bagian `pengirim`.
- `pengumuman.jumlah_penerima` menghitung akun, bukan perangkat (kode `api-t5`). Di data awal satu akun punya satu perangkat, jadi angkanya sama (10.281).
- Perangkat yang mendaftar sesudah relay menulis rentang tidak menerima pengumuman itu. Naskah tidak membahasnya.
- Event pembayaran hanya ditulis `POST /transfers`. Jalur katalog (`/pesanan`) dan QR belum menulis event.
- Naskah menyebut consumer atas `pembayaran.tercatat`: notifikasi, ringkasan laporan, dan webhook ke POS. Lab hanya menulis rekaman (relay) dan membacanya dengan `kafka-console-consumer`; ketiga consumer **Tidak dijalankan**.
- Rekaman yang gagal diproses (pengirim menyerah sesudah `-maks-percobaan`) tidak dicatat offset-nya dan tidak dibaca ulang di dalam proses consumer; baru sesudah consumer dimulai ulang atau partisinya berpindah. Rekaman yang dikerjakan lebih lama dari 30 detik (`RebalanceTimeout`) membuat consumer dikeluarkan dari grup dan rentangnya diulang; rentang lab (1.714 perangkat) selesai dalam beberapa detik.
- Penyedia push tiruan menjawab 400 untuk isi yang salah dan pengirim menganggap 400 seperti 404 (token tidak dipakai lagi, perangkat dinonaktifkan). Penyedia sungguhan menjawab 400 juga untuk isi pesan yang salah, jadi di luar lab satu galat isi bisa menonaktifkan semua perangkat; tes `TestPermintaanSalahBerhentiTanpaUlang` mengunci perilaku lab saja.
- Jalur galat consumer tidak diperankan di rekaman. Rekaman yang gagal tidak dicatat, tetapi bila rekaman berikutnya di partisi yang sama berhasil, offset yang lebih tinggi ikut menutupnya; satu rekaman per partisi di lab menyembunyikannya. Autocommit bawaan franz-go v1.22.2 hanya menandai rekaman dari poll sebelumnya (`GreedyAutoCommit` mati), jadi mematikannya (`DisableAutoCommit`) tidak mengubah rekaman consumer yang mati di tengah, tetapi mengubah jalur galat.
- Relay tidak memasang `RecordDeliveryTimeout`, dan `RecordRetries` bawaan franz-go v1.22.2 hampir tanpa batas (`math.MaxInt64`, dibaca di `config.go` modul), jadi `ProduceSync` bisa menunggu lama saat broker tak terjangkau; ini tidak diperankan di lab. Klaim 5 detik yang habis membuat relay lain mengklaim baris yang sama (ulangan, bukan kehilangan), dan sebuah baris yang gagal 5 kali ditandai mati.
- HPA berdasarkan umur notifikasi tertua **Tidak dijalankan** (k3d milik `t5-rollout`). Breaker bersama dan 66 kegagalan hanya Hitungan.

## Tidak dijalankan atau hanya disebut

Replication factor 3 dan tiga broker, transaksi Kafka (exactly-once), NATS JetStream, Redpanda, dan Debezium hanya disebut. Pengumuman ke 1.000.000 perangkat diskalakan lalu dihitung, bukan dijalankan; lab ini tidak mengukur kapasitas produksi dan tidak mengklaimnya.

## Uji mutasi

Tabel hasil ada di badan PR. Setiap mutan mengubah satu hal di kode lab. Tes atau bagian rekaman yang relevan harus gagal karena sebab yang diuji, lalu file dikembalikan.
