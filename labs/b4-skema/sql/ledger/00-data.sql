-- Data lab b4-skema versi ledger (keputusan 531): kampus pusat minggu 4 Tahap 2, sebelum migrasi ke ledger.
-- Tabel dan constraint = akhir Tahap 1 (labs/api-t1/schema.sql + labs/b4-migration/baru/000005), dimuat ledger.py.
-- Nomor dan nama akun sama dengan seed api-t1 (Gedung A) dan api-t2 -seed-kampus (keputusan 413), tetapi dibuat
-- dengan SQL: password_hash '!' bukan hash, karena lab ini tidak login. Saldo diisi langsung, bukan dihitung dari
-- baris transaksi: angka Gedung A dari keputusan 406, karyawan kampus Rp250.000 (top-up minggu ini, keputusan 413).

-- 1 admin, 1.000 karyawan, 12 warung (naskah Tahap 2, Latar).
INSERT INTO akun (id, jenis, nama, email, password_hash)
VALUES (400, 'admin', 'Admin Tunjangan', 'admin.tunjangan@lestari.example', '!');

INSERT INTO akun (id, jenis, nama, email, password_hash, saldo)
SELECT g,
       CASE WHEN g IN (418, 502, 503) OR g BETWEEN 505 AND 513 THEN 'warung' ELSE 'karyawan' END,
       CASE g WHEN 417 THEN 'Dimas' WHEN 418 THEN 'Warung Ani' WHEN 419 THEN 'Budi' WHEN 502 THEN 'Warung Sari'
              WHEN 503 THEN 'Warung Mie Pak Joko' WHEN 504 THEN 'Citra'
              ELSE CASE WHEN g BETWEEN 505 AND 513 THEN 'Warung ' || g ELSE 'Karyawan ' || g END END,
       'akun' || g || '@lestari.example', '!',
       CASE g WHEN 417 THEN 35000 WHEN 418 THEN 285000 WHEN 419 THEN 180000
              ELSE CASE WHEN g IN (502, 503) OR g BETWEEN 505 AND 513 THEN 0 ELSE 250000 END END
FROM generate_series(401, 1412) g;

-- Tabel besar: tiga minggu makan siang kampus, 1.000 karyawan x 15 hari kerja x satu bayar Rp25.000 = 15.000 baris.
-- Waktunya di masa lalu, jadi bayar yang direkam lab selalu paling atas di riwayat.
INSERT INTO transaksi (dari, ke, jumlah, dibuat)
SELECT k.id,
       (ARRAY[418, 502, 503, 505, 506, 507, 508, 509, 510, 511, 512, 513])[1 + (k.id + h) % 12],
       25000,
       date_trunc('day', now()) - (16 - h) * interval '1 day' + interval '12 hours' + k.id * interval '1 second'
FROM akun k, generate_series(1, 15) h
WHERE k.jenis = 'karyawan'
ORDER BY h, k.id;

-- Koreksi M4 Tahap 1 (alasan persis dari api-t1 koreksi.txt, keputusan 406).
INSERT INTO koreksi (akun_id, jumlah, alasan, admin_id)
VALUES (419, 70000, 'Pembayaran Budi ke Warung Ani, Jumat minggu 3 pukul 12.15, gagal di tengah; '
                    'saldo terpotong tanpa baris transaksi (M4)', 400);

ANALYZE akun;
ANALYZE transaksi;
