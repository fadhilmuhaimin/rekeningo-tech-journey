"""Uji tools/erd.py --cek dengan salinan yang diubah: pemeriksa harus gagal, bukan lolos palsu (keputusan 375).

File sumber dan JSON ERD semua tahap disalin ke direktori sementara; yang asli tidak diubah. Bagian akhir menguji
hitung_selisih dengan data buatan dan bersihkan() dengan potongan SQL, tanpa database.

    python3 tools/test_erd.py
"""
import contextlib
import importlib.util
import io
import json
import pathlib
import re
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
JSON4 = "situs/data/erd/tahap-4.json"
JSON5 = "situs/data/erd/tahap-5.json"
JSONM = "situs/data/erd/modul-tahap-4.json"
JSONS5 = "situs/data/erd/service-tahap-5.json"
MODUL_SQL = erd.TAHAP[4]["modul"]
LAYANAN_SQL = erd.TAHAP[5]["modul"]
REKAMAN = erd.TAHAP[5]["rekaman_lintas"]
SUMBER = erd.TAHAP[1]["sumber"][0]
PEMBANDING = erd.TAHAP[1]["pembanding"][0]
MIGRASI_T2 = [f for f in erd.TAHAP[2]["sumber"] if f.startswith("labs/api-t2/")]
MIGRASI_T3 = [f for f in erd.TAHAP[3]["sumber"] if f.startswith("labs/api-t3/")]
MIGRASI_T4 = [f for f in erd.TAHAP[4]["sumber"] if f.startswith("labs/api-t4/")]
MIGRASI_T5 = [f for f in erd.TAHAP[5]["sumber"] if f.startswith("labs/api-t5/")]


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


