// Memeriksa widget peta lima zona Tahap 5 (W5-zona) di /uji/zona/:
// - tebak dulu: sebelum menebak semua tombol zona nonaktif; sesudah menebak lewat keyboard fokus ada di tombol zona pertama (bukan body);
// - jawaban tebakan dibuka hanya sesudah semua zona tempat uang bergerak dibuka (dihitung dari data JSON, bukan dari logika.ts);
//   membuka zona lain (client, edge, operasi) tidak membuka jawaban dan jenis komponen tetap tersembunyi;
// - tabel: tiap kombinasi zona yang dibuka mengisi baris yang benar (hitungan sendiri dari data JSON), tiga sel per kejadian;
// - role=status: dua wilayah, masing-masing satu paragraf pendek; aria-pressed tepat satu zona; aria-controls menunjuk panel yang ada;
// - target >= 24 px, 320 px dengan font Verdana tanpa gulir ke samping dan tanpa kata terpotong di sel tabel, axe-core (WCAG A/AA sampai 2.2)
//   gelap dan terang, tanpa JavaScript widget tersembunyi dan isi ada di <noscript>, reduced motion tanpa transisi atau animasi.
//   node tools/ukur-zona.mjs --url http://127.0.0.1:4321
import { existsSync, readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { awasi } from "./lib/batas.mjs";
import { AXE_PATH, TAG_WCAG } from "./lib/axe.mjs";
import { muat, byId, label as labelHalaman, url as urlHalaman } from "./registri.mjs";

const arg = (nama, bawaan) => { const i = process.argv.indexOf(nama); return i > -1 ? process.argv[i + 1] : bawaan; };
const BASE = arg("--url", "http://127.0.0.1:4321");
const D = JSON.parse(readFileSync(new URL("../data/widget/t5-zona.json", import.meta.url), "utf8"));
const L = D.label;
const REG = byId(muat());
const HAL = ["/uji/zona/"];
const ZONA = D.zona.map((z) => z.id);
const TOTAL = D.kejadian.length;
const isi = (t, n) => t.replace(/\{([a-z]+)\}/g, (_, k) => String(n[k]));
// Zona tempat uang bergerak: yang memuat komponen berjenis uang.
const ZONA_UANG = D.zona.filter((z) => z.komponen.some((k) => k.jenis === "uang")).map((z) => z.id);
const namaZona = (id) => D.zona.find((z) => z.id === id).label;
const sebut = (a) => (a.length <= 1 ? a[0] ?? "" : a.length === 2 ? `${a[0]} dan ${a[1]}` : `${a.slice(0, -1).join(", ")}, dan ${a.at(-1)}`);

let gagal = 0;
const lapor = (ok, pesan) => { if (!ok) gagal++; console.log(`${ok ? "ok" : "GAGAL"} ${pesan}`); };

// Hitungan sendiri: isi tabel untuk himpunan zona yang pernah dibuka.
function tabelAcuan(pernah) {
  return D.kejadian.map((k) => ({
    label: `${k.label} ${k.masalah}`,
    sel: k.sel.map((c) => (pernah.has(k.zona) ? L.status[c.s] : `?${L.status.belum}`)),
  }));
}
function ringkasAcuan(zona, pernah) {
  const n = D.kejadian.filter((k) => k.zona === zona).length;
  const isiTabel = D.kejadian.filter((k) => pernah.has(k.zona));
  const rusak = isiTabel.reduce((t, k) => t + k.sel.filter((c) => c.s === "rusak").length, 0);
  return isi(n === 0 ? L.ringkasKosong : L.ringkas, { zona: namaZona(zona), n, total: TOTAL, terisi: isiTabel.length, rusak });
}

// Halaman yang tidak ada di dist tidak dilewati diam-diam: itu kegagalan.
for (const p of HAL) lapor(existsSync(new URL(`../dist${p}index.html`, import.meta.url)), `${p} ada di dist`);

const browser = awasi(await chromium.launch(), { alat: "zona" });
async function siap(page, path) {
  await page.goto(BASE + path, { waitUntil: "load" });
  await page.locator(".pz").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector(".pz .bb-predict__opts button") && !document.querySelector("astro-island[ssr] .pz"), null, { timeout: 15000 });
  await page.waitForTimeout(300);
}
const tabel = (page) => page.evaluate(() => {
  const t = document.querySelector(".pz table");
  return [...t.querySelectorAll("tbody")].map((b) => {
    const [a, c] = b.querySelectorAll("tr");
    return { label: a.querySelector("th").textContent.trim(), sel: [...c.querySelectorAll("td")].map((td) => td.textContent.trim()) };
  });
});
const status = (page) => page.$$eval(".pz [role=status]", (e) => e.map((x) => ({ n: x.querySelectorAll("p").length, teks: x.textContent.trim() })));
const tombolZona = (page) => page.locator(".pz .bb-row button");
const buka = async (page, id) => { await tombolZona(page).nth(ZONA.indexOf(id)).click(); await page.waitForTimeout(60); };
const panel = (page) => page.evaluate(() => {
  const p = document.querySelector(".pz .pz-panel");
  const daftar = p.querySelector(".pz-daftar"); // daftar pertama = komponen
  return {
    teks: p.textContent.replace(/\s+/g, " ").trim(),
    komponen: daftar ? [...daftar.querySelectorAll("li > strong:first-child")].map((x) => x.textContent.trim()) : [],
    chipJenis: daftar ? [...daftar.querySelectorAll(".bb-chip")].map((x) => x.textContent.trim()) : [],
  };
});
const samaJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

