"""Rekam lab API Tahap 5 (lab-api-t5): api-t4 naik ke enam service dan satu negara.

curl -i ke server Go + PostgreSQL 17, schema tahap5 (satu schema, 30 tabel) lalu dipecah ke enam schema service
(t5_ledger, t5_akun, t5_pembayaran, t5_merchant, t5_notifikasi, t5_cicilan) dengan role per service; tes Go di
tahap5_tes. PgBouncer 1.26.1, Redis, gateway, layanan verifikasi, dan layanan push adalah tiruan atau komponen lokal
di container, bukan layanan sungguhan. Setiap bagian membuat ulang schema dan data awal dari nol, jadi output/*.txt tidak
bergantung pada urutan bagian dan rekaman ulang identik per byte (make cek). Token, waktu, tanggal, dan nama partisi yang
relatif disamarkan atau dibuat relatif; angka yang bergantung mesin (waktu, jumlah koneksi) hanya direkam sebagai batas
yang diperiksa. Lab gagal keras bila port sudah dipakai, atau bila hasilnya tidak sesuai yang diharapkan.

    make -C labs/api-t5 run                      (butuh: Docker, Go; PostgreSQL dijalankan lewat labs/b3-race, Redis lewat labs/b9-cache)
    make -C labs/api-t5 run BAGIAN=laporan       (satu bagian: skema laporan pooler beban testing)
    make -C labs/api-t5 beban                    (hanya bagian beban)
"""
import json, os, pathlib, re, subprocess, sys, tempfile, threading, time

import psycopg
import redis

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import dasar_t5 as d  # noqa: E402
from dasar_t5 import (PORT, PORT_PGBOUNCER, PORT_PUSH, bagian, catat, curl, gagal, harap, j, login, samaran, satu,  # noqa: E402
                      sql)

PASSWORD = d.PASSWORD
SP = ",".join(d.SCHEMA_LAYANAN)       # search_path pemilik schema sesudah dipecah
LABEL_SCHEMA = "schema t5_ledger, t5_akun, t5_pembayaran, t5_merchant, t5_notifikasi, t5_cicilan"
BANDING_NASKAH = "plan/CERITA-TAHAP-5.md bagian 3b"
IMAGE_PGB = "api-t5-pgbouncer:1.26.1"


def tulis(nama, judul, label=LABEL_SCHEMA, dasar=d.DASAR):
    """Seperti dasar_t5.tulis, tetapi kepala menyebut enam schema service. Tidak memuat nomor keputusan atau ID riset."""
    for port in list(d.server):
        d.stop(port)
    versi = d.satu("SHOW server_version", "public")
    kepala = [f"# Lab api-t5 · {judul}",
              f"# PostgreSQL {versi} · {d.versi_alat()} · pgx {d.PGX} · {label} · server Go di 127.0.0.1:{dasar}",
              "# Rekaman dari database bersih: make -C labs/api-t5 run."]
    d.OUT.mkdir(exist_ok=True)
    (d.OUT / nama).write_text("\n".join(l.rstrip() for l in "\n".join(kepala + d.log).split("\n")) + "\n")
    print("ditulis:", f"labs/api-t5/output/{nama}")
    d.log.clear()


def siapkan_layanan():
    """Schema bersih -> 30 tabel -> data awal -> enam schema service. Mengembalikan FK lintas schema sebelum dihapus."""
    d.LAYANAN["aktif"] = False
    d.buat_schema()
    d.seed()
    return d.pecah_layanan()


def pemilik(q, tampil=True):
    """Satu perintah sebagai pemilik schema di enam schema service, keluaran seperti psql."""
    return sql(q, tampil=tampil, schema=SP)


def sebagai(role, q):
    """Jalankan q sebagai role itu; mengembalikan (sqlstate, pesan) bila ditolak, (None, None) bila berhasil."""
    try:
        with psycopg.connect(d.db_role(role, nama="api-t5-role"), autocommit=True) as c:
            c.execute(q)
        return None, None
    except psycopg.Error as e:
        return e.sqlstate, e.diag.message_primary


def tolak_sebagai(role, q, sqlstate):
    kode, pesan = sebagai(role, q)
    catat(f"{role}: {q}")
    harap(kode, sqlstate, f"{role}: {q}")
    catat(f"  ERROR:  {pesan}   -- SQLSTATE {kode}")


def coba_tolak(q, sqlstate, constraint=None, schema=SP):
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


def nama_pendek(s):
    return s.replace("t5_", "")


def hak_dari_katalog(role, schemas, usage=False):
    """Hak sebuah role atas tabel di schema-schema itu, dibaca dari katalog PostgreSQL (bukan dari GRANT di layanan.sql):
    himpunan 'tabel:HAK' untuk hak tabel dan 'tabel.kolom:HAK' untuk hak kolom (has_column_privilege juga benar bila hak
    tabelnya ada). Tabel dikenali dari nama saja, tanpa schema, supaya sebelum dan sesudah dipecah bisa dibandingkan.
    usage=True menambah 'schema:NAMA:USAGE' untuk schema yang boleh dimasuki role itu."""
    tabel = ("SELECT c.relname || ':' || p.priv FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
             "CROSS JOIN unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) AS p(priv) "
             "WHERE n.nspname = ANY(%s) AND c.relkind IN ('r', 'p') AND has_table_privilege(%s, c.oid, p.priv)")
    kolom = ("SELECT c.relname || '.' || a.attname || ':' || p.priv FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
             "JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped "
             "CROSS JOIN unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'REFERENCES']) AS p(priv) "
             "WHERE n.nspname = ANY(%s) AND c.relkind IN ('r', 'p') AND has_column_privilege(%s, c.oid, a.attnum, p.priv)")
    with d.sambung("public") as c:
        hasil = {r[0] for r in c.execute(tabel, (list(schemas), role)).fetchall()}
        hasil |= {r[0] for r in c.execute(kolom, (list(schemas), role)).fetchall()}
        if usage:
            hasil |= {f"schema:{r[0]}:USAGE" for r in c.execute(
                "SELECT nspname FROM pg_namespace WHERE nspname = ANY(%s) AND has_schema_privilege(%s, oid, 'USAGE')",
                (list(schemas), role)).fetchall()}
    return hasil


# ---------- skema.txt ----------

