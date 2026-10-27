-- Lab t4-modul: satu schema (skema akhir api-t4, 22 tabel) dipecah menjadi enam schema modul, masing-masing dengan role
-- sendiri (ADR 37). Dijalankan sebagai pemilik schema sesudah `buat_schema` dan `-seed` api-t4. Placeholder {s} adalah
-- schema sumber. Awalan t4m_ dipakai karena nama schema dan role bersifat global di database lab bersama.

DROP SCHEMA IF EXISTS t4m_ledger, t4m_akun, t4m_identitas, t4m_merchant, t4m_pembayaran, t4m_platform CASCADE;
-- Role dan keanggotaannya bersifat global di klaster, jadi tidak ikut hilang bersama schema: satu run yang
-- menambah hak atau keanggotaan tidak boleh tertinggal di run berikutnya. Role dibuang (hak yang tersisa dicabut
-- dulu) lalu dibuat ulang di bawah.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['t4m_monolit', 't4m_ledger', 't4m_akun', 't4m_identitas', 't4m_merchant', 't4m_pembayaran', 't4m_platform'] LOOP
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('DROP OWNED BY %I', r);
      EXECUTE format('DROP ROLE %I', r);
    END IF;
  END LOOP;
END $$;

CREATE SCHEMA t4m_ledger;
CREATE SCHEMA t4m_akun;
CREATE SCHEMA t4m_identitas;
CREATE SCHEMA t4m_merchant;
CREATE SCHEMA t4m_pembayaran;
CREATE SCHEMA t4m_platform;

-- Pembagian modul menurut naskah 3b (tabel "Modul (schema)"): 6 + 4 + 1 + 4 + 5 + 2 = 22 tabel.
ALTER TABLE {s}.buku SET SCHEMA t4m_ledger;
ALTER TABLE {s}.jurnal SET SCHEMA t4m_ledger;
ALTER TABLE {s}.posting SET SCHEMA t4m_ledger;
ALTER TABLE {s}.kunci_idempotensi SET SCHEMA t4m_ledger;
ALTER TABLE {s}.batch_pencairan SET SCHEMA t4m_ledger;
ALTER TABLE {s}.baris_pencairan SET SCHEMA t4m_ledger;
ALTER TABLE {s}.akun SET SCHEMA t4m_akun;
ALTER TABLE {s}.sesi SET SCHEMA t4m_akun;
ALTER TABLE {s}.perangkat SET SCHEMA t4m_akun;
ALTER TABLE {s}.kota SET SCHEMA t4m_akun;
ALTER SEQUENCE {s}.akun_publik_id SET SCHEMA t4m_akun;
ALTER TABLE {s}.verifikasi SET SCHEMA t4m_identitas;
ALTER TABLE {s}.produk SET SCHEMA t4m_merchant;
ALTER TABLE {s}.promo SET SCHEMA t4m_merchant;
ALTER TABLE {s}.operasi_sinkron SET SCHEMA t4m_merchant;
ALTER TABLE {s}.qr SET SCHEMA t4m_merchant;
ALTER TABLE {s}.topup_bank SET SCHEMA t4m_pembayaran;
ALTER TABLE {s}.webhook_event SET SCHEMA t4m_pembayaran;
ALTER TABLE {s}.insiden_rekon SET SCHEMA t4m_pembayaran;
ALTER TABLE {s}.kartu SET SCHEMA t4m_pembayaran;
ALTER TABLE {s}.otorisasi_kartu SET SCHEMA t4m_pembayaran;
ALTER TABLE {s}.outbox SET SCHEMA t4m_platform;
ALTER TABLE {s}.audit_log SET SCHEMA t4m_platform;

-- Empat fungsi trigger invarian ledger ikut modul ledger. Mereka dibuat dengan search_path tetap ke schema lama
-- (SET search_path FROM CURRENT), jadi search_path-nya harus ikut dipindah.
ALTER FUNCTION {s}.cek_jurnal_seimbang() SET SCHEMA t4m_ledger;
ALTER FUNCTION {s}.cek_pembalik_cermin() SET SCHEMA t4m_ledger;
ALTER FUNCTION {s}.cek_saldo_karyawan() SET SCHEMA t4m_ledger;
ALTER FUNCTION {s}.tolak_ubah() SET SCHEMA t4m_ledger;
ALTER FUNCTION t4m_ledger.cek_jurnal_seimbang() SET search_path = t4m_ledger;
ALTER FUNCTION t4m_ledger.cek_pembalik_cermin() SET search_path = t4m_ledger;
ALTER FUNCTION t4m_ledger.cek_saldo_karyawan() SET search_path = t4m_ledger;
ALTER FUNCTION t4m_ledger.tolak_ubah() SET search_path = t4m_ledger;

-- Schema lama harus kosong: DROP tanpa CASCADE gagal bila ada objek yang terlewat.
DROP SCHEMA {s};

-- PostgreSQL 15 ke atas sudah mencabut CREATE di schema public dari PUBLIC pada database baru; pernyataan ini
-- membuat lab tidak bergantung pada bawaan itu.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- Role: satu per modul, satu untuk monolith (lima modul dalam satu proses), satu untuk service pembayaran.
-- Password sama dengan nama role: data lab lokal, bukan secret.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['t4m_ledger', 't4m_akun', 't4m_identitas', 't4m_merchant', 't4m_pembayaran', 't4m_platform', 't4m_monolit'] LOOP
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', r, r);
    END IF;
  END LOOP;
