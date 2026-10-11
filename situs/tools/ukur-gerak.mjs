// Memeriksa fondasi gerak (I3, keputusan 231) di halaman uji /uji/gerak/:
// - tanpa reduced motion, catatan muncul dengan gerak (frame pertama sesudah klik: opacity < 1 atau masih tergeser);
// - dengan prefers-reduced-motion: reduce, catatan langsung tampil penuh di frame pertama (tanpa gerak), fungsi tetap.
// Juga memeriksa bahwa halaman tanpa gerak memuat 0 animasi saat dibuka (aturan: tidak ada animasi yang berjalan sendiri).
// Blok lipat (I5a, keputusan 238) di halaman konsep: klik kepala membuka/menutup dengan gerak (frame pertama belum penuh),
// dengan reduced motion langsung penuh/tertutup tanpa animasi, klik kedua di tengah gerak membalik arah, dan tanpa
// JavaScript <details> tetap bisa dibuka. Widget alur (I5c, keputusan 261): paket data bergerak hanya sesudah Berikutnya.
// Angka (I5d, keputusan 352): total jumlah-total dan saldo HP bergerak sesudah klik, langsung final dengan reduced motion.
//   node tools/ukur-gerak.mjs --url http://127.0.0.1:4321
//   node tools/ukur-gerak.mjs --url ... --axe /path/axe.min.js   # + axe-core di halaman uji, gelap dan terang
import { readFileSync, readdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const arg = (nama, bawaan) => {
  const i = process.argv.indexOf(nama);
  return i > -1 ? process.argv[i + 1] : bawaan;
};
const url = arg("--url", "http://127.0.0.1:4321");
const AXE = arg("--axe", process.env.AXE); // opsional: path axe.min.js, seperti audit-tampilan.mjs

// Klik tombol lalu ambil keadaan catatan di dua frame berikutnya (requestAnimationFrame).
async function ukur(page) {
  await page.goto(url + "/uji/gerak/", { waitUntil: "networkidle" });
  const tombol = page.locator(".contoh-gerak__tombol");
  await tombol.waitFor();
  // Island di-hydrate saat terlihat; tunggu sampai React memasang handler (tombol bereaksi).
  await page.waitForFunction(() => {
    const b = document.querySelector(".contoh-gerak__tombol");
    return b && Object.keys(b).some((k) => k.startsWith("__reactProps"));
  });
  const animasiAwal = await page.evaluate(() => document.getAnimations().length);
  const sampel = await page.evaluate(
    () =>
      new Promise((selesai) => {
        document.querySelector(".contoh-gerak__tombol").click();
        const hasil = [];
        const ambil = () => {
          const el = document.querySelector('[data-gerak="catatan"]');
          if (el) {
            const s = getComputedStyle(el);
            hasil.push({ opacity: Number(s.opacity), transform: s.transform });
          }
          if (hasil.length < 2) requestAnimationFrame(ambil);
          else selesai(hasil);
        };
        requestAnimationFrame(ambil);
      }),
  );
  await page.waitForTimeout(600);
  const akhir = await page.evaluate(() => {
    const s = getComputedStyle(document.querySelector('[data-gerak="catatan"]'));
    return { opacity: Number(s.opacity), transform: s.transform };
  });
  return { animasiAwal, sampel, akhir };
}

const diam = (s) => s.opacity === 1 && (s.transform === "none" || s.transform === "matrix(1, 0, 0, 1, 0, 0)");

const browser = await chromium.launch();
let gagal = 0;
for (const reducedMotion of ["no-preference", "reduce"]) {
  const page = await browser.newPage({ viewport: { width: 375, height: 667 }, reducedMotion });
  const r = await ukur(page);
  const awal = r.sampel[0];
  const bergerak = !diam(awal);
  const ok = r.animasiAwal === 0 && diam(r.akhir) && (reducedMotion === "reduce" ? !bergerak : bergerak);
  console.log(
    `${ok ? "ok" : "GAGAL"} ${reducedMotion}: animasi saat dimuat ${r.animasiAwal}, frame pertama opacity ${awal.opacity.toFixed(2)} transform ${awal.transform}, akhir opacity ${r.akhir.opacity}`,
  );
  if (!ok) gagal++;
  if (AXE) {
    // axe sesudah catatan terbuka (tombol dan panel sama-sama ada), dua tema.
    for (const tema of ["dark", "light"]) {
      await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), tema);
      await page.addScriptTag({ path: AXE });
      const v = await page.evaluate(async () => {
        const x = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
        return x.violations.map((p) => `${p.id}(${p.nodes.length})`);
      });
      console.log(`${v.length ? "GAGAL" : "ok"} axe ${reducedMotion} ${tema}: ${v.length ? v.join(", ") : "0 pelanggaran"}`);
      if (v.length) gagal++;
    }
  }
  await page.close();
}
// Blok lipat: klik sungguhan di kepala blok yang tertutup, lalu rekam dua frame berikutnya.
const HAL_BLOK = "/tahap-1/transaction/";
const BLOK = 'details.blok[data-blok="blok-paham"]';
async function klikBlok(page) {
  await page.evaluate(() => {
    window.__frame = [];
    let mulai = false;
    document.addEventListener("click", () => { mulai = true; }, { capture: true, once: true });
    const ambil = () => {
      const el = document.querySelector('details.blok[data-blok="blok-paham"]');
      if (mulai) window.__frame.push({ open: el.open, tinggi: el.querySelector(".blok__isi").getBoundingClientRect().height, opacity: Number(getComputedStyle(el.querySelector(".blok__isi")).opacity), animasi: document.getAnimations().length });
      if (window.__frame.length < 2) requestAnimationFrame(ambil);
    };
    requestAnimationFrame(ambil);
  });
  await page.click(BLOK + " > summary");
  await page.waitForFunction(() => window.__frame.length >= 2);
  return page.evaluate(() => window.__frame[0]);
}
const keadaanBlok = (page) =>
  page.evaluate((s) => { const el = document.querySelector(s); return { open: el.open, gaya: el.querySelector(".blok__isi").getAttribute("style"), tinggi: Math.round(el.querySelector(".blok__isi").getBoundingClientRect().height) }; }, BLOK);
