"""Lab b3-ledger: ledger double-entry Tahap 2 di PostgreSQL 17 (keputusan 400).

Mengikuti plan/CERITA-TAHAP-2.md bagian 3 dan 3b: tabel akun, buku, jurnal, posting; tiga invarian dijaga database;
lima kejadian naskah; migrasi data v1; tutup buku. Setiap kali dijalankan, schema b3_ledger dan b3_ledger_v1 dibuat
ulang dari nol. Schema lain di database bersama tidak disentuh.

Rekaman di output/ ditulis tanpa waktu, jadi rekaman ulang identik per byte (status, saldo, urutan).
Lab gagal keras bila hasil berbeda dari harapan: saldo, SQLSTATE, constraint, atau urutan kejadian (keputusan 79).

    make -C labs/b3-ledger run      (butuh: Docker, Python 3; PostgreSQL dijalankan lewat labs/b3-race)
"""
import pathlib, re, threading, time
from decimal import Decimal
import psycopg

HERE = pathlib.Path(__file__).parent
OUT = HERE / "output"
SCHEMA, SCHEMA_V1 = "b3_ledger", "b3_ledger_v1"
DSN = "host=127.0.0.1 port=54333 user=lab password=lab dbname=lab application_name=b3-ledger"
NAMA_SQLSTATE = {"23514": "check_violation", "23001": "restrict_violation", "23505": "unique_violation"}
SISTEM, ADMIN, DIMAS, ANI, BUDI, SARI, CITRA = 1, 400, 417, 418, 419, 502, 504


def gagal(pesan):
    raise SystemExit("GAGAL: " + pesan)


def harap(nyata, harus, apa):
    if nyata != harus:
        gagal(f"{apa}: dapat {nyata!r}, harus {harus!r}")


def sambung(schema):
    # search_path lewat parameter koneksi (keputusan 80): SQL yang direkam tetap tanpa nama schema.
    c = psycopg.connect(DSN + f" options=-csearch_path={schema}", autocommit=True)
    c.prepare_threshold = None   # schema dibuat ulang tiap skenario; tanpa prepared statement yang tertinggal
    return c


# ---------- rekaman ----------

baris = []


def catat(teks=""):
    baris.append(teks)


def bagian(judul):
    catat(f"\n# --- {judul} ---")


def tulis(nama, judul):
    versi = Diam.satu("SHOW server_version")
    kepala = [f"-- Lab b3-ledger · {judul}",
              f"-- PostgreSQL {versi} · schema {SCHEMA} · isolation read committed",
              "-- Rekaman dari database bersih: make -C labs/b3-ledger run (keputusan 400)."]
    OUT.mkdir(exist_ok=True)
    teks = "\n".join(l.rstrip() for l in kepala + baris) + "\n"
    (OUT / nama).write_text(teks)
    print("ditulis:", (OUT / nama).relative_to(HERE.parent.parent))
    baris.clear()


def sel(v):
    if v is None:
        return ""
    if isinstance(v, bool):
        return "t" if v else "f"
    return str(v)


def tabel(kolom, isi):
    """Tabel seperti keluaran psql: judul di tengah, angka rata kanan, teks rata kiri."""
    teks = [[sel(v) for v in r] for r in isi]
    lebar = [max([len(k)] + [len(r[i]) for r in teks]) for i, k in enumerate(kolom)]
    angka = [bool(isi) and all(isinstance(r[i], (int, Decimal)) and not isinstance(r[i], bool) or r[i] is None
                               for r in isi)
             for i in range(len(kolom))]
    out = [" " + " | ".join(k.center(w) for k, w in zip(kolom, lebar)),
           "-" + "-+-".join("-" * w for w in lebar) + "-"]
    for r in teks:
        out.append(" " + " | ".join(v.rjust(w) if a else v.ljust(w) for v, w, a in zip(r, lebar, angka)))
    out.append(f"({len(isi)} row{'' if len(isi) == 1 else 's'})")
    return out


