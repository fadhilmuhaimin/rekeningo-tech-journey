"""Rekam lab API Tahap 4 (lab-api-t4): api-t3 naik ke publik.

curl -i ke server Go + PostgreSQL 17, schema tahap4 (tes Go di tahap4_tes). Gateway pembayaran, layanan verifikasi, dan
layanan push adalah tiruan lokal (cmd/tiruan, cmd/pushpalsu), bukan layanan sungguhan. Setiap bagian membuat ulang
schema dan data awal dari nol, jadi output/*.txt tidak bergantung pada urutan bagian dan rekaman ulang identik per
byte (make cek). Token, waktu, tanggal, notifikasi_id, dan order_id disamarkan; angka yang bergantung mesin (waktu,
jumlah koneksi) hanya direkam sebagai batas yang diperiksa. Lab gagal keras bila port sudah dipakai, atau bila
hasilnya tidak sesuai yang diharapkan.

    make -C labs/api-t4 run                      (butuh: Docker, Go; PostgreSQL dijalankan lewat labs/b3-race)
    make -C labs/api-t4 run BAGIAN=topup         (satu bagian: skema topup verifikasi batas rentan fitur beban testing)
    make -C labs/api-t4 beban                    (hanya bagian beban)
"""
import base64, datetime, json, os, pathlib, re, subprocess, sys, threading, time

import psycopg

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import dasar_t4 as d  # noqa: E402
from dasar_t4 import (PORT, PORT_GATEWAY, PORT_PUSH, PORT_VERIFIKASI, bagian, catat, curl, gagal, harap, j, login,  # noqa: E402
                      samaran, satu, sql, tulis)

PASSWORD = d.PASSWORD
BANDING_NASKAH = "plan/CERITA-TAHAP-4.md bagian 3b"
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==")
JUTA = 1_000_000


def siapkan_data():
    d.buat_schema()
    d.seed()


def mulai_semua(args=(), tampil=None, push=True):
    if push:
        d.mulai_push()
    d.mulai_gateway()
    d.mulai_verifikasi()
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


def nol_baris(q, apa):
    harap(sql(q, tampil=False)[0][0], 0, apa)


# ---------- skema.txt ----------

# Kolom tabel Tahap 4 di blok mermaid plan/CERITA-TAHAP-4.md bagian 3b. Skema lab yang benar; bagian ini gagal bila beda
# dari daftar ini, dan menulis selisihnya (LAB_TAMBAHAN) sebagai catatan.
NASKAH_3B = {
    "topup_bank": ["id", "akun_id", "order_id", "jumlah", "status", "dibuat", "kedaluwarsa_pada", "jurnal_id"],
    "webhook_event": ["event_id", "topup_id", "jenis", "hasil", "diterima", "jurnal_id"],
    "insiden_rekon": ["id", "tanggal", "order_id", "topup_id", "jenis", "selisih", "status", "jurnal_id", "dibuat"],
    "verifikasi": ["id", "akun_id", "subjek", "status", "tingkat_diminta", "referensi_vendor", "berkas_kartu_kunci",
                   "berkas_swafoto_kunci", "checksum_kartu", "checksum_swafoto", "hapus_pada", "diajukan", "selesai"],
    "qr": ["id", "akun_id", "jenis", "nominal", "berlaku_sampai", "status", "jurnal_id"],
    "kartu": ["id", "akun_id", "token_penerbit", "empat_digit", "status", "batas_harian"],
    "otorisasi_kartu": ["id", "kartu_id", "id_penerbit", "jumlah", "status", "jurnal_tahan_id", "jurnal_tangkap_id",
                        "tahan_sampai", "dibuat"],
    "audit_log": ["id", "waktu", "pelaku_id", "peran", "aksi", "objek", "alasan", "penyetuju_id", "hash_sebelumnya", "hash"],
    "outbox": ["id", "notifikasi_id", "jurnal_id", "akun_id", "kelas", "jenis", "tujuan", "payload", "status", "percobaan",
               "coba_lagi", "klaim_sampai", "dibuat"],
    "produk": ["id", "akun_id", "nama", "harga", "stok", "aktif", "versi", "gambar_url", "diubah"],
}
LAB_TAMBAHAN = {"topup_bank": ["tujuan_bayar"]}   # kolom yang lab tambah dan mermaid tidak tulis


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
    bagian("A. Skema akhir Tahap 3, lalu migrasi api-t4 000020 sampai 000023 (satu transaction, schema kosong)")
    catat("# api-t1/schema.sql + b4-migration/baru/000005 + api-t2/migrasi/000009..000014 + api-t3/migrasi/000015..000019 = akhir Tahap 3;")
    catat("# yang ditulis lab ini:")
    for f in d.MIGRASI_T4:
        catat(f"$ psql -1 -f migrasi/{f.name}")
    harap(len(d.MIGRASI_T4), 4, "jumlah migrasi api-t4")
    sql("SELECT count(*) AS tabel FROM information_schema.tables WHERE table_schema = current_schema()")
    harap(satu("SELECT count(*) FROM information_schema.tables WHERE table_schema = current_schema()"), 22, "22 tabel (naskah: 14 + 8)")
    sql("SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() ORDER BY table_name")
    catat("# 14 tabel Tahap 3 + 8 baru (topup_bank, webhook_event, insiden_rekon, verifikasi, qr, kartu, otorisasi_kartu, audit_log).")
    catat("# Semuanya satu schema: pembagian enam schema per modul (naskah 3b, tabel 'Modul (schema)') adalah rancangan yang")
    catat("# dibuktikan lab t4-modul, bukan lab ini.")

    bagian(f"B. Kolom tabel Tahap 4 dibandingkan dengan blok mermaid naskah ({BANDING_NASKAH}); skema lab yang benar")
    catat("# tabel | kolom di lab | sama dengan naskah")
    for t, kolom in NASKAH_3B.items():
        lab = [k for (k,) in sql(f"SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema()"
                                 f" AND table_name = '{t}' ORDER BY ordinal_position", tampil=False)]
        harap(sorted(lab), sorted(kolom + LAB_TAMBAHAN.get(t, [])), f"kolom {t} lawan naskah 3b")
        tambah = LAB_TAMBAHAN.get(t)
        catat(f"{t} | {', '.join(lab)} | " + ("ya" if not tambah else f"ya, ditambah {', '.join(tambah)} (tidak ada di mermaid)"))
    akun = [k for (k,) in sql("SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema()"
                              " AND table_name = 'akun' ORDER BY ordinal_position", tampil=False)]
    harap(all(k in akun for k in ("tingkat", "status", "kota_id")), True, "akun.tingkat dan akun.status")
    catat(f"akun | {', '.join(akun)} | ya (tingkat dan status baru)")
    sql("SELECT pg_get_constraintdef(oid) AS aturan_jenis_akun FROM pg_constraint WHERE conname = 'akun_jenis_check'"
        " AND connamespace = current_schema()::regnamespace")
    sql("SELECT pg_get_constraintdef(oid) AS aturan_jenis_buku FROM pg_constraint WHERE conname = 'buku_jenis_check'"
        " AND connamespace = current_schema()::regnamespace")
    catat("# Selisih dengan blok mermaid: (1) topup_bank.tujuan_bayar: gateway memberi nomor tujuan bayar, dan app menampilkannya;")
    catat("# naskah menyebut 'mendapat tujuan bayar dari gateway' tetapi tidak punya kolomnya. (2) jenis buku baru untuk ledger:")
    catat("# pemakai, merchant, bank, dana_tertahan, settlement_kartu; naskah hanya menyebut akun sistem dana tertahan. (3) jenis jurnal")
    catat("# topup_bank, kartu_tahan, kartu_tangkap. (4) aturan (CHECK, UNIQUE, index sebagian) yang mermaid tidak tulis.")
    sql("""SELECT conrelid::regclass AS tabel, conname AS aturan, pg_get_constraintdef(oid) AS isi
FROM pg_constraint WHERE connamespace = current_schema()::regnamespace AND contype IN ('c', 'u')
  AND conrelid::regclass::text IN ('topup_bank', 'webhook_event', 'insiden_rekon', 'verifikasi', 'qr', 'kartu', 'otorisasi_kartu', 'audit_log')
ORDER BY 1::text, 2""")
    sql("SELECT tablename AS tabel, indexname AS index FROM pg_indexes WHERE schemaname = current_schema()"
        " AND tablename IN ('topup_bank', 'webhook_event', 'insiden_rekon', 'verifikasi', 'qr', 'kartu', 'otorisasi_kartu', 'audit_log', 'outbox')"
        " AND indexname NOT LIKE '%_pkey' ORDER BY 1, 2")

    bagian("C. Data awal: ./api-t4 -seed (data lab, sebagai pemilik schema, tanpa lewat service)")
    d.seed()
    catat("$ DATABASE_URL=<pemilik schema> ./api-t4 -seed   # password semua akun lab: lihat cmd/api/seed.go")
    sql("SELECT jenis, tingkat, count(*) AS akun FROM akun GROUP BY jenis, tingkat ORDER BY jenis, tingkat")
    sql("SELECT jenis, count(*) AS buku, sum(saldo_cache) AS saldo FROM buku GROUP BY jenis ORDER BY jenis")
    harap(satu("SELECT sum(saldo_cache) FROM buku"), 0, "jumlah semua saldo_cache")
    sql("SELECT a.id, a.nama, a.jenis, a.tingkat, b.saldo_cache AS saldo FROM akun a LEFT JOIN buku b ON b.akun_id = a.id"
        " WHERE a.id IN (419, 420, 421, 30001, 30002, 30021, 40001, 40002) ORDER BY a.id")
    sql("SELECT (SELECT count(*) FROM jurnal) AS jurnal, (SELECT count(*) FROM outbox) AS outbox,"
        " (SELECT count(*) FROM topup_bank) AS topup_bank, (SELECT count(*) FROM audit_log) AS audit_log")
    harap(satu("SELECT count(*) FROM outbox"), 0, "antrean awal kosong")

    bagian("D. Role app (api_t4) bukan pemilik tabel: invarian dan kolom tertentu tidak bisa diubah dari server")
    with psycopg.connect(d.db_app().split("?")[0] + f"?options=-csearch_path%3D{d.SCHEMA}", autocommit=True) as c:
        for q, kode in (("UPDATE audit_log SET aksi = 'x' WHERE id = 1", "42501"),
                        ("DELETE FROM audit_log WHERE id = 1", "42501"),
                        ("UPDATE posting SET jumlah = 1 WHERE id = 1", "42501"),
                        ("DELETE FROM jurnal WHERE id = 1", "42501"),
                        ("UPDATE akun SET jenis = 'risk' WHERE id = 40001", "42501"),
                        ("DELETE FROM webhook_event", "42501"),
                        ("ALTER TABLE topup_bank DISABLE TRIGGER ALL", "42501")):
            catat(f"api_t4=> {q};")
            try:
                c.execute(q)
                gagal(f"harus ditolak: {q}")
            except psycopg.Error as e:
                harap(e.sqlstate, kode, q)
                catat(f"ERROR:  {e.diag.message_primary}")
                catat(f"   -- SQLSTATE {e.sqlstate}")
    catat("# audit_log hanya bertambah dari sisi server (SELECT dan INSERT); pemilik schema tetap bisa mengubahnya, dan itulah yang")
    catat("# dideteksi rantai hash (internal/repo/audit.go), bukan dicegah.")

    bagian("E. Aturan tabel baru ditolak database, bukan hanya service (gagal keras bila tidak ditolak)")
    coba_tolak("INSERT INTO topup_bank (akun_id, order_id, jumlah, kedaluwarsa_pada) VALUES (419, 'X', 0, now())", "23514", "topup_bank_jumlah_check")
    sql("INSERT INTO topup_bank (akun_id, order_id, jumlah, kedaluwarsa_pada) VALUES (419, 'X1', 10000, now())")
    coba_tolak("INSERT INTO topup_bank (akun_id, order_id, jumlah, kedaluwarsa_pada) VALUES (419, 'X1', 10000, now())", "23505", "topup_bank_order_id_key")
    coba_tolak("INSERT INTO topup_bank (akun_id, order_id, jumlah, status, kedaluwarsa_pada) VALUES (419, 'X2', 10000, 'selesai', now())", "23514", "topup_bank_status_check")
    sql("INSERT INTO webhook_event (event_id, jenis, hasil) VALUES ('evt-1', 'settlement', 'diproses')")
    coba_tolak("INSERT INTO webhook_event (event_id, jenis, hasil) VALUES ('evt-1', 'settlement', 'diproses')", "23505", "webhook_event_pkey")
    coba_tolak("INSERT INTO webhook_event (event_id, jenis, hasil) VALUES ('evt-2', 'settlement', 'dilewati')", "23514", "webhook_event_hasil_check")
    coba_tolak("INSERT INTO insiden_rekon (tanggal, order_id, jenis, selisih) VALUES ('2026-01-01', 'X1', 'lain', 1)", "23514", "insiden_rekon_jenis_check")
    coba_tolak("INSERT INTO qr (akun_id, jenis) VALUES (30001, 'dinamis')", "23514", "qr_dinamis_terikat")
    coba_tolak("INSERT INTO kartu (akun_id, token_penerbit, empat_digit) VALUES (40002, 'tok', '12a4')", "23514", "kartu_empat_digit_check")
    coba_tolak("INSERT INTO outbox (akun_id, kelas, jenis, payload) VALUES (40001, 1, 'verifikasi', '{}')", "23514", "outbox_tujuan_sesuai_jenis")
    sql("INSERT INTO outbox (akun_id, kelas, jenis, tujuan, payload) VALUES (40001, 1, 'verifikasi', 'verifikasi', '{}')")
    coba_tolak("INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('kartu_bebas', 'x', 400)", "23514", "jurnal_jenis_check")
    tulis("skema.txt", "migrasi 000020-000023, 22 tabel, data awal publik, aturan database",)


