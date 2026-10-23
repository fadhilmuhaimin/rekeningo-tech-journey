// axe-core di halaman situs untuk bukti W4 evaluasi tahap dan tugas interaksi (G-axe, keputusan 692, 693).
//   node tools/ukur-axe.mjs --url http://127.0.0.1:4321 --path / --path /tahap-1/prd-v1/ [--path ...]
//   node tools/ukur-axe.mjs --url ... --semua [--awalan /tahap-1/ --awalan /tahap-2/]   # halaman di dist/
//   opsi: --paralel <n> halaman per konteks (bawaan 3), --rinci (baris ok per halaman)
// Setiap halaman diperiksa di 375x667 dan 1366x657, tema gelap dan terang (localStorage starlight-theme sebelum
// halaman dimuat, seperti tangkap.mjs), dengan reduced motion supaya tidak ada transisi warna yang sedang berjalan.
// Sebelum axe.run, keadaan halaman dibuat seperti yang bisa dilihat pembaca (pola ukur-luapan.mjs): semua <details>
// dibuka, halaman digulir sampai bawah, dan alat menunggu setiap astro-island yang terlihat kehilangan atribut ssr
// (Astro 7.3.7 menghapusnya sesudah hydrate). Lalu axe-core dari paket terpasang (lib/axe.mjs) dijalankan dengan
// runOnly tag wcag2a, wcag2aa, wcag21aa, wcag22aa.
// Uji diri di awal setiap run: tests/fixture/axe-salah.html berisi pelanggaran yang masing-masing hanya tertangkap
// bila satu langkah di atas berjalan (details, gulir dan tunggu island, tag wcag22aa, tema, ukuran). Kalau hasilnya
// tidak persis seperti yang diharapkan, alat gagal sebelum mengukur halaman situs.
// Exit 1 bila: ada pelanggaran (dicetak per rule, selector, halaman, ukuran, tema), uji diri meleset, tema tidak
// berlaku, island terlihat belum hidup, rule target-size tidak ikut dijalankan, versi axe beda dari package.json,
// daftar halaman kosong, atau halaman melewati batas waktu (lib/batas.mjs, MACET). Halaman yang macet karena renderer
// diam diulang sekali di konteks baru dengan baris ULANG, paling banyak 2 per run, seperti ukur-luapan.mjs (keputusan 364, 367).
// axe 0 belum membuktikan halaman aksesibel: fokus terlihat (SC 2.4.7, 2.4.11), urutan Tab, dan reflow 320 px
// (SC 1.4.10) tidak punya rule di axe-core 4.14 (RISET-SKILL 13); hasil incomplete dicetak untuk dicek manusia.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { denganBatas, Macet } from "./lib/batas.mjs";
import { pasangJejak, diagnosaJejak, sesiBrowser, tertundaXhr } from "./lib/jejak.mjs";
import { AXE_PATH, AXE_VERSI, AXE_PIN, TAG_WCAG } from "./lib/axe.mjs";

const argv = process.argv;
const arg = (k, d) => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : d; };
const semuaArg = (k) => argv.flatMap((a, i) => (a === k && argv[i + 1] ? [argv[i + 1]] : []));
const BASE = arg("--url", "http://127.0.0.1:4321").replace(/\/$/, "");
const PARALEL = Number(arg("--paralel", 3));
const rinci = argv.includes("--rinci");
const UKURAN = [
  { nama: "375x667", viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true },
  { nama: "1366x657", viewport: { width: 1366, height: 657 } },
];
const TEMA = ["dark", "light"];
const NODE_MAKS = 5; // node per rule per halaman yang dicetak; sisanya dihitung

const FIXTURE = "/__uji-axe/";
const FIXTURE_HTML = fs.readFileSync(new URL("../tests/fixture/axe-salah.html", import.meta.url), "utf8");
// Pelanggaran yang wajib tertangkap di fixture, persis (rule + selector), per ukuran dan tema.
const HARAP = {
  "375x667 dark": ["button-name .tanpa-nama", "color-contrast .hp-saja", "image-alt img", "target-size button[aria-label=\"Kurangi\"]", "target-size button[aria-label=\"Tambah\"]"],
  "375x667 light": ["button-name .tanpa-nama", "color-contrast .terang-saja", "image-alt img", "target-size button[aria-label=\"Kurangi\"]", "target-size button[aria-label=\"Tambah\"]"],
  "1366x657 dark": ["button-name .tanpa-nama", "image-alt img", "target-size button[aria-label=\"Kurangi\"]", "target-size button[aria-label=\"Tambah\"]"],
  "1366x657 light": ["button-name .tanpa-nama", "color-contrast .terang-saja", "image-alt img", "target-size button[aria-label=\"Kurangi\"]", "target-size button[aria-label=\"Tambah\"]"],
};

