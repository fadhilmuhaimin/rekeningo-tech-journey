"""Pastikan ID internal tidak tampil ke pembaca: ID halaman (A1, B3.1, C2, ...) dan ID riset (R2-04, R3-32, ...).

Kedua jenis ID hidup di plan/, komentar kode, tes, dan field yang tidak tampil (`riset` di halaman-istilah JSON,
atribut data-*). Pembaca membaca nama sumber, versi, dan tanggal, bukan nomor baris di tabel riset.

Memeriksa situs/dist hasil build di semua tempat yang dibaca atau dibacakan pembaca:
- teks terlihat: isi artikel, kode di <pre>, sidebar, judul tab;
- atribut title (tooltip istilah dan tautan), aria-label, aria-description, alt, placeholder;
- teks SVG (text, title, desc, tspan);
- props island Astro dan script application/json inline, yang dirender JavaScript;
- string di data widget (dist/widgets/data/**/*.json) dan di javascripts/istilah-data.js.
Yang tidak diperiksa karena tidak tampil: script dan style, komentar HTML, atribut data-*, class, id, href.
Kode aturan gosec (G101, G104, ...) bukan ID halaman dan dilewati.

    bun run --cwd situs build && python3 tools/cek_id_tampil.py [--dist DIR]

Exit 1 bila ada ID yang tampil; tiap baris menyebut berkas, ID, dan potongan teksnya.
"""
import argparse
import html.parser
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
POLA = re.compile(r"(?<![\w./#-])[A-G]\d+(?:\.\d+)?(?![\w])")
POLA_RISET = re.compile(r"\bR[0-9]-[0-9]{1,3}\b")      # R<tahap>-<nomor> di plan/RISET-TAHAP-N.md
LEWAT_HAL = ()
LEWAT_TOKEN = re.compile(r"^G\d{3}$")          # aturan gosec
ATRIBUT_TAMPIL = ("title", "aria-label", "aria-description", "alt", "placeholder")
SVG_TEKS = ("text", "title", "desc", "tspan")
KUNCI_INTERNAL = ("id", "halaman", "src", "file", "fileVarian", "s", "b")   # tidak ditampilkan


class Teks(html.parser.HTMLParser):
    """Kumpulkan teks yang dibaca pembaca; lewati script, style, dan atribut yang tidak tampil."""
    def __init__(self):
        super().__init__()
        self.skip = 0            # script dan style
        self.svg = 0             # kedalaman <svg>
        self.svg_teks = 0        # kedalaman text/title/desc/tspan di dalam svg
        self.json_inline = None  # potongan script application/json yang sedang dibaca
        self.out = []            # teks terlihat
        self.atribut = []        # (tag, nama atribut, nilai)
        self.json = []           # string dari props island dan script application/json
        self.rusak = []          # JSON inline yang tidak terbaca: tidak boleh lolos diam-diam

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("script", "style"):
            self.skip += 1
            if tag == "script" and a.get("type") == "application/json":
                self.json_inline = []
        elif tag == "svg":
            self.svg += 1
        elif self.svg and tag in SVG_TEKS:
            self.svg_teks += 1
        for k, v in attrs:
            if v and k in ATRIBUT_TAMPIL:
                self.atribut.append((tag, k, v))
        if tag == "astro-island" and a.get("props"):
            self.baca_json(a["props"], "props astro-island")

    def handle_endtag(self, tag):
        if tag in ("script", "style") and self.skip:
            self.skip -= 1
            if tag == "script" and self.json_inline is not None:
                self.baca_json("".join(self.json_inline), "script application/json")
                self.json_inline = None
        elif tag == "svg" and self.svg:
            self.svg -= 1
        elif self.svg and self.svg_teks and tag in SVG_TEKS:
            self.svg_teks -= 1

    def handle_data(self, data):
        if self.json_inline is not None:
            self.json_inline.append(data)
        elif not self.skip and (not self.svg or self.svg_teks):
            self.out.append(data)

    def baca_json(self, teks, asal):
        try:
            self.json.extend(strings(json.loads(teks)))
        except ValueError as e:
            self.rusak.append(f"{asal} bukan JSON ({e})")


def temuan(teks):
    """(ID, potongan teks di sekitarnya) untuk tiap ID internal di teks."""
    hasil = []
    for pola in (POLA, POLA_RISET):
        for m in pola.finditer(teks):
            if not LEWAT_TOKEN.match(m.group(0)):
                hasil.append((m.group(0), teks[max(0, m.start() - 40):m.end() + 40].strip()))
    return hasil


def lapor(asal, teks):
    return [f"{asal}: '{x}' di \"{konteks}\"" for x, konteks in temuan(teks)]


def strings(o):
    if isinstance(o, str):
        yield o
    elif isinstance(o, list):
        for x in o:
            yield from strings(x)
    elif isinstance(o, dict):
        for k, v in o.items():
            if k not in KUNCI_INTERNAL:
                yield from strings(v)


def periksa(site):
    salah = []
    for p in sorted(site.rglob("*.html")):
        rel = str(p.relative_to(site))
        if any(x in rel for x in LEWAT_HAL) or rel.startswith(("assets/", "vendor/", "_astro/", "pagefind/")) or rel == "404.html":
            continue
        t = Teks()
        t.feed(p.read_text())
        for baris in "".join(t.out).splitlines():
            salah += lapor(rel, baris)
        for tag, k, v in t.atribut:
            salah += lapor(f"{rel} (atribut {k} pada <{tag}>)", v)
        for v in t.json:
            salah += lapor(f"{rel} (data JSON inline)", v)
        salah += [f"{rel}: {r}" for r in t.rusak]
    for p in sorted((site / "widgets/data").rglob("*.json")):
        if p.name == "cerita.json":
            continue
        for v in strings(json.loads(p.read_text())):
            salah += lapor(str(p.relative_to(site)), v)
    js = (site / "javascripts/istilah-data.js").read_text()
    for m in re.finditer(r'"(?:t|d|n)": "((?:[^"\\]|\\.)*)"', js):
        salah += lapor("javascripts/istilah-data.js", m.group(1))
    return salah


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--dist", default=str(ROOT / "situs/dist"), help="folder hasil build (bawaan situs/dist)")
    site = pathlib.Path(ap.parse_args().dist)
    if not (site / "index.html").exists():
        sys.exit("situs/dist belum ada. Jalankan: bun run --cwd situs build")
    salah = periksa(site)
    if salah:
        print("\n".join(salah))
        print(f"\nGAGAL: {len(salah)} ID internal tampil ke pembaca.")
        sys.exit(1)
    print("ID internal (halaman dan riset) tidak tampil di teks halaman, atribut, SVG, data JSON, sidebar, dan data widget.")


if __name__ == "__main__":
    main()
