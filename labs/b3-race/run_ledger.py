"""Lab b3-race versi ledger: M9, dua transfer bersamaan dari buku Budi (keputusan 430).

Tahap 2 menyimpan uang sebagai jurnal dan posting. Skema dimuat apa adanya dari labs/b3-ledger/schema.sql ke schema
b3_race, dibuat ulang untuk setiap skenario. Budi punya saldo Rp100.000. Dari HP (koneksi A) ia mentransfer Rp70.000
ke Citra, dari tablet (koneksi B) Rp50.000 ke Dimas (angka M9 di plan/CERITA-TAHAP-2.md bagian 4).

Setiap skenario menjalankan langkah A dan B dalam urutan yang sama setiap kali, tanpa sleep dan tanpa mengandalkan
waktu. Sesudah tiap langkah, koneksi ketiga yang tidak direkam mencatat:
  - saldo Budi yang sudah COMMIT (jumlah posting buku Budi, source of truth),
  - siapa memegang row lock di baris buku Budi dan mode lock-nya (pgrowlocks),
  - siapa menunggu lock (pg_stat_activity.wait_event_type = 'Lock', hanya pid A dan B; agen lain tidak terbaca).

Keluaran di output/ledger/. Rekaman lama output/*.txt|json (tabel akun, dipakai halaman b3-2) tidak disentuh.
  ledger-<cara>.txt   rekaman langkah demi langkah
  banding.txt         status A dan B, lock, retry, saldo akhir per cara
Rekaman tanpa waktu, jadi rekaman ulang identik per byte. Lab gagal keras bila status, SQLSTATE, lock, saldo, atau urutan berbeda.

    make -C labs/b3-race run-ledger      (rekam; butuh PostgreSQL bersama dari docker-compose.yml)
    make -C labs/b3-race cek-ledger      (rekam ulang, lalu bandingkan dengan yang di-commit)
"""
import datetime, json, pathlib, re
import psycopg
from rekam import (B_BUDI, DSN, SALDO_AWAL, SCHEMA, Klien, Pengamat, Rekaman, harap, rp,
                   tabel, teks_langkah)

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent.parent
OUT = HERE / "output" / "ledger"
BUDI = 419
B_CITRA, B_DIMAS = 3, 4
TRANSFER = {"A": (70000, "Citra", B_CITRA), "B": (50000, "Dimas", B_DIMAS)}

# Sama dengan SEED_BATAS di labs/b3-ledger/run.py (batas.txt): Budi top-up Rp100.000 lewat jurnal 1.
SEED = """
INSERT INTO akun (id, nama, email, peran) VALUES
  (1,   'Sistem Rekeningo', 'sistem@lestari.example',          'sistem'),
  (400, 'Admin Tunjangan',  'admin.tunjangan@lestari.example', 'admin'),
  (417, 'Dimas',            'dimas@lestari.example',           'karyawan'),
  (419, 'Budi',             'budi@lestari.example',            'karyawan'),
  (504, 'Citra',            'citra@lestari.example',           'karyawan');
INSERT INTO buku (akun_id, jenis) VALUES (NULL, 'tunjangan'), (419, 'karyawan'), (504, 'karyawan'), (417, 'karyawan');
BEGIN;
INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('topup', 'Tunjangan makan', 400);
INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES (1, 1, -100000), (1, 2, 100000);
UPDATE buku SET saldo_cache = saldo_cache - 100000 WHERE id = 1;
UPDATE buku SET saldo_cache = saldo_cache + 100000 WHERE id = 2;
COMMIT;
"""

# Pola pembaruan cache dari b3-ledger (keputusan 402): dijumlah per buku, di transaction yang sama dengan jurnalnya.
PERBARUI_CACHE = ("UPDATE buku b SET saldo_cache = b.saldo_cache + p.jumlah FROM (SELECT buku_id, sum(jumlah) AS jumlah "
                  "FROM posting WHERE jurnal_id = {j} GROUP BY buku_id) p WHERE b.id = p.buku_id")
BACA_POSTING = f"SELECT sum(jumlah) AS saldo FROM posting WHERE buku_id = {B_BUDI}"


# ---------- potongan kode transfer ----------

