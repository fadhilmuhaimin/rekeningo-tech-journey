-- DIBUAT labs/api-t2/run.py dari labs/b3-ledger/schema.sql tanpa blok akun (keputusan 409).
-- Jangan diubah tangan: ubah b3-ledger/schema.sql lalu jalankan make -C labs/api-t2 run.
-- Rilis 1 (expand), bagian 2 dari 3: tabel ledger. Tabel akun v1 dipakai apa adanya
-- (kolom peran di b3-ledger = jenis di sini; akun sistem ditambah 000009).
SET LOCAL lock_timeout = '3s';

-- Ledger double-entry Tahap 2 · Rekeningo (fiktif), mengikuti plan/CERITA-TAHAP-2.md bagian 3 dan 3b (keputusan 400).
-- File ini tidak menyebut nama schema. Lab yang memakainya membuat schema sendiri, mengarahkan search_path ke sana,
-- lalu menjalankan file ini (b3-ledger memakai schema b3_ledger). Fungsi memakai SET search_path FROM CURRENT,
-- jadi trigger tetap membaca tabel schema ini walau dipanggil dari koneksi dengan search_path lain.
--
-- Tiga invarian dijaga database (naskah bagian 3), semuanya lewat trigger (keputusan 401):
--   1. setiap jurnal seimbang: minimal dua posting, jumlahnya 0           -> 23514 check_violation, jurnal_seimbang
--   2. posting dan jurnal tidak pernah di-UPDATE, DELETE, atau TRUNCATE   -> 23001 restrict_violation, posting_tidak_diubah
--   3. saldo buku karyawan tidak negatif sesudah transaction              -> 23514 check_violation, saldo_karyawan_tidak_negatif
-- Invarian 1 dan 3 diperiksa saat COMMIT (constraint trigger DEFERRABLE INITIALLY DEFERRED).
-- Invarian 3 hanya membaca, tanpa lock. Dua transaction bersamaan bisa sama-sama lolos (output/batas.txt, keputusan 403).

-- --8<-- [start:buku]
-- Satu buku = satu tempat uang dicatat. Buku karyawan dan warung punya pemilik; buku sistem tidak.
CREATE TABLE buku (
  id           bigserial PRIMARY KEY,
  akun_id      bigint    REFERENCES akun(id),
  jenis        text      NOT NULL CHECK (jenis IN (
                 'karyawan', 'warung',                   -- milik satu akun
                 'tunjangan',                            -- sumber top-up; makin negatif = makin banyak uang yang dikeluarkan
                 'kas_pencairan',                        -- uang warung yang sedang ditransfer ke bank
                 'pembuka',                              -- lawan saldo awal saat migrasi dari kolom saldo v1
                 'selisih')),                            -- lawan perubahan v1 yang tidak punya baris (dikoreksi tabel koreksi)
  saldo_cache  bigint    NOT NULL DEFAULT 0,             -- salinan cepat; source of truth = jumlah posting (keputusan 402)
  batas_saldo  bigint    CHECK (batas_saldo > 0),        -- dibaca app, belum dijaga database
  batas_harian bigint    CHECK (batas_harian > 0),       -- dibaca app, belum dijaga database
  versi        integer   NOT NULL DEFAULT 0,             -- untuk optimistic lock (M9)
  CONSTRAINT buku_pemilik CHECK ((akun_id IS NOT NULL) = (jenis IN ('karyawan', 'warung'))),
  UNIQUE (akun_id, jenis)
);
CREATE UNIQUE INDEX buku_sistem_satu_per_jenis ON buku (jenis) WHERE akun_id IS NULL;
-- --8<-- [end:buku]

-- --8<-- [start:jurnal]
-- Satu jurnal = satu kejadian yang memindahkan uang: siapa, kapan, kenapa.
CREATE TABLE jurnal (
  id                 bigserial   PRIMARY KEY,
  jenis              text        NOT NULL CHECK (jenis IN
                       ('pembuka', 'selisih', 'topup', 'bayar', 'transfer', 'pencairan', 'pembalik')),
  keterangan         text        NOT NULL,
  membalik_jurnal_id bigint      UNIQUE REFERENCES jurnal(id),   -- satu jurnal paling banyak dibalik sekali
  dibuat_oleh        bigint      NOT NULL REFERENCES akun(id),
  dibuat             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pembalik_merujuk_asal CHECK ((jenis = 'pembalik') = (membalik_jurnal_id IS NOT NULL)),
  CONSTRAINT pembalik_beralasan CHECK (jenis <> 'pembalik' OR length(trim(keterangan)) >= 20)
);
-- --8<-- [end:jurnal]