function halamanDist(awalan) {
  const out = [];
  (function walk(d, rel) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) { if (!["_astro", "pagefind", "widgets", "vendor", "fonts"].includes(e.name)) walk(path.join(d, e.name), rel + e.name + "/"); }
      else if (e.name === "index.html") out.push("/" + rel);
    }
  })(path.resolve("dist"), "");
  return out.filter((p) => !awalan.length || awalan.some((a) => p.startsWith(a))).sort();
}

// Di halaman: buka semua details, gulir sampai bawah, tunggu island yang terlihat hidup, kembali ke atas.
async function siapkan() {
  const tahap = (t) => { window.__tahap = t; };
  const rAF = () => new Promise((r) => requestAnimationFrame(() => r()));
  const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
  const buka = () => { for (const d of document.querySelectorAll("details")) d.open = true; };
  tahap("document.fonts.ready");
  await document.fonts.ready;
  buka();
  await rAF();
  for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) {
    window.scrollTo(0, y);
    tahap(`rAF sesudah gulir ke ${y}`);
    await rAF();
  }
  window.scrollTo(0, document.documentElement.scrollHeight);
  // astro-island ber-display:contents (tanpa kotak sendiri), jadi terlihat-tidaknya dibaca dari leluhurnya. Island di
  // dalam wadah tersembunyi (tab lain, display:none) memang tidak dilihat pembaca dan tidak diperiksa axe.
  const terlihat = (el) => { for (let p = el.parentElement; p; p = p.parentElement) if (getComputedStyle(p).display === "none") return false; return true; };
  const belum = () => [...document.querySelectorAll("astro-island[ssr]")].filter(terlihat);
  tahap("menunggu island hidup");
  for (let t = 0; t < 50 && belum().length; t++) await tidur(100);
  buka(); // details yang baru dibuat island
  window.scrollTo(0, 0);
  tahap("setTimeout 250 ms");
  await tidur(250);
  await rAF();
  tahap("siap");
  const nama = (el) => `${el.getAttribute("component-url")?.split("/").pop() ?? el.tagName.toLowerCase()} (${el.getAttribute("client") ?? "?"})`;
  return {
    tema: document.documentElement.dataset.theme,
    belum: belum().map(nama),
    island: document.querySelectorAll("astro-island").length,
  };
}

async function jalankanAxe(tag) {
  window.__tahap = "axe.run";
  // resultTypes memangkas setiap jenis hasil yang tidak disebut jadi paling banyak 1 node per rule (axe-core 4.14.0
  // processAggregate), jadi incomplete ikut disebut supaya jumlah node yang perlu dicek manusia tidak terpotong (keputusan 695).
  const h = await window.axe.run(document, { runOnly: { type: "tag", values: tag }, resultTypes: ["violations", "incomplete"] });
  const sel = (t) => t.map((x) => (Array.isArray(x) ? x.join(" >> ") : x)).join(" ");
  return {
    versi: window.axe.version,
    rule: [...h.passes, ...h.violations, ...h.incomplete, ...h.inapplicable].map((r) => r.id),
    pelanggaran: h.violations.map((v) => ({ id: v.id, dampak: v.impact, node: v.nodes.map((n) => sel(n.target)) })),
    incomplete: h.incomplete.map((v) => ({ id: v.id, jumlah: v.nodes.length, node: v.nodes.slice(0, 3).map((n) => sel(n.target)) })),
  };
}

const t0 = Date.now();
const daftar = [...new Set([...semuaArg("--path"), ...(argv.includes("--semua") ? halamanDist(semuaArg("--awalan")) : [])])];
if (!daftar.length) { console.log("GAGAL: tidak ada halaman (pakai --path <p> atau --semua)"); process.exit(1); }
if (AXE_VERSI !== AXE_PIN) { console.log(`GAGAL: axe-core terpasang ${AXE_VERSI}, package.json ${AXE_PIN}; jalankan bun install --cwd situs`); process.exit(1); }

const browser = await chromium.launch();
const cdpBrowser = await sesiBrowser(browser);
const baris = []; // keluaran per halaman, diurutkan
const gagalLain = []; // tema, island, rule, versi, macet
const perRule = new Map(); // rule -> { node, halaman: Set, dampak }
const incompleteRule = new Map();
const diulang = []; // halaman yang diulang sesudah renderer diam
const ULANG_MAKS = 2;
let jumlahRun = 0;

// Dijalankan di halaman yang melewati batas: penantian mana yang belum selesai.
const diagnosaHalaman = () => `tahap "${window.__tahap ?? "belum mulai"}", readyState ${document.readyState}, scrollY ${Math.round(scrollY)}`;

