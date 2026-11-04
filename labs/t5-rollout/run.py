"""Rekam lab t5-rollout: rilis kartu bertahap dan satu sakelar untuk semua pod (M49, ADR 55), di atas image api-t5.

Cluster k3d bernama <lajur>-t5-rollout (satu server, tanpa agent, hanya localhost) menjalankan Argo Rollouts, plugin
Gateway API, Traefik, dan metrics-server bawaan k3s. Pod otorisasi kartu adalah proses `api-t5` yang sama dengan lab lain
(image api-t5-rollout:v1, dibangun dari labs/api-t5 dan diimpor ke node: tanpa registry). Semua pod memakai satu
PostgreSQL lab di mesin ini (host.k3d.internal). Yang baru di api-t5: flag -sakelar-tabel (sakelar dari tabel, nilai tak
terbaca = tolak), -sakelar-ttl, -lab-tolak-persen (memerankan versi baru yang salah, tersebar rata) dan GET /lab/otorisasi (pencacah
keputusan, hanya dengan -lab). Pihak ketiga tiruan: penerbit kartu tidak ada; permintaan otorisasi dikirim langsung ke
POST /penerbit/otorisasi oleh run.py.

Setiap bagian membuat ulang schema dan data awal dari nol dan menghapus beban kerja bagian sebelumnya. Angka yang
bergantung mesin (lama menunggu, jumlah permintaan) direkam sebagai batas yang diperiksa; hitungan pod, bobot, status, dan
keputusan direkam persis. Lab gagal keras bila hasilnya meleset.

    make -C labs/t5-rollout run                          (butuh: Docker, Go; PostgreSQL lewat labs/b3-race)
    make -C labs/t5-rollout run BAGIAN=tanpa-router      (tanpa-router gateway analisis sakelar hpa testing)
    T5R_PERTAHANKAN=1 make -C labs/t5-rollout run        (cluster tidak dihapus sesudah rekaman)
"""
import hashlib, http.client, json, os, pathlib, platform, re, shutil, subprocess, sys, tempfile, threading, time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "api-t5"))
import dasar_t5 as d  # noqa: E402
from dasar_t5 import bagian, catat, gagal, harap, tabel, tunggu  # noqa: E402
from lab_env import DB_PORT, PROYEK, port_lab  # noqa: E402

LAB = "t5-rollout"
SCHEMA = "tahap5_rollout"
SP = ",".join(d.SCHEMA_LAYANAN)
d.OUT = HERE / "output"
MANIFES = HERE / "manifes"
ALAT = HERE / ".alat"            # biner k3d dan manifes Argo Rollouts yang diunduh: di luar git (labs/t5-rollout/.gitignore)
LAJUR = PROYEK or "lab"
CLUSTER = f"{LAJUR}-t5-rollout"
NODE = f"k3d-{CLUSTER}-server-0"
DB_KONTAINER = f"{PROYEK or 'b3-race'}-db-1"
DASAR_GATEWAY, DASAR_API, DASAR_PF = 18360, 18361, 18362   # Traefik (Gateway), API server k3s, port-forward ke pod (18362 sampai 18371)
PORT_GATEWAY, PORT_API = port_lab(DASAR_GATEWAY), port_lab(DASAR_API)
K3S_IMAGE = "rancher/k3s:v1.37.1-k3s1"
IMAGE = "api-t5-rollout:v1"
# Unduhan berpin: digest sha256 aset rilis (API rilis GitHub, diperiksa 2026-11-03). Berkas lain tidak dipakai.
K3D_URL = "https://github.com/k3d-io/k3d/releases/download/v5.9.0/k3d-darwin-arm64"
K3D_SHA256 = "fe106541d5d0a3f18debcd4d432a16f8c0ce3e6ddc06f8fbb6f696a122313e00"
ARGO_URL = "https://github.com/argoproj/argo-rollouts/releases/download/v1.10.1/install.yaml"
ARGO_SHA256 = "149148429a6f8258b789003ffb9bc6698a526d611ecb1b185624217cf51bae7f"
KUNCI_PENERBIT = "kunci-penerbit-lab"
RAHASIA_PENGGUNA = d.PASSWORD
IRA = 40308               # pemilik kartu lab: saldo besar supaya ratusan otorisasi tidak habis
TOKEN_KARTU = "tok_lab_rollout_ira"
RATIH = "ratih@rekeningo.example"   # petugas risk dari data awal
TTL_SAKELAR = 5.0         # detik; sama dengan -sakelar-ttl di manifes (Asumsi naskah)
TOLERANSI = 2.0           # detik; selisih pengukuran (permintaan lewat port-forward, mesin ramai) yang masih diterima
BATAS_HTTP = 10

alias = {}                # nama pod atau hash acak -> label tetap di rekaman
_proxy = {}
_pf = {}
_urut_auth = [0]
_ns = "default"


def versi_go():
    go = subprocess.run(["go", "version"], cwd=d.HERE, capture_output=True, text=True).stdout.split()
    return go[2] if len(go) > 2 else "go?"


d.versi_alat = versi_go


# ---------- perintah dasar ----------

def jalan(cmd, masuk=None, cek=True, env=None, batas=None, cwd=None):
    r = subprocess.run(cmd, input=masuk, capture_output=True, text=True, env=env, timeout=batas, cwd=cwd)
    if cek and r.returncode != 0:
        gagal(f"perintah gagal ({r.returncode}): {' '.join(map(str, cmd))[:160]}\n{(r.stdout + r.stderr)[-600:]}")
    return r


def kc(*args, masuk=None, cek=True):
    """kubectl bawaan node k3s (versinya sama dengan server), bukan kubectl di host."""
    r = jalan(["docker", "exec", "-i", NODE, "kubectl", *args], masuk=masuk, cek=cek)
    return r.stdout


def kcj(*args):
    return json.loads(kc(*args, "-o", "json"))


def tampil(teks=""):
    """Teks rekaman: nama pod, hash, dan waktu diganti label tetap; hitungan dan status tidak disentuh."""
    teks = d.WAKTU.sub("<waktu>", teks)
    for asli, label in sorted(alias.items(), key=lambda x: -len(x[0])):
        teks = teks.replace(asli, label)
    catat(teks)


def tulis(nama, judul, cluster=True):
    for port in list(d.server):
        d.stop(port)
    pg = d.satu("SHOW server_version", "public")
    alat = f"{versi_cluster()} · schema {SCHEMA} · api-t5 di cluster, pod ke PostgreSQL lab di host" if cluster else f"schema {d.TES} (tes Go, tanpa cluster)"
    kepala = [f"# Lab {LAB} · {judul}",
              f"# PostgreSQL {pg} · {versi_go()} · {alat}",
              f"# Rekaman dari database bersih dan beban kerja baru: make -C labs/{LAB} run."]
    d.OUT.mkdir(exist_ok=True)
    (d.OUT / nama).write_text("\n".join(l.rstrip() for l in "\n".join(kepala + d.log).split("\n")) + "\n")
    print("ditulis:", f"labs/{LAB}/output/{nama}")
    d.log.clear()


def versi_cluster():
    sv = json.loads(kc("version", "-o", "json"))["serverVersion"]["gitVersion"]
    img_argo = kcj("-n", "argo-rollouts", "get", "deploy", "argo-rollouts")["spec"]["template"]["spec"]["containers"][0]["image"]
    cm = kcj("-n", "argo-rollouts", "get", "configmap", "argo-rollouts-config")["data"]["trafficRouterPlugins"]
    plugin = re.search(r"download/(v[\d.]+)/", cm).group(1)
    traefik = kcj("-n", "kube-system", "get", "deploy", "traefik")["spec"]["template"]["spec"]["containers"][0]["image"].split(":")[-1]
    gw = kcj("get", "crd", "gateways.gateway.networking.k8s.io")["metadata"]["annotations"]["gateway.networking.k8s.io/bundle-version"]
    return (f"k3s {sv} · Argo Rollouts {img_argo.split(':')[-1]} · plugin Gateway API {plugin} · Traefik {traefik} · "
            f"Gateway API {gw} · k3d {versi_k3d()}")


