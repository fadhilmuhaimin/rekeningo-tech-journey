"""Rekam lab t3-instance (keputusan 965, 966): proxy, dua instance api-t3, dan rate limit lintas instance.

Dua proses api-t3 (a dan b, di host) di belakang proxy Caddy 2.11.7 (kontainer). Redis 8 dari labs/b9-cache, PostgreSQL 17
dari labs/b3-race, schema t3_instance (data awal api-t3). Rekaman:

  proxy.txt     instance mati: bawaan Caddy lawan retry, health check aktif, dan keduanya (ADR 26)
  panic.txt     M21: panic di goroutine latar mematikan seluruh proses; dua instance menahan satu kematian
  bergulir.txt  deploy bergulir: graceful shutdown lawan tanpa itu, dengan dan tanpa health check dan retry
  batas.txt     M22: rate limit login di memori dua instance lawan hitungan bersama di Redis (ADR 27)

Setiap file dibangun dari database bersih dan dibandingkan per byte pada rekaman ulang: yang dicatat status, jumlah, dan
urutan, bukan waktu. Kebijakan Caddy `random` (bawaan) tidak menghasilkan angka tetap, jadi rekaman yang butuh angka
tetap memakai `round_robin` (satu-satunya perubahan dari bawaan) dan rekaman `random` hanya memeriksa batas. Lab gagal
keras bila hasilnya meleset dari yang diharapkan (keputusan 79, 95). Port dan nama kontainer dari labs/lab_env.py.

    make -C labs/t3-instance run                    (butuh: Docker, Go; PostgreSQL dan Redis dijalankan make)
    make -C labs/t3-instance run BAGIAN=batas       (satu bagian: proxy panic bergulir batas)
"""
import collections, http.client, json, os, pathlib, re, subprocess, sys, threading, time

import redis as redis_py

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "api-t3"))
import dasar_t3 as d  # noqa: E402
from lab_env import REDIS_PORT, port_lab  # noqa: E402  (dasar_t3 sudah menaruh labs/ di sys.path)

d.OUT = HERE / "output"
LAB, SCHEMA, KEPUTUSAN = "t3-instance", "t3_instance", "965"
DASAR_PROXY = 18183                                # api-t3 18180, push 18181, instance kedua 18182
PORT_A, PORT_B, PORT_PROXY = d.PORT, d.PORT_KEDUA, port_lab(DASAR_PROXY)
COMPOSE = ["docker", "compose", "-f", str(HERE / "docker-compose.yml")]
COMPOSE_REDIS = ["docker", "compose", "-f", str(HERE.parent / "b9-cache" / "docker-compose.yml")]
CADDY = re.search(r"image: caddy:(\S+?)-alpine", (HERE / "docker-compose.yml").read_text()).group(1)
KARYAWAN = [f"karyawan{10001 + i}@lestari.example" for i in range(200)]   # akun data lab; password sementara-tahap-3
SALAH = "tebakan-salah"
JAM_BEKU = 1_800_000_000_000                       # ms; bucket di memori tidak terisi ulang di tengah rekaman


# ---------- HTTP dan hitungan ----------

class Hasil:
    def __init__(self, status, instance, isi, lama):
        self.status, self.instance, self.isi, self.lama = status, instance, isi, lama


def minta(method, path, port, body=None, token=None, maks=10.0):
    """Satu request, koneksi baru. status 0 = tidak ada jawaban (ditolak, diputus, atau waktu habis)."""
    mulai = time.monotonic()
    try:
        c = http.client.HTTPConnection("127.0.0.1", port, timeout=maks)
        kepala = {"Connection": "close"}
        data = None
        if body is not None:
            kepala["Content-Type"] = "application/json"
            data = json.dumps(body)
        if token:
            kepala["Authorization"] = f"Bearer {token}"
        c.request(method, path, body=data, headers=kepala)
        r = c.getresponse()
        isi = r.read().decode()
        c.close()
        return Hasil(r.status, r.getheader("X-Instance") or "-", isi, time.monotonic() - mulai)
    except (OSError, http.client.HTTPException):
        return Hasil(0, "-", "", time.monotonic() - mulai)


def jumlah(hs):
    c = collections.Counter(h.status for h in hs)
    return " · ".join(f"{k}: {c[k]}" for k in sorted(c))


def per_instance(hs, status=None):
    c = collections.Counter(h.instance for h in hs if status is None or h.status == status)
    return ", ".join(f"{k} {c[k]}" for k in sorted(c))


def urutan(hs):
    return " ".join(f"{h.status}:{h.instance}" if h.status == 200 else str(h.status) for h in hs)


def ya(kondisi):
    return "ya" if kondisi else "TIDAK"


def tunggu(kondisi, apa, batas=20.0, jeda=0.05):
    d.tunggu(kondisi, apa, batas=batas, jeda=jeda)


# ---------- instance, proxy, Redis ----------

def siapkan():
    d.buat_schema(SCHEMA)
    d.seed(SCHEMA)


def port_instans(nama):
    return PORT_A if nama[0] == "a" else PORT_B


def mulai_instans(nama, args=()):
    d.mulai(d.BIN, port_instans(nama), ["-lab", "-jam-lab", "-instance", nama, *args],
            db=d.db_app(SCHEMA, f"t3-instance-{nama}"))


def berhenti(nama, sinyal="terminate"):
    """Hentikan instance dengan sinyal; kembalikan (kode keluar, log bersih). Kode negatif = dihentikan sinyal itu."""
    p, f = d.server.pop(port_instans(nama))
    if p.poll() is None:
        getattr(p, sinyal)()
    p.wait()
    f.seek(0)
    return p.returncode, d.bersih_log(f.read())


