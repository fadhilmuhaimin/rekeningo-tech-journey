// Pagar lebar font fallback (G2c, keputusan 368). Fallback bermetrik "Satoshi Fallback" (keputusan 351) hanya berguna
// bila lebarnya sama dengan Satoshi, dan angka size-adjust-nya hanya berlaku bila lebar glyph pecahan: Chromium di Linux
// membulatkan lebar glyph ke piksel utuh (hinting) kecuali `text-rendering: geometricPrecision` (keputusan 361).
// Runner CI bisa berganti OS, font, atau Chromium tanpa ada yang berubah di repo (label ubuntu-latest pindah ke
// Ubuntu 26.04 bertahap 19 Oktober–19 November 2026), jadi alat ini mengukur keduanya di setiap gerbang:
//   1. Prosa ±4.000 huruf dari halaman (span nowrap, 17 px) dalam Satoshi dan Satoshi Fallback, 400 dan 600:
//      gagal bila |fallback / Satoshi − 1| > 0,5 %.
//   2. 62 glyph (a–z, A–Z, 0–9) satu span per glyph untuk keenam font (termasuk JetBrains Mono dan fallback mono):
//      gagal bila semua lebarnya bilangan bulat, tanda hinting. Per glyph, bukan lebar prosa: lebar tata letak berkelipatan
//      1/64 px, jadi prosa bisa bulat kebetulan (Satoshi 600 di CI 32.223,00 px walau 59 dari 62 glyph-nya pecahan).
// Lebar prosa JetBrains Mono lawan fallback-nya hanya dicetak: tidak ada fallback mono bermetrik.
// Font yang benar-benar dipakai dibaca lewat CDP CSS.getPlatformFontsForNode, bukan ditebak dari font-family.
//   node tools/ukur-font.mjs --url http://127.0.0.1:4321 [--path /tahap-1/authentication/] [--uji-mutasi]
// --uji-mutasi: sesudah pengukuran biasa, buktikan pagar bisa gagal. size-adjust kedua aturan Satoshi Fallback dikali
// 1,02 dan 0,98 (aturan asli disalin dari stylesheet, ditambahkan sesudahnya) harus gagal di semua platform;
// `text-rendering: auto` harus gagal karena lebar bulat di Linux (di macOS dan Windows Chromium tidak memakai hinting
// itu, jadi mutasi ini dilewati dan dicetak). Mutasi yang lolos membuat alat gagal.
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
// berubah tinggi dari 123 ke 140–142 (dari 23.131), 1,5 poin (96,5 %) ke 271. Selisih sekarang −0,06 % (400), −0,28 % (600).
const AMBANG = 0.005;
const UKURAN = 17; // px, teks isi di HP (keputusan 201); angka keputusan 361 juga diukur di 17 px
const HURUF = 4000;
const GLYPH = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

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
  { id: "s400", nama: "Satoshi 400", family: '"Satoshi"', weight: 400, web: true },
  { id: "f400", nama: "Satoshi Fallback 400", family: '"Satoshi Fallback"', weight: 400 },
  { id: "s600", nama: "Satoshi 600", family: '"Satoshi"', weight: 600, web: true },
  { id: "f600", nama: "Satoshi Fallback 600", family: '"Satoshi Fallback"', weight: 600 },
  // Fallback mono = sisa --sl-font-mono sesudah JetBrains Mono (tema.css).
  { id: "m400", nama: "JetBrains Mono 400", family: '"JetBrains Mono"', weight: 400, web: true },
  { id: "n400", nama: "fallback mono 400", family: "ui-monospace, Menlo, monospace", weight: 400 },
];
const PASANGAN = [["s400", "f400", true], ["s600", "f600", true], ["m400", "n400", false]]; // [web, fallback, dijaga]

const MUTASI = {
  "size-adjust ×1,02": { linuxSaja: false, fn: ubahSizeAdjust, arg: 1.02 },
  "size-adjust ×0,98": { linuxSaja: false, fn: ubahSizeAdjust, arg: 0.98 },
  "text-rendering: auto": { linuxSaja: true, fn: tambahCss, arg: "html { text-rendering: auto !important; }" },
};
// Kedua fungsi dijalankan di halaman (page.evaluate), jadi tidak memakai apa pun dari luar.
function tambahCss(css) { const s = document.createElement("style"); s.textContent = css; document.head.append(s); }
// Dijalankan di halaman. Aturan salinan ditambahkan sesudah aturan asli dengan deskriptor sama dan menggantikannya
// (terukur: lebar fallback 400 naik 1,91 % di CI, 1,97 % di macOS).
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

