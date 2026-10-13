"""Server Rekeningo dalam lab b4-skema versi ledger (keputusan 530): kode bayar tiga versi, query riwayat, data.

Query riwayat diambil dari kode Go api-t1 dan api-t2 (gagal bila tidak ditemukan), file migration dibaca dari
labs/api-t2/migrasi apa adanya, jadi lab ini tidak menyimpan salinan yang bisa melenceng (keputusan 409).
"""
import json, re
from alat_ledger import HERE, SCHEMA, angka, gagal, harap, sambung

LABS = HERE.parent
OUT = HERE / "output" / "ledger"
MIG = LABS / "api-t2" / "migrasi"
EXPAND = ("000009_akun_tahap2.up.sql", "000010_ledger_tabel.up.sql", "000011_ledger_pendukung.up.sql")
SEMUA = EXPAND + ("000012_ledger_migrasi.up.sql", "000013_saldo_contract.up.sql")
LOCK_TIMEOUT = "SET LOCAL lock_timeout = '3s';"
TAHAN = 5          # detik laporan tetap terbuka sesudah bayar masuk antrean (parameter lab, naskah: 40 detik)
TABEL_AKHIR = ["akun", "baris_pencairan", "batch_pencairan", "buku", "jurnal", "kunci_idempotensi", "posting", "sesi"]
CITRA, BUDI, ANI, SARI = 504, 419, 418, 502


def berkas(nama, tanpa_lock_timeout=False):
    t = (MIG / nama).read_text()
    harap(t.count(LOCK_TIMEOUT), 1, f"baris {LOCK_TIMEOUT} di {nama}")
    if tanpa_lock_timeout:
        t = t.replace(LOCK_TIMEOUT, "-- (SET LOCAL lock_timeout dibuang: versi satu langkah)")
    return t


def query_go(path, pola):
    m = re.search(pola, (LABS / path).read_text(), re.S)
    if not m:
        gagal(f"query riwayat di {path} tidak ditemukan")
    return m.group(1)


# Query riwayat server, diambil dari kode Go supaya tidak melenceng.
RIWAYAT_V1 = query_go("api-t1/internal/repo/riwayat.go", r"func \(r Repo\) Riwayat\(.*?QueryContext\(ctx, `(.*?)`, akun\)")
RIWAYAT_V2 = query_go("api-t2/internal/repo/riwayat.go", r"q := `(.*?)`") + " ORDER BY p.dibuat DESC, p.id DESC LIMIT 20"
# Versi pertama riwayat ledger dalam migrasi satu langkah, ditulis untuk app baru: nomor jurnal di field jurnal,
# jumlah bertanda (negatif = keluar) tanpa arah, lawan kosong bila lawannya buku sistem.
RIWAYAT_SATU_LANGKAH = """
    SELECT j.id, j.jenis, p.jumlah, la.nama
    FROM buku b JOIN posting p ON p.buku_id = b.id JOIN jurnal j ON j.id = p.jurnal_id
    LEFT JOIN posting q ON q.jurnal_id = p.jurnal_id AND q.buku_id <> p.buku_id
    LEFT JOIN buku lb ON lb.id = q.buku_id LEFT JOIN akun la ON la.id = lb.akun_id
    WHERE b.akun_id = $1 ORDER BY p.dibuat DESC, p.id DESC LIMIT 20"""

REKAP = ("SELECT a.nama, count(*) AS transaksi, sum(t.jumlah) AS total "
         "FROM transaksi t JOIN akun a ON a.id = t.ke GROUP BY a.nama ORDER BY a.nama")

# Kode bayar di tiga versi server. {j} = nomor jurnal dari INSERT jurnal di request yang sama.
CACHE = ("UPDATE buku b SET saldo_cache = b.saldo_cache + p.jumlah FROM (SELECT buku_id, sum(jumlah) AS jumlah "
         "FROM posting WHERE jurnal_id = {j} GROUP BY buku_id) p WHERE b.id = p.buku_id")
JURNAL = ("INSERT INTO jurnal (jenis, keterangan, dibuat_oleh) "
          "SELECT 'bayar', 'Bayar ke ' || nama, {dari} FROM akun WHERE id = {ke} RETURNING id")
POSTING = ("INSERT INTO posting (jurnal_id, buku_id, jumlah) VALUES "
           "({j}, (SELECT id FROM buku WHERE akun_id = {dari}), -{x}), ({j}, (SELECT id FROM buku WHERE akun_id = {ke}), {x})")
BAYAR = {
    "v1": ["UPDATE akun SET saldo = saldo - {x} WHERE id = {dari} RETURNING saldo",
           "UPDATE akun SET saldo = saldo + {x} WHERE id = {ke}",
           "INSERT INTO transaksi (dari, ke, jumlah) VALUES ({dari}, {ke}, {x}) RETURNING id"],
    "dua": ["SELECT id FROM akun WHERE id IN ({dari}, {ke}) ORDER BY id FOR UPDATE",
            "SELECT buka_buku(ARRAY[{dari}, {ke}]::bigint[])",
            "UPDATE akun SET saldo = saldo - {x} WHERE id = {dari} RETURNING saldo",
            "UPDATE akun SET saldo = saldo + {x} WHERE id = {ke}",
            JURNAL, POSTING, CACHE,
            "INSERT INTO transaksi (id, dari, ke, jumlah) VALUES ({j}, {dari}, {ke}, {x})"],
    "v2": ["SELECT akun_id, saldo_cache FROM buku WHERE akun_id IN ({dari}, {ke}) ORDER BY id FOR UPDATE",
           JURNAL, POSTING, CACHE],
}
NAMA_SERVER = {"v1": "server v1", "dua": "server v2 tulis dua tempat", "v2": "server v2 ledger saja"}


