"""Lab e5-payload versi ledger (keputusan 818): ukuran response riwayat Budi, mentah dan gzip.

Menggantikan rekaman skema b2q lama (daftar pesanan) untuk halaman 2.20; output/ukuran.txt dan output/dart-header.txt
lama (halaman E5 versi lama) tidak disentuh. Rekaman baru di output/ledger/:
  ukuran.txt       tiga bentuk response riwayat (api, layar, penuh), 5/20/50 baris, mentah dan gzip, hitungan kuota
  header.txt       Accept-Encoding yang berbeda-beda ke server lab, Content-Encoding dan Vary yang kembali
  dart-header.txt  client Dart (HttpClient bawaan) ke server yang sama
Sumber data: labs/b2-query/ledger_data.py (760.448 posting; Budi 3.892) dimuat ke schema e5_ledger milik lab ini.
Response dibuat server Go labs/e5-payload/riwayat, yang memuat salinan persis query dan JSON api-t2.
Hanya byte, jumlah baris, rasio, dan struktur yang direkam; tanpa waktu. Lab gagal keras bila blok salinan berbeda
dari labs/api-t2, bila gzip tidak kembali sama dengan isi aslinya, atau bila angkanya meleset dari data.

    make -C labs/e5-payload run-ledger     (rekam ke output/ledger/)
    make -C labs/e5-payload cek-ledger     (rekam ulang ke folder sementara, bandingkan dengan yang di-commit)
"""
import contextlib
import gzip
import http.client
import json
import os
import pathlib
import re
import socket
import subprocess
import sys
import tempfile
import time

import psycopg

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "labs/b2-query"))
import ledger_data as L                                   # noqa: E402  data yang sama dengan lab b2-query
from rekam_ledger import gagal, harap, tabel              # noqa: E402

OUT = HERE / "output" / "ledger"
API = ROOT / "labs/api-t2"
SCHEMA = "e5_ledger"
HOST, PORT = "127.0.0.1", 18150
DSN = "host=127.0.0.1 port=54333 user=lab password=lab dbname=lab application_name=e5-payload"
URL = f"postgres://lab:lab@127.0.0.1:54333/lab?search_path={SCHEMA}&application_name=e5-payload"
BUDI = L.BUDI
BARIS = (5, 20, 50)
BENTUK = ("api", "layar", "penuh")
KUOTA = 1_000_000_000          # Asumsi: paket 1 GB per bulan
HARI_BULAN = 30                # Asumsi
BUKA_PER_HARI = (5, 20, 100)   # Asumsi

BARIS_TOOLCHAIN = "-- toolchain:"   # tidak dibandingkan: versi alat boleh berbeda antar mesin


def ribuan(n):
    return f"{n:,}".replace(",", ".")


def persen(a, b, desimal=1):
    """a/b dalam persen, pembulatan bilangan bulat, koma desimal (tanpa float)."""
    k = 10 ** desimal
    v = (2 * a * 100 * k + b) // (2 * b)
    return f"{v // k},{v % k:0{desimal}d} %"


def kali(a, b):
    """a/b sebagai kelipatan dengan dua desimal, koma desimal (tanpa float)."""
    v = (2 * a * 100 + b) // (2 * b)
    return f"{v // 100},{v % 100:02d}x"


def perintah(*a, **kw):
    r = subprocess.run(a, capture_output=True, text=True, **kw)
    if r.returncode:
        gagal(f"{' '.join(a)}: {(r.stderr or r.stdout).strip()[:300]}")
    return r.stdout.strip()


# ---------- data ----------