KOLOM_NASKAH = {   # blok mermaid naskah bagian 3b, tabel baru dan tabel yang berubah
    "snapshot_saldo": "buku_id, periode, saldo, jumlah_posting, dibuat",
    "arsip_partisi": "periode, kunci_objek, checksum, kunci_data_terbungkus, versi_kek, dibuat",
    "ringkasan_merchant_harian": "merchant_akun_id, tanggal, jumlah_transaksi, total, diperbarui_pada",
    "jadwal_cicilan": "id, akun_id, jenis, merchant_akun_id, jumlah_per_angsuran, jumlah_angsuran, hari_tagih, status",
    "angsuran": "jadwal_id, ke, jatuh_tempo, status, jurnal_id",
    "pengumuman": "id, judul, status, jumlah_penerima, dibuat_oleh, mulai, selesai",
    "mitra_pos": "id, nama, kunci_hash, status, kuota_per_detik, dibuat",
    "sakelar": "nama, nilai, diubah_oleh, diubah",
    "posting": "id, jurnal_id, buku_id, jumlah, dibuat",
}
SERVICE_NASKAH = {   # tabel "Service (schema)" naskah bagian 3b
    "t5_ledger": "arsip_partisi, baris_pencairan, batch_pencairan, buku, jurnal, kunci_idempotensi, outbox, posting, snapshot_saldo",
    "t5_akun": "akun, audit_log, kota, sesi, verifikasi",
    "t5_pembayaran": "insiden_rekon, kartu, otorisasi_kartu, sakelar, topup_bank, webhook_event",
    "t5_merchant": "mitra_pos, operasi_sinkron, produk, promo, qr, ringkasan_merchant_harian",
    "t5_notifikasi": "pengumuman, perangkat",
    "t5_cicilan": "angsuran, jadwal_cicilan",
}


