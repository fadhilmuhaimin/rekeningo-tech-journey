// Luapan horizontal seluruh halaman di HP sempit (K2d, keputusan 356). layar.mjs dan tangkap.mjs memeriksa scroll
// horizontal di 375 dan 1366 dalam keadaan awal halaman: blok lipat tertutup dan island client:visible di bawah layar
// belum hidup. Chip sumber Rantai 349 px pernah meluap 21 px di 360×740 (PR #184) tanpa tertangkap. Alat ini membuka
// setiap halaman di dist/ pada 360×740 dan 375×667, membuka semua <details>, menggulir sampai bawah supaya island hidup, lalu:
//   1. document.documentElement.scrollWidth harus = clientWidth (halaman tidak bisa digulir ke samping), di 360×740
//      dan juga 375×667 (ukuran HP gerbang lain), sekali jalan;
//   2. setiap chip .bb-chip di kedua ukuran tidak lebih lebar dari wadahnya (figure terdekat, atau kolom
//      .sl-markdown-content) dan teksnya tidak terpotong (scrollWidth chip <= clientWidth).
// Elemen penyebab luapan (yang keluar viewport, di luar wadah gulir seperti <pre> dan bukan elemen fixed) dicetak supaya sumbernya terlihat.
// Gagal bila ada luapan, atau bila tidak satu pun chip terukur (pemeriksaan tidak boleh lolos karena kosong).
//   node tools/ukur-luapan.mjs --url http://127.0.0.1:4321 [--halaman /tahap-1/cadangan/] [--rinci]
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { denganBatas, Macet } from "./lib/batas.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg("--url", "http://127.0.0.1:4321");
const satu = arg("--halaman", null);
const rinci = process.argv.includes("--rinci");
const PARALEL = 6;
const UKURAN = [
  { nama: "360x740", width: 360, height: 740 },
  { nama: "375x667", width: 375, height: 667 },
];

function halaman() {
  const out = [];
  (function walk(d, rel) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) { if (!["_astro", "pagefind", "widgets", "vendor", "fonts"].includes(e.name)) walk(path.join(d, e.name), rel + e.name + "/"); }
      else if (e.name === "index.html") out.push("/" + rel);
    }
  })(path.resolve("dist"), "");
  return out.sort();
}

// Dijalankan di halaman: buka semua blok, gulir sampai bawah, lalu ukur. window.__tahap mencatat penantian yang
// sedang berjalan, dibaca diagnosa() bila halaman melewati batas waktu (keputusan 360).
async function ukur() {
  const tahap = (t) => { window.__tahap = t; };
  const rAF = () => new Promise((r) => requestAnimationFrame(() => r()));
  tahap("document.fonts.ready");
  await document.fonts.ready;
  for (const d of document.querySelectorAll("details")) d.open = true;
  tahap("rAF sesudah membuka details");
  await rAF();
  for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) {
    window.scrollTo(0, y);
    tahap(`rAF sesudah gulir ke ${y}`);
    await rAF();
  }
  window.scrollTo(0, 0);
  tahap("setTimeout 250 ms");
  await new Promise((r) => setTimeout(r, 250));
  tahap("rAF terakhir");
  await rAF();
  tahap("mengukur");
  const root = document.documentElement;
  const vw = root.clientWidth;
  const nama = (el) => {
    const kelas = [...el.classList].slice(0, 2).map((k) => "." + k).join("");
    const teks = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `${el.tagName.toLowerCase()}${kelas}${teks ? ` "${teks}"` : ""}`;
  };
  const hasil = { sw: root.scrollWidth, vw, penyebab: [], chip: [] };
  if (hasil.sw > vw) {
    // Elemen yang keluar viewport dan tidak berada di dalam wadah gulir/klip; ambil yang paling dalam.
    // Teks yang meluap dari kotaknya (nowrap, kata panjang) dihitung lewat Range dan dilaporkan sebagai induknya.
    const keluar = [];
    const rentang = document.createRange();
    const jalan = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const kandidat = [...document.body.querySelectorAll("*")].map((el) => [el, el.getBoundingClientRect(), false]);
    for (let n = jalan.nextNode(); n; n = jalan.nextNode()) {
      if (!n.textContent.trim() || !n.parentElement) continue;
      rentang.selectNodeContents(n);
      kandidat.push([n.parentElement, rentang.getBoundingClientRect(), true]);
    }
    for (const [el, r, teks] of kandidat) {
      if (r.width === 0 || (r.right <= vw + 0.5 && r.left >= -0.5) || keluar.includes(el)) continue;
      // Elemen fixed (header, progres baca) ikut melebar bila halaman meluap: gejala, bukan sumber.
      let p = el, lewati = false;
      for (; p && p !== document.body; p = p.parentElement) {
        const g = getComputedStyle(p);
        if (g.position === "fixed" || ((p !== el || teks) && g.overflowX !== "visible")) { lewati = true; break; }
      }
      if (!lewati) keluar.push(el);
    }
    hasil.penyebab = keluar.filter((el) => !keluar.some((l) => l !== el && el.contains(l))).slice(0, 5)
      .map((el) => nama(el));
  }
  for (const c of document.querySelectorAll(".sl-markdown-content .bb-chip")) {
    const r = c.getBoundingClientRect();
    if (r.width === 0) continue; // panel tab tersembunyi
    const wadah = c.closest("figure") || c.closest(".sl-markdown-content");
    const w = wadah.getBoundingClientRect();
    hasil.chip.push({
      teks: nama(c), rantai: !!c.closest("figure.rantai"), lebar: Math.round(r.width), wadah: Math.round(w.width),
      lewat: Math.max(0, Math.round(r.right - w.right), Math.round(w.left - r.left)), terpotong: c.scrollWidth > c.clientWidth + 1,
    });
  }
  return hasil;
}

