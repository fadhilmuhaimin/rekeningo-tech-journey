"""Alat untuk ledger.py (lab b4-skema versi ledger, keputusan 530): koneksi, pencatat, pengamat lock, app Dart.

Setiap request (laporan, migrasi, bayar) berjalan di koneksinya sendiri. Request yang mungkin tertahan lock dijalankan
di thread daemon: bila lab gagal saat request lain masih menunggu lock, proses tetap keluar (exit 1), dan tutup()
mengakhiri backend lab yang masih memegang atau menunggu lock, jadi rekaman berikutnya tidak macet.
Pengamat (koneksi terpisah, tidak direkam) membaca pg_locks, pg_blocking_pids, dan pg_stat_activity, hanya untuk
pid lab ini. Lock yang dipegang koneksi di luar lab dianggap gagal, bukan dilewati.
"""
import json, pathlib, subprocess, threading, time
import psycopg

HERE = pathlib.Path(__file__).parent
SCHEMA = "b4_ledger"
# statement_timeout 60 detik hanya jaring pengaman lab; yang diuji adalah lock_timeout di file migration.
DSN = ("host=127.0.0.1 port=54333 user=lab password=lab dbname=lab application_name=b4-skema-ledger "
       f"options='-csearch_path={SCHEMA} -cstatement_timeout=60s'")
NAMA_SQLSTATE = {"55P03": "lock_not_available", "42703": "undefined_column", "42P01": "undefined_table"}


def gagal(pesan):
    raise SystemExit("GAGAL: " + pesan)


def harap(nyata, harus, apa):
    if nyata != harus:
        gagal(f"{apa}: dapat {nyata!r}, harus {harus!r}")


def rp(n):
    return ("-" if n < 0 else "") + "Rp" + f"{abs(n):,}".replace(",", ".")


def angka(n):
    return f"{n:,}".replace(",", ".")


def sambung():
    c = psycopg.connect(DSN, autocommit=True)
    c.prepare_threshold = None
    return c


def galat(e):
    return f"ERROR {e.sqlstate} {NAMA_SQLSTATE.get(e.sqlstate, '?')}: {e.diag.message_primary}"


class Klien:
    """Satu koneksi = satu request dari server, laporan, atau orang yang menjalankan migrasi."""

    def __init__(self, nama, lab):
        self.nama, self.lab = nama, lab
        self.conn = sambung()
        self.pid = self.conn.info.backend_pid
        self.notice = []
        self.conn.add_notice_handler(lambda d: self.notice.append(d.message_primary))
        self.kerja = None
        lab.klien[nama] = self

    def sql(self, q, params=None):
        cur = self.conn.execute(q, params)
        return cur.fetchall() if cur.description else cur.statusmessage

    def mulai(self, fungsi):
        """Jalankan fungsi(self) di thread daemon. Galat database membatalkan transaction-nya (ROLLBACK)."""
        kotak = {}

        def jalan():
            t0 = time.monotonic()
            try:
                kotak["ok"] = fungsi(self)
            except psycopg.Error as e:
                kotak["err"] = e
                try:
                    self.conn.execute("ROLLBACK")
                except psycopg.Error:
                    pass
            kotak["detik"] = time.monotonic() - t0

        t = threading.Thread(target=jalan, daemon=True)
        t.start()
        self.kerja = (t, kotak)

    def berjalan(self):
        return self.kerja is not None and self.kerja[0].is_alive()

    def selesai(self, batas=30):
        t, kotak = self.kerja
        t.join(batas)
        if t.is_alive():
            gagal(f"{self.nama} belum selesai sesudah {batas} detik")
        self.kerja = None
        return kotak

    def jalan(self, fungsi):
        self.mulai(fungsi)
        return self.selesai()


class Lab:
    """Satu rekaman: daftar baris teks, langkah bernomor, dan pengamat lock."""

    def __init__(self):
        self.baris, self.klien, self.n = [], {}, 0
        self.p = sambung()

    def tulis(self, s=""):
        self.baris.append(s)

    def langkah(self, aktor, apa, hasil=None):
        self.n += 1
        self.baris.append(f"{self.n:2d} [{aktor}] {apa}")
        if hasil:
            self.baris.append(f"      -> {hasil}")

    def menunggu(self, k):
        """(mode, objek, di belakang siapa) bila k sedang menunggu lock; selain itu None."""
        r = self.p.execute("SELECT l.locktype, l.mode, c.relname FROM pg_locks l "
                           "LEFT JOIN pg_class c ON c.oid = l.relation WHERE l.pid = %s AND NOT l.granted",
                           (k.pid,)).fetchall()
        if not r:
            return None
        harap(len(r), 1, f"lock yang ditunggu {k.nama}")
        jenis, mode, rel = r[0]
        objek = {"relation": f"tabel {rel}", "transactionid": "baris yang dikunci transaction lain"}.get(jenis, jenis)
        # pg_blocking_pids: pemegang lock yang bentrok DAN peminta yang antre lebih dulu dengan mode bentrok.
        blok = self.p.execute("SELECT pg_blocking_pids(%s)", (k.pid,)).fetchone()[0]
        nama = {x.pid: n for n, x in self.klien.items()}
        if any(b not in nama for b in blok):
            gagal(f"{k.nama} tertahan koneksi di luar lab (pid {blok}); jalankan ulang saat database sepi")
        return mode, objek, ", ".join(sorted(nama[b] for b in blok))

    def tunggu_antre(self, k, batas=5):
        akhir = time.monotonic() + batas
        while time.monotonic() < akhir:
            w = self.menunggu(k)
            if w:
                return w
            if not k.berjalan():
                gagal(f"{k.nama} selesai tanpa menunggu lock")
            time.sleep(0.05)
        gagal(f"{k.nama} tidak terlihat menunggu lock dalam {batas} detik")

    def keadaan(self, k):
        r = self.p.execute("SELECT state FROM pg_stat_activity WHERE pid = %s", (k.pid,)).fetchone()
        return r[0] if r else None

    def tutup(self):
        for k in self.klien.values():
            if k.berjalan() or self.keadaan(k) not in ("idle", None):
                self.p.execute("SELECT pg_terminate_backend(%s)", (k.pid,))
            elif not k.conn.closed:
                k.conn.close()
        self.p.close()

    def simpan(self, path):
        path.write_text("\n".join(self.baris).rstrip() + "\n")


def tabel(kolom, isi):
    lebar = [max([len(k)] + [len(str(r[i])) for r in isi]) for i, k in enumerate(kolom)]
    out = [" " + " | ".join(k.ljust(w) for k, w in zip(kolom, lebar)),
           "-" + "-+-".join("-" * w for w in lebar) + "-"]
    for r in isi:
        out.append(" " + " | ".join(str(v).ljust(w) for v, w in zip(r, lebar)))
    return [b.rstrip() for b in out]


def app_lama(versi, body):
    """Parser riwayat app 1.0 atau 1.1 (app/riwayat_v1.dart). Kembalikan (berhasil, satu baris hasil)."""
    r = subprocess.run(["dart", "run", str(HERE / "app/riwayat_v1.dart"), versi, json.dumps(body)],
                       capture_output=True, text=True, timeout=180)
    keluaran = [l.strip() for l in (r.stdout + r.stderr).splitlines()]
    baris = [l for l in keluaran if l.startswith(f"app {versi} ") or "is not a subtype" in l]
    if not baris:
        gagal(f"keluaran Dart tidak dikenal: {keluaran[:5]}")
    if r.returncode == 0:
        return True, baris[0]
    return False, f"berhenti: {baris[0]} (exit code {r.returncode})"
