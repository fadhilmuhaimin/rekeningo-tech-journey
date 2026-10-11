"""Hitung rasio kontras WCAG semua kombinasi warna yang DIPAKAI situs dan gambar.
Gagal (exit 1) kalau ada yang di bawah ambang, atau ada pasangan tema.css yang nilainya tidak bisa dihitung.

    python tools/contrast.py [--md] [--css PATH]
"""
import colorsys
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from palette import (BG, BG_BLOCK, BG_BLOCK_2, FIG_LINE, FIG_PANEL, KINDS, LINK, MODE, NAVY,  # noqa: E402
                         PRIMARY, TEXT, TEXT_2)


def lum(h):
    h = h.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4  # noqa: E731
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def ratio(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)


TXT, BIG = 4.5, 3.0
SEKUNDER = 8.0  # redesain (keputusan 201): teks sekunder minimal 8:1 di latar halaman, kotak, dan header tabel
rows = [
    ("Teks utama di halaman", TEXT, BG, TXT),
    ("Teks utama di blok kode / admonition", TEXT, BG_BLOCK, TXT),
    ("Teks utama di inline code / header tabel", TEXT, BG_BLOCK_2, TXT),
    ("Teks sekunder (caption, meta) di halaman", TEXT_2, BG, TXT),
    ("Teks sekunder di blok", TEXT_2, BG_BLOCK, TXT),
    ("Link", LINK, BG, TXT),
    ("Link di admonition", LINK, BG_BLOCK, TXT),
    ("Teks header putih di navy", "#FFFFFF", NAVY, TXT),
    ("Tab navigasi (putih 78%) di navy", "#CACDD3", NAVY, TXT),
    ("Primary (garis, elemen besar) di halaman", PRIMARY, BG, BIG),
    ("Sintaks: komentar", "#51565E", BG_BLOCK, TXT),
    ("Sintaks: keyword", "#0041C2", BG_BLOCK, TXT),
    ("Sintaks: string", "#0F766E", BG_BLOCK, TXT),
    ("Sintaks: angka/konstanta", "#9A4C00", BG_BLOCK, TXT),
    ("Gambar: panah & garis", FIG_LINE, BG, BIG),
    ("Gambar: garis panel putus-putus", FIG_PANEL, BG, BIG),
    ("Gambar: label abu di latar putih", TEXT_2, BG, TXT),
]
for k, (fill, edge, ink) in KINDS.items():
    rows += [
        (f"[{k}] judul kotak di isi", TEXT, fill, TXT),
        (f"[{k}] subjudul di isi", TEXT_2, fill, TXT),
        (f"[{k}] teks berwarna (ink) di isi", ink, fill, TXT),
        (f"[{k}] teks berwarna (ink) di putih", ink, BG, TXT),
        (f"[{k}] garis tepi vs isi", edge, fill, BIG),
        (f"[{k}] garis tepi vs putih", edge, BG, BIG),
        (f"[{k}] garis kiri admonition vs blok", edge, BG_BLOCK, BIG),
        (f"[{k}] angka putih di lingkaran ink", "#FFFFFF", ink, TXT),
    ]

# Situs baru: kombinasi yang dipakai tema.css, diperiksa untuk mode gelap dan terang.
for nama, m in MODE.items():
    bg, bg2, bg3 = m["bg"], m["bg_2"], m["bg_3"]
    rows += [
        (f"[{nama}] teks isi di halaman", m["teks"], bg, TXT),
        (f"[{nama}] teks isi di kotak/kode", m["teks"], bg2, TXT),
        (f"[{nama}] teks isi di inline code / header tabel", m["teks"], bg3, TXT),
        (f"[{nama}] judul di halaman", m["judul"], bg, TXT),
        (f"[{nama}] teks sekunder di halaman", m["teks_2"], bg, SEKUNDER),
        (f"[{nama}] teks sekunder di kotak", m["teks_2"], bg2, SEKUNDER),
        (f"[{nama}] teks sekunder di inline code / header tabel", m["teks_2"], bg3, SEKUNDER),
        (f"[{nama}] link (aksen) di halaman", m["aksen"], bg, TXT),
        (f"[{nama}] link (aksen) di kotak", m["aksen"], bg2, TXT),
        (f"[{nama}] teks di atas blok aksen (tombol, aktor)", m["ink_di_aksen"], m["aksen"], TXT),
        (f"[{nama}] garis pembatas kedua vs halaman", m["garis_2"], bg, 1.0),
        (f"[{nama}] sintaks: keyword (aksen) di kotak kode", m["aksen"], bg2, TXT),
        (f"[{nama}] sintaks: string (good ink) di kotak kode", m["kinds"]["good"][2], bg2, TXT),
        (f"[{nama}] sintaks: angka (warn ink) di kotak kode", m["kinds"]["warn"][2], bg2, TXT),
        (f"[{nama}] sintaks: komentar (sekunder) di kotak kode", m["teks_2"], bg2, TXT),
    ]
    for k, (fill, edge, ink) in m["kinds"].items():
        rows += [
            (f"[{nama}][{k}] teks isi di fill", m["teks"], fill, TXT),
            (f"[{nama}][{k}] ink di fill", ink, fill, TXT),
            (f"[{nama}][{k}] ink di halaman", ink, bg, TXT),
            (f"[{nama}][{k}] edge vs fill", edge, fill, BIG),
            (f"[{nama}][{k}] edge vs halaman", edge, bg, BIG),
            (f"[{nama}][{k}] edge vs kotak", edge, bg2, BIG),
        ]


