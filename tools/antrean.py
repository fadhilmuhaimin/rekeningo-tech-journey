"""Baca dan periksa plan/ANTREAN.md, antrean tugas loop otomatis (keputusan 216).

Satu tugas = satu judul `### <id> · <judul>` diikuti butir `- kunci: nilai`. Kunci wajib: jenis, status,
percobaan, bergantung, selesai bila, catatan. Baris sub-butir (diawali dua spasi) milik butir di atasnya.

    python3 tools/antrean.py --check            # exit 1 kalau format salah (dipanggil tools/cek_situs.sh)
    python3 tools/antrean.py berikut            # tugas yang dikerjakan iterasi ini: "<id>\t<jenis>\t<judul>"
                                                # exit 1 kalau tidak ada lagi yang bisa dikerjakan
    python3 tools/antrean.py sisa               # jumlah tugas antre/dikerjakan yang tidak terhalang tugas diparkir
    python3 tools/antrean.py status <id>        # status satu tugas
    python3 tools/antrean.py ringkas            # hitungan per status dan daftar selesai/diparkir
    python3 tools/antrean.py parkir <id> <alasan>   # dipakai skrip saat sesi gagal dua kali

`berikut` memilih tugas pertama berstatus dikerjakan; kalau tidak ada, tugas antre pertama yang semua
`bergantung`-nya selesai. Tugas yang bergantung (langsung atau tidak) pada tugas diparkir dicetak ke
stderr sebagai "PERLU DIPARKIR" dan tidak dipilih; protokol memintanya diparkir di iterasi yang sama.
"""
import datetime
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
BERKAS = ROOT / "plan" / "ANTREAN.md"
STATUS = ("antre", "dikerjakan", "selesai", "diparkir")
JENIS = ("konten", "interaksi", "perbaikan", "crosscheck")
KUNCI = ("jenis", "status", "percobaan", "bergantung", "selesai bila", "catatan")
JUDUL = re.compile(r"^### (\S+) · (.+?)\s*$")
BUTIR = re.compile(r"^- ([a-z ]+): ?(.*)$")


def baca():
    """Kembalikan (baris, tugas). Tiap tugas: dict id, judul, baris_judul, kunci->(nomor baris, nilai)."""
    baris = BERKAS.read_text(encoding="utf-8").split("\n")
    tugas, kini = [], None
    for i, b in enumerate(baris):
        m = JUDUL.match(b)
        if m:
            kini = {"id": m.group(1), "judul": m.group(2), "baris": i, "kunci": {}}
            tugas.append(kini)
            continue
        if b.startswith("## "):
            kini = None
            continue
        if kini is None:
            continue
        m = BUTIR.match(b)
        if m and m.group(1) in KUNCI:
            kini["kunci"][m.group(1)] = (i, m.group(2).strip())
    return baris, tugas


def nilai(t, k):
    return t["kunci"].get(k, (None, ""))[1]


def bergantung(t):
    v = nilai(t, "bergantung")
    return [] if v in ("", "-", "–") else [x.strip() for x in v.split(",") if x.strip()]


ALOKASI_KEPUTUSAN = re.compile(r"ALOKASI: keputusan (\d+)[–-](\d+)")
ALOKASI_RISET = re.compile(r"ID riset (?:bila perlu )?(R\d+)-(\d+) sampai \1-(\d+)")


def periksa_alokasi(tugas):
    """Nomor keputusan ("ALOKASI: keputusan A–B") dan ID riset ("ID riset R5-X sampai R5-Y") yang dialokasikan ke dua tugas
    tidak boleh bertumpuk, dan tiap rentang berurutan (peninjau T5-siap, keputusan 1415). ID riset dibandingkan hanya
    dengan ID berawalan sama (R4 lawan R5 boleh memakai angka yang sama)."""
    kelompok = {}
    for t in tugas:
        teks = nilai(t, "catatan")
        m = ALOKASI_KEPUTUSAN.search(teks)
        if m:
            kelompok.setdefault("keputusan", []).append((int(m.group(1)), int(m.group(2)), t["id"]))
        for r in ALOKASI_RISET.finditer(teks):
            kelompok.setdefault(f"ID riset {r.group(1)}", []).append((int(r.group(2)), int(r.group(3)), t["id"]))
    salah = []
    for nama, rentang in kelompok.items():
        akhir, pemilik = None, None
        for awal, ujung, tid in sorted(rentang):
            if awal > ujung:
                salah.append(f"{tid}: alokasi {nama} {awal}–{ujung} terbalik")
            if akhir is not None and awal <= akhir:
                salah.append(f"{tid}: alokasi {nama} {awal}–{ujung} bertumpuk dengan {pemilik} (sampai {akhir})")
            if akhir is None or ujung > akhir:
                akhir, pemilik = ujung, tid
    return salah


