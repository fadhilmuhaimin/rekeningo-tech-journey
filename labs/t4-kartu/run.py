"""Rekam lab t4-kartu: penerbit kartu tiruan, hold di ledger, tenggat 2 detik, kedaluwarsa, dan kill switch.

Server (api-t4 dengan mode rentan kartu-tanpa-hold), skema, data awal, penerbit tiruan (`cmd/penerbit`), dan service
pembayaran terpisah (`cmd/pembayaran`) adalah milik `labs/api-t4` (`dasar_t4.py`), bukan salinan. Yang baru di lab ini:
rekaman terarah untuk M37 dan ADR 42, sisi ledger hold kartu (`internal/service/ledger_kartu.go`, rute
`POST /ledger/kartu/tahan`), otorisasi di service pembayaran (`internal/modul/pembayaran/kartu.go`), catatan keputusan
di penerbit tiruan, dan tesnya. Setiap bagian membuat ulang schema dan data awal dari nol, jadi output/*.txt tidak
bergantung pada urutan bagian dan rekaman ulang identik per byte (make cek). Waktu, token, dan nomor jurnal yang
bergantung urutan disamarkan; lama menunggu (lock_timeout, tenggat, latensi) hanya direkam sebagai batas yang diperiksa,
dan waktu yang diperankan (7 hari, 24 jam) tidak ditunggu. Pihak ketiga (penerbit kartu) adalah tiruan lokal. Lab gagal
keras bila hasil meleset dari yang diharapkan.

    make -C labs/t4-kartu run                      (butuh: Docker, Go; PostgreSQL lewat labs/b3-race)
    make -C labs/t4-kartu run BAGIAN=tenggat       (satu bagian: otorisasi tenggat kedaluwarsa kill-switch penerbit dua-service testing)
"""
import datetime, http.client, json, os, pathlib, re, signal, subprocess, sys, threading, time

import psycopg

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "api-t4"))
import dasar_t4 as d  # noqa: E402
from dasar_t4 import PORT, PORT_PENERBIT, bagian, catat, curl, gagal, harap, j, samaran  # noqa: E402

LAB = "t4-kartu"
SCH = "tahap4_kartu"          # schema lab ini (22 tabel api-t4, satu schema)
TES = "tahap4_kartu_tes"      # schema untuk tes Go
d.OUT = HERE / "output"       # dasar_t4.tulis menulis ke d.OUT; di sini output lab ini
DASAR_PEMBAYARAN = 18286      # service pembayaran (api-t4: 18280 sampai 18285)
PORT_PEMB = d.port_lab(DASAR_PEMBAYARAN)
BIN_PEMB = d.HERE / "pembayaran"
KUNCI_LAYANAN = "kunci-layanan-pembayaran-lab"   # data lab, bukan secret: kunci layanan antar service
APP_API = "t4-kartu-api"      # application_name koneksi monolith; tes yang membaca pg_stat_activity menyaring dengan nama ini
APP_PEMB = "t4-kartu-pembayaran"
TENGGAT = 2.0                 # tenggat jawaban otorisasi penerbit tiruan, detik (dokumentasi satu penerbit; tanpa merek di halaman)
LOCK_TIMEOUT = 1.0            # lock_timeout otorisasi di ledger, detik (ADR 42)
BATAS_P95 = 0.25              # batas lab untuk p95 otorisasi tanpa kontensi, detik (Asumsi lab, 1/8 tenggat)


def rp(n):
    return "Rp" + f"{n:,}".replace(",", ".")


def ulang_samaran():
    d.samaran.clear()
    d._urut_order[0] = 0
    d._urut_uuid[0] = 0


def tulis(nama, judul, teks_server):
    """Seperti dasar_t4.tulis, tetapi kepala menyebut semua server yang dipakai bagian ini."""
    for port in list(d.server):
        d.stop(port)
    versi = d.satu("SHOW server_version", "public")
    kepala = [f"# Lab {LAB} · {judul}",
              f"# PostgreSQL {versi} · {d.versi_alat()} · pgx {d.PGX} · schema {SCH} · {teks_server}",
              f"# Rekaman dari database bersih: make -C labs/{LAB} run."]
    d.OUT.mkdir(exist_ok=True)
    (d.OUT / nama).write_text("\n".join(l.rstrip() for l in "\n".join(kepala + d.log).split("\n")) + "\n")
    print("ditulis:", f"labs/{LAB}/output/{nama}")
    d.log.clear()


def sql(q, tampil=True):
    return d.sql(q, tampil=tampil, schema=SCH)


def satu(q, arg=None):
    return d.satu(q, SCH, arg)


def bangun():
    d.bangun()
    subprocess.run(["go", "build", "-o", str(BIN_PEMB), "./cmd/pembayaran"], cwd=d.HERE, check=True)


# ---------- data dan proses ----------

def siapkan():
    ulang_samaran()
    d.buat_schema(SCH)
    d.seed(SCH)


def mulai_penerbit(extra=()):
    d.mulai_penerbit(args=list(extra))


def mulai_api(extra=(), tampil=None):
    d.mulai_api(list(extra), tampil=tampil, db=d.db_app(SCH, APP_API))


def mulai_pembayaran(extra=()):
    d.mulai(BIN_PEMB, PORT_PEMB,
            ["-lab", "-ledger-url", f"http://127.0.0.1:{PORT}", "-ledger-kunci", KUNCI_LAYANAN, "-ledger-timeout", "1500ms",
             "-penerbit-kunci", d.KUNCI_PENERBIT, "-gateway-url", f"http://127.0.0.1:{d.PORT_GATEWAY}", *extra],
            db=d.db_app(SCH, APP_PEMB))


def ganti_api(extra=()):
    d.stop(PORT)
    mulai_api(extra)


def aturan_penerbit(bila_timeout=None, tenggat_ms=None):
    body = {}
    if bila_timeout:
        body["bila_timeout"] = bila_timeout
    if tenggat_ms:
        body["tenggat_ms"] = tenggat_ms
    s, _ = curl("POST", "/lab/aturan", body, port=PORT_PENERBIT, tampil=False)
    harap(s, 204, "aturan penerbit")


def buat_pemakai(akun, nama, saldo):
    """Akun pemakai terverifikasi dengan saldo, ditulis sebagai pemilik schema (data awal tambahan lab, seperti seed).
    Password sama dengan Eko (40002) supaya akun ini bisa login dan menerbitkan kartu lewat POST /kartu."""
    with d.sambung(SCH, autocommit=False) as c:
        hash_ = c.execute("SELECT password_hash FROM akun WHERE id = 40002").fetchone()[0]
        c.execute("INSERT INTO akun (id, jenis, nama, email, password_hash, tingkat) VALUES (%s, 'pemakai', %s, %s, %s, 'terverifikasi')",
                  (akun, nama, f"kartu{akun}@publik.example", hash_))
        c.execute("INSERT INTO buku (akun_id, jenis, batas_harian) VALUES (%s, 'pemakai', 500000)", (akun,))
        bank = c.execute("SELECT id FROM buku WHERE jenis = 'bank'").fetchone()[0]
        buku = c.execute("SELECT id FROM buku WHERE akun_id = %s", (akun,)).fetchone()[0]
        jr = c.execute("INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('topup', 'Saldo awal lab t4-kartu', 400) RETURNING id").fetchone()[0]
        c.execute("INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES (%s, %s, %s), (%s, %s, %s)", (jr, bank, -saldo, jr, buku, saldo))
        c.execute("UPDATE buku b SET saldo_cache = (SELECT coalesce(sum(jumlah), 0) FROM posting p WHERE p.buku_id = b.id) WHERE b.id IN (%s, %s)", (bank, buku))
        c.commit()


def pemakai_dengan_kartu(akun, nama, saldo):
    """Pemakai baru dengan saldo, kartu diterbitkan lewat POST /kartu (penerbit tiruan). Mengembalikan token kartu."""
    buat_pemakai(akun, nama, saldo)
    tok = d.login(f"kartu{akun}@publik.example", label=nama)
    s, _ = curl("POST", "/kartu", {}, tok, tampil=False)
    harap(s, 201, f"terbitkan kartu {nama}")
    token = satu("SELECT token_penerbit FROM kartu WHERE akun_id = %s", (akun,))
    samaran[token] = f"<token kartu {nama}>"
    catat(f"# {nama} (akun {akun}): saldo {rp(saldo)}, kartu virtual diterbitkan lewat POST /kartu (token acak dari penerbit tiruan tidak direkam)")
    return token


def serentak(kerja):
    hasil, thread = [None] * len(kerja), []
    for i, f in enumerate(kerja):
        t = threading.Thread(target=lambda i=i, f=f: hasil.__setitem__(i, f()))
        t.start()
        thread.append(t)
    return hasil, thread


def tunggu_semua(thread):
    for t in thread:
        t.join(60)
        harap(t.is_alive(), False, "thread selesai")


def otor(id_, token, jumlah):
    """Penerbit tiruan meminta persetujuan ke Rekeningo dengan tenggatnya; mengembalikan {keputusan, sumber, alasan?}."""
    s, isi = curl("POST", "/lab/otorisasi", {"id_penerbit": id_, "token": token, "jumlah": jumlah}, port=PORT_PENERBIT, tampil=False, maks=30)
    harap(s, 200, f"/lab/otorisasi {id_}")
    return j(isi)


def ringkas(h):
    return f"{h['keputusan']} (sumber: {h['sumber']}" + (f", alasan: {h['alasan']}" if h.get("alasan") else "") + ")"


def lapor(id_, jumlah, h):
    catat(f"{id_} {rp(jumlah)}: {ringkas(h)}")


def langsung(id_, token, jumlah):
    """Panggilan langsung ke Rekeningo seperti yang dikirim penerbit (tanpa tenggat): /penerbit/otorisasi di monolith."""
    s, isi = curl("POST", "/penerbit/otorisasi", {"id_penerbit": id_, "token": token, "jumlah": jumlah}, tampil=False, maks=60,
                  kepala=[f"X-Penerbit-Kunci: {d.KUNCI_PENERBIT}"])
    return s, j(isi)


def langsung_pemb(id_, token, jumlah):
    s, isi = curl("POST", "/penerbit/otorisasi", {"id_penerbit": id_, "token": token, "jumlah": jumlah}, port=PORT_PEMB, tampil=False, maks=60,
                  kepala=[f"X-Penerbit-Kunci: {d.KUNCI_PENERBIT}"])
    return s, j(isi)


