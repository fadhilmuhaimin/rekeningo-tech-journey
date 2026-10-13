"""Lab b2-query versi ledger: M11 (N+1, index) dan M12 (pagination kursor) di atas posting (keputusan 520).

Skema dimuat apa adanya dari labs/b3-ledger/schema.sql ke schema b2_ledger, dibuat ulang setiap run; data satu tahun
Tahap 2 dari ledger_data.py (keputusan 521, 522). Rekaman lama output/index.txt, n1.txt, pagination.txt (tabel pesanan,
dipakai halaman B2.3, B2.4, B1.3) tidak disentuh.

Keluaran di output/ledger/:
  data.txt        asal angka, jalur muat, invarian diperiksa sesudah muat
  n1.txt          riwayat Budi dan laporan harian Warung Ani: N+1 lawan satu query JOIN, jumlah query, waktu
  index.txt       EXPLAIN (ANALYZE, BUFFERS) sebelum dan sesudah index posting (buku_id, dibuat, id)
  pagination.txt  OFFSET lawan kursor (dibuat, id) saat kiriman baru masuk; halaman jauh
Lab gagal keras bila jumlah query, bentuk rencana, atau baris ganda berbeda dari harapan.

    make -C labs/b2-query run-ledger     (rekam ke output/ledger/)
    make -C labs/b2-query cek-ledger     (rekam ulang ke folder sementara, bandingkan tanpa waktu dan buffer)
"""
import datetime as dt
import pathlib
import statistics
import subprocess
import sys
import tempfile
import time

import ledger_data as L
from rekam_ledger import HERE, Klien, Rekaman, bandingkan, bentuk, gagal, harap, hitung, rencana, rp, sambung, tabel

OUT = HERE / "output" / "ledger"
PERBARUI_CACHE = ("UPDATE buku b SET saldo_cache = b.saldo_cache + p.jumlah FROM (SELECT buku_id, sum(jumlah) AS jumlah "
                  "FROM posting WHERE jurnal_id = %s GROUP BY buku_id) p WHERE b.id = p.buku_id")   # keputusan 402
NAMA_SISTEM = "CASE {b}.jenis WHEN 'tunjangan' THEN 'Tunjangan makan' WHEN 'kas_pencairan' THEN 'Pencairan' END"

# Cara M11: satu query untuk daftar, lalu satu query nama lawan per baris.
DAFTAR = """SELECT p.id, p.jurnal_id, j.jenis, p.jumlah, p.dibuat
FROM posting p JOIN jurnal j ON j.id = p.jurnal_id
WHERE {where}
{urut}"""
LAWAN = f"""SELECT coalesce(a.nama, {NAMA_SISTEM.format(b='b')})
FROM posting q JOIN buku b ON b.id = q.buku_id LEFT JOIN akun a ON a.id = b.akun_id
WHERE q.jurnal_id = %(jurnal)s AND q.buku_id <> %(buku)s
ORDER BY q.id LIMIT 1"""
# ADR 15: satu query. Lawan dicari per baris di dalam query yang sama (pola labs/api-t2 repo/riwayat.go).
JOIN = f"""SELECT p.id, p.jurnal_id, j.jenis, p.jumlah, p.dibuat,
       coalesce(la.nama, {NAMA_SISTEM.format(b='lb')}) AS lawan
FROM posting p
JOIN jurnal j ON j.id = p.jurnal_id
LEFT JOIN LATERAL (SELECT q.buku_id FROM posting q
                   WHERE q.jurnal_id = p.jurnal_id AND q.buku_id <> p.buku_id ORDER BY q.id LIMIT 1) l ON true
LEFT JOIN buku lb ON lb.id = l.buku_id
LEFT JOIN akun la ON la.id = lb.akun_id
WHERE {{where}}
{{urut}}"""
BARU = "ORDER BY p.dibuat DESC, p.id DESC"


