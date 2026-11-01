"""Rekam lab t5-fanout (Tahap 5): Kafka KRaft satu broker, relay outbox, consumer group, dan penyedia push tiruan dengan kuota.

Server (api-t5), skema, dan data awal adalah milik `labs/api-t5` (`dasar_t5.py`), bukan salinan. Yang baru di lab ini:
bendera `-event-pembayaran` di api-t5 (satu baris outbox `stream` per pembayaran), paket `internal/stream` (relay ke Kafka,
consumer group, pengirim dengan backoff dan jitter), `cmd/stream`, penyedia push tiruan berkuota `cmd/pushkuota`,
`docker-compose.yml` (apache/kafka), dan rekaman ini. Setiap bagian membuat ulang schema, Kafka, dan topik dari nol, jadi
output/*.txt tidak bergantung pada urutan bagian dan rekaman ulang identik per byte (make cek). Waktu, id, dan angka yang
bergantung mesin (lama, jumlah 429, umur) tidak direkam sebagai nilai: yang direkam hitungan baris, status, urutan, dan
batas yang diperiksa ("ya" bila batas terpenuhi). Pihak ketiga (penyedia push) adalah tiruan lokal. Lab gagal keras bila
hasilnya meleset dari yang diharapkan.

    make -C labs/t5-fanout run                    (butuh: Docker, Go; PostgreSQL lewat labs/b3-race)
    make -C labs/t5-fanout run BAGIAN=kuota       (satu bagian: aliran grup kuota antrean pengirim testing)
"""
import hashlib, json, math, os, pathlib, re, secrets, subprocess, sys, tempfile, threading, time
from decimal import Decimal, ROUND_HALF_UP

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "api-t5"))
import dasar_t5 as d  # noqa: E402
from dasar_t5 import bagian, catat, curl, gagal, harap, j  # noqa: E402
from lab_env import PROYEK, port_lab  # noqa: E402

LAB = "t5-fanout"
NAMA_PROYEK = f"{PROYEK}-{LAB}" if PROYEK else LAB   # proyek compose sendiri: `down` tidak menghapus PostgreSQL lajur
SCHEMA, TES = "tahap5_fanout", "tahap5_fanout_tes"
DASAR_KAFKA, DASAR_KUOTA = 19092, 18317
KAFKA_PORT, PORT_KUOTA = port_lab(DASAR_KAFKA), port_lab(DASAR_KUOTA)
API = d.HERE
BIN_STREAM, BIN_KUOTA = API / "stream", API / "pushkuota"
d.OUT = HERE / "output"
KAFKA_IMAGE = "apache/kafka:4.3.2"
FRANZ = re.search(r"twmb/franz-go (v[\d.]+)", (API / "go.mod").read_text()).group(1)
ADMIN = "admin.tunjangan@lestari.example"
WARUNG = (418, 502, 503)                  # Ani, Sari, Joko (akun warung data awal)
PARTISI_UMUM, PARTISI_BAYAR = 6, 3
BATAS_UMUR_UANG = 2.0                     # batas lab umur notifikasi uang tertua, detik (Asumsi lab, bukan nilai ukur)
_dibangun = [False]


def versi_go():
    """Versi Go yang membangun biner api-t5: dibaca di folder api-t5 (go.mod memilih toolchain), bukan di folder lab ini."""
    go = subprocess.run(["go", "version"], cwd=API, capture_output=True, text=True).stdout.split()
    return go[2] if len(go) > 2 else "go?"


d.versi_alat = versi_go   # kepala rekaman (dasar_t5.tulis) memakai versi toolchain yang sama dengan yang membangun server


# ---------- dasar ----------

def ulang_samaran():
    d.samaran.clear()
    d._urut_uuid[0] = 0
    d._urut_order[0] = 0


def bangun():
    if not _dibangun[0]:
        d.bangun()
        for biner, paket in ((BIN_STREAM, "./cmd/stream"), (BIN_KUOTA, "./cmd/pushkuota")):
            subprocess.run(["go", "build", "-o", str(biner), paket], cwd=API, check=True)
        _dibangun[0] = True


def sql(q, tampil=True):
    return d.sql(q, tampil=tampil, schema=SCHEMA)


def satu(q, arg=None):
    return d.satu(q, SCHEMA, arg)


def kompose(*args, cek=True):
    r = subprocess.run(["docker", "compose", "-p", NAMA_PROYEK, *args], cwd=HERE, capture_output=True, text=True,
                       env=dict(os.environ, LAB_KAFKA_PORT=str(KAFKA_PORT)))
    if cek and r.returncode != 0:
        gagal(f"docker compose {' '.join(args)}: {(r.stderr or r.stdout)[-600:]}")
    return r


def kafka(skrip, *args, cek=True):
    """Perintah bawaan Kafka di dalam kontainer broker; mengembalikan keluaran (stdout)."""
    r = kompose("exec", "-T", "kafka", f"/opt/kafka/bin/{skrip}", *args, cek=cek)
    return r.stdout


def kafka_bs(skrip, *args, cek=True):
    return kafka(skrip, "--bootstrap-server", "localhost:9092", *args, cek=cek)


def mulai_kafka(topik):
    """Broker baru: volume lama dihapus, topik dibuat dengan jumlah partisi tetap."""
    kompose("down", "-v", "--remove-orphans")
    kompose("up", "-d", "--wait")
    for nama, n in topik.items():
        kafka_bs("kafka-topics.sh", "--create", "--topic", nama, "--partitions", str(n), "--replication-factor", "1")


def matikan_kafka():
    kompose("down", "-v", "--remove-orphans", cek=False)


def offset_akhir(topik):
    """{partisi: offset akhir} dari kafka-get-offsets.sh (jumlah rekaman bila tidak ada kompaksi atau penghapusan)."""
    hasil = {}
    for baris in kafka_bs("kafka-get-offsets.sh", "--topic", topik).splitlines():
        t, p, o = baris.strip().split(":")
        hasil[int(p)] = int(o)
    return hasil


def baca_topik(topik, n):
    """Semua rekaman topik lewat kafka-console-consumer: [(partisi, offset, kunci, isi)] urut partisi lalu offset."""
    keluar = kafka_bs("kafka-console-consumer.sh", "--topic", topik, "--from-beginning", "--max-messages", str(n),
                      "--timeout-ms", "20000", "--property", "print.partition=true", "--property", "print.offset=true",
                      "--property", "print.key=true")
    rekaman = []
    for baris in keluar.splitlines():
        m = re.match(r"Partition:(\d+)\tOffset:(\d+)\t(\S*)\t(\{.*\})$", baris)
        if m:
            rekaman.append((int(m.group(1)), int(m.group(2)), m.group(3), json.loads(m.group(4))))
    harap(len(rekaman), n, f"rekaman terbaca dari {topik}")
    return sorted(rekaman, key=lambda r: (r[0], r[1]))


