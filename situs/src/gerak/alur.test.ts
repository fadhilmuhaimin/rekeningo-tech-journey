import { describe, expect, it } from "vitest";
import { kerangkaPaket } from "./alur";

describe("kerangkaPaket", () => {
  it("paket berangkat dari titik awal relatif ke posisi akhir", () => {
    expect(kerangkaPaket({ x: 40, y: 0 }, { x: 120, y: 0 }, false)).toEqual({ translate: ["-80px 0px", "0px 0px"] });
  });
  it("rel vertikal: geser di sumbu y", () => {
    expect(kerangkaPaket({ x: 18, y: 210 }, { x: 18, y: 60.4 }, false)).toEqual({ translate: ["0px 150px", "0px 0px"] });
  });
  it("paket yang baru muncul ikut opacity 0 → 1", () => {
    expect(kerangkaPaket({ x: 10, y: 0 }, { x: 10, y: 0 }, true)).toEqual({ translate: ["0px 0px", "0px 0px"], opacity: [0, 1] });
  });
  it("tidak ada gerak bila posisi sama dan paket sudah tampil", () => {
    expect(kerangkaPaket({ x: 10.2, y: 5 }, { x: 10, y: 5.3 }, false)).toBeNull();
  });
});
