// Memeriksa widget model biaya tiga tahun (ADR 59) di /uji/biaya/ dan di halaman ADR 59:
// - tebak dulu: sebelum menebak semua tombol skenario nonaktif; sesudah menebak fokus ada di tombol skenario pertama (bukan body);
// - angka: setiap skenario (tabel komponen dan kumulatif) sama dengan hitungan alat ini sendiri dari data JSON (bukan logika.ts),
//   kalimat kesimpulan memuat selisih dan pemenang yang benar, aria-pressed tepat satu per kelompok;
// - role=status: dua wilayah, masing-masing satu kalimat pendek yang memuat angka kunci atau kata kunci;
// - target >= 24 px, 320 px dengan font Verdana tanpa gulir ke samping, tabel di dalam widget, axe-core (WCAG A/AA sampai 2.2)
//   gelap dan terang, tanpa JavaScript widget tersembunyi.
//   node tools/ukur-biaya.mjs --url http://127.0.0.1:4321
import { existsSync, readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { awasi } from "./lib/batas.mjs";
import { AXE_PATH, TAG_WCAG } from "./lib/axe.mjs";

const arg = (nama, bawaan) => { const i = process.argv.indexOf(nama); return i > -1 ? process.argv[i + 1] : bawaan; };
const BASE = arg("--url", "http://127.0.0.1:4321");
const D = JSON.parse(readFileSync(new URL("../data/widget/t5-onprem-biaya.json", import.meta.url), "utf8"));
const HAL = ["/uji/biaya/", "/tahap-5/on-prem-lawan-cloud/"].filter((p) => p.startsWith("/uji/") || existsSync(new URL(`../dist${p}index.html`, import.meta.url)));

// Hitungan sendiri, dengan bilangan pecahan: k(t) = (1 + g)^(t − 1).
function ref(ubah) {
  const m = { ...D.masukan, ...ubah };
  const k = (t) => (1 + m.tumbuh / 100) ** (t - 1);
  const cl = [], op = [];
  for (let t = 1; t <= 3; t++) {
    const ci = m.cloudInfra1 * k(t), co = m.orangDasar * m.biayaOrang, cr = (m.cloudRisikoPeluang * m.cloudRisikoDampak) / 100;
    cl.push({ infra: ci, orang: co, migrasi: 0, risiko: cr });
    const oi = (t === 1 ? m.perangkat1 : m.perangkat1 * (k(t) - k(t - 1))) + m.sewa;
    op.push({ infra: oi, orang: (m.orangDasar + m.orangTambahan) * m.biayaOrang, migrasi: t === 1 ? m.migrasi : 0, risiko: (m.onpremRisikoPeluang * m.onpremRisikoDampak) / 100 });
  }
  const tot = (a) => a.reduce((s, x) => s + x.infra + x.orang + x.migrasi + x.risiko, 0);
  const jum = (a, f) => a.reduce((s, x) => s + x[f], 0);
  const kum = (a) => a.map((_, i) => tot(a.slice(0, i + 1)));
  const baris = ["infra", "orang", "migrasi", "risiko"].map((f) => [Math.round(jum(cl, f)), Math.round(jum(op, f))]);
  baris.push([Math.round(tot(cl)), Math.round(tot(op))]);
  return { baris, kum: kum(cl).map((c, i) => [Math.round(c), Math.round(kum(op)[i])]), selisih: Math.round(Math.abs(tot(cl) - tot(op))), onpremMurah: tot(op) < tot(cl) };
}
const titik = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const angkaDari = (s) => Number(s.replace(/\./g, ""));

let gagal = 0;
const lapor = (ok, pesan) => { if (!ok) gagal++; console.log(`${ok ? "ok" : "GAGAL"} ${pesan}`); };

const browser = awasi(await chromium.launch(), { alat: "biaya" });
async function siap(page, path) {
  await page.goto(BASE + path, { waitUntil: "load" });
  // Di halaman ADR widget ada di blok lipat yang tertutup: buka dulu supaya island visible terhidrasi.
  await page.evaluate(() => { const d = document.querySelector(".bt")?.closest("details"); if (d) d.open = true; });
  await page.locator(".bt").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector(".bt .bb-predict__opts button") && !document.querySelector("astro-island[ssr] .bt"), null, { timeout: 15000 });
  await page.waitForTimeout(300);
}
const tabel = (page) => page.evaluate(() => {
  const t = [...document.querySelectorAll(".bt table")];
  const sel = (tb) => [...tb.querySelectorAll("tbody tr")].map((tr) => [...tr.querySelectorAll("td")].map((td) => td.textContent.trim()));
  return { komponen: sel(t[0]), kumulatif: sel(t[1]) };
});

