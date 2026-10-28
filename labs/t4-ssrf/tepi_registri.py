"""Turunkan tabel tepi blok untuk TestSSRFKelasTepiBlokRegistriIANA dari registri alamat khusus IANA.

    python3 tepi_registri.py <folder berisi iana-ipv4-special-registry.xml dan iana-ipv6-special-registry.xml>

Tidak dijalankan oleh `make run`, `cek`, atau `mutasi`: lab ini tidak mengunduh apa pun. File XML diunduh tangan dari
https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xml dan
https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xml (tabel di tes memakai versi
bertanggal 2025-10-09, diunduh 2026-10-28). Keluarannya adalah baris `{blok, awal, akhir, sebelum, sesudah}` untuk ditempel
ke `tepiBlokRegistri` di `labs/api-t4/internal/unduh/ssrf_batas_test.go`.

Aturan: blok dengan Globally Reachable false, N/A, atau tanpa bendera (usang) harus ditolak; hanya blok maksimal (tidak
di dalam blok terlarang lain). IPv4-mapped diuji lewat tepi IPv4-nya. Tiga blok ditambahkan dari luar registri: ::/96 dan
fec0::/10 (usang) serta 64:ff9b::/96 (terjangkau global, tetapi membawa alamat IPv4). Alamat tepat di luar blok yang jatuh
di blok terlarang lain, di multicast, atau di 0000::/8 (dicadangkan IETF) dikosongkan.
"""
import ipaddress as ip
import pathlib
import sys
import xml.etree.ElementTree as ET

NS = "{http://www.iana.org/assignments}"
EKSTRA = ["::/96", "fec0::/10", "64:ff9b::/96"]
LEWATI_TETANGGA = ["224.0.0.0/4", "ff00::/8", "::/8"]


def baca(folder):
    blok = []
    for fam in ("ipv4", "ipv6"):
        akar = ET.parse(pathlib.Path(folder) / f"iana-{fam}-special-registry.xml").getroot()
        for r in akar.iter(NS + "record"):
            alamat = (r.findtext(NS + "address") or "").strip()
            bendera = (r.findtext(NS + "global") or "").strip()
            for b in alamat.replace(",", " ").split():
                b = b.split("[")[0]
                if b.startswith("::ffff:0:0/96"):
                    continue
                if bendera in ("False", "N/A", ""):
                    blok.append(ip.ip_network(b))
    return blok


def main(folder):
    dilarang = set(baca(folder)) | {ip.ip_network(x) for x in EKSTRA}
    semua = list(dilarang) + [ip.ip_network(x) for x in LEWATI_TETANGGA]

    def bebas(a):
        if a is None or any(a in m for m in semua if m.version == a.version):
            return ""
        return str(a)

    baris = 0
    for n in sorted(dilarang, key=lambda x: (x.version, x.network_address, x.prefixlen)):
        if any(n != m and n.version == m.version and n.subnet_of(m) for m in dilarang):
            continue
        awal, akhir = n.network_address, n.broadcast_address
        batas = 2 ** (32 if n.version == 4 else 128) - 1
        sebelum = awal - 1 if int(awal) > 0 else None
        sesudah = akhir + 1 if int(akhir) < batas else None
        print("{" + ", ".join(f'"{x}"' for x in (n, awal, akhir, bebas(sebelum), bebas(sesudah))) + "},")
        baris += 1
    print(baris, "baris", file=sys.stderr)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
