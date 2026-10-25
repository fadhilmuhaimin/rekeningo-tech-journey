"""Lab B3: dua client menarik saldo yang sama pada waktu bersamaan.

Setiap skenario dijalankan di Postgres sungguhan dengan dua koneksi (A dan B).
Urutan langkah dipaksa sama persis setiap kali (interleaving terburuk), supaya
hasilnya bisa diulang. Setelah setiap langkah, koneksi ketiga (observer) mencatat:

  - saldo yang sudah di-commit (yang dilihat orang lain),
  - siapa yang memegang row lock (extension pgrowlocks),
  - siapa yang sedang menunggu lock (pg_stat_activity.wait_event_type = 'Lock').

Keluaran per skenario:
  output/<id>.txt   rekaman yang bisa dibaca manusia (ditampilkan di docs)
  output/<id>.json  data yang diputar ulang oleh widget docs/widgets/race.js

Jalankan lewat `make run` (lihat Makefile).
"""
import json, pathlib, threading, time
import psycopg
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), ".."))  # lab_env: labs/README.md
from lab_env import DB_PORT  # noqa: E402

# Schema b3r, terpisah dari lab lain di database bersama. search_path lewat parameter koneksi,
# jadi SQL yang direkam tetap tanpa nama schema. public dibutuhkan untuk fungsi pgrowlocks.
SCHEMA = "b3r"
DSN = f"host=127.0.0.1 port={DB_PORT} user=lab password=lab dbname=lab options=-csearch_path={SCHEMA},public"
OUT = pathlib.Path(__file__).parent / "output"
SALDO_AWAL, TARIK_A, TARIK_B = 100000, 70000, 50000  # rupiah


def rp(n):
    """100000 -> Rp100.000 (untuk catatan langkah aplikasi)."""
    return ("-" if n < 0 else "") + "Rp" + f"{abs(n):,}".replace(",", ".")


class Client:
    """Satu koneksi = satu request di server aplikasi."""

    def __init__(self, name, rec):
        self.name, self.rec = name, rec
        self.conn = psycopg.connect(DSN, autocommit=True)
        self.pid = self.conn.info.backend_pid
        self.vars = {}
        self._thread = None
        self._result = None

    def sql(self, query, params=None, note="", store=()):
        """Jalankan query. Kalau query tertahan lock, catat langkah 'menunggu'.

        store: nama variabel aplikasi untuk kolom baris pertama hasil SELECT.
        """
        shown = query if params is None else _inline(query, params)
        box = {}

        def work():
            try:
                cur = self.conn.execute(query, params)
                rows = cur.fetchall() if cur.description else None
                box["ok"] = (rows, cur.rowcount, cur.statusmessage)
            except psycopg.Error as e:
                box["err"] = e

        t = threading.Thread(target=work)
        t.start()
        t.join(0.15)
        if t.is_alive() and self.rec.wait_until_blocked(self.pid):
            self._thread, self._result, self._shown, self._store = t, box, shown, store
            self.rec.step(self.name, shown, "MENUNGGU lock", note=note, waiting=self.name)
            return None
        t.join()
        return self._finish(box, shown, note, store)

    def resume(self, note=""):
        """Query yang tadi tertahan selesai setelah lock dilepas."""
        self._thread.join(5)
        box, shown = self._result, self._shown
        self._thread = None
        return self._finish(box, shown, note or "lanjut setelah lock dilepas", self._store)

    def _finish(self, box, shown, note, store=()):
        if "err" in box:
            msg = str(box["err"]).splitlines()[0]
            self.rec.step(self.name, shown, f"ERROR: {msg}", note=note)
            return box["err"]
        rows, rowcount, status = box["ok"]
        if store and rows:
            self.vars.update(zip(store, rows[0]))
        if rows is not None and len(rows) == 1 and len(rows[0]) == 1:
            result = f"{rows[0][0]}"
        elif rows is not None:
            result = ", ".join(str(r) for r in rows)
        else:
            result = status
        self.rec.step(self.name, shown, result, note=note)
        return rows, rowcount

    def close(self):
        self.conn.close()


