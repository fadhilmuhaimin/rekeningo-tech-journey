// Memeriksa widget race ledger (W2-race, keputusan 707–711) di halaman uji /uji/race/:
// - tebak dulu: sebelum menebak Berikutnya nonaktif, panah kanan tidak menambah langkah, hasil (role=status) kosong;
// - keyboard: Tab mencapai semua tombol aktif dalam urutan DOM; fokus terlihat (outline >= 2 px) di tombol cara,
//   pilihan, dan Berikutnya; Enter memilih tebakan, fokus pindah ke Berikutnya; Spasi dan panah kanan menambah langkah;
//   di langkah terakhir fokus pindah ke tombol "Ubah satu hal"; Enter di situ memilih cara berikutnya (aria-pressed
//   pindah) dan fokus ke pilihan tebakan; panah kiri mundur;
// - gerak: 0 animasi saat dimuat; tanpa reduced motion setiap baris baru bergerak di frame pertamanya dan baris lama
//   diam; dengan reduced motion 0 animasi dan fungsi sama; Sebelumnya dan ganti cara tidak bergerak;
// - angka dari rekaman: untuk keenam cara, saldo akhir = `final` di ledger-<cara>.json, hasil tablet, langkah menunggu,
//   dan retry = banding.txt, SQLSTATE = hasil statement ERROR di rekaman; chip sumber dan kaki menunjuk file rekaman;
// - ubah satu hal: sesudah dua cara selesai, kotak beda menulis yang berubah;
// - kontras teks baris garis waktu dan hasil >= 4,5:1 di gelap dan terang (opacity leluhur dikalikan, latar dicampur);
// - axe-core (tag WCAG A/AA sampai 2.2) di keadaan akhir sesudah dua cara selesai, gelap dan terang;
// - CLS: tinggi widget dan letak paragraf sesudahnya sama tanpa JS (render build) dan sesudah hydrate (<= 1 px);
// - ukuran JS /uji/race/ dicetak (baris "info").
//   node tools/ukur-race.mjs --url http://127.0.0.1:4321
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { chromium } from "@playwright/test";
import { awasi } from "./lib/batas.mjs";
import { AXE_PATH, TAG_WCAG } from "./lib/axe.mjs";

const arg = (nama, bawaan) => {
  const i = process.argv.indexOf(nama);
  return i > -1 ? process.argv[i + 1] : bawaan;
};
const BASE = arg("--url", "http://127.0.0.1:4321");
const HAL = "/uji/race/";
const DIR = "labs/b3-race/output/ledger";
const CARA = ["tanpa-lock", "tanpa-lock-bergantian", "for-update", "atomik", "optimistic", "serializable"];
const baca = (f) => readFileSync(new URL(`../../${DIR}/${f}`, import.meta.url), "utf8");
const REK = Object.fromEntries(CARA.map((c) => [c, JSON.parse(baca(`ledger-${c}.json`))]));
const L = JSON.parse(readFileSync(new URL("../data/widget/race-ledger.json", import.meta.url), "utf8"));
// banding.txt dibaca dengan cara sendiri (bukan logika.ts), supaya alat ini tidak lolos karena salah yang sama.
const BANDING = Object.fromEntries(baca("banding.txt").split("\n").filter((b) => /\|/.test(b) && !/^\s*cara\s*\|/.test(b) && !/^-/.test(b.trim()))
  .map((b) => b.split("|").map((s) => s.trim())).map(([cara, A, B, menunggu, retry, saldo]) => [cara, { A, B, menunggu, retry, saldo: Number(saldo) }]));
const rp = (n) => (n < 0 ? "−Rp" : "Rp") + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const browser = awasi(await chromium.launch(), { alat: "race" });
let gagal = 0;
const lapor = (ok, pesan) => {
  console.log(`${ok ? "ok" : "GAGAL"} ${pesan}`);
  if (!ok) gagal++;
};
const W = "[data-race-ledger]";

