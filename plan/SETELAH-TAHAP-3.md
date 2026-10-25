# Setelah Tahap 3

Polesan dari tinjauan Tahap 3 yang sengaja tidak dikerjakan (lingkup dibekukan).

## Dari PR subagen (dilipat tools/lipat_masuk.py)

- Lab `t3-bayar` (skema lama) perlu versi ledger dengan 0,87 pembayaran per detik dan layanan push yang menggantung (R3-33).
- Halaman 3.27 bisa terlalu panjang (staging, pipeline, alert, on-call, backup): pecah menjadi dua bila lebih dari 10 menit baca.
- Halaman 3.19 (ADR 28): promo yang dijadwalkan mulai di jam tertentu tidak punya tulis saat mulai, jadi hapus-kunci-sesudah-tulis tidak menutupnya; TTL 60 detik membatasi, atau harga efektif dihitung saat baca; tulis di ADR.
- Lab api-t3: api-t2 memakai `database/sql` tanpa batas pool bawaan; tetapkan `SetMaxOpenConns(10)` (atau pgxpool) dan rekam; catatan bawaan pgxpool di naskah hanya berlaku bila lab pindah ke pgxpool.
- M20 (3.12): sebut panjang klaim; dua pengiriman berselang "enam detik" menuntut klaim paling lama sekitar 5 detik.
- Versi app Tahap 3 (3.0 notifikasi, 3.1 rilis M26) belum didefinisikan di naskah; tulis di halaman 3.3.
- `t3-pool` dan `t3-outbox` boleh berbagi `api-t3` lewat mode rentan (pola api-t1) bila itu menghemat lab.
- T3-siap: registry `trx` jadi 3 hanya di `tahap[2]` membuat "data transaksi per tahun" (dau × trx × 365 × 300 B = 821 MB) berbeda dari 1,37 GB di naskah 3b (dua posting × 250 B) dan dari `tahap[0]` dan `tahap[1]` yang tetap trx 2; putuskan samakan semuanya atau tulis dua besaran terpisah.
- `T4-siap` dan `T5-siap`: RINGKAS tinggal 2 baris kosong; lipat peta Tahap 3 (3.1 sampai 3.32) jadi sekitar enam baris per kelompok bagian sebelum menulis peta Tahap 4, dengan format lipat di baris pembuka RINGKAS.
- Tugas lab Tahap 3 boleh digabung bila mode rentan api-t3 cukup untuk `t3-pool` dan `t3-outbox`; gabung hanya bila rekamannya tetap terpisah per masalah.