def rekam_skema():
    d.LAYANAN["aktif"] = False
    d.buat_schema()
    d.seed()
    sch = d.SCHEMA
    bagian("A. Skema akhir Tahap 4, lalu migrasi api-t5 000024 sampai 000026 (satu transaction, schema kosong)")
    catat("# api-t1/schema.sql + b4-migration/baru/000005 + api-t2/migrasi/000009..000014 + api-t3/migrasi/000015..000019 +")
    catat("# api-t4/migrasi/000020..000023 = akhir Tahap 4 (22 tabel); yang ditulis lab ini:")
    for f in d.MIGRASI_T5:
        catat(f"$ psql -1 -f migrasi/{f.name}")
    tabel_q = ("FROM pg_class c WHERE c.relnamespace = current_schema()::regnamespace AND c.relkind IN ('r', 'p') "
               "AND NOT c.relispartition")
    n = sql(f"SELECT count(*) AS tabel {tabel_q}", schema=sch)[0][0]
    harap(n, 30, "jumlah tabel")
    sql(f"SELECT c.relname AS tabel, c.relkind AS jenis {tabel_q} ORDER BY c.relname", schema=sch)
    catat("# jenis p = tabel berpartisi, r = tabel biasa. 22 tabel Tahap 4 + 8 baru (snapshot_saldo, arsip_partisi,")
    catat("# ringkasan_merchant_harian, jadwal_cicilan, angsuran, pengumuman, mitra_pos, sakelar); partisi posting bukan tabel inti.")

    bagian(f"B. Kolom tabel baru dan tabel yang berubah dibandingkan dengan blok mermaid naskah ({BANDING_NASKAH}); skema lab yang benar")
    catat("# tabel | kolom di lab | sama dengan naskah")
    for tabel, naskah in KOLOM_NASKAH.items():
        kolom = ", ".join(r[0] for r in sql(
            f"SELECT column_name FROM information_schema.columns WHERE table_schema = '{sch}' AND table_name = '{tabel}' "
            "ORDER BY ordinal_position", tampil=False, schema=sch))
        harap(kolom, naskah, f"kolom {tabel}")
        catat(f"{tabel} | {kolom} | ya")
    for tabel, kol in (("akun", "mitra_pos_id"), ("jurnal", "referensi")):
        ada = satu(f"SELECT count(*) FROM information_schema.columns WHERE table_schema = '{sch}' AND table_name = '{tabel}' "
                   f"AND column_name = '{kol}'", sch)
        harap(ada, 1, f"{tabel}.{kol}")
        catat(f"{tabel} | kolom baru {kol} | ya")
    catat("# Selisih dengan naskah, skema lab yang benar: (1) outbox menerima jenis baru 'pengumuman' dan tujuan 'stream' (naskah hanya")
    catat("# menulis tujuan stream); (2) jurnal.referensi punya CHECK bentuk (angsuran|tabungan):<jadwal>:<ke>; (3) status jadwal_cicilan")
    catat("# (aktif, selesai, dihentikan) dan batas angka kolom adalah rancangan lab (Asumsi desain); (4) PK posting (id, dibuat) tidak menjaga")
    catat("# keunikan id lintas partisi: keunikannya datang dari sequence.")
    sql("SELECT pg_get_constraintdef(oid) AS aturan_jenis_jurnal FROM pg_constraint WHERE conname = 'jurnal_jenis_check' "
        "AND connamespace = current_schema()::regnamespace", schema=sch)
    sql("SELECT pg_get_constraintdef(oid) AS aturan_buku_milik_akun FROM pg_constraint WHERE conname = 'buku_pemilik' "
        "AND connamespace = current_schema()::regnamespace", schema=sch)
    sql("SELECT pg_get_constraintdef(oid) AS aturan_tujuan_outbox FROM pg_constraint WHERE conname = 'outbox_tujuan_check' "
        "AND connamespace = current_schema()::regnamespace", schema=sch)

    bagian("C. posting dipartisi per bulan menurut dibuat: PK (id, dibuat), tanpa partisi DEFAULT, trigger ledger di tabel dan partisinya")
    sql("SELECT pg_get_partkeydef('posting'::regclass) AS kunci_partisi, "
        "(SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'posting'::regclass AND contype = 'p') AS pk", schema=sch)
    sql("SELECT c.relname AS partisi, pg_get_expr(c.relpartbound, c.oid) AS batas FROM pg_inherits i "
        "JOIN pg_class c ON c.oid = i.inhrelid WHERE i.inhparent = 'posting'::regclass ORDER BY c.relname", schema=sch)
    catat("# Nama partisi relatif terhadap bulan migration dijalankan (posting_bulan_00 = bulan berjalan, zona Asia/Jakarta), supaya rekaman")
    catat("# sama di bulan mana pun; batasnya disamarkan. posting_sebelum menampung semua baris sebelum bulan berjalan (partisi berbatas, bukan DEFAULT).")
    harap(satu("SELECT count(*) FROM pg_inherits i JOIN pg_class c ON c.oid = i.inhrelid WHERE i.inhparent = 'posting'::regclass "
               "AND pg_get_expr(c.relpartbound, c.oid) = 'DEFAULT'", sch), 0, "partisi default")
    sql("SELECT tgrelid::regclass AS tabel, tgname AS trigger FROM pg_trigger WHERE NOT tgisinternal "
        "AND tgrelid IN ('posting'::regclass, 'posting_bulan_00'::regclass) ORDER BY tgrelid::regclass::text, tgname", schema=sch)

    bagian("D. Aturan ledger tetap dijaga database di tabel posting yang dipartisi (dijalankan sebagai pemilik schema)")
    with d.sambung(sch, autocommit=False) as c:
        j1 = c.execute("INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('topup', 'jurnal satu posting', 400) RETURNING id").fetchone()[0]
        c.execute("INSERT INTO posting (jurnal_id, buku_id, jumlah) SELECT %s, id, 1000 FROM buku WHERE akun_id = 419", (j1,))
        catat("=> INSERT INTO jurnal ...; INSERT INTO posting (satu baris, jumlah 1000); COMMIT")
        try:
            c.commit()
        except psycopg.Error as e:
            harap((e.sqlstate, e.diag.constraint_name), ("23514", "jurnal_seimbang"), "jurnal tidak seimbang")
            catat(f"ERROR:  {samarkan_jurnal(e.diag.message_primary)}")
            catat("   -- SQLSTATE 23514 · constraint jurnal_seimbang")
        else:
            gagal("jurnal satu posting harus ditolak saat COMMIT")
    coba_tolak("UPDATE posting SET jumlah = jumlah + 1", "23001", "posting_bulan_00_tidak_diubah", sch)
    coba_tolak("DELETE FROM posting", "23001", "posting_bulan_00_tidak_diubah", sch)
    coba_tolak("TRUNCATE posting", "23001", "posting_tidak_diubah", sch)
    coba_tolak("TRUNCATE posting_bulan_00", "23001", "posting_bulan_00_tidak_diubah", sch)
    coba_tolak("INSERT INTO posting (jurnal_id, buku_id, jumlah, dibuat) SELECT min(id), min(id), 5, now() + interval '5 years' FROM buku",
               "23514", None, sch)
    coba_tolak("CREATE TEMP TABLE coba_partisi (id bigint PRIMARY KEY, dibuat timestamptz NOT NULL) PARTITION BY RANGE (dibuat)",
               "0A000", None, sch)
    catat("# UPDATE dan DELETE lewat tabel induk ditolak oleh trigger yang ikut terpasang di partisi yang menyimpan barisnya (nama constraint memuat")
    catat("# nama partisi). Baris di luar semua partisi ditolak (tidak ada partisi DEFAULT), dan PRIMARY KEY tanpa kolom kunci partisi ditolak.")
    bagian("E. 30 tabel dipecah ke enam schema service, satu role per service; foreign key lintas schema dihapus (layanan.sql)")
    catat("# Pembagian mengikuti tabel 'Service (schema)' naskah bagian 3b (rancangan, Asumsi desain). Awalan t5_ karena nama schema")
    catat("# dan role global di database lab bersama. Data awal (kota, akun, produk) dimuat dulu, lalu tabel dipindah.")
    catat("$ psql -f layanan.sql   # langkah 1: schema, role, pemindahan tabel")
    hak_awal = hak_dari_katalog(d.ROLE, [sch])   # hak role api_t5 sebelum tabel dipecah: patokan untuk t5_app sesudahnya
    fk = d.pecah_layanan(sch)
    catat(f"# foreign key lintas schema service SEBELUM dihapus, dibaca dari katalog PostgreSQL: {len(fk)}")
    for x in fk:
        catat("  " + nama_pendek(x))
    catat("# Tahap 4 menghitung 21 foreign key lintas modul untuk enam modul t4-modul; pembagian tabel dan modul berbeda, jadi angkanya berbeda.")
    catat("$ psql -f layanan.sql   # langkah 2: DROP CONSTRAINT untuk setiap foreign key lintas schema")
    lintas = d.fk_lintas()
    sql(f"SELECT count(*) AS fk_lintas_schema FROM pg_constraint c JOIN pg_class a ON a.oid = c.conrelid JOIN pg_class b ON b.oid = c.confrelid "
        f"WHERE c.contype = 'f' AND c.conparentid = 0 AND a.relnamespace <> b.relnamespace AND a.relnamespace::regnamespace::text = ANY (string_to_array('{SP}', ',')) "
        f"AND b.relnamespace::regnamespace::text = ANY (string_to_array('{SP}', ','))", schema=SP)
    harap(len(lintas), 0, "FK lintas schema sesudah")
    sql(f"SELECT count(*) AS fk_di_dalam_schema FROM pg_constraint c JOIN pg_class a ON a.oid = c.conrelid JOIN pg_class b ON b.oid = c.confrelid "
        f"WHERE c.contype = 'f' AND c.conparentid = 0 AND a.relnamespace = b.relnamespace AND a.relnamespace::regnamespace::text = ANY (string_to_array('{SP}', ','))", schema=SP)
    hasil = sql(f"SELECT n.nspname AS schema, count(*) AS tabel, string_agg(c.relname, ', ' ORDER BY c.relname) AS daftar FROM pg_class c "
                f"JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = ANY (string_to_array('{SP}', ',')) AND c.relkind IN ('r', 'p') "
                f"AND NOT c.relispartition GROUP BY n.nspname ORDER BY n.nspname", schema=SP)
    harap({r[0]: r[2] for r in hasil}, SERVICE_NASKAH, "pembagian tabel per service")
    harap(sum(r[1] for r in hasil), 30, "jumlah tabel enam schema")
    catat("# Pembagian sama dengan tabel naskah: ledger 9, akun 5, pembayaran 6, merchant 6, notifikasi 2, cicilan 2 = 30.")

    bagian("F. Hak per role: tiap service hanya menyentuh schema-nya; satu proses (t5_app) mewarisi keenam role")
    tolak_sebagai("t5_cicilan", "SELECT 1 FROM t5_ledger.jurnal LIMIT 1", "42501")
    tolak_sebagai("t5_notifikasi", "INSERT INTO t5_ledger.posting (jurnal_id, buku_id, jumlah) VALUES (1, 1, 1)", "42501")
    tolak_sebagai("t5_akun", "SELECT 1 FROM t5_ledger.buku LIMIT 1", "42501")
    tolak_sebagai("t5_merchant", "SELECT count(*) FROM t5_pembayaran.kartu", "42501")
    tolak_sebagai("t5_ledger", "UPDATE t5_ledger.posting SET jumlah = jumlah", "42501")
    tolak_sebagai("t5_ledger", "DELETE FROM t5_ledger.jurnal", "42501")
    tolak_sebagai("t5_cicilan", "CREATE TABLE t5_ledger.tabel_gelap (a int)", "42501")
    tolak_sebagai("t5_akun", "UPDATE t5_akun.audit_log SET aksi = 'x'", "42501")
    kode, pesan = sebagai("t5_ledger", "SELECT id, tingkat, status FROM t5_akun.akun LIMIT 1")
    harap(kode, None, "kontrak kolom ledger ke akun")
    catat("t5_ledger: SELECT id, tingkat, status FROM t5_akun.akun LIMIT 1   -- berhasil: kontrak kolom lintas service (tanpa kolom nama)")
    tolak_sebagai("t5_ledger", "SELECT nama FROM t5_akun.akun LIMIT 1", "42501")
    kode, _ = sebagai("t5_app", "SELECT count(*) FROM akun a JOIN buku b ON b.akun_id = a.id JOIN produk p ON p.akun_id = a.id JOIN perangkat g ON g.akun_id = a.id")
    harap(kode, None, "t5_app membaca enam schema tanpa awalan")
    catat("t5_app: SELECT count(*) FROM akun a JOIN buku b ... JOIN produk p ... JOIN perangkat g ...   -- berhasil, tanpa awalan schema (search_path role)")
    tolak_sebagai("t5_app", "UPDATE posting SET jumlah = jumlah", "42501")
    # Contoh di atas hanya delapan penolakan. Pemeriksaan berikut dihitung dari katalog untuk semua tabel dan kolom.
    hak_app = hak_dari_katalog("t5_app", d.SCHEMA_LAYANAN)
    harap(hak_app, hak_awal, "t5_app harus punya persis hak yang dimiliki api_t5 sebelum tabel dipecah")
    catat(f"# Katalog: t5_app (mewarisi enam role) punya persis {len(hak_awal)} hak tabel dan kolom yang dimiliki role api_t5 sebelum tabel dipecah: ya")
    luar = {}
    for role in d.SCHEMA_LAYANAN:
        hak = hak_dari_katalog(role, [s for s in d.SCHEMA_LAYANAN if s != role], usage=True)
        if hak:
            luar[role] = hak
    kontrak = {"t5_ledger": {"akun.id:SELECT", "akun.tingkat:SELECT", "akun.status:SELECT", "schema:t5_akun:USAGE"}}
    harap(luar, kontrak, "hak role service atas tabel dan schema service lain")
    catat("# Katalog: hak tiap role service atas tabel dan schema service lain: hanya t5_ledger yang punya, yaitu USAGE schema akun dan SELECT atas")
    catat("# kolom id, tingkat, dan status tabel akun (kontrak kolom); role lain tidak punya hak apa pun di schema service lain: ya")
    nama_tabel = [t for daftar in SERVICE_NASKAH.values() for t in daftar.split(", ")]
    with psycopg.connect(d.db_role("t5_app", nama="api-t5-role"), autocommit=True) as c:
        ditemukan = c.execute("SELECT count(*) FROM unnest(%s::text[]) AS n WHERE to_regclass(n) IS NOT NULL", (nama_tabel,)).fetchone()[0]
    harap(ditemukan, 30, "t5_app menemukan semua tabel lewat search_path")
    catat("# Katalog: t5_app menemukan semua 30 tabel tanpa awalan schema lewat search_path rolenya: ya")

    bagian("G. Server api-t5 dalam satu proses sebagai t5_app di enam schema: login, bayar, riwayat, dan saldo cocok dengan posting")
    d.mulai_push()
    d.mulai_api(["-lab"], tampil="# server: ./api-t5 -lab sebagai role t5_app (search_path = enam schema); push tiruan: ./pushpalsu")
    t_budi = login("budi@lestari.example", label="Budi")
    curl("GET", "/akun/419", token=t_budi)
    curl("POST", "/transfers", {"ke": 505, "nominal": 1000}, token=t_budi)
    s_r, isi_r = curl("GET", "/akun/419/riwayat?batas=2", token=t_budi, tampil=False)
    r = j(isi_r)["riwayat"]
    harap((s_r, len(r), r[0]["jenis"], r[0]["arah"], r[0]["jumlah"]), (200, 2, "bayar", "keluar", 1000), "riwayat")
    catat("$ curl -i -X GET '/akun/419/riwayat?batas=2' -H 'Authorization: Bearer <token sesi Budi>'")
    catat("200 OK, 2 baris; baris pertama: bayar keluar Rp1.000 ke Warung 505   # kursor halaman berikutnya berisi waktu, tidak direkam")
    pemilik("SELECT b.akun_id AS akun, b.saldo_cache, coalesce(sum(p.jumlah), 0) AS jumlah_posting FROM buku b LEFT JOIN posting p ON p.buku_id = b.id "
            "WHERE b.akun_id IN (419, 505) GROUP BY b.akun_id, b.saldo_cache ORDER BY 1")
    tulis("skema.txt", "30 tabel, partisi posting, enam schema service, role per service, dan foreign key lintas schema",
          label=LABEL_SCHEMA + " (satu schema tahap5 sebelum dipecah)")


