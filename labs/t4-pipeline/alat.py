"""Alat pipeline lab t4-pipeline: diambil hanya dari rilis resmi proyek masing-masing di GitHub Releases, diperiksa
terhadap berkas checksum yang diterbitkan rilis DAN terhadap nilai yang dikunci di `alat.json` (dicatat 2026-10-28),
lalu dipasang di `labs/t4-pipeline/.alat/` (di-gitignore). Tidak ada `curl | sh`, tidak ada skrip pemasang yang
dijalankan, tidak ada yang dipasang ke sistem (Homebrew, /usr/local). Kegagalan checksum menghentikan lab.

Yang diperiksa: SHA-256 arsip yang diunduh sama dengan baris arsip itu di berkas checksum rilis, dan sama dengan nilai
di alat.json. Yang TIDAK diperiksa di sini: tanda tangan rilis (`.sigstore.json`); itu dikerjakan `make verifikasi-alat`
(verifikasi_alat.py), bukan bagian `make run`, karena butuh jaringan ke penyedia root of trust dan hasilnya dicatat
dengan tanggal di README.
"""
import hashlib, json, os, pathlib, platform, re, shutil, subprocess, sys, tarfile, tempfile, urllib.request

HERE = pathlib.Path(__file__).resolve().parent
ALAT = HERE / ".alat"
PIN = json.loads((HERE / "alat.json").read_text())


def gagal(pesan):
    raise SystemExit("GAGAL: " + pesan)


def platform_kunci(nama=None):
    """(os, arsitektur) menurut penamaan arsip rilis. oasdiff memakai satu arsip darwin_all untuk kedua arsitektur."""
    os_ = {"Darwin": "darwin", "Linux": "linux"}.get(platform.system())
    arsitektur = {"arm64": "arm64", "aarch64": "arm64", "x86_64": "amd64", "AMD64": "amd64"}.get(platform.machine())
    if not os_ or not arsitektur:
        gagal(f"platform {platform.system()}/{platform.machine()} tidak didukung lab ini (darwin atau linux, arm64 atau amd64)")
    if nama == "oasdiff" and os_ == "darwin":
        return os_, "all"
    return os_, arsitektur


def sha256(jalur):
    h = hashlib.sha256()
    with open(jalur, "rb") as f:
        for blok in iter(lambda: f.read(1 << 20), b""):
            h.update(blok)
    return h.hexdigest()


def unduh(url, tujuan, percobaan=4):
    galat = None
    for _ in range(percobaan):
        try:
            with urllib.request.urlopen(url, timeout=180) as resp, open(tujuan, "wb") as f:
                shutil.copyfileobj(resp, f)
            return
        except OSError as e:
            galat = e
    gagal(f"unduh {url}: {galat}")


def berkas_rilis(nama, kunci="arsip"):
    a = PIN["alat"][nama]
    os_, arsitektur = platform_kunci(nama)
    return a[kunci].format(versi=a["versi"], os=os_, arsitektur=arsitektur)


def url_rilis(nama, berkas):
    a = PIN["alat"][nama]
    return f"https://github.com/{a['repo']}/releases/download/v{a['versi']}/{berkas}"


def daftar_checksum(teks):
    """Baca berkas checksum rilis: `<sha256>  <nama>` per baris (goreleaser dan cosign memakai format ini)."""
    hasil = {}
    for baris in teks.splitlines():
        m = re.match(r"([0-9a-f]{64})\s+\*?(\S+)$", baris.strip())
        if m:
            hasil[m.group(2)] = m.group(1)
    return hasil


def dikunci(nama):
    a = PIN["alat"][nama]
    os_, arsitektur = platform_kunci(nama)
    kunci = f"{os_}_{arsitektur}"
    if kunci not in a["sha256"]:
        gagal(f"{nama} {a['versi']}: tidak ada nilai SHA-256 terkunci untuk {kunci} di alat.json")
    return a["sha256"][kunci]


