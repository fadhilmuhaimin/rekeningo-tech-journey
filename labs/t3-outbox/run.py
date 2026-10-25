"""Rekam lab t3-outbox (keputusan 960-962): outbox, klaim per baris, retry, dan queue promo di atas api-t3.

Server, skema, data awal, dan layanan push tiruan adalah milik `labs/api-t3` (`dasar_t3.py`), bukan salinan; lab ini
hanya menambah skenario di atasnya, di schema sendiri (`tahap3_outbox`). Setiap bagian membuat ulang schema dan data
awal dari nol, jadi output/*.txt tidak bergantung pada urutan bagian dan rekaman ulang identik per byte (make cek).
Token, waktu, tanggal, dan notifikasi_id disamarkan. Angka yang bergantung pada kecepatan mesin (kapasitas worker,
jumlah terkirim dalam 30 detik) tidak ditulis sebagai angka: lab memeriksa batasnya dan gagal keras bila meleset,
rekaman memuat batasnya. Layanan push adalah tiruan lokal (cmd/pushpalsu); tidak ada panggilan ke luar mesin ini.

    make -C labs/t3-outbox run                     (butuh: Docker, Go; PostgreSQL lewat labs/b3-race)
    make -C labs/t3-outbox run BAGIAN=kursor       (satu bagian: transaksi kursor klaim ganda retry queue listen)
"""
import datetime, functools, os, pathlib, re, subprocess, sys, tempfile, threading, time

import psycopg

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "api-t3"))
import dasar_t3 as d  # noqa: E402
from dasar_t3 import PORT, PORT_PUSH, bagian, catat, curl, gagal, harap, j, login  # noqa: E402

LAB = "t3-outbox"
SCH = "tahap3_outbox"
DB = d.db_app(SCH)
d.OUT = HERE / "output"          # dasar_t3.tulis menulis ke d.OUT; di sini output lab ini, bukan api-t3

sql = functools.partial(d.sql, schema=SCH)


def satu(q):
    return d.satu(q, SCH)


def sambung(autocommit=True):
    return d.sambung(SCH, autocommit)


def tulis(nama, judul, keputusan="960"):
    d.tulis(nama, judul, lab=LAB, schema=SCH, dasar=d.DASAR, keputusan=keputusan)


# ---------- dasar ----------

def siapkan():
    d.buat_schema(SCH)
    d.seed(SCH)


def mulai_semua(args=(), tampil=None):
    d.mulai_push()
    d.mulai_api(args, tampil=tampil, db=DB)


def serentak(kerja):
    """Setiap fungsi di thread sendiri. Mengembalikan (hasil, daftar thread); hasil terisi setelah join."""
    hasil, thread = [None] * len(kerja), []
    for i, f in enumerate(kerja):
        t = threading.Thread(target=lambda i=i, f=f: hasil.__setitem__(i, f()))
        t.start()
        thread.append(t)
    return hasil, thread


def tunggu_semua(thread):
    for t in thread:
        t.join(60)
        if t.is_alive():
            gagal("thread tidak selesai dalam 60 detik")


def perintah_worker(args):
    return [str(d.BIN), "-peran", "worker", "-sekali", "-push-url", f"http://127.0.0.1:{PORT_PUSH}", *args]


RINGKASAN = re.compile(r"worker: diklaim (\d+), terkirim (\d+), dilewati (\d+), ditunda (\d+), mati (\d+)")


def ringkas(teks):
    m = RINGKASAN.fullmatch(teks.strip())
    if not m:
        gagal(f"ringkasan worker tidak dikenal: {teks!r}")
    return dict(zip(("diklaim", "terkirim", "dilewati", "ditunda", "mati"), map(int, m.groups())))


def worker(args=(), tampil=True, kode=0, label=None):
    """`./api-t3 -peran worker -sekali`. Mengembalikan ringkasan sebagai dict; exit status harus `kode`."""
    r = subprocess.run(perintah_worker(args), env=dict(d.ENV, DATABASE_URL=DB), capture_output=True, text=True)
    harap(r.returncode, kode, "exit worker")
    if tampil:
        catat((label or "$ ./api-t3 -peran worker -sekali" + "".join(f" {a}" for a in args)))
        for l in r.stdout.splitlines():
            catat(l)
        for l in d.bersih_log(r.stderr):
            if not l.startswith("worker mulai"):
                catat("log: " + l)
    return ringkas(r.stdout) if r.stdout.strip() else {}


def mulai_worker(nama, args=()):
    """Worker yang berputar terus; dihentikan dengan d.stop(nama)."""
    f = tempfile.TemporaryFile(mode="a+")
    p = subprocess.Popen([str(d.BIN), "-peran", "worker", "-push-url", f"http://127.0.0.1:{PORT_PUSH}", *args],
                         env=dict(d.ENV, DATABASE_URL=DB), stdout=f, stderr=f, text=True)
    d.server[nama] = (p, f)
    time.sleep(0.3)
    if p.poll() is not None:
        gagal(f"worker {nama} langsung berhenti")


def bayar(token, ke=418, nominal=1000, catatan=None):
    body = {"ke": ke, "nominal": nominal}
    if catatan:
        body["catatan"] = catatan
    s, isi = curl("POST", "/transfers", body, token, tampil=False)
    harap(s, 201, f"bayar {nominal} ke {ke}")
    return j(isi)["id"]


def menunggu_lock():
    return satu("SELECT count(*) FROM pg_stat_activity WHERE application_name = 'api-t3' AND wait_event_type = 'Lock'")


def tangan_kunci_buku(akun):
    """Sesi tangan (pemilik schema) yang memegang lock baris buku satu akun sampai commit atau rollback."""
    c = sambung(autocommit=False)
    c.execute(f"SELECT id FROM buku WHERE akun_id = {akun} FOR UPDATE")
    return c


def urutan_terima():
    """Nomor outbox menurut urutan permintaan diterima layanan push (notifikasi_id dipetakan lewat database)."""
    peta = {n: i for n, i in sql("SELECT notifikasi_id::text, id FROM outbox", tampil=False)}
    return [peta[x["notifikasi_id"]] for x in d.push_diterima(True)["daftar"]]


def semua_status():
    sql("SELECT status, percobaan, count(*) AS baris FROM outbox GROUP BY status, percobaan ORDER BY status, percobaan")


def kosongkan_outbox():
    catat("=> TRUNCATE outbox RESTART IDENTITY   # lab: antrean kosong lagi, nomor mulai dari 1")
    sql("TRUNCATE outbox RESTART IDENTITY", tampil=False)
    d.push_reset()


# ---------- transaksi.txt (a) ----------