def samarkan_jurnal(teks):
    return re.sub(r"jurnal \d+", "jurnal <id>", teks)


# ---------- laporan.txt ----------

def mulai_api_t5(args=(), tampil=None):
    for port in (PORT, PORT_PUSH):
        d.stop(port)
    d.mulai_push()
    d.mulai_api(["-lab", *args], tampil=tampil)


def muat_beban(rps, detik, laporan_rps=0.0, hanya_bayar=False):
    biner = d.HERE / "beban"
    subprocess.run(["go", "build", "-o", str(biner), "./cmd/beban"], cwd=d.HERE, check=True)
    cmd = [str(biner), "-url", f"http://127.0.0.1:{PORT}", "-db", d.db_pemilik(SP, "beban"), "-aplikasi", d.APP_NAMA,
           "-rps", str(rps), "-detik", str(detik), "-pengguna", "200"]
    if laporan_rps:
        cmd += ["-laporan-rps", str(laporan_rps)]
    if hanya_bayar:
        cmd += ["-hanya-bayar"]
    r = subprocess.run(cmd, capture_output=True, text=True, env=d.ENV, timeout=600)
    if r.returncode not in (0, 1):
        gagal("generator beban: " + r.stderr[-400:])
    m = json.loads(r.stdout)
    if m.get("galat_pesan"):
        print("galat generator beban (tidak direkam):", m["galat_pesan"], file=sys.stderr)
    return m


def stat_cache():
    s, isi = curl("GET", "/lab/cache-laporan", tampil=False)
    harap(s, 200, "statistik cache laporan")
    return j(isi)


