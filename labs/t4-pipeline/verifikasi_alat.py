"""Periksa tanda tangan rilis alat pipeline dengan cosign (sigstore). Bukan bagian `make run`: butuh jaringan (berkas
rilis dan akar kepercayaan sigstore lewat TUF) dan hasilnya dicatat di README dengan tanggal.

Yang diperiksa per alat: berkas checksum rilis (`<alat>_<versi>_checksums.txt`) ditandatangani oleh workflow rilis
proyek itu (identitas GitHub Actions) atau, untuk cosign sendiri, oleh akun layanan sigstore, sesuai bundle `.sigstore.json`
yang diterbitkan rilis. Checksum itu yang dicocokkan alat.py dengan arsip. Alat yang rilisnya tidak menerbitkan tanda
tangan yang bisa diperiksa (oasdiff: tanpa tanda tangan; gosec: bundle bertanda kunci, kunci publik tidak ditemukan di
dokumentasi proyek) ditulis Tidak dijalankan.

    make -C labs/t4-pipeline verifikasi-alat
"""
import pathlib, shutil, subprocess, sys, tempfile

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import alat  # noqa: E402

GITHUB = "https://token.actions.githubusercontent.com"
# alat -> (identitas yang diharapkan, penerbit OIDC, regexp?)
IDENTITAS = {
    "syft": (r"^https://github.com/anchore/syft/", GITHUB, True),
    "grype": (r"^https://github.com/anchore/grype/", GITHUB, True),
    "cosign": ("keyless@projectsigstore.iam.gserviceaccount.com", "https://accounts.google.com", False),
}
TIDAK_DIJALANKAN = {
    "oasdiff": "rilis hanya menerbitkan checksums.txt, tanpa tanda tangan",
    "gosec": "bundle .sigstore.json bertanda kunci (hint kunci saja); kunci publik rilis tidak ditemukan di dokumentasi proyek",
}


def main():
    cosign = alat.pastikan("cosign")
    kerja = pathlib.Path(tempfile.mkdtemp(prefix="t4pipeline-verifikasi-"))
    gagal = False
    try:
        for nama, (identitas, penerbit, regexp) in IDENTITAS.items():
            cs = alat.berkas_rilis(nama, "checksum")
            alat.unduh(alat.url_rilis(nama, cs), kerja / cs)
            alat.unduh(alat.url_rilis(nama, cs + ".sigstore.json"), kerja / (cs + ".sigstore.json"))
            bendera = "--certificate-identity-regexp" if regexp else "--certificate-identity"
            r = subprocess.run([str(cosign), "verify-blob", "--bundle", str(kerja / (cs + ".sigstore.json")), bendera, identitas,
                                "--certificate-oidc-issuer", penerbit, str(kerja / cs)], capture_output=True, text=True, env=alat.lingkungan())
            hasil = (r.stdout + r.stderr).strip().splitlines()
            print(f"{nama} {alat.PIN['alat'][nama]['versi']}: {cs}: {hasil[-1] if hasil else '(tanpa keluaran)'} (exit {r.returncode})")
            gagal = gagal or r.returncode != 0
        for nama, alasan in TIDAK_DIJALANKAN.items():
            print(f"{nama} {alat.PIN['alat'][nama]['versi']}: Tidak dijalankan: {alasan}")
    finally:
        shutil.rmtree(kerja, ignore_errors=True)
    if gagal:
        raise SystemExit("GAGAL: tanda tangan salah satu alat tidak terverifikasi")


if __name__ == "__main__":
    main()
