"""Rekam lab t3-cache (keputusan 968-969): katalog di memori proses lawan Redis, di atas api-t3.

Server, skema, data awal (10.000 karyawan, 60 warung, 2.400 produk), dan cache katalog (flag -katalog-cache,
internal/cache) adalah milik `labs/api-t3` (`dasar_t3.py`), bukan salinan; lab ini hanya menambah skenario di
atasnya, di schema sendiri (`tahap3_cache`). Setiap bagian membuat ulang schema dan data awal dari nol, jadi
output/*.txt tidak bergantung pada urutan bagian dan rekaman ulang identik per byte (make cek). Token, waktu, dan
tanggal disamarkan. Angka yang bergantung pada kecepatan mesin (lama baca database) tidak ditulis: lab memeriksa
batasnya dan gagal keras bila meleset. Redis adalah container lokal (labs/b9-cache); tidak ada panggilan ke luar mesin ini.

    make -C labs/t3-cache run                   (butuh: Docker, Go; PostgreSQL dan Redis lewat make lab-up)
    make -C labs/t3-cache run BAGIAN=redis      (satu bagian: memori redis gagal beban)
"""
import datetime, functools, json, pathlib, subprocess, sys, threading, time

import redis

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "api-t3"))
import dasar_t3 as d  # noqa: E402
from dasar_t3 import PORT, PORT_KEDUA, bagian, catat, curl, gagal, harap, j, login  # noqa: E402
from lab_env import REDIS_PORT  # noqa: E402

LAB = "t3-cache"
SCH = "tahap3_cache"
DB = d.db_app(SCH)
COMPOSE_REDIS = d.LABS / "b9-cache" / "docker-compose.yml"
ANI, SARI = 418, 502             # akun warung di Jakarta (kota 1)
TTL_REDIS = "60s"                # ADR 28
d.OUT = HERE / "output"          # dasar_t3.tulis menulis ke d.OUT; di sini output lab ini, bukan api-t3

sql = functools.partial(d.sql, schema=SCH)


def satu(q):
    return d.satu(q, SCH)


def tulis(nama, judul, keputusan="968"):
    d.tulis(nama, judul, lab=LAB, schema=SCH, dasar=d.DASAR, keputusan=keputusan)


# ---------- dasar ----------

def siapkan():
    d.buat_schema(SCH)
    d.seed(SCH)
    sql("SELECT 1", tampil=False)


def id_produk(warung, nama):
    return satu(f"SELECT id FROM produk WHERE akun_id = {warung} AND nama = '{nama}'")


def pulihkan_produk(produk, harga=25000):
    """Keadaan awal satu skenario: harga dan versi kembali seperti data awal (setup lab, sebagai pemilik schema)."""
    sql(f"UPDATE produk SET harga = {harga}, versi = 1, stok = 50 WHERE id = {produk}", tampil=False)
    sql(f"DELETE FROM promo", tampil=False)


def r_redis(batas=15):
    return redis.Redis(port=REDIS_PORT, socket_timeout=batas, socket_connect_timeout=batas)


def redis_versi():
    return r_redis().info("server")["redis_version"]


def redis_kosongkan():
    r_redis().flushall()


def mulai_instance(port, args=(), cache="redis", ttl=None, hapus=None, gerbang=None, redis_timeout="100ms"):
    """Satu server api-t3 dengan cache katalog. Jam cache dibekukan (-jam-lab) hanya untuk cache memori."""
    a = ["-katalog-cache", cache]
    if cache == "memori":
        a += ["-jam-lab"]
    if cache == "redis":
        a += ["-katalog-redis", f"127.0.0.1:{REDIS_PORT}", "-katalog-redis-timeout", redis_timeout]
    if ttl:
        a += ["-katalog-ttl", ttl]
    if hapus:
        a += ["-katalog-hapus", hapus]
    if gerbang:
        a += ["-lab-gerbang", gerbang]
    d.mulai_api([*a, *args], port=port, db=DB)


def henti_semua():
    for port in (PORT, PORT_KEDUA):
        d.stop(port)


def jam(port, ms):
    s, _ = curl("POST", "/lab/jam", {"ms": ms}, port=port, tampil=False)
    harap(s, 204, f"jam instance {port}")


NAMA = {PORT: "A", PORT_KEDUA: "B"}


def stat(port):
    s, isi = curl("GET", "/lab/cache", port=port, tampil=False)
    harap(s, 200, "GET /lab/cache")
    return j(isi)


def cetak_stat(port, ket=""):
    s = stat(port)
    catat(f"instance {NAMA[port]}: hit {s['hit']}, miss {s['miss']}, baca database {s['db_baca']}, "
          f"kunci dihapus {s['hapus']}, galat cache {s['galat_cache']}" + (f"   # {ket}" if ket else ""))
    return s


def menu(token, port, warung, produk):
    s, isi = curl("GET", f"/katalog?warung={warung}", token=token, tampil=False, port=port)
    harap(s, 200, f"GET /katalog?warung={warung} di instance {NAMA.get(port, port)}")
    cari = [m for m in j(isi)["warung"][0]["menu"] if m["id"] == produk]
    harap(len(cari), 1, "produk ada di menu")
    return cari[0]


