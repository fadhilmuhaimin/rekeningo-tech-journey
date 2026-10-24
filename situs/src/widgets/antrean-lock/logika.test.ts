import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { bacaLangkah, bacaRekaman, bacaTabelLock, indeksBenar, isi, keadaanDari, papanSesudah, sesiDi } from "./logika";
import { LabelAntrean } from "./skema";
import labelMentah from "../../../data/widget/t2-m13-antrean.json";

const DIR = path.resolve(__dirname, "../../../../labs/b4-skema/output/ledger");
const satu = fs.readFileSync(path.join(DIR, "satu-langkah.txt"), "utf8");
const batas = fs.readFileSync(path.join(DIR, "lock-timeout.txt"), "utf8");

describe("rekaman satu-langkah.txt dan lock-timeout.txt (M13)", () => {
  const r = bacaRekaman(satu, batas);

  test("delapan langkah tanpa batas tunggu, lima dengan batas tunggu, urutan sesi dari rekaman", () => {
    expect(r.tanpa.map((l) => l.sesi)).toEqual(["R", "M", "P1", "P2", "R", "M", "P1", "P2"]);
    expect(r.dengan.map((l) => l.sesi)).toEqual(["R", "M", "P1", "M", "P1"]);
  });

  test("antrean sesudah langkah 4: M di belakang R, Bayar dan Buka saldo di belakang M", () => {
    const p = papanSesudah(r.tanpa, 4);
    expect(p.R).toEqual({ status: "terbuka" });
    expect(p.M).toEqual({ status: "menunggu", belakang: "R" });
    expect(p.P1).toEqual({ status: "menunggu", belakang: "M" });
    expect(p.P2).toEqual({ status: "menunggu", belakang: "M" });
  });

  test("tabel pg_locks sama dengan keadaan turunan", () => {
    expect(r.tabelLock).toEqual({ R: null, M: "R", P1: "M", P2: "M" });
  });

  test("keadaan akhir tanpa batas tunggu: Bayar dan Buka saldo gagal 42703", () => {
    const p = papanSesudah(r.tanpa, 8);
    expect(p.R?.status).toBe("selesai");
    expect(p.M?.status).toBe("selesai");
    expect(p.P1).toEqual({ status: "gagal", kode: "42703" });
    expect(p.P2).toEqual({ status: "gagal", kode: "42703" });
  });

  test("keadaan akhir dengan batas tunggu: migrasi menyerah 55P03, Bayar selesai, laporan masih terbuka", () => {
    const p = papanSesudah(r.dengan, 5);
    expect(p.R).toEqual({ status: "terbuka" });
    expect(p.M).toEqual({ status: "menyerah", kode: "55P03" });
    expect(p.P1).toEqual({ status: "selesai" });
  });

  test("sesi per mode berurutan R, M, P1, P2; Buka saldo hanya di rekaman tanpa batas tunggu", () => {
    expect(sesiDi(r.tanpa)).toEqual(["R", "M", "P1", "P2"]);
    expect(sesiDi(r.dengan)).toEqual(["R", "M", "P1"]);
  });
});

describe("rekaman yang berubah menggagalkan build (uji mutasi)", () => {
  test("P1 di belakang R, bukan M, di langkah dan tabel ditolak", () => {
    const rusak = satu.replace("RowExclusiveLock pada tabel akun, di belakang M", "RowExclusiveLock pada tabel akun, di belakang R");
    expect(rusak).not.toBe(satu);
    expect(() => bacaRekaman(rusak, batas)).toThrow(/di belakang/);
  });

  test("tabel pg_locks yang tidak cocok dengan langkah ditolak", () => {
    const rusak = satu.replace(/P1   \| RowExclusiveLock pada tabel akun    \| M/, "P1   | RowExclusiveLock pada tabel akun    | R");
    expect(rusak).not.toBe(satu);
    expect(() => bacaRekaman(rusak, batas)).toThrow(/pg_locks/);
  });

  test("galat akhir bukan 42703 ditolak", () => {
    const rusak = satu.replace(/ERROR 42703 undefined_column/g, "ERROR 23505 unique_violation");
    expect(rusak).not.toBe(satu);
    expect(() => bacaRekaman(rusak, batas)).toThrow(/42703/);
  });

  test("migrasi tidak menyerah dengan 55P03 ditolak", () => {
    const rusak = batas.replace("ERROR 55P03 lock_not_available", "ERROR 40001 serialization_failure");
    expect(rusak).not.toBe(batas);
    expect(() => bacaRekaman(satu, rusak)).toThrow(/55P03/);
  });

  test("urutan sesi yang berubah ditolak", () => {
    const rusak = satu.replace(" 4 [P2] app Karyawan", " 4 [P1] app Karyawan");
    expect(rusak).not.toBe(satu);
    expect(() => bacaRekaman(rusak, batas)).toThrow(/urutan sesi/);
  });

  test("langkah tanpa baris hasil atau kalimat tak dikenal ditolak", () => {
    expect(() => bacaLangkah(" 1 [R] BEGIN\n\n", 1)).toThrow(/baris hasil/);
    expect(() => keadaanDari({ no: 1, sesi: "R", perintah: "X", hasil: "sesuatu yang lain" })).toThrow(/tidak dikenali/);
  });

  test("langkah yang tidak berurutan dan tabel yang hilang ditolak", () => {
    expect(() => bacaLangkah(" 2 [R] X\n      -> terbuka dibiarkan terbuka\n", 1)).toThrow(/berurutan/);
    expect(() => bacaTabelLock("tidak ada tabel")).toThrow(/pg_locks/);
  });
});

describe("teks widget", () => {
  const L = LabelAntrean.parse(labelMentah);
  const r = bacaRekaman(satu, batas);

  test("tepat satu pilihan menunjuk yang ditunggu Bayar (M), dan bukan pilihan ketiga", () => {
    const i = indeksBenar(L.pilihan, r.tanpa);
    expect(L.pilihan[i]!.menunggu).toBe("M");
    expect(i).not.toBe(2);
  });

  test("dua pilihan yang menunjuk sesi sama ditolak", () => {
    const ganda = L.pilihan.map((p) => ({ ...p, menunggu: "M" as const }));
    expect(() => indeksBenar(ganda, r.tanpa)).toThrow(/tepat satu/);
  });

  test("templat memakai nama yang tidak diisi gagal keras", () => {
    expect(isi("di belakang {nama}", { nama: "migrasi" })).toBe("di belakang migrasi");
    expect(() => isi("{lain}", {})).toThrow(/tidak diisi/);
  });

  test("skema menolak kunci tambahan dan pilihan di luar 3-4", () => {
    expect(LabelAntrean.safeParse({ ...labelMentah, lain: "x" }).success).toBe(false);
    expect(LabelAntrean.safeParse({ ...labelMentah, pilihan: labelMentah.pilihan.slice(0, 2) }).success).toBe(false);
  });
});
