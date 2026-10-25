"""Lab E3: rekam client Dart (retry) → server Go → PostgreSQL 17, dua mode.

Keluaran: output/kunci-sama.txt, output/kunci-baru.txt
Jalankan: make -C labs/e3-idempotency run   (butuh: make -C labs/b3-race up, Go, Dart)
"""
import pathlib, socket, subprocess, time, os
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), ".."))  # lab_env: labs/README.md
from lab_env import DB_PORT, port_lab  # noqa: E402

HERE = pathlib.Path(__file__).parent
OUT = HERE / "output"
# Schema e3 lewat parameter koneksi; ON_ERROR_STOP supaya skema yang gagal dibuat tidak lolos diam-diam.
PSQL = ["docker", "compose", "-f", str(HERE / "../b3-race/docker-compose.yml"), "exec", "-T",
        "-e", "PGOPTIONS=-csearch_path=e3", "db", "psql", "-U", "lab", "-d", "lab", "-q", "-v", "ON_ERROR_STOP=1"]
ENV = dict(os.environ, DATABASE_URL=f"postgres://lab:lab@127.0.0.1:{DB_PORT}/lab?options=-c%20search_path%3De3"
                                    "&application_name=e3")


def psql(sql):
    return subprocess.run(PSQL + ["-c", sql], capture_output=True, text=True, check=True).stdout


def pastikan_bebas(port):
    """Gagal keras bila port sudah dipakai: rekaman tidak boleh diam-diam diambil dari server lama."""
    try:
        socket.create_connection(("127.0.0.1", port), 0.2).close()
    except OSError:
        return
    raise SystemExit(f"GAGAL: port {port} sudah dipakai proses lain; hentikan dulu")


def tunggu_port():
    for _ in range(100):
        try:
            socket.create_connection(("127.0.0.1", port_lab(18080)), 0.2).close()
            return
        except OSError:
            time.sleep(0.1)
    raise SystemExit("server tidak jalan")


subprocess.run(["go", "build", "-o", str(HERE / "server/e3-server"), "."], cwd=HERE / "server", check=True)
OUT.mkdir(exist_ok=True)
for mode in ("kunci-sama", "kunci-baru"):
    subprocess.run(PSQL, input=(HERE / "schema.sql").read_text(), text=True, check=True, capture_output=True)
    pastikan_bebas(port_lab(18080))
    srv = subprocess.Popen([str(HERE / "server/e3-server"), "-lambat-pertama"], env=ENV,
                           stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    tunggu_port()
    cl = subprocess.run(["dart", "run", "client/bayar.dart", mode], cwd=HERE, capture_output=True, text=True)
    time.sleep(1.8)  # biarkan server selesai menulis log response yang ditahan
    srv.terminate()
    log_srv = srv.communicate()[0]
    baris = sorted([l for l in (cl.stdout + log_srv).splitlines() if l.strip()], key=lambda l: 0)
    db = psql("SELECT id, saldo FROM akun ORDER BY id; SELECT id, akun, toko, jumlah FROM pembayaran ORDER BY id;"
              "SELECT key, status_code, body FROM idempotency_key ORDER BY dibuat;")
    teks = (f"$ dart run client/bayar.dart {mode}    # server: e3-server -lambat-pertama\n\n"
            "-- client (Dart 3, timeout 1 detik)\n" + cl.stdout +
            "\n-- server (Go, log per request)\n" + log_srv +
            "\n-- PostgreSQL 17 sesudahnya\n" + db)
    (OUT / f"{mode}.txt").write_text(teks)
    print(teks)
