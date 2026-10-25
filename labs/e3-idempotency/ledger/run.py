"""Lab e3-idempotency · versi ledger (Tahap 2, M10, ADR 14; keputusan 510–515).

App Dart (retry dengan backoff) → server Go → ledger PostgreSQL 17 (labs/b3-ledger/schema.sql + ledger/schema.sql).
Enam skenario, masing-masing dari database bersih (schema e3_idem dibuat ulang); rekaman ke output/ledger/*.txt.
Response hilang dan ulangan saat masih diproses dibuat titik henti server (-titik), bukan oleh waktu, jadi rekaman
ulang identik per byte. Lab gagal keras bila status, saldo, jumlah jurnal, atau baris key berbeda dari harapan.
Rekaman lama (output/kunci-*.txt, dipakai halaman E3 versi lama) tidak disentuh.

    make -C labs/e3-idempotency run-ledger    (butuh: PostgreSQL dari labs/b3-race, Go, Dart, labs/.venv)
"""
import pathlib, re, shutil, socket, subprocess, time
from decimal import Decimal
import psycopg
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "..", ".."))  # lab_env: labs/README.md
from lab_env import DB_PORT, port_lab  # noqa: E402

HERE = pathlib.Path(__file__).parent.parent          # labs/e3-idempotency
OUT = HERE / "output" / "ledger"
SCHEMA, PORT = "e3_idem", port_lab(18160)   # + LAB_PORT_OFFSET (labs/README.md); server dan app Dart membacanya
DSN = f"host=127.0.0.1 port={DB_PORT} user=lab password=lab dbname=lab"
BIN = HERE / "ledger" / "e3-ledger-server"
DB_URL = (f"postgres://lab:lab@127.0.0.1:{DB_PORT}/lab?options=-c%20search_path%3D{SCHEMA}"
          "&application_name=e3-idem-server")


def gagal(pesan):
    raise SystemExit("GAGAL: " + pesan)


def harap(nyata, harus, apa):
    if nyata != harus:
        gagal(f"{apa}: dapat {nyata!r}, harus {harus!r}")


def buat_schema():
    with psycopg.connect(DSN + " application_name=e3-idem", autocommit=True) as c:
        c.execute(f"DROP SCHEMA IF EXISTS {SCHEMA} CASCADE")
        c.execute(f"CREATE SCHEMA {SCHEMA}")
        c.execute(f"SET search_path = {SCHEMA}")
        c.execute((HERE / "../b3-ledger/schema.sql").read_text())
        c.execute((HERE / "ledger/schema.sql").read_text())


def sambung():
    c = psycopg.connect(DSN + f" application_name=e3-idem options=-csearch_path={SCHEMA}", autocommit=True)
    c.prepare_threshold = None
    return c


def sel(v):
    return "" if v is None else str(v)


def tabel(kolom, isi):
    """Tabel seperti keluaran psql: judul di tengah, angka rata kanan, teks rata kiri."""
    teks = [[sel(v) for v in r] for r in isi]
    lebar = [max([len(k)] + [len(r[i]) for r in teks]) for i, k in enumerate(kolom)]
    angka = [bool(isi) and all(isinstance(r[i], (int, Decimal)) or r[i] is None for r in isi)
             for i in range(len(kolom))]
    out = [" " + " | ".join(k.center(w) for k, w in zip(kolom, lebar)),
           "-" + "-+-".join("-" * w for w in lebar) + "-"]
    for r in teks:
        out.append(" " + " | ".join(v.rjust(w) if a else v.ljust(w) for v, w, a in zip(r, lebar, angka)))
    out.append(f"({len(isi)} row{'' if len(isi) == 1 else 's'})")
    return out


def query(c, q, catat):
    """Jalankan q dan tulis perintah serta hasilnya seperti sesi psql. Mengembalikan baris hasil."""
    b = q.strip().splitlines()
    catat("=> " + b[0])
    for l in b[1:]:
        catat("   " + l)
    cur = c.execute(q)
    rows = cur.fetchall()
    for l in tabel([d.name for d in cur.description], rows):
        catat(l)
    catat()
    return rows