def versi_k3d():
    return jalan([k3d_bin(), "version"]).stdout.split()[2]


# ---------- alat dan cluster ----------

def unduh(url, tujuan, sha256):
    """Unduh satu berkas dari rilis resmi dan periksa sha256-nya; berkas yang tidak cocok dihapus dan lab berhenti."""
    tujuan.parent.mkdir(exist_ok=True)
    # curl memakai penyimpanan sertifikat sistem; urllib dari Python yang dipasang terpisah sering tidak punya sertifikat akar.
    jalan(["curl", "-fsSL", "--max-time", "300", "-o", str(tujuan), url])
    h = hashlib.sha256(tujuan.read_bytes()).hexdigest()
    if h != sha256:
        tujuan.unlink()
        gagal(f"sha256 {tujuan.name} {h} tidak sama dengan {sha256}")


def periksa_ulang(berkas, sha256):
    """Berkas yang sudah ada di .alat tidak dipercaya begitu saja: sha256-nya diperiksa lagi tiap lab berjalan."""
    h = hashlib.sha256(berkas.read_bytes()).hexdigest()
    if h != sha256:
        gagal(f"sha256 {berkas.name} di {ALAT} adalah {h}, bukan {sha256}: hapus berkas itu supaya lab mengunduh ulang")


def k3d_bin():
    if os.environ.get("K3D"):
        return os.environ["K3D"]
    lokal = ALAT / "k3d-darwin-arm64"
    if lokal.exists():
        periksa_ulang(lokal, K3D_SHA256)
        return str(lokal)
    if shutil.which("k3d"):
        return shutil.which("k3d")
    if platform.system() == "Darwin" and platform.machine() == "arm64":
        unduh(K3D_URL, lokal, K3D_SHA256)
        lokal.chmod(0o755)
        return str(lokal)
    gagal("k3d tidak ada: pasang k3d v5.9.0 dari rilis resmi lalu isi K3D=<path> (README, bagian Alat)")


def manifes_argo():
    berkas = ALAT / "argo-rollouts-install.yaml"
    if not berkas.exists():
        unduh(ARGO_URL, berkas, ARGO_SHA256)
    periksa_ulang(berkas, ARGO_SHA256)
    return berkas


def cluster_ada():
    r = jalan([k3d_bin(), "cluster", "list", "-o", "json"])
    return any(c["name"] == CLUSTER for c in json.loads(r.stdout or "[]"))


def bangun_image():
    """api-t5 statis untuk linux, image dari scratch (satu berkas), diimpor ke containerd di node."""
    arch = "arm64" if platform.machine() in ("arm64", "aarch64") else "amd64"
    kerja = pathlib.Path(tempfile.mkdtemp(prefix="t5-rollout-img-"))
    try:
        env = dict(d.ENV, CGO_ENABLED="0", GOOS="linux", GOARCH=arch)
        jalan(["go", "build", "-trimpath", "-tags", "timetzdata", "-o", str(kerja / "api-t5"), "./cmd/api"], env=env, cwd=d.HERE)
        (kerja / "Dockerfile").write_text("FROM scratch\nCOPY api-t5 /api-t5\nENTRYPOINT [\"/api-t5\"]\n")
        jalan(["docker", "build", "-q", "-t", IMAGE, str(kerja)])
    finally:
        shutil.rmtree(kerja, ignore_errors=True)
    # docker save | ctr images import: image masuk ke containerd node tanpa registry
    save = subprocess.Popen(["docker", "save", IMAGE], stdout=subprocess.PIPE)
    r = subprocess.run(["docker", "exec", "-i", NODE, "ctr", "-n", "k8s.io", "images", "import", "-"], stdin=save.stdout, capture_output=True, text=True)
    save.stdout.close()
    harap(save.wait(), 0, "docker save")
    harap(r.returncode, 0, "ctr images import: " + r.stderr[-300:])


def siapkan_cluster():
    """Cluster baru bila belum ada: Argo Rollouts, plugin Gateway API, provider Gateway di Traefik. Lalu image api-t5."""
    if not cluster_ada():
        jalan([k3d_bin(), "cluster", "create", CLUSTER, "--servers", "1", "--agents", "0", "--image", K3S_IMAGE, "--no-lb",
               "-p", f"{PORT_GATEWAY}:80@server:0:direct", "--api-port", f"127.0.0.1:{PORT_API}", "--servers-memory", "3g",
               "--wait", "--timeout", "420s"], batas=600)
        tunggu(lambda: "Ready" in kc("get", "nodes", cek=False), "node siap", 120, 2)
    if jalan(["docker", "exec", NODE, "kubectl", "-n", "argo-rollouts", "get", "deploy", "argo-rollouts"], cek=False).returncode != 0:
        # cluster baru, atau pemasangan yang terhenti di tengah
        kc("create", "namespace", "argo-rollouts", cek=False)
        kc("apply", "-n", "argo-rollouts", "--server-side", "-f", "-", masuk=manifes_argo().read_text())
        kc("apply", "-f", "-", masuk=(MANIFES / "traefik-gateway.yaml").read_text())
        kc("apply", "--server-side", "--force-conflicts", "-f", "-", masuk=(MANIFES / "argo-rollouts-gateway.yaml").read_text())
        kc("-n", "argo-rollouts", "rollout", "restart", "deploy/argo-rollouts")
        kc("-n", "argo-rollouts", "rollout", "status", "deploy/argo-rollouts", "--timeout=300s")
    # Tunggu: controller berjalan dan sudah mengunduh plugin, Gateway terprogram, metrics-server menjawab.
    tunggu(lambda: kcj("-n", "argo-rollouts", "get", "deploy", "argo-rollouts")["status"].get("readyReplicas") == 1, "controller Argo Rollouts", 300, 3)
    tunggu(lambda: "Download complete" in kc("-n", "argo-rollouts", "logs", "deploy/argo-rollouts", cek=False), "plugin Gateway API terunduh", 300, 3)
    tunggu(lambda: gateway_terprogram(), "Gateway terprogram", 300, 3)
    tunggu(lambda: metrics_menjawab(), "metrics-server", 300, 3)
    bangun_image()


def gateway_terprogram():
    r = jalan(["docker", "exec", NODE, "kubectl", "-n", "kube-system", "get", "gateway", "traefik-gateway", "-o",
               "jsonpath={.status.conditions[?(@.type=='Programmed')].status}"], cek=False)
    return r.stdout.strip() == "True"


def metrics_menjawab():
    r = jalan(["docker", "exec", NODE, "kubectl", "top", "nodes"], cek=False)
    return r.returncode == 0


def hapus_cluster():
    if cluster_ada():
        jalan([k3d_bin(), "cluster", "delete", CLUSTER], cek=False)


# ---------- beban kerja di cluster ----------

def terapkan(berkas, **isi):
    nilai = dict(isi, DATABASE_URL=database_url())
    # Hanya ${HURUF_BESAR}: $(VAR) di args pod adalah rujukan Kubernetes dan tidak disentuh.
    teks = re.sub(r"\$\{([A-Z_]+)\}", lambda m: str(nilai[m.group(1)]), (MANIFES / berkas).read_text())
    kc("apply", "-f", "-", masuk=teks)


def database_url():
    return d.db_role(d.ROLE_APP, "t5-rollout").replace("127.0.0.1", "host.k3d.internal")


