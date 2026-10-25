"""Uji tools/erd.py --cek dengan salinan yang diubah: pemeriksa harus gagal, bukan lolos palsu (keputusan 375).

File sumber dan JSON ERD semua tahap disalin ke direktori sementara; yang asli tidak diubah. Bagian akhir menguji
hitung_selisih dengan data buatan dan bersihkan() dengan potongan SQL, tanpa database.

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
JSON2 = "situs/data/erd/tahap-2.json"
JSON3 = "situs/data/erd/tahap-3.json"
SUMBER = erd.TAHAP[1]["sumber"][0]
PEMBANDING = erd.TAHAP[1]["pembanding"][0]
MIGRASI_T2 = [f for f in erd.TAHAP[2]["sumber"] if f.startswith("labs/api-t2/")]
MIGRASI_T3 = [f for f in erd.TAHAP[3]["sumber"] if f.startswith("labs/api-t3/")]


def ubah_json(fungsi, rel=JSON1):
    def f(root):
        p = root / rel
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
    # Tahap 2 (keputusan 470): migration api-t2 ikut hash; selisih dihitung ulang dari kedua JSON.
    ("migration api-t2 berubah tanpa JSON Tahap 2 dibangun ulang", tambah_baris(MIGRASI_T2[-1]), 1, "file sumber berubah"),
    ("JSON Tahap 2 hilang", lambda r: (r / JSON2).unlink(), 1, "tahap-2.json: belum ada"),
    ("tujuan pindah diubah tangan di JSON Tahap 2",
     ubah_json(lambda d: d["selisih"]["tabel_dihapus"][0].update(pindah_ke="jurnal"), JSON2), 1, "selisih tidak sama"),
    ("kolom baru dihapus dari selisih Tahap 2",
     ubah_json(lambda d: d["selisih"]["kolom_baru"].pop(), JSON2), 1, "selisih tidak sama"),
    ("tahap-1.json diubah tangan dengan format sah: selisih Tahap 2 menangkapnya",
     ubah_json(lambda d: akun(d)["kolom"][2].update(tipe="character varying")), 1, "tahap-2.json: selisih tidak sama"),
    # Tahap 3 (keputusan 963): migration api-t3 ikut hash; selisih dihitung ulang dari tahap-2.json dan tahap-3.json.
    ("migration api-t3 berubah tanpa JSON Tahap 3 dibangun ulang", tambah_baris(MIGRASI_T3[-1]), 1, "tahap-3.json: file sumber berubah"),
    ("migration api-t2 000014 berubah: Tahap 3 ikut menangkapnya", tambah_baris("labs/api-t2/migrasi/000014_wajib_ganti_password.up.sql"), 1, "tahap-3.json: file sumber berubah"),
    ("JSON Tahap 3 hilang", lambda r: (r / JSON3).unlink(), 1, "tahap-3.json: belum ada"),
    ("tabel baru dihapus dari selisih Tahap 3",
     ubah_json(lambda d: d["selisih"]["tabel_baru"].remove("outbox"), JSON3), 1, "tahap-3.json: selisih tidak sama"),
    ("kolom baru sesi dihapus dari selisih Tahap 3",
     ubah_json(lambda d: d["selisih"]["kolom_baru"].pop(), JSON3), 1, "tahap-3.json: selisih tidak sama"),
    ("tabel dihapus diisi tangan di Tahap 3 yang hanya menambah",
     ubah_json(lambda d: d["selisih"]["tabel_dihapus"].append({"nama": "posting", "pindah_ke": "outbox"}), JSON3), 1, "tahap-3.json: selisih tidak sama"),
    ("tahap-2.json diubah tangan dengan format sah: selisih Tahap 3 menangkapnya",
     ubah_json(lambda d: next(t for t in d["tabel"] if t["nama"] == "sesi")["kolom"][1].update(tipe="integer"), JSON2), 1, "tahap-3.json: selisih tidak sama"),
]

gagal = 0
for nama, ubah, harap, wajib in KASUS:
    with tempfile.TemporaryDirectory() as tmp:
        root = pathlib.Path(tmp)
        for rel in sorted({f for c in erd.TAHAP.values() for f in erd.semua_file(c)}) + [JSON1, JSON2, JSON3]:
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
                           "sesudah": {"nama": "id", "tipe": "integer", "wajib": True, "bawaan": None}}],
        "aturan_berubah": []}),
]
# Aturan (keputusan 460): tabel yang hanya mendapat CHECK baru (M4 batas saldo warung) harus tercatat berubah.
lama_a = {"tahap": 1, "tabel": [dict(tabel("akun", "id", "saldo"), pk=["id"],
                                     cek=[{"nama": "saldo_tidak_negatif", "kolom": ["saldo"], "ekspresi": "saldo >= 0"}],
                                     index=[{"nama": "akun_saldo", "unik": False, "definisi": "btree (saldo)"}])]}
baru_a = {"tahap": 2, "tabel": [dict(tabel("akun", "id", "saldo"), pk=["id", "saldo"],
                                     cek=[{"nama": "batas_saldo_warung", "kolom": ["saldo"], "ekspresi": "saldo <= 1500000"},
                                          {"nama": "saldo_tidak_negatif", "kolom": ["saldo"], "ekspresi": "saldo > 0"}])]}
SELISIH += [
    ("aturan baru, dihapus, dan berubah tercatat walau kolom sama",
     lambda: erd.hitung_selisih(lama_a, baru_a, {})["aturan_berubah"], [
         {"tabel": "akun", "jenis": "pk", "nama": "pk", "ubah": "berubah"},
         {"tabel": "akun", "jenis": "cek", "nama": "batas_saldo_warung", "ubah": "baru"},
         {"tabel": "akun", "jenis": "cek", "nama": "saldo_tidak_negatif", "ubah": "berubah"},
         {"tabel": "akun", "jenis": "index", "nama": "akun_saldo", "ubah": "dihapus"}]),
    ("tahap tanpa perubahan aturan: daftar kosong", lambda: erd.hitung_selisih(lama_a, lama_a, {})["aturan_berubah"], []),
]
# Data uji Tahap 2 widget ERD bertumbuh (situs/src/erd/uji/tahap-2.json, keputusan 461): bentuknya lolos periksa() dan
# selisihnya sama dengan hitungan erd.py terhadap tahap-1.json sungguhan, jadi widget diuji dengan format yang akan
# ditulis ERD2, bukan format tebakan.
UJI2 = json.loads((AKAR / "situs/src/erd/uji/tahap-2.json").read_text(encoding="utf-8"))
T1 = json.loads((AKAR / JSON1).read_text(encoding="utf-8"))
SELISIH += [
    ("data uji Tahap 2 lolos periksa()", lambda: erd.periksa(UJI2, 2), []),
    ("data uji Tahap 2: selisih = hitung_selisih(tahap-1.json, data uji)",
     lambda: erd.hitung_selisih(T1, UJI2, {x["nama"]: x["pindah_ke"] for x in UJI2["selisih"]["tabel_dihapus"]}) == UJI2["selisih"], True),
    ("data uji Tahap 2 ditulis format erd.py",
     lambda: (AKAR / "situs/src/erd/uji/tahap-2.json").read_text(encoding="utf-8") == erd.tulis_json(UJI2), True),
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
# bersihkan dan migration api-t2 (keputusan 471): `SET search_path FROM CURRENT` hanya sebagai atribut CREATE FUNCTION.
LAIN = ["b3_ledger", "public", "tahap1", "tahap2", "tahap2_arsip"]  # contoh schema lab yang ada saat membangun
FUNGSI = "CREATE FUNCTION f() RETURNS trigger\nLANGUAGE plpgsql {atribut} AS $$\nBEGIN\n{isi}\n  RETURN NULL;\nEND $$;\n"
f_ok = FUNGSI.format(atribut="SET search_path FROM CURRENT", isi="  PERFORM 1;")
SELISIH += [
    ("migration api-t2 lolos bersihkan dan tidak diubah",
     lambda: [f for f in MIGRASI_T2 if erd.bersihkan((AKAR / f).read_text(), f, LAIN) != (AKAR / f).read_text()], []),
    ("token_sql tidak kehilangan satu karakter pun",
     lambda: all("".join(t for _, t in erd.token_sql((AKAR / f).read_text())) == (AKAR / f).read_text()
                 for f in MIGRASI_T2 + [SUMBER]), True),
    ("atribut fungsi SET search_path FROM CURRENT diterima", lambda: erd.bersihkan(f_ok, "uji", LAIN) == f_ok, True),
    ("atribut sesudah body juga diterima",
     lambda: bool(erd.bersihkan("CREATE OR REPLACE FUNCTION g() RETURNS int AS $f$ SELECT 1; $f$\n"
                                "  LANGUAGE sql SET search_path FROM CURRENT;\n", "uji", LAIN)), True),
    ("SET search_path FROM CURRENT di luar CREATE FUNCTION ditolak",
     lambda: erd.bersihkan("CREATE TABLE x (id int);\nSET search_path FROM CURRENT;\n", "uji"), SystemExit),
    ("ALTER FUNCTION ... SET search_path FROM CURRENT ditolak",
     lambda: erd.bersihkan("ALTER FUNCTION f() SET search_path FROM CURRENT;\n", "uji"), SystemExit),
    ("fungsi dengan SET search_path = tahap1 ditolak",
     lambda: erd.bersihkan(FUNGSI.format(atribut="SET search_path = tahap1", isi=""), "uji"), SystemExit),
    ("body fungsi yang menyebut tahap1.akun ditolak",
     lambda: erd.bersihkan(FUNGSI.format(atribut="SET search_path FROM CURRENT", isi="  DELETE FROM tahap1.akun;"),
                           "uji"), SystemExit),
    ("SET search_path di body fungsi tidak dibuang diam-diam, tetapi ditolak",
     lambda: erd.bersihkan(FUNGSI.format(atribut="", isi="SET search_path = public;"), "uji"), SystemExit),
    ("'--' di dalam string tidak menyembunyikan SQL sesudahnya",
     lambda: erd.bersihkan("CREATE TABLE x (a text DEFAULT '--'); ALTER TABLE tahap1.akun ADD COLUMN y int;\n", "uji"),
     SystemExit),
    # Keputusan 474: empat bentuk yang dibaca lexer PostgreSQL sebagai kode, tetapi oleh token versi 471 sebagai
    # komentar, sehingga perintah sesudahnya lolos tanpa diperiksa (dicek di PostgreSQL 17: SELECT sesudahnya jalan).
    ("'--' di dalam nama bertanda kutip tidak menyembunyikan SQL sesudahnya",
     lambda: erd.bersihkan('CREATE TABLE "a--" (x int); SET search_path = public;\n', "uji", LAIN), SystemExit),
    ("string E'\\'' tidak menggeser batas string",
     lambda: erd.bersihkan("SELECT E'\\'' , ' -- ' ; SET search_path = public;\n", "uji", LAIN), SystemExit),
    ("$ di tengah nama bukan awal body dollar",
     lambda: erd.bersihkan("CREATE TABLE a$b$c (x int); SELECT $b$ -- $b$; SET search_path = public;\n", "uji", LAIN),
     SystemExit),
    ("komentar /* */ bersarang ditolak",
     lambda: erd.bersihkan("/* /* */ ' */ SELECT ' -- ' ; SET search_path = public;\n", "uji", LAIN), SystemExit),
    ("nama bertanda kutip dan string E sah diterima tanpa diubah",
     lambda: erd.bersihkan('CREATE TABLE "x" ("a--b" text DEFAULT E\'it\\\'s\');\n', "uji", LAIN)
     == 'CREATE TABLE "x" ("a--b" text DEFAULT E\'it\\\'s\');\n', True),
    ("schema lab lain dari database ditolak",
     lambda: erd.bersihkan("INSERT INTO b3_ledger.buku (jenis) VALUES ('selisih');\n", "uji", LAIN), SystemExit),
    ("schema lab lain bertanda kutip ditolak",
     lambda: erd.bersihkan('CREATE TABLE x AS TABLE "tahap2_arsip".transaksi;\n', "uji", LAIN), SystemExit),
    ("alias tabel tidak dikira schema",
     lambda: bool(erd.bersihkan("UPDATE buku b SET saldo_cache = p.jumlah FROM posting p WHERE p.buku_id = b.id;\n",
                                "uji", LAIN)), True),
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
