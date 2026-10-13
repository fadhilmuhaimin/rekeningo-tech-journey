"""Lab b3-isolasi versi ledger (halaman 2.12, keputusan 440).

Apa yang benar-benar terjadi di PostgreSQL 17 per isolation level pada ledger Tahap 2. Skema dimuat dari
labs/b3-ledger/schema.sql ke schema b3_isolasi (tidak ada ledger kedua). Dua koneksi, A dan B, dijalankan langkah
demi langkah dari satu thread pengatur: urutan perintah ditentukan skrip, bukan waktu. Perintah yang menunggu lock
dijalankan di thread sendiri dan dideteksi lewat pg_stat_activity, lalu dilanjutkan sesudah lock dilepas.
Setiap skenario mulai dari schema baru.

Rekaman di output/ledger/ ditulis tanpa waktu, jadi rekaman ulang identik per byte (status, saldo, urutan).
Lab gagal keras bila hasil berbeda dari harapan: saldo, SQLSTATE, atau urutan kejadian (keputusan 79).
Rekaman lama (run.py, output/*.txt) dipakai halaman b3-3 versi lama dan tidak disentuh file ini.

    make -C labs/b3-isolasi run-ledger    rekam
    make -C labs/b3-isolasi cek-ledger    rekam ulang; gagal bila berbeda dari yang di-commit atau ada file baru
"""
import pathlib, threading, time
from decimal import Decimal
import psycopg

HERE = pathlib.Path(__file__).parent
OUT = HERE / "output" / "ledger"
SCHEMA = "b3_isolasi"
DSN = "host=127.0.0.1 port=54333 user=lab password=lab dbname=lab"
NAMA_SQLSTATE = {"40001": "serialization_failure", "23514": "check_violation", "25P02": "in_failed_sql_transaction"}
SISTEM, ADMIN, DIMAS, ANI, BUDI, CITRA = 1, 400, 417, 418, 419, 504
B_TUNJANGAN, B_PEMBUKA, B_BUDI, B_ANI, B_CITRA, B_DIMAS = 1, 2, 3, 4, 5, 6
RC, RR, SER, RU = "READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE", "READ UNCOMMITTED"
BATAS_PERCOBAAN = 3


def gagal(pesan):
    raise SystemExit("GAGAL: " + pesan)


def harap(nyata, harus, apa):
    if nyata != harus:
        gagal(f"{apa}: dapat {nyata!r}, harus {harus!r}")


def sambung(nama):
    c = psycopg.connect(DSN + f" application_name=b3-isolasi-{nama} options=-csearch_path={SCHEMA}", autocommit=True)
    c.prepare_threshold = None   # schema dibuat ulang tiap skenario; tanpa prepared statement yang tertinggal
    return c


# ---------- rekaman ----------

baris = []
ringkas = []


def catat(teks=""):
    baris.append(teks)


def bagian(judul):
    catat(f"\n# --- {judul} ---")


def tulis(nama, judul, pengantar):
    versi = Diam.satu("SHOW server_version")
    bawaan = Diam.satu("SHOW default_transaction_isolation")
    kepala = [f"-- Lab b3-isolasi (ledger) · {judul}",
              f"-- PostgreSQL {versi} · schema {SCHEMA} · default_transaction_isolation = {bawaan}",
              "-- Rekaman dari database bersih: make -C labs/b3-isolasi run-ledger (keputusan 440)."]
    kepala += ["-- " + l for l in pengantar]
    OUT.mkdir(parents=True, exist_ok=True)
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
    return out


class Hasil:
    def __init__(self, isi=None, status=None, sqlstate=None, menunggu=False):
        self.isi, self.status, self.sqlstate, self.menunggu = isi, status, sqlstate, menunggu

    @property
    def ok(self):
        return self.sqlstate is None and not self.menunggu


