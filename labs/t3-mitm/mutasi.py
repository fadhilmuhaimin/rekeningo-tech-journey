"""Uji mutasi lab t3-mitm (keputusan 977): ubah satu hal di kode, jalankan bagian rekaman yang menjaganya, dan pastikan lab
GAGAL. Mutasi yang lolos berarti rekaman tidak menjaga hal itu; daftar yang lolos ada di README (bagian "Uji mutasi").

    make -C labs/t3-mitm mutasi                 (±8 menit; setiap mutasi menjalankan satu bagian)
    make -C labs/t3-mitm mutasi MUTASI=pin-hash (satu mutasi)

File sumber dikembalikan sesudah setiap mutasi, juga bila skrip dihentikan; output/ dipulihkan dari salinan.
"""
import pathlib
import shutil
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent

# (nama, berkas, teks lama, teks baru, bagian yang dijalankan atau "go-test", hasil yang diharapkan: "bunuh" atau "lolos")
# "lolos" = survivor yang diketahui dan dijelaskan di README; skrip gagal bila hasilnya berubah dari yang tertulis.
MUTASI = [
    ("tanpa-pemeriksaan-pin", "dart/bin/client.dart", "if (cert == null || !cocok(cert)) {", "if (cert == null) {", "pin", "bunuh"),
    ("pin-hash-berubah", "umum.py", 'cmd.append("--pin=" + ",".join(PKI.pins[k] for k in pin))',
     'cmd.append("--pin=" + ",".join(PKI.pins[k][::-1] for k in pin))', "pin", "bunuh"),
    ("tanpa-pin-cadangan", "bagian_pin.py",
     'U.mulai_tepi("server-b", log=log)\n    h = U.klien("pin-spki", ["ca-publik"], "tepi", GET_AKUN, token=token, pin=[A, B])',
     'U.mulai_tepi("server-b", log=log)\n    h = U.klien("pin-spki", ["ca-publik"], "tepi", GET_AKUN, token=token, pin=[A])', "pin", "bunuh"),
    ("terima-sertifikat-apa-saja", "dart/bin/client.dart", "        case 'validasi':\n          klien = HttpClient(context: ctx);",
     "        case 'validasi':\n          klien = HttpClient(context: ctx)..badCertificateCallback = (c, h, p) => true;", "m26", "bunuh"),
    ("flag-staging-ditolak", "dart/bin/client.dart", "            ..badCertificateCallback = (cert, host, port) {\n              dipanggil++;\n              return true;",
     "            ..badCertificateCallback = (cert, host, port) {\n              dipanggil++;\n              return false;", "m26", "bunuh"),
    ("proxy-tidak-mengubah", "go/cmd/mitm/main.go", "baru, berubah = ubahKiriman(body, *nominal, *ke)", "baru, berubah = ubahKiriman(body, *nominal*0, (*ke)[:0])", "m26", "bunuh"),
    ("dio-pin-di-factory", "dart/bin/client.dart", "          createHttpClient: () => HttpClient(context: ctx),\n          validateCertificate",
     "          createHttpClient: () => klienPin(ctx, (c) => pins.contains(pinSpki(c.der))),\n          validateCertificate", "dio", "bunuh"),
    ("daun-398-hari", "go/internal/pki/pki.go", "const HariDaun = 200", "const HariDaun = 398", "pin", "bunuh"),
    ("log-tidak-disamarkan", "go/cmd/tepi/main.go", '\t\treturn "[disamarkan]"', "\t\treturn nilai", "token", "bunuh"),
    ("umur-token-16-menit", "bagian_token.py", '"-umur-sesi", "15m"', '"-umur-sesi", "16m"', "token", "bunuh"),
    ("tanpa-hsts", "go/cmd/tepi/main.go", "if *hsts > 0 {", "if false {", "hsts", "bunuh"),
    ("hsts-di-port-http", "go/cmd/tepi/main.go", "\t\t\t\thost, _, e := net.SplitHostPort(r.Host)",
     '\t\t\t\tw.Header().Set("Strict-Transport-Security", "max-age=1")\n\t\t\t\thost, _, e := net.SplitHostPort(r.Host)', "hsts", "bunuh"),
    ("cookie-tidak-disamarkan", "go/cmd/tepi/main.go", '\tcase "authorization", "cookie", "proxy-authorization":', '\tcase "authorization", "proxy-authorization":', "token", "bunuh"),
    ("cookie-tidak-disamarkan-tes-go", "go/cmd/tepi/main.go", '\tcase "authorization", "cookie", "proxy-authorization":', '\tcase "authorization", "proxy-authorization":', "go-test", "bunuh"),
    ("proxy-tidak-mencatat-handshake", "go/cmd/mitm/main.go", '\t\trk.tulis(map[string]any{"jenis": "handshake", "nama": h.ServerName})\n', "", "pin", "bunuh"),
]


def main():
    pilih = sys.argv[1:]
    daftar = [m for m in MUTASI if not pilih or m[0] in pilih]
    if pilih and len(daftar) != len(pilih):
        raise SystemExit("GAGAL: mutasi tidak dikenal; pilihan: " + " ".join(m[0] for m in MUTASI))
    cadangan = pathlib.Path(tempfile.mkdtemp(prefix="t3mitm-mutasi-"))
    shutil.copytree(HERE / "output", cadangan / "output")
    lolos = []
    try:
        for nama, berkas, lama, baru, bagian, harapan in daftar:
            p = HERE / berkas
            asli = p.read_text()
            if lama not in asli:
                raise SystemExit(f"GAGAL: teks mutasi {nama} tidak ada di {berkas}")
            p.write_text(asli.replace(lama, baru, 1))
            try:
                if bagian == "go-test":
                    r = subprocess.run(["go", "test", "-count=1", "./..."], cwd=HERE / "go", capture_output=True, text=True)
                else:
                    r = subprocess.run([sys.executable, "run.py", bagian], cwd=HERE, capture_output=True, text=True)
            finally:
                p.write_text(asli)
            baris = [l for l in (r.stdout + r.stderr).splitlines() if l.strip()]
            gagal = [l for l in baris if l.startswith("GAGAL")] or baris[-1:]   # galat yang bukan GAGAL (mis. kompilasi) tetap membunuh
            status = "DIBUNUH" if r.returncode != 0 else "LOLOS"
            if status != ("DIBUNUH" if harapan == "bunuh" else "LOLOS"):
                lolos.append(nama)   # hasil berbeda dari yang tertulis di daftar
            print(f"{status:8} {nama:32} bagian {bagian:6} {gagal[0][:150] if gagal else '(lab tidak gagal)'}", flush=True)
    finally:
        shutil.rmtree(HERE / "output")
        shutil.copytree(cadangan / "output", HERE / "output")
        shutil.rmtree(cadangan, ignore_errors=True)
    print(f"\n{len(daftar) - len(lolos)} dari {len(daftar)} mutasi berhasil seperti yang tertulis" + (f"; menyimpang: {', '.join(lolos)}" if lolos else ""))
    sys.exit(1 if lolos else 0)


if __name__ == "__main__":
    main()
