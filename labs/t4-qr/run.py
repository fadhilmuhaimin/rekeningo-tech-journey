"""Rekam lab t4-qr: payload QR bergaya EMV dengan CRC, QR statis lawan dinamis, dan laporan QR palsu di atas api-t4.

Server, skema, data awal, dan semua perilaku QR (statis, dinamis, konfirmasi, pembayaran, laporan) adalah milik
`labs/api-t4` (`dasar_t4.py`, `cmd/api`), bukan salinan. Yang baru di lab ini: paket `internal/qrpayload` (payload
bergaya EMV dengan tag 01 dan CRC di tag 63), perintah `cmd/qrlab` (membangun, memeriksa, memalsukan, dan merusak
payload), dan tes Go berbuild tag `t4qr` di `internal/qrpayload` dan `internal/service`. Server TIDAK membaca payload:
ia hanya menerima id QR. Pemindai di rekaman ini adalah skrip lab (`qrlab urai`, lalu `GET /qr/{id}`), bukan app, dan
pemalsu adalah pemanggilan `qrlab ganti`, bukan penyerang sungguhan. Setiap bagian membuat ulang schema dan data awal
dari nol, jadi output/*.txt tidak bergantung pada urutan bagian dan rekaman ulang identik per byte (make cek). Id QR,
token, waktu, dan CRC pada payload dari server diberi label; jam server diperankan lewat POST /lab/jam, tidak
ditunggu. Semua berjalan di komputer lab; tidak ada panggilan keluar. Lab gagal keras bila hasil meleset dari yang
diharapkan.

    make -C labs/t4-qr run                      (butuh: Docker, Go; PostgreSQL lewat labs/b3-race)
    make -C labs/t4-qr run BAGIAN=dinamis       (satu bagian: crc statis dinamis lapor testing)
"""
import binascii, datetime, json, pathlib, re, subprocess, sys, time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "api-t4"))
import dasar_t4 as d  # noqa: E402
from dasar_t4 import PORT, bagian, catat, curl, gagal, harap, j, login, samarkan, samaran  # noqa: E402

LAB = "t4-qr"
SCH = "tahap4_qr"
TES = "tahap4_qr_tes"
DB = d.db_app(SCH)
d.OUT = HERE / "output"           # dasar_t4.tulis menulis ke d.OUT; di sini output lab ini
BIN_QR = d.HERE / "qrlab"
SANDI_LAB = "sandi-lab-qr-12345"  # data lab untuk akun yang didaftarkan lewat POST /daftar, bukan secret

# Id QR tetap untuk bagian crc: payload yang dicetak di sana tidak bergantung pada id acak database.
ID_MARNI = "00000000-0000-4000-8000-000000000001"
ID_ANDALAN = "00000000-0000-4000-8000-000000000002"

def sql(q, tampil=True):
    """Seperti dasar_t4.sql, tetapi label menggantikan id acak SEBELUM lebar kolom dihitung, supaya tabel tetap rapat."""
    with d.sambung(SCH) as c:
        cur = c.execute(q)
        kolom = [x.name for x in cur.description] if cur.description else None
        isi = cur.fetchall() if kolom else []
        if tampil:
            catat("=> " + q.strip().replace("\n", "\n   "))
            baris = [[v if v is None or isinstance(v, bool) else samarkan(str(v)) for v in r] for r in isi]
            for b in (d.tabel(kolom, baris) if kolom else [cur.statusmessage]):
                catat(samarkan(b))
        return isi


def satu(q):
    return d.satu(q, SCH)


def tulis(nama, judul):
    d.tulis(nama, judul, lab=LAB, schema=SCH)


# ---------- dasar ----------

def siapkan():
    d.buat_schema(SCH)
    d.seed(SCH)


def mulai(args=(), tampil=None):
    d.mulai_api(list(args), tampil=tampil, db=DB)


def bangun_qrlab():
    subprocess.run(["go", "build", "-o", str(BIN_QR), "./cmd/qrlab"], cwd=d.HERE, check=True)


def qrlab(*args):
    """Jalankan qrlab; kembalikan (exit, keluaran tanpa spasi di ujung)."""
    r = subprocess.run([str(BIN_QR), *args], capture_output=True, text=True)
    return r.returncode, r.stdout.strip()


def crc_py(teks):
    """CRC-16 dengan nilai awal 0xFFFF dari pustaka standar Python: pembanding yang tidak memakai kode Go."""
    return f"{binascii.crc_hqx(teks.encode(), 0xFFFF):04X}"


def pasang_crc_py(sampai_tag63):
    return sampai_tag63 + crc_py(sampai_tag63)


def tlv_baca(isi):
    """Pembaca TLV sederhana di Python (pembanding): daftar (tag, nilai) dari payload tanpa nilai CRC."""
    hasil, i = [], 0
    while i < len(isi):
        tag, n = isi[i:i + 2], int(isi[i + 2:i + 4])
        hasil.append((tag, isi[i + 4:i + 4 + n]))
        i += 4 + n
    return hasil


def tp(payload):
    """Payload untuk dicetak dari rekaman yang idnya acak: id diberi label dan nilai CRC disembunyikan."""
    return samarkan(payload)[:-4] + "<crc>"


def sql_saldo(*akun):
    ids = ", ".join(str(a) for a in akun)
    sql(f"SELECT a.nama, b.saldo_cache AS saldo FROM buku b JOIN akun a ON a.id = b.akun_id WHERE a.id IN ({ids}) ORDER BY a.id")


