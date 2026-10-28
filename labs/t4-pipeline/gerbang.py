"""Kebijakan gerbang merge per modul untuk lab t4-pipeline: membaca keluaran alat (oasdiff, gosec, govulncheck, syft,
grype, cosign) dan memutuskan LULUS atau GAGAL. Murni (tanpa menjalankan alat, tanpa jaringan), jadi bisa dites dan
diuji mutasi. `run.py` yang menjalankan alat dan memanggil fungsi di sini.

Prinsip yang dijaga (tiap prinsip punya tes di tes_gerbang.py dan mutan yang dijalankan peninjau):
  - Pemeriksa tidak boleh gagal terbuka: keluaran kosong, pemindaian tidak lengkap, atau SBOM yang tidak memuat modul
    yang diharapkan ditolak; "tidak ada temuan" hanya berlaku bila pemeriksaannya sungguh berjalan.
  - Ambang keparahan eksplisit dan peringkatnya terurut; tingkat yang tidak dikenal dianggap paling berat.
  - Tanda tangan hanya berarti atas digest: referensi tag ditolak, dan digest di dalam tanda tangan harus sama dengan
    digest yang dibangun CI.
"""
import json, re

# ---------- oasdiff ----------

TINGKAT_OASDIFF = {1: "INFO", 2: "WARN", 3: "ERR"}
RANK_OASDIFF = {"INFO": 1, "WARN": 2, "ERR": 3}


def parse_oasdiff(teks_json):
    """Keluaran `oasdiff breaking -f json`: daftar temuan terurut (operasi, id, teks). Selain daftar JSON = ValueError."""
    try:
        data = json.loads(teks_json)
    except json.JSONDecodeError as e:
        raise ValueError(f"keluaran oasdiff bukan JSON: {e}") from e
    if not isinstance(data, list):
        raise ValueError("keluaran oasdiff harus berupa daftar")
    hasil = []
    for t in data:
        if t.get("level") not in TINGKAT_OASDIFF:
            raise ValueError(f"tingkat oasdiff tidak dikenal: {t.get('level')!r}")
        hasil.append({"id": t["id"], "tingkat": TINGKAT_OASDIFF[t["level"]],
                      "operasi": f'{t.get("operation", "")} {t.get("path", "")}'.strip(), "teks": t["text"]})
    return sorted(hasil, key=lambda t: (t["operasi"], t["id"], t["teks"]))


def melewati_ambang_oasdiff(temuan, ambang):
    """Temuan yang menggagalkan gerbang: tingkatnya sama dengan ambang atau lebih berat."""
    if ambang not in RANK_OASDIFF:
        raise ValueError(f"ambang oasdiff harus ERR atau WARN atau INFO, bukan {ambang!r}")
    return [t for t in temuan if RANK_OASDIFF[t["tingkat"]] >= RANK_OASDIFF[ambang]]


# ---------- gosec ----------

def parse_gosec(teks_json, awalan_jalur=""):
    """Keluaran `gosec -fmt=json` (tanpa -quiet). Mengembalikan (temuan, galat_pemindaian, statistik).
    `Golang errors` yang tidak kosong berarti ada paket yang tidak terbaca: temuannya bisa hilang diam-diam."""
    try:
        d = json.loads(teks_json)
    except json.JSONDecodeError as e:
        raise ValueError(f"keluaran gosec bukan JSON: {e}") from e
    temuan = []
    for i in d.get("Issues") or []:
        jalur = i["file"]
        if awalan_jalur and jalur.startswith(awalan_jalur):
            jalur = jalur[len(awalan_jalur):].lstrip("/")
        temuan.append({"aturan": i["rule_id"], "keparahan": i["severity"], "keyakinan": i["confidence"],
                       "cwe": i.get("cwe", {}).get("id", ""), "berkas": jalur, "baris": int(i["line"]), "teks": i["details"]})
    galat = sorted(f"{k.rsplit('/', 1)[-1] if k else '(paket)'}: {e['error'].splitlines()[-1]}"
                   for k, v in (d.get("Golang errors") or {}).items() for e in v)
    stat = d.get("Stats") or {}
    return sorted(temuan, key=lambda t: (t["berkas"], t["baris"], t["aturan"])), galat, stat


RANK_GOSEC = {"LOW": 1, "MEDIUM": 2, "HIGH": 3}


def putuskan_gosec(temuan, galat, stat, ambang="MEDIUM"):
    """(lulus, alasan). Pemindaian tidak lengkap atau tanpa berkas = GAGAL, sebelum menghitung temuan."""
    if ambang not in RANK_GOSEC:
        raise ValueError(f"ambang gosec harus LOW, MEDIUM, atau HIGH, bukan {ambang!r}")
    if galat:
        return False, f"pemindaian tidak lengkap ({len(galat)} galat paket)"
    if not stat.get("files"):
        return False, "gosec tidak memindai satu berkas pun"
    if stat.get("found") != len(temuan):
        return False, f"statistik gosec ({stat.get('found')}) berbeda dari daftar temuan ({len(temuan)})"
    berat = [t for t in temuan if RANK_GOSEC.get(t["keparahan"], 99) >= RANK_GOSEC[ambang]]
    if berat:
        return False, f"{len(berat)} temuan keparahan {ambang} atau lebih"
    return True, "tidak ada temuan di atas ambang"


