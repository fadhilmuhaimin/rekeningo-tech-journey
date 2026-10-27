"""Rekam lab t4-webhook: gateway tiruan, webhook ganda, tanda tangan, retry, urutan, dan rekonsiliasi di atas api-t4.

Server, skema, data awal, dan gateway tiruan adalah milik `labs/api-t4` (`dasar_t4.py`, `cmd/api`, `cmd/tiruan`), bukan
salinan; lab ini hanya menambah skenario di atasnya, di schema sendiri (`tahap4_webhook`). Setiap bagian membuat ulang
schema dan data awal dari nol, jadi output/*.txt tidak bergantung pada urutan bagian dan rekaman ulang identik per
byte (make cek). Token, waktu, tanggal, dan nomor order disamarkan; waktu retry diperankan (waktu maya), tidak
ditunggu. Gateway adalah tiruan lokal; tidak ada panggilan ke luar mesin ini. Lab gagal keras bila hasil meleset dari
yang diharapkan.

    make -C labs/t4-webhook run                      (butuh: Docker, Go; PostgreSQL lewat labs/b3-race)
    make -C labs/t4-webhook run BAGIAN=retry         (satu bagian: ganda tandatangan retry urutan rekon testing)
"""
import functools, hashlib, hmac, http.server, json, math, pathlib, re, subprocess, sys, threading, time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "api-t4"))
import dasar_t4 as d  # noqa: E402
from dasar_t4 import PORT, PORT_GATEWAY, bagian, catat, curl, gagal, harap, j, login  # noqa: E402

LAB = "t4-webhook"
SCH = "tahap4_webhook"
TES = "tahap4_webhook_tes"
DB = d.db_app(SCH)
d.OUT = HERE / "output"           # dasar_t4.tulis menulis ke d.OUT; di sini output lab ini, bukan api-t4
RAHASIA1, RAHASIA2 = d.RAHASIA_WEBHOOK, "rahasia-gateway-lab-2"   # data lab, bukan secret

sql = functools.partial(d.sql, schema=SCH)


def satu(q):
    return d.satu(q, SCH)


def tulis(nama, judul):
    d.tulis(nama, judul, lab=LAB, schema=SCH)


# ---------- dasar ----------

def siapkan():
    d.buat_schema(SCH)
    d.seed(SCH)


def mulai(args=(), tampil=None):
    d.mulai_gateway()
    d.mulai_api(list(args), tampil=tampil, db=DB)


def ganti_api(args=(), tampil=None):
    """Hentikan server api-t4 dan nyalakan lagi dengan flag lain (data tetap)."""
    d.stop(PORT)
    d.mulai_api(list(args), tampil=tampil, db=DB)


def gw(path, body=None, metode="POST"):
    s, isi = curl(metode, path, body, port=PORT_GATEWAY, tampil=False)
    return s, j(isi)


def kirim_webhook(**kw):
    """Perintahkan gateway mengirim webhook; mengembalikan daftar hasil per kiriman ('<status> <hasil>')."""
    s, h = gw("/lab/webhook", kw)
    harap(s, 200, "perintah webhook")
    return h["hasil"]


def gateway_bayar(order_id, **kw):
    s, _ = gw("/lab/bayar", {"order_id": order_id, **kw})
    harap(s, 200, "gateway bayar")


def buat_topup(token, jumlah, tampil=False):
    s, isi = curl("POST", "/topup-bank", {"jumlah": jumlah}, token, tampil=tampil)
    harap(s, 201, "top-up bank")
    return j(isi)


def jurnal_topup(order_id):
    return satu(f"SELECT count(*) FROM jurnal WHERE jenis = 'topup_bank' AND keterangan = 'Top-up bank {order_id}'")


def jurnal_order(order_id):
    return satu(f"SELECT count(*) FROM jurnal WHERE keterangan LIKE '%{order_id}%'")


def saldo(akun):
    return satu(f"SELECT saldo_cache FROM buku WHERE akun_id = {akun}")


def job(*args):
    """Satu job api-t4 sebagai proses sendiri (flag -cek-topup, -rekon, -koreksi-rekon); mengembalikan baris keluarannya."""
    r = subprocess.run([str(d.BIN), *args, *d.args_t4()], env=dict(d.ENV, DATABASE_URL=DB), capture_output=True, text=True)
    harap(r.returncode, 0, f"exit {args[0]}")
    return r.stdout.strip()


def catat_job(deskripsi, *args):
    catat(f"$ ./api-t4 {deskripsi}")
    catat(d.samarkan(job(*args)))


def diperiksa_cek(deskripsi):
    """Jalankan job -cek-topup, catat keluarannya, dan kembalikan berapa top-up yang diperiksa."""
    catat(f"$ ./api-t4 {deskripsi}")
    keluar = d.samarkan(job("-cek-topup"))
    catat(keluar)
    m = re.search(r"diperiksa (\d+)", keluar)
    harap(bool(m), True, "keluaran job cek status memuat jumlah yang diperiksa")
    return int(m.group(1))


def hari_ini():
    return satu("SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date::text")


def tabel(kolom, baris):
    for b in d.tabel(kolom, baris):
        catat(d.samarkan(b))


class Penerima:
    """Penerima webhook tiruan di proses ini (port sementara): mencatat timestamp, tanda tangan, dan byte body yang
    sampai, dan menjawab kode yang diatur. Dipakai untuk melihat apa yang sesungguhnya dikirim gateway tiruan."""

    def __init__(self, kode=(200,)):
        self.kode, self.diterima, self.jam = list(kode), [], []
        luar = self

        class H(http.server.BaseHTTPRequestHandler):
            def do_POST(self):
                body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
                if self.path == "/lab/jam":
                    luar.jam.append(json.loads(body)["ms"])
                    self.send_response(204)
                    self.end_headers()
                    return
                luar.diterima.append({"ts": int(self.headers["X-Gateway-Timestamp"]), "tanda": self.headers["X-Gateway-Signature"], "body": body})
                k = luar.kode[min(len(luar.diterima) - 1, len(luar.kode) - 1)]
                self.send_response(k)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"hasil": f"kode-{k}"}).encode())

            def log_message(self, *a):
                pass

        self.srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), H)
        self.port = self.srv.server_address[1]
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()

    @property
    def url(self):
        return f"http://127.0.0.1:{self.port}/webhook"

    def tutup(self):
        self.srv.shutdown()
        self.srv.server_close()


def hmac_sah(rahasia, ts, body):
    return hmac.new(rahasia.encode(), f"{ts}.".encode() + body, hashlib.sha256).hexdigest()


# ---------- ganda.txt (a, b) ----------

