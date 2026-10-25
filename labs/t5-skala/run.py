"""Lab Tahap 5: dua instance API di belakang load balancer, dan partisi tabel PostgreSQL 17.

A. Sesi disimpan di memori instance. Budi login, lalu membuka riwayat dua kali.
B. Token bertanda tangan (stateless). Langkah yang sama.
C. Tabel transaksi dipartisi per bulan: query satu bulan, query tanpa filter tanggal, dan membuang data satu bulan.
Keluaran: output/lb.txt, output/partisi.txt.  Jalankan: make -C labs/b3-race up && python run.py
"""
import os, pathlib, socket, subprocess, threading, time, urllib.error, urllib.request
import psycopg
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), ".."))  # lab_env: labs/README.md
from lab_env import DB_PORT, port_lab  # noqa: E402

HERE = pathlib.Path(__file__).parent
subprocess.run(["go", "build", "-o", str(HERE / "t5"), "."], cwd=HERE, check=True)


def http(method, path, token=None):
    req = urllib.request.Request(f"http://127.0.0.1:{port_lab(18140)}" + path, method=method,
                                 headers={"Authorization": "Bearer " + token} if token else {})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, ""


def bagian(judul, sesi):
    log, ps = [f"== {judul}"], []
    for args in (["api", str(port_lab(18141))], ["api", str(port_lab(18142))], ["lb"]):
        port = port_lab(18140) if args == ["lb"] else int(args[1])
        try:
            socket.create_connection(("127.0.0.1", port), 0.1).close()
            raise SystemExit(f"port {port} sudah dipakai proses lain; hentikan dulu")
        except OSError:
            pass
        p = subprocess.Popen([str(HERE / "t5"), *args], env={**os.environ, "SESI": sesi}, stderr=subprocess.PIPE, text=True)
        threading.Thread(target=lambda p=p: [log.append(l.rstrip()) for l in p.stderr], daemon=True).start()
        ps.append(p)
        for _ in range(100):
            try:
                socket.create_connection(("127.0.0.1", port), 0.1).close(); break
            except OSError:
                time.sleep(0.05)
    st, tok = http("POST", "/login")
    time.sleep(0.1)
    log.append(f"app      POST /login → {st}, token {tok[:6]}…(disensor)")
    for i in range(2):
        st, _ = http("GET", "/riwayat", tok)
        time.sleep(0.1)
        log.append(f"app      GET /riwayat ke-{i + 1} → {st}")
    for p in ps:
        p.terminate(); p.wait()
    teks = "\n".join(log) + "\n"
    for dasar in (18140, 18141, 18142):   # rekaman memakai port dasar, apa pun LAB_PORT_OFFSET
        teks = teks.replace(str(port_lab(dasar)), str(dasar))
    return teks


teks = bagian("A. Sesi disimpan di memori instance (SESI=memori)", "memori") + "\n" + bagian("B. Token bertanda tangan (SESI=token)", "token")
(HERE / "output/lb.txt").write_text(teks)
print(teks)

# ---- partisi -------------------------------------------------------------------------------------
db = psycopg.connect(f"postgresql://lab:lab@127.0.0.1:{DB_PORT}/lab", autocommit=True)
db.execute("""DROP SCHEMA IF EXISTS t5p CASCADE; CREATE SCHEMA t5p; SET search_path = t5p;
CREATE TABLE transaksi (id bigint GENERATED ALWAYS AS IDENTITY, dibuat date NOT NULL, jumlah bigint NOT NULL)
  PARTITION BY RANGE (dibuat);
CREATE TABLE transaksi_2026_08 PARTITION OF transaksi FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE transaksi_2026_09 PARTITION OF transaksi FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE transaksi_2026_10 PARTITION OF transaksi FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
SELECT setseed(0.5);
INSERT INTO transaksi (dibuat, jumlah)
  SELECT date '2026-08-01' + (i % 92), (random() * 100000)::bigint FROM generate_series(1, 300000) i;
ANALYZE transaksi;""")
out = ["== C. Tabel transaksi dipartisi per bulan (300.000 baris, Agustus–Oktober 2026)"]
for judul, q in [("Query satu bulan (September):", "SELECT sum(jumlah) FROM transaksi WHERE dibuat >= '2026-09-01' AND dibuat < '2026-10-01'"),
                 ("Query tanpa filter tanggal:", "SELECT sum(jumlah) FROM transaksi WHERE jumlah > 99000")]:
    out.append(f"\n-- {judul}\nEXPLAIN (COSTS OFF) {q};")
    out += [r[0] for r in db.execute("EXPLAIN (COSTS OFF) " + q).fetchall()]
n = db.execute("SELECT count(*) FROM transaksi_2026_08").fetchone()[0]
m = time.perf_counter(); db.execute("ALTER TABLE transaksi DETACH PARTITION transaksi_2026_08; DROP TABLE transaksi_2026_08;")
drop = (time.perf_counter() - m) * 1000
out.append(f"\n-- Membuang data Agustus ({n} baris): DETACH + DROP partisi → {drop:.0f} ms")
db.execute("""CREATE TABLE biasa AS SELECT * FROM transaksi_2026_09; ANALYZE biasa;""")
n2 = db.execute("SELECT count(*) FROM biasa").fetchone()[0]
m = time.perf_counter(); db.execute("DELETE FROM biasa")
hapus = (time.perf_counter() - m) * 1000
out.append(f"-- Pembanding: DELETE {n2} baris dari tabel biasa → {hapus:.0f} ms (satu mesin lab; ukur di sistemmu)")
teks = "\n".join(out) + "\n"
(HERE / "output/partisi.txt").write_text(teks)
print(teks)
