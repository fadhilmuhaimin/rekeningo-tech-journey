// Percobaan macet renderer (G2d, keputusan 367). Tidak masuk gerbang. Mengulang langkah ukur-luapan (buka semua blok,
// gulir sampai bawah) pada halaman SARING (bawaan /tahap-1/; awali "!" untuk mengecualikan) sebanyak PUTARAN kali untuk
// satu LENGAN, mencatat setiap renderer macet (baris KEJADIAN) lalu melanjutkan putaran, dan menutup dengan baris HASIL.
//   LENGAN: kontrol | konteks-per-halaman | tanpa-buka | chromium-penuh | headed (jalankan di bawah xvfb-run) | tanpa-gpu;
//   nama lain berjalan seperti kontrol (dipakai untuk lengan yang mengubah dist, mis. tanpa-blok, tanpa-island).
//   JEJAK=1: trace Chromium seluruh proses (ring buffer); saat macet trace disimpan ke jejak/ dan slice yang masih
//   terbuka per thread dicetak (baris JEJAK). Di macOS macet tidak pernah muncul (0 dari 10.080 muat); jalankan di
//   runner Linux, mis. lewat branch percobaan/** dengan workflow sementara (contoh: run 38292073724).
//   Dipakai untuk memeriksa ulang setelah Playwright/Chromium naik versi: bila kontrol 60 putaran tanpa KEJADIAN,
//   ulang sekali di ukur-luapan bisa dicabut (keputusan 367).
//   cd situs && LENGAN=kontrol PUTARAN=30 node tools/percobaan-macet.mjs
// Satu kejadian = satu renderer berhenti; halaman lain yang tertahan di konteks yang sama diantre ulang (korban).
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { denganBatas, Macet } from "./lib/batas.mjs";
import { pasangJejak, diagnosaJejak, sesiBrowser } from "./lib/jejak.mjs";

const BASE = process.env.BASE || "http://127.0.0.1:4321";
const LENGAN = process.env.LENGAN || "kontrol";
const PUTARAN = Number(process.env.PUTARAN || 24);
const SARING = process.env.SARING || "/tahap-1/";
const PARALEL = Number(process.env.PARALEL || 6);
const UKURAN = [
  { nama: "360x740", width: 360, height: 740 },
  { nama: "375x667", width: 375, height: 667 },
];

function halaman() {
  const out = [];
  (function walk(d, rel) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) { if (!["_astro", "pagefind", "widgets", "vendor", "fonts"].includes(e.name)) walk(path.join(d, e.name), rel + e.name + "/"); }
      else if (e.name === "index.html") out.push("/" + rel);
    }
  })(path.resolve("dist"), "");
  return out.sort().filter((p) => (SARING.startsWith("!") ? !p.startsWith(SARING.slice(1)) : p.startsWith(SARING)));
}

// Sama dengan ukur() di ukur-luapan.mjs, dengan `buka` sebagai saklar lengan tanpa-buka; pengukurannya diringkas.
async function ukur(buka) {
  const tahap = (t) => { window.__tahap = t; };
  const rAF = () => new Promise((r) => requestAnimationFrame(() => r()));
  tahap("document.fonts.ready");
  await document.fonts.ready;
  if (buka) for (const d of document.querySelectorAll("details")) d.open = true;
  tahap("rAF sesudah membuka details");
  await rAF();
  for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) {
    window.scrollTo(0, y);
    tahap(`rAF sesudah gulir ke ${y}`);
    await rAF();
  }
  window.scrollTo(0, 0);
  tahap("setTimeout 250 ms");
  await new Promise((r) => setTimeout(r, 250));
  tahap("rAF terakhir");
  await rAF();
  tahap("mengukur");
  let chip = 0;
  for (const c of document.querySelectorAll(".sl-markdown-content .bb-chip")) if (c.getBoundingClientRect().width) chip++;
  return { sw: document.documentElement.scrollWidth, chip };
}

const opsiLuncur = {
  "chromium-penuh": { channel: "chromium" },
  headed: { channel: "chromium", headless: false },
  "tanpa-gpu": { args: ["--disable-gpu"] },
}[LENGAN] ?? {};
const opsi = { viewport: null, isMobile: true, hasTouch: true, reducedMotion: "reduce" };
const buka = LENGAN !== "tanpa-buka";
const perHalaman = LENGAN === "konteks-per-halaman";