def semua_berhenti():
    for nama in ("a", "b"):          # a2 dan b2 memakai port a dan b; d.server menyimpan satu proses per port
        if port_instans(nama) in d.server:
            berhenti(nama, "kill")


def bekukan(nama):
    d.harap(minta("POST", "/lab/jam", port_instans(nama), {"ms": JAM_BEKU}).status, 204, f"bekukan jam {nama}")


def ulang_instans(args_a=(), args_b=(), beku=False):
    semua_berhenti()
    mulai_instans("a", args_a)
    mulai_instans("b", args_b)
    if beku:
        bekukan("a")
        bekukan("b")


def proxy_hentikan():
    subprocess.run(COMPOSE + ["rm", "-sf", "proxy"], capture_output=True, env=os.environ)


def proxy_mulai(caddyfile, interval="30s"):
    proxy_hentikan()
    d.port_bebas(PORT_PROXY)
    env = dict(os.environ, PORT_PROXY=str(PORT_PROXY), PORT_A=str(PORT_A), PORT_B=str(PORT_B), CADDYFILE=caddyfile,
               HEALTH_INTERVAL=interval)
    r = subprocess.run(COMPOSE + ["up", "-d", "--wait", "--force-recreate", "proxy"], env=env, capture_output=True, text=True)
    d.harap(r.returncode, 0, f"docker compose up proxy: {r.stderr[-300:]}")
    tunggu(lambda: minta("GET", "/healthz", PORT_PROXY, maks=2).status != 0, "proxy menjawab")


def lewat_proxy(n, path="/healthz", method="GET", **kw):
    return [minta(method, path, PORT_PROXY, **kw) for _ in range(n)]


def tunggu_terlihat(nama_instance, batas=20.0):
    """Kirim request lewat proxy sampai ada jawaban 200 dari instance itu."""
    tunggu(lambda: minta("GET", "/healthz", PORT_PROXY, maks=2).instance == nama_instance, f"{nama_instance} terlihat di proxy", batas)


def tunggu_bersih(n=6, batas=20.0):
    """Kirim request lewat proxy sampai n berturut-turut 200 (instance mati sudah dikeluarkan health check)."""
    seri = [0]

    def cek():
        seri[0] = seri[0] + 1 if minta("GET", "/healthz", PORT_PROXY, maks=2).status == 200 else 0
        return seri[0] >= n
    tunggu(cek, f"{n} jawaban 200 berturut-turut", batas, jeda=0.1)


def sinkron_putaran():
    """round_robin: sesudah jawaban dari b, request berikutnya ke a. Dipakai agar siapa menerima request tertentu tetap."""
    tunggu_terlihat("b")


def rds():
    return redis_py.Redis(host="127.0.0.1", port=REDIS_PORT, socket_timeout=3, decode_responses=True)


def bersihkan_redis():
    r = rds()
    for k in r.scan_iter("rekeningo:rl:*"):
        r.delete(k)


def redis_aksi(aksi):
    r = subprocess.run(COMPOSE_REDIS + [aksi, "redis"], capture_output=True, text=True, env=os.environ)
    d.harap(r.returncode, 0, f"docker compose {aksi} redis: {r.stderr[-200:]}")


def tunggu_redis():
    def hidup():
        try:
            return rds().ping()
        except redis_py.RedisError:
            return False
    tunggu(hidup, "Redis menjawab PING")


def masuk(email, port):
    h = minta("POST", "/login", port, {"email": email, "password": d.PASSWORD})
    d.harap(h.status, 200, f"login {email}")
    token = json.loads(h.isi)["token"]
    d.samaran[token] = f"<token sesi {email.split('@')[0]}>"
    return token


def log_batas(nama):
    """Baris log batas bersama tanpa teks galat (isinya bergantung pada keadaan jaringan)."""
    return " | ".join(re.sub(r" \(.*\): memakai", ": memakai", l) for l in baris_log(nama, "batas bersama"))


def baris_log(nama, awalan):
    p, f = d.server[port_instans(nama)]
    return [l for l in d.log_server(port_instans(nama)) if l.startswith(awalan)]


def tulis(nama, judul):
    for port in list(d.server):
        d.stop(port)
    proxy_hentikan()
    versi = d.satu("SHOW server_version", SCHEMA)
    versi_redis = rds().info("server")["redis_version"]
    kepala = [f"# Lab {LAB} · {judul}",
              f"# PostgreSQL {versi} · schema {SCHEMA} · Caddy {CADDY} · Redis {versi_redis}"
              f" · instance a di 127.0.0.1:{d.DASAR}, instance b di 127.0.0.1:{d.DASAR_KEDUA}, proxy di 127.0.0.1:{DASAR_PROXY}",
              f"# Rekaman dari database bersih: make -C labs/{LAB} run (keputusan {KEPUTUSAN}). Label: Rekaman lab."]
    d.OUT.mkdir(exist_ok=True)
    (d.OUT / nama).write_text("\n".join(l.rstrip() for l in "\n".join(kepala + d.log).split("\n")) + "\n")
    print("ditulis:", f"labs/{LAB}/output/{nama}")
    d.log.clear()


catat, bagian, harap = d.catat, d.bagian, d.harap


# ---------- proxy.txt ----------

