-- Lab t4-audit: pemilik tabel log, role baca-saja, dan hak tabel log biasa (versi pertama). Dijalankan run.py sebagai
-- superuser database lab, sesudah schema api-t4 dan tabel audit_biasa dibuat. {s} diganti nama schema.
-- Password role adalah data lab (pola yang sama dengan api_t4:api_t4), bukan secret.

-- Pemilik audit_log yang BUKAN superuser: pemilik melewati pembatasan hak tabel, superuser melewati semuanya.
GRANT USAGE, CREATE ON SCHEMA {s} TO t4a_pemilik;
ALTER TABLE {s}.audit_log OWNER TO t4a_pemilik;

-- Versi pertama (M38): log biasa dengan hak penuh untuk role aplikasi. Hanya dipakai mode bo-log-biasa.
GRANT SELECT, INSERT, UPDATE, DELETE ON {s}.audit_biasa TO api_t4;
GRANT USAGE ON SEQUENCE {s}.audit_biasa_id_seq TO api_t4;

-- Pemeriksaan harian (cmd/auditjob): hanya membaca log.
GRANT USAGE ON SCHEMA {s} TO t4a_verifikator;
GRANT SELECT ON {s}.audit_log TO t4a_verifikator;

-- Agen back office (modul mcp): hanya membaca, dan hanya kolom yang dibutuhkan alatnya. Tanpa nama, surel, hash
-- password, kunci objek berkas, atau checksum; tanpa tabel sesi.
GRANT USAGE ON SCHEMA {s} TO t4a_agen;
GRANT SELECT ON {s}.audit_log TO t4a_agen;
GRANT SELECT (id, jenis, status, tingkat) ON {s}.akun TO t4a_agen;
GRANT SELECT (id, akun_id, subjek, status) ON {s}.verifikasi TO t4a_agen;
