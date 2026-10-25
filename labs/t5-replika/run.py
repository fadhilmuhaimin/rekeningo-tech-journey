"""Lab Tahap 5: read replica dan replication lag (PostgreSQL 17, replica ditunda 2 detik dengan sengaja).

A. Budi top-up Rp200.000 (tulis ke primary), lalu app langsung membaca saldo dari replica.
B. Read-your-writes: catat LSN setelah COMMIT; baca dari replica hanya kalau replica sudah sampai LSN itu.
C. Menulis ke replica.
Keluaran: output/replika.txt.  Jalankan: make -C labs/t5-replika run
"""
import pathlib, time
import psycopg
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), ".."))  # lab_env: labs/README.md
from lab_env import REPLIKA_PRIMARY_PORT, REPLIKA_REPLICA_PORT  # noqa: E402

HERE = pathlib.Path(__file__).parent
P = psycopg.connect(f"postgresql://lab:lab@127.0.0.1:{REPLIKA_PRIMARY_PORT}/lab", autocommit=True)


def sambung_replica(batas=60):
    """Replica baru menerima koneksi setelah pg_basebackup selesai; dari kondisi bersih ini butuh beberapa detik."""
    akhir = time.monotonic() + batas
    while True:
        try:
            return psycopg.connect(f"postgresql://lab:lab@127.0.0.1:{REPLIKA_REPLICA_PORT}/lab", autocommit=True)
        except psycopg.OperationalError:
            if time.monotonic() > akhir:
                raise SystemExit(f"GAGAL: replica tidak siap dalam {batas} detik")
            time.sleep(1)


R = sambung_replica()
out, t0 = [], [0.0]


def log(s):
    out.append(f"{time.monotonic() - t0[0]:4.1f} s  {s}")


P.execute("DROP TABLE IF EXISTS akun; CREATE TABLE akun (id text PRIMARY KEY, saldo bigint NOT NULL);"
          "INSERT INTO akun VALUES ('budi', 50000);")
time.sleep(3)  # tunggu replica menerima tabel awal
saldo_r = lambda: R.execute("SELECT saldo FROM akun WHERE id = 'budi'").fetchone()[0]

out.append("== A. Tulis ke primary, baca dari replica")
t0[0] = time.monotonic()
P.execute("UPDATE akun SET saldo = saldo + 200000 WHERE id = 'budi'")
log(f"primary  UPDATE saldo +200000 → COMMIT. Saldo di primary: {P.execute('SELECT saldo FROM akun').fetchone()[0]}")
# Tanpa titik 2,0 detik: tepat di batas recovery_min_apply_delay=2s, hasilnya kadang lama, kadang baru.
for jeda in (0, 0.5, 1.0, 1.5, 2.5):
    time.sleep(max(0, jeda - (time.monotonic() - t0[0])))
    log(f"replica  SELECT saldo → {saldo_r()}")

out.append("\n== B. Read-your-writes dengan LSN")
t0[0] = time.monotonic()
P.execute("UPDATE akun SET saldo = saldo - 25000 WHERE id = 'budi'")
lsn = P.execute("SELECT pg_current_wal_lsn()").fetchone()[0]
log(f"primary  UPDATE saldo -25000 → COMMIT, LSN sesudah tulis: {lsn}")
for _ in range(2):
    sudah = R.execute("SELECT pg_last_wal_replay_lsn() >= %s::pg_lsn", (lsn,)).fetchone()[0]
    if sudah:
        log(f"replica  sudah sampai LSN itu → baca dari replica: saldo {saldo_r()}")
    else:
        log(f"replica  belum sampai LSN itu → baca dari primary: saldo {P.execute('SELECT saldo FROM akun').fetchone()[0]}"
            f" (replica masih {saldo_r()})")
    time.sleep(2.5)

out.append("\n== C. Menulis ke replica")
try:
    R.execute("UPDATE akun SET saldo = 0 WHERE id = 'budi'")
except psycopg.Error as e:
    out.append(f"replica  UPDATE → ERROR: {e.diag.message_primary}")

teks = "\n".join(out) + "\n"
(HERE / "output/replika.txt").write_text(teks)
print(teks)
