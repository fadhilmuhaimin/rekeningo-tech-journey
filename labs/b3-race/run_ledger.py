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
  ledger-<cara>.json  replay untuk widget race, format sama dengan output/for-update.json (diperiksa sebelum ditulis)
  banding.txt         status A dan B, lock, retry, saldo akhir per cara
Rekaman tanpa waktu. `recorded` di JSON adalah tanggal isi itu pertama direkam: dipertahankan selama isi lain sama,
jadi rekaman ulang identik per byte. Lab gagal keras bila status, SQLSTATE, lock, saldo, atau urutan berbeda.

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


def s_for_update(rec, A, B):
    """ADR 13 (naskah): kunci baris buku Budi di awal transaction jurnal, lalu baca saldo_cache dari baris itu."""
    q = f"SELECT saldo_cache FROM buku WHERE id = {B_BUDI} FOR UPDATE"
    for k in (A, B):
        k.sql("BEGIN")
    harap(A.sql(q, simpan=["saldo_dibaca"]).satu(), SALDO_AWAL, "saldo_cache yang dibaca A")
    harap(B.sql(q, simpan=["saldo_dibaca"]).tunggu, "transactionid", "B menunggu lock baris buku")
    cek_saldo(rec, A, A.vars["saldo_dibaca"], "saldo_cache")
    j = tulis_jurnal(A)
    A.sql(PERBARUI_CACHE.format(j=j))
    A.sql("COMMIT")
    r = B.lanjut("lanjut sesudah A COMMIT: FOR UPDATE mengembalikan versi baris terbaru")
    harap(r.satu(), 30000, "saldo_cache yang dibaca B sesudah menunggu")
    cek_saldo(rec, B, r.satu(), "saldo_cache")
    B.sql("ROLLBACK")
    return dict(A="COMMIT", B="ditolak kode: saldo kurang", retry=0)


def s_atomik(rec, A, B):
    """Cek dan potong saldo_cache dalam satu UPDATE bersyarat, sebelum jurnal ditulis."""
    def potong(k):
        x = TRANSFER[k.nama][0]
        return f"UPDATE buku SET saldo_cache = saldo_cache - {x} WHERE id = {B_BUDI} AND saldo_cache >= {x}"
    for k in (A, B):
        k.sql("BEGIN")
    harap(A.sql(potong(A)).status, "UPDATE 1", "UPDATE A")
    harap(B.sql(potong(B)).tunggu, "transactionid", "B menunggu lock baris buku")
    rec.app("A", "1 baris berubah: saldo cukup dan sudah dipotong, lanjut menulis jurnal")
    tulis_jurnal(A)
    A.sql(f"UPDATE buku SET saldo_cache = saldo_cache + 70000 WHERE id = {B_CITRA}")
    A.sql("COMMIT")
    r = B.lanjut("lanjut sesudah A COMMIT: syarat WHERE dicek ulang ke versi baris terbaru")
    harap(r.status, "UPDATE 0", "UPDATE B sesudah menunggu")
    rec.app("B", "0 baris berubah: saldo kurang, transfer ditolak")
    B.sql("ROLLBACK")
    return dict(A="COMMIT", B="ditolak kode: saldo kurang", retry=0)


