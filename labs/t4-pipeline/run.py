"""Rekam lab t4-pipeline (Tahap 4): pemeriksaan merge per modul atas kontrak OpenAPI dan image api-t4.

Lima pemeriksaan yang dijalankan ADR "pipeline per modul", masing-masing direkam dari alat sungguhan:

  kontrak   oasdiff breaking: perubahan enum, penghapusan field, parameter tingkat path (isu terbuka di proyek alatnya)
  klien     client Dart dibuat ulang dari kontrak (openapi-generator di image resmi) dan diff-nya diperiksa
  sast      gosec dan govulncheck atas contoh yang disiapkan (bukan kode api-t4) dan audit atas api-t4 asli
  sbom      SBOM CycloneDX dari syft, dipindai grype dengan basis data yang dikunci
  tanda     cosign: tanpa tanda tangan, tanda tangan atas tag yang lalu dipindah, tanda tangan atas digest
  testing   tes kebijakan gerbang (gerbang.py)

Alat hanya dari rilis resmi proyeknya, diperiksa terhadap checksum rilis dan nilai di alat.json (alat.py). Semua berjalan
lokal: registry image di container yang hanya mendengar 127.0.0.1, kunci cosign dibuat per run di .kerja (tidak di-commit),
tanpa jaringan keluar selain unduhan alat dan basis data sekali. Keyless, provenance SLSA, dan atestasi app Tidak dijalankan.

Rekaman output/*.txt diulang identik per byte (make cek): digest image, alamat, dan jalur disamarkan atau dibaca dari alat;
yang bergantung pada basis data (grype, govulncheck) memakai basis data yang dikunci dan versinya ditulis di kepala.
Lab gagal keras bila hasil meleset dari yang diharapkan.

    make -C labs/t4-pipeline run                   (semua bagian; butuh Docker, Go, jaringan untuk alat pertama kali)
    make -C labs/t4-pipeline run BAGIAN=kontrak    (satu bagian: kontrak klien sast sbom tanda testing)
    make -C labs/t4-pipeline verifikasi-alat       (tanda tangan rilis alat; bukan bagian run)
"""
import contextlib, difflib, filecmp, json, os, pathlib, re, shutil, subprocess, sys, time, urllib.request, zipfile

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))
import alat  # noqa: E402
import gerbang as g  # noqa: E402
from lab_env import port_lab  # noqa: E402

LAB = "t4-pipeline"
API = HERE.parent / "api-t4"
OUT = HERE / "output"
KERJA = HERE / ".kerja"
DASAR_REGISTRY = 18295                      # api-t4: 18280-18285; t4-modul 18286; t4-storage 18290; t4-infra 18292-18294
PORT_REG = port_lab(DASAR_REGISTRY)
NAMA_REG = f"t4p-{PORT_REG}-registry"
REG = f"127.0.0.1:{PORT_REG}"
IMG = alat.PIN["image"]
KUNCI_UJI = "kunci-uji-lab"                 # kata sandi kunci cosign yang dibuat per run: data lab, bukan secret
VERSI = {n: a["versi"] for n, a in alat.PIN["alat"].items()}

log = []
DIGEST_NAMA = {}                            # digest image -> label tetap di rekaman


# ---------- pencatat ----------

def gagal(pesan):
    raise SystemExit("GAGAL: " + pesan)


def harap(nyata, harus, apa):
    if nyata != harus:
        gagal(f"{apa}: dapat {nyata!r}, harus {harus!r}")


def catat(teks=""):
    log.append(teks)


def bagian(judul):
    catat(f"\n# --- {judul} ---")


def samar(teks):
    """Rekaman sama di semua lajur dan mesin: jalur absolut, port registry lajur, dan digest image diganti label tetap."""
    teks = teks.replace(str(HERE), f"labs/{LAB}")
    teks = teks.replace(f"127.0.0.1:{PORT_REG}", f"127.0.0.1:{DASAR_REGISTRY}")
    for d, nama in DIGEST_NAMA.items():
        teks = teks.replace(d, f"<digest {nama}>")
    return teks


def tulis(nama, judul, kepala_tambahan=()):
    dipakai = [f"{n} {VERSI[n]}" for n in KEPALA_ALAT[nama]]
    if nama == "klien.txt":
        dipakai.append("openapi-generator-cli " + re.search(r":v([\d.]+)@", IMG["openapi_generator"]).group(1))
    if nama in KEPALA_GO:
        dipakai.append(subprocess.run(["go", "version"], capture_output=True, text=True).stdout.split()[2])
    if nama in KEPALA_REGISTRY:
        dipakai.append(f"registry lokal di 127.0.0.1:{DASAR_REGISTRY}")
    kepala = [f"# Lab {LAB} · {judul}", "# " + " · ".join(dipakai)] + list(kepala_tambahan)
    kepala.append(f"# Rekaman dari run bersih: make -C labs/{LAB} run.")
    OUT.mkdir(exist_ok=True)
    teks = "\n".join(l.rstrip() for l in "\n".join(kepala + log).split("\n")) + "\n"
    teks = re.sub(r"\n{3,}", "\n\n", teks)
    (OUT / nama).write_text(teks)
    print("ditulis:", f"labs/{LAB}/output/{nama}")
    log.clear()


