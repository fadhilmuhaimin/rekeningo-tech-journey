"""Lab B10.2: gateway tiruan (skrip ini) mengirim webhook top-up ke API Go → PostgreSQL 17 (skema t4w).
Format webhook mengikuti Standard Webhooks: header webhook-id, webhook-timestamp, webhook-signature.

A. Satu webhook evt_901, lalu worker mengirim isi outbox.
B. Webhook yang sama dikirim dua kali (gateway retry), lalu worker.
C. Sama seperti B, dengan handler naif: tanpa catatan event, saldo ditambah dari isi webhook.
D. Webhook palsu: body diubah (signature lama), dan kiriman ulang dengan timestamp 10 menit lalu.
Keluaran: output/<bagian>.txt.  Jalankan: make -C labs/b10-2-webhook run   (butuh: make -C labs/b3-race up, Go)
"""
import base64, hashlib, hmac, json, os, pathlib, socket, subprocess, threading, time, urllib.error, urllib.request
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), ".."))  # lab_env: labs/README.md
from lab_env import DB_PORT, port_lab  # noqa: E402

HERE = pathlib.Path(__file__).parent
PSQL = ["docker", "compose", "-f", str(HERE / "../b3-race/docker-compose.yml"), "exec", "-T", "db", "psql", "-U", "lab", "-d", "lab", "-q"]
ENV = dict(os.environ, DATABASE_URL=f"postgres://lab:lab@127.0.0.1:{DB_PORT}/lab?search_path=t4w&application_name=b102")
RAHASIA = b"rahasia-webhook-lab"
subprocess.run(["go", "build", "-o", str(HERE / "b102"), "."], cwd=HERE, check=True)


def kirim(log, event_id, body, ts=None, rahasia=RAHASIA, sig_body=None):
    ts = str(int(ts or time.time()))
    isi = json.dumps(body, separators=(",", ":"))
    tanda = base64.b64encode(hmac.new(rahasia, f"{event_id}.{ts}.{sig_body or isi}".encode(), hashlib.sha256).digest()).decode()
    req = urllib.request.Request(f"http://127.0.0.1:{port_lab(18120)}/webhooks/pembayaran", method="POST", data=isi.encode(),
                                 headers={"content-type": "application/json", "webhook-id": event_id,
                                          "webhook-timestamp": ts, "webhook-signature": "v1," + tanda})
    try:
        with urllib.request.urlopen(req) as r:
            st = r.status
    except urllib.error.HTTPError as e:
        st = e.code
    time.sleep(0.15)
    log.append(f"gateway  kirim {event_id} {isi} → {st}")


def bagian(nama, judul, aksi, mode=""):
    subprocess.run(PSQL + ["-v", "ON_ERROR_STOP=1"], input=(HERE / "schema.sql").read_text(), text=True, check=True, capture_output=True)
    try:
        socket.create_connection(("127.0.0.1", port_lab(18120)), 0.1).close()
        raise SystemExit(f"port {port_lab(18120)} sudah dipakai proses lain; hentikan dulu")
    except OSError:
        pass
    log = []
    api = subprocess.Popen([str(HERE / "b102"), "api"], env={**ENV, "MODE": mode}, stderr=subprocess.PIPE, text=True)
    threading.Thread(target=lambda: [log.append(l.rstrip()) for l in api.stderr], daemon=True).start()
    for _ in range(100):
        try:
            socket.create_connection(("127.0.0.1", port_lab(18120)), 0.1).close(); break
        except OSError:
            time.sleep(0.05)
    aksi(log)
    w = subprocess.run([str(HERE / "b102"), "worker"], env=ENV, capture_output=True, text=True)
    log += w.stderr.strip().splitlines()
    api.terminate(); api.wait()
    db = subprocess.run(PSQL + ["-c", "SELECT a.saldo AS saldo_budi, t.status AS status_topup, "
                        "(SELECT count(*) FROM t4w.webhook_event) AS event_tercatat, "
                        "(SELECT count(*) FROM t4w.outbox) AS baris_outbox "
                        "FROM t4w.akun a, t4w.topup t WHERE a.id = 'budi';"], capture_output=True, text=True, check=True).stdout
    teks = f"== {judul}\n" + "\n".join(log) + "\n\n-- PostgreSQL 17 sesudahnya (saldo awal Budi 50000)\n" + db
    (HERE / f"output/{nama}.txt").write_text(teks)
    print(teks)


EV = {"order_id": "tp_5521", "status": "paid", "amount": 200000}
bagian("a-normal", "A. Satu webhook evt_901", lambda log: kirim(log, "evt_901", EV))
bagian("b-duplikat", "B. Webhook evt_901 dikirim dua kali (gateway retry)", lambda log: (kirim(log, "evt_901", EV), kirim(log, "evt_901", EV)))
bagian("c-naif", "C. Webhook evt_901 dua kali, handler naif (tanpa catatan event, jumlah dari isi webhook)",
       lambda log: (kirim(log, "evt_901", EV), kirim(log, "evt_901", EV)), mode="naif")
bagian("d-palsu", "D. Webhook palsu: body diubah, dan kiriman lama diputar ulang",
       lambda log: (kirim(log, "evt_902", {**EV, "amount": 2000000}, sig_body=json.dumps(EV, separators=(",", ":"))),
                    kirim(log, "evt_901", EV, ts=time.time() - 600)))