def buat_qr(token, label, jenis, nominal=None, tampil=True):
    """POST /qr; id QR didaftarkan sebagai label sebelum apa pun dicetak. Kembalikan id."""
    badan = {"jenis": jenis} if nominal is None else {"jenis": jenis, "nominal": nominal}
    s, isi = curl("POST", "/qr", badan, token, tampil=tampil, daftarkan=lambda k, i: samaran.__setitem__(j(i)["id"], label))
    harap(s, 201, f"buat {label}")
    return j(isi)["id"]


def konfirmasi(token, qid, tampil=False):
    s, isi = curl("GET", f"/qr/{qid}", token=token, tampil=tampil)
    return s, j(isi)


def payload_dari_server(token, qid, tampil=True):
    """Penerbit stiker: membangun payload dari id, jenis, nominal, nama, dan kota yang dijawab server."""
    s, k = konfirmasi(token, qid)
    harap(s, 200, "konfirmasi untuk membangun payload")
    args = ["buat", "-jenis", k["jenis"], "-id", qid, "-nama", k["merchant"]["nama"], "-kota", k["merchant"]["kota"]]
    if k.get("nominal"):
        args += ["-nominal", str(k["nominal"])]
    rc, p = qrlab(*args)
    harap(rc, 0, "qrlab buat")
    if tampil:
        catat(f"$ qrlab {' '.join(a if ' ' not in a else repr(a) for a in args)}".replace(qid, samaran.get(qid, qid)))
        catat(tp(p))
    return p


def pindai(judul, payload, token):
    """Pemindai lab (tiruan app, bukan app): periksa payload dengan CRC, lalu minta layar konfirmasi dari server.
    Kembalikan (isi payload atau None, status konfirmasi, isi konfirmasi)."""
    catat(f"# {judul}")
    rc, out = qrlab("urai", payload)
    catat(f"pemindai: payload {tp(payload)}")
    if rc != 0:
        catat(f"pemindai: {out}; payload ditolak, server tidak dihubungi")
        return None, None, None
    isi = json.loads(out)
    nominal = f"; nominal Rp{isi['nominal']:,}".replace(",", ".") if isi.get("nominal") else ""
    catat(f"pemindai: CRC cocok; jenis {isi['jenis']}; id {samarkan(isi['id'])}{nominal}; nama di payload {isi['nama']!r}; kota di payload {isi['kota']!r}")
    s, k = konfirmasi(token, isi["id"])
    if s != 200:
        catat(f"server: GET /qr/{{id}} -> {s}")
        return isi, s, None
    catat(f"server: GET /qr/{{id}} -> 200; nama {k['merchant']['nama']!r}; kota {k['merchant']['kota']!r}; terverifikasi {'ya' if k['terverifikasi'] else 'tidak'}")
    sama = isi["nama"] == k["merchant"]["nama"] and isi["kota"] == k["merchant"]["kota"]
    catat(f"nama dan kota di payload sama dengan jawaban server: {'ya' if sama else 'tidak'}")
    if isi.get("nominal") and k.get("nominal"):
        catat(f"nominal di payload sama dengan jawaban server: {'ya' if isi['nominal'] == k['nominal'] else 'tidak'}"
              f" (payload Rp{isi['nominal']:,}; server Rp{k['nominal']:,})".replace(",", "."))
    return isi, s, k


def isi_kota_merchant():
    """Data awal lab: seed api-t4 tidak mengisi akun.kota_id untuk merchant luar, padahal layar konfirmasi menampilkan kota."""
    catat("# Data awal lab: seed tidak mengisi kota merchant luar; dua merchant diberi kota lewat SQL pemilik schema supaya konfirmasi memuat kota.")
    sql("UPDATE akun SET kota_id = (SELECT id FROM kota WHERE nama = 'Jakarta') WHERE id = 30001")
    sql("UPDATE akun SET kota_id = (SELECT id FROM kota WHERE nama = 'Surabaya') WHERE id = 30002")


# ---------- crc: parameter, salah baca, penggantian ----------

