"""Sinkronkan semua turunan dari situs/data/cerita.json (satu sumber cerita Rekeningo).

ID halaman (A1, B3.1, ...) hanya kunci internal. Pembaca melihat nomor tampilan "T.N" (urutan baca di
dalam Tahap T) dan judul. Rujukan antar halaman ditulis [[ID]] dan dirender plugin remark situs. Lihat tools/registri.py.
Halaman dibaca dari situs/src/content/docs (MDX); sidebar dibuat situs/tools/sidebar.mjs langsung dari cerita.json.

Yang ditulis:
  - cerita.json         field turunan: "ada", "nomor", "menit" per halaman; "jalur_inti" per tahap
  - setiap halaman      nomor tampilan di title front matter; baris meta <p class="meta"> "Prasyarat: ... · Jalur inti"
                        dibuat dari field "prasyarat", "prasyarat_lain", dan "inti"
  - alat/indeks-topik.mdx  indeks per topik (field "topik")
  - widgets/data/kartu.json  kartu ulang, diambil dari bagian "## Cek diri" setiap halaman
  - cerita/tahap-N.mdx  tabel "Masalah yang muncul" di antara {/* daftar-tahap */} dan {/* /daftar-tahap */}

Yang diperiksa (--check, juga dijalankan tools/cek_situs.sh):
  - semua file di atas sinkron dengan cerita.json
  - tidak ada halaman yang muncul sebelum prasyaratnya (urutan registry = urutan baca)
  - setiap rujukan [[ID]] di halaman situs dan data widget menunjuk ID yang ada
  - angka asumsi beban di tabel halaman mana pun cocok dengan hitungan dari cerita.json (toleransi 5%)
    Baris tabel dikenali dari kolom pertama: "User terdaftar", "DAU"/"User aktif harian",
    "Request per hari", "Puncak ...", "Data transaksi per tahun", "File ... per tahun".
    Tahapnya: "(Tahap N)" di label, kalau tidak ada, data-tahap halaman.

    python tools/sinkron_cerita.py           # tulis ulang
    python tools/sinkron_cerita.py --check   # exit 1 kalau ada yang tidak sinkron atau angka berbeda
"""
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from registri import (ROOT, LAMA, SITUS, CERITA, TOKEN, URUT_BACA, lengkapi, label, url_halaman,  # noqa: E402
                      url_mutlak, ganti_token, file_situs, file_konten)

INDEKS = SITUS / "alat/indeks-topik.mdx"
KARTU = LAMA / "widgets/data/kartu.json"
MAKS_INTI = 175

TOPIK = ["Gambaran besar", "API", "Data", "Keamanan", "Struktur kode", "Operasional", "Skala dan kinerja",
         "Integrasi pihak ketiga", "Khusus app mobile", "Desain sistem", "Bekerja dengan AI"]
BERID = re.compile(r"^[A-G]\d")          # ID lama (A1, B3.1, D4c): halaman konsep yang punya Cek diri
PREFIKS = re.compile(r"^(?:[A-G]\d+(?:\.\d+)?[a-c]? · |\d\.\d+ )")
NAMA_TAHAP = {}
DATA = {}

# ---- angka asumsi -----------------------------------------------------------------------------

def hitung(a):
    dau = a["user"] * a["aktif"] / 100
    req = dau * a["req"]
    out = {"user": a["user"], "dau": dau, "req": req, "puncak": req / 86400 * a["puncak"],
           "data": dau * a["trx"] * 365 * a["baris"]}
    if a.get("upload"):
        out["file"] = a["upload"] * a["fileKB"] * 1000 * 365
    return out


LABEL = [("user", r"^user terdaftar"), ("dau", r"^(dau|user aktif harian)"), ("req", r"^request per hari"),
         ("puncak", r"^puncak"), ("data", r"^data transaksi per tahun"), ("file", r"^file.*per tahun")]
SATUAN = {"juta": 1e6, "mb": 1e6, "gb": 1e9, "tb": 1e12, "kb": 1e3, "b": 1}