def tulis_jurnal(k, tolak_posting=None):
    x, nama, ke = TRANSFER[k.nama]
    j = k.sql(f"INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('transfer', 'Transfer ke {nama}', {BUDI}) RETURNING id").satu()
    k.sql(f"INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES ({j}, {B_BUDI}, -{x}), ({j}, {ke}, {x})", tolak=tolak_posting)
    return j


def cek_saldo(rec, k, saldo, apa="saldo"):
    x = TRANSFER[k.nama][0]
    if saldo >= x:
        rec.app(k.nama, f"{apa} {rp(saldo)} >= {rp(x)}, lanjut menulis jurnal")
        return True
    rec.app(k.nama, f"{apa} {rp(saldo)} < {rp(x)}: saldo kurang, transfer ditolak")
    return False


# ---------- skenario ----------

def s_tanpa_lock(rec, A, B, paksa):
    """Kode transfer sebelum M9: baca jumlah posting, cek di kode, tulis jurnal. Tanpa lock, cache tidak disentuh."""
    for k in (A, B):
        k.sql("BEGIN")
    for k in (A, B):
        harap(k.sql(BACA_POSTING, simpan=["saldo_dibaca"]).satu(), SALDO_AWAL, f"saldo yang dibaca {k.nama}")
    for k in (A, B):
        cek_saldo(rec, k, k.vars["saldo_dibaca"])
    for k in (A, B):
        tulis_jurnal(k)
    if paksa:
        catatan = "alat lab: pemeriksaan invarian 3 dijalankan sekarang, bukan di dalam COMMIT (lihat kepala rekaman)"
        A.sql("SET CONSTRAINTS ALL IMMEDIATE", note=catatan)
        B.sql("SET CONSTRAINTS ALL IMMEDIATE", note=catatan + "; jurnal A belum COMMIT, jadi tidak terlihat")
        A.sql("COMMIT")
        B.sql("COMMIT")
        return dict(A="COMMIT", B="COMMIT", retry=0)
    A.sql("COMMIT")
    B.sql("COMMIT", tolak="23514", note="pemeriksaan invarian 3 milik B sudah melihat jurnal A yang COMMIT lebih dulu")
    return dict(A="COMMIT", B="ERROR 23514 saat COMMIT", retry=0)


# Urutan langkah yang sama untuk semua cara: A dan B sama-sama mulai, lalu statement pertama B yang menyentuh saldo
# berjalan saat transaction A masih terbuka (keputusan 431).
CARA = [
    dict(id="ledger-tanpa-lock", judul="Tanpa lock", fn=lambda r, a, b: s_tanpa_lock(r, a, b, True),
         isolation="read committed", final=-20000, cache=100000,
         summary="A dan B sama-sama COMMIT: Rp120.000 keluar dari saldo Rp100.000. Keduanya membaca saldo sebelum "
                 "jurnal lain COMMIT, dan pemeriksaan invarian 3 keduanya juga berjalan sebelum COMMIT.",
         catatan=[
             "Kode transfer sebelum M9: baca jumlah posting, cek saldo di kode, tulis jurnal. Tanpa lock; saldo_cache tidak",
             "disentuh (dicek ulang tiap malam). Invarian 3 (labs/b3-ledger/schema.sql) diperiksa saat COMMIT tanpa lock.",
             "SET CONSTRAINTS ALL IMMEDIATE adalah alat lab: pemeriksaan yang sama dijalankan sekarang supaya urutannya bisa",
             "diulang. Di produksi urutan ini terjadi saat dua COMMIT tiba hampir bersamaan: di dalam COMMIT, PostgreSQL",
             "menjalankan trigger deferred, lalu menulis WAL, baru transaction terlihat (xact.c CommitTransaction:",
             "AfterTriggerFireDeferred, RecordTransactionCommit, ProcArrayEndTransaction). Pemeriksaan B bisa berjalan",
             "di celah itu. labs/b3-ledger/output/batas.txt 2b: muncul tanpa SET CONSTRAINTS (keputusan 403).",
         ]),
    dict(id="ledger-tanpa-lock-bergantian", judul="Tanpa lock, COMMIT bergantian", fn=lambda r, a, b: s_tanpa_lock(r, a, b, False),
         isolation="read committed", final=30000, cache=100000,
         summary="Hanya A yang COMMIT, tapi B gagal dengan error database 23514 saat COMMIT, bukan jawaban saldo kurang "
                 "dari kode. Invarian 3 menahan saldo negatif karena COMMIT A sudah terlihat.",
         catatan=[
             "Kode yang sama dengan ledger-tanpa-lock, tanpa alat lab: A COMMIT sebelum B COMMIT.",
             "Pemeriksaan invarian 3 milik B berjalan di dalam COMMIT B dan sudah melihat jurnal A.",
         ]),
]


