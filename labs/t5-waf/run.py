"""Rekam lab t5-waf: pintu untuk mitra POS di tepi (M50, ADR 56): Coraza v3.8.1 dengan OWASP CRS v4.30.0, kuota per mitra di
Redis, kunci API dan HMAC-SHA256 bertimestamp per mitra, dan Idempotency-Key wajib untuk permintaan yang mengubah data.

Server, skema, dan data awal adalah milik `labs/api-t5` (`dasar_t5.py`, `cmd/api`), bukan salinan. Yang baru di api-t5:
rute `/pos/v1/...` (flag `-pos-rahasia`) dan mode rentan `pos-tanpa-cakupan`. Yang baru di folder ini: `gerbang/` (gerbang
tiruan, modul Go sendiri), `crs/` (aturan CRS lokal), `payload.json` (masukan uji WAF), `run.py`, dan rekaman. POS tiruan adalah
klien Python di berkas ini. Semua berjalan di mesin lab dan hanya memanggil alamat 127.0.0.1; tidak ada perintah yang bisa
diarahkan ke target lain. Serangan volumetrik lapisan 3 dan 4 Tidak dijalankan.

Setiap bagian membuat ulang schema dan data awal dari nol, jadi output/*.txt tidak bergantung pada urutan bagian dan rekaman
ulang identik per byte (make cek). Jam bucket kuota dibekukan dan dimajukan lewat /lab/jam (hanya lab), jadi hitungan token
tepat; waktu sungguhan tidak ditunggu. Lab gagal keras bila hasilnya meleset.

    make -C labs/t5-waf run                     (butuh: Docker, Go; PostgreSQL lewat labs/b3-race, Redis lewat labs/b9-cache)
    make -C labs/t5-waf run BAGIAN=kuota        (satu bagian: kuota waf tandatangan testing)
"""
import collections, concurrent.futures, hashlib, hmac, http.client, json, os, pathlib, re, secrets, shutil, subprocess, sys, tempfile, time

import redis

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "api-t5"))
import dasar_t5 as d  # noqa: E402
from dasar_t5 import bagian, catat, gagal, harap  # noqa: E402
from lab_env import REDIS_PORT, port_lab  # noqa: E402

LAB = "t5-waf"
SCHEMA = "tahap5_waf"
SP = ",".join(d.SCHEMA_LAYANAN)
d.OUT = HERE / "output"
GERBANG = HERE / "gerbang"
CRS = HERE / "crs"
DASAR_GERBANG = 18330
PORT_GERBANG = port_lab(DASAR_GERBANG)
HOST = "pos.rekeningo.example"          # Host bernama: Host berupa alamat IP menambah 3 poin anomali di CRS (920350)
RAHASIA_HULU = "rahasia-gerbang-lab"    # data lab, bukan secret: yang dibaca api-t5 dari gerbang
KERJA = pathlib.Path(tempfile.mkdtemp(prefix="t5-waf-"))   # biner dan rahasia tanda tangan: di luar repo, dihapus di akhir
BIN_GERBANG = KERJA / "gerbang"
BERKAS_RAHASIA = KERJA / "rahasia.json"
PAYLOAD = json.loads((HERE / "payload.json").read_text())
MERCHANT_A = list(range(30001, 30020))   # 19 merchant milik mitra A
MERCHANT_B = 30020                       # satu merchant milik mitra B
GAGAL_MAKS = 5

mitra = {}        # "A"/"B" -> {"id", "kunci", "rahasia"}
_qr = {}
_urut_key = [0]


def versi_go():
    go = subprocess.run(["go", "version"], cwd=d.HERE, capture_output=True, text=True).stdout.split()
    return go[2] if len(go) > 2 else "go?"


d.versi_alat = versi_go


def versi_dari(berkas, pola):
    return re.search(pola, berkas.read_text()).group(1)


CORAZA = versi_dari(GERBANG / "go.mod", r"corazawaf/coraza/v3 (v[\d.]+)")
CRS_VERSI = versi_dari(CRS / "rules/REQUEST-901-INITIALIZATION.conf", r"ver:'OWASP_CRS/([\d.]+)'")


def tulis(nama, judul):
    for port in list(d.server):
        d.stop(port)
    pg = d.satu("SHOW server_version", "public")
    rv = redis.Redis(port=REDIS_PORT).info()["redis_version"]
    kepala = [f"# Lab {LAB} · {judul}",
              f"# PostgreSQL {pg} · {versi_go()} · Coraza v{CORAZA.lstrip('v')} · OWASP CRS v{CRS_VERSI} (paranoia level 1, ambang anomali 5) · Redis {rv} · enam schema service",
              f"# Gerbang Go di 127.0.0.1:{DASAR_GERBANG}, api-t5 di 127.0.0.1:{d.DASAR}. Rekaman dari database bersih: make -C labs/{LAB} run."]
    d.OUT.mkdir(exist_ok=True)
    (d.OUT / nama).write_text("\n".join(l.rstrip() for l in "\n".join(kepala + d.log).split("\n")) + "\n")
    print("ditulis:", f"labs/{LAB}/output/{nama}")
    d.log.clear()


def tampil(teks=""):
    teks = d.WAKTU.sub("<waktu>", teks)
    for u in d.UUID.findall(teks):
        if u in _qr:
            teks = teks.replace(u, _qr[u])
    catat(teks)


def label_qr(uuid, nama=None):
    _qr.setdefault(uuid, nama or f"<qr {len(_qr) + 1}>")
    return uuid


