"""Lab B4.2 tambahan: ALTER TABLE yang "instan" tetap butuh ACCESS EXCLUSIVE lock.
Sesi A memegang transaction panjang yang membaca akun. Sesi B menjalankan ALTER TABLE
dengan lock_timeout 1 detik. Keluaran: output/lock-timeout.txt
"""
import pathlib, threading, time
import psycopg
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), ".."))  # lab_env: labs/README.md
from lab_env import DB_PORT  # noqa: E402

DSN = f"host=127.0.0.1 port={DB_PORT} user=lab password=lab dbname=lab options=-csearch_path=b4"
log = []
def catat(s): log.append(s); print(s)

a = psycopg.connect(DSN, autocommit=True)
b = psycopg.connect(DSN, autocommit=True)
a.execute("BEGIN")
catat("A> BEGIN; SELECT count(*) FROM akun;   -- transaction panjang, mis. laporan")
catat(f"   {a.execute('SELECT count(*) FROM akun').fetchone()[0]}")
b.execute("SET lock_timeout = '1s'")
catat("B> SET lock_timeout = '1s';")
catat("B> ALTER TABLE akun ADD COLUMN catatan text;")
t0 = time.monotonic()
try:
    b.execute("ALTER TABLE akun ADD COLUMN catatan text")
    catat("   ALTER TABLE")
except psycopg.errors.LockNotAvailable as e:
    catat(f"   ERROR:  {e.diag.message_primary}   (setelah {time.monotonic() - t0:.1f} detik)")
a.execute("COMMIT")
catat("A> COMMIT;")
b.execute("ALTER TABLE akun ADD COLUMN catatan text")
catat("B> ALTER TABLE akun ADD COLUMN catatan text;   -- dicoba ulang")
catat("   ALTER TABLE")
b.execute("ALTER TABLE akun DROP COLUMN catatan")
(pathlib.Path(__file__).parent / "output/lock-timeout.txt").write_text("\n".join(log) + "\n")
