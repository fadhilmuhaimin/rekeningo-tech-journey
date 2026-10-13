// Simpul dan panah Rantai di dalam figure-nya di HP sempit (P10, keputusan 366), dan Rantai ringkas di Inti
// tetap pendek (R6, keputusan 319). Panah Rantai biasa adalah ::after berposisi absolut di luar kotak simpul; di Rantai
// ringkas HP simpul mengalir mendatar dan membungkus, dan panah ::after simpul terakhir di satu garis dulu menggantung
// sampai 9 px ke gutter kanan (1.6 "periksa saldo" 8,8 px) tanpa membuat halaman bisa digulir ke samping, jadi
// ukur-luapan.mjs (scrollWidth, chip) tidak melihatnya. Kini panah Rantai ringkas adalah li.rantai__panah; alat ini
// mengukur keduanya. Alat ini membuka setiap halaman di dist/ yang memuat Rantai, pada 360×740 dan 375×667, membuka
// semua <details>, lalu:
//   1. setiap simpul, label baris, panah li.rantai__panah, dan panah ::before/::after harus berada di dalam
//      figure.rantai-nya (toleransi 0,5 px); kotak panah pseudo-element dihitung dari kotak simpul dan gaya terhitungnya
//      (left/right/width, translateX);
//   2. Rantai ringkas di Inti (blok layar pertama halaman konsep): setiap baris data
//      paling banyak GARIS_BARIS garis flex, satu figure paling banyak GARIS_FIGURE, dan tidak ada simpul atau label yang
//      teksnya membungkus di dalam kotaknya (tinggi isi > 1,5 × line-height). Garis baru = item flex (label, simpul,
//      li panah) yang mulai di bawah tepi bawah item sebelumnya; garis flex tidak bertumpuk. Judul, chip, dan catatan
//      tidak dihitung. Ini aturan MEMORI "Rantai di Inti selalu ringkas, maksimal dua baris pendek": dua baris data,
//      masing-masing paling banyak dua garis di HP. Rantai ringkas di blok Kebutuhan halaman ADR dicetak dengan
//      jumlah garisnya tanpa dinilai (keputusan 319: 1.40 belum memenuhi, tugas lanjutan).
//   3. uji mutasi (kecuali --tanpa-mutasi): di Rantai ringkas Inti pertama, satu baris diberi enam simpul
//      tambahan, lalu satu simpul diberi teks panjang; pemeriksa wajib menolak keduanya.
// Gagal bila ada yang keluar figure, pseudo-element yang lebarnya tidak terbaca, tidak satu pun panah terukur, aturan 2
// dilanggar, atau mutasi lolos.
//   node tools/ukur-rantai.mjs --url http://127.0.0.1:4321 [--halaman /tahap-1/struktur-folder/] [--rinci] [--tanpa-mutasi]
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { awasi } from "./lib/batas.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg("--url", "http://127.0.0.1:4321");
const satu = arg("--halaman", null);
const rinci = process.argv.includes("--rinci");
const UKURAN = [
  { nama: "360", width: 360, height: 740 },
  { nama: "375", width: 375, height: 667 },
];
const TOLERANSI = 0.5;
// Aturan garis Rantai ringkas di Inti (R6, keputusan 319).
const ATURAN = { garisBaris: 2, garisFigure: 4, bungkus: 1.5 };
const tanpaMutasi = process.argv.includes("--tanpa-mutasi");

// Halaman yang memuat Rantai, dari HTML hasil build (Rantai dirender statis, tanpa island).
function halaman() {
  const out = [];
  (function walk(d, rel) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) { if (!["_astro", "pagefind", "widgets", "vendor", "fonts"].includes(e.name)) walk(path.join(d, e.name), rel + e.name + "/"); }
      else if (e.name === "index.html" && /class="rantai[ "]/.test(fs.readFileSync(path.join(d, e.name), "utf8"))) out.push("/" + rel);
    }
  })(path.resolve("dist"), "");
  return out.sort();
}

