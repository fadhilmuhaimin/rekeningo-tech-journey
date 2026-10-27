"""Rekam lab t4-infra (Tahap 4): alamat keluar tetap, secret di state IaC, rotasi secret tanpa deploy, dan secret
staging lawan produksi, di atas labs/api-t4.

Server, skema, data awal, worker, dan layanan verifikasi tiruan adalah milik `labs/api-t4` (`dasar_t4.py`, `cmd/api`,
`cmd/tiruan`), bukan salinan. Yang baru di sini: `cmd/proxykeluar` (proxy keluar bertetap), daftar alamat sumber di
layanan verifikasi tiruan (`-izinkan-alamat`), `internal/rahasia` (pembaca secret dari OpenBao dan pemindai kunci
produksi), pembacaan rahasia webhook saat runtime di `cmd/pembayaran`, konfigurasi OpenTofu di `tofu/`, dan skenario
ini. Semua pihak ketiga berjalan LOKAL di container: layanan verifikasi tiruan, proxy keluar, dan host aplikasi (worker
api-t4 yang dikompilasi untuk Linux) berada di satu jaringan Docker lab, sehingga alamat sumber yang dilihat vendor adalah
alamat container yang sungguhan; OpenBao (mode dev) dan OpenTofu dari image resmi yang dikunci dengan digest.

Setiap bagian membuat ulang schema dan data awal dari nol, jadi output/*.txt tidak bergantung pada urutan bagian dan
rekaman ulang identik per byte (make cek). Alamat, token, nomor order, dan nilai acak disamarkan; waktu tidak direkam.
Lab gagal keras bila hasil meleset dari yang diharapkan.

    make -C labs/t4-infra run                      (butuh: Docker, Go; PostgreSQL lewat labs/b3-race; jaringan untuk image dan provider)
    make -C labs/t4-infra run BAGIAN=alamat        (satu bagian: alamat state rotasi staging testing)
    make -C labs/t4-infra verifikasi-alat          (membandingkan biner di image dengan arsip rilis; butuh jaringan; bukan bagian run)
"""
import hashlib, json, os, pathlib, re, shutil, subprocess, sys, tempfile, time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "api-t4"))
import dasar_t4 as d  # noqa: E402
from dasar_t4 import bagian, catat, curl, gagal, harap, j  # noqa: E402

LAB = "t4-infra"
SCH = "t4_infra"
SCH_TES = "t4_infra_tes"
DB = d.db_app(SCH)
d.OUT = HERE / "output"          # dasar_t4 menulis ke d.OUT; di sini output lab ini

# Image resmi, dikunci dengan digest indeks manifes (sama di ghcr.io, quay.io, dan Docker Hub untuk OpenBao). Digest dan
# biner di dalamnya dibandingkan dengan arsip rilis lewat `make verifikasi-alat` (tanggal di README).
VERSI_BAO, VERSI_TOFU = "2.7.2", "1.13.2"
IMG_BAO = f"ghcr.io/openbao/openbao:{VERSI_BAO}@sha256:5046911075e137e154ce49ab051502f4ec7cf367d484ae4a4dce665d9b90561f"
IMG_TOFU = f"ghcr.io/opentofu/opentofu:{VERSI_TOFU}@sha256:25bdfbe87000b8a88d44c7ef0cca53381da95f6203f7aed1e8cf5b81ecbe18eb"
IMG_DASAR = "gcr.io/distroless/static-debian12:nonroot"   # hanya menjalankan biner Go statis; tidak memengaruhi rekaman
PROVIDER = {"random": "3.9.1", "local": "2.9.1"}           # dikunci di tofu/.terraform.lock.hcl

DASAR_VENDOR, DASAR_BAO, DASAR_PEMBAYARAN = 18292, 18293, 18294   # api-t4: 18280-18285; t4-modul: 18286; t4-storage: 18290
PORT_VENDOR, PORT_BAO, PORT_PEMB = d.port_lab(DASAR_VENDOR), d.port_lab(DASAR_BAO), d.port_lab(DASAR_PEMBAYARAN)
PREFIKS = f"t4i-{d.DB_PORT}"          # satu lajur = satu port database: nama kontainer dan jaringan tidak bentrok antar lajur
NET = PREFIKS + "-net"
LABEL = f"lab=t4-infra-{d.DB_PORT}"
BIN_LINUX = HERE / ".bin"
BIN_HOST = HERE / ".bin-host"
CACHE_TOFU = HERE / ".cache-tofu"
KERJA = HERE / ".kerja"
TOKEN_BAO = "lab-bao-dev-token"       # token root mode dev di container lokal; bukan secret (data lab)
RAHASIA_V1, RAHASIA_V2, RAHASIA_V3 = "rahasia-webhook-lab-v1", "rahasia-webhook-lab-v2", "rahasia-webhook-lab-v3"
KUNCI_PROD_GW, KUNCI_PROD_PENERBIT = "gw_live_lab_produksi_0001", "penerbit-produksi-lab-0001"   # nilai lab, bukan kunci nyata
KUNCI_STG_GW = "gw_test_lab_staging_0001"

sql = lambda q, tampil=True: d.sql(q, tampil=tampil, schema=SCH)  # noqa: E731


def satu(q):
    return d.satu(q, SCH)


# ---------- Docker ----------

def dk(*args, cek=True):
    r = subprocess.run(["docker", *args], capture_output=True, text=True)
    if cek and r.returncode != 0:
        gagal(f"docker {' '.join(args[:3])}: {(r.stderr or r.stdout).strip()[-400:]}")
    return r.stdout.strip()


def pastikan_image(ref):
    if subprocess.run(["docker", "image", "inspect", ref], capture_output=True).returncode == 0:
        return
    for _ in range(3):   # jaringan ke registry kadang putus di tengah unduhan
        if subprocess.run(["docker", "pull", ref], capture_output=True).returncode == 0:
            return
    gagal(f"image {ref} tidak bisa diunduh: bagian yang membutuhkannya Tidak dijalankan di mesin ini")


def bersih():
    ids = dk("ps", "-aq", "--filter", f"label={LABEL}", cek=False).split()
    if ids:
        dk("rm", "-f", *ids, cek=False)
    dk("network", "rm", NET, cek=False)


def jaringan_baru():
    bersih()
    dk("network", "create", "--label", LABEL, NET)


def arsitektur_docker():
    a = dk("info", "--format", "{{.Architecture}}")
    return {"aarch64": "arm64", "arm64": "arm64", "x86_64": "amd64", "amd64": "amd64"}.get(a) or gagal(f"arsitektur Docker tidak dikenal: {a}")


def bangun_linux():
    """Biner statis untuk Linux, dibangun dari kode yang sama dengan yang dites: worker api-t4, layanan verifikasi tiruan,
    dan proxy keluar. Host aplikasi di container menjalankan biner worker yang sama dengan yang dipakai lab lain."""
    BIN_LINUX.mkdir(exist_ok=True)
    env = dict(d.ENV, GOOS="linux", GOARCH=arsitektur_docker(), CGO_ENABLED="0")
    for nama, paket in (("api-t4", "./cmd/api"), ("tiruan", "./cmd/tiruan"), ("proxykeluar", "./cmd/proxykeluar")):
        subprocess.run(["go", "build", "-trimpath", "-o", str(BIN_LINUX / nama), paket], cwd=d.HERE, env=env, check=True)


def bangun_host():
    BIN_HOST.mkdir(exist_ok=True)
    for nama, paket in (("pembayaran", "./cmd/pembayaran"), ("pindairahasia", "./cmd/pindairahasia")):
        subprocess.run(["go", "build", "-o", str(BIN_HOST / nama), paket], cwd=d.HERE, check=True)


def jalankan(nama, args, *, biner=None, entry=None, image=IMG_DASAR, env=(), terbit=None, alias=None, tambah=()):
    """Satu kontainer lab di jaringan lab. biner: berkas di .bin yang dipasang read-only sebagai /app/<nama>."""
    cmd = ["run", "-d", "--name", f"{PREFIKS}-{nama}", "--network", NET, "--label", LABEL]
    if alias:
        cmd += ["--network-alias", alias]
    if terbit:
        cmd += ["-p", terbit]
    for k, v in env:
        cmd += ["-e", f"{k}={v}"]
    if biner:
        cmd += ["-v", f"{BIN_LINUX / biner}:/app/{biner}:ro", "--entrypoint", f"/app/{biner}"]
    elif entry:
        cmd += ["--entrypoint", entry]
    cmd += [*tambah, image, *args]
    return dk(*cmd)


