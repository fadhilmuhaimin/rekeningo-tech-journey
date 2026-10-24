"""Ambil bagian `## Catatan pengatur` dari badan PR dan tulis sebagai plan/masuk/pr-<n>.md (keputusan 727).

Format badan PR (BRIEF-SUBAGEN "BERKAS BERSAMA"): sub-bagian `### KEPUTUSAN` (baris tabel 5 kolom) dan
`### SETELAH-TAHAP-N` (polesan satu baris) dipindah ke file masuk yang dilipat `tools/lipat_masuk.py`; sub-bagian lain
(PERLU-DICEK-PEMILIK, USULAN-CERITA, DIPUTUSKAN-TANPA-PEMILIK, ISTILAH-BARU, REGISTRI) dicetak ke layar untuk pengatur.

    python3 tools/ambil_catatan_pr.py 317 318 319      # tulis plan/masuk/pr-317.md dst., cetak sub-bagian lain
    python3 tools/ambil_catatan_pr.py --cetak 317      # hanya cetak, tidak menulis
"""
import json
import re
import subprocess
import sys


def badan(n):
    r = subprocess.run(["gh", "pr", "view", str(n), "--json", "body", "-q", ".body"], capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"gh pr view {n}: {r.stderr.strip()}")
    return r.stdout


def bagian(teks):
    m = re.search(r"^## Catatan pengatur\s*\n(.*)\Z", teks, re.M | re.S)
    if not m:
        return None
    sub, nama = {}, None
    for b in m.group(1).split("\n"):
        h = re.match(r"^###\s+(.+?)\s*$", b)
        if h:
            nama = h.group(1).strip()
            sub[nama] = []
        elif nama is not None:
            sub[nama].append(b)
    return {k: "\n".join(v).strip("\n") for k, v in sub.items()}


def main():
    arg = sys.argv[1:]
    if not arg or any(a in ("-h", "--help") for a in arg):
        print(__doc__)
        return
    cetak = "--cetak" in arg
    nomor = [a for a in arg if a != "--cetak"]
    if any(not a.isdigit() for a in nomor):
        sys.exit("argumen tidak dikenal; pakai nomor PR dan --cetak")
    for n in nomor:
        sub = bagian(badan(n))
        if sub is None:
            print(f"#{n}: tanpa bagian '## Catatan pengatur'")
            continue
        keluar = [f"# Masuk dari PR #{n}", ""]
        for nama, isi in sub.items():
            if nama == "KEPUTUSAN" or re.fullmatch(r"SETELAH-TAHAP-\d+", nama):
                baris = [b for b in isi.split("\n") if b.strip() and not re.match(r"^\|\s*-+", b) and not re.match(r"^\|\s*(n|#)\s*\|", b)]
                keluar += [f"## {nama}", ""] + baris + [""]
            else:
                print(f"--- #{n} {nama}\n{isi}\n")
        if not cetak:
            with open(f"plan/masuk/pr-{n}.md", "w") as f:
                f.write("\n".join(keluar).rstrip("\n") + "\n")
            print(f"#{n}: ditulis plan/masuk/pr-{n}.md")


if __name__ == "__main__":
    main()
