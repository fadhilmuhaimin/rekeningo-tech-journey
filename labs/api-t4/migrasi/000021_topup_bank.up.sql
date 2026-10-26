-- Tahap 4, rilis expand 2 dari 4 (lab-api-t4): top-up dari rekening bank lewat gateway (naskah 3b, M29, M30).
-- Kabar dari gateway adalah klaim: satu top-up satu baris, satu event satu baris, selisih dengan laporan gateway
-- satu insiden bernomor (aturan Pak Hadi).
SET LOCAL lock_timeout = '3s';

CREATE TABLE topup_bank (
  id               bigserial   PRIMARY KEY,
  akun_id          bigint      NOT NULL REFERENCES akun(id),
  order_id         text        NOT NULL UNIQUE,                    -- nomor di gateway; juga Idempotency-Key ke gateway dan ke ledger
  jumlah           bigint      NOT NULL CHECK (jumlah > 0),        -- rupiah, integer
  status           text        NOT NULL DEFAULT 'menunggu'
                   CHECK (status IN ('menunggu', 'dibayar', 'kedaluwarsa', 'gagal', 'tidak_pasti')),
  tujuan_bayar     text,                                           -- nomor tujuan dari gateway; kosong bila gateway belum menjawab
  dibuat           timestamptz NOT NULL DEFAULT now(),
  kedaluwarsa_pada timestamptz NOT NULL,
  jurnal_id        bigint      UNIQUE REFERENCES jurnal(id)        -- satu top-up paling banyak satu jurnal
);
CREATE INDEX topup_bank_akun ON topup_bank (akun_id, id);
CREATE INDEX topup_bank_belum_selesai ON topup_bank (dibuat) WHERE status IN ('menunggu', 'tidak_pasti');

CREATE TABLE webhook_event (
  event_id  text        PRIMARY KEY,                               -- dari gateway; kunci utama inilah yang menahan event ganda
  topup_id  bigint      REFERENCES topup_bank(id),
  jenis     text        NOT NULL,                                  -- status yang dikabarkan: settlement, pending, expire, failure
  hasil     text        NOT NULL CHECK (hasil IN ('diproses', 'ganda', 'diparkir', 'ditolak')),
  diterima  timestamptz NOT NULL DEFAULT now(),
  jurnal_id bigint      REFERENCES jurnal(id)
);
CREATE INDEX webhook_event_topup ON webhook_event (topup_id) WHERE topup_id IS NOT NULL;

CREATE TABLE insiden_rekon (
  id        bigserial   PRIMARY KEY,
  tanggal   date        NOT NULL,                                  -- tanggal laporan settlement gateway
  order_id  text        NOT NULL,
  topup_id  bigint      REFERENCES topup_bank(id),
  jenis     text        NOT NULL CHECK (jenis IN ('tidak_di_ledger', 'tidak_di_gateway', 'jumlah_beda')),
  selisih   bigint      NOT NULL,                                  -- rupiah, gateway dikurangi ledger
  status    text        NOT NULL DEFAULT 'terbuka' CHECK (status IN ('terbuka', 'selesai')),
  jurnal_id bigint      REFERENCES jurnal(id),                     -- jurnal koreksi biasa, bukan UPDATE pada posting
  dibuat    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tanggal, order_id, jenis)                                -- job rekonsiliasi aman dijalankan dua kali (ADR 19)
);
