// Posisi diam paket di jalur mendatar (alur-core.js, widget lama). Perbaikan PR #175, keputusan 261:
// langkah pindah yang melompati komponen tidak boleh berhenti di kotak komponen tengah.
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

type Langkah = { dari: string; ke?: string };
const core = createRequire(import.meta.url)("../../lama/widgets/alur-core.js") as {
  packetPos: (d: { komponen: { id: string }[] }, st: Langkah) => number;
  sisiAsal: (a: number, b: number) => number;
};
// Lima komponen: lebar lajur 20%, tengah komponen j di 10 + 20j persen.
const d = { komponen: ["hp", "api", "build", "vps", "budi"].map((id) => ({ id })) };
const lajur = (x: number) => Math.floor(x / 20); // komponen yang kotaknya memuat titik x (tepi = batas dua lajur)
const diTepi = (x: number) => Math.abs(x % 20) < 1e-9;

describe("packetPos", () => {
  it("langkah lokal: tengah komponen", () => {
    expect(core.packetPos(d, { dari: "build" })).toBeCloseTo(50);
  });
  it("komponen bersebelahan: titik tengah keduanya, seperti sebelumnya", () => {
    expect(core.packetPos(d, { dari: "hp", ke: "api" })).toBeCloseTo(20);
    expect(core.packetPos(d, { dari: "api", ke: "hp" })).toBeCloseTo(20);
  });
  it("lompat ke kanan (hp → build melewati api): diam di antara tujuan dan tetangganya di sisi asal", () => {
    expect(core.packetPos(d, { dari: "hp", ke: "build" })).toBeCloseTo(40);
    expect(core.packetPos(d, { dari: "hp", ke: "budi" })).toBeCloseTo(80);
  });
  it("lompat ke kiri: setengah lajur di kanan tujuan", () => {
    expect(core.packetPos(d, { dari: "budi", ke: "api" })).toBeCloseTo(40);
    expect(core.packetPos(d, { dari: "vps", ke: "hp" })).toBeCloseTo(20);
  });
  it("tidak ada langkah pindah yang diam di dalam kotak komponen tengah", () => {
    const ids = d.komponen.map((k) => k.id);
    for (let a = 0; a < ids.length; a++) for (let b = 0; b < ids.length; b++) {
      if (a === b) continue;
      const x = core.packetPos(d, { dari: ids[a], ke: ids[b] });
      const lo = Math.min(a, b), hi = Math.max(a, b);
      // Di tepi antara tujuan dan tetangganya: bukan di dalam kotak komponen yang dilewati.
      expect(diTepi(x)).toBe(true);
      const kiri = lajur(x - 1e-6), kanan = lajur(x + 1e-6);
      expect([kiri, kanan]).toContain(b);
      expect([kiri, kanan].every((j) => j >= lo && j <= hi)).toBe(true);
    }
  });
});

describe("sisiAsal", () => {
  it("tetangga tujuan ke arah asal", () => {
    expect(core.sisiAsal(0, 3)).toBe(2);
    expect(core.sisiAsal(4, 1)).toBe(2);
    expect(core.sisiAsal(2, 3)).toBe(2);
  });
});
