"""Bagian little lab t3-pool (keputusan 957-959): L = λ × W untuk t = 0,3, 2, dan 10 detik."""
import math
import statistics
import time

from umum import *  # noqa: E402,F401,F403
from umum import b, d  # noqa: E402


def rekam_little():
    sampel = []
    for t, ms in ((0.3, 300), (2, 2000), (10, 10000)):
        w = W_DB + t
        harap(w * LAMBDA < 10, True, f"t = {t}: L di bawah pool 10")
        bagian(f"t = {kom(t)} detik: layanan push menjawab sesudah {ms} ms, pool 10, 0,87 pembayaran per detik")
        sesi, warung = pasang(["-rentan", "push-dalam-tx"], mode_push="lambat", ms=ms,
                              tampil="$ ./api-t3 -rentan push-dalam-tx -lab   # pool 10, push timeout 0, idle-tx 0")
        catat(f"$ curl -X POST '/lab/mode' -d '{{\"mode\": \"lambat\", \"ms\": {ms}}}'   # layanan push tiruan menjawab sesudah {ms} ms")
        catat("# Hanya pembayaran (0,87 per detik, satu setiap 1,149 detik). L untuk semua request ada di adr22.txt F.")
        m = math.ceil(w / PERIODE) + 1                      # pembayaran ke-m dan sesudahnya: keadaan tetap
        awal, akhir = m * PERIODE, (m + 10) * PERIODE
        t0 = time.monotonic()
        pg = b.Pengamat(d.PEMILIK, t0, selang=0.02)
        be = b.Beban(PORT, sesi, warung, baca=False, timeout_bayar=300.0)
        pg.mulai()
        be.mulai(t0)
        be.tidur_sampai(akhir + w + 1.0)
        be.henti()
        pg.henti()
        nomor = [TIAP * n for n in range(m, m + 10)]                  # pembayaran yang tiba di jendela [awal, akhir)
        status = be.rekap(nomor[0], nomor[-1], "bayar")
        harap(status, {201: 10}, "pembayaran di jendela")
        durasi = [be.hasil[k]["selesai"] - be.hasil[k]["mulai"] for k in nomor]
        w_data = statistics.mean(durasi)
        nilai = pg.jendela(awal, akhir, 2)
        l_ukur, rendah, tinggi = statistics.mean(nilai), min(nilai), max(nilai)
        l_data = (len(nomor) / (akhir - awal)) * w_data      # L = λ × W dari data: λ dari hitungan, W dari rata-rata
        l_naskah = LAMBDA * w
        print(f"  (konsol) t={t}: L ukur {l_ukur:.3f}, λ×W data {l_data:.3f}, naskah {l_naskah:.3f}, W data {w_data:.3f}, "
              f"rendah {rendah}, tinggi {tinggi}, cuplikan {len(nilai)}")
        catat(f"hitungan: L = λ × W = 0,87 × (0,02 + {kom(t)}) = {kom(l_naskah, 3)} koneksi")
        catat(f"jendela: 10 pembayaran berturut-turut, detik {kom(awal)} sampai {kom(akhir)} jadwal; koneksi dengan transaction terbuka dicuplik tiap 20 ms dari pg_stat_activity")
        catat(f"10 dari 10 pembayaran: {ringkas(status)}")
        catat(f"koneksi dengan transaction terbuka: paling sedikit {rendah}, paling banyak {tinggi} dari 10")
        harap((rendah, tinggi), (math.floor(l_naskah), math.ceil(l_naskah)), f"t = {t}: paling sedikit dan paling banyak")
        catat(f"W dari data (rata-rata satu pembayaran): t ditambah kurang dari 20 ms untuk PostgreSQL dan HTTP (Asumsi naskah 20 ms): "
              + ya(t < w_data < t + W_DB, f"W dari data {w_data:.4f}"))
        catat("rata-rata koneksi dalam 15% dari λ × W (λ dan W dari data): "
              + ya(abs(l_ukur - l_data) <= 0.15 * l_data, f"L ukur {l_ukur:.3f} lawan λ×W {l_data:.3f}"))
        catat(f"rata-rata koneksi dalam 15% dari hitungan {kom(l_naskah, 3)}: "
              + ya(abs(l_ukur - l_naskah) <= 0.15 * l_naskah, f"L ukur {l_ukur:.3f} lawan naskah {l_naskah:.3f}"))
        sampel.append((t, l_naskah, tinggi))
        hentikan(PORT, PORT_PUSH)

    bagian("Ringkasan: L = λ × W dengan λ = 0,87 pembayaran per detik dan pool 10")
    catat("# t (detik) | hitungan L = 0,87 × (0,02 + t) | koneksi paling banyak (diukur) | pool 10")
    for t, l, tinggi in sampel:
        catat(f"{kom(t):<9} | {kom(l, 3):<30} | {tinggi:<30} | muat" + (" (sisa 1)" if tinggi == 9 else ""))
    l30 = LAMBDA * (W_DB + 30)
    catat(f"30        | {kom(l30, 3):<30} | 10 (pool penuh)                | tidak muat: 26 pembayaran dalam proses, 10 memegang koneksi (m18.txt A)")
    catat(f"# Pool 10 penuh bila L mencapai 10: t = 10 ÷ 0,87 - 0,02 = {kom(10 / LAMBDA - W_DB, 2)} detik.")
    tulis("little.txt", "L = λ × W: koneksi yang tertahan menurut lama panggilan push", lab="t3-pool", keputusan="957")
