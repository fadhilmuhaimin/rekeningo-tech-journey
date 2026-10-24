"""Rekam lab API Tahap 2 (keputusan 408): api-t1 naik ke ledger lewat expand, migrate, contract.

curl -i ke server Go + PostgreSQL 17, schema tahap2 (arsip v1 di tahap2_arsip, tes Go di tahap2_tes).
Semua bagian berjalan berurutan di atas database yang sama, dibuat ulang dari nol setiap kali dijalankan.
Token, waktu, kursor, dan bulan berjalan disamarkan, jadi rekaman ulang identik per byte (make cek).
Lab gagal keras bila port sudah dipakai, atau bila hasilnya tidak sesuai yang diharapkan (keputusan 79, 95).

    make -C labs/api-t2 run      (butuh: Docker, Go; PostgreSQL dijalankan lewat labs/b3-race)
"""
import base64, importlib.util, json, os, pathlib, re, socket, subprocess, sys, tempfile, threading, time

import psycopg

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "output"
B3 = HERE.parent / "b3-ledger"
T1 = HERE.parent / "api-t1"
SCHEMA, ARSIP, TES = "tahap2", "tahap2_arsip", "tahap2_tes"
PORT, PORT_LAIN = 18093, 18094   # api-t1 memakai 18083
URL = f"http://127.0.0.1:{PORT}"
PEMILIK = "host=127.0.0.1 port=54333 user=lab password=lab dbname=lab application_name=api-t2-pemilik"
# Server memakai role api_t2 yang bukan pemilik tabel: tidak bisa mematikan trigger invarian (keputusan 401, 414).
DB_APP = f"postgres://api_t2:api_t2@127.0.0.1:54333/lab?search_path={SCHEMA}&application_name=api-t2"
DB_PEMILIK = f"postgres://lab:lab@127.0.0.1:54333/lab?search_path={SCHEMA}&application_name=api-t2-pemilik"
DB_TES = f"postgres://lab:lab@127.0.0.1:54333/lab?search_path={TES}&application_name=api-t2-tes"
ENV = dict(os.environ, TZ="Asia/Jakarta")
BIN = HERE / "api-t2"

sys.path.insert(0, str(T1))
import run as t1  # noqa: E402  (EXPAND_UBAH dan bangun_dari_v1: server cerita akhir Tahap 1)

_spec = importlib.util.spec_from_file_location("b3_ledger_run", B3 / "run.py")
b3 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(b3)   # tabel() psql yang sama dengan rekaman b3-ledger

log = []
samaran = {}
server = {}   # port -> (proses, file log)


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


def tulis(nama, judul):
    for port in list(server):
        stop(port)
    versi = satu("SHOW server_version")
    kepala = [f"# Lab api-t2 · {judul}",
              f"# PostgreSQL {versi} · schema {SCHEMA} · server Go di 127.0.0.1:{PORT}",
              "# Rekaman dari database bersih: make -C labs/api-t2 run (keputusan 408)."]
    OUT.mkdir(exist_ok=True)
    (OUT / nama).write_text("\n".join(l.rstrip() for l in "\n".join(kepala + log).split("\n")) + "\n")
    print("ditulis:", f"labs/api-t2/output/{nama}")
    log.clear()


WAKTU = re.compile(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)")
KURSOR = re.compile(r'"berikutnya":"([A-Za-z0-9_-]+)"|kursor=([A-Za-z0-9_-]+)')


def samarkan(teks):
    for m in KURSOR.finditer(teks):
        k = m.group(1) or m.group(2)
        if k not in samaran:
            try:
                mikro, nomor = base64.urlsafe_b64decode(k + "=" * (-len(k) % 4)).decode().split(".")
            except ValueError:
                continue   # bukan kursor dari server (contoh kursor rusak di riwayat.txt E)
            samaran[k] = f"<kursor: posting {nomor}>"
    teks = WAKTU.sub("<waktu>", teks)
    for asli, label in sorted(samaran.items(), key=lambda x: -len(x[0])):
        teks = teks.replace(asli, label)
    return teks


# ---------- PostgreSQL sebagai pemilik schema ----------

def sambung(schema=SCHEMA, autocommit=True):
    c = psycopg.connect(PEMILIK + f" options=-csearch_path={schema}", autocommit=autocommit)
    c.prepare_threshold = None
    return c


def satu(q, schema=SCHEMA):
    with sambung(schema) as c:
        return c.execute(q).fetchone()[0]


def sql(q, tampil=True, schema=SCHEMA):
    """Satu perintah sebagai pemilik schema, keluarannya seperti psql."""
    with sambung(schema) as c:
        cur = c.execute(q)
        hasil = [d.name for d in cur.description] if cur.description else None
        isi = cur.fetchall() if hasil else []
        if tampil:
            catat("=> " + q.strip().replace("\n", "\n   "))
            for b in (b3.tabel(hasil, isi) if hasil else [cur.statusmessage]):
                catat(b)
        return isi


def migrasi(nama, tampil=True, sesudah=()):
    """Satu file migration dalam satu transaction (SET LOCAL di file butuh transaction).
    sesudah: perintah yang ikut COMMIT bersama file itu (hak akses app sesudah 000012, keputusan 417)."""
    pesan, status = [], []
    with sambung(autocommit=False) as c:
        c.add_notice_handler(lambda d: pesan.append(d.message_primary))
        c.execute((HERE / "migrasi" / nama).read_text())
        for q in sesudah:
            status.append((q, c.execute(q).statusmessage))
        c.commit()
    if tampil:
        catat(f"$ psql -1 -f migrasi/{nama}" + (" -f <hak akses di bawah>   # satu transaction" if sesudah else ""))
        for p in pesan:
            catat(f"NOTICE:  {p}")
        for q, st in status:
            catat("=> " + q)
            catat(st)
        catat("COMMIT")


def buat_ledger_ddl():
    """000010 dibuat dari labs/b3-ledger/schema.sql tanpa blok akun: satu sumber ledger (keputusan 409)."""
    teks = (B3 / "schema.sql").read_text()
    a, b = "-- --8<-- [start:akun]", "-- --8<-- [end:akun]"
    harap((teks.count(a), teks.count(b)), (1, 1), "penanda blok akun di b3-ledger/schema.sql")
    i, j = teks.index(a), teks.index(b) + len(b)
    kepala = ("-- DIBUAT labs/api-t2/run.py dari labs/b3-ledger/schema.sql tanpa blok akun (keputusan 409).\n"
              "-- Jangan diubah tangan: ubah b3-ledger/schema.sql lalu jalankan make -C labs/api-t2 run.\n"
              "-- Rilis 1 (expand), bagian 2 dari 3: tabel ledger. Tabel akun v1 dipakai apa adanya\n"
              "-- (kolom peran di b3-ledger = jenis di sini; akun sistem ditambah 000009).\n"
              "SET LOCAL lock_timeout = '3s';\n\n")
    (HERE / "migrasi" / "000010_ledger_tabel.up.sql").write_text(kepala + teks[:i] + teks[j:].lstrip("\n"))


HAK_V1 = [f"GRANT USAGE ON SCHEMA {SCHEMA} TO api_t2",
          f"GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA {SCHEMA} TO api_t2",
          f"GRANT USAGE ON ALL SEQUENCES IN SCHEMA {SCHEMA} TO api_t2"]
