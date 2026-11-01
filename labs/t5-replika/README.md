# Lab t5-replika · replica streaming, baca sesudah tulis, replica sinkron, dan promosi

Lab Tahap 5 (naskah `plan/CERITA-TAHAP-5.md` bagian 3, 3b, dan tabel "Yang harus bisa dibuktikan lab"). Lab ini menulis ulang `t5-replika` lama (skema saldo, jeda replica 2 detik yang dibuat dengan sengaja) ke skema ledger `labs/api-t5`. Versi lama tetap ada di riwayat git; `replika.txt` lama diganti rekaman baru. Server, skema, data awal, dan generator beban adalah milik `labs/api-t5` (`dasar_t5.py`), bukan salinan. Yang baru di sini adalah kluster replikasi, `run.py`, dan rute baca sesudah tulis di server `api-t5`.

Semua node adalah container lokal tanpa jaringan keluar. Pihak ketiga yang dipanggil server (gateway, layanan push, dan sejenisnya) tidak ikut berjalan: bagian lab ini hanya memakai pembayaran dan bacaan akun. Jaringan hanya dipakai saat membangun: toolchain Go (sekali, lewat proxy modul).

## Topologi

| Node | Container | Port bawaan | Peran | `application_name` |
| --- | --- | --- | --- | --- |
| `primary` | `t5-replika-primary-1` | 54340 (`LAB_REPLIKA_PRIMARY_PORT`) | satu-satunya yang menerima tulisan; berisi schema `api-t5` (30 tabel, enam schema service) | - |
| `replika` | `t5-replika-replika-1` | 54341 (`LAB_REPLIKA_REPLICA_PORT`) | standby asinkron untuk bacaan tampilan dan laporan, role replikasi `replikator_laporan`, slot `slot_laporan` | `replika_laporan` |
| `sinkron` | `t5-replika-sinkron-1` | 54342 (`LAB_REPLIKA_SINKRON_PORT`) | standby yang menjadi sinkron lewat `synchronous_standby_names`, role `replikator_sinkron`, slot `slot_sinkron` | `replika_sinkron` |

Replikasi streaming fisik dengan slot. Standby dibuat dari `pg_basebackup` atas primary yang sudah berisi schema dan data awal, satu per satu (`run.py` menunggu `streaming` di `pg_stat_replication`). Satu role replikasi per standby, supaya satu standby bisa diputus (`ALTER ROLE ... NOLOGIN` lalu `pg_terminate_backend` atas walsender-nya) tanpa menyentuh yang lain. Slot dibuat di `init-primary.sh` supaya primary menyimpan WAL dari awal. `synchronous_standby_names` kosong di awal tiap bagian; bagian `sinkron` dan `promosi` mengisinya dengan `FIRST 1 (replika_sinkron)`.

Kredensial (`lab`/`lab`, `replikator_*`/`lab`) adalah kredensial lab lokal di container yang dibuat ulang tiap rekaman, bukan secret.

## Versi

| Komponen | Versi | Catatan |
| --- | --- | --- |
| PostgreSQL | 17.11 (`postgres:17`, Debian 17.11-1.pgdg13+2) | image sama dengan lab lain, dari cache lokal (661 MB); tidak diganti ke 18 |
| Go | 1.27.3 | toolchain `labs/api-t5/go.mod`; modul Go lab ini adalah modul `api-t5`, tanpa modul baru |
| pgx | v5.11.0 (MIT) | sama dengan `api-t5` |
| Python | venv `labs/.venv`, psycopg 3.3.6 | `run.py` |
| Docker | Engine 28.3.2, Compose v2.38.2 | Docker Desktop |

Dokumentasi PostgreSQL yang dirujuk adalah versi 17 (versi yang dijalankan lab), dibuka 2026-11-02. Patroni dan CloudNativePG **Tidak dijalankan**: tidak ada yang mendeteksi kegagalan atau memanggil `pg_promote()` selain `run.py`. `ANY 1` dari dua kandidat sinkron **Tidak dijalankan**: lab memakai satu kandidat. Jeda antar-wilayah, jaringan antar host, dan penyimpanan terkelola **Tidak dijalankan**.

## Yang ditambah di `api-t5`

Perubahan kode ada di `labs/api-t5` dan hanya aktif bila server dijalankan dengan replica; tanpa itu jawabannya tidak berubah (tes dan rekaman `api-t5` yang ada tidak berubah).

| Bagian | Isi |
| --- | --- |
| `REPLIKA_DATABASE_URL` | DSN replica lewat lingkungan, seperti `DATABASE_URL`. Kosong berarti semua bacaan dari primary |
| `internal/repo/replika.go` | `LSNTulis` (`pg_current_wal_lsn()` di primary) dan `SampaiLSN` (`pg_last_wal_replay_lsn() >= $1::pg_lsn` di replica; NULL dibaca belum sampai) |
| `internal/service/replika.go` | `sumberTampil`: tanpa token replica; dengan token replica hanya bila sudah sampai, selain itu primary; token bukan posisi WAL ditolak 422 sebelum menyentuh database; replica yang tidak menjawab dibaca primary |
| mode rentan `riwayat-replika` (M41) | riwayat dan saldo tampil selalu dari replica, token diabaikan |
| kepala HTTP | jawaban `POST /transfers` dan `POST /kiriman` memuat `X-Lsn-Tulis`; `GET /akun/{id}` dan `GET /akun/{id}/riwayat` menerimanya kembali dan menjawab dengan `X-Dibaca-Dari: primary` atau `replika` |
| `openapi.yaml` | parameter header opsional `X-Lsn-Tulis`, header jawaban opsional, dan jawaban 422 di `GET /akun/{id}` |

