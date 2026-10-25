"""Rekam lab API Tahap 3 (keputusan 950-954): api-t2 naik ke enam kota.

curl -i ke server Go + PostgreSQL 17, schema tahap3 (tes Go di tahap3_tes). Layanan push adalah tiruan lokal
(cmd/pushpalsu), bukan layanan sungguhan. Setiap bagian membuat ulang schema dan data awal dari nol, jadi
output/*.txt tidak bergantung pada urutan bagian dan rekaman ulang identik per byte (make cek).
Token, waktu, tanggal, dan notifikasi_id disamarkan. Lab gagal keras bila port sudah dipakai, atau bila hasilnya
tidak sesuai yang diharapkan (keputusan 79, 95).

    make -C labs/api-t3 run                      (butuh: Docker, Go; PostgreSQL dijalankan lewat labs/b3-race)
    make -C labs/api-t3 run BAGIAN=outbox        (satu bagian: skema outbox push rentan katalog sinkron web testing)
"""
import datetime, json, os, pathlib, re, subprocess, sys, threading, time

import psycopg

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import dasar_t3 as d  # noqa: E402
from dasar_t3 import PORT, PORT_PUSH, bagian, catat, curl, gagal, harap, j, login, samaran, satu, sql, tulis  # noqa: E402


def siapkan_data():
    d.buat_schema()
    d.seed()


def mulai_semua(args=(), tampil=None):
    d.mulai_push()
    d.mulai_api(args, tampil=tampil)


def serentak(kerja):
    """Jalankan setiap fungsi di thread sendiri. Mengembalikan (hasil, daftar thread); hasil terisi setelah join."""
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
            gagal("thread permintaan tidak selesai dalam 60 detik")


def ringkas_status(hasil):
    n = {}
    for s, _ in hasil:
        n[s] = n.get(s, 0) + 1
    return ", ".join(f"{s} x{n[s]}" for s in sorted(n))


def hari_ini():
    return satu("SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date::text")


def id_produk(warung, nama):
    return satu(f"SELECT id FROM produk WHERE akun_id = {warung} AND nama = '{nama}'")


# ---------- skema.txt ----------

# Kolom tiap tabel di blok mermaid plan/CERITA-TAHAP-3.md bagian 3b. Skema lab yang benar; bagian ini gagal bila beda.
NASKAH_3B = {
    "kota": ["id", "nama"],
    "perangkat": ["id", "akun_id", "platform", "token_push", "aktif", "terakhir_terlihat"],
    "outbox": ["id", "notifikasi_id", "jurnal_id", "akun_id", "kelas", "jenis", "payload", "status", "percobaan",
               "coba_lagi", "klaim_sampai", "dibuat"],
    "produk": ["id", "akun_id", "nama", "harga", "stok", "aktif", "versi", "diubah"],
    "promo": ["id", "kota_id", "dibuat_oleh", "judul", "potongan_persen", "mulai", "selesai"],
    "operasi_sinkron": ["kunci", "perangkat_id", "produk_id", "jenis", "nilai", "versi_dasar", "status", "dibuat_di_hp",
                        "diterapkan"],
    "sesi": ["token_hash", "akun_id", "jenis", "csrf_hash", "kedaluwarsa"],
}


def coba_tolak(q, sqlstate, constraint=None, schema=d.SCHEMA):
    """Jalankan q sebagai pemilik schema; harus ditolak database dengan SQLSTATE (dan constraint) itu."""
    catat("=> " + q)
    try:
        with d.sambung(schema) as c:
            c.execute(q)
    except psycopg.Error as e:
        harap((e.sqlstate, e.diag.constraint_name), (sqlstate, constraint), q)
        catat(f"ERROR:  {e.diag.message_primary}")
        catat(f"   -- SQLSTATE {e.sqlstate}" + (f" · constraint {constraint}" if constraint else ""))
        return
    gagal(f"harus ditolak: {q}")