# Sesudah migrate: tabel v1 hanya bisa dibaca, kolom saldo tidak bisa dibaca atau ditulis app.
# Dijalankan di transaction yang sama dengan 000012 (keputusan 417). Tulisan server v1 yang terlanjur jalan
# mengantre di belakang LOCK TABLE dan berjalan sesudah COMMIT. Bila hak dicabut sesudah COMMIT, tulisan itu
# lolos (201) dan saldonya hanya ada di tabel v1. Di transaction yang sama, tulisan itu ditolak (500).
HAK_V2 = [f"REVOKE ALL ON ALL TABLES IN SCHEMA {SCHEMA} FROM api_t2",
          "GRANT SELECT (id, jenis, nama, email, password_hash, nomor_karyawan, wajib_ganti_password, gagal_login,"
          " terkunci_sampai) ON akun TO api_t2",
          "GRANT UPDATE (password_hash, wajib_ganti_password, gagal_login, terkunci_sampai) ON akun TO api_t2",
          "GRANT SELECT, INSERT, DELETE ON sesi TO api_t2",
          "GRANT SELECT, UPDATE (saldo_cache, versi) ON buku TO api_t2",   # pemilik dan jenis buku tetap
          "GRANT SELECT, INSERT ON jurnal, posting TO api_t2",
          "GRANT SELECT, INSERT, UPDATE, DELETE ON kunci_idempotensi TO api_t2",
          "GRANT SELECT, INSERT, UPDATE ON batch_pencairan, baris_pencairan TO api_t2",
          "GRANT SELECT ON transaksi, topup, koreksi TO api_t2",
          f"GRANT USAGE ON ALL SEQUENCES IN SCHEMA {SCHEMA} TO api_t2"]


def hak(daftar, tampil=True):
    for q in daftar:
        sql(q, tampil)


def buat_schema():
    """Schema tahap2 = akhir Tahap 1: api-t1/schema.sql (nama schema diganti) + batas saldo warung (000005)."""
    with sambung("public") as c:
        for s in (SCHEMA, ARSIP, TES):
            c.execute(f"DROP SCHEMA IF EXISTS {s} CASCADE")
        c.execute("""DO $$ BEGIN
                       IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'api_t2') THEN
                         CREATE ROLE api_t2 LOGIN PASSWORD 'api_t2';   -- password lab, sama polanya dengan lab/lab
                       END IF;
                     END $$""")
    v1 = (T1 / "schema.sql").read_text()
    harap(len(re.findall(r"\btahap1\b", v1)) >= 3, True, "nama schema tahap1 di api-t1/schema.sql")
    with sambung("public") as c:
        c.execute(re.sub(r"\btahap1\b", SCHEMA, v1))
    with sambung() as c:
        c.execute((HERE.parent / "b4-migration/baru/000005_batas_saldo_warung.up.sql").read_text())


# ---------- server dan HTTP ----------

def mulai(bin, port=PORT, db=DB_APP, tampil=None, args=()):
    with socket.socket() as s:
        if s.connect_ex(("127.0.0.1", port)) == 0:
            gagal(f"port {port} sudah dipakai proses lain")
    f = tempfile.TemporaryFile(mode="w+")
    p = subprocess.Popen([str(bin), "-addr", f"127.0.0.1:{port}", *args], env=dict(ENV, DATABASE_URL=db),
                         stdout=f, stderr=f, text=True)
    for _ in range(200):
        with socket.socket() as s:
            if s.connect_ex(("127.0.0.1", port)) == 0:
                break
        time.sleep(0.05)
    else:
        gagal(f"server {bin.name} tidak menyala")
    server[port] = (p, f)
    if tampil:
        catat(tampil)


def stop(port=PORT, tampil=None):
    if port not in server:
        return []
    p, f = server.pop(port)
    p.terminate()
    p.wait()
    f.seek(0)
    if tampil:
        catat(tampil)
    return [re.sub(r"^\d{4}/\d\d/\d\d \d\d:\d\d:\d\d ", "", l) for l in f.read().splitlines() if "mendengar di" not in l]


def curl(method, path, body=None, token=None, jenis="application/json", tampil=True, tampil_body=None, port=PORT,
         kepala=()):
    cmd = ["curl", "-s", "-i", "-X", method, f"http://127.0.0.1:{port}{path}"]
    tampil_cmd = f"$ curl -i -X {method} '{path}'"
    if token:
        cmd += ["-H", f"Authorization: Bearer {token}"]
        tampil_cmd += f" -H 'Authorization: Bearer {token}'"
    for k in kepala:   # header tambahan, mis. X-Forwarded-For palsu di pengaman.txt
        cmd += ["-H", k]
        tampil_cmd += f" -H '{k}'"
    if body is not None:
        data = body if isinstance(body, str) else json.dumps(body)
        cmd += ["-H", f"Content-Type: {jenis}", "--data-binary", "@-"]
        tampil_cmd += (f" -H 'Content-Type: {jenis}'" if jenis != "application/json" else "") + \
            f" -d '{tampil_body or data}'"
    r = subprocess.run(cmd, input=(data if body is not None else None), capture_output=True, text=True)
    teks = r.stdout.replace("\r\n", "\n")
    teks = re.sub(r"^HTTP/1\.1 100 Continue\n\n", "", teks)   # curl mengirim Expect: 100-continue untuk body > 1 MiB
    kepala, _, isi = teks.partition("\n\n")
    baris = [l for l in kepala.split("\n") if not l.startswith(("Date:", "Content-Length:"))]
    status = int(baris[0].split()[1]) if baris and baris[0].startswith("HTTP/") else 0
    if tampil:
        catat(samarkan(tampil_cmd))
        catat(samarkan("\n".join(baris) + "\n\n" + isi.rstrip("\n")))
    return status, isi


def j(isi):
    return json.loads(isi) if isi.strip() else {}


TOKEN = {}   # label -> token sesi terakhir (pengaman.txt memakai sesi lama Budi)


def login(email, password, label):
    s, isi = curl("POST", "/login", {"email": email, "password": password}, tampil=False)
    harap(s, 200, f"login {email}")
    token = j(isi)["token"]
    samaran[token] = f"<token sesi {label}>"
    TOKEN[label] = token
    return token


def password_kampus(akun):
    """Password akun kampus sesudah diganti di login pertama (data lab, bukan secret)."""
    return f"kampus-{akun}-sudah-diganti"


def ganti_password(email, lama, baru, tampil=False):
    s, isi = curl("POST", "/ganti-password", {"email": email, "password_lama": lama, "password_baru": baru},
                  tampil=tampil)
    return s, j(isi)


# ---------- app versi lama ----------

APP = []   # (versi, label, token, akun) diisi di langkah 0


def periksa_app(langkah, bayar=10000):
    """App 1.0 mengirim dan membaca jumlah, app 1.1 nominal (kontrak expand Tahap 1). Bayar ke Warung Sari."""
    for versi, label, token, akun in APP:
        field = "jumlah" if versi == "1.0" else "nominal"
        s1, b1 = curl("POST", "/transfers", {"ke": 502, field: bayar}, token, tampil=False)
        s2, b2 = curl("GET", f"/akun/{akun}", token=token, tampil=False)
        s3, b3_ = curl("GET", f"/akun/{akun}/riwayat", token=token, tampil=False)
        riwayat = j(b3_).get("riwayat", []) if s3 == 200 else []
        nilai = riwayat[0].get(field, f"field {field} tidak ada") if riwayat else "kosong"
        saldo = j(b2).get("saldo", "-") if s2 == 200 else "-"
        catat(f"{langkah:<10} app {versi} ({label:<11}) bayar {s1} · saldo {s2} {saldo} · riwayat {s3} {field} {nilai}")
        yield s1, s2, s3, saldo, nilai


def app_jalan(langkah, saldo_harus):
    hasil = list(periksa_app(langkah))
    harap([(h[0], h[1], h[2], h[3], h[4]) for h in hasil],
          [(201, 200, 200, s, 10000) for s in saldo_harus], f"app versi lama di {langkah}")


# ---------- migrasi.txt ----------

