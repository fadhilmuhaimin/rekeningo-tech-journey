// Simpul dan panah Rantai di dalam figure-nya di HP sempit (P10, keputusan 366). Panah Rantai biasa adalah ::after
// berposisi absolut di luar kotak simpul; di Rantai ringkas HP simpul mengalir mendatar dan membungkus, dan panah ::after
// simpul terakhir di satu garis dulu menggantung sampai 9 px ke gutter kanan (1.6 "periksa saldo" 8,8 px) tanpa membuat
// halaman bisa digulir ke samping, jadi ukur-luapan.mjs (scrollWidth, chip) tidak melihatnya. Kini panah Rantai ringkas
// adalah li.rantai__panah; alat ini mengukur keduanya. Alat ini membuka setiap halaman di
// dist/ yang memuat Rantai, pada 360×740 dan 375×667, membuka semua <details>, lalu:
//   1. setiap simpul, label baris, panah li.rantai__panah, dan panah ::before/::after harus berada di dalam
//      figure.rantai-nya (toleransi 0,5 px); kotak panah pseudo-element dihitung dari kotak simpul dan gaya terhitungnya
//      (left/right/width, translateX);
//   2. mencetak jumlah garis tampil tiap Rantai ringkas di blok Inti (garis baru = item flex yang mulai di bawah
//      tepi bawah item sebelumnya; garis flex tidak bertumpuk), tanpa menilai; batas garisnya urusan R6.
// Gagal bila ada yang keluar figure, pseudo-element yang lebarnya tidak terbaca, atau tidak satu pun panah terukur.
//   node tools/ukur-rantai.mjs --url http://127.0.0.1:4321 [--halaman /tahap-1/struktur-folder/] [--rinci]
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

async function ukur(toleransi) {
  const rAF = () => new Promise((r) => requestAnimationFrame(() => r()));
  await document.fonts.ready;
  for (const d of document.querySelectorAll("details")) d.open = true;
  await rAF();
  await rAF();
  const teks = (el) => (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 32);
  // Rantai di blok Inti: heading h2 terdekat sebelum figure (naik ke induk bila figure dibungkus) ber-id "inti".
  const diInti = (fig) => {
    for (let el = fig; el && !el.matches(".sl-markdown-content"); el = el.parentElement) {
      for (let p = el.previousElementSibling; p; p = p.previousElementSibling) {
        const h = p.matches("h2") ? p : p.querySelector(":scope > h2");
        if (h) return h.id === "inti";
      }
    }
    return false;
  };
  const hasil = [];
  for (const fig of document.querySelectorAll(".sl-markdown-content figure.rantai")) {
    const f = fig.getBoundingClientRect();
    if (f.width === 0) continue; // panel tab tersembunyi
    const r = { judul: fig.getAttribute("aria-label") || teks(fig), ringkas: fig.classList.contains("rantai--ringkas"),
      inti: diInti(fig), keluar: [], panah: 0, garis: 0, barisData: 0 };
    const cek = (nama, kiri, kanan) => {
      const lewat = Math.max(kanan - f.right, f.left - kiri);
      if (lewat > toleransi) r.keluar.push(`${nama} keluar ${lewat.toFixed(1)} px ${kanan - f.right > 0 ? "ke kanan" : "ke kiri"}`);
    };
    for (const b of fig.querySelectorAll(".rantai__baris")) {
      const item = [b.querySelector(".rantai__label"), ...b.querySelectorAll("ol.rantai__simpul > li")]
        .filter((el) => el && el.getBoundingClientRect().width > 0);
      if (!item.length) continue;
      r.barisData++;
      let bawahLalu = -Infinity, lalu = "";
      for (const el of item) {
        const k = el.getBoundingClientRect();
        if (k.top >= bawahLalu - 1) r.garis++; // item pertama, atau item yang membungkus ke garis baru
        bawahLalu = k.bottom;
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
    }
    hasil.push(r);
  }
  return hasil;
}

const t0 = Date.now();
const daftar = satu ? [satu] : halaman();
const browser = awasi(await chromium.launch(), { alat: "rantai" }); // batas waktu per halaman (keputusan 360)
let gagal = 0, panah = 0, rantai = 0;
const baris = [], inti = new Map(), lebihDua = {};
for (const u of UKURAN) {
  const page = await browser.newPage({ viewport: { width: u.width, height: u.height }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  for (const p of daftar) {
    await page.goto(BASE + p, { waitUntil: "load" });
    for (const r of await page.evaluate(ukur, TOLERANSI)) {
      rantai++;
      panah += r.panah;
      if (r.keluar.length) { gagal++; baris.push(`GAGAL ${u.nama} ${p} "${r.judul}"\n  ${r.keluar.join("\n  ")}`); }
      else if (rinci) baris.push(`ok ${u.nama} ${p} "${r.judul}" ${r.panah} panah`);
      if (r.ringkas && r.inti) {
        const kunci = `${p} "${r.judul}" (${r.barisData} baris data)`;
        inti.set(kunci, [...(inti.get(kunci) || []), `${u.nama}: ${r.garis}`]);
        if (r.garis > 2) lebihDua[u.nama] = (lebihDua[u.nama] || 0) + 1;
      }
    }
  }
  await page.close();
}
await browser.close();
if (panah === 0) { gagal++; baris.push("GAGAL tidak ada panah Rantai yang terukur (pemeriksaan kosong)"); }
if (baris.length) console.log(baris.sort().join("\n"));
for (const [k, v] of [...inti].sort()) console.log(`info garis Rantai ringkas di Inti ${k}: ${v.join(", ")}`);
const lebih = UKURAN.map((u) => `${lebihDua[u.nama] || 0} di ${u.nama}`).join(", ");
console.log(`rantai: ${daftar.length} halaman × ${UKURAN.length} ukuran, ${rantai} Rantai, ${panah} panah, ${gagal} gagal; `
  + `Rantai ringkas di Inti lebih dari 2 garis: ${lebih} (dicetak saja, R6); ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(gagal ? 1 : 0);
