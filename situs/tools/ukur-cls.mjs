// CLS saat dimuat di semua halaman yang memuat widget alur (I5c-b, keputusan 263; I5c-d, keputusan 351).
// Skrip widget (/widgets/*), data skenario, dan modul /_astro/*.js ditunda TUNDA ms, supaya yang terukur adalah
// pergantian versi statis (HTML build) ke versi hidup, bukan kebetulan skrip sudah ada sebelum paint pertama.
// Dua posisi: atas halaman (seperti dibuka biasa) dan widget alur pertama yang terlihat di dekat atas layar
// (seperti dibuka dari tautan ke bloknya), dengan scroll anchoring dimatikan seperti browser yang tidak memilikinya.
// Pergeseran tanpa input (hadRecentInput false) dijumlah. Gagal bila CLS halaman di atas BATAS pada salah satu ukuran
// dan posisi (sumbernya dicetak), atau bila host alur sebelum skrip (versi statis dari build) berbeda lebih dari SELISIH px
// dengan versi hidupnya: tinggi host, jarak elemen sesudah host ke elemen sebelum host (menangkap margin yang runtuh
// keluar host, yang tidak terlihat di offsetHeight), serta x dan lebar host (di 1440 px wadahnya 1024 px dan host
// fit-content bisa lebih sempit dari wadah).
// Race (I5e, keputusan 353): halaman dengan widget race ikut diukur dengan cara yang sama (host race versi statis dari
// build lawan versi hidup race.js), ditambah posisi ketiga "race": widget race pertama yang tampil di dekat atas layar.
// Ukuran 667x375 (keputusan 350): mode sempit juga bergantung tinggi layar, yang tidak terbaca container query.
// Tiruan CI (keputusan 351): di CI Satoshi sering datang sesudah paint pertama dan fallback Linux jauh lebih lebar, jadi
// baris membungkus ulang saat font tukar. --font-telat <ms> menunda /fonts/*, --fallback <font> mengganti system-ui di CSS
// (mis. Verdana, selebar DejaVu Sans). Contoh: --font-telat 1500 --fallback Verdana. Gerbang memakai mode ini (keputusan
// 359), supaya hasil CI tidak bergantung kapan font datang: font selalu datang sesudah paint pertama.
// Penundaan dihitung dari navigasi (tenggat), bukan per request: modul yang diimpor modul lain dan skenario yang diambil
// alur.js datang segera sesudah tenggat, tidak menunggu TUNDA lagi di setiap tingkat impor (keputusan 359).
//   node tools/ukur-cls.mjs --url http://127.0.0.1:4321 [--halaman /tahap-1/perjalanan-request/] [--rinci]
//     [--font-telat 1500] [--fallback Verdana] [--ukuran 375,667] [--paralel 8]
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
const FONT_TELAT = Number(arg("--font-telat", 0));
const FALLBACK = arg("--fallback", null);
const BATAS = 0.1;
// Di tiruan CI modul datang sesudah font, supaya versi statis tetap diukur dengan font akhirnya.
const TUNDA = 600 + FONT_TELAT;
const SELISIH = 1;
// Konteks yang berjalan bersamaan. Waktu ukur hampir seluruhnya menunggu tenggat font dan modul, bukan CPU, jadi mode
// font telat di gerbang memakai 8 (keputusan 359).
const PARALEL = Number(arg("--paralel", 4));
const SEMUA_UKURAN = [
  { width: 375, height: 667 },
  // HP lanskap: mode sempit alur ikut tinggi layar (< 500 px, keputusan 350), versi statis lewat media query tinggi.
  { width: 667, height: 375 },
  { width: 1366, height: 657 },
  { width: 1440, height: 900 },
];
const PILIH = arg("--ukuran", null)?.split(",").map(Number);
const UKURAN = PILIH ? SEMUA_UKURAN.filter((u) => PILIH.includes(u.width)) : SEMUA_UKURAN;
if (!UKURAN.length || (PILIH && UKURAN.length !== PILIH.length)) {
  console.error(`--ukuran tidak dikenal: ${PILIH} (dikenal: ${SEMUA_UKURAN.map((u) => u.width)})`);
  process.exit(1);
}