def rekam_skema():
    d.buat_schema()   # data awal menyusul sesudah bagian B; bagian A dan B hanya membaca skema
    bagian("A. Skema akhir Tahap 2, lalu migrasi api-t3 000015 sampai 000019 (satu transaction, schema kosong)")
    catat("# api-t1/schema.sql + b4-migration/baru/000005 + api-t2/migrasi/000009..000014 = akhir Tahap 2; yang ditulis lab ini:")
    for f in d.MIGRASI_T3:
        catat(f"$ psql -1 -f migrasi/{f.name}")
    harap(len(d.MIGRASI_T3), 5, "jumlah migrasi api-t3")
    catat("# Naskah 3b menulis 'di atas 000013'; 000014 (wajib ganti password) ada sejak lab-api-t2a, jadi mulai 000015.")
    sql("SELECT count(*) AS tabel FROM information_schema.tables WHERE table_schema = current_schema()")
    harap(satu("SELECT count(*) FROM information_schema.tables WHERE table_schema = current_schema()"), 14, "14 tabel (naskah: ±14)")
    sql("SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() ORDER BY table_name")

    bagian("B. Kolom tabel Tahap 3 dibandingkan dengan blok mermaid naskah 3b (skema lab yang benar)")
    catat("# tabel | kolom di lab | sama dengan naskah")
    for t, kolom in NASKAH_3B.items():
        lab = [k for (k,) in sql(f"SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema()"
                                 f" AND table_name = '{t}' ORDER BY ordinal_position", tampil=False)]
        catat(f"{t} | {', '.join(lab)} | {'ya' if sorted(lab) == sorted(kolom) else 'TIDAK'}")
        harap(sorted(lab), sorted(kolom), f"kolom {t} lawan naskah 3b")
    akun = [k for (k,) in sql("SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema()"
                              " AND table_name = 'akun' ORDER BY ordinal_position", tampil=False)]
    harap("kota_id" in akun, True, "akun.kota_id")
    catat(f"akun | {', '.join(akun)} | ya (kota_id baru)")
    sql("SELECT pg_get_constraintdef(oid) AS aturan_jenis_akun FROM pg_constraint WHERE conname = 'akun_jenis_check'"
        " AND connamespace = current_schema()::regnamespace")
    catat("# Selisih dengan blok mermaid: tidak ada tabel atau kolom. Yang lab tambah dan mermaid tidak menulis: aturan (CHECK, UNIQUE,")
    catat("# index sebagian) dan nilai status 'dilewati' di outbox (penerima tanpa perangkat aktif).")
    sql("""SELECT conrelid::regclass AS tabel, conname AS aturan, pg_get_constraintdef(oid) AS isi
FROM pg_constraint WHERE connamespace = current_schema()::regnamespace AND contype IN ('c', 'u')
  AND conrelid::regclass::text IN ('kota', 'perangkat', 'outbox', 'produk', 'promo', 'operasi_sinkron', 'sesi')
ORDER BY 1::text, 2""")
    sql("SELECT tablename AS tabel, indexname AS index, indexdef FROM pg_indexes WHERE schemaname = current_schema()"
        " AND tablename IN ('outbox', 'perangkat', 'promo', 'akun') AND indexname NOT LIKE '%_pkey' AND indexname NOT LIKE '%_key'"
        " ORDER BY 1, 2")

    bagian("C. Data awal: ./api-t3 -seed (data lab, sebagai pemilik schema, tanpa lewat service)")
    d.seed()
    catat("$ DATABASE_URL=<pemilik schema> ./api-t3 -seed   # password semua akun lab: lihat cmd/api/seed.go")
    sql("SELECT id, nama FROM kota ORDER BY id")
    sql("SELECT jenis, count(*) AS akun, count(kota_id) AS punya_kota FROM akun GROUP BY jenis ORDER BY jenis")
    sql("SELECT k.nama AS kota, count(*) FILTER (WHERE a.jenis = 'karyawan') AS karyawan,"
        " count(*) FILTER (WHERE a.jenis = 'warung') AS warung, count(*) FILTER (WHERE a.jenis = 'hr') AS hr"
        " FROM kota k JOIN akun a ON a.kota_id = k.id GROUP BY k.id, k.nama ORDER BY k.id")
    sql("SELECT (SELECT count(*) FROM buku) AS buku, (SELECT count(*) FROM jurnal) AS jurnal,"
        " (SELECT sum(saldo_cache) FROM buku WHERE jenis = 'karyawan') AS saldo_karyawan,"
        " (SELECT saldo_cache FROM buku WHERE jenis = 'tunjangan') AS buku_tunjangan,"
        " (SELECT sum(saldo_cache) FROM buku) AS jumlah_semua")
    harap(satu("SELECT sum(saldo_cache) FROM buku"), 0, "jumlah semua saldo_cache")
    sql("SELECT (SELECT count(*) FROM produk) AS produk, (SELECT count(DISTINCT akun_id) FROM produk) AS warung,"
        " (SELECT count(*) FROM perangkat) AS perangkat, (SELECT count(*) FROM outbox) AS outbox,"
        " (SELECT count(*) FROM promo) AS promo")
    harap(satu("SELECT count(*) FROM produk"), 2400, "60 warung x 40 item")
    harap(satu("SELECT count(*) FROM outbox"), 0, "antrean awal kosong")
    sql("SELECT a.id, a.nama, a.jenis, k.nama AS kota, a.nomor_karyawan FROM akun a JOIN kota k ON k.id = a.kota_id"
        " WHERE a.id IN (417, 418, 419, 502, 503, 504) ORDER BY a.id")

    bagian("D. Role app (api_t3) bukan pemilik tabel: invarian dan kolom tertentu tidak bisa diubah dari server")
    with psycopg.connect(d.db_app().split("?")[0] + f"?options=-csearch_path%3D{d.SCHEMA}", autocommit=True) as c:
        for q, kode in (("ALTER TABLE outbox DISABLE TRIGGER ALL", "42501"),
                        ("UPDATE posting SET jumlah = 1 WHERE id = 1", "42501"),
                        ("UPDATE akun SET kota_id = 2 WHERE id = 419", "42501"),
                        ("DELETE FROM jurnal WHERE id = 1", "42501"),
                        ("DELETE FROM produk WHERE id = 1", "42501")):
            catat(f"api_t3=> {q};")
            try:
                c.execute(q)
                gagal(f"harus ditolak: {q}")
            except psycopg.Error as e:
                harap(e.sqlstate, kode, q)
                catat(f"ERROR:  {e.diag.message_primary}")
                catat(f"   -- SQLSTATE {e.sqlstate}")
    catat("# DELETE outbox dan operasi_sinkron diizinkan: hanya untuk job retensi (-bersih); jurnal dan posting tidak pernah.")

    bagian("E. Aturan tabel baru ditolak database, bukan hanya service (gagal keras bila tidak ditolak)")
    coba_tolak("INSERT INTO outbox (akun_id, kelas, jenis, payload) VALUES (419, 0, 'bayar', '{}')", "23514", "outbox_jurnal_atau_promo")
    coba_tolak("INSERT INTO outbox (akun_id, kelas, jenis, payload) VALUES (419, 3, 'promo', '{}')", "23514", "outbox_kelas_check")
    sql("INSERT INTO outbox (jurnal_id, akun_id, kelas, jenis, payload) VALUES (1, 419, 1, 'topup', '{}')")
    coba_tolak("INSERT INTO outbox (jurnal_id, akun_id, kelas, jenis, payload) VALUES (1, 419, 1, 'topup', '{}')", "23505", "outbox_satu_per_jurnal")
    coba_tolak("INSERT INTO sesi (token_hash, akun_id, kedaluwarsa, jenis) VALUES ('x', 418, now(), 'web')", "23514", "sesi_csrf_hanya_web")
    coba_tolak("INSERT INTO promo (kota_id, dibuat_oleh, judul, potongan_persen, mulai, selesai)"
               " VALUES (1, 411, 'x', 10, now(), now())", "23514", "promo_selesai_sesudah_mulai")
    coba_tolak("INSERT INTO promo (kota_id, dibuat_oleh, judul, potongan_persen, mulai, selesai)"
               " VALUES (1, 411, 'x', 95, now(), now() + interval '1 hour')", "23514", "promo_potongan_persen_check")
    coba_tolak("INSERT INTO produk (akun_id, nama, harga, stok) VALUES (418, 'Tes', 1000, -1)", "23514", "produk_stok_check")
    coba_tolak("INSERT INTO produk (akun_id, nama, harga, stok) VALUES (418, 'Nasi goreng', 1000, 1)", "23505", "produk_akun_id_nama_key")
    coba_tolak("INSERT INTO operasi_sinkron (kunci, perangkat_id, produk_id, jenis, nilai, versi_dasar, status, dibuat_di_hp)"
               " VALUES ('k', 1, 1, 'bayar', 0, 1, 'diterapkan', now())", "23514", "operasi_sinkron_jenis_check")
    tulis("skema.txt", "migrasi 000015-000019, data awal enam kota, aturan database")


# ---------- outbox.txt ----------

