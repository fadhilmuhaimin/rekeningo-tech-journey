"""Ilustrasi adegan cerita Rekeningo (fiktif) sebagai SVG statis.

Gaya datar, palet sama dengan situs/src/styles/tema.css. Teks di dalam gambar dibuat besar
(>= 20 unit viewBox) supaya terbaca di layar 375 px. Setiap gambar membawa informasi
cerita (siapa, di mana, apa yang terlihat di layar), bukan dekorasi.

Jalankan: python3 tools/ilustrasi_cerita.py   → situs/lama/assets/cerita/*.svg
Tokoh tidak lagi digambar di sini: halaman cerita memakai Rantai bertoken (XF2, keputusan 372).
"""
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "situs/lama/assets/cerita"
NAVY, BLUE, BLUE_L, MINT, MINT_L, ORANGE, ORANGE_L = "#051027", "#0075EB", "#E4F0FF", "#0F766E", "#DEFFF8", "#D26B00", "#FFF4E6"
GRAY, GRAY_L, INK, WHITE = "#6B7280", "#F3F4F7", "#1F2937", "#FFFFFF"
FONT = "font-family=\"Figtree, 'Segoe UI', system-ui, sans-serif\""


def svg(w, h, body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-labelledby="t">'
            f'<title id="t">{title}</title><rect width="{w}" height="{h}" fill="{WHITE}"/>{body}</svg>\n')


def text(x, y, s, size=22, weight=600, fill=INK, anchor="middle"):
    return f'<text x="{x}" y="{y}" {FONT} font-size="{size}" font-weight="{weight}" fill="{fill}" text-anchor="{anchor}">{s}</text>'


def person(x, y, shirt, skin="#E0A980", hair=NAVY, long_hair=False, apron=None, s=1.0):
    """Orang sederhana, titik (x, y) = kaki tengah. Tinggi ±150*s."""
    g = [f'<g transform="translate({x},{y}) scale({s})">']
    g.append(f'<rect x="-30" y="-100" width="60" height="78" rx="24" fill="{shirt}"/>')  # badan
    if apron:
        g.append(f'<path d="M-20 -78 h40 v52 a8 8 0 0 1 -8 8 h-24 a8 8 0 0 1 -8 -8z" fill="{apron}"/>')
    g.append(f'<rect x="-22" y="-26" width="18" height="26" rx="6" fill="{NAVY}"/><rect x="4" y="-26" width="18" height="26" rx="6" fill="{NAVY}"/>')
    g.append(f'<circle cx="0" cy="-124" r="24" fill="{skin}"/>')  # kepala
    if long_hair:
        g.append(f'<path d="M-26 -122 a26 28 0 0 1 52 0 v26 h-10 v-22 a16 18 0 0 0 -32 0 v22 h-10z" fill="{hair}"/>')
    else:
        g.append(f'<path d="M-25 -126 a25 25 0 0 1 50 0 a40 22 0 0 0 -50 0z" fill="{hair}"/>')
    g.append('</g>')
    return "".join(g)


def phone(x, y, lines, w=130, h=180, tone=BLUE):
    """HP kecil. lines = [(teks, warna, tebal)]."""
    g = [f'<g transform="translate({x},{y})">',
         f'<rect width="{w}" height="{h}" rx="16" fill="{NAVY}"/>',
         f'<rect x="7" y="9" width="{w-14}" height="{h-18}" rx="11" fill="{WHITE}"/>',
         f'<rect x="14" y="20" width="{w-28}" height="44" rx="8" fill="{tone}"/>']
    cy = 48
    for i, (s, col, wt) in enumerate(lines):
        g.append(text(w / 2, cy, s, size=(17 if len(s) > 7 else 19) if i == 0 else 17, weight=wt, fill=col))
        cy += 30 if i == 0 else 28
    g.append('</g>')
    return "".join(g)


def bubble(x, y, w, h, s, fill=ORANGE_L, edge=ORANGE, size=20):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{fill}" stroke="{edge}" stroke-width="2"/>'
            + text(x + w / 2, y + h / 2 + size * 0.35, s, size=size, weight=700, fill=INK))


