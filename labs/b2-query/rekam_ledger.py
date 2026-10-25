"""Alat rekam lab b2-query versi ledger (keputusan 520, 523): koneksi, penghitung query, EXPLAIN, tulis, cek.

Jumlah query dihitung dua kali: di client (setiap panggilan lewat Klien) dan dari log server. Container PostgreSQL
bersama berjalan dengan log_statement=all dan log_line_prefix '%a|%p|' (labs/b3-race/docker-compose.yml), jadi setiap
statement tercatat dengan application_name. Setiap percobaan memakai application_name unik dan diakhiri satu query
penanda; log dibaca sampai penanda itu muncul.

Waktu, Buffers, Heap Blocks, Memory, dan ukuran adalah pembanding dari mesin lab. `tanpa_pembanding` menyamarkannya
sebelum rekaman ulang dibandingkan dengan yang di-commit; baris lain (node, index, rows, jumlah query, baris ganda)
harus sama persis.
"""
import datetime as dt
import difflib
import pathlib
import re
import subprocess
import time
import uuid

import psycopg
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), ".."))  # lab_env: labs/README.md
from lab_env import DB_PORT  # noqa: E402

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent.parent
SCHEMA = "b2_ledger"
APP = "b2-query-ledger"
DSN = f"host=127.0.0.1 port={DB_PORT} user=lab password=lab dbname=lab"
# Bentuk rencana tidak boleh bergantung pada worker paralel yang sedang dipakai agen lain di server bersama, dan JIT
# menambah baris waktu. Keduanya dimatikan per koneksi lab, bukan di server (keputusan 523).
OPSI = f"-csearch_path={SCHEMA} -cmax_parallel_workers_per_gather=0 -cjit=off -cTimeZone=Asia/Jakarta"
COMPOSE = ROOT / "labs/b3-race/docker-compose.yml"
RUN = uuid.uuid4().hex[:8]    # hanya untuk application_name; tidak masuk rekaman


def gagal(pesan):
    raise SystemExit("GAGAL: " + pesan)


def harap(nyata, harus, apa):
    if nyata != harus:
        gagal(f"{apa}: dapat {nyata!r}, harus {harus!r}")


def sambung(app=APP, autocommit=True):
    c = psycopg.connect(f"{DSN} application_name={app} options='{OPSI}'", autocommit=autocommit)
    c.prepare_threshold = None   # tanpa prepared statement: setiap panggilan = satu statement di log
    return c


class Klien:
    """Satu koneksi; setiap panggilan = satu query ke server, dihitung."""

    def __init__(self, c):
        self.c, self.n = c, 0

    def __call__(self, sql, args=None):
        self.n += 1
        return self.c.execute(sql, args).fetchall()


def _log_server(sejak):
    r = subprocess.run(["docker", "compose", "-f", str(COMPOSE), "logs", "--no-log-prefix", "--since", sejak, "db"],
                       capture_output=True, text=True)
    if r.returncode:
        gagal("tidak bisa membaca log PostgreSQL: " + r.stderr.strip()[:200])
    return r.stdout + r.stderr


_nomor = [0]


def hitung(fn, *args):
    """Jalankan fn(klien, *args) di koneksi baru. Mengembalikan (hasil, query di client, query di log server)."""
    _nomor[0] += 1
    app = f"b2l-{RUN}-{_nomor[0]}"
    sejak = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
    with sambung(app) as c:
        k = Klien(c)
        hasil = fn(k, *args)
        c.execute("SELECT 'b2l-penanda'")
    statement = re.compile(rf"^{re.escape(app)}\|\d+\|LOG:  (statement|execute [^:]*): ", re.M)
    penanda = re.compile(rf"^{re.escape(app)}\|\d+\|LOG:  statement: SELECT 'b2l-penanda'", re.M)
    for _ in range(120):   # log ditulis server secara asinkron; tunggu penanda paling lama ±30 detik
        teks = _log_server(sejak)
        if penanda.search(teks):
            return hasil, k.n, len(statement.findall(teks)) - 1
        time.sleep(0.25)
    gagal(f"penanda {app} tidak muncul di log server")