def rekam_outbox():
    siapkan_data()
    mulai_semua(tampil="# server: ./api-t3 -lab (pool 10, push timeout 3s, idle-tx 5s); layanan push tiruan: ./pushpalsu")
    for l in d.log_server():
        catat("server log: " + l)
    catat("\n# Batas pool 10 ditulis di kode (cmd/api/main.go, SetMaxOpenConns), bukan bawaan database/sql; dipakai ADR 22")
    curl("GET", "/lab/pool")
    budi = login("budi@lestari.example", label="Budi")
    dimas = login("dimas@lestari.example", label="Dimas")
    admin = login("admin.tunjangan@lestari.example", label="admin")

    bagian("A. Budi bayar Rp25.000 ke Warung Ani: jurnal, posting, dan baris outbox ditulis di transaction yang sama")
    s, isi = curl("POST", "/transfers", {"ke": 418, "nominal": 25000, "catatan": "nasi goreng dua porsi"}, budi)
    harap((s, j(isi)), (201, {"id": 10001, "saldo": 225000}), "bayar Budi")
    sql("SELECT p.jurnal_id, j.jenis, b.jenis AS buku, p.jumlah FROM posting p JOIN jurnal j ON j.id = p.jurnal_id"
        " JOIN buku b ON b.id = p.buku_id WHERE p.jurnal_id = 10001 ORDER BY p.id")
    sql("SELECT id, jurnal_id, akun_id, kelas, jenis, status, percobaan, payload->>'judul' AS judul, payload->>'catatan' AS catatan,"
        " klaim_sampai FROM outbox")
    catat("# Pembayaran sudah selesai (201), pemberitahuan belum dikirim: layanan push belum menerima apa pun")
    harap(d.push_diterima()["jumlah"], 0, "push belum menerima")
    catat(f"push tiruan menerima: {d.push_diterima()['jumlah']}")

    bagian("B. Worker (proses sendiri) mengklaim baris, mengirim ke push tiruan, menandai terkirim")
    d.worker()
    sql("SELECT id, status, percobaan, klaim_sampai FROM outbox")
    diterima = d.push_diterima(True)
    nid = satu("SELECT notifikasi_id::text FROM outbox WHERE id = 1")
    harap((diterima["jumlah"], diterima["daftar"][0]["notifikasi_id"], diterima["daftar"][0]["token"]), (1, nid, "tiruan-418"),
          "push menerima notifikasi_id yang sama dengan outbox")
    catat(f"push tiruan menerima: 1 pesan untuk token tiruan-418, notifikasi_id = outbox.notifikasi_id ({d.samarkan(nid)})")

    bagian("C. Pembayaran yang ditolak tidak meninggalkan jurnal atau baris outbox")
    harap(curl("POST", "/transfers", {"ke": 418, "nominal": 200000}, dimas, tampil=False)[0], 201, "Dimas bayar 200000")
    sebelum = sql("SELECT (SELECT count(*) FROM jurnal) AS jurnal, (SELECT count(*) FROM outbox) AS outbox", tampil=False)[0]
    catat(f"# sebelum: jurnal {sebelum[0]}, outbox {sebelum[1]} (saldo Dimas tinggal Rp50.000 sesudah pembayaran pertama)")
    s, _ = curl("POST", "/transfers", {"ke": 418, "nominal": 200000}, dimas)
    harap(s, 422, "saldo Dimas kurang")
    sql("SELECT (SELECT count(*) FROM jurnal) AS jurnal, (SELECT count(*) FROM outbox) AS outbox")
    harap(sql("SELECT (SELECT count(*) FROM jurnal), (SELECT count(*) FROM outbox)", tampil=False)[0], sebelum, "tidak ada baris dari bayar yang ditolak")

    bagian("D. COMMIT ditolak database: jurnal dan baris outbox sama-sama batal")
    catat("# Transaction ditulis tangan sebagai pemilik schema: jurnal tidak seimbang (-1000 dan +900) dan satu baris outbox")
    with d.sambung(autocommit=False) as c:
        for q in ("INSERT INTO jurnal (id, jenis, keterangan, dibuat_oleh) VALUES (99999, 'bayar', 'tidak seimbang', 419)",
                  "INSERT INTO posting (jurnal_id, buku_id, jumlah) SELECT 99999, id, -1000 FROM buku WHERE akun_id = 419",
                  "INSERT INTO posting (jurnal_id, buku_id, jumlah) SELECT 99999, id, 900 FROM buku WHERE akun_id = 418",
                  "INSERT INTO outbox (jurnal_id, akun_id, kelas, jenis, payload) VALUES (99999, 418, 0, 'bayar', '{}')"):
            catat("=> " + q)
            catat(c.execute(q).statusmessage)
        catat("=> COMMIT")
        try:
            c.commit()
            gagal("COMMIT jurnal tidak seimbang harus ditolak")
        except psycopg.Error as e:
            harap((e.sqlstate, e.diag.constraint_name), ("23514", "jurnal_seimbang"), "COMMIT tidak seimbang")
            catat(f"ERROR:  {e.diag.message_primary}")
            catat(f"   -- SQLSTATE {e.sqlstate} · constraint {e.diag.constraint_name}")
    sql("SELECT (SELECT count(*) FROM jurnal WHERE id = 99999) AS jurnal_99999, (SELECT count(*) FROM outbox WHERE jurnal_id = 99999) AS outbox_99999")
    harap(satu("SELECT count(*) FROM outbox WHERE jurnal_id = 99999"), 0, "outbox dibatalkan bersama jurnal")

    bagian("E. Transfer antar karyawan dan top-up CSV juga menulis outbox, dengan kelas berbeda")
    d.push_reset()
    csv = "nomor_karyawan,nominal\nK10001,250000\nK10002,250000\nK10003,250000\n"
    s, isi = curl("POST", "/topup?keterangan=Tunjangan%20makan%20minggu%202", csv, admin, "text/csv",
                  tampil_body="nomor_karyawan,nominal\\nK10001,250000\\nK10002,250000\\nK10003,250000\\n")
    harap((s, j(isi)), (200, {"akun": 3, "total": 750000}), "top-up 3 akun")
    s, h = curl("POST", "/kiriman", {"ke_nomor_karyawan": "K00417", "nominal": 20000, "catatan": "patungan"}, budi)
    harap(s, 201, "kiriman Budi ke Dimas")
    sql("SELECT kelas, jenis, status, count(*) AS baris FROM outbox WHERE status = 'menunggu' GROUP BY kelas, jenis, status ORDER BY kelas")
    curl("GET", "/lab/outbox")

    bagian("F. Kelas menentukan urutan: uang (kelas 0) dikirim sebelum top-up (kelas 1) walau nomornya lebih besar")
    catat("# worker dengan -serentak 1 supaya urutan kirim bisa dibaca dari urutan di layanan push")
    d.worker(["-serentak", "1"])
    diterima = d.push_diterima(True)
    token = [x["token"] for x in diterima["daftar"]]
    harap(token, ["tiruan-418", "tiruan-417", "tiruan-10001", "tiruan-10002", "tiruan-10003"], "urutan kirim menurut kelas")
    catat("urutan di layanan push: " + " -> ".join(token))
    catat("# Dua baris kelas 0 lebih dulu menurut nomor (bayar Dimas dari bagian C ke Warung Ani 418, lalu transfer ke Dimas 417),")
    catat("# lalu tiga top-up (kelas 1), walau nomor top-up lebih kecil dari nomor transfer")
    sql("SELECT status, count(*) FROM outbox GROUP BY status ORDER BY status")

    bagian("G. Worker berhenti mendadak di antara kirim dan tandai terkirim: klaim habis, baris dikirim ulang, notifikasi_id sama")
    d.push_reset()
    harap(curl("POST", "/transfers", {"ke": 418, "nominal": 10000}, budi, tampil=False)[0], 201, "bayar untuk bagian G")
    r = subprocess.run([str(d.BIN), "-peran", "worker", "-sekali", "-klaim", "1s", "-lab-henti-sebelum-tandai",
                        "-push-url", f"http://127.0.0.1:{PORT_PUSH}"], env=dict(d.ENV, DATABASE_URL=d.db_app()),
                       capture_output=True, text=True)
    catat("$ ./api-t3 -peran worker -sekali -klaim 1s -lab-henti-sebelum-tandai   # lab: berhenti sesudah push berhasil")
    catat(f"# exit status {r.returncode}")
    harap(r.returncode, 3, "worker berhenti mendadak")
    sql("SELECT status, percobaan, klaim_sampai IS NOT NULL AS masih_dipegang FROM outbox WHERE status = 'menunggu'")
    harap(d.push_diterima()["jumlah"], 1, "push sudah menerima satu pesan")
    catat("push tiruan menerima: 1 pesan; barisnya tetap menunggu karena tidak sempat ditandai terkirim")
    d.tunggu(lambda: satu("SELECT count(*) FROM outbox WHERE status = 'menunggu' AND klaim_sampai < now()") == 1,
             "klaim 1 detik habis", batas=5)
    catat("# klaim habis (1 detik): baris boleh dipegang worker lain")
    d.worker(["-klaim", "1s"])
    diterima = d.push_diterima()
    harap((diterima["jumlah"], diterima["notifikasi_berbeda"], diterima["notifikasi_ganda"]), (2, 1, 1), "kirim ulang, notifikasi_id sama")
    catat("push tiruan menerima: 2 pesan, 1 notifikasi_id (pengiriman ulang itu benar; app menyaring notifikasi_id, ADR 25)")
    sql("SELECT status, percobaan FROM outbox ORDER BY id DESC LIMIT 1")
    tulis("outbox.txt", "pemberitahuan lewat outbox, satu transaction dengan jurnal", keputusan="951")


# ---------- push.txt ----------

def kirim_satu(token, ke=418, nominal=10000):
    s, isi = curl("POST", "/transfers", {"ke": ke, "nominal": nominal}, token, tampil=False)
    harap(s, 201, f"bayar ke {ke}")
    return j(isi)["id"]


