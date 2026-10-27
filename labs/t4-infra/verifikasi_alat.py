"""Bandingkan biner OpenBao dan OpenTofu di image lab dengan arsip rilis resmi di GitHub.

Rantai yang diperiksa untuk tiap alat:
  1. SHA-256 arsip rilis yang diunduh sama dengan yang tertulis di berkas checksum rilis (tofu_<versi>_SHA256SUMS,
     checksums.txt);
  2. biner di dalam arsip sama byte per byte (SHA-256) dengan biner di dalam image yang dipakai lab (dikunci dengan digest
     di run.py).

Yang TIDAK diperiksa: tanda tangan rilis (tofu: .sig dan .pem dari cosign; OpenBao: .sigstore.json dan .gpgsig). Alatnya
(cosign, gpg dengan kunci penerbit) tidak dipasang di lab ini, jadi checksum berasal dari sumber yang sama dengan arsipnya:
rantai ini menangkap unduhan rusak atau image yang berbeda dari rilis, bukan rilis yang dipalsukan di GitHub. Tidak dijalankan.

Hasilnya bergantung arsitektur mesin (arm64 atau amd64), jadi tidak masuk output/ dan tidak ikut `make cek`. Mengunduh
±100 MB ke folder sementara dan menghapusnya sesudah selesai.

    make -C labs/t4-infra verifikasi-alat
"""
import hashlib, pathlib, re, shutil, subprocess, sys, tarfile, tempfile, urllib.request, zipfile

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import run as r  # noqa: E402  (konstanta versi dan image; main() tidak dijalankan)


def unduh(url, tujuan):
    for _ in range(5):
        try:
            with urllib.request.urlopen(url, timeout=120) as resp, open(tujuan, "wb") as f:
                shutil.copyfileobj(resp, f)
            return
        except OSError as e:
            galat = e
    raise SystemExit(f"GAGAL: unduh {url}: {galat}")


def sha(jalur):
    h = hashlib.sha256()
    with open(jalur, "rb") as f:
        for blok in iter(lambda: f.read(1 << 20), b""):
            h.update(blok)
    return h.hexdigest()


def biner_di_image(image, jalur, tujuan):
    r.pastikan_image(image)
    cid = r.dk("create", image)
    try:
        r.dk("cp", f"{cid}:{jalur}", str(tujuan))
    finally:
        r.dk("rm", cid, cek=False)


def periksa(nama, url_dasar, berkas_checksum, arsip, buka, image, jalur_image, kerja):
    unduh(f"{url_dasar}/{berkas_checksum}", kerja / berkas_checksum)
    resmi = {}
    for baris in (kerja / berkas_checksum).read_text().splitlines():
        m = re.match(r"([0-9a-f]{64})\s+\*?(\S+)$", baris.strip())
        if m:
            resmi[m.group(2)] = m.group(1)
    if arsip not in resmi:
        raise SystemExit(f"GAGAL: {arsip} tidak ada di {berkas_checksum}")
    unduh(f"{url_dasar}/{arsip}", kerja / arsip)
    nyata = sha(kerja / arsip)
    print(f"{nama}: arsip {arsip}\n  SHA-256 diunduh {nyata}\n  SHA-256 di {berkas_checksum} {resmi[arsip]}")
    if nyata != resmi[arsip]:
        raise SystemExit(f"GAGAL: {nama}: checksum arsip tidak cocok")
    biner_arsip = buka(kerja / arsip, kerja)
    biner_image = kerja / f"{nama}-dari-image"
    biner_di_image(image, jalur_image, biner_image)
    a, b = sha(biner_arsip), sha(biner_image)
    print(f"  biner di arsip {a}\n  biner di image {b}")
    if a != b:
        raise SystemExit(f"GAGAL: {nama}: biner di image berbeda dari biner rilis")
    print(f"  {nama}: biner di image identik dengan biner di arsip rilis (checksum arsip cocok)\n")


def main():
    arsitektur = r.arsitektur_docker()
    kerja = pathlib.Path(tempfile.mkdtemp(prefix="t4infra-verifikasi-"))
    try:
        def buka_zip(arsip, tujuan):
            with zipfile.ZipFile(arsip) as z:
                z.extract("tofu", tujuan / "tofu-ex")
            return tujuan / "tofu-ex" / "tofu"

        def buka_tar(arsip, tujuan):
            with tarfile.open(arsip) as t:
                t.extract("bao", tujuan / "bao-ex", filter="data")
            return tujuan / "bao-ex" / "bao"

        periksa("tofu", f"https://github.com/opentofu/opentofu/releases/download/v{r.VERSI_TOFU}", f"tofu_{r.VERSI_TOFU}_SHA256SUMS",
                f"tofu_{r.VERSI_TOFU}_linux_{arsitektur}.zip", buka_zip, r.IMG_TOFU, "/usr/local/bin/tofu", kerja)
        periksa("bao", f"https://github.com/openbao/openbao/releases/download/v{r.VERSI_BAO}", "checksums.txt",
                f"openbao_{r.VERSI_BAO}_linux_{arsitektur}.tar.gz", buka_tar, r.IMG_BAO, "/usr/bin/bao", kerja)
    finally:
        shutil.rmtree(kerja, ignore_errors=True)


if __name__ == "__main__":
    main()
