// Pagar lebar font fallback (G2c, keputusan 368). Fallback bermetrik "Satoshi Fallback" (keputusan 351) hanya berguna
// bila lebarnya sama dengan Satoshi, dan angka size-adjust-nya hanya berlaku bila lebar glyph pecahan: Chromium di Linux
// membulatkan lebar glyph ke piksel utuh (hinting) kecuali `text-rendering: geometricPrecision` (keputusan 361).
// Runner CI bisa berganti OS, font, atau Chromium tanpa ada yang berubah di repo (label ubuntu-latest pindah ke
// Ubuntu 26.04 bertahap 19 Oktober–19 November 2026), jadi alat ini mengukur keduanya di setiap gerbang:
//   1. Korpus beku `ukur-font-korpus.txt` (4.000 huruf prosa 1.27 Authentication per 2026-10-13, satu paragraf per
//      baris, digabung dengan spasi) dalam span nowrap 17 px, Satoshi dan Satoshi Fallback, 400 dan 600: gagal bila
//      selisih fallback terhadap Satoshi lebih dari 0,5 %. Teksnya beku karena rasio dua font bergantung pada teks:
//      prosa 26 halaman di Chromium macOS yang sama memberi rasio 600 dari +0,35 sampai −0,95 % dan 400 dari −0,37
//      sampai +0,43 % (peninjau #232). Dengan teks halaman, PR konten bisa menggagalkan pagar yang pesannya menyalahkan
//      runner. Halaman hanya dibuka untuk memuat CSS (tema.css) dan font; isinya tidak diukur.
//   2. 62 glyph (a–z, A–Z, 0–9) satu span per glyph untuk keenam font (termasuk JetBrains Mono dan fallback mono):
//      gagal bila semua lebarnya bilangan bulat, tanda hinting. Per glyph, bukan lebar prosa: lebar tata letak berkelipatan
//      1/64 px, jadi prosa bisa bulat kebetulan (Satoshi 600 di CI 32.223,00 px walau 59 dari 62 glyph-nya pecahan).
//      Font mono: ke-62 glyph sama lebar, jadi praktis satu sampel (JetBrains Mono 0,6 em × 17 px = 10,2 px; di ukuran
//      yang membuat lebar itu bulat, mis. 15 px = 9 px, cek ini gagal palsu).
// Lebar prosa JetBrains Mono lawan fallback-nya dan sebaran rasio per potongan 1.000 huruf hanya dicetak.
// Font yang benar-benar dipakai dibaca lewat CDP CSS.getPlatformFontsForNode, bukan ditebak dari font-family.
//   node tools/ukur-font.mjs --url http://127.0.0.1:4321 [--path /tahap-1/authentication/] [--uji-mutasi]
// --uji-mutasi: sesudah pengukuran biasa, buktikan tiap pemeriksa bisa gagal; tiap mutasi harus memicu temuan jenis
// yang diharapkan, bukan sembarang temuan: size-adjust kedua aturan Satoshi Fallback ×1,02 dan ×0,98 (aturan asli
// disalin dari stylesheet, ditambahkan sesudahnya) → selisih; /fonts/*.woff2 diblokir → font web tidak termuat;
// `text-rendering: auto` → lebar bulat, hanya di Linux (Chromium macOS dan Windows tidak memakai hinting itu, jadi
// mutasi ini dilewati dan dicetak). Mutasi tanpa temuan yang diharapkan membuat alat gagal.
import { readFileSync } from "node:fs";
import os from "node:os";
import { chromium } from "@playwright/test";
import { denganBatas } from "./lib/batas.mjs";

