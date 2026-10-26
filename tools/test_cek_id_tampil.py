"""Uji tools/cek_id_tampil.py: ID internal yang tampil harus menggagalkan, bukan lolos palsu (keputusan 1170).

Insiden: alat hanya mengenal ID halaman `[A-G]\\d`, jadi ID riset (R2-04, R2-06, R3-32) tampil di halaman istilah backfill,
di 2.17 (tabel Bukti), dan di rekaman lab 3.8 sementara gerbang LOLOS. Kasus riset di sini memakai tiga bentuk itu
(halaman istilah, sel tabel, baris kode) dan tiap tempat lain yang dibaca atau dibacakan pembaca: tooltip (title),
aria-label, alt, teks SVG, props island, script application/json, data widget, istilah-data.js, dan judul tab.
Kasus lolos menjaga sebaliknya: komentar, script, style, atribut data-*, class, id, href, kunci internal data, kode
aturan gosec, dan pola yang mirip tetapi bukan ID riset tidak dianggap bocor.

Kasus pertama memeriksa situs/dist sungguhan; kasus sisanya memakai salinan kecil dari lima berkas dist (cepat, dan
dasarnya terbukti bersih lebih dulu). situs/dist tidak diubah.

    bun run --cwd situs build && python3 tools/test_cek_id_tampil.py
"""
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

AKAR = pathlib.Path(__file__).resolve().parent.parent
DIST = AKAR / "situs" / "dist"
ALAT = AKAR / "tools" / "cek_id_tampil.py"
# Berkas dist yang disalin ke situs mini: alat butuh index.html, widgets/data, dan javascripts/istilah-data.js.
MINI = ["index.html", "cerita/index.html", "istilah/backfill/index.html", "widgets/data/kartu.json", "javascripts/istilah-data.js"]
HOST = "cerita/index.html"


def ganti(berkas, cari, baru):
    def f(teks):
        assert cari in teks, f"'{cari}' tidak ada di {berkas}"
        return teks.replace(cari, baru, 1)
    return (berkas, f)


def sisip(html, berkas=HOST):
    return ganti(berkas, "</body>", html + "</body>")


def tambah_json(berkas, nilai):
    def f(teks):
        data = json.loads(teks)
        data.append(nilai)
        return json.dumps(data, ensure_ascii=False)
    return (berkas, f)


