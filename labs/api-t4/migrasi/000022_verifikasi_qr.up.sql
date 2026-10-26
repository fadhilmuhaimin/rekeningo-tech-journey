-- Tahap 4, rilis expand 3 dari 4 (lab-api-t4): verifikasi identitas dan QR merchant (naskah 3b, M31, M33, M35).
-- File identitas ada di penyimpanan objek; database hanya menyimpan kunci objek dan checksum (ADR 38).
SET LOCAL lock_timeout = '3s';

CREATE TABLE verifikasi (
  id                   bigserial   PRIMARY KEY,
  akun_id              bigint      NOT NULL REFERENCES akun(id),
  subjek               text        NOT NULL CHECK (subjek IN ('pemakai', 'merchant')),
  status               text        NOT NULL DEFAULT 'diajukan'
                       CHECK (status IN ('diajukan', 'lulus', 'ditolak', 'tidak_pasti', 'gagal')),
  tingkat_diminta      text        NOT NULL DEFAULT 'terverifikasi' CHECK (tingkat_diminta = 'terverifikasi'),
  referensi_vendor     text,                                                -- nomor di layanan verifikasi; kosong sebelum menjawab
  berkas_kartu_kunci   text        NOT NULL,
  berkas_swafoto_kunci text        NOT NULL,
  checksum_kartu       text        NOT NULL,                                -- SHA-256 heksadesimal
  checksum_swafoto     text        NOT NULL,
  hapus_pada           timestamptz,                                         -- retensi 30 hari sesudah selesai (Asumsi produk)
  diajukan             timestamptz NOT NULL DEFAULT now(),
  selesai              timestamptz
);
-- Satu pengajuan yang masih berjalan per akun dan subjek.
CREATE UNIQUE INDEX verifikasi_satu_berjalan ON verifikasi (akun_id, subjek) WHERE status IN ('diajukan', 'tidak_pasti');
CREATE INDEX verifikasi_akun ON verifikasi (akun_id, id);

CREATE TABLE qr (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  akun_id         bigint      NOT NULL REFERENCES akun(id),                 -- akun merchant
  jenis           text        NOT NULL CHECK (jenis IN ('statis', 'dinamis')),
  nominal         bigint      CHECK (nominal > 0),
  berlaku_sampai  timestamptz,
  status          text        NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'terpakai', 'kedaluwarsa', 'dibatalkan')),
  jurnal_id       bigint      UNIQUE REFERENCES jurnal(id),                 -- QR dinamis: satu jurnal, sekali bayar
  CONSTRAINT qr_dinamis_terikat CHECK ((jenis = 'dinamis') = (nominal IS NOT NULL AND berlaku_sampai IS NOT NULL)),
  CONSTRAINT qr_statis_tanpa_jurnal CHECK (jenis = 'dinamis' OR jurnal_id IS NULL)
);
CREATE INDEX qr_akun ON qr (akun_id);