def grup_partisi(grup):
    """[{partisi, arus, akhir, lag, anggota}] dari kafka-consumer-groups.sh --describe; anggota '-' bila belum dipegang."""
    keluar = kafka_bs("kafka-consumer-groups.sh", "--describe", "--group", grup, cek=False)
    baris = []
    for l in keluar.splitlines():
        k = l.split()
        if len(k) >= 7 and k[2].isdigit():
            baris.append({"partisi": int(k[2]), "arus": None if k[3] == "-" else int(k[3]),
                          "akhir": None if k[4] == "-" else int(k[4]), "lag": None if k[5] == "-" else int(k[5]), "anggota": k[6]})
    return sorted(baris, key=lambda b: b["partisi"])


def anggota_per_partisi(grup):
    """{anggota: jumlah partisi} untuk anggota yang memegang partisi."""
    n = {}
    for b in grup_partisi(grup):
        if b["anggota"] != "-":
            n[b["anggota"]] = n.get(b["anggota"], 0) + 1
    return n


def tunggu_grup_stabil(grup, anggota, per_anggota, batas=60.0):
    d.tunggu(lambda: sorted(anggota_per_partisi(grup).values()) == [per_anggota] * anggota,
             f"{anggota} anggota memegang {per_anggota} partisi", batas, 0.5)


def tunggu_selesai(grup, partisi, batas=120.0):
    """Semua partisi punya satu rekaman yang offset-nya sudah dicatat grup (satu rekaman per partisi)."""
    d.tunggu(lambda: len(grup_partisi(grup)) == partisi and all(b["arus"] == 1 and b["lag"] == 0 for b in grup_partisi(grup)),
             "semua rekaman pengumuman dicatat grup", batas, 0.5)


def mulai_stream(nama, peran, args=()):
    """Proses cmd/stream (relay atau konsumen); log dan ringkasannya dibaca lewat selesai_stream."""
    f = tempfile.TemporaryFile(mode="a+")
    cmd = [str(BIN_STREAM), "-peran", peran, "-kafka", f"127.0.0.1:{KAFKA_PORT}",
           "-push-url", f"http://127.0.0.1:{PORT_KUOTA}", *args]
    p = subprocess.Popen(cmd, env=dict(d.ENV, DATABASE_URL=d.db_app(SCHEMA)), stdout=f, stderr=f, text=True)
    d.server[nama] = (p, f)
    return p


def selesai_stream(nama):
    """Hentikan (SIGTERM) dan kembalikan ringkasan JSON yang dicetak konsumen saat berhenti; None bila mati lebih dulu."""
    baris = d.stop(nama)
    for l in baris:
        if l.startswith("ringkasan "):
            return json.loads(l[len("ringkasan "):])
    return None


def relay_sekali(args=(), tampil=True):
    cmd = [str(BIN_STREAM), "-peran", "relay", "-sekali", "-kafka", f"127.0.0.1:{KAFKA_PORT}",
           "-push-url", f"http://127.0.0.1:{PORT_KUOTA}", "-partisi", str(PARTISI_UMUM), *args]
    r = subprocess.run(cmd, env=dict(d.ENV, DATABASE_URL=d.db_app(SCHEMA)), capture_output=True, text=True)
    if tampil:
        catat("$ ./stream -peran relay -partisi %d -sekali%s" % (PARTISI_UMUM, "".join(f" {a}" for a in args)))
        for l in r.stdout.splitlines():
            catat(l)
        for l in d.bersih_log(r.stderr):
            if not l.startswith("relay mulai"):
                catat("log: " + l)
    return r.returncode


def ringkasan_push():
    s, isi = curl("GET", "/lab/ringkasan", port=PORT_KUOTA, tampil=False)
    harap(s, 200, "ringkasan penyedia push")
    return j(isi)


def reset_push():
    harap(curl("POST", "/lab/reset", port=PORT_KUOTA, tampil=False)[0], 204, "reset penyedia push")


def buat_sesi(akun):
    token = "fanout-" + secrets.token_hex(12)
    sql(f"INSERT INTO sesi (token_hash, akun_id, kedaluwarsa) VALUES ('{hashlib.sha256(token.encode()).hexdigest()}', {akun}, now() + interval '1 hour')",
        tampil=False)
    d.samaran[token] = f"<token sesi akun {akun}>"
    return token


def bayar(token, warung, jumlah=10000, tampil=False):
    s, isi = curl("POST", "/transfers", {"ke": warung, "jumlah": jumlah}, token=token, tampil=tampil)
    harap(s, 201, f"bayar ke warung {warung}")
    return j(isi)


def karyawan(n, lewati=3):
    """n akun karyawan data awal (setelah tiga akun tokoh), urut nomor."""
    return [r[0] for r in d.sql(f"SELECT id FROM akun WHERE jenis = 'karyawan' ORDER BY id LIMIT {n} OFFSET {lewati}", tampil=False, schema=SCHEMA)]


def siapkan(kuota, latensi, aktif=None, kafka_hidup=True, push="kuota", versi=True):
    """Schema, data awal, Kafka, penyedia push, dan server api-t5 (dengan event pembayaran) dari nol."""
    for nama in list(d.server):   # proses skenario sebelumnya (server, penyedia push) dihentikan dulu
        d.stop(nama)
    ulang_samaran()
    bangun()
    d.buat_schema(SCHEMA)
    d.seed(SCHEMA)
    if aktif:   # nomor perangkat 1..10.281 (satu per akun): hanya yang bernomor <= aktif yang menerima pengumuman
        sql(f"UPDATE perangkat SET aktif = false WHERE id > {aktif}", tampil=False)
    if kafka_hidup:
        mulai_kafka({"pembayaran.tercatat": PARTISI_BAYAR, "pengumuman.kirim": PARTISI_UMUM})
    if push == "kuota":
        d.mulai(BIN_KUOTA, PORT_KUOTA, ["-kuota", str(kuota), "-latensi", f"{latensi}ms"])
    else:
        d.mulai_push()
    d.mulai_api(["-event-pembayaran"], db=d.db_app(SCHEMA))
    if versi:
        catat(f"# Kafka {KAFKA_IMAGE} (KRaft, satu broker, replication factor 1) · franz-go {FRANZ}")


def versi_kafka():
    return kafka("kafka-topics.sh", "--version").strip().split()[0]


def tabel_baris(kolom, baris):
    for b in d.tabel(kolom, baris):
        catat(d.samarkan(b))


def ya(kondisi):
    return "ya" if kondisi else "tidak"


def buat_pengumuman(token, judul="Diskon makan siang", tampil=True):
    s, isi = curl("POST", "/pengumuman", {"judul": judul}, token=token, tampil=tampil)
    harap(s, 201, "buat pengumuman")
    return j(isi)


# ---------- bagian aliran: satu event, relay, kunci merchant, at-least-once ----------

