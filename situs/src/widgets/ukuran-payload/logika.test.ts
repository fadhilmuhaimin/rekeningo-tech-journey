import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import {
  angka, bacaAngka, bacaRekaman, byteBuka, bukaSatuPersen, cari, hemat, indeksBenar, isi, kali, labelPaket, lebarBatang,
  pemenang, persen, persenDari, persenKuota,
} from "./logika";
import { LabelUkuran } from "./skema";
import labelMentah from "../../../data/widget/t2-payload-ukuran.json";

const REKAMAN = path.resolve(__dirname, "../../../../labs/e5-payload/output/ledger/ukuran.txt");
const teks = fs.readFileSync(REKAMAN, "utf8");

describe("rekaman ukuran.txt (2.20)", () => {
  const r = bacaRekaman(teks);

  test("bagian C: sembilan baris, tiga bentuk x 5, 20, dan 50 baris", () => {
    expect(r.ukuran).toHaveLength(9);
    expect(cari(r, "api", 20)).toEqual({ baris: 20, bentuk: "api", mentah: 2932, gzip: 598 });
    expect(cari(r, "layar", 20)).toEqual({ baris: 20, bentuk: "layar", mentah: 2635, gzip: 581 });
    expect(cari(r, "penuh", 20)).toEqual({ baris: 20, bentuk: "penuh", mentah: 12196, gzip: 1680 });
    expect(cari(r, "penuh", 50)).toMatchObject({ mentah: 30389, gzip: 3535 });
    expect(cari(r, "api", 5)).toMatchObject({ mentah: 781, gzip: 300 });
  });

  test("bagian D: asumsi paket, hari, baris, dan buka per hari", () => {
    expect(r.asumsi).toEqual({ paket: 1_000_000_000, hari: 30, barisKuota: 20, bukaPerHari: [5, 20, 100] });
    expect(labelPaket(r.asumsi)).toBe("1 GB");
  });

  test("kuota 20 baris: api mentah 0,176 % pada 20 buka per hari, penuh mentah 0,732 %, layar gzip 0,035 %", () => {
    const a = r.asumsi;
    const k = (b: "api" | "layar" | "penuh", gz: boolean, n: number) => persenKuota(byteBuka(cari(r, b, 20), gz), n, a);
    expect(Math.round(k("api", false, 20) * 1000) / 1000).toBe(0.176);
    expect(Math.round(k("penuh", false, 20) * 1000) / 1000).toBe(0.732);
    expect(Math.round(k("layar", true, 20) * 1000) / 1000).toBe(0.035);
    expect(bukaSatuPersen(2932, a)).toBe(114);
    expect(bukaSatuPersen(12196, a)).toBe(27);
  });

  test("hemat: bentuk layar 10,1 %, gzip 79,6 %, layar dan gzip 80,2 % pada 20 baris", () => {
    const h = hemat(r, 20);
    expect(persenDari(h.layar)).toBe("10,1");
    expect(persenDari(h.gzip)).toBe("79,6");
    expect(persenDari(h.layarGzip)).toBe("80,2");
    expect(pemenang(h)).toBe("gzip");
  });

  test("penuh 4,16 kali api mentah dan 2,81 kali sesudah gzip pada 20 baris", () => {
    const api = cari(r, "api", 20);
    const penuh = cari(r, "penuh", 20);
    expect(kali(penuh.mentah / api.mentah)).toBe("4,16");
    expect(kali(penuh.gzip / api.gzip)).toBe("2,81");
  });

  test("pemenang di 5 dan 50 baris sama: gzip jauh di atas bentuk layar", () => {
    expect(pemenang(hemat(r, 5))).toBe("gzip");
    expect(pemenang(hemat(r, 50))).toBe("gzip");
  });
});

