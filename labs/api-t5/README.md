# Lab api-t5 · api-t4 naik ke enam service dan satu negara

Lab induk Tahap 5 (naskah `plan/CERITA-TAHAP-5.md` bagian 3, 3b, dan 4). Ia berangkat dari `labs/api-t4` dan menambah semua tabel dan kolom naskah bagian 3b lewat migrasi baru. Lab ini memecah 30 tabel ke enam schema service dengan role per service. Ia menyediakan PgBouncer di depan primary hanya untuk bagian `pooler`: server `api-t5` dan generator beban tidak berjalan lewat PgBouncer. Ia merekam laporan merchant, koneksi, dan beban 1.388,9 request per detik. Lab Tahap 5 berikutnya (`t5-replika`, `t5-partisi`, `t5-fanout`, `t5-service`, `t5-cicilan`, `t5-rollout`, `t5-waf`, `t5-kms`, `t5-gabung`) berbagi lab ini lewat `dasar_t5.py` dan mode rentan, bukan salinan.

Pihak ketiga yang dipanggil server dan worker adalah tiruan lokal di container atau proses: gateway pembayaran, layanan verifikasi, penerbit kartu, layanan push, Redis, dan PgBouncer. Dalam rekaman, server, worker, dan generator beban hanya memanggil alamat di mesinmu. Jaringan hanya dipakai saat membangun: toolchain Go (sekali, lewat proxy modul), paket PgBouncer di image (`apt.postgresql.org`), dan Redocly lewat `npx` bila belum ada di cache (`make kontrak`).

## Versi

| Komponen | Versi | Catatan |
| --- | --- | --- |
| Go | 1.27.3 | `go.mod` memakai `go 1.27.3`; toolchain diunduh `go` dari `golang.org/toolchain` lewat proxy modul (`api-t4` tetap 1.27.1). Seluruh tes dan rekaman berjalan di 1.27.3 |
| PostgreSQL | 17.11 (`postgres:17`, Debian 17.11-1.pgdg13+2) | image sama dengan lab lain, dari cache lokal |
| pgx | v5.11.0 (MIT) | sama dengan `api-t4`; `pgxpool` dipakai `cmd/pooler` |
| go-redis | v9.23.0 | cache laporan memakai `internal/cache` yang sama dengan cache katalog |
| PgBouncer | 1.26.1 (`1.26.1-1.pgdg13+1`, lisensi ISC) | `pgbouncer/Dockerfile`: dasar `postgres:17` dari cache lokal, paket dari `apt.postgresql.org` dengan versi dikunci. Image `api-t5-pgbouncer:1.26.1` 664 MB (dasar 661 MB) |
| Redis | `redis:8-alpine` (8.10.2 saat direkam) | compose `labs/b9-cache`; tag bergerak, versi hanya yang tertulis di sini |
| OpenTelemetry Go | otel, sdk, otlptracehttp v1.47.0; contrib otelhttp v0.72.0 (Apache-2.0) | hanya dipakai `cmd/ledger` dan `cmd/layanan` (lab `t5-service`); proses `api-t5` tidak memuatnya |
| Python | venv `labs/.venv`, psycopg 3.3.6, redis-py 8.1.0 | |

Gerbang pemindai kerentanan ADR 44 (govulncheck, grype) **Tidak dijalankan** di lab ini, karena keduanya butuh unduhan basis data kerentanan. `api-t4` gagal gerbang itu di Go 1.27.1 (10 temuan stdlib yang dipanggil). Yang dicek di sini hanya bahwa Go 1.27.3 ada dan menjalankan semua tes; apakah 1.27.3 menutup temuan itu belum diperiksa.

## Yang berubah dari api-t4

Migrasi baru (di atas `api-t4/migrasi/000020..000023`; `dasar_t5.buat_schema` menjalankan semua file dalam satu transaction):

