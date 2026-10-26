"""Uji tools/cek_id_tampil.py: ID internal yang tampil harus menggagalkan, bukan lolos palsu (keputusan 1170, 1180).

Insiden: alat hanya mengenal ID halaman `[A-G]\\d`, jadi ID riset (R2-04, R2-06, R3-32) tampil di halaman istilah backfill,
di 2.17 (tabel Bukti), dan di rekaman lab 3.8 sementara gerbang LOLOS. Kasus riset di sini memakai tiga bentuk itu
(halaman istilah, sel tabel, baris kode) dan tiap tempat lain yang dibaca atau dibacakan pembaca: tooltip (title),
aria-label, alt, teks SVG, props island, script application/json, data widget, istilah-data.js, dan judul tab.
Nomor keputusan dan nomor PR (keputusan 1180) bocor dengan cara yang sama: "keputusan 415" di prosa 2.19 dan 2.14,
"(keputusan 430)" di kepala rekaman lab yang tampil lewat Snippet, "(tinjauan PR 340)" di komentar kode lab. Kasusnya
memakai bentuk itu di prosa, kode, tooltip, SVG, props, JSON, data widget, dan istilah-data.js.
Kasus lolos menjaga sebaliknya: komentar, script, style, atribut data-*, class, id, href, kunci internal data, kode
aturan gosec, dan pola yang mirip tetapi bukan ID riset tidak dianggap bocor.

Kasus pertama memeriksa situs/dist sungguhan; kasus sisanya memakai salinan kecil dari lima berkas dist (cepat, dan
dasarnya terbukti bersih lebih dulu). situs/dist tidak diubah.

    bun run --cwd situs build && python3 tools/test_cek_id_tampil.py
"""
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

AKAR = pathlib.Path(__file__).resolve().parent.parent
DIST = AKAR / "situs" / "dist"
ALAT = AKAR / "tools" / "cek_id_tampil.py"
# Berkas dist yang disalin ke situs mini: alat butuh index.html, widgets/data, dan javascripts/istilah-data.js.
MINI = ["index.html", "cerita/index.html", "istilah/backfill/index.html", "widgets/data/kartu.json", "javascripts/istilah-data.js"]
HOST = "cerita/index.html"


def ganti(berkas, cari, baru):
    def f(teks):
        assert cari in teks, f"'{cari}' tidak ada di {berkas}"
        return teks.replace(cari, baru, 1)
    return (berkas, f)


def sisip(html, berkas=HOST):
    return ganti(berkas, "</body>", html + "</body>")


def tambah_json(berkas, nilai):
    def f(teks):
        data = json.loads(teks)
        data.append(nilai)
        return json.dumps(data, ensure_ascii=False)
    return (berkas, f)


