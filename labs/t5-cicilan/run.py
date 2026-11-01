"""Rekam lab t5-cicilan (Tahap 5): batch harian tahan crash, referensi unik di jurnal, kompensasi, dan DBOS Go.

Server, skema, job cicilan, dan data awal adalah milik `labs/api-t5` (`dasar_t5.py`), bukan salinan. Yang baru di lab ini:
dua tes Go dan satu perbaikan urutan di `jurnalAngsuran` (referensi dibaca sesudah buku dikunci), job kompensasi angsuran
(`-kompensasi-angsuran`), SIGKILL sungguhan pada `-lab-cicilan-henti`, program pembanding DBOS Go (`dbos/`), dan rekaman ini.
Setiap bagian membuat ulang schema dan data awal dari nol, jadi output/*.txt tidak bergantung pada urutan bagian dan
rekaman ulang identik per byte (make cek). Waktu, id, dan angka yang bergantung mesin (laju, lama) tidak direkam sebagai
nilai: yang direkam hitungan baris, status, saldo, urutan, dan batas yang diperiksa ("ya" bila batas terpenuhi). Pihak
ketiga tidak dipakai: semua proses lokal. Lab gagal keras bila hasilnya meleset dari yang diharapkan.

    make -C labs/t5-cicilan run                    (butuh: Docker untuk PostgreSQL lewat labs/b3-race, Go)
    make -C labs/t5-cicilan run BAGIAN=crash       (satu bagian: crash serentak langkah kompensasi laju testing)
"""
import json, os, pathlib, re, secrets, signal, subprocess, sys, tempfile, threading, time, hashlib
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "api-t5"))
import dasar_t5 as d  # noqa: E402
from dasar_t5 import bagian, catat, curl, gagal, harap, j  # noqa: E402
import psycopg  # noqa: E402

LAB = "t5-cicilan"
SCHEMA, TES, SKEMA_DBOS = "tahap5_cicilan", "tahap5_cicilan_tes", "tahap5_cicilan_dbos"
API = d.HERE
DBOS_DIR = HERE / "dbos"
BIN_DBOS = DBOS_DIR / "cicilan-dbos"
d.OUT = HERE / "output"
WIB = ZoneInfo("Asia/Jakarta")
JOB = "t5-cicilan-job"                     # application_name koneksi job (pg_stat_activity menyaring dengan nama ini)
ADMIN = 400                                # akun admin data awal (admin.tunjangan@lestari.example)
BUDI, CITRA, ANI = 419, 504, 418           # tokoh data awal: dua karyawan bersaldo Rp250.000 dan Warung Ani
_dibangun = [False]


def versi_go():
    go = subprocess.run(["go", "version"], cwd=API, capture_output=True, text=True).stdout.split()
    return go[2] if len(go) > 2 else "go?"


d.versi_alat = versi_go


# ---------- dasar ----------

def ulang_samaran():
    d.samaran.clear()
    d._urut_uuid[0] = 0
    d._urut_order[0] = 0


def bangun():
    if not _dibangun[0]:
        d.bangun()
        subprocess.run(["go", "build", "-o", str(BIN_DBOS), "."], cwd=DBOS_DIR, check=True)
        _dibangun[0] = True


def sql(q, tampil=True, schema=SCHEMA):
    return d.sql(q, tampil=tampil, schema=schema)


def satu(q, arg=None, schema=SCHEMA):
    return d.satu(q, schema, arg)


def tabel_baris(kolom, baris):
    for b in d.tabel(kolom, baris):
        catat(d.samarkan(b))


def ya(kondisi):
    return "ya" if kondisi else "tidak"


def siapkan(server=True):
    """Schema, data awal, dan (bila perlu) server api-t5 dari nol."""
    for nama in list(d.server):
        d.stop(nama)
    ulang_samaran()
    bangun()
    d.buat_schema(SCHEMA)
    d.seed(SCHEMA)
    if server:
        d.mulai_api(db=d.db_app(SCHEMA))


def hari_ini():
    return datetime.now(WIB).date()