def rekam_transaksi():
    siapkan()
    mulai_semua(tampil="# server: ./api-t3 -lab (pool 10, push timeout 3s, idle-tx 5s); layanan push tiruan: ./pushpalsu")
    budi = login("budi@lestari.example", label="Budi")

    bagian("A. Pembayaran lewat API: jurnal, dua posting, dan satu baris outbox lahir di transaction yang sama")
    s, isi = curl("POST", "/transfers", {"ke": 418, "nominal": 25000, "catatan": "nasi goreng dua porsi"}, budi)
    harap((s, j(isi)), (201, {"id": 10001, "saldo": 225000}), "bayar Budi")
    sql("SELECT p.jurnal_id, j.jenis, b.jenis AS buku, p.jumlah FROM posting p JOIN jurnal j ON j.id = p.jurnal_id"
        " JOIN buku b ON b.id = p.buku_id WHERE p.jurnal_id = 10001 ORDER BY p.id")
    sql("SELECT id, jurnal_id, akun_id, kelas, jenis, status, percobaan, payload->>'judul' AS judul FROM outbox")
    harap(d.push_diterima()["jumlah"], 0, "push belum menerima apa pun")
    catat("push tiruan menerima: 0 (pembayaran selesai, pemberitahuan belum dikirim: pengirimannya urusan worker)")
    h = worker()
    harap(h["terkirim"], 1, "worker mengirim satu")
    harap(d.push_diterima()["jumlah"], 1, "push menerima satu")
    catat("push tiruan menerima: 1")

    bagian("B. Sebelum COMMIT worker tidak melihat baris outbox; sesudah COMMIT terlihat dan terkirim")
    catat("# Sesi tangan (pemilik schema): jurnal 90001 seimbang (-1000 dan +1000) dan satu baris outbox, belum COMMIT")
    c = sambung(autocommit=False)
    catat("=> BEGIN")
    for q in ("INSERT INTO jurnal (id, jenis, keterangan, dibuat_oleh) VALUES (90001, 'bayar', 'sesi tangan', 419)",
              "INSERT INTO posting (jurnal_id, buku_id, jumlah) SELECT 90001, id, -1000 FROM buku WHERE akun_id = 419",
              "INSERT INTO posting (jurnal_id, buku_id, jumlah) SELECT 90001, id, 1000 FROM buku WHERE akun_id = 418",
              "INSERT INTO outbox (jurnal_id, akun_id, kelas, jenis, payload) VALUES (90001, 418, 0, 'bayar', '{\"judul\": \"sesi tangan\"}')"):
        catat("=> " + q)
        catat(c.execute(q).statusmessage)
    dalam = c.execute("SELECT count(*) FROM outbox WHERE jurnal_id = 90001").fetchone()[0]
    luar = satu("SELECT count(*) FROM outbox WHERE jurnal_id = 90001")
    harap((dalam, luar), (1, 0), "outbox terlihat hanya di sesi sendiri")
    catat("=> SELECT count(*) FROM outbox WHERE jurnal_id = 90001   # sesi tangan sendiri: 1; sesi lain (worker termasuk): 0")
    h = worker()
    harap(h["diklaim"], 0, "worker tidak melihat baris sebelum COMMIT")
    catat("# Worker berjalan sementara transaction terbuka: diklaim 0. Pemberitahuan tidak bisa mendahului uangnya.")
    catat("=> COMMIT")
    c.commit()
    c.close()
    h = worker()
    harap((h["diklaim"], h["terkirim"]), (1, 1), "worker mengirim sesudah COMMIT")

    bagian("C. ROLLBACK membuang jurnal dan baris outbox bersama-sama")
    c = sambung(autocommit=False)
    catat("=> BEGIN; jurnal 90002 seimbang, posting, dan satu baris outbox seperti di B")
    for q in ("INSERT INTO jurnal (id, jenis, keterangan, dibuat_oleh) VALUES (90002, 'bayar', 'akan dibatalkan', 419)",
              "INSERT INTO posting (jurnal_id, buku_id, jumlah) SELECT 90002, id, -1000 FROM buku WHERE akun_id = 419",
              "INSERT INTO posting (jurnal_id, buku_id, jumlah) SELECT 90002, id, 1000 FROM buku WHERE akun_id = 418",
              "INSERT INTO outbox (jurnal_id, akun_id, kelas, jenis, payload) VALUES (90002, 418, 0, 'bayar', '{}')"):
        c.execute(q)
    catat("=> ROLLBACK")
    c.rollback()
    c.close()
    sql("SELECT (SELECT count(*) FROM jurnal WHERE id = 90002) AS jurnal_90002, (SELECT count(*) FROM outbox WHERE jurnal_id = 90002) AS outbox_90002")
    harap(satu("SELECT (SELECT count(*) FROM jurnal WHERE id = 90002) + (SELECT count(*) FROM outbox WHERE jurnal_id = 90002)"), 0, "rollback")
    h = worker()
    harap(h["diklaim"], 0, "tidak ada yang dikirim")
    harap(d.push_diterima()["jumlah"], 2, "push tetap dua pesan")
    catat("push tiruan menerima: tetap 2 pesan (A dan B); yang dibatalkan tidak pernah diberitahukan")

    bagian("D. Pembayaran ditolak (saldo kurang) dan COMMIT ditolak database: tidak ada jurnal, tidak ada baris outbox")
    dimas = login("dimas@lestari.example", label="Dimas")
    bayar(dimas, nominal=200000)
    worker(tampil=False)   # pemberitahuan pembayaran ini dikirim dulu supaya antrean kosong di bagian F
    sebelum = sql("SELECT (SELECT count(*) FROM jurnal) AS jurnal, (SELECT count(*) FROM outbox) AS outbox", tampil=False)[0]
    s, _ = curl("POST", "/transfers", {"ke": 418, "nominal": 200000}, dimas)
    harap(s, 422, "saldo Dimas kurang")
    harap(sql("SELECT (SELECT count(*) FROM jurnal), (SELECT count(*) FROM outbox)", tampil=False)[0], sebelum, "tidak ada baris dari bayar yang ditolak")
    catat(f"# sebelum dan sesudah 422 sama: tabel jurnal {sebelum[0]} baris, tabel outbox {sebelum[1]} baris")
    c = sambung(autocommit=False)
    catat("# Sesi tangan: jurnal 90003 tidak seimbang (-1000 dan +900) dan satu baris outbox")
    for q in ("INSERT INTO jurnal (id, jenis, keterangan, dibuat_oleh) VALUES (90003, 'bayar', 'tidak seimbang', 419)",
              "INSERT INTO posting (jurnal_id, buku_id, jumlah) SELECT 90003, id, -1000 FROM buku WHERE akun_id = 419",
              "INSERT INTO posting (jurnal_id, buku_id, jumlah) SELECT 90003, id, 900 FROM buku WHERE akun_id = 418",
              "INSERT INTO outbox (jurnal_id, akun_id, kelas, jenis, payload) VALUES (90003, 418, 0, 'bayar', '{}')"):
        c.execute(q)
    catat("=> COMMIT")
    try:
        c.commit()
        gagal("COMMIT jurnal tidak seimbang harus ditolak")
    except psycopg.Error as e:
        harap((e.sqlstate, e.diag.constraint_name), ("23514", "jurnal_seimbang"), "COMMIT tidak seimbang")
        catat(f"ERROR:  {e.diag.message_primary}")
        catat(f"   -- SQLSTATE {e.sqlstate} · constraint {e.diag.constraint_name}")
    c.close()
    sql("SELECT (SELECT count(*) FROM jurnal WHERE id = 90003) AS jurnal_90003, (SELECT count(*) FROM outbox WHERE jurnal_id = 90003) AS outbox_90003")
    harap(satu("SELECT count(*) FROM outbox WHERE jurnal_id = 90003"), 0, "outbox ikut batal")

    bagian("E. Satu pemberitahuan per jurnal per penerima: database menolak baris kedua")
    catat("=> INSERT INTO outbox (jurnal_id, akun_id, kelas, jenis, payload) VALUES (10001, 418, 0, 'bayar', '{}')   # jurnal 10001 sudah punya satu untuk akun 418")
    try:
        with sambung() as c2:
            c2.execute("INSERT INTO outbox (jurnal_id, akun_id, kelas, jenis, payload) VALUES (10001, 418, 0, 'bayar', '{}')")
        gagal("baris outbox kedua untuk jurnal yang sama harus ditolak")
    except psycopg.errors.UniqueViolation as e:
        harap((e.sqlstate, e.diag.constraint_name), ("23505", "outbox_satu_per_jurnal"), "satu per jurnal")
        catat(f"ERROR:  {e.diag.message_primary}")
        catat(f"   -- SQLSTATE {e.sqlstate} · index {e.diag.constraint_name}")

    bagian("F. Proses API mati sesudah COMMIT: pemberitahuannya tetap ada di database dan dikirim worker")
    bayar(budi, nominal=30000, catatan="mati sesudah COMMIT")
    d.stop(PORT, tampil="$ kill -KILL <pid api-t3>   # proses API mati sekarang, sesudah 201", sinyal="kill")
    sql("SELECT jurnal_id, jenis, status, percobaan FROM outbox ORDER BY id DESC LIMIT 1")
    h = worker()
    harap((h["diklaim"], h["terkirim"]), (1, 1), "worker mengirim walau API mati")
    sql("SELECT jurnal_id, jenis, status, percobaan FROM outbox ORDER BY id DESC LIMIT 1")
    catat("# Tanpa outbox (kirim sesudah COMMIT di proses API, opsi ADR 23): proses yang mati di antara COMMIT dan kirim tidak "
          "meninggalkan jejak. Opsi itu Tidak dijalankan di lab ini.")
    tulis("transaksi.txt", "jurnal dan baris outbox dalam satu transaction (ADR 23)")