# ---------- topup.txt ----------

def kirim_webhook(**kw):
    """Perintahkan gateway tiruan mengirim webhook; mengembalikan daftar hasil per kiriman ('<status> <hasil>')."""
    s, isi = curl("POST", "/lab/webhook", kw, port=PORT_GATEWAY, tampil=False)
    harap(s, 200, "perintah webhook")
    return j(isi)["hasil"]


def gateway_bayar(order_id, **kw):
    s, _ = curl("POST", "/lab/bayar", {"order_id": order_id, **kw}, port=PORT_GATEWAY, tampil=False)
    harap(s, 200, "gateway bayar")


def buat_topup(token, jumlah, tampil=True):
    s, isi = curl("POST", "/topup-bank", {"jumlah": jumlah}, token, tampil=tampil)
    return s, j(isi)


def jurnal_topup(order_id):
    return satu(f"SELECT count(*) FROM jurnal WHERE jenis = 'topup_bank' AND keterangan = 'Top-up bank {order_id}'")


def rekam_topup():
    siapkan_data()
    mulai_semua(["-gateway-timeout", "500ms"],
                tampil="# server: ./api-t4 -lab -gateway-timeout 500ms (bawaan 3 detik; dipendekkan supaya rekaman cepat); gateway dan layanan verifikasi tiruan: ./tiruan")
    for l in d.log_server():
        catat("server log: " + l)
    budi = login("budi@lestari.example", label="Budi")
    dina = login("pemakai1@publik.example", label="Dina")

    bagian("A. Alur normal: Budi mengisi Rp200.000 dari rekening bank. Gateway tiruan menjawab dengan tujuan bayar, status menunggu")
    curl("GET", "/akun/419", token=budi)
    s, t1 = buat_topup(budi, 200_000)
    harap((s, t1["status"], t1["jumlah"]), (201, "menunggu", 200_000), "top-up pertama")
    sql("SELECT id, akun_id, jumlah, status, tujuan_bayar IS NOT NULL AS ada_tujuan_bayar, jurnal_id FROM topup_bank")
    catat("# Belum ada uang yang bergerak: tidak ada jurnal topup_bank, saldo Budi tetap.")
    nol_baris("SELECT count(*) FROM jurnal WHERE jenis = 'topup_bank'", "belum ada jurnal top-up")

    bagian("B. Budi membayar di app bank; gateway mengirim webhook bertanda tangan. Satu transaction: event, status, jurnal, outbox")
    gateway_bayar(t1["order_id"])
    h = kirim_webhook(event_id="evt-100", order_id=t1["order_id"])
    catat('$ curl -X POST gateway/lab/webhook -d \'{"event_id":"evt-100","order_id":"<order 1>"}\'   # gateway menandatangani dan mengirim ke /webhooks/pembayaran')
    catat("hasil kiriman: " + ", ".join(h))
    harap(h, ["200 diproses"], "webhook pertama")
    curl("GET", f"/topup-bank/{t1['id']}", token=budi)
    curl("GET", "/akun/419", token=budi)
    sql("SELECT p.jurnal_id, j.jenis, b.jenis AS buku, p.jumlah FROM posting p JOIN jurnal j ON j.id = p.jurnal_id"
        " JOIN buku b ON b.id = p.buku_id WHERE j.jenis = 'topup_bank' ORDER BY p.id")
    sql("SELECT event_id, jenis, hasil, jurnal_id FROM webhook_event ORDER BY event_id")
    sql("SELECT akun_id, kelas, jenis, tujuan, status, payload->>'judul' AS judul FROM outbox")
    catat("# Pemberitahuan ke Budi ditulis di transaction yang sama dengan jurnal; worker mengirimnya sesudah COMMIT.")
    d.worker()
    harap(d.push_diterima()["jumlah"], 1, "push menerima satu pesan")
    catat("push tiruan menerima: 1 pesan")

    bagian("C. Balasan 200 yang pertama hilang di jalan: gateway mengirim event yang sama lagi, dan event lain untuk kejadian yang sama")
    s, t2 = buat_topup(budi, 100_000, tampil=False)
    harap(s, 201, "top-up kedua")
    gateway_bayar(t2["order_id"])
    h1 = kirim_webhook(event_id="evt-200", order_id=t2["order_id"], putus_balasan=True)
    catat("kiriman 1 (event evt-200): " + ", ".join(h1))
    harap(jurnal_topup(t2["order_id"]), 1, "kiriman pertama sudah dijurnal sebelum balasan hilang")
    h2 = kirim_webhook(event_id="evt-200", order_id=t2["order_id"])
    catat("kiriman 2 (event evt-200 yang sama): " + ", ".join(h2))
    harap(h2, ["200 ganda"], "kiriman ulang")
    h3 = kirim_webhook(event_id="evt-201", order_id=t2["order_id"])
    catat("kiriman 3 (event evt-201, event berbeda untuk kejadian yang sama): " + ", ".join(h3))
    harap(h3, ["200 ganda"], "event kedua untuk kejadian yang sama")
    sql(f"SELECT (SELECT count(*) FROM jurnal j JOIN topup_bank t ON j.keterangan = 'Top-up bank ' || t.order_id WHERE t.id = {t2['id']}) AS jurnal_untuk_top_up_{t2['id']}")
    sql("SELECT event_id, jenis, hasil FROM webhook_event ORDER BY event_id")
    catat("# evt-201 tidak tercatat sebagai diproses: status top-up sudah dibayar, jadi hasilnya ganda dan tidak ada jurnal kedua.")
    catat("# Event yang sama tidak masuk tabel dua kali (kunci utama event_id).")

    bagian("D. Dua kiriman event yang sama tiba bersamaan: tepat satu diproses, satu ganda (urutan antar kiriman tidak dijaga)")
    s, t3 = buat_topup(budi, 50_000, tampil=False)
    gateway_bayar(t3["order_id"])
    h = sorted(kirim_webhook(event_id="evt-300", order_id=t3["order_id"], kali=2, serentak=True))
    catat("hasil dua kiriman bersamaan (diurutkan): " + ", ".join(h))
    harap(h, ["200 diproses", "200 ganda"], "dua kiriman bersamaan")
    harap(jurnal_topup(t3["order_id"]), 1, "satu jurnal")

    bagian("E. Kabar dari luar adalah klaim: tanda tangan atas byte mentah, isi, dan timestamp diperiksa sebelum JSON diurai")
    s, t4 = buat_topup(budi, 30_000, tampil=False)
    gateway_bayar(t4["order_id"])
    for apa, kw in (("tanpa tanda tangan", {"tanpa_tanda_tangan": True}),
                    ("rahasia lain", {"rahasia": "rahasia-lain"}),
                    ("isi diubah sesudah ditandatangani (jumlah x10)", {"ubah_body": True}),
                    ("JSON ditulis ulang dengan spasi lain, tanda tangan atas byte asli", {"body_spasi": True}),
                    ("timestamp 400 detik lalu (toleransi 300 detik, Asumsi)", {"geser_detik": -400}),
                    ("timestamp 400 detik di depan", {"geser_detik": 400})):
        h = kirim_webhook(event_id="evt-400", order_id=t4["order_id"], **kw)
        catat(f"{apa}: {h[0].strip()}")
        harap(h[0].split()[0], "401", apa)
    nol_baris("SELECT count(*) FROM webhook_event WHERE event_id = 'evt-400'", "kiriman palsu tidak tercatat")
    nol_baris(f"SELECT count(*) FROM jurnal WHERE keterangan = 'Top-up bank {t4['order_id']}'", "kiriman palsu tidak menjurnal")
    catat("# Tidak ada event, tidak ada jurnal. Yang sah, dengan tanda tangan atas byte yang sama, diproses:")
    h = kirim_webhook(event_id="evt-400", order_id=t4["order_id"])
    catat("kiriman sah: " + ", ".join(h))
    harap(h, ["200 diproses"], "kiriman sah sesudah yang palsu")
    h = kirim_webhook(event_id="evt-500", order_id="TB-0000000000000000", jumlah=10_000)
    catat("kiriman sah untuk order yang tidak dikenal: " + ", ".join(h))
    harap(h, ["200 ditolak"], "order tidak dikenal")

    bagian("F. Kabar yang datang mundur: status menunggu sesudah dibayar diparkir, status tidak mundur (top-up yang sudah berstatus akhir tidak ditanyakan ke gateway)")
    h = kirim_webhook(event_id="evt-600", order_id=t1["order_id"], status="pending")
    catat("kabar pending untuk top-up yang sudah dibayar: " + ", ".join(h))
    harap(h, ["200 diparkir"], "kabar mundur")
    sql("SELECT id, status FROM topup_bank WHERE id = " + str(t1["id"]))
    sql("SELECT event_id, jenis, hasil FROM webhook_event WHERE event_id = 'evt-600'")
    harap(satu(f"SELECT status FROM topup_bank WHERE id = {t1['id']}"), "dibayar", "status tidak mundur")

    bagian("G. Gateway gagal: mati, lambat, dan order dibuat tetapi jawabannya tidak pernah sampai. Pembayaran dan transfer tidak ikut")
    d.tiruan_mode(PORT_GATEWAY, "mati")
    catat("# gateway tiruan mode mati: semua panggilan dijawab 503")
    s, isi = curl("POST", "/topup-bank", {"jumlah": 100_000}, budi)
    harap(s, 502, "gateway mati")
    sql("SELECT id, status, tujuan_bayar IS NULL AS tanpa_tujuan_bayar, jurnal_id FROM topup_bank ORDER BY id DESC LIMIT 1")
    catat("# Penolakan eksplisit (503, atau koneksi ditolak) = gagal: order belum dibuat di gateway.")
    s, isi = curl("POST", "/transfers", {"ke": 418, "nominal": 25000}, budi)
    harap(s, 201, "bayar saat gateway mati")
    catat("# Pembayaran ke warung tetap 201: jalur uang tidak memanggil gateway (ADR 22).")
    d.tiruan_mode(PORT_GATEWAY, "setelah-buat-menggantung")
    catat("# gateway tiruan mode setelah-buat-menggantung: order dibuat, jawaban tidak pernah dikirim; client menyerah sesudah 500 ms")
    s, t5 = buat_topup(budi, 70_000)
    harap((s, t5["status"]), (202, "tidak_pasti"), "timeout")
    catat("# Timeout = tidak_pasti, bukan gagal: order mungkin sudah ada di gateway. Pengguna tidak diminta membayar dua kali.")
    sql("SELECT id, status, tujuan_bayar IS NULL AS tanpa_tujuan_bayar FROM topup_bank WHERE id = " + str(t5["id"]))
    d.tiruan_mode(PORT_GATEWAY, "normal")
    gateway_bayar(t5["order_id"])
    catat("# Gateway pulih. Budi sudah membayar di app bank, tetapi webhook tidak pernah dikirim (hilang).")
    nol_baris(f"SELECT count(*) FROM jurnal WHERE keterangan = 'Top-up bank {t5['order_id']}'", "belum dijurnal")

    bagian("H. Job cek status (-cek-topup): top-up menunggu atau tidak_pasti ditanyakan ke gateway, dikredit lewat jurnal yang sama dengan webhook")
    r = subprocess.run([str(d.BIN), "-cek-topup", "-cek-umur", "0s", *d.args_t4()], env=dict(d.ENV, DATABASE_URL=d.db_app()),
                       capture_output=True, text=True)
    harap(r.returncode, 0, "exit -cek-topup")
    catat("$ ./api-t4 -cek-topup -cek-umur 0s   # bawaan -cek-umur 30m (Asumsi)")
    catat(r.stdout.strip())
    harap(r.stdout.strip(), "cek top-up: diperiksa 1, dikredit 1, selesai tanpa kredit 0, masih menunggu 0, galat 0", "ringkasan cek")
    sql(f"SELECT id, status, jurnal_id IS NOT NULL AS ada_jurnal FROM topup_bank WHERE id = {t5['id']}")
    harap(jurnal_topup(t5["order_id"]), 1, "satu jurnal dari job")
    r = subprocess.run([str(d.BIN), "-cek-topup", "-cek-umur", "0s", *d.args_t4()], env=dict(d.ENV, DATABASE_URL=d.db_app()),
                       capture_output=True, text=True)
    catat("$ ./api-t4 -cek-topup -cek-umur 0s   # dijalankan lagi: tidak ada yang tersisa")
    catat(r.stdout.strip())
    harap(jurnal_topup(t5["order_id"]), 1, "job kedua tidak menjurnal lagi")

    bagian("I. Batas saldo menurut tingkat dijaga sesudah lock: dua top-up Dina (belum terverifikasi, saldo Rp900.000, batas Rp1.000.000) lolos cek awal, hanya satu dikredit")
    curl("GET", "/akun/40001", token=dina)
    s, isi = curl("POST", "/topup-bank", {"jumlah": 200_000}, dina)
    harap(s, 422, "melewati batas pada cek awal")
    s, da = buat_topup(dina, 60_000, tampil=False)
    s2, db_ = buat_topup(dina, 60_000, tampil=False)
    harap((s, s2), (201, 201), "dua top-up lolos cek awal (900.000 + 60.000 masing-masing)")
    gateway_bayar(da["order_id"])
    gateway_bayar(db_["order_id"])
    ha = kirim_webhook(event_id="evt-700", order_id=da["order_id"])
    hb = kirim_webhook(event_id="evt-701", order_id=db_["order_id"])
    catat(f"webhook top-up pertama: {ha[0]}; webhook top-up kedua: {hb[0]}")
    harap((ha, hb), (["200 diproses"], ["200 diparkir"]), "yang kedua melewati batas")
    sql("SELECT id, jumlah, status FROM topup_bank WHERE akun_id = 40001 ORDER BY id")
    curl("GET", "/akun/40001", token=dina)
    catat("# Uang Rp60.000 yang kedua sudah di bank dan tidak dikredit: kabar diparkir, top-up tetap menunggu. Rekonsiliasi harian melihatnya")
    catat("# sebagai tidak_di_ledger (bagian J); PRD v4 belum menjawab pengembalian dana (Asumsi: tim risk memutuskan).")

    bagian("J. Rekonsiliasi harian (-rekon <tanggal>): laporan settlement gateway lawan jurnal, per order_id; tiga jenis selisih jadi insiden bernomor")
    s, tj = buat_topup(budi, 20_000, tampil=False)
    gateway_bayar(tj["order_id"])
    kirim_webhook(event_id="evt-800", order_id=tj["order_id"])
    gateway_bayar(tj["order_id"], jumlah=25_000)
    catat("# jumlah_beda: dikredit Rp20.000, laporan settlement menulis Rp25.000 untuk order yang sama")
    s, tk = buat_topup(budi, 40_000, tampil=False)
    gateway_bayar(tk["order_id"], tanggal="2020-01-01")
    kirim_webhook(event_id="evt-801", order_id=tk["order_id"])
    catat("# tidak_di_gateway: dikredit hari ini, tetapi gateway mencatat settlement tanggal lain")
    s, tl = buat_topup(budi, 15_000, tampil=False)
    gateway_bayar(tl["order_id"])
    catat("# tidak_di_ledger: gateway sudah settlement, webhook tidak pernah datang dan job cek belum jalan")
    tgl = hari_ini()
    sebelum = sql("SELECT count(*), sum(jumlah), (SELECT sum(saldo_cache) FROM buku WHERE jenis = 'karyawan') FROM posting", tampil=False)[0]
    for ke in (1, 2):
        r = subprocess.run([str(d.BIN), "-rekon", tgl, *d.args_t4()], env=dict(d.ENV, DATABASE_URL=d.db_app()), capture_output=True, text=True)
        harap(r.returncode, 0, "exit -rekon")
        catat(f"$ ./api-t4 -rekon <tanggal>   # jalan ke-{ke}")
        catat(d.samarkan(r.stdout.strip()))
    sql("SELECT jenis, selisih, status, jurnal_id IS NULL AS belum_dikoreksi, topup_id IS NOT NULL AS ada_topup FROM insiden_rekon ORDER BY jenis, selisih")
    harap(satu("SELECT count(*) FROM insiden_rekon"), 4, "empat insiden: dua tidak_di_ledger, satu jumlah_beda, satu tidak_di_gateway")
    catat("# Job tidak mengoreksi apa pun dan tidak mengubah posting atau buku.saldo_cache; koreksi lewat jurnal normal ada di lab t4-webhook.")
    catat("# Dijalankan dua kali: insiden yang sama tidak ditulis dua kali ((tanggal, order_id, jenis) unik).")
    sesudah = sql("SELECT count(*), sum(jumlah), (SELECT sum(saldo_cache) FROM buku WHERE jenis = 'karyawan') FROM posting", tampil=False)[0]
    harap(sesudah, sebelum, "rekonsiliasi tidak mengubah posting atau saldo")
    catat(f"posting sebelum dan sesudah rekonsiliasi: {sebelum[0]} baris dengan jumlah {sebelum[1]}, saldo karyawan {sebelum[2]}; sama: ya")
    tulis("topup.txt", "top-up dari bank: webhook ADR 34, tanda tangan, gateway gagal, cek status, batas tingkat, rekonsiliasi",)


