"""Rekam lab t5-kms: envelope encryption file arsip partisi dengan OpenBao transit (ADR 57).

Arsipnya dibuat dengan kode lab t5-partisi (riwayat posting, DETACH CONCURRENTLY, ekspor CSV `lepas.ekspor`), bukan file
yang tertinggal di folder sementara, supaya rekaman berasal dari database bersih. Yang baru di sini: modul Go `lab/t5kms`
(paket envelope, bao, jangkar, dan perintah kmsarsip), container OpenBao v2.7.2 mode dev, dan rekaman ini.

Dikirim penggerak lab, bukan akibat sistem: pembuatan kunci KEK, kebijakan dan token tiap peran, rotate dan konfigurasi versi
kunci (perintah operator), pengubahan berkas dan baris database yang diperankan penyerang, jeda dan restart container, dan
INSERT baris arsip_partisi (sebagai role api_t5; di sistem sungguhan job arsip yang menulisnya). Checksum, nonce, dan data
key bernilai acak per rekaman: rekaman menulis hasil perbandingan, bukan nilainya. Lab gagal keras bila hasil meleset.

    make -C labs/t5-kms run                      (butuh: Docker, Go; PostgreSQL lewat labs/b3-race)
    make -C labs/t5-kms run BAGIAN=rotasi        (satu bagian: arsip rotasi testing)
"""
import hashlib, json, os, pathlib, re, shutil, subprocess, sys, tempfile, time, urllib.error, urllib.request

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "t5-partisi"))
import dasar as x  # noqa: E402  (t5-partisi/dasar.py: partisi bulanan, riwayat posting, koneksi)
from alat import tgl  # noqa: E402
from lepas import ekspor  # noqa: E402

d = x.d
d.OUT = HERE / "output"
catat, harap, gagal, bagian, tampil = d.catat, d.harap, d.gagal, d.bagian, x.tampil

LAB = "t5-kms"
S = "tahap5_kms"
TES = "tahap5_kms_tes"
VERSI_BAO = "2.7.2"
IMG = f"ghcr.io/openbao/openbao:{VERSI_BAO}@sha256:5046911075e137e154ce49ab051502f4ec7cf367d484ae4a4dce665d9b90561f"
DASAR_BAO = 18331   # OpenBao mode dev (api-t5: 18310-18316; t5-fanout 18317; t5-service 18320-18324; t5-waf 18330)
PORT_BAO = d.port_lab(DASAR_BAO)
NAMA = f"t5kms-{d.DB_PORT}-bao"
LABEL = f"rjt.lab=t5-kms-{d.DB_PORT}"
ROOT = "lab-kms-dev-token"   # token root mode dev di container lokal; data lab, bukan secret
KEK = "kek-arsip"
BIN = HERE / "kmsarsip"
KERJA = pathlib.Path(tempfile.gettempdir()) / f"t5-kms-{d.DB_PORT}"
BAO = f"http://127.0.0.1:{PORT_BAO}"
TOKEN = {"operator": ROOT}
KEBIJAKAN = {
    "pengarsip": f'path "transit/datakey/plaintext/{KEK}" {{ capabilities = ["update"] }}',
    "pembuka": f'path "transit/decrypt/{KEK}" {{ capabilities = ["update"] }}',
    "pembungkus-ulang": f'path "transit/rewrap/{KEK}" {{ capabilities = ["update"] }}',
}
GALAT_GCM = "kmsarsip: autentikasi GCM gagal (cipher: message authentication failed)"
BULAN, BAYAR, BAYAR_INI = 2, 4_000, 3_800   # 28.000 posting per bulan, dua bulan diarsipkan


# ---------- Docker dan OpenBao ----------

def dk(*args, cek=True):
    r = subprocess.run(["docker", *args], capture_output=True, text=True)
    if cek and r.returncode != 0:
        gagal(f"docker {' '.join(args[:3])}: {(r.stderr or r.stdout).strip()[-300:]}")
    return r.stdout.strip()


def bersih_bao():
    ids = dk("ps", "-aq", "--filter", f"label={LABEL}", cek=False).split()
    if ids:
        dk("rm", "-f", *ids, cek=False)


def pastikan_image():
    if subprocess.run(["docker", "image", "inspect", IMG], capture_output=True).returncode == 0:
        return
    for _ in range(3):
        if subprocess.run(["docker", "pull", IMG], capture_output=True).returncode == 0:
            return
    gagal(f"image {IMG} tidak bisa diunduh: lab ini Tidak dijalankan di mesin ini")


def bao(metode, jalur, badan=None, token=ROOT, maks=5):
    req = urllib.request.Request(f"{BAO}/v1/{jalur}", method=metode, headers={"X-Vault-Token": token, "Content-Type": "application/json"},
                                 data=json.dumps(badan).encode() if badan is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=maks) as r:
            isi = r.read()
            return r.status, (json.loads(isi) if isi.strip() else {})
    except urllib.error.HTTPError as e:
        isi = e.read()
        return e.code, (json.loads(isi) if isi.strip() else {})


def tunggu_bao():
    def siap():
        try:
            s, j = bao("GET", "sys/seal-status", maks=1)
            return s == 200 and j.get("sealed") is False
        except (urllib.error.URLError, OSError, ValueError):
            return False
    d.tunggu(siap, "OpenBao siap", batas=30.0, jeda=0.1)


