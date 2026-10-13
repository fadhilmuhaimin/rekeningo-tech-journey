# Setelah Tahap 2

Polesan dan pencegahan dari tinjauan lab dan halaman Tahap 2 yang sengaja tidak dikerjakan saat itu (lingkup Tahap 2 dibekukan sejak awal, ANTREAN bagian Tahap 2). Yang masuk ANTREAN hanya kategori rusak, aksesibilitas, kontras, atau gerbang yang gagal.

## Temuan polesan dari lab-b3-ledger (#254, keputusan 400–407)

- `buku.akun_id` dan `buku.jenis` tidak dikunci, padahal mengubah `jenis` melewati invarian 3. Usul: role app hanya boleh UPDATE `(saldo_cache, versi)`, atau trigger penolak.
- `migrasi_v1.sql` menulis nama `b3_ledger_v1` langsung; migrasi in-place bentrok nama tabel `akun`; tanpa LOCK tabel v1, tulisan bersamaan membuat migrasi gagal di cek langkah 6 (data tidak rusak).
- Biaya invarian 3 tumbuh dengan riwayat: setiap posting keluar menjumlah semua posting buku itu. Data besar (b2-query) dimuat dengan trigger dimatikan atau lewat snapshot saldo.
- Kepala rekaman mencetak versi server dari image `postgres:17` yang tidak di-pin (sama dengan b3-race); "read committed" ditulis tetap, tidak dibaca dari server.
- `make cek` tidak mendeteksi file output baru yang belum di-track.
- Frasa "pemilik tabel dan superuser" di skema dan `invarian.txt` sebaiknya menyebut `session_replication_role` butuh superuser atau hak SET; waktu `dibuat` koreksi v1 hanya tersisa di tabel v1.
- [perlu verifikasi] Fungsi trigger invarian berjalan sebagai SECURITY INVOKER; policy RLS SELECT-pemilik di `posting` (ADR 7) bisa membuat `cek_jurnal_seimbang` hanya melihat satu sisi jurnal dan menolak setiap bayar.

## Temuan polesan dari lab-api-t2 (#256, keputusan 408–418)

- Urutan lock top-up bergantung pada rencana query (GroupAggregate terurut mengunci tunjangan lebih dulu); dua top-up berlawanan arah tidak deadlock dalam 3 percobaan.
- `TestTutupBukuSeimbang` bergantung pada jurnal dari tes lain; riwayat bagian C di `run.py` hanya memeriksa baris ganda, belum baris terlewat; penolakan batas saldo warung 422 belum direkam atau dites.
- Lab gagal bila berjalan melewati pukul 00.00 WIB atau pergantian bulan.
- Kontrak: `/transfers` tanpa 403, `/topup` tanpa 400, `GET /warung` tidak ada; `minLength` alasan menghitung karakter, service menghitung byte; body JSON endpoint lain belum dibatasi ukurannya.
- `tools/erd.py` `bersihkan()` menolak `000010_ledger_tabel.up.sql` karena `SET search_path FROM CURRENT`; ERD2 perlu mengizinkannya.

## Temuan polesan dari lab-b3-race (#257, keputusan 430–434)

- `rekam.py:3` menulis "Klien" (aturan bahasa: client); docstring `run_ledger.py` "tanpa sleep" padahal ada ambang 0,3/0,5/3 detik (beban berat bisa gagal palsu, tidak lolos palsu); kepala `ledger-tanpa-lock` sebaiknya "bisa terjadi".
- Untuk 2.10: bila dua request tumpang tindih, hasil yang lebih mungkin adalah B 23514 (500); −Rp20.000 butuh dua COMMIT di celah commit yang sama, frekuensinya di produksi belum diukur.
- Untuk 2.11: footer `race.js` menulis "oleh labs/b3-race/run.py" (salah untuk replay ledger); langkah 8 for-update menampilkan mode "Update" (A sudah memegang FOR UPDATE); tab "bergantian" berwarna `is-good` padahal B error; `VAR_LABEL` belum mengenal `versi`; widget race 2.11 lama melanggar axe definition-list dan aria-allowed-role.
- Image `postgres:17` tidak di-pin dan versinya tercetak di kepala rekaman: `cek-ledger` gagal saat image naik. Target `run` lama menyalin ke `../../docs/` yang sudah dihapus.

