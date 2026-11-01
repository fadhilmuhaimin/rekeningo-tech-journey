# Lab t5-partisi · partisi tabel ledger, snapshot saldo, DETACH dan ATTACH

Lab Tahap 5 untuk masalah M43 dan ADR 49 (naskah `plan/CERITA-TAHAP-5.md` bagian 3, 3b, dan 4). Ia berjalan di atas `labs/api-t5`: server, skema 30 tabel, dan data awal berasal dari sana lewat `dasar_t5.py`, bukan salinan. Tabel `posting` sudah dipartisi per bulan oleh migrasi api-t5. Lab ini mengukur dan merekam akibatnya: pruning, snapshot saldo, pemeriksaan malam, melepas partisi lama, mengarsipkannya, dan memasangnya kembali.

Bagian partisi `labs/t5-skala` (skema saldo lama) hanya jadi pola dan tidak diubah. Tidak ada pihak ketiga. Job dan server memanggil PostgreSQL di mesinmu. Jaringan hanya dipakai saat membangun (toolchain Go lewat proxy modul, sekali).

## Versi

| Komponen | Versi | Catatan |
| --- | --- | --- |
| PostgreSQL | 17.11 (`postgres:17`, Debian 17.11-1.pgdg13+2) | image yang sama dengan lab lain, dari cache lokal |
| Go | 1.27.3 | `labs/api-t5/go.mod`; kepala rekaman memakai versi yang membangun biner |
| pgx | v5.11.0 (MIT) | sama dengan api-t5 |
| psycopg | 3.3.6 | venv `labs/.venv` |
| pg_partman | v5.5.0 | hanya disebut. **Tidak dijalankan**: partisi bulan depan dibuat lewat fungsi `buat_partisi_posting` di migrasi api-t5 |

Dokumentasi dibaca pada versi lab: PostgreSQL 17.11, halaman ALTER TABLE (`postgresql.org/docs/17/sql-altertable.html`, dibuka 2026-11-02) untuk ATTACH PARTITION, DETACH PARTITION CONCURRENTLY, dan CHECK yang menggantikan pemindaian.

## Yang berubah dari api-t5

| File | Isi |
| --- | --- |
| `labs/api-t5/internal/repo/snapshot.go` | `BuatSnapshot` (saldo akhir satu bulan per buku) dan `CekCacheSnapshot` (saldo_cache lawan snapshot + posting sesudahnya) |
| `labs/api-t5/cmd/api/main.go` | job `-buat-snapshot <YYYY-MM-DD>`, dan `-cek-cache -dari-snapshot [-snapshot-periode <YYYY-MM-DD>]`; `-cek-cache` tanpa tambahan tetap versi pertama yang membaca semua posting |
| `labs/api-t5/internal/service/snapshot_test.go` | lima tes Go untuk dua fungsi itu |
| `labs/t5-partisi/dasar.py` | `posting_sebelum` (kosong) diganti partisi bulanan, riwayat posting dihitung dari rumus, pengukur baris yang dibaca |
| `labs/t5-partisi/run.py`, `skala.py`, `lepas.py`, `alat.py` | tiga bagian rekaman: `skala` (`skala.py`), `lepas` (`lepas.py`), dan `testing` (`run.py`); `alat.py` memuat alat bersama |

Migrasi api-t5 tidak diubah. Rekaman api-t5 yang berubah hanya `testing.txt`, karena lima tes baru ikut terdaftar di sana.

## Keputusan desain