| File | Isi |
| --- | --- |
| `000024_posting_partisi.up.sql` | `posting` dipartisi per bulan menurut `dibuat`, PK `(id, dibuat)`, trigger ledger dipasang ulang, fungsi `buat_partisi_posting` |
| `000025_tabel_tahap5.up.sql` | delapan tabel baru: `snapshot_saldo`, `arsip_partisi`, `ringkasan_merchant_harian`, `jadwal_cicilan`, `angsuran`, `pengumuman`, `mitra_pos`, `sakelar` |
| `000026_nilai_baru_tahap5.up.sql` | `akun.mitra_pos_id`, `jurnal.referensi` UNIK dengan CHECK bentuk, jenis jurnal `angsuran` dan `tabungan`, jenis buku `tabungan`, outbox `tujuan = stream` dan `jenis = pengumuman` |
| `layanan.sql` | memecah 30 tabel ke enam schema service, role per service, dan menghapus foreign key lintas schema (bukan migrasi: dijalankan sesudah data awal) |

Kode Go: salinan `api-t4` (`cmd/`, `internal/`) dengan modul `lab/apit5`, ditambah `internal/repo/t5.go`, `internal/service/t5.go`, `internal/handler/handler_t5.go`, `cmd/pooler`, dan perluasan `cmd/beban`. `openapi.yaml` v5 menambah empat rute.

Tidak dibawa dari `api-t4`: paket `internal/modul`, `cmd/pembayaran`, `cmd/qrlab`, `cmd/pindairahasia`, `cmd/proxykeluar`, tes bertag `t4modul`, `t4qr`, `t4ssrf`, `t4audit`, dan tiga tes handler yang memakai client ledger `t4-modul`. Itu milik lab Tahap 4 masing-masing dan tetap di `labs/api-t4`. Rekaman `api-t4` (topup, verifikasi, batas, rentan, fitur) tidak diulang; kodenya ikut, dan tes Go-nya berjalan di skema Tahap 5.

## Keputusan desain

- **Satu proses, enam service sebagai paket dan schema.** Pembagian tabel mengikuti tabel "Service (schema)" naskah 3b: ledger 9, akun 5, pembayaran 6, merchant 6, notifikasi 2, cicilan 2. Proses `api-t5` memakai role `t5_app` yang mewarisi keenam role service dan membaca tabel tanpa awalan lewat `search_path` role. `t5-service` memisahkan dua sampai tiga service jadi proses sendiri dengan role sendiri.
- **Nama schema dan role berawalan `t5_`** (`t5_ledger`, `t5_akun`, ...), karena schema dan role bersifat global di database lab bersama. Naskah menulis `ledger`, `akun`, dan seterusnya.
- **Foreign key lintas schema: 18 sebelum, 0 sesudah**, dihitung dari katalog PostgreSQL. 19 foreign key di dalam satu schema tetap. Tahap 4 menghitung 21 untuk enam modul `t4-modul`; pembagian tabelnya berbeda.
- **Partisi `posting`.** Nama partisi relatif terhadap bulan migrasi dijalankan (`posting_bulan_00` sampai `_02`, zona Asia/Jakarta), supaya rekaman sama di bulan mana pun. `posting_sebelum` menampung semua baris sebelum bulan berjalan; ia partisi berbatas, bukan DEFAULT. Tanpa partisi DEFAULT, `DETACH PARTITION ... CONCURRENTLY` tetap boleh dipakai `t5-partisi`. PK `(id, dibuat)` tidak menjaga keunikan `id` lintas partisi: keunikannya datang dari sequence.
- **Buku tabungan adalah buku milik akun.** Saldonya tidak boleh negatif (trigger `cek_saldo_karyawan` diperluas). Karena satu akun kini bisa punya dua buku, semua pencarian "buku utama akun" menambah `jenis <> 'tabungan'` (`Akun`, `KunciBukuAkun`, riwayat, laporan, penerimaan, back office, top-up).
- **Outbox `stream`.** Worker tanpa daftar lajur kini mengklaim hanya `push` dan `verifikasi` (`TujuanSemua`); sebelumnya daftar kosong berarti semua lajur dan akan mengirim baris `stream` sebagai push. Satu pengumuman menulis satu baris `pengumuman` dan satu baris outbox `stream`, bukan satu baris per penerima. Baris `stream` untuk pembayaran dan relay-nya milik `t5-fanout`.
- **Cicilan.** Versi benar (ADR 54): `jurnal.referensi` UNIK `angsuran:<jadwal>:<ke>`, `INSERT ... ON CONFLICT DO NOTHING`, dan status angsuran `menunggu`, `terjurnal`, `dicatat` per langkah. Mode rentan `cicilan-satu-job` (M48) hanya memakai Idempotency-Key 24 jam. Notifikasi "diminta" pada langkah `dicatat` tidak ditulis di sini maupun di `t5-cicilan` (alasannya di `labs/t5-cicilan/README.md`).
- **Laporan merchant dari primary** hanya ada dengan `-rentan laporan-primary` (M40): tanpa mode itu rutenya tidak terdaftar. Versi benar (replica, ringkasan harian) milik `t5-replika`; `ringkasan_merchant_harian` ada sebagai tabel, belum ada yang mengisinya.
- **API untuk mitra POS belum ada.** Tabel `mitra_pos`, `akun.mitra_pos_id`, dan `sakelar` ada; naskah tidak mendefinisikan bentuk endpoint-nya, jadi kontraknya tidak ditulis di `openapi.yaml`. Milik `t5-waf` dan `t5-rollout`.