def bulan_lalu(tgl, n):
    """Tanggal n bulan sebelum tgl, hari dibatasi 28 (seperti hari_tagih)."""
    bln = tgl.year * 12 + tgl.month - 1 - n
    return date(bln // 12, bln % 12 + 1, min(tgl.day, 28))


def buat_sesi(akun):
    token = "cicilan-" + secrets.token_hex(12)
    sql(f"INSERT INTO sesi (token_hash, akun_id, kedaluwarsa) VALUES ('{hashlib.sha256(token.encode()).hexdigest()}', {akun}, now() + interval '1 hour')",
        tampil=False)
    d.samaran[token] = f"<token sesi akun {akun}>"
    return token


def karyawan(n, lewati=3):
    """n akun karyawan data awal setelah tiga akun tokoh, urut nomor."""
    return [r[0] for r in sql(f"SELECT id FROM akun WHERE jenis = 'karyawan' ORDER BY id LIMIT {n} OFFSET {lewati}", tampil=False)]


def buat_jadwal(akun, merchant, per, n, mulai, tampil=False):
    """POST /cicilan lewat server api-t5; mengembalikan nomor jadwal."""
    s, isi = curl("POST", "/cicilan", {"jenis": "cicilan", "merchant_akun_id": merchant, "jumlah_per_angsuran": per,
                                         "jumlah_angsuran": n, "hari_tagih": 15, "mulai": mulai.isoformat()},
                  token=buat_sesi(akun), tampil=tampil)
    harap(s, 201, f"buat jadwal akun {akun}")
    return j(isi)["id"]


def saldo(akun, jenis="karyawan"):
    """Saldo dari jumlah posting (bukan saldo_cache)."""
    return int(satu(f"SELECT coalesce(sum(p.jumlah), 0) FROM posting p JOIN buku b ON b.id = p.buku_id WHERE b.akun_id = {akun} AND b.jenis = '{jenis}'"))


def jurnal_angsuran(jadwal, ke):
    return satu(f"SELECT count(*) FROM jurnal WHERE jenis = 'angsuran' AND keterangan = 'Angsuran ke-{ke} jadwal {jadwal}'")


def status_angsuran(jadwal, ke):
    return satu(f"SELECT status FROM angsuran WHERE jadwal_id = {jadwal} AND ke = {ke}")


def rp(n):
    return "Rp" + f"{n:,}".replace(",", ".")


def rfc(t):
    return t.strftime("%Y-%m-%dT%H:%M:%SZ")


def job(args, tampil=None, nama=JOB):
    """Satu proses job api-t5; mengembalikan (kode keluar, keluaran). Kode negatif berarti dimatikan sinyal."""
    r = subprocess.run([str(d.BIN), *args], env=dict(d.ENV, DATABASE_URL=d.db_app(SCHEMA, nama)), capture_output=True, text=True)
    if tampil:
        catat(tampil)
    return r.returncode, (r.stdout + r.stderr).strip()


def mulai_job(args, nama=JOB):
    return subprocess.Popen([str(d.BIN), *args], env=dict(d.ENV, DATABASE_URL=d.db_app(SCHEMA, nama)),
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)


HASIL = re.compile(r"dibaca (\d+), jurnal baru (\d+), jurnal sudah ada (\d+), dicatat (\d+), dilewati (\d+), gagal (\d+)")


def baca_hasil(keluaran):
    m = HASIL.search(keluaran)
    if not m:
        gagal(f"keluaran job tidak dikenal: {keluaran!r}")
    return dict(zip(("dibaca", "baru", "ada", "dicatat", "dilewati", "gagal"), map(int, m.groups())))


def hasil_job(args, apa):
    rc, out = job(args)
    harap(rc, 0, f"job {apa}: kode keluar")
    return baca_hasil(out), out


def tunggu_mati(rc, apa):
    harap(rc, -signal.SIGKILL, f"{apa}: proses dimatikan sinyal 9")


def ketik(perintah, keluaran):
    catat(f"$ {perintah}")
    catat(keluaran)


# ---------- bagian crash: batch dimatikan di antara jurnal dan penandaan ----------

def rekam_crash():
    siapkan()
    sekarang = datetime.now(timezone.utc).replace(microsecond=0)
    hari = hari_ini()
    mulai = hari - timedelta(days=1)
    catat("# Tiap angsuran 'jatuh tempo kemarin'; job menagih semua angsuran jatuh tempo sampai hari ini. Tanggal dan jam ditutup (<tanggal>, <waktu>).")
    catat("# Jam ledger diperankan lewat -lab-sekarang: Idempotency-Key bernilai 24 jam dari jam itu, jadi 23 dan 25 jam tidak ditunggu.")

    # --- A: versi pertama (cicilan-satu-job): hanya Idempotency-Key ---
    bagian("A. Versi pertama (mode rentan cicilan-satu-job): satu job, satu-satunya penjaga Idempotency-Key 24 jam")
    saldo0 = saldo(BUDI)
    jadwal = buat_jadwal(BUDI, ANI, 100_000, 3, mulai, tampil=True)
    catat(f"# Budi (akun {BUDI}) bersaldo {rp(saldo0)}; jadwal {jadwal}: tiga angsuran Rp100.000 ke Warung Ani, angsuran ke-1 jatuh tempo kemarin")
    harap(saldo0, 250_000, "saldo awal Budi")
    sql(f"SELECT ke, status, jurnal_id IS NOT NULL AS terikat_jurnal FROM angsuran WHERE jadwal_id = {jadwal} ORDER BY ke")
    args = ["-rentan", "cicilan-satu-job", "-cicilan-sampai", hari.isoformat()]
    rc, out = job([*args, "-lab-sekarang", rfc(sekarang), "-lab-cicilan-henti", "1"],
                  "$ api-t5 -rentan cicilan-satu-job -cicilan-sampai <tanggal> -lab-sekarang <waktu> -lab-cicilan-henti 1")
    tunggu_mati(rc, "job pertama")
    harap(out, "", "job yang dimatikan tidak mencetak apa pun")
    catat("# job pertama: keluar dengan sinyal 9 (SIGKILL), tanpa keluaran")
    catat("# sesudah mati: ledger sudah menjurnal, angsuran belum ditandai")
    sql(f"""SELECT a.ke, a.status, (SELECT count(*) FROM jurnal WHERE jenis = 'angsuran' AND keterangan = 'Angsuran ke-' || a.ke || ' jadwal {jadwal}') AS jurnal_di_ledger,
                   (SELECT count(*) FROM kunci_idempotensi WHERE kunci = 'cicilan:{jadwal}:' || a.ke AND status = 'selesai') AS kunci_selesai
            FROM angsuran a WHERE a.jadwal_id = {jadwal} AND a.ke = 1""")
    harap((status_angsuran(jadwal, 1), jurnal_angsuran(jadwal, 1)), ("menunggu", 1), "sesudah job pertama mati")
    harap(saldo(BUDI), 150_000, "saldo sesudah jurnal pertama")

    h, _ = hasil_job([*args, "-lab-sekarang", rfc(sekarang + timedelta(hours=23))], "rentan 23 jam")
    catat("# job diulang 23 jam kemudian (key masih hidup)")
    catat("$ api-t5 -rentan cicilan-satu-job -cicilan-sampai <tanggal> -lab-sekarang <waktu +23 jam>")
    catat(f"hasil: dibaca {h['dibaca']}, jurnal baru {h['baru']}, dilewati {h['dilewati']}, dicatat {h['dicatat']}")
    harap((h["dibaca"], h["baru"], h["dilewati"], h["dicatat"]), (1, 0, 1, 0), "ulang 23 jam")
    sql(f"""SELECT a.status AS status_angsuran_ke_1, (SELECT count(*) FROM jurnal WHERE jenis = 'angsuran' AND keterangan = 'Angsuran ke-1 jadwal {jadwal}') AS jurnal_di_ledger
            FROM angsuran a WHERE a.jadwal_id = {jadwal} AND a.ke = 1""")
    catat("# dalam 24 jam tidak ada tagihan ganda: satu jurnal. Tetapi angsuran itu dilewati, bukan diselesaikan: statusnya tetap menunggu.")
    harap(saldo(BUDI), 150_000, "saldo sesudah ulang 23 jam")

    h, _ = hasil_job([*args, "-lab-sekarang", rfc(sekarang + timedelta(hours=25))], "rentan 25 jam")
    catat("# job diulang 25 jam kemudian (key sudah kedaluwarsa)")
    catat("$ api-t5 -rentan cicilan-satu-job -cicilan-sampai <tanggal> -lab-sekarang <waktu +25 jam>")
    catat(f"hasil: dibaca {h['dibaca']}, jurnal baru {h['baru']}, dilewati {h['dilewati']}, dicatat {h['dicatat']}")
    harap((h["dibaca"], h["baru"], h["dilewati"], h["dicatat"]), (1, 1, 0, 1), "ulang 25 jam")
    sql(f"""SELECT a.ke, a.status, (SELECT count(*) FROM jurnal WHERE jenis = 'angsuran' AND keterangan = 'Angsuran ke-' || a.ke || ' jadwal {jadwal}') AS jurnal_di_ledger
            FROM angsuran a WHERE a.jadwal_id = {jadwal} AND a.ke = 1""")
    catat(f"# saldo Budi dari jumlah posting: {rp(saldo(BUDI))} (awal Rp250.000; satu angsuran Rp100.000 ditagih dua kali)")
    harap((jurnal_angsuran(jadwal, 1), saldo(BUDI), saldo(ANI, "warung")), (2, 50_000, 200_000), "M48: dua jurnal")
    sql(f"SELECT count(*) AS jurnal_tanpa_referensi FROM jurnal WHERE jenis = 'angsuran' AND referensi IS NULL")

    # --- B: versi benar (ADR 54): referensi unik ---
    bagian("B. Versi benar: jurnal.referensi unik 'angsuran:<jadwal>:<ke>' dan status per langkah")
    jadwal_b = buat_jadwal(CITRA, ANI, 100_000, 3, mulai)
    catat(f"# Citra (akun {CITRA}), jadwal {jadwal_b}: tiga angsuran Rp100.000 ke Warung Ani, angsuran ke-1 jatuh tempo kemarin")
    args = ["-cicilan-sampai", hari.isoformat()]
    rc, out = job([*args, "-lab-cicilan-henti", "1"], "$ api-t5 -cicilan-sampai <tanggal> -lab-cicilan-henti 1")
    tunggu_mati(rc, "job pertama (versi benar)")
    harap(out, "", "job yang dimatikan tidak mencetak apa pun")
    catat("# job pertama: keluar dengan sinyal 9 (SIGKILL), tanpa keluaran")
    sql(f"""SELECT a.ke, a.status, (SELECT count(*) FROM jurnal WHERE jenis = 'angsuran' AND referensi = 'angsuran:{jadwal_b}:' || a.ke) AS jurnal_dengan_referensi
            FROM angsuran a WHERE a.jadwal_id = {jadwal_b} AND a.ke = 1""")
    harap((status_angsuran(jadwal_b, 1), saldo(CITRA)), ("menunggu", 150_000), "versi benar sesudah mati")
    h, _ = hasil_job(args, "benar +25 jam")
    catat("# job diulang kapan saja; jam tidak berperan (tanpa -lab-sekarang)")
    catat("$ api-t5 -cicilan-sampai <tanggal>")
    catat(f"hasil: dibaca {h['dibaca']}, jurnal baru {h['baru']}, jurnal sudah ada {h['ada']}, dicatat {h['dicatat']}")
    harap((h["dibaca"], h["baru"], h["ada"], h["dicatat"]), (1, 0, 1, 1), "versi benar diulang")
    sql(f"""SELECT a.ke, a.status, a.jurnal_id IS NOT NULL AS terikat_jurnal,
                   (SELECT count(*) FROM jurnal WHERE jenis = 'angsuran' AND referensi = 'angsuran:{jadwal_b}:' || a.ke) AS jurnal_dengan_referensi
            FROM angsuran a WHERE a.jadwal_id = {jadwal_b} AND a.ke = 1""")
    catat(f"# saldo Citra dari jumlah posting: {rp(saldo(CITRA))} (awal Rp250.000; satu angsuran Rp100.000 ditagih satu kali)")
    harap((jurnal_angsuran(jadwal_b, 1), saldo(CITRA), saldo(ANI, "warung")), (1, 150_000, 300_000), "versi benar: satu jurnal")
    h, _ = hasil_job(args, "benar ketiga")
    catat(f"# job dijalankan sekali lagi: dibaca {h['dibaca']}, jurnal baru {h['baru']}")
    harap((h["dibaca"], h["baru"]), (0, 0), "job ketiga tidak mengerjakan apa pun")
    bagian("C. Referensi menahan jurnal kedua walau key sudah tidak ada: INSERT langsung dengan referensi yang sama ditolak database")
    try:
        sql(f"INSERT INTO jurnal (jenis, keterangan, dibuat_oleh, referensi) VALUES ('angsuran', 'ulangan', {CITRA}, 'angsuran:{jadwal_b}:1')")
        gagal("referensi ganda harus ditolak")
    except psycopg.errors.UniqueViolation as e:
        catat(f"ERROR: duplicate key value violates unique constraint \"{e.diag.constraint_name}\"")
        harap(e.diag.constraint_name, "jurnal_referensi_key", "nama constraint referensi unik")
    d.tulis("crash.txt", "batch cicilan dimatikan di antara jurnal dan penandaan, lalu diulang sesudah 23 dan 25 jam", lab=LAB, schema=SCHEMA)


# ---------- bagian serentak: dua job pada angsuran yang sama ----------

def tahan_buku(akun_a, akun_b):
    """Koneksi pemilik yang mengunci buku utama kedua akun (urut id) sampai commit()."""
    c = d.sambung(SCHEMA, autocommit=False)
    c.execute(f"SELECT id FROM buku WHERE akun_id IN ({akun_a}, {akun_b}) AND jenis <> 'tabungan' ORDER BY id FOR UPDATE")
    return c


def menunggu_lock(nama=JOB):
    return satu(f"SELECT count(*) FROM pg_stat_activity WHERE application_name = '{nama}' AND wait_event_type = 'Lock'")


def selesaikan(proses):
    out = proses.communicate()[0].strip()
    harap(proses.returncode, 0, "job serentak keluar 0")
    return baca_hasil(out)


def rekam_serentak():
    siapkan()
    hari = hari_ini()
    args = ["-cicilan-sampai", hari.isoformat()]
    bagian("A. Dua job berjalan serentak atas 24 angsuran jatuh tempo (enam jadwal, versi benar)")
    akun = karyawan(6)
    mulai = bulan_lalu(hari, 3)
    jadwal = [buat_jadwal(a, ANI, 10_000, 4, mulai) for a in akun]
    catat(f"# enam karyawan, tiap jadwal empat angsuran Rp10.000 ke Warung Ani; keempatnya sudah jatuh tempo (jadwal mulai tiga bulan lalu)")
    sql(f"SELECT status, count(*) AS angsuran FROM angsuran WHERE jadwal_id = ANY (ARRAY{jadwal}) GROUP BY status ORDER BY status")
    p = [mulai_job(args), mulai_job(args)]
    hasil = [selesaikan(x) for x in p]
    baru, dicatat = sum(h["baru"] for h in hasil), sum(h["dicatat"] for h in hasil)
    catat("# dua proses job dimulai bersamaan; tumpang tindihnya tidak dipaksa (bagian B memaksanya). Yang direkam jumlah gabungan kedua job, karena pembagian kerja antar proses bergantung waktu")
    catat(f"jurnal baru dari kedua job: {baru}; angsuran dicatat dari kedua job: {dicatat}")
    harap((baru, dicatat), (24, 24), "dua job serentak: jumlah gabungan")
    sql(f"""SELECT count(*) AS angsuran, count(*) FILTER (WHERE status = 'dicatat') AS dicatat,
                   (SELECT count(*) FROM jurnal WHERE jenis = 'angsuran' AND referensi LIKE 'angsuran:%') AS jurnal_angsuran,
                   (SELECT count(DISTINCT referensi) FROM jurnal WHERE jenis = 'angsuran') AS referensi_berbeda
            FROM angsuran WHERE jadwal_id = ANY (ARRAY{jadwal})""")
    sql(f"""SELECT DISTINCT 250000 - (SELECT sum(p.jumlah) FROM posting p JOIN buku b ON b.id = p.buku_id WHERE b.akun_id = j.akun_id AND b.jenis = 'karyawan') AS berkurang
            FROM jadwal_cicilan j WHERE j.id = ANY (ARRAY{jadwal})""")
    harap(satu(f"SELECT count(*) FROM jurnal WHERE jenis = 'angsuran'"), 24, "24 jurnal")
    harap(saldo(ANI, "warung"), 240_000, "saldo Warung Ani")

    bagian("B. Dua job sudah membaca angsuran yang sama, lalu berebut buku; saldo hanya cukup untuk satu angsuran")
    akun_b = karyawan(1, lewati=9)[0]
    s0 = saldo(akun_b)
    jadwal_b = buat_jadwal(akun_b, ANI, s0, 2, hari - timedelta(days=1))
    catat(f"# akun {akun_b} bersaldo {rp(s0)}; jadwal {jadwal_b}: dua angsuran sebesar saldo itu, hanya yang ke-1 jatuh tempo")
    sql(f"SELECT ke, status FROM angsuran WHERE jadwal_id = {jadwal_b} ORDER BY ke")
    tahan = tahan_buku(akun_b, ANI)
    catat("# pemilik menahan lock buku kedua akun; dua job dimulai dan dibiarkan menunggu di lock")
    p = [mulai_job(args), mulai_job(args)]
    d.tunggu(lambda: menunggu_lock() == 2, "dua job menunggu lock buku (pg_stat_activity)", batas=30)
    catat(f"koneksi job yang menunggu lock: {menunggu_lock()}")
    tahan.commit()
    tahan.close()
    hasil = [selesaikan(x) for x in p]
    jumlah = {k: sum(h[k] for h in hasil) for k in ("baru", "ada", "dicatat", "gagal")}
    catat("# lock dilepas; jumlah gabungan kedua job:")
    catat(f"jurnal baru {jumlah['baru']}, jurnal sudah ada {jumlah['ada']}, gagal {jumlah['gagal']}")
    harap((jumlah["baru"], jumlah["ada"], jumlah["gagal"]), (1, 1, 0), "yang kalah mengenali jurnal yang sudah ada")
    sql(f"SELECT ke, status, jurnal_id IS NOT NULL AS terikat_jurnal FROM angsuran WHERE jadwal_id = {jadwal_b} ORDER BY ke")
    harap((status_angsuran(jadwal_b, 1), saldo(akun_b)), ("dicatat", 0), "angsuran ke-1 dicatat dan saldo habis satu kali")
    sql(f"SELECT count(*) AS jurnal_angsuran_ke_1 FROM jurnal WHERE referensi = 'angsuran:{jadwal_b}:1'")
    catat(f"# saldo akun {akun_b} dari jumlah posting: Rp{saldo(akun_b)}")

    bagian("C. Versi pertama (cicilan-satu-job): dua job serentak dalam 24 jam, Idempotency-Key diklaim satu job saja")
    akun_c = karyawan(1, lewati=10)[0]
    jadwal_c = buat_jadwal(akun_c, ANI, 100_000, 3, hari - timedelta(days=1))
    argsr = ["-rentan", "cicilan-satu-job", "-cicilan-sampai", hari.isoformat()]
    tahan = tahan_buku(akun_c, ANI)
    catat(f"# akun {akun_c}, jadwal {jadwal_c}; pemilik menahan lock buku, dua job dimulai")
    p = [mulai_job(argsr), mulai_job(argsr)]
    d.tunggu(lambda: menunggu_lock() == 1 and any(x.poll() is not None for x in p), "satu job menunggu lock dan satu sudah selesai", batas=30)
    catat(f"koneksi job yang menunggu lock: {menunggu_lock()}; job yang sudah selesai: {sum(x.poll() is not None for x in p)}")
    tahan.commit()
    tahan.close()
    hasil = [selesaikan(x) for x in p]
    jumlah = {k: sum(h[k] for h in hasil) for k in ("baru", "dilewati", "dicatat")}
    catat(f"jurnal baru dari kedua job {jumlah['baru']}, dilewati {jumlah['dilewati']}, dicatat {jumlah['dicatat']}")
    harap((jumlah["baru"], jumlah["dilewati"], jumlah["dicatat"]), (1, 1, 1), "versi pertama: serentak dalam 24 jam")
    harap((jurnal_angsuran(jadwal_c, 1), saldo(akun_c)), (1, 150_000), "versi pertama: satu jurnal")
    sql(f"SELECT ke, status FROM angsuran WHERE jadwal_id = {jadwal_c} AND ke = 1")
    d.tulis("serentak.txt", "dua job cicilan berjalan serentak", lab=LAB, schema=SCHEMA)


# ---------- bagian kompensasi ----------

def rekam_kompensasi():
    siapkan()
    hari = hari_ini()
    mulai = hari - timedelta(days=1)
    bagian("A. Angsuran sudah dijurnal, langkah akhirnya tidak bisa selesai: jurnal pembalik dan status gagal")
    catat("# Lab ini tidak punya langkah akhir yang bisa gagal; yang direkam adalah mekanisme kompensasinya. Keadaan 'terjurnal' dipasang langsung di database.")
    jadwal = buat_jadwal(BUDI, ANI, 100_000, 3, mulai)
    rc, out = job(["-cicilan-sampai", hari.isoformat(), "-lab-cicilan-henti", "1"])
    tunggu_mati(rc, "job sebelum kompensasi")
    sql(f"""UPDATE angsuran SET status = 'terjurnal', jurnal_id = (SELECT id FROM jurnal WHERE referensi = 'angsuran:{jadwal}:1')
            WHERE jadwal_id = {jadwal} AND ke = 1""")
    sql(f"SELECT ke, status, jurnal_id IS NOT NULL AS terikat_jurnal FROM angsuran WHERE jadwal_id = {jadwal} AND ke = 1")
    catat(f"# saldo Budi {rp(saldo(BUDI))}, saldo Warung Ani {rp(saldo(ANI, 'warung'))}")
    harap((saldo(BUDI), saldo(ANI, "warung")), (150_000, 100_000), "saldo sebelum kompensasi")
    alasan = "langkah akhir angsuran gagal permanen, uang dikembalikan"
    rc, out = job(["-kompensasi-angsuran", f"{jadwal}:1", "-kompensasi-oleh", str(CITRA), "-kompensasi-alasan", alasan])
    catat("$ api-t5 -kompensasi-angsuran 1:1 -kompensasi-oleh <akun karyawan> -kompensasi-alasan '...'")
    catat(f"exit {rc}: " + re.sub(r"^\d{4}/\d\d/\d\d \d\d:\d\d:\d\d ", "", out))
    harap(rc, 2, "bukan admin ditolak")
    rc, out = job(["-kompensasi-angsuran", f"{jadwal}:1", "-kompensasi-oleh", str(ADMIN), "-kompensasi-alasan", alasan])
    catat("$ api-t5 -kompensasi-angsuran 1:1 -kompensasi-oleh <akun admin> -kompensasi-alasan '...'")
    catat(out)
    harap(rc, 0, "kompensasi oleh admin")
    sql(f"SELECT ke, status, jurnal_id IS NOT NULL AS terikat_jurnal FROM angsuran WHERE jadwal_id = {jadwal} AND ke = 1")
    sql(f"""SELECT j.jenis, (j.membalik_jurnal_id = a.id) AS membalik_jurnal_angsuran
            FROM jurnal j JOIN jurnal a ON a.referensi = 'angsuran:{jadwal}:1' WHERE j.jenis = 'pembalik' AND j.membalik_jurnal_id = a.id""")
    sql(f"SELECT count(*) AS jurnal_asal_dengan_referensi FROM jurnal WHERE referensi = 'angsuran:{jadwal}:1'")
    catat(f"# saldo Budi {rp(saldo(BUDI))}, saldo Warung Ani {rp(saldo(ANI, 'warung'))}")
    harap((saldo(BUDI), saldo(ANI, "warung"), status_angsuran(jadwal, 1)), (250_000, 0, "gagal"), "sesudah kompensasi")
    rc, out = job(["-kompensasi-angsuran", f"{jadwal}:1", "-kompensasi-oleh", str(ADMIN), "-kompensasi-alasan", alasan])
    catat("# kompensasi kedua atas angsuran yang sama")
    catat(f"exit {rc}: " + re.sub(r"^\d{4}/\d\d/\d\d \d\d:\d\d:\d\d ", "", out))
    harap(rc, 2, "kompensasi kedua ditolak")
    h, _ = hasil_job(["-cicilan-sampai", hari.isoformat()], "sesudah kompensasi")
    catat(f"# job biasa sesudah kompensasi: dibaca {h['dibaca']} (angsuran gagal tidak ditagih lagi)")
    harap(h["dibaca"], 0, "job sesudah kompensasi")
    d.tulis("kompensasi.txt", "kompensasi angsuran lewat jurnal pembalik", lab=LAB, schema=SCHEMA)


# ---------- bagian langkah: tabel langkah buatan sendiri lawan DBOS Go ----------

FUNGSI_JURNAL = """CREATE FUNCTION tulis_jurnal_angsuran(p_akun bigint, p_merchant bigint, p_jumlah bigint, p_referensi text, p_ket text)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE dari bigint; ke bigint; sisa bigint; j bigint;
BEGIN
  PERFORM 1 FROM buku WHERE akun_id IN (p_akun, p_merchant) AND jenis <> 'tabungan' ORDER BY id FOR UPDATE;
  IF p_referensi IS NOT NULL THEN
    SELECT id INTO j FROM jurnal WHERE referensi = p_referensi;
    IF FOUND THEN RETURN j; END IF;
  END IF;
  SELECT id, saldo_cache INTO dari, sisa FROM buku WHERE akun_id = p_akun AND jenis <> 'tabungan';
  SELECT id INTO ke FROM buku WHERE akun_id = p_merchant AND jenis <> 'tabungan';
  IF sisa < p_jumlah THEN RAISE EXCEPTION 'saldo kurang'; END IF;
  INSERT INTO jurnal (jenis, keterangan, dibuat_oleh, referensi) VALUES ('angsuran', p_ket, p_akun, p_referensi) RETURNING id INTO j;
  INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES (j, dari, -p_jumlah), (j, ke, p_jumlah);
  UPDATE buku SET saldo_cache = saldo_cache - p_jumlah WHERE id = dari;
  UPDATE buku SET saldo_cache = saldo_cache + p_jumlah WHERE id = ke;
  RETURN j;
END $$"""

DBOS_MOD = "github.com/dbos-inc/dbos-transact-golang"
HASIL_DBOS = re.compile(r"dbos (\S+) sampai \S+: dibaca (\d+), dicatat (\d+), gagal (\d+)")


def dsn(role, schema=None, nama="t5-cicilan-dbos"):
    q = f"?search_path={schema}&application_name={nama}" if schema else f"?application_name={nama}"
    return f"postgres://{role}:{role}@127.0.0.1:{d.DB_PORT}/lab{q}"


def dbos_jalan(varian, hari, mati=None):
    args = [str(BIN_DBOS), "-db-app", dsn("api_t5", SCHEMA), "-db-sistem", dsn("lab", None), "-dbos-schema", SKEMA_DBOS,
            "-sampai", hari.isoformat(), "-varian", varian, *(["-mati", mati] if mati else [])]
    r = subprocess.run(args, env=d.ENV, capture_output=True, text=True)
    return r.returncode, (r.stdout + r.stderr).strip()


def baris_kode(berkas, *wilayah):
    """Baris kode di wilayah bertanda `--8<-- [start:x]` sampai `[end:x]`: bukan kosong, bukan komentar, bukan suntikan lab
    (`// lab`) dan bukan cabang versi pertama (`// rentan`)."""
    teks = (HERE.parent / berkas).read_text()
    n = 0
    for w in wilayah:
        m = re.search(rf"--8<-- \[start:{w}\]\n(.*?)--8<-- \[end:{w}\]", teks, re.S)
        harap(m is not None, True, f"wilayah {w} di {berkas}")
        n += sum(1 for l in m.group(1).splitlines() if l.strip() and not l.strip().startswith("//") and "// lab" not in l and "// rentan" not in l)
    return n


def rekam_langkah():
    siapkan()
    hari = hari_ini()
    mulai = hari - timedelta(days=1)
    with d.sambung("public") as c:
        c.execute(f"DROP SCHEMA IF EXISTS {SKEMA_DBOS} CASCADE")
        c.execute(f"CREATE SCHEMA {SKEMA_DBOS}")
        c.execute(f"GRANT ALL ON SCHEMA {SKEMA_DBOS} TO api_t5")
    sql(FUNGSI_JURNAL, tampil=False)
    info = json.loads(subprocess.run(["go", "list", "-m", "-json", DBOS_MOD], cwd=DBOS_DIR, capture_output=True, text=True, check=True).stdout)
    lisensi = (pathlib.Path(info["Dir"]) / "LICENSE").read_text().splitlines()[0]
    catat(f"# {DBOS_MOD} {info['Version']} (terbit {info['Time'][:10]}), lisensi di berkas LICENSE modul: {lisensi}")
    catat("# Pembanding dijalankan sebagai program Go terpisah (labs/t5-cicilan/dbos, modul sendiri); ledger tetap tabel yang sama.")
    catat(f"# Tabel sistem DBOS dan transaction_completion ada di schema {SKEMA_DBOS}, bukan di schema service mana pun.")
    bagian("A. Kasus yang sama: job dimatikan sesudah jurnal ditulis, lalu dijalankan lagi")
    catat("# Tiap baris: satu jadwal baru (angsuran ke-1 Rp100.000 jatuh tempo kemarin, saldo awal Rp250.000), job dimatikan SIGKILL di titik yang disebut, lalu dijalankan lagi tanpa suntikan.")
    catat("# titik 'sesudah jurnal, sebelum penanda': ledger sudah ditulis dan sudah di-commit, proses mati sebelum langkah berikutnya tercatat.")
    catat("# titik 'sesudah langkah jurnal tercatat': DBOS sudah mencatat langkah jurnal selesai; mati sebelum langkah penanda (hanya DBOS punya titik ini: tabel langkah tidak punya langkah di antaranya).")
    akun = iter(karyawan(10))
    hasil = []

    def skenario(label, cara, varian=None, titik=None, teks_titik="sesudah jurnal, sebelum penanda"):
        a = next(akun)
        jadwal = buat_jadwal(a, ANI, 100_000, 3, mulai)
        if cara == "tabel":
            rc, out = job(["-cicilan-sampai", hari.isoformat(), "-lab-cicilan-henti", "1"])
        else:
            rc, out = dbos_jalan(varian, hari, mati=titik)
        tunggu_mati(rc, f"{label}: proses pertama")
        antara = (status_angsuran(jadwal, 1), jurnal_angsuran(jadwal, 1))
        if cara == "tabel":
            h, _ = hasil_job(["-cicilan-sampai", hari.isoformat()], label)
            ulang = f"dibaca {h['dibaca']}, dicatat {h['dicatat']}"
        else:
            rc, out = dbos_jalan(varian, hari)
            harap(rc, 0, f"{label}: proses kedua keluar 0")
            m = HASIL_DBOS.search(out)
            harap(m is not None, True, f"{label}: keluaran DBOS tidak dikenal: {out[-300:]!r}")
            ulang = f"dibaca {m.group(2)}, dicatat {m.group(3)}"
        hasil.append((label, teks_titik, antara[1], ulang, jurnal_angsuran(jadwal, 1), 250_000 - saldo(a), status_angsuran(jadwal, 1)))
        return hasil[-1]

    skenario("tabel langkah", "tabel")
    dalam, sesudah = "dalam langkah jurnal, sesudah commit ledger", "sesudah langkah jurnal tercatat, sebelum penanda"
    skenario("DBOS RunAsStep, tanpa referensi", "dbos", "step", "dalam-langkah", dalam)
    skenario("DBOS RunAsStep, tanpa referensi", "dbos", "step", "antar-langkah", sesudah)
    skenario("DBOS RunAsStep, referensi unik", "dbos", "step-referensi", "dalam-langkah", dalam)
    skenario("DBOS RunAsStep, referensi unik", "dbos", "step-referensi", "antar-langkah", sesudah)
    skenario("DBOS RunAsTransaction", "dbos", "transaksi", "dalam-langkah", "dalam langkah jurnal, sebelum commit")
    skenario("DBOS RunAsTransaction", "dbos", "transaksi", "antar-langkah", sesudah)
    tabel_baris(["cara", "titik mati", "jurnal sesudah mati", "proses kedua", "jurnal akhir", "saldo berkurang", "status akhir"], hasil)
    harap([(h[4], h[5], h[6]) for h in hasil],
          [(1, 100_000, "dicatat"), (2, 200_000, "dicatat"), (1, 100_000, "dicatat"), (1, 100_000, "dicatat"),
           (1, 100_000, "dicatat"), (1, 100_000, "dicatat"), (1, 100_000, "dicatat")], "hasil akhir tiap cara")
    catat("# DBOS RunAsStep tanpa referensi menagih dua kali bila proses mati di dalam langkah jurnal: langkah baru dicatat sesudah fungsinya kembali, jadi pemulihan menjalankannya lagi.")
    catat("# Dengan referensi unik, atau dengan RunAsTransaction (catatan selesai ditulis di transaction yang sama dengan jurnal), hasilnya sama dengan tabel langkah: satu jurnal.")
    harap(hasil[1][2], 1, "RunAsStep tanpa referensi: jurnal sudah ada sebelum pemulihan")
    harap(hasil[5][2], 0, "RunAsTransaction mati sebelum commit: belum ada jurnal")

    bagian("B. Yang harus ditulis dan disimpan (dihitung, bukan dinilai)")
    kode_tabel = (baris_kode("api-t5/internal/service/t5.go", "job-cicilan", "langkah-tabel")
                  + baris_kode("api-t5/internal/repo/t5.go", "langkah-tandai"))
    bersama = baris_kode("t5-cicilan/dbos/main.go", "dbos-bersama")
    batch = baris_kode("t5-cicilan/dbos/main.go", "dbos-batch")
    kode_step = baris_kode("t5-cicilan/dbos/main.go", "dbos-alur-step") + bersama + batch
    kode_tx = baris_kode("t5-cicilan/dbos/main.go", "dbos-alur-transaksi") + bersama + batch
    catat("# baris kode = baris bukan kosong, bukan komentar, bukan suntikan lab (// lab), bukan cabang versi pertama (// rentan), di wilayah bertanda `--8<-- [start:x]` sampai `[end:x]`:")
    catat("#   tabel langkah: JalankanCicilan dan tagihBenar (internal/service/t5.go) + TandaiAngsuran (internal/repo/t5.go)")
    catat("#   DBOS: alur satu varian + langkah bersama (tandai, tandaiGagal) + batch (RunWorkflow per angsuran dan GetResult), dbos/main.go")
    catat("# tidak dihitung di kedua sisi: penulis jurnal (Go di api-t5, fungsi SQL di pembanding), daftar angsuran jatuh tempo, bendera.")
    tabel_baris(["cara", "baris kode"], [("tabel langkah", kode_tabel), ("DBOS RunAsStep", kode_step), ("DBOS RunAsTransaction", kode_tx)])
    tabel_sistem = sql(f"""SELECT table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text::int AS baris
                           FROM information_schema.tables WHERE table_schema = '{SKEMA_DBOS}' AND table_type = 'BASE TABLE' ORDER BY 1""", tampil=False)
    catat(f"# tabel di schema {SKEMA_DBOS} sesudah enam workflow DBOS, satu per angsuran (dibaca dari katalog, baris dihitung):")
    tabel_baris(["tabel", "baris"], [(r[0], r[1]) for r in tabel_sistem])
    isi = dict((r[0], r[1]) for r in tabel_sistem)
    per_alur = sum(isi[t] for t in ("workflow_status", "workflow_input", "workflow_output", "operation_outputs")) / isi["workflow_status"]
    catat(f"# baris sistem per angsuran = (workflow_status + workflow_input + workflow_output + operation_outputs) / workflow_status = {per_alur:g}; ditambah satu baris transaction_completion per langkah RunAsTransaction.")
    harap(per_alur, 5.0, "baris sistem DBOS per angsuran")
    catat("# 1,2 juta angsuran per tahun (naskah, Asumsi) x 5 baris = 6 juta baris per tahun di tabel DBOS bila tidak dibersihkan (Hitungan atas Asumsi; pengaturan retensi DBOS tidak dibaca di lab ini: Tidak dijalankan).")
    catat("# tabel langkah: tidak ada tabel tambahan; status ada di kolom angsuran.status (3 nilai di versi benar: menunggu, terjurnal, dicatat) dan jurnal.referensi.")
    catat("# DBOS: status per langkah ada di tabel sistemnya; angsuran.status hanya dipakai untuk apa yang dilihat app (menunggu, dicatat, gagal).")
    d.tulis("langkah.txt", "tabel langkah buatan sendiri lawan DBOS Go atas kasus yang sama", lab=LAB, schema=SCHEMA)


# ---------- bagian laju: 13.333 angsuran per hari puncak ----------

def rekam_laju():
    siapkan(server=False)
    hari = hari_ini()
    bagian("A. Job satu proses atas 2.000 angsuran jatuh tempo (200 jadwal x 10 angsuran Rp1.000, 20 warung), versi benar")
    catat("# Jadwal ditulis langsung di database (bukan lewat POST /cicilan) supaya 2.000 angsuran siap dalam satu perintah; job-nya job yang sama.")
    sql("""WITH w AS (SELECT id, row_number() OVER (ORDER BY id) AS n FROM akun WHERE jenis = 'warung' ORDER BY id LIMIT 20),
                k AS (SELECT id, row_number() OVER (ORDER BY id) AS n FROM akun WHERE jenis = 'karyawan' ORDER BY id OFFSET 3 LIMIT 200)
           INSERT INTO jadwal_cicilan (akun_id, jenis, merchant_akun_id, jumlah_per_angsuran, jumlah_angsuran, hari_tagih)
           SELECT k.id, 'cicilan', w.id, 1000, 10, 15 FROM k JOIN w ON w.n = (k.n - 1) % 20 + 1 ORDER BY k.id""")
    sql("INSERT INTO angsuran (jadwal_id, ke, jatuh_tempo) SELECT j.id, k, current_date - 1 FROM jadwal_cicilan j, generate_series(1, 10) k")
    sql("SELECT count(*) AS jadwal, (SELECT count(*) FROM angsuran WHERE status = 'menunggu') AS angsuran_menunggu FROM jadwal_cicilan")
    awal = time.monotonic()
    h, _ = hasil_job(["-cicilan-sampai", hari.isoformat()], "laju")
    lama = time.monotonic() - awal
    catat("$ api-t5 -cicilan-sampai <tanggal>")
    catat(f"hasil: dibaca {h['dibaca']}, jurnal baru {h['baru']}, dicatat {h['dicatat']}, gagal {h['gagal']}")
    harap((h["dibaca"], h["baru"], h["dicatat"], h["gagal"]), (2000, 2000, 2000, 0), "2.000 angsuran")
    laju = h["dicatat"] / lama
    catat(f"laju terukur memenuhi batas 20 angsuran per detik (Asumsi naskah): {ya(laju >= 20)}")
    harap(laju >= 20, True, "laju job di laptop lab di atas 20 per detik")
    sql("""SELECT count(*) AS angsuran, count(*) FILTER (WHERE status = 'dicatat') AS dicatat,
                  (SELECT count(*) FROM jurnal WHERE jenis = 'angsuran') AS jurnal_angsuran,
                  (SELECT count(DISTINCT referensi) FROM jurnal WHERE jenis = 'angsuran') AS referensi_berbeda FROM angsuran""")
    sql("SELECT DISTINCT 250000 - sum(p.jumlah) AS berkurang_per_karyawan FROM posting p JOIN buku b ON b.id = p.buku_id JOIN jadwal_cicilan j ON j.akun_id = b.akun_id AND b.jenis = 'karyawan' GROUP BY b.akun_id")
    sql("SELECT count(*) AS posting_tak_seimbang FROM (SELECT jurnal_id FROM posting GROUP BY jurnal_id HAVING sum(jumlah) <> 0) x")
    h, _ = hasil_job(["-cicilan-sampai", hari.isoformat()], "laju kedua")
    catat(f"# job dijalankan sekali lagi: dibaca {h['dibaca']}, jurnal baru {h['baru']}")
    harap((h["dibaca"], h["baru"]), (0, 0), "job kedua tidak mengerjakan apa pun")
    bagian("B. Hitungan atas Asumsi naskah (bukan rekaman)")
    puncak, per_detik = 13_333, 20
    detik, menit = f"{puncak / per_detik:.2f}".replace(".", ","), f"{puncak / per_detik / 60:.1f}".replace(".", ",")
    catat(f"# 13.333 angsuran per hari puncak (100.000 jadwal x 40% jatuh tempo di tiga hari gajian ÷ 3, naskah bagian 3) ÷ {per_detik} per detik = {detik} detik, dibulatkan {round(puncak / per_detik)} detik = {menit} menit")
    catat("# Laju terukur di atas hanya batas bawah di laptop lab (satu proses, satu transaction per angsuran); nilainya tidak direkam dan bukan kapasitas produksi.")
    d.tulis("laju.txt", "job cicilan atas 2.000 angsuran dan hitungan 13.333 per hari", lab=LAB, schema=SCHEMA)


# ---------- bagian testing ----------

def go_test(*args, env, cwd=None):
    r = subprocess.run(["go", *args], cwd=cwd or API, env=env, capture_output=True, text=True)
    teks = (r.stdout + r.stderr).replace("\t", "  ")
    teks = re.sub(r" \(\d+\.\d+s\)", "", teks)
    teks = re.sub(r"^(ok|FAIL)(\s+\S+)\s+[\d.]+s", r"\1\2", teks, flags=re.M)
    teks = re.sub(r"^(ok\s+\S+)\s+\(cached\)", r"\1", teks, flags=re.M)
    return r.returncode, teks.rstrip()


def rekam_testing():
    ulang_samaran()
    d.buat_schema(TES)
    bagian("A. go vet atas api-t5 dan atas pembanding DBOS")
    for nama, cwd in (("api-t5", API), ("labs/t5-cicilan/dbos", DBOS_DIR)):
        rc, teks = go_test("vet", "./...", env=d.ENV, cwd=cwd)
        catat(f"$ go vet ./...   # {nama}")
        catat(teks or "(tanpa temuan)")
        catat(f"# exit status {rc}")
        harap(rc, 0, f"go vet {nama}")
    bagian(f"B. Tes cicilan dan kompensasi dengan PostgreSQL sungguhan (schema {TES})")
    env = dict(d.ENV, TEST_DATABASE_URL=d.db_pemilik(TES, "t5-cicilan-tes"), LAB_TES_SCHEMA=TES, TES_DB_WAJIB="1")
    rc, teks = go_test("test", "-v", "-count=1", "-p", "1", "-run", "Cicilan|Kompensasi", "./internal/service", env=env)
    teks = "\n".join(l for l in teks.splitlines() if not l.startswith(("=== RUN", "=== PAUSE", "=== CONT")))
    catat(f"$ TEST_DATABASE_URL=<pemilik, schema {TES}> TES_DB_WAJIB=1 go test -v -count=1 -p 1 -run 'Cicilan|Kompensasi' ./internal/service")
    catat(teks)
    catat(f"# exit status {rc}")
    if rc != 0:
        print(teks, file=sys.stderr)
    harap(rc, 0, "go test cicilan dengan database")
    harap("--- SKIP" in teks, False, "tes dilewati")
    bagian("C. Versi dan lisensi pembanding")
    info = json.loads(subprocess.run(["go", "list", "-m", "-json", DBOS_MOD], cwd=DBOS_DIR, capture_output=True, text=True, check=True).stdout)
    catat(f"{DBOS_MOD} {info['Version']} terbit {info['Time'][:10]} (go list -m -json, proxy modul)")
    catat("LICENSE modul: " + (pathlib.Path(info["Dir"]) / "LICENSE").read_text().splitlines()[0])
    d.tulis("testing.txt", "tes Go untuk cicilan serentak dan kompensasi, dan versi DBOS", lab=LAB, schema=TES)


BAGIAN = {"crash": rekam_crash, "serentak": rekam_serentak, "langkah": rekam_langkah, "kompensasi": rekam_kompensasi, "laju": rekam_laju,
          "testing": rekam_testing}


def main():
    pilih = sys.argv[1:] or list(BAGIAN)
    for nama in pilih:
        if nama not in BAGIAN:
            sys.exit(f"bagian tidak dikenal: {nama} (pilih dari: {' '.join(BAGIAN)})")
    d.port_bebas(d.PORT)
    bangun()
    try:
        for nama in pilih:
            d.log.clear()
            BAGIAN[nama]()
    finally:
        for port in list(d.server):
            d.stop(port)
    print("selesai:", ", ".join(pilih))


if __name__ == "__main__":
    main()
