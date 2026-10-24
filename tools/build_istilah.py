"""Bangun data tooltip istilah dari situs/src/content/docs/alat/glosarium.mdx (satu-satunya sumber).

Kolom "Halaman" berisi rujukan [[ID]] (mis. [[B3.1]]); plugin remark situs merendernya jadi link berjudul.
Path dan label (nomor tampilan + judul) diambil dari registry situs/data/cerita.json (tools/registri.py);
link popover hanya dibuat untuk halaman yang sudah ada.

Menghasilkan tiga file:
  situs/data/istilah.md               definisi abbr (*[RLS]: ...), dibaca plugin
                                    situs/src/plugins/remark-abbr.mjs (keputusan 107)
  situs/lama/javascripts/istilah-data.js  ringkasan + bab rujukan untuk popover
  situs/data/glosarium.json           satu baris per istilah (istilah, kalimat pertama, slug, halaman istilah),
                                    dibaca rute /istilah/<slug>/ dan plugin remark-glosarium (keputusan 685)

Halaman istilah: situs/data/halaman-istilah/<slug>.json, slug = nama istilah tanpa kurung dalam huruf kecil dan strip
(mis. "Idempotency key" -> idempotency-key). Setiap file wajib punya baris glosarium dengan slug yang sama.

    python tools/build_istilah.py           # tulis ulang kedua file
    python tools/build_istilah.py --check   # gagal bila file belum sinkron dengan glosarium
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
GLOS = ROOT / "situs/src/content/docs/alat/glosarium.mdx"
CERITA = ROOT / "situs/data/cerita.json"
OUT_MD = ROOT / "situs/data/istilah.md"
OUT_JS = ROOT / "situs/lama/javascripts/istilah-data.js"
OUT_JSON = ROOT / "situs/data/glosarium.json"
HAL_ISTILAH = ROOT / "situs/data/halaman-istilah"

# Sebutan lain yang sering dipakai di teks tapi tidak tertulis di kolom istilah.
EXTRA = {
    "Authentication": ["Auth", "auth"],
    "HTTP method": ["GET", "POST", "PUT", "PATCH"],
    "PII": ["data pribadi"],
    "N+1 query": ["N+1"],
    "Span / Tracing": ["trace"],
    "Partitioning": ["partisi", "Partisi"],
}
# Kunci yang terlalu umum untuk ditandai otomatis.
SKIP = {"Index", "index", "Package", "package", "Mount", "mount", "Fake", "fake", "Mock", "mock",
        "Receiver", "receiver", "Claim", "claim", "Callback", "callback", "Metrics", "metrics",
        "Coverage", "coverage", "Scope", "scope", "Entity", "entity", "Panic", "panic"}
OK_KEY = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 ._+/\-→]*$")


def plain(md):
    return re.sub(r"\s+", " ", md.replace("**", "").replace("`", "")).strip()


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def nav_paths():
    """ID halaman -> (URL relatif root situs atau None kalau belum ada, label tampilan)."""
    sys.path.insert(0, str(ROOT / "tools"))
    import registri
    return {h["id"]: (registri.url_halaman(h["path"]) if h["ada"] else None, registri.label(h, singkat=True))
            for h in registri.muat()["halaman"]}


def halaman_istilah():
    """Slug istilah yang sudah punya halaman /istilah/<slug>/ (file situs/data/halaman-istilah/<slug>.json)."""
    return sorted(f.stem for f in HAL_ISTILAH.glob("*.json")) if HAL_ISTILAH.exists() else []


def parse():
    paths = nav_paths()
    halaman = set(halaman_istilah())
    entries = []
    for line in GLOS.read_text().splitlines():
        m = re.match(r"^\| \*\*(.+?)\*\*(.*?) \| (.+?) \| (.+?) \|$", line)
        if not m:
            continue
        bold, rest, definition, bab = m.groups()
        term = plain(bold)
        keys = []
        for part in re.split(r" / ", re.sub(r"\s*\(.*?\)", "", term)):
            keys.append(part.strip())
        for paren in re.findall(r"\(([^)]*)\)", bold + rest):
            p = plain(paren)
            if re.fullmatch(r"[A-Za-z][A-Za-z ]{1,40}", p) and re.search(r"[A-Z]", p):
                keys.append(p)
        base = re.sub(r"\s*\(.*?\)", "", term)
        keys += EXTRA.get(base, [])
        variants = []
        for k in keys:
            variants.append(k)
            if re.search(r"[a-z]", k[1:] if len(k) > 1 else "") and k[:1].isupper() and not re.search(r"[A-Z]", k[1:]):
                variants.append(k[0].lower() + k[1:])
        keys = [k for k in dict.fromkeys(variants) if OK_KEY.match(k) and k not in SKIP and len(k) > 1]
        b = re.search(r"\[\[([^\]|]+)", bab)
        bab_no = b.group(1) if b else None
        u, n = paths.get(bab_no, (None, None))
        sl = slug(base)
        entries.append(dict(term=plain(bold + rest), d=plain(definition), b=bab_no, n=n, u=u,
                            s="istilah-" + sl, h=f"istilah/{sl}/" if sl in halaman else None, keys=keys))
    yatim = sorted(halaman - {e["s"][len("istilah-"):] for e in entries})
    if yatim:
        sys.exit("halaman istilah tanpa baris di glosarium.mdx (slug harus sama dengan nama istilah): "
                 + ", ".join(f"situs/data/halaman-istilah/{x}.json" for x in yatim))
    return entries


def render(entries):
    md = ["<!-- Dibuat oleh tools/build_istilah.py dari situs/src/content/docs/alat/glosarium.mdx. Jangan diedit langsung. -->"]
    data = {}
    for e in entries:
        for k in e["keys"]:
            if k in data:
                continue
            md.append(f"*[{k}]: {e['d']}")
            data[k] = {"t": e["term"], "d": e["d"], "b": e["b"], "n": e["n"], "u": e["u"], "s": e["s"]}
            if e["h"]:
                data[k]["h"] = e["h"]
    baris = [{"t": e["term"], "d": e["d"], "b": e["b"], "n": e["n"], "u": "/" + e["u"] if e["u"] else None, "s": e["s"],
              "h": "/" + e["h"] if e["h"] else None} for e in entries]
    js_ = json.dumps(baris, ensure_ascii=False, indent=1) + "\n"
    js = ("// Dibuat oleh tools/build_istilah.py dari situs/src/content/docs/alat/glosarium.mdx. Jangan diedit langsung.\n"
          "window.ISTILAH = " + json.dumps(data, ensure_ascii=False, indent=1, sort_keys=True) + ";\n")
    return "\n".join(md) + "\n", js, js_


if __name__ == "__main__":
    _arg = sys.argv[1:]
    if any(a in ("-h", "--help") for a in _arg):
        print(__doc__ or "python3 tools/build_istilah.py [--check]")
        sys.exit(0)
    if [a for a in _arg if a != "--check"]:
        # Tanpa --check alat ini menulis berkas: argumen asing tidak boleh sampai ke sana.
        sys.exit(f"argumen tidak dikenal: {' '.join(a for a in _arg if a != '--check')} (pakai --check atau tanpa argumen)")
    md, js, glos = render(parse())
    if "--check" in sys.argv:
        stale = [p for p, c in ((OUT_MD, md), (OUT_JS, js), (OUT_JSON, glos)) if not p.exists() or p.read_text() != c]
        if stale:
            sys.exit("belum sinkron, jalankan python tools/build_istilah.py: " + ", ".join(str(p.relative_to(ROOT)) for p in stale))
        print("istilah sinkron")
        sys.exit(0)
    OUT_MD.parent.mkdir(parents=True, exist_ok=True)
    OUT_JS.parent.mkdir(parents=True, exist_ok=True)
    OUT_MD.write_text(md)
    OUT_JS.write_text(js)
    OUT_JSON.write_text(glos)
    print(f"ok: {md.count(chr(10)) - 1} kunci istilah")
