"""Rekam lab t4-storage: file identitas di kolom bytea lawan penyimpanan objek, presigned URL, checksum, unduh lewat
server, dan retensi 30 hari, di atas api-t4.

Server, skema, dan data awal adalah milik `labs/api-t4` (`dasar_t4.py`, `cmd/api`), bukan salinan; lab ini menambah
skenario di atasnya, di schema sendiri (`tahap4_storage`). Penyimpanan objek adalah SeaweedFS 4.51 (docker-compose.yml),
satu container lokal tanpa kredensial nyata. Setiap bagian membuat ulang schema, data awal, dan penyimpanan dari nol,
jadi output/*.txt tidak bergantung pada urutan bagian dan rekaman ulang identik per byte (make cek). Token, tanda
tangan URL, kunci objek, waktu, dan tanggal disamarkan; angka yang bergantung mesin (waktu) hanya diperiksa sebagai
batas. Lab gagal keras bila hasil meleset dari yang diharapkan.

    make -C labs/t4-storage run                  (butuh: Docker, Go; PostgreSQL lewat labs/b3-race)
    make -C labs/t4-storage run BAGIAN=presign   (satu bagian: ukuran presign unggah unduh retensi testing)
"""
import base64, hashlib, json, math, os, pathlib, random, re, subprocess, sys, time, urllib.error, urllib.parse, urllib.request

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "api-t4"))
sys.path.insert(0, str(HERE))
import dasar_t4 as d  # noqa: E402
import s3sign  # noqa: E402
from dasar_t4 import PORT, catat, curl, gagal, harap, j  # noqa: E402
from dasar_t4 import bagian as _bagian  # noqa: E402
from lab_env import DB_PORT, PROYEK, port_lab  # noqa: E402

LAB = "t4-storage"
SCH = "tahap4_storage"
TES = "tahap4_storage_tes"
DB = d.db_app(SCH)
d.OUT = HERE / "output"           # dasar_t4.tulis menulis ke d.OUT; di sini output lab ini, bukan api-t4
DASAR_S3 = 18290
PORT_S3 = port_lab(DASAR_S3)
S3_HOST = f"127.0.0.1:{PORT_S3}"
BUCKET = "berkas"
FILE = 500_000                    # byte per file: 500 KB per file di naskah (Asumsi), KB desimal seperti "1 GB per hari"
MIB = 1 << 20
NOMOR = "1111222233334444"        # nomor identitas karangan (Ilustrasi); bukan nomor siapa pun
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")
DB_KONTAINER = f"{PROYEK or 'b3-race'}-db-1"
S3_ENV = {"OBJEK_S3_KUNCI": s3sign.AK, "OBJEK_S3_RAHASIA": s3sign.SK}   # data lab (s3.json), bukan secret

def bagian(judul):
    print(f"[{time.strftime('%H:%M:%S')}] {judul[:70]}", file=sys.stderr, flush=True)   # jejak kemajuan, tidak masuk rekaman
    _bagian(judul)


sql = lambda q, tampil=True: d.sql(q, tampil=tampil, schema=SCH)  # noqa: E731


def satu(q):
    return d.satu(q, SCH)


# ---------- penyamaran tambahan: URL bertanda tangan adalah bearer token, tidak pernah ditulis ke rekaman ----------

_samarkan_asli = d.samarkan
_kunci_urut = {}


def _ekstra(t):
    t = re.sub(r"X-Amz-Signature=[0-9a-f]{64}", "X-Amz-Signature=<tanda tangan>", t)
    t = re.sub(r"X-Amz-Date=\d{8}T\d{6}Z", "X-Amz-Date=<waktu>", t)
    t = re.sub(r"%2F\d{8}%2F", "%2F<tanggal>%2F", t)
    t = re.sub(r"127\.0\.0\.1:\d+", "127.0.0.1:<port>", t)
    t = re.sub(r"identitas/(\d+)/([0-9a-f]{32})", lambda m: f"identitas/{m.group(1)}/<kunci {_kunci_urut.setdefault(m.group(2), len(_kunci_urut) + 1)}>", t)
    t = re.sub(r"\bHost: 127\.0\.0\.1:<port>", "Host: 127.0.0.1:<port>", t)
    return t


d.samarkan = lambda t: _ekstra(_samarkan_asli(t))


# ---------- penyimpanan objek (SeaweedFS di compose) ----------

def compose(*a, cek=True):
    env = dict(os.environ, LAB_S3_PORT=str(PORT_S3))
    r = subprocess.run(["docker", "compose", *a], cwd=HERE, env=env, capture_output=True, text=True)
    if cek and r.returncode != 0:
        gagal(f"docker compose {' '.join(a)}: {r.stderr.strip()[-300:]}")
    return r


_opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def http(metode, url, isi=None, header=None):
    """(status, isi, header). Satu panggilan HTTP tanpa proxy; status 4xx dan 5xx dikembalikan, bukan dilempar."""
    req = urllib.request.Request(url, data=isi, method=metode, headers=header or {})
    try:
        with _opener.open(req, timeout=60) as r:
            return r.status, r.read(), dict(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)


def kode_s3(isi):
    m = re.search(rb"<Code>([A-Za-z]+)</Code>", isi)
    return m.group(1).decode() if m else ""


def s3(metode, kunci, isi=None, umur=300, sekarang=None, header=None, bucket=BUCKET):
    """Satu panggilan ke penyimpanan dengan URL buatan lab (kunci admin lab), terpisah dari klien Go di server."""
    u = s3sign.presign(metode, S3_HOST, f"/{bucket}/{kunci}" if kunci else f"/{bucket}", umur, sekarang, header)
    return http(metode, u, isi, header)


def tunggu_s3():
    t0 = time.time()
    while time.time() - t0 < 120:
        try:
            if s3("PUT", "", bucket=BUCKET)[0] in (200, 409):
                return
        except (urllib.error.URLError, ConnectionError, OSError):
            pass
        time.sleep(0.5)
    gagal("penyimpanan objek tidak siap dalam 120 detik")


def hangatkan():
    """Tulis dan hapus satu objek kecil: penulisan pertama ke bucket baru membuat volume dan bisa makan beberapa detik,
    lebih lama daripada umur URL pendek yang direkam bagian presign."""
    t0 = time.time()
    while time.time() - t0 < 60:
        if s3("PUT", "pemanasan", b"x")[0] == 200:
            s3("DELETE", "pemanasan")
            return
        time.sleep(0.5)
    gagal("penyimpanan objek tidak menerima penulisan pertama dalam 60 detik")


def s3_mulai(tampil=None):
    compose("rm", "-sfv", "seaweedfs", cek=False)   # penyimpanan selalu mulai dari kosong
    compose("up", "-d", "seaweedfs")
    tunggu_s3()
    hangatkan()
    if tampil:
        catat(tampil)


def s3_henti():
    compose("rm", "-sfv", "seaweedfs", cek=False)


def ukuran_objek(kunci):
    """Panjang objek lewat HEAD; None bila tidak ada."""
    s, _, h = s3("HEAD", kunci)
    if s == 404:
        return None
    harap(s, 200, f"HEAD {kunci}")
    return int(h["Content-Length"])


# ---------- data dan akun ----------

def berkas(seed, n=FILE, tanda=b""):
    """File gambar karangan (Ilustrasi): tanda tangan PNG sah, lalu byte acak berbenih tetap, jadi tipe terbaca image/png,
    isinya tidak bisa dikompres (seperti JPEG nyata), dan rekaman sama di setiap run."""
    isi = PNG + tanda + random.Random(seed).randbytes(max(0, n - len(PNG) - len(tanda)))
    return isi[:n] if n >= len(PNG) + len(tanda) else isi


def sha(b):
    return hashlib.sha256(b).hexdigest()


def ang(n):
    """Bilangan bulat dengan titik ribuan (1.000.000)."""
    return f"{n:,}".replace(",", ".")


def des(x, k=2):
    """Pecahan dengan koma desimal."""
    return f"{x:.{k}f}".replace(".", ",")


