"""Lab C4: rate limit login dengan token bucket (server Go di main.go). Keluaran: output/ratelimit.txt

A. Satu IP, 8 tebakan PIN berturut-turut, lalu menunggu 12 detik.      BATAS=ip
B. Jam makan siang: 30 karyawan satu kantor login lewat satu Wi-Fi.     BATAS=ip
C. Sama seperti A dan B, tapi bucket per akun + bucket per IP yang longgar, dan penyerang berganti IP.  BATAS=akun+ip
D. Dua instance API, bucket disimpan di memori masing-masing; penyerang kena instance bergantian.      BATAS=akun+ip
"""
import json, os, pathlib, socket, subprocess, time, urllib.error, urllib.request
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), ".."))  # lab_env: labs/README.md
from lab_env import port_lab  # noqa: E402

PORT_A, PORT_B = port_lab(18094), port_lab(18095)   # + LAB_PORT_OFFSET (labs/README.md)

HERE = pathlib.Path(__file__).parent
subprocess.run(["go", "build", "-o", str(HERE / "c4"), "."], cwd=HERE, check=True)
log = []


def tulis(s=""):
    log.append(s)
    print(s)


def server(batas, port):
    try:
        socket.create_connection(("127.0.0.1", port), 0.1).close()
        raise SystemExit(f"port {port} sudah dipakai proses lain; hentikan dulu")
    except OSError:
        pass
    p = subprocess.Popen([str(HERE / "c4")], env={**os.environ, "BATAS": batas, "PORT": str(port)})
    for _ in range(100):
        try:
            socket.create_connection(("127.0.0.1", port), 0.1).close()
            return p
        except OSError:
            time.sleep(0.02)
    raise SystemExit("server tidak jalan")


def login(port, telp, pin, ip):
    req = urllib.request.Request(f"http://127.0.0.1:{port}/login", method="POST",
                                 data=json.dumps({"telp": telp, "pin": pin}).encode(),
                                 headers={"Content-Type": "application/json", "X-Lab-IP": ip})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, r.headers.get("Retry-After"), json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Retry-After"), json.loads(e.read())


def baris(t0, label, st, ra):
    tulis(f"{time.monotonic() - t0:5.1f} s  {label:<34} {st}" + (f"  Retry-After: {ra}" if ra else ""))


def ringkas(hasil):
    return " · ".join(f"{k}: {hasil.count(k)}" for k in sorted(set(hasil)))


AKUN_BUDI = "081200000007"
KARYAWAN = [f"0812{n:08d}" for n in range(100, 130)]   # 30 akun

tulis("== A. BATAS=ip · satu IP (10.0.0.66) menebak PIN akun Budi 8 kali, lalu menunggu 12 detik")
srv = server("ip", PORT_A); t0 = time.monotonic()
for i in range(8):
    st, ra, _ = login(PORT_A, AKUN_BUDI, f"00000{i}", "10.0.0.66")
    baris(t0, f"tebakan #{i + 1} dari 10.0.0.66", st, ra)
time.sleep(12)
st, ra, _ = login(PORT_A, AKUN_BUDI, "000008", "10.0.0.66")
baris(t0, "tebakan #9 setelah menunggu 12 detik", st, ra)
srv.terminate(); srv.wait()

tulis("\n== B. BATAS=ip · 30 karyawan satu tempat kerja login benar lewat satu Wi-Fi (10.0.0.20)")
srv = server("ip", PORT_A); t0 = time.monotonic()
hasil = [login(PORT_A, t, "246810", "10.0.0.20")[0] for t in KARYAWAN]
tulis(f"{time.monotonic() - t0:5.1f} s  30 login benar dari 10.0.0.20 → {ringkas(hasil)}")
srv.terminate(); srv.wait()

tulis("\n== C. BATAS=akun+ip · bucket per akun (5, 1 per 12 detik) + bucket per IP longgar (60, 1 per detik)")
srv = server("akun+ip", PORT_A); t0 = time.monotonic()
for i in range(8):
    st, ra, _ = login(PORT_A, AKUN_BUDI, f"00000{i}", f"10.0.1.{i + 1}")
    baris(t0, f"tebakan #{i + 1} dari 10.0.1.{i + 1}", st, ra)
hasil = [login(PORT_A, t, "246810", "10.0.0.20")[0] for t in KARYAWAN]
tulis(f"{time.monotonic() - t0:5.1f} s  30 login benar dari 10.0.0.20 → {ringkas(hasil)}")
srv.terminate(); srv.wait()

tulis("\n== D. BATAS=akun+ip · dua instance API, bucket di memori masing-masing; tebakan bergantian ke instance 1 dan 2")
s1, s2 = server("akun+ip", PORT_A), server("akun+ip", PORT_B); t0 = time.monotonic()
lolos = 0
for i in range(12):
    port = PORT_A if i % 2 == 0 else PORT_B
    st, ra, _ = login(port, AKUN_BUDI, f"0000{i:02d}", f"10.0.2.{i + 1}")
    lolos += st == 401
    baris(t0, f"tebakan #{i + 1} → instance {1 if port == PORT_A else 2}", st, ra)
tulis(f"        tebakan yang sampai ke pemeriksaan PIN: {lolos} (batas per akun 5)")
s1.terminate(); s2.terminate(); s1.wait(); s2.wait()

(HERE / "output/ratelimit.txt").write_text("\n".join(log) + "\n")