# Pasangan teks/latar yang benar-benar dipakai tema.css (I5c-a, keputusan 262). Dibaca dari CSS, bukan daftar tangan,
# supaya pasangan baru ikut diperiksa di kedua mode (celah lama: --ink-di-aksen di latar --k-system-edge, 4,43:1).
# Tiga bentuk: (1) satu aturan menulis color dan background; (2) aturan pengubah (.is-x, [attr], :hover) mewarisi
# color atau background dari aturan dasarnya; (3) aturan turunan ("DASAR anak") dengan color atau opacity < 1 di atas
# latar aturan dasar dan semua pengubahnya. opacity dicampur ke latar (teks tanpa latar sendiri). Ambang 4,5:1:
# teks widget tidak ada yang >= 18,66 px tebal atau 24 px (WCAG 2.2 SC 1.4.3, "large scale").
# Tidak ada pasangan yang dilewati diam-diam (perbaikan review PR #176): color: inherit diselesaikan ke color aturan
# leluhur di CSS; background transparent/none ke latar aturan leluhur, lalu ke latar halaman (aturan body). inherit
# yang tidak punya leluhur di CSS gagal, kecuali tercatat di PENGECUALIAN beserta alasannya. Nilai yang tidak bisa
# dihitung (alpha < 1, oklch, color-mix selain srgb, token tidak ada) membuat skrip exit 1 dengan selector dan nilainya.
CSS = pathlib.Path(__file__).resolve().parent.parent / "situs" / "src" / "styles" / "tema.css"
if "--css" in sys.argv:  # dipakai tools/test_contrast.py dengan salinan tema.css yang diubah
    CSS = pathlib.Path(sys.argv[sys.argv.index("--css") + 1])
ATURAN = re.compile(r"([^{}]+)\{([^{}]*)\}")
PENGUBAH = re.compile(r"(\.is-[\w-]+|\[[^\]]*\]|::?[\w-]+(\([^()]*\))?)+$")
KOSONG = ("transparent", "none")
PENGECUALIAN = {}  # selector -> alasan; untuk color: inherit yang induknya tidak bisa ditentukan dari CSS
NAMA_WARNA = {"white": "#FFFFFF", "black": "#000000"}


def tanpa_komentar(teks):
    return re.sub(r"/\*.*?\*/", "", teks, flags=re.S)


def token_css(teks):
    root, terang, bersama = {}, {}, {}
    for sel, isi in ATURAN.findall(tanpa_komentar(teks)):
        sel = " ".join(sel.split())
        tujuan = {":root": root, ':root[data-theme="light"]': terang, ':root, :root[data-theme="light"]': bersama}.get(sel)
        if tujuan is not None:
            tujuan.update(re.findall(r"(--[\w-]+)\s*:\s*([^;]+);", isi))
    return {"gelap": {**root, **bersama}, "terang": {**root, **terang, **bersama}}


def pisah(teks):
    """Argumen fungsi CSS dipisah di koma tingkat atas (koma di dalam var(...) tidak ikut)."""
    bagian, dalam, buf = [], 0, ""
    for ch in teks:
        if ch == "," and dalam == 0:
            bagian, buf = bagian + [buf.strip()], ""
            continue
        dalam += (ch == "(") - (ch == ")")
        buf += ch
    return bagian + [buf.strip()]


def heks(rgb):
    return "#" + "".join(f"{max(0, min(255, round(x))):02X}" for x in rgb)


def angka(t, skala):
    return float(t[:-1]) * skala / 100 if t.endswith("%") else float(t)