def rekam_proxy():
    siapkan()
    catat("Dua instance api-t3 (a dan b) di belakang Caddy; GET /healthz menjawab 200 bila database menjawab. Instance b mati mendadak (SIGKILL).")
    catat("Kebijakan bawaan Caddy random menghasilkan angka berbeda tiap run; rekaman dengan angka tetap memakai round_robin, satu-satunya perubahan.")

    bagian("A. Dua instance hidup, round_robin: 20 request bergantian")
    ulang_instans()
    proxy_mulai("bergilir")
    hs = lewat_proxy(20)
    catat(f"urutan (status:instance): {urutan(hs)}")
    catat(f"jumlah: {jumlah(hs)} · 200 per instance: {per_instance(hs, 200)}")
    harap((jumlah(hs), per_instance(hs, 200)), ("200: 20", "a 10, b 10"), "dua instance bergantian")

    bagian("B. Bawaan Caddy (random, tanpa health check, tanpa retry): instance b mati, proxy masih memilihnya")
    ulang_instans()
    berhenti("b", "kill")
    proxy_mulai("bawaan")
    hs = lewat_proxy(60)
    c = collections.Counter(h.status for h in hs)
    catat("60 request ke proxy, instance b sudah mati:")
    catat(f"  ada jawaban 200: {ya(c[200] > 0)} · ada 502: {ya(c[502] > 0)} · hanya 200 dan 502: {ya(set(c) == {200, 502})}")
    catat(f"  semua 200 berasal dari instance a: {ya(per_instance(hs, 200) == 'a ' + str(c[200]))}")
    catat("  jumlah 502 berbeda tiap run (kebijakan random), jadi angkanya tidak dicatat.")
    harap((c[200] > 0, c[502] > 0, set(c)), (True, True, {200, 502}), "random: campuran 200 dan 502")

    bagian("C. round_robin tanpa health check dan tanpa retry: setiap request kedua ke instance mati")
    proxy_mulai("bergilir")
    hs = lewat_proxy(20)
    catat(f"urutan (status:instance): {urutan(hs)}")
    catat(f"jumlah: {jumlah(hs)}")
    harap(jumlah(hs), "200: 10 · 502: 10", "bergilir tanpa pengaman")

    bagian("D. Retry saja (lb_retries 2, tanpa health check): koneksi ke instance mati gagal, request dicoba ulang ke instance lain")
    proxy_mulai("retry")
    hs = lewat_proxy(20)
    catat(f"20 GET /healthz: {jumlah(hs)} · 200 per instance: {per_instance(hs, 200)}")
    harap((jumlah(hs), per_instance(hs, 200)), ("200: 20", "a 20"), "retry menutup instance mati")
    hs = lewat_proxy(6, "/logout", "POST")
    catat(f"6 POST /logout tanpa token: {jumlah(hs)} dari instance {per_instance(hs)}")
    catat("(401 dari instance a: POST juga dicoba ulang, karena koneksi ke instance mati gagal sebelum ada byte terkirim)")
    harap((jumlah(hs), per_instance(hs)), ("401: 6", "a 6"), "POST dicoba ulang")

    bagian("E. Health check aktif saja, selang 30 detik (bawaan): instance mati sesudah pemeriksaan terakhir tetap dipilih")
    ulang_instans()
    proxy_mulai("aktif", "30s")
    tunggu_terlihat("a")
    tunggu_terlihat("b")
    berhenti("b", "kill")
    hs = lewat_proxy(10)
    catat("instance b mati; 10 request langsung sesudahnya, sebelum pemeriksaan berikutnya:")
    catat(f"  jumlah: {jumlah(hs)}")
    harap(jumlah(hs), "200: 5 · 502: 5", "selang health check")

    bagian("F. Health check aktif DAN retry, selang 30 detik: selang itu tertutup retry")
    ulang_instans()
    proxy_mulai("aktif-retry", "30s")
    tunggu_terlihat("a")
    tunggu_terlihat("b")
    berhenti("b", "kill")
    hs = lewat_proxy(10)
    catat("instance b mati; 10 request langsung sesudahnya, sebelum pemeriksaan berikutnya:")
    catat(f"  jumlah: {jumlah(hs)} · 200 per instance: {per_instance(hs, 200)}")
    harap((jumlah(hs), per_instance(hs, 200)), ("200: 10", "a 10"), "health check dan retry")

    bagian("G. Health check aktif, selang 1 detik: instance mati dikeluarkan, instance yang hidup lagi masuk kembali")
    ulang_instans()
    proxy_mulai("aktif-retry", "1s")
    tunggu_terlihat("a")
    tunggu_terlihat("b")
    berhenti("b", "kill")
    tunggu_bersih()
    hs = lewat_proxy(20)
    catat(f"b mati dan sudah dikeluarkan: 20 request: {jumlah(hs)} · 200 per instance: {per_instance(hs, 200)}")
    harap((jumlah(hs), per_instance(hs, 200)), ("200: 20", "a 20"), "b dikeluarkan")
    mulai_instans("b")
    tunggu_terlihat("b")
    hs = lewat_proxy(20)
    catat(f"b hidup lagi dan lolos health check: 20 request: {jumlah(hs)} · 200 per instance: {per_instance(hs, 200)}")
    harap((jumlah(hs), per_instance(hs, 200)), ("200: 20", "a 10, b 10"), "b kembali")
    catat("")
    catat("Tidak dijalankan: pengawas proses yang memulai ulang instance (systemd Restart=, restart policy Docker). Caddy tidak")
    catat("memulai proses; ia hanya berhenti memilih instance yang gagal. Dokumentasi Caddy: lb_retries bawaan 0, health check aktif")
    catat("hanya bila health_uri atau health_port diisi, selang bawaan 30 detik (R3-13).")
    tulis("proxy.txt", "dua instance di belakang proxy: instance mati, health check, dan retry")