def rekam_ganda():
    siapkan()
    d.mulai_gateway()
    d.mulai_api(["-rentan", "webhook-v1"], db=DB,
                tampil="# server: ./api-t4 -lab -rentan webhook-v1 (handler paling pendek: tanpa tanda tangan, tanpa tabel event, tanpa status bersyarat); gateway tiruan: ./tiruan")
    budi = login("budi@lestari.example", label="Budi")

    bagian("A. Handler versi pertama: kiriman yang sama dua kali menghasilkan dua jurnal")
    t = buat_topup(budi, 200_000)
    gateway_bayar(t["order_id"])
    h = kirim_webhook(event_id="evt-1", order_id=t["order_id"], kali=2, tanpa_tanda_tangan=True)
    catat("$ curl -X POST gateway/lab/webhook -d '{\"event_id\":\"evt-1\",\"order_id\":\"<order 1>\",\"kali\":2,\"tanpa_tanda_tangan\":true}'   # event yang sama, dua kali, berurutan")
    catat("hasil kiriman: " + ", ".join(h))
    harap(h, ["200 diproses", "200 diproses"], "versi pertama memproses dua kali")
    sql("SELECT p.jurnal_id, b.jenis AS buku, p.jumlah FROM posting p JOIN jurnal j ON j.id = p.jurnal_id JOIN buku b ON b.id = p.buku_id WHERE j.jenis = 'topup_bank' ORDER BY p.id")
    harap(jurnal_topup(t["order_id"]), 2, "dua jurnal top-up untuk satu pembayaran")
    harap(satu("SELECT count(*) FROM webhook_event"), 0, "versi pertama tidak punya tabel event")
    catat("# Satu pembayaran Rp200.000, dua jurnal: saldo Budi naik Rp400.000. Tidak ada tabel event, dan status bersyarat tidak ada.")

    d.stop(PORT)
    siapkan()
    d.stop(PORT_GATEWAY)
    bagian("B. Versi ADR 34: balasan 200 yang pertama hilang di jalan, gateway mengirim event yang sama lagi: satu jurnal")
    mulai(tampil="# server: ./api-t4 -lab (versi ADR 34: tanda tangan, tabel event, status hanya maju)")
    budi = login("budi@lestari.example", label="Budi")
    t = buat_topup(budi, 200_000)
    gateway_bayar(t["order_id"])
    h1 = kirim_webhook(event_id="evt-1", order_id=t["order_id"], putus_balasan=True)
    h2 = kirim_webhook(event_id="evt-1", order_id=t["order_id"])
    catat(f"kiriman 1 (koneksi diputus gateway begitu balasan mulai datang): {h1[0]}")
    catat(f"kiriman 2 (event yang sama): {h2[0]}")
    harap(h2, ["200 ganda"], "kiriman ulang")
    harap(jurnal_topup(t["order_id"]), 1, "satu jurnal")
    sql("SELECT event_id, jenis, hasil, jurnal_id IS NOT NULL AS ada_jurnal FROM webhook_event ORDER BY event_id")
    catat("# Kiriman pertama sudah di-COMMIT sebelum balasan dikirim, jadi kiriman ulang menemukan event_id yang sama: nol baris, balas 200 tanpa jurnal.")
    tulis("ganda.txt", "webhook ganda: handler versi pertama lawan versi ADR 34, dan celah cek-lalu-tulis")


def rekam_ganda_serentak():
    """Bagian b dari naskah: dua kiriman bersamaan lolos cek-lalu-tulis; tanpa lapis lain hanya kunci utama yang menahan."""
    siapkan()
    d.mulai_gateway()
    d.mulai_api(["-rentan", "webhook-cek-tulis", "-lab-jeda-cek-tulis", "300ms"], db=DB,
                tampil="# server: ./api-t4 -lab -rentan webhook-cek-tulis -lab-jeda-cek-tulis 300ms (cek status lalu tulis, tanda tangan diperiksa; jeda 300 ms di antara cek dan tulis supaya celah terekam)")
    budi = login("budi@lestari.example", label="Budi")
    bagian("A. Cek-lalu-tulis: dua kiriman bersamaan sama-sama melihat status menunggu, dan keduanya menjurnal")
    t = buat_topup(budi, 100_000)
    gateway_bayar(t["order_id"])
    h = sorted(kirim_webhook(event_id="evt-1", order_id=t["order_id"], kali=2, serentak=True))
    catat("dua kiriman bersamaan, tanda tangan sah (diurutkan): " + ", ".join(h))
    harap(h, ["200 diproses", "200 diproses"], "cek-lalu-tulis lolos dua kali")
    harap(jurnal_topup(t["order_id"]), 2, "dua jurnal")
    sql("SELECT count(*) AS jurnal_topup_bank FROM jurnal WHERE jenis = 'topup_bank'")
    catat("# Celah itu ada di antara membaca status dan menulis jurnal. Jeda lab melebarkannya supaya hasil tidak bergantung pada waktu; lebar celah tanpa jeda tidak diukur dan tidak menjadi klaim.")

    bagian("B. Versi ADR 34 tanpa dua lapis cadangan: event_id yang sama bersamaan tetap satu jurnal, hanya karena kunci utama")
    ganti_api(["-lab-tanpa-lapis", "status,kunci"],
              tampil="# server: ./api-t4 -lab -lab-tanpa-lapis status,kunci (ADR 34 tanpa dua lapis cadangan: status top-up hanya maju dan Idempotency-Key ke ledger dimatikan; kunci utama event_id tidak bisa dimatikan)")
    t2 = buat_topup(budi, 100_000)
    gateway_bayar(t2["order_id"])
    h = sorted(kirim_webhook(event_id="evt-2", order_id=t2["order_id"], kali=2, serentak=True))
    catat("dua kiriman bersamaan, event_id yang sama (diurutkan): " + ", ".join(h))
    harap(h, ["200 diproses", "200 ganda"], "kunci utama menahan event yang sama")
    harap(jurnal_topup(t2["order_id"]), 1, "satu jurnal")
    sql(f"SELECT event_id, hasil FROM webhook_event WHERE event_id = 'evt-2'")
    catat("# INSERT ... ON CONFLICT DO NOTHING: kiriman yang kalah mendapat nol baris dan menjawab ganda.")
    t3 = buat_topup(budi, 100_000)
    gateway_bayar(t3["order_id"])
    h = sorted(kirim_webhook(event_id="evt-3a", order_id=t3["order_id"]) + kirim_webhook(event_id="evt-3b", order_id=t3["order_id"]))
    catat("dua event berbeda untuk satu kejadian, berurutan, tanpa dua lapis cadangan: " + ", ".join(h))
    harap(h, ["200 diproses", "200 diproses"], "event berbeda lolos tanpa lapis cadangan")
    harap(jurnal_topup(t3["order_id"]), 2, "dua jurnal untuk dua event berbeda")
    catat("# Kunci utama hanya mengenali event yang sama. Dua Event berbeda untuk satu kejadian ditahan lapis lain (bagian urutan.txt G).")
    tulis("ganda-serentak.txt", "dua kiriman bersamaan: celah cek-lalu-tulis dan penahan satu-satunya kunci utama")


# ---------- tandatangan.txt (c, d, i) ----------

def naif_urai_ulang(rahasia, ts, tanda, body):
    """Verifikasi yang salah: JSON diurai, ditulis ulang, baru dihitung."""
    ulang = json.dumps(json.loads(body)).encode()
    return hmac.compare_digest(hmac_sah(rahasia, ts, ulang), tanda)


