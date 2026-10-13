"""Lab t2-pencairan: job pencairan warung Jumat 15.00 dan rekonsiliasi, M15 dan ADR 19 (keputusan 500-504).

Mengikuti plan/CERITA-TAHAP-2.md: PRD v2 P0 "Pencairan warung terjadwal" (setiap Jumat 15.00, satu file transfer untuk
diunggah Keuangan ke bank, belum ada integrasi bank) dan M15 (file bank Rp15.000 lebih besar dari mutasi ledger karena
job berjalan dua kali sesudah server restart di tengah).

Job ditulis dalam Go (cmd/pencairan, pgx v5.11.0 seperti api-t1). Skrip ini membangun job, membuat schema
t2_pencairan dari labs/b3-ledger/schema.sql + schema.sql, mengisi data lab, menjalankan job, lalu merekam keluaran job,
isi file, dan hasil query. "Server restart di tengah" diperankan flag -berhenti: proses job mematikan dirinya (SIGKILL)
di titik yang disebut, jadi rekaman tidak bergantung pada waktu.

Rekaman di output/ tanpa waktu, jadi rekaman ulang identik per byte. Lab gagal keras bila hasil berbeda dari harapan.

    make -C labs/t2-pencairan run      (butuh: Docker, Python 3, Go; PostgreSQL dijalankan lewat labs/b3-race)
"""
import hashlib, os, pathlib, shutil, subprocess, time
from decimal import Decimal
import psycopg

HERE = pathlib.Path(__file__).parent
OUT = HERE / "output"
KERJA = HERE / "kerja"            # folder file transfer; dibuat ulang tiap skenario, tidak di-commit
BIN = HERE / "bin" / "pencairan"
SCHEMA = "t2_pencairan"
DSN = "host=127.0.0.1 port=54333 user=lab password=lab dbname=lab application_name=t2-pencairan"
APP_JOB = "t2-pencairan-job"
DSN_JOB = f"postgres://lab:lab@127.0.0.1:54333/lab?application_name={APP_JOB}&search_path={SCHEMA}"
PERIODE = "2026-W43"
FILE = f"pencairan-{PERIODE}.csv"
SISTEM, ADMIN, BUDI = 1, 400, 419

# Data lab (keputusan 504). 12 warung naskah: nomor dan nama dari api-t1 (418, 502, 503) dan api-t2 (505-513,
# keputusan 413). Warung Ani Rp310.000 dari naskah bagian 3; angka lain data lab. Warung 508 Rp15.000 adalah warung
# ketujuh, tempat job berhenti, jadi selisihnya sama dengan angka M15.
WARUNG = [
    (418, "Warung Ani", "warung.ani", 310000),
    (502, "Warung Sari", "warung.sari", 185000),
    (503, "Warung Mie Pak Joko", "warung.joko", 420000),
    (505, "Warung 505", "warung505", 240000),
    (506, "Warung 506", "warung506", 95000),
    (507, "Warung 507", "warung507", 360000),
    (508, "Warung 508", "warung508", 15000),
    (509, "Warung 509", "warung509", 275000),
    (510, "Warung 510", "warung510", 130000),
    (511, "Warung 511", "warung511", 205000),
    (512, "Warung 512", "warung512", 160000),
    (513, "Warung 513", "warung513", 55000),
]
TOTAL = sum(w[3] for w in WARUNG)


def gagal(pesan):
    raise SystemExit("GAGAL: " + pesan)


def harap(nyata, harus, apa):
    if nyata != harus:
        gagal(f"{apa}: dapat {nyata!r}, harus {harus!r}")


def rp(n):
    return ("-" if n < 0 else "") + "Rp" + f"{abs(int(n)):,}".replace(",", ".")


# ---------- rekaman ----------

baris = []


def catat(teks=""):
    baris.append(teks)


def bagian(judul):
    catat(f"\n# --- {judul} ---")