def baca(siapa, token, port, warung, produk, ingin=None, ket=""):
    """GET katalog satu warung; mencatat item yang dibaca. `ingin`: harga_efektif yang harus muncul."""
    m = menu(token, port, warung, produk)
    catat(f"{siapa:<5} lewat instance {NAMA[port]}: GET /katalog?warung={warung} -> "
          + json.dumps({k: m[k] for k in ("nama", "harga", "harga_efektif", "stok", "versi")}, ensure_ascii=False, separators=(",", ":"))
          + (f"   # {ket}" if ket else ""))
    if ingin is not None:
        harap(m["harga_efektif"], ingin, f"{siapa}: harga_efektif")
    return m


def efektif_db(produk, kota=1):
    sql(f"SELECT p.id AS produk, p.harga, p.harga * (100 - coalesce((SELECT max(potongan_persen) FROM promo"
        f" WHERE kota_id = {kota} AND mulai <= now() AND selesai > now()), 0)) / 100 AS harga_efektif_db, p.stok, p.versi"
        f" FROM produk p WHERE p.id = {produk}")


def promo(token, port, mulai_detik=-60, persen=10, ket=None):
    """HR membuat promo; `mulai_detik` dari sekarang (negatif = sudah berlaku)."""
    sekarang = datetime.datetime.now(datetime.timezone.utc)
    f = lambda t: t.strftime("%Y-%m-%dT%H:%M:%SZ")
    mulai = sekarang + datetime.timedelta(seconds=mulai_detik)
    s, isi = curl("POST", "/promo", {"judul": "Promo makan siang", "potongan_persen": persen, "mulai": f(mulai),
                                     "selesai": f(sekarang + datetime.timedelta(hours=1))}, token, port=port, tampil=False)
    harap(s, 201, "buat promo")
    catat(f"HR Jakarta lewat instance {NAMA[port]}: POST /promo potongan {persen}%, mulai "
          + ("1 menit lalu (sudah berlaku)" if mulai_detik < 0 else f"{mulai_detik} detik lagi") + " -> 201")
    return mulai


def serentak(kerja):
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
            gagal("thread tidak selesai dalam 60 detik")


def lepas(port, nama):
    s, _ = curl("POST", "/lab/gerbang/lepas", {"nama": nama}, port=port, tampil=False)
    harap(s, 204, f"lepas gerbang {nama}")


def kunci_ada(kunci):
    return bool(r_redis().exists(kunci))


def sisa_ttl_ms(kunci):
    return r_redis().pttl(kunci)


def tidak_lebih_dari_ttl(kunci, batas_ms, ket):
    """Kunci hidup dan sisa TTL paling banyak `batas_ms`: TTL terpasang. Angkanya bergantung waktu, jadi hanya batasnya."""
    p = sisa_ttl_ms(kunci)
    harap(0 < p <= batas_ms, True, f"PTTL {kunci} {p} ms harus antara 1 dan {batas_ms}")
    catat(f"redis PTTL {kunci}: paling banyak {batas_ms:,} ms ({ket})".replace(",", "."))


def redis_stop():
    """Hentikan Redis milik proyek compose lajur ini. Port compose harus sama dengan REDIS_PORT: lab tidak
    menghentikan Redis lajur lain."""
    r = subprocess.run(["docker", "compose", "-f", str(COMPOSE_REDIS), "port", "redis", "6379"], env=d.ENV,
                       capture_output=True, text=True)
    harap(r.stdout.strip(), f"127.0.0.1:{REDIS_PORT}", "port Redis proyek compose ini")
    subprocess.run(["docker", "compose", "-f", str(COMPOSE_REDIS), "stop", "redis"], env=d.ENV, check=True, capture_output=True)


def redis_nyala():
    subprocess.run(["docker", "compose", "-f", str(COMPOSE_REDIS), "up", "-d", "--wait", "redis"], env=d.ENV, check=True,
                   capture_output=True)
    d.tunggu(lambda: _ping(), "Redis menjawab PING", batas=30)


def _ping():
    try:
        return r_redis(2).ping()
    except redis.RedisError:
        return False


# ---------- memori.txt ----------