def clearing(id_, jumlah):
    s, isi = curl("POST", "/lab/clearing", {"id_penerbit": id_, "jumlah": jumlah}, port=PORT_PENERBIT, tampil=False, maks=30)
    return s, j(isi)


def reversal(id_):
    s, isi = curl("POST", "/lab/reversal", {"id_penerbit": id_}, port=PORT_PENERBIT, tampil=False, maks=30)
    return s, j(isi)


# ---------- lock yang dipegang lab dan penunggu ----------

def pegang_buku(akun):
    """Transaction lab yang mengunci buku pemilik kartu (seperti transfer atau top-up yang lama). Dilepas dengan lepas()."""
    c = psycopg.connect(d.PEMILIK.replace("application_name=api-t4-pemilik", "application_name=t4-kartu-penahan") + f" options=-csearch_path={SCH}", autocommit=False)
    c.execute("SELECT id FROM buku WHERE akun_id = %s FOR UPDATE", (akun,))
    return c


def pegang_buku_sistem(jenis):
    """Seperti pegang_buku, untuk buku sistem (dana_tertahan): satu baris yang di-UPDATE oleh semua hold."""
    c = psycopg.connect(d.PEMILIK.replace("application_name=api-t4-pemilik", "application_name=t4-kartu-penahan") + f" options=-csearch_path={SCH}", autocommit=False)
    c.execute("SELECT id FROM buku WHERE akun_id IS NULL AND jenis = %s FOR UPDATE", (jenis,))
    return c


def pegang_otorisasi(id_):
    c = psycopg.connect(d.PEMILIK.replace("application_name=api-t4-pemilik", "application_name=t4-kartu-penahan") + f" options=-csearch_path={SCH}", autocommit=False)
    c.execute("SELECT id FROM otorisasi_kartu WHERE id_penerbit = %s FOR UPDATE", (id_,))
    return c


def lepas(c):
    c.rollback()
    c.close()


def menunggu(app):
    """Jumlah koneksi dengan application_name itu yang sedang menunggu lock. Disaring menurut nama: koneksi proses lain
    di database yang sama (lajur lain, uji mutasi) tidak ikut terhitung."""
    return int(d.satu("SELECT count(*) FROM pg_stat_activity WHERE application_name = %s AND wait_event_type = 'Lock'", "public", (app,)))


def tunggu_menunggu(n, app=APP_API):
    d.tunggu(lambda: menunggu(app) >= n, f"{n} koneksi {app} menunggu lock")


def posting_hold():
    return int(satu("SELECT count(*) FROM jurnal WHERE jenis = 'kartu_tahan'"))


# ---------- rekonsiliasi kartu yang dijalankan lab ----------

def rekon_kartu(judul):
    """Bandingkan keputusan penerbit tiruan dengan yang tercatat di Rekeningo. Perbandingan ini dijalankan lab (SQL dan
    catatan penerbit tiruan), bukan job di api-t4: job rekonsiliasi kartu belum ada."""
    s, isi = curl("GET", "/lab/keputusan", port=PORT_PENERBIT, tampil=False)
    harap(s, 200, "catatan penerbit")
    with d.sambung(SCH) as c:
        baris = {r[0]: (r[1], r[2]) for r in c.execute("SELECT id_penerbit, status, jurnal_tahan_id IS NOT NULL FROM otorisasi_kartu").fetchall()}
    tabel = []
    for k in j(isi)["keputusan"]:
        status, hold = baris.get(k["id_penerbit"], ("(tidak ada baris)", False))
        if k["keputusan"] == "setuju" and not (status in ("ditahan", "ditangkap") and hold):
            masalah = "setuju di penerbit, tidak ditahan di Rekeningo"
        elif k["keputusan"] == "tolak" and status in ("ditahan", "ditangkap"):
            masalah = "tolak di penerbit, dana ditahan di Rekeningo"
        else:
            masalah = "cocok"
        tabel.append([k["id_penerbit"], k["keputusan"], k["sumber"], status, masalah])
    catat(f"# {judul}")
    for b in d.tabel(["id_penerbit", "keputusan_penerbit", "sumber", "status_rekeningo", "hasil_banding"], tabel):
        catat(b)
    return tabel


# ---------- otorisasi.txt ----------

def rekam_otorisasi():
    siapkan()
    mulai_penerbit()
    mulai_api(["-rentan", "kartu-tanpa-hold", "-lab-jeda-cek-tulis", "300ms"],
              tampil="# server: ./api-t4 -lab -rentan kartu-tanpa-hold -lab-jeda-cek-tulis 300ms (versi pertama handler otorisasi, M37); penerbit tiruan: ./penerbit")
    aturan_penerbit(tenggat_ms=10_000)
    catat("# Tenggat penerbit tiruan dinaikkan ke 10 detik di bagian ini: yang direkam di sini bukan batas waktu, tetapi apakah dana ditahan.")
    budi = pemakai_dengan_kartu(40301, "Budi", 100_000)

    bagian("A. Tanpa hold (versi pertama): dua otorisasi serentak, masing-masing di bawah saldo, keduanya disetujui")
    hasil, th = serentak([lambda: otor("AUTH-A", budi, 80_000), lambda: otor("AUTH-B", budi, 80_000)])
    tunggu_semua(th)
    for id_, h in zip(("AUTH-A", "AUTH-B"), hasil):
        harap((h["keputusan"], h["sumber"]), ("setuju", "rekeningo"), id_)
        lapor(id_, 80_000, h)
    sql("SELECT id_penerbit, status, jumlah, jurnal_tahan_id IS NOT NULL AS ada_jurnal_tahan FROM otorisasi_kartu ORDER BY id_penerbit")
    sql("SELECT b.jenis, b.saldo_cache FROM buku b WHERE b.akun_id = 40301 OR b.jenis = 'dana_tertahan' ORDER BY b.jenis")
    catat("# Kontrol: otorisasi ketiga datang sesudah dua yang pertama selesai, bukan bersamaan.")
    h = otor("AUTH-C", budi, 80_000)
    harap((h["keputusan"], h["sumber"]), ("setuju", "rekeningo"), "AUTH-C")
    lapor("AUTH-C", 80_000, h)
    catat("# Yang membuat ini gagal bukan keserentakan: tanpa hold, tidak ada yang mengubah saldo yang dibaca otorisasi berikutnya. Jeda 300 ms hanya melebarkan celah di antara cek dan tulis.")
    sql("SELECT count(*) AS disetujui, sum(jumlah) AS jumlah_disetujui FROM otorisasi_kartu WHERE status = 'ditahan'")

    bagian("B. Clearing datang berjam-jam kemudian: ledger menjaga saldo tidak negatif, padahal persetujuan sudah diberikan")
    for id_ in ("AUTH-A", "AUTH-B", "AUTH-C"):
        s, h = clearing(id_, 80_000)
        catat(f"clearing {id_} {rp(80_000)}: HTTP {s}" + ("" if s == 200 else f", {h.get('type')}"))
    harap([clearing_status for clearing_status in (satu("SELECT status FROM otorisasi_kartu WHERE id_penerbit = %s", (i,)) for i in ("AUTH-A", "AUTH-B", "AUTH-C"))],
          ["ditangkap", "ditahan", "ditahan"], "status sesudah clearing")
    sql("SELECT id_penerbit, status FROM otorisasi_kartu ORDER BY id_penerbit")
    sql("SELECT b.jenis, b.saldo_cache FROM buku b WHERE b.akun_id = 40301 OR b.jenis = 'settlement_kartu' ORDER BY b.jenis")
    catat(f"# Disetujui kepada toko {rp(240_000)}; saldo Budi {rp(100_000)}. Hanya satu clearing yang punya penutup, dua yang lain ditolak ledger (409) dan tidak punya jurnal.")

    # ---- dengan hold ----
    d.stop(PORT)
    d.stop(PORT_PENERBIT)
    siapkan()
    mulai_penerbit()
    mulai_api(tampil="# server: ./api-t4 -lab (versi benar, ADR 42); penerbit tiruan: ./penerbit")
    aturan_penerbit(tenggat_ms=10_000)
    budi = pemakai_dengan_kartu(40301, "Budi", 100_000)
    citra = pemakai_dengan_kartu(40302, "Citra", 100_000)
    dewi = pemakai_dengan_kartu(40303, "Dewi", 100_000)

    bagian("C. Dengan hold (ORDER BY id FOR UPDATE, jurnal tahan): dua otorisasi serentak, yang kedua melihat saldo sesudah lock")
    catat("# Lab memegang lock buku Budi (seperti transaction lain yang sedang berjalan), memulai AUTH-A, menunggu sampai AUTH-A mengantre di lock, baru memulai AUTH-B, lalu melepas lock.")
    kunci = pegang_buku(40301)
    hasil = [None, None]
    th = []
    for i, id_ in enumerate(("AUTH-A", "AUTH-B")):
        t = threading.Thread(target=lambda i=i, id_=id_: hasil.__setitem__(i, otor(id_, budi, 80_000)))
        t.start()
        th.append(t)
        tunggu_menunggu(i + 1)
    lepas(kunci)
    tunggu_semua(th)
    harap([(h["keputusan"], h.get("alasan")) for h in hasil], [("setuju", None), ("tolak", "saldo-kurang")], "hold serentak")
    for id_, h in zip(("AUTH-A", "AUTH-B"), hasil):
        lapor(id_, 80_000, h)
    sql("SELECT id_penerbit, status, jumlah, jurnal_tahan_id IS NOT NULL AS ada_jurnal_tahan FROM otorisasi_kartu ORDER BY id_penerbit")
    sql("SELECT b.jenis, b.saldo_cache FROM buku b WHERE b.akun_id = 40301 OR b.jenis = 'dana_tertahan' ORDER BY b.jenis")
    sql("SELECT j.jenis, p.jumlah, b.jenis AS buku FROM jurnal j JOIN posting p ON p.jurnal_id = j.id JOIN buku b ON b.id = p.buku_id WHERE j.jenis = 'kartu_tahan' ORDER BY p.id")
    s, h = clearing("AUTH-A", 80_000)
    harap(s, 200, "clearing AUTH-A")
    catat(f"clearing AUTH-A {rp(80_000)}: HTTP {s}, status {h['status']}")
    sql("SELECT b.jenis, b.saldo_cache FROM buku b WHERE b.akun_id = 40301 OR b.jenis IN ('dana_tertahan', 'settlement_kartu') ORDER BY b.jenis")
    harap(int(satu("SELECT saldo_cache FROM buku WHERE akun_id = 40301")), 20_000, "saldo Budi")

    bagian("D. id_penerbit yang sama dua kali: satu hold. Berurutan, serentak (dua permintaan antre di lock yang sama), dan dengan jumlah lain")
    h1 = otor("AUTH-1", citra, 80_000)
    h2 = otor("AUTH-1", citra, 80_000)
    lapor("AUTH-1 pertama", 80_000, h1)
    lapor("AUTH-1 kedua (berurutan)", 80_000, h2)
    harap((h1["keputusan"], h2["keputusan"]), ("setuju", "setuju"), "AUTH-1 dua kali")
    sql("SELECT count(*) AS baris_otorisasi FROM otorisasi_kartu WHERE id_penerbit = 'AUTH-1'")
    sql("SELECT count(*) AS jurnal_kartu_tahan FROM jurnal WHERE jenis = 'kartu_tahan' AND dibuat_oleh = 40302")
    sql("SELECT saldo_cache FROM buku WHERE akun_id = 40302")
    harap(int(satu("SELECT saldo_cache FROM buku WHERE akun_id = 40302")), 20_000, "saldo Citra")
    catat("# Serentak: lab memegang lock buku Dewi, dua permintaan AUTH-2 yang sama mengantre, lalu lock dilepas.")
    kunci = pegang_buku(40303)
    hasil, th = serentak([lambda: otor("AUTH-2", dewi, 80_000), lambda: otor("AUTH-2", dewi, 80_000)])
    tunggu_menunggu(2)
    lepas(kunci)
    tunggu_semua(th)
    for h in hasil:
        harap((h["keputusan"], h["sumber"]), ("setuju", "rekeningo"), "AUTH-2 serentak")
    catat("kedua permintaan AUTH-2: setuju (sumber: rekeningo)")
    sql("SELECT count(*) AS baris_otorisasi FROM otorisasi_kartu WHERE id_penerbit = 'AUTH-2'")
    sql("SELECT count(*) AS jurnal_kartu_tahan FROM jurnal WHERE jenis = 'kartu_tahan' AND dibuat_oleh = 40303")
    harap(int(satu("SELECT saldo_cache FROM buku WHERE akun_id = 40303")), 20_000, "saldo Dewi")
    catat("# Sama dengan jumlah lain: id itu dipakai untuk otorisasi yang berbeda. Dipanggil langsung ke Rekeningo seperti yang dikirim penerbit:")
    s, isi = curl("POST", "/penerbit/otorisasi", {"id_penerbit": "AUTH-1", "token": citra, "jumlah": 90_000},
                  kepala=[f"X-Penerbit-Kunci: {d.KUNCI_PENERBIT}"], tampil_body='{"id_penerbit":"AUTH-1","token":"<token kartu Citra>","jumlah":90000}')
    harap(s, 409, "id dipakai untuk jumlah lain")
    h = otor("AUTH-1", citra, 90_000)
    catat("# Lewat penerbit tiruan, balasan 409 yang sama tidak sampai ke penerbit sebagai penolakan:")
    lapor("AUTH-1", 90_000, h)
    harap((h["keputusan"], h["sumber"]), ("setuju", "timeout"), "penerbit tiruan memperlakukan 409 sebagai tidak ada jawaban")
    catat("# Tiruan ini memperlakukan semua balasan yang bukan 200 sebagai tidak ada jawaban, lalu memutuskan menurut setelan timeout (setuju). Itu penyederhanaan tiruan; dokumentasi satu penerbit menyebut timeout 2 detik dan jawaban yang tidak valid sebagai dua kasus yang diputuskan setelan atau Autopilot, tanpa merinci status HTTP lain [perlu verifikasi].")
    sql("SELECT id_penerbit, status, jumlah FROM otorisasi_kartu WHERE id_penerbit = 'AUTH-1'")
    tulis("otorisasi.txt", "M37: otorisasi tanpa hold lawan dengan hold, dan id_penerbit yang sama dua kali",
          f"server Go di 127.0.0.1:{d.DASAR}, penerbit tiruan di 127.0.0.1:{d.DASAR_PENERBIT}")