def rekam_laporan():
    siapkan_layanan()
    bagian("A. Laporan merchant dibaca dari primary (versi pertama, mode rentan laporan-primary): rute hanya ada bersama mode itu")
    mulai_api_t5(tampil="# server: ./api-t5 -lab (tanpa mode rentan); push tiruan: ./pushpalsu")
    t505 = login("warung505@lestari.example", label="Warung 505")
    s, _ = curl("GET", "/merchant/505/laporan/hari-ini", token=t505)
    harap(s, 404, "tanpa mode rute laporan tidak ada")
    mulai_api_t5(["-rentan", "laporan-primary"], tampil="# server: ./api-t5 -lab -rentan laporan-primary")
    t505 = login("warung505@lestari.example", label="Warung 505")
    t506 = login("warung506@lestari.example", label="Warung 506")
    t_budi = login("budi@lestari.example", label="Budi")
    curl("POST", "/transfers", {"ke": 505, "nominal": 35000}, token=t_budi)
    curl("POST", "/transfers", {"ke": 505, "nominal": 12000}, token=t_budi)
    s, isi = curl("GET", "/merchant/505/laporan/hari-ini", token=t505)
    harap((s, j(isi)["jumlah_transaksi"], j(isi)["total"], j(isi)["dibaca_dari"]), (200, 2, 47000, "primary"), "laporan warung 505")
    s, _ = curl("GET", "/merchant/505/laporan/hari-ini", token=t506)
    harap(s, 404, "laporan merchant lain")
    s, _ = curl("GET", "/merchant/505/laporan/hari-ini", token=t_budi)
    harap(s, 404, "laporan oleh karyawan")
    catat("# Query laporan menjumlah posting masuk ke buku merchant hari ini langsung dari tabel posting di primary, tiap panggilan.")
    with d.sambung(SP) as c:
        plan = c.execute("EXPLAIN (ANALYZE, FORMAT JSON) SELECT count(*), coalesce(sum(p.jumlah), 0) FROM buku b JOIN posting p ON p.buku_id = b.id "
                         "WHERE b.akun_id = 505 AND b.jenis IN ('warung', 'merchant') AND p.jumlah > 0 AND p.dibuat >= date_trunc('day', now()) "
                         "AND p.dibuat < date_trunc('day', now()) + interval '1 day'").fetchone()[0][0]
    eksekusi = plan["Execution Time"]
    catat(f"waktu eksekusi query laporan satu warung di database di bawah 1 ms (EXPLAIN ANALYZE; batas lab, nilai ukur tidak direkam): {'ya' if eksekusi < 1 else 'TIDAK'}")
    harap(eksekusi < 1, True, f"eksekusi query laporan {eksekusi} ms")
    catat("# Batas `dibuat` memangkas partisi: hanya partisi bulan berjalan yang dibaca (tes TestLaporanHariIniMemangkasPartisi).")

    bagian("B. Pembayaran dengan dan tanpa polling laporan: p95 pembayaran sebagai batas, bukan nilai tunggal")
    DETIK, BAYAR_RPS, LAPORAN_RPS = 10, 100.0, 666.7
    catat("# 666,7 per detik = 20.000 merchant online ÷ 30 detik (naskah bagian 3, Asumsi). Di lab polling berasal dari 9 warung,")
    catat("# bukan 20.000 merchant, dan data hari ini kecil: lab memeriksa batas, bukan menirukan produksi.")
    m0 = muat_beban(BAYAR_RPS, DETIK, hanya_bayar=True)
    m1 = muat_beban(BAYAR_RPS, DETIK, laporan_rps=LAPORAN_RPS, hanya_bayar=True)
    total_l = int(LAPORAN_RPS * DETIK)
    catat(f"$ ./beban -rps {BAYAR_RPS} -detik {DETIK} -pengguna 200 -hanya-bayar   # tanpa laporan")
    harap((m0["bayar_selesai"], set(m0["bayar_status"])), (int(BAYAR_RPS * DETIK), {"201"}), "pembayaran tanpa laporan")
    catat(f"pembayaran selesai: {m0['bayar_selesai']} dari {int(BAYAR_RPS * DETIK)}, semua 201")
    catat(f"$ ./beban -rps {BAYAR_RPS} -detik {DETIK} -pengguna 200 -hanya-bayar -laporan-rps {LAPORAN_RPS}   # dengan laporan")
    harap((m1["bayar_selesai"], set(m1["bayar_status"])), (int(BAYAR_RPS * DETIK), {"201"}), "pembayaran dengan laporan")
    harap((m1["laporan_selesai"], set(m1["laporan_status"])), (total_l, {"200"}), "laporan")
    catat(f"pembayaran selesai: {m1['bayar_selesai']} dari {int(BAYAR_RPS * DETIK)}, semua 201; laporan selesai: {m1['laporan_selesai']} dari {total_l}, semua 200")
    batas = 2000
    for nama, m in (("tanpa laporan", m0), ("dengan laporan", m1)):
        catat(f"p95 pembayaran {nama} di bawah {batas} ms (batas lab, Asumsi; nilai ukur tidak direkam): {'ya' if m['bayar_p95_ms'] < batas else 'TIDAK'}")
        harap(m["bayar_p95_ms"] < batas, True, f"p95 pembayaran {nama}")
    harap(m1["lag_maks_ms"] < 100 and m0["lag_maks_ms"] < 100, True, "generator tidak tertinggal")
    catat("jadwal tidak tertinggal lebih dari 100 ms di kedua putaran (generator tidak jadi penghambat): ya")
    print("beban laporan (nilai mentah, tidak direkam):", {k: (m0[k], m1[k]) for k in ("bayar_p95_ms", "laporan_p95_ms", "koneksi_maks", "aktif_maks")},
          file=sys.stderr)
    catat("# Selisih p95 pembayaran antara kedua putaran bergantung mesin dan beban lain di laptop: tidak direkam dan tidak dijadikan syarat.")
    catat("# Yang diperiksa: kedua putaran selesai tanpa galat, p95 di bawah batas, dan jadwal tidak tertinggal. Data lab kecil (satu hari, 9 warung),")
    catat("# jadi 666,7 per detik, CPU 167%, dan query 20 ms di naskah tetap hitungan atas Asumsi (query 20 ms, 8 vCPU), bukan rekaman.")

    bagian("C. Cache laporan 30 detik di Redis: satu client per merchant yang memanggil tiap 30 detik hampir tidak pernah mendapat hit")
    r = redis.Redis(port=d.REDIS_PORT)
    for k in r.scan_iter("laporan:*"):
        r.delete(k)
    mulai_api_t5(["-rentan", "laporan-primary", "-laporan-cache", "redis", "-laporan-redis", f"127.0.0.1:{d.REDIS_PORT}", "-laporan-ttl", "30s"],
                 tampil="# server: ./api-t5 -lab -rentan laporan-primary -laporan-cache redis -laporan-ttl 30s")
    warung = list(range(505, 514))
    tok = {w: login(f"warung{w}@lestari.example", label=f"Warung {w}") for w in warung}
    harap(curl("POST", "/lab/cache-laporan/reset", tampil=False)[0], 204, "reset statistik")
    for w in warung:
        harap(curl("GET", f"/merchant/{w}/laporan/hari-ini", token=tok[w], tampil=False)[0], 200, f"laporan {w} putaran 1")
    time.sleep(30.5)
    for w in warung:
        harap(curl("GET", f"/merchant/{w}/laporan/hari-ini", token=tok[w], tampil=False)[0], 200, f"laporan {w} putaran 2")
    st = stat_cache()
    catat(f"$ GET /merchant/<id>/laporan/hari-ini untuk 9 warung, satu client per warung, dua putaran berjarak 30,5 detik (TTL 30 detik)")
    catat(f"GET /lab/cache-laporan -> mode {st['mode']}, ttl {st['ttl_detik']:g} detik, hit {st['hit']}, miss {st['miss']}, baca database {st['db_baca']}")
    harap((st["hit"], st["miss"], st["db_baca"]), (0, 18, 18), "satu client per merchant")
    catat("hit rate: 0 dari 18 = 0%")
    harap(curl("POST", "/lab/cache-laporan/reset", tampil=False)[0], 204, "reset statistik")
    for k in r.scan_iter("laporan:*"):   # entri putaran 2 masih hidup (TTL 30 detik): kontrol mulai dari cache kosong
        r.delete(k)
    for w in warung:   # kontrol: dua client untuk merchant yang sama dalam satu jendela TTL
        for _ in range(2):
            harap(curl("GET", f"/merchant/{w}/laporan/hari-ini", token=tok[w], tampil=False)[0], 200, f"laporan {w} kontrol")
    st = stat_cache()
    catat("# Kontrol: dua client untuk setiap warung, dua panggilan berurutan dalam satu jendela TTL.")
    catat(f"GET /lab/cache-laporan -> hit {st['hit']}, miss {st['miss']}, baca database {st['db_baca']}")
    harap((st["hit"], st["miss"], st["db_baca"]), (9, 9, 9), "kontrol dua client")
    catat("hit rate kontrol: 9 dari 18 = 50%")
    catat("# Cache baru menolong bila ada panggilan kedua dalam 30 detik untuk merchant yang sama. Polling satu perangkat per merchant tiap")
    catat("# 30 detik tidak punya panggilan kedua itu. Jumlah hit dihitung dari pencacah server, bukan dari waktu.")
    tulis("laporan.txt", "laporan merchant dari primary, polling serentak, dan cache laporan 30 detik")