# ---------- persiapan ----------

def bangun():
    d.bangun()
    subprocess.run(["go", "build", "-o", str(BIN_GERBANG), "."], cwd=GERBANG, check=True)


def periksa_crs():
    """Berkas CRS di crs/ harus sama dengan daftar hash yang di-commit (SHA256SUMS): aturan yang diubah diam-diam menggagalkan lab."""
    r = subprocess.run(["shasum", "-a", "256", "-c", "SHA256SUMS"], cwd=CRS, capture_output=True, text=True)
    harap(r.returncode, 0, "berkas CRS cocok dengan SHA256SUMS: " + r.stdout[-300:] + r.stderr[-300:])


def sidik(kunci):
    return hashlib.sha256(kunci.encode()).hexdigest()


def siapkan():
    """Schema bersih, 30 tabel, data awal, enam schema service, lalu dua mitra POS dengan kunci dan rahasia acak."""
    d.LAYANAN["aktif"] = False
    d.buat_schema(SCHEMA)
    d.seed(SCHEMA)
    d.pecah_layanan(SCHEMA)
    _qr.clear()
    _urut_key[0] = 0
    mitra.clear()
    with d.sambung(SP) as c:
        for nama, label in (("Mitra POS A", "A"), ("Mitra POS B", "B")):
            kunci, rahasia = "kunci-" + secrets.token_hex(12), secrets.token_hex(16)
            (mid,) = c.execute("INSERT INTO mitra_pos (nama, kunci_hash, kuota_per_detik) VALUES (%s, %s, 100) RETURNING id",
                               (nama, sidik(kunci))).fetchone()
            mitra[label] = {"id": mid, "kunci": kunci, "rahasia": rahasia}
        c.execute("UPDATE akun SET mitra_pos_id = %s WHERE id = ANY(%s)", (mitra["A"]["id"], MERCHANT_A))
        c.execute("UPDATE akun SET mitra_pos_id = %s WHERE id = %s", (mitra["B"]["id"], MERCHANT_B))
    BERKAS_RAHASIA.write_text(json.dumps({str(m["id"]): m["rahasia"] for m in mitra.values()}))


def mulai_semua(rentan_api="", rentan_gerbang="", tahan=None):
    """api-t5 dengan rute POS, lalu gerbang di depannya. Jam bucket gerbang dibekukan (hanya lab)."""
    args = ["-pos-rahasia", RAHASIA_HULU] + (["-rentan", rentan_api] if rentan_api else [])
    d.mulai_api(args=args)
    awalan = f"t5waf-{os.getpid()}-{time.time_ns()}:"
    g = ["-hulu", f"http://127.0.0.1:{d.PORT}", "-crs", str(CRS), "-rahasia-berkas", str(BERKAS_RAHASIA), "-rahasia-hulu", RAHASIA_HULU,
         "-redis", f"127.0.0.1:{REDIS_PORT}", "-awalan", awalan, "-gagal-maks", str(GAGAL_MAKS), "-lab", "-lab-jam-beku"]
    if rentan_gerbang:
        g += ["-rentan", rentan_gerbang]
    if tahan:
        g += ["-lab-tahan", tahan]
    d.mulai(BIN_GERBANG, PORT_GERBANG, g, db=d.db_role("t5_merchant", "t5-waf-gerbang"))


def hentikan_semua():
    for port in (PORT_GERBANG, d.PORT):
        d.stop(port)


def jam_maju(ms):
    c = http.client.HTTPConnection("127.0.0.1", PORT_GERBANG, timeout=5)
    c.request("POST", "/lab/jam", json.dumps({"maju_ms": ms}), {"Content-Type": "application/json"})
    r = c.getresponse()
    r.read()
    harap(r.status, 204, "jam lab dimajukan")


# ---------- POS tiruan ----------

def key_baru():
    _urut_key[0] += 1
    return f'"aaaa0000-0000-4000-8000-{_urut_key[0]:012d}"'


def tandai(rahasia, ts, method, uri, body):
    m = hmac.new(rahasia.encode(), f"{ts}.{method}.{uri}.".encode() + body, hashlib.sha256)
    return m.hexdigest()


def kirim(label, method, uri, isi=None, kunci=None, rahasia=None, selisih=0, key="otomatis", kepala=None, tanda="otomatis", port=PORT_GERBANG,
          ubah_isi=None):
    """Satu permintaan dari POS tiruan ke gerbang (atau ke port lain). selisih: detik yang ditambahkan ke timestamp (negatif = lama).
    key: 'otomatis' (POST dapat key baru), None (tanpa), atau nilai. Mengembalikan (status, kepala jawaban, body teks)."""
    m = mitra[label] if label else None
    kunci = kunci if kunci is not None else (m["kunci"] if m else "")
    rahasia = rahasia if rahasia is not None else (m["rahasia"] if m else "")
    body = isi.encode() if isi is not None else b""
    ts = int(time.time()) + selisih
    h = {"Host": HOST, "User-Agent": "pos-tiruan/1.0", "Accept": "application/json"}
    if kunci:
        h["X-Kunci-Api"] = kunci
    if tanda == "otomatis":
        h["X-Waktu"] = str(ts)
        h["X-Tanda-Tangan"] = tandai(rahasia, ts, method, uri, body)
    elif tanda is not None:
        h["X-Waktu"] = str(ts)
        h["X-Tanda-Tangan"] = tanda
    if isi is not None:
        h["Content-Type"] = "application/json"
    if method == "POST" and key == "otomatis":
        h["Idempotency-Key"] = key_baru()
    elif key not in (None, "otomatis"):
        h["Idempotency-Key"] = key
    h.update(kepala or {})
    c = http.client.HTTPConnection("127.0.0.1", port, timeout=10)
    c.request(method, uri, body if isi is not None else None, h)
    r = c.getresponse()
    teks = r.read().decode()
    c.close()
    return r.status, {k.lower(): v for k, v in r.getheaders()}, teks