def tulis(nama, judul):
    versi = Diam.satu("SHOW server_version")
    kepala = [f"-- Lab t2-pencairan · {judul}",
              f"-- PostgreSQL {versi} · schema {SCHEMA} · isolation read committed · periode {PERIODE}",
              "-- Rekaman dari database bersih: make -C labs/t2-pencairan run (keputusan 500).",
              "-- Data lab: 12 warung, saldo dibuat sebagai jurnal pembuka; Warung Ani Rp310.000 dari naskah (keputusan 504).",
              "-- Format file transfer fiktif, bukan format bank mana pun (keputusan 505)."]
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


def sambung():
    # search_path lewat parameter koneksi (keputusan 80): SQL yang direkam tetap tanpa nama schema.
    c = psycopg.connect(DSN + f" options=-csearch_path={SCHEMA}", autocommit=True)
    c.prepare_threshold = None   # schema dibuat ulang tiap skenario; tanpa prepared statement yang tertinggal
    return c


class Sesi:
    """Satu koneksi = satu sesi psql. Perintah dan hasilnya masuk rekaman."""

    def __init__(self):
        self.conn = sambung()

    def __call__(self, q, tampil=None):
        b = (tampil or q).strip().splitlines()
        catat("=> " + b[0])
        for l in b[1:]:
            catat("   " + l)
        cur = self.conn.execute(q)
        if cur.description:
            isi = cur.fetchall()
            for l in tabel([c.name for c in cur.description], isi):
                catat(l)
            return isi
        catat(cur.statusmessage)
        return None

    def salin_file(self, nama):
        """\\copy file transfer ke tabel sementara, seperti Keuangan membuka file di spreadsheet."""
        catat(f"=> \\copy file_bank FROM 'kerja/{nama}' (FORMAT csv, HEADER)")
        with self.conn.cursor() as cur:
            with cur.copy("COPY file_bank FROM STDIN (FORMAT csv, HEADER)") as cp:
                cp.write((KERJA / nama).read_bytes())
            catat(f"COPY {cur.rowcount}")

    def tutup(self):
        self.conn.close()


class Diam:
    """Koneksi pemeriksa: tidak masuk rekaman. Dipakai harap() dan untuk menunggu backend job berakhir."""
    conn = None

    @classmethod
    def satu(cls, q):
        return cls.conn.execute(q).fetchone()[0]

    @classmethod
    def semua(cls, q):
        return cls.conn.execute(q).fetchall()


# ---------- schema, data lab, job ----------

def bangun_job():
    hasil = subprocess.run(["go", "build", "-o", str(BIN), "./cmd/pencairan"], cwd=HERE, capture_output=True, text=True)
    if hasil.returncode != 0:
        gagal("go build: " + hasil.stderr)


def cek_sama_api_t2():
    """Tabel pencairan lab ini harus sama dengan bagian M15 migration api-t2 (keputusan 505): skema Tahap 2 satu."""
    api = (HERE / "../api-t2/migrasi/000011_ledger_pendukung.up.sql").read_text()
    lab = (HERE / "schema.sql").read_text()
    awal, akhir = "CREATE TABLE batch_pencairan", "-- --8<-- [end:batch-pencairan]"
    harap(awal in api and awal in lab and akhir in lab, True, "penanda tabel pencairan di api-t2 dan schema.sql")
    harap(lab[lab.index(awal):lab.index(akhir)].strip(), api[api.index(awal):].strip(),
          "tabel pencairan schema.sql lawan labs/api-t2/migrasi/000011")


