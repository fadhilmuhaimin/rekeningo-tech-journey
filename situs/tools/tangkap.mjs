// Tangkapan layar halaman situs baru dengan Playwright: desktop 1366×657 dan HP 375×667, mode gelap dan terang.
// Pakai: node tools/tangkap.mjs [--url http://127.0.0.1:4321] [--path /tahap-1/transaction/]
// Hasil: tangkapan/<nama>-<ukuran>-<mode>.png (di-.gitignore). Mode diatur lewat localStorage starlight-theme,
// sama seperti pilihan pembaca. Juga mencetak lebar scroll horizontal (harus = lebar viewport).
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { awasi } from "./lib/batas.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg("--url", "http://127.0.0.1:4321");
const PATHS = (arg("--path", "/tahap-1/transaction/,/")).split(",");
const OUT = path.resolve("tangkapan");
fs.mkdirSync(OUT, { recursive: true });
const UKURAN = [{ nama: "desktop", width: 1366, height: 657 }, { nama: "hp", width: 375, height: 667, mobile: true }];
const MODE = ["dark", "light"];

const browser = awasi(await chromium.launch(), { alat: "tangkap" }); // batas waktu per halaman (keputusan 360)
let masalah = 0;
for (const p of PATHS) {
  const nama = p === "/" ? "beranda" : p.replace(/^\/|\/$/g, "").replace(/\//g, "_");
  for (const u of UKURAN) for (const m of MODE) {
    const ctx = await browser.newContext({ viewport: { width: u.width, height: u.height }, deviceScaleFactor: 2, isMobile: !!u.mobile, hasTouch: !!u.mobile, reducedMotion: "reduce" });
    await ctx.addInitScript((tema) => { try { localStorage.setItem("starlight-theme", tema); } catch {} }, m);
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    page.on("console", (msg) => { if (msg.type() === "error") errs.push(msg.text()); });
    await page.goto(BASE + p, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const file = path.join(OUT, `${nama}-${u.nama}-${m}.png`);
    await page.screenshot({ path: file, fullPage: false });
    const lebar = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth, document.documentElement.dataset.theme]);
    const ok = lebar[0] <= lebar[1] && lebar[2] === m && errs.length === 0;
    if (!ok) masalah++;
    console.log(`${ok ? "ok  " : "GAGAL"} ${path.relative(process.cwd(), file)} · scrollWidth ${lebar[0]} / viewport ${lebar[1]} · tema ${lebar[2]}${errs.length ? " · error: " + errs.join(" | ") : ""}`);
    // Versi halaman penuh untuk dibaca sendiri (tidak dihitung sebagai bukti layar pertama).
    await page.screenshot({ path: file.replace(/\.png$/, "-penuh.png"), fullPage: true });
    await ctx.close();
  }
}
// Pembaca baru tanpa pilihan tersimpan, sistem memakai tema terang: situs tetap gelap (keputusan 105, 119).
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 657 }, colorScheme: "light" });
  const page = await ctx.newPage();
  await page.goto(BASE + PATHS[0], { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const [tema, simpan, pilih] = await page.evaluate(() => [document.documentElement.dataset.theme,
    localStorage.getItem("starlight-theme"), document.querySelector("starlight-theme-select select")?.value]);
  const ok = tema === "dark" && pilih === "dark";
  if (!ok) masalah++;
  console.log(`${ok ? "ok  " : "GAGAL"} tema awal tanpa pilihan, sistem terang: ${tema} (pemilih ${pilih}, tersimpan ${JSON.stringify(simpan)})`);
  await ctx.close();
}
await browser.close();
if (masalah) { console.log(`${masalah} tangkapan bermasalah`); process.exit(1); }
