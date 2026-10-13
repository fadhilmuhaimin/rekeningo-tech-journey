"""Lab b4-skema versi ledger, jalan yang benar (keputusan 533, 534): rilis 1 dengan lock_timeout saat laporan
berjalan (output/ledger/lock-timeout.txt), lalu rilis 2 migrate bertahap dan rilis 3 contract tanpa jeda
(output/ledger/tiga-rilis.txt), di schema yang sama. Dijalankan dari ledger.py.
"""
from alat_ledger import Klien, Lab, angka, app_lama, gagal, galat, harap, rp, tabel
from server_ledger import (ANI, BUDI, CITRA, EXPAND, HERE, OUT, SARI, SCHEMA, SEMUA, TABEL_AKHIR, antre, bayar, berkas,
                           buat_schema, buka_laporan, json_pendek, kepala, kode_bayar, riwayat, saldo)


# ---------- B. rilis 1 (expand) dengan lock_timeout ----------

def filenode(k, tabel_):
    return k.sql("SELECT pg_relation_filenode(%s)", (tabel_,))[0][0]


def jalankan_berkas(nama):
    def f(k):
        k.sql("BEGIN")
        k.sql(berkas(nama))
        k.sql("COMMIT")
        return "COMMIT"
    return f


def rilis_1(lab):
    kepala(lab, "M13 · rilis 1 (expand) dengan lock_timeout saat laporan berjalan (keputusan 533)", [
        "File api-t2 000009-000011 apa adanya: setiap file satu transaction dengan SET LOCAL lock_timeout = '3s'.",
        "Laporan Keuangan (R) yang sama dengan satu-langkah.txt masih terbuka saat percobaan pertama."])
    R, M, P1 = (Klien(n, lab) for n in ("R", "M", "P1"))
    buka_laporan(lab, R)
    node = filenode(R, "akun")
    M.mulai(jalankan_berkas(EXPAND[0]))
    antre(lab, M, f"percobaan 1: BEGIN; isi {EXPAND[0]}; COMMIT", "R")
    P1.mulai(bayar("v1", CITRA, ANI, 25000))
    antre(lab, P1, f"bayar Citra ({CITRA}) ke Warung Ani ({ANI}) {rp(25000)} di server v1", "M")
    hm = M.selesai()
    harap(getattr(hm.get("err"), "sqlstate", None), "55P03", "galat percobaan 1")
    lab.langkah("M", "(3 detik menunggu lock)", f"{galat(hm['err'])} -> ROLLBACK")
    h1 = P1.selesai()
    if "err" in h1:
        gagal(f"P1 gagal: {h1['err']}")
    harap(lab.keadaan(R), "idle in transaction", "R masih terbuka saat P1 selesai")
    lab.langkah("P1", "(lanjut begitu M menyerah)", f"{h1['ok']}; R masih terbuka")
    lab.tulis("# P1 hanya menunggu sampai M menyerah (paling lama lock_timeout 3 detik), bukan sampai laporan selesai.")
    lab.tulis("# lock_timeout membatasi setiap upaya mengambil lock, termasuk yang implisit; statement_timeout membatasi")
    lab.tulis("# seluruh statement (PostgreSQL 17, Client Connection Defaults). Dipasang dengan SET LOCAL di file")
    lab.tulis("# migration, jadi hanya berlaku untuk transaction migrasi, bukan untuk server.")
    print(f"lock_timeout: M menyerah sesudah {hm['detik']:.1f} detik, P1 menunggu {h1['detik']:.1f} detik")

    kolom = R.sql("SELECT count(*) FROM information_schema.columns WHERE table_schema = %s "
                  "AND table_name = 'akun' AND column_name = 'nomor_karyawan'", (SCHEMA,))[0][0]
    cek = R.sql("SELECT pg_get_constraintdef(oid) LIKE '%%sistem%%' FROM pg_constraint "
                "WHERE conname = 'akun_jenis_check' AND connamespace = %s::regnamespace", (SCHEMA,))
    harap((kolom, cek), (0, [(False,)]), "skema sesudah percobaan 1 gagal")
    lab.langkah("-", "cek skema sesudah percobaan 1",
                "kolom nomor_karyawan belum ada; akun_jenis_check masih yang lama (tanpa 'sistem'): "
                "statement pertama (DROP CONSTRAINT) yang menunggu lock dibatalkan dan transaction di-ROLLBACK, "
                "tidak ada yang setengah jadi")
    R.sql("COMMIT")
    lab.langkah("R", "COMMIT", "laporan selesai")
    h = M.jalan(jalankan_berkas(EXPAND[0]))
    if "err" in h:
        gagal(f"percobaan 2 gagal: {h['err']}")
    sama = filenode(R, "akun") == node
    harap(sama, True, "filenode akun sesudah 000009")
    lab.langkah("M", f"percobaan 2: BEGIN; isi {EXPAND[0]}; COMMIT",
                "COMMIT; filenode akun tidak berubah: ADD COLUMN dengan default tetap tidak menulis ulang tabel")
    lab.tulis("# ALTER TABLE, Notes (PostgreSQL 17): ADD COLUMN dengan DEFAULT non-volatile atau tanpa DEFAULT tidak")
    lab.tulis("# menulis ulang tabel; DEFAULT volatile atau ganti tipe kolom menulis ulang tabel dan index-nya.")
    for f in EXPAND[1:]:
        h = M.jalan(jalankan_berkas(f))
        if "err" in h:
            gagal(f"{f} gagal: {h['err']}")
        lab.langkah("M", f"BEGIN; isi {f}; COMMIT", "COMMIT")

    lab.tulis()
    lab.tulis("# Pembanding di tabel besar transaksi (15.000 baris), keduanya di-ROLLBACK:")
    for default, harus in (("'2026-10-14 12:00+07'", False), ("clock_timestamp()", True)):
        M.sql("BEGIN")
        awal = filenode(M, "transaksi")
        M.sql(f"ALTER TABLE transaksi ADD COLUMN dicek timestamptz DEFAULT {default}")
        berubah = filenode(M, "transaksi") != awal
        M.sql("ROLLBACK")
        harap(berubah, harus, f"rewrite transaksi dengan DEFAULT {default}")
        lab.langkah("M", f"ALTER TABLE transaksi ADD COLUMN dicek timestamptz DEFAULT {default}",
                    "filenode berubah: seluruh tabel ditulis ulang selama memegang ACCESS EXCLUSIVE" if berubah
                    else "filenode sama: nilai default disimpan di metadata, tanpa rewrite")
    lab.simpan(OUT / "lock-timeout.txt")


