"""Bagian dio (keputusan 977, 978): klaim cfug/dio#2418 diuji lebih dulu; hasilnya memilih mekanisme pin di Dart."""
import json
import pathlib

import umum as U
from umum import catat, d, harap, tulis

BODY = '{"ke_nomor_karyawan":"K00504","nominal":10000,"catatan":"patungan"}'
GET_AKUN = "/akun/419"
A, B = "spki_server-a", "spki_server-b"


def _baris_sumber_dio():
    """Letak `request.close()` dan `validateCertificate!(` di io_adapter.dart dio yang dipasang (bukti kode, bukan klaim)."""
    cfg = json.loads((U.DART / ".dart_tool" / "package_config.json").read_text())
    dio = next(p for p in cfg["packages"] if p["name"] == "dio")
    akar = (U.DART / ".dart_tool" / dio["rootUri"]).resolve() if not dio["rootUri"].startswith("file://") else pathlib.Path(dio["rootUri"][7:])
    baris = (akar / "lib/src/adapters/io_adapter.dart").read_text().splitlines()
    tutup = next(i for i, l in enumerate(baris, 1) if "request.close()" in l)
    cek = next(i for i, l in enumerate(baris, 1) if "validateCertificate!(" in l)
    return akar.name, tutup, cek


def rekam_dio():
    U.versi_client()
    d.bagian("A. Klaim dio#2418: validateCertificate jalan sesudah request terkirim")
    versi, tutup, cek = _baris_sumber_dio()
    harap(versi, "dio-5.11.0", "versi dio yang dipasang")
    harap(tutup < cek, True, "request.close() sebelum validateCertificate")
    catat(f"# Kode sumber {versi}, lib/src/adapters/io_adapter.dart: request.close() di baris {tutup}, validateCertificate!(...) di baris {cek}.")
    catat("# Pemeriksaan pin lewat validateCertificate hanya terjadi sesudah request dikirim dan jawaban tiba. Lab di bawah mengukurnya.")
    token = U.siapkan()
    rekam = U.baru_berkas("dio.jsonl")
    U.mulai_tepi("server-a")
    U.mulai_mitm(rekam, tls=True, ubah=(150000, "K00417"))
    catat("# Daftar akar app berisi CA Lab Publik dan CA Dimas, jadi handshake lolos; pin A dan B hanya diperiksa oleh callback dio.")
    catat("# Kontrol: dio dengan validateCertificate langsung ke server asli (kunci A): callback dipanggil dan menerima.")
    h = U.klien("dio-validate", ["ca-publik", "ca-dimas"], "tepi", GET_AKUN, token=token, pin=[A, B])
    harap((h.get("hasil"), h.get("status"), h.get("callback_dipanggil")), ("terhubung", 200, 1), "dio ke server asli")
    catat("# Lewat hotspot Dimas: callback menolak sertifikat tiruan, tetapi proxy sudah membaca request, dan server asli sudah memprosesnya.")
    h = U.klien("dio-validate", ["ca-publik", "ca-dimas"], "mitm", "/kiriman", metode="POST", token=token, body=BODY, pin=[A, B])
    harap((h.get("hasil"), h.get("jenis"), h.get("callback_dipanggil")), ("ditolak", "dio-badCertificate", 1), "dio menolak sesudah request")
    rq = U.lihat_mitm(rekam, token, handshake=True)
    harap(len(rq), 1, "proxy membaca request yang sudah dikirim dio")
    catat("# App menampilkan galat sertifikat, tetapi database server mencatat transfer:")
    U.tampil_transfer()
    harap(len(U.sql(U.TRANSFER, tampil=False)), 2, "transfer sudah tercatat")
    catat("# Klaim dio#2418 terbukti untuk dio 5.11.0 dengan IOHttpClientAdapter bawaan: Authorization dan body sudah terbaca proxy sebelum callback menolak.")

    d.bagian("B. Mekanisme yang dipilih: pin diperiksa di connectionFactory, sebelum byte HTTP pertama")
    token = U.siapkan()
    U.kosongkan(rekam)
    U.mulai_tepi("server-a")
    U.mulai_mitm(rekam, tls=True, ubah=(150000, "K00417"))
    catat("# Database baru. dio yang sama, tetapi HttpClient-nya memakai connectionFactory yang memeriksa pin sesudah handshake.")
    h = U.klien("dio-pin-factory", ["ca-publik", "ca-dimas"], "mitm", "/kiriman", metode="POST", token=token, body=BODY, pin=[A, B])
    harap((h.get("hasil"), h.get("jenis")), ("ditolak", "pin-tidak-cocok"), "dio dengan pin di connectionFactory menolak")
    rq = U.lihat_mitm(rekam, handshake=True)
    harap(len(rq), 0, "proxy tidak membaca request apa pun")
    harap(U.sql(U.TRANSFER, tampil=False), [], "tidak ada transfer")
    catat("# Database: tidak ada transfer. Proxy menerima handshake, tidak menerima satu request pun.")
    catat("# Kontrol: dio dengan connectionFactory pin langsung ke server asli (kunci A) berjalan normal.")
    h = U.klien("dio-pin-factory", ["ca-publik", "ca-dimas"], "tepi", GET_AKUN, token=token, pin=[A, B])
    harap((h.get("hasil"), h.get("status")), ("terhubung", 200), "dio dengan pin factory ke server asli")
    catat("# Hasil: pin dipasang di HttpClient lewat connectionFactory (dart:io), bukan di validateCertificate. Berlaku untuk dio lewat createHttpClient.")
    catat("# Yang tidak diukur: PR cfug/dio#2512 (perbaikan di dio sendiri, terbuka saat lab ditulis): Tidak dijalankan; dio 5.11.1 tidak diuji.")
    U.henti_mitm()
    U.henti_tepi()
    tulis("dio.txt", "Klaim dio#2418 diuji, dan mekanisme pin yang dipilih di Dart")
