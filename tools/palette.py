"""Satu-satunya sumber warna untuk gambar DAN situs (situs/src/styles/tema.css
memakai nilai yang sama). Cek kontras: python tools/contrast.py

Setiap warna bermakna punya tiga peran:
  fill = isi kotak / latar
  edge = garis tepi (≥ 3:1 terhadap fill dan putih)
  ink  = teks berwarna di atas fill atau putih (≥ 4.5:1)
Di tema.css ada turunan keempat, --k-*-padat = latar padat yang memuat teks --ink-di-aksen
(gelap = edge, terang = ink, keputusan 262); contrast.py membaca pasangan itu langsung dari tema.css.
"""
KINDS = {
    #          fill       edge       ink
    "system": ("#E4F0FF", "#0075EB", "#0041C2"),  # biru: sistem / konsep / komponen
    "good":   ("#DEFFF8", "#0F766E", "#0F766E"),  # mint: cara benar / sesudah
    "warn":   ("#FFF4E6", "#D26B00", "#9A4C00"),  # oranye: perhatian / bahaya produksi
    "old":    ("#F3F4F7", "#6B7280", "#51565E"),  # abu: sebelum / lama / netral
}
# Nama lama (sebelum design system minimalis) tetap diterima
ALIASES = {"focus": "warn", "danger": "warn", "wait": "old"}

TEXT = "#111827"       # teks utama
TEXT_2 = "#51565E"     # teks sekunder, caption, label
LINE_UI = "#E4E4E4"    # garis dekoratif (kartu, tabel)
LINE_UI_2 = "#CBD5E1"  # garis dekoratif kedua
FIG_LINE = "#6B7280"   # panah dan garis bermakna di gambar (≥ 3:1)
FIG_PANEL = "#7C8594"  # garis putus-putus pengelompokan di gambar (≥ 3:1)
BG = "#FFFFFF"
BG_BLOCK = "#F8FAFC"
BG_BLOCK_2 = "#F3F4F7"
PRIMARY = "#0075EB"    # aksen, garis tepi, elemen besar (bukan teks kecil)
LINK = "#0041C2"       # teks link
NAVY = "#051027"       # header situs
ACCENT_ORANGE = "#FF9010"  # dekoratif saja, TIDAK untuk teks/garis bermakna


# ---- Situs baru (situs/src/styles/tema.css): dua mode, nilai harus sama dengan token di tema.css ----
# Mode gelap adalah default (PROPOSAL "Desain visual final"). Setiap warna makna punya fill/edge/ink per mode.
TERANG = {
    "bg": "#FFFFFF", "bg_2": "#F8FAFC", "bg_3": "#F3F4F7",
    "teks": "#111827", "judul": "#0B0B0C", "teks_2": "#40454C",
    "aksen": "#0041C2", "ink_di_aksen": "#FFFFFF",
    "garis": "#E4E4E4", "garis_2": "#CBD5E1",
    "kinds": KINDS,
}
GELAP = {
    "bg": "#0B0B0C", "bg_2": "#141416", "bg_3": "#1C1C1F",
    "teks": "#EDEDED", "judul": "#FFFFFF", "teks_2": "#B4B4B9",
    "aksen": "#7AB8FF", "ink_di_aksen": "#0B0B0C",
    "garis": "#2A2A2E", "garis_2": "#3B3B41",
    "kinds": {
        #          fill       edge       ink
        "system": ("#15233A", "#7AB8FF", "#A9CDFF"),
        "good":   ("#0F2A26", "#3DBFA8", "#7FE0CC"),
        "warn":   ("#3A2410", "#F0A04B", "#FFC58A"),
        "old":    ("#1C1C1F", "#7C7C84", "#B5B5BC"),
    },
}
MODE = {"terang": TERANG, "gelap": GELAP}
