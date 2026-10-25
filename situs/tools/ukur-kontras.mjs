// Kontras teks widget runsql yang baru muncul setelah ditekan (K2a, keputusan 354). contrast.py membaca pasangan dari
// tema.css; teks langkah runsql baru ada setelah tombol Jalankan, dan langkah yang dilewati (.bb-step.is-skipped) dulu
// diredupkan dengan opacity di <li>, yang tidak terbaca sebagai pasangan CSS. Alat ini membuka setiap halaman yang
// memuat runsql (dibaca dari dist/), menebak, menjalankan Before & After, lalu menjalankan ulang dengan "Ubah satu hal"
// bila ada. Lalu setiap teks langkah (nomor ::before, SQL, hasil) diukur dari computed style: warna teks dan latar
// setiap leluhur dikomposit dari <html> ke bawah, opacity tiap leluhur dikalikan sebagai grup (teks dicampur ke latar di
// luar grup, seperti browser), lalu rasio WCAG 2.2 dihitung antara piksel teks dan piksel latar di sebelahnya.
// Gagal bila: rasio < 4,5:1 (teks widget tidak ada yang "large scale"); teks langkah diredupkan opacity < 1; langkah
// dilewati tanpa coretan pada SQL atau tanpa label "→ tidak dijalankan"; atau tidak satu pun langkah dilewati ditemukan
// di suatu ukuran dan mode (pemeriksaan tidak boleh lolos karena kosong).
//   node tools/ukur-kontras.mjs --url http://127.0.0.1:4321 [--halaman /tahap-1/m4-rp70000-hilang/] [--rinci]
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { denganBatas } from "./lib/batas.mjs";
import { saring, terpilih } from "./lib/pilih.mjs";

const arg = (nama, bawaan) => {
  const i = process.argv.indexOf(nama);
  return i > -1 ? process.argv[i + 1] : bawaan;
};
const url = arg("--url", "http://127.0.0.1:4321");
const satu = arg("--halaman", null);
const rinci = process.argv.includes("--rinci");
const AMBANG = 4.5;
const UKURAN = [{ width: 375, height: 667 }, { width: 1366, height: 657 }];
const TEMA = ["dark", "light"];

function halamanRunsql(dir, akar = dir, hasil = []) {
  for (const n of readdirSync(dir)) {
    const p = path.join(dir, n);
    if (statSync(p).isDirectory()) halamanRunsql(p, akar, hasil);
    else if (n === "index.html" && readFileSync(p, "utf8").includes('data-bb="runsql"'))
      hasil.push("/" + path.relative(akar, path.dirname(p)).split(path.sep).join("/") + (dir === akar ? "" : "/"));
  }
  return hasil.sort();
}
const disaring = terpilih() !== null;
const halaman = satu ? [satu] : saring(halamanRunsql(path.resolve("dist")), (x) => x, { alat: "kontras" });

