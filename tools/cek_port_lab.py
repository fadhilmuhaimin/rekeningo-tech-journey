"""Periksa bahwa port lab tidak tertulis tetap (keputusan 860).

Dua lajur kerja yang menjalankan lab bersamaan saling mereset database dan bentrok di port bila port-nya tertulis
tetap. Tiap lab membaca port dari lingkungan lewat labs/lab_env.py, labs/lab_env.sh, labs/lab_env.mk, atau
`${LAB_DB_PORT:-54333}` di compose (labs/README.md, "Beberapa lajur sekaligus"). Pemeriksa ini menolak dua hal
di labs/, tools/, .devcontainer/, .github/, dan berkas di akar repo selain Markdown:

  1. Port database, Redis, dan replika lab (54333, 54340, 54341, 56379) di luar pengecualian di bawah.
  2. Port server lab 18xxx tepat sesudah alamat host (`127.0.0.1:18083`, `"127.0.0.1", 18083`): tulis
     `port_lab(18083)` (Python, shell), `portLab(18083)` (Go), atau tambahkan LAB_PORT_OFFSET (Dart, Node).

Rekaman (`output/`), Markdown, dan `plan/` tidak diperiksa. Pengecualian sengaja kecil dan tertulis di sini.
Pemeriksa ini tidak menulis berkas; argumen selain `--akar <folder>` dan `--help` ditolak.

    python3 tools/cek_port_lab.py
    python3 tools/cek_port_lab.py --akar <folder>   # tanpa git: semua berkas di folder itu (dipakai tes)
"""
import os
import pathlib
import re
import subprocess
import sys

AKAR = pathlib.Path(__file__).resolve().parent.parent

# Port yang harus datang dari variabel, dan nama variabelnya.
PORT_TETAP = {
    "54333": "LAB_DB_PORT",
    "54340": "LAB_REPLIKA_PRIMARY_PORT",
    "54341": "LAB_REPLIKA_REPLICA_PORT",
    "56379": "LAB_REDIS_PORT",
}

# Berkas yang boleh menulis angka-angka itu. "semua": berkas itu yang mendefinisikan nilai bawaan (atau
# pemeriksa dan tesnya sendiri). "bawaan": hanya dalam bentuk ${NAMA:-ANGKA}, nilai bawaan compose.
BOLEH_PORT_TETAP = {
    "labs/lab_env.py": "semua",
    "labs/lab_env.sh": "semua",
    "labs/lab_env.mk": "semua",
    "labs/b3-race/docker-compose.yml": "bawaan",
    "labs/b9-cache/docker-compose.yml": "bawaan",
    "labs/t5-replika/docker-compose.yml": "bawaan",
    ".devcontainer/devcontainer.json": "semua",   # port yang diteruskan Dev Container: nilai bawaan lajur utama
}

# Pemeriksa dan tesnya menyebut angka-angka itu sebagai contoh; keduanya tidak diperiksa.
DILEWATI_SENDIRI = {"tools/cek_port_lab.py", "tools/test_cek_port_lab.py"}

# Port server lab yang tertulis tetap dan sengaja dibiarkan: bawaan flag server yang dijalankan run.py dengan
# -addr/-alamat (kode di dalam image atau repo contoh yang hash-nya ditulis halaman, jadi tidak diubah), kontrak
# OpenAPI sebagai dokumen, dan compose.yaml api-t1 yang dibaca pembaca di halaman 1.31, 1.35, dan 1.40 (port lab
# lajur lain dipindah compose.lab-port.yaml, berkas khusus lab).
BOLEH_PORT_SERVER = {
    "labs/api-t1/cmd/api/main.go",
    "labs/api-t2/cmd/api/main.go",
    "labs/e5-payload/riwayat/main.go",
    "labs/e3-idempotency/server/ledger/lab.go",
    "labs/api-t1/deploy/compose.yaml",
    "labs/api-t2/openapi.yaml",
    "labs/b1-openapi/openapi.yaml",
    "labs/b1-openapi/openapi-expand.yaml",
    "labs/b1-openapi/v1-ganti-nama.yaml",
    "labs/b1-openapi/v1-tambah-field.yaml",
}