for (const reducedMotion of ["no-preference", "reduce"]) {
  const page = await browser.newPage({ viewport: { width: 375, height: 667 }, reducedMotion });
  await page.goto(url + HAL_BLOK, { waitUntil: "networkidle" });
  await page.locator(BLOK + " > summary").scrollIntoViewIfNeeded();
  const animasiAwal = await page.evaluate(() => document.getAnimations().length);
  const buka = await klikBlok(page);
  await page.waitForTimeout(600);
  const terbuka = await keadaanBlok(page);
  const tutup = await klikBlok(page);
  await page.waitForTimeout(600);
  const tertutup = await keadaanBlok(page);
  const bersih = terbuka.open && terbuka.gaya === null && !tertutup.open && tertutup.gaya === null;
  const ok = reducedMotion === "reduce"
    ? bersih && animasiAwal === 0 && buka.open && buka.opacity === 1 && Math.round(buka.tinggi) === terbuka.tinggi && buka.animasi === 0 && !tutup.open && tutup.animasi === 0
    : bersih && animasiAwal === 0 && buka.open && buka.tinggi < terbuka.tinggi && buka.opacity < 1 && tutup.open && tutup.opacity <= 1;
  console.log(`${ok ? "ok" : "GAGAL"} blok ${reducedMotion}: frame pertama buka ${Math.round(buka.tinggi)}/${terbuka.tinggi} px opacity ${buka.opacity.toFixed(2)} animasi ${buka.animasi}; frame pertama tutup open=${tutup.open}; akhir gaya sementara ${bersih ? "bersih" : "TERSISA"}`);
  if (!ok) gagal++;
  if (reducedMotion === "no-preference") {
    // Disela: buka lalu klik lagi di tengah gerak; hasil akhirnya tertutup dan bersih.
    await page.click(BLOK + " > summary");
    await page.waitForTimeout(60);
    await page.click(BLOK + " > summary");
    await page.waitForTimeout(600);
    const s = await keadaanBlok(page);
    const okS = !s.open && s.gaya === null;
    console.log(`${okS ? "ok" : "GAGAL"} blok disela: akhir open=${s.open}, gaya sementara ${s.gaya === null ? "bersih" : s.gaya}`);
    if (!okS) gagal++;
  }
  if (AXE && reducedMotion === "no-preference") {
    await page.click(BLOK + " > summary");
    await page.waitForTimeout(600);
    for (const tema of ["dark", "light"]) {
      await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), tema);
      await page.addScriptTag({ path: AXE });
      const v = await page.evaluate(async () => {
        const x = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
        return x.violations.map((p) => `${p.id}(${p.nodes.length})`);
      });
      console.log(`${v.length ? "GAGAL" : "ok"} axe blok ${tema}: ${v.length ? v.join(", ") : "0 pelanggaran"}`);
      if (v.length) gagal++;
    }
  }
  await page.close();
}
{
  // Tanpa JavaScript: <details> bawaan browser tetap bisa dibuka.
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 667 } });
  const page = await ctx.newPage();
  await page.goto(url + HAL_BLOK);
  await page.click(BLOK + " > summary");
  const open = await page.locator(BLOK).evaluate((el) => el.open);
  console.log(`${open ? "ok" : "GAGAL"} blok tanpa JavaScript: klik kepala membuka blok`);
  if (!open) gagal++;
  await ctx.close();
}

