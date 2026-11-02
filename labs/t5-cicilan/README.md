# Lab t5-cicilan · batch harian tahan crash, referensi unik, kompensasi, dan DBOS Go

Lab Tahap 5 untuk M48 dan ADR 54 (naskah `plan/CERITA-TAHAP-5.md` bagian 3, 3b, dan 4). Ia berbagi `labs/api-t5` lewat `dasar_t5.py`, bukan salinan: server, skema, job cicilan (`./api-t5 -cicilan-sampai`), dan data awal milik api-t5. Yang baru di lab ini: satu perbaikan urutan di `jurnalAngsuran`, empat tes Go, SIGKILL sungguhan pada `-lab-cicilan-henti`, job kompensasi angsuran, program pembanding DBOS Go (`dbos/`, modul Go sendiri), dan enam rekaman.

Tidak ada pihak ketiga dan tidak ada container milik lab ini: PostgreSQL datang dari `labs/b3-race` (lajur kerja memilih portnya lewat `labs/lab_env.*`), dan semua proses (job api-t5, program DBOS) berjalan di mesinmu. Jaringan hanya dipakai saat membangun: `go mod tidy` atas modul `dbos/` mengunduh DBOS Go dan modul turunannya dari `proxy.golang.org` (sekali).

## Versi

| Komponen | Versi | Catatan |
| --- | --- | --- |
| Go | 1.27.3 | toolchain `api-t5` dan modul `dbos/` (`go 1.27.3`); seluruh tes dan rekaman berjalan di 1.27.3 |
| PostgreSQL | 17.11 (`postgres:17`, Debian 17.11-1.pgdg13+2) | database bersama lab, seperti `api-t5` |
| DBOS Go | `github.com/dbos-inc/dbos-transact-golang` v1.8.0 | `proxy.golang.org` (`go list -m -json`, dicek 2026-11-02): terbit 2026-10-28. File `LICENSE` modul: MIT License. Modul ini sendiri meminta Go 1.25.0 dan toolchain 1.26.10. Dependency langsungnya: pgx v5.10.0 (modul pembanding memakai v5.11.0, sama dengan api-t5), google/uuid, robfig/cron, spf13/cobra dan viper, modernc.org/sqlite. Sumber jaminan langkah: godoc modul v1.8.0 (`dbos/workflow.go`, `dbos/datasource.go`), bukan situs dokumentasi |
| pgx | v5.11.0 | di `api-t5` dan di `dbos/go.mod` |
| Python | venv `labs/.venv`, psycopg 3.3.6 | |

Temporal v1.32.1 hanya disebut di naskah; dokumentasinya tidak dibuka dan tidak dijalankan. Gerbang pemindai kerentanan ADR 44 (govulncheck, grype) **Tidak dijalankan** di lab ini, seperti di `api-t5`: modul DBOS dan turunannya belum dipindai.

## Yang berubah di api-t5

| File | Isi |
| --- | --- |
| `internal/service/t5.go` | `jurnalAngsuran` membaca referensi jurnal sesudah buku dikunci (sebelumnya sebelum). `HasilCicilan.Dihentikan`. `KompensasiAngsuran`. Wilayah bertanda untuk hitungan kode (`langkah-tabel`, `kompensasi`) |
| `internal/repo/t5.go` | `AngsuranKunci` dan `AngsuranGagalSesudahBalik` (satu transaction dengan jurnal pembalik). Wilayah `langkah-tandai` |
| `cmd/api/main.go` | `-lab-cicilan-henti N` kini mematikan proses dengan SIGKILL (dulu keluar normal dengan kode 0). Bendera job `-kompensasi-angsuran <jadwal>:<ke>`, `-kompensasi-oleh`, `-kompensasi-alasan` |
| `internal/service/cicilan_serentak_test.go` | empat tes: dua job serentak yang berebut buku, versi pertama serentak dalam 24 jam, kompensasi lewat jurnal pembalik, kompensasi yang ditolak constraint |