def muat():
    """Schema bersih, data b2-query dimuat (trigger invarian dimatikan selama COPY), index riwayat seperti api-t2."""
    d = L.Data()
    with psycopg.connect(DSN, autocommit=False) as c:
        c.execute(f"DROP SCHEMA IF EXISTS {SCHEMA} CASCADE")
        c.execute(f"CREATE SCHEMA {SCHEMA}")
        c.execute(f"SET search_path = {SCHEMA}")
        c.execute((ROOT / "labs/b3-ledger/schema.sql").read_text())
        for t in ("jurnal", "posting"):
            c.execute(f"ALTER TABLE {t} DISABLE TRIGGER USER")
        for nama, kolom, isi in (("akun", "id, nama, email, peran", d.akun_tsv()),
                                 ("buku", "id, akun_id, jenis, saldo_cache", d.buku_tsv()),
                                 ("jurnal", "id, jenis, keterangan, dibuat_oleh, dibuat", "".join(d.jurnal)),
                                 ("posting", "id, jurnal_id, buku_id, jumlah, dibuat", "".join(d.posting))):
            with c.cursor().copy(f"COPY {nama} ({kolom}) FROM STDIN") as cp:
                cp.write(isi)
        for t in ("jurnal", "posting"):
            c.execute(f"ALTER TABLE {t} ENABLE TRIGGER USER")
        c.execute("CREATE INDEX posting_riwayat ON posting (buku_id, dibuat, id)")   # labs/api-t2 migrasi 000011
        c.commit()
        c.execute("ANALYZE")
        jurnal, posting = c.execute("SELECT (SELECT count(*) FROM jurnal), (SELECT count(*) FROM posting)").fetchone()
        budi = c.execute("SELECT count(*) FROM posting p JOIN buku b ON b.id = p.buku_id WHERE b.akun_id = %s",
                         (BUDI,)).fetchone()[0]
        versi = c.execute("SHOW server_version").fetchone()[0].split()[0]
        c.commit()
    harap((jurnal, posting, budi), (380_224, 760_448, 3_892), "jurnal, posting, posting Budi")
    return jurnal, posting, budi, versi


# ---------- salinan dari api-t2 ----------

def blok_api_t2():
    """Blok kode api-t2 yang disalin persis ke riwayat/main.go: [(nama, teks)]. Gagal dengan pesan jelas bila api-t2
    berubah sampai blok tidak ditemukan lagi."""
    repo = (API / "internal/repo/riwayat.go").read_text()
    svc = (API / "internal/service/riwayat.go").read_text()
    han = (API / "internal/handler/handler.go").read_text()

    def cari(nama, pola, teks):
        m = re.search(pola, teks, re.S)
        if not m:
            gagal(f"blok tidak ditemukan di labs/api-t2 (strukturnya berubah?): {nama}")
        return m

    def antara(nama, teks, tanda):
        return cari(nama, r"// --8<-- \[start:%s\]\n(.*?)// --8<-- \[end:%s\]" % (tanda, tanda), teks).group(1)

    n = ["struct Riwayat dan Kursor (repo/riwayat.go)",
         "repo.Riwayat (repo/riwayat.go, bagian riwayat)",
         "tulisKursor dan bacaKursor (service/riwayat.go, bagian kursor)",
         "tulisJSON (handler/handler.go)",
         "amplop response (handler/handler.go, bagian riwayat)"]
    return [
        (n[0], cari(n[0], r"// Riwayat adalah satu posting.*?\n\}\n\n// Kursor menunjuk.*?\n\}\n", repo).group(0)),
        (n[1], antara(n[1], repo, "riwayat")),
        (n[2], antara(n[2], svc, "kursor").replace("repo.", "")),
        (n[3], cari(n[3], r"func tulisJSON.*?\n\}\n", han).group(0)),
        # Amplop response: di main.go isinya bernama isi (bisa daftar api, daftar layar, atau penuh), selebihnya sama.
        (n[4], cari(n[4], r'tulisJSON\(w, 200, map\[string\]any\{"riwayat": daftar, "berikutnya": k\}\)',
                    antara(n[4], han, "riwayat")).group(0).replace("daftar", "isi")),
    ]


def periksa_salinan():
    main = (HERE / "riwayat/main.go").read_text()
    for nama, teks in blok_api_t2():
        if teks.strip() not in main:
            gagal(f"riwayat/main.go tidak lagi memuat salinan persis dari labs/api-t2: {nama}")
    n = 0
    for p in list((API / "cmd").rglob("*.go")) + list((API / "internal").rglob("*.go")):
        n += len(re.findall(r"gzip|content-encoding|compress", p.read_text(), re.I))
    harap(n, 0, "baris gzip, Content-Encoding, atau compress di labs/api-t2 (api-t2 tidak mengompres)")
    return len(blok_api_t2()), n


