"""Rekam lab t3-dasbor (keputusan 974, 975): dasbor kecil Wulan untuk warung, mode rentan dan benar untuk XSS
tersimpan (M25), CSRF, cookie sesi, dan satu percobaan WebAuthn dengan authenticator virtual (R3-19, R3-20).

Server dasbor dan "serangan" (halaman Dimas) adalah dua binary Go kecil lab ini (go/cmd/dasbor, go/cmd/serangan),
di atas schema yang sama dengan labs/api-t3 (dibuat dan diisi lewat labs/api-t3/dasar_t3.py, tanpa migrasi sendiri).
Bukti perilaku browser (dialog alert() dari onerror, pembacaan document.cookie, elemen <img> nyata di DOM, akibat
CSRF lintas situs) berasal dari Chromium sungguhan lewat Playwright (js/driver.js, Node; situs sudah memasang
Playwright, lab ini tidak menambah dependency Node baru). Setiap bagian membuat ulang schema dan data awal dari
nol lewat labs/api-t3, jadi output/*.txt tidak bergantung pada urutan bagian. Lab gagal keras bila port sudah
dipakai, alat (Go, Node, Docker) tidak ada, atau hasilnya meleset dari yang diharapkan (keputusan 79, 95).

    make -C labs/t3-dasbor run                 (butuh Docker, Go, Node; ±1 menit)
    make -C labs/t3-dasbor run BAGIAN=csrf     (satu bagian: xss csrf webauthn)
"""
import json
import os
import pathlib
import shutil
import socket
import subprocess
import sys
import tempfile
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "api-t3"))
sys.path.insert(0, str(HERE.parent))
import dasar_t3 as d  # noqa: E402,F401
from dasar_t3 import PORT, bagian, catat, gagal, harap, samarkan, satu, sql, tulis  # noqa: E402,F401
from lab_env import port_lab  # noqa: E402

d.OUT = HERE / "output"   # dasar_t3 menulis ke folder lab api-t3 bila tidak diganti

GO = HERE / "go"
BIN = HERE / "bin"
JS = HERE / "js"
SITUS_NODE_MODULES = HERE.parent.parent / "situs" / "node_modules"   # Playwright sudah dipasang di situs

# Port dasar lab ini (rekaman selalu memakai port dasar, labs/README.md). Tidak boleh jalan bersamaan dengan lab
# lain yang memakai port yang sama di lajur yang sama; 18200-18201 belum dipakai lab Tahap 3 lainnya.
DASAR = {"dasbor": 18200, "serangan": 18201}
P = {k: port_lab(v) for k, v in DASAR.items()}

DIMAS = "dimas@lestari.example"       # akun 417 (labs/api-t3/cmd/api/seed.go)
ANI = "warung.ani@lestari.example"    # akun 418, Warung Ani
SARI = "warung.sari@lestari.example"  # akun 502, Warung Sari (sesi kedua untuk skenario token sesi lain)
PASSWORD = "sementara-tahap-3"        # password data lab semua akun, bukan secret (labs/api-t3/README.md)
PAYLOAD = "<img src=x onerror=alert(1)>"   # catatan M25, 29 karakter, lolos batas 100 karakter (MaksCatatan)


def tulis_lokal(nama, judul):
    tulis(nama, judul, lab="t3-dasbor", dasar=DASAR["dasbor"], keputusan="974")


def periksa_alat():
    hilang = [a for a in ("go", "node") if shutil.which(a) is None]
    if hilang:
        gagal(f"{' dan '.join(hilang)} tidak ada di PATH: lab t3-dasbor butuh Go, Node, dan Docker")
    if not SITUS_NODE_MODULES.exists():
        gagal(f"{SITUS_NODE_MODULES} tidak ada: jalankan `bun install --cwd situs` dulu (Playwright dipakai dari situs)")


def bangun_go():
    BIN.mkdir(exist_ok=True)
    for nama in ("dasbor", "serangan"):
        subprocess.run(["go", "build", "-o", str(BIN / nama), f"./cmd/{nama}"], cwd=GO, check=True)


