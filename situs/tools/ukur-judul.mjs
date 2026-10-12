// Memeriksa jarak judul halaman (h1) ke baris meta ("Baca … menit") (K0d, keputusan 223).
// Celah = jarak antara kotak teks baris terakhir judul dan kotak teks baris pertama meta (Range.getClientRects).
// Judul dua baris dianggap menempel bila celahnya ke meta tidak lebih besar dari celah antar baris judul itu sendiri:
// mata lalu membaca meta sebagai baris ketiga judul (hukum kedekatan).
//   node tools/ukur-judul.mjs --url http://127.0.0.1:4321
import { chromium } from "@playwright/test";
import { awasi } from "./lib/batas.mjs";

const arg = (nama, bawaan) => {
  const i = process.argv.indexOf(nama);
  return i > -1 ? process.argv[i + 1] : bawaan;
};
const url = arg("--url", "http://127.0.0.1:4321");
const halaman = arg("--path", "/tahap-1/m4-rp70000-hilang/,/tahap-1/adr-transaction-koreksi/,/tahap-1/transaction/,/tahap-1/http/,/tahap-1/migration/").split(",");
const ukuran = [[375, 667], [1366, 657]];
const LEBIH = 4; // px: celah ke meta minimal sebesar celah antar baris judul + LEBIH

const browser = awasi(await chromium.launch()); // batas waktu per halaman (keputusan 360)
let gagal = 0;
for (const [w, h] of ukuran) {
  for (const tema of ["dark", "light"]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.addInitScript((t) => localStorage.setItem("starlight-theme", t), tema);
    for (const p of halaman) {
      await page.goto(url + p, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const r = await page.evaluate(() => {
        const baris = (el) => {
          const rg = document.createRange();
          rg.selectNodeContents(el);
          const tops = new Map();
          for (const k of rg.getClientRects()) {
            if (k.width < 1) continue;
            const key = Math.round(k.top);
            const ada = tops.get(key);
            tops.set(key, { top: Math.min(k.top, ada?.top ?? k.top), bottom: Math.max(k.bottom, ada?.bottom ?? k.bottom) });
          }
          return [...tops.values()].sort((a, b) => a.top - b.top);
        };
        const h1 = document.querySelector(".content-panel h1");
        const meta = document.querySelector(".sl-markdown-content p.meta");
        if (!h1 || !meta) return null;
        const bj = baris(h1), bm = baris(meta);
        const antar = bj.length > 1 ? bj[1].top - bj[0].bottom : null;
        return { n: bj.length, antar, keMeta: bm[0].top - bj.at(-1).bottom };
      });
      if (!r) { console.log(`LEWAT ${w}x${h} ${tema} ${p}: tanpa h1 atau meta`); continue; }
      const buruk = r.antar !== null && r.keMeta < r.antar + LEBIH;
      const teks = `${w}x${h} ${tema} ${p}: ${r.n} baris, antar baris ${r.antar?.toFixed(1) ?? "-"} px, ke meta ${r.keMeta.toFixed(1)} px`;
      console.log(`${buruk ? "GAGAL" : "ok"} ${teks}`);
      if (buruk) gagal++;
    }
    await page.close();
  }
}
await browser.close();
console.log(gagal ? `${gagal} judul menempel ke meta` : "Judul berjarak dari meta");
process.exit(gagal ? 1 : 0);
