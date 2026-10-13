"""Registry halaman dari situs/data/cerita.json, dipakai sinkron_cerita.py dan build_istilah.py.

ID halaman (A1, B3.1, ...) hanya kunci internal. Yang tampil ke pembaca:
  - nomor tampilan "T.N" = urutan baca di dalam Tahap T (dihitung dari urutan registry, termasuk halaman yang belum ada,
    supaya nomor tidak bergeser saat halaman baru ditulis)
  - judul

Rujukan antar halaman ditulis [[B3.1]] atau [[B3.1|teks sendiri]]; plugin remark situs (situs/src/plugins/remark-rujukan.mjs)
mengubahnya jadi link. Halaman ada di situs/src/content/docs/<path> dengan akhiran .mdx (atau .md).
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
LAMA = ROOT / "situs/lama"                       # widget lama, data widget, vendor, ilustrasi (dimuat apa adanya)
SITUS = ROOT / "situs/src/content/docs"
CERITA = ROOT / "situs/data/cerita.json"
TOKEN = re.compile(r"\[\[([A-Za-z0-9.\-]+)(?:\|([^\]]+))?\]\]")
URUT_BACA = ("pembuka", 1, 2, 3, 4, 5, "sampingan")   # "alat" di luar urutan baca


def muat():
    d = json.loads(CERITA.read_text())
    lengkapi(d)
    return d


def file_situs(h):
    """File halaman di situs: path registry dengan akhiran .mdx, atau .md bila tidak ada .mdx."""
    p = SITUS / h["path"]
    mdx = p.with_suffix(".mdx")
    return mdx if mdx.exists() else p


def file_konten():
    """Semua halaman Markdown/MDX di situs."""
    return sorted(f for ext in ("*.md", "*.mdx") for f in SITUS.rglob(ext))


def lengkapi(d):
    """Isi field turunan: ada, nomor."""
    hitung = {}
    for h in d["halaman"]:
        h["ada"] = file_situs(h).exists()
        h.pop("nomor", None)
        t = h["tahap"]
        # Halaman yang akan dilebur ke halaman lain (lebur_ke) tidak mendapat nomor sendiri.
        if isinstance(t, int) and not re.fullmatch(r"T\d", h["id"]) and not h.get("lebur_ke"):
            hitung[t] = hitung.get(t, 0) + 1
            h["nomor"] = f"{t}.{hitung[t]}"
    return d


def pendek(h):
    """Judul untuk rujukan di dalam kalimat: bagian sebelum titik dua, kecuali ada field 'pendek'."""
    return h.get("pendek") or h["judul"].split(":")[0]


def label(h, singkat=False):
    j = pendek(h) if singkat else h["judul"]
    return f"{h['nomor']} {j}" if h.get("nomor") else j


def url_halaman(path):
    """path registry -> URL relatif root situs: a/b.md -> a/b/, a/index.md -> a/, index.md -> ''."""
    if path == "index.md" or path.endswith("/index.md"):
        return path[: -len("index.md")]
    return path[:-3] + "/"


def url_mutlak(path):
    """path registry -> URL absolut situs: a/b.md -> /a/b/."""
    return "/" + url_halaman(path)


def urutan_baca(d):
    """Halaman yang ada, dalam urutan baca (pembuka, Tahap 1–5, sampingan)."""
    return [h for k in URUT_BACA for h in d["halaman"] if h["tahap"] == k and h["ada"]]


def ganti_token(teks, d, link=False):
    """[[ID]] -> teks polos, atau link Markdown absolut (link=True). ID tak dikenal -> ValueError."""
    by = {h["id"]: h for h in d["halaman"]}

    def f(m):
        h = by.get(m.group(1))
        if not h:
            raise ValueError(f"rujukan [[{m.group(1)}]] tidak ada di cerita.json")
        teks_link = m.group(2) or label(h, singkat=True)
        if not link:
            return teks_link
        if not h["ada"]:
            return f"{teks_link} *(segera)*"
        return f"[{teks_link}]({url_mutlak(h['path'])})"
    return TOKEN.sub(f, teks)
