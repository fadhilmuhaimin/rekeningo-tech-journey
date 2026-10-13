"""ERD per tahap, dibangun dari skema lab di PostgreSQL sungguhan, bukan ditulis tangan (keputusan 375).

    labs/.venv/bin/python tools/erd.py             # bangun ulang semua tahap (butuh PostgreSQL lab 127.0.0.1:54333)
    labs/.venv/bin/python tools/erd.py --tahap 1   # satu tahap
    python3 tools/erd.py --cek                     # gerbang, tanpa database: hash sumber, bentuk JSON, selisih
    python3 tools/erd.py --cek --root <salinan>    # dipakai tools/test_erd.py (uji mutasi pada salinan)

Membangun: file sumber satu tahap dijalankan di schema sementara `erd_t<n>_<pid>` di dalam SATU transaction yang
selalu di-ROLLBACK, lalu katalognya (pg_catalog) dibaca: tabel, kolom, PK, FK, UNIQUE, CHECK, index. Perintah schema
milik file sumber (`DROP SCHEMA tahap1 CASCADE`, `CREATE SCHEMA`, `SET search_path`) dibuang lebih dulu, dan sisa SQL
yang masih menyebut schema ditolak, supaya lab lain yang sedang merekam di schema `tahap1` tidak tersentuh.
`pembanding` adalah jalur kedua ke skema yang sama (mis. file migration); katalognya harus identik dengan `sumber`.

Hasil: situs/data/erd/tahap-<n>.json, deterministik (urutan tetap, tanpa waktu, tanpa nama schema sementara),
dengan daftar file sumber dan sha256 gabungannya. `--cek` gagal bila file sumber berubah tanpa JSON dibangun ulang,
bila bentuk JSON salah, atau bila selisih terhadap tahap sebelumnya tidak sama dengan hitungan ulang dari kedua JSON.

Tahap baru = satu entri di TAHAP. `sebelumnya` membuat erd.py menghitung selisih (tabel baru, tabel dihapus beserta
ke mana isinya pindah, kolom baru, kolom dihapus, kolom berubah). Ke mana isi tabel pindah tidak bisa dibaca dari
katalog, jadi ditulis tangan di `pindah`; tabel yang dihapus tanpa entri `pindah` membuat pembangunan gagal.
Kolom yang berganti nama tercatat sebagai kolom dihapus + kolom baru.
"""
import hashlib
import json
import os
import pathlib
import re
import sys

AKAR = pathlib.Path(__file__).resolve().parent.parent
FORMAT = 1
DSN = os.environ.get("ERD_DATABASE_URL", "postgres://lab:lab@127.0.0.1:54333/lab?application_name=erd")  # lab lokal

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
}

AKSI_FK = {"a": "NO ACTION", "r": "RESTRICT", "c": "CASCADE", "n": "SET NULL", "d": "SET DEFAULT"}
PERINTAH_SCHEMA = re.compile(r"^\s*(DROP\s+SCHEMA|CREATE\s+SCHEMA|SET\s+search_path)\b[^;]*;\s*(--.*)?$", re.I | re.M)
MASIH_SCHEMA = re.compile(r"\b(SCHEMA|search_path)\b|\btahap\d+\s*\.", re.I)


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


def bersihkan(sql, f):
    """SQL file sumber tanpa perintah schema; gagal bila sisa SQL (di luar komentar) masih menyebut schema.
    Perintah schema yang berbagi baris dengan perintah lain tidak dibuang, jadi ikut gagal di pemeriksaan kedua."""
    sql = PERINTAH_SCHEMA.sub("", sql)
    tanpa_komentar = re.sub(r"--[^\n]*", "", sql)
    m = MASIH_SCHEMA.search(tanpa_komentar)
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


def bangun_katalog(cur, schema, files):
    cur.execute(f'CREATE SCHEMA "{schema}"')
    cur.execute(f'SET LOCAL search_path = "{schema}"')
    for f in files:
        cur.execute(bersihkan((AKAR / f).read_text(encoding="utf-8"), f))
    cur.execute(f'SET LOCAL search_path = "{schema}"')  # file sumber tidak boleh mengubahnya, tapi pastikan
    return baca_katalog(cur, schema)


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
         "kolom_baru": [], "kolom_dihapus": [], "kolom_berubah": []}
    for n in (n for n in B if n in L):
        kl = {k["nama"]: k for k in L[n]["kolom"]}
        kb = {k["nama"]: k for k in B[n]["kolom"]}
        s["kolom_baru"] += [{"tabel": n, "kolom": k} for k in kb if k not in kl]
        s["kolom_dihapus"] += [{"tabel": n, "kolom": k} for k in kl if k not in kb]
        for k in (k for k in kb if k in kl and kb[k] != kl[k]):
            s["kolom_berubah"].append({"tabel": n, "kolom": k, "sebelum": kl[k], "sesudah": kb[k]})
    return s


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
                banding = bangun_katalog(cur, schema + "_banding", cfg["pembanding"])
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
    print(f"Tahap {n}: {len(tabel)} tabel, {fk} foreign key, PostgreSQL {versi}; "
          f"{'tidak berubah' if lama == teks else 'ditulis'} {p.relative_to(AKAR)}"
          + (f"; pembanding identik ({len(cfg['pembanding'])} file)" if cfg["pembanding"] else "")
          + (f"; PERINGATAN: {sisa} schema erd_t{n}_* lain masih ada" if sisa else ""))


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
    "selisih": {"terhadap", "tabel_baru", "tabel_dihapus", "kolom_baru", "kolom_dihapus", "kolom_berubah"},
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
            lama = json.loads(path_json(cfg["sebelumnya"], root).read_text(encoding="utf-8"))
            if data["selisih"] != hitung_selisih(lama, data, cfg["pindah"]):
                galat.append(f"{rel}: selisih tidak sama dengan hitungan ulang dari tahap-{cfg['sebelumnya']}.json")
    if galat:
        print("GAGAL erd --cek:\n  " + "\n  ".join(galat))
        return 1
    ringkas = ", ".join(f"Tahap {n} {len(json.loads(path_json(n, root).read_text())['tabel'])} tabel" for n in sorted(TAHAP))
    print(f"erd --cek lolos: {ringkas}; hash sumber cocok")
    return 0


def main(argv):
    root = pathlib.Path(argv[argv.index("--root") + 1]).resolve() if "--root" in argv else AKAR
    if "--cek" in argv:
        return cek(root)
    pilih = [int(argv[argv.index("--tahap") + 1])] if "--tahap" in argv else sorted(TAHAP)
    for n in pilih:
        if n not in TAHAP:
            gagal(f"tahap {n} tidak ada di TAHAP")
        bangun(n)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