def alamat_ip(nama):
    return dk("inspect", "-f", '{{(index .NetworkSettings.Networks "%s").IPAddress}}' % NET, f"{PREFIKS}-{nama}")


def log_mentah(nama):
    r = subprocess.run(["docker", "logs", f"{PREFIKS}-{nama}"], capture_output=True, text=True)
    return r.stdout + "\n" + r.stderr


def log_kontainer(nama):
    return d.bersih_log(log_mentah(nama))


def tunggu_http(url_port, jalur, apa, kode=200, batas=30.0):
    def siap():
        s, _ = curl("GET", jalur, port=url_port, tampil=False, maks=2)
        return s == kode
    d.tunggu(siap, apa, batas=batas, jeda=0.1)


# ---------- rekaman ----------

def tulis(nama, judul, alat=()):
    """Seperti dasar_t4.tulis, tetapi kepala menyebut alat pihak ketiga yang dijalankan bagian ini (versi dan digest)."""
    for port in list(d.server):
        d.stop(port)
    versi = satu("SHOW server_version")
    kepala = [f"# Lab {LAB} · {judul}",
              f"# PostgreSQL {versi} · {d.versi_alat()} · pgx {d.PGX} · schema {SCH}",
              *[f"# {a}" for a in alat],
              f"# Rekaman dari database bersih: make -C labs/{LAB} run."]
    d.OUT.mkdir(exist_ok=True)
    (d.OUT / nama).write_text("\n".join(l.rstrip() for l in "\n".join(kepala + d.log).split("\n")) + "\n")
    print("ditulis:", f"labs/{LAB}/output/{nama}")
    d.log.clear()


ALAT_BAO = f"OpenBao v{VERSI_BAO} mode dev, image {IMG_BAO.split('@')[0].rsplit(':', 1)[0]}@{IMG_BAO.split('@')[1][:19]}…"
ALAT_TOFU = (f"OpenTofu v{VERSI_TOFU}, image {IMG_TOFU.split('@')[0].rsplit(':', 1)[0]}@{IMG_TOFU.split('@')[1][:19]}…; "
             f"provider random {PROVIDER['random']} dan local {PROVIDER['local']}")


def siapkan():
    for port in list(d.server):
        d.stop(port)
    jaringan_baru()
    d.buat_schema(SCH)
    d.seed(SCH)


# ---------- alamat.txt ----------

NAMA = {}    # alamat IP -> label yang tampil di rekaman (alamat container berbeda tiap run)


def label(ip):
    return NAMA.get(ip, "<alamat lain>")


def daftar_label(ips):
    return ", ".join(sorted(label(i.split("/")[0]) for i in ips)) or "(tidak ada)"


def vendor_alamat():
    s, isi = curl("GET", "/lab/alamat", port=PORT_VENDOR, tampil=False)
    harap(s, 200, "baca daftar alamat vendor")
    return j(isi)


def vendor_diterima():
    s, isi = curl("GET", "/lab/diterima", port=PORT_VENDOR, tampil=False)
    harap(s, 200, "baca vendor")
    return j(isi)


def per_label(hitungan):
    hasil = {}
    for ip, n in hitungan.items():
        hasil[label(ip)] = hasil.get(label(ip), 0) + n
    return hasil


def tampil_vendor(judul):
    a, v = vendor_alamat(), vendor_diterima()
    catat(f"# {judul}")
    catat(f"#   daftar alamat di vendor: {daftar_label(a['izin']) if a['izin'] else '(kosong: semua alamat diterima)'}")
    catat(f"#   diterima, per alamat sumber yang dilihat vendor: {per_label(a['diterima']) or '(tidak ada)'}")
    catat(f"#   ditolak 403, per alamat sumber: {per_label(a['ditolak']) or '(tidak ada)'}")
    catat(f"#   permintaan yang diproses: {v['permintaan']}, objek dibuat: {v['objek']}")
    return a, v


def mulai_vendor(izin=None):
    """izin: bila diisi, daftar alamat diberikan lewat flag -izinkan-alamat (bagian C); selain itu lewat POST /lab/izinkan."""
    arg = ["-izinkan-alamat", izin] if izin else []
    jalankan("vendor", ["-peran", "verifikasi", "-addr", "0.0.0.0:8284", *arg], biner="tiruan", alias="vendor", terbit=f"127.0.0.1:{PORT_VENDOR}:8284")
    tunggu_http(PORT_VENDOR, "/lab/alamat", "vendor menjawab")
    catat("$ docker run -d --name vendor --network jaringan-lab -p 127.0.0.1:<port>:8284 tiruan -peran verifikasi -addr 0.0.0.0:8284" + "".join(f" {a}" for a in arg))


def izinkan(*ips):
    s, _ = curl("POST", "/lab/izinkan", {"alamat": list(ips)}, port=PORT_VENDOR, tampil=False)
    harap(s, 204, "daftarkan alamat di vendor")


def mulai_proxy():
    jalankan("proxy", ["-addr", "0.0.0.0:3128", "-tujuan", "vendor:8284"], biner="proxykeluar", alias="proxy")
    d.tunggu(lambda: "proxykeluar mendengar" in log_mentah("proxy"), "proxy mendengar", batas=20.0)
    catat("$ docker run -d --name proxy --network jaringan-lab proxykeluar -addr 0.0.0.0:3128 -tujuan vendor:8284")


ARG_WORKER = ["-peran", "worker", "-tujuan", "verifikasi", "-serentak", "1", "-backoff", "0s", "-maks-percobaan", "5",
              "-selang", "50ms", "-verifikasi-url", "http://vendor:8284"]


def mulai_host(nama, lewat_proxy=False, tambah=()):
    """Satu host aplikasi: worker api-t4 di container sendiri (alamat sendiri), terhubung ke PostgreSQL lab di host."""
    env = [("DATABASE_URL", f"postgres://api_t4:api_t4@host.docker.internal:{d.DB_PORT}/lab?search_path={SCH}&application_name=t4-infra-{nama}")]
    teks = "HTTP_PROXY=http://proxy:3128 " if lewat_proxy else ""
    if lewat_proxy:
        env.append(("HTTP_PROXY", "http://proxy:3128"))
    jalankan(nama, [*ARG_WORKER, *tambah], biner="api-t4", env=env, tambah=["--add-host", "host.docker.internal:host-gateway"])
    d.tunggu(lambda: any("worker mulai" in l for l in log_kontainer(nama)), f"worker {nama} mulai", batas=30.0)
    NAMA[alamat_ip(nama)] = f"host {nama.removeprefix('host-')}"
    catat(f"$ docker run -d --name {nama} --network jaringan-lab {teks and '-e ' + teks}api-t4 -peran worker -tujuan verifikasi -serentak 1 "
          f"-backoff 0s -maks-percobaan 5 -selang 50ms -verifikasi-url http://vendor:8284" + "".join(f" {t}" for t in tambah))
    return alamat_ip(nama)


def hentikan(nama):
    dk("rm", "-f", f"{PREFIKS}-{nama}", cek=False)


def pendaftar(n, awal):
    """Sesi langsung di tabel. Akun 40003 dan seterusnya: pemakai belum terverifikasi. Mengembalikan [(akun, token)]."""
    hasil = []
    for i in range(n):
        akun, token = awal + i, f"lab-t4infra-{awal + i}"
        h = hashlib.sha256(token.encode()).hexdigest()
        d.sql(f"INSERT INTO sesi (token_hash, akun_id, kedaluwarsa) VALUES ('{h}', {akun}, now() + interval '1 hour')", tampil=False, schema=SCH)
        hasil.append((akun, token))
    return hasil


def ajukan(daftar):
    import base64
    png = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")
    isi = {"berkas_kartu": base64.b64encode(png).decode(), "berkas_swafoto": base64.b64encode(png + b"swafoto").decode()}
    for akun, token in daftar:
        s, _ = curl("POST", "/verifikasi", isi, token, tampil=False)
        harap(s, 202, f"pengajuan akun {akun}")


