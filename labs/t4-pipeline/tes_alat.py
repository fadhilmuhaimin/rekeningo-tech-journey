"""Tes pengambil alat (alat.py): pemeriksaan checksum arsip rilis dan nilai yang dikunci. Tanpa jaringan dan tanpa mengunduh:
arsip dan berkas checksum dibuat di folder sementara. Tanpa docstring supaya `unittest -v` menulis nama tes.

    python3 -B -m unittest -v tes_alat
"""
import hashlib, io, pathlib, shutil, tarfile, tempfile, unittest
from unittest import mock

import alat

NAMA = "oasdiff"


class TesPeriksaArsip(unittest.TestCase):
    def setUp(self):
        self.d = pathlib.Path(tempfile.mkdtemp(prefix="tes-alat-"))
        self.arsip = self.d / "arsip.bin"
        self.arsip.write_bytes(b"isi arsip rilis")
        self.sha = hashlib.sha256(b"isi arsip rilis").hexdigest()
        self.berkas = alat.berkas_rilis(NAMA)

    def tearDown(self):
        self.arsip.unlink()
        self.d.rmdir()

    def teks(self, sha, nama=None):
        return f"{sha}  {nama or self.berkas}\n{'0' * 64}  lain.tar.gz\n"

    def test_cocok_dengan_berkas_checksum_dan_nilai_terkunci(self):
        with mock.patch.object(alat, "dikunci", return_value=self.sha):
            self.assertEqual(alat.periksa_arsip(NAMA, self.arsip, self.teks(self.sha)), self.sha)

    def test_berbeda_dari_berkas_checksum_rilis_gagal(self):
        with mock.patch.object(alat, "dikunci", return_value=self.sha):
            with self.assertRaises(SystemExit) as k:
                alat.periksa_arsip(NAMA, self.arsip, self.teks("1" * 64))
        self.assertIn("berkas checksum rilis", str(k.exception))

    def test_berbeda_dari_nilai_terkunci_gagal_walau_cocok_dengan_rilis(self):
        with mock.patch.object(alat, "dikunci", return_value="2" * 64):
            with self.assertRaises(SystemExit) as k:
                alat.periksa_arsip(NAMA, self.arsip, self.teks(self.sha))
        self.assertIn("terkunci", str(k.exception))

    def test_arsip_tidak_ada_di_berkas_checksum_gagal(self):
        with mock.patch.object(alat, "dikunci", return_value=self.sha):
            with self.assertRaises(SystemExit) as k:
                alat.periksa_arsip(NAMA, self.arsip, self.teks(self.sha, "arsip-lain.tar.gz"))
        self.assertIn("tidak ada di berkas checksum", str(k.exception))

    def test_berkas_checksum_kosong_gagal(self):
        with mock.patch.object(alat, "dikunci", return_value=self.sha):
            with self.assertRaises(SystemExit):
                alat.periksa_arsip(NAMA, self.arsip, "")


def arsip_tar(isi_biner):
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as t:
        info = tarfile.TarInfo("oasdiff")
        info.size, info.mode = len(isi_biner), 0o755
        t.addfile(info, io.BytesIO(isi_biner))
    return buf.getvalue()


def arsip_tar_anggota(*anggota):
    """Arsip tar.gz dari (nama, isi, jenis) per anggota; isi None untuk direktori."""
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as t:
        for nama, isi, jenis in anggota:
            info = tarfile.TarInfo(nama)
            info.type = jenis
            if jenis in (tarfile.DIRTYPE, tarfile.SYMTYPE):
                info.mode = 0o755
                info.linkname = "x" if jenis == tarfile.SYMTYPE else ""
                t.addfile(info)
            else:
                info.size, info.mode = len(isi), 0o755
                t.addfile(info, io.BytesIO(isi))
    return buf.getvalue()


class TesSha256(unittest.TestCase):
    def test_seluruh_berkas_dihitung_walau_lebih_dari_satu_blok(self):
        isi = bytes(range(256)) * (3 * 4096) + b"akhir"      # 3 MiB + 5 byte: lebih dari dua blok 1 MiB
        d = pathlib.Path(tempfile.mkdtemp(prefix="tes-sha-"))
        try:
            (d / "besar.bin").write_bytes(isi)
            self.assertEqual(alat.sha256(d / "besar.bin"), hashlib.sha256(isi).hexdigest())
            (d / "besar.bin").write_bytes(isi[:-1] + b"X")    # satu byte terakhir berbeda
            self.assertNotEqual(alat.sha256(d / "besar.bin"), hashlib.sha256(isi).hexdigest())
        finally:
            shutil.rmtree(d, ignore_errors=True)


