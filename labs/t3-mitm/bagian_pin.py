"""Bagian pin (keputusan 977, 978): pin SPKI dengan cadangan, rotasi kunci server, dan masa berlaku daun 200 hari."""
import subprocess
from decimal import ROUND_HALF_UP, Decimal

import umum as U
from umum import catat, d, harap, tulis

BODY = '{"ke_nomor_karyawan":"K00504","nominal":10000,"catatan":"patungan"}'
GET_AKUN = "/akun/419"
A, B, C = "spki_server-a", "spki_server-b", "spki_server-c"


def rekam_pin():
    U.versi_client()
    _a_pin_lolos_dan_menolak_tiruan()
    _b_mekanisme_yang_salah()
    _c_rotasi()
    _d_pin_spki_lawan_pin_daun()
    _e_masa_berlaku()
    tulis("pin.txt", "Pin SPKI dengan cadangan, rotasi kunci server, dan masa berlaku sertifikat daun")


def _a_pin_lolos_dan_menolak_tiruan():
    d.bagian("A. Pin SPKI A dan B: server asli lolos, sertifikat tiruan ditolak walau CA Dimas dipercaya")
    token = U.siapkan()
    rekam = U.baru_berkas("pin-a.jsonl")
    U.mulai_tepi("server-a")
    U.mulai_mitm(rekam, tls=True, ubah=(150000, "K00417"))
    catat("# Pin: A = kunci server yang dipakai sekarang, B = kunci cadangan yang belum dipakai. Nilainya acak di setiap run, jadi dicetak sebagai nama.")
    catat("# Daftar akar app berisi CA Lab Publik dan CA Dimas (keadaan D di m26.txt): validasi saja tidak menahan proxy.")
    h = U.klien("pin-spki", ["ca-publik", "ca-dimas"], "tepi", GET_AKUN, token=token, pin=[A, B])
    harap((h.get("hasil"), h.get("status")), ("terhubung", 200), "pin A dan B lolos ke server asli")
    h = U.klien("pin-spki", ["ca-publik", "ca-dimas"], "mitm", "/kiriman", metode="POST", token=token, body=BODY, pin=[A, B])
    harap((h.get("hasil"), h.get("jenis")), ("ditolak", "pin-tidak-cocok"), "pin menolak sertifikat tiruan")
    rq = U.lihat_mitm(rekam, handshake=True)
    harap(len(rq), 0, "proxy tidak membaca request apa pun")
    harap(U.sql(U.TRANSFER, tampil=False), [], "tidak ada transfer")
    catat("# Database: tidak ada transfer. Pin ditolak sesudah handshake dan sebelum byte HTTP pertama (connectionFactory).")
    U.henti_mitm()
    U.henti_tepi()


def _b_mekanisme_yang_salah():
    d.bagian("B. Pin di badCertificateCallback: tidak dipanggil bila CA dipercaya")
    token = U.siapkan()
    rekam = U.baru_berkas("pin-b.jsonl")
    U.mulai_tepi("server-a")
    U.mulai_mitm(rekam, tls=True, ubah=(150000, "K00417"))
    catat("# badCertificateCallback hanya dipanggil bila validasi bawaan gagal. Dengan CA Dimas di daftar akar, validasi lolos dan pin tidak pernah diperiksa.")
    h = U.klien("pin-badcallback", ["ca-publik", "ca-dimas"], "mitm", "/kiriman", metode="POST", token=token, body=BODY, pin=[A, B])
    harap((h.get("hasil"), h.get("status"), h.get("callback_dipanggil")), ("terhubung", 201, 0), "callback pin tidak dipanggil")
    rq = U.lihat_mitm(rekam, token)
    harap(len(rq), 1, "proxy membaca satu request")
    U.tampil_transfer()
    harap(len(U.sql(U.TRANSFER, tampil=False)), 2, "transfer ada")
    catat("# Bila CA Dimas tidak dipercaya, callback dipanggil dan menolak (sama dengan validasi biasa):")
    U.kosongkan(rekam)
    h = U.klien("pin-badcallback", ["ca-publik"], "mitm", "/kiriman", metode="POST", token=token, body=BODY, pin=[A, B])
    harap((h.get("hasil"), h.get("jenis"), h.get("callback_dipanggil")), ("ditolak", "handshake", 1), "callback menolak")
    U.henti_mitm()
    U.henti_tepi()