KEPALA_ALAT = {   # alat yang versinya ditulis di kepala tiap rekaman
    "kontrak.txt": ("oasdiff",), "klien.txt": (), "sast.txt": ("gosec",), "sbom.txt": ("syft", "grype"),
    "tanda-tangan.txt": ("cosign",), "testing.txt": (),
}
KEPALA_GO = ("sast.txt", "sbom.txt", "tanda-tangan.txt")
KEPALA_REGISTRY = ("sbom.txt", "tanda-tangan.txt")


# ---------- menjalankan perintah ----------

def jalankan(perintah, cwd=None, env=None, masukan=None):
    r = subprocess.run([str(x) for x in perintah], cwd=cwd, env=env, input=masukan, capture_output=True, text=True)
    return r.returncode, r.stdout, r.stderr


def perintah_tampil(perintah_teks, keluaran="", kode=None):
    catat(f"$ {perintah_teks}")
    for baris in samar(keluaran).rstrip().splitlines():
        catat(baris)
    if kode is not None:
        catat(f"(exit code {kode})")


def env_alat(**tambahan):
    """Lingkungan alat dengan cache Go milik pengguna (supaya modul tidak diunduh dua kali) dan HOME di .alat/home."""
    go = {k: subprocess.run(["go", "env", k], capture_output=True, text=True).stdout.strip() for k in ("GOMODCACHE", "GOCACHE", "GOPATH")}
    return alat.lingkungan(**go, **tambahan)


def reset_dir(jalur):
    if jalur.exists():
        shutil.rmtree(jalur)
    jalur.mkdir(parents=True)
    return jalur


def ganti_tepat_satu(teks, lama, baru):
    if teks.count(lama) != 1:
        gagal(f"jangkar harus ada tepat satu kali ({teks.count(lama)}): {lama[:70]!r}")
    return teks.replace(lama, baru)


# ---------- kontrak OpenAPI: varian sebelum dan sesudah ----------

AKUN_JENIS = "enum: [karyawan, warung, admin, hr, pemakai, merchant, risk] }"
DAFTAR_JENIS = "jenis: { type: string, enum: [pemakai, merchant], default: pemakai }"
AKUN_WAJIB = "required: [id, jenis, nama, saldo]\n      properties:\n        id: { type: integer, format: int64 }\n        jenis: { type: string, enum: [karyawan"
AKUN_SALDO = "        saldo: { $ref: '#/components/schemas/Rupiah', description: 'buku.saldo_cache; 0 untuk akun tanpa buku' }\n"
AKUN_NOMOR = "        nomor_karyawan: { type: string, description: Ditambah Tahap 2; hanya akun karyawan }\n"

VARIAN_API = {   # nama -> perubahan (jangkar, pengganti); tiap jangkar harus ada tepat satu kali di openapi.yaml
    "enum-respons-tambah": [(AKUN_JENIS, "enum: [karyawan, warung, admin, hr, pemakai, merchant, risk, badan] }")],
    "enum-respons-hapus": [(AKUN_JENIS, "enum: [karyawan, warung, admin, hr, pemakai, merchant] }")],
    "enum-request-hapus": [(DAFTAR_JENIS, "jenis: { type: string, enum: [pemakai], default: pemakai }")],
    "enum-request-tambah": [(DAFTAR_JENIS, "jenis: { type: string, enum: [pemakai, merchant, badan], default: pemakai }")],
    "field-wajib-hapus": [(AKUN_WAJIB, AKUN_WAJIB.replace("[id, jenis, nama, saldo]", "[id, jenis, nama]")), (AKUN_SALDO, "")],
    "field-opsional-hapus": [(AKUN_NOMOR, "")],
}

MINI_PARAM = "      - { name: batas, in: query, required: false, schema: { type: integer, minimum: 1, maximum: 100 } }"
MINI_PARAM_OP = "        - { name: batas, in: query, required: false, schema: { type: integer, minimum: 1, maximum: 100 } }"
MINI_TAG = "      - { name: tag, in: query, required: false, schema: { type: array, items: { type: string } }, style: form, explode: true }"
MINI_TAG_OP = "        - { name: tag, in: query, required: false, schema: { type: array, items: { type: string } }, style: form, explode: true }"