def gaya_hmac(rahasia):
    def periksa(k):
        return abs(k["sekarang"] - k["ts"]) <= 300 and hmac.compare_digest(hmac_sah(rahasia, k["ts"], k["body"]), k["tanda"])
    return periksa


def gaya_sha512(rahasia):
    def periksa(k):
        o = json.loads(k["body"])
        sah = hashlib.sha512((o["order_id"] + o["status"] + str(o["jumlah"]) + rahasia).encode()).hexdigest()
        return hmac.compare_digest(sah, k["tanda"])
    return periksa


def gaya_token(rahasia):
    return lambda k: hmac.compare_digest(rahasia, k["tanda"])


def rekam_tandatangan():
    siapkan()
    mulai(tampil="# server: ./api-t4 -lab -rahasia-webhook rahasia-gateway-lab-1; gateway tiruan menandatangani dengan rahasia yang sama")
    budi = login("budi@lestari.example", label="Budi")
    rx = Penerima()
    bagian("A. Tanda tangan atas byte mentah: isi sah dalam format lain lolos di api-t4, gagal bila diurai ulang sebelum diperiksa")
    t = buat_topup(budi, 200_000)
    gateway_bayar(t["order_id"])
    h = kirim_webhook(event_id="evt-c1", order_id=t["order_id"], body_cantik=True)
    catat("gateway menandatangani body berindentasi (JSON sah, format lain dari ringkas) dan mengirimnya ke api-t4: " + ", ".join(h))
    harap(h, ["200 diproses"], "body berindentasi lolos atas byte mentah")
    kirim_webhook(event_id="evt-c1", order_id=t["order_id"], body_cantik=True, url_target=rx.url)
    k = rx.diterima[0]
    baris_baru = k["body"].count(b"\n")
    catat(f"kiriman yang sama ke penerima di proses lab, untuk dilihat: body {len(k['body'])} byte, {baris_baru} baris baru")
    mentah = hmac.compare_digest(hmac_sah(RAHASIA1, k["ts"], k["body"]), k["tanda"])
    ulang = naif_urai_ulang(RAHASIA1, k["ts"], k["tanda"], k["body"])
    catat(f"verifikasi atas byte mentah: {'cocok' if mentah else 'tidak cocok'}")
    catat(f"verifikasi atas JSON yang diurai lalu ditulis ulang (json.dumps(json.loads(body))): {'cocok' if ulang else 'tidak cocok'}")
    harap((mentah, ulang), (True, False), "mentah lawan diurai ulang")
    catat("# Isi sah ditolak oleh verifikasi yang menulis ulang JSON-nya: spasi dan baris baru berbeda, jadi HMAC berbeda.")
    rx.tutup()

    bagian("B. Isi diubah, dan timestamp di luar toleransi 5 menit (Asumsi untuk tiruan): ditolak sebelum JSON diurai")
    hasil = []
    for nama, kw, harus in (("isi diubah sesudah ditandatangani (jumlah x10)", {"ubah_body": True}, "401 "),
                            ("timestamp 240 detik lalu (di dalam toleransi)", {"geser_detik": -240}, "200 diproses"),
                            ("timestamp 360 detik lalu (di luar toleransi)", {"geser_detik": -360}, "401 "),
                            ("timestamp 360 detik di depan", {"geser_detik": 360}, "401 ")):
        tt = buat_topup(budi, 50_000)
        gateway_bayar(tt["order_id"])
        r = kirim_webhook(event_id="evt-" + str(len(hasil) + 10), order_id=tt["order_id"], **kw)[0]
        catat(f"{nama}: {r.strip()}")
        harap(r, harus, nama)
        hasil.append((tt["order_id"], r))
    harap([jurnal_topup(o) for o, _ in hasil], [0, 1, 0, 0], "hanya yang sah menjurnal")
    catat("# Yang ditolak tidak menulis event dan tidak menjurnal; yang di dalam toleransi diproses. Di luar toleransi, kiriman lama yang diputar ulang gagal.")

    bagian("C. Rotasi rahasia (M30): gateway langsung memakai rahasia baru; api-t4 yang belum disamakan menolak semuanya")
    rr = buat_topup(budi, 70_000)
    gateway_bayar(rr["order_id"])
    s, _ = gw("/lab/rahasia", {"rahasia": RAHASIA2})
    harap(s, 204, "rotasi di gateway")
    r = kirim_webhook(event_id="evt-r1", order_id=rr["order_id"])[0]
    catat(f"1. gateway menandatangani dengan rahasia baru, api-t4 hanya tahu yang lama: {r.strip()}")
    harap(r, "401 ", "rahasia baru ditolak")
    ganti_api(["-rahasia-webhook", f"{RAHASIA2},{RAHASIA1}"],
              tampil="# server dinyalakan ulang: ./api-t4 -lab -rahasia-webhook <baru>,<lama> (yang pertama dipakai, yang kedua masa tumpang tindih)")
    r = kirim_webhook(event_id="evt-r1", order_id=rr["order_id"])[0]
    catat(f"2. masa tumpang tindih, kiriman bertanda rahasia baru: {r}")
    harap(r, "200 diproses", "rahasia baru diterima")
    r2o = buat_topup(budi, 70_000)
    gateway_bayar(r2o["order_id"])
    r = kirim_webhook(event_id="evt-r2", order_id=r2o["order_id"], rahasia=RAHASIA1)[0]
    catat(f"3. masa tumpang tindih, kiriman yang masih bertanda rahasia lama: {r}")
    harap(r, "200 diproses", "rahasia lama diterima selama tumpang tindih")
    ganti_api(["-rahasia-webhook", RAHASIA2],
              tampil="# server dinyalakan ulang: ./api-t4 -lab -rahasia-webhook <baru> (rotasi selesai, rahasia lama dicabut)")
    r3o = buat_topup(budi, 70_000)
    gateway_bayar(r3o["order_id"])
    r = kirim_webhook(event_id="evt-r3", order_id=r3o["order_id"], rahasia=RAHASIA1)[0]
    catat(f"4. sesudah rotasi selesai, kiriman bertanda rahasia lama: {r.strip()}")
    harap(r, "401 ", "rahasia lama dicabut")
    sql("SELECT event_id, hasil FROM webhook_event WHERE event_id IN ('evt-r1', 'evt-r2', 'evt-r3') ORDER BY event_id")
    catat("# Dokumentasi satu gateway nyata menahan rahasia lama aktif sampai 24 jam di sisi gateway dan menandatangani dengan keduanya; gateway tiruan tidak (rotasi langsung). Yang diuji di sini adalah sisi Rekeningo: dua rahasia diterima selama rotasi.")
    harap(satu("SELECT count(*) FROM webhook_event WHERE event_id IN ('evt-r1', 'evt-r2')"), 2, "dua event tercatat")

    bagian("D. Tiga gaya tanda tangan sebagai pembanding (pembanding murni: tiga fungsi verifikasi di run.py, bukan handler yang berjalan)")
    catat("# Gaya 1 = yang dijalankan api-t4 (bagian A sampai C): HMAC-SHA256 atas timestamp dan byte mentah, toleransi 5 menit.")
    catat("# Gaya 2 = SHA-512 atas field tertentu ditambah rahasia, tanpa timestamp (bentuk rumus satu gateway nyata, field lab: order_id, status, jumlah).")
    catat("# Gaya 3 = token statis di header, dibandingkan dengan rahasia ([perlu verifikasi]: bentuk satu gateway nyata tidak dibuka ulang).")
    sekarang = int(time.time())
    asli = json.dumps({"event_id": "evt-p1", "jumlah": 200000, "order_id": "TB-pembanding", "status": "settlement"}, separators=(",", ":"), sort_keys=True).encode()
    kunci = "rahasia-pembanding"

    def tanda(gaya, body, ts):
        o = json.loads(body)
        if gaya == 1:
            return hmac_sah(kunci, ts, body)
        if gaya == 2:
            return hashlib.sha512((o["order_id"] + o["status"] + str(o["jumlah"]) + kunci).encode()).hexdigest()
        return kunci

    periksa = {1: gaya_hmac(kunci), 2: gaya_sha512(kunci), 3: gaya_token(kunci)}
    diubah = lambda **kw: json.dumps({**json.loads(asli), **kw}, separators=(",", ":"), sort_keys=True).encode()
    serangan = [
        ("kiriman sah", lambda g: dict(body=asli, ts=sekarang, tanda=tanda(g, asli, sekarang), sekarang=sekarang), (True, True, True)),
        ("isi diubah: jumlah x10, tanda tangan lama", lambda g: dict(body=diubah(jumlah=2000000), ts=sekarang, tanda=tanda(g, asli, sekarang), sekarang=sekarang), (False, False, True)),
        ("field yang tidak ditandatangani diubah (event_id)", lambda g: dict(body=diubah(event_id="evt-lain"), ts=sekarang, tanda=tanda(g, asli, sekarang), sekarang=sekarang), (False, True, True)),
        ("kiriman sah diputar ulang 60 detik kemudian", lambda g: dict(body=asli, ts=sekarang, tanda=tanda(g, asli, sekarang), sekarang=sekarang + 60), (True, True, True)),
        ("kiriman sah diputar ulang 6 menit kemudian", lambda g: dict(body=asli, ts=sekarang, tanda=tanda(g, asli, sekarang), sekarang=sekarang + 360), (False, True, True)),
        ("isi sah diformat ulang (indentasi), tanda tangan lama", lambda g: dict(body=json.dumps(json.loads(asli), indent=2).encode(), ts=sekarang, tanda=tanda(g, asli, sekarang), sekarang=sekarang), (False, True, True)),
        ("pengirim tidak tahu rahasia", lambda g: dict(body=asli, ts=sekarang, tanda="0" * 128, sekarang=sekarang), (False, False, False)),
    ]
    baris = []
    for nama, bangun, harus in serangan:
        hasil = tuple(periksa[g](bangun(g)) for g in (1, 2, 3))
        harap(hasil, harus, nama)
        baris.append([nama] + ["diterima" if x else "ditolak" for x in hasil])
    tabel(["kejadian", "gaya 1 HMAC+timestamp", "gaya 2 SHA-512 field", "gaya 3 token statis"], baris)
    catat("# Gaya 1 menolak isi yang diubah dan kiriman di luar toleransi. Harganya: body diperiksa sebagai byte yang tiba, bukan sebagai JSON yang ditulis ulang (bagian A).")
    catat("# Gaya 2 tahan terhadap format ulang dan perubahan jumlah, tetapi tidak punya waktu: kiriman lama diterima kapan pun, dan field di luar rumus tidak terlindungi.")
    catat("# Gaya 3 tidak melindungi isi: token yang sama menyertai setiap kiriman, jadi isi yang diubah dan kiriman lama sama-sama diterima.")
    catat("# Kiriman sah yang diputar ulang 60 detik kemudian diterima oleh gaya 1 juga: di dalam toleransi, yang menahannya adalah event_id (ganda.txt).")
    tulis("tandatangan.txt", "tanda tangan atas byte mentah, toleransi waktu, rotasi rahasia, dan tiga gaya pembanding")