def jalankan(port, cmd, env_lain=None):
    """Satu proses di port itu, terdaftar di d.server supaya d.stop/d.gagal/d.tulis ikut membersihkannya
    (sama dengan labs/t3-mitm/umum.py)."""
    d.port_bebas(port)
    f = tempfile.TemporaryFile(mode="a+")
    env = dict(os.environ, **(env_lain or {}))
    p = subprocess.Popen([str(c) for c in cmd], env=env, stdout=f, stderr=f, text=True)
    for _ in range(200):
        if p.poll() is not None:
            f.seek(0)
            gagal(f"{pathlib.Path(str(cmd[0])).name} berhenti: {f.read()[-300:]}")
        with socket.socket() as s:
            if s.connect_ex(("127.0.0.1", port)) == 0:
                break
        time.sleep(0.05)
    else:
        gagal(f"{pathlib.Path(str(cmd[0])).name} tidak menyala")
    d.server[port] = (p, f)


# Kedua server mengikat 127.0.0.1 secara harfiah (bukan nama): tidak bergantung pada resolver, dan pagar.Loopback
# menolak yang lain. Browser tetap membuka http://localhost:<port> (dasbor) dan http://penyerang.localhost:<port>
# (halaman Dimas); Chromium me-resolve keduanya ke loopback sendiri (RFC 6761 §6.3), jadi keduanya tetap beda situs.


def mulai_dasbor(escape="", csp="", cookie="", samesite="", token=""):
    if P["dasbor"] in d.server:
        d.stop(P["dasbor"])
    jalankan(P["dasbor"],
             [BIN / "dasbor", "-addr", f"127.0.0.1:{P['dasbor']}",
              "-escape", escape, "-csp", csp, "-cookie", cookie, "-samesite", samesite, "-token", token],
             env_lain={"DATABASE_URL": d.db_app(nama="t3-dasbor")})


def mulai_serangan():
    jalankan(P["serangan"],
             [BIN / "serangan", "-addr", f"127.0.0.1:{P['serangan']}",
              "-sasaran", f"http://localhost:{P['dasbor']}"])


def siapkan_schema():
    """Schema bersih sampai akhir Tahap 2 + api-t3 (labs/api-t3/dasar_t3.py), tanpa migrasi sendiri."""
    d.buat_schema()
    d.bangun()
    d.seed()


def siapkan_payload():
    """Dimas membayar Warung Ani lewat api-t3 sungguhan dengan catatan M25, lalu api-t3 dihentikan: dasbor lab
    ini membaca schema langsung, tidak lewat api-t3 (dua binary terpisah, satu database)."""
    d.mulai_api()
    tok = d.login(DIMAS, label="Dimas")
    status, isi = d.curl("POST", "/transfers", {"ke": 418, "jumlah": 5000, "catatan": PAYLOAD}, token=tok, tampil=False)
    harap(status, 201, "Dimas membayar Rp5.000 ke Warung Ani dengan catatan M25 lewat api-t3")
    d.stop(PORT)


def node(mode, *arg, batas=30):
    """Satu proses Node yang menjalankan js/driver.js lewat Playwright (Chromium nyata). NODE_PATH menunjuk ke
    situs/node_modules: lab ini tidak memasang Playwright sendiri."""
    cmd = ["node", str(JS / "driver.js"), mode, *arg]
    env = dict(os.environ, NODE_PATH=str(SITUS_NODE_MODULES))
    r = subprocess.run(cmd, cwd=JS, env=env, capture_output=True, text=True, timeout=batas)
    if r.returncode != 0:
        if "Executable doesn't exist" in r.stderr:
            gagal("Chromium Playwright belum terpasang: jalankan `cd situs && bunx playwright install chromium` "
                  "(lab ini memakai Playwright situs, tanpa dependency baru)")
        gagal(f"driver.js {mode} gagal: {r.stderr[-600:]}")
    baris = [l for l in r.stdout.splitlines() if l.strip()]
    if not baris:
        gagal(f"driver.js {mode}: tanpa keluaran di stdout")
    return json.loads(baris[-1])


def harga_produk1():
    return satu("SELECT harga FROM produk WHERE id = 1"), satu("SELECT versi FROM produk WHERE id = 1")


def catat_json(label, obj):
    catat(f"$ {label}")
    catat(samarkan(json.dumps(obj, ensure_ascii=False, sort_keys=True)))


# ---------- bagian XSS: M25 ----------

