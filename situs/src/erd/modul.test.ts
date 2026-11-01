// modulTahap: pembagian modul (Tahap 4) dan service (Tahap 5) untuk halaman konten (tinjauan ERD5, keputusan 1673).
// Sebelum modul.ts, ErdHalaman.astro membaca `modul-tahap-*.json` saja, jadi service Tahap 5 tidak tampil di halaman mana pun
// selain /uji/erd/ (yang mengimpor berkasnya sendiri).
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import t1 from "../../data/erd/tahap-1.json";
import t2 from "../../data/erd/tahap-2.json";
import t3 from "../../data/erd/tahap-3.json";
import t4 from "../../data/erd/tahap-4.json";
import t5 from "../../data/erd/tahap-5.json";
import s5 from "../../data/erd/service-tahap-5.json";
import { DataErd } from "./skema";
import { BERKAS_PEMBAGIAN, modulTahap } from "./modul";

const data = [t1, t2, t3, t4, t5].map((d) => DataErd.parse(d));

describe("modulTahap: pembagian modul dan service untuk halaman konten", () => {
  it("setiap berkas modul-tahap-N.json dan service-tahap-N.json di folder data terbaca oleh glob", () => {
    const folder = fileURLToPath(new URL("../../data/erd/", import.meta.url));
    const ada = readdirSync(folder).filter((f) => /^(modul|service)-tahap-\d+\.json$/.test(f)).sort();
    expect(BERKAS_PEMBAGIAN).toEqual(ada);
    expect(ada).toEqual(["modul-tahap-4.json", "service-tahap-5.json"]);
  });
  it("halaman dengan Tahap 4 dan 5 mendapat modul lalu service; Tahap 5 sendiri mendapat service; Tahap 1 sampai 3 tanpa pembagian", () => {
    const ringkas = (t: number[]) => modulTahap(t, data).map((m) => [m.tahap, m.istilah, m.modul.length, m.modul.reduce((n, x) => n + x.tabel.length, 0)]);
    expect(ringkas([4, 5])).toEqual([[4, "modul", 6, 22], [5, "service", 6, 30]]);
    expect(ringkas([5])).toEqual([[5, "service", 6, 30]]);
    expect(ringkas([4])).toEqual([[4, "modul", 6, 22]]);
    expect(ringkas([1, 2, 3])).toEqual([]);
  });
  it("pembagian yang tidak cocok dengan ERD-nya atau tanpa ERD tahapnya ditolak", () => {
    const tanpaSakelar = data.map((d) => (d.tahap === 5 ? { ...d, tabel: d.tabel.filter((t) => t.nama !== "sakelar") } : d));
    expect(() => modulTahap([5], tanpaSakelar)).toThrow(/tabel di pembagian service tidak sama/);
    expect(() => modulTahap([5], data.filter((d) => d.tahap !== 5))).toThrow(/ERD Tahap 5 tidak ada di data halaman/);
  });
  it("tahap dengan modul dan service sekaligus, atau berkas yang isinya tahap lain, ditolak (glob dipalsukan lewat parameter sumber)", () => {
    const dir = "../../data/erd/";
    expect(() => modulTahap([5], data, { [`${dir}modul-tahap-5.json`]: s5, [`${dir}service-tahap-5.json`]: s5 })).toThrow(/modul-tahap-5.json dan service-tahap-5.json ada bersamaan/);
    expect(() => modulTahap([4], data, { [`${dir}service-tahap-4.json`]: s5 })).toThrow(/Tahap 4: pembagian service berisi Tahap 5/);
    expect(modulTahap([5], data, { [`${dir}service-tahap-5.json`]: s5 }).map((m) => m.istilah)).toEqual(["service"]);
  });
});
