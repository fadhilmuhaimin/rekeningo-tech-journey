-- Rilis 2 (migrate), langkah pertama · b4-skema versi ledger (keputusan 532).
-- Aturannya sama dengan labs/api-t2/migrasi/000012_ledger_migrasi.up.sql (keputusan 411), tetapi tanpa jeda:
-- tidak ada LOCK TABLE dan server tidak berhenti. Akun dibuka satu per satu oleh buka_buku(), yang dipanggil
-- backfill per 1.000 akun dan setiap pembayaran yang menyentuh akun yang belum punya buku.
SET LOCAL lock_timeout = '3s';   -- ALTER di bawah butuh ACCESS EXCLUSIVE pada transaksi, sesaat

-- Satu ruang nomor untuk transaksi v1 dan jurnal. Nomor jurnal mulai sesudah nomor transaksi terbesar
-- (000012 langkah 0), dan transaksi baru (server v1 maupun v2) mengambil nomor dari sequence jurnal.
-- Jadi /transfers/{id} yang disimpan app tidak pernah menunjuk dua kejadian berbeda.
ALTER TABLE transaksi ALTER COLUMN id SET DEFAULT nextval('jurnal_id_seq');
SELECT setval(pg_get_serial_sequence('jurnal', 'id'), (SELECT coalesce(max(id), 0) + 1 FROM transaksi), false);

-- Akun sistem dan buku sistem (000012 langkah 1 dan 2).
INSERT INTO akun (id, jenis, nama, email, password_hash)
VALUES (1, 'sistem', 'Sistem Rekeningo', 'sistem@lestari.example', '!');   -- '!' bukan hash: tidak bisa login
INSERT INTO buku (jenis) VALUES ('tunjangan'), ('kas_pencairan'), ('pembuka'), ('selisih');

-- buka_buku: untuk setiap akun karyawan dan warung di ids yang belum punya buku, buat buku dengan
-- saldo_cache = kolom saldo, satu jurnal pembuka bila saldo bukan 0, dan dua jurnal untuk setiap baris koreksi
-- (000012 langkah 1 sampai 4, per akun). Aturan lock: pemanggil sudah mengunci baris akun itu (FOR UPDATE),
-- jadi kolom saldo tidak berubah di tengah dan buku satu akun hanya bisa dibuka oleh satu transaction.
CREATE FUNCTION buka_buku(ids bigint[]) RETURNS integer
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE
  sistem  CONSTANT bigint := 1;
  pembuka bigint;
  selisih bigint;
  r       record;
  k       record;
  b       bigint;
  j       bigint;
  asal    bigint;
  n       integer := 0;
BEGIN
  SELECT id INTO pembuka FROM buku WHERE akun_id IS NULL AND jenis = 'pembuka';
  SELECT id INTO selisih FROM buku WHERE akun_id IS NULL AND jenis = 'selisih';
  FOR r IN SELECT a.id, a.jenis, a.nama, a.saldo FROM akun a
           WHERE a.id = ANY (ids) AND a.jenis IN ('karyawan', 'warung')
             AND NOT EXISTS (SELECT 1 FROM buku x WHERE x.akun_id = a.id)
           ORDER BY a.id LOOP
    UPDATE akun SET nomor_karyawan = 'K' || lpad(r.id::text, 5, '0')
    WHERE id = r.id AND jenis = 'karyawan' AND nomor_karyawan IS NULL;
    INSERT INTO buku (akun_id, jenis, saldo_cache, batas_saldo, batas_harian)
    VALUES (r.id, r.jenis, r.saldo,
            CASE WHEN r.jenis = 'warung'   THEN 1500000 END,   -- constraint batas_saldo_warung (000005)
            CASE WHEN r.jenis = 'karyawan' THEN 500000  END)   -- batas transfer per hari, PRD v2
    RETURNING id INTO b;
    IF r.saldo <> 0 THEN
      INSERT INTO jurnal (jenis, keterangan, dibuat_oleh)
      VALUES ('pembuka', format('Saldo awal %s per tanggal migrasi, dari kolom saldo v1', r.nama), sistem)
      RETURNING id INTO j;
      INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES (j, b, r.saldo), (j, pembuka, -r.saldo);
      UPDATE buku SET saldo_cache = saldo_cache - r.saldo WHERE id = pembuka;
    END IF;
    -- Koreksi v1: jurnal asal (lawannya buku selisih) dan pembalik dengan alasan dan admin dari baris koreksi.
    FOR k IN SELECT id, jumlah, alasan, admin_id FROM koreksi WHERE akun_id = r.id ORDER BY id LOOP
      INSERT INTO jurnal (jenis, keterangan, dibuat_oleh)
      VALUES ('selisih', format('Perubahan saldo %s yang tidak punya baris di v1; dibalik oleh koreksi v1 #%s', r.nama, k.id), sistem)
      RETURNING id INTO asal;
      INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES (asal, b, -k.jumlah), (asal, selisih, k.jumlah);
      INSERT INTO jurnal (jenis, keterangan, membalik_jurnal_id, dibuat_oleh)
      VALUES ('pembalik', format('Koreksi v1 #%s: %s', k.id, k.alasan), asal, k.admin_id)
      RETURNING id INTO j;
      INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES (j, b, k.jumlah), (j, selisih, -k.jumlah);
    END LOOP;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
