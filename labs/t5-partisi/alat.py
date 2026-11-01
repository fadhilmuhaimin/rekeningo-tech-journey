"""Alat bersama bagian-bagian rekaman lab t5-partisi: konstanta skala, tanggal bulanan, EXPLAIN, pesan ATTACH, transaksi
yang dibatalkan, dan job snapshot beserta pencocokannya. Dipakai `skala.py`, `lepas.py`, dan `run.py` (import *)."""
import hashlib, io, json, pathlib, re, shutil, subprocess, sys, tempfile, time

import psycopg

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import dasar as x  # noqa: E402
from dasar import awal_bulan, catat, gagal, harap, job, jalan, konek, satu, stat_baca, selisih_stat, tampil, tolak  # noqa: E402

d = x.d
bagian = d.bagian

SKALA = "tahap5_partisi"
LEPAS = "tahap5_lepas"
TES = "tahap5_partisi_tes"
# 11 bulan lalu + bulan berjalan = 12 bulan, 150.000 posting per bulan: tiap partisi lebih dari 8 MB (min_parallel_table_scan_size).
# Bulan berjalan punya 10.200 jurnal dari data awal, jadi jurnal bayarnya 200 lebih sedikit supaya semua bulan sama besar.
BULAN_SKALA, BAYAR_SKALA, BAYAR_INI_SKALA = 11, 65_000, 64_800
POSTING_BULAN = 2 * (10_000 + BAYAR_SKALA)
BULAN_LEPAS, BAYAR_LEPAS, BAYAR_INI_LEPAS = 5, 4_000, 3_800      # 28.000 posting per bulan
ARSIP = pathlib.Path(tempfile.gettempdir()) / f"t5-partisi-arsip-{d.DB_PORT}"


def tgl(i, schema):
    """Tanggal 1 bulan ke-i sebelum bulan berjalan (WIB) sebagai teks YYYY-MM-DD."""
    return str(satu(f"SELECT (({awal_bulan(i)}) AT TIME ZONE 'Asia/Jakarta')::date", schema))


def batas(i, schema):
    """Awal bulan ke-i sebelum bulan berjalan sebagai literal timestamptz (dipakai CHECK dan FOR VALUES)."""
    return satu(f"SELECT ({awal_bulan(i)})::text", schema)


def relasi_plan(q, schema):
    """Nama tabel (partisi) yang dibaca sebuah query, dari EXPLAIN FORMAT JSON."""
    with konek(schema) as c:
        plan = c.execute("EXPLAIN (COSTS OFF, FORMAT JSON) " + q).fetchone()[0]
    nama = set()

    def telusur(n):
        if "Relation Name" in n:
            nama.add(n["Relation Name"])
        for a in n.get("Plans", []):
            telusur(a)
    telusur(plan[0]["Plan"])
    return nama


def partisi(schema):
    """Daftar partisi `posting` dari katalog."""
    return [r[0] for r in konek(schema).execute(
        """SELECT c.relname FROM pg_inherits i JOIN pg_class c ON c.oid = i.inhrelid
           WHERE i.inhparent = 'posting'::regclass ORDER BY c.relname""").fetchall()]


def persen(a, b):
    return f"{a / b * 100:.1f}".replace(".", ",") + "%"


POLA_PESAN = re.compile(r"^(verifying table|validating foreign key constraint|partition constraint for table)")


def jalan_pesan(q, schema):
    """Satu perintah dengan client_min_messages = debug1; hanya pesan tentang pemeriksaan partisi dan foreign key yang dicatat."""
    tampil("=> " + q.strip())
    pesan = []
    with konek(schema) as c:
        c.add_notice_handler(lambda n: pesan.append(n.message_primary))
        c.execute("SET client_min_messages = debug1")
        pesan.clear()
        cur = c.execute(q)
        tampil(cur.statusmessage)
    sisa = [m for m in pesan if POLA_PESAN.match(m)]
    for m in sisa:
        tampil(f"DEBUG:  {m}")
    return sisa


def dalam_transaksi(perintah, schema, akhir="ROLLBACK"):
    """Beberapa perintah dalam satu transaction, dicatat satu per satu; diakhiri ROLLBACK (bawaan) atau COMMIT.
    Mengembalikan hasil perintah terakhir yang menghasilkan baris."""
    hasil = None
    with konek(schema, autocommit=False) as c:
        tampil("=> BEGIN")
        for q in perintah:
            cur = c.execute(q)
            tampil("=> " + q.strip())
            if cur.description:
                kolom = [k.name for k in cur.description]
                hasil = cur.fetchall()
                for b in d.tabel(kolom, hasil):
                    tampil(b)
            else:
                tampil(cur.statusmessage)
        tampil("=> " + akhir)
        c.rollback() if akhir == "ROLLBACK" else c.commit()
    return hasil


def buat_snapshot_semua(schema, bulan_lalu):
    """Job -buat-snapshot untuk bulan paling lama sampai bulan lalu, berurutan. Mengembalikan baris yang ditulis tiap bulan."""
    n, dibaca = [], []
    for i in range(bulan_lalu, 0, -1):
        s0 = stat_baca(schema)
        rc, out = job(schema, "-buat-snapshot", tgl(i, schema))
        s1 = stat_baca(schema)
        harap(rc, 0, f"-buat-snapshot bulan ke-{i}: {out}")
        catat(f"$ ./api-t5 -buat-snapshot <tanggal 1 bulan ke-{i} sebelum bulan berjalan>")
        catat(d.samarkan(out))
        n.append(int(re.search(r": (\d+) buku ditulis", out).group(1)))
        dibaca.append(selisih_stat(s0, s1))
        harap(dibaca[-1], satu("SELECT count(*) FROM posting WHERE dibuat >= %s::timestamptz AND dibuat < %s::timestamptz", schema, arg=(batas(i, schema), batas(i - 1, schema))),
              f"baris posting yang dibaca job snapshot bulan ke-{i}: tepat posting bulannya")
    catat("# Tiap job membaca persis posting bulannya (selisih seq_tup_read + idx_tup_fetch atas partisi posting, dibandingkan dengan jumlah posting bulan itu di tabel):")
    catat("# " + ", ".join(f"{v:,}".replace(",", ".") for v in dibaca) + " baris, dari bulan paling lama sampai bulan lalu.")
    return n


def cocokkan_snapshot(schema, bulan_lalu):
    """Tiap snapshot dibandingkan dengan hitungan langsung atas tabel posting (saldo dan jumlah posting sampai akhir bulannya).
    Mengembalikan jumlah baris snapshot yang berbeda; gagal keras bila tidak 0."""
    beda_total = 0
    for i in range(bulan_lalu, 0, -1):
        akhir = batas(i - 1, schema)
        periode = tgl(i, schema)
        beda = satu("""
            SELECT count(*) FROM snapshot_saldo s
            LEFT JOIN (SELECT buku_id, sum(jumlah) AS saldo, count(*) AS n FROM posting WHERE dibuat < %s::timestamptz GROUP BY buku_id) h
              ON h.buku_id = s.buku_id
            WHERE s.periode = %s::date AND (coalesce(h.saldo, 0) <> s.saldo OR coalesce(h.n, 0) <> s.jumlah_posting)""",
                    schema, arg=(akhir, periode))
        beda_total += beda
    harap(beda_total, 0, "snapshot yang berbeda dari hitungan langsung")
    return beda_total
