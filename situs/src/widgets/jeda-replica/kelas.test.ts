// Kelas CSS widget jeda replica (W5-lag) tidak bertabrakan dengan widget lain: tema.css global memuat satu aturan per kelas, dan
// awalan yang sama di dua widget saling menimpa (cb- di W4-breaker menimpa .cb-tombol cari-bug di empat halaman, keputusan 1265).
// Pola dari peta-zona/kelas.test.ts: pembacaan className berupa string, template literal, dan ekspresi dengan string di dalamnya
// (`{pilih ? "lg-pilih" : undefined}`), ditambah pemeriksaan dua arah antara kelas di kode dan selektor di CSS.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const WIDGETS = path.resolve(__dirname, "..");
const SITUS_SRC = path.resolve(WIDGETS, "..");
const CSS = fs.readFileSync(path.resolve(SITUS_SRC, "styles/tema.css"), "utf8");
const AWAL_BLOK = "/* Simulasi jeda replica Tahap 5 (W5-lag)";

// kelas bersama yang sudah ada sebelum widget ini: bb- (komponen dasar), jt- (tabel), is- (keadaan)
const BERSAMA = /^(?:bb|jt|is)(?:-|$)/;
const MILIK = /^lg(?:-|$)/;

const KOMPONEN = path.join(__dirname, "JedaReplica.tsx");
const DIHARAPKAN = ["lg", "lg-aturan", "lg-aturan-ringkas", "lg-batas", "lg-berkas", "lg-daftar", "lg-hasil", "lg-jeda", "lg-judul", "lg-nama", "lg-petunjuk", "lg-pilih", "lg-sel", "lg-tabel", "lg-tanda", "lg-ubah"];

// Nama kelas dibaca dari nilai atribut class dan className: string literal, template literal (bagian ${...} dibuang), atau ekspresi
// {...} yang berisi string. Token `is-` dari `is-${x}` dibuang karena nilainya dinamis (diperiksa lewat CSS di bawah).
const kelasDi = (berkas: string): Set<string> => {
  const hasil = new Set<string>();
  const sumber = fs.readFileSync(berkas, "utf8");
  const tambah = (teks: string) => {
    for (const t of teks.replace(/\$\{[^}]*\}/g, " ").split(/\s+/)) if (t === "lg" || /^[a-z][a-z0-9]*(?:-[a-z0-9_]+)+$/.test(t)) hasil.add(t);
  };
  for (const m of sumber.matchAll(/\b(?:className|class)=("[^"\n]*")/g)) tambah(m[1]!.slice(1, -1));
  for (const m of sumber.matchAll(/\b(?:className|class)=\{`([^`]*)`\}/g)) tambah(m[1]!);
  for (const m of sumber.matchAll(/\b(?:className|class)=\{([^`{}][^{}]*)\}/g)) for (const s of m[1]!.matchAll(/"([^"\n]*)"/g)) tambah(s[1]!);
  return hasil;
};
const berkasKode = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return p === __dirname ? [] : berkasKode(p);
    return /\.(tsx|astro|mdx)$/.test(e.name) ? [p] : [];
  });

describe("kelas CSS widget jeda replica", () => {
  const dipakai = kelasDi(KOMPONEN);
  it("widget memakai enam belas kelas milik sendiri berawalan lg, selain kelas bersama", () => {
    expect([...dipakai].filter((k) => MILIK.test(k)).sort()).toEqual(DIHARAPKAN);
    expect([...dipakai].filter((k) => !MILIK.test(k) && !BERSAMA.test(k))).toEqual([]);
  });
  it("pembaca kelas menangkap ekspresi dan template literal (mutan: kelas lg-pilih atau lg-sel hilang dari pembacaan)", () => {
    expect(dipakai.has("lg-pilih")).toBe(true);
    expect(dipakai.has("lg-sel")).toBe(true);
    expect(dipakai.has("bb-predict__a")).toBe(true);
  });
  it("tak ada berkas widget, komponen, halaman, atau konten lain yang memakai kelas lg atau lg-*", () => {
    const bentrok = berkasKode(SITUS_SRC).flatMap((f) => [...kelasDi(f)].filter((k) => MILIK.test(k)).map((k) => `${path.relative(SITUS_SRC, f)}: ${k}`));
    expect(bentrok).toEqual([]);
  });
  it("tema.css punya aturan untuk semua kelas lg hanya di blok widget ini, dan tak ada selektor lain berawalan lg sebelum blok", () => {
    const awal = CSS.indexOf(AWAL_BLOK);
    expect(awal).toBeGreaterThan(0);
    expect(CSS.slice(0, awal)).not.toMatch(/\.lg(?![A-Za-z0-9_])|\.lg-/);
    const blok = CSS.slice(awal);
    const selektor = new Set([...blok.matchAll(/\.(lg(?:-[A-Za-z0-9_-]+)?)(?![A-Za-z0-9_-])/g)].map((m) => m[1]!));
    expect([...selektor].sort()).toEqual(DIHARAPKAN);
  });
  it("kelas keadaan sel (is-lama, is-sama, is-keprimary, is-tunda, is-macet) punya aturan di blok ini, dan komponen membangunnya dari kasus hasil", () => {
    const blok = CSS.slice(CSS.indexOf(AWAL_BLOK));
    for (const s of ["lama", "sama", "keprimary", "tunda", "macet"]) expect(blok).toMatch(new RegExp(`\\.lg-sel\\.is-${s}(?![A-Za-z0-9_-])`));
    expect(fs.readFileSync(KOMPONEN, "utf8")).toContain("className={`lg-sel is-${h.kasus}`}");
  });
  it("widget disembunyikan tanpa JavaScript lewat @media (scripting: none) di blok ini", () => {
    expect(CSS.slice(CSS.indexOf(AWAL_BLOK))).toMatch(/@media \(scripting: none\) \{ \.sl-markdown-content \.lg \{ display: none; \} \}/);
  });
  it("island tidak memuat Zod saat dijalankan: skema hanya diimpor sebagai tipe", () => {
    const kode = fs.readFileSync(KOMPONEN, "utf8");
    expect(kode).not.toMatch(/from "zod"/);
    expect(kode).toMatch(/import type \{[^}]*\} from "\.\/skema"/);
    expect(kode).not.toMatch(/import \{[^}]*\} from "\.\/skema"/);
    expect(fs.readFileSync(path.join(__dirname, "logika.ts"), "utf8")).not.toMatch(/from "zod"|import \{[^}]*\} from "\.\/skema"/);
  });
  it("widget tidak memakai gerak: tanpa transition, animation, atau library gerak di komponen dan blok CSS", () => {
    expect(fs.readFileSync(KOMPONEN, "utf8")).not.toMatch(/from "[^"]*(?:motion|gerak)[^"]*"|\bmuncul\(|requestAnimationFrame|setInterval|setTimeout/);
    expect(CSS.slice(CSS.indexOf(AWAL_BLOK))).not.toMatch(/transition|animation|@keyframes/);
  });
});
