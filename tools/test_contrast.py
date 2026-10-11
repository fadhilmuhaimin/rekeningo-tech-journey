"""Uji tools/contrast.py dengan salinan tema.css yang diubah: skrip harus gagal, bukan lolos palsu.

Dua kasus dari review PR #176 (keputusan 262) dulu lolos karena nilainya dibuang tanpa pesan:
token terang --k-system-padat lewat color-mix() (= #0075EB, 4,43:1) dan background rgb(0 117 235).
tema.css tidak diubah; salinan ditulis ke direktori sementara.

    python tools/test_contrast.py
"""
import pathlib
import subprocess
import sys
import tempfile

AKAR = pathlib.Path(__file__).resolve().parent.parent
TEMA = (AKAR / "situs" / "src" / "styles" / "tema.css").read_text()
SALDO = ".sl-markdown-content .bb-hp__saldo { background: var(--k-system-padat);"
KASUS = [
    # nama, (cari, ganti) atau None, exit yang diharapkan, teks yang wajib ada di keluaran
    ("tema.css apa adanya", None, 0, ["0 dilewati, 0 tidak terbaca"]),
    ("token terang lewat color-mix() (review #176)",
     ("--k-system-padat: var(--k-system-ink);", "--k-system-padat: color-mix(in srgb, var(--k-system-edge) 100%, #fff 0%);"),
     1, ["FAIL  4.43 (≥4.5) [terang] tema.css .sl-markdown-content .bb-hp__saldo:"]),
    ("background rgb() langsung (review #176)",
     (SALDO, SALDO.replace("var(--k-system-padat)", "rgb(0 117 235)")),
     1, ["FAIL  4.43 (≥4.5) [terang] tema.css .sl-markdown-content .bb-hp__saldo:"]),
    ("warna yang tidak bisa dihitung (oklch)",
     (SALDO, SALDO.replace("var(--k-system-padat)", "oklch(55% 0.2 255)")),
     1, ["TIDAK TERBACA [gelap] .sl-markdown-content .bb-hp__saldo:", "bentuk warna tidak didukung"]),
    ("alpha < 1 tidak dicampur diam-diam",
     (SALDO, SALDO.replace("var(--k-system-padat)", "rgb(0 117 235 / 60%)")),
     1, ["TIDAK TERBACA [terang] .sl-markdown-content .bb-hp__saldo:", "alpha < 1"]),
    ("color: inherit tanpa leluhur di CSS",
     ("body { background: var(--bg); }", "body { background: var(--bg); }\n.uji-yatim { color: inherit; background: var(--bg-2); }"),
     1, ["TIDAK TERBACA [semua] .uji-yatim:", "inherit tanpa aturan leluhur"]),
]

gagal = 0
with tempfile.TemporaryDirectory() as tmp:
    for nama, ubah, harap, wajib in KASUS:
        css = TEMA
        if ubah:
            assert TEMA.count(ubah[0]) == 1, f"{nama}: teks yang diganti harus muncul tepat sekali di tema.css"
            css = TEMA.replace(*ubah)
        path = pathlib.Path(tmp) / "tema.css"
        path.write_text(css)
        p = subprocess.run([sys.executable, str(AKAR / "tools" / "contrast.py"), "--css", str(path)], capture_output=True, text=True)
        hilang = [w for w in wajib if w not in p.stdout]
        ok = p.returncode == harap and not hilang
        gagal += not ok
        print(f"{'OK  ' if ok else 'GAGAL'} exit {p.returncode} (harap {harap}) {nama}" + (f"; tidak ada di keluaran: {hilang}" if hilang else ""))
print(f"{len(KASUS) - gagal}/{len(KASUS)} kasus uji kontras lolos")
sys.exit(1 if gagal else 0)
