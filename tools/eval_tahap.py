"""Bukti W1, W5, W6, dan W8 untuk evaluasi tahap (skill evaluasi-tahap, EVAL-2, keputusan 753). Hanya `rantai` untuk tahap
yang sudah lengkap (1 dan 2) masuk gerbang (`tools/cek_situs.sh`, keputusan 1164); yang lain dijalankan tangan.

    python3 tools/eval_tahap.py peta  2   # W1: peta halaman naskah lawan registry (nomor, judul, bintang, lab, ada)
    python3 tools/eval_tahap.py coba  2   # W5: blok Coba tiap halaman, komponennya, ada tebakan, ada "ubah satu hal"
    python3 tools/eval_tahap.py bocor 2   # W5: jawaban tebakan widget lama (predict) yang sudah tertulis di teks sebelum blok Coba
    python3 tools/eval_tahap.py adr   2   # W6: opsi, pre-mortem, kapan salah, tautan sumber tiap halaman ADR
    python3 tools/eval_tahap.py rantai 2  # W8: ikuti tautan Berikutnya di situs/dist dari N.1 sampai halaman terakhir tahap

Semua perintah membaca berkas di repo (naskah, registry, MDX, situs/dist) dan tidak mengubah apa pun. `rantai` butuh
`bun run --cwd situs build` lebih dulu. Exit 1 bila ada selisih nyata: W1 nomor, judul, bintang, lab, atau halaman
"segera"; W6 ADR dengan opsi < 3 atau tanpa pre-mortem atau tanpa "kapan salah"; W8 halaman 404 atau tautan Berikutnya
yang hilang, halaman sesudah halaman terakhir yang sudah punya pengganti ada, urutan yang dilalui tidak sama dengan nomor
tahap itu (halaman terlewat, tertukar, atau rantai berhenti sebelum halaman terakhir), atau tautan "Berikutnya" di akhir
blok berbeda dari tombol Berikutnya. `coba` hanya mencetak (nilai W5 butuh penilaian: lihat isi widget).
"""
import json
import pathlib
import re
import sys

AKAR = pathlib.Path(__file__).resolve().parent.parent
DOCS = AKAR / "situs" / "src" / "content" / "docs"


def registry(n):
    d = json.load(open(AKAR / "situs" / "data" / "cerita.json", encoding="utf-8"))
    return {x["nomor"]: x for x in d["halaman"] if x.get("tahap") == n and x.get("nomor")}, d


def urut(nomor):
    return float(nomor.split(".")[1])


def berkas(h):
    return DOCS / h["path"].replace(".md", ".mdx")


def peta(n):
    reg, _ = registry(n)
    naskah = {}
    aktif = False
    for ln in open(AKAR / "plan" / f"CERITA-TAHAP-{n}.md", encoding="utf-8"):
        if ln.startswith(f"## Peta halaman Tahap {n}"):
            aktif = True
            continue
        if aktif and ln.startswith("## "):
            break
        if aktif and re.match(rf"\| {n}\.\d+ ", ln):
            c = [x.strip() for x in ln.strip().strip("|").split("|")]
            naskah[c[0]] = {"judul": c[2], "inti": c[4] == "★", "lab": c[5]}
    salah = 0
    print(f"naskah {len(naskah)} halaman, registry {len(reg)} halaman")
    for no in sorted(set(naskah) | set(reg), key=urut):
        p, r = naskah.get(no), reg.get(no)
        if not p or not r:
            print(f"{no} SELISIH: {'tidak ada di registry' if not r else 'tidak ada di naskah'}")
            salah += 1
            continue
        masalah = []
        if not r.get("ada"):
            masalah.append("segera")
        if p["inti"] != bool(r.get("inti")):
            masalah.append("bintang beda")
        lab_naskah = p["lab"] not in ("–", "-", "")
        if lab_naskah != bool(r.get("lab")):
            masalah.append(f"lab beda (naskah {p['lab']!r}, registry {r.get('lab')})")
        print(f"{no} | {r['judul'][:58]} | {r.get('jenis')} | {'★' if r.get('inti') else '-'} | {','.join(r.get('lab') or []) or '-'} | ada={r.get('ada')}" + (f" | CATATAN: {'; '.join(masalah)}" if masalah else ""))
        if masalah:
            salah += 1
    print("halaman bercatatan:", salah, "| judul registry yang berbeda dari naskah dicetak apa adanya untuk dibaca (mis. ADR 6 revisi)")
    return 1 if salah else 0


