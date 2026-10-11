// CLS saat dimuat di semua halaman yang memuat widget alur (I5c-b, keputusan 263).
// Skrip widget (/widgets/*), data skenario, dan modul /_astro/*.js ditunda TUNDA ms, supaya yang terukur adalah
// pergantian versi statis (HTML build) ke versi hidup, bukan kebetulan skrip sudah ada sebelum paint pertama.
// Dua posisi: atas halaman (seperti dibuka biasa) dan widget alur pertama yang terlihat di dekat atas layar
// (seperti dibuka dari tautan ke bloknya), dengan scroll anchoring dimatikan seperti browser yang tidak memilikinya.
// Pergeseran tanpa input (hadRecentInput false) dijumlah. Gagal bila tinggi host alur sebelum skrip (versi statis dari
// build) berbeda lebih dari SELISIH px dengan versi hidupnya: hanya itu yang bisa membuat alur menggeser isi lain.
// CLS halaman di atas BATAS dicetak "lewat" dengan sumbernya tanpa menggagalkan: di CI sumbernya bagian lain halaman
// (mis. .content-panel naik 29 px di HP saat modul datang), bukan alur (keputusan 263).
//   node tools/ukur-cls.mjs --url http://127.0.0.1:4321 [--halaman /tahap-1/perjalanan-request/] [--rinci]
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const arg = (nama, bawaan) => {
  const i = process.argv.indexOf(nama);
  return i > -1 ? process.argv[i + 1] : bawaan;
};
const url = arg("--url", "http://127.0.0.1:4321");
const satu = arg("--halaman", null);
const rinci = process.argv.includes("--rinci");
const BATAS = 0.1;
const TUNDA = 600;
const SELISIH = 1;
const UKURAN = [
  { width: 375, height: 667 },
  { width: 1366, height: 657 },
];

// Halaman alur dibaca dari hasil build, bukan daftar tulis tangan.
function halamanAlur(dir, akar = dir, hasil = []) {
  for (const n of readdirSync(dir)) {
    const p = path.join(dir, n);
    if (statSync(p).isDirectory()) halamanAlur(p, akar, hasil);
    else if (n === "index.html" && readFileSync(p, "utf8").includes('data-bb="alur"'))
      hasil.push("/" + path.relative(akar, path.dirname(p)).split(path.sep).join("/") + (dir === akar ? "" : "/"));
  }
  return hasil.sort();
}
const daftar = satu ? [satu] : halamanAlur(path.resolve("dist"));

const browser = await chromium.launch();

