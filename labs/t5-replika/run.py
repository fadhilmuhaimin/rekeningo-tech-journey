"""Rekam lab t5-replika (Tahap 5): replica streaming, baca sesudah tulis, replica sinkron, dan promosi.

Satu primary, satu standby asinkron untuk laporan (`replika`), dan satu standby sinkron untuk ledger (`sinkron`),
PostgreSQL 17.11 di tiga container lokal (docker-compose.yml). Isinya schema ledger `api-t5` (enam schema service,
data awal lab): pembuatan schema, data awal, server Go, dan generator beban adalah milik `labs/api-t5`
(`dasar_t5.py`), bukan salinan. Yang baru di sini: topologi replikasi, rekaman untuk M41 dan M42, dan rute baca
sesudah tulis di server (`internal/service/replika.go`, kepala X-Lsn-Tulis dan X-Dibaca-Dari, mode rentan
riwayat-replika). Setiap bagian membuat ulang kluster dari nol (container, schema, data awal), jadi output/*.txt tidak
bergantung pada urutan bagian dan rekaman ulang identik per byte (make cek). Posisi WAL, token, waktu, dan lama
menunggu tidak direkam sebagai nilai: yang direkam hitungan baris, status, urutan, dan batas yang diperiksa. Jeda
buatan (`pg_wal_replay_pause`) hanya untuk memperagakan dan ditulis begitu di rekaman. Lab gagal keras bila hasilnya
meleset dari yang diharapkan.

    make -C labs/t5-replika run                   (butuh: Docker, Go)
    make -C labs/t5-replika run BAGIAN=baca       (satu bagian: replika jeda baca sinkron promosi konflik)
"""
import json, pathlib, re, statistics, subprocess, sys, threading, time

import psycopg

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "api-t5"))
import dasar_t5 as d  # noqa: E402
from dasar_t5 import bagian, catat, curl, gagal, harap, j, login  # noqa: E402
from lab_env import PROYEK, REPLIKA_PRIMARY_PORT, REPLIKA_REPLICA_PORT, REPLIKA_SINKRON_PORT  # noqa: E402

LAB = "t5-replika"
# Proyek compose sendiri, bukan COMPOSE_PROJECT_NAME lajur: proyek lajur juga memegang PostgreSQL dan Redis bersama (make lab-up),
# dan `down --remove-orphans` di proyek yang sama menghapus keduanya (container yang tidak ada di compose lab ini dianggap orphan).
NAMA_PROYEK = f"{PROYEK}-{LAB}" if PROYEK else LAB
d.pakai_database(REPLIKA_PRIMARY_PORT)   # semua sambungan dasar_t5 menuju primary lab ini
d.OUT = HERE / "output"
SP = ",".join(d.SCHEMA_LAYANAN)           # search_path pemilik schema sesudah dipecah
PORT_NODE = {"primary": REPLIKA_PRIMARY_PORT, "replika": REPLIKA_REPLICA_PORT, "sinkron": REPLIKA_SINKRON_PORT}
VERSI = {}
LSN = {}                                  # token LSN -> nomor menurut kemunculan pertama (disamarkan di rekaman)
BATAS_JEDA_DETIK = 1.0                    # batas lab jeda replay alami di bawah beban (Asumsi lab, bukan nilai ukur)
BATAS_JEDA_BYTE = 16 * 1024 * 1024        # satu segmen WAL
SINKRON_SATU = "FIRST 1 (replika_sinkron)"


# ---------- dasar ----------

def ulang_samaran():
    d.samaran.clear()
    d._urut_uuid[0] = 0
    d._urut_order[0] = 0
    LSN.clear()


def daftar_lsn(kepala, _isi):
    """Dipanggil curl sebelum jawaban dicetak: token LSN di kepala jawaban disamarkan."""
    m = re.search(r"^X-Lsn-Tulis: (\S+)", kepala, re.M)
    if m and m.group(1) not in LSN:
        LSN[m.group(1)] = len(LSN) + 1
        d.samaran[m.group(1)] = f"<LSN tulis {LSN[m.group(1)]}>"


def kompose(*args):
    r = subprocess.run(["docker", "compose", "-p", NAMA_PROYEK, *args], cwd=HERE, capture_output=True, text=True)
    if r.returncode != 0:
        gagal(f"docker compose {' '.join(args)}: {r.stderr[-500:]}")
    return r


def konek(node, autocommit=True, app="t5-replika-lab"):
    """Sambungan sebagai pemilik schema (superuser lab) ke satu node; search_path enam schema service."""
    c = psycopg.connect(host="127.0.0.1", port=PORT_NODE[node], user="lab", password="lab", dbname="lab",
                        autocommit=autocommit, application_name=app, options=f"-csearch_path={SP}")
    c.prepare_threshold = None
    return c


def tanya(node, q, arg=None, tampil=True, c=None):
    """Satu perintah di node itu; keluaran seperti psql dengan prompt node. Mengembalikan baris."""
    tutup = c is None
    c = c or konek(node)
    try:
        cur = c.execute(q, arg)
        kolom = [x.name for x in cur.description] if cur.description else None
        isi = cur.fetchall() if kolom else []
        if tampil:
            teks = (q if arg is None else q % tuple(repr(a) for a in arg)).strip().replace("\n", "\n   ")
            catat(d.samarkan(f"{node}=> {teks}"))
            for b in (d.tabel(kolom, isi) if kolom else [cur.statusmessage]):
                catat(d.samarkan(b))
        return isi
    finally:
        if tutup:
            c.close()


def satu(node, q, arg=None):
    return tanya(node, q, arg, tampil=False)[0][0]


def tolak(node, q, sqlstate, c=None):
    """Perintah yang harus ditolak PostgreSQL dengan SQLSTATE itu; mencatat pesan dan kode."""
    tutup = c is None
    c = c or konek(node)
    catat(f"{node}=> {q}")
    try:
        c.execute(q)
    except psycopg.Error as e:
        catat(f"ERROR:  {e.diag.message_primary}")
        catat(f"SQLSTATE {e.sqlstate}")
        harap(e.sqlstate, sqlstate, f"{node}: {q}")
        return
    finally:
        if tutup:
            c.close()
    gagal(f"{node}: {q} harus ditolak, tetapi berhasil")


def pg_jeda(node, jeda=True):
    """Jeda buatan: tahan atau lanjutkan pemutaran ulang WAL di satu standby (hanya untuk memperagakan)."""
    with konek(node) as c:
        c.execute("SELECT pg_wal_replay_pause()" if jeda else "SELECT pg_wal_replay_resume()")
    d.tunggu(lambda: satu(node, "SELECT pg_get_wal_replay_pause_state()") == ("paused" if jeda else "not paused"),
             f"{node} {'ditahan' if jeda else 'dilanjutkan'}", 15, 0.05)


def posisi_tulis():
    return satu("primary", "SELECT pg_current_wal_lsn()::text")


def menyusul(*nodes, lsn=None, batas=60):
    """Menunggu (hitungan kejadian, bukan jeda tetap) sampai standby memutar ulang WAL sampai posisi tulis primary."""
    lsn = lsn or posisi_tulis()
    for n in nodes or ("replika", "sinkron"):
        d.tunggu(lambda n=n: satu(n, "SELECT pg_last_wal_replay_lsn() >= %s::pg_lsn", (lsn,)), f"{n} menyusul", batas, 0.05)