const arg = (nama, bawaan) => {
  const i = process.argv.indexOf(nama);
  return i > -1 ? process.argv[i + 1] : bawaan;
};
const url = arg("--url", "http://127.0.0.1:4321");
const jalur = arg("--path", "/tahap-1/authentication/");
const ujiMutasi = process.argv.includes("--uji-mutasi");
// 0,5 %: di kalibrasi keputusan 351, size-adjust 0,5 poin dari titik terbaik (97,5 dan 98,5 %) menambah blok teks yang
// berubah tinggi dari 123 ke 140–142 (dari 23.131), 1,5 poin (96,5 %) ke 271. Korpus beku: 400 −0,01 % (macOS) dan
// −0,06 % (CI), 600 −0,30 % dan −0,28 %; hinting memberi +1,05 % (400) dan −6,39 % (600), fallback tanpa local() yang
// cocok sekitar +16 % (keputusan 351, 361, 368).
const AMBANG = 0.005;
const UKURAN = 17; // px, teks isi di HP (keputusan 201); angka keputusan 361 juga diukur di 17 px
const HURUF = 4000;
const POTONG = 1000; // huruf per potongan untuk sebaran rasio (info)
const GLYPH = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const KORPUS = new URL("./ukur-font-korpus.txt", import.meta.url);
const prosa = readFileSync(KORPUS, "utf8").split("\n").map((b) => b.trim()).filter(Boolean).join(" ");

// Versi runner untuk pesan: /etc/os-release di Linux, ImageOS/ImageVersion dari image runner GitHub bila ada.
const runner = (() => {
  let nama = `${process.platform} ${os.release()}`;
  try {
    const rilis = readFileSync("/etc/os-release", "utf8").match(/^PRETTY_NAME="?([^"\n]+)"?/m);
    if (rilis) nama = `${rilis[1]} (kernel ${os.release()})`;
  } catch {}
  if (process.env.ImageOS) nama += `, image ${process.env.ImageOS} ${process.env.ImageVersion ?? "?"}`;
  return nama;
})();

const FONT = [
  { id: "s400", nama: "Satoshi 400", family: '"Satoshi"', weight: 400, web: "Satoshi" },
  { id: "f400", nama: "Satoshi Fallback 400", family: '"Satoshi Fallback"', weight: 400 },
  { id: "s600", nama: "Satoshi 600", family: '"Satoshi"', weight: 600, web: "Satoshi" },
  { id: "f600", nama: "Satoshi Fallback 600", family: '"Satoshi Fallback"', weight: 600 },
  // Fallback mono = sisa --sl-font-mono sesudah JetBrains Mono (tema.css).
  { id: "m400", nama: "JetBrains Mono 400", family: '"JetBrains Mono"', weight: 400, web: "JetBrains Mono" },
  { id: "n400", nama: "fallback mono 400", family: "ui-monospace, Menlo, monospace", weight: 400 },
];
const PASANGAN = [["s400", "f400", true], ["s600", "f600", true], ["m400", "n400", false]]; // [web, fallback, dijaga]

// Kedua fungsi dijalankan di halaman (page.evaluate), jadi tidak memakai apa pun dari luar.
function tambahCss(css) { const s = document.createElement("style"); s.textContent = css; document.head.append(s); }
// Aturan salinan ditambahkan sesudah aturan asli dengan deskriptor sama dan menggantikannya (terukur: lebar fallback 400
// naik 1,91 % di CI, 1,97 % di macOS).
function ubahSizeAdjust(kali) {
  const aturan = [];
  for (const ss of document.styleSheets) {
    let daftar; try { daftar = ss.cssRules; } catch { continue; }
    for (const r of daftar) if (r instanceof CSSFontFaceRule && /Satoshi Fallback/.test(r.style.getPropertyValue("font-family"))) aturan.push(r.cssText);
  }
  if (aturan.length < 2) throw new Error(`aturan @font-face Satoshi Fallback ditemukan ${aturan.length}, harus 2`);
  const s = document.createElement("style");
  s.textContent = aturan.map((t) => t.replace(/size-adjust:\s*([\d.]+)%/, (_, v) => `size-adjust: ${(Number(v) * kali).toFixed(2)}%`)).join("\n");
  document.head.append(s);
}

// harap: jenis temuan yang wajib muncul. sebelum: dipanggil sebelum halaman dibuka; fn/arg: dijalankan di halaman sesudahnya.
const MUTASI = {
  "size-adjust ×1,02": { harap: "selisih", fn: ubahSizeAdjust, arg: 1.02 },
  "size-adjust ×0,98": { harap: "selisih", fn: ubahSizeAdjust, arg: 0.98 },
  "font web diblokir": { harap: "muat", sebelum: (page) => page.route("**/fonts/*.woff2", (r) => r.abort()) },
  "text-rendering: auto": { harap: "hinting", linuxSaja: true, fn: tambahCss, arg: "html { text-rendering: auto !important; }" },
};