END $$;
-- Bawaan tiap role hanya schema-nya sendiri: SQL tanpa awalan schema ke tabel modul lain tidak menemukan tabelnya.
ALTER ROLE t4m_ledger SET search_path = t4m_ledger;
ALTER ROLE t4m_akun SET search_path = t4m_akun;
ALTER ROLE t4m_identitas SET search_path = t4m_identitas;
ALTER ROLE t4m_merchant SET search_path = t4m_merchant;
ALTER ROLE t4m_pembayaran SET search_path = t4m_pembayaran;
ALTER ROLE t4m_platform SET search_path = t4m_platform;
ALTER ROLE t4m_monolit SET search_path = t4m_ledger, t4m_akun, t4m_identitas, t4m_merchant, t4m_platform;

-- Hak per modul: hak role aplikasi api-t4 (labs/api-t4/dasar_t4.py, HAK) dibagi menurut modul pemilik tabelnya.
-- akun
GRANT USAGE ON SCHEMA t4m_akun TO t4m_akun;
GRANT SELECT (id, jenis, nama, email, password_hash, nomor_karyawan, wajib_ganti_password, gagal_login,
              terkunci_sampai, kota_id, tingkat, status) ON t4m_akun.akun TO t4m_akun;
GRANT INSERT (id, jenis, nama, email, password_hash) ON t4m_akun.akun TO t4m_akun;
GRANT UPDATE (password_hash, wajib_ganti_password, gagal_login, terkunci_sampai, tingkat, status) ON t4m_akun.akun TO t4m_akun;
GRANT SELECT, INSERT, DELETE ON t4m_akun.sesi TO t4m_akun;
GRANT SELECT ON t4m_akun.kota TO t4m_akun;
GRANT SELECT, INSERT, UPDATE ON t4m_akun.perangkat TO t4m_akun;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA t4m_akun TO t4m_akun;
-- ledger
GRANT USAGE ON SCHEMA t4m_ledger TO t4m_ledger;
GRANT SELECT, UPDATE (saldo_cache, versi, batas_harian) ON t4m_ledger.buku TO t4m_ledger;
GRANT INSERT (akun_id, jenis, batas_saldo, batas_harian) ON t4m_ledger.buku TO t4m_ledger;
GRANT SELECT, INSERT ON t4m_ledger.jurnal, t4m_ledger.posting TO t4m_ledger;
GRANT SELECT, INSERT, UPDATE, DELETE ON t4m_ledger.kunci_idempotensi TO t4m_ledger;
GRANT SELECT, INSERT, UPDATE ON t4m_ledger.batch_pencairan, t4m_ledger.baris_pencairan TO t4m_ledger;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA t4m_ledger TO t4m_ledger;
-- Kontrak kolom lintas modul yang dipakai kode lab ini: ledger membaca tingkat dan status akun (Tx.AkunTingkat) untuk
-- batas saldo menurut tingkat. Kolom nama tidak termasuk kontrak siapa pun.
GRANT USAGE ON SCHEMA t4m_akun TO t4m_ledger;
GRANT SELECT (id, tingkat, status) ON t4m_akun.akun TO t4m_ledger;
-- identitas
GRANT USAGE ON SCHEMA t4m_identitas TO t4m_identitas;
GRANT SELECT, INSERT, UPDATE ON t4m_identitas.verifikasi TO t4m_identitas;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA t4m_identitas TO t4m_identitas;
-- merchant
GRANT USAGE ON SCHEMA t4m_merchant TO t4m_merchant;
GRANT SELECT, INSERT, UPDATE ON t4m_merchant.produk, t4m_merchant.qr TO t4m_merchant;
GRANT SELECT, INSERT ON t4m_merchant.promo TO t4m_merchant;
GRANT SELECT, INSERT, DELETE ON t4m_merchant.operasi_sinkron TO t4m_merchant;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA t4m_merchant TO t4m_merchant;
-- pembayaran (service sendiri)
GRANT USAGE ON SCHEMA t4m_pembayaran TO t4m_pembayaran;
GRANT SELECT, INSERT, UPDATE ON t4m_pembayaran.topup_bank, t4m_pembayaran.webhook_event, t4m_pembayaran.insiden_rekon,
      t4m_pembayaran.kartu, t4m_pembayaran.otorisasi_kartu TO t4m_pembayaran;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA t4m_pembayaran TO t4m_pembayaran;
-- platform
GRANT USAGE ON SCHEMA t4m_platform TO t4m_platform;
GRANT SELECT, INSERT, UPDATE, DELETE ON t4m_platform.outbox TO t4m_platform;
GRANT SELECT, INSERT ON t4m_platform.audit_log TO t4m_platform;   -- log hanya bertambah (ADR 43)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA t4m_platform TO t4m_platform;
-- Monolith: lima modul dalam satu proses, jadi satu role yang mewarisi kelima role modul. Role pembayaran tidak
-- termasuk: schema pembayaran tidak terbaca dari proses monolith.
GRANT t4m_ledger, t4m_akun, t4m_identitas, t4m_merchant, t4m_platform TO t4m_monolit;