def ringkas_pengajuan(awal, akhir):
    sql(f"SELECT v.status, a.tingkat, count(*) AS jumlah FROM verifikasi v JOIN akun a ON a.id = v.akun_id WHERE v.akun_id BETWEEN {awal} AND {akhir} GROUP BY v.status, a.tingkat ORDER BY v.status")
    sql("SELECT status, percobaan, count(*) AS jumlah FROM outbox WHERE tujuan = 'verifikasi' GROUP BY status, percobaan ORDER BY status, percobaan")


def selesai_semua(apa="semua pekerjaan selesai"):
    d.tunggu(lambda: satu("SELECT count(*) FROM outbox WHERE tujuan = 'verifikasi' AND status = 'menunggu'") == 0, apa, batas=60.0)


def rekam_alamat():
    bagian("A. Tanpa proxy: alamat sumber sama dengan alamat host. Vendor hanya menerima alamat yang didaftarkan; sesudah pindahan alamat berubah")
    siapkan()
    d.mulai_api(db=DB)
    mulai_vendor()
    a_lama = mulai_host("host-lama")
    izinkan(a_lama)
    catat("# Vendor hanya menerima alamat host lama (didaftarkan seketika di tiruan; di vendor nyata makan dua hari kerja, Asumsi naskah). Tiga pendaftar mengajukan verifikasi:")
    ajukan(pendaftar(3, 40003))
    selesai_semua()
    ringkas_pengajuan(40003, 40005)
    a, v = tampil_vendor("sebelum pindahan")
    harap((per_label(a["diterima"]), a["ditolak"], v["objek"]), ({"host lama": 3}, {}, 3), "sebelum pindahan: tiga permintaan dari host lama")
    catat("# Akhir pekan: aplikasi pindah ke infrastruktur baru. Host baru dinyalakan sebelum host lama dimatikan; alamatnya berbeda (diperiksa), dan tidak ada yang mendaftarkannya:")
    a_baru = mulai_host("host-baru")
    harap(a_baru != a_lama, True, "host baru harus punya alamat berbeda dari host lama")
    catat("# alamat host baru berbeda dari alamat host lama: ya")
    hentikan("host-lama")
    catat("# host lama dimatikan. Senin pagi tiga pendaftar baru mengajukan verifikasi:")
    ajukan(pendaftar(3, 40010))
    selesai_semua("tiga pekerjaan baru mati")
    ringkas_pengajuan(40010, 40012)
    a, v = tampil_vendor("sesudah pindahan")
    harap((per_label(a["diterima"]), per_label(a["ditolak"]), v["objek"]), ({"host lama": 3}, {"host baru": 15}, 3), "sesudah pindahan: 15 penolakan 403 dari host baru, tidak ada objek baru")
    catat("# Tiap pekerjaan memakai lima percobaan atas jawaban 403 yang tidak akan berubah (3 pekerjaan x 5 percobaan = 15 penolakan). Status pengajuan mereka `gagal` (naskah: pendaftar melihat \"Verifikasi gagal\"; tampilan app tidak direkam).")
    catat("# Vendor sehat dan menjawab dengan benar: penyebabnya alamat sumber, bukan vendor.")

    bagian("B. Dengan proxy keluar bertetap: yang didaftarkan sekali adalah alamat proxy; pindahan host tidak mengubah alamat yang dilihat vendor")
    siapkan()
    d.mulai_api(db=DB)
    mulai_vendor()
    mulai_proxy()
    a_proxy = alamat_ip("proxy")
    NAMA[a_proxy] = "proxy keluar"
    izinkan(a_proxy)
    catat("# Yang didaftarkan di vendor: alamat proxy keluar, satu kali. Host lama memakai proxy lewat variabel lingkungan HTTP_PROXY (client Go bawaan membacanya; tanpa perubahan kode aplikasi):")
    a_lama = mulai_host("host-lama", lewat_proxy=True)
    ajukan(pendaftar(3, 40003))
    selesai_semua()
    ringkas_pengajuan(40003, 40005)
    a, v = tampil_vendor("host lama lewat proxy")
    harap((per_label(a["diterima"]), a["ditolak"], v["objek"]), ({"proxy keluar": 3}, {}, 3), "vendor hanya melihat alamat proxy")
    catat("# Pindahan: host baru (alamat berbeda, tidak didaftarkan di vendor) dinyalakan dengan HTTP_PROXY yang sama, host lama dimatikan:")
    a_baru = mulai_host("host-baru", lewat_proxy=True)
    harap(len({a_lama, a_baru, a_proxy}), 3, "tiga alamat berbeda: host lama, host baru, proxy")
    catat("# tiga alamat berbeda satu sama lain (host lama, host baru, proxy): ya")
    hentikan("host-lama")
    ajukan(pendaftar(3, 40010))
    selesai_semua()
    ringkas_pengajuan(40010, 40012)
    a, v = tampil_vendor("sesudah pindahan")
    harap((per_label(a["diterima"]), a["ditolak"], v["objek"]), ({"proxy keluar": 6}, {}, 6), "sesudah pindahan: vendor tetap hanya melihat proxy")
    catat("# Alamat host baru tidak pernah sampai ke vendor. Vendor tidak perlu didaftari lagi saat host berpindah, selama proxy tetap di alamat yang sama.")
    catat("# Batasnya: proxy keluar adalah titik gagal tunggal baru, dan alamatnya hanya tetap selama proxy itu sendiri tidak dipindah (di cloud: NAT dengan IP tetap, Tidak dijalankan).")

    bagian("C. Pindahan tanpa proxy, dengan breaker per lajur (ADR 36): jawaban 403 vendor dihitung sukses (4xx), dan dengan pengaturan bawaan pustaka dihitung gagal")
    for bawaan in (False, True):
        siapkan()
        d.mulai_api(db=DB)
        mulai_vendor("192.0.2.1")   # alamat dokumentasi (RFC 5737): bukan alamat host mana pun di jaringan lab; lewat flag, jadi flag ikut terbukti
        NAMA["192.0.2.1"] = "host lama"
        harap(vendor_alamat()["izin"], ["192.0.2.1/32"], "flag -izinkan-alamat dibaca vendor")
        catat(f"# Vendor masih mendaftarkan alamat host lama (192.0.2.1, alamat dokumentasi yang tidak dimiliki container mana pun), yang sudah tidak ada, jadi semua permintaan host baru dijawab 403. Pengaturan breaker: {'bawaan pustaka (4xx = gagal)' if bawaan else 'ADR 36 (4xx = sukses)'}")
        ajukan(pendaftar(8, 40003))
        extra = ["-breaker", "-breaker-timeout", "3s"] + (["-breaker-bawaan"] if bawaan else [])
        mulai_host("host-baru", tambah=extra)
        if bawaan:
            d.tunggu(lambda: any("closed -> open" in l for l in log_kontainer("host-baru")), "breaker terbuka", batas=30.0)
            ringkas_pengajuan(40003, 40010)
            a, v = tampil_vendor("breaker terbuka sesudah enam penolakan beruntun")
            harap(sum(a["ditolak"].values()), 6, "enam penolakan sampai breaker terbuka")
            harap(satu("SELECT count(*) FILTER (WHERE status = 'menunggu') FROM outbox WHERE tujuan = 'verifikasi'"), 7, "tujuh pekerjaan menunggu, satu mati")
            catat("# Breaker terbuka dengan benar: pekerjaan menunggu, bukan mati, dan vendor tidak dihubungi lagi. Tetapi penyebabnya tidak hilang: alamat host baru belum didaftarkan.")
            catat("# Satu pekerjaan sudah memakai lima percobaannya sebelum breaker terbuka (ambang breaker 6 lebih tinggi daripada batas percobaan 5): ia mati dan pengajuannya berstatus `gagal`.")
            catat("# Operator mendaftarkan alamat host baru di vendor. Sesudah Timeout breaker, satu permintaan percobaan lulus dan lajur pulih sendiri:")
            izinkan(alamat_ip("host-baru"))
            d.tunggu(lambda: any("half-open -> closed" in l for l in log_kontainer("host-baru")), "breaker tertutup lagi", batas=30.0)
            selesai_semua("pekerjaan yang menunggu selesai")
            ringkas_pengajuan(40003, 40010)
            a, v = tampil_vendor("sesudah alamat didaftarkan")
            harap((v["objek"], per_label(a["diterima"])), (7, {"host baru": 7}), "tujuh pendaftar lulus sesudah alamat didaftarkan")
            catat("log breaker: " + ", ".join(l for l in log_kontainer("host-baru") if l.startswith("breaker ")))
            catat("# Pendaftar yang pekerjaannya sudah mati tetap gagal; tidak ada yang mengantrekannya ulang (sama dengan temuan M31).")
        else:
            selesai_semua("semua pekerjaan mati")
            ringkas_pengajuan(40003, 40010)
            a, v = tampil_vendor("breaker ADR 36 dan jawaban 403")
            harap((sum(a["ditolak"].values()), v["objek"]), (40, 0), "8 pekerjaan x 5 percobaan = 40 penolakan, tidak ada objek")
            harap([l for l in log_kontainer("host-baru") if l.startswith("breaker ")], [], "breaker tidak pernah berpindah status")
            catat("# Breaker tidak pernah terbuka: 403 adalah jawaban 4xx, dihitung sukses. Delapan pekerjaan habis lima percobaan dan delapan pengajuan berstatus `gagal`.")
            catat("# Aturan ADR 36 benar untuk dokumen yang salah (422), tetapi 403 karena alamat sumber salah semua permintaan, bukan satu dokumen: breaker tidak menolong.")
        hentikan("host-baru")
    tulis("alamat.txt", "alamat keluar tetap: host aplikasi berpindah, proxy keluar, dan breaker")
    bersih()