Tes lain api-t5 tidak diubah. `labs/api-t5/output/testing.txt` memuat daftar semua tes modul dan direkam ulang bila tes baru masuk; lihat badan PR untuk hasil `make -C labs/api-t5 cek`.

## Keputusan desain

- **Referensi dibaca sesudah buku dikunci.** Dua job yang sudah membaca daftar angsuran yang sama berebut buku. Yang kalah, sesudah pemenang commit, membaca saldo yang sudah berkurang. Bila referensi dibaca sebelum kunci, ia melihat "tidak ada jurnal", lalu `saldo kurang`, lalu menandai angsuran yang sudah dibayar sebagai `gagal`. Tes `TestCicilanDuaJobSerentakPeriksaReferensiSesudahKunciBuku` merah di kode lama (jurnal baru 1, jurnal sudah ada 0, gagal 1) dan hijau sesudah perbaikan. Syarat kejadiannya: saldo hanya cukup untuk satu angsuran dan dua job membaca daftar sebelum satu pun commit.
- **Job dimatikan SIGKILL sungguhan.** Sebelumnya `-lab-cicilan-henti` mengembalikan hasil dan keluar normal. Sekarang proses mengirim sinyal 9 ke dirinya sendiri tepat sesudah jurnal di-commit dan sebelum angsurannya ditandai, tanpa defer dan tanpa keluaran (pola `labs/t4-modul`). `time.Sleep` menggantikan `select {}`: dengan `select {}` proses sempat mencetak `fatal error` (deteksi deadlock Go) sebelum sinyal 9 sampai, dan rekaman menuntut keluaran kosong.
- **Jam ledger diperankan, 24 jam tidak ditunggu.** Hanya versi pertama (`cicilan-satu-job`) membaca jam, lewat `-lab-sekarang`: Idempotency-Key bernilai 24 jam dari jam itu. Versi benar tidak membaca jam.
- **Tiga cara menjalankan satu alur di DBOS Go**, semuanya atas ledger yang sama (fungsi SQL `tulis_jurnal_angsuran` milik pembanding, memakai tabel jurnal, posting, dan buku api-t5): `step` (`RunAsStep`, jurnal tanpa referensi), `step-referensi` (`RunAsStep`, referensi `angsuran:<jadwal>:<ke>`), dan `transaksi` (`RunAsTransaction`: jurnal dan catatan selesainya satu transaction di database aplikasi). ID workflow = `angsuran:<jadwal>:<ke>`. Modul pembanding terpisah supaya `go.mod` api-t5 tidak memuat DBOS.
- **Titik mati dalam program DBOS.** `-mati dalam-langkah` mematikan proses di dalam langkah jurnal; `-mati antar-langkah` mematikan proses sesudah langkah jurnal tercatat dan sebelum langkah penanda. Titik pertama berarti lain di tiap varian: di `step` ledger sudah di-commit, di `transaksi` belum.
- **Kompensasi.** Angsuran `terjurnal` yang tidak bisa diselesaikan dibatalkan dengan jurnal pembalik atas jurnal angsuran dan status `gagal`, dalam satu transaction. Kolom `jurnal_id` dikosongkan karena CHECK `angsuran_jurnal_sesuai_status`; jurnal asal tetap terbaca lewat `referensi`. Hanya admin, alasan minimal 20 karakter, dan jurnal yang sudah dibalik tidak dibalik lagi. Lab ini tidak punya langkah akhir yang bisa gagal permanen: keadaan `terjurnal` dipasang langsung di database dan yang direkam adalah mekanisme kompensasinya.
- **Hitungan kode dari wilayah bertanda.** `// --8<-- [start:x]` sampai `[end:x]`; baris kosong, komentar, baris `// lab` (suntikan mati), dan baris `// rentan` (cabang versi pertama) tidak dihitung. Penulis jurnal, daftar angsuran jatuh tempo, dan bendera tidak dihitung di kedua sisi.

## Menjalankan

