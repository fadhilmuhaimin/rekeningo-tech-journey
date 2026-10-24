import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { angka, bacaGeser, daftarSesudah, hasilLayar, indeksBenar, isi } from "./logika";
import { LabelGeser } from "./skema";
import labelMentah from "../../../data/widget/t2-m12-geser.json";

const REKAMAN = path.resolve(__dirname, "../../../../labs/b2-query/output/ledger/pagination.txt");
const teks = fs.readFileSync(REKAMAN, "utf8");

describe("rekaman pagination.txt (M12)", () => {
  const g = bacaGeser(teks);

  test("dua halaman OFFSET 5 baris, satu baris ganda yang menyambung batas halaman", () => {
    expect(g.limit).toBe(5);
    expect(g.halaman1.map((b) => b.posting)).toEqual([760066, 760028, 759818, 759615, 759460]);
    expect(g.halaman2.map((b) => b.posting)).toEqual([759460, 759127, 759027, 758974, 758878]);
    expect(g.ganda.map((b) => b.posting)).toEqual([759460]);
    expect(g.halaman1.at(-1)!.posting).toBe(g.halaman2[0]!.posting);
  });

  test("kiriman diambil dari bagian B dan tidak ada di layar", () => {
    expect(g.kiriman).toMatchObject({ posting: 760451, jurnal: 380226, lawan: "Dimas", jumlah: "Rp5.000", arah: "masuk" });
    expect(hasilLayar(g)).toEqual({ ganda: 1, kirimanTampil: false, terlewat: 0 });
  });

  test("skala: dua halaman dihitung dari baris, seluruh riwayat dari bagian C", () => {
    expect(g.skala).toEqual([
      { id: "dua-halaman", barisPerHalaman: 5, halaman: 2, kiriman: 1, tampil: 10, ganda: 1, tidakTampil: 1 },
      { id: "seluruh", barisPerHalaman: 20, halaman: 205, kiriman: 204, tampil: 4098, ganda: 204, tidakTampil: 204 },
    ]);
  });

  test("daftar database sesudah kiriman: sepuluh baris, kiriman di posisi 1, ganda di posisi 6", () => {
    const d = daftarSesudah(g);
    expect(d).toHaveLength(10);
    expect(d[0]).toMatchObject({ posting: 760451, tanda: "baru", diminta: false });
    expect(d[5]).toMatchObject({ posting: 759460, tanda: "ganda", diminta: true });
    expect(d.filter((b) => b.diminta).map((b) => b.posting)).toEqual(g.halaman2.map((b) => b.posting));
    expect(d.filter((b) => b.tanda !== null)).toHaveLength(2);
  });

  test("bagian yang hilang ditolak", () => {
    const rusak = teks.replace("# --- C. ", "# --- X. ");
    expect(rusak).not.toBe(teks);
    expect(() => bacaGeser(rusak)).toThrow(/bagian C/);
  });

  test("halaman 2 yang bukan OFFSET = LIMIT halaman 1 ditolak", () => {
    const rusak = teks.replace("LIMIT 5 OFFSET 5", "LIMIT 5 OFFSET 6");
    expect(rusak).not.toBe(teks);
    expect(() => bacaGeser(rusak)).toThrow(/OFFSET = LIMIT/);
  });

  test("kolom catatan ganda yang tidak sama dengan irisan baris ditolak", () => {
    const rusak = teks.replace(/Rp50\.000 \| ganda/, "Rp50.000 |");
    expect(rusak).not.toBe(teks);
    expect(() => bacaGeser(rusak)).toThrow(/catatan 'ganda'/);
  });

  test("kalimat 'Di layar' yang tidak sama dengan hitungan ditolak", () => {
    const rusak = teks.replace("9 posting berbeda", "10 posting berbeda");
    expect(rusak).not.toBe(teks);
    expect(() => bacaGeser(rusak)).toThrow(/Di layar/);
  });

  test("kiriman yang ada di layar ditolak (bukan kasus M12)", () => {
    const rusak = teks.replace(/\n {2}759460 \| 379730 \| transfer \| masuk {2}\| Karyawan 1135 \| Rp50\.000 \| ganda/, "\n  760451 | 380226 | transfer | masuk  | Dimas         | Rp5.000  | ganda");
    expect(rusak).not.toBe(teks);
    expect(() => bacaGeser(rusak)).toThrow();
  });

  test("baris OFFSET bagian C yang hilang ditolak", () => {
    const rusak = teks.replace(/ OFFSET \|/, " ULANG  |");
    expect(rusak).not.toBe(teks);
    expect(() => bacaGeser(rusak)).toThrow(/bagian C/);
  });
});

describe("teks widget", () => {
  const L = LabelGeser.parse(labelMentah);
  const g = bacaGeser(teks);
  const nilai = { limit: g.limit, offset: g.limit, awal: g.limit + 1, akhir: 2 * g.limit, lawan: g.kiriman.lawan, jumlah: g.kiriman.jumlah, terlewat: g.terlewat };

  test("tepat satu pilihan cocok dengan hasil rekaman, dan bukan pilihan C (urutan tidak tetap)", () => {
    const i = indeksBenar(L.pilihan, hasilLayar(g));
    expect(L.pilihan[i]).toMatchObject({ ganda: 1, kirimanTampil: false, terlewat: 0 });
    expect(i).toBe(1);
  });

  test("dua pilihan dengan hasil sama ditolak", () => {
    const p = L.pilihan[0]!;
    expect(() => indeksBenar([p, { ...p }, L.pilihan[2]!], hasilLayar(g))).toThrow();
  });

  test("tidak ada pilihan yang cocok ditolak", () => {
    expect(() => indeksBenar(L.pilihan.filter((_, i) => i !== 1), hasilLayar(g))).toThrow(/tepat satu/);
  });

  test("semua templat terisi dari nilai rekaman, tanpa kurung kurawal tersisa", () => {
    const semua = [L.pertanyaan, L.database, L.garis, ...L.pilihan.flatMap((p) => [p.teks, p.alasan])];
    for (const t of semua) expect(isi(t, nilai)).not.toMatch(/[{}]/);
    expect(isi(L.garis, nilai)).toContain("OFFSET 5");
  });

  test("templat tanpa nilai gagal keras", () => {
    expect(() => isi("{baris} dan {tidak}", { baris: 1 })).toThrow(/tidak/);
  });

  test("angka memakai titik ribuan", () => {
    expect(angka(4098)).toBe("4.098");
  });
});