def sesi(akun, label):
    """Sesi dibuat langsung di tabel (data lab): POST /login dibatasi 10 percobaan per menit per alamat."""
    token = f"token-lab-{label.replace(' ', '-').lower()}"
    with d.sambung(SCH) as c:
        c.execute("INSERT INTO sesi (token_hash, akun_id, kedaluwarsa) VALUES (encode(sha256(%s::bytea), 'hex'), %s, now() + interval '1 hour')",
                  (token.encode(), akun))
    d.samaran[token] = f"<token sesi {label}>"
    return token


def siapkan(bytea=False):
    d.buat_schema(SCH)
    d.seed(SCH)
    if bytea:
        ddl = (HERE.parent / "api-t4/internal/objek/bytea.sql").read_text()
        with d.sambung(SCH) as c:
            c.execute(ddl)
            c.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON berkas_bytea TO api_t4")


def mulai_api(args=(), tampil=None, s3_aktif=True):
    a = ["-lab", "-push-url", f"http://127.0.0.1:{d.PORT_PUSH}", *d.args_t4(), *(["-objek-s3", f"http://{S3_HOST}", "-objek-bucket", BUCKET] if s3_aktif else []), *args]
    d.mulai(d.BIN, PORT, a, db=DB, tampil=tampil, env_lain=S3_ENV if s3_aktif else None)


def b64(b):
    return base64.b64encode(b).decode()


def panggil(metode, path, body=None, token=None, tampil=True, kepala=()):
    return curl(metode, path, body, token, tampil=tampil, kepala=kepala)


def catat_json(label, isi):
    catat(label + " " + d.samarkan(json.dumps(j(isi), ensure_ascii=False, separators=(",", ":"))))


# ---------- alur unggah (dipakai beberapa bagian) ----------

def minta(token, tampil=False, **ukuran):
    s, isi = panggil("POST", "/verifikasi/unggahan", ukuran or None, token, tampil=tampil)
    harap(s, 201, "minta URL unggah")
    return j(isi)


def unggah(u, kartu, swafoto):
    """App memegang URL dari server dan mengunggah langsung ke penyimpanan (tanpa melewati server)."""
    s1, _, _ = http("PUT", u["url_kartu"], kartu)
    s2, _, _ = http("PUT", u["url_swafoto"], swafoto)
    harap((s1, s2), (200, 200), "PUT ke penyimpanan lewat URL")


def terunggah(token, u, kartu, swafoto, tampil=False, **ubah):
    badan = {"kunci_kartu": u["kunci_kartu"], "kunci_swafoto": u["kunci_swafoto"], "checksum_kartu": sha(kartu),
             "checksum_swafoto": sha(swafoto), "nomor_identitas": NOMOR, **ubah}
    return panggil("POST", "/verifikasi/terunggah", badan, token, tampil=tampil)


def ajukan_lengkap(token, seed):
    """Satu pengajuan sampai diterima (202); mengembalikan (id, kartu, swafoto, u)."""
    u = minta(token)
    kartu, swafoto = berkas(seed), berkas(seed + 1000)
    unggah(u, kartu, swafoto)
    s, isi = terunggah(token, u, kartu, swafoto)
    harap(s, 202, "pengajuan terunggah")
    return j(isi)["id"], kartu, swafoto, u


def ada_di_penyimpanan(u):
    return ukuran_objek(u["kunci_kartu"]) is not None, ukuran_objek(u["kunci_swafoto"]) is not None


def tulis(nama, judul):
    d.tulis(nama, judul, lab=LAB, schema=SCH, dasar=18280)


# ---------- ukuran dump dan pulih ----------

def dump_ukuran(*opsi):
    """Ukuran keluaran pg_dump (byte), dihitung di container PostgreSQL tanpa menulis file."""
    r = subprocess.run(["docker", "exec", DB_KONTAINER, "sh", "-c", f"pg_dump -U lab {' '.join(opsi)} lab | wc -c"], capture_output=True, text=True)
    harap(r.returncode, 0, "pg_dump")
    return int(r.stdout.strip())


def isi_bytea(token_akun, n_awal, n_akhir):
    """Pengajuan lewat server berflag berkas-bytea (versi pertama): satu pengajuan = dua file di kolom bytea."""
    for i in range(n_awal, n_akhir):
        akun = 40003 + i
        t = sesi(akun, f"pemakai {akun}")
        s, _ = panggil("POST", "/verifikasi", {"berkas_kartu": b64(berkas(i)), "berkas_swafoto": b64(berkas(i + 1000))}, t, tampil=False)
        harap(s, 202, f"pengajuan bytea {i}")


def isi_objek(n_awal, n_akhir):
    for i in range(n_awal, n_akhir):
        akun = 40003 + i
        ajukan_lengkap(sesi(akun, f"pemakai {akun}"), i)