# ---------- tenggat.txt ----------

def tunggu_selesai(th):
    tunggu_semua(th)


def ukur(f):
    mulai = time.perf_counter()
    h = f()
    return h, time.perf_counter() - mulai


def p95(xs):
    xs = sorted(xs)
    return xs[int(len(xs) * 0.95) - 1]


def latensi(path, port, kepala, token, n, jumlah, awalan):
    """n otorisasi berurutan ke penerbit tiruan (/lab/otorisasi) atau langsung ke port itu; mengembalikan daftar detik."""
    hasil = []
    for i in range(n):
        body = json.dumps({"id_penerbit": f"{awalan}-{i}", "token": token, "jumlah": jumlah})
        mulai = time.perf_counter()
        c = http.client.HTTPConnection("127.0.0.1", port, timeout=10)
        c.request("POST", path, body, {"Content-Type": "application/json", **kepala})
        r = c.getresponse()
        isi = json.loads(r.read())
        hasil.append(time.perf_counter() - mulai)
        c.close()
        harap((r.status, isi["keputusan"]), (200, "setuju"), f"latensi {i}")
    return hasil


def rekam_tenggat():
    siapkan()
    mulai_penerbit()
    mulai_api(tampil="# server: ./api-t4 -lab, lock_timeout kartu bawaan 1 detik; penerbit tiruan: ./penerbit, tenggat 2 detik, bila timeout: setuju")
    eko = pemakai_dengan_kartu(40304, "Eko", 100_000)
    fajar = pemakai_dengan_kartu(40305, "Fajar", 100_000)

    bagian("A. lock_timeout 1 detik di bawah tenggat 2 detik: buku terkunci, jawaban keluar dalam tenggat sebagai tolak (sibuk)")
    catat("# Lab memegang lock buku Eko (transaction lain yang lambat), lalu penerbit meminta otorisasi Rp10.000.")
    kunci = pegang_buku(40304)
    h, lama = ukur(lambda: otor("AUTH-L1", eko, 10_000))
    lepas(kunci)
    lapor("AUTH-L1", 10_000, h)
    harap((h["keputusan"], h["alasan"], h["sumber"]), ("tolak", "sibuk", "rekeningo"), "sibuk dalam tenggat")
    harap(LOCK_TIMEOUT - 0.1 <= lama < TENGGAT, True, f"lama jawaban sibuk {lama:.2f} detik")
    catat(f"# lama jawaban: di antara lock_timeout ({LOCK_TIMEOUT:.0f} detik) dan tenggat ({TENGGAT:.0f} detik): ya (batas yang diperiksa, nilainya bergantung mesin dan tidak direkam)")
    sql("SELECT count(*) AS baris_otorisasi FROM otorisasi_kartu WHERE id_penerbit = 'AUTH-L1'")
    sql("SELECT count(*) AS jurnal_kartu_tahan FROM jurnal WHERE jenis = 'kartu_tahan' AND dibuat_oleh = 40304")

    bagian("B. Sisi lain batas: lock lepas sebelum lock_timeout, jawabannya setuju dengan hold")
    kunci = pegang_buku(40304)
    hasil, th = serentak([lambda: otor("AUTH-L2", eko, 10_000)])
    tunggu_menunggu(1)
    lepas(kunci)
    tunggu_semua(th)
    lapor("AUTH-L2", 10_000, hasil[0])
    harap((hasil[0]["keputusan"], hasil[0]["sumber"]), ("setuju", "rekeningo"), "lock lepas sebelum lock_timeout")
    sql("SELECT id_penerbit, status, jurnal_tahan_id IS NOT NULL AS ada_jurnal_tahan FROM otorisasi_kartu ORDER BY id")

    bagian("C. lock_timeout 3 detik, lebih panjang dari tenggat: penerbit tidak menunggu dan memutuskan sendiri")
    ganti_api(["-kartu-lock-timeout", "3s"])
    catat("# server dimulai ulang dengan -kartu-lock-timeout 3s (salah setelan; ADR 42 menulis 1 detik). Lab memegang lock buku Eko, penerbit meminta otorisasi Rp10.000.")
    kunci = pegang_buku(40304)
    mulai_c = time.perf_counter()
    h, lama = ukur(lambda: otor("AUTH-L3", eko, 10_000))
    lapor("AUTH-L3", 10_000, h)
    harap((h["keputusan"], h["sumber"]), ("setuju", "timeout"), "penerbit memutuskan sendiri")
    harap(TENGGAT - 0.1 <= lama < TENGGAT + 1.5, True, f"lama jawaban timeout {lama:.2f} detik")
    catat(f"# lama jawaban: sekitar tenggat ({TENGGAT:.0f} detik), bukan lock_timeout (3 detik): ya (batas yang diperiksa)")
    # Lock baru dilepas sesudah permintaan yang ditinggal penerbit berhenti menunggu: hasilnya tidak bergantung pada siapa yang menang balapan.
    d.tunggu(lambda: menunggu(APP_API) == 0, "permintaan yang ditinggal penerbit berhenti menunggu lock")
    hilang = time.perf_counter() - mulai_c
    harap(hilang < 2.8, True, f"permintaan berhenti menunggu sebelum lock_timeout 3 detik ({hilang:.2f} detik)")
    catat("# Rekeningo berhenti menunggu lock begitu penerbit memutus koneksi (di sekitar tenggat 2 detik), sebelum lock_timeout 3 detik habis: ya (batas yang diperiksa). Lock dilepas lab sesudah itu, jadi tidak ada hold yang menyusul.")
    lepas(kunci)
    sql("SELECT count(*) AS baris_otorisasi FROM otorisasi_kartu WHERE id_penerbit = 'AUTH-L3'")
    sql("SELECT count(*) AS jurnal_kartu_tahan FROM jurnal WHERE jenis = 'kartu_tahan' AND keterangan LIKE '%AUTH-L3'")
    harap(int(satu("SELECT count(*) FROM otorisasi_kartu WHERE id_penerbit = 'AUTH-L3'")), 0, "tidak ada baris AUTH-L3")
    catat("# Penerbit sudah menyetujui, Rekeningo tidak menahan apa pun dan tidak punya baris untuk id itu. Clearing yang datang kemudian:")
    s, isi = clearing("AUTH-L3", 10_000)
    catat(f"clearing AUTH-L3 {rp(10_000)}: HTTP {s}, {isi.get('type')}")
    harap(s, 404, "clearing tanpa otorisasi")
    aturan_penerbit(bila_timeout="tolak")
    kunci = pegang_buku(40304)
    h, lama = ukur(lambda: otor("AUTH-L4", eko, 10_000))
    catat("# Setelan penerbit diganti: bila timeout, tolak.")
    lapor("AUTH-L4", 10_000, h)
    harap((h["keputusan"], h["sumber"]), ("tolak", "timeout"), "setelan tolak")
    d.tunggu(lambda: menunggu(APP_API) == 0, "permintaan yang ditinggal penerbit berhenti menunggu lock")
    lepas(kunci)
    aturan_penerbit(bila_timeout="setuju")

    bagian("D. Lewat service pembayaran (ADR 42 dan ADR 37): penerbit, service pembayaran, API ledger. Dua batas di dalam satu tenggat")
    d.stop(PORT)
    d.stop(PORT_PENERBIT)
    mulai_penerbit(["-api-otorisasi", f"http://127.0.0.1:{PORT_PEMB}"])
    mulai_api(["-ledger-kunci", KUNCI_LAYANAN], tampil="# server: ./api-t4 -lab -ledger-kunci <kunci layanan>; service pembayaran: ./pembayaran -lab -ledger-timeout 1500ms; penerbit tiruan mengirim otorisasi ke service pembayaran dan clearing ke monolith")
    mulai_pembayaran()
    catat("# Rantai batas: lock_timeout ledger 1 detik, lalu batas panggilan pembayaran ke ledger 1,5 detik, lalu tenggat penerbit 2 detik.")
    kunci = pegang_buku(40304)
    h, lama = ukur(lambda: otor("AUTH-L5", eko, 10_000))
    lepas(kunci)
    lapor("AUTH-L5", 10_000, h)
    harap((h["keputusan"], h["alasan"], h["sumber"]), ("tolak", "sibuk", "rekeningo"), "sibuk lewat service pembayaran")
    harap(LOCK_TIMEOUT - 0.1 <= lama < TENGGAT, True, f"lama jawaban lewat service pembayaran {lama:.2f} detik")
    catat("# lama jawaban: di antara lock_timeout dan tenggat, termasuk lompatan HTTP penerbit ke pembayaran dan pembayaran ke ledger: ya (batas yang diperiksa)")
    sql("SELECT count(*) AS baris_otorisasi FROM otorisasi_kartu WHERE id_penerbit = 'AUTH-L5'")
    sql("SELECT count(*) AS jurnal_kartu_tahan FROM jurnal WHERE jenis = 'kartu_tahan' AND keterangan LIKE '%AUTH-L5'")
    ganti_api(["-ledger-kunci", KUNCI_LAYANAN, "-kartu-lock-timeout", "3s"])
    catat("# lock_timeout ledger 3 detik (salah setelan): batas panggilan pembayaran ke ledger (1,5 detik) yang menyelamatkan tenggat.")
    kunci = pegang_buku(40304)
    h, lama = ukur(lambda: otor("AUTH-L6", eko, 10_000))
    lapor("AUTH-L6", 10_000, h)
    harap((h["keputusan"], h["alasan"], h["sumber"]), ("tolak", "ledger-tidak-menjawab", "rekeningo"), "ledger tidak menjawab")
    harap(1.4 <= lama < TENGGAT, True, f"lama jawaban ledger-tidak-menjawab {lama:.2f} detik")
    catat("# lama jawaban: sekitar batas panggilan ke ledger (1,5 detik) dan di bawah tenggat: ya (batas yang diperiksa)")
    d.tunggu(lambda: menunggu(APP_API) == 0, "permintaan ledger yang ditinggal berhenti menunggu lock")
    lepas(kunci)
    sql("SELECT count(*) AS baris_otorisasi FROM otorisasi_kartu WHERE id_penerbit = 'AUTH-L6'")
    sql("SELECT count(*) AS jurnal_kartu_tahan FROM jurnal WHERE jenis = 'kartu_tahan' AND keterangan LIKE '%AUTH-L6'")
    harap(int(satu("SELECT count(*) FROM jurnal WHERE jenis = 'kartu_tahan' AND keterangan LIKE '%AUTH-L6'")), 0, "tidak ada hold AUTH-L6")

    bagian("E. lock_timeout berlaku per penantian lock, bukan per transaction: buku dana_tertahan dipakai semua hold")
    ganti_api(["-ledger-kunci", KUNCI_LAYANAN])
    d.stop(PORT_PENERBIT)
    mulai_penerbit()
    catat("# Versi satu proses, lock_timeout 1 detik, tenggat 2 detik. Pemilik kartu: Fajar. Dua kunci yang bisa ditunggu otorisasi: buku Fajar (ADR 13) dan buku sistem dana_tertahan (satu baris untuk semua pemilik).")
    catat("# Pertama, hanya buku dana_tertahan yang dikunci transaction lain: otorisasi Fajar, yang tidak berhubungan dengan transaction itu, ikut ditolak sibuk.")
    kunci_b = pegang_buku_sistem("dana_tertahan")
    h, lama = ukur(lambda: otor("AUTH-L7", fajar, 10_000))
    lepas(kunci_b)
    lapor("AUTH-L7", 10_000, h)
    harap((h["keputusan"], h["alasan"], h["sumber"]), ("tolak", "sibuk", "rekeningo"), "dana_tertahan terkunci")
    harap(LOCK_TIMEOUT - 0.1 <= lama < TENGGAT, True, f"lama jawaban {lama:.2f} detik")
    catat("# lama jawaban: di antara lock_timeout dan tenggat: ya (batas yang diperiksa)")
    sql("SELECT count(*) AS jurnal_kartu_tahan FROM jurnal WHERE jenis = 'kartu_tahan' AND keterangan LIKE '%AUTH-L7'")
    catat("# Kedua: kedua kunci dipegang lab. Buku Fajar dilepas sesudah 0,6 detik, buku dana_tertahan sesudah 0,6 detik berikutnya. Tiap penantian di bawah lock_timeout.")
    kunci_a = pegang_buku(40305)
    kunci_b = pegang_buku_sistem("dana_tertahan")
    mulai_e = time.perf_counter()
    hasil, th = serentak([lambda: otor("AUTH-L8", fajar, 10_000)])
    tunggu_menunggu(1)
    time.sleep(0.6)
    lepas(kunci_a)
    time.sleep(0.6)
    lepas(kunci_b)
    tunggu_semua(th)
    lama = time.perf_counter() - mulai_e
    lapor("AUTH-L8", 10_000, hasil[0])
    harap((hasil[0]["keputusan"], hasil[0]["sumber"]), ("setuju", "rekeningo"), "dua penantian di bawah lock_timeout")
    harap(LOCK_TIMEOUT < lama < TENGGAT, True, f"lama jawaban dua penantian {lama:.2f} detik")
    catat("# lama jawaban: lebih dari lock_timeout (1 detik) dan di bawah tenggat (2 detik): ya (batas yang diperiksa). Disetujui, bukan ditolak sibuk: lock_timeout membatasi satu penantian, bukan seluruh transaction.")
    catat("# Hitungan: tiga penantian 0,9 detik, masing-masing masih di bawah lock_timeout, menjumlah 2,7 detik, di atas tenggat 2 detik; tiga penantian Tidak dijalankan. Jaminan jawaban sebelum tenggat membutuhkan batas waktu untuk seluruh panggilan (di jalur dua service: batas panggilan pembayaran ke ledger, bagian D).")
    sql("SELECT id_penerbit, status, jurnal_tahan_id IS NOT NULL AS ada_jurnal_tahan FROM otorisasi_kartu WHERE id_penerbit = 'AUTH-L8'")

    bagian("F. Latensi tanpa kontensi: 200 otorisasi berurutan, satu jalur lawan jalur lewat service pembayaran (batas, bukan nilai)")
    satu_proses = latensi("/lab/otorisasi", PORT_PENERBIT, {}, fajar, 200, 200, "LAT-1")
    d.stop(PORT_PENERBIT)
    mulai_penerbit(["-api-otorisasi", f"http://127.0.0.1:{PORT_PEMB}"])
    dua_service = latensi("/lab/otorisasi", PORT_PENERBIT, {}, fajar, 200, 200, "LAT-2")
    for nama, xs in (("penerbit ke monolith (satu proses)", satu_proses), ("penerbit ke service pembayaran ke ledger (dua service)", dua_service)):
        harap(p95(xs) < BATAS_P95 and max(xs) < TENGGAT, True, f"{nama}: p95 {p95(xs)*1000:.0f} ms, maks {max(xs)*1000:.0f} ms")
        print(f"  {nama}: p95 {p95(xs)*1000:.1f} ms, maks {max(xs)*1000:.1f} ms (tidak direkam)", file=sys.stderr)
        catat(f"{nama}: 200 otorisasi setuju; p95 di bawah batas lab {int(BATAS_P95*1000)} ms: ya; yang paling lambat di bawah tenggat {int(TENGGAT*1000)} ms: ya")
    catat(f"# Batas {int(BATAS_P95*1000)} ms adalah Asumsi lab (seperdelapan tenggat). Nilai p95 bergantung mesin dan tidak direkam; kapasitas dan beban serentak tidak diukur.")
    sql("SELECT count(*) AS otorisasi_setuju, sum(jumlah) AS jumlah FROM otorisasi_kartu WHERE status = 'ditahan' AND id_penerbit LIKE 'LAT-%'")
    harap(int(satu("SELECT count(*) FROM otorisasi_kartu WHERE status = 'ditahan' AND id_penerbit LIKE 'LAT-%'")), 400, "400 otorisasi latensi")
    tulis("tenggat.txt", "lock_timeout di bawah tenggat penerbit, penerbit yang memutuskan sendiri, dan lompatan service pembayaran",
          f"monolith di 127.0.0.1:{d.DASAR}, penerbit tiruan di 127.0.0.1:{d.DASAR_PENERBIT}, service pembayaran di 127.0.0.1:{DASAR_PEMBAYARAN}")