def rekam_xss():
    siapkan_schema()
    siapkan_payload()
    catat(f'# Dimas membayar Warung Ani lewat api-t3 dengan catatan "{PAYLOAD}" (M25); api-t3 lalu dihentikan')
    catat("# dasbor membaca jurnal dan posting langsung dari schema yang sama (sql: lihat labs/api-t3/internal/repo/katalog.go RiwayatPenerimaan)")
    url_login = f"http://localhost:{P['dasbor']}/login"
    url_dasbor = f"http://localhost:{P['dasbor']}/dasbor"

    bagian("A. Mode rentan: keterangan lewat innerHTML tanpa escape, tanpa CSP, cookie tanpa HttpOnly")
    mulai_dasbor(escape="rentan", csp="mati", cookie="rentan", samesite="none", token="tidak")
    hasil = node("xss", url_login, ANI, PASSWORD, url_dasbor)
    catat_json("node driver.js xss ... (Playwright, Chromium nyata)", hasil)
    harap(len(hasil["dialogs"]), 1, "satu dialog muncul (alert dari onerror)")
    harap(hasil["dialogs"][0]["type"], "alert", "jenis dialog adalah alert()")
    harap(hasil["dialogs"][0]["message"], "1", 'pesan dialog "1", sama dengan cerita M25 ("kotak peringatan berisi angka 1")')
    harap(hasil["elemImgDiDaftar"], 1, "elemen <img> nyata terbentuk di #daftar lewat innerHTML")
    harap(hasil["cookieJSBisaDibaca"], True, "document.cookie bisa dibaca skrip: cookie tanpa HttpOnly")
    harap(hasil["cookieJSMemuatNamaSesi"], True, "cookie sesi memang yang terbaca, bukan cookie lain")
    harap(hasil["cookieHttpOnly"], False, "cookie rentan: HttpOnly tidak dipasang")
    harap(hasil["cookieName"], "sesi", "cookie rentan: tanpa awalan __Host-")
    harap(hasil["cspPelanggaran"], [], "tanpa CSP tidak ada yang diblokir")
    d.stop(P["dasbor"])

    bagian("B. Mode benar: textContent, CSP dengan nonce, cookie __Host- + HttpOnly")
    mulai_dasbor()
    hasil = node("xss", url_login, ANI, PASSWORD, url_dasbor)
    catat_json("node driver.js xss ... (Playwright, Chromium nyata)", hasil)
    harap(len(hasil["dialogs"]), 0, "tidak ada dialog: onerror tidak pernah berjalan")
    harap(hasil["elemImgDiDaftar"], 0, "tidak ada elemen <img> yang terbentuk; textContent tidak pernah menafsir HTML")
    harap(PAYLOAD in hasil["teksDaftar"], True, "payload tetap terlihat pembaca sebagai teks biasa, bukan hilang")
    harap(hasil["cookieJSBisaDibaca"], False, "document.cookie kosong: HttpOnly menyembunyikan cookie dari skrip")
    harap(hasil["cookieHttpOnly"], True, "cookie benar: HttpOnly terpasang")
    harap(hasil["cookieName"], "__Host-sesi", "cookie benar: awalan __Host- (MDN Set-Cookie, R3-19)")
    d.stop(P["dasbor"])

    bagian("C. innerHTML tetap dipakai (escape rentan) tapi CSP tetap aktif: lapis kedua yang menahan sendiri")
    mulai_dasbor(escape="rentan")
    hasil = node("xss", url_login, ANI, PASSWORD, url_dasbor)
    catat_json("node driver.js xss ... (Playwright, Chromium nyata)", hasil)
    harap(len(hasil["dialogs"]), 0, "CSP sendiri menahan onerror walau HTML sempat masuk DOM lewat innerHTML")
    harap(hasil["elemImgDiDaftar"], 1, "elemen <img> tetap terbentuk (escape memang rentan di skenario ini)")
    harap(hasil["cspPelanggaran"], [{"diblokir": "inline", "efektif": "script-src-attr"}],
          "browser sendiri melaporkan pemblokiran: event handler inline (script-src-attr), bukan sebab lain")
    d.stop(P["dasbor"])

    bagian("D. XSS mengalahkan CSRF: escape dan CSP rentan, tapi cookie dan token CSRF tetap benar (R3-19)")
    mulai_dasbor(escape="rentan", csp="mati")   # cookie, samesite, token: bawaan benar
    harga_sebelum, _ = harga_produk1()
    hasil = node("xss-lawan-csrf", url_login, ANI, PASSWORD, url_dasbor)
    catat_json("node driver.js xss-lawan-csrf ... (Playwright, Chromium nyata)", hasil)
    harga_sesudah, _ = harga_produk1()
    catat(f"# harga produk 1 sebelum: Rp{harga_sebelum}, sesudah skrip yang sama memanggil /api/menu/harga: Rp{harga_sesudah}")
    harap(len(hasil["dialogs"]), 1, "onerror tetap berjalan (escape dan CSP rentan)")
    harap(hasil["statusFetch"], 200, "fetch same-origin dengan token dan cookie halaman sendiri diterima (200)")
    harap(harga_sesudah, 2, "harga berubah walau token CSRF, Origin, dan cookie __Host- semuanya benar")
    catat("# Skrip tidak menembus token/Origin/Sec-Fetch-Site: ia berjalan sebagai halaman itu sendiri (same-origin,")
    catat("# membaca variabel global csrf di halaman), jadi semua pemeriksaan itu lolos secara sah. XSS mengalahkan")
    catat("# CSRF bukan dengan memalsukan permintaan lintas situs, tapi dengan tidak perlu melakukannya sama sekali.")
    d.stop(P["dasbor"])

    bagian("E. escape benar (textContent) tapi CSP mati: lapis pertama menahan sendirian")
    mulai_dasbor(csp="mati")
    hasil = node("xss", url_login, ANI, PASSWORD, url_dasbor)
    catat_json("node driver.js xss ... (Playwright, Chromium nyata)", hasil)
    harap(len(hasil["dialogs"]), 0, "tanpa CSP, textContent sendiri menahan: onerror tidak pernah berjalan")
    harap(hasil["elemImgDiDaftar"], 0, "tidak ada elemen <img>: HTML tidak pernah terbentuk")
    harap(PAYLOAD in hasil["teksDaftar"], True, "payload tetap terlihat sebagai teks biasa")
    harap(hasil["cspPelanggaran"], [], "tidak ada CSP yang bekerja di skenario ini (dimatikan)")
    catat("# Kesimpulan: escape (E) dan CSP (C) masing-masing cukup sendirian menahan onerror untuk payload ini;")
    catat("# hanya saat keduanya mati sekaligus (A, D) onerror berjalan. Defense-in-depth, bukan satu lapis saja (ADR 30).")
    catat("# HttpOnly (B, C, D, E) menyembunyikan cookie dari skrip, tetapi D menunjukkan skrip yang berjalan tetap bisa")
    catat("# bertindak atas nama Ani: HttpOnly mengurangi akibat XSS, tidak menggantikan escape dan CSP.")
    d.stop(P["dasbor"])

    tulis_lokal("xss.txt", "M25: XSS tersimpan lewat catatan pembayaran, cookie sesi, CSP, dan XSS yang mengalahkan CSRF")