# ---------- kursor.txt (b) ----------

def rekam_kursor():
    siapkan()
    mulai_semua(tampil="$ ./api-t3 -lab   # versi benar untuk jalur uang")
    mulai_worker("kursor", ["-rentan", "kursor", "-selang", "20ms"])
    catat("$ ./api-t3 -peran worker -rentan kursor -selang 20ms &   # poller versi pertama (ADR 16 ditiru), berputar terus")
    budi = login("budi@lestari.example", label="Budi")
    dimas = login("dimas@lestari.example", label="Dimas")
    patungan = lambda token: (lambda: curl("POST", "/kiriman", {"ke_nomor_karyawan": "K00504", "nominal": 25000, "catatan": "patungan"},
                                            token, tampil=False))

    bagian("A. Dua transfer ke Citra antre di baris buku Citra: yang tiba lebih dulu selesai lebih dulu, kursor aman")
    catat("=> BEGIN; SELECT id FROM buku WHERE akun_id = 504 FOR UPDATE;   # sesi tangan memegang baris buku Citra (akun 504)")
    h = tangan_kunci_buku(504)
    hasil_b, th_b = serentak([patungan(budi)])
    d.tunggu(lambda: menunggu_lock() == 1, "kiriman Budi menunggu lock Citra")
    hasil_d, th_d = serentak([patungan(dimas)])
    d.tunggu(lambda: menunggu_lock() == 2, "kiriman Dimas menunggu lock Citra")
    sql("SELECT count(*) AS transaction_menunggu_lock FROM pg_stat_activity WHERE application_name = 'api-t3' AND wait_event_type = 'Lock'")
    catat("# Dua transaction menunggu baris yang sama. Budi tiba lebih dulu (di antrean lock lebih depan), Dimas sesudahnya.")
    h.commit()
    h.close()
    catat("=> COMMIT   # sesi tangan melepas baris buku Citra")
    tunggu_semua(th_b + th_d)
    harap((hasil_b[0][0], hasil_d[0][0]), (201, 201), "dua kiriman selesai")
    d.tunggu(lambda: satu("SELECT count(*) FROM outbox WHERE status = 'terkirim'") == 2, "poller mengirim dua baris")
    sql("SELECT o.id AS outbox_id, o.jurnal_id, j.dibuat_oleh AS pengirim, row_number() OVER (ORDER BY o.dibuat, o.id) AS urutan_dibuat, o.status"
        " FROM outbox o JOIN jurnal j ON j.id = o.jurnal_id ORDER BY o.id")
    harap(sql("SELECT j.dibuat_oleh FROM outbox o JOIN jurnal j ON j.id = o.jurnal_id ORDER BY o.id", tampil=False), [(419,), (417,)],
          "Budi dulu, Dimas kemudian")
    harap(satu("SELECT string_agg(urutan::text, ',' ORDER BY id) FROM (SELECT id, row_number() OVER (ORDER BY dibuat, id) AS urutan FROM outbox) x"),
          "1,2", "nomor outbox sama urutannya dengan dibuat")
    harap(d.push_diterima()["jumlah"], 2, "kedua baris terkirim")
    catat("# Nomor outbox dan urutan `dibuat` sama (1, 2): kursor (dibuat, id) tidak melewatkan apa pun. Dua pesan terkirim.")

    bagian("B. Pengirim yang mulai lebih dulu terhambat sebelum sampai ke Citra: ia selesai belakangan dan tertinggal di belakang kursor")
    kosongkan_outbox()
    saldo0 = satu("SELECT saldo_cache FROM buku WHERE akun_id = 504")
    catat("# 1. Permintaan lain dari Budi masih berjalan: sesi tangan memegang baris buku Budi (akun 419)")
    catat("=> BEGIN; SELECT id FROM buku WHERE akun_id = 419 FOR UPDATE;")
    h = tangan_kunci_buku(419)
    catat("# 2. Budi mengirim Rp25.000 ke Citra: mulai lebih dulu, lalu menunggu baris bukunya sendiri")
    hasil_b, th_b = serentak([patungan(budi)])
    d.tunggu(lambda: menunggu_lock() == 1, "kiriman Budi menunggu bukunya sendiri")
    catat("# 3. Dimas mengirim Rp25.000 ke Citra: mulai sesudah Budi, tidak ada yang menghalangi, COMMIT lebih dulu")
    s, isi = patungan(dimas)()
    harap(s, 201, "kiriman Dimas")
    jurnal_dimas = j(isi)["id"]
    d.tunggu(lambda: satu(f"SELECT status FROM outbox WHERE jurnal_id = {jurnal_dimas}") == "terkirim", "poller mengirim baris Dimas")
    catat("# 4. Poller sudah mengirim baris Dimas dan kursornya maju ke (dibuat Dimas, nomor Dimas). Sekarang permintaan lain Budi selesai.")
    catat("=> COMMIT   # sesi tangan melepas baris buku Budi")
    h.commit()
    h.close()
    tunggu_semua(th_b)
    harap(hasil_b[0][0], 201, "kiriman Budi selesai")
    time.sleep(1.5)
    sql("SELECT o.id AS outbox_id, j.dibuat_oleh AS pengirim, o.status, row_number() OVER (ORDER BY o.dibuat, o.id) AS urutan_dibuat"
        " FROM outbox o JOIN jurnal j ON j.id = o.jurnal_id ORDER BY o.id")
    harap(sql("SELECT j.dibuat_oleh, o.status FROM outbox o JOIN jurnal j ON j.id = o.jurnal_id ORDER BY o.id", tampil=False),
          [(417, "terkirim"), (419, "menunggu")], "baris Budi tertinggal")
    harap(satu("SELECT string_agg(urutan::text, ',' ORDER BY id) FROM (SELECT id, row_number() OVER (ORDER BY dibuat, id) AS urutan FROM outbox) x"),
          "2,1", "nomor lebih besar tetapi dibuat lebih awal")
    catat("# Baris Budi bernomor lebih besar tetapi `dibuat` (awal transaction) lebih awal: ia ada di belakang kursor poller.")
    catat(f"=> SELECT saldo_cache - {saldo0} AS saldo_citra_naik FROM buku WHERE akun_id = 504")
    naik = satu(f"SELECT saldo_cache - {saldo0} FROM buku WHERE akun_id = 504")
    harap(naik, 50000, "saldo Citra naik 50.000")
    catat(" saldo_citra_naik\n------------------\n 50000\n(1 row)")
    harap([x["token"] for x in d.push_diterima(True)["daftar"]], ["tiruan-504"], "HP Citra berbunyi sekali")
    catat("# Saldo Citra naik Rp50.000 (dua transfer), tetapi HP-nya (token tiruan-504) menerima satu pesan saja")
    catat("push tiruan menerima: 1 pesan (hanya Dimas); dalam 1,5 detik pengamatan (puluhan putaran poller) baris Budi tidak terkirim")
    d.stop("kursor", tampil="$ kill -TERM <pid poller kursor>")

    bagian("C. Perbaikan (ADR 24): worker mengklaim baris, tanpa kursor; baris yang tertinggal ikut terkirim")
    h = worker()
    harap((h["diklaim"], h["terkirim"]), (1, 1), "klaim menemukan baris Budi")
    sql("SELECT o.id AS outbox_id, j.dibuat_oleh AS pengirim, o.status, o.percobaan FROM outbox o JOIN jurnal j ON j.id = o.jurnal_id ORDER BY o.id")
    harap(d.push_diterima()["jumlah"], 2, "dua pesan sampai")
    catat("push tiruan menerima: 2 pesan; HP Citra berbunyi dua kali untuk dua transfer")
    tulis("kursor.txt", "kursor (dibuat, id) melewatkan baris yang COMMIT belakangan (M19), klaim tidak")


# ---------- klaim.txt (c) ----------

