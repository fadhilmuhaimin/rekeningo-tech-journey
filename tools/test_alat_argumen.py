"""Uji (keputusan 727): alat yang menulis berkas menolak argumen asing dan --help tidak menulis apa pun.
Insiden: `sinkron_cerita.py --help` dan `lipat_masuk.py --help` pernah menjalankan pekerjaan sungguhan.
Pakai: python3 tools/test_alat_argumen.py"""
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ALAT = ["tools/sinkron_cerita.py", "tools/build_istilah.py"]


def status():
    return subprocess.run(["git", "status", "--porcelain", "--untracked-files=all"], cwd=ROOT, capture_output=True, text=True).stdout


def jalan(alat, arg):
    return subprocess.run([sys.executable, alat, arg], cwd=ROOT, capture_output=True, text=True)


gagal = []


def periksa(nama, kondisi):
    print(("ok " if kondisi else "GAGAL ") + nama)
    if not kondisi:
        gagal.append(nama)


for a in ALAT:
    sebelum = status()
    r = jalan(a, "--bantuan")
    periksa(f"{a} --bantuan: keluar bukan 0", r.returncode != 0)
    periksa(f"{a} --bantuan: tidak mengubah berkas", status() == sebelum)
    r = jalan(a, "--help")
    periksa(f"{a} --help: keluar 0 dan mencetak bantuan", r.returncode == 0 and len(r.stdout.strip()) > 20)
    periksa(f"{a} --help: tidak mengubah berkas", status() == sebelum)

print(f"# {'GAGAL ' + str(len(gagal)) if gagal else 'lolos'}")
sys.exit(1 if gagal else 0)