// Dijalankan di halaman: ukur semua teks langkah di satu host runsql.
function ukurHost(host) {
  const kanvas = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const rgba = (c) => {
    let m = c.match(/^rgba?\(([\d.]+),? ([\d.]+),? ([\d.]+)(?:[,/] ?([\d.]+%?))?\)$/);
    if (!m) m = c.match(/^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/);
    if (m) {
      const f = c.startsWith("color(") ? 255 : 1;
      const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      return [m[1] * f, m[2] * f, m[3] * f, a];
    }
    kanvas.clearRect(0, 0, 1, 1);
    kanvas.fillStyle = c;
    kanvas.fillRect(0, 0, 1, 1);
    const d = kanvas.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const atas = (f, b) => [0, 1, 2].map((i) => f[3] * f[i] + (1 - f[3]) * b[i]);
  const campur = (a, b, op) => [0, 1, 2].map((i) => op * a[i] + (1 - op) * b[i]);
  const lum = (c) => {
    const [r, g, b] = c.map((v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const rasio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const rantai = (el, semu) => {
    const r = [];
    for (let n = el; n; n = n.parentElement) r.unshift(getComputedStyle(n));
    if (semu) r.push(getComputedStyle(el, semu));
    return r.map((cs) => ({ op: parseFloat(cs.opacity), bg: rgba(cs.backgroundColor), warna: rgba(cs.color) }));
  };
  // Piksel di dalam simpul i dengan latar D di luarnya; daun = teks (warna di atas latarnya) atau latar saja.
  const piksel = (r, i, D, teks) => {
    const dalam = atas(r[i].bg, D);
    const anak = i === r.length - 1 ? (teks ? atas(r[i].warna, dalam) : dalam) : piksel(r, i + 1, dalam, teks);
    return campur(anak, D, r[i].op);
  };
  const ukur = (el, semu) => {
    const r = rantai(el, semu);
    const putih = [255, 255, 255];
    const t = piksel(r, 0, putih, true), l = piksel(r, 0, putih, false);
    return { rasio: rasio(t, l), opacity: r.reduce((p, n) => p * n.op, 1) };
  };
  const hasil = [];
  host.querySelectorAll(".bb-step").forEach((li) => {
    const keadaan = ["is-skipped", "is-err", "is-wait", "is-auto", "is-ok"].find((k) => li.classList.contains(k)) || "belum";
    const sql = li.querySelector(".bb-step__sql"), res = li.querySelector(".bb-step__res");
    const bagian = [["nomor", li, "::before"], ["sql", sql, null]];
    if (res && res.textContent.trim()) bagian.push(["label", res, null]);
    for (const [nama, el, semu] of bagian) {
      if (!el) continue;
      const u = ukur(el, semu);
      hasil.push({ keadaan, nama, ...u, teks: (semu ? "" : el.textContent).slice(0, 50) });
    }
    if (keadaan === "is-skipped") {
      hasil.push({ keadaan, nama: "coretan", ok: !!sql && getComputedStyle(sql).textDecorationLine.includes("line-through") });
      hasil.push({ keadaan, nama: "teks label", ok: !!res && res.textContent.startsWith("→ tidak dijalankan") });
    }
  });
  return hasil;
}

// Empat konteks (ukuran x mode) berjalan bersamaan di satu browser; setiap konteks punya halaman, localStorage, dan
// PGlite sendiri. Keluaran ditampung per konteks lalu dicetak dalam urutan tetap, supaya log sama dari run ke run.
// Berurutan butuh ±34 s di CI, padahal job situs sudah dekat batas waktunya (keputusan 354).
const browser = await chromium.launch();
async function periksa(uk, tema) {
  const log = [];
  let gagal = 0;
  const ctx = await browser.newContext({ viewport: uk, colorScheme: tema });
  await ctx.addInitScript((t) => { try { localStorage.setItem("starlight-theme", t); } catch {} }, tema);
  const page = await ctx.newPage();
  const galatKonsol = [];
  page.on("pageerror", (e) => galatKonsol.push(String(e)));
  let dilewati = 0;
  const min = {};
  for (const h of halaman) {
    const ukuran = [];
    // Batas per halaman (keputusan 360): halaman yang macet membuat konteks ini gagal dengan nama halaman dan ukuran.
    await denganBatas(async () => {
      await page.goto(url + h, { waitUntil: "networkidle" });
      const host = page.locator('[data-bb="runsql"]');
      const jumlah = await host.count();
      for (let k = 0; k < jumlah; k++) {
        const w = host.nth(k);
        // Blok yang terlipat (Paham, Putuskan, Kunci) dibuka seperti pembaca membukanya.
        await w.evaluate((el) => { for (let d = el.closest("details"); d; d = d.parentElement?.closest("details")) d.open = true; });
        await w.locator(".bb-predict .bb-btn--opt").first().waitFor({ timeout: 15000 });
        await w.locator(".bb-predict .bb-btn--opt").first().click();
        const tunggu = () => w.evaluate((el) => new Promise((ok, tolak) => {
          const t0 = performance.now();
          (function cek() {
            const st = el.querySelector('[role="status"].bb-muted');
            const selesai = el.querySelector(".bb-step.is-ok, .bb-step.is-err, .bb-step.is-skipped, .bb-step.is-auto");
            if (selesai && st && st.textContent !== "Menjalankan...") return ok();
            if (performance.now() - t0 > 15000) return tolak(new Error("runsql tidak selesai dalam 15 s"));
            setTimeout(cek, 50);
          })();
        }));
        await w.locator(".bb-btn--primary").click();
        await tunggu();
        ukuran.push(...(await w.evaluate(ukurHost)));
        const cb = w.locator('.bb-toggle input[type="checkbox"]');
        if (await cb.count()) {
          await cb.check();
          await tunggu();
          ukuran.push(...(await w.evaluate(ukurHost)));
        }
      }
    }, `kontras ${uk.width}x${uk.height} ${tema} ${h}`);
    for (const u of ukuran) {
      if (u.keadaan === "is-skipped" && u.nama === "sql") dilewati++;
      const kunci = `${u.keadaan} ${u.nama}`;
      if ("ok" in u) {
        if (!u.ok) { gagal++; log.push(`GAGAL ${h} ${uk.width} ${tema}: langkah dilewati tanpa ${u.nama}`); }
        continue;
      }
      if (!(kunci in min) || u.rasio < min[kunci]) min[kunci] = u.rasio;
      const salah = [];
      if (u.rasio < AMBANG) salah.push(`${u.rasio.toFixed(2)}:1 < ${AMBANG}:1`);
      if (u.opacity < 1) salah.push(`diredupkan opacity ${u.opacity.toFixed(2)}`);
      if (salah.length) { gagal++; log.push(`GAGAL ${h} ${uk.width} ${tema}: ${kunci} "${u.teks}" ${salah.join(", ")}`); }
      else if (rinci) log.push(`ok ${h} ${uk.width} ${tema}: ${kunci} ${u.rasio.toFixed(2)}:1`);
    }
  }
  if (!disaring && !dilewati) { gagal++; log.push(`GAGAL ${uk.width} ${tema}: tidak ada langkah dilewati yang terukur`); }
  if (galatKonsol.length) { gagal++; log.push(`GAGAL ${uk.width} ${tema}: error halaman ${galatKonsol.join(" | ")}`); }
  const ringkas = Object.entries(min).sort().map(([k, v]) => `${k} ${v.toFixed(2)}`).join(" · ");
  log.push(`${uk.width}x${uk.height} ${tema}: ${halaman.length} halaman, ${dilewati} SQL dilewati; minimum: ${ringkas}`);
  await ctx.close();
  return { log, gagal };
}
const tugas = UKURAN.flatMap((uk) => TEMA.map((tema) => periksa(uk, tema)));
// allSettled: satu konteks yang melempar (timeout, halaman tidak termuat) dihitung gagal tanpa menghentikan yang lain.
const hasil = await Promise.allSettled(tugas);
let gagal = 0;
for (const r of hasil) {
  if (r.status === "fulfilled") { for (const baris of r.value.log) console.log(baris); gagal += r.value.gagal; }
  else { gagal++; console.log(`GAGAL: ${r.reason?.message ?? r.reason}`); }
}
await browser.close();
console.log(gagal ? `\n${gagal} gagal` : `\nkontras langkah runsql lolos (≥ ${AMBANG}:1, tanpa opacity)`);
process.exit(gagal ? 1 : 0);