async function ukur({ toleransi, aturan, mutasi }) {
  const rAF = () => new Promise((r) => requestAnimationFrame(() => r()));
  await document.fonts.ready;
  for (const d of document.querySelectorAll("details")) d.open = true;
  await rAF();
  await rAF();
  const teks = (el) => (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 32);
  // Blok layar pertama sebuah Rantai: heading h2 terdekat sebelum figure (naik ke induk bila figure dibungkus) adalah
  // "## Inti" (id inti, dinilai) atau judul blok Kebutuhan halaman ADR (h2 di summary, id blok-kebutuhan, dicetak saja).
  const layarPertama = (fig) => {
    for (let el = fig; el && !el.matches(".sl-markdown-content"); el = el.parentElement) {
      for (let p = el.previousElementSibling; p; p = p.previousElementSibling) {
        const h = p.matches("h2") ? p : p.querySelector(":scope > h2");
        if (h) return h.id === "inti" ? "inti" : h.id === "blok-kebutuhan" ? "kebutuhan" : null;
      }
    }
    return null;
  };
  if (mutasi) {
    // Uji mutasi: Rantai ringkas Inti pertama di halaman ini dirusak sebelum diukur.
    const fig = [...document.querySelectorAll(".sl-markdown-content figure.rantai--ringkas")].find((f) => layarPertama(f) === "inti");
    const ol = fig?.querySelector("ol.rantai__simpul");
    if (!ol) return [];
    if (mutasi === "garis") {
      const simpul = ol.querySelector("li:not(.rantai__panah)"), panah = ol.querySelector("li.rantai__panah");
      for (let k = 0; k < 6; k++) { if (panah) ol.append(panah.cloneNode(true)); ol.append(simpul.cloneNode(true)); }
    } else {
      ol.querySelector("li:not(.rantai__panah) :is(b, code)").textContent = "teks simpul yang terlalu panjang untuk satu garis di HP sempit";
    }
    await rAF();
  }
  const hasil = [];
  for (const fig of document.querySelectorAll(".sl-markdown-content figure.rantai")) {
    const f = fig.getBoundingClientRect();
    if (f.width === 0) continue; // panel tab tersembunyi
    const r = { judul: fig.getAttribute("aria-label") || teks(fig), ringkas: fig.classList.contains("rantai--ringkas"),
      layar: layarPertama(fig), keluar: [], panah: 0, garis: 0, barisData: 0, garisBaris: [], bungkus: [] };
    const cek = (nama, kiri, kanan) => {
      const lewat = Math.max(kanan - f.right, f.left - kiri);
      if (lewat > toleransi) r.keluar.push(`${nama} keluar ${lewat.toFixed(1)} px ${kanan - f.right > 0 ? "ke kanan" : "ke kiri"}`);
    };
    for (const b of fig.querySelectorAll(".rantai__baris")) {
      const item = [b.querySelector(".rantai__label"), ...b.querySelectorAll("ol.rantai__simpul > li")]
        .filter((el) => el && el.getBoundingClientRect().width > 0);
      if (!item.length) continue;
      r.barisData++;
      let bawahLalu = -Infinity, lalu = "", garis = 0;
      for (const el of item) {
        const k = el.getBoundingClientRect();
        if (k.top >= bawahLalu - 1) garis++; // item pertama, atau item yang membungkus ke garis baru
        bawahLalu = k.bottom;
        if (!el.matches(".rantai__panah")) {
          // Teks yang membungkus di dalam kotak: tinggi isi (tanpa padding dan border) > 1,5 × line-height.
          const g = getComputedStyle(el), lh = parseFloat(g.lineHeight);
          const isi = k.height - parseFloat(g.paddingTop) - parseFloat(g.paddingBottom) - parseFloat(g.borderTopWidth) - parseFloat(g.borderBottomWidth);
          if (!Number.isFinite(lh)) r.bungkus.push(`${el.matches("li") ? "simpul" : "label"} "${teks(el)}": line-height tidak terbaca (${g.lineHeight})`);
          else if (isi > aturan.bungkus * lh) r.bungkus.push(`${el.matches("li") ? "simpul" : "label"} "${teks(el)}" membungkus di dalam kotak (tinggi isi ${isi.toFixed(1)} px > ${aturan.bungkus} × ${lh.toFixed(1)} px)`);
        }
        // Rantai ringkas di HP: panah adalah li.rantai__panah (item flex), bukan pseudo-element.
        if (el.matches(".rantai__panah")) { r.panah++; cek(`panah "${teks(el)}" sesudah ${lalu}`, k.left, k.right); continue; }
        const nama = `${el.matches("li") ? "simpul" : "label"} "${teks(el)}"`;
        lalu = nama;
        cek(nama, k.left, k.right);
        if (!el.matches("li")) continue;
        const g = getComputedStyle(el);
        const pbKiri = k.left + parseFloat(g.borderLeftWidth), pbKanan = k.right - parseFloat(g.borderRightWidth);
        for (const pseudo of ["::before", "::after"]) {
          const a = getComputedStyle(el, pseudo);
          if (a.content === "none" || a.content === "normal" || a.display === "none") continue;
          r.panah++;
          const di = `${pseudo === "::before" ? "sebelum" : "sesudah"} ${nama}`;
          if (a.position !== "absolute" && a.position !== "fixed") continue; // mengalir di dalam simpul: tercakup kotak simpul
          const lebar = parseFloat(a.width);
          if (!Number.isFinite(lebar)) { r.keluar.push(`panah ${di}: lebar ${pseudo} tidak terbaca (${a.width})`); continue; }
          const m = a.transform.match(/^matrix\(([^)]+)\)$/);
          const geser = m ? parseFloat(m[1].split(",")[4]) : 0;
          let kiri;
          if (a.right !== "auto") kiri = pbKanan - parseFloat(a.right) - lebar;
          else if (a.left !== "auto") kiri = pbKiri + parseFloat(a.left);
          else { r.keluar.push(`panah ${di}: left dan right auto`); continue; }
          cek(`panah "${(a.content.match(/"([^"]*)"/) || [, a.content])[1]}" ${di}`, kiri + geser, kiri + geser + lebar);
        }
      }
      r.garis += garis;
      r.garisBaris.push(garis);
    }
    hasil.push(r);
  }
  return hasil;
}