# ---------- verifikasi.txt ----------

def kunci_json(**kw):
    return {"berkas_kartu": base64.b64encode(PNG).decode(), "berkas_swafoto": base64.b64encode(PNG + b"swafoto").decode(), **kw}


def worker_sampai(kondisi, apa, args=()):
    """Jalankan worker -sekali berulang (baris yang ditunda backoff belum siap) sampai kondisi terpenuhi."""
    def langkah():
        d.worker(args, tampil=False)
        return kondisi()
    d.tunggu(langkah, apa, batas=30.0, jeda=0.05)


def rekam_verifikasi():
    siapkan_data()
    mulai_semua(tampil="# server: ./api-t4 -lab; layanan verifikasi tiruan: ./tiruan -peran verifikasi")
    dina = login("pemakai1@publik.example", label="Dina")
    p3 = login("pemakai3@publik.example", label="Pemakai 3")
    p4 = login("pemakai4@publik.example", label="Pemakai 4")
    P = ["-maks-percobaan", "5", "-backoff", "1ms", "-satu-putaran"]   # satu putaran per panggilan: jumlah percobaan tidak bergantung kecepatan mesin

    bagian("A. Dina (pemakai, belum terverifikasi) tidak boleh mengirim ke rekan; hanya akun terverifikasi")
    curl("GET", "/akun/40001", token=dina)
    s, _ = curl("POST", "/kiriman", {"ke_nomor_karyawan": "K00419", "nominal": 10000}, dina)
    harap(s, 403, "kirim sebelum verifikasi")

    bagian("B. Dina mengajukan verifikasi: dua file ke penyimpanan objek, satu baris verifikasi, satu pekerjaan di outbox (satu transaction)")
    catat("$ curl -i -X POST /verifikasi -H 'Authorization: Bearer <token sesi Dina>' -d '{\"berkas_kartu\":\"<base64 PNG>\",\"berkas_swafoto\":\"<base64 PNG>\"}'")
    s, isi = curl("POST", "/verifikasi", kunci_json(), dina, tampil=False)
    catat(f"HTTP {s}\n" + d.samarkan(isi.strip()))
    harap(s, 202, "ajukan verifikasi")
    catat("# Database hanya menyimpan kunci objek dan checksum (SHA-256); isi file ada di penyimpanan objek tiruan (direktori lokal).")
    s, isi = curl("POST", "/verifikasi", kunci_json(), dina)
    harap(s, 409, "pengajuan kedua selagi yang pertama berjalan")
    s, isi = curl("POST", "/verifikasi", {"berkas_kartu": base64.b64encode(b"bukan gambar").decode(), "berkas_swafoto": base64.b64encode(PNG).decode()}, dina, tampil=False)
    catat(f"# file yang bukan gambar (tipe dari byte, bukan nama): HTTP {s}")
    harap(s, 422, "bukan gambar")
    sql("SELECT id, akun_id, subjek, status, length(berkas_kartu_kunci) AS panjang_kunci, checksum_kartu, checksum_swafoto FROM verifikasi")
    sql("SELECT akun_id, kelas, jenis, tujuan, status, jurnal_id FROM outbox")

    bagian("C. Worker mengklaim pekerjaan verifikasi, memanggil layanan verifikasi (Idempotency-Key = id pengajuan), tingkat akun naik")
    d.worker()
    curl("GET", "/verifikasi/1", token=dina)
    curl("GET", "/akun/40001", token=dina)
    s, isi = curl("GET", "/lab/diterima", port=PORT_VERIFIKASI)
    harap(j(isi), {"permintaan": 1, "objek": 1}, "satu permintaan, satu objek di vendor")
    sql("SELECT status, percobaan FROM outbox")
    s, isi = curl("POST", "/kiriman", {"ke_nomor_karyawan": "K00419", "nominal": 10000}, dina)
    harap(s, 201, "kirim sesudah terverifikasi")
    s, isi = curl("POST", "/topup-bank", {"jumlah": 200_000}, dina)
    harap(s, 201, "top-up melewati Rp1.000.000 sesudah terverifikasi (batas Rp10.000.000)")
    catat("# Sebelum verifikasi, top-up Rp200.000 untuk saldo Rp900.000 ditolak 422 (topup.txt bagian I); kini batasnya Rp10.000.000.")

    bagian("D. Timeout: jawaban vendor terpotong. Pengajuan menjadi tidak_pasti (bukan gagal); pulih, diulang dengan key yang sama, satu objek di vendor")
    d.tiruan_reset(PORT_VERIFIKASI)
    s, isi = curl("POST", "/verifikasi", kunci_json(), p4, tampil=False)
    harap(s, 202, "pengajuan Pemakai 4")
    d.tiruan_mode(PORT_VERIFIKASI, "setengah")
    catat("# layanan verifikasi tiruan mode setengah: jawaban 200 terpotong, koneksi ditutup")
    d.worker(P, tampil=False)
    sql("SELECT status FROM verifikasi WHERE akun_id = 40004")
    sql("SELECT status, percobaan FROM outbox WHERE akun_id = 40004")
    harap(satu("SELECT status FROM verifikasi WHERE akun_id = 40004"), "tidak_pasti", "timeout = tidak_pasti")
    d.tiruan_mode(PORT_VERIFIKASI, "normal")
    worker_sampai(lambda: satu("SELECT status FROM verifikasi WHERE akun_id = 40004") == "lulus", "Pemakai 4 lulus", P)
    sql("SELECT status FROM verifikasi WHERE akun_id = 40004")
    s, isi = curl("GET", "/lab/diterima", port=PORT_VERIFIKASI)
    harap(j(isi), {"permintaan": 2, "objek": 1}, "dua permintaan, satu objek (retry berkunci)")
    catat("# Vendor menerima 2 permintaan dan membuat 1 objek: Idempotency-Key membuat retry tidak menggandakan.")

    bagian("E. Vendor mati: lima percobaan lalu dead-letter (ADR 25). Pendaftar yang tidak bersalah berstatus gagal (M31); lajur dan breaker ada di lab t4-integrasi")
    d.tiruan_reset(PORT_VERIFIKASI)
    d.tiruan_mode(PORT_VERIFIKASI, "mati")
    s, isi = curl("POST", "/verifikasi", kunci_json(), p3, tampil=False)
    harap(s, 202, "pengajuan Pemakai 3")
    worker_sampai(lambda: satu("SELECT status FROM outbox WHERE akun_id = 40003") == "mati", "pekerjaan masuk dead-letter", P)
    sql("SELECT status, percobaan FROM outbox WHERE akun_id = 40003")
    sql("SELECT status FROM verifikasi WHERE akun_id = 40003")
    harap(satu("SELECT status FROM verifikasi WHERE akun_id = 40003"), "gagal", "verifikasi gagal karena vendor")
    sql("SELECT a.tingkat FROM akun a WHERE a.id = 40003")
    s, isi = curl("GET", "/lab/diterima", port=PORT_VERIFIKASI)
    catat("# Vendor mati: 5 percobaan, tidak satu pun sampai ke objek vendor (objek 0).")
    harap(j(isi)["objek"], 0, "vendor mati tidak membuat objek")
    tulis("verifikasi.txt", "verifikasi identitas: tingkat akun, outbox bertujuan verifikasi, timeout, vendor mati",)


