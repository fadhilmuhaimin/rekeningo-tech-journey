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


# ---------- main ----------

def main():
    bangun_job()
    mulai()
    Diam.conn.close()


if __name__ == "__main__":
    main()
