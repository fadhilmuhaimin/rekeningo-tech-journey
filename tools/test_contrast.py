"""Uji tools/contrast.py dengan salinan tema.css yang diubah: skrip harus gagal, bukan lolos palsu.

Kasus dari review PR #176 (keputusan 262) dulu lolos karena nilainya dibuang tanpa pesan: token terang
--k-system-padat lewat color-mix() (= #0075EB, 4,43:1) dan background rgb(0 117 235). Kasus K2b (keputusan 355)
dulu lolos karena pasangannya tidak pernah dibentuk: aturan color saja, latar saja, opacity di aturan induk, @media
yang menimpa, :is() yang terpecah, dan langkah runsql .is-skipped versi sebelum K2a (opacity 0.55, keputusan 354).
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
BODY = "body { background: var(--bg); }"
LEWAT = ".sl-markdown-content .bb-step.is-skipped .bb-step__sql { color: var(--teks-2); text-decoration: line-through; }"
SEBELUM_K2A = (".sl-markdown-content .bb-step.is-skipped { opacity: 0.55; }\n"
               ".sl-markdown-content .bb-step.is-skipped .bb-step__sql { text-decoration: line-through; }")


def tambah(css):
    return BODY, BODY + "\n" + css


class Gagal(str):
    """Teks wajib yang harus ada di baris berawalan FAIL, bukan sekadar di keluaran (exit 1 bisa datang dari pasangan lain)."""


def ada(wajib, keluaran):
    if isinstance(wajib, Gagal):
        return any(baris.startswith("FAIL") and wajib in baris for baris in keluaran.splitlines())
    return wajib in keluaran


KASUS = [
    # nama, (cari, ganti) atau None, exit yang diharapkan, teks yang wajib ada di keluaran (Gagal: di baris FAIL)
    ("tema.css apa adanya", None, 0, [" 0 tidak terbaca", "DILEWATI (pengecualian)"]),
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
    ("color: inherit tanpa leluhur memakai teks halaman (Starlight body)",
     tambah(".uji-yatim { color: inherit; background: var(--k-system-edge); }"),
     1, ["FAIL  1.77 (≥4.5) [gelap] tema.css .uji-yatim: var(--sl-color-text) di var(--k-system-edge) [color dari body]"]),
    ("langkah runsql .is-skipped sebelum K2a (opacity 0.55)", (LEWAT, SEBELUM_K2A),
     1, ["FAIL  3.96 (≥4.5) [terang] tema.css .sl-markdown-content .bb-step.is-skipped:",
         "[terang] tema.css .sl-markdown-content .bb-step__res (di .sl-markdown-content .bb-step.is-skipped):"]),
    ("color saja di atas induk BEM gelap",
     tambah(".uji-kartu { background: var(--k-system-padat); color: var(--ink-di-aksen); }\n"
            ".uji-kartu__catatan { color: var(--teks-2); }"),
     1, [Gagal("[gelap] tema.css .uji-kartu__catatan: var(--teks-2) di var(--k-system-padat) [latar dari .uji-kartu]")]),
    ("color saja tanpa leluhur memakai latar halaman", tambah(".uji-redup { color: var(--garis-2); }"),
     1, [Gagal("[terang] tema.css .uji-redup: var(--garis-2) di var(--bg) [latar dari body]")]),
    ("latar saja memakai teks leluhur",
     tambah(".uji-kotak { color: var(--ink-di-aksen); }\n.uji-kotak .uji-isi { background: var(--bg-2); }"),
     1, [Gagal("[gelap] tema.css .uji-kotak .uji-isi: var(--ink-di-aksen) di var(--bg-2) [color dari .uji-kotak]")]),
    ("opacity induk turun ke warna anak",
     tambah(".uji-induk { opacity: 0.5; }\n.uji-induk .uji-anak { color: var(--teks-2); }"),
     1, [Gagal("[terang] tema.css .uji-induk .uji-anak: var(--teks-2) di var(--bg) opacity 0.50 [latar dari body; opacity 0.5 dari .uji-induk]")]),
    ("@media menjadi varian, tidak menimpa aturan dasar",
     tambah("@media (max-width: 50em) { .sl-markdown-content .bb-hp__saldo { background: var(--k-system-edge); } }"),
     1, ["FAIL  4.43 (≥4.5) [terang] tema.css @media (max-width: 50em) .sl-markdown-content .bb-hp__saldo:",
         "OK    8.28 (≥4.5) [terang] tema.css .sl-markdown-content .bb-hp__saldo:"]),
    (":is() diurai, tidak terpecah di koma", tambah(".uji-is :is(.a, .b) { color: var(--garis-2); }"),
     1, [Gagal("[terang] tema.css .uji-is .a:"), Gagal("[terang] tema.css .uji-is .b:")]),
    ("PENGECUALIAN yang tidak lagi cocok membuat gagal",
     (".sl-markdown-content .bb-btn:disabled {", ".sl-markdown-content .bb-btn[disabled] {"),
     1, ["PENGECUALIAN/GRAFIS tidak cocok", "FAIL  2.92 (≥4.5) [terang] tema.css .sl-markdown-content .bb-btn[disabled]:"]),
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
        hilang = [w for w in wajib if not ada(w, p.stdout)]
        ok = p.returncode == harap and not hilang
        gagal += not ok
        print(f"{'OK  ' if ok else 'GAGAL'} exit {p.returncode} (harap {harap}) {nama}" + (f"; tidak ada di keluaran: {hilang}" if hilang else ""))
print(f"{len(KASUS) - gagal}/{len(KASUS)} kasus uji kontras lolos")
sys.exit(1 if gagal else 0)
