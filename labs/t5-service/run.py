"""Rekam lab t5-service: mTLS antar service, daftar jenis jurnal per identitas, dan OpenTelemetry Collector (M47, ADR 53, ADR 58).

Server, skema, dan data awal adalah milik `labs/api-t5` (`dasar_t5.py`, `cmd/`, `internal/`), bukan salinan. Yang baru di lab ini
ada di api-t5 sebagai kode bersama: `cmd/ledger` (ledger sebagai proses sendiri, role database t5_ledger, mode rentan
`ledger-tanpa-identitas`), `cmd/layanan` (pembayaran dan notifikasi sebagai pemanggil), `cmd/panggil` dan `cmd/pki` (alat lab),
dan paket `internal/identitas`, `internal/pki`, `internal/jejak`. Di folder ini: `docker-compose.yml` dan `otelcol.yaml` (Collector),
`run.py`, dan rekaman. Setiap bagian membuat ulang schema dari nol, jadi output/*.txt tidak bergantung pada urutan bagian dan
rekaman ulang identik per byte (make cek). Sertifikat dan kunci dibuat saat dijalankan di folder sementara di luar repo.
ID trace berurutan (`-lab-id-urut`, hanya lab) supaya jumlah trace yang dipilih sampling berbasis hash bisa diulang tepat.
Pihak ketiga tidak ada selain Collector di container. Lab gagal keras bila hasil meleset.

    make -C labs/t5-service run                     (butuh: Docker, Go; PostgreSQL lewat labs/b3-race)
    make -C labs/t5-service run BAGIAN=mtls         (satu bagian: mtls rentan idempoten jejak testing)
"""
import json, os, pathlib, re, shutil, subprocess, sys, tempfile, threading, time, urllib.error, urllib.request

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "api-t5"))
import dasar_t5 as d  # noqa: E402
from dasar_t5 import bagian, catat, gagal, harap  # noqa: E402
from lab_env import PROYEK, port_lab  # noqa: E402

LAB = "t5-service"
SCHEMA = "tahap5_service"
SP = ",".join(d.SCHEMA_LAYANAN)           # search_path pemilik schema sesudah dipecah
NAMA_PROYEK = f"{PROYEK}-{LAB}" if PROYEK else LAB   # proyek compose sendiri: `down` tidak menyentuh PostgreSQL dan Redis lajur
d.OUT = HERE / "output"

DASAR_LEDGER, DASAR_PEMBAYARAN, DASAR_NOTIFIKASI, DASAR_OTLP, DASAR_METRIK = 18320, 18321, 18322, 18323, 18324
PORT_LEDGER, PORT_PEMBAYARAN, PORT_NOTIFIKASI = port_lab(DASAR_LEDGER), port_lab(DASAR_PEMBAYARAN), port_lab(DASAR_NOTIFIKASI)
PORT_OTLP, PORT_METRIK = port_lab(DASAR_OTLP), port_lab(DASAR_METRIK)
NAMA_SERVER = "ledger.t5.lab"
IMAGE_COLLECTOR = "otel/opentelemetry-collector-contrib:0.163.2"

KERJA = pathlib.Path(tempfile.mkdtemp(prefix="t5-service-"))   # biner, sertifikat, dan kunci: di luar repo, dihapus di akhir
BIN = {n: KERJA / "bin" / n for n in ("ledger", "layanan", "panggil", "pki")}
PKI = KERJA / "pki"
JEJAK = KERJA / "jejak"
AKUN = {"budi": 100001, "uji": 100002, "kartu": 100003}   # akun karyawan data lab


def versi_go():
    go = subprocess.run(["go", "version"], cwd=d.HERE, capture_output=True, text=True).stdout.split()
    return go[2] if len(go) > 2 else "go?"


d.versi_alat = versi_go   # kepala rekaman memakai toolchain yang membangun biner (go.mod api-t5 memilihnya)

_jurnal = {}


def mask(teks):
    """Nomor jurnal diberi label menurut kemunculan pertama di bagian ini, supaya rekaman tidak bergantung pada urutan sequence."""
    def ganti(m):
        _jurnal.setdefault(m.group(2), f"<jurnal {len(_jurnal) + 1}>")
        return m.group(1) + _jurnal[m.group(2)] + m.group(3)
    return re.sub(r'(jurnal=|"jurnal":)(\d+)(\b)', ganti, teks)


def tampil(teks=""):
    catat(mask(d.samarkan(teks)))


def bangun():
    (KERJA / "bin").mkdir()
    for n in BIN:
        subprocess.run(["go", "build", "-o", str(BIN[n]), f"./cmd/{n}"], cwd=d.HERE, check=True)


def bersihkan():
    for port in list(d.server):
        d.stop(port)
    subprocess.run(["docker", "compose", "-p", NAMA_PROYEK, "down", "-v", "--remove-orphans"], cwd=HERE, capture_output=True, text=True,
                   env=dict(d.ENV, JEJAK_DIR=str(JEJAK)))
    shutil.rmtree(KERJA, ignore_errors=True)


# ---------- database ----------

