-- Tahap 3, rilis expand 5 dari 5 (lab-api-t3, keputusan 950, 952): operasi dari queue offline di HP warung (ADR 29).
-- kunci dikenali sampai 14 hari, bukan 24 jam seperti kunci_idempotensi (ADR 14): akhir pekan warung 62 jam.
SET LOCAL lock_timeout = '3s';

CREATE TABLE operasi_sinkron (
  kunci         text        PRIMARY KEY,
  perangkat_id  bigint      NOT NULL REFERENCES perangkat(id),
  produk_id     bigint      NOT NULL REFERENCES produk(id),
  jenis         text        NOT NULL CHECK (jenis IN ('stok', 'harga')),   -- pembayaran tidak pernah lewat sini
  nilai         bigint      NOT NULL CHECK (nilai >= 0),
  versi_dasar   integer     NOT NULL CHECK (versi_dasar >= 1),            -- versi baris yang dilihat HP saat mengubah
  status        text        NOT NULL CHECK (status IN ('diterapkan', 'konflik')),
  dibuat_di_hp  timestamptz NOT NULL,
  diterapkan    timestamptz                                               -- kosong bila konflik
);
CREATE INDEX operasi_produk ON operasi_sinkron (produk_id);