# ---------- batas.txt ----------

JAM = 1_800_000_000_000   # milidetik: jam service dibekukan supaya Retry-After dan isi ulang bucket sama di setiap rekaman


def burn(metode, path, token, n, badan=None, **kw):
    """Kirim n permintaan beruntun; kembalikan status masing-masing."""
    return [curl(metode, path, badan, token, tampil=False, **kw)[0] for _ in range(n)]


def rekam_batas():
    siapkan_data()
    mulai_semua(["-jam-lab"], tampil="# server: ./api-t4 -lab -jam-lab (jam service dibekukan lewat POST /lab/jam: bucket tidak terisi di tengah rekaman)")
    harap(curl("POST", "/lab/jam", {"ms": JAM}, tampil=False)[0], 204, "bekukan jam")
    budi = login("budi@lestari.example", label="Budi")
    eko = login("pemakai2@publik.example", label="Eko")
    hr = login("hr.jakarta@lestari.example", label="HR Jakarta")
    catat("# Batas laju: token bucket di memori satu proses (ADR 20); lintas instance butuh penghitung bersama (ADR 27). Semua angka Asumsi lab.")

    bagian("A. POST /daftar: 5 pendaftaran per alamat (isi ulang 5 per jam, 1 token per 720 detik). Pendaftaran keenam ditolak sebelum body dibaca")
    for i in range(1, 6):
        s, isi = curl("POST", "/daftar", {"nama": f"Pendaftar {i}", "email": f"daftar{i}@publik.example", "password": "kata-sandi-lab-ke-" + str(i)},
                      tampil=(i == 1))
        harap(s, 201, f"daftar {i}")
    catat("# pendaftaran 2 sampai 5: 201 x4")
    s, isi = curl("POST", "/daftar", {"nama": "Pendaftar 6", "email": "daftar6@publik.example", "password": "kata-sandi-lab-ke-6"})
    harap(s, 429, "daftar ke-6")
    sql("SELECT jenis, tingkat, status FROM akun WHERE email LIKE 'daftar%@publik.example' GROUP BY jenis, tingkat, status")
    sql("SELECT count(*) AS akun_baru, (SELECT count(*) FROM buku WHERE akun_id >= 50001) AS buku_baru FROM akun WHERE id >= 50001")
    harap(satu("SELECT count(*) FROM akun WHERE id >= 50001"), 5, "lima akun baru")
    catat("# Password kurang dari 15 karakter ditolak 422, email yang sudah terdaftar 409; keduanya memakai token bucket yang sama.")

    bagian("B. Per akun: /topup-bank 10 per jam (Eko, terverifikasi), /perangkat 10 per jam, /pesanan 20 per menit, /sinkron 30 per menit, /promo 5 per jam")
    st = burn("POST", "/topup-bank", eko, 10, {"jumlah": 10_000})
    catat("/topup-bank, 10 permintaan pertama Eko: " + ringkas_status([(s, 0) for s in st]))
    harap(set(st), {201}, "10 top-up Eko")
    s, isi = curl("POST", "/topup-bank", {"jumlah": 10_000}, eko)
    harap(s, 429, "top-up ke-11")
    st = burn("POST", "/perangkat", budi, 10, {"platform": "android", "token_push": "tiruan-lab-baru"})
    catat("/perangkat, 10 permintaan pertama Budi: " + ringkas_status([(s, 0) for s in st]))
    s, isi = curl("POST", "/perangkat", {"platform": "android", "token_push": "tiruan-lab-baru"}, budi)
    harap(s, 429, "perangkat ke-11")
    st = burn("POST", "/pesanan", budi, 20, {})
    catat("/pesanan, 20 permintaan pertama (body kosong, ditolak 400 sesudah mengambil token): " + ringkas_status([(s, 0) for s in st]))
    s, isi = curl("POST", "/pesanan", {}, budi)
    harap(s, 429, "pesanan ke-21")
    st = burn("POST", "/sinkron", budi, 30, {})
    catat("/sinkron, 30 permintaan pertama: " + ringkas_status([(s, 0) for s in st]))
    s, isi = curl("POST", "/sinkron", {}, budi)
    harap(s, 429, "sinkron ke-31")
    st = burn("POST", "/promo", hr, 5, {})
    catat("/promo, 5 permintaan pertama HR: " + ringkas_status([(s, 0) for s in st]))
    s, isi = curl("POST", "/promo", {}, hr)
    harap(s, 429, "promo ke-6")
    catat("# Bucket per akun: Budi yang habis di /pesanan tetap bisa bayar. Batas satu endpoint tidak memakai token endpoint lain.")
    s, isi = curl("POST", "/transfers", {"ke": 418, "nominal": 10000}, budi)
    harap(s, 201, "bayar masih bisa")

    bagian("C. Jam diputar 1 jam: bucket terisi ulang menurut laju (5 daftar per jam = 5 token)")
    harap(curl("POST", "/lab/jam", {"ms": JAM + 3600_000}, tampil=False)[0], 204, "majukan jam")
    s, isi = curl("POST", "/daftar", {"nama": "Pendaftar 7", "email": "daftar7@publik.example", "password": "kata-sandi-lab-ke-7"})
    harap(s, 201, "daftar sesudah 1 jam")
    catat("# Batas ini per alamat TCP. Di belakang proxy semua client berbagi satu alamat (labs/t3-instance); membaca X-Forwarded-For hanya dari proxy tepercaya belum ada.")
    tulis("batas.txt", "batas laju endpoint baru: daftar, top-up bank, perangkat, pesanan, sinkron, promo",)


