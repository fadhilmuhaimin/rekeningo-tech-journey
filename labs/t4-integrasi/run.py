"""Rekam lab t4-integrasi (Tahap 4): layanan verifikasi tiruan yang mati, lambat, dan setengah menjawab; retry berkunci,
timeout, breaker per lajur, dan pemakaian worker, di atas labs/api-t4.

Server, skema, data awal, worker, dan pihak ketiga tiruan adalah milik `labs/api-t4` (`dasar_t4.py`), bukan salinan; lab
ini menambah skenario dan rekamannya, di schema sendiri (`t4_integrasi`). Breaker, klaim per lajur, dan mode rentan
`verifikasi-tanpa-key` ada di kode api-t4 (flag `-breaker`, `-breaker-timeout`, `-breaker-bawaan`, `-rentan`). Setiap
bagian membuat ulang schema dan data awal dari nol, jadi output/*.txt tidak bergantung pada urutan bagian dan rekaman
ulang identik per byte (make cek). Token, waktu, dan notifikasi_id disamarkan. Angka yang bergantung mesin (lama
menunggu, lama satu percobaan) tidak ditulis sebagai angka: lab memeriksa batasnya dan gagal keras bila meleset,
rekaman memuat batasnya. Pihak ketiga adalah tiruan lokal; tidak ada panggilan ke luar mesin ini.

    make -C labs/t4-integrasi run                     (butuh: Docker, Go; PostgreSQL lewat labs/b3-race)
    make -C labs/t4-integrasi run BAGIAN=lajur        (satu bagian: lajur retry breaker worker testing)
"""
import base64, functools, hashlib, pathlib, re, subprocess, sys, time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "api-t4"))
import dasar_t4 as d  # noqa: E402
from dasar_t4 import PORT_PUSH, PORT_VERIFIKASI, bagian, catat, curl, gagal, harap, j, login  # noqa: E402

LAB = "t4-integrasi"
SCH = "t4_integrasi"
SCH_TES = "t4_integrasi_tes"
DB = d.db_app(SCH)
d.OUT = HERE / "output"          # dasar_t4.tulis menulis ke d.OUT; di sini output lab ini, bukan api-t4

sql = functools.partial(d.sql, schema=SCH)
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")
VERSI_GOBREAKER = re.search(r"sony/gobreaker/v2 (v[\d.]+)", (d.HERE / "go.mod").read_text()).group(1)

# Angka naskah yang dihitung ulang di worker.txt (Asumsi: laju verifikasi dan notifikasi, waktu push; c dan t terukur).
LAJU_VERIFIKASI, LAJU_UANG, T_PUSH, PERCOBAAN = 0.116, 7.52, 0.3, 5


def satu(q):
    return d.satu(q, SCH)


def tulis(nama, judul):
    d.tulis(nama, judul, lab=LAB, schema=SCH, dasar=d.DASAR)


def siapkan():
    for port in list(d.server):
        d.stop(port)
    d.buat_schema(SCH)
    d.seed(SCH)


def mulai_semua(args=(), tampil=None):
    d.mulai_push()
    d.mulai_verifikasi()
    d.mulai_api(args, tampil=tampil, db=DB)


def kunci_json():
    return {"berkas_kartu": base64.b64encode(PNG).decode(), "berkas_swafoto": base64.b64encode(PNG + b"swafoto").decode()}


def pendaftar(n, awal=40003):
    """Sesi langsung di tabel (POST /login dibatasi 10 percobaan per menit). Akun 40003 dan seterusnya: pemakai belum
    terverifikasi. Mengembalikan [(akun, token)]."""
    hasil = []
    for i in range(n):
        akun, token = awal + i, f"lab-t4i-{awal + i}"
        h = hashlib.sha256(token.encode()).hexdigest()
        d.sql(f"INSERT INTO sesi (token_hash, akun_id, kedaluwarsa) VALUES ('{h}', {akun}, now() + interval '1 hour')", tampil=False, schema=SCH)
        d.samaran[token] = f"<token sesi Pendaftar {i + 1}>"
        hasil.append((akun, token))
    return hasil


def ajukan(daftar):
    for akun, token in daftar:
        s, _ = curl("POST", "/verifikasi", kunci_json(), token, tampil=False)
        harap(s, 202, f"pengajuan akun {akun}")


def vendor():
    s, isi = curl("GET", "/lab/diterima", port=PORT_VERIFIKASI, tampil=False)
    harap(s, 200, "baca vendor")
    return j(isi)


def tampil_vendor(label="vendor"):
    v = vendor()
    catat(f"# {label}: {v['permintaan']} permintaan masuk, {v['objek']} objek dibuat (kunci berbeda = objek berbeda)")
    return v


def statistik_vendor():
    s, isi = curl("GET", "/lab/statistik", port=PORT_VERIFIKASI, tampil=False)
    harap(s, 200, "statistik vendor")
    return j(isi)


def ringkas_outbox():
    sql("SELECT status, percobaan, count(*) AS jumlah FROM outbox WHERE tujuan = 'verifikasi' GROUP BY status, percobaan ORDER BY status, percobaan")


