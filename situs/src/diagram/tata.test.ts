import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Arsitektur } from "./skema";
import { UKURAN, deskripsi, lebarMendatar, tata, varPesan, type Tata } from "./tata";

const registry = JSON.parse(readFileSync(new URL("../../data/cerita.json", import.meta.url), "utf8"));
const semua: Arsitektur[] = registry.tahap.map((t: { arsitektur: unknown }) => Arsitektur.parse(t.arsitektur));

const tumpang = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) < UKURAN.lebar && Math.abs(a.y - b.y) < UKURAN.tinggi;

function cekTata(h: Tata) {
  for (let i = 0; i < h.kotak.length; i++)
    for (let j = i + 1; j < h.kotak.length; j++) expect(tumpang(h.kotak[i], h.kotak[j])).toBe(false);
  for (const t of h.kotak) {
    expect(t.x).toBeGreaterThanOrEqual(0);
    expect(t.y).toBeGreaterThanOrEqual(0);
    expect(t.x + UKURAN.lebar).toBeLessThanOrEqual(h.lebar);
    expect(t.y + UKURAN.tinggi).toBeLessThanOrEqual(h.tinggi);
  }
}

describe("skema diagram", () => {
  it("semua tahap di registry lolos skema", () => expect(semua).toHaveLength(registry.tahap.length));
  it("menolak zona yang tidak dikenal", () => {
    const r = Arsitektur.safeParse({ baris: [[{ label: "API", zona: "vps" }]] });
    expect(r.success).toBe(false);
  });
  it("menolak kotak baru sekaligus berubah", () => {
    expect(Arsitektur.safeParse({ baris: [[{ label: "API", baru: true, berubah: true }]] }).success).toBe(false);
  });
});

describe("tata", () => {
  it.each(semua.map((a, i) => [i + 1, a] as const))("Tahap %i: kotak tidak bertumpuk di kedua arah", (_n, a) => {
    cekTata(tata(a, "mendatar"));
    cekTata(tata(a, "tegak"));
  });

  it("panah hanya di dalam baris dan tidak keluar dari kotak lepas", () => {
    const t4 = semua[3]; // Tahap 4: Penyimpanan objek lepas di baris kedua
    const h = tata(t4, "mendatar");
    expect(h.panah.map((p) => p.id)).toEqual(["p-0-0", "p-0-1", "p-1-1"]);
  });

  it("zona membungkus semua kotaknya dan zona tidak saling menimpa", () => {
    const t1 = semua[0];
    for (const arah of ["mendatar", "tegak"] as const) {
      const h = tata(t1, arah);
      expect(h.zona).toHaveLength(2);
      for (const z of h.zona) {
        const isi = h.kotak.filter((k) => `z-${k.kotak.zona}` === z.id);
        expect(isi.length).toBeGreaterThan(0);
        for (const k of isi) {
          expect(k.x).toBeGreaterThan(z.x);
          expect(k.y).toBeGreaterThan(z.y);
          expect(k.x + UKURAN.lebar).toBeLessThan(z.x + z.lebar);
          expect(k.y + UKURAN.tinggi).toBeLessThan(z.y + z.tinggi);
        }
      }
      const [a, b] = h.zona;
      const pisah = a.x + a.lebar <= b.x || b.x + b.lebar <= a.x || a.y + a.tinggi <= b.y || b.y + b.tinggi <= a.y;
      expect(pisah).toBe(true);
    }
  });

  it("tata tegak: zona berurutan berjarak minimal 12 px", () => {
    const [hp, vps] = tata(semua[0], "tegak").zona;
    expect(vps.y - (hp.y + hp.tinggi)).toBeGreaterThanOrEqual(12);
  });

  it("tata tegak lebih sempit dari mendatar untuk satu baris", () => {
    const t1 = semua[0];
    expect(tata(t1, "tegak").lebar).toBeLessThan(tata(t1, "mendatar").lebar);
    expect(lebarMendatar(t1)).toBeGreaterThan(375);
  });
});

describe("deskripsi", () => {
  it("menyebut urutan, status, dan zona", () => {
    expect(deskripsi(semua[0], "Arsitektur Tahap 1")).toBe(
      "Arsitektur Tahap 1. App Flutter (baru, di HP karyawan) ke Monolith API (baru, di Satu VPS Divisi TI) ke PostgreSQL (baru, di Satu VPS Divisi TI).",
    );
  });
  it("kotak lepas tidak diberi kata 'ke'", () => {
    expect(deskripsi(semua[3], "T4")).toContain("Penyimpanan objek (baru); Service pembayaran");
  });
});

describe("varPesan", () => {
  it("memesan tinggi tata tegak dan mendatar ditambah bantalan, dengan ambang lebarMendatar", () => {
    for (const a of semua) {
      const v = varPesan(a);
      const mendatar = tata(a, "mendatar").tinggi + UKURAN.bantalan;
      expect(v["--diagram-mendatar"]).toBe(`${mendatar}px`);
      expect(Number(v["--diagram-selisih"])).toBe(tata(a, "tegak").tinggi + UKURAN.bantalan - mendatar);
      expect(v["--diagram-ambang"]).toBe(`${lebarMendatar(a)}px`);
    }
  });
});
