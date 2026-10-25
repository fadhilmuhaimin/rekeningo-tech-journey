"""Bagian token (keputusan 978): umur token 15 menit membatasi token curian, dan redaksi log menjaga token dari log."""
import time

import umum as U
from umum import catat, d, harap, tulis

GET_AKUN = "/akun/419"


def _login_budi():
    s, isi = d.curl("POST", "/login", {"email": U.BUDI, "password": d.PASSWORD}, tampil=True,
                    daftarkan=lambda kepala, isi: isi and d.daftar_samaran(d.j(isi)["token"], "<token sesi Budi>") if '"token"' in isi else None)
    harap(s, 200, "login Budi")
    return d.j(isi)


def _cookie(token):
    s, _, _ = U.curl_tls(f"https://localhost:{U.P['tepi']}{GET_AKUN}", "-H", f"Cookie: __Host-sesi={token}",
                         tampil=f"curl -i --cacert ca-publik.pem https://localhost:{U.DASAR['tepi']}{GET_AKUN} -H 'Cookie: __Host-sesi=<token sesi Budi>'")
    harap(s, 401, "cookie tanpa dukungan cookie di jalur app")


def rekam_token():
    U.versi_client()
    d.bagian("A. Umur token 15 menit: token yang dibaca proxy berguna paling lama sisa umurnya")
    U.siapkan(["-jam-lab", "-umur-sesi", "15m"], login=False)
    catat("# Server dijalankan dengan -umur-sesi 15m (ADR 31; bawaan lab 8 jam). Login di jaringan aman:")
    t_login = int(time.time() * 1000)   # jam login (sebelum curl): tolok ukur selisih jam lab, dengan selisih puluhan detik
    j = _login_budi()
    token = j["token"]
    harap(j["kedaluwarsa_detik"], 900, "token berlaku 15 menit")
    catat("# kedaluwarsa_detik 900 = 15 menit.")
    rekam = U.baru_berkas("token.jsonl")
    U.mulai_tepi("server-a", log=U.baru_berkas("tepi-token.log"))
    U.mulai_mitm(rekam, tls=True)
    catat("# App dengan flag terima-semua membuka saldo lewat hotspot Dimas; proxy membaca token.")
    U.klien("terima-semua", ["ca-publik"], "mitm", GET_AKUN, token=token)
    rq = U.lihat_mitm(rekam, token)
    harap(len(rq), 1, "proxy membaca satu request")
    dicuri = rq[0]["authorization"].removeprefix("Bearer ")
    U.henti_mitm()
    U.henti_tepi()
    catat("# Dimas memakai token curian dari laptopnya, langsung ke server. Jam server dimajukan lewat POST /lab/jam (waktu tidak ditunggu).")
    for detik, harus, kata in ((60, 200, "1 menit sesudah login"), (14 * 60 + 30, 200, "14 menit 30 detik sesudah login"),
                               (15 * 60 + 30, 401, "15 menit 30 detik sesudah login")):
        harap(d.curl("POST", "/lab/jam", {"ms": t_login + detik * 1000}, tampil=False)[0], 204, "majukan jam lab")
        catat(f"# {kata}:")
        s, _ = d.curl("GET", GET_AKUN, token=dicuri)
        harap(s, harus, f"token curian {kata}")
    harap(d.curl("POST", "/lab/jam", {"ms": 0}, tampil=False)[0], 204, "jam lab dikembalikan")
    catat("# Token curian hanya berguna paling lama 15 menit sesudah login (sisa umur tokennya); app login lagi untuk token baru. Umur pendek tidak menghentikan pencurian: ia membatasi lamanya.")
    catat("# Tidak dijalankan: refresh token dan pencabutan token di app; api-t3 hanya punya sesi dengan umur tetap.")

    d.bagian("B. Redaksi log: token tidak muncul di log server tepi dan log api-t3; varian rentan menyalin header")
    token = d.login(U.BUDI, label="Budi")   # sesi baru; jam lab sudah dikembalikan
    log_aman = U.baru_berkas("tepi-aman.log")
    U.mulai_tepi("server-a", log=log_aman)
    catat("# B1. Server tepi dengan log akses yang menyamarkan Authorization dan Cookie. Dua request, satu sukses dan satu ditolak (401).")
    U.klien("validasi", ["ca-publik"], "tepi", GET_AKUN, token=token)
    U.klien("validasi", ["ca-publik"], "tepi", GET_AKUN, token="token-yang-salah", label_token="salah")
    catat("# Dasbor mengirim token lewat cookie, bukan header Authorization: satu request dengan cookie juga lewat tepi.")
    _cookie(token)
    time.sleep(0.2)
    teks = log_aman.read_text()
    harap(teks.count(token), 0, "token tidak ada di log tepi")
    catat("# Isi log akses tepi (token disamarkan oleh server tepi sendiri):")
    for l in teks.strip().splitlines():
        catat("  " + l)
    catat(f"# Token Budi muncul di log tepi: {teks.count(token)} kali")
    log_api = "\n".join(d.log_server())
    harap(log_api.count(token), 0, "token tidak ada di log api-t3")
    catat(f"# Token Budi muncul di log api-t3: {log_api.count(token)} kali (api-t3 tidak punya log akses; yang dicatat hanya kejadian di server).")
    U.henti_tepi()
    catat("# B2. Varian rentan: server tepi yang log aksesnya menyalin header (-log-mentah). Request yang sama.")
    log_mentah = U.baru_berkas("tepi-mentah.log")
    U.mulai_tepi("server-a", log=log_mentah, mentah=True)
    U.klien("validasi", ["ca-publik"], "tepi", GET_AKUN, token=token)
    _cookie(token)
    time.sleep(0.2)
    teks = log_mentah.read_text()
    harap(teks.count(token), 2, "log mentah menyalin token dari Authorization dan Cookie")
    catat("# Isi log akses tepi:")
    for l in teks.strip().splitlines():
        catat("  " + d.samarkan(l))
    catat(f"# Token Budi muncul di log tepi: {teks.count(token)} kali (satu dari Authorization, satu dari Cookie). Siapa pun yang boleh membaca log (atau layanan pengumpul log) boleh memakai token itu selama 15 menit.")
    U.henti_tepi()
    tulis("token.txt", "Umur token 15 menit dan redaksi log")
