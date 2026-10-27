"""Rekam lab t4-ssrf: verifikasi defensif atas fetcher gambar versi aman di labs/api-t4/internal/unduh (naskah M36 dan
ADR 41). Lab ini TIDAK menjalankan demonstrasi versi rentan terhadap layanan dalam: bagian itu sudah terekam di api-t4
(`output/rentan.txt`, `output/fitur.txt`, `internal/unduh/unduh_test.go`) dan tidak diulang di sini.

Yang direkam, semuanya dari tes Go bertag `t4ssrf` yang berjalan di host dan hanya memakai server uji di 127.0.0.1
(sertifikat https dibuat di memori, tidak dipasang di mana pun; tidak ada permintaan ke luar mesin):

  batas   batas ADR 41 dari dua sisi: https saja, redirect tidak diikuti, 2 MiB, 3 detik, hanya status 200, hanya
          empat tipe gambar menurut byte, pesan galat tanpa isi respons, bentuk nama IDNA
  alamat  kelas alamat yang ditolak fetcher aman, dan berapa dari itu yang lolos bila IsPrivate satu-satunya pemeriksaan
  testing go vet, tes bawaan api-t4 untuk paket unduh, dan penjaga bahwa tiap fungsi tes bertag benar-benar berjalan

Tidak memakai database: tidak ada keadaan yang disimpan, jadi tidak ada schema atau saldo yang direkam. Waktu hanya
diperiksa sebagai batas di dalam tes (tidak dicetak), dan rekaman ulang identik per byte (make cek).

    make -C labs/t4-ssrf run                  (butuh: Go)
    make -C labs/t4-ssrf run BAGIAN=alamat    (satu bagian: batas alamat testing)
"""
import pathlib, re, subprocess, sys

HERE = pathlib.Path(__file__).resolve().parent
API = HERE.parent / "api-t4"
OUT = HERE / "output"
BERKAS_TES = API / "internal/unduh/ssrf_batas_test.go"
PAKET = "./internal/unduh"
log = []


def gagal(pesan):
    raise SystemExit("GAGAL: " + pesan)


def harap(nyata, harus, apa):
    if nyata != harus:
        gagal(f"{apa}: dapat {nyata!r}, harus {harus!r}")


def catat(teks=""):
    log.append(teks)


def go(*arg):
    r = subprocess.run(["go", *arg], cwd=API, capture_output=True, text=True)
    return r.returncode, (r.stdout + r.stderr)


def versi_go():
    return subprocess.run(["go", "version"], capture_output=True, text=True).stdout.split()[2]


def bersih(teks):
    """Buang yang bergantung mesin: waktu per tes, waktu paket, dan baris RUN."""
    baris = []
    for l in teks.replace("\t", "  ").splitlines():
        if l.startswith(("=== RUN", "=== PAUSE", "=== CONT")):
            continue
        l = re.sub(r" \(\d+\.\d+s\)", "", l)
        l = re.sub(r"^(ok|FAIL)(\s+\S+)\s+[\d.]+s", r"\1\2", l)
        l = re.sub(r"^(ok\s+\S+)\s+\(cached\)", r"\1", l)
        baris.append(l.rstrip())
    return "\n".join(baris).strip()


def nama_tes_bertag():
    return re.findall(r"^func (Test\w+)\(", BERKAS_TES.read_text(), flags=re.M)


def tulis(nama, judul):
    OUT.mkdir(exist_ok=True)
    kepala = [f"# Lab t4-ssrf · {judul}",
              f"# {versi_go()} · tanpa database · server uji hanya di 127.0.0.1 di dalam proses tes",
              "# Rekaman: make -C labs/t4-ssrf run."]
    (OUT / nama).write_text("\n".join(kepala + log).rstrip() + "\n")
    print("ditulis:", f"labs/t4-ssrf/output/{nama}")
    log.clear()