def ringkas_verifikasi():
    sql("SELECT status, count(*) AS jumlah FROM verifikasi GROUP BY status ORDER BY status")


def snapshot_outbox():
    return d.sql("SELECT status, percobaan, count(*) FROM outbox WHERE tujuan = 'verifikasi' GROUP BY status, percobaan ORDER BY status, percobaan",
                 tampil=False, schema=SCH)


def worker_sampai(kondisi, apa, args):
    """`worker -sekali` berulang (baris yang ditunda backoff belum siap) sampai kondisi terpenuhi."""
    def langkah():
        d.worker(args, tampil=False, db=DB)
        return kondisi()
    d.tunggu(langkah, apa, batas=30.0, jeda=0.05)


def log_breaker(nama):
    return [l for l in d.log_server(nama) if l.startswith("breaker ")]


def tunggu_log(nama, teks, batas=30.0):
    d.tunggu(lambda: any(teks in l for l in d.log_server(nama)), f"log worker: {teks}", batas=batas)


def tunggu_vendor(minimal):
    d.tunggu(lambda: vendor()["permintaan"] >= minimal, f"vendor menerima {minimal} permintaan", batas=30.0)


# ---------- lajur.txt (a, e) ----------

PEKERJA_SATU = ["-serentak", "1", "-backoff", "0s", "-maks-percobaan", "5"]


