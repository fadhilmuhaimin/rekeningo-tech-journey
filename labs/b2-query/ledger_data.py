"""Data lab b2-query versi ledger (keputusan 521, 522): satu tahun Tahap 2 di atas labs/b3-ledger/schema.sql.

Angka dari naskah (plan/CERITA-TAHAP-2.md): 1.000 karyawan, 12 warung, top-up tiap Senin, pencairan tiap Jumat, dan
rumus bagian "Pertumbuhan skala": transaksi per hari = 1.000 user x 30% aktif x 3 = 900. Yang tidak ada di naskah
adalah data lab: periode 52 minggu (supaya syarat PRD P1 "cepat walau sudah ribuan transaksi" diuji di ukuran itu),
Rp250.000 per top-up, menu bayar, porsi 85% bayar dan 15% kiriman, Warung Ani tiga kali lebih ramai dari warung lain,
dan Budi sebagai user paling aktif yang sering mengumpulkan patungan (persona PRD: kirim uang ke teman untuk patungan).

Data dibangkitkan random.Random(SEED) dalam urutan waktu, jadi sama di setiap run. Pembayar dipilih ulang bila
saldonya kurang, jadi tidak ada saldo karyawan negatif di titik mana pun.

Jalur muat (dicatat di output/ledger/data.txt): satu transaction berisi ALTER TABLE jurnal|posting DISABLE TRIGGER
USER, COPY, lalu ENABLE TRIGGER USER sebelum COMMIT. Invarian 3 menjumlah semua posting buku di setiap posting keluar,
jadi memuat 760 ribu posting lewat trigger biayanya tumbuh dengan riwayat. Sesudah muat, ketiga invarian diperiksa
dengan query atas seluruh data, dan satu jurnal tidak seimbang dicoba untuk membuktikan trigger aktif lagi.
"""
import datetime as dt
import random

import psycopg

from rekam_ledger import ROOT, SCHEMA, Rekaman, gagal, harap, rp, sambung, tabel

SEED = 15                     # nomor ADR 15; hanya supaya data sama di setiap run
WIB = dt.timezone(dt.timedelta(hours=7))
MULAI = dt.datetime(2025, 10, 6, tzinfo=WIB)   # Senin; 364 hari berakhir Minggu 2026-10-04, sebelum rekaman dibuat
HARI = 364
PER_HARI = 900                # 1.000 x 30% x 3 (rumus naskah)
TOPUP = 250_000
MENU = [5_000, 8_000, 15_000, 20_000, 25_000]
KIRIM = [10_000, 20_000, 25_000, 50_000]
PORSI_BAYAR = 0.85
BOBOT_ANI = 3                 # Warung Ani dipilih tiga kali lebih sering dari warung lain
BOBOT_BUDI_BAYAR = 6          # Budi membayar enam kali lebih sering dari karyawan lain
BOBOT_BUDI_TERIMA = 40        # Budi penerima kiriman patungan 40 kali lebih sering

SISTEM, ADMIN, DIMAS, ANI, BUDI, SARI, CITRA = 1, 400, 417, 418, 419, 502, 504
WARUNG = [418, 501, 502, 503, 505, 506, 507, 508, 509, 510, 511, 512]   # 504 dipakai Citra (karyawan) sejak b3-ledger
KARYAWAN = [i for i in range(401, 1500) if i not in WARUNG][:1000]
NAMA = {BUDI: "Budi", DIMAS: "Dimas", CITRA: "Citra", ANI: "Warung Ani", SARI: "Warung Sari"}


def nama(akun):
    if akun in NAMA:
        return NAMA[akun]
    return f"Warung {akun}" if akun in WARUNG else f"Karyawan {akun}"