class Recorder:
    def __init__(self, sid, title, question):
        self.sid, self.title, self.question = sid, title, question
        self.obs = psycopg.connect(DSN, autocommit=True)
        self.steps, self.clients = [], {}

    def wait_until_blocked(self, pid, timeout=3.0):
        end = time.time() + timeout
        while time.time() < end:
            row = self.obs.execute(
                "SELECT wait_event_type FROM pg_stat_activity WHERE pid = %s", (pid,)).fetchone()
            if row and row[0] == "Lock":
                return True
            time.sleep(0.05)
        return False

    def snapshot(self):
        saldo = self.obs.execute("SELECT saldo FROM akun WHERE id = 1").fetchone()[0]
        lockers = self.obs.execute("SELECT pids FROM pgrowlocks('akun')").fetchall()
        pid_to = {c.pid: n for n, c in self.clients.items()}
        holder = None
        for (pids,) in lockers:
            names = [pid_to.get(p, "?") for p in pids]
            holder = ",".join(names)
        waiting = [n for n, c in self.clients.items() if self.obs.execute(
            "SELECT wait_event_type FROM pg_stat_activity WHERE pid = %s", (c.pid,)).fetchone()[0] == "Lock"]
        return saldo, holder, waiting

    def step(self, actor, sql, result, note="", waiting=None):
        saldo, holder, waiters = self.snapshot()
        prev = self.steps[-1]["lock"] if self.steps else None
        if prev and holder and prev != holder and sql in ("COMMIT", "ROLLBACK"):
            note = note or f"lock {prev} dilepas, {holder} yang sedang menunggu langsung mendapat lock"
        self.steps.append(dict(
            actor=actor, sql=sql, result=result, note=note,
            committed=saldo, lock=holder, waiting=waiters,
            vars={n: dict(c.vars) for n, c in self.clients.items()}))

    def app(self, actor, text):
        """Langkah di kode aplikasi (bukan SQL), mis. 'cek saldo cukup'."""
        saldo, holder, waiters = self.snapshot()
        self.steps.append(dict(actor=actor, sql=None, result=text, note="kode aplikasi",
                               committed=saldo, lock=holder, waiting=waiters,
                               vars={n: dict(c.vars) for n, c in self.clients.items()}))


def _inline(query, params):
    for p in params:
        query = query.replace("%s", str(p), 1)
    return query


def reset():
    with psycopg.connect(DSN, autocommit=True) as c:
        c.execute("CREATE EXTENSION IF NOT EXISTS pgrowlocks WITH SCHEMA public")
        # Schema dibuat ulang, bukan DROP TABLE: dengan search_path b3r,public, DROP TABLE akun
        # bisa mengenai public.akun milik lab lain bila b3r.akun belum ada.
        c.execute(f"DROP SCHEMA IF EXISTS {SCHEMA} CASCADE")
        c.execute(f"CREATE SCHEMA {SCHEMA}")
        c.execute("CREATE TABLE akun (id int PRIMARY KEY, saldo int NOT NULL, version int NOT NULL DEFAULT 1)")
        c.execute("INSERT INTO akun (id, saldo) VALUES (1, %s)", (SALDO_AWAL,))


# ---------------------------------------------------------------- skenario

def s_tx_tanpa_lock(rec, A, B):
    A.sql("BEGIN")
    B.sql("BEGIN")
    a = A.sql("SELECT saldo FROM akun WHERE id = 1", store=["saldo_dibaca"])[0][0][0]
    b = B.sql("SELECT saldo FROM akun WHERE id = 1", store=["saldo_dibaca"])[0][0][0]
    rec.app("A", f"saldo {rp(a)} >= {rp(TARIK_A)}, lanjut. Saldo baru dihitung di aplikasi: {rp(a - TARIK_A)}")
    rec.app("B", f"saldo {rp(b)} >= {rp(TARIK_B)}, lanjut. Saldo baru dihitung di aplikasi: {rp(b - TARIK_B)}")
    A.sql("UPDATE akun SET saldo = %s WHERE id = 1", (a - TARIK_A,))
    B.sql("UPDATE akun SET saldo = %s WHERE id = 1", (b - TARIK_B,))
    A.sql("COMMIT")
    B.resume()
    B.sql("COMMIT")


def s_for_update(rec, A, B):
    A.sql("BEGIN")
    B.sql("BEGIN")
    a = A.sql("SELECT saldo FROM akun WHERE id = 1 FOR UPDATE", store=["saldo_dibaca"])[0][0][0]
    B.sql("SELECT saldo FROM akun WHERE id = 1 FOR UPDATE", store=["saldo_dibaca"])
    rec.app("A", f"saldo {rp(a)} >= {rp(TARIK_A)}, lanjut. Saldo baru: {rp(a - TARIK_A)}")
    A.sql("UPDATE akun SET saldo = %s WHERE id = 1", (a - TARIK_A,))
    A.sql("COMMIT")
    rows, _ = B.resume()
    b = rows[0][0]
    rec.app("B", f"saldo {rp(b)} < {rp(TARIK_B)}, tolak penarikan")
    B.sql("ROLLBACK")


