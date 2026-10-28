"""Uji tools/eval_tahap.py dengan salinan repo kecil yang diubah: pelanggaran harus menggagalkan, bukan lolos palsu (EVAL-3).

`eval_tahap.py` menjadi bukti W1, W6, dan W8 di kartu evaluasi, dan `rantai` ada di gerbang (keputusan 1164). Sebelum
uji ini, hanya satu mutasi `rantai` yang pernah dicoba tangan (EVAL-2 putaran 2). Di sini repo kecil Tahap 9 ditulis ke
direktori sementara (naskah, registry, MDX, situs/dist, data widget) dan dibaca lewat EVAL_AKAR. Kasus dasar harus lolos
di semua perintah; tiap mutasi mengubah satu hal dan perintahnya harus gagal (exit 1) dengan kata kunci di keluaran.

    python3 tools/test_eval_tahap.py
"""
import json
import os
import pathlib
import subprocess
import sys
import tempfile

ALAT = pathlib.Path(__file__).resolve().parent / "eval_tahap.py"
N = 9

NASKAH = """# Naskah uji
## Peta halaman Tahap 9
| Nomor | M | Judul | Jenis | Inti | Lab |
| --- | --- | --- | --- | --- | --- |
| 9.1 | – | PRD uji | PRD | ★ | – |
| 9.2 | – | Konsep uji | Konsep | ★ | lab-x |
| 9.3 | – | ADR uji | ADR | – | – |
## Bagian lain
"""

REGISTRY = {"halaman": [
    {"id": "t9-a", "judul": "PRD uji", "tahap": N, "path": "tahap-9/a.md", "jenis": "prd", "ada": True, "nomor": "9.1", "inti": True},
    {"id": "t9-b", "judul": "Konsep uji", "tahap": N, "path": "tahap-9/b.md", "jenis": "konsep", "ada": True, "nomor": "9.2", "inti": True, "lab": ["lab-x"]},
    {"id": "t9-c", "judul": "ADR uji", "tahap": N, "path": "tahap-9/c.md", "jenis": "adr", "ada": True, "nomor": "9.3"},
    {"id": "T10", "judul": "Tahap 10 · Ceritanya", "tahap": 10, "path": "cerita/tahap-10.md", "ada": True, "diganti_oleh": "t10-prd"},
    {"id": "t10-prd", "judul": "PRD 10", "tahap": 10, "path": "tahap-10/prd.md", "ada": False, "nomor": "10.1"},
]}

ADR = """---
title: "9.3 ADR uji"
---
<Blok nama="Putuskan">

### ADR 99: pilihan uji

| | A. Satu | B. Dua | C. Tiga |
| --- | --- | --- | --- |
| Cara kerja | x | y | z |

**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:

1. Penyebab satu.
2. Penyebab dua.
3. Penyebab tiga.

Sumber: [dokumentasi](https://example.com/dokumen).

</Blok>
<Blok nama="Kapan keputusan ini salah">

Kapan keputusan ini salah: saat beban naik.

</Blok>
"""

KONSEP = """---
title: "9.2 Konsep uji"
---
<Blok nama="Coba">

<WidgetLama nama="alur" src="data/uji-alur.json" />

</Blok>
"""

WIDGET = {"predict": {"options": ["Rp25.000", "Rp0: bocor"], "answer": 1}}


def halaman_html(isi, berikut, akhir=None):
    """Kerangka halaman hasil build: tombol Berikutnya, tautan akhir blok, dan blok Coba."""
    tombol = f'<a href="{berikut}" class="bb-lanjut__next" rel="next">Berikutnya</a>' if berikut else ""
    ak = f'<a class="blok__lanjut" href="{akhir or berikut}" data-akhir>Berikutnya</a>' if berikut else ""
    return f'<html><body><main>{isi}<h2 id="blok-coba-sendiri" class="blok__judul">Coba</h2>{ak}</main>{tombol}</body></html>'


def tulis(akar, rel, teks):
    f = akar / rel
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(teks, encoding="utf-8")