def rekam_migrasi(tmp):
    global APP
    buat_schema()
    buat_ledger_ddl()
    bagian("A. Langkah 0 · akhir Tahap 1: server v1 (expand, ADR 10), kolom saldo")
    v1 = t1.bangun_dari_v1(tmp, "api-t1-expand", t1.EXPAND_UBAH)
    t1.log.clear()
    subprocess.run([str(v1), "-seed"], env=dict(ENV, DATABASE_URL=DB_PEMILIK), check=True)
    hak(HAK_V1, tampil=False)
    mulai(v1)
    admin = login("admin.tunjangan@lestari.example", "sementara-400", "admin")
    csv = "email,nominal\n" + "".join(f"{e},250000\n" for (e,) in sql(
        "SELECT email FROM akun WHERE jenis = 'karyawan' ORDER BY id", tampil=False))
    s, _ = curl("POST", "/topup?keterangan=Tunjangan%20makan%20minggu%201", csv, admin, "text/csv", tampil=False)
    harap(s, 200, "top-up minggu 1")
    dimas = login("dimas@lestari.example", "sementara-417", "Dimas")
    budi = login("budi@lestari.example", "sementara-419", "Budi")
    for n in (45000, 40000, 50000, 35000, 45000):
        harap(curl("POST", "/transfers", {"ke": 418, "jumlah": n}, dimas, tampil=False)[0], 201, "bayar Dimas")
    sql("UPDATE akun SET saldo = saldo - 70000 WHERE id = 419", tampil=False)   # M4: terpotong tanpa baris
    harap(curl("POST", "/koreksi", {"akun": 419, "jumlah": 70000, "alasan": KOREKSI_M4}, admin, tampil=False)[0],
          201, "koreksi M4")
    harap(curl("POST", "/transfers", {"ke": 418, "jumlah": 70000}, budi, tampil=False)[0], 201, "bayar ulang Budi")
    APP = [("1.0", "Karyawan 420", login("karyawan420@lestari.example", "sementara-420", "Karyawan 420"), 420),
           ("1.1", "Karyawan 421", login("karyawan421@lestari.example", "sementara-421", "Karyawan 421"), 421)]
    catat("# persiapan (lewat API v1, rinciannya di labs/api-t1): seed 104 akun Gedung A; top-up minggu 1,")
    catat("#   100 karyawan x Rp250.000; Dimas bayar Warung Ani 5 kali (Rp215.000); M4: saldo Budi terpotong")
    catat("#   Rp70.000 tanpa baris, koreksi +Rp70.000, bayar ulang Rp70.000 (data sama dengan b3-ledger, keputusan 406)")
    catat(f"# server: ./api-t1-expand (kode labs/api-t1 + EXPAND_UBAH), role api_t2")
    sql("SELECT id, jenis, nama, saldo FROM akun WHERE id IN (417, 418, 419, 420, 421, 502) ORDER BY id")
    sql("SELECT jenis, count(*) AS akun, sum(saldo) AS saldo FROM akun GROUP BY jenis ORDER BY jenis")
    catat("\n# App versi lama: bayar Rp10.000 ke Warung Sari, baca saldo, baca riwayat (field menurut versi app)")
    app_jalan("langkah 0", [240000, 240000])

    bagian("B. Langkah 1 · expand (rilis 1): tabel ledger ditambah, server v1 tetap jalan tanpa restart")
    for f in ("000009_akun_tahap2.up.sql", "000010_ledger_tabel.up.sql", "000011_ledger_pendukung.up.sql"):
        migrasi(f)
    catat("# 000010 dibuat dari labs/b3-ledger/schema.sql tanpa blok akun (keputusan 409)")
    sql("SELECT count(*) AS jurnal, (SELECT count(*) FROM buku) AS buku FROM jurnal")
    catat("\n# Akun kampus pusat didaftarkan (data lab, keputusan 413): Citra 504, warung 505-513, karyawan 514-1412")
    subprocess.run([str(BIN), "-seed-kampus"], env=dict(ENV, DATABASE_URL=DB_PEMILIK), check=True)
    catat("$ DATABASE_URL=<pemilik schema> ./api-t2 -seed-kampus")
    sql("SELECT jenis, count(*) AS akun, count(nomor_karyawan) AS bernomor, count(*) FILTER (WHERE wajib_ganti_password)"
        " AS wajib_ganti FROM akun GROUP BY jenis ORDER BY jenis")
    catat("\n# App versi lama, server v1 di atas skema expand")
    app_jalan("langkah 1", [230000, 230000])
    harap(satu("SELECT count(*) FROM jurnal"), 0, "server v1 tidak menulis ledger")

    bagian("C. Langkah 2 · migrate (rilis 2): server v1 berhenti, saldo jadi jurnal, server v2 menyala")
    stop(tampil="$ kill -TERM <pid server v1>   # mulai jeda deploy")
    catat("# Selama jeda ini app mendapat 'tidak ada jawaban', sama dengan deploy Tahap 1 (1.31)")
    catat("# Migrate dan hak akses app sesudahnya dalam satu transaction (keputusan 414, 417)")
    migrasi("000012_ledger_migrasi.up.sql", sesudah=HAK_V2)
    mulai(BIN, tampil="$ ./api-t2 &   # server v2 menyala, role api_t2")
    catat("\n# Saldo setiap akun sama sebelum dan sesudah: kolom saldo v1 = saldo_cache = jumlah posting")
    sql("""SELECT count(*) AS buku_akun,
       count(*) FILTER (WHERE a.saldo = b.saldo_cache AND b.saldo_cache = (SELECT coalesce(sum(jumlah), 0) FROM posting p WHERE p.buku_id = b.id)) AS sama
FROM akun a JOIN buku b ON b.akun_id = a.id""")
    harap(sql("SELECT count(*) FILTER (WHERE a.saldo <> b.saldo_cache) FROM akun a JOIN buku b ON b.akun_id = a.id",
              tampil=False)[0][0], 0, "saldo sama sesudah migrasi")
    sql("""SELECT a.id, a.nama, a.saldo AS saldo_v1, b.saldo_cache,
       (SELECT coalesce(sum(jumlah), 0) FROM posting p WHERE p.buku_id = b.id) AS jumlah_posting
FROM akun a JOIN buku b ON b.akun_id = a.id WHERE a.id IN (417, 418, 419, 420, 421, 502) ORDER BY a.id""")
    sql("SELECT jenis, count(*) AS jurnal FROM jurnal GROUP BY jenis ORDER BY jenis")
    sql("SELECT min(id) AS jurnal_pertama, (SELECT max(id) FROM transaksi) AS transaksi_v1_terakhir FROM jurnal")
    cek_cache(0)
    catat("\n# App versi lama, server v2 (ledger)")
    app_jalan("langkah 2", [220000, 220000])
    catat("\n# Budi membuka riwayat di app 1.0: transaksi v1 tidak ikut, diganti saldo awal dan pasangan koreksi")
    s, _ = curl("GET", "/akun/419/riwayat", token=budi)
    harap(s, 200, "riwayat Budi sesudah migrasi")
    catat("\n# Tautan lama /transfers/6 (bayar ulang Budi di v1): nomor itu tidak pernah dipakai jurnal")
    harap(curl("GET", "/transfers/6", token=budi)[0], 404, "nomor transaksi v1")
    catat("\n# Rollback ke server v1 sesudah migrate: database menolak, bukan saldo yang diam-diam berbeda")
    mulai(v1, PORT_LAIN, tampil=f"$ ./api-t1-expand -addr 127.0.0.1:{PORT_LAIN} &")
    versi, label, token, akun = APP[0]
    harap(curl("POST", "/transfers", {"ke": 502, "jumlah": 10000}, token, port=PORT_LAIN)[0], 500, "v1 bayar")
    harap(curl("GET", f"/akun/{akun}", token=token, port=PORT_LAIN)[0], 500, "v1 saldo")
    for l in stop(PORT_LAIN):
        catat("server log: " + l)
    harap(satu(f"SELECT saldo_cache FROM buku WHERE akun_id = {akun}"), 220000, "saldo tetap sesudah v1 ditolak")

    bagian("D. Langkah 3 · contract (rilis 3): kolom saldo dan tabel v1 dihapus, server v2 tetap jalan")
    catat("# Di cerita: akhir Tahap 2, sesudah cek cache tiap malam cocok. Di lab: langsung sesudah langkah 2.")
    catat("# Isi tabel v1 disalin ke schema arsip dulu (langkah operasional, bukan migration):")
    sql(f"CREATE SCHEMA {ARSIP}")
    for t in ("transaksi", "topup", "koreksi"):
        sql(f"CREATE TABLE {ARSIP}.{t} AS TABLE {SCHEMA}.{t}")
    sql(f"CREATE TABLE {ARSIP}.saldo_v1 AS SELECT id, saldo FROM {SCHEMA}.akun")
    migrasi("000013_saldo_contract.up.sql")
    sql("SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() ORDER BY table_name")
    sql("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = current_schema()"
        " AND table_name = 'akun' ORDER BY ordinal_position")
    catat("\n# App versi lama, server v2 di atas skema akhir Tahap 2")
    app_jalan("langkah 3", [210000, 210000])
    cek_cache(0)

    bagian("E. Cek cache tiap malam menemukan cache yang melenceng")
    catat("# Diperankan: kode yang salah menulis cache tanpa posting (sebagai pemilik schema)")
    sql("UPDATE buku SET saldo_cache = saldo_cache + 5000 WHERE akun_id = 420")
    cek_cache(1)
    sql("UPDATE buku b SET saldo_cache = (SELECT coalesce(sum(jumlah), 0) FROM posting p WHERE p.buku_id = b.id)"
        " WHERE akun_id = 420")
    cek_cache(0)

    bagian("F. Role app bukan pemilik tabel: invarian tidak bisa dimatikan dari server")
    with psycopg.connect(DB_APP.split("?")[0] + f"?options=-csearch_path%3D{SCHEMA}", autocommit=True) as c:
        for q, kode in (("ALTER TABLE posting DISABLE TRIGGER posting_tidak_diubah", "42501"),
                        ("UPDATE posting SET jumlah = 1 WHERE id = 1", "42501"),
                        ("UPDATE buku SET jenis = 'warung' WHERE akun_id = 419", "42501"),
                        ("SET session_replication_role = replica", "42501")):
            catat(f"api_t2=> {q};")
            try:
                c.execute(q)
                gagal(f"harus ditolak: {q}")
            except psycopg.Error as e:
                harap(e.sqlstate, kode, q)
                catat(f"ERROR:  {e.diag.message_primary}")
                catat(f"   -- SQLSTATE {e.sqlstate}")
    tulis("migrasi.txt", "expand, migrate, contract dengan app versi lama di setiap langkah")
    return v1