def rekam_memori():
    siapkan()
    nasi = id_produk(ANI, "Nasi goreng")
    base = int(time.time() * 1000)
    catat(f"# instance A (127.0.0.1:{d.DASAR}) dan instance B (127.0.0.1:{d.DASAR_KEDUA}): dua proses api-t3 yang sama, satu PostgreSQL,")
    catat("# masing-masing dengan cache katalog di memori prosesnya: ./api-t3 -katalog-cache memori -jam-lab (TTL 300 detik)")
    catat("# jam cache digerakkan lewat POST /lab/jam, bukan menunggu 5 menit sungguhan")
    for port in (PORT, PORT_KEDUA):
        mulai_instance(port, cache="memori")
        jam(port, base)
    budi = login("budi@lestari.example", label="Budi")
    citra = login("citra@lestari.example", label="Citra")
    hr = login("hr.jakarta@lestari.example", label="HR Jakarta")

    bagian("A. Dua meja di warung yang sama, dua instance: tiap proses mengisi cache-nya sendiri")
    baca("Budi", budi, PORT, ANI, nasi, 25000)
    baca("Citra", citra, PORT_KEDUA, ANI, nasi, 25000)
    baca("Budi", budi, PORT, ANI, nasi, 25000, "hit")
    baca("Citra", citra, PORT_KEDUA, ANI, nasi, 25000, "hit")
    a, b = cetak_stat(PORT), cetak_stat(PORT_KEDUA)
    harap((a["db_baca"], b["db_baca"], a["hit"], b["hit"]), (1, 1, 1, 1), "satu baca database per instance")
    catat("# empat bacaan, dua baca database: isi yang sama dibaca dua kali karena cache tidak dipakai bersama")

    bagian("B. HR menyalakan promo lewat instance A: hanya A yang membuang entrinya")
    promo(hr, PORT)
    cetak_stat(PORT, "entri katalog:1:418 dibuang")
    cetak_stat(PORT_KEDUA, "tidak ada yang memberi tahu B")
    harap((stat(PORT)["hapus"], stat(PORT_KEDUA)["hapus"]), (1, 0), "hanya A membuang entri")
    baca("Budi", budi, PORT, ANI, nasi, 22500, "miss, dari database")
    baca("Citra", citra, PORT_KEDUA, ANI, nasi, 25000, "hit: harga lama, di meja yang sama")
    efektif_db(nasi)
    catat("# Dua harga di satu meja: Budi Rp22.500, Citra Rp25.000. Database menyebut Rp22.500.")

    bagian("C. Harga yang ditagih tetap dari database: Citra memesan sambil melihat Rp25.000")
    s, isi = curl("POST", "/pesanan", {"produk_id": nasi, "porsi": 1}, citra, port=PORT_KEDUA)
    harap((s, j(isi)["harga_satuan"], j(isi)["nominal"], j(isi)["potongan_persen"], j(isi)["stok_sisa"]), (201, 22500, 22500, 10, 49), "pesanan")
    baca("Citra", citra, PORT_KEDUA, ANI, nasi, 25000, "masih hit: harga dan stok 50 sudah lama")
    efektif_db(nasi)
    catat("# Pesanan tidak membaca cache: Rp22.500 ditagih. Stok di cache B (50) juga stale; Pesan memeriksa stok di database.")

    bagian("D. TTL 300 detik membatasi, tidak menyembuhkan: B baru memperbarui sesudah entrinya habis")
    jam(PORT_KEDUA, base + 299_000)
    baca("Citra", citra, PORT_KEDUA, ANI, nasi, 25000, "detik ke-299: masih entri lama")
    jam(PORT_KEDUA, base + 300_000)
    baca("Citra", citra, PORT_KEDUA, ANI, nasi, 22500, "detik ke-300: entri habis, dibaca dari database")
    cetak_stat(PORT_KEDUA)
    catat("# Entri stale paling lama sebesar TTL, dihitung sejak entri diisi. Entri yang diisi sesaat sebelum promo dibuat")
    catat("# bertahan hampir 300 detik sesudahnya di instance yang tidak menerima perubahan.")
    tulis("memori.txt", "M23: cache katalog di memori proses dua instance")


# ---------- redis.txt ----------

