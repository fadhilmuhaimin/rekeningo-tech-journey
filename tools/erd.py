"""ERD per tahap, dibangun dari skema lab di PostgreSQL sungguhan, bukan ditulis tangan (keputusan 375).

    labs/.venv/bin/python tools/erd.py             # bangun ulang semua tahap (butuh PostgreSQL lab di port LAB_DB_PORT)
    labs/.venv/bin/python tools/erd.py --tahap 1   # satu tahap
    python3 tools/erd.py --cek                     # gerbang, tanpa database: hash sumber, bentuk JSON, selisih
    python3 tools/erd.py --cek --root <salinan>    # dipakai tools/test_erd.py (uji mutasi pada salinan)
    python3 tools/erd.py --naskah 4                # bandingkan blok mermaid naskah 3b dengan JSON (informasi, lab yang benar)

Membangun: file sumber satu tahap dijalankan di schema sementara `erd_t<n>_<pid>` di dalam SATU transaction yang
selalu di-ROLLBACK, lalu katalognya (pg_catalog) dibaca: tabel, kolom, PK, FK, UNIQUE, CHECK, index. Perintah schema
milik file sumber (`DROP SCHEMA tahap1 CASCADE`, `CREATE SCHEMA`, `SET search_path`) dibuang lebih dulu, dan sisa SQL
yang masih menyebut schema (kata SCHEMA, search_path, `tahapN.`, atau nama schema lab yang ada di database) ditolak,
supaya lab lain yang sedang merekam di schema sendiri tidak tersentuh. Pengecualian: atribut fungsi
`SET search_path FROM CURRENT` (ledger Tahap 2), yang menyimpan schema sementara itu sendiri (keputusan 471).
Sesudah setiap file, search_path harus tetap dan transaction tidak boleh memegang lock tabel di schema lain
(keputusan 474), jadi SQL yang lolos pemeriksaan teks tetapi menyentuh lab lain ikut gagal.
`pembanding` adalah jalur kedua ke skema yang sama (mis. file migration); katalognya harus identik dengan `sumber`.

Hasil: situs/data/erd/tahap-<n>.json, deterministik (urutan tetap, tanpa waktu, tanpa nama schema sementara),
dengan daftar file sumber dan sha256 gabungannya. `--cek` gagal bila file sumber berubah tanpa JSON dibangun ulang,
bila bentuk JSON salah, atau bila selisih terhadap tahap sebelumnya tidak sama dengan hitungan ulang dari kedua JSON.

Tahap baru = satu entri di TAHAP. `sebelumnya` membuat erd.py menghitung selisih (tabel baru, tabel dihapus beserta
ke mana isinya pindah, kolom baru, kolom dihapus, kolom berubah, dan aturan (PK, FK, UNIQUE, CHECK, index) yang baru,
dihapus, atau berubah di tabel yang ada di kedua tahap; keputusan 460). Ke mana isi tabel pindah tidak bisa dibaca dari
katalog, jadi ditulis tangan di `pindah`; tabel yang dihapus tanpa entri `pindah` membuat pembangunan gagal.
Kolom yang berganti nama tercatat sebagai kolom dihapus + kolom baru.

Pembagian modul Tahap 4 (ERD4, keputusan 1254): lab t4-modul memecah 22 tabel akhir api-t4 ke enam schema dengan
`ALTER TABLE ... SET SCHEMA` di labs/t4-modul/modul.sql. erd.py membaca pernyataan itu (bukan salinan tangan), menulis
situs/data/erd/modul-tahap-4.json (tabel per modul dan foreign key yang menyeberang schema, dihitung dari tahap-4.json),
dan `--cek` menghitung ulang keduanya dari file sumbernya. ERD tetap satu schema: pembagian hanya informasi.
"""
import hashlib
import json
import os
import pathlib
import re
import sys
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "..", "labs"))  # lab_env: labs/README.md
from lab_env import DB_PORT  # noqa: E402

AKAR = pathlib.Path(__file__).resolve().parent.parent
FORMAT = 1
DSN = os.environ.get("ERD_DATABASE_URL", f"postgres://lab:lab@127.0.0.1:{DB_PORT}/lab?application_name=erd")  # lab lokal

