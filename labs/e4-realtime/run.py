"""Lab E4: dua client mengamati status pesanan 812. Status berubah di detik ke-7.
Client polling bertanya setiap 5 detik; client SSE membuka satu koneksi. Keluaran: output/realtime.txt"""
import pathlib, socket, subprocess, threading, time, urllib.request
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), ".."))  # lab_env: labs/README.md
from lab_env import port_lab  # noqa: E402

HERE = pathlib.Path(__file__).parent
subprocess.run(["go", "build", "-o", str(HERE / "e4"), "."], cwd=HERE, check=True)
try:
    socket.create_connection(("127.0.0.1", port_lab(18093)), 0.2).close()
    raise SystemExit(f"GAGAL: port {port_lab(18093)} sudah dipakai proses lain; hentikan dulu")
except OSError:
    pass
srv = subprocess.Popen([str(HERE / "e4")])
t0 = time.monotonic()
for _ in range(100):
    try:
        socket.create_connection(("127.0.0.1", port_lab(18093)), 0.1).close(); break
    except OSError:
        time.sleep(0.02)
log = []
catat = lambda s: log.append(f"{time.monotonic() - t0:5.1f} s  {s}")


def polling():
    n = 0
    while True:
        n += 1
        body = urllib.request.urlopen(f"http://127.0.0.1:{port_lab(18093)}/pesanan/812").read().decode().strip()
        catat(f"polling  request #{n}: {body}")
        if "siap diambil" in body:
            catat(f"polling  tahu pesanan siap setelah {n} request")
            return
        time.sleep(5)


def sse():
    with urllib.request.urlopen(f"http://127.0.0.1:{port_lab(18093)}/pesanan/812/stream") as r:
        pertama = True
        for line in r:
            if pertama:
                catat("sse      koneksi dibuka (1 request)"); pertama = False
            line = line.decode().strip()
            if line.startswith("data:"):
                catat(f"sse      event: {line[5:].strip()}")
                if "siap diambil" in line:
                    return


th = [threading.Thread(target=f) for f in (polling, sse)]
[t.start() for t in th]; [t.join() for t in th]
srv.terminate()
teks = "-- status pesanan 812 berubah di detik ke-7 · polling setiap 5 detik vs SSE\n" + "\n".join(sorted(log, key=lambda l: float(l.split()[0]))) + "\n"
(HERE / "output/realtime.txt").write_text(teks)
print(teks)
