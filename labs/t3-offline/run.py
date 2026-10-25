"""Rekam lab t3-offline (keputusan 971, 972): sinkron stok dan harga, key 24 jam lawan offline 62 jam, di atas api-t3.

Server, skema, dan data awal adalah milik `labs/api-t3` (`dasar_t3.py`), bukan salinan; lab ini menambah skenario di
atasnya, di schema sendiri (`tahap3_offline`). Setiap bagian membuat ulang schema dan data awal dari nol, jadi
output/*.txt tidak bergantung pada urutan bagian dan rekaman ulang identik per byte (make cek). Token, waktu, dan
tanggal disamarkan; key idempotensi di sini UUID tetap berentropi rendah supaya rekaman bisa dibaca apa adanya.

Waktu DIPERANKAN, tidak ditunggu. Server jalan dengan `-jam-lab`: jam service dibekukan lalu dimajukan lewat
`POST /lab/jam` (umur key idempotensi, umur sesi, dan umur operasi di queue dihitung dari jam itu). Retensi job
`-bersih` memakai jam database, jadi di bagian yang menjalankannya stempel baris digeser dengan UPDATE. Setiap
lompatan jam diberi catatan "Ilustrasi mekanisme" di rekaman.

    make -C labs/t3-offline run                    (butuh: Docker, Go; PostgreSQL lewat labs/b3-race)
    make -C labs/t3-offline run BAGIAN=m24         (satu bagian: m24 versi kunci24 sinkron14)
"""
import datetime, functools, json, pathlib, subprocess, sys, time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "api-t3"))
import dasar_t3 as d  # noqa: E402
from dasar_t3 import PORT, bagian, catat, curl, gagal, harap, j  # noqa: E402

LAB = "t3-offline"
SCH = "tahap3_offline"
DB = d.db_app(SCH)
d.OUT = HERE / "output"          # dasar_t3.tulis menulis ke d.OUT; di sini output lab ini, bukan api-t3

sql = functools.partial(d.sql, schema=SCH)

BUDI, ANI, DIMAS = 419, 418, 417

# Key idempotensi tetap (String berisi UUID, draft-ietf-httpapi-idempotency-key-header-08): rekaman identik per byte.
# Entropinya sengaja rendah supaya pemindai secret (gitleaks, aturan generic-api-key) tidak menandai rekaman sebagai
# rahasia; app sungguhan memakai UUID acak.
K_BAYAR = "00000000-0000-4000-8000-000000000001"
K_KIRIM = "00000000-0000-4000-8000-000000000002"
K_PESAN = "00000000-0000-4000-8000-000000000003"
K_AYAM = "00000000-0000-4000-8000-000000000011"
K_NASI = "00000000-0000-4000-8000-000000000012"
for _k in (K_BAYAR, K_KIRIM, K_PESAN, K_AYAM, K_NASI):
    d.daftar_samaran(_k, _k)     # tanpa ini samarkan() menamai setiap UUID "notifikasi_id"


def satu(q):
    return d.satu(q, SCH)


def tulis(nama, judul, keputusan="971"):
    d.tulis(nama, judul, lab=LAB, schema=SCH, dasar=d.DASAR, keputusan=keputusan)


def siapkan():
    d.buat_schema(SCH)
    d.seed(SCH)


def id_produk(warung, nama):
    return satu(f"SELECT id FROM produk WHERE akun_id = {warung} AND nama = '{nama}'")


def saldo(akun):
    return satu(f"SELECT saldo_cache FROM buku WHERE akun_id = {akun}")


def stok_versi(produk):
    return d.sql(f"SELECT stok, versi FROM produk WHERE id = {produk}", tampil=False, schema=SCH)[0]


# ---------- jam yang diperankan ----------

JAM = {"awal": 0, "geser": 0.0}


def atur_jam():
    ms = JAM["awal"] + int(JAM["geser"] * 3600 * 1000)
    s, _ = curl("POST", "/lab/jam", {"ms": ms}, tampil=False)
    harap(s, 204, "atur jam lab")


def jam_awal():
    """Jam service dibekukan di sekarang; semua lompatan dihitung dari titik ini (Jumat 16.50 di cerita)."""
    JAM["awal"], JAM["geser"] = int(time.time() * 1000), 0.0
    atur_jam()


