-- Lab api-t5: satu schema (skema akhir Tahap 5, 30 tabel) dipecah menjadi enam schema service dengan role sendiri
-- (ADR 50). Dijalankan sebagai pemilik schema sesudah `buat_schema` dan `-seed`. Placeholder {s} adalah schema sumber.
-- Awalan t5_ dipakai karena nama schema dan role bersifat global di database lab bersama.
-- Pembagian mengikuti tabel "Service (schema)" naskah bagian 3b: 9 + 5 + 6 + 6 + 2 + 2 = 30 tabel.
--
-- LANGKAH 1: schema, role, dan pemindahan tabel. Foreign key lintas service masih ada; dasar_t5 menghitungnya dulu.

DROP SCHEMA IF EXISTS t5_ledger, t5_akun, t5_pembayaran, t5_merchant, t5_notifikasi, t5_cicilan CASCADE;
-- Role bersifat global di klaster dan tidak hilang bersama schema: dibuang (hak yang tersisa dicabut dulu) lalu dibuat ulang.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['t5_app', 't5_ledger', 't5_akun', 't5_pembayaran', 't5_merchant', 't5_notifikasi', 't5_cicilan'] LOOP
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('DROP OWNED BY %I', r);
      EXECUTE format('DROP ROLE %I', r);
    END IF;
  END LOOP;
END $$;

CREATE SCHEMA t5_ledger;
CREATE SCHEMA t5_akun;
CREATE SCHEMA t5_pembayaran;
CREATE SCHEMA t5_merchant;
CREATE SCHEMA t5_notifikasi;
CREATE SCHEMA t5_cicilan;

ALTER TABLE {s}.buku SET SCHEMA t5_ledger;
ALTER TABLE {s}.jurnal SET SCHEMA t5_ledger;
ALTER TABLE {s}.posting SET SCHEMA t5_ledger;
-- Partisi tidak ikut pindah bersama tabel induknya (PostgreSQL 17 §5.12): dipindah satu per satu.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT c.relname FROM pg_inherits i JOIN pg_class c ON c.oid = i.inhrelid
            WHERE i.inhparent = 't5_ledger.posting'::regclass ORDER BY c.relname LOOP
    EXECUTE format('ALTER TABLE {s}.%I SET SCHEMA t5_ledger', r.relname);
  END LOOP;
END $$;
ALTER TABLE {s}.kunci_idempotensi SET SCHEMA t5_ledger;
ALTER TABLE {s}.batch_pencairan SET SCHEMA t5_ledger;
ALTER TABLE {s}.baris_pencairan SET SCHEMA t5_ledger;
ALTER TABLE {s}.snapshot_saldo SET SCHEMA t5_ledger;
ALTER TABLE {s}.arsip_partisi SET SCHEMA t5_ledger;
ALTER TABLE {s}.outbox SET SCHEMA t5_ledger;      -- satu transaction dengan jurnal (ADR 23)
ALTER TABLE {s}.akun SET SCHEMA t5_akun;
ALTER TABLE {s}.sesi SET SCHEMA t5_akun;
ALTER TABLE {s}.kota SET SCHEMA t5_akun;
ALTER TABLE {s}.verifikasi SET SCHEMA t5_akun;
ALTER TABLE {s}.audit_log SET SCHEMA t5_akun;
ALTER SEQUENCE {s}.akun_publik_id SET SCHEMA t5_akun;
ALTER TABLE {s}.topup_bank SET SCHEMA t5_pembayaran;
ALTER TABLE {s}.webhook_event SET SCHEMA t5_pembayaran;
ALTER TABLE {s}.insiden_rekon SET SCHEMA t5_pembayaran;
ALTER TABLE {s}.kartu SET SCHEMA t5_pembayaran;
ALTER TABLE {s}.otorisasi_kartu SET SCHEMA t5_pembayaran;
ALTER TABLE {s}.sakelar SET SCHEMA t5_pembayaran;
ALTER TABLE {s}.produk SET SCHEMA t5_merchant;
ALTER TABLE {s}.promo SET SCHEMA t5_merchant;
ALTER TABLE {s}.operasi_sinkron SET SCHEMA t5_merchant;
ALTER TABLE {s}.qr SET SCHEMA t5_merchant;
ALTER TABLE {s}.ringkasan_merchant_harian SET SCHEMA t5_merchant;
ALTER TABLE {s}.mitra_pos SET SCHEMA t5_merchant;
ALTER TABLE {s}.perangkat SET SCHEMA t5_notifikasi;
ALTER TABLE {s}.pengumuman SET SCHEMA t5_notifikasi;
ALTER TABLE {s}.jadwal_cicilan SET SCHEMA t5_cicilan;
ALTER TABLE {s}.angsuran SET SCHEMA t5_cicilan;