class Sesi:
    """Satu koneksi = satu sesi psql. Perintah dan hasilnya masuk rekaman; hasil dikembalikan, tidak dinilai di sini."""

    def __init__(self, label):
        self.label = label
        self.conn = sambung(label.lower())
        self.pid = self.conn.info.backend_pid
        self.awal = f"[{label}] => "
        self._tunda = None

    def __call__(self, q):
        if self._tunda:
            gagal(f"sesi {self.label} masih menunggu lock, perintah baru tidak boleh dikirim")
        b = q.strip().splitlines()
        catat(self.awal + b[0])
        for l in b[1:]:
            catat(" " * len(self.awal) + l)
        kotak = {}
        t = threading.Thread(target=self._kerja, args=(q, kotak), daemon=True)
        t.start()
        t.join(0.3)
        if t.is_alive():
            tunggu = Diam.tunggu_lock(self.pid)
            if not tunggu:
                gagal(f"perintah {self.label} lama tetapi tidak menunggu lock: {b[0]}")
            catat(f"   -- {self.label} menunggu lock ({tunggu}): transaction lain memegang baris yang sama")
            self._tunda = (t, kotak)
            return Hasil(menunggu=True)
        return self._selesai(kotak)

    def lanjut(self):
        """Perintah yang tadi menunggu lock selesai sesudah lock dilepas."""
        if not self._tunda:
            gagal(f"sesi {self.label} tidak sedang menunggu")
        t, kotak = self._tunda
        self._tunda = None
        t.join(10)
        if t.is_alive():
            gagal(f"perintah {self.label} masih menunggu sesudah lock dilepas")
        catat(f"[{self.label}]    (lanjut sesudah lock dilepas)")
        return self._selesai(kotak)

    def _kerja(self, q, kotak):
        try:
            cur = self.conn.execute(q)
            kotak["ok"] = (cur.description and [c.name for c in cur.description],
                           cur.fetchall() if cur.description else None, cur.statusmessage)
        except psycopg.Error as e:
            kotak["err"] = e

    def _selesai(self, kotak):
        if "err" in kotak:
            e = kotak["err"]
            catat(f"ERROR:  {e.diag.message_primary}")
            if e.diag.message_detail:
                catat(f"DETAIL:  {e.diag.message_detail}")
            if e.diag.message_hint:
                catat(f"HINT:  {e.diag.message_hint}")
            nama = f", constraint {e.diag.constraint_name}" if e.diag.constraint_name else ""
            catat(f"   -- SQLSTATE {e.sqlstate} {NAMA_SQLSTATE.get(e.sqlstate, '?')}{nama}")
            return Hasil(sqlstate=e.sqlstate)
        kolom, isi, status = kotak["ok"]
        if kolom:
            catat("\n".join(tabel(kolom, isi)))
            catat(f"({len(isi)} row{'' if len(isi) == 1 else 's'})")
        else:
            catat(status)
        return Hasil(isi=isi, status=status)

    def tutup(self):
        self.conn.close()


class Diam:
    """Koneksi pemeriksa: tidak masuk rekaman. Dipakai harap() dan untuk melihat siapa menunggu lock."""
    conn = None

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


# ---------- schema dan data ----------

# Data lab (keputusan 441). Saldo Budi Rp100.000 dan dua transfer Rp70.000 + Rp50.000 adalah angka M9 naskah.
# Warung Ani Rp285.000 + bayar Rp25.000 = Rp310.000, angka pencairan naskah bagian 3 (pola keputusan 406).
SEED = f"""
INSERT INTO akun (id, nama, email, peran) VALUES
  ({SISTEM}, 'Sistem Rekeningo', 'sistem@lestari.example',          'sistem'),
  ({ADMIN},  'Admin Tunjangan',  'admin.tunjangan@lestari.example', 'admin'),
  ({DIMAS},  'Dimas',            'dimas@lestari.example',           'karyawan'),
  ({ANI},    'Warung Ani',       'warung.ani@lestari.example',      'warung'),
  ({BUDI},   'Budi',             'budi@lestari.example',            'karyawan'),
  ({CITRA},  'Citra',            'citra@lestari.example',           'karyawan');
INSERT INTO buku (akun_id, jenis) VALUES
  (NULL, 'tunjangan'), (NULL, 'pembuka'), ({BUDI}, 'karyawan'), ({ANI}, 'warung'), ({CITRA}, 'karyawan'), ({DIMAS}, 'karyawan');
BEGIN;
INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('pembuka', 'Saldo awal per tanggal migrasi', {SISTEM});
INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES (1, {B_PEMBUKA}, -320000), (1, {B_ANI}, 285000), (1, {B_DIMAS}, 35000);
INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('topup', 'Tunjangan makan', {ADMIN});
INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES (2, {B_TUNJANGAN}, -100000), (2, {B_BUDI}, 100000);
UPDATE buku b SET saldo_cache = p.jumlah
FROM (SELECT buku_id, sum(jumlah) AS jumlah FROM posting GROUP BY buku_id) p WHERE b.id = p.buku_id;
COMMIT;
"""