def hitung_bayar(node):
    return satu(node, "SELECT count(*) FROM t5_ledger.jurnal WHERE jenis = 'bayar'")


def tunggu_primary(batas=60):
    def siap():
        try:
            konek("primary").close()
            return True
        except psycopg.OperationalError:
            return False
    d.tunggu(siap, "primary menerima sambungan TCP", batas, 0.5)


def standby_streaming(app):
    return satu("primary", "SELECT count(*) FROM pg_stat_replication WHERE application_name = %s AND state = 'streaming'", (app,)) == 1


def bangun_klaster(standby=True):
    """Container bersih -> schema api-t5 (30 tabel, enam schema service) -> data awal -> standby dari pg_basebackup."""
    ulang_samaran()
    for port in list(d.server):
        d.stop(port)
    kompose("down", "-v", "--remove-orphans")
    kompose("up", "-d", "--wait", "primary")
    tunggu_primary()
    d.LAYANAN["aktif"] = False
    d.buat_schema()
    d.seed()
    d.pecah_layanan()
    VERSI["pg"] = satu("primary", "SHOW server_version")
    if standby:
        # Satu per satu: dua pg_basebackup bersamaan membuat checkpoint cepat yang saling mendaur ulang WAL.
        for nama, app in (("replika", "replika_laporan"), ("sinkron", "replika_sinkron")):
            kompose("up", "-d", nama)
            d.tunggu(lambda app=app: standby_streaming(app), f"{app} streaming", 90, 0.5)
        menyusul()


def versi_go():
    r = subprocess.run(["go", "version"], cwd=d.HERE, capture_output=True, text=True).stdout.split()
    return r[2] if len(r) > 2 else "go?"


def tulis(nama, judul):
    """Seperti dasar_t5.tulis, tetapi kepala menyebut tiga node. Tidak memuat nomor keputusan atau ID riset."""
    for port in list(d.server):
        d.stop(port)
    kepala = [f"# Lab {LAB} · {judul}",
              f"# PostgreSQL {VERSI['pg']} · {versi_go()} · pgx {d.PGX} · schema t5_ledger, t5_akun, t5_pembayaran, t5_merchant, "
              f"t5_notifikasi, t5_cicilan · primary, replika asinkron, dan standby sinkron di container lokal · server Go di 127.0.0.1:{d.DASAR}",
              f"# Rekaman dari database bersih: make -C labs/{LAB} run."]
    d.OUT.mkdir(exist_ok=True)
    (d.OUT / nama).write_text("\n".join(l.rstrip() for l in "\n".join(kepala + d.log).split("\n")) + "\n")
    print("ditulis:", f"labs/{LAB}/output/{nama}")
    d.log.clear()


def mulai_server(rentan=None, tampil=None):
    """api-t5 melawan primary, dengan standby `replika` sebagai replica untuk bacaan tampilan."""
    d.stop(d.PORT)
    args = ["-lab", "-push-url", f"http://127.0.0.1:{d.PORT_PUSH}", *d.args_t5()]
    if rentan:
        args += ["-rentan", rentan]
    d.mulai(d.BIN, d.PORT, args, env_lain={"REPLIKA_DATABASE_URL": d.db_role(d.ROLE_APP, port=REPLIKA_REPLICA_PORT)},
            tampil=tampil)


def bayar(token, ke, nominal, tampil=True, maks=None):
    """POST /transfers dengan keluaran curl di rekaman (token LSN disamarkan). Mengembalikan (status, badan)."""
    return curl("POST", "/transfers", {"ke": ke, "nominal": nominal}, token=token, tampil=tampil, daftarkan=daftar_lsn, maks=maks)


def bayar_diam(token_sesi, ke, nominal, maks=None):
    """Bayar tanpa mencetak: (status, id jurnal atau None). Status 0 bila client tidak menerima jawaban."""
    s, isi = curl("POST", "/transfers", {"ke": ke, "nominal": nominal}, token=token_sesi, tampil=False, maks=maks)
    return s, (j(isi)["id"] if s == 201 else None)


def putus(role, app):
    """Memutus koneksi WAL satu standby di sisi primary: role replikasinya tidak boleh masuk, lalu walsender-nya dihentikan."""
    tanya("primary", f"ALTER ROLE {role} NOLOGIN")
    tanya("primary", "SELECT pg_terminate_backend(pid) FROM pg_stat_replication WHERE application_name = %s", (app,))
    d.tunggu(lambda: satu("primary", "SELECT count(*) FROM pg_stat_replication WHERE application_name = %s", (app,)) == 0,
             f"{app} terputus", 30, 0.05)


def atur_sinkron(nilai):
    """synchronous_standby_names di primary lewat ALTER SYSTEM dan muat ulang konfigurasi."""
    tanya("primary", f"ALTER SYSTEM SET synchronous_standby_names = '{nilai}'")
    tanya("primary", "SELECT pg_reload_conf()")
    d.tunggu(lambda: satu("primary", "SHOW synchronous_standby_names") == nilai, "synchronous_standby_names berubah", 15, 0.05)


def pantau_sinkron(app="replika_sinkron", sync=True):
    d.tunggu(lambda: satu("primary", "SELECT count(*) FROM pg_stat_replication WHERE application_name = %s AND sync_state = %s",
                          (app, "sync" if sync else "async")) == 1, f"{app} {'sinkron' if sync else 'asinkron'}", 30, 0.05)


# ---------- replika.txt ----------