-- Fungsi trigger invarian ledger ikut service ledger. Mereka dibuat dengan search_path tetap ke schema lama
-- (SET search_path FROM CURRENT), jadi search_path-nya harus ikut dipindah.
ALTER FUNCTION {s}.cek_jurnal_seimbang() SET SCHEMA t5_ledger;
ALTER FUNCTION {s}.cek_pembalik_cermin() SET SCHEMA t5_ledger;
ALTER FUNCTION {s}.cek_saldo_karyawan() SET SCHEMA t5_ledger;
ALTER FUNCTION {s}.tolak_ubah() SET SCHEMA t5_ledger;
ALTER FUNCTION {s}.buat_partisi_posting(text, date) SET SCHEMA t5_ledger;
ALTER FUNCTION t5_ledger.cek_jurnal_seimbang() SET search_path = t5_ledger;
ALTER FUNCTION t5_ledger.cek_pembalik_cermin() SET search_path = t5_ledger;
ALTER FUNCTION t5_ledger.cek_saldo_karyawan() SET search_path = t5_ledger;
ALTER FUNCTION t5_ledger.tolak_ubah() SET search_path = t5_ledger;
ALTER FUNCTION t5_ledger.buat_partisi_posting(text, date) SET search_path = t5_ledger;

-- Schema lama harus kosong: DROP tanpa CASCADE gagal bila ada objek yang terlewat.
DROP SCHEMA {s};
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- Role: satu per service, dan t5_app untuk proses api-t5 (enam service dalam satu proses) yang mewarisi keenamnya.
-- Password sama dengan nama role: data lab lokal, bukan secret.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['t5_ledger', 't5_akun', 't5_pembayaran', 't5_merchant', 't5_notifikasi', 't5_cicilan', 't5_app'] LOOP
    EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', r, r);
  END LOOP;
END $$;
-- search_path bawaan tiap role: schema-nya sendiri. SQL tanpa awalan ke tabel service lain tidak menemukan tabelnya
-- (42P01); SQL dengan awalan ditolak hak (42501). Yang menolak adalah hak, bukan search_path.
ALTER ROLE t5_ledger SET search_path = t5_ledger;
ALTER ROLE t5_akun SET search_path = t5_akun;
ALTER ROLE t5_pembayaran SET search_path = t5_pembayaran;
ALTER ROLE t5_merchant SET search_path = t5_merchant;
ALTER ROLE t5_notifikasi SET search_path = t5_notifikasi;
ALTER ROLE t5_cicilan SET search_path = t5_cicilan;
ALTER ROLE t5_app SET search_path = t5_ledger, t5_akun, t5_pembayaran, t5_merchant, t5_notifikasi, t5_cicilan;

-- Hak per service: hak role aplikasi api-t4 (labs/api-t4/dasar_t4.py, HAK) dibagi menurut service pemilik tabelnya,
-- ditambah tabel baru Tahap 5.
-- akun
GRANT USAGE ON SCHEMA t5_akun TO t5_akun;
GRANT SELECT (id, jenis, nama, email, password_hash, nomor_karyawan, wajib_ganti_password, gagal_login,
              terkunci_sampai, kota_id, tingkat, status, mitra_pos_id) ON t5_akun.akun TO t5_akun;