def warna(nilai, tok, dalam=0):
    """Nilai CSS -> #RRGGBB opak. ValueError beserta alasannya bila tidak bisa dihitung; tidak pernah None."""
    nilai = nilai.strip()
    if dalam > 10:
        raise ValueError(f"rantai var() lebih dari 10 tingkat di {nilai}")
    m = re.fullmatch(r"var\((--[\w-]+)(?:\s*,\s*(.+))?\)", nilai, re.S)
    if m:
        isi = tok.get(m.group(1), m.group(2))
        if isi is None:
            raise ValueError(f"token {m.group(1)} tidak ada di :root dan tanpa nilai cadangan")
        return warna(isi, tok, dalam + 1)
    kecil = nilai.lower()
    if kecil in NAMA_WARNA:
        return NAMA_WARNA[kecil]
    if re.fullmatch(r"#[0-9a-f]{3}", kecil):
        return "#" + "".join(c * 2 for c in nilai[1:]).upper()
    if re.fullmatch(r"#[0-9a-f]{6}", kecil):
        return nilai.upper()
    m = re.fullmatch(r"(rgba?|hsla?)\((.*)\)", kecil, re.S)
    if m:
        bag = [x for x in re.split(r"[\s,/]+", m.group(2).strip()) if x]
        try:
            if len(bag) not in (3, 4):
                raise ValueError
            if len(bag) == 4 and angka(bag[3], 1) < 1:
                raise ValueError(f"{nilai}: alpha < 1, warna akhirnya bergantung pada lapisan di bawahnya")
            if m.group(1).startswith("rgb"):
                return heks(angka(x, 255) for x in bag[:3])
            pct = lambda t: float(t.rstrip("%")) / 100  # noqa: E731  (hsl: saturasi dan lightness dalam persen)
            r, g, b = colorsys.hls_to_rgb(float(bag[0].removesuffix("deg")) / 360 % 1, pct(bag[2]), pct(bag[1]))
            return heks(x * 255 for x in (r, g, b))
        except ValueError as e:
            raise ValueError(str(e) if str(e).startswith(nilai) else f"{nilai}: argumen {m.group(1)}() tidak dikenal") from None
    m = re.fullmatch(r"color-mix\(\s*in\s+srgb\s*,(.*)\)", nilai, re.S | re.I)
    if m:
        komponen = []
        for a in pisah(m.group(1)):
            p = re.fullmatch(r"(?:([\d.]+)%\s+)?(.+?)(?:\s+([\d.]+)%)?", a, re.S)
            persen = p.group(1) or p.group(3)
            komponen.append((warna(p.group(2), tok, dalam + 1), float(persen) if persen else None))
        if len(komponen) != 2:
            raise ValueError(f"{nilai}: color-mix() perlu tepat dua warna")
        (c1, p1), (c2, p2) = komponen
        p1, p2 = (50.0, 50.0) if p1 is None and p2 is None else (p1 if p1 is not None else 100 - p2, p2 if p2 is not None else 100 - p1)
        if p1 + p2 < 99.999:
            raise ValueError(f"{nilai}: persen color-mix() berjumlah < 100%, hasilnya tembus pandang (alpha < 1)")
        w = p1 / (p1 + p2)
        return heks(w * int(c1[i:i + 2], 16) + (1 - w) * int(c2[i:i + 2], 16) for i in (1, 3, 5))
    raise ValueError(f"{nilai}: bentuk warna tidak didukung (pakai hex, rgb(), hsl(), color-mix(in srgb, ...) opak, atau var())")


