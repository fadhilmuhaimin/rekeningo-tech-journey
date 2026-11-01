-- Lab api-t5 · migration 000026: kolom dan nilai baru di tabel Tahap 4 (naskah 3b, tabel "Apa yang berubah dan kenapa").
-- Semua bersifat expand: baris lama tetap sah, kolom baru boleh kosong, nilai baru hanya menambah daftar.

-- akun: satu merchant, satu mitra POS (Asumsi cerita). Tanpa foreign key: mitra_pos milik service merchant.
ALTER TABLE akun ADD COLUMN mitra_pos_id bigint;

-- jurnal: referensi bisnis unik untuk jurnal berulang (bentuk `angsuran:<jadwal_id>:<ke>`), dan dua jenis baru.
ALTER TABLE jurnal ADD COLUMN referensi text UNIQUE;
ALTER TABLE jurnal DROP CONSTRAINT jurnal_jenis_check;
ALTER TABLE jurnal ADD CONSTRAINT jurnal_jenis_check CHECK (jenis = ANY (ARRAY['pembuka', 'selisih', 'topup', 'bayar',
    'transfer', 'pencairan', 'pembalik', 'topup_bank', 'kartu_tahan', 'kartu_tangkap', 'angsuran', 'tabungan']));
ALTER TABLE jurnal ADD CONSTRAINT referensi_bentuk CHECK (referensi IS NULL OR referensi ~ '^(angsuran|tabungan):[0-9]+:[0-9]+$');

-- buku: kantong tabungan milik akun, ditambahkan ke aturan buku milik akun. Saldonya tetap jumlah posting dan tidak negatif.
ALTER TABLE buku DROP CONSTRAINT buku_jenis_check;
ALTER TABLE buku ADD CONSTRAINT buku_jenis_check CHECK (jenis = ANY (ARRAY['karyawan', 'warung', 'pemakai', 'merchant',
    'tunjangan', 'kas_pencairan', 'pembuka', 'selisih', 'bank', 'dana_tertahan', 'settlement_kartu', 'tabungan']));
ALTER TABLE buku DROP CONSTRAINT buku_pemilik;
ALTER TABLE buku ADD CONSTRAINT buku_pemilik CHECK ((akun_id IS NOT NULL) = (jenis = ANY (ARRAY['karyawan', 'warung',
    'pemakai', 'merchant', 'tabungan'])));
CREATE OR REPLACE FUNCTION cek_saldo_karyawan() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE
  saldo bigint;
BEGIN
  IF (SELECT jenis FROM buku WHERE id = NEW.buku_id) NOT IN ('karyawan', 'pemakai', 'merchant', 'tabungan') THEN
    RETURN NULL;
  END IF;
  SELECT coalesce(sum(jumlah), 0) INTO saldo FROM posting WHERE buku_id = NEW.buku_id;
  IF saldo < 0 THEN
    RAISE EXCEPTION 'saldo buku % (milik akun) jadi % sesudah jurnal %', NEW.buku_id, saldo, NEW.jurnal_id
      USING ERRCODE = 'check_violation', CONSTRAINT = 'saldo_karyawan_tidak_negatif', TABLE = 'posting';
  END IF;
  RETURN NULL;
END $$;

-- outbox: tujuan baru `stream` (diteruskan relay ke event streaming) dan jenis `pengumuman` (satu baris per pengumuman,
-- tanpa jurnal). Worker push hanya mengambil tujuan `push`.
ALTER TABLE outbox DROP CONSTRAINT outbox_tujuan_check;
ALTER TABLE outbox ADD CONSTRAINT outbox_tujuan_check CHECK (tujuan = ANY (ARRAY['push', 'verifikasi', 'stream']));
ALTER TABLE outbox DROP CONSTRAINT outbox_jenis_check;
ALTER TABLE outbox ADD CONSTRAINT outbox_jenis_check CHECK (jenis = ANY (ARRAY['bayar', 'transfer', 'topup', 'promo', 'verifikasi', 'pengumuman']));
ALTER TABLE outbox DROP CONSTRAINT outbox_jurnal_atau_promo;
ALTER TABLE outbox ADD CONSTRAINT outbox_jurnal_atau_promo CHECK ((jurnal_id IS NULL) = (jenis = ANY (ARRAY['promo', 'verifikasi', 'pengumuman'])));
ALTER TABLE outbox ADD CONSTRAINT outbox_pengumuman_ke_stream CHECK (jenis <> 'pengumuman' OR tujuan = 'stream');
