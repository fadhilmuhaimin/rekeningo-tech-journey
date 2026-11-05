// Peta cerita (situs/lama/widgets/cerita.js) memuat Tahap 6 dari `proyeksi` registry (keputusan 1760): tautan ke halaman
// Cerita-nya, hitungan halaman dari registry, tanpa diagram. Skrip widget dijalankan di vm dengan DOM palsu sekecil mungkin,
// dan datanya cerita.json sungguhan, jadi tes ini gagal bila bentuk registry atau widget berubah sepihak.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "../..");
const CERITA = JSON.parse(fs.readFileSync(path.join(ROOT, "situs/data/cerita.json"), "utf8"));
const KODE = fs.readFileSync(path.join(ROOT, "situs/lama/widgets/cerita.js"), "utf8");

function el(tag) {
  return {
    tag, children: [], attrs: {}, className: "", textContent: "",
    appendChild(c) { this.children.push(c); return c; },
    setAttribute(k, v) { this.attrs[k] = v; },
    addEventListener() {},
  };
}
const teks = (n) => (typeof n === "string" ? n : n.text ?? "") + (n.textContent ?? "") + (n.children ?? []).map(teks).join("");
const cari = (n, f, out = []) => { if (f(n)) out.push(n); (n.children ?? []).forEach((c) => cari(c, f, out)); return out; };

async function petaDari(data) {
  const BB = {
    mounts: {}, base: "/widgets/", store: { get: () => null }, domSiap: Promise.resolve(),
    fetchJSON: () => Promise.resolve(data), mountAll() {},
    el(tag, attrs, children) {
      const n = el(tag);
      for (const k in attrs || {}) {
        if (k === "text") n.textContent = attrs[k];
        else if (k === "class") n.className = attrs[k];
        else n.attrs[k] = attrs[k];
      }
      (children || []).forEach((c) => { if (c != null) n.appendChild(typeof c === "string" ? { text: c, children: [] } : c); });
      return n;
    },
  };
  const konteks = { window: { BB }, document: { querySelector: () => null }, location: { href: "http://x.test/cerita/peta/" }, URL, Promise };
  vm.runInNewContext(KODE, konteks);
  const host = el("div");
  BB.mounts["peta-cerita"](host);
  for (let i = 0; i < 6; i++) await Promise.resolve();
  assert.equal(host.children.length, 1, host.textContent || "peta tidak terisi");
  return host.children[0].children;
}

test("peta cerita: lima tahap dari `tahap` dan Tahap 6 dari `proyeksi`, Tahap 6 bertanda proyeksi", async () => {
  const s = await petaDari(CERITA);
  assert.equal(s.length, CERITA.tahap.length + CERITA.proyeksi.length);
  const proyeksi = s.filter((x) => x.className.includes("is-proyeksi"));
  assert.equal(proyeksi.length, CERITA.proyeksi.length);
  assert.equal(s.at(-1), proyeksi[0]);
});

test("peta cerita: Tahap 6 menaut ke halaman Cerita-nya, menghitung halaman dari registry, dan tanpa diagram", async () => {
  const s = await petaDari(CERITA);
  const p = CERITA.proyeksi[0];
  const sec = s.at(-1);
  const judul = sec.children[0];
  const tautan = cari(judul, (n) => n.tag === "a");
  assert.equal(tautan.length, 1, "judul Tahap 6 adalah tautan karena halaman Cerita-nya ada");
  assert.equal(tautan[0].attrs.href, "/cerita/tahap-6/");
  assert.equal(teks(judul), `Tahap ${p.no} · ${p.nama}`);
  const halaman = CERITA.halaman.filter((h) => h.tahap === p.no && !/^T\d/.test(h.id));
  const ada = halaman.filter((h) => h.ada).length;
  const ringkas = teks(cari(sec, (n) => n.className.includes("bb-peta__user"))[0]);
  assert.ok(ringkas.includes(`0 dari ${halaman.length} halaman selesai`), ringkas);
  assert.ok(ringkas.endsWith("proyeksi tanpa lab"), ringkas);
  assert.ok(!ringkas.includes("belum ditulis"));
  assert.equal(cari(sec, (n) => n.tag === "figure").length, 0, "Tahap 6 belum punya diagram arsitektur");
  const daftar = cari(sec, (n) => n.tag === "li");
  assert.equal(daftar.length, halaman.length);
  assert.equal(daftar.filter((li) => teks(li).includes("segera")).length, halaman.length - ada);
  assert.ok(teks(cari(sec, (n) => n.className.includes("bb-peta__prd"))[0]).startsWith(`PRD v${p.no}: `));
});

test("peta cerita: tahap biasa tetap punya diagram dan bukan proyeksi (kontrol)", async () => {
  const s = await petaDari(CERITA);
  for (const sec of s.slice(0, CERITA.tahap.length)) {
    assert.ok(!sec.className.includes("is-proyeksi"));
    assert.equal(cari(sec, (n) => n.tag === "figure").length, 1);
  }
});

test("peta cerita: tanpa halaman Cerita yang ada, judul Tahap 6 tetap teks biasa (tanpa tautan ke 404)", async () => {
  const salinan = JSON.parse(JSON.stringify(CERITA));
  salinan.halaman.find((h) => h.id === "T6").ada = false;
  const s = await petaDari(salinan);
  assert.equal(cari(s.at(-1).children[0], (n) => n.tag === "a").length, 0);
});