# ---------- state.txt ----------

def tofu(kerja, *args, env=(), mount_tambahan=()):
    """OpenTofu di container, dengan folder kerja dan cache provider dari host. Mengembalikan (exit, keluaran)."""
    CACHE_TOFU.mkdir(exist_ok=True)
    cmd = ["docker", "run", "--rm", "--user", f"{os.getuid()}:{os.getgid()}", "-v", f"{kerja}:/work", "-w", "/work",
           "-v", f"{CACHE_TOFU}:/cache", "-e", "TF_PLUGIN_CACHE_DIR=/cache", "-e", "TF_IN_AUTOMATION=1", "-e", "HOME=/tmp",
           *[x for k, v in env for x in ("-e", f"{k}={v}")], *mount_tambahan, IMG_TOFU, *args]
    r = subprocess.run(cmd, capture_output=True, text=True)
    return r.returncode, (r.stdout + r.stderr)


def tofu_harus(kerja, *args, **kw):
    rc, teks = tofu(kerja, *args, **kw)
    if rc != 0:
        print(teks[-3000:], file=sys.stderr)
        gagal(f"tofu {' '.join(args[:2])} exit {rc}")
    return teks


def siapkan_kerja(nama):
    """Salinan konfigurasi di folder kerja sementara, dengan lock file provider yang di-commit."""
    tujuan = KERJA / nama
    shutil.rmtree(tujuan, ignore_errors=True)
    tujuan.mkdir(parents=True)
    shutil.copy(HERE / "tofu" / nama / "main.tf", tujuan / "main.tf")
    shutil.copy(HERE / "tofu" / nama / ".terraform.lock.hcl", tujuan / ".terraform.lock.hcl")
    os.chmod(tujuan, 0o777)   # container berjalan dengan uid pengguna host; folder dibuat pengguna yang sama
    return tujuan


def nilai_di(obj, rahasia, jalur=""):
    """Semua jalur di struktur JSON (state) yang memuat nilai itu."""
    hasil = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            hasil += nilai_di(v, rahasia, f"{jalur}.{k}" if jalur else k)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            hasil += nilai_di(v, rahasia, f"{jalur}[{i}]")
    elif isinstance(obj, str) and rahasia in obj:
        hasil.append(jalur)
    return hasil


def periksa_state(kerja, rahasia, nama_nilai):
    """Catat apakah state memuat nilai, di resource dan atribut mana, dan apakah resource itu menandainya sensitif."""
    state = json.loads((kerja / "terraform.tfstate").read_text())
    mentah = (kerja / "terraform.tfstate").read_text()
    ada = rahasia in mentah
    catat(f"state memuat nilai {nama_nilai}: {'ya' if ada else 'tidak'}")
    sensitif_ada = False
    for r in state.get("resources", []):
        nama = f"{r['mode'] + '.' if r['mode'] == 'data' else ''}{r['type']}.{r['name']}"
        for inst in r.get("instances", []):
            jalur = nilai_di(inst.get("attributes", {}), rahasia)
            if jalur:
                tanda = inst.get("sensitive_attributes") or []
                sensitif_ada = sensitif_ada or bool(tanda)
                catat(f"  {nama}: atribut {', '.join(sorted(jalur))}; sensitive_attributes {'diisi' if tanda else 'kosong'}")
    return ada, sensitif_ada


