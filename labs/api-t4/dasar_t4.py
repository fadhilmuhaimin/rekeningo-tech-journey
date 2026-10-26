"""Fondasi lab Tahap 4 (lab-api-t4): schema akhir Tahap 3 + migrasi 000020 dan sesudahnya, server api-t4, dan tiga pihak
ketiga tiruan (gateway pembayaran, layanan verifikasi, layanan push).

Dipakai `run.py` lab ini, dan oleh lab Tahap 4 berikutnya (t4-webhook, t4-integrasi, t4-modul, t4-storage, t4-qr,
t4-ssrf, t4-kartu, t4-audit, t4-pipeline) lewat `sys.path.insert(0, ".../api-t4"); import dasar_t4 as d`, supaya semuanya
berbagi satu server, satu skema, dan satu data awal, bukan salinan. Tiap lab memakai schema sendiri bila perlu
(`buat_schema(nama)`).

Lajur kerja: port lewat labs/lab_env.py (labs/README.md "Beberapa lajur sekaligus"). Teks yang masuk rekaman memakai
port dasar, bukan port dengan offset.
"""
import json, os, pathlib, re, socket, subprocess, sys, tempfile, threading, time

import psycopg
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), ".."))  # lab_env: labs/README.md
from lab_env import DB_PORT, REDIS_PORT, port_lab  # noqa: E402

HERE = pathlib.Path(__file__).resolve().parent
LABS = HERE.parent
OUT = HERE / "output"
T1 = LABS / "api-t1"
T2 = LABS / "api-t2"
T3 = LABS / "api-t3"
B3 = LABS / "b3-ledger"
SCHEMA = "tahap4"
TES = os.environ.get("LAB_TES_SCHEMA", "tahap4_tes")   # lajur lain atau pekerjaan paralel boleh memakai schema tes sendiri
ROLE = "api_t4"
DASAR, DASAR_PUSH, DASAR_KEDUA = 18280, 18281, 18282   # api-t4, push tiruan, instance kedua (dicadangkan lab turunan)
DASAR_GATEWAY, DASAR_VERIFIKASI, DASAR_PENERBIT = 18283, 18284, 18285   # gateway pembayaran, layanan verifikasi, penerbit kartu (tiruan)
PORT, PORT_PUSH, PORT_KEDUA = port_lab(DASAR), port_lab(DASAR_PUSH), port_lab(DASAR_KEDUA)
PORT_GATEWAY, PORT_VERIFIKASI, PORT_PENERBIT = port_lab(DASAR_GATEWAY), port_lab(DASAR_VERIFIKASI), port_lab(DASAR_PENERBIT)
PEMILIK = f"host=127.0.0.1 port={DB_PORT} user=lab password=lab dbname=lab application_name=api-t4-pemilik"
# Server memakai role api_t4 yang bukan pemilik tabel: tidak bisa mematikan trigger invarian (keputusan 401, 414).
APP_NAMA = "api-t4"


def db_app(schema=SCHEMA, nama=APP_NAMA):
    return f"postgres://{ROLE}:{ROLE}@127.0.0.1:{DB_PORT}/lab?search_path={schema}&application_name={nama}"


def db_pemilik(schema=SCHEMA, nama="api-t4-pemilik"):
    return f"postgres://lab:lab@127.0.0.1:{DB_PORT}/lab?search_path={schema}&application_name={nama}"


ENV = dict(os.environ, TZ="Asia/Jakarta")
BIN = HERE / "api-t4"
BIN_PUSH = HERE / "pushpalsu"
BIN_TIRUAN = HERE / "tiruan"        # gateway pembayaran dan layanan verifikasi tiruan (cmd/tiruan)
BIN_PENERBIT = HERE / "penerbit"    # penerbit kartu tiruan (cmd/penerbit)
# Data lab, bukan secret: rahasia webhook gateway tiruan dan kunci penerbit tiruan.
RAHASIA_WEBHOOK, RAHASIA_WEBHOOK_LAMA = "rahasia-gateway-lab-1", "rahasia-gateway-lab-0"
KUNCI_PENERBIT = "kunci-penerbit-lab"
OBJEK_DIR = pathlib.Path(tempfile.gettempdir()) / f"api-t4-objek-{DB_PORT}"
PASSWORD = "sementara-tahap-4"   # password semua akun data lab (cmd/api/seed.go); bukan secret

