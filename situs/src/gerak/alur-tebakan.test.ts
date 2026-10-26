// Jawaban tebakan widget alur dibuka hanya di akhir jalur yang ditanyakan (alur-core.js jalurTebakan, bukaJawaban).
// Cacat sebelumnya: tebakan tentang jalur utama (predict.varian bukan true) dibuka juga di akhir jalur varian, jadi
// "Tebakanmu benar. ..." beserta penjelasan jalur utama muncul sesudah langkah varian yang hasilnya lain (tinjauan 3.18:
// "Tebakanmu benar. Rp25.000 ..." tepat sesudah langkah "Rp22.500"). Pola yang sama ada di 22 skenario; pemeriksaan di
// browser (alur.js ikut memanggil fungsi ini) ada di situs/tools/ukur-detail-alur.mjs.
import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Skenario {
  predict?: { varian?: boolean; q: string; options: string[]; answer: number; explain: string };
  varian?: { label: string; mulai: number; langkah: unknown[] };
  langkah: unknown[];
}
const core = createRequire(import.meta.url)("../../lama/widgets/alur-core.js") as {
  normalize: (d: unknown) => Skenario;
  steps: (d: Skenario, varianOn: boolean) => unknown[];
  jalurTebakan: (d: Skenario) => "utama" | "varian";
  bukaJawaban: (d: Skenario, varianOn: boolean, i: number, panjang: number) => boolean;
};
const DIR = new URL("../../lama/widgets/data/skenario/", import.meta.url);
const semua = readdirSync(DIR)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => ({ f, d: core.normalize(JSON.parse(readFileSync(new URL(f, DIR), "utf8"))) }));

const predict = { q: "q", options: ["a", "b"], answer: 0, explain: "e" };
const langkah = [{}, {}, {}];
const dasar = (varianFlag?: boolean, bentuk: "varian" | "tanpa" = "varian"): Skenario => ({
  predict: varianFlag === undefined ? predict : { ...predict, varian: varianFlag },
  langkah,
  ...(bentuk === "varian" ? { varian: { label: "v", mulai: 1, langkah: [{}, {}] } } : {}),
});

describe("jalurTebakan", () => {
  it("predict.varian true: jalur varian; false atau tidak ada: jalur utama", () => {
    expect(core.jalurTebakan(dasar(true))).toBe("varian");
    expect(core.jalurTebakan(dasar(false))).toBe("utama");
    expect(core.jalurTebakan(dasar(undefined))).toBe("utama");
  });
});

describe("bukaJawaban", () => {
  it("tebakan tentang jalur utama: dibuka di akhir jalur utama, tidak di akhir jalur varian", () => {
    const d = dasar(false);
    expect(core.bukaJawaban(d, false, 3, 3)).toBe(true);
    expect(core.bukaJawaban(d, true, 4, 4)).toBe(false);
  });
  it("predict.varian tidak ditulis: sama dengan false (t1-migration)", () => {
    const d = dasar(undefined);
    expect(core.bukaJawaban(d, false, 3, 3)).toBe(true);
    expect(core.bukaJawaban(d, true, 4, 4)).toBe(false);
  });
  it("tebakan tentang jalur varian: dibuka di akhir jalur varian, tidak di akhir jalur utama", () => {
    const d = dasar(true);
    expect(core.bukaJawaban(d, true, 4, 4)).toBe(true);
    expect(core.bukaJawaban(d, false, 3, 3)).toBe(false);
  });
  it("hanya di langkah terakhir, di kedua jalur", () => {
    for (const flag of [false, true]) {
      const d = dasar(flag);
      const on = flag;
      const n = on ? 4 : 3;
      for (let i = 0; i <= n + 1; i++) expect(core.bukaJawaban(d, on, i, n)).toBe(i === n);
    }
  });
  it("tanpa tebakan: tidak pernah dibuka", () => {
    const d: Skenario = { langkah };
    expect(core.bukaJawaban(d, false, 3, 3)).toBe(false);
    expect(core.bukaJawaban(d, true, 3, 3)).toBe(false);
  });
});

describe("semua skenario widget alur", () => {
  const berTebakan = semua.filter((s) => s.d.predict);
  const berVarian = berTebakan.filter((s) => s.d.varian);

  it("ada skenario ber-tebakan dan ber-varian yang diperiksa (penjaga agar pemindaian tidak kosong)", () => {
    expect(berTebakan.length).toBeGreaterThanOrEqual(20);
    expect(berVarian.length).toBeGreaterThanOrEqual(20);
    expect(berVarian.filter((s) => !s.d.predict!.varian).length).toBeGreaterThanOrEqual(10);
    expect(berVarian.filter((s) => s.d.predict!.varian).length).toBeGreaterThanOrEqual(10);
  });
  it("predict.varian, bila ditulis, bertipe boolean", () => {
    for (const { f, d } of berTebakan)
      if ("varian" in d.predict!) expect(typeof d.predict!.varian, f).toBe("boolean");
  });
  it("tiap skenario ber-varian membuka jawaban di akhir TEPAT SATU jalur: yang ditanyakan", () => {
    for (const { f, d } of berVarian) {
      const utama = core.steps(d, false).length;
      const varian = core.steps(d, true).length;
      const diUtama = core.bukaJawaban(d, false, utama, utama);
      const diVarian = core.bukaJawaban(d, true, varian, varian);
      expect(diUtama !== diVarian, `${f}: jawaban dibuka di kedua atau tak satu pun jalur`).toBe(true);
      expect(diVarian, `${f}: predict.varian ${String(d.predict!.varian)}`).toBe(d.predict!.varian === true);
      expect(diUtama, `${f}: predict.varian ${String(d.predict!.varian)}`).toBe(d.predict!.varian !== true);
    }
  });
  it("skenario tanpa varian membuka jawaban di akhir jalur utama", () => {
    for (const { f, d } of berTebakan.filter((s) => !s.d.varian)) {
      const n = core.steps(d, false).length;
      expect(core.bukaJawaban(d, false, n, n), f).toBe(true);
    }
  });
});

describe("alur.js memakai fungsi itu", () => {
  const alur = readFileSync(new URL("../../lama/widgets/alur.js", import.meta.url), "utf8");
  it("memanggil core.bukaJawaban dengan varianOn, i, dan panjang jalur yang sedang dibaca", () => {
    expect(alur).toContain("core.bukaJawaban(d, varianOn, i, list.length)");
  });
  it("tidak menyimpan kondisi sendiri yang mengabaikan jalur (bentuk lama: !d.predict.varian || varianOn)", () => {
    expect(alur).not.toMatch(/!\s*d\.predict\.varian\s*\|\|/);
    expect(alur).not.toMatch(/d\.predict\.varian/);
  });
  it("menutup jawaban dan mengosongkan revealed saat varian dicentang atau dilepas", () => {
    const blok = alur.slice(alur.indexOf('cb.addEventListener("change"'), alur.indexOf("var varianBox"));
    expect(blok).toContain("revealed = false;");
    expect(blok).toContain('pBox.querySelectorAll(".bb-predict__a").forEach(function (a) { a.remove(); });');
  });
});