def blok(teks):
    return re.findall(r'<Blok nama="([^"]+)"([^>]*)>(.*?)</Blok>', teks, flags=re.S)


def coba(n):
    reg, _ = registry(n)
    for no in sorted(reg, key=urut):
        t = berkas(reg[no]).read_text(encoding="utf-8")
        b = blok(t)
        c = [x for x in b if re.search(r"coba|lihat sendiri|ubah", x[0], re.I)]
        komp = sorted({k for x in c for k in re.findall(r"<([A-Z][A-Za-z0-9]+)", x[2])})
        tebak = any(re.search(r"tebak", x[2], re.I) for x in c)
        ubah = any(re.search(r"ubah", x[2], re.I) for x in c)
        print(f"{no} | {reg[no]['judul'][:40]} | {reg[no].get('jenis')} | blok Coba: {len(c)} | komponen: {','.join(komp) or '-'} | 'tebak' di teks: {tebak} | 'ubah' di teks: {ubah}")
    print("Teks saja tidak membuktikan W5: baca data widget (predict, toggles, varian) dan komponen React untuk tebakan dan kontrol ubah.")
    return 0


def bocor(n):
    """Angka di jawaban `predict` widget runsql dan alur yang juga tertulis di teks halaman sebelum blok Coba."""
    reg, _ = registry(n)
    dist = AKAR / "situs" / "dist"
    ditemukan = 0
    for no in sorted(reg, key=urut):
        t = berkas(reg[no]).read_text(encoding="utf-8")
        m = re.search(r'<WidgetLama nama="(?:alur|runsql)" src="([^"]+)"', t)
        if not m:
            continue
        data = json.load(open(AKAR / "situs" / "public" / "widgets" / m.group(1), encoding="utf-8"))
        p = data.get("predict") or {}
        opsi, jawab = p.get("options") or [], p.get("answer")
        teks_jawab = opsi[jawab] if isinstance(jawab, int) and 0 <= jawab < len(opsi) else str(jawab)
        angka = sorted(set(re.findall(r"Rp[\d.]+|\d[\d.]{2,}", teks_jawab)))
        html = (dist / reg[no]["path"].replace(".md", "").strip("/") / "index.html").read_text(encoding="utf-8")
        cut = re.search(r'id="blok-coba[^"]*"', html)
        sebelum = re.sub(r"<[^>]+>", " ", html[: cut.start()]) if cut else ""
        ada = [a for a in angka if a in sebelum]
        ditemukan += 1 if ada else 0
        print(f"{no} | {reg[no]['judul'][:40]} | jawaban {teks_jawab[:60]!r} | angka jawaban: {angka} | tertulis sebelum blok Coba: {ada}")
    print(f"halaman dengan angka jawaban di teks sebelum blok Coba: {ditemukan} (halaman masalah menampilkan hasil di blok sebelum Coba menurut rancangannya)")
    return 0


def adr(n):
    reg, _ = registry(n)
    salah = 0
    for no in sorted(reg, key=urut):
        t = berkas(reg[no]).read_text(encoding="utf-8")
        m = re.search(r"^### ADR \d+.*$", t, flags=re.M)
        if not m and reg[no].get("jenis") != "adr":
            continue
        sub = t[m.start():] if m else t
        e = re.search(r"^### (Sengaja belum|Cek diri)", sub, flags=re.M)
        sub = sub[: e.start()] if e else sub
        opsi = 0
        for ln in sub.split("\n"):
            kol = [c.strip() for c in ln.strip().strip("|").split("|")]
            huruf = [c for c in kol if re.match(r"^[A-F]\. ", c)]
            if ln.startswith("|") and len(huruf) >= 3:
                opsi = len(huruf)
                break
        pm = re.search(r"Pre-mortem", sub) is not None
        ks = re.search(r"Kapan keputusan ini salah", sub) is not None
        url = len(set(re.findall(r"https?://[^\s)>\"]+", t)))
        ok = opsi >= 3 and pm and ks and url > 0
        salah += 0 if ok else 1
        print(f"{no} | {reg[no]['judul'][:48]} | opsi {opsi} | pre-mortem {pm} | kapan salah {ks} | tautan sumber di halaman {url} | {'ok' if ok else 'KURANG'}")
    return 1 if salah else 0