# ---------- pooler.txt ----------

def pastikan_image_pgbouncer():
    r = subprocess.run(["docker", "image", "inspect", IMAGE_PGB], capture_output=True, text=True)
    if r.returncode != 0:
        subprocess.run(["docker", "build", "-q", "-t", IMAGE_PGB, str(d.HERE / "pgbouncer")], check=True, capture_output=True)


def mulai_pgbouncer(tmp):
    pastikan_image_pgbouncer()
    ini = (d.HERE / "pgbouncer" / "pgbouncer.ini").read_text().replace("{db_port}", str(d.DB_PORT))
    (tmp / "pgbouncer.ini").write_text(ini)
    (tmp / "userlist.txt").write_text('"lab" "lab"\n"t5_app" "t5_app"\n')
    os.chmod(tmp, 0o755)
    for f in tmp.iterdir():
        os.chmod(f, 0o644)
    nama = f"api-t5-pgbouncer-{PORT_PGBOUNCER}"
    subprocess.run(["docker", "rm", "-f", nama], capture_output=True)
    subprocess.run(["docker", "run", "-d", "--name", nama, "-p", f"127.0.0.1:{PORT_PGBOUNCER}:6432", "-v", f"{tmp}:/etc/pgbouncer:ro", IMAGE_PGB],
                   check=True, capture_output=True)
    d.tunggu(lambda: sebagai_pgb("SELECT 1")[0], "PgBouncer menjawab", batas=20)
    return nama


def sebagai_pgb(q):
    try:
        with psycopg.connect(d.db_role("t5_app", nama="api-t5-pgb", port=PORT_PGBOUNCER), autocommit=True, connect_timeout=3) as c:
            c.prepare_threshold = None
            c.execute(q)
        return True, None
    except psycopg.Error:
        return False, None


def maks_koneksi_role(role, berhenti):
    """Sampel pg_stat_activity tiap 100 ms; mengembalikan maksimum koneksi milik role itu (di thread)."""
    hasil = {"maks": 0}

    def kerja():
        with d.sambung("public") as c:
            while not berhenti.is_set():
                n = c.execute("SELECT count(*) FROM pg_stat_activity WHERE usename = %s AND pid <> pg_backend_pid()", (role,)).fetchone()[0]
                hasil["maks"] = max(hasil["maks"], n)
                time.sleep(0.1)
    t = threading.Thread(target=kerja)
    t.start()
    return hasil, t


def jalankan_pooler(dsn, klien=12, pool=10):
    biner = d.HERE / "pooler"
    subprocess.run(["go", "build", "-o", str(biner), "./cmd/pooler"], cwd=d.HERE, check=True)
    berhenti = threading.Event()
    sampel, t = maks_koneksi_role("t5_app", berhenti)
    r = subprocess.run([str(biner), "-dsn", dsn, "-klien", str(klien), "-pool", str(pool)], capture_output=True, text=True, timeout=300)
    berhenti.set()
    t.join()
    if r.returncode != 0:
        gagal("pooler: " + r.stderr[-400:])
    return json.loads(r.stdout), sampel["maks"]