```
make -C labs/t5-cicilan run                  # semua bagian berurutan
make -C labs/t5-cicilan run BAGIAN=crash     # satu bagian: crash serentak langkah kompensasi laju testing
make -C labs/t5-cicilan cek                  # rekam ulang, lalu output/ harus identik dengan yang di-commit
make -C labs/t5-cicilan test                 # tes Go cicilan dan kompensasi (TEST_DATABASE_URL menunjuk schema tes)
```

Port: API 18310 (api-t5, dipakai bagian yang membuat jadwal lewat `POST /cicilan`) ditambah `LAB_PORT_OFFSET`; PostgreSQL memakai `LAB_DB_PORT`. Schema `tahap5_cicilan`, `tahap5_cicilan_tes`, dan `tahap5_cicilan_dbos` (tabel sistem DBOS dan `transaction_completion`). `api-t5` dan lab ini tidak jalan bersamaan dalam satu lajur yang sama.

## Rekaman

| File | Bagian | Isi |
| --- | --- | --- |
| `output/crash.txt` | `crash` | A: versi pertama, job dimatikan sesudah jurnal, diulang 23 jam (satu jurnal, angsuran tetap `menunggu`), diulang 25 jam (dua jurnal, saldo Budi Rp250.000 menjadi Rp50.000). B: versi benar, diulang kapan saja: satu jurnal, `dicatat`. C: INSERT langsung dengan referensi yang sama ditolak `jurnal_referensi_key` |
| `output/serentak.txt` | `serentak` | A: dua job serentak atas 24 angsuran (jumlah gabungan, 24 referensi berbeda). B: dua job dipaksa menunggu di lock yang sama, saldo cukup untuk satu angsuran: jurnal baru 1, jurnal sudah ada 1, gagal 0. C: versi pertama, dua job dalam 24 jam: satu jurnal dan satu dilewati |
| `output/langkah.txt` | `langkah` | tabel langkah lawan DBOS (tiga cara, dua titik mati): jurnal akhir, saldo, status; baris kode; tabel dan baris di schema DBOS |
| `output/kompensasi.txt` | `kompensasi` | angsuran `terjurnal` dikompensasi: bukan admin ditolak, jurnal pembalik, saldo kembali, kompensasi kedua ditolak, job tidak menagih angsuran `gagal` |
| `output/laju.txt` | `laju` | 2.000 angsuran satu job: semua dicatat, 2.000 referensi berbeda, tak ada jurnal tak seimbang; laju sebagai batas 20 per detik; hitungan 13.333 ÷ 20 |
| `output/testing.txt` | `testing` | `go vet` api-t5 dan pembanding, tes cicilan dan kompensasi dengan PostgreSQL (`TES_DB_WAJIB=1`), versi dan lisensi DBOS |

Rekaman dari database bersih, diulang tiga kali (tenang, tenang lagi, dan dengan 12 proses sibuk di samping) dan identik per byte. Waktu, laju, dan pembagian kerja antar dua job tidak direkam sebagai nilai: yang direkam hitungan, status, saldo, urutan, jumlah gabungan, dan batas yang diperiksa ("ya").

## Yang terbaca dari rekaman

