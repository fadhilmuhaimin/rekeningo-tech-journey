"""Uji mutasi lab t3-dasbor (keputusan 974): ubah satu hal di kode, jalankan bagian rekaman yang menjaganya, dan
pastikan lab GAGAL. Mutasi yang lolos berarti rekaman tidak menjaga hal itu; daftar yang lolos ada di README
(bagian "Uji mutasi"), dengan alasan kenapa (pola yang sama dengan labs/t3-mitm/mutasi.py).

    make -C labs/t3-dasbor mutasi                 (semua mutasi; setiap mutasi menjalankan satu bagian)
    make -C labs/t3-dasbor mutasi MUTASI=csp-mati (satu mutasi)
"""
import pathlib
import shutil
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent

# (nama, berkas, teks lama, teks baru, bagian yang dijalankan atau "go-test", hasil yang diharapkan: "bunuh" atau "lolos")
MUTASI = [
    ("escape-selalu-rentan", "go/cmd/dasbor/main.go",
     "render := renderAman\n\tif s.escape == \"rentan\" {\n\t\trender = renderRentan\n\t}",
     "render := renderRentan", "xss", "bunuh"),
    ("csp-tidak-pernah-aktif", "go/cmd/dasbor/main.go", 'if s.csp != "mati" {', "if false {", "xss", "bunuh"),
    ("cookie-selalu-httponly-salah", "go/cmd/dasbor/main.go",
     "HttpOnly: s.cookie != \"rentan\", Secure: secure, SameSite: sameSite,", "HttpOnly: false, Secure: secure, SameSite: sameSite,", "xss", "bunuh"),
    ("cookie-nama-selalu-aman", "go/cmd/dasbor/main.go",
     "func (s *server) namaCookie() string {\n\tif s.cookie == \"rentan\" {\n\t\treturn namaCookieRentan\n\t}\n\treturn namaCookieAman\n}",
     "func (s *server) namaCookie() string {\n\treturn namaCookieAman\n}", "xss", "bunuh"),
    ("csrf-gerbang-dimatikan", "go/cmd/dasbor/main.go",
     'if s.token != "tidak" && !s.csrfSah(r, x) {', "if false {", "csrf", "bunuh"),
    # Ketiga mutasi di bawah LOLOS (survivor jujur, diukur, bukan ditebak): form HTML polos Dimas gagal di
    # KETIGA pemeriksaan sekaligus (Chromium mengirim Sec-Fetch-Site: cross-site dan Origin lintas situs untuk
    # navigasi form, dan form tidak bisa memasang header X-CSRF-Token sama sekali), jadi menghapus satu
    # pemeriksaan saja masih menyisakan dua yang lain menolak serangan yang sama persis. Baru saat ketiganya
    # hilang sekaligus (mutasi csrf-gerbang-dimatikan) serangan ini lewat. README "Uji mutasi" mencatat ini
    # sebagai bukti redundansi, bukan sebagai pemeriksaan yang percuma.
    ("csrf-origin-dihapus", "go/cmd/dasbor/main.go",
     'if o := r.Header.Get("Origin"); o != "" && o != "http://"+r.Host {\n\t\treturn false\n\t}\n\ttok := r.Header.Get("X-CSRF-Token")',
     'tok := r.Header.Get("X-CSRF-Token")', "csrf", "lolos"),
    ("csrf-secfetchsite-dihapus", "go/cmd/dasbor/main.go",
     'if site := r.Header.Get("Sec-Fetch-Site"); site != "" && site != "same-origin" && site != "none" {\n\t\treturn false\n\t}\n\tif o :=',
     "if o :=", "csrf", "lolos"),
    ("csrf-token-diabaikan", "go/cmd/dasbor/main.go",
     'tok := r.Header.Get("X-CSRF-Token")\n\treturn tok != "" && subtle.ConstantTimeCompare([]byte(hashToken(tok)), []byte(x.CsrfHash)) == 1',
     'tok := r.Header.Get("X-CSRF-Token")\n\t_, _ = tok, subtle.ConstantTimeCompare\n\treturn true', "csrf", "lolos"),
    ("samesite-selalu-none", "go/cmd/dasbor/main.go",
     'if s.samesite == "none" {', "if true {", "csrf", "bunuh"),
    ("pagar-menerima-semua-alamat", "go/internal/pagar/pagar.go",
     "if ip == nil || !ip.IsLoopback() {", "if ip == nil && !ip.IsLoopback() {", "go-test", "bunuh"),
]


def main():
    if shutil.which("go") is None:
        raise SystemExit("GAGAL: go tidak ada di PATH; uji mutasi butuh Go, Node, dan Docker")
    pilih = sys.argv[1:]
    daftar = [m for m in MUTASI if not pilih or m[0] in pilih]
    if pilih and len(daftar) != len(pilih):
        raise SystemExit("GAGAL: mutasi tidak dikenal; pilihan: " + " ".join(m[0] for m in MUTASI))
    cadangan = pathlib.Path(tempfile.mkdtemp(prefix="t3dasbor-mutasi-"))
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
            # Pembunuh sah = assertion lab ("GAGAL: ...") atau tes Go gagal ("--- FAIL"). Kompilasi rusak atau
            # traceback membuat exit tidak nol juga, tapi bukan bukti bahwa rekaman atau tes menjaga hal itu.
            sebab = [l for l in baris if ("--- FAIL" in l if bagian == "go-test" else l.startswith("GAGAL"))]
            kode_gagal = sebab or baris[-1:]
            status = ("DIBUNUH" if sebab else "TANPA-SEBAB") if r.returncode != 0 else "LOLOS"
            if status != ("DIBUNUH" if harapan == "bunuh" else "LOLOS"):
                lolos.append(nama)
            print(f"{status:10} {nama:32} bagian {bagian:6} {kode_gagal[0][:150] if kode_gagal else '(lab tidak gagal)'}", flush=True)
    finally:
        shutil.rmtree(HERE / "output")
        shutil.copytree(cadangan / "output", HERE / "output")
        shutil.rmtree(cadangan, ignore_errors=True)
    print(f"\n{len(daftar) - len(lolos)} dari {len(daftar)} mutasi berhasil seperti yang tertulis" +
          (f"; menyimpang: {', '.join(lolos)}" if lolos else ""))
    sys.exit(1 if lolos else 0)


if __name__ == "__main__":
    main()