-- --8<-- [start:posting]
-- Satu posting = satu baris uang di satu buku. Negatif keluar, positif masuk.
CREATE TABLE posting (
  id        bigserial   PRIMARY KEY,
  jurnal_id bigint      NOT NULL REFERENCES jurnal(id),
  buku_id   bigint      NOT NULL REFERENCES buku(id),
  jumlah    bigint      NOT NULL CHECK (jumlah <> 0),   -- rupiah, integer
  dibuat    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX posting_jurnal ON posting (jurnal_id);   -- invarian 1: jumlah per jurnal
CREATE INDEX posting_buku   ON posting (buku_id);     -- invarian 3: jumlah per buku
-- Index riwayat posting (buku_id, dibuat, id) belum ada: itu keputusan M11 (ADR 15).
-- --8<-- [end:posting]

-- --8<-- [start:invarian-1]
-- Invarian 1: jurnal seimbang. Diperiksa saat COMMIT, setelah semua posting jurnal itu masuk.
-- Dipasang di dua tabel: jurnal tanpa posting juga ditolak, dan posting yang ditambahkan ke jurnal lama ikut diperiksa.
CREATE FUNCTION cek_jurnal_seimbang() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE
  j     bigint;
  n     bigint;
  total bigint;
BEGIN
  IF TG_TABLE_NAME = 'jurnal' THEN
    j := NEW.id;
  ELSE
    j := NEW.jurnal_id;
  END IF;
  SELECT count(*), coalesce(sum(jumlah), 0) INTO n, total FROM posting WHERE jurnal_id = j;
  IF n < 2 OR total <> 0 THEN
    RAISE EXCEPTION 'jurnal % tidak seimbang: % posting, jumlah %', j, n, total
      USING ERRCODE = 'check_violation', CONSTRAINT = 'jurnal_seimbang', TABLE = 'posting',
            HINT = 'Jurnal butuh minimal dua posting yang jumlahnya 0.';
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER jurnal_seimbang AFTER INSERT ON jurnal
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION cek_jurnal_seimbang();
CREATE CONSTRAINT TRIGGER jurnal_seimbang AFTER INSERT ON posting
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION cek_jurnal_seimbang();
-- --8<-- [end:invarian-1]

-- --8<-- [start:pembalik]
-- Jurnal pembalik harus cermin jurnal asalnya: buku yang sama, tanda jumlah dibalik.
CREATE FUNCTION cek_pembalik_cermin() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  IF EXISTS ((SELECT buku_id, -jumlah FROM posting WHERE jurnal_id = NEW.membalik_jurnal_id)
             EXCEPT ALL (SELECT buku_id, jumlah FROM posting WHERE jurnal_id = NEW.id))
     OR EXISTS ((SELECT buku_id, jumlah FROM posting WHERE jurnal_id = NEW.id)
             EXCEPT ALL (SELECT buku_id, -jumlah FROM posting WHERE jurnal_id = NEW.membalik_jurnal_id)) THEN
    RAISE EXCEPTION 'jurnal % bukan cermin jurnal asal %', NEW.id, NEW.membalik_jurnal_id
      USING ERRCODE = 'check_violation', CONSTRAINT = 'pembalik_cermin_asal', TABLE = 'jurnal';
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER pembalik_cermin_asal AFTER INSERT ON jurnal
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
  WHEN (NEW.membalik_jurnal_id IS NOT NULL) EXECUTE FUNCTION cek_pembalik_cermin();
-- --8<-- [end:pembalik]

-- --8<-- [start:invarian-2]
-- Invarian 2: append-only. Kesalahan dikoreksi dengan jurnal pembalik, bukan dengan mengubah baris lama.
-- Batas: pemilik tabel dan superuser bisa mematikan trigger (ALTER TABLE ... DISABLE TRIGGER,
-- session_replication_role = replica). App memakai role yang bukan pemilik tabel (keputusan 401).
CREATE FUNCTION tolak_ubah() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  RAISE EXCEPTION '% pada % ditolak: baris % tidak pernah diubah atau dihapus', TG_OP, TG_TABLE_NAME, TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation', CONSTRAINT = TG_TABLE_NAME || '_tidak_diubah', TABLE = TG_TABLE_NAME,
          HINT = 'Koreksi lewat jurnal pembalik.';
END $$;

CREATE TRIGGER posting_tidak_diubah BEFORE UPDATE OR DELETE ON posting
  FOR EACH ROW EXECUTE FUNCTION tolak_ubah();
CREATE TRIGGER posting_tidak_dikosongkan BEFORE TRUNCATE ON posting
  FOR EACH STATEMENT EXECUTE FUNCTION tolak_ubah();
CREATE TRIGGER jurnal_tidak_diubah BEFORE UPDATE OR DELETE ON jurnal
  FOR EACH ROW EXECUTE FUNCTION tolak_ubah();
CREATE TRIGGER jurnal_tidak_dikosongkan BEFORE TRUNCATE ON jurnal
  FOR EACH STATEMENT EXECUTE FUNCTION tolak_ubah();
-- --8<-- [end:invarian-2]

-- --8<-- [start:invarian-3]
-- Invarian 3: saldo buku karyawan = jumlah semua posting-nya, tidak boleh negatif.
-- Diperiksa saat COMMIT untuk setiap posting keluar (jumlah < 0) di buku karyawan.
-- Pemeriksaan ini hanya membaca: tidak ada lock. Di READ COMMITTED, pemeriksaan melihat transaction lain
-- yang sudah COMMIT, tetapi tidak yang belum. Lihat output/batas.txt.
CREATE FUNCTION cek_saldo_karyawan() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE
  saldo bigint;
BEGIN
  IF (SELECT jenis FROM buku WHERE id = NEW.buku_id) <> 'karyawan' THEN
    RETURN NULL;
  END IF;
  SELECT coalesce(sum(jumlah), 0) INTO saldo FROM posting WHERE buku_id = NEW.buku_id;
  IF saldo < 0 THEN
    RAISE EXCEPTION 'saldo buku % (karyawan) jadi % sesudah jurnal %', NEW.buku_id, saldo, NEW.jurnal_id
      USING ERRCODE = 'check_violation', CONSTRAINT = 'saldo_karyawan_tidak_negatif', TABLE = 'posting';
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER saldo_karyawan_tidak_negatif AFTER INSERT ON posting
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
  WHEN (NEW.jumlah < 0) EXECUTE FUNCTION cek_saldo_karyawan();
-- --8<-- [end:invarian-3]
