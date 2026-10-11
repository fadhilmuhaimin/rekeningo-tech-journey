import { afterEach, describe, expect, it, vi } from "vitest";
import { gerakkanAngka, nilaiAntara, tweenAngka } from "./angka";
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

  it("selesai dipanggil sekali saat nilai akhir tampil, tidak bila disela", () => {
    const j = jam();
    const el = { textContent: "" } as HTMLElement;
    const selesai = vi.fn();
    tweenAngka(el, 250_000, 225_000, rupiah, false, () => selesai(el.textContent));
    j.frame();
    expect(selesai).not.toHaveBeenCalled();
    while (j.frame());
    expect(selesai).toHaveBeenCalledOnce();
    expect(selesai).toHaveBeenCalledWith("Rp225.000");

    const langsung = vi.fn();
    tweenAngka(el, 25_000_000, 24_975_000, rupiah, true, langsung);
    expect(langsung).toHaveBeenCalledOnce();

    const disela = vi.fn();
    const t = tweenAngka(el, 0, 100_000, rupiah, false, disela);
    j.frame();
    t.berhenti();
    while (j.frame());
    expect(disela).not.toHaveBeenCalled();
  });
});

// Meniru efek komponen Rupiah: setiap nilai baru menyela tween sebelumnya, lalu mulai dari angka yang sedang tampil.
function sel(awal: number, kurangi = false) {
  const el = { textContent: rupiah(awal) } as HTMLElement;
  const jejak: boolean[] = [];
  const lapor = (b: boolean) => jejak.push(b);
  let tw = gerakkanAngka(el, awal, awal, rupiah, lapor, kurangi);
  return {
    el,
    jejak,
    ke(nilai: number) {
      tw = gerakkanAngka(el, tw.berhenti(), nilai, rupiah, lapor, kurangi);
    },
    bergerak: () => jejak.at(-1),
  };
}

describe("gerakkanAngka", () => {
  it("klik ganda: tween disela sebelum frame pertama dan kembali ke angka yang tampil, bergerak false", () => {
    const j = jam();
    const s = sel(25_000_000);
    s.ke(24_975_000);
    expect(s.bergerak()).toBe(true);
    s.ke(25_000_000);
    expect(s.bergerak()).toBe(false);
    expect(s.el.textContent).toBe("Rp25.000.000");
    expect(j.frame()).toBe(false);
  });

  it("bergerak true hanya selama tween berjalan: disela ke nilai lain, angka antara yang sama, frame terakhir", () => {
    const j = jam();
    const s = sel(0);
    s.ke(100_000);
    j.frame();
    j.frame();
    s.ke(50_000);
    expect(s.bergerak()).toBe(true);
    while (j.frame());
    expect(s.bergerak()).toBe(false);
    expect(s.el.textContent).toBe("Rp50.000");

    s.ke(100_000);
    j.frame();
    j.frame();
    const tampil = Number(s.el.textContent!.replace(/\D/g, ""));
    s.ke(tampil);
    expect(s.bergerak()).toBe(false);
    expect(j.frame()).toBe(false);
  });

  it("reduced motion dan elemen belum ada: tidak pernah bergerak", () => {
    const j = jam();
    const s = sel(250_000, true);
    s.ke(225_000);
    s.ke(250_000);
    s.ke(225_000);
    expect(s.jejak.every((b) => b === false)).toBe(true);
    expect(s.el.textContent).toBe("Rp225.000");
    expect(j.frame()).toBe(false);

    const lapor = vi.fn();
    expect(gerakkanAngka(null, 0, 100_000, rupiah, lapor, false).berhenti()).toBe(100_000);
    expect(lapor).toHaveBeenCalledExactlyOnceWith(false);
  });
});