async function buka(ukuran, opsi = {}) {
  const [w, h] = ukuran;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768, ...opsi });
  const page = await ctx.newPage();
  const error = [];
  page.on("pageerror", (e) => error.push(String(e)));
  page.on("console", (m) => m.type() === "error" && error.push(m.text()));
  await page.goto(BASE + HAL, { waitUntil: "networkidle" });
  return { ctx, page, error };
}
const siap = async (page) => {
  await page.locator(W).scrollIntoViewIfNeeded();
  await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));
};
const fokusTeks = (page) => page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");

// 1. Tebak dulu, keyboard, gerak, ubah satu hal: 2 ukuran × 2 reduced motion.
for (const ukuran of [[375, 667], [1366, 657]]) for (const reducedMotion of ["no-preference", "reduce"]) {
  const nama = `${ukuran.join("x")} ${reducedMotion}`;
  const { ctx, page, error } = await buka(ukuran, { reducedMotion });
  const animasiAwal = await page.evaluate(() => document.getAnimations().length);
  await siap(page);
  const w = page.locator(W);
  const baris = () => w.locator("ol > li").count();
  const status = () => w.locator('[role="status"]').innerText();
  const maju = w.getByRole("button", { name: L.berikutnya });

  await w.locator(".rl-cara button").first().focus();
  await page.keyboard.press("ArrowRight");
  const sebelum = { maju: await maju.isDisabled(), baris: await baris(), status: (await status()).trim(), kini: await w.locator(".bb-now").innerText() };
  lapor(sebelum.maju && sebelum.baris === 0 && sebelum.status === "" && sebelum.kini === L.pilihDulu,
    `race ${nama}: sebelum menebak Berikutnya nonaktif ${sebelum.maju}, panah kanan menambah ${sebelum.baris} baris, hasil "${sebelum.status}", petunjuk "${sebelum.kini}"`);

  // Urutan Tab = urutan DOM tombol aktif; fokus terlihat.
  const harap = await w.locator("button:not(:disabled)").evaluateAll((b) => b.map((x) => x.textContent.trim()));
  const urut = [await fokusTeks(page)];
  const outline = [];
  for (let k = 1; k < harap.length; k++) {
    await page.keyboard.press("Tab");
    urut.push(await fokusTeks(page));
    outline.push(await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2; }));
  }
  lapor(urut.join("|") === harap.join("|") && outline.every(Boolean), `race ${nama}: Tab ${urut.length} tombol dalam urutan DOM, fokus terlihat di ${outline.filter(Boolean).length}/${outline.length}`);

  // Tebakan benar lewat Enter.
  const c0 = CARA[0], r0 = REK[c0];
  const pilihan = w.locator(".bb-predict__opts button", { hasText: rp(r0.final) });
  await pilihan.focus();
  await page.keyboard.press("Enter");
  const tebak = { pressed: await pilihan.getAttribute("aria-pressed"), nonaktif: await w.locator(".bb-predict__opts button:not(:disabled)").count(), fokus: await fokusTeks(page) };
  lapor(tebak.pressed === "true" && tebak.nonaktif === 0 && tebak.fokus === L.berikutnya,
    `race ${nama}: Enter memilih ${rp(r0.final)} (aria-pressed ${tebak.pressed}), ${tebak.nonaktif} pilihan masih aktif, fokus di "${tebak.fokus}"`);

  // Langkah: Spasi lalu panah kanan; gerak hanya di baris baru.
  let gerak = 0, final = 0, lewatGerak = 0, klik = 0;
  const cek = () => page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => {
    const b = [...document.querySelectorAll("[data-race-ledger] ol > li")];
    const anim = (el) => el.getAnimations({ subtree: true }).length;
    const baru = b.at(-1);
    ok({ baruGerak: !!baru && anim(baru) > 0 && Number(getComputedStyle(baru).opacity) < 1, baruFinal: !!baru && anim(baru) === 0 && getComputedStyle(baru).opacity === "1", lewat: b.slice(0, -1).filter((x) => anim(x) > 0).length, saat: b.filter((x) => x.getAttribute("aria-current") === "step").length });
  })));
  let saatBenar = true;
  for (let k = 0; k < r0.steps.length + 3; k++) {
    const sebelumN = await baris();
    await page.keyboard.press(k === 0 ? " " : "ArrowRight");
    if ((await baris()) === sebelumN) break;
    klik++;
    const c = await cek();
    if (c.baruGerak) gerak++;
    if (c.baruFinal) final++;
    lewatGerak += c.lewat;
    saatBenar &&= c.saat === 1;
    await page.waitForTimeout(reducedMotion === "reduce" ? 0 : 300);
  }
  const gerakOk = reducedMotion === "reduce" ? gerak === 0 && final === klik : gerak === klik;
  lapor(klik === r0.steps.length && gerakOk && lewatGerak === 0 && saatBenar,
    `race ${nama}: ${klik}/${r0.steps.length} langkah lewat Spasi dan panah kanan, ${gerak} baris baru bergerak, ${final} langsung final, ${lewatGerak} gerak di baris lama, aria-current satu per langkah ${saatBenar}`);

  const s0 = await status();
  const fokusAkhir = await page.evaluate(() => document.activeElement?.closest(".rl-ganti") !== null);
  lapor(s0.includes(isiLabel(L.hasilJudul, { saldo: rp(r0.final) })) && s0.includes(L.benar) && fokusAkhir,
    `race ${nama}: hasil "${s0.split("\n")[0].slice(0, 80)}", fokus pindah ke Ubah satu hal ${fokusAkhir}`);

  // Ubah satu hal lewat Enter: aria-pressed pindah, fokus ke pilihan; Belum tahu lewat Spasi.
  const c1 = CARA[1], r1 = REK[c1];
  const pressedSebelum = await w.locator('.rl-cara [aria-pressed="true"]').getAttribute("data-cara");
  await page.keyboard.press("Enter");
  const ganti = { pressed: await w.locator('.rl-cara [aria-pressed="true"]').evaluateAll((b) => b.map((x) => x.dataset.cara)), fokus: await fokusTeks(page), baris: await baris(), anim: await page.evaluate(() => document.querySelector("[data-race-ledger]").getAnimations({ subtree: true }).length) };
  lapor(pressedSebelum === c0 && ganti.pressed.join() === c1 && ganti.fokus === rp(r1.start - r1.withdraw.A - r1.withdraw.B) && ganti.baris === 0 && ganti.anim === 0,
    `race ${nama}: Ubah satu hal: aria-pressed ${pressedSebelum} → ${ganti.pressed.join()}, fokus di "${ganti.fokus}", ${ganti.baris} baris, ${ganti.anim} animasi`);
  await w.locator(".bb-predict__opts button", { hasText: L.belumTahu }).focus();
  await page.keyboard.press(" ");
  for (let k = 0; k < r1.steps.length + 2; k++) await page.keyboard.press("ArrowRight");
  const s1 = await status();
  const beda = await w.locator(".rl-beda li").allInnerTexts();
  lapor(s1.includes(rp(r1.final)) && !s1.includes(L.benar) && !s1.includes(L.meleset) && beda.length > 0 && s1.includes(isiLabel(L.bedaJudul, { cara: r0.title })),
    `race ${nama}: Belum tahu tanpa penilaian; beda dengan ${r0.title}: ${beda.join("; ")}`);

  // axe-core di keadaan akhir (hasil, fakta, kotak beda, tombol Ubah satu hal terlihat), gelap dan terang.
  if (reducedMotion === "reduce") {
    await page.addScriptTag({ path: AXE_PATH });
    for (const tema of ["dark", "light"]) {
      const v = await page.evaluate(async ([tema, tag]) => {
        document.documentElement.dataset.theme = tema;
        const r = await window.axe.run(document.querySelector("[data-race-ledger]"), { runOnly: { type: "tag", values: tag }, resultTypes: ["violations"] });
        return r.violations.map((x) => `${x.id} (${x.nodes.length})`);
      }, [tema, TAG_WCAG]);
      lapor(v.length === 0, `race ${nama} axe keadaan akhir ${tema}: ${v.length ? v.join(", ") : "0 pelanggaran"}`);
    }
  }

  // Mundur dan ganti cara tanpa gerak (gerak baris dari panah kanan yang cepat di atas ditunggu selesai dulu).
  await page.waitForFunction(() => document.querySelector("[data-race-ledger]").getAnimations({ subtree: true }).length === 0);
  await page.keyboard.press("ArrowLeft");
  const mundur = { baris: await baris(), status: (await status()).trim(), anim: await page.evaluate(() => document.querySelector("[data-race-ledger]").getAnimations({ subtree: true }).length) };
  await w.locator(".rl-cara button").nth(2).click();
  const lain = { baris: await baris(), anim: await page.evaluate(() => document.querySelector("[data-race-ledger]").getAnimations({ subtree: true }).length), pressed: await w.locator(".rl-cara button").nth(2).getAttribute("aria-pressed") };
  await w.locator(".rl-cara button").nth(1).click();
  const kembali = await baris();
  lapor(mundur.baris === r1.steps.length - 1 && mundur.status === "" && mundur.anim === 0 && lain.baris === 0 && lain.anim === 0 && lain.pressed === "true" && kembali === r1.steps.length - 1,
    `race ${nama}: panah kiri ${mundur.baris} baris, hasil disembunyikan, ${mundur.anim} animasi; ganti cara ${lain.baris} baris, ${lain.anim} animasi, aria-pressed ${lain.pressed}; kembali ke cara sebelumnya posisinya tetap (${kembali})`);

  lapor(animasiAwal === 0 && error.length === 0, `race ${nama}: ${animasiAwal} animasi saat dimuat, ${error.length} error konsol${error.length ? ": " + error.join(" | ") : ""}`);
  await ctx.close();
}