def mulai():
    """Schema dari nol: ledger b3-ledger + tabel pencairan + data lab. Folder kerja dikosongkan."""
    with psycopg.connect(DSN, autocommit=True) as c:
        c.execute(f"DROP SCHEMA IF EXISTS {SCHEMA} CASCADE")
        c.execute(f"CREATE SCHEMA {SCHEMA}")
        c.execute(f"SET search_path = {SCHEMA}")
        c.execute((HERE / "../b3-ledger/schema.sql").read_text())
        c.execute((HERE / "schema.sql").read_text())
        with c.transaction():
            c.execute("INSERT INTO akun (id, nama, email, peran) VALUES (%s, 'Sistem Rekeningo', 'sistem@lestari.example', 'sistem')",
                      (SISTEM,))
            for akun, nama, email, _ in WARUNG:
                c.execute("INSERT INTO akun (id, nama, email, peran) VALUES (%s, %s, %s, 'warung')",
                          (akun, nama, email + "@lestari.example"))
            c.execute("INSERT INTO akun (id, nama, email, peran) VALUES (%s, 'Admin Tunjangan', 'admin.tunjangan@lestari.example', 'admin')",
                      (ADMIN,))
            c.execute("INSERT INTO akun (id, nama, email, peran) VALUES (%s, 'Budi', 'budi@lestari.example', 'karyawan')", (BUDI,))
            c.execute("INSERT INTO buku (jenis) VALUES ('tunjangan'), ('kas_pencairan'), ('pembuka'), ('selisih')")
            for akun, *_ in WARUNG:
                c.execute("INSERT INTO buku (akun_id, jenis, batas_saldo) VALUES (%s, 'warung', 1500000)", (akun,))
            c.execute("INSERT INTO buku (akun_id, jenis, batas_harian) VALUES (%s, 'karyawan', 500000)", (BUDI,))
            for akun, nama, _, x in WARUNG + [(BUDI, "Budi", "", 100000)]:
                j = c.execute("INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('pembuka', %s, %s) RETURNING id",
                              (f"Saldo {nama} sebelum Jumat 15.00 (data lab)", SISTEM)).fetchone()[0]
                c.execute("""INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES
                               (%s, (SELECT id FROM buku WHERE akun_id = %s), %s),
                               (%s, (SELECT id FROM buku WHERE akun_id IS NULL AND jenis = 'pembuka'), %s)""",
                          (j, akun, x, j, -x))
            c.execute("""UPDATE buku b SET saldo_cache = s.jumlah
                         FROM (SELECT buku_id, sum(jumlah) AS jumlah FROM posting GROUP BY buku_id) s
                         WHERE b.id = s.buku_id""")
    shutil.rmtree(KERJA, ignore_errors=True)
    KERJA.mkdir()
    if Diam.conn is None:
        Diam.conn = sambung()
    harap(Diam.satu("SELECT max(id) FROM jurnal"), 13, "jurnal pembuka data lab")


def job(*arg, kode=0):
    """Jalankan job seperti dari terminal. kode -9 = proses dimatikan SIGKILL oleh flag -berhenti."""
    catat(f"\n$ ./pencairan {' '.join(arg)}")
    p = subprocess.run([str(BIN), *arg], cwd=HERE, env={**os.environ, "DATABASE_URL": DSN_JOB},
                       capture_output=True, text=True, timeout=60)
    for l in (p.stdout + p.stderr).splitlines():
        catat(l)
    galat = p.stderr.splitlines()
    harap(galat, ["galat: rekonsiliasi menolak: file tidak dibuat"] if kode == 3 else [], "stderr job")
    if p.returncode == -9:
        catat("   -- proses mati (SIGKILL): defer dan COMMIT berikutnya tidak pernah dijalankan")
        tunggu_backend_berakhir()
    else:
        catat(f"   -- exit {p.returncode}")
    harap(p.returncode, kode, f"exit ./pencairan {' '.join(arg)}")
    return p.stdout.splitlines()


def tunggu_backend_berakhir():
    """Backend PostgreSQL milik job yang mati berakhir saat membaca socket yang tertutup; transaction-nya di-rollback."""
    akhir = time.time() + 10
    while Diam.satu(f"SELECT count(*) FROM pg_stat_activity WHERE application_name = '{APP_JOB}'") > 0:
        if time.time() > akhir:
            gagal("backend job masih ada 10 detik sesudah proses mati")
        time.sleep(0.05)
    catat("   -- koneksi job di PostgreSQL ikut berakhir; transaction yang belum COMMIT, bila ada, di-rollback")


def cat(nama=FILE):
    catat(f"\n$ cat kerja/{nama}")
    isi = (KERJA / nama).read_text().splitlines()
    for l in isi:
        catat(l)
    data = [l.split(",") for l in isi[1:]]
    catat(f"   -- {len(data)} baris data, total {rp(sum(int(d[2]) for d in data))}")
    return [(int(d[0]), int(d[2])) for d in data]