def s_atomic(rec, A, B):
    A.sql("BEGIN")
    B.sql("BEGIN")
    A.sql(f"UPDATE akun SET saldo = saldo - {TARIK_A} WHERE id = 1 AND saldo >= {TARIK_A}")
    B.sql(f"UPDATE akun SET saldo = saldo - {TARIK_B} WHERE id = 1 AND saldo >= {TARIK_B}")
    A.sql("COMMIT")
    _, n = B.resume(note="lanjut setelah lock dilepas; kondisi WHERE dicek ulang ke saldo terbaru")
    rec.app("B", f"{n} baris berubah, berarti saldo tidak cukup. Tolak penarikan")
    B.sql("COMMIT")


def s_optimistic(rec, A, B):
    q = "SELECT saldo, version FROM akun WHERE id = 1"
    a, av = A.sql(q, store=["saldo_dibaca", "version"])[0][0]
    b, bv = B.sql(q, store=["saldo_dibaca", "version"])[0][0]
    rec.app("A", f"saldo {rp(a)} >= {rp(TARIK_A)}, lanjut. Simpan dengan syarat version masih {av}")
    rec.app("B", f"saldo {rp(b)} >= {rp(TARIK_B)}, lanjut. Simpan dengan syarat version masih {bv}")
    A.sql("UPDATE akun SET saldo = %s, version = version + 1 WHERE id = 1 AND version = %s", (a - TARIK_A, av))
    _, n = B.sql("UPDATE akun SET saldo = %s, version = version + 1 WHERE id = 1 AND version = %s", (b - TARIK_B, bv))
    rec.app("B", f"{n} baris berubah: ada yang mengubah data duluan. Baca ulang")
    b, bv = B.sql(q, store=["saldo_dibaca", "version"])[0][0]
    rec.app("B", f"saldo {rp(b)} < {rp(TARIK_B)}, tolak penarikan")


SCENARIOS = [
    ("tx-tanpa-lock", "Transaction tanpa lock", s_tx_tanpa_lock,
     "A dan B sama-sama sukses: Rp120.000 keluar dari saldo Rp100.000. B memang menunggu lock di UPDATE, "
     "tapi angka yang ditulisnya dihitung dari bacaan lama. Transaction saja tidak mencegah lost update."),
    ("for-update", "SELECT ... FOR UPDATE", s_for_update,
     "Hanya A yang sukses. B tertahan sejak SELECT, lalu membaca saldo terbaru (Rp30.000) dan menolak."),
    ("atomic", "UPDATE atomik dengan syarat", s_atomic,
     "Hanya A yang sukses. UPDATE milik B menunggu lock, lalu syarat WHERE dicek ulang ke saldo terbaru: 0 baris berubah."),
    ("optimistic", "Optimistic lock (kolom version)", s_optimistic,
     "Hanya A yang sukses. Tidak ada yang menunggu lock. UPDATE milik B gagal karena version sudah berubah, "
     "lalu B membaca ulang dan menolak."),
]


def main():
    OUT.mkdir(exist_ok=True)
    with psycopg.connect(DSN, autocommit=True) as c:
        version = c.execute("SHOW server_version").fetchone()[0]
        iso = c.execute("SHOW default_transaction_isolation").fetchone()[0]
    for sid, title, fn, summary in SCENARIOS:
        reset()
        rec = Recorder(sid, title, "")
        A, B = Client("A", rec), Client("B", rec)
        rec.clients = {"A": A, "B": B}
        fn(rec, A, B)
        final = rec.snapshot()[0]
        A.close(); B.close(); rec.obs.close()

        data = dict(id=sid, title=title, summary=summary, postgres=version, isolation=iso,
                    start=SALDO_AWAL, withdraw={"A": TARIK_A, "B": TARIK_B},
                    final=final, recorded=time.strftime("%Y-%m-%d"), steps=rec.steps)
        (OUT / f"{sid}.json").write_text(json.dumps(data, ensure_ascii=False, indent=1))

        lines = [f"-- {title}",
                 f"-- PostgreSQL {version}, isolation: {iso}, saldo awal {SALDO_AWAL}, A tarik {TARIK_A}, B tarik {TARIK_B}",
                 f"-- direkam {data['recorded']} oleh labs/b3-race/run.py", ""]
        for n, s in enumerate(rec.steps, 1):
            what = s["sql"] if s["sql"] else f"({s['result']})"
            res = f"  -> {s['result']}" if s["sql"] else ""
            lock = f"   [lock: {s['lock']}]" if s["lock"] else ""
            lines.append(f"{n:2d} [{s['actor']}] {what}{res}{lock}")
        lines += ["", f"-- saldo akhir: {final}"]
        (OUT / f"{sid}.txt").write_text("\n".join(lines) + "\n")
        print("\n".join(lines), "\n")


if __name__ == "__main__":
    main()