# ---------- schema ----------

def buat_schema():
    with psycopg.connect(DSN, autocommit=True) as c:
        # pgrowlocks di public, sama dengan rekaman lama b3-race (run.py); schema lab lain tidak disentuh.
        c.execute("CREATE EXTENSION IF NOT EXISTS pgrowlocks WITH SCHEMA public")
        c.execute(f"DROP SCHEMA IF EXISTS {SCHEMA} CASCADE")
        c.execute(f"CREATE SCHEMA {SCHEMA}")
        c.execute(f"SET search_path = {SCHEMA}")
        c.execute((ROOT / "labs/b3-ledger/schema.sql").read_text())
        c.execute(SEED)


# ---------- main ----------

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with psycopg.connect(DSN, autocommit=True) as c:
        versi = c.execute("SHOW server_version").fetchone()[0]
    baris_banding = []
    for cara in CARA:
        buat_schema()
        rec = Rekaman()
        A, B = Klien("A", rec), Klien("B", rec)
        rec.klien = {"A": A, "B": B}
        rec.p = Pengamat(rec.klien)
        hasil = cara["fn"](rec, A, B)
        harap(A.tunda is None and B.tunda is None, True, f"{cara['id']}: tidak ada statement yang masih menunggu")
        final, cache = rec.p.saldo(), rec.p.cache()
        harap(final, cara["final"], f"{cara['id']}: saldo Budi akhir")
        harap(cache, cara["cache"], f"{cara['id']}: saldo_cache Budi akhir")
        jurnal = rec.p.satu("SELECT count(*) FROM jurnal WHERE jenis = 'transfer'")
        for x in (A, B):
            x.tutup()
        rec.p.c.close()

        menunggu = sum(1 for s in rec.steps if s["result"] == "MENUNGGU lock")
        kepala = [f"-- Lab b3-race (ledger) · {cara['judul']}",
                  f"-- PostgreSQL {versi} · schema {SCHEMA} · isolation {cara['isolation']}",
                  f"-- Saldo Budi {SALDO_AWAL}. A (HP) transfer 70000 ke Citra, B (tablet) transfer 50000 ke Dimas.",
                  "-- Rekaman dari database bersih: make -C labs/b3-race run-ledger (keputusan 430).",
                  "-- [lock: ...] = pemegang row lock di baris buku Budi dan modenya (pgrowlocks).", "--"]
        kepala += ["-- " + l for l in cara["catatan"]]
        akhir = ["", f"-- akhir: A {hasil['A']}; B {hasil['B']}; menunggu lock {menunggu}; retry {hasil['retry']}",
                 f"-- saldo Budi (jumlah posting) {final}; saldo_cache {cache}; jurnal transfer {jurnal}"]
        (OUT / f"{cara['id']}.txt").write_text("\n".join(kepala + [""] + teks_langkah(rec.steps) + akhir) + "\n")
        print("ditulis:", (OUT / cara["id"]).relative_to(ROOT), final)
        baris_banding.append((cara["judul"], hasil["A"], hasil["B"], menunggu, hasil["retry"], final, cache, jurnal))

    banding = [f"-- Lab b3-race (ledger) · empat cara mengunci dibandingkan dengan versi tanpa lock (M9)",
               f"-- PostgreSQL {versi} · schema {SCHEMA} · saldo Budi {SALDO_AWAL}; A 70000 ke Citra, B 50000 ke Dimas",
               "-- Rekaman dari database bersih: make -C labs/b3-race run-ledger (keputusan 430). Rincian: ledger-<cara>.txt.",
               "-- menunggu = langkah yang tertahan row lock; saldo = jumlah posting buku Budi; cache = buku.saldo_cache.", ""]
    banding += tabel(["cara", "A", "B", "menunggu", "retry", "saldo", "cache", "jurnal"], baris_banding)
    (OUT / "banding.txt").write_text("\n".join(banding) + "\n")
    print("ditulis:", (OUT / "banding.txt").relative_to(ROOT))


if __name__ == "__main__":
    main()