def rekam_state():
    pastikan_image(IMG_TOFU)
    if KERJA.exists():
        shutil.rmtree(KERJA)
    pw = f"acak-{hashlib.sha256(os.urandom(16)).hexdigest()[:24]}"       # nilai acak per run; tidak pernah dicetak
    kunci = f"gw_live_{hashlib.sha256(os.urandom(16)).hexdigest()[:20]}"  # kunci gateway produksi contoh; tidak dicetak
    d.samaran[pw], d.samaran[kunci] = "<password acak>", "<kunci gateway>"

    bagian("A. Secret ditulis di konfigurasi: random_password dan variabel masuk ke state")
    kerja = siapkan_kerja("rahasia-di-konfigurasi")
    versi_tofu = json.loads(tofu_harus(kerja, "version", "-json"))["terraform_version"]
    harap(versi_tofu, VERSI_TOFU, "versi OpenTofu di image")
    catat(f"$ tofu version\nOpenTofu v{versi_tofu}")
    teks = tofu_harus(kerja, "init", "-lockfile=readonly", "-input=false", "-no-color")
    harap("successfully initialized" in teks, True, "tofu init")
    catat("$ tofu init -lockfile=readonly   # provider diperiksa lawan hash di .terraform.lock.hcl")
    catat("OpenTofu has been successfully initialized!")
    teks = tofu_harus(kerja, "apply", "-auto-approve", "-input=false", "-no-color", env=[("TF_VAR_kunci_gateway", kunci)])
    catat("$ TF_VAR_kunci_gateway=<kunci gateway> tofu apply -auto-approve")
    for l in teks.splitlines():
        if "Apply complete" in l or "(sensitive value)" in l:
            catat(l.strip())
    harap(pw in teks or kunci in teks, False, "keluaran CLI tidak boleh memuat nilai")
    catat("keluaran CLI memuat password atau kunci: tidak (diganti \"(sensitive value)\")")
    pw_nilai = (kerja / "keluaran" / "service.env").read_text().split("=", 1)[1].strip()
    d.samaran[pw_nilai] = "<password acak>"
    a1, s1 = periksa_state(kerja, pw_nilai, "password dari random_password")
    a2, s2 = periksa_state(kerja, kunci, "kunci dari variabel TF_VAR_kunci_gateway")
    harap((a1, a2), (True, True), "state memuat kedua nilai")
    catat("# Ditandai sensitif hanya menyembunyikan nilai dari keluaran CLI; state tetap menyimpannya sebagai teks biasa (JSON) di file terraform.tfstate (dokumentasi OpenTofu, language/state/sensitive-data, dibuka 2026-10-27: state lokal adalah file JSON teks biasa).")
    catat("# Variabel yang diisi dari lingkungan ikut masuk ke state begitu dipakai satu resource: sumber nilai (konfigurasi, variabel, lingkungan) tidak mengubah apa pun.")

    bagian("B. Secret tidak melewati OpenTofu: konfigurasi hanya menyimpan alamat dan path secret manager; nilainya ditulis operator ke OpenBao dan dibaca service saat runtime")
    kerja = siapkan_kerja("rahasia-runtime")
    jaringan_baru()
    jalankan("bao", ["server", "-dev", "-dev-no-store-token"], image=IMG_BAO, env=[("BAO_DEV_ROOT_TOKEN_ID", TOKEN_BAO)], terbit=f"127.0.0.1:{PORT_BAO}:8200", alias="bao",
             entry=None)
    tunggu_http(PORT_BAO, "/v1/sys/health", "OpenBao siap")
    rahasia = f"gw_live_{hashlib.sha256(os.urandom(16)).hexdigest()[:20]}"
    d.samaran[rahasia] = "<rahasia webhook>"
    s, _ = curl("POST", "/v1/secret/data/pembayaran/webhook", {"data": {"sekarang": rahasia}}, port=PORT_BAO, kepala=[f"X-Vault-Token: {TOKEN_BAO}"], tampil=False)
    harap(s, 200, "operator menulis rahasia ke OpenBao")
    catat("# Operator menulis rahasia webhook langsung ke OpenBao (di luar OpenTofu), versi 1:")
    catat("$ curl -X POST $BAO/v1/secret/data/pembayaran/webhook -H 'X-Vault-Token: <token operator>' -d '{\"data\": {\"sekarang\": \"<rahasia webhook>\"}}'")
    tofu_harus(kerja, "init", "-lockfile=readonly", "-input=false", "-no-color")
    teks = tofu_harus(kerja, "apply", "-auto-approve", "-input=false", "-no-color")
    catat("$ tofu apply -auto-approve")
    for l in teks.splitlines():
        if "Apply complete" in l:
            catat(l.strip())
    catat("isi keluaran/service.json (konfigurasi yang dibaca service):")
    for l in (kerja / "keluaran" / "service.json").read_text().strip().splitlines():
        catat("  " + l)
    ada, _ = periksa_state(kerja, rahasia, "rahasia webhook")
    harap(ada, False, "state tidak memuat nilai yang tidak pernah melewati OpenTofu")
    harap(rahasia in (kerja / "keluaran" / "service.json").read_text(), False, "konfigurasi service tidak memuat nilai")
    catat("# Yang ada di state: alamat OpenBao dan path secret. Nilainya hanya ada di OpenBao, dan service membacanya sendiri saat berjalan (bagian rotasi.txt).")
    catat("# Batasnya sempit: ini berlaku karena TIDAK ADA resource atau data source di konfigurasi yang menyentuh nilainya. Bagian C menunjukkan cara paling mudah melanggarnya.")
    bersih()

    bagian("C. Membaca secret di dalam OpenTofu (data source) juga memasukkannya ke state")
    kerja = siapkan_kerja("rahasia-dibaca-data")
    isi = f"gw_live_{hashlib.sha256(os.urandom(16)).hexdigest()[:20]}"
    d.samaran[isi] = "<rahasia dari file>"
    (kerja / "rahasia.txt").write_text(isi + "\n")
    tofu_harus(kerja, "init", "-lockfile=readonly", "-input=false", "-no-color")
    teks = tofu_harus(kerja, "apply", "-auto-approve", "-input=false", "-no-color")
    catat("$ tofu apply -auto-approve   # data \"local_sensitive_file\" membaca file yang berisi rahasia (stand-in untuk data source pembaca secret manager)")
    for l in teks.splitlines():
        if "Apply complete" in l:
            catat(l.strip())
    harap(isi in teks, False, "keluaran CLI tidak boleh memuat nilai")
    ada, _ = periksa_state(kerja, isi, "rahasia yang dibaca data source")
    harap(ada, True, "data source memasukkan nilai ke state")
    catat("# Di lab ini yang terbukti hanya provider local. Bahwa data source pembaca secret manager milik provider lain berperilaku sama [perlu verifikasi: provider Vault atau OpenBao tidak dijalankan di lab ini].")
    catat("# Dokumentasi OpenTofu (language/ephemerality, dibuka 2026-10-27) menulis bahwa nilai ephemeral tidak disimpan di state maupun plan; ephemeral resources dan write-only attributes Tidak dijalankan di lab ini.")
    shutil.rmtree(KERJA, ignore_errors=True)
    bersih()
    tulis("state.txt", "state OpenTofu dan secret: konfigurasi, secret manager, dan data source", [ALAT_TOFU, ALAT_BAO])


# ---------- rotasi.txt ----------

def bao(metode, jalur, body=None, token=TOKEN_BAO):
    s, isi = curl(metode, jalur, body, port=PORT_BAO, kepala=[f"X-Vault-Token: {token}"] if token else (), tampil=False)
    return s, (j(isi) if isi.strip().startswith("{") else {})


def mulai_bao():
    jaringan_baru()
    jalankan("bao", ["server", "-dev", "-dev-no-store-token"], image=IMG_BAO, env=[("BAO_DEV_ROOT_TOKEN_ID", TOKEN_BAO)], terbit=f"127.0.0.1:{PORT_BAO}:8200", alias="bao")
    tunggu_http(PORT_BAO, "/v1/sys/health", "OpenBao siap")


def tulis_rahasia(jalur, **data):
    s, _ = bao("POST", f"/v1/secret/data/{jalur}", {"data": data})
    harap(s, 200, f"tulis secret {jalur}")


def token_dengan(kebijakan, aturan):
    s, _ = bao("PUT", f"/v1/sys/policies/acl/{kebijakan}", {"policy": aturan})
    harap(s, 204, f"tulis kebijakan {kebijakan}")
    s, h = bao("POST", "/v1/auth/token/create", {"policies": [kebijakan], "no_default_policy": True, "ttl": "1h"})
    harap(s, 200, "buat token")
    return h["auth"]["client_token"]


_kirim = [0]


def kirim_webhook(rahasia=None):
    """Gateway tiruan menandatangani dan mengirim satu kabar untuk order yang tidak dikenal. Penanda tangan yang sah dijawab
    200 (kabar diproses dan ditolak karena order tidak ada); tanda tangan yang salah dijawab 401."""
    _kirim[0] += 1
    body = {"event_id": f"evt-infra-{_kirim[0]}", "order_id": "TB-tidak-dikenal"}
    if rahasia:
        body["rahasia"] = rahasia
    s, isi = curl("POST", "/lab/webhook", body, port=d.PORT_GATEWAY, tampil=False)
    harap(s, 200, "perintah webhook")
    h = j(isi)["hasil"][0]
    if h.startswith("401"):
        return "ditolak"
    harap(h.startswith("200"), True, f"jawaban service pembayaran: {h}")
    return "sah"


def kabar(teks, ingin, rahasia=None):
    """Kirim satu kabar, catat hasilnya, dan gagal keras bila beda dari yang diharapkan."""
    hasil = kirim_webhook(rahasia)
    catat(f"{teks}: {hasil}")
    harap(hasil, ingin, teks)


def status_service():
    s, isi = curl("GET", "/lab/rahasia", port=PORT_PEMB, tampil=False)
    harap(s, 200, "status rahasia service")
    return j(isi)


def sidik(*r):
    import hashlib as h
    return [h.sha256(x.encode()).hexdigest()[:8] for x in r]


def tunggu_sidik(*rahasia, apa):
    d.tunggu(lambda: status_service()["sidik"] == sidik(*rahasia), apa, batas=20.0, jeda=0.05)


def gateway_rotasi(rahasia):
    s, _ = curl("POST", "/lab/rahasia", {"rahasia": rahasia}, port=d.PORT_GATEWAY, tampil=False)
    harap(s, 204, "gateway merotasi rahasia penanda tangan")