log = []
samaran = {}
server = {}   # port -> (proses, file log)
_urut_uuid = [0]


# ---------- dasar ----------

def gagal(pesan):
    for port in list(server):
        stop(port)
    raise SystemExit("GAGAL: " + pesan)


def harap(nyata, harus, apa):
    if nyata != harus:
        gagal(f"{apa}: dapat {nyata!r}, harus {harus!r}")


def catat(teks=""):
    log.append(teks)


def bagian(judul):
    catat(f"\n# --- {judul} ---")


def versi_alat():
    go = subprocess.run(["go", "version"], capture_output=True, text=True).stdout.split()
    return go[2] if len(go) > 2 else "go?"


PGX = re.search(r"jackc/pgx/v5 (v[\d.]+)", (HERE / "go.mod").read_text()).group(1)


def tulis(nama, judul, lab="api-t4", schema=SCHEMA, dasar=DASAR, keputusan=None):
    """Tulis rekaman. Kepala memuat versi alat, bahasa, dan basis data; tidak memuat nomor keputusan atau ID riset
    (rekaman dikutip halaman lewat Snippet, dan nomor internal tidak boleh tampil ke pembaca)."""
    for port in list(server):
        stop(port)
    versi = satu("SHOW server_version", schema)
    kepala = [f"# Lab {lab} · {judul}",
              f"# PostgreSQL {versi} · {versi_alat()} · pgx {PGX} · schema {schema} · server Go di 127.0.0.1:{dasar}",
              f"# Rekaman dari database bersih: make -C labs/{lab} run."]
    OUT.mkdir(exist_ok=True)
    (OUT / nama).write_text("\n".join(l.rstrip() for l in "\n".join(kepala + log).split("\n")) + "\n")
    print("ditulis:", f"labs/{lab}/output/{nama}")
    log.clear()


WAKTU = re.compile(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)")
WAKTU_SQL = re.compile(r"\d{4}-\d\d-\d\d \d\d:\d\d:\d\d(?:\.\d+)?(?:[+-]\d\d(?::\d\d)?)?")
TANGGAL = re.compile(r"(?<![\d-])\d{4}-\d\d-\d\d(?![\d-])")
UUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
ORDER = re.compile(r"TB-[0-9a-f]{16}")          # order_id top-up bank: acak per run, diberi nomor menurut kemunculan pertama
TUJUAN = re.compile(r"\b88\d{14}\b")             # nomor tujuan bayar dari gateway tiruan (turunan order_id)
_urut_order = [0]


def daftar_samaran(asli, label):
    samaran[asli] = label


def samarkan(teks):
    teks = WAKTU.sub("<waktu>", teks)
    teks = WAKTU_SQL.sub("<waktu>", teks)
    teks = TANGGAL.sub("<tanggal>", teks)
    teks = re.sub(r'"tertua_detik":\d+', '"tertua_detik":<detik>', teks)   # umur baris tertua bergantung pada kecepatan mesin
    for u in UUID.findall(teks):
        if u not in samaran:
            _urut_uuid[0] += 1
            samaran[u] = f"<notifikasi_id {_urut_uuid[0]}>"
    for o in ORDER.findall(teks):
        if o not in samaran:
            _urut_order[0] += 1
            samaran[o] = f"<order {_urut_order[0]}>"
    teks = TUJUAN.sub("<tujuan bayar>", teks)
    for asli, label in sorted(samaran.items(), key=lambda x: -len(x[0])):
        teks = teks.replace(asli, label)
    return teks


# ---------- PostgreSQL sebagai pemilik schema ----------