def rekam_lajur():
    bagian("A. Tanpa lajur dan tanpa breaker (ADR 25 apa adanya): vendor mati, 10 pendaftar masuk, semua pekerjaan habis sebelum vendor pulih")
    siapkan()
    mulai_semua(tampil="# server: ./api-t4 -lab; layanan verifikasi tiruan: ./tiruan -peran verifikasi, mode mati (503 untuk semua permintaan)")
    d.tiruan_mode(PORT_VERIFIKASI, "mati")
    ajukan(pendaftar(10))
    catat("# 10 pendaftar mengajukan verifikasi: 10 baris verifikasi dan 10 pekerjaan di outbox (lajur verifikasi)")
    ringkas_outbox()
    catat("# worker: kapasitas 1, lima percobaan, tanpa backoff (waktu diperankan: backoff produksi 2 detik sampai 60 detik tidak ditunggu, dan pekerjaan yang gagal langsung diklaim lagi)")
    worker_sampai(lambda: satu("SELECT count(*) FROM outbox WHERE status = 'menunggu'") == 0, "semua pekerjaan mati", PEKERJA_SATU)
    ringkas_outbox()
    ringkas_verifikasi()
    v = tampil_vendor("vendor mati")
    harap((v["permintaan"], v["objek"]), (50, 0), "10 pekerjaan x 5 percobaan, tidak satu pun sampai ke objek vendor")
    catat("# Vendor pulih. Pekerjaan yang sudah dead-letter tidak diklaim lagi dan tidak ada yang mengantrekannya ulang:")
    d.tiruan_mode(PORT_VERIFIKASI, "normal")
    d.worker(PEKERJA_SATU, db=DB)
    sql("SELECT tingkat, count(*) AS jumlah FROM akun WHERE id BETWEEN 40003 AND 40012 GROUP BY tingkat")
    harap(satu("SELECT count(*) FROM akun WHERE id BETWEEN 40003 AND 40012 AND tingkat = 'belum'"), 10, "10 pendaftar tetap belum terverifikasi")

    bagian("B. Dengan breaker per lajur: vendor mati, 10 pendaftar masuk, lajur dijeda, pekerjaan menunggu dan selesai sesudah vendor pulih")
    siapkan()
    mulai_semua()
    d.tiruan_mode(PORT_VERIFIKASI, "mati")
    ajukan(pendaftar(10))
    catat("# worker yang berputar terus: kapasitas 1, lima percobaan, tanpa backoff, breaker lajur verifikasi dengan Timeout 3 detik")
    catat("# (waktu diperankan: bawaan pustaka 60 detik diperiksa di breaker.txt; vendor mati beberapa detik menggantikan 3 jam 30 menit)")
    catat("$ ./api-t4 -peran worker -serentak 1 -backoff 0s -maks-percobaan 5 -selang 50ms -breaker -breaker-timeout 3s")
    d.mulai_worker("w-breaker", [*PEKERJA_SATU, "-selang", "50ms", "-breaker", "-breaker-timeout", "3s"], db=DB)
    tunggu_log("w-breaker", "closed -> open")
    catat("# Enam percobaan gagal berturut-turut membuka breaker. Pekerjaan pertama sudah memakai kelima percobaannya, pekerjaan kedua satu:")
    ringkas_outbox()
    ringkas_verifikasi()
    sebelum = snapshot_outbox()
    harap(sebelum, [("mati", 5, 1), ("menunggu", 0, 8), ("menunggu", 1, 1)], "percobaan saat breaker terbuka")
    v1 = tampil_vendor("vendor mati, breaker terbuka")
    harap(v1["permintaan"], 6, "enam permintaan sampai ke vendor")
    time.sleep(0.5)   # jendela pengamatan: sepuluh putaran worker (selang 50 ms), jauh di bawah Timeout breaker 3 detik
    sesudah = snapshot_outbox()
    harap(sesudah, sebelum, "percobaan berubah saat lajur dijeda")
    harap(vendor()["permintaan"], 6, "vendor dihubungi saat lajur dijeda")
    catat("# Sesudah 0,5 detik (sepuluh putaran worker) lajur tetap dijeda: percobaan semua pekerjaan dan jumlah permintaan ke vendor sama persis dengan di atas.")
    harap(log_breaker("w-breaker"), ["breaker verifikasi: closed -> open"], "log breaker saat dijeda")
    d.tiruan_mode(PORT_VERIFIKASI, "normal")
    catat("# Vendor pulih. Sesudah Timeout breaker setengah terbuka: satu permintaan percobaan lewat, sukses menutup breaker, sisanya diklaim:")
    tunggu_log("w-breaker", "half-open -> closed")
    d.tunggu(lambda: satu("SELECT count(*) FROM outbox WHERE status = 'menunggu'") == 0, "semua pekerjaan selesai", batas=30.0)
    harap(log_breaker("w-breaker"), ["breaker verifikasi: closed -> open", "breaker verifikasi: open -> half-open", "breaker verifikasi: half-open -> closed"],
          "perpindahan status breaker")
    for l in log_breaker("w-breaker"):
        catat("log: " + l)
    ringkas_outbox()
    ringkas_verifikasi()
    sql("SELECT tingkat, count(*) AS jumlah FROM akun WHERE id BETWEEN 40003 AND 40012 GROUP BY tingkat ORDER BY tingkat")
    v2 = tampil_vendor("sesudah vendor pulih")
    harap((v2["permintaan"], v2["objek"]), (15, 9), "6 gagal + 9 sukses; 9 objek")
    harap(snapshot_outbox(), [("mati", 5, 1), ("terkirim", 1, 8), ("terkirim", 2, 1)], "percobaan akhir")
    catat("# 9 dari 10 pendaftar lulus. Yang pertama sudah dead-letter sebelum breaker terbuka: ambang bawaan (lebih dari 5 gagal berturut-turut) lebih tinggi daripada batas percobaan satu pekerjaan (5).")
    catat("# Pekerjaan kedua: satu percobaan gagal saat vendor mati dan satu sukses (percobaan 2); sisanya satu percobaan sukses.")
    d.stop("w-breaker")

    bagian("C. Breaker, banyak pekerjaan menunggu bersamaan dan kapasitas 4: tidak ada pekerjaan yang mati")
    siapkan()
    mulai_semua()
    d.tiruan_mode(PORT_VERIFIKASI, "mati")
    ajukan(pendaftar(8))
    catat("$ ./api-t4 -peran worker -serentak 4 -backoff 1ms -maks-percobaan 5 -selang 50ms -breaker -breaker-timeout 30s")
    d.mulai_worker("w-c4", ["-serentak", "4", "-backoff", "1ms", "-maks-percobaan", "5", "-selang", "50ms", "-breaker", "-breaker-timeout", "30s"], db=DB)
    tunggu_log("w-c4", "closed -> open")
    time.sleep(0.3)
    sql("SELECT count(*) FILTER (WHERE status = 'mati') AS mati, max(percobaan) <= 2 AS paling_banyak_dua_percobaan, "
        "sum(percobaan) BETWEEN 6 AND 8 AS enam_sampai_delapan_percobaan FROM outbox WHERE tujuan = 'verifikasi'")
    maks, jumlah, mati = d.sql("SELECT max(percobaan), sum(percobaan), count(*) FILTER (WHERE status = 'mati') FROM outbox WHERE tujuan = 'verifikasi'",
                               tampil=False, schema=SCH)[0]
    harap((mati, maks <= 2, 6 <= jumlah <= 8), (0, True, True), "kapasitas 4: tidak ada yang mati, paling banyak 2 percobaan per pekerjaan, 6 sampai 8 percobaan")
    harap(vendor()["permintaan"], int(jumlah), "setiap percobaan dihitung satu permintaan ke vendor")
    catat("# diperiksa: tidak ada pekerjaan mati; percobaan terbanyak satu pekerjaan paling banyak 2; seluruh percobaan antara 6 dan 8 (batas, bukan nilai tunggal:")
    catat("# berapa permintaan yang sudah berangkat ke vendor ketika kegagalan keenam tercatat bergantung pada kecepatan mesin)")
    d.tiruan_mode(PORT_VERIFIKASI, "normal")
    d.stop("w-c4")
    d.mulai_worker("w-c4b", ["-serentak", "4", "-backoff", "1ms", "-selang", "50ms", "-breaker", "-breaker-timeout", "300ms"], db=DB)
    d.tunggu(lambda: satu("SELECT count(*) FROM outbox WHERE status = 'menunggu'") == 0, "semua pekerjaan selesai", batas=30.0)
    catat("# Worker baru (breaker baru, Timeout 300 ms), vendor sudah pulih: semua pekerjaan selesai.")
    ringkas_verifikasi()
    harap(vendor()["objek"], 8, "8 objek untuk 8 pendaftar")
    d.stop("w-c4b")

    for bawaan in (True, False):
        nama = "D" if bawaan else "E"
        bagian(f"{nama}. Dokumen rusak di depan antrean: 6 pengajuan ditolak vendor (422), lalu 4 pengajuan sehat; vendor sehat. "
               + ("IsSuccessful bawaan pustaka (4xx = gagal)" if bawaan else "IsSuccessful kustom (4xx = sukses, ADR 36)"))
        siapkan()
        mulai_semua()
        ajukan(pendaftar(10))
        sql("UPDATE verifikasi SET checksum_kartu = 'buruk' WHERE id <= 6")
        catat("# 6 pengajuan pertama membawa dokumen yang tidak terbaca: vendor menjawab 422 (vendor sehat, permintaannya yang salah). 4 pengajuan berikutnya sehat.")
        arg = [*PEKERJA_SATU, "-selang", "50ms", "-breaker", "-breaker-timeout", "30s"] + (["-breaker-bawaan"] if bawaan else [])
        catat("$ ./api-t4 -peran worker " + " ".join(arg))
        d.mulai_worker("w-4xx", arg, db=DB)
        if bawaan:
            tunggu_log("w-4xx", "closed -> open")
            time.sleep(0.5)
            catat("# Enam jawaban 4xx berturut-turut membuka breaker; lajur dijeda dan 4 pengajuan sehat menunggu di belakang dokumen rusak:")
            harap(satu("SELECT count(*) FROM verifikasi WHERE status = 'lulus'"), 0, "tidak ada yang lulus selagi dijeda")
        else:
            d.tunggu(lambda: satu("SELECT count(*) FROM outbox WHERE status = 'menunggu'") == 0, "semua pekerjaan selesai", batas=30.0)
            catat("# Jawaban 4xx dihitung sukses: breaker tidak pernah terbuka. Pengajuan sehat lulus; enam pengajuan rusak habis lima percobaan (4xx diulang walau tidak akan berubah):")
            harap(log_breaker("w-4xx"), [], "breaker tidak membuka")
        ringkas_outbox()
        ringkas_verifikasi()
        v = tampil_vendor("vendor sehat")
        if bawaan:
            harap((v["permintaan"], v["objek"]), (6, 0), "enam permintaan salah, tidak satu pun membuat objek")
        else:
            harap((v["permintaan"], v["objek"]), (34, 4), "30 permintaan salah (6 x 5) dan 4 sehat; 4 objek")
        catat("log breaker: " + (", ".join(log_breaker("w-4xx")) or "(tidak ada perpindahan status)"))
        d.stop("w-4xx")
    tulis("lajur.txt", "vendor mati: dead-letter lawan lajur dan breaker")