def tahap1():
    w, h = 720, 400
    b = [f'<rect x="0" y="330" width="{w}" height="70" fill="{GRAY_L}"/>']
    # gedung kantor
    b.append(f'<rect x="20" y="40" width="190" height="290" rx="6" fill="{BLUE_L}" stroke="{BLUE}" stroke-width="2"/>')
    for r in range(5):
        for c in range(3):
            b.append(f'<rect x="{40 + c * 58}" y="{60 + r * 50}" width="40" height="30" rx="3" fill="{WHITE}"/>')
    b.append(text(115, 30, "Kompleks perkantoran", size=20, weight=700, fill=BLUE))
    # warung Ani
    b.append(f'<rect x="250" y="150" width="200" height="180" rx="6" fill="{ORANGE_L}" stroke="{ORANGE}" stroke-width="2"/>')
    b.append(f'<path d="M240 150 h220 l-14 -40 h-192z" fill="{ORANGE}"/>' + text(350, 140, "Warung Ani", size=22, weight=800, fill=WHITE))
    b.append(person(395, 330, ORANGE, "#B57B52", "#2B1B12", True, WHITE, s=0.85))
    b.append(text(300, 355, "Budi", size=18, weight=600, fill=GRAY) + text(395, 355, "Ani", size=18, weight=600, fill=GRAY))
    # Budi + HP (garis putus dari tangan Budi ke HP yang diperbesar)
    b.append(person(300, 330, MINT, "#E0A980", "#3F2A1D", s=0.85))
    b.append(f'<path d="M322 222 Q395 150 462 190" stroke="{GRAY}" stroke-width="2" stroke-dasharray="6 5" fill="none"/>')
    b.append(phone(462, 120, [("Rp30.000", WHITE, 800), ("Transfer", INK, 600), ("gagal", ORANGE, 800)], tone=ORANGE))
    b.append(text(527, 322, "HP Budi", size=18, weight=600, fill=GRAY))
    # Raka di meja dengan laptop
    b.append(f'<rect x="610" y="262" width="100" height="10" rx="3" fill="{GRAY}"/><rect x="618" y="272" width="8" height="58" fill="{GRAY}"/><rect x="694" y="272" width="8" height="58" fill="{GRAY}"/>')
    b.append(person(668, 330, "#3B5B92", "#C68A5E", NAVY, s=0.85))
    b.append(f'<path d="M624 262 l10 -44 h56 l-10 44z" fill="{NAVY}"/><path d="M632 256 l7 -32 h42 l-7 32z" fill="{BLUE_L}"/>')
    b.append(text(667, 355, "Raka", size=18, weight=600, fill=GRAY))
    b.append(bubble(585, 40, 130, 56, "Rp70.000", size=22))
    b.append(text(650, 120, "hilang?", size=20, weight=700, fill=ORANGE))
    b.append(text(w / 2, 385, "Minggu ketiga uji coba: transfer berhenti di tengah jalan", size=20, weight=600, fill=INK))
    return svg(w, h, "".join(b), "Tahap 1: di kantin kompleks perkantoran, Budi membayar Warung Ani lewat Rekeningo. HP Budi menampilkan transfer gagal dan saldo berkurang. Raka memeriksa dari laptopnya.")


def tahap2():
    w, h = 720, 400
    b = [f'<rect x="0" y="330" width="{w}" height="70" fill="{GRAY_L}"/>']
    # tiga gedung = tiga kompleks
    for k, x in enumerate((20, 95, 170)):
        b.append(f'<rect x="{x}" y="{130 - k * 25}" width="62" height="{200 + k * 25}" rx="5" fill="{BLUE_L}" stroke="{BLUE}" stroke-width="2"/>')
    b.append(text(125, 62, "Tiga kompleks", size=20, weight=700, fill=BLUE))
    # HP kiri, Budi tengah, tablet kanan
    b.append(phone(268, 50, [("Tarik", WHITE, 800), ("Rp70.000", INK, 700), ("sukses", MINT, 800)]))
    b.append(phone(520, 50, [("Tarik", WHITE, 800), ("Rp50.000", INK, 700), ("sukses", MINT, 800)], w=150))
    b.append(text(333, 255, "HP", size=18, weight=600, fill=GRAY) + text(595, 255, "tablet", size=18, weight=600, fill=GRAY))
    b.append(f'<path d="M400 140 L432 230 M520 140 L476 230" stroke="{GRAY}" stroke-width="2" stroke-dasharray="6 5" fill="none"/>')
    b.append(person(455, 330, MINT, "#E0A980", "#3F2A1D", s=0.9))
    b.append(text(455, 355, "Budi", size=18, weight=600, fill=GRAY))
    # sinyal lemah
    for i in range(4):
        hgt = 10 + i * 10
        col = ORANGE if i == 0 else "#D1D5DB"
        b.append(f'<rect x="{640 + i * 16}" y="{320 - hgt}" width="10" height="{hgt}" rx="2" fill="{col}"/>')
    b.append(text(670, 355, "sinyal", size=18, weight=600, fill=GRAY))
    b.append(text(w / 2, 388, "Saldo Rp100.000. Dua penarikan bersamaan, keduanya sukses.", size=20, weight=600, fill=INK))
    return svg(w, h, "".join(b), "Tahap 2: Rekeningo dipakai di tiga kompleks. Budi menarik Rp70.000 dari HP dan Rp50.000 dari tablet hampir bersamaan, keduanya sukses padahal saldonya Rp100.000. Sinyal kantin lemah.")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in (("tahap-1", tahap1), ("tahap-2", tahap2)):
        (OUT / f"{name}.svg").write_text(fn())
        print("tulis", OUT / f"{name}.svg")