## Mode rentan

| Mode | Masalah | Perilaku |
| --- | --- | --- |
| `laporan-primary` | M40 | `GET /merchant/{id}/laporan/hari-ini` menjumlah posting hari ini langsung dari `posting` di primary; dengan `-laporan-cache redis` jawaban di-cache selama `-laporan-ttl` (bawaan 30 detik) |
| `cicilan-satu-job` | M48 | job `-cicilan-sampai <tanggal>` menagih angsuran jatuh tempo dengan Idempotency-Key 24 jam sebagai satu-satunya penjaga |
| `riwayat-replika` | M41 | saldo tampil (`GET /akun/{id}`) dan riwayat dibaca dari replica tanpa memeriksa token `X-Lsn-Tulis`; butuh `REPLIKA_DATABASE_URL` dan hanya dipakai lab `t5-replika` |

Tanpa `REPLIKA_DATABASE_URL` jawaban `api-t5` tidak berubah. Dengan replica, jawaban bayar dan kirim memuat `X-Lsn-Tulis`. Saldo tampil dan riwayat memakai replica hanya bila replica sudah memutar WAL sampai token itu (ADR 47; rekaman di `labs/t5-replika/output/baca.txt`).

Mode dari `api-t4` tetap ada dan tidak diubah (`push-dalam-tx`, `kursor`, `ekspor-panic`, `tanpa-shutdown`, `stok-timpa`, `urut-waktu`, `webhook-v1`, `webhook-cek-tulis`, `kartu-tanpa-hold`, `unduh-rentan`, `bo-tanpa-audit`, `verifikasi-tanpa-key`, `berkas-bytea`, `bo-log-biasa`). Job cicilan di lab: `./api-t5 -cicilan-sampai 2026-12-31 [-rentan cicilan-satu-job] [-lab-sekarang <RFC 3339>] [-lab-cicilan-henti N]` (`-lab-cicilan-henti` mematikan proses dengan SIGKILL sesudah N jurnal, lab `t5-cicilan`). Kompensasi satu angsuran terjurnal: `./api-t5 -kompensasi-angsuran <jadwal>:<ke> -kompensasi-oleh <akun admin> -kompensasi-alasan '<minimal 20 karakter>'` (jurnal pembalik dan status `gagal`, lab `t5-cicilan`).