# ---------- panic.txt ----------

def data_ekspor():
    """Budi membayar Warung Ani sekali hari ini; Warung Sari tidak menerima pembayaran. Mengembalikan (ani, sari)."""
    budi = masuk("budi@lestari.example", PORT_A)
    ani = masuk("warung.ani@lestari.example", PORT_A)
    sari = masuk("warung.sari@lestari.example", PORT_A)
    h = minta("POST", "/transfers", PORT_A, {"ke": 418, "nominal": 25000, "catatan": "nasi goreng"}, budi)
    harap(h.status, 201, "Budi bayar Warung Ani")
    return ani, sari


def hari():
    return d.satu("SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date::text", SCHEMA)


def csv_warung(warung, token, port):
    h = hari()
    return minta("GET", f"/warung/{warung}/laporan.csv?dari={h}&sampai={h}", port, token=token)


def log_panik(baris):
    """Baris log yang menjelaskan panic, tanpa nomor goroutine dan tanpa stack."""
    out = []
    for l in baris:
        if l.startswith("panic:"):
            out.append(l)
        elif re.match(r"goroutine \d+ \[running\]:", l) and out and out[-1].startswith("panic:"):
            out.append(re.sub(r"goroutine \d+", "goroutine <n>", l))   # hanya stack dari panic yang mengakhiri proses
        elif l.startswith(("http: panic serving", "latar ")):
            out.append(re.sub(r"\s\[recovered\].*", "", l))
    return out


def rekam_panic():
    siapkan()

    bagian("A. Versi benar: panic di goroutine handler dan di goroutine latar tidak mematikan proses")
    ulang_instans()
    h = minta("GET", "/lab/panik?di=handler", PORT_A)
    catat(f"GET /lab/panik?di=handler → {h.status or 'tidak ada jawaban'} (net/http memutus koneksi request itu)")
    catat(f"GET /healthz sesudahnya → {minta('GET', '/healthz', PORT_A).status}")
    tunggu(lambda: baris_log("a", "http: panic serving"), "log panic handler")
    for l in log_panik(baris_log("a", "http: panic serving")):
        catat("log: " + l)
    h = minta("GET", "/lab/panik?di=latar", PORT_A)
    catat(f"GET /lab/panik?di=latar → {h.status} (panic terjadi 100 ms sesudah jawaban)")
    tunggu(lambda: baris_log("a", "latar uji panik"), "log panic latar")
    for l in log_panik(baris_log("a", "latar uji panik"))[:1]:
        catat("log: " + l)
    catat(f"GET /healthz sesudahnya → {minta('GET', '/healthz', PORT_A).status}")
    harap(minta("GET", "/healthz", PORT_A).status, 200, "versi benar tetap hidup")

    bagian("B. Mode rentan ekspor-panic, satu instance: panic di goroutine handler tertangkap, panic di goroutine latar mematikan proses")
    ulang_instans(args_a=["-rentan", "ekspor-panic"])
    h = minta("GET", "/lab/panik?di=handler", PORT_A)
    catat(f"GET /lab/panik?di=handler → {h.status or 'tidak ada jawaban'}; GET /healthz sesudahnya → {minta('GET', '/healthz', PORT_A).status}")
    h = minta("GET", "/lab/panik?di=latar", PORT_A)
    catat(f"GET /lab/panik?di=latar → {h.status}")
    p, _ = d.server[PORT_A]
    p.wait(timeout=10)
    kode, log = berhenti("a")
    catat(f"proses berhenti sendiri: kode keluar {kode}")
    for l in log_panik(log):
        catat("log: " + l)
    harap(kode, 2, "panic di goroutine latar mengakhiri proses")
    catat(f"GET /healthz → {minta('GET', '/healthz', PORT_A).status or 'tidak ada jawaban'}")
    harap(minta("GET", "/healthz", PORT_A).status, 0, "proses mati")

    bagian("C. Ekspor laporan dari dasbor, mode rentan: satu laporan kosong mematikan instance")
    siapkan()
    ulang_instans(args_a=["-rentan", "ekspor-panic"])
    ani, sari = data_ekspor()
    h = csv_warung(418, ani, PORT_A)
    catat(f"Warung Ani (ada 1 pembayaran hari ini) GET /warung/418/laporan.csv → {h.status}, isi: {h.isi.splitlines()[0]} + {len(h.isi.splitlines()) - 1} baris")
    tunggu(lambda: baris_log("a", "ekspor warung 418"), "ringkasan ekspor Ani")
    catat("log: " + d.samarkan(baris_log("a", "ekspor warung 418")[0]))
    harap(h.status, 200, "ekspor Ani")
    h = csv_warung(502, sari, PORT_A)
    catat(f"Warung Sari (belum ada pembayaran) GET /warung/502/laporan.csv → {h.status}, isi: {h.isi.strip()} (hanya judul kolom)")
    harap(h.status, 200, "CSV Sari terkirim sebelum proses mati")
    p, _ = d.server[PORT_A]
    p.wait(timeout=10)
    kode, log = berhenti("a")
    catat(f"proses berhenti sendiri: kode keluar {kode}")
    for l in log_panik(log):
        catat("log: " + l)
    harap(kode, 2, "laporan kosong mematikan proses")
    time.sleep(3)
    catat(f"3 detik kemudian GET /healthz → {minta('GET', '/healthz', PORT_A).status or 'tidak ada jawaban'}: tidak ada yang memulainya lagi")
    harap(minta("GET", "/healthz", PORT_A).status, 0, "tidak ada yang memulai ulang")

    bagian("D. Dua instance dengan health check dan retry, keduanya mode rentan: satu kematian tertahan, dua kematian tidak")
    siapkan()
    ulang_instans(args_a=["-rentan", "ekspor-panic"], args_b=["-rentan", "ekspor-panic"])
    ani, sari = data_ekspor()
    proxy_mulai("aktif-retry", "1s")
    tunggu_terlihat("a")
    tunggu_terlihat("b")
    sinkron_putaran()                       # request berikutnya ke a
    csv_warung(502, sari, PORT_PROXY)
    p, _ = d.server[PORT_A]
    p.wait(timeout=10)
    kode, _ = berhenti("a")
    catat(f"Sari menekan Ekspor: laporan kosong sampai di instance a; a berhenti sendiri (kode keluar {kode})")
    harap(kode, 2, "a mati")
    tunggu_bersih()
    hs = lewat_proxy(20)
    catat(f"20 request sesudahnya lewat proxy: {jumlah(hs)} · 200 per instance: {per_instance(hs, 200)}")
    harap((jumlah(hs), per_instance(hs, 200)), ("200: 20", "b 20"), "b menjawab semuanya")
    csv_warung(502, sari, PORT_PROXY)       # hanya b yang tersisa: laporan kosong yang sama
    p, _ = d.server[PORT_B]
    p.wait(timeout=10)
    kode, _ = berhenti("b")
    catat(f"Sari menekan Ekspor lagi: sampai di instance b; b berhenti sendiri (kode keluar {kode})")
    harap(kode, 2, "b mati")
    tunggu(lambda: all(h.status == 503 for h in lewat_proxy(3, maks=2)), "proxy tidak punya instance sehat")
    hs = lewat_proxy(10)
    catat(f"10 request sesudahnya lewat proxy: {jumlah(hs)} (503: tidak ada instance yang sehat)")
    harap(jumlah(hs), "503: 10", "semua instance mati")

    bagian("E. Versi benar dengan proxy: laporan kosong dijawab CSV berisi judul kolom, tidak ada instance yang mati")
    siapkan()
    ulang_instans()
    ani, sari = data_ekspor()
    proxy_mulai("aktif-retry", "1s")
    tunggu_terlihat("a")
    tunggu_terlihat("b")
    h = csv_warung(502, sari, PORT_PROXY)
    catat(f"Warung Sari GET /warung/502/laporan.csv lewat proxy → {h.status}, isi: {h.isi.strip()}")
    harap((h.status, h.isi.strip()), (200, "tanggal,transaksi,total"), "CSV kosong")
    tunggu(lambda: baris_log("a", "ekspor warung 502") or baris_log("b", "ekspor warung 502"), "ringkasan ekspor kosong")
    catat("log: " + (baris_log("a", "ekspor warung 502") or baris_log("b", "ekspor warung 502"))[0])
    hs = lewat_proxy(20)
    catat(f"20 request sesudahnya: {jumlah(hs)} · 200 per instance: {per_instance(hs, 200)}")
    harap((jumlah(hs), per_instance(hs, 200)), ("200: 20", "a 10, b 10"), "kedua instance hidup")
    catat("")
    catat("Tidak dijalankan: pengawas proses yang memulai ulang instance sesudah panic (systemd Restart=, restart policy Docker).")
    tulis("panic.txt", "M21: panic di goroutine latar mematikan seluruh proses; dua instance menahan satu kematian")


