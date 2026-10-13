-- Migrasi data v1 ke ledger (naskah Tahap 2 bagian 3 "Migrasi", keputusan 404).
-- Dijalankan di dalam satu transaction dengan search_path ke schema ledger; tabel v1 dibaca dari schema b3_ledger_v1.
-- Gagal keras (RAISE) bila saldo satu akun berbeda sebelum dan sesudah; seluruh transaction batal.
-- --8<-- [start:migrasi]
DO $$
DECLARE
  sistem  CONSTANT bigint := 1;
  pembuka bigint;
  selisih bigint;
  r       record;
  j       bigint;
  asal    bigint;
  n_jurnal_pembuka integer := 0;
  n_koreksi        integer := 0;
BEGIN
  -- 1. Akun pindah apa adanya; jenis v1 jadi peran. Akun sistem baru mencatat jurnal yang dibuat migrasi dan job.
  INSERT INTO akun (id, nama, email, peran) VALUES (sistem, 'Sistem Rekeningo', 'sistem@lestari.example', 'sistem');
  INSERT INTO akun (id, nama, email, peran) SELECT id, nama, email, jenis FROM b3_ledger_v1.akun ORDER BY id;

  -- 2. Buku sistem, lalu satu buku per akun karyawan dan warung. Kolom saldo v1 dipertahankan sebagai saldo_cache.
  INSERT INTO buku (jenis) VALUES ('tunjangan'), ('kas_pencairan'), ('pembuka'), ('selisih');
  INSERT INTO buku (akun_id, jenis, saldo_cache, batas_saldo, batas_harian)
  SELECT id, jenis, saldo,
         CASE WHEN jenis = 'warung'   THEN 1500000 END,   -- batas saldo warung sejak minggu 2 Tahap 1 (api-t1 m4.txt)
         CASE WHEN jenis = 'karyawan' THEN 500000  END    -- batas transfer per hari, PRD v2
  FROM b3_ledger_v1.akun WHERE jenis IN ('karyawan', 'warung') ORDER BY id;
  IF EXISTS (SELECT 1 FROM b3_ledger_v1.akun WHERE jenis NOT IN ('karyawan', 'warung') AND saldo <> 0) THEN
    RAISE EXCEPTION 'akun v1 tanpa buku punya saldo; migrasi dihentikan';
  END IF;
  SELECT id INTO pembuka FROM buku WHERE jenis = 'pembuka';
  SELECT id INTO selisih FROM buku WHERE jenis = 'selisih';

  -- 3. Saldo kolom jadi jurnal pembuka per akun: buku akun +saldo, buku pembuka -saldo.
  FOR r IN SELECT a.id, a.nama, a.saldo, b.id AS buku_id
           FROM b3_ledger_v1.akun a JOIN buku b ON b.akun_id = a.id
           WHERE a.saldo <> 0 ORDER BY a.id LOOP
    INSERT INTO jurnal (jenis, keterangan, dibuat_oleh)
    VALUES ('pembuka', format('Saldo awal %s per tanggal migrasi, dari kolom saldo v1', r.nama), sistem)
    RETURNING id INTO j;
    INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES (j, r.buku_id, r.saldo), (j, pembuka, -r.saldo);
    n_jurnal_pembuka := n_jurnal_pembuka + 1;
  END LOOP;

  -- 4. Setiap baris koreksi jadi dua jurnal. Jurnal asal mencatat perubahan yang dikoreksi, yang di v1 tidak punya
  --    baris (lawannya buku selisih). Jurnal pembalik membaliknya dengan alasan dan admin dari baris koreksi.
  --    Jumlah keduanya 0, jadi saldo tetap sama dengan kolom saldo v1.
  FOR r IN SELECT k.id, k.jumlah, k.alasan, k.admin_id, a.nama, b.id AS buku_id
           FROM b3_ledger_v1.koreksi k
           JOIN b3_ledger_v1.akun a ON a.id = k.akun_id
           LEFT JOIN buku b ON b.akun_id = k.akun_id
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

  -- 6. Saldo tiap akun harus sama: kolom saldo v1 = jumlah posting = saldo_cache. Semua buku: cache = jumlah posting.
  IF EXISTS (
    SELECT 1 FROM b3_ledger_v1.akun a
    JOIN buku b ON b.akun_id = a.id
    WHERE a.saldo <> (SELECT coalesce(sum(jumlah), 0) FROM posting p WHERE p.buku_id = b.id))
  OR EXISTS (
    SELECT 1 FROM buku b
    WHERE b.saldo_cache <> (SELECT coalesce(sum(jumlah), 0) FROM posting p WHERE p.buku_id = b.id)) THEN
    RAISE EXCEPTION 'saldo berbeda sebelum dan sesudah migrasi; migrasi dihentikan';
  END IF;

  RAISE NOTICE 'migrasi: % akun, % jurnal pembuka, % koreksi jadi % jurnal',
    (SELECT count(*) FROM b3_ledger_v1.akun), n_jurnal_pembuka, n_koreksi, 2 * n_koreksi;
END $$;
-- --8<-- [end:migrasi]
