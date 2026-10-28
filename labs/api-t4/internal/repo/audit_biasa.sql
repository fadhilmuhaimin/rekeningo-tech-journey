-- Lab t4-audit, mode rentan bo-log-biasa (M38, ADR 43 alternatif "RBAC dengan tabel log biasa tanpa rantai"): log yang
-- hanya menyimpan isi aksi, tanpa hash. Bukan migration Tahap 4 dan tidak ikut skema naskah: dibuat lab t4-audit dan tes,
-- hanya untuk mode ini. Kolomnya sama dengan audit_log tanpa hash_sebelumnya dan hash.
CREATE TABLE IF NOT EXISTS audit_biasa (
  id           bigserial   PRIMARY KEY,
  waktu        timestamptz NOT NULL,
  pelaku_id    bigint      NOT NULL REFERENCES akun(id),
  peran        text        NOT NULL,
  aksi         text        NOT NULL,
  objek        text        NOT NULL,
  alasan       text,
  penyetuju_id bigint      REFERENCES akun(id)
);