def rekam_crc():
    bagian("A. Parameter CRC: polinomial 0x1021, nilai awal 0xFFFF; dua implementasi yang tidak saling memakai")
    catat("# CRC-16 di Go (internal/qrpayload) dibandingkan dengan binascii.crc_hqx dari pustaka standar Python, nilai awal 0xFFFF.")
    catat("# Nilai uji untuk \"123456789\" adalah 0x29B1, nilai 'check' CRC-16/IBM-3740 (nama lain CRC-16/CCITT-FALSE) di katalog CRC yang dibuka 2026-10-27.")
    for teks in ["123456789", "", "A", "6304"]:
        rc, go = qrlab("crc", teks)
        harap(rc, 0, "qrlab crc")
        harap(go, crc_py(teks), f"CRC {teks!r}")
        catat(f"CRC({teks!r}) Go {go}, Python {crc_py(teks)}")
    harap(qrlab("crc", "123456789")[1], "29B1", 'nilai uji "123456789"')
    catat("# Yang tidak dibuktikan lab ini: bahwa PDF spesifikasi EMVCo menetapkan parameter itu untuk tag 63. Sumber yang bisa dibuka (dokumen")
    catat("# turunan yang mengutip spesifikasi itu) menulisnya; PDF EMVCo belum dibuka [perlu verifikasi di PDF EMVCo].")

    bagian("B. Payload QR statis dan dinamis: tag 01 bernilai 11 atau 12, CRC di tag 63 paling belakang (id QR tetap milik lab)")
    arti = {"00": "versi format", "01": "11 statis, 12 dinamis", "26": "template merchant: pengenal lab dan id QR", "52": "kategori (nilai tetap lab)",
            "53": "mata uang (nilai tetap lab)", "54": "nominal", "58": "negara (nilai tetap lab)", "59": "nama merchant", "60": "kota merchant"}
    contoh = {}
    for jenis, nominal in (("statis", None), ("dinamis", 35000)):
        args = ["buat", "-jenis", jenis, "-id", ID_MARNI, "-nama", "Toko Sumber Rejeki", "-kota", "Jakarta"]
        if nominal:
            args += ["-nominal", str(nominal)]
        rc, p = qrlab(*args)
        harap(rc, 0, f"buat {jenis}")
        contoh[jenis] = p
        catat(f"$ qrlab {' '.join(a if ' ' not in a else repr(a) for a in args)}")
        catat(p)
        baris = [(t, f"{len(v):02d}", v, arti.get(t, "")) for t, v in tlv_baca(p[:-8])] + [("63", "04", p[-4:], "CRC-16 atas semua yang di depannya termasuk \"6304\"")]
        for b in d.tabel(["tag", "panjang", "nilai", "arti"], baris):
            catat(b)
        harap(p[-8:-4], "6304", "tag 63 di ujung")
        harap(crc_py(p[:-4]), p[-4:], f"CRC payload {jenis} menurut Python")
        harap(dict(tlv_baca(p[:-8]))["01"], "11" if jenis == "statis" else "12", f"tag 01 {jenis}")
        rc, out = qrlab("urai", p)
        harap(rc, 0, "urai")
        catat(f"$ qrlab urai <payload {jenis}>")
        catat(out)
        # Pembanding: isi yang dibaca Python dari tag mentah harus sama, nilai demi nilai, dengan JSON dari Go.
        tag = dict(tlv_baca(p[:-8]))
        sub = dict(tlv_baca(tag["26"]))
        python = {"jenis": "statis" if tag["01"] == "11" else "dinamis", "id": sub["01"], "nama": tag["59"], "kota": tag["60"]}
        if "54" in tag:
            python["nominal"] = int(tag["54"])
        harap(json.loads(out), python, f"isi payload {jenis}: Go lawan Python")
    catat("# Pembaca TLV di Python (tag mentah) menghasilkan jenis, id, nama, kota, dan nominal yang sama, nilai demi nilai, dengan JSON dari qrlab urai;")
    catat("# CRC kedua payload diperiksa ulang dengan binascii.crc_hqx.")

    bagian("C. Salah baca: satu karakter yang berubah membuat CRC tidak cocok")
    p = contoh["dinamis"]
    for nama, pos in (("di nama merchant", p.index("Sumber")), ("di id QR", p.index("0000-4000") + 2), ("di nominal", p.index("35000") + 1)):
        rc, rusak = qrlab("rusak", "-posisi", str(pos), p)
        rc2, out = qrlab("urai", rusak)
        harap(rc2, 1, f"urai payload rusak {nama}")
        harap(out.startswith("galat crc"), True, f"galat crc {nama}")
        catat(f"karakter ke-{pos} ({nama}) diganti; {qrlab('urai', rusak)[1]}")
    go = subprocess.run(["go", "test", "-count=1", "-v", "-tags", "t4qr", "-run", "TestPayloadSalahBacaSatuKarakterTerdeteksiSemua|TestPayloadDuaKarakterBertukarTempatTerdeteksi", "./internal/qrpayload"],
                        cwd=d.HERE, capture_output=True, text=True, env=d.ENV)
    harap(go.returncode, 0, "go test salah baca")
    for l in go.stdout.splitlines():
        if l.startswith("LAB|"):
            catat(l[4:])

    bagian("D. Penggantian: CRC dihitung ulang tanpa kunci apa pun, dan payload yang diubah lolos")
    asli = contoh["statis"]
    rc, palsu = qrlab("ganti", "-id", ID_ANDALAN, asli)
    harap(rc, 0, "qrlab ganti")
    catat(f"payload asli     : {asli}")
    catat(f"payload dipalsukan: {palsu}")
    catat(f"selisih: id QR berubah; CRC berubah dari {asli[-4:]} menjadi {palsu[-4:]}")
    rc, out = qrlab("urai", palsu)
    harap(rc, 0, "payload palsu lolos CRC")
    catat(f"$ qrlab urai <payload dipalsukan>\n{out}")
    mentah = asli.replace(ID_MARNI, ID_ANDALAN)
    rc, out = qrlab("urai", mentah)
    harap(rc, 1, "ganti teks tanpa CRC baru")
    catat(f"teks diganti tanpa menghitung CRC baru: {out}")
    kasar = pasang_crc_py(mentah[:-4])
    rc, out = qrlab("urai", kasar)
    harap((rc, kasar == palsu), (0, True), "ganti teks dengan CRC baru dari Python")
    catat("teks diganti lalu CRC dihitung ulang dengan binascii.crc_hqx (tanpa alat lab): lolos, hasilnya sama persis dengan keluaran qrlab ganti")
    catat("# CRC tidak memakai kunci rahasia, jadi mendeteksi salah baca, bukan penggantian. Keaslian QR tidak bisa dibuktikan dari payload.")

    bagian("E. Isi yang bertentangan ditolak walau CRC-nya dihitung ulang (galatnya bukan CRC)")
    badan = asli[:-8]
    varian = [
        ("tag 01 bernilai 13", badan.replace("010211", "010213", 1), "galat inisiasi"),
        ("tag 01 bernilai 10", badan.replace("010211", "010210", 1), "galat inisiasi"),
        ("tag 00 bernilai 02", badan.replace("000201", "000202", 1), "galat bentuk"),
        ("QR statis membawa nominal (tag 54)", badan.replace("5204", "5405100005204", 1), "galat isi"),
        ("QR dinamis tanpa nominal (tag 01 jadi 12)", badan.replace("010211", "010212", 1), "galat isi"),
    ]
    for judul, isi, harus in varian:
        rc, out = qrlab("urai", pasang_crc_py(isi + "6304"))
        harap((rc, out.startswith(harus)), (1, True), judul)
        catat(f"{judul}: {out}")
    tulis("crc.txt", "payload QR bergaya EMV: tag 01, CRC di tag 63, salah baca lawan penggantian")


