"""Dasar lab t5-partisi: schema ledger api-t5, riwayat posting per bulan, dan alat bantu rekaman.

Server (api-t5), skema, dan data awal adalah milik `labs/api-t5` (`dasar_t5.py`), bukan salinan. File ini hanya
menambah: pemecahan `posting_sebelum` menjadi partisi bulanan, pemuatan riwayat posting yang dihitung dari rumus
(tanpa angka acak), dan pencatat perintah yang menyamarkan tanggal.
"""
import os, pathlib, re, subprocess, sys

import psycopg

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "api-t5"))
import dasar_t5 as d  # noqa: E402
from dasar_t5 import catat, gagal, harap  # noqa: E402

LAB = "t5-partisi"
d.OUT = HERE / "output"


def versi_go():
    """Versi Go yang membangun biner api-t5: dibaca di folder api-t5 (go.mod memilih toolchain), bukan di folder lab ini."""
    go = subprocess.run(["go", "version"], cwd=d.HERE, capture_output=True, text=True).stdout.split()
    return go[2] if len(go) > 2 else "go?"


d.versi_alat = versi_go   # kepala rekaman (dasar_t5.tulis) memakai versi toolchain yang sama dengan yang membangun server

# Awal bulan ke-i sebelum bulan berjalan, zona Asia/Jakarta (sama dengan buat_partisi_posting di migrasi 000024).
def awal_bulan(i):
    return f"(date_trunc('month', now() AT TIME ZONE 'Asia/Jakarta') - make_interval(months => {i}))::timestamp AT TIME ZONE 'Asia/Jakarta'"


def tulis(nama, judul, schema):
    d.tulis(nama, judul, lab=LAB, schema=schema)


def tampil(teks):
    """Catat satu baris atau blok ke rekaman dengan tanggal dan waktu disamarkan."""
    catat(d.samarkan(teks))


def konek(schema, role="lab", app="t5-partisi", autocommit=True):
    """Koneksi sebagai pemilik schema (role lab, superuser lab) atau sebagai role aplikasi api_t5."""
    if role == "lab":
        dsn = d.PEMILIK + f" options=-csearch_path={schema}"
    else:
        dsn = f"host=127.0.0.1 port={d.DB_PORT} user={role} password={role} dbname=lab options=-csearch_path={schema} application_name={app}"
    c = psycopg.connect(dsn, autocommit=autocommit)
    c.prepare_threshold = None
    return c


def jalan(q, schema, role="lab", tulis_q=True, tulis_hasil=True):
    """Satu perintah, dicatat seperti psql (perintah dan hasilnya, tanggal disamarkan). Mengembalikan baris hasil."""
    with konek(schema, role) as c:
        cur = c.execute(q)
        kolom = [x.name for x in cur.description] if cur.description else None
        baris = cur.fetchall() if kolom else []
        if tulis_q:
            awalan = "=> " if role == "lab" else f"({role}) => "
            tampil(awalan + q.strip().replace("\n", "\n   "))
        if tulis_hasil:
            for b in (d.tabel(kolom, baris) if kolom else [cur.statusmessage]):
                tampil(b)
        return baris


def satu(q, schema, role="lab", arg=None):
    with konek(schema, role) as c:
        return c.execute(q, arg).fetchone()[0]


def tolak(q, sqlstate, schema, role="lab", constraint=None, pesan=None, autocommit=True):
    """Perintah yang harus ditolak database dengan SQLSTATE (dan nama constraint) itu; dicatat bersama pesannya."""
    awalan = "=> " if role == "lab" else f"({role}) => "
    tampil(awalan + q.strip().replace("\n", "\n   "))
    with konek(schema, role, autocommit=autocommit) as c:
        try:
            c.execute(q)
            if not autocommit:
                c.commit()
        except psycopg.Error as e:
            harap((e.sqlstate, e.diag.constraint_name), (sqlstate, constraint), q)
            if pesan:
                harap(pesan in str(e.diag.message_primary), True, f"pesan {q}: {e.diag.message_primary}")
            tampil("ERROR:  " + re.sub(r"\bjurnal \d+", "jurnal <n>", e.diag.message_primary))
            tampil(f"   -- SQLSTATE {e.sqlstate}" + (f" · constraint {constraint}" if constraint else ""))
            return
    gagal(f"harus ditolak: {q}")