def sambung(schema=SCHEMA, autocommit=True):
    c = psycopg.connect(PEMILIK + f" options=-csearch_path={schema}", autocommit=autocommit)
    c.prepare_threshold = None
    return c


def satu(q, schema=SCHEMA, arg=None):
    with sambung(schema) as c:
        return c.execute(q, arg).fetchone()[0]


def tabel(kolom, baris):
    """Keluaran seperti psql (rata kiri, garis pemisah, '(n rows)')."""
    isi = [[("" if v is None else "t" if v is True else "f" if v is False else str(v)) for v in b] for b in baris]
    lebar = [max([len(k)] + [len(b[i]) for b in isi]) for i, k in enumerate(kolom)]
    out = [" " + " | ".join(k.ljust(lebar[i]) for i, k in enumerate(kolom)).rstrip(),
           "-" + "-+-".join("-" * w for w in lebar) + "-"]
    for b in isi:
        out.append(" " + " | ".join(v.ljust(lebar[i]) for i, v in enumerate(b)).rstrip())
    out.append(f"({len(isi)} row{'' if len(isi) == 1 else 's'})")
    return out


def sql(q, tampil=True, schema=SCHEMA):
    """Satu perintah sebagai pemilik schema, keluarannya seperti psql."""
    with sambung(schema) as c:
        cur = c.execute(q)
        hasil = [d.name for d in cur.description] if cur.description else None
        isi = cur.fetchall() if hasil else []
        if tampil:
            catat("=> " + q.strip().replace("\n", "\n   "))
            for b in (tabel(hasil, isi) if hasil else [cur.statusmessage]):
                catat(samarkan(b))
        return isi


# ---------- schema ----------

MIGRASI_T2 = sorted((T2 / "migrasi").glob("*.up.sql"))
MIGRASI_T3 = sorted((T3 / "migrasi").glob("*.up.sql"))
MIGRASI_T4 = sorted((HERE / "migrasi").glob("*.up.sql"))

HAK = ["GRANT USAGE ON SCHEMA {s} TO api_t4",
       "GRANT SELECT (id, jenis, nama, email, password_hash, nomor_karyawan, wajib_ganti_password, gagal_login,"
       " terkunci_sampai, kota_id, tingkat, status) ON akun TO api_t4",
       "GRANT INSERT (id, jenis, nama, email, password_hash) ON akun TO api_t4",   # POST /daftar: tingkat dan status memakai bawaan
       "GRANT UPDATE (password_hash, wajib_ganti_password, gagal_login, terkunci_sampai, tingkat, status) ON akun TO api_t4",
       "GRANT SELECT, INSERT, DELETE ON sesi TO api_t4",
       "GRANT SELECT, UPDATE (saldo_cache, versi, batas_harian) ON buku TO api_t4",
       "GRANT INSERT (akun_id, jenis, batas_saldo, batas_harian) ON buku TO api_t4",
       "GRANT SELECT, INSERT ON jurnal, posting TO api_t4",
       "GRANT SELECT, INSERT, UPDATE, DELETE ON kunci_idempotensi TO api_t4",
       "GRANT SELECT, INSERT, UPDATE ON batch_pencairan, baris_pencairan TO api_t4",
       "GRANT SELECT ON kota TO api_t4",
       "GRANT SELECT, INSERT, UPDATE ON perangkat TO api_t4",
       "GRANT SELECT, INSERT, UPDATE, DELETE ON outbox TO api_t4",
       "GRANT SELECT, INSERT, UPDATE ON produk TO api_t4",
       "GRANT SELECT, INSERT ON promo TO api_t4",
       "GRANT SELECT, INSERT, DELETE ON operasi_sinkron TO api_t4",
       "GRANT SELECT, INSERT, UPDATE ON topup_bank, webhook_event, insiden_rekon, verifikasi, qr, kartu, otorisasi_kartu TO api_t4",
       "GRANT SELECT, INSERT ON audit_log TO api_t4",   # tanpa UPDATE dan DELETE: log hanya bertambah (ADR 43)
       "GRANT USAGE ON ALL SEQUENCES IN SCHEMA {s} TO api_t4"]