// Pelanggaran aturan garis (R6) satu Rantai ringkas di Inti.
function langgarGaris(r) {
  if (!r.ringkas || r.layar !== "inti") return [];
  const out = [];
  r.garisBaris.forEach((g, k) => { if (g > ATURAN.garisBaris) out.push(`baris data ${k + 1}: ${g} garis > ${ATURAN.garisBaris}`); });
  if (r.garis > ATURAN.garisFigure) out.push(`figure: ${r.garis} garis > ${ATURAN.garisFigure}`);
  return [...out, ...r.bungkus];
}

const t0 = Date.now();
const daftar = satu ? [satu] : halaman();
const browser = awasi(await chromium.launch(), { alat: "rantai" }); // batas waktu per halaman (keputusan 360)
let gagal = 0, panah = 0, rantai = 0, lapis = 0;
const baris = [], inti = new Map(), lebihDua = {};
let halamanMutasi = null;
for (const u of UKURAN) {
  const page = await browser.newPage({ viewport: { width: u.width, height: u.height }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  for (const p of daftar) {
    await page.goto(BASE + p, { waitUntil: "load" });
    for (const r of await page.evaluate(ukur, { toleransi: TOLERANSI, aturan: ATURAN, mutasi: null })) {
      rantai++;
      panah += r.panah;
      if (r.keluar.length) { gagal++; baris.push(`GAGAL ${u.nama} ${p} "${r.judul}"\n  ${r.keluar.join("\n  ")}`); }
      else if (rinci) baris.push(`ok ${u.nama} ${p} "${r.judul}" ${r.panah} panah`);
      if (r.ringkas && r.layar) {
        if (r.layar === "inti") { lapis++; halamanMutasi ??= p; }
        const kunci = `${r.layar === "inti" ? "Inti" : "Kebutuhan (ADR, tidak dinilai)"} ${p} "${r.judul}" (${r.barisData} baris data)`;
        inti.set(kunci, [...(inti.get(kunci) || []), `${u.nama}: ${r.garis} (${r.garisBaris.join(" + ")})`]);
        if (r.layar === "inti" && r.garis > 2) lebihDua[u.nama] = (lebihDua[u.nama] || 0) + 1;
        const langgar = langgarGaris(r);
        if (langgar.length) { gagal++; baris.push(`GAGAL ${u.nama} ${p} "${r.judul}" aturan garis R6\n  ${langgar.join("\n  ")}`); }
      }
    }
  }
  await page.close();
}
// Uji mutasi: pemeriksa garis dan bungkus harus menolak Rantai ringkas yang dirusak (keputusan 319).
if (!tanpaMutasi) {
  if (!halamanMutasi) { gagal++; baris.push("GAGAL uji mutasi: tidak ada Rantai ringkas di Inti"); }
  else {
    const page = await browser.newPage({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
    for (const [m, pola] of [["garis", /garis >/], ["bungkus", /membungkus di dalam kotak/]]) {
      await page.goto(BASE + halamanMutasi, { waitUntil: "load" });
      const r = (await page.evaluate(ukur, { toleransi: TOLERANSI, aturan: ATURAN, mutasi: m })).find((x) => x.ringkas && x.layar === "inti");
      const temu = r ? langgarGaris(r).filter((x) => pola.test(x)) : [];
      if (temu.length) console.log(`ok uji mutasi ${m} di ${halamanMutasi}: ${temu[0]}`);
      else { gagal++; baris.push(`GAGAL uji mutasi ${m} di ${halamanMutasi}: Rantai yang dirusak lolos aturan garis`); }
    }
    await page.close();
  }
}
await browser.close();
if (panah === 0) { gagal++; baris.push("GAGAL tidak ada panah Rantai yang terukur (pemeriksaan kosong)"); }
if (lapis === 0) { gagal++; baris.push("GAGAL tidak ada Rantai ringkas di Inti yang terukur (pemeriksaan garis kosong)"); }
if (baris.length) console.log(baris.sort().join("\n"));
for (const [k, v] of [...inti].sort()) console.log(`info garis Rantai ringkas ${k}: ${v.join(", ")}`);
const lebih = UKURAN.map((u) => `${lebihDua[u.nama] || 0} di ${u.nama}`).join(", ");
console.log(`rantai: ${daftar.length} halaman × ${UKURAN.length} ukuran, ${rantai} Rantai, ${panah} panah, ${gagal} gagal; `
  + `aturan garis R6 (≤ ${ATURAN.garisBaris} garis per baris data, ≤ ${ATURAN.garisFigure} per figure, simpul tanpa bungkus) atas ${lapis} Rantai ringkas di Inti; `
  + `lebih dari 2 garis per figure: ${lebih}; ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(gagal ? 1 : 0);
