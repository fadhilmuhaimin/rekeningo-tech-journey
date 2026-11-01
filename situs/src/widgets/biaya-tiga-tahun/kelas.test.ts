// Kelas CSS widget model biaya (ADR 59) tidak bertabrakan dengan widget lain: tema.css global memuat satu aturan per kelas, dan awalan yang sama
// di dua widget saling menimpa (cb- di W4-breaker menimpa .cb-tombol cari-bug di empat halaman, keputusan 1265). Pola dari circuit-breaker/penjaga.test.ts.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const WIDGETS = path.resolve(__dirname, "..");
const SITUS_SRC = path.resolve(WIDGETS, "..");
const CSS = fs.readFileSync(path.resolve(SITUS_SRC, "styles/tema.css"), "utf8");

// kelas bersama yang sudah ada sebelum widget ini: bb- (komponen dasar), jt- (tabel jumlah-total), is- (keadaan)
const BERSAMA = /^(?:bb|jt|is)(?:-|$)/;
const MILIK = /^bt(?:-|$)/;

// Nama kelas dibaca dari nilai atribut class dan className saja (string literal di dalamnya). Yang dihitung: nama dengan tanda hubung (mis. bb-widget) dan `bt` sendiri.
const kelasDi = (berkas: string): Set<string> => {
  const hasil = new Set<string>();
  const sumber = fs.readFileSync(berkas, "utf8");
  for (const m of sumber.matchAll(/\b(?:className|class)=("[^"\n]*"|\{[^}\n]*\})/g)) {
    for (const s of m[1]!.matchAll(/"([^"\n]*)"/g)) {
      for (const t of s[1]!.split(/\s+/)) if (t === "bt" || /^[a-z][a-z0-9]*(?:-[a-z0-9_]+)+$/.test(t)) hasil.add(t);
    }
  }
  return hasil;
};
const berkasKode = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return p === __dirname ? [] : berkasKode(p);
    return /\.(tsx|astro|mdx)$/.test(e.name) ? [p] : [];
  });

describe("kelas CSS widget model biaya", () => {
  const milik = [...kelasDi(path.join(__dirname, "BiayaTigaTahun.tsx"))].filter((k) => MILIK.test(k));
  it("widget memakai kelas milik sendiri `bt` dan `bt-tabel`, selain kelas bersama bb-, jt-, dan is-", () => {
    expect(milik.sort()).toEqual(["bt", "bt-tabel"]);
    const lain = [...kelasDi(path.join(__dirname, "BiayaTigaTahun.tsx"))].filter((k) => !MILIK.test(k) && !BERSAMA.test(k));
    expect(lain).toEqual([]);
  });
  it("tak ada berkas widget, komponen, halaman, atau konten lain yang memakai kelas bt atau bt-*", () => {
    const bentrok = berkasKode(SITUS_SRC).flatMap((f) => [...kelasDi(f)].filter((k) => MILIK.test(k)).map((k) => `${path.relative(SITUS_SRC, f)}: ${k}`));
    expect(bentrok).toEqual([]);
  });
  it("tema.css punya aturan `.bt` dan `.bt-tabel` hanya di blok widget ini, dan tak ada selektor lain berawalan bt", () => {
    const awal = CSS.indexOf("/* Widget model biaya tiga tahun (ADR 59)");
    expect(awal).toBeGreaterThan(0);
    const sebelum = CSS.slice(0, awal);
    expect(sebelum).not.toMatch(/\.bt(?![a-z0-9_])|\.bt-/);
    const blok = CSS.slice(awal);
    const selektor = [...blok.matchAll(/\.(bt(?:-[a-z0-9_-]+)?)(?![a-z0-9_-])/g)].map((m) => m[1]!);
    expect(new Set(selektor)).toEqual(new Set(["bt", "bt-tabel"]));
  });
});