// Jawaban teka-teki di beranda (I5b, keputusan 248): tanpa gerak saat dimuat; sesudah pilihan ditekan jawaban
// masuk dengan gerak (frame pertama belum opacity 1); dengan reduced motion frame pertama sudah keadaan akhir.
for (const reducedMotion of ["no-preference", "reduce"]) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 657 }, reducedMotion });
  await page.goto(url + "/", { waitUntil: "networkidle" });
  await page.waitForSelector(".tb-pilih:not([disabled])");
  const r = await page.evaluate(async () => {
    const animasiAwal = document.getAnimations().length;
    document.querySelector(".tb-pilih").click();
    await new Promise((s) => requestAnimationFrame(() => s()));
    const el = document.querySelector(".tb-hasil");
    const awal = el ? Number(getComputedStyle(el).opacity) : -1;
    const anim = document.getAnimations().length;
    await new Promise((s) => setTimeout(s, 600));
    return { animasiAwal, awal, anim, akhir: el ? Number(getComputedStyle(el).opacity) : -1 };
  });
  const ok = r.animasiAwal === 0 && r.akhir === 1 && (reducedMotion === "reduce" ? r.awal === 1 && r.anim === 0 : r.awal < 1 && r.anim > 0);
  console.log(`${ok ? "ok" : "GAGAL"} teka-teki ${reducedMotion}: animasi saat dimuat ${r.animasiAwal}, frame pertama opacity ${r.awal.toFixed(2)}, animasi ${r.anim}, akhir opacity ${r.akhir}`);
  if (!ok) gagal++;
  await page.close();
}
// Berikutnya blok 1 (K1xe, keputusan 257): blok 1 menutup selagi tombolnya di layar; kepala blok tujuan tidak boleh
// meloncat jauh ke atas layar. Tombol digulir ke tengah layar dulu, lalu diklik dari halaman (bukan page.click, yang
// menggulir sendiri), lalu scrollY dan top kepala blok tujuan disampel per requestAnimationFrame selama 1,2 detik.
// Lolos bila di frame pertama sesudah klik top blok tujuan di dalam viewport, atau sisa gulirnya ≤ satu tinggi
// viewport; akhirnya kepala blok tujuan di layar dan memegang fokus. Dengan reduced motion frame pertama sudah
// keadaan akhir (tanpa gulir halus, 0 animasi). Halaman: semua ADR di registry dan satu halaman konsep (1.32).
const registri = JSON.parse(readFileSync(new URL("../data/cerita.json", import.meta.url), "utf8"));
const halBerikutnya = [
  ...registri.halaman.filter((h) => h.jenis === "adr" && h.ada).map((h) => h.path),
  registri.halaman.find((h) => h.nomor === "1.32").path,
].map((p) => "/" + p.replace(/\.mdx?$/, "/"));
for (const pth of halBerikutnya) for (const [w, h] of [[375, 667], [1366, 657]]) for (const reducedMotion of ["no-preference", "reduce"]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion });
  await page.goto(url + pth, { waitUntil: "networkidle" });
  const r = await page.evaluate(async () => {
    const tunggu = (ms) => new Promise((ok) => setTimeout(ok, ms));
    const btn = document.querySelector("details.blok button.blok__lanjut");
    const ke = document.querySelector(`details.blok[data-blok="${btn.dataset.ke}"]`);
    btn.scrollIntoView({ block: "center", behavior: "instant" });
    await tunggu(300);
    const ambil = () => ({ y: Math.round(scrollY), top: Math.round(ke.getBoundingClientRect().top), animasi: document.getAnimations().length });
    const s = [];
    const t0 = performance.now();
    btn.click();
    await new Promise((ok) => { const f = () => { s.push(ambil()); performance.now() - t0 < 1200 ? requestAnimationFrame(f) : ok(); }; requestAnimationFrame(f); });
    return { s, vh: innerHeight, fokus: document.activeElement === ke.querySelector("summary") };
  });
  const f1 = r.s[0], akhir = r.s.at(-1);
  const sisa = Math.max(...r.s.map((x) => Math.abs(x.y - akhir.y)));
  const diLayar = (t) => t >= 0 && t < r.vh;
  const ok = reducedMotion === "reduce"
    ? diLayar(f1.top) && f1.y === akhir.y && f1.animasi === 0 && r.fokus
    : (diLayar(f1.top) || sisa <= r.vh) && diLayar(akhir.top) && r.fokus;
  console.log(`${ok ? "ok" : "GAGAL"} Berikutnya blok 1 ${pth} ${w}x${h} ${reducedMotion}: frame pertama top ${f1.top} px, sisa gulir ${sisa} px (vh ${r.vh}), akhir top ${akhir.top} px, fokus ${r.fokus ? "di blok tujuan" : "HILANG"}`);
  if (!ok) gagal++;
  await page.close();
}
// Widget alur (I5c, keputusan 261): 0 animasi saat dimuat; sesudah Berikutnya paket bergerak dari komponen asal
// (frame pertama masih tergeser, ada animasi); dengan reduced motion frame pertama sudah di posisi akhir tanpa
// animasi. Posisi paket saat diam sama di kedua mode, di rel vertikal (375) dan jalur mendatar (1366).
const HAL_ALUR = "/tahap-1/fitur-bayar/"; // empat komponen: rel vertikal di 375, mendatar di 1366
const diamAlur = {};
for (const [w, h] of [[375, 667], [1366, 657]]) for (const reducedMotion of ["no-preference", "reduce"]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion });
  await page.goto(url + HAL_ALUR, { waitUntil: "networkidle" });
  await page.waitForSelector(".bb-alur .bb-predict button");
  const r = await page.evaluate(async () => {
    const tunggu = (ms) => new Promise((ok) => setTimeout(ok, ms));
    const frame = () => new Promise((ok) => requestAnimationFrame(() => ok()));
    const animasiAwal = document.getAnimations().length;
    document.querySelectorAll("details").forEach((d) => (d.open = true));
    const alur = document.querySelector(".bb-alur");
    alur.scrollIntoView({ block: "center", behavior: "instant" });
    alur.querySelector(".bb-predict button").click();
    const maju = [...alur.querySelectorAll("button")].find((b) => b.textContent.startsWith("Berikutnya"));
    const pk = alur.querySelector(".bb-alur__packet");
    const ambil = () => { const s = getComputedStyle(pk); const b = pk.getBoundingClientRect(); return { translate: s.translate, opacity: Number(s.opacity), anim: pk.getAnimations().length, x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) }; };
    maju.click();
    await frame();
    const muncul = ambil();
    await tunggu(600);
    maju.click();
    await frame();
    const f1 = ambil();
    await tunggu(600);
    const akhir = ambil();
    const ar = alur.getBoundingClientRect();
    return { animasiAwal, muncul, f1, akhir: { ...akhir, x: akhir.x - Math.round(ar.left), y: akhir.y - Math.round(ar.top) }, vertikal: alur.classList.contains("is-vertikal") };
  });
  const nol = (t) => t === "none" || /^0px( 0px)?$/.test(t);
  const ok = reducedMotion === "reduce"
    ? r.animasiAwal === 0 && r.muncul.anim === 0 && r.muncul.opacity === 1 && r.f1.anim === 0 && nol(r.f1.translate) && nol(r.akhir.translate)
    : r.animasiAwal === 0 && r.muncul.anim > 0 && r.muncul.opacity < 1 && r.f1.anim > 0 && !nol(r.f1.translate) && r.akhir.anim === 0 && nol(r.akhir.translate);
  console.log(`${ok ? "ok" : "GAGAL"} alur ${w}x${h} ${r.vertikal ? "rel vertikal" : "mendatar"} ${reducedMotion}: animasi saat dimuat ${r.animasiAwal}; langkah 1 frame pertama opacity ${r.muncul.opacity.toFixed(2)} animasi ${r.muncul.anim}; langkah 2 frame pertama translate ${r.f1.translate} animasi ${r.f1.anim}; diam di ${r.akhir.x},${r.akhir.y}`);
  if (!ok) gagal++;
  (diamAlur[w] ||= []).push(r.akhir);
  await page.close();
}
for (const [w, [a, b]] of Object.entries(diamAlur)) {
  const ok = Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1;
  console.log(`${ok ? "ok" : "GAGAL"} alur ${w}: posisi diam paket sama dengan dan tanpa reduced motion (${a.x},${a.y} vs ${b.x},${b.y})`);
  if (!ok) gagal++;
}