def rekam_push():
    siapkan_data()
    mulai_semua(tampil="# server: ./api-t3 -lab; layanan push tiruan dengan empat mode (jawab, lambat, gantung, 503)")
    budi = login("budi@lestari.example", label="Budi")

    bagian("A. Layanan push lambat tetapi menjawab (300 ms): pembayaran selesai cepat, worker menunggu sendiri")
    d.push_mode("lambat", ms=300)
    t0 = time.time()
    kirim_satu(budi)
    catat("# POST /transfers selesai, push baru menerima 0 pesan (pengiriman bukan bagian dari pembayaran)")
    harap(time.time() - t0 < 1.0, True, "bayar cepat walau push lambat")
    harap(d.push_diterima()["jumlah"], 0, "push belum menerima")
    t0 = time.time()
    d.worker()
    harap(0.25 < time.time() - t0 < 2.0, True, "worker menunggu sekitar 300 ms")
    sql("SELECT status, percobaan FROM outbox")

    bagian("B. Layanan push menjawab 503 dua kali: ditunda dengan backoff dan jitter, berhasil di percobaan ke-3")
    d.push_reset()
    d.push_mode("503", kali=2)
    kirim_satu(budi)
    for putaran in (1, 2, 3):
        time.sleep(0.1)
        d.worker(["-backoff", "10ms"], tampil=False)
        st = sql("SELECT status, percobaan FROM outbox ORDER BY id DESC LIMIT 1", tampil=False)[0]
        catat(f"putaran {putaran}: outbox.status = {st[0]}, percobaan = {st[1]}")
    harap(sql("SELECT status, percobaan FROM outbox ORDER BY id DESC LIMIT 1", tampil=False)[0], ("terkirim", 3), "terkirim di percobaan 3")
    diterima = d.push_diterima()
    catat(f"push tiruan menerima: {diterima['jumlah']} permintaan untuk {diterima['notifikasi_berbeda']} notifikasi_id")
    harap((diterima["jumlah"], diterima["notifikasi_berbeda"]), (3, 1), "tiga permintaan, satu notifikasi_id")
    catat("# Backoff = acak antara 0 dan min(60 detik, 2 detik x 2^(percobaan-1)) (full jitter); di sini -backoff 10ms supaya cepat")

    bagian("C. 503 terus-menerus: sesudah 5 percobaan baris masuk dead-letter (status mati), tidak dikirim lagi")
    d.push_reset()
    d.push_mode("503")
    kirim_satu(budi)
    for putaran in range(1, 7):
        time.sleep(0.8)   # lebih lama dari batas backoff 10 ms x 2^4 = 160 ms, ditambah bufer
        d.worker(["-backoff", "10ms"], tampil=False)
        st = sql("SELECT status, percobaan FROM outbox ORDER BY id DESC LIMIT 1", tampil=False)[0]
        catat(f"putaran {putaran}: outbox.status = {st[0]}, percobaan = {st[1]}")
    harap(sql("SELECT status, percobaan FROM outbox ORDER BY id DESC LIMIT 1", tampil=False)[0], ("mati", 5), "dead-letter di percobaan 5")
    harap(d.push_diterima()["jumlah"], 5, "push menerima 5 kali, bukan 6")
    catat("push tiruan menerima: 5 permintaan (putaran ke-6 tidak mengirim apa pun)")
    sql("SELECT status, count(*) FROM outbox GROUP BY status ORDER BY status")

    bagian("D. Token tidak terdaftar (404): perangkat dinonaktifkan, baris dilewati, tidak diulang")
    d.push_reset()
    d.push_mode("jawab")
    sql("UPDATE perangkat SET token_push = 'mati-418' WHERE akun_id = 418")
    kirim_satu(budi)
    d.worker()
    sql("SELECT status, percobaan FROM outbox ORDER BY id DESC LIMIT 1")
    sql("SELECT akun_id, aktif FROM perangkat WHERE akun_id = 418")
    harap(sql("SELECT status FROM outbox ORDER BY id DESC LIMIT 1", tampil=False)[0][0], "dilewati", "token mati dilewati")
    harap(d.push_diterima()["jumlah"], 1, "satu permintaan ke push untuk token mati")
    catat("push tiruan menerima: 1 permintaan (yang dijawab 404)")
    catat("\n# Pembayaran berikutnya ke Ani: tidak ada perangkat aktif, baris dilewati tanpa memanggil layanan push")
    kirim_satu(budi)
    d.worker()
    sql("SELECT status, percobaan FROM outbox ORDER BY id DESC LIMIT 1")
    harap(d.push_diterima()["jumlah"], 1, "tidak ada permintaan baru ke push")
    catat("push tiruan menerima: tetap 1 permintaan")
    sql("UPDATE perangkat SET token_push = 'tiruan-418', aktif = true WHERE akun_id = 418", tampil=False)

    bagian("E. Layanan push menggantung (menerima, tidak menjawab): client berhenti di batas 3 detik, pesan sama dikirim ulang")
    d.push_reset()
    d.push_mode("gantung", kali=1)
    kirim_satu(budi)
    t0 = time.time()
    d.worker(["-backoff", "100ms"])
    lama = time.time() - t0
    harap(2.9 < lama < 4.5, True, "client push berhenti di batas 3 detik")
    catat(f"# panggilan ke push berhenti sesudah {round(lama)} detik (batas waktu client, ADR 22); sebelum itu worker menunggu")
    sql("SELECT status, percobaan FROM outbox ORDER BY id DESC LIMIT 1")
    time.sleep(0.3)
    d.worker(["-backoff", "100ms"])
    sql("SELECT status, percobaan FROM outbox ORDER BY id DESC LIMIT 1")
    diterima = d.push_diterima()
    harap((diterima["jumlah"], diterima["notifikasi_berbeda"], diterima["notifikasi_ganda"]), (2, 1, 1), "notifikasi sama diterima dua kali")
    catat("push tiruan menerima: 2 permintaan, 1 notifikasi_id, 1 notifikasi_id ganda (permintaan pertama tidak pernah dijawab)")
    catat("# At-least-once: pengiriman ulang itu benar; penerima (app) yang menyaring notifikasi_id yang sudah tampil (ADR 25)")

    bagian("F. Versi benar (ADR 22): push menggantung, pembayaran tetap selesai cepat dan tidak ada koneksi yang tertahan")
    d.push_reset()
    d.push_mode("gantung")
    t0 = time.time()
    kirim_satu(budi)
    harap(time.time() - t0 < 1.0, True, "bayar cepat walau push menggantung")
    catat("# POST /transfers selesai dalam kurang dari 1 detik, padahal layanan push menggantung")
    sql("SELECT coalesce(state, '(tanpa state)') AS state, count(*) FROM pg_stat_activity WHERE application_name = 'api-t3'"
        " AND state = 'idle in transaction' GROUP BY 1", tampil=True)
    harap(satu("SELECT count(*) FROM pg_stat_activity WHERE application_name = 'api-t3' AND state = 'idle in transaction'"), 0,
          "tidak ada idle in transaction")
    catat("# (0 baris di atas: tidak ada koneksi api-t3 yang diam di dalam transaction)")
    harap(curl("GET", "/akun/419", token=budi, tampil=False, maks=3)[0], 200, "layar lain tetap jalan")
    catat("# GET /akun/419 tetap 200 selama push menggantung; barisnya menunggu di outbox")
    sql("SELECT status, count(*) FROM outbox WHERE status = 'menunggu' GROUP BY status")
    tulis("push.txt", "layanan push tiruan: lambat, 503, token mati, menggantung; retry dan dead-letter", keputusan="951")


# ---------- rentan.txt ----------