def rantai(n):
    reg, d = registry(n)
    pertama = reg[f"{n}.1"]
    terakhir = reg[max(reg, key=urut)]
    por = {"/" + x["path"].replace(".md", "").replace(".mdx", "") + "/": x for x in d["halaman"] if x.get("path")}
    by = {x["id"]: x for x in d["halaman"]}
    dist = AKAR / "situs" / "dist"
    sini = "/" + pertama["path"].replace(".md", "") + "/"
    # Urutan yang harus dilalui: halaman bernomor tahap ini menurut nomor. Halaman lama tanpa nomor tidak boleh ada di tengah,
    # dan Berikutnya tidak boleh melompati, menukar, atau berhenti sebelum halaman terakhir (EVAL2-F1, keputusan 1164).
    harap = ["/" + reg[no]["path"].replace(".mdx", "").replace(".md", "") + "/" for no in sorted(reg, key=urut)]
    dilihat, masalah, sampai = [], 0, False
    while sini and sini not in dilihat and len(dilihat) < 120:
        dilihat.append(sini)
        i = len(dilihat) - 1
        if i < len(harap) and sini != harap[i]:
            print(f"{len(dilihat):2d} URUTAN SALAH: langkah ini seharusnya {harap[i]} ({n}.{i + 1}), ditemukan {sini}")
            masalah += 1
            break
        f = dist / sini.strip("/") / "index.html"
        h = por.get(sini, {})
        if not f.exists():
            print(f"{len(dilihat):2d} {h.get('nomor', '-'):>5} {sini} 404 (berkas tidak ada di situs/dist)")
            masalah += 1
            break
        html = f.read_text(encoding="utf-8")
        m = re.search(r'<a href="([^"]+)"[^>]*class="[^"]*bb-lanjut__next[^"]*"', html) or re.search(r'<a [^>]*class="[^"]*bb-lanjut__next[^"]*"[^>]*href="([^"]+)"', html)
        nxt = m.group(1) if m else None
        print(f"{len(dilihat):2d} {h.get('nomor', '-'):>5} {sini} 200 | Berikutnya -> {nxt or 'TIDAK ADA'}")
        if not nxt:
            masalah += 1
            break
        # Halaman berblok punya tautan kedua ke halaman berikutnya di akhir blok terakhir (`data-akhir`, Blok.astro); keduanya
        # dihitung `tetangga()` yang sama, jadi harus sama. Halaman lama tanpa Blok tidak punya tautan itu.
        akhir = re.search(r'<a\b[^>]*\bdata-akhir\b[^>]*>', html)
        akhir = re.search(r'href="([^"]+)"', akhir.group(0)) if akhir else None
        if akhir and akhir.group(1) != nxt:
            print(f"   TAUTAN AKHIR BLOK BEDA: {akhir.group(1)} (tombol Berikutnya: {nxt})")
            masalah += 1
        if h.get("id") == terakhir["id"]:
            tujuan = por.get(nxt, {})
            ada = (dist / nxt.strip("/") / "index.html").exists()
            # "Halaman lama" = sudah punya pengganti yang ada (lebur_ke atau diganti_oleh ke halaman `ada`); halaman lama yang
            # penggantinya masih "segera" (mis. T3 selama 3.1 belum ditulis) boleh di urutan baca (EVAL2-F1, keputusan 1150).
            lama = any(by.get(tujuan.get(k), {}).get("ada") for k in ("lebur_ke", "diganti_oleh"))
            print(f"   sesudah halaman terakhir: {nxt} ada={ada} id={tujuan.get('id')} judul={tujuan.get('judul')!r} halaman lama (penggantinya ada)={lama}")
            if not ada or lama:
                masalah += 1
            sampai = True
            break
        sini = nxt
    if not sampai and not masalah:
        print(f"   rantai berhenti atau berputar sebelum halaman terakhir {terakhir['nomor']}")
        masalah += 1
    print(f"langkah dari {n}.1 sampai {terakhir['nomor']}: {len(dilihat)}; 404 atau tautan hilang: {masalah}")
    return 1 if masalah else 0


PERINTAH = {"peta": peta, "coba": coba, "bocor": bocor, "adr": adr, "rantai": rantai}

if __name__ == "__main__":
    if len(sys.argv) != 3 or sys.argv[1] not in PERINTAH or not sys.argv[2].isdigit():
        print(__doc__)
        sys.exit(2)
    sys.exit(PERINTAH[sys.argv[1]](int(sys.argv[2])))