Q_SALDO = """SELECT b.id AS buku, a.nama, coalesce(sum(p.jumlah), 0) AS saldo, b.saldo_cache
FROM buku b JOIN akun a ON a.id = b.akun_id LEFT JOIN posting p ON p.buku_id = b.id
GROUP BY b.id, a.nama ORDER BY b.id;"""
Q_RIWAYAT = """SELECT j.id AS jurnal, j.jenis, j.keterangan, p.jumlah
FROM posting p JOIN jurnal j ON j.id = p.jurnal_id
WHERE p.buku_id = 2 ORDER BY p.id;   -- riwayat Budi"""
Q_KUNCI = """SELECT left(kunci, 8) || '…' AS kunci, status, left(hash_permintaan, 12) || '…' AS hash_permintaan,
       respons::text AS respons, jurnal_id, round(extract(epoch FROM kedaluwarsa - now()) / 3600) AS jam_tersisa
FROM kunci_idempotensi ORDER BY kedaluwarsa;"""

# (file, judul, keterangan, argumen server, mode app, harapan)
# harapan: status yang dilihat app per percobaan, saldo Budi, jurnal bayar, baris key (status, jurnal_id)
SKENARIO = [
    ("tanpa-key.txt", "M10: Bayar diulang sesudah response hilang, tanpa key",
     ["Server minggu 2 tanpa idempotency. Request #1 COMMIT, lalu koneksi ditutup sebelum response terkirim",
      "(titik henti lab: sinyal putus). App mengulang sesudah backoff; server tidak tahu itu ulangan."],
     ["-tanpa-idempotensi", "-titik", "putus-sesudah-commit"], "tanpa-key",
     dict(app=["koneksi putus", "201"], saldo=50000, bayar=2, kunci=[])),
    ("key-per-niat.txt", "ADR 14: key sekali per niat bayar, ulangan mendapat respons yang sama",
     ["Response request #1 hilang sesudah COMMIT seperti tanpa-key.txt. App mengulang dengan key yang sama;",
      "server menemukan key selesai dan mengirim respons tersimpan, tanpa jurnal kedua."],
     ["-titik", "putus-sesudah-commit"], "key-per-niat",
     dict(app=["koneksi putus", "201"], saldo=75000, bayar=1, kunci=[("selesai", 2)], ulang=(2, 75000))),
    ("key-per-percobaan.txt", "Kesalahan app: key dibuat ulang di setiap percobaan",
     ["Server sama dengan key-per-niat.txt. App membuat key baru untuk retry, jadi server melihat niat baru."],
     ["-titik", "putus-sesudah-commit"], "key-per-percobaan",
     dict(app=["koneksi putus", "201"], saldo=50000, bayar=2, kunci=[("selesai", 2), ("selesai", 3)])),
    ("aturan.txt", "Permintaan yang ditolak: key sama dengan body beda, tanpa key, key bukan UUID",
     ["Status mengikuti draft IETF Idempotency-Key -07 bagian 2.7 (SHOULD): 422 untuk key yang dipakai ulang",
      "dengan body berbeda, 400 untuk key yang tidak ada di operasi yang mewajibkannya."],
     [], "aturan",
     dict(app=["201", "422", "400", "400"], saldo=75000, bayar=1, kunci=[("selesai", 2)])),
    ("diproses.txt", "Ulangan datang saat permintaan pertama masih diproses",
     ["Request #1 menulis jurnal lalu ditahan sebelum COMMIT; koneksi app ditutup (titik henti lab).",
      "Ulangan pertama menemukan baris key dikunci: 409. Ulangan berikutnya mendapat respons tersimpan."],
     ["-titik", "tahan-sebelum-commit"], "key-per-niat",
     dict(app=["koneksi putus", "409", "201"], saldo=75000, bayar=1, kunci=[("selesai", 2)], ulang=(2, 75000))),
    ("mati-di-tengah.txt", "Server mati sebelum COMMIT: key tertinggal diproses, ulangan mengerjakannya",
     ["Request #1 menulis jurnal 2, lalu koneksi databasenya diputus sebelum COMMIT (titik henti lab, sama dengan",
      "proses server mati). PostgreSQL membatalkan jurnal 2; nomor 2 tidak dipakai lagi (sequence tidak ikut batal)."],
     ["-titik", "mati-di-tengah"], "key-per-niat",
     dict(app=["koneksi putus", "201"], saldo=75000, bayar=1, kunci=[("selesai", 3)], ulang=(3, 75000))),
]


def port_dipakai():
    try:
        socket.create_connection(("127.0.0.1", PORT), 0.2).close()
        return True
    except OSError:
        return False