def mulai_bao():
    pastikan_image()
    d.port_bebas(PORT_BAO)
    bersih_bao()
    dk("run", "-d", "--name", NAMA, "--label", LABEL, "-e", f"BAO_DEV_ROOT_TOKEN_ID={ROOT}", "-p", f"127.0.0.1:{PORT_BAO}:8200",
       IMG, "server", "-dev", "-dev-no-store-token")
    tunggu_bao()
    s, j = bao("GET", "sys/seal-status")
    harap((j["version"], j["sealed"], j["storage_type"]), (VERSI_BAO, False, "inmem"), "OpenBao mode dev")
    d.samaran[BAO] = "http://127.0.0.1:<port openbao>"
    d.samaran[f"127.0.0.1:{PORT_BAO}"] = "127.0.0.1:<port openbao>"
    d.samaran[ROOT] = "<token operator>"


def siapkan_kunci():
    """Mesin transit, kunci KEK (aes256-gcm96), tiga kebijakan sempit, dan satu token per peran. Perintah operator."""
    harap(bao("POST", "sys/mounts/transit", {"type": "transit"})[0], 204, "mount transit")
    harap(bao("POST", f"transit/keys/{KEK}", {"type": "aes256-gcm96"})[0] in (200, 204), True, "buat KEK")
    for nama, aturan in KEBIJAKAN.items():
        harap(bao("PUT", f"sys/policies/acl/{nama}", {"policy": aturan})[0], 204, f"kebijakan {nama}")
        s, j = bao("POST", "auth/token/create", {"policies": [nama], "no_default_policy": True, "ttl": "2h"})
        harap(s, 200, f"token {nama}")
        TOKEN[nama] = j["auth"]["client_token"]
        d.samaran[TOKEN[nama]] = f"<token {nama}>"


def versi_kunci():
    s, j = bao("GET", f"transit/keys/{KEK}")
    harap(s, 200, "baca kunci")
    dt = j["data"]
    ada = sorted(int(k) for k in dt["keys"])
    return dict(terbaru=dt["latest_version"], min_buka=dt["min_decryption_version"], min_enkripsi=dt["min_encryption_version"],
                min_ada=dt["min_available_version"], tersedia=ada)


def catat_versi():
    v = versi_kunci()
    catat(f"# kunci {KEK}: versi terbaru {v['terbaru']}, min_decryption_version {v['min_buka']}, min_encryption_version {v['min_enkripsi']}, "
          f"min_available_version {v['min_ada']}, versi yang tampil di daftar kunci {v['tersedia']}")
    return v


def operator(metode, jalur, badan=None, ket=None):
    s, j = bao(metode, jalur, badan)
    isi = f" -d '{json.dumps(badan)}'" if badan is not None else ""
    catat(f"$ curl -X {metode} $BAO/v1/{jalur} -H 'X-Vault-Token: <token operator>'{isi}")
    tampil(f"HTTP {s}" + ("" if not j.get("errors") else "\n" + json.dumps({"errors": j["errors"]}, ensure_ascii=False)))
    return s, j


# ---------- kmsarsip ----------

def bangun():
    subprocess.run(["go", "build", "-trimpath", "-o", str(BIN), "./cmd/kmsarsip"], cwd=HERE, check=True)


def kms(peran, *args, tampil_perintah=True, ket=None):
    """kmsarsip dengan token satu peran. Perintah dan keluarannya dicatat (token disamarkan). Mengembalikan (exit, keluaran)."""
    env = dict(os.environ, BAO_ADDR=BAO, BAO_TOKEN=TOKEN.get(peran, peran), BAO_KUNCI=KEK)
    r = subprocess.run([str(BIN), *args], env=env, capture_output=True, text=True)
    out = (r.stdout + r.stderr).strip()
    if tampil_perintah:
        label = peran if peran in TOKEN else "tidak dikenal"
        tampil(f"$ BAO_TOKEN=<token {label}> kmsarsip " + " ".join(a if not a.startswith("/") else pathlib.Path(a).name for a in args))
        tampil(out)
        tampil(f"# exit status {r.returncode}")
    return r.returncode, out


# ---------- arsip ----------

class Arsip:
    def __init__(self, nama, periode):
        self.nama, self.periode = nama, periode
        self.csv = KERJA / "sumber" / f"{nama}.csv"
        self.enc = KERJA / "objek" / f"{nama}.enc"
        self.sha_asli = None
        self.terbungkus = None
        self.versi = None
        self.checksum = None


JANGKAR = KERJA / "jangkar-arsip.jsonl"


def siapkan_arsip():
    """Schema bersih dengan riwayat dua bulan, kedua partisi lama dilepas (DETACH CONCURRENTLY) dan diekspor ke CSV oleh kode t5-partisi."""
    shutil.rmtree(KERJA, ignore_errors=True)
    for sub in ("sumber", "objek"):
        (KERJA / sub).mkdir(parents=True)
    d.samaran[str(KERJA)] = "<folder sementara>"
    x.siapkan_riwayat(S, BULAN, BAYAR, BAYAR_INI)
    arsip = []
    for i in range(BULAN, 0, -1):
        a = Arsip(f"posting_lalu_{i:02d}", tgl(i, S))
        x.jalan(f"ALTER TABLE posting DETACH PARTITION {a.nama} CONCURRENTLY", S, tulis_hasil=False, tulis_q=False)
        a.sha_asli = ekspor(S, f"SELECT * FROM {a.nama} ORDER BY id, dibuat", a.csv)
        arsip.append(a)
    return arsip


def baris_csv(a):
    return a.csv.read_bytes().count(b"\n")