# ---------- C. rilis 2 (migrate bertahap) dan rilis 3 (contract) ----------

def cek_app(lab, k, label, tulis, baca):
    """App 1.0 (Karyawan 420) dan 1.1 (Karyawan 421) bayar Rp10.000 ke Warung Sari, buka saldo, buka riwayat."""
    for versi, akun in (("1.0", 420), ("1.1", 421)):
        h = k.jalan(bayar(tulis, akun, SARI, 10000))
        if "err" in h:
            gagal(f"{label} app {versi} bayar: {h['err']}")
        ok, teks = app_lama(versi, riwayat(k, baca, akun))
        harap(ok, True, f"{label} app {versi} membaca riwayat")
        lab.tulis(f"{label:<33} app {versi} (Karyawan {akun}) bayar {h['ok']} · saldo {rp(saldo(k, baca, akun))}")
        lab.tulis(f"{'':<33} {teks}")


BATCH = ("SELECT id FROM akun WHERE jenis IN ('karyawan', 'warung') AND id > {terakhir} "
         "ORDER BY id LIMIT 1000 FOR UPDATE")


def batch_mulai(lab, BF, terakhir, n):
    BF.sql("BEGIN")
    BF.sql("SET LOCAL lock_timeout = '3s'")
    ids = [r[0] for r in BF.sql(BATCH.format(terakhir=terakhir))]
    if not ids:
        BF.sql("COMMIT")
        lab.langkah("BF", f"batch {n}: " + BATCH.format(terakhir=terakhir), "0 baris; backfill selesai")
        return None
    dibuka = BF.sql("SELECT buka_buku(%s)", (ids,))[0][0]
    lab.langkah("BF", f"batch {n}: BEGIN; SET LOCAL lock_timeout = '3s'; " + BATCH.format(terakhir=terakhir),
                f"{angka(len(ids))} akun dikunci ({ids[0]}-{ids[-1]})")
    lab.langkah("BF", f"batch {n}: SELECT buka_buku(<{angka(len(ids))} id>)",
                f"{angka(dibuka)} akun dibuka (sisanya sudah dibuka pembayaran)")
    return ids[-1]


