import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { arahDari, bacaRekaman, indeksBenar, isi, nilaiTeks, rp, tabelUrutan } from "./logika";
import { LabelSelisihBank } from "./skema";
import labelMentah from "../../../data/widget/t2-m15-selisih.json";

const REKAMAN = path.resolve(__dirname, "../../../../labs/t2-pencairan/output/rentan.txt");
const teks = fs.readFileSync(REKAMAN, "utf8");

describe("rekaman rentan.txt (M15)", () => {
  const r = bacaRekaman(teks);

  test("file dulu: 13 baris Rp2.465.000 lawan 12 jurnal dan mutasi Rp2.450.000, file lebih besar Rp15.000", () => {
    expect(r["file-dulu"]).toMatchObject({ barisFile: 13, totalFile: 2465000, jurnal: 12, mutasiKas: 2450000, selisih: 15000 });
    expect(r["file-dulu"].warung).toEqual({ nama: "Warung 508", barisFile: 2, jumlahFile: 30000, jurnal: 1, jumlahLedger: 15000 });
    expect(arahDari(r["file-dulu"])).toBe("file-lebih-besar");
  });

  test("jurnal dulu: 11 baris Rp2.435.000, file lebih kecil Rp15.000, Warung 508 tidak ada di file", () => {
    expect(r["jurnal-dulu"]).toMatchObject({ barisFile: 11, totalFile: 2435000, jurnal: 12, mutasiKas: 2450000, selisih: -15000 });
    expect(r["jurnal-dulu"].warung).toMatchObject({ barisFile: 0, jumlahFile: 0, jurnal: 1 });
    expect(arahDari(r["jurnal-dulu"])).toBe("file-lebih-kecil");
  });

  test("tabel dan rupiah", () => {
    expect(rp(2465000)).toBe("Rp2.465.000");
    expect(rp(-15000)).toBe("−Rp15.000");
    expect(rp(0)).toBe("Rp0");
    expect(tabelUrutan(r["file-dulu"]).map((b) => [b.kode, b.nilai, b.sorot])).toEqual([
      ["baris", "13", false], ["total", "Rp2.465.000", false], ["jurnal", "12", false], ["mutasi", "Rp2.450.000", false],
      ["selisih", "Rp15.000", true], ["warungFile", "2", true], ["warungLedger", "1", false],
    ]);
    expect(tabelUrutan(r["jurnal-dulu"]).find((b) => b.kode === "selisih")!.nilai).toBe("−Rp15.000");
  });
});

describe("rekaman yang berubah bentuk menggagalkan build", () => {
  test("bagian D hilang", () => {
    expect(() => bacaRekaman(teks.replace("# --- D. ", "# --- X. "))).toThrow(/bagian D tidak ada/);
  });
  test("baris selisih tertulis tidak sama dengan total file dikurangi mutasi ledger", () => {
    const rusak = teks.replace("-- Selisih file - ledger: Rp15.000.", "-- Selisih file - ledger: Rp25.000.");
    expect(rusak).not.toBe(teks);
    expect(() => bacaRekaman(rusak)).toThrow(/selisih tertulis 25000/);
  });
  test("tabel total hilang", () => {
    expect(() => bacaRekaman(teks.replaceAll(" baris_file | total_file | jurnal_pencairan", " lain | total_file | jurnal_pencairan"))).toThrow(/tabel total tidak ada/);
  });
});

describe("teks widget (t2-m15-selisih.json)", () => {
  const L = LabelSelisihBank.parse(labelMentah);
  const r = bacaRekaman(teks);
  const nilai = nilaiTeks(r["file-dulu"]);

  test("tepat satu pilihan yang cocok dengan rekaman, dan itu pilihan B", () => {
    expect(indeksBenar(L.pilihan, arahDari(r["file-dulu"]))).toBe(1);
  });

  test("dua pilihan dengan arah yang sama menggagalkan build", () => {
    const dobel = [L.pilihan[1]!, { ...L.pilihan[1]! }, L.pilihan[0]!];
    expect(() => indeksBenar(dobel, arahDari(r["file-dulu"]))).toThrow(/2 pilihan cocok/);
  });

  test("templat memakai nama yang tidak diisi gagal keras; angka masuk ke teks", () => {
    expect(() => isi("{tidakAda}", nilai)).toThrow(/tidak diisi/);
    expect(isi(L.pilihan[1]!.alasan, nilai)).toContain("13 baris senilai Rp2.465.000");
    expect(isi(L.kesimpulan["jurnal-dulu"], nilaiTeks(r["jurnal-dulu"]))).toContain("File lebih kecil Rp15.000");
  });
});