def tipe(teks):
    try:
        return json.loads(teks).get("type", "").removeprefix("/problems/")
    except Exception:
        return ""


def ringkas(status, kepala, teks):
    t = tipe(teks)
    s = f"{status}" + (f" {t}" if t else "")
    if "x-lab-waf-aturan" in kepala:
        s += f"  [aturan CRS: {kepala['x-lab-waf-aturan']}]"
    if "retry-after" in kepala:
        s += f"  [Retry-After: {kepala['retry-after']}]"
    return s


def tampilkan(judul, status, kepala, teks, penuh=False):
    tampil(f"$ {judul}")
    tampil("  -> " + ringkas(status, kepala, teks))
    if penuh:
        tampil("     " + teks.strip())


def jumlah_qr(merchant):
    with d.sambung(SP) as c:
        return c.execute("SELECT count(*) FROM qr WHERE akun_id = %s", (merchant,)).fetchone()[0]


def banjir(pekerjaan, pekerja=16):
    """Jalankan daftar pekerjaan (fungsi tanpa argumen) dengan paling banyak `pekerja` thread; hasil menurut urutan pekerjaan."""
    with concurrent.futures.ThreadPoolExecutor(max_workers=pekerja) as ex:
        return list(ex.map(lambda f: f(), pekerjaan))


# ---------- bagian A: kuota per mitra (a) ----------

def buat_qr_awal(label, merchant):
    s, _, teks = kirim(label, "POST", f"/pos/v1/merchant/{merchant}/qr", '{"nominal":25000,"referensi":"pesanan awal"}')
    harap(s, 201, f"QR awal untuk merchant {merchant}")
    return label_qr(json.loads(teks)["id"], "<qr kasir>")


def rekam_kuota():
    bagian("A. Kuota per mitra: 100 per detik (token bucket di Redis) dan 20 permintaan berjalan, jam bucket dibekukan")
    siapkan()
    mulai_semua()
    qa = buat_qr_awal("A", 30001)
    qb = buat_qr_awal("B", MERCHANT_B)
    uri_a, uri_b = f"/pos/v1/merchant/30001/qr/{qa}", f"/pos/v1/merchant/{MERCHANT_B}/qr/{qb}"
    tampil("Mitra A (POS yang mengulang tanpa jeda) dan mitra B memakai kuota 100 per detik (kolom mitra_pos.kuota_per_detik).")
    tampil("Jam bucket dibekukan: 600 permintaan di bawah dihitung dalam SATU detik. Laju sungguhan mesin ini tidak diukur.")
    tampil("Pekerjaan: 600 GET status dari A, 20 GET status dari B diselipkan di antaranya, 16 thread.")

    def hitung(hasil, label):
        k = collections.Counter(s for l, (s, _, t) in hasil if l == label)
        return k

    def satu_pekerjaan(label, uri):
        return lambda: (label, kirim(label, "GET", uri))

    def tarik(mode):
        jam_maju(2000)   # bucket penuh lagi (kapasitas 100); isi ulang tidak lebih dari kapasitas
        pek = []
        for i in range(600):
            pek.append(satu_pekerjaan("A", uri_a))
            if i % 30 == 29:
                pek.append(satu_pekerjaan("B", uri_b))
        return banjir(pek)

    hasil = tarik("benar")
    ka, kb = hitung(hasil, "A"), hitung(hasil, "B")
    tampil(f"mitra A: {sum(ka.values())} permintaan -> 200: {ka[200]}, 429: {ka[429]}")
    tampil(f"mitra B: {sum(kb.values())} permintaan -> 200: {kb[200]}, 429: {kb[429]}")
    harap((ka[200], ka[429], kb[200], kb[429]), (100, 500, 20, 0), "kuota per mitra: A tepat 100, B tidak terkena")
    s, kep, teks = kirim("A", "GET", uri_a)
    tampilkan("satu permintaan A lagi sesudah bucket habis", s, kep, teks, penuh=True)
    harap((s, tipe(teks), kep.get("retry-after")), (429, "kuota-terlampaui", "1"), "429 kuota dengan Retry-After")
    s, kep, teks = kirim("B", "GET", uri_b)
    tampilkan("satu permintaan B pada saat yang sama", s, kep, teks)
    harap(s, 200, "mitra B tetap 200")

    tampil("\n# Isi ulang menurut jam: 500 ms berarti 50 token; 60 permintaan A -> 50 lolos")
    jam_maju(500)
    ks = collections.Counter(s for s, _, _ in banjir([lambda: kirim("A", "GET", uri_a) for _ in range(60)]))
    tampil(f"mitra A: 60 permintaan -> 200: {ks[200]}, 429: {ks[429]}")
    harap((ks[200], ks[429]), (50, 10), "isi ulang 500 ms = 50 token")
    tampil("# Sesudah 10 detik bucket tidak melebihi kapasitas: 130 permintaan A -> 100 lolos")
    jam_maju(10_000)
    ks = collections.Counter(s for s, _, _ in banjir([lambda: kirim("A", "GET", uri_a) for _ in range(130)]))
    tampil(f"mitra A: 130 permintaan -> 200: {ks[200]}, 429: {ks[429]}")
    harap((ks[200], ks[429]), (100, 30), "kapasitas bucket 100")
    hentikan_semua()

    bagian("B. Permintaan berjalan: batas 20 per mitra; hulu ditahan 1,5 detik (-lab-tahan) supaya permintaan bertumpuk")
    mulai_semua(tahan="1500ms")
    jam_maju(2000)
    tampil("25 GET status dari A dimulai bersamaan, dan satu dari B.")
    pek = [lambda: ("A", kirim("A", "GET", uri_a)) for _ in range(25)] + [lambda: ("B", kirim("B", "GET", uri_b))]
    hasil = banjir(pek, pekerja=26)
    ka, kb = hitung(hasil, "A"), hitung(hasil, "B")
    jenis = collections.Counter(tipe(t) for l, (s, _, t) in hasil if l == "A" and s == 429)
    tampil(f"mitra A: 25 permintaan -> 200: {ka[200]}, 429: {ka[429]} (alasan: {dict(jenis)})")
    tampil(f"mitra B: 1 permintaan -> 200: {kb[200]}, 429: {kb[429]}")
    harap((ka[200], ka[429], dict(jenis), kb[200]), (20, 5, {"terlalu-banyak-berjalan": 5}, 1), "20 berjalan per mitra")
    s, _, teks = kirim("A", "GET", uri_a)
    tampil(f"satu permintaan A sesudah semuanya selesai -> {s} (slot sudah dilepas)")
    harap(s, 200, "slot berjalan dilepas")
    hentikan_semua()

    bagian("C. Mode rentan kuota-bersama: satu bucket untuk semua mitra (M50 seperti terjadi)")
    mulai_semua(rentan_gerbang="kuota-bersama")
    jam_maju(2000)
    hasil = tarik("rentan")
    ka, kb = hitung(hasil, "A"), hitung(hasil, "B")
    tampil(f"semua permintaan: 200 = {ka[200] + kb[200]}, 429 = {ka[429] + kb[429]} (satu bucket 100 untuk 620 permintaan)")
    tampil(f"mitra B mendapat 429: {'ya' if kb[429] > 0 else 'tidak'}")
    harap((ka[200] + kb[200], ka[429] + kb[429], kb[429] > 0), (100, 520, True), "kuota bersama: B ikut terkena")
    hentikan_semua()
    tampil("\nSerangan volumetrik lapisan 3 dan 4 (banjir paket, SYN flood): Tidak dijalankan. Lab ini hanya menguji pertahanan lapisan 7 di gerbang.")
    tulis("kuota.txt", "kuota per mitra di gerbang: token bucket, permintaan berjalan, dan versi pertama dengan satu kuota bersama")