# ---------- schema, partisi bulanan, dan riwayat posting ----------

def buat_partisi_riwayat(schema, bulan_lalu):
    """`posting_sebelum` (kosong sesudah migrasi) diganti partisi bulanan posting_lalu_01 ... posting_lalu_NN lewat
    buat_partisi_posting (satu fungsi dengan job bulanan). Tidak ada partisi DEFAULT."""
    d.sql("ALTER TABLE posting DETACH PARTITION posting_sebelum", tampil=False, schema=schema)
    harap(d.satu("SELECT count(*) FROM posting_sebelum", schema), 0, "posting_sebelum harus kosong sebelum diganti")
    d.sql("DROP TABLE posting_sebelum", tampil=False, schema=schema)
    for i in range(1, bulan_lalu + 1):
        d.sql(f"SELECT buat_partisi_posting('posting_lalu_{i:02d}', (date_trunc('month', now() AT TIME ZONE 'Asia/Jakarta') - make_interval(months => {i}))::date)",
              tampil=False, schema=schema)


def muat_bulan(c, i, bayar, topup):
    """Satu bulan riwayat: `bayar` jurnal bayar dari karyawan ke warung, dan (bila topup) satu jurnal topup tunjangan per
    karyawan di awal bulan. Jumlah dan pasangan buku dihitung dari nomor urut (tanpa angka acak). Bulan berjalan (i = 0)
    dibatasi sampai sekarang, karena jurnal topup bulan itu sudah ada dari data awal."""
    s = awal_bulan(i)
    ts = (lambda e: f"least({e}, now())") if i == 0 else (lambda e: e)
    with c.transaction():
        c.execute("SET LOCAL session_replication_role = replica")   # pemuatan massal: invarian diperiksa lewat query sesudahnya
        if topup:
            c.execute(f"""
                CREATE TEMP TABLE gen_topup ON COMMIT DROP AS
                SELECT k.id AS buku, nextval('jurnal_id_seq') AS jid, {ts(f"({s}) + (k.n % 3600) * interval '1 second'")} AS ts
                FROM (SELECT row_number() OVER (ORDER BY id) AS n, id FROM buku WHERE jenis = 'karyawan') k""")
            c.execute("""INSERT INTO jurnal (id, jenis, keterangan, dibuat_oleh, dibuat)
                         SELECT jid, 'topup', 'Tunjangan makan bulanan', 400, ts FROM gen_topup""")
            c.execute("""INSERT INTO posting (jurnal_id, buku_id, jumlah, dibuat)
                         SELECT jid, (SELECT id FROM buku WHERE jenis = 'tunjangan'), -100000, ts FROM gen_topup
                         UNION ALL SELECT jid, buku, 100000, ts FROM gen_topup""")
        c.execute(f"""
            CREATE TEMP TABLE gen_bayar ON COMMIT DROP AS
            WITH k AS (SELECT row_number() OVER (ORDER BY id) AS n, id FROM buku WHERE jenis = 'karyawan'),
                 w AS (SELECT row_number() OVER (ORDER BY id) AS n, id FROM buku WHERE jenis = 'warung'),
                 nk AS (SELECT count(*) AS n FROM k), nw AS (SELECT count(*) AS n FROM w)
            SELECT nextval('jurnal_id_seq') AS jid, k.id AS dari, w.id AS ke, 10000 + 1000 * (g.g % 5) AS jumlah,
                   {ts(f"({s}) + interval '1 hour' + ((g.g * 37) % 7200) * interval '1 second'")} AS ts
            FROM generate_series(1, {bayar}) AS g(g) CROSS JOIN nk CROSS JOIN nw
            JOIN k ON k.n = ((g.g - 1) % nk.n) + 1 JOIN w ON w.n = ((g.g * 7) % nw.n) + 1""")
        c.execute("""INSERT INTO jurnal (id, jenis, keterangan, dibuat_oleh, dibuat)
                     SELECT jid, 'bayar', 'Pembelian makan siang', 400, ts FROM gen_bayar""")
        c.execute("""INSERT INTO posting (jurnal_id, buku_id, jumlah, dibuat)
                     SELECT jid, dari, -jumlah, ts FROM gen_bayar UNION ALL SELECT jid, ke, jumlah, ts FROM gen_bayar""")