# ---------- retry.txt (e) ----------

def mainkan_jadwal(order_id, event_id, **kw):
    s, h = gw("/lab/jadwal", {"event_id": event_id, "order_id": order_id, "mulai": int(time.time()), **kw})
    harap(s, 200, "jadwal")
    return h


def rekam_retry():
    siapkan()
    d.mulai_gateway()
    bagian("A. Jadwal ulangan gateway tiruan per kode status; waktu diperankan (waktu maya pada tanda tangan), bukan ditunggu")
    jadwal_teks = None
    baris = []
    harus = {200: [0], 400: [0, 2, 12], 404: [0, 2, 12], 500: [0, 2], 503: [0, 2, 12, 42, 132], 401: [0, 2, 12, 42, 132, 342], 502: [0, 2, 12, 42, 132, 342]}
    for kode, menit in harus.items():
        rx = Penerima([kode])
        t0 = int(time.time())
        h = mainkan_jadwal("TB-jadwal", "evt-jadwal", url_target=rx.url, rahasia=RAHASIA1, mulai=t0, jumlah=1000)
        rx.tutup()
        jadwal_teks = h["jadwal"]
        harap([p["menit"] for p in h["percobaan"]], menit, f"menit kiriman untuk kode {kode}")
        harap([p["kode"] for p in h["percobaan"]], [kode] * len(menit), f"kode jawaban {kode}")
        harap([x["ts"] - t0 for x in rx.diterima], [m * 60 for m in menit], f"timestamp maya untuk kode {kode}")
        harap(all(hmac.compare_digest(hmac_sah(RAHASIA1, x["ts"], x["body"]), x["tanda"]) for x in rx.diterima), True, "tiap kiriman ditandatangani dengan timestamp-nya sendiri")
        harap(len({x["tanda"] for x in rx.diterima}), len(menit), "tanda tangan berbeda di tiap kiriman")
        baris.append([kode, len(menit), ", ".join(str(m) for m in menit), h["berhenti"]])
    catat(f"jeda antar percobaan (sejak percobaan sebelumnya): {jadwal_teks}")
    tabel(["kode jawaban penerima", "jumlah kiriman", "menit kiriman (sejak kiriman pertama)", "gateway berhenti karena"], baris)
    catat("# Jumlah ulangan per kode mengikuti dokumentasi satu gateway nyata (dibuka 2026-10-27): 2xx tanpa ulangan, 400 dan 404 dua kali, 500 sekali, 503 empat kali, lainnya lima kali.")
    catat("# Penolakan 401 masuk 'lainnya': lima ulangan, enam kiriman, 342 menit. Kode yang berganti di antara percobaan: dokumentasi tidak menjelaskan; tiruan memakai kode kiriman terakhir (Asumsi).")
    catat("# Tiruan tidak menggeser tiap percobaan secara acak (dokumentasi gateway itu menggeser), dan menandatangani ulang tiap percobaan dengan timestamp-nya (Asumsi untuk tiruan).")

    d.stop(PORT_GATEWAY)
    bagian("B. M30: gateway merotasi rahasia, api-t4 belum disamakan. Enam kiriman 401 lalu jadwal habis; webhook adalah satu-satunya jalan kabar")
    d.mulai_gateway()
    d.mulai_api(["-jam-lab"], db=DB,
                tampil="# server: ./api-t4 -lab -jam-lab -rahasia-webhook <lama> (waktu service diatur gateway tiruan lewat /lab/jam: jam maya per kiriman)")
    citra = login("citra@lestari.example", label="Citra")
    eko = login("pemakai2@publik.example", label="Eko")
    ct = buat_topup(citra, 500_000)
    gateway_bayar(ct["order_id"])
    s, _ = gw("/lab/rahasia", {"rahasia": RAHASIA2})
    harap(s, 204, "rotasi")
    catat("# Gateway merotasi rahasia dan langsung menandatangani dengan yang baru; menit 0 = kiriman pertama dengan rahasia baru (waktu maya).")
    h = mainkan_jadwal(ct["order_id"], "evt-m30-1", url_jam=f"http://127.0.0.1:{PORT}/lab/jam")
    tabel(["kiriman", "menit sejak kiriman pertama", "jawaban api-t4"], [[p["ke"], p["menit"], f"{p['kode']} {p['hasil']}".strip()] for p in h["percobaan"]])
    harap([p["kode"] for p in h["percobaan"]], [401] * 6, "enam kali 401")
    harap(h["berhenti"], "jadwal habis", "gateway berhenti")
    catat(f"gateway berhenti: {h['berhenti']} (342 menit sesudah kiriman pertama, ±5,7 jam)")
    sql("SELECT count(*) AS webhook_event FROM webhook_event")
    sql("SELECT status, jurnal_id FROM topup_bank")
    curl("POST", "/lab/jam", {"ms": 0}, port=PORT, tampil=False)
    catat("# Uang Rp500.000 sudah di bank, status top-up menunggu, tidak ada event dan tidak ada jurnal. Tidak ada kiriman lagi dari gateway; cek status dan rekonsiliasi (rekon.txt) yang menemukannya.")

    bagian("C. Disamakan sebelum jadwal habis: rahasia baru diterima pada kiriman ke-3 (menit 12), uang tercatat satu kali")
    et = buat_topup(eko, 200_000)
    gateway_bayar(et["order_id"])
    h1 = mainkan_jadwal(et["order_id"], "evt-m30-2", url_jam=f"http://127.0.0.1:{PORT}/lab/jam", sampai=2)
    catat("kiriman 1 dan 2: " + ", ".join(f"{p['kode']}" for p in h1["percobaan"]) + f" ({h1['berhenti']})")
    ganti_api(["-jam-lab", "-rahasia-webhook", f"{RAHASIA2},{RAHASIA1}"],
              tampil="# menit 2 sampai 12: rahasia di api-t4 disamakan, server dinyalakan ulang dengan <baru>,<lama>")
    h2 = mainkan_jadwal(et["order_id"], "evt-m30-2", url_jam=f"http://127.0.0.1:{PORT}/lab/jam", dari=3)
    tabel(["kiriman", "menit sejak kiriman pertama", "jawaban api-t4"], [[p["ke"], p["menit"], f"{p['kode']} {p['hasil']}".strip()] for p in h2["percobaan"]])
    harap([p["kode"] for p in h2["percobaan"]], [200], "kiriman ke-3 diterima")
    harap(h2["berhenti"], "diterima", "berhenti sesudah diterima")
    harap(jurnal_topup(et["order_id"]), 1, "satu jurnal")
    sql("SELECT status, jurnal_id IS NOT NULL AS ada_jurnal FROM topup_bank WHERE id = 2")
    curl("POST", "/lab/jam", {"ms": 0}, port=PORT, tampil=False)

    bagian("D. Pembanding untuk ADR 34: koneksi terpakai bila tiap kabar memegang satu koneksi selama W (Hitungan, Asumsi naskah; Tidak dijalankan)")
    aktif, per_user, puncak = 20_000, 0.25, 10
    lam = aktif * per_user / 86_400 * puncak
    kiriman_maks = 6 * lam
    koma = lambda x, n: f"{x:.{n}f}".replace(".", ",")
    catat(f"top-up puncak: 20.000 aktif x {koma(per_user, 2)} top-up per hari / 86.400 x {puncak} = {koma(lam, 3)} per detik")
    catat(f"batas atas kiriman bila semua kiriman gagal dan diulang sampai kiriman ke-6: 6 x {koma(lam, 3)} = {koma(kiriman_maks, 2)} per detik")
    for w in (0.3, 5):
        catat(f"W = {koma(w, 1) if w < 1 else int(w)} detik: L = λ x W = {koma(kiriman_maks, 2)} x {koma(w, 1) if w < 1 else int(w)} = {koma(kiriman_maks * w, 1)} koneksi")
    catat(f"pool pembayaran 10 (Asumsi): penuh sejak W > 9 ÷ {koma(kiriman_maks, 2)} = {koma(9 / kiriman_maks, 1)} detik")
    harap(round(kiriman_maks, 2), 3.47, "batas atas kiriman")
    harap(round(kiriman_maks * 5, 1), 17.4, "L pada W = 5 detik")
    harap(round(9 / kiriman_maks, 1), 2.6, "ambang W")
    catat("# Hitungan dari angka naskah, bukan rekaman: lab tidak menahan koneksi 5 detik per kabar. Pada laju puncak 0,579 per detik, W = 5 detik memakai L = 2,9.")
    harap(round(lam * 5, 1), 2.9, "L pada laju puncak")
    tulis("retry.txt", "jadwal ulangan gateway, M30 pada waktu maya, dan pembanding koneksi")