def rekam_aliran():
    siapkan(kuota=0, latensi=0)
    harap(versi_kafka(), "4.3.2", "versi Kafka")
    catat(f"$ kafka-topics.sh --version\n4.3.2")
    admin = d.login(ADMIN, label="admin")
    n_perangkat = satu("SELECT count(*) FROM perangkat WHERE aktif")
    n_akun = satu("SELECT count(DISTINCT akun_id) FROM perangkat WHERE aktif")

    bagian("A. Satu pengumuman ke semua perangkat: satu baris pengumuman, satu baris outbox, satu rekaman per rentang")
    sql("SELECT count(*) AS perangkat_aktif, count(DISTINCT akun_id) AS akun FROM perangkat WHERE aktif")
    buat_pengumuman(admin)
    sql("SELECT id, judul, status, jumlah_penerima FROM pengumuman")
    sql("SELECT jenis, tujuan, kelas, status, count(*) AS baris FROM outbox GROUP BY jenis, tujuan, kelas, status ORDER BY jenis")
    catat("")
    harap(satu("SELECT count(*) FROM pengumuman"), 1, "baris pengumuman")
    harap(satu("SELECT count(*) FROM outbox WHERE jenis = 'pengumuman'"), 1, "baris outbox pengumuman")
    harap(satu("SELECT jumlah_penerima FROM pengumuman"), n_akun, "jumlah penerima")
    harap(relay_sekali(), 0, "exit relay")
    sql("SELECT jenis, tujuan, status, count(*) AS baris FROM outbox GROUP BY jenis, tujuan, status ORDER BY jenis")
    ujung = offset_akhir("pengumuman.kirim")
    catat("$ kafka-get-offsets.sh --topic pengumuman.kirim")
    for p in sorted(ujung):
        catat(f"pengumuman.kirim:{p}:{ujung[p]}")
    harap(sorted(ujung), list(range(PARTISI_UMUM)), "partisi pengumuman.kirim")
    harap(sorted(ujung.values()), [1] * PARTISI_UMUM, "satu rekaman per partisi")
    rek = baca_topik("pengumuman.kirim", PARTISI_UMUM)
    catat("$ kafka-console-consumer.sh --topic pengumuman.kirim --from-beginning (partisi, offset, rentang perangkat di isinya)")
    rentang = []
    for p, o, kunci, isi in rek:
        harap(isi["shard"], p + 1, f"rentang di partisi {p}")
        rentang.append((isi["dari"], isi["sampai"]))
        catat(d.samarkan(f"Partition:{p} Offset:{o} kunci:{kunci} rentang perangkat {isi['dari']} sampai {isi['sampai']} "
                         f"({isi['sampai'] - isi['dari'] + 1} nomor)"))
    harap(rentang[0][0], 1, "rentang pertama mulai di nomor 1")
    for (_, a), (b, _) in zip(rentang, rentang[1:]):
        harap(b, a + 1, "rentang berurutan tanpa celah dan tanpa tumpang tindih")
    harap(rentang[-1][1], n_perangkat, "rentang terakhir berakhir di perangkat terakhir")
    harap(len({r[3]["event_id"] for r in rek}), 1, "satu event_id untuk semua rekaman rentang")
    catat(f"# {n_perangkat:,}".replace(",", ".") + f" perangkat, 1 baris pengumuman, 1 baris outbox, {PARTISI_UMUM} rekaman di Kafka (satu per rentang, satu per partisi)")

    bagian("B. Pembanding: satu baris outbox per penerima (cara lama), ukuran dibaca dari katalog PostgreSQL")
    sebelum = satu("SELECT pg_relation_size('outbox')")
    sql("""INSERT INTO outbox (akun_id, kelas, jenis, payload, tujuan)
           SELECT akun_id, 2, 'promo', jsonb_build_object('judul', 'Diskon makan siang', 'isi', ''), 'push' FROM perangkat WHERE aktif""")
    sesudah = satu("SELECT pg_relation_size('outbox')")
    baris = satu("SELECT count(*) FROM outbox WHERE jenis = 'promo'")
    harap(baris, n_perangkat, "baris outbox per penerima")
    per_baris = (sesudah - sebelum) // baris
    catat(f"-- baris outbox per penerima: {baris}")
    catat(f"-- tumpukan tabel (pg_relation_size) bertambah {per_baris} byte per baris, tanpa index (dibulatkan ke bawah)")
    juta = per_baris * 1_000_000
    catat(f"-- Hitungan: {per_baris} byte x 1.000.000 penerima = {juta // 1_000_000} MB di tumpukan tabel; naskah memakai 300 byte per baris (Asumsi): 300 MB")
    harap(per_baris > 0, True, "ukuran per baris terbaca")
    sql("DELETE FROM outbox WHERE jenis = 'promo'", tampil=False)

    bagian("C. Event pembayaran: satu baris outbox stream per pembayaran, kunci merchant, urutan per merchant")
    pembayar = karyawan(6)
    sesi = {a: buat_sesi(a) for a in pembayar}
    urutan = [WARUNG[i % 3] for i in range(12)]            # 418, 502, 503, 418, ... (empat pembayaran per merchant)
    catat(f"-- 12 pembayaran Rp10.000 dari 6 karyawan ke 3 warung, bergiliran: {', '.join(map(str, WARUNG))}")
    for i, w in enumerate(urutan):
        bayar(sesi[pembayar[i % 6]], w, tampil=(i == 0))
    sql("SELECT jenis, tujuan, status, count(*) AS baris FROM outbox WHERE jenis = 'bayar' GROUP BY jenis, tujuan, status ORDER BY tujuan")
    harap(satu("SELECT count(*) FROM outbox WHERE jenis = 'bayar' AND tujuan = 'stream'"), 12, "baris stream pembayaran")
    harap(satu("SELECT count(*) FROM outbox WHERE jenis = 'bayar' AND tujuan = 'push'"), 12, "baris push pembayaran")
    harap(relay_sekali(), 0, "exit relay pembayaran")
    rek = baca_topik("pembayaran.tercatat", 12)
    per = {}
    for p, o, kunci, isi in rek:
        harap(str(isi["merchant"]), kunci, "kunci rekaman = merchant")
        per.setdefault(int(kunci), []).append((p, o, isi["jurnal"]))
    catat("$ kafka-console-consumer.sh --topic pembayaran.tercatat --from-beginning (per merchant)")
    catat("merchant | partisi | rekaman | jurnal naik menurut offset")
    for m in sorted(per):
        partisi = {x[0] for x in per[m]}
        jurnal = [x[2] for x in sorted(per[m], key=lambda x: x[1])]
        harap(len(partisi), 1, f"merchant {m} di satu partisi")
        harap(jurnal, sorted(jurnal), f"urutan jurnal merchant {m}")
        harap(len(jurnal), 4, f"rekaman merchant {m}")
        catat(f"{m} | {'satu' if len(partisi) == 1 else 'banyak'} | {len(jurnal)} | {ya(jurnal == sorted(jurnal))}")
    harap(len({r[3]["event_id"] for r in rek}), 12, "event_id berbeda tiap pembayaran")
    harap(offset_akhir("pembayaran.tercatat") and sum(offset_akhir("pembayaran.tercatat").values()), 12, "rekaman di topik")
    catat("-- uang tidak dibaca dari topik: jurnal di PostgreSQL tetap satu-satunya sumber; topik hanya untuk dilihat")

    bagian("D. Relay mati sesudah Kafka menjawab dan sebelum baris ditandai: rekaman yang sama ditulis dua kali (at-least-once)")
    for i in range(3):
        bayar(sesi[pembayar[i]], WARUNG[i])
    catat("-- 3 pembayaran baru, lalu relay dihentikan mendadak sesudah rekaman pertama dijawab broker")
    harap(relay_sekali(["-lab-henti-sebelum-tandai"], tampil=False), 3, "relay berhenti mendadak (exit 3)")
    catat("$ ./stream -peran relay -partisi %d -sekali -lab-henti-sebelum-tandai\n(proses berhenti, exit status 3)" % PARTISI_UMUM)
    sql("""SELECT status, count(*) AS baris FROM outbox WHERE tujuan = 'stream'
           AND jurnal_id IN (SELECT jurnal_id FROM outbox WHERE tujuan = 'stream' ORDER BY id DESC LIMIT 3) GROUP BY status""")
    d.tunggu(lambda: satu("SELECT count(*) FROM outbox WHERE tujuan = 'stream' AND status = 'menunggu' AND klaim_sampai > now()") == 0,
             "klaim relay yang mati habis", 20.0, 0.25)
    harap(relay_sekali(), 0, "exit relay ulang")
    rek = baca_topik("pembayaran.tercatat", 16)
    ids = [r[3]["event_id"] for r in rek]
    ganda = {i for i in ids if ids.count(i) > 1}
    harap(len(ids), 16, "rekaman sesudah relay diulang")
    harap(len(set(ids)), 15, "event_id berbeda")
    harap(len(ganda), 1, "satu event_id muncul dua kali")
    posisi = {(r[0]) for r in rek if r[3]["event_id"] in ganda}
    harap(len(posisi), 1, "rekaman ganda jatuh di partisi yang sama")
    sql("SELECT status, count(*) AS baris FROM outbox WHERE tujuan = 'stream' GROUP BY status")
    catat(f"-- rekaman di topik: {len(ids)}; event_id berbeda: {len(set(ids))}; event_id yang muncul dua kali: {len(ganda)} (di partisi yang sama)")
    catat("-- consumer yang membaca pembayaran.tercatat harus menyaring event_id: producer idempoten tidak menutup kegagalan relay ini")
    d.tulis("aliran.txt", "satu event, relay ke Kafka, kunci merchant, dan relay yang mati", lab=LAB, schema=SCHEMA)