def _c_rotasi():
    d.bagian("C. Rotasi kunci server: tanpa pin cadangan app mati, dengan cadangan app jalan terus")
    token = U.siapkan()
    log = U.baru_berkas("tepi-c.log")
    catat("# Server memakai kunci A. Perpanjangan sertifikat dengan kunci baru (B) adalah kejadian biasa; sertifikat B sah, rantainya benar.")
    catat("# C1. App 1.0 hanya mem-pin A (tanpa cadangan).")
    U.mulai_tepi("server-a", log=log)
    h = U.klien("pin-spki", ["ca-publik"], "tepi", GET_AKUN, token=token, pin=[A])
    harap((h.get("hasil"), h.get("status")), ("terhubung", 200), "pin A, server A")
    U.henti_tepi()
    catat("# Rotasi: server memakai kunci B.")
    U.mulai_tepi("server-b", log=log)
    h = U.klien("validasi", ["ca-publik"], "tepi", GET_AKUN, token=token)
    harap((h.get("hasil"), h.get("status")), ("terhubung", 200), "sertifikat B sah tanpa pin")
    h = U.klien("pin-spki", ["ca-publik"], "tepi", GET_AKUN, token=token, pin=[A])
    harap((h.get("hasil"), h.get("jenis")), ("ditolak", "pin-tidak-cocok"), "pin A saja menolak server B")
    catat("# App 1.0 terkunci di luar: server sehat, sertifikat sah, request tidak pernah dikirim. Hanya rilis baru yang memperbaikinya.")
    U.henti_tepi()
    catat("# C2. App 1.1 mem-pin A dan B (B = cadangan yang dibuat sebelum rilis).")
    U.mulai_tepi("server-a", log=log)
    h = U.klien("pin-spki", ["ca-publik"], "tepi", GET_AKUN, token=token, pin=[A, B])
    harap((h.get("hasil"), h.get("status")), ("terhubung", 200), "pin A dan B, server A")
    U.henti_tepi()
    catat("# Rotasi ke B: app 1.1 jalan terus tanpa rilis baru.")
    U.mulai_tepi("server-b", log=log)
    h = U.klien("pin-spki", ["ca-publik"], "tepi", GET_AKUN, token=token, pin=[A, B])
    harap((h.get("hasil"), h.get("status")), ("terhubung", 200), "pin A dan B, server B")
    U.henti_tepi()
    catat("# Rotasi kedua ke C, kunci yang belum ada di pin: cadangan hanya menahan satu rotasi. Rilis berikutnya harus mem-pin B dan C sebelum rotasi itu.")
    U.mulai_tepi("server-c", log=log)
    h = U.klien("pin-spki", ["ca-publik"], "tepi", GET_AKUN, token=token, pin=[A, B])
    harap((h.get("hasil"), h.get("jenis")), ("ditolak", "pin-tidak-cocok"), "pin A dan B menolak server C")
    h = U.klien("pin-spki", ["ca-publik"], "tepi", GET_AKUN, token=token, pin=[B, C])
    harap((h.get("hasil"), h.get("status")), ("terhubung", 200), "pin B dan C, server C")
    catat("# Server tepi tidak pernah menerima request dari client yang menolak pin: baris log akses hanya dari request yang lolos.")
    baris = [l for l in U.pathlib.Path(log).read_text().splitlines() if l.strip()]
    harap(len(baris), 5, "request yang sampai ke tepi: 7 dikirim, 2 ditolak pin")
    catat(f"# Dari 7 request client di bagian C, {len(baris)} sampai ke tepi (lolos pin atau tanpa pin); 2 yang ditolak pin tidak ada di log akses tepi.")
    U.henti_tepi()


def _d_pin_spki_lawan_pin_daun():
    d.bagian("D. Pin SPKI lawan pin sertifikat daun: penerbitan ulang dengan kunci yang sama")
    token = U.siapkan()
    catat("# Perpanjangan sertifikat dengan kunci yang sama (A2): nomor seri dan masa berlaku baru, SPKI sama.")
    pins = U.PKI.pins
    harap(pins["spki_server-a"], pins["spki_server-a2"], "kunci sama, SPKI sama")
    harap(pins["cert_server-a"] != pins["cert_server-a2"], True, "hash sertifikat beda")
    catat("# pin SPKI A sama dengan SPKI A2: ya; hash sertifikat A sama dengan A2: tidak")
    U.mulai_tepi("server-a2")
    h = U.klien("pin-spki", ["ca-publik"], "tepi", GET_AKUN, token=token, pin=["spki_server-a"])
    harap((h.get("hasil"), h.get("status")), ("terhubung", 200), "pin SPKI A lolos ke A2")
    h = U.klien("pin-cert", ["ca-publik"], "tepi", GET_AKUN, token=token, pin=["cert_server-a"])
    harap((h.get("hasil"), h.get("jenis")), ("ditolak", "pin-tidak-cocok"), "pin daun lama menolak sertifikat terbit ulang")
    h = U.klien("pin-cert", ["ca-publik"], "tepi", GET_AKUN, token=token, pin=["cert_server-a2"])
    harap((h.get("hasil"), h.get("status")), ("terhubung", 200), "pin daun baru lolos")
    catat("# Pin daun mati di setiap penerbitan ulang, walau kuncinya sama. Pin SPKI mati hanya bila kuncinya diganti (bagian C).")
    U.henti_tepi()


def _e_masa_berlaku():
    d.bagian("E. Masa berlaku sertifikat daun: dihitung dengan jam tiruan, tidak ditunggu")
    r = subprocess.run([str(U.BIN / "pki"), "-umur"], capture_output=True, text=True, check=True)
    hasil = dict(l.split("=", 1) for l in r.stdout.splitlines())
    harap(hasil["masa_berlaku_hari"], "200", "masa berlaku daun lab")
    harap(hasil["hari_ke_199"], "lolos", "hari ke-199")
    harap(hasil["hari_ke_201"], "ditolak: sertifikat kedaluwarsa", "hari ke-201")
    catat("$ pki -umur   # Go, x509.Verify dengan CurrentTime = terbit + n hari; bukan client Dart (Dart tidak punya jam tiruan)")
    catat(r.stdout.rstrip())
    catat("# Berapa kali sertifikat daun terbit ulang per tahun (365 ÷ masa berlaku). Hitungan, bukan rekaman; batas masa berlaku dari CA/B Forum SC-081v3 (R3-18):")
    for hari, sejak in ((200, "2026-03-15"), (100, "2027-03-15"), (47, "2029-03-15")):
        kali = (Decimal(365) / Decimal(hari)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        catat(f"  sejak {sejak}: masa berlaku paling lama {hari} hari, 365 ÷ {hari} = {kali} kali per tahun".replace(".", ","))
    catat("# Bila setiap penerbitan ulang memakai kunci baru, pin SPKI harus diganti sebanyak itu. Dengan kunci yang dipakai ulang, pin SPKI tidak berubah (bagian D).")
