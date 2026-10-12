// Memeriksa teks di ilustrasi blok cerita (Ilustrasi.astro) tetap di dalam bingkainya (keputusan 222).
// Untuk tiap <text>, bingkainya adalah <rect> terkecil yang memuat titik jangkar teks; tanpa rect, viewBox SVG.
// Diukur di browser sungguhan karena lebar teks bergantung pada font yang termuat.
//   node tools/ukur-ilustrasi.mjs --url http://127.0.0.1:4321
import { chromium } from "@playwright/test";
import { awasi } from "./lib/batas.mjs";

const arg = (nama, bawaan) => {
  const i = process.argv.indexOf(nama);
  return i > -1 ? process.argv[i + 1] : bawaan;
};
const url = arg("--url", "http://127.0.0.1:4321");
const halaman = ["/tahap-1/prd-v1/", "/tahap-1/m1-nominal-minus/", "/tahap-1/m2-amount-nominal/",
  "/tahap-1/m3-tanda-kutip/", "/tahap-1/m4-rp70000-hilang/", "/tahap-1/m5-angka-di-url/",
  "/tahap-1/m6-deploy-hari-senin/"];
const ukuran = [[375, 667], [1366, 657]];
const JARAK = 2; // satuan viewBox minimal antara teks dan tepi bingkai

const browser = awasi(await chromium.launch(), { alat: "ilustrasi" }); // batas waktu per halaman (keputusan 360)
let gagal = 0;
for (const [w, h] of ukuran) {
  for (const tema of ["dark", "light"]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.addInitScript((t) => localStorage.setItem("starlight-theme", t), tema);
    for (const p of halaman) {
      await page.goto(url + p, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const hasil = await page.evaluate((jarak) => {
        const keluar = [];
        for (const svg of document.querySelectorAll("figure.blok__ilustrasi svg")) {
          const vb = svg.viewBox.baseVal;
          const rects = [...svg.querySelectorAll("rect")].map((r) => r.getBBox());
          for (const t of svg.querySelectorAll("text")) {
            const b = t.getBBox();
            const ax = t.x.baseVal[0]?.value ?? b.x, ay = t.y.baseVal[0]?.value ?? b.y;
            const isi = rects.filter((r) => ax >= r.x && ax <= r.x + r.width && ay >= r.y && ay <= r.y + r.height)
              .sort((a, c) => a.width * a.height - c.width * c.height)[0] ?? { x: vb.x, y: vb.y, width: vb.width, height: vb.height };
            const lebih = Math.max(isi.x + jarak - b.x, b.x + b.width - (isi.x + isi.width - jarak), 0);
            if (lebih > 0) keluar.push(`"${t.textContent}" keluar ${lebih.toFixed(1)} (teks ${b.x.toFixed(1)}–${(b.x + b.width).toFixed(1)}, bingkai ${isi.x}–${isi.x + isi.width})`);
          }
        }
        return keluar;
      }, JARAK);
      for (const k of hasil) console.log(`GAGAL ${w}x${h} ${tema} ${p}: ${k}`);
      gagal += hasil.length;
    }
    await page.close();
  }
}
await browser.close();
console.log(gagal ? `${gagal} teks ilustrasi keluar bingkai` : `Teks ilustrasi di dalam bingkai: ${halaman.length} halaman × 2 ukuran × 2 tema`);
process.exit(gagal ? 1 : 0);