Keputusan uang tidak lewat sini: `Bayar`, `Kirim`, dan pemeriksaan saldo memakai primary di dalam transaction (`s.repo`). Bacaan yang dialihkan hanya riwayat dan saldo tampil (`GET /akun/{id}`). Laporan merchant dari replica tidak dikerjakan lab ini. Mode `laporan-primary` dan cache laporan di `api-t5` tidak diubah.

## Menjalankan

```
make -C labs/t5-replika run                     # semua bagian berurutan
make -C labs/t5-replika run BAGIAN=baca         # satu bagian: replika jeda baca sinkron promosi konflik
make -C labs/t5-replika cek                     # rekam ulang, lalu output/ harus identik dengan yang di-commit
make -C labs/t5-replika down                    # hapus kluster lab ini (proyek compose folder ini saja)
```

Tiap bagian membuat kluster dari nol (container, schema, data awal, standby), sekitar 10 sampai 40 detik per bagian; `konflik` menunggu 20 dan 30 detik sungguhan karena nilai bawaan 30 detik tidak diubah. Lajur selain bawaan mengisi tiga variabel port replika dan `COMPOSE_PROJECT_NAME` (`labs/README.md`). Lab ini memakai server dan port `api-t5` (18310 dan seterusnya), jadi tidak jalan bersamaan dengan `api-t5` di lajur yang sama.

## Rekaman

| File | Bagian | Isi |
| --- | --- | --- |
| `output/replika.txt` | `replika` | tiga node dari katalog (`pg_is_in_recovery`, `pg_stat_replication`, slot, penerima WAL); isi ledger sama di tiga node; DML, DDL, `SELECT ... FOR UPDATE`, dan `PREPARE TRANSACTION` ditolak di standby (25006 atau 0A000) dan data tidak berubah |
| `output/jeda.txt` | `jeda` | 100 pembayaran per detik selama 10 detik lewat `api-t5`: jeda replay alami dibaca tiap 20 ms dan hanya diperiksa terhadap batas (1 detik, 16 MiB); jeda buatan (`pg_wal_replay_pause`) memperlihatkan selisih jurnal 5 lawan 0 di satu standby |
| `output/baca.txt` | `baca` | M41: versi pertama (riwayat dan saldo tampil dari replica, token diabaikan) lawan versi benar (token LSN); pembayaran Rp240.000 ditolak walau saldo tampil Rp250.000 |
| `output/sinkron.txt` | `sinkron` | `FIRST 1`; `on` selesai dan `remote_apply` menunggu selagi replay ditahan; selisih median alami; standby sinkron dimatikan, COMMIT menunggu di `SyncRep`, `synchronous_standby_names` dikosongkan melepasnya |
| `output/promosi.txt` | `promosi` | A: replika asinkron dipromosikan sesudah koneksi WAL diputus, lima jurnal yang dijawab 201 tidak ada di node baru, saldo Warung 505 selisih Rp150.000, ledger node baru tetap seimbang, primary lama masih menerima tulisan. B: standby sinkron diputus, COMMIT tidak dijawab ke client, tiga jurnal yang dijawab 201 ada di node baru |
| `output/konflik.txt` | `konflik` | query 3 detik selesai selama konflik; `statement_timeout` 20 detik menghentikan query 45 detik dengan 57014; tanpa timeout konflik membatalkannya dengan 40001 sesudah 30 detik; pencacah `confl_snapshot` di katalog replica 0, 0, 1 |

Rekaman dari database bersih, diulang tiga kali (tenang, dengan proses sibuk di samping, tenang lagi) dan harus identik per byte (hasilnya di badan PR). Posisi WAL disamarkan, dan lama menunggu, jeda replay, dan median commit tidak direkam sebagai nilai: hanya batas dan urutan yang diperiksa lab (gagal keras bila meleset).

## Yang terbaca dari rekaman