// Widget alur di HP (perbaikan PR #175, keputusan 261): di 375x667, di semua halaman alur, paket dan tombol Berikutnya
// terlihat bersamaan sesudah setiap klik. Sebelum klik, tombol digulir ke tepi bawah layar (posisi terburuk sesudah
// pembaca menggulir sampai tombol tampak). Paket diukur di frame pertama (masih di komponen asal) dan saat diam:
// jarak atas paket ke atas tombol <= tinggi layar dikurangi header tetap dan tinggi tombol, dan paket berada di antara
// bawah header tetap dan bawah viewport. HP lanskap 667x375 dan 844x390 ikut (I5c-c, keputusan 350): sebelumnya lebar
// widget di 667x375 >= 600 px, jadi tata letak lebar menaruh detail dan HP di antara paket dan tombol (±190 dari 199 klik
// paket di luar layar).
const DOCS = new URL("../src/content/docs/", import.meta.url);
const halAlur = readdirSync(DOCS, { recursive: true })
  .filter((f) => f.endsWith(".mdx") && readFileSync(new URL(f, DOCS), "utf8").includes('<WidgetLama nama="alur"'))
  .map((f) => ("/" + f.replace(/\\/g, "/").replace(/\.mdx$/, "").replace(/(^|\/)index$/, "") + "/").replace(/\/+/g, "/"))
  .sort();