KOREKSI_M4 = ("Pembayaran Budi ke Warung Ani, Jumat minggu 3 pukul 12.15, gagal di tengah; "
              "saldo terpotong tanpa baris transaksi (M4)")


def cek_cache(harus):
    r = subprocess.run([str(BIN), "-cek-cache"], env=dict(ENV, DATABASE_URL=DB_APP), capture_output=True, text=True)
    catat("$ ./api-t2 -cek-cache   # job malam")
    catat(r.stdout.rstrip())
    catat(f"# exit status {r.returncode}")
    harap(r.returncode, harus, "exit cek cache")


# ---------- topup.txt ----------

def rekam_topup():
    mulai(BIN, tampil="# server: ./api-t2")
    admin = login("admin.tunjangan@lestari.example", "sementara-400", "admin")
    nomor = [n for (n,) in sql("SELECT nomor_karyawan FROM akun WHERE jenis = 'karyawan' ORDER BY id", tampil=False)]
    harap(len(nomor), 1000, "jumlah karyawan kampus")
    bagian("A. Senin minggu 1 Tahap 2: satu file HR, 1.000 akun x Rp250.000, satu transaction")
    csv = "nomor_karyawan,nominal\n" + "".join(f"{n},250000\n" for n in nomor)
    sebelum = sql("SELECT count(*) AS jurnal, (SELECT saldo_cache FROM buku WHERE jenis = 'tunjangan') AS tunjangan"
                  " FROM jurnal")
    s, isi = curl("POST", "/topup?keterangan=Tunjangan%20makan%20minggu%201%20Tahap%202", csv, admin, "text/csv",
                  tampil_body="nomor_karyawan,nominal\\nK00401,250000\\n ... (1.000 baris)")
    harap((s, j(isi)), (200, {"akun": 1000, "total": 250000000}), "top-up 1.000 akun")
    sql("SELECT count(DISTINCT j.id) AS jurnal_topup, sum(p.jumlah) FILTER (WHERE p.jumlah > 0) AS masuk,"
        " sum(p.jumlah) AS jumlah_posting FROM jurnal j JOIN posting p ON p.jurnal_id = j.id WHERE j.jenis = 'topup'")
    sql("SELECT b.jenis, a.nama, b.saldo_cache FROM buku b LEFT JOIN akun a ON a.id = b.akun_id"
        " WHERE b.jenis = 'tunjangan' OR b.akun_id IN (419, 504) ORDER BY b.id")
    bagian("B. File dengan satu baris salah (baris 735 memakai titik ribuan): seluruh file ditolak")
    salah = csv.split("\n")
    salah[734] = salah[734].replace(",250000", ",250.000")
    sebelum = sql("SELECT count(*) AS jurnal, (SELECT saldo_cache FROM buku WHERE jenis = 'tunjangan') AS tunjangan"
                  " FROM jurnal")
    s, isi = curl("POST", "/topup?keterangan=Tunjangan%20makan%20minggu%202%20Tahap%202", "\n".join(salah), admin,
                  "text/csv", tampil_body=f"nomor_karyawan,nominal\\n ... \\n{salah[734]}\\n ... (1.000 baris)")
    harap((s, j(isi)["errors"]), (422, [{"baris": 735, "field": "nominal", "pesan": "harus angka rupiah tanpa titik"}]),
          "baris 735")
    sesudah = sql("SELECT count(*) AS jurnal, (SELECT saldo_cache FROM buku WHERE jenis = 'tunjangan') AS tunjangan"
                  " FROM jurnal")
    harap(sesudah, sebelum, "tidak ada jurnal dari file yang ditolak")
    bagian("C. Nomor yang sama dua kali dan nomor tidak terdaftar")
    s, isi = curl("POST", "/topup?keterangan=Tunjangan%20makan%20minggu%202%20Tahap%202",
                  "nomor_karyawan,nominal\nK00419,250000\nK00504,250000\nK00419,250000\nK09999,250000\n", admin, "text/csv")
    harap((s, [e["baris"] for e in j(isi)["errors"]]), (422, [4, 5]), "duplikat dan tidak terdaftar")
    bagian("D. File lebih dari 1 MiB ditolak utuh, bukan dipotong (keputusan 418)")
    besar = "nomor_karyawan,nominal\n" + "".join(f"{n},{'0' * 1040}250000\n" for n in nomor)
    harap(len(besar) > (1 << 20), True, "file lebih dari 1 MiB")
    ukuran = f"{len(besar):,}".replace(",", ".")
    catat(f"# 1.000 baris sah, nominal Rp250.000 ditulis dengan 1.040 nol di depan: {ukuran} byte")
    sebelum = sql("SELECT count(*) AS jurnal FROM jurnal", tampil=False)
    s, isi = curl("POST", "/topup?keterangan=Tunjangan%20makan%20minggu%202%20Tahap%202", besar, admin, "text/csv",
                  tampil_body=f"nomor_karyawan,nominal\\nK00401,000...000250000\\n ... (1.000 baris, {ukuran} byte)")
    harap((s, j(isi)["type"]), (413, "/problems/file-terlalu-besar"), "file terlalu besar")
    harap(sql("SELECT count(*) AS jurnal FROM jurnal", tampil=False), sebelum, "tidak ada jurnal dari file terlalu besar")
    catat("\n# Karyawan mencoba top-up")
    budi = login("budi@lestari.example", "sementara-419", "Budi")
    harap(curl("POST", "/topup?keterangan=coba", "nomor_karyawan,nominal\nK00419,1000\n", budi, "text/csv")[0], 403,
          "karyawan top-up")
    tulis("topup.txt", "top-up CSV 1.000 akun dalam satu transaction")