# ---------- govulncheck ----------

def baca_aliran_json(teks):
    """govulncheck -format json mencetak beberapa objek JSON berurutan, bukan satu daftar."""
    dec, i, hasil = json.JSONDecoder(), 0, []
    while True:
        while i < len(teks) and teks[i].isspace():
            i += 1
        if i >= len(teks):
            return hasil
        obj, i = dec.raw_decode(teks, i)
        hasil.append(obj)


def parse_govulncheck(teks):
    """Daftar temuan unik per (osv, modul, dipanggil). `dipanggil` benar bila jejak berisi fungsi di kode kita:
    hanya itu yang dihitung govulncheck sebagai kode yang terpengaruh. Tanpa pesan `config` = ValueError."""
    objek = baca_aliran_json(teks)
    if not any("config" in o for o in objek):
        raise ValueError("keluaran govulncheck tidak memuat config: pemindaian tidak berjalan")
    temuan = {}
    for o in objek:
        f = o.get("finding")
        if not f:
            continue
        jejak = f["trace"]
        dipanggil = bool(jejak[0].get("function"))
        modul, versi = jejak[0].get("module", ""), jejak[0].get("version", "")
        kunci = (f["osv"], modul, dipanggil)
        ada = temuan.get(kunci, {})
        langkah = ""
        if dipanggil:
            # jejak dimulai dari fungsi rentan; kode kita adalah bingkai pertama yang tidak punya versi modul
            milik = next((t for t in jejak[1:] if t.get("function") and not t.get("version")), None)
            if milik:
                langkah = (f'{milik.get("package", "").rsplit("/", 1)[-1]}.{milik["function"]} memanggil '
                           f'{jejak[0].get("package", "").rsplit("/", 1)[-1]}.{jejak[0]["function"]}')
        temuan[kunci] = {"osv": f["osv"], "modul": modul, "versi": versi, "diperbaiki": f.get("fixed_version", ""),
                         "dipanggil": dipanggil, "jejak": ada.get("jejak") or langkah}
    return sorted(temuan.values(), key=lambda t: (not t["dipanggil"], t["osv"], t["modul"]))


def putuskan_govulncheck(temuan, modul_kita=None):
    """GAGAL bila ada kerentanan yang dipanggil kode kita; yang hanya ada di modul atau paket yang diimpor dicatat."""
    dipanggil = [t for t in temuan if t["dipanggil"]]
    if dipanggil:
        return False, f"{len(dipanggil)} kerentanan dipanggil kode: " + ", ".join(sorted({t['osv'] for t in dipanggil}))
    return True, "tidak ada kerentanan yang dipanggil kode"


# ---------- SBOM dan grype ----------

def parse_sbom(teks_json):
    """Ringkasan SBOM CycloneDX: versi spesifikasi dan pustaka (nama, versi). Bukan CycloneDX = ValueError."""
    d = json.loads(teks_json)
    if d.get("bomFormat") != "CycloneDX":
        raise ValueError(f"bukan CycloneDX: bomFormat={d.get('bomFormat')!r}")
    perpustakaan = [c for c in d.get("components", []) if c.get("type") == "library"]
    pustaka = sorted({(c["name"], c.get("version", "")) for c in perpustakaan})
    modul_go = sorted({(c["name"], c.get("version", "")) for c in perpustakaan if c.get("purl", "").startswith("pkg:golang/")})
    return {"spesifikasi": d.get("specVersion", ""), "pustaka": pustaka, "go": modul_go}


def sbom_lengkap(ringkas, diharapkan):
    """(lengkap, hilang). SBOM yang tidak memuat modul yang diharapkan (dari go.mod) tidak boleh dipercaya:
    grype atas SBOM kosong melapor nol temuan."""
    ada = set(ringkas["pustaka"])
    hilang = sorted(m for m in diharapkan if m not in ada)
    return not hilang, hilang


def baca_go_mod(teks):
    """Pasangan (modul, versi) dari baris `require` di go.mod (satu baris dan blok), tanpa komentar."""
    hasil, dalam_blok = [], False
    for baris in teks.splitlines():
        baris = baris.split("//")[0].strip()
        if baris.startswith("require ("):
            dalam_blok = True
        elif dalam_blok and baris == ")":
            dalam_blok = False
        elif dalam_blok and baris:
            hasil.append(tuple(baris.split()[:2]))
        elif baris.startswith("require ") and "(" not in baris:
            hasil.append(tuple(baris.split()[1:3]))
    return sorted(hasil)


RANK_GRYPE = {"Negligible": 1, "Low": 2, "Medium": 3, "High": 4, "Critical": 5}


