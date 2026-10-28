"""Tes kebijakan gerbang (gerbang.py). Tanpa alat, tanpa jaringan: masukan adalah keluaran alat yang ditulis tangan di
sini, bentuknya sama dengan keluaran yang direkam di output/. Tiap tes menjaga satu keputusan; uji mutasi mengubah satu
baris di gerbang.py dan satu tes harus gagal. Tanpa docstring supaya `unittest -v` menulis nama tes.

    python3 -B -m unittest -v tes_gerbang
"""
import json, unittest

import gerbang as g

D_A = "sha256:" + "a" * 64
D_B = "sha256:" + "b" * 64


def oasdiff(*temuan):
    return json.dumps([{"id": i, "text": t, "level": lv, "operation": op, "path": pa} for i, t, lv, op, pa in temuan])


def finding(osv, modul="golang.org/x/text", versi="v0.3.7", paket=None, fungsi=None, perbaikan="v0.3.8"):
    trace = {"module": modul, "version": versi}
    if paket:
        trace["package"] = paket
    if fungsi:
        trace["function"] = fungsi
    return {"finding": {"osv": osv, "fixed_version": perbaikan, "trace": [trace]}}


def aliran(*objek):
    return "\n".join(json.dumps(o, indent=1) for o in objek)


CONFIG = {"config": {"protocol_version": "v1.0.0"}}


class TesOasdiff(unittest.TestCase):
    def test_tingkat_numerik_dipetakan_dan_terurut(self):
        teks = oasdiff(("b", "x", 3, "POST", "/b"), ("a", "y", 1, "GET", "/a"), ("a", "z", 2, "GET", "/a"))
        hasil = g.parse_oasdiff(teks)
        self.assertEqual([(t["operasi"], t["id"], t["tingkat"]) for t in hasil],
                         [("GET /a", "a", "INFO"), ("GET /a", "a", "WARN"), ("POST /b", "b", "ERR")])

    def test_daftar_kosong_bukan_galat(self):
        self.assertEqual(g.parse_oasdiff("[]"), [])

    def test_bukan_json_ditolak(self):
        with self.assertRaises(ValueError):
            g.parse_oasdiff("No breaking changes")

    def test_objek_bukan_daftar_ditolak(self):
        with self.assertRaises(ValueError):
            g.parse_oasdiff('{"id": "x"}')

    def test_tingkat_tidak_dikenal_ditolak(self):
        with self.assertRaises(ValueError):
            g.parse_oasdiff(oasdiff(("a", "x", 4, "GET", "/a")))

    def test_ambang_err_tidak_menahan_warn(self):
        t = g.parse_oasdiff(oasdiff(("a", "x", 2, "GET", "/a")))
        self.assertEqual(g.melewati_ambang_oasdiff(t, "ERR"), [])

    def test_ambang_warn_menahan_warn_dan_err(self):
        t = g.parse_oasdiff(oasdiff(("a", "x", 2, "GET", "/a"), ("b", "y", 3, "GET", "/b"), ("c", "z", 1, "GET", "/c")))
        self.assertEqual([x["id"] for x in g.melewati_ambang_oasdiff(t, "WARN")], ["a", "b"])

    def test_ambang_err_menahan_err(self):
        t = g.parse_oasdiff(oasdiff(("b", "y", 3, "GET", "/b")))
        self.assertEqual(len(g.melewati_ambang_oasdiff(t, "ERR")), 1)

    def test_ambang_tidak_dikenal_ditolak(self):
        with self.assertRaises(ValueError):
            g.melewati_ambang_oasdiff([], "error")


def gosec(issues=(), galat=None, files=2, found=None):
    return json.dumps({"Golang errors": galat or {}, "Issues": list(issues), "GosecVersion": "2.30.0",
                       "Stats": {"files": files, "lines": 10, "nosec": 0, "found": len(issues) if found is None else found}})


ISU = {"severity": "HIGH", "confidence": "HIGH", "cwe": {"id": "89"}, "rule_id": "G701", "details": "SQL injection",
       "file": "/tmp/x/temuan.go", "line": "16"}


