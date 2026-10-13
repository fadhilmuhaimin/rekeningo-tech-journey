-- Rilis 3 (contract) · Tahap 2 (keputusan 412). Di cerita: akhir Tahap 2, sesudah cek cache tiap malam cocok.
-- Sesudah ini server v1 tidak bisa jalan lagi (kolom saldo dan tabel v1 hilang); rollback hanya lewat cadangan.
-- Isi tabel v1 disalin ke arsip lebih dulu (langkah operasional, labs/api-t2/run.py), bukan oleh file ini.
SET LOCAL lock_timeout = '3s';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM buku b
             WHERE b.saldo_cache <> (SELECT coalesce(sum(jumlah), 0) FROM posting p WHERE p.buku_id = b.id)) THEN
    RAISE EXCEPTION 'saldo_cache tidak cocok dengan jumlah posting; contract dihentikan';
  END IF;
END $$;

-- Saldo kini buku.saldo_cache + jumlah posting. Batas saldo warung pindah ke buku.batas_saldo (000012).
ALTER TABLE akun DROP CONSTRAINT batas_saldo_warung;
ALTER TABLE akun DROP CONSTRAINT saldo_tidak_negatif;
ALTER TABLE akun DROP COLUMN saldo;

-- Setiap karyawan bisa menerima transfer lewat nomornya.
ALTER TABLE akun ADD CONSTRAINT karyawan_bernomor CHECK (jenis <> 'karyawan' OR nomor_karyawan IS NOT NULL);

-- transaksi, topup, koreksi diganti jurnal (naskah 3b "Apa yang berubah dan kenapa").
DROP TABLE koreksi;
DROP TABLE topup;
DROP TABLE transaksi;
