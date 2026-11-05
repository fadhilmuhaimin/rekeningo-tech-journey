// Skema registry untuk tahap proyeksi (Tahap 6, keputusan 1761): `naskah` dan `bagian` opsional di `proyeksi`, dan halaman
// proyeksi diperiksa seperti halaman tahap bernaskah (bagian wajib dan dikenal, jenis wajib kecuali halaman Cerita yang
// diganti). Registry asli harus lolos, dan tiap mutasi di bawah harus menolak dengan pesan yang menyebut sebabnya.
import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { Registry } from "./registri";

const akar = path.resolve(__dirname, "../../..");
const asli = JSON.parse(fs.readFileSync(path.join(akar, "situs/data/cerita.json"), "utf8"));
const salin = () => structuredClone(asli);
const pesan = (d: unknown) => {
  const r = Registry.safeParse(d);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe("registry proyeksi", () => {
  test("registry asli lolos skema", () => {
    expect(pesan(asli)).toEqual([]);
  });
  test("proyeksi menerima bagian dan naskah, tetapi menolak kunci lain (strict) dan bagian bernomor ganjil", () => {
    const a = salin();
    a.proyeksi[0].asumsi = { user: 1 };
    expect(Registry.safeParse(a).success).toBe(false);
    const b = salin();
    b.proyeksi[0].bagian[0].no = "x";
    expect(Registry.safeParse(b).success).toBe(false);
    const c = salin();
    c.proyeksi[0].bagian[0].nama = "";
    expect(Registry.safeParse(c).success).toBe(false);
  });
  test("halaman Tahap 6 tanpa bagian ditolak", () => {
    const d = salin();
    delete d.halaman.find((h: { id: string }) => h.id === "t6-prd").bagian;
    expect(pesan(d)).toEqual(["t6-prd di Tahap 6 tanpa bagian"]);
  });
  test("halaman Tahap 6 dengan bagian yang tak dikenal ditolak", () => {
    const d = salin();
    d.halaman.find((h: { id: string }) => h.id === "t6-m52").bagian = "6z";
    expect(pesan(d)).toEqual(["t6-m52: bagian 6z tidak dikenal"]);
  });
  test("halaman Tahap 6 tanpa jenis ditolak, kecuali halaman Cerita yang diganti", () => {
    const d = salin();
    delete d.halaman.find((h: { id: string }) => h.id === "t6-m53").jenis;
    expect(pesan(d)).toEqual(["t6-m53 di Tahap 6 tanpa jenis"]);
    const e = salin();
    expect(e.halaman.find((h: { id: string }) => h.id === "T6").jenis).toBeUndefined();
    expect(pesan(e)).toEqual([]);
  });
  test("tahap proyeksi tanpa naskah tidak memeriksa bagian (kontrol: pemeriksaan hanya untuk tahap bernaskah)", () => {
    const d = salin();
    delete d.proyeksi[0].naskah;
    delete d.halaman.find((h: { id: string }) => h.id === "t6-prd").bagian;
    expect(pesan(d)).toEqual([]);
  });
});