- **M48 terulang di versi pertama.** Job yang dimatikan di antara jurnal dan penanda, diulang 25 jam kemudian, menjurnal angsuran yang sama lagi. Dengan angsuran Rp100.000 dan saldo Rp250.000, saldo berkurang Rp200.000 dan Warung Ani menerima Rp200.000. Diulang 23 jam kemudian, jurnalnya tetap satu, tetapi angsuran itu dilewati dan statusnya tetap `menunggu`.
- **Versi benar tahan crash.** Dengan `referensi` unik, ulangan kapan saja menemukan jurnal yang sudah ada dan hanya menandai angsurannya. Jam tidak berperan, dan job ketiga tidak mengerjakan apa pun.
- **Dua job serentak tidak menagih dua kali** dalam kondisi yang dicoba: satu PostgreSQL, buku dikunci urut id, saldo cukup (bagian A) atau cukup untuk satu angsuran (bagian B). Pembagian kerja antar dua job tidak diatur: keduanya membaca seluruh daftar.
- **DBOS RunAsStep tanpa referensi menagih dua kali** bila proses mati di dalam langkah jurnal sesudah ledger di-commit: godoc v1.8.0 menyebut langkah at-least-once, dan langkah baru dicatat sesudah fungsinya kembali. Mati di antara dua langkah tidak menagih dua kali, karena langkah jurnal sudah tercatat. `RunAsStep` dengan referensi unik dan `RunAsTransaction` menghasilkan satu jurnal di kedua titik.
- **Hasil sama, ukuran berbeda.** Di tiga cara yang aman hasil akhirnya sama (satu jurnal, saldo berkurang Rp100.000, `dicatat`). Baris kode yang dihitung: tabel langkah 56, DBOS `RunAsStep` 59, `RunAsTransaction` 54, jadi hampir sama. Yang berbeda adalah baris yang disimpan: tabel langkah tidak menambah tabel atau baris, DBOS menyimpan 5 baris sistem per angsuran (`workflow_status`, `workflow_input`, `workflow_output`, dan dua baris `operation_outputs`) dalam 15 tabel di schemanya sendiri, ditambah satu baris `transaction_completion` per langkah `RunAsTransaction`.
- **Laju.** Satu job menyelesaikan 2.000 angsuran di laptop lab di atas batas 20 per detik. 13.333 angsuran per hari puncak ÷ 20 per detik = 667 detik adalah Hitungan atas Asumsi naskah; lab tidak membatasi laju job pada 20 per detik.

## Selisih dengan naskah (lab yang benar)

- Naskah M48 menulis ulangan dalam 24 jam aman karena key ledger menahan jurnal kedua. Rekaman membenarkan satu jurnal, tetapi angsuran yang dilewati tetap `menunggu`.
- Naskah menulis angsuran Rp200.000 dan saldo Budi berkurang Rp400.000 (Ilustrasi). Data awal memberi karyawan saldo Rp250.000 dan database menolak saldo karyawan negatif, jadi lab memakai Rp100.000 per angsuran.
- Naskah ADR 54 menulis job mengklaim per baris (ADR 24). Job di api-t5 tidak memakai `klaim_sampai`: ia membaca daftar lalu mengunci buku per angsuran. Dua job serentak aman karena referensi unik dan kunci buku, tetapi mengerjakan daftar yang sama dua kali.
- Naskah menulis job berjalan pada 20 per detik (Asumsi). Job api-t5 tidak punya pembatas laju.
- Naskah menulis jumlah baris dan kode yang harus ditulis berbeda antara tabel langkah dan DBOS. Kodenya hampir sama (56 lawan 54 sampai 59); bedanya baris yang disimpan (0 lawan 5 per angsuran).
- Naskah menulis kolom solusi M48 "Idempotency-Key = `angsuran:<jadwal_id>:<ke>`", sedangkan ADR 54 menulis referensi berbeda dari Idempotency-Key. Versi benar di lab hanya memakai `jurnal.referensi` dan tidak menyentuh `kunci_idempotensi`.

## Tidak dijalankan atau belum ada

Notifikasi "diminta" pada langkah `dicatat` tidak dibangun (nilai `jenis` outbox untuk angsuran tidak ada, dan menambahnya mengubah migrasi bersama api-t5): "dua notifikasi" di M48 tetap Ilustrasi. Langkah akhir yang gagal permanen sungguhan tidak ada (kompensasi diperagakan dari keadaan `terjurnal` yang dipasang langsung). Kompensasi atas merchant yang sudah dibekukan sesudah menerima tidak dijalankan. Temporal, dan pengaturan retensi tabel DBOS, tidak dibuka. Beberapa instance job di mesin berbeda dan jam sistem yang berbeda tidak diperankan: jam hanya diperankan di versi pertama. Gerbang govulncheck dan grype Tidak dijalankan. Lab ini tidak mengklaim kapasitas produksi.

## Uji mutasi

Tabel hasil ada di badan PR. Setiap mutan mengubah satu hal di kode api-t5, program DBOS, atau lab ini; tes Go atau `make run` harus gagal karena sebab yang diuji. File dikembalikan sesudahnya.