# ---------- statis: stiker yang ditempel di atas stiker ----------

def rekam_statis():
    siapkan()
    isi_kota_merchant()
    mulai(tampil="# server: ./api-t4 -lab (satu proses; server hanya menerima id QR, tidak membaca payload)")
    marni = login("merchant1@merchant.example", label="Bu Marni")
    andalan = login("merchant2@merchant.example", label="Toko Andalan")
    budi = login("budi@lestari.example", label="Budi")
    eko = login("pemakai2@publik.example", label="Eko")

    bagian("A. Dua merchant sah menerbitkan QR statis; penerbit stiker membangun payload dari jawaban server")
    qm = buat_qr(marni, "<qr statis Bu Marni>", "statis")
    qa = buat_qr(andalan, "<qr statis Toko Andalan>", "statis")
    pm = payload_dari_server(budi, qm)
    pa = payload_dari_server(budi, qa)
    sql_saldo(419, 30001, 30002)

    bagian("B. Stiker Toko Andalan ditempel di atas stiker Bu Marni; Budi memindai dan membayar Rp35.000")
    catat("# Skenario (Ilustrasi): stiker Toko Andalan tertempel di kasir Bu Marni. Lab hanya memerankan pemindaian payload Toko Andalan dan pembayarannya; letak stiker tidak ada di sistem.")
    isi, s, k = pindai("Budi memindai stiker yang tertempel di kasir Bu Marni", pa, budi)
    harap((isi["id"], s, k["merchant"]["nama"]), (qa, 200, "Toko Andalan"), "pemindaian stiker Andalan")
    s, resp = curl("POST", f"/qr/{qa}/bayar", {"nominal": 35_000}, budi)
    harap(s, 201, "Budi membayar stiker Andalan")
    sql_saldo(419, 30001, 30002)
    sql("SELECT j.jenis, a.nama, p.jumlah FROM jurnal j JOIN posting p ON p.jurnal_id = j.id JOIN buku b ON b.id = p.buku_id JOIN akun a ON a.id = b.akun_id "
        "WHERE j.id = (SELECT max(id) FROM jurnal) ORDER BY p.jumlah")
    harap(satu("SELECT sum(p.jumlah) FROM posting p WHERE p.jurnal_id = (SELECT max(id) FROM jurnal)"), 0, "jurnal seimbang")
    sql("SELECT a.nama AS penerima_pemberitahuan, o.jenis, o.status FROM outbox o JOIN akun a ON a.id = o.akun_id WHERE o.jurnal_id = (SELECT max(id) FROM jurnal)")
    sql("SELECT count(*) AS posting_di_buku_bu_marni FROM posting p JOIN buku b ON b.id = p.buku_id WHERE b.akun_id = 30001")
    harap(satu("SELECT count(*) FROM posting p JOIN buku b ON b.id = p.buku_id WHERE b.akun_id = 30001"), 0, "tidak ada posting di buku Bu Marni")
    sql("SELECT sum(p.jumlah) AS jumlah_posting FROM posting p WHERE p.jurnal_id = (SELECT max(id) FROM jurnal)")
    sql("SELECT nama, jenis, tingkat, status FROM akun WHERE id IN (30001, 30002) ORDER BY id")
    sql("SELECT column_name FROM information_schema.columns WHERE table_schema = 'tahap4_qr' AND table_name = 'qr' ORDER BY ordinal_position")
    catat("# Jurnal seimbang, merchant penerima aktif dan terverifikasi, saldo cukup: pembayaran sah menurut semua aturan yang dimiliki server.")
    catat("# Yang diterima server untuk membayar hanya sesi pembeli, id QR, dan nominal; tabel qr (kolom di atas) tidak punya lokasi atau pengenal stiker.")
    catat("# Tidak ada data yang menunjukkan di mana stiker itu tertempel, jadi tidak ada aturan yang bisa menolaknya.")

    bagian("C. Payload Bu Marni dengan id QR Toko Andalan dan CRC dihitung ulang: nama di payload lawan nama dari server")
    rc, px = qrlab("ganti", "-id", qa, pm)
    harap(rc, 0, "qrlab ganti")
    catat(f"$ qrlab ganti -id {samaran[qa]} <payload Bu Marni>")
    catat(tp(px))
    isi, s, k = pindai("Budi memindai payload yang idnya diganti", px, budi)
    harap((isi["nama"], isi["kota"], k["merchant"]["nama"], k["merchant"]["kota"]), ("Toko Sumber Rejeki", "Jakarta", "Toko Andalan", "Surabaya"), "nama di payload lawan nama dari server")
    catat("# Payload yang dipalsukan lolos CRC dan membawa nama dan kota Bu Marni, padahal id QR-nya milik Toko Andalan. Nama dan kota yang bisa")
    catat("# dipercaya hanya yang dijawab server dari tabel akun (merchant terverifikasi); nama di payload ditulis oleh siapa pun yang memegang payload.")

    bagian("D. Batas Rp200.000 per pembayaran QR statis (Asumsi produk): tepat di batas, satu rupiah di atasnya, dan pembayaran berulang")
    sql_saldo(40002)
    for nominal, harus in ((200_000, 201), (200_001, 422), (0, 422), (-1, 422), (None, 422), (200_000, 201)):
        s, resp = curl("POST", f"/qr/{qa}/bayar", {} if nominal is None else {"nominal": nominal}, eko)
        harap(s, harus, f"Eko membayar Rp{nominal}")
    sql_saldo(40002, 30002)
    catat("# Nominal yang tidak diisi pembeli (body kosong) pada QR statis ditolak 422 seperti nominal di luar batas: tidak ada nominal bawaan.")
    catat("# Batas berlaku per pembayaran, bukan per QR atau per hari: dua pembayaran Rp200.000 berturut-turut sama-sama diterima.")
    catat("# Kerugian pembeli yang tidak memeriksa tujuan paling banyak Rp200.000 untuk satu pembayaran; batas itu tidak mencegah pembayaran berikutnya.")

    bagian("E. Yang diperankan lab dan yang tidak terukur")
    catat("# Diperankan lab: pemindai (qrlab urai, lalu GET /qr/{id}) dan pemalsu (qrlab ganti). Tidak ada app di lab ini.")
    catat("# Server mengembalikan nama dan kota yang diverifikasi di GET /qr/{id}; apakah pembeli membaca dan membandingkannya dengan papan toko tidak terukur di lab (Asumsi).")
    catat("# Yang terpakai server hanya id QR; nilai tag lain di payload (nama, kota, nominal pada QR dinamis) tidak diperiksa server.")
    tulis("statis.txt", "stiker QR statis milik merchant lain, nama di payload lawan nama dari server, dan batas Rp200.000")