// JEJAK=1: trace Chromium seluruh proses per putaran (Tracing lewat CDP browser). Saat macet trace dihentikan sebelum
// konteks yang macet ditutup, disimpan, dan dibaca: slice yang masih terbuka di setiap thread renderer/GPU/browser
// menunjukkan panggilan yang sedang ditunggu.
const JEJAK = !!process.env.JEJAK;
const KATEGORI = (process.env.JEJAK_KATEGORI || "toplevel,base,cc,mojom,gpu").split(",");
const BUFFER_KB = Number(process.env.JEJAK_KB || 96 * 1024);
let rekam = false, kunciJejak = Promise.resolve(), sesiJejak = null;
const giliran = (f) => (kunciJejak = kunciJejak.then(f, f));
// Ring buffer (recordContinuously): yang tersimpan adalah detik-detik terakhir sebelum Tracing.end. Saat macet semua
// proses hampir diam, jadi slice yang dibuka saat thread mulai menunggu tidak tertimpa.
const mulaiJejak = () => giliran(async () => {
  if (rekam) return;
  sesiJejak ??= await browser.newBrowserCDPSession();
  await sesiJejak.send("Tracing.start", { transferMode: "ReturnAsStream", traceConfig: { recordMode: "recordContinuously", traceBufferSizeInKb: BUFFER_KB, includedCategories: KATEGORI } });
  rekam = true;
});
async function akhiriJejak() {
  const selesai = new Promise((r) => sesiJejak.once("Tracing.tracingComplete", r));
  await sesiJejak.send("Tracing.end");
  const { stream } = await selesai;
  const potong = [];
  for (;;) {
    const { data, eof, base64Encoded } = await sesiJejak.send("IO.read", { handle: stream, size: 4 << 20 });
    potong.push(Buffer.from(data, base64Encoded ? "base64" : "utf8"));
    if (eof) break;
  }
  await sesiJejak.send("IO.close", { handle: stream });
  return Buffer.concat(potong);
}
const hentiJejak = (simpanKe) => giliran(async () => {
  if (!rekam) return;
  rekam = false;
  const buf = await denganBatas(akhiriJejak, "Tracing.end", { ms: 120_000 }).catch((e) => { console.log(`Tracing.end gagal: ${e.message}`); return null; });
  if (!buf || !simpanKe) return;
  fs.mkdirSync("jejak", { recursive: true });
  fs.writeFileSync(simpanKe, buf);
  console.log(bacaJejak(buf, simpanKe));
});
function bacaJejak(buf, nama) {
  let ev;
  try { ev = JSON.parse(buf.toString()).traceEvents ?? JSON.parse(buf.toString()); } catch (e) { return `${nama}: trace tidak terbaca (${e.message})`; }
  const proses = new Map(), thread = new Map(), tumpuk = new Map(), akhir = new Map(), terakhir = new Map();
  let tMaks = 0;
  for (const e of ev) {
    if (e.ph === "M" && e.name === "process_name") proses.set(e.pid, e.args?.name);
    if (e.ph === "M" && e.name === "thread_name") thread.set(`${e.pid}/${e.tid}`, e.args?.name);
    if (e.ph === "M" || typeof e.ts !== "number") continue;
    const k = `${e.pid}/${e.tid}`;
    tMaks = Math.max(tMaks, e.ts + (e.dur || 0));
    akhir.set(k, Math.max(akhir.get(k) ?? 0, e.ts + (e.dur || 0)));
    const l = terakhir.get(k) ?? []; l.push(`${e.ph}:${e.name}`); if (l.length > 8) l.shift(); terakhir.set(k, l);
    if (e.ph === "B") { const s = tumpuk.get(k) ?? []; s.push(`${e.name}${e.args ? " " + JSON.stringify(e.args).slice(0, 120) : ""}`); tumpuk.set(k, s); }
    else if (e.ph === "E") { const s = tumpuk.get(k); if (s?.length) s.pop(); }
  }
  const baris = [`JEJAK ${nama}: ${ev.length} event, ${(buf.length / 1e6).toFixed(1)} MB`];
  for (const [k, t] of [...akhir].sort((a, b) => a[1] - b[1])) {
    const [pid] = k.split("/");
    const sunyi = (tMaks - t) / 1e6;
    const s = tumpuk.get(k) ?? [];
    const nm = thread.get(k) ?? "";
    const penting = /^(CrRendererMain|Compositor|CrGpuMain|VizCompositorThread|CrBrowserMain|Chrome_IOThread|Chrome_ChildIOThread)$/.test(nm) || s.length > 1;
    if (!penting) continue;
    baris.push(`  ${proses.get(Number(pid)) ?? pid}/${thread.get(k) ?? k}: sunyi ${sunyi.toFixed(1)} s; terbuka [${s.join(" > ")}]; terakhir [${(terakhir.get(k) ?? []).join(", ")}]`);
  }
  return baris.join("\n");
}

const t0 = Date.now();
const daftar = halaman();
const browser = await chromium.launch(opsiLuncur);
console.log(`lengan ${LENGAN}: ${daftar.length} halaman × ${UKURAN.length} ukuran × ${PUTARAN} putaran, PARALEL ${PARALEL}, browser ${browser.version()}, opsi ${JSON.stringify(opsiLuncur)}`);
const cdpBrowser = await sesiBrowser(browser);
const kejadian = [];
let muat = 0, korban = 0;
const galat = new Map();