# ---------- transfer.txt ----------

def kirim(token, nomor, nominal, tampil=True):
    s, isi = curl("POST", "/kiriman", {"ke_nomor_karyawan": nomor, "nominal": nominal}, token, tampil=tampil)
    return s, j(isi)


def rekam_transfer():
    mulai(BIN, tampil="# server: ./api-t2")
    # Akun kampus wajib mengganti password sementara sebelum mendapat token (keputusan 647).
    for akun, email in ((504, "citra"), (600, "karyawan600"), (700, "karyawan700")):
        harap(ganti_password(f"{email}@lestari.example", f"sementara-{akun}", password_kampus(akun))[0], 204,
              f"ganti password {email}")
    catat("# Citra, Karyawan 600, dan Karyawan 700 (akun kampus) sudah mengganti password sementara (POST /ganti-password)")
    budi = login("budi@lestari.example", "sementara-419", "Budi")
    citra = login("citra@lestari.example", password_kampus(504), "Citra")
    bagian("A. Budi mengirim Rp20.000 ke Citra lewat nomor karyawan (app 2.0)")
    s, h = kirim(budi, "K00504", 20000)
    harap((s, h["saldo"], h["sisa_batas_harian"]), (201, 410000, 480000), "kiriman Budi ke Citra")
    sql(f"SELECT p.jurnal_id, j.jenis, b.jenis AS buku, a.nama, p.jumlah FROM posting p JOIN jurnal j ON j.id = p.jurnal_id"
        f" JOIN buku b ON b.id = p.buku_id JOIN akun a ON a.id = b.akun_id WHERE p.jurnal_id = {h['id']} ORDER BY p.id")
    curl("GET", f"/transfers/{h['id']}", token=citra)
    bagian("B. Permintaan yang ditolak sebelum uang berpindah")
    harap(kirim(budi, "K09999", 20000)[0], 422, "nomor tidak terdaftar")
    harap(kirim(budi, "K00419", 20000)[0], 422, "nomor sendiri")
    harap(kirim(budi, "K00504", 0)[0], 422, "nominal 0")
    s, _ = curl("POST", "/kiriman", {"ke_nomor_karyawan": "K00504", "jumlah": 20000}, budi)
    harap(s, 400, "field jumlah di endpoint baru")
    bagian("C. Batas Rp500.000 per hari, dihitung dari jurnal transfer keluar sejak 00.00 WIB")
    harap(kirim(budi, "K00504", 400000)[1].get("sisa_batas_harian"), 80000, "Budi 420.000 hari ini")
    s, isi = curl("POST", "/kiriman", {"ke_nomor_karyawan": "K00419", "nominal": 800000}, citra)
    harap((s, j(isi)["type"]), (422, "/problems/batas-harian"), "Citra Rp800.000 (angka M14)")
    harap(kirim(citra, "K00419", 500000)[1].get("sisa_batas_harian"), 0, "tepat batas")
    s, isi = curl("POST", "/kiriman", {"ke_nomor_karyawan": "K00419", "nominal": 1}, citra)
    harap((s, j(isi)["type"]), (422, "/problems/batas-harian"), "lewat batas Rp1")
    sql("SELECT a.nama, b.saldo_cache, b.batas_harian FROM buku b JOIN akun a ON a.id = b.akun_id"
        " WHERE b.akun_id IN (419, 504) ORDER BY a.id")
    catat("\n# Bayar ke warung tidak dihitung batas kiriman: Budi bayar Rp25.000 ke Warung Ani (app 2.0, nominal)")
    s, isi = curl("POST", "/transfers", {"ke": 418, "nominal": 25000}, budi)
    harap((s, j(isi)["saldo"]), (201, 485000), "bayar Budi")
    s, isi = curl("POST", "/kiriman", {"ke_nomor_karyawan": "K00504", "nominal": 80000}, budi)
    harap((s, j(isi)["sisa_batas_harian"]), (201, 0), "Budi sisa batas sesudah bayar")
    bagian("D. Saldo tidak cukup")
    catat("# Karyawan 600 (akun kampus baru) hanya punya top-up minggu 1 Tahap 2: Rp250.000")
    k600 = login("karyawan600@lestari.example", password_kampus(600), "Karyawan 600")
    s, isi = curl("POST", "/kiriman", {"ke_nomor_karyawan": "K00504", "nominal": 300000}, k600)
    harap((s, j(isi)["type"]), (422, "/problems/saldo-kurang"), "saldo kurang")
    bagian("E. Sepuluh kiriman Rp20.000 bersamaan dari saldo Rp100.000: buku dikunci, tidak ada saldo negatif")
    k700 = login("karyawan700@lestari.example", password_kampus(700), "Karyawan 700")
    harap(kirim(k700, "K00701", 150000)[0], 201, "Karyawan 700 menyisakan Rp100.000")
    hasil = []
    def satu_kirim():
        hasil.append(kirim(k700, "K00701", 20000, tampil=False))
    utas = [threading.Thread(target=satu_kirim) for _ in range(10)]
    catat("# 10 thread, masing-masing: POST /kiriman {\"ke_nomor_karyawan\": \"K00701\", \"nominal\": 20000}")
    for u in utas:
        u.start()
    for u in utas:
        u.join()
    ringkas = sorted((s, h.get("type", "")) for s, h in hasil)
    for (s, t) in sorted(set(ringkas)):
        catat(f"{ringkas.count((s, t))} x HTTP {s} {t}".rstrip())
    harap(ringkas, [(201, "")] * 5 + [(422, "/problems/saldo-kurang")] * 5, "kiriman bersamaan")
    sql("SELECT b.saldo_cache, (SELECT sum(jumlah) FROM posting p WHERE p.buku_id = b.id) AS jumlah_posting"
        " FROM buku b WHERE b.akun_id = 700")
    harap(satu("SELECT saldo_cache FROM buku WHERE akun_id = 700"), 0, "saldo 700")
    tulis("transfer.txt", "transfer antar karyawan, batas harian, lock buku")


# ---------- pembalik.txt ----------

def rekam_pembalik():
    mulai(BIN, tampil="# server: ./api-t2")
    budi = login("budi@lestari.example", "sementara-419", "Budi")
    admin = login("admin.tunjangan@lestari.example", "sementara-400", "admin")
    bagian("A. Budi salah bayar Rp15.000 ke Warung Sari")
    s, isi = curl("POST", "/transfers", {"ke": 502, "nominal": 15000}, budi)
    harap(s, 201, "salah bayar")
    asal = j(isi)["id"]
    bagian("B. Admin membalik jurnal itu dengan alasan; jurnal asal tidak diubah")
    s, isi = curl("POST", f"/jurnal/{asal}/pembalik",
                  {"alasan": "Budi salah memilih warung, uang dikembalikan atas konfirmasi Warung Sari"}, admin)
    harap(s, 201, "pembalik")
    balik = j(isi)["id"]
    sql(f"SELECT j.id, j.jenis, j.membalik_jurnal_id, b.jenis AS buku, a.nama, p.jumlah FROM jurnal j"
        f" JOIN posting p ON p.jurnal_id = j.id JOIN buku b ON b.id = p.buku_id JOIN akun a ON a.id = b.akun_id"
        f" WHERE j.id IN ({asal}, {balik}) ORDER BY p.id")
    bagian("C. Yang ditolak: dibalik dua kali, alasan pendek, bukan admin, koreksi gaya Tahap 1")
    harap(curl("POST", f"/jurnal/{asal}/pembalik", {"alasan": "Budi salah memilih warung, dibalik lagi"}, admin)[0],
          409, "dua kali")
    harap(curl("POST", f"/jurnal/{asal - 1}/pembalik", {"alasan": "salah"}, admin)[0], 422, "alasan pendek")
    harap(curl("POST", f"/jurnal/{asal}/pembalik", {"alasan": "saya ingin uang saya kembali sekarang"}, budi)[0],
          403, "bukan admin")
    harap(curl("POST", "/koreksi", {"akun": 419, "jumlah": 15000, "alasan": "koreksi saldo tangan seperti Tahap 1"},
               admin)[0], 410, "koreksi")
    tulis("pembalik.txt", "koreksi sebagai jurnal pembalik")