def buat_schema(schema=SCHEMA, hak=True):
    """Schema akhir Tahap 2 (api-t1/schema.sql, batas saldo warung, api-t2 000009-000014), api-t3 000015-000019, lalu api-t4 000020 dan sesudahnya.

    Semua file migration dijalankan apa adanya, dalam satu transaction, di schema kosong: ERD Tahap 4 (tools/erd.py)
    membaca daftar file yang sama. Data awal (kota, akun, produk) bukan migration: `./api-t4 -seed`."""
    with sambung("public") as c:
        c.execute(f"DROP SCHEMA IF EXISTS {schema} CASCADE")
        c.execute("""DO $$ BEGIN
                       IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'api_t4') THEN
                         CREATE ROLE api_t4 LOGIN PASSWORD 'api_t4';   -- password lab, sama polanya dengan lab/lab
                       END IF;
                     END $$""")
    v1 = (T1 / "schema.sql").read_text()
    if len(re.findall(r"\btahap1\b", v1)) < 3:
        gagal("nama schema tahap1 di api-t1/schema.sql")
    with sambung("public") as c:
        c.execute(re.sub(r"\btahap1\b", schema, v1))
    with sambung(schema, autocommit=False) as c:
        c.execute((LABS / "b4-migration/baru/000005_batas_saldo_warung.up.sql").read_text())
        for f in MIGRASI_T2 + MIGRASI_T3 + MIGRASI_T4:
            c.execute(f.read_text())
        c.commit()
    if hak:
        for q in HAK:
            sql(q.format(s=schema), tampil=False, schema=schema)


def bangun():
    for biner, paket in ((BIN, "./cmd/api"), (BIN_PUSH, "./cmd/pushpalsu"), (BIN_TIRUAN, "./cmd/tiruan"),
                         (BIN_PENERBIT, "./cmd/penerbit")):
        subprocess.run(["go", "build", "-o", str(biner), paket], cwd=HERE, check=True)


def seed(schema=SCHEMA):
    subprocess.run([str(BIN), "-seed"], env=dict(ENV, DATABASE_URL=db_pemilik(schema)), check=True)


# ---------- server dan HTTP ----------

def port_bebas(port):
    with socket.socket() as s:
        if s.connect_ex(("127.0.0.1", port)) == 0:
            gagal(f"port {port} sudah dipakai proses lain")


def mulai(biner, port, args=(), db=None, tampil=None, env_lain=None):
    """Satu proses server (api-t4 atau pushpalsu) di port itu; menunggu sampai port menjawab."""
    port_bebas(port)
    f = tempfile.TemporaryFile(mode="a+")  # a+: tulisan proses selalu ke ujung, aman dibaca sambil jalan
    env = dict(ENV, DATABASE_URL=db or db_app(), **(env_lain or {}))
    p = subprocess.Popen([str(biner), "-addr", f"127.0.0.1:{port}", *args], env=env, stdout=f, stderr=f, text=True)
    for _ in range(200):
        with socket.socket() as s:
            if s.connect_ex(("127.0.0.1", port)) == 0:
                break
        time.sleep(0.05)
    else:
        gagal(f"server {biner.name} tidak menyala")
    server[port] = (p, f)
    if tampil:
        catat(tampil)


def args_t4():
    """Alamat pihak ketiga tiruan dan setelan Tahap 4 yang dipakai semua proses api-t4 (server dan worker)."""
    return ["-gateway-url", f"http://127.0.0.1:{PORT_GATEWAY}", "-verifikasi-url", f"http://127.0.0.1:{PORT_VERIFIKASI}",
            "-penerbit-url", f"http://127.0.0.1:{PORT_PENERBIT}", "-penerbit-kunci", KUNCI_PENERBIT,
            "-rahasia-webhook", RAHASIA_WEBHOOK, "-objek-dir", str(OBJEK_DIR)]