for (const path of HAL) {
  const page = await browser.newPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  await siap(page, path);
  const awal = ref(D.skenario[D.awal].ubah);
  // 1. sebelum menebak
  const mati = await page.$$eval(".bt .bb-row button", (b) => b.map((x) => x.disabled));
  lapor(mati.length === D.skenario.length && mati.every(Boolean), `${path} sebelum menebak: ${mati.length} tombol skenario nonaktif`);
  let t = await tabel(page);
  lapor(JSON.stringify(t.komponen.map((r) => r.map(angkaDari))) === JSON.stringify(awal.baris), `${path} skenario awal: tabel komponen sama dengan hitungan alat`);
  // 2. tebak lewat keyboard: pilihan salah (indeks 0), fokus pindah ke tombol skenario pertama
  const pilihan = page.locator(".bt .bb-predict__opts button");
  await pilihan.nth(0).focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  const fokus = await page.evaluate(() => { const a = document.activeElement; return { tag: a?.tagName, diBaris: !!a?.closest(".bt .bb-row"), pressed: [...document.querySelectorAll(".bt .bb-predict__opts button")].map((b) => b.getAttribute("aria-pressed")) }; });
  lapor(fokus.tag === "BUTTON" && fokus.diBaris, `${path} sesudah menebak fokus di tombol skenario (${fokus.tag}, diBaris ${fokus.diBaris})`);
  lapor(fokus.pressed[0] === "true" && fokus.pressed.slice(1).every((x) => x === "false"), `${path} aria-pressed tebakan: ${fokus.pressed.join(",")}`);
  const matiTebak = await page.$$eval(".bt .bb-predict__opts button", (b) => b.map((x) => x.disabled));
  lapor(matiTebak.length === D.tebak.pilihan.length && matiTebak.every(Boolean), `${path} sesudah menebak semua pilihan tebakan nonaktif (${matiTebak.join(",")})`);
  // 3. semua skenario: angka tabel, kalimat kesimpulan, aria-pressed
  for (let i = 0; i < D.skenario.length; i++) {
    await page.locator(".bt .bb-row button").nth(i).click();
    const r = ref(D.skenario[i].ubah);
    t = await tabel(page);
    const komponen = JSON.stringify(t.komponen.map((x) => x.map(angkaDari)));
    const kum = JSON.stringify(t.kumulatif.map((x) => x.map(angkaDari)));
    lapor(komponen === JSON.stringify(r.baris) && kum === JSON.stringify(r.kum), `${path} skenario "${D.skenario[i].label}": komponen ${r.baris.at(-1).join(" / ")} dan kumulatif ${r.kum.at(-1).join(" / ")} sama dengan hitungan alat`);
    const status = await page.$$eval(".bt [role=status]", (e) => e.map((x) => x.textContent.trim()));
    const kalimat = status[0];
    const pemenang = r.onpremMurah ? "On-prem lebih hemat" : "Cloud lebih hemat";
    lapor(kalimat.startsWith(pemenang) && kalimat.includes(`${titik(r.selisih)} juta rupiah`), `${path} kalimat kesimpulan "${kalimat.slice(0, 60)}..."`);
    const pressed = await page.$$eval(".bt .bb-row button", (b) => b.map((x) => x.getAttribute("aria-pressed")));
    lapor(pressed.filter((x) => x === "true").length === 1 && pressed[i] === "true", `${path} aria-pressed skenario ${i}`);
    if (i === D.tebak.skenario) {
      lapor(status[1].startsWith("Belum tepat:") && status[1].includes(D.tebak.alasan), `${path} jawaban tebakan terbuka sesudah skenario ${i}, tebakan salah: "${status[1].slice(0, 40)}..."`);
    }
  }
  // 4. role=status
  const st = await page.$$eval(".bt [role=status]", (e) => e.map((x) => ({ n: x.querySelectorAll("p").length, teks: x.textContent.trim() })));
  lapor(st.length === 2 && st.every((x) => x.n <= 1 && x.teks.length <= 220 && x.teks.length > 0), `${path} role=status: ${st.length} wilayah, panjang ${st.map((x) => x.teks.length).join(" dan ")} karakter`);
  // 5. target >= 24 px
  const kecil = await page.$$eval(".bt button", (b) => b.map((x) => x.getBoundingClientRect()).filter((r) => r.width < 24 || r.height < 24).length);
  lapor(kecil === 0, `${path} target >= 24 px: ${kecil} tombol terlalu kecil`);
  // 6. axe gelap dan terang
  for (const tema of ["dark", "light"]) {
    await page.evaluate((x) => { document.documentElement.dataset.theme = x; }, tema);
    await page.waitForTimeout(100);
    await page.addScriptTag({ path: AXE_PATH });
    const v = await page.evaluate(async (tag) => { const r = await window.axe.run(document.querySelector(".bt"), { runOnly: { type: "tag", values: tag }, resultTypes: ["violations"] }); return r.violations.map((x) => `${x.id}(${x.nodes.length})`); }, TAG_WCAG);
    lapor(v.length === 0, `${path} axe ${tema}: ${v.length ? v.join(", ") : "0 pelanggaran"}`);
  }
  await page.close();

  // 7. 320 px dengan font Verdana (lebih lebar dari Satoshi)
  const kecilHalaman = await browser.newPage({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true });
  await siap(kecilHalaman, path);
  await kecilHalaman.addStyleTag({ content: ".sl-markdown-content, .sl-markdown-content * { font-family: Verdana, sans-serif !important; }" });
  await kecilHalaman.locator(".bb-predict__opts button").nth(2).click();
  await kecilHalaman.locator(".bt .bb-row button").nth(0).click();
  await kecilHalaman.waitForTimeout(150);
  const u = await kecilHalaman.evaluate(() => {
    const w = document.querySelector(".bt").getBoundingClientRect();
    return { halaman: document.documentElement.scrollWidth, kanan: Math.round(w.right), kiri: Math.round(w.left), tabel: [...document.querySelectorAll(".bt table")].map((t) => t.scrollWidth - t.parentElement.clientWidth) };
  });
  lapor(u.halaman <= 320 && u.kanan <= 320 && u.kiri >= 0 && u.tabel.every((x) => x <= 1), `${path} 320 px Verdana: halaman ${u.halaman}, widget ${u.kiri}..${u.kanan}, kelebihan tabel ${u.tabel.join(",")}`);
  await kecilHalaman.close();

  // 8. tanpa JavaScript widget tersembunyi
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 667 } });
  const tanpa = await ctx.newPage();
  await tanpa.goto(BASE + path, { waitUntil: "load" });
  const tampil = await tanpa.evaluate(() => { const e = document.querySelector(".bt"); return e ? getComputedStyle(e).display : "tidak ada"; });
  lapor(tampil === "none", `${path} tanpa JavaScript: widget display ${tampil}`);
  await ctx.close();
}
await browser.close();
console.log(gagal ? `Widget biaya GAGAL (${gagal})` : `Widget biaya: tebak dulu, angka dari hitungan sendiri, ARIA, target, 320 px, axe, tanpa JavaScript lolos (${HAL.length} halaman)`);
process.exit(gagal ? 1 : 0);