VARIAN_MINI = {   # nama -> (jangkar, pengganti); "path-*" mengubah parameter di /riwayat (tingkat path), "op-*" di /laporan.
    # Jangkar diawali "\n" karena baris tingkat path (6 spasi) adalah akhiran baris tingkat operasi (8 spasi).
    "path-wajib": ("\n" + MINI_PARAM, "\n" + MINI_PARAM.replace("required: false", "required: true")),
    "op-wajib": ("\n" + MINI_PARAM_OP, "\n" + MINI_PARAM_OP.replace("required: false", "required: true")),
    "path-hapus": ("\n" + MINI_PARAM, ""),
    "op-hapus": ("\n" + MINI_PARAM_OP, ""),
    "path-sempit": ("\n" + MINI_PARAM, "\n" + MINI_PARAM.replace("maximum: 100", "maximum: 10")),
    "op-sempit": ("\n" + MINI_PARAM_OP, "\n" + MINI_PARAM_OP.replace("maximum: 100", "maximum: 10")),
    "path-explode": ("\n" + MINI_TAG, "\n" + MINI_TAG.replace("explode: true", "explode: false")),
    "op-explode": ("\n" + MINI_TAG_OP, "\n" + MINI_TAG_OP.replace("explode: true", "explode: false")),
}


def siapkan_kontrak():
    """Tulis kontrak sebelum (salinan openapi.yaml api-t4 yang sedang di main) dan semua varian ke .kerja/kontrak."""
    d = reset_dir(KERJA / "kontrak")
    asli = (API / "openapi.yaml").read_text()
    (d / "sebelum.yaml").write_text(asli)
    for nama, ubahan in VARIAN_API.items():
        teks = asli
        for lama, baru in ubahan:
            teks = ganti_tepat_satu(teks, lama, baru)
        (d / f"{nama}.yaml").write_text(teks)
    mini = (HERE / "kontrak" / "mini-sebelum.yaml").read_text()
    (d / "mini-sebelum.yaml").write_text(mini)
    for nama, (lama, baru) in VARIAN_MINI.items():
        (d / f"mini-{nama}.yaml").write_text(ganti_tepat_satu(mini, lama, baru))
    return d


def hitung_path_operasi(teks):
    paths, operasi, di_paths = 0, 0, False
    for baris in teks.splitlines():
        if re.match(r"^\S", baris):
            di_paths = baris.startswith("paths:")
        elif di_paths and re.match(r"^  /", baris):
            paths += 1
        elif di_paths and re.match(r"^    (get|post|put|patch|delete):\s*$", baris):
            operasi += 1
    return paths, operasi


def oasdiff_json(d, perintah, a, b, *extra):
    kode, keluar, galat = jalankan([alat.pastikan("oasdiff"), perintah, a, b, "-f", "json", *extra], cwd=d, env=alat.lingkungan())
    if kode not in (0, 1):
        gagal(f"oasdiff {perintah} {a} {b}: exit {kode}: {galat.strip()[:200]}")
    return g.parse_oasdiff(keluar)


def oasdiff_teks(d, perintah, a, b, *extra):
    kode, keluar, galat = jalankan([alat.pastikan("oasdiff"), perintah, a, b, *extra], cwd=d, env=alat.lingkungan())
    perintah_tampil(f"oasdiff {perintah} {a} {b} {' '.join(extra)}".rstrip(), re.sub(r"\n{2,}", "\n", keluar + galat), kode)
    return kode


def baris_temuan(t):
    return f'{t["tingkat"]} {t["id"]} {t["operasi"]}'


def putuskan_oasdiff(temuan, ambang):
    gagal_ = g.melewati_ambang_oasdiff(temuan, ambang)
    return ("GAGAL" if gagal_ else "LULUS"), len(gagal_)


