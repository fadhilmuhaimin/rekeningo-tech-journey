import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { htmlRaceStatis, rp, type RekamanRace } from "./race-statis";

const baca = (m: string) =>
  JSON.parse(readFileSync(new URL(`../../lama/widgets/data/b3-race/${m}.json`, import.meta.url), "utf8")) as RekamanRace;
const modes = ["tx-tanpa-lock", "for-update", "atomic", "optimistic"];

describe("htmlRaceStatis", () => {
  const html = htmlRaceStatis(modes.map(baca));
  it("rupiah sama dengan BB.rp", () => {
    expect([rp(100000), rp(-20000), rp(0)]).toEqual(["Rp100.000", "-Rp20.000", "Rp0"]);
  });
  it("tersembunyi dari pembaca layar dan tidak bisa dipakai", () => {
    expect(html.startsWith('<div class="bb-race-pesan" aria-hidden="true" inert>')).toBe(true);
  });
  it("tab pertama terpilih, satu tab per rekaman", () => {
    expect(html.match(/role="tab"/g)).toHaveLength(4);
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html).toContain('data-m="tx-tanpa-lock" aria-selected="true"');
  });
  it("langkah 0, garis waktu dua lajur masih kosong", () => {
    const d = baca("tx-tanpa-lock");
    expect(html).toContain(`Langkah 0 dari ${d.steps.length}`);
    expect(html).toContain('<ol class="bb-race-garis__daftar" aria-label="Garis waktu dua client"></ol>');
    expect(html).toContain("Client A</span>");
  });
  it("teks dari rekaman di-escape", () => {
    expect(htmlRaceStatis([{ ...baca("atomic"), title: "a < b & c" }])).toContain("a &lt; b &amp; c");
  });
});
