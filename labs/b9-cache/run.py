"""Lab B9: cache-aside dengan Redis + PostgreSQL 17. Keluaran: output/cache.txt"""
import pathlib, statistics, time
import psycopg, redis
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), ".."))  # lab_env: labs/README.md
from lab_env import DB_PORT, REDIS_PORT  # noqa: E402

pg = psycopg.connect(f"host=127.0.0.1 port={DB_PORT} user=lab password=lab dbname=lab", autocommit=True)
pg.execute("DROP SCHEMA IF EXISTS b9 CASCADE; CREATE SCHEMA b9; SET search_path = b9")
pg.execute("CREATE TABLE produk (id int PRIMARY KEY, nama text, harga bigint)")
pg.execute("INSERT INTO produk VALUES (1, 'Nasi goreng', 25000)")
r = redis.Redis(port=REDIS_PORT)
r.flushall()
log = [f"-- Redis {r.info()['redis_version']} · PostgreSQL 17.11 · TTL cache 300 detik"]
catat = log.append

# --8<-- [start:cacheaside]
def baca_harga(produk_id):
    kunci = f"produk:{produk_id}:harga"
    nilai = r.get(kunci)
    if nilai is not None:
        return int(nilai), "HIT"
    harga = pg.execute("SELECT harga FROM produk WHERE id = %s", (produk_id,)).fetchone()[0]
    r.set(kunci, harga, ex=300)          # simpan 300 detik
    return harga, "MISS"

def ubah_harga(produk_id, harga, hapus_cache):
    pg.execute("UPDATE produk SET harga = %s WHERE id = %s", (harga, produk_id))
    if hapus_cache:
        r.delete(f"produk:{produk_id}:harga")   # invalidation saat menulis
# --8<-- [end:cacheaside]

def baca(siapa):
    h, s = baca_harga(1)
    ttl = r.ttl("produk:1:harga")
    catat(f"{siapa:<5} baca harga  → Rp{h:,}".replace(",", ".") + f" ({s}, sisa TTL {ttl} detik)")

catat("\n# A. Hanya TTL, cache tidak dihapus saat harga berubah")
baca("Budi")
ubah_harga(1, 28000, hapus_cache=False); catat("Ani   ubah harga jadi Rp28.000 di database")
time.sleep(1)
baca("Budi")
catat(f"      database: Rp{pg.execute('SELECT harga FROM produk WHERE id = 1').fetchone()[0]:,}".replace(",", "."))

r.flushall(); pg.execute("UPDATE produk SET harga = 25000 WHERE id = 1")
catat("\n# B. Cache dihapus setiap kali harga berubah")
baca("Budi")
ubah_harga(1, 28000, hapus_cache=True); catat("Ani   ubah harga jadi Rp28.000, lalu DEL produk:1:harga")
baca("Budi")
baca("Budi")

def median_ms(f, n=200):
    w = []
    for _ in range(n):
        t = time.perf_counter(); f(); w.append((time.perf_counter() - t) * 1000)
    return statistics.median(w)
catat("\n# C. Waktu baca, localhost, median 200 kali")
catat(f"Redis GET (hit)        {median_ms(lambda: r.get('produk:1:harga')):.3f} ms")
catat(f"PostgreSQL SELECT      {median_ms(lambda: pg.execute('SELECT harga FROM produk WHERE id = 1').fetchone()):.3f} ms")
BERAT = "SELECT toko_id, count(*), sum(total) FROM b2q.pesanan GROUP BY toko_id ORDER BY toko_id"
r.set("ringkasan_toko", str(pg.execute(BERAT).fetchall()), ex=300)
catat(f"Query ringkasan 200.000 pesanan  {median_ms(lambda: pg.execute(BERAT).fetchall(), 20):.3f} ms  (median 20 kali)")
catat(f"Redis GET hasil ringkasan        {median_ms(lambda: r.get('ringkasan_toko')):.3f} ms")
teks = "\n".join(log) + "\n"
(pathlib.Path(__file__).parent / "output/cache.txt").write_text(teks)
print(teks)
