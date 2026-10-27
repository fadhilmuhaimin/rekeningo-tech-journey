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
// Jawaban tebakan hanya di akhir jalur yang ditanyakan (alur-core.js bukaJawaban): di setiap widget ber-varian, sesudah
// menebak dan menekan Berikutnya sampai akhir, jawaban (.bb-predict__a) ada di akhir jalur utama bila predict.varian bukan
// true dan di akhir jalur varian bila true, tidak pernah di keduanya; mencentang varian menutupnya, melepasnya lalu
// berjalan ke akhir jalur utama membukanya lagi (predict.varian dibaca dari skenario widget itu lewat BB.fetchJSON).
// Cacat yang dijaga: jawaban tentang jalur utama muncul sesudah langkah varian, dengan "Tebakanmu benar" yang bertentangan
// dengan langkah di atasnya (tinjauan 3.18; 22 skenario). Uji mutasi di run yang sama: alur.js dilayani dengan pemanggilan
// core.bukaJawaban diganti kondisi lama (!d.predict.varian || varianOn); alat gagal bila pemeriksa tidak menemukannya.
//   node tools/ukur-detail-alur.mjs --url http://127.0.0.1:4321 [--ukuran 1366x657,375x667] [--fokus 375x667]
//     [--tanpa-detail] [--tanpa-fokus] [--tanpa-tebakan] [--tanpa-mutasi] [--rinci] [--tanpa-pagar]
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { awasi } from "./lib/batas.mjs";
import { saring, terpilih } from "./lib/pilih.mjs";

const arg = (nama, bawaan) => {
  const i = process.argv.indexOf(nama);
  return i > -1 ? process.argv[i + 1] : bawaan;
};
const url = arg("--url", "http://127.0.0.1:4321");
const RINCI = process.argv.includes("--rinci");
const PAGAR = !process.argv.includes("--tanpa-pagar");
const JARAK_MAKS = 60, UTUH_MIN = 0.87;

const DOCS = new URL("../src/content/docs/", import.meta.url);
const halAlurSemua = readdirSync(DOCS, { recursive: true })
  .filter((f) => f.endsWith(".mdx") && readFileSync(new URL(f, DOCS), "utf8").includes('<WidgetLama nama="alur"'))
  .map((f) => ("/" + f.replace(/\\/g, "/").replace(/\.mdx$/, "").replace(/(^|\/)index$/, "") + "/").replace(/\/+/g, "/"))
  .sort();
// Subset PR (UKUR_HALAMAN, keputusan 866): halaman yang dipindai disaring; uji mutasi di bawah tetap memakai daftar penuh,
// karena yang diuji adalah pemeriksanya, bukan halamannya, dan ia berhenti di temuan pertama.
const disaring = terpilih() !== null;
const halAlur = saring(halAlurSemua, (x) => x, { alat: "detail-alur" });

// Putusan satu widget ber-varian (x: jumlah jawaban .bb-predict__a yang teramati di browser). Yang ditanyakan "utama":
// jawaban di akhir jalur utama, tidak di akhir varian; "varian": sebaliknya. Mencentang atau melepas varian menutup
// jawaban, kecuali langkah tujuannya langsung langkah terakhir jalur itu (varian.mulai = panjang jalur utama, atau varian
// satu langkah), maka jawaban jalur itu boleh langsung terbuka (alur.js melompat ke langkah sesudah titik cabang).
function salahTebakan(x) {
  const u = x.ditanya === "utama" ? 1 : 0, v = 1 - u, cC = x.akhirCentang ? v : 0, cL = x.akhirLepas ? u : 0, salah = [];
  if (x.utama !== u) salah.push(`akhir jalur utama ${x.utama} jawaban (seharusnya ${u})`);
  if (x.sesudahCentang !== cC) salah.push(`sesudah varian dicentang ${x.sesudahCentang} jawaban (seharusnya ${cC})`);
  if (x.varian !== v) salah.push(`akhir jalur varian ${x.varian} jawaban (seharusnya ${v})`);
  if (x.sesudahLepas !== cL) salah.push(`sesudah varian dilepas ${x.sesudahLepas} jawaban (seharusnya ${cL})`);
  if (x.utamaLagi !== u) salah.push(`akhir jalur utama lagi ${x.utamaLagi} jawaban (seharusnya ${u})`);
  if (x.bolakBalikUtama !== u) salah.push(`mundur lalu maju di akhir jalur utama ${x.bolakBalikUtama} jawaban (seharusnya ${u})`);
  if (x.bolakBalikVarian !== v) salah.push(`mundur lalu maju di akhir jalur varian ${x.bolakBalikVarian} jawaban (seharusnya ${v})`);
  return salah;
}

