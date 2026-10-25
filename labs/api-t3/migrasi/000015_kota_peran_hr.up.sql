-- Tahap 3, rilis expand 1 dari 5 (lab-api-t3, keputusan 950): kota, akun.kota_id, dan peran hr.
-- Nomor sesudah migration terakhir api-t2 (000014, labs/api-t2/migrasi). Naskah 3b menulis "di atas 000013";
-- 000014 (wajib ganti password) ada sejak lab-api-t2a, jadi lab ini mulai dari 000015.
-- Semua perubahan boleh kosong: akun lama tidak punya kota, dan kode api-t2 yang masih jalan tidak melihat bedanya.
SET LOCAL lock_timeout = '3s';

CREATE TABLE kota (
  id   bigserial PRIMARY KEY,
  nama text      NOT NULL UNIQUE
);

ALTER TABLE akun DROP CONSTRAINT akun_jenis_check;
ALTER TABLE akun ADD CONSTRAINT akun_jenis_check CHECK (jenis IN ('karyawan', 'warung', 'admin', 'sistem', 'hr'));

-- Boleh kosong: admin dan sistem tidak punya kota (naskah 3b). Karyawan, warung, dan hr diisi kode.
ALTER TABLE akun ADD COLUMN kota_id bigint REFERENCES kota(id);
CREATE INDEX akun_kota ON akun (kota_id) WHERE kota_id IS NOT NULL;
