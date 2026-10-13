-- Rilis 2 (migrate) · Tahap 2: saldo kolom v1 jadi ledger (naskah bagian 3 "Migrasi", keputusan 411).
-- Aturannya sama dengan labs/b3-ledger/migrasi_v1.sql (keputusan 404), tetapi di tempat: akun tidak disalin,
-- karena server berikutnya memakai tabel akun yang sama. Dijalankan dalam satu transaction saat server v1 berhenti.
-- Gagal keras (RAISE) bila saldo satu akun berbeda sebelum dan sesudah; seluruh transaction batal.
SET LOCAL lock_timeout = '3s';
-- Server v1 yang terlanjur jalan tidak bisa menulis tabel v1 sampai migrasi selesai; membaca tetap bisa.
-- Tanpa lock ini, tulisan bersamaan membuat cek langkah 6 gagal dan seluruh migrasi batal (catatan peninjau #254).
-- Tulisan yang mengantre di belakang lock ini berjalan sesudah COMMIT. Karena itu hak akses app dicabut di
-- transaction yang sama dengan file ini (labs/api-t2/run.py, keputusan 417), bukan sesudahnya.
LOCK TABLE akun, transaksi, topup, koreksi IN EXCLUSIVE MODE;

DO $$
DECLARE
  sistem  CONSTANT bigint := 1;
  pembuka bigint;
  selisih bigint;
  r       record;
  j       bigint;
  asal    bigint;
  n_pembuka integer := 0;
  n_koreksi integer := 0;
BEGIN
  -- 0. Nomor jurnal dimulai sesudah nomor transaksi v1 terbesar. App lama yang menyimpan /transfers/{id}
  --    dari v1 tidak pernah membuka jurnal orang lain dengan nomor yang sama; ia mendapat 404.
  PERFORM setval(pg_get_serial_sequence('jurnal', 'id'), (SELECT coalesce(max(id), 0) + 1 FROM transaksi), false);

  -- 1. Akun sistem dan nomor karyawan untuk akun Gedung A yang belum punya (data lab: K + 5 digit nomor akun).
  INSERT INTO akun (id, jenis, nama, email, password_hash)
  VALUES (sistem, 'sistem', 'Sistem Rekeningo', 'sistem@lestari.example', '!');   -- '!' bukan hash: tidak bisa login
  UPDATE akun SET nomor_karyawan = 'K' || lpad(id::text, 5, '0')
  WHERE jenis = 'karyawan' AND nomor_karyawan IS NULL;

  -- 2. Buku sistem, lalu satu buku per akun karyawan dan warung. Kolom saldo v1 jadi saldo_cache.
  INSERT INTO buku (jenis) VALUES ('tunjangan'), ('kas_pencairan'), ('pembuka'), ('selisih');
  INSERT INTO buku (akun_id, jenis, saldo_cache, batas_saldo, batas_harian)
  SELECT id, jenis, saldo,
         CASE WHEN jenis = 'warung'   THEN 1500000 END,   -- constraint batas_saldo_warung (000005)
         CASE WHEN jenis = 'karyawan' THEN 500000  END    -- batas transfer per hari, PRD v2
  FROM akun WHERE jenis IN ('karyawan', 'warung') ORDER BY id;
  IF EXISTS (SELECT 1 FROM akun WHERE jenis NOT IN ('karyawan', 'warung') AND saldo <> 0) THEN
    RAISE EXCEPTION 'akun tanpa buku punya saldo; migrasi dihentikan';
  END IF;
  SELECT id INTO pembuka FROM buku WHERE jenis = 'pembuka';
  SELECT id INTO selisih FROM buku WHERE jenis = 'selisih';

  -- 3. Saldo kolom jadi jurnal pembuka per akun yang saldonya bukan 0: buku akun +saldo, buku pembuka -saldo.
  FOR r IN SELECT a.id, a.nama, a.saldo, b.id AS buku_id
           FROM akun a JOIN buku b ON b.akun_id = a.id
           WHERE a.saldo <> 0 ORDER BY a.id LOOP
    INSERT INTO jurnal (jenis, keterangan, dibuat_oleh)
    VALUES ('pembuka', format('Saldo awal %s per tanggal migrasi, dari kolom saldo v1', r.nama), sistem)
    RETURNING id INTO j;
    INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES (j, r.buku_id, r.saldo), (j, pembuka, -r.saldo);
    n_pembuka := n_pembuka + 1;
  END LOOP;

  -- 4. Setiap baris koreksi jadi dua jurnal: asal (perubahan yang di v1 tidak punya baris, lawannya buku selisih)
  --    dan pembalik dengan alasan dan admin dari baris koreksi. Jumlah keduanya 0, saldo tidak berubah.
  FOR r IN SELECT k.id, k.jumlah, k.alasan, k.admin_id, a.nama, b.id AS buku_id
           FROM koreksi k JOIN akun a ON a.id = k.akun_id LEFT JOIN buku b ON b.akun_id = k.akun_id
           ORDER BY k.id LOOP
    IF r.buku_id IS NULL THEN
      RAISE EXCEPTION 'koreksi v1 #% untuk akun tanpa buku; migrasi dihentikan', r.id;
    END IF;
    INSERT INTO jurnal (jenis, keterangan, dibuat_oleh)
    VALUES ('selisih', format('Perubahan saldo %s yang tidak punya baris di v1; dibalik oleh koreksi v1 #%s', r.nama, r.id), sistem)
    RETURNING id INTO asal;
    INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES (asal, r.buku_id, -r.jumlah), (asal, selisih, r.jumlah);
    INSERT INTO jurnal (jenis, keterangan, membalik_jurnal_id, dibuat_oleh)
    VALUES ('pembalik', format('Koreksi v1 #%s: %s', r.id, r.alasan), asal, r.admin_id)
    RETURNING id INTO j;
    INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES (j, r.buku_id, r.jumlah), (j, selisih, -r.jumlah);
    n_koreksi := n_koreksi + 1;
  END LOOP;

  -- 5. saldo_cache buku sistem diisi dari posting migrasi.
  UPDATE buku b SET saldo_cache = (SELECT coalesce(sum(jumlah), 0) FROM posting p WHERE p.buku_id = b.id)
  WHERE b.akun_id IS NULL;

  -- 6. Kolom saldo v1 = jumlah posting = saldo_cache untuk setiap akun; cache = jumlah posting untuk setiap buku.
  IF EXISTS (SELECT 1 FROM akun a JOIN buku b ON b.akun_id = a.id
             WHERE a.saldo <> (SELECT coalesce(sum(jumlah), 0) FROM posting p WHERE p.buku_id = b.id))
  OR EXISTS (SELECT 1 FROM buku b
             WHERE b.saldo_cache <> (SELECT coalesce(sum(jumlah), 0) FROM posting p WHERE p.buku_id = b.id)) THEN
    RAISE EXCEPTION 'saldo berbeda sebelum dan sesudah migrasi; migrasi dihentikan';
  END IF;

  RAISE NOTICE 'migrasi: % buku akun, % jurnal pembuka, % koreksi jadi % jurnal',
    (SELECT count(*) FROM buku WHERE akun_id IS NOT NULL), n_pembuka, n_koreksi, 2 * n_koreksi;
END $$;