# ---------- dinamis: sekali pakai, nominal terikat, lima menit ----------

def rekam_dinamis():
    siapkan()
    isi_kota_merchant()
    mulai(["-jam-lab"], tampil="# server: ./api-t4 -lab -jam-lab (jam service diperankan lewat POST /lab/jam: 5 menit tidak ditunggu)")
    marni = login("merchant1@merchant.example", label="Bu Marni")
    budi = login("budi@lestari.example", label="Budi")
    eko = login("pemakai2@publik.example", label="Eko")
    jam = int(time.time() * 1000)
    harap(curl("POST", "/lab/jam", {"ms": jam}, tampil=False)[0], 204, "bekukan jam")

    bagian("A. QR dinamis: nominal Rp35.000 terikat pada id QR dan berlaku 5 menit sejak dibuat")
    q1 = buat_qr(marni, "<qr dinamis 1>", "dinamis", 35_000)
    s, k = konfirmasi(budi, q1, tampil=True)
    harap(s, 200, "konfirmasi")
    berlaku = int(datetime.datetime.fromisoformat(k["berlaku_sampai"]).timestamp() * 1000)
    harap(berlaku - jam, 300_000, "berlaku_sampai = jam + 300 detik")
    catat("berlaku_sampai dikurangi jam server: 300 detik")
    p1 = payload_dari_server(budi, q1)
    harap(dict(tlv_baca(p1[:-8]))["01"], "12", "tag 01 dinamis")
    pindai("Budi memindai QR dinamis", p1, budi)

    bagian("B. Sekali pakai: pembayaran pertama berhasil; pembayaran kedua oleh pembayar yang sama dan oleh pembayar lain ditolak")
    s, _ = curl("POST", f"/qr/{q1}/bayar", {}, budi)
    harap(s, 201, "bayar pertama")
    for token in (budi, eko):
        s, _ = curl("POST", f"/qr/{q1}/bayar", {}, token)
        harap(s, 409, "bayar kedua")
    s, _ = curl("GET", f"/qr/{q1}", token=budi)
    harap(s, 404, "konfirmasi sesudah dibayar")
    sql("SELECT jenis, status, nominal, jurnal_id IS NOT NULL AS ada_jurnal FROM qr")
    harap(satu("SELECT count(*) FROM jurnal WHERE keterangan LIKE 'Bayar QR%'"), 1, "satu jurnal untuk QR itu")
    sql_saldo(419, 40002, 30001)

    bagian("C. Nominal terikat pada id QR: payload dengan nominal Rp1 dan CRC baru lolos pemindai, tetapi server memotong Rp35.000")
    q2 = buat_qr(marni, "<qr dinamis 2>", "dinamis", 35_000)
    p2 = payload_dari_server(budi, q2, tampil=False)
    rc, p2palsu = qrlab("ganti", "-nominal", "1", p2)
    harap(rc, 0, "qrlab ganti nominal")
    catat(f"$ qrlab ganti -nominal 1 <payload dinamis 2>")
    catat(tp(p2palsu))
    isi, _, _ = pindai("pemindai membaca payload yang nominalnya dipalsukan", p2palsu, budi)
    harap(isi["nominal"], 1, "payload palsu membawa nominal 1")
    sql_saldo(40002)
    for nominal in (1, 34_999, 35_001):
        s, _ = curl("POST", f"/qr/{q2}/bayar", {"nominal": nominal}, eko)
        harap(s, 422, f"bayar dengan nominal {nominal}")
    sql_saldo(40002)
    s, resp = curl("POST", f"/qr/{q2}/bayar", {}, eko)
    harap((s, j(resp)["nominal"]), (201, 35_000), "bayar tanpa body")
    sql_saldo(40002)

    bagian("D. Kedaluwarsa di kedua sisi batas 5 menit (Asumsi, ADR 40): jam diperankan 299, 300, dan 301 detik sesudah QR dibuat")
    harap(curl("POST", "/lab/jam", {"ms": jam}, tampil=False)[0], 204, "jam kembali ke awal")
    q3, q4, q5 = (buat_qr(marni, f"<qr dinamis {n}>", "dinamis", 35_000, tampil=False) for n in (3, 4, 5))
    catat("# Tiga QR dinamis Rp35.000 dibuat pada jam yang sama (jam server dibekukan).")
    for detik, qid, harus_lihat, harus_bayar in ((299, q3, 200, 201), (300, q4, 404, 410), (301, q5, 404, 410)):
        harap(curl("POST", "/lab/jam", {"ms": jam + detik * 1000}, tampil=False)[0], 204, "majukan jam")
        catat(f"# jam server: dibuat + {detik} detik")
        s, _ = curl("GET", f"/qr/{qid}", token=budi)
        harap(s, harus_lihat, f"konfirmasi pada {detik} detik")
        s, _ = curl("POST", f"/qr/{qid}/bayar", {}, budi)
        harap(s, harus_bayar, f"bayar pada {detik} detik")
    sql("SELECT status, count(*) AS jumlah FROM qr GROUP BY status ORDER BY status")
    sql_saldo(419)
    catat("# Pada 300 detik (tepat batas) QR sudah kedaluwarsa; pada 299 detik masih terbayar. Penandaan kedaluwarsa ditulis saat ada pembayaran yang ditolak.")
    tulis("dinamis.txt", "QR dinamis: nominal terikat pada id QR, sekali pakai, dan kedaluwarsa 5 menit")


