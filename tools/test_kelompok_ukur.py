"""Uji pembagian kelompok alat ukur di tools/cek_situs.sh (keputusan 865): membagi alat per ukuran layar dan per bagian
tidak boleh menghilangkan atau menggandakan pemeriksaan. Yang dijaga:

  - gabungan nama alat di semua kelompok sama dengan daftar alat sebelum pembagian (layar, tangkap, judul, ilustrasi, rantai,
    race, gerak, galur [loop alur yang dulu di dalam gerak], kontras, axe, erd, diagram, cls, luapan, alur, outbox);
  - alat yang dibagi per ukuran (layar, galur) muncul hanya sebagai bagian "@", dan ukuran semua bagiannya, digabung, sama
    persis dengan ukuran alat itu (tiap ukuran tepat sekali);
  - tiap ukuran benar-benar dikenal alatnya (tercantum di sumber .mjs) dan alat menolak ukuran yang tidak dikenal;
  - alat tidak punya ukuran LEBIH dari yang dibagikan: ukuran baru di sumber .mjs yang belum masuk `ukuran_bagian` tidak
    boleh tertinggal diam-diam (sebelum pembagian, ukuran baru otomatis ikut; sekarang harus didaftarkan, keputusan 868);
  - tidak ada nama alat dobel antarkelompok, tidak ada kelompok kosong.

    python3 tools/test_kelompok_ukur.py
"""
import json
import pathlib
import re
import subprocess
import sys

AKAR = pathlib.Path(__file__).resolve().parent.parent

ALAT_SEBELUM = {"layar", "tangkap", "judul", "ilustrasi", "rantai", "race", "gerak", "galur", "kontras", "axe", "erd", "diagram",
                "cls", "luapan", "alur", "outbox"}
# Ukuran lengkap tiap alat yang dibagi, dari sumber alat sebelum pembagian (layar.mjs VIEWPORTS; ukur-gerak.mjs loop alur).
UKURAN_PENUH = {
    "layar": {"1366x768", "1366x657", "375x812", "375x667"},
    "galur": {"375x667", "667x375", "844x390", "1366x657"},
}
SUMBER = {"layar": "situs/tools/layar.mjs", "galur": "situs/tools/ukur-gerak-alur.mjs"}


def bash(*a):
    return subprocess.run(["bash", str(AKAR / "tools/cek_situs.sh"), *a], capture_output=True, text=True, cwd=AKAR)


gagal = []


def cek(ok, pesan):
    print(f"{'OK  ' if ok else 'GAGAL'} {pesan}")
    if not ok:
        gagal.append(pesan)


kelompok = json.loads(bash("--matriks-ci").stdout)["kelompok"]
nama = [n for k in kelompok for n in k.split()]
cek(all(k.strip() for k in kelompok), f"{len(kelompok)} kelompok, tak ada yang kosong")
cek(len(nama) == len(set(nama)), "tidak ada nama alat dobel antarkelompok")
dasar = {n.split("@")[0] for n in nama}
cek(dasar == ALAT_SEBELUM, f"gabungan alat sama dengan sebelum pembagian (selisih: {sorted(dasar ^ ALAT_SEBELUM)})")

for alat, penuh in UKURAN_PENUH.items():
    bagian = [n for n in nama if n.split("@")[0] == alat]
    cek(bagian and all("@" in n for n in bagian), f"{alat} hanya muncul sebagai bagian per ukuran: {bagian}")
    daftar = []
    for n in bagian:
        p = bash("--bagian", n)
        daftar += p.stdout.strip().split(",") if p.returncode == 0 else []
    cek(sorted(daftar) == sorted(penuh), f"bagian {alat}, digabung, = {sorted(penuh)} tepat sekali (dapat {sorted(daftar)})")
    teks = (AKAR / SUMBER[alat]).read_text(encoding="utf8")
    cek(all(u in teks or u.replace("x", ", ") in teks for u in penuh), f"{SUMBER[alat]} mengenal semua ukuran")
    cek("--ukuran tidak dikenal" in teks, f"{SUMBER[alat]} menolak ukuran yang tidak dikenal")
    # Daftar ukuran lengkap alat itu di sumbernya: layar.mjs `name: "WxH"`, ukur-gerak-alur.mjs `[[W, H], ...]` di SEMUA_UKURAN.
    if alat == "layar":
        di_sumber = set(re.findall(r'name:\s*"(\d+x\d+)"', teks.split("SEMUA_VIEWPORTS", 1)[1].split("];", 1)[0]))
    else:
        baris = next(l for l in teks.splitlines() if l.startswith("const SEMUA_UKURAN"))
        di_sumber = {f"{w}x{h}" for w, h in re.findall(r"\[(\d+),\s*(\d+)\]", baris)}
    cek(di_sumber == penuh, f"{SUMBER[alat]} tidak punya ukuran di luar yang dibagikan (sumber {sorted(di_sumber)}, dibagikan {sorted(penuh)})")

cek(bash("--bagian", "layar@tak-ada").returncode != 0, "bagian yang tidak dikenal ditolak")
cek(bash("--ukur", "layar").returncode != 0, "nama alat tanpa bagian ('layar') tidak dikenal lagi, jadi ditolak")
cek(bash("--ukur", "layar@hp tak-ada-alat").returncode != 0, "--ukur menolak nama alat yang tidak dikenal")

print(f"{'semua lolos' if not gagal else f'{len(gagal)} GAGAL'}: kelompok alat ukur")
sys.exit(1 if gagal else 0)
