"""Lab B11.2: proxy verifikasi, file lewat proxy vs signed URL, dan BFF. Keluaran: output/<bagian>.txt

A. App → proxy → layanan verifikasi tiruan (proxy timeout 3 detik). Juga: app memanggil layanan langsung.
B. Layanan lambat 8 detik, proxy dengan timeout 3 detik.
C. Layanan lambat 8 detik, proxy tanpa timeout.
D. Bukti bayar: lewat proxy API (cek pemilik di setiap unduhan) vs signed URL (berlaku 3 detik).
E. Beranda: 5 request terpisah vs 1 request BFF.
"""
import json, os, pathlib, socket, subprocess, threading, time, urllib.error, urllib.request
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), ".."))  # lab_env: labs/README.md
from lab_env import port_lab  # noqa: E402

HERE = pathlib.Path(__file__).parent
subprocess.run(["go", "build", "-o", str(HERE / "b112"), "."], cwd=HERE, check=True)
PORT = {"layanan": port_lab(18111), "proxy": port_lab(18112), "storage": port_lab(18113), "api": port_lab(18114)}   # + LAB_PORT_OFFSET (labs/README.md)


def baca_log(p, log, t0):
    """Baris log proses Go diawali waktu tulis (nanodetik, lihat stempel di main.go)."""
    for l in p.stderr:
        n, _, isi = l.rstrip().partition(" ")
        if n.isdigit():
            ts = int(n) / 1e9
        else:  # baris tanpa stempel (mis. panic): pakai waktu baca
            ts, isi = time.time(), l.rstrip()
        log.append((ts, f"{ts - t0[0]:5.1f} s  {isi}"))


def mulai(log, t0, **env):
    ps = []
    for peran, port in PORT.items():
        try:
            socket.create_connection(("127.0.0.1", port), 0.1).close()
            raise SystemExit(f"port {port} sudah dipakai proses lain; hentikan dulu")
        except OSError:
            pass
        p = subprocess.Popen([str(HERE / "b112"), peran], env={**os.environ, **env}, stderr=subprocess.PIPE, text=True)
        threading.Thread(target=baca_log, args=(p, log, t0), daemon=True).start()
        ps.append(p)
    for port in PORT.values():
        for _ in range(100):
            try:
                socket.create_connection(("127.0.0.1", port), 0.1).close(); break
            except OSError:
                time.sleep(0.05)
    return ps


def http(method, url, body=None, token=None, headers=None):
    h = {"Content-Type": "application/json", **(headers or {})}
    if token:
        h["Authorization"] = "Bearer " + token
    req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body else None, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def catat(log, t0, s):
    now = time.time()
    log.append((now, f"{now - t0[0]:5.1f} s  {s}"))


def bagian(nama, judul, aksi, **env):
    log, t0 = [], [time.time()]  # waktu dinding, sama dengan stempel log proses Go
    ps = mulai(log, t0, **env)
    t0[0] = time.time()
    aksi(log, t0)
    time.sleep(0.3)
    for p in ps:
        p.terminate(); p.wait()
    teks = f"== {judul}\n" + "\n".join(l for _, l in sorted(log)) + "\n"
    (HERE / f"output/{nama}.txt").write_text(teks)
    print(teks)


DATA = {"nik": "3201010101900001", "nama": "Budi Santoso"}  # data fiktif


def a(log, t0):
    st, b = http("POST", f"http://127.0.0.1:{PORT['layanan']}/v2/identity/match", DATA)
    catat(log, t0, f"app      langsung ke layanan (tanpa kredensial) → {st} {b.decode().strip()}")
    st, b = http("POST", f"http://127.0.0.1:{PORT['proxy']}/verifikasi", DATA)
    catat(log, t0, f"app      ke proxy tanpa token user → {st} {b.decode().strip()}")
    st, b = http("POST", f"http://127.0.0.1:{PORT['proxy']}/verifikasi", DATA, token="token-budi")
    catat(log, t0, f"app      ke proxy dengan token Budi → {st} {b.decode().strip()}")


def b(log, t0):
    m = time.monotonic()
    st, body = http("POST", f"http://127.0.0.1:{PORT['proxy']}/verifikasi", DATA, token="token-budi")
    catat(log, t0, f"app      ke proxy dengan token Budi → {st} {body.decode().strip()} (menunggu {time.monotonic() - m:.1f} detik)")


def c(log, t0):
    st, body = http("GET", f"http://127.0.0.1:{PORT['api']}/bukti/123", token="token-budi")
    catat(log, t0, f"app Budi GET /bukti/123 lewat API → {st}, {len(body)} byte")
    st, body = http("GET", f"http://127.0.0.1:{PORT['api']}/bukti/123", token="token-ani")
    catat(log, t0, f"app Ani  GET /bukti/123 lewat API → {st} {body.decode().strip()}")
    st, body = http("GET", f"http://127.0.0.1:{PORT['api']}/bukti/123/url", token="token-budi")
    url = json.loads(body)["url"]
    catat(log, t0, f"app Budi minta signed URL → {st} {url[:url.index('sig=') + 12].replace(str(PORT['storage']), '18113')}…")   # rekaman memakai port dasar
    st, body = http("GET", url)
    catat(log, t0, f"app Budi unduh langsung dari storage → {st}, {len(body)} byte")
    st, body = http("GET", url)
    catat(log, t0, f"app Ani  memakai URL yang diteruskan Budi → {st}, {len(body)} byte")
    if st != 200:
        raise SystemExit(f"GAGAL: URL yang masih berlaku dijawab {st}, seharusnya 200")
    time.sleep(3.5)
    st, body = http("GET", url)
    if st != 403:
        raise SystemExit(f"GAGAL: URL 3,5 detik kemudian dijawab {st}, seharusnya 403 (berlaku 3 detik)")
    catat(log, t0, f"app Ani  memakai URL yang sama 3,5 detik kemudian → {st} {body.decode().strip()}")


def d(log, t0):
    m, total = time.monotonic(), 0
    for nama in ("saldo", "pesanan", "promo", "notifikasi", "profil"):
        st, body = http("GET", f"http://127.0.0.1:{PORT['api']}/{nama}", token="token-budi")
        total += len(body)
    catat(log, t0, f"app      5 request terpisah, berurutan → {total} byte body, {(time.monotonic() - m) * 1000:.0f} ms")
    m = time.monotonic()
    st, body = http("GET", f"http://127.0.0.1:{PORT['api']}/beranda", token="token-budi")
    catat(log, t0, f"app      1 request GET /beranda (BFF)  → {len(body)} byte body, {(time.monotonic() - m) * 1000:.0f} ms")


bagian("a-proxy", "A. Verifikasi identitas lewat proxy (timeout 3 detik)", a, TIMEOUT="3", LAMBAT="0")
bagian("b-timeout", "B. Layanan lambat 8 detik · proxy timeout 3 detik", b, TIMEOUT="3", LAMBAT="8")
bagian("c-tanpa-timeout", "C. Layanan lambat 8 detik · proxy tanpa timeout", b, TIMEOUT="0", LAMBAT="8")
bagian("d-file", "D. Bukti bayar: lewat proxy API vs signed URL (berlaku 3 detik)", c)
bagian("e-bff", "E. Beranda: 5 request terpisah vs 1 request BFF (kerja tiap bagian 40 ms, asumsi lab; di localhost)", d)