GAGAL_1 = "GAGAL: 1 ID internal tampil ke pembaca."
KASUS = [
    # nama, perubahan: (berkas, fungsi teks -> teks) | None, exit yang diharapkan, teks wajib di keluaran
    ("situs mini apa adanya", None, 0, ["tidak tampil"]),
    ("ID riset di paragraf", sisip("<p>Versi pgx (R2-04) terbaru.</p>"), 1, ["cerita/index.html: 'R2-04' di", GAGAL_1]),
    ("ID riset tiga digit", sisip("<p>Lihat R3-120 di naskah.</p>"), 1, ["'R3-120' di"]),
    ("ID riset satu digit nomor", sisip("<p>Lihat R3-7 di naskah.</p>"), 1, ["'R3-7' di"]),
    ("ID riset di sel tabel (2.17 sebelum perbaikan)", sisip("<table><tr><td>penghitung versi per buku (R2-06), tetapi</td></tr></table>"),
     1, ["'R2-06' di"]),
    ("ID riset di baris kode (3.8 sebelum perbaikan)",
     sisip('<pre><code><span class="line"><span>(batas lab 17,4 × 50 ms; hitungan naskah R3-32 dengan 20 ms: 0,35): ya</span></span></code></pre>'),
     1, ["'R3-32' di", "hitungan naskah R3-32 dengan 20 ms"]),
    ("ID riset di versi halaman istilah (backfill sebelum perbaikan)",
     sisip('<p><span class="hal-istilah__versi" translate="no">pgx v5.11.0 (R2-04)</span></p>', "istilah/backfill/index.html"),
     1, ["istilah/backfill/index.html: 'R2-04' di", "pgx v5.11.0 (R2-04)"]),
    ("ID riset di judul tab", ganti(HOST, "<title>", "<title>R2-04 "), 1, ["'R2-04' di"]),
    ("ID riset terpecah di dua node bersebelahan (seperti B + 147)", sisip("<span>R</span><span>2-04</span>"), 1, ["'R2-04' di"]),
    ("ID riset di tooltip title", sisip('<abbr title="pgx v5.11.0 (R2-04)">pgx</abbr>'), 1, ["(atribut title pada <abbr>)", "'R2-04' di"]),
    ("ID riset di aria-label", sisip('<div aria-label="Tabel bukti (R3-32)">x</div>'), 1, ["(atribut aria-label pada <div>)", "'R3-32' di"]),
    ("ID riset di alt gambar", sisip('<img src="/favicon.svg" alt="diagram R2-04">'), 1, ["(atribut alt pada <img>)", "'R2-04' di"]),
    ("ID riset di teks SVG", sisip("<svg><text>R2-06</text></svg>"), 1, ["'R2-06' di"]),
    ("ID riset di judul SVG", sisip("<svg><title>diagram R2-06</title><g></g></svg>"), 1, ["'R2-06' di"]),
    ("ID riset di props island", sisip('<astro-island props="{&quot;judul&quot;:[0,&quot;lihat R2-06&quot;]}"></astro-island>'),
     1, ["(data JSON inline)", "'R2-06' di"]),
    ("ID riset di script application/json", sisip('<script type="application/json" data-blok-halaman>{"/x/": {"judul": "R3-32"}}</script>'),
     1, ["(data JSON inline)", "'R3-32' di"]),
    ("JSON inline yang rusak tidak lolos diam-diam", sisip('<script type="application/json">{"judul": </script>'),
     1, ["script application/json bukan JSON"]),
    ("ID riset di data widget", tambah_json("widgets/data/kartu.json", "dua rilis (R2-04)"), 1, ["widgets/data/kartu.json: 'R2-04' di"]),
    ("ID riset di istilah-data.js", ganti("javascripts/istilah-data.js", '"t": "ACID"', '"t": "ACID (R2-04)"'), 1, ["javascripts/istilah-data.js: 'R2-04' di"]),
    ("ID riset sesudah tanda kutip bergaris miring di istilah-data.js",
     ganti("javascripts/istilah-data.js", '"t": "ACID"', '"t": "ACID \\"x\\" lalu R2-04"'), 1, ["javascripts/istilah-data.js: 'R2-04' di"]),
    ("ID halaman lama tetap terdeteksi di teks", sisip("<p>Lihat B3.2 untuk jawabannya.</p>"), 1, ["'B3.2' di", GAGAL_1]),
    ("ID halaman lama tetap terdeteksi di tooltip", sisip('<abbr title="lihat C2">x</abbr>'), 1, ["(atribut title pada <abbr>)", "'C2' di"]),
    ("dua ID di satu halaman dihitung dua", sisip("<p>R2-04 dan R2-06</p>"), 1, ["GAGAL: 2 ID internal tampil"]),
    ("ID riset di komentar, script, style, atribut data-*, class, id, dan href tidak tampil",
     sisip('<!-- R2-04 --><script>var x = "R2-04";</script><style>/* R2-06 */</style>'
           '<div data-riset="R2-04" class="R2-04" id="R2-06"><a href="/R3-32/">x</a></div><svg><desc></desc><path d="M0 0"></path></svg>'),
     0, ["tidak tampil"]),
    ("kunci internal di JSON inline tidak tampil", sisip('<script type="application/json">{"id": "R2-04", "halaman": "R3-32"}</script>'),
     0, ["tidak tampil"]),
    ("kunci internal di data widget tidak tampil", tambah_json("widgets/data/kartu.json", {"id": "R2-04", "halaman": "B3.2"}), 0, ["tidak tampil"]),
    ("kode aturan gosec bukan ID halaman", sisip("<p>Aturan G101 dan G104.</p>"), 0, ["tidak tampil"]),
    ("pola mirip yang bukan ID riset", sisip("<p>R2-D2, R10-2, XR2-04, R2-1000, R2-04x, r2-04, dan R2.04.</p>"), 0, ["tidak tampil"]),
]


def jalankan(dist):
    return subprocess.run([sys.executable, str(ALAT), "--dist", str(dist)], capture_output=True, text=True)


if not (DIST / "index.html").is_file():
    print("GAGAL: situs/dist belum dibangun")
    sys.exit(1)

gagal = 0
p = jalankan(DIST)
ok = p.returncode == 0 and "tidak tampil" in p.stdout
gagal += not ok
print(f"{'OK  ' if ok else 'GAGAL'} exit {p.returncode} (harap 0) situs/dist sungguhan bersih dari ID internal"
      + ("" if ok else f"\n{p.stdout[-800:]}"))

with tempfile.TemporaryDirectory() as tmp:
    mini = pathlib.Path(tmp) / "dist"
    for rel in MINI:
        (mini / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(DIST / rel, mini / rel)
    for nama, ubah, harap, wajib in KASUS:
        asli = None
        if ubah:
            target = mini / ubah[0]
            asli = target.read_bytes()
            target.write_text(ubah[1](asli.decode("utf-8")), encoding="utf-8")
        p = jalankan(mini)
        if asli is not None:
            target.write_bytes(asli)
        hilang = [w for w in wajib if w not in p.stdout]
        ok = p.returncode == harap and not hilang
        gagal += not ok
        print(f"{'OK  ' if ok else 'GAGAL'} exit {p.returncode} (harap {harap}) {nama}"
              + (f"; tidak ada di keluaran: {hilang}\n{p.stdout[-600:]}{p.stderr[-300:]}" if not ok else ""))
total = len(KASUS) + 1
print(f"{total - gagal}/{total} kasus uji ID internal lolos")
sys.exit(1 if gagal else 0)