def rencana(c, sql):
    """EXPLAIN (ANALYZE, BUFFERS) apa adanya, sebagai baris teks."""
    return [r[0] for r in c.execute("EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) " + sql).fetchall()]


NODE = re.compile(r"^\s*(?:->\s+)?(.+?)\s+\(actual time=[\d.]+\.\.[\d.]+ rows=(\d+) loops=(\d+)\)")


def bentuk(plan):
    """[(node, rows x loops)]: bagian rencana yang dibandingkan."""
    out = []
    for l in plan:
        m = NODE.match(l)
        if m:
            out.append((m.group(1), int(m.group(2)) * int(m.group(3))))
    return out


# ---------- rekaman ----------

class Rekaman:
    def __init__(self, judul, versi):
        self.baris = [f"-- Lab b2-query versi ledger · {judul}",
                      f"-- PostgreSQL {versi} · schema {SCHEMA} · TimeZone Asia/Jakarta (WIB)",
                      "-- Rekaman dari database bersih: make -C labs/b2-query run-ledger (keputusan 520)."]

    def __call__(self, teks=""):
        self.baris.extend(teks.split("\n") if isinstance(teks, str) else teks)

    def bagian(self, judul):
        self(f"\n# --- {judul} ---")

    def sql(self, q):
        self(["=> " + l if i == 0 else "   " + l for i, l in enumerate(q.strip().split("\n"))])

    def tulis(self, folder, nama):
        folder.mkdir(parents=True, exist_ok=True)
        (folder / nama).write_text("\n".join(l.rstrip() for l in self.baris) + "\n")
        print("ditulis:", folder / nama)


def tabel(kolom, isi):
    teks = [["" if v is None else str(v) for v in r] for r in isi]
    lebar = [max([len(k)] + [len(r[i]) for r in teks]) for i, k in enumerate(kolom)]
    angka = [bool(isi) and all(isinstance(r[i], int) for r in isi) for i in range(len(kolom))]
    out = [" " + " | ".join(k.center(w) for k, w in zip(kolom, lebar)),
           "-" + "-+-".join("-" * w for w in lebar) + "-"]
    for r in teks:
        out.append(" " + " | ".join(v.rjust(w) if a else v.ljust(w) for v, w, a in zip(r, lebar, angka)))
    out.append(f"({len(isi)} row{'' if len(isi) == 1 else 's'})")
    return out


def rp(x):
    return "Rp" + f"{x:,}".replace(",", ".")


# ---------- cek: rekaman ulang lawan yang di-commit ----------

PEMBANDING = [
    (re.compile(r"actual time=[\d.]+\.\.[\d.]+"), "actual time=…"),
    (re.compile(r"\b(Buffers|Heap Blocks|I/O Timings|Planning Time|Execution Time): .*"), r"\1: …"),
    (re.compile(r"\b\d+kB\b"), "…kB"),
    (re.compile(r"\d[\d.]* (ms|kB|MB)\b"), r"… \1"),
    (re.compile(r"-+"), "-"),
    (re.compile(r"\s+"), " "),
]


def tanpa_pembanding(teks):
    out, lewati = [], False
    for l in teks.split("\n"):
        if l.strip() == "Planning:":   # buffer perencanaan muncul atau tidak tergantung cache katalog koneksi
            lewati = True
            continue
        if lewati and l.strip().startswith("Buffers:"):
            lewati = False
            continue
        lewati = False
        for pola, ganti in PEMBANDING:
            l = pola.sub(ganti, l)
        out.append(l.strip())
    return out


def bandingkan(lama, baru):
    """Kembalikan baris diff (kosong bila sama pada bagian yang dibandingkan)."""
    return list(difflib.unified_diff(tanpa_pembanding(lama), tanpa_pembanding(baru), "di-commit", "rekaman ulang",
                                     lineterm="", n=1))
