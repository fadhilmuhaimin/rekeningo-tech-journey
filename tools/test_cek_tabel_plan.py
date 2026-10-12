"""Uji tools/cek_tabel_plan.py dengan salinan plan/KEPUTUSAN.md yang diubah: pemeriksa harus gagal, bukan lolos palsu.

Kasus pertama dan kedua adalah baris 157 dan 247 sebelum K2c (keputusan 362): `||` di code span tanpa escape
memecah sel (GFM memotong sel berlebih, jadi Kenapa dan Alternatif hilang dari tampilan), dan baris tanpa sel
Tanggal menaruh seluruh isi di kolom Tanggal. Kasus backslash dan baris tanpa pipe pembuka mengikuti perilaku GitHub
yang direkam lewat `gh api markdown`. KEPUTUSAN.md tidak diubah; salinan ditulis ke direktori sementara.

    python3 tools/test_cek_tabel_plan.py
"""
import pathlib
import subprocess
import sys
import tempfile

AKAR = pathlib.Path(__file__).resolve().parent.parent
ASLI = (AKAR / "plan" / "KEPUTUSAN.md").read_text(encoding="utf-8")
BARIS = ASLI.split("\n")


def baris_ke(awal):
    """Nomor baris file (mulai 1) dari baris tabel yang diawali teks ini; tidak dikodekan mati karena tabel tumbuh."""
    cocok = [i for i, b in enumerate(BARIS, 1) if b.startswith(awal)]
    assert len(cocok) == 1, f"{awal!r} harus muncul tepat sekali di awal baris KEPUTUSAN.md"
    return cocok[0]


B157, B247 = baris_ke("| 157 |"), baris_ke("| 247 |")
TERAKHIR = max(i for i, b in enumerate(BARIS, 1) if b.startswith("| ") and b[2:3].isdigit())
NO_TERAKHIR = BARIS[TERAKHIR - 1].split("|")[1].strip()
CARI_157 = "`ILIKE '%'\\|\\|$1\\|\\|'%'`"
AWAL_247 = "| 247 | 2026-10-11 | "


def ganti_di(no, cari, jadi):
    """Ganti teks di satu baris file saja (keputusan lain boleh mengutip teks yang sama)."""
    baris = BARIS[:]
    assert baris[no - 1].count(cari) == 1, f"teks yang diganti harus muncul tepat sekali di baris {no}: {cari[:40]!r}"
    baris[no - 1] = baris[no - 1].replace(cari, jadi)
    return "\n".join(baris)


def sisip_di_akhir(sel):
    """Tambahkan teks ke sel terakhir baris keputusan terakhir (sebelum pipe penutup)."""
    baris = BARIS[:]
    baris[TERAKHIR - 1] = baris[TERAKHIR - 1][:-1].rstrip() + " " + sel + " |"
    return "\n".join(baris)


KASUS = [
    # nama, isi salinan, exit yang diharapkan, teks wajib di baris berawalan GAGAL (atau di keluaran bila exit 0)
    ("KEPUTUSAN.md apa adanya", ASLI, 0, [" 0 gagal"]),
    ("157 sebelum K2c: || di code span tanpa escape",
     ganti_di(B157, CARI_157, "`ILIKE '%'||$1||'%'`"), 1,
     [f":{B157} keputusan 157: 10 pipe tanpa escape, header baris 5 punya 6; tulis |"]),
    ("247 sebelum K2c: tanpa sel Tanggal, Kenapa, Alternatif",
     "\n".join(BARIS[:B247 - 1] + ["| 247 | " + BARIS[B247 - 1][len(AWAL_247):-len(" | |")]] + BARIS[B247:]), 1,
     [f":{B247} keputusan 247: 3 pipe tanpa escape, header baris 5 punya 6; sel kurang"]),
    ("pipe tanpa escape di code span baris terakhir", sisip_di_akhir("`a | b`"), 1,
     [f":{TERAKHIR} keputusan {NO_TERAKHIR}: 7 pipe tanpa escape"]),
    ("pipe dengan escape di code span lolos", sisip_di_akhir("`a \\| b`"), 0, [" 0 gagal"]),
    # Backslash sebelum pipe: GitHub tidak pernah memecah, micromark memecah bila jumlahnya genap (keputusan 362).
    ("backslash genap sebelum pipe ditolak sebagai ambigu", sisip_di_akhir("C:\\\\| D"), 1,
     [f":{TERAKHIR} keputusan {NO_TERAKHIR}: backslash genap sebelum pipe di kolom"]),
    ("backslash ganjil sebelum pipe lolos (kedua renderer: pipe di dalam sel)", sisip_di_akhir("C:\\\\\\| D"), 0,
     [" 0 gagal"]),
    ("baris tanpa pipe pembuka gagal dan baris sesudahnya tetap diperiksa (GFM contoh 202)",
     "\n".join(BARIS[:B157] + ["lanjutan tanpa pipe pembuka"] + BARIS[B157:TERAKHIR - 1]
               + [BARIS[TERAKHIR - 1][:-1] + "`a | b` |"] + BARIS[TERAKHIR:]), 1,
     [f":{B157 + 1} baris tanpa pipe pembuka ikut tabel header baris 5",
      f":{TERAKHIR + 1} keputusan {NO_TERAKHIR}: 7 pipe tanpa escape"]),
    ("judul sesudah baris tabel mengakhiri tabel",
     ASLI.rstrip("\n") + "\n\n| a | b |\n|---|---|\n| 1 | 2 |\n# Judul\n", 0, [" 0 gagal"]),
    ("sel pertama ber-escape tetap utuh di pesan",
     ASLI.rstrip("\n") + "\n\n| a \\| b | c |\n|---|---|\n| x \\| y | z | w |\n", 1,
     ["baris tabel 'x \\| y': 4 pipe tanpa escape"]),
    ("tabel di dalam blok kode berpagar tidak dihitung",
     ASLI.rstrip("\n") + "\n\n```text\n| a | b |\n|---|---|\n| 1 | 2 | 3 |\n```\n", 0, [" 0 gagal"]),
    ("pembatas tidak cocok dengan header",
     ASLI.rstrip("\n") + "\n\n| a | b |\n|---|---|---|\n| 1 | 2 |\n", 1, ["pembatas: 4 pipe tanpa escape"]),
]


def ada(wajib, keluaran, harap):
    if harap == 0:
        return wajib in keluaran
    return any(b.startswith("GAGAL") and wajib in b for b in keluaran.splitlines())


gagal = 0
with tempfile.TemporaryDirectory() as tmp:
    for nama, isi, harap, wajib in KASUS:
        path = pathlib.Path(tmp) / "KEPUTUSAN.md"
        path.write_text(isi, encoding="utf-8")
        p = subprocess.run([sys.executable, str(AKAR / "tools" / "cek_tabel_plan.py"), str(path)],
                           capture_output=True, text=True)
        hilang = [w for w in wajib if not ada(w, p.stdout, harap)]
        ok = p.returncode == harap and not hilang
        gagal += not ok
        print(f"{'OK  ' if ok else 'GAGAL'} exit {p.returncode} (harap {harap}) {nama}"
              + (f"; tidak ada di keluaran: {hilang}" if hilang else ""))
print(f"{len(KASUS) - gagal}/{len(KASUS)} kasus uji tabel plan lolos")
sys.exit(1 if gagal else 0)
