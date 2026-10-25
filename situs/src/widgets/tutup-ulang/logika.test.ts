import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { arahDari, bacaRekaman, bil, indeksBenar, isi, nilaiTeks, rp, tabelWaktu } from "./logika";
import { LabelTutupUlang } from "./skema";
import labelMentah from "../../../data/widget/t2-m17-tutup-ulang.json";

const REKAMAN = path.resolve(__dirname, "../../../../labs/api-t2/output/tutup-buku.txt");
const teks = fs.readFileSync(REKAMAN, "utf8");

describe("rekaman tutup-buku.txt bagian C (M17)", () => {
  const r = bacaRekaman(teks);

  test("laporan sebelum [A] COMMIT: 1.122 jurnal, Budi masuk Rp1.020.000, semua buku cocok", () => {
    expect(r.sebelum).toMatchObject({ buku: 1016, cocok: 1016, tidakCocok: 0, jurnal: 1122, tidakSeimbang: 0, jumlahPosting: 0 });
    expect(r.sebelum.budi).toEqual({ awal: 0, masuk: 1020000, keluar: 610000, akhir: 410000, cache: 410000 });
  });

  test("laporan sesudah [A] COMMIT: 1.123 jurnal, Budi masuk Rp1.021.000, buku tetap cocok", () => {
    expect(r.sesudah).toMatchObject({ buku: 1016, cocok: 1016, tidakCocok: 0, jurnal: 1123, tidakSeimbang: 0, jumlahPosting: 0 });
    expect(r.sesudah.budi).toEqual({ awal: 0, masuk: 1021000, keluar: 610000, akhir: 411000, cache: 411000 });
    expect(r.tambahan).toBe(1000);
    expect(r.jurnalDilaporkan).toBe(1122);
    expect(r.jurnalSesudahCommit).toBe(1123);
    expect(arahDari(r)).toBe("naik-cocok");
  });

  test("tabel dan rupiah", () => {
    expect(bil(1016)).toBe("1.016");
    expect(rp(1021000)).toBe("Rp1.021.000");
    expect(rp(-1000)).toBe("−Rp1.000");
    expect(tabelWaktu(r, "sebelum").map((b) => [b.kode, b.nilai, b.sorot])).toEqual([
      ["jurnal", "1.122", null], ["cocok", "1.016 dari 1.016", null], ["tidakCocok", "0", "tetap"], ["tidakSeimbang", "0", "tetap"],
      ["masuk", "Rp1.020.000", null], ["akhir", "Rp410.000", null], ["cache", "Rp410.000", null],
    ]);
    expect(tabelWaktu(r, "sesudah").map((b) => [b.kode, b.nilai, b.sorot])).toEqual([
      ["jurnal", "1.123", "ubah"], ["cocok", "1.016 dari 1.016", null], ["tidakCocok", "0", "tetap"], ["tidakSeimbang", "0", "tetap"],
      ["masuk", "Rp1.021.000", "ubah"], ["akhir", "Rp411.000", "ubah"], ["cache", "Rp411.000", "ubah"],
    ]);
  });
});

describe("rekaman yang berubah bentuk menggagalkan build", () => {
  test("bagian C hilang", () => {
    expect(() => bacaRekaman(teks.replace("# --- C. ", "# --- X. "))).toThrow(/bagian C tidak ada/);
  });
  test("baris hitung jurnal sesudah COMMIT tidak sama dengan laporan kedua", () => {
    const rusak = teks.replace("jurnal: 1123 (laporan menghitung 1122)", "jurnal: 1124 (laporan menghitung 1122)");
    expect(rusak).not.toBe(teks);
    expect(() => bacaRekaman(rusak)).toThrow(/menulis 1124 jurnal, laporan kedua 1123/);
  });
  test("buku Budi tidak cocok di salah satu laporan", () => {
    const rusak = teks.replace("Budi        |          0 | 1021000 | 610000 |      411000 |      411000", "Budi        |          0 | 1021000 | 610000 |      411000 |      410000");
    expect(rusak).not.toBe(teks);
    expect(() => bacaRekaman(rusak)).toThrow(/buku Budi tidak cocok/);
  });
  test("jumlah laporan di bagian C bukan dua", () => {
    const rusak = teks.replaceAll("$ curl -i -X GET '/tutup-buku?periode=<bulan ini>' -H 'Authorization: Bearer <token sesi admin>'   # body 1016 buku, diringkas run.py\nHTTP/1.1 200 OK\nbuku: 1016, awal + masuk - keluar = akhir = saldo_cache: 1016, tidak cocok: 0\nsistem: {\"jurnal\": 1123", "# dihapus\nHTTP/1.1 200 OK\nbuku: 1016, awal + masuk - keluar = akhir = saldo_cache: 1016, tidak cocok: 0\nsistem: {\"jurnal\": 1123");
    expect(rusak).not.toBe(teks);
    expect(() => bacaRekaman(rusak)).toThrow(/1 laporan, harus dua/);
  });
});

describe("teks widget (t2-m17-tutup-ulang.json)", () => {
  const L = LabelTutupUlang.parse(labelMentah);
  const r = bacaRekaman(teks);
  const nilai = nilaiTeks(r);

  test("tepat satu pilihan yang cocok dengan rekaman, dan itu pilihan B", () => {
    expect(indeksBenar(L.pilihan, arahDari(r))).toBe(1);
  });

  test("dua pilihan dengan arah yang sama menggagalkan build", () => {
    const dobel = [L.pilihan[1]!, { ...L.pilihan[1]! }, L.pilihan[0]!];
    expect(() => indeksBenar(dobel, arahDari(r))).toThrow(/2 pilihan cocok/);
  });

  test("templat memakai nama yang tidak diisi gagal keras; angka masuk ke teks", () => {
    expect(() => isi("{tidakAda}", nilai)).toThrow(/tidak diisi/);
    expect(isi(L.pilihan[1]!.alasan, nilai)).toContain("naik dari 1.122 ke 1.123");
    expect(isi(L.pilihan[1]!.alasan, nilai)).toContain("dari Rp1.020.000 ke Rp1.021.000");
    expect(isi(L.kesimpulan.sesudah, nilai)).toContain("1.123 jurnal dan uang masuk Budi Rp1.021.000");
    expect(isi(L.pertanyaan, nilai)).toContain("jurnal top-up susulan Rp1.000");
  });
});
