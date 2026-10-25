"""Lab B2.4: N+1 vs satu query, PostgreSQL 17 lewat psycopg 3 di localhost. Keluaran: output/n1.txt
Jumlah query dihitung dari kode; waktu diukur dengan time.perf_counter (median 5 kali)."""
import pathlib, statistics, time
import psycopg
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), ".."))  # lab_env: labs/README.md
from lab_env import DB_PORT  # noqa: E402

DSN = f"host=127.0.0.1 port={DB_PORT} user=lab password=lab dbname=lab options=-csearch_path=b2q"
c = psycopg.connect(DSN, autocommit=True)
log = []


def n_plus_1(limit):
    q = 1
    pesanan = c.execute("SELECT id, total, dibuat FROM pesanan WHERE toko_id = 1 "
                        "ORDER BY dibuat DESC LIMIT %s", (limit,)).fetchall()
    hasil = []
    for (pid, total, dibuat) in pesanan:
        items = c.execute("SELECT nama, jumlah, harga FROM item_pesanan WHERE pesanan_id = %s", (pid,)).fetchall()
        q += 1
        hasil.append((pid, total, items))
    return q, hasil


def satu_query(limit):
    rows = c.execute("""
        SELECT p.id, p.total, i.nama, i.jumlah, i.harga
        FROM (SELECT id, total, dibuat FROM pesanan WHERE toko_id = 1 ORDER BY dibuat DESC LIMIT %s) p
        JOIN item_pesanan i ON i.pesanan_id = p.id
        ORDER BY p.dibuat DESC""", (limit,)).fetchall()
    return 1, rows


def ukur(fn, limit):
    waktu = []
    for _ in range(5):
        t = time.perf_counter(); q, _ = fn(limit); waktu.append((time.perf_counter() - t) * 1000)
    return q, statistics.median(waktu)


log.append("-- PostgreSQL 17.11 di localhost (tanpa latency jaringan), psycopg 3, median 5 kali")
for limit in (20, 100):
    for nama, fn in (("N+1       ", n_plus_1), ("satu query", satu_query)):
        q, ms = ukur(fn, limit)
        log.append(f"{limit:>3} pesanan · {nama} · {q:>3} query · {ms:6.1f} ms")
teks = "\n".join(log) + "\n"
(pathlib.Path(__file__).parent / "output/n1.txt").write_text(teks)
print(teks)
