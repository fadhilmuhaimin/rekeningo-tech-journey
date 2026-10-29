"""Audit bahasa: cari terjemahan literal dan metafora berlapis di halaman situs (situs/src/content/docs).

Pakai:
    python tools/audit_bahasa.py                 # ringkasan per pola (semua halaman)
    python tools/audit_bahasa.py --md            # laporan Markdown lengkap (file:baris + usulan)
    python tools/audit_bahasa.py --check [PATH...]

--check (Definition of Done):
    - pola TINGGI = ERROR, kecuali di dalam kode (blok ``` dan `inline code`),
      karena nama di kode boleh apa saja.
    - pola SEDANG/RENDAH (mis. "mahal") = PERINGATAN.
    - kalimat > 25 kata dan paragraf > 4 kalimat = PERINGATAN.
    - nama merek nyata (bank, e-wallet, ride-hailing, payment gateway) = ERROR.
      Dicek juga di data widget (situs/lama/widgets/data/*.json) dan ilustrasi (situs/lama/assets/cerita/*.svg).
    - tabel "Di stack lain" dengan beberapa stack di satu sel = ERROR, kecuali di halaman
      konseptual Bagian A (a-gambaran/). Halaman konsep lain: satu stack per baris atau tab.
    - tanpa PATH: semua halaman situs (.md dan .mdx). Baris import, komentar JSX, dan tag komponen bukan prosa.
    Exit 1 bila ada ERROR.
"""
import re, sys, pathlib, collections

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCES = [ROOT / "situs/src/content/docs"]
HALAMAN = (".md", ".mdx")

# Folder yang dikecualikan dari aturan nama merek dan pola TINGGI (saat ini tidak ada).
KECUALI = ()
# Halaman konseptual: boleh merangkum beberapa stack dalam satu baris tabel "Di stack lain".
A_DIRS = ("situs/src/content/docs/a-gambaran/",)
# Selain Markdown, teks yang tampil ke pembaca juga ada di data widget dan ilustrasi.
EXTRA_GLOBS = ("situs/data/*.json", "situs/data/halaman-istilah/*.json", "situs/lama/widgets/data/**/*.json", "situs/lama/assets/cerita/*.svg")
# Tidak ada konten lama yang dikecualikan.
OLD = ()

MAX_WORDS = 25
MAX_SENTENCES = 4