# ---------- server lab ----------

@contextlib.contextmanager
def server():
    with socket.socket() as s:
        if s.connect_ex((HOST, PORT)) == 0:
            gagal(f"port {PORT} sudah dipakai proses lain")
    with tempfile.TemporaryDirectory() as t:
        biner = pathlib.Path(t) / "riwayat"
        perintah("go", "build", "-o", str(biner), ".", cwd=HERE / "riwayat")
        log = open(pathlib.Path(t) / "server.log", "w")
        p = subprocess.Popen([str(biner), "-addr", f"{HOST}:{PORT}"], env=dict(os.environ, DATABASE_URL=URL),
                             stdout=log, stderr=log)
        try:
            for _ in range(100):
                if p.poll() is not None:
                    gagal("server lab berhenti: " + (pathlib.Path(t) / "server.log").read_text()[:300])
                with socket.socket() as s:
                    if s.connect_ex((HOST, PORT)) == 0:
                        break
                time.sleep(0.1)
            else:
                gagal("server lab tidak mendengar di port " + str(PORT))
            yield
        finally:
            p.terminate()
            p.wait(timeout=10)
            log.close()


def ambil(path, ae):
    """GET apa adanya: ae = nilai Accept-Encoding atau None (header tidak dikirim). Body mentah, tanpa decode."""
    c = http.client.HTTPConnection(HOST, PORT, timeout=60)
    c.putrequest("GET", path, skip_accept_encoding=True)   # http.client menambah 'identity' sendiri bila tidak
    if ae is not None:
        c.putheader("Accept-Encoding", ae)
    c.endheaders()
    r = c.getresponse()
    body = r.read()
    c.close()
    return r.status, r.getheaders(), body


def jalur(n, bentuk):
    return f"/akun/{BUDI}/riwayat?batas={n}" + ("" if bentuk == "api" else f"&bentuk={bentuk}")


def header(hs, nama):
    for k, v in hs:
        if k.lower() == nama.lower():
            return v
    return None


# ---------- rekaman ----------

class Rekaman:
    def __init__(self, judul, versi_pg, alat, catatan=""):
        self.baris = [f"-- Lab e5-payload versi ledger · {judul}",
                      f"-- PostgreSQL {versi_pg} · schema {SCHEMA} · server Go labs/e5-payload/riwayat · "
                      "make -C labs/e5-payload run-ledger (keputusan 818)",
                      "-- Hanya byte, jumlah baris, rasio, dan struktur; tanpa waktu. Rekaman dari database bersih.",
                      f"{BARIS_TOOLCHAIN} {alat}" + (f"; {catatan}" if catatan else "")]

    def __call__(self, teks=""):
        self.baris.extend(teks.split("\n") if isinstance(teks, str) else teks)

    def bagian(self, judul):
        self(f"\n# --- {judul} ---")

    def tulis(self, folder, nama):
        folder.mkdir(parents=True, exist_ok=True)
        (folder / nama).write_text("\n".join(l.rstrip() for l in self.baris) + "\n")
        print("ditulis:", folder / nama)


def pertama(body):
    """Baris riwayat pertama sebagai teks JSON persis seperti di body (tanpa dibentuk ulang)."""
    m = re.search(rb'"riwayat":\[(\{.*?\})(?:,\{|\])', body)
    return m.group(1).decode()