def ke_jam(jam_sejak_jumat, label):
    JAM["geser"] = float(jam_sejak_jumat)
    atur_jam()
    catat(f"# Jam lab: {label} ({jam_sejak_jumat} jam sesudah Jumat 16.50). Ilustrasi mekanisme: waktu diperankan, "
          f"tidak ada yang menunggu {jam_sejak_jumat} jam")


def waktu(mundur_jam=0.0):
    """Stempel HP: jam lab dikurangi mundur_jam, dalam UTC dengan detik."""
    t = JAM["awal"] / 1000 + JAM["geser"] * 3600 - mundur_jam * 3600
    return datetime.datetime.fromtimestamp(t, datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def mulai_api(rentan=None):
    args = ["-jam-lab"] + (["-rentan", rentan] if rentan else [])
    d.mulai_api(args, db=DB, tampil="# server: ./api-t3 " + " ".join(["-lab"] + args))


def masuk(email, label):
    """Sesi hidup 8 jam menurut jam service: sesudah lompatan jam, HP dan laptop masuk lagi."""
    return d.login(email, label=label)


def galat(isi, kunci):
    """Kolom pertama errors[] dari problem+json; None bila jawabannya bukan galat validasi (lab gagal dengan pesan, bukan KeyError)."""
    return ((j(isi).get("errors") or [{}])[0]).get(kunci)


def kunci_h(k):
    return [f'Idempotency-Key: "{k}"']


# ---------- m24.txt ----------

def rekam_m24():
    siapkan()
    mulai_api("stok-timpa")
    jam_awal()
    ani = masuk("warung.ani@lestari.example", "Warung Ani")
    ayam, nasi = id_produk(ANI, "Ayam geprek"), id_produk(ANI, "Nasi goreng")
    catat("# Versi sebelum ADR 29 (mode rentan stok-timpa): PUT /produk/{id}/stok menimpa stok tanpa memeriksa versi.")
    catat("# Satu-satunya pengaman pengiriman ulang adalah Idempotency-Key, dikenali 24 jam (ADR 14).")

    bagian("A. Jumat 16.50: Ani mencatat 'habis' di HP; operasi sampai ke server, jawabannya hilang di jalan")
    sql(f"SELECT id, nama, harga, stok, versi FROM produk WHERE id IN ({ayam}, {nasi}) ORDER BY id")
    s, isi = curl("PUT", f"/produk/{ayam}/stok", {"stok": 0}, ani, kepala=kunci_h(K_AYAM))
    harap((s, j(isi)["stok"], j(isi)["versi"]), (200, 0, 2), "ayam habis")
    asli_ayam = isi
    catat("# HP tidak menerima jawaban di atas (sinyal putus); HP mengingat operasi dan key-nya, lalu offline")
    s, isi = curl("PUT", f"/produk/{nasi}/stok", {"stok": 0}, ani, kepala=kunci_h(K_NASI))
    harap((s, j(isi)["stok"], j(isi)["versi"]), (200, 0, 2), "nasi habis")
    asli_nasi = isi
    catat("# Nasi goreng dicatat habis dengan cara yang sama: pembanding untuk lama ulangan (bagian C)")

    bagian("B. Sabtu 07.50: Ani mengisi 30 porsi ayam dan 50 porsi nasi lewat dasbor (jalur bersyarat versi)")
    ke_jam(15, "Sabtu 07.50")
    ani = masuk("warung.ani@lestari.example", "Warung Ani")
    s, isi = curl("PATCH", f"/produk/{ayam}", {"stok": 30, "versi": 2}, ani)
    harap((s, j(isi)["stok"], j(isi)["versi"]), (200, 30, 3), "ayam diisi lewat dasbor")
    s, isi = curl("PATCH", f"/produk/{nasi}", {"stok": 50, "versi": 2}, ani)
    harap((s, j(isi)["stok"], j(isi)["versi"]), (200, 50, 3), "nasi diisi lewat dasbor")

    bagian("C. Pembanding, Sabtu 09.50 (17 jam sejak Jumat): HP sempat dapat sinyal dan mengirim ulang operasi nasi")
    ke_jam(17, "Sabtu 09.50")
    ani = masuk("warung.ani@lestari.example", "Warung Ani")
    s, isi = curl("PUT", f"/produk/{nasi}/stok", {"stok": 0}, ani, kepala=kunci_h(K_NASI))
    harap((s, isi), (200, asli_nasi), "ulangan dalam 24 jam: respons tersimpan, persis yang pertama")
    harap(stok_versi(nasi), (50, 3), "stok nasi tidak diterapkan dua kali")
    sql(f"SELECT id, nama, stok, versi FROM produk WHERE id = {nasi}")
    catat("# Key masih dikenali (17 jam < 24 jam): server menjawab dengan respons yang tersimpan (keadaan saat Jumat), "
          "stok 50 dan versi 3 tidak berubah")

    bagian("D. Senin 06.50 (62 jam sejak Jumat): HP kembali online dan mengirim ulang operasi ayam dengan key yang sama")
    ke_jam(62, "Senin 06.50")
    ani = masuk("warung.ani@lestari.example", "Warung Ani")
    budi = masuk("budi@lestari.example", "Budi")
    sql(f"SELECT id, nama, stok, versi FROM produk WHERE id = {ayam}")
    s, isi = curl("PUT", f"/produk/{ayam}/stok", {"stok": 0}, ani, kepala=kunci_h(K_AYAM))
    harap((s, j(isi)["stok"], j(isi)["versi"]), (200, 0, 4), "key sudah dibuang: operasi diterapkan sebagai baru")
    harap(isi == asli_ayam, False, "jawaban baru berbeda dari yang pertama (versi naik)")
    catat("# 62 jam > 24 jam: baris key sudah lewat masa berlaku, server memperlakukannya belum pernah ada. "
          "'stok = 0' diterapkan lagi, TANPA memeriksa versi, di atas stok 30 dari Sabtu")
    sql(f"SELECT id, nama, stok, versi FROM produk WHERE id = {ayam}")
    s, isi = curl("GET", f"/katalog?warung={ANI}", token=budi, tampil=False)
    harap(s, 200, "katalog Budi")
    menu = {m["nama"]: m for m in j(isi)["warung"][0]["menu"]}
    catat(f"$ curl -i 'GET /katalog?warung={ANI}' -H 'Authorization: Bearer <token sesi Budi>'   # Senin 06.50, app Budi")
    catat("Ayam geprek: " + json.dumps({k: menu["Ayam geprek"][k] for k in ("id", "harga", "stok", "versi")}, separators=(",", ":")))
    harap(menu["Ayam geprek"]["stok"], 0, "Budi melihat ayam habis")
    catat("# Budi melihat 'habis'. Ani mengisi 30 porsi hari Sabtu dan tidak pernah mencatat 'habis' lagi")
    catat("# Tidak ada error di sisi mana pun: server menjawab 200 dan stok 30 dari Sabtu hilang. Pembanding bersyarat versi: versi.txt")
    tulis("m24.txt", "M24: stok yang kembali ke angka lama (key 24 jam, offline 62 jam, tanpa versi)")


# ---------- versi.txt ----------

def rekam_versi():
    siapkan()
    mulai_api()
    jam_awal()
    ani = masuk("warung.ani@lestari.example", "Warung Ani")
    soto, bakso = id_produk(ANI, "Soto ayam"), id_produk(ANI, "Bakso")
    catat("# Versi benar (ADR 29): POST /sinkron bersyarat versi, kunci 14 hari di operasi_sinkron. Tanpa mode rentan.")

    bagian("A. Jumat 16.50: HP Ani mendaftar dan mengirim 'soto habis' (kunci sinkron, versi dasar 1); jawabannya hilang")
    s, isi = curl("POST", "/perangkat", {"platform": "android", "token_push": "hp-ani-1"}, ani)
    harap((s, j(isi)["id"]), (201, 10061), "daftar perangkat")
    hp = j(isi)["id"]
    sql(f"SELECT id, nama, stok, versi FROM produk WHERE id IN ({soto}, {bakso}) ORDER BY id")
    op_soto = {"kunci": "ani-hp1-0301", "perangkat_id": hp, "produk_id": soto, "jenis": "stok", "nilai": 0,
               "versi_dasar": 1, "dibuat_di_hp": waktu()}
    s, isi = curl("POST", "/sinkron", op_soto, ani)
    harap((s, j(isi)["status"], j(isi)["ulang"], j(isi)["sekarang"]["stok"], j(isi)["sekarang"]["versi"]),
          (200, "diterapkan", False, 0, 2), "soto habis diterapkan")
    catat("# HP tidak menerima jawaban di atas. Bakso: HP sudah offline, operasinya tidak pernah sampai (bagian C)")

    bagian("B. Sabtu 07.50: Ani mengisi soto 30 porsi lewat dasbor (versi 2 menjadi 3); tab dasbor yang basi ditolak")
    ke_jam(15, "Sabtu 07.50")
    ani = masuk("warung.ani@lestari.example", "Warung Ani")
    s, isi = curl("PATCH", f"/produk/{soto}", {"stok": 30, "versi": 2}, ani)
    harap((s, j(isi)["stok"], j(isi)["versi"]), (200, 30, 3), "soto diisi")
    s, isi = curl("PATCH", f"/produk/{bakso}", {"stok": 30, "versi": 1}, ani, tampil=False)
    harap((s, j(isi)["stok"], j(isi)["versi"]), (200, 30, 2), "bakso diisi dasbor")
    catat(f"# Bakso juga diisi 30 porsi lewat dasbor (PATCH /produk/{bakso}, versi 1 menjadi 2)")
    catat("# Tab dasbor di laptop yang masih menampilkan soto versi 2 mengubah stok ke 10: ditolak, bukan menimpa")
    s, isi = curl("PATCH", f"/produk/{soto}", {"stok": 10, "versi": 2}, ani)
    harap((s, j(isi).get("sekarang", {}).get("stok"), j(isi).get("sekarang", {}).get("versi")), (409, 30, 3), "dasbor basi ditolak")

    bagian("C. Senin 06.50 (62 jam): HP online. Soto: kunci sama dikenali. Bakso: operasi lama tiba pertama kali")
    ke_jam(62, "Senin 06.50")
    ani = masuk("warung.ani@lestari.example", "Warung Ani")
    s, isi = curl("POST", "/sinkron", op_soto, ani)
    harap((s, j(isi)["status"], j(isi)["ulang"], j(isi)["sekarang"]["stok"], j(isi)["sekarang"]["versi"]),
          (200, "diterapkan", True, 30, 3), "soto: kunci 14 hari dikenali")
    catat("# ulang = true: kunci dikenali (kunci hidup 14 hari, bukan 24 jam); 'stok = 0' TIDAK diterapkan lagi, stok 30 dari Sabtu utuh")
    op_bakso = {"kunci": "ani-hp1-0302", "perangkat_id": hp, "produk_id": bakso, "jenis": "stok", "nilai": 0,
                "versi_dasar": 1, "dibuat_di_hp": waktu(62)}
    s, isi = curl("POST", "/sinkron", op_bakso, ani)
    harap((s, j(isi)["status"], j(isi)["ulang"], j(isi)["sekarang"]["stok"], j(isi)["sekarang"]["versi"]),
          (409, "konflik", False, 30, 2), "bakso: versi berubah, ditolak")
    catat("# 409 membawa 'sekarang' (stok 30, versi 2): kunci tidak dikenal, tetapi versi dasar 1 sudah lewat. Tidak ada yang ditimpa")
    harap(stok_versi(bakso), (30, 2), "stok bakso tetap 30")
    sql("SELECT kunci, jenis, nilai, versi_dasar, status, diterapkan IS NOT NULL AS diterapkan FROM operasi_sinkron ORDER BY kunci")
    sql(f"SELECT id, nama, stok, versi FROM produk WHERE id IN ({soto}, {bakso}) ORDER BY id")

    bagian("D. Layar konflik di HP: Ani memilih; memilih berarti operasi baru dengan kunci baru dan versi dasar dari 'sekarang'")
    op_pilih = dict(op_bakso, kunci="ani-hp1-0303", versi_dasar=2, dibuat_di_hp=waktu())
    s, isi = curl("POST", "/sinkron", op_pilih, ani)
    harap((s, j(isi)["status"], j(isi)["sekarang"]["stok"], j(isi)["sekarang"]["versi"]), (200, "diterapkan", 0, 3), "pilihan Ani: tetap habis")
    catat("# Pilihan lain, 'pakai 30', tidak mengirim apa-apa: operasi lama dibuang dari queue HP")
    sql(f"SELECT id, nama, stok, versi FROM produk WHERE id = {bakso}")
    tulis("versi.txt", "operasi bersyarat versi: 409 membawa keadaan terkini, kunci 14 hari mengenali pengiriman ulang", "972")


# ---------- kunci24.txt ----------

def rekam_kunci24():
    siapkan()
    mulai_api()
    jam_awal()
    budi = masuk("budi@lestari.example", "Budi")
    dimas = masuk("dimas@lestari.example", "Dimas")
    nasi = id_produk(ANI, "Nasi goreng")
    citra = satu("SELECT nomor_karyawan FROM akun WHERE id = 504")
    riwayat = ("SELECT j.id AS jurnal, j.jenis, j.keterangan, p.jumlah FROM posting p JOIN jurnal j ON j.id = p.jurnal_id "
               f"JOIN buku b ON b.id = p.buku_id WHERE b.akun_id = {BUDI} AND j.jenis IN ('bayar', 'transfer') ORDER BY j.id")
    catat("# Jalur Idempotency-Key opsional di POST /transfers, /kiriman, dan /pesanan (ADR 14). Tanpa header, perilaku lama.")

    bagian("A. Tanpa Idempotency-Key (app 1.0 dan 1.1 tidak mengirimnya): permintaan yang sama dua kali menjadi dua pembayaran")
    for _ in range(2):
        s, isi = curl("POST", "/transfers", {"ke": ANI, "jumlah": 28000}, budi)
        harap(s, 201, "bayar tanpa key")
    harap(saldo(BUDI), 250000 - 2 * 28000, "dua pembayaran")
    sql(riwayat)

    bagian("B. Jumat 16.50, dengan key: pembayaran masuk, jawabannya hilang di jalan")
    catat("# HP Budi tidak menerima jawaban di bawah ini (sinyal putus); HP mengingat key-nya")
    s, isi = curl("POST", "/transfers", {"ke": ANI, "jumlah": 28000}, budi, kepala=kunci_h(K_BAYAR))
    harap((s, j(isi)["saldo"]), (201, 166000), "bayar dengan key")
    pertama = (s, isi)
    sql("SELECT kunci, status, (respons->>'status')::int AS status_tersimpan FROM kunci_idempotensi")

    bagian("C. Sabtu 09.50 (17 jam): HP mengirim ulang dengan key dan isi yang sama; key lain di kiriman dan pesanan")
    ke_jam(17, "Sabtu 09.50")
    budi = masuk("budi@lestari.example", "Budi")
    dimas = masuk("dimas@lestari.example", "Dimas")
    s, isi = curl("POST", "/transfers", {"ke": ANI, "jumlah": 28000}, budi, kepala=kunci_h(K_BAYAR))
    harap((s, isi), pertama, "ulangan dalam 24 jam: jawaban persis sama")
    harap(saldo(BUDI), 166000, "tanpa efek ganda")
    sql(riwayat)
    catat("# Header Location dan isi sama dengan jawaban Jumat; tidak ada jurnal baru. Dua jalur lain dengan key sendiri:")
    s, isi = curl("POST", "/kiriman", {"ke_nomor_karyawan": citra, "nominal": 10000}, budi, kepala=kunci_h(K_KIRIM))
    harap((s, j(isi)["saldo"]), (201, 156000), "kiriman dengan key")
    kirim_pertama = (s, isi)
    s, isi = curl("POST", "/kiriman", {"ke_nomor_karyawan": citra, "nominal": 10000}, budi, kepala=kunci_h(K_KIRIM), tampil=False)
    harap((s, isi), kirim_pertama, "kiriman diulang: jawaban sama")
    s, isi = curl("POST", "/pesanan", {"produk_id": nasi, "porsi": 1}, budi, kepala=kunci_h(K_PESAN))
    harap((s, j(isi)["saldo"], j(isi)["stok_sisa"]), (201, 131000, 49), "pesanan dengan key")
    pesan_pertama = (s, isi)
    s, isi = curl("POST", "/pesanan", {"produk_id": nasi, "porsi": 1}, budi, kepala=kunci_h(K_PESAN), tampil=False)
    harap((s, isi), pesan_pertama, "pesanan diulang: jawaban sama")
    catat("# Kiriman dan pesanan diulang dengan key yang sama (jawaban tidak dicetak ulang): jawaban persis sama, saldo dan stok tidak berubah")
    harap((saldo(BUDI), stok_versi(nasi)[0]), (131000, 49), "saldo dan stok setelah ulangan")

    bagian("D. Key yang sama dengan isi lain, akun lain, atau bentuk rusak ditolak; tidak ada jurnal baru")
    jurnal_sebelum = satu("SELECT count(*) FROM jurnal")
    s, isi = curl("POST", "/transfers", {"ke": ANI, "jumlah": 30000}, budi, kepala=kunci_h(K_BAYAR))
    harap((s, j(isi).get("type")), (422, "/problems/idempotency-key-dipakai-ulang"), "isi beda")
    s, isi = curl("POST", "/transfers", {"ke": ANI, "jumlah": 28000}, dimas, kepala=kunci_h(K_BAYAR))
    harap((s, j(isi).get("type")), (422, "/problems/idempotency-key-dipakai-ulang"), "akun lain")
    s, isi = curl("POST", "/transfers", {"ke": ANI, "jumlah": 28000}, budi, kepala=['Idempotency-Key: 12345'])
    harap((s, j(isi).get("type")), (400, "/problems/idempotency-key"), "bentuk rusak")
    harap(satu("SELECT count(*) FROM jurnal"), jurnal_sebelum, "tidak ada jurnal baru")
    catat("# Jawaban milik permintaan lain tidak pernah dikirim ke akun atau isi yang berbeda")

    bagian("E. Senin 06.50 (62 jam): HP kembali online dan mengirim ulang tiga permintaan lama dengan key yang sama")
    ke_jam(62, "Senin 06.50")
    budi = masuk("budi@lestari.example", "Budi")
    s, isi = curl("POST", "/transfers", {"ke": ANI, "jumlah": 28000}, budi, kepala=kunci_h(K_BAYAR))
    harap((s, j(isi)["saldo"]), (201, 103000), "key kedaluwarsa: pembayaran kedua")
    harap(isi != pertama[1], True, "jawaban baru berbeda dari yang pertama")
    catat("# Key sudah lewat 24 jam: server memperlakukan permintaan ini baru. Jurnal kedua, saldo turun lagi")
    s, isi = curl("POST", "/kiriman", {"ke_nomor_karyawan": citra, "nominal": 10000}, budi, kepala=kunci_h(K_KIRIM), tampil=False)
    harap((s, j(isi)["saldo"]), (201, 93000), "kiriman kedaluwarsa: dikirim dua kali")
    s, isi = curl("POST", "/pesanan", {"produk_id": nasi, "porsi": 1}, budi, kepala=kunci_h(K_PESAN), tampil=False)
    harap((s, j(isi)["saldo"], j(isi)["stok_sisa"]), (201, 68000, 48), "pesanan kedaluwarsa: dipesan dua kali")
    catat("# Kiriman dan pesanan dengan key lama juga dikerjakan lagi (jawaban tidak dicetak ulang)")
    sql(riwayat)
    sql(f"SELECT id, nama, stok, versi FROM produk WHERE id = {nasi}")
    sql("SELECT kunci, status, (respons->>'status')::int AS status_tersimpan FROM kunci_idempotensi ORDER BY kunci")
    catat("# Pembayaran yang menunggu di HP selama offline 62 jam akan dikerjakan dua kali bila jawaban pertamanya hilang. "
          "Sebab itu pembayaran tidak pernah offline (ADR 29); hanya stok dan harga bersyarat versi, dengan kunci sinkron 14 hari (versi.txt)")
    tulis("kunci24.txt", "Idempotency-Key 24 jam di bayar, kiriman, dan pesanan; ulangan 62 jam kemudian")


# ---------- sinkron14.txt ----------

def rekam_sinkron14():
    siapkan()
    mulai_api()
    jam_awal()
    ani = masuk("warung.ani@lestari.example", "Warung Ani")
    masuk("warung.sari@lestari.example", "Warung Sari")
    mie, rames = id_produk(ANI, "Mie ayam"), id_produk(ANI, "Nasi rames")
    produk_sari = id_produk(502, "Mie ayam")
    s, isi = curl("POST", "/perangkat", {"platform": "android", "token_push": "hp-ani-1"}, ani, tampil=False)
    harap((s, j(isi)["id"]), (201, 10061), "perangkat Ani")
    hp = j(isi)["id"]
    s, isi = curl("POST", "/perangkat", {"platform": "ios", "token_push": "hp-sari-1"}, d.TOKEN["Warung Sari"], tampil=False)
    harap((s, j(isi)["id"]), (201, 10062), "perangkat Sari")
    hp_sari = j(isi)["id"]
    catat("# Kunci sinkron hidup 14 hari (operasi_sinkron), queue HP paling lama 7 hari (ADR 29). Server tanpa mode rentan.")

    def sinkron(kunci, produk, nilai, versi, umur_jam, token=None, perangkat=hp, jenis="stok", tampil=True):
        # Token dibaca saat dipanggil: sesudah lompatan jam, masuk() menggantinya dengan sesi baru.
        return curl("POST", "/sinkron", {"kunci": kunci, "perangkat_id": perangkat, "produk_id": produk, "jenis": jenis,
                                         "nilai": nilai, "versi_dasar": versi, "dibuat_di_hp": waktu(umur_jam)},
                    token or d.TOKEN["Warung Ani"], tampil=tampil)

    def bersih():
        r = subprocess.run([str(d.BIN), "-bersih"], env=dict(d.ENV, DATABASE_URL=DB), capture_output=True, text=True)
        harap(r.returncode, 0, "exit bersih")
        catat("$ ./api-t3 -bersih")
        catat(r.stdout.strip())
        return r.stdout.strip()

    bagian("A. Jumat 16.50: 'mie habis' diterapkan; Senin 06.50 (62 jam) kunci masih ada, job -bersih tidak menyentuhnya")
    s, isi = sinkron("ani-hp1-0201", mie, 0, 1, 0)
    harap((s, j(isi)["status"], j(isi)["ulang"]), (200, "diterapkan", False), "mie habis")
    ke_jam(62, "Senin 06.50")
    sql("UPDATE operasi_sinkron SET dibuat_di_hp = dibuat_di_hp - interval '62 hours'", tampil=False)
    catat("# Stempel baris digeser 62 jam ke belakang (jam database tidak ikut diperankan); jam HP dan jam service sudah di Senin")
    harap(bersih(), "bersih: 0 baris outbox selesai (lebih dari 7 hari), 0 operasi sinkron (lebih dari 14 hari)", "62 jam < 14 hari")
    ani = masuk("warung.ani@lestari.example", "Warung Ani")
    s, isi = sinkron("ani-hp1-0201", mie, 0, 1, 62)
    harap((s, j(isi)["status"], j(isi)["ulang"], j(isi)["sekarang"]["versi"]), (200, "diterapkan", True, 2), "kunci 62 jam dikenali")
    sql("SELECT count(*) AS baris_operasi FROM operasi_sinkron")

    bagian("B. Queue paling lama 7 hari: 6 hari 23 jam diterima, 7 hari 1 jam ditolak")
    s, isi = sinkron("ani-hp1-0202", rames, 10, 1, 6 * 24 + 23)
    harap((s, j(isi)["status"]), (200, "diterapkan"), "6 hari 23 jam diterima")
    s, isi = sinkron("ani-hp1-0203", rames, 5, 2, 7 * 24 + 1)
    harap(s, 422, "7 hari 1 jam ditolak")
    harap(stok_versi(rames), (10, 2), "operasi ditolak tidak mengubah apa pun")
    sql("SELECT kunci, nilai, versi_dasar, status FROM operasi_sinkron ORDER BY kunci")
    catat("# Operasi yang ditolak tidak meninggalkan baris: HP mengambil keadaan terbaru lalu mengubah lagi")

    bagian("C. Kunci yang sama dengan isi lain ditolak; kunci milik akun lain tidak bisa dipakai, tetapi ditolak dengan alasan yang sama")
    s, isi = sinkron("ani-hp1-0201", mie, 7, 1, 62)
    harap((s, galat(isi, "field")), (422, "kunci"), "kunci sama isi beda")
    harap(stok_versi(mie), (0, 2), "stok mie tidak berubah")
    masuk("warung.sari@lestari.example", "Warung Sari")
    s, isi = sinkron("ani-hp1-0201", produk_sari, 0, 1, 62, token=d.TOKEN["Warung Sari"], perangkat=hp_sari)
    harap((s, galat(isi, "field")), (422, "kunci"), "kunci Ani dipakai Sari")
    catat("# Kunci operasi_sinkron adalah kunci utama global: Sari mendapat 422 yang sama dengan Ani, jadi jawabannya membuka bahwa "
          "kunci itu sudah dipakai akun lain. Kunci per perangkat lebih rapi (catatan polesan, SETELAH-TAHAP-3)")
    harap(stok_versi(produk_sari), (50, 1), "stok Sari tidak berubah")

    bagian("D. 15 hari sesudah Jumat: kunci dibuang job -bersih; operasi lama tidak bisa dikirim sebagai operasi baru")
    ke_jam(15 * 24, "Sabtu 16.50, 15 hari kemudian")
    sql("UPDATE operasi_sinkron SET dibuat_di_hp = dibuat_di_hp - interval '15 days'", tampil=False)
    catat("# Stempel baris digeser 15 hari ke belakang (jam database tidak ikut diperankan)")
    sql("SELECT count(*) AS baris_operasi FROM operasi_sinkron")
    harap(bersih(), "bersih: 0 baris outbox selesai (lebih dari 7 hari), 2 operasi sinkron (lebih dari 14 hari)", "kunci > 14 hari dibuang")
    sql("SELECT count(*) AS baris_operasi FROM operasi_sinkron")
    ani = masuk("warung.ani@lestari.example", "Warung Ani")
    s, isi = sinkron("ani-hp1-0201", mie, 0, 1, 15 * 24)
    harap((s, galat(isi, "field")), (422, "dibuat_di_hp"), "operasi 15 hari ditolak")
    harap(stok_versi(mie), (0, 2), "stok mie tidak berubah")
    catat("# Kunci sudah dibuang, tetapi operasinya lebih tua dari 7 hari: ditolak, tidak diterapkan sebagai operasi baru. "
          "Queue 7 hari lebih pendek dari kunci 14 hari, jadi kunci selalu hidup selama operasinya masih bisa dikirim")

    bagian("E. Pembayaran tidak pernah lewat sinkron offline: ditolak apa pun isinya")
    jurnal_sebelum = satu("SELECT count(*) FROM jurnal WHERE jenis <> 'topup'")
    for jenis in ("bayar", "transfer", "topup"):
        s, isi = sinkron(f"ani-{jenis}", mie, 28000, 1, 0, jenis=jenis, tampil=(jenis == "bayar"))
        harap((s, galat(isi, "field"), (galat(isi, "pesan") or "").startswith("pembayaran tidak pernah")),
              (422, "jenis", True), f"{jenis} lewat sinkron")
    catat("# transfer dan topup ditolak dengan jawaban yang sama (tidak dicetak ulang)")
    harap(satu("SELECT count(*) FROM jurnal WHERE jenis <> 'topup'"), jurnal_sebelum, "tidak ada jurnal baru")
    sql("SELECT count(*) AS baris_operasi FROM operasi_sinkron")
    catat("# Pembayaran dari queue offline akan memakai Idempotency-Key 24 jam; kunci24.txt E merekam apa yang terjadi bila ulangannya datang sesudah 62 jam")
    tulis("sinkron14.txt", "kunci sinkron 14 hari, queue 7 hari, dan pembayaran yang tidak lewat sinkron", "972")


BAGIAN = {"m24": rekam_m24, "versi": rekam_versi, "kunci24": rekam_kunci24, "sinkron14": rekam_sinkron14}


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


if __name__ == "__main__":
    main()
