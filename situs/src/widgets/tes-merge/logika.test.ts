import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { bacaRekaman, faktaDari, indeksBenar, isi, tabelMode } from "./logika";
import { LabelTesMerge } from "./skema";
import labelMentah from "../../../data/widget/t2-m14-tes.json";

const REKAMAN = path.resolve(__dirname, "../../../../labs/api-t2/output/m14.txt");
const teks = fs.readFileSync(REKAMAN, "utf8");

describe("rekaman m14.txt (M14)", () => {
  const r = bacaRekaman(teks);

  test("kode asli lolos di kedua cara; kode tanpa pemeriksaan gagal hanya dengan PostgreSQL", () => {
    expect(r.baris.asli.denganPostgres).toMatchObject({ exit: 0, gagal: 0, dilewati: 0 });
    expect(r.baris.asli.tanpaPostgres).toMatchObject({ exit: 0, gagal: 0 });
    expect(r.baris.tanpa.tanpaPostgres).toEqual(r.baris.asli.tanpaPostgres);
    expect(r.baris.tanpa.denganPostgres).toMatchObject({ exit: 1, gagal: 2, dilewati: 0 });
  });

  test("pemanggil periksaBatas: satu di kode asli, nol sesudah dicabut", () => {
    expect(r.baris.asli.pemanggil).toBe(1);
    expect(r.baris.tanpa.pemanggil).toBe(0);
  });

  test("dua tes gagal, dua-duanya lewat Kirim; TestBatasHarian tidak gagal", () => {
    expect(r.gagalNama).toEqual(["TestKirimBatasHarian", "TestKirimTidakMembedakanNomor"]);
    expect(r.bisaBangun).toBe(true);
    expect(faktaDari(r)).toEqual({ bisaBangun: true, unitPeriksaGagal: false, kirimGagal: true });
  });

  test("tabel per cara menjalankan tes", () => {
    expect(tabelMode(r, "dengan").map((b) => [b.kode, b.pemanggil, b.hasil.gagal])).toEqual([["asli", 1, 0], ["tanpa", 0, 2]]);
    expect(tabelMode(r, "tanpa").map((b) => [b.kode, b.hasil.gagal, b.hasil.dilewati > 0])).toEqual([["asli", 0, true], ["tanpa", 0, true]]);
  });
});

describe("rekaman yang berubah bentuk menggagalkan build", () => {
  test("ringkasan hilang", () => {
    expect(() => bacaRekaman(teks.replace("# kode | pemanggil periksaBatas", "# lain"))).toThrow(/baris kepala ringkasan/);
  });
  test("jumlah tes gagal tidak cocok dengan daftar nama", () => {
    expect(() => bacaRekaman(teks.replace("--- FAIL: TestKirimBatasHarian", "--- PASS: TestKirimBatasHarian"))).toThrow(/memuat 1/);
  });
  test("build gagal terbaca sebagai tidak bisa dibangun", () => {
    const rusak = teks.replace(/(\$ go build \.\/\.\.\. && go vet \.\/\.\.\..*\n)# exit status 0/, "$1# exit status 1");
    expect(rusak).not.toBe(teks);
    expect(bacaRekaman(rusak).bisaBangun).toBe(false);
  });
  test("TestBatasHarian tidak lolos pada kode tanpa pemeriksaan", () => {
    expect(() => bacaRekaman(teks.replace("--- PASS: TestBatasHarian", "--- SKIP: TestBatasHarian"))).toThrow(/TestBatasHarian lolos/);
  });
});

describe("teks widget (t2-m14-tes.json)", () => {
  const L = LabelTesMerge.parse(labelMentah);
  const r = bacaRekaman(teks);
  const nilai = { gagal: r.baris.tanpa.denganPostgres.gagal, nama: r.gagalNama.join(" dan "), dilewati: r.baris.tanpa.tanpaPostgres.dilewati };

  test("tepat satu pilihan yang cocok dengan rekaman, dan itu pilihan C", () => {
    const pilihan = L.pilihan.map((p) => ({ ...p, alasan: isi(p.alasan, nilai) }));
    expect(indeksBenar(pilihan, faktaDari(r))).toBe(2);
  });

  test("dua pilihan dengan fakta yang sama menggagalkan build", () => {
    const dobel = [L.pilihan[2]!, { ...L.pilihan[2]! }, L.pilihan[0]!];
    expect(() => indeksBenar(dobel, faktaDari(r))).toThrow(/2 pilihan cocok/);
  });

  test("templat memakai nama yang tidak diisi gagal keras", () => {
    expect(() => isi("{tidakAda}", nilai)).toThrow(/tidak diisi/);
    expect(isi(L.kesimpulan.dengan, nilai)).toContain("TestKirimBatasHarian dan TestKirimTidakMembedakanNomor");
  });
});
