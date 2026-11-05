"""Uji (keputusan 1761): Tahap 6 hanya ada di `proyeksi` registry, tanpa `asumsi`, dan sinkron_cerita.py harus tetap jalan.

Dua hal yang diuji dan keduanya pernah salah sebelum perbaikan:
  1. cek_angka melempar KeyError 6 untuk baris tabel berlabel "(Tahap 6)" atau halaman bertanda tahap={6}, karena
     `nilai` hanya punya kunci tahap yang punya `asumsi`. Sekarang baris itu dilewati, dan tahap yang punya `asumsi`
     tetap diperiksa (kasus kontrol: angka Tahap 5 yang salah tetap dilaporkan).
  2. Tabel daftar-tahap halaman Cerita Tahap 6 tidak pernah disinkronkan, karena yang diiterasi hanya `tahap`.
     Uji ujung ke ujung memakai salinan alat, registry, dan halaman di tmp/: satu sel tabel diubah, dan --check harus
     gagal dengan menyebut cerita/tahap-6.mdx.

Salinan ditulis ke tmp/ (tidak di-commit); repo tidak diubah.

    python3 tools/test_sinkron_cerita.py
"""
import importlib
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

AKAR = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(AKAR / "tools"))
gagal = []


def periksa(nama, kondisi, rinci=""):
    print(("ok " if kondisi else "GAGAL ") + nama + ("" if kondisi or not rinci else f"\n    {rinci}"))
    if not kondisi:
        gagal.append(nama)


def uji_ujung_ke_ujung(kerja):
    salinan = kerja / "salinan"
    (salinan / "situs/data").mkdir(parents=True)
    shutil.copytree(AKAR / "tools", salinan / "tools", ignore=shutil.ignore_patterns("__pycache__"))
    shutil.copy(AKAR / "situs/data/cerita.json", salinan / "situs/data/cerita.json")
    shutil.copytree(AKAR / "situs/src/content/docs", salinan / "situs/src/content/docs")
    shutil.copytree(AKAR / "situs/lama/widgets/data", salinan / "situs/lama/widgets/data")
    halaman = salinan / "situs/src/content/docs/cerita/tahap-6.mdx"
    periksa("halaman Cerita Tahap 6 ada", halaman.exists())
    if not halaman.exists():
        return

    def cek():
        return subprocess.run([sys.executable, "tools/sinkron_cerita.py", "--check"], cwd=salinan, capture_output=True, text=True)

    r = cek()
    periksa("salinan apa adanya: --check lolos", r.returncode == 0, r.stdout[-300:] + r.stderr[-300:])
    asli = halaman.read_text(encoding="utf-8")
    m = re.search(r"\{/\* daftar-tahap \*/\}\n(.*?)\n\{/\* /daftar-tahap \*/\}", asli, re.S)
    periksa("halaman punya penanda daftar-tahap", m is not None)
    if not m:
        return
    baris = m.group(1).split("\n")
    periksa("tabel daftar-tahap memuat 12 halaman Tahap 6", len(baris) - 2 == 12, f"baris: {len(baris)}")
    # Mutasi 1: satu sel diubah; --check harus gagal dan menyebut halamannya.
    halaman.write_text(asli.replace(baris[2], baris[2].replace("|", "| Ubahan |", 1), 1), encoding="utf-8")
    r = cek()
    periksa("satu baris tabel diubah: --check gagal", r.returncode == 1, r.stdout[-300:])
    periksa("pesan menyebut cerita/tahap-6.mdx", "belum sinkron: situs/src/content/docs/cerita/tahap-6.mdx" in r.stdout, r.stdout[-300:])
    # Mutasi 2: baris tabel dihapus; proyeksi yang tidak diiterasi akan menerimanya begitu saja.
    halaman.write_text(asli.replace("\n".join(baris[2:]), ""), encoding="utf-8")
    r = cek()
    periksa("baris tabel dihapus: --check gagal", r.returncode == 1, r.stdout[-300:])
    halaman.write_text(asli, encoding="utf-8")
    # Kontrol: tabel tahap biasa tetap disinkronkan (iterasi proyeksi menambah, bukan menggantikan, iterasi `tahap`).
    t5 = salinan / "situs/src/content/docs/cerita/tahap-5.mdx"
    asli5 = t5.read_text(encoding="utf-8")
    m5 = re.search(r"\{/\* daftar-tahap \*/\}\n(.*?)\n\{/\* /daftar-tahap \*/\}", asli5, re.S)
    baris5 = m5.group(1).split("\n")
    t5.write_text(asli5.replace(baris5[2], baris5[2].replace("|", "| Ubahan |", 1), 1), encoding="utf-8")
    r = cek()
    periksa("tabel Tahap 5 diubah: --check gagal dan menyebut cerita/tahap-5.mdx",
            r.returncode == 1 and "belum sinkron: situs/src/content/docs/cerita/tahap-5.mdx" in r.stdout, r.stdout[-300:])
    t5.write_text(asli5, encoding="utf-8")


(AKAR / "tmp").mkdir(exist_ok=True)
kerja = pathlib.Path(tempfile.mkdtemp(prefix="sinkron-t6-", dir=AKAR / "tmp"))
try:
    # ---- 1. cek_angka ----------------------------------------------------------------------------------------------
    sc = importlib.import_module("sinkron_cerita")
    tahap5 = {"no": 5, "asumsi": {"user": 1000000, "aktif": 20, "req": 60, "puncak": 10, "trx": 2, "baris": 300}}

    def hasil(isi):
        p = kerja / "halaman.mdx"
        p.write_text(isi, encoding="utf-8")
        sc.file_konten = lambda: [p]
        sc.ROOT = kerja
        return sc.cek_angka([tahap5])

    for nama, isi in (
        ("baris berlabel (Tahap 6)", "| Besaran | Nilai |\n|---|---|\n| Puncak request per detik (Tahap 6) | 13.888,9 |\n"),
        ("halaman bertanda tahap={6}", "<Widget tahap={6} />\n\n| Besaran | Nilai |\n|---|---|\n| User terdaftar | 10.000.000 |\n"),
    ):
        try:
            r = hasil(isi)
            periksa(f"{nama} dilewati tanpa KeyError", r == [], f"hasil: {r}")
        except KeyError as e:
            periksa(f"{nama} dilewati tanpa KeyError", False, f"KeyError {e}")
    r = hasil("| Besaran | Nilai |\n|---|---|\n| User terdaftar (Tahap 5) | 1.000.000 |\n")
    periksa("kontrol: angka Tahap 5 yang benar lolos", r == [], f"hasil: {r}")
    r = hasil("| Besaran | Nilai |\n|---|---|\n| User terdaftar (Tahap 5) | 999.999.999 |\n")
    periksa("kontrol: angka Tahap 5 yang salah tetap dilaporkan", len(r) == 1 and "Tahap 5" in r[0], f"hasil: {r}")

    # ---- 2. daftar-tahap Tahap 6 ujung ke ujung ----------------------------------------------------------------------
    uji_ujung_ke_ujung(kerja)
finally:
    shutil.rmtree(kerja, ignore_errors=True)

print(f"# {'GAGAL ' + str(len(gagal)) if gagal else 'lolos'}")
sys.exit(1 if gagal else 0)