async function ukur(page) {
  return page.evaluate(async ({ FONT, UKURAN, HURUF, GLYPH }) => {
    const prosa = [...document.querySelectorAll(".sl-markdown-content p")].map((p) => p.textContent).join(" ").replace(/\s+/g, " ").trim().slice(0, HURUF);
    for (const w of [400, 600]) await document.fonts.load(`${w} ${UKURAN}px Satoshi`, prosa);
    await document.fonts.load(`400 ${UKURAN}px "JetBrains Mono"`, prosa);
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
    const hasil = {};
    for (const f of FONT) {
      const p = span(f, prosa, `ukur-font-${f.id}`);
      const g = [...GLYPH].map((c) => span(f, c));
      hasil[f.id] = { p, g };
    }
    document.body.append(wadah);
    await document.fonts.ready;
    const keluar = { huruf: prosa.length, tr: getComputedStyle(document.documentElement).textRendering, font: {} };
    for (const f of FONT) {
      const lebarG = hasil[f.id].g.map((s) => s.getBoundingClientRect().width);
      keluar.font[f.id] = {
        prosa: hasil[f.id].p.getBoundingClientRect().width,
        pecahan: lebarG.filter((x) => x !== Math.round(x)).length,
        glyph: lebarG.length,
      };
    }
    return keluar;
  }, { FONT, UKURAN, HURUF, GLYPH });
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
const persen = (x) => `${x >= 0 ? "+" : "−"}${Math.abs(x * 100).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
const namaPlatform = (daftar) => daftar.map((x) => `${x.familyName}${x.isCustomFont ? " (web)" : ""} ${x.glyphCount}`).join(" + ") || "?";

// Satu skenario: halaman baru, mutasi (bila ada), ukur, nilai. Mengembalikan daftar pelanggaran.
async function skenario(browser, label, mutasi) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 657 } });
  const laporan = [];
  try {
    await denganBatas(async () => {
      await page.goto(url + jalur, { waitUntil: "networkidle" });
      if (mutasi) await page.evaluate(mutasi.fn, mutasi.arg);
      const u = await ukur(page);
      const pf = await fontPlatform(page);
      if (!mutasi) {
        console.log(`font: ${jalur}, prosa ${u.huruf} huruf ${UKURAN} px, text-rendering ${u.tr}`);
        for (const f of FONT) console.log(`  ${f.nama}: ${namaPlatform(pf[f.id])}`);
      }
      if (u.huruf < HURUF * 0.9) laporan.push(`prosa ${jalur} hanya ${u.huruf} huruf (butuh ±${HURUF})`);
      for (const f of FONT) {
        if (f.web && !pf[f.id].some((x) => x.isCustomFont && x.familyName.includes(f.nama.split(" ")[0]))) {
          laporan.push(`${f.nama} tidak termuat dari /fonts (dipakai ${namaPlatform(pf[f.id])}); perbandingan tidak sah`);
        }
        const g = u.font[f.id];
        if (g.pecahan === 0) laporan.push(`${f.nama} (${namaPlatform(pf[f.id])}): ${g.glyph} lebar glyph semuanya bilangan bulat, tanda hinting; keputusan 361 tidak berlaku lagi di runner ini`);
      }
      for (const [a, b, dijaga] of PASANGAN) {
        const wa = u.font[a].prosa, wb = u.font[b].prosa, d = wb / wa - 1;
        const fa = FONT.find((f) => f.id === a), fb = FONT.find((f) => f.id === b);
        const buruk = dijaga && Math.abs(d) > AMBANG;
        const bulat = (w) => (w === Math.round(w) ? " bulat" : "");
        const baris = `${fa.nama} ${angka(wa)} px${bulat(wa)} · ${fb.nama} ${angka(wb)} px${bulat(wb)} (${namaPlatform(pf[b])}) · selisih ${persen(d)}${dijaga ? "" : " (info)"}`;
        if (!mutasi) console.log(`${buruk ? "GAGAL" : "ok"} ${baris}`);
        if (buruk) laporan.push(`lebar ${baris}, di atas ${persen(AMBANG).slice(1)}`);
      }
      if (!mutasi) {
        const pec = FONT.map((f) => `${f.nama.replace("Satoshi Fallback", "Fallback")} ${u.font[f.id].pecahan}/${u.font[f.id].glyph}`).join(", ");
        console.log(`  glyph berlebar pecahan: ${pec}`);
      }
    }, `font ${label} ${jalur}`);
  } finally {
    await page.close();
  }
  return laporan;
}

const browser = await chromium.launch();
const page0 = await browser.newPage();
const ua = await page0.evaluate(() => navigator.userAgent);
await page0.close();
console.log(`font: runner ${runner}; Chromium ${browser.version()}; ${ua}`);

let gagal = 0;
const dasar = await skenario(browser, "dasar");
for (const l of dasar) console.log(`GAGAL ${l} [runner ${runner}, Chromium ${browser.version()}]`);
gagal += dasar.length;

if (ujiMutasi) {
  for (const [nama, m] of Object.entries(MUTASI)) {
    if (m.linuxSaja && process.platform !== "linux") { console.log(`dilewati mutasi ${nama}: Chromium ${process.platform} tidak memakai hinting Linux`); continue; }
    const l = await skenario(browser, `mutasi ${nama}`, m);
    if (l.length) console.log(`ok mutasi ${nama} tertangkap: ${l[0]}`);
    else {
      const sebab = m.linuxSaja ? "; Chromium di runner ini tidak lagi membulatkan lebar glyph tanpa geometricPrecision, tinjau keputusan 361 dan 368" : "";
      console.log(`GAGAL mutasi ${nama} lolos: pagar tidak bisa gagal${sebab} [runner ${runner}, Chromium ${browser.version()}]`);
      gagal++;
    }
  }
}
await browser.close();
console.log(gagal ? `${gagal} masalah lebar font` : "Lebar fallback sama dengan Satoshi, glyph pecahan");
process.exit(gagal ? 1 : 0);
