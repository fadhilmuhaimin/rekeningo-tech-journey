"""Uji pembaca port lab (keputusan 863): labs/lab_env.py dan labs/lab_env.sh harus sepakat pada nilai yang wajar dan
menolak nilai yang aneh dengan GAGAL, bukan diam-diam memakai nilai lain.

Aritmetika shell membaca "abc" sebagai 0 dan "0100" sebagai oktal 64; lab_env.sh memeriksa nilainya dulu. Tes ini
menjalankan Python, bash, dan sh dengan LAB_PORT_OFFSET dan LAB_DB_PORT yang aneh dan membandingkan hasilnya.
Go, Dart, dan Node tidak dijalankan di sini (butuh toolchain); ketiganya diuji tangan di PR yang sama.

    python3 tools/test_lab_env.py
"""
import os
import pathlib
import subprocess
import sys

AKAR = pathlib.Path(__file__).resolve().parent.parent
LABS = AKAR / "labs"

PY = ("import sys; sys.path.insert(0, %r); from lab_env import DB_PORT, port_lab; "
      "print(port_lab(18083), DB_PORT)" % str(LABS))
SH = ". %s/lab_env.sh || exit 1; P=$(port_lab 18083) || exit 1; echo \"$P $LAB_DB_PORT\"" % LABS

gagal = []


def jalan(cmd, **env_tambahan):
    env = {k: v for k, v in os.environ.items() if not k.startswith("LAB_")}
    env.update(env_tambahan)
    r = subprocess.run(cmd, env=env, capture_output=True, text=True)
    return r.returncode, (r.stdout + r.stderr).strip()


def semua(**env):
    return {
        "python": jalan([sys.executable, "-c", PY], **env),
        "bash": jalan(["bash", "-c", SH], **env),
        "sh": jalan(["sh", "-c", SH], **env),
    }


def kasus(nama, env, harap_port=None):
    """harap_port None: ketiganya harus gagal dengan GAGAL; selain itu: ketiganya keluar 0 dengan keluaran itu."""
    hasil = semua(**env)
    if harap_port is None:
        ok = all(rc != 0 and "GAGAL" in teks for rc, teks in hasil.values())
    else:
        ok = all(rc == 0 and teks == harap_port for rc, teks in hasil.values())
    print(("ok " if ok else "GAGAL ") + nama + ("" if ok else f"  [{hasil}]"))
    if not ok:
        gagal.append(nama)


# Nilai wajar: sama di ketiga pembaca.
kasus("tanpa variabel: port dasar", {}, "18083 54333")
kasus("LAB_PORT_OFFSET kosong sama dengan tidak diisi", {"LAB_PORT_OFFSET": ""}, "18083 54333")
kasus("LAB_PORT_OFFSET=0", {"LAB_PORT_OFFSET": "0"}, "18083 54333")
kasus("LAB_PORT_OFFSET=300 dan LAB_DB_PORT=54633", {"LAB_PORT_OFFSET": "300", "LAB_DB_PORT": "54633"}, "18383 54633")
kasus("LAB_PORT_OFFSET negatif yang masih sah", {"LAB_PORT_OFFSET": "-100"}, "17983 54333")
kasus("LAB_PORT_OFFSET=+100", {"LAB_PORT_OFFSET": "+100"}, "18183 54333")
kasus("nol di depan dibaca desimal, bukan oktal (0100 = 100)", {"LAB_PORT_OFFSET": "0100"}, "18183 54333")

# Nilai aneh: ketiganya berhenti dengan GAGAL.
for nilai in ("abc", "100abc", "0x64", "1e3", "1_000", "-", "99999999999999999999"):
    kasus(f"LAB_PORT_OFFSET={nilai!r} ditolak", {"LAB_PORT_OFFSET": nilai})
kasus("LAB_PORT_OFFSET=70000 membuat port di atas 65535: ditolak", {"LAB_PORT_OFFSET": "70000"})
kasus("LAB_PORT_OFFSET=-20000 membuat port di bawah 1: ditolak", {"LAB_PORT_OFFSET": "-20000"})
kasus("LAB_DB_PORT bukan angka ditolak", {"LAB_DB_PORT": "abc"})
kasus("LAB_DB_PORT=70000 ditolak", {"LAB_DB_PORT": "70000"})
kasus("LAB_DB_PORT=0 ditolak", {"LAB_DB_PORT": "0"})

# Pembaca shell di bawah `set -u` (b4-migration, f2-review) tidak boleh jatuh karena variabel belum diisi.
rc, teks = jalan(["bash", "-c", f"set -u; . {LABS}/lab_env.sh || exit 1; echo ok"])
print(("ok " if (rc, teks) == (0, "ok") else "GAGAL ") + "lab_env.sh jalan di bawah set -u tanpa variabel")
if (rc, teks) != (0, "ok"):
    gagal.append("set -u")

print(f"# {'GAGAL ' + str(len(gagal)) if gagal else 'lolos'}")
sys.exit(1 if gagal else 0)