def rekam_replika():
    bangun_klaster()
    bagian("A. Topologi: satu primary dan dua standby, dibaca dari katalog PostgreSQL")
    catat("# Dua standby dibuat dari pg_basebackup atas primary yang sudah berisi schema api-t5 (30 tabel, enam schema service).")
    for n in ("primary", "replika", "sinkron"):
        tanya(n, "SELECT pg_is_in_recovery() AS standby")
    harap([satu(n, "SELECT pg_is_in_recovery()") for n in PORT_NODE], [False, True, True], "pg_is_in_recovery")
    rows = tanya("primary", "SELECT application_name, state, sync_state FROM pg_stat_replication ORDER BY application_name")
    harap(rows, [("replika_laporan", "streaming", "async"), ("replika_sinkron", "streaming", "async")], "pg_stat_replication")
    rows = tanya("primary", "SELECT slot_name, slot_type, active FROM pg_replication_slots ORDER BY slot_name")
    harap(rows, [("slot_laporan", "physical", True), ("slot_sinkron", "physical", True)], "slot replikasi")
    tanya("replika", "SELECT status FROM pg_stat_wal_receiver")
    tanya("primary", "SHOW synchronous_standby_names")
    catat("# synchronous_standby_names kosong: kedua standby asinkron, jadi COMMIT di primary tidak menunggu standby mana pun.")
    jumlah = ("SELECT (SELECT count(*) FROM t5_ledger.jurnal) AS jurnal, (SELECT count(*) FROM t5_ledger.posting) AS posting, "
              "(SELECT count(*) FROM t5_ledger.buku) AS buku")
    hasil = [tanya(n, jumlah) for n in ("primary", "replika", "sinkron")]
    harap(hasil[0] == hasil[1] == hasil[2], True, "isi ledger sama di tiga node")
    catat("# Isi ledger sama di tiga node: baris jurnal, posting, dan buku dihitung di masing-masing.")
    harap(len(tanya("replika", "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 't5\\_%' ORDER BY 1")), 6,
          "enam schema service di replika")

    bagian("B. Standby menolak DML dan DDL")
    catat("# Pernyataan yang mengubah data, skema, atau mengunci baris ditolak dengan kode 25006 di standby. Pesan galatnya milik mode")
    catat("# baca-saja standby, bukan milik trigger append-only ledger.")
    ringkas = ("SELECT (SELECT count(*) FROM t5_ledger.jurnal) + (SELECT count(*) FROM t5_ledger.posting) "
               "+ (SELECT sum(saldo_cache) FROM t5_ledger.buku)")
    sebelum = [satu(n, ringkas) for n in PORT_NODE]
    for n in ("replika", "sinkron"):
        with konek(n) as c:
            tolak(n, "UPDATE t5_ledger.buku SET saldo_cache = saldo_cache + 1 WHERE id = 10", "25006", c)
    with konek("replika") as c:
        for q in ("INSERT INTO t5_ledger.buku (akun_id, jenis, saldo_cache) VALUES (419, 'tabungan', 0)",
                  "DELETE FROM t5_ledger.posting WHERE id = 1",
                  "TRUNCATE t5_ledger.posting",
                  "CREATE TABLE t5_ledger.catatan_tangan (id int)",
                  "CREATE INDEX ON t5_ledger.buku (akun_id, saldo_cache)",
                  "ALTER TABLE t5_ledger.buku ADD COLUMN catatan text",
                  "DROP TABLE t5_ledger.posting",
                  "SELECT id FROM t5_ledger.buku WHERE id = 10 FOR UPDATE"):
            tolak("replika", q, "25006", c)
        tolak("replika", "SET TRANSACTION READ WRITE", "0A000", c)
    with konek("replika", autocommit=False) as c:
        c.execute("SELECT 1")
        tolak("replika", "PREPARE TRANSACTION 'uji'", "25006", c)
        c.rollback()
    sesudah = [satu(n, ringkas) for n in PORT_NODE]
    harap(sebelum, sesudah, "data berubah sesudah semua penolakan")
    catat("# Sesudah semua penolakan, jumlah baris jurnal dan posting ditambah total saldo di tiga node sama dengan sebelumnya: ya")
    tulis("replika.txt", "replica streaming nyata: topologi dan penolakan DML dan DDL")


# ---------- jeda.txt ----------

def muat_beban(rps, detik):
    biner = d.HERE / "beban"
    subprocess.run(["go", "build", "-o", str(biner), "./cmd/beban"], cwd=d.HERE, check=True)
    cmd = [str(biner), "-url", f"http://127.0.0.1:{d.PORT}", "-db", d.db_pemilik(SP, "beban"), "-aplikasi", d.APP_NAMA,
           "-rps", str(rps), "-detik", str(detik), "-pengguna", "200", "-hanya-bayar"]
    r = subprocess.run(cmd, capture_output=True, text=True, env=d.ENV, timeout=600)
    if r.returncode not in (0, 1):
        gagal("generator beban: " + r.stderr[-400:])
    return json.loads(r.stdout)


def rekam_jeda():
    bangun_klaster()
    mulai_server()
    bagian("A. Jeda alami di bawah beban: 100 pembayaran per detik selama 10 detik")
    catat("# Jeda replay diukur di primary dari pg_stat_replication tiap 20 ms selama beban. Lab memeriksa batas, bukan nilai:")
    catat(f"# {BATAS_JEDA_DETIK:g} detik (replay_lag) dan satu segmen WAL (16 MiB, selisih byte). Laptop dan container lokal; bukan jeda produksi.")
    awal = hitung_bayar("primary")
    sampel, berhenti = [], []

    def pantau():
        c = konek("primary", app="t5-replika-pantau")
        while not berhenti:
            sampel.append(c.execute("SELECT application_name, pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn), "
                                    "extract(epoch FROM replay_lag) FROM pg_stat_replication").fetchall())
            time.sleep(0.02)
        c.close()
    t = threading.Thread(target=pantau, daemon=True)
    t.start()
    try:
        m = muat_beban(100, 10)
    finally:
        berhenti.append(1)
        t.join()
    harap((m["bayar_selesai"], set(m["bayar_status"])), (1000, {"201"}), "pembayaran saat beban")
    catat("$ ./beban -rps 100 -detik 10 -pengguna 200 -hanya-bayar   # pembayaran lewat api-t5 ke primary")
    catat("pembayaran selesai: 1000 dari 1000, semua 201")
    jeda_maks = max((float(x[2]) for s in sampel for x in s if x[2] is not None), default=0.0)
    byte_maks = max((float(x[1]) for s in sampel for x in s if x[1] is not None), default=0.0)
    harap(len(sampel) >= 100, True, f"sampel jeda terlalu sedikit: {len(sampel)}")
    harap(jeda_maks < BATAS_JEDA_DETIK, True, f"jeda replay alami {jeda_maks} detik")
    harap(byte_maks < BATAS_JEDA_BYTE, True, f"jeda byte alami {byte_maks}")
    print("jeda alami (nilai mentah, tidak direkam):", {"sampel": len(sampel), "replay_lag_maks_s": round(jeda_maks, 4), "byte_maks": int(byte_maks)}, file=sys.stderr)
    catat("sampel jeda di primary: paling sedikit 100 (jumlah tidak direkam): ya")
    catat(f"replay_lag tertinggi di kedua standby di bawah {BATAS_JEDA_DETIK:g} detik (batas lab; nilai tidak direkam): ya")
    catat("jeda byte WAL tertinggi di kedua standby di bawah 16 MiB (batas lab; nilai tidak direkam): ya")
    menyusul()
    harap([hitung_bayar(n) - awal for n in PORT_NODE], [1000, 1000, 1000], "jurnal bayar baru di tiga node")
    for n in PORT_NODE:
        tanya(n, "SELECT count(*) AS jurnal_bayar FROM t5_ledger.jurnal WHERE jenis = 'bayar'")
    catat("# Sesudah beban berhenti kedua standby menyusul, dan ketiga node memuat 1.000 jurnal bayar baru: ya")
    catat("# Pada beban ini jeda alami di bawah 1 detik. Jeda ±2 detik di cerita M41 tidak terjadi dengan sendirinya di laptop lab, jadi bagian B menahannya dengan sengaja.")

    bagian("B. Jeda buatan: pemutaran ulang WAL di replika ditahan (hanya untuk memperagakan, bukan jeda alami)")
    d.stop(d.PORT)
    catat("# pg_wal_replay_pause() menahan pemutaran ulang di replika. WAL tetap diterima, tetapi baris baru tidak terlihat sampai dilanjutkan.")
    tanya("replika", "SELECT pg_wal_replay_pause()")
    d.tunggu(lambda: satu("replika", "SELECT pg_get_wal_replay_pause_state()") == "paused", "replika ditahan", 15, 0.05)
    tanya("replika", "SELECT pg_get_wal_replay_pause_state()")
    mulai_server()
    t_budi = login("budi@lestari.example", label="Budi")
    nominal = (10000, 11000, 12000, 13000, 14000)
    hasil = [bayar_diam(t_budi, 505, n) for n in nominal]
    harap([h[0] for h in hasil], [201] * 5, "lima pembayaran saat replika ditahan")
    ids = [h[1] for h in hasil]
    catat("$ POST /transfers sebanyak lima kali ke Warung 505 (Rp10.000, Rp11.000, Rp12.000, Rp13.000, Rp14.000), semua 201")
    lsn = posisi_tulis()
    menyusul("sinkron", lsn=lsn)
    harap(len(set(ids)), 5, "id jurnal berbeda")
    tanya("primary", "SELECT count(*) AS jurnal_bayar FROM t5_ledger.jurnal WHERE jenis = 'bayar'")
    tanya("replika", "SELECT count(*) AS jurnal_bayar FROM t5_ledger.jurnal WHERE jenis = 'bayar'")
    harap(hitung_bayar("primary") - hitung_bayar("replika"), 5, "selisih jurnal primary dan replika ditahan")
    harap(satu("replika", "SELECT pg_last_wal_receive_lsn() >= %s::pg_lsn", (lsn,)), True, "replika sudah menerima WAL")
    harap(satu("replika", "SELECT pg_last_wal_replay_lsn() < %s::pg_lsn", (lsn,)), True, "replika belum memutar WAL")
    catat("# Replika sudah menerima WAL sampai posisi tulis terakhir, tetapi belum memutar ulangnya: ya (posisi dibandingkan di replika)")
    catat("# Selisih jurnal bayar primary lawan replika yang ditahan: 5")
    tanya("sinkron", "SELECT count(*) AS jurnal_bayar FROM t5_ledger.jurnal WHERE jenis = 'bayar'")
    harap(hitung_bayar("sinkron"), hitung_bayar("primary"), "standby lain tidak ikut tertahan")
    catat("# Standby sinkron tidak ditahan (di bagian ini ia asinkron: synchronous_standby_names kosong) dan memuat semua jurnal: jeda ini milik satu standby.")
    pg_jeda("replika", jeda=False)
    menyusul("replika")
    harap(hitung_bayar("replika"), hitung_bayar("primary"), "replika menyusul sesudah dilanjutkan")
    tanya("replika", "SELECT count(*) AS jurnal_bayar FROM t5_ledger.jurnal WHERE jenis = 'bayar'")
    catat("# pg_wal_replay_resume(): replika memutar semua WAL yang tertahan dan jumlahnya sama dengan primary lagi.")
    tulis("jeda.txt", "jeda replay alami di bawah beban dan jeda buatan")


