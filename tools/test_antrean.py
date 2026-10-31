"""Uji pemeriksa alokasi di tools/antrean.py (peninjau T5-siap, keputusan 1415): nomor keputusan dan ID riset yang
dialokasikan ke dua tugas tidak boleh bertumpuk, rentang tidak boleh terbalik, dan ANTREAN yang ada sekarang lolos.
Pakai: python3 tools/test_antrean.py"""
import pathlib
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import antrean  # noqa: E402

ASLI = antrean.BERKAS
gagal = []


def periksa(nama, ok):
    print(("ok    " if ok else "GAGAL ") + nama)
    if not ok:
        gagal.append(nama)


def blok(tid, catatan):
    return (f"### {tid} · Judul {tid}\n\n- jenis: konten\n- status: antre\n- percobaan: 0\n- bergantung: -\n"
            f"- selesai bila: x\n- catatan: {catatan}\n\n")


def alokasi(*bloks):
    d = pathlib.Path(tempfile.mkdtemp()) / "ANTREAN.md"
    d.write_text("## Tahap\n\n" + "".join(bloks), encoding="utf-8")
    antrean.BERKAS = d
    _, tugas = antrean.baca()
    antrean.BERKAS = ASLI
    return antrean.periksa_alokasi(tugas)


A = blok("5.1", "ALOKASI: keputusan 1500–1503 (1500–1502 pelaksana, 1503 peninjau), ID riset R5-110 sampai R5-114.")
B = blok("5.2", "ALOKASI: keputusan 1504–1507 (1504–1506 pelaksana, 1507 peninjau), ID riset R5-115 sampai R5-119.")

periksa("rentang berurutan lolos", alokasi(A, B) == [])
periksa("tugas tanpa ALOKASI diabaikan", alokasi(A, blok("X", "-")) == [])
periksa("nomor keputusan bertumpuk ditolak",
        len(alokasi(A, blok("5.2", "ALOKASI: keputusan 1503–1506 (x)."))) == 1)
periksa("rentang di dalam rentang lain ditolak",
        len(alokasi(blok("5.1", "ALOKASI: keputusan 1500–1510 (x)."), blok("5.2", "ALOKASI: keputusan 1503–1504 (x)."))) == 1)
periksa("nomor yang sama di dua tugas ditolak",
        len(alokasi(A, blok("5.2", "ALOKASI: keputusan 1500–1503 (x)."))) == 1)
periksa("ID riset bertumpuk ditolak",
        len(alokasi(A, blok("5.2", "ALOKASI: keputusan 1504–1507 (x), ID riset R5-114 sampai R5-118."))) == 1)
periksa("ID riset bila perlu ikut diperiksa",
        len(alokasi(A, blok("5.2", "ALOKASI: keputusan 1504–1507 (x), ID riset bila perlu R5-112 sampai R5-116."))) == 1)
periksa("ID riset awalan berbeda boleh memakai angka sama",
        alokasi(A, blok("4.2", "ALOKASI: keputusan 1204–1207 (x), ID riset R4-110 sampai R4-114.")) == [])
periksa("rentang terbalik ditolak", len(alokasi(blok("5.1", "ALOKASI: keputusan 1503–1500 (x)."))) == 1)
periksa("pesan menyebut tugas yang bertumpuk",
        any("5.2" in s and "5.1" in s for s in alokasi(A, blok("5.2", "ALOKASI: keputusan 1503–1506 (x)."))))

antrean.BERKAS = ASLI
_, tugas = antrean.baca()
periksa("ANTREAN sekarang tanpa alokasi bertumpuk", antrean.periksa_alokasi(tugas) == [])
periksa("ANTREAN sekarang memuat banyak alokasi (pola tidak lolos kosong)",
        sum(1 for t in tugas if antrean.ALOKASI_KEPUTUSAN.search(antrean.nilai(t, "catatan"))) >= 90)

print(f"# {'GAGAL ' + str(len(gagal)) if gagal else 'lolos'}")
sys.exit(1 if gagal else 0)