def rekam_rentan():
    siapkan_data()
    bagian("A. M18 · mode rentan push-dalam-tx: push di dalam transaction, client tanpa batas waktu, push menggantung")
    d.mulai_push()
    d.push_mode("gantung")
    d.mulai_api(["-rentan", "push-dalam-tx"], tampil="$ ./api-t3 -rentan push-dalam-tx -lab   # push timeout 0 (tanpa batas), idle-tx 0 (mati), pool 10")
    for l in d.log_server():
        catat("server log: " + l)
    warung = [502, 503, 505, 506, 507, 508, 509, 510, 511, 512]
    budi = login("budi@lestari.example", label="Budi")
    token = [budi] + [login(f"karyawan{10001 + i}@lestari.example", label=f"Karyawan {10001 + i}") for i in range(9)]
    catat("# Budi dan sembilan karyawan lain membayar sepuluh warung berbeda (tanpa rebutan lock buku), semuanya bersamaan")
    hasil, thread = serentak([lambda t=t, w=w: curl("POST", "/transfers", {"ke": w, "nominal": 10000}, t, tampil=False)
                              for t, w in zip(token, warung)])
    d.tunggu(lambda: d.push_diterima()["menggantung"] == 10, "10 request push menggantung")
    curl("GET", "/lab/pool")
    sql("SELECT state, count(*) FROM pg_stat_activity WHERE application_name = 'api-t3' GROUP BY state ORDER BY state")
    catat("\n# Request ke-11: Budi hanya membuka saldonya (GET /akun/419). Server butuh satu koneksi bebas bahkan untuk memeriksa sesinya.")
    s, _ = curl("GET", "/akun/419", token=budi, maks=2)
    harap(s, 0, "request ke-11 tidak dijawab")
    catat("# curl berhenti menunggu sesudah 2 detik. Semua layar ikut membeku, bukan hanya pembayaran (M18).")
    curl("GET", "/lab/pool")
    harap(sql("SELECT count(*) FROM pg_stat_activity WHERE application_name = 'api-t3' AND state = 'idle in transaction'", tampil=False)[0][0], 10, "10 koneksi idle in transaction")

    bagian("B. Layanan push dimatikan: sepuluh pembayaran selesai, tanpa baris outbox, kegagalan push hanya ada di log")
    d.stop(PORT_PUSH, tampil="$ kill -TERM <pid push tiruan>")
    tunggu_semua(thread)
    catat("10 pembayaran: " + ringkas_status(hasil))
    harap(ringkas_status(hasil), "201 x10", "sepuluh pembayaran selesai")
    sql("SELECT (SELECT count(*) FROM jurnal WHERE jenis = 'bayar') AS jurnal_bayar, (SELECT count(*) FROM outbox) AS outbox")
    harap(satu("SELECT count(*) FROM outbox"), 0, "mode rentan tidak menulis outbox")
    log = [l for l in d.log_server() if "push gagal, hanya dicatat" in l]
    catat(f"server log: {len(log)} baris 'push gagal, hanya dicatat: ...' (satu per pembayaran)")
    harap(len(log), 10, "sepuluh baris log push gagal")
    catat("# Sepuluh pemberitahuan hilang tanpa ada yang tahu, kecuali yang membaca log (M18, syarat 2 Sinta)")
    d.stop(PORT, tampil="$ kill -TERM <pid api-t3>   # mode rentan dimatikan")

    bagian("C. M19 · poller kursor (dibuat, id): baris yang COMMIT belakangan tertinggal di belakang kursor")
    d.mulai_push()
    d.mulai_api(tampil="$ ./api-t3 -lab   # versi benar untuk pembayaran")
    d.mulai_worker("kursor", ["-rentan", "kursor", "-selang", "20ms"])
    catat("$ ./api-t3 -peran worker -rentan kursor -selang 20ms &   # poller versi pertama, berputar terus")
    budi = login("budi@lestari.example", label="Budi")
    dimas = login("dimas@lestari.example", label="Dimas")
    catat("# 1. Transaction A (tangan) memegang lock buku Citra")
    a = psycopg.connect(d.PEMILIK + f" options=-csearch_path={d.SCHEMA}", autocommit=False)
    catat("=> BEGIN; SELECT id FROM buku WHERE akun_id = 504 FOR UPDATE;")
    a.execute("SELECT id FROM buku WHERE akun_id = 504 FOR UPDATE")
    catat("# 2. Budi mengirim Rp20.000 ke Citra (transaction B): mulai lebih dulu, lalu menunggu lock yang dipegang A")
    hasil_b, thread_b = serentak([lambda: curl("POST", "/kiriman", {"ke_nomor_karyawan": "K00504", "nominal": 20000}, budi, tampil=False)])
    d.tunggu(lambda: satu("SELECT count(*) FROM pg_stat_activity WHERE application_name = 'api-t3' AND wait_event_type = 'Lock'") >= 1,
             "transaction B menunggu lock")
    catat("# 3. Dimas membayar Warung Ani (transaction C): mulai sesudah B, tidak butuh lock yang dipegang, COMMIT lebih dulu")
    s, isi = curl("POST", "/transfers", {"ke": 418, "nominal": 25000}, dimas)
    harap(s, 201, "C bayar")
    jurnal_c = j(isi)["id"]
    d.tunggu(lambda: satu(f"SELECT status FROM outbox WHERE jurnal_id = {jurnal_c}") == "terkirim", "poller kursor mengirim C")
    catat("# 4. Poller sudah mengirim C dan kursornya maju ke (dibuat C, id C). Sekarang A melepas lock dan B selesai.")
    a.commit()
    a.close()
    catat("=> COMMIT   # transaction A")
    tunggu_semua(thread_b)
    harap(hasil_b[0][0], 201, "B selesai")
    time.sleep(1.5)
    sql("SELECT o.id AS outbox_id, o.jurnal_id, o.jenis, o.status,"
        " o.dibuat < (SELECT dibuat FROM outbox WHERE status = 'terkirim') AS dibuat_sebelum_c FROM outbox o ORDER BY o.id")
    harap(sql("SELECT status FROM outbox WHERE jenis = 'transfer'", tampil=False)[0][0], "menunggu", "B tertinggal")
    catat("# B punya nomor outbox lebih besar tetapi `dibuat` (awal transaction) lebih awal dari C: ia ada di belakang kursor poller.")
    catat(f"push tiruan menerima: {d.push_diterima()['jumlah']} pesan (hanya C); dalam 1,5 detik pengamatan (puluhan putaran poller) B tidak terkirim")
    harap(d.push_diterima()["jumlah"], 1, "hanya C terkirim")
    d.stop("kursor", tampil="$ kill -TERM <pid poller kursor>")
    catat("\n# Perbaikan (ADR 24): worker mengklaim baris (FOR UPDATE SKIP LOCKED), tanpa kursor")
    d.worker()
    sql("SELECT id, jurnal_id, jenis, status FROM outbox ORDER BY id")
    harap(satu("SELECT count(*) FROM outbox WHERE status = 'terkirim'"), 2, "B terkirim lewat klaim")
    d.stop(PORT)
    d.stop(PORT_PUSH)

    bagian("D. M27 · tanpa kelas (urut nomor) lawan dengan kelas: top-up massal di depan pembayaran uang")
    d.mulai_push()
    d.mulai_api(tampil="$ ./api-t3 -lab")
    admin = login("admin.tunjangan@lestari.example", label="admin")
    budi = login("budi@lestari.example", label="Budi")

    def isi_antrean(awal):
        csv = "nomor_karyawan,nominal\n" + "".join(f"K{n},250000\n" for n in range(awal, awal + 3))
        harap(curl("POST", "/topup?keterangan=Tunjangan%20makan", csv, admin, "text/csv", tampil=False)[0], 200, "top-up")
        harap(curl("POST", "/kiriman", {"ke_nomor_karyawan": "K00417", "nominal": 10000}, budi, tampil=False)[0], 201, "kiriman")

    for judul, args, awal, harus in (
            ("dengan kelas (bawaan)", ["-serentak", "1"], 10011, ["tiruan-417", "tiruan-10011", "tiruan-10012", "tiruan-10013"]),
            ("tanpa kelas, mode rentan urut-waktu", ["-serentak", "1", "-rentan", "urut-waktu"], 10021,
             ["tiruan-10021", "tiruan-10022", "tiruan-10023", "tiruan-417"])):
        d.push_reset()
        isi_antrean(awal)
        catat(f"\n# Antrean: tiga top-up (kelas 1), lalu satu transfer ke Dimas (kelas 0, nomor terbesar). Worker {judul}")
        d.worker(args)
        token_urut = [x["token"] for x in d.push_diterima(True)["daftar"]]
        harap(token_urut, harus, f"urutan kirim {judul}")
        catat("urutan di layanan push: " + " -> ".join(token_urut))
    catat("# Tanpa kelas, pembayaran uang menunggu di belakang semua top-up; dengan kelas, di depan (ADR 32, M27)")
    tulis("rentan.txt", "mode rentan push-dalam-tx (M18), kursor (M19), urut-waktu (M27)", keputusan="953")


# ---------- katalog.txt ----------