# ---------- retry.txt (b, c) ----------

PERCOBAAN_SATU = ["-maks-percobaan", "5", "-backoff", "1ms", "-satu-putaran"]   # satu putaran per panggilan: jumlah percobaan tetap




def rekam_retry():
    bagian("A. Retry dengan Idempotency-Key = id pengajuan: balasan vendor terpotong sesudah objek dibuat, pengajuan tidak_pasti, retry tidak membuat objek kedua")
    siapkan()
    mulai_semua()
    (akun1, tok1), = pendaftar(1, 40003)
    ajukan([(akun1, tok1)])
    d.tiruan_mode(PORT_VERIFIKASI, "setengah")
    catat("# layanan verifikasi tiruan mode setengah: objek dibuat, jawaban 200 terpotong, koneksi ditutup")
    d.worker(PERCOBAAN_SATU, tampil=False, db=DB)
    sql("SELECT status FROM verifikasi")
    sql("SELECT status, percobaan FROM outbox WHERE tujuan = 'verifikasi'")
    harap(satu("SELECT status FROM verifikasi"), "tidak_pasti", "timeout = tidak_pasti")
    d.tiruan_mode(PORT_VERIFIKASI, "normal")
    d.tunggu(lambda: (d.worker(PERCOBAAN_SATU, tampil=False, db=DB), satu("SELECT status FROM verifikasi") == "lulus")[1], "pengajuan lulus", batas=30.0)
    sql("SELECT status, referensi_vendor FROM verifikasi")
    v = tampil_vendor("retry berkunci")
    harap((v["permintaan"], v["objek"]), (2, 1), "dua permintaan, satu objek")

    bagian("B. Pembanding yang ditolak: retry bebas tanpa kunci (mode rentan verifikasi-tanpa-key, Idempotency-Key baru di setiap percobaan)")
    siapkan()
    mulai_semua()
    (akun2, tok2), = pendaftar(1, 40003)
    ajukan([(akun2, tok2)])
    d.tiruan_mode(PORT_VERIFIKASI, "setengah")
    rentan = [*PERCOBAAN_SATU, "-rentan", "verifikasi-tanpa-key"]
    catat("$ ./api-t4 -peran worker -sekali -rentan verifikasi-tanpa-key -maks-percobaan 5 -backoff 1ms -satu-putaran")
    d.worker(rentan, tampil=False, db=DB)
    harap(satu("SELECT status FROM verifikasi"), "tidak_pasti", "timeout = tidak_pasti")
    d.tiruan_mode(PORT_VERIFIKASI, "normal")
    d.tunggu(lambda: (d.worker(rentan, tampil=False, db=DB), satu("SELECT status FROM verifikasi") == "lulus")[1], "pengajuan lulus", batas=30.0)
    sql("SELECT status, referensi_vendor FROM verifikasi")
    v = tampil_vendor("retry tanpa kunci")
    harap((v["permintaan"], v["objek"]), (2, 2), "dua permintaan, dua objek")
    catat("# Satu pendaftar, dua objek di vendor (VND-0001 dan VND-0002); Rekeningo hanya menyimpan referensi dari percobaan yang jawabannya terbaca.")
    catat("# Bila vendor menagih per objek, pendaftar ini ditagih dua kali (Asumsi: tiruan tidak menagih).")

    bagian("C. Timeout (vendor menggantung, batas waktu client 300 ms) menghasilkan tidak_pasti; vendor yang menjawab 503 tidak")
    siapkan()
    mulai_semua()
    (akun3, tok3), = pendaftar(1, 40003)
    ajukan([(akun3, tok3)])
    d.tiruan_mode(PORT_VERIFIKASI, "menggantung")
    batas = [*PERCOBAAN_SATU, "-verifikasi-timeout", "300ms", "-serentak", "1"]
    catat("# Vendor menggantung. Client menyerah sesudah 300 ms; vendor mungkin sudah mengerjakannya, hasilnya tidak diketahui:")
    d.worker(batas, tampil=False, db=DB)
    sql("SELECT status FROM verifikasi")
    sql("SELECT status, percobaan FROM outbox WHERE tujuan = 'verifikasi'")
    harap(satu("SELECT status FROM verifikasi"), "tidak_pasti", "timeout menandai tidak_pasti")
    d.tiruan_mode(PORT_VERIFIKASI, "normal")
    d.tunggu(lambda: (d.worker(batas, tampil=False, db=DB), satu("SELECT status FROM verifikasi") == "lulus")[1], "pengajuan lulus", batas=30.0)
    catat("# Vendor pulih: pengajuan yang sama lulus.")
    sql("SELECT status FROM verifikasi")
    v = tampil_vendor("sesudah pulih")
    harap((v["permintaan"], v["objek"]), (2, 1), "satu permintaan menggantung, satu permintaan lulus, satu objek")
    siapkan()
    mulai_semua()
    (akun4, tok4), = pendaftar(1, 40003)
    ajukan([(akun4, tok4)])
    d.tiruan_mode(PORT_VERIFIKASI, "mati")
    catat("# Pengajuan lain, vendor menjawab 503: vendor pasti tidak memprosesnya, jadi statusnya tidak berubah dan pekerjaan menunggu percobaan berikutnya:")
    d.worker(batas, tampil=False, db=DB)
    sql("SELECT status FROM verifikasi")
    sql("SELECT status, percobaan FROM outbox WHERE tujuan = 'verifikasi'")
    harap(satu("SELECT status FROM verifikasi"), "diajukan", "503 tidak mengubah status")

    bagian("D. Timeout terus-menerus sampai dead-letter: pengajuan berstatus gagal, padahal vendor menyimpan objeknya")
    siapkan()
    mulai_semua()
    (akun5, tok5), = pendaftar(1, 40003)
    ajukan([(akun5, tok5)])
    d.tiruan_mode(PORT_VERIFIKASI, "setengah")
    catat("# mode setengah di setiap percobaan: objek dibuat di vendor, jawaban terpotong. Lima percobaan, backoff 1 ms:")
    worker_sampai(lambda: satu("SELECT status FROM outbox WHERE tujuan = 'verifikasi'") == "mati", "pekerjaan masuk dead-letter", PERCOBAAN_SATU)
    sql("SELECT status, percobaan FROM outbox WHERE tujuan = 'verifikasi'")
    sql("SELECT status FROM verifikasi")
    harap(satu("SELECT status FROM verifikasi"), "gagal", "dead-letter sesudah timeout menandai gagal")
    v = tampil_vendor("setelah lima timeout")
    harap((v["permintaan"], v["objek"]), (5, 1), "lima permintaan, satu objek")
    catat("# Rekeningo menyebutnya gagal, vendor menyimpan satu objek untuk pengajuan yang sama. 'tidak_pasti' bertahan selama masih ada percobaan; percobaan kelima yang timeout menimpanya.")
    catat("# Memeriksa status ke vendor (job seperti cek status top-up) tidak ada di lab ini; pengajuan tidak_pasti juga menahan pendaftar, karena indeks verifikasi_satu_berjalan menghitungnya berjalan.")
    tulis("retry.txt", "retry berkunci, timeout menjadi tidak_pasti, dan retry tanpa kunci")