def bagian_kontrak():
    d = siapkan_kontrak()
    asli = (d / "sebelum.yaml").read_text()
    paths, operasi = hitung_path_operasi(asli)
    harap(paths > 0 and operasi >= paths, True, f"kontrak api-t4 terbaca ({paths} path, {operasi} operasi)")
    versi_oasdiff = alat.versi_terpasang("oasdiff", alat.pastikan("oasdiff"))
    catat("# Kontrak sebelum = labs/api-t4/openapi.yaml di main. Tiap varian di bawah adalah satu PR")
    catat("# yang mengubah satu hal di kontrak itu; gerbang kontrak menjalankan `oasdiff breaking` dengan ambang ERR.")
    catat(f"# Alat: {versi_oasdiff}")

    bagian("A. Perubahan enum dan penghapusan field pada kontrak api-t4 (oasdiff breaking --fail-on ERR)")
    harapan = {
        "enum-respons-tambah": [("ERR", "response-property-enum-value-added", "GET /akun/{id}")],
        "enum-request-hapus": [("ERR", "request-property-enum-value-removed", "POST /daftar")],
        "field-wajib-hapus": [("ERR", "response-required-property-removed", "GET /akun/{id}")],
        "enum-request-tambah": [],
        "enum-respons-hapus": [],
        "field-opsional-hapus": [],
    }
    catat("# Kontrol: kontrak yang sama dibandingkan dengan dirinya sendiri.")
    harap(oasdiff_json(d, "breaking", "sebelum.yaml", "sebelum.yaml"), [], "kontrak identik")
    oasdiff_teks(d, "breaking", "sebelum.yaml", "sebelum.yaml", "--fail-on", "ERR")
    ringkas = []
    for nama, diharap in harapan.items():
        catat()
        catat(f"# Varian {nama}")
        kode = oasdiff_teks(d, "breaking", "sebelum.yaml", f"{nama}.yaml", "--fail-on", "ERR")
        temuan = oasdiff_json(d, "breaking", "sebelum.yaml", f"{nama}.yaml")
        harap([(t["tingkat"], t["id"], t["operasi"]) for t in temuan], diharap, f"temuan oasdiff {nama}")
        putusan, n = putuskan_oasdiff(temuan, "ERR")
        harap(kode, 1 if diharap else 0, f"exit code oasdiff {nama}")
        harap(putusan, "GAGAL" if diharap else "LULUS", f"putusan gerbang {nama}")
        ringkas.append((nama, putusan, n))
    catat()
    catat("# Ringkasan gerbang kontrak (ambang ERR)")
    for nama, putusan, n in ringkas:
        catat(f"{nama:<22} {putusan}  ({n} temuan ERR)")

    bagian("B. Ambang keparahan: penghapusan field opsional tidak menggagalkan gerbang pada ambang ERR maupun WARN")
    nama = "field-opsional-hapus"
    kode = oasdiff_teks(d, "breaking", "sebelum.yaml", f"{nama}.yaml", "--fail-on", "WARN")
    harap(kode, 0, "field opsional dihapus, --fail-on WARN")
    kode = oasdiff_teks(d, "changelog", "sebelum.yaml", f"{nama}.yaml")
    semua = oasdiff_json(d, "changelog", "sebelum.yaml", f"{nama}.yaml")
    harap([(t["tingkat"], t["id"]) for t in semua], [("INFO", "response-optional-property-removed")], "changelog field opsional")
    catat("# `breaking` hanya memuat ERR dan WARN; field opsional yang dihapus berstatus INFO. Klien lama yang membaca")
    catat("# field itu tidak ditahan gerbang. Tingkat bisa dinaikkan dengan berkas --severity-levels:")
    (d / "tingkat.txt").write_text("response-optional-property-removed err\n")
    catat("$ cat tingkat.txt")
    catat("response-optional-property-removed err")
    kode = oasdiff_teks(d, "breaking", "sebelum.yaml", f"{nama}.yaml", "--severity-levels", "tingkat.txt", "--fail-on", "ERR")
    harap(kode, 1, "field opsional dihapus dengan --severity-levels")
    naik = oasdiff_json(d, "breaking", "sebelum.yaml", f"{nama}.yaml", "--severity-levels", "tingkat.txt")
    harap([baris_temuan(t) for t in naik], ["ERR response-optional-property-removed GET /akun/{id}"], "temuan dengan --severity-levels")

    bagian("C. Parameter tingkat path dan style/explode: kontrak mini (kontrak api-t4 tidak memakai keduanya)")
    catat("# Kontrak mini: /riwayat memuat parameter `batas` dan `tag` di tingkat path; /laporan memuat dua parameter yang sama")
    catat("# di tingkat operasi. Tiap varian mengubah parameter di salah satunya. Gerbang di sini memakai ambang WARN.")
    harapan_mini = {   # nama -> (temuan path tanpa flag, temuan path dengan --flatten-params, temuan operasi)
        "wajib": ([], ["ERR request-parameter-became-required GET /riwayat"], ["ERR request-parameter-became-required GET /laporan"]),
        "hapus": ([], ["WARN request-parameter-removed GET /riwayat"], ["WARN request-parameter-removed GET /laporan"]),
        "sempit": ([], ["ERR request-parameter-max-decreased GET /riwayat"], ["ERR request-parameter-max-decreased GET /laporan"]),
        "explode": ([], [], []),
    }
    for nama, (tanpa, dengan, operasi_) in harapan_mini.items():
        catat()
        catat(f"# Varian {nama}: tingkat path lawan tingkat operasi")
        t_path = oasdiff_json(d, "breaking", "mini-sebelum.yaml", f"mini-path-{nama}.yaml")
        t_flat = oasdiff_json(d, "breaking", "mini-sebelum.yaml", f"mini-path-{nama}.yaml", "--flatten-params")
        t_op = oasdiff_json(d, "breaking", "mini-sebelum.yaml", f"mini-op-{nama}.yaml")
        t_op_flat = oasdiff_json(d, "breaking", "mini-sebelum.yaml", f"mini-op-{nama}.yaml", "--flatten-params")
        harap([baris_temuan(t) for t in t_path], tanpa, f"path-{nama} tanpa --flatten-params")
        harap([baris_temuan(t) for t in t_flat], dengan, f"path-{nama} dengan --flatten-params")
        harap([baris_temuan(t) for t in t_op], operasi_, f"op-{nama} tanpa --flatten-params")
        harap([baris_temuan(t) for t in t_op_flat], operasi_, f"op-{nama} dengan --flatten-params")
        for judul, hasil in (("path, bawaan", t_path), ("path, --flatten-params", t_flat), ("operasi, bawaan", t_op)):
            putusan, n = putuskan_oasdiff(hasil, "WARN")
            catat(f"{judul:<26} {putusan}  ({n} temuan): {'; '.join(baris_temuan(t) for t in hasil) or 'tidak ada temuan'}")
    catat()
    catat("# Yang direkam: perubahan parameter di tingkat path lolos dari `oasdiff breaking` bawaan dan baru tertangkap dengan")
    catat("# --flatten-params (perubahan yang sama di tingkat operasi tertangkap tanpa flag). Perubahan style dan explode tidak")
    catat("# tertangkap di kedua tingkat, juga dengan --flatten-params.")
    tulis("kontrak.txt", "kontrak OpenAPI dan oasdiff breaking")