def ubah_teks(rel, lama_, baru_):
    def f(root):
        p = root / rel
        t = p.read_text(encoding="utf-8")
        assert t.count(lama_) == 1, lama_
        p.write_text(t.replace(lama_, baru_), encoding="utf-8")
    return f


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
    # Tahap 4 (ERD4, keputusan 1254): migration api-t4 ikut hash; selisih dihitung ulang dari tahap-3.json dan tahap-4.json.
    ("migration api-t4 berubah tanpa JSON Tahap 4 dibangun ulang", tambah_baris(MIGRASI_T4[-1]), 1, "tahap-4.json: file sumber berubah"),
    ("migration api-t4 000020 berubah", tambah_baris(MIGRASI_T4[0]), 1, "tahap-4.json: file sumber berubah"),
    ("migration api-t3 000019 berubah: Tahap 3 dan 4 sama-sama menangkapnya", tambah_baris(MIGRASI_T3[-1]), 1, "tahap-4.json: file sumber berubah"),
    ("migration baru di labs/api-t4/migrasi yang belum terdaftar di TAHAP[4] (hash tidak berubah, JSON diam-diam usang)",
     lambda r: (r / "labs/api-t4/migrasi/000024_baru.up.sql").write_text("ALTER TABLE akun ADD COLUMN x int;\n", encoding="utf-8"),
     1, "migration lab belum terdaftar di TAHAP[4]: labs/api-t4/migrasi/000024_baru.up.sql"),
    ("migration baru di labs/api-t3/migrasi yang belum terdaftar: Tahap 3 dan 4 sama-sama menangkapnya",
     lambda r: (r / "labs/api-t3/migrasi/000099_baru.up.sql").write_text("SELECT 1;\n", encoding="utf-8"),
     1, "migration lab belum terdaftar di TAHAP[3]: labs/api-t3/migrasi/000099_baru.up.sql"),
    ("JSON Tahap 4 hilang", lambda r: (r / JSON4).unlink(), 1, "tahap-4.json: belum ada"),
    ("tabel baru dihapus dari selisih Tahap 4",
     ubah_json(lambda d: d["selisih"]["tabel_baru"].remove("topup_bank"), JSON4), 1, "tahap-4.json: selisih tidak sama"),
    ("kolom baru dihapus dari selisih Tahap 4",
     ubah_json(lambda d: d["selisih"]["kolom_baru"].pop(), JSON4), 1, "tahap-4.json: selisih tidak sama"),
    ("aturan berubah dihapus dari selisih Tahap 4",
     ubah_json(lambda d: d["selisih"]["aturan_berubah"].pop(), JSON4), 1, "tahap-4.json: selisih tidak sama"),
    ("tabel dihapus diisi tangan di Tahap 4 yang hanya menambah",
     ubah_json(lambda d: d["selisih"]["tabel_dihapus"].append({"nama": "outbox", "pindah_ke": "audit_log"}), JSON4), 1, "tahap-4.json: selisih tidak sama"),
    ("tahap-3.json diubah tangan dengan format sah: selisih Tahap 4 menangkapnya",
     ubah_json(lambda d: next(t for t in d["tabel"] if t["nama"] == "outbox")["kolom"][1].update(tipe="text"), JSON3), 1, "tahap-4.json: selisih tidak sama"),
    # Kolom, UNIQUE, CHECK, atau index Tahap 4 yang diubah atau dihapus tangan dari tahap-4.json tidak punya sumber lain
    # tanpa database, jadi bukan tugas --cek: penjaganya Vitest (situs/src/erd/tumbuh.test.ts, "penjaga skema" ERD4).
    # Pembagian modul Tahap 4 (keputusan 1254).
    ("modul.sql berubah tanpa JSON modul dibangun ulang", tambah_baris(MODUL_SQL), 1, "modul-tahap-4.json: labs/t4-modul/modul.sql berubah"),
    ("JSON modul hilang", lambda r: (r / JSONM).unlink(), 1, "modul-tahap-4.json: belum ada"),
    ("JSON modul bukan JSON", lambda r: (r / JSONM).write_text("[", encoding="utf-8"), 1, "modul-tahap-4.json: bukan JSON"),
    ("JSON modul diubah tangan tanpa format erd.py",
     lambda r: (r / JSONM).write_text(json.dumps(json.loads((r / JSONM).read_text())), encoding="utf-8"), 1, "modul-tahap-4.json: format"),
    ("satu tabel dipindah modul di JSON modul",
     ubah_json(lambda d: (d["modul"][0]["tabel"].remove("buku"), d["modul"][1]["tabel"].append("buku")), JSONM), 1, "modul-tahap-4.json: isi tidak sama"),
    ("satu foreign key lintas modul dihapus di JSON modul", ubah_json(lambda d: d["lintas"].pop(), JSONM), 1, "modul-tahap-4.json: isi tidak sama"),
    ("modul diganti nama di JSON modul", ubah_json(lambda d: d["modul"][4].update(nama="gateway"), JSONM), 1, "modul-tahap-4.json: isi tidak sama"),
    ("hash modul.sql diganti tangan", ubah_json(lambda d: d["sumber"].update(sha256="0" * 64), JSONM), 1, "modul-tahap-4.json: labs/t4-modul/modul.sql berubah"),
    ("foreign key lintas yang tidak menyeberang disisipkan di JSON modul",
     ubah_json(lambda d: d["lintas"].append({"tabel": "sesi", "fk": "sesi_akun_id_fkey", "ke_tabel": "akun", "dari_modul": "akun", "ke_modul": "akun"}), JSONM), 1, "tidak menyeberang modul"),
    ("kunci tambahan di JSON modul", ubah_json(lambda d: d.update(catatan="x"), JSONM), 1, "kunci tidak sama"),
    # Tahap 5 (ERD5, keputusan 1670-1672): migration api-t5 ikut hash; selisih dihitung ulang dari tahap-4.json dan tahap-5.json.
    ("migration api-t5 berubah tanpa JSON Tahap 5 dibangun ulang", tambah_baris(MIGRASI_T5[-1]), 1, "tahap-5.json: file sumber berubah"),
    ("migration api-t5 000024 (partisi posting) berubah", tambah_baris(MIGRASI_T5[0]), 1, "tahap-5.json: file sumber berubah"),
    ("migration api-t4 000023 berubah: Tahap 4 dan 5 sama-sama menangkapnya", tambah_baris(MIGRASI_T4[-1]), 1, "tahap-5.json: file sumber berubah"),
    ("migration baru di labs/api-t5/migrasi yang belum terdaftar di TAHAP[5]",
     lambda r: (r / "labs/api-t5/migrasi/000027_baru.up.sql").write_text("ALTER TABLE akun ADD COLUMN x int;\n", encoding="utf-8"),
     1, "migration lab belum terdaftar di TAHAP[5]: labs/api-t5/migrasi/000027_baru.up.sql"),
    ("JSON Tahap 5 hilang", lambda r: (r / JSON5).unlink(), 1, "tahap-5.json: belum ada"),
    ("tabel baru dihapus dari selisih Tahap 5",
     ubah_json(lambda d: d["selisih"]["tabel_baru"].remove("sakelar"), JSON5), 1, "tahap-5.json: selisih tidak sama"),
    ("kolom baru dihapus dari selisih Tahap 5",
     ubah_json(lambda d: d["selisih"]["kolom_baru"].pop(), JSON5), 1, "tahap-5.json: selisih tidak sama"),
    ("foreign key dihapus dikeluarkan dari selisih Tahap 5",
     ubah_json(lambda d: d["selisih"]["aturan_berubah"].remove(next(a for a in d["selisih"]["aturan_berubah"] if a["jenis"] == "fk")), JSON5), 1, "tahap-5.json: selisih tidak sama"),
    ("partisi dikeluarkan dari selisih Tahap 5",
     ubah_json(lambda d: d["selisih"]["aturan_berubah"].remove(next(a for a in d["selisih"]["aturan_berubah"] if a["jenis"] == "partisi")), JSON5), 1, "tahap-5.json: selisih tidak sama"),
    ("tabel dihapus diisi tangan di Tahap 5 yang hanya menambah",
     ubah_json(lambda d: d["selisih"]["tabel_dihapus"].append({"nama": "outbox", "pindah_ke": "pengumuman"}), JSON5), 1, "tahap-5.json: selisih tidak sama"),
    ("foreign key di dalam satu service dihapus tangan dari tahap-5.json: selisih menangkapnya",
     ubah_json(lambda d: next(t for t in d["tabel"] if t["nama"] == "akun")["fk"].clear(), JSON5), 1, "tahap-5.json: selisih tidak sama"),
    ("foreign key lintas service dikembalikan tangan ke tahap-5.json",
     ubah_json(lambda d: next(t for t in d["tabel"] if t["nama"] == "buku")["fk"].append(
         {"nama": "buku_akun_id_fkey", "kolom": ["akun_id"], "ke_tabel": "akun", "ke_kolom": ["id"], "saat_hapus": "NO ACTION"}), JSON5), 1, "tahap-5.json: selisih tidak sama"),
    ("tahap-4.json diubah tangan dengan format sah: selisih Tahap 5 menangkapnya",
     ubah_json(lambda d: next(t for t in d["tabel"] if t["nama"] == "outbox")["kolom"][1].update(tipe="text"), JSON4), 1, "tahap-5.json: selisih tidak sama"),
    # Partisi (keputusan 1670): bentuk `partisi` diperiksa periksa(); partisi bukan tabel.
    ("partisi dengan kunci yang tidak memuat kolom PK",
     ubah_json(lambda d: next(t for t in d["tabel"] if t["nama"] == "posting")["partisi"].update(kunci="RANGE (jumlah)"), JSON5), 1, "tidak memuat kolom PK"),
    ("partisi yang juga tampil sebagai tabel",
     ubah_json(lambda d: next(t for t in d["tabel"] if t["nama"] == "posting")["partisi"].update(anak=["akun", "posting_sebelum"]), JSON5), 1, "juga tampil sebagai tabel"),
    ("partisi tanpa nama anak",
     ubah_json(lambda d: next(t for t in d["tabel"] if t["nama"] == "posting")["partisi"].update(anak=[]), JSON5), 1, "harus daftar nama partisi"),
    ("partisi dengan nama anak tidak terurut",
     ubah_json(lambda d: next(t for t in d["tabel"] if t["nama"] == "posting")["partisi"]["anak"].reverse(), JSON5), 1, "tidak terurut atau ganda"),
    ("kunci tambahan di partisi",
     ubah_json(lambda d: next(t for t in d["tabel"] if t["nama"] == "posting")["partisi"].update(batas="x"), JSON5), 1, "partisi: kunci harus"),
    # Pembagian service Tahap 5 dan foreign key lintas yang dihapus layanan.sql.
    ("layanan.sql berubah tanpa JSON service dibangun ulang", tambah_baris(LAYANAN_SQL), 1, "service-tahap-5.json: labs/api-t5/layanan.sql berubah"),
    ("JSON service hilang", lambda r: (r / JSONS5).unlink(), 1, "service-tahap-5.json: belum ada"),
    ("JSON service diubah tangan tanpa format erd.py",
     lambda r: (r / JSONS5).write_text(json.dumps(json.loads((r / JSONS5).read_text())), encoding="utf-8"), 1, "service-tahap-5.json: format"),
    ("satu tabel pindah service di JSON service",
     ubah_json(lambda d: (d["modul"][0]["tabel"].remove("outbox"), d["modul"][1]["tabel"].append("outbox")), JSONS5), 1, "service-tahap-5.json: isi tidak sama"),
    ("istilah JSON service diganti jadi modul",
     ubah_json(lambda d: d.update(istilah="modul"), JSONS5), 1, "service-tahap-5.json: isi tidak sama"),
    ("istilah JSON service bukan modul atau service",
     ubah_json(lambda d: d.update(istilah="layanan"), JSONS5), 1, "istilah"),
    ("foreign key lintas disisipkan di JSON service",
     ubah_json(lambda d: d["lintas"].append({"tabel": "buku", "fk": "buku_akun_id_fkey", "ke_tabel": "akun", "dari_modul": "ledger", "ke_modul": "akun"}), JSONS5), 1, "service-tahap-5.json: isi tidak sama"),
    ("rekaman lab: jumlah foreign key lintas di judul diubah",
     ubah_teks(REKAMAN, "SEBELUM dihapus, dibaca dari katalog PostgreSQL: 18", "SEBELUM dihapus, dibaca dari katalog PostgreSQL: 17"), 1, "tidak sama dengan rekaman lab"),
    ("rekaman lab: satu baris foreign key lintas dihapus",
     ubah_teks(REKAMAN, "  merchant.qr -> ledger.jurnal\n", ""), 1, "tidak sama dengan rekaman lab"),
    ("rekaman lab: satu foreign key lintas ditambah",
     ubah_teks(REKAMAN, "  notifikasi.perangkat -> akun.akun\n", "  notifikasi.perangkat -> akun.akun\n  notifikasi.perangkat -> ledger.jurnal\n"), 1, "tidak sama dengan rekaman lab"),
    ("rekaman lab: baris judul daftar foreign key lintas hilang",
     ubah_teks(REKAMAN, "# foreign key lintas schema service SEBELUM dihapus", "# foreign key lintas schema SEBELUM dihapus"), 1, "butuh tepat satu baris"),
    ("rekaman lab hilang", lambda r: (r / REKAMAN).unlink(), 1, "tidak bisa diperiksa"),
]