TAHAP = {
    1: {
        # Akhir uji coba Gedung A: schema.sql (tabel koreksi ADR 6 sudah di dalamnya) + batas saldo warung dari M4,
        # yang di minggu 3 ditulis sebagai migration 000005. Rename kolom M6 (000006) dibatalkan 000007, dan
        # 000008 (kolom catatan) adalah latihan lab, bukan kejadian cerita; keduanya tidak ikut.
        "sumber": [
            "labs/api-t1/schema.sql",
            "labs/b4-migration/baru/000005_batas_saldo_warung.up.sql",
        ],
        "pembanding": [
            "labs/b4-migration/migrations/000001_akun_sesi.up.sql",
            "labs/b4-migration/migrations/000002_topup.up.sql",
            "labs/b4-migration/migrations/000003_transaksi.up.sql",
            "labs/b4-migration/baru/000004_koreksi.up.sql",
            "labs/b4-migration/baru/000005_batas_saldo_warung.up.sql",
        ],
        "sebelumnya": None,
        "pindah": {},  # tabel yang dihapus -> ke mana isinya pindah (teks pendek)
    },
    2: {
        # Akhir Tahap 2 di lab api-t2 (keputusan 409-412): akhir Tahap 1, lalu expand (000009-000011), migrate
        # (000012, data saja; di schema kosong hanya membuat akun sistem dan buku sistem), dan contract (000013).
        # Salinan tabel v1 ke schema tahap2_arsip adalah langkah operasional run.py, bukan migration, jadi tidak ikut.
        "sumber": [
            "labs/api-t1/schema.sql",
            "labs/b4-migration/baru/000005_batas_saldo_warung.up.sql",
            "labs/api-t2/migrasi/000009_akun_tahap2.up.sql",
            "labs/api-t2/migrasi/000010_ledger_tabel.up.sql",
            "labs/api-t2/migrasi/000011_ledger_pendukung.up.sql",
            "labs/api-t2/migrasi/000012_ledger_migrasi.up.sql",
            "labs/api-t2/migrasi/000013_saldo_contract.up.sql",
        ],
        # Jalur kedua: database yang dibangun dari migration Tahap 1 (seperti database Raka sejak 1.25), lalu
        # migration Tahap 2 yang sama. 000009 menghapus constraint akun_jenis_check menurut namanya, jadi kedua
        # jalur harus memberi nama yang sama.
        "pembanding": [
            "labs/b4-migration/migrations/000001_akun_sesi.up.sql",
            "labs/b4-migration/migrations/000002_topup.up.sql",
            "labs/b4-migration/migrations/000003_transaksi.up.sql",
            "labs/b4-migration/baru/000004_koreksi.up.sql",
            "labs/b4-migration/baru/000005_batas_saldo_warung.up.sql",
            "labs/api-t2/migrasi/000009_akun_tahap2.up.sql",
            "labs/api-t2/migrasi/000010_ledger_tabel.up.sql",
            "labs/api-t2/migrasi/000011_ledger_pendukung.up.sql",
            "labs/api-t2/migrasi/000012_ledger_migrasi.up.sql",
            "labs/api-t2/migrasi/000013_saldo_contract.up.sql",
        ],
        "sebelumnya": 1,
        # Teks sesudah "Isinya pindah ke". Naskah 3b "Apa yang berubah dan kenapa" menulis pengganti tiap tabel;
        # lab menentukan nasib baris lamanya: 000012 mengubah setiap koreksi jadi jurnal selisih + pembalik dan
        # saldo kolom jadi jurnal pembuka, sedangkan baris topup dan transaksi v1 hanya disalin ke schema arsip
        # (keputusan 411, 412, 470).
        "pindah": {
            "topup": "arsip v1; top-up baru jadi jurnal jenis topup dari buku tunjangan",
            "transaksi": "arsip v1; bayar baru jadi jurnal jenis bayar dengan dua posting",
            "koreksi": "jurnal selisih dan jurnal pembalik yang menunjuk asalnya",
        },
    },
    3: {
        # Akhir Tahap 3 di lab api-t3 (keputusan 950-952, 963): akhir Tahap 2 lalu api-t3 000015-000019 (expand lima
        # rilis; tidak ada contract, jadi tidak ada tabel yang dihapus). Daftar file = urutan `buat_schema()` di
        # labs/api-t3/dasar_t3.py: api-t1/schema.sql, batas saldo warung, SEMUA migration api-t2 (000009-000014), lalu
        # api-t3. 000014 (wajib ganti password) hanya UPDATE data, tanpa struktur, dan lahir sesudah ERD2 dibangun,
        # jadi tidak ada di Tahap 2; di sini ikut supaya daftarnya sama dengan yang dijalankan lab.
        "sumber": [
            "labs/api-t1/schema.sql",
            "labs/b4-migration/baru/000005_batas_saldo_warung.up.sql",
            "labs/api-t2/migrasi/000009_akun_tahap2.up.sql",
            "labs/api-t2/migrasi/000010_ledger_tabel.up.sql",
            "labs/api-t2/migrasi/000011_ledger_pendukung.up.sql",
            "labs/api-t2/migrasi/000012_ledger_migrasi.up.sql",
            "labs/api-t2/migrasi/000013_saldo_contract.up.sql",
            "labs/api-t2/migrasi/000014_wajib_ganti_password.up.sql",
            "labs/api-t3/migrasi/000015_kota_peran_hr.up.sql",
            "labs/api-t3/migrasi/000016_sesi_web.up.sql",
            "labs/api-t3/migrasi/000017_perangkat_outbox.up.sql",
            "labs/api-t3/migrasi/000018_katalog_promo.up.sql",
            "labs/api-t3/migrasi/000019_operasi_sinkron.up.sql",
        ],
        # Jalur kedua seperti Tahap 2: database dari migration Tahap 1 (b4-migration), lalu migration Tahap 2 dan 3 yang
        # sama. 000015 menghapus constraint akun_jenis_check menurut namanya, jadi kedua jalur harus memberi nama sama.
        "pembanding": [
            "labs/b4-migration/migrations/000001_akun_sesi.up.sql",
            "labs/b4-migration/migrations/000002_topup.up.sql",
            "labs/b4-migration/migrations/000003_transaksi.up.sql",
            "labs/b4-migration/baru/000004_koreksi.up.sql",
            "labs/b4-migration/baru/000005_batas_saldo_warung.up.sql",
            "labs/api-t2/migrasi/000009_akun_tahap2.up.sql",
            "labs/api-t2/migrasi/000010_ledger_tabel.up.sql",
            "labs/api-t2/migrasi/000011_ledger_pendukung.up.sql",
            "labs/api-t2/migrasi/000012_ledger_migrasi.up.sql",
            "labs/api-t2/migrasi/000013_saldo_contract.up.sql",
            "labs/api-t2/migrasi/000014_wajib_ganti_password.up.sql",
            "labs/api-t3/migrasi/000015_kota_peran_hr.up.sql",
            "labs/api-t3/migrasi/000016_sesi_web.up.sql",
            "labs/api-t3/migrasi/000017_perangkat_outbox.up.sql",
            "labs/api-t3/migrasi/000018_katalog_promo.up.sql",
            "labs/api-t3/migrasi/000019_operasi_sinkron.up.sql",
        ],
        "sebelumnya": 2,
        "pindah": {},  # Tahap 3 hanya menambah (expand): tidak ada tabel yang dihapus
    },
    4: {
        # Akhir Tahap 4 di lab api-t4 (keputusan 1210, 1254): akhir Tahap 3 lalu api-t4 000020-000023 (expand empat
        # rilis; tidak ada contract, jadi tidak ada tabel yang dihapus). Daftar file = urutan `buat_schema()` di
        # labs/api-t4/dasar_t4.py: api-t1/schema.sql, batas saldo warung, SEMUA migration api-t2 (000009-000014), SEMUA
        # migration api-t3 (000015-000019), lalu api-t4 (000020-000023). Pembagian enam schema per modul (labs/t4-modul,
        # `ALTER TABLE ... SET SCHEMA` sesudah migration ini) bukan bagian skema akhir: ERD tetap satu schema, dan
        # pengelompokannya ditulis di situs/data/erd/modul.json (diperiksa terhadap katalog lab di --cek).
        "sumber": [
            "labs/api-t1/schema.sql",
            "labs/b4-migration/baru/000005_batas_saldo_warung.up.sql",
            "labs/api-t2/migrasi/000009_akun_tahap2.up.sql",
            "labs/api-t2/migrasi/000010_ledger_tabel.up.sql",
            "labs/api-t2/migrasi/000011_ledger_pendukung.up.sql",
            "labs/api-t2/migrasi/000012_ledger_migrasi.up.sql",
            "labs/api-t2/migrasi/000013_saldo_contract.up.sql",
            "labs/api-t2/migrasi/000014_wajib_ganti_password.up.sql",
            "labs/api-t3/migrasi/000015_kota_peran_hr.up.sql",
            "labs/api-t3/migrasi/000016_sesi_web.up.sql",
            "labs/api-t3/migrasi/000017_perangkat_outbox.up.sql",
            "labs/api-t3/migrasi/000018_katalog_promo.up.sql",
            "labs/api-t3/migrasi/000019_operasi_sinkron.up.sql",
            "labs/api-t4/migrasi/000020_akun_tingkat_buku_jenis.up.sql",
            "labs/api-t4/migrasi/000021_topup_bank.up.sql",
            "labs/api-t4/migrasi/000022_verifikasi_qr.up.sql",
            "labs/api-t4/migrasi/000023_kartu_audit.up.sql",
        ],
        # Jalur kedua seperti Tahap 2 dan 3: database dari migration Tahap 1 (b4-migration), lalu migration Tahap 2, 3,
        # dan 4 yang sama.
        "pembanding": [
            "labs/b4-migration/migrations/000001_akun_sesi.up.sql",
            "labs/b4-migration/migrations/000002_topup.up.sql",
            "labs/b4-migration/migrations/000003_transaksi.up.sql",
            "labs/b4-migration/baru/000004_koreksi.up.sql",
            "labs/b4-migration/baru/000005_batas_saldo_warung.up.sql",
            "labs/api-t2/migrasi/000009_akun_tahap2.up.sql",
            "labs/api-t2/migrasi/000010_ledger_tabel.up.sql",
            "labs/api-t2/migrasi/000011_ledger_pendukung.up.sql",
            "labs/api-t2/migrasi/000012_ledger_migrasi.up.sql",
            "labs/api-t2/migrasi/000013_saldo_contract.up.sql",
            "labs/api-t2/migrasi/000014_wajib_ganti_password.up.sql",
            "labs/api-t3/migrasi/000015_kota_peran_hr.up.sql",
            "labs/api-t3/migrasi/000016_sesi_web.up.sql",
            "labs/api-t3/migrasi/000017_perangkat_outbox.up.sql",
            "labs/api-t3/migrasi/000018_katalog_promo.up.sql",
            "labs/api-t3/migrasi/000019_operasi_sinkron.up.sql",
            "labs/api-t4/migrasi/000020_akun_tingkat_buku_jenis.up.sql",
            "labs/api-t4/migrasi/000021_topup_bank.up.sql",
            "labs/api-t4/migrasi/000022_verifikasi_qr.up.sql",
            "labs/api-t4/migrasi/000023_kartu_audit.up.sql",
        ],
        "sebelumnya": 3,
        "pindah": {},  # Tahap 4 hanya menambah (expand): tidak ada tabel yang dihapus
        "modul": "labs/t4-modul/modul.sql",
    },
}

