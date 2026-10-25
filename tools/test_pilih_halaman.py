"""Uji tools/pilih_halaman.py (keputusan 866): pemilih halaman PR harus memilih semua bila ragu, dan sebagian hanya bila yakin.

Dist sintetis di direktori sementara; git diganti fungsi tiruan. Kasus yang wajib terbukti:
  - PR dengan perubahan CSS (berkas src, hash CSS, semua HTML berubah) memilih SEMUA halaman;
  - PR dengan satu halaman memilih halaman itu saja walau sidebar berubah di semua halaman;
  - push, jadwal, dan dist dasar yang hilang memilih SEMUA;
  - perubahan alat ukur, workflow, dependency, dan berkas tak dikenal memilih SEMUA;
  - berkas dist non-HTML yang berubah: kode bersama memilih SEMUA, data widget memilih halaman perujuknya, yang tak
    terpetakan memilih SEMUA.

    python3 tools/test_pilih_halaman.py
"""
import json
import pathlib
import subprocess
import sys
import tempfile

AKAR = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(AKAR / "tools"))
import pilih_halaman as ph  # noqa: E402

SIDEBAR = '<nav class="sidebar print:hidden astro-x" aria-label="Utama"><ul>{isi}</ul><nav class="dalam">x</nav></nav>'


def halaman(judul, isi="", sidebar="a", css="/_astro/a.css", ekstra=""):
    return (f'<html><head><link rel="stylesheet" href="{css}"></head><body>{SIDEBAR.format(isi=sidebar)}'
            f'<main><h1>{judul}</h1><p>{isi}</p>{ekstra}</main></body></html>')


def tulis(akar, rel, isi):
    p = pathlib.Path(akar) / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(isi, encoding="utf8")


def dist(akar, halamanx, lain=None):
    for rel, isi in halamanx.items():
        tulis(akar, rel, isi)
    for rel, isi in (lain or {}).items():
        tulis(akar, rel, isi)
    return str(akar)


SPEK = {
    "index.html": ("Beranda", ""),
    "tahap-1/a/index.html": ("A", '<div data-bb="alur" data-src="data/a-alur.json"></div>'),
    "tahap-1/b/index.html": ("B", ""),
    "tahap-2/c/index.html": ("C", '<div data-bb="kartu"></div>'),
}


def semua_halaman(**kw):
    return {rel: halaman(j, ekstra=e, **kw) for rel, (j, e) in SPEK.items()}


DASAR_HAL = semua_halaman()
DASAR_LAIN = {
    "_astro/a.css": "x{}", "pagefind/p.js": "1", "sitemap-0.xml": "<x/>", "widgets/alur.js": "js1",
    "widgets/data/a-alur.json": '{"v":1}', "widgets/data/cerita.json": '{"v":1}', "fonts/s.woff2": "f1",
    "javascripts/istilah-data.js": "d1", "gerbang-tanda.txt": "t1", "widgets/data/z.json": "0", "assets/yatim.svg": "0",
}


def jalankan(nama, peristiwa="pull_request", sumber=(), ubah_halaman=None, ubah_lain=None, hapus=(), tanpa_dasar=False,
             hal_baru=None, cerita=(None, None)):
    """-> (mode, halaman, alasan). sumber: [(status, path)] berkas sumber yang berubah di PR."""
    with tempfile.TemporaryDirectory() as t:
        t = pathlib.Path(t)
        dasar = dist(t / "dasar", DASAR_HAL, DASAR_LAIN)
        baru_hal = {**DASAR_HAL, **(ubah_halaman or {}), **(hal_baru or {})}
        baru_lain = {**DASAR_LAIN, **(ubah_lain or {})}
        for h in hapus:
            baru_lain.pop(h, None)
        baru = dist(t / "baru", baru_hal, baru_lain)

        def git_palsu(*a, **k):
            if a[0] == "diff":
                return "".join(f"{s}\t{p}\n" for s, p in sumber)
            if a[0] == "show":
                return cerita[0]
            raise AssertionError(a)

        return ph.putuskan(peristiwa, baru, None if tanpa_dasar else dasar, "HEAD^1", bawaan_git=git_palsu,
                           baca_cerita=lambda: cerita[1])


KASUS = []


def kasus(nama, harap_mode, harap_halaman=None, wajib_alasan=(), **kw):
    KASUS.append((nama, harap_mode, harap_halaman, wajib_alasan, kw))


DOCS = "situs/src/content/docs/tahap-1/b.mdx"
kasus("satu halaman berubah, sidebar berubah di semua halaman, memilih halaman itu saja", "sebagian", ["/tahap-1/b/"],
      sumber=[("M", DOCS)],
      ubah_halaman={**semua_halaman(sidebar="BARU"), "tahap-1/b/index.html": halaman("B", isi="kalimat baru", sidebar="BARU")})