def rekam_ukuran():
    siapkan(bytea=True)
    catat("# Tiap pengajuan membawa dua file; satu file 500.000 byte (500 KB, Asumsi naskah). Isi file karangan (Ilustrasi): tanda tangan PNG, lalu byte acak berbenih tetap.")
    catat("# Dump: pg_dump -Fc (format custom, terkompresi) atas schema lab, dihitung di container PostgreSQL. Pulih: pg_restore ke database lain.")
    bagian("A. Versi pertama (mode rentan berkas-bytea): file di kolom bytea, satu database dengan data transaksi")
    mulai_api(["-rentan", "berkas-bytea"], tampil="# server: ./api-t4 -lab -rentan berkas-bytea (penyimpanan objek = tabel berkas_bytea)", s3_aktif=False)
    awal = dump_ukuran("-Fc", "-n", SCH)
    langkah_bytea = {}
    n_sebelum = 0
    for n in (2, 4, 8):
        isi_bytea(None, n_sebelum, n)
        n_sebelum = n
        langkah_bytea[n] = dump_ukuran("-Fc", "-n", SCH) - awal
    sql("SELECT count(*) AS baris, sum(octet_length(isi)) AS byte_isi FROM berkas_bytea")
    sql("SELECT count(*) AS pengajuan, count(*) FILTER (WHERE berkas_kartu_kunci LIKE 'identitas/%') AS kunci_di_baris FROM verifikasi")
    catat("# Selisih ukuran dump terhadap dump sebelum pengajuan pertama, dibagi byte isi file (n pengajuan x 2 file x 500.000 byte):")
    for n in (2, 4, 8):
        isi_byte = n * 2 * FILE
        rasio = langkah_bytea[n] / isi_byte
        catat(f"{n} pengajuan ({ang(isi_byte)} byte file): rasio dump/file = {des(rasio, 1)}")
        harap(0.99 <= rasio <= 1.25, True, f"rasio dump/file {n} pengajuan = {rasio:.3f}, harus 0,99 sampai 1,25")
    catat("# Rasio tetap sedikit di atas 1 pada tiap ukuran: dump membesar sebanding dengan ukuran file (batas yang diperiksa: 0,99 sampai 1,25). pg_dump menulis bytea sebagai teks heksadesimal lalu memampatkannya; byte acak tidak bisa dimampatkan lebih jauh, dan JPEG nyata sudah terkompresi.")
    teks = dump_ukuran("-Fp", "-t", f"{SCH}.berkas_bytea")
    rasio_teks = teks / (8 * 2 * FILE)
    catat(f"# Dump teks biasa (pg_dump -Fp) atas tabel berkas_bytea saja: rasio dump/file = {des(rasio_teks, 1)} (bytea ditulis sebagai heksadesimal: dua karakter per byte)")
    harap(1.95 <= rasio_teks <= 2.10, True, f"rasio dump teks {rasio_teks:.3f}")
    d.stop(PORT)

    bagian("B. Pulih: dump tabel berkas_bytea (format custom) dipulihkan ke database lain; isinya harus sama")
    r = subprocess.run(["docker", "exec", DB_KONTAINER, "sh", "-c",
                        f"dropdb -U lab --if-exists lab_pulih && createdb -U lab lab_pulih && psql -U lab -d lab_pulih -c 'CREATE SCHEMA {SCH}' && pg_dump -U lab -Fc -t {SCH}.berkas_bytea lab > /tmp/berkas.dump"
                        f" && pg_restore -U lab --no-owner --no-privileges -d lab_pulih /tmp/berkas.dump && rm -f /tmp/berkas.dump"],
                       capture_output=True, text=True, timeout=120)   # batas waktu: lewat 120 detik, lab gagal (subprocess.TimeoutExpired)
    harap(r.returncode, 0, "dump dan pulih berkas_bytea: " + r.stderr[-200:])
    r2 = subprocess.run(["docker", "exec", DB_KONTAINER, "psql", "-U", "lab", "-d", "lab_pulih", "-At", "-c",
                         f"SELECT count(*), sum(octet_length(isi)) FROM {SCH}.berkas_bytea"], capture_output=True, text=True)
    harap(r2.stdout.strip(), f"16|{16 * FILE}", "isi tabel sesudah pulih")
    catat("$ psql lab_pulih -c 'SELECT count(*), sum(octet_length(isi)) FROM berkas_bytea'")
    catat(f"{r2.stdout.strip()}   # 16 baris, 8.000.000 byte: sama dengan sebelum dump")
    subprocess.run(["docker", "exec", DB_KONTAINER, "dropdb", "-U", "lab", "lab_pulih"], capture_output=True)
    catat("# Waktu dump dan pulih tidak direkam (bergantung mesin). Hanya batasnya yang diperiksa: dump dan pulih 8 MB selesai dalam 120 detik. Waktu untuk puluhan GB tidak diukur (Tidak dijalankan).")

    bagian("C. Penyimpanan objek: file di SeaweedFS, database menyimpan kunci dan checksum")
    siapkan()
    s3_mulai("# penyimpanan objek: SeaweedFS 4.51 di container, endpoint S3 lokal, bucket privat 'berkas'")
    mulai_api(tampil="# server: ./api-t4 -lab -objek-s3 <endpoint lokal> (file lewat URL PUT bertanda tangan)")
    awal_o = dump_ukuran("-Fc", "-n", SCH)
    n_sebelum = 0
    langkah_objek = {}
    for n in (2, 4, 8):
        isi_objek(n_sebelum, n)
        n_sebelum = n
        langkah_objek[n] = dump_ukuran("-Fc", "-n", SCH) - awal_o
    kunci = [r[0] for r in sql("SELECT berkas_kartu_kunci FROM verifikasi ORDER BY id", tampil=False)] + \
            [r[0] for r in sql("SELECT berkas_swafoto_kunci FROM verifikasi ORDER BY id", tampil=False)]
    total_s3 = sum(ukuran_objek(k) for k in kunci)
    catat(f"# Di penyimpanan objek: {len(kunci)} objek, {ang(total_s3)} byte; di database: baris verifikasi dengan kunci dan checksum saja.")
    harap((len(kunci), total_s3), (16, 16 * FILE), "isi penyimpanan objek")
    sql("SELECT count(*) AS pengajuan, min(length(berkas_kartu_kunci)) AS panjang_kunci, min(length(checksum_kartu)) AS panjang_checksum FROM verifikasi")
    catat("# Selisih ukuran dump terhadap dump sebelum pengajuan pertama, dibagi byte isi file di penyimpanan:")
    for n in (2, 4, 8):
        isi_byte = n * 2 * FILE
        rasio = langkah_objek[n] / isi_byte
        catat(f"{n} pengajuan ({ang(isi_byte)} byte file di penyimpanan): rasio dump/file di bawah 0,01: {'ya' if rasio < 0.01 else 'TIDAK'}")
        harap(rasio < 0.01, True, f"rasio dump/file objek {n} pengajuan = {rasio:.5f}")
    catat("# Dump tidak membawa file. File punya salinan sendiri yang harus dicadangkan terpisah: pencadangan SeaweedFS Tidak dijalankan di lab ini.")
    baris = satu("SELECT avg(pg_column_size(v.*))::int FROM verifikasi v")
    harap(200 <= baris <= 600, True, f"ukuran baris verifikasi {baris}")
    pembulatan = math.ceil(baris / 100) * 100
    catat(f"# Ukuran satu baris verifikasi (pg_column_size) ada di antara 200 dan 600 byte; hitungan di bawah memakai {pembulatan} byte (dibulatkan ke atas).")
    d.stop(PORT)
    s3_henti()

    bagian("D. Hitungan 28 hari (Asumsi naskah: 2.000 unggahan per hari, 500 KB per file, 43,8 juta posting per tahun x 250 byte)")
    harian = 2000 * 500_000
    file28 = 28 * harian
    posting28 = 43_800_000 / 365 * 28 * 250
    baris28 = 28 * 1000 * pembulatan
    catat(f"file per hari   = 2.000 x 500 KB               = {des(harian / 1e9)} GB")
    catat(f"file 28 hari    = 28 x {des(harian / 1e9)} GB               = {des(file28 / 1e9)} GB")
    catat(f"posting 28 hari = 43,8 juta / 365 x 28 x 250 B = {des(posting28 / 1e9)} GB")
    catat(f"bagian file di bytea = {des(file28 / 1e9)} / ({des(file28 / 1e9)} + {des(posting28 / 1e9)}) = {des(file28 / (file28 + posting28) * 100, 1)}%")
    harap(round(file28 / (file28 + posting28) * 100), 97, "bagian file 28 hari")
    catat(f"baris verifikasi bila file di penyimpanan objek: 28 x 1.000 x {pembulatan} B = {des(baris28 / 1e6, 0)} MB; bagian baris di data yang dicadangkan = {des(baris28 / (baris28 + posting28) * 100, 1)}%")
    catat("# Label: Hitungan dari Asumsi naskah (laju unggahan, ukuran file, jumlah posting); bukan hasil lab. Yang diukur lab hanyalah rasio dump/file di bagian A dan C.")
    tulis("ukuran.txt", "file di bytea lawan penyimpanan objek: ukuran dump dan pulih")


# ---------- presign ----------

def ringkas_url(url):
    p = urllib.parse.urlparse(url)
    q = urllib.parse.parse_qs(p.query)
    return {"host": p.netloc, "jalur": p.path, "X-Amz-Expires": q["X-Amz-Expires"][0],
            "X-Amz-SignedHeaders": q["X-Amz-SignedHeaders"][0]}


def baris_s3(label, status, isi, harus_status, harus_kode=None):
    kode = kode_s3(isi)
    catat(f"{label}: HTTP {status}" + (f" {kode}" if kode else ""))
    harap(status, harus_status, label)
    if harus_kode is not None:
        harap(kode, harus_kode, label + " (kode penyimpanan)")


