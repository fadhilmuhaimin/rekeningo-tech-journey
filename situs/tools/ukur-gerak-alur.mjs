// Widget alur: di semua halaman alur, paket data dan tombol Berikutnya terlihat bersamaan sesudah setiap klik
// (dipindah dari ukur-gerak.mjs, keputusan 865, supaya CI membaginya per ukuran layar dan menyaring halaman).
//   node tools/ukur-gerak-alur.mjs --url http://127.0.0.1:4321 [--ukuran 375x667,667x375,844x390,1366x657]
// --ukuran memilih sebagian ukuran (bawaan keempatnya). Daftar halaman bisa dipersempit lewat UKUR_HALAMAN
// (lib/pilih.mjs, keputusan 866); bawaan semua halaman alur. Pagar "ada halaman alur" hanya berlaku tanpa penyaringan.
import { readFileSync, readdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { awasi } from "./lib/batas.mjs";
import { saring, terpilih } from "./lib/pilih.mjs";

const arg = (nama, bawaan) => {
  const i = process.argv.indexOf(nama);
  return i > -1 ? process.argv[i + 1] : bawaan;
};
const url = arg("--url", "http://127.0.0.1:4321");
const SEMUA_UKURAN = [[375, 667], [667, 375], [844, 390], [1366, 657]];
const PILIH_UKURAN = arg("--ukuran", null)?.split(",");
const UKURAN = PILIH_UKURAN ? SEMUA_UKURAN.filter(([w, h]) => PILIH_UKURAN.includes(`${w}x${h}`)) : SEMUA_UKURAN;
if (!UKURAN.length || (PILIH_UKURAN && UKURAN.length !== PILIH_UKURAN.length)) {
  console.error(`--ukuran tidak dikenal: ${PILIH_UKURAN} (dikenal: ${SEMUA_UKURAN.map(([w, h]) => `${w}x${h}`)})`);
  process.exit(1);
}

const browser = awasi(await chromium.launch(), { alat: "gerak-alur" }); // batas waktu per halaman (keputusan 360)
let gagal = 0;
// Widget alur di HP (perbaikan PR #175, keputusan 261): di 375x667, di semua halaman alur, paket dan tombol Berikutnya
// terlihat bersamaan sesudah setiap klik. Sebelum klik, tombol digulir ke tepi bawah layar (posisi terburuk sesudah
// pembaca menggulir sampai tombol tampak). Paket diukur di frame pertama (masih di komponen asal) dan saat diam:
// jarak atas paket ke atas tombol <= tinggi layar dikurangi header tetap dan tinggi tombol, dan paket berada di antara
// bawah header tetap dan bawah viewport. HP lanskap 667x375 dan 844x390 ikut (I5c-c, keputusan 350): sebelumnya lebar
// widget di 667x375 >= 600 px, jadi tata letak lebar menaruh detail dan HP di antara paket dan tombol (±190 dari 199 klik
// paket di luar layar). Desktop 1366x657 ikut (I5c-e, keputusan 358): tata letak lebar dulu menaruh tebakan, varian, lalu
// detail dan HP di antara paket dan tombol, jadi detail yang memanjang mendorong Berikutnya ke bawah layar; sekarang
// urutannya sama dengan mode sempit. Baris ringkasan juga menghitung klik yang membuat tombol sendiri keluar layar.
const DOCS = new URL("../src/content/docs/", import.meta.url);
const disaring = terpilih() !== null;
const halAlur = saring(readdirSync(DOCS, { recursive: true })
  .filter((f) => f.endsWith(".mdx") && readFileSync(new URL(f, DOCS), "utf8").includes('<WidgetLama nama="alur"'))
  .map((f) => ("/" + f.replace(/\\/g, "/").replace(/\.mdx$/, "").replace(/(^|\/)index$/, "") + "/").replace(/\/+/g, "/"))
  .sort(), (x) => x, { alat: "gerak-alur" });
for (const [lw, lh] of UKURAN) {
let klikAlur = 0, jarakMaks = 0, tombolLuar = 0;
const alurGagal = [];
for (const pth of halAlur) {
  const page = await browser.newPage({ viewport: { width: lw, height: lh } });
  await page.goto(url + pth, { waitUntil: "networkidle" });
  const ada = await page.waitForSelector(".bb-alur .bb-row button", { state: "attached", timeout: 10000 }).catch(() => null);
  const r = ada ? await page.evaluate(async () => {
    const frame = () => new Promise((ok) => requestAnimationFrame(() => ok()));
    document.querySelectorAll("details").forEach((d) => (d.open = true));
    const vh = innerHeight, hasil = [];
    const hd = document.querySelector("header.header");
    const hdr = hd && getComputedStyle(hd).position === "fixed" ? hd.getBoundingClientRect().bottom : 0;
    for (const alur of document.querySelectorAll(".bb-alur")) {
      alur.querySelector(".bb-predict button")?.click();
      const maju = [...alur.querySelectorAll(".bb-row button")].find((b) => b.textContent.startsWith("Berikutnya"));
      const pk = alur.querySelector(".bb-alur__packet");
      for (let k = 1; maju && !maju.disabled && k <= 40; k++) {
        scrollBy({ top: maju.getBoundingClientRect().bottom - (vh - 8), behavior: "instant" });
        maju.click();
        const f0 = pk.getBoundingClientRect();
        await Promise.all(pk.getAnimations().map((a) => a.finished.catch(() => null)));
        await frame();
        const diam = pk.getBoundingClientRect(), bt = maju.getBoundingClientRect();
        const atas = Math.min(f0.top, diam.top), bawah = Math.max(f0.bottom, diam.bottom);
        hasil.push({ k, jarak: Math.round(bt.top - atas), batas: Math.floor(vh - hdr - bt.height),
          tombol: bt.top >= hdr && bt.bottom <= vh,
          terlihat: !pk.hidden && atas >= hdr && bawah <= vh && bt.top >= hdr && bt.bottom <= vh,
          ukuran: `paket ${Math.round(atas)}..${Math.round(bawah)} tombol ${Math.round(bt.top)}..${Math.round(bt.bottom)}` });
      }
    }
    return hasil;
  }) : [];
  const buruk = r.filter((x) => x.jarak > x.batas || !x.terlihat);
  klikAlur += r.length;
  tombolLuar += r.filter((x) => !x.tombol).length;
  jarakMaks = Math.max(jarakMaks, ...r.map((x) => x.jarak));
  if (!r.length || buruk.length) alurGagal.push(`${pth} ${buruk.length}/${r.length} (jarak maks ${Math.max(0, ...r.map((x) => x.jarak))} px; ${buruk.slice(0, 3).map((x) => `langkah ${x.k}: ${x.ukuran}`).join("; ")})`);
  await page.close();
}
const okAlur = (disaring || halAlur.length > 0) && !alurGagal.length;
const klikLuar = alurGagal.reduce((t, x) => t + Number(x.split(" ")[1].split("/")[0]), 0);
console.log(`${okAlur ? "ok" : "GAGAL"} alur ${lw}x${lh}: paket dan tombol Berikutnya terlihat bersamaan di ${halAlur.length} halaman, ${klikAlur} klik, ${klikLuar} di luar layar (tombol Berikutnya sendiri ${tombolLuar}); jarak paket ke tombol maks ${jarakMaks} px (batas ${lh} dikurangi header dan tinggi tombol)`);
for (const x of alurGagal.slice(0, 8)) console.log(`  GAGAL ${x}`);
if (!okAlur) gagal++;
}

await browser.close();
console.log(gagal ? "Gerak alur GAGAL" : "Paket dan tombol Berikutnya terlihat bersamaan di semua halaman alur");
process.exit(gagal ? 1 : 0);