# ---------- bagian grup: consumer group membagi partisi, satu consumer mati di tengah ----------

def skenario_grup(id_acak):
    siapkan(kuota=0, latensi=5, versi=False)
    admin = d.login(ADMIN, label="admin")
    n_perangkat = satu("SELECT count(*) FROM perangkat WHERE aktif")
    grup = "pengumuman-pengirim"
    extra = ["-id-acak"] if id_acak else []
    mulai_stream("relay", "relay", ["-partisi", str(PARTISI_UMUM)])
    p1 = mulai_stream("k1", "konsumen", ["-grup", grup, "-serentak", "4", "-lab-henti-setelah", "500", *extra])
    mulai_stream("k2", "konsumen", ["-grup", grup, "-serentak", "4", *extra])
    mulai_stream("k3", "konsumen", ["-grup", grup, "-serentak", "4", *extra])
    tunggu_grup_stabil(grup, 3, 2)
    sebelum = anggota_per_partisi(grup)
    catat(f"$ kafka-consumer-groups.sh --describe --group {grup}   (sebelum pengumuman)")
    catat(f"anggota yang memegang partisi: {len(sebelum)}; partisi per anggota: {sorted(sebelum.values())}")
    buat_pengumuman(admin, tampil=False)
    catat("$ curl -i -X POST '/pengumuman' -d '{\"judul\": \"Diskon makan siang\"}'   (satu pengumuman, " + f"{n_perangkat:,}".replace(",", ".") + " perangkat aktif)")
    d.tunggu(lambda: p1.poll() is not None, "consumer pertama berhenti mendadak", 90.0, 0.2)
    harap(p1.returncode, 3, "exit consumer pertama")
    catat("consumer 1: berhenti mendadak sesudah ±500 pengiriman, tanpa mencatat offset (exit status 3)")
    tunggu_selesai(grup, PARTISI_UMUM)
    sesudah = anggota_per_partisi(grup)
    r2, r3 = selesai_stream("k2"), selesai_stream("k3")
    selesai_stream("k1")
    selesai_stream("relay")
    ring = ringkasan_push()
    return {"sebelum": sorted(sebelum.values()), "sesudah": sorted(sesudah.values()), "n": n_perangkat, "r2": r2, "r3": r3, "push": ring,
            "grup": grup_partisi(grup)}


