-- Lab e3-idempotency · versi ledger (Tahap 2, M10, ADR 14; keputusan 510).
-- Dimuat sesudah labs/b3-ledger/schema.sql di schema e3_idem (run.py mengatur search_path). Tanpa nama schema.

-- --8<-- [start:kunci]
-- Bentuk sama dengan labs/api-t2/migrasi/000011_ledger_pendukung.up.sql: satu baris per idempotency key.
CREATE TABLE kunci_idempotensi (
  kunci           text        PRIMARY KEY,
  akun_id         bigint      NOT NULL REFERENCES akun(id),
  hash_permintaan text        NOT NULL,                  -- key sama dengan body berbeda ditolak
  status          text        NOT NULL CHECK (status IN ('diproses', 'selesai')),
  respons         jsonb,
  jurnal_id       bigint      UNIQUE REFERENCES jurnal(id),
  kedaluwarsa     timestamptz NOT NULL
);
-- --8<-- [end:kunci]

-- Data lab (keputusan 516): nomor akun dari Tahap 1 (Budi 419, Warung Ani 418), saldo awal Budi Rp100.000
-- seperti lab e3 lama dan b3-ledger bagian E. Buku 1 = tunjangan, 2 = Budi, 3 = Warung Ani.
INSERT INTO akun (id, nama, email, peran) VALUES
  (1,   'Sistem Rekeningo', 'sistem@lestari.example',          'sistem'),
  (400, 'Admin Tunjangan',  'admin.tunjangan@lestari.example', 'admin'),
  (418, 'Warung Ani',       'warung.ani@lestari.example',      'warung'),
  (419, 'Budi',             'budi@lestari.example',            'karyawan');
INSERT INTO buku (akun_id, jenis, batas_saldo) VALUES (NULL, 'tunjangan', NULL), (419, 'karyawan', NULL),
  (418, 'warung', 1500000);
BEGIN;
INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('topup', 'Tunjangan makan', 400);
INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES (1, 1, -100000), (1, 2, 100000);
UPDATE buku SET saldo_cache = saldo_cache - 100000 WHERE id = 1;
UPDATE buku SET saldo_cache = saldo_cache + 100000 WHERE id = 2;
COMMIT;