AWAL_DIPERIKSA = ("labs/", "tools/", ".devcontainer/", ".github/")
SERING_DILEWATI = ("/output/", "/node_modules/", "/.venv/", "/bin/", "/vendor/", "/dist/", "/.git/")
AKHIRAN_DILEWATI = (".md", ".lock", ".png", ".svg", ".jpg", ".woff2", ".pdf", ".zip", ".gz", ".sum")

RE_PORT_TETAP = re.compile(r"(?<![0-9])(" + "|".join(PORT_TETAP) + r")(?![0-9])")
RE_BAWAAN = re.compile(r"\$\{(" + "|".join(PORT_TETAP.values()) + r"):-([0-9]+)\}")
# Port server sesudah host: 127.0.0.1:18083, localhost:18083, "127.0.0.1", 18083, ('127.0.0.1', 18083).
RE_PORT_SERVER = re.compile(r"(?:127\.0\.0\.1|localhost|0\.0\.0\.0)(?:[:]|[\"'],\s*)(18[0-9]{3})(?![0-9])")


def berkas_diperiksa(akar, pakai_git):
    if pakai_git:
        r = subprocess.run(["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], cwd=akar,
                           capture_output=True, text=True)
        if r.returncode != 0:
            raise SystemExit("GAGAL: git ls-files gagal: " + r.stderr.strip())
        daftar = [p for p in r.stdout.split("\0") if p]
    else:
        daftar = []
        for d, _, nama in os.walk(akar):
            for n in nama:
                daftar.append(os.path.relpath(os.path.join(d, n), akar))
    for rel in sorted(daftar):
        rel = rel.replace(os.sep, "/")
        if rel in DILEWATI_SENDIRI or ("/" in rel and not rel.startswith(AWAL_DIPERIKSA)):
            continue
        if any(s in "/" + rel for s in SERING_DILEWATI) or rel.endswith(AKHIRAN_DILEWATI):
            continue
        p = pathlib.Path(akar, rel)
        if p.is_symlink() or not p.is_file():
            continue
        yield rel, p


def periksa(akar, pakai_git=True):
    """Kembalikan (daftar temuan, jumlah berkas yang dibaca)."""
    temuan, jumlah = [], 0
    for rel, p in berkas_diperiksa(akar, pakai_git):
        try:
            teks = p.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        jumlah += 1
        izin = BOLEH_PORT_TETAP.get(rel)
        for no, baris in enumerate(teks.splitlines(), 1):
            if izin != "semua":
                sisa = baris
                if izin == "bawaan":
                    sisa = RE_BAWAAN.sub("", baris)
                for m in RE_PORT_TETAP.finditer(sisa):
                    temuan.append(f"{rel}:{no}: port {m.group(1)} tertulis tetap; baca dari {PORT_TETAP[m.group(1)]} "
                                  f"(labs/lab_env.py, lab_env.sh, lab_env.mk, atau ${{{PORT_TETAP[m.group(1)]}:-{m.group(1)}}} di compose)")
            if rel not in BOLEH_PORT_SERVER:
                for m in RE_PORT_SERVER.finditer(baris):
                    temuan.append(f"{rel}:{no}: port server lab {m.group(1)} tertulis tetap; pakai port_lab({m.group(1)}) "
                                  f"atau portLab({m.group(1)}), atau tambahkan LAB_PORT_OFFSET")
    return temuan, jumlah


def main(argv):
    if argv == ["--help"] or argv == ["-h"]:
        print(__doc__.strip())
        return 0
    akar, pakai_git = AKAR, True
    if argv:
        if len(argv) == 2 and argv[0] == "--akar":
            akar, pakai_git = pathlib.Path(argv[1]).resolve(), False
            if not akar.is_dir():
                print(f"GAGAL: bukan folder: {argv[1]}")
                return 2
        else:
            print(f"GAGAL: argumen tidak dikenal: {' '.join(argv)} (hanya --akar <folder> dan --help)")
            return 2
    temuan, jumlah = periksa(akar, pakai_git)
    for t in temuan:
        print("GAGAL " + t)
    if temuan:
        print(f"# GAGAL {len(temuan)} temuan di {jumlah} berkas")
        return 1
    print(f"# lolos: {jumlah} berkas diperiksa")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
