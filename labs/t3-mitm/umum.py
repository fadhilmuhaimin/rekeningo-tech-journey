"""Bahan bersama bagian rekaman lab t3-mitm (keputusan 977): server tepi TLS, proxy tiruan, client Dart, dan cetakan.

Server dan data awal dari `labs/api-t3/dasar_t3.py`, tanpa salinan. Yang baru di lab ini: tiga program Go kecil di
`go/` (pki: CA dan sertifikat acak di folder sementara; tepi: TLS + HSTS + log di depan api-t3; mitm: proxy tiruan
hotspot Dimas) dan client Dart di `dart/` (dart:io dan dio 5.11.0). Semua serangan hanya terhadap proses lokal di
mesin ini. Sertifikat dan kunci dibuat acak setiap lab jalan di folder sementara di luar repo, dan dihapus di akhir.
"""
import json
import pathlib
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "api-t3"))
sys.path.insert(0, str(HERE.parent))
import dasar_t3 as d  # noqa: E402,F401
from dasar_t3 import PORT, bagian, catat, curl, gagal, harap, j, samarkan, satu, sql  # noqa: E402,F401
from lab_env import port_lab  # noqa: E402

d.OUT = HERE / "output"   # dasar_t3 menulis ke folder lab api-t3 bila tidak diganti

GO = HERE / "go"
BIN = HERE / "bin"
DART = HERE / "dart"

# Port dasar lab ini (18190-18193; rekaman selalu memakai port dasar). Tidak boleh jalan bersamaan dengan lab lain
# yang memakai port yang sama di lajur yang sama.
DASAR = {"tepi": 18190, "tepi_http": 18191, "mitm": 18192, "mitm_polos": 18193}
P = {k: port_lab(v) for k, v in DASAR.items()}

BUDI = "budi@lestari.example"   # akun 419, nomor K00419
SALDO_AWAL = 250000            # tunjangan data awal (api-t3 -seed)


def tulis(nama, judul):
    d.tulis(nama, judul, lab="t3-mitm", keputusan="977")


# ---------- PKI sementara ----------

class Pki:
    """CA dan sertifikat acak di folder sementara. Nilai pin berubah di setiap run, jadi rekaman memakai nama simbolik."""

    def __init__(self):
        self.dir = pathlib.Path(tempfile.mkdtemp(prefix="t3mitm-"))
        subprocess.run([str(BIN / "pki"), "-dir", str(self.dir)], check=True)
        self.pins = json.loads((self.dir / "pins.json").read_text())

    def p(self, nama):
        return str(self.dir / nama)

    def bersih(self):
        shutil.rmtree(self.dir, ignore_errors=True)


PKI = None


def periksa_alat():
    """Go dan Dart wajib ada di PATH; tanpa itu lab berhenti dengan pesan yang menyebut alatnya, bukan traceback."""
    hilang = [a for a in ("go", "dart") if shutil.which(a) is None]
    if hilang:
        gagal(f"{' dan '.join(hilang)} tidak ada di PATH: lab t3-mitm butuh Go, Dart, dan Docker (README, bagian Menjalankan)")


def bangun_go():
    BIN.mkdir(exist_ok=True)
    for nama in ("pki", "tepi", "mitm"):
        subprocess.run(["go", "build", "-o", str(BIN / nama), f"./cmd/{nama}"], cwd=GO, check=True)


def siapkan_dart():
    subprocess.run(["dart", "pub", "get"], cwd=DART, check=True, capture_output=True)


# ---------- proses ----------

def jalankan(port, cmd):
    """Satu proses di port itu; didaftarkan di d.server supaya d.stop dan d.gagal ikut membersihkannya."""
    d.port_bebas(port)
    f = tempfile.TemporaryFile(mode="a+")
    p = subprocess.Popen([str(c) for c in cmd], stdout=f, stderr=f, text=True)
    for _ in range(200):
        if p.poll() is not None:
            f.seek(0)
            gagal(f"{pathlib.Path(str(cmd[0])).name} berhenti: {f.read()[-300:]}")
        with socket.socket() as s:
            if s.connect_ex(("127.0.0.1", port)) == 0:
                break
        time.sleep(0.05)
    else:
        gagal(f"{pathlib.Path(str(cmd[0])).name} tidak menyala")
    d.server[port] = (p, f)


def mulai_tepi(cert, log=None, mentah=False, http=False):
    """Server tepi TLS di depan api-t3, dengan sertifikat `cert` (nama berkas tanpa ekstensi)."""
    cmd = [BIN / "tepi", "-tls", f"127.0.0.1:{P['tepi']}", "-cert", PKI.p(cert + ".pem"), "-key", PKI.p(cert + ".key"),
           "-hulu", f"http://127.0.0.1:{PORT}"]
    if log:
        cmd += ["-log", str(log)]
    if mentah:
        cmd.append("-log-mentah")
    if http:
        cmd += ["-http", f"127.0.0.1:{P['tepi_http']}"]
    jalankan(P["tepi"], cmd)
    if http:
        for _ in range(100):
            with socket.socket() as s:
                if s.connect_ex(("127.0.0.1", P["tepi_http"])) == 0:
                    return
            time.sleep(0.05)
        gagal("port HTTP tepi tidak menyala")