# ---------- riwayat.txt ----------

def rekam_riwayat():
    mulai(BIN, tampil="# server: ./api-t2")
    budi = login("budi@lestari.example", "sementara-419", "Budi")
    dimas = login("dimas@lestari.example", "sementara-417", "Dimas")
    bagian("A. Halaman pertama, tiga baris per halaman (app 2.0)")
    s, isi = curl("GET", "/akun/419/riwayat?batas=3", token=budi)
    h1 = j(isi)
    bagian("B. Sebelum Budi menggulir, Dimas mengirim Rp5.000 ke Budi")
    harap(kirim(dimas, "K00419", 5000)[0], 201, "Dimas ke Budi")
    bagian("C. Halaman kedua dan ketiga dari kursor: tidak ada baris ganda, tidak ada yang terlewat")
    halaman = [h1]
    while halaman[-1]["berikutnya"] and len(halaman) < 3:
        s, isi = curl("GET", f"/akun/419/riwayat?batas=3&kursor={halaman[-1]['berikutnya']}", token=budi)
        halaman.append(j(isi))
    id_kursor = [(r["id"], r["jenis"]) for h in halaman for r in h["riwayat"]]
    harap(len(id_kursor), len(set(id_kursor)), "baris ganda")
    catat("\n# Pembanding: OFFSET 3 sesudah kiriman Dimas (cara M12) mengulang baris terakhir halaman pertama")
    sql("""SELECT p.jurnal_id, j.jenis, p.jumlah FROM posting p JOIN jurnal j ON j.id = p.jurnal_id
WHERE p.buku_id = (SELECT id FROM buku WHERE akun_id = 419) ORDER BY p.dibuat DESC, p.id DESC LIMIT 3 OFFSET 3""")
    ulang = sql("SELECT p.jurnal_id FROM posting p WHERE p.buku_id = (SELECT id FROM buku WHERE akun_id = 419)"
                " ORDER BY p.dibuat DESC, p.id DESC LIMIT 1 OFFSET 3", tampil=False)[0][0]
    harap(ulang, h1["riwayat"][-1]["id"], "OFFSET mengulang baris")
    bagian("D. App 1.0 tanpa kursor: 20 baris pertama, field lama tetap ada")
    s, isi = curl("GET", "/akun/419/riwayat", token=budi, tampil=False)
    r = j(isi)
    catat("$ curl -i -X GET '/akun/419/riwayat' -H 'Authorization: Bearer <token sesi Budi>'   # body diringkas")
    catat(f"HTTP/1.1 {s} · {len(r['riwayat'])} baris · field baris pertama: {', '.join(r['riwayat'][0])}"
          f" · berikutnya: {samarkan(json.dumps(r['berikutnya']))}")
    harap(len(r["riwayat"]) <= 20 and "jumlah" in r["riwayat"][0], True, "kontrak app 1.0")
    bagian("E. Kursor yang bukan dari server")
    harap(curl("GET", "/akun/419/riwayat?kursor=halaman-2", token=budi)[0], 422, "kursor rusak")
    tulis("riwayat.txt", "riwayat dengan kursor (dibuat, id)")


# ---------- tutup-buku.txt ----------

def rekam_tutup_buku():
    bulan = satu("SELECT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM')")
    samaran[bulan] = "<bulan ini>"
    mulai(BIN, tampil="# server: ./api-t2")
    admin = login("admin.tunjangan@lestari.example", "sementara-400", "admin")
    budi = login("budi@lestari.example", "sementara-419", "Budi")

    def laporan(judul):
        s, isi = curl("GET", f"/tutup-buku?periode={bulan}", token=admin, tampil=False)
        harap(s, 200, judul)
        r = j(isi)
        catat(f"$ curl -i -X GET '/tutup-buku?periode=<bulan ini>' -H 'Authorization: Bearer <token sesi admin>'"
              f"   # body {len(r['buku'])} buku, diringkas run.py")
        catat("HTTP/1.1 200 OK")
        tidak_cocok = [b for b in r["buku"] if b["saldo_awal"] + b["masuk"] - b["keluar"] != b["saldo_akhir"]
                       or b["saldo_akhir"] != b["saldo_cache"]]
        catat(f"buku: {len(r['buku'])}, awal + masuk - keluar = akhir = saldo_cache: {len(r['buku']) - len(tidak_cocok)},"
              f" tidak cocok: {len(tidak_cocok)}")
        catat("sistem: " + json.dumps(r["sistem"]))
        per = {}
        for b in r["buku"]:
            x = per.setdefault(b["jenis"], [0, 0, 0, 0, 0])
            for i, k in enumerate(("saldo_awal", "masuk", "keluar", "saldo_akhir")):
                x[i] += b[k]
            x[4] += 1
        for l in b3.tabel(["jenis", "buku", "saldo_awal", "masuk", "keluar", "saldo_akhir"],
                          [[k, v[4], v[0], v[1], v[2], v[3]] for k, v in sorted(per.items())]):
            catat(l)
        nama = {b.get("nama", ""): b for b in r["buku"]}
        for l in b3.tabel(["nama", "saldo_awal", "masuk", "keluar", "saldo_akhir", "saldo_cache"],
                          [[n, nama[n]["saldo_awal"], nama[n]["masuk"], nama[n]["keluar"], nama[n]["saldo_akhir"],
                            nama[n]["saldo_cache"]] for n in ("Budi", "Citra", "Warung Ani", "Warung Sari")]):
            catat(l)
        harap((len(tidak_cocok), r["sistem"]["jurnal_tidak_seimbang"], r["sistem"]["jumlah_semua_posting"],
               r["sistem"]["jumlah_semua_saldo_akhir"]), (0, 0, 0, 0), judul)
        return r

    bagian("A. Tutup buku bulan berjalan (PRD v2, P0): per buku dan seluruh sistem, dari posting")
    catat("# Seluruh lab berjalan di bulan ini, jadi saldo awal 0 dan jurnal pembuka migrasi masuk sebagai mutasi")
    r1 = laporan("tutup buku")
    bagian("B. Yang ditolak")
    harap(curl("GET", f"/tutup-buku?periode={bulan}", token=budi)[0], 403, "karyawan")
    harap(curl("GET", "/tutup-buku?periode=Oktober", token=admin)[0], 422, "periode")
    bagian("C. Jurnal yang COMMIT sesudah laporan bisa membawa waktu sebelum laporan (keputusan 407)")
    catat("# Transaction [A] menulis jurnal top-up lalu belum COMMIT; laporan dibuat; lalu [A] COMMIT")
    a = sambung(autocommit=False)
    a.execute("BEGIN")
    jid = a.execute("INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('topup', 'Top-up susulan', 400)"
                    " RETURNING id").fetchone()[0]
    a.execute(f"INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES ({jid}, (SELECT id FROM buku WHERE jenis ="
              f" 'tunjangan'), -1000), ({jid}, (SELECT id FROM buku WHERE akun_id = 419), 1000)")
    a.execute(b3.PERBARUI_CACHE.format(j=jid))
    catat("[A] => BEGIN; INSERT INTO jurnal ... ('topup', 'Top-up susulan', 400); INSERT INTO posting ... (-1000, +1000);"
          " UPDATE buku ... saldo_cache;")
    time.sleep(0.05)
    t_laporan = satu("SELECT now()")
    harap(satu(f"SELECT count(*) FROM jurnal WHERE id = {jid}"), 0, "jurnal [A] belum terlihat")
    r2 = laporan("laporan sebelum A commit")
    a.commit()
    a.close()
    catat("[A] => COMMIT;")
    with sambung() as c:
        n = c.execute("SELECT count(*) FROM jurnal WHERE dibuat < %s", (t_laporan,)).fetchone()[0]
        dibuat_dulu = c.execute("SELECT dibuat < %s FROM jurnal WHERE id = %s", (t_laporan, jid)).fetchone()[0]
    catat("=> SELECT count(*) FROM jurnal WHERE dibuat < <waktu laporan>;   -- sesudah [A] COMMIT")
    catat(f"jurnal: {n} (laporan menghitung {r2['sistem']['jurnal']}); jurnal [A] dibuat sebelum laporan: "
          f"{'t' if dibuat_dulu else 'f'}")
    harap((n, dibuat_dulu), (r2["sistem"]["jurnal"] + 1, True), "jurnal terlambat")
    catat("# dibuat = now() = awal transaction [A]. Laporan untuk periode yang sudah ditutup bisa berubah sesudahnya")
    catat("# bila ada transaction yang terbuka saat penutupan; tutup buku perlu menunggu transaction itu (lihat KEPUTUSAN 415).")
    laporan("laporan sesudah A commit")
    harap(r1["sistem"]["jurnal"], r2["sistem"]["jurnal"], "A tidak mengubah laporan pertama")
    tulis("tutup-buku.txt", "tutup buku bulanan dan jurnal yang terlambat COMMIT")