# ---------- bagian B: WAF (b) ----------

def jalur_untuk(p, i):
    """Payload sah diarahkan ke merchant yang berbeda-beda milik mitra A, supaya batas 10 QR per menit per akun di api-t5 tidak ikut bekerja."""
    return p["jalur"].replace("/merchant/30001/", f"/merchant/{MERCHANT_A[i % len(MERCHANT_A)]}/")


def rekam_waf():
    bagian(f"A. CRS {CRS_VERSI} di Coraza {CORAZA}, mode blokir, paranoia level 1, ambang anomali masuk 5: {len(PAYLOAD['serangan'])} payload serangan")
    siapkan()
    mulai_semua()
    jam_maju(2000)
    tampil("Tiap payload dikirim dengan kunci API dan tanda tangan yang SAH: yang menghentikannya WAF, bukan autentikasi.")
    tampil("Payload adalah string uji generik di payload.json, dikirim hanya ke gerbang tiruan di 127.0.0.1.")
    k403 = 0
    for p in PAYLOAD["serangan"]:
        s, kep, teks = kirim("A", p["metode"], p["jalur"], p["isi"])
        tampilkan(f"{p['nama']}", s, kep, teks)
        harap((s, tipe(teks), "949110" in kep.get("x-lab-waf-aturan", "").split(",")), (403, "diblokir-waf", True), f"{p['nama']} diblokir")
        k403 += 1
    tampil(f"\ndiblokir 403: {k403} dari {len(PAYLOAD['serangan'])}")

    bagian(f"B. Payload POS yang sah: {len(PAYLOAD['sah'])} diuji lewat gerbang yang sama (kunci dan tanda tangan sah)")
    ke_hulu, fp = collections.Counter(), []
    for i, p in enumerate(PAYLOAD["sah"]):
        jam_maju(1000)
        uri = jalur_untuk(p, i)
        s, kep, teks = kirim("A", p["metode"], uri, p["isi"])
        t = tipe(teks)
        tampil(f"{p['nama']:<30} {p['metode']:<4} -> {s}" + (f" {t}" if t else "") + (f"  [aturan CRS: {kep['x-lab-waf-aturan']}]" if "x-lab-waf-aturan" in kep else ""))
        if s == 403:
            fp.append(p["nama"])
        ke_hulu[s] += 1
        harap(s in ((201,) if p["metode"] == "POST" else (404,)), True, f"{p['nama']} diteruskan ke api-t5: dapat {s}")
    tampil(f"\ndiuji: {len(PAYLOAD['sah'])}, diblokir WAF: {len(fp)}, diteruskan ke api-t5: {len(PAYLOAD['sah']) - len(fp)} (201 untuk POST, 404 untuk status QR yang tidak ada)")
    harap(len(fp), 0, "tidak ada payload sah yang diblokir")
    tampil("Lingkup: 37 payload di payload.json, paranoia level 1. Ini bukan ukuran false positive untuk payload POS mana pun di luar daftar itu.")

    bagian("C. WAF bukan validasi: payload yang lolos WAF tetap diperiksa api-t5")
    s, kep, teks = kirim("A", "POST", "/pos/v1/merchant/30001/qr", json.dumps({"nominal": 25000, "referensi": "a" * 101}))
    tampilkan("referensi 101 karakter (tanpa aturan CRS yang cocok)", s, kep, teks)
    harap((s, "x-lab-waf-aturan" in kep), (400, False), "validasi api-t5 menolak, WAF tidak")
    hentikan_semua()

    bagian("D. Mode rentan waf-deteksi: mesin DetectionOnly, aturan tercatat tetapi tidak ada yang diblokir")
    siapkan()
    mulai_semua(rentan_gerbang="waf-deteksi")
    jam_maju(2000)
    hasil = collections.Counter()
    for i, p in enumerate(PAYLOAD["serangan"]):
        uri = jalur_untuk(p, i)
        s, kep, teks = kirim("A", p["metode"], uri, p["isi"])
        tampil(f"{p['nama']:<45} -> {s}" + (f" {tipe(teks)}" if tipe(teks) else "") + f"  [aturan CRS: {kep.get('x-lab-waf-aturan', '-')}]")
        harap("949110" in kep.get("x-lab-waf-aturan", "").split(","), True, f"{p['nama']} tetap tercatat")
        hasil[s] += 1
    tampil(f"\nstatus tanpa blokir: {dict(sorted(hasil.items()))}; tidak ada 403. Isi `referensi` tidak diperiksa api-t5 selain panjangnya.")
    harap(hasil[403], 0, "tidak ada 403 di mode deteksi")
    hentikan_semua()
    tulis("waf.txt", f"Coraza dan CRS di gerbang: payload serangan, payload POS yang sah, dan mesin yang hanya mencatat")


