"""Uji tools/cek_tautan.py dengan salinan situs/dist yang diubah: tautan rusak harus menggagalkan, bukan lolos palsu.

Kasus pertama adalah P6 sendiri (keputusan 318): `[Peta cerita](peta.md)` di cerita/index.mdx dibangun jadi
href="peta.md", yang di /cerita/ menuju /cerita/peta.md dan 404. Kasus skip link adalah temuan pertama pemeriksa:
"Lewati ke konten" menuju #_top, yang tidak ada di beranda dan 404 sebelum P6. Kasus lolos menjaga sebaliknya:
resolusi relatif, path tanpa garis miring akhir, query, anchor yang ada, dan skema eksternal tidak dianggap rusak.
situs/dist tidak diubah; salinannya ditulis ke direktori sementara.

    bun run --cwd situs build && python3 tools/test_cek_tautan.py
"""
import pathlib
import shutil
import subprocess
import sys
import tempfile

AKAR = pathlib.Path(__file__).resolve().parent.parent
DIST = AKAR / "situs" / "dist"


def sisip(berkas, html):
    """Tambahkan html tepat sebelum </body> di berkas."""
    return (berkas, "</body>", html + "</body>")


KASUS = [
    # nama, perubahan: (berkas, cari, ganti) | ("hapus", berkas) | None, exit yang diharapkan, teks wajib di keluaran
    ("dist apa adanya", None, 0, ["rusak: 0 path, 0 anchor"]),
    ("tautan .md relatif (cerita/index.mdx sebelum P6)", sisip("cerita/index.html", '<a href="peta.md">Peta cerita</a>'),
     1, ['RUSAK cerita/index.html: <a href="peta.md"> -> /cerita/peta.md tidak ada di dist']),
    ("path absolut ke halaman yang tidak ada", sisip("tahap-1/transaction/index.html", '<a href="/tahap-1/tidak-ada/">x</a>'),
     1, ['RUSAK tahap-1/transaction/index.html: <a href="/tahap-1/tidak-ada/"> -> /tahap-1/tidak-ada/ tidak ada di dist']),
    ("relatif naik direktori ke halaman yang tidak ada", sisip("tahap-1/transaction/index.html", '<a href="../transactions/">x</a>'),
     1, ['RUSAK tahap-1/transaction/index.html: <a href="../transactions/"> -> /tahap-1/transactions/ tidak ada di dist']),
    ("halaman tujuan dihapus (semua tautan sidebar ke sana)", ("hapus", "cerita/peta/index.html"),
     1, ['RUSAK index.html: <a href="/cerita/peta/"> -> /cerita/peta/ tidak ada di dist']),
    ("anchor yang tidak ada di halaman tujuan", sisip("cerita/index.html", '<a href="/tahap-1/transaction/#tidak-ada">x</a>'),
     1, ['RUSAK cerita/index.html: <a href="/tahap-1/transaction/#tidak-ada"> -> #tidak-ada tidak ada di tahap-1/transaction/index.html']),
    ("skip link beranda tanpa h1#_top (sebelum P6)", ("index.html", ' id="_top"', ""),
     1, ['RUSAK index.html: <a href="#_top"> -> #_top tidak ada di index.html']),
    ("tujuan anchor ganda: h1#_top Starlight ikut tampil di beranda", sisip("index.html", '<h1 id="_top">x</h1>'),
     1, ['RUSAK index.html: <a href="#_top"> -> #_top ada 2 kali di index.html']),
    ("gambar yang tidak ada", sisip("cerita/index.html", '<img src="/assets/tidak-ada.svg" alt="">'),
     1, ['RUSAK cerita/index.html: <img src="/assets/tidak-ada.svg"> -> /assets/tidak-ada.svg tidak ada di dist']),
    ("kandidat srcset kedua yang tidak ada", sisip("cerita/index.html", '<img src="/favicon.svg" srcset="/favicon.svg 1x, /tidak-ada@2x.png 2x" alt="">'),
     1, ['RUSAK cerita/index.html: <img srcset="/tidak-ada@2x.png"> -> /tidak-ada@2x.png tidak ada di dist']),
    ("url data widget kartu ke halaman yang tidak ada", ("widgets/data/kartu.json", '"url": "tahap-1/transaction/"', '"url": "tahap-1/tidak-ada/"'),
     1, ['RUSAK widgets/data/kartu.json: "url": "tahap-1/tidak-ada/" -> /tahap-1/tidak-ada/ tidak ada di dist']),
    ("tautan sah tidak dianggap rusak: ../, tanpa garis miring akhir, query, anchor yang ada",
     sisip("cerita/index.html", '<a href="../tahap-1/transaction/">a</a><a href="peta/">b</a><a href="/cerita/peta">c</a>'
           '<a href="/tahap-1/transaction/?v=1#_top">d</a><a href="#">e</a><a href="#top">f</a><a href="/favicon.svg">g</a>'),
     0, ["rusak: 0 path, 0 anchor"]),
    ("skema eksternal dilewati dan dihitung", sisip("cerita/index.html", '<a href="https://contoh.test/x.md">a</a><a href="mailto:a@contoh.test">b</a>'),
     0, ["mailto: 1", "rusak: 0 path, 0 anchor"]),
]

if not (DIST / "index.html").is_file():
    print("GAGAL: situs/dist belum dibangun")
    sys.exit(1)

gagal = 0
with tempfile.TemporaryDirectory() as tmp:
    salinan = pathlib.Path(tmp) / "dist"
    shutil.copytree(DIST, salinan)
    for nama, ubah, harap, wajib in KASUS:
        asli = None
        if ubah and ubah[0] == "hapus":
            target = salinan / ubah[1]
            asli = target.read_bytes()
            target.unlink()
        elif ubah:
            target = salinan / ubah[0]
            asli = target.read_bytes()
            teks = asli.decode("utf-8")
            assert teks.count(ubah[1]) >= 1, f"{nama}: '{ubah[1]}' tidak ada di {ubah[0]}"
            target.write_text(teks.replace(ubah[1], ubah[2], 1), encoding="utf-8")
        p = subprocess.run([sys.executable, str(AKAR / "tools" / "cek_tautan.py"), "--dist", str(salinan)],
                           capture_output=True, text=True)
        if asli is not None:
            target.write_bytes(asli)
        hilang = [w for w in wajib if w not in p.stdout]
        ok = p.returncode == harap and not hilang
        gagal += not ok
        print(f"{'OK  ' if ok else 'GAGAL'} exit {p.returncode} (harap {harap}) {nama}"
              + (f"; tidak ada di keluaran: {hilang}\n{p.stdout[-600:]}" if hilang or not ok else ""))
print(f"{len(KASUS) - gagal}/{len(KASUS)} kasus uji tautan lolos")
sys.exit(1 if gagal else 0)