# ---------- client Dart dari kontrak ----------

def jalankan_generator(d, kontrak, tujuan):
    """Buat client Dart dari kontrak di image openapi-generator-cli resmi (dikunci dengan digest). Tanpa jaringan."""
    perintah = ["docker", "run", "--rm", "--network", "none", "-v", f"{d}:/w"]
    if sys.platform.startswith("linux"):
        perintah += ["--user", f"{os.getuid()}:{os.getgid()}"]
    perintah += [IMG["openapi_generator"], "generate", "-g", "dart", "-i", f"/w/{kontrak}", "-o", f"/w/{tujuan}",
                 "--skip-validate-spec", "-p", "pubName=api_client"]
    kode, keluar, galat = jalankan(perintah)
    if kode != 0:
        gagal(f"openapi-generator {kontrak}: exit {kode}: {(keluar + galat)[-400:]}")


def berkas_berubah(a, b):
    """Daftar berkas yang berbeda, hanya ada di satu sisi, atau berubah antara dua pohon hasil generasi."""
    hasil = []

    def jalan(cmp):
        hasil.extend(f"{cmp.left[len(str(a)) + 1:]}/{n}".lstrip("/") for n in cmp.diff_files)
        hasil.extend(f"{cmp.left[len(str(a)) + 1:]}/{n} (hanya sebelum)".lstrip("/") for n in cmp.left_only)
        hasil.extend(f"{cmp.right[len(str(b)) + 1:]}/{n} (hanya sesudah)".lstrip("/") for n in cmp.right_only)
        for sub in cmp.subdirs.values():
            jalan(sub)

    jalan(filecmp.dircmp(a, b))
    return sorted(hasil)


