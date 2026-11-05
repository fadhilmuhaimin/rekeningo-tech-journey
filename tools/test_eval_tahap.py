"""Uji tools/eval_tahap.py dengan salinan repo kecil yang diubah: pelanggaran harus menggagalkan, bukan lolos palsu (EVAL-3).

`eval_tahap.py` menjadi bukti W1, W3, W6, dan W8 di kartu evaluasi; `rantai` dan `gejala` untuk tahap yang lengkap ada
di gerbang (keputusan 1164, 1696). Sebelum uji ini, hanya satu mutasi `rantai` yang pernah dicoba tangan (EVAL-2 putaran 2).
Di sini repo kecil Tahap 9 ditulis ke direktori sementara (naskah, registry, MDX, situs/dist, data widget) dan dibaca
lewat EVAL_AKAR. Kasus dasar harus lolos di semua perintah; tiap mutasi mengubah satu hal dan perintahnya harus gagal
(exit 1) dengan kata kunci di keluaran. Mutasi rantai mencakup tautan Berikutnya (hilang, melompat, ke tahap lain, 404, tautan
akhir blok beda, jembatan) dan registry (nomor tertukar, prasyarat menunjuk halaman yang dilalui sesudahnya). Bagian
terakhir memeriksa bahwa `tools/cek_situs.sh` benar-benar memanggil perintah itu untuk Tahap 1 sampai 5.

    python3 tools/test_eval_tahap.py
"""
import json
import os
import pathlib
import re
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
    {"id": "t9-b", "judul": "Konsep uji", "tahap": N, "path": "tahap-9/b.md", "jenis": "konsep", "ada": True, "nomor": "9.2", "inti": True, "lab": ["lab-x"], "prasyarat": ["t9-a"]},
    {"id": "t9-c", "judul": "ADR uji", "tahap": N, "path": "tahap-9/c.md", "jenis": "adr", "ada": True, "nomor": "9.3", "prasyarat": ["t9-b"]},
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
    argumen = [] if perintah == "lengkap" else [str(N)]  # `lengkap` tidak menerima nomor tahap
    p = subprocess.run([sys.executable, str(ALAT), perintah, *argumen], capture_output=True, text=True, env=env)
    return p.returncode, p.stdout + p.stderr


GEJALA = """---
title: "9.2 M99: masalah uji"
---
<Blok nama="Gejala" buka>

Minggu 4. Budi membuka app dan saldonya tidak muncul.

{tambah}Ani bertanya kepada Raka kenapa layarnya berputar.

*Angka cerita (Ilustrasi):* sembilan menit adalah angka naskah, tanpa rekaman.

Arti label Rekaman lab ada di [[A0]], yaitu keluaran program.

</Blok>
"""


def masalah(akar, tambah=""):
    registry_ubah(akar, lambda d: tandai(d, "t9-b", jenis="masalah"))
    tulis(akar, "situs/src/content/docs/tahap-9/b.mdx", GEJALA.format(tambah=tambah))


def tandai(d, id_, **kv):
    for h in d["halaman"]:
        if h["id"] == id_:
            h.update(kv)