# ---------- bergulir.txt ----------

def request_lambat(port, ms, hasil):
    hasil.append(minta("GET", f"/lab/lambat?ms={ms}", port, maks=15))


def kolam_dipakai(port):
    h = minta("GET", "/lab/pool", port, maks=2)
    return json.loads(h.isi)["dipakai"] if h.status == 200 else 0


def deploy_satu(sinyal_selesai, jeda_naik=0.0):
    """Ganti instance a lalu b: hentikan lama dengan SIGTERM, tunggu berhenti, mulai pengganti (a2, b2)."""
    for lama, baru in (("a", "a2"), ("b", "b2")):
        kode, _ = berhenti(lama)
        harap(kode, 0, f"{lama} berhenti dengan rapi")
        time.sleep(jeda_naik)
        mulai_instans(baru)
        sinyal_selesai(baru)


def beban(hasil_cepat, hasil_lambat, berhenti_beban):
    def cepat():
        while not berhenti_beban.is_set():
            hasil_cepat.append(minta("GET", "/healthz", PORT_PROXY, maks=10))

    def lambat():
        while not berhenti_beban.is_set():
            hasil_lambat.append(minta("GET", "/lab/lambat?ms=300", PORT_PROXY, maks=15))
    ts = [threading.Thread(target=cepat), threading.Thread(target=lambat)]
    for t in ts:
        t.start()
    return ts