def rekam_rotasi():
    pastikan_image(IMG_BAO)
    bagian("A. OpenBao mode dev di container lab: cara berjalan")
    siapkan()
    jalankan("bao", ["server", "-dev", "-dev-no-store-token"], image=IMG_BAO, env=[("BAO_DEV_ROOT_TOKEN_ID", TOKEN_BAO)], terbit=f"127.0.0.1:{PORT_BAO}:8200", alias="bao")
    tunggu_http(PORT_BAO, "/v1/sys/health", "OpenBao siap")
    catat("$ docker run -d --name bao -e BAO_DEV_ROOT_TOKEN_ID=<token dev lab> -p 127.0.0.1:<port>:8200 openbao server -dev -dev-no-store-token")
    r = subprocess.run(["docker", "run", "--rm", "--entrypoint", "sh", IMG_BAO, "-c", "grep -n 'dev-root-token-id\\|dev-listen-address' /usr/local/bin/docker-entrypoint.sh"],
                       capture_output=True, text=True)
    harap(r.returncode, 0, "entrypoint image OpenBao memuat flag dev")
    catat("# skrip entrypoint image (baris yang menyusun perintah server):")
    for l in r.stdout.strip().splitlines():
        catat("  " + l.split(":", 1)[1].strip())
    s, ss = curl("GET", "/v1/sys/seal-status", port=PORT_BAO, tampil=False)
    harap(s, 200, "seal-status")
    ss = j(ss)
    harap((ss["initialized"], ss["sealed"], ss["version"]), (True, False, VERSI_BAO), "OpenBao mode dev: terinisialisasi, tidak tersegel, versi")
    catat(f"seal-status: initialized {str(ss['initialized']).lower()}, sealed {str(ss['sealed']).lower()}, version {ss['version']}, storage_type {ss.get('storage_type', '?')}")
    s, m = bao("GET", "/v1/sys/mounts")
    harap(s, 200, "mounts")
    secret = m["data"]["secret/"] if "data" in m else m["secret/"]
    harap((secret["type"], secret["options"]["version"]), ("kv", "2"), "mesin KV versi 2 di secret/")
    catat(f"mounts: secret/ bertipe {secret['type']}, options.version {secret['options']['version']} (KV v2 terpasang di mode dev)")
    s, _ = curl("GET", "/v1/secret/data/pembayaran/webhook", port=PORT_BAO, tampil=False)
    harap(s, 403, "tanpa token ditolak")
    catat("GET /v1/secret/data/pembayaran/webhook tanpa token: 403")
    tulis_rahasia("pembayaran/webhook", sekarang=RAHASIA_V1)
    s, h = bao("GET", "/v1/secret/data/pembayaran/webhook")
    harap((s, h["data"]["data"]["sekarang"] == RAHASIA_V1, h["data"]["metadata"]["version"]), (200, True, 1), "baca versi 1")
    catat("tulis lalu baca secret/pembayaran/webhook dengan token root dev: 200, versi 1")
    dk("stop", f"{PREFIKS}-bao")
    dk("start", f"{PREFIKS}-bao")
    tunggu_http(PORT_BAO, "/v1/sys/health", "OpenBao siap lagi")
    s, _ = bao("GET", "/v1/secret/data/pembayaran/webhook")
    harap(s, 404, "data hilang sesudah restart")
    catat("sesudah container dihentikan dan dinyalakan lagi, GET secret/pembayaran/webhook dengan token root dev: 404")
    catat("# Mode dev menyimpan data di memori dan tidak menyimpannya ke disk: restart menghapus semuanya. Hanya untuk lab; produksi memakai penyimpanan yang bertahan, unseal, dan token yang bukan root.")

    bagian("B. Service membaca rahasia dari OpenBao saat runtime (service pembayaran, token baca-saja)")
    tulis_rahasia("pembayaran/webhook", sekarang=RAHASIA_V1)
    token = token_dengan("pembayaran-baca", 'path "secret/data/pembayaran/*" { capabilities = ["read"] }')
    d.samaran[token] = "<token service>"
    r = subprocess.run([str(BIN_HOST / "pembayaran"), "-addr", f"127.0.0.1:{PORT_PEMB}", "-rahasia-bao", f"http://127.0.0.1:{PORT_BAO}"],
                       env=dict(d.ENV, DATABASE_URL=DB, BAO_TOKEN="token-yang-tidak-dikenal"), capture_output=True, text=True, timeout=30)
    pesan = re.search(r"rahasia awal tidak terbaca, service tidak dinyalakan: (.*)", r.stdout + r.stderr)
    harap((r.returncode, pesan.group(1) if pesan else None), (1, "secret manager menjawab 403"), "pembacaan awal yang gagal menghentikan service")
    catat("service dengan token yang tidak dikenal OpenBao: exit status 1, \"rahasia awal tidak terbaca, service tidak dinyalakan: secret manager menjawab 403\" (pembacaan awal yang gagal menghentikan service)")
    d.mulai(d.BIN_TIRUAN, d.PORT_GATEWAY, ["-peran", "gateway", "-webhook-url", f"http://127.0.0.1:{PORT_PEMB}/webhooks/pembayaran", "-rahasia", RAHASIA_V1])
    d.mulai(BIN_HOST / "pembayaran", PORT_PEMB, ["-lab", "-rahasia-bao", f"http://127.0.0.1:{PORT_BAO}", "-rahasia-segar", "50ms"],
            db=DB, env_lain={"BAO_TOKEN": token})
    pid = d.server[PORT_PEMB][0].pid
    catat("$ BAO_TOKEN=<token service> ./pembayaran -rahasia-bao http://<openbao>:8200 -rahasia-bao-path secret/data/pembayaran/webhook -rahasia-segar 50ms")
    catat("# Di run ini service tidak diberi rahasia webhook lewat flag atau file (flag -rahasia-webhook masih ada, tidak dipakai); yang diberikan hanya token lewat lingkungan, dan tokennya hanya boleh membaca secret/data/pembayaran/*.")
    st = status_service()
    harap((st["jumlah"], st["versi"], st["sidik"]), (1, 1, sidik(RAHASIA_V1)), "service membaca versi 1")
    catat(f"service: jumlah rahasia {st['jumlah']}, versi dokumen {st['versi']}, sidik {st['sidik']}")
    kabar("kabar bertanda tangan rahasia v1 (gateway memakai v1)", "sah")
    kabar("kabar bertanda tangan rahasia lain", "ditolak", 'rahasia-yang-tidak-dikenal')
    s, _ = bao("POST", "/v1/secret/data/pembayaran/webhook", {"data": {"sekarang": "dipalsukan"}}, token=token)
    harap(s, 403, "token service tidak boleh menulis")
    catat("token service mencoba menulis dokumen rahasia: 403 (hanya membaca)")

    bagian("C. Rotasi dengan masa tumpang tindih: operator menulis dulu, gateway beralih sesudahnya; proses service tidak dimulai ulang")
    tulis_rahasia("pembayaran/webhook", sekarang=RAHASIA_V2, lama=RAHASIA_V1)
    catat("# 1. Operator menulis dokumen baru: sekarang = v2, lama = v1 (versi 2 di OpenBao). Gateway belum beralih.")
    tunggu_sidik(RAHASIA_V2, RAHASIA_V1, apa="service membaca v2 dan v1")
    st = status_service()
    catat(f"service sesudah rotasi: jumlah rahasia {st['jumlah']}, versi dokumen {st['versi']}, sidik {st['sidik']}")
    harap(d.server[PORT_PEMB][0].pid == pid and d.server[PORT_PEMB][0].poll() is None, True, "proses service sama dan hidup")
    catat("proses service sama dengan sebelum rotasi (PID tidak berubah) dan tidak ada deploy: ya")
    kabar("kabar bertanda tangan v1 (gateway masih memakai v1)", "sah")
    kabar("kabar bertanda tangan v2", "sah", RAHASIA_V2)
    gateway_rotasi(RAHASIA_V2)
    catat("# 2. Gateway beralih ke v2 (POST /lab/rahasia pada gateway tiruan). Kabar berikutnya ditandatangani v2 tanpa menyebut rahasianya:")
    kabar("kabar dari gateway sesudah beralih", "sah")
    tulis_rahasia("pembayaran/webhook", sekarang=RAHASIA_V2)
    catat("# 3. Operator mengakhiri masa tumpang tindih: dokumen tanpa lama (versi 3).")
    tunggu_sidik(RAHASIA_V2, apa="service hanya memegang v2")
    st = status_service()
    catat(f"service: jumlah rahasia {st['jumlah']}, versi dokumen {st['versi']}, sidik {st['sidik']}")
    kabar("kabar bertanda tangan v1 sesudah masa tumpang tindih berakhir", "ditolak", RAHASIA_V1)
    kabar("kabar bertanda tangan v2", "sah", RAHASIA_V2)
    harap(d.server[PORT_PEMB][0].pid == pid, True, "proses service sama")
    s, h = bao("GET", "/v1/secret/data/pembayaran/webhook?version=1", token=token)
    harap((s, h["data"]["data"]["sekarang"] == RAHASIA_V1), (200, True), "versi 1 masih terbaca dari riwayat KV")
    catat("token service membaca versi 1 dokumen sesudah masa tumpang tindih berakhir: 200, berisi rahasia lama (riwayat versi KV v2 menyimpannya; versi 2 memuat rahasia lama di bidang lama)")
    s, _ = bao("PUT", "/v1/secret/destroy/pembayaran/webhook", {"versions": [1, 2]})
    harap(s, 204, "operator menghancurkan versi 1 dan 2")
    for v in (1, 2):
        s, _ = bao("GET", f"/v1/secret/data/pembayaran/webhook?version={v}", token=token)
        harap(s, 404, f"versi {v} sudah dihancurkan")
    s, h = bao("GET", "/v1/secret/data/pembayaran/webhook", token=token)
    harap((s, h["data"]["metadata"]["version"]), (200, 3), "versi terbaru tetap terbaca")
    catat("operator menghancurkan versi 1 dan 2 (destroy): token service membaca versi 1 dan 2: 404; versi terbaru (3): 200")
    catat("# Menulis versi baru dan mengakhiri tumpang tindih hanya mengubah apa yang diterima service. Rotasi karena rahasia bocor belum selesai sebelum versi lama dihancurkan.")

    bagian("D. Urutan terbalik (M30): gateway beralih lebih dulu, service belum membaca rahasia baru")
    gateway_rotasi(RAHASIA_V3)
    catat("# Gateway langsung menandatangani dengan v3; operator belum menulis v3 ke OpenBao:")
    kabar("kabar dari gateway", "ditolak")
    catat("# Gateway akan mengulang kiriman yang tidak dijawab 2xx (M30). Operator menulis v3 dengan v2 sebagai lama; service membacanya tanpa dimulai ulang:")
    tulis_rahasia("pembayaran/webhook", sekarang=RAHASIA_V3, lama=RAHASIA_V2)
    tunggu_sidik(RAHASIA_V3, RAHASIA_V2, apa="service membaca v3")
    kabar("kabar baru dari gateway sesudah service membaca v3 (event_id baru; lab tidak mengulang kabar yang sama)", "sah")
    catat("# Urutan yang aman: tulis ke OpenBao dulu, tunggu service membacanya (paling lama satu jeda baca; di lab 50 ms, bawaan service 30 detik, Asumsi), baru gateway beralih.")
    catat("# Selama service belum membaca, kabar bertanda v3 ditolak 401. Berapa lama jendelanya = jeda baca; lab tidak merekam nilainya (bergantung mesin).")

    bagian("E. OpenBao mati: service memakai pembacaan terakhir dan menghitung kegagalan")
    dk("stop", f"{PREFIKS}-bao")
    d.tunggu(lambda: status_service()["gagal_beruntun"] >= 2, "kegagalan beruntun terhitung", batas=20.0, jeda=0.05)
    st = status_service()
    harap(st["sidik"], sidik(RAHASIA_V3, RAHASIA_V2), "daftar bertahan")
    catat(f"OpenBao dihentikan. service: kegagalan beruntun >= 2 (diperiksa), jumlah rahasia {st['jumlah']}, sidik {st['sidik']}")
    kabar("kabar bertanda tangan v3 saat OpenBao mati", "sah")
    dk("start", f"{PREFIKS}-bao")
    tunggu_http(PORT_BAO, "/v1/sys/health", "OpenBao siap lagi")
    s, _ = bao("GET", "/v1/secret/data/pembayaran/webhook")
    harap(s, 404, "mode dev: data hilang")
    s, _ = bao("GET", "/v1/secret/data/pembayaran/webhook", token=token)
    harap(s, 403, "token service tidak dikenal lagi")
    catat("OpenBao dinyalakan lagi (mode dev, memori kosong): token root membaca secret: 404; token service: 403 (token ikut hilang)")
    d.tunggu(lambda: status_service()["gagal_beruntun"] >= 5, "pembacaan tetap gagal", batas=20.0, jeda=0.05)
    harap(status_service()["sidik"], sidik(RAHASIA_V3, RAHASIA_V2), "daftar bertahan")
    kabar("kabar bertanda tangan v3 sesudah secret dan token hilang", "sah")
    catat("# Pilihan lab: pembacaan terakhir dipakai selama pembacaan gagal. Akibatnya service tidak tahu bahwa secret sudah dicabut atau token dicabut; kegagalan beruntun (gagal_beruntun) adalah bahan alert.")
    catat("# Tokennya sendiri tidak pulih: service perlu token baru, yang di lab berarti memulai ulang service. Itu bukan rotasi rahasia webhook, tetapi bagian dari mengoperasikan secret manager.")
    d.stop(PORT_PEMB)
    d.stop(d.PORT_GATEWAY)
    tulis("rotasi.txt", "rotasi secret di OpenBao terbaca service tanpa deploy, dengan masa tumpang tindih", [ALAT_BAO])
    bersih()