function isiLabel(t, v) {
  return t.replace(/\{(\w+)\}/g, (_, k) => String(v[k]));
}

// 2. Angka dari rekaman untuk keenam cara, kontras, chip sumber (1366, reduced motion supaya cepat).
{
  const { ctx, page } = await buka([1366, 657], { reducedMotion: "reduce" });
  await siap(page);
  const w = page.locator(W);
  for (const [k, c] of CARA.entries()) {
    const r = REK[c], b = BANDING[r.title];
    await w.locator(".rl-cara button").nth(k).click();
    await w.locator(".bb-predict__opts button").first().click();
    const maju = w.getByRole("button", { name: L.berikutnya });
    while (!(await maju.isDisabled())) await maju.click();
    const dd = await w.locator(".rl-fakta dd").allInnerTexts();
    const sql = r.steps.map((s) => s.result.match(/^ERROR ([0-9A-Z]{5}) ([a-z_]+)/)).filter(Boolean).map((m) => `${m[1]} ${m[2]}`).join(", ") || L.fakta.tanpaError;
    const harap = [b.A, b.B, `${b.menunggu} langkah`, b.retry, sql];
    const s = await w.locator('[role="status"]').innerText();
    const chip = { teks: await w.locator(".bb-sumber").innerText(), title: await w.locator(".bb-sumber").getAttribute("title") };
    const kaki = await w.locator(".bb-widget__foot code").allInnerTexts();
    const file = `${DIR}/ledger-${c}.json`;
    lapor(b && b.saldo === r.final && s.includes(isiLabel(L.hasilJudul, { saldo: rp(r.final) })) && dd.join("|") === harap.join("|") &&
      chip.teks === "Rekaman lab" && chip.title === file && kaki.join("|") === `${file}|${DIR}/ledger-${c}.txt`,
      `race angka ${c}: saldo ${rp(r.final)} (banding ${b?.saldo}), fakta ${dd.join(" | ")}; chip "${chip.teks}" ${chip.title}`);
  }
  // Kontras teks baris dan hasil di kedua tema.
  const kontras = await page.evaluate(() => {
    const rgba = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
    const campur = (atas, bawah, a) => atas.slice(0, 3).map((v, k) => v * a + bawah[k] * (1 - a));
    const latar = (el) => { const lapis = []; for (let n = el; n; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c && c[3] > 0) { lapis.push(c); if (c[3] === 1) break; } } let h = [255, 255, 255]; for (const c of lapis.reverse()) h = campur(c, h, c[3]); return h; };
    const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const rasio = (el) => { let op = 1; for (let n = el; n; n = n.parentElement) op *= Number(getComputedStyle(n).opacity); const bg = latar(el), fg = rgba(getComputedStyle(el).color); const t = campur(fg, bg, fg[3] * op); const [a, b] = [lum(t), lum(bg)].sort((x, y) => y - x); return (a + 0.05) / (b + 0.05); };
    const w = document.querySelector("[data-race-ledger]");
    const teks = [...w.querySelectorAll("ol > li *, [role=status] *, .rl-cara button, .bb-widget__foot, .bb-client *, .bb-db *")]
      .filter((e) => !e.closest(".bb-sr") && !e.classList.contains("bb-actor") && !e.closest(":disabled") && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
    const hasil = {};
    const awal = document.documentElement.dataset.theme;
    for (const t of ["dark", "light"]) { document.documentElement.dataset.theme = t; hasil[t] = Math.min(...teks.map(rasio)); }
    document.documentElement.dataset.theme = awal;
    return { ...hasil, n: teks.length };
  });
  lapor(kontras.dark >= 4.5 && kontras.light >= 4.5 && kontras.n > 20, `race kontras ${kontras.n} teks: gelap ${kontras.dark.toFixed(2)}:1, terang ${kontras.light.toFixed(2)}:1`);
  await ctx.close();
}