- **Standby baca-saja.** UPDATE, INSERT, DELETE, TRUNCATE, CREATE, ALTER, DROP, dan `SELECT ... FOR UPDATE` dijawab 25006; `PREPARE TRANSACTION` juga 25006 ("during recovery"); `SET TRANSACTION READ WRITE` dijawab 0A000. Pesannya milik mode baca-saja standby, bukan milik trigger append-only ledger.
- **Jeda alami.** Pada 100 pembayaran per detik di container lokal, jeda replay tertinggi di bawah 1 detik di kedua standby. Jeda ±2 detik di cerita M41 tidak terjadi dengan sendirinya di laptop lab dan tetap Ilustrasi; yang direkam sebagai peragaan adalah jeda buatan.
- **Baca sesudah tulis.** Tanpa token, replica yang ditahan menjawab saldo lama (Rp250.000) dan riwayat satu baris walau jawaban bayar sudah memuat Rp215.000. Dengan token, server membaca primary sampai replica memutar WAL sampai posisi itu, lalu kembali ke replica. Uang tidak ikut keliru: bayar Rp240.000 ditolak karena saldo di primary Rp215.000.
- **`on` lawan `remote_apply`.** Selagi replay di standby sinkron ditahan, COMMIT `on` selesai dan COMMIT `remote_apply` menunggu di `SyncRep` sampai replay dilanjutkan. Tanpa penahanan, selisih median keduanya di bawah 1 ms di laptop lab, jadi "jeda commit jauh lebih besar" di dokumentasi tidak terlihat sebagai angka di sini. COMMIT dengan standby sinkron lebih lambat dari `local` pada median.
- **Standby sinkron mati.** COMMIT menunggu di `SyncRep` dan barisnya belum terlihat oleh sesi lain di primary. Dokumentasi tidak menyebut batas waktu penantian; lab tidak menunggunya. Mengosongkan `synchronous_standby_names` dan memuat ulang melepasnya. Selama kosong, jaminan standby sinkron tidak berlaku.
- **Promosi asinkron.** Transaksi yang dijawab 201 sesudah koneksi WAL diputus ada di primary lama dan tidak ada di node baru. Jumlahnya adalah yang dijawab sesudah pemutusan (5 di lab), bukan hasil kali jeda dan laju; hitungan naskah 69 transaksi per jeda 1 detik tetap Hitungan atas Asumsi. Node baru tidak rusak: tidak ada buku yang `saldo_cache`-nya berbeda dari jumlah postingnya, dan jumlah semua posting nol. Primary lama tetap menerima tulisan sesudah node baru dipromosikan; lab ini tidak punya fencing.
- **Promosi sinkron.** Dengan standby sinkron yang diputus, COMMIT tidak dijawab ke client. Server melepas penantian saat client pergi, dan PostgreSQL mencatat "canceling wait for synchronous replication due to user request" dengan DETAIL "has already committed locally": jurnal itu ada di primary lama dan tidak ada di node baru, tetapi client tidak pernah menerima 201 untuknya. Ketiga jurnal yang dijawab 201 sebelum pemutusan ada di node baru.
- **Konflik dengan replay.** Dengan bawaan (30 detik, tanpa `statement_timeout`), query yang bentrok dengan WAL pembersihan dibatalkan dengan 40001 sesudah paling sedikit 30 detik, dan replay tertahan selama itu. Dengan `statement_timeout` 20 detik query dihentikan lebih dulu dengan 57014 dan replay menyusul sebelum 30 detik. Query 3 detik tidak dibatalkan. Timeout tidak mencegah pembatalan query yang lama; ia menggantinya dengan pembatalan yang lebih awal.

## Selisih dengan naskah (lab yang benar)

- Naskah M41 menulis jeda ±2 detik (Ilustrasi); jeda alami di lab di bawah 1 detik, dan jeda buatan dipakai untuk peragaan.
- Naskah ADR 46 menulis `statement_timeout` 20 detik "supaya query tidak dibatalkan karena konflik dengan WAL". Rekaman menunjukkan query 45 detik dibatalkan di kedua kasus (57014 pada 20 detik, 40001 pada 30 detik); timeout mempersingkat replay tertahan dan tidak mencegah pembatalan.
- Naskah dan dokumentasi menulis jeda commit `remote_apply` "much larger"; tanpa replay yang ditahan, selisih median di lab di bawah 1 ms.
- Naskah ADR 48 menulis RPO nol dengan replica sinkron. Rekaman mendukungnya untuk transaksi yang dijawab 201, tetapi COMMIT yang penantiannya dibatalkan tetap ter-commit di primary lama dan tidak ada di node baru.
- Naskah ADR 47 menulis "token LSN dari jawaban tulis, dikirim balik app"; bentuk lab adalah kepala `X-Lsn-Tulis` pada bayar dan kirim (rancangan lab, Asumsi desain).
- Naskah M41 menyebut riwayat dan saldo tampil; lab mengalihkan keduanya (`GET /akun/{id}/riwayat` dan `GET /akun/{id}`).

## Uji mutasi

Tes Go di `api-t5` (`internal/service/replika_test.go`): keputusan sumber bacaan dengan replica tiruan (tujuh kasus), penolakan token bukan posisi WAL, pemilik saja, dan SQL `LSNTulis` dan `SampaiLSN` di PostgreSQL. Tabel mutan dan hasilnya ada di badan PR: tiap mutan mengubah satu hal di `internal/service/replika.go`, `internal/repo/replika.go`, `internal/handler/handler_t5.go`, atau `run.py`, dan tes atau rekaman harus gagal karena sebab yang diuji.