def rekam_presign():
    siapkan()
    s3_mulai("# penyimpanan objek: SeaweedFS 4.51 di container, endpoint S3 lokal, bucket privat 'berkas'")
    mulai_api(["-objek-presign-umur", "5s"], tampil="# server: ./api-t4 -lab -objek-s3 <endpoint lokal> -objek-presign-umur 5s (umur pendek supaya kedaluwarsa bisa ditunggu)")
    dina = sesi(40001, "Dina")
    kartu1, kartu2 = berkas(1, 120_000, b"PEMEGANG-PERTAMA"), berkas(2, 90_000, b"PEMEGANG-LAIN")

    bagian("A. Dina meminta URL unggah: kunci acak milik akunnya dan dua URL PUT bertanda tangan server")
    catat("$ curl -i -X POST /verifikasi/unggahan -H 'Authorization: Bearer <token sesi Dina>'")
    s, isi = panggil("POST", "/verifikasi/unggahan", None, dina, tampil=False)
    harap(s, 201, "minta URL")
    u = j(isi)
    catat("HTTP 201 (Cache-Control: no-store)")
    catat_json("badan:", isi)
    r = ringkas_url(u["url_kartu"])
    catat("# Isi URL yang bukan tanda tangan (tanda tangan, tanggal, dan kunci disamarkan):")
    for k, v in r.items():
        catat(f"  {k} = {d.samarkan(v)}")
    harap((r["X-Amz-Expires"], r["X-Amz-SignedHeaders"]), ("5", "host"), "isi URL")
    catat("# URL tidak memuat token sesi Dina atau kredensial lain. Yang menandatangani adalah server; siapa pun yang memegang URL ini memegang izinnya.")
    t_mint = time.monotonic()

    bagian("B. Pemegang pertama (app Dina) dan pemegang lain memakai URL yang sama, tanpa token Rekeningo dan tanpa kredensial penyimpanan")
    s1, _, _ = http("PUT", u["url_kartu"], kartu1)
    catat(f"PUT pertama dari app Dina, {ang(len(kartu1))} byte: HTTP {s1}")
    harap(s1, 200, "PUT pertama")
    s2, _, _ = http("PUT", u["url_kartu"], kartu2)
    catat(f"PUT kedua dari pemegang lain (proses lain, isi lain, {ang(len(kartu2))} byte): HTTP {s2}")
    harap(s2, 200, "PUT pemegang lain")
    _, isi_obj, _ = s3("GET", u["kunci_kartu"])
    catat(f"isi objek sekarang: {ang(len(isi_obj))} byte, milik pemegang lain: {'ya' if isi_obj == kartu2 else 'TIDAK'}")
    harap(isi_obj, kartu2, "PUT ke kunci yang sama menimpa")
    catat("# PUT ke kunci yang sama menimpa objek tanpa peringatan; penyimpanan tidak menyimpan versi lama.")

    bagian("C. Sesudah umur URL lewat (5 detik), PUT ditolak dan objek tidak berubah. Ditunggu dengan mengulang PUT sampai ditolak, bukan jeda tetap")
    status_akhir, isi_tolak = 200, b""
    while time.monotonic() - t_mint < 15:
        status_akhir, isi_tolak, _ = http("PUT", u["url_kartu"], kartu2)
        if status_akhir != 200:
            break
        time.sleep(0.25)
    lewat = time.monotonic() - t_mint
    catat(f"PUT sesudah umur lewat: HTTP {status_akhir} {kode_s3(isi_tolak)}")
    harap(status_akhir, 403, "PUT sesudah kedaluwarsa")
    harap(3.5 <= lewat <= 15.0, True, f"ditolak setelah {lewat:.2f} detik")
    catat("# Waktu tidak direkam; batas yang diperiksa: ditolak sesudah 3,5 sampai 15 detik sejak URL dibuat (umur 5 detik; tanggal tanda tangan dipotong ke detik, jadi batasnya bisa sampai 1 detik lebih awal).")
    _, isi_obj, _ = s3("GET", u["kunci_kartu"])
    harap(isi_obj, kartu2, "objek tidak berubah oleh PUT yang ditolak")
    catat("objek tidak berubah oleh PUT yang ditolak: ya")

    bagian("D. Jam diperankan: URL dibuat dengan tanggal penandatanganan yang digeser (jam penyimpanan tetap sungguhan)")
    from datetime import datetime, timedelta, timezone
    kini = datetime.now(timezone.utc)
    s, isi_r, _ = s3("PUT", f"identitas/0/jam-lalu", b"x", umur=300, sekarang=kini - timedelta(minutes=10))
    baris_s3("dibuat 10 menit lalu, umur 300 detik (sudah lewat 5 menit)", s, isi_r, 403, "AccessDenied")
    s, isi_r, _ = s3("PUT", f"identitas/0/jam-depan", b"x", umur=300, sekarang=kini + timedelta(minutes=30))
    baris_s3("dibuat dengan tanggal 30 menit di depan, umur 300 detik", s, isi_r, 200)
    catat("# Penyimpanan menghitung kedaluwarsa dari tanggal di dalam URL, dan SeaweedFS 4.51 tidak menolak tanggal di depan: URL itu hidup sampai 35 menit dari sekarang. Karena itu jam server penanda tangan harus benar; perilaku penyimpanan lain [perlu verifikasi].")
    s, isi_r, _ = s3("PUT", "identitas/0/umur-maks", b"x", umur=604800)
    baris_s3("X-Amz-Expires 604800 (7 hari, batas atas dokumentasi SigV4)", s, isi_r, 200)
    s, isi_r, _ = s3("PUT", "identitas/0/umur-lebih", b"x", umur=604801)
    baris_s3("X-Amz-Expires 604801", s, isi_r, 400, "AuthorizationQueryParametersError")

    bagian("E. Penolakan lain: kunci diganti, metode diganti, tanpa tanda tangan")
    dina2 = sesi(40003, "Pemakai 40003")
    u2 = minta(dina2)
    lain = u2["url_kartu"].replace(u2["kunci_kartu"], u2["kunci_swafoto"])
    s, isi_r, _ = http("PUT", lain, b"x")
    baris_s3("URL dengan kunci objek diganti", s, isi_r, 403, "SignatureDoesNotMatch")
    s, isi_r, _ = http("GET", u2["url_kartu"])
    baris_s3("URL PUT dipakai untuk GET", s, isi_r, 403, "SignatureDoesNotMatch")
    s, isi_r, _ = http("GET", f"http://{S3_HOST}/{BUCKET}/{u['kunci_kartu']}")
    baris_s3("GET objek tanpa tanda tangan (bucket privat)", s, isi_r, 403, "AccessDenied")
    s, isi_r, _ = http("GET", f"http://{S3_HOST}/{BUCKET}?list-type=2")
    baris_s3("daftar isi bucket tanpa tanda tangan", s, isi_r, 403, "AccessDenied")

    bagian("F. Batas ukuran di penyimpanan: URL tanpa panjang ditandatangani tidak membatasi apa pun; panjang yang ditandatangani dipaksa penyimpanan")
    u3 = minta(sesi(40004, "Pemakai 40004"))
    besar = berkas(3, 5 * MIB)
    s, isi_r, _ = http("PUT", u3["url_kartu"], besar)
    baris_s3(f"PUT {ang(len(besar))} byte lewat URL tanpa ukuran ditandatangani", s, isi_r, 200)
    harap(ukuran_objek(u3["kunci_kartu"]), 5 * MIB, "ukuran objek 5 MiB")
    catat("# URL ini tidak membatasi ukuran, dan SeaweedFS 4.51 dengan setelan lab menerima 5 MiB. Pemeriksaan ukuran yang direkam lab ini adalah milik server sesudah unggah (unggah.txt bagian C); batas ukuran per objek di SeaweedFS tidak ditemukan di dokumentasi yang dibuka [perlu verifikasi].")
    u4 = minta(sesi(40005, "Pemakai 40005"), ukuran_kartu=1000)
    catat("$ curl -X POST /verifikasi/unggahan -d '{\"ukuran_kartu\":1000}'    # panjang PUT ikut ditandatangani (SignedHeaders memuat content-length)")
    harap(ringkas_url(u4["url_kartu"])["X-Amz-SignedHeaders"], "content-length;host", "header yang ditandatangani")
    s, isi_r, _ = http("PUT", u4["url_kartu"], b"a" * 1001)
    baris_s3("PUT 1.001 byte (ditandatangani 1.000)", s, isi_r, 403, "SignatureDoesNotMatch")
    s, isi_r, _ = http("PUT", u4["url_kartu"], b"a" * 999)
    baris_s3("PUT 999 byte", s, isi_r, 403, "SignatureDoesNotMatch")
    s, isi_r, _ = http("PUT", u4["url_kartu"], b"a" * 1000)
    baris_s3("PUT 1.000 byte", s, isi_r, 200)
    catat("# Dengan panjang ditandatangani, penyimpanan menolak panjang lain saat unggah. Server tetap memeriksa ukuran sesudah unggah (unggah.txt bagian C).")

    bagian("G. Checksum di penyimpanan: header x-amz-checksum-sha256 yang ditandatangani (dibuat lab; server tidak memakainya)")
    isi_uji = b"isi-uji-checksum"
    benar = base64.b64encode(hashlib.sha256(isi_uji).digest()).decode()
    salah = base64.b64encode(hashlib.sha256(b"lain").digest()).decode()
    s, isi_r, _ = s3("PUT", "identitas/0/ck-benar", isi_uji, header={"x-amz-checksum-sha256": benar})
    baris_s3("checksum cocok", s, isi_r, 200)
    s, isi_r, _ = s3("PUT", "identitas/0/ck-salah", isi_uji, header={"x-amz-checksum-sha256": salah})
    baris_s3("checksum beda", s, isi_r, 400, "BadDigest")
    harap(ukuran_objek("identitas/0/ck-salah"), None, "objek dengan checksum beda tidak tersimpan")
    catat("objek dengan checksum beda tersimpan: tidak")
    catat("# Pemeriksaan ini hanya terjadi bila pengunggah mengirim header checksum yang ikut ditandatangani; PUT tanpa header itu (bagian B dan F) diterima tanpa pemeriksaan isi. Karena itu server menghitung ulang checksum dari isi objek (unggah.txt bagian B).")
    bagian("H. Log penyimpanan: apakah URL bertanda tangan (bearer token) tercatat di log container SeaweedFS pada setelan lab")
    log_s3 = compose("logs", "--no-log-prefix", "seaweedfs").stdout
    n_url = len(re.findall(r"X-Amz-Signature|X-Amz-Credential", log_s3))
    catat(f"baris log SeaweedFS yang memuat X-Amz-Signature atau X-Amz-Credential sesudah semua permintaan di atas: {n_url}")
    harap(n_url, 0, "URL bertanda tangan tercatat di log penyimpanan")
    catat("# Itu hasil pada setelan lab (tingkat log bawaan, tanpa -s3.auditLogConfig). Log akses di proxy atau penyeimbang beban di depan penyimpanan nyata tidak diperiksa (Tidak dijalankan): URL yang tercatat di sana adalah izin yang bocor.")
    d.stop(PORT)
    s3_henti()
    tulis("presign.txt", "presigned URL: dipakai ulang, kedaluwarsa, ditimpa, batas ukuran, checksum, dan penolakan di SeaweedFS")