def tahap10_ada(akar, tautan_c):
    """Halaman 10.1 sudah ditulis (`ada`), halaman lama Tahap 10 tidak lagi menunjuk penggantinya, dan Berikutnya dari 9.3 menuju `tautan_c`."""
    def u(d):
        tandai(d, "t10-prd", ada=True)
        for h in d["halaman"]:
            h.pop("diganti_oleh", None)
    registry_ubah(akar, u)
    tulis(akar, "situs/dist/tahap-10/prd/index.html", halaman_html("PRD 10", "/tahap-9/a/"))
    tulis(akar, "situs/dist/tahap-9/c/index.html", halaman_html("Halaman c", tautan_c))


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
    ("rantai: Berikutnya di tengah menuju halaman tahap lain", "rantai", lambda a: tulis(a, "situs/dist/tahap-9/a/index.html", halaman_html("a", "/cerita/tahap-10/")), 1, ["URUTAN SALAH"]),
    ("rantai: nomor dua halaman tertukar di registry", "rantai",
     lambda a: registry_ubah(a, lambda d: (tandai(d, "t9-b", nomor="9.3"), tandai(d, "t9-c", nomor="9.2"))), 1, ["URUTAN SALAH"]),
    ("rantai: prasyarat menunjuk halaman yang baru dilalui sesudahnya", "rantai",
     lambda a: registry_ubah(a, lambda d: tandai(d, "t9-b", prasyarat=["t9-c"])), 1, ["PRASYARAT BELUM DILALUI: 9.2 menyebut prasyarat 9.3"]),
    ("rantai: prasyarat menunjuk halaman itu sendiri", "rantai",
     lambda a: registry_ubah(a, lambda d: tandai(d, "t9-b", prasyarat=["t9-b"])), 1, ["PRASYARAT BELUM DILALUI: 9.2 menyebut prasyarat 9.2"]),
    ("rantai: prasyarat di tahap lain tidak dihitung", "rantai",
     lambda a: registry_ubah(a, lambda d: tandai(d, "t9-b", prasyarat=["t10-prd"])), 0, ["langkah dari 9.1 sampai 9.3: 3; 404 atau tautan hilang: 0"]),
    ("rantai: prasyarat tak dikenal bukan urusan rantai (sinkron_cerita.py menolaknya)", "rantai",
     lambda a: registry_ubah(a, lambda d: tandai(d, "t9-b", prasyarat=["tidak-ada"])), 0, ["langkah dari 9.1 sampai 9.3: 3; 404 atau tautan hilang: 0"]),
    ("rantai: jembatan menuju halaman pertama tahap berikutnya yang sudah ada", "rantai",
     lambda a: tahap10_ada(a, "/tahap-10/prd/"), 0, ["langkah dari 9.1 sampai 9.3: 3; 404 atau tautan hilang: 0"]),
    ("rantai: jembatan menuju halaman lain padahal halaman pertama tahap berikutnya sudah ada", "rantai",
     lambda a: tahap10_ada(a, "/cerita/tahap-10/"), 1, ["JEMBATAN TIDAK MENUJU 10.1"]),
    ("lengkap: tahap 9 lengkap, tahap 10 baru sebagian", "lengkap", None, 0, ["tahap lengkap: 9 | tahap sebagian: 10 (0 dari 1 halaman ada)"]),
    ("lengkap: satu halaman tahap 9 masih segera, tahap 9 tidak dilaporkan lengkap", "lengkap",
     lambda a: registry_ubah(a, lambda d: tandai(d, "t9-b", ada=False)), 0, ["tahap lengkap: - | tahap sebagian: 9 (2 dari 3 halaman ada), 10 (0 dari 1 halaman ada)"]),
    ("lengkap: tahap 10 ikut begitu semua halaman bernomornya ada", "lengkap",
     lambda a: registry_ubah(a, lambda d: tandai(d, "t10-prd", ada=True)), 0, ["tahap lengkap: 9 10 | tahap sebagian: -"]),
    ("gejala: adegan bersih, catatan label dengan kata penanda dilewati", "gejala", lambda a: masalah(a), 0, ["9.2 | Konsep uji | 2 paragraf adegan", "| ok"]),
    ("gejala: kalimat definisi di dalam adegan", "gejala", lambda a: masalah(a, "Pemeriksaan password adalah saat server membandingkan hash.\n\n"), 1, ["DEFINISI: Pemeriksaan password adalah"]),
    ("gejala: halaman bukan masalah tidak diperiksa", "gejala", lambda a: (masalah(a, "Pemeriksaan password adalah saat server membandingkan hash.\n\n"), registry_ubah(a, lambda d: tandai(d, "t9-b", jenis="konsep"))), 0, ["| ok"] if False else []),
    ("gejala: halaman masalah tanpa blok Gejala tidak lolos diam-diam", "gejala",
     lambda a: (masalah(a), ganti(a, "situs/src/content/docs/tahap-9/b.mdx", 'nama="Gejala"', 'nama="Kejadian"')), 1, ["TANPA BLOK Gejala"]),
    ("gejala: penanda yaitu di dalam adegan", "gejala", lambda a: masalah(a, "Timeout, yaitu batas waktu tunggu, lewat.\n\n"), 1, ["DEFINISI: Timeout, yaitu"]),
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


