import { afterEach, describe, expect, it, vi } from "vitest";
import { nilaiAntara, tweenAngka } from "./angka";
import { durasi } from "./token";
import { rupiah } from "../widgets/jumlah-total/logika";

const RUPIAH = /^−?Rp\d{1,3}(\.\d{3})*$/;

// Jam palsu: setiap frame maju 1000/60 ms.
function jam() {
  let t = 0;
  let antre: ((t: number) => void) | null = null;
  vi.stubGlobal("performance", { now: () => t });
  vi.stubGlobal("requestAnimationFrame", (f: (t: number) => void) => ((antre = f), 1));
  vi.stubGlobal("cancelAnimationFrame", () => (antre = null));
  return {
    frame() {
      t += 1000 / 60;
      const f = antre;
      antre = null;
      f?.(t);
      return f !== null;
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("nilaiAntara", () => {
  it("ujung tepat dan angka antara bilangan bulat", () => {
    expect(nilaiAntara(25_000_000, 24_975_000, 0)).toBe(25_000_000);
    expect(nilaiAntara(25_000_000, 24_975_000, 1)).toBe(24_975_000);
    expect(nilaiAntara(25_000_000, 24_975_000, 1.2)).toBe(24_975_000);
    expect(nilaiAntara(250_000, 225_000, 0.333)).toBe(241_675);
    expect(Number.isInteger(nilaiAntara(1, 2, 0.5))).toBe(true);
  });
});

describe("tweenAngka", () => {
  it("frame pertama nilai lama, angka antara berformat rupiah, frame terakhir tepat nilai akhir", () => {
    const j = jam();
    const el = { textContent: "" } as HTMLElement;
    tweenAngka(el, 250_000, 225_000, rupiah, false);
    expect(el.textContent).toBe("Rp250.000");
    const teks: string[] = [];
    let n = 0;
    while (j.frame()) {
      teks.push(el.textContent!);
      n++;
    }
    expect(teks.every((s) => RUPIAH.test(s))).toBe(true);
    expect(teks.at(-1)).toBe("Rp225.000");
    expect(new Set(teks).size).toBeGreaterThan(3);
    expect(n).toBeLessThanOrEqual(Math.ceil(durasi.sedang * 60) + 1);
    // Turun terus, tidak melewati nilai akhir.
    const angka = teks.map((s) => Number(s.replace(/\D/g, "")));
    expect(angka.every((v, i) => i === 0 || v <= angka[i - 1])).toBe(true);
    expect(Math.min(...angka)).toBe(225_000);
  });

  it("reduced motion: nilai akhir langsung, tanpa frame", () => {
    const j = jam();
    const el = { textContent: "Rp25.000.000" } as HTMLElement;
    const t = tweenAngka(el, 25_000_000, 24_975_000, rupiah, true);
    expect(el.textContent).toBe("Rp24.975.000");
    expect(j.frame()).toBe(false);
    expect(t.berhenti()).toBe(24_975_000);
  });

  it("disela: berhenti mengembalikan nilai yang sedang tampil", () => {
    const j = jam();
    const el = { textContent: "" } as HTMLElement;
    const t = tweenAngka(el, 0, 100_000, rupiah, false);
    j.frame();
    j.frame();
    const tampil = t.berhenti();
    expect(rupiah(tampil)).toBe(el.textContent);
    expect(tampil).toBeGreaterThan(0);
    expect(tampil).toBeLessThan(100_000);
    expect(j.frame()).toBe(false);
  });
});