def jalankan_bertag(pola, apa):
    perintah = f"go test -tags t4ssrf -count=1 -v -run '{pola}' {PAKET}"
    rc, teks = go("test", "-tags", "t4ssrf", "-count=1", "-v", "-run", pola, PAKET)
    teks = bersih(teks)
    catat(f"$ {perintah}")
    catat(teks)
    catat(f"# exit status {rc}")
    if rc != 0:
        print(teks, file=sys.stderr)
    harap(rc, 0, apa)
    harap("--- SKIP" in teks, False, f"{apa}: tes dilewati")
    harap(len(re.findall(r"^--- FAIL", teks, flags=re.M)), 0, f"{apa}: tes yang gagal")
    return teks


def rekam_batas():
    teks = jalankan_bertag("TestSSRFBatas", "tes batas")
    tulis("batas.txt", "batas fetcher gambar versi aman dari dua sisi (https, redirect, 2 MiB, 3 detik, status, tipe, pesan galat, nama IDNA)")
    return teks


def rekam_alamat():
    teks = jalankan_bertag("TestSSRFKelas", "tes kelas alamat")
    tulis("alamat.txt", "kelas alamat yang ditolak fetcher gambar versi aman, dan yang lolos bila IsPrivate satu-satunya pemeriksaan")
    return teks


def rekam_testing():
    rc, teks = go("vet", PAKET)
    catat(f"$ go vet {PAKET}")
    catat(bersih(teks) or "(tanpa temuan)")
    catat(f"# exit status {rc}")
    harap(rc, 0, "go vet")
    rc, teks = go("vet", "-tags", "t4ssrf", PAKET)
    catat(f"$ go vet -tags t4ssrf {PAKET}")
    catat(bersih(teks) or "(tanpa temuan)")
    catat(f"# exit status {rc}")
    harap(rc, 0, "go vet bertag")
    rc, teks = go("test", "-count=1", PAKET)
    catat(f"$ go test -count=1 {PAKET}      (tes bawaan api-t4 untuk paket ini, tanpa tag)")
    catat(bersih(teks))
    catat(f"# exit status {rc}")
    harap(rc, 0, "tes bawaan paket unduh")
    rc, daftar = go("test", "-count=1", "-list", ".", PAKET)
    n_bawaan = len([l for l in daftar.splitlines() if l.startswith("Test")])
    rc, daftar_bertag = go("test", "-tags", "t4ssrf", "-count=1", "-list", ".", PAKET)
    n_semua = len([l for l in daftar_bertag.splitlines() if l.startswith("Test")])
    catat(f"# fungsi tes di paket: {n_bawaan} bawaan api-t4 tanpa tag, {n_semua - n_bawaan} milik lab ini (tag t4ssrf)")
    return teks, n_bawaan, n_semua


def main():
    pilih = sys.argv[1:] or ["batas", "alamat", "testing"]
    for p in pilih:
        if p not in ("batas", "alamat", "testing"):
            gagal(f"bagian {p!r} tidak dikenal; pilihan: batas alamat testing")
    lulus = ""
    if "batas" in pilih:
        lulus += rekam_batas()
    if "alamat" in pilih:
        lulus += rekam_alamat()
    if "testing" in pilih:
        rekam_testing()
        # Tiap fungsi tes bertag harus muncul sebagai PASS di rekaman batas dan alamat: pola -run yang tidak cocok
        # membuat tes tidak pernah berjalan dan tidak pernah gagal.
        if set(pilih) >= {"batas", "alamat"}:
            muncul = set(re.findall(r"^--- PASS: (\w+)", lulus, flags=re.M))
            harap(sorted(set(nama_tes_bertag()) - muncul), [], "fungsi tes bertag yang tidak muncul sebagai PASS")
        # Catatan penutup ditulis sesudah penjaga lolos.
        catat(f"# Penjaga pola -run: tiap dari {len(nama_tes_bertag())} fungsi tes bertag muncul sebagai PASS di batas.txt atau alamat.txt.")
        tulis("testing.txt", "go vet, tes bawaan api-t4 untuk paket unduh, dan penjaga tes bertag")


if __name__ == "__main__":
    main()