# ---------- bagian C: tanda tangan, Idempotency-Key, cakupan, enumerasi (c, d) ----------

def rekam_tandatangan():
    bagian("A. Idempotency-Key wajib untuk POST yang membuat QR")
    siapkan()
    mulai_semua()
    jam_maju(2000)
    uri = "/pos/v1/merchant/30001/qr"
    isi = '{"nominal":25000,"referensi":"MEJA 12"}'
    s, kep, teks = kirim("A", "POST", uri, isi, key=None)
    tampilkan("POST tanpa Idempotency-Key", s, kep, teks)
    harap((s, tipe(teks), jumlah_qr(30001)), (400, "idempotency-key-wajib", 0), "tanpa key ditolak di gerbang")
    key = key_baru()
    s1, _, t1 = kirim("A", "POST", uri, isi, key=key)
    s2, _, t2 = kirim("A", "POST", uri, isi, key=key)
    q1, q2 = json.loads(t1)["id"], json.loads(t2)["id"]
    label_qr(q1, "<qr 1>")
    tampil(f"$ POST dengan Idempotency-Key {key}, dikirim dua kali (kasir mengulang)")
    tampil(f"  -> pertama {s1}, kedua {s2}; id QR sama: {'ya' if q1 == q2 else 'tidak'}; baris qr milik merchant 30001: {jumlah_qr(30001)}")
    harap((s1, s2, q1 == q2, jumlah_qr(30001)), (201, 201, True, 1), "key sama menghasilkan satu QR")
    s, kep, teks = kirim("A", "POST", uri, '{"nominal":99000,"referensi":"MEJA 12"}', key=key)
    tampilkan("key yang sama dengan isi lain (nominal 99.000)", s, kep, teks)
    harap((s, tipe(teks)), (422, "idempotency-key-dipakai-ulang"), "key dipakai ulang untuk isi lain")
    hentikan_semua()

    tampil("\n# Mode rentan tanpa-idempoten-wajib (Idempotency-Key opsional seperti Tahap 4): kasir yang mengulang membuat dua QR")
    siapkan()
    mulai_semua(rentan_gerbang="tanpa-idempoten-wajib")
    jam_maju(2000)
    s1, _, _ = kirim("A", "POST", uri, isi, key=None)
    s2, _, _ = kirim("A", "POST", uri, isi, key=None)
    tampil(f"$ dua POST yang sama tanpa Idempotency-Key -> {s1}, {s2}; baris qr milik merchant 30001: {jumlah_qr(30001)}")
    harap((s1, s2, jumlah_qr(30001)), (201, 201, 2), "tanpa key: dua QR")
    hentikan_semua()

    bagian("B. Kunci API dan HMAC-SHA256 bertimestamp (toleransi 5 menit, Asumsi: sama dengan ADR 34)")
    siapkan()
    mulai_semua()
    jam_maju(2000)
    tampil("Yang ditandatangani: <timestamp>.<METHOD>.<alamat dan query>.<byte mentah body>. Header X-Waktu dan X-Tanda-Tangan.")
    uri_g = "/pos/v1/merchant/30001/qr/00000000-0000-4000-8000-000000000001"
    tampil("Permintaan yang lolos pemeriksaan gerbang diteruskan ke api-t5; QR contoh ini tidak ada, jadi jawabannya 404 dari api-t5.")
    kasus = [
        ("tanda tangan sah", dict(), 404, "tidak-ditemukan"),
        ("rahasia penandatangan salah", dict(rahasia="rahasia-lain"), 401, "tanda-tangan-salah"),
        ("tanpa X-Waktu dan X-Tanda-Tangan", dict(tanda=None), 401, "waktu-di-luar-toleransi"),
        ("timestamp 240 detik lalu, ditandatangani ulang", dict(selisih=-240), 404, "tidak-ditemukan"),
        ("timestamp 360 detik lalu, ditandatangani ulang", dict(selisih=-360), 401, "waktu-di-luar-toleransi"),
        ("timestamp 360 detik ke depan", dict(selisih=360), 401, "waktu-di-luar-toleransi"),
    ]
    for judul, opsi, ekspektasi, jenis in kasus:
        s, kep, teks = kirim("A", "GET", uri_g, **opsi)
        tampilkan(f"GET status QR, {judul}", s, kep, teks)
        harap((s, tipe(teks)), (ekspektasi, jenis), judul)
    # Permintaan lama yang diputar ulang: tanda tangan dibuat untuk timestamp 360 detik lalu, dikirim apa adanya.
    lama = int(time.time()) - 360
    ttd = tandai(mitra["A"]["rahasia"], lama, "GET", uri_g, b"")
    c = http.client.HTTPConnection("127.0.0.1", PORT_GERBANG, timeout=5)
    c.request("GET", uri_g, None, {"Host": HOST, "User-Agent": "pos-tiruan/1.0", "Accept": "application/json",
                                    "X-Kunci-Api": mitra["A"]["kunci"], "X-Waktu": str(lama), "X-Tanda-Tangan": ttd})
    r = c.getresponse()
    teks = r.read().decode()
    tampilkan("permintaan sah yang direkam 360 detik lalu dan diputar ulang apa adanya", r.status, {k.lower(): v for k, v in r.getheaders()}, teks)
    harap((r.status, tipe(teks)), (401, "waktu-di-luar-toleransi"), "putar ulang ditolak")
    # Isi diubah sesudah ditandatangani.
    body = b'{"nominal":25000,"referensi":"MEJA 12"}'
    ts = int(time.time())
    ttd = tandai(mitra["A"]["rahasia"], ts, "POST", "/pos/v1/merchant/30001/qr", body)
    c = http.client.HTTPConnection("127.0.0.1", PORT_GERBANG, timeout=5)
    c.request("POST", "/pos/v1/merchant/30001/qr", b'{"nominal":99000,"referensi":"MEJA 12"}',
              {"Host": HOST, "User-Agent": "pos-tiruan/1.0", "Accept": "application/json", "Content-Type": "application/json",
               "Idempotency-Key": key_baru(), "X-Kunci-Api": mitra["A"]["kunci"], "X-Waktu": str(ts), "X-Tanda-Tangan": ttd})
    r = c.getresponse()
    teks = r.read().decode()
    tampilkan("POST yang nominalnya diubah sesudah ditandatangani (25.000 jadi 99.000)", r.status, {}, teks)
    harap((r.status, tipe(teks), jumlah_qr(30001)), (401, "tanda-tangan-salah", 0), "isi diubah ditolak")
    s, kep, teks = kirim(None, "GET", uri_g, kunci="kunci-tebakan", rahasia="x")
    tampilkan("kunci API yang tidak dikenal", s, kep, teks)
    harap((s, tipe(teks)), (401, "kunci-tidak-sah"), "kunci tidak dikenal")
    with d.sambung(SP) as cn:
        cn.execute("UPDATE mitra_pos SET status = 'dibekukan' WHERE id = %s", (mitra["A"]["id"],))
    s, kep, teks = kirim("A", "GET", uri_g)
    tampilkan("kunci mitra A sesudah mitra_pos.status = dibekukan", s, kep, teks)
    harap((s, tipe(teks)), (401, "kunci-tidak-sah"), "mitra dibekukan")
    hentikan_semua()

    bagian("C. Cakupan: kunci mitra A tidak membuka merchant mitra B")
    siapkan()
    mulai_semua()
    jam_maju(2000)
    qb = label_qr(json.loads(kirim("B", "POST", f"/pos/v1/merchant/{MERCHANT_B}/qr", '{"nominal":30000}')[2])["id"], "<qr milik B>")
    qa = label_qr(json.loads(kirim("A", "POST", "/pos/v1/merchant/30001/qr", '{"nominal":25000}')[2])["id"], "<qr milik A>")
    cek = [
        ("A membaca QR sendiri", "A", "GET", f"/pos/v1/merchant/30001/qr/{qa}", None, 200, ""),
        ("A membaca QR milik B lewat alamat merchant B", "A", "GET", f"/pos/v1/merchant/{MERCHANT_B}/qr/{qb}", None, 404, "tidak-ditemukan"),
        ("A membaca QR milik B lewat alamat merchant A sendiri", "A", "GET", f"/pos/v1/merchant/30001/qr/{qb}", None, 404, "tidak-ditemukan"),
        ("A membuat QR untuk merchant B", "A", "POST", f"/pos/v1/merchant/{MERCHANT_B}/qr", '{"nominal":1000}', 404, "tidak-ditemukan"),
        ("A membuat QR untuk merchant yang tidak ada", "A", "POST", "/pos/v1/merchant/99999999/qr", '{"nominal":1000}', 404, "tidak-ditemukan"),
    ]
    for judul, label, method, uri, isi, ekspektasi, jenis in cek:
        s, kep, teks = kirim(label, method, uri, isi)
        tampilkan(judul, s, kep, teks)
        harap((s, tipe(teks)), (ekspektasi, jenis), judul)
    tampil(f"baris qr milik merchant B sesudah semua percobaan A: {jumlah_qr(MERCHANT_B)} (hanya yang dibuat B sendiri)")
    harap(jumlah_qr(MERCHANT_B), 1, "merchant B tidak mendapat QR dari A")
    s, kep, teks = kirim("A", "GET", f"/pos/v1/merchant/{MERCHANT_B}/qr/{qb}", kepala={"X-Mitra-Id": str(mitra["B"]["id"]), "X-Gerbang-Rahasia": RAHASIA_HULU})
    tampilkan("A mengirim kepala X-Mitra-Id milik B dan rahasia gerbang (kepala identitas dibuang gerbang)", s, kep, teks)
    harap(s, 404, "kepala identitas dari client dibuang")
    c = http.client.HTTPConnection("127.0.0.1", d.PORT, timeout=5)
    c.request("GET", f"/pos/v1/merchant/{MERCHANT_B}/qr/{qb}", None, {"X-Mitra-Id": str(mitra["B"]["id"])})
    r = c.getresponse()
    teks = r.read().decode()
    tampilkan("langsung ke api-t5 tanpa lewat gerbang (tanpa rahasia gerbang)", r.status, {}, teks)
    harap((r.status, tipe(teks)), (401, "bukan-dari-gerbang"), "api-t5 menolak yang tidak lewat gerbang")
    hentikan_semua()

    tampil("\n# Mode rentan pos-tanpa-cakupan di api-t5: merchant di alamat tidak dicocokkan dengan mitra")
    siapkan()
    mulai_semua(rentan_api="pos-tanpa-cakupan")
    jam_maju(2000)
    qb = label_qr(json.loads(kirim("B", "POST", f"/pos/v1/merchant/{MERCHANT_B}/qr", '{"nominal":30000}')[2])["id"], "<qr milik B>")
    s, kep, teks = kirim("A", "GET", f"/pos/v1/merchant/{MERCHANT_B}/qr/{qb}")
    tampilkan("A membaca QR milik B lewat alamat merchant B", s, kep, teks, penuh=True)
    harap(s, 200, "mode rentan membuka merchant B untuk A")
    hentikan_semua()

    bagian(f"D. Enumerasi: kunci yang salah dihitung per alamat ({GAGAL_MAKS} kegagalan), batas per akun di api-t5 tetap berlaku")
    siapkan()
    mulai_semua()
    jam_maju(2000)
    for i in range(GAGAL_MAKS + 1):
        s, kep, teks = kirim(None, "GET", "/pos/v1/merchant/30001/qr/x", kunci=f"tebakan-{i}", rahasia="x")
        tampilkan(f"kunci tebakan ke-{i + 1}", s, kep, teks)
        harap((s, tipe(teks)), ((401, "kunci-tidak-sah") if i < GAGAL_MAKS else (429, "terlalu-banyak-percobaan-kunci")), f"tebakan {i + 1}")
    s, kep, teks = kirim("A", "GET", "/pos/v1/merchant/30001/qr/00000000-0000-4000-8000-000000000001")
    tampilkan("kunci mitra A yang sah dari alamat yang sama (tidak ikut terhalang)", s, kep, teks)
    harap(s, 404, "kunci sah tetap dilayani")
    hasil = [kirim("A", "POST", "/pos/v1/merchant/30002/qr", '{"nominal":1000}') for _ in range(11)]
    k = [(s, tipe(t)) for s, _, t in hasil]
    tampil(f"$ 11 POST beruntun dari A untuk merchant 30002, tiap kali dengan Idempotency-Key baru")
    tampil(f"  -> 201: {sum(1 for s, _ in k if s == 201)}, lalu {k[-1][0]} {k[-1][1]} (batas 10 QR per menit per akun di api-t5, lapis akun)")
    harap(([s for s, _ in k[:10]], k[10]), ([201] * 10, (429, "rate-limit-akun")), "batas per akun di api-t5 tetap berlaku di belakang gerbang")
    hentikan_semua()

    bagian("E. Gerbang hanya mau mendengar dan meneruskan ke alamat lokal; selain itu ia berhenti sebelum melayani apa pun")
    dasar = [str(BIN_GERBANG), "-hulu", f"http://127.0.0.1:{d.PORT}", "-crs", str(CRS), "-rahasia-berkas", str(BERKAS_RAHASIA),
             "-rahasia-hulu", RAHASIA_HULU, "-redis", f"127.0.0.1:{REDIS_PORT}"]
    for judul, tambahan in (("-addr 0.0.0.0:<port>", ["-addr", f"0.0.0.0:{PORT_GERBANG}"]),
                            ("-hulu http://hulu.example:80", ["-addr", f"127.0.0.1:{PORT_GERBANG}", "-hulu", "http://hulu.example:80"])):
        r = subprocess.run(dasar + tambahan, env=dict(d.ENV, DATABASE_URL=d.db_role("t5_merchant", "t5-waf-gerbang")), capture_output=True,
                           text=True, timeout=15)
        baris = [re.sub(r":\d{4,5}", ":<port>", re.sub(r"^\d{4}/\d\d/\d\d \d\d:\d\d:\d\d(?:\.\d+)? ", "", l)) for l in r.stderr.splitlines()]
        tampil(f"$ gerbang {judul}  -> exit status {r.returncode}")
        for l in baris:
            tampil("  " + l)
        harap((r.returncode, any("hanya" in l or "lokal" in l for l in baris)), (1, True), f"gerbang menolak {judul}")
    tulis("tandatangan.txt", "Idempotency-Key wajib, kunci dan tanda tangan bertimestamp, cakupan merchant, dan enumerasi kunci")