AKSI_FK = {"a": "NO ACTION", "r": "RESTRICT", "c": "CASCADE", "n": "SET NULL", "d": "SET DEFAULT"}
# Perintah schema milik file sumber, satu baris sendiri di luar string dan body fungsi. `SET search_path FROM
# CURRENT` bukan perintah ini: di CREATE FUNCTION ia atribut fungsi (keputusan 471).
PERINTAH_SCHEMA = re.compile(
    r"^\s*(DROP\s+SCHEMA|CREATE\s+SCHEMA|SET\s+search_path(?!\s+FROM\s+CURRENT\b))\b[^;]*;\s*(--.*)?$", re.I | re.M)
MASIH_SCHEMA = re.compile(r"\b(SCHEMA|search_path)\b|\btahap\d+\s*\.", re.I)
# Token SQL: komentar, string, nama bertanda kutip, body dollar-quoted, titik koma, sisanya kode. Cukup untuk memisah
# pernyataan dan tahu mana yang kode; bukan parser SQL. Mengikuti lexer PostgreSQL (scan.l) di empat hal yang membuat
# `--` atau `/*` jatuh di tempat yang salah bila diabaikan (keputusan 474): nama "a--b" (kutip ganda, "" = satu
# kutip), string E'..\'..' (backslash meloloskan kutip), `$` di tengah nama (a$b$c satu nama, bukan awal body), dan
# tag dollar non-ASCII. Komentar /* */ bersarang ditolak di bersihkan(), bukan diikuti.
_NAMA = "A-Za-z0-9_$\u0080-\U0010FFFF"  # ident_cont PostgreSQL: huruf, angka, _, $, byte non-ASCII
TOKEN = re.compile(r"(?P<komentar>--[^\n]*|/\*.*?\*/)"
                   rf"|(?P<teks>(?<![{_NAMA}])[eE]'(?:[^'\\]|\\.|'')*'|'(?:[^']|'')*')"
                   r'|(?P<nama>"(?:[^"]|"")*")'
                   rf"|(?P<dollar>(?<![{_NAMA}])\$(?P<tag>(?:[A-Za-z_]|[^\x00-\x7f])(?:[A-Za-z0-9_]|[^\x00-\x7f])*|)"
                   r"\$.*?\$(?P=tag)\$)"
                   r"""|(?P<titik>;)|(?P<kode>(?:[^-/'$;"eE]|[eE](?!'))+|.)""", re.S)
FUNGSI = re.compile(r"\s*CREATE\s+(?:OR\s+REPLACE\s+)?(?:FUNCTION|PROCEDURE)\b", re.I)
DARI_SEKARANG = re.compile(r"\bSET\s+search_path\s+FROM\s+CURRENT\b", re.I)


def gagal(pesan):
    raise SystemExit(f"GAGAL erd: {pesan}")


def path_json(n, root=AKAR):
    return root / "situs" / "data" / "erd" / f"tahap-{n}.json"


def semua_file(cfg):
    return cfg["sumber"] + [f for f in cfg["pembanding"] if f not in cfg["sumber"]]


def hash_sumber(cfg, root=AKAR):
    h = hashlib.sha256()
    for f in semua_file(cfg):
        p = root / f
        if not p.is_file():
            gagal(f"file sumber tidak ada: {f}")
        h.update(f"{f}\n{hashlib.sha256(p.read_bytes()).hexdigest()}\n".encode())
    return h.hexdigest()


def tulis_json(data):
    return json.dumps(data, ensure_ascii=False, indent=2) + "\n"


# ── Membangun (butuh PostgreSQL) ────────────────────────────────────────────────────────────────────────────────


def token_sql(sql):
    """(jenis, teks) per token; jenis: komentar, teks (string), nama (bertanda kutip), dollar (body), titik, kode. Gabungannya = sql."""
    return [(m.lastgroup, m.group(0)) for m in TOKEN.finditer(sql)]  # lastgroup grup luar: dollar, bukan tag


def bersihkan(sql, f, lain=()):
    """SQL file sumber tanpa perintah schema; gagal bila sisa SQL (di luar komentar) masih menyebut schema.
    Perintah schema yang berbagi baris dengan perintah lain tidak dibuang, jadi ikut gagal di pemeriksaan kedua.
    Perintah di dalam string atau body fungsi tidak dibuang (body tidak diubah diam-diam), jadi ikut gagal juga.
    Satu pengecualian (keputusan 471): `SET search_path FROM CURRENT` sebagai atribut CREATE FUNCTION/PROCEDURE,
    di luar body. Atribut ini menyimpan search_path saat fungsi dibuat, yaitu schema sementara (erd.py memasangnya
    dengan SET LOCAL dan file sumber tidak bisa mengubahnya); `pastikan_fungsi()` memeriksanya sesudah dijalankan.
    `lain`: nama schema yang ada di database saat membangun (mis. b3_ledger, tahap2_arsip); `nama.` ditolak juga."""
    # Perintah schema dicari di salinan yang isi string dan body-nya ditutup (panjang dan baris tetap).
    tutup = "".join(re.sub(r"[^\n]", "x", t) if j in ("teks", "nama", "dollar") else t for j, t in token_sql(sql))
    for m in reversed(list(PERINTAH_SCHEMA.finditer(tutup))):
        sql = sql[:m.start()] + sql[m.end():]
    # Yang diperiksa: semua kecuali komentar, termasuk string dan body fungsi.
    periksa_teks, fungsi = [], None  # fungsi: None = belum tahu jenis pernyataan ini
    for j, t in token_sql(sql):
        if j == "komentar":
            if t.startswith("/*") and "/*" in t[2:]:  # PostgreSQL menutupnya di */ yang lebih jauh dari regex ini
                gagal(f"{f}: komentar /* */ bersarang belum didukung erd.py ({t[:40]!r})")
            continue
        if j == "titik":
            fungsi = None
        elif fungsi is None and t.strip():
            fungsi = j == "kode" and bool(FUNGSI.match(t))
        periksa_teks.append(DARI_SEKARANG.sub(" ", t) if fungsi and j == "kode" else t)
    teks = "".join(periksa_teks)
    m = MASIH_SCHEMA.search(teks)
    if not m and lain:
        m = re.search(r'(?<![\w$.])"?(' + "|".join(map(re.escape, lain)) + r')"?\s*\.', teks, re.I)
    if m:
        gagal(f"{f}: SQL masih menyebut schema ({m.group(0)!r}); erd.py hanya menjalankan DDL tanpa schema")
    return sql