def rekam_pooler():
    siapkan_layanan()
    maks = int(satu("SHOW max_connections", "public"))
    cadangan = int(satu("SHOW superuser_reserved_connections", "public"))
    tersedia = maks - cadangan
    KLIEN, POOL = 12, 10
    bagian(f"A. Tanpa pooler: {KLIEN} client × pool {POOL} = {KLIEN * POOL} koneksi diminta, melewati max_connections")
    catat(f"=> SHOW max_connections        -- {maks}")
    catat(f"=> SHOW superuser_reserved_connections   -- {cadangan}; tersedia untuk role biasa: {maks} - {cadangan} = {tersedia}")
    harap((maks, cadangan), (100, 3), "pengaturan koneksi PostgreSQL lab")
    m, puncak = jalankan_pooler(d.db_role("t5_app", nama="api-t5-pooler"), KLIEN, POOL)
    catat(f"$ ./pooler -dsn <langsung ke PostgreSQL, role t5_app> -klien {KLIEN} -pool {POOL}   # nilai mentah bergantung koneksi lain; diperiksa terhadap batas")
    catat(f"koneksi diminta: {m['koneksi_diminta']}")
    harap(m["koneksi_diminta"], KLIEN * POOL, "koneksi diminta")
    catat(f"koneksi berhasil lebih sedikit dari diminta: {'ya' if m['koneksi_berhasil'] < m['koneksi_diminta'] else 'TIDAK'}")
    harap(m["koneksi_berhasil"] < m["koneksi_diminta"], True, "ada koneksi yang ditolak")
    catat(f"kode galat: {', '.join(sorted(m['galat']))}   # 53300 = too_many_connections")
    harap(set(m["galat"]), {"53300"}, "semua galat 53300")
    catat(f"koneksi role t5_app di PostgreSQL paling banyak <= {tersedia} (disampel tiap 100 ms): {'ya' if puncak <= tersedia else 'TIDAK'}")
    harap(puncak <= tersedia, True, "koneksi tidak melewati batas")
    catat(f"client yang mendapat seluruh {POOL} koneksinya: kurang dari {KLIEN}: {'ya' if m['klien_dengan_pool_penuh'] < KLIEN else 'TIDAK'}")
    harap(m["klien_dengan_pool_penuh"] < KLIEN, True, "tidak semua client penuh")

    bagian(f"B. PgBouncer 1.26.1, mode transaction, default_pool_size 20: client yang sama, tanpa galat 53300")
    with tempfile.TemporaryDirectory() as tmp:
        nama = mulai_pgbouncer(pathlib.Path(tmp))
        try:
            catat("$ docker run -d -p 127.0.0.1:<port>:6432 api-t5-pgbouncer:1.26.1   # pool_mode = transaction, default_pool_size = 20, max_client_conn = 1000, max_prepared_statements = 100")
            versi = subprocess.run(["docker", "run", "--rm", "--entrypoint", "pgbouncer", IMAGE_PGB, "--version"], capture_output=True, text=True).stdout.splitlines()[0]
            catat(f"$ pgbouncer --version   -- {versi}")
            harap(versi.startswith("PgBouncer 1.26.1"), True, "versi PgBouncer")
            m, puncak = jalankan_pooler(d.db_role("t5_app", nama="api-t5-pooler", port=PORT_PGBOUNCER), KLIEN, POOL)
            catat(f"$ ./pooler -dsn <lewat PgBouncer, role t5_app> -klien {KLIEN} -pool {POOL}")
            harap(m["galat"], {}, "tanpa galat lewat PgBouncer")
            catat(f"koneksi diminta: {m['koneksi_diminta']}, berhasil: {m['koneksi_berhasil']}, galat: tidak ada")
            harap((m["koneksi_diminta"], m["koneksi_berhasil"]), (KLIEN * POOL, KLIEN * POOL), "semua koneksi client berhasil")
            catat(f"query selesai: {m['query_selesai']} (= {KLIEN} client × {POOL} koneksi × 20 putaran)")
            harap(m["query_selesai"], KLIEN * POOL * 20, "semua query selesai")
            catat(f"client yang mendapat seluruh {POOL} koneksinya: {m['klien_dengan_pool_penuh']} dari {KLIEN}")
            harap(m["klien_dengan_pool_penuh"], KLIEN, "semua client penuh")
            catat(f"koneksi role t5_app di PostgreSQL paling banyak <= 20 (default_pool_size; disampel tiap 100 ms): {'ya' if puncak <= 20 else 'TIDAK'}")
            harap(puncak <= 20, True, "koneksi server dibatasi pool PgBouncer")
            catat(f"{KLIEN * POOL} koneksi client dilayani oleh paling banyak 20 koneksi ke PostgreSQL, jauh di bawah {tersedia}.")
        finally:
            subprocess.run(["docker", "rm", "-f", nama], capture_output=True)
    catat("# Prepared statement protokol extended (bawaan pgx) di mode transaction berjalan karena max_prepared_statements = 100 (PgBouncer 1.21 ke atas).")
    catat("# Dengan nilai 0 perilakunya tidak dijalankan di lab ini: Tidak dijalankan.")
    tulis("pooler.txt", "koneksi melewati max_connections tanpa pooler, dan PgBouncer di depan primary")


# ---------- beban.txt ----------

def rekam_beban():
    """make beban: generator beban berjadwal kedatangan tetap (cmd/beban) pada 1.388,9 request per detik."""
    siapkan_layanan()
    mulai_api_t5(tampil="# server: ./api-t5 -lab sebagai t5_app (pool 10); push tiruan: ./pushpalsu")
    LAMA, RPS = 15, 1388.9
    catat("# Beban berjadwal kedatangan tetap (open loop: permintaan berangkat menurut jadwal, tidak menunggu jawaban sebelumnya).")
    catat("# 1.388,9 = 200.000 aktif × 60 request ÷ 86.400 × 10 (naskah bagian 3, Asumsi). Dijalankan di laptop lab: bukan kapasitas produksi.")
    bagian(f"A. {LAMA} detik pada {RPS} permintaan per detik: campuran baca saldo, riwayat, katalog, dan pembayaran")
    m = muat_beban(RPS, LAMA)
    catat(f"$ ./beban -rps {RPS} -detik {LAMA} -pengguna 200   # keluaran mesin diperiksa terhadap batas; nilai mentah bergantung mesin dan tidak direkam")
    catat(f"permintaan dijadwalkan: {m['dijadwalkan']} (= ⌊{RPS} × {LAMA}⌋)")
    harap(m["dijadwalkan"], int(RPS * LAMA), "jumlah permintaan terjadwal")
    catat(f"permintaan selesai: {m['selesai']} dari {m['dijadwalkan']}")
    harap(m["selesai"], m["dijadwalkan"], "semua permintaan selesai")
    catat("status: " + ", ".join(f"{k} x{v}" for k, v in sorted(m["status"].items())) + "   # 200 = baca, 201 = bayar")
    harap(set(m["status"]) <= {"200", "201"}, True, "tidak ada error")
    batas_p95 = 5000   # longgar: pool 10 hampir penuh, jadi p95 antar run di laptop berkisar dari beberapa ms sampai sekitar satu detik
    catat(f"p95 di bawah {batas_p95} ms (batas lab, Asumsi; nilai ukur tidak direkam): {'ya' if m['p95_ms'] < batas_p95 else 'TIDAK'}")
    harap(m["p95_ms"] < batas_p95, True, "p95")
    catat(f"jadwal tidak tertinggal lebih dari 100 ms (generator tidak jadi penghambat): {'ya' if m['lag_maks_ms'] < 100 else 'TIDAK'}")
    harap(m["lag_maks_ms"] < 100, True, "generator tidak tertinggal")
    catat(f"koneksi database dari api-t5 (pg_stat_activity, disampel tiap 100 ms): paling banyak {'<= 15' if m['koneksi_maks'] <= 15 else '> 15'} "
          "(pool 10 ditambah koneksi yang baru dibuka atau baru ditutup client dan belum hilang di server; nilai ukur tidak direkam)")
    harap(m["koneksi_maks"] <= 15, True, "koneksi tidak jauh melewati pool")
    s_p, isi_p = curl("GET", "/lab/pool", tampil=False)
    harap(s_p, 200, "statistik pool")
    pool = j(isi_p)
    catat(f"pool setelah beban: maks {pool['maks']}, terbuka paling banyak {pool['maks']}")
    harap((pool["maks"], pool["terbuka"] <= pool["maks"]), (10, True), "pool 10")
    catat(f"permintaan yang pernah menunggu koneksi dari pool (database/sql WaitCount; nilai tidak direkam): lebih dari 0: {'ya' if pool['menunggu'] > 0 else 'TIDAK'}")
    harap(pool["menunggu"] > 0, True, "pool 10 pada 1.388,9 per detik antre")
    print("beban (nilai mentah, tidak direkam):", {k: m[k] for k in ("p50_ms", "p95_ms", "p99_ms", "maks_ms", "lag_maks_ms", "koneksi_maks", "aktif_maks")}, "pool:", pool, file=sys.stderr)
    catat("# Pada 1.388,9 per detik pool 10 antre tetapi tidak gagal: p95 di bawah batas, semua status 200 atau 201, dan jadwal tidak tertinggal.")
    catat("# Batas p95 sengaja longgar (5.000 ms): pool 10 hampir penuh, dan di laptop ini p95 antar run berkisar dari beberapa ms sampai sekitar satu detik (teramati 7 sampai 1.022 ms di run pelaksana dan peninjau).")
    catat("# Koneksi yang habis lebih dulu adalah pool satu proses (10), bukan max_connections (97 tersedia). Hitungan 180 terpasang lawan 97 tersedia")
    catat("# di naskah (6 service × 3 instance × pool 10) tetap Hitungan atas Asumsi; lab ini menjalankan satu proses dan bagian pooler membuktikan 53300.")
    catat("# Bukan klaim kapasitas produksi. Kapasitas satu primary untuk 69,4 transaksi uang per detik belum diukur di sini.")
    catat("# Pengukuran kapasitas worker (13,3 per detik) ada di labs/api-t4/output/beban.txt bagian B; tidak diulang di lab ini.")
    tulis("beban.txt", "beban berjadwal 1.388,9 request per detik, koneksi lawan pool")