def rekam_klaim():
    siapkan()
    mulai_semua(tampil="$ ./api-t3 -lab")
    budi = login("budi@lestari.example", label="Budi")

    bagian("A. SQL klaim: tanpa SKIP LOCKED worker kedua antre di belakang worker pertama; dengan SKIP LOCKED ia langsung mendapat baris lain")
    for n in range(8):
        bayar(budi, nominal=1000)
    sql("SELECT status, count(*) AS baris FROM outbox GROUP BY status")
    layak = "status = 'menunggu' AND (klaim_sampai IS NULL OR klaim_sampai < now()) ORDER BY kelas, id LIMIT 4"
    catat("# Bentuk query sama dengan KlaimOutbox (internal/repo/outbox.go): baris yang layak, urut kelas lalu nomor, LIMIT 4")

    def klaim_tangan():
        a = sambung(autocommit=False)
        a.execute("UPDATE outbox SET klaim_sampai = now() + interval '5 seconds', percobaan = percobaan + 1 WHERE id IN (1, 2, 3, 4)")
        return a

    catat("=> [sesi 1] BEGIN; UPDATE outbox SET klaim_sampai = now() + interval '5 seconds', percobaan = percobaan + 1 WHERE id IN (1, 2, 3, 4);"
          "   # worker 1 mengklaim empat baris, belum COMMIT")
    a = klaim_tangan()
    b = sambung(autocommit=False)
    catat(f"=> [sesi 2] SELECT id FROM outbox WHERE {layak} FOR UPDATE;   # tanpa SKIP LOCKED")
    hasil, th = serentak([lambda: [r[0] for r in b.execute(f"SELECT id FROM outbox WHERE {layak} FOR UPDATE").fetchall()]])
    d.tunggu(lambda: satu("SELECT count(*) FROM pg_stat_activity WHERE application_name = 'api-t3-pemilik' AND wait_event_type = 'Lock'") == 1,
             "sesi 2 menunggu baris milik sesi 1")
    harap(th[0].is_alive(), True, "sesi 2 belum selesai selama sesi 1 belum COMMIT")
    catat("# sesi 2 menunggu baris 1 sampai 4 yang dipegang sesi 1; belum ada jawaban")
    a.commit()
    catat("=> [sesi 1] COMMIT")
    tunggu_semua(th)
    harap(hasil[0], [5, 6, 7, 8], "sesi 2 mendapat baris berikutnya sesudah menunggu")
    catat(f" sesi 2 baru dijawab sesudah COMMIT sesi 1: nomor {', '.join(map(str, hasil[0]))} (baris 1 sampai 4 tidak lagi layak, jadi dilewati)")
    b.rollback()
    catat("# Tanpa SKIP LOCKED hasilnya tetap benar, tanpa baris ganda; harganya sesi 2 menunggu selama sesi 1 memegang baris itu.")
    catat("=> UPDATE outbox SET klaim_sampai = NULL, percobaan = 0   # lab: klaim dilepas, antrean seperti semula")
    sql("UPDATE outbox SET klaim_sampai = NULL, percobaan = 0", tampil=False)
    a = klaim_tangan()
    catat("=> [sesi 1] BEGIN; UPDATE ... WHERE id IN (1, 2, 3, 4);   # klaim lagi, belum COMMIT")
    catat(f"=> [sesi 2] SELECT id FROM outbox WHERE {layak} FOR UPDATE SKIP LOCKED;")
    ids2 = [r[0] for r in b.execute(f"SELECT id FROM outbox WHERE {layak} FOR UPDATE SKIP LOCKED").fetchall()]
    harap(ids2, [5, 6, 7, 8], "sesi 2 melewati baris yang dipegang")
    catat(f" sesi 2 langsung mendapat nomor {', '.join(map(str, ids2))}, tanpa menunggu")
    c = sambung(autocommit=False)
    catat(f"=> [sesi 3] SELECT id FROM outbox WHERE {layak} FOR UPDATE SKIP LOCKED;")
    ids3 = [r[0] for r in c.execute(f"SELECT id FROM outbox WHERE {layak} FOR UPDATE SKIP LOCKED").fetchall()]
    harap(ids3, [], "sesi 3 tidak mendapat apa pun")
    catat(" sesi 3 mendapat 0 baris: semua baris yang layak sedang dipegang, dan ia tidak menunggu")
    for x in (a, b, c):
        x.rollback()
        x.close()
    catat("# Dua sesi tidak pernah memegang baris yang sama, dan tidak ada baris yang layak tetapi tidak dipegang siapa pun.")
    catat("# SKIP LOCKED tidak membuat klaim lebih benar; ia membuat worker tidak antre di belakang worker lain (R3-03).")
    catat("# Yang dipegang worker adalah baris outbox, bukan baris buku: pembayaran tidak ikut menunggu.")

    bagian("B. Tiga worker serentak atas 60 baris: tiap baris dikirim sekali, tidak ada yang terlewat")
    kosongkan_outbox()
    for n in range(60):
        bayar(budi, nominal=1000)
    d.push_mode("lambat", ms=200)
    catat("# layanan push tiruan menjawab sesudah 200 ms; tiga proses worker dengan -serentak 4, berjalan bersamaan sampai antrean habis")
    proses = [subprocess.Popen(perintah_worker(["-serentak", "4"]), env=dict(d.ENV, DATABASE_URL=DB), stdout=subprocess.PIPE,
                               stderr=subprocess.DEVNULL, text=True) for _ in range(3)]
    ringkasan = []
    for p in proses:
        out, _ = p.communicate(timeout=60)
        harap(p.returncode, 0, "exit worker")
        ringkasan.append(ringkas(out))
    catat("$ ./api-t3 -peran worker -sekali -serentak 4   # tiga proses bersamaan")
    harap(sum(r["diklaim"] for r in ringkasan), 60, "jumlah diklaim tiga worker")
    harap(sum(r["terkirim"] for r in ringkasan), 60, "jumlah terkirim tiga worker")
    harap(min(r["diklaim"] for r in ringkasan) >= 1, True, "tiap worker mengklaim sesuatu")
    catat("jumlah diklaim ketiga worker: 60; jumlah terkirim: 60; tiap worker mengklaim paling sedikit satu baris (pembagiannya tidak direkam: bergantung waktu)")
    semua_status()
    harap(sql("SELECT status, percobaan, count(*) FROM outbox GROUP BY 1, 2", tampil=False), [("terkirim", 1, 60)], "semua terkirim, satu percobaan")
    p = d.push_diterima()
    harap((p["jumlah"], p["notifikasi_berbeda"], p["notifikasi_ganda"]), (60, 60, 0), "push: 60 permintaan, 60 notifikasi_id, 0 ganda")
    catat("push tiruan menerima: 60 permintaan, 60 notifikasi_id berbeda, 0 ganda")
    d.push_mode("jawab")

    bagian("C. Urutan antar pesan tidak dijaga: baris yang dipegang worker lain dilewati, dikirim paling akhir")
    kosongkan_outbox()
    for n in range(5):
        bayar(budi, nominal=1000)
    catat("# Worker A mengklaim baris 1 lalu macet (klaim 1 detik, tidak mengirim apa pun). Ditulis sebagai UPDATE yang sama dengan klaim.")
    sql("UPDATE outbox SET klaim_sampai = now() + interval '1 second', percobaan = percobaan + 1 WHERE id = 1")
    h = worker(["-serentak", "1", "-klaim", "1s"])
    harap((h["diklaim"], h["terkirim"]), (4, 4), "worker B melewati baris 1")
    u1 = urutan_terima()
    harap(u1, [2, 3, 4, 5], "baris 1 dilewati")
    catat("urutan di layanan push (nomor outbox): " + " -> ".join(map(str, u1)))
    d.tunggu(lambda: satu("SELECT count(*) FROM outbox WHERE id = 1 AND klaim_sampai < now()") == 1, "klaim A habis", batas=5)
    catat("# klaim A habis: baris 1 boleh dipegang worker lain")
    h = worker(["-serentak", "1", "-klaim", "1s"])
    harap((h["diklaim"], h["terkirim"]), (1, 1), "baris 1 terkirim terakhir")
    u2 = urutan_terima()
    harap(u2, [2, 3, 4, 5, 1], "baris 1 paling akhir")
    catat("urutan di layanan push (nomor outbox): " + " -> ".join(map(str, u2)))
    sql("SELECT id, status, percobaan FROM outbox ORDER BY id")
    catat("# Pesan tertua (nomor 1) tiba paling akhir. SKIP LOCKED menjaga agar tidak ada baris ganda atau terlewat, bukan urutan (R3-03, R3-04).")
    tulis("klaim.txt", "klaim per baris FOR UPDATE SKIP LOCKED: tanpa baris ganda, tanpa baris terlewat, tanpa urutan (ADR 24)")