def mulai_api(args=(), tampil=None, port=PORT, db=None):
    mulai(BIN, port, ["-lab", "-push-url", f"http://127.0.0.1:{PORT_PUSH}", *args_t4(), *args], db=db, tampil=tampil)


def mulai_push(tampil=None):
    mulai(BIN_PUSH, PORT_PUSH, tampil=tampil)


def mulai_gateway(tampil=None):
    """Gateway pembayaran tiruan; webhook dikirim ke server api-t4 di port dasar + offset."""
    mulai(BIN_TIRUAN, PORT_GATEWAY, ["-peran", "gateway", "-webhook-url", f"http://127.0.0.1:{PORT}/webhooks/pembayaran",
                                      "-rahasia", RAHASIA_WEBHOOK], tampil=tampil)


def mulai_verifikasi(tampil=None):
    mulai(BIN_TIRUAN, PORT_VERIFIKASI, ["-peran", "verifikasi"], tampil=tampil)


def mulai_penerbit(tampil=None, args=()):
    """Penerbit kartu tiruan: dipanggil Rekeningo untuk menerbitkan kartu, dan (lewat /lab/*) memanggil Rekeningo untuk otorisasi."""
    mulai(BIN_PENERBIT, PORT_PENERBIT, ["-api", f"http://127.0.0.1:{PORT}", "-kunci", KUNCI_PENERBIT, *args], tampil=tampil)


def tiruan_mode(port, mode, ms=0):
    """Pasang perilaku gateway atau layanan verifikasi tiruan (normal, mati, lambat, menggantung, ...)."""
    s, _ = curl("POST", "/lab/mode", {"mode": mode, "ms": ms}, port=port, tampil=False)
    harap(s, 204, f"mode tiruan {mode}")


def tiruan_reset(port):
    harap(curl("POST", "/lab/reset", port=port, tampil=False)[0], 204, "reset tiruan")


def bersih_log(teks):
    return [re.sub(r"127\.0\.0\.1:\d+", "127.0.0.1:<port>", re.sub(r"^\d{4}/\d\d/\d\d \d\d:\d\d:\d\d(?:\.\d+)? ", "", l))
            for l in teks.splitlines() if "mendengar di" not in l]


def stop(port=PORT, tampil=None, sinyal="terminate"):
    if port not in server:
        return []
    p, f = server.pop(port)
    getattr(p, sinyal)()
    p.wait()
    f.seek(0)
    if tampil:
        catat(tampil)
    return bersih_log(f.read())


def log_server(port=PORT):
    """Isi log sementara tanpa menghentikan server."""
    p, f = server[port]
    f.flush()
    pos = f.tell()
    f.seek(0)
    teks = f.read()
    f.seek(pos)
    return bersih_log(teks)


def curl(method, path, body=None, token=None, jenis="application/json", tampil=True, tampil_body=None, port=PORT,
         kepala=(), cookie=None, maks=None, daftarkan=None):
    cmd = ["curl", "-s", "-i", "-X", method, f"http://127.0.0.1:{port}{path}"]
    tampil_cmd = f"$ curl -i -X {method} '{path}'"
    if maks:
        cmd += ["--max-time", str(maks)]
    if token:
        cmd += ["-H", f"Authorization: Bearer {token}"]
        tampil_cmd += f" -H 'Authorization: Bearer {token}'"
    if cookie:
        cmd += ["-H", f"Cookie: {cookie}"]
        tampil_cmd += f" -H 'Cookie: {cookie}'"
    for k in kepala:
        cmd += ["-H", k]
        tampil_cmd += f" -H '{k}'"
    if body is not None:
        data = body if isinstance(body, str) else json.dumps(body)
        cmd += ["-H", f"Content-Type: {jenis}", "--data-binary", "@-"]
        tampil_cmd += (f" -H 'Content-Type: {jenis}'" if jenis != "application/json" else "") + \
            f" -d '{tampil_body or data}'"
    r = subprocess.run(cmd, input=(data if body is not None else None), capture_output=True, text=True)
    teks = r.stdout.replace("\r\n", "\n")
    teks = re.sub(r"^HTTP/1\.1 100 Continue\n\n", "", teks)
    kepala_h, _, isi = teks.partition("\n\n")
    baris = [l for l in kepala_h.split("\n") if not l.startswith(("Date:", "Content-Length:"))]
    status = int(baris[0].split()[1]) if baris and baris[0].startswith("HTTP/") else 0
    if daftarkan and status:
        daftarkan("\n".join(baris), isi)   # token yang baru muncul di jawaban didaftarkan sebelum dicetak
    if tampil:
        catat(samarkan(tampil_cmd))
        catat(samarkan("\n".join(baris) + "\n\n" + isi.rstrip("\n")) if status else "(tidak ada jawaban)")
    return status, isi