class TesGosec(unittest.TestCase):
    def test_temuan_dibaca_dan_jalur_dipotong(self):
        temuan, galat, stat = g.parse_gosec(gosec([ISU]), "/tmp/x")
        self.assertEqual([(t["aturan"], t["berkas"], t["baris"], t["cwe"]) for t in temuan], [("G701", "temuan.go", 16, "89")])
        self.assertEqual((galat, stat["files"]), ([], 2))

    def test_galat_paket_dilaporkan_dengan_nama_berkas_saja(self):
        teks = gosec(galat={"": [{"error": "# x\n./r.go:3:13: syntax error"}], "/tmp/x/r.go": [{"error": "expected ')'"}]})
        _, galat, _ = g.parse_gosec(teks)
        self.assertEqual(galat, ["(paket): ./r.go:3:13: syntax error", "r.go: expected ')'"])

    def test_bukan_json_ditolak(self):
        with self.assertRaises(ValueError):
            g.parse_gosec("")

    def test_pemindaian_tidak_lengkap_gagal_walau_tanpa_temuan(self):
        lulus, alasan = g.putuskan_gosec([], ["r.go: x"], {"files": 3, "found": 0})
        self.assertFalse(lulus)
        self.assertIn("tidak lengkap", alasan)

    def test_tanpa_berkas_dipindai_gagal(self):
        self.assertFalse(g.putuskan_gosec([], [], {"files": 0, "found": 0})[0])

    def test_statistik_berbeda_dari_daftar_gagal(self):
        self.assertFalse(g.putuskan_gosec([], [], {"files": 2, "found": 1})[0])

    def test_temuan_di_atas_ambang_gagal(self):
        temuan, galat, stat = g.parse_gosec(gosec([ISU]), "/tmp/x")
        self.assertFalse(g.putuskan_gosec(temuan, galat, stat, "MEDIUM")[0])

    def test_temuan_di_bawah_ambang_lulus(self):
        isu = dict(ISU, severity="LOW")
        temuan, galat, stat = g.parse_gosec(gosec([isu]), "/tmp/x")
        self.assertTrue(g.putuskan_gosec(temuan, galat, stat, "MEDIUM")[0])
        self.assertFalse(g.putuskan_gosec(temuan, galat, stat, "LOW")[0])

    def test_keparahan_tidak_dikenal_menahan(self):
        isu = dict(ISU, severity="CRITICAL")
        temuan, galat, stat = g.parse_gosec(gosec([isu]), "/tmp/x")
        self.assertFalse(g.putuskan_gosec(temuan, galat, stat, "HIGH")[0])

    def test_bersih_lulus(self):
        self.assertTrue(g.putuskan_gosec([], [], {"files": 2, "found": 0})[0])

    def test_ambang_tidak_dikenal_ditolak(self):
        with self.assertRaises(ValueError):
            g.putuskan_gosec([], [], {"files": 1, "found": 0}, "CRITICAL")