def campur(fg, bg, a):
    f, b = ([int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in (fg, bg))
    return "#" + "".join(f"{round(a * x + (1 - a) * y):02X}" for x, y in zip(f, b))


def pasangan_css(teks):
    """-> (pasangan, pengecualian, galat). pasangan: (selector, color, latar, opacity, catatan penyelesaian)."""
    aturan = {}
    for sel, isi in ATURAN.findall(tanpa_komentar(teks)):
        if sel.strip().startswith((":root", "@")):
            continue
        d = dict((k.strip(), v.strip()) for k, v in re.findall(r"([\w-]+)\s*:\s*([^;]+)", isi))
        latar = d.get("background-color", d.get("background"))
        for s in sel.split(","):
            s = " ".join(s.split())
            a = aturan.setdefault(s, {})
            a.update({k: v for k, v in (("color", d.get("color")), ("latar", latar), ("opacity", d.get("opacity"))) if v})
    dasar = {s: PENGUBAH.sub("", s) for s in aturan}

    def leluhur(s):  # aturan yang selector-nya awalan turunan dari s, terdekat dulu
        return sorted((x for x in aturan if s.startswith(x + " ")), key=len, reverse=True)

    hasil = {}
    for s, a in aturan.items():
        b = aturan.get(dasar[s], {}) if dasar[s] != s else {}
        c, l = a.get("color", b.get("color")), a.get("latar", b.get("latar"))
        if c and l and ("color" in a or "latar" in a):
            hasil[s] = (c, l, 1.0, leluhur(s))
        if "latar" in a:
            continue
        for anc in aturan:  # bentuk 3: turunan dari aturan dasar yang punya latar, dan semua pengubahnya
            if not s.startswith(anc + " ") or anc != dasar[anc]:
                continue
            op = float(a.get("opacity", "1"))
            if "color" not in a and op >= 1:
                continue
            for varian in [x for x in aturan if dasar[x] == anc]:
                v = aturan[varian]
                cv, lv = a.get("color", v.get("color", aturan[anc].get("color"))), v.get("latar", aturan[anc].get("latar"))
                if cv and lv:
                    hasil[f"{s} (di {varian})"] = (cv, lv, op, list(dict.fromkeys([varian, anc, *leluhur(anc)])))
    halaman = aturan.get("body", {}).get("latar")
    pasangan, pengecualian, galat = [], [], []
    for sel, (c, l, op, rantai) in sorted(hasil.items()):
        catatan = []
        if c.strip().lower() == "inherit":
            asal = next((x for x in rantai if aturan[x].get("color", "inherit").lower() != "inherit"), None)
            if asal is None:
                (pengecualian if sel.split(" (di ")[0] in PENGECUALIAN else galat).append(
                    (sel, c, l, PENGECUALIAN.get(sel.split(" (di ")[0], "color: inherit tanpa aturan leluhur ber-color di CSS")))
                continue
            c = aturan[asal]["color"]
            catatan.append(f"color inherit -> {c} dari {asal}")
        if l.strip().lower() in KOSONG:
            asal = next((x for x in rantai if aturan[x].get("latar", "transparent").lower() not in KOSONG), None)
            if asal is None and halaman is None:
                galat.append((sel, c, l, "latar transparent dan aturan body tanpa background"))
                continue
            l0, l = l, aturan[asal]["latar"] if asal else halaman
            catatan.append(f"latar {l0} -> {l} dari {asal or 'body (latar halaman)'}")
        pasangan.append((sel, c, l, op, "; ".join(catatan)))
    return pasangan, pengecualian, galat


teks_css = CSS.read_text()
pasangan, pengecualian, galat = pasangan_css(teks_css)
galat = [("semua", *g) for g in galat]
dibaca = selesai = 0
for nama, tok in token_css(teks_css).items():
    for sel, c, l, op, catatan in pasangan:
        try:
            fg, bg = warna(c, tok), warna(l, tok)
        except ValueError as e:
            galat.append((nama, sel, c, l, str(e)))
            continue
        dibaca, selesai = dibaca + 1, selesai + bool(catatan)
        rows.append((f"[{nama}] tema.css {sel}: {c} di {l}" + (f" opacity {op}" if op < 1 else "") + (f" [{catatan}]" if catatan else ""),
                     campur(fg, bg, op) if op < 1 else fg, bg, TXT))

md = "--md" in sys.argv
fail = 0
if md:
    print("| Kombinasi | Teks | Latar | Rasio | Minimum | Hasil |\n|---|---|---|---|---|---|")
for name, fg, bg, need in rows:
    r = ratio(fg, bg)
    ok = r >= need
    fail += not ok
    if md:
        print(f"| {name} | `{fg}` | `{bg}` | {r:.2f}:1 | {need}:1 | {'Lolos' if ok else 'GAGAL'} |")
    else:
        print(f"{'OK  ' if ok else 'FAIL'} {r:5.2f} (≥{need}) {name}: {fg} on {bg}")
print(f"\n{CSS.name}: {len(pasangan)} pasangan per mode; {dibaca} dibaca di dua mode ({selesai} lewat induk), "
      f"{len(pengecualian)} dilewati sebagai pengecualian, {len(galat)} tidak terbaca")
for sel, c, l, alasan in pengecualian:
    print(f"DILEWATI (pengecualian) {sel}: color {c}, latar {l}: {alasan}")
for nama, sel, c, l, alasan in galat:
    print(f"TIDAK TERBACA [{nama}] {sel}: color {c}, latar {l}: {alasan}")
print(f"\n{len(rows) - fail}/{len(rows)} lolos · {CSS.name}: {dibaca} pasangan dibaca ({selesai} lewat induk), "
      f"{len(pengecualian)} dilewati, {len(galat)} tidak terbaca")
sys.exit(1 if fail or galat else 0)