# ---------- unggah ----------

def rekam_unggah():
    siapkan()
    s3_mulai("# penyimpanan objek: SeaweedFS 4.51 di container, endpoint S3 lokal, bucket privat 'berkas'")
    d.mulai_verifikasi()
    mulai_api(tampil="# server: ./api-t4 -lab -objek-s3 <endpoint lokal> (umur URL bawaan 5 menit, Asumsi)")

    bagian("A. Alur normal: minta URL, unggah langsung ke penyimpanan, lalu ajukan dengan kunci dan checksum")
    dina = sesi(40001, "Dina")
    u = minta(dina)
    kunci_a = u["kunci_kartu"].split("/")[-1]
    kartu, swafoto = berkas(10, tanda=b"ISI-RAHASIA-KARTU"), berkas(11, tanda=b"ISI-RAHASIA-SWAFOTO")
    unggah(u, kartu, swafoto)
    catat(f"PUT kartu {ang(len(kartu))} byte dan swafoto {ang(len(swafoto))} byte langsung ke penyimpanan lewat dua URL: HTTP 200 dan 200 (skrip lab berperan sebagai app; byte tidak melewati server pada jalur unggah)")
    catat("$ curl -i -X POST /verifikasi/terunggah -H 'Authorization: Bearer <token sesi Dina>' -d '{kunci_kartu, kunci_swafoto, checksum_kartu: <SHA-256 hitungan app>, checksum_swafoto: <...>, nomor_identitas: <16 angka>}'")
    s, isi = terunggah(dina, u, kartu, swafoto)
    harap(s, 202, "pengajuan terunggah")
    catat(f"HTTP {s}")
    catat_json("badan:", isi)
    v = j(isi)
    harap((v["checksum_kartu"], v["checksum_swafoto"]), (sha(kartu), sha(swafoto)), "checksum tersimpan = hitungan server dari isi")
    catat("checksum tersimpan sama dengan SHA-256 dari byte yang diunggah: ya")
    sql("SELECT id, akun_id, status, length(berkas_kartu_kunci) AS panjang_kunci, hapus_pada IS NULL AS belum_selesai FROM verifikasi")
    sql("SELECT akun_id, kelas, jenis, tujuan, status FROM outbox WHERE jenis = 'verifikasi'")
    harap(ada_di_penyimpanan(u), (True, True), "objek ada di penyimpanan")
    catat("objek ada di penyimpanan (HEAD): kartu ya, swafoto ya")
    d.worker(["-maks-percobaan", "5", "-backoff", "1ms", "-satu-putaran"], tampil=False, db=DB)
    sql("SELECT status FROM verifikasi")

    bagian("B. Checksum dari app salah: server menghitung dari isi, menolak, dan menghapus file dari penyimpanan")
    p2 = sesi(40003, "Pemakai 40003")
    u = minta(p2)
    kartu, swafoto = berkas(20), berkas(21)
    unggah(u, kartu, swafoto)
    s, isi = terunggah(p2, u, kartu, swafoto, checksum_kartu=sha(b"bukan isi file ini"))
    catat(f"HTTP {s}")
    catat_json("badan:", isi)
    harap(s, 422, "checksum salah")
    harap(ada_di_penyimpanan(u), (False, False), "file ditolak dihapus dari penyimpanan")
    catat("objek di penyimpanan sesudah penolakan (HEAD): kartu tidak ada, swafoto tidak ada")
    harap(satu("SELECT count(*) FROM verifikasi WHERE akun_id = 40003"), 0, "tidak ada baris verifikasi")
    catat("baris verifikasi untuk akun itu: 0")

    bagian("C. Ukuran diperiksa sesudah unggah: penyimpanan menerima apa pun, server menolak yang di atas 1 MiB")
    p3 = sesi(40004, "Pemakai 40004")
    u = minta(p3)
    swafoto = berkas(31)
    kartu_pas = berkas(30, MIB)
    unggah(u, kartu_pas, swafoto)
    s, isi = terunggah(p3, u, kartu_pas, swafoto)
    catat(f"kartu tepat 1 MiB ({ang(MIB)} byte): HTTP {s}")
    harap(s, 202, "tepat 1 MiB lolos")
    p5 = sesi(40005, "Pemakai 40005")
    u = minta(p5)
    kartu_besar = berkas(32, MIB + 1)
    unggah(u, kartu_besar, swafoto)
    harap(ukuran_objek(u["kunci_kartu"]), MIB + 1, "penyimpanan menerima 1 MiB + 1")
    catat(f"penyimpanan menerima kartu 1 MiB + 1 byte ({ang(MIB + 1)} byte) lewat URL: HTTP 200 (presign.txt bagian F)")
    s, isi = terunggah(p5, u, kartu_besar, swafoto)
    catat(f"ajukan dengan kartu 1 MiB + 1 byte: HTTP {s}")
    catat_json("badan:", isi)
    harap(s, 422, "1 MiB + 1")
    harap(ada_di_penyimpanan(u), (False, False), "file terlalu besar dihapus")
    catat("objek di penyimpanan sesudah penolakan (HEAD): kartu tidak ada, swafoto tidak ada")

    bagian("D. Bukan gambar, belum diunggah, dan kunci milik akun lain")
    p6 = sesi(40006, "Pemakai 40006")
    u = minta(p6)
    pdf = b"%PDF-1.4 bukan gambar " + random.Random(40).randbytes(1000)
    unggah(u, pdf, swafoto)
    s, isi = terunggah(p6, u, pdf, swafoto)
    catat(f"file PDF di kunci kartu (tipe dari byte, bukan nama): HTTP {s}")
    catat_json("badan:", isi)
    harap(s, 422, "bukan gambar")
    harap(ada_di_penyimpanan(u), (False, False), "file bukan gambar dihapus")
    p7 = sesi(40007, "Pemakai 40007")
    u = minta(p7)
    http("PUT", u["url_swafoto"], swafoto)
    s, isi = terunggah(p7, u, swafoto, swafoto)
    catat(f"kartu tidak pernah diunggah: HTTP {s}")
    catat_json("badan:", isi)
    harap(s, 422, "kartu belum diunggah")
    harap(ada_di_penyimpanan(u), (False, False), "file lain ikut dihapus")
    p8, p9 = sesi(40008, "Pemakai 40008"), sesi(40009, "Pemakai 40009")
    milik_p8, milik_p9 = minta(p8), minta(p9)
    unggah(milik_p9, kartu, swafoto)
    unggah(milik_p8, kartu, swafoto)
    s, isi = terunggah(p8, milik_p8, kartu, swafoto, kunci_kartu=milik_p9["kunci_kartu"])
    catat(f"kunci kartu milik akun lain: HTTP {s}")
    catat_json("badan:", isi)
    harap(s, 422, "kunci akun lain")
    harap(ada_di_penyimpanan(milik_p9), (True, True), "file akun lain tidak boleh ikut terhapus")
    catat("objek milik akun lain di penyimpanan sesudah penolakan: tetap ada")

    log_awal = d.stop(PORT)   # batas laju per alamat (10 pengajuan per jam) habis di bagian A sampai D: proses baru, log lama disimpan
    mulai_api()

    bagian("E. Nomor identitas dan tanda tangan URL tidak masuk log; tidak diulang di jawaban galat")
    p10 = sesi(40010, "Pemakai 40010")
    u = minta(p10)
    unggah(u, kartu, swafoto)
    s, isi = terunggah(p10, u, kartu, swafoto, nomor_identitas=int(NOMOR))
    catat("# Skrip lab sengaja mengirim nomor sebagai angka JSON: pesan galat standar pengurai JSON mengutip nilai yang bertipe salah, dan di sinilah nomor bisa bocor ke jawaban.")
    catat(f"nomor identitas dikirim sebagai angka JSON, bukan teks: HTTP {s}")
    catat_json("badan:", isi)
    harap(s, 422, "nomor sebagai angka")
    harap(NOMOR in isi, False, "jawaban galat tidak boleh memuat nomor identitas")
    catat("jawaban galat memuat nomor identitas: tidak")
    s, isi = terunggah(p10, u, kartu, swafoto, nomor_identitas="12345")
    harap((s, "12345" in isi), (422, False), "nomor pendek")
    catat("nomor 5 angka: HTTP 422, jawaban memuat nomor itu: tidak")
    catat("# Penyimpanan dimatikan: pemeriksaan objek gagal di server; galat internal tidak boleh membawa URL atau tanda tangan ke log.")
    compose("stop", "seaweedfs")
    s, isi = terunggah(p10, u, kartu, swafoto)
    catat(f"ajukan saat penyimpanan mati: HTTP {s}")
    harap(s, 500, "penyimpanan mati")
    harap(NOMOR in isi or "Amz" in isi, False, "jawaban 500 bersih")
    log = log_awal + d.stop(PORT)
    catat("# Baris log kedua proses server yang menyebut penyimpanan:")
    for l in log:
        if "penyimpanan objek" in l:
            catat("  " + _ekstra(l))
    teks = "\n".join(log)
    for pola, arti in ((NOMOR, "nomor identitas"), ("X-Amz", "parameter tanda tangan URL"), ("Signature", "tanda tangan"), ("ISI-RAHASIA", "byte isi file"),
                       (u["kunci_kartu"].split("/")[-1], "kunci objek"), (kunci_a, "kunci objek bagian A"), ("labrahasia", "rahasia penyimpanan"), ("token-lab", "token sesi")):
        harap(pola in teks, False, f"log memuat {arti}")
    catat(f"log server: {len(log)} baris; memuat nomor identitas, tanda tangan URL, byte isi file, kunci objek, rahasia penyimpanan, atau token sesi: tidak")
    d.stop(d.PORT_VERIFIKASI)
    s3_henti()
    tulis("unggah.txt", "unggah lewat presigned PUT: pemeriksaan checksum, ukuran, tipe, kepemilikan kunci, dan log")


