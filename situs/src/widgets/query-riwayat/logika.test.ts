import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { angka, bacaN1, indeksBenar, isi, lebarBatang, waktu } from "./logika";
import { LabelQuery } from "./skema";
import labelMentah from "../../../data/widget/t2-m11-query.json";

const REKAMAN = path.resolve(__dirname, "../../../../labs/b2-query/output/ledger/n1.txt");
const teks = fs.readFileSync(REKAMAN, "utf8");

describe("rekaman n1.txt (M11)", () => {
  const p = bacaN1(teks);

  test("tiga permintaan, query = baris + 1, urutan rekaman", () => {
    expect(p.map((x) => [x.id, x.baris, x.query])).toEqual([
      ["halaman-1", 20, 21],
      ["laporan-ani", 194, 195],
      ["seluruh", 3892, 3893],
    ]);
  });

  test("waktu N+1 tanpa index riwayat dari bagian E (pembanding)", () => {
    expect(p.map((x) => x.ms)).toEqual([30.5, 106.1, 1936.4]);
  });

  test("jumlah query client dan log server berbeda ditolak", () => {
    const rusak = teks.replace(/\|\s+21 \|\s+21\n/, "|     21 |                 22\n");
    expect(rusak).not.toBe(teks);
    expect(() => bacaN1(rusak)).toThrow(/di log server/);
  });

  test("query bukan baris + 1 ditolak", () => {
    const rusak = teks.replace(/\|\s+3893 \|\s+3893/, "|   3000 |   3000");
    expect(rusak).not.toBe(teks);
    expect(() => bacaN1(rusak)).toThrow(/baris \+ 1/);
  });

  test("bagian yang hilang ditolak", () => {
    const rusak = teks.replace("# --- E. ", "# --- X. ");
    expect(rusak).not.toBe(teks);
    expect(() => bacaN1(rusak)).toThrow(/bagian E/);
  });
});

describe("teks widget", () => {
  const L = LabelQuery.parse(labelMentah);
  const awal = bacaN1(teks)[0]!;

  test("teks lolos skema dan tepat satu pilihan sama dengan query rekaman", () => {
    expect(L.pilihan[indeksBenar(L.pilihan, awal.query)]!.query).toBe(21);
  });

  test("dua pilihan bernilai sama ditolak", () => {
    expect(() => indeksBenar([{ query: 21, alasan: "a" }, { query: 21, alasan: "b" }], 21)).toThrow(/tepat satu/);
  });

  test("templat tanpa nilai gagal keras; templat terisi memuat angka rekaman", () => {
    expect(() => isi("{baris} dan {tidak}", { baris: 1 })).toThrow(/tidak/);
    const benar = L.pilihan.find((x) => x.query === awal.query)!;
    expect(isi(benar.alasan, { baris: awal.baris, query: awal.query })).toContain("21");
  });
});

describe("format", () => {
  test("angka dan waktu memakai titik ribuan dan koma desimal", () => {
    expect(angka(3893)).toBe("3.893");
    expect(waktu(1936.4)).toBe("1.936,4 ms");
    expect(waktu(30.5)).toBe("30,5 ms");
  });

  test("lebar batang proporsional, minimal 2 persen", () => {
    expect(lebarBatang(3893, 3893)).toBe(100);
    expect(lebarBatang(21, 3893)).toBe(2);
    expect(lebarBatang(195, 3893)).toBe(5);
  });
});