# ---------- rentan.txt ----------

def rekam_rentan():
    siapkan_data()
    d.mulai_push()
    d.mulai_gateway()
    bagian("A. M29 · mode rentan webhook-v1: handler paling pendek (tanpa tanda tangan, tanpa tabel event, tanpa status bersyarat)")
    d.mulai_api(["-rentan", "webhook-v1"], tampil="$ ./api-t4 -rentan webhook-v1 -lab")
    for l in d.log_server():
        catat("server log: " + l)
    budi = login("budi@lestari.example", label="Budi")
    s, t1 = buat_topup(budi, 200_000, tampil=False)
    gateway_bayar(t1["order_id"])
    h = kirim_webhook(event_id="evt-100", order_id=t1["order_id"], kali=2, tanpa_tanda_tangan=True)
    catat("kiriman event yang sama dua kali, tanpa tanda tangan: " + ", ".join(h))
    harap(h, ["200 diproses", "200 diproses"], "v1 menjurnal dua kali")
    sql("SELECT p.jurnal_id, b.jenis AS buku, p.jumlah FROM posting p JOIN jurnal j ON j.id = p.jurnal_id JOIN buku b ON b.id = p.buku_id"
        " WHERE j.jenis = 'topup_bank' ORDER BY p.id")
    sql("SELECT count(*) AS event_tercatat FROM webhook_event")
    curl("GET", "/akun/419", token=budi)
    catat("# Dua jurnal untuk satu pembayaran: saldo Budi naik Rp400.000 untuk Rp200.000 yang dibayar.")
    harap(satu("SELECT saldo_cache FROM buku WHERE akun_id = 419"), 650_000, "saldo ganda")
    h = kirim_webhook(event_id="evt-101", order_id=t1["order_id"], status="pending", tanpa_tanda_tangan=True)
    sql("SELECT status FROM topup_bank WHERE id = 1")
    catat("# Kabar pending sesudah dibayar: status mundur ke menunggu (tidak ada status bersyarat).")
    harap(satu("SELECT status FROM topup_bank WHERE id = 1"), "menunggu", "v1 memundurkan status")
    s, isi = curl("POST", "/webhooks/pembayaran", {"event_id": "evt-palsu", "order_id": t1["order_id"], "status": "settlement", "jumlah": 1_234_567})
    harap(s, 200, "v1 menerima POST dari siapa pun")
    catat("# POST dari siapa pun diterima, dan jumlah di isi kabar dipercaya: Rp1.234.567 dikreditkan ke Budi.")
    harap(satu("SELECT saldo_cache FROM buku WHERE akun_id = 419"), 650_000 + 1_234_567, "jumlah dari isi kabar")
    d.stop(PORT, tampil="$ kill -TERM <pid api-t4>")

    bagian("B. Mode webhook-cek-tulis: tanda tangan diperiksa, duplikat dicegah dengan cek-lalu-tulis. Dua kiriman bersamaan lolos (jeda lab 300 ms di antara cek dan tulis)")
    siapkan_data()
    d.mulai_api(["-rentan", "webhook-cek-tulis", "-lab-jeda-cek-tulis", "300ms"], tampil="$ ./api-t4 -rentan webhook-cek-tulis -lab-jeda-cek-tulis 300ms -lab")
    budi = login("budi@lestari.example", label="Budi")
    s, t1 = buat_topup(budi, 200_000, tampil=False)
    gateway_bayar(t1["order_id"])
    h = sorted(kirim_webhook(event_id="evt-100", order_id=t1["order_id"], kali=2, serentak=True))
    catat("dua kiriman bersamaan, tanda tangan sah (diurutkan): " + ", ".join(h))
    harap(h, ["200 diproses", "200 diproses"], "cek-tulis lolos dua kali")
    harap(jurnal_topup(t1["order_id"]), 2, "dua jurnal")
    sql("SELECT count(*) AS jurnal_topup_bank FROM jurnal WHERE jenis = 'topup_bank'")
    catat("# Keduanya membaca status menunggu sebelum salah satu menulis. Pada versi ADR 34 (topup.txt bagian D) satu diproses dan satu ganda.")
    d.stop(PORT, tampil="$ kill -TERM <pid api-t4>")
    catat("# Mode lain yang dipakai lab turunan: kartu-tanpa-hold (t4-kartu), unduh-rentan (t4-ssrf), bo-tanpa-audit (t4-audit).")
    tulis("rentan.txt", "mode rentan webhook-v1 dan webhook-cek-tulis (M29)",)


