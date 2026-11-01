"""Rekam lab t5-partisi: partisi tabel ledger `posting` per bulan, snapshot saldo, DETACH dan ATTACH (M43, ADR 49).

Server (api-t5), skema, dan data awal adalah milik `labs/api-t5` (`dasar_t5.py`), bukan salinan. Yang baru di lab ini:
job `-buat-snapshot` dan `-cek-cache -dari-snapshot` di api-t5 (`internal/repo/snapshot.go`, tes `internal/service/snapshot_test.go`),
`dasar.py` (partisi bulanan dan riwayat posting yang dihitung dari rumus, tanpa angka acak), dan rekaman ini. Setiap bagian
membuat ulang schema dari nol, jadi output/*.txt tidak bergantung pada urutan bagian dan rekaman ulang identik per byte
(make cek). Tanggal dan waktu disamarkan. Angka yang bergantung mesin (waktu) hanya diperiksa terhadap batas dan tidak direkam
sebagai nilai. Jumlah baris dibaca dari statistik PostgreSQL (pg_stat_user_tables) dan dari tabel, bukan dari kode lab. Pihak
ketiga tidak ada. Lab gagal keras bila hasil meleset dari yang diharapkan.

    make -C labs/t5-partisi run                      (butuh: Docker, Go; PostgreSQL lewat labs/b3-race)
    make -C labs/t5-partisi run BAGIAN=lepas         (satu bagian: skala lepas testing)
"""
import re, subprocess, sys, pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from alat import *  # noqa: E402,F401,F403
from skala import rekam_skala  # noqa: E402
from lepas import rekam_lepas  # noqa: E402

def go_test(*args, env):
    r = subprocess.run(["go", *args], cwd=d.HERE, env=env, capture_output=True, text=True)
    teks = (r.stdout + r.stderr).replace("\t", "  ")
    teks = re.sub(r" \(\d+\.\d+s\)", "", teks)
    teks = re.sub(r"^(ok|FAIL)(\s+\S+)\s+[\d.]+s", r"\1\2", teks, flags=re.M)
    teks = re.sub(r"^\d{4}/\d\d/\d\d \d\d:\d\d:\d\d(?:\.\d+)? ", "", teks, flags=re.M)
    return r.returncode, teks.rstrip()


def rekam_testing():
    d.buat_schema(TES)
    bagian(f"A. go vet, lalu tes snapshot saldo dan tes partisi posting dengan PostgreSQL sungguhan (schema {TES})")
    rc, teks = go_test("vet", "./...", env=d.ENV)
    catat("$ go vet ./...")
    catat(teks or "(tanpa temuan)")
    catat(f"# exit status {rc}")
    harap(rc, 0, "go vet")
    env = dict(d.ENV, TEST_DATABASE_URL=d.db_pemilik(TES, "t5-partisi-tes"), LAB_TES_SCHEMA=TES, TES_DB_WAJIB="1")
    rc, teks = go_test("test", "-v", "-count=1", "-p", "1", "-run", "Snapshot|PostingPartisi|PKPartisi|BalikJurnalTanpaPosting", "./internal/service", env=env)
    teks = "\n".join(l for l in teks.splitlines() if not l.startswith(("=== RUN", "=== PAUSE", "=== CONT")))
    catat(f"$ TEST_DATABASE_URL=<pemilik, schema {TES}> TES_DB_WAJIB=1 go test -v -count=1 -p 1 -run 'Snapshot|PostingPartisi|PKPartisi|BalikJurnalTanpaPosting' ./internal/service")
    catat(teks)
    catat(f"# exit status {rc}")
    if rc != 0:
        print(teks, file=sys.stderr)
    harap(rc, 0, "go test")
    harap("--- SKIP" in teks, False, "tes dilewati")
    x.tulis("testing.txt", "tes Go untuk snapshot saldo dan partisi posting", TES)


BAGIAN = {"skala": rekam_skala, "lepas": rekam_lepas, "testing": rekam_testing}


def main():
    pilih = sys.argv[1:] or list(BAGIAN)
    for nama in pilih:
        if nama not in BAGIAN:
            sys.exit(f"bagian tidak dikenal: {nama} (pilih dari: {' '.join(BAGIAN)})")
    for port in (d.PORT, d.PORT_PUSH):
        d.port_bebas(port)
    d.bangun()
    for nama in pilih:
        d.log.clear()
        BAGIAN[nama]()
    print("selesai:", ", ".join(pilih))


if __name__ == "__main__":
    main()