def henti_tepi():
    d.stop(P["tepi"])
    d.stop(P["tepi_http"])   # listener HTTP ikut proses yang sama; tidak terdaftar sendiri


def mulai_mitm(rekam, tls=True, ubah=None):
    """Proxy tiruan hotspot Dimas. tls=True: TLS dengan sertifikat palsu dari CA Dimas, meneruskan ke tepi."""
    cmd = [BIN / "mitm", "-rekam", str(rekam)]
    if ubah:
        cmd += ["-ubah-nominal", str(ubah[0]), "-ubah-ke", ubah[1]]
    if tls:
        port = P["mitm"]
        cmd += ["-listen", f"127.0.0.1:{port}", "-hulu", f"127.0.0.1:{P['tepi']}", "-hulu-tls", "-hulu-ca", PKI.p("ca-publik.pem"),
                "-tls", "-ca-cert", PKI.p("ca-dimas.pem"), "-ca-key", PKI.p("ca-dimas.key")]
    else:
        port = P["mitm_polos"]
        cmd += ["-listen", f"127.0.0.1:{port}", "-hulu", f"127.0.0.1:{PORT}"]
    jalankan(port, cmd)


def henti_mitm():
    d.stop(P["mitm"])
    d.stop(P["mitm_polos"])


SEMENTARA = []   # folder sementara yang dibuat lab ini (rekaman proxy, log tepi, cache curl); dihapus di akhir run.py


def folder_sementara(awalan):
    f = pathlib.Path(tempfile.mkdtemp(prefix=awalan))
    SEMENTARA.append(f)
    return f


def bersih_sementara():
    for f in SEMENTARA:
        shutil.rmtree(f, ignore_errors=True)
    SEMENTARA.clear()


def baru_berkas(nama):
    f = folder_sementara("t3mitm-rek-") / nama
    f.touch()
    return f


def baca_jsonl(f):
    return [json.loads(l) for l in pathlib.Path(f).read_text().splitlines() if l.strip()]


# ---------- data lab ----------

def siapkan(args=(), login=True):
    """Schema dan data baru, server api-t3. Mengembalikan token sesi Budi (login langsung ke server, di jaringan aman)."""
    for port in list(d.server):
        d.stop(port)
    d.buat_schema()
    d.seed()
    d.mulai_api(list(args))
    return d.login(BUDI, label="Budi") if login else None


TRANSFER = """SELECT j.id AS jurnal, a.nomor_karyawan, p.jumlah
FROM jurnal j JOIN posting p ON p.jurnal_id = j.id JOIN buku b ON b.id = p.buku_id JOIN akun a ON a.id = b.akun_id
WHERE j.jenis = 'transfer' ORDER BY j.id, p.jumlah"""


def tampil_transfer():
    return sql(TRANSFER)


def dasar(teks):
    """Port yang tertulis di teks keluaran menjadi port dasar, supaya rekaman sama di semua lajur kerja."""
    for k in P:
        teks = re.sub(rf"(?<!\d){P[k]}(?!\d)", str(DASAR[k]), teks)
    return teks


def rp(n):
    """Rupiah dengan titik ribuan: Rp150.000."""
    return "Rp" + f"{n:,}".replace(",", ".")


def saldo(nomor="K00419"):
    return satu("SELECT b.saldo_cache FROM buku b JOIN akun a ON a.id = b.akun_id WHERE a.nomor_karyawan = '%s'" % nomor)


# ---------- client Dart ----------

TARGET = {"tepi": ("https", "tepi"), "mitm": ("https", "mitm"), "mitm_polos": ("http", "mitm_polos"), "api": ("http", None)}


def url(target, path, dasar=False):
    skema, kunci = TARGET[target]
    port = DASAR[kunci] if dasar else P[kunci]
    return f"{skema}://localhost:{port}{path}"