# (kunci, regex, tingkat, usulan)
RULES = [
    # Terjemahan literal
    ("utang", r"\bh?utang\b", "TINGGI", "Pakai 'technical debt'."),
    ("murah", r"\bmurah\b", "TINGGI", "Pakai 'ringan' / 'overhead-nya kecil' + bandingkan dengan apa, dengan angka bersumber."),
    ("mahal", r"\bmahal\b", "SEDANG", "Sebut biayanya: 'lambat', 'butuh banyak memori', 'berisiko tinggi', 'sulit di-rollback'."),
    ("pegangan", r"\bpegangan(nya)?\b", "TINGGI", "Pakai 'rule of thumb' atau 'aturan praktis'."),
    ("basi", r"\bbasi\b", "SEDANG", "Pakai 'stale' (dijelaskan sekali: data yang sudah tidak terbaru)."),
    ("jebakan", r"\bjebakan\b", "RENDAH", "Pakai 'kesalahan umum' atau 'pitfall'. Header bagian 'Jebakan' dihapus di template baru."),
    ("bocor", r"\bbocor\w*", "RENDAH", "OK untuk data/secret ('bocor' lazim). Untuk goroutine pakai 'goroutine leak'."),
    ("ditelan/menelan", r"\b(ditelan|menelan)\b", "SEDANG", "Pakai 'error di-swallow' / 'error diabaikan tanpa dicatat'."),
    ("jaring pengaman", r"jaring pengaman", "SEDANG", "Sebut mekanismenya: 'fallback', 'rollback otomatis', 'test regresi'."),
    ("antrean/antrian (queue)", r"\bantr[ei]an\b", "RENDAH", "Untuk message queue pakai 'queue'. Untuk orang menunggu lock: 'menunggu lock'."),
    ("untung/rugi (pros/cons)", r"\|\s*(untung|rugi|keuntungan|kerugian)\s*(?=\|)|\b(untung|rugi|keuntungan|kerugian)\s*:|untung[- ]rugi|untung dan rugi|keuntungan dan kerugian",
     "TINGGI", "Untuk pros/cons pakai 'Kelebihan / Kekurangan'. 'Rugi Rp70.000' (kerugian uang) tidak terkena pola ini."),
    ("pemakai/pengguna (user)", r"\bpemakai\b|\bpengguna(nya)?\b", "TINGGI", "Pakai 'user' (mis. 'user iseng', 'HP user'). 'Pemakaian' (usage) tidak terkena."),
    ("klien (client)", r"\bklien\w*", "TINGGI", "Pakai 'client' (mis. 'HTTP client', 'client app')."),
    ("berkas (file)", r"\bberkas(?![_-])\w*", "TINGGI", "Pakai 'file'."),   # nama kode berkas_x dan berkas-x (tabel, kolom, mode lab) bukan prosa
    ("kontrak (API)", r"\bkontrak\b", "RENDAH", "'Kontrak API' lazim dipakai; boleh tetap, jelaskan sekali (= bentuk request/response yang disepakati)."),
    ("bawang (lapisan)", r"\bbawang\b", "TINGGI", "Hapus. Pakai 'urutan middleware' + diagram berurutan."),
    ("jabat tangan", r"jabat tangan", "TINGGI", "Pakai 'handshake' (TCP/TLS)."),
    ("jejak (trace)", r"\bjejak\b", "RENDAH", "Untuk tracing pakai 'trace'. Untuk audit pakai 'audit log'."),
    # Dunia metafora Kantor Pelayanan
    ("warga (request/user)", r"\bwarga\b", "TINGGI", "Pakai 'user' atau 'request' sesuai konteks."),
    ("satpam (auth middleware)", r"satpam", "TINGGI", "Pakai 'auth middleware'."),
    ("loket (handler)", r"loket", "TINGGI", "Pakai 'handler' / 'endpoint'."),
    ("petugas (usecase/goroutine)", r"petugas", "TINGGI", "Pakai 'usecase/service' atau 'goroutine/worker' sesuai konteks."),
    ("petugas arsip (repository)", r"petugas arsip", "TINGGI", "Pakai 'repository'."),
    ("gudang (database)", r"gudang", "TINGGI", "Pakai 'database' / 'tabel'."),
    ("lemari (row)", r"lemari", "TINGGI", "Pakai 'baris (row)'."),
    ("kunci lemari / gembok (lock)", r"kunci lemari|gembok", "TINGGI", "Pakai 'row lock' / 'table lock'."),
    ("stempel (transaction)", r"stempel", "TINGGI", "Pakai 'transaction' / 'commit'."),
    ("amplop (T, error)", r"amplop", "TINGGI", "Pakai 'nilai kembali (T, error)'."),
    ("segel / resep rahasia (JWT)", r"segel|resep rahasia|resep\b", "TINGGI", "Pakai 'signature' dan 'secret key'."),
    ("kurir (worker/queue)", r"kurir", "TINGGI", "Pakai 'worker' / 'consumer'."),
    ("buku tamu (log)", r"buku tamu", "TINGGI", "Pakai 'log'."),
    ("CCTV (tracing)", r"\bcctv\b", "TINGGI", "Pakai 'tracing'."),
    ("karcis (request ID)", r"karcis", "TINGGI", "Pakai 'request ID'."),
    ("kantor (backend/service)", r"\bkantor\b", "TINGGI", "Pakai 'backend' / 'service' / 'environment'."),
    ("buku register (migration)", r"buku register", "TINGGI", "Pakai 'riwayat migration' / tabel 'schema_migrations'."),
    ("surat balasan (response)", r"surat balasan|surat tugas", "TINGGI", "Pakai 'response JSON' / 'context'."),
    ("formulir (struct/payload)", r"formulir", "SEDANG", "Pakai 'struct' / 'payload' / 'DTO'."),
    ("papan petunjuk (router)", r"papan petunjuk|papan pengumuman", "TINGGI", "Pakai 'router'."),
    ("rak (kolom)", r"\brak\b", "TINGGI", "Pakai 'kolom' / 'constraint'."),
    ("slip permintaan (query param)", r"\bslip\b", "TINGGI", "Pakai 'parameterized query'."),
    ("telepon (API eksternal)", r"telepon|menelepon", "SEDANG", "Pakai 'memanggil API eksternal'."),
    ("deskripsi jabatan (interface)", r"deskripsi jabatan", "TINGGI", "Pakai 'interface'."),
    ("pembantu (goroutine)", r"\bpembantu\b", "TINGGI", "Pakai 'goroutine'."),
    # Kalimat pembuka kosong
    ("pembuka kosong", r"penting untuk dipahami|perlu diingat|perlu dicatat|patut dicatat|tidak bisa dipungkiri|mari kita", "SEDANG", "Hapus; langsung ke isi."),
]

