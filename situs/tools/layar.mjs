// Aturan layar pertama untuk situs baru (padanan tools/cek_layar_pertama.mjs): visual pertama sesudah "## Inti"
// harus terlihat utuh tanpa scroll di 4 viewport, dan halaman tidak boleh punya scroll horizontal. Halaman lima blok
// tanpa Inti atau tanpa visual di Inti gagal (R6, keputusan 319); lihat ukur() untuk arti visual.
// Pakai: node tools/layar.mjs [--url http://127.0.0.1:4321] [--min-margin 20] [--tanpa-mutasi]
// Halaman yang diperiksa: semua halaman konten di dist/ (selain beranda dan 404). Exit 1 bila ada yang gagal.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { awasi } from "./lib/batas.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg("--url", "http://127.0.0.1:4321");
const MIN = Number(arg("--min-margin", 20));
const VIEWPORTS = [
  { name: "1366x768", width: 1366, height: 768 }, { name: "1366x657", width: 1366, height: 657 },
  { name: "375x812", width: 375, height: 812, mobile: true }, { name: "375x667", width: 375, height: 667, mobile: true },
];
function halaman() {
  const out = [];
  (function walk(d, rel) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) { if (!["_astro", "pagefind", "widgets", "vendor", "fonts"].includes(e.name)) walk(path.join(d, e.name), rel + e.name + "/"); }
      else if (e.name === "index.html") out.push(rel); // termasuk beranda (rel "")
    }
  })(path.resolve("dist"), "");
  return out.sort();
}
// Visual = Rantai, PetaFitur, ilustrasi, diagram, widget (host data-bb, island React), gambar. Bukan visual: Snippet
// (blok kode, MEMORI: "layar.mjs tidak menghitung Snippet sebagai visual Inti"), tabel, dan svg ikon tautan heading.
// Halaman konsep (lima blok Mulai sampai Kunci) wajib punya "## Inti" dengan visual di antara Inti dan h2 berikutnya
// (R6, keputusan 319). Halaman berblok lain tanpa Inti (ADR: blok Kebutuhan; masalah, fitur, PRD: blok pertama) diukur
// dengan visual pertama di blok itu dan dicetak "info" tanpa dinilai.
// mutasi (uji mutasi, hanya dipakai alat ini): "snippet" mengganti visual Inti dengan Snippet, "turun" menyisipkan
// 2000 px sebelum visual, "tanpa-inti" menghapus heading Inti.
async function ukur(mutasi) {
  await document.fonts.ready;
  const VIS = "figure, img, svg, [data-bb], astro-island";
  const bukan = (el) => el.closest(".bb-snippet, .sl-anchor-link, [data-bb=umpan-balik], [data-bb=selesai], .blok__kepala");
  const visualDi = (el) => (el.matches(VIS) && !bukan(el) ? el : [...el.querySelectorAll(VIS)].find((x) => !bukan(x))) || null;
  const lima = !!document.querySelector('details.blok[data-blok="blok-mulai"]');
  let h2 = document.getElementById("inti");
  if (mutasi === "tanpa-inti" && h2) { (h2.closest(".sl-heading-wrapper") || h2).remove(); h2 = null; }
  let host = null, dasar;
  if (h2) {
    dasar = "inti";
    // Starlight membungkus heading: <div class="sl-heading-wrapper"><h2/><a class="sl-anchor-link"><svg/></a></div>
    const awal = h2.closest(".sl-heading-wrapper") || h2;
    const adaH2 = (n) => n.tagName === "H2" || !!n.querySelector("h2");
    for (let el = awal.nextElementSibling; el && !adaH2(el); el = el.nextElementSibling) if (visualDi(el)) { host = el; break; }
    if (!host) return { dasar, error: "tidak ada visual di antara Inti dan H2 berikutnya (Snippet tidak dihitung)" };
  } else {
    if (lima) return { dasar: "inti", error: "halaman lima blok tanpa Inti" };
    const blok = document.querySelector('details.blok[data-blok="blok-kebutuhan"]') || document.querySelector("details.blok");
    if (!blok) return { tanpaInti: true };
    dasar = blok.dataset.blok === "blok-kebutuhan" ? "Kebutuhan" : "blok pertama";
    host = [...blok.querySelectorAll(".blok__isi > *")].find(visualDi) || null;
    if (!host) return { dasar, info: true, error: "tidak ada visual di blok" };
  }
  if (mutasi === "snippet") {
    const s = document.createElement("div");
    s.className = "highlight bb-snippet";
    s.innerHTML = "<pre><code>kode pengganti visual</code></pre>";
    host.replaceWith(s);
    host = null;
    for (let el = s; el && !(el.tagName === "H2" || el.querySelector?.("h2")); el = el.nextElementSibling) if (visualDi(el)) { host = el; break; }
    if (!host) return { dasar, error: "tidak ada visual di antara Inti dan H2 berikutnya (Snippet tidak dihitung)" };
  }
  if (mutasi === "turun") { const g = document.createElement("div"); g.style.height = "2000px"; host.before(g); }
  // Widget yang dirender sesudah hidrasi: tunggu sampai isinya muncul (paling lama 5 s). Halaman yang tidak dinilai
  // tidak ditunggu; host widget yang tidak merender figure diukur dari kotak host-nya sendiri.
  for (let i = 0; dasar === "inti" && i < 50 && !host.matches("figure, img, svg") && !host.querySelector("figure, img, svg"); i++) await new Promise((r) => setTimeout(r, 100));
  const vis = (host.matches("figure, img, svg") ? host : host.querySelector("figure, img, svg")) || (dasar === "inti" ? null : host);
  if (!vis) return { dasar, error: "visual tidak muncul (widget gagal?)" };
  window.scrollTo(0, 0);
  const b = vis.getBoundingClientRect();
  if (b.height === 0) return { dasar, info: dasar !== "inti", error: "visual setinggi 0 px (belum dirender?)" };
  return { dasar, info: dasar !== "inti", bottom: Math.round(b.bottom), tinggi: window.innerHeight,
    scrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth };
}
const browser = awasi(await chromium.launch(), { alat: "layar" }); // batas waktu per halaman (keputusan 360)
let gagal = 0, tipis = 0;
for (const p of halaman()) {
  const baris = [];
  for (const v of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, isMobile: !!v.mobile, hasTouch: !!v.mobile, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(BASE + "/" + p, { waitUntil: "networkidle" });
    const r = await page.evaluate(ukur, null);
    // Beranda (keputusan 208): layar pertama = elemen [data-layar-pertama]. "semua" wajib utuh di 4 ukuran,
    // "desktop" (teka-teki) wajib utuh di lebar ≥ 1000 px; sisanya (peta, peran, masalah) boleh di bawah lipatan.
    const satu = p === "" ? await page.evaluate(() => {
      const els = [...document.querySelectorAll("[data-layar-pertama]")].filter((e) => e.dataset.layarPertama === "semua" || innerWidth >= 1000);
      const bawah = els.length ? Math.max(...els.map((e) => Math.round(e.getBoundingClientRect().bottom))) : 1e9;
      return [bawah, innerHeight, document.documentElement.scrollWidth > document.documentElement.clientWidth];
    }) : null;
    await ctx.close();
    if (satu) {
      const [bawah, layar, x] = satu, sisa = layar - bawah;
      if (sisa < 0 || x) { gagal++; baris.push(`  GAGAL ${v.name} beranda terpotong ${-sisa}px${x ? " + scroll horizontal" : ""}`); }
      else if (sisa < MIN) { tipis++; baris.push(`  tipis ${v.name} beranda sisa ${sisa}px`); }
      else baris.push(`  ok    ${v.name} beranda layar pertama utuh, sisa ${sisa}px`);
      continue;
    }
    if (r.tanpaInti) { baris.push(`  info  ${v.name} tanpa blok`); continue; }
    if (r.info) {
      // Halaman berblok tanpa Inti: diukur, tidak dinilai (keputusan 319). Scroll horizontal tetap gagal.
      if (r.scrollX) { gagal++; baris.push(`  GAGAL ${v.name} scroll horizontal`); }
      const m = r.error ? r.error : r.tinggi - r.bottom < 0 ? `visual terpotong ${r.bottom - r.tinggi}px` : `visual utuh, margin ${r.tinggi - r.bottom}px`;
      baris.push(`  info  ${v.name} ${r.dasar} (tidak dinilai): ${m}`);
      continue;
    }
    if (r.error) { gagal++; baris.push(`  GAGAL ${v.name} ${r.error}`); continue; }
    const margin = r.tinggi - r.bottom;
    if (r.scrollX) { gagal++; baris.push(`  GAGAL ${v.name} scroll horizontal`); }
    if (margin < 0) { gagal++; baris.push(`  GAGAL ${v.name} visual terpotong ${-margin}px`); }
    else if (margin < MIN) { tipis++; baris.push(`  tipis ${v.name} margin ${margin}px`); }
    else baris.push(`  ok    ${v.name} margin ${margin}px`);
  }
  console.log("/" + p); console.log(baris.join("\n"));
}
// Uji mutasi (kecuali --tanpa-mutasi, keputusan 319): halaman konsep pertama dirusak tiga cara di 375×667; pemeriksa
// wajib menolak ketiganya.
if (!process.argv.includes("--tanpa-mutasi")) {
  const konsep = halaman().find((p) => fs.readFileSync(path.resolve("dist", p, "index.html"), "utf8").includes('data-blok="blok-mulai"'));
  if (!konsep) { gagal++; console.log("GAGAL uji mutasi: tidak ada halaman lima blok di dist"); }
  else for (const [m, pola] of [["snippet", /tidak ada visual/], ["turun", /^terpotong/], ["tanpa-inti", /tanpa Inti/]]) {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(BASE + "/" + konsep, { waitUntil: "networkidle" });
    const r = await page.evaluate(ukur, m);
    await ctx.close();
    const temuan = r.error || (r.tinggi - r.bottom < 0 ? `terpotong ${r.bottom - r.tinggi}px` : "");
    if (!r.info && pola.test(temuan)) console.log(`ok uji mutasi ${m} di /${konsep}: ${temuan}`);
    else { gagal++; console.log(`GAGAL uji mutasi ${m} di /${konsep}: halaman yang dirusak lolos (${temuan || "visual utuh"})`); }
  }
}
await browser.close();
console.log(`\n${gagal ? "GAGAL" : "LOLOS"}: ${gagal} gagal, ${tipis} margin tipis.`);
process.exit(gagal ? 1 : 0);