def angka(sel):
    """'±6,6 MB' -> 6.6e6 · '1,2 juta' -> 1.2e6 · '±0,14' -> 0.14 · '12.000' -> 12000."""
    s = re.sub(r"[*`±~≈]", "", sel).strip().lower()
    m = re.match(r"^([\d.]+(?:,\d+)?)\s*(juta|tb|gb|mb|kb|b)?\b", s)
    if not m:
        return None
    v = float(m.group(1).replace(".", "").replace(",", "."))
    return v * SATUAN.get(m.group(2) or "", 1)


def cek_angka(tahap):
    salah = []
    nilai = {t["no"]: hitung(t["asumsi"]) for t in tahap}
    for p in file_konten():
        teks = p.read_text()
        m = re.search(r'tahap=\{(\d)\}|data-tahap="(\d)"', teks)
        tahap_hal = int(m.group(1) or m.group(2)) if m else None
        for no, baris in enumerate(teks.splitlines(), 1):
            if not baris.startswith("|") or baris.startswith("|---"):
                continue
            sel = [c.strip() for c in baris.strip("|").split("|")]
            if len(sel) < 2:
                continue
            lab = re.sub(r"[*`]", "", sel[0]).strip()
            kunci = next((k for k, rx in LABEL if re.search(rx, lab, re.I)), None)
            if not kunci:
                continue
            mt = re.search(r"\(Tahap (\d)\)", lab)
            t = int(mt.group(1)) if mt else tahap_hal
            if t is None or kunci not in nilai[t]:
                continue
            v = angka(sel[1])
            harus = nilai[t][kunci]
            if v is None or abs(v - harus) > 0.05 * harus:
                salah.append(f"{p.relative_to(ROOT)}:{no}: '{lab}' = '{sel[1]}', cerita.json Tahap {t} = {harus:g}")
    return salah


# ---- turunan ----------------------------------------------------------------------------------

def indeks(hs, lama):
    """Isi indeks per topik. Kepala file (front matter, import, komentar, pengantar) diambil dari file lama."""
    kepala = lama.split("\n## ", 1)[0].rstrip("\n") + "\n"
    ekor = "\n\n\n\n<SkripLama daftar={[]} />\n" if "<SkripLama" in lama else "\n"
    out = []
    for topik in TOPIK:
        isi = [h for h in hs if h.get("topik") == topik]
        if not isi:
            continue
        out += ["", f"## {topik}", "", "| Halaman | Tahap | Masalah yang dijawab |", "|---|---|---|"]
        for h in isi:
            nama = f"[{label(h)}]({url_mutlak(h['path'])})" if h["ada"] else f"{label(h)} · *segera*"
            t = f"Tahap {h['tahap']}" if isinstance(h["tahap"], int) else {"sampingan": "Studi sampingan"}.get(h["tahap"], "")
            out.append(f"| {nama} | {t} | {h.get('masalah', '–')} |")
    return kepala + "\n".join(out) + ekor


def daftar_tahap(no, hs):
    out = ["| Masalah | Halaman |", "|---|---|"]
    for h in hs:
        if h["tahap"] != no or not h.get("masalah"):
            continue
        nama = f"[{label(h)}]({url_mutlak(h['path'])})" if h["ada"] else f"{label(h)} · *segera*"
        out.append(f"| {h['masalah']} | {nama} |")
    return "\n".join(out)


def polos(md):
    md = ganti_token(md, DATA)
    md = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", md)
    return re.sub(r"\s+", " ", md.replace("**", "")).strip()


def kartu(hs):
    """Soal "**N.** ..." + <details class="success"><summary>Jawaban</summary> di bagian Cek diri.
    Heading boleh ## (halaman lama) atau ### (di dalam blok Kunci, keputusan 127); bagian berakhir di heading
    berikutnya atau di akhir blok."""
    out = []
    for h in hs:
        if not h["ada"] or not (h.get("nomor") or h.get("lebur_ke") or BERID.match(h["id"])):
            continue
        teks = file_situs(h).read_text()
        m = re.search(r"^#{2,3} Cek diri\s*$(.*?)(?=^#{1,3} |^</Blok>|\Z)", teks, re.S | re.M)
        if not m:
            continue
        rx = (r"^\*\*(\d+)\.\*\*\s+(.+?)\n\n"                          # soal satu baris
              r"(?:```[^\n]*\n((?:(?!```)[^\n]*\n)*)```\n\n)?"             # blok kode opsional
              r"<details class=\"\w+\">\n<summary>Jawaban</summary>\n\n(.*?)\n\n</details>")
        for sm in re.finditer(rx, m.group(1), re.M | re.S):
            c = {"id": f"{h['id']}-{sm.group(1)}", "halaman": h["id"], "judul": label(h),
                 "url": url_halaman(h["path"]), "tanya": polos(sm.group(2)), "jawab": polos(sm.group(4))}
            if sm.group(3):
                c["kode"] = sm.group(3).rstrip("\n")
            out.append(c)
    return out


