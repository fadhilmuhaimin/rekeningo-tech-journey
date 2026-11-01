-- Lab api-t5 · migration 000025: delapan tabel baru Tahap 5 (naskah 3b). Tidak ada foreign key ke tabel service lain:
-- kolom seperti `akun_id`, `jurnal_id`, dan `merchant_akun_id` adalah referensi tanpa constraint (garis putus-putus di
-- blok mermaid naskah). Foreign key di dalam satu service tetap ada (snapshot_saldo ke buku, angsuran ke jadwal_cicilan).

-- ledger: saldo akhir tiap bulan per buku, dicocokkan dengan jumlah posting (M43, ADR 49).
CREATE TABLE snapshot_saldo (
    buku_id        bigint      NOT NULL REFERENCES buku (id),
    periode        date        NOT NULL CHECK (periode = date_trunc('month', periode)::date),
    saldo          bigint      NOT NULL,
    jumlah_posting bigint      NOT NULL CHECK (jumlah_posting >= 0),
    dibuat         timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (buku_id, periode)
);

-- ledger: partisi lama yang dilepas dan dipindah ke penyimpanan objek terenkripsi (ADR 49, ADR 57).
CREATE TABLE arsip_partisi (
    periode               date        PRIMARY KEY CHECK (periode = date_trunc('month', periode)::date),
    kunci_objek           text        NOT NULL,
    checksum              text        NOT NULL,
    kunci_data_terbungkus text        NOT NULL,
    versi_kek             int         NOT NULL CHECK (versi_kek > 0),
    dibuat                timestamptz NOT NULL DEFAULT now()
);

-- merchant: laporan periode tanpa menjumlah posting; dibaca dari replica (M40, ADR 46).
CREATE TABLE ringkasan_merchant_harian (
    merchant_akun_id bigint      NOT NULL,
    tanggal          date        NOT NULL,
    jumlah_transaksi bigint      NOT NULL CHECK (jumlah_transaksi >= 0),
    total            bigint      NOT NULL,
    diperbarui_pada  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (merchant_akun_id, tanggal)
);

-- cicilan: jadwal milik service cicilan (M48, ADR 54). Status 'aktif', 'selesai', 'dihentikan' adalah rancangan lab (Asumsi desain).
CREATE TABLE jadwal_cicilan (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    akun_id             bigint NOT NULL,
    jenis               text   NOT NULL CHECK (jenis IN ('cicilan', 'tabungan')),
    merchant_akun_id    bigint,
    jumlah_per_angsuran bigint NOT NULL CHECK (jumlah_per_angsuran > 0),
    jumlah_angsuran     int    NOT NULL CHECK (jumlah_angsuran > 0),
    hari_tagih          int    NOT NULL CHECK (hari_tagih BETWEEN 1 AND 28),
    status              text   NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'selesai', 'dihentikan')),
    CONSTRAINT tabungan_tanpa_merchant CHECK (jenis <> 'tabungan' OR merchant_akun_id IS NULL)
);

-- cicilan: kunci bisnis (jadwal_id, ke) yang tidak kedaluwarsa menahan jurnal kedua (M48).
CREATE TABLE angsuran (
    jadwal_id   bigint NOT NULL REFERENCES jadwal_cicilan (id),
    ke          int    NOT NULL CHECK (ke > 0),
    jatuh_tempo date   NOT NULL,
    status      text   NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'terjurnal', 'dicatat', 'gagal')),
    jurnal_id   bigint,
    PRIMARY KEY (jadwal_id, ke),
    CONSTRAINT angsuran_jurnal_sesuai_status CHECK ((status IN ('terjurnal', 'dicatat')) = (jurnal_id IS NOT NULL))
);

-- notifikasi: satu baris per pengumuman, bukan satu baris per penerima (M45).
CREATE TABLE pengumuman (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    judul           text   NOT NULL CHECK (length(trim(judul)) > 0),
    status          text   NOT NULL DEFAULT 'dibuat' CHECK (status IN ('dibuat', 'berjalan', 'selesai', 'dihentikan')),
    jumlah_penerima int    NOT NULL DEFAULT 0 CHECK (jumlah_penerima >= 0),
    dibuat_oleh     bigint NOT NULL,
    mulai           timestamptz,
    selesai         timestamptz
);

-- merchant: identitas, kunci, dan kuota per mitra POS (M50). Yang tersimpan hanya hash kunci.
CREATE TABLE mitra_pos (
    id               bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nama             text        NOT NULL,
    kunci_hash       text        NOT NULL UNIQUE,
    status           text        NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'dibekukan')),
    kuota_per_detik  int         NOT NULL CHECK (kuota_per_detik > 0),
    dibuat           timestamptz NOT NULL DEFAULT now()
);

-- pembayaran: satu kill switch yang dibaca semua pod (M49).
CREATE TABLE sakelar (
    nama        text        PRIMARY KEY,
    nilai       boolean     NOT NULL,
    diubah_oleh bigint,
    diubah      timestamptz NOT NULL DEFAULT now()
);