// Satu halaman: muat, siapkan, suntik axe, jalankan. Batas per halaman (lib/batas.mjs, keputusan 360); diagnosa dari
// jejak yang dipasang sebelum navigasi (lib/jejak.mjs, keputusan 364), karena halaman yang macet tidak menjawab.
const periksa = (page, jejak, p, label) => denganBatas(async () => {
  jejak.tandai("goto");
  await page.goto(BASE + p, { waitUntil: "load" });
  jejak.tandai("evaluate siapkan");
  const s = await page.evaluate(siapkan);
  jejak.tandai("addScriptTag axe");
  await page.addScriptTag({ path: AXE_PATH });
  jejak.tandai("evaluate axe.run");
  return { ...s, ...(await page.evaluate(jalankanAxe, TAG_WCAG)) };
}, label, { diagnosa: () => diagnosaJejak(jejak, () => page.evaluate(diagnosaHalaman)), msDiagnosa: 10_000 });

async function konteks(u, tema) {
  const ctx = await browser.newContext({ viewport: u.viewport, isMobile: !!u.isMobile, hasTouch: !!u.hasTouch, reducedMotion: "reduce" });
  await ctx.addInitScript((t) => { try { localStorage.setItem("starlight-theme", t); } catch {} }, tema);
  await ctx.route(`${BASE}${FIXTURE}`, (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: FIXTURE_HTML }));
  return ctx;
}
const tutup = (x, label) => denganBatas(() => x.close(), label, { ms: 10_000 }).catch(() => {});

// Ulangan terlihat di log (ULANG), anotasi Actions, dan ringkasan langkah, seperti ukur-luapan.mjs (keputusan 364).
function catatUlang(k, pesan) {
  console.log(`ULANG ${pesan.replace(/^MACET /, "")}`);
  if (process.env.GITHUB_ACTIONS) console.log(`::warning title=ukur-axe diulang::renderer diam di ${k}, diulang sekali di konteks baru (keputusan 364)`);
  if (process.env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- ukur-axe: renderer diam di \`${k}\`, diulang sekali di konteks baru (keputusan 364, 367)\n`);
}

// Uji diri: fixture di keempat kombinasi, harus persis HARAP. Tanpa ulang: fixture tidak memicu macet renderer.
const ujiPerKey = {};
await Promise.all(UKURAN.flatMap((u) => TEMA.map(async (tema) => {
  const key = `${u.nama} ${tema}`;
  const ctx = await konteks(u, tema);
  const page = await ctx.newPage();
  const jejak = await pasangJejak(page, cdpBrowser);
  try {
    const h = await periksa(page, jejak, FIXTURE, `axe uji diri ${key}`);
    const dapat = h.pelanggaran.flatMap((v) => v.node.map((n) => `${v.id} ${n}`)).sort();
    const ok = JSON.stringify(dapat) === JSON.stringify([...HARAP[key]].sort()) && h.tema === tema && !h.belum.length;
    ujiPerKey[key] = { dapat: [...dapat, `tema ${h.tema}`, `island belum hidup ${h.belum.length}`], ok };
  } catch (e) {
    ujiPerKey[key] = { dapat: [e.message], ok: false };
  }
  await tutup(ctx, "tutup konteks");
})));
const ujiGagal = Object.entries(ujiPerKey).filter(([, v]) => !v.ok);
if (ujiGagal.length) {
  for (const [key, v] of ujiGagal) console.log(`GAGAL uji diri ${key}: dapat [${v.dapat.join("; ")}], harap [${HARAP[key].join("; ")}]`);
  console.log("GAGAL: uji diri axe meleset; langkah details, gulir, tema, ukuran, atau tag tidak berjalan seperti seharusnya");
  process.exit(1);
}