def bersihkan_beban():
    """Hapus beban kerja bagian sebelumnya (hanya milik lab ini) sebelum schema dibuat ulang."""
    for jenis in ("rollout", "deployment", "hpa", "httproute", "analysisrun", "analysistemplate", "service"):
        kc("delete", jenis, "--all", "-n", _ns, "--wait=true", "--timeout=120s", cek=False)
    # Service kubernetes bawaan dibuat ulang oleh cluster; yang lain milik lab.
    tunggu(lambda: not kcj("get", "pods", "-n", _ns)["items"], "semua pod lab hilang", 180, 2)


def rollout(nama):
    return kcj("-n", _ns, "get", "rollout", nama)


def pod_milik(label):
    return kcj("-n", _ns, "get", "pods", "-l", f"app={label}")["items"]


def pod_siap(p):
    return p["status"].get("phase") == "Running" and any(c["type"] == "Ready" and c["status"] == "True" for c in p["status"].get("conditions", []))


def versi_pod(p):
    for e in p["spec"]["containers"][0].get("env", []):
        if e["name"] == "VERSI":
            return e.get("value", "")
    return ""


def tunggu_rollout(nama, fase, siap=None, batas=240):
    def ok():
        r = rollout(nama)
        if r.get("status", {}).get("phase") != fase:
            return False
        if siap is not None:
            return sum(1 for p in pod_milik(nama) if pod_siap(p)) == siap
        return True
    tunggu(ok, f"rollout {nama} {fase}", batas, 2)


def tunggu_pod_siap(label, jumlah, batas=180):
    tunggu(lambda: sum(1 for p in pod_milik(label) if pod_siap(p)) == jumlah and len(pod_milik(label)) == jumlah,
           f"{jumlah} pod {label} siap", batas, 2)


def beri_label_pod(label, urut):
    """Pod diberi label tetap menurut urutan nama (urutan nama acak, jadi label tidak menyimpan nama asli)."""
    pods = sorted(p["metadata"]["name"] for p in pod_milik(label))
    for i, nama in enumerate(pods, start=urut):
        alias[nama] = f"<pod {i}>"
    return pods


def alias_hash(label):
    """RS dan hash template diganti label menurut versinya."""
    for rs in kcj("-n", _ns, "get", "rs", "-l", f"app={label}")["items"]:
        h = rs["metadata"]["labels"].get("rollouts-pod-template-hash", "")
        v = [e["value"] for e in rs["spec"]["template"]["spec"]["containers"][0]["env"] if e["name"] == "VERSI"][0]
        if h:
            alias[h] = f"<hash {v}>"


# ---------- akses ke pod dari host (kubectl port-forward) ----------
# Lewat kubectl proxy, POST /bo/flag/kartu dengan token Bearer dijawab 401 padahal login berhasil (diduga kepala Authorization
# client tidak diteruskan; belum dibuktikan). port-forward menyambung langsung ke port pod dan tidak mengubah permintaan.

def siapkan_kubeconfig():
    """Kubeconfig sementara untuk port-forward."""
    kubeconfig = pathlib.Path(tempfile.mkdtemp(prefix="t5-rollout-kc-")) / "kubeconfig"
    jalan([k3d_bin(), "kubeconfig", "write", CLUSTER, "-o", str(kubeconfig)])
    _proxy["kubeconfig"], _proxy["dir"] = kubeconfig, kubeconfig.parent


def henti_pf():
    for pod, (p, _) in list(_pf.items()):
        p.terminate()
        try:
            p.wait(10)
        except subprocess.TimeoutExpired:
            p.kill()
        del _pf[pod]
    if "dir" in _proxy:
        shutil.rmtree(_proxy.pop("dir"), ignore_errors=True)
        _proxy.pop("kubeconfig", None)