# ---------- fitur.txt ----------

def rekam_fitur():
    """Asap untuk fitur publik di bawah role aplikasi (api_t4, bukan pemilik): QR, kartu, back office, audit, impor katalog.
    Bukti mendalam (mutasi, kasus tepi) ada di tes Go dan di lab turunan t4-qr, t4-kartu, t4-audit, t4-ssrf."""
    siapkan_data()
    d.mulai_push()
    d.mulai_gateway()
    d.mulai_verifikasi()
    d.mulai_penerbit()
    d.mulai_api(["-unduh-izinkan-http"], tampil="# server: ./api-t4 -lab -unduh-izinkan-http (tiruan lokal tidak punya TLS); penerbit kartu tiruan: ./penerbit; semua sebagai role api_t4")
    marni = login("merchant1@merchant.example", label="Bu Marni")
    andalan = login("merchant2@merchant.example", label="Toko Andalan")
    baru = login("merchant21@merchant.example", label="Toko Baru")
    eko = login("pemakai2@publik.example", label="Eko")
    dina = login("pemakai1@publik.example", label="Dina")
    ratih = login("ratih@rekeningo.example", label="Ratih")
    risk2 = login("risk.dua@rekeningo.example", label="Risk Dua")

    bagian("A. QR merchant luar: dinamis (sekali bayar, nominal terikat) dan statis (batas Rp200.000, Asumsi produk)")
    s, isi = curl("POST", "/qr", {"jenis": "dinamis", "nominal": 35_000}, marni,
                  daftarkan=lambda k, i: samaran.__setitem__(j(i)["id"], "<qr 1>"))
    harap(s, 201, "QR dinamis")
    qr1 = [k for k, v in samaran.items() if v == "<qr 1>"][0]
    s, isi = curl("GET", f"/qr/{qr1}", token=eko)
    harap((s, j(isi)["merchant"]["nama"]), (200, "Toko Sumber Rejeki"), "layar konfirmasi")
    s, isi = curl("POST", f"/qr/{qr1}/bayar", {}, eko)
    harap(s, 201, "bayar QR dinamis")
    s, isi = curl("POST", f"/qr/{qr1}/bayar", {}, eko)
    harap(s, 409, "QR dinamis dibayar dua kali")
    sql("SELECT jenis, status, nominal, jurnal_id IS NOT NULL AS ada_jurnal FROM qr")
    sql("SELECT p.jurnal_id, b.jenis AS buku, p.jumlah FROM posting p JOIN buku b ON b.id = p.buku_id WHERE p.jurnal_id = (SELECT jurnal_id FROM qr) ORDER BY p.id")
    s, isi = curl("POST", "/qr", {"jenis": "statis"}, andalan, daftarkan=lambda k, i: samaran.__setitem__(j(i)["id"], "<qr 2>"))
    harap(s, 201, "QR statis")
    qr2 = [k for k, v in samaran.items() if v == "<qr 2>"][0]
    s, isi = curl("POST", f"/qr/{qr2}/bayar", {"nominal": 20_000}, dina)
    harap(s, 201, "Dina (belum terverifikasi) membayar QR statis")
    s, isi = curl("POST", f"/qr/{qr2}/bayar", {"nominal": 250_000}, dina)
    harap(s, 422, "QR statis melewati Rp200.000")
    s, isi = curl("POST", "/qr", {"jenis": "dinamis", "nominal": 10_000}, baru)
    harap(s, 403, "merchant belum terverifikasi tidak menerbitkan QR")

    bagian("B. Merchant baru: verifikasi tanpa vendor, diputuskan tim risk; keputusan tercatat di audit log berantai (satu transaction dengan aksinya)")
    s, isi = curl("POST", "/verifikasi", kunci_json(), baru, tampil=False)
    harap(s, 202, "pengajuan merchant")
    sql("SELECT akun_id, subjek, status FROM verifikasi")
    s, isi = curl("POST", "/bo/merchant/30021/setujui", {"alasan": "Dokumen lengkap dan sesuai, toko dikunjungi"}, ratih)
    harap(s, 204, "setujui merchant")
    sql("SELECT a.tingkat, v.status FROM akun a JOIN verifikasi v ON v.akun_id = a.id WHERE a.id = 30021")
    s, isi = curl("POST", "/qr", {"jenis": "dinamis", "nominal": 10_000}, baru, daftarkan=lambda k, i: samaran.__setitem__(j(i)["id"], "<qr 3>"))
    harap(s, 201, "QR sesudah disetujui")

    bagian("C. Kartu virtual: penerbit tiruan menerbitkan, otorisasi menahan dana (hold) sebagai jurnal di ledger, clearing, reversal, kill switch")
    s, isi = curl("POST", "/kartu", {}, eko, tampil=False)
    harap(s, 201, "terbitkan kartu")
    catat("$ curl -i -X POST /kartu -H 'Authorization: Bearer <token sesi Eko>'   # penerbit tiruan menjawab dengan token; HTTP 201 (token dan empat digit acak, tidak direkam)")
    token = satu("SELECT token_penerbit FROM kartu WHERE akun_id = 40002")
    s, isi = curl("POST", "/kartu", {}, dina, tampil=False)
    harap(s, 403, "Dina belum terverifikasi: tidak boleh memegang kartu")
    catat(f"POST /kartu oleh Dina (belum terverifikasi): HTTP {s}")
    s, isi = curl("POST", "/lab/otorisasi", {"id_penerbit": "AUTH-1", "token": token, "jumlah": 80_000}, port=d.PORT_PENERBIT,
                  tampil_body='{"id_penerbit":"AUTH-1","token":"<token kartu>","jumlah":80000}')
    harap((s, j(isi)["keputusan"]), (200, "setuju"), "otorisasi")
    sql("SELECT status, jumlah, jurnal_tahan_id IS NOT NULL AS ada_jurnal_tahan FROM otorisasi_kartu")
    sql("SELECT b.jenis, b.saldo_cache FROM buku b WHERE b.jenis = 'dana_tertahan' OR b.akun_id = 40002 ORDER BY b.jenis")
    s, isi = curl("POST", "/lab/otorisasi", {"id_penerbit": "AUTH-2", "token": token, "jumlah": 400_000}, port=d.PORT_PENERBIT, tampil=False)
    catat("otorisasi AUTH-2 Rp400.000 (saldo tinggal Rp385.000 sesudah QR dan hold): " + isi.strip())
    harap(j(isi)["keputusan"], "tolak", "saldo kurang")
    s, isi = curl("POST", "/lab/clearing", {"id_penerbit": "AUTH-1", "jumlah": 80_000}, port=d.PORT_PENERBIT, tampil=False)
    harap(s, 200, "clearing")
    sql("SELECT status FROM otorisasi_kartu WHERE id_penerbit = 'AUTH-1'")
    sql("SELECT jenis, saldo_cache FROM buku WHERE jenis IN ('dana_tertahan', 'settlement_kartu') ORDER BY jenis")
    s, isi = curl("POST", "/lab/otorisasi", {"id_penerbit": "AUTH-3", "token": token, "jumlah": 50_000}, port=d.PORT_PENERBIT, tampil=False)
    harap(j(isi)["keputusan"], "setuju", "AUTH-3")
    s, isi = curl("POST", "/lab/reversal", {"id_penerbit": "AUTH-3"}, port=d.PORT_PENERBIT, tampil=False)
    harap(s, 200, "reversal")
    sql("SELECT id_penerbit, status FROM otorisasi_kartu ORDER BY id")
    sql("SELECT jenis, saldo_cache FROM buku WHERE jenis = 'dana_tertahan' OR akun_id = 40002 ORDER BY jenis")
    s, isi = curl("POST", "/bo/flag/kartu", {"aktif": False, "alasan": "Kill switch dicoba: penerbit melaporkan anomali"}, ratih)
    harap(s, 200, "kill switch mati")
    s, isi = curl("POST", "/lab/otorisasi", {"id_penerbit": "AUTH-4", "token": token, "jumlah": 10_000}, port=d.PORT_PENERBIT, tampil=False)
    catat("otorisasi AUTH-4 sesudah kill switch mati (tanpa deploy): " + isi.strip())
    harap(j(isi)["keputusan"], "tolak", "kill switch")
    s, isi = curl("POST", "/bo/flag/kartu", {"aktif": True, "alasan": "Anomali sudah diperiksa, kartu dibuka lagi"}, ratih, tampil=False)
    harap(s, 200, "kill switch nyala")

    bagian("D. Back office tim risk: lihat akun, bekukan, buka dengan persetujuan petugas kedua. Hanya jenis risk")
    s, isi = curl("GET", "/bo/akun/40001", token=dina, tampil=False)
    catat(f"GET /bo/akun/40001 oleh Dina (bukan petugas risk): HTTP {s}")
    harap(s, 403, "bukan risk")
    curl("GET", "/bo/akun/40001", token=ratih)
    s, isi = curl("POST", "/bo/akun/40001/bekukan", {"alasan": "Dugaan akun dipakai pihak lain, menunggu konfirmasi"}, ratih)
    harap(s, 204, "bekukan")
    s, isi = curl("POST", "/topup-bank", {"jumlah": 50_000}, dina)
    harap(s, 403, "dibekukan tidak top-up")
    s, isi = curl("POST", "/bo/akun/40001/buka", {"alasan": "Pemilik sudah dikonfirmasi lewat layanan pelanggan"}, ratih)
    harap(s, 403, "buka tanpa penyetuju")
    s, isi = curl("POST", "/bo/akun/40001/buka", {"alasan": "Pemilik sudah dikonfirmasi lewat layanan pelanggan"}, ratih, kepala=[f"X-Penyetuju-Token: {ratih}"])
    harap(s, 403, "penyetuju sama dengan pelaku")
    s, isi = curl("POST", "/bo/akun/40001/buka", {"alasan": "Pemilik sudah dikonfirmasi lewat layanan pelanggan"}, ratih, kepala=[f"X-Penyetuju-Token: {risk2}"])
    harap(s, 204, "buka dengan penyetuju lain")
    sql("SELECT status FROM akun WHERE id = 40001")

    bagian("E. Audit log berantai: setiap aksi berisiko satu baris di transaction yang sama; mengubah baris di tengah memutus rantai di baris itu")
    sql("SELECT id, peran, aksi, objek, penyetuju_id FROM audit_log ORDER BY id")
    s, isi = curl("GET", "/bo/audit/verifikasi", token=ratih, tampil=False)
    harap(j(isi)["utuh"], True, "rantai utuh")
    catat(f"verifikasi rantai: {j(isi)['baris']} baris, utuh: ya (hash baris terakhir adalah jangkar; bergantung waktu, tidak direkam)")
    sql("UPDATE audit_log SET alasan = 'diubah pemilik schema' WHERE id = 2")
    s, isi = curl("GET", "/bo/audit/verifikasi", token=ratih, tampil=False)
    harap((j(isi)["utuh"], j(isi).get("rusak_di_id")), (False, 2), "rantai putus di baris 2")
    catat(f"sesudah pemilik schema mengubah baris 2: utuh {'ya' if j(isi)['utuh'] else 'tidak'}, rusak di baris {j(isi)['rusak_di_id']}")
    catat("# Role aplikasi tidak bisa mengubah baris itu (skema.txt bagian D); pemilik schema bisa, dan rantai yang mendeteksinya. Menghapus ekor rantai tanpa jangkar di luar database: t4-audit.")

    bagian("F. Impor katalog merchant dengan URL gambar: fetcher versi aman menolak alamat jaringan dalam; produk tetap tersimpan")
    impor = {"produk": [{"nama": "Kopi tubruk", "harga": 8000, "stok": 20,
             "gambar_url": f"http://127.0.0.1:{PORT_GATEWAY}/orders/x"}, {"nama": "Teh tarik", "harga": 9000, "stok": 15}]}
    # Teks rekaman memakai port dasar, bukan port lajur (lab_env): `make cek` harus sama di semua lajur.
    s, isi = curl("POST", "/merchant/katalog/impor", impor, andalan,
                  tampil_body=json.dumps(impor).replace(f":{PORT_GATEWAY}/", f":{d.DASAR_GATEWAY}/"))
    harap(s, 200, "impor katalog")
    sql("SELECT nama, harga, stok, gambar_url IS NOT NULL AS ada_url FROM produk WHERE akun_id = 30002 ORDER BY nama")
    catat("# Mode rentan unduh-rentan (t4-ssrf) menjangkau alamat itu; versi aman tidak. Lab ini hanya memastikan jalur dan hak tulisnya.")
    tulis("fitur.txt", "QR, kartu virtual, back office, audit berantai, dan impor katalog sebagai role aplikasi")