def rekam_redis():
    siapkan()
    nasi = id_produk(ANI, "Nasi goreng")
    redis_kosongkan()
    catat(f"# Redis {redis_versi()} (container lokal); instance A (127.0.0.1:{d.DASAR}) dan B (127.0.0.1:{d.DASAR_KEDUA})")
    catat(f"# ./api-t3 -katalog-cache redis -katalog-ttl {TTL_REDIS}: cache-aside, entri disimpan sebagai JSON, kunci katalog:<kota>:<warung|semua>")
    catat("# client Redis lab: RESP2 sendiri (GET, SET PX, DEL, SCAN), satu koneksi per perintah, batas 100 ms per perintah")
    mulai_instance(PORT, ttl=TTL_REDIS)      # hanya untuk login; sesi ada di database, jadi token berlaku di semua instance
    budi = login("budi@lestari.example", label="Budi")
    citra = login("citra@lestari.example", label="Citra")
    ani = login("warung.ani@lestari.example", label="Warung Ani")
    hr = login("hr.jakarta@lestari.example", label="HR Jakarta")
    d.stop(PORT)
    kunci = f"katalog:1:{ANI}"

    def dua(**kw):
        for port in (PORT, PORT_KEDUA):
            mulai_instance(port, **kw)

    bagian("A. Satu Redis untuk dua instance: isi sekali, dibaca dua instance")
    dua(ttl=TTL_REDIS)
    baca("Budi", budi, PORT, ANI, nasi, 25000, "miss, dari database")
    baca("Citra", citra, PORT_KEDUA, ANI, nasi, 25000, "hit: entri yang diisi A")
    a, b = cetak_stat(PORT), cetak_stat(PORT_KEDUA)
    harap((a["db_baca"], b["db_baca"], b["hit"], a["galat_cache"], b["galat_cache"]), (1, 0, 1, 0, 0), "satu baca database untuk dua instance")
    tidak_lebih_dari_ttl(kunci, 60_000, "TTL 60 detik terpasang")
    isi_cache = json.loads(r_redis().get(kunci))
    harap((len(isi_cache), len(isi_cache[0]["menu"])), (1, 40), "isi entri Redis")
    catat(f"redis GET {kunci}: JSON, {len(isi_cache)} warung, {len(isi_cache[0]['menu'])} item")

    bagian("B. Ubah harga: tulis database, COMMIT, baru hapus kunci; kedua instance langsung melihat harga baru")
    s, isi = curl("PATCH", f"/produk/{nasi}", {"harga": 28000, "versi": 1}, ani, port=PORT, tampil=False)
    harap((s, j(isi)["harga"], j(isi)["versi"]), (200, 28000, 2), "Ani mengubah harga lewat A")
    catat("Ani lewat instance A: PATCH /produk/<Nasi goreng> harga 28000, versi 1 -> 200")
    harap(kunci_ada(kunci), False, "kunci dihapus")
    catat(f"redis EXISTS {kunci}: 0 (dihapus sesudah COMMIT)")
    baca("Citra", citra, PORT_KEDUA, ANI, nasi, 28000, "instance lain, harga baru langsung")
    baca("Budi", budi, PORT, ANI, nasi, 28000, "hit")
    efektif_db(nasi)

    bagian("C. Promo lewat instance A: semua entri kota dibuang, M23 tidak terjadi")
    pulihkan_produk(nasi)
    redis_kosongkan()
    baca("Budi", budi, PORT, ANI, nasi, 25000)
    baca("Citra", citra, PORT_KEDUA, ANI, nasi, 25000, "hit")
    promo(hr, PORT)
    harap(kunci_ada(kunci), False, "entri kota dibuang")
    catat(f"redis EXISTS {kunci}: 0 (SCAN katalog:1:* lalu DEL)")
    baca("Citra", citra, PORT_KEDUA, ANI, nasi, 22500, "instance B melihat harga promo sekarang juga")
    baca("Budi", budi, PORT, ANI, nasi, 22500, "hit")
    efektif_db(nasi)
    henti_semua()

    bagian("D. Urutan salah: hapus kunci SEBELUM COMMIT meninggalkan harga lama sampai TTL")
    pulihkan_produk(nasi)
    redis_kosongkan()
    catat("# instance A: -katalog-hapus sebelum -lab-gerbang commit (penulis tertahan sesudah UPDATE, sebelum COMMIT)")
    mulai_instance(PORT, ttl=TTL_REDIS, hapus="sebelum", gerbang="commit")
    mulai_instance(PORT_KEDUA, ttl=TTL_REDIS)
    baca("Citra", citra, PORT_KEDUA, ANI, nasi, 25000, "miss, entri diisi")
    hasil, th = serentak([lambda: curl("PATCH", f"/produk/{nasi}", {"harga": 28000, "versi": 1}, ani, port=PORT, tampil=False)])
    d.tunggu(lambda: stat(PORT)["tertahan_commit"] == 1, "PATCH tertahan sebelum COMMIT")
    catat("Ani lewat instance A: PATCH harga 28000, versi 1 -> UPDATE jalan, kunci sudah dihapus, COMMIT belum")
    harap(kunci_ada(kunci), False, "kunci dihapus sebelum COMMIT")
    catat(f"redis EXISTS {kunci}: 0")
    baca("Budi", budi, PORT_KEDUA, ANI, nasi, 25000, "miss: database belum melihat 28000, entri lama diisi lagi")
    lepas(PORT, "commit")
    tunggu_semua(th)
    harap((hasil[0][0], j(hasil[0][1])["harga"]), (200, 28000), "PATCH selesai")
    catat("instance A: COMMIT selesai, PATCH -> 200 harga 28000")
    baca("Citra", citra, PORT_KEDUA, ANI, nasi, 25000, "hit: harga lama, tidak ada yang menghapusnya lagi")
    efektif_db(nasi)
    tidak_lebih_dari_ttl(kunci, 60_000, "yang menutupnya hanya TTL")
    henti_semua()

    bagian("E. Urutan benar: hapus kunci SESUDAH COMMIT; di celah sebelum COMMIT harga lama memang masih benar")
    pulihkan_produk(nasi)
    redis_kosongkan()
    catat("# instance A: -katalog-hapus sesudah -lab-gerbang commit")
    mulai_instance(PORT, ttl=TTL_REDIS, gerbang="commit")
    mulai_instance(PORT_KEDUA, ttl=TTL_REDIS)
    baca("Citra", citra, PORT_KEDUA, ANI, nasi, 25000, "miss, entri diisi")
    hasil, th = serentak([lambda: curl("PATCH", f"/produk/{nasi}", {"harga": 28000, "versi": 1}, ani, port=PORT, tampil=False)])
    d.tunggu(lambda: stat(PORT)["tertahan_commit"] == 1, "PATCH tertahan sebelum COMMIT")
    catat("Ani lewat instance A: PATCH harga 28000, versi 1 -> UPDATE jalan, COMMIT belum, kunci belum dihapus")
    harap(kunci_ada(kunci), True, "kunci belum dihapus")
    baca("Budi", budi, PORT_KEDUA, ANI, nasi, 25000, "hit: sebelum COMMIT, 25000 masih harga yang berlaku")
    lepas(PORT, "commit")
    tunggu_semua(th)
    harap(hasil[0][0], 200, "PATCH selesai")
    harap(kunci_ada(kunci), False, "kunci dihapus sesudah COMMIT")
    catat(f"instance A: COMMIT selesai, lalu kunci dihapus; redis EXISTS {kunci}: 0")
    baca("Citra", citra, PORT_KEDUA, ANI, nasi, 28000, "miss: harga baru")
    efektif_db(nasi)
    henti_semua()

    bagian("F. Celah yang tersisa: pembaca lambat mengisi cache SESUDAH tulis dan hapus kunci selesai")
    pulihkan_produk(nasi)
    redis_kosongkan()
    catat("# instance B: -lab-gerbang isi (pembaca tertahan sesudah baca database, sebelum simpan ke Redis)")
    mulai_instance(PORT, ttl=TTL_REDIS)
    mulai_instance(PORT_KEDUA, ttl=TTL_REDIS, gerbang="isi")
    hasil, th = serentak([lambda: curl("GET", f"/katalog?warung={ANI}", token=citra, port=PORT_KEDUA, tampil=False)])
    d.tunggu(lambda: stat(PORT_KEDUA)["tertahan_isi"] == 1, "pembaca tertahan sebelum simpan")
    catat("Citra lewat instance B: GET /katalog?warung=418 -> miss, database dibaca (Rp25.000), belum disimpan ke Redis")
    s, isi = curl("PATCH", f"/produk/{nasi}", {"harga": 28000, "versi": 1}, ani, port=PORT, tampil=False)
    harap((s, j(isi)["harga"]), (200, 28000), "PATCH sesudah COMMIT")
    catat("Ani lewat instance A: PATCH harga 28000, versi 1 -> 200, COMMIT selesai, DEL kunci (belum ada isinya)")
    lepas(PORT_KEDUA, "isi")
    tunggu_semua(th)
    harap(hasil[0][0], 200, "pembaca selesai")
    catat("instance B: pembaca melanjutkan dan menyimpan hasil bacaannya (Rp25.000) ke Redis")
    baca("Budi", budi, PORT, ANI, nasi, 25000, "hit: harga lama padahal tulis sudah selesai dan kunci sudah dihapus")
    efektif_db(nasi)
    tidak_lebih_dari_ttl(kunci, 60_000, "hapus sesudah COMMIT tidak menutup celah ini; TTL membatasinya")
    henti_semua()

    bagian("G. Promo yang mulai nanti: tidak ada tulis saat mulai, jadi tidak ada yang menghapus kunci")
    pulihkan_produk(nasi)
    redis_kosongkan()
    catat("# TTL 6 detik di bagian ini (ADR 28: 60 detik), supaya habisnya entri bisa direkam tanpa menunggu semenit")
    dua(ttl="6s")
    mulai = promo(hr, PORT, mulai_detik=3)
    baca("Citra", citra, PORT_KEDUA, ANI, nasi, 25000, "miss: promo belum mulai, entri diisi tanpa potongan")
    d.tunggu(lambda: satu(f"SELECT now() >= '{mulai.strftime('%Y-%m-%d %H:%M:%S+00')}'::timestamptz") is True, "promo mulai", batas=10)
    catat("# jam database lewat waktu mulai promo")
    harap(kunci_ada(kunci), True, "entri masih hidup")
    harap(cetak_stat(PORT, "tidak ada kunci dihapus: tidak ada tulis saat promo mulai")["hapus"], 0, "tidak ada yang menghapus kunci")
    baca("Citra", citra, PORT_KEDUA, ANI, nasi, 25000, "hit: promo sudah berlaku di database, entri lama masih dipakai")
    efektif_db(nasi)
    s, isi = curl("POST", "/pesanan", {"produk_id": nasi, "porsi": 1}, budi, port=PORT, tampil=False)
    harap((s, j(isi)["harga_satuan"], j(isi)["potongan_persen"]), (201, 22500, 10), "pesanan dengan promo")
    catat("Budi lewat instance A: POST /pesanan -> 201, harga_satuan 22500 (promo 10% dari database)")
    d.tunggu(lambda: not kunci_ada(kunci), "entri habis (TTL 6 detik)", batas=15)
    baca("Citra", citra, PORT_KEDUA, ANI, nasi, 22500, "miss: entri habis, harga promo terbaca")
    catat("# Yang membatasi hanya TTL. Tidak dijalankan: memendekkan TTL entri sampai waktu mulai promo berikutnya.")
    tulis("redis.txt", "cache-aside di Redis: urutan hapus kunci, celah yang tersisa, promo yang mulai nanti")


