"""Port lab dari lingkungan, supaya beberapa lajur kerja bisa menjalankan lab bersamaan (keputusan 860).

Tanpa variabel, semua nilai sama dengan sebelum ada berkas ini. Nilai yang bukan bilangan bulat
atau di luar 1-65535 menghentikan lab dengan GAGAL, bukan diam-diam memakai nilai lain.

  LAB_DB_PORT                 port PostgreSQL bersama di host (bawaan 54333; labs/b3-race/docker-compose.yml)
  LAB_REDIS_PORT              port Redis (bawaan 56379; labs/b9-cache/docker-compose.yml)
  LAB_REPLIKA_PRIMARY_PORT    primary lab t5-replika (bawaan 54340)
  LAB_REPLIKA_REPLICA_PORT    replica lab t5-replika (bawaan 54341)
  LAB_PORT_OFFSET             ditambahkan ke setiap port server lab (bawaan 0), lewat port_lab(dasar)
  COMPOSE_PROJECT_NAME        nama proyek compose, dibaca docker compose sendiri

Cara pakai di lab: dari labs/<lab>/run.py,
    import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
    from lab_env import DB_PORT, port_lab
lalu f"port={DB_PORT}" untuk database dan port_lab(18083) untuk server lab. Teks yang masuk rekaman memakai port dasar,
bukan hasil port_lab(), supaya rekaman sama di semua lajur.
"""
import os


def _bulat(nama, bawaan):
    mentah = os.environ.get(nama, "").strip()
    if mentah == "":
        return bawaan
    try:
        nilai = int(mentah)
    except ValueError:
        raise SystemExit(f"GAGAL: {nama}={mentah!r} bukan bilangan bulat")
    return nilai


def _port_sah(nama, nilai):
    if not 1 <= nilai <= 65535:
        raise SystemExit(f"GAGAL: {nama}={nilai} di luar 1-65535")
    return nilai


DB_PORT = _port_sah("LAB_DB_PORT", _bulat("LAB_DB_PORT", 54333))
REDIS_PORT = _port_sah("LAB_REDIS_PORT", _bulat("LAB_REDIS_PORT", 56379))
REPLIKA_PRIMARY_PORT = _port_sah("LAB_REPLIKA_PRIMARY_PORT", _bulat("LAB_REPLIKA_PRIMARY_PORT", 54340))
REPLIKA_REPLICA_PORT = _port_sah("LAB_REPLIKA_REPLICA_PORT", _bulat("LAB_REPLIKA_REPLICA_PORT", 54341))
OFFSET = _bulat("LAB_PORT_OFFSET", 0)
PROYEK = os.environ.get("COMPOSE_PROJECT_NAME", "").strip()


def port_lab(dasar):
    """Port server lab = port dasar + LAB_PORT_OFFSET."""
    return _port_sah(f"port_lab({dasar}) dengan LAB_PORT_OFFSET={OFFSET}", dasar + OFFSET)