kasus("halaman baru: halaman baru dan tetangga yang tautannya berubah", "sebagian", ["/tahap-1/b/", "/tahap-1/d/"],
      sumber=[("A", "situs/src/content/docs/tahap-1/d.mdx"), ("A", "situs/lama/widgets/data/d-alur.json"), ("A", "situs/src/components/Baru.astro")],
      hal_baru={"tahap-1/d/index.html": halaman("D", sidebar="BARU")},
      ubah_halaman={**semua_halaman(sidebar="BARU"), "tahap-1/b/index.html": halaman("B", ekstra='<a href="/tahap-1/d/">Berikutnya</a>', sidebar="BARU")},
      ubah_lain={"widgets/data/d-alur.json": "{}"})
kasus("tidak ada yang berubah: nol halaman", "sebagian", [], sumber=[("M", "plan/MEMORI.md")])
kasus("perubahan CSS: semua HTML dan berkas src berubah memilih SEMUA", "semua", None, ("styles/tema.css",),
      sumber=[("M", "situs/src/styles/tema.css")],
      ubah_halaman=semua_halaman(css="/_astro/b.css"), ubah_lain={"_astro/b.css": "y{}"})
kasus("komponen lama diubah memilih SEMUA", "semua", None, ("Beranda.astro",), sumber=[("M", "situs/src/components/Beranda.astro")])
kasus("push memilih SEMUA", "semua", None, ("push",), peristiwa="push", sumber=[("M", DOCS)])
kasus("jadwal malam memilih SEMUA", "semua", None, ("schedule",), peristiwa="schedule", sumber=[("M", DOCS)])
kasus("workflow_dispatch memilih SEMUA", "semua", None, ("workflow_dispatch",), peristiwa="workflow_dispatch")
kasus("dist dasar hilang memilih SEMUA", "semua", None, ("dist dasar",), tanpa_dasar=True, sumber=[("M", DOCS)])
kasus("alat ukur diubah memilih SEMUA", "semua", None, ("situs/tools/ukur-gerak.mjs",), sumber=[("M", "situs/tools/ukur-gerak.mjs")])
kasus("alat ukur baru juga SEMUA", "semua", None, ("situs/tools/ukur-baru.mjs",), sumber=[("A", "situs/tools/ukur-baru.mjs")])
kasus("workflow diubah memilih SEMUA", "semua", None, (".github/workflows/cek.yml",), sumber=[("M", ".github/workflows/cek.yml")])
kasus("gerbang tools/ diubah memilih SEMUA", "semua", None, ("tools/cek_situs.sh",), sumber=[("M", "tools/cek_situs.sh")])
kasus("dependency diubah memilih SEMUA", "semua", None, ("bun.lock",), sumber=[("M", "situs/bun.lock")])
kasus("astro.config diubah memilih SEMUA", "semua", None, ("astro.config",), sumber=[("M", "situs/astro.config.mjs")])
kasus("situs/public diubah memilih SEMUA", "semua", None, ("situs/public",), sumber=[("M", "situs/public/favicon.svg")])
kasus("berkas tak dikenal di root memilih SEMUA", "semua", None, ("Makefile",), sumber=[("M", "Makefile")])
kasus("campuran halaman dan alat ukur memilih SEMUA", "semua", None, ("situs/tools",),
      sumber=[("M", DOCS), ("M", "situs/tools/layar.mjs")])
kasus("kode widget bersama berubah memilih SEMUA", "semua", None, ("widgets/alur.js",),
      sumber=[("M", "situs/lama/widgets/alur.js")], ubah_lain={"widgets/alur.js": "js2"})
kasus("font berubah memilih SEMUA", "semua", None, ("fonts/s.woff2",), sumber=[("M", DOCS)], ubah_lain={"fonts/s.woff2": "f2"})
kasus("data widget berubah memilih halaman perujuk", "sebagian", ["/tahap-1/a/"],
      sumber=[("M", "situs/lama/widgets/data/a-alur.json")], ubah_lain={"widgets/data/a-alur.json": '{"v":2}'})
kasus("data widget yatim yang berubah memilih SEMUA", "semua", None, ("widgets/data/z.json berubah dan tidak ada halaman yang merujuknya",),
      sumber=[("M", "situs/lama/widgets/data/z.json")], ubah_lain={"widgets/data/z.json": "1"})
kasus("berkas dist yang tak bisa dipetakan memilih SEMUA", "semua", None, ("assets/yatim.svg berubah dan tidak ada halaman yang merujuknya",),
      sumber=[("M", DOCS)], ubah_lain={"assets/yatim.svg": "1"})