for (const [lw, lh] of [[375, 667], [667, 375], [844, 390]]) {
let klikAlur = 0, jarakMaks = 0;
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
          terlihat: !pk.hidden && atas >= hdr && bawah <= vh && bt.top >= hdr && bt.bottom <= vh,
          ukuran: `paket ${Math.round(atas)}..${Math.round(bawah)} tombol ${Math.round(bt.top)}..${Math.round(bt.bottom)}` });
      }
    }
    return hasil;
  }) : [];
  const buruk = r.filter((x) => x.jarak > x.batas || !x.terlihat);
  klikAlur += r.length;
  jarakMaks = Math.max(jarakMaks, ...r.map((x) => x.jarak));
  if (!r.length || buruk.length) alurGagal.push(`${pth} ${buruk.length}/${r.length} (jarak maks ${Math.max(0, ...r.map((x) => x.jarak))} px; ${buruk.slice(0, 3).map((x) => `langkah ${x.k}: ${x.ukuran}`).join("; ")})`);
  await page.close();
}
const okAlur = halAlur.length > 0 && !alurGagal.length;
const klikLuar = alurGagal.reduce((t, x) => t + Number(x.split(" ")[1].split("/")[0]), 0);
console.log(`${okAlur ? "ok" : "GAGAL"} alur ${lw}x${lh}: paket dan tombol Berikutnya terlihat bersamaan di ${halAlur.length} halaman, ${klikAlur} klik, ${klikLuar} di luar layar; jarak paket ke tombol maks ${jarakMaks} px (batas ${lh} dikurangi header dan tinggi tombol)`);
for (const x of alurGagal.slice(0, 8)) console.log(`  GAGAL ${x}`);
if (!okAlur) gagal++;
}