class Data:
    """Hasil bangkit: baris COPY untuk akun, buku, jurnal, posting, dan ringkasannya."""

    def __init__(self):
        self.rng = random.Random(SEED)
        self.buku = {None: 1}                     # buku tunjangan = 1, kas_pencairan = 2
        self.buku_kas = 2
        for i, a in enumerate(KARYAWAN + WARUNG):
            self.buku[a] = 3 + i
        self.saldo = {b: 0 for b in range(1, 3 + len(KARYAWAN) + len(WARUNG))}
        self.jurnal, self.posting = [], []
        self.jenis = {"topup": 0, "bayar": 0, "kiriman": 0, "pencairan": 0}
        self._bangkit()

    # ---------- baris ----------
    def _jurnal(self, jenis, ket, oleh, waktu, pindah):
        """pindah = [(buku, jumlah), ...]; jumlahnya 0. Satu jurnal = satu transaction di cerita."""
        j = len(self.jurnal) + 1
        jenis_db = "transfer" if jenis == "kiriman" else jenis
        self.jurnal.append(f"{j}\t{jenis_db}\t{ket}\t{oleh}\t{waktu}\n")
        for b, x in pindah:
            self.posting.append(f"{len(self.posting) + 1}\t{j}\t{b}\t{x}\t{waktu}\n")
            self.saldo[b] += x
        self.jenis[jenis] += 1

    @staticmethod
    def _teks(t):
        return t.isoformat(sep=" ")

    # ---------- simulasi ----------
    def _pembayar(self, jumlah, bobot):
        for _ in range(200):
            a = self.rng.choices(KARYAWAN, cum_weights=bobot)[0]
            if self.saldo[self.buku[a]] >= jumlah:
                return a
        raise SystemExit("GAGAL: tidak ada pembayar dengan saldo cukup")

    def _bangkit(self):
        rng = self.rng
        kum = lambda w: [sum(w[:i + 1]) for i in range(len(w))]
        bobot_bayar = kum([BOBOT_BUDI_BAYAR if a == BUDI else 1 for a in KARYAWAN])
        bobot_terima = kum([BOBOT_BUDI_TERIMA if a == BUDI else 1 for a in KARYAWAN])
        bobot_warung = kum([BOBOT_ANI if w == ANI else 1 for w in WARUNG])
        for d in range(HARI):
            hari = MULAI + dt.timedelta(days=d)
            if hari.weekday() == 0:   # Senin 07.00 WIB: top-up 1.000 akun dalam satu transaction, waktu sama
                t = self._teks(hari.replace(hour=7))
                for a in KARYAWAN:
                    self._jurnal("topup", "Tunjangan makan", ADMIN, t, [(1, -TOPUP), (self.buku[a], TOPUP)])
            awal = hari.replace(hour=7, minute=30)
            detik = sorted(rng.randrange(11 * 3600 * 10**6) for _ in range(PER_HARI))   # 07.30-18.30 WIB
            for us in detik:
                t = self._teks(awal + dt.timedelta(microseconds=us))
                if rng.random() < PORSI_BAYAR:
                    x = rng.choice(MENU)
                    a = self._pembayar(x, bobot_bayar)
                    w = rng.choices(WARUNG, cum_weights=bobot_warung)[0]
                    self._jurnal("bayar", "Bayar", a, t, [(self.buku[a], -x), (self.buku[w], x)])
                else:
                    x = rng.choice(KIRIM)
                    a = self._pembayar(x, bobot_bayar)
                    k = a
                    while k == a:   # penerima bukan pengirim; dipilih ulang dengan generator yang sama
                        k = rng.choices(KARYAWAN, cum_weights=bobot_terima)[0]
                    self._jurnal("kiriman", "Kiriman", a, t, [(self.buku[a], -x), (self.buku[k], x)])
            if hari.weekday() == 4:   # Jumat 21.00 WIB: seluruh saldo warung ke kas pencairan
                t = self._teks(hari.replace(hour=21))
                for w in WARUNG:
                    x = self.saldo[self.buku[w]]
                    if x > 0:
                        self._jurnal("pencairan", "Pencairan Jumat", SISTEM, t, [(self.buku[w], -x), (2, x)])

    # ---------- COPY ----------
    def akun_tsv(self):
        baris = [f"{SISTEM}\tSistem Rekeningo\tsistem@lestari.example\tsistem\n",
                 f"{ADMIN}\tAdmin Tunjangan\tadmin.tunjangan@lestari.example\tadmin\n"]
        baris += [f"{a}\t{nama(a)}\tk{a}@lestari.example\tkaryawan\n" for a in KARYAWAN]
        baris += [f"{w}\t{nama(w)}\tw{w}@lestari.example\twarung\n" for w in WARUNG]
        return "".join(baris)

    def buku_tsv(self):
        baris = [f"1\t\\N\ttunjangan\t{self.saldo[1]}\n", f"2\t\\N\tkas_pencairan\t{self.saldo[2]}\n"]
        for a in KARYAWAN + WARUNG:
            b = self.buku[a]
            baris.append(f"{b}\t{a}\t{'warung' if a in WARUNG else 'karyawan'}\t{self.saldo[b]}\n")
        return "".join(baris)