async function ukur(page) {
  return page.evaluate(async ({ FONT, UKURAN, GLYPH, prosa, POTONG }) => {
    // load() menolak bila font gagal dimuat (mis. diblokir); kegagalan itu dinilai dari font platform, bukan di sini.
    for (const w of [400, 600]) await document.fonts.load(`${w} ${UKURAN}px Satoshi`, prosa).catch(() => {});
    await document.fonts.load(`400 ${UKURAN}px "JetBrains Mono"`, prosa).catch(() => {});
    const wadah = document.createElement("div");
    wadah.id = "ukur-font";
    wadah.style.cssText = "position:absolute;left:0;top:0;visibility:hidden;pointer-events:none";
    const span = (f, teks, id) => {
      const s = document.createElement("span");
      if (id) s.id = id;
      // Hanya sifat teks yang ditulis eksplisit; text-rendering tetap diwarisi dari html, karena itulah yang diuji.
      s.style.cssText = `display:inline-block;white-space:nowrap;font-family:${f.family};font-weight:${f.weight};font-style:normal;font-size:${UKURAN}px;letter-spacing:0;word-spacing:0;text-transform:none;font-variant:normal;font-feature-settings:normal`;
      s.textContent = teks;
      wadah.append(s, document.createElement("br"));
      return s;
    };
    const potong = [];
    for (let i = 0; i + POTONG <= prosa.length; i += POTONG) potong.push(prosa.slice(i, i + POTONG));
    const el = {};
    for (const f of FONT) {
      el[f.id] = {
        p: span(f, prosa, `ukur-font-${f.id}`),
        k: potong.map((t) => span(f, t)),
        g: [...GLYPH].map((c) => span(f, c)),
      };
    }
    document.body.append(wadah);
    await document.fonts.ready;
    const lebar = (s) => s.getBoundingClientRect().width;
    const keluar = { tr: getComputedStyle(document.documentElement).textRendering, font: {} };
    for (const f of FONT) {
      const lebarG = el[f.id].g.map(lebar);
      keluar.font[f.id] = {
        prosa: lebar(el[f.id].p),
        potong: el[f.id].k.map(lebar),
        pecahan: lebarG.filter((x) => x !== Math.round(x)).length,
        glyph: lebarG.length,
      };
    }
    return keluar;
  }, { FONT, UKURAN, GLYPH, prosa, POTONG });
}

// Font sistem yang dipakai tiap span prosa (nama keluarga + jumlah glyph), dari CDP.
async function fontPlatform(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument", { depth: 0 });
  const keluar = {};
  for (const f of FONT) {
    const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: `#ukur-font-${f.id}` });
    const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
    keluar[f.id] = fonts.sort((a, b) => b.glyphCount - a.glyphCount);
  }
  await cdp.detach();
  return keluar;
}

const angka = (x) => x.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const persen = (x) => {
  const r = Math.round(x * 10000) / 100; // dibulatkan dulu, supaya −0,004 % tidak tercetak "−0,00 %"
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
};
const namaPlatform = (daftar) => daftar.map((x) => `${x.familyName}${x.isCustomFont ? " (web)" : ""} ${x.glyphCount}`).join(" + ") || "?";
const cari = (id) => FONT.find((f) => f.id === id);