- **Snapshot adalah rantai.** Snapshot bulan M = snapshot bulan M-1 + posting bulan M. Snapshot pertama (tanpa pendahulu) menjumlah semua posting sampai akhir bulannya, sekali. `jumlah_posting` adalah banyak posting kumulatif sampai akhir bulan itu. Baris yang sudah ada tidak ditimpa (`ON CONFLICT DO NOTHING`), jadi job aman dijalankan ulang.
- **Hanya bulan yang sudah selesai.** Batas akhir bulan adalah pukul 00.00 WIB tanggal 1 bulan berikutnya. Posting tepat pada batas itu milik bulan berikutnya. Bulan berjalan ditolak (`ErrBulanBelumSelesai`).
- **Snapshot tidak membuktikan dirinya sendiri.** Pemeriksaan malam mempercayai snapshot. Posting yang ditulis terlambat dengan `dibuat` di bulan yang sudah di-snapshot tidak ikut terhitung dan terlihat sebagai selisih. Tes Go merekam kedua arah selisih (positif dan negatif). Pencocokan snapshot dengan hitungan langsung atas tabel posting dikerjakan `run.py` (SQL terpisah dari kode Go).
- **Buku tanpa baris snapshot.** Buku yang dibuat sesudah snapshot dihitung dari posting sesudah batas saja (saldo awal 0).
- **Data riwayat dimuat tanpa trigger.** Pemuatan 1,8 juta posting memakai `session_replication_role = replica` sebagai pemilik schema (superuser lab). Invarian sesudahnya dihitung langsung dari tabel: jurnal tidak seimbang, jurnal tanpa posting, dan karyawan bersaldo negatif harus 0. Aturan ledger yang dijaga trigger diuji terpisah, di partisi hasil ATTACH, sebagai pemilik schema.
- **`posting_sebelum` diganti.** Di api-t5 partisi itu menampung semua bulan sebelum bulan berjalan. Lab ini membuangnya (kosong) dan membuat `posting_lalu_01` sampai `posting_lalu_11` lewat `buat_partisi_posting`, dengan nama relatif terhadap bulan berjalan supaya rekaman sama di bulan mana pun. Di sistem berisi data, baris lama harus dipindahkan per bulan. Itu tidak direkam di sini.
- **Pembanding DELETE memakai tabel uji.** DELETE atas `posting` ditolak ledger. Pembandingnya dua tabel uji (`uji_biasa`, `uji_part`) dengan kolom dan index yang sama dengan `posting`, tanpa trigger ledger. Waktu hanya diperiksa terhadap batas.
- **Arsip belum dienkripsi.** File CSV ada di `$TMP/t5-partisi-arsip-<LAB_DB_PORT>/`. Enkripsi dan baris `arsip_partisi` (kolom `kunci_data_terbungkus` dan `versi_kek` wajib terisi) milik lab `t5-kms`, yang membaca file ini.

## Menjalankan

```
make -C labs/t5-partisi run                 # semua bagian berurutan (±1 menit)
make -C labs/t5-partisi run BAGIAN=lepas    # satu bagian: skala lepas testing
make -C labs/t5-partisi cek                 # rekam ulang, lalu output/ harus identik dengan yang di-commit
```

PostgreSQL lewat `labs/b3-race` (`make -C labs/b3-race up`, dijalankan target `run`). Redis tidak dipakai. Server `api-t5` memakai port dasar 18310 (ditambah `LAB_PORT_OFFSET`) hanya di bagian `lepas`, untuk satu permintaan HTTP. Lab ini tidak jalan bersamaan dengan lab lain yang memakai `dasar_t5.py` dalam satu lajur.

## Rekaman

| File | Bagian | Isi |
| --- | --- | --- |
| `output/pruning.txt` | `skala` | 12 bulan × 150.000 posting di 14 partisi; EXPLAIN untuk satu bulan, tanpa `dibuat`, dan berdasarkan `id`; PK tanpa `dibuat` ditolak; id ganda diterima |
| `output/snapshot.txt` | `skala` | pemeriksaan malam tanpa dan dengan snapshot, baris yang dibaca per job, snapshot dicocokkan dengan hitungan langsung, selisih cache yang sama di kedua pemeriksaan |
| `output/lepas.txt` | `lepas` | DELETE ditolak ledger, DETACH dan DROP hanya dijaga hak, DETACH CONCURRENTLY dan batasnya, DETACH + DROP lawan DELETE, arsip dan pemulihan, pemeriksaan sesudah partisi dilepas, jurnal pembalik atas jurnal yang dilepas |
| `output/pasang.txt` | `lepas` | ATTACH dengan dan tanpa CHECK, aturan ledger di partisi hasil ATTACH (termasuk penjaga TRUNCATE), partisi bulan depan belum ada |
| `output/testing.txt` | `testing` | `go vet` dan tujuh tes Go (lima snapshot, dua partisi) dengan PostgreSQL |

Rekaman dari database bersih. Angka yang bergantung mesin (waktu) tidak direkam: bagian D `lepas` hanya memeriksa batas (DELETE lebih dari dua kali waktu DETACH + DROP). Jumlah baris yang dibaca datang dari `pg_stat_user_tables` (selisih `seq_tup_read` + `idx_tup_fetch` atas partisi posting, dibaca sesudah proses job keluar) dan dibandingkan dengan `count(*)` atas tabel, bukan dari kode lab.

## Yang terbaca dari rekaman

