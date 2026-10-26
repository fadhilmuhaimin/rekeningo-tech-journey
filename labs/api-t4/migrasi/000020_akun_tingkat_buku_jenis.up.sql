-- Tahap 4, rilis expand 1 dari 4 (lab-api-t4): tingkat dan status akun, jenis akun dan buku baru, tujuan outbox,
-- gambar produk. Naskah 3b ("Apa yang berubah dan kenapa"). Nomor sesudah migrasi terakhir api-t3 (000019).
-- Kolom lama tidak diganti nama atau dihapus: kode api-t3 yang masih jalan tidak melihat bedanya.
SET LOCAL lock_timeout = '3s';

-- akun: tingkat verifikasi menentukan batas saldo (Asumsi produk); status dipakai tim risk untuk membekukan.
ALTER TABLE akun
  ADD COLUMN tingkat text NOT NULL DEFAULT 'belum' CHECK (tingkat IN ('belum', 'terverifikasi')),
  ADD COLUMN status  text NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'dibekukan'));
ALTER TABLE akun DROP CONSTRAINT akun_jenis_check;
ALTER TABLE akun ADD CONSTRAINT akun_jenis_check
  CHECK (jenis IN ('karyawan', 'warung', 'admin', 'sistem', 'hr', 'pemakai', 'merchant', 'risk'));
-- 10.000 akun Lestari ditandai terverifikasi lewat HR (PRD v4): akun yang sudah ada sebelum migrasi ini.
UPDATE akun SET tingkat = 'terverifikasi' WHERE jenis IN ('karyawan', 'warung', 'admin', 'sistem', 'hr');
-- Akun yang mendaftar sendiri mendapat nomor dari sini (data lab memakai nomor di bawah 50001).
CREATE SEQUENCE akun_publik_id START 50001;

-- buku: dua jenis milik akun (pemakai, merchant) dan tiga buku sistem (bank, dana tertahan, settlement kartu).
ALTER TABLE buku DROP CONSTRAINT buku_jenis_check;
ALTER TABLE buku ADD CONSTRAINT buku_jenis_check CHECK (jenis IN (
  'karyawan', 'warung', 'pemakai', 'merchant',
  'tunjangan', 'kas_pencairan', 'pembuka', 'selisih',
  'bank',              -- lawan top-up dari rekening bank; makin negatif = makin banyak uang masuk dari luar
  'dana_tertahan',     -- dana yang sudah disetujui untuk kartu tetapi belum ditagih penerbit (hold)
  'settlement_kartu'));  -- dana yang sudah ditagih penerbit kartu (clearing)
ALTER TABLE buku DROP CONSTRAINT buku_pemilik;
ALTER TABLE buku ADD CONSTRAINT buku_pemilik
  CHECK ((akun_id IS NOT NULL) = (jenis IN ('karyawan', 'warung', 'pemakai', 'merchant')));
INSERT INTO buku (jenis) VALUES ('bank'), ('dana_tertahan'), ('settlement_kartu');

-- Invarian 3 (saldo tidak negatif) berlaku juga untuk buku pemakai dan merchant. Isi fungsi sama dengan 000010
-- kecuali daftar jenisnya.
CREATE OR REPLACE FUNCTION cek_saldo_karyawan() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE
  saldo bigint;
BEGIN
  IF (SELECT jenis FROM buku WHERE id = NEW.buku_id) NOT IN ('karyawan', 'pemakai', 'merchant') THEN
    RETURN NULL;
  END IF;
  SELECT coalesce(sum(jumlah), 0) INTO saldo FROM posting WHERE buku_id = NEW.buku_id;
  IF saldo < 0 THEN
    RAISE EXCEPTION 'saldo buku % (milik akun) jadi % sesudah jurnal %', NEW.buku_id, saldo, NEW.jurnal_id
      USING ERRCODE = 'check_violation', CONSTRAINT = 'saldo_karyawan_tidak_negatif', TABLE = 'posting';
  END IF;
  RETURN NULL;
END $$;

-- jurnal: tiga jenis baru. Pembayaran QR memakai jenis bayar yang sudah ada.
ALTER TABLE jurnal DROP CONSTRAINT jurnal_jenis_check;
ALTER TABLE jurnal ADD CONSTRAINT jurnal_jenis_check CHECK (jenis IN
  ('pembuka', 'selisih', 'topup', 'bayar', 'transfer', 'pencairan', 'pembalik',
   'topup_bank', 'kartu_tahan', 'kartu_tangkap'));

-- outbox: lajur per tujuan. Pekerjaan verifikasi memakai mekanisme klaim yang sama dengan notifikasi (ADR 24).
-- Pekerjaan verifikasi tidak punya jurnal, seperti promo.
ALTER TABLE outbox ADD COLUMN tujuan text NOT NULL DEFAULT 'push' CHECK (tujuan IN ('push', 'verifikasi'));
ALTER TABLE outbox DROP CONSTRAINT outbox_jenis_check;
ALTER TABLE outbox ADD CONSTRAINT outbox_jenis_check CHECK (jenis IN ('bayar', 'transfer', 'topup', 'promo', 'verifikasi'));
ALTER TABLE outbox DROP CONSTRAINT outbox_jurnal_atau_promo;
ALTER TABLE outbox ADD CONSTRAINT outbox_jurnal_atau_promo CHECK ((jurnal_id IS NULL) = (jenis IN ('promo', 'verifikasi')));
ALTER TABLE outbox ADD CONSTRAINT outbox_tujuan_sesuai_jenis CHECK ((tujuan = 'verifikasi') = (jenis = 'verifikasi'));
CREATE INDEX outbox_antre_tujuan ON outbox (tujuan, kelas, id) WHERE status = 'menunggu';

-- produk: merchant luar mengimpor katalog dengan URL gambar.
ALTER TABLE produk ADD COLUMN gambar_url text;