def bagian_klien():
    d = siapkan_kontrak()
    gen = reset_dir(KERJA / "klien")
    for nama in ("sebelum", "sebelum-ulang", "field-wajib-hapus", "enum-respons-tambah"):
        berkas = "sebelum.yaml" if nama == "sebelum-ulang" else f"{nama}.yaml"
        shutil.copy(d / berkas, gen / berkas)
        jalankan_generator(gen, berkas, f"klien-{nama}")
    n_berkas = sum(1 for p in (gen / "klien-sebelum").rglob("*") if p.is_file())
    catat(f"# Generator: openapi-generator-cli v7.26.0 (image resmi, digest dikunci di alat.json), generator `dart`, tanpa jaringan.")
    catat(f"# Kontrak sebelum = labs/api-t4/openapi.yaml. Client hasilnya: {n_berkas} berkas di package api_client.")

    bagian("A. Kontrak yang sama menghasilkan client yang sama")
    harap(berkas_berubah(gen / "klien-sebelum", gen / "klien-sebelum-ulang"), [], "dua generasi dari kontrak yang sama")
    catat("$ diff -r klien-sebelum klien-sebelum-ulang")
    catat("(tidak ada perbedaan: dua generasi identik, jadi setiap beda di bagian lain berasal dari kontrak)")

    bagian("B. Satu field wajib dihapus dari respons GET /akun/{id}: client berubah di tiga berkas")
    ubah = berkas_berubah(gen / "klien-sebelum", gen / "klien-field-wajib-hapus")
    harap(ubah, ["doc/Akun.md", "lib/model/akun.dart", "test/akun_test.dart"], "berkas client yang berubah (field)")
    perintah_tampil("diff -rq klien-sebelum klien-field-wajib-hapus", "\n".join(f"berbeda: {b}" for b in ubah))
    unified = difflib.unified_diff((gen / "klien-sebelum/lib/model/akun.dart").read_text().splitlines(),
                                   (gen / "klien-field-wajib-hapus/lib/model/akun.dart").read_text().splitlines(), "sebelum/lib/model/akun.dart",
                                   "sesudah/lib/model/akun.dart", lineterm="", n=0)
    catat("$ diff -u klien-sebelum/lib/model/akun.dart klien-field-wajib-hapus/lib/model/akun.dart")
    baris = [b for b in unified if not b.startswith("@@")]
    harap(sum(1 for b in baris if b.startswith("-") and not b.startswith("---")), 12, "baris yang hilang dari akun.dart")
    harap(sum(1 for b in baris if b.startswith("+") and not b.startswith("+++")), 1, "baris yang berubah di akun.dart")
    for b in baris:
        catat(b)

    bagian("C. Satu nilai enum ditambah di respons GET /akun/{id}: client berubah di satu berkas")
    ubah = berkas_berubah(gen / "klien-sebelum", gen / "klien-enum-respons-tambah")
    harap(ubah, ["lib/model/akun.dart"], "berkas client yang berubah (enum)")
    perintah_tampil("diff -rq klien-sebelum klien-enum-respons-tambah", "\n".join(f"berbeda: {b}" for b in ubah))
    unified = difflib.unified_diff((gen / "klien-sebelum/lib/model/akun.dart").read_text().splitlines(),
                                   (gen / "klien-enum-respons-tambah/lib/model/akun.dart").read_text().splitlines(), "sebelum/lib/model/akun.dart",
                                   "sesudah/lib/model/akun.dart", lineterm="", n=0)
    catat("$ diff -u klien-sebelum/lib/model/akun.dart klien-enum-respons-tambah/lib/model/akun.dart")
    baris = [b for b in unified if not b.startswith("@@")]
    harap(sorted(b for b in baris if b[:1] in "+-" and b[:3] not in ("---", "+++")),
          sorted(["+  badan._(r'badan'),", "+        case r'badan': return AkunJenisEnum.badan;"]), "baris yang berubah (enum)")
    for b in baris:
        catat(b)
    lama = (gen / "klien-sebelum/lib/model/akun.dart").read_text().splitlines()
    nomor = [i + 1 for i, b in enumerate(lama) if "jenis: AkunJenisEnum.fromJson(json[r'jenis'])!," in b]
    harap(len(nomor), 1, "baris penguraian enum wajib di client")
    catat()
    catat("# Bagaimana client lama membaca nilai baru (dibaca dari kode yang dihasilkan, Dart tidak dijalankan):")
    catat(f"$ sed -n {nomor[0]}p klien-sebelum/lib/model/akun.dart")
    catat(lama[nomor[0] - 1].strip())
    dekode = [i + 1 for i, b in enumerate(lama) if "static AkunJenisEnum? fromJson(dynamic value) => AkunJenisEnumTypeTransformer().decode(value);" in b]
    harap(len(dekode), 1, "baris decode enum di client")
    catat(f"$ sed -n {dekode[0]}p klien-sebelum/lib/model/akun.dart")
    catat(lama[dekode[0] - 1].strip())
    catat("# decode tanpa argumen allowNull memakai bawaan true: nilai tak dikenal menjadi null, bukan galat. `jenis` wajib, jadi")
    catat("# null itu dipaksa non-null oleh `!`: client lama yang menerima `badan` berhenti dengan galat null check (semantik Dart),")
    catat("# bukan menampilkan nilai itu. Jalannya di Dart Tidak dijalankan.")
    tulis("klien.txt", "client Dart dibuat ulang dari kontrak")



# ---------- alat Go dan basis data ----------

X_TEXT_BARU = "v0.43.0"        # x/text terbaru di proxy.golang.org pada 2026-10-29; contoh versi yang sudah diperbaiki


def pastikan_govulncheck():
    """govulncheck tidak punya arsip rilis: dipasang dengan `go install` dari proxy.golang.org (checksum modul diperiksa
    sum.golang.org) ke .alat/bin, bukan ke GOPATH."""
    biner = alat.ALAT / "bin" / "govulncheck"
    versi = alat.PIN["govulncheck"]["versi"]
    if not biner.exists():
        (alat.ALAT / "bin").mkdir(parents=True, exist_ok=True)
        kode, _, galat = jalankan(["go", "install", f"{alat.PIN['govulncheck']['modul']}@{versi}"], env=dict(os.environ, GOBIN=str(alat.ALAT / "bin")))
        if kode != 0:
            gagal(f"go install govulncheck: {galat.strip()[-300:]}")
    kode, keluar, galat = jalankan([biner, "-version"], env=alat.lingkungan())
    if f"govulncheck@{versi}" not in keluar + galat:
        gagal(f"govulncheck melaporkan {(keluar + galat)!r}, harus govulncheck@{versi}")
    return biner


def pastikan_vulndb():
    """Salinan basis data kerentanan Go (vuln.go.dev/vulndb.zip, ±3,5 MB), diunduh sekali ke .alat/vulndb."""
    tujuan = alat.ALAT / "vulndb"
    if not (tujuan / "index" / "db.json").exists():
        info = alat.PIN["vulndb"]
        zip_ = alat.ALAT / "vulndb.zip"
        alat.unduh(info["url"], zip_)
        with zipfile.ZipFile(zip_) as z:
            z.extractall(tujuan)
        zip_.unlink()
    return "file://" + str(tujuan)


