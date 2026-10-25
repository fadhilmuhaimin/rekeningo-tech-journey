"""Uji tools/cek_port_lab.py (keputusan 860): pemeriksa harus gagal pada port lab yang tertulis tetap, bukan lolos palsu.

Setiap kasus menulis pohon kecil di folder sementara dan menjalankan pemeriksa dengan `--akar`. Satu kasus memakai isi
berkas lab sungguhan yang `{DB_PORT}`-nya diganti angka tetap (mutasi). Repo asli tidak diubah. Tes terakhir memastikan
argumen asing ditolak tanpa mengubah berkas.

    python3 tools/test_cek_port_lab.py
"""
import pathlib
import subprocess
import sys
import tempfile

AKAR = pathlib.Path(__file__).resolve().parent.parent
ALAT = str(AKAR / "tools" / "cek_port_lab.py")
DB = "54" + "333"   # tidak ditulis utuh di sini; berkas ini tetap dilewati pemeriksa


def jalan(*arg):
    return subprocess.run([sys.executable, ALAT, *arg], cwd=AKAR, capture_output=True, text=True)


def pohon(berkas):
    tmp = tempfile.TemporaryDirectory()
    for rel, isi in berkas.items():
        p = pathlib.Path(tmp.name, rel)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(isi, encoding="utf-8")
    return tmp


gagal = []


def periksa(nama, kondisi, rincian=""):
    print(("ok " if kondisi else "GAGAL ") + nama + (f"  [{rincian}]" if rincian and not kondisi else ""))
    if not kondisi:
        gagal.append(nama)


def kasus(nama, berkas, harap_exit, wajib=()):
    with pohon(berkas) as tmp:
        r = jalan("--akar", tmp)
    ok = r.returncode == harap_exit and all(w in r.stdout for w in wajib)
    periksa(nama, ok, f"exit {r.returncode}, keluaran: {r.stdout.strip()[:200]}")


# Repo asli lolos, dan pemeriksa benar-benar membaca berkas (bukan lolos karena daftar kosong).
r = jalan()
jumlah = int(r.stdout.rsplit(":", 1)[1].split()[0]) if r.returncode == 0 and "berkas diperiksa" in r.stdout else 0
periksa("repo asli lolos dan membaca puluhan berkas", r.returncode == 0 and jumlah > 50, r.stdout[-200:])

# Port database tertulis tetap.
kasus("DSN Python dengan port tetap gagal", {"labs/x/run.py": f'DSN = "host=127.0.0.1 port={DB} user=lab"\n'}, 1,
      [f"labs/x/run.py:1: port {DB} tertulis tetap", "LAB_DB_PORT"])
kasus("DSN Python dari lab_env lolos", {"labs/x/run.py": 'DSN = f"host=127.0.0.1 port={DB_PORT} user=lab"\n'}, 0)
kasus("URL di Makefile dengan port tetap gagal", {"labs/x/Makefile": f"t:\n\tgo test 'postgres://lab:lab@127.0.0.1:{DB}/lab'\n"}, 1,
      ["labs/x/Makefile:2"])
kasus("shell dengan port tetap gagal", {"labs/x/run.sh": f'DB="postgres://lab:lab@127.0.0.1:{DB}/lab"\n'}, 1, ["labs/x/run.sh:1"])
kasus("Go dengan port database tetap gagal", {"labs/x/main.go": f'var dsn = "host=127.0.0.1 port={DB}"\n'}, 1, ["labs/x/main.go:1"])
kasus("port Redis tetap gagal", {"labs/x/run.py": "r = redis.Redis(port=56" + "379)\n"}, 1, ["LAB_REDIS_PORT"])
kasus("port replika tetap gagal", {"labs/x/run.py": 'P = "postgresql://lab@127.0.0.1:54' + '340/lab"\n'}, 1, ["LAB_REPLIKA_PRIMARY_PORT"])
kasus("angka yang hanya mirip (154333, 543330) tidak dihitung", {"labs/x/run.py": "A = 154" + "333\nB = 54" + "3330\n"}, 0)
kasus("dua temuan di dua berkas dilaporkan semua",
      {"labs/a/run.py": f"a = {DB}\n", "tools/b.py": f"b = {DB}\n"}, 1, ["labs/a/run.py:1", "tools/b.py:1", "2 temuan"])
kasus("isi lab sungguhan dengan {DB_PORT} diganti angka tetap gagal",
      {"labs/b3-ledger/run.py": (AKAR / "labs/b3-ledger/run.py").read_text(encoding="utf-8").replace("{DB_PORT}", DB)}, 1,
      ["labs/b3-ledger/run.py", f"port {DB}"])

# Pengecualian: compose hanya boleh sebagai nilai bawaan, helper boleh mendefinisikan.
kasus("compose dengan ${LAB_DB_PORT:-bawaan} lolos",
      {"labs/b3-race/docker-compose.yml": f'    ports:\n      - "127.0.0.1:${{LAB_DB_PORT:-{DB}}}:5432"\n'}, 0)