# ---------- kedaluwarsa.txt ----------

def waktu_db(id_):
    return datetime.datetime.strptime(
        satu("SELECT to_char(tahan_sampai AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') FROM otorisasi_kartu WHERE id_penerbit = %s", (id_,)),
        "%Y-%m-%dT%H:%M:%S.%fZ")


def rfc(t):
    return t.strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def job_kedaluwarsa(t, app="t4-kartu-job", tampil=True, label=""):
    cmd = [str(d.BIN), "-kedaluwarsa-hold", "-lab-sekarang", rfc(t)]
    r = subprocess.run(cmd, env=dict(d.ENV, DATABASE_URL=d.db_app(SCH, app)), capture_output=True, text=True)
    harap(r.returncode, 0, "job kedaluwarsa hold")
    if tampil:
        catat(f"$ ./api-t4 -kedaluwarsa-hold -lab-sekarang <waktu>   # {label}")
        catat(r.stdout.strip())
    return r.stdout.strip()


def rekam_kedaluwarsa():
    siapkan()
    mulai_penerbit()
    mulai_api(tampil="# server: ./api-t4 -lab; job: ./api-t4 -kedaluwarsa-hold -lab-sekarang <waktu maya> (proses terpisah)")
    aturan_penerbit(tenggat_ms=10_000)
    gita = pemakai_dengan_kartu(40306, "Gita", 100_000)
    hana = pemakai_dengan_kartu(40307, "Hana", 100_000)

    bagian("A. Hold berumur 7 hari; batas diperankan dengan jam maya, tidak ditunggu")
    h = otor("AUTH-D1", gita, 80_000)
    harap(h["keputusan"], "setuju", "AUTH-D1")
    lapor("AUTH-D1", 80_000, h)
    sql("SELECT id_penerbit, status, jumlah, (tahan_sampai - dibuat) BETWEEN interval '7 days' - interval '5 seconds' AND interval '7 days' + interval '5 seconds' AS tahan_sampai_tujuh_hari FROM otorisasi_kartu WHERE id_penerbit = 'AUTH-D1'")
    harap(satu("SELECT (tahan_sampai - dibuat) BETWEEN interval '7 days' - interval '5 seconds' AND interval '7 days' + interval '5 seconds' FROM otorisasi_kartu WHERE id_penerbit = 'AUTH-D1'"), True, "7 hari")
    t0 = waktu_db("AUTH-D1")
    one = datetime.timedelta(seconds=1)
    hasil = []
    for waktu, label in ((t0 - one, "tahan_sampai dikurangi 1 detik"), (t0, "tepat tahan_sampai"), (t0 + one, "tahan_sampai ditambah 1 detik"), (t0 + one, "diulang, sesudah dilepas")):
        hasil.append(job_kedaluwarsa(waktu, label=label))
    harap(hasil, ["hold kartu: diperiksa 0, dilepas 0", "hold kartu: diperiksa 0, dilepas 0", "hold kartu: diperiksa 1, dilepas 1", "hold kartu: diperiksa 0, dilepas 0"], "job kedaluwarsa")
    catat("# Batas: hold yang jatuh tepat pada tahan_sampai belum dilepas (kueri memakai tanda kurang dari, bukan kurang dari atau sama dengan); satu detik sesudahnya dilepas.")
    sql("SELECT id_penerbit, status FROM otorisasi_kartu WHERE id_penerbit = 'AUTH-D1'")
    sql("SELECT j.jenis, count(*) AS jumlah FROM jurnal j WHERE j.jenis IN ('kartu_tahan', 'pembalik') AND j.dibuat_oleh = 40306 GROUP BY j.jenis ORDER BY j.jenis")
    sql("SELECT b.jenis, b.saldo_cache FROM buku b WHERE b.akun_id = 40306 OR b.jenis = 'dana_tertahan' ORDER BY b.jenis")
    harap(int(satu("SELECT saldo_cache FROM buku WHERE akun_id = 40306")), 100_000, "saldo Gita kembali")

    bagian("B. Dua job bersamaan memperebutkan hold yang sama: satu melepas, yang lain tidak")
    h = otor("AUTH-D2", hana, 80_000)
    harap(h["keputusan"], "setuju", "AUTH-D2")
    lapor("AUTH-D2", 80_000, h)
    t1 = waktu_db("AUTH-D2") + one
    catat("# Lab memegang lock baris otorisasi AUTH-D2, memulai dua proses job (jam maya: tahan_sampai ditambah 1 detik), menunggu sampai keduanya menunggu lock baris itu, lalu melepas lock.")
    kunci = pegang_otorisasi("AUTH-D2")
    proses = [subprocess.Popen([str(d.BIN), "-kedaluwarsa-hold", "-lab-sekarang", rfc(t1)], env=dict(d.ENV, DATABASE_URL=d.db_app(SCH, app)),
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True) for app in ("t4-kartu-job-1", "t4-kartu-job-2")]
    d.tunggu(lambda: sum(menunggu(a) for a in ("t4-kartu-job-1", "t4-kartu-job-2")) >= 2, "dua job menunggu lock baris otorisasi")
    lepas(kunci)
    keluar = []
    for p in proses:
        o, e = p.communicate(timeout=60)
        harap(p.returncode, 0, "job kedaluwarsa bersamaan")
        keluar.append(o.strip())
    catat("keluaran dua job (urut abjad, siapa yang menang tidak ditentukan):")
    for k in sorted(keluar):
        catat("  " + k)
    harap(sorted(keluar), ["hold kartu: diperiksa 1, dilepas 0", "hold kartu: diperiksa 1, dilepas 1"], "satu job melepas")
    sql("SELECT id_penerbit, status FROM otorisasi_kartu WHERE id_penerbit = 'AUTH-D2'")
    sql("SELECT count(*) AS jurnal_pembalik FROM jurnal WHERE jenis = 'pembalik' AND dibuat_oleh = 40307")
    sql("SELECT b.jenis, b.saldo_cache FROM buku b WHERE b.akun_id = 40307 OR b.jenis = 'dana_tertahan' ORDER BY b.jenis")
    harap(int(satu("SELECT saldo_cache FROM buku WHERE akun_id = 40307")), 100_000, "saldo Hana kembali, bukan 180000")
    catat("# Dua lapis menahan pelepasan kedua: baris otorisasi dikunci dan statusnya harus masih ditahan; jurnal pembalik punya UNIQUE (membalik_jurnal_id). Lab ini merekam lapis pertama; lapis kedua dijaga tes Go.")

    bagian("C. Hold yang sudah ditagih tidak dilepas job; reversal sesudah kedaluwarsa menjawab 200 tanpa jurnal kedua")
    h = otor("AUTH-D3", gita, 30_000)
    harap(h["keputusan"], "setuju", "AUTH-D3")
    s, _ = clearing("AUTH-D3", 30_000)
    harap(s, 200, "clearing AUTH-D3")
    lapor("AUTH-D3", 30_000, h)
    job_kedaluwarsa(waktu_db("AUTH-D3") + one, label="hold yang sudah ditagih")
    sql("SELECT id_penerbit, status FROM otorisasi_kartu WHERE id_penerbit = 'AUTH-D3'")
    s, h = reversal("AUTH-D2")
    catat(f"reversal AUTH-D2 (sudah kedaluwarsa): HTTP {s}, status {h.get('status')}")
    harap((s, h.get("status")), (200, "kedaluwarsa"), "reversal sesudah kedaluwarsa")
    sql("SELECT count(*) AS jurnal_pembalik FROM jurnal WHERE jenis = 'pembalik' AND dibuat_oleh = 40307")
    tulis("kedaluwarsa.txt", "kedaluwarsa hold 7 hari dengan jam maya, dua job bersamaan, dan hold yang sudah ditagih",
          f"server Go di 127.0.0.1:{d.DASAR}, penerbit tiruan di 127.0.0.1:{d.DASAR_PENERBIT}")


