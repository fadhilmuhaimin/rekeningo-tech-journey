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
BATAS_DETIK = 30   # pengaman supaya lab tidak macet tanpa akhir; bukan penentu hasil (keputusan 446)


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
        # Ditunggu sampai perintah selesai atau terlihat menunggu lock, mana yang lebih dulu. Perintah yang lambat
        # karena mesin sibuk tetap ditunggu sampai selesai: tidak ada ambang waktu yang menentukan hasil (keputusan 446).
        akhir = time.monotonic() + BATAS_DETIK
        t.join(0.05)
        while t.is_alive():
            tunggu = Diam.menunggu_lock(self.pid)
            if tunggu:
                catat(f"   -- {self.label} menunggu lock ({tunggu}): transaction lain memegang baris yang sama")
                self._tunda = (t, kotak)
                return Hasil(menunggu=True)
            if time.monotonic() > akhir:
                gagal(f"perintah {self.label} tidak selesai dalam {BATAS_DETIK} detik dan tidak menunggu lock: {b[0]}")
            t.join(0.05)
        return self._selesai(kotak)

    def lanjut(self):
        """Perintah yang tadi menunggu lock selesai sesudah lock dilepas."""
        if not self._tunda:
            gagal(f"sesi {self.label} tidak sedang menunggu")
        t, kotak = self._tunda
        self._tunda = None
        t.join(BATAS_DETIK)
        if t.is_alive():
            gagal(f"perintah {self.label} masih menunggu {BATAS_DETIK} detik sesudah lock dilepas")
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
    def menunggu_lock(cls, pid):
        """Jenis lock yang sedang ditunggu backend pid (mis. transactionid), atau None. Disaring pid sesi sendiri,
        jadi sesi agen lain di database bersama tidak terbaca."""
        r = cls.conn.execute("SELECT wait_event_type, wait_event FROM pg_stat_activity WHERE pid = %s",
                             (pid,)).fetchone()
        return r[1] if r and r[0] == "Lock" else None


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


# ---------- B. laporan tutup buku dua perintah ----------

LAPORAN_MUTASI = """SELECT p.buku_id AS buku,
       coalesce(sum(p.jumlah) FILTER (WHERE j.jenis = 'pembuka'), 0) AS saldo_awal,
       coalesce(sum(p.jumlah) FILTER (WHERE j.jenis <> 'pembuka'), 0) AS mutasi
FROM posting p JOIN jurnal j ON j.id = p.jurnal_id
GROUP BY p.buku_id ORDER BY p.buku_id;"""

LAPORAN_SALDO = """SELECT b.id AS buku, coalesce(a.nama, b.jenis) AS nama, b.saldo_cache AS saldo_akhir
FROM buku b LEFT JOIN akun a ON a.id = b.akun_id ORDER BY b.id;"""


def gabung_laporan(mutasi, akhir):
    """Yang dilakukan app sesudah dua perintah: saldo_akhir dibandingkan dengan saldo_awal + mutasi per buku."""
    m = {r[0]: (int(r[1]), int(r[2])) for r in mutasi}
    hasil = []
    for buku, nama, s_akhir in akhir:
        awal, mut = m.get(buku, (0, 0))
        hasil.append((buku, nama, awal, mut, s_akhir, s_akhir - (awal + mut)))
    catat("-- app menggabungkan hasil perintah 1 dan 2 di memori (bukan perintah SQL); selisih = saldo_akhir - (saldo_awal + mutasi):")
    for l in tabel(["buku", "nama", "saldo_awal", "mutasi", "saldo_akhir", "selisih"], hasil):
        catat("--" + l)
    return [(r[0], r[5]) for r in hasil if r[5] != 0]