# ---------- baca.txt ----------

def lihat(path, token_sesi, lsn=None, sumber=None):
    """GET dengan keluaran curl di rekaman. Mengembalikan (status, badan JSON, nilai X-Dibaca-Dari); bila sumber diberikan, harus sama."""
    asal = {}

    def baca_kepala(kepala, _isi):
        m = re.search(r"^X-Dibaca-Dari: (\S+)", kepala, re.M)
        asal["dari"] = m.group(1) if m else None
    s, isi = curl("GET", path, token=token_sesi, kepala=((f"X-Lsn-Tulis: {lsn}",) if lsn else ()), daftarkan=baca_kepala)
    if sumber is not None:
        harap(asal.get("dari"), sumber, f"sumber bacaan {path}")
    return s, j(isi), asal.get("dari")


def riwayat_baris(token_sesi, lsn=None, sumber=None):
    s, isi, _ = lihat("/akun/419/riwayat", token_sesi, lsn, sumber)
    harap(s, 200, "riwayat")
    return isi["riwayat"]


def rekam_baca():
    bangun_klaster()
    bagian("A. Versi pertama (mode rentan riwayat-replika): riwayat dan saldo tampil dibaca dari replika, token tidak diperiksa")
    catat("# Budi membayar Rp35.000 ke Warung 505. Replay di replika ditahan dengan sengaja (jeda buatan, bukan jeda alami) supaya")
    catat("# jarak antara COMMIT di primary dan terlihat di replika bisa dilihat satu per satu.")
    mulai_server("riwayat-replika", tampil="# server: ./api-t5 -lab -rentan riwayat-replika, replica = standby replika (REPLIKA_DATABASE_URL)")
    t_budi = login("budi@lestari.example", label="Budi")
    s, a, _ = lihat("/akun/419", t_budi, sumber="replika")
    harap((s, a["saldo"]), (200, 250000), "saldo awal Budi")
    harap(len(riwayat_baris(t_budi, sumber="replika")), 1, "riwayat awal Budi: satu baris (tunjangan)")
    pg_jeda("replika")
    catat("replika=> SELECT pg_wal_replay_pause()   # jeda buatan")
    s, isi = bayar(t_budi, 505, 35000)
    harap((s, j(isi)["saldo"]), (201, 215000), "bayar Rp35.000")
    token = next(iter(LSN))
    catat("# Jawaban bayar membawa X-Lsn-Tulis: posisi WAL primary sesudah COMMIT. App menyimpannya untuk bacaan berikutnya.")
    s, a, _ = lihat("/akun/419", t_budi, token, sumber="replika")
    harap((s, a["saldo"]), (200, 250000), "saldo tampil versi pertama")
    harap(len(riwayat_baris(t_budi, token, sumber="replika")), 1, "riwayat versi pertama belum memuat pembayaran")
    catat("# Jawaban bayar 201 memuat saldo Rp215.000, tetapi saldo tampil sesudahnya masih Rp250.000 dan riwayat masih satu baris.")
    catat("# Token dikirim, tetapi mode ini mengabaikannya.")
    tanya("primary", "SELECT saldo_cache FROM t5_ledger.buku WHERE akun_id = 419")
    tanya("replika", "SELECT saldo_cache FROM t5_ledger.buku WHERE akun_id = 419")
    catat("# Uang tidak ikut keliru: saldo tampil Rp250.000, tetapi kiriman Rp240.000 ke rekan ditolak karena saldo di primary Rp215.000.")
    catat("# Memakai kiriman, bukan pembayaran: satu pembayaran dibatasi Rp200.000 dan Rp240.000 ditolak oleh batas itu tanpa membaca saldo.")
    s, isi = curl("POST", "/kiriman", {"ke_nomor_karyawan": "K00504", "nominal": 240000}, token=t_budi)
    harap((s, j(isi).get("type")), (422, "/problems/saldo-kurang"), "kiriman melebihi saldo di primary")
    pg_jeda("replika", jeda=False)
    menyusul("replika")
    s, a, _ = lihat("/akun/419", t_budi, sumber="replika")
    harap((s, a["saldo"]), (200, 215000), "saldo tampil sesudah replika menyusul")
    harap(len(riwayat_baris(t_budi, sumber="replika")), 2, "riwayat sesudah replika menyusul")
    catat("# Sesudah replika menyusul, saldo tampil Rp215.000 dan riwayat dua baris: yang salah hanya yang dilihat user, dan hanya sementara.")

    bagian("B. Versi benar (tanpa mode rentan): token LSN dari jawaban tulis, replika dipakai hanya bila sudah sampai posisi itu")
    mulai_server(tampil="# server: ./api-t5 -lab, replica = standby replika (REPLIKA_DATABASE_URL)")
    t_budi = login("budi@lestari.example", label="Budi")
    pg_jeda("replika")
    catat("replika=> SELECT pg_wal_replay_pause()   # jeda buatan")
    s, isi = bayar(t_budi, 505, 12000)
    harap((s, j(isi)["saldo"]), (201, 203000), "bayar Rp12.000")
    token = list(LSN)[-1]
    catat("# Tanpa token (app tidak menyimpannya): bacaan tampilan dari replika, jadi sama lamanya dengan versi pertama.")
    s, a, _ = lihat("/akun/419", t_budi, sumber="replika")
    harap((s, a["saldo"]), (200, 215000), "tanpa token: saldo lama")
    catat("# Dengan token: replika belum memutar WAL sampai posisi itu, jadi server membaca primary.")
    s, a, _ = lihat("/akun/419", t_budi, token, sumber="primary")
    harap((s, a["saldo"]), (200, 203000), "dengan token: saldo baru dari primary")
    baris = riwayat_baris(t_budi, token, sumber="primary")
    harap((len(baris), baris[0]["nominal"], baris[0]["arah"]), (3, 12000, "keluar"), "riwayat dengan token memuat pembayaran terbaru")
    catat("# Token yang bukan posisi WAL dijawab 422.")
    s, _ = curl("GET", "/akun/419", token=t_budi, kepala=("X-Lsn-Tulis: bukan-posisi-wal",))
    harap(s, 422, "token salah")
    s, _ = curl("GET", "/akun/419/riwayat", token=t_budi, kepala=("X-Lsn-Tulis: 0/ZZ",))
    harap(s, 422, "token salah di riwayat")
    pg_jeda("replika", jeda=False)
    menyusul("replika")
    harap(satu("replika", "SELECT pg_last_wal_replay_lsn() >= %s::pg_lsn", (token,)), True, "replika sampai token")
    tanya("replika", "SELECT pg_last_wal_replay_lsn() >= %s::pg_lsn AS replika_sampai_posisi_tulis", (token,))
    catat("# Replika sudah memutar WAL sampai posisi tulis. Dengan token yang sama server kini membaca dari replika.")
    s, a, _ = lihat("/akun/419", t_budi, token, sumber="replika")
    harap((s, a["saldo"]), (200, 203000), "dengan token sesudah menyusul")
    harap(len(riwayat_baris(t_budi, token, sumber="replika")), 3, "riwayat sesudah menyusul")
    catat("# Biayanya: selama replika tertinggal, bacaan yang membawa token kembali ke primary. Bacaan tanpa token tetap dilayani replika.")
    tulis("baca.txt", "baca sesudah tulis: riwayat dan saldo tampil dari replika, tanpa dan dengan token LSN")


