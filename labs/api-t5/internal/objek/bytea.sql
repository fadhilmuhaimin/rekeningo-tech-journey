-- Lab t4-storage, mode rentan berkas-bytea (M33 versi pertama): file identitas di kolom bytea, di database yang sama.
-- Bukan migration Tahap 4 dan tidak ikut skema naskah: dibuat lab t4-storage dan tes, hanya untuk mode ini.
CREATE TABLE IF NOT EXISTS berkas_bytea (
  kunci text  PRIMARY KEY,
  isi   bytea NOT NULL
);