// Fokus bertahan saat lebar melewati batas mode sempit (perbaikan PR #175 putaran 2, keputusan 261): urutSempit memindah
// tombol dengan insertBefore, dan Chrome membuang fokus elemen yang dipindah. Fokus di Berikutnya, lalu ubah ukuran
// 375x667 -> 667x375 -> 375x667 -> 1366x657 -> 1366x450 -> 1366x657 -> 375x667; sesudah setiap ubah ukuran
// activeElement tetap tombol itu, dan mode sempit sesuai ukuran (keputusan 350: sempit juga bila tinggi layar < 500 px;
// 1366x657 -> 1366x450 hanya mengubah tinggi, jadi lebar widget tetap dan yang menata ulang adalah matchMedia).
{
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
  await page.goto(url + HAL_ALUR, { waitUntil: "networkidle" });
  await page.waitForSelector(".bb-alur .bb-predict button");
  await page.evaluate(() => {
    const alur = document.querySelector(".bb-alur");
    alur.querySelector(".bb-predict button").click();
    const maju = [...alur.querySelectorAll(".bb-row button")].find((b) => b.textContent.startsWith("Berikutnya"));
    maju.dataset.ujiFokus = "1";
    maju.focus();
  });
  const jejak = [];
  for (const [w, h, mauSempit] of [[667, 375, true], [375, 667, true], [1366, 657, false], [1366, 450, true], [1366, 657, false], [375, 667, true]]) {
    await page.setViewportSize({ width: w, height: h });
    const r = await page.evaluate(async () => {
      for (let k = 0; k < 3; k++) await new Promise((ok) => requestAnimationFrame(ok));
      const ae = document.activeElement;
      return { tetap: ae?.dataset?.ujiFokus === "1", nama: ae ? ae.tagName : "null", sempit: document.querySelector(".bb-alur").classList.contains("is-sempit") };
    });
    jejak.push(`${w}x${h} ${r.sempit ? "sempit" : "lebar"}${r.sempit === mauSempit ? "" : " (SALAH)"} ${r.tetap ? "Berikutnya" : r.nama}`);
    if (!r.tetap || r.sempit !== mauSempit) jejak.gagal = true;
  }
  console.log(`${jejak.gagal ? "GAGAL" : "ok"} alur fokus: Berikutnya tetap terfokus dan mode sempit sesuai ukuran saat ubah ukuran (${jejak.join(" -> ")})`);
  if (jejak.gagal) gagal++;
  await page.close();
}

