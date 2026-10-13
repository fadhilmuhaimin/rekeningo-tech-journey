-- Rilis 1 (expand), bagian 3 dari 3 · Tahap 2 (keputusan 409, 410).
-- Tabel Tahap 2 yang belum ada di labs/b3-ledger, dan index riwayat. Tabelnya ada sejak expand;
-- perilakunya menyusul di lab masing-masing (lihat keputusan 410).
SET LOCAL lock_timeout = '3s';

-- Riwayat dan kursor (dibuat, id): ADR 15 (M11) dan ADR 16 (M12).
CREATE INDEX posting_riwayat ON posting (buku_id, dibuat, id);

-- M10, ADR 14: hasil satu permintaan per key, disimpan 24 jam. Belum dibaca atau ditulis kode api-t2
-- (lab e3-idempotency).
CREATE TABLE kunci_idempotensi (
  kunci           text        PRIMARY KEY,
  akun_id         bigint      NOT NULL REFERENCES akun(id),
  hash_permintaan text        NOT NULL,                  -- key sama dengan body berbeda ditolak
  status          text        NOT NULL CHECK (status IN ('diproses', 'selesai')),
  respons         jsonb,
  jurnal_id       bigint      UNIQUE REFERENCES jurnal(id),
  kedaluwarsa     timestamptz NOT NULL
);

-- M15, ADR 19: satu batch per periode pencairan, aman dijalankan dua kali. Belum dipakai kode api-t2
-- (lab t2-pencairan).
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