def jalankan(berkas, judul, ket, arg_server, mode, h, versi_pg):
    baris = []

    def catat(t=""):
        baris.append(t)

    buat_schema()
    if port_dipakai():
        gagal(f"port {PORT} sudah dipakai proses lain; rekaman tidak boleh diambil dari server lama")
    srv = subprocess.Popen([str(BIN), *arg_server, "-alamat", f"127.0.0.1:{PORT}"], env={"DATABASE_URL": DB_URL, "PATH": "/usr/bin:/bin"},
                           stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    try:
        for _ in range(100):
            if port_dipakai():
                break
            if srv.poll() is not None:
                gagal("server berhenti: " + srv.stdout.read())
            time.sleep(0.1)
        else:
            gagal("server tidak mendengar port dalam 10 detik")
        c = sambung()
        catat(f"-- Lab e3-idempotency · versi ledger · {judul}")
        catat(f"-- PostgreSQL {versi_pg} · schema {SCHEMA} (labs/b3-ledger/schema.sql + ledger/schema.sql)")
        catat("-- Rekaman dari database bersih: make -C labs/e3-idempotency run-ledger (keputusan 510).")
        for k in ket:
            catat("-- " + k)
        catat()
        catat("-- PostgreSQL sebelumnya")
        query(c, Q_SALDO, catat)
        cl = subprocess.run(["dart", "run", "ledger/bayar.dart", mode], cwd=HERE, capture_output=True, text=True,
                            timeout=120)
        if cl.returncode != 0:
            gagal(f"app {mode} keluar {cl.returncode}: {cl.stderr[-500:]}")
    finally:
        srv.terminate()
        log_srv = srv.communicate(timeout=10)[0]
    catat(f"$ ledger/e3-ledger-server {' '.join(arg_server)}".rstrip() + "    # server Go")
    catat(f"$ dart run ledger/bayar.dart {mode}    # app Budi")
    catat()
    catat("-- app (Dart)")
    baris.extend(cl.stdout.rstrip().splitlines())
    catat()
    catat("-- server (Go, satu baris per langkah)")
    baris.extend(log_srv.rstrip().splitlines())
    catat()
    catat("-- PostgreSQL sesudahnya")
    saldo = query(c, Q_SALDO, catat)
    query(c, Q_RIWAYAT, catat)
    kunci = query(c, Q_KUNCI, catat)

    # Harapan: gagal keras bila berbeda.
    if "GAGAL" in log_srv:
        gagal(f"{berkas}: titik henti server tidak berjalan sesuai urutan:\n{log_srv}")
    status = re.findall(r"→ (\d{3}|koneksi putus)", cl.stdout)
    harap(status, h["app"], f"{berkas}: status yang dilihat app")
    ani = 100000 - h["saldo"]   # semua uang Budi yang keluar masuk ke Warung Ani
    harap([(r[1], r[2], r[3]) for r in saldo], [("Budi", h["saldo"], h["saldo"]), ("Warung Ani", ani, ani)],
          f"{berkas}: saldo dari posting dan saldo_cache")
    n_bayar = c.execute("SELECT count(*) FROM jurnal WHERE jenis = 'bayar'").fetchone()[0]
    harap(n_bayar, h["bayar"], f"{berkas}: jumlah jurnal bayar")
    harap([(r[1], r[4]) for r in kunci], h["kunci"], f"{berkas}: baris kunci_idempotensi (status, jurnal_id)")
    harap({r[5] for r in kunci} <= {Decimal(24)}, True, f"{berkas}: key berlaku 24 jam")
    if "ulang" in h:
        jid, sisa = h["ulang"]
        akhir = re.findall(r"→ 201 (\S+)", cl.stdout)[-1]
        harap(akhir, f'{{"id":{jid},"saldo":{sisa}}}', f"{berkas}: body yang diterima app")
        harap(f"201 {akhir}" in log_srv, True, f"{berkas}: body ulangan sama dengan body request pertama di log")
    c.close()

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / berkas).write_text("\n".join(l.rstrip() for l in baris).rstrip() + "\n")
    print("ditulis:", (OUT / berkas).relative_to(HERE.parent.parent))


def main():
    if not shutil.which("dart"):
        gagal("Dart SDK tidak ditemukan (app lab ditulis dalam Dart 3)")
    subprocess.run(["go", "build", "-o", str(BIN), "./ledger"], cwd=HERE / "server", check=True)
    with psycopg.connect(DSN + " application_name=e3-idem") as c:
        versi_pg = c.execute("SHOW server_version").fetchone()[0]
    for s in SKENARIO:
        jalankan(*s, versi_pg)
    harap(sorted(p.name for p in OUT.iterdir()), sorted(s[0] for s in SKENARIO), "isi output/ledger")


if __name__ == "__main__":
    main()