def parse_grype(teks_json):
    """Temuan grype terurut dan keterangan basis data. `Unknown` dan tingkat lain yang tidak dikenal dibawa apa adanya."""
    d = json.loads(teks_json)
    if "matches" not in d:
        raise ValueError("keluaran grype tidak memuat matches")
    db = d.get("descriptor", {}).get("db", {}).get("status", {})
    temuan = []
    for m in d["matches"]:
        v, a = m["vulnerability"], m["artifact"]
        perbaikan = ", ".join(v.get("fix", {}).get("versions", [])) or "-"
        temuan.append({"id": v["id"], "keparahan": v["severity"], "paket": a["name"], "versi": a["version"], "diperbaiki": perbaikan})
    return sorted(temuan, key=lambda t: (-RANK_GRYPE.get(t["keparahan"], 99), t["paket"], t["id"])), \
        {"skema": db.get("schemaVersion", ""), "dibangun": db.get("built", "")}


def melewati_ambang_grype(temuan, ambang):
    """Tingkat yang tidak dikenal (Unknown) dihitung paling berat: lebih baik menahan merge daripada meloloskannya."""
    if ambang not in RANK_GRYPE:
        raise ValueError(f"ambang grype harus salah satu dari {sorted(RANK_GRYPE)}, bukan {ambang!r}")
    return [t for t in temuan if RANK_GRYPE.get(t["keparahan"], 99) >= RANK_GRYPE[ambang]]


def putuskan_sbom(ringkas, diharapkan, temuan, ambang="High"):
    lengkap, hilang = sbom_lengkap(ringkas, diharapkan)
    if not lengkap:
        return False, "SBOM tidak memuat: " + ", ".join(f"{n} {v}" for n, v in hilang)
    berat = melewati_ambang_grype(temuan, ambang)
    if berat:
        return False, f"{len(berat)} temuan {ambang} atau lebih"
    return True, f"SBOM memuat semua modul yang diharapkan, tanpa temuan {ambang} atau lebih"


# ---------- digest dan tanda tangan ----------

RE_DIGEST = re.compile(r"^[a-z0-9][^@\s]*@sha256:[0-9a-f]{64}$")
RE_PUSH = re.compile(r"\bdigest: (sha256:[0-9a-f]{64}) size: \d+")


def referensi_digest(ref):
    """Benar hanya untuk `nama@sha256:<64 heksadesimal>`. Tag, tag + digest, dan digest yang terpotong ditolak."""
    return bool(RE_DIGEST.match(ref))


def digest_dari_push(keluaran):
    """Digest image dibaca dari keluaran `docker push` (bukan ditulis tangan). Harus tepat satu."""
    ada = RE_PUSH.findall(keluaran)
    if len(ada) != 1:
        raise ValueError(f"keluaran push harus memuat tepat satu digest, ada {len(ada)}")
    return ada[0]


def digest_dalam_tanda_tangan(teks_verify):
    """Digest manifes yang tercantum di payload tanda tangan, dari JSON di keluaran `cosign verify`."""
    awal = teks_verify.find("[")
    if awal < 0:
        return set()
    try:
        daftar = json.loads(teks_verify[awal:])
    except json.JSONDecodeError:
        return set()
    return {p["critical"]["image"]["docker-manifest-digest"] for p in daftar}


def putuskan_tanda_tangan(ref, digest_dibangun, kode_keluar, keluaran):
    """(lulus, alasan). Urutan pemeriksaan: bentuk referensi, kecocokan dengan digest yang dibangun, hasil cosign,
    lalu digest di dalam tanda tangan."""
    if not referensi_digest(ref):
        return False, "referensi bukan digest (tag bisa dipindah)"
    if not ref.endswith("@" + digest_dibangun):
        return False, "digest di referensi bukan digest yang dibangun CI"
    if kode_keluar != 0:
        return False, "cosign verify gagal"
    ditandatangani = digest_dalam_tanda_tangan(keluaran)
    if ditandatangani != {digest_dibangun}:
        return False, "digest di tanda tangan berbeda dari digest yang dibangun"
    return True, "tanda tangan sah atas digest yang dibangun"


# ---------- pipeline per modul ----------

ATURAN_LANGKAH = [
    (re.compile(r"^labs/api-t4/openapi\.yaml$"), ["kontrak", "klien"]),
    (re.compile(r"^labs/api-t4/go\.(mod|sum)$"), ["audit-dependensi", "sbom"]),
    (re.compile(r"^labs/api-t4/(Dockerfile|cmd/api/.*)$"), ["image"]),
]
RE_MODUL = re.compile(r"^labs/api-t4/internal/modul/([a-z0-9_]+)/.*\.go$")


def langkah_untuk(berkas_berubah):
    """Langkah pipeline yang dijalankan untuk satu PR menurut berkas yang berubah: tes dan SAST hanya untuk modul yang
    disentuh (satu langkah per modul), kontrak hanya bila openapi.yaml berubah, audit dependensi dan SBOM hanya bila
    go.mod atau go.sum berubah, image hanya bila Dockerfile atau titik masuk berubah."""
    langkah = set()
    for b in berkas_berubah:
        m = RE_MODUL.match(b)
        if m:
            langkah.update({f"tes-modul:{m.group(1)}", f"sast:{m.group(1)}"})
        for pola, daftar in ATURAN_LANGKAH:
            if pola.match(b):
                langkah.update(daftar)
    return sorted(langkah)
