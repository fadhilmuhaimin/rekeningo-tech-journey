-- Tahap 3, rilis expand 3 dari 5 (lab-api-t3, keputusan 950, 951): tujuan notifikasi dan outbox (ADR 23).
-- Baris outbox ditulis di transaction yang sama dengan jurnal, jadi ROLLBACK jurnal membuang pemberitahuannya.
SET LOCAL lock_timeout = '3s';

CREATE TABLE perangkat (
  id               bigserial   PRIMARY KEY,
  akun_id          bigint      NOT NULL REFERENCES akun(id),
  platform         text        NOT NULL CHECK (platform IN ('android', 'ios')),
  token_push       text        NOT NULL UNIQUE,                 -- satu HP, satu akun pada satu waktu
  aktif            boolean     NOT NULL DEFAULT true,           -- false setelah layanan push menjawab token tidak terdaftar
  terakhir_terlihat timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX perangkat_akun ON perangkat (akun_id) WHERE aktif;

CREATE TABLE outbox (
  id            bigserial   PRIMARY KEY,
  notifikasi_id uuid        NOT NULL UNIQUE DEFAULT gen_random_uuid(),   -- stabil di semua percobaan: app menyaring ganda (ADR 25)
  jurnal_id     bigint      REFERENCES jurnal(id),                        -- kosong untuk pengumuman promo
  akun_id       bigint      NOT NULL REFERENCES akun(id),                 -- penerima pemberitahuan
  kelas         smallint    NOT NULL CHECK (kelas BETWEEN 0 AND 2),       -- 0 bayar dan transfer, 1 top-up massal, 2 promo (ADR 32)
  jenis         text        NOT NULL CHECK (jenis IN ('bayar', 'transfer', 'topup', 'promo')),
  payload       jsonb       NOT NULL,
  status        text        NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'terkirim', 'dilewati', 'mati')),
  percobaan     integer     NOT NULL DEFAULT 0 CHECK (percobaan >= 0),
  coba_lagi     timestamptz NOT NULL DEFAULT now(),                       -- paling cepat kapan dicoba lagi (backoff)
  klaim_sampai  timestamptz,                                              -- sampai kapan baris ini dipegang satu worker (ADR 24)
  dibuat        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outbox_jurnal_atau_promo CHECK ((jurnal_id IS NULL) = (jenis = 'promo'))
);
-- Satu pemberitahuan per jurnal per penerima. Promo tidak punya jurnal, jadi tidak ikut.
CREATE UNIQUE INDEX outbox_satu_per_jurnal ON outbox (jurnal_id, akun_id) WHERE jurnal_id IS NOT NULL;
-- Antrean: hanya baris yang masih menunggu, menurut kelas lalu nomor.
CREATE INDEX outbox_antre ON outbox (kelas, id) WHERE status = 'menunggu';