class TesPastikan(unittest.TestCase):
    def setUp(self):
        self.d = pathlib.Path(tempfile.mkdtemp(prefix="tes-pastikan-"))
        self.arsip = arsip_tar(b"biner palsu")
        self.sha = hashlib.sha256(self.arsip).hexdigest()
        self.diunduh = []

    def tearDown(self):
        shutil.rmtree(self.d, ignore_errors=True)

    def unduh_palsu(self, url, tujuan, isi_arsip=None):
        self.diunduh.append(url)
        berkas = url.rsplit("/", 1)[-1]
        if berkas == alat.berkas_rilis(NAMA):
            pathlib.Path(tujuan).write_bytes(self.arsip if isi_arsip is None else isi_arsip)
        else:
            pathlib.Path(tujuan).write_text(f"{self.sha}  {alat.berkas_rilis(NAMA)}\n")

    def jalankan(self, unduh):
        with mock.patch.object(alat, "ALAT", self.d), mock.patch.object(alat, "unduh", unduh), \
                mock.patch.object(alat, "dikunci", return_value=self.sha), \
                mock.patch.object(alat, "versi_terpasang", return_value=f"oasdiff version {alat.PIN['alat'][NAMA]['versi']}"):
            return alat.pastikan(NAMA)

    def test_mengunduh_berkas_checksum_dan_arsip_dari_rilis_yang_dikunci(self):
        biner = self.jalankan(self.unduh_palsu)
        self.assertEqual(biner, self.d / f"oasdiff-{alat.PIN['alat'][NAMA]['versi']}" / "oasdiff")
        self.assertEqual(biner.read_bytes(), b"biner palsu")
        base = "https://github.com/oasdiff/oasdiff/releases/download/v" + alat.PIN["alat"][NAMA]["versi"] + "/"
        self.assertEqual(sorted(self.diunduh), sorted([base + "checksums.txt", base + alat.berkas_rilis(NAMA)]))

    def test_arsip_yang_diganti_gagal_dan_tidak_meninggalkan_biner(self):
        with self.assertRaises(SystemExit):
            self.jalankan(lambda url, tujuan: self.unduh_palsu(url, tujuan, isi_arsip=arsip_tar(b"biner lain")))
        self.assertFalse((self.d / f"oasdiff-{alat.PIN['alat'][NAMA]['versi']}" / "oasdiff").exists())

    def test_biner_yang_melaporkan_versi_lain_ditolak(self):
        with mock.patch.object(alat, "ALAT", self.d), mock.patch.object(alat, "unduh", self.unduh_palsu), \
                mock.patch.object(alat, "dikunci", return_value=self.sha), \
                mock.patch.object(alat, "versi_terpasang", return_value="oasdiff version 0.0.1"):
            with self.assertRaises(SystemExit):
                alat.pastikan(NAMA)

    def test_dua_berkas_biner_dalam_arsip_ditolak(self):
        self.arsip = arsip_tar_anggota(("a/oasdiff", b"satu", tarfile.REGTYPE), ("b/oasdiff", b"dua", tarfile.REGTYPE))
        self.sha = hashlib.sha256(self.arsip).hexdigest()
        with self.assertRaises(SystemExit) as k:
            self.jalankan(self.unduh_palsu)
        self.assertIn("tepat satu berkas", str(k.exception))

    def test_direktori_dan_tautan_bernama_biner_diabaikan(self):
        self.arsip = arsip_tar_anggota(("bin/oasdiff", None, tarfile.DIRTYPE), ("lain/oasdiff", None, tarfile.SYMTYPE), ("oasdiff", b"biner asli", tarfile.REGTYPE))
        self.sha = hashlib.sha256(self.arsip).hexdigest()
        self.assertEqual(self.jalankan(self.unduh_palsu).read_bytes(), b"biner asli")

    def test_tidak_mengunduh_lagi_bila_biner_sudah_ada(self):
        self.jalankan(self.unduh_palsu)
        self.diunduh.clear()
        self.jalankan(self.unduh_palsu)
        self.assertEqual(self.diunduh, [])


class TesDaftarChecksum(unittest.TestCase):
    def test_format_goreleaser_dan_bintang_biner(self):
        teks = f"{'a' * 64}  satu.tar.gz\n{'b' * 64} *dua.zip\nbaris sampah\n{'c' * 63}  pendek.tar.gz\n"
        self.assertEqual(alat.daftar_checksum(teks), {"satu.tar.gz": "a" * 64, "dua.zip": "b" * 64})

    def test_nama_menempel_pada_hash_tidak_diterima(self):
        self.assertEqual(alat.daftar_checksum(f"{'a' * 64}x.tar.gz"), {})

    def test_huruf_besar_tidak_diterima(self):
        self.assertEqual(alat.daftar_checksum(f"{'A' * 64}  x.tar.gz"), {})


