"""Rekam lab t3-pool (keputusan 957-959): layanan push yang menggantung dan connection pool, M18 (Tahap 3).

Server Go dan layanan push tiruan sama dengan lab api-t3 (`labs/api-t3/dasar_t3.py`), tanpa salinan. Mode rentan
`push-dalam-tx` memanggil layanan push di dalam transaction dengan client tanpa batas waktu. Bebannya 17,4 request per
detik dengan jadwal tetap (setiap request ke-20 adalah pembayaran, 0,87 per detik), bukan 17 pembayaran per detik
seperti lab lama t3-bayar. Setiap bagian membuat ulang schema dan data awal dari nol.

Yang dicetak ke rekaman adalah kejadian (jumlah, urutan, status) dan batas yang diperiksa, bukan jam: pool penuh
dicetak sebagai "antara detik ke-11 dan ke-12", rata-rata koneksi sebagai "dalam 15% dari hitungan". Lab gagal keras
bila hasilnya meleset dari yang diharapkan (keputusan 79, 95).

    make -C labs/t3-pool run                    (butuh Docker dan Go; PostgreSQL dijalankan lewat labs/b3-race; ±5 menit)
    make -C labs/t3-pool run BAGIAN=little      (satu bagian: m18 little adr22 jejak)
"""
import sys

from umum import d, gagal  # noqa: E402  (umum menyiapkan sys.path ke labs/api-t3 dan folder ini)
from bagian_adr22 import rekam_adr22  # noqa: E402
from bagian_jejak import rekam_jejak  # noqa: E402
from bagian_little import rekam_little  # noqa: E402
from bagian_m18 import rekam_m18  # noqa: E402

BAGIAN = {"m18": rekam_m18, "little": rekam_little, "adr22": rekam_adr22, "jejak": rekam_jejak}


def main():
    pilih = sys.argv[1:] or list(BAGIAN)
    for p in pilih:
        if p not in BAGIAN:
            gagal(f"bagian tidak dikenal: {p} (pilihan: {' '.join(BAGIAN)})")
    d.bangun()
    try:
        for p in pilih:
            BAGIAN[p]()
    finally:
        for port in list(d.server):   # error Python di tengah rekaman: server tidak tertinggal memegang port
            d.stop(port, sinyal="kill")


if __name__ == "__main__":
    main()