def rekam_katalog():
    siapkan_data()
    mulai_semua(tampil="# server: ./api-t3 -lab")
    budi = login("budi@lestari.example", label="Budi")
    ani = login("warung.ani@lestari.example", label="Warung Ani")
    sari = login("warung.sari@lestari.example", label="Warung Sari")
    hr = login("hr.jakarta@lestari.example", label="HR Jakarta")
    nasi, ayam = id_produk(418, "Nasi goreng"), id_produk(418, "Ayam geprek")

    bagian("A. Katalog per kota: Budi melihat menu di kotanya (Jakarta)")
    s, isi = curl("GET", "/katalog", token=budi, tampil=False)
    harap(s, 200, "katalog")
    isi_kota = isi
    kat = j(isi)
    n_item = sum(len(w["menu"]) for w in kat["warung"])
    catat("$ curl -i 'GET /katalog' -H 'Authorization: Bearer <token sesi Budi>'")
    catat(f"HTTP/1.1 200 OK   # kota {kat['kota']}: {len(kat['warung'])} warung, {n_item} item, jawaban {len(isi)} byte")
    harap((len(kat["warung"]), n_item), (12, 480), "12 warung x 40 item di kota 1")
    s, isi = curl("GET", "/katalog?warung=418", token=budi, tampil=False)
    harap(s, 200, "menu Ani")
    for m in j(isi)["warung"][0]["menu"][:3]:
        catat("Warung Ani: " + json.dumps(m, ensure_ascii=False, separators=(",", ":")))
    sql("SELECT a.nama AS warung, k.nama AS kota, count(p.id) AS item, min(p.harga) AS termurah, max(p.harga) AS termahal"
        " FROM akun a JOIN kota k ON k.id = a.kota_id JOIN produk p ON p.akun_id = a.id WHERE a.jenis = 'warung'"
        " GROUP BY a.id, a.nama, k.nama, k.id ORDER BY k.id, a.id LIMIT 3")
    per_item = round(len(isi_kota) / n_item)
    catat(f"# Diukur: {len(isi_kota)} byte untuk {n_item} item = {per_item} byte per item (JSON); 2.400 item enam kota = {round(2400 * len(isi_kota) / n_item / 1000)} KB")
    catat("# R3-37 menulis 720 KB di 300 byte per item (Asumsi): ukuran satu item di jawaban ini lebih kecil dari asumsi itu")
    catat("# harga_efektif = harga dikurangi promo kota yang sedang berlaku; tanpa promo sama dengan harga")

    bagian("B. HR Jakarta membuat promo 10% (tanpa pengumuman): harga efektif di katalog berubah, harga dasar tidak")
    mulai = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
    selesai = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
    s, isi = curl("POST", "/promo", {"judul": "Promo makan siang", "potongan_persen": 10, "mulai": mulai, "selesai": selesai}, hr)
    harap((s, j(isi)), (201, {"id": 1, "diumumkan": 0}), "promo HR")
    s, isi = curl("GET", f"/katalog?warung=418", token=budi, tampil=False)
    nasi_json = [m for m in j(isi)["warung"][0]["menu"] if m["id"] == nasi][0]
    catat("katalog Warung Ani, item Nasi goreng: " + json.dumps(nasi_json, ensure_ascii=False, separators=(",", ":")))
    harap((nasi_json["harga"], nasi_json["harga_efektif"]), (25000, 22500), "harga efektif promo")
    s, _ = curl("POST", "/promo", {"judul": "Promo", "potongan_persen": 10, "mulai": mulai, "selesai": selesai}, budi)
    harap(s, 403, "karyawan membuat promo")

    bagian("C. Harga yang ditagih dari database, bukan dari layar: HP Budi masih menampilkan Rp25.000 (katalog lama)")
    s, isi = curl("POST", "/pesanan", {"produk_id": nasi, "porsi": 1}, budi)
    harap((s, j(isi)["nominal"], j(isi)["harga_satuan"], j(isi)["potongan_persen"], j(isi)["saldo"], j(isi)["stok_sisa"]),
          (201, 22500, 22500, 10, 227500, 49), "pesanan dengan promo")
    sql(f"SELECT id AS produk, stok, versi FROM produk WHERE id = {nasi}")
    sql("SELECT j.id, j.keterangan, p.jumlah FROM jurnal j JOIN posting p ON p.jurnal_id = j.id WHERE j.id = 10001 ORDER BY p.id")
    s, _ = curl("POST", "/pesanan", {"produk_id": nasi, "porsi": 11}, budi)
    harap(s, 422, "porsi lebih dari 10")
    sql(f"UPDATE produk SET stok = 1 WHERE id = {ayam}", tampil=False)
    s, _ = curl("POST", "/pesanan", {"produk_id": ayam, "porsi": 2}, budi)
    harap(s, 409, "stok tidak cukup")
    catat("# Stok 1, pesan 2: 409 stok-habis, tidak ada jurnal baru")

    bagian("D. Ubah harga dan stok bersyarat versi (optimistic lock): yang basi ditolak dengan keadaan terkini")
    s, isi = curl("PATCH", f"/produk/{nasi}", {"harga": 26000, "versi": 2}, ani)
    harap((s, j(isi)["versi"], j(isi)["harga"]), (200, 3, 26000), "ubah dengan versi 2")
    s, isi = curl("PATCH", f"/produk/{nasi}", {"stok": 0, "versi": 2}, ani)
    harap((s, j(isi)["sekarang"]["versi"]), (409, 3), "versi basi")
    harap(satu(f"SELECT stok FROM produk WHERE id = {nasi}"), 49, "409 tidak mengubah baris")
    s, _ = curl("PATCH", f"/produk/{nasi}", {"stok": 0, "versi": 3}, budi)
    harap(s, 403, "karyawan mengubah produk")
    s, _ = curl("PATCH", f"/produk/{nasi}", {"stok": 0, "versi": 3}, sari)
    harap(s, 404, "warung lain mengubah produk Ani")
    s, _ = curl("PATCH", f"/produk/{nasi}", {"stok": 0}, ani)
    harap(s, 400, "versi wajib")

    bagian("E. Catatan pada pembayaran: paling banyak 100 karakter, HTML disimpan apa adanya")
    s, _ = curl("POST", "/transfers", {"ke": 418, "nominal": 10000, "catatan": "x" * 101}, budi, tampil_body='{"ke":418,"nominal":10000,"catatan":"<101 huruf x>"}')
    harap(s, 422, "catatan 101 karakter")
    s, _ = curl("POST", "/transfers", {"ke": 418, "nominal": 10000, "catatan": "baris satu\nbaris dua"}, budi)
    harap(s, 422, "catatan berisi baris baru")
    html = "<img src=x onerror=alert(1)>"
    s, isi = curl("POST", "/transfers", {"ke": 418, "nominal": 10000, "catatan": html}, budi)
    harap(s, 201, "catatan HTML")
    s, isi = curl("GET", "/warung/418/penerimaan?batas=1", token=ani)
    harap(j(isi)["penerimaan"][0]["keterangan"], f"Bayar Budi ke Warung Ani: {html}", "catatan tersimpan apa adanya")
    catat("# Server menyimpan teks; mengamankannya saat ditampilkan adalah urusan dasbor (ADR 30). Jurnal tidak bisa dihapus (append-only).")

    bagian("F. Pengumuman promo: satu baris outbox kelas 2 per karyawan di kota itu")
    s, isi = curl("POST", "/promo", {"judul": "Promo sore", "potongan_persen": 5, "mulai": selesai, "selesai": selesai,
                                      "umumkan": True}, hr, tampil=False)
    harap(s, 422, "selesai harus sesudah mulai")
    sel2 = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%SZ")
    s, isi = curl("POST", "/promo", {"judul": "Promo sore", "potongan_persen": 5, "mulai": selesai, "selesai": sel2, "umumkan": True}, hr)
    harap((s, j(isi)), (201, {"id": 2, "diumumkan": 1000}), "pengumuman 1000 karyawan Jakarta")
    sql("SELECT kelas, jenis, status, count(*) AS baris FROM outbox GROUP BY kelas, jenis, status ORDER BY kelas, jenis")
    sql("SELECT count(*) AS karyawan_jakarta FROM akun WHERE jenis = 'karyawan' AND kota_id = 1")

    bagian("G. Laporan harian dan ekspor CSV untuk dasbor (hanya pemilik warung)")
    hari = hari_ini()
    s, isi = curl("GET", f"/warung/418/laporan.csv?dari={hari}&sampai={hari}", token=ani)
    harap(s, 200, "laporan csv")
    harap(isi.splitlines()[0], "tanggal,transaksi,total", "header csv")
    s, _ = curl("GET", f"/warung/418/laporan.csv?dari={hari}&sampai={hari}", token=sari)
    harap(s, 404, "laporan warung lain")
    tulis("katalog.txt", "katalog per kota, promo HR, harga dari database, ubah bersyarat versi, catatan, laporan", keputusan="952")


# ---------- sinkron.txt ----------

def waktu_lalu(jam):
    return (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=jam)).strftime("%Y-%m-%dT%H:%M:%SZ")