# ---------- staging.txt ----------

def rekam_staging():
    pastikan_image(IMG_BAO)
    bagian("A. Secret staging dan produksi terpisah di OpenBao: token staging tidak bisa membaca produksi")
    siapkan()
    jalankan("bao", ["server", "-dev", "-dev-no-store-token"], image=IMG_BAO, env=[("BAO_DEV_ROOT_TOKEN_ID", TOKEN_BAO)], terbit=f"127.0.0.1:{PORT_BAO}:8200", alias="bao")
    tunggu_http(PORT_BAO, "/v1/sys/health", "OpenBao siap")
    tulis_rahasia("produksi/gateway", sekarang=KUNCI_PROD_GW)
    tulis_rahasia("produksi/penerbit", sekarang=KUNCI_PROD_PENERBIT)
    tulis_rahasia("staging/gateway", sekarang=KUNCI_STG_GW)
    token = token_dengan("staging-baca", 'path "secret/data/staging/*" { capabilities = ["read"] }')
    s, h = bao("GET", "/v1/secret/data/staging/gateway", token=token)
    harap((s, h["data"]["data"]["sekarang"]), (200, KUNCI_STG_GW), "staging membaca kuncinya")
    catat("token staging membaca secret/staging/gateway: 200")
    s, _ = bao("GET", "/v1/secret/data/produksi/gateway", token=token)
    harap(s, 403, "token staging tidak membaca produksi")
    catat("token staging membaca secret/produksi/gateway: 403")
    s, _ = bao("POST", "/v1/secret/data/produksi/gateway", {"data": {"sekarang": "ditimpa"}}, token=token)
    harap(s, 403, "token staging tidak menulis produksi")
    catat("token staging menulis secret/produksi/gateway: 403")
    catat("# Dev mode hanya punya satu instance, jadi pemisahan di lab adalah kebijakan (path dan token). Produksi sebaiknya memisahkan instance atau akun, supaya satu kebijakan yang keliru tidak membuka keduanya [perlu verifikasi: rekomendasi OpenBao belum dicek].")

    bagian("B. Kunci produksi yang tersasar di staging (Ilustrasi: naskah menulis staging memakai kunci gateway produksi) dideteksi pemindai")
    kerja = pathlib.Path(tempfile.mkdtemp(prefix="t4infra-staging-"))
    try:
        (kerja / "staging.env").write_text(f"GATEWAY_URL=http://gateway-staging.internal\nGATEWAY_KEY={KUNCI_PROD_GW}\nLOG_LEVEL=info\n")
        (kerja / "penerbit.env").write_text(f"PENERBIT_KUNCI={KUNCI_PROD_PENERBIT}\nPENERBIT_URL=http://penerbit-staging.internal\n")
        s, h = bao("GET", "/v1/secret/data/produksi/gateway")
        s2, h2 = bao("GET", "/v1/secret/data/produksi/penerbit")
        sidik_berkas = kerja / "produksi.sidik"
        sidik_berkas.write_text("\n".join(hashlib.sha256(x.encode()).hexdigest() for x in (h["data"]["data"]["sekarang"], h2["data"]["data"]["sekarang"])) + "\n")
        for k in (KUNCI_PROD_GW, KUNCI_PROD_PENERBIT):
            d.samaran[k] = "<kunci produksi>"
        catat("# Pekerjaan keamanan membaca sidik (SHA-256) dua rahasia produksi dari OpenBao dan menyimpannya tanpa nilai (di lab dengan token root dev; produksi memakai token yang hanya boleh membaca path produksi). Dua file konfigurasi staging, masing-masing salah menyalin satu kunci produksi:")
        catat("  staging.env: GATEWAY_KEY=<kunci produksi gateway, berawalan gw_live_>")
        catat("  penerbit.env: PENERBIT_KUNCI=<kunci produksi penerbit, tanpa awalan>")

        def pindai(*berkas, awalan="gw_live_", dengan_sidik=True):
            cmd = [str(BIN_HOST / "pindairahasia"), "-awalan", awalan, *(["-sidik", str(sidik_berkas)] if dengan_sidik else []), *[str(kerja / b) for b in berkas]]
            r = subprocess.run(cmd, capture_output=True, text=True)
            keluar = (r.stdout + r.stderr).replace(str(kerja) + "/", "")
            return r.returncode, keluar.strip()

        rc, k = pindai("staging.env", "penerbit.env")
        catat("$ pindairahasia -awalan gw_live_ -sidik produksi.sidik staging.env penerbit.env")
        catat(k)
        catat(f"# exit status {rc}")
        harap(rc, 1, "pemindai menemukan kunci produksi")
        harap(k.splitlines(), ["staging.env:2: kunci produksi (awalan)", "penerbit.env:1: kunci produksi (sidik)"], "temuan")
        harap(KUNCI_PROD_GW in k or KUNCI_PROD_PENERBIT in k, False, "keluaran tidak memuat nilai kunci")
        catat("# Keluaran memuat file, nomor baris, dan alasan; nilai kuncinya tidak dicetak.")
        rc, k = pindai("staging.env", "penerbit.env", dengan_sidik=False)
        catat("$ pindairahasia -awalan gw_live_ staging.env penerbit.env   # tanpa daftar sidik")
        catat(k)
        harap((rc, k.splitlines()), (1, ["staging.env:2: kunci produksi (awalan)"]), "tanpa sidik hanya aturan awalan")
        catat("# Aturan awalan menangkap kunci yang formatnya mengikuti vendor (gw_live_ lawan gw_test_), termasuk yang belum pernah dilihat pemindai. Kunci tanpa awalan hanya tertangkap oleh sidik, dan hanya bila sidiknya diketahui pemindai.")
        (kerja / "besar.env").write_text("CATATAN=" + "x" * (2 << 20) + f"\nGATEWAY_KEY={KUNCI_PROD_GW}\n")
        rc, k = pindai("besar.env")
        catat("$ pindairahasia -awalan gw_live_ -sidik produksi.sidik besar.env   # baris pertama 2 MiB, kunci produksi di baris kedua")
        catat(k)
        catat(f"# exit status {rc}")
        harap((rc, k.splitlines()), (1, ["besar.env:1: baris tidak bisa dipindai (lebih panjang dari 1048576 byte); sisa file tidak diperiksa"]), "baris terlalu panjang dilaporkan")
        catat("# Pemindai berhenti di baris yang tidak bisa dibacanya, jadi baris itu dilaporkan sebagai temuan: file tidak boleh tampak bersih hanya karena kunci produksi ada sesudah baris yang panjang.")
        rc, k = pindai("tidak-ada.env")
        catat("$ pindairahasia -awalan gw_live_ -sidik produksi.sidik tidak-ada.env   # file yang tidak ada")
        catat(k)
        catat(f"# exit status {rc}")
        harap((rc, k), (2, "open tidak-ada.env: no such file or directory"), "berkas yang tidak bisa dibaca bukan berkas bersih")
        catat("# File yang tidak bisa dibaca dilaporkan sebagai galat (exit 2), tidak dihitung bersih.")
        (kerja / "staging.env").write_text(f"GATEWAY_URL=http://gateway-staging.internal\nGATEWAY_KEY={KUNCI_STG_GW}\nLOG_LEVEL=info\n")
        (kerja / "penerbit.env").write_text("PENERBIT_URL=http://penerbit-staging.internal\n")
        rc, k = pindai("staging.env", "penerbit.env")
        catat("# Perbaikan: staging memakai kunci staging dari secret/staging/* (berawalan gw_test_), kunci penerbit staging dibaca saat runtime, bukan ditulis di file:")
        catat("$ pindairahasia -awalan gw_live_ -sidik produksi.sidik staging.env penerbit.env")
        catat(f"# exit status {rc}, keluaran: {k or '(kosong)'}")
        harap((rc, k), (0, ""), "staging bersih")
    finally:
        shutil.rmtree(kerja, ignore_errors=True)
    catat("# Pemindai hanya melihat file yang diberikan kepadanya (di lab: dua file). Menjalankannya di CI atas seluruh konfigurasi staging, dan state IaC staging, adalah pekerjaan pipeline; Tidak dijalankan di lab ini.")
    tulis("staging.txt", "secret staging dan produksi terpisah, dan pemindai kunci produksi di staging", [ALAT_BAO])
    bersih()