# ---------- kill-switch.txt ----------

def rekam_kill_switch():
    siapkan()
    mulai_penerbit()
    mulai_api(tampil="# server: ./api-t4 -lab (kill switch: Dep.KartuAktif di memori proses, tabel tidak dipakai, OpenFeature tidak dipakai); penerbit tiruan: ./penerbit")
    aturan_penerbit(tenggat_ms=10_000)
    ira = pemakai_dengan_kartu(40308, "Ira", 200_000)
    ratih = d.login("ratih@rekeningo.example", label="Ratih")
    pid = d.server[PORT][0].pid

    bagian("A. Kill switch mematikan otorisasi baru tanpa deploy dan tanpa memulai ulang proses")
    h = otor("AUTH-K1", ira, 50_000)
    harap(h["keputusan"], "setuju", "AUTH-K1")
    lapor("AUTH-K1", 50_000, h)
    s, isi = curl("POST", "/bo/flag/kartu", {"aktif": False, "alasan": "Penerbit melaporkan lonjakan otorisasi yang tidak biasa"}, ratih)
    harap(s, 200, "kill switch mati")
    h = otor("AUTH-K2", ira, 20_000)
    lapor("AUTH-K2", 20_000, h)
    harap((h["keputusan"], h["alasan"], h["sumber"]), ("tolak", "kill-switch", "rekeningo"), "kill switch menolak")
    harap(d.server[PORT][0].pid, pid, "proses yang sama")
    catat("# proses server yang sama (PID tidak berubah, tidak ada deploy): ya")
    sql("SELECT id_penerbit, status FROM otorisasi_kartu ORDER BY id")
    sql("SELECT count(*) AS jurnal_kartu_tahan FROM jurnal WHERE jenis = 'kartu_tahan' AND dibuat_oleh = 40308")
    catat("# Otorisasi yang sudah disetujui sebelum kill switch tetap bisa ditagih: kill switch hanya menolak otorisasi baru.")
    s, h = clearing("AUTH-K1", 50_000)
    harap((s, h["status"]), (200, "ditangkap"), "clearing sesudah kill switch")
    catat(f"clearing AUTH-K1 {rp(50_000)}: HTTP {s}, status {h['status']}")
    sql("SELECT aksi, objek, alasan FROM audit_log ORDER BY id")

    bagian("B. Batas: flag hidup di memori satu proses, jadi proses yang dimulai ulang kembali aktif tanpa ada yang menyalakannya")
    d.stop(PORT)
    mulai_api()
    h = otor("AUTH-K3", ira, 20_000)
    lapor("AUTH-K3", 20_000, h)
    harap((h["keputusan"], h["sumber"]), ("setuju", "rekeningo"), "sesudah mulai ulang")
    catat("# Sesudah mulai ulang, kill switch yang dimatikan tadi kembali aktif. Menurut kodenya (Dep.KartuAktif) flag ada di satu proses, jadi dua instance punya flag sendiri-sendiri; dua instance Tidak dijalankan di lab ini. Flag di tabel atau penyedia flag di luar proses akan menutup kedua batas itu; keduanya juga Tidak dijalankan. Rilis bertahap 1%, 5%, 25%, 100% (Asumsi, ADR 42) juga Tidak dijalankan.")

    bagian("C. Kill switch di service pembayaran (jalur dua service): menolak tanpa baris dan tanpa panggilan ke ledger")
    d.stop(PORT)
    d.stop(PORT_PENERBIT)
    mulai_penerbit(["-api-otorisasi", f"http://127.0.0.1:{PORT_PEMB}"])
    mulai_api(["-ledger-kunci", KUNCI_LAYANAN])
    mulai_pembayaran()
    aturan_penerbit(tenggat_ms=10_000)
    s, _ = curl("POST", "/lab/flag-kartu", {"aktif": False}, port=PORT_PEMB, tampil=False)
    harap(s, 204, "kill switch pembayaran")
    sebelum = posting_hold()
    h = otor("AUTH-K4", ira, 20_000)
    lapor("AUTH-K4 (service pembayaran, kill switch mati)", 20_000, h)
    harap((h["keputusan"], h["alasan"]), ("tolak", "kill-switch"), "kill switch pembayaran")
    harap(posting_hold(), sebelum, "tanpa hold baru")
    sql("SELECT count(*) AS baris_otorisasi FROM otorisasi_kartu WHERE id_penerbit = 'AUTH-K4'")
    s, _ = curl("POST", "/lab/flag-kartu", {"aktif": True}, port=PORT_PEMB, tampil=False)
    harap(s, 204, "kill switch pembayaran nyala")
    h = otor("AUTH-K5", ira, 20_000)
    lapor("AUTH-K5 (kill switch dinyalakan lagi)", 20_000, h)
    harap(h["keputusan"], "setuju", "AUTH-K5")
    tulis("kill-switch.txt", "kill switch otorisasi kartu tanpa deploy, dan batas flag di memori proses",
          f"server Go di 127.0.0.1:{d.DASAR}, penerbit tiruan di 127.0.0.1:{d.DASAR_PENERBIT}, service pembayaran di 127.0.0.1:{DASAR_PEMBAYARAN}")