for (const path of HAL) {
  const page = await browser.newPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  await siap(page, path);
  const pernah = new Set();

  // 1. sebelum menebak
  const mati = await page.$$eval(".pz .bb-row button", (b) => b.map((x) => x.disabled));
  lapor(mati.length === ZONA.length && mati.every(Boolean), `${path} sebelum menebak: ${mati.length} tombol zona nonaktif`);
  lapor(samaJson(await tabel(page), tabelAcuan(pernah)), `${path} sebelum menebak: ${TOTAL} baris tabel, semua sel belum dibuka`);
  let st = await status(page);
  lapor(st.length === 2 && st[0].teks === L.mulai && st[1].teks === "", `${path} status awal: "${st[0]?.teks.slice(0, 50)}..." dan kosong`);
  lapor((await page.locator(".pz .pz-tanda").count()) === 0, `${path} sebelum menebak tidak ada tanda uang bergerak`);
  lapor((await page.locator(".pz .pz-panel").innerText()).trim() === L.panelKosong, `${path} panel awal: ${L.panelKosong}`);

  // 1b. kepala widget dan struktur tabel dari data JSON
  const kepala = await page.evaluate(() => {
    const w = document.querySelector(".pz"), tb = w.querySelector("table");
    const teks = (e) => (e ? e.textContent.trim() : "(tidak ada)");
    return {
      nama: w.getAttribute("aria-label"), peran: w.getAttribute("role"), chip: teks(w.querySelector(".bb-widget__head .bb-chip")), sumber: teks(w.querySelector(".jt-sumber")),
      caption: teks(tb.querySelector("caption")), kolom: [...tb.querySelectorAll("thead th")].map(teks), pilihan: [...w.querySelectorAll(".bb-predict__opts button")].map(teks),
      zona: [...w.querySelectorAll(".bb-row button")].map(teks), grup: w.querySelector(".bb-row").getAttribute("aria-label"), tiga: [...w.querySelectorAll(".pz-tiga li")].map(teks),
      jumlahTbody: tb.querySelectorAll("tbody").length, jumlahTabel: w.querySelectorAll("table").length,
    };
  });
  lapor(kepala.peran === "group" && kepala.nama === D.judul, `${path} grup widget punya nama dari data: "${kepala.nama}"`);
  lapor(kepala.chip === L.sumber && kepala.sumber === D.sumber.teks, `${path} chip sumber "${kepala.chip}" dan catatan sumber sama dengan data`);
  lapor(kepala.caption === L.captionTabel && samaJson(kepala.kolom, [1, 2, 3].map((i) => `${L.kolom.hal} ${i}`)), `${path} caption dan kepala kolom tabel`);
  lapor(samaJson(kepala.pilihan, D.tebak.pilihan) && samaJson(kepala.zona, D.zona.map((z) => z.label)) && kepala.grup === L.ubah, `${path} pilihan tebakan, tombol zona, dan nama grup sama dengan data`);
  lapor(samaJson(kepala.tiga, L.tiga) && kepala.jumlahTabel === 1 && kepala.jumlahTbody === TOTAL, `${path} tiga hal dan ${TOTAL} kelompok baris tabel`);

  // 2. tebak lewat keyboard: pilihan salah (indeks 0), fokus pindah ke tombol zona pertama
  const salah = D.tebak.pilihan.findIndex((_, i) => i !== D.tebak.jawaban);
  const pilihan = page.locator(".pz .bb-predict__opts button");
  await pilihan.nth(salah).focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  const fokus = await page.evaluate(() => { const a = document.activeElement; return { tag: a?.tagName, teks: a?.textContent.trim(), diBaris: !!a?.closest(".pz .bb-row"), pressed: [...document.querySelectorAll(".pz .bb-predict__opts button")].map((b) => b.getAttribute("aria-pressed")), mati: [...document.querySelectorAll(".pz .bb-predict__opts button")].map((b) => b.disabled) }; });
  lapor(fokus.tag === "BUTTON" && fokus.diBaris && fokus.teks === D.zona[0].label, `${path} sesudah menebak fokus di tombol zona pertama (${fokus.tag} "${fokus.teks}")`);
  lapor(fokus.pressed[salah] === "true" && fokus.pressed.filter((x) => x === "true").length === 1, `${path} aria-pressed tebakan: ${fokus.pressed.join(",")}`);
  lapor(fokus.mati.every(Boolean), `${path} sesudah menebak semua pilihan tebakan nonaktif (${fokus.mati.join(",")})`);
  const matiZona = await page.$$eval(".pz .bb-row button", (b) => b.map((x) => x.disabled));
  lapor(matiZona.every((x) => !x), `${path} sesudah menebak semua tombol zona aktif`);
  st = await status(page);
  const lanjut1 = isi(L.lanjut, { zona: sebut(ZONA_UANG.map(namaZona)) });
  lapor(st[1].teks === lanjut1, `${path} petunjuk sesudah menebak: "${st[1].teks}"`);

  // 3. zona yang tidak memuat uang: client lebih dulu. Tidak membuka jawaban, jenis komponen tersembunyi, tabel tak berubah.
  const lain = ZONA.find((z) => !ZONA_UANG.includes(z));
  await buka(page, lain); pernah.add(lain);
  let p = await panel(page);
  lapor(samaJson(p.komponen, D.zona[ZONA.indexOf(lain)].komponen.map((k) => k.label)), `${path} zona ${lain}: komponen ${p.komponen.join(", ")}`);
  lapor(p.chipJenis.length === 0 && !p.teks.includes(D.zona[ZONA.indexOf(lain)].komponen[0].catatan), `${path} zona ${lain} sebelum jawaban dibuka: tanpa chip jenis dan tanpa catatan komponen`);
  st = await status(page);
  lapor(st[0].teks === ringkasAcuan(lain, pernah) && st[1].teks === lanjut1, `${path} zona ${lain}: status "${st[0].teks.slice(0, 60)}..." dan jawaban belum dibuka`);
  lapor(samaJson(await tabel(page), tabelAcuan(pernah)), `${path} zona ${lain}: tabel sama dengan hitungan alat`);
  const fokus2 = await page.evaluate(() => { const a = document.activeElement; return { tag: a?.tagName, diBaris: !!a?.closest(".pz .bb-row"), pressed: [...document.querySelectorAll(".pz .bb-row button")].map((b) => b.getAttribute("aria-pressed")), kendali: document.activeElement?.getAttribute("aria-controls"), ada: !!document.getElementById(document.activeElement?.getAttribute("aria-controls") ?? "x") }; });
  lapor(fokus2.tag === "BUTTON" && fokus2.diBaris && fokus2.ada, `${path} sesudah membuka zona fokus tetap di tombol zona dan aria-controls menunjuk panel`);
  lapor(fokus2.pressed.filter((x) => x === "true").length === 1 && fokus2.pressed[ZONA.indexOf(lain)] === "true", `${path} aria-pressed zona: ${fokus2.pressed.join(",")}`);

  // 4. zona uang satu per satu: jawaban dibuka hanya sesudah yang terakhir
  for (let i = 0; i < ZONA_UANG.length; i++) {
    const z = ZONA_UANG[i];
    await buka(page, z); pernah.add(z);
    st = await status(page);
    const terakhir = i === ZONA_UANG.length - 1;
    const sisa = ZONA_UANG.slice(i + 1).map(namaZona);
    const acuanJawab = terakhir ? `${L.belum} ${D.tebak.alasan}` : isi(L.lanjut, { zona: sebut(sisa) });
    lapor(st[1].teks === acuanJawab, `${path} zona ${z} dibuka: jawaban ${terakhir ? "terbuka (tebakan salah)" : "belum terbuka"}: "${st[1].teks.slice(0, 50)}..."`);
    lapor(st[0].teks === ringkasAcuan(z, pernah), `${path} zona ${z}: status "${st[0].teks.slice(0, 70)}..."`);
    lapor(samaJson(await tabel(page), tabelAcuan(pernah)), `${path} zona ${z}: tabel sama dengan hitungan alat (${D.kejadian.filter((k) => pernah.has(k.zona)).length} dari ${TOTAL} baris terisi)`);
  }
  // 5. sesudah jawaban terbuka: chip jenis tampil di panel zona uang, tanda uang di tombolnya, dan hanya di sana
  const tanda = await page.$$eval(".pz .bb-row button", (b) => b.map((x) => !!x.querySelector(".pz-tanda")));
  lapor(samaJson(tanda, ZONA.map((z) => ZONA_UANG.includes(z))), `${path} tanda uang bergerak hanya di zona ${sebut(ZONA_UANG)}: ${tanda.join(",")}`);
  const jenisPerZona = {};
  for (const z of ZONA) {
    await buka(page, z); pernah.add(z);
    p = await panel(page);
    jenisPerZona[z] = p.chipJenis;
    const acuan = D.zona[ZONA.indexOf(z)].komponen.map((k) => L.jenis[k.jenis]);
    lapor(samaJson(p.chipJenis, acuan) && D.zona[ZONA.indexOf(z)].komponen.every((k) => p.teks.includes(k.catatan)), `${path} zona ${z} sesudah jawaban terbuka: ${p.chipJenis.length} chip jenis dan catatan komponen sama dengan data`);
    // klaim ledger tetap satu-satunya tempat uang bergerak: tepat dua chip uang di seluruh peta
  }
  const chipUang = Object.values(jenisPerZona).flat().filter((x) => x === L.jenis.uang).length;
  lapor(chipUang === 2 && Object.entries(jenisPerZona).filter(([, c]) => c.includes(L.jenis.uang)).map(([z]) => z).join() === ZONA_UANG.join(), `${path} tepat ${chipUang} komponen tempat uang bergerak, di zona ${ZONA_UANG.join(" dan ")}`);
  // service: schema, jumlah tabel, dan tim dari data
  await buka(page, "service");
  p = await panel(page);
  const serviceOk = D.service.every((s) => p.teks.includes(isi(L.serviceMeta, { schema: s.schema, tabel: s.tabel.length, tim: D.tim.find((t) => t.id === s.tim).nama })));
  lapor(serviceOk, `${path} zona service: enam baris schema, jumlah tabel, dan tim sama dengan data (${D.service.map((s) => `${s.schema}:${s.tabel.length}`).join(" ")})`);
  // halaman: nomor dan judul dari registry; yang belum ditulis tampil sebagai "(segera)" tanpa tautan
  for (const z of D.zona) {
    await buka(page, z.id);
    const li = await page.evaluate(() => {
      const j = [...document.querySelectorAll(".pz .pz-panel .pz-judul")].findIndex((x) => x.textContent.trim() === "Dibahas di");
      const ul = document.querySelectorAll(".pz .pz-panel .pz-daftar")[2];
      return { ada: j >= 0, items: ul ? [...ul.querySelectorAll("li")].map((x) => ({ teks: x.textContent.trim(), href: x.querySelector("a")?.getAttribute("href") ?? null })) : [] };
    });
    const acuan = z.halaman.map((id) => { const h = REG[id]; return { teks: h.diporting ? labelHalaman(h, true) : `${labelHalaman(h, true)} ${L.segera}`, href: h.diporting ? urlHalaman(h) : null }; });
    lapor(li.ada && samaJson(li.items, acuan), `${path} zona ${z.id}: ${acuan.length} rujukan halaman dari registry (${acuan.filter((a) => a.href).length} tautan, ${acuan.filter((a) => !a.href).length} segera)`);
  }
  // 5b. daftar kejadian di panel: label, rujukan halaman masalah, chip sumber, dan alasan tiap sel Rusak sama dengan data
  for (const z of D.zona) {
    await buka(page, z.id);
    const k = await page.evaluate((judul) => {
      const j = [...document.querySelectorAll(".pz .pz-panel .pz-judul")].find((x) => x.textContent.trim() === judul);
      const daftar = j?.nextElementSibling;
      if (!daftar) return { ada: false };
      if (daftar.tagName !== "UL") return { ada: true, kosong: daftar.textContent.trim() };
      return { ada: true, items: [...daftar.querySelectorAll(":scope > li")].map((li) => ({ label: li.querySelector("strong").textContent.trim(), rujukan: li.querySelector("a, .rujukan-menyusul").textContent.trim(), chip: li.querySelector(".bb-chip").textContent.trim(), rusak: [...li.querySelectorAll(".pz-baris")].map((x) => x.textContent.trim()) })) };
    }, L.kejadianJudul);
    const acuan = D.kejadian.filter((e) => e.zona === z.id);
    if (acuan.length === 0) {
      lapor(k.ada && k.kosong === isi(L.tanpaKejadian, { total: TOTAL }), `${path} zona ${z.id}: tanpa kejadian, kalimat "${(k.kosong ?? "").slice(0, 50)}..."`);
    } else {
      const harap = acuan.map((e) => { const h = REG[e.halaman]; return { label: e.label, rujukan: h.diporting ? labelHalaman(h, true) : `${labelHalaman(h, true)} ${L.segera}`, chip: L.sumberJenis[e.sumber], rusak: e.sel.flatMap((c, i) => (c.alasan ? [`${L.kolom.hal} ${i + 1}, ${L.status.rusak}: ${c.alasan}`] : [])) }; });
      lapor(k.ada && samaJson(k.items, harap), `${path} zona ${z.id}: ${harap.length} kejadian di panel (label, rujukan, chip, alasan Rusak) sama dengan data`);
    }
  }
  // 5c. tiap sel tabel menunjuk judul kejadiannya dan judul kolomnya lewat headers
  const hd = await page.evaluate(() => {
    const t = document.querySelector(".pz table");
    return [...t.querySelectorAll("td")].map((td) => {
      const ids = (td.getAttribute("headers") ?? "").split(/\s+/).filter(Boolean);
      const el = ids.map((i) => document.getElementById(i));
      return { n: ids.length, ada: el.every(Boolean), kejadian: el[0]?.closest("tbody") === td.closest("tbody") && el[0]?.tagName === "TH" && el[0].colSpan === 3, kolom: el[1]?.closest("thead") !== null && el[1]?.textContent.trim() };
    });
  });
  const hdAcuan = D.kejadian.flatMap(() => [1, 2, 3].map((i) => `${L.kolom.hal} ${i}`));
  lapor(hd.length === TOTAL * 3 && hd.every((x) => x.n === 2 && x.ada && x.kejadian) && samaJson(hd.map((x) => x.kolom), hdAcuan), `${path} headers: ${hd.length} sel tabel menunjuk judul kejadian dan kolom Hal 1 sampai 3`);
  // 6. semua zona dibuka: tabel penuh
  lapor(samaJson(await tabel(page), tabelAcuan(new Set(ZONA))), `${path} semua zona dibuka: ${TOTAL} baris terisi sama dengan hitungan alat`);
  // 7. role=status
  st = await status(page);
  lapor(st.length === 2 && st.every((x) => x.n <= 1 && x.teks.length <= 240 && x.teks.length > 0), `${path} role=status: ${st.length} wilayah, panjang ${st.map((x) => x.teks.length).join(" dan ")} karakter`);
  // 8. target >= 24 px
  const kecil = await page.$$eval(".pz button", (b) => b.map((x) => x.getBoundingClientRect()).filter((r) => r.width < 24 || r.height < 24).length);
  lapor(kecil === 0, `${path} target >= 24 px: ${kecil} tombol terlalu kecil`);
  // 9. axe gelap dan terang (semua zona dibuka, jawaban terbuka)
  for (const tema of ["dark", "light"]) {
    await page.evaluate((x) => { document.documentElement.dataset.theme = x; }, tema);
    await page.waitForTimeout(100);
    await page.addScriptTag({ path: AXE_PATH });
    const v = await page.evaluate(async (tag) => { const r = await window.axe.run(document.querySelector(".pz"), { runOnly: { type: "tag", values: tag }, resultTypes: ["violations"] }); return r.violations.map((x) => `${x.id}(${x.nodes.length})`); }, TAG_WCAG);
    lapor(v.length === 0, `${path} axe ${tema}: ${v.length ? v.join(", ") : "0 pelanggaran"}`);
  }
  await page.close();

  // 10. tebakan benar membuka "Tebakanmu benar" dan keyboard: Tab melewati zona berurutan, Enter membuka zona
  const benar = await browser.newPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  await siap(benar, path);
  await benar.locator(".pz .bb-predict__opts button").nth(D.tebak.jawaban).focus();
  await benar.keyboard.press("Space");
  await benar.waitForTimeout(100);
  const urutan = [];
  for (let i = 0; i < ZONA.length; i++) {
    urutan.push(await benar.evaluate(() => document.activeElement?.textContent.trim()));
    if (i < ZONA.length - 1) await benar.keyboard.press("Tab");
  }
  lapor(samaJson(urutan, D.zona.map((z) => z.label)), `${path} Tab melewati tombol zona berurutan: ${urutan.join(" > ")}`);
  for (const z of ZONA_UANG) { await benar.locator(".pz .bb-row button").nth(ZONA.indexOf(z)).focus(); await benar.keyboard.press("Enter"); await benar.waitForTimeout(60); }
  const stB = await status(benar);
  lapor(stB[1].teks === `${L.benar} ${D.tebak.alasan}`, `${path} tebakan benar: "${stB[1].teks.slice(0, 40)}..."`);
  // 10b. reduced motion: tanpa transisi atau animasi di widget, fungsi tetap
  await benar.emulateMedia({ reducedMotion: "reduce" });
  const gerak = await benar.evaluate(() => [...document.querySelectorAll(".pz, .pz *")].filter((e) => { const s = getComputedStyle(e); return parseFloat(s.transitionDuration) > 0 || (s.animationName !== "none" && parseFloat(s.animationDuration) > 0); }).length);
  await benar.locator(".pz .bb-row button").nth(0).click();
  const tetap = (await panel(benar)).komponen.length === D.zona[0].komponen.length;
  lapor(gerak === 0 && tetap, `${path} reduced motion: ${gerak} elemen dengan transisi atau animasi, zona tetap terbuka`);
  await benar.close();

  // 11. 320 px dengan font Verdana (lebih lebar dari Satoshi): tanpa gulir ke samping, tanpa kata terpotong di sel
  const kecilHalaman = await browser.newPage({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true });
  await siap(kecilHalaman, path);
  await kecilHalaman.addStyleTag({ content: ".sl-markdown-content, .sl-markdown-content * { font-family: Verdana, sans-serif !important; }" });
  await kecilHalaman.locator(".pz .bb-predict__opts button").nth(2).click();
  for (const z of ZONA) { await kecilHalaman.locator(".pz .bb-row button").nth(ZONA.indexOf(z)).click(); }
  await kecilHalaman.waitForTimeout(150);
  const u = await kecilHalaman.evaluate(() => {
    const w = document.querySelector(".pz").getBoundingClientRect();
    const sempit = [];
    // lebar satu kata tak terputus lawan lebar isi sel: kata yang lebih lebar dari selnya terpotong oleh overflow-wrap
    const ukur = (el, teks) => {
      const cs = getComputedStyle(el);
      const s = document.createElement("span");
      s.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${cs.font};letter-spacing:${cs.letterSpacing}`;
      document.body.append(s);
      let terlebar = 0;
      for (const k of teks.split(/\s+/).filter(Boolean)) { s.textContent = k; terlebar = Math.max(terlebar, s.getBoundingClientRect().width); }
      s.remove();
      return terlebar;
    };
    for (const td of document.querySelectorAll(".pz table td")) {
      const cs = getComputedStyle(td);
      const isiLebar = td.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (ukur(td, td.textContent) > isiLebar + 0.5) sempit.push(td.textContent.trim());
    }
    const meluap = [...document.querySelectorAll(".pz table :is(td, th)")].filter((c) => c.scrollWidth > c.clientWidth + 1).map((c) => c.textContent.trim());
    return { halaman: document.documentElement.scrollWidth, kanan: Math.round(w.right), kiri: Math.round(w.left), tabel: [...document.querySelectorAll(".pz table")].map((t) => t.scrollWidth - t.parentElement.clientWidth), sempit, meluap };
  });
  lapor(u.halaman <= 320 && u.kanan <= 320 && u.kiri >= 0 && u.tabel.every((x) => x <= 1), `${path} 320 px Verdana: halaman ${u.halaman}, widget ${u.kiri}..${u.kanan}, kelebihan tabel ${u.tabel.join(",")}`);
  lapor(u.meluap.length === 0, `${path} 320 px Verdana: ${u.meluap.length} sel yang isinya meluap keluar selnya${u.meluap.length ? ` (${[...new Set(u.meluap)].join(", ")})` : ""}`);
  lapor(u.sempit.length === 0, `${path} 320 px Verdana: ${u.sempit.length} sel dengan kata terpotong${u.sempit.length ? ` (${[...new Set(u.sempit)].join(", ")})` : ""}`);
  await kecilHalaman.close();

  // 12. tanpa JavaScript widget tersembunyi dan isi ada di <noscript>
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 667 } });
  const tanpa = await ctx.newPage();
  await tanpa.goto(BASE + path, { waitUntil: "load" });
  const tampil = await tanpa.evaluate(() => {
    const e = document.querySelector(".pz");
    const ns = [...document.querySelectorAll("noscript")].find((n) => n.textContent.includes("Tanpa JavaScript") || n.querySelector("table"));
    const teks = (document.querySelector(".pz")?.parentElement?.textContent ?? "") + document.body.innerText;
    return { display: e ? getComputedStyle(e).display : "tidak ada", ada: !!ns, tabel: ns ? ns.querySelectorAll("table").length : (document.querySelectorAll("table.tm-tabel").length), isi: document.body.innerText, html: document.body.innerHTML.length };
  });
  lapor(tampil.display === "none", `${path} tanpa JavaScript: widget display ${tampil.display}`);
  const semuaTeks = [L.tanpaJs, D.tebak.alasan, ...D.zona.flatMap((z) => z.komponen.map((k) => k.catatan)), ...D.kejadian.map((k) => k.label), ...D.kejadian.flatMap((k) => k.sel.filter((c) => c.alasan).map((c) => c.alasan))];
  const hilang = semuaTeks.filter((t) => !tampil.isi.replace(/\s+/g, " ").includes(t));
  lapor(hilang.length === 0 && tampil.tabel >= 2, `${path} tanpa JavaScript: ${tampil.tabel} tabel di <noscript>, ${hilang.length} dari ${semuaTeks.length} teks data hilang${hilang.length ? ` (${hilang[0].slice(0, 40)}...)` : ""}`);
  await ctx.close();
}
await browser.close();
console.log(gagal ? `Widget zona GAGAL (${gagal})` : `Widget zona: tebak dulu, jawaban dari zona uang, tabel dari hitungan sendiri, ARIA, target, 320 px, axe, reduced motion, tanpa JavaScript lolos (${HAL.length} halaman)`);
process.exit(gagal ? 1 : 0);
