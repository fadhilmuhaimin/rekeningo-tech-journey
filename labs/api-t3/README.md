# Lab api-t3 · api-t2 naik ke enam kota

Lab utama Tahap 3 (`plan/CERITA-TAHAP-3.md`, keputusan 950 sampai 954). Kodenya berangkat dari `labs/api-t2`: monolith Go yang sama, tiga lapisan (`internal/handler`, `internal/service`, `internal/repo`), satu PostgreSQL.

Yang baru: pemberitahuan lewat outbox, worker di proses sendiri, katalog dan stok per kota, promo dari HR, sinkron offline, dan sesi dasbor web. Layanan push adalah tiruan lokal. Skema lab ini adalah sumber ERD Tahap 3. Lab Tahap 3 berikutnya memakai server dan data yang sama lewat `dasar_t3.py`, bukan salinan.

## Menjalankan

```bash
make lab-up                                   # dari akar repo: PostgreSQL 17 lab di LAB_DB_PORT
make -C labs/api-t3 run                       # semua bagian, ±40 detik, menulis labs/api-t3/output/*.txt
make -C labs/api-t3 run BAGIAN=outbox         # satu bagian: skema outbox push rentan katalog sinkron web testing
make -C labs/api-t3 cek                       # rekam ulang; gagal bila output/ berbeda dari yang di-commit
make -C labs/api-t3 kontrak                   # lint dan oasdiff terhadap api-t2 (butuh jaringan dan Docker)
```

Lajur kerja lain memakai `COMPOSE_PROJECT_NAME`, `LAB_DB_PORT`, dan `LAB_PORT_OFFSET` (`labs/README.md`). Port dasar: API 18180, layanan push tiruan 18181, instance kedua 18182 (dipakai `t3-instance`, jadi dua lab itu tidak jalan bersamaan dalam satu lajur). Rekaman selalu memakai port dasar.

Setiap bagian membuat ulang schema `tahap3` dan data awalnya dari nol, jadi `output/*.txt` tidak bergantung pada urutan bagian. Token, waktu, tanggal, dan `notifikasi_id` disamarkan, sehingga rekaman ulang identik per byte. Lab gagal keras bila port dipakai proses lain atau hasilnya meleset dari yang diharapkan.

| Rekaman | Isi | Halaman |
|---|---|---|
| `skema.txt` | Migrasi 000015 sampai 000019 di atas akhir Tahap 2, kolom lawan blok mermaid naskah 3b, data awal, aturan yang ditolak database | 3.5 |
| `outbox.txt` | Jurnal dan baris outbox satu transaction, worker, kelas, COMMIT ditolak, worker mati di tengah | 3.3, 3.4, 3.9 |
| `push.txt` | Layanan push lambat, 503, token mati, menggantung; retry, jitter, dead-letter | 3.9, 3.13 |
| `rentan.txt` | Mode rentan `push-dalam-tx` (M18), `kursor` (M19), `urut-waktu` (M27) | 3.6, 3.10, 3.26 |
| `katalog.txt` | Katalog per kota, promo, harga dari database, ubah bersyarat versi, catatan, laporan CSV | 3.3, 3.19 |
| `sinkron.txt` | Perangkat, sinkron offline sekali per kunci, konflik versi, retensi 14 hari | 3.20, 3.21 |
| `web.txt` | Sesi dasbor: cookie `__Host-`, token CSRF, jalur app dan web terpisah | 3.22, 3.23 |
| `testing.txt` | `go vet`, tes Go dengan dan tanpa PostgreSQL, `TES_DB_WAJIB` | 3.27 |
| `kontrak.txt` | Lint OpenAPI dan perubahan yang merusak client dibanding api-t2 (`make kontrak`) | 3.3 |

## Yang berubah dari api-t2

- **Migrasi** `migrasi/000015` sampai `000019`: `kota`, `akun.kota_id` (boleh kosong) dan jenis `hr`, `sesi.jenis` dan `csrf_hash`, `perangkat`, `outbox`, `produk`, `promo`, `operasi_sinkron`. Naskah 3b menulis "di atas 000013"; 000014 sudah ada, jadi nomornya mulai 000015. Akhir Tahap 2 dibangun dari file api-t1 dan api-t2 yang sama, tanpa salinan. Migrasi tidak menyebut nama schema, supaya `tools/erd.py` bisa membacanya.
- **Jalur uang** (`Bayar`, `Kirim`, `Topup`, `Pesan`) menulis jurnal, posting, dan satu baris outbox di transaction yang sama (ADR 23). Tidak ada panggilan jaringan di dalam transaction (ADR 22).
- **Worker** (`-peran worker`): mengklaim baris dengan `FOR UPDATE SKIP LOCKED` dan batas klaim (ADR 24), lalu mengirim `c` pesan serentak. Retry memakai backoff dan jitter, lima percobaan lalu dead-letter (ADR 25). `-sekali` mengirim semua yang siap lalu keluar.
- **Pool 10** ditulis di `cmd/api/main.go` (`SetMaxOpenConns(10)` dan `SetMaxIdleConns(10)`, flag `-pool`). Dokumentasi `database/sql` (Go 1.27.3, dibuka 2026-10-25) menulis batas koneksi terbuka bawaannya 0, tanpa batas, dan koneksi menganggur bawaannya 2. api-t2 memakai bawaan itu. `idle_in_transaction_session_timeout` 5 detik (bawaan PostgreSQL 0, mati; dokumentasi 17, dibuka 2026-10-25) dikirim sebagai parameter koneksi (`-idle-tx`), client push berbatas 3 detik (`-push-timeout`).
- **Catatan** pada pembayaran dan transfer: paling banyak 100 karakter, tanpa karakter kontrol, disimpan apa adanya di `jurnal.keterangan`.
- **Endpoint baru** (contract di `openapi.yaml`): `POST /perangkat`, `GET /katalog`, `POST /pesanan`, `PATCH /produk/{id}`, `GET` dan `POST /promo`, `POST /sinkron`, `POST /web/login`, `GET /warung/{id}/laporan.csv`, `GET /warung/{id}/penerimaan`.