gagal = 0
for nama, ubah, harap, wajib in KASUS:
    with tempfile.TemporaryDirectory() as tmp:
        root = pathlib.Path(tmp)
        for rel in sorted({f for c in erd.TAHAP.values() for f in erd.semua_file(c)}) + [JSON1, JSON2, JSON3, JSON4, JSON5, JSONM, JSONS5, MODUL_SQL, LAYANAN_SQL, REKAMAN]:
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
# hitung_modul (ERD4): pembagian modul dibaca dari modul.sql tanpa database; salinan yang diubah harus gagal, bukan lolos palsu.
def modul_salinan(ubah):
    """hitung_modul pada salinan yang modul.sql-nya diubah `ubah(teks)`."""
    with tempfile.TemporaryDirectory() as tmp:
        root = pathlib.Path(tmp)
        for rel in (MODUL_SQL, JSON4):
            (root / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(AKAR / rel, root / rel)
        p = root / MODUL_SQL
        p.write_text(ubah(p.read_text(encoding="utf-8")), encoding="utf-8")
        return erd.hitung_modul(4, root)


def hapus_baris(awal):
    return lambda t: "\n".join(b for b in t.splitlines() if not b.startswith(awal)) + "\n"


ASLI_MODUL = erd.hitung_modul(4)
SELISIH += [
    ("modul.sql asli: enam modul 6 + 4 + 1 + 4 + 5 + 2 tabel",
     lambda: [(m["nama"], len(m["tabel"])) for m in ASLI_MODUL["modul"]],
     [("ledger", 6), ("akun", 4), ("identitas", 1), ("merchant", 4), ("pembayaran", 5), ("platform", 2)]),
    ("modul.sql asli: 21 foreign key menyeberang, 14 ke modul akun dan 7 ke tabel jurnal",
     lambda: (len(ASLI_MODUL["lintas"]), sum(x["ke_modul"] == "akun" for x in ASLI_MODUL["lintas"]),
              sum(x["ke_tabel"] == "jurnal" for x in ASLI_MODUL["lintas"])), (21, 14, 7)),
    ("pembagian modul dari modul.sql lolos periksa_modul", lambda: erd.periksa_modul(ASLI_MODUL, 4), []),
    ("tabel tanpa pernyataan SET SCHEMA ditolak", lambda: modul_salinan(hapus_baris("ALTER TABLE {s}.qr ")), SystemExit),
    ("tabel dipindah dua kali ditolak",
     lambda: modul_salinan(lambda t: t + "ALTER TABLE {s}.qr SET SCHEMA t4m_platform;\n"), SystemExit),
    ("tabel dipindah ke schema yang tidak dibuat ditolak",
     lambda: modul_salinan(lambda t: t.replace("{s}.qr SET SCHEMA t4m_merchant", "{s}.qr SET SCHEMA t4m_gaib")), SystemExit),
    ("tabel yang tidak ada di tahap-4.json ditolak",
     lambda: modul_salinan(lambda t: t + "ALTER TABLE {s}.tabel_gaib SET SCHEMA t4m_platform;\n"), SystemExit),
    ("pernyataan yang dikomentari tidak dihitung",
     lambda: modul_salinan(lambda t: t.replace("ALTER TABLE {s}.qr SET SCHEMA t4m_merchant;", "-- ALTER TABLE {s}.qr SET SCHEMA t4m_merchant;")), SystemExit),
    ("pernyataan di dalam komentar blok tidak dihitung (keputusan 1257)",
     lambda: modul_salinan(lambda t: t.replace("ALTER TABLE {s}.qr SET SCHEMA t4m_merchant;", "/*\nALTER TABLE {s}.qr SET SCHEMA t4m_merchant;\n*/")), SystemExit),
    ("komentar blok yang tidak menyentuh pernyataan tidak mengubah hasil",
     lambda: modul_salinan(lambda t: "/* satu komentar\ndua baris */\n" + t) == ASLI_MODUL | {"sumber": modul_salinan(lambda t: "/* satu komentar\ndua baris */\n" + t)["sumber"]}, True),
    ("schema tanpa tabel ditolak",
     lambda: modul_salinan(lambda t: t.replace("CREATE SCHEMA t4m_platform;", "CREATE SCHEMA t4m_platform;\nCREATE SCHEMA t4m_kosong;")), SystemExit),
    ("schema ganda ditolak",
     lambda: modul_salinan(lambda t: t.replace("CREATE SCHEMA t4m_platform;", "CREATE SCHEMA t4m_platform;\nCREATE SCHEMA t4m_platform;")), SystemExit),
    ("satu tabel pindah modul mengubah foreign key yang menyeberang",
     lambda: len(modul_salinan(lambda t: t.replace("{s}.baris_pencairan SET SCHEMA t4m_ledger", "{s}.baris_pencairan SET SCHEMA t4m_platform"))["lintas"]), 24),
]
# banding_mermaid (ERD4): blok mermaid naskah 3b dibandingkan dengan JSON; data dan teks buatan, tanpa naskah asli.
def kol(nama, tipe="bigint", wajib=True):
    return {"nama": nama, "tipe": tipe, "wajib": wajib, "bawaan": None}


DATA_M = {"tabel": [
    dict(tabel("akun", "id"), kolom=[kol("id"), kol("nama", "text")], pk=["id"]),
    dict(tabel("anak", "id"), kolom=[kol("id"), kol("akun_id"), kol("waktu", "timestamp with time zone", False)], pk=["id"],
         fk=[{"nama": "anak_akun_id_fkey", "kolom": ["akun_id"], "ke_tabel": "akun", "ke_kolom": ["id"], "saat_hapus": "NO ACTION"}]),
]}
MERMAID = """Teks naskah.

```mermaid
erDiagram
  AKUN ||--o{ ANAK : punya
  AKUN { bigint id PK
    text nama }
  ANAK { bigint id PK
    bigint akun_id FK
    timestamptz waktu }
```
"""
SELISIH += [
    ("blok mermaid yang cocok: tanpa selisih", lambda: erd.banding_mermaid(MERMAID, DATA_M), []),
    ("kolom yang hanya di naskah dilaporkan",
     lambda: erd.banding_mermaid(MERMAID.replace("text nama }", "text nama\n    text email }"), DATA_M), ["akun: kolom hanya di lab [], hanya di naskah ['email']"]),
    ("kolom yang hanya di lab dilaporkan",
     lambda: erd.banding_mermaid(MERMAID.replace("    text nama }", "    }").replace("{ bigint id PK\n    }", "{ bigint id PK }"), DATA_M), ["akun: kolom hanya di lab ['nama'], hanya di naskah []"]),
    ("tipe berbeda: kolom dilaporkan di kedua sisi",
     lambda: erd.banding_mermaid(MERMAID.replace("text nama", "int nama"), DATA_M), ["akun: kolom hanya di lab ['nama'], hanya di naskah ['nama']"]),
    ("urutan kolom berbeda dilaporkan",
     lambda: len(erd.banding_mermaid(MERMAID.replace("bigint akun_id FK\n    timestamptz waktu", "timestamptz waktu\n    bigint akun_id FK"), DATA_M)), 1),
    ("tanda PK yang salah dilaporkan",
     lambda: erd.banding_mermaid(MERMAID.replace("bigint id PK\n    text nama", "bigint id\n    text nama"), DATA_M), ["akun.id: tanda di naskah (kosong), di lab PK"]),
    ("tanda FK yang hilang dilaporkan",
     lambda: erd.banding_mermaid(MERMAID.replace("bigint akun_id FK", "bigint akun_id"), DATA_M), ["anak.akun_id: tanda di naskah (kosong), di lab FK"]),
    ("garis relasi yang hilang di naskah dilaporkan",
     lambda: erd.banding_mermaid(MERMAID.replace("  AKUN ||--o{ ANAK : punya\n", ""), DATA_M), ["relasi anak -> akun: 1 foreign key di lab, 0 garis di naskah"]),
    ("kardinalitas FK boleh kosong di naskah tetapi wajib di lab dilaporkan",
     lambda: len(erd.banding_mermaid(MERMAID.replace("||--o{", "|o--o{"), DATA_M)), 1),
    ("kardinalitas satu per induk di naskah tetapi bukan UNIQUE di lab dilaporkan",
     lambda: len(erd.banding_mermaid(MERMAID.replace("||--o{", "||--o|"), DATA_M)), 1),
    ("entitas di naskah tanpa tabel di lab dilaporkan",
     lambda: erd.banding_mermaid(MERMAID.replace("  ANAK {", "  CUCU { bigint id PK }\n  ANAK {"), DATA_M), ["cucu: entitas di naskah, tidak ada tabel di lab"]),
    ("naskah tanpa blok mermaid ditolak", lambda: erd.banding_mermaid("tidak ada blok", DATA_M), SystemExit),
]
# Penguatan sesudah tinjauan ERD4 (keputusan 1257): empat mutan banding_mermaid dan naskah() lolos uji mutasi peninjau.
# tipe `integer` di lab = `int` di mermaid (ALIAS_TIPE); foreign key gabungan yang salah satu kolomnya boleh kosong = boleh kosong.
DATA_I = {"tabel": [
    dict(tabel("akun", "id"), kolom=[kol("id"), kol("jumlah", "integer")], pk=["id"]),
    dict(tabel("anak", "id"), kolom=[kol("id"), kol("akun_id"), kol("seri", "integer", False)], pk=["id"],
         fk=[{"nama": "anak_akun_fkey", "kolom": ["akun_id", "seri"], "ke_tabel": "akun", "ke_kolom": ["id", "jumlah"], "saat_hapus": "NO ACTION"}]),
]}
MERMAID_I = """```mermaid
erDiagram
  AKUN |o--o{ ANAK : punya
  AKUN { bigint id PK
    int jumlah }
  ANAK { bigint id PK
    bigint akun_id FK
    int seri FK }
```
"""
SELISIH += [
    ("tipe integer di lab sama dengan int di mermaid; foreign key gabungan dengan satu kolom kosong boleh kosong",
     lambda: erd.banding_mermaid(MERMAID_I, DATA_I), []),
    ("foreign key gabungan yang salah satu kolomnya boleh kosong, tetapi naskah menulis wajib, dilaporkan",
     lambda: len(erd.banding_mermaid(MERMAID_I.replace("|o--o{", "||--o{"), DATA_I)), 1),
]


def naskah_salinan(ubah):
    """naskah(4) pada salinan (naskah, JSON Tahap 4, run.py lab) yang diubah `ubah(root)`: (exit code, baris galat salinan tangan)."""
    with tempfile.TemporaryDirectory() as tmp:
        root = pathlib.Path(tmp)
        for rel in ("plan/CERITA-TAHAP-4.md", JSON4, "labs/api-t4/run.py"):
            (root / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(AKAR / rel, root / rel)
        ubah(root)
        keluar = io.StringIO()
        with contextlib.redirect_stdout(keluar):
            kode = erd.naskah(4, root)
        teks = keluar.getvalue()
        return kode, [b.strip() for b in teks.splitlines() if "salinan tangan" in b or b.startswith("NASKAH_3B")]


RUN4 = "labs/api-t4/run.py"
SELISIH += [
    ("naskah(4) pada salinan apa adanya: exit 0, salinan tangan lab sama dengan mermaid dan lab",
     lambda: naskah_salinan(lambda r: None), (0, ["NASKAH_3B di labs/api-t4/run.py: 10 tabel, sama dengan mermaid dan lab"])),
    ("naskah(4): salinan tangan lab tidak sama dengan blok mermaid, exit 1",
     lambda: naskah_salinan(ubah_teks("plan/CERITA-TAHAP-4.md", "    text hash_sebelumnya\n    text hash }", "    text hash_sebelumnya\n    text hash_baru }")),
     (1, ["NASKAH_3B di labs/api-t4/run.py: 10 tabel, tidak sama dengan mermaid dan lab",
          "- audit_log: salinan tangan di run.py tidak sama dengan blok mermaid"])),
    ("naskah(4): kolom tambahan lab (LAB_TAMBAHAN) dihapus dari salinan tangan, exit 1",
     lambda: naskah_salinan(ubah_teks(RUN4, 'LAB_TAMBAHAN = {"topup_bank": ["tujuan_bayar"]}', "LAB_TAMBAHAN = {}")),
     (1, ["NASKAH_3B di labs/api-t4/run.py: 10 tabel, tidak sama dengan mermaid dan lab",
          "- topup_bank: salinan tangan (ditambah LAB_TAMBAHAN) tidak sama dengan kolom lab"])),
    ("naskah(4): kolom di salinan tangan yang tidak ada di lab, exit 1",
     lambda: naskah_salinan(ubah_teks(RUN4, '"kartu": ["id", "akun_id", "token_penerbit", "empat_digit", "status", "batas_harian"]',
                                      '"kartu": ["id", "akun_id", "token_penerbit", "empat_digit", "status", "batas_harian", "gaib"]'))[0], 1),
    ("naskah(4) tanpa run.py lab: tidak ada pemeriksaan salinan, exit 0",
     lambda: naskah_salinan(lambda r: (r / RUN4).unlink()), (0, [])),
]
# ERD5 (keputusan 1670-1672): partisi, nama aturan yang bergeser, banding mermaid gaya Tahap 5, pembagian service, FK lintas.
def aturan(nama, kolom, ke="akun", ke_kolom=("id",)):
    return {"nama": nama, "kolom": list(kolom), "ke_tabel": ke, "ke_kolom": list(ke_kolom), "saat_hapus": "NO ACTION"}


def dengan(t, **kv):
    return {**t, **kv}


TP_LAMA = dengan(tabel("posting", "id", "jurnal_id"), pk=["id"], fk=[aturan("posting_jurnal_id_fkey", ["jurnal_id"], "jurnal")],
                 cek=[{"nama": "posting_jumlah_check", "kolom": ["id"], "ekspresi": "id <> 0"}])
TP_BARU = dengan(TP_LAMA, pk=["id", "dibuat"], partisi={"kunci": "RANGE (dibuat)", "anak": ["posting_a", "posting_b"]},
                 fk=[aturan("posting_jurnal_id_fkey1", ["jurnal_id"], "jurnal")],
                 cek=[{"nama": "posting_jumlah_check1", "kolom": ["id"], "ekspresi": "id <> 0"}])
SELISIH += [
    ("tabel dibuat ulang: nama FK dan CHECK bergeser dengan isi sama tidak dihitung, PK dan partisi tetap tercatat",
     lambda: erd.selisih_aturan("posting", TP_LAMA, TP_BARU), [
         {"tabel": "posting", "jenis": "pk", "nama": "pk", "ubah": "berubah"},
         {"tabel": "posting", "jenis": "partisi", "nama": "partisi", "ubah": "baru"}]),
    ("nama FK bergeser tetapi tabel tujuan berbeda: dihapus dan baru",
     lambda: erd.selisih_aturan("posting", TP_LAMA, dengan(TP_LAMA, fk=[aturan("posting_jurnal_id_fkey1", ["jurnal_id"], "buku")])), [
         {"tabel": "posting", "jenis": "fk", "nama": "posting_jurnal_id_fkey", "ubah": "dihapus"},
         {"tabel": "posting", "jenis": "fk", "nama": "posting_jurnal_id_fkey1", "ubah": "baru"}]),
    ("nama sama, isi berbeda: berubah (bukan pergeseran nama)",
     lambda: erd.selisih_aturan("posting", TP_LAMA, dengan(TP_LAMA, cek=[{"nama": "posting_jumlah_check", "kolom": ["id"], "ekspresi": "id > 0"}])),
     [{"tabel": "posting", "jenis": "cek", "nama": "posting_jumlah_check", "ubah": "berubah"}]),
    ("dua aturan hilang dan dua baru dengan isi sama: dipasangkan satu-satu, sisanya tercatat",
     lambda: erd.selisih_aturan("t", dengan(tabel("t", "a", "b"), fk=[aturan("f1", ["a"]), aturan("f2", ["a"]), aturan("f3", ["b"])]),
                                dengan(tabel("t", "a", "b"), fk=[aturan("g1", ["a"]), aturan("g3", ["b"])])),
     [{"tabel": "t", "jenis": "fk", "nama": "f2", "ubah": "dihapus"}]),
    ("partisi hilang dan berubah tercatat",
     lambda: [erd.selisih_aturan("t", TP_BARU, TP_LAMA)[-1]["ubah"], erd.selisih_aturan("t", TP_BARU, dengan(TP_BARU, partisi={"kunci": "RANGE (id)", "anak": ["x"]}))[-1]["ubah"]],
     ["dihapus", "berubah"]),
    ("periksa(): tabel berpartisi dengan kunci PK lolos; tanpa PK ditolak",
     lambda: [erd.periksa({"format": 1, "tahap": 5, "postgres": 17, "sumber": {"file": ["a"], "pembanding": [], "sha256": "0" * 64},
                           "tabel": [dengan(TP_BARU, kolom=TP_BARU["kolom"] + [kol("dibuat")]), tabel("jurnal", "id")], "selisih": None}, 5),
              erd.periksa({"format": 1, "tahap": 5, "postgres": 17, "sumber": {"file": ["a"], "pembanding": [], "sha256": "0" * 64},
                           "tabel": [dengan(TP_BARU, kolom=TP_BARU["kolom"] + [kol("dibuat")], pk=[]), tabel("jurnal", "id")], "selisih": None}, 5)],
     [[], ["posting.partisi: kunci partisi 'RANGE (dibuat)' tidak memuat kolom PK (PostgreSQL mensyaratkannya)"]]),
]
# banding_mermaid: PK gabungan, blok sebagian untuk tabel lama, dan garis putus-putus (naskah Tahap 5).
DATA_5 = {"selisih": {"tabel_baru": ["ruang"]}, "tabel": [
    dict(tabel("akun", "id"), kolom=[kol("id"), kol("nama", "text"), kol("mitra_id", "bigint", False)], pk=["id"]),
    dict(tabel("ruang", "id"), kolom=[kol("akun_id"), kol("periode", "date"), kol("saldo")], pk=["akun_id", "periode"],
         fk=[{"nama": "ruang_akun_id_fkey", "kolom": ["akun_id"], "ke_tabel": "akun", "ke_kolom": ["id"], "saat_hapus": "NO ACTION"}]),
    dict(tabel("lain", "id"), kolom=[kol("id"), kol("akun_id")], pk=["id"],
         fk=[{"nama": "lain_akun_id_fkey", "kolom": ["akun_id"], "ke_tabel": "akun", "ke_kolom": ["id"], "saat_hapus": "NO ACTION"}]),
]}
MERMAID_5 = """```mermaid
erDiagram
  AKUN ||--o{ RUANG : punya
  AKUN |o..o{ ANAK_TANPA_FK : melayani
  AKUN { bigint mitra_id }
  RUANG { bigint akun_id PK
    date periode PK
    bigint saldo }
```
"""
SELISIH += [
    ("naskah gaya Tahap 5: PK gabungan, blok sebagian untuk tabel lama, tabel lama tanpa garis: tanpa selisih",
     lambda: erd.banding_mermaid(MERMAID_5, DATA_5), []),
    ("blok sebagian: tipe kolom tabel lama salah dilaporkan",
     lambda: erd.banding_mermaid(MERMAID_5.replace("bigint mitra_id", "text mitra_id"), DATA_5), ["akun: kolom hanya di lab ['id', 'nama', 'mitra_id'], hanya di naskah ['mitra_id']"]),
    ("blok sebagian: kolom yang tidak ada di lab dilaporkan",
     lambda: erd.banding_mermaid(MERMAID_5.replace("bigint mitra_id }", "bigint mitra_id\n    bigint gaib }"), DATA_5), ["akun: kolom hanya di lab ['id', 'nama'], hanya di naskah ['gaib']"]),
    ("tabel baru wajib lengkap: kolom yang hilang di blok dilaporkan",
     lambda: erd.banding_mermaid(MERMAID_5.replace("    bigint saldo }", "    }"), DATA_5), ["ruang: kolom hanya di lab ['saldo'], hanya di naskah []"]),
    ("tabel yang tidak baru dan lengkap: urutan kolom berbeda tetap dilaporkan",
     lambda: len(erd.banding_mermaid(MERMAID_5.replace("AKUN { bigint mitra_id }", "AKUN { text nama\n    bigint id PK\n    bigint mitra_id }"), DATA_5)), 1),
    ("PK gabungan: tanda PK yang hilang di salah satu kolom dilaporkan",
     lambda: erd.banding_mermaid(MERMAID_5.replace("date periode PK", "date periode"), DATA_5), ["ruang.periode: tanda di naskah (kosong), di lab PK"]),
    ("kolom PK gabungan yang juga FK ditandai PK (PK lebih dulu dari FK)",
     lambda: erd.banding_mermaid(MERMAID_5.replace("bigint akun_id PK", "bigint akun_id FK"), DATA_5), ["ruang.akun_id: tanda di naskah FK, di lab PK"]),
    ("garis putus-putus yang ternyata punya foreign key di lab dilaporkan",
     lambda: erd.banding_mermaid(MERMAID_5.replace("ANAK_TANPA_FK", "LAIN"), DATA_5), ["relasi lain -> akun: garis putus-putus di naskah (tanpa foreign key), tetapi lab punya foreign key"]),
    ("garis putus-putus ke arah sebaliknya juga dibaca (induk dan anak ditukar)",
     lambda: erd.banding_mermaid(MERMAID_5.replace("AKUN |o..o{ ANAK_TANPA_FK", "LAIN |o..o{ AKUN"), DATA_5), ["relasi akun -> lain: garis putus-putus di naskah (tanpa foreign key), tetapi lab punya foreign key"]),
    ("foreign key tabel baru yang tidak digambar naskah dilaporkan",
     lambda: erd.banding_mermaid(MERMAID_5.replace("  AKUN ||--o{ RUANG : punya\n", ""), DATA_5), ["relasi ruang -> akun: 1 foreign key di lab, 0 garis di naskah"]),
    ("garis solid di naskah tanpa foreign key di lab dilaporkan",
     lambda: erd.banding_mermaid(MERMAID_5.replace("RUANG : punya", "RUANG : punya\n  AKUN ||--o{ LAIN : punya"), dict(DATA_5, tabel=[dict(t, fk=[]) if t["nama"] == "lain" else t for t in DATA_5["tabel"]])),
     ["relasi lain -> akun: 0 foreign key di lab, 1 garis di naskah"]),
]
# hapus_fk_lintas, periksa_hapus_lintas, lintas_direkam (ERD5): aturan layanan.sql langkah 2 tanpa database.
PETA_UJI = {"akun": "t5_akun", "buku": "t5_ledger", "jurnal": "t5_ledger", "posting": "t5_ledger"}
TABEL_UJI = [dengan(tabel("akun", "id"), pk=["id"]), dengan(tabel("buku", "id", "akun_id"), pk=["id"], fk=[aturan("buku_akun_id_fkey", ["akun_id"])]),
             dengan(tabel("jurnal", "id", "dibuat_oleh"), pk=["id"], fk=[aturan("jurnal_dibuat_oleh_fkey", ["dibuat_oleh"])]),
             dengan(tabel("posting", "id", "buku_id"), pk=["id"], fk=[aturan("posting_buku_id_fkey", ["buku_id"], "buku")])]
LAMA_UJI = {"tahap": 4, "tabel": TABEL_UJI}
AKHIR_UJI, BUANG_UJI = erd.hapus_fk_lintas(TABEL_UJI, PETA_UJI)
BARU_UJI = {"tahap": 5, "tabel": AKHIR_UJI}
REKAM_UJI = (2, ["ledger.buku -> akun.akun", "ledger.jurnal -> akun.akun"])
SELISIH += [
    ("hapus_fk_lintas membuang yang menyeberang schema dan menyimpan yang di dalam satu schema",
     lambda: ([(t["nama"], [f["nama"] for f in t["fk"]]) for t in AKHIR_UJI], BUANG_UJI),
     ([("akun", []), ("buku", []), ("jurnal", []), ("posting", ["posting_buku_id_fkey"])],
      [("buku", "buku_akun_id_fkey", "akun"), ("jurnal", "jurnal_dibuat_oleh_fkey", "akun")])),
    ("hapus_fk_lintas tidak mengubah masukan", lambda: [len(t["fk"]) for t in TABEL_UJI], [0, 1, 1, 1]),
    ("hapus_fk_lintas: tabel tanpa schema ditolak", lambda: erd.hapus_fk_lintas(TABEL_UJI, {"akun": "t5_akun"}), SystemExit),
    ("periksa_hapus_lintas: hasil sesuai pembagian dan rekaman lab tanpa kesalahan",
     lambda: erd.periksa_hapus_lintas(LAMA_UJI, BARU_UJI, PETA_UJI, "t5_", REKAM_UJI), []),
    ("periksa_hapus_lintas: FK lintas yang masih ada di tahap baru dilaporkan",
     lambda: [("menyeberang schema" in x) for x in erd.periksa_hapus_lintas(LAMA_UJI, LAMA_UJI, PETA_UJI, "t5_", REKAM_UJI)], [True, True, False]),
    ("periksa_hapus_lintas: FK di dalam satu schema ikut hilang dilaporkan",
     lambda: len(erd.periksa_hapus_lintas(LAMA_UJI, {"tahap": 5, "tabel": [dengan(t, fk=[]) for t in AKHIR_UJI]}, PETA_UJI, "t5_", REKAM_UJI)), 1),
    ("periksa_hapus_lintas: rekaman lab kurang satu baris dilaporkan",
     lambda: len(erd.periksa_hapus_lintas(LAMA_UJI, BARU_UJI, PETA_UJI, "t5_", (2, ["ledger.buku -> akun.akun"]))), 1),
    ("periksa_hapus_lintas: jumlah di judul rekaman tidak sama dengan barisnya dilaporkan",
     lambda: len(erd.periksa_hapus_lintas(LAMA_UJI, BARU_UJI, PETA_UJI, "t5_", (3, REKAM_UJI[1]))), 1),
    ("periksa_hapus_lintas: FK yang namanya bergeser tetapi isinya sama dihitung sama",
     lambda: erd.periksa_hapus_lintas(LAMA_UJI, {"tahap": 5, "tabel": [dengan(t, fk=[dict(f, nama=f["nama"] + "1") for f in t["fk"]]) for t in AKHIR_UJI]}, PETA_UJI, "t5_", REKAM_UJI), []),
    ("lintas_direkam membaca 18 baris dari rekaman lab asli",
     lambda: (erd.lintas_direkam(AKAR, REKAMAN)[0], len(erd.lintas_direkam(AKAR, REKAMAN)[1])), (18, 18)),
]
# hitung_modul(5): pembagian service dibaca dari layanan.sql (30 tabel); partisi yang dipindah lewat DO tidak dihitung.
ASLI_SERVICE = erd.hitung_modul(5)
SELISIH += [
    ("layanan.sql asli: enam service 9 + 5 + 6 + 6 + 2 + 2 tabel",
     lambda: [(m["nama"], len(m["tabel"])) for m in ASLI_SERVICE["modul"]],
     [("ledger", 9), ("akun", 5), ("pembayaran", 6), ("merchant", 6), ("notifikasi", 2), ("cicilan", 2)]),
    ("layanan.sql asli: istilah service, nol foreign key menyeberang, lolos periksa_modul",
     lambda: (ASLI_SERVICE["istilah"], ASLI_SERVICE["lintas"], erd.periksa_modul(ASLI_SERVICE, 5)), ("service", [], [])),
    ("layanan.sql: ALTER TABLE yang dibangkitkan DO (partisi) tidak dihitung sebagai tabel",
     lambda: sum(bool(re.match(r"\s+EXECUTE format\('ALTER TABLE \{s\}\.%I SET SCHEMA", b)) for b in (AKAR / LAYANAN_SQL).read_text().splitlines()), 1),
]
def naskah5_salinan(ubah):
    """naskah(5) pada salinan (naskah dan JSON Tahap 5) yang diubah `ubah(root)`: (exit code, daftar selisih yang dicetak)."""
    with tempfile.TemporaryDirectory() as tmp:
        root = pathlib.Path(tmp)
        for rel in ("plan/CERITA-TAHAP-5.md", JSON5):
            (root / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(AKAR / rel, root / rel)
        ubah(root)
        keluar = io.StringIO()
        with contextlib.redirect_stdout(keluar):
            kode = erd.naskah(5, root)
        return kode, [b.strip() for b in keluar.getvalue().splitlines() if b.startswith("  - ") or "selisih naskah" in b]


NASKAH5 = "plan/CERITA-TAHAP-5.md"
SELISIH += [
    ("naskah(5) apa adanya: nol selisih mermaid naskah 3b dengan lab, exit 0",
     lambda: naskah5_salinan(lambda r: None), (0, ["Tahap 5: 0 selisih naskah 3b dengan lab (lab yang benar)"])),
    ("naskah(5): tipe kolom diubah di naskah",
     lambda: naskah5_salinan(ubah_teks(NASKAH5, "    int versi_kek\n", "    text versi_kek\n"))[1][1:],
     ["- arsip_partisi: kolom hanya di lab ['versi_kek'], hanya di naskah ['versi_kek']"]),
    ("naskah(5): tipe kolom baru tabel lama (akun.mitra_pos_id) diubah di naskah",
     lambda: len(naskah5_salinan(ubah_teks(NASKAH5, "AKUN { bigint mitra_pos_id }", "AKUN { text mitra_pos_id }"))[1]), 2),
    ("naskah(5): tanda PK gabungan dihapus dari satu kolom",
     lambda: naskah5_salinan(ubah_teks(NASKAH5, "    date periode PK\n    bigint saldo\n", "    date periode\n    bigint saldo\n"))[1][1:],
     ["- snapshot_saldo.periode: tanda di naskah (kosong), di lab PK"]),
    ("naskah(5): garis putus-putus diganti garis solid",
     lambda: naskah5_salinan(ubah_teks(NASKAH5, "AKUN |o..o{ JADWAL_CICILAN : menerima", "AKUN |o--o{ JADWAL_CICILAN : menerima"))[1][1:],
     ["- relasi jadwal_cicilan -> akun: 0 foreign key di lab, 1 garis di naskah"]),
    ("naskah(5): garis solid dihapus dari naskah",
     lambda: naskah5_salinan(ubah_teks(NASKAH5, "  JADWAL_CICILAN ||--|{ ANGSURAN : terdiri_dari\n", ""))[1][1:],
     ["- relasi angsuran -> jadwal_cicilan: 1 foreign key di lab, 0 garis di naskah"]),
    ("naskah(5): kolom baru dihapus dari blok tabel baru",
     lambda: naskah5_salinan(ubah_teks(NASKAH5, "    int hari_tagih\n", ""))[1][1:],
     ["- jadwal_cicilan: kolom hanya di lab ['hari_tagih'], hanya di naskah []"]),
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
