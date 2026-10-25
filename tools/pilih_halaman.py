#!/usr/bin/env python3
"""Memilih halaman yang diperiksa alat ukur Playwright di CI (keputusan 866).

Aturan dasarnya satu: ragu berarti SEMUA halaman. Subset hanya untuk PR (pull_request) yang HANYA mengubah berkas yang
tidak bisa memengaruhi hasil ukur selain lewat isi halaman, dan hanya bila dist hasil build bisa dibandingkan dengan dist
dasar (artefak situs-dist dari run main terbaru yang hijau). Halaman yang dipilih = halaman yang HTML-nya berbeda dari
dasar, sesudah sidebar dibuang (sidebar berubah di semua halaman tiap ada halaman baru). Asumsi yang dipakai:

  1. Build deterministik: dua build commit yang sama menghasilkan dist yang identik byte demi byte (diukur lokal
     2026-10-25, 0 file berbeda dari 501). Tanpa itu semua halaman tampak berbeda dan hasilnya SEMUA, bukan salah.
  2. Hasil alat ukur hanya fungsi dari (HTML halaman, berkas yang ia muat, alat ukur, lingkungan). Perubahan alat ukur,
     CSS/JS bersama, font, dependency, dan workflow memilih SEMUA; CSS/JS ber-hash mengubah HTML semua halaman.
  2b. HTML dinormalkan dulu: sidebar dibuang dan uid astro-island dikosongkan (lihat normal()).
  3. Berkas dist yang bukan HTML dan berubah dipetakan ke halaman lewat rujukannya di HTML; yang tidak bisa dipetakan,
     atau kode bersama (widgets/*.js, vendor, fonts), memilih SEMUA.

Pemakaian:
  python3 tools/pilih_halaman.py --peristiwa pull_request --dist situs/dist --dasar tmp/dist-dasar \\
      --basis HEAD^1 --keluar tmp/halaman-diperiksa.txt
Keluaran: satu baris ringkasan di stdout (mode=semua|sebagian, jumlah, alasan); bila sebagian, berkas --keluar berisi
satu path URL per baris (berkas kosong = nol halaman). Bila semua, berkas --keluar tidak ditulis (dan dihapus bila
ada), supaya alat ukur memeriksa semua tanpa variabel UKUR_HALAMAN. Exit selalu 0 kecuali argumen salah: kegagalan apa
pun di dalam pemilih menghasilkan SEMUA.
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

# Berkas dist yang turunan murni dari isi halaman atau tidak dimuat alat ukur.
NETRAL_AWALAN = ("pagefind/", "_astro/")  # _astro/: nama ber-hash, perubahan terlihat lewat rujukan di HTML
NETRAL_NAMA = ("gerbang-tanda.txt", "javascripts/istilah-data.js")
RE_SITEMAP = re.compile(r"^sitemap[^/]*\.xml$")
# Kode dan aset bersama: perubahan berarti semua halaman terpengaruh.
BERSAMA_AWALAN = ("widgets/", "vendor/", "fonts/", "javascripts/")
# Widget yang membaca widgets/data/cerita.json saat berjalan, jadi HTML-nya tidak berubah saat registry berubah.
WIDGET_REGISTRI = ("peta-cerita", "indeks-masalah", "kartu", "umpan-balik-data")

# Berkas sumber (path dari root repo) yang boleh ada di PR subset. Selain ini: SEMUA.
AWALAN_HALAMAN = (
    "situs/src/content/docs/",
    "situs/lama/widgets/data/",
    "situs/data/widget/", "situs/data/diagram/", "situs/data/erd/", "situs/data/halaman-istilah/",
    "labs/",
)
BERKAS_HALAMAN = (  # turunan atau sumber isi; efeknya ke halaman terlihat di HTML dasar-lawan-baru
    "situs/data/glosarium.json", "situs/data/istilah.md", "situs/lama/javascripts/istilah-data.js",
)
AWALAN_ABAIKAN = ("plan/",)  # tidak dibaca build maupun alat ukur


def git(*args, cwd=None):
    return subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, check=True).stdout


def hapus_sidebar(html):
    """Membuang <nav class="... sidebar ...">...</nav> (seimbang terhadap <nav> bersarang)."""
    m = re.search(r'<nav\b[^>]*\bclass="[^"]*\bsidebar\b[^"]*"[^>]*>', html)
    if not m:
        return html
    kedalaman, pos = 1, m.end()
    for t in re.finditer(r"<(/?)nav\b[^>]*>", html[pos:]):
        kedalaman += -1 if t.group(1) else 1
        if kedalaman == 0:
            return html[:m.start()] + html[pos + t.end():]
    return html  # tidak seimbang: biarkan utuh (berbeda = terpilih, arah aman)


RE_UID_ISLAND = re.compile(r'(<astro-island\b[^>]*?\buid=")[^"]*(")')


def normal(teks):
    """Sidebar dibuang; uid astro-island dikosongkan: uid-nya berbeda antarmesin (diukur: build macOS lawan build CI, 22 halaman
    berbeda hanya di uid) dan hanya penanda hydration, bukan isi."""
    return RE_UID_ISLAND.sub(r"\1\2", hapus_sidebar(teks))


def sidik_html(teks):
    return hashlib.sha256(normal(teks).encode("utf8")).hexdigest()


def url_halaman(rel):
    """Path relatif dist (tahap-1/x/index.html) -> path URL (/tahap-1/x/)."""
    if rel == "index.html":
        return "/"
    if rel.endswith("/index.html"):
        return "/" + rel[: -len("index.html")]
    return "/" + rel  # 404.html dan sejenisnya


def baca_dist(akar):
    """-> (halaman {url: (sidik, teks_mentah)}, berkas {rel: sha256 byte})"""
    akar = Path(akar)
    halaman, berkas = {}, {}
    for p in sorted(akar.rglob("*")):
        if not p.is_file():
            continue
        rel = p.relative_to(akar).as_posix()
        if rel.endswith(".html"):
            teks = p.read_text(encoding="utf8", errors="replace")
            halaman[url_halaman(rel)] = (sidik_html(teks), teks)
        else:
            berkas[rel] = hashlib.sha256(p.read_bytes()).hexdigest()
    return halaman, berkas


def netral(rel):
    return rel.startswith(NETRAL_AWALAN) or rel in NETRAL_NAMA or bool(RE_SITEMAP.match(rel))


class Semua(Exception):
    """Alasan memilih semua halaman."""


def periksa_berkas_sumber(perubahan, cerita_lama=None, cerita_baru=None):
    """perubahan: [(status, path)] dari git diff --name-status --no-renames. Melempar Semua bila ada yang tidak aman."""
    if not perubahan:
        return  # tidak ada berkas berubah: yang berbeda hanya build, dan itu dinilai dari diff dist
    for status, p in perubahan:
        if p.startswith(AWALAN_ABAIKAN) or p.startswith(AWALAN_HALAMAN) or p in BERKAS_HALAMAN:
            continue
        if p == "situs/data/cerita.json":
            if not periksa_cerita(cerita_lama, cerita_baru):
                raise Semua("situs/data/cerita.json berubah di luar entri halaman")
            continue
        # Berkas baru di situs/src (komponen, widget) hanya berpengaruh lewat berkas lain yang ikut berubah,
        # dan berkas itu dinilai di sini juga.
        if status == "A" and p.startswith("situs/src/"):
            continue
        raise Semua(f"{p} ({status}) bukan berkas halaman atau data")


def periksa_cerita(lama, baru):
    """True bila registry hanya berbeda di halaman[*] (entri halaman); selain itu False."""
    try:
        a, b = json.loads(lama), json.loads(baru)
    except (TypeError, ValueError):
        return False
    a.pop("halaman", None)
    b.pop("halaman", None)
    return a == b


def halaman_berubah(dist, dasar):
    """-> (set url halaman terpilih, catatan). Melempar Semua bila perubahan tidak bisa dipetakan ke halaman."""
    h_baru, f_baru = dist
    h_lama, f_lama = dasar
    pilih = {u for u, (s, _) in h_baru.items() if u not in h_lama or h_lama[u][0] != s}
    catatan = [f"{len(pilih)} halaman berbeda atau baru menurut HTML"]
    for rel, sidik in sorted(f_baru.items()):
        if netral(rel) or f_lama.get(rel) == sidik:
            continue
        if rel not in f_lama:
            continue  # berkas baru: hanya berpengaruh lewat HTML yang merujuknya, dan HTML itu sudah dihitung
        if rel == "widgets/data/cerita.json":
            tambah = {u for u, (_, t) in h_baru.items() if u == "/" or any(f'data-bb="{w}"' in t for w in WIDGET_REGISTRI)}
            pilih |= tambah
            catatan.append(f"registry runtime berubah: {len(tambah)} halaman pembaca registry")
            continue
        if rel.startswith(BERSAMA_AWALAN) and not rel.startswith("widgets/data/"):
            raise Semua(f"{rel} berubah (kode atau aset bersama)")
        jarum = {rel, rel[len("widgets/"):]} if rel.startswith("widgets/data/") else {rel}
        rujuk = {u for u, (_, t) in h_baru.items() if any(j in t for j in jarum)}
        if not rujuk:
            raise Semua(f"{rel} berubah dan tidak ada halaman yang merujuknya")
        pilih |= rujuk
        catatan.append(f"{rel} berubah: {len(rujuk)} halaman merujuknya")
    for rel in sorted(set(f_lama) - set(f_baru)):
        if not netral(rel):
            raise Semua(f"{rel} dihapus")
    return pilih, catatan


def putuskan(peristiwa, dist_dir, dasar_dir, basis, bawaan_git=git, baca_cerita=None):
    """-> (mode, halaman_terurut | None, [alasan])"""
    if peristiwa != "pull_request":
        return "semua", None, [f"peristiwa {peristiwa or '(kosong)'}: seratus persen halaman"]
    alasan = []
    try:
        if not dasar_dir or not Path(dasar_dir).is_dir() or not any(Path(dasar_dir).iterdir()):
            raise Semua("dist dasar dari main tidak tersedia")
        if not basis:
            raise Semua("tanpa --basis, daftar berkas berubah tidak diketahui")
        status = bawaan_git("diff", "--name-status", "--no-renames", basis, "HEAD").splitlines()
        perubahan = [tuple(s.split("\t", 1)) for s in status if "\t" in s]
        cerita = [None, None]
        if any(p == "situs/data/cerita.json" for _, p in perubahan):
            baru = baca_cerita() if baca_cerita else Path("situs/data/cerita.json").read_text(encoding="utf8")
            cerita = [bawaan_git("show", f"{basis}:situs/data/cerita.json"), baru]
        # Hitung dulu diff dist supaya log menunjukkannya walau alasan pertama sudah memutuskan semua.
        pilih, catatan = None, []
        try:
            pilih, catatan = halaman_berubah(baca_dist(dist_dir), baca_dist(dasar_dir))
        except Semua as e:
            alasan.append(str(e))
            raise
        alasan.extend(catatan)
        periksa_berkas_sumber(perubahan, *cerita)
        alasan.append(f"{len(perubahan)} berkas sumber berubah, semuanya berkas halaman atau data")
        return "sebagian", sorted(pilih), alasan
    except Semua as e:
        if str(e) not in alasan:
            alasan.append(str(e))
        return "semua", None, alasan
    except Exception as e:  # kegagalan apa pun: ragu = semua
        alasan.append(f"pemilih gagal ({type(e).__name__}: {e}); ragu = semua")
        return "semua", None, alasan


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--peristiwa", default=os.environ.get("GITHUB_EVENT_NAME", ""))
    ap.add_argument("--dist", default="situs/dist")
    ap.add_argument("--dasar", default="")
    ap.add_argument("--basis", default="", help="revisi pembanding berkas sumber, mis. HEAD^1 (commit merge PR)")
    ap.add_argument("--keluar", required=True)
    a = ap.parse_args(argv)
    mode, halaman, alasan = putuskan(a.peristiwa, a.dist, a.dasar, a.basis)
    keluar = Path(a.keluar)
    if mode == "sebagian":
        keluar.parent.mkdir(parents=True, exist_ok=True)
        keluar.write_text("".join(h + "\n" for h in halaman), encoding="utf8")
    elif keluar.exists():
        keluar.unlink()
    print(f"mode={mode} halaman={'semua' if halaman is None else len(halaman)}")
    for x in alasan:
        print(f"  - {x}")
    if halaman is not None:
        for h in halaman[:40]:
            print(f"  halaman {h}")
        if len(halaman) > 40:
            print(f"  ... dan {len(halaman) - 40} lagi")
    return 0


if __name__ == "__main__":
    sys.exit(main())
