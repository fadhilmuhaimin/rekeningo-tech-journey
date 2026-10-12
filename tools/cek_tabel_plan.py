r"""Periksa setiap baris tabel Markdown di plan/ punya jumlah pipe pemisah yang sama dengan header-nya (keputusan 362).

GFM memecah baris tabel di setiap pipe pemisah sebelum membaca inline, jadi `|` di dalam code span ikut memecah
sel; yang tidak memecah adalah `\|` (spesifikasi GFM 0.29, Tables, contoh 200). Baris dengan sel lebih banyak dari
header dipotong (isinya hilang dari tampilan), baris dengan sel lebih sedikit diisi sel kosong (contoh 204).

Backslash sebelum pipe dibaca beda oleh dua renderer (dibuktikan dengan `gh api markdown` dan micromark 4.0.3,
keputusan 362): GitHub (cmark-gfm, `table_cell = (escaped_char|[^|\r\n])+` dengan cocokan terpanjang re2c) tidak
pernah memecah di pipe yang didahului backslash, berapa pun jumlahnya; micromark memecah bila jumlah backslash di
depannya genap. Keduanya sepakat untuk nol backslash (pemisah) dan jumlah ganjil (bukan pemisah), jadi jumlah genap
(`\\|`, `\\\\|`) ditolak sebagai ambigu. Yang dihitung: pipe tanpa backslash tepat di depannya.

Baris tanpa pipe pembuka sesudah baris tabel tetap dibaca GFM sebagai baris tabel (contoh 202) kecuali baris itu
membuka blok lain (judul, daftar, kutipan, pagar kode, garis, HTML, kode berindentasi); baris seperti itu gagal dan
tabel tetap diperiksa sampai baris kosong. Baris di dalam blok kode berpagar tidak dihitung.

    python3 tools/cek_tabel_plan.py                 # plan/*.md
    python3 tools/cek_tabel_plan.py plan/KEPUTUSAN.md
"""
import pathlib
import re
import sys

AKAR = pathlib.Path(__file__).resolve().parent.parent
PEMBATAS = re.compile(r"^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$")
PAGAR = re.compile(r"^\s{0,3}(`{3,}|~{3,})")
# Awal blok yang mengakhiri tabel di GitHub (diuji lewat `gh api markdown`, keputusan 362).
BLOK_LAIN = re.compile(r"^(\s{4,}|\t)\S|^\s{0,3}(#{1,6}(\s|$)|>|[-*+](\s|$)|\d{1,9}[.)](\s|$)|`{3,}|~{3,}|<"
                       r"|(?P<garis>[-*_])(\s*(?P=garis)){2,}\s*$)")


def pipe_baris(baris):
    """Posisi pipe pemisah (tanpa backslash di depan) dan pipe ambigu (backslash genap di depan)."""
    pisah, ambigu = [], []
    for i, c in enumerate(baris):
        if c != "|":
            continue
        k = 0
        while k < i and baris[i - k - 1] == "\\":
            k += 1
        if k == 0:
            pisah.append(i)
        elif k % 2 == 0:
            ambigu.append(i)
    return pisah, ambigu


def label(baris, pisah):
    """Nomor keputusan (sel pertama berupa angka) atau awal sel pertama, untuk pesan gagal."""
    sel = baris[pisah[0] + 1:pisah[1]].strip() if len(pisah) > 1 else baris.strip()
    return f"keputusan {sel}" if sel.isdigit() else f"baris tabel '{sel[:30]}'"


def periksa(path):
    """Kembalikan daftar (nomor baris, pesan) untuk satu file, dan jumlah baris tabel yang diperiksa."""
    gagal, diperiksa = [], 0
    baris = path.read_text(encoding="utf-8").split("\n")
    pagar = None
    header = None  # (nomor baris, jumlah pipe) tabel yang sedang dibaca
    for no, isi in enumerate(baris, 1):
        m = PAGAR.match(isi)
        if pagar:
            if m and m.group(1)[0] == pagar[0] and len(m.group(1)) >= len(pagar):
                pagar = None
            continue
        if m:
            pagar, header = m.group(1), None
            continue
        if not isi.strip():
            header = None
            continue
        berpipa = isi.lstrip().startswith("|")
        if header is None:
            berikut = baris[no] if no < len(baris) else ""
            if not berpipa or not PEMBATAS.match(berikut.strip()):
                continue
            pisah, ambigu = pipe_baris(isi)
            header = (no, len(pisah))
            diperiksa += 1
        elif not berpipa:
            if BLOK_LAIN.match(isi):
                header = None
                continue
            diperiksa += 1
            gagal.append((no, f"baris tanpa pipe pembuka ikut tabel header baris {header[0]} sebagai baris tabel "
                              "(GFM contoh 202); tambahkan pipe pembuka, atau baris kosong sebelumnya"))
            continue
        else:
            diperiksa += 1
            pisah, ambigu = pipe_baris(isi)
            n = len(pisah)
            jenis = "pembatas" if no == header[0] + 1 else label(isi, pisah)
            if n != header[1]:
                saran = ("tulis | di dalam teks atau code span sebagai \\|" if n > header[1]
                         else "sel kurang; tambahkan sel, boleh kosong")
                gagal.append((no, f"{jenis}: {n} pipe tanpa escape, header baris {header[0]} punya {header[1]}; "
                                  f"{saran}"))
        for i in ambigu:
            gagal.append((no, f"{label(isi, pisah)}: backslash genap sebelum pipe di kolom {i + 1} ambigu (GitHub "
                              "memasukkan pipe ke sel, micromark memecah sel); tulis \\\\\\| untuk backslash lalu "
                              "pipe di teks, atau spasi sebelum pipe pemisah"))
    return gagal, diperiksa


def main(argv):
    paths = [pathlib.Path(p) for p in argv] or sorted((AKAR / "plan").glob("*.md"))
    total_gagal = total_baris = 0
    for path in paths:
        gagal, diperiksa = periksa(path)
        total_baris += diperiksa
        total_gagal += len(gagal)
        nama = path.relative_to(AKAR) if path.is_relative_to(AKAR) else path
        for no, pesan in gagal:
            print(f"GAGAL {nama}:{no} {pesan}")
    print(f"{total_baris} baris tabel di {len(paths)} file diperiksa, {total_gagal} gagal")
    return 1 if total_gagal else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