# ---- judul dan baris meta per halaman --------------------------------------------------------

def judul_bernomor(isi, h):
    """Title front matter: buang prefiks lama (ID atau nomor), pasang nomor tampilan. MDX tidak punya H1 di badan."""
    pre = f"{h['nomor']} " if h.get("nomor") else ""

    def fm(m):
        q, t = m.group(2), m.group(3)
        return f"{m.group(1)}{q}{pre}{PREFIKS.sub('', t)}{q}"
    return re.sub(r'^(title: )("?)(.*?)\2$', fm, isi, count=1, flags=re.M)


def meta_baru(isi, h):
    """Baris meta 'Baca N menit · ... · Prasyarat: [[ID]] · Jalur inti' dari field registry."""
    m = re.search(r'^<p class="meta">(Baca [^\n]*?)</p>$', isi, re.M)
    if not m:
        return isi
    bag = m.group(1).split(" · ")
    posisi = next((i for i, b in enumerate(bag) if b.startswith("Prasyarat:")), None)
    bag = [b for b in bag if not b.startswith("Prasyarat:") and b != "Jalur inti"]
    if "prasyarat" in h or posisi is not None:
        isi_p = [f"[[{x}]]" for x in h.get("prasyarat", [])] + ([h["prasyarat_lain"]] if h.get("prasyarat_lain") else [])
        bag.insert(posisi if posisi is not None else len(bag), "Prasyarat: " + (", ".join(isi_p) or "tidak ada"))
    if h.get("inti"):
        bag.append("Jalur inti")
    return isi[: m.start(1)] + " · ".join(bag) + isi[m.end(1):]


def menit(isi):
    m = re.search(r'^<p class="meta">Baca (\d+) menit(?: · coba (\d+) menit)?', isi, re.M)
    return int(m.group(1)) + int(m.group(2) or 0) if m else None


# ---- pemeriksaan ------------------------------------------------------------------------------

def cek_prasyarat(hs):
    salah = []
    urut = [h for k in URUT_BACA for h in hs if h["tahap"] == k]
    idx = {h["id"]: i for i, h in enumerate(urut)}
    for h in urut:
        for p in h.get("prasyarat", []):
            if p not in idx:
                salah.append(f"cerita.json: prasyarat {p} dari {h['id']} tidak dikenal")
            elif idx[p] > idx[h["id"]]:
                salah.append(f"cerita.json: {h['id']} ({label(h)}) muncul sebelum prasyaratnya {p}")
    return salah


def cek_token(ids):
    salah = []
    for p in file_konten() + sorted((LAMA / "widgets/data").rglob("*.json")):
        if p == CERITA:
            continue
        for m in TOKEN.finditer(p.read_text()):
            if m.group(1) not in ids and m.group(1) != "berikutnya":
                salah.append(f"{p.relative_to(ROOT)}: rujukan [[{m.group(1)}]] tidak ada di cerita.json")
    return salah


