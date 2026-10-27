-- Tahap 4, rilis expand 4 dari 4 (lab-api-t4): kartu virtual dan audit log (naskah 3b, M37, M38).
SET LOCAL lock_timeout = '3s';

-- Nomor kartu penuh tidak disimpan: hanya token dari penerbit dan empat digit terakhir (Asumsi desain).
CREATE TABLE kartu (
  id             bigserial PRIMARY KEY,
  akun_id        bigint    NOT NULL REFERENCES akun(id),
  token_penerbit text      NOT NULL UNIQUE,
  empat_digit    text      NOT NULL CHECK (empat_digit ~ '^[0-9]{4}$'),
  status         text      NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'dibekukan', 'ditutup')),
  batas_harian   bigint    NOT NULL DEFAULT 500000 CHECK (batas_harian > 0)
);
CREATE INDEX kartu_akun ON kartu (akun_id);

CREATE TABLE otorisasi_kartu (
  id                bigserial   PRIMARY KEY,
  kartu_id          bigint      NOT NULL REFERENCES kartu(id),
  id_penerbit       text        NOT NULL UNIQUE,                  -- id dari penerbit; juga Idempotency-Key ke ledger
  jumlah            bigint      NOT NULL CHECK (jumlah > 0),
  status            text        NOT NULL CHECK (status IN ('ditahan', 'ditangkap', 'dibalik', 'kedaluwarsa', 'ditolak')),
  jurnal_tahan_id   bigint      UNIQUE REFERENCES jurnal(id),     -- dana tertahan adalah jurnal di ledger
  jurnal_tangkap_id bigint      UNIQUE REFERENCES jurnal(id),
  tahan_sampai      timestamptz,
  dibuat            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX otorisasi_kartu_kartu ON otorisasi_kartu (kartu_id, dibuat);
CREATE INDEX otorisasi_kartu_ditahan ON otorisasi_kartu (tahan_sampai) WHERE status = 'ditahan';

-- Audit log append-only berantai hash: hash = SHA-256 dari hash_sebelumnya dan isi baris (internal/repo/audit.go).
-- Role aplikasi hanya diberi SELECT dan INSERT (dasar_t4.py HAK); pemilik schema tetap bisa mengubah baris, dan
-- itulah yang terdeteksi rantai, bukan dicegah (ADR 43).
CREATE TABLE audit_log (
  id               bigserial   PRIMARY KEY,
  waktu            timestamptz NOT NULL,
  pelaku_id        bigint      NOT NULL REFERENCES akun(id),
  peran            text        NOT NULL,
  aksi             text        NOT NULL,
  objek            text        NOT NULL,
  alasan           text,
  penyetuju_id     bigint      REFERENCES akun(id),
  hash_sebelumnya  text        NOT NULL,
  hash             text        NOT NULL UNIQUE
);
CREATE INDEX audit_log_objek ON audit_log (objek, id);