def rekam_grup():
    bagian("A. Tiga consumer dalam satu grup, enam partisi; consumer pertama mati di tengah rentangnya (id deterministik)")
    h = skenario_grup(False)
    n, push = h["n"], h["push"]
    harap(h["sebelum"], [2, 2, 2], "partisi per anggota sebelum")
    harap(h["sesudah"], [3, 3], "partisi per anggota sesudah consumer mati")
    r2, r3 = h["r2"], h["r3"]
    harap(r2 is not None and r3 is not None, True, "ringkasan consumer yang hidup")
    harap(r2["rekaman"] + r3["rekaman"], PARTISI_UMUM, "rekaman yang diselesaikan consumer yang hidup")
    harap(r2["dikirim"] + r3["dikirim"], n, "pengiriman consumer yang hidup menutup semua perangkat")
    pg = push["pengumuman"]
    ganda = push["panggilan_ganda"]
    catat(f"anggota sesudah consumer 1 mati: {len(h['sesudah'])}; partisi per anggota: {h['sesudah']}")
    catat("partisi | offset tercatat | rekaman di partisi | lag")
    for b in h["grup"]:
        catat(f"{b['partisi']} | {b['arus']} | {b['akhir']} | {b['lag']}")
    catat(f"-- rekaman rentang yang diselesaikan consumer yang hidup: {r2['rekaman'] + r3['rekaman']} dari {PARTISI_UMUM}")
    catat(f"-- pengiriman yang diselesaikan consumer yang hidup: {r2['dikirim'] + r3['dikirim']} dari {n} perangkat")
    catat(f"-- penyedia push: perangkat yang menerima pengumuman: {push['penerima_pengumuman']}")
    catat(f"-- penyedia push: perangkat dengan tepat satu notifikasi berbeda: {push['penerima_tepat_satu']}")
    catat(f"-- penyedia push: perangkat dengan lebih dari satu notifikasi berbeda: {push['penerima_lebih_dari_satu']}")
    catat(f"-- penyedia push: notifikasi_id pengumuman berbeda: {push['notifikasi_berbeda']['pengumuman']}")
    catat(f"-- panggilan yang diulang (diterima lebih dari sekali dengan id sama): lebih dari 0 dan paling banyak 504: {ya(0 < ganda <= 504)}")
    harap(push["penerima_pengumuman"], n, "semua perangkat menerima")
    harap(push["penerima_tepat_satu"], n, "tepat satu notifikasi per perangkat")
    harap(push["penerima_lebih_dari_satu"], 0, "tanpa notifikasi kedua yang berbeda")
    harap(push["notifikasi_berbeda"]["pengumuman"], n, "notifikasi_id berbeda")
    harap(0 < ganda <= 504, True, "panggilan ganda dari consumer yang mati terbaca dan terbatas")
    harap(pg["diterima"], n + ganda, "diterima = perangkat + panggilan yang diulang")
    catat("-- hasil akhir tepat satu per perangkat, bukan pengiriman tepat satu kali: rentang yang tertinggal dikirim ulang dengan id yang sama")

    bagian("B. Mode rentan -id-acak: skenario yang sama, tetapi id baru di tiap pengiriman")
    h = skenario_grup(True)
    push = h["push"]
    catat(f"-- penyedia push: perangkat yang menerima pengumuman: {push['penerima_pengumuman']}")
    catat(f"-- penyedia push: perangkat dengan lebih dari satu notifikasi berbeda: lebih dari 0 dan paling banyak 504: {ya(0 < push['penerima_lebih_dari_satu'] <= 504)}")
    catat(f"-- penyedia push: perangkat dengan tepat satu notifikasi berbeda: kurang dari {h['n']}: {ya(push['penerima_tepat_satu'] < h['n'])}")
    harap(push["penerima_pengumuman"], h["n"], "semua perangkat menerima (id acak)")
    harap(0 < push["penerima_lebih_dari_satu"] <= 504, True, "id acak membuat penerima melihat dua notifikasi")
    harap(push["penerima_tepat_satu"] + push["penerima_lebih_dari_satu"], h["n"], "jumlah penerima")
    d.tulis("grup.txt", "consumer group membagi partisi dan consumer mati di tengah", lab=LAB, schema=SCHEMA)
    matikan_kafka()


# ---------- bagian kuota: 429 dijawab backoff eksponensial dan jitter ----------

BATAS_BACKOFF_DASAR_MS, BATAS_BACKOFF_MAKS_MS = 100, 2000


def skenario_kuota(tanpa_backoff):
    siapkan(kuota=1000, latensi=2, aktif=3000, versi=False)
    admin = d.login(ADMIN, label="admin")
    grup = "pengumuman-pengirim"
    extra = ["-tanpa-backoff", "-maks-percobaan", "100000000"] if tanpa_backoff else []
    mulai_stream("relay", "relay", ["-partisi", str(PARTISI_UMUM)])
    for i in (1, 2, 3):
        mulai_stream(f"k{i}", "konsumen", ["-grup", grup, "-serentak", "32", "-backoff", f"{BATAS_BACKOFF_DASAR_MS}ms",
                                           "-backoff-maks", f"{BATAS_BACKOFF_MAKS_MS}ms", *extra])
    tunggu_grup_stabil(grup, 3, 2)
    mulai = time.time()
    buat_pengumuman(admin, tampil=False)
    tunggu_selesai(grup, PARTISI_UMUM)
    lama = time.time() - mulai
    ring = [selesai_stream(f"k{i}") for i in (1, 2, 3)]
    selesai_stream("relay")
    return {"lama": lama, "ring": ring, "push": ringkasan_push()}


def rekam_kuota():
    bagian("A. Kuota penyedia push 1.000 per detik (lab, sepersepuluh dari 10.000), 3.000 perangkat, 96 pengirim serentak, dengan backoff dan jitter")
    a = skenario_kuota(False)
    p = a["push"]["pengumuman"]
    catat("-- kuota lab 1.000 per detik, latensi 2 ms; naskah 10.000 per detik (aturan jendela diuji di tes Go dengan 10.000)")
    catat(f"-- 3.000 perangkat aktif; tiga consumer, tiap consumer 32 pengirim; backoff dasar {BATAS_BACKOFF_DASAR_MS} ms, batas {BATAS_BACKOFF_MAKS_MS} ms, jitter penuh")
    catat(f"-- pesan yang diterima penyedia: {p['diterima']}")
    catat(f"-- perangkat dengan tepat satu notifikasi berbeda: {a['push']['penerima_tepat_satu']}")
    catat(f"-- panggilan ganda: {a['push']['panggilan_ganda']}")
    catat(f"-- ada permintaan yang dijawab 429 karena kuota terlampaui: {ya(p['ditolak_429'] > 0)}")
    catat(f"-- selesai lebih dari 2 detik (3.000 pesan, 1.000 per jendela satu detik): {ya(a['lama'] > 2.0)}")
    harap(p["diterima"], 3000, "pesan diterima")
    harap(a["push"]["penerima_tepat_satu"], 3000, "tepat satu per perangkat")
    harap(a["push"]["panggilan_ganda"], 0, "tanpa panggilan ganda")
    harap(p["ditolak_429"] > 0, True, "kuota terlampaui")
    harap(a["lama"] > 2.0, True, "kuota membatasi lama pengiriman")
    harap(p["permintaan"], p["diterima"] + p["ditolak_429"], "permintaan = diterima + 429")
    dalam_batas, maks_k = True, 0
    for r in a["ring"]:
        harap(r["menyerah"], 0, "pengirim menyerah")
        for k, ms in enumerate(r["pengirim"]["tunggu_maks_ms"], start=1):
            batas = min(BATAS_BACKOFF_MAKS_MS, BATAS_BACKOFF_DASAR_MS * 2 ** (k - 1))
            dalam_batas = dalam_batas and ms <= batas + 1.0
            maks_k = max(maks_k, k)
    catat(f"-- menunggu sesudah percobaan ke-k tidak pernah melebihi min({BATAS_BACKOFF_MAKS_MS}, {BATAS_BACKOFF_DASAR_MS} x 2^(k-1)) ms, di semua consumer dan semua k: {ya(dalam_batas)}")
    catat(f"-- ada pesan yang butuh paling sedikit tiga percobaan: {ya(maks_k >= 3)}")
    harap(dalam_batas, True, "batas backoff")
    harap(maks_k >= 3, True, "pesan dengan beberapa percobaan")
    jml_dengan = sum(r["pengirim"]["ditolak_429"] for r in a["ring"])
    harap(jml_dengan, p["ditolak_429"], "429 di sisi pengirim = di sisi penyedia")

    bagian("B. Mode rentan -tanpa-backoff: skenario yang sama, tetapi pengirim mengulang segera sesudah 429")
    b = skenario_kuota(True)
    pb = b["push"]["pengumuman"]
    jml_tanpa = sum(r["pengirim"]["ditolak_429"] for r in b["ring"])
    catat(f"-- pesan yang diterima penyedia: {pb['diterima']}")
    catat(f"-- perangkat dengan tepat satu notifikasi berbeda: {b['push']['penerima_tepat_satu']}")
    print(f"[info, tidak direkam] 429 dengan backoff {jml_dengan}, tanpa backoff {jml_tanpa}")
    catat(f"-- jumlah 429 tanpa backoff paling sedikit dua kali jumlah 429 dengan backoff: {ya(jml_tanpa >= 2 * jml_dengan)}")
    harap(pb["diterima"], 3000, "pesan diterima (tanpa backoff)")
    harap(b["push"]["penerima_tepat_satu"], 3000, "tepat satu per perangkat (tanpa backoff)")
    harap(jml_tanpa >= 2 * jml_dengan, True, "tanpa backoff memperbanyak 429")
    d.tulis("kuota.txt", "kuota penyedia push, 429, dan backoff dengan jitter", lab=LAB, schema=SCHEMA)
    matikan_kafka()