def rekam_sinkron():
    siapkan_data()
    mulai_semua(tampil="# server: ./api-t3 -lab")
    ani = login("warung.ani@lestari.example", label="Warung Ani")
    sari = login("warung.sari@lestari.example", label="Warung Sari")
    budi = login("budi@lestari.example", label="Budi")
    ayam = id_produk(418, "Ayam geprek")

    bagian("A. HP warung mendaftarkan token push; token yang sama di akun lain dipindahkan (HP berpindah tangan)")
    s, isi = curl("POST", "/perangkat", {"platform": "android", "token_push": "hp-ani-1"}, ani)
    harap((s, j(isi)), (201, {"id": 10061}), "daftar perangkat Ani")
    hp_ani = j(isi)["id"]
    s, isi = curl("POST", "/perangkat", {"platform": "android", "token_push": "hp-ani-1"}, ani)
    harap((s, j(isi)["id"]), (201, hp_ani), "daftar ulang token yang sama")
    s, isi = curl("POST", "/perangkat", {"platform": "ios", "token_push": "hp-ani-2"}, ani)
    harap((s, j(isi)["id"]), (201, 10063), "HP kedua Ani")
    hp_ani2 = 10063
    catat("# Nomor 10062 terpakai INSERT yang bentrok pada token yang sama: nextval tidak dikembalikan (PostgreSQL, fungsi sequence)")
    s, isi = curl("POST", "/perangkat", {"platform": "symbian", "token_push": "x"}, ani)
    harap(s, 422, "platform tidak dikenal")
    catat("# HP berpindah tangan: Budi memakai token itu lebih dulu, lalu Dimas mendaftarkan token yang sama")
    dimas = login("dimas@lestari.example", label="Dimas")
    s, isi = curl("POST", "/perangkat", {"platform": "ios", "token_push": "hp-bekas"}, budi, tampil=False)
    harap(s, 201, "token HP bekas, Budi")
    hp_bekas = j(isi)["id"]
    s, isi = curl("POST", "/perangkat", {"platform": "ios", "token_push": "hp-bekas"}, dimas, tampil=False)
    harap((s, j(isi)["id"]), (201, hp_bekas), "token yang sama dipindahkan, nomor perangkat tetap")
    sql("SELECT id, akun_id, platform, aktif FROM perangkat WHERE id > 10060 ORDER BY id")
    harap(satu(f"SELECT akun_id FROM perangkat WHERE id = {hp_bekas}"), 417, "token pindah ke Dimas")
    catat("# Satu token hanya punya satu akun: perangkat bekas Budi sekarang atas nama Dimas (417)")

    bagian("B. Jumat 16.50: Ani mencatat 'Ayam geprek habis' di HP (stok 0). Operasi masuk antrean HP dengan kunci sendiri")
    catat("# Produk Ayam geprek: stok 30, versi 1. dibuat_di_hp diperankan 62 jam sebelum 'Senin 07.00' (tidak menunggu 62 jam).")
    op = {"kunci": "ani-hp1-0001", "perangkat_id": hp_ani, "produk_id": ayam, "jenis": "stok", "nilai": 0, "versi_dasar": 1,
          "dibuat_di_hp": waktu_lalu(62)}
    s, isi = curl("POST", "/sinkron", op, ani)
    harap((s, j(isi)["status"], j(isi)["ulang"], j(isi)["sekarang"]["versi"], j(isi)["sekarang"]["stok"]), (200, "diterapkan", False, 2, 0), "sinkron pertama")
    sql(f"SELECT kunci, jenis, nilai, versi_dasar, status FROM operasi_sinkron")

    bagian("C. Jawaban hilang, HP mengirim ulang 62 jam kemudian dengan kunci yang sama: dikenali, tidak diterapkan dua kali")
    sql("UPDATE operasi_sinkron SET dibuat_di_hp = dibuat_di_hp - interval '62 hours'", tampil=False)
    catat("# Kunci idempotensi tabel kunci_idempotensi dibuang sesudah 24 jam (ADR 14); operasi_sinkron menyimpan kuncinya 14 hari")
    op2 = dict(op, dibuat_di_hp=waktu_lalu(62))
    s, isi = curl("POST", "/sinkron", op2, ani)
    harap((s, j(isi)["status"], j(isi)["ulang"], j(isi)["sekarang"]["versi"]), (200, "diterapkan", True, 2), "kirim ulang kunci sama")
    sql(f"SELECT id AS produk, stok, versi FROM produk WHERE id = {ayam}")
    sql("SELECT count(*) AS baris_operasi FROM operasi_sinkron")

    bagian("D. HP kedua Ani, masih melihat versi 1, mengubah stok ke 20: konflik, tidak ditimpa")
    op3 = {"kunci": "ani-hp2-0001", "perangkat_id": hp_ani2, "produk_id": ayam, "jenis": "stok", "nilai": 20, "versi_dasar": 1,
           "dibuat_di_hp": waktu_lalu(1)}
    s, isi = curl("POST", "/sinkron", op3, ani)
    harap((s, j(isi)["status"], j(isi)["sekarang"]["stok"], j(isi)["sekarang"]["versi"]), (409, "konflik", 0, 2), "konflik versi")
    sql("SELECT kunci, status, diterapkan IS NOT NULL AS diterapkan FROM operasi_sinkron ORDER BY dibuat_di_hp")
    catat("# Konfliknya ditampilkan di HP (stok sekarang 0, versi 2); Ani memilih. Memilih 20 berarti kunci baru dengan versi_dasar 2:")
    op4 = dict(op3, kunci="ani-hp2-0002", versi_dasar=2)
    s, isi = curl("POST", "/sinkron", op4, ani)
    harap((s, j(isi)["status"], j(isi)["sekarang"]["stok"], j(isi)["sekarang"]["versi"]), (200, "diterapkan", 20, 3), "pilihan Ani")

    bagian("E. Yang tidak boleh lewat sinkron: pembayaran, perangkat orang lain, queue lebih dari 7 hari, bukan warung")
    s, isi = curl("POST", "/sinkron", dict(op, kunci="ani-bayar", jenis="bayar"), ani)
    harap((s, j(isi)["errors"][0]["field"]), (422, "jenis"), "pembayaran lewat sinkron")
    s, isi = curl("POST", "/sinkron", dict(op, kunci="ani-lain", perangkat_id=1), ani)
    harap((s, j(isi)["errors"][0]["field"]), (422, "perangkat_id"), "perangkat orang lain")
    s, isi = curl("POST", "/sinkron", dict(op, kunci="ani-lama", dibuat_di_hp=waktu_lalu(8 * 24)), ani)
    harap((s, j(isi)["errors"][0]["field"]), (422, "dibuat_di_hp"), "operasi 8 hari")
    s, isi = curl("POST", "/sinkron", dict(op, kunci="ani-masa-depan", dibuat_di_hp=waktu_lalu(-48)), ani)
    harap((s, j(isi)["errors"][0]["field"]), (422, "dibuat_di_hp"), "jam HP dua hari di depan")
    s, isi = curl("POST", "/sinkron", dict(op, nilai=7, dibuat_di_hp=waktu_lalu(1)), ani)
    harap((s, j(isi)["errors"][0]["field"]), (422, "kunci"), "kunci sama isi beda")
    catat("# Kunci ani-hp1-0001 sudah dipakai untuk stok = 0; stok = 7 dengan kunci yang sama bukan pengiriman ulang")
    s, isi = curl("POST", "/sinkron", dict(op, kunci="sari-ani", perangkat_id=hp_ani), sari)
    harap(s, 422, "Sari memakai perangkat Ani")
    s, _ = curl("POST", "/sinkron", dict(op, kunci="budi"), budi)
    harap(s, 403, "karyawan mengirim sinkron")
    s, _ = curl("POST", "/sinkron", {"kunci": "k"}, ani)
    harap(s, 400, "field wajib")
    harap(satu("SELECT count(*) FROM operasi_sinkron"), 3, "hanya tiga operasi tersimpan")
    sql(f"SELECT id AS produk, stok, versi FROM produk WHERE id = {ayam}")

    bagian("F. Retensi: job -bersih membuang operasi sinkron yang lebih tua dari 14 hari (62 jam tidak tersentuh)")
    r = subprocess.run([str(d.BIN), "-bersih"], env=dict(d.ENV, DATABASE_URL=d.db_app()), capture_output=True, text=True)
    catat("$ ./api-t3 -bersih")
    catat(r.stdout.rstrip())
    harap(r.stdout.strip(), "bersih: 0 baris outbox selesai (lebih dari 7 hari), 0 operasi sinkron (lebih dari 14 hari)", "bersih tanpa yang lama")
    sql("UPDATE operasi_sinkron SET dibuat_di_hp = dibuat_di_hp - interval '15 days' WHERE kunci = 'ani-hp1-0001'")
    r = subprocess.run([str(d.BIN), "-bersih"], env=dict(d.ENV, DATABASE_URL=d.db_app()), capture_output=True, text=True)
    catat("$ ./api-t3 -bersih")
    catat(r.stdout.rstrip())
    harap(r.stdout.strip(), "bersih: 0 baris outbox selesai (lebih dari 7 hari), 1 operasi sinkron (lebih dari 14 hari)", "bersih operasi 15 hari")
    tulis("sinkron.txt", "perangkat dan sinkron offline bersyarat versi, kunci 14 hari", keputusan="952")


