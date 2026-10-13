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


def lab_kursor(versi, d):
    r = Rekaman("pagination OFFSET lawan kursor (dibuat, id) saat kiriman baru masuk", versi)
    r("-- Sesudah index riwayat dan query JOIN (ADR 15). Kiriman baru lewat jalur biasa: satu transaction, trigger")
    r("-- invarian aktif, dibuat = now() (sesudah semua data lab). Buffers dan waktu = pembanding (keputusan 523).")
    budi = d.buku[L.BUDI]
    with sambung() as c:
        def kirim(dari, jumlah=5_000):
            with c.transaction():
                j = c.execute("INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('transfer', 'Kiriman', %s) "
                              "RETURNING id", (dari,)).fetchone()[0]
                ids = c.execute("INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES (%s, %s, %s), (%s, %s, %s) "
                                "RETURNING id", (j, d.buku[dari], -jumlah, j, budi, jumlah)).fetchall()
                c.execute(PERBARUI_CACHE, (j,))
            return j, ids[-1][0]

        def offset(n, off):
            return c.execute(JOIN.format(where="p.buku_id = %(buku)s", urut=BARU + " LIMIT %(n)s OFFSET %(off)s"),
                             {"buku": budi, "n": n, "off": off}).fetchall()

        def kursor(n, k=None, arah="<"):
            w = "p.buku_id = %(buku)s" + (f" AND (p.dibuat, p.id) {arah} (%(kd)s, %(ki)s)" if k else "")
            urut = BARU if arah == "<" else "ORDER BY p.dibuat, p.id"
            return c.execute(JOIN.format(where=w, urut=urut + (" LIMIT %(n)s" if n else "")),
                             {"buku": budi, "n": n, "kd": k and k[0], "ki": k and k[1]}).fetchall()

        def tampil(rows, sudah=()):
            r(tabel(["posting", "jurnal", "jenis", "arah", "lawan", "jumlah", "catatan"],
                    [(p, j, jenis, "keluar" if x < 0 else "masuk", lawan, rp(abs(x)), "ganda" if p in sudah else "")
                     for p, j, jenis, x, _, lawan in rows]))

        r.bagian("A. OFFSET (cara M12), 5 baris per halaman supaya ringkas")
        r.sql(JOIN.format(where=f"p.buku_id = {budi}", urut=BARU + " LIMIT 5 OFFSET 0"))
        h1 = offset(5, 0)
        tampil(h1)
        j, _ = kirim(L.DIMAS)
        r(f"Dimas mengirim Rp5.000 ke Budi: jurnal {j}.")
        r("=> ... LIMIT 5 OFFSET 5")
        h2 = offset(5, 5)
        tampil(h2, {x[0] for x in h1})
        harap(h2[0][0], h1[-1][0], "OFFSET: baris pertama halaman 2 = baris terakhir halaman 1")
        lihat = [x[0] for x in h1 + h2]
        r(f"Di layar: {len(lihat)} baris, {len(set(lihat))} posting berbeda. Kiriman Dimas (jurnal {j}) tidak ada di "
          "daftar.")

        r.bagian("B. Kursor (dibuat, id) baris terakhir yang sudah tampil")
        h1 = kursor(5)
        r.sql(JOIN.format(where=f"p.buku_id = {budi}", urut=BARU + " LIMIT 5"))
        tampil(h1)
        k = (h1[-1][4], h1[-1][0])
        r(f"kursor = ('{k[0]}', {k[1]})")
        j, _ = kirim(L.CITRA)
        r(f"Citra mengirim Rp5.000 ke Budi: jurnal {j}.")
        r(f"=> ... WHERE p.buku_id = {budi} AND (p.dibuat, p.id) < ('{k[0]}', {k[1]}) {BARU} LIMIT 5")
        h2 = kursor(5, k)
        tampil(h2, {x[0] for x in h1})
        harap(len({x[0] for x in h1} & {x[0] for x in h2}), 0, "kursor: baris ganda")
        atas = (h1[0][4], h1[0][0])
        r("Lebih baru dari baris pertama halaman 1 (app memintanya saat daftar ditarik ke bawah; dibuat = now()):")
        r(f"=> ... WHERE p.buku_id = {budi} AND (p.dibuat, p.id) > (<dibuat posting {atas[1]}>, {atas[1]}) "
          "ORDER BY p.dibuat, p.id")
        h0 = kursor(None, atas, ">")
        tampil(h0)
        harap([x[1] for x in h0], [j], "kursor: yang lebih baru = kiriman Citra")
        lihat = [x[0] for x in h0 + h1 + h2]
        r(f"Di layar: {len(lihat)} baris, {len(set(lihat))} posting berbeda. Kiriman Citra (jurnal {j}) ada.")

        r.bagian("C. Seluruh riwayat Budi, 20 baris per halaman, satu kiriman masuk sebelum setiap halaman berikutnya")
        pengirim = [a for (a,) in c.execute("SELECT akun_id FROM buku WHERE jenis = 'karyawan' AND akun_id <> %s "
                                            "ORDER BY saldo_cache DESC, akun_id LIMIT 10", (L.BUDI,)).fetchall()]
        hasil = []
        for cara in ("OFFSET", "kursor"):
            lama = {p for (p,) in c.execute("SELECT id FROM posting WHERE buku_id = %s", (budi,)).fetchall()}
            lihat, baru, halaman = [], set(), 0
            while True:
                h = offset(20, 20 * halaman) if cara == "OFFSET" else kursor(20, lihat and (akhir[4], akhir[0]))
                halaman += 1
                lihat += [x[0] for x in h]
                if halaman == 1:
                    pertama = h[0]
                if len(h) < 20:
                    break
                akhir = h[-1]
                baru.add(kirim(pengirim[len(baru) % 10])[1])
            if cara == "kursor":
                lihat += [x[0] for x in kursor(None, (pertama[4], pertama[0]), ">")]
            hasil.append((cara, halaman, len(lihat), len(lihat) - len(set(lihat)), len(lama - set(lihat)),
                          len(baru), len(baru - set(lihat))))
        r(tabel(["cara", "halaman", "baris tampil", "ganda", "posting lama terlewat", "kiriman baru",
                 "kiriman baru tidak tampil"], hasil))
        harap([x[3:5] + x[6:] for x in hasil], [(hasil[0][5], 0, hasil[0][5]), (0, 0, 0)], "ganda, terlewat, tidak tampil")
        r("OFFSET: setiap kiriman menggeser semua baris lama satu posisi, jadi setiap halaman mengulang satu baris dari")
        r("halaman sebelumnya, dan kiriman yang masuk di atas tidak pernah tampil. Posting lama tidak terlewat karena")
        r("ledger hanya bertambah (append-only); baris lama terlewat hanya bila ada baris yang hilang dari atas daftar.")
        r("Kursor: halaman berikutnya dimulai sesudah (dibuat, id) baris terakhir, dan kiriman baru diambil sekali")
        r("lewat (dibuat, id) > baris pertama.")

        r.bagian("D. Halaman jauh: 20 baris mulai posisi 1.001")
        dasar = f"SELECT p.id, p.jumlah, p.dibuat FROM posting p WHERE p.buku_id = {budi}"
        ki, _, kd = c.execute(dasar + f" {BARU} LIMIT 1 OFFSET 999").fetchone()
        q_off = dasar + f" {BARU} LIMIT 20 OFFSET 1000"
        q_kur = dasar + f" AND (p.dibuat, p.id) < ('{kd}', {ki}) {BARU} LIMIT 20"
        harap(c.execute(q_off).fetchall(), c.execute(q_kur).fetchall(), "OFFSET 1000 dan kursor: baris sama")
        bo = explain(r, c, "D1. OFFSET 1000", q_off, ["Index Scan Backward using posting_riwayat"])
        bk = explain(r, c, "D2. Kursor = (dibuat, id) baris ke-1.000", q_kur,
                     ["Index Scan Backward using posting_riwayat", "ROW(dibuat, id) < ROW("])
        harap([x[1] for x in bo if "posting_riwayat" in x[0]], [1020], "OFFSET 1000: baris dibaca index")
        harap([x[1] for x in bk if "posting_riwayat" in x[0]], [20], "kursor: baris dibaca index")
        r("\nKedua query menghasilkan 20 baris yang sama. OFFSET membaca 1.020 baris dari index lalu membuang 1.000;")
        r("kursor mulai membaca tepat sesudah baris ke-1.000.")
    return r


def jalankan(folder):
    with sambung() as c:
        versi = c.execute("SHOW server_version").fetchone()[0].split()[0]
    rd, d, ramai = L.muat(versi)
    ri, rn = lab_index_n1(versi, d, ramai)
    rk = lab_kursor(versi, d)
    for r, nama in ((rd, "data.txt"), (rn, "n1.txt"), (ri, "index.txt"), (rk, "pagination.txt")):
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
