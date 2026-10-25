"""Lab B11: API memanggil payment gateway tiruan yang lambat. Keluaran: output/<bagian>.txt

A. Gateway lambat 10 detik, API tanpa timeout: 6 top-up masuk tiap 0,5 detik.
B. Sama, API dengan timeout 2 detik.
C. Sama, API dengan timeout 2 detik + circuit breaker (terbuka setelah 3 gagal, jeda 5 detik). Top-up dikirim satu per satu.
D. Gateway membuat tagihan tapi response pertamanya terlambat 3 detik. API retry dengan Idempotency-Key yang sama.
E. Sama seperti D, tapi API membuat key baru setiap retry.
"""
import os, pathlib, socket, subprocess, threading, time, urllib.error, urllib.request
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), ".."))  # lab_env: labs/README.md
from lab_env import port_lab  # noqa: E402

HERE = pathlib.Path(__file__).parent
subprocess.run(["go", "build", "-o", str(HERE / "b11"), "."], cwd=HERE, check=True)


def bebas(port):
    try:
        socket.create_connection(("127.0.0.1", port), 0.1).close()
        raise SystemExit(f"port {port} sudah dipakai proses lain; hentikan dulu")
    except OSError:
        pass


def baca_log(p, log, t0):
    """Baris log proses Go diawali waktu tulis (nanodetik, lihat stempel di main.go)."""
    for l in p.stderr:
        n, _, isi = l.rstrip().partition(" ")
        if n.isdigit():
            ts = int(n) / 1e9
        else:  # baris tanpa stempel (mis. panic): pakai waktu baca
            ts, isi = time.time(), l.rstrip()
        log.append((ts, f"{ts - t0[0]:5.1f} s  {isi}"))


def jalan(peran, port, env, log, t0):
    bebas(port)
    p = subprocess.Popen([str(HERE / "b11"), peran], env={**os.environ, **env}, stderr=subprocess.PIPE, text=True)
    threading.Thread(target=baca_log, args=(p, log, t0), daemon=True).start()
    for _ in range(100):
        try:
            socket.create_connection(("127.0.0.1", port), 0.1).close(); return p
        except OSError:
            time.sleep(0.05)


def topup(key):
    req = urllib.request.Request(f"http://127.0.0.1:{port_lab(18102)}/topup", method="POST", headers={"X-Topup-Id": key})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


def bagian(nama, judul, gw_mode, kebijakan, aksi):
    log, t0 = [], [time.time()]  # waktu dinding, sama dengan stempel log proses Go
    gw = jalan("gateway", port_lab(18101), {"GW_MODE": gw_mode}, log, t0)
    api = jalan("api", port_lab(18102), {"KEBIJAKAN": kebijakan}, log, t0)
    t0[0] = time.time()
    aksi(log, t0)
    time.sleep(0.3)
    for p in (gw, api):
        p.terminate(); p.wait()
    teks = f"== {judul}\n" + "\n".join(l for _, l in sorted(log)) + "\n"
    (HERE / f"output/{nama}.txt").write_text(teks)
    print(teks)


def app(log, t0, key):
    mulai = time.monotonic()
    st = topup(key)
    now = time.time()
    log.append((now, f"{now - t0[0]:5.1f} s  app      {key} selesai: {st} setelah {time.monotonic() - mulai:.1f} detik"))


def bersamaan(log, t0):
    th = []
    for i in range(6):
        th.append(threading.Thread(target=app, args=(log, t0, f"tp_{5521 + i}")))
        th[-1].start(); time.sleep(0.5)
    [t.join() for t in th]


def satu_per_satu(log, t0):
    for i in range(5):
        app(log, t0, f"tp_{5521 + i}")
    now = time.time()
    log.append((now, f"{now - t0[0]:5.1f} s  app      (menunggu 5 detik)"))
    time.sleep(5)
    for i in range(5, 7):
        app(log, t0, f"tp_{5521 + i}")


bagian("a-tanpa-timeout", "A. Gateway lambat 10 detik · API tanpa timeout · 6 top-up tiap 0,5 detik", "lambat", "tanpa-timeout", bersamaan)
bagian("b-timeout", "B. Gateway lambat 10 detik · API timeout 2 detik · 6 top-up tiap 0,5 detik", "lambat", "timeout", bersamaan)
bagian("c-breaker", "C. Gateway lambat 10 detik · timeout 2 detik + circuit breaker (3 gagal → terbuka 5 detik) · top-up satu per satu", "lambat", "breaker", satu_per_satu)
bagian("d-retry", "D. Response pertama gateway terlambat 3 detik · timeout 2 detik · retry dengan key yang sama", "lambat-sekali", "retry", lambda l, t: app(l, t, "tp_5521"))
bagian("e-retry-key-baru", "E. Sama seperti D · retry dengan key baru setiap percobaan", "lambat-sekali", "retry-key-baru", lambda l, t: app(l, t, "tp_5521"))