def laporan(level, selisih_harus, catatan):
    a, b = dua_sesi()
    bagian(f"Laporan di {level}")
    for l in catatan:
        catat("-- " + l)
    a(f"BEGIN ISOLATION LEVEL {level};")
    catat("-- perintah 1: saldo awal dan mutasi per buku, dari posting")
    mutasi = a(LAPORAN_MUTASI).isi
    catat("-- B: Budi bayar Rp25.000 ke Warung Ani, lengkap sampai COMMIT, di antara dua perintah laporan")
    b(f"BEGIN ISOLATION LEVEL {level};")
    tulis_jurnal(b, "bayar", "Bayar nasi goreng", BUDI, [(B_BUDI, -25000), (B_ANI, 25000)], True)
    harap(b("COMMIT;").status, "COMMIT", "COMMIT bayar B")
    catat("-- perintah 2: saldo akhir per buku, dari saldo_cache")
    akhir = a(LAPORAN_SALDO).isi
    harap(a("COMMIT;").status, "COMMIT", "COMMIT laporan A")
    selisih = gabung_laporan(mutasi, akhir)
    harap(selisih, selisih_harus, f"selisih laporan {level}")
    harap(Diam.satu("""SELECT (SELECT count(*) FROM (SELECT jurnal_id FROM posting GROUP BY jurnal_id
                                                      HAVING sum(jumlah) <> 0) x) || ' ' || (SELECT sum(jumlah) FROM posting)"""),
          "0 0", f"semua jurnal seimbang sesudah laporan {level}")
    a.tutup()
    b.tutup()
    return selisih, mutasi


def rekam_laporan():
    selisih, _ = laporan(RC, [(B_BUDI, -25000), (B_ANI, 25000)], [
        "Laporan tutup buku dalam dua perintah, seperti dua fungsi repo: mutasi dari posting, saldo akhir dari saldo_cache.",
        "Di READ COMMITTED setiap perintah memakai snapshot baru."])
    catat("-- Laporan tidak cocok di buku Budi dan Warung Ani, Rp25.000 masing-masing. Setiap jurnal tetap seimbang:")
    catat("-- perintah 1 dibaca sebelum jurnal B COMMIT, perintah 2 sesudahnya.")
    ringkas.append(("laporan", RC, "tidak cocok di 2 buku, selisih Rp25.000", "-", 75000))

    selisih, _ = laporan(RR, [], [
        "Langkah sama persis. Di REPEATABLE READ snapshot diambil saat perintah pertama dan dipakai sampai COMMIT."])
    catat("-- Laporan cocok untuk keadaan sebelum jurnal B. Jurnal B tidak hilang; ia masuk laporan berikutnya:")
    a = Sesi("A")
    a(f"BEGIN ISOLATION LEVEL {RR};")
    mutasi = a(LAPORAN_MUTASI).isi
    akhir = a(LAPORAN_SALDO).isi
    a("COMMIT;")
    harap(gabung_laporan(mutasi, akhir), [], "laporan berikutnya")
    harap([r for r in mutasi if r[0] == B_BUDI], [(B_BUDI, 0, 75000)], "mutasi Budi di laporan berikutnya")
    a.tutup()
    ringkas.append(("laporan", RR, "cocok; bayar B masuk laporan berikutnya", "-", 75000))

    selisih, _ = laporan(SER, [], [
        "Langkah sama, A dan B SERIALIZABLE. A hanya membaca: tidak ada siklus, dua-duanya COMMIT."])
    catat("-- Hasilnya sama dengan REPEATABLE READ.")
    ringkas.append(("laporan", SER, "cocok", "-", 75000))
    tulis("laporan.txt", "laporan tutup buku saat jurnal baru masuk", PENGANTAR_DATA)


# ---------- C. dua transfer bersamaan ----------

def baca_saldo(s, level, nama):
    h = s(f"BEGIN ISOLATION LEVEL {level};")
    harap(h.status, "BEGIN", f"BEGIN {nama}")
    return s(f"SELECT sum(jumlah) AS saldo_budi FROM posting WHERE buku_id = {B_BUDI};").isi[0][0]


def cek_app(s, saldo_dilihat, jumlah):
    cukup = saldo_dilihat >= jumlah
    catat(f"-- app {s.label}: saldo {saldo_dilihat} {'>=' if cukup else '<'} {jumlah}, "
          + ("lanjut menulis jurnal" if cukup else "tolak \"saldo kurang\""))
    return cukup


def transfer_ulang(s, level, ke, jumlah, nama, cache_):
    """Kode transfer dengan retry: seluruh transaction diulang dari awal bila SQLSTATE 40001, paling banyak 3 kali.
    Dijalankan tanpa selingan (transaction lain sudah selesai). Mengembalikan (hasil, percobaan ke berapa)."""
    for ke_n in range(2, BATAS_PERCOBAAN + 1):
        catat(f"-- app {s.label}: ulang transaction dari awal, percobaan {ke_n}")
        dilihat = baca_saldo(s, level, nama)
        if not cek_app(s, dilihat, jumlah):
            s("ROLLBACK;")
            return "saldo kurang", ke_n
        h, _ = tulis_jurnal(s, "transfer", f"Transfer ke {nama}", BUDI, [(B_BUDI, -jumlah), (ke, jumlah)], cache_)
        if h.ok:
            h = s("COMMIT;")
        if h.ok:
            return "COMMIT", ke_n
        s("ROLLBACK;")
        if h.sqlstate != "40001":
            return h.sqlstate, ke_n
    gagal("retry habis")