# ---------- ganda.txt (d) ----------

def rekam_ganda():
    siapkan()
    mulai_semua(tampil="$ ./api-t3 -lab")
    budi = login("budi@lestari.example", label="Budi")

    bagian("A. Worker mati di antara kirim dan tandai terkirim: klaim 5 detik (bawaan), lalu pengiriman ulang dengan notifikasi_id yang sama")
    bayar(budi, nominal=25000, catatan="nasi goreng dua porsi")
    catat("$ ./api-t3 -peran worker -sekali -lab-henti-sebelum-tandai   # lab: berhenti sesudah push berhasil; klaim bawaan 5 detik")
    t0 = time.monotonic()
    worker(["-lab-henti-sebelum-tandai"], tampil=False, kode=3)
    catat("# exit status 3: mati sesudah layanan push menjawab, sebelum UPDATE status")
    sql("SELECT status, percobaan, klaim_sampai > now() AS masih_dipegang FROM outbox")
    harap(d.push_diterima()["jumlah"], 1, "satu pesan sudah sampai")
    catat("push tiruan menerima: 1 pesan")
    catat("# Deploy memulai worker baru saat itu juga: klaim belum habis, jadi baris itu dilewati")
    h = worker()
    harap(h["diklaim"], 0, "klaim belum habis")
    sql("SELECT status, percobaan, klaim_sampai > now() AS masih_dipegang FROM outbox")
    d.tunggu(lambda: satu("SELECT count(*) FROM outbox WHERE status = 'menunggu' AND klaim_sampai < now()") == 1, "klaim 5 detik habis", batas=10)
    catat("# klaim habis: worker berikutnya mengklaim baris yang sama")
    h = worker()
    selang = time.monotonic() - t0
    harap((h["diklaim"], h["terkirim"]), (1, 1), "pengiriman ulang")
    harap(4.9 <= selang <= 7.0, True, f"selang dua pengiriman {selang:.2f} detik harus sedikit di atas klaim 5 detik")
    catat("selang antara pengiriman pertama dan kedua: sedikit di atas 5 detik, yaitu klaim 5 detik ditambah jeda polling dan waktu start worker")
    p = d.push_diterima()
    harap((p["jumlah"], p["notifikasi_berbeda"], p["notifikasi_ganda"]), (2, 1, 1), "dua pengiriman, satu notifikasi_id")
    catat("push tiruan menerima: 2 pesan, 1 notifikasi_id")
    sql("SELECT status, percobaan FROM outbox")
    harap(satu("SELECT count(*) FROM jurnal WHERE jenis = 'bayar' AND id > 10000"), 1, "hanya satu jurnal")
    sql("SELECT count(*) AS jurnal_bayar_baru FROM jurnal WHERE jenis = 'bayar' AND id > 10000")
    catat("# Hanya satu jurnal, dua pengiriman. Mengirim ulang itu benar (at-least-once); yang kurang adalah penerima yang mengenali ulangan (ADR 25).")

    bagian("B. Klaim yang lebih pendek dari waktu kirim menghasilkan ganda tanpa ada yang mati")
    d.push_reset()
    kosongkan_outbox()
    bayar(budi, nominal=10000)
    catat("# Klaim 300 ms, layanan push menjawab permintaan pertama sesudah 1,5 detik (lambat), permintaan berikutnya langsung")
    d.push_mode("lambat", ms=1500, kali=1)
    hasil_a, th_a = serentak([lambda: worker(["-klaim", "300ms"], tampil=False)])
    d.tunggu(lambda: satu("SELECT percobaan FROM outbox") == 1, "worker A mengklaim")
    d.tunggu(lambda: satu("SELECT count(*) FROM outbox WHERE klaim_sampai < now()") == 1, "klaim A habis")
    catat("# worker A masih menunggu jawaban push; klaimnya habis. Worker B mengklaim baris yang sama dan mengirimnya.")
    hb = worker(["-klaim", "300ms"], tampil=False)
    tunggu_semua(th_a)
    ha = hasil_a[0]
    harap((ha["terkirim"], hb["terkirim"]), (1, 1), "keduanya melapor terkirim")
    catat("$ ./api-t3 -peran worker -sekali -klaim 300ms   # worker A dan worker B, A mulai lebih dulu")
    catat("worker A: diklaim 1, terkirim 1\nworker B: diklaim 1, terkirim 1   # keduanya mengira ia yang mengirim")
    p = d.push_diterima()
    harap((p["jumlah"], p["notifikasi_berbeda"], p["notifikasi_ganda"]), (2, 1, 1), "ganda tanpa crash")
    catat("push tiruan menerima: 2 pesan, 1 notifikasi_id")
    sql("SELECT status, percobaan FROM outbox")
    d.push_mode("jawab")
    catat("# Klaim harus lebih panjang dari waktu kirim terburuk satu baris (ADR 24, ADR 22).")

    bagian("C. Penyaring di penerima: pesan ganda diterima, satu ditampilkan")
    p = d.push_diterima(True)
    sudah, tampil = set(), []
    for x in p["daftar"]:
        if x["notifikasi_id"] not in sudah:
            sudah.add(x["notifikasi_id"])
            tampil.append(x)
    harap((len(p["daftar"]), len(tampil)), (2, 1), "penyaring")
    catat("# Penyaring tiruan lima baris di run.py (kode app Dart: halaman 3.13, Tidak dijalankan di lab ini)")
    catat("diterima: 2 pesan; ditampilkan: 1 (notifikasi_id yang sudah tampil dilewati)")
    bagian("D. Klaim 5 detik pun terlalu pendek bila penerima punya dua perangkat yang menggantung: 2 x 3 detik")
    catat("# Kode worker mengirim ke perangkat penerima satu per satu, tiap panggilan berbatas 3 detik. Warung Ani punya dua HP.")
    sql("INSERT INTO perangkat (akun_id, platform, token_push) VALUES (418, 'ios', 'tiruan-418-b')")
    kosongkan_outbox()
    bayar(budi, nominal=10000)
    d.push_mode("gantung", kali=2)
    catat("# Layanan push menggantung untuk dua permintaan pertama (satu per HP), lalu normal. Worker A memakai klaim bawaan 5 detik.")
    hasil_a, th_a = serentak([lambda: worker(tampil=False)])
    d.tunggu(lambda: d.push_diterima()["jumlah"] == 1, "worker A mengirim ke HP pertama")
    d.tunggu(lambda: satu("SELECT count(*) FROM outbox WHERE klaim_sampai < now()") == 1, "klaim 5 detik habis", batas=10)
    catat("# Klaim A habis (5 detik) selagi A masih mengirim ke HP kedua (detik 3 sampai 6). Worker B mengklaim baris yang sama.")
    hb = worker(tampil=False)
    tunggu_semua(th_a)
    ha = hasil_a[0]
    harap((ha["diklaim"], ha["ditunda"], hb["diklaim"], hb["terkirim"]), (1, 1, 1, 1), "A tertunda, B terkirim")
    catat("$ ./api-t3 -peran worker -sekali   # worker A dan worker B, A mulai lebih dulu, klaim bawaan 5 detik")
    catat("worker A: diklaim 1, ditunda 1   # HP kedua melewati batas 3 detik; ia baru selesai di detik ke-6")
    catat("worker B: diklaim 1, terkirim 1")
    p = d.push_diterima()
    harap((p["jumlah"], p["notifikasi_berbeda"], p["notifikasi_ganda"]), (4, 1, 1), "dua HP kali dua worker")
    catat("push tiruan menerima: 4 pesan (dua HP, dua worker), 1 notifikasi_id")
    sql("SELECT status, percobaan FROM outbox")
    d.push_mode("jawab")
    catat("# Klaim yang aman sekurang-kurangnya jumlah perangkat x batas waktu push, ditambah sisa; atau kirim ke perangkat serentak. Di lab ini 5 detik muat satu HP, bukan dua yang menggantung.")

    tulis("ganda.txt", "pengiriman ganda: worker mati di tengah, klaim terlalu pendek, penyaring di penerima (M20)")