# ---------- sinkron.txt ----------

def siapkan_uji():
    """Tabel uji sementara untuk commit yang ditunggu: bukan tabel ledger, dibuat pemilik dan ikut direplikasi."""
    tanya("primary", "CREATE SCHEMA replika_uji")
    tanya("primary", "CREATE TABLE replika_uji.catatan (id bigserial PRIMARY KEY, v text NOT NULL)")


def commit_di_thread(app, mode, v, hasil):
    """INSERT satu baris (satu COMMIT) di thread sendiri dengan synchronous_commit tertentu. Mengembalikan thread-nya.
    Thread daemon: COMMIT yang macet di SyncRep tidak boleh menahan proses saat lab gagal (thread biasa membuat proses menggantung)."""
    def kerja():
        with konek("primary", app=app) as c:
            c.execute(f"SET synchronous_commit = {mode}")
            c.execute("INSERT INTO replika_uji.catatan (v) VALUES (%s)", (v,))
            hasil[v] = "selesai"
    t = threading.Thread(target=kerja, daemon=True)
    t.start()
    return t


def menunggu_syncrep(app):
    return satu("primary", "SELECT count(*) FROM pg_stat_activity WHERE application_name = %s AND wait_event = 'SyncRep'", (app,))


def waktu_commit(mode, n=200):
    """Lama n COMMIT satu baris dengan synchronous_commit tertentu, dalam milidetik."""
    with konek("primary") as c:
        c.execute(f"SET synchronous_commit = {mode}")
        w = []
        for _ in range(n):
            t = time.perf_counter()
            c.execute("INSERT INTO replika_uji.catatan (v) VALUES ('latensi')")
            w.append((time.perf_counter() - t) * 1000)
    return w


