"""Lipat catatan masuk dari PR subagen ke KEPUTUSAN dan SETELAH-TAHAP-N (keputusan 564).

Subagen tidak menambah baris ke plan/KEPUTUSAN.md atau plan/SETELAH-TAHAP-N.md secara langsung, karena dua PR
yang sama-sama menambah baris di akhir file selalu bentrok di GitHub. Setiap PR menulis satu file unik
plan/masuk/<branch-dengan-strip>.md:

    # Masuk dari <branch>

    ## KEPUTUSAN

    | 601 | 2026-10-24 | Keputusan | Kenapa | Alternatif |

    ## SETELAH-TAHAP-2

    - Polesan satu baris.

Pengatur menjalankan `python3 tools/lipat_masuk.py` di PR catat: baris keputusan ditambahkan ke KEPUTUSAN
(urut nomor), polesan ke SETELAH-TAHAP-N, file masuk dihapus.

    python3 tools/lipat_masuk.py --cek   # gerbang: format sah, nomor tidak ganda (KEPUTUSAN + semua masuk)
    python3 tools/lipat_masuk.py         # lipat semua file masuk
"""
import glob
import os
import re
import sys

KEP = "plan/KEPUTUSAN.md"
_SKEMA = re.compile(r"^\| (\d+) \| \d{4}-\d{2}-\d{2} \| ")


class _Cocok:
    """Cocok bila baris diawali nomor dan tanggal, berakhir '|', dan punya TEPAT 5 kolom (pipe di teks wajib \\|)."""

    def __init__(self, baris):
        self.baris = baris
        self.m = _SKEMA.match(baris)

    def group(self, n):
        return self.m.group(n)


class _BarisKep:
    def match(self, baris):
        if not _SKEMA.match(baris) or not baris.rstrip().endswith("|"):
            return None
        kolom = re.split(r"(?<!\\)\|", baris.rstrip())[1:-1]
        return _Cocok(baris) if len(kolom) == 5 and all(k.strip() for k in kolom) else None


BARIS_KEP = _BarisKep()


def baca(path):
    """Kembalikan (baris keputusan, {tahap: [polesan]}, galat)."""
    kep, setelah, galat = [], {}, []
    bagian = None
    for i, b in enumerate(open(path, encoding="utf-8").read().split("\n"), 1):
        if b.startswith("## "):
            judul = b[3:].strip()
            m = re.fullmatch(r"SETELAH-TAHAP-(\d+)", judul)
            if judul == "KEPUTUSAN":
                bagian = "kep"
            elif m:
                bagian = ("setelah", m.group(1))
                setelah.setdefault(m.group(1), [])
            else:
                galat.append(f"{path}:{i}: bagian tidak dikenal: {judul}")
                bagian = None
        elif not b.strip() or b.startswith("# "):
            continue
        elif bagian == "kep":
            if not BARIS_KEP.match(b):
                galat.append(f"{path}:{i}: baris keputusan harus '| n | YYYY-MM-DD | apa | kenapa | alternatif |' tepat 5 kolom, pipe di teks ditulis \\|")
            else:
                kep.append(b)
        elif isinstance(bagian, tuple):
            if not b.startswith("- "):
                galat.append(f"{path}:{i}: polesan harus diawali '- '")
            else:
                setelah[bagian[1]].append(b)
        else:
            galat.append(f"{path}:{i}: baris di luar bagian")
    return kep, setelah, galat


def nomor(baris):
    return int(BARIS_KEP.match(baris).group(1))


def main():
    argumen = sys.argv[1:]
    if any(a in ("-h", "--help") for a in argumen):
        print(__doc__)
        return
    asing = [a for a in argumen if a != "--cek"]
    if asing:
        print(f"argumen tidak dikenal: {' '.join(asing)} (pakai --cek atau tanpa argumen; --help untuk bantuan)")
        sys.exit(2)
    cek = "--cek" in argumen
    files = sorted(f for f in glob.glob("plan/masuk/*.md") if not f.endswith("README.md"))
    ada = {int(m.group(1)) for m in re.finditer(r"^\| (\d+) \|", open(KEP, encoding="utf-8").read(), re.M)}
    semua, polesan, galat, dilihat = [], {}, [], {}
    for f in files:
        k, s, g = baca(f)
        galat += g
        for b in k:
            n = nomor(b)
            if n in ada:
                galat.append(f"{f}: keputusan {n} sudah ada di {KEP}")
            if n in dilihat:
                galat.append(f"{f}: keputusan {n} juga di {dilihat[n]}")
            dilihat[n] = f
        semua += k
        for t, xs in s.items():
            polesan.setdefault(t, []).extend(xs)
    if galat:
        print("\n".join(galat))
        sys.exit(1)
    if cek:
        print(f"masuk sah · {len(files)} file · {len(semua)} keputusan · {sum(map(len, polesan.values()))} polesan")
        return
    if semua:
        # Baris baru masuk ke tabel dan seluruh baris keputusan diurutkan menurut nomor di tempatnya
        # (baris lain di file tidak berpindah), supaya PR yang di-merge tidak berurutan tetap terbaca urut.
        L = open(KEP, encoding="utf-8").read().rstrip("\n").split("\n")
        idx = [i for i, b in enumerate(L) if BARIS_KEP.match(b) or re.match(r"^\| \d+ \|", b)]
        L[idx[-1] + 1:idx[-1] + 1] = semua
        idx = [i for i, b in enumerate(L) if re.match(r"^\| \d+ \|", b)]
        urut = sorted((L[i] for i in idx), key=lambda b: int(re.match(r"^\| (\d+) \|", b).group(1)))
        for i, b in zip(idx, urut):
            L[i] = b
        open(KEP, "w", encoding="utf-8").write("\n".join(L) + "\n")
    for tahap, xs in sorted(polesan.items()):
        p = f"plan/SETELAH-TAHAP-{tahap}.md"
        if os.path.exists(p):
            t = open(p, encoding="utf-8").read().rstrip("\n") + "\n"
        else:
            t = f"# Setelah Tahap {tahap}\n\nPolesan dari tinjauan Tahap {tahap} yang sengaja tidak dikerjakan (lingkup dibekukan).\n"
        t += "\n## Dari PR subagen (dilipat tools/lipat_masuk.py)\n\n" + "\n".join(xs) + "\n"
        open(p, "w", encoding="utf-8").write(t)
    for f in files:
        os.remove(f)
    print(f"dilipat · {len(files)} file · {len(semua)} keputusan · {sum(map(len, polesan.values()))} polesan")


if __name__ == "__main__":
    main()