def main():
    check = "--check" in sys.argv
    d = json.loads(CERITA.read_text())
    lengkapi(d)
    DATA.update(d)
    for t in d["tahap"]:
        NAMA_TAHAP[t["no"]] = t["nama"]
    hs = d["halaman"]
    beda = []
    ids = [h["id"] for h in hs]
    if len(ids) != len(set(ids)):
        beda.append("cerita.json: id halaman ganda")
    tanpa = [h["id"] for h in hs if h["tahap"] not in ("pembuka", "alat") and not h["id"].startswith("T")
             and h.get("topik") not in TOPIK]
    if tanpa:
        beda.append("cerita.json: halaman tanpa topik yang dikenal: " + ", ".join(tanpa))
    beda += cek_prasyarat(hs)
    beda += cek_token(set(ids))

    tulis = {}
    for h in hs:
        if not h["ada"] or h["tahap"] == "alat":
            continue
        p = file_situs(h)
        lama = tulis.get(p, p.read_text())
        baru = meta_baru(lama, h)
        if h.get("nomor") or h.get("lebur_ke") or BERID.match(h["id"]):
            baru = judul_bernomor(baru, h)
        if baru != lama:
            tulis[p] = baru
        h.pop("menit", None)
        if menit(baru) is not None:
            h["menit"] = menit(baru)
    for t in d["tahap"]:
        inti = [h for h in hs if h["tahap"] == t["no"] and h["ada"] and h.get("inti")]
        t["jalur_inti"] = {"menit": sum(h.get("menit", 0) for h in inti), "halaman": len(inti)}

    tulis[CERITA] = json.dumps(d, ensure_ascii=False, indent=2) + "\n"
    tulis[INDEKS] = indeks(hs, INDEKS.read_text())
    for t in d["tahap"]:
        hal = next((h for h in hs if h["id"] == f"T{t['no']}" and h["ada"]), None)
        if not hal:
            continue
        p = file_situs(hal)
        isi = tulis.get(p, p.read_text())
        if "{/* daftar-tahap */}" in isi:
            tulis[p] = re.sub(r"\{/\* daftar-tahap \*/\}.*?\{/\* /daftar-tahap \*/\}",
                              lambda _: "{/* daftar-tahap */}\n" + daftar_tahap(t["no"], hs) + "\n{/* /daftar-tahap */}",
                              isi, flags=re.S)

    for p, c in tulis.items():
        lama = p.read_text() if p.exists() else ""
        if lama != c:
            if check:
                beda.append(f"belum sinkron: {p.relative_to(ROOT)}")
            else:
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_text(c)
                print("ditulis:", p.relative_to(ROOT))
    # Kartu dibaca dari halaman yang sudah ditulis ulang di atas.
    kartu_json = json.dumps(kartu(hs), ensure_ascii=False, indent=1) + "\n"
    if (KARTU.read_text() if KARTU.exists() else "") != kartu_json:
        if check:
            beda.append(f"belum sinkron: {KARTU.relative_to(ROOT)}")
        else:
            KARTU.write_text(kartu_json)
            print("ditulis:", KARTU.relative_to(ROOT))
    if not check:
        # Link tooltip istilah bergantung pada halaman yang ada: bangun ulang sekalian.
        import subprocess
        subprocess.run([sys.executable, str(ROOT / "tools/build_istilah.py")], check=True)
    # Halaman konsep versi baru wajib punya Cek diri dengan minimal 3 soal yang terbaca sebagai kartu (CLAUDE.md).
    per_hal = {}
    for c in kartu(hs):
        per_hal[c["halaman"]] = per_hal.get(c["halaman"], 0) + 1
    for h in hs:
        if h.get("ada") and h.get("jenis") == "konsep" and not h.get("lama"):
            if per_hal.get(h["id"], 0) < 3:
                beda.append(f"{label(h)}: Cek diri {per_hal.get(h['id'], 0)} soal terbaca sebagai kartu, minimal 3")
    beda += cek_angka(d["tahap"])
    # Aturan layar pertama: Inti pendek supaya diagram di bawahnya muat di 375×667.
    for p in file_konten():
        m = re.search(r"^## Inti\n\n([^\n]+)", p.read_text(), re.M)
        if m and len(m.group(1)) > MAKS_INTI:
            print(f"PERINGATAN {p.relative_to(ROOT)}: Inti {len(m.group(1))} karakter (> {MAKS_INTI}); "
                  "pastikan situs/tools/layar.mjs lolos di 375x667")
    if beda:
        print("\n".join(beda))
        sys.exit(1)
    ada = sum(h["ada"] for h in hs)
    print(f"cerita sinkron · {ada}/{len(hs)} halaman ada · prasyarat urut · angka asumsi cocok")


if __name__ == "__main__":
    main()