def ls():
    catat("\n$ ls kerja/")
    nama = sorted(p.name for p in KERJA.iterdir())
    for n in nama:
        catat(n)
    if not nama:
        catat("   -- (kosong)")
    return nama


def sha(nama=FILE):
    h = hashlib.sha256((KERJA / nama).read_bytes()).hexdigest()
    catat(f"\n$ sha256sum kerja/{nama}")
    catat(f"{h}  kerja/{nama}")
    return h


def saldo_warung(s):
    r = s("""SELECT a.id AS akun, a.nama, b.id AS buku, coalesce(sum(p.jumlah), 0) AS saldo, b.saldo_cache
FROM buku b JOIN akun a ON a.id = b.akun_id LEFT JOIN posting p ON p.buku_id = b.id
WHERE b.jenis = 'warung'
GROUP BY a.id, a.nama, b.id ORDER BY b.id;""")
    harap([(x[0], x[3], x[4]) for x in r], [(w[0], w[3], w[3]) for w in WARUNG], "saldo warung Jumat 15.00")
    harap([x[2] for x in r], list(range(5, 17)), "nomor buku warung urut nomor akun")
    catat(f"-- 12 warung, total {rp(TOTAL)}. Job memproses warung urut nomor buku; Warung 508 adalah yang ketujuh.")


def jurnal_pencairan(s, harus):
    r = s("""SELECT j.id AS jurnal, a.nama, p.jumlah AS posting_warung
FROM jurnal j JOIN posting p ON p.jurnal_id = j.id JOIN buku b ON b.id = p.buku_id AND b.jenis = 'warung'
JOIN akun a ON a.id = b.akun_id
WHERE j.jenis = 'pencairan' ORDER BY j.id;""")
    harap([(x[0], x[2]) for x in r], harus, "jurnal pencairan")
    return r


TUTUP_BUKU_TOTAL = """SELECT (SELECT count(*) FROM file_bank) AS baris_file,
       (SELECT sum(jumlah) FROM file_bank) AS total_file,
       (SELECT count(*) FROM jurnal WHERE jenis = 'pencairan') AS jurnal_pencairan,
       (SELECT sum(p.jumlah) FROM posting p JOIN buku b ON b.id = p.buku_id
         WHERE b.jenis = 'kas_pencairan') AS mutasi_kas_pencairan;"""

TUTUP_BUKU_WARUNG = """SELECT coalesce(f.akun, l.akun) AS akun, coalesce(f.nama, l.nama) AS nama,
       coalesce(f.baris, 0) AS baris_file, coalesce(f.jumlah, 0) AS jumlah_file,
       coalesce(l.jurnal, 0) AS jurnal_ledger, coalesce(l.jumlah, 0) AS jumlah_ledger
FROM (SELECT akun_warung AS akun, min(nama_penerima) AS nama, count(*) AS baris, sum(jumlah) AS jumlah
        FROM file_bank GROUP BY akun_warung) f
FULL JOIN (SELECT b.akun_id AS akun, a.nama, count(*) AS jurnal, -sum(p.jumlah) AS jumlah
             FROM jurnal j JOIN posting p ON p.jurnal_id = j.id
             JOIN buku b ON b.id = p.buku_id AND b.jenis = 'warung' JOIN akun a ON a.id = b.akun_id
            WHERE j.jenis = 'pencairan' GROUP BY b.akun_id, a.nama) l ON l.akun = f.akun
WHERE f.baris IS DISTINCT FROM l.jurnal OR f.jumlah IS DISTINCT FROM l.jumlah
ORDER BY 1;"""