# ---------- bagian CSRF ----------

# (label, flag, deskripsi, harus_berhasil, yang diharapkan sampai ke dasbor: (cookie terkirim, status, isi jawaban)).
# Harga yang tidak berubah belum membuktikan SEBAB penolakan: permintaan yang tidak pernah sampai, atau sampai tanpa
# cookie (401), atau sampai dengan cookie lalu ditolak gerbang CSRF (403 csrf) semuanya meninggalkan harga yang sama.
# Karena itu driver menangkap permintaan POST lintas situs itu di sisi browser (status, isi, ada tidaknya header
# Cookie) dan run.py menuntut jenis penolakannya.
SKENARIO_CSRF = [
    ("A", dict(token="tidak", samesite="none", cookie="rentan"),
     "tanpa token CSRF, tanpa pemeriksaan Origin/Sec-Fetch-Site, cookie SameSite=None;Secure", True,
     (True, 200, '{"ok":true}')),
    ("B", dict(token="tidak"),
     "masih tanpa token dan tanpa pemeriksaan Origin/Sec-Fetch-Site, cookie SameSite=Lax saja", False,
     (False, 401, '{"error":"belum login"}')),
    ("C", dict(),
     "token X-CSRF-Token, Origin dan Sec-Fetch-Site diperiksa, cookie SameSite=Lax (R3-19)", False,
     (False, 401, '{"error":"belum login"}')),
    ("D", dict(samesite="none"),
     "token X-CSRF-Token, Origin dan Sec-Fetch-Site diperiksa, TAPI cookie SameSite=None (token sendirian menahan)", False,
     (True, 403, '{"error":"csrf"}')),
    ("E", dict(token="tidak", samesite="default"),
     "tanpa token, atribut SameSite TIDAK ditulis (bawaan browser): serangan sesaat sesudah login lewat (R3-81)", True,
     (True, 200, '{"ok":true}')),
]