def periksa_gerbang(teks):
    """Kekurangan di tools/cek_situs.sh: tanpa ini semua kasus di atas lolos walau gerbang kembali ke `for T in 1 2 3`."""
    salah = []
    m = re.search(r'^\s*TAHAP_WAJIB="([0-9 ]+)"$', teks, re.M)
    if not m or not {"1", "2", "3", "4", "5"} <= set(m.group(1).split()):
        salah.append("TAHAP_WAJIB tidak memuat Tahap 1 sampai 5")
    if "$($PY tools/eval_tahap.py lengkap)" not in teks:
        salah.append("gerbang tidak menjalankan eval_tahap.py lengkap")
    if not re.search(r'for T in \$TAHAP_WAJIB; do\n[^\n]*case " \$TAHAP_LENGKAP " in [^\n]*exit 1', teks):
        salah.append("gerbang tidak menolak Tahap wajib yang tidak lengkap")
    loop = re.findall(r'for T in \$TAHAP_LENGKAP; do\n(.*?)\n  done', teks, re.S)
    gagal_keras = {"rantai": 'echo "GAGAL: rantai Berikutnya Tahap $T"; exit 1', "gejala": 'echo "GAGAL: gejala Tahap $T"; exit 1'}
    for perintah, penutup in gagal_keras.items():
        if not any(f'$PY tools/eval_tahap.py {perintah} "$T"' in b and penutup in b for b in loop):
            salah.append(f"gerbang tidak menjalankan eval_tahap.py {perintah} untuk tiap tahap lengkap dan gagal keras bila ada yang salah")
    return salah


GERBANG = pathlib.Path(__file__).resolve().parent / "cek_situs.sh"
teks_gerbang = GERBANG.read_text(encoding="utf-8")
# nama, teks gerbang setelah mutasi (None = apa adanya), apakah periksa_gerbang harus menemukan kekurangan
MUTASI_GERBANG = [
    ("gerbang: apa adanya", None, False),
    ("gerbang: Tahap 5 hilang dari daftar wajib", teks_gerbang.replace('TAHAP_WAJIB="1 2 3 4 5"', 'TAHAP_WAJIB="1 2 3 4"'), True),
    ("gerbang: Tahap 1 hilang dari daftar wajib", teks_gerbang.replace('TAHAP_WAJIB="1 2 3 4 5"', 'TAHAP_WAJIB="2 3 4 5"'), True),
    ("gerbang: daftar lengkap tidak dibaca", teks_gerbang.replace("$($PY tools/eval_tahap.py lengkap)", "1 2 3 4 5"), True),
    ("gerbang: tahap wajib yang tidak lengkap tidak menggagalkan", teks_gerbang.replace("for T in $TAHAP_WAJIB; do", "for T in; do"), True),
    ("gerbang: rantai kembali ke daftar tetap", teks_gerbang.replace("for T in $TAHAP_LENGKAP; do\n    LOG=$(mktemp)\n    if $PY tools/eval_tahap.py rantai", "for T in 1 2 3; do\n    LOG=$(mktemp)\n    if $PY tools/eval_tahap.py rantai"), True),
    ("gerbang: gejala tidak dijalankan", teks_gerbang.replace('$PY tools/eval_tahap.py gejala "$T"', '$PY tools/eval_tahap.py peta "$T"'), True),
    ("gerbang: gejala yang gagal tidak menghentikan gerbang", teks_gerbang.replace('echo "GAGAL: gejala Tahap $T"; exit 1', 'echo "GAGAL: gejala Tahap $T"'), True),
    ("gerbang: rantai yang gagal tidak menghentikan gerbang", teks_gerbang.replace('echo "GAGAL: rantai Berikutnya Tahap $T"; exit 1', 'echo "GAGAL: rantai Berikutnya Tahap $T"'), True),
]
for nama, teks, harap_salah in MUTASI_GERBANG:
    if teks is not None and teks == teks_gerbang:
        print(f"GAGAL kasus uji rusak: mutasi tidak mengubah cek_situs.sh: {nama}")
        gagal += 1
        continue
    salah = periksa_gerbang(teks if teks is not None else teks_gerbang)
    ok = bool(salah) == harap_salah
    gagal += not ok
    print(f"{'OK  ' if ok else 'GAGAL'} {nama}" + (f"; kekurangan: {salah}" if salah and not harap_salah else "" if ok else "; tidak terdeteksi"))
jumlah = len(KASUS) + len(MUTASI_GERBANG)
print(f"{jumlah - gagal}/{jumlah} kasus uji eval_tahap lolos")
sys.exit(1 if gagal else 0)