def arsipkan(a):
    rc, out = kms("pengarsip", "arsipkan", "-sumber", str(a.csv), "-tujuan", str(a.enc), "-periode", a.periode, "-jangkar", str(JANGKAR), tampil_perintah=False)
    harap(rc, 0, f"arsipkan {a.nama}: {out}")
    j = json.loads(out)
    a.terbungkus, a.versi, a.checksum = j["data_key_terbungkus"], j["versi_kek"], j["checksum"]
    d.samaran[a.terbungkus] = f"<data key terbungkus {a.nama} v{a.versi}>"
    d.samaran[a.checksum] = f"<checksum {a.nama}>"
    harap(j["ukuran_terenkripsi"], j["ukuran_asli"] + 28, "ukuran terenkripsi = ukuran asli + 28 (nonce 12, tag 16)")
    harap(j["ukuran_asli"], a.csv.stat().st_size, "ukuran asli")
    harap(hashlib.sha256(a.enc.read_bytes()).hexdigest(), a.checksum, "checksum = SHA-256 berkas terenkripsi")
    return j


def catat_baris(a):
    """INSERT baris arsip_partisi sebagai role api_t5 (hak INSERT saja)."""
    tampil("(api_t5) => INSERT INTO arsip_partisi (periode, kunci_objek, checksum, kunci_data_terbungkus, versi_kek)\n"
           "   VALUES (<periode>, 'objek/<nama>.enc', <checksum>, <data key terbungkus>, <versi kunci>)")
    with x.konek(S, "api_t5") as c:
        c.execute("INSERT INTO arsip_partisi (periode, kunci_objek, checksum, kunci_data_terbungkus, versi_kek) VALUES (%s, %s, %s, %s, %s)",
                  (a.periode, f"objek/{a.nama}.enc", a.checksum, a.terbungkus, a.versi))


def buka(peran, a, ke_berkas=None, terbungkus=None, periode=None, enc=None, ket=None):
    args = ["buka", "-berkas", str(enc or a.enc), "-terbungkus", terbungkus or a.terbungkus, "-periode", periode or a.periode]
    if ke_berkas:
        args += ["-keluar", str(ke_berkas)]
    return kms(peran, *args)


def ubah_byte(sumber, tujuan, posisi, nilai=1):
    b = bytearray(pathlib.Path(sumber).read_bytes())
    b[posisi] ^= nilai
    pathlib.Path(tujuan).write_bytes(bytes(b))


# ---------- bagian arsip ----------