# ---------- worker.txt (e, f) ----------

def uang_siap():
    """Satu akun penerima dengan satu perangkat, dan satu pengirim yang sudah login. Mengembalikan token pengirim."""
    d.sql("INSERT INTO perangkat (akun_id, platform, token_push) VALUES (418, 'android', 'tok-ani-1')", tampil=False, schema=SCH)
    return login("budi@lestari.example", label="Budi")


def bayar_empat(token):
    for _ in range(4):
        s, isi = curl("POST", "/transfers", {"ke": 418, "nominal": 1000}, token, tampil=False)
        harap(s, 201, "bayar Rp1.000")


def tunggu_uang(empat):
    """Lama (detik) dari sesudah empat pembayaran tercatat sampai keempat pemberitahuannya sampai di layanan push."""
    t0 = time.monotonic()
    d.tunggu(lambda: d.push_diterima()["jumlah"] >= 4, "empat pemberitahuan uang sampai di layanan push", batas=20.0)
    return time.monotonic() - t0


def rekam_worker():
    bagian("A. Satu worker untuk semua lajur, tanpa breaker; vendor menggantung: pemberitahuan uang menunggu satu putaran penuh di belakang percobaan verifikasi")
    siapkan()
    mulai_semua()
    d.tiruan_mode(PORT_VERIFIKASI, "menggantung")
    ajukan(pendaftar(8))
    budi = uang_siap()
    catat("# 8 pekerjaan verifikasi (kelas 1) menunggu di outbox; vendor menggantung; batas waktu client 3 detik (bawaan ADR 22)")
    catat("$ ./api-t4 -peran worker -serentak 4 -backoff 1ms -selang 50ms")
    d.mulai_worker("w-satu", ["-serentak", "4", "-backoff", "1ms", "-selang", "50ms"], db=DB)
    tunggu_vendor(4)
    catat("# Empat percobaan verifikasi sedang berjalan: keempat slot worker terpakai. Budi membayar empat kali Rp1.000 ke Warung Ani (notifikasi uang, kelas 0, urutan lebih depan):")
    bayar_empat(budi)
    tunggu = tunggu_uang(4)
    harap(tunggu >= 2.0, True, f"notifikasi uang harus menunggu putaran yang berjalan (minimal 2 detik, dapat {tunggu:.2f})")
    catat("# Keempat pemberitahuan sampai di layanan push SESUDAH putaran yang berjalan selesai: menunggu paling sedikit 2,0 detik (batas bawah diperiksa; nilainya tidak direkam).")
    catat("# Urutan menurut kelas hanya mengatur siapa diklaim lebih dulu; percobaan yang sudah berjalan menahan slotnya sampai timeout.")
    st = statistik_vendor()
    lama = st["lama_ms"][:4]
    harap(len(lama) >= 4 and all(2900 <= x <= 3600 for x in lama), True, f"empat percobaan pertama ditahan sekitar 3 detik: {lama}")
    harap(st["serentak_maks"], 4, "permintaan bersamaan paling banyak di vendor = kapasitas worker")
    catat(f"# c terukur: permintaan bersamaan paling banyak yang sampai di vendor = {st['serentak_maks']} (kapasitas worker -serentak 4).")
    catat("# t terukur: tiap percobaan yang menggantung ditahan antara 2,9 dan 3,6 detik sampai client menyerah (batas diperiksa; batas waktu client 3 detik).")
    d.stop("w-satu")

    bagian("B. Dengan breaker per lajur; vendor tetap menggantung: lajur verifikasi dijeda, pemberitahuan uang tidak menunggu")
    siapkan()
    mulai_semua()
    d.tiruan_mode(PORT_VERIFIKASI, "menggantung")
    ajukan(pendaftar(8))
    budi = uang_siap()
    catat("$ ./api-t4 -peran worker -serentak 4 -backoff 1ms -selang 50ms -breaker -breaker-timeout 30s")
    d.mulai_worker("w-breaker", ["-serentak", "4", "-backoff", "1ms", "-selang", "50ms", "-breaker", "-breaker-timeout", "30s"], db=DB)
    tunggu_log("w-breaker", "closed -> open")
    time.sleep(0.2)
    catat("# Dua putaran menggantung (8 percobaan, 3 detik tiap putaran) membuka breaker. Percobaan per pekerjaan:")
    ringkas_outbox()
    harap(snapshot_outbox(), [("menunggu", 0, 4), ("menunggu", 2, 4)], "percobaan sesudah dua putaran")
    v1 = tampil_vendor("breaker terbuka")
    harap(v1["permintaan"], 8, "delapan percobaan sampai ke vendor")
    catat("# Budi membayar empat kali Rp1.000 ke Warung Ani:")
    bayar_empat(budi)
    tunggu = tunggu_uang(4)
    harap(tunggu < 2.0, True, f"notifikasi uang tidak boleh menunggu lajur verifikasi (batas 2 detik, dapat {tunggu:.2f})")
    catat("# Keempat pemberitahuan sampai di layanan push kurang dari 2,0 detik sesudah dibayar (batas atas diperiksa; nilainya tidak direkam).")
    harap(vendor()["permintaan"], 8, "lajur dijeda: vendor tidak dihubungi lagi")
    ringkas_outbox()
    catat("# Lajur verifikasi tetap dijeda: tidak ada permintaan baru ke vendor dan percobaan tidak bertambah.")
    d.stop("w-breaker")

    bagian("C. Pemakaian worker: c dan t terukur di bagian A, dihitung dengan laju naskah")
    c = 4
    t = 3
    slot_verifikasi = LAJU_VERIFIKASI * PERCOBAAN * t
    slot_uang = LAJU_UANG * T_PUSH
    harap((round(slot_verifikasi, 2), round(slot_uang, 2), round(slot_verifikasi + round(slot_uang, 2), 1)), (1.74, 2.26, 4.0), "hitungan naskah")
    catat(f"verifikasi: {LAJU_VERIFIKASI:.3f} per detik x {PERCOBAAN} percobaan x {t} detik = {slot_verifikasi:.2f} slot worker dari {c}".replace(".", ","))
    catat(f"            {slot_verifikasi:.2f} / {c} = {slot_verifikasi / c * 100:.1f}% dari kapasitas worker".replace(".", ","))
    catat(f"notifikasi uang: {LAJU_UANG:.2f} per detik x {T_PUSH} detik = {slot_uang:.2f} slot".replace(".", ","))
    catat(f"bersama: {slot_verifikasi:.2f} + {slot_uang:.2f} = {slot_verifikasi + round(slot_uang, 2):.1f} dari {c} slot".replace(".", ","))
    catat("# Hitungan. c = 4 dan t = 3 detik terukur di bagian A (t sebagai batas waktu client dan batas bawah yang diperiksa, bukan rata-rata).")
    catat("# 0,116 verifikasi per detik (naskah: 1.000 pendaftar per hari x puncak 10), 7,52 notifikasi uang per detik, dan 0,3 detik per notifikasi adalah Asumsi naskah;")
    catat("# kapasitas worker untuk push (c dibagi t = 13,3 per detik) diukur di rekaman beban lab api-t4. Hasilnya Asumsi, bukan beban yang dijalankan.")
    catat("# Hitungan: pada 4,0 dari 4 slot tidak ada sisa kapasitas untuk menguras antrean yang sudah menumpuk; pekerjaan yang pasti gagal memakai slot yang dibutuhkan pemberitahuan uang.")
    tulis("worker.txt", "pemakaian worker oleh pekerjaan verifikasi yang menggantung, lajur, dan breaker")