class TesPlatformDanBerkas(unittest.TestCase):
    def test_oasdiff_darwin_memakai_arsip_all(self):
        with mock.patch("platform.system", return_value="Darwin"), mock.patch("platform.machine", return_value="arm64"):
            self.assertEqual(alat.platform_kunci("oasdiff"), ("darwin", "all"))
            self.assertEqual(alat.platform_kunci("syft"), ("darwin", "arm64"))

    def test_oasdiff_linux_memakai_arsitektur_sendiri(self):
        for mesin, harus in (("x86_64", "amd64"), ("aarch64", "arm64")):
            with mock.patch("platform.system", return_value="Linux"), mock.patch("platform.machine", return_value=mesin):
                self.assertEqual(alat.platform_kunci("oasdiff"), ("linux", harus))

    def test_linux_aarch64_dipetakan_ke_arm64(self):
        with mock.patch("platform.system", return_value="Linux"), mock.patch("platform.machine", return_value="aarch64"):
            self.assertEqual(alat.platform_kunci("grype"), ("linux", "arm64"))
            self.assertEqual(alat.berkas_rilis("grype"), "grype_0.121.0_linux_arm64.tar.gz")

    def test_platform_lain_ditolak(self):
        with mock.patch("platform.system", return_value="Windows"), mock.patch("platform.machine", return_value="AMD64"):
            with self.assertRaises(SystemExit):
                alat.platform_kunci("syft")

    def test_platform_tanpa_nilai_terkunci_ditolak(self):
        with mock.patch("platform.system", return_value="Darwin"), mock.patch("platform.machine", return_value="x86_64"):
            with self.assertRaises(SystemExit):
                alat.dikunci("syft")

    def test_cosign_berupa_biner_tunggal_tanpa_arsip(self):
        with mock.patch("platform.system", return_value="Linux"), mock.patch("platform.machine", return_value="x86_64"):
            self.assertEqual(alat.berkas_rilis("cosign"), "cosign-linux-amd64")
            self.assertEqual(alat.berkas_rilis("cosign", "checksum"), "cosign_checksums.txt")

    def test_url_rilis_menunjuk_repo_dan_versi_yang_dikunci(self):
        self.assertEqual(alat.url_rilis("gosec", "x.tar.gz"), "https://github.com/securego/gosec/releases/download/v2.30.0/x.tar.gz")

    def test_semua_alat_punya_nilai_terkunci_64_heksadesimal(self):
        for nama, a in alat.PIN["alat"].items():
            self.assertTrue(a["sha256"], nama)
            for kunci, nilai in a["sha256"].items():
                self.assertRegex(nilai, r"^[0-9a-f]{64}$", f"{nama} {kunci}")

    def test_image_dikunci_dengan_digest(self):
        for nama, ref in alat.PIN["image"].items():
            self.assertRegex(ref, r"@sha256:[0-9a-f]{64}$", nama)

    def test_dockerfile_memakai_image_dasar_yang_dikunci(self):
        dockerfile = (pathlib.Path(alat.__file__).parent / "Dockerfile").read_text()
        self.assertIn("FROM " + alat.PIN["image"]["dasar"] + "\n", dockerfile)


class TesPerintahLab(unittest.TestCase):
    def test_generator_client_dijalankan_tanpa_jaringan(self):
        import ast
        sumber = (pathlib.Path(alat.__file__).parent / "run.py").read_text()
        fungsi = [n for n in ast.walk(ast.parse(sumber)) if isinstance(n, ast.FunctionDef) and n.name == "jalankan_generator"]
        self.assertEqual(len(fungsi), 1)
        teks = ast.get_source_segment(sumber, fungsi[0])
        self.assertIn('"--network", "none"', teks)
        self.assertIn('IMG["openapi_generator"]', teks)

    def test_govulncheck_memakai_salinan_basis_data_lokal(self):
        import ast
        sumber = (pathlib.Path(alat.__file__).parent / "run.py").read_text()
        fungsi = [n for n in ast.walk(ast.parse(sumber)) if isinstance(n, ast.FunctionDef) and n.name == "pastikan_vulndb"]
        self.assertEqual(len(fungsi), 1)
        self.assertIn('return "file://" + str(tujuan)', ast.get_source_segment(sumber, fungsi[0]))


if __name__ == "__main__":
    unittest.main()