# ---------- bagian antrean: uang tidak menunggu di belakang pengumuman ----------

def umur_uang_tertua():
    return float(satu("SELECT coalesce(extract(epoch FROM now() - min(dibuat)), 0) FROM outbox WHERE tujuan = 'push' AND kelas = 0 AND status = 'menunggu'"))


def skenario_bersama(terkendali):
    siapkan(kuota=1000, latensi=2, aktif=4000, versi=False)
    admin = d.login(ADMIN, label="admin")
    grup = "pengumuman-pengirim"
    args = ["-laju", "200", "-serentak", "4"] if terkendali else ["-serentak", "32", "-tanpa-backoff", "-maks-percobaan", "100000000"]
    mulai_stream("relay", "relay", ["-partisi", str(PARTISI_UMUM)])
    for i in (1, 2, 3):
        mulai_stream(f"k{i}", "konsumen", ["-grup", grup, *args])
    tunggu_grup_stabil(grup, 3, 2)
    d.mulai_worker("uang", ["-tujuan", "push", "-serentak", "4", "-selang", "50ms", "-push-url", f"http://127.0.0.1:{PORT_KUOTA}"],
                   db=d.db_app(SCHEMA))
    pembayar = karyawan(20)
    sesi = [buat_sesi(a) for a in pembayar]
    selesai = threading.Event()
    maks = [0.0]

    def pantau():
        while not selesai.is_set():
            maks[0] = max(maks[0], umur_uang_tertua())
            time.sleep(0.1)

    def bayar_uang():
        for i, s in enumerate(sesi):
            bayar(s, WARUNG[i % 3], 5000)
            time.sleep(0.12)

    pantau_t = threading.Thread(target=pantau, daemon=True)
    pantau_t.start()
    mulai = time.time()
    buat_pengumuman(admin, tampil=False)
    uang = threading.Thread(target=bayar_uang, daemon=True)
    uang.start()
    tunggu_selesai(grup, PARTISI_UMUM)
    lama = time.time() - mulai
    uang.join(timeout=30)
    d.tunggu(lambda: satu("SELECT count(*) FROM outbox WHERE tujuan = 'push' AND kelas = 0 AND status = 'menunggu'") == 0,
             "semua notifikasi uang selesai", 90.0, 0.2)
    selesai.set()
    pantau_t.join(timeout=5)
    for i in (1, 2, 3):
        selesai_stream(f"k{i}")
    selesai_stream("relay")
    d.stop("uang")
    return {"lama": lama, "maks_umur": maks[0], "push": ringkasan_push(),
            "outbox": [tuple(r) for r in d.sql("SELECT status, count(*) FROM outbox WHERE tujuan = 'push' AND kelas = 0 GROUP BY status ORDER BY status",
                                               tampil=False, schema=SCHEMA)]}


def rekam_antrean():
    bagian("A. Kelas antrean: 3.000 baris promo (kelas 2) sudah menunggu, lalu empat pembayaran (kelas 0) masuk")
    siapkan(kuota=0, latensi=0, kafka_hidup=False, push="palsu", versi=False)
    karyawan_ = karyawan(4)
    sql("""INSERT INTO outbox (akun_id, kelas, jenis, payload, tujuan)
           SELECT akun_id, 2, 'promo', jsonb_build_object('judul', 'Diskon makan siang', 'isi', ''), 'push' FROM perangkat WHERE id <= 3000""", tampil=False)
    catat("=> 3.000 baris outbox promo (kelas 2, tujuan push) ditulis lebih dulu, satu per penerima (cara lama)")
    for a in karyawan_:
        bayar(buat_sesi(a), WARUNG[0], 5000)
    catat("=> 4 pembayaran Rp5.000 ke warung 418 (kelas 0, tujuan push) ditulis sesudahnya")
    tabel = "SELECT kelas, status, count(*) AS baris FROM outbox WHERE tujuan = 'push' GROUP BY kelas, status ORDER BY kelas, status"
    sql(tabel)
    catat("-- mode rentan urut-waktu (M27): satu putaran worker mengklaim empat baris menurut nomor saja")
    d.worker(["-satu-putaran", "-serentak", "4", "-tujuan", "push", "-rentan", "urut-waktu"], db=d.db_app(SCHEMA))
    sql(tabel)
    harap(satu("SELECT count(*) FROM outbox WHERE tujuan = 'push' AND kelas = 0 AND status = 'menunggu'"), 4, "uang menunggu di belakang promo (urut-waktu)")
    harap(satu("SELECT count(*) FROM outbox WHERE tujuan = 'push' AND kelas = 2 AND status = 'terkirim'"), 4, "empat promo terkirim lebih dulu")
    catat("-- versi benar: satu putaran worker mengklaim menurut kelas, lalu nomor")
    d.worker(["-satu-putaran", "-serentak", "4", "-tujuan", "push"], db=d.db_app(SCHEMA))
    sql(tabel)
    harap(satu("SELECT count(*) FROM outbox WHERE tujuan = 'push' AND kelas = 0 AND status = 'terkirim'"), 4, "uang dikirim di putaran berikutnya")
    harap(satu("SELECT count(*) FROM outbox WHERE tujuan = 'push' AND kelas = 2 AND status = 'menunggu'"), 2996, "promo yang tersisa")
    catat("-- kelas hanya mengatur urutan di antrean yang sama; penyedia push dan kuotanya dipakai bersama (bagian B)")
    d.stop(d.PORT)
    d.stop(d.PORT_PUSH)

    bagian("B. Pengumuman lewat Kafka dan uang lewat outbox memakai satu kuota penyedia push (1.000 per detik di lab)")
    t = skenario_bersama(True)
    u, pg = t["push"]["uang"], t["push"]["pengumuman"]
    catat("-- 4.000 perangkat aktif, tiga consumer, 20 pembayaran Rp5.000 (kelas 0) ditulis tiap ±120 ms selama pengumuman berjalan")
    catat("-- versi benar: tiap consumer dibatasi 200 pesan per detik (3 x 200 = 600 per detik, di bawah kuota 1.000), 4 pengirim")
    catat(f"-- pengumuman diterima: {pg['diterima']}")
    catat(f"-- pengumuman dijawab 429: {pg['ditolak_429']}")
    catat(f"-- pengumuman selesai lebih dari 6 detik (4.000 pesan, laju paling tinggi 600 per detik): {ya(t['lama'] > 6.0)}")
    catat(f"-- notifikasi uang diterima: {u['diterima']}")
    catat(f"-- notifikasi uang dijawab 429: {u['ditolak_429']}")
    print(f"[info, tidak direkam] terkendali: umur uang tertua {t['maks_umur']:.2f} s, lama {t['lama']:.1f} s, outbox uang {t['outbox']}")
    catat(f"-- umur notifikasi uang tertua yang masih menunggu, diukur tiap 100 ms, tidak pernah melebihi {BATAS_UMUR_UANG:g} detik (batas lab): {ya(t['maks_umur'] <= BATAS_UMUR_UANG)}")
    harap(pg["diterima"], 4000, "pengumuman diterima")
    harap(pg["ditolak_429"], 0, "pengumuman terkendali tidak melewati kuota")
    harap(t["lama"] > 6.0, True, "laju pengumuman dibatasi")
    harap(u["diterima"], 20, "uang diterima")
    harap(u["ditolak_429"], 0, "uang tidak dijawab 429")
    harap(t["maks_umur"] <= BATAS_UMUR_UANG, True, "umur uang tertua di bawah batas lab")

    catat("-- mode rentan: tiap consumer tanpa batas laju dan tanpa backoff, 32 pengirim (96 pengirim serentak melawan kuota 1.000 per detik)")
    r = skenario_bersama(False)
    u2, pg2 = r["push"]["uang"], r["push"]["pengumuman"]
    print(f"[info, tidak direkam] rentan: umur uang tertua {r['maks_umur']:.2f} s, lama {r['lama']:.1f} s, 429 uang {u2['ditolak_429']}, outbox uang {r['outbox']}")
    catat(f"-- pengumuman diterima: {pg2['diterima']}")
    catat(f"-- pengumuman dijawab 429: lebih dari 0: {ya(pg2['ditolak_429'] > 0)}")
    catat(f"-- notifikasi uang dijawab 429 paling sedikit satu kali: {ya(u2['ditolak_429'] > 0)}")
    catat(f"-- umur notifikasi uang tertua melebihi {BATAS_UMUR_UANG:g} detik (batas lab): {ya(r['maks_umur'] > BATAS_UMUR_UANG)}")
    harap(pg2["diterima"], 4000, "pengumuman diterima (rentan)")
    harap(pg2["ditolak_429"] > 0, True, "pengumuman tanpa laju melewati kuota")
    harap(u2["ditolak_429"] > 0, True, "uang ikut dijawab 429 saat kuota dihabiskan pengumuman")
    harap(r["maks_umur"] > BATAS_UMUR_UANG, True, "umur uang tertua melewati batas lab saat kuota dihabiskan pengumuman")
    d.tulis("antrean.txt", "kelas antrean dan kuota bersama antara pengumuman dan uang", lab=LAB, schema=SCHEMA)
    matikan_kafka()