class TesGovulncheck(unittest.TestCase):
    def test_aliran_beberapa_objek_dibaca(self):
        self.assertEqual(len(g.baca_aliran_json(aliran(CONFIG, {"progress": {}}))), 2)

    def test_tanpa_config_ditolak(self):
        with self.assertRaises(ValueError):
            g.parse_govulncheck(aliran({"progress": {}}))

    def test_keluaran_kosong_ditolak(self):
        with self.assertRaises(ValueError):
            g.parse_govulncheck("")

    def test_hanya_modul_tidak_dipanggil(self):
        hasil = g.parse_govulncheck(aliran(CONFIG, finding("GO-1")))
        self.assertEqual([(t["osv"], t["dipanggil"]) for t in hasil], [("GO-1", False)])
        self.assertTrue(g.putuskan_govulncheck(hasil)[0])

    def test_dipanggil_menggagalkan(self):
        jejak = {"finding": {"osv": "GO-1", "fixed_version": "v0.3.8", "trace": [
            {"module": "golang.org/x/text", "version": "v0.3.7", "package": "golang.org/x/text/language", "function": "ParseAcceptLanguage"},
            {"module": "lab/x", "package": "lab/x/temuan", "function": "bahasa"},
            {"module": "lab/x", "package": "lab/x", "function": "main"}]}}
        hasil = g.parse_govulncheck(aliran(CONFIG, finding("GO-1"), jejak))
        dipanggil = [t for t in hasil if t["dipanggil"]]
        self.assertEqual(len(dipanggil), 1)
        self.assertEqual(dipanggil[0]["jejak"], "temuan.bahasa memanggil language.ParseAcceptLanguage")
        lulus, alasan = g.putuskan_govulncheck(hasil)
        self.assertFalse(lulus)
        self.assertIn("GO-1", alasan)

    def test_urutan_dipanggil_lebih_dulu(self):
        jejak = {"finding": {"osv": "GO-2", "fixed_version": "", "trace": [{"module": "m", "version": "v1", "package": "m/p", "function": "F"},
                                                                         {"module": "lab/x", "package": "lab/x", "function": "main"}]}}
        hasil = g.parse_govulncheck(aliran(CONFIG, finding("GO-1"), jejak))
        self.assertEqual([t["osv"] for t in hasil], ["GO-2", "GO-1"])

    def test_bingkai_sendiri_dipilih_bukan_bingkai_stdlib(self):
        jejak = {"finding": {"osv": "GO-3", "fixed_version": "v1.27.2", "trace": [
            {"module": "stdlib", "version": "v1.27.1", "package": "net/http", "function": "Do"},
            {"module": "stdlib", "version": "v1.27.1", "package": "io", "function": "Copy"},
            {"module": "lab/x", "package": "lab/x/unduh", "function": "Unduh"}]}}
        hasil = g.parse_govulncheck(aliran(CONFIG, jejak))
        self.assertEqual(hasil[0]["jejak"], "unduh.Unduh memanggil http.Do")


def sbom(*komponen, format_="CycloneDX"):
    return json.dumps({"bomFormat": format_, "specVersion": "1.7", "components": [
        {"type": t, "name": n, "version": v, "purl": p} for t, n, v, p in komponen]})


