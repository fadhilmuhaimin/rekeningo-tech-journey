"""Rekam lab t3-mitm (keputusan 977, 978): proxy tiruan di hotspot Dimas, pinning SPKI, dan rotasi pin (M26, Tahap 3).

Server api-t3 dan data awal dari `labs/api-t3/dasar_t3.py`, tanpa salinan. Tiga program Go kecil (`go/`: pki, tepi,
mitm) dan client Dart (`dart/`) ditambahkan di lab ini. Semua serangan hanya terhadap proses lokal di mesin ini;
sertifikat dan kunci dibuat acak setiap kali lab jalan di folder sementara dan dihapus di akhir, tidak di-commit.
Nilai acak (pin, serial, hash sertifikat) tidak masuk rekaman: rekaman memakai nama simbolik (A, B, C) dan hasil
(lolos atau ditolak). Setiap bagian membuat ulang schema dan data awal dari nol; lab gagal keras bila hasilnya meleset
dari yang diharapkan (keputusan 79, 95).

    make -C labs/t3-mitm run                    (butuh Docker, Go, dan Dart; ±3 menit)
    make -C labs/t3-mitm run BAGIAN=pin         (satu bagian: m26 pin dio hsts token)
"""
import sys

import umum as U
from bagian_dio import rekam_dio
from bagian_hsts import rekam_hsts
from bagian_m26 import rekam_m26
from bagian_pin import rekam_pin
from bagian_token import rekam_token

BAGIAN = {"m26": rekam_m26, "pin": rekam_pin, "dio": rekam_dio, "hsts": rekam_hsts, "token": rekam_token}


def main():
    pilih = sys.argv[1:] or list(BAGIAN)
    for p in pilih:
        if p not in BAGIAN:
            U.gagal(f"bagian tidak dikenal: {p} (pilihan: {' '.join(BAGIAN)})")
    U.d.bangun()
    U.bangun_go()
    U.siapkan_dart()
    U.PKI = U.Pki()
    try:
        for p in pilih:
            BAGIAN[p]()
    finally:
        for port in list(U.d.server):   # error Python di tengah rekaman: proses tidak tertinggal memegang port
            U.d.stop(port, sinyal="kill")
        U.PKI.bersih()
        U.bersih_sementara()


if __name__ == "__main__":
    main()