# ---------- urutan.txt (f, g) ----------

def dicek():
    s, h = gw("/lab/dicek", metode="GET")
    harap(s, 200, "dicek")
    return h["dicek"]


def rekam_urutan():
    siapkan()
    mulai(tampil="# server: ./api-t4 -lab; gateway tiruan: ./tiruan (menghitung berapa kali Rekeningo menanyakan keadaan satu order)")
    budi = login("budi@lestari.example", label="Budi")
    dina = login("pemakai1@publik.example", label="Dina")
    eko = login("pemakai2@publik.example", label="Eko")

    bagian("F1. Kabar menunggu datang sesudah dibayar: diparkir, status tidak mundur, tidak ada jurnal kedua")
    t = buat_topup(budi, 100_000)
    gateway_bayar(t["order_id"])
    harap(kirim_webhook(event_id="evt-f1", order_id=t["order_id"]), ["200 diproses"], "settlement")
    r = kirim_webhook(event_id="evt-f2", order_id=t["order_id"], status="pending")
    catat(f"kabar pending sesudah settlement: {r[0]}")
    harap(r, ["200 diparkir"], "pending diparkir")
    sql("SELECT status FROM topup_bank")
    sql("SELECT event_id, jenis, hasil FROM webhook_event ORDER BY event_id")
    harap(jurnal_topup(t["order_id"]), 1, "satu jurnal")
    catat(f"berapa kali api-t4 menanyakan order ini ke gateway: {dicek().get(t['order_id'], 0)}")
    harap(dicek().get(t["order_id"], 0), 0, "status akhir tidak ditanyakan ke gateway")
    catat("# Top-up yang sudah berstatus akhir tidak ditanyakan ke gateway: tidak ada yang bisa ditambah oleh jawabannya.")

    bagian("F2. Kabar diparkir pada top-up yang masih menunggu: dicek ke gateway di luar transaction (Dina, saldo Rp900.000, batas Rp1.000.000 untuk tingkat belum)")
    a = buat_topup(dina, 60_000)
    b = buat_topup(dina, 60_000)
    gateway_bayar(a["order_id"])
    gateway_bayar(b["order_id"])
    harap(kirim_webhook(event_id="evt-f3", order_id=a["order_id"]), ["200 diproses"], "top-up pertama")
    r = kirim_webhook(event_id="evt-f4", order_id=b["order_id"])
    catat(f"top-up kedua melewati batas tingkat sesudah lock: {r[0]}")
    harap(r, ["200 diparkir"], "diparkir karena batas")
    sql("SELECT jumlah, status FROM topup_bank WHERE akun_id = 40001 ORDER BY id")
    catat(f"berapa kali api-t4 menanyakan top-up kedua ke gateway: {dicek().get(b['order_id'], 0)} (di luar transaction, sesudah COMMIT kabar yang diparkir)")
    harap(dicek().get(b["order_id"], 0), 1, "top-up yang masih menunggu ditanyakan sekali")
    harap(dicek().get(a["order_id"], 0), 0, "top-up yang sudah dibayar tidak ditanyakan")
    catat("# Jawaban gateway: settlement, tetapi kredit tetap ditolak batas tingkat; status tetap menunggu dan uangnya tertahan di bank sampai tim risk memutuskan.")

    bagian("F3. Kabar terbalik: expire datang lebih dulu, settlement menyusul. Settlement diparkir, uang di bank tidak tercatat di ledger")
    e = buat_topup(eko, 50_000)
    gateway_bayar(e["order_id"], status="expire")
    harap(kirim_webhook(event_id="evt-f5", order_id=e["order_id"], status="expire"), ["200 diproses"], "expire")
    gateway_bayar(e["order_id"])   # pembayar membayar di detik terakhir: gateway mencatat settlement
    r = kirim_webhook(event_id="evt-f6", order_id=e["order_id"])
    catat(f"settlement sesudah expire: {r[0]}")
    harap(r, ["200 diparkir"], "settlement diparkir")
    sql("SELECT status, jurnal_id FROM topup_bank WHERE id = 4")
    harap(jurnal_topup(e["order_id"]), 0, "tidak ada jurnal")
    harap(dicek().get(e["order_id"], 0), 0, "status akhir tidak ditanyakan")
    catat("# Status kedaluwarsa itu akhir, jadi kabar settlement tidak memundurkannya dan tidak ditanyakan ke gateway. Uangnya ditemukan rekonsiliasi:")
    catat_job("-rekon <tanggal>", "-rekon", hari_ini())
    sql("SELECT jenis, selisih, status FROM insiden_rekon ORDER BY jenis, selisih")
    catat_job("-koreksi-rekon", "-koreksi-rekon")
    sql("SELECT jenis, selisih, status, jurnal_id IS NULL AS belum_dikoreksi FROM insiden_rekon ORDER BY jenis, selisih")
    catat("# Kedua insiden tetap terbuka: yang satu melewati batas tingkat, yang lain top-up kedaluwarsa. Keduanya perlu keputusan tim risk; job tidak mengkredit akun yang tidak boleh dikredit (PRD v4 belum menjawab pengembalian dana).")

    # G: tiga lapis penahan jurnal kedua untuk satu kejadian, dan umur Idempotency-Key.
    bagian("G. Dua Event berbeda untuk satu kejadian: tiga lapis menahan jurnal kedua (event_id, status top-up, Idempotency-Key = order_id di ledger, umur 24 jam)")
    varian = []

    def percobaan(nama, geser_jam, akun_token):
        t = buat_topup(akun_token, 10_000)
        gateway_bayar(t["order_id"])
        h1 = kirim_webhook(event_id=f"evt-g-{len(varian)}a", order_id=t["order_id"])[0]
        harap(h1, "200 diproses", f"{nama}: event pertama")
        if geser_jam:
            ms = int(time.time() * 1000) + geser_jam * 3_600_000
            curl("POST", "/lab/jam", {"ms": ms}, port=PORT, tampil=False)
        h2 = kirim_webhook(event_id=f"evt-g-{len(varian)}b", order_id=t["order_id"], geser_detik=geser_jam * 3600)[0]
        if geser_jam:
            curl("POST", "/lab/jam", {"ms": 0}, port=PORT, tampil=False)
        varian.append([nama, f"{geser_jam} jam", h2.replace("200 ", ""), jurnal_topup(t["order_id"])])

    kolom = ["kasus", "event kedua datang", "jawaban event kedua", "jurnal untuk satu order"]
    ganti_api(["-jam-lab"], tampil="# server: ./api-t4 -lab -jam-lab (ketiga lapis menyala; jam service bisa diputar lewat /lab/jam)")
    percobaan("1. semua lapis menyala", 0, budi)
    percobaan("2. semua lapis menyala, 25 jam kemudian", 25, budi)
    tabel(kolom, varian)
    ganti_api(["-jam-lab", "-lab-tanpa-lapis", "status"],
              tampil="# server: ./api-t4 -lab -jam-lab -lab-tanpa-lapis status (status top-up hanya maju dimatikan; tinggal event_id dan Idempotency-Key)")
    percobaan("3. tanpa lapis status, event kedua langsung", 0, budi)
    percobaan("4. tanpa lapis status, 25 jam kemudian (key sudah habis)", 25, budi)
    tabel(kolom, varian[2:])
    harap([v[2] for v in varian], ["ganda", "ganda", "ganda", "diproses"], "jawaban event kedua")
    harap([v[3] for v in varian], [1, 1, 1, 2], "jurnal per kasus")
    catat("# Kasus 1 dan 2: status top-up yang hanya maju menahannya, juga sesudah 24 jam. Kasus 3: tanpa itu, Idempotency-Key = order_id menahannya selama key hidup.")
    catat("# Kasus 4: key hidup 24 jam; sesudahnya key lama diperlakukan belum pernah ada, dan tanpa status top-up jurnal kedua lolos. Karena itu hanya status top-up yang menahan sesudah 24 jam.")
    tulis("urutan.txt", "kabar yang datang mundur, dan tiga lapis penahan jurnal kedua")