class TesSbomDanGrype(unittest.TestCase):
    def test_bukan_cyclonedx_ditolak(self):
        with self.assertRaises(ValueError):
            g.parse_sbom(sbom(format_="SPDX"))

    def test_pustaka_dan_modul_go_dipilah_dari_file(self):
        r = g.parse_sbom(sbom(("library", "golang.org/x/text", "v0.3.7", "pkg:golang/golang.org/x/text@v0.3.7"),
                              ("library", "netbase", "6.4", "pkg:deb/debian/netbase@6.4"), ("file", "go.mod", "", "")))
        self.assertEqual(r["pustaka"], [("golang.org/x/text", "v0.3.7"), ("netbase", "6.4")])
        self.assertEqual(r["go"], [("golang.org/x/text", "v0.3.7")])
        self.assertEqual(r["spesifikasi"], "1.7")

    def test_sbom_tanpa_komponen_dibaca_kosong(self):
        self.assertEqual(g.parse_sbom(json.dumps({"bomFormat": "CycloneDX", "specVersion": "1.7"}))["pustaka"], [])

    def test_sbom_lengkap_menolak_modul_hilang(self):
        r = {"pustaka": [("a", "v1")], "go": [("a", "v1")]}
        self.assertEqual(g.sbom_lengkap(r, [("a", "v1"), ("b", "v2")]), (False, [("b", "v2")]))

    def test_sbom_lengkap_menolak_versi_berbeda(self):
        r = {"pustaka": [("a", "v1")], "go": [("a", "v1")]}
        self.assertFalse(g.sbom_lengkap(r, [("a", "v2")])[0])

    def test_sbom_lengkap_menerima_semua(self):
        r = {"pustaka": [("a", "v1"), ("b", "v2")], "go": []}
        self.assertTrue(g.sbom_lengkap(r, [("a", "v1")])[0])

    def test_go_mod_baris_tunggal_blok_dan_komentar(self):
        teks = "module x\n\ngo 1.27\n\nrequire golang.org/x/text v0.3.7\n\nrequire (\n\ta.b/c v1.0.0\n\td.e/f v2.0.0 // indirect\n)\n"
        self.assertEqual(g.baca_go_mod(teks), [("a.b/c", "v1.0.0"), ("d.e/f", "v2.0.0"), ("golang.org/x/text", "v0.3.7")])

    def test_go_mod_tanpa_require(self):
        self.assertEqual(g.baca_go_mod("module x\n\ngo 1.27\n"), [])

    def test_grype_wajib_punya_matches(self):
        with self.assertRaises(ValueError):
            g.parse_grype("{}")

    def test_grype_urut_berat_dulu_dan_gabung_perbaikan(self):
        def m(i, sev, fix):
            return {"vulnerability": {"id": i, "severity": sev, "fix": {"versions": fix}}, "artifact": {"name": "p", "version": "1"}}
        d = {"matches": [m("L", "Low", []), m("C", "Critical", ["1.2", "1.3"]), m("U", "Unknown", [])],
             "descriptor": {"db": {"status": {"schemaVersion": "v6", "built": "2026-01-01T00:00:00Z"}}}}
        temuan, db = g.parse_grype(json.dumps(d))
        self.assertEqual([t["id"] for t in temuan], ["U", "C", "L"])
        self.assertEqual([t["diperbaiki"] for t in temuan], ["-", "1.2, 1.3", "-"])
        self.assertEqual(db, {"skema": "v6", "dibangun": "2026-01-01T00:00:00Z"})

    def test_ambang_grype_batas_tepat(self):
        t = [{"keparahan": s} for s in ("Negligible", "Low", "Medium", "High", "Critical")]
        self.assertEqual([x["keparahan"] for x in g.melewati_ambang_grype(t, "High")], ["High", "Critical"])
        self.assertEqual(len(g.melewati_ambang_grype(t, "Negligible")), 5)

    def test_tingkat_unknown_dianggap_paling_berat(self):
        self.assertEqual(len(g.melewati_ambang_grype([{"keparahan": "Unknown"}], "Critical")), 1)

    def test_ambang_grype_tidak_dikenal_ditolak(self):
        with self.assertRaises(ValueError):
            g.melewati_ambang_grype([], "high")

    def test_putusan_sbom_urutan_lengkap_dulu(self):
        r = {"pustaka": [], "go": []}
        lulus, alasan = g.putuskan_sbom(r, [("a", "v1")], [], "High")
        self.assertFalse(lulus)
        self.assertIn("a v1", alasan)

    def test_putusan_sbom_lulus_bila_lengkap_dan_di_bawah_ambang(self):
        r = {"pustaka": [("a", "v1")], "go": [("a", "v1")]}
        self.assertTrue(g.putuskan_sbom(r, [("a", "v1")], [{"keparahan": "Medium"}], "High")[0])
        self.assertFalse(g.putuskan_sbom(r, [("a", "v1")], [{"keparahan": "High"}], "High")[0])


def verify(digest):
    return json.dumps([{"critical": {"identity": {"docker-reference": "r:1"}, "image": {"docker-manifest-digest": digest}, "type": "t"}, "optional": None}])