def ukuran(r, versi_pg, jurnal, posting, budi, blok):
    r.bagian("A. Asal data dan server")
    r([f"Data: labs/b2-query/ledger_data.py dimuat ke schema {SCHEMA} lewat labs/b3-ledger/schema.sql, ditambah index",
       "  posting_riwayat (buku_id, dibuat, id) seperti labs/api-t2 (migrasi 000011).",
       f"  jurnal {ribuan(jurnal)} · posting {ribuan(posting)} · Budi (akun {BUDI}) {ribuan(budi)} posting.",
       "Server: labs/e5-payload/riwayat/main.go (Go net/http). Query riwayat, struct, kursor `berikutnya`, tulisJSON, dan amplop",
       f"  sama dengan labs/api-t2: {blok} blok kode diperiksa persis sama di setiap run (body diakhiri satu newline).",
       "  api-t2 sendiri tidak mengompres: 0 baris gzip, Content-Encoding, atau compress di labs/api-t2/cmd dan internal.",
       "  Kompresi di server lab adalah middleware (Go compress/gzip, level bawaan) yang menilai Accept-Encoding.",
       "  Waktu di JSON ditulis +07:00 (server memakai Asia/Jakarta; Asumsi). Server UTC menulis Z, 5 byte lebih pendek.",
       f"Akun: Budi, halaman pertama, ?batas={', '.join(map(str, BARIS))} (api-t2 menerima 1 sampai 50).",
       "Ukuran: body response saja, byte, sesudah chunked dilepas. Header HTTP, TLS, dan request tidak dihitung."])

    hasil = {}
    contoh = {}
    for bentuk in BENTUK:
        for n in BARIS:
            s0, h0, mentah = ambil(jalur(n, bentuk), None)
            s1, h1, gz = ambil(jalur(n, bentuk), "gzip")
            harap((s0, s1), (200, 200), f"status {bentuk} {n}")
            harap(header(h0, "Content-Encoding"), None, f"{bentuk} {n}: tanpa Accept-Encoding harus tanpa coding")
            harap(header(h1, "Content-Encoding"), "gzip", f"{bentuk} {n}: Accept-Encoding gzip")
            harap(gzip.decompress(gz), mentah, f"{bentuk} {n}: isi gzip sesudah dibuka")
            isi = json.loads(mentah)
            harap(len(isi["riwayat"]), n, f"{bentuk} {n}: jumlah baris")
            harap(isi["berikutnya"] is not None, True, f"{bentuk} {n}: kursor berikutnya (halaman penuh)")
            harap(mentah.endswith(b"}\n"), True, f"{bentuk} {n}: body diakhiri newline")
            hasil[bentuk, n] = (len(mentah), len(gz))
            if n == BARIS[0]:
                contoh[bentuk] = pertama(mentah)

    r.bagian("B. Tiga bentuk response (baris riwayat pertama, JSON persis seperti di kabel)")
    r(["api   · response api-t2 apa adanya (tanpa ?bentuk): id, jenis, arah, lawan, jumlah, nominal, waktu.",
       "        `jumlah` dan `nominal` sama-sama ada: app 1.0 membaca jumlah, app 1.1 dan sesudahnya nominal.",
       "        " + contoh["api"],
       "layar · kolom yang dipakai baris layar riwayat (Asumsi: id untuk buka detail, jenis, arah, lawan, nominal, waktu).",
       "        Tanpa `jumlah`, jadi app 1.0 tidak bisa membacanya. ?bentuk=layar, bukan api-t2.",
       "        " + contoh["layar"],
       "penuh · semua kolom posting, jurnal, buku, dan akun yang disentuh query (SELECT *), dikirim utuh.",
       "        Pembanding: bentuk yang keluar bila handler menyerialisasi model apa adanya. ?bentuk=penuh, bukan api-t2.",
       "        Kolom mengikuti skema lab (labs/b3-ledger): akun hanya id, nama, email, peran. Tabel `akun` di labs/api-t2",
       "        punya kolom lain (password_hash, nomor_karyawan, gagal_login, dan seterusnya; migrasi 000009 dan 000012),",
       "        jadi SELECT * di api-t2 lebih besar dan ikut mengirim password_hash. Ukuran penuh di sini batas bawah.",
       "        " + contoh["penuh"]])

    r.bagian("C. Ukuran body (byte): mentah lawan gzip")
    baris = []
    for n in BARIS:
        for bentuk in BENTUK:
            m, g = hasil[bentuk, n]
            baris.append((n, bentuk, ribuan(m), ribuan(g), persen(g, m), ribuan(round(m / n))))
    r(tabel(["baris", "bentuk", "mentah (B)", "gzip (B)", "gzip/mentah", "mentah per baris (B)"], baris))
    r("Perbandingan dengan bentuk api (layar dalam persen, penuh dalam kelipatan):")
    banding = []
    for n in BARIS:
        (am, ag), (lm, lg), (pm, pg) = (hasil["api", n], hasil["layar", n], hasil["penuh", n])
        banding.append((n, persen(lm, am), persen(lg, ag), kali(pm, am), kali(pg, ag)))
    r(tabel(["baris", "layar/api mentah", "layar/api gzip", "penuh/api mentah", "penuh/api gzip"], banding))
    r("Isi gzip sesudah dibuka sama persis dengan isi tanpa gzip di setiap pasangan (diperiksa byte demi byte).")

    r.bagian("D. Kuota (Asumsi): halaman pertama 20 baris dibuka berulang")
    r([f"Asumsi, bukan rekaman pemakaian HP: paket 1 GB ({ribuan(KUOTA)} B) per bulan, {HARI_BULAN} hari; satu buka =",
       "  satu response 20 baris (body saja); buka per hari 5, 20, dan 100. Header HTTP, TLS, dan request lain",
       "  app tidak dihitung. Persen = B per buka x buka per hari x 30 / 1 GB."])
    kolom = ["bentuk", "gzip", "B per buka", "buka/hari untuk 1% kuota"] + [f"{b}/hari" for b in BUKA_PER_HARI]
    kuota, dua_puluh = [], {}
    for bentuk in BENTUK:
        for pakai_gzip in (False, True):
            b = hasil[bentuk, 20][1 if pakai_gzip else 0]
            satu_persen = round(KUOTA / 100 / (b * HARI_BULAN))
            per_bulan = [persen(b * x * HARI_BULAN, KUOTA, 3) for x in BUKA_PER_HARI]
            dua_puluh[bentuk, pakai_gzip] = per_bulan[1]
            kuota.append((bentuk, "ya" if pakai_gzip else "tidak", ribuan(b), ribuan(satu_persen), *per_bulan))
    r(tabel(kolom, kuota))
    r(f"Pada 20 buka per hari: api mentah {dua_puluh['api', False]} dari kuota bulanan, penuh mentah "
      f"{dua_puluh['penuh', False]}, layar gzip {dua_puluh['layar', True]}.")