# Nama merek nyata: dicek peka huruf besar, supaya kata biasa ("dana", "mandiri", "grab") tidak ikut.
BRANDS = re.compile(
    r"\b(BCA|BRI|BNI|BSI|CIMB|GoPay|OVO|DANA|ShopeePay|LinkAja|Gojek|GoFood|GrabFood|Grab|Tokopedia|Shopee|"
    r"Bukalapak|Midtrans|Xendit|DOKU|Flip|SeaBank|Jenius|Bank Jago|Permata)\b|(?<!Belajar )\bMandiri\b")
BRAND_FIX = "Pakai nama netral: 'bank', 'e-wallet', 'payment gateway', 'layanan pesan antar'."

STACKS = re.compile(r"\b(Go|Node(\.js)?|Express|Laravel|Django|Spring|Supabase|Firebase|Rails|NestJS)\b")


def stack_table_errors(f, rel):
    """Baris tabel di bagian 'Di stack lain' yang sel pertamanya memuat >= 2 stack."""
    out, inside = [], False
    for i, line in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
        if line.startswith("## "):
            inside = line.strip().lower() == "## di stack lain"
            continue
        if inside and line.startswith("|") and not re.match(r"^\|[\s:|-]+\|?$", line):
            first = line.strip("|").split("|")[0]
            names = {m.group(1) for m in STACKS.finditer(first)}
            if len(names) >= 2:
                out.append((rel, i, f"[stack digabung] {', '.join(sorted(names))} dalam satu sel. Di luar Bagian A, satu stack per baris atau tab."))
    return out


def prose_lines(text, is_md=True):
    """Hasilkan (nomor_baris, teks) di luar blok kode, dengan inline code dihapus.
    Di MDX, baris import dan komentar JSX ({/* ... */}) bukan teks yang dibaca pembaca."""
    fence = False
    for i, line in enumerate(text.splitlines(), 1):
        stripped = line.strip()
        if is_md and re.match(r"^(```|~~~)", stripped):
            fence = not fence
            continue
        if fence:
            continue
        if is_md and (stripped.startswith("import ") or stripped.startswith("{/*")):
            continue
        yield i, re.sub(r"`[^`]*`", "", line)


def scan(files=None, skip_code=False):
    hits = collections.defaultdict(list)
    if files is None:
        files = [f for base in SOURCES for f in sorted(base.rglob("*"))
                 if f.suffix in HALAMAN and "__pycache__" not in f.parts]
    for f in files:
        rel = f.relative_to(ROOT)
        text = f.read_text(encoding="utf-8")
        lines = prose_lines(text, f.suffix in HALAMAN) if skip_code else enumerate(text.splitlines(), 1)
        for i, line in lines:
            for key, rx, lvl, fix in RULES:
                if re.search(rx, line, re.I):
                    hits[key].append((str(rel), i, line.strip()))
    return hits


# Akhir kalimat boleh diikuti penutup teks tebal/miring ("?**"), lalu spasi.
SENT_SPLIT = re.compile(r"(?<=[.!?])(?:\*\*|\*|_)?\s+(?=[A-Z0-9\"(\[*_`])")


def style_warnings(f):
    """Kalimat terlalu panjang dan paragraf terlalu padat (prosa saja)."""
    rel = f.relative_to(ROOT)
    out, para, para_start = [], [], 0
    def flush():
        if para:
            sents = [s for s in SENT_SPLIT.split(" ".join(para)) if len(s.split()) > 2]
            if len(sents) > MAX_SENTENCES:
                out.append((str(rel), para_start, f"paragraf {len(sents)} kalimat (maks {MAX_SENTENCES})"))
    for i, line in prose_lines(f.read_text(encoding="utf-8")):
        s = line.strip()
        prose = s and not s.startswith(("|", "#", "<", "!!!", "???", "===", "{:", "-->", ">", "---", "*[", "[!", "--8<--")) \
            and not re.match(r"^([-*+]|\d+\.)\s", s) and not line.startswith("    ")
        if prose:
            if not para:
                para_start = i
            para.append(s)
        else:
            flush(); para = []
        body = re.sub(r"^([-*+]|\d+\.)\s+", "", s)
        body = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", body)  # link -> teksnya
        if s.startswith(("|", "#", "<", "{:", "*[", "--8<--")):
            continue
        for sent in SENT_SPLIT.split(body):
            n = len(sent.split())
            if n > MAX_WORDS:
                out.append((str(rel), i, f"kalimat {n} kata: {sent[:90]}..."))
    flush()
    return out