def port_pod(pod):
    """Port di host yang meneruskan ke port 8080 pod (kubectl port-forward, satu proses per pod)."""
    if pod not in _pf:
        port = port_lab(DASAR_PF + len(_pf))
        d.port_bebas(port)
        p = subprocess.Popen(["kubectl", "--kubeconfig", str(_proxy["kubeconfig"]), "port-forward", "-n", _ns, f"pod/{pod}", f"{port}:8080"],
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        _pf[pod] = (p, port)
        tunggu(lambda: http_(port, "GET", "/healthz")[0] == 200, f"port-forward ke pod {alias.get(pod, pod)}", 60, 0.5)
    return _pf[pod][1]


def http_(port, method, path, isi=None, token=None, kepala=None, batas=BATAS_HTTP):
    """Satu permintaan HTTP ke 127.0.0.1:port. Mengembalikan (status, kepala huruf kecil, isi teks); (0, {}, galat) bila gagal."""
    try:
        c = http.client.HTTPConnection("127.0.0.1", port, timeout=batas)
        h = dict(kepala or {})
        data = None
        if isi is not None:
            data = json.dumps(isi)
            h["Content-Type"] = "application/json"
        if token:
            h["Authorization"] = f"Bearer {token}"
        c.request(method, path, body=data, headers=h)
        r = c.getresponse()
        teks = r.read().decode("utf-8", "replace")
        out = (r.status, {k.lower(): v for k, v in r.getheaders()}, teks)
        c.close()
        return out
    except Exception as e:  # noqa: BLE001 - galat jaringan dilaporkan sebagai status 0
        return 0, {}, repr(e)


def ke_pod(pod, method, path, isi=None, token=None, kepala=None, batas=BATAS_HTTP):
    return http_(port_pod(pod), method, path, isi, token, kepala, batas)


def id_auth(awalan="AUTH-R"):
    _urut_auth[0] += 1
    return f"{awalan}-{_urut_auth[0]:04d}"


def otorisasi(kirim, jumlah=1000, id_=None):
    """Satu otorisasi dari 'penerbit'. `kirim(path, isi, kepala)` mengembalikan (status, kepala, isi). Mengembalikan (status, id, jawaban, kepala)."""
    id_ = id_ or id_auth()
    s, k, teks = kirim("/penerbit/otorisasi", {"id_penerbit": id_, "token": TOKEN_KARTU, "jumlah": jumlah}, {"X-Penerbit-Kunci": KUNCI_PENERBIT})
    try:
        jawab = json.loads(teks) if teks.strip() else {}
    except ValueError:
        jawab = {"mentah": teks[:80]}
    return s, id_, jawab, k


class KoneksiGateway:
    """Satu koneksi HTTP ke Gateway yang dipakai berulang (keep-alive) oleh satu thread beban, dibuka ulang bila putus. Koneksi baru tiap
    permintaan menumpuk soket TIME_WAIT di host sampai port sementara habis ("Can't assign requested address"), yang ikut memutus koneksi
    ke PostgreSQL lab dan mematikan lab lain di mesin yang sama (HPA: 16 thread)."""

    def __init__(self):
        self.c = None

    def kirim(self, path, isi, kepala):
        galat = None
        for _ in range(2):
            try:
                if self.c is None:
                    self.c = http.client.HTTPConnection("127.0.0.1", PORT_GATEWAY, timeout=BATAS_HTTP)
                self.c.request("POST", path, body=json.dumps(isi), headers=dict(kepala or {}, **{"Content-Type": "application/json"}))
                r = self.c.getresponse()
                teks = r.read().decode("utf-8", "replace")
                return r.status, {k.lower(): v for k, v in r.getheaders()}, teks
            except Exception as e:  # noqa: BLE001 - galat jaringan dilaporkan sebagai status 0, seperti http_
                galat = e
                self.tutup()
        return 0, {}, repr(galat)

    def tutup(self):
        if self.c is not None:
            self.c.close()
            self.c = None


# ---------- database ----------

def siapkan_data():
    """Schema bersih, 30 tabel, data awal, enam schema service, lalu Ira: akun pemakai dengan saldo dan satu kartu."""
    d.LAYANAN["aktif"] = False
    d.buat_schema(SCHEMA)
    d.seed(SCHEMA)
    d.pecah_layanan(SCHEMA)
    with d.sambung(SP, autocommit=False) as c:
        hash_ = c.execute("SELECT password_hash FROM akun WHERE id = 40002").fetchone()[0]
        c.execute("INSERT INTO akun (id, jenis, nama, email, password_hash, tingkat) VALUES (%s, 'pemakai', 'Ira', %s, %s, 'terverifikasi')",
                  (IRA, f"kartu{IRA}@publik.example", hash_))
        c.execute("INSERT INTO buku (akun_id, jenis, batas_harian) VALUES (%s, 'pemakai', 500000)", (IRA,))
        bank = c.execute("SELECT id FROM buku WHERE jenis = 'bank'").fetchone()[0]
        buku = c.execute("SELECT id FROM buku WHERE akun_id = %s", (IRA,)).fetchone()[0]
        jr = c.execute("INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('topup', 'Saldo awal lab t5-rollout', 400) RETURNING id").fetchone()[0]
        saldo = 20_000_000
        c.execute("INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES (%s, %s, %s), (%s, %s, %s)", (jr, bank, -saldo, jr, buku, saldo))
        c.execute("UPDATE buku b SET saldo_cache = (SELECT coalesce(sum(jumlah), 0) FROM posting p WHERE p.buku_id = b.id) WHERE b.id IN (%s, %s)", (bank, buku))
        c.execute("INSERT INTO kartu (akun_id, token_penerbit, empat_digit, status, batas_harian) VALUES (%s, %s, '4242', 'aktif', 50000000)", (IRA, TOKEN_KARTU))
        c.commit()
    d.samaran[TOKEN_KARTU] = "<token kartu Ira>"


def sakelar_ada(nilai):
    """Baris sakelar kartu_aktif ditulis sebagai pemilik schema (data awal lab: migrasi tidak mengisinya)."""
    with d.sambung(SP) as c:
        c.execute("INSERT INTO sakelar (nama, nilai) VALUES ('kartu_aktif', %s) ON CONFLICT (nama) DO UPDATE SET nilai = EXCLUDED.nilai", (nilai,))


def baris_otorisasi():
    return int(d.satu("SELECT count(*) FROM otorisasi_kartu", SP))


# ---------- bagian A: setWeight 5 tanpa traffic router ----------

def rekam_tanpa_router():
    bersihkan_beban()
    siapkan_data()
    bagian("A. Argo Rollouts tanpa traffic router: setWeight 5 dengan 3 replika, dengan 20 replika, dan dengan 3 replika bila maxSurge 0")
    catat("# Rollout canary dasar (manifes/kartu-tanpa-router.yaml): satu langkah setWeight 5, lalu jeda tanpa batas. Tidak ada trafficRouting,")
    catat("# jadi bobot hanya bisa diwujudkan lewat jumlah pod versi baru. Versi baru = template pod berubah (VERSI v1 ke v2).")
    catat("# maxSurge tidak ditulis di manifes (bawaan v1.10.1: 25% dari jumlah replika, dibulatkan ke atas), kecuali di bagian ketiga yang menulis maxSurge: 0.")
    hasil = {}
    for replika, surge in ((3, None), (20, None), (3, 0)):
        nama = f"kartu-a{replika}" + ("" if surge is None else f"s{surge}")
        baris_surge = "" if surge is None else f"      maxSurge: {surge}"
        catat(f"\n## {replika} replika" + ("" if surge is None else f", maxSurge {surge} (bukan bawaan)"))
        terapkan("kartu-tanpa-router.yaml", NAMA=nama, REPLIKA=replika, VERSI="v1", MAXSURGE_BARIS=baris_surge)
        tunggu_rollout(nama, "Healthy", siap=replika)
        catat(f"Rollout {nama} versi v1: phase Healthy, {replika} pod siap")
        terapkan("kartu-tanpa-router.yaml", NAMA=nama, REPLIKA=replika, VERSI="v2", MAXSURGE_BARIS=baris_surge)
        tunggu(lambda: rollout(nama).get("status", {}).get("phase") == "Paused", f"{nama} Paused", 240, 2)
        tunggu(lambda: all(pod_siap(p) for p in pod_milik(nama)), "pod stabil", 240, 2)
        alias_hash(nama)
        r = rollout(nama)
        catat(f"Rollout {nama} sesudah VERSI diganti ke v2: phase {r['status']['phase']}, currentStepIndex {r['status'].get('currentStepIndex')} (langkah pause tanpa batas)")
        pods = pod_milik(nama)
        v1 = sum(1 for p in pods if versi_pod(p) == "v1")
        v2 = sum(1 for p in pods if versi_pod(p) == "v2")
        rs_baris = []
        for rs in sorted(kcj("-n", _ns, "get", "rs", "-l", f"app={nama}")["items"],
                         key=lambda x: [e["value"] for e in x["spec"]["template"]["spec"]["containers"][0]["env"] if e["name"] == "VERSI"][0]):
            v = [e["value"] for e in rs["spec"]["template"]["spec"]["containers"][0]["env"] if e["name"] == "VERSI"][0]
            rs_baris.append([v, rs["spec"]["replicas"], rs["status"].get("readyReplicas", 0)])
        catat("$ kubectl get rs  (versi, spec.replicas, siap)")
        for b in tabel(["versi", "spec.replicas", "siap"], rs_baris):
            catat(b)
        catat(f"Pod v1: {v1}, pod v2: {v2}; replika yang diminta {replika}, pod yang menjawab {v1 + v2}.")
        n = 200
        tunggu_versi({"v1", "v2"})
        hit = hitung_versi(n)
        harap(sum(hit.values()), n, "semua permintaan terjawab")
        # Hitungan permintaan per versi bergantung penyeimbang beban Traefik: satu run memberi 10 dari 200 untuk 20 replika, run lain 9
        # dari 200. Hanya batasnya yang direkam; bagian pod versi baru dihitung dari pod, bukan dari permintaan.
        batas = {(3, None): (35, 65), (20, None): (3, 17), (3, 0): (47, 87)}[(replika, surge)]
        harap(batas[0] <= hit.get("v2", 0) <= batas[1], True, f"{replika} replika, maxSurge {surge}: bagian v2 terukur di sekitar bagian pod v2 ({batas[0]} sampai {batas[1]} dari {n}; terukur {hit.get('v2', 0)})")
        catat(f"{n} permintaan GET /healthz lewat Gateway ke satu Service tanpa bobot: semuanya terjawab.")
        catat(f"Bagian pod v2 dari semua pod yang menjawab = {100 * v2 / (v1 + v2):.1f}% (diminta 5%). Bagian permintaan yang dijawab v2 terukur antara {100 * batas[0] / n:.1f}% dan "
              f"{100 * batas[1] / n:.1f}%: ya (batas diperiksa; hitungan permintaan tepat bergantung penyeimbang beban dan tidak direkam).")
        hasil[(replika, surge)] = (v1, v2)
        bobot = r["status"].get("canary", {}).get("weights")
        catat(f"status.canary.weights di Rollout: {'tidak ada (tanpa traffic router)' if not bobot else json.dumps(bobot)}")
        kc("delete", "httproute,service,rollout", nama, "-n", _ns, "--wait=true", cek=False)
        tunggu(lambda: not pod_milik(nama), f"pod {nama} hilang", 180, 2)
    bagian("Ringkas")
    catat("Hitungan pembulatan 5% dari n pod (tanpa traffic router): jumlah pod terukur di atas, bukan umum untuk semua versi Argo Rollouts.")
    for (replika, surge), (v1, v2) in hasil.items():
        catat(f"- {replika} replika{'' if surge is None else f', maxSurge {surge}'}: {v2} pod canary dan {v1} pod stabil menjawab; bagian pod v2 {100 * v2 / (v1 + v2):.1f}%")
    harap(hasil[(3, None)], (3, 1), "3 replika, maxSurge tidak ditulis (bawaan 25% = 1 pod tambahan): satu pod canary di samping tiga pod stabil (rekaman)")
    harap(hasil[(20, None)], (19, 1), "20 replika: 5% harus 1 pod canary (naskah)")
    harap(hasil[(3, 0)], (2, 1), "3 replika, maxSurge 0: satu pod canary dan dua pod stabil (33,3% naskah)")
    tulis("tanpa-router.txt", "setWeight 5 tanpa traffic router (3 dan 20 replika, dan 3 replika dengan maxSurge 0)")


# ---------- bagian B dan C: bobot lewat Gateway API, analisis yang gagal ----------

def bobot_route(nama="kartu-route"):
    r = kcj("-n", _ns, "get", "httproute", nama)
    return {b["name"]: b.get("weight") for b in r["spec"]["rules"][0]["backendRefs"]}


def tunggu_versi(versi, batas=60, path="/healthz"):
    """Kirim permintaan sampai semua versi yang diharapkan pernah menjawab. Traefik mengambil bobot HTTPRoute dan endpoint Service
    dengan jeda sesudah objeknya berubah, jadi hitungan yang dimulai terlalu cepat memuat permintaan yang masih memakai bobot lama
    (satu run memberi 4 dari 200 ke versi baru, bukan 10)."""
    lihat, t0 = set(), time.time()
    while lihat != set(versi):
        s, k, _ = http_(PORT_GATEWAY, "GET", path)
        if s == 200:
            lihat.add(k.get("x-instance", "?").split("-")[0])
        if time.time() - t0 > batas:
            gagal(f"menunggu versi {sorted(versi)} menjawab lewat Gateway: baru {sorted(lihat)} dalam {batas} detik")
        time.sleep(0.05)


def tunggu_hanya(versi, berturut=30, batas=60, path="/healthz"):
    """Kirim permintaan sampai `berturut` permintaan beruntun semuanya dijawab versi itu (rollback sudah sampai ke Traefik)."""
    n, t0 = 0, time.time()
    while n < berturut:
        s, k, _ = http_(PORT_GATEWAY, "GET", path)
        n = n + 1 if s == 200 and k.get("x-instance", "?").split("-")[0] == versi else 0
        if time.time() - t0 > batas:
            gagal(f"menunggu {berturut} jawaban beruntun dari {versi} lewat Gateway: lewat {batas} detik")
        time.sleep(0.05)


def hitung_versi(jumlah, path="/healthz"):
    """Kirim permintaan lewat Gateway dan hitung versi yang menjawab (awalan header X-Instance)."""
    n = {}
    for _ in range(jumlah):
        s, k, _ = http_(PORT_GATEWAY, "GET", path)
        harap(s, 200, f"GET {path} lewat Gateway")
        v = k.get("x-instance", "?").split("-")[0]
        n[v] = n.get(v, 0) + 1
    return n


def siapkan_gateway(versi_baru, tolak):
    """Rollout kartu 3 replika versi v1 sehat, lalu versi baru: menunggu pod canary siap, bobot 5, dan jeda."""
    terapkan("kartu-gateway.yaml", VERSI="v1", TOLAK="0")
    tunggu_rollout("kartu", "Healthy", siap=3)
    catat("Rollout kartu versi v1: phase Healthy, 3 pod siap")
    catat(f"HTTPRoute kartu-route, bobot awal: {json.dumps(bobot_route())}")
    terapkan("kartu-gateway.yaml", VERSI=versi_baru, TOLAK=tolak)
    tunggu(lambda: rollout("kartu").get("status", {}).get("phase") == "Paused", "kartu Paused", 240, 2)
    tunggu(lambda: bobot_route().get("kartu-canary") == 5, "bobot canary 5", 120, 1)
    tunggu(lambda: all(pod_siap(p) for p in pod_milik("kartu")), "pod siap", 240, 2)
    alias_hash("kartu")


def rekam_gateway():
    bersihkan_beban()
    siapkan_data()
    bagian("B. Bobot 5% lewat Gateway API (plugin Argo Rollouts), versi baru yang baik")
    catat("# Rollout kartu (manifes/kartu-gateway.yaml): 3 replika, stableService dan canaryService, plugin Gateway API menulis bobot ke HTTPRoute.")
    siapkan_gateway("v2", "0")
    r = rollout("kartu")
    catat(f"Rollout kartu sesudah VERSI diganti ke v2: phase {r['status']['phase']}, currentStepIndex {r['status'].get('currentStepIndex')}")
    pods = pod_milik("kartu")
    v1 = sum(1 for p in pods if versi_pod(p) == "v1")
    v2 = sum(1 for p in pods if versi_pod(p) == "v2")
    catat(f"Pod v1: {v1}, pod v2: {v2}")
    b = bobot_route()
    catat(f"HTTPRoute kartu-route, bobot sekarang: {json.dumps(b)}")
    harap(b, {"kartu-stable": 95, "kartu-canary": 5}, "bobot HTTPRoute")
    n = 200
    tunggu_versi({"v1", "v2"})
    hit = hitung_versi(n)
    harap(sum(hit.values()), n, "semua permintaan terjawab")
    harap(3 <= hit.get("v2", 0) <= 17, True, f"bagian v2 terukur di sekitar 5% dari 200 (3 sampai 17; terukur {hit.get('v2', 0)})")
    catat(f"{n} permintaan GET /healthz lewat Gateway (127.0.0.1, port Gateway): semuanya terjawab.")
    catat(f"Bagian permintaan yang dijawab v2 terukur antara 1.5% dan 8.5% (bobot 5, pod v2 hanya {v2} dari {v1 + v2}): ya (batas diperiksa; hitungan tepat bergantung penyeimbang beban dan tidak direkam).")
    # analisis latar untuk versi yang baik: tidak gagal
    tunggu(lambda: kcj("-n", _ns, "get", "analysisrun")["items"], "AnalysisRun ada", 120, 2)
    ar = kcj("-n", _ns, "get", "analysisrun")["items"][0]
    catat(f"AnalysisRun {ar['spec']['metrics'][0]['name']}: phase {ar['status'].get('phase')} (versi v2 tidak menolak otorisasi)")
    harap(ar["status"].get("phase") in ("Running", "Successful"), True, "analisis versi baik tidak gagal")
    tulis("gateway.txt", "bobot 5% lewat Gateway API dan hitungan permintaan")


def generator(berhenti, hasil):
    """Kirim otorisasi lewat Gateway tanpa henti sampai `berhenti` menyala."""
    k = KoneksiGateway()
    while not berhenti.is_set():
        s, _, jawab, _ = otorisasi(k.kirim)
        hasil.append((s, jawab.get("keputusan"), jawab.get("alasan")))
    k.tutup()


def rekam_analisis():
    bersihkan_beban()
    siapkan_data()
    bagian("C. Analisis yang gagal membalik rollout: versi baru menolak 31% otorisasi")
    catat("# Versi v3 dijalankan dengan -lab-tolak-persen 31: 31 persen otorisasi ditolak dengan alasan versi-baru, tersebar rata (sesudah k panggilan tepat k x 31 / 100, dibulatkan ke bawah).")
    catat("# Angka 31% memerankan naskah M49 (Ilustrasi); kode versi baru yang salah tidak ada. Analisis: rasio tolak >= 10% dari paling sedikit 10 keputusan = gagal.")
    siapkan_gateway("v3", "31")
    catat(f"HTTPRoute kartu-route, bobot: {json.dumps(bobot_route())}")
    berhenti, hasil = threading.Event(), []
    t = threading.Thread(target=generator, args=(berhenti, hasil), daemon=True)
    t.start()
    try:
        tunggu(lambda: any(a["status"].get("phase") in ("Failed", "Successful", "Error")
                           for a in kcj("-n", _ns, "get", "analysisrun")["items"]), "AnalysisRun selesai", 180, 2)
    finally:
        berhenti.set()
        t.join(30)
    ar = kcj("-n", _ns, "get", "analysisrun")["items"][0]
    harap(ar["status"]["phase"], "Failed", "AnalysisRun")
    catat(f"AnalysisRun rasio-tolak: phase {ar['status']['phase']}")
    catat(f"Pesan: {ar['status'].get('message', '')}")
    ukuran = ar["status"]["metricResults"][0]["measurements"]
    gagal_ukur = [m for m in ukuran if m["phase"] == "Failed"]
    catat(f"Pengukuran yang gagal: {len(gagal_ukur)} (failureLimit 0: satu kegagalan menghentikan analisis; jumlah pengukuran sebelumnya tidak direkam); yang gagal memuat total >= 10 dan rasio_tolak >= 0,1: " +
          ("ya" if all(json.loads(m["value"])["total"] >= 10 and json.loads(m["value"])["rasio_tolak"] >= 0.1 for m in gagal_ukur) else "tidak"))
    harap(len(gagal_ukur), 1, "satu pengukuran gagal (failureLimit 0)")
    # Rollout dibatalkan: bobot kembali ke 0, pod canary dihapus sesudah jeda, semua permintaan ke v1
    tunggu(lambda: rollout("kartu").get("status", {}).get("phase") == "Degraded", "kartu Degraded", 120, 2)
    r = rollout("kartu")
    catat(f"Rollout kartu: phase {r['status']['phase']}, abort {r['status'].get('abort')}")
    catat(f"Pesan Rollout: {r['status'].get('message', '')}")
    tunggu(lambda: bobot_route().get("kartu-canary") == 0, "bobot canary 0", 120, 1)
    catat(f"HTTPRoute kartu-route sesudah rollback: {json.dumps(bobot_route())}")
    tunggu(lambda: sum(1 for p in pod_milik("kartu") if versi_pod(p) == "v3") == 0, "pod v3 dihapus", 180, 3)
    pods = pod_milik("kartu")
    catat(f"Pod sesudah rollback: v1 {sum(1 for p in pods if versi_pod(p) == 'v1')}, v3 {sum(1 for p in pods if versi_pod(p) == 'v3')}")
    n = 100
    tunggu_hanya("v1")
    hit = hitung_versi(n)
    catat(f"{n} permintaan sesudah rollback: v1 menjawab {hit.get('v1', 0)}, v3 menjawab {hit.get('v3', 0)}")
    harap(hit.get("v1", 0), n, "semua permintaan ke v1 sesudah rollback")
    tolak = sum(1 for _, k, a in hasil if a == "versi-baru")
    catat(f"Otorisasi yang dikirim selama analisis: ada yang ditolak dengan alasan versi-baru: {'ya' if tolak else 'tidak'}")
    harap(tolak >= 1, True, "ada penolakan versi-baru")
    tulis("analisis.txt", "analisis otomatis menggagalkan canary dan membalik rollout")


# ---------- bagian D: sakelar untuk semua pod ----------

def login_ratih(pod):
    s, _, teks = ke_pod(pod, "POST", "/login", {"email": RATIH, "password": RAHASIA_PENGGUNA})
    harap(s, 200, "login petugas risk")
    token = json.loads(teks)["token"]
    d.samaran[token] = "<token sesi Ratih>"
    return token


def flag(pod, token, aktif):
    alasan = "Penerbit melaporkan lonjakan otorisasi yang tidak biasa"
    return ke_pod(pod, "POST", "/bo/flag/kartu", {"aktif": aktif, "alasan": alasan}, token)


def auth_pod(pod, label, jumlah=1000):
    s, i, jawab, _ = otorisasi(lambda p, isi, k: ke_pod(pod, "POST", p, isi, None, k), jumlah)
    ringkas = f"{jawab.get('keputusan')}" + (f" ({jawab['alasan']})" if jawab.get("alasan") else "")
    tampil(f"{label}: HTTP {s}, {ringkas}")
    return s, jawab


def deploy_tiga(nama, tabel_sakelar):
    terapkan("kartu-sakelar.yaml", NAMA=nama, SAKELAR_TABEL="true" if tabel_sakelar else "false")
    tunggu_pod_siap(nama, 3)
    return beri_label_pod(nama, 1)


def rekam_sakelar():
    bersihkan_beban()
    siapkan_data()
    siapkan_kubeconfig()
    try:
        _sakelar()
    finally:
        jalan(["docker", "unpause", DB_KONTAINER], cek=False)
        henti_pf()


def _sakelar():
    bagian("D1. Versi pertama: flag di memori, tiga pod (tanpa -sakelar-tabel)")
    pods = deploy_tiga("kartu-memori", False)
    token = login_ratih(pods[0])
    catat("# Tiga pod otorisasi kartu dari satu image, satu database. Kill switch dimatikan lewat pod 1.")
    for i, p in enumerate(pods, 1):
        auth_pod(p, f"otorisasi Rp1.000 di pod {i} sebelum kill switch")
    s, _, teks = flag(pods[0], token, False)
    tampil(f"POST /bo/flag/kartu {{\"aktif\": false}} di pod 1: HTTP {s}, {teks.strip()}")
    harap(s, 200, "matikan flag")
    hasil = [auth_pod(p, f"otorisasi Rp1.000 di pod {i} sesudah kill switch dimatikan") for i, p in enumerate(pods, 1)]
    harap([h[1]["keputusan"] for h in hasil], ["tolak", "setuju", "setuju"], "flag memori: hanya pod 1 menolak")
    catat("# Yang menolak hanya pod yang diubah; pod 2 dan pod 3 tetap menyetujui otorisasi baru.")
    kc("delete", "pod", pods[0], "-n", _ns, "--wait=true")
    tunggu_pod_siap("kartu-memori", 3)
    baru = [p for p in sorted(p["metadata"]["name"] for p in pod_milik("kartu-memori")) if p not in pods]
    harap(len(baru), 1, "pod pengganti")
    alias[baru[0]] = "<pod 1 sesudah mulai ulang>"
    auth_pod(baru[0], "otorisasi Rp1.000 di pod 1 sesudah dimulai ulang")
    catat("# Pod yang dimulai ulang kembali menyetujui: flag di memori hilang bersama prosesnya, tanpa ada yang menyalakannya.")
    catat(f"Baris otorisasi_kartu: {baris_otorisasi()}")
    kc("delete", "deployment", "kartu-memori", "-n", _ns, "--wait=true")
    tunggu(lambda: not pod_milik("kartu-memori"), "pod kartu-memori hilang", 120, 2)

    bagian("D2. Sakelar dari tabel (-sakelar-tabel, cache 5 detik): semua pod berhenti menyetujui dalam jendela cache")
    sakelar_ada(True)
    pods = deploy_tiga("kartu-tabel", True)
    token = login_ratih(pods[0])
    nilai = d.satu("SELECT nilai FROM sakelar WHERE nama = 'kartu_aktif'", SP)
    catat(f"# Baris sakelar kartu_aktif = {'t' if nilai else 'f'} (t = menyala), dibaca tiap pod dengan cache {TTL_SAKELAR:.0f} detik (Asumsi).")
    for tahap in range(3):   # jendela cache hanya bisa diamati bila pembacaan terakhir kurang dari 5 detik sebelum perubahan
        for i, p in enumerate(pods, 1):
            s, jawab, = auth_pod(p, f"otorisasi Rp1.000 di pod {i} (cache terisi)")[0:2]
            harap(jawab["keputusan"], "setuju", "pemanasan cache")
        t0 = time.monotonic()
        s, _, teks = flag(pods[0], token, False)
        harap(s, 200, "matikan sakelar")
        tampil(f"POST /bo/flag/kartu {{\"aktif\": false}} di pod 1: HTTP {s}, {teks.strip()}")
        awal = []
        for i, p in enumerate(pods, 1):
            awal.append(auth_pod(p, f"otorisasi Rp1.000 di pod {i} segera sesudahnya")[1]["keputusan"])
        if time.monotonic() - t0 < TTL_SAKELAR - TOLERANSI:
            break
        catat("# (pengulangan: jendela cache terlewat karena mesin lambat)")
        harap(tahap < 2, True, "jendela cache teramati dalam tiga percobaan")
        flag(pods[0], token, True)
        time.sleep(TTL_SAKELAR + 1)
    harap(awal, ["tolak", "setuju", "setuju"], "pod yang mengubah menolak, pod lain masih dari cache")
    catat("# Dalam jendela cache pod 2 dan pod 3 masih membaca nilai lama: sesudah sakelar dimatikan, otorisasi baru di sana tetap lolos sampai cache habis.")
    tunggu_semua_tolak(pods[1:], t0)
    catat(f"Pod 2 dan pod 3 menolak (alasan kill-switch) dalam {TTL_SAKELAR:.0f} detik ditambah {TOLERANSI:.0f} detik toleransi pengukuran sesudah sakelar dimatikan: ya (batas diperiksa, lama sebenarnya tidak direkam)")
    for i, p in enumerate(pods, 1):
        harap(auth_pod(p, f"otorisasi Rp1.000 di pod {i} sesudah jendela cache")[1].get("alasan"), "kill-switch", "tolak kill-switch")
    catat("$ SELECT nama, nilai, diubah_oleh FROM sakelar")
    for b in tabel(["nama", "nilai", "diubah_oleh"], d.sql("SELECT nama, nilai, diubah_oleh FROM sakelar", tampil=False, schema=SP)):
        catat(b)
    s, _, teks = flag(pods[1], token, True)   # menyalakan lagi lewat pod LAIN: semua pod kembali menyetujui sesudah jendela cache
    tampil(f"POST /bo/flag/kartu {{\"aktif\": true}} di pod 2: HTTP {s}, {teks.strip()}")
    tunggu_semua_setuju(pods)
    catat("Sesudah sakelar dinyalakan lewat pod 2 (bukan pod yang mematikannya) semua pod menyetujui lagi: ya")

    bagian("D3. Sakelar tidak terbaca: tolak yang eksplisit (HTTP 200), bukan galat")
    catat("# Hak SELECT atas tabel sakelar dicabut dari role service pembayaran; pod tidak bisa membaca sakelar.")
    d.sql("REVOKE SELECT ON sakelar FROM t5_pembayaran", tampil=False, schema=SP)
    time.sleep(TTL_SAKELAR + 1)   # cache semua pod habis
    for i, p in enumerate(pods, 1):
        s, jawab = auth_pod(p, f"otorisasi Rp1.000 di pod {i}, sakelar tak terbaca")
        harap((s, jawab), (200, {"keputusan": "tolak", "alasan": "sakelar-tak-terbaca"}), "tolak eksplisit")
    catat("# Status 200 dengan keputusan tolak: penerbit tiruan membaca jawaban bukan-200 sebagai tidak ada jawaban dan menyetujui (rekaman t4-kartu, otorisasi.txt).")
    d.sql("GRANT SELECT ON sakelar TO t5_pembayaran", tampil=False, schema=SP)
    tunggu_semua_setuju(pods)
    catat("Sesudah hak dikembalikan semua pod menyetujui lagi: ya")

    bagian("D4. Primary berhenti menjawab: sakelar tak terbaca dalam batas waktu, otorisasi baru ditolak")
    if not PROYEK:
        # Tanpa COMPOSE_PROJECT_NAME kontainer PostgreSQL adalah milik bersama; docker pause akan menghentikan lajur lain juga.
        gagal("D4 memakai docker pause pada PostgreSQL lajur: isi COMPOSE_PROJECT_NAME (labs/README.md, Beberapa lajur sekaligus)")
    catat(f"# docker pause pada kontainer PostgreSQL lab: koneksi tidak mati, tetapi tidak ada yang menjawab. Cache habis lebih dulu.")
    time.sleep(TTL_SAKELAR + 1)
    jalan(["docker", "pause", DB_KONTAINER])
    try:
        for i, p in enumerate(pods, 1):
            t = time.monotonic()
            s, jawab = auth_pod(p, f"otorisasi Rp1.000 di pod {i}, PostgreSQL berhenti")
            lama = time.monotonic() - t
            harap((s, jawab), (200, {"keputusan": "tolak", "alasan": "sakelar-tak-terbaca"}), "tolak saat primary berhenti")
            harap(lama < 2.0, True, f"jawaban tolak dalam tenggat penerbit 2 detik (lama {lama:.2f})")
        catat("Jawaban tolak tiba kurang dari 2 detik (tenggat penerbit, Asumsi dari dokumentasi satu penerbit): ya (batas diperiksa)")
        # Tiga otorisasi sekaligus ke satu pod: pembacaan sakelar yang menggantung dibagi, jadi tidak ada yang menunggu lebih lama
        # dari satu batas baca (satu per satu di bawah satu mutex, yang ketiga menunggu tiga batas baca dan melewati tenggat).
        serentak, id_serentak = [], [id_auth() for _ in range(3)]

        def satu(id_):
            t = time.monotonic()
            s, _, jawab, _ = otorisasi(lambda p, isi, k: ke_pod(pods[0], "POST", p, isi, None, k), id_=id_)
            serentak.append((s, jawab.get("keputusan"), jawab.get("alasan"), time.monotonic() - t))

        ts = [threading.Thread(target=satu, args=(i,)) for i in id_serentak]
        for t in ts:
            t.start()
        for t in ts:
            t.join(30)
        harap(len(serentak), 3, "tiga jawaban dari tiga otorisasi bersamaan")
        harap(sorted((s, k, a) for s, k, a, _ in serentak), [(200, "tolak", "sakelar-tak-terbaca")] * 3, "tiga otorisasi bersamaan ditolak eksplisit")
        harap(max(lama for *_, lama in serentak) < 2.0, True, f"tiga jawaban bersamaan dalam tenggat 2 detik (terlama {max(lama for *_, lama in serentak):.2f})")
        catat("Tiga otorisasi Rp1.000 bersamaan di pod 1, PostgreSQL berhenti: semua HTTP 200, tolak (sakelar-tak-terbaca), semuanya tiba kurang dari 2 detik: ya (batas diperiksa)")
    finally:
        jalan(["docker", "unpause", DB_KONTAINER])
    tunggu_pod_siap("kartu-tabel", 3)
    tunggu_semua_setuju(pods)
    catat("Sesudah PostgreSQL berjalan lagi semua pod menyetujui: ya")
    tulis("sakelar.txt", "kill switch kartu di tiga pod: flag memori lawan sakelar dari tabel")


def tunggu_semua_tolak(pods, t0):
    def semua():
        return all(otorisasi(lambda p, isi, k, pod=p: ke_pod(pod, "POST", p, isi, None, k))[2].get("keputusan") == "tolak" for p in pods)
    tunggu(semua, "pod lain menolak sesudah cache habis", TTL_SAKELAR + TOLERANSI, 0.25)
    harap(time.monotonic() - t0 <= TTL_SAKELAR + TOLERANSI, True, "batas jendela cache")


def tunggu_semua_setuju(pods):
    def semua():
        return all(otorisasi(lambda p, isi, k, pod=p: ke_pod(pod, "POST", p, isi, None, k))[2].get("keputusan") == "setuju" for p in pods)
    tunggu(semua, "semua pod menyetujui lagi", TTL_SAKELAR + 6, 0.5)


# ---------- bagian E: HPA ----------

def rekam_hpa():
    bersihkan_beban()
    siapkan_data()
    bagian("E. HPA menambah replika menurut metrik CPU")
    catat("# Deployment kartu-hpa (1 replika, requests.cpu 20m, tolak semua otorisasi: -lab-tolak-persen 100, tanpa tulis database) di belakang Gateway.")
    catat("# HPA: minReplicas 1, maxReplicas 4, target CPU 50%. Beban: otorisasi lewat Gateway dari beberapa thread di mesin ini.")
    terapkan("kartu-hpa.yaml")
    tunggu_pod_siap("kartu-hpa", 1)
    tunggu(lambda: kcj("-n", _ns, "get", "hpa", "kartu-hpa")["status"].get("currentMetrics"), "metrik HPA terbaca", 240, 5)
    hpa = kcj("-n", _ns, "get", "hpa", "kartu-hpa")
    catat(f"HPA kartu-hpa awal: replika {hpa['status']['currentReplicas']} (min {hpa['spec']['minReplicas']}, maks {hpa['spec']['maxReplicas']}), target CPU {hpa['spec']['metrics'][0]['resource']['target']['averageUtilization']}%")
    berhenti = threading.Event()

    def beban():
        k = KoneksiGateway()
        while not berhenti.is_set():
            otorisasi(k.kirim)
        k.tutup()

    ts = [threading.Thread(target=beban, daemon=True) for _ in range(16)]
    for t in ts:
        t.start()
    saat_naik = {}

    def naik():
        h = kcj("-n", _ns, "get", "hpa", "kartu-hpa")["status"]
        if h.get("desiredReplicas", 1) > 1:
            saat_naik["cpu"] = h["currentMetrics"][0]["resource"]["current"]["averageUtilization"]
            return True
        return False

    try:
        tunggu(naik, "HPA menaikkan replika", 300, 5)
        tunggu(lambda: len([p for p in pod_milik("kartu-hpa") if pod_siap(p)]) > 1, "pod tambahan siap", 180, 3)
    finally:
        berhenti.set()
        for t in ts:
            t.join(30)
    hpa = kcj("-n", _ns, "get", "hpa", "kartu-hpa")
    maks = hpa["spec"]["maxReplicas"]
    siap = len([p for p in pod_milik("kartu-hpa") if pod_siap(p)])
    catat(f"HPA sesudah beban: replika bertambah dari 1: ya; tidak melebihi maxReplicas ({maks}): {'ya' if hpa['status']['desiredReplicas'] <= maks else 'tidak'}")
    catat(f"Pod kartu-hpa siap lebih dari 1: ya (jumlah tepat bergantung beban mesin, tidak direkam)")
    target = hpa["spec"]["metrics"][0]["resource"]["target"]["averageUtilization"]
    catat(f"CPU rata-rata pod (persen dari requests) saat HPA menaikkan replika di atas target {target}%: {'ya' if saat_naik['cpu'] > target else 'tidak'} (nilainya bergantung mesin, tidak direkam)")
    acara = [e for e in kcj("-n", _ns, "get", "events", "--field-selector", "involvedObject.name=kartu-hpa,involvedObject.kind=HorizontalPodAutoscaler")["items"] if e["reason"] == "SuccessfulRescale"]
    alasan = sorted({e["message"].split("; reason: ")[-1] for e in acara})
    catat(f"Peristiwa SuccessfulRescale dari HPA, alasan: {'; '.join(alasan)}")
    harap(saat_naik["cpu"] > target, True, "CPU di atas target saat naik")
    harap(alasan, ["cpu resource utilization (percentage of request) above target"], "alasan rescale")
    harap(siap > 1 and hpa["status"]["desiredReplicas"] <= maks, True, "HPA menambah replika dalam batas")
    catat("# Argo CD v3.5.6 Tidak dijalankan: bentrok HPA dan Argo CD soal spec.replicas tetap [perlu verifikasi] (butuh repositori Git yang terjangkau dari cluster).")
    tulis("hpa.txt", "HPA menambah replika menurut metrik CPU")


# ---------- bagian F: tes Go ----------

def go_test(*args, cwd, env):
    r = subprocess.run(["go", *args], cwd=cwd, env=env, capture_output=True, text=True)
    teks = (r.stdout + r.stderr).replace("\r\n", "\n")
    teks = re.sub(r"\(\d+\.\d\ds\)", "(<detik>)", teks)
    teks = re.sub(r"\t\d+\.\d+s$", "\t<detik>", teks, flags=re.M)
    return r.returncode, teks.strip()


def rekam_testing():
    d.buat_schema(d.TES)
    tes_db = d.db_pemilik(d.TES, "t5-rollout-tes")
    env = dict(d.ENV, TEST_DATABASE_URL=tes_db, TES_DB_WAJIB="1")
    bagian("A. go vet dan tes bertag t5rollout (sakelar dari tabel, cache, versi baru yang salah, pencacah)")
    rc, teks = go_test("vet", "-tags", "t5rollout", "./...", cwd=d.HERE, env=d.ENV)
    catat("$ go vet -tags t5rollout ./...   (di labs/api-t5)")
    catat(teks or "(tanpa temuan)")
    catat(f"# exit status {rc}")
    harap(rc, 0, "go vet")
    rc, teks = go_test("test", "-tags", "t5rollout", "-count=1", "-p", "1", "-v", "-run", "Sakelar|LabTolak|HitungOtorisasi|SetKartuAktifBO|EndpointOtorisasi", "./internal/service/", "./cmd/api/", cwd=d.HERE, env=env)
    catat(f"$ TES_DB_WAJIB=1 TEST_DATABASE_URL=<pemilik, schema {d.TES}> go test -tags t5rollout -count=1 -p 1 -v -run 'Sakelar|LabTolak|HitungOtorisasi|SetKartuAktifBO|EndpointOtorisasi' ./internal/service/ ./cmd/api/   (di labs/api-t5)")
    catat("\n".join(l for l in teks.splitlines() if not l.startswith("=== ")))
    catat(f"# exit status {rc}")
    harap(rc, 0, "tes sakelar")
    bagian("B. Tes kill switch yang sudah ada (flag memori, ADR 42) tetap lolos")
    rc, teks = go_test("test", "-count=1", "-p", "1", "-v", "-run", "KillSwitch", "./internal/service/", cwd=d.HERE, env=env)
    catat(f"$ TES_DB_WAJIB=1 TEST_DATABASE_URL=<pemilik, schema {d.TES}> go test -count=1 -p 1 -v -run KillSwitch ./internal/service/   (di labs/api-t5)")
    catat("\n".join(l for l in teks.splitlines() if not l.startswith("=== ")))
    catat(f"# exit status {rc}")
    harap(rc, 0, "tes kill switch")
    tulis("testing.txt", "tes Go untuk sakelar kartu dari tabel", cluster=False)


BAGIAN = {"tanpa-router": rekam_tanpa_router, "gateway": rekam_gateway, "analisis": rekam_analisis,
          "sakelar": rekam_sakelar, "hpa": rekam_hpa, "testing": rekam_testing}


def main():
    pilih = sys.argv[1:] or list(BAGIAN)
    for nama in pilih:
        if nama not in BAGIAN:
            sys.exit(f"bagian tidak dikenal: {nama} (pilih dari: {' '.join(BAGIAN)})")
    if not cluster_ada():
        d.port_bebas(PORT_GATEWAY)
        d.port_bebas(PORT_API)
    pertahankan = os.environ.get("T5R_PERTAHANKAN") == "1"
    subprocess.run(["go", "build", "-o", str(d.BIN), "./cmd/api"], cwd=d.HERE, check=True)   # biner host: hanya untuk -seed
    try:
        if pilih != ["testing"]:
            siapkan_cluster()
        for nama in pilih:
            d.log.clear()
            BAGIAN[nama]()
    finally:
        henti_pf()
        if pilih != ["testing"] and not pertahankan:
            hapus_cluster()
    print("selesai:", ", ".join(pilih))


if __name__ == "__main__":
    main()