# ---------- pengaman.txt ----------

JAM = {}   # waktu beku untuk server -jam-lab: diset sekali per run, dipakai lagi sesudah server dimulai ulang


def mulai_beku(tampil):
    """Server dengan jam beku (flag -jam-lab, keputusan 649): bucket tidak terisi di tengah rekaman."""
    mulai(BIN, args=("-jam-lab",), tampil=tampil)
    JAM.setdefault("ms", int(time.time() * 1000))
    harap(curl("POST", "/lab/jam", {"ms": JAM["ms"]}, tampil=False)[0], 204, "jam lab")


def ringkas(hasil, apa):
    """Baris ringkas untuk percobaan berulang: '<n> x HTTP <status> <type>   # <apa>'."""
    jenis = [(st, j(isi).get("type", "")) for st, isi in hasil]
    for st, t in sorted(set(jenis)):
        catat(f"{jenis.count((st, t))} x HTTP {st} {t}   # {apa}")


def rekam_pengaman():
    """lab-api-t2a (keputusan 645-649): pengaman cek penerima dan login, M16 minggu 7."""
    gedung_a = ("SELECT CASE WHEN id < 504 THEN 'Gedung A' ELSE 'kampus' END AS kelompok, count(*) AS akun,\n"
                "       count(*) FILTER (WHERE wajib_ganti_password) AS wajib_ganti\n"
                "FROM akun WHERE jenis <> 'sistem' GROUP BY 1 ORDER BY 1")
    bagian("A. Minggu 7 (M16): 104 akun Gedung A wajib mengganti password sementara")
    catat("# Akun kampus ditandai saat didaftarkan; tiga di antaranya sudah mengganti password di transfer.txt")
    harap(sql(gedung_a), [("Gedung A", 104, 0), ("kampus", 909, 906)], "akun wajib ganti sebelum 000014")
    migrasi("000014_wajib_ganti_password.up.sql")
    harap(sql(gedung_a), [("Gedung A", 104, 104), ("kampus", 909, 906)], "akun wajib ganti sesudah 000014")

    mulai_beku("\n# server: ./api-t2 -jam-lab (waktu server dibekukan selama rekaman ini, keputusan 649)")
    bagian("B. Password sementara tidak lagi membuka sesi")
    catat("# Sesi Budi dari tutup-buku.txt dibuka sebelum migration 000014")
    harap(curl("GET", "/akun/419", token=TOKEN["Budi"])[0], 401, "sesi lama Budi")
    s, isi = curl("POST", "/login", {"email": "budi@lestari.example", "password": "sementara-419"})
    harap((s, j(isi)["type"]), (403, "/problems/wajib-ganti-password"), "login password sementara")
    s, isi = ganti_password("budi@lestari.example", "sementara-419", "budi-pendek", tampil=True)
    harap((s, isi.get("type")), (422, "/problems/validasi"), "password baru 11 karakter")
    harap(ganti_password("budi@lestari.example", "sementara-419", "kalimat panjang milik budi", tampil=True)[0],
          204, "ganti password Budi")
    budi = login("budi@lestari.example", "kalimat panjang milik budi", "Budi")
    harap(curl("GET", "/akun/419", token=budi)[0], 200, "sesi baru Budi")
    catat("\n# Dimas mengganti password sementaranya dengan cara yang sama (tidak ditampilkan)")
    harap(ganti_password("dimas@lestari.example", "sementara-417", "kalimat panjang milik dimas")[0], 204, "Dimas")
    dimas = login("dimas@lestari.example", "kalimat panjang milik dimas", "Dimas")
    citra = login("citra@lestari.example", password_kampus(504), "Citra")

    bagian("C. Cek penerima: percobaan yang gagal tidak membedakan nomor terdaftar")
    catat("# K00504 milik Citra; K09999 tidak terdaftar. Aturan pengirim diperiksa sebelum nomor penerima.")
    s1, isi1 = curl("POST", "/kiriman", {"ke_nomor_karyawan": "K00504", "nominal": 600000}, dimas)
    s2, isi2 = curl("POST", "/kiriman", {"ke_nomor_karyawan": "K09999", "nominal": 600000}, dimas)
    harap((s1, j(isi1)["type"], isi1 == isi2), (422, "/problems/batas-harian", True), "batas: jawaban sama")
    lewat = satu("SELECT saldo_cache FROM buku WHERE akun_id = 417") + 1
    harap(lewat <= 400000, True, "nominal saldo kurang masih di bawah sisa batas")
    rupiah = f"{lewat:,}".replace(",", ".")
    catat(f"\n# Nominal Rp{rupiah} (saldo Dimas + Rp1), tidak melewati batas harian:")
    hasil = [curl("POST", "/kiriman", {"ke_nomor_karyawan": n, "nominal": lewat}, dimas, tampil=False)
             for n in ("K00504", "K09999")]
    for n, (st, isi) in zip(("K00504", "K09999"), hasil):
        catat(f"POST /kiriman ke {n}: HTTP {st} {j(isi)['type']}")
    harap((hasil[0][0], j(hasil[0][1])["type"], hasil[0][1] == hasil[1][1]), (422, "/problems/saldo-kurang", True),
          "saldo kurang: jawaban sama")
    catat("\n# Nomor salah tetap dilaporkan bila kirimannya akan berhasil ke nomor terdaftar:")
    s, isi = curl("POST", "/kiriman", {"ke_nomor_karyawan": "K09999", "nominal": 5000}, dimas)
    harap((s, j(isi)["errors"][0]["pesan"]), (422, "tidak terdaftar"), "salah ketik nomor")
    catat("\n# Satu-satunya jawaban yang membuka nomor terdaftar adalah kiriman yang berhasil:")
    catat("# uangnya berpindah, dan nama pengirim tercatat di jurnal yang juga dilihat penerima.")
    s, isi = curl("POST", "/kiriman", {"ke_nomor_karyawan": "K00504", "nominal": 1}, dimas)
    harap(s, 201, "kiriman Rp1")
    sql(f"SELECT jenis, keterangan, dibuat_oleh FROM jurnal WHERE id = {j(isi)['id']}")

    stop(tampil="\n# server dimulai ulang: bucket di memori kosong lagi")
    mulai_beku(None)
    bagian("D. Rate limit kiriman: 15 per akun, 30 per IP")
    catat("# Dimas menelusuri nomor karyawan berikutnya dengan nominal di atas batas (tidak ada uang yang berpindah)")
    hasil = [curl("POST", "/kiriman", {"ke_nomor_karyawan": f"K{n:05d}", "nominal": 600000}, dimas, tampil=False)
             for n in range(520, 535)]
    ringkas(hasil, "Dimas, 15 nomor K00520-K00534")
    harap(sorted({(st, j(isi)["type"]) for st, isi in hasil}), [(422, "/problems/batas-harian")], "15 pertama")
    s, isi = curl("POST", "/kiriman", {"ke_nomor_karyawan": "K00535", "nominal": 600000}, dimas)
    harap((s, j(isi)["type"]), (429, "/problems/rate-limit-akun"), "kiriman ke-16 Dimas")
    catat("\n# Akun lain dari alamat yang sama: Budi 14 kiriman, lalu Citra")
    hasil = [curl("POST", "/kiriman", {"ke_nomor_karyawan": f"K{n:05d}", "nominal": 600000}, budi, tampil=False)
             for n in range(540, 554)]
    ringkas(hasil, "Budi, 14 nomor K00540-K00553")
    harap(sorted({st for st, _ in hasil}), [422], "14 kiriman Budi")
    s, isi = curl("POST", "/kiriman", {"ke_nomor_karyawan": "K00419", "nominal": 600000}, citra)
    harap((s, j(isi)["type"]), (429, "/problems/rate-limit-ip"), "kiriman ke-31 dari satu IP")
    catat("\n# X-Forwarded-For dari client tidak dipercaya: Tahap 2 tanpa reverse proxy, IP diambil dari koneksi")
    s, isi = curl("POST", "/kiriman", {"ke_nomor_karyawan": "K00419", "nominal": 600000}, citra,
                  kepala=("X-Forwarded-For: 203.0.113.7",))
    harap((s, j(isi)["type"]), (429, "/problems/rate-limit-ip"), "X-Forwarded-For palsu")

    stop(tampil="\n# server dimulai ulang: bucket di memori kosong lagi")
    mulai_beku(None)
    bagian("E. Akun terkunci dijawab sama dengan password salah")
    catat("# Seseorang menebak password Warung Ani (akun 418)")
    tebak = [curl("POST", "/login", {"email": "warung.ani@lestari.example", "password": f"tebakan-{i}"},
                  tampil=(i == 1)) for i in range(1, 6)]
    ringkas(tebak, "lima tebakan")
    harap(sorted({st for st, _ in tebak}), [401], "lima tebakan")
    s, isi = curl("POST", "/login", {"email": "warung.ani@lestari.example", "password": "tebakan-6"})
    harap((s, j(isi)["type"]), (429, "/problems/rate-limit-akun"), "tebakan keenam")
    sql("SELECT id, gagal_login, terkunci_sampai IS NOT NULL AS terkunci FROM akun WHERE id = 418")
    stop(tampil="\n# server dimulai ulang (mis. deploy): bucket di memori kosong, kunci di database tetap")
    mulai_beku(None)
    catat("# Ani login dengan password yang benar selama akunnya terkunci:")
    s, isi = curl("POST", "/login", {"email": "warung.ani@lestari.example", "password": "sementara-418"})
    harap((s, isi), (401, tebak[0][1]), "terkunci: jawaban sama dengan password salah")
    catat("# Body sama persis dengan tebakan pertama, jadi penebak tidak tahu akun ini terkunci.")

    bagian("F. Satu alamat mencoba banyak akun (credential stuffing): 10 percobaan per IP")
    catat("# Percobaan Ani di atas adalah yang pertama dari alamat ini sejak server dimulai ulang")
    hasil = [curl("POST", "/login", {"email": f"karyawan{n}@lestari.example", "password": "password-bocor-situs-lain"},
                  tampil=False) for n in range(430, 439)]
    ringkas(hasil, "9 akun, karyawan430-karyawan438, satu percobaan per akun")
    harap(sorted({st for st, _ in hasil}), [401], "9 akun")
    s, isi = curl("POST", "/login", {"email": "karyawan439@lestari.example", "password": "password-bocor-situs-lain"},
                  kepala=("X-Forwarded-For: 203.0.113.8",))
    harap((s, j(isi)["type"]), (429, "/problems/rate-limit-ip"), "percobaan ke-11 dari satu IP")
    sql("SELECT count(*) FILTER (WHERE gagal_login > 0) AS akun_dengan_gagal,\n"
        "       count(*) FILTER (WHERE terkunci_sampai IS NOT NULL) AS terkunci FROM akun")
    tulis("pengaman.txt", "pengaman cek penerima dan login (M16, lab-api-t2a)")