# ---------- gagal.txt ----------

def rekam_gagal():
    siapkan()
    nasi = id_produk(ANI, "Nasi goreng")
    redis_kosongkan()
    catat(f"# Redis {redis_versi()}; ./api-t3 -katalog-cache redis -katalog-redis-timeout 100ms di instance A (127.0.0.1:{d.DASAR})")
    catat("# jalur baca: Redis galat atau lambat -> dibaca dari database, tanpa menyimpan; jalur tulis: hapus kunci yang gagal dihitung")
    mulai_instance(PORT, ttl=TTL_REDIS)
    budi = login("budi@lestari.example", label="Budi")
    ani = login("warung.ani@lestari.example", label="Warung Ani")
    kunci = f"katalog:1:{ANI}"

    bagian("A. Redis menggantung (CLIENT PAUSE 3 detik): tiap bacaan menunggu batas 100 ms lalu jatuh ke database")
    baca("Budi", budi, PORT, ANI, nasi, 25000, "miss, entri diisi")
    cetak_stat(PORT)
    mulai_instance(PORT_KEDUA, ttl=TTL_REDIS, redis_timeout="5s")
    r_redis().execute_command("CLIENT", "PAUSE", 3000, "ALL")
    catat("redis CLIENT PAUSE 3000 ALL: Redis menerima koneksi tetapi tidak menjawab")
    for i in range(5):
        s, _ = curl("GET", f"/katalog?warung={ANI}", token=budi, port=PORT, tampil=False)
        harap(s, 200, "katalog saat Redis menggantung")
    catat("Budi lewat instance A: 5 kali GET /katalog?warung=418 -> 200 semuanya")
    st = cetak_stat(PORT, "lima bacaan: lima baca database, lima galat cache, tidak ada hit")
    harap((st["hit"], st["miss"], st["db_baca"], st["galat_cache"]), (0, 1, 6, 5), "bacaan saat Redis menggantung")
    t0 = time.time()
    s, _ = curl("GET", f"/katalog?warung={ANI}", token=budi, port=PORT_KEDUA, tampil=False)
    lama = time.time() - t0
    harap((s, lama > 1.5), (200, True), "instance B dengan batas 5 detik menunggu PAUSE")
    catat("Budi lewat instance B (-katalog-redis-timeout 5s, sama dengan waktu bawaan go-redis): satu GET /katalog?warung=418 -> 200,")
    catat("# tetapi menunggu lebih dari 1,5 detik sampai PAUSE selesai; batas waktu itulah yang membuat jatuh ke database cepat")
    d.stop(PORT_KEDUA)
    d.tunggu(lambda: _ping(), "PAUSE selesai", batas=30)
    baca("Budi", budi, PORT, ANI, nasi, 25000, "Redis menjawab lagi, entri lama masih ada: hit")
    harap(cetak_stat(PORT)["hit"], 1, "hit sesudah PAUSE")

    bagian("B. Redis mati: semua bacaan ke database; 50 bacaan serentak, pool tetap 10")
    redis_stop()
    catat("docker compose stop redis: Redis mati")
    d.tunggu(lambda: not _ping(), "Redis mati", batas=15)
    puncak = {"maks": 0, "henti": False}

    def pantau():
        while not puncak["henti"]:
            puncak["maks"] = max(puncak["maks"], int(satu("SELECT count(*) FROM pg_stat_activity WHERE application_name = 'api-t3'")))
            time.sleep(0.005)
    pemantau = threading.Thread(target=pantau)
    pemantau.start()
    hasil, th = serentak([(lambda: curl("GET", f"/katalog?warung={ANI}", token=budi, port=PORT, tampil=False)[0])
                          for _ in range(50)])
    tunggu_semua(th)
    puncak["henti"] = True
    pemantau.join()
    harap(sorted(set(hasil)), [200], "status 50 bacaan serentak")
    catat("Budi lewat instance A: 50 GET /katalog?warung=418 serentak -> 200 semuanya")
    st = cetak_stat(PORT)
    harap((st["db_baca"], st["galat_cache"]), (56, 55), "tiap bacaan membaca database")
    s, isi = curl("GET", "/lab/pool", port=PORT, tampil=False)
    pool = j(isi)
    harap((pool["maks"], pool["terbuka"] <= pool["maks"]), (10, True), "pool")
    catat(f"/lab/pool: maks {pool['maks']}, koneksi terbuka paling banyak {pool['maks']} (dijaga SetMaxOpenConns)")
    harap(puncak["maks"] <= 10, True, "koneksi api-t3 di PostgreSQL selama beban")
    catat("pg_stat_activity, application_name api-t3, dicuplik tiap 5 ms selama 50 bacaan: paling banyak 10 koneksi")
    catat("# 50 bacaan, 50 baca database: dengan cache hidup hanya 1. Lab tidak mengukur apakah ada bacaan yang mengantre di pool.")

    bagian("C. Redis mati saat Ani mengubah harga: hapus kunci gagal, entri lama selamat")
    redis_nyala()
    pulihkan_produk(nasi)
    redis_kosongkan()
    d.stop(PORT)
    mulai_instance(PORT, ttl=TTL_REDIS)
    baca("Budi", budi, PORT, ANI, nasi, 25000, "miss, entri diisi")
    harap(r_redis().save(), True, "SAVE manual: entri tertulis ke disk Redis")
    catat("redis SAVE: snapshot ditulis ke dump.rdb di container (R3-68)")
    redis_stop()
    catat("docker compose stop redis: Redis mati")
    s, isi = curl("PATCH", f"/produk/{nasi}", {"harga": 28000, "versi": 1}, ani, port=PORT, tampil=False)
    harap((s, j(isi)["harga"]), (200, 28000), "PATCH saat Redis mati")
    catat("Ani lewat instance A: PATCH harga 28000, versi 1 -> 200 (database COMMIT; Redis tidak menjawab)")
    st = cetak_stat(PORT, "dua DEL (kunci kota dan warung) gagal")
    harap(st["galat_cache"] >= 2, True, "hapus kunci gagal dicatat sebagai galat cache")
    redis_nyala()
    catat("docker compose up redis: Redis hidup lagi")
    harap(kunci_ada(kunci), True, "entri lama kembali bersama Redis (RDB dimuat saat start)")
    catat(f"redis EXISTS {kunci}: 1 (Redis memuat dump.rdb saat start; entri dari SAVE kembali)")
    baca("Budi", budi, PORT, ANI, nasi, 25000, "hit: entri lama kembali, harga lama padahal database 28000")
    efektif_db(nasi)
    tidak_lebih_dari_ttl(kunci, 60_000, "hapus kunci tidak diulang oleh siapa pun; TTL yang menutupnya")
    d.stop(PORT)

    bagian("D. Galat tulis jangan jadi alasan menghapus cache (versi kecil dari kasus Facebook 2010, R3-25): 5 PATCH gagal")
    redis_kosongkan()
    pulihkan_produk(nasi)
    sql("REVOKE UPDATE ON produk FROM api_t3", tampil=False)
    catat("=> REVOKE UPDATE ON produk FROM api_t3   -- UPDATE ditolak database: galat backend yang pasti terjadi (permission denied)")
    for urut, ket in (("sesudah", "benar: hapus kunci hanya bila tulis berhasil"), ("selalu", "rentan: hapus kunci juga saat tulis gagal")):
        d.stop(PORT)
        redis_kosongkan()
        mulai_instance(PORT, ttl=TTL_REDIS, hapus=urut)
        catat(f"# -katalog-hapus {urut} ({ket})")
        baca("Budi", budi, PORT, ANI, nasi, 25000, "miss, entri diisi")
        for i in range(5):
            s, _ = curl("PATCH", f"/produk/{nasi}", {"harga": 28000, "versi": 1}, ani, port=PORT, tampil=False)
            harap(s, 500, "PATCH ditolak database")
            s, _ = curl("GET", f"/katalog?warung={ANI}", token=budi, port=PORT, tampil=False)
            harap(s, 200, "bacaan sesudah PATCH gagal")
        catat("Ani: 5 kali PATCH -> 500; sesudah tiap PATCH Budi membaca katalog -> 200")
        st = cetak_stat(PORT)
        harap((st["db_baca"], st["miss"]), (1, 1) if urut == "sesudah" else (6, 6), f"baca database, urutan {urut}")
    sql("GRANT UPDATE ON produk TO api_t3", tampil=False)
    catat("=> GRANT UPDATE ON produk TO api_t3")
    catat("# Dengan hapus kunci selalu, tiap galat tulis mengubah bacaan berikutnya menjadi baca database. Pada beban nyata,")
    catat("# client yang mengulang tulis yang gagal membuat database yang sedang bermasalah menerima semua bacaan juga.")
    d.stop(PORT)

    bagian("E. Galat baca database: entri yang hidup tetap melayani, kunci yang kosong tidak diisi galat")
    redis_kosongkan()
    sari_menu = f"katalog:1:{SARI}"
    mulai_instance(PORT, ttl=TTL_REDIS)
    baca("Budi", budi, PORT, ANI, nasi, 25000, "miss, entri Warung Ani diisi")
    sql("REVOKE SELECT ON produk FROM api_t3", tampil=False)
    catat("=> REVOKE SELECT ON produk FROM api_t3   -- database tidak bisa dibaca")
    baca("Budi", budi, PORT, ANI, nasi, 25000, "hit: katalog warung ini dilayani cache walau produk tidak bisa dibaca")
    s, _ = curl("GET", f"/katalog?warung={SARI}", token=budi, port=PORT, tampil=False)
    harap(s, 500, "bacaan yang miss saat database tidak bisa dibaca")
    catat("Budi lewat instance A: GET /katalog?warung=502 -> 500 (miss, database menolak)")
    harap(kunci_ada(sari_menu), False, "galat tidak disimpan")
    harap(kunci_ada(kunci), True, "entri lama tidak dibuang")
    catat(f"redis EXISTS {sari_menu}: 0 (galat tidak disimpan), EXISTS {kunci}: 1 (entri lama tidak dibuang)")
    sql("GRANT SELECT ON produk TO api_t3", tampil=False)
    catat("=> GRANT SELECT ON produk TO api_t3")
    s, _ = curl("GET", f"/katalog?warung={SARI}", token=budi, port=PORT, tampil=False)
    harap(s, 200, "bacaan sesudah database pulih")
    catat("Budi lewat instance A: GET /katalog?warung=502 -> 200 (tidak ada galat yang tertinggal di cache)")
    tulis("gagal.txt", "kegagalan: Redis menggantung, Redis mati, hapus kunci yang gagal, galat database")