class Skenario:
    def __init__(self, judul, where, urut, args):
        self.judul, self.where, self.urut, self.args = judul, where, urut, args

    def sql(self, pola):
        return pola.format(where=self.where, urut=self.urut)


def n_plus_1(k, s):
    hasil = []
    for pid, jid, jenis, jumlah, dibuat in k(s.sql(DAFTAR), s.args):
        lawan = k(LAWAN, {"jurnal": jid, "buku": s.args["buku"]})[0][0]
        hasil.append((pid, jid, jenis, jumlah, dibuat, lawan))
    return hasil


def satu_join(k, s):
    return [tuple(r) for r in k(s.sql(JOIN), s.args)]


def ukur_ms(fn, s, kali=5):
    """Median kali percobaan sesudah satu pemanasan, di client (psycopg, localhost). Pembanding, bukan janji."""
    with sambung() as c:
        k = Klien(c)
        fn(k, s)
        w = []
        for _ in range(kali):
            t = time.perf_counter()
            fn(k, s)
            w.append((time.perf_counter() - t) * 1000)
    return statistics.median(w)


def literal(sql, args):
    """SQL dengan nilai tertulis, untuk EXPLAIN yang direkam (nilai berasal dari lab sendiri, bukan input luar)."""
    return sql.replace("%(", "{").replace(")s", "}").format(**{k: f"'{v}'" if isinstance(v, str) else v
                                                              for k, v in args.items()})


# ---------- B. N+1, index, kursor ----------

def skenario(d, ramai):
    budi, ani = d.buku[L.BUDI], d.buku[L.ANI]
    dari, sampai = f"{ramai} 00:00+07", f"{ramai + dt.timedelta(days=1)} 00:00+07"
    return [Skenario("Riwayat Budi, halaman pertama (20 baris)", "p.buku_id = %(buku)s",
                     BARU + " LIMIT 20", {"buku": budi}),
            Skenario(f"Laporan harian Warung Ani, hari ramai {ramai}",
                     "p.buku_id = %(buku)s AND p.dibuat >= %(dari)s AND p.dibuat < %(sampai)s",
                     "ORDER BY p.dibuat, p.id", {"buku": ani, "dari": dari, "sampai": sampai}),
            Skenario("Seluruh riwayat Budi dalam satu permintaan (pembanding)", "p.buku_id = %(buku)s",
                     BARU, {"buku": budi})]


def explain(r, c, judul, sql, harus_ada, tidak_ada=()):
    r.bagian(judul)
    plan = rencana(c, sql)
    r.sql("EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)\n" + sql)
    r(plan)
    teks = "\n".join(plan)
    for s in harus_ada:
        if s not in teks:
            gagal(f"{judul}: rencana tanpa {s!r}")
    for s in tidak_ada:
        if s in teks:
            gagal(f"{judul}: rencana memuat {s!r}")
    return bentuk(plan)


def ringkas(r, baris):
    r.bagian("Ringkasan: node yang membaca tabel atau index (rows = baris keluar dari node, dijumlah semua loop)")
    r(tabel(["permintaan", "index riwayat", "node", "rows"], baris))