class Sesi:
    """Satu koneksi = satu sesi psql. Perintah dan hasilnya masuk rekaman."""

    def __init__(self, schema=SCHEMA, label=""):
        self.conn = sambung(schema)
        self.pid = self.conn.info.backend_pid
        self.awal = f"[{label}] => " if label else "=> "
        self.conn.add_notice_handler(lambda d: catat(f"NOTICE:  {d.message_primary}"))
        self._tunda = None

    def __call__(self, q, tolak=None, tampil=None):
        """Jalankan q. tolak=(sqlstate, constraint) bila PostgreSQL harus menolaknya. Mengembalikan baris hasil."""
        self._tulis_perintah(tampil or q)
        kotak = {}
        t = threading.Thread(target=self._kerja, args=(q, kotak))
        t.start()
        t.join(0.3)
        if t.is_alive():
            tunggu = Diam.tunggu_lock(self.pid)
            if tunggu:
                catat(f"   -- menunggu lock ({tunggu}): transaction lain memegang baris yang sama")
                self._tunda = (t, kotak, tolak)
                return None
            t.join()
        return self._selesai(kotak, tolak)

    def lanjut(self):
        """Perintah yang tadi menunggu lock selesai sesudah lock dilepas."""
        t, kotak, tolak = self._tunda
        self._tunda = None
        t.join(10)
        if t.is_alive():
            gagal("perintah masih menunggu sesudah lock dilepas")
        catat(f"{self.awal.replace('=>', '  ')}(lanjut sesudah lock dilepas)")
        return self._selesai(kotak, tolak)

    def _tulis_perintah(self, q):
        b = q.strip().splitlines()
        catat(self.awal + b[0])
        for l in b[1:]:
            catat(" " * len(self.awal) + l)

    def _kerja(self, q, kotak):
        try:
            cur = self.conn.execute(q)
            kotak["ok"] = (cur.description and [c.name for c in cur.description],
                           cur.fetchall() if cur.description else None, cur.statusmessage)
        except psycopg.Error as e:
            kotak["err"] = e

    def _selesai(self, kotak, tolak):
        if "err" in kotak:
            e = kotak["err"]
            catat(f"ERROR:  {e.diag.message_primary}")
            if e.diag.message_hint:
                catat(f"HINT:  {e.diag.message_hint}")
            kode, nama = e.sqlstate, e.diag.constraint_name
            catat(f"   -- SQLSTATE {kode} {NAMA_SQLSTATE.get(kode, '?')}, constraint {nama}")
            if tolak is None:
                gagal(f"tidak diharapkan ditolak: {e}")
            harap((kode, nama), tolak, "penolakan")
            return None
        if tolak is not None:
            gagal(f"harus ditolak dengan {tolak}")
        kolom, isi, status = kotak["ok"]
        for l in (tabel(kolom, isi) if kolom else [status]):
            catat(l)
        return isi

    def tutup(self):
        self.conn.close()


class Diam:
    """Koneksi pemeriksa: tidak masuk rekaman. Dipakai harap() dan untuk melihat siapa menunggu lock."""
    conn = None

    @classmethod
    def buka(cls):
        cls.conn = sambung(SCHEMA)

    @classmethod
    def semua(cls, q):
        return cls.conn.execute(q).fetchall()

    @classmethod
    def satu(cls, q):
        return cls.conn.execute(q).fetchone()[0]

    @classmethod
    def tunggu_lock(cls, pid, batas=3.0):
        akhir = time.time() + batas
        while time.time() < akhir:
            r = cls.conn.execute("SELECT wait_event_type, wait_event FROM pg_stat_activity WHERE pid = %s",
                                 (pid,)).fetchone()
            if r and r[0] == "Lock":
                return r[1]
            time.sleep(0.05)
        return None


def saldo(buku):
    return Diam.satu(f"SELECT coalesce(sum(jumlah), 0) FROM posting WHERE buku_id = {buku}")


def cache(buku):
    return Diam.satu(f"SELECT saldo_cache FROM buku WHERE id = {buku}")


def buku_akun(akun):
    return Diam.satu(f"SELECT id FROM buku WHERE akun_id = {akun}")


def buku_sistem(jenis):
    return Diam.satu(f"SELECT id FROM buku WHERE akun_id IS NULL AND jenis = '{jenis}'")