def periksa_arsip(nama, arsip_jalur, teks_checksum):
    """Kembalikan SHA-256 arsip bila cocok dengan berkas checksum rilis dan dengan alat.json; kalau tidak, GAGAL."""
    berkas = berkas_rilis(nama)
    nyata = sha256(arsip_jalur)
    resmi = daftar_checksum(teks_checksum)
    if berkas not in resmi:
        gagal(f"{berkas} tidak ada di berkas checksum rilis {nama}")
    if nyata != resmi[berkas]:
        gagal(f"{nama}: SHA-256 {berkas} {nyata} berbeda dari berkas checksum rilis {resmi[berkas]}")
    if nyata != dikunci(nama):
        gagal(f"{nama}: SHA-256 {berkas} {nyata} berbeda dari nilai terkunci di alat.json {dikunci(nama)}")
    return nyata


def pastikan(nama):
    """Jalur biner alat. Mengunduh sekali ke .alat/<nama>-<versi>/, memeriksa checksum, dan memeriksa versi terpasang."""
    a = PIN["alat"][nama]
    tujuan = ALAT / f"{nama}-{a['versi']}"
    biner = tujuan / nama
    if not biner.exists():
        tujuan.mkdir(parents=True, exist_ok=True)
        kerja = pathlib.Path(tempfile.mkdtemp(prefix=f"t4p-{nama}-"))
        try:
            berkas = berkas_rilis(nama)
            cs = berkas_rilis(nama, "checksum")
            unduh(url_rilis(nama, cs), kerja / cs)
            unduh(url_rilis(nama, berkas), kerja / berkas)
            periksa_arsip(nama, kerja / berkas, (kerja / cs).read_text())
            if a["biner"] is None:       # biner tunggal tanpa arsip (cosign)
                shutil.copy2(kerja / berkas, biner)
            else:
                with tarfile.open(kerja / berkas) as t:
                    anggota = [m for m in t.getmembers() if m.name.split("/")[-1] == a["biner"] and m.isfile()]
                    if len(anggota) != 1:
                        gagal(f"{berkas}: harus tepat satu berkas {a['biner']}, ada {len(anggota)}")
                    anggota[0].name = nama
                    t.extract(anggota[0], tujuan, filter="data")
            biner.chmod(0o755)
        finally:
            shutil.rmtree(kerja, ignore_errors=True)
    versi = versi_terpasang(nama, biner)
    if a["versi"] not in versi:
        gagal(f"{nama}: biner melaporkan {versi!r}, harus memuat {a['versi']}")
    return biner


PERINTAH_VERSI = {"oasdiff": ["--version"], "gosec": ["-version"], "syft": ["version"], "grype": ["version"], "cosign": ["version"]}


def versi_terpasang(nama, biner):
    teks = ""
    for _ in range(3):   # eksekusi pertama biner baru di macOS kadang tanpa keluaran (pemeriksaan sistem); ulangi
        r = subprocess.run([str(biner)] + PERINTAH_VERSI[nama], capture_output=True, text=True, env=lingkungan())
        teks = (r.stdout + r.stderr).strip().replace("\n", " | ")
        if teks:
            break
    return teks


def lingkungan(**tambahan):
    """Lingkungan bersih untuk alat: HOME dan cache di .alat/home supaya tidak menulis ke ~, tanpa telemetri."""
    rumah = ALAT / "home"
    rumah.mkdir(parents=True, exist_ok=True)
    env = {k: v for k, v in os.environ.items() if k in ("PATH", "LANG", "TMPDIR", "TZ", "DOCKER_HOST", "DOCKER_CONFIG", "GOMODCACHE", "GOPATH", "GOCACHE", "GOFLAGS", "GOPROXY", "GOSUMDB")}
    env.update(HOME=str(rumah), XDG_CACHE_HOME=str(rumah / ".cache"), XDG_CONFIG_HOME=str(rumah / ".config"),
               GRYPE_CHECK_FOR_APP_UPDATE="false", SYFT_CHECK_FOR_APP_UPDATE="false", COSIGN_YES="true",
               DO_NOT_TRACK="1", NO_COLOR="1", TZ="Asia/Makassar")
    env.update(tambahan)
    return env


if __name__ == "__main__":
    for n in sys.argv[1:] or list(PIN["alat"]):
        print(n, pastikan(n))
