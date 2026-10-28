"""Vektor uji rumus hash audit_log (ADR 43): ditulis dan dihitung dengan Python (hashlib), terpisah dari Go.

Rumus (README api-t4): hash = SHA-256(hash_sebelumnya + 0x1e + isi), isi = waktu (UTC, mikrodetik, 'YYYY-MM-DDTHH:MM:SS.ffffffZ'),
pelaku, peran, aksi, objek, alasan, penyetuju (0 bila kosong), dipisah 0x1f. Tiga implementasi (Go api-t4, Go modul MCP,
skrip ini) dibandingkan memakai berkas yang sama: vektor-hash.json. `python3 vektor.py` menulis ulang berkas itu;
`run.py` memeriksa isinya tidak berbeda dari hasil skrip ini.
"""
import hashlib, json, pathlib

NOL = "0" * 64
HERE = pathlib.Path(__file__).resolve().parent


def hash_baris(sebelumnya, waktu, pelaku, peran, aksi, objek, alasan, penyetuju):
    isi = "\x1f".join([waktu, str(pelaku), peran, aksi, objek, alasan, str(penyetuju)])
    return hashlib.sha256((sebelumnya + "\x1e" + isi).encode("utf-8")).hexdigest()


# (waktu, pelaku, peran, aksi, objek, alasan, penyetuju): dirantai, tiap baris memakai hash baris sebelumnya.
BARIS = [
    ("2026-10-26T01:02:03.000000Z", 420, "risk", "lihat_akun", "akun:40001", "", 0),
    ("2026-10-26T01:02:04.123456Z", 420, "risk", "bekukan", "akun:40001", "Dugaan akun dipakai pihak lain, menunggu konfirmasi", 0),
    ("2026-10-26T01:05:00.999999Z", 420, "risk", "buka_blokir", "akun:40001", "Pemilik sudah dikonfirmasi lewat layanan pelanggan", 421),
    ("2026-10-26T23:59:59.000001Z", 421, "risk", "buka_berkas", "verifikasi:7/kartu", "Pemeriksaan lanjutan atas laporan pemilik: é ü 日本", 0),
    ("2027-01-01T00:00:00.000000Z", 421, "risk", "ubah_batas", "akun:40001/batas_harian=250000", "Batas dinaikkan sesuai permintaan tertulis", 420),
]


def buat():
    hasil, sebelum = [], NOL
    for w, p, pr, a, o, al, s in BARIS:
        h = hash_baris(sebelum, w, p, pr, a, o, al, s)
        hasil.append({"sebelumnya": sebelum, "waktu": w, "pelaku": p, "peran": pr, "aksi": a, "objek": o,
                      "alasan": al, "penyetuju": s, "hash": h})
        sebelum = h
    return hasil


def teks():
    return json.dumps(buat(), indent=1, ensure_ascii=False) + "\n"


if __name__ == "__main__":
    (HERE / "vektor-hash.json").write_text(teks())
    print("ditulis vektor-hash.json:", len(BARIS), "baris")