# ---------- unduh ----------

def unduh(token, id_, bagian_, alasan=None):
    q = f"?alasan={urllib.parse.quote(alasan)}" if alasan is not None else ""
    return http("GET", f"http://127.0.0.1:{PORT}/bo/verifikasi/{id_}/berkas/{bagian_}{q}", header={"Authorization": f"Bearer {token}"} if token else {})


def n_audit(aksi="buka_berkas"):
    return satu(f"SELECT count(*) FROM audit_log WHERE aksi = '{aksi}'")


def rekam_unduh():
    siapkan()
    s3_mulai("# penyimpanan objek: SeaweedFS 4.51 di container, endpoint S3 lokal, bucket privat 'berkas'")
    mulai_api(tampil="# server: ./api-t4 -lab -objek-s3 <endpoint lokal>")
    dina = sesi(40001, "Dina")
    eko = sesi(40002, "Eko")
    ratih = sesi(420, "Ratih")
    id_, kartu, swafoto, u = ajukan_lengkap(dina, 50)
    alasan = "Peninjauan manual pengajuan verifikasi, tiket uji 1"

    bagian("A. Petugas risk membuka file lewat server: peran diperiksa, alasan wajib, satu baris audit")
    s, isi, h = unduh(ratih, id_, "kartu", alasan)
    catat(f"GET /bo/verifikasi/{id_}/berkas/kartu?alasan=... sebagai Ratih (risk): HTTP {s}")
    harap(s, 200, "unduh sebagai risk")
    for k in ("Content-Type", "X-Content-Type-Options", "Cache-Control"):
        catat(f"{k}: {h.get(k)}")
    harap(sha(isi), sha(kartu), "isi unduhan = isi unggahan")
    catat(f"isi unduhan {ang(len(isi))} byte, SHA-256 sama dengan yang diunggah dan dengan checksum_kartu di database: ya")
    harap(sha(isi), satu(f"SELECT checksum_kartu FROM verifikasi WHERE id = {id_}"), "checksum di database")
    sql("SELECT aksi, peran, objek, alasan FROM audit_log WHERE aksi = 'buka_berkas' ORDER BY id")
    s, isi, _ = http("GET", f"http://127.0.0.1:{PORT}/bo/audit/verifikasi", header={"Authorization": f"Bearer {ratih}"})
    r = j(isi)
    harap((s, r["utuh"]), (200, True), "rantai audit")
    catat(f"rantai audit dihitung ulang: utuh = {str(r['utuh']).lower()}")

    bagian("B. Yang bukan petugas risk: ditolak, dan tidak ada baris audit baru")
    sebelum = n_audit()
    for nama, token in (("Dina (pemilik pengajuan)", dina), ("Eko (pemakai terverifikasi)", eko), ("tanpa token", None)):
        s, isi, _ = unduh(token, id_, "kartu", alasan)
        catat(f"{nama}: HTTP {s}")
        harap(s, 401 if token is None else 403, nama)
    s, isi, _ = unduh(ratih, id_, "kartu")
    catat(f"Ratih tanpa alasan: HTTP {s}")
    harap(s, 422, "alasan wajib")
    s, isi, _ = unduh(ratih, id_, "kartu", "pendek")
    catat(f"Ratih dengan alasan 6 karakter (minimal 20): HTTP {s}")
    harap(s, 422, "alasan pendek")
    harap(n_audit(), sebelum, "audit tidak bertambah oleh yang ditolak")
    catat(f"baris audit buka_berkas sebelum dan sesudah keempat percobaan: {sebelum} dan {sebelum}")

    bagian("C. Bucket privat; URL GET bertanda tangan (alternatif yang ditolak) dipakai ulang tanpa catatan audit")
    s, isi, _ = http("GET", f"http://{S3_HOST}/{BUCKET}/{u['kunci_kartu']}")
    catat(f"GET objek langsung ke penyimpanan tanpa tanda tangan: HTTP {s} {kode_s3(isi)}")
    harap(s, 403, "bucket privat")
    catat("# Alternatif: server menerbitkan URL GET berumur 5 menit. Di lab URL itu dibuat penanda tangan lab (server tidak punya endpoint seperti itu), hanya untuk memperlihatkan akibatnya.")
    sebelum = n_audit()
    url_get = s3sign.presign("GET", S3_HOST, f"/{BUCKET}/{u['kunci_kartu']}", 300)
    for pemegang in ("pemegang pertama", "pemegang kedua (dikirim ulang oleh orang lain)"):
        s, isi, _ = http("GET", url_get)
        catat(f"{pemegang}: HTTP {s}, {ang(len(isi))} byte")
        harap((s, isi), (200, kartu), pemegang)
    harap(n_audit(), sebelum, "unduh lewat URL tidak menulis audit")
    catat(f"baris audit buka_berkas sesudah dua unduhan lewat URL: {n_audit()} (tetap); unduh lewat server menulis satu baris per percobaan")

    bagian("D. File ditimpa sesudah diterima (pemegang URL unggah yang belum kedaluwarsa): checksum tidak cocok, file ditolak, percobaan tetap tercatat")
    http("PUT", u["url_kartu"], berkas(51, 80_000, b"ISI-LAIN"))
    sebelum = n_audit()
    s, isi, _ = unduh(ratih, id_, "kartu", alasan)
    catat(f"unduh kartu sesudah ditimpa: HTTP {s}")
    catat("badan: " + d.samarkan(isi.decode().strip()))
    harap(s, 500, "file rusak")
    harap(n_audit(), sebelum + 1, "percobaan dicatat")
    catat(f"baris audit bertambah satu: {sebelum} jadi {n_audit()}")
    s, isi, _ = unduh(ratih, id_, "swafoto", alasan)
    harap((s, sha(isi)), (200, sha(swafoto)), "swafoto yang tidak ditimpa")
    catat("swafoto yang tidak ditimpa tetap bisa dibuka: HTTP 200")
    catat("# Yang ditolak adalah isi yang tidak cocok dengan checksum yang dicatat saat diterima. File aslinya sudah hilang: penyimpanan tidak menyimpan versi lama (presign.txt bagian B).")
    catat("# Bila data tidak boleh ditimpa, pilihannya unggah lewat server (jalur POST /verifikasi di api-t4 sudah ada); ongkosnya server menyangga tiap file.")
    d.stop(PORT)
    s3_henti()
    tulis("unduh.txt", "unduh lewat server: peran, alasan, audit, bucket privat, dan file yang ditimpa")