def s_optimistic(rec, A, B):
    """Baca saldo_cache dan versi tanpa lock; simpan hanya bila versi belum berubah, kalau berubah ulangi dari awal."""
    q = f"SELECT saldo_cache, versi FROM buku WHERE id = {B_BUDI}"

    def simpan(k):
        x = TRANSFER[k.nama][0]
        return (f"UPDATE buku SET saldo_cache = {k.vars['saldo_dibaca'] - x}, versi = versi + 1 "
                f"WHERE id = {B_BUDI} AND versi = {k.vars['versi']}")
    for k in (A, B):
        harap(k.sql(q, simpan=["saldo_dibaca", "versi"]).rows, [(SALDO_AWAL, 0)], f"bacaan {k.nama}")
    for k in (A, B):
        x = TRANSFER[k.nama][0]
        rec.app(k.nama, f"saldo_cache {rp(SALDO_AWAL)} >= {rp(x)}, lanjut. Saldo baru {rp(SALDO_AWAL - x)}, "
                        f"disimpan dengan syarat versi masih 0")
    A.sql("BEGIN")
    harap(A.sql(simpan(A)).status, "UPDATE 1", "UPDATE A")
    B.sql("BEGIN")
    harap(B.sql(simpan(B)).tunggu, "transactionid", "B menunggu lock baris buku")
    tulis_jurnal(A)
    A.sql(f"UPDATE buku SET saldo_cache = saldo_cache + 70000 WHERE id = {B_CITRA}")
    A.sql("COMMIT")
    r = B.lanjut("lanjut sesudah A COMMIT: syarat versi = 0 dicek ulang ke versi baris terbaru")
    harap(r.status, "UPDATE 0", "UPDATE B sesudah menunggu")
    rec.app("B", "0 baris berubah: versi sudah berubah. Batalkan, lalu ulangi dari membaca (retry 1)")
    B.sql("ROLLBACK")
    harap(B.sql(q, simpan=["saldo_dibaca", "versi"]).rows, [(30000, 1)], "bacaan ulang B")
    cek_saldo(rec, B, B.vars["saldo_dibaca"], "saldo_cache")
    return dict(A="COMMIT", B="ditolak kode: saldo kurang", retry=1)