// Halaman alur dan race dibaca dari hasil build, bukan daftar tulis tangan.
const HOST = '[data-bb="alur"], [data-bb="race"]';
const halRace = new Set();
function halamanAlur(dir, akar = dir, hasil = []) {
  for (const n of readdirSync(dir)) {
    const p = path.join(dir, n);
    if (statSync(p).isDirectory()) halamanAlur(p, akar, hasil);
    else if (n === "index.html") {
      const html = readFileSync(p, "utf8");
      const h = "/" + path.relative(akar, path.dirname(p)).split(path.sep).join("/") + (dir === akar ? "" : "/");
      if (html.includes('data-bb="race"')) halRace.add(h);
      if (html.includes('data-bb="alur"') || html.includes('data-bb="race"')) hasil.push(h);
    }
  }
  return hasil.sort();
}
const semua = halamanAlur(path.resolve("dist"));
const daftar = satu ? [satu] : semua;

const browser = await chromium.launch();

async function ukur(h, ukuran, posisi) {
  const ctx = await browser.newContext({ viewport: ukuran });
  const page = await ctx.newPage();
  let mulai = Date.now();
  const tunggu = (ms) => new Promise((s) => setTimeout(s, Math.max(0, mulai + ms - Date.now())));
  await page.route(/\/(widgets\/.+\.(js|json)|_astro\/.+\.js)(\?.*)?$/, async (rute) => {
    await tunggu(TUNDA);
    await rute.continue().catch(() => {});
  });
  if (FONT_TELAT)
    await page.route(/\/fonts\//, async (rute) => {
      await tunggu(FONT_TELAT);
      await rute.continue().catch(() => {});
    });
  if (FALLBACK)
    await page.route(/\/_astro\/.+\.css(\?.*)?$/, async (rute) => {
      const res = await rute.fetch();
      await rute.fulfill({ response: res, body: (await res.text()).replaceAll("system-ui", FALLBACK) });
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
  mulai = Date.now();
  await page.goto(url + h, { waitUntil: "commit" });
  await page.waitForFunction(() => document.readyState !== "loading", null, { polling: 20 });
  // Per host terlihat: tinggi, x, lebar, dan jarak elemen sesudah host ke bawah elemen sebelum host. Saudara dicari
  // naik ke induk bila host anak pertama atau terakhir, supaya margin yang runtuh lewat induk ikut terukur.
  const tinggi = () =>
    page.evaluate((sel) =>
      [...document.querySelectorAll(sel)].map((x) => {
        if (!x.getClientRects().length) return null;
        const dekat = (arah) => {
          for (let n = x; n; n = n.parentElement) if (n[arah]) return n[arah];
          return null;
        };
        const r = x.getBoundingClientRect();
        const a = dekat("previousElementSibling");
        const b = dekat("nextElementSibling");
        const jarak = a && b ? b.getBoundingClientRect().top - a.getBoundingClientRect().bottom : null;
        return { h: x.offsetHeight, x: r.left, w: r.width, jarak };
      }), HOST,
    );
  await page.evaluate(() => document.fonts.ready);
  const sebelum = await tinggi();
  if (posisi === "race") {
    await page.evaluate(() => {
      const w = [...document.querySelectorAll('[data-bb="race"]')].find((x) => x.getClientRects().length);
      for (const e of [document.documentElement, document.body]) e.style.overflowAnchor = "none";
      if (w) window.scrollTo(0, w.getBoundingClientRect().top + window.scrollY - 80);
    });
  }
  if (posisi === "widget") {
    // Sebelum skrip datang: gulir ke widget alur pertama yang tampil (blok terbuka).
    await page.evaluate(() => {
      const w = [...document.querySelectorAll('[data-bb="alur"]')].find((x) => x.getClientRects().length);
      for (const e of [document.documentElement, document.body]) e.style.overflowAnchor = "none";
      if (w) window.scrollTo(0, w.getBoundingClientRect().top + window.scrollY - 80);
      return w ? `scrollY ${Math.round(scrollY)} tinggi ${w.offsetHeight} hidup ${!!w.querySelector(".bb-alur")}` : "tanpa host terlihat";
    }).then((x) => rinci && console.log("  ", h, ukuran.width, x));
  }
  // Selesai bila setiap host alur sudah berisi versi hidup: versi statis dari build juga .bb-alur, jadi yang dicari
  // .bb-alur tanpa .bb-alur--statis (alur.js mengganti isi host).
  await page
    .waitForFunction(() => [...document.querySelectorAll('[data-bb="alur"]')].every((x) => x.querySelector(".bb-alur:not(.bb-alur--statis)")) &&
      [...document.querySelectorAll('[data-bb="race"]')].every((x) => x.classList.contains("bb-race")), null, {
      timeout: 15000,
    })
    .catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(400);
  const hasil = await page.evaluate(() => window.__cls);
  const sesudah = await tinggi();
  const beda = (k) => Math.max(0, ...sebelum.map((t, i) => (t == null || sesudah[i] == null || t[k] == null ? 0 : Math.abs(t[k] - sesudah[i][k]))));
  const bulat = (v) => Math.round(v * 100) / 100;
  hasil.rinci = { tinggi: beda("h"), saudara: bulat(beda("jarak")), x: bulat(beda("x")), lebar: bulat(beda("w")) };
  hasil.selisih = Math.max(...Object.values(hasil.rinci));
  hasil.tinggi = sebelum
    .map((t, i) => (t ? `${t.h}→${sesudah[i]?.h} lebar ${bulat(t.w)}→${bulat(sesudah[i]?.w)} jarak ${bulat(t.jarak)}→${bulat(sesudah[i]?.jarak)}` : "tersembunyi"))
    .join("; ");
  await ctx.close();
  return hasil;
}

let gagal = 0;
const baris = [];
const antre = daftar.flatMap((h) => UKURAN.flatMap((u) => ["atas", "widget", ...(halRace.has(h) ? ["race"] : [])].map((p) => ({ h, u, p }))));
const hasilPer = new Map();
await Promise.all(
  Array.from({ length: PARALEL }, async () => {
    for (let t = antre.shift(); t; t = antre.shift()) {
      const r = await ukur(t.h, t.u, t.p);
      const k = `${t.h} ${t.u.width}x${t.u.height}`;
      const lama = hasilPer.get(k);
      const gabung = (a, b) => Object.fromEntries(Object.keys(a).map((n) => [n, Math.max(a[n], b?.[n] ?? 0)]));
      if (!lama || r.total > lama.total) hasilPer.set(k, { ...r, posisi: t.p, selisih: Math.max(r.selisih, lama?.selisih ?? 0), rinci: gabung(r.rinci, lama?.rinci) });
      else Object.assign(lama, { selisih: Math.max(lama.selisih, r.selisih), rinci: gabung(lama.rinci, r.rinci) });
    }
  }),
);
for (const [k, r] of [...hasilPer].sort()) {
  const buruk = r.selisih > SELISIH || r.total > BATAS;
  if (buruk) gagal++;
  const d = r.rinci;
  baris.push(`${buruk ? "GAGAL" : r.total > 0.01 ? "tipis" : "ok"} ${r.total.toFixed(3)} selisih tinggi ${d.tinggi} saudara ${d.saudara} x ${d.x} lebar ${d.lebar}px ${k} (${r.posisi})` +
    (rinci || buruk || r.total > BATAS ? `  tinggi ${r.tinggi}; ` + r.sumber.slice(0, 4).join(", ") : ""));
}
await browser.close();
console.log(baris.join("\n"));
const nilai = [...hasilPer.values()].map((r) => r.total);
const maks = (w) => Math.max(0, ...[...hasilPer].filter(([k]) => k.includes(` ${w}x`)).map(([, r]) => r.total));
const maksRinci = (n) => Math.max(0, ...[...hasilPer.values()].map((r) => r.rinci[n]));
console.log(
  `CLS alur: ${daftar.length} halaman, maks 375 ${maks(375).toFixed(3)}, maks 667 ${maks(667).toFixed(3)}, maks 1366 ${maks(1366).toFixed(3)}, maks 1440 ${maks(1440).toFixed(3)}, ` +
    `${new Set([...hasilPer].filter(([, r]) => r.total > 0.01).map(([k]) => k.split(" ")[0])).size} halaman > 0,01, ` +
    `${[...hasilPer.values()].filter((r) => r.total > BATAS).length} di atas batas CLS ${BATAS}, selisih maks: tinggi ${maksRinci("tinggi")} saudara ${maksRinci("saudara")} x ${maksRinci("x")} lebar ${maksRinci("lebar")}px, ${gagal} gagal (batas CLS ${BATAS}, selisih ${SELISIH}px)` +
    (FONT_TELAT || FALLBACK ? `, tiruan CI: font telat ${FONT_TELAT} ms, fallback ${FALLBACK ?? "-"}` : ""),
);
if (!nilai.length) {
  console.error("Tidak ada halaman alur di dist/.");
  process.exit(1);
}
process.exit(gagal ? 1 : 0);
