"""Hitung rasio kontras WCAG semua kombinasi warna yang DIPAKAI situs dan gambar.
Gagal (exit 1) kalau ada yang di bawah ambang, atau ada pasangan tema.css yang nilainya tidak bisa dihitung.
Diuji tools/test_contrast.py (tes mutasi pada salinan tema.css).

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


# Pasangan teks/latar yang dipakai tema.css (I5c-a keputusan 262, K2b keputusan 355). Dibaca dari CSS, bukan daftar tangan,
# supaya pasangan baru ikut diperiksa di kedua mode (celah lama: --ink-di-aksen di latar --k-system-edge, 4,43:1).
# Setiap aturan yang menulis color, latar (background, background-color), atau opacity menghasilkan pasangan untuk
# elemennya. Teks dan latar elemen itu dikomposit lewat lapisan dari elemen ke luar:
#   1. elemen sendiri: aturan itu, ditambah aturan yang lebih umum untuk elemen yang sama, yaitu selector tanpa
#      pengubah di akhir (.is-x, [attr], :hover, :not(..), ::before; satu per satu) dan tanpa modifier BEM (.b--m -> .b);
#   2. leluhur, terdekat dulu: awalan selector yang diikuti spasi atau ">" (awalan yang diikuti "+" atau "~" saudara,
#      bukan leluhur), dan blok BEM dari elemen BEM (.b__e dianggap ada di dalam .b dengan awalan yang sama);
#   3. body: latar dari tema.css, warna teks bawaan Starlight 0.42.5 (reset.css: body { color: var(--sl-color-text);
#      background-color: var(--sl-color-bg) }).
# color yang tidak ditulis, inherit, atau currentColor diambil dari lapisan terdekat yang menulisnya, lalu body. Latar
# transparent, none, inherit, atau tidak ditulis = tembus. opacity lapisan mengalikan seluruh isinya (latarnya sendiri,
# teks, dan turunannya) di atas lapisan di bawahnya, seperti group opacity di browser (dicampur di ruang sRGB).
# Leluhur yang punya varian (pengubah, modifier BEM, versi @media/@container) diperiksa sekali per varian:
# "<aturan> (di <varian>)". Aturan di dalam @media/@container adalah varian dari selector yang sama di luar, bukan
# penimpanya. :is()/:where() tanpa kurung bersarang diurai jadi satu selector per argumen.
# Ambang 4,5:1: teks widget tidak ada yang >= 18,66 px tebal atau 24 px (WCAG 2.2 SC 1.4.3, "large scale").
# Elemen grafis tanpa teks (GRAFIS) diperiksa >= 3:1 latarnya terhadap latar di bawahnya (SC 1.4.11); keduanya ditulis
# per selector dengan alasan. Tidak ada yang dilewati diam-diam: PENGECUALIAN memuat alasan, dicetak beserta rasionya, dan entri yang tidak cocok
# dengan pasangan mana pun membuat skrip gagal. Nilai yang tidak bisa dihitung (alpha < 1, oklch, gradient, color-mix
# selain srgb, token tidak ada) membuat skrip exit 1 dengan selector dan nilainya.
# Batas yang diketahui (heuristik selector, bukan DOM; situs/tools/ukur-kontras.mjs mengukur DOM runsql sesudah klik):
#   - BEM tidak menyimpan kedalaman: .b__e dianggap anak langsung .b, kecuali INDUK_DOM menyebut pembungkusnya;
#   - leluhur hanya dikenali lewat awalan selector dan BEM. Elemen yang di DOM ada di dalam .x, tapi selector-nya tidak
#     diawali .x dan bukan .x__y, dianggap langsung di atas body (mis. html[data-peran] .sidebar-content a);
#   - latar dari CSS Starlight atau komponen di luar tema.css tidak terlihat (header, sidebar): dianggap tembus;
#   - satu varian per leluhur sekaligus; dua varian di dua leluhur berbeda tidak dikombinasikan; varian keadaan
#     elemen sendiri (:hover dan sebagainya) diperiksa sebagai aturan sendiri;
#   - specificity tidak dihitung: selector yang lebih panjang menang atas yang lebih umum, @media menang atas
#     selector yang sama di luar @media;
#   - :not()/:has() dengan kurung bersarang tidak dilepas sebagai pengubah; CSS nesting gagal keras;
#   - style inline dan kelas yang hanya ditulis JavaScript tidak terlihat.
CSS = pathlib.Path(__file__).resolve().parent.parent / "situs" / "src" / "styles" / "tema.css"
if "--css" in sys.argv:  # dipakai tools/test_contrast.py dengan salinan tema.css yang diubah
    CSS = pathlib.Path(sys.argv[sys.argv.index("--css") + 1])
SATU_PENGUBAH = re.compile(r"(\.is-[\w-]+|\[[^\]]*\]|::?[\w-]+(\([^()]*\))?)$")
BEM_MOD = re.compile(r"\.([\w-]+?)--[\w-]+")
BEM_ELEMEN = re.compile(r"\.([\w-]+?)__[\w-]+")
KOSONG = ("transparent", "none", "inherit")
WARISAN = ("inherit", "currentcolor")
BAWAAN_BODY = {"color": "var(--sl-color-text)", "latar": "var(--sl-color-bg)"}  # Starlight 0.42.5 style/reset.css
PENGECUALIAN = {  # selector -> alasan; cocok dengan aturan itu sendiri atau dengan leluhur "(di <selector>)"
    ".sl-markdown-content .bb-btn:disabled": "tombol nonaktif (opacity 0.45): WCAG 2.2 SC 1.4.3 Incidental, teks bagian "
                                             "komponen UI yang tidak aktif tidak punya syarat kontras",
    ".tabbed-set > input": "radio tab disembunyikan (opacity 0, lebar 0): tidak terlihat oleh siapa pun (SC 1.4.3 "
                           "Incidental); teks tab ada di label",
}
GRAFIS = {  # selector -> isinya: elemen tanpa teks yang hanya menulis latar; latarnya diperiksa >= 3:1 terhadap latar
    # di bawahnya (WCAG 2.2 SC 1.4.11 Non-text Contrast), bukan sebagai teks
    ".sl-markdown-content .bb-hp__sig i.is-on": "batang sinyal 3 px di mockup HP",
    ".sl-markdown-content .bb-ember__token i.is-isi": "bulatan token 0,8rem yang terisi",
    ".sl-markdown-content .bb-peta__bar i": "isi bilah progres peta",
    ".baca-progres span": "bilah progres baca 3 px",
    ".sl-markdown-content .pl-sel.is-pakai": "kolom koneksi pool yang terpakai di widget pool (W3-pool); angkanya juga tertulis sebagai teks",
    ".sl-markdown-content .pl-blok": "blok pembayaran yang menunggu koneksi di widget pool; jumlahnya juga tertulis sebagai teks",
    ".sl-markdown-content .pl-batang": "batang koneksi terpakai per detik di widget pool (aria-hidden); nilainya ada di teks keadaan",
    ".sl-markdown-content .pl-batang.is-penuh": "batang pool penuh di widget pool; waktu penuh tertulis sebagai teks",
    ".sl-markdown-content .pl-kursor": "penanda jam simulasi di grafik widget pool; jamnya tertulis di label slider",
    ".sl-markdown-content .ch-seg.is-benar": "bagian garis waktu widget cache saat instance melihat isi yang benar (aria-hidden); lama dan jamnya tertulis sebagai teks",
    ".sl-markdown-content .ch-seg.is-stale": "bagian garis waktu widget cache saat instance melihat isi yang stale (aria-hidden); lamanya tertulis sebagai teks di hitungan",
    ".sl-markdown-content .ch-kursor": "penanda jam simulasi di garis waktu widget cache; jamnya tertulis di label slider",
}
INDUK_DOM = {  # blok BEM -> elemen BEM yang membungkus semua elemen lain blok itu di DOM (BEM tidak menyimpan kedalaman)
    "bb-hp": "bb-hp__screen",  # situs/src/lib/alur-statis.ts dan situs/lama/widgets/hp.js: .bb-hp > .bb-hp__screen > isi layar
}
NAMA_WARNA = {"white": "#FFFFFF", "black": "#000000"}


def tanpa_komentar(teks):
    return re.sub(r"/\*.*?\*/", "", teks, flags=re.S)


def blok_css(teks):
    """-> [(at-rule pembungkus, selector, isi)] untuk setiap aturan berdeklarasi. CSS nesting gagal keras."""
    hasil, tumpuk, buf = [], [], ""
    for ch in tanpa_komentar(teks):
        dalam_aturan = bool(tumpuk) and not tumpuk[-1].startswith("@")
        if ch == "{":
            if dalam_aturan:
                raise SystemExit(f"{CSS.name}: CSS nesting di dalam '{tumpuk[-1]}' tidak didukung contrast.py")
            tumpuk.append(" ".join(buf.split()))
            buf = ""
        elif ch == "}":
            pembuka = tumpuk.pop() if tumpuk else ""
            if pembuka and not pembuka.startswith("@"):
                hasil.append((tuple(tumpuk), pembuka, buf))
            buf = ""
        elif ch == ";" and not dalam_aturan:
            buf = ""  # @import/@charset, deklarasi @font-face
        else:
            buf += ch
    return hasil


def token_css(teks):
    root, terang, bersama = {}, {}, {}
    for _, sel, isi in blok_css(teks):
        tujuan = {":root": root, ':root[data-theme="light"]': terang, ':root, :root[data-theme="light"]': bersama}.get(sel)
        if tujuan is not None:
            tujuan.update(re.findall(r"(--[\w-]+)\s*:\s*([^;]+);", isi + ";"))
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


def komposit(fg, lapis):
    """-> (teks, latar) yang terlihat. lapis: [(latar #hex atau None, opacity)] dari elemen ke body. Setiap lapisan
    menggambar isinya di atas latarnya sendiri, lalu seluruhnya dikalikan opacity-nya (group opacity)."""
    def atas(a, b):  # a di atas b, (rgb, alpha) tanpa premultiply
        (ca, aa), (cb, ab) = a, b
        al = aa + ab * (1 - aa)
        return ([(x * aa + y * ab * (1 - aa)) / al for x, y in zip(ca, cb)] if al else [0, 0, 0], al)
    rgb = lambda h: [int(h[i:i + 2], 16) for i in (1, 3, 5)]  # noqa: E731
    t, b = (rgb(fg), 1.0), ([0, 0, 0], 0.0)
    for latar, op in lapis:
        if latar:
            t, b = atas(t, (rgb(latar), 1.0)), atas(b, (rgb(latar), 1.0))
        t, b = (t[0], t[1] * op), (b[0], b[1] * op)
    kanvas = ([255, 255, 255], 1.0)  # hanya terpakai bila body sendiri tembus
    return heks(atas(t, kanvas)[0]), heks(atas(b, kanvas)[0])


def kompon(sel):
    """Selector dipecah di spasi tingkat atas: compound dan combinator (spasi di dalam :has(+ x) tidak memecah)."""
    bagian, dalam, buf = [], 0, ""
    for ch in sel:
        if ch == " " and dalam == 0:
            bagian, buf = bagian + [buf] if buf else bagian, ""
            continue
        dalam += (ch in "([") - (ch in ")]")
        buf += ch
    return bagian + [buf] if buf else bagian


def urai(sel):
    """:is()/:where() tanpa kurung bersarang -> satu selector per argumen."""
    m = re.search(r":(?:is|where)\(([^()]*)\)", sel)
    return [y for x in pisah(m.group(1)) for y in urai(sel[:m.start()] + x + sel[m.end():])] if m else [sel]


def pasangan_css(teks):
    """-> [(label, selector yang dicocokkan ke PENGECUALIAN/GRAFIS, color, [(latar, opacity)] dari elemen ke body, catatan, jenis)]."""
    aturan, polos = {}, {}  # kunci ("@media (..) sel" atau "sel") -> deklarasi; kunci -> selector tanpa at-rule
    for konteks, sel, isi in blok_css(teks):
        if sel.startswith(":root"):
            continue
        d = {k.lower(): re.sub(r"\s*!important$", "", v.strip()) for k, v in re.findall(r"([\w-]+)\s*:\s*([^;]+)", isi)}
        tulis = {k: v for k, v in (("color", d.get("color")), ("latar", d.get("background-color", d.get("background"))),
                                   ("opacity", d.get("opacity"))) if v}
        for s in pisah(sel) if tulis else []:
            for u in urai(" ".join(s.split())):
                kunci = " ".join([*konteks, u])
                polos[kunci] = u
                aturan.setdefault(kunci, {}).update(tulis)

    def lepas(s):  # selector yang lebih umum untuk elemen yang sama, atau None
        t = SATU_PENGUBAH.sub("", s, count=1)
        if t == s:
            tok = kompon(s)
            t = " ".join(tok[:-1] + [BEM_MOD.sub(r".\1", tok[-1], count=1)])
        return None if t == s or not t.strip() or t[-1] in " >+~" else t

    def urutan(s):  # s lalu selector yang makin umum untuk elemen yang sama
        hasil = []
        while s:
            hasil, s = hasil + [s], lepas(s)
        return hasil

    jalur = {k: list(dict.fromkeys([k, *urutan(polos[k])])) for k in aturan}
    lebih_khusus, media = {}, {}
    for k, j in jalur.items():
        for x in j[1:]:
            lebih_khusus.setdefault(x, []).append(k)
        if k != polos[k]:
            media.setdefault(polos[k], []).append(k)

    def gabung(rantai):  # deklarasi dari yang paling umum ke yang paling khusus
        p = {}
        for x in reversed(rantai):
            p.update(aturan.get(x, {}))
        return p

    def lapisan(nama, rantai, keadaan):
        """-> (nama, deklarasi, [(varian, deklarasi)]). Varian: versi @media dari tiap anggota rantai (disisipkan di
        depan anggota itu), dan bila keadaan=True, aturan yang lebih khusus untuk elemen yang sama (.x.is-y, .x:hover)."""
        alt = [(v, gabung(rantai[:i] + [v] + rantai[i:])) for i, x in enumerate(rantai) for v in media.get(x, []) if v not in rantai]
        if keadaan:
            alt += [(v, gabung(jalur[v])) for v in lebih_khusus.get(rantai[0], []) if v not in rantai and v not in dict(alt)]
        return nama, gabung(rantai), alt

    def leluhur(sel):  # selector leluhur, terdekat dulu
        tok, hasil = kompon(sel), []

        def bem(s):  # .b__e -> pembungkus dari INDUK_DOM atau .b; None bila compound terakhir bukan elemen BEM
            t = kompon(s)
            m = BEM_ELEMEN.search(t[-1])
            if not m:
                return None
            induk = INDUK_DOM.get(m.group(1))
            return " ".join(t[:-1] + ["." + (induk if induk and m.group(0)[1:] != induk else m.group(1))])

        def dengan_bem(p):
            rantai = [p]
            while (q := bem(rantai[-1])) and q not in rantai:
                rantai.append(q)
            return rantai
        hasil += dengan_bem(sel)
        for i in range(len(tok) - 2, -1, -1):
            if tok[i] in (">", "+", "~") or tok[i + 1] in ("+", "~"):
                continue
            hasil += dengan_bem(" ".join(tok[:i + 1]))
        return [x for x in dict.fromkeys(hasil) if x != sel]

    hasil = []
    for k in aturan:
        dek0 = lapisan(k, jalur[k], False)  # versi @media dari selector k sendiri sudah jadi aturan (dan pasangan) sendiri
        lv = [(dek0[0], dek0[1], [(v, d) for v, d in dek0[2] if polos[v] != polos[k]])]
        lv += [x for x in (lapisan(p, urutan(p), True) for p in leluhur(polos[k]) if p != "body") if x[1] or x[2]]
        if "body" not in jalur[k]:
            nama, dek, alt = lapisan("body", ["body"], True)
            lv.append((nama, {**BAWAAN_BODY, **dek}, [(v, {**BAWAAN_BODY, **d}) for v, d in alt]))
        else:
            lv[0] = (lv[0][0], {**BAWAAN_BODY, **lv[0][1]}, lv[0][2])
        sudah = set()
        kombinasi = [(None, [d for _, d, _ in lv])] + [
            (v, [dv if j == i else d for j, (_, d, _) in enumerate(lv)]) for i, (_, _, alt) in enumerate(lv) for v, dv in alt]
        jenis = "color+latar" if {"color", "latar"} <= aturan[k].keys() else "color saja" if "color" in aturan[k] else \
            "latar saja" if "latar" in aturan[k] else "opacity saja"
        for v, dek in kombinasi:
            nama = [v if v and dek[j] is not lv[j][1] else lv[j][0] for j in range(len(lv))]
            asal_c = next(j for j, d in enumerate(dek) if d.get("color", "inherit").lower() not in WARISAN)
            lapis = [(d["latar"] if d.get("latar", "none").lower() not in KOSONG else None, d.get("opacity", "1")) for d in dek]
            tanda = (dek[asal_c]["color"], tuple(lapis))
            if tanda in sudah:
                continue
            sudah.add(tanda)
            asal_l = next((j for j, (l, _) in enumerate(lapis) if l), None)
            catatan = ([f"color dari {nama[asal_c]}"] if asal_c else []) + \
                      ([f"latar dari {nama[asal_l]}"] if asal_l else []) + \
                      [f"opacity {op} dari {nama[j]}" for j, (_, op) in enumerate(lapis) if op.strip() not in ("1", "1.0", "100%")]
            hasil.append((k + (f" (di {v})" if v else ""), {k, v}, dek[asal_c]["color"], lapis, "; ".join(catatan),
                          "opacity" if any(op.strip() not in ("1", "1.0", "100%") for _, op in lapis) and jenis != "opacity saja"
                          else jenis))
    return hasil


teks_css = CSS.read_text()
pasangan = pasangan_css(teks_css)
galat, pengecualian = [], []
dibaca = selesai = 0
jenis = {}
for nama, tok in token_css(teks_css).items():
    for label, cocok, c, lapis, catatan, jn in pasangan:
        l0 = next((l for l, _ in lapis if l), "-")
        try:
            fg = warna(c, tok)
            ls = [(warna(l, tok) if l else None, angka(op.strip(), 1)) for l, op in lapis]
            grafis = next((GRAFIS[x] for x in cocok if x in GRAFIS), None)
            if grafis and not ls[0][0]:
                raise ValueError("elemen GRAFIS tanpa latar sendiri")
        except ValueError as e:
            galat.append((nama, label, c, l0, str(e)))
            continue
        if grafis:  # latar elemen sebagai "teks", di atas latar lapisan di bawahnya
            sisa = [x for x in catatan.split("; ") if x and not x.startswith("color dari")]
            fg, ls[0], c, catatan = ls[0][0], (None, ls[0][1]), f"latar {l0}", "; ".join([grafis, "SC 1.4.11 non-teks", *sisa])
            l0 = next((l for l, _ in lapis[1:] if l), "-")
        teks_t, latar_t = komposit(fg, ls)
        op = 1.0
        for _, o in ls:
            op *= o
        judul = f"[{nama}] tema.css {label}: {c} di {l0}" + (f" opacity {op:.2f}" if op < 1 else "") + (f" [{catatan}]" if catatan else "")
        kecuali = next((x for x in cocok if x in PENGECUALIAN), None)
        if kecuali:
            pengecualian.append((judul, ratio(teks_t, latar_t), PENGECUALIAN[kecuali]))
            continue
        dibaca, selesai = dibaca + 1, selesai + bool(catatan)
        jn = "grafis" if grafis else jn
        jenis[jn] = jenis.get(jn, 0) + 1
        rows.append((judul, teks_t, latar_t, BIG if grafis else TXT))
dikenal = {x for p in pasangan for x in p[1]}
galat += [("semua", s, "-", "-", "PENGECUALIAN/GRAFIS tidak cocok dengan aturan mana pun di tema.css")
          for s in [*PENGECUALIAN, *GRAFIS] if s not in dikenal]

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
rincian = ", ".join(f"{n} {jn}" for jn, n in sorted(jenis.items()))
print(f"\n{CSS.name}: {len(pasangan)} pasangan per mode ({rincian} di dua mode); {dibaca} dibaca di dua mode "
      f"({selesai} lewat induk), {len(pengecualian)} dilewati sebagai pengecualian, {len(galat)} tidak terbaca")
for judul, r, alasan in pengecualian:
    print(f"DILEWATI (pengecualian) {r:5.2f} {judul}: {alasan}")
for nama, sel, c, l, alasan in galat:
    print(f"TIDAK TERBACA [{nama}] {sel}: color {c}, latar {l}: {alasan}")
print(f"\n{len(rows) - fail}/{len(rows)} lolos · {CSS.name}: {dibaca} pasangan dibaca ({selesai} lewat induk), "
      f"{len(pengecualian)} dilewati, {len(galat)} tidak terbaca")
sys.exit(1 if fail or galat else 0)
