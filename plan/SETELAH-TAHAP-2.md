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