def tutup_buku(s, total_file, beda):
    """File yang diunggah Keuangan lawan ledger. Lab ini hanya punya satu periode."""
    s("CREATE TEMP TABLE file_bank (akun_warung bigint, nama_penerima text, jumlah bigint, berita text);")
    s.salin_file(FILE)
    r = s(TUTUP_BUKU_TOTAL)
    harap([tuple(int(v) for v in r[0])], [(r[0][0], total_file, 12, TOTAL)], "tutup buku: total file lawan ledger")
    catat(f"-- Selisih file - ledger: {rp(total_file - TOTAL)}.")
    r = s(TUTUP_BUKU_WARUNG)
    harap([tuple(int(v) if not isinstance(v, str) else v for v in x) for x in r], beda, "tutup buku: warung yang beda")
    s("DROP TABLE file_bank;")


# ---------- A. versi rentan (M15) ----------

def rekam_rentan():
    mulai()
    s = Sesi()
    catat("-- Job versi pertama: satu transaction per warung. Baris file ditulis sebelum COMMIT (kalau file gagal ditulis,")
    catat("-- jurnal ikut batal), dan file dibuka dengan O_APPEND supaya baris yang sudah ditulis tidak hilang.")
    bagian("A. Saldo warung Jumat 15.00")
    saldo_warung(s)

    bagian("B. Job berjalan; server restart sesudah baris file ketujuh ditulis, sebelum COMMIT")
    out = job("-mode", "rentan", "-periode", PERIODE, "-dir", "kerja", "-berhenti", "baris-file:7", kode=-9)
    harap(out[-2:], ["baris file 7 ditulis: Warung 508 Rp15.000", "titik henti baris-file:7: proses dimatikan (SIGKILL)"],
          "job rentan berhenti di Warung 508")
    jurnal_pencairan(s, [(j, -w[3]) for j, w in zip(range(14, 20), WARUNG[:6])])
    s("SELECT last_value AS nomor_jurnal_terakhir_dipakai FROM jurnal_id_seq;")
    harap(Diam.satu("SELECT last_value FROM jurnal_id_seq"), 20, "nomor jurnal 20 terpakai transaction yang batal")
    harap(cat(), [(w[0], w[3]) for w in WARUNG[:7]], "file sesudah job berhenti")
    catat("-- Ledger: 6 jurnal pencairan. File: 7 baris. Jurnal Warung 508 (nomor 20) ikut transaction yang di-rollback;")
    catat("-- barisnya di file sudah ditulis ke disk sebelum COMMIT dan tetap ada.")

    bagian("C. Server hidup lagi; job dijalankan lagi dengan perintah yang sama")
    out = job("-mode", "rentan", "-periode", PERIODE, "-dir", "kerja")
    harap(out[0], f"pencairan {PERIODE} (rentan, file-dulu): 6 warung bersaldo", "job rentan kedua")
    jurnal_pencairan(s, [(j, -w[3]) for j, w in zip(list(range(14, 20)) + list(range(21, 27)), WARUNG)])
    harap(cat(), [(w[0], w[3]) for w in WARUNG[:7] + WARUNG[6:]], "file sesudah job kedua")
    catat("-- Jalan kedua membaca saldo saat itu: enam warung pertama sudah 0, Warung 508 masih Rp15.000.")
    catat("-- Warung 508 dua kali di file, sekali di ledger. Nomor jurnal 20 kosong: sequence tidak ikut di-rollback.")

    bagian("D. Tutup buku: file yang diunggah Keuangan lawan mutasi ledger")
    tutup_buku(s, TOTAL + 15000, [(508, "Warung 508", 2, 30000, 1, 15000)])
    catat("-- File Rp15.000 lebih besar dari mutasi buku kas pencairan. Rp15.000 = saldo Warung 508, warung yang sedang")
    catat("-- diproses saat proses mati (data lab menaruh titik henti di warung ketujuh).")

    bagian("E. Varian: jurnal di-COMMIT dulu, baris file ditulis sesudahnya")
    s.tutup()
    mulai()
    s = Sesi()
    catat("-- Schema dan folder kerja dibuat ulang dari data lab yang sama.")
    out = job("-mode", "rentan", "-periode", PERIODE, "-dir", "kerja", "-urutan", "jurnal-dulu",
              "-berhenti", "commit:7", kode=-9)
    harap(out[-2:], ["jurnal 20 COMMIT: Warung 508 Rp15.000", "titik henti commit:7: proses dimatikan (SIGKILL)"],
          "job jurnal-dulu berhenti sesudah COMMIT Warung 508")
    job("-mode", "rentan", "-periode", PERIODE, "-dir", "kerja", "-urutan", "jurnal-dulu")
    harap(cat(), [(w[0], w[3]) for w in WARUNG[:6] + WARUNG[7:]], "file varian jurnal-dulu")
    tutup_buku(s, TOTAL - 15000, [(508, "Warung 508", 0, 0, 1, 15000)])
    catat("-- Menukar urutan memindahkan selisih ke arah sebaliknya: Warung 508 dicairkan di ledger, tidak ada di file.")
    catat("-- Database dan file tidak bisa di-COMMIT bersama; urutan mana pun punya celah di antara keduanya.")
    s.tutup()
    tulis("rentan.txt", "M15: job pencairan berjalan dua kali sesudah server restart")