def rekam_sinkron():
    bangun_klaster()
    siapkan_uji()
    bagian("A. Standby sinkron: synchronous_standby_names = 'FIRST 1 (replika_sinkron)'")
    catat("# Satu kandidat sinkron. ANY 1 dari dua kandidat Tidak dijalankan di lab ini; Patroni dan CloudNativePG juga Tidak dijalankan.")
    atur_sinkron(SINKRON_SATU)
    pantau_sinkron(sync=True)
    rows = tanya("primary", "SELECT application_name, state, sync_state FROM pg_stat_replication ORDER BY application_name")
    harap(rows, [("replika_laporan", "streaming", "async"), ("replika_sinkron", "streaming", "sync")], "sync_state sesudah FIRST 1")
    catat("# replika_sinkron sinkron; replika_laporan tetap asinkron dan tidak ditunggu COMMIT.")

    bagian("B. synchronous_commit = on lawan remote_apply: yang ditunggu COMMIT")
    catat("# on: standby sudah menulis rekaman commit ke penyimpanan tahan lama. remote_apply: standby sudah memutar ulang rekaman itu.")
    catat("# Replay di replika_sinkron ditahan dengan sengaja (jeda buatan) supaya kedua jenis tunggu bisa dibedakan satu per satu.")
    pg_jeda("sinkron")
    catat("sinkron=> SELECT pg_wal_replay_pause()   # jeda buatan")
    hasil = {}
    t_on = commit_di_thread("uji-on", "on", "on", hasil)
    d.tunggu(lambda: not t_on.is_alive(), "COMMIT on selesai", 30, 0.02)
    harap(hasil.get("on"), "selesai", "COMMIT on")
    harap(satu("sinkron", "SELECT pg_last_wal_receive_lsn() > pg_last_wal_replay_lsn()"), True, "standby menerima WAL tanpa memutarnya")
    catat("COMMIT dengan synchronous_commit = on selesai selagi replay ditahan: ya")
    catat("posisi WAL yang diterima standby lebih maju dari posisi yang diputar ulang (dibandingkan di standby): ya")
    t_ra = commit_di_thread("uji-remote-apply", "remote_apply", "remote_apply", hasil)
    d.tunggu(lambda: menunggu_syncrep("uji-remote-apply") == 1, "COMMIT remote_apply menunggu", 30, 0.02)
    harap(t_ra.is_alive(), True, "COMMIT remote_apply masih berjalan")
    tanya("primary", "SELECT application_name, wait_event_type, wait_event FROM pg_stat_activity WHERE wait_event = 'SyncRep'")
    harap(satu("primary", "SELECT count(*) FROM replika_uji.catatan WHERE v = 'remote_apply'"), 0, "belum terlihat")
    catat("# COMMIT remote_apply menunggu di SyncRep dan barisnya belum terlihat oleh sesi lain di primary.")
    pg_jeda("sinkron", jeda=False)
    d.tunggu(lambda: not t_ra.is_alive(), "COMMIT remote_apply selesai", 30, 0.02)
    harap(hasil.get("remote_apply"), "selesai", "COMMIT remote_apply sesudah dilanjutkan")
    harap(satu("primary", "SELECT count(*) FROM replika_uji.catatan WHERE v = 'remote_apply'"), 1, "terlihat sesudah selesai")
    catat("COMMIT remote_apply selesai sesudah replay dilanjutkan dan barisnya terlihat: ya")
    menyusul("sinkron")

    catat("# Jeda commit alami, replay tanpa hambatan: 600 COMMIT satu baris per mode (nilai tidak direkam, hanya urutan COMMIT tercepat tiap mode).")
    catat("# COMMIT tercepat dipakai, bukan median: proses lain di mesin menambah derau beberapa milidetik, lebih besar dari selisih yang diukur.")
    for percobaan in (1, 2, 3):   # derau CPU bisa membalik urutan; tiga percobaan, urutan harus benar di salah satunya
        semua = {m: [] for m in ("local", "on", "remote_apply")}
        for _ in range(3):   # bergantian supaya derau mesin kena ketiganya sama
            for m in semua:
                semua[m] += waktu_commit(m)
        cepat = {m: min(v) for m, v in semua.items()}
        median = {m: statistics.median(v) for m, v in semua.items()}
        print(f"percobaan {percobaan}, COMMIT tercepat dan median (ms, tidak direkam):", {m: round(v, 3) for m, v in cepat.items()},
              {m: round(v, 3) for m, v in median.items()}, file=sys.stderr)
        if cepat["on"] > cepat["local"] and abs(cepat["remote_apply"] - cepat["on"]) < 1.0:
            break
    harap(cepat["on"] > cepat["local"], True, "COMMIT tercepat dengan standby sinkron tidak lebih lambat dari local")
    harap(abs(cepat["remote_apply"] - cepat["on"]) < 1.0, True, "selisih COMMIT tercepat remote_apply dan on di bawah 1 ms")
    catat("COMMIT tercepat dengan standby sinkron (on) lebih lambat dari local: ya (menunggu satu standby menambah jeda commit)")
    catat("selisih COMMIT tercepat antara remote_apply dan on di bawah 1 ms: ya (nilai tidak direkam; replay yang tidak ditahan menambah kurang dari itu)")

    bagian("C. Standby sinkron dimatikan: COMMIT macet, lalu synchronous_standby_names dikosongkan")
    d.stop(d.PORT)
    kompose("stop", "sinkron")
    catat("$ docker compose stop sinkron   # container standby sinkron mati")
    d.tunggu(lambda: satu("primary", "SELECT count(*) FROM pg_stat_replication WHERE application_name = 'replika_sinkron'") == 0,
             "replika_sinkron terputus", 30, 0.05)
    tanya("primary", "SELECT application_name, sync_state FROM pg_stat_replication ORDER BY application_name")
    hasil = {}
    t = commit_di_thread("uji-macet", "on", "macet", hasil)
    d.tunggu(lambda: menunggu_syncrep("uji-macet") == 1, "COMMIT menunggu standby sinkron", 30, 0.02)
    harap(t.is_alive(), True, "COMMIT macet")
    tanya("primary", "SELECT application_name, wait_event_type, wait_event FROM pg_stat_activity WHERE wait_event = 'SyncRep'")
    harap(satu("primary", "SELECT count(*) FROM replika_uji.catatan WHERE v = 'macet'"), 0, "baris macet belum terlihat")
    tanya("primary", "SELECT count(*) AS baris_macet_terlihat FROM replika_uji.catatan WHERE v = 'macet'")
    catat("# COMMIT menunggu di SyncRep dan barisnya belum terlihat oleh sesi lain di primary. Halaman PostgreSQL 17 tentang replikasi sinkron tidak menyebut batas waktu penantian; lab tidak menunggunya.")
    catat("# Dokumentasi menyuruh menurunkan jumlah standby sinkron di synchronous_standby_names lalu memuat ulang konfigurasi.")
    atur_sinkron("")
    d.tunggu(lambda: not t.is_alive(), "COMMIT dilepas", 30, 0.02)
    harap(hasil.get("macet"), "selesai", "COMMIT sesudah standby sinkron dikosongkan")
    tanya("primary", "SELECT count(*) AS baris_macet_terlihat FROM replika_uji.catatan WHERE v = 'macet'")
    harap(satu("primary", "SELECT count(*) FROM replika_uji.catatan WHERE v = 'macet'"), 1, "baris macet terlihat")
    harap(menunggu_syncrep("uji-macet"), 0, "tidak ada yang menunggu SyncRep")
    catat("# Sesudah synchronous_standby_names dikosongkan COMMIT yang macet selesai dan barisnya terlihat. Harganya: sampai standby kembali,")
    catat("# COMMIT tidak lagi menunggu siapa pun, jadi jaminan RPO nol hilang selama itu.")
    d.tunggu(lambda: satu("replika", "SELECT count(*) FROM replika_uji.catatan WHERE v = 'macet'") == 1, "replika_laporan menerima baris", 30, 0.05)
    kompose("start", "sinkron")
    catat("$ docker compose start sinkron   # container standby sinkron dimulai lagi")
    d.tunggu(lambda: standby_streaming("replika_sinkron"), "replika_sinkron streaming lagi", 90, 0.5)
    menyusul("sinkron")
    jumlah = [satu(n, "SELECT count(*) FROM replika_uji.catatan") for n in PORT_NODE]
    harap(jumlah[0] == jumlah[1] == jumlah[2], True, "baris uji sama di tiga node")
    catat("# Standby sinkron kembali streaming dan menyusul: jumlah baris uji sama di tiga node.")
    tulis("sinkron.txt", "replica sinkron: on lawan remote_apply, dan standby sinkron yang dimatikan")


# ---------- promosi.txt ----------

def pesan_log_primary(potongan):
    """Baris log primary (tanpa awalan application_name dan pid) yang memuat potongan itu, beserta baris DETAIL sesudahnya."""
    teks = kompose("logs", "--no-log-prefix", "primary").stdout.splitlines()
    out = []
    for i, baris in enumerate(teks):
        if potongan in baris:
            out.append(re.sub(r"^[^|]*\|\d+\|", "", baris))
            if i + 1 < len(teks) and "DETAIL:" in teks[i + 1]:
                out.append(re.sub(r"^[^|]*\|\d+\|", "", teks[i + 1]))
    return out


def batas_pemeriksaan(node, ids):
    daftar = ", ".join(str(i) for i in ids)
    return tanya(node, f"SELECT count(*) AS jurnal_ada FROM t5_ledger.jurnal WHERE id IN ({daftar})")[0][0]


INVARIAN = ("SELECT (SELECT count(*) FROM t5_ledger.buku b WHERE b.saldo_cache <> coalesce((SELECT sum(p.jumlah) FROM t5_ledger.posting p "
            "WHERE p.buku_id = b.id), 0)) AS buku_selisih, (SELECT coalesce(sum(jumlah), 0) FROM t5_ledger.posting) AS jumlah_semua_posting")


