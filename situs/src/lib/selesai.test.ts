// Satu definisi "halaman selesai" (P5, keputusan 320): halaman versi lama lewat penanda "Tandai selesai", halaman
// berblok lewat semua bloknya. Juga: setiap halaman yang punya Kartu ulang bisa diselesaikan dengan salah satu cara.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { idBlok } from "./blok";
import { halamanSelesai, KUNCI_BLOK, KUNCI_SELESAI, type BlokHalaman } from "./selesai";
import { K } from "./progres";

const simpanan = (isi: Record<string, string>) => ({ getItem: (k: string) => (Object.hasOwn(isi, k) ? isi[k]! : null) });
const LAMA = "/b-fondasi/b3-1-transaction/";
const BARU = "/tahap-1/transaction/";
const peta: BlokHalaman = { [BARU]: ["blok-mulai", "blok-coba", "blok-paham", "blok-putuskan", "blok-kunci"] };
const tanda = JSON.stringify({ waktu: "2026-10-13T00:00:00.000Z", judul: "Transaction" });

describe("halamanSelesai", () => {
  it("halaman versi lama: selesai bila ditandai, seperti centang widget lama", () => {
    expect(halamanSelesai(simpanan({}), LAMA, peta)).toBe(false);
    expect(halamanSelesai(simpanan({ [KUNCI_SELESAI + LAMA]: tanda }), LAMA, peta)).toBe(true);
  });

  it("halaman berblok: belum selesai sampai semua blok tercatat", () => {
    expect(halamanSelesai(simpanan({}), BARU, peta)).toBe(false);
    const sebagian = JSON.stringify(["blok-mulai", "blok-coba", "blok-paham", "blok-putuskan"]);
    expect(halamanSelesai(simpanan({ [KUNCI_BLOK + BARU]: sebagian }), BARU, peta)).toBe(false);
    const semua = JSON.stringify(["blok-kunci", "blok-mulai", "blok-paham", "blok-coba", "blok-putuskan"]);
    expect(halamanSelesai(simpanan({ [KUNCI_BLOK + BARU]: semua }), BARU, peta)).toBe(true);
  });

  it("membandingkan id, bukan jumlah: id blok lama yang sudah diganti tidak ikut menghitung", () => {
    const basi = JSON.stringify(["blok-mulai", "blok-coba", "blok-paham", "blok-putuskan", "blok-gejala"]);
    expect(halamanSelesai(simpanan({ [KUNCI_BLOK + BARU]: basi }), BARU, peta)).toBe(false);
    const lebih = JSON.stringify(["blok-gejala", "blok-mulai", "blok-coba", "blok-paham", "blok-putuskan", "blok-kunci"]);
    expect(halamanSelesai(simpanan({ [KUNCI_BLOK + BARU]: lebih }), BARU, peta)).toBe(true);
  });

  it("kunci rusak dihitung belum selesai, tanpa melempar error", () => {
    for (const v of ["[", "{}", '"blok-kunci"', "null", "42"]) {
      expect(halamanSelesai(simpanan({ [KUNCI_BLOK + BARU]: v }), BARU, peta), v).toBe(false);
    }
    for (const v of ["{", "null", "false", "0", '""']) {
      expect(halamanSelesai(simpanan({ [KUNCI_SELESAI + LAMA]: v }), LAMA, peta), v).toBe(false);
    }
  });

  it("halaman tanpa blok tidak pernah selesai lewat rtj-blok, termasuk path yang menabrak properti objek", () => {
    expect(halamanSelesai(simpanan({ [KUNCI_BLOK + LAMA]: "[]" }), LAMA, peta)).toBe(false);
    expect(halamanSelesai(simpanan({ [KUNCI_BLOK + "constructor"]: '["x"]' }), "constructor", peta)).toBe(false);
    expect(halamanSelesai(simpanan({ [KUNCI_BLOK + BARU]: "[]" }), BARU, { [BARU]: [] })).toBe(false);
  });

  it("penanda versi lama cukup walau blok belum lengkap", () => {
    const isi = { [KUNCI_SELESAI + BARU]: tanda, [KUNCI_BLOK + BARU]: '["blok-mulai"]' };
    expect(halamanSelesai(simpanan(isi), BARU, peta)).toBe(true);
  });

  it("kunci sama dengan yang ditulis Blok.astro dan widget lama, dan yang diekspor progres versi 1", () => {
    expect([K.blok, K.selesai]).toEqual([KUNCI_BLOK, KUNCI_SELESAI]);
    const ROOT = path.resolve(__dirname, "../..");
    expect(fs.readFileSync(path.join(ROOT, "src/components/Blok.astro"), "utf8")).toContain(`const kunci = "${KUNCI_BLOK}" + location.pathname;`);
    const core = fs.readFileSync(path.join(ROOT, "lama/widgets/core.js"), "utf8");
    expect(core).toContain('localStorage.getItem("bb1:" + key)');
    expect(core).toContain('var key = "selesai:" + BB.pageId();');
    expect("bb1:" + "selesai:").toBe(KUNCI_SELESAI);
  });
});

describe("halaman yang punya kartu bisa diselesaikan", () => {
  const ROOT = path.resolve(__dirname, "../..");
  const docs = path.join(ROOT, "src/content/docs");
  const mdx = (url: string) => {
    const p = path.join(docs, url.replace(/\/$/, ""));
    return [p + ".mdx", p + ".md", path.join(p, "index.mdx")].find((f) => fs.existsSync(f));
  };

  it("setiap url kartu menuju halaman berblok atau halaman dengan penanda Tandai selesai", () => {
    const buntu: string[] = [];
    for (const f of ["kartu.json", "t1-rekap-kartu.json"]) {
      const kartu = JSON.parse(fs.readFileSync(path.join(ROOT, "lama/widgets/data", f), "utf8")) as { url: string }[];
      for (const url of new Set(kartu.map((c) => c.url))) {
        const file = mdx(url);
        const isi = file ? fs.readFileSync(file, "utf8") : "";
        if (!idBlok(isi).length && !isi.includes('nama="selesai"')) buntu.push(`${f}: ${url}`);
      }
    }
    expect(buntu).toEqual([]);
  });
});