def rekam_csrf():
    siapkan_schema()
    mulai_serangan()
    url_login = f"http://localhost:{P['dasbor']}/login"
    url_dasbor = f"http://localhost:{P['dasbor']}/dasbor"
    url_serangan = f"http://penyerang.localhost:{P['serangan']}/"
    url_serangan_rekaman = f"http://penyerang.localhost:{DASAR['serangan']}/"   # rekaman memakai port dasar, sama di semua lajur
    for label, flags, deskripsi, harus_berhasil, (cookie, status, isi) in SKENARIO_CSRF:
        bagian(f"{label}. {deskripsi}")
        mulai_dasbor(**flags)
        harga_sebelum, versi_sebelum = harga_produk1()
        catat(f"# harga produk 1 (Nasi goreng, Warung Ani) sebelum: Rp{harga_sebelum} (versi {versi_sebelum})")
        hasil = node("csrf", url_login, ANI, PASSWORD, url_dasbor, url_serangan)
        catat(f"# {url_serangan_rekaman} (penyerang.localhost, situs lain) memuat form yang langsung submit POST")
        catat("# ke /api/menu/harga produk_id=1 harga=1, dalam browser yang sama dengan sesi Ani")
        catat_json("permintaan POST lintas situs yang dicatat browser (node driver.js csrf ...)", hasil["permintaan"])
        harap(len(hasil["permintaan"]), 1, "tepat satu POST lintas situs sampai ke /api/menu/harga")
        req = hasil["permintaan"][0]
        harap(req["secFetchSite"], "cross-site", "browser menandai permintaan ini lintas situs (Sec-Fetch-Site)")
        harap(req["originAsing"], True, "header Origin permintaan itu asal halaman Dimas, bukan dasbor")
        harap(req["cookieTerkirim"], cookie, "cookie sesi " + ("terkirim" if cookie else "TIDAK terkirim") + " bersama permintaan lintas situs itu")
        harap(req["status"], status, "status jawaban dasbor")
        harap(req["isi"], isi, "isi jawaban dasbor menyebut jenis penolakannya")
        harga_sesudah, versi_sesudah = harga_produk1()
        catat(f"# harga produk 1 sesudah: Rp{harga_sesudah} (versi {versi_sesudah})")
        if harus_berhasil:
            harap(harga_sesudah, 1, "harga berubah: permintaan lintas situs berhasil (rentan)")
            harap(versi_sesudah, versi_sebelum + 1, "versi naik satu kali")
        else:
            harap(harga_sesudah, harga_sebelum, "harga tidak berubah: permintaan lintas situs ditolak")
            harap(versi_sesudah, versi_sebelum, "versi tidak naik")
        d.stop(P["dasbor"])
        sql("UPDATE produk SET harga = 25000, versi = versi + 1 WHERE id = 1", tampil=False)
    d.stop(P["serangan"])
    rekam_token_sesi_lain(url_login)
    catat("# B menunjukkan: SameSite=Lax saja (tanpa token) sudah menahan form POST lintas situs yang sederhana ini")
    catat("# di Chromium versi lab ini, karena cookie itu sendiri tidak pernah terkirim lintas situs: request masuk")
    catat("# sebagai belum login, gerbang token (csrfSah) tidak pernah tercapai. Itu sebabnya mutasi yang menghapus")
    catat("# token/Origin/Sec-Fetch-Site tidak terlihat di B atau C. D memaksa cookie tetap terkirim (SameSite=None)")
    catat("# supaya gerbang token BENAR teruji: permintaan sampai ke server berstatus login, dan token/Origin/")
    catat("# Sec-Fetch-Site sendirian yang menahan. OWASP tetap mewajibkan token (R3-19) karena SameSite tidak")
    catat("# menutup semua jalur (endpoint yang juga menerima GET, subdomain yang berbagi cookie, klien lama).")
    catat("# E menunjukkan sebaliknya: bila atribut SameSite tidak ditulis, POST lintas situs sesaat sesudah login tetap")
    catat("# membawa cookie dan lewat. Itu cocok dengan masa tenggang dua menit untuk Lax bawaan (MDN Set-Cookie, R3-81);")
    catat("# lab tidak menunggu dua menit, jadi batas waktu itu sendiri tidak diukur. Yang menahan di B adalah Lax yang")
    catat("# ditulis eksplisit, bukan Lax yang dibiarkan bawaan browser.")
    tulis_lokal("csrf.txt", "CSRF: tanpa token, SameSite=Lax saja, token saat SameSite tidak menahan, dan keduanya (R3-19)")