def lit(s):
    return "'" + s.replace("'", "''") + "'"


# ---------- schema ----------

def buat_schema():
    """Schema ledger dari schema.sql, dan schema v1 dari labs/api-t1/schema.sql dengan nama schema diganti."""
    with psycopg.connect(DSN, autocommit=True) as c:
        c.execute(f"DROP SCHEMA IF EXISTS {SCHEMA} CASCADE")
        c.execute(f"DROP SCHEMA IF EXISTS {SCHEMA_V1} CASCADE")
        c.execute(f"CREATE SCHEMA {SCHEMA}")
        c.execute(f"SET search_path = {SCHEMA}")
        c.execute((HERE / "schema.sql").read_text())
        v1 = (HERE / "../api-t1/schema.sql").read_text()
        harap(len(re.findall(r"\btahap1\b", v1)) >= 3, True, "api-t1/schema.sql menyebut schema tahap1")
        c.execute(re.sub(r"\btahap1\b", SCHEMA_V1, v1))   # DROP/CREATE/SET search_path ke b3_ledger_v1
    if Diam.conn is None:
        Diam.buka()


# Data v1: potongan kecil akhir uji coba Gedung A (data lab, keputusan 406). Nomor akun dan nama dari seed api-t1.
# Budi: top-up Rp250.000; M4 memotong Rp70.000 tanpa baris; koreksi +Rp70.000; bayar ulang Rp70.000 ke Warung Ani.
# Saldo Warung Ani Rp285.000 dipilih supaya pencairan Rp310.000 di naskah = seluruh saldonya sesudah Budi bayar Rp25.000.
SEED_V1 = """
INSERT INTO akun (id, jenis, nama, email, password_hash, saldo) VALUES
  (400, 'admin',    'Admin Tunjangan', 'admin.tunjangan@lestari.example', '(tidak dipakai lab ini)', 0),
  (417, 'karyawan', 'Dimas',           'dimas@lestari.example',           '(tidak dipakai lab ini)', 35000),
  (418, 'warung',   'Warung Ani',      'warung.ani@lestari.example',      '(tidak dipakai lab ini)', 285000),
  (419, 'karyawan', 'Budi',            'budi@lestari.example',            '(tidak dipakai lab ini)', 180000),
  (502, 'warung',   'Warung Sari',     'warung.sari@lestari.example',     '(tidak dipakai lab ini)', 0);
INSERT INTO topup (akun_id, nominal, admin_id, keterangan) VALUES
  (417, 250000, 400, 'Tunjangan makan minggu 1'),
  (419, 250000, 400, 'Tunjangan makan minggu 1');
INSERT INTO transaksi (dari, ke, jumlah) VALUES
  (417, 418, 45000), (417, 418, 40000), (417, 418, 50000), (417, 418, 35000), (417, 418, 45000),
  (419, 418, 70000);
INSERT INTO koreksi (akun_id, jumlah, alasan, admin_id) VALUES
  (419, 70000, 'Pembayaran Budi ke Warung Ani, Jumat minggu 3 pukul 12.15, gagal di tengah; saldo terpotong tanpa baris transaksi (M4)', 400);
"""

# saldo_cache diperbarui app di transaction yang sama, dari posting jurnal itu sendiri (keputusan 402).
# Dijumlah per buku dulu: UPDATE ... FROM dengan dua baris untuk satu buku hanya memakai salah satunya.
PERBARUI_CACHE = """UPDATE buku b SET saldo_cache = b.saldo_cache + p.jumlah
FROM (SELECT buku_id, sum(jumlah) AS jumlah FROM posting WHERE jurnal_id = {j} GROUP BY buku_id) p
WHERE b.id = p.buku_id;"""


