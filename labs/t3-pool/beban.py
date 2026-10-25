"""Pembangkit beban dan pengamat koneksi untuk lab t3-pool (keputusan 957).

Jadwalnya tetap, bukan acak: request ke-k dikirim pada detik k ÷ rps, dan setiap request ke-20 adalah pembayaran
(17,4 request per detik, 5% pembayaran = 0,87 pembayaran per detik, naskah bagian 3). Dengan jadwal tetap, yang
direkam (jumlah, urutan, status) sama di setiap run; waktu hanya dipakai untuk memutuskan, tidak dicetak.

Pembayar, warung, dan pembacaan memakai akun berbeda-beda: dua pembayaran yang berebut lock buku yang sama
menambah antrean yang bukan sasaran lab ini (kasusnya ada di adr22.txt bagian D).
"""
import hashlib
import http.client
import json
import secrets
import threading
import time

import psycopg


def buat_sesi(sambung, jumlah, awal=0):
    """Sesi app untuk `jumlah` karyawan pertama sesudah `awal`, ditulis langsung ke tabel sesi sebagai pemilik schema.

    Yang diukur lab ini adalah koneksi database saat pembayaran berjalan, bukan bcrypt dan batas login per IP,
    jadi sesinya disiapkan seperti data awal. Hash yang disimpan sama dengan hashToken di service (SHA-256, heksa).
    Mengembalikan daftar (token, akun_id)."""
    with sambung() as c:
        ids = [r[0] for r in c.execute("SELECT id FROM akun WHERE jenis = 'karyawan' ORDER BY id OFFSET %s LIMIT %s",
                                       (awal, jumlah)).fetchall()]
        hasil = []
        for akun in ids:
            token = secrets.token_hex(32)
            c.execute("INSERT INTO sesi (token_hash, akun_id, kedaluwarsa, jenis) VALUES (%s, %s, now() + interval '2 hours', 'app')",
                      (hashlib.sha256(token.encode()).hexdigest(), akun))
            hasil.append((token, akun))
    return hasil


def daftar_warung(sambung, jumlah):
    with sambung() as c:
        return [r[0] for r in c.execute("SELECT id FROM akun WHERE jenis = 'warung' ORDER BY id LIMIT %s", (jumlah,)).fetchall()]


class Beban:
    """Satu pembangkit: thread penjadwal yang menyalakan satu thread per request pada waktunya."""

    def __init__(self, port, pembayar, warung, rps=17.4, tiap_bayar=20, baca=True, timeout_baca=3.0,
                 timeout_bayar=300.0, nominal=10000, kepala=None):
        self.port, self.pembayar, self.warung = port, pembayar, warung
        self.rps, self.tiap_bayar, self.baca = rps, tiap_bayar, baca
        self.timeout_baca, self.timeout_bayar, self.nominal = timeout_baca, timeout_bayar, nominal
        self.kepala = kepala or {}
        self.hasil = {}                # k -> dict(jenis, status, mulai, selesai)
        self._kunci = threading.Lock()
        self._henti = threading.Event()
        self._thread = []
        self.t0 = None

    # --- jadwal ---
    def jadwal(self, k):
        """Detik (sejak mulai) request ke-k dikirim."""
        return k / self.rps

    def mulai(self, t0=None):
        self.t0 = t0 or time.monotonic()
        t = threading.Thread(target=self._penjadwal, daemon=True)
        t.start()
        self._penjadwal_thread = t

    def _penjadwal(self):
        k = 0
        while not self._henti.is_set():
            k += 1
            jenis = "bayar" if k % self.tiap_bayar == 0 else "baca"
            if jenis == "baca" and not self.baca:
                continue
            tunggu = self.t0 + self.jadwal(k) - time.monotonic()
            if tunggu > 0 and self._henti.wait(tunggu):
                break
            th = threading.Thread(target=self._kirim, args=(k, jenis), daemon=True)
            th.start()
            self._thread.append(th)

    def semua_selesai(self):
        return all(not th.is_alive() for th in self._thread)

    def henti(self):
        """Berhenti mengirim request baru. Request yang sedang menunggu jawaban tidak dibatalkan."""
        self._henti.set()
        self._penjadwal_thread.join(5)

    def sekarang(self):
        return time.monotonic() - self.t0

    def tidur_sampai(self, detik):
        sisa = self.t0 + detik - time.monotonic()
        if sisa > 0:
            time.sleep(sisa)

    # --- satu request ---
    def _kirim(self, k, jenis):
        j = k // self.tiap_bayar
        if jenis == "bayar":
            token, _ = self.pembayar[(j - 1) % len(self.pembayar)]
            ke = self.warung[(j - 1) % len(self.warung)]
            metode, path, body, batas = "POST", "/transfers", json.dumps({"ke": ke, "nominal": self.nominal}), self.timeout_bayar
        else:
            token, akun = self.pembayar[k % len(self.pembayar)]
            metode, path, body, batas = "GET", f"/akun/{akun}", None, self.timeout_baca
        mulai = time.monotonic()
        status = 0
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=batas)
        try:
            kepala = {"Authorization": f"Bearer {token}", **self.kepala}
            if body is not None:
                kepala["Content-Type"] = "application/json"
            conn.request(metode, path, body, kepala)
            r = conn.getresponse()
            r.read()
            status = r.status
        except (OSError, http.client.HTTPException):
            status = 0           # tidak dijawab dalam batas waktu client, atau koneksi diputus
        finally:
            conn.close()
        with self._kunci:
            self.hasil[k] = {"jenis": jenis, "status": status, "mulai": mulai - self.t0, "selesai": time.monotonic() - self.t0}

    # --- ringkasan ---
    def nomor(self, k_awal, k_akhir, jenis):
        """Nomor request berjenis `jenis` di rentang itu menurut jadwal (bukan menurut yang sudah selesai)."""
        return [k for k in range(k_awal, k_akhir + 1) if (k % self.tiap_bayar == 0) == (jenis == "bayar")
                and not (jenis == "baca" and not self.baca)]

    def rekap(self, k_awal, k_akhir, jenis):
        """{status: jumlah} untuk request yang dijadwalkan di rentang itu. Yang belum selesai dihitung 'belum'."""
        n = {}
        with self._kunci:
            for k in self.nomor(k_awal, k_akhir, jenis):
                s = self.hasil[k]["status"] if k in self.hasil else "belum"
                n[s] = n.get(s, 0) + 1
        return n

    def dalam_proses(self):
        """Pembayaran yang sudah dikirim (menurut jadwal) dan belum selesai."""
        with self._kunci:
            kirim = [k for k in range(self.tiap_bayar, int(self.sekarang() * self.rps) + 1, self.tiap_bayar)]
            return sum(1 for k in kirim if k not in self.hasil)

    def durasi(self, jenis, k_awal, k_akhir):
        with self._kunci:
            return [v["selesai"] - v["mulai"] for k, v in self.hasil.items()
                    if v["jenis"] == jenis and k_awal <= k <= k_akhir]