// Angka bergerak (I5d, keputusan 352): total di widget jumlah-total (1.11) dan saldo di HP widget alur (1.9).
// Klik sungguhan (locator.click); teks direkam tiap frame oleh listener capture yang dipasang sebelum klik.
// Tanpa reduced motion: frame pertama masih nilai lama, ada angka antara, frame terakhir nilai akhir. Dengan reduce:
// frame pertama sudah nilai akhir. Di kedua mode: semua frame berformat rupiah, nilai akhir sama dengan yang dibaca
// pembaca layar di setiap frame (teks sel tanpa bagian aria-hidden, aria-label HP), ukuran wadah tidak berubah selama
// tween, dan teks tidak berubah saat dimuat. Seleksi dan salin (perbaikan review, keputusan 352): sesudah tween setiap sel
// angka berisi satu nilai, klik ganda pada angka menyeleksi satu rupiah, salinan tabel tanpa dua rupiah berdempetan, dan
// HTML hasil build (teks tanpa JavaScript, juga yang dibaca Pagefind) berisi satu nilai per sel angka.
const RUPIAH = /^−?Rp\d{1,3}(\.\d{3})*$/;
const satuNilai = (t) => RUPIAH.test(t) || /^\d+$/.test(t);
const kasusAngka = [
  {
    nama: "jumlah-total 1.11", path: "/" + registri.halaman.find((h) => h.nomor === "1.11").path.replace(/\.mdx?$/, "/"),
    widget: ".jt", siap: "astro-island:not([ssr]) .jt", tebak: ".jt .bb-predict__opts button", maju: ".jt .bb-btn--primary",
    sel: ".jt-total td > span:last-child", wadah: ".jt-tabel", sr: ".jt-total td", angka: ".jt-tabel td.jt-angka", salin: ".jt-tabel",
    ssr: /<td class="jt-angka"[^>]*>([\s\S]*?)<\/td>/g,
  },
  {
    nama: "saldo HP 1.9", path: HAL_ALUR, widget: ".bb-alur", siap: ".bb-alur .bb-predict button", tebak: ".bb-alur .bb-predict button",
    maju: ".bb-alur button.bb-btn--primary",
    sel: ".bb-alur__phone .bb-hp__saldo strong", wadah: ".bb-alur__phone", sr: ".bb-alur__phone .bb-hp", angka: ".bb-alur__phone .bb-hp__saldo strong",
  },
];
for (const c of kasusAngka.filter((k) => k.ssr)) {
  const html = await (await fetch(url + c.path)).text();
  const sel = [...html.matchAll(c.ssr)].map((m) => m[1].replace(/<!--[\s\S]*?-->|<[^>]+>/g, ""));
  const ok = sel.length > 0 && sel.every(satuNilai);
  console.log(`${ok ? "ok" : "GAGAL"} angka ${c.nama} HTML build: ${sel.length} sel angka, ${ok ? "masing-masing satu nilai" : "ada yang dobel: " + sel.filter((t) => !satuNilai(t)).slice(0, 2).join(", ")}`);
  if (!ok) gagal++;
}
for (const c of kasusAngka) for (const reducedMotion of ["no-preference", "reduce"]) {
  const page = await browser.newPage({ viewport: { width: 375, height: 667 }, reducedMotion });
  await page.goto(url + c.path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
  await page.locator(c.widget).first().scrollIntoViewIfNeeded();
  await page.waitForSelector(c.siap);
  const teksMuat = await page.evaluate((s) => document.querySelector(s)?.textContent ?? null, c.sel);
  await page.waitForTimeout(400);
  const muatTetap = teksMuat === (await page.evaluate((s) => document.querySelector(s)?.textContent ?? null, c.sel));
  await page.locator(c.tebak).first().click();
  let r = null;
  for (let k = 0; k < 8 && !r; k++) {
    await page.evaluate(({ sel, wadah, sr }) => {
      window.__angka = null;
      // Yang dibaca pembaca layar: aria-label, atau teks tanpa bagian aria-hidden.
      const aks = (e) => !e ? "" : e.getAttribute("aria-label") ?? [...e.childNodes].map((n) => n.nodeType === 3 ? n.data
        : n.nodeType === 1 && n.getAttribute("aria-hidden") !== "true" ? aks(n) : "").join("");
      window.__aks = () => aks(document.querySelector(sr));
      document.addEventListener("click", () => {
        const rek = { sebelum: document.querySelector(sel)?.textContent, frame: [], aks: [], ukuran: [] };
        window.__angka = rek;
        const f = () => {
          rek.frame.push(document.querySelector(sel)?.textContent);
          rek.aks.push(aks(document.querySelector(sr)));
          const b = document.querySelector(wadah).getBoundingClientRect();
          rek.ukuran.push(`${Math.round(b.width * 2) / 2}x${Math.round(b.height * 2) / 2}`);
          if (rek.frame.length < 40) requestAnimationFrame(f);
        };
        requestAnimationFrame(f);
      }, { capture: true, once: true });
    }, c);
    await page.locator(c.maju).first().click();
    await page.waitForTimeout(800);
    const x = await page.evaluate(() => ({ ...window.__angka, sr: window.__aks() }));
    if (x.sebelum && x.frame.at(-1) && x.sebelum !== x.frame.at(-1)) r = { k, ...x };
  }
  let ok = muatTetap && !!r;
  let ket = "saldo tidak berubah";
  if (r) {
    const akhir = r.frame.at(-1);
    const antara = new Set(r.frame.filter((t) => t !== r.sebelum && t !== akhir)).size;
    const format = r.frame.every((t) => RUPIAH.test(t));
    const ukuranTetap = new Set(r.ukuran).size === 1;
    const srAkhir = [...r.aks, r.sr].every((t) => t === akhir || t.includes(` ${akhir}`));
    ok &&= format && ukuranTetap && srAkhir && (reducedMotion === "reduce" ? r.frame[0] === akhir : r.frame[0] === r.sebelum && antara > 0);
    ket = `klik ${r.k + 1}: ${r.sebelum} -> frame pertama ${r.frame[0]}, ${antara} angka antara, akhir ${akhir}; format rupiah ${format}; ukuran wadah ${[...new Set(r.ukuran)].join("/")}; pembaca layar nilai akhir ${srAkhir}`;
  }
  const teksAngka = await page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => e.textContent), c.angka);
  const angkaSatu = teksAngka.length > 0 && teksAngka.every(satuNilai);
  await page.locator(c.sel).first().dblclick();
  const pilih = await page.evaluate(() => getSelection().toString().trim());
  const salin = !c.salin ? "" : await page.evaluate((s) => {
    const g = getSelection(), rg = document.createRange();
    rg.selectNodeContents(document.querySelector(s));
    g.removeAllRanges();
    g.addRange(rg);
    return g.toString();
  }, c.salin);
  const salinSatu = !/\d−?Rp\d/.test(salin);
  ok &&= angkaSatu && RUPIAH.test(pilih) && salinSatu;
  ket += `; teks sel angka ${angkaSatu ? "satu nilai" : "DOBEL " + teksAngka.find((t) => !satuNilai(t))}; klik ganda menyeleksi "${pilih}"`;
  if (c.salin) ket += `; salinan tabel ${salinSatu ? "satu nilai per sel" : "DOBEL " + salin.match(/\S*\d−?Rp\d\S*/)[0]}`;
  console.log(`${ok ? "ok" : "GAGAL"} angka ${c.nama} ${reducedMotion}: teks saat dimuat ${muatTetap ? "tetap" : "BERUBAH"}; ${ket}`);
  if (!ok) gagal++;
  await page.close();
}
await browser.close();
console.log(gagal ? "Fondasi gerak GAGAL" : "Reduced motion mematikan gerak (contoh, blok, teka-teki, Berikutnya, alur, angka); tanpa itu gerak berjalan");
process.exit(gagal ? 1 : 0);