async function ukur(h, ukuran, posisi) {
  const ctx = await browser.newContext({ viewport: ukuran });
  const page = await ctx.newPage();
  await page.route(/\/(widgets\/.+\.(js|json)|_astro\/.+\.js)(\?.*)?$/, async (rute) => {
    await new Promise((s) => setTimeout(s, TUNDA));
    await rute.continue().catch(() => {});
  });
  await page.addInitScript(() => {
    window.__cls = { total: 0, sumber: [] };
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        if (e.hadRecentInput) continue;
        window.__cls.total += e.value;
        const n = e.sources?.[0]?.node;
        const kelas = n && n.className ? "." + String(n.className).split(" ")[0] : "";
        const r = e.sources?.[0];
        const teks = n && n.textContent ? ` "${n.textContent.trim().slice(0, 30)}"` : "";
        const geser = r ? ` y${Math.round(r.previousRect.y)}→${Math.round(r.currentRect.y)}` : "";
        window.__cls.sumber.push(`${e.value.toFixed(3)} ${n ? n.nodeName.toLowerCase() + kelas : "?"}${geser}${teks}`);
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  // Parser selesai (skrip widget klasik sudah jalan, skenario dan modul masih tertunda): versi statis yang tampil.
  await page.goto(url + h, { waitUntil: "commit" });
  await page.waitForFunction(() => document.readyState !== "loading", null, { polling: 20 });
  const tinggi = () =>
    page.evaluate(() => [...document.querySelectorAll('[data-bb="alur"]')].map((x) => (x.getClientRects().length ? x.offsetHeight : null)));
  const sebelum = await tinggi();
  if (posisi === "widget") {
    // Sebelum skrip datang: gulir ke widget alur pertama yang tampil (blok terbuka).
    await page.evaluate(() => {
      const w = [...document.querySelectorAll('[data-bb="alur"]')].find((x) => x.getClientRects().length);
      for (const e of [document.documentElement, document.body]) e.style.overflowAnchor = "none";
      if (w) window.scrollTo(0, w.getBoundingClientRect().top + window.scrollY - 80);
      return w ? `scrollY ${Math.round(scrollY)} tinggi ${w.offsetHeight} hidup ${!!w.querySelector(".bb-alur")}` : "tanpa host terlihat";
    }).then((x) => rinci && console.log("  ", h, ukuran.width, x));
  }
  // Selesai bila setiap host alur sudah berisi versi hidup.
  await page
    .waitForFunction(() => [...document.querySelectorAll('[data-bb="alur"]')].every((x) => x.querySelector(".bb-alur")), null, {
      timeout: 15000,
    })
    .catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(400);
  const hasil = await page.evaluate(() => window.__cls);
  const sesudah = await tinggi();
  hasil.selisih = Math.max(0, ...sebelum.map((t, i) => (t == null ? 0 : Math.abs(t - sesudah[i]))));
  hasil.tinggi = sebelum.map((t, i) => `${t}→${sesudah[i]}`).join(" ");
  await ctx.close();
  return hasil;
}

let gagal = 0;
const baris = [];
const antre = daftar.flatMap((h) => UKURAN.flatMap((u) => ["atas", "widget"].map((p) => ({ h, u, p }))));
const hasilPer = new Map();
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (let t = antre.shift(); t; t = antre.shift()) {
      const r = await ukur(t.h, t.u, t.p);
      const k = `${t.h} ${t.u.width}x${t.u.height}`;
      const lama = hasilPer.get(k);
      if (!lama || r.total > lama.total) hasilPer.set(k, { ...r, posisi: t.p, selisih: Math.max(r.selisih, lama?.selisih ?? 0) });
      else lama.selisih = Math.max(lama.selisih, r.selisih);
    }
  }),
);
for (const [k, r] of [...hasilPer].sort()) {
  const buruk = r.selisih > SELISIH;
  if (buruk) gagal++;
  baris.push(`${buruk ? "GAGAL" : r.total > BATAS ? "lewat" : r.total > 0.01 ? "tipis" : "ok"} ${r.total.toFixed(3)} selisih ${r.selisih}px ${k} (${r.posisi})` +
    (rinci || buruk || r.total > BATAS ? `  tinggi ${r.tinggi}; ` + r.sumber.slice(0, 4).join(", ") : ""));
}
await browser.close();
console.log(baris.join("\n"));
const nilai = [...hasilPer.values()].map((r) => r.total);
const maks = (w) => Math.max(0, ...[...hasilPer].filter(([k]) => k.includes(` ${w}x`)).map(([, r]) => r.total));
console.log(
  `CLS alur: ${daftar.length} halaman, maks 375 ${maks(375).toFixed(3)}, maks 1366 ${maks(1366).toFixed(3)}, ` +
    `${new Set([...hasilPer].filter(([, r]) => r.total > 0.01).map(([k]) => k.split(" ")[0])).size} halaman > 0,01, ` +
    `${[...hasilPer.values()].filter((r) => r.total > BATAS).length} lewat ${BATAS}, selisih tinggi maks ${Math.max(0, ...[...hasilPer.values()].map((r) => r.selisih))}px, ${gagal} gagal (batas selisih ${SELISIH}px)`,
);
if (!nilai.length) {
  console.error("Tidak ada halaman alur di dist/.");
  process.exit(1);
}
process.exit(gagal ? 1 : 0);