# ---------- breaker.txt (d) ----------

def go_test_log(nama, paket="./internal/lajur/"):
    """Baris t.Logf dari satu tes, tanpa awalan berkas:baris (nomor baris berubah bila tes diedit). Tes harus lulus."""
    r = subprocess.run(["go", "test", "-v", "-count=1", "-run", f"^{nama}$", paket], cwd=d.HERE, env=d.ENV, capture_output=True, text=True)
    if r.returncode != 0:
        gagal(f"go test {nama}:\n{r.stdout}\n{r.stderr}")
    if f"--- PASS: {nama}" not in r.stdout:
        gagal(f"tes {nama} tidak berjalan (tidak ada PASS)")
    return [m.group(1) for l in r.stdout.splitlines() if (m := re.match(r"\s+\w+_test\.go:\d+: (.*)", l))]


def tulis_sendiri(nama, kepala):
    d.OUT.mkdir(exist_ok=True)
    (d.OUT / nama).write_text("\n".join(l.rstrip() for l in "\n".join(kepala + d.log).split("\n")) + "\n")
    print("ditulis:", f"labs/{LAB}/output/{nama}")
    d.log.clear()


def rekam_breaker():
    for nama, judul, paket in (
            ("TestRekamanBreakerBawaan", "A. Pengaturan bawaan: membuka sesudah lebih dari 5 gagal berturut-turut, terbuka 60 detik, satu permintaan di half-open", "./internal/lajur/"),
            ("TestBreakerHalfOpenGagalMembukaLagiSelama60Detik", "B. Permintaan percobaan di half-open yang gagal membuka breaker lagi selama 60 detik penuh", "./internal/lajur/"),
            ("TestRekamanBreaker4xx", "C. IsSuccessful: bawaan pustaka menghitung jawaban 4xx sebagai gagal, kustom (ADR 36) sebagai sukses", "./internal/lajur/"),
            ("TestGobreakerV240IsExcluded", "D. Hasil netral di v2.4.0: error yang dikecualikan tidak dihitung sukses maupun gagal", "./internal/lajur/")):
        bagian(judul)
        catat(f"$ go test -v -run '^{nama}$' {paket}")
        baris = go_test_log(nama, paket)
        for l in baris:
            catat("  " + l)
        catat("PASS")
    kepala = [f"# Lab {LAB} · breaker github.com/sony/gobreaker/v2 {VERSI_GOBREAKER} dengan pengaturan bawaan, jam diperankan",
              f"# {d.versi_alat()} · gobreaker {VERSI_GOBREAKER} · tanpa database dan tanpa server",
              f"# Rekaman dari: make -C labs/{LAB} run BAGIAN=breaker.",
              "# Jam diperankan dengan testing/synctest: di dalam gelembung time.Now dan time.Sleep memakai jam palsu yang maju sendiri bila semua goroutine menunggu.",
              "# Pustaka tidak punya jam yang bisa disuntikkan; tanpa gelembung ini 60 detik harus ditunggu sungguhan. Tiap baris dicetak tes dan diperiksa tes itu sendiri."]
    tulis_sendiri("breaker.txt", kepala)


