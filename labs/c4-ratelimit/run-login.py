"""Lab c4-ratelimit/login: pengaman login untuk M16 (Tahap 2).

Server Go di login/main.go, database PostgreSQL bersama (schema c4_login). Keluaran:
output/login/ratelimit.txt. Semua terhadap 127.0.0.1 dengan data dan password FIKTIF.

Rekaman dibuat deterministik: jam disuntikkan ke server (POST /lab/jam), tanpa tidur,
tanpa stempel waktu; salt dan rahasia proxy acak tidak pernah dicetak.
Dua kali dari database bersih harus identik per byte.

Bagian:
  A. Parameter argon2id dan skema.
  B. Wajib ganti password pertama; password baru lemah/bocor ditolak.
  C. Pertahanan naif: kunci per akun saja (credential stuffing lolos; akun Ani bisa dikunci = DoS).
  D. Rate limit dua lapis di memori (per IP dan per akun): penyerang satu IP dibatasi, Ani tetap masuk.
  E. IP dari header: memercayai X-Forwarded-For dari client sembarang adalah celah.
  F. Dua instance: bucket di memori tidak dibagi, batas per IP menggandakan (ADR 20, Redis ke Tahap 3).
  G. Kunci atomik: tebakan bersamaan saat penghitung tinggal satu dari ambang hanya satu yang dinilai (659).
  H. Key per IP memotong IPv6 ke prefix /64 (660).
  I. /ganti-password menolak password dari daftar bocor fiktif, sesudah kebijakan panjang (661).
  J. Tes Go di login/pengaman*_test.go (659-661) lolos, tanpa ada yang dilewati.
"""
import atexit
import concurrent.futures
import json
import os
import pathlib
import re
import secrets
import socket
import subprocess
import threading
import time
import urllib.error
import urllib.request

HERE = pathlib.Path(__file__).parent
LOGIN = HERE / "login"
OUT = HERE / "output" / "login"
BIN = LOGIN / "c4login"

DB = "postgres://lab:lab@127.0.0.1:54333/lab?search_path=c4_login&application_name=c4-ratelimit"

# Rahasia bersama antara server dan "proxy" lab (mode IP_SUMBER=proxy). Acak tiap run, hanya di
# memori proses ini, tidak pernah dicetak ke rekaman atau ditulis ke repo.
PROXY_RAHASIA = secrets.token_hex(32)

# Jam tiruan: Senin pagi (cerita M16 "terkunci berkali-kali pagi hari"). Hanya untuk rekaman.
T0_MS = 1_792_479_600_000  # 2026-10-19T07:00:00Z, deterministik

log = []
_proses = []  # server yang dijalankan; dibunuh saat keluar supaya gagal keras tidak meninggalkan orphan


@atexit.register
def _bersihkan():
    for p in _proses:
        if p.poll() is None:
            p.terminate()
    for p in _proses:
        try:
            p.wait(timeout=5)
        except Exception:
            p.kill()


def tulis(s=""):
    log.append(s)


def build():
    env = dict(os.environ)
    subprocess.run(["go", "build", "-o", str(BIN), "."], cwd=LOGIN, check=True, env=env)


def seed():
    subprocess.run([str(BIN), "-seed"], cwd=LOGIN,
                   env=dict(os.environ, DATABASE_URL=DB), check=True,
                   stdout=subprocess.DEVNULL)


