"""Lab E2: rekam app Ani (Dart, queue lokal) → server Go → PostgreSQL 17, empat mode.

Semua mode memakai urutan yang sama: Ani offline menambah 10 porsi nasi goreng (stok 25),
sementara 3 porsi terjual lewat pesanan online. Stok yang benar sesudahnya: 25 + 10 − 3 = 32.
Keluaran: output/<mode>.txt.  Jalankan: make -C labs/e2-sync run   (butuh: make -C labs/b3-race up, Go, Dart)
"""
import json, os, pathlib, socket, subprocess, threading, time, urllib.request
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), ".."))  # lab_env: labs/README.md
from lab_env import DB_PORT, port_lab  # noqa: E402

HERE = pathlib.Path(__file__).parent
PSQL = ["docker", "compose", "-f", str(HERE / "../b3-race/docker-compose.yml"), "exec", "-T", "db",
        "psql", "-U", "lab", "-d", "lab", "-q"]
ENV = dict(os.environ, DATABASE_URL=f"postgres://lab:lab@127.0.0.1:{DB_PORT}/lab?search_path=e2&application_name=e2")
JUDUL = {
    "tanpa-queue": "A. Tanpa queue: request gagal saat offline, perubahan dibuang",
    "nilai-akhir": "B. Queue berisi nilai akhir (stok=35), dikirim dengan PUT",
    "operasi": "C. Queue berisi operasi (+10) dengan op_id; app mati setelah sync, sebelum queue dihapus",
    "harga": "D. Harga: Ani (offline) dan tablet kasir sama-sama mengubah harga dari versi 1",
}


def http(method, path, body=None):
    req = urllib.request.Request(f"http://127.0.0.1:{port_lab(18096)}" + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


subprocess.run(["go", "build", "-o", str(HERE / "server/e2-server"), "."], cwd=HERE / "server", check=True)
for mode, judul in JUDUL.items():
    try:
        socket.create_connection(("127.0.0.1", port_lab(18096)), 0.1).close()
        raise SystemExit(f"port {port_lab(18096)} sudah dipakai proses lain; hentikan dulu")
    except OSError:
        pass
    subprocess.run(PSQL + ["-v", "ON_ERROR_STOP=1"], input=(HERE / "schema.sql").read_text(), text=True, check=True, capture_output=True)
    (HERE / "queue.json").unlink(missing_ok=True)
    log = []
    srv = subprocess.Popen([str(HERE / "server/e2-server")], env=ENV, stderr=subprocess.PIPE, text=True)
    threading.Thread(target=lambda: [log.append((time.monotonic(), l.rstrip())) for l in srv.stderr], daemon=True).start()
    for _ in range(100):
        try:
            socket.create_connection(("127.0.0.1", port_lab(18096)), 0.1).close(); break
        except OSError:
            time.sleep(0.05)

    def app(*args):
        p = subprocess.Popen(["dart", "run", "client/stok.dart", *args], cwd=HERE, stdout=subprocess.PIPE, text=True)
        for l in p.stdout:
            log.append((time.monotonic(), l.rstrip()))
        p.wait()
        time.sleep(0.1)

    def langkah(teks):
        log.append((time.monotonic(), "--- " + teks))

    langkah("Ani offline")
    app("ubah", "tanpa-queue" if mode == "tanpa-queue" else mode)
    if mode == "harga":
        langkah("selama Ani offline, tablet kasir mengubah harga 25.000 → 26.000 (versi 1 → 2)")
        http("POST", "/sync", [{"op_id": "tablet-1", "jenis": "ubah_harga", "produk": "nasgor", "harga": 26000, "versi_dasar": 1}])
    else:
        langkah("selama Ani offline, pembeli lain memesan lewat app")
        for _ in range(3):
            http("POST", "/pesanan", {"produk": "nasgor", "jumlah": 1})
    time.sleep(0.1)
    langkah("sinyal kembali")
    if mode == "tanpa-queue":
        app("buka")
    elif mode == "operasi":
        app("sync", "--mati")
        langkah("Ani membuka app lagi; queue masih berisi operasi yang sama")
        app("sync")
    else:
        app("sync")
    srv.terminate(); srv.wait()
    db = subprocess.run(PSQL + ["-c", "SELECT stok, harga, versi FROM e2.produk WHERE id = 'nasgor';"],
                        capture_output=True, text=True, check=True).stdout
    teks = f"== {judul}\n" + "\n".join(l for _, l in sorted(log, key=lambda x: x[0])) + \
           "\n\n-- PostgreSQL 17 sesudahnya" + ("" if mode == "harga" else " (stok yang benar: 25 + 10 − 3 = 32)") + "\n" + db
    (HERE / f"output/{mode}.txt").write_text(teks)
    print(teks)
(HERE / "queue.json").unlink(missing_ok=True)