Event pembayaran (lab `t5-fanout`, ADR 51): bendera `-event-pembayaran` membuat `POST /transfers` menulis satu baris outbox bertujuan `stream` (jenis `bayar`, kunci merchant di payload, akun pembayar) di transaction jurnalnya. Tanpa bendera tidak ada yang berubah. Relay, consumer group, dan penyedia push berkuota (`cmd/stream`, `cmd/pushkuota`, `internal/stream`, `internal/notifid`) milik `labs/t5-fanout`; modul Go ini memuat `github.com/twmb/franz-go` v1.22.2 untuk itu.

Job snapshot saldo (lab `t5-partisi`, M43): `./api-t5 -buat-snapshot <YYYY-MM-DD>` menulis saldo akhir satu bulan yang sudah selesai untuk semua buku (`internal/repo/snapshot.go`). `./api-t5 -cek-cache -dari-snapshot [-snapshot-periode <YYYY-MM-DD>]` membaca snapshot terakhir dan posting sesudahnya. `-cek-cache` tanpa tambahan tetap membaca semua posting.

## Menjalankan

```
make -C labs/api-t5 run                      # semua bagian berurutan
make -C labs/api-t5 run BAGIAN=laporan       # satu bagian: skema laporan pooler beban testing
make -C labs/api-t5 beban                    # hanya beban berjadwal
make -C labs/api-t5 cek                      # rekam ulang, lalu output/ dan migrasi/ harus identik dengan yang di-commit
make -C labs/api-t5 kontrak                  # lint OpenAPI (Redocly dari cache npx); oasdiff hanya bila image-nya sudah ada
make -C labs/api-t5 test                     # go vet dan go test; TEST_DATABASE_URL menunjuk schema tahap5_tes
```

Port dasar: API 18310, push tiruan 18311, instance kedua 18312 (dicadangkan), gateway 18313, layanan verifikasi 18314, penerbit kartu 18315, PgBouncer 18316; semuanya ditambah `LAB_PORT_OFFSET`. PostgreSQL dan Redis memakai `LAB_DB_PORT` dan `LAB_REDIS_PORT`. Container PgBouncer bernama `api-t5-pgbouncer-<port>` dan dihapus oleh `run.py` sesudah bagian `pooler`. `api-t5` tidak jalan bersamaan dengan lab Tahap 5 lain yang memakai `dasar_t5.py` dalam satu lajur.

## Rekaman

| File | Bagian | Isi |
| --- | --- | --- |
| `output/skema.txt` | `skema` | 30 tabel; kolom dibandingkan dengan blok mermaid naskah; partisi, trigger, dan aturan ledger di tabel berpartisi; foreign key lintas schema 18 lalu 0; pembagian tabel per service; hak per role (delapan penolakan contoh, lalu semua tabel dan kolom dihitung dari katalog: `t5_app` punya persis hak `api_t5` sebelum dipecah, dan hanya `t5_ledger` punya hak di schema lain); server `api-t5` sebagai `t5_app` di enam schema |
| `output/laporan.txt` | `laporan` | rute laporan hanya dengan mode; hanya pemilik; pembayaran dengan dan tanpa polling 666,7 per detik; cache 30 detik: 0 hit dari 18 untuk satu client per merchant, 9 dari 18 untuk dua client |
| `output/pooler.txt` | `pooler` | 12 client × pool 10 = 120 koneksi: galat 53300 tanpa pooler; tanpa galat lewat PgBouncer, paling banyak 20 koneksi ke PostgreSQL |
| `output/beban.txt` | `beban` | 20.833 permintaan dalam 15 detik pada 1.388,9 per detik; status, jadwal, dan permintaan yang menunggu di pool 10 |
| `output/testing.txt` | `testing` | `go vet` dan `go test -v` dengan PostgreSQL dan Redis; tanpa keduanya tes dilewati; `TES_DB_WAJIB=1` gagal keras |
| `output/kontrak.txt` | `kontrak.sh` | lint Redocly v2.58.2: satu peringatan lama (`/koreksi` tanpa respons 2XX, warisan `api-t4`); oasdiff Tidak dijalankan |

