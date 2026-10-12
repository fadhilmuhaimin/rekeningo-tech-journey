// Detail langkah widget alur dekat jalur sesudah menebak (I5c-g, keputusan 363). Di setiap halaman alur, pembaca
// menebak, lalu menekan Berikutnya sampai akhir jalur (dan jalur varian bila ada). Sesudah setiap klik diukur:
//   jarak: atas judul detail dikurangi bawah paket (px). Di tata letak lebar judul ada di samping HP, jadi yang di
//          antara keduanya hanya bagian yang dipasang di antara jalur dan detail (tombol, dan dulu tebakan serta varian).
//   utuh:  widget dari kepalanya (judul, chip sumber), jalur, tombol, sampai seluruh penjelasan langkah muat dalam satu
//          layar: dengan atas widget tepat di bawah header tetap (+ 8 px), bawah penjelasan <= tinggi layar. Bila tidak,
//          pembaca menggulir untuk membaca langkah lalu menggulir balik ke tombol. (Diukur dari atas jalur, tanpa kepala
//          widget, angka sebelum perbaikan 286/318: terlalu longgar untuk membedakan tata letak.)
// Di 1366x657 (pagar): jarak <= 60 px di setiap langkah, dan penjelasan utuh di >= 87% langkah (20 dari 23, ANTREAN
// I5c-g). Ukuran lain (--ukuran) hanya dicetak: di 375x667 rel vertikal dan kepala widget sudah ±300 px, jadi penjelasan
// panjang memang digulir. Gerbang hanya menjalankan 1366x657.
//   node tools/ukur-detail-alur.mjs --url http://127.0.0.1:4321 [--ukuran 1366x657,375x667] [--rinci] [--tanpa-pagar]
import { readFileSync, readdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { awasi } from "./lib/batas.mjs";

const arg = (nama, bawaan) => {
  const i = process.argv.indexOf(nama);
  return i > -1 ? process.argv[i + 1] : bawaan;
};
const url = arg("--url", "http://127.0.0.1:4321");
const RINCI = process.argv.includes("--rinci");
const PAGAR = !process.argv.includes("--tanpa-pagar");
const JARAK_MAKS = 60, UTUH_MIN = 0.87;

const DOCS = new URL("../src/content/docs/", import.meta.url);
const halAlur = readdirSync(DOCS, { recursive: true })
  .filter((f) => f.endsWith(".mdx") && readFileSync(new URL(f, DOCS), "utf8").includes('<WidgetLama nama="alur"'))
  .map((f) => ("/" + f.replace(/\\/g, "/").replace(/\.mdx$/, "").replace(/(^|\/)index$/, "") + "/").replace(/\/+/g, "/"))
  .sort();

const browser = awasi(await chromium.launch(), { alat: "detail-alur" }); // batas waktu per halaman (keputusan 360)
let gagal = 0;
const UKURAN = arg("--ukuran", "1366x657").split(",").map((u) => u.split("x").map(Number));
for (const [w, h] of UKURAN) {
  const semua = [], perHal = [];
  for (const pth of halAlur) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(url + pth, { waitUntil: "networkidle" });
    const ada = await page.waitForSelector(".bb-alur .bb-row button", { state: "attached", timeout: 10000 }).catch(() => null);
    const r = ada ? await page.evaluate(async () => {
      const frame = () => new Promise((ok) => requestAnimationFrame(() => ok()));
      document.querySelectorAll("details").forEach((d) => (d.open = true));
      await frame();
      const vh = innerHeight, hasil = [];
      const hd = document.querySelector("header.header");
      const hdr = hd && getComputedStyle(hd).position === "fixed" ? hd.getBoundingClientRect().bottom : 0;
      let wi = 0;
      for (const alur of document.querySelectorAll(".bb-alur")) {
        wi++;
        alur.querySelector(".bb-predict button")?.click();
        await frame();
        const maju = [...alur.querySelectorAll(".bb-row button")].find((b) => b.textContent.startsWith("Berikutnya"));
        const pk = alur.querySelector(".bb-alur__packet"), judul = alur.querySelector(".bb-alur__title");
        const jelas = alur.querySelector(".bb-alur__explain"), cb = alur.querySelector(".bb-alur__varian input");
        const ukurLangkah = async (jalur) => {
          await Promise.all(pk.getAnimations().map((a) => a.finished.catch(() => null)));
          await frame();
          const atas = alur.getBoundingClientRect().top;
          const p = pk.getBoundingClientRect(), j = judul.getBoundingClientRect(), e = jelas.getBoundingClientRect();
          const butuh = Math.round(e.bottom - atas), muat = Math.floor(vh - hdr - 8);
          hasil.push({ w: wi, jalur, k: Number(judul.textContent.split(".")[0]), jarak: Math.round(j.top - p.bottom),
            utuh: butuh <= muat, butuh, muat });
        };
        for (let k = 1; maju && !maju.disabled && k <= 40; k++) { maju.click(); await ukurLangkah("utama"); }
        if (cb && !cb.disabled) {
          cb.click();  // lompat ke langkah pertama yang berbeda (alur.js)
          await ukurLangkah("varian");
          for (let k = 1; maju && !maju.disabled && k <= 40; k++) { maju.click(); await ukurLangkah("varian"); }
        }
      }
      return hasil;
    }) : [];
    semua.push(...r);
    const utuh = r.filter((x) => x.utuh).length, jm = Math.max(-Infinity, ...r.map((x) => x.jarak));
    perHal.push({ pth, n: r.length, utuh, jm, jmin: Math.min(Infinity, ...r.map((x) => x.jarak)) });
    if (RINCI) for (const x of r) console.log(`  ${w}x${h} ${pth} w${x.w} ${x.jalur} langkah ${x.k}: jarak ${x.jarak} px, penjelasan ${x.butuh}/${x.muat} px ${x.utuh ? "utuh" : "DIGULIR"}`);
    await page.close();
  }
  const n = semua.length, utuh = semua.filter((x) => x.utuh).length;
  const jarak = semua.map((x) => x.jarak).sort((a, b) => a - b);
  const pagar = PAGAR && w === 1366;
  const lebih = semua.filter((x) => x.jarak > JARAK_MAKS).length;
  const ok = !pagar || (halAlur.length > 0 && perHal.every((p) => p.n > 0) && !lebih && utuh / n >= UTUH_MIN);
  console.log(`${ok ? "ok" : "GAGAL"} detail alur ${w}x${h}: ${halAlur.length} halaman, ${n} langkah; jarak paket ke judul detail ${jarak[0]}..${jarak[n - 1]} px (median ${jarak[n >> 1]}, ${lebih} di atas ${JARAK_MAKS}); penjelasan utuh tanpa gulir ${utuh}/${n} (${Math.round((100 * utuh) / n)}%)${pagar ? ` (pagar: jarak <= ${JARAK_MAKS} px, utuh >= ${UTUH_MIN * 100}%)` : " (dicetak saja)"}`);
  for (const p of perHal.filter((p) => !p.n || p.jm > JARAK_MAKS || p.utuh < p.n).sort((a, b) => b.jm - a.jm))
    console.log(`  ${p.n ? "" : "TANPA LANGKAH "}${p.pth} jarak ${p.jmin}..${p.jm} px, utuh ${p.utuh}/${p.n}`);
  if (!ok) gagal++;
}
await browser.close();
process.exit(gagal ? 1 : 0);
