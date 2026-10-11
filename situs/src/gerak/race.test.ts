import { describe, expect, it } from "vitest";
import { masukLangkah, pasangGerakRace } from "./race";

describe("gerak race", () => {
  it("tanpa elemen tidak ada gerak", () => {
    expect(masukLangkah(null)).toBeNull();
  });
  it("mendaftarkan BB.gerakRace tanpa menimpa isi BB lain", () => {
    const w = { BB: { lain: 1 } } as unknown as Window & { BB?: Record<string, unknown> };
    pasangGerakRace(w);
    expect(w.BB?.lain).toBe(1);
    expect(typeof (w.BB?.gerakRace as { masuk: unknown }).masuk).toBe("function");
  });
});