// Satu skenario: halaman baru, mutasi (bila ada), ukur, nilai. Mengembalikan temuan { jenis, teks }.
async function skenario(browser, label, mutasi) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 657 } });
  const temuan = [];
  const catat = (jenis, teks) => temuan.push({ jenis, teks });
  try {
    await denganBatas(async () => {
      if (mutasi?.sebelum) await mutasi.sebelum(page);
      await page.goto(url + jalur, { waitUntil: "networkidle" });
      if (mutasi?.fn) await page.evaluate(mutasi.fn, mutasi.arg);
      const u = await ukur(page);
      const pf = await fontPlatform(page);
      const cetak = (s) => { if (!mutasi) console.log(s); };
      cetak(`font: korpus beku ${prosa.length} huruf ${UKURAN} px (CSS dan font dari ${jalur}), text-rendering ${u.tr}`);
      for (const f of FONT) cetak(`  ${f.nama}: ${namaPlatform(pf[f.id])}`);
      for (const f of FONT) {
        if (f.web && !pf[f.id].some((x) => x.isCustomFont && x.familyName.includes(f.web))) {
          catat("muat", `${f.nama} tidak termuat dari /fonts (dipakai ${namaPlatform(pf[f.id])}); perbandingan tidak sah`);
        }
        const g = u.font[f.id];
        if (g.pecahan === 0) catat("hinting", `${f.nama} (${namaPlatform(pf[f.id])}): ${g.glyph} lebar glyph semuanya bilangan bulat, tanda hinting; keputusan 361 tidak berlaku lagi di runner ini`);
      }
      for (const [a, b, dijaga] of PASANGAN) {
        const wa = u.font[a].prosa, wb = u.font[b].prosa, d = wb / wa - 1;
        const buruk = dijaga && Math.abs(d) > AMBANG;
        const bulat = (w) => (w === Math.round(w) ? " bulat" : "");
        const baris = `${cari(a).nama} ${angka(wa)} px${bulat(wa)} · ${cari(b).nama} ${angka(wb)} px${bulat(wb)} (${namaPlatform(pf[b])}) · selisih ${persen(d)}${dijaga ? "" : " (info)"}`;
        cetak(`${buruk ? "GAGAL" : "ok"} ${baris}`);
        if (buruk) catat("selisih", `lebar ${baris}, di atas ${persen(AMBANG).slice(1)}`);
      }
      const sebaran = PASANGAN.filter(([, , dijaga]) => dijaga).map(([a, b]) => {
        const r = u.font[a].potong.map((wa, i) => u.font[b].potong[i] / wa - 1);
        return `${cari(a).nama.split(" ")[1]} ${persen(Math.min(...r))} … ${persen(Math.max(...r))}`;
      });
      cetak(`  sebaran selisih ${u.font.s400.potong.length} potongan ${POTONG} huruf (info): ${sebaran.join(", ")}`);
      cetak(`  glyph berlebar pecahan: ${FONT.map((f) => `${f.nama.replace("Satoshi Fallback", "Fallback")} ${u.font[f.id].pecahan}/${u.font[f.id].glyph}`).join(", ")}`);
    }, `font ${label} ${jalur}`);
  } finally {
    await page.close();
  }
  return temuan;
}

const browser = await chromium.launch();
const page0 = await browser.newPage();
const ua = await page0.evaluate(() => navigator.userAgent);
await page0.close();
const label = `[runner ${runner}, Chromium ${browser.version()}]`;
console.log(`font: runner ${runner}; Chromium ${browser.version()}; ${ua}`);

let gagal = 0;
if (prosa.length < HURUF) {
  console.log(`GAGAL korpus ${KORPUS.pathname} hanya ${prosa.length} huruf, butuh ≥ ${HURUF}`);
  gagal++;
}
const dasar = await skenario(browser, "dasar");
for (const t of dasar) console.log(`GAGAL ${t.teks} ${label}`);
gagal += dasar.length;

if (ujiMutasi) {
  for (const [nama, m] of Object.entries(MUTASI)) {
    if (m.linuxSaja && process.platform !== "linux") { console.log(`dilewati mutasi ${nama}: Chromium ${process.platform} tidak memakai hinting Linux`); continue; }
    const t = await skenario(browser, `mutasi ${nama}`, m);
    const kena = t.find((x) => x.jenis === m.harap);
    if (kena) { console.log(`ok mutasi ${nama} tertangkap (${m.harap}): ${kena.teks}`); continue; }
    const lain = t.length ? `; temuan lain: ${[...new Set(t.map((x) => x.jenis))].join(", ")}` : "";
    const sebab = m.linuxSaja ? "; Chromium di runner ini tidak lagi membulatkan lebar glyph tanpa geometricPrecision, tinjau keputusan 361 dan 368" : "";
    console.log(`GAGAL mutasi ${nama} lolos: tidak ada temuan ${m.harap}, pemeriksanya tidak bisa gagal${lain}${sebab} ${label}`);
    gagal++;
  }
}
await browser.close();
console.log(gagal ? `${gagal} masalah lebar font` : "Lebar fallback sama dengan Satoshi, glyph pecahan");
process.exit(gagal ? 1 : 0);