// Dijalankan di halaman yang melewati batas: penantian mana yang belum selesai dan keadaan yang bisa menahannya.
async function diagnosa() {
  const lewat = (ms, teks) => new Promise((r) => setTimeout(() => r(teks), ms));
  const rAF = await Promise.race([new Promise((r) => requestAnimationFrame(() => r("jalan"))), lewat(1000, "tidak dijadwalkan dalam 1 s")]);
  const muat = [...document.fonts].filter((f) => f.status === "loading").map((f) => `${f.family} ${f.weight} ${f.style}`);
  return `tahap "${window.__tahap ?? "belum mulai"}", visibilityState ${document.visibilityState}, hasFocus ${document.hasFocus()}, `
    + `fonts ${document.fonts.status}${muat.length ? ` (memuat ${muat.join(", ")})` : ""}, rAF ${rAF}, `
    + `scrollY ${Math.round(scrollY)} dari scrollHeight ${document.documentElement.scrollHeight}, innerHeight ${innerHeight}`;
}

const t0 = Date.now();
const daftar = satu ? [satu] : halaman();
const browser = await chromium.launch();
let gagal = 0, jumlahChip = 0;
const maks = {}; // per ukuran: chip Rantai terlebar dibanding figure-nya
const baris = [];
await Promise.all(UKURAN.map(async (u) => {
  const ctx = await browser.newContext({ viewport: { width: u.width, height: u.height }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const antre = [...daftar];
  await Promise.all(Array.from({ length: PARALEL }, async () => {
    const page = await ctx.newPage();
    for (let p = antre.shift(); p !== undefined; p = antre.shift()) {
      // Batas per halaman: page.evaluate tidak punya timeout sendiri. Halaman yang macet menghentikan alat dengan
      // nama halaman, ukuran, dan hasil diagnosa, exit 1, sebelum timeout langkah CI (keputusan 360).
      let h;
      try {
        h = await denganBatas(async () => { await page.goto(BASE + p, { waitUntil: "load" }); return page.evaluate(ukur); },
          `luapan ${u.nama} ${p}`, { diagnosa: () => page.evaluate(diagnosa) });
      } catch (e) {
        if (!(e instanceof Macet)) throw e;
        console.log(e.message);
        process.exit(1);
      }
      const masalah = [];
      if (h.sw > h.vw) masalah.push(`scrollWidth ${h.sw} > viewport ${h.vw}${h.penyebab.length ? ": " + h.penyebab.join("; ") : ""}`);
      for (const c of h.chip) {
        jumlahChip++;
        if (c.rantai && (!maks[u.nama] || c.lebar > maks[u.nama].lebar)) maks[u.nama] = { ...c, p };
        if (c.lewat > 0 || c.terpotong) masalah.push(`chip ${c.teks} ${c.lebar} px di wadah ${c.wadah} px${c.lewat ? `, keluar ${c.lewat} px` : ""}${c.terpotong ? ", teks terpotong" : ""}`);
      }
      if (masalah.length) { gagal++; baris.push(`GAGAL ${u.nama} ${p}\n  ${masalah.join("\n  ")}`); }
      else if (rinci) baris.push(`ok ${u.nama} ${p} scrollWidth ${h.sw}/${h.vw}, ${h.chip.length} chip`);
    }
    await page.close();
  }));
  await ctx.close();
}));
await browser.close();
if (jumlahChip === 0) { gagal++; baris.push("GAGAL tidak ada chip .bb-chip yang terukur (pemeriksaan kosong)"); }
if (baris.length) console.log(baris.sort().join("\n"));
const ringkas = UKURAN.map((u) => maks[u.nama] ? `${u.nama} chip Rantai maks ${maks[u.nama].lebar}/${maks[u.nama].wadah} px (${maks[u.nama].p})` : `${u.nama} tanpa chip Rantai`).join("; ");
console.log(`luapan: ${daftar.length} halaman × ${UKURAN.length} ukuran, ${jumlahChip} chip, ${gagal} gagal; ${ringkas}; ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(gagal ? 1 : 0);