def rekam_bergulir():
    siapkan()

    bagian("A. Dengan Shutdown saat SIGTERM: request yang sedang jalan selesai, koneksi baru ditolak")
    ulang_instans()
    hasil = []
    t = threading.Thread(target=request_lambat, args=(PORT_A, 2000, hasil))
    t.start()
    tunggu(lambda: kolam_dipakai(PORT_A) >= 1, "request lambat memegang satu koneksi database")
    p, _ = d.server[PORT_A]
    p.terminate()
    tunggu(lambda: minta("GET", "/healthz", PORT_A, maks=2).status == 0, "koneksi baru ditolak")
    masih_jalan = t.is_alive()
    t.join()
    kode, log = berhenti("a")
    catat("SIGTERM dikirim saat GET /lab/lambat?ms=2000 sedang menahan satu koneksi database:")
    catat(f"  koneksi baru ke instance ditolak selagi request lambat masih jalan: {ya(masih_jalan)}")
    catat(f"  request lambat → {hasil[0].status} {hasil[0].isi}")
    catat(f"  kode keluar proses: {kode}")
    catat(f"  log: {[l for l in log if l.startswith('api-t3 berhenti')][0]}")
    harap((hasil[0].status, masih_jalan, kode), (200, True, 0), "shutdown rapi")

    bagian("B. Mode rentan tanpa-shutdown (tanpa signal.Notify): SIGTERM mengakhiri proses seketika, request yang sedang jalan putus")
    ulang_instans(args_a=["-rentan", "tanpa-shutdown"])
    hasil = []
    t = threading.Thread(target=request_lambat, args=(PORT_A, 2000, hasil))
    t.start()
    tunggu(lambda: kolam_dipakai(PORT_A) >= 1, "request lambat memegang satu koneksi database")
    kode, log = berhenti("a")
    t.join()
    catat("SIGTERM dikirim saat GET /lab/lambat?ms=2000 sedang menahan satu koneksi database:")
    catat(f"  request lambat → {hasil[0].status or 'tidak ada jawaban'}")
    catat(f"  kode keluar proses: {kode} (dihentikan sinyal {-kode})")
    catat(f"  log berhenti rapi ada: {ya(any(l.startswith('api-t3 berhenti') for l in log))}")
    harap((hasil[0].status, kode), (0, -15), "tanpa shutdown")

    bagian("C. Deploy bergulir lewat proxy dengan health check aktif dan retry: a lalu b diganti saat beban berjalan")
    ulang_instans()
    proxy_mulai("aktif-retry", "1s")
    tunggu_terlihat("a")
    tunggu_terlihat("b")
    cepat, lambat_, stop = [], [], threading.Event()
    ts = beban(cepat, lambat_, stop)
    tunggu(lambda: len(cepat) >= 10 and len(lambat_) >= 2, "beban berjalan")

    def sampai(nama):
        n0 = len(cepat)
        tunggu(lambda: any(h.instance == nama for h in cepat[n0:]), f"{nama} menjawab lewat proxy", 30)
    deploy_satu(sampai)
    stop.set()
    for t in ts:
        t.join()
    catat("Beban selama deploy: GET /healthz berulang dan GET /lab/lambat?ms=300 berulang (request lambat sedang jalan saat instance dihentikan).")
    catat(f"  semua jawaban GET /healthz 200: {ya(all(h.status == 200 for h in cepat))}")
    catat(f"  semua request lambat 200: {ya(all(h.status == 200 for h in lambat_))}")
    catat(f"  instance yang menjawab: {', '.join(sorted({h.instance for h in cepat + lambat_}))}")
    harap((all(h.status == 200 for h in cepat), all(h.status == 200 for h in lambat_)), (True, True), "deploy tanpa error")

    bagian("D. Deploy bergulir lewat proxy tanpa health check dan tanpa retry (Shutdown tetap rapi): pengganti perlu 0,5 detik untuk naik")
    ulang_instans()
    proxy_mulai("bergilir")
    cepat, lambat_, stop = [], [], threading.Event()
    t = threading.Thread(target=lambda: [cepat.append(minta("GET", "/healthz", PORT_PROXY, maks=10)) for _ in iter(stop.is_set, True)])
    t.start()
    tunggu(lambda: len(cepat) >= 10, "beban berjalan")
    deploy_satu(lambda nama: None, jeda_naik=0.5)
    time.sleep(0.5)
    stop.set()
    t.join()
    catat("Selama a dan b berganti, GET /healthz berulang lewat proxy:")
    catat(f"  ada 502: {ya(any(h.status == 502 for h in cepat))} · status yang muncul: {sorted({h.status for h in cepat})}")
    harap(any(h.status == 502 for h in cepat), True, "tanpa pengaman ada 502")
    catat("")
    catat("Tidak dijalankan: POST yang sudah diterima kernel instance lama tetapi belum dibaca saat listener ditutup. Caddy hanya mengulang")
    catat("GET untuk kegagalan sesudah koneksi tersambung (lb_retry_match bawaan); app mengulang POST dengan idempotency key (ADR 14).")
    tulis("bergulir.txt", "deploy bergulir: graceful shutdown, health check, dan retry")


# ---------- batas.txt ----------

def tebak(port, emails, password=SALAH):
    return [minta("POST", "/login", port, {"email": e, "password": password}) for e in emails]


def tampil_akun(email):
    d.sql("SELECT gagal_login, terkunci_sampai IS NOT NULL AS terkunci FROM akun WHERE email = '" + email + "'", schema=SCHEMA)


def batas_instans(nama):
    h = minta("GET", "/lab/batas", port_instans(nama))
    return json.loads(h.isi)