# ---------- lapor: laporan QR palsu membekukan merchant lebih dulu ----------

def rekam_lapor():
    siapkan()
    isi_kota_merchant()
    mulai(["-jam-lab"], tampil="# server: ./api-t4 -lab -jam-lab (jam service dibekukan lewat POST /lab/jam: batas laju tidak terisi di tengah rekaman, jadi Retry-After sama di setiap run)")
    harap(curl("POST", "/lab/jam", {"ms": int(time.time() * 1000)}, tampil=False)[0], 204, "bekukan jam")
    marni = login("merchant1@merchant.example", label="Bu Marni")
    andalan = login("merchant2@merchant.example", label="Toko Andalan")
    budi = login("budi@lestari.example", label="Budi")
    eko = login("pemakai2@publik.example", label="Eko")
    ratih = login("ratih@rekeningo.example", label="Ratih")
    risk2 = login("risk.dua@rekeningo.example", label="Risk Dua")

    bagian("A. Setiap merchant menerbitkan satu QR statis")
    qm = buat_qr(marni, "<qr statis Bu Marni>", "statis")
    qa = buat_qr(andalan, "<qr statis Toko Andalan>", "statis")
    # Merchant 3 sampai 6: QR statis dibuat lewat SQL pemilik schema (data awal lab). Batas laju login per alamat (10 per menit)
    # membatasi jumlah login dalam satu rekaman, dan perilaku POST /qr sudah direkam di atas.
    catat("# Merchant 3 sampai 6 diberi satu QR statis lewat SQL pemilik schema (data awal lab; batas login per alamat 10 per menit membatasi jumlah login).")
    sql("INSERT INTO qr (akun_id, jenis) SELECT id, 'statis' FROM akun WHERE id BETWEEN 30003 AND 30006 ORDER BY id")
    kecil = {}
    for n in (3, 4, 5, 6):
        kecil[n] = str(satu(f"SELECT id FROM qr WHERE akun_id = {30000 + n}"))
        samaran[kecil[n]] = f"<qr statis Merchant {n}>"
    sql("SELECT id, nama, status FROM akun WHERE id BETWEEN 30001 AND 30006 ORDER BY id")

    bagian("B. Laporan terhadap stiker yang memang palsu: Budi melaporkan QR Toko Andalan yang tertempel di kasir Bu Marni")
    alasan = "stiker ini ditempel di atas stiker toko yang asli di kasir"
    s, _ = curl("POST", f"/qr/{qa}/laporkan", {"alasan": alasan}, budi)
    harap(s, 202, "laporan Budi")
    sql("SELECT id, nama, status FROM akun WHERE id IN (30001, 30002) ORDER BY id")
    s, _ = curl("GET", f"/qr/{qa}", token=budi)
    harap(s, 404, "QR Andalan sesudah dibekukan")
    s, _ = curl("POST", "/qr", {"jenis": "statis"}, andalan)
    harap(s, 403, "Andalan beku tidak menerbitkan QR")
    s, _ = curl("GET", f"/qr/{qm}", token=budi)
    harap(s, 200, "QR Bu Marni tidak terpengaruh")
    sql("SELECT peran, aksi, objek, alasan FROM audit_log ORDER BY id")

    bagian("C. Laporan terhadap stiker yang asli: Eko melaporkan QR Bu Marni sendiri; server tidak membedakan laporan yang benar dari yang salah")
    s, _ = curl("POST", f"/qr/{qm}/bayar", {"nominal": 20_000}, budi, tampil=False)
    harap(s, 201, "Budi membayar Bu Marni sebelum laporan")
    catat("# Sebelum laporan, Budi membayar Rp20.000 ke QR Bu Marni (HTTP 201; tidak dicetak).")
    sql_saldo(30001)
    s, _ = curl("POST", f"/qr/{qm}/laporkan", {"alasan": "QR ini tampak janggal dan mungkin palsu, mohon diperiksa"}, eko)
    harap(s, 202, "laporan Eko terhadap Bu Marni")
    sql("SELECT id, nama, status FROM akun WHERE id = 30001")
    s, _ = curl("GET", f"/qr/{qm}", token=budi)
    harap(s, 404, "QR Bu Marni sesudah dibekukan")
    s, _ = curl("POST", f"/qr/{qm}/bayar", {"nominal": 35_000}, budi)
    harap(s, 404, "Budi membayar QR Bu Marni yang asli")
    s, _ = curl("POST", "/qr", {"jenis": "dinamis", "nominal": 35_000}, marni)
    harap(s, 403, "Bu Marni beku tidak menerbitkan QR")
    sql_saldo(30001)
    harap(satu("SELECT saldo_cache FROM buku WHERE akun_id = 30001"), 20_000, "saldo Bu Marni tidak ditarik")
    catat("# Pembeli yang memindai stiker Bu Marni yang asli kini mendapat jawaban yang sama dengan QR yang tidak pernah ada (404).")
    catat("# Uang yang sudah diterima tidak ditarik: pembekuan mengubah status akun, bukan posting.")

    bagian("D. Akun yang baru didaftarkan (belum terverifikasi) dapat melaporkan: tiga merchant beku dalam satu jam, laporan keempat ditolak batas laju")
    s, resp = curl("POST", "/daftar", {"nama": "Pelapor Baru", "email": "pelapor.baru@publik.example", "password": SANDI_LAB})
    harap((s, j(resp)["tingkat"]), (201, "belum"), "daftar")
    baru = login("pelapor.baru@publik.example", SANDI_LAB, label="Pelapor Baru")
    for n, harus in ((3, 202), (4, 202), (5, 202), (6, 429)):
        s, _ = curl("POST", f"/qr/{kecil[n]}/laporkan", {"alasan": f"stiker di kasir tidak sama dengan papan toko {n}"}, baru)
        harap(s, harus, f"laporan Pelapor Baru terhadap Merchant {n}")
    sql("SELECT id, nama, status FROM akun WHERE id BETWEEN 30003 AND 30006 ORDER BY id")
    catat("# Satu laporan sudah cukup membekukan, di api-t4 hanya panjang alasan (20 sampai 200 karakter) dan laju laporan per akun (3 per jam, Asumsi lab) yang diperiksa; pelapor dan kebenaran isi laporan tidak diverifikasi.")

    bagian("E. Masukan berbentuk salah mengambil jatah laju sebelum ditolak: tiga alasan terlalu pendek (422), lalu laporan yang benar ditolak batas laju (429)")
    s, resp = curl("POST", "/daftar", {"nama": "Pelapor Dua", "email": "pelapor.dua@publik.example", "password": SANDI_LAB}, tampil=False)
    harap(s, 201, "daftar pelapor kedua")
    dua = login("pelapor.dua@publik.example", SANDI_LAB, label="Pelapor Dua")
    for _ in range(3):
        s, _ = curl("POST", f"/qr/{kecil[6]}/laporkan", {"alasan": "palsu"}, dua)
        harap(s, 422, "alasan terlalu pendek")
    s, _ = curl("POST", f"/qr/{kecil[6]}/laporkan", {"alasan": "stiker di kasir tidak sama dengan papan toko 6"}, dua)
    harap(s, 429, "laporan yang benar sesudah tiga masukan salah")
    sql("SELECT id, nama, status FROM akun WHERE id = 30006")
    catat("# Urutan di api-t4: bentuk id QR, batas laju per akun, lalu panjang alasan. Masukan yang salah mengambil token laju sebelum ditolak (disengaja di api-t4:")
    catat("# tiap percobaan dihitung, Asumsi lab), jadi pelapor yang salah ketik tiga kali tidak bisa melapor sampai token terisi lagi.")

    bagian("F. Pemulihan: tim risk membuka merchant dengan persetujuan petugas kedua; tidak ada pemulihan otomatis")
    alasan_buka = "Pemilik toko sudah dikonfirmasi, stiker yang tertempel bukan miliknya"
    catat("# Pembukaan yang tidak memenuhi syarat ditolak 403 dengan jawaban yang sama untuk semua sebab, dan Bu Marni tetap beku:")
    for judul, pelaku, kepala in (("tanpa penyetuju", ratih, []),
                                  ("penyetuju sama dengan pelaku", ratih, [f"X-Penyetuju-Token: {ratih}"]),
                                  ("penyetuju bukan petugas risk (Budi)", ratih, [f"X-Penyetuju-Token: {budi}"]),
                                  ("pelaku bukan petugas risk (Budi), penyetuju petugas risk", budi, [f"X-Penyetuju-Token: {risk2}"])):
        catat(f"# {judul}")
        s, _ = curl("POST", "/bo/akun/30001/buka", {"alasan": alasan_buka}, pelaku, kepala=kepala)
        harap(s, 403, f"pembukaan {judul}")
    harap(satu("SELECT status FROM akun WHERE id = 30001"), "dibekukan", "Bu Marni tetap beku sesudah pembukaan yang ditolak")
    sql("SELECT id, nama, status FROM akun WHERE id = 30001")
    catat("# Dengan petugas risk yang menjalankan dan petugas risk lain sebagai penyetuju:")
    s, _ = curl("POST", "/bo/akun/30001/buka", {"alasan": alasan_buka}, ratih, kepala=[f"X-Penyetuju-Token: {risk2}"])
    harap(s, 204, "tim risk membuka Bu Marni")
    sql("SELECT id, nama, status FROM akun WHERE id BETWEEN 30001 AND 30006 ORDER BY id")
    s, _ = curl("GET", f"/qr/{qm}", token=budi)
    harap(s, 200, "QR Bu Marni sesudah dibuka")
    sql("SELECT peran, aksi, objek FROM audit_log ORDER BY id")
    catat("# Lama sampai tim risk membuka merchant yang sah tidak terukur di lab (Asumsi); merchant tetap beku sampai ada tindakan petugas.")
    tulis("lapor.txt", "laporan QR palsu: pembekuan sebelum pemeriksaan, dampaknya pada merchant sah, dan pemulihan")