# ---------- rekon.txt (h) ----------

def daftar_insiden():
    sql("SELECT i.jenis, i.selisih, i.status, j.jenis AS jenis_jurnal, i.topup_id IS NOT NULL AS ada_topup FROM insiden_rekon i LEFT JOIN jurnal j ON j.id = i.jurnal_id ORDER BY i.jenis, i.selisih")


def invarian():
    jurnal_tak_seimbang = satu("SELECT count(*) FROM (SELECT jurnal_id FROM posting GROUP BY jurnal_id HAVING sum(jumlah) <> 0) x")
    cache_beda = satu("SELECT count(*) FROM buku b WHERE b.saldo_cache <> coalesce((SELECT sum(jumlah) FROM posting p WHERE p.buku_id = b.id), 0)")
    catat(f"jurnal yang jumlah posting-nya bukan nol: {jurnal_tak_seimbang}; buku yang saldo_cache-nya beda dari jumlah posting: {cache_beda}")
    harap((jurnal_tak_seimbang, cache_beda), (0, 0), "invarian ledger")


def sidik_posting(sampai):
    return satu(f"SELECT md5(string_agg(id || ':' || jurnal_id || ':' || buku_id || ':' || jumlah, ',' ORDER BY id)) FROM posting WHERE id <= {sampai}")