# ---------- beban.txt ----------

LAMBDA = 5.21        # baca katalog per detik di puncak (R3-37, Asumsi)
JUMLAH = 52          # 4 putaran atas 13 kunci: 1 kota + 12 warung di Jakarta


def hujan(token, port):
    """52 bacaan, 5,21 per detik, bergilir atas 13 kunci katalog Jakarta. Mengembalikan detik yang terpakai."""
    warung = sorted(r[0] for r in sql("SELECT id FROM akun WHERE jenis = 'warung' AND kota_id = 1", tampil=False))
    harap(len(warung), 12, "12 warung di Jakarta")
    jalur = [None] + warung
    mulai = time.time()
    for i in range(JUMLAH):
        target = mulai + i / LAMBDA
        time.sleep(max(0, target - time.time()))
        w = jalur[i % len(jalur)]
        s, _ = curl("GET", "/katalog" + (f"?warung={w}" if w else ""), token=token, port=port, tampil=False)
        harap(s, 200, "bacaan katalog")
    return time.time() - mulai


def rekam_beban():
    siapkan()
    redis_kosongkan()
    mulai_instance(PORT, cache="tanpa")
    budi = login("budi@lestari.example", label="Budi")
    d.stop(PORT)
    catat(f"# Redis {redis_versi()}; beban: {JUMLAH} bacaan katalog Jakarta, 5,21 per detik (R3-37, Asumsi), bergilir atas 13 kunci")
    catat("# (satu kunci untuk seluruh kota, dua belas untuk tiap warung); satu pengguna, satu instance")

    bagian("A. Ukuran katalog dari rekaman")
    mulai_instance(PORT, cache="tanpa")
    s, isi = curl("GET", "/katalog", token=budi, port=PORT, tampil=False)
    harap(s, 200, "katalog kota")
    kat = j(isi)
    item = sum(len(w["menu"]) for w in kat["warung"])
    harap((len(kat["warung"]), item), (12, 480), "12 warung, 480 item")
    per_item = round(len(isi) / item)
    catat(f"GET /katalog (Jakarta): {len(kat['warung'])} warung, {item} item, {len(isi)} byte = {per_item} byte per item")
    s, isi1 = curl("GET", f"/katalog?warung={ANI}", token=budi, port=PORT, tampil=False)
    catat(f"GET /katalog?warung={ANI}: 40 item, {len(isi1)} byte")
    ukuran_kota, item_kota = [], 0
    for kota in range(1, 7):
        s, isi_k = curl("GET", f"/katalog?kota={kota}", token=budi, port=PORT, tampil=False)
        harap(s, 200, f"katalog kota {kota}")
        ukuran_kota.append(len(isi_k))
        item_kota += sum(len(w["menu"]) for w in j(isi_k)["warung"])
    harap((len(ukuran_kota), item_kota), (6, 2400), "enam kota, 2.400 item")
    total = sum(ukuran_kota)
    catat("GET /katalog?kota=1 sampai 6: 2.400 item, %s byte = %d KB (diukur dari enam jawaban); R3-37 menulis 720 KB (300 byte per item, Asumsi)"
          % (f"{total:,}".replace(",", "."), round(total / 1000)))
    catat("# Selisih: R3-37 memakai 300 byte per item sebagai tebakan; JSON katalog lab hanya enam field pendek. Angka lab dipakai.")
    d.stop(PORT)

    bagian("B. Tanpa cache: tiap bacaan membaca database")
    mulai_instance(PORT, cache="tanpa")
    detik = hujan(budi, PORT)
    st = stat(PORT)
    catat(f"{JUMLAH} bacaan -> baca database {st['db_baca']}, hit {st['hit']}")
    harap((st["db_baca"], st["hit"]), (JUMLAH, 0), "tanpa cache: semua ke database")
    pakai = st["db_ms"] / 1000 / detik
    w_rata = st["db_ms"] / st["db_baca"]
    print(f"(console, tidak masuk rekaman) W rata-rata {w_rata:.2f} ms, L = db_ms / lama = {pakai:.4f}")
    harap(w_rata < 20, True, f"W per baca database {w_rata:.1f} ms harus di bawah 20 ms")
    harap(pakai < 0.1, True, f"koneksi rata-rata terpakai {pakai:.3f} harus di bawah 0,1")
    catat("W (waktu satu baca katalog di database, termasuk JSON) terukur di bawah 20 ms")
    catat("L rata-rata (jumlah waktu baca database dibagi lama beban) terukur di bawah 0,1 koneksi dari pool 10")
    catat("# Naskah dan R3-37: W = 5 ms (Asumsi), L = 5,21 x 0,005 = 0,026. Rekaman memeriksa batas, bukan angkanya: angka bergantung mesin.")
    d.stop(PORT)

    bagian("C. Cache di Redis, TTL 60 detik: sama beban, 13 baca database")
    redis_kosongkan()
    mulai_instance(PORT, ttl=TTL_REDIS)
    detik = hujan(budi, PORT)
    st = stat(PORT)
    catat(f"{JUMLAH} bacaan -> baca database {st['db_baca']}, hit {st['hit']}, galat cache {st['galat_cache']}")
    harap((st["db_baca"], st["hit"], st["galat_cache"]), (13, JUMLAH - 13, 0), "dengan cache: satu baca per kunci")
    catat(f"# {JUMLAH - st['db_baca']} dari {JUMLAH} baca database dihemat. Tanpa cache, beban ini juga tidak menekan database (B).")
    catat("# Cache katalog tidak diperlukan oleh beban; alasannya M23 dan kesempatan memakai Redis yang sudah ada untuk rate limit.")
    d.stop(PORT)
    tulis("beban.txt", "beban katalog 5,21 baca per detik: tanpa cache lawan cache, ukuran katalog")


BAGIAN = {"memori": rekam_memori, "redis": rekam_redis, "gagal": rekam_gagal, "beban": rekam_beban}


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
        try:                          # bagian gagal bisa berhenti saat Redis mati: hidupkan lagi
            r_redis(2).ping()
        except redis.RedisError:
            subprocess.run(["docker", "compose", "-f", str(COMPOSE_REDIS), "up", "-d", "--wait", "redis"], env=d.ENV)


if __name__ == "__main__":
    main()
