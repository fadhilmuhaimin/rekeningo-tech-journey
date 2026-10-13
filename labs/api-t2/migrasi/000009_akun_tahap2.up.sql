-- Rilis 1 (expand), bagian 1 dari 3 · Tahap 2 (keputusan 409).
-- Kolom baru di akun untuk Tahap 2. Semua boleh kosong atau punya default, dan tidak ada kolom yang dihapus atau
-- diganti nama, jadi server v1 yang sedang berjalan tidak melihat perbedaan (pelajaran M6, 1.30).
-- Nomor sesudah migration terakhir di rekaman api-t1 (000008, versi.txt).
SET LOCAL lock_timeout = '3s';   -- ALTER TABLE menunggu lock paling lama 3 detik, lalu gagal (ADR 17, M13)

-- Akun sistem mencatat jurnal yang dibuat migrasi dan job, bukan oleh orang.
ALTER TABLE akun DROP CONSTRAINT akun_jenis_check;
ALTER TABLE akun ADD CONSTRAINT akun_jenis_check CHECK (jenis IN ('karyawan', 'warung', 'admin', 'sistem'));

ALTER TABLE akun
  ADD COLUMN nomor_karyawan       text        UNIQUE,                 -- tujuan transfer antar karyawan (PRD v2)
  ADD COLUMN wajib_ganti_password boolean     NOT NULL DEFAULT false, -- M16, ADR 20: belum dibaca kode
  ADD COLUMN gagal_login          integer     NOT NULL DEFAULT 0
                                  CHECK (gagal_login >= 0),           -- M16: belum dibaca kode
  ADD COLUMN terkunci_sampai      timestamptz;                        -- M16: belum dibaca kode