# ---------- beban.txt ----------

def rekam_beban():
    """make beban: generator beban berjadwal kedatangan tetap (cmd/beban), koneksi dari pg_stat_activity, kapasitas worker."""
    siapkan_data()
    mulai_semua(["-lab"], tampil="# server: ./api-t4 -lab (pool 10); push tiruan: ./pushpalsu")
    LAMA, RPS = 20, 138.9
    catat("# Beban berjadwal kedatangan tetap (open loop: permintaan berangkat menurut jadwal, tidak menunggu jawaban sebelumnya).")
    catat("# 138,9 = 20.000 aktif × 60 request ÷ 86.400 × 10 (naskah bagian 3, Asumsi). Dijalankan di laptop lab: bukan kapasitas produksi.")
    biner = d.HERE / "beban"
    subprocess.run(["go", "build", "-o", str(biner), "./cmd/beban"], cwd=d.HERE, check=True)
    bagian(f"A. {LAMA} detik pada {RPS} permintaan per detik: campuran baca saldo, riwayat, katalog, dan pembayaran")
    r = subprocess.run([str(biner), "-url", f"http://127.0.0.1:{PORT}", "-db", d.db_pemilik(d.SCHEMA, "beban"), "-aplikasi", "api-t4",
                        "-rps", str(RPS), "-detik", str(LAMA), "-password", PASSWORD, "-pengguna", "200"],
                       capture_output=True, text=True, env=d.ENV, timeout=300)
    if r.returncode not in (0, 1):
        gagal("generator beban: " + r.stderr[-400:])
    m = json.loads(r.stdout)
    catat(f"$ ./beban -rps {RPS} -detik {LAMA} -pengguna 200   # keluaran mesin diperiksa terhadap batas; nilai mentah bergantung mesin dan tidak direkam")
    catat(f"permintaan dijadwalkan: {m['dijadwalkan']} (= ⌊{RPS} × {LAMA}⌋)")
    harap(m["dijadwalkan"], int(RPS * LAMA), "jumlah permintaan terjadwal")
    catat(f"permintaan selesai: {m['selesai']} dari {m['dijadwalkan']}")
    harap(m["selesai"], m["dijadwalkan"], "semua permintaan selesai")
    catat("status: " + ", ".join(f"{k} x{v}" for k, v in sorted(m["status"].items())) + "   # 200 = baca, 201 = bayar")
    harap(set(m["status"]) <= {"200", "201"}, True, "tidak ada error")
    batas_p95 = 500
    catat(f"p95 di bawah {batas_p95} ms (batas lab, Asumsi; nilai ukur tidak direkam): {'ya' if m['p95_ms'] < batas_p95 else 'TIDAK'}")
    harap(m["p95_ms"] < batas_p95, True, "p95")
    catat(f"jadwal tidak tertinggal lebih dari 100 ms (generator tidak jadi penghambat): {'ya' if m['lag_maks_ms'] < 100 else 'TIDAK'}")
    harap(m["lag_maks_ms"] < 100, True, "generator tidak tertinggal")
    catat(f"koneksi database dari api-t4 (pg_stat_activity, disampel tiap 100 ms): paling banyak {'<= 10' if m['koneksi_maks'] <= 10 else '> 10'} (pool 10; batas ini dipasang pool sendiri, jadi bukan bukti pool tidak sesak)")
    harap(m["koneksi_maks"] <= 10, True, "koneksi tidak melewati pool")
    harap(m["aktif_maks"] <= 10, True, "koneksi aktif tidak melewati pool")
    print("beban (nilai mentah, tidak direkam):", {k: m[k] for k in ("p50_ms", "p95_ms", "p99_ms", "maks_ms", "lag_maks_ms", "koneksi_maks", "aktif_maks")}, file=sys.stderr)
    s, isi = curl("GET", "/lab/pool", tampil=False)
    catat(f"pool setelah beban: maks {j(isi)['maks']}")
    harap(j(isi)["maks"], 10, "pool 10")
    catat("# Pool tidak sesak dibuktikan oleh p95 di bawah batas dan jadwal yang tidak tertinggal: pool yang penuh membuat permintaan antre dan memecahkan salah satunya.")
    catat("# Bukan klaim kapasitas produksi.")

    bagian("B. Kapasitas worker: c ÷ t = 4 ÷ 0,3 detik = 13,3 per detik. Push tiruan menjawab 300 ms; 100 pemberitahuan dikuras satu worker")
    d.push_reset()
    d.push_mode("lambat", ms=300)
    sql("DELETE FROM outbox")
    with d.sambung() as c:
        c.execute("""INSERT INTO outbox (akun_id, kelas, jenis, payload)
                     SELECT 10000 + i, 1, 'promo', '{"judul":"Promo","isi":"x"}' FROM generate_series(1, 100) AS i""")
    mulai_t = time.time()
    d.worker(tampil=False)
    selang = time.time() - mulai_t
    terkirim = satu("SELECT count(*) FROM outbox WHERE status = 'terkirim'")
    harap(terkirim, 100, "seratus terkirim")
    laju = terkirim / selang
    catat("$ ./api-t4 -peran worker -sekali   # c = 4 pengirim serentak (bawaan), push tiruan 300 ms per pesan")
    catat(f"terkirim: {terkirim} dari 100")
    dekat = abs(laju - 4 / 0.3) / (4 / 0.3) <= 0.15
    catat(f"laju terukur dalam 15% dari 13,3 per detik: {'ya' if dekat else 'TIDAK'} (nilai ukur tidak direkam)")
    harap(dekat, True, f"kapasitas worker terukur {laju:.2f}/detik, harus dalam 15% dari 13,33")
    catat("\n# Pengumuman ke 100.000 HP: 100.000 ÷ 13,3 = 7.500 detik = 125 menit. Hitungan dari c ÷ t, Tidak dijalankan:")
    catat("# lab tidak menulis 100.000 baris outbox dan tidak mengirimnya; angka itu diekstrapolasi dari laju yang baru diukur.")
    catat(f"hitungan: 100000 / (4 / 0,3) = {100000 / (4 / 0.3):.0f} detik")
    tulis("beban.txt", "beban berjadwal 138,9 request per detik, koneksi lawan pool, kapasitas worker",)


