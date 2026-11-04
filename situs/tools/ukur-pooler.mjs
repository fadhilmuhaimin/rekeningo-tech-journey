// Memeriksa widget kalkulator koneksi dan pooler (ADR 52) di /uji/pooler/ dan di halaman ADR 52:
// - tebak dulu: sebelum menebak semua tombol skenario nonaktif; sesudah menebak fokus ada di tombol skenario pertama (bukan body);
// - angka: setiap skenario (enam baris, dua kolom) sama dengan hitungan alat ini sendiri dari data JSON (bukan logika.ts),
//   kalimat kesimpulan memuat angka kunci kasus yang benar, aria-pressed tepat satu per kelompok;
// - role=status: dua wilayah, masing-masing satu kalimat pendek yang memuat angka kunci atau kata kunci;
// - target >= 24 px, 320 px dengan font Verdana tanpa gulir ke samping, tabel di dalam widget, axe-core (WCAG A/AA sampai 2.2)
//   gelap dan terang, tanpa JavaScript widget tersembunyi.
//   node tools/ukur-pooler.mjs --url http://127.0.0.1:4321
import { existsSync, readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { awasi } from "./lib/batas.mjs";
import { AXE_PATH, TAG_WCAG } from "./lib/axe.mjs";

const arg = (nama, bawaan) => { const i = process.argv.indexOf(nama); return i > -1 ? process.argv[i + 1] : bawaan; };
const BASE = arg("--url", "http://127.0.0.1:4321");
const D = JSON.parse(readFileSync(new URL("../data/widget/t5-pooler-kalkulator.json", import.meta.url), "utf8"));
const HAL = ["/uji/pooler/", "/tahap-5/pooler-koneksi/"];

// Hitungan sendiri, tanpa memakai logika.ts. Mengembalikan baris tabel [tanpa pooler, dengan PgBouncer], null untuk sel "–".
function ref(ubah) {
  const m = { ...D.masukan, ...ubah };
  const potensi = m.service * m.pod * m.poolPod;
  const tersedia = m.maxConnections - m.cadangan;
  const perInstance = m.maxDbPerInstance > 0 ? Math.min(m.maxDbPerInstance, m.role * m.defaultPoolSize) : m.role * m.defaultPoolSize;
  const server = Math.min(potensi, m.instance * perInstance);
  const klienLebih = Math.max(0, potensi - m.maxClient);
  const dengan = Math.max(0, server - tersedia);
  const tanpa = Math.max(0, potensi - tersedia);
  const baris = [[potensi, potensi], [potensi, server], [tersedia, tersedia], [tanpa, dengan], [null, m.maxClient], [null, klienLebih]];
  const kasus = klienLebih > 0 ? "klienLewat" : dengan > 0 ? "serverLewat" : tanpa > 0 ? "pooler" : "muatTanpa";
  const nilai = { potensi, tersedia, ditolak: tanpa, ditolakServer: dengan, keServer: server, serverMaks: m.instance * perInstance, maxClient: m.maxClient, klienLebih };
  return { baris, kasus, nilai };
}
const titik = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const angkaDari = (s) => (s === "–" ? null : Number(s.replace(/\./g, "")));

let gagal = 0;
const lapor = (ok, pesan) => { if (!ok) gagal++; console.log(`${ok ? "ok" : "GAGAL"} ${pesan}`); };

// Halaman yang tidak ada di dist tidak dilewati diam-diam: itu kegagalan.
for (const p of HAL) lapor(existsSync(new URL(`../dist${p}index.html`, import.meta.url)), `${p} ada di dist`);

const browser = awasi(await chromium.launch(), { alat: "pooler" });
async function siap(page, path) {
  await page.goto(BASE + path, { waitUntil: "load" });
  // Di halaman ADR widget ada di blok lipat: buka dulu supaya island visible terhidrasi.
  await page.evaluate(() => { const d = document.querySelector(".kp")?.closest("details"); if (d) d.open = true; });
  await page.locator(".kp").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector(".kp .bb-predict__opts button") && !document.querySelector("astro-island[ssr] .kp"), null, { timeout: 15000 });
  await page.waitForTimeout(300);
}
const tabel = (page) => page.evaluate(() => [...document.querySelectorAll(".kp tbody tr")].map((tr) => [...tr.querySelectorAll("td")].map((td) => td.textContent.trim())));