PENGANTAR_DATA = [
    "Persiapan tiap skenario: schema baru dari labs/b3-ledger/schema.sql, lalu dua jurnal (keputusan 441):",
    "  jurnal 1 pembuka: Warung Ani Rp285.000, Dimas Rp35.000; jurnal 2 top-up: Budi Rp100.000.",
    f"  Buku {B_TUNJANGAN} tunjangan, {B_PEMBUKA} pembuka, {B_BUDI} Budi, {B_ANI} Warung Ani, {B_CITRA} Citra, {B_DIMAS} Dimas.",
    "A dan B adalah dua koneksi. Urutan perintah ditentukan skrip, satu langkah per baris, bukan oleh waktu.",
]


def schema_baru():
    with psycopg.connect(DSN + " application_name=b3-isolasi", autocommit=True) as c:
        c.execute(f"DROP SCHEMA IF EXISTS {SCHEMA} CASCADE")
        c.execute(f"CREATE SCHEMA {SCHEMA}")
        c.execute(f"SET search_path = {SCHEMA}")
        c.execute((HERE / "../b3-ledger/schema.sql").read_text())
        c.execute(SEED)
    if Diam.conn is None:
        Diam.conn = sambung("cek")
    harap((saldo(B_BUDI), saldo(B_ANI), cache(B_BUDI), cache(B_ANI)), (100000, 285000, 100000, 285000), "data awal")


def dua_sesi():
    schema_baru()
    return Sesi("A"), Sesi("B")


PERBARUI_CACHE = """UPDATE buku b SET saldo_cache = b.saldo_cache + p.jumlah
FROM (SELECT buku_id, sum(jumlah) AS jumlah FROM posting WHERE jurnal_id = {j} GROUP BY buku_id) p
WHERE b.id = p.buku_id;"""


def tulis_jurnal(s, jenis, keterangan, oleh, posting, perbarui_cache):
    """INSERT jurnal, INSERT posting, lalu (bila diminta) saldo_cache. Berhenti di perintah pertama yang gagal."""
    h = s(f"INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('{jenis}', '{keterangan}', {oleh}) RETURNING id;")
    if not h.ok:
        return h, None
    j = h.isi[0][0]
    h = s("INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES "
          + ", ".join(f"({j}, {b}, {x})" for b, x in posting) + ";")
    if not h.ok or not perbarui_cache:
        return h, j
    return s(PERBARUI_CACHE.format(j=j)), j


# ---------- A. dirty read ----------

def rekam_dirty_read():
    bagian("READ UNCOMMITTED: jurnal yang belum COMMIT tidak terlihat")
    catat("-- B mencatat Budi bayar Rp25.000 ke Warung Ani tanpa COMMIT. A membaca saldo Budi dari posting.")
    a, b = dua_sesi()
    b("BEGIN;")
    tulis_jurnal(b, "bayar", "Bayar nasi goreng", BUDI, [(B_BUDI, -25000), (B_ANI, 25000)], True)
    a(f"BEGIN ISOLATION LEVEL {RU};")
    harap(a("SHOW transaction_isolation;").isi, [("read uncommitted",)], "level yang dilaporkan")
    harap(a(f"SELECT sum(jumlah) AS saldo_budi FROM posting WHERE buku_id = {B_BUDI};").isi, [(100000,)],
          "saldo Budi selagi B belum COMMIT")
    catat("-- A tidak melihat posting B yang belum COMMIT: tidak ada dirty read walau level yang diminta READ UNCOMMITTED.")
    harap(b("COMMIT;").status, "COMMIT", "COMMIT B")
    harap(a(f"SELECT sum(jumlah) AS saldo_budi FROM posting WHERE buku_id = {B_BUDI};").isi, [(75000,)],
          "saldo Budi sesudah B COMMIT")
    catat("-- Perintah kedua A melihat jurnal B yang sudah COMMIT: nonrepeatable read, perilaku READ COMMITTED.")
    a("COMMIT;")
    a.tutup()
    b.tutup()
    ringkas.append(("dirty-read", RU, "posting B tidak terlihat sebelum COMMIT", "-", 75000))
    tulis("dirty-read.txt", "READ UNCOMMITTED di PostgreSQL", PENGANTAR_DATA)


def main():
    rekam_dirty_read()


if __name__ == "__main__":
    main()