def rekam_rekon():
    siapkan()
    mulai(tampil="# server: ./api-t4 -lab; gateway tiruan: ./tiruan")
    budi = login("budi@lestari.example", label="Budi")
    citra = login("citra@lestari.example", label="Citra")
    dina = login("pemakai1@publik.example", label="Dina")
    eko = login("pemakai2@publik.example", label="Eko")

    bagian("A. Job cek status: top-up menunggu lebih dari 30 menit (Asumsi) ditanyakan ke gateway; webhook Citra tidak pernah datang")
    ct = buat_topup(citra, 500_000)
    gateway_bayar(ct["order_id"])
    catat("# Citra sudah membayar di bank (gateway: settlement); gateway tidak mengirim webhook.")
    harap(diperiksa_cek("-cek-topup   # bawaan -cek-umur 30m, top-up baru dibuat"), 0, "top-up baru belum ditanyakan")
    sql("UPDATE topup_bank SET dibuat = now() - interval '29 minutes'")
    catat("# Lab saja: umur top-up diputar mundur 29 menit lewat UPDATE kolom `dibuat` oleh pemilik schema (bukan posting atau saldo). Batas 30 menit belum terlewati.")
    harap(diperiksa_cek("-cek-topup   # bawaan -cek-umur 30m, umur 29 menit"), 0, "umur 29 menit belum ditanyakan")
    sql("UPDATE topup_bank SET dibuat = now() - interval '31 minutes'")
    catat("# Sama, diputar mundur 31 menit: sudah melewati batas 30 menit.")
    harap(diperiksa_cek("-cek-topup   # bawaan -cek-umur 30m, umur 31 menit"), 1, "umur 31 menit ditanyakan")
    harap(satu("SELECT status FROM topup_bank WHERE id = 1"), "dibayar", "cek status mengkredit")
    harap(jurnal_topup(ct["order_id"]), 1, "satu jurnal")
    sql("SELECT status, jurnal_id IS NOT NULL AS ada_jurnal FROM topup_bank WHERE id = 1")

    bagian("B. Rekonsiliasi harian menemukan lima selisih; -koreksi-rekon menutup yang bisa lewat jurnal normal")
    t1 = buat_topup(budi, 15_000)           # tidak_di_ledger: dibayar di bank, webhook hilang
    gateway_bayar(t1["order_id"])
    t2a = buat_topup(dina, 60_000)          # Dina: dua top-up, yang kedua melewati batas tingkat
    t2b = buat_topup(dina, 60_000)
    for t in (t2a, t2b):
        gateway_bayar(t["order_id"])
    harap(kirim_webhook(event_id="evt-b-2a", order_id=t2a["order_id"]), ["200 diproses"], "Dina pertama")
    harap(kirim_webhook(event_id="evt-b-2b", order_id=t2b["order_id"]), ["200 diparkir"], "Dina kedua diparkir")
    t3 = buat_topup(budi, 20_000)           # jumlah_beda: dikredit 20.000, gateway menerima 25.000
    gateway_bayar(t3["order_id"])
    harap(kirim_webhook(event_id="evt-b-3", order_id=t3["order_id"]), ["200 diproses"], "t3 dikredit")
    gateway_bayar(t3["order_id"], jumlah=25_000)
    t4 = buat_topup(budi, 40_000)           # tidak_di_gateway: settlement di tanggal lain
    gateway_bayar(t4["order_id"], tanggal="2020-01-01")
    harap(kirim_webhook(event_id="evt-b-4", order_id=t4["order_id"]), ["200 diproses"], "t4 dikredit")
    t5 = buat_topup(eko, 30_000)            # tidak_di_gateway: gateway kemudian membatalkan settlement
    gateway_bayar(t5["order_id"])
    harap(kirim_webhook(event_id="evt-b-5", order_id=t5["order_id"]), ["200 diproses"], "t5 dikredit")
    gateway_bayar(t5["order_id"], status="failure")
    catat("# t1: dibayar di bank, webhook hilang. t2b (Dina): kabar diparkir karena batas Rp1.000.000. t3: dikredit Rp20.000, gateway menerima Rp25.000.")
    catat("# t4: dikredit hari ini, gateway menulis settlement tanggal lain (jumlah sama). t5: dikredit, lalu gateway membatalkan (status failure; Asumsi lab).")
    catat_job("-rekon <tanggal>", "-rekon", hari_ini())
    daftar_insiden()
    harap(satu("SELECT count(*) FROM insiden_rekon"), 5, "lima insiden")
    sebelum = satu("SELECT max(id) FROM posting")
    sidik = sidik_posting(sebelum)
    n_sebelum = satu("SELECT count(*) FROM posting")
    nama_akun = "SELECT a.nama, b.saldo_cache AS saldo FROM akun a JOIN buku b ON b.akun_id = a.id WHERE a.id IN (419, 40001, 40002, 504) ORDER BY a.id"
    catat("# Saldo sebelum koreksi:")
    s_awal = {r[0]: r[1] for r in sql(nama_akun)}
    catat_job("-koreksi-rekon", "-koreksi-rekon")
    daftar_insiden()
    catat("# Saldo sesudah koreksi:")
    s_akhir = {r[0]: r[1] for r in sql(nama_akun)}
    harap({k: s_akhir[k] - s_awal[k] for k in s_awal}, {"Budi": 15_000 + 5_000, "Citra": 0, "Dina": 0, "Eko": -30_000}, "perubahan saldo")
    harap(satu("SELECT count(*) FROM insiden_rekon WHERE status = 'terbuka'"), 1, "satu insiden tetap terbuka")
    harap(sorted(r[0] for r in sql("SELECT j.jenis FROM insiden_rekon i JOIN jurnal j ON j.id = i.jurnal_id", tampil=False)), ["pembalik", "topup_bank", "topup_bank"], "jurnal koreksi")
    harap(satu("SELECT count(*) FROM posting") - n_sebelum, 6, "tiga jurnal baru, enam posting baru")
    harap(sidik_posting(sebelum), sidik, "posting lama tidak berubah")
    catat(f"posting yang sudah ada sebelum koreksi (id sampai nomor terakhir): sidik MD5 sama sesudah koreksi: ya; posting baru: 6 (tiga jurnal, dua posting masing-masing)")
    invarian()
    catat("# t1 dikredit lewat jurnal top-up (fungsi yang sama dengan webhook). t3: selisih Rp5.000 dikredit lewat jurnal kedua. t5: kreditnya dibalik lewat jurnal pembalik (cermin jurnal asal).")
    catat("# t4 ditutup tanpa jurnal: gateway menjawab settlement dengan jumlah yang sama, hanya tanggalnya lain. t2b tetap terbuka: akun melewati batas tingkat, perlu keputusan tim risk.")
    catat("# Tidak ada UPDATE pada posting maupun saldo_cache oleh job: posting hanya bertambah (trigger append-only), saldo_cache berubah hanya oleh jurnal baru.")
    catat_job("-koreksi-rekon   # dijalankan lagi", "-koreksi-rekon")
    daftar_insiden()
    harap(satu("SELECT count(*) FROM posting") - n_sebelum, 6, "job kedua tidak menulis jurnal")

    bagian("C. Dua job bersamaan: satu jurnal per insiden (insiden dikunci FOR UPDATE, yang sudah selesai dilewati)")
    baru = []
    for jumlah in (11_000, 12_000, 13_000):
        t = buat_topup(budi, jumlah)
        gateway_bayar(t["order_id"])
        baru.append(t)
    catat_job("-rekon <tanggal>", "-rekon", hari_ini())
    harap(satu("SELECT count(*) FROM insiden_rekon WHERE status = 'terbuka' AND jenis = 'tidak_di_ledger'"), 4, "tiga baru dan t2b")
    s_budi = saldo(419)
    hasil = [None, None]

    def jalan(i):
        r = subprocess.run([str(d.BIN), "-koreksi-rekon", *d.args_t4()], env=dict(d.ENV, DATABASE_URL=DB), capture_output=True, text=True)
        harap(r.returncode, 0, "exit job bersamaan")
        hasil[i] = r.stdout.strip()

    th = [threading.Thread(target=jalan, args=(i,)) for i in (0, 1)]
    for t in th:
        t.start()
    for t in th:
        t.join(60)
    dikoreksi = sum(int(re.search(r"dikoreksi lewat jurnal (\d+)", x).group(1)) for x in hasil)
    catat(f"dua job bersamaan: jumlah insiden yang dikoreksi oleh keduanya bersama = {dikoreksi} (pembagian antar job bergantung pada waktu dan tidak direkam)")
    harap(dikoreksi, 3, "tiga insiden, masing-masing satu job")
    harap([jurnal_order(t["order_id"]) for t in baru], [1, 1, 1], "satu jurnal per order")
    harap(saldo(419) - s_budi, 36_000, "saldo Budi naik satu kali per insiden")
    sql("SELECT count(*) AS insiden_tidak_di_ledger_terbuka FROM insiden_rekon WHERE status = 'terbuka' AND jenis = 'tidak_di_ledger'")
    invarian()
    tulis("rekon.txt", "cek status, rekonsiliasi harian, dan koreksi insiden lewat jurnal normal")


