-- Tahap 3, rilis expand 4 dari 5 (lab-api-t3, keputusan 950, 952): katalog, stok, dan promo per kota.
-- produk.versi dipakai ubah bersyarat (UPDATE ... WHERE versi = ...): dua perubahan dari dua perangkat tidak
-- saling menimpa diam-diam (ADR 29).
SET LOCAL lock_timeout = '3s';

CREATE TABLE produk (
  id      bigserial   PRIMARY KEY,
  akun_id bigint      NOT NULL REFERENCES akun(id),        -- akun warung pemilik menu
  nama    text        NOT NULL CHECK (length(trim(nama)) > 0),
  harga   bigint      NOT NULL CHECK (harga > 0),          -- rupiah, integer
  stok    integer     NOT NULL CHECK (stok >= 0),          -- sisa porsi
  aktif   boolean     NOT NULL DEFAULT true,
  versi   integer     NOT NULL DEFAULT 1,
  diubah  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (akun_id, nama)
);

CREATE TABLE promo (
  id              bigserial   PRIMARY KEY,
  kota_id         bigint      NOT NULL REFERENCES kota(id),
  dibuat_oleh     bigint      NOT NULL REFERENCES akun(id),   -- akun hr
  judul           text        NOT NULL CHECK (length(trim(judul)) > 0),
  potongan_persen integer     NOT NULL CHECK (potongan_persen BETWEEN 1 AND 90),
  mulai           timestamptz NOT NULL,
  selesai         timestamptz NOT NULL,
  CONSTRAINT promo_selesai_sesudah_mulai CHECK (selesai > mulai)
);
CREATE INDEX promo_kota_waktu ON promo (kota_id, mulai, selesai);