# ---------- retry.txt (e) ----------

def rekam_retry():
    siapkan()
    mulai_semua(tampil="$ ./api-t3 -lab")
    budi = login("budi@lestari.example", label="Budi")

    bagian("A. Layanan push menjawab 503 terus: backoff dengan jitter, lima percobaan, lalu dead-letter")
    bayar(budi, nominal=25000)
    d.push_mode("503")
    catat("# worker -satu-putaran: satu panggilan = satu putaran; backoff bawaan 2 detik, dua kali lipat tiap percobaan, maksimum 60 detik")
    catat("# Antara dua putaran lab memajukan coba_lagi (UPDATE tangan) supaya tidak menunggu backoff sungguhan")
    for putaran in range(1, 6):
        h = worker(["-satu-putaran", "-serentak", "1"], tampil=False)
        status, percobaan, tunggu = sql("SELECT status, percobaan, extract(epoch FROM coba_lagi - now()) FROM outbox", tampil=False)[0]
        batas = 2 * 2 ** (putaran - 1)
        if putaran < 5:
            harap((status, percobaan), ("menunggu", putaran), f"putaran {putaran}")
            harap(float(tunggu) <= batas, True, f"tunggu {tunggu} harus di bawah {batas}")
            catat(f"putaran {putaran}: outbox.status = menunggu, percobaan = {putaran}; coba lagi paling lama {batas} detik lagi (acak antara 0 dan {batas}): ya")
            sql("UPDATE outbox SET coba_lagi = now()", tampil=False)
        else:
            harap((status, percobaan, h["mati"]), ("mati", 5, 1), "putaran 5 dead-letter")
            catat(f"putaran {putaran}: outbox.status = mati, percobaan = {percobaan}")
    h = worker(["-satu-putaran", "-serentak", "1"], tampil=False)
    harap(h["diklaim"], 0, "putaran 6 tidak mengklaim")
    catat("putaran 6: diklaim 0 (baris mati tidak diklaim lagi)")
    harap(d.push_diterima()["jumlah"], 5, "lima permintaan")
    catat("push tiruan menerima: 5 permintaan untuk 1 notifikasi_id")
    semua_status()

    bagian("B. Jitter: 20 baris gagal pada putaran yang sama tidak mencoba lagi pada detik yang sama")
    kosongkan_outbox()
    d.push_mode("503")
    for n in range(20):
        bayar(budi, nominal=1000)
    h = worker(["-satu-putaran", "-serentak", "20"], tampil=False)
    harap((h["diklaim"], h["ditunda"]), (20, 20), "20 baris ditunda")
    catat("$ ./api-t3 -peran worker -sekali -satu-putaran -serentak 20   # 20 baris, semuanya dijawab 503")
    catat("worker: diklaim 20, terkirim 0, dilewati 0, ditunda 20, mati 0")
    jml, sebar = sql("SELECT count(DISTINCT coba_lagi), extract(epoch FROM max(coba_lagi) - min(coba_lagi)) FROM outbox", tampil=False)[0]
    harap(jml, 20, "20 waktu coba berbeda")
    harap(float(sebar) >= 0.5, True, f"sebaran coba_lagi {sebar} detik")
    harap(satu("SELECT count(*) FROM outbox WHERE coba_lagi - now() > interval '2 seconds'"), 0, "semua dalam 2 detik")
    catat("# Batas backoff pertama 2 detik: 20 baris mendapat 20 waktu coba berbeda, tersebar lebih dari 0,5 detik, semuanya paling lama 2 detik lagi: ya")

    bagian("C. Baris yang membuat worker mati terus: dead-letter di klaim ke-6, tanpa dikirim")
    kosongkan_outbox()
    d.push_mode("jawab")
    bayar(budi, nominal=25000)
    catat("# -lab-henti-sebelum-tandai membuat setiap worker mati sesudah push berhasil; klaim 1 detik. Percobaan naik saat klaim, bukan saat gagal.")
    for k in range(1, 6):
        worker(["-klaim", "1s", "-lab-henti-sebelum-tandai"], tampil=False, kode=3)
        status, percobaan = sql("SELECT status, percobaan FROM outbox", tampil=False)[0]
        harap((status, percobaan), ("menunggu", k), f"klaim ke-{k}")
        catat(f"klaim {k}: worker mati sesudah push berhasil; outbox.status = menunggu, percobaan = {percobaan}")
        d.tunggu(lambda: satu("SELECT count(*) FROM outbox WHERE klaim_sampai < now()") == 1, f"klaim {k} habis", batas=5)
    h = worker(["-klaim", "1s"], tampil=True)
    harap((h["diklaim"], h["mati"], h["terkirim"]), (1, 1, 0), "klaim ke-6 dead-letter")
    status, percobaan = sql("SELECT status, percobaan FROM outbox", tampil=False)[0]
    harap((status, percobaan), ("mati", 6), "dead-letter")
    catat(f"klaim 6: diklaim 1, mati 1, tanpa kirim; outbox.status = mati, percobaan = {percobaan}")
    harap(d.push_diterima()["jumlah"], 5, "lima pengiriman, bukan enam")
    catat("push tiruan menerima: 5 pesan untuk 1 notifikasi_id (klaim ke-6 tidak mengirim)")
    catat("# Batas 5 dihitung saat klaim: baris yang mematikan worker tidak diulang tanpa akhir")

    bagian("D. Dead-letter dibaca manusia dulu; sesudah penyebabnya beres, diputar ulang dengan tangan")
    sql("SELECT id, jenis, status, percobaan FROM outbox WHERE status = 'mati'")
    catat("=> UPDATE outbox SET status = 'menunggu', percobaan = 0, coba_lagi = now() WHERE status = 'mati'   # putar ulang")
    sql("UPDATE outbox SET status = 'menunggu', percobaan = 0, coba_lagi = now() WHERE status = 'mati'", tampil=False)
    h = worker()
    harap((h["diklaim"], h["terkirim"]), (1, 1), "putar ulang")
    sql("SELECT id, jenis, status, percobaan FROM outbox")
    catat("# Putar ulang tetap membawa notifikasi_id yang sama: penerima yang sudah menampilkannya menyaringnya")
    tulis("retry.txt", "retry dengan backoff dan jitter, maksimal 5 percobaan, dead-letter (ADR 25)")


# ---------- queue.txt (f) ----------