class TesTandaTangan(unittest.TestCase):
    def test_referensi_digest_sah(self):
        self.assertTrue(g.referensi_digest("127.0.0.1:18295/api-t4@" + D_A))

    def test_tag_ditolak(self):
        self.assertFalse(g.referensi_digest("127.0.0.1:18295/api-t4:1.0"))

    def test_tag_dan_digest_sekaligus_ditolak(self):
        self.assertFalse(g.referensi_digest("repo:1.0@" + D_A))

    def test_digest_terpotong_atau_huruf_besar_ditolak(self):
        self.assertFalse(g.referensi_digest("repo@sha256:" + "a" * 63))
        self.assertFalse(g.referensi_digest("repo@sha256:" + "A" * 64))
        self.assertFalse(g.referensi_digest("repo@sha256:" + "a" * 65))

    def test_digest_tanpa_nama_atau_dengan_spasi_ditolak(self):
        self.assertFalse(g.referensi_digest("@" + D_A))
        self.assertFalse(g.referensi_digest("repo @" + D_A))
        self.assertFalse(g.referensi_digest("repo@" + D_A + "\n"))

    def test_digest_dibaca_dari_push(self):
        self.assertEqual(g.digest_dari_push(f"1.0: digest: {D_A} size: 856\n"), D_A)

    def test_push_tanpa_atau_dengan_dua_digest_ditolak(self):
        with self.assertRaises(ValueError):
            g.digest_dari_push("The push refers to repository")
        with self.assertRaises(ValueError):
            g.digest_dari_push(f"a: digest: {D_A} size: 1\nb: digest: {D_B} size: 2")

    def test_digest_dalam_tanda_tangan(self):
        self.assertEqual(g.digest_dalam_tanda_tangan("peringatan\n" + verify(D_A)), {D_A})

    def test_keluaran_tanpa_json_tidak_memuat_digest(self):
        self.assertEqual(g.digest_dalam_tanda_tangan("Error: no signatures found"), set())
        self.assertEqual(g.digest_dalam_tanda_tangan("[bukan json"), set())

    def test_putusan_lulus_hanya_bila_semua_cocok(self):
        self.assertEqual(g.putuskan_tanda_tangan("r@" + D_A, D_A, 0, verify(D_A))[0], True)

    def test_putusan_menolak_tag_walau_cosign_berhasil(self):
        lulus, alasan = g.putuskan_tanda_tangan("r:1.0", D_A, 0, verify(D_A))
        self.assertFalse(lulus)
        self.assertIn("bukan digest", alasan)

    def test_putusan_menolak_digest_lain_walau_cosign_berhasil(self):
        lulus, alasan = g.putuskan_tanda_tangan("r@" + D_B, D_A, 0, verify(D_B))
        self.assertFalse(lulus)
        self.assertIn("bukan digest yang dibangun", alasan)

    def test_putusan_menolak_kode_keluar_bukan_nol(self):
        lulus, alasan = g.putuskan_tanda_tangan("r@" + D_A, D_A, 10, "")
        self.assertFalse(lulus)
        self.assertIn("cosign verify gagal", alasan)

    def test_putusan_menolak_digest_tanda_tangan_berbeda(self):
        lulus, alasan = g.putuskan_tanda_tangan("r@" + D_A, D_A, 0, verify(D_B))
        self.assertFalse(lulus)
        self.assertIn("berbeda", alasan)

    def test_putusan_menolak_payload_kosong_walau_kode_nol(self):
        self.assertFalse(g.putuskan_tanda_tangan("r@" + D_A, D_A, 0, "")[0])

    def test_putusan_menolak_dua_digest_dalam_payload(self):
        dua = json.dumps(json.loads(verify(D_A)) + json.loads(verify(D_B)))
        self.assertFalse(g.putuskan_tanda_tangan("r@" + D_A, D_A, 0, dua)[0])


class TesLangkahPipeline(unittest.TestCase):
    def test_perubahan_kontrak_menjalankan_kontrak_dan_klien(self):
        self.assertEqual(g.langkah_untuk(["labs/api-t4/openapi.yaml"]), ["klien", "kontrak"])

    def test_perubahan_dependensi_menjalankan_audit_dan_sbom(self):
        self.assertEqual(g.langkah_untuk(["labs/api-t4/go.sum"]), ["audit-dependensi", "sbom"])

    def test_perubahan_satu_modul_hanya_modul_itu(self):
        self.assertEqual(g.langkah_untuk(["labs/api-t4/internal/modul/ledger/klien.go"]), ["sast:ledger", "tes-modul:ledger"])

    def test_dua_modul_dua_set_langkah(self):
        hasil = g.langkah_untuk(["labs/api-t4/internal/modul/akun/akun.go", "labs/api-t4/internal/modul/pembayaran/pembayaran.go"])
        self.assertEqual(hasil, ["sast:akun", "sast:pembayaran", "tes-modul:akun", "tes-modul:pembayaran"])

    def test_dockerfile_dan_titik_masuk_menjalankan_image(self):
        self.assertEqual(g.langkah_untuk(["labs/api-t4/Dockerfile"]), ["image"])
        self.assertEqual(g.langkah_untuk(["labs/api-t4/cmd/api/main.go"]), ["image"])

    def test_berkas_di_luar_aturan_tidak_menjalankan_apa_pun(self):
        self.assertEqual(g.langkah_untuk(["README.md", "labs/api-t3/openapi.yaml", "labs/api-t4/internal/modul/doc.go"]), [])

    def test_berkas_bukan_go_di_modul_tidak_menjalankan_modul(self):
        self.assertEqual(g.langkah_untuk(["labs/api-t4/internal/modul/ledger/README.md"]), [])


if __name__ == "__main__":
    unittest.main()