## Mode rentan

Seperti `api-t1`: satu flag `-rentan` menyalakan versi yang salah untuk rekaman halaman masalah. Tanpa flag, server berperilaku benar.

| Mode | Masalah | Efek |
|---|---|---|
| `push-dalam-tx` | M18 | Push dipanggil di dalam transaction dengan client tanpa batas waktu; tanpa baris outbox. Bila `-push-timeout` atau `-idle-tx` diisi eksplisit, nilai itu tetap dipakai (varian "timeout tetapi tetap di dalam transaction") |
| `kursor` | M19 | Worker membaca dengan kursor `(dibuat, id)` tanpa klaim, meniru ADR 16 |
| `urut-waktu` | M27 | Worker mengklaim menurut nomor saja, tanpa kelas |
| `ekspor-panic` | M21 | Goroutine latar (`service.Latar`) tanpa pelindung `recover`, dan ringkasan audit ekspor mengira laporan tidak pernah kosong: laporan kosong mematikan seluruh proses |
| `tanpa-shutdown` | M21 | Tanpa `signal.Notify`: SIGTERM mengakhiri proses seketika, request yang sedang jalan putus |

Flag untuk `t3-instance`: `-instance <nama>` (header `X-Instance`), `-redis <alamat>` dan `-redis-timeout` (batas login per IP dan per akun dihitung di Redis, bukan di memori proses; ADR 27). `GET /healthz` menjawab 200 bila database menjawab dalam 1 detik; itu endpoint operasi untuk proxy dan tidak ada di OpenAPI app. Dengan `-lab` ada juga `GET /lab/lambat?ms=`, `GET /lab/panik?di=handler|latar`, dan `GET /lab/batas`.

Flag lab lain: `-lab` (`GET /lab/pool`, `GET /lab/outbox`), `-jam-lab` (jam dibekukan untuk rate limit), `-klaim`, `-serentak`, `-backoff`, `-maks-percobaan`, dan `-selang`. Dua flag untuk rekaman M20: `-lab-henti-sebelum-tandai` (worker berhenti sesudah push berhasil) dan `-satu-putaran` (dengan `-sekali`: satu putaran saja, supaya jumlah percobaan per panggilan tetap).

## Data awal

`./api-t3 -seed` mengisi schema kosong sebagai pemilik schema, tanpa lewat service. Isinya:

- Enam kota: Jakarta, Bandung, Surabaya, Medan, Semarang, Makassar. Naskah tidak menyebut nama kota.
- 10.000 karyawan: 1.000 di kota pertama, 1.800 di tiap kota lain.
- 60 warung: 12 di kota pertama, 48 di lima kota lain (Asumsi naskah).
- Satu admin, satu akun `hr` per kota, 2.400 produk (40 per warung), dan 10.060 perangkat (satu per karyawan dan warung).
- Tunjangan Rp250.000 per karyawan lewat 10.000 jurnal. Tidak ada baris outbox yang menunggu.

Tokoh dan nomor akun sama dengan Tahap 2: Dimas 417, Warung Ani 418, Budi 419, Warung Sari 502, Warung Mie Pak Joko 503, Citra 504. Password semua akun adalah `sementara-tahap-3` (data lab, bukan secret).

## Dipakai lab lain

`dasar_t3.py` menyediakan `buat_schema(nama)`, `seed()`, `bangun()`, `mulai_api(args)`, `mulai_push()`, `mulai_worker(nama, args)`, `worker(args)`, `curl(...)`, `login(...)`, `push_mode(...)`, `push_diterima()`, `tunggu(kondisi, apa)`, `samarkan(...)`. Lab Tahap 3 lain menulis `sys.path.insert(0, ".../api-t3"); import dasar_t3 as d`, lalu menambah bagian rekamannya sendiri di atas server ini. Mode rentan baru ditambah di `cmd/api/main.go` dan `internal/service`.

## Yang belum ada di lab ini

- Rate limit lintas instance: tanpa `-redis`, batas login masih token bucket di memori proses, sama dengan api-t2. Dengan `-redis`, hanya login yang berpindah ke Redis; penahan `/kiriman` tetap di memori. Rekamannya di `labs/t3-instance`.
- Trace, metric, dan OpenTelemetry: `t3-pool`. Log berupa baris teks.
- `LISTEN` dan `NOTIFY` sebagai pembangun worker, laju promo paling banyak 5 per detik, retensi outbox di luar job `-bersih`: `t3-outbox`.
- Passkey, CSP, dan halaman HTML dasbor: `t3-dasbor`. Lab ini hanya menyediakan sesi web dan CSRF di sisi API.
- Satu baris outbox dikirim ke semua perangkat aktif penerima. Bila satu perangkat gagal sementara, seluruh baris diulang dan perangkat yang sudah menerima menyaring `notifikasi_id`.
- Endpoint `/perangkat`, `/pesanan`, `/promo`, dan `/sinkron` belum punya rate limit sendiri; hanya login, ganti password, dan kiriman yang punya (keputusan 645).
- Pembayaran dari queue offline tidak ada: `POST /sinkron` menolak jenis pembayaran.
- Versi app per endpoint (3.0 notifikasi, 3.1 rilis M26) belum ada di naskah, jadi contract tidak mencatatnya.