def bayar(versi, dari, ke, x):
    """Request POST /transfers di server versi itu, satu transaction. Kembalikan ringkasan hasil."""
    def f(k):
        v = {"dari": dari, "ke": ke, "x": x}
        k.sql("BEGIN")
        ringkas = []
        for q in BAYAR[versi]:
            hasil = k.sql(q.format(**v))
            if q.startswith("INSERT INTO jurnal"):
                v["j"] = hasil[0][0]
            elif q.startswith("SELECT buka_buku"):
                ringkas.append(f"buka_buku {hasil[0][0]}")
            elif q.startswith("SELECT akun_id, saldo_cache"):
                harap(dict(hasil)[dari] >= x, True, f"saldo akun {dari} cukup untuk {x}")   # cek saldo di kode v2
        k.sql("COMMIT")
        nomor = v.get("j") or hasil[0][0]
        return " · ".join(["COMMIT", f"nomor {angka(nomor)}"] + ringkas)
    return f


def saldo(k, baca, akun):
    q = "SELECT saldo FROM akun WHERE id = %s" if baca == "v1" else "SELECT saldo_cache FROM buku WHERE akun_id = %s"
    return k.sql(q, (akun,))[0][0]


def riwayat(k, baca, akun):
    """Body response GET /akun/{id}/riwayat. Waktu diganti <waktu>: rekaman tanpa jam."""
    if baca == "v1":
        r = k.sql(RIWAYAT_V1.replace("$1", "%(a)s"), {"a": akun})
        return {"riwayat": [dict(id=i, arah=a, lawan=l, jumlah=j, nominal=j, waktu="<waktu>") for i, a, l, j, _ in r]}
    if baca == "v2":
        r = k.sql(RIWAYAT_V2.replace("$1", "%(a)s"), {"a": akun})
        return {"riwayat": [dict(id=i, jenis=je, arah=a, lawan=l, jumlah=j, nominal=j, waktu="<waktu>")
                            for i, je, a, l, j, _, _ in r], "berikutnya": None}
    r = k.sql(RIWAYAT_SATU_LANGKAH.replace("$1", "%(a)s"), {"a": akun})
    return {"riwayat": [dict(jurnal=i, jenis=je, jumlah=j, lawan=l, waktu="<waktu>") for i, je, j, l in r],
            "berikutnya": None}


def json_pendek(body):
    return json.dumps(body, separators=(",", ":"), ensure_ascii=False)


def buat_schema():
    """Schema b4_ledger = akhir Tahap 1 (api-t1/schema.sql + 000005) dengan data kampus minggu 4."""
    v1 = (LABS / "api-t1/schema.sql").read_text()
    harap(len(re.findall(r"\btahap1\b", v1)) >= 3, True, "nama schema tahap1 di api-t1/schema.sql")
    with sambung() as c:
        c.execute(re.sub(r"\btahap1\b", SCHEMA, v1))
        c.execute((LABS / "b4-migration/baru/000005_batas_saldo_warung.up.sql").read_text())
        c.execute((HERE / "sql/ledger/00-data.sql").read_text())
        # VACUUM sekarang, supaya autovacuum tidak memegang lock tabel lab di tengah rekaman.
        c.execute("VACUUM ANALYZE akun")
        c.execute("VACUUM ANALYZE transaksi")
        n = c.execute("SELECT (SELECT count(*) FROM akun), (SELECT count(*) FROM transaksi)").fetchone()
    harap(n, (1013, 15000), "jumlah akun dan transaksi data lab")



def kode_bayar(lab, versi):
    lab.tulis(f"# Kode bayar {NAMA_SERVER[versi]} (satu transaction, BEGIN ... COMMIT):")
    for q in BAYAR[versi]:
        lab.tulis("#   " + q.format(dari="{dari}", ke="{ke}", x="{x}", j="{j}"))


def kepala(lab, judul, paragraf):
    lab.tulis(f"# {judul}")
    for p in paragraf:
        lab.tulis(f"# {p}")
    lab.tulis("# Data lab (sql/ledger/00-data.sql): 1.013 akun (1 admin, 1.000 karyawan, 12 warung) dan 15.000 baris")
    lab.tulis("# transaksi (tiga minggu makan siang kampus: 1.000 karyawan x 15 hari x Rp25.000).")
    lab.tulis()


def buka_laporan(lab, R):
    R.sql("BEGIN")
    r = R.sql(REKAP)
    harap(len(r), 12, "baris rekap laporan")
    lab.langkah("R", "BEGIN; SELECT a.nama, count(*), sum(t.jumlah) FROM transaksi t JOIN akun a ... GROUP BY a.nama",
                f"{len(r)} baris rekap per warung; transaction dibiarkan terbuka (laporan masih berjalan)")


def antre(lab, k, apa, harus_di_belakang):
    mode, objek, blok = lab.tunggu_antre(k)
    harap(blok, harus_di_belakang, f"{k.nama} menunggu di belakang")
    lab.langkah(k.nama, apa, f"MENUNGGU {mode} pada {objek}, di belakang {blok}")
    return mode, objek, blok