def rekam_arsip():
    arsip = siapkan_arsip()
    A, B = arsip
    mulai_bao()
    try:
        siapkan_kunci()
        bagian("A. Arsip sumber: dua partisi lama dilepas dan diekspor oleh kode lab t5-partisi")
        catat(f"# Partisi {A.nama} dan {B.nama} dilepas dengan DETACH PARTITION ... CONCURRENTLY, lalu diekspor ke CSV tanpa enkripsi (lepas.ekspor).")
        harap([baris_csv(a) for a in arsip], [28_000, 28_000], "baris CSV tiap arsip")
        catat("# Tiap file CSV: 28.000 baris. Tidak ada enkripsi sampai langkah berikut.")
        catat(f"$ curl -X POST $BAO/v1/sys/mounts/transit ; curl -X POST $BAO/v1/transit/keys/{KEK} -d '{{\"type\": \"aes256-gcm96\"}}'   (operator)")
        catat_versi()
        catat("# Tiga kebijakan, masing-masing satu jalur dengan satu hak (update): pengarsip = datakey/plaintext, pembuka = decrypt, pembungkus-ulang = rewrap.")
        catat("# Tiap peran punya token sendiri. KEK dibuat tanpa exportable (bawaan; sesudah dinyalakan tidak bisa dimatikan), jadi operator pun tidak bisa membaca isinya:")
        s, j = operator("GET", f"transit/export/encryption-key/{KEK}")
        harap((s, "not exportable" in "".join(j.get("errors", []))), (400, True), "export KEK ditolak")
        s, j = bao("GET", f"transit/backup/{KEK}")
        harap((s, "exporting is disallowed" in "".join(j.get("errors", []))), (500, True), "backup KEK ditolak")
        s, j = bao("GET", f"transit/keys/{KEK}")
        harap((s, all(isinstance(v, int) for v in j["data"]["keys"].values())), (200, True), "pembacaan kunci hanya menjawab waktu pembuatan tiap versi")
        catat(f"# backup {KEK} (operator): ditolak karena kunci tidak exportable. Pembacaan kunci (keys) hanya menjawab waktu pembuatan tiap versi (angka), bukan isinya.")

        bagian("B. Arsipkan: satu data key per file, dibungkus KEK, dan dicatat di arsip_partisi dan jangkar")
        for a in arsip:
            j = arsipkan(a)
            tampil(f"$ BAO_TOKEN=<token pengarsip> kmsarsip arsipkan -sumber {a.nama}.csv -tujuan {a.nama}.enc -periode <tanggal> -jangkar jangkar-arsip.jsonl")
            tampil(json.dumps({k: j[k] for k in ("checksum", "data_key_terbungkus", "versi_kek")}))
            catat_baris(a)
        harap(len({a.terbungkus for a in arsip}), 2, "dua file, dua data key terbungkus")
        catat("# Ukuran berkas terenkripsi = ukuran file asal + 28 byte (nonce 12, tag 16), dan checksum = SHA-256 berkas terenkripsi: keduanya diperiksa lab.")
        catat("# Dua file, dua data key terbungkus berbeda (12 data key per tahun bila satu per bulan).")
        x.jalan("SELECT kunci_objek, length(checksum) AS panjang_checksum, left(kunci_data_terbungkus, 9) AS awal_kunci, versi_kek FROM arsip_partisi ORDER BY periode", S)
        sj = [json.loads(l) for l in JANGKAR.read_text().splitlines()]
        harap([(e["periode"], e["checksum"]) for e in sj], [(a.periode, a.checksum) for a in arsip], "jangkar berisi periode dan checksum tiap file, urut")
        catat("# Jangkar (berkas di luar database, hanya bertambah): dua baris, periode dan checksum sama dengan baris arsip_partisi.")
        rc, out = kms("pengarsip", "arsipkan", "-sumber", str(A.csv), "-tujuan", str(A.enc), "-periode", A.periode, "-jangkar", str(JANGKAR))
        harap((rc, "file exists" in out), (2, True), "arsip yang sudah ada tidak ditimpa")
        catat("# Menulis ulang arsip yang sudah ada ditolak: berkas arsip hanya bertambah.")

        bagian("C. Tanpa KMS, file arsip tidak terbaca")
        blob = A.enc.read_bytes()
        baris_pertama = A.csv.read_bytes().split(b"\n")[0]
        try:
            blob.decode("utf-8")
            utf8 = True
        except UnicodeDecodeError:
            utf8 = False
        harap((baris_pertama in blob, b",1000" in blob, utf8), (False, False, False), "berkas terenkripsi tidak memuat teks CSV")
        catat("# Berkas terenkripsi: baris pertama CSV tidak ada di dalamnya, potongan ',1000' tidak ada, dan isinya bukan UTF-8 yang sah.")
        catat("# Membuka dengan data key milik file lain (data key yang sah, tetapi bukan untuk file ini):")
        rc, out = buka("pembuka", A, terbungkus=B.terbungkus)
        harap((rc, out.startswith("kmsarsip: autentikasi GCM gagal")), (2, True), "data key file lain")
        catat("# Membuka dengan token yang hanya boleh membuat data key (pengarsip), lalu dengan token yang tidak dikenal OpenBao:")
        rc, out = buka("pengarsip", A)
        harap((rc, "openbao menjawab 403" in out, "permission denied" in out), (2, True, True), "token pengarsip tidak boleh decrypt")
        rc, out = buka("bukan-token", A)
        harap((rc, "openbao menjawab 403" in out), (2, True), "token tidak dikenal")
        catat("# Kedua kali galatnya datang dari OpenBao (403), bukan dari GCM: tanpa hak decrypt data key tidak pernah sampai ke pemanggil.")
        catat("# Tiap token hanya bisa satu dari tiga operasi (arsipkan, buka, rewrap). Sel di luar diagonal ditolak OpenBao (403) dan tidak menulis berkas; pengarsip yang membuka sudah tampil di atas:")
        coba = {"pengarsip": (("rewrap", ["rewrap", "-terbungkus", A.terbungkus]),),
                "pembuka": (("arsipkan", ["arsipkan", "-sumber", str(A.csv), "-tujuan", str(KERJA / "objek" / "tolak.enc"), "-periode", A.periode, "-jangkar", str(JANGKAR)]),
                            ("rewrap", ["rewrap", "-terbungkus", A.terbungkus])),
                "pembungkus-ulang": (("arsipkan", ["arsipkan", "-sumber", str(A.csv), "-tujuan", str(KERJA / "objek" / "tolak.enc"), "-periode", A.periode, "-jangkar", str(JANGKAR)]),
                                     ("buka", ["buka", "-berkas", str(A.enc), "-terbungkus", A.terbungkus, "-periode", A.periode]))}
        for peran, ops in coba.items():
            hasil_op = []
            for nama_op, args in ops:
                rc, out = kms(peran, *args, tampil_perintah=False)
                harap((rc, "openbao menjawab 403" in out), (2, True), f"token {peran}: {nama_op} harus ditolak")
                hasil_op.append(f"{nama_op} 403")
            catat(f"#   token {peran}: " + ", ".join(hasil_op))
        harap((KERJA / "objek" / "tolak.enc").exists(), False, "operasi yang ditolak tidak menulis berkas")
        catat("# Dengan token pembuka dan data key terbungkus yang benar, file terbuka dan isinya sama dengan file asal:")
        hasil = KERJA / "pulih.csv"
        rc, out = buka("pembuka", A, ke_berkas=hasil)
        harap(rc, 0, f"buka dengan hak: {out}")
        harap(hashlib.sha256(hasil.read_bytes()).hexdigest(), A.sha_asli, "isi hasil dekripsi sama dengan file asal")
        harap(oct(hasil.stat().st_mode & 0o777), "0o600", "izin berkas hasil dekripsi")
        catat("# SHA-256 hasil dekripsi sama dengan SHA-256 file asal, dan berkasnya dibuat dengan izin 0600 (diperiksa lab; nilai checksum tidak direkam).")
        hasil.unlink()

        bagian("D. Satu byte berubah: dekripsi gagal autentikasi, dari mana pun byte itu")
        catat(f"# Berkas terenkripsi {len(blob):,} byte".replace(",", ".") + ": nonce di byte 0-11, ciphertext, tag di 16 byte terakhir. Satu bit diubah di tiap posisi; pembuka sah, data key benar.")
        n = len(blob)
        for nama, pos in (("byte pertama (nonce)", 0), ("byte ke-12 (awal ciphertext)", 12), ("byte tengah (ciphertext)", n // 2),
                          ("byte ke-17 dari akhir (ciphertext terakhir)", n - 17), ("byte terakhir (tag)", n - 1)):
            rusak = KERJA / "rusak.enc"
            ubah_byte(A.enc, rusak, pos)
            catat(f"# {nama}:")
            rc, out = buka("pembuka", A, enc=rusak)
            harap((rc, out), (2, GALAT_GCM), f"byte {nama}")
            rusak.unlink()
        catat("# Berkas terpotong satu byte, dan berkas yang ditambah satu byte:")
        rusak = KERJA / "rusak.enc"
        rusak.write_bytes(blob[:-1])
        rc, out = buka("pembuka", A, enc=rusak)
        harap((rc, "autentikasi GCM gagal" in out), (2, True), "terpotong")
        rusak.write_bytes(blob + b"\x00")
        rc, out = buka("pembuka", A, enc=rusak)
        harap((rc, "autentikasi GCM gagal" in out), (2, True), "diperpanjang")
        rusak.unlink()
        catat("# Periode lain di data tambahan GCM (berkas bulan ini dibuka seolah berkas bulan lain):")
        rc, out = buka("pembuka", A, periode=B.periode)
        harap((rc, "autentikasi GCM gagal" in out), (2, True), "periode lain")
        catat("# Satu byte di data key terbungkus (bukan di file): yang menolak OpenBao, bukan GCM atas file:")
        w = A.terbungkus.split(":", 2)
        import base64
        mentah = bytearray(base64.b64decode(w[2]))
        mentah[20] ^= 1
        rusak_kunci = f"{w[0]}:{w[1]}:{base64.b64encode(bytes(mentah)).decode()}"
        d.samaran[rusak_kunci] = "<data key terbungkus, satu byte diubah>"
        rc, out = buka("pembuka", A, terbungkus=rusak_kunci)
        harap((rc, "openbao menjawab 400" in out, "message authentication failed" in out), (2, True, True), "data key terbungkus diubah")
        catat("# Lingkup: satu byte yang berubah di file arsip dan di data key terbungkus gagal pada posisi yang dicoba di atas (lima posisi file, satu posisi kunci).")
        catat("# Tes Go (testing.txt) mengubah semua byte sebuah blob kecil, satu per satu.")

        bagian("E. Checksum di arsip_partisi dan di jangkar: tiga cara memalsukan, dan siapa yang melihatnya")
        def verifikasi(a, ket, harus):
            cs = x.satu(f"SELECT checksum FROM arsip_partisi WHERE periode = '{a.periode}'", S)
            rc, out = kms("pembuka", "verifikasi", "-berkas", str(a.enc), "-periode", a.periode, "-checksum-db", cs, "-jangkar", str(JANGKAR), tampil_perintah=False)
            tampil(f"$ kmsarsip verifikasi -berkas {a.nama}.enc -periode <tanggal> -checksum-db <checksum di arsip_partisi> -jangkar jangkar-arsip.jsonl")
            tampil(out)
            tampil(f"# exit status {rc}")
            harap((rc, out), harus, ket)
        catat("# Keadaan sehat: berkas, baris database, dan jangkar sepakat (pemeriksaan ini tidak memakai KMS, cukup SHA-256).")
        sehat = "berkas-lawan-database=cocok berkas-lawan-jangkar=cocok database-lawan-jangkar=cocok"
        verifikasi(A, "verifikasi sehat", (0, sehat))
        catat("# 1. Berkas di penyimpanan objek diubah satu byte:")
        asli = A.enc.read_bytes()
        ubah_byte(A.enc, A.enc, 100)
        verifikasi(A, "berkas diubah", (2, "berkas-lawan-database=beda berkas-lawan-jangkar=beda database-lawan-jangkar=cocok"))
        A.enc.write_bytes(asli)
        catat("# 2. Baris database diberi checksum lain (penyerang dengan akses tulis ke database). Role aplikasi tidak bisa melakukannya:")
        x.tolak("UPDATE arsip_partisi SET checksum = repeat('0', 64)", "42501", S, role="api_t5", pesan="permission denied for table arsip_partisi")
        catat("# Sebagai pemilik schema, bisa. Berkas masih cocok dengan jangkar, jadi pemalsunya database:")
        x.jalan(f"UPDATE arsip_partisi SET checksum = repeat('0', 64) WHERE periode = '{A.periode}'", S)
        verifikasi(A, "database dipalsukan", (2, "berkas-lawan-database=beda berkas-lawan-jangkar=cocok database-lawan-jangkar=beda"))
        x.jalan(f"UPDATE arsip_partisi SET checksum = '{A.checksum}' WHERE periode = '{A.periode}'", S, tulis_q=False, tulis_hasil=False)
        catat("# 3. Berkas dan baris database diubah bersama (penyerang yang menulis ulang keduanya). Hanya jangkar di luar database yang melihatnya:")
        ubah_byte(A.enc, A.enc, 100)
        palsu = hashlib.sha256(A.enc.read_bytes()).hexdigest()
        d.samaran[palsu] = "<checksum berkas yang diubah>"
        x.jalan(f"UPDATE arsip_partisi SET checksum = '{palsu}' WHERE periode = '{A.periode}'", S, tulis_hasil=False)
        verifikasi(A, "berkas dan database diubah bersama", (2, "berkas-lawan-database=cocok berkas-lawan-jangkar=beda database-lawan-jangkar=beda"))
        A.enc.write_bytes(asli)
        x.jalan(f"UPDATE arsip_partisi SET checksum = '{A.checksum}' WHERE periode = '{A.periode}'", S, tulis_q=False, tulis_hasil=False)
        verifikasi(A, "pulih", (0, sehat))
        catat("# Tidak dicakup: pihak yang bisa mengubah berkas jangkar, database, dan berkas arsip sekaligus. Jangkar di lab adalah satu berkas lokal;")
        catat("# jangkar harian yang digabung dengan rantai audit_log: Tidak dijalankan.")
        harap(x.satu("SELECT count(*) FROM arsip_partisi", S), 2, "dua baris arsip_partisi")
        tulis("arsip.txt", "arsip partisi terenkripsi: tanpa KMS tidak terbaca, satu byte berubah gagal, dan checksum di arsip_partisi dan jangkar")
    finally:
        bersih_bao()


# ---------- bagian rotasi ----------

def rekam_rotasi():
    arsip = siapkan_arsip()
    A, B = arsip
    mulai_bao()
    try:
        siapkan_kunci()
        for a in arsip:
            arsipkan(a)
            catat_baris(a)
        d.log.clear()   # bagian ini mulai dari dua arsip yang sudah berisi data key terbungkus versi 1
        bagian("A. Keadaan awal: dua arsip, dua data key terbungkus dengan KEK versi 1")
        catat_versi()
        x.jalan("SELECT kunci_objek, left(kunci_data_terbungkus, 9) AS awal_kunci, versi_kek FROM arsip_partisi ORDER BY periode", S)

        bagian("B. rotate: versi baru dibuat, data key lama tetap terbuka, dan data key baru memakai versi 2")
        s, _ = operator("POST", f"transit/keys/{KEK}/rotate")
        harap(s, 200, "rotate")
        v = catat_versi()
        harap((v["terbaru"], v["tersedia"]), (2, [1, 2]), "setelah rotate")
        catat("# Data key terbungkus versi 1 masih terbuka sesudah rotate:")
        rc, out = buka("pembuka", A, ke_berkas=KERJA / "pulih.csv")
        harap(rc, 0, f"buka sesudah rotate: {out}")
        harap(hashlib.sha256((KERJA / "pulih.csv").read_bytes()).hexdigest(), A.sha_asli, "isi sesudah rotate")
        (KERJA / "pulih.csv").unlink()
        catat(f"# Rotate tidak mengubah data key terbungkus yang sudah ada. Data key yang dibuat sesudahnya memakai versi 2 (arsip kecil: 1.000 baris pertama dari {B.nama}, diberi periode bulan berjalan):")
        kecil = Arsip("posting_bulan_00_kecil", tgl(0, S))
        ekspor(S, f"SELECT * FROM {B.nama} ORDER BY id, dibuat LIMIT 1000", kecil.csv)
        kecil.sha_asli = hashlib.sha256(kecil.csv.read_bytes()).hexdigest()
        j = arsipkan(kecil)
        tampil(f"$ BAO_TOKEN=<token pengarsip> kmsarsip arsipkan -sumber {kecil.nama}.csv -tujuan {kecil.nama}.enc -periode <tanggal> -jangkar jangkar-arsip.jsonl")
        tampil(json.dumps({k: j[k] for k in ("checksum", "data_key_terbungkus", "versi_kek")}))
        harap(kecil.versi, 2, "data key baru memakai versi 2")
        catat_baris(kecil)

        bagian("C. rewrap: data key dibungkus ulang dengan versi 2 tanpa pernah keluar sebagai teks biasa; baris database butuh hak UPDATE dua kolom")
        rc, out = kms("pembungkus-ulang", "rewrap", "-terbungkus", A.terbungkus, tampil_perintah=False)
        harap(rc, 0, f"rewrap: {out}")
        j = json.loads(out)
        d.samaran[j["data_key_terbungkus"]] = f"<data key terbungkus {A.nama} v2>"
        tampil(f"$ BAO_TOKEN=<token pembungkus-ulang> kmsarsip rewrap -terbungkus {A.terbungkus}")
        tampil(json.dumps(j))
        tampil("# exit status 0")
        harap((j["versi_kek"], j["data_key_terbungkus"].startswith("vault:v2:"), j["data_key_terbungkus"] != A.terbungkus), (2, True, True), "rewrap menghasilkan versi 2")
        baru = j["data_key_terbungkus"]
        catat("# Token pembungkus-ulang tidak bisa decrypt (kebijakannya hanya rewrap), jadi rewrap tidak pernah menjawab teks biasa. Mengubah baris arsip_partisi:")
        x.tolak(f"UPDATE arsip_partisi SET kunci_data_terbungkus = '{baru}', versi_kek = 2 WHERE periode = '{A.periode}'",
                "42501", S, role="api_t5", pesan="permission denied for table arsip_partisi")
        catat("# Hak yang dimiliki role aplikasi atas arsip_partisi hanya SELECT dan INSERT (api-t5), jadi pembungkusan ulang butuh hak UPDATE untuk dua kolom itu, tidak lebih:")
        x.jalan("GRANT UPDATE (kunci_data_terbungkus, versi_kek) ON arsip_partisi TO api_t5", S)
        with x.konek(S, "api_t5") as c:
            tampil("(api_t5) => UPDATE arsip_partisi SET kunci_data_terbungkus = <v2>, versi_kek = 2 WHERE periode = <periode>")
            n = c.execute("UPDATE arsip_partisi SET kunci_data_terbungkus = %s, versi_kek = 2 WHERE periode = %s", (baru, A.periode)).rowcount
            tampil(f"UPDATE {n}")
        A.terbungkus, A.versi = baru, 2
        x.tolak(f"UPDATE arsip_partisi SET checksum = repeat('0', 64) WHERE periode = '{A.periode}'", "42501", S, role="api_t5", pesan="permission denied for table arsip_partisi")
        x.tolak(f"UPDATE arsip_partisi SET kunci_objek = 'lain' WHERE periode = '{A.periode}'", "42501", S, role="api_t5", pesan="permission denied for table arsip_partisi")
        catat("# checksum dan kunci_objek tetap tidak bisa diubah role aplikasi (42501); hanya dua kolom kunci yang berubah.")
        rc, out = buka("pembuka", A, ke_berkas=KERJA / "pulih.csv")
        harap(rc, 0, f"buka dengan versi 2: {out}")
        harap(hashlib.sha256((KERJA / "pulih.csv").read_bytes()).hexdigest(), A.sha_asli, "isi sama sesudah rewrap")
        (KERJA / "pulih.csv").unlink()
        catat("# File arsip tidak disentuh (checksum sama), dan terbuka dengan data key terbungkus versi 2; isinya sama dengan file asal.")
        x.jalan("SELECT kunci_objek, left(kunci_data_terbungkus, 9) AS awal_kunci, versi_kek FROM arsip_partisi ORDER BY periode", S)

        bagian("D. min_decryption_version: versi lama ditolak, dan bisa dibalik")
        s, _ = operator("POST", f"transit/keys/{KEK}/config", {"min_decryption_version": 2})
        harap(s, 200, "naikkan min_decryption_version")
        v = catat_versi()
        harap((v["min_buka"], v["tersedia"]), (2, [2]), "versi 1 diarsipkan")
        rc, out = buka("pembuka", B)
        harap((rc, "too old" in out), (2, True), "versi 1 ditolak")
        rc, out = buka("pembuka", A, ke_berkas=KERJA / "pulih.csv")
        harap(rc, 0, "versi 2 terbuka")
        (KERJA / "pulih.csv").unlink()
        catat(f"# {B.nama} masih dibungkus versi 1 dan ditolak; {A.nama} (sudah dibungkus ulang) terbuka.")
        catat(f"# Menaikkan min_decryption_version hanya menyembunyikan versi lama dari daftar dan dari decrypt. Menurunkannya lagi membuka {B.nama} kembali:")
        s, _ = operator("POST", f"transit/keys/{KEK}/config", {"min_decryption_version": 1})
        harap(s, 200, "turunkan lagi")
        catat_versi()
        rc, out = buka("pembuka", B, ke_berkas=KERJA / "pulih.csv")
        harap(rc, 0, f"{B.nama} terbuka lagi: {out}")
        harap(hashlib.sha256((KERJA / "pulih.csv").read_bytes()).hexdigest(), B.sha_asli, "isi B sama")
        (KERJA / "pulih.csv").unlink()
        catat("# Kenaikan itu bisa dibalik, jadi bukan pencabutan: versi 1 masih tersimpan di OpenBao.")

        bagian("E. trim: menghapus versi lama dari OpenBao. Arsip yang masih dibungkus versi itu hilang, jadi rewrap dulu semuanya")
        catat("# Pemeriksaan sebelum trim: baris arsip_partisi yang masih dibungkus versi di bawah 2:")
        x.jalan("SELECT kunci_objek, versi_kek FROM arsip_partisi WHERE versi_kek < 2 ORDER BY periode", S)
        s, j = operator("POST", f"transit/keys/{KEK}/trim", {"min_available_version": 2})
        harap((s, "minimum available version" in "".join(j.get("errors", []))), (400, True), "trim sebelum menaikkan versi minimum ditolak")
        catat("# trim ditolak. Urutan yang diterima: min_encryption_version, min_decryption_version, lalu trim.")
        for badan, ket in (({"min_encryption_version": 2}, "min_encryption_version"), ({"min_decryption_version": 2}, "min_decryption_version")):
            s, _ = operator("POST", f"transit/keys/{KEK}/config", badan)
            harap(s, 200, ket)
        s, _ = operator("POST", f"transit/keys/{KEK}/trim", {"min_available_version": 2})
        harap(s, 200, "trim")
        v = catat_versi()
        harap((v["min_ada"], v["tersedia"]), (2, [2]), "versi 1 terhapus")
        s, _ = operator("POST", f"transit/keys/{KEK}/config", {"min_decryption_version": 1})
        catat("# Menurunkan min_decryption_version lagi tidak mengembalikan versi 1:")
        catat_versi()
        rc, out = buka("pembuka", B)
        harap(rc, 2, f"{B.nama} tidak terbuka sesudah trim")
        catat(f"# {B.nama}, yang tidak sempat dibungkus ulang, tidak bisa dibuka lagi sesudah trim. {A.nama} dan {kecil.nama} (versi 2) tetap terbuka:")
        for a in (A, kecil):
            rc, out = buka("pembuka", a, ke_berkas=KERJA / "pulih.csv")
            harap(rc, 0, f"{a.nama} terbuka sesudah trim: {out}")
            harap(hashlib.sha256((KERJA / "pulih.csv").read_bytes()).hexdigest(), a.sha_asli, f"isi {a.nama} sama")
            (KERJA / "pulih.csv").unlink()
        catat("# Rotasi tanpa pembungkusan ulang membuat versi lama tidak bisa dicabut tanpa kehilangan arsip yang memakainya; pencabutan sungguhan = rewrap semua, lalu trim.")

        bagian("F. OpenBao tidak tersedia saat pemulihan, dan restart di mode dev menghapus semua kunci")
        dk("pause", NAMA)
        catat(f"# Container OpenBao dijeda (docker pause): pemulihan {A.nama} menunggu sampai batas waktu klien (5 detik).")
        rc, out = buka("pembuka", A)
        harap((rc, "Client.Timeout" in out), (2, True), "OpenBao dijeda")
        dk("unpause", NAMA)
        tunggu_bao()
        catat(f"# Container dilanjutkan: {A.nama} terbuka lagi. Selama jeda, arsip tidak terbaca.")
        rc, out = buka("pembuka", A, ke_berkas=KERJA / "pulih.csv")
        harap(rc, 0, "terbuka sesudah dilanjutkan")
        (KERJA / "pulih.csv").unlink()
        dk("restart", NAMA)
        tunggu_bao()
        catat("# Container dimulai ulang (docker restart). Mode dev menyimpan semua di memori:")
        s, j = operator("GET", "sys/mounts")
        harap("transit/" in j.get("data", j), False, "transit hilang sesudah restart")
        catat(f"# mount sesudah restart: {sorted(k for k in j.get('data', j) if k.endswith('/'))}")
        rc, out = buka("operator", A)
        harap(rc, 2, "arsip tidak terbuka sesudah restart")
        catat("# KEK ikut hilang, jadi semua arsip yang dibungkus kunci itu tidak bisa dibuka selamanya. Produksi memakai penyimpanan persisten, unseal, dan cadangan KEK: Tidak dijalankan.")

        bagian("G. Umur KEK: 2^32 pesan per kunci (Hitungan atas Asumsi naskah)")
        batas = 2 ** 32
        ribu = lambda n: f"{n:,}".replace(",", ".")
        catat(f"# Batas: dokumentasi Go (crypto/cipher.NewGCMWithRandomNonce): satu kunci tidak boleh mengenkripsi lebih dari 2^32 pesan = {ribu(batas)}. "
              "Dokumentasi OpenBao v2.7.2 meminta rotasi sebelum ±2^32 enkripsi oleh satu versi kunci (NIST SP 800-38D), jadi `rotate` memulai hitungan baru.")
        hasil = []
        for trx in (3, 2):
            n = 200_000 * trx * 2 * 365
            tahun = round(batas / n, 1)
            hasil.append(tahun)
            catat(f"# Satu data key per posting, {trx} transaksi per user aktif per hari: 200.000 × {trx} × 2 × 365 = {ribu(n)} posting per tahun; "
                  f"{ribu(batas)} ÷ {ribu(n)} = {str(tahun).replace('.', ',')} tahun sampai satu versi KEK mencapai batas.")
        harap(hasil, [9.8, 14.7], "umur KEK")
        catat(f"# Satu data key per file, 12 file per tahun: {ribu(batas)} ÷ 12 = {ribu(batas // 12)} tahun; batas itu tidak relevan.")
        catat("# Syarat hitungan: satu pembungkusan data key memakai satu nonce acak 96 bit di KEK. Kode OpenBao v2.7.2 (sdk/helper/keysutil/policy.go, SymmetricEncryptRaw) memakai "
              "crypto/cipher.NewGCMWithRandomNonce untuk kunci aes256-gcm96 tanpa convergent encryption: dibaca dari kode di repositori openbao/openbao tag v2.7.2 (2026-11-03), tidak diukur.")
        tulis("rotasi.txt", "rotasi KEK: rotate, rewrap, min_decryption_version, trim, OpenBao tidak tersedia, dan umur KEK")
    finally:
        bersih_bao()


# ---------- bagian testing ----------

def go(*args, env):
    r = subprocess.run(["go", *args], cwd=HERE, env=env, capture_output=True, text=True)
    t = (r.stdout + r.stderr).replace("\t", "  ")
    t = re.sub(r" \(\d+\.\d+s\)", "", t)
    t = re.sub(r"^(ok|FAIL)(\s+\S+)\s+[\d.]+s", r"\1\2", t, flags=re.M)
    return r.returncode, t.rstrip()


def rekam_testing():
    mulai_bao()
    try:
        siapkan_kunci()
        bagian("A. go vet dan tes Go atas OpenBao sungguhan (TES_KMS_WAJIB=1: tes tanpa OpenBao gagal, bukan dilewati)")
        env = dict(os.environ, BAO_ADDR=BAO, BAO_TOKEN=ROOT, BAO_KUNCI=KEK, TES_KMS_WAJIB="1")
        rc, t = go("vet", "./...", env=env)
        catat("$ go vet ./...")
        catat(t or "(tanpa temuan)")
        catat(f"# exit status {rc}")
        harap(rc, 0, "go vet")
        rc, t = go("test", "-v", "-count=1", "./...", env=env)
        t = "\n".join(l for l in t.splitlines() if not l.startswith(("=== RUN", "=== PAUSE", "=== CONT")))
        catat("$ go test -v -count=1 ./...   # lingkungan: BAO_ADDR, BAO_TOKEN (operator), BAO_KUNCI, TES_KMS_WAJIB=1")
        catat(d.samarkan(t))
        catat(f"# exit status {rc}")
        if rc != 0:
            print(t, file=sys.stderr)
        harap(rc, 0, "go test")
        harap("--- SKIP" in t, False, "tes dilewati")
        tulis("testing.txt", "tes Go untuk envelope, klien OpenBao, dan jangkar")
    finally:
        bersih_bao()


def tulis(nama, judul):
    versi = d.satu("SHOW server_version", S)
    kepala = [f"# Lab {LAB} · {judul}",
              f"# PostgreSQL {versi} · {d.versi_alat()} · OpenBao v{VERSI_BAO} mode dev, image ghcr.io/openbao/openbao@{IMG.split('@')[1][:19]}… · schema {S}",
              f"# Rekaman dari database bersih: make -C labs/{LAB} run."]
    d.OUT.mkdir(exist_ok=True)
    (d.OUT / nama).write_text("\n".join(l.rstrip() for l in "\n".join(kepala + d.log).split("\n")) + "\n")
    print("ditulis:", f"labs/{LAB}/output/{nama}")
    d.log.clear()


BAGIAN = {"arsip": rekam_arsip, "rotasi": rekam_rotasi, "testing": rekam_testing}


def main():
    pilih = sys.argv[1:] or list(BAGIAN)
    for nama in pilih:
        if nama not in BAGIAN:
            sys.exit(f"bagian tidak dikenal: {nama} (pilih dari: {' '.join(BAGIAN)})")
    d.bangun()
    bangun()
    for nama in pilih:
        d.log.clear()
        d.samaran.clear()
        BAGIAN[nama]()
    print("selesai:", ", ".join(pilih))


if __name__ == "__main__":
    main()
