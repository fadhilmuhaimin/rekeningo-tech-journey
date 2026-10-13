-- Pencairan warung Tahap 2 · Rekeningo (fiktif): M15, ADR 19 (keputusan 500, 502).
-- Dimuat sesudah labs/b3-ledger/schema.sql ke schema yang sama. File ini tidak menyebut nama schema.
-- Bentuk tabel sama persis dengan bagian M15 di labs/api-t2/migrasi/000011_ledger_pendukung.up.sql
-- (keputusan 409, 410), supaya skema Tahap 2 tetap satu. run.py gagal bila keduanya berbeda (keputusan 505).

-- --8<-- [start:batch-pencairan]
-- M15, ADR 19: satu batch per periode pencairan, aman dijalankan dua kali.
CREATE TABLE batch_pencairan (
  id      bigserial PRIMARY KEY,
  periode text      NOT NULL UNIQUE,                     -- mis. 2026-W43: satu batch per Jumat
  status  text      NOT NULL CHECK (status IN ('dibuat', 'dijurnal', 'dikirim')),
  total   bigint    NOT NULL DEFAULT 0 CHECK (total >= 0)
);

CREATE TABLE baris_pencairan (
  batch_id  bigint NOT NULL REFERENCES batch_pencairan(id),
  buku_id   bigint NOT NULL REFERENCES buku(id),
  jumlah    bigint NOT NULL CHECK (jumlah > 0),
  jurnal_id bigint UNIQUE REFERENCES jurnal(id),         -- satu baris dicatat satu jurnal pencairan
  PRIMARY KEY (batch_id, buku_id)                        -- satu warung paling banyak sekali per batch
);
-- --8<-- [end:batch-pencairan]