describe("rekaman yang dirusak menggagalkan pembacaan (uji mutasi)", () => {
  const ubah = (dari: string | RegExp, ke: string) => {
    const rusak = teks.replace(dari, ke);
    expect(rusak).not.toBe(teks);
    return rusak;
  };

  test("bagian hilang", () => {
    expect(() => bacaRekaman(ubah("# --- D. ", "# --- X. "))).toThrow(/bagian D/);
  });

  test("byte api 20 baris diubah di bagian C: persen gzip di rekaman tidak cocok lagi", () => {
    expect(() => bacaRekaman(ubah("| api    | 2.932      | 598 ", "| api    | 3.932      | 598 "))).toThrow(/gzip\/mentah|mentah per baris/);
  });

  test("kuota di bagian D diubah: tidak cocok dengan hitungan", () => {
    expect(() => bacaRekaman(ubah("0,176 %", "0,177 %"))).toThrow(/kuota api tidak/);
  });

  test("B per buka di bagian D beda dari bagian C", () => {
    expect(() => bacaRekaman(ubah("api    | tidak | 2.932      |", "api    | tidak | 2.931      |"))).toThrow(/B per buka api tidak/);
  });

  test("buka per hari untuk 1 % diubah", () => {
    expect(() => bacaRekaman(ubah(/\| 114 /, "| 115 "))).toThrow(/untuk 1 %/);
  });

  test("kalimat Asumsi hilang", () => {
    expect(() => bacaRekaman(ubah("buka per hari 5, 20, dan 100.", "buka tiap hari."))).toThrow(/Asumsi/);
  });

  test("satu baris bentuk dihapus dari bagian C", () => {
    const rusak = teks.split("\n").filter((b) => !/^\s+50 \| layar /.test(b)).join("\n");
    expect(rusak).not.toBe(teks);
    expect(() => bacaRekaman(rusak)).toThrow(/bagian C butuh/);
  });
});

describe("angka dan templat", () => {
  test("bacaAngka membaca format Indonesia", () => {
    expect(bacaAngka("2.932")).toBe(2932);
    expect(bacaAngka("0,176 %")).toBe(0.176);
    expect(bacaAngka("1.000.000.000")).toBe(1e9);
    expect(() => bacaAngka("abc")).toThrow();
    expect(() => bacaAngka("")).toThrow();
  });

  test("format angka dan persen", () => {
    expect(angka(30389)).toBe("30.389");
    expect(persen(0.17592, 3)).toBe("0,176");
    expect(lebarBatang(30389, 30389)).toBe(100);
    expect(lebarBatang(1, 30389)).toBe(1);
  });

  test("isi mengganti {nama} dan gagal bila nama tidak diisi", () => {
    expect(isi("a {x} b", { x: 1 })).toBe("a 1 b");
    expect(() => isi("a {y}", { x: 1 })).toThrow(/\{y\}/);
  });
});

describe("tebakan", () => {
  const r = bacaRekaman(teks);
  const L = LabelUkuran.parse(labelMentah);

  test("teks widget lolos skema dan tepat satu pilihan cocok dengan hasil rekaman", () => {
    expect(indeksBenar(L.pilihan, pemenang(hemat(r, r.asumsi.barisKuota)))).toBe(1);
  });

  test("pemenang yang dipilih dari angka lain: sama, layar, tidak", () => {
    expect(pemenang({ layar: 0.5, gzip: 0.52, layarGzip: 0.8 })).toBe("sama");
    expect(pemenang({ layar: 0.6, gzip: 0.1, layarGzip: 0.7 })).toBe("layar");
    expect(pemenang({ layar: 0.01, gzip: 0.02, layarGzip: 0.03 })).toBe("tidak");
  });

  test("dua pilihan dengan pemenang sama ditolak", () => {
    const ganda = L.pilihan.map((p, i) => (i === 0 ? { ...p, pemenang: "gzip" as const } : p));
    expect(() => indeksBenar(ganda, "gzip")).toThrow(/2 pilihan cocok/);
  });

  test("tidak ada pilihan yang cocok ditolak", () => {
    expect(() => indeksBenar(L.pilihan.filter((p) => p.pemenang !== "gzip"), "gzip")).toThrow(/0 pilihan cocok/);
  });
});
