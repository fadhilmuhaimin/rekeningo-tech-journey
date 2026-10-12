"""Tautan internal di situs/dist tidak menuju halaman, berkas, atau anchor yang tidak ada (P6, keputusan 318).

Mengumpulkan href, src, dan srcset internal dari semua HTML hasil build (a, area, link, img, script, source,
iframe, video, audio, track, embed, object, SVG use/image), meresolusikannya terhadap URL halaman, lalu memeriksa:
- path: `/a/b/` -> a/b/index.html; `/a/b` -> a/b, a/b.html, atau a/b/index.html; berkas lain harus ada persis.
- anchor `#x`: halaman HTML tujuan punya tepat satu elemen dengan id `x` (atau elemen a dengan name `x`). `#` kosong
  dan `#top` (tanpa membedakan huruf besar) sah tanpa elemen: HTML Living Standard "select the indicated part"
  langkah 3 dan 10. Id ganda yang dituju tautan dianggap rusak karena browser memilih yang pertama; id ganda yang
  tidak dituju tautan tidak diperiksa di sini.
Data widget (dist/widgets/data/**/*.json) ikut diperiksa: nilai kunci `url`/`href` yang dipakai widget lama sebagai
`siteRoot + url` (kartu.js), jadi relatif terhadap akar situs. Kunci itu di data widget berarti tautan ke halaman
situs; path API di skenario ditulis dengan kunci lain.
Yang dilewati dihitung dan dicetak, supaya tidak ada tautan yang dibuang diam-diam (pelajaran contrast.py):
skema eksternal (https:, mailto:, tel:, data:, javascript:, ...), `//host`, dan atribut kosong.

    bun run --cwd situs build && python3 tools/cek_tautan.py [--dist DIR]

Exit 1 bila ada path atau anchor rusak; setiap baris RUSAK menyebut berkas HTML, href asli, dan hasil resolusinya.
"""
import html.parser
import json
import pathlib
import posixpath
import re
import sys
import urllib.parse

AKAR = pathlib.Path(__file__).resolve().parent.parent

# Atribut yang berisi satu URL, per tag. `use`/`image` SVG memakai href atau xlink:href.
ATRIBUT_URL = {
    "a": ("href",), "area": ("href",), "link": ("href",),
    "img": ("src",), "script": ("src",), "iframe": ("src",), "embed": ("src",), "track": ("src",),
    "source": ("src",), "video": ("src", "poster"), "audio": ("src",), "object": ("data",),
    "use": ("href", "xlink:href"), "image": ("href", "xlink:href"),
}
SRCSET = ("img", "source")
SKEMA = re.compile(r"^[A-Za-z][A-Za-z0-9+.\-]*:")