# ---------- testing.txt ----------

def go_test(*args, env):
    r = subprocess.run(["go", "test", *args], cwd=HERE, env=env, capture_output=True, text=True)
    teks = (r.stdout + r.stderr).replace("\t", "  ")
    teks = re.sub(r" \(\d+\.\d+s\)", "", teks)
    teks = re.sub(r"^(ok|FAIL)(\s+\S+)\s+[\d.]+s", r"\1\2", teks, flags=re.M)
    teks = re.sub(r"^(ok\s+\S+)\s+\(cached\)", r"\1", teks, flags=re.M)
    return r.returncode, teks.rstrip()


def buat_schema_tes():
    """Skema akhir Tahap 2 tanpa data: file yang sama dengan langkah 0 sampai 3, di schema tahap2_tes."""
    v1 = (T1 / "schema.sql").read_text()
    with sambung("public") as c:
        c.execute(re.sub(r"\btahap1\b", TES, v1))
    with sambung(TES, autocommit=False) as c:
        c.execute((HERE.parent / "b4-migration/baru/000005_batas_saldo_warung.up.sql").read_text())
        for f in sorted((HERE / "migrasi").glob("*.up.sql")):
            c.execute(f.read_text())
        c.commit()


def rekam_testing():
    buat_schema_tes()
    bagian("A. Tes aturan uang dengan PostgreSQL sungguhan (schema tahap2_tes, skema akhir Tahap 2)")
    rc, teks = go_test("-v", "-count=1", "-p", "1", "./...", env=dict(ENV, TEST_DATABASE_URL=DB_TES))
    catat("$ TEST_DATABASE_URL=<schema tahap2_tes> go test -v -count=1 -p 1 ./...")
    catat(teks)
    catat(f"# exit status {rc}")
    harap(rc, 0, "go test")
    harap("--- SKIP" in teks, False, "tes dilewati")
    bagian("B. Tanpa TEST_DATABASE_URL: tes database dilewati, tes tanpa database tetap jalan")
    rc, teks = go_test("-count=1", "./...", env={k: v for k, v in ENV.items() if k != "TEST_DATABASE_URL"})
    catat("$ go test -count=1 ./...")
    catat(teks)
    catat(f"# exit status {rc}")
    harap(rc, 0, "go test tanpa database")
    tulis("testing.txt", "tes Go untuk aturan uang")


# ---------- main ----------

def main():
    subprocess.run(["go", "build", "-o", str(BIN), "./cmd/api"], cwd=HERE, check=True)
    try:
        with tempfile.TemporaryDirectory() as tmp:
            rekam_migrasi(pathlib.Path(tmp))
        rekam_topup()
        rekam_transfer()
        rekam_pembalik()
        rekam_riwayat()
        rekam_tutup_buku()
        rekam_pengaman()
        rekam_testing()
    finally:
        for port in list(server):   # error Python di tengah rekaman: server tidak tertinggal memegang port
            stop(port)


if __name__ == "__main__":
    main()