# ---------- bagian D: tes Go ----------

def go_test(*args, cwd, env):
    r = subprocess.run(["go", *args], cwd=cwd, env=env, capture_output=True, text=True)
    teks = (r.stdout + r.stderr).replace("\t", "  ")
    teks = re.sub(r" \(\d+\.\d+s\)", "", teks)
    teks = re.sub(r"^(ok|FAIL)(\s+\S+)\s+[\d.]+s", r"\1\2", teks, flags=re.M)
    teks = re.sub(r"^\d{4}/\d\d/\d\d \d\d:\d\d:\d\d(?:\.\d+)? ", "", teks, flags=re.M)
    teks = re.sub(r"(?<=:)\d{4,5}\b", "<port>", teks)   # port sementara httptest di log
    teks = "\n".join(l for l in teks.splitlines() if not l.startswith(("?", "=== RUN", "=== PAUSE", "=== CONT")))
    return r.returncode, teks.rstrip()


def rekam_testing():
    d.buat_schema(d.TES)
    tes_db = d.db_pemilik(d.TES, "t5-waf-tes")
    redis_alamat = f"127.0.0.1:{REDIS_PORT}"
    bagian("A. go vet dan tes gerbang (WAF dengan CRS lokal, tanda tangan, kuota di Redis, rantai pemeriksaan)")
    rc, teks = go_test("vet", "./...", cwd=GERBANG, env=d.ENV)
    catat("$ go vet ./...   (di labs/t5-waf/gerbang)")
    catat(teks or "(tanpa temuan)")
    catat(f"# exit status {rc}")
    harap(rc, 0, "go vet gerbang")
    rc, teks = go_test("test", "-v", "-count=1", "./...", cwd=GERBANG, env=dict(d.ENV, TEST_REDIS_ADDR=redis_alamat, TES_REDIS_WAJIB="1"))
    catat("$ TEST_REDIS_ADDR=<Redis lab> TES_REDIS_WAJIB=1 go test -v -count=1 ./...")
    catat(teks)
    catat(f"# exit status {rc}")
    harap(rc, 0, "tes gerbang")
    bagian(f"B. Tes api-t5 untuk rute POS (cakupan, rahasia gerbang, Idempotency-Key), schema {d.TES}")
    rc, teks = go_test("test", "-v", "-count=1", "-p", "1", "-run", "POS", "./internal/handler/", cwd=d.HERE,
                       env=dict(d.ENV, TEST_DATABASE_URL=tes_db, TES_DB_WAJIB="1"))
    catat(f"$ TES_DB_WAJIB=1 TEST_DATABASE_URL=<pemilik, schema {d.TES}> go test -v -count=1 -run POS ./internal/handler/   (di labs/api-t5)")
    catat(teks)
    catat(f"# exit status {rc}")
    harap(rc, 0, "tes POS api-t5")
    bagian("C. Tanpa Redis: tes kuota dilewati; dengan TES_REDIS_WAJIB=1 gagal keras")
    env = {k: v for k, v in d.ENV.items() if k not in ("TEST_REDIS_ADDR", "TES_REDIS_WAJIB")}
    rc, teks = go_test("test", "-count=1", "-run", "KuotaPerMitra", "-v", ".", cwd=GERBANG, env=env)
    catat("$ go test -v -count=1 -run KuotaPerMitra .   (tanpa TEST_REDIS_ADDR)")
    catat(teks)
    harap(rc, 0, "tanpa Redis dilewati")
    rc, teks = go_test("test", "-count=1", "-run", "KuotaPerMitra", ".", cwd=GERBANG, env=dict(env, TES_REDIS_WAJIB="1"))
    catat("$ TES_REDIS_WAJIB=1 go test -count=1 -run KuotaPerMitra .   (tanpa TEST_REDIS_ADDR)")
    catat(teks)
    harap(rc, 1, "TES_REDIS_WAJIB tanpa Redis")
    tulis("testing.txt", "tes Go untuk gerbang dan rute POS")


BAGIAN = {"kuota": rekam_kuota, "waf": rekam_waf, "tandatangan": rekam_tandatangan, "testing": rekam_testing}


def main():
    pilih = sys.argv[1:] or list(BAGIAN)
    for nama in pilih:
        if nama not in BAGIAN:
            sys.exit(f"bagian tidak dikenal: {nama} (pilih dari: {' '.join(BAGIAN)})")
    for port in (d.PORT, PORT_GERBANG):
        d.port_bebas(port)
    periksa_crs()
    bangun()
    try:
        for nama in pilih:
            d.log.clear()
            BAGIAN[nama]()
    finally:
        for port in list(d.server):
            d.stop(port)
        shutil.rmtree(KERJA, ignore_errors=True)
    print("selesai:", ", ".join(pilih))


if __name__ == "__main__":
    main()