# Pemeriksaan sesudah muat. Setiap query harus menghasilkan 0 (atau nilai yang ditulis di harapan).
INVARIAN = [
    ("1. jurnal tidak seimbang (kurang dari dua posting atau jumlah bukan 0)",
     "SELECT count(*) FROM (SELECT j.id FROM jurnal j LEFT JOIN posting p ON p.jurnal_id = j.id "
     "GROUP BY j.id HAVING count(p.id) < 2 OR coalesce(sum(p.jumlah), 0) <> 0) x"),
    ("3. posting karyawan yang membuat saldo berjalan negatif (urut dibuat, id)",
     "SELECT count(*) FROM (SELECT sum(p.jumlah) OVER (PARTITION BY p.buku_id ORDER BY p.dibuat, p.id) AS s "
     "FROM posting p JOIN buku b ON b.id = p.buku_id WHERE b.jenis = 'karyawan') x WHERE s < 0"),
    ("saldo_cache yang berbeda dari jumlah posting",
     "SELECT count(*) FROM buku b LEFT JOIN (SELECT buku_id, sum(jumlah) AS s FROM posting GROUP BY buku_id) p "
     "ON p.buku_id = b.id WHERE b.saldo_cache <> coalesce(p.s, 0)"),
    ("jumlah semua posting (harus 0)", "SELECT coalesce(sum(jumlah), 0) FROM posting"),
]

TRIGGER = ("SELECT tgrelid::regclass AS tabel, tgname AS trigger, tgenabled AS aktif FROM pg_trigger "
           "WHERE tgrelid IN ('jurnal'::regclass, 'posting'::regclass) AND NOT tgisinternal ORDER BY 1, 2")