# ---------- penerbit.txt ----------

def rekam_penerbit():
    siapkan()
    mulai_penerbit()
    mulai_api(["-kartu-lock-timeout", "3s"], tampil="# server: ./api-t4 -lab -kartu-lock-timeout 3s (setelan yang salah, supaya jawaban terlambat terjadi); penerbit tiruan: ./penerbit, tenggat 2 detik")
    joko = pemakai_dengan_kartu(40309, "Joko", 100_000)
    kiki = pemakai_dengan_kartu(40310, "Kiki", 100_000)

    bagian("A. Keadaan pertama (dokumentasi satu penerbit): jawaban terlambat diputuskan penerbit menurut setelannya, bukan menurut Rekeningo")
    catat("# Buku Joko dikunci transaction lain lebih lama dari tenggat. Setelan penerbit: bila timeout, setuju.")
    kunci = pegang_buku(40309)
    h = otor("AUTH-P1", joko, 80_000)
    lapor("AUTH-P1", 80_000, h)
    harap((h["keputusan"], h["sumber"]), ("setuju", "timeout"), "AUTH-P1")
    d.tunggu(lambda: menunggu(APP_API) == 0, "permintaan yang ditinggal berhenti menunggu")
    lepas(kunci)
    catat("# Penerbit sudah menyetujui Rp80.000; di Rekeningo tidak ada hold dan tidak ada baris. Saldo Joko tidak berkurang, jadi dana yang sama bisa dibelanjakan lagi:")
    h = otor("AUTH-P2", joko, 80_000)
    lapor("AUTH-P2", 80_000, h)
    harap((h["keputusan"], h["sumber"]), ("setuju", "rekeningo"), "AUTH-P2")
    s, isi = clearing("AUTH-P1", 80_000)
    catat(f"clearing AUTH-P1 {rp(80_000)} (penagihan datang): HTTP {s}, {isi.get('type')}")
    harap(s, 404, "clearing tanpa otorisasi")
    s, isi = clearing("AUTH-P2", 80_000)
    harap(s, 200, "clearing AUTH-P2")
    catat(f"clearing AUTH-P2 {rp(80_000)}: HTTP {s}, status {isi['status']}")
    sql("SELECT b.jenis, b.saldo_cache FROM buku b WHERE b.akun_id = 40309 OR b.jenis = 'settlement_kartu' ORDER BY b.jenis")
    catat(f"# Disetujui penerbit kepada toko: {rp(160_000)} (AUTH-P1 dan AUTH-P2); saldo Joko awal {rp(100_000)}; yang punya penutup di ledger: {rp(80_000)}.")

    bagian("B. Keadaan kedua (dokumentasi satu penerbit): menolak, tetapi jaringan kartu menyetujui; dana tidak ditahan tetapi bisa ditagih")
    catat("# Dokumentasi: bila penerbit menolak tetapi tidak dapat menghubungi jaringan kartu dan jaringan menyetujui, dana tidak ditahan tetapi bisa tetap ditangkap.")
    catat("# Yang diperankan lab: Rekeningo menolak AUTH-P3 (saldo kurang). Jaringan yang menyetujui dan menagihnya diperankan lab dengan mengirim clearing sendiri; penerbit tiruan tidak punya jaringan dan tidak memerankan keadaan ini.")
    h = otor("AUTH-P3", kiki, 150_000)
    lapor("AUTH-P3", 150_000, h)
    harap((h["keputusan"], h["alasan"]), ("tolak", "saldo-kurang"), "AUTH-P3")
    s, isi = clearing("AUTH-P3", 150_000)
    catat(f"clearing AUTH-P3 {rp(150_000)} (diperankan lab): HTTP {s}, {isi.get('type')}")
    harap(s, 409, "clearing atas otorisasi yang ditolak")
    sql("SELECT id_penerbit, status, jurnal_tahan_id IS NOT NULL AS ada_jurnal_tahan FROM otorisasi_kartu WHERE id_penerbit = 'AUTH-P3'")
    sql("SELECT b.saldo_cache FROM buku b WHERE b.akun_id = 40310")
    catat("# Rekeningo tidak menjurnal penagihan atas otorisasi yang ditolaknya (409), apa pun saldo pemiliknya; di sini saldo Kiki memang tidak cukup. Penagihan Rp150.000 itu tidak punya penutup di ledger, dan tidak ada catatan lain di Rekeningo yang mencatat bahwa penagihan itu pernah datang selain jawaban 409.")

    bagian("C. Rekonsiliasi kartu: dijalankan lab (SQL dan catatan penerbit tiruan); job rekonsiliasi kartu belum ada di api-t4")
    tabel = rekon_kartu("catatan penerbit tiruan lawan otorisasi_kartu, satu baris per otorisasi yang dijawab penerbit")
    harap([b[4] for b in tabel], ["setuju di penerbit, tidak ditahan di Rekeningo", "cocok", "cocok"], "hasil banding bagian C")
    catat("# AUTH-P1 setuju di penerbit tanpa baris di Rekeningo. AUTH-P3 ditolak di keduanya: penagihannya diperankan lab, tidak ada di catatan keputusan penerbit tiruan, dan banding ini tidak melihatnya. Berkas penagihan dari penerbit (clearing) tidak ada di lab; selisih jenis ini Tidak dijalankan sebagai rekonsiliasi.")
    catat("# Tanpa rekonsiliasi kartu, uang yang disetujui tanpa hold tidak terlihat oleh siapa pun sampai penagihannya ditolak ledger.")

    bagian("D. Jawaban terlambat sesudah hold selesai: penerbit memutuskan tolak, Rekeningo menahan dana (dua service)")
    d.stop(PORT)
    d.stop(PORT_PENERBIT)
    mulai_penerbit(["-api-otorisasi", f"http://127.0.0.1:{PORT_PEMB}"])
    mulai_api(["-ledger-kunci", KUNCI_LAYANAN])
    mulai_pembayaran(["-lab-tahan-sesudah-ledger"])
    aturan_penerbit(bila_timeout="tolak")
    catat("# Service pembayaran ditahan di titik sesudah ledger menahan dana dan sebelum baris otorisasi ditulis (lab saja), sampai tenggat penerbit lewat. Setelan penerbit: bila timeout, tolak.")
    h = otor("AUTH-P4", kiki, 60_000)
    lapor("AUTH-P4", 60_000, h)
    harap((h["keputusan"], h["sumber"]), ("tolak", "timeout"), "AUTH-P4")
    sql("SELECT count(*) AS jurnal_kartu_tahan_ledger FROM jurnal WHERE jenis = 'kartu_tahan' AND keterangan LIKE '%AUTH-P4'")
    sql("SELECT count(*) AS baris_otorisasi FROM otorisasi_kartu WHERE id_penerbit = 'AUTH-P4'")
    s, _ = curl("POST", "/lab/lepas", port=PORT_PEMB, tampil=False)
    harap(s, 204, "lepas gerbang")
    d.tunggu(lambda: int(satu("SELECT count(*) FROM otorisasi_kartu WHERE id_penerbit = 'AUTH-P4'")) == 1, "baris AUTH-P4 ditulis")
    catat("# Gerbang dilepas: service pembayaran menulis baris (jawabannya tidak didengar siapa pun).")
    sql("SELECT id_penerbit, status, jurnal_tahan_id IS NOT NULL AS ada_jurnal_tahan FROM otorisasi_kartu WHERE id_penerbit = 'AUTH-P4'")
    tabel = rekon_kartu("catatan penerbit tiruan lawan otorisasi_kartu sesudah gerbang dilepas")
    baris = [b for b in tabel if b[0] == "AUTH-P4"][0]
    harap(baris[4], "tolak di penerbit, dana ditahan di Rekeningo", "AUTH-P4 dalam rekonsiliasi")
    catat("# Dana Rp60.000 tertahan untuk keputusan yang di penerbit sudah tolak. Yang melepasnya hanya job kedaluwarsa sesudah 7 hari; jam maya di bawah.")
    t = waktu_db("AUTH-P4") + datetime.timedelta(seconds=1)
    job_kedaluwarsa(t, label="tahan_sampai ditambah 1 detik")
    sql("SELECT id_penerbit, status FROM otorisasi_kartu WHERE id_penerbit = 'AUTH-P4'")
    sql("SELECT b.saldo_cache FROM buku b WHERE b.akun_id = 40310")
    tulis("penerbit.txt", "dua keadaan penerbit menurut dokumentasi satu penerbit, dan rekonsiliasi kartu yang masih perlu",
          f"server Go di 127.0.0.1:{d.DASAR}, penerbit tiruan di 127.0.0.1:{d.DASAR_PENERBIT}, service pembayaran di 127.0.0.1:{DASAR_PEMBAYARAN}")