def jurnal(s, jenis, keterangan, oleh, posting, membalik=None, perbarui_cache=True, commit=True, tolak=None):
    """Satu kejadian = satu transaction: jurnal, posting, saldo_cache. tolak berlaku untuk COMMIT."""
    s("BEGIN;")
    kolom = "jenis, keterangan, membalik_jurnal_id, dibuat_oleh" if membalik else "jenis, keterangan, dibuat_oleh"
    nilai = f"{lit(jenis)}, {lit(keterangan)}, {membalik}, {oleh}" if membalik else f"{lit(jenis)}, {lit(keterangan)}, {oleh}"
    j = s(f"INSERT INTO jurnal ({kolom}) VALUES ({nilai}) RETURNING id;")[0][0]
    if posting:
        s("INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES "
          + ", ".join(f"({j}, {b}, {x})" for b, x in posting) + ";")
    if perbarui_cache and posting:
        s(PERBARUI_CACHE.format(j=j))
    if commit:
        s("COMMIT;", tolak=tolak)
    return j


# ---------- A. migrasi ----------

def rekam_migrasi():
    buat_schema()
    v1 = Sesi(SCHEMA_V1)
    v1.conn.execute(SEED_V1)

    catat("-- Data v1 adalah data lab: potongan kecil akhir uji coba Gedung A, nomor akun dari seed api-t1 (keputusan 406).")
    catat(f"-- Tabel v1 ada di schema {SCHEMA_V1}, dibuat dari labs/api-t1/schema.sql apa adanya.")
    bagian("A. v1: saldo adalah kolom")
    v1("SELECT id, jenis, nama, saldo FROM akun ORDER BY id;")
    v1("SELECT id, akun_id, jumlah, admin_id, alasan FROM koreksi;")

    bagian("B. v1: kenapa saldo Budi Rp180.000? Tiga tabel digabung dengan tangan")
    v1("""SELECT 'topup' AS dari_tabel, nominal AS jumlah, keterangan FROM topup WHERE akun_id = 419
UNION ALL
SELECT 'transaksi', -jumlah, 'bayar ke akun ' || ke FROM transaksi WHERE dari = 419
UNION ALL
SELECT 'transaksi', jumlah, 'diterima dari akun ' || dari FROM transaksi WHERE ke = 419
UNION ALL
SELECT 'koreksi', jumlah, alasan FROM koreksi WHERE akun_id = 419
ORDER BY dari_tabel DESC;""")
    r = v1("""SELECT saldo AS kolom_saldo,
       (SELECT coalesce(sum(nominal), 0) FROM topup WHERE akun_id = 419)
     - (SELECT coalesce(sum(jumlah), 0) FROM transaksi WHERE dari = 419)
     + (SELECT coalesce(sum(jumlah), 0) FROM transaksi WHERE ke = 419)
     + (SELECT coalesce(sum(jumlah), 0) FROM koreksi WHERE akun_id = 419) AS dari_tiga_tabel
FROM akun WHERE id = 419;""")
    harap(r, [(180000, 250000)], "saldo Budi v1 lawan tiga tabel")
    catat("-- Tiga tabel menjelaskan Rp250.000, kolom saldo menulis Rp180.000. Rp70.000 yang terpotong saat M4")
    catat("-- tidak punya baris; yang tercatat hanya koreksinya.")
    harap(Diam.satu(f"SELECT sum(saldo) FROM {SCHEMA_V1}.akun"), 500000, "total saldo v1")
    harap(Diam.satu(f"SELECT sum(nominal) FROM {SCHEMA_V1}.topup"), 500000, "total top-up v1")

    bagian("C. Migrasi dalam satu transaction: saldo jadi jurnal pembuka, koreksi jadi jurnal pembalik")
    s = Sesi()
    s("BEGIN;")
    s((HERE / "migrasi_v1.sql").read_text(), tampil=r"\i migrasi_v1.sql")
    s("COMMIT;")

    bagian("D. Jurnal hasil migrasi")
    s("SELECT id, jenis, membalik_jurnal_id AS membalik, dibuat_oleh, keterangan FROM jurnal ORDER BY id;")
    s("""SELECT p.jurnal_id AS jurnal, p.buku_id AS buku, coalesce(a.nama, b.jenis) AS nama_buku, p.jumlah
FROM posting p JOIN buku b ON b.id = p.buku_id LEFT JOIN akun a ON a.id = b.akun_id
ORDER BY p.jurnal_id, p.id;""")

    bagian("E. Saldo tiap akun sebelum dan sesudah migrasi")
    r = s(f"""SELECT v1.id AS akun, v1.nama, v1.saldo AS saldo_v1, b.id AS buku,
       coalesce(sum(p.jumlah), 0) AS jumlah_posting, b.saldo_cache,
       v1.saldo = coalesce(sum(p.jumlah), 0) AND v1.saldo = coalesce(b.saldo_cache, 0) AS sama
FROM {SCHEMA_V1}.akun v1
LEFT JOIN buku b ON b.akun_id = v1.id
LEFT JOIN posting p ON p.buku_id = b.id
GROUP BY v1.id, v1.nama, v1.saldo, b.id
ORDER BY v1.id;""")
    harap([x[-1] for x in r], [True] * 5, "saldo tiap akun sama sebelum dan sesudah migrasi")
    r = s("""SELECT b.id AS buku, b.jenis, coalesce(sum(p.jumlah), 0) AS jumlah_posting
FROM buku b LEFT JOIN posting p ON p.buku_id = b.id
WHERE b.akun_id IS NULL
GROUP BY b.id ORDER BY b.id;""")
    harap(r, [(1, "tunjangan", 0), (2, "kas_pencairan", 0), (3, "pembuka", -500000), (4, "selisih", 0)], "buku sistem")
    catat("-- Buku pembuka menyimpan lawan seluruh saldo v1 (Rp500.000 = total top-up v1). Buku selisih kembali 0:")
    catat("-- potongan M4 dan koreksinya sekarang dua jurnal yang saling membalik.")
    harap(Diam.semua("SELECT id, jenis, membalik_jurnal_id FROM jurnal ORDER BY id"),
          [(1, "pembuka", None), (2, "pembuka", None), (3, "pembuka", None), (4, "selisih", None), (5, "pembalik", 4)],
          "jurnal migrasi")
    s.tutup()
    v1.tutup()
    tulis("migrasi.txt", "migrasi data v1 ke ledger")