async function satuUkuran(u, putaran) {
  const o = { ...opsi, viewport: { width: u.width, height: u.height } };
  const antre = [...daftar];
  let gen = null;
  const genBaru = async () => { gen = { ctx: perHalaman ? null : await browser.newContext(o), pemilik: null, terbang: new Set() }; };
  await genBaru();
  await Promise.all(Array.from({ length: PARALEL }, async () => {
    let g = null, page = null, jejak = null, ctxSendiri = null;
    for (let p = antre.shift(); p !== undefined; p = antre.shift()) {
      if (perHalaman) {
        ctxSendiri = await browser.newContext(o);
        g = { ctx: ctxSendiri, pemilik: null, terbang: new Set() };
        page = await ctxSendiri.newPage();
        jejak = await pasangJejak(page, cdpBrowser);
      } else if (g !== gen || !page) {
        g = gen;
        page = await g.ctx.newPage();
        jejak = await pasangJejak(page, cdpBrowser);
      }
      const k = `${u.nama} ${p}`;
      g.terbang.add(p);
      const gIni = g;
      try {
        await denganBatas(async () => {
          jejak.tandai("goto");
          await page.goto(BASE + p, { waitUntil: "load" });
          jejak.tandai("evaluate ukur");
          return page.evaluate(ukur, buka);
        }, `${LENGAN} putaran ${putaran} ${k}`, {
          // Hanya halaman pertama yang macet di satu konteks yang didiagnosa; sisanya korban renderer yang sama.
          diagnosa: () => { if (gIni.pemilik) return "korban"; gIni.pemilik = p; return diagnosaJejak(jejak, () => page.evaluate(() => `tahap "${window.__tahap ?? "-"}"`)); },
          msDiagnosa: 10_000,
        });
        muat++;
      } catch (e) {
        const bersama = [...gIni.terbang].filter((x) => x !== p);
        gIni.terbang.delete(p);
        if (!(e instanceof Macet) || gIni.pemilik !== p) {
          // Korban (konteks sudah mati atau ditutup): ulangi halaman ini di konteks baru.
          if (!(e instanceof Macet) && !gIni.pemilik) {
            // Galat lain (mis. koneksi ke server percobaan putus): dicatat, halaman diulang paling banyak dua kali.
            galat.set(k, (galat.get(k) ?? 0) + 1);
            console.log(`GALAT ${k}: ${e.message.split("\n")[0]}`);
            if (galat.get(k) > 2) throw e;
            antre.push(p);
            if (perHalaman) denganBatas(() => gIni.ctx.close(), "tutup", { ms: 10_000 }).catch(() => {});
            else { await denganBatas(() => page.close(), "tutup", { ms: 5_000 }).catch(() => {}); page = null; }
            continue;
          }
          korban++; antre.push(p); page = null;
          continue;
        }
        kejadian.push({ putaran, k, diam: !!jejak.diam, bersama, pesan: e.message });
        console.log(`KEJADIAN ${e.message}; diam ${!!jejak.diam}; halaman lain di konteks: ${bersama.join(", ") || "-"}`);
        if (JEJAK) { await hentiJejak(`jejak/putaran-${putaran}-${u.nama}.json`); await mulaiJejak(); }
        if (!perHalaman) await genBaru();
        const lama = gIni.ctx;
        denganBatas(() => lama.close(), "tutup", { ms: 10_000 }).catch(() => {});
        page = null;
        continue;
      }
      gIni.terbang.delete(p);
      if (perHalaman) { await denganBatas(() => ctxSendiri.close(), "tutup", { ms: 10_000 }).catch(() => {}); page = null; }
    }
    if (page && !perHalaman) await denganBatas(() => page.close(), "tutup", { ms: 5_000 }).catch(() => {});
  }));
  if (gen.ctx) await denganBatas(() => gen.ctx.close(), "tutup konteks", { ms: 10_000 }).catch(() => {});
}

for (let i = 1; i <= PUTARAN; i++) {
  const ti = Date.now(), sebelum = kejadian.length;
  if (JEJAK) await mulaiJejak();
  await Promise.all(UKURAN.map((u) => satuUkuran(u, i)));
  if (JEJAK) await hentiJejak(null);
  console.log(`putaran ${i}: ${kejadian.length - sebelum} macet, ${((Date.now() - ti) / 1000).toFixed(1)} s`);
}
await denganBatas(() => browser.close(), "tutup browser", { ms: 10_000 }).catch(() => {});
const diam = kejadian.filter((x) => x.diam).length;
console.log(`HASIL lengan=${LENGAN} putaran=${PUTARAN} muat=${muat} macet=${kejadian.length} diam=${diam} korban=${korban} waktu=${((Date.now() - t0) / 1000).toFixed(0)}s`);
if (process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `HASIL lengan=${LENGAN} putaran=${PUTARAN} muat=${muat} macet=${kejadian.length} diam=${diam}\n`);
process.exit(0);