# ---------- testing.txt ----------

def go_test(*args, env, cwd=d.HERE):
    r = subprocess.run(["go", *args], cwd=cwd, env=env, capture_output=True, text=True)
    teks = (r.stdout + r.stderr).replace("\t", "  ")
    teks = re.sub(r" \(\d+\.\d+s\)", "", teks)
    teks = re.sub(r"^(ok|FAIL)(\s+\S+)\s+[\d.]+s", r"\1\2", teks, flags=re.M)
    teks = re.sub(r"^(ok\s+\S+)\s+\(cached\)", r"\1", teks, flags=re.M)
    teks = re.sub(r"^\d{4}/\d\d/\d\d \d\d:\d\d:\d\d(?:\.\d+)? ", "", teks, flags=re.M)
    teks = re.sub(r"(?<=:)\d{4,5}\b", "<port>", teks)
    return r.returncode, teks.rstrip()


def rekam_testing():
    d.buat_schema(d.TES)   # dengan hak: dua tes berjalan sebagai role aplikasi api_t5
    tes_db = d.db_pemilik(d.TES, "api-t5-tes")
    tes_app = f"postgres://{d.ROLE}:{d.ROLE}@127.0.0.1:{d.DB_PORT}/lab?search_path={d.TES}&application_name=api-t5-tes-app"
    bagian(f"A. go vet, lalu tes aturan uang, partisi, outbox, referensi jurnal, tabungan, cicilan, laporan, dan pengumuman dengan PostgreSQL sungguhan (schema {d.TES}, skema akhir Tahap 5)")
    rc, teks = go_test("vet", "./...", env=d.ENV)
    catat("$ go vet ./...")
    catat(teks or "(tanpa temuan)")
    catat(f"# exit status {rc}")
    harap(rc, 0, "go vet")
    rc, teks = go_test("test", "-v", "-count=1", "-p", "1", "./...",
                       env=dict(d.ENV, TEST_DATABASE_URL=tes_db, TEST_APP_DATABASE_URL=tes_app, TEST_DATABASE_URL_APP=tes_app,
                                TEST_REDIS_ADDR=f"127.0.0.1:{d.REDIS_PORT}"))
    teks = "\n".join(l for l in teks.splitlines() if not l.startswith("?") and not l.startswith("=== RUN") and not l.startswith("=== PAUSE") and not l.startswith("=== CONT"))
    catat(f"$ TEST_DATABASE_URL=<pemilik, schema {d.TES}> TEST_APP_DATABASE_URL=<role api_t5, schema yang sama> TEST_REDIS_ADDR=<Redis lab> go test -v -count=1 -p 1 ./...")
    catat(teks)
    catat(f"# exit status {rc}")
    if rc != 0:
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
    bagian("C. TES_DB_WAJIB=1 dan TES_REDIS_WAJIB=1 tanpa database dan Redis: gagal keras, bukan hijau karena tes dilewati")
    rc, teks = go_test("test", "-count=1", "./...", env={**{k: v for k, v in d.ENV.items() if k not in ("TEST_DATABASE_URL", "TEST_REDIS_ADDR")},
                                                       "TES_DB_WAJIB": "1", "TES_REDIS_WAJIB": "1"})
    teks = "\n".join(l for l in teks.splitlines() if not l.startswith("?"))
    catat("$ TES_DB_WAJIB=1 TES_REDIS_WAJIB=1 go test -count=1 ./...")
    catat(teks)
    catat(f"# exit status {rc}")
    harap(rc, 1, "TES_DB_WAJIB tanpa database")
    d.tulis("testing.txt", "tes Go untuk aturan uang, partisi, outbox, referensi jurnal, tabungan, cicilan, laporan, dan pengumuman", lab="api-t5", schema=d.TES)


BAGIAN = {"skema": rekam_skema, "laporan": rekam_laporan, "pooler": rekam_pooler, "beban": rekam_beban, "testing": rekam_testing}


def main():
    pilih = sys.argv[1:] or list(BAGIAN)
    for nama in pilih:
        if nama not in BAGIAN:
            sys.exit(f"bagian tidak dikenal: {nama} (pilih dari: {' '.join(BAGIAN)})")
    for port in (PORT, PORT_PUSH):
        d.port_bebas(port)
    d.bangun()
    for nama in pilih:
        d.log.clear()
        BAGIAN[nama]()
    print("selesai:", ", ".join(pilih))


if __name__ == "__main__":
    main()