def siapkan_riwayat(schema, bulan_lalu, bayar_per_bulan, bayar_bulan_ini):
    """Schema bersih dengan 30 tabel, data awal api-t5, lalu `bulan_lalu` bulan riwayat di partisi bulanan dan bulan
    berjalan. saldo_cache dihitung ulang dari posting sesudah pemuatan."""
    d.LAYANAN["aktif"] = False
    d.buat_schema(schema)
    d.seed(schema)
    buat_partisi_riwayat(schema, bulan_lalu)
    with konek(schema) as c:
        for i in range(bulan_lalu, 0, -1):
            muat_bulan(c, i, bayar_per_bulan, topup=True)
        muat_bulan(c, 0, bayar_bulan_ini, topup=False)
        c.execute("UPDATE buku b SET saldo_cache = (SELECT coalesce(sum(jumlah), 0) FROM posting p WHERE p.buku_id = b.id)")
    # Statistik tabel dan peta visibilitas segar sebelum EXPLAIN dan pengukuran baca.
    with konek(schema) as c:
        c.execute("VACUUM (ANALYZE) posting")
        c.execute("VACUUM (ANALYZE) jurnal")
        c.execute("VACUUM (ANALYZE) buku")


def periksa_invarian_muatan(schema):
    """Invarian ledger atas data yang dimuat tanpa trigger: jurnal seimbang dengan paling sedikit dua posting, dan tidak
    ada saldo karyawan negatif. Dihitung langsung dari tabel. Gagal keras bila ada yang melanggar."""
    tidak_seimbang = d.satu("""SELECT count(*) FROM (SELECT jurnal_id FROM posting GROUP BY jurnal_id
                               HAVING count(*) < 2 OR sum(jumlah) <> 0) x""", schema)
    jurnal_kosong = d.satu("SELECT count(*) FROM jurnal j WHERE NOT EXISTS (SELECT 1 FROM posting p WHERE p.jurnal_id = j.id)", schema)
    negatif = d.satu("SELECT count(*) FROM buku WHERE jenis = 'karyawan' AND saldo_cache < 0", schema)
    harap((tidak_seimbang, jurnal_kosong, negatif), (0, 0, 0), "invarian atas data yang dimuat")
    return tidak_seimbang, jurnal_kosong, negatif


# ---------- pengukuran baris yang dibaca ----------

def stat_baca(schema):
    """Baris posting yang dibaca per partisi sejak statistik dimulai: seq_tup_read + idx_tup_fetch dari
    pg_stat_user_tables, dibaca lewat koneksi baru (statistik proses yang sudah keluar sudah dilepas ke server)."""
    with konek("public") as c:
        c.execute("SELECT pg_stat_clear_snapshot()")
        return {r[0]: r[1] + r[2] for r in c.execute(
            """SELECT relname, coalesce(seq_tup_read, 0), coalesce(idx_tup_fetch, 0) FROM pg_stat_user_tables
               WHERE schemaname = %s AND relname ~ '^posting_(lalu|bulan|sebelum|asal|pulih)'""", (schema,)).fetchall()}


def selisih_stat(sebelum, sesudah):
    return sum(sesudah.get(k, 0) - sebelum.get(k, 0) for k in sesudah)


def job(schema, *args):
    """Jalankan satu job `api-t5` sebagai role api_t5 (bukan pemilik) di schema itu. Mengembalikan (exit, keluaran)."""
    r = subprocess.run([str(d.BIN), *args], env=dict(d.ENV, DATABASE_URL=d.db_app(schema)), capture_output=True, text=True)
    teks = re.sub(r"^\d{4}/\d\d/\d\d \d\d:\d\d:\d\d(?:\.\d+)? ", "", r.stdout + r.stderr, flags=re.M)
    return r.returncode, teks.rstrip("\n")