def periksa(tugas):
    salah, ids = [], {}
    for t in tugas:
        if t["id"] in ids:
            salah.append(f"{t['id']}: id ganda")
        ids[t["id"]] = t
        for k in KUNCI:
            if k not in t["kunci"]:
                salah.append(f"{t['id']}: butir '- {k}:' tidak ada")
        if nilai(t, "status") not in STATUS:
            salah.append(f"{t['id']}: status '{nilai(t, 'status')}' bukan salah satu dari {', '.join(STATUS)}")
        if nilai(t, "jenis") not in JENIS:
            salah.append(f"{t['id']}: jenis '{nilai(t, 'jenis')}' bukan salah satu dari {', '.join(JENIS)}")
        p = nilai(t, "percobaan")
        if not p.isdigit() or not 0 <= int(p) <= 3:
            salah.append(f"{t['id']}: percobaan '{p}' harus 0–3")
        if not nilai(t, "selesai bila"):
            salah.append(f"{t['id']}: 'selesai bila' kosong")
    for t in tugas:
        for d in bergantung(t):
            if d not in ids:
                salah.append(f"{t['id']}: bergantung pada '{d}' yang tidak ada")
            elif tugas.index(ids[d]) > tugas.index(t):
                salah.append(f"{t['id']}: bergantung pada '{d}' yang letaknya sesudahnya")
    if sum(nilai(t, "status") == "dikerjakan" for t in tugas) > 1:
        salah.append("lebih dari satu tugas berstatus dikerjakan (hanya satu pekerja)")
    salah += periksa_alokasi(tugas)
    return salah


def terhalang(tugas):
    """Id tugas yang (langsung atau tidak) bergantung pada tugas diparkir."""
    ids = {t["id"]: t for t in tugas}
    hasil = set()
    for t in tugas:  # urutan file = urutan dependensi (dicek periksa), jadi satu lintasan cukup
        for d in bergantung(t):
            if d in ids and (nilai(ids[d], "status") == "diparkir" or d in hasil):
                hasil.add(t["id"])
    return hasil


def aktif(tugas):
    blok = terhalang(tugas)
    return [t for t in tugas if nilai(t, "status") in ("antre", "dikerjakan") and t["id"] not in blok], blok


def berikut(tugas):
    calon, blok = aktif(tugas)
    for t in tugas:
        if t["id"] in blok and nilai(t, "status") in ("antre", "dikerjakan"):
            print(f"PERLU DIPARKIR {t['id']}: bergantung pada tugas diparkir", file=sys.stderr)
    for t in calon:
        if nilai(t, "status") == "dikerjakan":
            return t
    ids = {t["id"]: t for t in tugas}
    for t in calon:
        if all(nilai(ids[d], "status") == "selesai" for d in bergantung(t) if d in ids):
            return t
    return None


def parkir(baris, tugas, tid, alasan):
    t = next((t for t in tugas if t["id"] == tid), None)
    if t is None:
        sys.exit(f"tugas {tid} tidak ada")
    i, _ = t["kunci"]["status"]
    baris[i] = "- status: diparkir"
    j, lama = t["kunci"]["catatan"]
    tanggal = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    tambahan = f"Diparkir skrip {tanggal}: {alasan}"
    baris[j] = f"- catatan: {tambahan}" if lama in ("", "-") else f"- catatan: {lama} {tambahan}"
    BERKAS.write_text("\n".join(baris), encoding="utf-8")


def main(argv):
    baris, tugas = baca()
    perintah = argv[1] if len(argv) > 1 else "--check"
    if perintah == "--check":
        salah = periksa(tugas)
        for s in salah:
            print("SALAH", s)
        if salah:
            return 1
        hitung = {s: sum(nilai(t, "status") == s for t in tugas) for s in STATUS}
        print(f"antrean sah · {len(tugas)} tugas · " + " · ".join(f"{k} {v}" for k, v in hitung.items()))
        return 0
    if perintah == "berikut":
        t = berikut(tugas)
        if t is None:
            return 1
        print(f"{t['id']}\t{nilai(t, 'jenis')}\t{t['judul']}")
        return 0
    if perintah == "sisa":
        print(len(aktif(tugas)[0]))
        return 0
    if perintah == "status" and len(argv) > 2:
        t = next((t for t in tugas if t["id"] == argv[2]), None)
        print(nilai(t, "status") if t else "tidak-ada")
        return 0 if t else 1
    if perintah == "ringkas":
        for s in STATUS:
            daftar = [t["id"] for t in tugas if nilai(t, "status") == s]
            print(f"{s} ({len(daftar)}): {', '.join(daftar) or '-'}")
        return 0
    if perintah == "parkir" and len(argv) > 3:
        parkir(baris, tugas, argv[2], " ".join(argv[3:]))
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