def siapkan_db():
    """Schema bersih, tiga akun karyawan data lab, lalu enam schema service dengan role per service."""
    d.buat_schema(SCHEMA)
    with d.sambung(SCHEMA) as c:
        for nama, id_ in AKUN.items():
            c.execute("INSERT INTO akun (id, jenis, nama, email, password_hash, nomor_karyawan, tingkat) VALUES (%s, 'karyawan', %s, %s, '!', %s, 'terverifikasi')",
                      (id_, f"Lab {nama}", f"{nama}@lestari.example", f"L{id_}"))
            c.execute("INSERT INTO buku (akun_id, jenis, batas_harian) VALUES (%s, 'karyawan', 500000)", (id_,))
    d.pecah_layanan(SCHEMA)


def dsn_ledger():
    # Role t5_ledger, bukan t5_app. search_path memuat t5_akun karena SQL ledger membaca akun.tingkat dan akun.status tanpa awalan.
    return f"postgres://t5_ledger:t5_ledger@127.0.0.1:{d.DB_PORT}/lab?search_path=t5_ledger,t5_akun&application_name=t5-service-ledger"


def sql_pemilik(q, arg=None):
    with d.sambung(SP) as c:
        return c.execute(q, arg).fetchall()


def jumlah_jurnal(jenis=None):
    q = "SELECT count(*) FROM jurnal" + (" WHERE jenis = %s" if jenis else "")
    return sql_pemilik(q, (jenis,) if jenis else None)[0][0]


def tampil_sql(q, arg=None):
    """Perintah SQL sebagai pemilik schema, dicatat seperti psql."""
    with d.sambung(SP) as c:
        cur = c.execute(q, arg)
        kolom = [x.name for x in cur.description]
        baris = cur.fetchall()
    tampil("=> " + " ".join(q.split()))
    for b in d.tabel(kolom, baris):
        tampil(b)
    return baris


# ---------- proses ----------

def mulai_proses(biner, port, args, db=None, nama=None):
    """Seperti dasar_t5.mulai, tetapi siap ditentukan dari baris log "mendengar di", bukan dari sambungan TCP: sambungan TCP
    tanpa handshake dicatat server TLS sebagai galat handshake dan akan masuk rekaman."""
    d.port_bebas(port)
    f = tempfile.TemporaryFile(mode="a+")
    p = subprocess.Popen([str(biner), "-addr", f"127.0.0.1:{port}", *args], env=dict(d.ENV, DATABASE_URL=db or ""), stdout=f, stderr=f, text=True)
    d.server[port] = (p, f)

    def siap():
        if p.poll() is not None:
            f.seek(0)
            gagal(f"{nama or biner.name} berhenti: {f.read()[-400:]}")
        f.flush()
        f.seek(0)
        return "mendengar di" in f.read()
    d.tunggu(siap, f"{nama or biner.name} mendengar di port {port}")


def args_tls_ledger():
    return ["-tls-cert", str(PKI / "ledger.pem"), "-tls-key", str(PKI / "ledger.key"), "-tls-ca", str(PKI / "ca.pem")]


def args_tls_klien(nama):
    return ["-tls-cert", str(PKI / f"{nama}.pem"), "-tls-key", str(PKI / f"{nama}.key"), "-tls-ca", str(PKI / "ca.pem")]


def mulai_ledger(rentan=False, otlp=False):
    args = ["-lab"]
    if rentan:
        args += ["-rentan", "ledger-tanpa-identitas"]
    else:
        args += args_tls_ledger()
    if otlp:
        args += ["-otlp", f"127.0.0.1:{PORT_OTLP}", "-lab-id-urut"]
    mulai_proses(BIN["ledger"], PORT_LEDGER, args, db=dsn_ledger(), nama="ledger")


def mulai_layanan(peran, otlp=False):
    port = PORT_PEMBAYARAN if peran == "pembayaran" else PORT_NOTIFIKASI
    args = ["-peran", peran, "-ledger", f"https://127.0.0.1:{PORT_LEDGER}", *args_tls_klien(peran)]
    if otlp:
        args += ["-otlp", f"127.0.0.1:{PORT_OTLP}", "-lab-id-urut"]
    mulai_proses(BIN["layanan"], port, args, nama=peran)


def buat_sertifikat(tampilkan=True):
    PKI.mkdir(exist_ok=True)
    r = subprocess.run([str(BIN["pki"]), "-dir", str(PKI)], capture_output=True, text=True)
    harap(r.returncode, 0, "pki: " + r.stderr[-300:])
    if tampilkan:
        tampil("$ pki -dir <folder sementara di luar repo>   # kunci privat berizin 0600, tidak masuk repo")
        for l in r.stdout.splitlines():
            tampil(l)


def log_ledger_hingga(n_baris, apa):
    """Log ledger (tanpa baris 'mendengar di') setelah paling sedikit n_baris baris tercatat: menunggu kejadian, bukan jeda tetap."""
    d.tunggu(lambda: len(d.log_server(PORT_LEDGER)) >= n_baris, apa)
    return d.log_server(PORT_LEDGER)


def panggil(*args):
    r = subprocess.run([str(BIN["panggil"]), *args], capture_output=True, text=True)
    return (r.stdout.strip() or r.stderr.strip()), r.returncode


def sonde(cert):
    a = ["-sonde", "-url", f"https://127.0.0.1:{PORT_LEDGER}", "-ca", str(PKI / "ca.pem")]
    if cert:
        a += ["-cert", str(PKI / f"{cert}.pem"), "-key", str(PKI / f"{cert}.key")]
    teks, _ = panggil(*a)
    return teks


