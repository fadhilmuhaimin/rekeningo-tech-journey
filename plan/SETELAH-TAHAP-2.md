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
