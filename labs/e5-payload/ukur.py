"""Lab E5: ukuran response riwayat penjualan dalam beberapa bentuk, mentah dan gzip.
Data dari PostgreSQL 17 (skema b2q, lab B2.3). Keluaran: output/ukuran.txt"""
import gzip, json, pathlib
import psycopg
import os as _os, sys as _sys; _sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), ".."))  # lab_env: labs/README.md
from lab_env import DB_PORT  # noqa: E402

DSN = f"host=127.0.0.1 port={DB_PORT} user=lab password=lab dbname=lab options=-csearch_path=b2q"
c = psycopg.connect(DSN, autocommit=True)
TOKO = {"id": 1, "nama": "Warung Ani", "alamat": "Kantin Gedung B lantai 1",
        "deskripsi": "Nasi goreng, mie ayam, es teh, kopi. Buka 07.00-15.00.", "jam_buka": "07:00", "jam_tutup": "15:00"}


def data(n):
    ps = c.execute("SELECT id, akun_id, total, dibuat FROM pesanan WHERE toko_id = 1 ORDER BY dibuat DESC LIMIT %s", (n,)).fetchall()
    ids = [p[0] for p in ps]
    items = {}
    for pid, nama, jumlah, harga in c.execute(
            "SELECT pesanan_id, nama, jumlah, harga FROM item_pesanan WHERE pesanan_id = ANY(%s) ORDER BY 1", (ids,)):
        items.setdefault(pid, []).append({"nama": nama, "jumlah": jumlah, "harga": harga})
    return ps, items


def bentuk(n):
    ps, items = data(n)
    lengkap = [{"id": pid, "toko": TOKO, "pembeli": {"id": akun, "nama": f"User {akun}", "foto_url": f"https://cdn.example/foto/{akun}.jpg"},
                "total": total, "status": "selesai", "dibuat": dibuat.isoformat(), "diperbarui": dibuat.isoformat(),
                "item": items[pid]} for pid, akun, total, dibuat in ps]
    ringkas = [{"id": pid, "total": total, "dibuat": dibuat.isoformat(), "jumlah_item": len(items[pid])}
               for pid, akun, total, dibuat in ps]
    return {"lengkap (toko + pembeli + item di setiap pesanan)": lengkap, "ringkas (field layar daftar saja)": ringkas}


log = ["-- data: PostgreSQL 17.11 skema b2q; JSON dari json.dumps (tanpa spasi), gzip level 9 (bawaan gzip.compress di Python)"]
for n in (20, 100):
    for nama, isi in bentuk(n).items():
        mentah = json.dumps({"data": isi}, separators=(",", ":")).encode()
        log.append(f"{n:>3} pesanan · {nama:<48} {len(mentah):>7,} B mentah · {len(gzip.compress(mentah)):>6,} B gzip".replace(",", "."))
teks = "\n".join(log) + "\n"
(pathlib.Path(__file__).parent / "output/ukuran.txt").write_text(teks)
print(teks)
