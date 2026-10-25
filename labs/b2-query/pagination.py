"""Lab B1.3: offset vs cursor (keyset) pagination di PostgreSQL 17, data b2q. Keluaran: output/pagination.txt"""
import pathlib
import psycopg
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), ".."))  # lab_env: labs/README.md
from lab_env import DB_PORT  # noqa: E402

DSN = f"host=127.0.0.1 port={DB_PORT} user=lab password=lab dbname=lab options=-csearch_path=b2q"
c = psycopg.connect(DSN, autocommit=True)
log = ["-- PostgreSQL 17.11 · riwayat Warung Ani (toko 1), 3 per halaman supaya ringkas"]
BASE = "SELECT id, dibuat::date FROM pesanan WHERE toko_id = 1"


def q(label, sql, args=()):
    rows = c.execute(sql, args).fetchall()
    tampil = sql % tuple(f"'{a.isoformat()}'" if hasattr(a, "isoformat") else repr(a) for a in args) if args else sql
    log.append(f"{label}\n   {tampil}\n   → id: {[r[0] for r in rows]}")
    return rows


c.execute("DELETE FROM pesanan WHERE id > 200000")
log.append("\n# A. OFFSET")
q("halaman 1", BASE + " ORDER BY dibuat DESC, id DESC LIMIT 3 OFFSET 0")
c.execute("INSERT INTO pesanan SELECT 200001, 1, 3000, 25000, max(dibuat) + interval '1 minute' FROM pesanan")
log.append("(pesanan baru 200001 masuk untuk Warung Ani)")
q("halaman 2", BASE + " ORDER BY dibuat DESC, id DESC LIMIT 3 OFFSET 3")

c.execute("DELETE FROM pesanan WHERE id > 200000")
log.append("\n# B. Cursor (keyset): halaman berikutnya dimulai sesudah baris terakhir yang sudah dilihat")
p1 = q("halaman 1", BASE + " ORDER BY dibuat DESC, id DESC LIMIT 3")
akhir = c.execute("SELECT dibuat, id FROM pesanan WHERE id = %s", (p1[-1][0],)).fetchone()
c.execute("INSERT INTO pesanan SELECT 200001, 1, 3000, 25000, max(dibuat) + interval '1 minute' FROM pesanan")
log.append("(pesanan baru 200001 masuk untuk Warung Ani)")
q("halaman 2 (cursor = dibuat dan id baris terakhir)",
  BASE + " AND (dibuat, id) < (%s, %s) ORDER BY dibuat DESC, id DESC LIMIT 3", akhir)
c.execute("DELETE FROM pesanan WHERE id > 200000")

log.append("\n# C. Halaman jauh: 20 baris mulai posisi ke-3.000 dari 4.000 pesanan Warung Ani")
kursor = c.execute(BASE.replace("id, dibuat::date", "dibuat") + " ORDER BY dibuat DESC OFFSET 2999 LIMIT 1").fetchone()[0]
for label, sql, args in (
        ("OFFSET 3000", BASE + " ORDER BY dibuat DESC LIMIT 20 OFFSET 3000", ()),
        ("cursor", BASE + " AND dibuat < %s ORDER BY dibuat DESC LIMIT 20", (kursor,))):
    plan = [r[0] for r in c.execute("EXPLAIN (ANALYZE, COSTS OFF, SUMMARY ON) " + sql, args).fetchall()]
    baris = [l.strip() for l in plan if "rows=" in l and ("Scan" in l)] + [l.strip() for l in plan if "Execution" in l]
    log.append(f"{label}:\n   " + "\n   ".join(baris))
teks = "\n".join(log) + "\n"
(pathlib.Path(__file__).parent / "output/pagination.txt").write_text(teks)
print(teks)