def rekam_queue():
    siapkan()
    mulai_semua(tampil="$ ./api-t3 -lab")
    budi = login("budi@lestari.example", label="Budi")
    admin = login("admin.tunjangan@lestari.example", label="admin")
    kota = ["jakarta", "bandung", "surabaya", "medan", "semarang", "makassar"]
    hr = [login(f"hr.{k}@lestari.example", label=f"HR {k.capitalize()}") for k in kota]

    bagian("A. Kapasitas worker: c pengirim dikali 1 ÷ t, diukur dengan layanan push yang menjawab sesudah 300 ms")
    for n in range(80):
        bayar(budi, nominal=1000)
    d.push_mode("lambat", ms=300)
    catat("# c = 4 pengirim serentak (bawaan), t = 0,3 detik (layanan push tiruan), 80 baris uang di antrean")
    t0 = time.monotonic()
    h = worker(["-serentak", "4"])
    dt = time.monotonic() - t0
    harap((h["diklaim"], h["terkirim"]), (80, 80), "80 baris terkirim")
    laju = 80 / dt
    harap(12.0 <= laju <= 13.4, True, f"kapasitas diukur {laju:.2f} per detik, harus antara 12 dan 13,4")
    catat("kapasitas diukur: antara 12 dan 13,33 per detik (batas atas c ÷ t = 4 ÷ 0,3 = 13,33; selisihnya waktu klaim dan tandai per putaran)")

    bagian("B. Pengumuman promo ke semua 10.000 karyawan (enam HR, enam kota), lalu satu top-up dan satu pembayaran sesudahnya")
    kosongkan_outbox()
    d.push_mode("lambat", ms=300)
    mulai_t = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
    selesai_t = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
    jumlah = 0
    for k, token in zip(kota, hr):
        s, isi = curl("POST", "/promo", {"judul": "Promo makan siang", "potongan_persen": 10, "mulai": mulai_t, "selesai": selesai_t,
                                         "umumkan": True}, token, tampil=False)
        harap(s, 201, f"promo {k}")
        jumlah += j(isi)["diumumkan"]
    harap(jumlah, 10000, "promo ke 10.000 karyawan")
    catat("$ curl -X POST '/promo' -d '{\"judul\": \"Promo makan siang\", \"potongan_persen\": 10, ..., \"umumkan\": true}'   # satu kali per HR, enam kota")
    catat("jumlah pemberitahuan promo yang ditulis: 10000")
    sql("SELECT k.nama AS kota, count(*) AS promo FROM outbox o JOIN akun a ON a.id = o.akun_id JOIN kota k ON k.id = a.kota_id"
        " WHERE o.kelas = 2 GROUP BY k.id, k.nama ORDER BY k.id")
    csv = "nomor_karyawan,nominal\nK10001,250000\nK10002,250000\nK10003,250000\n"
    s, _ = curl("POST", "/topup?keterangan=Tunjangan%20makan", csv, admin, "text/csv", tampil=False)
    harap(s, 200, "top-up 3 akun")
    bayar(budi, nominal=25000, catatan="nasi goreng dua porsi")
    sql("SELECT kelas, jenis, status, count(*) AS baris FROM outbox GROUP BY kelas, jenis, status ORDER BY kelas")
    harap(sql("SELECT kelas, count(*) FROM outbox GROUP BY kelas ORDER BY kelas", tampil=False), [(0, 1), (1, 3), (2, 10000)], "isi antrean")
    catat("# Nomor outbox: 10.000 promo lebih dulu (1 sampai 10000), tiga top-up (10001 sampai 10003), satu pembayaran uang (10004)")

    bagian("C. M27 tanpa kelas (mode rentan urut-waktu): satu worker selama 30 detik, notifikasi uang menunggu di belakang semua promo")
    d.push_reset()
    d.push_mode("lambat", ms=300)
    catat("$ ./api-t3 -peran worker -rentan urut-waktu   # berputar terus; dihentikan sesudah 30 detik")
    t0 = time.monotonic()
    mulai_worker("urut-waktu", ["-rentan", "urut-waktu"])
    time.sleep(30)
    d.stop("urut-waktu")
    dt = time.monotonic() - t0
    n = satu("SELECT count(*) FROM outbox WHERE status = 'terkirim'")
    harap(d.push_diterima()["jumlah"], n, "jumlah terkirim sama dengan permintaan di push")
    harap(340 <= n <= 420, True, f"terkirim dalam 30 detik: {n}, harus antara 3,4% dan 4,2% dari 10.000")
    harap(12.0 <= n / dt <= 13.4, True, f"laju {n / dt:.2f} per detik")
    catat("terkirim dalam 30 detik: antara 3,4% dan 4,2% dari 10.000 (naskah: 400 = 4%, dari 13,33 × 30)")
    harap(sql("SELECT kelas, status, count(*) > 0 FROM outbox WHERE kelas < 2 GROUP BY kelas, status ORDER BY kelas", tampil=False),
          [(0, "menunggu", True), (1, "menunggu", True)], "uang dan top-up masih menunggu")
    sql("SELECT kelas, jenis, status FROM outbox WHERE kelas < 2 GROUP BY kelas, jenis, status ORDER BY kelas")
    harap(satu("SELECT extract(epoch FROM now() - dibuat) >= 30 FROM outbox WHERE kelas = 0"), True, "umur notifikasi uang")
    catat("umur notifikasi uang yang menunggu: lebih dari 30 detik (sama dengan lamanya worker berjalan: ia baru dikerjakan sesudah semua promo)")
    sisa = satu("SELECT count(*) FROM outbox WHERE kelas = 2 AND status = 'menunggu'")
    harap(sisa >= 9600, True, "sisa promo")
    catat("promo yang masih di depannya: lebih dari 9.600; seluruh 10.000 promo butuh 10.000 ÷ 13,33 = 750 detik (12,5 menit), dihitung")
    catat("# Supaya 95% (9.500) terkirim dalam 30 detik dibutuhkan 9.500 ÷ 30 = ±317 per detik, sekitar 24 kali kapasitas ini: dihitung (Asumsi), tidak dijalankan")

    bagian("D. Dengan kelas (bawaan): pembayaran uang lebih dulu, lalu top-up, lalu promo, dari antrean yang sama")
    d.push_reset()
    d.push_mode("jawab")
    for k in range(1, 6):
        worker(["-serentak", "1", "-satu-putaran"], tampil=False)
    daftar = d.push_diterima(True)["daftar"]
    token = [x["token"] for x in daftar]
    harap(token[:4], ["tiruan-418", "tiruan-10001", "tiruan-10002", "tiruan-10003"], "uang, lalu top-up")
    kelas5 = satu(f"SELECT kelas FROM outbox WHERE notifikasi_id = '{daftar[4]['notifikasi_id']}'")
    harap(kelas5, 2, "kelima: promo")
    catat("$ ./api-t3 -peran worker -sekali -serentak 1 -satu-putaran   # lima kali, satu pesan tiap panggilan")
    catat("urutan di layanan push: " + " -> ".join(token[:4]) + " -> (promo, kelas 2)")
    catat("# Pembayaran uang (kelas 0, nomor 10004) dikirim pertama walau 10.000 promo punya nomor lebih kecil")

    bagian("E. Promo membanjiri antrean: notifikasi uang yang tiba di tengah banjir menunggu paling lama satu putaran")
    d.push_reset()
    d.push_mode("lambat", ms=300)
    catat("# Worker dengan kelas berjalan terus; 1,5 detik kemudian Budi membayar warung Ani")
    mulai_worker("kelas", [])
    time.sleep(1.5)
    jurnal = bayar(budi, nominal=25000)
    t1 = time.monotonic()
    d.tunggu(lambda: satu(f"SELECT status FROM outbox WHERE jurnal_id = {jurnal}") == "terkirim", "notifikasi uang terkirim", batas=5)
    tunda = time.monotonic() - t1
    harap(tunda < 1.5, True, f"notifikasi uang tertunda {tunda:.2f} detik di tengah banjir promo")
    catat("notifikasi uang tiba di tengah banjir promo: terkirim dalam kurang dari 1,5 detik (menunggu putaran yang sedang jalan, 0,3 detik, ditambah satu putaran sendiri)")
    time.sleep(2.0)
    d.stop("kelas")
    umur_semua = satu("SELECT extract(epoch FROM now() - min(dibuat)) FROM outbox WHERE status = 'menunggu'")
    umur_uang = satu("SELECT coalesce(extract(epoch FROM now() - min(dibuat)), 0) FROM outbox WHERE status = 'menunggu' AND kelas = 0")
    harap((float(umur_semua) > 30, float(umur_uang) == 0), (True, True), "umur tertua semua kelas lawan kelas uang")
    catat("=> SELECT max(umur) FROM outbox WHERE status = 'menunggu'   # semua kelas")
    catat("umur tertua semua kelas: lebih dari 30 detik (promo menumpuk): alert umur tertua dari semua kelas akan berbunyi")
    catat("=> SELECT max(umur) FROM outbox WHERE status = 'menunggu' AND kelas = 0   # hanya uang")
    catat("umur tertua kelas uang: 0 (tidak ada yang menunggu)")
    catat("# Alert umur tertua yang dihitung dari semua kelas berbunyi walau uang tepat waktu: alert uang dihitung per kelas (GET /lab/outbox api-t3 melaporkan semua kelas)")

    bagian("F. Laju promo paling banyak 5 per detik (ADR 32): promo dijadwalkan lewat coba_lagi, 5 baris per detik")
    d.push_reset()
    catat("# Lab menjadwalkan sisa promo dengan UPDATE (api-t3 UmumkanPromo menulis semua baris sekaligus; penjadwalan ini ditulis lab)")
    catat("=> UPDATE outbox SET coba_lagi = now() + (n / 5.0) * interval '1 second' ...   # baris ke-n yang masih menunggu, n mulai 0")
    d.push_mode("lambat", ms=300)
    sebelum = satu("SELECT count(*) FROM outbox WHERE kelas = 2 AND status = 'terkirim'")
    t0 = time.monotonic()
    sql("UPDATE outbox o SET coba_lagi = now() + (p.n / 5.0) * interval '1 second'"
        " FROM (SELECT id, row_number() OVER (ORDER BY id) - 1 AS n FROM outbox WHERE kelas = 2 AND status = 'menunggu') p WHERE o.id = p.id",
        tampil=False)
    mulai_worker("kelas", [])
    time.sleep(3.0)
    jurnal = bayar(budi, nominal=25000)
    t1 = time.monotonic()
    d.tunggu(lambda: satu(f"SELECT status FROM outbox WHERE jurnal_id = {jurnal}") == "terkirim", "notifikasi uang terkirim", batas=5)
    tunda = time.monotonic() - t1
    harap(tunda < 1.5, True, f"notifikasi uang tertunda {tunda:.2f} detik")
    time.sleep(max(0.0, 8.0 - (time.monotonic() - t0)))
    d.stop("kelas")
    dt = time.monotonic() - t0
    terkirim = satu("SELECT count(*) FROM outbox WHERE kelas = 2 AND status = 'terkirim'") - sebelum
    laju = terkirim / dt
    harap(4.0 <= laju <= 5.6, True, f"laju promo {laju:.2f} per detik")
    catat("laju promo terukur dalam 8 detik: antara 4 dan 5,6 per detik (batas 5), tanpa menghabiskan kapasitas 13,33")
    catat("notifikasi uang yang tiba pada detik ke-3: terkirim dalam kurang dari 1,5 detik")
    catat("# 10.000 promo pada 5 per detik butuh 2.000 detik (33 menit), dihitung; sisa kapasitas 13,33 − 5 = 8,33 per detik, 9,6 kali puncak 0,87 (Asumsi naskah)")
    tulis("queue.txt", "queue promo: kapasitas worker, tanpa kelas lawan dengan kelas, laju promo (M27, ADR 32)")