GRANT INSERT (id, jenis, nama, email, password_hash) ON t5_akun.akun TO t5_akun;
GRANT UPDATE (password_hash, wajib_ganti_password, gagal_login, terkunci_sampai, tingkat, status, mitra_pos_id) ON t5_akun.akun TO t5_akun;
GRANT SELECT, INSERT, DELETE ON t5_akun.sesi TO t5_akun;
GRANT SELECT ON t5_akun.kota TO t5_akun;
GRANT SELECT, INSERT, UPDATE ON t5_akun.verifikasi TO t5_akun;
GRANT SELECT, INSERT ON t5_akun.audit_log TO t5_akun;   -- log hanya bertambah (ADR 43)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA t5_akun TO t5_akun;
-- ledger
GRANT USAGE ON SCHEMA t5_ledger TO t5_ledger;
GRANT SELECT, UPDATE (saldo_cache, versi, batas_harian) ON t5_ledger.buku TO t5_ledger;
GRANT INSERT (akun_id, jenis, batas_saldo, batas_harian) ON t5_ledger.buku TO t5_ledger;
GRANT SELECT, INSERT ON t5_ledger.jurnal, t5_ledger.posting TO t5_ledger;
GRANT SELECT, INSERT, UPDATE, DELETE ON t5_ledger.kunci_idempotensi TO t5_ledger;
GRANT SELECT, INSERT, UPDATE ON t5_ledger.batch_pencairan, t5_ledger.baris_pencairan TO t5_ledger;
GRANT SELECT, INSERT ON t5_ledger.snapshot_saldo, t5_ledger.arsip_partisi TO t5_ledger;
GRANT SELECT, INSERT, UPDATE, DELETE ON t5_ledger.outbox TO t5_ledger;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA t5_ledger TO t5_ledger;
-- Kontrak kolom lintas service yang dipakai kode lab ini: ledger membaca tingkat dan status akun untuk batas saldo
-- menurut tingkat. Kolom nama tidak termasuk kontrak siapa pun.
GRANT USAGE ON SCHEMA t5_akun TO t5_ledger;
GRANT SELECT (id, tingkat, status) ON t5_akun.akun TO t5_ledger;
-- pembayaran
GRANT USAGE ON SCHEMA t5_pembayaran TO t5_pembayaran;
GRANT SELECT, INSERT, UPDATE ON t5_pembayaran.topup_bank, t5_pembayaran.webhook_event, t5_pembayaran.insiden_rekon,
      t5_pembayaran.kartu, t5_pembayaran.otorisasi_kartu, t5_pembayaran.sakelar TO t5_pembayaran;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA t5_pembayaran TO t5_pembayaran;
-- merchant
GRANT USAGE ON SCHEMA t5_merchant TO t5_merchant;
GRANT SELECT, INSERT, UPDATE ON t5_merchant.produk, t5_merchant.qr, t5_merchant.ringkasan_merchant_harian, t5_merchant.mitra_pos TO t5_merchant;
GRANT SELECT, INSERT ON t5_merchant.promo TO t5_merchant;
GRANT SELECT, INSERT, DELETE ON t5_merchant.operasi_sinkron TO t5_merchant;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA t5_merchant TO t5_merchant;
-- notifikasi
GRANT USAGE ON SCHEMA t5_notifikasi TO t5_notifikasi;
GRANT SELECT, INSERT, UPDATE ON t5_notifikasi.perangkat, t5_notifikasi.pengumuman TO t5_notifikasi;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA t5_notifikasi TO t5_notifikasi;
-- cicilan
GRANT USAGE ON SCHEMA t5_cicilan TO t5_cicilan;
GRANT SELECT, INSERT, UPDATE ON t5_cicilan.jadwal_cicilan, t5_cicilan.angsuran TO t5_cicilan;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA t5_cicilan TO t5_cicilan;
-- Satu proses, enam service: t5_app mewarisi keenam role. Itu keputusan lab ini (satu proses); t5-service memisahkan
-- sebagian jadi proses sendiri dengan role sendiri.
GRANT t5_ledger, t5_akun, t5_pembayaran, t5_merchant, t5_notifikasi, t5_cicilan TO t5_app;

-- LANGKAH 2: foreign key lintas schema service dihapus (naskah 3b). Konsistensi lintas service dijaga Idempotency-Key
-- dan rekonsiliasi, bukan constraint database.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT c.conrelid::regclass::text AS tabel, c.conname
             FROM pg_constraint c
             JOIN pg_class a ON a.oid = c.conrelid JOIN pg_class b ON b.oid = c.confrelid
            WHERE c.contype = 'f' AND c.conparentid = 0 AND a.relnamespace <> b.relnamespace
            ORDER BY 1, 2 LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tabel, r.conname);
  END LOOP;
END $$;