# ---------- B. lima kejadian ----------

def rekam_kejadian():
    s = Sesi()
    tunjangan, kas = buku_sistem("tunjangan"), buku_sistem("kas_pencairan")
    budi, ani, sari = buku_akun(BUDI), buku_akun(ANI), buku_akun(SARI)

    bagian("A. Akun baru Tahap 2: Citra (data lab), lalu semua buku")
    s(f"INSERT INTO akun (id, nama, email, peran) VALUES ({CITRA}, 'Citra', 'citra@lestari.example', 'karyawan');")
    citra = s(f"INSERT INTO buku (akun_id, jenis, batas_harian) VALUES ({CITRA}, 'karyawan', 500000) RETURNING id;")[0][0]
    s("SELECT b.id AS buku, b.jenis, a.nama, b.saldo_cache FROM buku b LEFT JOIN akun a ON a.id = b.akun_id ORDER BY b.id;")

    bagian("B. Lima kejadian naskah bagian 3: satu kejadian = satu transaction")
    catat("-- saldo_cache diperbarui di transaction yang sama, dari posting jurnal itu sendiri (keputusan 402).")
    catat(f"\n-- 1. Top-up Rp250.000 ke Budi: buku {tunjangan} tunjangan -250.000, buku {budi} Budi +250.000")
    j_topup = jurnal(s, "topup", "Tunjangan makan minggu 1 Tahap 2", ADMIN, [(tunjangan, -250000), (budi, 250000)])
    catat(f"\n-- 2. Budi bayar Rp25.000 ke Warung Ani: buku {budi} Budi -25.000, buku {ani} Warung Ani +25.000")
    j_bayar = jurnal(s, "bayar", "Bayar makan siang di Warung Ani", BUDI, [(budi, -25000), (ani, 25000)])
    catat(f"\n-- 3. Budi transfer Rp20.000 ke Citra: buku {budi} Budi -20.000, buku {citra} Citra +20.000")
    jurnal(s, "transfer", "Patungan makan siang ke Citra", BUDI, [(budi, -20000), (citra, 20000)])
    harap(saldo(ani), 310000, "saldo Warung Ani sebelum pencairan")
    catat(f"\n-- 4. Pencairan Jumat Rp310.000 (seluruh saldo Warung Ani): buku {ani} -310.000, buku {kas} kas pencairan +310.000")
    jurnal(s, "pencairan", "Pencairan Jumat 15.00 Warung Ani", SISTEM, [(ani, -310000), (kas, 310000)])
    catat(f"\n-- 5a. Salah bayar (data lab): Budi menekan Bayar ke Warung Sari, buku {budi} -15.000, buku {sari} +15.000")
    j_salah = jurnal(s, "bayar", "Bayar makan siang di Warung Sari", BUDI, [(budi, -15000), (sari, 15000)])
    catat(f"\n-- 5b. Admin membalik jurnal {j_salah}: posting cermin, alasan, dan rujukan ke jurnal asal")
    j_balik = jurnal(s, "pembalik",
                     f"Salah bayar: Budi menekan Bayar ke Warung Sari, padahal makan siangnya sudah dibayar ke Warung Ani (jurnal {j_bayar})",
                     ADMIN, [(sari, -15000), (budi, 15000)], membalik=j_salah)
    harap((j_topup, j_salah, j_balik), (6, 10, 11), "nomor jurnal lima kejadian")

    bagian("C. Saldo = jumlah posting, dan cocok dengan saldo_cache")
    r = s("""SELECT b.id AS buku, b.jenis, a.nama, coalesce(sum(p.jumlah), 0) AS saldo, b.saldo_cache,
       coalesce(sum(p.jumlah), 0) = b.saldo_cache AS cocok
FROM buku b LEFT JOIN akun a ON a.id = b.akun_id LEFT JOIN posting p ON p.buku_id = b.id
GROUP BY b.id, a.nama ORDER BY b.id;""")
    harap([(x[0], x[3], x[5]) for x in r],
          [(1, -250000, True), (2, 310000, True), (3, -500000, True), (4, 0, True), (5, 35000, True),
           (6, 0, True), (7, 385000, True), (8, 0, True), (9, 20000, True)], "saldo semua buku")
    r = s("SELECT sum(jumlah) AS jumlah_semua_posting FROM posting;")
    harap(r, [(0,)], "jumlah semua posting")

    bagian("D. Jejak: kejadian apa saja yang membuat saldo Budi jadi Rp385.000 (satu query)")
    r = s(f"""SELECT p.jurnal_id AS jurnal, j.jenis, p.jumlah,
       sum(p.jumlah) OVER (ORDER BY p.dibuat, p.id) AS saldo,
       (SELECT string_agg(coalesce(a2.nama, b2.jenis), ', ')
          FROM posting p2 JOIN buku b2 ON b2.id = p2.buku_id LEFT JOIN akun a2 ON a2.id = b2.akun_id
         WHERE p2.jurnal_id = p.jurnal_id AND p2.buku_id <> p.buku_id) AS lawan,
       j.membalik_jurnal_id AS membalik, j.keterangan
FROM posting p JOIN jurnal j ON j.id = p.jurnal_id
WHERE p.buku_id = (SELECT id FROM buku WHERE akun_id = {BUDI})
ORDER BY p.dibuat, p.id;""")
    harap([(x[0], x[2], x[3]) for x in r],
          [(3, 180000, 180000), (4, -70000, 110000), (5, 70000, 180000), (6, 250000, 430000),
           (7, -25000, 405000), (8, -20000, 385000), (10, -15000, 370000), (11, 15000, 385000)], "jejak Budi")
    catat("-- Jurnal 3-5 dibuat dalam satu transaction migrasi (nilai dibuat sama). Saldo antara Rp110.000 hanya urutan")
    catat("-- baris di dalam transaction itu, bukan saldo yang pernah dilihat Budi. Riwayat sebelum migrasi tetap di tabel v1.")
    s.tutup()
    tulis("kejadian.txt", "lima kejadian sebagai posting, saldo, dan jejak")


# ---------- main ----------

def main():
    rekam_migrasi()
    rekam_kejadian()


if __name__ == "__main__":
    main()