class Pengamat:
    """Mencuplik pg_stat_activity tiap 50 ms: berapa koneksi aplikasi yang diam di dalam transaction, yang punya
    transaction terbuka, dan yang tidak diam. Cuplikan pertama dengan nilai tertentu dicatat (`pertama_idle`), supaya
    "kapan pool penuh" bisa diukur dari kejadian, bukan dari jam dinding yang dicocokkan setelahnya."""

    def __init__(self, dsn, t0, aplikasi="api-t3", selang=0.05):
        self.c = psycopg.connect(dsn, autocommit=True)
        self.t0, self.aplikasi, self.selang = t0, aplikasi, selang
        self.cuplikan = []        # (detik, idle_in_tx, tx_terbuka, tidak_diam)
        self.pertama_idle = {}    # nilai idle_in_tx -> detik pertama terlihat
        self._henti = threading.Event()
        self._thread = threading.Thread(target=self._jalan, daemon=True)

    def mulai(self):
        self._thread.start()

    def _jalan(self):
        q = ("SELECT count(*) FILTER (WHERE state = 'idle in transaction'), count(*) FILTER (WHERE xact_start IS NOT NULL),"
             " count(*) FILTER (WHERE state <> 'idle') FROM pg_stat_activity WHERE application_name = %s AND pid <> pg_backend_pid()")
        while not self._henti.is_set():
            mulai = time.monotonic()
            try:
                idle, tx, aktif = self.c.execute(q, (self.aplikasi,)).fetchone()
            except psycopg.Error:
                break
            t = mulai - self.t0
            self.cuplikan.append((t, idle, tx, aktif))
            self.pertama_idle.setdefault(idle, t)
            sisa = self.selang - (time.monotonic() - mulai)
            if sisa > 0:
                self._henti.wait(sisa)

    def henti(self):
        self._henti.set()
        self._thread.join(5)
        self.c.close()

    def jendela(self, awal, akhir, kolom=2):
        """Nilai kolom (1 idle_in_tx, 2 tx_terbuka, 3 tidak_diam) pada cuplikan di jendela [awal, akhir)."""
        return [c[kolom] for c in self.cuplikan if awal <= c[0] < akhir]

    def puncak(self, kolom=1):
        return max((c[kolom] for c in self.cuplikan), default=0)