def klien(mode, percaya, target, path, metode="GET", token=None, body=None, pin=(), label_token="Budi", tampil=True):
    """Satu request dari client Dart. `percaya` = nama CA ("ca-publik", "ca-dimas"); `pin` = kunci di pins.json."""
    cmd = ["dart", "run", "bin/client.dart", f"--mode={mode}", "--percaya=" + ",".join(PKI.p(c + ".pem") for c in percaya),
           f"--url={url(target, path)}", f"--metode={metode}"]
    tampil_cmd = f"$ client --mode={mode} --percaya={'+'.join(percaya)} --url={url(target, path, dasar=True)}"
    if metode != "GET":
        tampil_cmd += f" --metode={metode}"
    if pin:
        cmd.append("--pin=" + ",".join(PKI.pins[k] for k in pin))
        tampil_cmd += " --pin=" + ",".join(pin)
    if token:
        cmd.append(f"--token={token}")
        tampil_cmd += f" --token=<token sesi {label_token}>"
    if body is not None:
        cmd.append(f"--body={body}")
        tampil_cmd += f" --body='{body}'"
    r = subprocess.run(cmd, cwd=DART, capture_output=True, text=True)
    baris = [l for l in r.stdout.splitlines() if l.startswith("{")]
    if r.returncode != 0 or not baris:
        gagal(f"client Dart gagal ({r.returncode}): {r.stderr[-400:]} {r.stdout[-200:]}")
    h = json.loads(baris[-1])
    if mode not in ("terima-semua", "pin-badcallback", "dio-validate"):
        h.pop("callback_dipanggil", None)   # hanya mode dengan callback yang punya arti
    if "isi" in h:
        try:
            h["isi"] = json.loads(h["isi"])
        except ValueError:
            pass
    if h.get("alasan") == "":
        h.pop("alasan")
    if h.get("jenis") == "lain":
        gagal(f"client Dart: kesalahan tak terduga {h}")
    if tampil:
        catat(tampil_cmd)
        catat(samarkan(json.dumps(h, ensure_ascii=False, separators=(",", ":"))))
    return h


def lihat_mitm(rekam, token=None, tunggu=0.4, handshake=None):
    """Yang dilihat proxy Dimas: handshake yang masuk dan request yang terbaca. Mengembalikan daftar request."""
    time.sleep(tunggu)   # proxy menulis rekaman saat request masuk; jeda singkat hanya untuk koneksi yang baru ditutup client
    r = baca_jsonl(rekam)
    hs = [x for x in r if x["jenis"] == "handshake"]
    rq = [x for x in r if x["jenis"] == "request"]
    if handshake is not None:
        harap(bool(hs), handshake, "handshake masuk ke proxy")
    catat(f"# proxy Dimas melihat: handshake {'ya' if hs else 'tidak'}, request terbaca {len(rq)}")
    for x in rq:
        catat(samarkan(f"# proxy membaca: {x['metode']} {x['path']} Authorization: {x['authorization']}"))
        if x["body"]:
            catat(samarkan(f"# body dari app:      {x['body']}"))
        if "body_diteruskan" in x:
            catat(samarkan(f"# body diteruskan:    {x['body_diteruskan']}"))
    if token:
        harap(len(rq) >= 1, True, "proxy membaca request yang membawa token")
        harap(all(x["authorization"] == f"Bearer {token}" for x in rq), True, "Authorization yang dibaca proxy sama dengan token Budi")
        catat("# Authorization yang dibaca proxy sama dengan token sesi Budi: ya")
    return rq


def kosongkan(rekam):
    pathlib.Path(rekam).write_text("")


def ya(kondisi, apa):
    harap(bool(kondisi), True, apa)
    return "ya"


def hitung(teks, token):
    return teks.count(token)


def versi_client():
    """Versi client Dart (dart:io) dan dio yang dipasang, supaya rekaman menyebut yang diuji."""
    r = subprocess.run(["dart", "--version"], capture_output=True, text=True)
    m = re.search(r"Dart SDK version: (\S+)", r.stdout + r.stderr)
    cfg = json.loads((DART / ".dart_tool" / "package_config.json").read_text())
    dio = next(p for p in cfg["packages"] if p["name"] == "dio")["rootUri"].rstrip("/").rsplit("-", 1)[-1]
    if not m:
        gagal("versi Dart tidak terbaca")
    catat(f"# Client: Dart {m.group(1)} (dart:io) dan dio {dio}. Server tepi dan proxy tiruan: Go (crypto/tls, tanpa dependency).")


def curl_tls(*arg, tampil=None, jalur_ca=True):
    """curl lewat TLS tepi. Mengembalikan (status, kepala dalam huruf kecil, isi). Tampilan memakai nama, bukan jalur sementara."""
    ca = PKI.p("ca-publik.pem")
    cmd = ["curl", "-s", "-i", "--http1.1", "--max-time", "5", *([ "--cacert", ca] if jalur_ca else []), *arg]
    r = subprocess.run(cmd, capture_output=True, text=True)
    teks = r.stdout.replace("\r\n", "\n")
    kepala, _, isi = teks.partition("\n\n")
    baris = [l for l in kepala.split("\n") if not l.lower().startswith(("date:", "content-length:"))]
    if tampil:
        catat("$ " + tampil)
        catat(dasar("\n".join(baris) + ("\n\n" + isi.strip() if isi.strip() else "")))
    status = int(baris[0].split()[1]) if baris and baris[0].startswith("HTTP/") else 0
    return status, [l.lower() for l in baris], isi
