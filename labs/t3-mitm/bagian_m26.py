"""Bagian m26 (keputusan 977): M26, transfer yang tidak dibuat Budi. Hotspot Dimas di antara app dan server."""
import re

import umum as U
from umum import catat, d, harap, tulis

BODY = '{"ke_nomor_karyawan":"K00504","nominal":10000,"catatan":"patungan"}'
UBAH = (150000, "K00417")   # Rp150.000 ke Dimas (K00417), bukan Rp10.000 ke Citra (K00504)
GET_AKUN = "/akun/419"


def rekam_m26():
    U.versi_client()
    token = _a_tanpa_tls()
    _b_validasi()
    _c_staging_dan_flag()
    _d_ca_dipercaya()
    _e_token_dipakai_dimas()
    tulis("m26.txt", "M26: transfer yang tidak dibuat Budi (proxy tiruan di hotspot Dimas)")
    return token


def _transfer_dimas():
    """Satu transfer Rp150.000 dari Budi ke Dimas ada di database, dua posting seimbang."""
    baris = U.sql(U.TRANSFER, tampil=False)
    harap([(b[1], b[2]) for b in baris], [("K00419", -150000), ("K00417", 150000)], "posting transfer Budi ke Dimas")


def _a_tanpa_tls():
    d.bagian("A. Tanpa TLS: hotspot Dimas membaca dan mengubah request, server melihat request yang sah")
    token = U.siapkan()
    rekam = U.baru_berkas("a.jsonl")
    U.mulai_mitm(rekam, tls=False, ubah=UBAH)
    catat(f"# Saldo Budi sebelum: {U.rp(U.saldo())}")
    catat("# App Budi mengirim Rp10.000 ke Citra lewat HTTP biasa (port 18193: proxy hotspot Dimas, bukan server). Proxy mengganti nominal dan tujuan.")
    s, _ = d.curl("POST", "/kiriman", BODY, token=token, port=U.P["mitm_polos"])
    harap(s, 201, "kiriman lewat proxy tanpa TLS")
    U.lihat_mitm(rekam, token)
    catat("# Yang tercatat di database server (satu transfer, dua posting yang berjumlah nol):")
    U.tampil_transfer()
    _transfer_dimas()
    harap(U.saldo(), U.SALDO_AWAL - 150000, "saldo Budi turun Rp150.000")
    catat(f"# Saldo Budi sesudah: {U.rp(U.saldo())}. Token Budi sah, jurnal seimbang, batas harian terpenuhi: server tidak punya yang bisa ditolak.")
    U.henti_mitm()
    return token


def _b_validasi():
    d.bagian("B. TLS dengan validasi sertifikat: proxy tiruan ditolak sebelum satu byte request keluar")
    token = U.siapkan()
    rekam = U.baru_berkas("b.jsonl")
    U.mulai_tepi("server-a", log=U.baru_berkas("tepi-b.log"))
    U.mulai_mitm(rekam, tls=True, ubah=UBAH)
    catat("# Kontrol: app Budi (hanya percaya CA Lab Publik) langsung ke server tepi: sertifikat sah, request jalan.")
    h = U.klien("validasi", ["ca-publik"], "tepi", GET_AKUN, token=token)
    harap((h.get("hasil"), h.get("status")), ("terhubung", 200), "kontrol validasi ke tepi")
    catat("# Sama, tetapi lewat hotspot Dimas: proxy memalsukan sertifikat dengan CA Dimas, yang tidak ada di daftar akar app.")
    h = U.klien("validasi", ["ca-publik"], "mitm", "/kiriman", metode="POST", token=token, body=BODY)
    harap((h.get("hasil"), h.get("jenis")), ("ditolak", "handshake"), "validasi menolak sertifikat tiruan")
    rq = U.lihat_mitm(rekam, handshake=True)
    harap(len(rq), 0, "proxy tidak membaca request apa pun")
    harap(U.sql(U.TRANSFER, tampil=False), [], "tidak ada transfer di database")
    catat("# Database: tidak ada transfer (0 baris di jurnal.jenis = 'transfer').")
    U.henti_mitm()
    U.henti_tepi()