# ---------- testing.txt ----------

def go_test(*args, env, cwd=d.HERE):
    r = subprocess.run(["go", *args], cwd=cwd, env=env, capture_output=True, text=True)
    teks = (r.stdout + r.stderr).replace("\t", "  ")
    teks = re.sub(r" \(\d+\.\d+s\)", "", teks)
    teks = re.sub(r"^(ok|FAIL)(\s+\S+)\s+[\d.]+s", r"\1\2", teks, flags=re.M)
    teks = re.sub(r"^(ok\s+\S+)\s+\(cached\)", r"\1", teks, flags=re.M)
    teks = re.sub(r"^\d{4}/\d\d/\d\d \d\d:\d\d:\d\d(?:\.\d+)? ", "", teks, flags=re.M)
    return r.returncode, teks.rstrip()


POLA_TES = "Koreksi|Webhook|Rekon|TopupBank|CekTopup|TandaTangan|Jadwal|Jeda|JumlahUlang|Rotasi|Lapisan"


def rekam_testing():
    d.buat_schema(TES)
    tes_db = d.db_pemilik(TES, "t4-webhook-tes")
    env = dict(d.ENV, TEST_DATABASE_URL=tes_db, LAB_TES_SCHEMA=TES)
    bagian("A. go vet, lalu tes Go milik jalur webhook (service dengan PostgreSQL sungguhan, dan gateway tiruan) di schema " + TES)
    rc, teks = go_test("vet", "./cmd/tiruan", "./internal/service", "./internal/repo", env=env)
    catat("$ go vet ./cmd/tiruan ./internal/service ./internal/repo")
    catat(teks or "(tanpa temuan)")
    catat(f"# exit status {rc}")
    harap(rc, 0, "go vet")
    rc, teks = go_test("test", "-v", "-count=1", "-p", "1", "-run", POLA_TES, "./cmd/tiruan", "./internal/service", env=env)
    teks = "\n".join(l for l in teks.splitlines() if not l.startswith(("?", "=== RUN", "=== PAUSE", "=== CONT")))
    catat(f"$ TEST_DATABASE_URL=<pemilik, schema {TES}> go test -v -count=1 -p 1 -run '{POLA_TES}' ./cmd/tiruan ./internal/service")
    catat(teks)
    catat(f"# exit status {rc}")
    if rc != 0:
        print("\n".join(l for l in teks.splitlines() if "FAIL" in l or "panic" in l or l.startswith("    ")), file=sys.stderr)
    harap(rc, 0, "go test")
    harap("--- SKIP" in teks, False, "tes dilewati")
    harap(len(re.findall(r"^--- FAIL", teks, flags=re.M)), 0, "tes yang gagal")
    harap(len(re.findall(r"^--- PASS", teks, flags=re.M)) >= 30, True, "jumlah tes yang lulus")
    tulis("testing.txt", "tes Go jalur webhook: tanda tangan, event, lapis penahan, cek status, rekonsiliasi, koreksi, dan jadwal ulangan")


BAGIAN = {"ganda": [rekam_ganda, rekam_ganda_serentak], "tandatangan": [rekam_tandatangan], "retry": [rekam_retry],
          "urutan": [rekam_urutan], "rekon": [rekam_rekon], "testing": [rekam_testing]}


def main():
    pilih = sys.argv[1:] or list(BAGIAN)
    for p in pilih:
        if p not in BAGIAN:
            gagal(f"bagian {p!r} tidak dikenal; pilihan: {', '.join(BAGIAN)}")
    d.bangun()
    for p in pilih:
        for f in BAGIAN[p]:
            d.stop(PORT)
            d.stop(PORT_GATEWAY)
            f()
            for port in list(d.server):
                d.stop(port)


if __name__ == "__main__":
    main()