def akhir_transfer(saldo_harus, cache_harus):
    harap((saldo(B_BUDI), cache(B_BUDI)), (saldo_harus, cache_harus), "saldo Budi akhir skenario")
    catat(f"-- Akhir: saldo Budi dari posting {saldo_harus}, saldo_cache {cache_harus}.")


def transfer_awal(level, cache_):
    """Langkah bersama: A dan B sama-sama membaca saldo Rp100.000 sebelum salah satunya menulis."""
    a, b = dua_sesi()
    sa = baca_saldo(a, level, "Citra")
    sb = baca_saldo(b, level, "Dimas")
    harap((sa, sb), (100000, 100000), "saldo yang dilihat A dan B")
    cek_app(a, sa, 70000)
    ha, _ = tulis_jurnal(a, "transfer", "Transfer ke Citra", BUDI, [(B_BUDI, -70000), (B_CITRA, 70000)], cache_)
    harap(ha.ok, True, "tulis jurnal A")
    cek_app(b, sb, 50000)
    hb, _ = tulis_jurnal(b, "transfer", "Transfer ke Dimas", BUDI, [(B_BUDI, -50000), (B_DIMAS, 50000)], cache_)
    return a, b, hb


PENGANTAR_TRANSFER = [
    "Angka M9: saldo Budi Rp100.000; A transfer Rp70.000 ke Citra, B transfer Rp50.000 ke Dimas.",
    "Kode transfer: BEGIN, baca saldo dari posting, cek di app, INSERT jurnal dan posting, COMMIT. Tanpa lock eksplisit.",
    "Invarian 3 (saldo buku karyawan tidak negatif) diperiksa trigger saat COMMIT (labs/b3-ledger/schema.sql).",
]


def rekam_transfer():
    # READ COMMITTED
    bagian(f"1. {RC}")
    catat("-- Pemeriksaan invarian 3 saat COMMIT B memakai snapshot baru, jadi melihat jurnal A yang sudah COMMIT.")
    a, b, hb = transfer_awal(RC, False)
    harap(hb.ok, True, "tulis jurnal B")
    harap(a("COMMIT;").status, "COMMIT", "COMMIT A")
    harap(b("COMMIT;").sqlstate, "23514", "COMMIT B")
    akhir_transfer(30000, 100000)
    catat("-- B ditolak database (23514), bukan oleh pemeriksaan saldo di app. Kode retry hanya mengulang 40001,")
    catat("-- jadi app B menerima error database, bukan jawaban \"saldo kurang\".")
    catat("-- Bila dua COMMIT dikirim pada saat yang sama, keduanya bisa lolos (labs/b3-ledger/output/batas.txt 2b).")
    ringkas.append(("transfer", RC, "COMMIT B ditolak invarian 3", "23514", 30000))
    a.tutup()
    b.tutup()

    # REPEATABLE READ
    bagian(f"2. {RR}")
    catat("-- Langkah sama. Pemeriksaan invarian 3 saat COMMIT B memakai snapshot B, yang diambil sebelum A COMMIT.")
    a, b, hb = transfer_awal(RR, False)
    harap(hb.ok, True, "tulis jurnal B")
    harap(a("COMMIT;").status, "COMMIT", "COMMIT A")
    harap(b("COMMIT;").status, "COMMIT", "COMMIT B")
    akhir_transfer(-20000, 100000)
    catat("-- Dua-duanya COMMIT tanpa error. A dan B tidak mengubah baris yang sama (keduanya hanya INSERT),")
    catat("-- jadi tidak ada 40001. Invarian 3 lolos di B karena snapshot B belum berisi posting A.")
    ringkas.append(("transfer", RR, "dua-duanya COMMIT", "-", -20000))
    a.tutup()
    b.tutup()

    # SERIALIZABLE
    bagian(f"3. {SER}")
    catat("-- Langkah sama. SERIALIZABLE mencatat apa yang dibaca tiap transaction (SIReadLock) tanpa memblokir.")
    a, b, hb = transfer_awal(SER, False)
    hasil_b = transfer_serializable(a, b, hb)
    akhir_transfer(30000, 100000)
    ringkas.append(("transfer", SER, f"COMMIT B 40001; retry: {hasil_b}", "40001", 30000))
    a.tutup()
    b.tutup()
    tulis("transfer.txt", "dua transfer bersamaan per isolation level", PENGANTAR_DATA + PENGANTAR_TRANSFER + [
        "Bagian ini tidak memperbarui saldo_cache (pola itu di transfer-cache.txt), jadi saldo_cache Budi tetap 100000."])