# ---------- retensi ----------

def iso(dt):
    """RFC 3339 dengan mikrodetik: batas hapus_pada punya mikrodetik, dan tepat di batas harus bisa diperankan."""
    from datetime import timezone
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def job_retensi(sekarang, tampil):
    """`./api-t4 -retensi-identitas -lab-sekarang <waktu>`: satu putaran job; mengembalikan (diperiksa, dihapus, galat)."""
    r = subprocess.run([str(d.BIN), "-retensi-identitas", "-lab-sekarang", iso(sekarang), "-objek-s3", f"http://{S3_HOST}", "-objek-bucket", BUCKET],
                       env=dict(d.ENV, DATABASE_URL=DB, **S3_ENV), capture_output=True, text=True)
    harap(r.returncode, 0, "job retensi: " + r.stderr[-300:])
    m = re.search(r"diperiksa (\d+), dihapus (\d+), galat (\d+)", r.stdout)
    hasil = tuple(int(x) for x in m.groups())
    catat(f"$ ./api-t4 -retensi-identitas -lab-sekarang {tampil}")
    catat(r.stdout.strip())
    return hasil


def waktu_baris(id_):
    with d.sambung(SCH) as c:
        return c.execute("SELECT selesai, hapus_pada FROM verifikasi WHERE id = %s", (id_,)).fetchone()


def worker_sampai(kondisi, apa, args):
    """Worker -sekali berulang (baris yang ditunda backoff belum siap) sampai kondisi terpenuhi; batas 20 detik."""
    d.tunggu(lambda: (d.worker(args, tampil=False, db=DB), kondisi())[1], apa, batas=20.0, jeda=0.05)


