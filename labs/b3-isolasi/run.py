"""Lab B3.3: isolation level di PostgreSQL 17, dua sesi sungguhan (psycopg).

Skenario laporan: sesi A (laporan Ani) membaca saldo dua kali dalam satu transaction,
sementara sesi B mencatat pembayaran Rp25.000 ke Ani di antaranya.
Skenario tarik: dua penarikan baca-hitung-tulis di REPEATABLE READ.
Keluaran: output/laporan-read-committed.txt, output/laporan-repeatable-read.txt,
          output/tarik-repeatable-read.txt
"""
import pathlib
import psycopg
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), ".."))  # lab_env: labs/README.md
from lab_env import DB_PORT  # noqa: E402

DSN = f"host=127.0.0.1 port={DB_PORT} user=lab password=lab dbname=lab options=-csearch_path=b33"
OUT = pathlib.Path(__file__).parent / "output"


def siapkan():
    with psycopg.connect(DSN.replace(" options=-csearch_path=b33", ""), autocommit=True) as c:
        c.execute("DROP SCHEMA IF EXISTS b33 CASCADE; CREATE SCHEMA b33")
        c.execute("SET search_path = b33")
        c.execute("CREATE TABLE akun (id text PRIMARY KEY, saldo bigint NOT NULL)")
        c.execute("INSERT INTO akun VALUES ('budi', 100000), ('ani', 250000)")


class Sesi:
    def __init__(self, nama, log):
        self.nama, self.log = nama, log
        self.c = psycopg.connect(DSN, autocommit=True)

    def q(self, sql):
        try:
            cur = self.c.execute(sql)
            hasil = cur.fetchone()[0] if cur.description else cur.statusmessage
        except psycopg.Error as e:
            hasil = "ERROR:  " + e.diag.message_primary
        self.log.append(f"{self.nama}> {sql}\n   {hasil}")
        return hasil


def laporan(level, nama_file):
    siapkan()
    log = [f"-- PostgreSQL 17.11 · laporan saldo Ani di {level.upper()}"]
    a, b = Sesi("A", log), Sesi("B", log)
    a.q(f"BEGIN ISOLATION LEVEL {level.upper()}")
    a.q("SELECT saldo FROM akun WHERE id = 'ani'")
    b.q("UPDATE akun SET saldo = saldo + 25000 WHERE id = 'ani'")   # autocommit: langsung COMMIT
    a.q("SELECT saldo FROM akun WHERE id = 'ani'")
    a.q("COMMIT")
    (OUT / nama_file).write_text("\n".join(log) + "\n")
    print("\n".join(log), "\n")


def tarik():
    siapkan()
    log = ["-- PostgreSQL 17.11 · dua penarikan baca-hitung-tulis di REPEATABLE READ"]
    a, b = Sesi("A", log), Sesi("B", log)
    for s in (a, b):
        s.q("BEGIN ISOLATION LEVEL REPEATABLE READ")
    a.q("SELECT saldo FROM akun WHERE id = 'budi'")
    b.q("SELECT saldo FROM akun WHERE id = 'budi'")
    a.q("UPDATE akun SET saldo = 30000 WHERE id = 'budi'")
    a.q("COMMIT")
    b.q("UPDATE akun SET saldo = 50000 WHERE id = 'budi'")
    b.q("ROLLBACK")
    log.append("-- aplikasi B mengulang transaction dari awal:")
    b.q("BEGIN ISOLATION LEVEL REPEATABLE READ")
    b.q("SELECT saldo FROM akun WHERE id = 'budi'")
    log.append("   (B: Rp30.000 < Rp50.000, tolak penarikan)")
    b.q("ROLLBACK")
    (OUT / "tarik-repeatable-read.txt").write_text("\n".join(log) + "\n")
    print("\n".join(log))


OUT.mkdir(exist_ok=True)
laporan("read committed", "laporan-read-committed.txt")
laporan("repeatable read", "laporan-repeatable-read.txt")
tarik()