def bangun(akar, registry=None):
    tulis(akar, "plan/CERITA-TAHAP-9.md", NASKAH)
    tulis(akar, "situs/data/cerita.json", json.dumps(registry or REGISTRY))
    tulis(akar, "situs/src/content/docs/tahap-9/a.mdx", "---\ntitle: a\n---\nPRD.\n")
    tulis(akar, "situs/src/content/docs/tahap-9/b.mdx", KONSEP)
    tulis(akar, "situs/src/content/docs/tahap-9/c.mdx", ADR)
    tulis(akar, "situs/public/widgets/data/uji-alur.json", json.dumps(WIDGET))
    tulis(akar, "situs/dist/tahap-9/a/index.html", halaman_html("Halaman a", "/tahap-9/b/"))
    tulis(akar, "situs/dist/tahap-9/b/index.html", halaman_html("Halaman b memuat Rp0", "/tahap-9/c/"))
    tulis(akar, "situs/dist/tahap-9/c/index.html", halaman_html("Halaman c", "/cerita/tahap-10/"))
    tulis(akar, "situs/dist/cerita/tahap-10/index.html", halaman_html("Ceritanya", "/tahap-9/a/"))


def ganti(akar, rel, cari, baru, semua=False):
    f = akar / rel
    teks = f.read_text(encoding="utf-8")
    assert cari in teks, f"kasus uji rusak: {cari!r} tidak ada di {rel}"
    f.write_text(teks.replace(cari, baru) if semua else teks.replace(cari, baru, 1), encoding="utf-8")


def registry_ubah(akar, fn):
    f = akar / "situs/data/cerita.json"
    d = json.loads(f.read_text(encoding="utf-8"))
    fn(d)
    f.write_text(json.dumps(d), encoding="utf-8")


def hapus(akar, rel):
    (akar / rel).unlink()


def jalankan(akar, perintah):
    env = dict(os.environ, EVAL_AKAR=str(akar))
    p = subprocess.run([sys.executable, str(ALAT), perintah, str(N)], capture_output=True, text=True, env=env)
    return p.returncode, p.stdout + p.stderr


def tandai(d, id_, **kv):
    for h in d["halaman"]:
        if h["id"] == id_:
            h.update(kv)


ADR_PM = "**Pre-mortem.** Bayangkan keputusan ini gagal 6 bulan lagi. Tiga penyebab yang paling mungkin:"