await Promise.all(UKURAN.flatMap((u) => TEMA.map(async (tema) => {
  const ctx = await konteks(u, tema);
  const antre = [...daftar];
  await Promise.all(Array.from({ length: Math.min(PARALEL, antre.length) }, async () => {
    let page = await ctx.newPage();
    let jejak = await pasangJejak(page, cdpBrowser);
    for (let p = antre.shift(); p !== undefined; p = antre.shift()) {
      const k = `${u.nama} ${tema} ${p}`;
      let h;
      try {
        h = await periksa(page, jejak, p, `axe ${k}`);
      } catch (e) {
        if (!(e instanceof Macet)) throw e;
        // Renderer diam (macet commit/raster Chromium, keputusan 364 dan 367) diulang sekali di konteks baru, tercatat.
        // Kode halaman yang berputar, xhr/fetch tertunda, macet lagi, atau lebih dari ULANG_MAKS halaman tetap MACET.
        const xhr = tertundaXhr(jejak);
        const tolak = !jejak.diam ? "" : xhr.length ? `xhr/fetch tertunda: ${xhr.slice(0, 3).join(", ")}` : diulang.length >= ULANG_MAKS ? `sudah ${ULANG_MAKS} halaman diulang` : null;
        await tutup(page, "tutup");
        if (tolak === null) {
          diulang.push(k);
          catatUlang(k, e.message);
          const ctxUlang = await konteks(u, tema);
          const pageUlang = await ctxUlang.newPage();
          try {
            h = await periksa(pageUlang, await pasangJejak(pageUlang, cdpBrowser), p, `axe ${k} (diulang di konteks baru)`);
          } catch (e2) {
            if (!(e2 instanceof Macet)) throw e2;
            gagalLain.push(`${e2.message} (macet lagi sesudah diulang)`);
          }
          await tutup(ctxUlang, "tutup konteks ulang");
        } else gagalLain.push(e.message + (tolak ? ` (tidak diulang, ${tolak})` : ""));
        page = await ctx.newPage();
        jejak = await pasangJejak(page, cdpBrowser);
        if (!h) continue;
      }
      jumlahRun++;
      if (h.versi !== AXE_PIN) gagalLain.push(`GAGAL ${k}: axe di halaman ${h.versi}, bukan ${AXE_PIN}`);
      if (h.tema !== tema) gagalLain.push(`GAGAL ${k}: tema halaman ${h.tema}, bukan ${tema}`);
      if (h.belum.length) gagalLain.push(`GAGAL ${k}: island terlihat belum hidup sesudah 5 s: ${h.belum.join(", ")}`);
      for (const r of ["target-size", "color-contrast"]) if (!h.rule.includes(r)) gagalLain.push(`GAGAL ${k}: rule ${r} tidak dijalankan`);
      for (const i of h.incomplete) incompleteRule.set(i.id, (incompleteRule.get(i.id) ?? 0) + i.jumlah);
      for (const v of h.pelanggaran) {
        const r = perRule.get(v.id) ?? { node: 0, halaman: new Set(), dampak: v.dampak };
        r.node += v.node.length; r.halaman.add(p); perRule.set(v.id, r);
        const lebih = v.node.length > NODE_MAKS ? ` (+${v.node.length - NODE_MAKS} node lagi)` : "";
        baris.push(`GAGAL ${p} ${u.nama} ${tema} ${v.id} (${v.dampak}, ${v.node.length} node): ${v.node.slice(0, NODE_MAKS).join(" | ")}${lebih}`);
      }
      if (rinci && !h.pelanggaran.length) baris.push(`ok ${p} ${u.nama} ${tema}: 0 pelanggaran, ${h.island} island, ${h.rule.length} rule`);
      if (rinci) for (const i of h.incomplete) baris.push(`incomplete ${p} ${u.nama} ${tema} ${i.id} (${i.jumlah} node): ${i.node.join(" | ")}`);
    }
    await tutup(page, "tutup");
  }));
  // Renderer yang diam bisa menahan penutupan; batas 10 s, sisanya ditutup bersama proses.
  await tutup(ctx, "tutup konteks");
})));
await denganBatas(() => browser.close(), "tutup browser", { ms: 10_000 }).catch(() => {});

const harusRun = daftar.length * UKURAN.length * TEMA.length;
if (jumlahRun !== harusRun) gagalLain.push(`GAGAL hanya ${jumlahRun} dari ${harusRun} run yang selesai`);
if (baris.length) console.log(baris.sort().join("\n"));
if (gagalLain.length) console.log(gagalLain.sort().join("\n"));
const ringkasRule = [...perRule].sort((a, b) => b[1].node - a[1].node).map(([id, r]) => `${id} ${r.dampak} ${r.node} node di ${r.halaman.size} halaman`).join("; ");
const ringkasIncomplete = [...incompleteRule].map(([id, n]) => `${id} ${n}`).join(", ");
const halamanGagal = new Set([...perRule.values()].flatMap((r) => [...r.halaman])).size;
console.log(`axe ${AXE_VERSI} runOnly ${TAG_WCAG.join(", ")}: uji diri 4/4 lolos; ${daftar.length} halaman × ${UKURAN.length} ukuran × ${TEMA.length} tema = ${jumlahRun} run; `
  + `${halamanGagal} halaman berpelanggaran${ringkasRule ? ` (${ringkasRule})` : ""}; incomplete untuk dicek manusia: ${ringkasIncomplete || "0"}; `
  + `${gagalLain.length} gagal lain; ${diulang.length} diulang sesudah renderer diam${diulang.length ? ` (${diulang.join(", ")})` : ""}; ${((Date.now() - t0) / 1000).toFixed(1)} s. axe 0 belum membuktikan aksesibel (fokus, urutan Tab, reflow 320 px tidak diperiksa axe).`);
process.exit(perRule.size || gagalLain.length ? 1 : 0);