def negosiasi(r):
    r.bagian("A. Satu permintaan, tujuh nilai Accept-Encoding")
    n = 20
    path = jalur(n, "api")
    r([f"GET {path}   (client: Python http.client, tanpa decode otomatis; body dihitung di kabel)",
       "Server lab: gzip bila gzip tertulis dengan q > 0, atau * dengan q > 0 dan gzip tidak tertulis sendiri",
       "(RFC 9110 12.5.3). Tanpa field itu RFC mengizinkan coding apa saja; server lab memilih tanpa coding."])
    nilai = [None, "", "gzip", "gzip, deflate, br", "gzip;q=0", "br", "*"]
    _, _, asli = ambil(path, None)
    baris = []
    for ae in nilai:
        st, hs, body = ambil(path, ae)
        ce = header(hs, "Content-Encoding")
        vary = header(hs, "Vary")
        harap(st, 200, f"status Accept-Encoding {ae!r}")
        harap(vary, "Accept-Encoding", f"Vary untuk Accept-Encoding {ae!r}")
        sama = (gzip.decompress(body) if ce == "gzip" else body) == asli
        harap(sama, True, f"isi sesudah dibuka untuk Accept-Encoding {ae!r}")
        baris.append(("(tidak dikirim)" if ae is None else "(kosong)" if ae == "" else ae, st, ce or "(tidak ada)", vary,
                      ribuan(len(body)), " ".join(f"{b:02x}" for b in body[:2]), "sama"))
    r(tabel(["Accept-Encoding", "status", "Content-Encoding", "Vary", "body (B)", "2 byte pertama", "isi sesudah dibuka"],
            baris))
    r("2 byte pertama gzip = 1f 8b (RFC 1952 2.3.1); JSON tanpa gzip dimulai 7b 22, yaitu {\".")
    harap([b[2] for b in baris], ["(tidak ada)", "(tidak ada)", "gzip", "gzip", "(tidak ada)", "(tidak ada)", "gzip"],
          "Content-Encoding per nilai Accept-Encoding")

    r.bagian("B. Header response (Date dibuang), batas=20")
    for ae in (None, "gzip"):
        _, hs, _ = ambil(path, ae)
        r(f"Accept-Encoding: {'(tidak dikirim)' if ae is None else ae}")
        r(["  " + f"{k}: {v}" for k, v in hs if k.lower() != "date"])