KASUS = [
    # nama, perintah, mutasi(akar) atau None, exit yang diharapkan, kata wajib di keluaran
    ("peta: dasar", "peta", None, 0, ["naskah 3 halaman, registry 3 halaman"]),
    ("peta: halaman masih segera", "peta", lambda a: registry_ubah(a, lambda d: tandai(d, "t9-b", ada=False)), 1, ["CATATAN: segera"]),
    ("peta: bintang beda dari naskah", "peta", lambda a: registry_ubah(a, lambda d: tandai(d, "t9-a", inti=False)), 1, ["bintang beda"]),
    ("peta: lab beda dari naskah", "peta", lambda a: registry_ubah(a, lambda d: tandai(d, "t9-b", lab=[])), 1, ["lab beda"]),
    ("peta: halaman naskah tidak ada di registry", "peta", lambda a: registry_ubah(a, lambda d: d["halaman"].pop(2)), 1, ["9.3 SELISIH: tidak ada di registry"]),
    ("adr: dasar", "adr", None, 0, ["opsi 3 | pre-mortem True (3 penyebab)"]),
    ("adr: hanya dua opsi", "adr", lambda a: ganti(a, "situs/src/content/docs/tahap-9/c.mdx", " | C. Tiga |", " |"), 1, ["KURANG"]),
    ("adr: tanpa pre-mortem", "adr", lambda a: ganti(a, "situs/src/content/docs/tahap-9/c.mdx", ADR_PM, "Bagian lain:"), 1, ["pre-mortem False"]),
    ("adr: pre-mortem dengan dua penyebab", "adr", lambda a: ganti(a, "situs/src/content/docs/tahap-9/c.mdx", "3. Penyebab tiga.\n", ""), 1, ["(2 penyebab)"]),
    ("adr: pre-mortem dengan empat penyebab", "adr", lambda a: ganti(a, "situs/src/content/docs/tahap-9/c.mdx", "3. Penyebab tiga.\n", "3. Penyebab tiga.\n4. Empat.\n"), 1, ["(4 penyebab)"]),
    ("adr: tanpa kapan salah", "adr", lambda a: ganti(a, "situs/src/content/docs/tahap-9/c.mdx", "Kapan keputusan ini salah", "Lain", semua=True), 1, ["kapan salah False"]),
    ("adr: tanpa tautan sumber", "adr", lambda a: ganti(a, "situs/src/content/docs/tahap-9/c.mdx", "https://example.com/dokumen", "dokumen"), 1, ["tautan sumber di halaman 0"]),
    ("rantai: dasar", "rantai", None, 0, ["langkah dari 9.1 sampai 9.3: 3; 404 atau tautan hilang: 0"]),
    ("rantai: halaman tengah tidak punya Berikutnya", "rantai", lambda a: tulis(a, "situs/dist/tahap-9/b/index.html", halaman_html("b", None)), 1, ["Berikutnya -> TIDAK ADA"]),
    ("rantai: Berikutnya melompati satu halaman", "rantai", lambda a: tulis(a, "situs/dist/tahap-9/a/index.html", halaman_html("a", "/tahap-9/c/")), 1, ["URUTAN SALAH"]),
    ("rantai: tautan menuju halaman yang tidak ada di dist", "rantai", lambda a: hapus(a, "situs/dist/tahap-9/b/index.html"), 1, ["404"]),
    ("rantai: tautan akhir blok berbeda dari tombol", "rantai", lambda a: tulis(a, "situs/dist/tahap-9/a/index.html", halaman_html("a", "/tahap-9/b/", akhir="/tahap-9/c/")), 1, ["TAUTAN AKHIR BLOK BEDA"]),
    ("rantai: jembatan menuju halaman lama yang penggantinya sudah ada", "rantai",
     lambda a: registry_ubah(a, lambda d: tandai(d, "t10-prd", ada=True)), 1, ["halaman lama (penggantinya ada)=True"]),
    ("rantai: jembatan menuju halaman yang tidak ada", "rantai", lambda a: hapus(a, "situs/dist/cerita/tahap-10/index.html"), 1, ["ada=False"]),
    ("rantai: berhenti sebelum halaman terakhir", "rantai", lambda a: tulis(a, "situs/dist/tahap-9/b/index.html", halaman_html("b", "/tahap-9/a/")), 1, ["rantai berhenti atau berputar"]),
    ("bocor: jawaban tebakan sudah tertulis sebelum blok Coba", "bocor", None, 0, ["tertulis sebelum blok Coba: ['Rp0']"]),
    ("bocor: jawaban tidak tertulis sebelum blok Coba", "bocor",
     lambda a: tulis(a, "situs/dist/tahap-9/b/index.html", halaman_html("Halaman b tanpa angka jawaban", "/tahap-9/c/")), 0, ["tertulis sebelum blok Coba: []"]),
]

gagal = 0
for nama, perintah, mutasi, harap, wajib in KASUS:
    with tempfile.TemporaryDirectory() as t:
        akar = pathlib.Path(t)
        bangun(akar)
        if mutasi:
            mutasi(akar)
        kode, keluar = jalankan(akar, perintah)
    hilang = [w for w in wajib if w not in keluar]
    ok = kode == harap and not hilang
    gagal += not ok
    print(f"{'OK  ' if ok else 'GAGAL'} exit {kode} (harap {harap}) {nama}"
          + (f"; tidak ada di keluaran: {hilang}\n{keluar[-700:]}" if not ok else ""))
print(f"{len(KASUS) - gagal}/{len(KASUS)} kasus uji eval_tahap lolos")
sys.exit(1 if gagal else 0)