def rekam_promosi():
    bangun_klaster()
    mulai_server()
    t_budi = login("budi@lestari.example", label="Budi")
    bagian("A. Replika asinkron dipromosikan sesudah koneksi WAL-nya diputus: transaksi yang sudah dijawab 201 hilang")
    dasar = [bayar_diam(t_budi, 505, n) for n in (1000, 2000, 3000)]
    harap([x[0] for x in dasar], [201] * 3, "tiga pembayaran sebelum putus")
    menyusul()
    catat("# Tiga pembayaran dijawab 201 dan kedua standby menyusul. Lalu koneksi WAL ke replika_laporan diputus di sisi primary.")
    putus("replikator_laporan", "replika_laporan")
    d.tunggu(lambda: tanya("replika", "SELECT count(*) FROM pg_stat_wal_receiver", tampil=False)[0][0] == 0, "penerima WAL replika berhenti", 30, 0.05)
    tanya("replika", "SELECT count(*) AS penerima_wal FROM pg_stat_wal_receiver")
    catat("# Primary terus menerima pembayaran: lima pembayaran lagi, semuanya dijawab 201 ke client.")
    nominal = (10000, 20000, 30000, 40000, 50000)
    lima = [bayar_diam(t_budi, 505, n) for n in nominal]
    harap([x[0] for x in lima], [201] * 5, "lima pembayaran sesudah putus")
    dijawab = [x[1] for x in lima]
    catat("$ POST /transfers lima kali ke Warung 505 (Rp10.000 sampai Rp50.000), semua 201")
    harap(batas_pemeriksaan("primary", dijawab), 5, "lima jurnal ada di primary")
    harap(batas_pemeriksaan("replika", dijawab), 0, "lima jurnal belum ada di replika")
    saldo_505 = lambda n: satu(n, "SELECT saldo_cache FROM t5_ledger.buku WHERE akun_id = 505")
    catat("# Replika dipromosikan: pg_promote() menunggu sampai promosi selesai.")
    tanya("replika", "SELECT pg_promote(wait => true)")
    tanya("replika", "SELECT pg_is_in_recovery() AS standby")
    harap(satu("replika", "SELECT pg_is_in_recovery()"), False, "replika sudah dipromosikan")
    harap(batas_pemeriksaan("replika", dijawab), 0, "jurnal dijawab 201 tidak ada di node baru")
    catat("# Lima jurnal yang dijawab 201 ada di primary lama dan tidak ada di node baru: lima pembayaran hilang dari sudut pandang node baru.")
    hasil = [tanya(n, INVARIAN) for n in ("primary", "replika")]
    harap([h[0] for h in hasil], [(0, 0), (0, 0)], "invarian ledger di kedua node")
    catat("# Node baru tidak rusak, hanya lebih tua: tidak ada buku yang saldo_cache-nya berbeda dari jumlah postingnya, dan jumlah semua posting nol.")
    selisih = saldo_505("primary") - saldo_505("replika")
    harap(selisih, sum(nominal), "selisih saldo warung")
    tanya("primary", "SELECT saldo_cache AS saldo_warung_505 FROM t5_ledger.buku WHERE akun_id = 505")
    tanya("replika", "SELECT saldo_cache AS saldo_warung_505 FROM t5_ledger.buku WHERE akun_id = 505")
    catat("# Selisih saldo Warung 505 antara primary lama dan node baru: Rp150.000, sama dengan jumlah lima pembayaran yang hilang.")
    s, _ = bayar_diam(t_budi, 505, 5000)
    harap(s, 201, "primary lama masih menerima tulisan")
    harap([hitung_bayar("primary") - hitung_bayar("replika")], [6], "primary lama dan node baru berpisah")
    tanya("primary", "SELECT count(*) AS jurnal_bayar FROM t5_ledger.jurnal WHERE jenis = 'bayar'")
    tanya("replika", "SELECT count(*) AS jurnal_bayar FROM t5_ledger.jurnal WHERE jenis = 'bayar'")
    catat("# Tidak ada yang menghentikan primary lama: satu pembayaran lagi dijawab 201, dan kedua node kini punya riwayat berbeda.")
    catat("# Fencing (menghentikan primary lama sebelum node baru menerima tulisan) tidak ada di lab ini: tidak ada yang menghentikan primary lama.")

    bagian("B. Standby sinkron: COMMIT yang tidak dijawab standby tidak dijawab 201 ke client")
    d.stop(d.PORT)
    bangun_klaster()
    mulai_server()
    t_budi = login("budi@lestari.example", label="Budi")
    atur_sinkron(SINKRON_SATU)
    pantau_sinkron(sync=True)
    dasar = [bayar_diam(t_budi, 505, n) for n in (1000, 2000, 3000)]
    harap([x[0] for x in dasar], [201] * 3, "tiga pembayaran dengan standby sinkron")
    ids_dijawab = [x[1] for x in dasar]
    catat("# Tiga pembayaran dijawab 201 sementara replika_sinkron sinkron. Lalu koneksi WAL ke replika_sinkron diputus di sisi primary.")
    putus("replikator_sinkron", "replika_sinkron")
    d.tunggu(lambda: tanya("sinkron", "SELECT count(*) FROM pg_stat_wal_receiver", tampil=False)[0][0] == 0, "penerima WAL sinkron berhenti", 30, 0.05)
    hasil = {}

    def kerja():
        hasil["curl"] = curl("POST", "/transfers", {"ke": 505, "nominal": 4000}, token=t_budi, maks=3)
    t = threading.Thread(target=kerja, daemon=True)
    t.start()
    d.tunggu(lambda: menunggu_syncrep("api-t5") == 1, "COMMIT menunggu standby sinkron selagi client menunggu", 30, 0.02)
    harap(t.is_alive(), True, "client masih menunggu")
    t.join()
    harap(hasil["curl"][0], 0, "COMMIT tanpa standby sinkron tidak dijawab")
    catat("# Selagi client menunggu, COMMIT berhenti di SyncRep. Client tidak menerima jawaban sampai batas 3 detik (curl --max-time 3): tidak ada 201.")
    d.tunggu(lambda: menunggu_syncrep("api-t5") == 0, "COMMIT dilepas sesudah client putus", 30, 0.05)
    ada_primary = hitung_bayar("primary")
    peringatan = pesan_log_primary("canceling wait for synchronous replication")
    harap(len(peringatan) >= 1, True, "log primary memuat pembatalan penantian")
    catat("$ docker compose logs primary   # baris yang memuat pembatalan penantian")
    for baris in peringatan:
        catat(baris)
    catat("# Penantian dibatalkan sesudah client pergi, dan transaksinya ter-commit di primary lama saja: tidak ada standby yang mengonfirmasinya.")
    catat("# Promosi standby sinkron.")
    tanya("sinkron", "SELECT pg_promote(wait => true)")
    harap(satu("sinkron", "SELECT pg_is_in_recovery()"), False, "sinkron dipromosikan")
    harap(batas_pemeriksaan("sinkron", ids_dijawab), 3, "tiga jurnal dijawab 201 ada di node baru")
    catat("# Ketiga jurnal yang dijawab 201 sebelum pemutusan ada di node baru: tidak satu pun dari ketiganya hilang.")
    tanya("primary", "SELECT count(*) AS jurnal_bayar FROM t5_ledger.jurnal WHERE jenis = 'bayar'")
    tanya("sinkron", "SELECT count(*) AS jurnal_bayar FROM t5_ledger.jurnal WHERE jenis = 'bayar'")
    harap([ada_primary, hitung_bayar("sinkron")], [4, 3], "jurnal primary lama dan node baru")
    catat("# Primary lama memuat satu jurnal lagi (commit lokal sesudah penantian dibatalkan) yang tidak ada di node baru; client tidak pernah menerima 201 untuknya.")
    hasil = [tanya(n, INVARIAN) for n in ("primary", "sinkron")]
    harap([h[0] for h in hasil], [(0, 0), (0, 0)], "invarian ledger di kedua node")
    tulis("promosi.txt", "promosi replika: replika asinkron kehilangan transaksi, standby sinkron tidak")


# ---------- konflik.txt ----------