def lab_index_n1(versi, d, ramai):
    ri = Rekaman("index posting (buku_id, dibuat, id): EXPLAIN (ANALYZE, BUFFERS) sebelum dan sesudah", versi)
    rn = Rekaman("N+1 lawan satu query JOIN", versi)
    for r in (ri, rn):
        r("-- Waktu, Buffers, Heap Blocks, Memory, dan ukuran adalah pembanding dari mesin lab, bukan janji;")
        r("-- make cek-ledger tidak membandingkannya (keputusan 523). Data: data.txt.")
    sk = skenario(d, ramai)
    pendek = ["Riwayat Budi hal. 1", "Laporan harian Ani", "Seluruh riwayat Budi"]
    ring, waktu, jumlah = [], {}, []
    with sambung() as c:
        ri.bagian("A. Index di tabel posting sebelum M11")
        q = ("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'posting' AND schemaname = current_schema() "
             "ORDER BY 1")
        ri.sql(q)
        ri(tabel(["indexname", "indexdef"], c.execute(q).fetchall()))
        # (huruf, judul, sql, ringkasan, harus ada, tidak boleh ada)
        tanpa = [("B", sk[0].judul, literal(sk[0].sql(DAFTAR), sk[0].args), pendek[0], ["Sort Key: p.dibuat",
                  "posting_buku"], ["posting_riwayat"]),
                 ("C", sk[1].judul, literal(sk[1].sql(DAFTAR), sk[1].args), pendek[1], ["posting_buku"],
                  ["posting_riwayat"]),
                 ("D", "Satu query JOIN (ADR 15) untuk riwayat Budi halaman pertama", literal(sk[0].sql(JOIN),
                  sk[0].args), "JOIN Budi hal. 1", ["Sort Key: p.dibuat", "posting_buku"], ["posting_riwayat"])]
        for huruf, judul, sql, nama, harus, tidak in tanpa:
            b = explain(ri, c, f"{huruf}. {judul}, tanpa index riwayat", sql, harus, tidak)
            ring += [(nama, "tanpa", n, rows) for n, rows in b if "Scan" in n]
    for nama, s in zip(pendek, sk):
        a, qa, la = hitung(n_plus_1, s)
        b, qb, lb = hitung(satu_join, s)
        harap(a, b, f"{nama}: hasil N+1 dan JOIN")
        harap((qa, la, qb, lb), (len(a) + 1, len(a) + 1, 1, 1), f"{nama}: query client/log N+1, client/log JOIN")
        jumlah += [(nama, "N+1", len(a), qa, la), (nama, "JOIN", len(b), qb, lb)]
        waktu[nama] = [ukur_ms(n_plus_1, s), ukur_ms(satu_join, s)]
        if s is sk[0]:
            contoh = a[:5]
    with sambung() as c:
        ri.bagian("E. Index riwayat (ADR 15)")
        q = "CREATE INDEX posting_riwayat ON posting (buku_id, dibuat, id)"
        t = time.perf_counter()
        c.execute(q)
        ms = (time.perf_counter() - t) * 1000
        ri.sql(q + ";")
        ri(f"-- selesai dalam {ms:.0f} ms (pembanding)")
        q = ("SELECT c.relname AS relasi, pg_size_pretty(pg_relation_size(c.oid)) AS ukuran FROM pg_class c "
             "WHERE c.relname IN ('posting', 'posting_buku', 'posting_jurnal', 'posting_riwayat') "
             "AND c.relnamespace = current_schema()::regnamespace ORDER BY 1")
        ri.sql(q)
        ri(tabel(["relasi", "ukuran"], c.execute(q).fetchall()))
        dari, sampai = sk[1].args["dari"], sk[1].args["sampai"]
        dengan = [("F", sk[0].judul, literal(sk[0].sql(DAFTAR), sk[0].args), pendek[0],
                   ["Index Scan Backward using posting_riwayat"], ["Sort", "posting_buku"]),
                  ("G", sk[1].judul, literal(sk[1].sql(DAFTAR), sk[1].args), pendek[1], ["on posting_riwayat"],
                   ["posting_buku"]),
                  ("H", "Satu query JOIN (ADR 15) untuk riwayat Budi halaman pertama", literal(sk[0].sql(JOIN),
                   sk[0].args), "JOIN Budi hal. 1", ["Index Scan Backward using posting_riwayat"],
                   ["Sort Key: p.dibuat", "posting_buku"])]
        for huruf, judul, sql, nama, harus, tidak in dengan:
            b = explain(ri, c, f"{huruf}. {judul}, dengan index riwayat", sql, harus, tidak)
            ring += [(nama, "dengan", n, rows) for n, rows in b if "Scan" in n]
        b = explain(ri, c, "I. Kolom pertama index tidak ada di WHERE: semua posting satu hari (laporan Keuangan)",
                    f"SELECT count(*) FROM posting p WHERE p.dibuat >= '{dari}' AND p.dibuat < '{sampai}'",
                    ["Seq Scan on posting"], ["posting_riwayat"])
        ring += [("Semua buku, satu hari", "dengan", n, rows) for n, rows in b if "Scan" in n]
        ringkas(ri, ring)
    for nama, s in zip(pendek, sk):
        waktu[nama] += [ukur_ms(n_plus_1, s), ukur_ms(satu_join, s)]

    rn.bagian("A. Cara M11: daftar dulu, lalu nama lawan satu query per baris")
    rn.sql(sk[0].sql(DAFTAR))
    rn("   -- lalu untuk setiap baris:")
    rn.sql(LAWAN)
    rn.bagian("B. ADR 15: satu query, lawan dicari di dalam query yang sama")
    rn.sql(sk[0].sql(JOIN))
    rn.bagian("C. Lima baris pertama riwayat Budi: sama di kedua cara")
    rn(tabel(["jurnal", "jenis", "arah", "lawan", "jumlah"],
             [(j, jenis, "keluar" if x < 0 else "masuk", lawan, rp(abs(x))) for _, j, jenis, x, _, lawan in contoh]))
    rn("Ketiga permintaan di bawah menghasilkan baris yang sama persis (urutan, jenis, lawan, jumlah) di kedua cara.")
    rn.bagian("D. Jumlah query per permintaan")
    rn(tabel(["permintaan", "cara", "baris", "query (client)", "query (log server)"], jumlah))
    rn("Log server: container berjalan dengan log_statement=all; setiap percobaan memakai application_name sendiri,")
    rn("dan satu query penanda di akhir tidak dihitung. Index tidak mengubah jumlah query.")
    rn.bagian("E. Waktu per permintaan (pembanding, bukan janji)")
    rn(tabel(["permintaan", "cara", "tanpa index riwayat", "dengan index riwayat"],
             [(nama, cara, f"{w[i]:9.1f} ms", f"{w[i + 2]:9.1f} ms")
              for nama, w in waktu.items() for i, cara in ((0, "N+1"), (1, "JOIN"))]))
    rn("Median 5 kali sesudah satu pemanasan, diukur di client Python (psycopg 3) ke PostgreSQL di Docker di mesin yang")
    rn("sama: tanpa jaringan antara server API dan database. Mesin lab dipakai lab lain bersamaan.")
    return ri, rn


