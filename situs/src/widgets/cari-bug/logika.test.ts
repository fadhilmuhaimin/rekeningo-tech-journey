import { describe, expect, test } from "vitest";
import mentah from "../../../data/widget/t1-m3-caribug.json";
import sqli from "../../../data/widget/t1-sqli-caribug.json";
import { DataCariBug } from "./skema";
import { periksa, ringkas } from "./logika";

const data = DataCariBug.parse(mentah);

describe("cari-bug t1-m3 (1.19)", () => {
  test("data valid: dua baris bug, masing-masing punya alasan", () => {
    expect(data.bug).toEqual([1, 2]);
    for (const i of data.bug) expect(data.alasan[String(i)]).toBeTruthy();
  });

  test("menandai kedua baris bug: tepat", () => {
    const h = periksa(data, new Set([1, 2]));
    expect(h.tepat).toBe(true);
    expect(h.jumlahBenar).toBe(2);
    expect(h.nilai).toEqual({ 1: "benar", 2: "benar" });
  });

  test("satu bug terlewat: belum tepat", () => {
    const h = periksa(data, new Set([1]));
    expect(h.tepat).toBe(false);
    expect(h.nilai).toEqual({ 1: "benar", 2: "lewat" });
  });

  test("menandai baris biasa: dihitung salah", () => {
    const h = periksa(data, new Set([1, 2, 3]));
    expect(h.tepat).toBe(false);
    expect(h.nilai[3]).toBe("salah");
  });

  test("skema menolak baris bug tanpa alasan", () => {
    const rusak = structuredClone(mentah);
    rusak.bug.push(4);
    expect(DataCariBug.safeParse(rusak).success).toBe(false);
  });
});

describe("cari-bug t1-sqli (1.20)", () => {
  const d = DataCariBug.parse(sqli);

  test("satu baris bug; baris yang tampak berbahaya punya penjelasan aman", () => {
    expect(d.bug).toEqual([3]);
    expect(Object.keys(d.aman).sort()).toEqual(["2", "4", "5"]);
  });

  test("menandai baris LIMIT %d: bug terlewat dan satu tanda salah", () => {
    const h = periksa(d, new Set([4]));
    expect(h.tepat).toBe(false);
    expect(h.nilai).toEqual({ 3: "lewat", 4: "salah" });
  });

  test("data lama tanpa field aman tetap valid", () => {
    expect(data.aman).toEqual({});
  });

  test("baris aman yang juga bug ditolak skema", () => {
    expect(DataCariBug.safeParse({ ...sqli, aman: { "3": "x" } }).success).toBe(false);
  });
});

describe("kejadian dan ringkas (3.4, keputusan 1012)", () => {
  test("data lama tanpa kejadian dan tanpa ringkas tetap valid", () => {
    expect(data.kejadian).toBeUndefined();
    expect(data.label.ringkas).toBeUndefined();
  });

  test("ringkas mengisi {benar}, {bug}, dan {salah} dari hasil periksa", () => {
    const h = periksa(data, new Set([1, 3]));
    expect(ringkas("{benar} dari {bug}; {salah} salah", h)).toBe("1 dari 2; 1 salah");
  });

  test("kejadian: jumlah sel sama dengan jumlah hal, status hanya ya, tidak, atau na", () => {
    const dasar = { judul: "k", hal: ["a", "b"], status: { ya: "Ya", tidak: "Tidak", na: "Tidak berlaku" }, baris: [{ nama: "n", sel: [{ status: "ya" }, { status: "na" }] }] };
    expect(DataCariBug.safeParse({ ...mentah, kejadian: dasar }).success).toBe(true);
    expect(DataCariBug.safeParse({ ...mentah, kejadian: { ...dasar, baris: [{ nama: "n", sel: [{ status: "ya" }] }] } }).success).toBe(false);
    expect(DataCariBug.safeParse({ ...mentah, kejadian: { ...dasar, baris: [{ nama: "n", sel: [{ status: "mungkin" }, { status: "ya" }] }] } }).success).toBe(false);
  });
});
