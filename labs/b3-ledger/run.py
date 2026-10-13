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


# ---------- main ----------

def main():
    buat_schema()


if __name__ == "__main__":
    main()