def server(port, mode="dua-lapis", ip_sumber="koneksi"):
    try:
        socket.create_connection(("127.0.0.1", port), 0.1).close()
        raise SystemExit(f"port {port} sudah dipakai proses lain; hentikan dulu")
    except OSError:
        pass
    p = subprocess.Popen(
        [str(BIN)], cwd=LOGIN,
        env=dict(os.environ, DATABASE_URL=DB, PORT=str(port), MODE=mode,
                 IP_SUMBER=ip_sumber, LAB_JAM="1", PROXY_RAHASIA=PROXY_RAHASIA),
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    _proses.append(p)
    for _ in range(200):
        try:
            socket.create_connection(("127.0.0.1", port), 0.1).close()
            return p
        except OSError:
            time.sleep(0.02)
    raise SystemExit("server tidak jalan")


def jam(port, ms):
    _post(port, "/lab/jam", {"ms": ms})


def _post(port, path, body, ip=None, lewat_proxy=False, penanda=None):
    headers = {"Content-Type": "application/json"}
    if ip is not None:
        headers["X-Lab-IP"] = ip
    if lewat_proxy:
        headers["X-Lab-Proxy"] = PROXY_RAHASIA
    elif penanda is not None:
        headers["X-Lab-Proxy"] = penanda  # tebakan penyerang, bukan rahasia
    req = urllib.request.Request(f"http://127.0.0.1:{port}{path}", method="POST",
                                 data=json.dumps(body).encode(), headers=headers)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def login(port, email, pw, ip=None, lewat_proxy=False, penanda=None):
    return _post(port, "/login", {"email": email, "password": pw}, ip, lewat_proxy, penanda)


def ganti(port, email, lama, baru):
    return _post(port, "/ganti-password",
                 {"email": email, "password_lama": lama, "password_baru": baru})


def hitung_server(port):
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/lab/hitung") as r:
        b = json.loads(r.read())
    return b["argon2id"], b["query_akun"]


def hitung_nilai(port):
    """Tebakan yang dinilai terhadap hash asli sebuah akun (bukan hashPalsu)."""
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/lab/hitung") as r:
        return json.loads(r.read())["dinilai"]


def sisa_kunci(email, sekarang_ms):
    ms = psql("SELECT (extract(epoch FROM terkunci_sampai) * 1000)::bigint FROM c4_login.akun"
              f" WHERE email = '{email}'")
    return (int(ms) - sekarang_ms) // 1000


def ringkas(kode):
    return " · ".join(f"{k}: {kode.count(k)}" for k in sorted(set(kode)))


def hitung(kode):
    d = {}
    for k in kode:
        d[k] = d.get(k, 0) + 1
    return d


def harap(dapat, mau, pesan):
    # Lab gagal keras bila hasil berbeda dari harapan, tanpa macet (keluar dengan kode != 0).
    if dapat != mau:
        raise SystemExit(f"GAGAL lab c4-ratelimit/login — {pesan}: dapat {dapat!r}, mau {mau!r}")


_container = None


def _pg_container():
    global _container
    if _container:
        return _container
    out = subprocess.run(["docker", "ps", "--filter", "publish=54333", "--format", "{{.Names}}"],
                         capture_output=True, text=True)
    _container = out.stdout.strip().splitlines()[0]
    return _container


def psql(sql):
    out = subprocess.run(
        ["docker", "exec", "-i", _pg_container(), "psql", "-U", "lab", "-d", "lab", "-tAc", sql],
        capture_output=True, text=True)
    return out.stdout.strip()


def db_akun(kolom, email):
    return psql(f"SELECT {kolom} FROM c4_login.akun WHERE email = '{email}'")


# ---------------------------------------------------------------- bagian A
def bagian_a():
    tulis("== A. Parameter argon2id dan skema c4_login")
    tulis("Hash password: argon2id, m=65536 KiB (64 MiB), t=3, p=4, salt 128-bit, tag 256-bit.")
    tulis("  Sumber: RFC 9106 §4 pilihan kedua (t=3, p=4, m=64 MiB); OWASP Password Storage Cheat Sheet")
    tulis("  (minimum 19 MiB, t=2, p=1 — kita di atasnya); golang.org/x/crypto/argon2 IDKey v0.57.0.")
    tulis("  Satu VPS berbagi memori dengan PostgreSQL, jadi pilihan pertama RFC (m=2 GiB) tidak dipakai.")
    tulis("Kunci per akun: ambang 5 gagal berturut, durasi menggandakan 60s→120s→...→32m")
    tulis("  (OWASP Authentication Cheat Sheet: penghitung melekat pada akun, kunci boleh bertahap;")
    tulis("  NIST SP 800-63B §3.2.2: batas atas 100 percobaan per authenticator, kita lebih ketat).")
    tulis("Rate limit di memori: per IP 10 burst (isi ulang 10/menit), per akun 5 burst (5/menit).")
    tulis("Redis TIDAK dipakai (ADR 20): cukup untuk satu server; batasnya di bagian F.")
    tulis("")
    tulis("Seed akun (fiktif):")
    for email, cat in [
        ("warung.ani@lestari.example", "Warung Ani — password sudah diganti (sasaran DoS di bagian C)"),
        ("budi@lestari.example", "Budi — password sudah diganti"),
        ("karyawan514@lestari.example", "Karyawan 514 — memakai ulang password yang ada di daftar bocor"),
        ("karyawan515@lestari.example", "Karyawan 515 — masih password sementara admin, wajib ganti"),
    ]:
        wajib = db_akun("wajib_ganti_password", email)
        tulis(f"  {email:<34} wajib_ganti_password={wajib:<5}  {cat}")
    tulis("  karyawan516..543                   28 akun password kuat unik (bukan di daftar bocor)")
    tulis("")


# ---------------------------------------------------------------- bagian B
def bagian_b():
    tulis("== B. Wajib ganti password pertama; password baru lemah atau bocor ditolak")
    p = server(18170)
    jam(18170, T0_MS)
    E = "karyawan515@lestari.example"
    st, b = login(18170, E, "sementara-515", lewat_proxy=True)
    tulis(f"login password sementara benar          {st}  wajib_ganti_password={b.get('wajib_ganti_password')}")
    harap((st, b.get("wajib_ganti_password")), (200, True), "B login sementara wajib ganti")
    st, b = ganti(18170, E, "sementara-515", "pendek-123")
    tulis(f"ganti ke 'pendek-123' (10 karakter)     {st}  {b.get('title','')}")
    harap(st, 422, "B tolak password pendek")
    st, b = ganti(18170, E, "sementara-515", "rekeningolestari")
    tulis(f"ganti ke 'rekeningolestari' (16 kar, bocor) {st}  {b.get('title','')}")
    harap(st, 422, "B tolak password bocor")
    st, b = ganti(18170, E, "sementara-515", "kelas-pagi-hijau-515")
    tulis(f"ganti ke password kuat baru             {st}  ok={b.get('ok')}")
    harap((st, b.get("ok")), (200, True), "B terima password kuat")
    st, b = login(18170, E, "kelas-pagi-hijau-515", lewat_proxy=True)
    tulis(f"login password baru                     {st}  wajib_ganti_password={b.get('wajib_ganti_password')}")
    harap((st, b.get("wajib_ganti_password")), (200, False), "B login password baru")
    jam(18170, T0_MS + 60_000)  # semenit kemudian: /ganti-password ikut memakai jatah per akun
    st, b = login(18170, E, "sementara-515", lewat_proxy=True)
    tulis(f"login password lama (sementara)         {st}  {b.get('title','')}")
    harap(st, 401, "B password lama ditolak")
    p.terminate(); p.wait()
    tulis("")


# ---------------------------------------------------------------- bagian C
def bagian_c():
    tulis("== C. Pertahanan NAIF: kunci per akun saja (MODE=per-akun)")
    tulis("Credential stuffing: satu penyerang (IP 203.0.113.9) menyemprot password bocor ke banyak akun,")
    tulis("satu tebakan per akun. Kunci per akun (ambang 5) tidak pernah aktif: tiap akun cuma 1 percobaan.")
    seed()
    p = server(18170, mode="per-akun", ip_sumber="proxy")
    jam(18170, T0_MS)
    IP_SERANG = "203.0.113.9"
    bocor_umum = ["123456", "password1", "qwerty123", "rekeningo123", "indonesia", "bismillah"]
    kode = []
    tembus = []
    akun_coba = list(range(516, 544)) + [514]  # 514 di urutan terakhir
    for i, idn in enumerate(akun_coba):
        email = f"karyawan{idn}@lestari.example"
        pw = bocor_umum[i % len(bocor_umum)]
        if idn == 514:
            pw = "rekeningo123"  # password yang dipakai ulang Karyawan 514
        st, b = login(18170, email, pw, ip=IP_SERANG, lewat_proxy=True)
        kode.append(st)
        if st == 200:
            tembus.append(idn)
    tulis(f"  {len(akun_coba)} akun disemprot dari {IP_SERANG} → {ringkas(kode)}")
    tulis(f"  akun tertembus: {tembus} (Karyawan 514 memakai ulang 'rekeningo123')")
    harap((hitung(kode), tembus), ({200: 1, 401: 28}, [514]), "C stuffing hanya 514 tertembus")
    jml_terkunci = psql("SELECT count(*) FROM c4_login.akun WHERE terkunci_sampai IS NOT NULL")
    tulis(f"  akun yang terkunci oleh serangan ini: {jml_terkunci} (kunci per akun tidak menolong stuffing)")
    harap(jml_terkunci, "0", "C stuffing tidak mengunci akun mana pun")
    tulis("")
    tulis("Denial of service + kunci bertahap: penyerang sengaja menggagalkan login Ani untuk menguncinya.")
    ANI = "warung.ani@lestari.example"
    ANI_IP = "198.51.100.7"
    # Kunci ke-1: 5 gagal berturut di T0 → kunci 60 detik.
    jam(18170, T0_MS)
    kode = [login(18170, ANI, f"tebakan-{i}", ip=IP_SERANG, lewat_proxy=True)[0] for i in range(5)]
    tulis(f"  5 tebakan salah ke akun Ani            → {ringkas(kode)}")
    st, b = login(18170, ANI, "payung-biru-ani-2026", ip=ANI_IP, lewat_proxy=True)
    sisa = sisa_kunci(ANI, T0_MS)
    tulis(f"  kunci ke-1: Ani (IP sendiri, password BENAR) ditolak {st} {b['title']}")
    tulis(f"    database: terkunci_sampai {sisa} s lagi. Jawabannya sama dengan password salah,")
    tulis("    jadi penyerang tidak tahu akun ini terdaftar dan terkunci; Ani mengira lupa password.")
    harap((st, b["type"], sisa), (401, "/problems/login-gagal", 60), "C kunci ke-1 = 60 detik, jawaban generik")
    # Kunci ke-2: lewati kunci pertama, 1 gagal → gagal_login 6 → kunci 120 detik.
    t = T0_MS + 61_000
    jam(18170, t)
    login(18170, ANI, "lagi-salah", ip=IP_SERANG, lewat_proxy=True)
    st, _ = login(18170, ANI, "payung-biru-ani-2026", ip=ANI_IP, lewat_proxy=True)
    sisa = sisa_kunci(ANI, t)
    tulis(f"  kunci ke-2: kunci pertama lewat, 1 gagal lagi → Ani ditolak {st}, terkunci {sisa} s lagi (dua kali lipat)")
    harap((st, sisa), (401, 120), "C kunci ke-2 = 120 detik")
    # Kunci ke-3: lewati kunci kedua, 1 gagal → gagal_login 7 → kunci 240 detik.
    t = t + 121_000
    jam(18170, t)
    login(18170, ANI, "lagi-salah", ip=IP_SERANG, lewat_proxy=True)
    st, _ = login(18170, ANI, "payung-biru-ani-2026", ip=ANI_IP, lewat_proxy=True)
    sisa = sisa_kunci(ANI, t)
    tulis(f"  kunci ke-3: 1 gagal lagi → Ani ditolak {st}, terkunci {sisa} s lagi (dua kali lipat lagi)")
    harap((st, sisa), (401, 240), "C kunci ke-3 = 240 detik")
    tulis("  Ani terkunci berulang tiap pagi; kunci per akun saja menghukum korban, bukan penyerang.")
    p.terminate(); p.wait()
    tulis("")


# ---------------------------------------------------------------- bagian D
def bagian_d():
    tulis("== D. Rate limit DUA LAPIS di memori (MODE=dua-lapis): per IP dan per akun")
    tulis("Serangan sama seperti C, tapi lapis per-IP menolak banjir dari satu IP sebelum menyentuh database.")
    seed()
    p = server(18170, mode="dua-lapis", ip_sumber="proxy")
    jam(18170, T0_MS)
    IP_SERANG = "203.0.113.9"
    bocor_umum = ["123456", "password1", "qwerty123", "indonesia", "bismillah", "qwerty"]
    kode = []
    akun_coba = list(range(516, 544)) + [514]
    for i, idn in enumerate(akun_coba):
        email = f"karyawan{idn}@lestari.example"
        pw = "rekeningo123" if idn == 514 else bocor_umum[i % len(bocor_umum)]
        st, _ = login(18170, email, pw, ip=IP_SERANG, lewat_proxy=True)
        kode.append(st)
    tulis(f"  {len(akun_coba)} akun disemprot dari {IP_SERANG} → {ringkas(kode)}")
    tulis("  (429 = ditolak lapis per-IP; Karyawan 514 di urutan akhir tidak sempat dicoba)")
    harap(hitung(kode), {401: 10, 429: 19}, "D per-IP membatasi serangan satu IP")
    n_hash, n_query = hitung_server(18170)
    tulis(f"  argon2id dijalankan {n_hash} kali, query akun {n_query} kali untuk {len(akun_coba)} percobaan")
    tulis("  (yang ditolak 429 tidak menyentuh database dan tidak menjalankan argon2id)")
    harap((n_hash, n_query), (10, 10), "D rate limit dicek sebelum database dan argon2id")
    st, b = login(18170, "warung.ani@lestari.example", "payung-biru-ani-2026",
                  ip="198.51.100.7", lewat_proxy=True)
    tulis(f"  Ani (IP sendiri, password BENAR)       → {st}  ok={b.get('ok')} (tidak kena limit penyerang)")
    harap((st, b.get("ok")), (200, True), "D Ani tetap bisa masuk")
    tulis("")
    tulis("Lapis per-akun: tebakan terfokus ke satu akun dari satu IP dibatasi walau IP belum penuh.")
    kode = []
    for i in range(8):
        st, _ = login(18170, "budi@lestari.example", f"tebak-budi-{i}", ip="203.0.113.50", lewat_proxy=True)
        kode.append(st)
    tulis(f"  8 tebakan ke akun Budi dari satu IP     → {ringkas(kode)}")
    tulis("  (5 sampai ke pemeriksaan password, sisanya 429 dari lapis per-akun)")
    harap(hitung(kode), {401: 5, 429: 3}, "D per-akun membatasi tebakan terfokus")
    st, b = ganti(18170, "budi@lestari.example", "tebak-budi-8", "tebakan-panjang-sekali-8")
    tulis(f"  tebakan ke-9 lewat /ganti-password (password lama) → {st} {b.get('title','')}")
    tulis("  (endpoint yang memeriksa password lama memakai pengaman yang sama, bukan pintu samping)")
    harap((st, b.get("type")), (429, "/problems/rate-limit-akun"), "D /ganti-password ikut dibatasi")
    p.terminate(); p.wait()
    tulis("")


# ---------------------------------------------------------------- bagian E
def bagian_e():
    tulis("== E. IP dari header: memercayai X-Forwarded-For dari client sembarang adalah CELAH")
    tulis("Penyerang mengirim tiap percobaan dengan X-Forwarded-For berbeda (menukar IP), tanpa lewat proxy kita.")
    # E1: server percaya header dari siapa pun
    seed()
    p = server(18170, mode="dua-lapis", ip_sumber="xff-mentah")
    jam(18170, T0_MS)
    kode = []
    for i in range(20):
        email = f"karyawan{516 + i}@lestari.example"
        st, _ = login(18170, email, "qwerty123", ip=f"203.0.113.{100 + i}", lewat_proxy=False)
        kode.append(st)
    tulis(f"  IP_SUMBER=xff-mentah: 20 percobaan, tiap kali IP palsu baru → {ringkas(kode)}")
    tulis("  (tidak ada 429: lapis per-IP tak berguna karena penyerang menukar IP tiap request)")
    harap(hitung(kode), {401: 20}, "E1 xff-mentah: penukaran IP memintas lapis per-IP")
    p.terminate(); p.wait()
    # E2: server hanya percaya header dari proxy tepercaya; penyerang menebak isi penanda
    seed()
    p = server(18170, mode="dua-lapis", ip_sumber="proxy")
    jam(18170, T0_MS)
    kode = []
    for i in range(20):
        email = f"karyawan{516 + i}@lestari.example"
        st, _ = login(18170, email, "qwerty123", ip=f"203.0.113.{100 + i}", penanda="tepercaya")
        kode.append(st)
    tulis(f"  IP_SUMBER=proxy, penyerang menebak penanda proxy → {ringkas(kode)}")
    tulis("  (penanda tanpa rahasia yang benar diabaikan, IP diambil dari koneksi 127.0.0.1;")
    tulis("  10 lolos lalu 429: penukaran IP gagal)")
    harap(hitung(kode), {401: 10, 429: 10}, "E2 proxy: header tak tepercaya diabaikan, IP koneksi dipakai")
    st, b = login(18170, "warung.ani@lestari.example", "payung-biru-ani-2026",
                  ip="198.51.100.7", lewat_proxy=True)
    tulis(f"  Request LEWAT proxy kita (penanda berisi rahasia bersama), IP dari header dipercaya → {st} ok={b.get('ok')}")
    harap((st, b.get("ok")), (200, True), "E2 request lewat proxy tepercaya diterima")
    p.terminate(); p.wait()
    tulis("")


# ---------------------------------------------------------------- bagian F
def bagian_f():
    tulis("== F. Dua instance: bucket di memori tidak dibagi (ADR 20)")
    tulis("Rate limit hidup di memori tiap proses. Dengan dua server, penyerang satu IP yang bergantian")
    tulis("mengenai instance 1 dan 2 mendapat dua kali jatah: batas per IP efektif menggandakan.")
    seed()
    p1 = server(18170, mode="dua-lapis", ip_sumber="proxy")
    p2 = server(18171, mode="dua-lapis", ip_sumber="proxy")
    jam(18170, T0_MS); jam(18171, T0_MS)
    IP_SERANG = "203.0.113.9"
    kode = []
    for i in range(24):
        port = 18170 if i % 2 == 0 else 18171
        email = f"karyawan{516 + (i % 28)}@lestari.example"
        st, _ = login(port, email, "qwerty123", ip=IP_SERANG, lewat_proxy=True)
        kode.append(st)
    tulis(f"  24 percobaan satu IP, bergantian ke 2 instance → {ringkas(kode)}")
    tulis("  (20 lolos = 10 per instance, bukan 10 total; Redis bersama akan menyatukannya — Tahap 3)")
    harap(hitung(kode), {401: 20, 429: 4}, "F dua instance: batas per IP menggandakan")
    p1.terminate(); p2.terminate(); p1.wait(); p2.wait()
    tulis("")


# ---------------------------------------------------------------- bagian G
def bagian_g():
    tulis("== G. Kunci atomik: tebakan bersamaan tidak melewati ambang (keputusan 659)")
    tulis("Percobaan dicatat SEBELUM argon2id, dengan baris akun dikunci (SELECT ... FOR UPDATE), dan percobaan")
    tulis("yang sampai ambang langsung memasang kunci. Tebakan lain menunggu lock baris lalu melihat kunci itu.")
    seed()
    p = server(18170, mode="dua-lapis", ip_sumber="proxy")
    jam(18170, T0_MS)
    E = "karyawan516@lestari.example"
    psql(f"UPDATE c4_login.akun SET gagal_login = 4 WHERE email = '{E}'")
    tulis("Karyawan 516 sudah salah 4 kali berturut-turut (ambang 5). Lima tebakan salah datang bersamaan,")
    tulis("tiap kali dari alamat berbeda supaya lapis memori (per IP 10, per akun 5) tidak ikut menahan.")
    n_hash0, _ = hitung_server(18170)
    nilai0 = hitung_nilai(18170)
    gerbang = threading.Barrier(5)

    def tebak(i):
        gerbang.wait()
        return login(18170, E, f"tebakan-salah-{i}", ip=f"2001:db8:{i}::1", lewat_proxy=True)[0]

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
        kode = list(ex.map(tebak, range(5)))
    n_hash1, _ = hitung_server(18170)
    dinilai = hitung_nilai(18170) - nilai0
    tulis(f"  lima tebakan bersamaan → {ringkas(kode)}")
    tulis(f"  dinilai terhadap hash asli: {dinilai}; argon2id dijalankan {n_hash1 - n_hash0} kali "
          "(empat lainnya dijawab dengan hash palsu supaya waktu responsnya sama)")
    sisa = sisa_kunci(E, T0_MS)
    gagal = db_akun("gagal_login", E)
    tulis(f"  database: gagal_login {gagal}, terkunci_sampai {sisa} s lagi")
    harap((hitung(kode), dinilai, n_hash1 - n_hash0, gagal, sisa), ({401: 5}, 1, 5, "5", 60),
          "G tebakan bersamaan: hanya satu yang dinilai, akun terkunci 60 detik")
    jam(18170, T0_MS + 30_000)
    nilai0 = hitung_nilai(18170)
    st, _ = login(18170, E, "tebakan-keenam", ip="2001:db8:9::1", lewat_proxy=True)
    gagal = db_akun("gagal_login", E)
    dinilai = hitung_nilai(18170) - nilai0
    tulis(f"  tebakan keenam saat terkunci (30 s kemudian) → {st}; dinilai {dinilai}, gagal_login tetap {gagal}")
    tulis("  (akun yang sedang terkunci tidak menaikkan penghitung dan tidak memberi percobaan)")
    harap((st, dinilai, gagal), (401, 0, "5"), "G saat terkunci tidak ada percobaan baru")
    jam(18170, T0_MS + 61_000)
    st, b = login(18170, E, "kampus-aman-516-ungu", ip="2001:db8:9::1", lewat_proxy=True)
    gagal = db_akun("gagal_login", E)
    kunci = db_akun("terkunci_sampai IS NOT NULL", E)
    tulis(f"  password BENAR sesudah kunci lewat (61 s) → {st} ok={b.get('ok')}; gagal_login {gagal}, "
          f"terkunci {'ya' if kunci == 't' else 'tidak'}")
    tulis("  (menurut kode, percobaan itu dicatat lebih dulu: penghitung naik ke 6 dan kunci 120 s dipasang sebelum argon2id;")
    tulis("  password benar menghapus keduanya)")
    harap((st, gagal, kunci), (200, "0", "f"), "G password benar menghapus penghitung dan kunci")
    p.terminate(); p.wait()
    tulis("")


# ---------------------------------------------------------------- bagian H
def bagian_h():
    tulis("== H. Key per IP memotong IPv6 ke prefix /64 (keputusan 660)")
    tulis("RFC 6459 bagian 5.2: jaringan seluler memberi tiap default bearer satu prefix /64 unik, dan HP boleh")
    tulis("memakai interface identifier apa pun untuk alamat yang ia susun sendiri. IPv4 dan IPv4 yang ditulis")
    tulis("sebagai IPv6 (::ffff:a.b.c.d) tetap satu key. Alamat lewat X-Lab-IP dari proxy kita (IP_SUMBER=proxy).")
    seed()
    p = server(18170, mode="dua-lapis", ip_sumber="proxy")
    jam(18170, T0_MS)
    kode = []
    for i in range(12):
        ip = f"2001:db8:a:b:{i + 1:x}:{0x10 + i:x}:{0x200 + i:x}:{0xf000 + i:x}"  # 12 alamat berbeda, satu /64
        kode.append(login(18170, f"karyawan{516 + i}@lestari.example", "qwerty123", ip=ip, lewat_proxy=True)[0])
    tulis(f"  12 alamat berbeda dalam 2001:db8:a:b::/64, 12 akun berbeda → {ringkas(kode)}")
    tulis("  (satu bucket per /64: 10 lolos, 2 ditolak 429 lapis per-IP)")
    harap(hitung(kode), {401: 10, 429: 2}, "H satu /64 berbagi satu bucket")
    st, _ = login(18170, "karyawan528@lestari.example", "qwerty123", ip="2001:db8:a:c::1", lewat_proxy=True)
    tulis(f"  alamat dari /64 lain (2001:db8:a:c::/64) → {st} (bucket sendiri)")
    harap(st, 401, "H /64 lain punya bucket sendiri")
    kode = []
    for i in range(12):
        ip = "203.0.113.9" if i % 2 == 0 else "::ffff:203.0.113.9"
        kode.append(login(18170, f"karyawan{529 + i}@lestari.example", "qwerty123", ip=ip, lewat_proxy=True)[0])
    tulis(f"  203.0.113.9 dan ::ffff:203.0.113.9 bergantian, 12 percobaan → {ringkas(kode)} (satu bucket)")
    harap(hitung(kode), {401: 10, 429: 2}, "H IPv4 dan IPv4-mapped berbagi bucket")
    tulis("  Batasnya: banyak HP yang berbagi satu /64 (mis. Wi-Fi kantor IPv6) berbagi satu bucket, sama seperti")
    tulis("  banyak HP di balik satu IPv4 (NAT). Key alamat penuh tidak dijalankan di sini: hasilnya diukur lewat")
    tulis("  uji mutasi (keputusan 660), alasannya sama dengan bagian E1.")
    p.terminate(); p.wait()
    tulis("")


# ---------------------------------------------------------------- bagian I
def bagian_i():
    tulis("== I. /ganti-password menolak password dari daftar bocor fiktif (keputusan 661)")
    entri = [b.strip() for b in (LOGIN / "daftar-bocor.txt").read_text().splitlines()
             if b.strip() and not b.startswith("#")]
    sesuai = [e for e in entri if len(e) >= 15]
    tulis(f"Daftar fiktif lab (login/daftar-bocor.txt): {len(entri)} entri, {len(sesuai)} di antaranya ≥ 15 karakter")
    tulis("(kebijakan panjang NIST SP 800-63B-4 3.1.1.2). Pembandingan seluruh password, tanpa membedakan huruf besar/kecil.")
    tulis("ASVS 5.0.0 6.2.4 (L1) meminta daftar minimal 3.000 password teratas yang sesuai kebijakan; daftar lab")
    tulis("hanya menunjukkan mekanismenya. Daftar sungguhan sebesar itu tidak dijalankan di lab ini [perlu verifikasi].")
    harap(len(sesuai) > 0, True, "I daftar punya entri yang lolos kebijakan panjang")
    seed()
    p = server(18170, mode="dua-lapis", ip_sumber="koneksi")
    jam(18170, T0_MS)
    E = "karyawan519@lestari.example"
    lama = "kampus-aman-519-ungu"
    for baru, mau, tipe, ket in [
        ("REKENINGOLESTARI", 422, "/problems/password-bocor", "16 kar., huruf besar, entri daftar"),
        ("123456789012345", 422, "/problems/password-bocor", "tepat 15 kar., entri daftar"),
        ("rekeningo123", 422, "/problems/password-lemah", "12 kar., entri daftar tapi lebih pendek dari kebijakan"),
        ("rekeningolestari1", 200, None, "16 kar., bukan entri daftar"),
    ]:
        st, b = ganti(18170, E, lama, baru)
        tulis(f"  ganti ke '{baru}' ({ket}) → {st} {b.get('title', 'ok=' + str(b.get('ok')))}")
        harap((st, b.get("type")), (mau, tipe), f"I ganti ke {baru}")
    tulis("  (panjang diperiksa lebih dulu: entri daftar yang lebih pendek dari kebijakan sudah ditolak karena pendek)")
    p.terminate(); p.wait()
    tulis("")


# ---------------------------------------------------------------- bagian J
def bagian_j():
    tulis("== J. Tes Go login/pengaman*_test.go (keputusan 659-661)")
    r = subprocess.run(["go", "test", "-count=1", "-v", "./..."], cwd=LOGIN, capture_output=True, text=True,
                       env=dict(os.environ, TEST_DATABASE_URL=DB))
    hasil = re.findall(r"^--- (PASS|FAIL|SKIP): (\w+)", r.stdout, re.M)
    if r.returncode != 0 or not hasil or any(h != "PASS" for h, _ in hasil):
        raise SystemExit("GAGAL lab c4-ratelimit/login — J tes Go gagal atau dilewati:\n" + r.stdout[-3000:] + r.stderr[-1000:])
    for h, nama in hasil:
        tulis(f"  {h} {nama}")
    tulis("")


def main():
    build()
    seed()
    OUT.mkdir(parents=True, exist_ok=True)
    bagian_a()
    bagian_b()
    bagian_c()
    bagian_d()
    bagian_e()
    bagian_f()
    bagian_g()
    bagian_h()
    bagian_i()
    bagian_j()
    (OUT / "ratelimit.txt").write_text("\n".join(log) + "\n")
    print("\n".join(log))


if __name__ == "__main__":
    main()