## Temuan polesan dari T2-registry (#258, keputusan 450)

- Lima halaman lama memakai judul naskah "+ ADR 13–17" di sidebar, Berikutnya, dan kartu, padahal H1 dan isinya belum memuat ADR itu.
- CSS sorotan peran `html[data-peran] a[data-peran~]` mengalahkan gaya abu-abu butir "segera" (peran Security: tiga butir tampak bisa dibaca; badge tetap ada). Beranda menulis "menebalkan semua 11 halaman", padahal 14 (3 segera).
- Daftar peran di Vitest ditulis manual, tidak dibaca dari "Jalur per peran" naskah.

## Temuan polesan dari lab-b3-isolasi (#259, keputusan 440–447)

- Tambahkan `harap` `SHOW transaction_isolation` di tiap skenario supaya `run-ledger` sendiri gagal bila level tertukar.
- Penomoran beda dengan b3-race ("retry 1" lawan "percobaan 2", buku Budi id 2 lawan 3): seragamkan saat 2.11 dan 2.12 ditulis; sumber `trigger.c`/`snapmgr.c` layak masuk rasional 443.
- `api-t2` `TutupBuku` menjalankan dua query di pool, bukan satu transaction: ringkasan sistem bisa dari snapshot lebih baru (catat untuk 2.4, sesuai 442).
- README belum memuat schema `b3_race` dan target `run-ledger` b3-race; baris b3-race masih menulis 2.1. `b3-race` masih memakai ambang waktu 0,3/0,5/3 detik (gagal palsu saat mesin ramai), b3-isolasi sudah tidak.

## Temuan polesan dari lab-t2-pencairan (#260, keputusan 500–508)

- 2.26 wajib menulis "Keuangan mengambil file menurut status `dikirim`": file basi dengan nama akhir bisa tersisa sesudah job berhenti setelah rename lalu jurnal dibalik (508); `benar.txt` E belum menyebutnya.
- Periode sebaiknya dihitung dari tanggal Jumat (2026-W44 yang diketik di Jumat W43 diterima); batch kosong tetap jadi `dikirim` dengan file berisi kepala; `-urutan` tak dikenal membuat job rentan diam.
- Rekonsiliasi menurunkan kedua sisi dari `baris_pencairan`, jadi jumlah beku yang salah tidak tertangkap; pembalik dari pembalik tidak dihitung.
- CSV: nama yang diawali "=" tidak di-escape (berisiko saat file dibuka di spreadsheet). Beberapa komentar rekaman > 25 kata. Nomor rekening tujuan belum ada di ERD (505).

## Temuan polesan dari lab-e3-idempotency (#263, keputusan 510–518)

- Lock baris key bisa tertahan lama bila host server membeku sampai TCP keepalive mendeteksinya (ulangan dapat 409): usul `idle_in_transaction_session_timeout` di role app api-t2.
- Komentar `NiatBayar`: sesudah jawaban final (termasuk 422 saldo kurang yang disimpan 24 jam) tap baru harus membuat niat baru; 2.14 menulis aturan ini.
- Klaim 513 tentang key milik akun lain belum punya bukti lab (server selalu memakai Budi). `polaKunci` menolak UUID huruf besar (RFC 9562 membolehkan saat masuk); retry bersamaan atas key `selesai` bisa 409 karena NOWAIT; `.timeout()` Dart tidak membatalkan request; `Retry-After` belum dibaca; keterangan `aturan.txt` untuk 400 ke-4 (key bukan UUID).
- Usul api-t2 (517): pola `denganKunci` di `/transfers` dan `/kiriman`; `CHECK ((status='selesai') = (respons IS NOT NULL))` dan index `kedaluwarsa`; opsional `PRIMARY KEY (akun_id, kunci)`. gitleaks `generic-api-key` menandai `Idempotency-Key: "<UUID>"`: halaman 2.13/2.14 memendekkan key.