def rekam_token_sesi_lain(url_login):
    """Token CSRF terikat ke sesi: token milik sesi Ani tidak berlaku di sesi Sari. Tanpa skenario ini, token yang
    sama untuk semua sesi (bukan rahasia per sesi) tidak terlihat oleh rekaman mana pun."""
    bagian("F. token CSRF milik sesi lain (token terikat ke sesi), SameSite=Lax dan gerbang lengkap")
    mulai_dasbor()
    harga_sebelum, versi_sebelum = harga_produk1()
    hasil = node("csrf-sesi-lain", url_login, ANI, PASSWORD, SARI, PASSWORD)
    catat_json("node driver.js csrf-sesi-lain ... (dua konteks browser: Ani dan Sari)", hasil)
    harap(hasil["denganTokenSesiLain"], {"isi": '{"error":"csrf"}', "status": 403},
          "token Ani di sesi Sari ditolak gerbang CSRF, bukan oleh pemeriksaan lain")
    harap(hasil["denganTokenSendiri"], {"isi": '{"error":"produk bukan milik akun ini"}', "status": 403},
          "token Sari di sesi Sari lolos gerbang CSRF (kontrol): yang menolak kini kepemilikan produk")
    harga_sesudah, versi_sesudah = harga_produk1()
    harap((harga_sesudah, versi_sesudah), (harga_sebelum, versi_sebelum), "harga dan versi produk Ani tidak berubah")
    d.stop(P["dasbor"])


# ---------- bagian WebAuthn (R3-20) ----------

def rekam_webauthn():
    siapkan_schema()
    mulai_dasbor()
    bagian("Percobaan WebAuthn dengan authenticator virtual lewat Chrome DevTools Protocol (R3-20)")
    hasil = node("webauthn", f"localhost:{P['dasbor']}", "localhost")
    if "authenticatorId" in hasil:
        hasil["authenticatorId"] = "<id authenticator virtual>"   # acak tiap jalan, diganti label tetap
    catat_json("node driver.js webauthn localhost:<port dasbor> localhost (CDP WebAuthn, authenticator virtual)", hasil)
    if hasil.get("ok"):
        harap(hasil["id"], "ada", "navigator.credentials.create() mengembalikan kredensial")
        catat("# Rekaman lab: ceremony pembuatan passkey sisi browser (navigator.credentials.create) selesai tanpa")
        catat("# interaksi manusia lewat authenticator virtual CDP. R3-20 menulis halaman CDP WebAuthn sebagai")
        catat('# "pengalihan" [perlu verifikasi]: di Playwright/Chromium versi lab ini, domain WebAuthn CDP')
        catat("# menjalankan ceremony sungguhan (bukan hanya pengalihan ke halaman lain).")
    else:
        catat("# authenticator virtual CDP tidak menyelesaikan ceremony di lingkungan ini; lihat README \"Tidak dijalankan\".")
    catat("# Tidak dijalankan: login passkey penuh (registrasi tersimpan di server, verifikasi signature oleh")
    catat("# relying party, assertion login) — itu butuh pustaka WebAuthn sisi server (mis. go-webauthn) sebagai")
    catat("# dependency baru di luar lingkup dasbor kecil ini; perlu ADR tersendiri (README \"Yang belum ada\").")
    d.stop(P["dasbor"])
    tulis_lokal("webauthn.txt", "Percobaan WebAuthn dengan authenticator virtual (R3-20)")


BAGIAN = {"xss": rekam_xss, "csrf": rekam_csrf, "webauthn": rekam_webauthn}


def main():
    pilih = sys.argv[1:] or list(BAGIAN)
    for p in pilih:
        if p not in BAGIAN:
            gagal(f"bagian tidak dikenal: {p} (pilihan: {' '.join(BAGIAN)})")
    periksa_alat()
    bangun_go()
    try:
        for p in pilih:
            BAGIAN[p]()
    finally:
        for port in list(d.server):
            d.stop(port, sinyal="kill")


if __name__ == "__main__":
    main()