def badan_topup(key, akun, jumlah):
    return json.dumps({"order_id": key, "akun_id": akun, "jumlah": jumlah}, separators=(",", ":"))


def klien_ke_ledger(cert, jalan, key, badan, kepala=()):
    """`panggil` sebagai service dengan sertifikat `cert` ('' = tanpa sertifikat). Mengembalikan baris hasil."""
    a = ["-url", f"https://127.0.0.1:{PORT_LEDGER}{jalan}", "-ca", str(PKI / "ca.pem"), "-idempotency-key", key, "-badan", badan]
    if cert:
        a += ["-cert", str(PKI / f"{cert}.pem"), "-key", str(PKI / f"{cert}.key")]
    for h in kepala:
        a += ["-header", h]
    return panggil(*a)[0]


def lewat_layanan(port, jalur, key, akun, jumlah):
    """POST /lab/ke-ledger di service pemanggil: status dan isi JSON jawaban ledger yang diteruskan."""
    badan = json.dumps({"jalur": jalur, "key": key, "akun_id": akun, "jumlah": jumlah}).encode()
    req = urllib.request.Request(f"http://127.0.0.1:{port}/lab/ke-ledger", data=badan, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            return res.status, res.read().decode().strip()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode().strip()


def catat_layanan(peran, jalur, key, akun, jumlah):
    port = PORT_PEMBAYARAN if peran == "pembayaran" else PORT_NOTIFIKASI
    s, isi = lewat_layanan(port, jalur, key, akun, jumlah)
    tampil(f"$ {peran} -> ledger  jalur={jalur} Idempotency-Key={key} akun={akun} jumlah={jumlah}")
    tampil(f"status {s} {isi}")
    return s, isi


# ---------- bagian A: mTLS dan izin per jenis jurnal ----------

def rekam_mtls():
    siapkan_db()
    bagian("A. Sertifikat yang dibuat lab, dan ledger sebagai proses sendiri dengan role database sendiri")
    buat_sertifikat()
    mulai_ledger()
    mulai_layanan("pembayaran")
    mulai_layanan("notifikasi")
    tampil("$ ledger -tls-cert ledger.pem -tls-key ledger.key -tls-ca ca.pem   # DATABASE_URL: role t5_ledger, search_path t5_ledger,t5_akun")
    tampil("$ layanan -peran pembayaran ...   # sertifikat pembayaran; tidak membuka database")
    tampil("$ layanan -peran notifikasi ...   # sertifikat notifikasi; tidak membuka database")
    # Role yang dipakai proses ledger dibaca dari pg_stat_activity, bukan dari kode lab.
    tampil("$ panggil -url https://127.0.0.1:<port>/healthz -cert pembayaran   # membuka koneksi database ledger")
    sehat, _ = panggil("-url", f"https://127.0.0.1:{PORT_LEDGER}/healthz", "-ca", str(PKI / "ca.pem"), "-cert", str(PKI / "pembayaran.pem"), "-key", str(PKI / "pembayaran.key"))
    tampil(sehat)
    harap(sehat, 'status 200 {"status":"ok"}', "healthz ledger")
    tampil_sql("SELECT usename, count(*) AS koneksi FROM pg_stat_activity WHERE application_name = 't5-service-ledger' GROUP BY usename")
    tampil_sql("SELECT has_table_privilege('t5_ledger', 't5_ledger.jurnal', 'INSERT') AS jurnal_insert, "
               "has_table_privilege('t5_ledger', 't5_akun.sesi', 'SELECT') AS sesi_select, "
               "has_table_privilege('t5_ledger', 't5_notifikasi.perangkat', 'SELECT') AS perangkat_select")
    sebelum = jumlah_jurnal()
    tampil_sql("SELECT count(*) AS jurnal_sebelum FROM jurnal")

    bagian("B. Sertifikat yang salah ditolak saat handshake: server mengirim alert, handler tidak jalan, tidak ada jurnal")
    kasus = [("", "tanpa sertifikat klien"), ("dari-ca-lain", "dari CA lain"), ("kedaluwarsa", "kedaluwarsa"),
             ("hanya-server", "hanya untuk server (EKU serverAuth)")]
    hasil = {}
    for cert, uraian in kasus:
        tampil(f"$ panggil -sonde -cert {cert or '(tanpa)'}   # {uraian}")
        hasil[cert] = sonde(cert)
        tampil(hasil[cert])
    harap(hasil[""], "sonde: alert dari server: tls: certificate required", "tanpa sertifikat")
    harap(hasil["dari-ca-lain"], "sonde: alert dari server: tls: unknown certificate authority", "dari CA lain")
    harap(hasil["kedaluwarsa"], "sonde: alert dari server: tls: expired certificate", "kedaluwarsa")
    harap(hasil["hanya-server"], "sonde: alert dari server: tls: bad certificate", "hanya server")
    tampil("$ panggil -sonde -cert pembayaran   # kontrol positif: sertifikat sah")
    tampil(sonde("pembayaran"))
    harap(sonde("pembayaran"), "sonde: diterima", "kontrol positif")
    # Empat galat handshake di sisi server: ditunggu sampai tercatat, lalu dibaca dari log ledger.
    baris = [l for l in log_ledger_hingga(4, "empat galat handshake di log ledger") if "TLS handshake error" in l]
    harap(len(baris), 4, "galat handshake di log ledger")
    tampil("$ log ledger, baris galat handshake (urutan sama dengan sonde di atas)")
    for l in baris:
        tampil(re.sub(r"^http: TLS handshake error from ", "handshake ditolak dari ", l))
    harap(jumlah_jurnal(), sebelum, "jurnal sesudah handshake yang ditolak")
    tampil_sql("SELECT count(*) AS jurnal_sesudah FROM jurnal")

    bagian("C. Sertifikat sah, izin per jenis jurnal: pembayaran boleh topup_bank dan kartu_tahan, notifikasi dan cicilan tidak boleh topup_bank")
    s, _ = catat_layanan("pembayaran", "topup", "TB-LAB-0001", AKUN["budi"], 200000)
    harap(s, 201, "pembayaran topup")
    s, _ = catat_layanan("pembayaran", "kartu-tahan", "AUTH-LAB-0001", AKUN["budi"], 50000)
    harap(s, 201, "pembayaran kartu-tahan")
    n = jumlah_jurnal()
    s, isi = catat_layanan("notifikasi", "topup", "TB-LAB-0002", AKUN["uji"], 1000)
    harap((s, "jenis-tidak-diizinkan" in isi), (403, True), "notifikasi")
    tampil("$ panggil dengan sertifikat cicilan -> POST /ledger/jurnal-topup   # cicilan boleh angsuran dan tabungan, bukan topup_bank")
    r_cicilan = klien_ke_ledger("cicilan", "/ledger/jurnal-topup", "TB-LAB-0003", badan_topup("TB-LAB-0003", AKUN["uji"], 1000))
    tampil(r_cicilan)
    harap("status 403" in r_cicilan, True, "cicilan")
    harap(jumlah_jurnal(), n, "jurnal sesudah dua 403")
    tampil_sql("SELECT j.jenis, count(*) AS jurnal FROM jurnal j WHERE j.keterangan LIKE 'Top-up bank TB-LAB-%' OR j.keterangan LIKE '%AUTH-LAB-%' GROUP BY j.jenis ORDER BY j.jenis")
    tampil_sql("SELECT a.nama, b.saldo_cache AS saldo FROM akun a JOIN buku b ON b.akun_id = a.id WHERE a.id IN (100001, 100002) ORDER BY a.id")

    bagian("D. Identitas hanya dari SAN sertifikat yang lolos verifikasi: bukan dari CN, bukan dari header")
    tampil("$ panggil dengan sertifikat tanpa-san (rantai sah, tanpa SAN) -> POST /ledger/jurnal-topup")
    r1 = klien_ke_ledger("tanpa-san", "/ledger/jurnal-topup", "TB-LAB-0004", badan_topup("TB-LAB-0004", AKUN["uji"], 1000))
    tampil(r1)
    harap("status 401" in r1, True, "tanpa SAN")
    tampil("$ panggil dengan sertifikat cn-menyesatkan (CN pembayaran, SAN notifikasi) -> POST /ledger/jurnal-topup")
    r2 = klien_ke_ledger("cn-menyesatkan", "/ledger/jurnal-topup", "TB-LAB-0005", badan_topup("TB-LAB-0005", AKUN["uji"], 1000))
    tampil(r2)
    harap(("status 403" in r2, '"identitas":"notifikasi"' in r2), (True, True), "CN menyesatkan")
    tampil("$ panggil dengan sertifikat notifikasi dan header X-Layanan-Nama: pembayaran")
    r3 = klien_ke_ledger("notifikasi", "/ledger/jurnal-topup", "TB-LAB-0006", badan_topup("TB-LAB-0006", AKUN["uji"], 1000),
                         ["X-Layanan-Nama: pembayaran", "X-Identitas: pembayaran"])
    tampil(r3)
    harap("status 403" in r3, True, "header yang mengaku pembayaran")
    harap(jumlah_jurnal(), n, "jurnal sesudah tiga penolakan identitas")
    tampil_sql("SELECT count(*) AS jurnal_berjenis_topup_bank_atas_nama_akun_uji FROM jurnal j JOIN posting p ON p.jurnal_id = j.id JOIN buku b ON b.id = p.buku_id WHERE j.jenis = 'topup_bank' AND b.akun_id = 100002")

    bagian("E. Keputusan identitas di log ledger (urutan sama dengan panggilan di atas, sesudah baris handshake)")
    keputusan = [l for l in d.log_server(PORT_LEDGER) if l.startswith(("identitas:", "ledger:"))]
    for l in keputusan:
        tampil(l)
    harap(len(keputusan), 9, "baris keputusan di log ledger: 2 jurnal, 7 penolakan atau keputusan")
    d.stop(PORT_PEMBAYARAN)
    d.stop(PORT_NOTIFIKASI)
    d.stop(PORT_LEDGER)
    d.tulis("mtls.txt", "mTLS antar service dan izin jenis jurnal per identitas", lab=LAB, schema=SCHEMA, dasar=DASAR_LEDGER)


# ---------- bagian B: mode rentan ----------

def rekam_rentan():
    siapkan_db()
    bagian("A. Mode rentan ledger-tanpa-identitas (versi pertama): HTTP biasa, tanpa sertifikat, tanpa daftar jenis jurnal")
    buat_sertifikat(tampilkan=False)
    mulai_ledger(rentan=True)
    tampil("$ ledger -rentan ledger-tanpa-identitas   # role database t5_ledger, tanpa TLS")
    tampil_sql("SELECT count(*) AS jurnal_sebelum FROM jurnal")
    key = "TB-UJI-0001"
    tampil("$ panggil dari pod uji, tanpa sertifikat, tanpa identitas -> POST /ledger/jurnal-topup, Idempotency-Key baru")
    teks, _ = panggil("-url", f"http://127.0.0.1:{PORT_LEDGER}/ledger/jurnal-topup", "-idempotency-key", key, "-badan", badan_topup(key, AKUN["uji"], 1000))
    tampil(teks)
    harap(teks.startswith("status 201"), True, "mode rentan membuat jurnal")
    tampil_sql("SELECT j.jenis, j.keterangan, b.akun_id, p.jumlah FROM jurnal j JOIN posting p ON p.jurnal_id = j.id JOIN buku b ON b.id = p.buku_id "
               "WHERE j.keterangan = 'Top-up bank TB-UJI-0001' ORDER BY p.jumlah")
    tampil_sql("SELECT a.nama, b.saldo_cache AS saldo FROM akun a JOIN buku b ON b.akun_id = a.id WHERE a.id = 100002")
    ada = d.stop(PORT_LEDGER)
    for l in ada:
        tampil(l)

    bagian("B. Versi benar di port yang sama: pod uji yang sama ditolak")
    mulai_ledger()
    key2 = "TB-UJI-0002"
    tampil("$ panggil http (tanpa TLS) ke ledger mTLS")
    teks, _ = panggil("-url", f"http://127.0.0.1:{PORT_LEDGER}/ledger/jurnal-topup", "-idempotency-key", key2, "-badan", badan_topup(key2, AKUN["uji"], 1000))
    tampil(teks)
    harap(teks.startswith("status 400"), True, "HTTP biasa ke port TLS")
    tampil("$ panggil -sonde tanpa sertifikat ke ledger mTLS")
    tampil(sonde(""))
    harap(sonde(""), "sonde: alert dari server: tls: certificate required", "pod uji tanpa sertifikat")
    harap(jumlah_jurnal(), 1, "hanya satu jurnal (dari mode rentan)")
    tampil_sql("SELECT count(*) AS jurnal_untuk_key_kedua FROM jurnal WHERE keterangan = 'Top-up bank TB-UJI-0002'")
    d.stop(PORT_LEDGER)
    d.tulis("rentan.txt", "mode rentan ledger tanpa identitas (M47) lawan versi mTLS", lab=LAB, schema=SCHEMA, dasar=DASAR_LEDGER)


# ---------- bagian C: Idempotency-Key lintas service ----------

def rekam_idempoten():
    siapkan_db()
    buat_sertifikat(tampilkan=False)
    mulai_ledger()
    mulai_layanan("pembayaran")
    bagian("A. Permintaan yang sama dikirim dua kali lewat service pembayaran: satu jurnal")
    s1, i1 = catat_layanan("pembayaran", "topup", "TB-LAB-1001", AKUN["budi"], 200000)
    s2, i2 = catat_layanan("pembayaran", "topup", "TB-LAB-1001", AKUN["budi"], 200000)
    harap((s1, s2), (201, 200), "dua panggilan berurutan")
    harap(json.loads(i1)["jurnal"], json.loads(i2)["jurnal"], "jurnal yang sama")
    tampil_sql("SELECT count(*) AS jurnal_untuk_key FROM jurnal WHERE keterangan = 'Top-up bank TB-LAB-1001'")
    tampil_sql("SELECT b.saldo_cache AS saldo FROM buku b WHERE b.akun_id = 100001")

    bagian("B. Dua permintaan yang sama dikirim serentak: tetap satu jurnal")
    hasil, gerbang = [], threading.Barrier(2)

    def kirim():
        gerbang.wait()
        hasil.append(lewat_layanan(PORT_PEMBAYARAN, "topup", "TB-LAB-1002", AKUN["budi"], 200000))
    ts = [threading.Thread(target=kirim, daemon=True) for _ in range(2)]
    for t in ts:
        t.start()
    for t in ts:
        t.join(timeout=15)
    harap(len(hasil), 2, "dua jawaban serentak")
    tampil("$ dua panggilan serentak ke pembayaran, key TB-LAB-1002; status diurutkan karena siapa yang lebih dulu tidak ditentukan")
    tampil("status " + " dan ".join(str(x) for x in sorted(s for s, _ in hasil)))
    harap(sorted(s for s, _ in hasil), [200, 201], "status serentak")
    harap(len({json.loads(i)["jurnal"] for _, i in hasil}), 1, "satu jurnal untuk dua jawaban")
    tampil_sql("SELECT count(*) AS jurnal_untuk_key FROM jurnal WHERE keterangan = 'Top-up bank TB-LAB-1002'")

    bagian("C. Key baru (ledger mewajibkan order_id sama dengan key) dengan akun dan jumlah yang sama adalah permintaan lain; key yang sama dengan jumlah berbeda ditolak")
    s3, _ = catat_layanan("pembayaran", "topup", "TB-LAB-1003", AKUN["budi"], 200000)
    harap(s3, 201, "key baru")
    s4, i4 = catat_layanan("pembayaran", "topup", "TB-LAB-1003", AKUN["budi"], 300000)
    harap((s4, "key-dipakai-permintaan-lain" in i4), (422, True), "key sama isi beda")
    tampil_sql("SELECT count(DISTINCT j.id) AS jurnal_topup_bank, sum(p.jumlah) FILTER (WHERE p.jumlah > 0) AS total_kredit FROM jurnal j JOIN posting p ON p.jurnal_id = j.id WHERE j.jenis = 'topup_bank'")
    for port in (PORT_PEMBAYARAN, PORT_LEDGER):
        d.stop(port)
    d.tulis("idempoten.txt", "permintaan yang sama lewat service pembayaran menghasilkan satu jurnal", lab=LAB, schema=SCHEMA, dasar=DASAR_LEDGER)


# ---------- bagian D: traceparent dan OpenTelemetry Collector ----------

def kompose(*args):
    r = subprocess.run(["docker", "compose", "-p", NAMA_PROYEK, *args], cwd=HERE, capture_output=True, text=True,
                       env=dict(d.ENV, JEJAK_DIR=str(JEJAK), LAB_OTLP_PORT=str(PORT_OTLP), LAB_OTEL_METRIK_PORT=str(PORT_METRIK)))
    if r.returncode != 0:
        gagal(f"docker compose {' '.join(args)}: {r.stderr[-500:]}")
    return r


def metrik():
    with urllib.request.urlopen(f"http://127.0.0.1:{PORT_METRIK}/metrics", timeout=5) as res:
        return res.read().decode()


def nilai_metrik(teks, nama, label=""):
    """Jumlah semua deret metrik `nama` yang labelnya memuat `label` (teks eksposisi Prometheus)."""
    total = 0.0
    for l in teks.splitlines():
        if l.startswith(nama + "{") or l.startswith(nama + " "):
            if label in l:
                total += float(l.rsplit(" ", 1)[1])
    return total


def baca_span():
    """Semua span yang disimpan Collector (satu objek OTLP JSON per baris berkas)."""
    berkas = JEJAK / "jejak.json"
    if not berkas.exists():
        return []
    hasil = []
    for baris in berkas.read_text().splitlines():
        if not baris.strip():
            continue
        try:
            objek = json.loads(baris)
        except json.JSONDecodeError:
            continue   # baris terakhir sedang ditulis Collector; terbaca utuh pada pemeriksaan berikutnya
        for rs in objek.get("resourceSpans", []):
            nama = next((a["value"]["stringValue"] for a in rs["resource"].get("attributes", []) if a["key"] == "service.name"), "?")
            for ss in rs.get("scopeSpans", []):
                for sp in ss.get("spans", []):
                    hasil.append({"service": nama, "trace": sp["traceId"], "id": sp["spanId"], "induk": sp.get("parentSpanId", ""),
                                  "nama": sp["name"], "kind": sp.get("kind"), "galat": sp.get("status", {}).get("code") in (2, "STATUS_CODE_ERROR")})
    return hasil


KIND = {1: "internal", 2: "server", 3: "client"}
N_NORMAL, N_GALAT = 200, 10   # trace normal (pembayaran) dan berkesalahan (notifikasi) di bagian B jejak


def rekam_jejak():
    siapkan_db()
    buat_sertifikat(tampilkan=False)
    JEJAK.mkdir(exist_ok=True)
    JEJAK.chmod(0o777)   # Collector berjalan sebagai pengguna non-root dan menulis ke folder ini
    r = subprocess.run(["docker", "run", "--rm", IMAGE_COLLECTOR, "--version"], capture_output=True, text=True)
    versi_col = r.stdout.strip() or r.stderr.strip()
    otel_go = re.search(r"go.opentelemetry.io/otel v([\d.]+)", (d.HERE / "go.mod").read_text()).group(1)
    ukuran = subprocess.run(["docker", "image", "inspect", IMAGE_COLLECTOR, "--format", "{{.Size}}"], capture_output=True, text=True).stdout.strip()
    catat(f"# Collector: image {IMAGE_COLLECTOR} (`{versi_col}`, distribusi contrib, {int(ukuran) // 1_000_000} MB ukuran konten image menurut `docker image inspect`); OpenTelemetry Go v{otel_go}; propagator W3C Trace Context")
    kompose("up", "-d")
    d.tunggu(lambda: _bisa(metrik), "Collector siap menjawab metrik", batas=60)
    mulai_ledger(otlp=True)
    mulai_layanan("pembayaran", otlp=True)
    mulai_layanan("notifikasi", otlp=True)

    bagian("A. Satu permintaan notifikasi yang ditolak ledger (403): traceparent merambat dari notifikasi ke ledger")
    s, isi = catat_layanan("notifikasi", "topup", "TB-LAB-2001", AKUN["uji"], 1000)
    harap(s, 403, "satu permintaan notifikasi")
    d.tunggu(lambda: len({sp["id"] for sp in baca_span()}) >= 3, "tiga span trace pertama di berkas Collector", batas=30)
    spans = baca_span()
    harap(len({sp["trace"] for sp in spans}), 1, "satu trace")
    tampil("# Span yang disimpan Collector untuk permintaan itu (induk dulu, lalu anak; trace berkesalahan selalu disimpan)")
    by_id = {sp["id"]: sp for sp in spans}
    akar = [sp for sp in spans if sp["induk"] not in by_id]
    harap(len(akar), 1, "satu span akar")
    urut = []

    def jalan(sp, tingkat):
        urut.append((tingkat, sp))
        for a in sorted((x for x in spans if x["induk"] == sp["id"]), key=lambda x: x["nama"]):
            jalan(a, tingkat + 1)
    jalan(akar[0], 0)
    for tingkat, sp in urut:
        tampil("  " * tingkat + f"{sp['service']:<11} {KIND.get(sp['kind'], '?'):<7} {sp['nama']}" + ("   [status Error]" if sp["galat"] else ""))
    server_ledger = next(sp for sp in spans if sp["service"] == "ledger")
    client_pemanggil = next(sp for sp in spans if sp["service"] == "notifikasi" and sp["kind"] == 3)
    harap(server_ledger["induk"], client_pemanggil["id"], "induk span ledger = span client notifikasi")
    tampil(f"induk span server ledger adalah span client notifikasi: {server_ledger['induk'] == client_pemanggil['id']}")
    tampil(f"satu trace id di tiga span dan dua service: {len({sp['trace'] for sp in spans}) == 1} ({len({sp['service'] for sp in spans})} service)")
    harap(client_pemanggil["galat"], True, "span client berstatus Error karena 403")

    bagian(f"B. {1 + N_GALAT + N_NORMAL} trace: {1 + N_GALAT} berkesalahan (notifikasi ditolak ledger, 403; satu dari bagian A) dan {N_NORMAL} normal (pembayaran, top-up Rp1.000)")
    for i in range(N_NORMAL):
        s, _ = lewat_layanan(PORT_PEMBAYARAN, "topup", f"TB-LAB-3{i:04d}", AKUN["budi"], 1000)
        harap(s, 201, f"top-up normal {i}")
    for i in range(N_GALAT):
        s, _ = lewat_layanan(PORT_NOTIFIKASI, "topup", f"TB-LAB-4{i:03d}", AKUN["uji"], 1000)
        harap(s, 403, f"notifikasi {i}")
    total = 1 + N_GALAT + N_NORMAL   # trace bagian A (1) + bagian ini
    baru = lambda: nilai_metrik(metrik(), "otelcol_processor_tail_sampling_new_trace_id_received")
    d.tunggu(lambda: baru() >= total, f"Collector menerima {total} trace", batas=60)
    putus = lambda t: nilai_metrik(t, "otelcol_processor_tail_sampling_global_count_traces_sampled", 'sampled="true"') + \
        nilai_metrik(t, "otelcol_processor_tail_sampling_global_count_traces_sampled", 'sampled="false"')
    d.tunggu(lambda: putus(metrik()) >= total, f"tail sampling memutuskan {total} trace", batas=60)
    teks_metrik = metrik()
    simpan = nilai_metrik(teks_metrik, "otelcol_processor_tail_sampling_global_count_traces_sampled", 'sampled="true"')
    buang = nilai_metrik(teks_metrik, "otelcol_processor_tail_sampling_global_count_traces_sampled", 'sampled="false"')
    # Berkas ditulis sesudah keputusan; tunggu sampai jumlah trace di berkas sama dengan yang diputuskan disimpan.
    d.tunggu(lambda: len({sp["trace"] for sp in baca_span()}) >= simpan, "berkas memuat semua trace yang disimpan", batas=30)
    spans = baca_span()
    per_trace = {}
    for sp in spans:
        per_trace.setdefault(sp["trace"], []).append(sp)
    galat = [t for t, ss in per_trace.items() if any(x["galat"] for x in ss)]
    tampil(f"trace diterima Collector      : {int(nilai_metrik(teks_metrik, 'otelcol_processor_tail_sampling_new_trace_id_received'))}")
    tampil(f"diputuskan disimpan / dibuang  : {int(simpan)} / {int(buang)}")
    tampil(f"trace di berkas                : {len(per_trace)} ({len(galat)} berkesalahan, {len(per_trace) - len(galat)} normal)")
    harap(len(galat), 1 + N_GALAT, "semua trace berkesalahan tersimpan")
    normal = len(per_trace) - len(galat)
    harap(simpan + buang, total, "disimpan + dibuang = diterima")
    harap(len(per_trace), int(simpan), "trace di berkas = diputuskan disimpan")
    tampil(f"trace normal disimpan          : {normal} dari {N_NORMAL}; kebijakan probabilistik 5 persen")
    harap(0 < normal < N_NORMAL, True, "sebagian trace normal dibuang")
    harap(normal <= N_NORMAL // 4, True, "trace normal yang disimpan tidak jauh di atas 5 persen")
    tampil(f"trace berkesalahan tersimpan   : {len(galat)} dari {1 + N_GALAT}")
    tampil("setiap trace berkesalahan memuat 3 span (server notifikasi, client notifikasi, server ledger): "
           f"{all(len(per_trace[t]) == 3 for t in galat)}")
    tampil("span berkesalahan di trace itu : client notifikasi (403 dari ledger)")
    harap(all(len(per_trace[t]) == 3 for t in galat), True, "tiga span per trace berkesalahan")
    harap(all(next(x for x in per_trace[t] if x["galat"])["service"] == "notifikasi" for t in galat), True, "span berkesalahan milik notifikasi")
    # traceparent di setiap trace yang tersimpan, termasuk yang normal: span server ledger beranak span client pemanggilnya.
    ok = 0
    for t, ss in per_trace.items():
        led = [x for x in ss if x["service"] == "ledger"]
        cli = {x["id"] for x in ss if x["kind"] == 3}
        if len(led) == 1 and led[0]["induk"] in cli:
            ok += 1
    tampil(f"trace tersimpan yang span server ledger-nya beranak span client pemanggil: {ok} dari {len(per_trace)}")
    harap(ok, len(per_trace), "traceparent di semua trace tersimpan")
    tampil(f"trace normal yang tersimpan memuat span dari {sorted({x['service'] for t, ss in per_trace.items() if t not in galat for x in ss})}")
    dini = int(nilai_metrik(teks_metrik, "otelcol_processor_tail_sampling_sampling_trace_dropped_too_early"))
    tampil(f"trace dibuang sebelum waktu keputusan: {dini}")
    harap(dini, 0, "tidak ada trace dibuang terlalu dini")
    d.stop(PORT_PEMBAYARAN)
    d.stop(PORT_NOTIFIKASI)
    d.stop(PORT_LEDGER)
    kompose("down", "-v", "--remove-orphans")
    d.tulis("jejak.txt", "traceparent antar service dan tail sampling di OpenTelemetry Collector", lab=LAB, schema=SCHEMA, dasar=DASAR_LEDGER)


def _bisa(f):
    try:
        f()
        return True
    except Exception:
        return False


# ---------- bagian E: tes Go ----------

def go_test(*args, env):
    r = subprocess.run(["go", *args], cwd=d.HERE, env=env, capture_output=True, text=True)
    teks = (r.stdout + r.stderr).replace("\t", "  ")
    teks = re.sub(r" \(\d+\.\d+s\)", "", teks)
    teks = re.sub(r"^(ok|FAIL)(\s+\S+)\s+[\d.]+s", r"\1\2", teks, flags=re.M)
    teks = re.sub(r"^\d{4}/\d\d/\d\d \d\d:\d\d:\d\d(?:\.\d+)? ", "", teks, flags=re.M)
    teks = re.sub(r"127\.0\.0\.1:\d+", "127.0.0.1:<port>", teks)
    return r.returncode, teks.rstrip()


def rekam_testing():
    d.buat_schema(d.TES)
    bagian(f"A. go vet, lalu tes mTLS, identitas, dan ledger dengan PostgreSQL sungguhan (schema {d.TES})")
    rc, teks = go_test("vet", "./cmd/ledger", "./cmd/layanan", "./cmd/panggil", "./cmd/pki", "./internal/identitas", "./internal/jejak", "./internal/pki", "./internal/handler", env=d.ENV)
    catat("$ go vet ./cmd/ledger ./cmd/layanan ./cmd/panggil ./cmd/pki ./internal/identitas ./internal/jejak ./internal/pki ./internal/handler")
    catat(teks or "(tanpa temuan)")
    catat(f"# exit status {rc}")
    harap(rc, 0, "go vet")
    env = dict(d.ENV, TEST_DATABASE_URL=d.db_pemilik(d.TES, "t5-service-tes"), LAB_TES_SCHEMA=d.TES, TES_DB_WAJIB="1")
    rc, teks = go_test("test", "-v", "-count=1", "-p", "1", "./internal/identitas", "./internal/jejak", "./internal/pki", "./cmd/ledger", env=env)
    teks = "\n".join(l for l in teks.splitlines() if not l.startswith(("=== RUN", "=== PAUSE", "=== CONT")))
    catat(f"$ TEST_DATABASE_URL=<pemilik, schema {d.TES}> TES_DB_WAJIB=1 go test -v -count=1 -p 1 ./internal/identitas ./internal/jejak ./internal/pki ./cmd/ledger")
    catat(teks)
    catat(f"# exit status {rc}")
    if rc != 0:
        print(teks, file=sys.stderr)
    harap(rc, 0, "go test")
    harap("--- SKIP" in teks, False, "tes dilewati")
    d.tulis("testing.txt", "tes Go untuk mTLS, identitas, trace, dan ledger sebagai service", lab=LAB, schema=d.TES, dasar=DASAR_LEDGER)


BAGIAN = {"mtls": rekam_mtls, "rentan": rekam_rentan, "idempoten": rekam_idempoten, "jejak": rekam_jejak, "testing": rekam_testing}


def main():
    pilih = sys.argv[1:] or list(BAGIAN)
    for nama in pilih:
        if nama not in BAGIAN:
            sys.exit(f"bagian tidak dikenal: {nama} (pilih dari: {' '.join(BAGIAN)})")
    for port in (PORT_LEDGER, PORT_PEMBAYARAN, PORT_NOTIFIKASI, PORT_OTLP, PORT_METRIK):
        d.port_bebas(port)
    try:
        bangun()
        for nama in pilih:
            d.log.clear()
            _jurnal.clear()
            BAGIAN[nama]()
    finally:
        bersihkan()
    print("selesai:", ", ".join(pilih))


if __name__ == "__main__":
    main()
