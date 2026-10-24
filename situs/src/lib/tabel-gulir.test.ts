// Wadah tabel gulir (A11y-gulir-tabel, keputusan 712): atribut fokus mengikuti luapan, tanpa DOM.
import { describe, expect, it } from "vitest";
import { atur, meluap, type WadahAtribut } from "./tabel-gulir";

function wadah(attr: Record<string, string>): WadahAtribut & { attr: Record<string, string> } {
  const a = { ...attr };
  return {
    attr: a,
    dataset: {},
    getAttribute: (n) => a[n] ?? null,
    setAttribute: (n, v) => { a[n] = v; },
    removeAttribute: (n) => { delete a[n]; },
  };
}
const DARI_BUILD = { class: "tabel-gulir", role: "region", "aria-label": "Tabel: A, B; gulir ke samping", tabindex: "0" };

describe("meluap", () => {
  it("jarak gulir lebih dari 0 px di salah satu sumbu", () => {
    expect(meluap({ scrollWidth: 401, clientWidth: 400, scrollHeight: 80, clientHeight: 80 })).toBe(true);
    expect(meluap({ scrollWidth: 400, clientWidth: 400, scrollHeight: 81, clientHeight: 80 })).toBe(true);
    expect(meluap({ scrollWidth: 400, clientWidth: 400, scrollHeight: 80, clientHeight: 80 })).toBe(false);
    expect(meluap({ scrollWidth: 0, clientWidth: 0, scrollHeight: 0, clientHeight: 0 })).toBe(false); // di blok tertutup
  });
});

describe("atur", () => {
  it("tidak meluap: role, nama, dan tabindex dicabut, nama disimpan", () => {
    const w = wadah(DARI_BUILD);
    atur(w, false, false);
    expect(w.attr).toEqual({ class: "tabel-gulir" });
    expect(w.dataset.nama).toBe(DARI_BUILD["aria-label"]);
  });

  it("meluap lagi: ketiganya kembali dengan nama dari build", () => {
    const w = wadah(DARI_BUILD);
    atur(w, false, false);
    atur(w, true, false);
    expect(w.attr).toEqual(DARI_BUILD);
  });

  it("wadah yang sedang difokus tidak dicabut", () => {
    const w = wadah(DARI_BUILD);
    atur(w, false, true);
    expect(w.attr).toEqual(DARI_BUILD);
  });
});