def _c_staging_dan_flag():
    d.bagian("C. Flag \"terima sertifikat apa pun\": dari staging, tidak dicabut dari build rilis")
    token = U.siapkan()
    rekam = U.baru_berkas("c.jsonl")
    catat("# C1. Kenapa flag ada: server staging memakai sertifikat dari CA buatan sendiri (CA Staging), yang tidak ada di daftar akar app.")
    U.mulai_tepi("staging")
    h = U.klien("validasi", ["ca-publik"], "tepi", GET_AKUN, token=token)
    harap((h.get("hasil"), h.get("jenis")), ("ditolak", "handshake"), "staging ditolak validasi")
    catat("# Dengan flag, staging jalan. Bayu meminta, Raka memasangnya, dan flag ikut ke build rilis.")
    h = U.klien("terima-semua", ["ca-publik"], "tepi", GET_AKUN, token=token)
    harap((h.get("hasil"), h.get("status"), h.get("callback_dipanggil")), ("terhubung", 200, 1), "flag membuat staging jalan")
    U.henti_tepi()
    catat("# C2. Build rilis dengan flag yang sama, lewat hotspot Dimas dan server produksi (sertifikat dari CA Lab Publik).")
    U.mulai_tepi("server-a", log=U.baru_berkas("tepi-c.log"))
    U.mulai_mitm(rekam, tls=True, ubah=UBAH)
    h = U.klien("terima-semua", ["ca-publik"], "mitm", "/kiriman", metode="POST", token=token, body=BODY)
    harap((h.get("hasil"), h.get("status"), h.get("callback_dipanggil")), ("terhubung", 201, 1), "flag membiarkan sertifikat tiruan")
    rq = U.lihat_mitm(rekam, token)
    harap(len(rq), 1, "proxy membaca satu request")
    catat("# Yang tercatat di database server:")
    U.tampil_transfer()
    _transfer_dimas()
    U.henti_mitm()
    U.henti_tepi()


def _d_ca_dipercaya():
    d.bagian("D. Tanpa flag, tetapi CA Dimas ada di daftar akar app: validasi lolos, proxy tetap membaca dan mengubah")
    token = U.siapkan()
    rekam = U.baru_berkas("d.jsonl")
    U.mulai_tepi("server-a")
    U.mulai_mitm(rekam, tls=True, ubah=UBAH)
    catat("# Lab menaruh CA Dimas di daftar akar app. Bagaimana CA itu sampai di sana (profil dipasang di HP, CA yang salah menerbitkan): Tidak dijalankan.")
    h = U.klien("validasi", ["ca-publik", "ca-dimas"], "mitm", "/kiriman", metode="POST", token=token, body=BODY)
    harap((h.get("hasil"), h.get("status")), ("terhubung", 201), "CA Dimas dipercaya: validasi lolos")
    rq = U.lihat_mitm(rekam, token)
    harap(len(rq), 1, "proxy membaca satu request")
    U.tampil_transfer()
    _transfer_dimas()
    catat("# Validasi sertifikat yang benar tidak cukup bila daftar akar berisi CA yang salah: lanjut ke pin.txt.")
    U.henti_mitm()
    U.henti_tepi()


def _e_token_dipakai_dimas():
    d.bagian("E. Dimas memakai token yang dibacanya, tanpa app Budi")
    token = U.siapkan()
    rekam = U.baru_berkas("e.jsonl")
    U.mulai_tepi("server-a")
    U.mulai_mitm(rekam, tls=True)   # hanya membaca, tidak mengubah
    catat("# App Budi dengan flag terima-semua membuka saldo lewat hotspot Dimas. Proxy hanya membaca.")
    U.klien("terima-semua", ["ca-publik"], "mitm", GET_AKUN, token=token)
    rq = U.lihat_mitm(rekam, token)
    harap(len(rq), 1, "proxy membaca satu request")
    dicuri = rq[0]["authorization"].removeprefix("Bearer ")
    catat("# Dimas memakai token itu sendiri, dari laptopnya, langsung ke server: transfer Rp150.000 ke dirinya.")
    s, _ = d.curl("POST", "/kiriman", '{"ke_nomor_karyawan":"K00417","nominal":150000,"catatan":"uji lapangan"}', token=dicuri)
    harap(s, 201, "Dimas memakai token curian")
    U.tampil_transfer()
    _transfer_dimas()
    catat("# Budi membuka riwayatnya: satu kiriman keluar ke Dimas yang tidak ia buat.")
    s, isi = d.curl("GET", "/akun/419/riwayat?batas=1", token=token, tampil=False)
    harap(s, 200, "riwayat Budi")
    catat("$ curl -i -X GET '/akun/419/riwayat?batas=1' -H 'Authorization: Bearer <token sesi Budi>'")
    catat("HTTP/1.1 200 OK\nContent-Type: application/json\n\n" + d.samarkan(re.sub(r'"berikutnya":"[^"]+"', '"berikutnya":"<kursor>"', isi.strip())))
    r = d.j(isi)["riwayat"][0]
    harap((r["jenis"], r["arah"], r["lawan"], r["nominal"]), ("transfer", "keluar", "Dimas", 150000), "riwayat Budi memuat kiriman ke Dimas")
    U.henti_mitm()
    U.henti_tepi()