# ---------- bagian pengirim: L = lambda x t, 8 dan 11 proses, 42 partisi ----------

def bulat(x, ke="0"):
    return Decimal(x).quantize(Decimal(ke), rounding=ROUND_HALF_UP)


def n(x, dec=0):
    """Bilangan dengan koma desimal dan titik ribuan (gaya naskah), dibulatkan setengah ke atas."""
    s = f"{bulat(x, '1' if dec == 0 else '0.' + '0' * dec):,.{dec}f}"
    return s.replace(",", "_").replace(".", ",").replace("_", ".")


def rekam_pengirim():
    bagian("A. Hitungan naskah (Hitungan atas Asumsi): pengirim serentak untuk notifikasi uang makan siang")
    uang_per_hari = 650_000
    makan_siang = Decimal(uang_per_hari) * Decimal("0.8") / Decimal(5400)
    lam = bulat(makan_siang, "0.1")
    t = Decimal("0.3")
    L = lam * t
    catat(f"lambda makan siang = 650.000 x 0,8 / 5.400 = {n(makan_siang, 3)} -> {n(lam, 1)} per detik")
    catat(f"L = lambda x t = {n(lam, 1)} x {n(t, 1)} = {n(L, 2)} -> {n(L, 0)} pengirim serentak (naskah menulis 28,9 lalu 29)")
    c = 4
    for proses in (8, 11):
        pengirim = proses * c
        kapasitas = Decimal(pengirim) / t
        pakai = lam / kapasitas * 100
        catat(f"{proses} proses x {c} = {pengirim} pengirim -> kapasitas {pengirim} / {n(t, 1)} = {n(kapasitas, 1)} per detik, terpakai {n(lam, 1)} / {n(kapasitas, 1)} = {n(pakai, 1)}%")
    harap(math.ceil(float(L) / c), 8, "proses minimal")
    harap(math.ceil(float(L) / 0.7 / c), 11, "proses untuk terpakai paling tinggi sekitar 70%")
    catat(f"proses minimal = ceil({n(L, 1)} / {c}) = 8; untuk terpakai paling tinggi 70%: ceil({n(L, 1)} / 0,7 / {c}) = 11")
    catat("")
    catat("Pengumuman ke 1.000.000 perangkat dalam 30 menit (Hitungan atas Asumsi)")
    laju = Decimal(1_000_000) / Decimal(1800)
    pengirim = laju * t
    catat(f"laju = 1.000.000 / 1.800 detik = {n(laju, 1)} per detik")
    catat(f"pengirim = {n(laju, 1)} x {n(t, 1)} = {n(pengirim, 1)} -> {n(pengirim, 0)}")
    harap(int(bulat(pengirim, "1")), 167, "pengirim 30 menit")
    consumer = math.ceil(167 / c)
    catat(f"consumer = ceil(167 / {c}) = {consumer}; partisi paling sedikit = {consumer} (satu partisi dibaca satu consumer dalam satu grup)")
    harap(consumer, 42, "consumer dan partisi")
    semenit = Decimal(1_000_000) / 60
    catat(f"kuota penyedia: {n(laju, 1)} / 10.000 = {n(laju / 10000 * 100, 1)}% dari kuota; semua dalam semenit: 1.000.000 / 60 = {n(semenit, 0)} per detik = {n(semenit / 10000 * 100, 0)}% kuota")
    catat(f"uang + pengumuman = 75,2 + {n(laju, 1)} = {n(Decimal('75.2') + bulat(laju, '0.1'), 1)} per detik selama 30 menit")
    catat(f"breaker per proses: 6 kegagalan x 11 proses = {6 * 11} kegagalan sebelum semua breaker terbuka")

    bagian("B. c dan t terukur oleh kode pengirim yang sama dengan consumer: 48 pesan, 4 pengirim, penyedia dengan latensi 300 ms")
    ulang_samaran()
    bangun()
    d.mulai(BIN_KUOTA, PORT_KUOTA, ["-kuota", "0", "-latensi", "300ms"])
    r = subprocess.run([str(BIN_STREAM), "-peran", "uji-pengirim", "-push-url", f"http://127.0.0.1:{PORT_KUOTA}", "-jumlah", "48", "-serentak", "4"],
                       capture_output=True, text=True)
    harap(r.returncode, 0, "exit uji-pengirim")
    ring = json.loads(next(l for l in r.stdout.splitlines() if l.startswith("ringkasan "))[len("ringkasan "):])
    push = ringkasan_push()
    pg = ring["pengirim"]
    per_detik, t_rata = ring["per_detik"], pg["t_rata_ms"] / 1000
    L_terukur = per_detik * t_rata
    catat("$ ./stream -peran uji-pengirim -jumlah 48 -serentak 4   (penyedia: kuota 0, latensi 300 ms)")
    catat(f"pesan diterima penyedia: {push['pengumuman']['diterima']}")
    catat(f"c terukur: pengirim serentak paling banyak di sisi pengirim = {pg['serentak_maks']}, di sisi penyedia = {push['serentak_maks']}")
    catat(f"t terukur rata-rata per pesan antara 300 dan 400 ms: {ya(0.300 <= t_rata <= 0.400)}")
    catat(f"kapasitas terukur (pesan per detik) antara 10 dan 13,4 (c / t naskah = 13,33): {ya(10.0 <= per_detik <= 13.4)}")
    catat(f"L = lambda x t terukur berada dalam 15% dari c: {ya(abs(L_terukur - 4) <= 0.6)}")
    harap(push["pengumuman"]["diterima"], 48, "pesan diterima")
    harap(pg["serentak_maks"], 4, "c terukur di pengirim")
    harap(push["serentak_maks"], 4, "c terukur di penyedia")
    harap(0.300 <= t_rata <= 0.400, True, "t terukur")
    harap(10.0 <= per_detik <= 13.4, True, "kapasitas terukur")
    harap(abs(L_terukur - 4) <= 0.6, True, "Little's Law terukur")
    catat("")
    catat("Kepekaan terhadap t (Hitungan): bila t terukur di produksi 0,4 detik, bukan 0,3")
    t4 = Decimal("0.4")
    L4 = lam * t4
    catat(f"L = {n(lam, 1)} x {n(t4, 1)} = {n(L4, 2)} -> {n(L4, 0)}; proses minimal = ceil({n(L4, 1)} / {c}) = {math.ceil(float(L4) / c)}; untuk terpakai paling tinggi 70%: {math.ceil(float(L4) / 0.7 / c)} proses")
    catat("-- t di naskah (0,3 detik) adalah Asumsi; lab memakai latensi tiruan 300 ms, jadi angka terukur membuktikan hitungan, bukan t penyedia sungguhan")
    d.tulis("pengirim.txt", "pemakaian pengirim: L = lambda x t, c dan t terukur", lab=LAB, schema=SCHEMA)


