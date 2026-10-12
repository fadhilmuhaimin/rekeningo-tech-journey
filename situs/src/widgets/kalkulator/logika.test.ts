import { describe, expect, it } from "vitest";
import cerita from "../../../data/cerita.json";
import dataM8 from "../../../data/widget/t1-m8-kalkulator.json";
import { DaftarAsumsi, DataKalkulator } from "./skema";
import { baris, berubah, duaAngka, format, hitung, jarak, kesimpulan, siapkan, titik } from "./logika";

const satuan = { detik: "detik", ms: "ms" };
const registry = DaftarAsumsi.parse(cerita.tahap.map((t) => t.asumsi));

describe("hitung dari asumsi registry", () => {
  it("Tahap 1: puncak 0,14 request per detik, satu request tiap 7,2 detik", () => {
    const h = hitung(registry[0]);
    expect(h.dau).toBe(30);
    expect(h.reqHari).toBe(1200);
    expect(duaAngka(h.rata)).toBe("0,014");
    expect(duaAngka(h.puncak)).toBe("0,14");
    expect(jarak(h.jarak, satuan)).toBe("7,2 detik");
  });

  it("Tahap 2 (PRD v2): sepuluh kali user, sepuluh kali puncak", () => {
    const h = hitung(registry[1]);
    expect(h.reqHari).toBe(12000);
    expect(duaAngka(h.puncak)).toBe("1,4");
    expect(jarak(h.jarak, satuan)).toBe("720 ms");
  });

  it("cocok dengan tabel D1: Tahap 3 ±17, Tahap 4 ±140, Tahap 5 ±1.400", () => {
    expect(registry.slice(2).map((a) => duaAngka(hitung(a).puncak))).toEqual(["17", "140", "1.400"]);
  });
});

describe("format angka", () => {
  it("dua angka penting dengan koma desimal dan titik ribuan", () => {
    expect(duaAngka(0.0996)).toBe("0,10");
    expect(duaAngka(3.3333)).toBe("3,3");
    expect(duaAngka(300)).toBe("300");
    expect(duaAngka(0)).toBe("0");
    expect(titik(12000)).toBe("12.000");
  });

  it("nilai tween (bilangan bulat × skala) diformat sama dengan nilai akhir", () => {
    const b = baris(registry[0], "asumsi");
    const puncak = b.find((x) => x.kunci === "puncak")!;
    expect(format("puncak", Math.round(puncak.nilai * puncak.skala), puncak.skala, satuan)).toBe("0,14");
    expect(format("jarak", 7_200_000, 1e6, satuan)).toBe("7,2 detik");
  });

  it("cara hitung menulis rumus dengan angka tahap", () => {
    expect(baris(registry[0], "asumsi").map((x) => x.cara)).toEqual([
      "asumsi",
      "100 × 30%",
      "30 × 40",
      "1.200 ÷ 86.400",
      "0,014 × 10",
    ]);
  });
});

describe("data t1-m8", () => {
  const data = DataKalkulator.parse(dataM8);
  const sk = siapkan(data, registry);

  it("skenario memakai asumsi registry: uji coba Tahap 1, PRD v2 Tahap 2", () => {
    expect(sk[0]).toEqual(registry[0]);
    expect(sk[1]).toEqual(registry[1]);
    expect(sk[2]).toEqual({ ...registry[1], puncak: 24 });
  });

  it("satu jam makan siang: faktor puncak 24, puncak 3,3, jawaban tebakan cocok", () => {
    const h = hitung(sk[data.tebak.skenario]);
    expect(duaAngka(h.puncak)).toBe("3,3");
    expect(data.tebak.pilihan[data.tebak.jawaban]).toContain(duaAngka(h.puncak));
    expect(data.tebak.alasan).toContain(duaAngka(h.puncak));
    expect(data.tebak.alasan).toContain(duaAngka(hitung(sk[data.awal]).puncak));
  });

  it("ganti skenario menandai baris yang berubah", () => {
    expect(berubah(sk[1], sk[2])).toEqual(["puncak", "jarak"]);
    expect(berubah(sk[0], sk[1])).toEqual(["user", "dau", "reqHari", "rata", "puncak", "jarak"]);
  });

  it("kesimpulan mengikuti angka skenario", () => {
    expect(kesimpulan(data.label.kesimpulan, sk[0], satuan)).toContain("7,2 detik");
    expect(kesimpulan(data.label.kesimpulan, sk[1], satuan)).toContain("720 ms");
    expect(kesimpulan(data.label.kesimpulan, sk[2], satuan)).toContain("300 ms");
  });
});

describe("skema menolak data yang salah", () => {
  it("jawaban di luar pilihan dan tebakan yang tidak butuh ganti skenario", () => {
    expect(DataKalkulator.safeParse({ ...dataM8, tebak: { ...dataM8.tebak, jawaban: 3 } }).success).toBe(false);
    expect(DataKalkulator.safeParse({ ...dataM8, tebak: { ...dataM8.tebak, skenario: dataM8.awal } }).success).toBe(false);
  });

  it("skenario yang menunjuk tahap tanpa asumsi", () => {
    const data = DataKalkulator.parse(dataM8);
    expect(() => siapkan(data, registry.slice(0, 1))).toThrow(/Tahap 2/);
  });
});