def jalankan(folder):
    with sambung() as c:
        versi = c.execute("SHOW server_version").fetchone()[0].split()[0]
    rd, d, ramai = L.muat(versi)
    ri, rn = lab_index_n1(versi, d, ramai)
    for r, nama in ((rd, "data.txt"), (rn, "n1.txt"), (ri, "index.txt")):
        r.tulis(folder, nama)


def cek():
    """Rekam ulang ke folder sementara; bandingkan dengan output/ledger/ yang di-commit tanpa bagian pembanding."""
    terdaftar = subprocess.run(["git", "ls-files", "--", "output/ledger/"], cwd=HERE, capture_output=True, text=True,
                               check=True).stdout.split()
    with tempfile.TemporaryDirectory() as t:
        folder = pathlib.Path(t)
        jalankan(folder)
        baru = sorted(p.name for p in folder.iterdir())
        harap(baru, sorted(pathlib.Path(x).name for x in terdaftar), "file rekaman ulang lawan git ls-files output/ledger")
        beda = 0
        for n in baru:
            diff = bandingkan((OUT / n).read_text(), (folder / n).read_text())
            if diff:
                beda += 1
                print(f"BEDA {n}:\n" + "\n".join(diff[:60]))
        if beda:
            gagal(f"{beda} file berbeda dari yang di-commit pada bagian yang dibandingkan")
    print(f"cek-ledger: {len(baru)} file sama dengan yang di-commit (waktu, buffer, ukuran disamarkan)")


if __name__ == "__main__":
    cek() if "--cek" in sys.argv[1:] else jalankan(OUT)