def baca_katalog(cur, schema):
    """Isi schema sementara sebagai daftar tabel. search_path harus sudah = schema, supaya default seperti
    nextval('topup_id_seq'::regclass) ditulis tanpa nama schema sementara."""
    cur.execute("""SELECT c.oid, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                   WHERE n.nspname = %s AND c.relkind IN ('r', 'p') ORDER BY c.oid""", (schema,))
    tabel = []
    for oid, nama in cur.fetchall():
        cur.execute("""SELECT a.attnum, a.attname, format_type(a.atttypid, a.atttypmod), a.attnotnull,
                              pg_get_expr(d.adbin, d.adrelid)
                       FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
                       WHERE a.attrelid = %s AND a.attnum > 0 AND NOT a.attisdropped ORDER BY a.attnum""", (oid,))
        baris = cur.fetchall()
        no = {r[0]: r[1] for r in baris}
        t = {"nama": nama,
             "kolom": [{"nama": r[1], "tipe": r[2], "wajib": r[3], "bawaan": r[4]} for r in baris],
             "pk": [], "fk": [], "unik": [], "cek": [], "index": []}
        cur.execute("""SELECT con.conname, con.contype, con.conkey, con.confkey, ref.relname, refn.nspname,
                              con.confdeltype, pg_get_expr(con.conbin, con.conrelid, true)
                       FROM pg_constraint con
                       LEFT JOIN pg_class ref ON ref.oid = con.confrelid
                       LEFT JOIN pg_namespace refn ON refn.oid = ref.relnamespace
                       WHERE con.conrelid = %s ORDER BY con.conname""", (oid,))
        for conname, jenis, conkey, confkey, ref, refns, hapus, ekspresi in cur.fetchall():
            kolom = [no[k] for k in conkey or []]
            if jenis == "p":
                t["pk"] = kolom
            elif jenis == "f":
                if refns != schema:
                    gagal(f"{nama}.{conname}: foreign key ke schema lain ({refns}.{ref})")
                cur.execute("SELECT attnum, attname FROM pg_attribute WHERE attrelid = %s::regclass",
                            (f'"{schema}"."{ref}"',))
                no_ref = dict(cur.fetchall())
                t["fk"].append({"nama": conname, "kolom": kolom, "ke_tabel": ref,
                                "ke_kolom": [no_ref[k] for k in confkey], "saat_hapus": AKSI_FK[hapus]})
            elif jenis == "u":
                t["unik"].append({"nama": conname, "kolom": kolom})
            elif jenis == "c":
                t["cek"].append({"nama": conname, "kolom": kolom, "ekspresi": ekspresi})
            elif jenis in ("n", "t"):  # NOT NULL (PostgreSQL 18) sudah di kolom.wajib; trigger bukan bagian ERD
                continue
            else:
                gagal(f"{nama}.{conname}: jenis constraint {jenis!r} belum dikenal erd.py")
        # Index yang bukan milik PK/UNIQUE (yang itu sudah tercatat sebagai constraint).
        cur.execute("""SELECT i.relname, x.indisunique, pg_get_indexdef(x.indexrelid)
                       FROM pg_index x JOIN pg_class i ON i.oid = x.indexrelid
                       WHERE x.indrelid = %s AND NOT EXISTS (
                         SELECT 1 FROM pg_constraint c WHERE c.conindid = x.indexrelid AND c.conrelid = x.indrelid
                                                         AND c.contype IN ('p', 'u', 'x'))
                       ORDER BY i.relname""", (oid,))
        for inama, unik, definisi in cur.fetchall():
            m = re.match(r"CREATE (?:UNIQUE )?INDEX \S+ ON (?:ONLY )?\S+ USING (.+)$", definisi)
            if not m:
                gagal(f"{nama}.{inama}: definisi index tidak terbaca: {definisi}")
            t["index"].append({"nama": inama, "unik": unik, "definisi": m.group(1)})
        tabel.append(t)
    if not tabel:
        gagal(f"schema {schema} kosong: file sumber tidak membuat tabel")
    return tabel


def bangun_katalog(cur, schema, files, izin=()):
    """izin: schema sementara lain di transaction yang sama (sumber, saat membangun pembanding)."""
    # Schema lab lain yang ada sekarang (bukan pg_*, bukan information_schema): file sumber tidak boleh menyebutnya.
    cur.execute(r"""SELECT nspname FROM pg_namespace WHERE nspname NOT LIKE 'pg\_%' AND nspname <> 'information_schema'
                    AND nspname NOT LIKE 'erd\_t%' ORDER BY 1""")
    lain = [r[0] for r in cur.fetchall()]
    cur.execute(f'CREATE SCHEMA "{schema}"')
    cur.execute(f'SET LOCAL search_path = "{schema}"')
    cur.execute("SELECT current_setting('search_path')")
    jalur = cur.fetchone()[0]
    for f in files:
        cur.execute(bersihkan((AKAR / f).read_text(encoding="utf-8"), f, lain))
        pastikan_di_schema(cur, f, jalur, [schema, *izin])
    pastikan_fungsi(cur, schema)
    return baca_katalog(cur, schema)


def pastikan_di_schema(cur, f, jalur, izin):
    """Pagar kedua sesudah setiap file (keputusan 474). bersihkan() membaca teks, jadi tidak melihat search_path yang
    diubah lewat string gabungan (`set_config('search' || '_path', ...)`) atau EXECUTE. Di sini yang diperiksa akibatnya:
    search_path masih schema sementara, dan transaction ini tidak memegang lock relasi di schema lain. Membaca,
    menulis, mengubah, atau membuat tabel di schema mana pun memegang lock relasi sampai ROLLBACK, jadi file yang
    menyentuh lab lain gagal di sini sebelum katalog dibaca; ROLLBACK di bangun() membatalkan semuanya."""
    cur.execute("SELECT current_setting('search_path')")
    sekarang = cur.fetchone()[0]
    if sekarang != jalur:
        gagal(f"{f}: search_path berubah jadi {sekarang!r} sesudah file dijalankan (harap {jalur!r})")
    cur.execute(r"""SELECT DISTINCT n.nspname || '.' || c.relname FROM pg_locks l
                    JOIN pg_class c ON c.oid = l.relation JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE l.pid = pg_backend_pid() AND l.locktype = 'relation'
                      AND l.database = (SELECT oid FROM pg_database WHERE datname = current_database())
                      AND n.nspname <> ALL(%s) AND n.nspname NOT LIKE 'pg\_%%' AND n.nspname <> 'information_schema'
                    ORDER BY 1""", (izin,))
    luar = [r[0] for r in cur.fetchall()]
    if luar:
        gagal(f"{f}: menyentuh tabel di luar schema sementara: {', '.join(luar)}")


def pastikan_fungsi(cur, schema):
    """Fungsi dengan `SET search_path FROM CURRENT` (keputusan 471) harus menyimpan schema sementara ini, bukan
    schema lab lain. Fungsi dan trigger tidak masuk ERD; trigger invarian ledger (constraint trigger, contype t)
    dilewati baca_katalog."""
    cur.execute("""SELECT p.proname, c FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace,
                          unnest(p.proconfig) c
                   WHERE n.nspname = %s AND c LIKE 'search\\_path=%%' ORDER BY 1""", (schema,))
    for nama, c in cur.fetchall():
        if c.split("=", 1)[1].strip('"') != schema:
            gagal(f"fungsi {nama}: {c} (harap search_path={schema})")