# ---------- testing.txt ----------

TES_BARU = ["TestRekamanBreakerBawaan", "TestBreakerHalfOpenGagalMembukaLagiSelama60Detik", "TestBreakerSuksesMemutusGagalBerturutTurut",
            "TestRekamanBreaker4xx", "TestBreakerTimeoutDapatDiatur", "TestBreakerPanggilanDijedaTidakMenambahHitungan",
            "TestDijedaHanyaUntukPenolakanBreaker", "TestBreakerLogPerubahanStatus", "TestBreakerTanpaCatatMemakaiLog",
            "TestGobreakerV240IsExcluded",
            "TestLajurTerbukaTidakMengklaimDanPercobaanTidakNaik", "TestLajurPulihHanyaSatuPermintaanPercobaanLaluSemuaSelesai",
            "TestLajurBanyakPekerjaanBersamaanTidakAdaYangMati", "TestLajurBarisDiklaimSebelumBreakerTerbukaDilepasTanpaMenaikkanPercobaan",
            "TestLepasOutboxTidakDiBawahNolDanHanyaBarisMenunggu", "TestLajurPushTetapJalanSelagiLajurVerifikasiTerbuka",
            "TestLajur4xxTidakMembukaBreakerKustomTetapiMembukaBreakerBawaan", "TestKunciIdempotensiPerPercobaan",
            "TestTanpaBreakerSemuaPekerjaanMatiSebelumVendorPulih", "TestRingkasanMenjumlahkanDanMencetakDijeda",
            "TestSatuPembuatClientUntukSemuaPanggilanKeluar", "TestBatasWaktuBawaanTigaDetikDiSemuaPembuat",
            "TestClientTidakMengikutiRedirect", "TestBatasNolMembuatClientTanpaBatasWaktuHanyaUntukRekamanPerbandingan",
            "TestBaruDenganTransportMemakaiTransportYangDiberikan", "TestKlasifikasiJawabanVendor",
            "TestIdempotencyKeyDariReferensiAtauKunciRentan", "TestKoneksiDitolakTidakTersediaDanTimeoutTidakPasti"]