def s_serializable(rec, A, B):
    """Kode sama dengan versi tanpa lock, di isolation level SERIALIZABLE, dengan retry untuk SQLSTATE 40001."""
    for k in (A, B):
        k.sql("BEGIN ISOLATION LEVEL SERIALIZABLE")
    for k in (A, B):
        harap(k.sql(BACA_POSTING, simpan=["saldo_dibaca"]).satu(), SALDO_AWAL, f"saldo yang dibaca {k.nama}")
    for k in (A, B):
        cek_saldo(rec, k, k.vars["saldo_dibaca"])
    for k in (A, B):
        tulis_jurnal(k)
    A.sql("COMMIT")
    B.sql("COMMIT", tolak="40001")
    rec.app("B", "COMMIT gagal dengan 40001: ulangi seluruh transaction dari awal (retry 1)")
    B.sql("BEGIN ISOLATION LEVEL SERIALIZABLE")
    harap(B.sql(BACA_POSTING, simpan=["saldo_dibaca"]).satu(), 30000, "saldo yang dibaca B saat retry")
    cek_saldo(rec, B, B.vars["saldo_dibaca"])
    B.sql("ROLLBACK")
    return dict(A="COMMIT", B="40001 saat COMMIT, retry: saldo kurang", retry=1)


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
    dict(id="ledger-for-update", judul="SELECT ... FOR UPDATE", fn=s_for_update,
         isolation="read committed", final=30000, cache=30000,
         summary="Hanya A yang COMMIT. B tertahan di SELECT ... FOR UPDATE sampai A COMMIT, lalu membaca saldo_cache "
                 "terbaru Rp30.000 dan menolak.",
         catatan=[
             "Baris buku Budi dikunci di awal transaction jurnal, saldo_cache dibaca dari baris itu, cache diperbarui",
             "sebelum COMMIT (pola keputusan 402). Invarian 3 tetap diperiksa saat COMMIT sebagai pagar kedua.",
         ]),
    dict(id="ledger-atomik", judul="UPDATE atomik bersyarat", fn=s_atomik,
         isolation="read committed", final=30000, cache=30000,
         summary="Hanya A yang COMMIT. UPDATE milik B menunggu lock baris buku, lalu syarat saldo_cache >= 50000 dicek "
                 "ulang ke versi baris terbaru: 0 baris berubah.",
         catatan=[
             "Cek dan potong saldo_cache dalam satu UPDATE bersyarat sebelum jurnal ditulis. 0 baris = saldo kurang.",
         ]),
    dict(id="ledger-optimistic", judul="Optimistic lock (kolom versi)", fn=s_optimistic,
         isolation="read committed", final=30000, cache=30000,
         summary="Hanya A yang COMMIT. UPDATE milik B tetap menunggu lock baris yang sedang ditulis A, lalu gagal "
                 "karena versi sudah 1. B mengulang sekali dan menolak.",
         catatan=[
             "Baca saldo_cache dan versi tanpa lock dan tanpa transaction, hitung saldo baru di kode, lalu simpan dengan",
             "syarat versi belum berubah. 0 baris = ada transfer lain yang menulis duluan: ulangi dari membaca.",
             "Tidak ada lock saat membaca. Saat menulis, UPDATE B tetap menunggu row lock A yang belum COMMIT.",
         ]),
    dict(id="ledger-serializable", judul="SERIALIZABLE + retry", fn=s_serializable,
         isolation="serializable", final=30000, cache=100000,
         summary="Hanya A yang COMMIT. Kodenya sama dengan versi tanpa lock, tapi PostgreSQL membatalkan COMMIT B "
                 "dengan 40001. B mengulang sekali dan menolak.",
         catatan=[
             "Kode yang sama dengan ledger-tanpa-lock (cache tidak disentuh), dijalankan dengan BEGIN ISOLATION LEVEL",
             "SERIALIZABLE. App mengulang seluruh transaction bila SQLSTATE 40001 (dokumentasi PostgreSQL 17 bagian 13.5).",
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


# ---------- format widget race ----------

def cek_format_widget(data):
    """Replay harus bisa diputar race.js tanpa perubahan: kunci dan tipe sama dengan rekaman lama, saldo akhir salah
    satu pilihan tebakan widget (OPTION_VALUES di situs/lama/widgets/race.js)."""
    lama = json.loads((HERE / "output/for-update.json").read_text())
    harap(list(data), list(lama), f"{data['id']}: kunci JSON")
    for k, v in lama.items():
        harap(type(data[k]).__name__, type(v).__name__, f"{data['id']}: tipe {k}")
    harap(sorted(data["withdraw"]), ["A", "B"], f"{data['id']}: withdraw")
    pilihan = re.search(r"OPTION_VALUES = \[([^\]]*)\]", (ROOT / "situs/lama/widgets/race.js").read_text()).group(1)
    harap(data["final"] in [int(x) for x in pilihan.split(",")], True, f"{data['id']}: final {data['final']} di OPTION_VALUES")
    for n, s in enumerate(data["steps"], 1):
        harap(list(s), list(lama["steps"][0]), f"{data['id']} langkah {n}: kunci")
        harap(s["actor"] in ("A", "B") and set(s["waiting"]) <= {"A", "B"} and sorted(s["vars"]) == ["A", "B"], True,
              f"{data['id']} langkah {n}: actor, waiting, vars")
        harap(isinstance(s["committed"], int) and isinstance(s["result"], str) and isinstance(s["note"], str), True,
              f"{data['id']} langkah {n}: tipe")
        harap(s["sql"] is None or isinstance(s["sql"], str), True, f"{data['id']} langkah {n}: sql")
        if s["result"] == "MENUNGGU lock":
            harap(s["actor"] in s["waiting"], True, f"{data['id']} langkah {n}: yang menunggu ada di waiting")


def tulis_json(data):
    """`recorded` dipertahankan bila isi lain sama dengan file yang ada."""
    f = OUT / f"{data['id']}.json"
    data["recorded"] = datetime.date.today().isoformat()
    if f.exists():
        lama = json.loads(f.read_text())
        if {**lama, "recorded": None} == {**data, "recorded": None}:
            data["recorded"] = lama["recorded"]
    f.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n")


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

        data = dict(id=cara["id"], title=cara["judul"], summary=cara["summary"], postgres=versi,
                    isolation=cara["isolation"], start=SALDO_AWAL, withdraw={"A": 70000, "B": 50000},
                    final=final, recorded="", steps=rec.steps)
        cek_format_widget(data)
        tulis_json(data)

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