def beda_pertama(a, b, jalur="tabel"):
    if type(a) is not type(b):
        return f"{jalur}: {a!r} lawan {b!r}"
    if isinstance(a, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a or k not in b:
                return f"{jalur}.{k}: hanya ada di satu sisi"
            d = beda_pertama(a[k], b[k], f"{jalur}.{k}")
            if d:
                return d
        return None
    if isinstance(a, list):
        if len(a) != len(b):
            return f"{jalur}: {len(a)} lawan {len(b)} butir"
        for i, (x, y) in enumerate(zip(a, b)):
            d = beda_pertama(x, y, f"{jalur}[{x.get('nama', i) if isinstance(x, dict) else i}]")
            if d:
                return d
        return None
    return None if a == b else f"{jalur}: {a!r} lawan {b!r}"


def hitung_selisih(lama, baru, pindah):
    """Selisih skema tahap ini terhadap tahap sebelumnya. Murni (tanpa database), jadi --cek bisa menghitung ulang."""
    L = {t["nama"]: t for t in lama["tabel"]}
    B = {t["nama"]: t for t in baru["tabel"]}
    dihapus = [n for n in L if n not in B]
    tanpa_tujuan = [n for n in dihapus if n not in pindah]
    if tanpa_tujuan:
        gagal(f"tabel dihapus tanpa entri `pindah`: {', '.join(tanpa_tujuan)}")
    basi = [n for n in pindah if n not in dihapus]
    if basi:
        gagal(f"entri `pindah` untuk tabel yang tidak dihapus: {', '.join(basi)}")
    s = {"terhadap": lama["tahap"], "tabel_baru": [n for n in B if n not in L],
         "tabel_dihapus": [{"nama": n, "pindah_ke": pindah[n]} for n in dihapus],
         "kolom_baru": [], "kolom_dihapus": [], "kolom_berubah": [], "aturan_berubah": []}
    for n in (n for n in B if n in L):
        kl = {k["nama"]: k for k in L[n]["kolom"]}
        kb = {k["nama"]: k for k in B[n]["kolom"]}
        s["kolom_baru"] += [{"tabel": n, "kolom": k} for k in kb if k not in kl]
        s["kolom_dihapus"] += [{"tabel": n, "kolom": k} for k in kl if k not in kb]
        for k in (k for k in kb if k in kl and kb[k] != kl[k]):
            s["kolom_berubah"].append({"tabel": n, "kolom": k, "sebelum": kl[k], "sesudah": kb[k]})
        s["aturan_berubah"] += selisih_aturan(n, L[n], B[n])
    return s


def selisih_aturan(n, lama, baru):
    """PK, foreign key, UNIQUE, CHECK, dan index yang baru, dihapus, atau berubah isinya di satu tabel yang ada di
    kedua tahap (keputusan 460). Tanpa ini tabel yang hanya mendapat aturan baru (mis. CHECK batas saldo warung di M4,
    index riwayat) tampil "tetap". Aturan dikenali dari namanya; PK tidak bernama di JSON, jadi namanya "pk"."""
    hasil = []
    if lama["pk"] != baru["pk"]:
        ubah = "baru" if not lama["pk"] else "dihapus" if not baru["pk"] else "berubah"
        hasil.append({"tabel": n, "jenis": "pk", "nama": "pk", "ubah": ubah})
    for jenis in ("fk", "unik", "cek", "index"):
        al = {a["nama"]: a for a in lama[jenis]}
        ab = {a["nama"]: a for a in baru[jenis]}
        for nama in sorted(set(al) | set(ab)):
            ubah = "baru" if nama not in al else "dihapus" if nama not in ab else "berubah" if al[nama] != ab[nama] else None
            if ubah:
                hasil.append({"tabel": n, "jenis": jenis, "nama": nama, "ubah": ubah})
    return hasil


def bangun(n):
    try:
        import psycopg
    except ImportError:
        gagal("psycopg tidak ada. Bangun dengan labs/.venv/bin/python (labs/requirements.txt); --cek tidak butuh psycopg")
    cfg = TAHAP[n]
    schema = f"erd_t{n}_{os.getpid()}"
    try:
        conn = psycopg.connect(DSN, connect_timeout=5)
    except psycopg.OperationalError as e:
        gagal(f"PostgreSQL lab tidak terjangkau ({e}). Nyalakan: make -C labs/b3-race up")
    try:
        with conn.cursor() as cur:
            # Satu transaction yang selalu di-ROLLBACK: schema sementara tidak pernah terlihat koneksi lain.
            cur.execute("SET LOCAL lock_timeout = '5s'; SET LOCAL statement_timeout = '60s'")
            cur.execute("SHOW server_version_num")
            versi = int(cur.fetchone()[0]) // 10000
            tabel = bangun_katalog(cur, schema, cfg["sumber"])
            if cfg["pembanding"]:
                banding = bangun_katalog(cur, schema + "_banding", cfg["pembanding"], izin=[schema])
                d = beda_pertama(tabel, banding)
                if d:
                    gagal(f"Tahap {n}: sumber dan pembanding tidak menghasilkan skema yang sama ({d})")
    finally:
        conn.rollback()
        conn.close()
    with psycopg.connect(DSN, autocommit=True, connect_timeout=5) as c2:  # pagar kedua; normalnya tidak ada apa-apa
        c2.execute(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE')
        c2.execute(f'DROP SCHEMA IF EXISTS "{schema}_banding" CASCADE')
        sisa = c2.execute("SELECT count(*) FROM pg_namespace WHERE nspname LIKE %s", (f"erd_t{n}_%",)).fetchone()[0]
    data = {"format": FORMAT, "tahap": n, "postgres": versi,
            "sumber": {"file": cfg["sumber"], "pembanding": cfg["pembanding"], "sha256": hash_sumber(cfg)},
            "tabel": tabel, "selisih": None}
    if cfg["sebelumnya"] is not None:
        data["selisih"] = hitung_selisih(json.loads(path_json(cfg["sebelumnya"]).read_text()), data, cfg["pindah"])
    teks = tulis_json(data)
    if schema in teks:
        gagal("nama schema sementara bocor ke JSON (hasil tidak deterministik)")
    galat = periksa(data, n)
    if galat:
        gagal("JSON baru tidak lolos pemeriksaan:\n  " + "\n  ".join(galat))
    p = path_json(n)
    p.parent.mkdir(parents=True, exist_ok=True)
    lama = p.read_text(encoding="utf-8") if p.exists() else None
    p.write_text(teks, encoding="utf-8")
    fk = sum(len(t["fk"]) for t in tabel)
    if "modul" in cfg:
        pm = path_modul(n)
        md = hitung_modul(n)
        galat_m = periksa_modul(md, n)
        if galat_m:
            gagal("JSON modul tidak lolos pemeriksaan:\n  " + "\n  ".join(galat_m))
        pm.write_text(tulis_json(md), encoding="utf-8")
        print(f"Tahap {n}: {len(md['modul'])} modul, {len(md['lintas'])} foreign key menyeberang schema modul; ditulis {pm.relative_to(AKAR)}")
    print(f"Tahap {n}: {len(tabel)} tabel, {fk} foreign key, PostgreSQL {versi}; "
          f"{'tidak berubah' if lama == teks else 'ditulis'} {p.relative_to(AKAR)}"
          + (f"; pembanding identik ({len(cfg['pembanding'])} file)" if cfg["pembanding"] else "")
          + (f"; PERINGATAN: {sisa} schema erd_t{n}_* lain masih ada" if sisa else ""))


# ── Pembagian modul (Tahap 4) ───────────────────────────────────────────────────────────────────────────────────

PERNYATAAN_PINDAH = re.compile(r"^ALTER\s+TABLE\s+\{s\}\.([a-z_][a-z0-9_]*)\s+SET\s+SCHEMA\s+(t4m_[a-z_]+)\s*;\s*(--.*)?$", re.I | re.M)
PERNYATAAN_SCHEMA = re.compile(r"^CREATE\s+SCHEMA\s+(t4m_[a-z_]+)\s*;\s*(--.*)?$", re.I | re.M)
KUNCI_MODUL = {
    "akar": {"format", "tahap", "sumber", "modul", "lintas"},
    "sumber": {"file", "sha256"},
    "modul": {"nama", "schema", "tabel"},
    "lintas": {"tabel", "fk", "ke_tabel", "dari_modul", "ke_modul"},
}


def path_modul(n, root=AKAR):
    return root / "situs" / "data" / "erd" / f"modul-tahap-{n}.json"


def hitung_modul(n, root=AKAR):
    """Pembagian modul tahap n: dibaca dari pernyataan `ALTER TABLE {s}.<tabel> SET SCHEMA t4m_<modul>` di file lab,
    lalu foreign key yang menyeberang schema dihitung dari tahap-<n>.json (katalog). Murni, tanpa database."""
    rel = TAHAP[n]["modul"]
    teks = (root / rel).read_text(encoding="utf-8")
    kode = "\n".join(re.sub(r"--.*$", "", b) if not b.lstrip().startswith("ALTER TABLE") else b for b in teks.splitlines())
    schema = [m.group(1) for m in PERNYATAAN_SCHEMA.finditer(kode)]
    if len(set(schema)) != len(schema) or not schema:
        gagal(f"{rel}: CREATE SCHEMA kosong atau ganda: {schema}")
    peta, urut = {}, {x: [] for x in schema}
    for m in PERNYATAAN_PINDAH.finditer(kode):
        tabel, ke = m.group(1), m.group(2)
        if ke not in urut:
            gagal(f"{rel}: {tabel} dipindah ke schema {ke} yang tidak dibuat file ini")
        if tabel in peta:
            gagal(f"{rel}: tabel {tabel} dipindah dua kali")
        peta[tabel] = ke
        urut[ke].append(tabel)
    data = json.loads(path_json(n, root).read_text(encoding="utf-8"))
    ada = [t["nama"] for t in data["tabel"]]
    if sorted(peta) != sorted(ada):
        gagal(f"{rel}: tabel yang dipindah tidak sama dengan tabel tahap-{n}.json "
              f"(hanya di modul: {sorted(set(peta) - set(ada))}; belum dibagi: {sorted(set(ada) - set(peta))})")
    kosong = [x for x in schema if not urut[x]]
    if kosong:
        gagal(f"{rel}: schema tanpa tabel: {kosong}")
    modul = [{"nama": x[len("t4m_"):], "schema": x, "tabel": urut[x]} for x in schema]
    lintas = [{"tabel": t["nama"], "fk": f["nama"], "ke_tabel": f["ke_tabel"],
               "dari_modul": peta[t["nama"]][len("t4m_"):], "ke_modul": peta[f["ke_tabel"]][len("t4m_"):]}
              for t in data["tabel"] for f in t["fk"] if peta[t["nama"]] != peta[f["ke_tabel"]]]
    return {"format": FORMAT, "tahap": n, "sumber": {"file": rel, "sha256": hashlib.sha256((root / rel).read_bytes()).hexdigest()},
            "modul": modul, "lintas": lintas}


def periksa_modul(data, n):
    g = []
    if not isinstance(data, dict) or set(data) != KUNCI_MODUL["akar"]:
        return [f"akar: kunci tidak sama dengan {sorted(KUNCI_MODUL['akar'])}"]
    if data["format"] != FORMAT or data["tahap"] != n:
        g.append(f"format/tahap: {data['format']}/{data['tahap']}, harap {FORMAT}/{n}")
    if not isinstance(data["sumber"], dict) or set(data["sumber"]) != KUNCI_MODUL["sumber"]:
        g.append("sumber: kunci salah")
    for i, m in enumerate(data["modul"] if isinstance(data["modul"], list) else []):
        if not isinstance(m, dict) or set(m) != KUNCI_MODUL["modul"] or not m["tabel"] or not NAMA.match(str(m["nama"])):
            g.append(f"modul[{i}]: bentuk salah")
    for i, x in enumerate(data["lintas"] if isinstance(data["lintas"], list) else []):
        if not isinstance(x, dict) or set(x) != KUNCI_MODUL["lintas"] or x["dari_modul"] == x["ke_modul"]:
            g.append(f"lintas[{i}]: bentuk salah atau tidak menyeberang modul")
    return g


# ── Banding dengan blok mermaid naskah (informasi; lab yang benar) ───────────────────────────────────────────────

BLOK_MERMAID = re.compile(r"```mermaid\nerDiagram\n(.*?)```", re.S)
RELASI = re.compile(r"^\s+(\w+) ([|}o{]+)--([|o{]+) (\w+) :", re.M)
ENTITAS = re.compile(r"^  (\w+) \{ ?(.*?) ?\}$", re.S | re.M)
ALIAS_TIPE = {"timestamp with time zone": "timestamptz", "integer": "int"}


def baca_mermaid(teks):
    """Blok erDiagram pertama di teks naskah: ({entitas: [(kolom, tipe, kunci)]}, [(induk, kiri, kanan, anak)])."""
    m = BLOK_MERMAID.search(teks)
    if not m:
        gagal("naskah tidak punya blok ```mermaid erDiagram")
    blok = m.group(1)
    relasi = [(a.lower(), k, r, b.lower()) for a, k, r, b in RELASI.findall(blok)]
    entitas = {}
    for e in ENTITAS.finditer(blok):
        kolom = []
        for baris in e.group(2).split("\n"):
            p = baris.split()
            if len(p) >= 2:
                kolom.append((p[1], p[0], p[2] if len(p) > 2 else ""))
        entitas[e.group(1).lower()] = kolom
    return entitas, relasi


def banding_mermaid(teks, data):
    """Daftar selisih antara blok mermaid naskah dan ERD satu tahap (data = isi tahap-<n>.json): kolom yang hanya di salah
    satu sisi, urutan kolom, tanda PK/FK/UK, pasangan foreign key, dan kardinalitas (FK boleh kosong, satu baris per induk).
    Tabel tanpa entitas di naskah ("tidak berubah") tidak dibandingkan. Murni: tanpa database."""
    entitas, relasi = baca_mermaid(teks)
    tabel = {t["nama"]: t for t in data["tabel"]}
    beda = []
    for n, kolom in entitas.items():
        t = tabel.get(n)
        if t is None:
            beda.append(f"{n}: entitas di naskah, tidak ada tabel di lab")
            continue
        lab = [(k["nama"], ALIAS_TIPE.get(k["tipe"], k["tipe"])) for k in t["kolom"]]
        nas = [(a, b) for a, b, _ in kolom]
        hanya_lab = [k[0] for k in lab if k not in nas]
        hanya_nas = [k[0] for k in nas if k not in lab]
        if hanya_lab or hanya_nas:
            beda.append(f"{n}: kolom hanya di lab {hanya_lab}, hanya di naskah {hanya_nas}")
        elif [k for k in lab if k in nas] != [k for k in nas if k in lab]:
            beda.append(f"{n}: urutan kolom berbeda (lab: {', '.join(k[0] for k in lab)})")
        for nama, _, kunci in kolom:
            pk = t["pk"] == [nama]
            fk = any(nama in f["kolom"] for f in t["fk"])
            uk = any(u["kolom"] == [nama] for u in t["unik"])
            harap = "PK" if pk else "FK" if fk else "UK" if uk else ""
            if kunci != harap and any(k[0] == nama for k in lab):
                beda.append(f"{n}.{nama}: tanda di naskah {kunci or '(kosong)'}, di lab {harap or '(kosong)'}")
    nas_pasang = {}
    for induk, kiri, kanan, anak in relasi:
        nas_pasang.setdefault((anak, induk), []).append((kiri == "|o", kanan.endswith("|")))
    lab_pasang = {}
    for t in data["tabel"]:
        kol = {k["nama"]: k for k in t["kolom"]}
        for f in t["fk"]:
            kosong = any(not kol[c]["wajib"] for c in f["kolom"])
            unik = f["kolom"] == t["pk"] or any(u["kolom"] == f["kolom"] for u in t["unik"]) or any(
                i["unik"] and i["definisi"].startswith("btree (" + ", ".join(f["kolom"]) + ")") for i in t["index"])
            lab_pasang.setdefault((t["nama"], f["ke_tabel"]), []).append((kosong, unik))
    for pasang in sorted(set(nas_pasang) | set(lab_pasang)):
        a, b = sorted(nas_pasang.get(pasang, [])), sorted(lab_pasang.get(pasang, []))
        if len(a) != len(b):
            beda.append(f"relasi {pasang[0]} -> {pasang[1]}: {len(b)} foreign key di lab, {len(a)} garis di naskah")
        elif a != b:
            beda.append(f"relasi {pasang[0]} -> {pasang[1]}: kardinalitas naskah (boleh kosong, satu per induk) {a}, lab {b}")
    return beda


def salinan_lab(n):
    """`NASKAH_3B` dan `LAB_TAMBAHAN` salinan tangan di run.py lab tahap n (hanya Tahap 4), atau None."""
    run = AKAR / "labs" / f"api-t{n}" / "run.py"
    if not run.is_file():
        return None
    m = re.search(r"^NASKAH_3B = (\{.*?^\})\n.*?^LAB_TAMBAHAN = (\{.*?\})", run.read_text(encoding="utf-8"), re.S | re.M)
    if not m:
        return None
    import ast
    return ast.literal_eval(m.group(1)), ast.literal_eval(m.group(2))


def naskah(n):
    """`--naskah N`: cetak selisih naskah dan lab. Exit 1 hanya bila salinan tangan di run.py lab tidak sama dengan blok
    mermaid atau dengan kolom lab (salinan itu yang dipakai lab untuk gagal keras); selisih naskah dan lab hanya
    informasi: skema lab yang benar, naskah diperbarui KONSISTENSI."""
    teks = (AKAR / "plan" / f"CERITA-TAHAP-{n}.md").read_text(encoding="utf-8")
    data = json.loads(path_json(n).read_text(encoding="utf-8"))
    beda = banding_mermaid(teks, data)
    print(f"Tahap {n}: {len(beda)} selisih naskah 3b dengan lab (lab yang benar)")
    for b in beda:
        print(f"  - {b}")
    salin = salinan_lab(n)
    if salin is None:
        return 0
    entitas, _ = baca_mermaid(teks)
    tambahan = salin[1]
    lab = {t["nama"]: [k["nama"] for k in t["kolom"]] for t in data["tabel"]}
    galat = []
    for tabel, kolom in salin[0].items():
        if tabel not in entitas or kolom != [a for a, _, _ in entitas[tabel]]:
            galat.append(f"{tabel}: salinan tangan di run.py tidak sama dengan blok mermaid")
        if sorted(kolom + tambahan.get(tabel, [])) != sorted(lab.get(tabel, [])):
            galat.append(f"{tabel}: salinan tangan (ditambah LAB_TAMBAHAN) tidak sama dengan kolom lab")
    print(f"NASKAH_3B di labs/api-t{n}/run.py: {len(salin[0])} tabel, {'tidak sama' if galat else 'sama'} dengan mermaid dan lab")
    for g in galat:
        print(f"  - {g}")
    return 1 if galat else 0


# ── Memeriksa (tanpa database) ──────────────────────────────────────────────────────────────────────────────────

KUNCI = {
    "akar": {"format", "tahap", "postgres", "sumber", "tabel", "selisih"},
    "sumber": {"file", "pembanding", "sha256"},
    "tabel": {"nama", "kolom", "pk", "fk", "unik", "cek", "index"},
    "kolom": {"nama", "tipe", "wajib", "bawaan"},
    "fk": {"nama", "kolom", "ke_tabel", "ke_kolom", "saat_hapus"},
    "unik": {"nama", "kolom"},
    "cek": {"nama", "kolom", "ekspresi"},
    "index": {"nama", "unik", "definisi"},
    "selisih": {"terhadap", "tabel_baru", "tabel_dihapus", "kolom_baru", "kolom_dihapus", "kolom_berubah",
                "aturan_berubah"},
}
NAMA = re.compile(r"^[a-z_][a-z0-9_]*$")


def periksa(data, n):
    """Daftar kesalahan bentuk; kosong = lolos. Padanan Python dari situs/src/erd/skema.ts."""
    g = []

    def kunci(obj, jenis, jalur):
        if not isinstance(obj, dict):
            g.append(f"{jalur}: harus objek")
            return False
        if set(obj) != KUNCI[jenis]:
            g.append(f"{jalur}: kunci {sorted(obj)} != {sorted(KUNCI[jenis])}")
            return False
        return True

    def teks(v, jalur, pola=None):
        if not isinstance(v, str) or not v or (pola and not pola.match(v)):
            g.append(f"{jalur}: teks tidak sah {v!r}")

    def daftar_kolom(v, jalur, ada):
        if not isinstance(v, list) or not v or any(k not in ada for k in v):
            g.append(f"{jalur}: kolom {v!r} tidak ada di tabel")

    if not kunci(data, "akar", "akar"):
        return g
    if data["format"] != FORMAT or data["tahap"] != n:
        g.append(f"format/tahap: {data['format']}/{data['tahap']}, harap {FORMAT}/{n}")
    if not isinstance(data["postgres"], int) or isinstance(data["postgres"], bool) or data["postgres"] < 10:
        g.append(f"postgres: {data['postgres']!r}")
    if kunci(data["sumber"], "sumber", "sumber"):
        s = data["sumber"]
        if not re.fullmatch(r"[0-9a-f]{64}", str(s["sha256"])):
            g.append("sumber.sha256: bukan sha256")
        if not isinstance(s["file"], list) or not s["file"]:
            g.append("sumber.file: kosong")
    if not isinstance(data["tabel"], list) or not data["tabel"]:
        g.append("tabel: kosong")
        return g
    tabel = {}
    for i, t in enumerate(data["tabel"]):
        if not kunci(t, "tabel", f"tabel[{i}]"):
            continue
        teks(t["nama"], f"tabel[{i}].nama", NAMA)
        if t["nama"] in tabel:
            g.append(f"tabel {t['nama']}: ganda")
        tabel[t["nama"]] = t
    for nama, t in tabel.items():
        ada = set()
        if not isinstance(t["kolom"], list) or not t["kolom"]:
            g.append(f"{nama}.kolom: kosong")
        for k in t["kolom"] if isinstance(t["kolom"], list) else []:
            if not kunci(k, "kolom", f"{nama}.kolom"):
                continue
            teks(k["nama"], f"{nama}.kolom.nama", NAMA)
            teks(k["tipe"], f"{nama}.{k['nama']}.tipe")
            if not isinstance(k["wajib"], bool):
                g.append(f"{nama}.{k['nama']}.wajib: harus boolean")
            if k["bawaan"] is not None:
                teks(k["bawaan"], f"{nama}.{k['nama']}.bawaan")
            if k["nama"] in ada:
                g.append(f"{nama}.{k['nama']}: kolom ganda")
            ada.add(k["nama"])
        if t["pk"]:
            daftar_kolom(t["pk"], f"{nama}.pk", ada)
        for jenis in ("fk", "unik", "cek", "index"):
            if not isinstance(t[jenis], list):
                g.append(f"{nama}.{jenis}: harus daftar")
                continue
            nama_c = [c.get("nama") for c in t[jenis] if isinstance(c, dict)]
            if nama_c != sorted(nama_c):
                g.append(f"{nama}.{jenis}: tidak terurut menurut nama")
            for c in t[jenis]:
                if not kunci(c, jenis, f"{nama}.{jenis}"):
                    continue
                teks(c["nama"], f"{nama}.{jenis}.nama", NAMA)
                if jenis in ("fk", "unik", "cek"):
                    daftar_kolom(c["kolom"], f"{nama}.{c['nama']}", ada)
                if jenis == "fk":
                    ke = tabel.get(c["ke_tabel"])
                    if ke is None:
                        g.append(f"{nama}.{c['nama']}: tabel tujuan {c['ke_tabel']!r} tidak ada")
                    else:
                        daftar_kolom(c["ke_kolom"], f"{nama}.{c['nama']} -> {c['ke_tabel']}",
                                     {k.get("nama") for k in ke["kolom"]})
                    if not isinstance(c["kolom"], list) or len(c["kolom"]) != len(c["ke_kolom"] or []):
                        g.append(f"{nama}.{c['nama']}: jumlah kolom asal dan tujuan berbeda")
                    if c["saat_hapus"] not in AKSI_FK.values():
                        g.append(f"{nama}.{c['nama']}.saat_hapus: {c['saat_hapus']!r}")
                if jenis == "cek":
                    teks(c["ekspresi"], f"{nama}.{c['nama']}.ekspresi")
                if jenis == "index":
                    teks(c["definisi"], f"{nama}.{c['nama']}.definisi")
                    if not isinstance(c["unik"], bool):
                        g.append(f"{nama}.{c['nama']}.unik: harus boolean")
    if data["selisih"] is not None:
        kunci(data["selisih"], "selisih", "selisih")
    return g


def cek(root):
    galat = []
    for n, cfg in sorted(TAHAP.items()):
        p = path_json(n, root)
        rel = p.relative_to(root)
        if not p.exists():
            galat.append(f"{rel}: belum ada. Bangun: labs/.venv/bin/python tools/erd.py --tahap {n}")
            continue
        teks = p.read_text(encoding="utf-8")
        try:
            data = json.loads(teks)
        except json.JSONDecodeError as e:
            galat.append(f"{rel}: bukan JSON ({e})")
            continue
        g = periksa(data, n)
        galat += [f"{rel}: {x}" for x in g]
        if g:
            continue
        if teks != tulis_json(data):
            galat.append(f"{rel}: format bukan keluaran erd.py (diubah tangan?)")
        if data["sumber"]["file"] != cfg["sumber"] or data["sumber"]["pembanding"] != cfg["pembanding"]:
            galat.append(f"{rel}: daftar file sumber berbeda dari TAHAP[{n}] di tools/erd.py")
        if data["sumber"]["sha256"] != hash_sumber(cfg, root):
            galat.append(f"{rel}: file sumber berubah sesudah JSON dibangun. Bangun ulang: "
                         f"labs/.venv/bin/python tools/erd.py --tahap {n}")
        if cfg["sebelumnya"] is None:
            if data["selisih"] is not None:
                galat.append(f"{rel}: selisih harus null (tidak ada tahap sebelumnya)")
        else:
            # Tahap sebelumnya yang hilang atau rusak dilaporkan di gilirannya sendiri; di sini cukup satu baris.
            p_lama = path_json(cfg["sebelumnya"], root)
            try:
                lama = json.loads(p_lama.read_text(encoding="utf-8"))
                hitung = None if periksa(lama, cfg["sebelumnya"]) else hitung_selisih(lama, data, cfg["pindah"])
            except (OSError, json.JSONDecodeError, SystemExit):
                hitung = None
            if hitung is None:
                galat.append(f"{rel}: selisih tidak bisa dihitung ulang, {p_lama.relative_to(root)} tidak terbaca atau tidak sah")
            elif data["selisih"] != hitung:
                galat.append(f"{rel}: selisih tidak sama dengan hitungan ulang dari tahap-{cfg['sebelumnya']}.json")
        if "modul" in cfg:
            pm = path_modul(n, root)
            rm = pm.relative_to(root)
            if not pm.exists():
                galat.append(f"{rm}: belum ada. Bangun: labs/.venv/bin/python tools/erd.py --tahap {n}")
                continue
            try:
                teks_m = pm.read_text(encoding="utf-8")
                md = json.loads(teks_m)
            except (OSError, json.JSONDecodeError) as e:
                galat.append(f"{rm}: bukan JSON ({e})")
                continue
            gm = periksa_modul(md, n)
            galat += [f"{rm}: {x}" for x in gm]
            if gm:
                continue
            if teks_m != tulis_json(md):
                galat.append(f"{rm}: format bukan keluaran erd.py (diubah tangan?)")
            try:
                hitung_m = hitung_modul(n, root)
            except (OSError, SystemExit) as e:
                galat.append(f"{rm}: pembagian modul tidak bisa dihitung ulang dari {cfg['modul']} ({e})")
                continue
            if md["sumber"]["sha256"] != hitung_m["sumber"]["sha256"]:
                galat.append(f"{rm}: {cfg['modul']} berubah sesudah JSON dibangun. Bangun ulang: "
                             f"labs/.venv/bin/python tools/erd.py --tahap {n}")
            elif md != hitung_m:
                galat.append(f"{rm}: isi tidak sama dengan hitungan ulang dari {cfg['modul']} dan tahap-{n}.json")
    if galat:
        print("GAGAL erd --cek:\n  " + "\n  ".join(galat))
        return 1
    ringkas = ", ".join(f"Tahap {n} {len(json.loads(path_json(n, root).read_text())['tabel'])} tabel" for n in sorted(TAHAP))
    modul = ", ".join(f"modul Tahap {n}: {len(json.loads(path_modul(n, root).read_text())['modul'])} schema" for n, c in sorted(TAHAP.items()) if "modul" in c)
    print(f"erd --cek lolos: {ringkas}; hash sumber cocok" + (f"; {modul}" if modul else ""))
    return 0


def main(argv):
    root = pathlib.Path(argv[argv.index("--root") + 1]).resolve() if "--root" in argv else AKAR
    if "--cek" in argv:
        return cek(root)
    if "--naskah" in argv:
        return naskah(int(argv[argv.index("--naskah") + 1]))
    pilih = [int(argv[argv.index("--tahap") + 1])] if "--tahap" in argv else sorted(TAHAP)
    for n in pilih:
        if n not in TAHAP:
            gagal(f"tahap {n} tidak ada di TAHAP")
        bangun(n)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