# ---------- listen.txt (g) ----------

def rekam_listen():
    siapkan()
    mulai_semua(tampil="$ ./api-t3 -lab")

    def sisipkan(c, akun=419, judul="uji"):
        return c.execute("INSERT INTO outbox (akun_id, kelas, jenis, payload) VALUES (%s, 2, 'promo', %s::jsonb) RETURNING id",
                         (akun, '{"judul": "' + judul + '"}')).fetchone()[0]

    def terima(listener, tunggu=0.6):
        return [n.payload for n in listener.notifies(timeout=tunggu)]

    bagian("A. LISTEN/NOTIFY: pesan baru hanya terkirim sesudah COMMIT, dan tidak terkirim bila ROLLBACK")
    listener = sambung()
    pid = listener.execute("SELECT pg_backend_pid()").fetchone()[0]
    listener.execute("LISTEN outbox_baru")
    catat("=> [listener] LISTEN outbox_baru")
    w = sambung(autocommit=False)
    nomor = sisipkan(w)
    w.execute("SELECT pg_notify('outbox_baru', %s)", (str(nomor),))
    catat("=> [penulis] BEGIN; INSERT INTO outbox ...; SELECT pg_notify('outbox_baru', <nomor>);   # belum COMMIT")
    harap(terima(listener), [], "belum COMMIT, belum ada notifikasi")
    catat("listener menerima: tidak ada (notifikasi menunggu COMMIT)")
    w.commit()
    catat("=> [penulis] COMMIT")
    harap(terima(listener), [str(nomor)], "sesudah COMMIT")
    catat("listener menerima: nomor baris yang baru (1 notifikasi)")
    nomor2 = sisipkan(w)
    w.execute("SELECT pg_notify('outbox_baru', %s)", (str(nomor2),))
    w.rollback()
    catat("=> [penulis] BEGIN; INSERT INTO outbox ...; pg_notify(...); ROLLBACK")
    harap(terima(listener), [], "rollback")
    catat("listener menerima: tidak ada (ROLLBACK membuang notifikasi bersama barisnya)")
    catat("# Nomor 2 sudah terpakai oleh baris yang di-ROLLBACK: nomor berikutnya 3, ada celah (R3-04: nomor urut bukan nomor tanpa celah)")

    bagian("B. Listener putus: notifikasi yang dikirim selagi ia tidak terhubung tidak pernah sampai, barisnya tetap di tabel")
    harap(satu("SELECT pg_terminate_backend(%d)" % pid), True, "listener diputus")
    catat("=> SELECT pg_terminate_backend(<pid listener>)   # koneksi listener diputus (jaringan putus, database restart, atau pool membuangnya)")
    catat("listener: terputus")
    time.sleep(0.2)
    nomor3 = sisipkan(w)
    w.execute("SELECT pg_notify('outbox_baru', %s)", (str(nomor3),))
    w.commit()
    catat("=> [penulis] BEGIN; INSERT INTO outbox ...; pg_notify(...); COMMIT   # listener sedang putus")
    listener2 = sambung()
    listener2.execute("LISTEN outbox_baru")
    catat("=> [listener, sambungan baru] LISTEN outbox_baru")
    harap(terima(listener2), [], "notifikasi selama putus hilang")
    catat("listener menerima: tidak ada (notifikasi yang dikirim selagi putus tidak diulang)")
    sql("SELECT id, status FROM outbox WHERE id = %d" % nomor3)
    harap(satu(f"SELECT status FROM outbox WHERE id = {nomor3}"), "menunggu", "baris tetap menunggu")
    catat("# NOTIFY hanya membangunkan; sumbernya tetap tabel. Worker yang polling menemukan baris itu:")
    h = worker(["-serentak", "10"])
    harap(h["diklaim"] >= 1, True, "polling menemukan baris")
    harap(satu(f"SELECT status FROM outbox WHERE id = {nomor3}"), "terkirim", "baris terkirim lewat polling")
    sql("SELECT id, status FROM outbox WHERE id = %d" % nomor3)
    listener2.close()
    w.close()
    catat("# Pelajaran R3-05: dokumentasi PostgreSQL 17 tidak menyebut nasib listener yang putus; lab ini merekamnya: notifikasi hilang, baris tidak")

    bagian("C. Retensi 7 hari: baris selesai yang lebih tua dibuang, baris yang menunggu dan yang mati tidak disentuh")
    sql("TRUNCATE outbox RESTART IDENTITY", tampil=False)
    for status, hari in (("terkirim", 8), ("terkirim", 6), ("dilewati", 8), ("menunggu", 8), ("mati", 8)):
        sql(f"INSERT INTO outbox (akun_id, kelas, jenis, payload, status, dibuat) VALUES (419, 2, 'promo', '{{}}', '{status}', now() - interval '{hari} days')",
            tampil=False)
    catat("# Lima baris: terkirim 8 hari, terkirim 6 hari, dilewati 8 hari, menunggu 8 hari, mati 8 hari")
    sql("SELECT id, status, extract(day FROM now() - dibuat)::int AS umur_hari FROM outbox ORDER BY id")
    r = subprocess.run([str(d.BIN), "-bersih"], env=dict(d.ENV, DATABASE_URL=DB), capture_output=True, text=True)
    harap(r.returncode, 0, "exit bersih")
    catat("$ ./api-t3 -bersih")
    catat(r.stdout.strip())
    sql("SELECT id, status, extract(day FROM now() - dibuat)::int AS umur_hari FROM outbox ORDER BY id")
    harap(sql("SELECT id FROM outbox ORDER BY id", tampil=False), [(2,), (4,), (5,)], "sisa setelah bersih")
    catat("# Yang dibuang: yang selesai (terkirim atau dilewati) dan lebih tua dari 7 hari. Dead-letter dibaca manusia dulu; yang menunggu masih harus dikirim.")
    tulis("listen.txt", "LISTEN/NOTIFY hanya sebagai pembangun worker, dan retensi 7 hari")


BAGIAN = {"transaksi": rekam_transaksi, "kursor": rekam_kursor, "klaim": rekam_klaim, "ganda": rekam_ganda, "retry": rekam_retry,
          "queue": rekam_queue, "listen": rekam_listen}


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
        for port in list(d.server):   # error Python di tengah rekaman: server dan worker tidak tertinggal
            d.stop(port)


if __name__ == "__main__":
    main()