# ---------- dua-service.txt ----------

def tunggu_mati(port):
    p, _ = d.server[port]
    for _ in range(300):
        if p.poll() is not None:
            return p.returncode
        time.sleep(0.05)
    gagal(f"proses di port {port} tidak mati")


def hold_tanpa_baris():
    return int(satu("""SELECT count(*) FROM jurnal j WHERE j.jenis = 'kartu_tahan'
                       AND NOT EXISTS (SELECT 1 FROM otorisasi_kartu o WHERE o.jurnal_tahan_id = j.id)"""))


def ledger_langsung(id_, akun, jumlah, kunci_layanan=KUNCI_LAYANAN):
    s, isi = curl("POST", "/ledger/kartu/tahan", {"id_penerbit": id_, "akun_id": akun, "jumlah": jumlah}, tampil=False,
                  kepala=[f"X-Layanan-Kunci: {kunci_layanan}", f"Idempotency-Key: {id_}"])
    return s, j(isi)


def rekam_dua_service():
    siapkan()
    mulai_penerbit(["-api-otorisasi", f"http://127.0.0.1:{PORT_PEMB}"])
    mulai_api(["-ledger-kunci", KUNCI_LAYANAN],
              tampil="# server: ./api-t4 -lab -ledger-kunci <kunci layanan> (sisi ledger: POST /ledger/kartu/tahan); service pembayaran: ./pembayaran -lab -penerbit-kunci <kunci penerbit> (otorisasi); penerbit tiruan mengirim otorisasi ke pembayaran dan clearing ke monolith")
    mulai_pembayaran()
    aturan_penerbit(tenggat_ms=10_000)
    lina = pemakai_dengan_kartu(40311, "Lina", 100_000)

    bagian("A. Otorisasi lewat service pembayaran: hold di ledger dengan Idempotency-Key = id_penerbit, baris otorisasi sesudahnya")
    h = otor("AUTH-G1", lina, 80_000)
    lapor("AUTH-G1", 80_000, h)
    harap((h["keputusan"], h["sumber"]), ("setuju", "rekeningo"), "AUTH-G1")
    sql("SELECT id_penerbit, status, jurnal_tahan_id IS NOT NULL AS ada_jurnal_tahan FROM otorisasi_kartu ORDER BY id")
    sql("SELECT status, jurnal_id IS NOT NULL AS terikat_jurnal FROM kunci_idempotensi WHERE kunci = 'AUTH-G1'")
    sql("SELECT b.jenis, b.saldo_cache FROM buku b WHERE b.akun_id = 40311 OR b.jenis = 'dana_tertahan' ORDER BY b.jenis")
    h = otor("AUTH-G1", lina, 80_000)
    lapor("AUTH-G1 diulang penerbit", 80_000, h)
    harap(h["keputusan"], "setuju", "AUTH-G1 diulang")
    catat("# Ulangan dijawab service pembayaran dari baris otorisasi, tanpa panggilan kedua ke ledger. Sisi ledger dipanggil langsung dengan key yang sama:")
    s1, r1 = ledger_langsung("AUTH-G1", 40311, 80_000)
    catat(f"POST /ledger/kartu/tahan Idempotency-Key AUTH-G1 (akun 40311, {rp(80_000)}): HTTP {s1}, ulang={str(r1.get('ulang')).lower()}")
    harap((s1, r1.get("ulang")), (200, True), "ledger key sama")
    s2, r2 = ledger_langsung("AUTH-G1", 40311, 70_000)
    catat(f"sama, jumlah {rp(70_000)}: HTTP {s2}, {r2.get('alasan')}")
    harap((s2, r2.get("alasan")), (422, "key-dipakai-permintaan-lain"), "key bentrok")
    s3, r3 = ledger_langsung("AUTH-G2", 40311, 80_000)
    catat(f"id lain AUTH-G2 {rp(80_000)} (saldo tinggal {rp(20_000)}): HTTP {s3}, {r3.get('alasan')}")
    harap((s3, r3.get("alasan")), (422, "saldo-kurang"), "saldo kurang di ledger")
    s4, r4 = ledger_langsung("AUTH-G1", 40311, 80_000, kunci_layanan="salah")
    catat(f"kunci layanan salah: HTTP {s4}, {r4.get('alasan')}")
    harap(s4, 401, "kunci layanan salah")
    sql("SELECT count(*) AS key_tertahan FROM kunci_idempotensi WHERE kunci = 'AUTH-G2'")
    catat("# Penolakan saldo kurang di-ROLLBACK: key AUTH-G2 tidak tertahan.")
    s, h = clearing("AUTH-G1", 80_000)
    harap(s, 200, "clearing lewat monolith")
    catat(f"clearing AUTH-G1 {rp(80_000)} lewat monolith (baris ditulis service pembayaran): HTTP {s}, status {h['status']}")
    sql("SELECT b.jenis, b.saldo_cache FROM buku b WHERE b.akun_id = 40311 OR b.jenis IN ('dana_tertahan', 'settlement_kartu') ORDER BY b.jenis")

    bagian("B. Service pembayaran dimatikan (SIGKILL) sesudah ledger menahan dan sebelum baris ditulis")
    mina = pemakai_dengan_kartu(40312, "Mina", 100_000)
    d.stop(PORT_PEMB)
    mulai_pembayaran(["-lab-mati-sesudah-ledger"])
    catat("# Titik kematian disuntik: proses mengirim SIGKILL ke dirinya sendiri tepat sesudah ledger menjawab, tanpa baris dan tanpa jawaban ke penerbit.")
    h = otor("AUTH-G3", mina, 30_000)
    lapor("AUTH-G3", 30_000, h)
    harap((h["keputusan"], h["sumber"]), ("setuju", "timeout"), "penerbit tidak mendengar jawaban")
    harap(tunggu_mati(PORT_PEMB), -signal.SIGKILL, "proses pembayaran dimatikan sinyal")
    catat("# proses service pembayaran: keluar dengan sinyal 9 (SIGKILL); penerbit tidak mendengar jawaban dan memutuskan menurut setelannya (setuju)")
    sql("SELECT count(*) AS baris_otorisasi FROM otorisasi_kartu WHERE id_penerbit = 'AUTH-G3'")
    sql("SELECT count(*) AS jurnal_kartu_tahan_ledger FROM jurnal WHERE jenis = 'kartu_tahan' AND keterangan LIKE '%AUTH-G3'")
    catat(f"hold di ledger tanpa baris otorisasi: {hold_tanpa_baris()}")
    harap(hold_tanpa_baris(), 1, "hold tanpa baris")
    d.stop(PORT_PEMB)
    mulai_pembayaran()
    catat("# Service pembayaran dinyalakan lagi; penerbit mengulang otorisasi yang sama (id_penerbit sama):")
    h = otor("AUTH-G3", mina, 30_000)
    lapor("AUTH-G3 diulang", 30_000, h)
    harap((h["keputusan"], h["sumber"]), ("setuju", "rekeningo"), "ulangan sesudah mati")
    sql("SELECT id_penerbit, status, jurnal_tahan_id IS NOT NULL AS ada_jurnal_tahan FROM otorisasi_kartu WHERE id_penerbit = 'AUTH-G3'")
    sql("SELECT count(*) AS jurnal_kartu_tahan_ledger FROM jurnal WHERE jenis = 'kartu_tahan' AND keterangan LIKE '%AUTH-G3'")
    sql("SELECT saldo_cache FROM buku WHERE akun_id = 40312")
    harap((hold_tanpa_baris(), int(satu("SELECT saldo_cache FROM buku WHERE akun_id = 40312"))), (0, 70_000), "ulangan menutup hold")
    catat("# Ulangan mendapat hold yang sama (key ledger) dan baris ditulis: satu hold, bukan dua.")

    catat("# Bila penerbit tidak pernah mengulang, hold itu yatim: ada di ledger, tidak punya baris, dan job kedaluwarsa bekerja dari baris otorisasi_kartu.")
    d.stop(PORT_PEMB)
    mulai_pembayaran(["-lab-mati-sesudah-ledger"])
    h = otor("AUTH-G4", mina, 30_000)
    lapor("AUTH-G4", 30_000, h)
    harap(tunggu_mati(PORT_PEMB), -signal.SIGKILL, "proses pembayaran dimatikan sinyal")
    d.stop(PORT_PEMB)
    mulai_pembayaran()
    t = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None) + datetime.timedelta(days=8)
    keluar = job_kedaluwarsa(t, label="8 hari sesudah otorisasi")
    harap(keluar, "hold kartu: diperiksa 1, dilepas 1", "job melepas satu hold")
    catat("# Job melepas AUTH-G3 (punya baris) dan tidak menyentuh AUTH-G4 (tanpa baris).")
    catat(f"hold di ledger tanpa baris otorisasi: {hold_tanpa_baris()}")
    sql("SELECT saldo_cache FROM buku WHERE akun_id = 40312")
    harap((hold_tanpa_baris(), int(satu("SELECT saldo_cache FROM buku WHERE akun_id = 40312"))), (1, 70_000), "hold yatim tidak dilepas job")
    catat("# Saldo Mina Rp70.000: Rp30.000 (AUTH-G4) tertahan tanpa baris yang bisa dikedaluwarsakan. Penutupnya rekonsiliasi (hold di ledger tanpa baris), yang belum ada di lab ini.")

    bagian("C. Batas harian kartu: versi satu proses memeriksanya sesudah lock buku, jalur dua service membacanya sebelum hold dan tanpa lock")
    nia = pemakai_dengan_kartu(40313, "Nia", 1_000_000)
    oki = pemakai_dengan_kartu(40314, "Oki", 1_000_000)
    with d.sambung(SCH) as c:
        c.execute("UPDATE kartu SET batas_harian = 100000 WHERE akun_id IN (40313, 40314)")
    catat("# Batas harian kedua kartu diturunkan ke Rp100.000 (data lab). Dua otorisasi Rp60.000 serentak: masing-masing di bawah batas, bersama di atasnya. Dipanggil langsung, tanpa tenggat.")
    catat("# Satu proses (monolith): lab memegang lock buku Nia, dua otorisasi mengantre, lock dilepas.")
    kunci = pegang_buku(40313)
    hasil = [None, None]
    th = []
    for i, id_ in enumerate(("AUTH-H1", "AUTH-H2")):
        t = threading.Thread(target=lambda i=i, id_=id_: hasil.__setitem__(i, langsung(id_, nia, 60_000)))
        t.start()
        th.append(t)
        tunggu_menunggu(i + 1)
    lepas(kunci)
    tunggu_semua(th)
    for id_, (s, h) in zip(("AUTH-H1", "AUTH-H2"), hasil):
        catat(f"{id_} {rp(60_000)} langsung ke monolith: HTTP {s}, {h['keputusan']}" + (f" ({h['alasan']})" if h.get("alasan") else ""))
    harap([(h["keputusan"], h.get("alasan")) for _, h in hasil], [("setuju", None), ("tolak", "batas-harian")], "batas harian satu proses")
    catat("# Dua service: service pembayaran ditahan di titik sesudah ledger menahan; lab menunggu sampai kedua hold ada di ledger, lalu melepas.")
    d.stop(PORT_PEMB)
    mulai_pembayaran(["-lab-tahan-sesudah-ledger"])
    hasil = [None, None]
    th = []
    for i, id_ in enumerate(("AUTH-H3", "AUTH-H4")):
        t = threading.Thread(target=lambda i=i, id_=id_: hasil.__setitem__(i, langsung_pemb(id_, oki, 60_000)))
        t.start()
        th.append(t)
    d.tunggu(lambda: int(satu("SELECT count(*) FROM jurnal WHERE jenis = 'kartu_tahan' AND dibuat_oleh = 40314")) >= 2, "dua hold Oki di ledger")
    s, _ = curl("POST", "/lab/lepas", port=PORT_PEMB, tampil=False)
    harap(s, 204, "lepas gerbang")
    tunggu_semua(th)
    for id_, (s, h) in zip(("AUTH-H3", "AUTH-H4"), hasil):
        catat(f"{id_} {rp(60_000)} langsung ke service pembayaran: HTTP {s}, {h['keputusan']}" + (f" ({h['alasan']})" if h.get("alasan") else ""))
    harap([(h["keputusan"], h.get("alasan")) for _, h in hasil], [("setuju", None), ("setuju", None)], "batas harian dua service")
    sql("SELECT k.batas_harian, sum(o.jumlah) AS jumlah_disetujui FROM otorisasi_kartu o JOIN kartu k ON k.id = o.kartu_id WHERE k.akun_id = 40314 AND o.status = 'ditahan' GROUP BY k.batas_harian")
    catat("# Dua service: kedua otorisasi disetujui dan jumlahnya Rp120.000, di atas batas Rp100.000. Pemeriksaan batas dibaca sebelum hold dan baris baru tertulis sesudahnya, jadi tidak ada yang serialisasi keduanya. Celah ini tidak ada di naskah dan tidak ditutup di lab ini.")
    tulis("dua-service.txt", "otorisasi lewat service pembayaran dan API ledger: Idempotency-Key = id_penerbit, proses mati, dan batas harian",
          f"monolith di 127.0.0.1:{d.DASAR} (API ledger), service pembayaran di 127.0.0.1:{DASAR_PEMBAYARAN}, penerbit tiruan di 127.0.0.1:{d.DASAR_PENERBIT}")