def transfer_serializable(a, b, hb):
    harap(hb.ok, True, "tulis jurnal B")
    harap(a("COMMIT;").status, "COMMIT", "COMMIT A")
    h = b("COMMIT;")
    harap(h.sqlstate, "40001", "COMMIT B")
    b("ROLLBACK;")
    hasil, n = transfer_ulang(b, SER, B_DIMAS, 50000, "Dimas", False)
    harap((hasil, n), ("saldo kurang", 2), "retry B")
    catat("-- B mendapat jawaban \"saldo kurang\" dari kode app, bukan error database.")
    return "saldo kurang"


# ---------- D. dua transfer dengan saldo_cache ----------

def rekam_transfer_cache():
    pengantar = PENGANTAR_DATA + PENGANTAR_TRANSFER + [
        "Bagian ini memakai pola api-t2 (keputusan 402): saldo_cache diperbarui di transaction yang sama dengan jurnal.",
        "UPDATE baris buku Budi mengunci baris itu sampai COMMIT atau ROLLBACK."]

    bagian(f"1. {RC}")
    a, b, hb = transfer_awal(RC, True)
    harap(hb.menunggu, True, "B menunggu lock baris buku Budi")
    harap(a("COMMIT;").status, "COMMIT", "COMMIT A")
    harap(b.lanjut().ok, True, "UPDATE B sesudah lock dilepas")
    harap(b("COMMIT;").sqlstate, "23514", "COMMIT B")
    akhir_transfer(30000, 30000)
    catat("-- Di READ COMMITTED, UPDATE yang menunggu dijalankan ulang atas versi baris terbaru, lalu invarian 3 menolak B.")
    ringkas.append(("transfer-cache", RC, "B menunggu lock; COMMIT B ditolak invarian 3", "23514", 30000))
    a.tutup()
    b.tutup()

    for nomor, level in ((2, RR), (3, SER)):
        bagian(f"{nomor}. {level}")
        a, b, hb = transfer_awal(level, True)
        harap(hb.menunggu, True, "B menunggu lock baris buku Budi")
        harap(a("COMMIT;").status, "COMMIT", "COMMIT A")
        harap(b.lanjut().sqlstate, "40001", "UPDATE B sesudah A COMMIT")
        b("ROLLBACK;")
        hasil, n = transfer_ulang(b, level, B_DIMAS, 50000, "Dimas", True)
        harap((hasil, n), ("saldo kurang", 2), f"retry B {level}")
        akhir_transfer(30000, 30000)
        catat("-- Baris buku Budi sudah diubah A sesudah snapshot B diambil: B tidak boleh mengubahnya, 40001.")
        catat("-- Percobaan 2 memakai snapshot baru, melihat saldo Rp30.000, dan app menjawab \"saldo kurang\".")
        ringkas.append(("transfer-cache", level, "B menunggu lock, lalu 40001; retry: saldo kurang", "40001", 30000))
        a.tutup()
        b.tutup()
    tulis("transfer-cache.txt", "dua transfer bersamaan, saldo_cache diperbarui di transaction", pengantar)


# ---------- ringkasan ----------

def rekam_ringkasan():
    catat("")
    for l in tabel(["rekaman", "isolation level", "yang terjadi", "SQLSTATE", "saldo_budi"], ringkas):
        catat(l)
    tulis("ringkasan.txt", "ringkasan per isolation level", [
        "Satu baris per skenario dari dirty-read.txt, laporan.txt, transfer.txt, transfer-cache.txt.",
        "saldo_budi = saldo akhir Budi, dihitung dari posting."])


def main():
    rekam_dirty_read()
    rekam_laporan()
    rekam_transfer()
    rekam_transfer_cache()
    rekam_ringkasan()


if __name__ == "__main__":
    main()
