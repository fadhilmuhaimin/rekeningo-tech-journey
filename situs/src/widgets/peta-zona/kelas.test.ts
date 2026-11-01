// Kelas CSS widget peta zona (W5-zona) tidak bertabrakan dengan widget lain: tema.css global memuat satu aturan per kelas, dan awalan yang sama
// di dua widget saling menimpa (cb- di W4-breaker menimpa .cb-tombol cari-bug di empat halaman, keputusan 1265). Pola dari
// biaya-tiga-tahun/kelas.test.ts, ditambah pembacaan className berupa template literal (`pz-sel is-${...}`) dan pemeriksaan dua arah
// antara kelas di kode dan selektor di CSS.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const WIDGETS = path.resolve(__dirname, "..");
const SITUS_SRC = path.resolve(WIDGETS, "..");
const CSS = fs.readFileSync(path.resolve(SITUS_SRC, "styles/tema.css"), "utf8");
const AWAL_BLOK = "/* Peta lima zona Tahap 5 (W5-zona)";

// kelas bersama yang sudah ada sebelum widget ini: bb- (komponen dasar), jt- (tabel), is- (keadaan), rujukan- (tautan menyusul), sr-only
const BERSAMA = /^(?:bb|jt|is|rujukan)(?:-|$)|^sr-only$/;
const MILIK = /^pz(?:-|$)/;

// Nama kelas dibaca dari nilai atribut class dan className: string literal, atau template literal tanpa bagian ${...}.
// Token `is-` yang tersisa dari `is-${x}` dibuang karena nilainya dinamis (is-terjaga, is-rusak, is-tidak, is-belum diperiksa lewat CSS di bawah).
const kelasDi = (berkas: string): Set<string> => {
  const hasil = new Set<string>();
  const sumber = fs.readFileSync(berkas, "utf8");
  const tambah = (teks: string) => {
    for (const t of teks.replace(/\$\{[^}]*\}/g, " ").split(/\s+/)) if (t === "pz" || /^[a-z][a-z0-9]*(?:-[a-z0-9_]+)+$/.test(t)) hasil.add(t);
  };
  for (const m of sumber.matchAll(/\b(?:className|class)=("[^"\n]*"|\{`[^`]*`\}|\{"[^"\n]*"\})/g)) tambah(m[1]!.replace(/^\{|\}$/g, "").replace(/^[`"]|[`"]$/g, ""));
  return hasil;
};
const berkasKode = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return p === __dirname ? [] : berkasKode(p);
    return /\.(tsx|astro|mdx)$/.test(e.name) ? [p] : [];
  });

const KOMPONEN = path.join(__dirname, "PetaZona.tsx");
const DIHARAPKAN = ["pz", "pz-baris", "pz-daftar", "pz-judul", "pz-kejadian", "pz-kode", "pz-panel", "pz-sel", "pz-tabel", "pz-tanda", "pz-tiga", "pz-zona"];

describe("kelas CSS widget peta zona", () => {
  const dipakai = kelasDi(KOMPONEN);
  it("widget memakai dua belas kelas milik sendiri berawalan pz, selain kelas bersama", () => {
    expect([...dipakai].filter((k) => MILIK.test(k)).sort()).toEqual(DIHARAPKAN);
    expect([...dipakai].filter((k) => !MILIK.test(k) && !BERSAMA.test(k))).toEqual([]);
  });
  it("tak ada berkas widget, komponen, halaman, atau konten lain yang memakai kelas pz atau pz-*", () => {
    const bentrok = berkasKode(SITUS_SRC).flatMap((f) => [...kelasDi(f)].filter((k) => MILIK.test(k)).map((k) => `${path.relative(SITUS_SRC, f)}: ${k}`));
    expect(bentrok).toEqual([]);
  });
  it("tema.css punya aturan untuk semua kelas pz hanya di blok widget ini, dan tak ada selektor lain berawalan pz sebelum blok", () => {
    const awal = CSS.indexOf(AWAL_BLOK);
    expect(awal).toBeGreaterThan(0);
    expect(CSS.slice(0, awal)).not.toMatch(/\.pz(?![a-z0-9_])|\.pz-/);
    const blok = CSS.slice(awal);
    const selektor = new Set([...blok.matchAll(/\.(pz(?:-[A-Za-z0-9_-]+)?)(?![A-Za-z0-9_-])/g)].map((m) => m[1]!));
    expect([...selektor].sort()).toEqual(DIHARAPKAN);
  });
  it("kelas keadaan sel tabel (is-terjaga, is-rusak, is-tidak, is-belum) punya aturan di blok ini, dan komponen hanya membangunnya dari status data", () => {
    const blok = CSS.slice(CSS.indexOf(AWAL_BLOK));
    for (const s of ["terjaga", "rusak", "tidak", "belum"]) expect(blok).toMatch(new RegExp(`\\.pz-sel\\.is-${s}(?![A-Za-z0-9_-])`));
    expect(fs.readFileSync(KOMPONEN, "utf8")).toContain("className={`pz-sel is-${c.s}`}");
  });
  it("widget disembunyikan tanpa JavaScript lewat @media (scripting: none) di blok ini", () => {
    expect(CSS.slice(CSS.indexOf(AWAL_BLOK))).toMatch(/@media \(scripting: none\) \{ \.sl-markdown-content \.pz \{ display: none; \} \}/);
  });
  it("island tidak memuat Zod saat dijalankan: skema hanya diimpor sebagai tipe", () => {
    const kode = fs.readFileSync(KOMPONEN, "utf8");
    expect(kode).not.toMatch(/from "zod"/);
    expect(kode).toMatch(/import type \{[^}]*\} from "\.\/skema"/);
    expect(kode).not.toMatch(/import \{[^}]*\} from "\.\/skema"/);
    expect(fs.readFileSync(path.join(__dirname, "logika.ts"), "utf8")).not.toMatch(/from "zod"|import \{[^}]*\} from "\.\/skema"/);
  });
});
