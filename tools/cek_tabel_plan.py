"""Periksa setiap baris tabel Markdown di plan/ punya jumlah pipe tanpa escape yang sama dengan header-nya (keputusan 362).

GFM memecah baris tabel di setiap `|` tanpa escape sebelum membaca inline, jadi `|` di dalam code span ikut
memecah sel; yang tidak memecah hanya `\\|` (spesifikasi GFM 0.29, Tables, contoh 200). Baris dengan sel lebih
banyak dari header dipotong (isinya hilang dari tampilan), baris dengan sel lebih sedikit diisi sel kosong
(contoh 204). Backslash memakan satu karakter sesudahnya, jadi `\\\\|` adalah backslash lalu pipe pemisah, sama
dengan pemindai cmark-gfm (`escaped_char` di extensions/ext_scanners.re). Baris di dalam blok kode berpagar
tidak dihitung.

    python3 tools/cek_tabel_plan.py                 # plan/*.md
    python3 tools/cek_tabel_plan.py plan/KEPUTUSAN.md
"""
import pathlib
import re
import sys

AKAR = pathlib.Path(__file__).resolve().parent.parent
PEMBATAS = re.compile(r"^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$")
PAGAR = re.compile(r"^\s{0,3}(`{3,}|~{3,})")


def hitung_pipe(baris):
    """Jumlah `|` yang memecah sel: backslash memakan satu karakter sesudahnya."""
    n = i = 0
    while i < len(baris):
        if baris[i] == "\\":
            i += 2
            continue
        n += baris[i] == "|"
        i += 1
    return n


def label(baris):
    """Nomor keputusan (sel pertama berupa angka) atau awal sel pertama, untuk pesan gagal."""
    sel = baris.strip().lstrip("|").split("|", 1)[0].strip()
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
        if not isi.lstrip().startswith("|"):
            header = None
            continue
        if header is None:
            berikut = baris[no] if no < len(baris) else ""
            if not PEMBATAS.match(berikut.strip()):
                continue
            header = (no, hitung_pipe(isi))
            diperiksa += 1
            continue
        diperiksa += 1
        n = hitung_pipe(isi)
        if n != header[1]:
            jenis = "pembatas" if no == header[0] + 1 else label(isi)
            saran = ("tulis | di dalam teks atau code span sebagai \\|" if n > header[1]
                     else "sel kurang; tambahkan sel, boleh kosong")
            gagal.append((no, f"{jenis}: {n} pipe tanpa escape, header baris {header[0]} punya {header[1]}; {saran}"))
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