const browser = awasi(await chromium.launch(), { alat: "detail-alur" }); // batas waktu per halaman (keputusan 360)
let gagal = 0;
const UKURAN = process.argv.includes("--tanpa-detail") ? [] : arg("--ukuran", "1366x657").split(",").map((u) => u.split("x").map(Number));
for (const [w, h] of UKURAN) {
  const semua = [], perHal = [], geserVarian = [], tebakan = [];
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
      hasil.tebakan = [];
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
        // Jawaban tebakan (.bb-predict__a) di tiap titik; putusannya di salahTebakan (di luar halaman).
        const jawab = () => alur.querySelectorAll(".bb-predict__a").length;
        const diAkhir = () => { const m = /Langkah (\d+) dari (\d+)/.exec(alur.querySelector(".bb-alur__count").textContent); return !!m && m[1] === m[2]; };
        const tb = {};
        for (let k = 1; maju && !maju.disabled && k <= 40; k++) { maju.click(); await ukurLangkah("utama"); }
        tb.utama = jawab();
        // Mundur satu langkah lalu maju lagi ke akhir jalur: jawaban yang sudah terbuka tidak dibuka dua kali (alur.js: revealed).
        const mundur = [...alur.querySelectorAll(".bb-row button")].find((b) => b.textContent.includes("Sebelumnya"));
        const bolakBalik = async () => { mundur.click(); await frame(); maju.click(); await frame(); return jawab(); };
        tb.bolakBalikUtama = await bolakBalik();
        if (cb && !cb.disabled) {
          cb.scrollIntoView({ block: "center", behavior: "instant" });
          const t0 = cb.getBoundingClientRect().top;
          cb.click();  // lompat ke langkah pertama yang berbeda (alur.js)
          await ukurLangkah("varian");
          hasil.geserVarian.push(Math.round(Math.abs(cb.getBoundingClientRect().top - t0)));
          tb.sesudahCentang = jawab(); tb.akhirCentang = diAkhir();
          for (let k = 1; maju && !maju.disabled && k <= 40; k++) { maju.click(); await ukurLangkah("varian"); }
          tb.varian = jawab();
          tb.bolakBalikVarian = await bolakBalik();
          // Kembali ke jalur utama (varian dilepas) dan berjalan ke akhirnya; tidak diukur, hanya jawaban yang dihitung.
          cb.click();
          await frame();
          tb.sesudahLepas = jawab(); tb.akhirLepas = diAkhir();
          for (let k = 1; maju && !maju.disabled && k <= 40; k++) { maju.click(); await frame(); }
          tb.utamaLagi = jawab();
          const d = await window.BB.fetchJSON(alur.closest("[data-bb=alur]").dataset.src);
          if (d.predict) hasil.tebakan.push({ ...tb, src: alur.closest("[data-bb=alur]").dataset.src, ditanya: d.predict.varian === true ? "varian" : "utama" });
        }
      }
      return { langkah: hasil, geserVarian: hasil.geserVarian, tebakan: hasil.tebakan };
    }).then((x) => Object.assign(x.langkah, { geserVarian: x.geserVarian, tebakan: x.tebakan })) : [];
    semua.push(...r);
    geserVarian.push(...(r.geserVarian || []));
    for (const x of r.tebakan || []) tebakan.push({ pth, ...x, salah: salahTebakan(x) });
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
  const ok = !pagar || ((disaring || halAlur.length > 0) && perHal.every((p) => p.n > 0) && !lebih && (disaring && !n || utuh / n >= UTUH_MIN) && !geserLebih);
  console.log(`${ok ? "ok" : "GAGAL"} detail alur ${w}x${h}: ${halAlur.length} halaman, ${n} langkah; jarak paket ke judul detail ${jarak[0]}..${jarak[n - 1]} px (median ${jarak[n >> 1]}, ${lebih} di atas ${JARAK_MAKS}); penjelasan utuh tanpa gulir ${utuh}/${n} (${Math.round((100 * utuh) / n)}%)${pagar ? ` (pagar: jarak <= ${JARAK_MAKS} px, utuh >= ${UTUH_MIN * 100}%)` : " (dicetak saja)"}`);
  console.log(`  varian ${w}x${h}: kotak centang bergeser > 1 px saat dicentang di ${geserLebih}/${geserVarian.length} widget (maks ${Math.max(0, ...geserVarian)} px${pagar ? "; pagar: 0" : "; dicetak saja"})`);
  for (const p of perHal.filter((p) => !p.n || p.jm > JARAK_MAKS || p.utuh < p.n).sort((a, b) => b.jm - a.jm))
    console.log(`  ${p.n ? "" : "TANPA LANGKAH "}${p.pth} jarak ${p.jmin}..${p.jm} px, utuh ${p.utuh}/${p.n}`);
  if (!ok) gagal++;
  if (!process.argv.includes("--tanpa-tebakan")) {
    const utama = tebakan.filter((x) => x.ditanya === "utama").length;
    const salah = tebakan.filter((x) => x.salah.length);
    const kunci = (x) => `${x.pth} ${x.src} ${x.ditanya}`;
    const harap = daftarBerVarian().filter((x) => halAlur.includes(x.pth)).map(kunci).sort();
    const dilihat = tebakan.map(kunci).sort();
    const cocok = harap.length === dilihat.length && harap.every((k, n) => k === dilihat[n]);
    if (!cocok) console.log(`  tebakan ${w}x${h}: widget ber-varian di browser (${dilihat.length}) tidak sama dengan berkas mdx dan skenario (${harap.length}); jalur yang ditanyakan dibaca dari skenario yang sama`);
    const okt = !PAGAR || (cocok && !salah.length);
    console.log(`${okt ? "ok" : "GAGAL"} jawaban tebakan hanya di akhir jalur yang ditanyakan ${w}x${h}: ${tebakan.length} widget ber-varian (${utama} tentang jalur utama, ${tebakan.length - utama} tentang jalur varian); ${salah.length} salah${PAGAR ? "" : " (dicetak saja)"}`);
    for (const x of salah) console.log(`  tebakan ${w}x${h} ${x.pth} ${x.src} (ditanya: ${x.ditanya}): ${x.salah.join("; ")}`);
    if (!okt) gagal++;
  }
}
// Fokus sesudah tebakan lewat keyboard. mutasi: berhenti di temuan pertama (cukup untuk membuktikan pemeriksa bisa gagal).
async function cekFokus(w, h, mutasi) {
  const hasil = [];
  let terganti = 0;
  for (const pth of mutasi ? halAlurSemua : halAlur) {
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
  const ok = (disaring || hasil.length > 0) && hasil.every((x) => x.status === "utuh");
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
// Uji mutasi tebakan: alur.js dilayani dengan pemanggilan core.bukaJawaban diganti kondisi lama; pemeriksa harus
// menangkapnya di halaman yang tebakannya tentang jalur utama. Halaman itu dipilih dari berkas (mdx dan skenario), supaya
// yang dimuat browser satu halaman, bukan semua sampai yang pertama bersalah. Berhenti di temuan pertama.
const PANGGILAN = "core.bukaJawaban(d, varianOn, i, list.length)";
const KONDISI_LAMA = "(i === list.length && (!d.predict.varian || varianOn))";
// Widget ber-varian menurut berkas (mdx dan skenario): { pth, src, ditanya }. Pembanding hasil browser: jumlahnya dan
// jalur yang ditanyakan harus sama, jadi pemeriksa yang diam-diam tidak melihat satu widget pun tidak lolos.
function daftarBerVarian() {
  const lama = new URL("../lama/widgets/", import.meta.url), hasil = [];
  for (const pth of halAlurSemua) {
    const rel = pth.slice(1, -1);
    const mdx = [rel + ".mdx", rel + "/index.mdx"].find((f) => existsSync(new URL(f, DOCS)));
    if (!mdx) continue;
    for (const m of readFileSync(new URL(mdx, DOCS), "utf8").matchAll(/<WidgetLama nama="alur"[^>]*src="([^"]+)"/g)) {
      const d = JSON.parse(readFileSync(new URL(m[1], lama), "utf8"));
      if (d.predict && d.varian) hasil.push({ pth, src: m[1], ditanya: d.predict.varian === true ? "varian" : "utama" });
    }
  }
  return hasil;
}
const halamanTebakanUtama = () => [...new Set(daftarBerVarian().filter((x) => x.ditanya === "utama").map((x) => x.pth))];
async function cekTebakanMutasi() {
  const calon = halamanTebakanUtama();
  let terganti = 0, temu = null, dimuat = 0;
  for (const pth of calon) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 657 } });
    await page.route("**/widgets/alur.js", async (r) => {
      const res = await r.fetch(), bagian = (await res.text()).split(PANGGILAN);
      terganti += bagian.length - 1;
      await r.fulfill({ response: res, body: bagian.join(KONDISI_LAMA) });
    });
    await page.goto(url + pth, { waitUntil: "networkidle" });
    await page.waitForSelector(".bb-alur:not(.bb-alur--statis) .bb-row button", { state: "attached", timeout: 10000 }).catch(() => null);
    const r = await page.evaluate(async () => {
      const frame = () => new Promise((ok) => requestAnimationFrame(() => ok()));
      const out = [];
      for (const alur of document.querySelectorAll(".bb-alur:not(.bb-alur--statis)")) {
        const src = alur.closest("[data-bb=alur]").dataset.src, d = await window.BB.fetchJSON(src);
        const cb = alur.querySelector(".bb-alur__varian input"), pilihan = alur.querySelector(".bb-predict__opts button");
        if (!d.predict || d.predict.varian === true || !d.varian || !cb || !pilihan) continue;
        const maju = [...alur.querySelectorAll(".bb-row button")].find((b) => b.textContent.startsWith("Berikutnya"));
        pilihan.click();
        await frame();
        for (let k = 0; !maju.disabled && k < 40; k++) { maju.click(); await frame(); }
        cb.click();
        await frame();
        for (let k = 0; !maju.disabled && k < 40; k++) { maju.click(); await frame(); }
        out.push({ src, varian: alur.querySelectorAll(".bb-predict__a").length });
      }
      return out;
    });
    dimuat++;
    await page.close();
    temu = r.find((x) => x.varian > 0) || null;
    if (temu) { temu.pth = pth; break; }
  }
  return { terganti, temu, dimuat, calon: calon.length };
}
if (!process.argv.includes("--tanpa-tebakan") && !process.argv.includes("--tanpa-mutasi")) {
  const m = await cekTebakanMutasi();
  const okm = m.calon > 0 && m.terganti > 0 && !!m.temu;
  console.log(`${okm ? "ok" : "GAGAL"} uji mutasi tebakan (kondisi lama di alur.js, ${m.terganti} pemanggilan diganti, ${m.calon} halaman calon): ${m.temu ? `tertangkap di ${m.temu.pth} ${m.temu.src}: ${m.temu.varian} jawaban di akhir jalur varian, sesudah ${m.dimuat} halaman` : "tidak tertangkap; pemeriksa tebakan tidak bisa gagal"}`);
  if (!okm) gagal++;
}
await browser.close();
process.exit(gagal ? 1 : 0);
