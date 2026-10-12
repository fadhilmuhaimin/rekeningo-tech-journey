-- Lab f2-review (1.39) · tabel akun dan transaksi v1, sama dengan labs/api-t1/schema.sql,
-- di schema sendiri (keputusan 80). Dibuat ulang dari nol sebelum setiap tes penerimaan.
DROP SCHEMA IF EXISTS f2review CASCADE;
CREATE SCHEMA f2review;
SET search_path = f2review;

CREATE TABLE akun (
  id    bigint PRIMARY KEY,
  jenis text   NOT NULL CHECK (jenis IN ('karyawan', 'warung', 'admin')),
  nama  text   NOT NULL,
  saldo bigint NOT NULL DEFAULT 0 CONSTRAINT saldo_tidak_negatif CHECK (saldo >= 0)
);

CREATE TABLE transaksi (
  id     bigserial   PRIMARY KEY,
  dari   bigint      NOT NULL REFERENCES akun(id),
  ke     bigint      NOT NULL REFERENCES akun(id),
  jumlah bigint      NOT NULL CONSTRAINT jumlah_positif CHECK (jumlah > 0),
  dibuat timestamptz NOT NULL DEFAULT now(),
  CHECK (dari <> ke)
);

-- Akun yang sama dengan lab b5-rls. Total saldo awal: Rp500.000.
INSERT INTO akun VALUES (417, 'karyawan', 'Dimas', 250000), (418, 'warung', 'Warung Ani', 25000), (419, 'karyawan', 'Budi', 225000);