def check(paths):
    meta = {k: lvl for k, _, lvl, _ in RULES}
    if paths:
        files = []
        for p in paths:
            p = (ROOT / p).resolve() if not pathlib.Path(p).is_absolute() else pathlib.Path(p)
            files += sorted(f for ext in ("*.md", "*.mdx", "*.json", "*.svg") for f in p.rglob(ext)) if p.is_dir() else [p]
    else:
        files = [f for base in SOURCES for f in sorted(base.rglob("*")) if f.suffix in HALAMAN
                 and not str(f.relative_to(ROOT)).startswith(OLD)]
        files += sorted(f for g in EXTRA_GLOBS for f in ROOT.glob(g))
    md_files = [f for f in files if f.suffix in HALAMAN]
    hits = scan(md_files, skip_code=True)
    # JSON dan SVG: teksnya tampil ke pembaca, jadi pola bahasa ikut dicek (tanpa aturan gaya kalimat).
    for k, v in scan([f for f in files if f.suffix not in HALAMAN]).items():
        hits[k] += v
    errors, warns = [], []
    for f in files:
        rel = str(f.relative_to(ROOT))
        if rel.startswith(KECUALI):
            continue
        for i, line in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
            for m in BRANDS.finditer(line):
                errors.append(f"ERROR   {rel}:{i}  [merek nyata: {m.group(0)}] {BRAND_FIX}")
        if f.suffix in HALAMAN and not rel.startswith(A_DIRS):
            errors += [f"ERROR   {p}:{ln}  {msg}" for p, ln, msg in stack_table_errors(f, rel)]
    for k, v in hits.items():
        for path, ln, text in v:
            in_g1 = path.startswith(KECUALI)
            if meta[k] == "TINGGI" and not in_g1:
                errors.append(f"ERROR   {path}:{ln}  [{k}] {text[:100]}")
            elif meta[k] != "TINGGI":
                warns.append(f"WARNING {path}:{ln}  [{k}] {text[:100]}")
    for f in md_files:
        warns += [f"WARNING {p}:{ln}  {msg}" for p, ln, msg in style_warnings(f)]
    for line in sorted(errors) + sorted(warns):
        print(line)
    print(f"\n{len(files)} file · {len(errors)} error · {len(warns)} peringatan")
    return 1 if errors else 0


def main():
    meta = {k: (lvl, fix) for k, _, lvl, fix in RULES}
    if "--check" in sys.argv:
        args = [a for a in sys.argv[1:] if a != "--check"]
        sys.exit(check(args))
    hits = scan()
    if "--md" in sys.argv:
        order = {"TINGGI": 0, "SEDANG": 1, "RENDAH": 2}
        print("# Audit bahasa (dibuat otomatis oleh tools/audit_bahasa.py)\n")
        print("Sumber: halaman situs, data widget, dan ilustrasi cerita.\n")
        print("| Pola | Tingkat | Jumlah | Usulan |\n|---|---|---|---|")
        for k in sorted(hits, key=lambda k: (order[meta[k][0]], -len(hits[k]))):
            print(f"| {k} | {meta[k][0]} | {len(hits[k])} | {meta[k][1]} |")
        for k in sorted(hits, key=lambda k: (order[meta[k][0]], -len(hits[k]))):
            print(f"\n## {k} · {meta[k][0]} · {len(hits[k])}\n\nUsulan: {meta[k][1]}\n")
            for path, ln, text in hits[k]:
                t = text.replace("|", "\\|")
                t = t if len(t) <= 140 else t[:137] + "..."
                print(f"- `{path}:{ln}` {t}")
        return
    for k in sorted(hits, key=lambda k: -len(hits[k])):
        print(f"{len(hits[k]):5d}  {meta[k][0]:7s} {k}")


if __name__ == "__main__":
    main()
