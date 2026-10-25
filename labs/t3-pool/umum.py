"""Bahan bersama bagian rekaman lab t3-pool (keputusan 957): beban nyata, pemasangan server, dan cetakan umum.

Server dan data awal dari `labs/api-t3/dasar_t3.py`; pembangkit beban dan pengamat koneksi dari `beban.py`.
"""
import json
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "api-t3"))
sys.path.insert(0, str(HERE))
import beban as b  # noqa: E402,F401
import dasar_t3 as d  # noqa: E402,F401
from dasar_t3 import PORT, PORT_PUSH, bagian, catat, curl, gagal, harap, j, satu, sql, tulis  # noqa: E402,F401

d.OUT = HERE / "output"   # dasar_t3 menulis ke folder lab api-t3 bila tidak diganti

RPS, TIAP = 17.4, 20
LAMBDA = RPS / TIAP                 # 0,87 pembayaran per detik
PERIODE = 1 / LAMBDA                # 1,149 detik antar pembayaran
W_DB = 0.02                         # Asumsi naskah: 20 ms waktu satu request memegang koneksi (R3-33)
KOMENTAR_BEBAN = [
    "# Beban dengan jadwal tetap, bukan acak: 17,4 request per detik. Request ke-20, ke-40, dan seterusnya adalah pembayaran (0,87 per detik, 5%).",
    "# Sisanya (16,5 per detik) adalah karyawan yang membuka saldonya (GET /akun/{id}). Pembayar, warung, dan pembaca selalu berbeda: tidak ada rebutan lock buku.",
]


def kom(x, n=1):
    """Bilangan dengan koma desimal."""
    return f"{x:.{n}f}".replace(".", ",")


def ringkas(rekap):
    nama = {0: "tanpa jawaban"}
    return ", ".join(f"{nama.get(s, s)} x{n}" for s, n in sorted(rekap.items(), key=lambda x: str(x[0])))


def idle_tx():
    return satu("SELECT count(*) FROM pg_stat_activity WHERE application_name = 'api-t3' AND state = 'idle in transaction'")


def pasang(args, mode_push="gantung", ms=0, tampil=None, sesi=64):
    """Schema dan data baru, layanan push tiruan, server api-t3. Mengembalikan (sesi, warung)."""
    d.buat_schema()
    d.seed()
    d.mulai_push()
    if mode_push:
        d.push_mode(mode_push, ms)
    d.mulai_api(args, tampil=tampil)
    for l in d.log_server():
        catat("server log: " + l)
    return b.buat_sesi(d.sambung, sesi), b.daftar_warung(d.sambung, 60)


def cetak_pool():
    s, isi = curl("GET", "/lab/pool", tampil=False)
    harap(s, 200, "GET /lab/pool")
    p = j(isi)
    catat("$ curl -i -X GET '/lab/pool'   # kolom menunggu tidak dicetak: hitungan kumulatif yang bergantung pada waktu")
    catat(json.dumps({"dipakai": p["dipakai"], "maks": p["maks"], "terbuka": p["terbuka"]}, separators=(",", ":")))
    return p


def menggantung():
    return d.push_diterima()["menggantung"]


def bayar_terjadwal(detik):
    """Jumlah pembayaran yang dijadwalkan sampai detik itu."""
    return int(detik * RPS) // TIAP


def hentikan(*port):
    for p in port:
        d.stop(p, sinyal="kill")   # request menggantung: SIGTERM menunggu Shutdown 10 detik, tidak perlu di sini


def ya(kondisi, apa):
    harap(bool(kondisi), True, apa)
    return "ya"


def insiden(args, hingga, durasi_bayar_klien=300.0, tampil=None, titik=()):
    """Satu insiden: beban penuh sampai `hingga` detik, layanan push menggantung. Mengembalikan (beban, pengamat)."""
    sesi, warung = pasang(args, tampil=tampil)
    catat("$ curl -X POST '/lab/mode' -d '{\"mode\": \"gantung\"}'   # layanan push tiruan: menerima permintaan, tidak pernah menjawab")
    for k in KOMENTAR_BEBAN:
        catat(k)
    catat("# Client pembacaan menyerah sesudah 3 detik. "
          + ("Client pembayaran tidak menyerah selama rekaman (batasnya 300 detik)." if durasi_bayar_klien >= 60
             else f"Client pembayaran menyerah sesudah {int(durasi_bayar_klien)} detik (HP yang menampilkan \"timeout\")."))
    t0 = time.monotonic()
    pg = b.Pengamat(d.PEMILIK, t0)
    be = b.Beban(PORT, sesi, warung, timeout_bayar=durasi_bayar_klien)
    pg.mulai()
    be.mulai(t0)
    if titik:
        catat("=> SELECT count(*) AS idle_in_transaction FROM pg_stat_activity WHERE application_name = 'api-t3' AND state = 'idle in transaction'")
    for n in titik:
        d.tunggu(lambda n=n: menggantung() >= n, f"pembayaran ke-{n} sampai di layanan push", batas=hingga + 10)
        harap(idle_tx(), n, f"idle in transaction setelah pembayaran ke-{n}")
        catat(f"pembayaran ke-{n} sampai di layanan push: idle in transaction {n}")
    return be, pg


def penuh_antara(pg, n, pool):
    """Catat kapan koneksi ke-n terlihat idle in transaction, sebagai rentang detik penuh. Gagal bila jauh dari n ÷ 0,87."""
    d.tunggu(lambda: n in pg.pertama_idle, f"cuplikan yang melihat {n} koneksi idle in transaction", batas=2.0)
    t = pg.pertama_idle[n]
    harap(abs(t - n * PERIODE) < 0.5, True, f"koneksi ke-{n} penuh pada {t:.2f} detik, hitungan {n * PERIODE:.2f}")
    print(f"  (konsol) pool {pool} penuh pada {t:.2f} detik; hitungan {n * PERIODE:.2f}")
    return int(t)