def rekam_batas():
    siapkan()
    emails = KARYAWAN[:24]
    catat("Satu client menebak password dari satu alamat. Lewat proxy, setiap instance melihat alamat proxy sebagai alamat client (RemoteAddr),")
    catat("jadi seluruh client di belakang proxy berbagi satu key per IP; X-Forwarded-For belum dibaca (lihat README). Batas login per IP 10,")
    catat("per akun 5 (ADR 20). Jam bucket di memori dibekukan supaya tidak terisi ulang di tengah rekaman.")

    bagian("A. Bucket di memori, dua instance, round_robin: 24 percobaan ke 24 akun berbeda dari satu alamat")
    ulang_instans(beku=True)
    proxy_mulai("bergilir")
    hs = tebak(PORT_PROXY, emails)
    catat(f"24 percobaan → {jumlah(hs)} (401 sampai ke pemeriksaan password, 429 ditolak penahan per IP)")
    catat(f"  per instance: 401 {per_instance([h for h in hs if h.status == 401])} · 429 {per_instance([h for h in hs if h.status == 429])}")
    harap(jumlah(hs), "401: 20 · 429: 4", "dua instance, dua jatah")

    bagian("B. Bucket di memori, satu instance (langsung ke a): batas per IP sama dengan 10")
    ulang_instans(beku=True)
    hs = tebak(PORT_A, emails)
    catat(f"24 percobaan langsung ke instance a → {jumlah(hs)}")
    harap(jumlah(hs), "401: 10 · 429: 14", "satu instance")

    bagian("C. Bucket di memori, kebijakan random bawaan Caddy: batas efektif antara 10 dan 20")
    ulang_instans(beku=True)
    proxy_mulai("bawaan")
    hs = tebak(PORT_PROXY, emails)
    lolos = sum(1 for h in hs if h.status == 401)
    catat(f"24 percobaan: yang sampai ke pemeriksaan password antara 10 dan 20: {ya(10 <= lolos <= 20)}")
    catat("  angka pastinya bergantung pada urutan acak, jadi tidak dicatat; 10 = semuanya ke satu instance, 20 = pembagian merata (bagian A dan B).")
    harap((10 <= lolos <= 20, set(h.status for h in hs) <= {401, 429}), (True, True), "random antara 10 dan 20")

    bagian("D. Bucket per akun di memori: 12 tebakan ke satu akun; kunci akun di database tidak berlipat")
    ulang_instans(beku=True)
    proxy_mulai("bergilir")
    akun = KARYAWAN[100]
    hs = tebak(PORT_PROXY, [akun] * 12)
    catat(f"dua instance (round_robin), 12 tebakan ke satu akun dari satu alamat → {jumlah(hs)}")
    catat(f"  tebakan 1-5 per instance lolos bucket, tebakan 11 dan 12 ditolak 429: 401 sepuluh kali, bukan lima")
    harap(jumlah(hs), "401: 10 · 429: 2", "per akun dua jatah")
    catat("database sesudahnya (kunci akun: gagal_login berhenti di 5, tebakan 6-10 bertemu akun terkunci):")
    tampil_akun(akun)
    harap(d.satu(f"SELECT gagal_login FROM akun WHERE email = '{akun}'", SCHEMA), 5, "gagal_login 5")
    ulang_instans(beku=True)
    akun2 = KARYAWAN[101]
    hs = tebak(PORT_A, [akun2] * 12)
    catat(f"satu instance, 12 tebakan ke satu akun → {jumlah(hs)}")
    harap(jumlah(hs), "401: 5 · 429: 7", "per akun satu jatah")
    tampil_akun(akun2)
    harap(d.satu(f"SELECT gagal_login FROM akun WHERE email = '{akun2}'", SCHEMA), 5, "gagal_login 5, satu instance")

    # ---- Redis ----
    r = rds()
    bagian("E. Hitungan bersama di Redis (skrip INCR + PEXPIRE atomik), round_robin: 24 percobaan ke 24 akun")
    bersihkan_redis()
    ulang_instans(["-redis", f"127.0.0.1:{REDIS_PORT}"], ["-redis", f"127.0.0.1:{REDIS_PORT}"], beku=True)
    proxy_mulai("bergilir")
    hs = tebak(PORT_PROXY, emails)
    catat(f"24 percobaan → {jumlah(hs)}")
    catat(f"  per instance: 401 {per_instance([h for h in hs if h.status == 401])} · 429 {per_instance([h for h in hs if h.status == 429])}")
    harap(jumlah(hs), "401: 10 · 429: 14", "Redis: satu jatah untuk semua instance")
    kunci_ip = list(r.scan_iter("rekeningo:rl:login:ip:*"))
    kunci_akun = list(r.scan_iter("rekeningo:rl:login:akun:*"))
    nilai, sisa = int(r.get(kunci_ip[0])), r.pttl(kunci_ip[0])
    catat(f"Redis: key per IP {len(kunci_ip)}, hitungannya {nilai} (naik juga untuk yang ditolak), sisa jendela antara 1 dan 60 detik: {ya(0 < sisa <= 60000)}")
    catat(f"Redis: key per akun {len(kunci_akun)} (hanya 10 percobaan yang lolos penahan per IP sampai ke pemeriksaan akun)")
    catat("  key berisi hash alamat dan email, bukan teksnya: " + ya(all("@" not in k and not re.search(r"\d+\.\d+\.\d+\.\d+", k) for k in kunci_ip + kunci_akun)))
    harap((len(kunci_ip), nilai, 0 < sisa <= 60000, len(kunci_akun)), (1, 24, True, 10), "key Redis")
    for nama in ("a", "b"):
        b = batas_instans(nama)
        catat(f"GET /lab/batas instance {nama} → {json.dumps(b, sort_keys=True)}")
        harap(b["ip"]["lokal"] + b["akun"]["lokal"], 0, "tidak ada jatuh ke lokal")

    bagian("F. Hitungan bersama, kebijakan random bawaan Caddy: hasilnya tetap 10, tidak bergantung pada siapa yang menjawab")
    bersihkan_redis()
    proxy_mulai("bawaan")
    hs = tebak(PORT_PROXY, KARYAWAN[24:48])
    catat(f"24 percobaan → {jumlah(hs)}")
    harap(jumlah(hs), "401: 10 · 429: 14", "Redis dengan random")

    bagian("G. Hitungan bersama per akun: 12 tebakan ke satu akun dari satu alamat, round_robin")
    bersihkan_redis()
    ulang_instans(["-redis", f"127.0.0.1:{REDIS_PORT}"], ["-redis", f"127.0.0.1:{REDIS_PORT}"], beku=True)
    proxy_mulai("bergilir")
    akun3 = KARYAWAN[102]
    hs = tebak(PORT_PROXY, [akun3] * 12)
    catat(f"12 tebakan ke satu akun → {jumlah(hs)}")
    harap(jumlah(hs), "401: 5 · 429: 7", "Redis per akun")
    tampil_akun(akun3)
    harap(d.satu(f"SELECT gagal_login FROM akun WHERE email = '{akun3}'", SCHEMA), 5, "gagal_login 5 dengan Redis")

    bagian("H. INCR lalu EXPIRE sebagai dua perintah: key yang tidak pernah kedaluwarsa (R3-12)")
    r.delete("rekeningo:rl:demo")
    r.incr("rekeningo:rl:demo")
    catat(f"INCR rekeningo:rl:demo → 1; PTTL → {r.pttl('rekeningo:rl:demo')} (-1: tanpa masa berlaku; bila proses mati sebelum EXPIRE, key ini menghitung selamanya)")
    harap(r.pttl("rekeningo:rl:demo"), -1, "INCR saja tanpa masa berlaku")
    r.delete("rekeningo:rl:demo")
    catat("Skrip Lua di internal/redisbatas menaikkan hitungan dan memasang masa berlaku dalam satu perintah (bagian E: sisa jendela antara 1 dan 60 detik).")

    bagian("I. Redis mati (kontainer dihentikan): batas jatuh ke bucket lokal, login tidak ikut mati")
    redis_aksi("stop")
    ulang_instans(["-redis", f"127.0.0.1:{REDIS_PORT}"], ["-redis", f"127.0.0.1:{REDIS_PORT}"], beku=True)
    proxy_mulai("bergilir")
    hs = tebak(PORT_PROXY, KARYAWAN[48:72])
    catat(f"24 percobaan → {jumlah(hs)} (sama dengan bucket di memori, bagian A)")
    harap(jumlah(hs), "401: 20 · 429: 4", "Redis mati: batas lokal")
    for nama in ("a", "b"):
        b = batas_instans(nama)
        catat(f"GET /lab/batas instance {nama} → {json.dumps(b, sort_keys=True)}")
        harap((b["ip"]["bersama"], b["akun"]["bersama"]), (0, 0), "tidak ada jawaban bersama")
        catat(f"log instance {nama}: " + log_batas(nama))
    redis_aksi("start")
    tunggu_redis()
    bersihkan_redis()
    hs = tebak(PORT_PROXY, KARYAWAN[72:78])
    b = batas_instans("a")
    catat(f"Redis hidup lagi, 6 percobaan baru → {jumlah(hs)}; instance a menjawab bersama lagi: {ya(b['ip']['bersama'] > 0)}")
    harap(b["ip"]["bersama"] > 0, True, "Redis kembali dipakai")
    catat("log instance a: " + log_batas("a"))

    bagian("J. Redis menggantung (kontainer dibekukan): batas waktu 50 ms lawan bawaan go-redis")
    redis_aksi("pause")
    try:
        ulang_instans(["-redis", f"127.0.0.1:{REDIS_PORT}"], ["-redis", f"127.0.0.1:{REDIS_PORT}", "-redis-timeout", "0"], beku=True)
        h50 = tebak(PORT_A, [KARYAWAN[80]])[0]
        catat(f"-redis-timeout 50ms (bawaan lab): satu login → {h50.status}, selesai dalam kurang dari 1 detik: {ya(h50.lama < 1.0)}")
        h0 = minta("POST", "/login", PORT_B, {"email": KARYAWAN[81], "password": SALAH}, maks=120)
        catat(f"-redis-timeout 0 (bawaan go-redis: 5 detik dan 3 retry): satu login → {h0.status}, butuh lebih dari 5 detik: {ya(h0.lama > 5.0)}")
        print(f"(tidak direkam) lama login: 50 ms {h50.lama:.2f} s, bawaan go-redis {h0.lama:.1f} s")
        harap((h50.status, h50.lama < 1.0, h0.status, h0.lama > 5.0), (401, True, 401, True), "Redis menggantung")
    finally:
        redis_aksi("unpause")
        tunggu_redis()
    tulis("batas.txt", "M22: rate limit login di memori dua instance lawan hitungan bersama di Redis")


# ---------- utama ----------

BAGIAN = {"proxy": rekam_proxy, "panic": rekam_panic, "bergulir": rekam_bergulir, "batas": rekam_batas}


def utama():
    pilih = sys.argv[1:] or list(BAGIAN)
    for nama in pilih:
        if nama not in BAGIAN:
            d.gagal(f"bagian tidak dikenal: {nama} (pilihan: {' '.join(BAGIAN)})")
    d.bangun()
    try:
        for nama in pilih:
            print("== bagian", nama, flush=True)
            BAGIAN[nama]()
    finally:
        for port in list(d.server):
            d.stop(port)
        proxy_hentikan()
        subprocess.run(COMPOSE_REDIS + ["unpause", "redis"], capture_output=True, env=os.environ)
        subprocess.run(COMPOSE_REDIS + ["start", "redis"], capture_output=True, env=os.environ)


if __name__ == "__main__":
    utama()