CEK_MALAM = """
    SELECT count(*) AS akun, count(*) FILTER (WHERE b.id IS NULL) AS tanpa_buku,
           count(*) FILTER (WHERE a.saldo <> b.saldo_cache OR a.saldo <> coalesce(p.total, 0)) AS berbeda
    FROM akun a LEFT JOIN buku b ON b.akun_id = a.id
    LEFT JOIN (SELECT buku_id, sum(jumlah) AS total FROM posting GROUP BY buku_id) p ON p.buku_id = b.id
    WHERE a.jenis IN ('karyawan', 'warung')"""


def rilis_2_3(lab):
    kepala(lab, "M13 · rilis 2 (migrate bertahap) dan rilis 3 (contract) tanpa jeda (keputusan 534)", [
        "Lanjutan lock-timeout.txt di schema yang sama. Server tidak berhenti; bayar tetap masuk selama backfill.",
        "Setiap langkah: app 1.0 (field jumlah) dan 1.1 (field nominal) bayar ke Warung Sari dan membuka riwayat",
        "dengan model Dart app/riwayat_v1.dart."])
    kode_bayar(lab, "dua")
    lab.tulis()
    S, BF, P, Q, X = (Klien(n, lab) for n in ("S", "BF", "P", "Q", "X"))
    cek_app(lab, S, "rilis 1 (server v1)", "v1", "v1")
    lab.tulis()

    h = S.jalan(lambda k: (k.sql("BEGIN"), k.sql((HERE / "sql/ledger/20-persiapan.sql").read_text()), k.sql("COMMIT")))
    if "err" in h:
        gagal(f"persiapan gagal: {h['err']}")
    lab.langkah("S", "rilis 2: BEGIN; isi sql/ledger/20-persiapan.sql; COMMIT",
                "COMMIT: akun sistem 1, empat buku sistem, fungsi buka_buku, satu ruang nomor transaksi dan jurnal")
    lab.tulis()
    cek_app(lab, S, "rilis 2 (tulis dua, baca v1)", "dua", "v1")
    lab.tulis()

    terakhir = batch_mulai(lab, BF, 0, 1)
    P.mulai(bayar("dua", BUDI, ANI, 25000))
    antre(lab, P, f"bayar Budi ({BUDI}) ke Warung Ani ({ANI}) {rp(25000)}: SELECT ... FOR UPDATE", "BF")
    Q.mulai(lambda k: len(riwayat(k, "v1", 420)["riwayat"]))
    hq = Q.selesai()
    if "err" in hq:
        gagal(f"riwayat saat batch: {hq['err']}")
    lab.langkah("Q", "app Karyawan 420 membuka riwayat (SELECT, server v1 query)",
                f"{hq['ok']} baris, tanpa menunggu: lock baris tidak menahan SELECT biasa")
    BF.sql("COMMIT")
    lab.langkah("BF", "batch 1: COMMIT", "lock 1.000 baris akun dilepas")
    lab.tulis("#   Bayar yang menyentuh akun di batch menunggu paling lama satu batch (lock baris, bukan lock tabel).")
    lab.tulis("#   Bila batch sendiri tertahan bayar yang lama, lock_timeout memotongnya sesudah 3 detik. Bayar lain yang antre")
    lab.tulis("#   di belakang baris yang sudah dikunci batch ikut menunggu paling lama selama itu. Batch yang gagal di-ROLLBACK")
    lab.tulis("#   dan bisa diulang dari id yang sama (mekanisme dari dokumentasi lock_timeout; tidak direkam di lab ini).")
    hp = P.selesai()
    if "err" in hp:
        gagal(f"P gagal: {hp['err']}")
    lab.langkah("P", "(lanjut sesudah batch 1 COMMIT)", hp["ok"])
    print(f"backfill: P menunggu {hp['detik']:.1f} detik (batch 1 ditahan sampai P dan Q diamati)")
    hx = X.jalan(bayar("dua", 1405, SARI, 10000))
    if "err" in hx:
        gagal(f"X gagal: {hx['err']}")
    harap(hx["ok"].endswith("buka_buku 1"), True, "X membuka buku Karyawan 1405")
    lab.langkah("X", f"bayar Karyawan 1405 ke Warung Sari ({SARI}) {rp(10000)}, akun belum di-backfill", hx["ok"])
    n = 2
    while terakhir is not None:
        terakhir = batch_mulai(lab, BF, terakhir, n)
        if terakhir is not None:
            BF.sql("COMMIT")
            lab.langkah("BF", f"batch {n}: COMMIT")
        n += 1

    lab.tulis()
    lab.tulis("# Cek malam (kolom saldo v1 = saldo_cache = jumlah posting, setiap akun karyawan dan warung):")
    r = S.sql(CEK_MALAM)
    harap(r, [(1012, 0, 0)], "cek malam sesudah backfill")
    lab.baris += tabel(["akun", "tanpa_buku", "berbeda"], r)
    sistem = S.sql("SELECT count(*) FROM buku b WHERE b.saldo_cache <> "
                   "(SELECT coalesce(sum(jumlah), 0) FROM posting p WHERE p.buku_id = b.id)")[0][0]
    total = S.sql("SELECT sum(jumlah) FROM posting")[0][0]
    harap((sistem, total), (0, 0), "cache semua buku dan jumlah semua posting")
    lab.tulis(f"# Semua buku: {sistem} cache berbeda dari jumlah posting; jumlah semua posting {total}.")
    jurnal = S.sql("SELECT jenis, count(*) FROM jurnal GROUP BY jenis ORDER BY jenis")
    lab.baris += tabel(["jenis jurnal", "jumlah"], [(j, angka(c)) for j, c in jurnal])
    lab.tulis()

    cek_app(lab, S, "rilis 2 (tulis dua, baca ledger)", "dua", "v2")
    lab.tulis("$ curl '/akun/419/riwayat'   (Budi, app 1.0, server v2 baca ledger)")
    lab.tulis(json_pendek(riwayat(S, "v2", BUDI)))
    lab.tulis()

    kode_bayar(lab, "v2")
    cek_app(lab, S, "rilis 3 (ledger saja)", "v2", "v2")
    h = S.jalan(lambda k: (k.sql("BEGIN"), k.sql(berkas(SEMUA[4])),
                           k.sql("DROP FUNCTION buka_buku(bigint[])"), k.sql("COMMIT")))
    if "err" in h:
        gagal(f"contract gagal: {h['err']}")
    lab.langkah("S", f"rilis 3: BEGIN; isi {SEMUA[4]}; DROP FUNCTION buka_buku(bigint[]); COMMIT",
                "COMMIT: kolom saldo dan tabel transaksi, topup, koreksi dihapus")
    cek_app(lab, S, "rilis 3 (sesudah contract)", "v2", "v2")
    tabel_akhir = [r[0] for r in S.sql("SELECT table_name FROM information_schema.tables "
                                       "WHERE table_schema = %s ORDER BY 1", (SCHEMA,))]
    harap(tabel_akhir, TABEL_AKHIR, "tabel sesudah contract")
    lab.tulis()
    lab.tulis(f"# Skema akhir sama dengan api-t2 ({len(tabel_akhir)} tabel): {', '.join(tabel_akhir)}")
    lab.simpan(OUT / "tiga-rilis.txt")


def bertahap():
    buat_schema()
    for rilis in (rilis_1, rilis_2_3):
        lab = Lab()
        try:
            rilis(lab)
        finally:
            lab.tutup()