GAGAL_1 = "GAGAL: 1 ID internal tampil ke pembaca."
KASUS = [
    # nama, perubahan: (berkas, fungsi teks -> teks) | None, exit yang diharapkan, teks wajib di keluaran
    ("situs mini apa adanya", None, 0, ["tidak tampil"]),
    ("ID riset di paragraf", sisip("<p>Versi pgx (R2-04) terbaru.</p>"), 1, ["cerita/index.html: 'R2-04' di", GAGAL_1]),
    ("ID riset tiga digit", sisip("<p>Lihat R3-120 di naskah.</p>"), 1, ["'R3-120' di"]),
    ("ID riset satu digit nomor", sisip("<p>Lihat R3-7 di naskah.</p>"), 1, ["'R3-7' di"]),
    ("ID riset di sel tabel (2.17 sebelum perbaikan)", sisip("<table><tr><td>penghitung versi per buku (R2-06), tetapi</td></tr></table>"),
     1, ["'R2-06' di"]),
    ("ID riset di baris kode (3.8 sebelum perbaikan)",
     sisip('<pre><code><span class="line"><span>(batas lab 17,4 × 50 ms; hitungan naskah R3-32 dengan 20 ms: 0,35): ya</span></span></code></pre>'),
     1, ["'R3-32' di", "hitungan naskah R3-32 dengan 20 ms"]),
    ("ID riset di versi halaman istilah (backfill sebelum perbaikan)",
     sisip('<p><span class="hal-istilah__versi" translate="no">pgx v5.11.0 (R2-04)</span></p>', "istilah/backfill/index.html"),
     1, ["istilah/backfill/index.html: 'R2-04' di", "pgx v5.11.0 (R2-04)"]),
    ("ID riset di judul tab", ganti(HOST, "<title>", "<title>R2-04 "), 1, ["'R2-04' di"]),
    ("ID riset terpecah di dua node bersebelahan (seperti B + 147)", sisip("<span>R</span><span>2-04</span>"), 1, ["'R2-04' di"]),
    ("ID riset di tooltip title", sisip('<abbr title="pgx v5.11.0 (R2-04)">pgx</abbr>'), 1, ["(atribut title pada <abbr>)", "'R2-04' di"]),
    ("ID riset di aria-label", sisip('<div aria-label="Tabel bukti (R3-32)">x</div>'), 1, ["(atribut aria-label pada <div>)", "'R3-32' di"]),
    ("ID riset di alt gambar", sisip('<img src="/favicon.svg" alt="diagram R2-04">'), 1, ["(atribut alt pada <img>)", "'R2-04' di"]),
    ("ID riset di teks SVG", sisip("<svg><text>R2-06</text></svg>"), 1, ["'R2-06' di"]),
    ("ID riset di judul SVG", sisip("<svg><title>diagram R2-06</title><g></g></svg>"), 1, ["'R2-06' di"]),
    ("ID riset di props island", sisip('<astro-island props="{&quot;judul&quot;:[0,&quot;lihat R2-06&quot;]}"></astro-island>'),
     1, ["(data JSON inline)", "'R2-06' di"]),
    ("ID riset di script application/json", sisip('<script type="application/json" data-blok-halaman>{"/x/": {"judul": "R3-32"}}</script>'),
     1, ["(data JSON inline)", "'R3-32' di"]),
    ("JSON inline yang rusak tidak lolos diam-diam", sisip('<script type="application/json">{"judul": </script>'),
     1, ["script application/json bukan JSON"]),
    ("ID riset di data widget", tambah_json("widgets/data/kartu.json", "dua rilis (R2-04)"), 1, ["widgets/data/kartu.json: 'R2-04' di"]),
    ("ID riset di istilah-data.js", ganti("javascripts/istilah-data.js", '"t": "ACID"', '"t": "ACID (R2-04)"'), 1, ["javascripts/istilah-data.js: 'R2-04' di"]),
    ("ID riset sesudah tanda kutip bergaris miring di istilah-data.js",
     ganti("javascripts/istilah-data.js", '"t": "ACID"', '"t": "ACID \\"x\\" lalu R2-04"'), 1, ["javascripts/istilah-data.js: 'R2-04' di"]),
    ("ID halaman lama tetap terdeteksi di teks", sisip("<p>Lihat B3.2 untuk jawabannya.</p>"), 1, ["'B3.2' di", GAGAL_1]),
    ("ID halaman lama tetap terdeteksi di tooltip", sisip('<abbr title="lihat C2">x</abbr>'), 1, ["(atribut title pada <abbr>)", "'C2' di"]),
    ("dua ID di satu halaman dihitung dua", sisip("<p>R2-04 dan R2-06</p>"), 1, ["GAGAL: 2 ID internal tampil"]),
    ("ID riset di komentar, script, style, atribut data-*, class, id, dan href tidak tampil",
     sisip('<!-- R2-04 --><script>var x = "R2-04";</script><style>/* R2-06 */</style>'
           '<div data-riset="R2-04" class="R2-04" id="R2-06"><a href="/R3-32/">x</a></div><svg><desc></desc><path d="M0 0"></path></svg>'),
     0, ["tidak tampil"]),
    ("kunci internal di JSON inline tidak tampil", sisip('<script type="application/json">{"id": "R2-04", "halaman": "R3-32"}</script>'),
     0, ["tidak tampil"]),
    ("kunci internal di data widget tidak tampil", tambah_json("widgets/data/kartu.json", {"id": "R2-04", "halaman": "B3.2"}), 0, ["tidak tampil"]),
    ("kode aturan gosec bukan ID halaman", sisip("<p>Aturan G101 dan G104.</p>"), 0, ["tidak tampil"]),
    ("pola mirip yang bukan ID riset", sisip("<p>R2-D2, R10-2, XR2-04, R2-1000, R2-04x, r2-04, dan R2.04.</p>"), 0, ["tidak tampil"]),

    # --- nomor keputusan dan nomor PR (keputusan 1180) ---
    ("nomor keputusan di prosa (2.19 dan 2.14 sebelum perbaikan)", sisip("<p>sudah memakainya (keputusan 415, <code>riwayat.txt</code>).</p>"),
     1, ["'keputusan 415' di", GAGAL_1]),
    ("nomor keputusan huruf besar", sisip("<p>(lihat KEPUTUSAN 415).</p>"), 1, ["'KEPUTUSAN 415' di"]),
    ("nomor keputusan huruf awal besar", sisip("<p>Keputusan 514 menetapkan masa simpan.</p>"), 1, ["'Keputusan 514' di"]),
    ("nomor keputusan dengan tanda pagar", sisip("<p>keputusan #415 menetapkan</p>"), 1, ["'keputusan #415' di"]),
    ("nomor keputusan dengan kata nomor", sisip("<p>keputusan nomor 415 menetapkan</p>"), 1, ["'keputusan nomor 415' di"]),
    ("nomor keputusan empat digit", sisip("<p>(keputusan 1067)</p>"), 1, ["'keputusan 1067' di"]),
    ("nomor keputusan dua digit", sisip("<p>(keputusan 94)</p>"), 1, ["'keputusan 94' di"]),
    ("rentang keputusan terdeteksi dari nomor pertamanya", sisip("<p>keputusan 401\u2013403</p>"), 1, ["'keputusan 401' di"]),
    ("nomor keputusan terpisah pindah baris di prosa", sisip("<p>lihat keputusan\n415 untuk alasannya</p>"), 1, ["'keputusan 415' di"]),
    ("nomor keputusan di baris kode (kepala rekaman lab)",
     sisip('<pre><code><span class="line"><span>-- Rekaman dari database bersih: make -C labs/b3-race run-ledger (keputusan 430).</span></span></code></pre>'),
     1, ["'keputusan 430' di", "run-ledger (keputusan 430)"]),
    ("nomor keputusan terpisah antar elemen kode (seperti keluaran Shiki)",
     sisip('<pre><code><span class="line"><span>// (</span><span>keputusan</span><span> 659)</span></span></code></pre>'), 1, ["'keputusan 659' di"]),
    ("nomor keputusan di judul tab", ganti(HOST, "<title>", "<title>keputusan 415 "), 1, ["'keputusan 415' di"]),
    ("nomor keputusan di tooltip title", sisip('<abbr title="dipilih di keputusan 415">x</abbr>'), 1, ["(atribut title pada <abbr>)", "'keputusan 415' di"]),
    ("nomor keputusan di aria-label", sisip('<div aria-label="Tabel (keputusan 415)">x</div>'), 1, ["(atribut aria-label pada <div>)"]),
    ("nomor keputusan di teks SVG", sisip("<svg><text>keputusan 415</text></svg>"), 1, ["'keputusan 415' di"]),
    ("nomor keputusan di props island", sisip('<astro-island props="{&quot;catatan&quot;:[0,&quot;lihat keputusan 415&quot;]}"></astro-island>'),
     1, ["(data JSON inline)", "'keputusan 415' di"]),
    ("nomor keputusan di script application/json", sisip('<script type="application/json">{"catatan": "keputusan 415"}</script>'),
     1, ["(data JSON inline)"]),
    ("nomor keputusan di data widget (skenario t2-idempotency sebelum perbaikan)",
     tambah_json("widgets/data/kartu.json", "Key dipotong 8 karakter di rekaman karena gitleaks (keputusan 518)."), 1, ["widgets/data/kartu.json: 'keputusan 518' di"]),
    ("nomor keputusan di istilah-data.js", ganti("javascripts/istilah-data.js", '"t": "ACID"', '"t": "ACID (keputusan 415)"'), 1, ["javascripts/istilah-data.js: 'keputusan 415' di"]),
    ("nomor PR di prosa", sisip("<p>Mutasi yang dicoba peninjau PR 340 lolos.</p>"), 1, ["'PR 340' di", GAGAL_1]),
    ("nomor PR dengan tanda pagar", sisip("<p>ditambah peninjau PR #349.</p>"), 1, ["'PR #349' di"]),
    ("nomor PR di komentar kode (outbox.go sebelum penyaring)",
     sisip('<pre><code><span class="line"><span>// (mutasi tinjauan PR 340). SKIP LOCKED membuat worker lain melewati baris</span></span></code></pre>'),
     1, ["'PR 340' di"]),
    ("pull request bernomor", sisip("<p>Lihat pull request #340 di repo.</p>"), 1, ["'pull request #340' di"]),
    ("nomor PR gaya merge GitHub", sisip("<p>diperbaiki (#346) minggu lalu</p>"), 1, ["'(#346)' di"]),
    ("nomor PR di tooltip title", sisip('<a title="tinjauan PR 294" href="/x/">x</a>'), 1, ["(atribut title pada <a>)", "'PR 294' di"]),
    ("nomor PR di data widget", tambah_json("widgets/data/kartu.json", "ditemukan peninjau PR 340"), 1, ["widgets/data/kartu.json: 'PR 340' di"]),
    ("nomor keputusan dan nomor PR dihitung masing-masing", sisip("<p>keputusan 415 dan PR 340</p>"), 1, ["GAGAL: 2 ID internal tampil"]),
    ("nomor keputusan di komentar, script, style, data-*, class, id, dan href tidak tampil",
     sisip('<!-- keputusan 415 --><script>var x = "keputusan 415 PR 340";</script><style>/* keputusan 415 */</style>'
           '<div data-asal="keputusan 415" class="keputusan-415" id="pr-340"><a href="/keputusan 415/">x</a></div>'),
     0, ["tidak tampil"]),
    ("kunci internal di JSON inline tidak membawa nomor keputusan",
     sisip('<script type="application/json">{"id": "keputusan 415", "halaman": "PR 340"}</script>'), 0, ["tidak tampil"]),
    ("Keputusan 3 di ADR menunjuk keputusan ketiga di ADR itu, bukan nomor KEPUTUSAN.md",
     sisip("<p>Pilihan hash. Keputusan 3 adalah keputusan terpisah dengan opsinya sendiri.</p>"), 0, ["tidak tampil"]),
    ("kata keputusan tanpa nomor dan pola mirip nomor keputusan",
     sisip("<p>Keputusan ini salah bila beban naik. keputusan 12345, keputusan 1, dan keputusan: 415.</p>"), 0, ["tidak tampil"]),
    ("pola mirip nomor PR", sisip("<p>PR cfug/dio#2512, pull request review, tebakan #10 \u2192 instance 2, (#12), PR 5, SPR 340, dan PR-340.</p>"),
     0, ["tidak tampil"]),
]