def siapkan_db_grype():
    """Basis data grype yang dikunci (alat.json): arsip diunduh sekali, SHA-256 diperiksa, lalu diimpor tanpa pembaruan
    otomatis dan tanpa pemeriksaan umur. Mengembalikan lingkungan grype."""
    info = alat.PIN["grype_db"]
    cache = alat.ALAT / "grype-db"
    env = alat.lingkungan(GRYPE_DB_CACHE_DIR=str(cache), GRYPE_DB_AUTO_UPDATE="false", GRYPE_DB_VALIDATE_AGE="false")
    grype = alat.pastikan("grype")
    if not (cache / "6" / "vulnerability.db").exists():
        arsip = alat.ALAT / "db" / info["berkas"]
        arsip.parent.mkdir(parents=True, exist_ok=True)
        if not arsip.exists():
            alat.unduh(info["url"], arsip)
        harap(alat.sha256(arsip), info["sha256"], "SHA-256 arsip basis data grype")
        kode, _, galat = jalankan([grype, "db", "import", arsip], env=env)
        if kode != 0:
            gagal(f"grype db import: {galat.strip()[-300:]}")
    return env


def salin_contoh(nama):
    tujuan = KERJA / nama
    if tujuan.exists():
        shutil.rmtree(tujuan)
    shutil.copytree(HERE / "contoh", tujuan)
    return tujuan


def jalankan_gosec(d, *bendera):
    kode, keluar, galat = jalankan([alat.pastikan("gosec"), "-fmt=json", *bendera, "./..."], cwd=d, env=alat.lingkungan(**{k: v for k, v in env_alat().items()}))
    return kode, keluar, galat


def jalankan_govulncheck(d, db):
    kode, keluar, galat = jalankan([pastikan_govulncheck(), "-format", "json", "-db", db, "./..."], cwd=d, env=env_alat())
    if kode != 0:
        gagal(f"govulncheck: exit {kode}: {galat.strip()[-300:]}")
    return g.parse_govulncheck(keluar)


def baris_vuln(t):
    jejak = f": {t['jejak']}" if t["jejak"] else ""
    return f"{t['osv']} {t['modul']} {t['versi']}, diperbaiki di {t['diperbaiki'] or '-'}{jejak}"