def rekam_retensi():
    from datetime import timedelta
    siapkan()
    s3_mulai("# penyimpanan objek: SeaweedFS 4.51 di container, endpoint S3 lokal, bucket privat 'berkas'")
    d.mulai_verifikasi()
    mulai_api(tampil="# server: ./api-t4 -lab -objek-s3 <endpoint lokal>; layanan verifikasi tiruan: ./tiruan -peran verifikasi")
    P = ["-maks-percobaan", "1", "-backoff", "1ms", "-satu-putaran"]
    bagian("A. Tiga pengajuan mencapai status akhir lewat worker dan layanan verifikasi tiruan (satu per satu, urutan A, B, C); satu masih berjalan")
    ra = ajukan_lengkap(sesi(40001, "Dina"), 60)
    d.tiruan_mode(d.PORT_VERIFIKASI, "normal")
    worker_sampai(lambda: satu(f"SELECT status FROM verifikasi WHERE id = {ra[0]}") == "lulus", "A lulus", P)
    rb = ajukan_lengkap(sesi(40003, "Pemakai 40003"), 61)
    d.tiruan_mode(d.PORT_VERIFIKASI, "ditolak")
    worker_sampai(lambda: satu(f"SELECT status FROM verifikasi WHERE id = {rb[0]}") == "ditolak", "B ditolak", P)
    rc = ajukan_lengkap(sesi(40004, "Pemakai 40004"), 62)
    d.tiruan_mode(d.PORT_VERIFIKASI, "mati")
    worker_sampai(lambda: satu(f"SELECT status FROM verifikasi WHERE id = {rc[0]}") == "gagal", "C gagal (vendor mati, satu percobaan)", P)
    rd_ = ajukan_lengkap(sesi(40005, "Pemakai 40005"), 63)
    catat("# A: vendor menjawab lulus; B: vendor menjawab ditolak; C: vendor mati, satu percobaan lalu dead-letter (pendaftar tidak bersalah, M31); D: tidak ada worker.")
    sql("SELECT id, status, hapus_pada IS NOT NULL AS punya_hapus_pada, hapus_pada - selesai AS masa_simpan FROM verifikasi ORDER BY id")
    harap(satu("SELECT string_agg(status, ',' ORDER BY id) FROM verifikasi"), "lulus,ditolak,gagal,diajukan", "status akhir")
    harap(satu("SELECT count(*) FROM verifikasi WHERE hapus_pada - selesai = interval '30 days'"), 3, "masa simpan 30 hari")
    catat("# Masa simpan tepat 30 hari untuk lulus, ditolak, dan gagal; pengajuan yang masih berjalan belum punya hapus_pada dan tidak pernah dipilih job.")
    harap(ada_di_penyimpanan(ra[3]) + ada_di_penyimpanan(rd_[3]), (True, True, True, True), "file ada sebelum job")

    bagian("B. Job retensi dengan jam diperankan: 29 hari, satu detik sebelum batas, dan (di bagian D) tepat di batas dan 31 hari")
    (selesai_a, hapus_a), (selesai_b, hapus_b), (selesai_c, hapus_c) = waktu_baris(ra[0]), waktu_baris(rb[0]), waktu_baris(rc[0])
    urut = [("A", ra, hapus_a), ("B", rb, hapus_b), ("C", rc, hapus_c)]
    paling_awal, hapus_awal = urut[0][1], urut[0][2]
    harap(hapus_a < hapus_b < hapus_c, True, "tiga batas berurutan")
    catat("# Ketiganya selesai berjarak beberapa detik: batas A lebih awal daripada B, B daripada C. Yang diperiksa terhadap satu detik adalah batas A.")
    h = job_retensi(selesai_a + timedelta(days=29), "<selesai A + 29 hari>")
    harap(h, (0, 0, 0), "29 hari")
    h = job_retensi(hapus_awal - timedelta(seconds=1), "<batas A - 1 detik>")
    harap(h, (0, 0, 0), "1 detik sebelum batas")
    harap(ada_di_penyimpanan(paling_awal[3]), (True, True), "file masih ada sebelum batas")
    catat("file A sesudah kedua putaran itu: masih ada (HEAD)")

    bagian("C. Penyimpanan mati saat job jalan: galat dihitung, baris tidak ditandai, file tetap diulang pada putaran berikutnya")
    compose("stop", "seaweedfs")
    h = job_retensi(hapus_awal, "<batas A>")
    harap(h, (1, 0, 1), "penyimpanan mati")
    harap(satu(f"SELECT berkas_kartu_kunci <> '' FROM verifikasi WHERE id = {paling_awal[0]}"), True, "baris belum ditandai")
    catat("baris A sesudah putaran gagal: kunci objek masih terisi (belum ditandai terhapus)")
    compose("start", "seaweedfs")
    tunggu_s3()
    hangatkan()

    bagian("D. Penyimpanan pulih: tepat di batas dihapus (hapus_pada <= sekarang); diulang tidak mengubah apa pun; pengajuan lain menunggu batasnya")
    h = job_retensi(hapus_awal, "<batas A>")
    harap(h, (1, 1, 0), "tepat di batas")
    harap(ada_di_penyimpanan(paling_awal[3]), (False, False), "file terhapus")
    catat("file A (HEAD): kartu tidak ada, swafoto tidak ada")
    h = job_retensi(hapus_awal, "<batas A>")
    harap(h, (0, 0, 0), "diulang")
    catat("# Putaran kedua dengan jam yang sama tidak memeriksa apa pun: baris yang sudah ditandai tidak dipilih lagi (idempoten).")
    kedua = urut[1][1]
    harap(ada_di_penyimpanan(kedua[3]) + ada_di_penyimpanan(urut[2][1][3]), (True, True, True, True), "B dan C belum dihapus")
    catat("B dan C (batas lebih lambat): file masih ada")
    h = job_retensi(max(hapus_a, hapus_b, hapus_c) + timedelta(days=1), "<batas C + 1 hari>")
    harap(h, (2, 2, 0), "31 hari")
    harap(ada_di_penyimpanan(kedua[3]) + ada_di_penyimpanan(urut[2][1][3]), (False, False, False, False), "semua terhapus")
    harap(ada_di_penyimpanan(rd_[3]), (True, True), "pengajuan yang belum diputuskan tidak tersentuh")
    catat("pengajuan D (belum diputuskan): file masih ada, tanpa hapus_pada, tidak pernah dipilih job")
    sql("SELECT id, status, berkas_kartu_kunci = '' AS kunci_kosong, length(checksum_kartu) AS panjang_checksum FROM verifikasi ORDER BY id")

    bagian("E. Sesudah retensi: baris tetap sebagai catatan; membuka file dijawab 410 dan percobaannya tetap tercatat")
    ratih = sesi(420, "Ratih")
    sebelum = n_audit()
    s, isi, _ = unduh(ratih, paling_awal[0], "kartu", "Peninjauan manual pengajuan verifikasi, tiket uji 2")
    catat(f"GET /bo/verifikasi/<A>/berkas/kartu sebagai Ratih: HTTP {s}")
    catat("badan: " + d.samarkan(isi.decode().strip()))
    harap(s, 410, "berkas dihapus")
    harap(n_audit(), sebelum + 1, "percobaan tercatat")
    catat(f"baris audit buka_berkas bertambah satu: {sebelum} jadi {n_audit()}")
    catat("# Tidak ada kolom \"sudah dihapus\" di tabel naskah; lab memakai kunci objek kosong sebagai penanda. Retensi 30 hari adalah Asumsi produk [perlu verifikasi]; aturan hukum tentang masa simpan tidak diperiksa lab ini.")
    d.stop(PORT)
    d.stop(d.PORT_VERIFIKASI)
    s3_henti()
    tulis("retensi.txt", "retensi 30 hari: job idempoten, batas 29 dan 31 hari dengan jam diperankan, penyimpanan mati, dan unduh sesudah dihapus")


# ---------- testing ----------

POLA_TES = ("TandaiURL|S3|Presign|Unggahan|Terunggah|Retensi|BukaBerkasSesudah|Bytea|FileDitimpa|BacaMemakai|EndpointTidakSah|KunciTidakSah|"
            "GalatS3|GalatStatusS3|HandlerBerkas")


def go(*a, env=None):
    r = subprocess.run(["go", *a], cwd=HERE.parent / "api-t4", env=env or d.ENV, capture_output=True, text=True)
    teks = (r.stdout + r.stderr).replace("\t", "  ")
    teks = re.sub(r" \(\d+\.\d+s\)", "", teks)                                   # waktu per tes bergantung mesin: tidak direkam
    teks = re.sub(r"^(ok|FAIL)(\s+\S+)\s+[\d.]+s", r"\1\2", teks, flags=re.M)
    teks = re.sub(r"^(ok\s+\S+)\s+\(cached\)", r"\1", teks, flags=re.M)
    teks = re.sub(r"^\d{4}/\d\d/\d\d \d\d:\d\d:\d\d(?:\.\d+)? ", "", teks, flags=re.M)
    return r.returncode, teks.strip()


def rekam_testing():
    d.buat_schema(TES)
    tes_db = d.db_pemilik(TES, "t4-storage-tes")
    env = dict(d.ENV, TEST_DATABASE_URL=tes_db, LAB_TES_SCHEMA=TES)
    bagian("A. go vet, lalu tes Go milik jalur file identitas (klien S3, unggah presigned, retensi, bytea) di schema " + TES)
    rc, teks = go("vet", "./internal/objek", "./internal/service", "./internal/handler", "./cmd/api", env=env)
    catat("$ go vet ./internal/objek ./internal/service ./internal/handler ./cmd/api")
    catat(teks or "(tanpa temuan)")
    catat(f"# exit status {rc}")
    harap(rc, 0, "go vet")
    rc, teks = go("test", "-v", "-count=1", "-p", "1", "-run", POLA_TES, "./internal/objek", "./internal/service", "./internal/handler", env=env)
    teks = "\n".join(l for l in teks.splitlines() if not l.startswith(("?", "=== RUN", "=== PAUSE", "=== CONT")))
    catat(f"$ TEST_DATABASE_URL=<pemilik, schema {TES}> go test -v -count=1 -p 1 -run '{POLA_TES}' ./internal/objek ./internal/service ./internal/handler")
    catat(teks)
    catat(f"# exit status {rc}")
    if rc != 0:
        print("\n".join(l for l in teks.splitlines() if "FAIL" in l or "panic" in l or l.startswith("    ")), file=sys.stderr)
    harap(rc, 0, "go test")
    harap("--- SKIP" in teks, False, "tes dilewati")
    harap(len(re.findall(r"^--- FAIL", teks, flags=re.M)), 0, "tes yang gagal")
    harap(len(re.findall(r"^--- PASS", teks, flags=re.M)) >= 30, True, "jumlah tes yang lulus")
    tulis("testing.txt", "tes Go jalur file identitas: tanda tangan, presigned PUT, unggah, retensi, dan bytea")


BAGIAN = {"ukuran": [rekam_ukuran], "presign": [rekam_presign], "unggah": [rekam_unggah], "unduh": [rekam_unduh],
          "retensi": [rekam_retensi], "testing": [rekam_testing]}


def main():
    pilih = sys.argv[1:] or list(BAGIAN)
    for p in pilih:
        if p not in BAGIAN:
            gagal(f"bagian {p!r} tidak dikenal; pilihan: {', '.join(BAGIAN)}")
    d.bangun()
    try:
        for p in pilih:
            for f in BAGIAN[p]:
                for port in list(d.server):
                    d.stop(port)
                f()
                for port in list(d.server):
                    d.stop(port)
    finally:
        for port in list(d.server):
            d.stop(port)
        s3_henti()


if __name__ == "__main__":
    main()