def konflik(nama, stmt_timeout, detik_query):
    """Satu skenario: query lama di replika, lalu primary menghapus baris dan VACUUM. Mengembalikan (hasil query, lama detik)."""
    tanya("primary", "INSERT INTO replika_uji.k SELECT generate_series(1, 1000)")
    menyusul("replika")
    hasil = {}

    def kerja():
        with konek("replika", app="uji-konflik") as c:
            if stmt_timeout:
                c.execute(f"SET statement_timeout = '{stmt_timeout}'")
            t0 = time.perf_counter()
            try:
                hasil["baris"] = c.execute(f"SELECT count(*), pg_sleep({detik_query}) FROM replika_uji.k").fetchone()[0]
            except psycopg.Error as e:
                hasil["galat"] = (e.sqlstate, e.diag.message_primary)
            hasil["lama"] = time.perf_counter() - t0
    t = threading.Thread(target=kerja, daemon=True)
    t.start()
    d.tunggu(lambda: satu("replika", "SELECT count(*) FROM pg_stat_activity WHERE application_name = 'uji-konflik' AND state = 'active'") == 1,
             "query lama berjalan di replika", 30, 0.02)
    tanya("primary", "DELETE FROM replika_uji.k")
    tanya("primary", "VACUUM replika_uji.k")
    t_vacuum = time.perf_counter()
    d.tunggu(lambda: satu("replika", "SELECT pg_last_wal_receive_lsn() > pg_last_wal_replay_lsn()"), "replay tertahan oleh query", 30, 0.02)
    catat(f"# {nama}: WAL pembersihan baris sudah diterima replika, tetapi belum diputar ulang selama query berjalan: ya")
    t.join(120)
    harap(t.is_alive(), False, f"{nama}: query selesai")
    menyusul("replika")
    hasil["tertahan"] = time.perf_counter() - t_vacuum   # dari VACUUM sampai replay menyusul (batas yang diperiksa, bukan nilai)
    return hasil


def rekam_konflik():
    bangun_klaster()
    tanya("primary", "CREATE SCHEMA replika_uji")
    tanya("primary", "CREATE TABLE replika_uji.k (id int)")
    bagian("A. Pengaturan replika: konflik antara query dan WAL pembersihan")
    catat("# Tabel replika_uji.k adalah tabel uji sementara di lab ini, bukan tabel ledger. Konflik dibuat dengan menghapus 1.000 baris lalu VACUUM")
    catat("# di primary sementara satu query di replika masih memakai baris-baris itu.")
    for pengaturan in ("max_standby_streaming_delay", "hot_standby_feedback", "statement_timeout"):
        tanya("replika", f"SHOW {pengaturan}")
    harap([satu("replika", f"SHOW {p}") for p in ("max_standby_streaming_delay", "hot_standby_feedback", "statement_timeout")], ["30s", "off", "0"],
          "pengaturan bawaan replika")
    catat("# Pengaturan bawaan: standby menunggu sampai 30 detik sebelum membatalkan query yang bentrok dengan WAL; tanpa statement_timeout.")
    stat = "SELECT confl_snapshot FROM pg_stat_database_conflicts WHERE datname = 'lab'"
    harap(satu("replika", stat), 0, "belum ada konflik snapshot")

    bagian("B. Query pendek (3 detik) selama konflik: standby menunggu, query selesai")
    h = konflik("query 3 detik", None, 3)
    harap(("baris" in h, h.get("baris")), (True, 1000), "query pendek selesai")
    harap(h["tertahan"] < 30.0, True, f"replay menyusul sebelum 30 detik: {h['tertahan']}")
    catat("# Query selesai tanpa galat dan melihat 1.000 baris (snapshot-nya lama); replay menunggu query itu, lalu menyusul dalam waktu kurang dari 30 detik.")
    tanya("replika", stat)
    harap(satu("replika", stat), 0, "tidak ada pembatalan konflik")

    bagian("C. statement_timeout = 20 detik, query 45 detik: berhenti oleh timeout, bukan oleh konflik")
    h = konflik("statement_timeout 20 detik", "20s", 45)
    harap(h.get("galat"), ("57014", "canceling statement due to statement timeout"), "dibatalkan timeout")
    harap(20.0 <= h["lama"] < 30.0, True, f"berhenti antara 20 dan 30 detik: {h['lama']}")
    catat("ERROR:  canceling statement due to statement timeout")
    catat("SQLSTATE 57014")
    harap(h["tertahan"] < 30.0, True, f"replay menyusul sebelum 30 detik: {h['tertahan']}")
    tertahan_timeout = h["tertahan"]
    catat("# Berhenti sesudah paling sedikit 20 detik dan sebelum 30 detik; replay baru menyusul sesudah query berhenti, dan itu kurang dari 30 detik sesudah VACUUM (nilai tidak direkam).")
    harap(satu("replika", stat), 0, "timeout bukan konflik")
    tanya("replika", stat)

    bagian("D. Tanpa statement_timeout, query 45 detik: konflik membatalkannya sesudah max_standby_streaming_delay")
    h = konflik("tanpa statement_timeout", None, 45)
    harap(h.get("galat"), ("40001", "canceling statement due to conflict with recovery"), "dibatalkan konflik")
    harap(30.0 <= h["lama"] < 60.0, True, f"berhenti antara 30 dan 60 detik: {h['lama']}")
    catat("ERROR:  canceling statement due to conflict with recovery")
    catat("SQLSTATE 40001")
    harap(tertahan_timeout < h["tertahan"] < 60.0, True, f"replay menyusul lebih lama dari bagian C dan sebelum 60 detik: {h['tertahan']}")
    catat("# Berhenti sesudah paling sedikit 30 detik (max_standby_streaming_delay bawaan 30 detik) dan sebelum 60 detik; replay baru menyusul sesudah query dibatalkan, lebih lama dari di bagian C (nilai tidak direkam).")
    catat("# Lama itu diukur sejak query mulai. Dokumentasi menghitung 30 detik sejak WAL diterima standby, dan WAL pembersihan baru ada sesudah query mulai.")
    d.tunggu(lambda: satu("replika", stat) == 1, "pencacah konflik snapshot naik", 30, 0.1)
    tanya("replika", stat)
    catat("# Pencacah konflik snapshot di katalog replika naik dari 0 ke 1 hanya pada skenario ini.")
    catat("# Dua cara berhenti, dua kode: 57014 dari timeout milik sesi pada 20 detik, 40001 dari konflik pada 30 detik. Timeout 20 detik tidak")
    catat("# mencegah query lama dihentikan; ia menghentikannya lebih dulu, dan replay tertahan lebih singkat (kurang dari 30 detik, lebih singkat dari di bagian D). Query 3 detik di bagian B tidak dihentikan siapa pun.")
    tulis("konflik.txt", "statement_timeout di replika dan konflik dengan pemutaran ulang WAL")


BAGIAN = {"replika": rekam_replika, "jeda": rekam_jeda, "baca": rekam_baca, "sinkron": rekam_sinkron, "promosi": rekam_promosi,
          "konflik": rekam_konflik}


def main():
    pilih = sys.argv[1:] or list(BAGIAN)
    for nama in pilih:
        if nama not in BAGIAN:
            sys.exit(f"bagian tidak dikenal: {nama} (pilih dari: {' '.join(BAGIAN)})")
    d.bangun()
    try:
        for nama in pilih:
            BAGIAN[nama]()
    finally:
        for port in list(d.server):
            d.stop(port)
    kompose("down", "-v", "--remove-orphans")


if __name__ == "__main__":
    main()