def bagian_sast():
    db = pastikan_vulndb()
    contoh = salin_contoh("contoh")
    catat("# Contoh yang disiapkan: labs/t4-pipeline/contoh, dua berkas Go (temuan.go dan aman.go) dan go.mod yang memuat")
    catat("# golang.org/x/text v0.3.7. Bukan kode api-t4. gosec 2.30.0; govulncheck v1.9.0 dengan salinan basis data Go lokal.")

    bagian("A. gosec: satu temuan yang disiapkan, dan kasus tandingannya")
    kode, keluar, _ = jalankan_gosec(contoh)
    temuan, galat, stat = g.parse_gosec(keluar, str(contoh))
    perintah_tampil("gosec -fmt=json ./...", "", kode)
    harap(kode, 1, "exit code gosec dengan temuan")
    harap([(t["aturan"], t["keparahan"], t["keyakinan"], t["cwe"], t["berkas"], t["baris"]) for t in temuan],
          [("G701", "HIGH", "HIGH", "89", "temuan.go", 16)], "temuan gosec atas contoh")
    for t in temuan:
        catat(f"{t['aturan']} {t['keparahan']}/{t['keyakinan']} CWE-{t['cwe']} {t['berkas']}:{t['baris']} {t['teks']}")
    catat(f"statistik: {stat['files']} berkas, {stat['found']} temuan; aman.go (query berparameter) tidak ada di daftar")
    harap(stat["files"], 2, "berkas yang dipindai gosec")
    lulus, alasan = g.putuskan_gosec(temuan, galat, stat)
    harap(lulus, False, "putusan gosec atas contoh")
    catat(f"gerbang gosec (ambang MEDIUM): GAGAL ({alasan})")
    catat("# Aturannya G701 (analisis taint), bukan G201: gosec 2.30.0 memakai aturan itu untuk fmt.Sprintf ke database/sql.")

    bagian("B. gosec gagal terbuka: kode yang tidak terkompilasi")
    rusak = salin_contoh("contoh-rusak")
    (rusak / "rusak.go").write_text("package main\n\nfunc rusak( {\n")
    kode_q, keluar_q, galat_q = jalankan_gosec(rusak, "-quiet")
    perintah_tampil("gosec -fmt=json -quiet ./...", keluar_q + galat_q, kode_q)
    harap((kode_q, keluar_q, galat_q), (0, "", ""), "gosec -quiet pada kode yang tidak terkompilasi")
    catat("# Exit code 0 dan keluaran kosong: dibaca apa adanya, ini \"bersih\", padahal temuan.go masih memuat query yang sama.")
    kode, keluar, _ = jalankan_gosec(rusak)
    temuan, galat, stat = g.parse_gosec(keluar, str(rusak))
    perintah_tampil("gosec -fmt=json ./...", "", kode)
    harap(kode, 1, "exit code gosec tanpa -quiet pada kode yang tidak terkompilasi")
    harap(temuan, [], "temuan gosec pada kode yang tidak terkompilasi")
    for e in galat:
        catat(f"galat pemindaian: {e}")
    catat(f"temuan: {len(temuan)}; berkas dipindai: {stat['files']}")
    lulus, alasan = g.putuskan_gosec(temuan, galat, stat)
    harap(lulus, False, "putusan gosec atas kode rusak")
    catat(f"gerbang gosec: GAGAL ({alasan})")

    bagian("C. govulncheck: kerentanan dipanggil kode lawan sekadar ada di dependensi")
    vuln = jalankan_govulncheck(contoh, db)
    dipanggil = [t for t in vuln if t["dipanggil"]]
    harap([t["osv"] for t in dipanggil], ["GO-2022-1059"], "kerentanan yang dipanggil kode contoh")
    harap(dipanggil[0]["jejak"], "temuan.bahasaPilihan memanggil language.ParseAcceptLanguage", "jejak panggilan")
    perintah_tampil("govulncheck -format json -db <salinan vuln.go.dev> ./...")
    catat("dipanggil kode:")
    for t in dipanggil:
        catat("  " + baris_vuln(t))
    lain = [t for t in vuln if not t["dipanggil"] and t["modul"] == "golang.org/x/text" and t["osv"] not in {d["osv"] for d in dipanggil}]
    harap(len(lain) >= 1, True, "kerentanan lain di x/text yang tidak dipanggil")
    catat("ada di modul yang sama, tidak dipanggil:")
    for t in lain:
        catat("  " + baris_vuln(t))
    catat("# Temuan atas stdlib toolchain Go tidak dicetak: bergantung pada versi Go yang menjalankan pemindaian (header).")
    lulus, alasan = g.putuskan_govulncheck(vuln)
    harap(lulus, False, "putusan govulncheck atas contoh")
    catat(f"gerbang govulncheck: GAGAL ({alasan})")

    bagian(f"D. Kasus tandingan: golang.org/x/text {X_TEXT_BARU}, versi yang sudah diperbaiki")
    baru = salin_contoh("contoh-baru")
    kode, _, galat = jalankan(["go", "get", f"golang.org/x/text@{X_TEXT_BARU}"], cwd=baru, env=dict(os.environ, GOFLAGS="-mod=mod"))
    harap(kode, 0, f"go get x/text {X_TEXT_BARU}: {galat.strip()[-200:]}")
    perintah_tampil(f"go get golang.org/x/text@{X_TEXT_BARU}")
    vuln = jalankan_govulncheck(baru, db)
    harap([t for t in vuln if t["dipanggil"]], [], "kerentanan yang dipanggil setelah x/text diperbaiki")
    harap([t for t in vuln if t["modul"] == "golang.org/x/text"], [], "temuan x/text setelah diperbaiki")
    lulus, alasan = g.putuskan_govulncheck(vuln)
    harap(lulus, True, "putusan govulncheck atas contoh yang diperbaiki")
    perintah_tampil("govulncheck -format json -db <salinan vuln.go.dev> ./...", "tidak ada temuan atas golang.org/x/text; tidak ada yang dipanggil")
    catat(f"gerbang govulncheck: LULUS ({alasan})")
    kode, keluar, _ = jalankan_gosec(baru)
    temuan, galat, stat = g.parse_gosec(keluar, str(baru))
    harap([(t["aturan"], t["berkas"]) for t in temuan], [("G701", "temuan.go")], "temuan gosec setelah x/text diperbaiki")
    catat("# gosec tetap menemukan G701: memperbaiki dependensi tidak memperbaiki kode sendiri, dan sebaliknya.")

    bagian("E. Audit atas kode api-t4 yang sebenarnya (govulncheck, tidak ada perubahan pada api-t4)")
    vuln = jalankan_govulncheck(API, db)
    dipanggil = [t for t in vuln if t["dipanggil"]]
    perintah_tampil("govulncheck -format json -db <salinan vuln.go.dev> ./...   # di labs/api-t4")
    catat(f"dipanggil kode: {len(dipanggil)}")
    for t in dipanggil:
        catat("  " + baris_vuln(t))
    lulus, alasan = g.putuskan_govulncheck(vuln)
    catat(f"gerbang govulncheck atas api-t4: {'LULUS' if lulus else 'GAGAL'} ({alasan})")
    tulis("sast.txt", "gosec dan govulncheck atas contoh yang disiapkan")


BAGIAN = {"kontrak": bagian_kontrak, "klien": bagian_klien, "sast": bagian_sast}


def main():
    pilih = sys.argv[1:] or list(BAGIAN)
    for nama in pilih:
        if nama not in BAGIAN:
            gagal(f"bagian {nama!r} tidak dikenal; pilih dari {', '.join(BAGIAN)}")
    for nama in pilih:
        BAGIAN[nama]()


if __name__ == "__main__":
    main()