# ---------- testing.txt ----------

BERKAS_TES = ["cmd/tiruan/alamat_test.go", "cmd/proxykeluar/main_test.go", "internal/rahasia/bao_test.go",
              "internal/rahasia/pindai_test.go", "internal/modul/pembayaran/rahasia_fn_test.go"]
PAKET_TES = ["./cmd/tiruan/", "./cmd/proxykeluar/", "./internal/rahasia/", "./internal/modul/pembayaran/"]


def rekam_testing():
    nama = []
    for b in BERKAS_TES:
        nama += [n for n in re.findall(r"^func (Test\w+)\(", (d.HERE / b).read_text(), flags=re.M) if n != "TestMain"]   # TestMain: penyiap proses tes, bukan tes
    harap(len(nama), len(set(nama)), "nama tes baru unik")
    r = subprocess.run(["go", "test", "-v", "-count=1", "-run", "^(" + "|".join(nama) + ")$", *PAKET_TES], cwd=d.HERE, env=d.ENV, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout[-3000:], r.stderr[-2000:], file=sys.stderr)
        gagal("go test")
    lulus = [m.group(1) for l in r.stdout.splitlines() if (m := re.match(r"\s*--- PASS: (\S+)", l))]
    harap("--- SKIP" in r.stdout, False, "tes dilewati")
    induk = [n for n in lulus if "/" not in n]
    harap(sorted(induk), sorted(nama), "semua tes baru berjalan dan lulus")
    bagian("A. Tes Go yang ditambahkan lab ini (tanpa database; server HTTP uji di memori)")
    catat(f"$ go test -v -count=1 -run '<{len(nama)} tes baru>' " + " ".join(PAKET_TES))
    for n in sorted(lulus):
        catat(f"--- PASS: {n}")
    catat(f"ok  {len(induk)} tes induk, {len(lulus) - len(induk)} subtes")
    bagian("B. go vet seluruh modul")
    rc = subprocess.run(["go", "vet", "./..."], cwd=d.HERE, env=d.ENV, capture_output=True, text=True)
    harap(rc.returncode, 0, "go vet")
    catat("$ go vet ./...")
    catat("(tanpa temuan)")
    versi = d.satu("SHOW server_version", "public")
    kepala = [f"# Lab {LAB} · tes Go untuk daftar alamat, proxy keluar, pembaca rahasia, dan pemindai kunci produksi",
              f"# PostgreSQL {versi} · {d.versi_alat()} · pgx {d.PGX}",
              f"# Rekaman dari: make -C labs/{LAB} run BAGIAN=testing."]
    d.OUT.mkdir(exist_ok=True)
    (d.OUT / "testing.txt").write_text("\n".join(l.rstrip() for l in "\n".join(kepala + d.log).split("\n")) + "\n")
    print("ditulis:", f"labs/{LAB}/output/testing.txt")
    d.log.clear()


BAGIAN = {"alamat": rekam_alamat, "state": rekam_state, "rotasi": rekam_rotasi, "staging": rekam_staging, "testing": rekam_testing}


def main():
    pilih = sys.argv[1:] or list(BAGIAN)
    for p in pilih:
        if p not in BAGIAN:
            gagal(f"bagian tidak dikenal: {p} (pilihan: {' '.join(BAGIAN)})")
    d.bangun()
    bangun_host()
    if any(p in pilih for p in ("alamat",)):
        pastikan_image(IMG_DASAR)
        bangun_linux()
    try:
        for p in pilih:
            BAGIAN[p]()
    finally:
        for port in list(d.server):   # error Python di tengah rekaman: server tidak tertinggal memegang port
            d.stop(port)
        bersih()


if __name__ == "__main__":
    main()