- **Pruning.** Query satu bulan membaca 1 dari 14 partisi. Query tanpa `dibuat` membaca 14 dari 14, termasuk dua partisi kosong (di partisi sebesar ini PostgreSQL memilih Parallel Append). Mencari satu baris dengan `id` saja memeriksa index primary key di semua partisi.
- **PK `(id, dibuat)`.** `UNIQUE (id)` ditolak (0A000). Satu `id` yang sama muncul tiga kali dalam satu transaction yang dibatalkan: keunikan `id` hanya datang dari sequence.
- **Pemeriksaan malam.** Tanpa snapshot: 1.800.000 baris dari 1.800.000. Dari snapshot terakhir: 150.000, yaitu 8,3% (satu bulan dari 12). Dengan snapshot tiga bulan lalu: 450.000. Tiap job snapshot membaca persis satu bulan (150.000). Kedua pemeriksaan menandai buku yang sama dengan selisih yang sama.
- **Retensi memaksa snapshot.** Sesudah satu partisi dilepas, pemeriksaan tanpa snapshot menandai semua buku yang saldonya ada di partisi itu (10.061 dari 10.288). Pemeriksaan dari snapshot tetap 0 selisih.
- **DETACH.** `CONCURRENTLY` ditolak di dalam blok transaction (25001) dan bila ada partisi DEFAULT (55000). Tabel yang dilepas mendapat CHECK yang setara batas partisi, dan kehilangan tiga trigger ledger baris demi baris. Role aplikasi tidak bisa DETACH atau DROP (42501).
- **ATTACH.** Tabel pulih tanpa CHECK dipindai (`verifying table`). Dengan CHECK berbatas literal yang sama dengan `FOR VALUES`, batas partisi tidak dipindai. Foreign key tetap divalidasi untuk tabel pulih. Tabel asal yang dilepas DETACH CONCURRENTLY dipasang kembali tanpa keduanya.
- **Penjaga TRUNCATE.** Trigger TRUNCATE dipasang per partisi oleh `buat_partisi_posting` dan tidak ikut ke partisi hasil ATTACH dari tabel baru: pemilik schema bisa mengosongkannya sampai penjaganya dipasang.
- **Jurnal pembalik.** Jurnal yang postingnya sudah dilepas dijawab 500 oleh API. Penyebabnya, menurut log server, jurnal pembalik tanpa posting ditolak saat COMMIT oleh aturan jurnal seimbang (23514). Tidak ada jurnal pembalik yang tertinggal.
- **Bulan depan.** INSERT dengan `dibuat` di bulan tanpa partisi ditolak (23514, `no partition of relation "posting" found for row`). Jam diperankan dengan `dibuat` eksplisit.

## Selisih dengan naskah (lab yang benar)

- Naskah menulis query tanpa `dibuat` memindai semua partisi (Parallel Append). Lab merekam Parallel Append dengan 150.000 posting per bulan, supaya tiap partisi lebih besar dari `min_parallel_table_scan_size` (8 MB). Dengan 120.000 posting per bulan, partisi berukuran 8.192.000 byte dan pemeriksaan ukuran di lab gagal; rencana yang dipilih pada ukuran itu tidak diperiksa.
- Naskah menulis `DETACH CONCURRENTLY` menambahkan CHECK itu sendiri dan arsip yang dipulihkan ke tabel baru tidak memilikinya. Keduanya terekam. Lab menambah dua hal. Foreign key ke `jurnal` dan `buku` tetap divalidasi saat ATTACH tabel pulih. Tabel pulih juga harus membawa CHECK bawaan `jumlah <> 0`, tanpa itu ATTACH ditolak (42804).
- Naskah menulis jurnal pembalik atas jurnal yang diarsipkan "tidak bisa dibuat dari database utama". Lab merekam bentuknya: API menjawab 500, bukan 4xx, dan database menolak.
- Naskah belum menyebut dua akibat. Tabel yang dilepas tidak lagi dijaga trigger append-only, hanya hak akses yang menjaganya. Penjaga TRUNCATE tidak ikut ke tabel hasil pemulihan.
- Posting per bulan di lab (150.000) lebih kecil dari 36,5 juta di naskah. Angka bulan dan baris di naskah tetap Hitungan atas Asumsi.

## Tidak dijalankan atau belum ada

pg_partman v5.5.0, `DETACH ... FINALIZE`, partisi `jurnal`, validasi foreign key tanpa pemindaian (`NOT VALID` lalu `VALIDATE`), pemulihan arsip terenkripsi (lab `t5-kms`), pengiriman arsip ke penyimpanan objek, dan skala produksi (36,5 juta posting per bulan).

Lab ini tidak mengklaim kapasitas tulis satu primary: partisi tidak menambahnya.

## Uji mutasi

Tabel hasil ada di badan PR. Tiap mutan mengubah satu hal di `snapshot.go` atau `main.go`. Tes Go atau bagian `skala` harus gagal karena sebab yang diuji. File dikembalikan sesudahnya.