# ---------- testing ----------

POLA_TES = "TestPayload|TestQRBatas|TestQRPindai"


def go(*args, env):
    r = subprocess.run(["go", *args], cwd=d.HERE, env=env, capture_output=True, text=True)
    teks = (r.stdout + "\n" + r.stderr).replace("\t", "  ")
    teks = re.sub(r" \(\d+\.\d+s\)", "", teks)
    teks = re.sub(r"^(ok|FAIL)(\s+\S+)\s+[\d.]+s", r"\1\2", teks, flags=re.M)
    teks = re.sub(r"^(ok\s+\S+)\s+\(cached\)", r"\1", teks, flags=re.M)
    return r.returncode, teks.strip()


def rekam_testing():
    d.buat_schema(TES)
    env = dict(d.ENV, TEST_DATABASE_URL=d.db_pemilik(TES, "t4-qr-tes"), LAB_TES_SCHEMA=TES)
    bagian(f"A. go vet dengan tag t4qr, lalu tes payload (tanpa database) dan tes service QR (PostgreSQL sungguhan, schema {TES})")
    rc, teks = go("vet", "-tags", "t4qr", "./internal/qrpayload", "./internal/service", "./cmd/qrlab", env=env)
    catat("$ go vet -tags t4qr ./internal/qrpayload ./internal/service ./cmd/qrlab")
    catat(teks or "(tanpa temuan)")
    catat(f"# exit status {rc}")
    harap(rc, 0, "go vet")
    perintah = ["test", "-v", "-count=1", "-p", "1", "-tags", "t4qr", "-run", POLA_TES, "./internal/qrpayload", "./internal/service"]
    rc, teks = go(*perintah, env=env)
    baris = [l[4:] if l.startswith("LAB|") else l for l in teks.splitlines() if l.startswith(("LAB|", "--- PASS", "--- FAIL", "--- SKIP", "PASS", "FAIL", "ok "))]
    catat(f"$ TEST_DATABASE_URL=<pemilik, schema {TES}> go test -v -count=1 -p 1 -tags t4qr -run '{POLA_TES}' ./internal/qrpayload ./internal/service")
    catat("\n".join(baris))
    catat(f"# exit status {rc}")
    if rc != 0:
        print(teks, file=sys.stderr)
    harap(rc, 0, "go test")
    harap("--- SKIP" in teks, False, "tes dilewati")
    harap(len(re.findall(r"^--- FAIL", teks, flags=re.M)), 0, "tes yang gagal")
    # Setiap tes bertag t4qr di dua paket itu harus muncul sebagai PASS: pola -run yang tidak cocok membuat klaim "tertangkap" tak berlaku.
    _, daftar = go("test", "-tags", "t4qr", "-list", POLA_TES, "./internal/qrpayload", "./internal/service", env=env)
    ada = {l.strip() for l in daftar.splitlines() if l.startswith("Test")}
    jalan = set(re.findall(r"^--- PASS: (\S+)", teks, flags=re.M))
    harap(sorted(ada - jalan), [], "tes bertag t4qr yang tidak dijalankan gerbang")
    # `go test -list` memakai pola yang sama dengan -run, jadi tes yang namanya tidak cocok dengan pola tidak pernah terdaftar.
    # Daftar kedua dibaca dari berkas tes bertag itu sendiri: tiap fungsi Test di dalamnya harus muncul sebagai PASS.
    tertulis = set()
    for berkas in ("internal/qrpayload/qrpayload_test.go", "internal/service/qr_pindai_test.go"):
        isi_berkas = (d.HERE / berkas).read_text()
        harap(isi_berkas.splitlines()[0], "//go:build t4qr", f"baris pertama {berkas}")
        tertulis |= set(re.findall(r"^func (Test\w+)\(", isi_berkas, flags=re.M))
    harap(sorted(tertulis - jalan), [], "fungsi tes di berkas bertag t4qr yang tidak muncul sebagai PASS")
    harap(len(tertulis) >= 20, True, "jumlah tes bertag t4qr")
    catat(f"# {len(jalan)} tes bertag t4qr lulus; tiap fungsi tes di dua berkas bertag (dibaca dari berkasnya, bukan dari pola -run) muncul sebagai PASS di atas.")
    tulis("testing.txt", "tes Go payload QR dan service QR dengan batas di kedua sisi")


BAGIAN = {"crc": [rekam_crc], "statis": [rekam_statis], "dinamis": [rekam_dinamis], "lapor": [rekam_lapor], "testing": [rekam_testing]}


def main():
    pilih = sys.argv[1:] or list(BAGIAN)
    for p in pilih:
        if p not in BAGIAN:
            gagal(f"bagian {p!r} tidak dikenal; pilihan: {', '.join(BAGIAN)}")
    d.bangun()
    bangun_qrlab()
    for p in pilih:
        for f in BAGIAN[p]:
            d.stop(PORT)
            d.samaran.clear()
            f()
            for port in list(d.server):
                d.stop(port)


if __name__ == "__main__":
    main()
