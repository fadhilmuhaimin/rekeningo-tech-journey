"""Uji tools/erd.py --cek dengan salinan yang diubah: pemeriksa harus gagal, bukan lolos palsu (keputusan 375).

File sumber dan JSON ERD disalin ke direktori sementara; yang asli tidak diubah. Bagian akhir menguji hitung_selisih
(dipakai Tahap 2) dengan data buatan, tanpa database.

    python3 tools/test_erd.py
"""
import importlib.util
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

AKAR = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("erd", AKAR / "tools" / "erd.py")
erd = importlib.util.module_from_spec(spec)
spec.loader.exec_module(erd)

JSON1 = "situs/data/erd/tahap-1.json"
SUMBER = erd.TAHAP[1]["sumber"][0]
PEMBANDING = erd.TAHAP[1]["pembanding"][0]


def ubah_json(fungsi):
    def f(root):
        p = root / JSON1
        d = json.loads(p.read_text(encoding="utf-8"))
        fungsi(d)
        p.write_text(erd.tulis_json(d), encoding="utf-8")
    return f


def tambah_baris(rel):
    def f(root):
        p = root / rel
        p.write_text(p.read_text(encoding="utf-8") + "-- satu baris komentar\n", encoding="utf-8")
    return f


def akun(d):
    return next(t for t in d["tabel"] if t["nama"] == "akun")


KASUS = [  # nama, ubah salinan, exit harapan, teks yang harus ada di keluaran
    ("salinan apa adanya", lambda r: None, 0, "lolos"),
    ("schema.sql berubah tanpa JSON dibangun ulang", tambah_baris(SUMBER), 1, "file sumber berubah"),
    ("file pembanding berubah", tambah_baris(PEMBANDING), 1, "file sumber berubah"),
    ("JSON hilang", lambda r: (r / JSON1).unlink(), 1, "belum ada"),
    ("JSON bukan JSON", lambda r: (r / JSON1).write_text("{", encoding="utf-8"), 1, "bukan JSON"),
    ("JSON diubah tangan tanpa format erd.py",
     lambda r: (r / JSON1).write_text(json.dumps(json.loads((r / JSON1).read_text())), encoding="utf-8"), 1, "format"),
    ("foreign key ke tabel yang tidak ada",
     ubah_json(lambda d: next(t for t in d["tabel"] if t["fk"])["fk"][0].update(ke_tabel="akun_lama")), 1, "tidak ada"),
    ("primary key ke kolom yang tidak ada", ubah_json(lambda d: akun(d).update(pk=["nomor"])), 1, "tidak ada di tabel"),
    ("kunci tambahan di tabel", ubah_json(lambda d: akun(d).update(warna="biru")), 1, "kunci"),
    ("tabel ganda", ubah_json(lambda d: d["tabel"].append(akun(d))), 1, "ganda"),
    ("CHECK tidak terurut", ubah_json(lambda d: akun(d)["cek"].reverse()), 1, "tidak terurut"),
    ("wajib bukan boolean", ubah_json(lambda d: akun(d)["kolom"][0].update(wajib="ya")), 1, "boolean"),
    ("hash diganti tangan", ubah_json(lambda d: d["sumber"].update(sha256="0" * 64)), 1, "file sumber berubah"),
    ("daftar sumber berbeda dari konfigurasi", ubah_json(lambda d: d["sumber"]["file"].pop()), 1, "daftar file sumber"),
    ("selisih diisi padahal tidak ada tahap sebelumnya",
     ubah_json(lambda d: d.update(selisih={k: [] for k in erd.KUNCI["selisih"]})), 1, "selisih harus null"),
]