def rekam_testing():
    d.buat_schema(SCH_TES)
    url = f"postgres://lab:lab@127.0.0.1:{d.DB_PORT}/lab?search_path={SCH_TES}&application_name=t4-integrasi-tes"
    env = dict(d.ENV, TEST_DATABASE_URL=url, LAB_TES_SCHEMA=SCH_TES)
    pola = "^(" + "|".join(TES_BARU) + ")$"
    r = subprocess.run(["go", "test", "-v", "-count=1", "-p", "1", "-run", pola, "./internal/lajur/", "./internal/worker/", "./internal/klien/", "./internal/verifikasi/"],
                       cwd=d.HERE, env=env, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout[-3000:], r.stderr[-2000:], file=sys.stderr)
        gagal("go test")
    lulus = [m.group(1) for l in r.stdout.splitlines() if (m := re.match(r"\s*--- PASS: (\S+)", l))]
    harap("--- SKIP" in r.stdout, False, "tes dilewati")
    induk = [n for n in lulus if "/" not in n]
    harap(sorted(induk), sorted(TES_BARU), "semua tes baru berjalan dan lulus")
    bagian("A. Tes Go yang ditambahkan lab ini (PostgreSQL sungguhan untuk paket worker; jam palsu untuk paket lajur)")
    catat(f"$ TEST_DATABASE_URL=<pemilik, schema {SCH_TES}> go test -v -count=1 -p 1 -run '<{len(TES_BARU)} tes baru>' ./internal/lajur/ ./internal/worker/ ./internal/klien/ ./internal/verifikasi/")
    for n in sorted(lulus):
        catat(f"--- PASS: {n}")
    catat(f"ok  {len(induk)} tes induk, {len(lulus) - len(induk)} subtes")
    bagian("B. go vet seluruh modul")
    rc = subprocess.run(["go", "vet", "./..."], cwd=d.HERE, env=d.ENV, capture_output=True, text=True)
    harap(rc.returncode, 0, "go vet")
    catat("$ go vet ./...")
    catat("(tanpa temuan)")
    versi = satu("SHOW server_version")
    kepala = [f"# Lab {LAB} · tes Go untuk breaker, klaim per lajur, dan satu pembuat client",
              f"# PostgreSQL {versi} · {d.versi_alat()} · pgx {d.PGX} · gobreaker {VERSI_GOBREAKER} · schema {SCH_TES}",
              f"# Rekaman dari: make -C labs/{LAB} run BAGIAN=testing."]
    tulis_sendiri("testing.txt", kepala)


BAGIAN = {"lajur": rekam_lajur, "retry": rekam_retry, "worker": rekam_worker, "breaker": rekam_breaker, "testing": rekam_testing}


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
        for port in list(d.server):   # error Python di tengah rekaman: server tidak tertinggal memegang port
            d.stop(port)


if __name__ == "__main__":
    main()