# ---------- testing.txt ----------

def go_test(*args, env):
    r = subprocess.run(["go", *args], cwd=d.HERE, env=env, capture_output=True, text=True)
    teks = (r.stdout + r.stderr).replace("\t", "  ")
    teks = re.sub(r" \(\d+\.\d+s\)", "", teks)
    teks = re.sub(r"^(ok|FAIL)(\s+\S+)\s+[\d.]+s", r"\1\2", teks, flags=re.M)
    teks = re.sub(r"^(ok\s+\S+)\s+\(cached\)", r"\1", teks, flags=re.M)
    teks = re.sub(r"^\d{4}/\d\d/\d\d \d\d:\d\d:\d\d(?:\.\d+)? ", "", teks, flags=re.M)
    teks = re.sub(r"(?<=:)\d{4,5}\b", "<port>", teks)
    return r.returncode, teks.rstrip()


POLA_LEDGER = "LedgerTahanKartu|LedgerKartu"       # tes di ./internal/service dan ./internal/handler
POLA_MODUL = "^TestKartu"                            # tes di ./internal/modul/pembayaran
PAKET_LEDGER = ["./internal/service", "./internal/handler"]
PAKET_MODUL = ["./internal/modul/pembayaran"]


def rekam_testing():
    ulang_samaran()
    d.buat_schema(TES)
    tes_db = d.db_pemilik(TES, "t4-kartu-tes")
    env = dict(d.ENV, TEST_DATABASE_URL=tes_db, LAB_TES_SCHEMA=TES, TES_DB_WAJIB="1")
    bagian(f"A. go vet, lalu tes hold kartu di ledger, API ledger, dan otorisasi di service pembayaran dengan PostgreSQL sungguhan (schema {TES})")
    rc, teks = go_test("vet", "./...", env=d.ENV)
    catat("$ go vet ./...")
    catat(teks or "(tanpa temuan)")
    catat(f"# exit status {rc}")
    harap(rc, 0, "go vet")
    ada, teks_semua = set(), ""
    for pola, paket in ((POLA_LEDGER, PAKET_LEDGER), (POLA_MODUL, PAKET_MODUL)):
        rc, daftar = go_test("test", "-list", pola, *paket, env=env)
        harap(rc, 0, "go test -list")
        daftar_pola = {l.strip() for l in daftar.splitlines() if l.startswith("Test")}
        ada |= daftar_pola
        if pola == POLA_MODUL:
            n_modul = len(daftar_pola)
        rc, teks = go_test("test", "-v", "-count=1", "-p", "1", "-run", pola, *paket, env=env)
        teks = "\n".join(l for l in teks.splitlines() if not l.startswith(("?", "=== RUN", "=== PAUSE", "=== CONT")))
        catat(f"$ TEST_DATABASE_URL=<pemilik, schema {TES}> LAB_TES_SCHEMA={TES} TES_DB_WAJIB=1 go test -v -count=1 -p 1 -run '{pola}' {' '.join(paket)}")
        catat(teks)
        catat(f"# exit status {rc}")
        if rc != 0:
            print(teks, file=sys.stderr)
        harap(rc, 0, "go test")
        harap("--- SKIP" in teks, False, "tes dilewati")
        teks_semua += "\n" + teks
    harap(len(ada) >= 20, True, f"jumlah tes lab ini ({len(ada)})")
    jalan = set(re.findall(r"^--- PASS: (\S+)", teks_semua, flags=re.M))
    harap(sorted(ada - jalan), [], "tes lab yang tidak dijalankan pola -run")
    catat(f"# {len(ada)} tes cocok dengan pola dan semuanya PASS (pola yang tidak mencocokkan satu tes membuat klaim 'tertangkap' tidak berlaku, jadi daftar -list dibandingkan dengan yang berjalan).")
    bagian("B. Tanpa TEST_DATABASE_URL: tes yang butuh database dilewati; TES_DB_WAJIB=1 menggagalkannya")
    sans = {k: v for k, v in d.ENV.items() if k != "TEST_DATABASE_URL"}
    rc, teks = go_test("test", "-count=1", "-run", POLA_MODUL, *PAKET_MODUL, env=sans)
    catat(f"$ go test -count=1 -run '{POLA_MODUL}' {' '.join(PAKET_MODUL)}")
    catat("\n".join(l for l in teks.splitlines() if not l.startswith("?")))
    catat(f"# exit status {rc}")
    harap(rc, 0, "tanpa database")
    rc, teks = go_test("test", "-count=1", "-run", POLA_MODUL, *PAKET_MODUL, env=dict(sans, TES_DB_WAJIB="1"))
    catat(f"$ TES_DB_WAJIB=1 go test -count=1 -run '{POLA_MODUL}' {' '.join(PAKET_MODUL)}")
    gagal_n = len(re.findall(r"^--- FAIL", teks, flags=re.M))
    pesan_n = len(re.findall(r"TES_DB_WAJIB=1 tetapi TEST_DATABASE_URL kosong", teks))
    catat(f"{gagal_n} dari {n_modul} tes modul gagal, masing-masing dengan pesan: TES_DB_WAJIB=1 tetapi TEST_DATABASE_URL kosong ({pesan_n} pesan)")
    catat(f"# exit status {rc}")
    harap(rc, 1, "TES_DB_WAJIB tanpa database")
    harap((gagal_n, pesan_n), (n_modul, n_modul), "setiap tes modul gagal keras tanpa database")
    versi = d.satu("SHOW server_version", "public")
    kepala = [f"# Lab {LAB} · tes Go untuk hold kartu di ledger, API ledger, dan otorisasi di service pembayaran",
              f"# PostgreSQL {versi} · {d.versi_alat()} · pgx {d.PGX} · schema {TES}",
              f"# Rekaman dari database bersih: make -C labs/{LAB} run."]
    d.OUT.mkdir(exist_ok=True)
    (d.OUT / "testing.txt").write_text("\n".join(l.rstrip() for l in "\n".join(kepala + d.log).split("\n")) + "\n")
    print("ditulis:", f"labs/{LAB}/output/testing.txt")
    d.log.clear()


BAGIAN = {"otorisasi": rekam_otorisasi, "tenggat": rekam_tenggat, "kedaluwarsa": rekam_kedaluwarsa, "kill-switch": rekam_kill_switch,
          "penerbit": rekam_penerbit, "dua-service": rekam_dua_service, "testing": rekam_testing}


def main():
    pilih = sys.argv[1:] or list(BAGIAN)
    for p in pilih:
        if p not in BAGIAN:
            gagal(f"bagian tidak dikenal: {p} (pilihan: {' '.join(BAGIAN)})")
    bangun()
    try:
        for p in pilih:
            BAGIAN[p]()
    finally:
        for port in list(d.server):
            d.stop(port)


if __name__ == "__main__":
    main()