# ---------- B. versi benar (ADR 19) ----------

def batch(s, status, jurnal_baris):
    r = s("SELECT id, periode, status, total FROM batch_pencairan;")
    harap(r, [(1, PERIODE, status, TOTAL)], "batch")
    r = s("""SELECT b.buku_id AS buku, a.nama, b.jumlah, b.jurnal_id
FROM baris_pencairan b JOIN buku k ON k.id = b.buku_id JOIN akun a ON a.id = k.akun_id
WHERE b.batch_id = 1 ORDER BY b.buku_id;""")
    harap([(x[2], x[3]) for x in r], [(w[3], j) for w, j in zip(WARUNG, jurnal_baris)], "baris pencairan")


def rekam_benar():
    mulai()
    s = Sesi()
    catat("-- ADR 19: batch per periode (UNIQUE periode), baris pencairan per buku, satu transaction per baris yang")
    catat("-- menulis jurnal dan baris_pencairan.jurnal_id bersama. File dibuat dari database sesudah semua baris")
    catat("-- dijurnal dan rekonsiliasi cocok. Tabel: labs/t2-pencairan/schema.sql (sama dengan api-t2 000011).")
    bagian("A. Saldo warung Jumat 15.00 (data lab yang sama dengan rentan.txt)")
    saldo_warung(s)

    bagian("B. Job berjalan; server restart di titik yang sama: baris ketujuh, sebelum COMMIT")
    out = job("-mode", "benar", "-periode", PERIODE, "-dir", "kerja", "-berhenti", "jurnal:7", kode=-9)
    harap(out[0], f"batch 1 periode {PERIODE} dibuat: 12 baris, total {rp(TOTAL)}", "batch dibuat")
    batch(s, "dibuat", list(range(14, 20)) + [None] * 6)
    harap(ls(), [], "belum ada file sebelum batch dijurnal")
    catat("-- Enam baris punya jurnal, enam belum. Belum ada file: file baru dibuat sesudah semua baris dijurnal.")

    bagian("C. Server hidup lagi; job dijalankan lagi dengan perintah yang sama")
    out = job("-mode", "benar", "-periode", PERIODE, "-dir", "kerja")
    harap(out[0], f"batch 1 periode {PERIODE} sudah ada, status dibuat", "batch dipakai lagi")
    harap(out[-3:], ["rekonsiliasi: cocok", f"file {FILE} dibuat", "batch 1: dikirim"], "akhir job benar")
    batch(s, "dikirim", list(range(14, 20)) + list(range(21, 27)))
    r = s("""SELECT p.jurnal_id AS jurnal, coalesce(a.nama, b.jenis) AS buku, p.jumlah
FROM posting p JOIN buku b ON b.id = p.buku_id LEFT JOIN akun a ON a.id = b.akun_id
WHERE p.jurnal_id = 14 ORDER BY p.id;""")
    harap([(x[1], x[2]) for x in r], [("Warung Ani", -310000), ("kas_pencairan", 310000)], "jurnal pencairan Warung Ani")
    harap(cat(), [(w[0], w[3]) for w in WARUNG], "file batch benar")
    tutup_buku(s, TOTAL, [])
    h = sha()

    bagian("D. Budi bayar Rp25.000 ke Warung Ani sesudah batch dikirim; job dijalankan lagi untuk periode yang sama")
    s("BEGIN;")
    j = s("INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('bayar', 'Bayar makan siang di Warung Ani', 419) RETURNING id;")[0][0]
    harap(j, 27, "jurnal bayar Budi")
    s(f"""INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES
  ({j}, (SELECT id FROM buku WHERE akun_id = 419), -25000),
  ({j}, (SELECT id FROM buku WHERE akun_id = 418), 25000);""")
    s(f"""UPDATE buku b SET saldo_cache = b.saldo_cache + p.jumlah
FROM (SELECT buku_id, sum(jumlah) AS jumlah FROM posting WHERE jurnal_id = {j} GROUP BY buku_id) p
WHERE b.id = p.buku_id;""")
    s("COMMIT;")
    out = job("-mode", "benar", "-periode", PERIODE, "-dir", "kerja")
    harap(out, [f"batch 1 periode {PERIODE} sudah ada, status dikirim", "batch sudah dikirim: tidak ada yang dikerjakan"],
          "job ketiga")
    r = s("""SELECT (SELECT count(*) FROM jurnal WHERE jenis = 'pencairan') AS jurnal_pencairan,
       (SELECT sum(jumlah) FROM posting WHERE buku_id = (SELECT id FROM buku WHERE akun_id = 418)) AS saldo_warung_ani;""")
    harap(r, [(12, 25000)], "sesudah job ketiga")
    harap(sha(), h, "file tidak berubah sesudah job ketiga")
    catat("-- Job ketiga tidak menulis jurnal dan tidak menyentuh file (sha256 sama). Rp25.000 Warung Ani tetap di")
    catat("-- bukunya untuk periode berikutnya: jumlah yang dicairkan dibekukan saat batch dibuat, bukan saat job jalan.")

    bagian("E. Server restart sesudah file diberi nama akhir, sebelum status dikirim")
    s.tutup()
    mulai()
    s = Sesi()
    catat("-- Schema dan folder kerja dibuat ulang dari data lab yang sama.")
    job("-mode", "benar", "-periode", PERIODE, "-dir", "kerja", "-berhenti", "file", kode=-9)
    batch(s, "dijurnal", list(range(14, 26)))
    harap(ls(), [FILE], "file sudah ada sebelum status dikirim")
    h1 = sha()
    out = job("-mode", "benar", "-periode", PERIODE, "-dir", "kerja")
    harap(out[0], f"batch 1 periode {PERIODE} sudah ada, status dijurnal", "job sesudah henti di file")
    harap(out[-3:], ["rekonsiliasi: cocok", f"file {FILE} dibuat", "batch 1: dikirim"], "akhir job sesudah henti di file")
    batch(s, "dikirim", list(range(14, 26)))
    harap(sha(), h1, "file dibuat ulang identik")
    harap(h1, h, "file sama dengan bagian C")
    catat("-- File dibuat ulang dari database dengan isi yang sama per byte, lalu menggantikan file lama lewat rename.")
    s.tutup()
    tulis("benar.txt", "ADR 19: batch per periode, aman dijalankan dua kali")