class Halaman(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.url = []      # (tag, atribut, nilai)
        self.id = {}       # id -> jumlah elemen

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        # Satu elemen dihitung sekali, juga bila id dan name-nya sama (<a id="x" name="x">).
        for nama in {a[k] for k in (("id", "name") if tag == "a" else ("id",)) if a.get(k)}:
            self.id[nama] = self.id.get(nama, 0) + 1
        for k in ATRIBUT_URL.get(tag, ()):
            if k in a and a[k] is not None:
                self.url.append((tag, k, a[k]))
        if tag in SRCSET and a.get("srcset"):
            for calon in a["srcset"].split(","):
                bagian = calon.strip().split()
                if bagian:
                    self.url.append((tag, "srcset", bagian[0]))

    handle_startendtag = handle_starttag


def url_halaman(dist, berkas):
    """dist/a/b/index.html -> /a/b/; dist/404.html -> /404.html."""
    rel = berkas.relative_to(dist).as_posix()
    if rel == "index.html":
        return "/"
    if rel.endswith("/index.html"):
        return "/" + rel[: -len("index.html")]
    return "/" + rel


def cari_tujuan(dist, path):
    """Path URL absolut (tanpa query/fragment) -> berkas di dist, atau None."""
    rel = urllib.parse.unquote(path).lstrip("/")
    if rel == "" or rel.endswith("/"):
        calon = [rel + "index.html"]
    else:
        calon = [rel, rel + ".html", rel + "/index.html"]
    for c in calon:
        p = dist / c
        if p.is_file():
            return p
    return None


def url_data(nilai):
    """Semua (kunci, nilai) url/href string di JSON data widget, rekursif."""
    if isinstance(nilai, dict):
        for k, v in nilai.items():
            if k in ("url", "href") and isinstance(v, str):
                yield k, v
            else:
                yield from url_data(v)
    elif isinstance(nilai, list):
        for v in nilai:
            yield from url_data(v)


def periksa(dist):
    berkas_html = sorted(dist.rglob("*.html"))
    halaman = {}
    for f in berkas_html:
        h = Halaman()
        h.feed(f.read_text(encoding="utf-8"))
        halaman[f.resolve()] = h

    diperiksa = anchor_diperiksa = 0
    lewat = {}
    rusak_path, rusak_anchor = [], []
    for f in berkas_html:
        h = halaman[f.resolve()]
        dasar = url_halaman(dist, f)
        for tag, attr, nilai in h.url:
            n = nilai.strip()
            if not n:
                lewat["kosong"] = lewat.get("kosong", 0) + 1
                continue
            if n.startswith("//") or SKEMA.match(n):
                jenis = "//host" if n.startswith("//") else n.split(":", 1)[0].lower() + ":"
                lewat[jenis] = lewat.get(jenis, 0) + 1
                continue
            mutlak = urllib.parse.urljoin("http://situs" + dasar, n)
            u = urllib.parse.urlsplit(mutlak)
            path = posixpath.normpath(u.path) + ("/" if u.path.endswith("/") and u.path != "/" else "")
            if u.path == "/":
                path = "/"
            tujuan = f if n.startswith("#") else cari_tujuan(dist, path)
            diperiksa += 1
            rel_f = f.relative_to(dist).as_posix()
            if tujuan is None:
                rusak_path.append(f"RUSAK {rel_f}: <{tag} {attr}=\"{nilai}\"> -> {path} tidak ada di dist")
                continue
            frag = urllib.parse.unquote(u.fragment)
            if frag and tujuan.suffix == ".html":
                anchor_diperiksa += 1
                jumlah = halaman[tujuan.resolve()].id.get(frag, 0)
                rel_t = tujuan.relative_to(dist).as_posix()
                if jumlah == 0 and frag.lower() != "top":
                    rusak_anchor.append(f"RUSAK {rel_f}: <{tag} {attr}=\"{nilai}\"> -> #{frag} tidak ada di {rel_t}")
                elif jumlah > 1:
                    rusak_anchor.append(f"RUSAK {rel_f}: <{tag} {attr}=\"{nilai}\"> -> #{frag} ada {jumlah} kali di {rel_t}")
    data = sorted((dist / "widgets" / "data").rglob("*.json")) if (dist / "widgets" / "data").is_dir() else []
    data_diperiksa = 0
    for f in data:
        rel_f = f.relative_to(dist).as_posix()
        for k, v in url_data(json.loads(f.read_text(encoding="utf-8"))):
            if not v.strip() or v.startswith("//") or SKEMA.match(v):
                jenis = "data " + ("kosong" if not v.strip() else "//host" if v.startswith("//") else v.split(":", 1)[0].lower() + ":")
                lewat[jenis] = lewat.get(jenis, 0) + 1
                continue
            u = urllib.parse.urlsplit(urllib.parse.urljoin("http://situs/", v))
            data_diperiksa += 1
            if cari_tujuan(dist, u.path) is None:
                rusak_path.append(f"RUSAK {rel_f}: \"{k}\": \"{v}\" -> {u.path} tidak ada di dist")
    return berkas_html, diperiksa, anchor_diperiksa, len(data), data_diperiksa, lewat, rusak_path, rusak_anchor


def main(argv):
    dist = AKAR / "situs" / "dist"
    if "--dist" in argv:
        dist = pathlib.Path(argv[argv.index("--dist") + 1]).resolve()
    if not (dist / "index.html").is_file():
        print(f"GAGAL: {dist}/index.html tidak ada; bangun situs dulu")
        return 1
    berkas_html, diperiksa, anchor_diperiksa, n_data, data_diperiksa, lewat, rusak_path, rusak_anchor = periksa(dist)
    for baris in rusak_path + rusak_anchor:
        print(baris)
    teks_lewat = ", ".join(f"{k} {v}" for k, v in sorted(lewat.items())) or "0"
    print(f"{len(berkas_html)} HTML: {diperiksa} tautan internal diperiksa ({anchor_diperiksa} dengan anchor); "
          f"{n_data} JSON data widget: {data_diperiksa} url diperiksa; dilewati: {teks_lewat}; rusak: {len(rusak_path)} path, {len(rusak_anchor)} anchor")
    return 1 if rusak_path or rusak_anchor else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
