"""Uji tools/lipat_masuk.py di folder sementara (keputusan 564, 724 pengatur): argumen asing tidak melipat,
nomor ganda ditolak, lipat mengurutkan baris dan menghapus file masuk. Pakai: python3 tools/test_lipat_masuk.py"""
import os
import subprocess
import sys
import tempfile

ALAT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lipat_masuk.py")
KEP = "| # | Tanggal | Keputusan | Kenapa | Alternatif |\n| --- | --- | --- | --- | --- |\n| 1 | 2026-10-01 | a | b | c |\n| 3 | 2026-10-01 | a | b | c |\n"


def siapkan(masuk):
    d = tempfile.mkdtemp()
    os.makedirs(os.path.join(d, "plan", "masuk"))
    open(os.path.join(d, "plan", "KEPUTUSAN.md"), "w").write(KEP)
    for nama, isi in masuk.items():
        open(os.path.join(d, "plan", "masuk", nama), "w").write(isi)
    return d


def jalan(d, *arg):
    return subprocess.run([sys.executable, ALAT, *arg], cwd=d, capture_output=True, text=True)


def baris(n):
    return f"| {n} | 2026-10-24 | x | y | z |"


gagal = []


def periksa(nama, kondisi):
    print(("ok " if kondisi else "GAGAL ") + nama)
    if not kondisi:
        gagal.append(nama)


d = siapkan({"a.md": f"## KEPUTUSAN\n\n{baris(2)}\n"})
r = jalan(d, "--bantuan")
periksa("argumen asing: exit 2", r.returncode == 2)
periksa("argumen asing: file masuk tetap ada", os.path.exists(os.path.join(d, "plan", "masuk", "a.md")))
periksa("argumen asing: KEPUTUSAN tidak berubah", open(os.path.join(d, "plan", "KEPUTUSAN.md")).read() == KEP)
r = jalan(d, "--help")
periksa("--help: exit 0 dan tidak melipat", r.returncode == 0 and os.path.exists(os.path.join(d, "plan", "masuk", "a.md")))

d = siapkan({"a.md": f"## KEPUTUSAN\n\n{baris(9)}\n", "b.md": f"## KEPUTUSAN\n\n{baris(9)}\n"})
periksa("nomor ganda antar file ditolak", jalan(d, "--cek").returncode == 1)

d = siapkan({"a.md": f"## KEPUTUSAN\n\n{baris(3)}\n"})
periksa("nomor sudah ada di KEPUTUSAN ditolak", jalan(d, "--cek").returncode == 1)

d = siapkan({"a.md": f"## KEPUTUSAN\n\n{baris(9)}\n{baris(2)}\n\n## SETELAH-TAHAP-2\n\n- polesan satu\n"})
r = jalan(d)
isi = open(os.path.join(d, "plan", "KEPUTUSAN.md")).read()
nomor = [int(x.split("|")[1]) for x in isi.split("\n") if x.startswith("| ") and x.split("|")[1].strip().isdigit()]
periksa("lipat: exit 0", r.returncode == 0)
periksa("lipat: baris berurutan", nomor == sorted(nomor) and nomor == [1, 2, 3, 9])
periksa("lipat: file masuk dihapus", not os.path.exists(os.path.join(d, "plan", "masuk", "a.md")))
periksa("lipat: polesan masuk SETELAH-TAHAP-2", "polesan satu" in open(os.path.join(d, "plan", "SETELAH-TAHAP-2.md")).read())

d = siapkan({"a.md": f"## KEPUTUSAN\n\nbukan baris tabel\n"})
periksa("format salah ditolak", jalan(d, "--cek").returncode == 1)

d = siapkan({"a.md": "## KEPUTUSAN\n\n| 9 | 2026-10-24 | x | y | z | sumber |\n"})
r = jalan(d, "--cek")
periksa("enam kolom ditolak (kolom Sumber ekstra)", r.returncode == 1 and "tepat 5 kolom" in r.stdout)

d = siapkan({"a.md": "## KEPUTUSAN\n\n| 9 | 2026-10-24 | pakai a\\|b | y | z |\n"})
periksa("pipe ber-escape di teks diterima", jalan(d, "--cek").returncode == 0)

print(f"# {'GAGAL ' + str(len(gagal)) if gagal else 'lolos'}")
sys.exit(1 if gagal else 0)