# ---------- C. rekonsiliasi ----------

def rekam_rekonsiliasi():
    mulai()
    s = Sesi()
    catat("-- Rekonsiliasi berjalan di job sebelum file diberi nama akhir: isi file sementara dibaca ulang dan dicocokkan")
    catat("-- dengan jurnal pencairan batch di ledger (per warung, total, dan mutasi buku kas pencairan).")
    bagian("A. Cacat disuntik: pembuat file menulis baris Warung 508 dua kali, bentuk yang sama dengan M15")
    catat("-- Flag -uji-baris-dobel hanya ada untuk lab ini; job tanpa flag tidak pernah menulis baris dua kali.")
    out = job("-mode", "benar", "-periode", PERIODE, "-dir", "kerja", "-uji-baris-dobel", "508", kode=3)
    harap(out[-3:], [f"rekonsiliasi batch 1: file 13 baris {rp(TOTAL + 15000)}; ledger 12 jurnal pencairan, kas pencairan +{rp(TOTAL)}",
                     "  beda 508 Warung 508: file 2 baris Rp30.000, ledger 1 jurnal Rp15.000",
                     "rekonsiliasi: DITOLAK (1 warung beda, selisih total Rp15.000)"], "rekonsiliasi menolak baris dobel")
    batch(s, "dijurnal", list(range(14, 26)))
    harap(ls(), [], "file tidak dibuat sesudah ditolak")
    catat("-- Batch tetap dijurnal, file sementara dihapus, nama akhir tidak pernah ada. Keuangan tidak menerima file.")

    bagian("B. Pembuat file diperbaiki; job dijalankan lagi")
    out = job("-mode", "benar", "-periode", PERIODE, "-dir", "kerja")
    harap(out[-3:], ["rekonsiliasi: cocok", f"file {FILE} dibuat", "batch 1: dikirim"], "job sesudah perbaikan")
    harap(cat(), [(w[0], w[3]) for w in WARUNG], "file sesudah perbaikan")

    bagian("C. Jurnal pencairan dibalik di ledger sebelum file dibuat")
    s.tutup()
    mulai()
    s = Sesi()
    catat("-- Schema dan folder kerja dibuat ulang. Job berhenti sesudah status dijurnal, sebelum membuat file.")
    job("-mode", "benar", "-periode", PERIODE, "-dir", "kerja", "-berhenti", "dijurnal", kode=-9)
    catat("-- Data lab: admin membalik jurnal pencairan Warung 508 (jurnal 20) sebelum file dibuat.")
    s("BEGIN;")
    j = s(f"""INSERT INTO jurnal (jenis, keterangan, membalik_jurnal_id, dibuat_oleh)
VALUES ('pembalik', 'Pencairan Warung 508 ditunda: rekening tujuan belum dikonfirmasi', 20, {ADMIN}) RETURNING id;""")[0][0]
    harap(j, 26, "jurnal pembalik")
    s(f"""INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES
  ({j}, (SELECT id FROM buku WHERE akun_id = 508), 15000),
  ({j}, (SELECT id FROM buku WHERE akun_id IS NULL AND jenis = 'kas_pencairan'), -15000);""")
    s(f"""UPDATE buku b SET saldo_cache = b.saldo_cache + p.jumlah
FROM (SELECT buku_id, sum(jumlah) AS jumlah FROM posting WHERE jurnal_id = {j} GROUP BY buku_id) p
WHERE b.id = p.buku_id;""")
    s("COMMIT;")
    out = job("-mode", "benar", "-periode", PERIODE, "-dir", "kerja", kode=3)
    harap(out[-3:], [f"rekonsiliasi batch 1: file 12 baris {rp(TOTAL)}; ledger 12 jurnal pencairan, kas pencairan +{rp(TOTAL - 15000)}",
                     "  beda 508 Warung 508: file 1 baris Rp15.000, ledger 1 jurnal Rp0",
                     "rekonsiliasi: DITOLAK (1 warung beda, selisih total Rp15.000)"], "rekonsiliasi menolak pencairan yang dibalik")
    batch(s, "dijurnal", list(range(14, 26)))
    harap(ls(), [], "file tidak dibuat sesudah pembalik")
    catat("-- Baris pencairan dibuat dari saldo Jumat 15.00 dan tidak berubah; ledger sudah mengembalikan Rp15.000 ke")
    catat("-- Warung 508. Tanpa rekonsiliasi, file akan mencairkan uang yang di ledger tidak lagi dicairkan.")
    catat("-- Job tidak memperbaikinya sendiri: batch tetap dijurnal sampai orang memutuskan (keputusan 503).")
    s.tutup()
    tulis("rekonsiliasi.txt", "rekonsiliasi file lawan ledger sebelum file dibuat")


# ---------- main ----------

def main():
    cek_sama_api_t2()
    bangun_job()
    rekam_rentan()
    rekam_benar()
    rekam_rekonsiliasi()
    Diam.conn.close()


if __name__ == "__main__":
    main()