gagal = 0
for nama, ubah, harap, wajib in KASUS:
    with tempfile.TemporaryDirectory() as tmp:
        root = pathlib.Path(tmp)
        for rel in erd.semua_file(erd.TAHAP[1]) + [JSON1]:
            (root / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(AKAR / rel, root / rel)
        ubah(root)
        p = subprocess.run([sys.executable, str(AKAR / "tools" / "erd.py"), "--cek", "--root", str(root)],
                           capture_output=True, text=True)
        keluaran = p.stdout + p.stderr
        ok = p.returncode == harap and wajib in keluaran
        gagal += not ok
        print(f"{'OK  ' if ok else 'GAGAL'} exit {p.returncode} (harap {harap}) {nama}"
              + ("" if ok else f"; keluaran: {keluaran.strip()[:300]}"))


# hitung_selisih: data buatan untuk Tahap 2 (transaksi pindah ke jurnal + posting, akun mendapat kolom baru).
def tabel(nama, *kolom):
    return {"nama": nama, "kolom": [{"nama": k, "tipe": "bigint", "wajib": True, "bawaan": None} for k in kolom],
            "pk": [], "fk": [], "unik": [], "cek": [], "index": []}


lama = {"tahap": 1, "tabel": [tabel("akun", "id", "saldo"), tabel("transaksi", "id", "jumlah")]}
baru = {"tahap": 2, "tabel": [tabel("akun", "id", "gagal_login"), tabel("jurnal", "id")]}
baru["tabel"][0]["kolom"][0]["tipe"] = "integer"
SELISIH = [
    ("tabel dihapus tanpa entri pindah gagal", lambda: erd.hitung_selisih(lama, baru, {}), SystemExit),
    ("entri pindah untuk tabel yang tidak dihapus gagal",
     lambda: erd.hitung_selisih(lama, baru, {"transaksi": "jurnal", "akun": "buku"}), SystemExit),
    ("selisih lengkap", lambda: erd.hitung_selisih(lama, baru, {"transaksi": "jurnal jenis bayar + 2 posting"}), {
        "terhadap": 1, "tabel_baru": ["jurnal"],
        "tabel_dihapus": [{"nama": "transaksi", "pindah_ke": "jurnal jenis bayar + 2 posting"}],
        "kolom_baru": [{"tabel": "akun", "kolom": "gagal_login"}],
        "kolom_dihapus": [{"tabel": "akun", "kolom": "saldo"}],
        "kolom_berubah": [{"tabel": "akun", "kolom": "id",
                           "sebelum": {"nama": "id", "tipe": "bigint", "wajib": True, "bawaan": None},
                           "sesudah": {"nama": "id", "tipe": "integer", "wajib": True, "bawaan": None}}]}),
]
# bersihkan: perintah schema schema.sql dibuang; SQL yang masih menyebut schema ditolak sebelum dijalankan.
SKEMA_SQL = (AKAR / SUMBER).read_text(encoding="utf-8")
SELISIH += [
    ("schema.sql: DROP/CREATE SCHEMA dan SET search_path dibuang",
     lambda: [b for b in erd.bersihkan(SKEMA_SQL, SUMBER).splitlines() if "tahap1" in b and not b.startswith("--")], []),
    ("DROP SCHEMA yang berbagi baris ditolak",
     lambda: erd.bersihkan("DROP SCHEMA tahap1 CASCADE; CREATE TABLE x (id int);\n", "uji"), SystemExit),
    ("nama tabel ber-schema ditolak", lambda: erd.bersihkan("ALTER TABLE tahap1.akun ADD COLUMN x int;\n", "uji"), SystemExit),
    ("SET search_path di tengah baris ditolak",
     lambda: erd.bersihkan("CREATE TABLE x (id int); SET search_path = public;\n", "uji"), SystemExit),
]
for nama, jalan, harap in SELISIH:
    try:
        hasil = jalan()
    except SystemExit:
        hasil = SystemExit
    ok = hasil == harap
    gagal += not ok
    print(f"{'OK  ' if ok else 'GAGAL'} {nama}" + ("" if ok else f"; hasil: {hasil!r}"))

total = len(KASUS) + len(SELISIH)
print(f"{total - gagal}/{total} kasus uji erd lolos")
sys.exit(1 if gagal else 0)