# ---------- web.txt ----------

def rekam_web():
    siapkan_data()
    mulai_semua(tampil="# server: ./api-t3 -lab")
    bagian("A. Login dasbor: cookie sesi tidak terbaca JavaScript, token CSRF dikirim di body")
    dapat = {}

    def daftar(kepala, isi):
        m = re.search(r"__Host-sesi=([0-9a-f]{64})", kepala)
        if m:
            dapat["cookie"] = m.group(1)
            samaran[m.group(1)] = "<token sesi web Ani>"
        try:
            dapat["csrf"] = j(isi)["csrf"]
            samaran[dapat["csrf"]] = "<token CSRF Ani>"
        except (KeyError, ValueError):
            pass

    s, isi = curl("POST", "/web/login", {"email": "warung.ani@lestari.example", "password": d.PASSWORD}, daftarkan=daftar)
    harap(s, 200, "login web Ani")
    cookie, csrf = f"__Host-sesi={dapat['cookie']}", dapat["csrf"]
    sql("SELECT jenis, csrf_hash IS NOT NULL AS punya_hash_csrf, count(*) FROM sesi GROUP BY jenis, csrf_hash IS NOT NULL ORDER BY jenis")
    catat("# Database menyimpan hash token sesi dan hash token CSRF, bukan tokennya")

    bagian("B. Membaca dengan cookie saja jalan; mengubah data butuh token CSRF")
    s, _ = curl("GET", "/warung/418/penerimaan?batas=1", cookie=cookie)
    harap(s, 200, "baca dengan cookie")
    s, isi = curl("PATCH", "/produk/1", {"stok": 5, "versi": 1}, cookie=cookie)
    harap((s, j(isi)["type"]), (403, "/problems/csrf"), "ubah tanpa token CSRF")
    s, _ = curl("PATCH", "/produk/1", {"stok": 5, "versi": 1}, cookie=cookie, kepala=["X-CSRF-Token: salah"])
    harap(s, 403, "token CSRF salah")
    s, _ = curl("PATCH", "/produk/1", {"stok": 5, "versi": 1}, cookie=cookie,
                kepala=[f"X-CSRF-Token: {csrf}", "Sec-Fetch-Site: cross-site"])
    harap(s, 403, "permintaan lintas situs")
    s, _ = curl("PATCH", "/produk/1", {"stok": 5, "versi": 1}, cookie=cookie,
                kepala=[f"X-CSRF-Token: {csrf}", "Origin: http://situs-lain.example"])
    harap(s, 403, "Origin asing")
    harap(satu("SELECT stok FROM produk WHERE id = 1"), 50, "empat penolakan tidak mengubah stok")
    s, isi = curl("PATCH", "/produk/1", {"stok": 5, "versi": 1}, cookie=cookie,
                  kepala=[f"X-CSRF-Token: {csrf}", "Sec-Fetch-Site: same-origin"], tampil_body='{"stok":5,"versi":1}')
    harap((s, j(isi)["stok"], j(isi)["versi"]), (200, 5, 2), "ubah dengan cookie dan token CSRF")
    catat("# Cookie SameSite=Lax saja tidak cukup: server memeriksa Sec-Fetch-Site, Origin, dan token (OWASP CSRF Prevention, R3-19)")

    bagian("C. Token dari satu jalur tidak berlaku di jalur lain; karyawan tidak punya dasbor")
    app = login("warung.ani@lestari.example", label="Warung Ani (app)")
    s, _ = curl("GET", "/warung/418/penerimaan?batas=1", cookie=f"__Host-sesi={app}")
    harap(s, 401, "token app sebagai cookie")
    web = cookie.split("=", 1)[1]
    s, _ = curl("GET", "/warung/418/penerimaan?batas=1", token=web)
    harap(s, 401, "token web sebagai Bearer")
    s, isi = curl("POST", "/web/login", {"email": "budi@lestari.example", "password": d.PASSWORD})
    harap((s, j(isi)["type"]), (403, "/problems/dilarang"), "karyawan login web")

    bagian("D. Logout dari dasbor menghapus sesi dan cookie; cookie lama tidak berlaku lagi")
    s, _ = curl("POST", "/logout", cookie=cookie, kepala=[f"X-CSRF-Token: {csrf}"])
    harap(s, 204, "logout web")
    s, _ = curl("GET", "/warung/418/penerimaan?batas=1", cookie=cookie)
    harap(s, 401, "cookie sesudah logout")
    tulis("web.txt", "sesi dasbor: cookie __Host-, token CSRF, jalur app dan web terpisah", keputusan="952")


# ---------- testing.txt ----------

def go_test(*args, env, cwd=d.HERE):
    r = subprocess.run(["go", *args], cwd=cwd, env=env, capture_output=True, text=True)
    teks = (r.stdout + r.stderr).replace("\t", "  ")
    teks = re.sub(r" \(\d+\.\d+s\)", "", teks)
    teks = re.sub(r"^(ok|FAIL)(\s+\S+)\s+[\d.]+s", r"\1\2", teks, flags=re.M)
    teks = re.sub(r"^(ok\s+\S+)\s+\(cached\)", r"\1", teks, flags=re.M)
    return r.returncode, teks.rstrip()


def rekam_testing():
    d.buat_schema(d.TES, hak=False)
    tes_db = d.db_pemilik(d.TES, "api-t3-tes")
    bagian("A. go vet, lalu tes aturan uang dan outbox dengan PostgreSQL sungguhan (schema tahap3_tes, skema akhir Tahap 3)")
    rc, teks = go_test("vet", "./...", env=d.ENV)
    catat("$ go vet ./...")
    catat(teks or "(tanpa temuan)")
    catat(f"# exit status {rc}")
    harap(rc, 0, "go vet")
    rc, teks = go_test("test", "-v", "-count=1", "-p", "1", "./...", env=dict(d.ENV, TEST_DATABASE_URL=tes_db))
    teks = "\n".join(l for l in teks.splitlines() if not l.startswith("?") and not l.startswith("=== RUN"))
    catat("$ TEST_DATABASE_URL=<schema tahap3_tes> go test -v -count=1 -p 1 ./...")
    catat(teks)
    catat(f"# exit status {rc}")
    harap(rc, 0, "go test")
    harap("--- SKIP" in teks, False, "tes dilewati")
    bagian("B. Tanpa TEST_DATABASE_URL: tes database dilewati, tes tanpa database tetap jalan")
    rc, teks = go_test("test", "-count=1", "./...", env={k: v for k, v in d.ENV.items() if k != "TEST_DATABASE_URL"})
    teks = "\n".join(l for l in teks.splitlines() if not l.startswith("?"))
    catat("$ go test -count=1 ./...")
    catat(teks)
    catat(f"# exit status {rc}")
    harap(rc, 0, "go test tanpa database")
    bagian("C. TES_DB_WAJIB=1 tanpa database: gagal keras, bukan hijau karena tes dilewati (pola 2.24)")
    rc, teks = go_test("test", "-count=1", "./...", env={**{k: v for k, v in d.ENV.items() if k != "TEST_DATABASE_URL"}, "TES_DB_WAJIB": "1"})
    teks = "\n".join(l for l in teks.splitlines() if not l.startswith("?"))
    catat("$ TES_DB_WAJIB=1 go test -count=1 ./...")
    catat(teks)
    catat(f"# exit status {rc}")
    harap(rc, 1, "TES_DB_WAJIB tanpa database")
    tulis("testing.txt", "tes Go untuk aturan uang, outbox, klaim, versi, sinkron, dan sesi web", keputusan="950")


BAGIAN = {"skema": rekam_skema, "outbox": rekam_outbox, "push": rekam_push, "rentan": rekam_rentan,
          "katalog": rekam_katalog, "sinkron": rekam_sinkron, "web": rekam_web, "testing": rekam_testing}


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
