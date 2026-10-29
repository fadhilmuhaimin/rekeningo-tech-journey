"""Uji tools/audit_bahasa.py: pengecualian nama kode `berkas_x` dan `berkas-x` tidak melemahkan aturan "berkas (file)".

Rekaman lab yang dikutip utuh di data widget memuat `berkas_bytea`, `berkas-bytea`, dan `berkas_kartu_kunci` (4.14,
keputusan 1320). Pengecualiannya hanya untuk file data (JSON, SVG) dan hanya untuk nama kode: kata "berkas" di prosa
Markdown, di prosa JSON, dan bentuk jamak "berkas-berkas" tetap ERROR. Tiap kasus menulis file sementara di tmp/ dalam
repo (audit memakai path relatif terhadap akar repo) lalu menjalankan scan() dan check() yang sama dengan gerbang.

    python3 tools/test_audit_bahasa.py
"""
import contextlib
import importlib.util
import io
import pathlib
import sys
import tempfile

AKAR = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("audit_bahasa", AKAR / "tools" / "audit_bahasa.py")
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)

KUNCI = "berkas (file)"

# (nama, ekstensi, isi, harap_ditandai). Isi MDX memakai skip_code=True seperti check(); JSON memakai skip_code=False.
KASUS = [
    # Prosa Markdown: tidak ada pengecualian, nama kode ditulis dalam backtick.
    ("mdx: kata berkas di prosa", ".mdx", "Simpan berkas di bucket.\n", True),
    ("mdx: berkas huruf besar", ".mdx", "Berkas itu besar.\n", True),
    ("mdx: berkas_bytea tanpa backtick di prosa", ".mdx", "Tabel berkas_bytea menyimpan isinya.\n", True),
    ("mdx: berkas-bytea tanpa backtick di prosa", ".mdx", "Mode lab berkas-bytea dipakai.\n", True),
    ("mdx: nama kode dalam backtick", ".mdx", "Tabel `berkas_bytea` menyimpan isinya.\n", False),
    ("mdx: nama kode dalam blok kode", ".mdx", "```\nSELECT 1 FROM berkas_bytea\n```\n", False),
    # Data JSON: nama kode dikecualikan, kata "berkas" tidak.
    ("json: kata berkas di prosa", ".json", '{"teks": "Simpan berkas di bucket."}\n', True),
    ("json: bentuk jamak berkas-berkas", ".json", '{"teks": "Semua berkas-berkas dicadangkan."}\n', True),
    ("json: berkas-berkas huruf besar", ".json", '{"teks": "Berkas-berkas itu besar."}\n', True),
    ("json: berkasnya", ".json", '{"teks": "berkasnya besar"}\n', True),
    ("json: per-berkas", ".json", '{"teks": "dihitung per-berkas"}\n', True),
    ("json: berkas_ tanpa nama sesudahnya", ".json", '{"teks": "kolom berkas_ kosong"}\n', True),
    ("json: berkas- tanpa nama sesudahnya", ".json", '{"teks": "lihat berkas- itu"}\n', True),
    ("json: berkas_ diikuti angka", ".json", '{"teks": "tabel berkas_2024"}\n', True),
    ("json: berkas di samping nama kode", ".json", '{"teks": "berkas_bytea adalah berkas besar"}\n', True),
    ("json: nama tabel berkas_bytea", ".json", '{"kirim": "SELECT count(*) FROM berkas_bytea"}\n', False),
    ("json: mode lab berkas-bytea", ".json", '{"kirim": "./api-t4 -lab -rentan berkas-bytea"}\n', False),
    ("json: kolom berkas_kartu_kunci", ".json", '{"kirim": "min(length(berkas_kartu_kunci))"}\n', False),
    ("json: berkas-rusak (kode kesalahan)", ".json", '{"kirim": "500 berkas-rusak"}\n', False),
]


def ditandai(ekstensi, isi):
    """True bila scan() menandai aturan 'berkas (file)' untuk isi ini, memakai cara check() memanggilnya."""
    (AKAR / "tmp").mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(dir=AKAR / "tmp") as d:
        f = pathlib.Path(d) / f"uji{ekstensi}"
        f.write_text(isi, encoding="utf-8")
        hits = audit.scan([f], skip_code=ekstensi in audit.HALAMAN)
        return bool(hits.get(KUNCI))


def keluar_check(ekstensi, isi):
    """Kode keluar check() atas file sementara: 1 bila ada ERROR."""
    (AKAR / "tmp").mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(dir=AKAR / "tmp") as d:
        f = pathlib.Path(d) / f"uji{ekstensi}"
        f.write_text(isi, encoding="utf-8")
        with contextlib.redirect_stdout(io.StringIO()):
            return audit.check([str(f)])


gagal = 0
total = 0
for nama, ekstensi, isi, harap in KASUS:
    total += 1
    ada = ditandai(ekstensi, isi)
    ok = ada == harap
    gagal += not ok
    print(f"{'OK   ' if ok else 'GAGAL'} {nama}: ditandai={ada} (harap {harap})")

# check() mengubah hasil menjadi exit 1 hanya untuk kata di prosa; nama kode di data tidak membuat gerbang gagal.
for nama, ekstensi, isi, harap_exit in [
    ("check(): prosa JSON dengan berkas gagal", ".json", '{"teks": "Simpan berkas di bucket."}\n', 1),
    ("check(): nama kode di JSON lolos", ".json", '{"kirim": "FROM berkas_bytea"}\n', 0),
]:
    total += 1
    kode = keluar_check(ekstensi, isi)
    ok = kode == harap_exit
    gagal += not ok
    print(f"{'OK   ' if ok else 'GAGAL'} {nama}: exit {kode} (harap {harap_exit})")

# Aturan lain tidak berubah: tiap aturan selain 'berkas (file)' tetap ditandai di prosa dan di data.
LAIN = [("klien (client)", "Klien memanggil API."), ("pemakai/pengguna (user)", "Pemakai membuka app.")]
for kunci, kalimat in LAIN:
    for ekstensi, isi in ((".mdx", kalimat + "\n"), (".json", '{"teks": "%s"}\n' % kalimat)):
        total += 1
        (AKAR / "tmp").mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=AKAR / "tmp") as d:
            f = pathlib.Path(d) / f"uji{ekstensi}"
            f.write_text(isi, encoding="utf-8")
            ada = bool(audit.scan([f], skip_code=ekstensi in audit.HALAMAN).get(kunci))
        gagal += not ada
        print(f"{'OK   ' if ada else 'GAGAL'} aturan {kunci} tetap menandai {ekstensi}: {ada}")

# Pengecualian hanya milik aturan 'berkas (file)'.
total += 1
ok = list(audit.NAMA_KODE_DATA) == [KUNCI]
gagal += not ok
print(f"{'OK   ' if ok else 'GAGAL'} NAMA_KODE_DATA hanya memuat {KUNCI!r}: {list(audit.NAMA_KODE_DATA)}")

print(f"{total - gagal}/{total} kasus uji audit bahasa lolos")
sys.exit(1 if gagal else 0)
