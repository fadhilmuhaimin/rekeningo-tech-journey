-- Lab api-t5 · migration 000024: `posting` dipartisi per bulan menurut `dibuat` (naskah 3b; ADR 49; PostgreSQL 17 §5.12).
-- PRIMARY KEY harus memuat kolom kunci partisi, jadi PK berubah dari (id) ke (id, dibuat). Akibatnya `id` tidak lagi
-- dijaga unik oleh database lintas partisi: keunikannya datang dari sequence `posting_id_seq` (satu-satunya penulis).
-- Dijalankan di schema yang sudah berisi akhir Tahap 4, dalam satu transaction (dasar_t5.buat_schema). Tabel lama
-- diganti dengan menyalin barisnya, jadi migration ini juga benar bila `posting` sudah berisi.
--
-- Nama partisi relatif terhadap bulan migration dijalankan (posting_bulan_00 = bulan berjalan), bukan tanggal tetap,
-- supaya rekaman lab sama di bulan mana pun. Bulan memakai zona Asia/Jakarta. Semua baris sebelum bulan berjalan masuk
-- `posting_sebelum` (partisi berbatas, bukan partisi DEFAULT: DETACH ... CONCURRENTLY tidak boleh bila ada partisi default).
SET LOCAL timezone = 'Asia/Jakarta';

ALTER TABLE posting RENAME TO posting_lama;
ALTER INDEX posting_pkey RENAME TO posting_lama_pkey;
ALTER INDEX posting_buku RENAME TO posting_lama_buku;
ALTER INDEX posting_jurnal RENAME TO posting_lama_jurnal;
ALTER INDEX posting_riwayat RENAME TO posting_lama_riwayat;

CREATE TABLE posting (
    id        bigint      NOT NULL DEFAULT nextval('posting_id_seq'),
    jurnal_id bigint      NOT NULL REFERENCES jurnal (id),
    buku_id   bigint      NOT NULL REFERENCES buku (id),
    jumlah    bigint      NOT NULL CHECK (jumlah <> 0),
    dibuat    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id, dibuat)
) PARTITION BY RANGE (dibuat);
ALTER SEQUENCE posting_id_seq OWNED BY posting.id;
CREATE INDEX posting_buku ON posting (buku_id);
CREATE INDEX posting_jurnal ON posting (jurnal_id);
CREATE INDEX posting_riwayat ON posting (buku_id, dibuat, id);

-- Aturan ledger dari api-t2 dipasang ulang di tabel baru: jurnal seimbang, saldo karyawan tidak negatif, posting tidak diubah.
CREATE CONSTRAINT TRIGGER jurnal_seimbang AFTER INSERT ON posting DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION cek_jurnal_seimbang();
CREATE CONSTRAINT TRIGGER saldo_karyawan_tidak_negatif AFTER INSERT ON posting DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW WHEN (NEW.jumlah < 0) EXECUTE FUNCTION cek_saldo_karyawan();
CREATE TRIGGER posting_tidak_diubah BEFORE DELETE OR UPDATE ON posting FOR EACH ROW EXECUTE FUNCTION tolak_ubah();
-- Trigger TRUNCATE tingkat statement tidak ikut ke partisi: dipasang di tiap partisi oleh buat_partisi_posting.
CREATE TRIGGER posting_tidak_dikosongkan BEFORE TRUNCATE ON posting FOR EACH STATEMENT EXECUTE FUNCTION tolak_ubah();

-- Satu fungsi membuat satu partisi bulan dan memasang trigger TRUNCATE-nya. Dipakai migration ini dan job bulanan.
CREATE FUNCTION buat_partisi_posting(p_nama text, p_awal date) RETURNS void
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE
  dari timestamptz := p_awal::timestamp AT TIME ZONE 'Asia/Jakarta';
  ke   timestamptz := (p_awal + interval '1 month')::date::timestamp AT TIME ZONE 'Asia/Jakarta';
BEGIN
  IF p_awal <> date_trunc('month', p_awal)::date THEN
    RAISE EXCEPTION 'partisi dimulai di awal bulan, bukan %', p_awal USING ERRCODE = 'invalid_parameter_value';
  END IF;
  EXECUTE format('CREATE TABLE %I PARTITION OF posting FOR VALUES FROM (%L) TO (%L)', p_nama, dari, ke);
  EXECUTE format('CREATE TRIGGER posting_tidak_dikosongkan BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION tolak_ubah()', p_nama);
END $$;

DO $$
DECLARE
  awal date := date_trunc('month', now() AT TIME ZONE 'Asia/Jakarta')::date;
  i int;
BEGIN
  EXECUTE format('CREATE TABLE posting_sebelum PARTITION OF posting FOR VALUES FROM (MINVALUE) TO (%L)',
                 awal::timestamp AT TIME ZONE 'Asia/Jakarta');
  EXECUTE 'CREATE TRIGGER posting_tidak_dikosongkan BEFORE TRUNCATE ON posting_sebelum FOR EACH STATEMENT EXECUTE FUNCTION tolak_ubah()';
  FOR i IN 0..2 LOOP
    PERFORM buat_partisi_posting('posting_bulan_' || lpad(i::text, 2, '0'), (awal + make_interval(months => i))::date);
  END LOOP;
END $$;

INSERT INTO posting (id, jurnal_id, buku_id, jumlah, dibuat) SELECT id, jurnal_id, buku_id, jumlah, dibuat FROM posting_lama;
DROP TABLE posting_lama;
