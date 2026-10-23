// Audit tampilan (keputusan 200): ukuran, berat, warna, dan kontras tiap jenis teks, plus axe-core.
// Pakai: AXE=1 node tools/audit-tampilan.mjs [--url http://127.0.0.1:4322] [--out hasil.json] [--foto dir]
// AXE opsional (AXE=1 = axe-core terpasang, AXE=<file> = file lain; tanpa itu axe dilewati). --foto menyimpan tangkapan layar pertama tiap halaman × ukuran × tema.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { pilihAxe } from "./lib/axe.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg("--url", "http://127.0.0.1:4322");
const OUT = arg("--out", "");
const FOTO = arg("--foto", "");
const AXE = pilihAxe(); // AXE=1 atau --axe: axe-core terpasang (lib/axe.mjs, keputusan 693); AXE=<file>: file lain
const HALAMAN = [["beranda", "/"], ["1.1", "/tahap-1/prd-v1/"], ["1.19", "/tahap-1/m3-tanda-kutip/"]];
const UKURAN = [["desktop", 1366, 768], ["hp", 375, 667]];

// Jenis teks: label → selector. Elemen pertama yang terlihat diukur.
const JENIS = [
  ["isi (paragraf)", ".sl-markdown-content p:not(.meta):not(.kicker)"],
  ["judul halaman (h1)", "h1"],
  ["meta (baca · prasyarat)", "p.meta"],
  ["kicker (jenis halaman)", "p.kicker"],
  ["breadcrumb", ".kamu"],
  ["rekap fiktif", ".kamu__rekap"],
  ["judul blok", ".blok__judul"],
  ["label blok (Blok 1 dari 5)", ".blok__meta"],
  ["tombol Berikutnya (blok)", ".blok__lanjut a, .blok__lanjut"],
  ["navigasi bawah", ".bb-lanjut a"],
  ["sidebar: tautan", ".sidebar-content a"],
  ["sidebar: grup", ".sidebar-content summary, .sidebar-content .group-label"],
  ["daftar isi kanan", ".right-sidebar a, starlight-toc a"],
  ["chip peran", ".peran__chip"],
  ["tombol mode fokus", ".fokus"],
  ["kotak pencarian", "site-search button, .search-input, button[data-open-modal]"],
  ["beranda: janji", ".beranda__janji"],
  ["beranda: kartu", ".pintu p"],
  ["beranda: peta tahap kecil", ".beranda__peta small"],
];

function lum([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const rasio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const hasil = { url: BASE, diukur: new Date().toISOString(), teks: [], axe: [] };
const b = await chromium.launch();
for (const tema of ["dark", "light"]) {
  for (const [uk, w, h] of UKURAN) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.addInitScript((t) => localStorage.setItem("starlight-theme", t), tema);
    for (const [nama, url] of HALAMAN) {
      await p.goto(BASE + url, { waitUntil: "networkidle" });
      await p.waitForTimeout(300);
      if (FOTO) {
        fs.mkdirSync(FOTO, { recursive: true });
        await p.screenshot({ path: path.join(FOTO, `${nama}-${uk}-${tema}.png`) });
      }
      if (tema !== "dark") continue; // tabel ukur dan axe: mode gelap
      const ukur = await p.evaluate((JENIS) => {
        const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 4).map(Number);
        const latar = (el) => {
          for (let e = el; e; e = e.parentElement) {
            const c = rgb(getComputedStyle(e).backgroundColor);
            if (c.length === 3 || (c.length === 4 && c[3] > 0.5)) return c.slice(0, 3);
          }
          return rgb(getComputedStyle(document.body).backgroundColor).slice(0, 3);
        };
        return JENIS.map(([label, sel]) => {
          const el = [...document.querySelectorAll(sel)].find((e) => e.getClientRects().length && e.textContent.trim());
          if (!el) return { label, ada: false };
          const cs = getComputedStyle(el);
          return { label, ada: true, px: parseFloat(cs.fontSize), berat: cs.fontWeight, warna: rgb(cs.color).slice(0, 3), latar: latar(el), contoh: el.textContent.trim().replace(/\s+/g, " ").slice(0, 40) };
        });
      }, JENIS);
      const kecil = await p.evaluate(() => {
        const out = new Map();
        for (const el of document.querySelectorAll("body *")) {
          if (!el.getClientRects().length || ["SCRIPT", "STYLE", "SVG", "PATH"].includes(el.tagName)) continue;
          const langsung = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
          if (!langsung) continue;
          const px = parseFloat(getComputedStyle(el).fontSize);
          if (px >= 14) continue;
          const kunci = `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 2).join(".")} ${px}px`;
          if (!out.has(kunci)) out.set(kunci, el.textContent.trim().replace(/\s+/g, " ").slice(0, 30));
        }
        return [...out].map(([k, v]) => `${k} "${v}"`);
      });
      hasil.kecil = hasil.kecil || [];
      hasil.kecil.push({ halaman: nama, ukuran: uk, daftar: kecil });
      for (const u of ukur) {
        if (u.ada) u.kontras = Math.round(rasio(u.warna, u.latar) * 100) / 100;
        hasil.teks.push({ halaman: nama, ukuran: uk, ...u });
      }
      if (AXE) {
        await p.addScriptTag({ path: AXE });
        const r = await p.evaluate(async () => {
          const x = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
          return x.violations.map((v) => ({ id: v.id, dampak: v.impact, jumlah: v.nodes.length, contoh: v.nodes.slice(0, 2).map((n) => n.target.join(" ")) }));
        });
        hasil.axe.push({ halaman: nama, ukuran: uk, pelanggaran: r });
      }
    }
    await p.close();
  }
}
await b.close();

const hex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
for (const t of hasil.teks.filter((t) => t.ada)) console.log(`${t.halaman.padEnd(8)} ${t.ukuran.padEnd(7)} ${t.label.padEnd(30)} ${String(t.px).padStart(5)}px ${t.berat} ${hex(t.warna)} / ${hex(t.latar)} = ${t.kontras}:1`);
for (const k of hasil.kecil || []) console.log(`<14px ${k.halaman} ${k.ukuran}: ${k.daftar.length ? k.daftar.join(" | ") : "tidak ada"}`);
for (const a of hasil.axe) console.log(`axe ${a.halaman} ${a.ukuran}: ${a.pelanggaran.length ? a.pelanggaran.map((v) => `${v.id}(${v.dampak},${v.jumlah})`).join(", ") : "0 pelanggaran"}`);
if (OUT) fs.writeFileSync(OUT, JSON.stringify(hasil, null, 1));