Rekaman dari database bersih, diulang tiga kali (tenang, dengan 10 proses sibuk di samping, tenang lagi) dan identik per byte. Angka yang bergantung mesin (p95, jumlah koneksi, `WaitCount`) hanya diperiksa terhadap batas dan tidak direkam sebagai nilai.

## Yang terbaca dari rekaman

- **M40.** Polling laporan 666,7 per detik dari 9 warung dengan data satu hari menyelesaikan 6.667 dari 6.667 permintaan. Query laporan berjalan di bawah 1 ms di database (batas diperiksa). Selisih p95 pembayaran antara dengan dan tanpa polling bergantung beban mesin dan tidak dijadikan syarat; hitungan naskah (CPU 167%, query 20 ms, 8 vCPU) tetap Hitungan atas Asumsi.
- **Cache laporan.** Satu client per merchant yang memanggil tiap 30 detik mendapat 0 hit dari 18 panggilan (TTL 30 detik, jarak 30,5 detik). Dua client dalam satu jendela mendapat 9 hit dari 18.
- **M46.** Tanpa pooler, 120 koneksi diminta dan sisanya ditolak dengan 53300; yang tersedia untuk role biasa 97 (`max_connections` 100 dikurangi 3 cadangan). Lewat PgBouncer 1.26.1 mode transaction, 120 koneksi client dan 2.400 query selesai tanpa galat. Prepared statement protokol extended berjalan karena `max_prepared_statements = 100`; dengan nilai 0 Tidak dijalankan.
- **Beban.** Pada 1.388,9 per detik semua permintaan selesai (200 atau 201) dan jadwal tidak tertinggal. Pool 10 antre (`WaitCount` lebih dari 0): yang penuh lebih dulu adalah pool satu proses, bukan `max_connections`. p95 antar run berkisar dari beberapa ms sampai sekitar satu detik, jadi batasnya longgar (5.000 ms). Jumlah koneksi di `pg_stat_activity` sempat melewati pool (13 dari pool 10): koneksi yang baru ditutup client belum hilang di server. Ini bukan kapasitas produksi dan bukan kapasitas satu primary.

## Selisih dengan naskah (lab yang benar)

- `outbox` menerima `jenis = pengumuman` dan CHECK mewajibkannya bertujuan `stream`; naskah hanya menulis tujuan `stream`.
- `jurnal.referensi` punya CHECK bentuk `(angsuran|tabungan):<jadwal>:<ke>`.
- Status `jadwal_cicilan` (`aktif`, `selesai`, `dihentikan`) dan batas angka kolom adalah rancangan lab (Asumsi desain); naskah tidak menyebutnya.
- Foreign key lintas schema 18, bukan 21 (angka 21 milik pembagian enam modul Tahap 4).
- Naskah menyebut dua dari tiga pengukuran ADR 45 aturan 5 dikerjakan di sini. Kapasitas satu server diukur sebagai batas (satu proses, pool 10); role per service direkam di `skema.txt`; pool per service tidak diukur karena semua service satu proses.

## Tidak dijalankan atau belum ada

Replica dan jeda baca milik `t5-replika`, relay `stream` dan Kafka milik `t5-fanout`, dan mTLS antar proses milik `t5-service` (sudah ada: ledger sebagai proses sendiri di `cmd/ledger`, mode rentan `ledger-tanpa-identitas`; lihat `labs/t5-service/README.md`). Canary dan kill switch milik `t5-rollout`, kuota per mitra dan WAF milik `t5-waf`, dan arsip terenkripsi milik `t5-kms`. DBOS dan tabel langkah bersaing milik `t5-cicilan`. Gerbang govulncheck dan grype serta oasdiff Tidak dijalankan. Lab ini tidak menguji kapasitas produksi dan tidak mengklaimnya.

## Uji mutasi

Tabel hasil ada di badan PR. Setiap mutan mengubah satu hal di kode, migrasi, atau SQL pembagian. Tes yang relevan berjalan di schema bersih dan harus gagal karena sebab yang diuji. File dikembalikan sesudahnya.
