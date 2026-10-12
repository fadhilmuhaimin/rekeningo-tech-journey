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
// panjang memang digulir.
// Varian: kotak centang "Ubah satu hal" ada di bawah detail, jadi detail dan jawaban yang berganti saat dicentang
// menggesernya; alur.js menggulir sebesar geserannya. Di 1366x657 gagal bila kotak bergeser > 1 px di satu widget.
// Fokus sesudah tebakan lewat keyboard (putaran 2, WCAG 2.2 SC 2.4.11, F110): di 375x667 pilihan pertama setiap tebakan
// difokus lalu Enter ditekan; sesudah gulir berhenti, fokus harus di Berikutnya widget itu dan tombolnya utuh di antara
// bawah header tetap dan bawah layar. Gagal bila ada satu yang tertutup header, di luar layar, atau terpotong. Uji mutasi
// di run yang sama: alur.js dilayani dengan next.focus() diganti next.focus({ preventScroll: true }) (bentuk putaran 1),
// dan alat gagal bila pemeriksaan fokus tidak menemukan satu pun tombol tertutup (pemeriksa yang tidak bisa gagal).
//   node tools/ukur-detail-alur.mjs --url http://127.0.0.1:4321 [--ukuran 1366x657,375x667] [--fokus 375x667]
//     [--tanpa-detail] [--tanpa-fokus] [--tanpa-mutasi] [--rinci] [--tanpa-pagar]
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
const UKURAN = process.argv.includes("--tanpa-detail") ? [] : arg("--ukuran", "1366x657").split(",").map((u) => u.split("x").map(Number));
for (const [w, h] of UKURAN) {
  const semua = [], perHal = [], geserVarian = [];
  for (const pth of halAlur) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(url + pth, { waitUntil: "networkidle" });
    // Versi hidup saja: versi statis dari build (keputusan 263) juga punya .bb-row button.
    const ada = await page.waitForSelector(".bb-alur:not(.bb-alur--statis) .bb-row button", { state: "attached", timeout: 10000 }).catch(() => null);
    const r = ada ? await page.evaluate(async () => {
      const frame = () => new Promise((ok) => requestAnimationFrame(() => ok()));
      document.querySelectorAll("details").forEach((d) => (d.open = true));
      await frame();
      const vh = innerHeight, hasil = [];
      hasil.geserVarian = [];
      const hd = document.querySelector("header.header");
      const hdr = hd && getComputedStyle(hd).position === "fixed" ? hd.getBoundingClientRect().bottom : 0;
      let wi = 0;
      for (const alur of document.querySelectorAll(".bb-alur:not(.bb-alur--statis)")) {
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
          cb.scrollIntoView({ block: "center", behavior: "instant" });
          const t0 = cb.getBoundingClientRect().top;
          cb.click();  // lompat ke langkah pertama yang berbeda (alur.js)
          await ukurLangkah("varian");
          hasil.geserVarian.push(Math.round(Math.abs(cb.getBoundingClientRect().top - t0)));
          for (let k = 1; maju && !maju.disabled && k <= 40; k++) { maju.click(); await ukurLangkah("varian"); }
        }
      }
      return { langkah: hasil, geserVarian: hasil.geserVarian };
    }).then((x) => Object.assign(x.langkah, { geserVarian: x.geserVarian })) : [];
    semua.push(...r);
    geserVarian.push(...(r.geserVarian || []));
    const utuh = r.filter((x) => x.utuh).length, jm = Math.max(-Infinity, ...r.map((x) => x.jarak));
    perHal.push({ pth, n: r.length, utuh, jm, jmin: Math.min(Infinity, ...r.map((x) => x.jarak)) });
    if (RINCI) for (const x of r) console.log(`  ${w}x${h} ${pth} w${x.w} ${x.jalur} langkah ${x.k}: jarak ${x.jarak} px, penjelasan ${x.butuh}/${x.muat} px ${x.utuh ? "utuh" : "DIGULIR"}`);
    await page.close();
  }
  const n = semua.length, utuh = semua.filter((x) => x.utuh).length;
  const jarak = semua.map((x) => x.jarak).sort((a, b) => a - b);
  const pagar = PAGAR && w === 1366;
  const lebih = semua.filter((x) => x.jarak > JARAK_MAKS).length;
  const geserLebih = geserVarian.filter((g) => g > 1).length;
  const ok = !pagar || (halAlur.length > 0 && perHal.every((p) => p.n > 0) && !lebih && utuh / n >= UTUH_MIN && !geserLebih);
  console.log(`${ok ? "ok" : "GAGAL"} detail alur ${w}x${h}: ${halAlur.length} halaman, ${n} langkah; jarak paket ke judul detail ${jarak[0]}..${jarak[n - 1]} px (median ${jarak[n >> 1]}, ${lebih} di atas ${JARAK_MAKS}); penjelasan utuh tanpa gulir ${utuh}/${n} (${Math.round((100 * utuh) / n)}%)${pagar ? ` (pagar: jarak <= ${JARAK_MAKS} px, utuh >= ${UTUH_MIN * 100}%)` : " (dicetak saja)"}`);
  console.log(`  varian ${w}x${h}: kotak centang bergeser > 1 px saat dicentang di ${geserLebih}/${geserVarian.length} widget (maks ${Math.max(0, ...geserVarian)} px${pagar ? "; pagar: 0" : "; dicetak saja"})`);
  for (const p of perHal.filter((p) => !p.n || p.jm > JARAK_MAKS || p.utuh < p.n).sort((a, b) => b.jm - a.jm))
    console.log(`  ${p.n ? "" : "TANPA LANGKAH "}${p.pth} jarak ${p.jmin}..${p.jm} px, utuh ${p.utuh}/${p.n}`);
  if (!ok) gagal++;
}
// Fokus sesudah tebakan lewat keyboard. mutasi: berhenti di temuan pertama (cukup untuk membuktikan pemeriksa bisa gagal).
async function cekFokus(w, h, mutasi) {
  const hasil = [];
  let terganti = 0;
  for (const pth of halAlur) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    if (mutasi) await page.route("**/widgets/alur.js", async (r) => {
      const res = await r.fetch(), asli = await res.text();
      const ubah = asli.replace(/next\.focus\(\)/g, () => (terganti++, "next.focus({ preventScroll: true })"));
      await r.fulfill({ response: res, body: ubah });
    });
    await page.goto(url + pth, { waitUntil: "networkidle" });
    await page.waitForSelector(".bb-alur:not(.bb-alur--statis) .bb-row button", { state: "attached", timeout: 10000 }).catch(() => null);
    await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
    const widget = page.locator(".bb-alur:not(.bb-alur--statis)");
    for (let k = 0, n = await widget.count(); k < n; k++) {
      const opsi = widget.nth(k).locator(".bb-predict__opts button").first();
      if (!(await opsi.count())) continue;
      await opsi.focus();  // seperti Tab: browser menggulir pilihan ke layar
      await page.keyboard.press("Enter");  // click dengan event.detail 0
      const r = await page.evaluate(async (k) => {
        const frame = () => new Promise((ok) => requestAnimationFrame(() => ok()));
        let y = scrollY;
        for (let f = 0, diam = 0; f < 120 && diam < 5; f++) { await frame(); if (scrollY === y) diam++; else { diam = 0; y = scrollY; } }
        const alur = document.querySelectorAll(".bb-alur:not(.bb-alur--statis)")[k];
        const maju = [...alur.querySelectorAll(".bb-row button")].find((b) => b.textContent.startsWith("Berikutnya"));
        const hd = document.querySelector("header.header");
        const hdr = hd && getComputedStyle(hd).position === "fixed" ? hd.getBoundingClientRect().bottom : 0;
        const b = maju.getBoundingClientRect(), vh = innerHeight;
        const status = document.activeElement !== maju ? `fokus di ${document.activeElement?.tagName}`
          : b.top >= hdr && b.bottom <= vh ? "utuh"
          : b.bottom <= 0 ? "di atas layar" : b.bottom <= hdr ? "di bawah header" : b.top >= vh ? "di bawah layar" : "terpotong";
        return { status, tombol: `${Math.round(b.top)}..${Math.round(b.bottom)}`, hdr: Math.round(hdr) };
      }, k);
      hasil.push({ pth, k, ...r });
      if (RINCI || (!mutasi && r.status !== "utuh")) console.log(`  ${mutasi ? "mutasi " : ""}fokus ${w}x${h} ${pth} w${k + 1}: ${r.status} (tombol ${r.tombol}, header ${r.hdr})`);
      if (mutasi && r.status !== "utuh") { await page.close(); return { hasil, terganti }; }
    }
    await page.close();
  }
  return { hasil, terganti };
}
if (!process.argv.includes("--tanpa-fokus")) {
  const [w, h] = arg("--fokus", "375x667").split("x").map(Number);
  const { hasil } = await cekFokus(w, h, false);
  const per = {};
  for (const x of hasil) per[x.status] = (per[x.status] || 0) + 1;
  const ok = hasil.length > 0 && hasil.every((x) => x.status === "utuh");
  console.log(`${ok ? "ok" : "GAGAL"} fokus sesudah tebakan lewat keyboard ${w}x${h}: ${hasil.length} tebakan; ${Object.entries(per).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  if (!ok) gagal++;
  if (!process.argv.includes("--tanpa-mutasi")) {
    const m = await cekFokus(w, h, true);
    const temu = m.hasil.find((x) => x.status !== "utuh");
    const okm = m.terganti > 0 && !!temu;
    console.log(`${okm ? "ok" : "GAGAL"} uji mutasi fokus (next.focus dengan preventScroll, ${m.terganti} panggilan diganti): ${temu ? `tertangkap di ${temu.pth} w${temu.k + 1}, ${temu.status}, sesudah ${m.hasil.length} tebakan` : "tidak tertangkap; pemeriksa fokus tidak bisa gagal"}`);
    if (!okm) gagal++;
  }
}
await browser.close();
process.exit(gagal ? 1 : 0);