for (const path of HAL) {
  const page = await browser.newPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  await siap(page, path);
  const awal = ref(D.skenario[D.awal].ubah);
  // 1. sebelum menebak
  const mati = await page.$$eval(".kp .bb-row button", (b) => b.map((x) => x.disabled));
  lapor(mati.length === D.skenario.length && mati.every(Boolean), `${path} sebelum menebak: ${mati.length} tombol skenario nonaktif`);
  let t = await tabel(page);
  lapor(JSON.stringify(t.map((r) => r.map(angkaDari))) === JSON.stringify(awal.baris), `${path} skenario awal: tabel sama dengan hitungan alat`);
  // 1b. kepala widget dan struktur tabel: nama grup, chip sumber, catatan sumber, caption, kepala kolom dan baris dari data JSON
  const kepala = await page.evaluate(() => {
    const w = document.querySelector(".kp"), tb = [...w.querySelectorAll("table")];
    const teks = (e) => (e ? e.textContent.trim() : "(tidak ada)");
    return {
      nama: w.getAttribute("aria-label"), peran: w.getAttribute("role"), chip: teks(w.querySelector(".bb-chip")), sumber: teks(w.querySelector(".jt-sumber")),
      jumlahTabel: tb.length, caption: teks(tb[0]?.querySelector("caption")), kolom: [...(tb[0]?.querySelectorAll("thead th") ?? [])].map(teks), baris: [...(tb[0]?.querySelectorAll("tbody th") ?? [])].map(teks),
    };
  });
  const L = D.label, B = L.baris;
  lapor(kepala.peran === "group" && kepala.nama === D.judul, `${path} grup widget punya nama dari data: "${kepala.nama}"`);
  lapor(kepala.chip === L.sumber && kepala.sumber === D.sumber.teks, `${path} chip sumber "${kepala.chip}" dan catatan sumber sama dengan data`);
  lapor(kepala.jumlahTabel === 1 && kepala.caption === L.caption, `${path} satu tabel dengan caption dari data`);
  lapor(JSON.stringify(kepala.kolom) === JSON.stringify([L.besaran, L.tanpa, L.dengan]), `${path} kepala kolom tabel`);
  lapor(JSON.stringify(kepala.baris) === JSON.stringify([B.potensi, B.keServer, B.tersedia, B.ditolak, B.batasKlien, B.klienLebih]), `${path} kepala baris: enam besaran berurutan`);
  // 2. tebak lewat keyboard: pilihan salah (indeks 0), fokus pindah ke tombol skenario pertama
  const pilihan = page.locator(".kp .bb-predict__opts button");
  await pilihan.nth(0).focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  const fokus = await page.evaluate(() => { const a = document.activeElement; return { tag: a?.tagName, diBaris: !!a?.closest(".kp .bb-row"), pressed: [...document.querySelectorAll(".kp .bb-predict__opts button")].map((b) => b.getAttribute("aria-pressed")) }; });
  lapor(fokus.tag === "BUTTON" && fokus.diBaris, `${path} sesudah menebak fokus di tombol skenario (${fokus.tag}, diBaris ${fokus.diBaris})`);
  lapor(fokus.pressed[0] === "true" && fokus.pressed.slice(1).every((x) => x === "false"), `${path} aria-pressed tebakan: ${fokus.pressed.join(",")}`);
  const matiTebak = await page.$$eval(".kp .bb-predict__opts button", (b) => b.map((x) => x.disabled));
  lapor(matiTebak.length === D.tebak.pilihan.length && matiTebak.every(Boolean), `${path} sesudah menebak semua pilihan tebakan nonaktif (${matiTebak.join(",")})`);
  const jumlahStatus = await page.$$eval(".kp [role=status]", (e) => e.length);
  lapor(jumlahStatus === 2, `${path} dua wilayah role=status (kesimpulan dan jawaban tebakan): ${jumlahStatus}`);
  if (jumlahStatus !== 2) { await page.close(); continue; }
  // 2b. skenario lain (bukan pembuka jawaban) tidak membuka jawaban tebakan: jalur varian tidak membuka jawaban jalur utama
  const lain = D.skenario.findIndex((_, i) => i !== D.tebak.skenario);
  await page.locator(".kp .bb-row button").nth(lain).click();
  const statusLain = await page.$$eval(".kp [role=status]", (e) => e.map((x) => x.textContent.trim()));
  lapor(statusLain[1] === D.label.lanjut, `${path} skenario "${D.skenario[lain].label}" tidak membuka jawaban tebakan: "${statusLain[1].slice(0, 50)}"`);
  // 3. semua skenario: angka tabel, kalimat kesimpulan, aria-pressed
  for (let i = 0; i < D.skenario.length; i++) {
    await page.locator(".kp .bb-row button").nth(i).click();
    const r = ref(D.skenario[i].ubah);
    t = await tabel(page);
    lapor(JSON.stringify(t.map((x) => x.map(angkaDari))) === JSON.stringify(r.baris), `${path} skenario "${D.skenario[i].label}": tabel ${JSON.stringify(r.baris.map((x) => x[1]))} sama dengan hitungan alat`);
    const status = await page.$$eval(".kp [role=status]", (e) => e.map((x) => x.textContent.trim()));
    const kalimat = status[0];
    const harap = L.kesimpulan[r.kasus].replace(/\{(\w+)\}/g, (_, k) => titik(r.nilai[k]));
    lapor(kalimat === harap, `${path} kalimat kasus ${r.kasus}: "${kalimat.slice(0, 60)}..."`);
    const pressed = await page.$$eval(".kp .bb-row button", (b) => b.map((x) => x.getAttribute("aria-pressed")));
    lapor(pressed.filter((x) => x === "true").length === 1 && pressed[i] === "true", `${path} aria-pressed skenario ${i}`);
    if (i === D.tebak.skenario) {
      lapor(status[1].startsWith("Belum tepat:") && status[1].includes(D.tebak.alasan), `${path} jawaban tebakan terbuka sesudah skenario ${i}, tebakan salah: "${status[1].slice(0, 40)}..."`);
    }
  }
  // 4. role=status
  const st = await page.$$eval(".kp [role=status]", (e) => e.map((x) => ({ n: x.querySelectorAll("p").length, teks: x.textContent.trim() })));
  lapor(st.length === 2 && st.every((x) => x.n <= 1 && x.teks.length <= 260 && x.teks.length > 0), `${path} role=status: ${st.length} wilayah, panjang ${st.map((x) => x.teks.length).join(" dan ")} karakter`);
  // 5. target >= 24 px
  const kecil = await page.$$eval(".kp button", (b) => b.map((x) => x.getBoundingClientRect()).filter((r) => r.width < 24 || r.height < 24).length);
  lapor(kecil === 0, `${path} target >= 24 px: ${kecil} tombol terlalu kecil`);
  // 6. axe gelap dan terang
  for (const tema of ["dark", "light"]) {
    await page.evaluate((x) => { document.documentElement.dataset.theme = x; }, tema);
    await page.waitForTimeout(100);
    await page.addScriptTag({ path: AXE_PATH });
    const v = await page.evaluate(async (tag) => { const r = await window.axe.run(document.querySelector(".kp"), { runOnly: { type: "tag", values: tag }, resultTypes: ["violations"] }); return r.violations.map((x) => `${x.id}(${x.nodes.length})`); }, TAG_WCAG);
    lapor(v.length === 0, `${path} axe ${tema}: ${v.length ? v.join(", ") : "0 pelanggaran"}`);
  }
  await page.close();

  // 7. 320 px dengan font Verdana (lebih lebar dari Satoshi)
  const kecilHalaman = await browser.newPage({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true });
  await siap(kecilHalaman, path);
  await kecilHalaman.addStyleTag({ content: ".sl-markdown-content, .sl-markdown-content * { font-family: Verdana, sans-serif !important; }" });
  await kecilHalaman.locator(".bb-predict__opts button").nth(2).click();
  await kecilHalaman.locator(".kp .bb-row button").nth(D.tebak.skenario).click();
  await kecilHalaman.waitForTimeout(150);
  const u = await kecilHalaman.evaluate(() => {
    const w = document.querySelector(".kp").getBoundingClientRect();
    return { halaman: document.documentElement.scrollWidth, kanan: Math.round(w.right), kiri: Math.round(w.left), tabel: [...document.querySelectorAll(".kp table")].map((t) => t.scrollWidth - t.parentElement.clientWidth) };
  });
  lapor(u.halaman <= 320 && u.kanan <= 320 && u.kiri >= 0 && u.tabel.every((x) => x <= 1), `${path} 320 px Verdana: halaman ${u.halaman}, widget ${u.kiri}..${u.kanan}, kelebihan tabel ${u.tabel.join(",")}`);
  await kecilHalaman.close();

  // 8. tanpa JavaScript widget tersembunyi
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 667 } });
  const tanpa = await ctx.newPage();
  await tanpa.goto(BASE + path, { waitUntil: "load" });
  const tampil = await tanpa.evaluate(() => { const e = document.querySelector(".kp"); return e ? getComputedStyle(e).display : "tidak ada"; });
  lapor(tampil === "none", `${path} tanpa JavaScript: widget display ${tampil}`);
  await ctx.close();
}
await browser.close();
console.log(gagal ? `Widget pooler GAGAL (${gagal})` : `Widget pooler: tebak dulu, angka dari hitungan sendiri, ARIA, target, 320 px, axe, tanpa JavaScript lolos (${HAL.length} halaman)`);
process.exit(gagal ? 1 : 0);