# ---------- bagian testing ----------

def go_test(*args, env):
    r = subprocess.run(["go", *args], cwd=API, env=env, capture_output=True, text=True)
    teks = (r.stdout + r.stderr).replace("\t", "  ")
    teks = re.sub(r" \(\d+\.\d+s\)", "", teks)
    teks = re.sub(r"^(ok|FAIL)(\s+\S+)\s+[\d.]+s", r"\1\2", teks, flags=re.M)
    teks = re.sub(r"^(ok\s+\S+)\s+\(cached\)", r"\1", teks, flags=re.M)
    teks = re.sub(r"^\d{4}/\d\d/\d\d \d\d:\d\d:\d\d(?:\.\d+)? ", "", teks, flags=re.M)
    return r.returncode, teks.rstrip()


def rekam_testing():
    ulang_samaran()
    d.buat_schema(TES)
    bagian("A. go vet, lalu tes Go tanpa PostgreSQL: pengirim dengan backoff, laju, id pengumuman, dan jendela kuota")
    rc, teks = go_test("vet", "./...", env=d.ENV)
    catat("$ go vet ./...")
    catat(teks or "(tanpa temuan)")
    catat(f"# exit status {rc}")
    harap(rc, 0, "go vet")
    rc, teks = go_test("test", "-v", "-count=1", "./internal/stream", "./internal/notifid", "./cmd/pushkuota", env=d.ENV)
    teks = "\n".join(l for l in teks.splitlines() if not l.startswith(("=== RUN", "=== PAUSE", "=== CONT")))
    catat("$ go test -v -count=1 ./internal/stream ./internal/notifid ./cmd/pushkuota")
    catat(teks)
    catat(f"# exit status {rc}")
    harap(rc, 0, "go test tanpa database")
    harap("--- SKIP" in teks, False, "tes dilewati")
    bagian(f"B. Tes event pembayaran dengan PostgreSQL sungguhan (schema {TES}): satu transaction dengan jurnal")
    env = dict(d.ENV, TEST_DATABASE_URL=d.db_pemilik(TES, "t5-fanout-tes"), LAB_TES_SCHEMA=TES, TES_DB_WAJIB="1")
    rc, teks = go_test("test", "-v", "-count=1", "-p", "1", "-run", "EventPembayaran|BayarMenulisSatuEventStream", "./internal/service", env=env)
    teks = "\n".join(l for l in teks.splitlines() if not l.startswith(("=== RUN", "=== PAUSE", "=== CONT")))
    catat(f"$ TEST_DATABASE_URL=<pemilik, schema {TES}> TES_DB_WAJIB=1 go test -v -count=1 -p 1 -run 'EventPembayaran|BayarMenulisSatuEventStream' ./internal/service")
    catat(teks)
    catat(f"# exit status {rc}")
    if rc != 0:
        print(teks, file=sys.stderr)
    harap(rc, 0, "go test dengan database")
    harap("--- SKIP" in teks, False, "tes dilewati")
    d.tulis("testing.txt", "tes Go untuk pengirim, id pengumuman, kuota, dan event pembayaran", lab=LAB, schema=TES)


BAGIAN = {"aliran": rekam_aliran, "grup": rekam_grup, "kuota": rekam_kuota, "antrean": rekam_antrean, "pengirim": rekam_pengirim,
          "testing": rekam_testing}


def main():
    pilih = sys.argv[1:] or list(BAGIAN)
    for nama in pilih:
        if nama not in BAGIAN:
            sys.exit(f"bagian tidak dikenal: {nama} (pilih dari: {' '.join(BAGIAN)})")
    for port in (d.PORT, d.PORT_PUSH, PORT_KUOTA):
        d.port_bebas(port)
    bangun()
    try:
        for nama in pilih:
            d.log.clear()
            BAGIAN[nama]()
    finally:
        matikan_kafka()
        for port in list(d.server):
            d.stop(port)
    print("selesai:", ", ".join(pilih))


if __name__ == "__main__":
    main()