def jalankan(dist):
    return subprocess.run([sys.executable, str(ALAT), "--dist", str(dist)], capture_output=True, text=True)


if not (DIST / "index.html").is_file():
    print("GAGAL: situs/dist belum dibangun")
    sys.exit(1)

gagal = 0
p = jalankan(DIST)
ok = p.returncode == 0 and "tidak tampil" in p.stdout
gagal += not ok
print(f"{'OK  ' if ok else 'GAGAL'} exit {p.returncode} (harap 0) situs/dist sungguhan bersih dari ID internal"
      + ("" if ok else f"\n{p.stdout[-800:]}"))

with tempfile.TemporaryDirectory() as tmp:
    mini = pathlib.Path(tmp) / "dist"
    for rel in MINI:
        (mini / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(DIST / rel, mini / rel)
    for nama, ubah, harap, wajib in KASUS:
        asli = None
        if ubah:
            target = mini / ubah[0]
            asli = target.read_bytes()
            target.write_text(ubah[1](asli.decode("utf-8")), encoding="utf-8")
        p = jalankan(mini)
        if asli is not None:
            target.write_bytes(asli)
        hilang = [w for w in wajib if w not in p.stdout]
        ok = p.returncode == harap and not hilang
        gagal += not ok
        print(f"{'OK  ' if ok else 'GAGAL'} exit {p.returncode} (harap {harap}) {nama}"
              + (f"; tidak ada di keluaran: {hilang}\n{p.stdout[-600:]}{p.stderr[-300:]}" if not ok else ""))
total = len(KASUS) + 1
print(f"{total - gagal}/{total} kasus uji ID internal lolos")
sys.exit(1 if gagal else 0)