def j(isi):
    return json.loads(isi) if isi.strip() else {}


TOKEN = {}


def login(email, password=PASSWORD, label=None):
    s, isi = curl("POST", "/login", {"email": email, "password": password}, tampil=False)
    harap(s, 200, f"login {email}")
    token = j(isi)["token"]
    samaran[token] = f"<token sesi {label or email}>"
    TOKEN[label or email] = token
    return token


def mulai_worker(nama, args=()):
    """Worker terus berjalan (tanpa -sekali); dihentikan dengan stop(nama). Mengembalikan setelah proses hidup."""
    f = tempfile.TemporaryFile(mode="a+")  # a+: tulisan proses selalu ke ujung, aman dibaca sambil jalan
    p = subprocess.Popen([str(BIN), "-peran", "worker", "-push-url", f"http://127.0.0.1:{PORT_PUSH}", *args_t4(), *args],
                         env=dict(ENV, DATABASE_URL=db_app()), stdout=f, stderr=f, text=True)
    server[nama] = (p, f)
    time.sleep(0.3)
    if p.poll() is not None:
        gagal(f"worker {nama} langsung berhenti")


def tunggu(kondisi, apa, batas=15.0, jeda=0.05):
    """Ulangi kondisi() sampai benar; gagal keras bila lewat batas. Dipakai menunggu keadaan, bukan jam."""
    mulai_t = time.time()
    while time.time() - mulai_t < batas:
        if kondisi():
            return
        time.sleep(jeda)
    gagal(f"menunggu {apa}: lewat {batas} detik")


def push_mode(mode, ms=0, kali=0):
    s, _ = curl("POST", "/lab/mode", {"mode": mode, "ms": ms, "kali": kali}, port=PORT_PUSH, tampil=False)
    harap(s, 204, f"mode push {mode}")


def push_reset():
    harap(curl("POST", "/lab/reset", port=PORT_PUSH, tampil=False)[0], 204, "reset push")


def push_diterima(daftar=False):
    s, isi = curl("GET", "/lab/diterima" + ("?daftar=1" if daftar else ""), port=PORT_PUSH, tampil=False)
    harap(s, 200, "baca push")
    return j(isi)


def worker(args=(), tampil=True, db=None):
    """`./api-t4 -peran worker -sekali`: kirim semua yang siap, lalu keluar. Mengembalikan baris ringkasan."""
    cmd = [str(BIN), "-peran", "worker", "-sekali", "-push-url", f"http://127.0.0.1:{PORT_PUSH}", *args_t4(), *args]
    r = subprocess.run(cmd, env=dict(ENV, DATABASE_URL=db or db_app()), capture_output=True, text=True)
    if tampil:
        catat("$ ./api-t4 -peran worker -sekali" + "".join(f" {a}" for a in args))
        for l in r.stdout.splitlines():
            catat(l)
        for l in bersih_log(r.stderr):
            if not l.startswith("worker mulai"):
                catat("log: " + l)
    harap(r.returncode, 0, "exit worker")
    return r.stdout.strip()


def hitung_pg(q):
    return satu(q)