kasus("compose dengan port tetap gagal",
      {"labs/b3-race/docker-compose.yml": f'    ports:\n      - "127.0.0.1:{DB}:5432"\n'}, 1, ["labs/b3-race/docker-compose.yml:2"])
kasus("compose lab lain dengan bawaan di luar ${...} gagal",
      {"labs/b9-cache/docker-compose.yml": f'# {DB}\n'}, 1, ["labs/b9-cache/docker-compose.yml:1"])
kasus("helper lab_env boleh mendefinisikan nilai bawaan",
      {"labs/lab_env.py": f'DB_PORT = _bulat("LAB_DB_PORT", {DB})\n', "labs/lab_env.mk": f"LAB_DB_PORT ?= {DB}\n"}, 0)
kasus("nama berkas helper yang sama di folder lain tidak dikecualikan",
      {"labs/x/lab_env.py": f'DB_PORT = {DB}\n'}, 1, ["labs/x/lab_env.py:1"])

# Yang tidak diperiksa: rekaman, Markdown, plan/, situs/.
kasus("rekaman output/ tidak diperiksa", {"labs/x/output/rekaman.txt": f"-- port {DB}\n"}, 0)
kasus("Markdown tidak diperiksa", {"labs/README.md": f"Port `{DB}`\n", "README.md": f"{DB}\n"}, 0)
kasus("plan/ dan situs/ tidak diperiksa", {"plan/KEPUTUSAN.md": f"| 1 | {DB} |\n", "situs/src/x.ts": f"const p = {DB}\n"}, 0)
kasus("berkas di akar selain Markdown diperiksa", {"Makefile": f"x:\n\t@echo {DB}\n"}, 1, ["Makefile:2"])

# Port server lab.
kasus("Go ListenAndServe dengan port tetap gagal",
      {"labs/x/main.go": 'log.Fatal(http.ListenAndServe("127.0.0.1:18101", nil))\n'}, 1, ["labs/x/main.go:1", "portLab(18101)"])
kasus("Go dengan portLab lolos", {"labs/x/main.go": 'log.Fatal(http.ListenAndServe("127.0.0.1:"+portLab(18101), nil))\n'}, 0)
kasus("Python soket dengan port tetap gagal",
      {"labs/x/run.py": 'socket.create_connection(("127.0.0.1", 18096), 0.1)\n'}, 1, ["port_lab(18096)"])
kasus("Python dengan port_lab lolos",
      {"labs/x/run.py": 'socket.create_connection(("127.0.0.1", port_lab(18096)), 0.1)\nU = f"http://127.0.0.1:{port_lab(18096)}/x"\n'}, 0)
kasus("URL http dengan port tetap gagal", {"labs/x/run.py": 'U = "http://127.0.0.1:18102/topup"\n'}, 1, ["labs/x/run.py:1"])
kasus("Dart dengan LAB_PORT_OFFSET lolos",
      {"labs/x/a.dart": "final online = 'http://127.0.0.1:${18096 + offset}';\n"}, 0)
kasus("bawaan flag server yang dikecualikan lolos",
      {"labs/api-t2/cmd/api/main.go": 'alamat := flag.String("addr", "127.0.0.1:18093", "alamat server")\n'}, 0)
kasus("bawaan flag di berkas lain gagal",
      {"labs/api-t3/cmd/api/main.go": 'alamat := flag.String("addr", "127.0.0.1:18093", "alamat server")\n'}, 1, ["labs/api-t3/cmd/api/main.go:1"])
kasus("compose.yaml api-t1 yang dibaca halaman boleh memuat port bawaan",
      {"labs/api-t1/deploy/compose.yaml": '    ports:\n      - "127.0.0.1:18083:8080"\n'}, 0)
kasus("compose.lab-port.yaml dengan port tetap gagal",
      {"labs/api-t1/deploy/compose.lab-port.yaml": '    ports: !override\n      - "127.0.0.1:18083:8080"\n'}, 1, ["compose.lab-port.yaml:2"])
kasus("port di luar 18xxx dan tanpa host tidak dihitung",
      {"labs/x/main.go": 'a := "127.0.0.1:50000"\n// lb :18140 → :18141\n'}, 0)

# Argumen asing ditolak tanpa mengubah apa pun.
status0 = subprocess.run(["git", "status", "--porcelain", "--untracked-files=all"], cwd=AKAR, capture_output=True, text=True).stdout
r = jalan("--bantuan")
periksa("argumen asing: keluar bukan 0", r.returncode != 0)
r2 = jalan("--akar")
periksa("--akar tanpa folder: keluar bukan 0", r2.returncode != 0)
r3 = jalan("--help")
periksa("--help: keluar 0 dan mencetak bantuan", r3.returncode == 0 and len(r3.stdout.strip()) > 100)
status1 = subprocess.run(["git", "status", "--porcelain", "--untracked-files=all"], cwd=AKAR, capture_output=True, text=True).stdout
periksa("argumen asing dan --help tidak mengubah berkas", status0 == status1)

print(f"# {'GAGAL ' + str(len(gagal)) if gagal else 'lolos'}")
sys.exit(1 if gagal else 0)