// 3. CLS: render build tanpa JS lawan sesudah hydrate.
for (const ukuran of [[375, 667], [1366, 657]]) {
  const ukur = (page) => page.evaluate(() => {
    const w = document.querySelector("[data-race-ledger]");
    const p = w.closest("astro-island").nextElementSibling;
    return { tinggi: w.getBoundingClientRect().height, sesudah: p.getBoundingClientRect().top + scrollY };
  });
  const a = await buka(ukuran, { javaScriptEnabled: false });
  const statis = await ukur(a.page);
  await a.ctx.close();
  const b = await buka(ukuran);
  await siap(b.page);
  const hidup = await ukur(b.page);
  await b.ctx.close();
  const geser = Math.max(Math.abs(statis.tinggi - hidup.tinggi), Math.abs(statis.sesudah - hidup.sesudah));
  lapor(geser <= 1, `race CLS ${ukuran.join("x")}: tinggi tanpa JS ${statis.tinggi.toFixed(1)} px, sesudah hydrate ${hidup.tinggi.toFixed(1)} px, isi sesudahnya geser ${geser.toFixed(1)} px`);
}

// 4. Ukuran JS halaman uji (byte jaringan saat dimuat dan digulir sampai bawah, gzip per respons).
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 657 } });
  const page = await ctx.newPage();
  const isi = [];
  page.on("response", (r) => { if (/\.js(\?.*)?$/.test(r.url()) && r.ok()) isi.push(r.body().catch(() => Buffer.alloc(0))); });
  await page.goto(BASE + HAL, { waitUntil: "networkidle" });
  await page.evaluate(async () => { for (let i = 0; i < 50 && scrollY + innerHeight < document.documentElement.scrollHeight - 2; i++) { scrollBy(0, 600); await new Promise((s) => setTimeout(s, 30)); } });
  await page.waitForLoadState("networkidle");
  const b = await Promise.all(isi);
  const flow = b.some((x) => x.includes("react-flow__pane"));
  lapor(!flow, `race ${HAL} tidak memuat React Flow`);
  console.log(`info JS ${HAL}: ${b.length} file, ${(b.reduce((n, x) => n + x.length, 0) / 1024).toFixed(1)} KB tanpa kompresi, ${(b.reduce((n, x) => n + gzipSync(x).length, 0) / 1024).toFixed(1)} KB gzip`);
  await ctx.close();
}

await browser.close();
console.log(gagal ? `Widget race ledger GAGAL (${gagal})` : "Widget race ledger: tebak dulu, keyboard, ARIA, reduced motion, angka dari rekaman, CLS lolos");
process.exit(gagal ? 1 : 0);