def versi_alat():
    go = perintah("go", "version").replace("go version ", "")
    d = subprocess.run(["dart", "--version"], capture_output=True, text=True)   # versi lama menulis ke stderr
    m = re.search(r"version: (\S+) \((\w+)\)", d.stdout + d.stderr)
    if not m:
        gagal("versi Dart tidak terbaca dari `dart --version`")
    return go, f"Dart SDK {m.group(1)} ({m.group(2)})"


def jalankan(folder):
    go, dart_v = versi_alat()
    blok, _ = periksa_salinan()
    jurnal, posting, budi, versi_pg = muat()
    gz = "ukuran gzip dapat bergeser bila versi compress/flate berbeda"
    ru = Rekaman("ukuran response riwayat Budi", versi_pg, go, gz)
    rh = Rekaman("Accept-Encoding dan gzip di kabel", versi_pg, go, gz)
    rd = Rekaman("client Dart (HttpClient bawaan) ke server lab", versi_pg, f"{dart_v}; server {go}", gz)
    with server():
        ukuran(ru, versi_pg, jurnal, posting, budi, blok)
        negosiasi(rh)
        teks_dart = perintah("dart", "run", "cek_riwayat.dart", str(PORT), cwd=HERE)
        # Dart harus menerima byte yang sama dengan yang diukur Python untuk request yang sama (bentuk api, 20 baris).
        _, _, mentah = ambil(jalur(20, "api"), None)
        _, _, gz = ambil(jalur(20, "api"), "gzip")
        diterima = [int(x.replace(".", "")) for x in re.findall(r"byte yang diterima kode app: ([\d.]+) B", teks_dart)]
        harap(diterima, [len(mentah), len(gz), len(mentah)], "byte yang diterima client Dart (A, B, C) lawan ukuran Python")
    rd("")
    rd(teks_dart)
    for r, nama in ((ru, "ukuran.txt"), (rh, "header.txt"), (rd, "dart-header.txt")):
        r.tulis(folder, nama)


def normal(teks):
    return [l.rstrip() for l in teks.split("\n") if not l.startswith(BARIS_TOOLCHAIN)]


def cek():
    """Rekam ulang ke folder sementara; bandingkan dengan output/ledger/ yang di-commit (kecuali baris toolchain)."""
    terdaftar = subprocess.run(["git", "ls-files", "--", "output/ledger/"], cwd=HERE, capture_output=True, text=True,
                               check=True).stdout.split()
    with tempfile.TemporaryDirectory() as t:
        folder = pathlib.Path(t)
        jalankan(folder)
        baru = sorted(p.name for p in folder.iterdir())
        harap(baru, sorted(pathlib.Path(x).name for x in terdaftar), "file rekaman ulang lawan git ls-files output/ledger")
        beda = 0
        for n in baru:
            a, b = normal((OUT / n).read_text()), normal((folder / n).read_text())
            if a != b:
                beda += 1
                import difflib
                print(f"BEDA {n}:\n" + "\n".join(list(difflib.unified_diff(a, b, "di-commit", "rekaman ulang", lineterm="", n=1))[:40]))
        if beda:
            gagal(f"{beda} file berbeda dari yang di-commit")
    print(f"cek-ledger: {len(baru)} file sama dengan yang di-commit (baris toolchain tidak dibandingkan)")


if __name__ == "__main__":
    cek() if "--cek" in sys.argv[1:] else jalankan(OUT)