# ---------- testing.txt ----------

def go_test(*args, env, cwd=d.HERE):
    r = subprocess.run(["go", *args], cwd=cwd, env=env, capture_output=True, text=True)
    teks = (r.stdout + r.stderr).replace("\t", "  ")
    teks = re.sub(r" \(\d+\.\d+s\)", "", teks)
    teks = re.sub(r"^(ok|FAIL)(\s+\S+)\s+[\d.]+s", r"\1\2", teks, flags=re.M)
    teks = re.sub(r"^(ok\s+\S+)\s+\(cached\)", r"\1", teks, flags=re.M)
    teks = re.sub(r"^\d{4}/\d\d/\d\d \d\d:\d\d:\d\d(?:\.\d+)? ", "", teks, flags=re.M)   # baris log yang dicetak tes membawa waktu
    teks = re.sub(r"(?<=:)\d{4,5}\b", "<port>", teks)                                        # port sementara server uji (httptest)
    return r.returncode, teks.rstrip()


def rekam_testing():
    d.buat_schema(d.TES)   # dengan hak: dua tes berjalan sebagai role aplikasi api_t4 (hak kolom dan tabel yang kurang baru ketahuan di sana)
    tes_db = d.db_pemilik(d.TES, "api-t4-tes")
    tes_app = f"postgres://{d.ROLE}:{d.ROLE}@127.0.0.1:{d.DB_PORT}/lab?search_path={d.TES}&application_name=api-t4-tes-app"
    bagian(f"A. go vet, lalu tes aturan uang, outbox, tingkat verifikasi, QR, kartu, dan audit dengan PostgreSQL sungguhan (schema {d.TES}, skema akhir Tahap 4)")
    rc, teks = go_test("vet", "./...", env=d.ENV)
    catat("$ go vet ./...")
    catat(teks or "(tanpa temuan)")
    catat(f"# exit status {rc}")
    harap(rc, 0, "go vet")
    rc, teks = go_test("test", "-v", "-count=1", "-p", "1", "./...",
                       env=dict(d.ENV, TEST_DATABASE_URL=tes_db, TEST_APP_DATABASE_URL=tes_app, TEST_DATABASE_URL_APP=tes_app,
                                TEST_REDIS_ADDR=f"127.0.0.1:{d.REDIS_PORT}"))
    teks = "\n".join(l for l in teks.splitlines() if not l.startswith("?") and not l.startswith("=== RUN") and not l.startswith("=== PAUSE") and not l.startswith("=== CONT"))
    catat(f"$ TEST_DATABASE_URL=<pemilik, schema {d.TES}> TEST_APP_DATABASE_URL=<role api_t4, schema yang sama> TEST_REDIS_ADDR=<Redis lab> go test -v -count=1 -p 1 ./...")
    catat(teks)
    catat(f"# exit status {rc}")
    if rc != 0:   # lab gagal keras, tetapi alasannya harus terbaca
        print("\n".join(l for l in teks.splitlines() if "FAIL" in l or "panic" in l or l.startswith("    ")), file=sys.stderr)
    harap(rc, 0, "go test")
    harap("--- SKIP" in teks, False, "tes dilewati")
    bagian("B. Tanpa TEST_DATABASE_URL dan TEST_REDIS_ADDR: tes yang butuh keduanya dilewati, tes tanpa itu tetap jalan")
    rc, teks = go_test("test", "-count=1", "./...", env={k: v for k, v in d.ENV.items() if k not in ("TEST_DATABASE_URL", "TEST_REDIS_ADDR")})
    teks = "\n".join(l for l in teks.splitlines() if not l.startswith("?"))
    catat("$ go test -count=1 ./...")
    catat(teks)
    catat(f"# exit status {rc}")
    harap(rc, 0, "go test tanpa database")
    bagian("C. TES_DB_WAJIB=1 dan TES_REDIS_WAJIB=1 tanpa database dan Redis: gagal keras, bukan hijau karena tes dilewati (pola 2.24)")
    rc, teks = go_test("test", "-count=1", "./...", env={**{k: v for k, v in d.ENV.items() if k not in ("TEST_DATABASE_URL", "TEST_REDIS_ADDR")},
                                                       "TES_DB_WAJIB": "1", "TES_REDIS_WAJIB": "1"})
    teks = "\n".join(l for l in teks.splitlines() if not l.startswith("?"))
    catat("$ TES_DB_WAJIB=1 TES_REDIS_WAJIB=1 go test -count=1 ./...")
    catat(teks)
    catat(f"# exit status {rc}")
    harap(rc, 1, "TES_DB_WAJIB tanpa database")
    tulis("testing.txt", "tes Go untuk aturan uang, outbox, tingkat verifikasi, QR, kartu, dan audit",)


BAGIAN = {"skema": rekam_skema, "topup": rekam_topup, "verifikasi": rekam_verifikasi, "batas": rekam_batas,
          "rentan": rekam_rentan, "fitur": rekam_fitur, "beban": rekam_beban, "testing": rekam_testing}


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