def muat(versi):
    """Buat ulang schema, muat data, periksa invarian. Mengembalikan (rekaman data.txt, Data, hari ramai Ani)."""
    r = Rekaman("data satu tahun Tahap 2", versi)
    d = Data()
    r.bagian("A. Asal angka")
    r(["Naskah (plan/CERITA-TAHAP-2.md): 1.000 karyawan, 12 warung, top-up tiap Senin, pencairan tiap Jumat,",
       "  transaksi per hari = 1.000 user x 30% aktif x 3 = 900 (bagian Pertumbuhan skala).",
       f"Data lab (labs/b2-query/ledger_data.py, random.Random({SEED})): {HARI} hari mulai Senin {MULAI.date()},",
       f"  top-up {rp(TOPUP)} per karyawan, 85% bayar ke warung dan 15% kiriman antar karyawan,",
       "  Warung Ani dipilih 3x lebih sering dari warung lain, Budi membayar 6x lebih sering dan menerima",
       "  kiriman patungan 40x lebih sering dari karyawan lain. Pembayar dipilih ulang bila saldonya kurang."])
    with sambung(autocommit=False) as c:
        c.execute(f"DROP SCHEMA IF EXISTS {SCHEMA} CASCADE")
        c.execute(f"CREATE SCHEMA {SCHEMA}")
        c.execute((ROOT / "labs/b3-ledger/schema.sql").read_text())
        c.commit()
        r.bagian("B. Jalur muat: satu transaction, trigger invarian dimatikan selama COPY")
        r("Skema: labs/b3-ledger/schema.sql apa adanya (tanpa index riwayat).")
        for q in ("BEGIN", "ALTER TABLE jurnal DISABLE TRIGGER USER", "ALTER TABLE posting DISABLE TRIGGER USER"):
            r.sql(q + ";")
            if q != "BEGIN":
                c.execute(q)
        r(tabel(["tabel", "trigger", "aktif"], c.execute(TRIGGER).fetchall()))
        for nama, kolom, isi in (("akun", "id, nama, email, peran", d.akun_tsv()),
                                 ("buku", "id, akun_id, jenis, saldo_cache", d.buku_tsv()),
                                 ("jurnal", "id, jenis, keterangan, dibuat_oleh, dibuat", "".join(d.jurnal)),
                                 ("posting", "id, jurnal_id, buku_id, jumlah, dibuat", "".join(d.posting))):
            with c.cursor().copy(f"COPY {nama} ({kolom}) FROM STDIN") as cp:
                cp.write(isi)
            r.sql(f"COPY {nama} ({kolom}) FROM STDIN;   -- " + f"{isi.count(chr(10)):,} baris".replace(",", "."))
        for q in ("ALTER TABLE jurnal ENABLE TRIGGER USER", "ALTER TABLE posting ENABLE TRIGGER USER", "COMMIT"):
            r.sql(q + ";")
            if q != "COMMIT":
                c.execute(q)
        c.commit()
        r(tabel(["tabel", "trigger", "aktif"], c.execute(TRIGGER).fetchall()))
        for t in ("buku", "jurnal", "posting"):
            c.execute(f"SELECT setval('{t}_id_seq', (SELECT max(id) FROM {t}))")
        c.commit()
    with sambung() as c:
        r.bagian("C. Statistik planner dari seluruh baris, autovacuum dimatikan di tabel lab")
        for q in ("ALTER TABLE jurnal SET (autovacuum_enabled = false)",
                  "ALTER TABLE posting SET (autovacuum_enabled = false)",
                  "SET default_statistics_target = 10000", "VACUUM (ANALYZE) akun, buku, jurnal, posting"):
            r.sql(q + ";")
            c.execute(q)
        r("ANALYZE mengambil sampel 300 x statistics target baris; 3.000.000 > 760.448, jadi semua baris dibaca dan")
        r("rencana sama di setiap rekaman. Autovacuum tidak boleh menimpa statistik ini di tengah lab (keputusan 523).")

        r.bagian("D. Isi sesudah muat")
        q = ("SELECT j.jenis, count(DISTINCT j.id) AS jurnal, count(*) AS posting FROM jurnal j "
             "JOIN posting p ON p.jurnal_id = j.id GROUP BY ROLLUP (j.jenis) ORDER BY j.jenis NULLS LAST")
        isi = [(j or "total", n, p) for j, n, p in c.execute(q).fetchall()]
        r.sql(q)
        r(tabel(["jenis", "jurnal", "posting"], isi))
        harap(isi[-1][1:], (len(d.jurnal), len(d.posting)), "jumlah jurnal dan posting")
        q = ("SELECT a.nama, b.id AS buku, count(p.id) AS posting FROM akun a JOIN buku b ON b.akun_id = a.id "
             f"JOIN posting p ON p.buku_id = b.id WHERE a.id IN ({BUDI}, {ANI}) GROUP BY a.nama, b.id ORDER BY a.nama")
        r.sql(q)
        r(tabel(["nama", "buku", "posting"], c.execute(q).fetchall()))
        q = (f"SELECT (p.dibuat AT TIME ZONE 'Asia/Jakarta')::date AS hari, count(*) AS posting FROM posting p "
             f"WHERE p.buku_id = {d.buku[ANI]} GROUP BY 1 ORDER BY 2 DESC, 1 DESC LIMIT 3")
        ramai = c.execute(q).fetchall()
        r.sql(q)
        r(tabel(["hari", "posting"], ramai))
        r(f"Hari ramai Warung Ani = {ramai[0][0]} (posting terbanyak di buku Warung Ani; seri dipecah tanggal terbaru).")

        r.bagian("E. Invarian diperiksa atas seluruh data sesudah muat")
        hasil = []
        for apa, q in INVARIAN:
            n = c.execute(q).fetchone()[0]
            harap(n, 0, apa)
            hasil.append((apa, n))
        r(tabel(["pemeriksaan", "hasil"], hasil))
        r("Invarian 2 (append-only) tidak bisa dilanggar oleh COPY: COPY hanya menambah baris.")

        r.bagian("F. Trigger aktif lagi: jurnal tidak seimbang ditolak saat COMMIT")
        r.sql("BEGIN;\nINSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('bayar', 'Uji', 417) RETURNING id;\n"
              f"INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES (<id>, {d.buku[DIMAS]}, -5000);\nCOMMIT;")
        try:
            with c.transaction():
                j = c.execute("INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) VALUES ('bayar', 'Uji', 417) "
                              "RETURNING id").fetchone()[0]
                c.execute("INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES (%s, %s, -5000)", (j, d.buku[DIMAS]))
            gagal("jurnal tidak seimbang diterima")
        except psycopg.errors.CheckViolation as e:
            harap(e.diag.constraint_name, "jurnal_seimbang", "constraint penolak")
            r(f"ERROR:  {e.diag.sqlstate} {e.diag.constraint_name}: {e.diag.message_primary.split(':')[0]}: ...")
    return r, d, ramai[0][0]