kasus("aset yang dirujuk HTML memilih halaman perujuk", "sebagian", ["/tahap-1/b/"],
      sumber=[("M", DOCS)], ubah_lain={"assets/yatim.svg": "1"},
      ubah_halaman={"tahap-1/b/index.html": halaman("B", ekstra='<img src="/assets/yatim.svg">')})
kasus("berkas dist dihapus memilih SEMUA", "semua", None, ("dihapus",), sumber=[("M", DOCS)], hapus=("fonts/s.woff2",))
kasus("istilah-data.js berubah netral", "sebagian", [], sumber=[("M", "situs/lama/javascripts/istilah-data.js")],
      ubah_lain={"javascripts/istilah-data.js": "d2"})
kasus("registry runtime berubah memilih beranda dan halaman pembaca registry", "sebagian", ["/", "/tahap-2/c/"],
      sumber=[("M", "situs/data/cerita.json")], ubah_lain={"widgets/data/cerita.json": '{"v":2}'},
      cerita=('{"tahap":[1],"halaman":[{"id":"A"}]}', '{"tahap":[1],"halaman":[{"id":"A"},{"id":"B"}]}'))
kasus("registry berubah di luar entri halaman memilih SEMUA", "semua", None, ("cerita.json",),
      sumber=[("M", "situs/data/cerita.json")], ubah_lain={"widgets/data/cerita.json": '{"v":2}'},
      cerita=('{"tahap":[1],"halaman":[]}', '{"tahap":[1,2],"halaman":[]}'))


def uji_sidebar():
    h1 = halaman("A", sidebar="x")
    h2 = halaman("A", sidebar="y <b>lain</b>")
    h3 = halaman("A", isi="beda")
    assert ph.sidik_html(h1) == ph.sidik_html(h2), "sidebar beda tidak boleh mengubah sidik"
    assert ph.sidik_html(h1) != ph.sidik_html(h3), "isi beda harus mengubah sidik"
    # uid astro-island berbeda antarmesin: tidak boleh mengubah sidik; atribut lain di tag yang sama tetap dihitung
    i1 = '<astro-island uid="53oVv" prefix="r1" props="{}"></astro-island>'
    i2 = '<astro-island uid="Z1euMCo" prefix="r1" props="{}"></astro-island>'
    i3 = '<astro-island uid="53oVv" prefix="r1" props="{&quot;a&quot;:1}"></astro-island>'
    assert ph.sidik_html(h1 + i1) == ph.sidik_html(h1 + i2), "uid island beda tidak boleh mengubah sidik"
    assert ph.sidik_html(h1 + i1) != ph.sidik_html(h1 + i3), "props island beda harus mengubah sidik"
    # nav bersarang di dalam sidebar tidak memutus pembuangan: sisa sidebar tidak boleh bocor ke sidik
    assert "dalam" not in ph.hapus_sidebar(h1)
    # sidebar tidak seimbang: dibiarkan utuh (berbeda = terpilih, arah aman)
    rusak = '<nav class="sidebar"><ul>tanpa penutup'
    assert ph.hapus_sidebar(rusak) == rusak
    return True


def uji_main_hapus_berkas():
    with tempfile.TemporaryDirectory() as t:
        keluar = pathlib.Path(t) / "h.txt"
        keluar.write_text("/lama/\n")
        assert ph.main(["--peristiwa", "push", "--dist", t, "--keluar", str(keluar)]) == 0
        assert not keluar.exists(), "mode semua harus menghapus berkas daftar lama (tanpa UKUR_HALAMAN)"
        return True


gagal = 0
for nama, harap_mode, harap_hal, wajib, kw in KASUS:
    mode, hal, alasan = jalankan(nama, **kw)
    teks = " | ".join(alasan)
    ok = mode == harap_mode and (harap_hal is None or hal == sorted(harap_hal)) and all(w in teks for w in wajib)
    gagal += not ok
    print(f"{'OK  ' if ok else 'GAGAL'} {nama}" + ("" if ok else f"\n      dapat mode={mode} halaman={hal}; alasan: {teks[:300]}"))
for nama, f in (("sidebar dinormalkan, isi tidak", uji_sidebar), ("mode semua menghapus berkas daftar", uji_main_hapus_berkas)):
    try:
        ok = f()
    except AssertionError as e:
        ok = False
        print(f"      {e}")
    gagal += not ok
    print(f"{'OK  ' if ok else 'GAGAL'} {nama}")
total = len(KASUS) + 2
print(f"{total - gagal}/{total} kasus uji pemilih halaman lolos")
sys.exit(1 if gagal else 0)
